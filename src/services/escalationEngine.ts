/**
 * Workspace-Aware Escalation Engine
 * Checks for unanswered questions every 30 seconds
 * Uses per-workspace configuration from database with flexible escalation targets
 */
import { App } from '@slack/bolt';
import { prisma } from '../utils/db.js';
import { getWorkspaceConfig } from './configService.js';
import {
  getTargetsForLevel,
  migrateFromLegacyConfig,
  type EscalationTargetData,
} from './escalationTargetService.js';

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
      const config = workspace.config || (await getWorkspaceConfig(workspace.id));

      // Migrate legacy config to new system if needed
      await migrateFromLegacyConfig(workspace.id);

      const firstEscalationMs = config.firstEscalationMinutes * 60000;
      const secondEscalationMs = config.secondEscalationMinutes * 60000;
      const finalEscalationMs = config.finalEscalationMinutes * 60000;

      // Build escalation time thresholds for each level
      const escalationThresholds = [
        { level: 0, time: now.getTime() - firstEscalationMs }, // Level 0 → Level 1
        { level: 1, time: now.getTime() - secondEscalationMs }, // Level 1 → Level 2
        { level: 2, time: now.getTime() - finalEscalationMs }, // Level 2 → Level 3
      ];

      // Find questions for this workspace that need escalation
      const questions = await prisma.question.findMany({
        where: {
          workspaceId: workspace.id,
          status: 'unanswered',
          escalationLevel: {
            lt: 99, // Don't escalate questions that have been paused
          },
          OR: escalationThresholds.map((threshold) => ({
            escalationLevel: threshold.level,
            askedAt: {
              lte: new Date(threshold.time),
            },
          })),
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

        // Perform escalation based on current level
        await performEscalation(app, question, workspace.id, config);
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

/**
 * Unified escalation function that handles all escalation levels
 * Uses flexible escalation targets from database
 */
async function performEscalation(app: App, question: any, workspaceId: string, config: any) {
  try {
    const currentLevel = question.escalationLevel;
    const nextLevel = currentLevel + 1;
    const questionAge = Math.round((Date.now() - new Date(question.askedAt).getTime()) / 60000);

    // Get targets for the next escalation level
    let targets = await getTargetsForLevel(workspaceId, nextLevel);

    // Fall back to legacy config if no targets found
    if (targets.length === 0) {
      targets = await getLegacyTargets(config, nextLevel);
    }

    if (targets.length === 0) {
      console.log(
        `⚠️  No escalation targets configured for level ${nextLevel}, skipping question ${question.id}`
      );
      // Still increment escalation level so it can proceed to next level
      await prisma.question.update({
        where: { id: question.id },
        data: {
          escalationLevel: nextLevel,
          lastEscalatedAt: new Date(),
        },
      });
      return;
    }

    // Execute escalation for each target
    const actionsTaken: string[] = [];
    for (const target of targets) {
      const action = await executeEscalationTarget(app, question, target, questionAge);
      if (action) {
        actionsTaken.push(action);
      }
    }

    // Update escalation level
    await prisma.question.update({
      where: { id: question.id },
      data: {
        escalationLevel: nextLevel,
        lastEscalatedAt: new Date(),
      },
    });

    // Log escalation
    await prisma.escalation.create({
      data: {
        questionId: question.id,
        escalationLevel: nextLevel,
        suggestedUsers: [],
        actionTaken: actionsTaken.join(', ') || 'escalated',
        escalatedAt: new Date(),
      },
    });

    console.log(
      `⚠️  Level ${nextLevel} escalation: Question ${question.id} (${questionAge} min old) - ${actionsTaken.length} action(s) taken`
    );
  } catch (error) {
    console.error(`Error in level ${question.escalationLevel + 1} escalation:`, error);
  }
}

/**
 * Execute escalation for a specific target
 */
async function executeEscalationTarget(
  app: App,
  question: any,
  target: EscalationTargetData,
  questionAge: number
): Promise<string | null> {
  try {
    const channelId = question.channel.slackChannelId;
    const channelName = question.channel.channelName || 'unknown channel';
    const messageTs = question.slackMessageId;
    const askerName = question.asker.displayName || question.asker.realName || 'someone';

    switch (target.targetType) {
      case 'user_group':
        // Post in thread with user group mention
        await app.client.chat.postMessage({
          channel: channelId,
          thread_ts: messageTs,
          text: `⚠️ This question has been unanswered for ${questionAge} minutes.\n\n<!subteam^${target.targetId}> - Can someone help with this?`,
        });
        return `thread_post_group_${target.targetId}`;

      case 'user':
        // Post in thread and DM the user
        await app.client.chat.postMessage({
          channel: channelId,
          thread_ts: messageTs,
          text: `⚠️ This question has been unanswered for ${questionAge} minutes.\n\n<@${target.targetId}> - Can you help with this?`,
        });

        // Optionally send DM
        try {
          const workspaceInfo = await app.client.team.info();
          const teamDomain = workspaceInfo.team?.domain || 'your-workspace';
          const threadLink = `https://${teamDomain}.slack.com/archives/${channelId}/p${messageTs.replace('.', '')}`;

          await app.client.chat.postMessage({
            channel: target.targetId,
            text: `🔔 You've been assigned to help with an unanswered question in #${channelName}:\n\n> ${question.messageText}\n\n<${threadLink}|View Thread →>`,
          });
        } catch (dmError) {
          console.warn(`Could not send DM to user ${target.targetId}:`, dmError);
        }
        return `thread_post_user_${target.targetId}`;

      case 'channel':
        // Post to escalation channel
        const workspaceInfo = await app.client.team.info();
        const teamDomain = workspaceInfo.team?.domain || 'your-workspace';
        const threadLink = `https://${teamDomain}.slack.com/archives/${channelId}/p${messageTs.replace('.', '')}`;

        await app.client.chat.postMessage({
          channel: target.targetId,
          text: `🚨 *Unanswered Question Alert*\n\nQuestion from <@${question.asker.slackUserId}> in <#${channelId}> (${questionAge} minutes old):\n\n> ${question.messageText}\n\n<${threadLink}|View Thread →>`,
          unfurl_links: false,
          unfurl_media: false,
        });
        return `channel_post_${target.targetId}`;

      default:
        console.warn(`Unknown target type: ${target.targetType}`);
        return null;
    }
  } catch (error) {
    console.error(`Error executing escalation target ${target.targetId}:`, error);
    return null;
  }
}

/**
 * Get legacy targets from config for backward compatibility
 */
async function getLegacyTargets(config: any, level: number): Promise<EscalationTargetData[]> {
  const targets: EscalationTargetData[] = [];

  if (level === 1 && config.escalationUserGroup) {
    targets.push({
      targetType: 'user_group',
      targetId: config.escalationUserGroup,
      escalationLevel: 1,
      priority: 0,
      isActive: true,
    });
  }

  if (level === 2 && config.escalationChannelId) {
    targets.push({
      targetType: 'channel',
      targetId: config.escalationChannelId,
      escalationLevel: 2,
      priority: 0,
      isActive: true,
    });
  }

  if (level === 3 && config.finalEscalationUserId) {
    targets.push({
      targetType: 'user',
      targetId: config.finalEscalationUserId,
      escalationLevel: 3,
      priority: 0,
      isActive: true,
    });
  }

  return targets;
}
