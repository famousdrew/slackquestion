/**
 * Simple Escalation Engine
 * Checks for unanswered questions every 30 seconds
 */
import { App } from '@slack/bolt';
import { prisma } from '../utils/db.js';
import { getWorkspaceConfig } from './configService.js';

const ESCALATION_USER_GROUP = process.env.ESCALATION_USER_GROUP || 't2';
const ESCALATION_CHANNEL = process.env.ESCALATION_CHANNEL || 'tier_2';
const FIRST_ESCALATION_MINUTES = parseInt(process.env.FIRST_ESCALATION_MINUTES || '2');
const SECOND_ESCALATION_MINUTES = parseInt(process.env.SECOND_ESCALATION_MINUTES || '4');
const CHECK_INTERVAL_MS = 30000; // Check every 30 seconds

let intervalId: NodeJS.Timeout | null = null;

export function startEscalationEngine(app: App) {
  console.log('🚨 Starting escalation engine...');
  console.log(`   First escalation: ${FIRST_ESCALATION_MINUTES} min (thread + @${ESCALATION_USER_GROUP})`);
  console.log(`   Second escalation: ${SECOND_ESCALATION_MINUTES} min (#${ESCALATION_CHANNEL})`);

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
    const now = new Date();

    // Find questions that need escalation
    const questions = await prisma.question.findMany({
      where: {
        status: 'unanswered',
        OR: [
          // First escalation: 2 minutes old, not yet escalated
          {
            escalationLevel: 0,
            askedAt: {
              lte: new Date(now.getTime() - FIRST_ESCALATION_MINUTES * 60000)
            }
          },
          // Second escalation: 4 minutes old, only escalated once
          {
            escalationLevel: 1,
            askedAt: {
              lte: new Date(now.getTime() - SECOND_ESCALATION_MINUTES * 60000)
            }
          }
        ]
      },
      include: {
        channel: true,
        asker: true,
      }
    });

    for (const question of questions) {
      // Get workspace config to determine answer detection mode
      const config = await getWorkspaceConfig(question.workspaceId);

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
            }
          });
          console.log(`✅ Question ${question.id} auto-marked as answered (thread_auto mode)`);
          continue;
        } else if (config.answerDetectionMode === 'hybrid') {
          // Stop escalation but don't mark as answered
          await prisma.question.update({
            where: { id: question.id },
            data: {
              escalationLevel: 99,
            }
          });
          console.log(`✅ Question ${question.id} has replies, stopping escalation (hybrid mode)`);
          continue;
        }
        // For emoji_only mode, replies don't affect anything - continue to escalate
      }

      // Escalate based on level
      if (question.escalationLevel === 0) {
        await performFirstEscalation(app, question);
      } else if (question.escalationLevel === 1) {
        await performSecondEscalation(app, question);
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
    const humanReplies = result.messages?.filter(msg =>
      msg.ts !== messageTs && msg.user !== botUserId
    ) || [];

    // If there are any human replies, return true
    return humanReplies.length > 0;
  } catch (error) {
    console.error('Error checking thread replies:', error);
    return false;
  }
}

async function performFirstEscalation(app: App, question: any) {
  try {
    const channelId = question.channel.slackChannelId;
    const messageTs = question.slackMessageId;
    const questionAge = Math.round((Date.now() - new Date(question.askedAt).getTime()) / 60000);

    // Post in thread with user group mention
    await app.client.chat.postMessage({
      channel: channelId,
      thread_ts: messageTs,
      text: `⚠️ This question has been unanswered for ${questionAge} minutes.\n\n<!subteam^SAJNNGQUA> - Can someone help with this?`,
    });

    // Update escalation level
    await prisma.question.update({
      where: { id: question.id },
      data: {
        escalationLevel: 1,
        lastEscalatedAt: new Date(),
      }
    });

    // Log escalation
    await prisma.escalation.create({
      data: {
        questionId: question.id,
        escalationLevel: 1,
        suggestedUsers: [],
        actionTaken: 'thread_post_with_group',
        escalatedAt: new Date(),
      }
    });

    console.log(`⚠️  First escalation: Question ${question.id} (${questionAge} min old)`);
  } catch (error) {
    console.error('Error in first escalation:', error);
  }
}

async function performSecondEscalation(app: App, question: any) {
  try {
    const channelId = question.channel.slackChannelId;
    const channelName = question.channel.channelName || 'unknown channel';
    const messageTs = question.slackMessageId;
    const questionAge = Math.round((Date.now() - new Date(question.askedAt).getTime()) / 60000);
    const askerName = question.asker.displayName || question.asker.realName || 'someone';

    // Build the thread link
    const workspaceInfo = await app.client.team.info();
    const teamDomain = workspaceInfo.team?.domain || 'your-workspace';
    const threadLink = `https://${teamDomain}.slack.com/archives/${channelId}/p${messageTs.replace('.', '')}`;

    // ESCALATION_CHANNEL is now the channel ID directly (e.g., GN9LYD9T4)
    const escalationChannelId = ESCALATION_CHANNEL;

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
      }
    });

    // Log escalation
    await prisma.escalation.create({
      data: {
        questionId: question.id,
        escalationLevel: 2,
        suggestedUsers: [],
        actionTaken: 'channel_post',
        escalatedAt: new Date(),
      }
    });

    console.log(`🚨 Second escalation: Question ${question.id} posted to #${ESCALATION_CHANNEL}`);
  } catch (error) {
    console.error('Error in second escalation:', error);
  }
}
