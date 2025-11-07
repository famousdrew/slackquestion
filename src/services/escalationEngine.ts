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
import { ESCALATION_ENGINE, ESCALATION_LEVEL, QUESTION_STATUS } from '../utils/constants.js';
import { buildThreadLink, getTeamDomain } from '../utils/slackHelpers.js';
import { getEffectiveChannelConfig, type ChannelSettings } from './channelConfigService.js';

// Type for escalation execution results
interface EscalationResult {
  targetType: string;
  targetId: string;
  targetName?: string;
  status: 'success' | 'failed' | 'skipped';
  errorMessage?: string;
  actionTaken?: string;
}

const CHECK_INTERVAL_MS = ESCALATION_ENGINE.CHECK_INTERVAL_MS;

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

      // Find all unanswered questions for this workspace
      // We'll check each one individually with its channel-specific config
      const questions = await prisma.question.findMany({
        where: {
          workspaceId: workspace.id,
          status: QUESTION_STATUS.UNANSWERED,
          escalationLevel: {
            lt: ESCALATION_LEVEL.PAUSED, // Don't escalate questions that have been paused
          },
        },
        include: {
          channel: true,
          asker: true,
        },
      });

      for (const question of questions) {
        // Get effective config for this channel (workspace defaults + channel overrides)
        const effectiveConfig = await getEffectiveChannelConfig(question.channelId, {
          firstEscalationMinutes: config.firstEscalationMinutes,
          secondEscalationMinutes: config.secondEscalationMinutes,
          finalEscalationMinutes: config.finalEscalationMinutes,
          answerDetectionMode: config.answerDetectionMode as 'emoji_only' | 'thread_auto' | 'hybrid',
        });

        // Skip if escalation is disabled for this channel
        if (!effectiveConfig.escalationEnabled) {
          continue;
        }

        // Check if question is old enough to escalate
        const questionAge = now.getTime() - new Date(question.askedAt).getTime();
        const currentLevel = question.escalationLevel;

        let shouldEscalate = false;
        if (currentLevel === 0 && questionAge >= effectiveConfig.firstEscalationMinutes * 60000) {
          shouldEscalate = true;
        } else if (currentLevel === 1 && questionAge >= effectiveConfig.secondEscalationMinutes * 60000) {
          shouldEscalate = true;
        } else if (currentLevel === 2 && questionAge >= effectiveConfig.finalEscalationMinutes * 60000) {
          shouldEscalate = true;
        }

        if (!shouldEscalate) {
          continue;
        }

        // Check if there are any replies in the thread
        const hasReplies = await checkForThreadReplies(
          app,
          question.channel.slackChannelId,
          question.slackMessageId
        );

        if (hasReplies) {
          // Handle based on channel-specific answer detection mode
          if (effectiveConfig.answerDetectionMode === 'thread_auto') {
            // Auto-mark as answered
            await prisma.question.update({
              where: { id: question.id },
              data: {
                status: QUESTION_STATUS.ANSWERED,
                answeredAt: new Date(),
                escalationLevel: ESCALATION_LEVEL.PAUSED,
              },
            });
            console.log(`✅ Question ${question.id} auto-marked as answered (thread_auto mode)`);
            continue;
          } else if (effectiveConfig.answerDetectionMode === 'hybrid') {
            // Stop escalation but don't mark as answered
            await prisma.question.update({
              where: { id: question.id },
              data: {
                escalationLevel: ESCALATION_LEVEL.PAUSED,
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

    // Execute escalation for all targets in parallel
    const results = await Promise.all(
      targets.map((target) => executeEscalationTarget(app, question, target, questionAge))
    );

    // Update escalation level
    await prisma.question.update({
      where: { id: question.id },
      data: {
        escalationLevel: nextLevel,
        lastEscalatedAt: new Date(),
      },
    });

    // Log escalation with events
    const successfulActions = results.filter((r) => r.status === 'success');
    const failedActions = results.filter((r) => r.status === 'failed');

    const escalation = await prisma.escalation.create({
      data: {
        questionId: question.id,
        escalationLevel: nextLevel,
        suggestedUsers: [],
        actionTaken: successfulActions.map(r => r.actionTaken).join(', ') || 'escalated',
        escalatedAt: new Date(),
      },
    });

    // Create detailed event logs for each target
    await Promise.all(
      results.map((result) =>
        prisma.escalationEvent.create({
          data: {
            questionId: question.id,
            escalationId: escalation.id,
            targetType: result.targetType,
            targetId: result.targetId,
            targetName: result.targetName,
            status: result.status,
            errorMessage: result.errorMessage,
          },
        })
      )
    );

    console.log(
      `⚠️  Level ${nextLevel} escalation: Question ${question.id} (${questionAge} min old) - ${successfulActions.length} success, ${failedActions.length} failed`
    );

    if (failedActions.length > 0) {
      console.error(`   Failed targets: ${failedActions.map(f => `${f.targetType}:${f.targetId} (${f.errorMessage})`).join(', ')}`);
    }
  } catch (error) {
    console.error(`Error in level ${question.escalationLevel + 1} escalation:`, error);
  }
}

/**
 * Execute escalation for a specific target with detailed result tracking
 */
async function executeEscalationTarget(
  app: App,
  question: any,
  target: EscalationTargetData,
  questionAge: number
): Promise<EscalationResult> {
  const channelId = question.channel.slackChannelId;
  const channelName = question.channel.channelName || 'unknown channel';
  const messageTs = question.slackMessageId;
  const askerName = question.asker.displayName || question.asker.realName || 'someone';

  try {
    switch (target.targetType) {
      case 'user_group': {
        // Post in thread with user group mention
        try {
          await app.client.chat.postMessage({
            channel: channelId,
            thread_ts: messageTs,
            text: `⚠️ This question has been unanswered for ${questionAge} minutes.\n\n<!subteam^${target.targetId}> - Can someone help with this?`,
          });
          return {
            targetType: target.targetType,
            targetId: target.targetId,
            targetName: target.targetName,
            status: 'success',
            actionTaken: `thread_post_group_${target.targetId}`,
          };
        } catch (error: any) {
          return {
            targetType: target.targetType,
            targetId: target.targetId,
            targetName: target.targetName,
            status: 'failed',
            errorMessage: error.message || 'Failed to post to thread with user group mention',
          };
        }
      }

      case 'user': {
        // Post in thread
        try {
          await app.client.chat.postMessage({
            channel: channelId,
            thread_ts: messageTs,
            text: `⚠️ This question has been unanswered for ${questionAge} minutes.\n\n<@${target.targetId}> - Can you help with this?`,
          });
        } catch (error: any) {
          return {
            targetType: target.targetType,
            targetId: target.targetId,
            targetName: target.targetName,
            status: 'failed',
            errorMessage: `Failed to post to thread: ${error.message || 'unknown error'}`,
          };
        }

        // Try to send DM
        let dmSent = false;
        let dmError = null;
        try {
          const workspaceInfo = await app.client.team.info();
          const teamDomain = getTeamDomain(workspaceInfo);
          const threadLink = buildThreadLink(teamDomain, channelId, messageTs);

          await app.client.chat.postMessage({
            channel: target.targetId,
            text: `🔔 You've been assigned to help with an unanswered question in #${channelName}:\n\n> ${question.messageText}\n\n<${threadLink}|View Thread →>`,
          });
          dmSent = true;
        } catch (error: any) {
          dmError = error.message || 'Failed to send DM';
          console.warn(`Could not send DM to user ${target.targetId}:`, error);
        }

        return {
          targetType: target.targetType,
          targetId: target.targetId,
          targetName: target.targetName,
          status: 'success',
          actionTaken: `thread_post_user_${target.targetId}${dmSent ? '_with_dm' : ''}`,
          errorMessage: dmError ? `Thread posted successfully, but DM failed: ${dmError}` : undefined,
        };
      }

      case 'channel': {
        // Post to escalation channel
        try {
          const workspaceInfo = await app.client.team.info();
          const teamDomain = getTeamDomain(workspaceInfo);
          const threadLink = buildThreadLink(teamDomain, channelId, messageTs);

          await app.client.chat.postMessage({
            channel: target.targetId,
            text: `🚨 *Unanswered Question Alert*\n\nQuestion from <@${question.asker.slackUserId}> in <#${channelId}> (${questionAge} minutes old):\n\n> ${question.messageText}\n\n<${threadLink}|View Thread →>`,
            unfurl_links: false,
            unfurl_media: false,
          });
          return {
            targetType: target.targetType,
            targetId: target.targetId,
            targetName: target.targetName,
            status: 'success',
            actionTaken: `channel_post_${target.targetId}`,
          };
        } catch (error: any) {
          return {
            targetType: target.targetType,
            targetId: target.targetId,
            targetName: target.targetName,
            status: 'failed',
            errorMessage: `Failed to post to channel: ${error.message || 'unknown error'}`,
          };
        }
      }

      default:
        console.warn(`Unknown target type: ${target.targetType}`);
        return {
          targetType: target.targetType,
          targetId: target.targetId,
          targetName: target.targetName,
          status: 'skipped',
          errorMessage: `Unknown target type: ${target.targetType}`,
        };
    }
  } catch (error: any) {
    console.error(`Error executing escalation target ${target.targetId}:`, error);
    return {
      targetType: target.targetType,
      targetId: target.targetId,
      targetName: target.targetName,
      status: 'failed',
      errorMessage: error.message || 'Unexpected error during escalation',
    };
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
