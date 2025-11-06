/**
 * Workspace-Aware Escalation Engine
 * Checks for unanswered questions every 30 seconds
 * Uses per-workspace configuration from database
 */
import { App } from '@slack/bolt';
import { prisma } from '../utils/db.js';
import { getWorkspaceConfig } from './configService.js';

const CHECK_INTERVAL_MS = 30000; // Check every 30 seconds

// Fallback environment variables for backwards compatibility
const FALLBACK_USER_GROUP = process.env.ESCALATION_USER_GROUP || null;
const FALLBACK_CHANNEL = process.env.ESCALATION_CHANNEL || null;

let intervalId: NodeJS.Timeout | null = null;

export function startEscalationEngine(app: App) {
  console.log('🚨 Starting escalation engine...');
  console.log(`   Checking every ${CHECK_INTERVAL_MS / 1000} seconds`);
  console.log(`   Using per-workspace configuration from database`);

  intervalId = setInterval(async () => {
    await checkForEscalations(app);
  }, CHECK_INTERVAL_MS);
}

export function stopEscalationEngine() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    console.log('🛑 Escalation engine stopped');
  }
}

async function checkForEscalations(app: App) {
  try {
    // Get all workspaces with their configs
    const workspaces = await prisma.workspace.findMany({
      include: {
        config: true,
      },
    });

    const now = new Date();

    // Process each workspace separately with its own config
    for (const workspace of workspaces) {
      const config = workspace.config ||  await getWorkspaceConfig(workspace.id);

      const firstEscalationMs = config.firstEscalationMinutes * 60000;
      const secondEscalationMs = config.secondEscalationMinutes * 60000;

      // Find questions for this workspace that need escalation
      const questions = await prisma.question.findMany({
        where: {
          workspaceId: workspace.id,
          status: 'unanswered',
          OR: [
            // First escalation: based on workspace config
            {
              escalationLevel: 0,
              askedAt: {
                lte: new Date(now.getTime() - firstEscalationMs),
              },
            },
            // Second escalation: based on workspace config
            {
              escalationLevel: 1,
              askedAt: {
                lte: new Date(now.getTime() - secondEscalationMs),
              },
            },
          ],
        },
        include: {
          channel: true,
          asker: true,
        },
      });

      for (const question of questions) {
        // Check if there are any replies in the thread
        const hasReplies = await checkForThreadReplies(
          app,
          question.channel.slackChannelId,
          question.slackMessageId
        );

        if (hasReplies) {
          // Handle based on answer detection mode
          if (config.answerDetectionMode === 'thread_auto') {
            // Auto-mark as answered
            await prisma.question.update({
              where: { id: question.id },
              data: {
                status: 'answered',
                answeredAt: new Date(),
                escalationLevel: 99,
              },
            });
            console.log(`✅ Question ${question.id} auto-marked as answered (thread_auto mode)`);
            continue;
          } else if (config.answerDetectionMode === 'hybrid') {
            // Stop escalation but don't mark as answered
            await prisma.question.update({
              where: { id: question.id },
              data: {
                escalationLevel: 99,
              },
            });
            console.log(`✅ Question ${question.id} has replies, stopping escalation (hybrid mode)`);
            continue;
          }
          // For emoji_only mode, replies don't affect anything - continue to escalate
        }

        // Escalate based on level
        if (question.escalationLevel === 0) {
          await performFirstEscalation(app, question, config);
        } else if (question.escalationLevel === 1) {
          await performSecondEscalation(app, question, config);
        }
      }
    }
  } catch (error) {
    console.error('Error in escalation check:', error);
  }
}

async function checkForThreadReplies(
  app: App,
  channelId: string,
  messageTs: string
): Promise<boolean> {
  try {
    // Get bot user ID
    const authResult = await app.client.auth.test();
    const botUserId = authResult.user_id;

    const result = await app.client.conversations.replies({
      channel: channelId,
      ts: messageTs,
      limit: 10,
    });

    // Filter out the original message and any messages from the bot itself
    const humanReplies =
      result.messages?.filter((msg) => msg.ts !== messageTs && msg.user !== botUserId) || [];

    // If there are any human replies, return true
    return humanReplies.length > 0;
  } catch (error) {
    console.error('Error checking thread replies:', error);
    return false;
  }
}

async function performFirstEscalation(app: App, question: any, config: any) {
  try {
    const channelId = question.channel.slackChannelId;
    const messageTs = question.slackMessageId;
    const questionAge = Math.round((Date.now() - new Date(question.askedAt).getTime()) / 60000);

    // Get user group from config or fallback
    const userGroupId = config.escalationUserGroup || FALLBACK_USER_GROUP;

    if (!userGroupId) {
      console.log(
        `⚠️  Skipping first escalation for question ${question.id}: No user group configured`
      );
      // Still increment escalation level so it can proceed to second escalation
      await prisma.question.update({
        where: { id: question.id },
        data: {
          escalationLevel: 1,
          lastEscalatedAt: new Date(),
        },
      });
      return;
    }

    // Post in thread with user group mention
    await app.client.chat.postMessage({
      channel: channelId,
      thread_ts: messageTs,
      text: `⚠️ This question has been unanswered for ${questionAge} minutes.\n\n<!subteam^${userGroupId}> - Can someone help with this?`,
    });

    // Update escalation level
    await prisma.question.update({
      where: { id: question.id },
      data: {
        escalationLevel: 1,
        lastEscalatedAt: new Date(),
      },
    });

    // Log escalation
    await prisma.escalation.create({
      data: {
        questionId: question.id,
        escalationLevel: 1,
        suggestedUsers: [],
        actionTaken: 'thread_post_with_group',
        escalatedAt: new Date(),
      },
    });

    console.log(`⚠️  First escalation: Question ${question.id} (${questionAge} min old)`);
  } catch (error) {
    console.error('Error in first escalation:', error);
  }
}

async function performSecondEscalation(app: App, question: any, config: any) {
  try {
    const channelId = question.channel.slackChannelId;
    const channelName = question.channel.channelName || 'unknown channel';
    const messageTs = question.slackMessageId;
    const questionAge = Math.round((Date.now() - new Date(question.askedAt).getTime()) / 60000);
    const askerName = question.asker.displayName || question.asker.realName || 'someone';

    // Get escalation channel from config or fallback
    const escalationChannelId = config.escalationChannelId || FALLBACK_CHANNEL;

    if (!escalationChannelId) {
      console.log(
        `⚠️  Skipping second escalation for question ${question.id}: No escalation channel configured`
      );
      // Mark escalation level higher so it doesn't keep trying
      await prisma.question.update({
        where: { id: question.id },
        data: {
          escalationLevel: 2,
          lastEscalatedAt: new Date(),
        },
      });
      return;
    }

    // Build the thread link
    const workspaceInfo = await app.client.team.info();
    const teamDomain = workspaceInfo.team?.domain || 'your-workspace';
    const threadLink = `https://${teamDomain}.slack.com/archives/${channelId}/p${messageTs.replace('.', '')}`;

    // Post to escalation channel
    await app.client.chat.postMessage({
      channel: escalationChannelId,
      text: `🚨 *Unanswered Question Alert*\n\nQuestion from @${askerName} in #${channelName} (${questionAge} minutes old):\n\n> ${question.messageText}\n\n<${threadLink}|View Thread →>`,
      unfurl_links: false,
      unfurl_media: false,
    });

    // Update escalation level
    await prisma.question.update({
      where: { id: question.id },
      data: {
        escalationLevel: 2,
        lastEscalatedAt: new Date(),
      },
    });

    // Log escalation
    await prisma.escalation.create({
      data: {
        questionId: question.id,
        escalationLevel: 2,
        suggestedUsers: [],
        actionTaken: 'channel_post',
        escalatedAt: new Date(),
      },
    });

    console.log(`🚨 Second escalation: Question ${question.id} posted to channel ${escalationChannelId}`);
  } catch (error) {
    console.error('Error in second escalation:', error);
  }
}
