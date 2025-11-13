/**
 * App Home Tab Handler
 * Provides onboarding and configuration status for workspace admins
 */
import boltPkg from '@slack/bolt';
import type { App } from '@slack/bolt';
import { ensureWorkspace, prisma } from '../utils/db.js';
import { getWorkspaceConfig } from '../services/configService.js';
import { buildThreadLink, getTeamDomain } from '../utils/slackHelpers.js';
import { getChannelsWithCustomSettings } from '../services/channelConfigService.js';

/**
 * Format time difference as human-readable string
 */
function getTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString();
}

export function registerAppHomeHandler(app: App) {
  app.event('app_home_opened', async ({ event, client, logger }) => {
    try {
      const teamInfo = await client.team.info();
      const teamId = teamInfo.team?.id;

      if (!teamId) {
        throw new Error('Could not get team information');
      }

      const workspace = await ensureWorkspace(teamId);
      const config = await getWorkspaceConfig(workspace.id);

      // Check if configuration is complete
      const hasUserGroup = !!config.escalationUserGroup;
      const hasChannel = !!config.escalationChannelId;
      const isConfigured = hasUserGroup && hasChannel;

      // Fetch recent escalation events
      const recentEvents = await prisma.escalationEvent.findMany({
        where: {
          question: {
            workspaceId: workspace.id,
          },
        },
        include: {
          question: {
            include: {
              channel: true,
              asker: true,
            },
          },
          escalation: true,
        },
        orderBy: {
          notifiedAt: 'desc',
        },
        take: 10,
      });

      // Fetch channels with custom settings
      const customChannels = await getChannelsWithCustomSettings(workspace.id);

      // Build escalation history blocks
      const historyBlocks = [];
      if (recentEvents.length > 0) {
        const teamDomain = getTeamDomain(teamInfo);

        for (const event of recentEvents) {
          const question = event.question;
          const threadLink = buildThreadLink(
            teamDomain,
            question.channel.slackChannelId,
            question.slackMessageId
          );

          const statusEmoji = event.status === 'success' ? '✅' : event.status === 'failed' ? '❌' : '⏭️';
          const targetTypeLabel =
            event.targetType === 'user_group' ? 'User Group' :
            event.targetType === 'user' ? 'User' : 'Channel';

          const timeAgo = getTimeAgo(new Date(event.notifiedAt));

          historyBlocks.push({
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `${statusEmoji} *Level ${event.escalation.escalationLevel}* → ${targetTypeLabel}${event.targetName ? ` (${event.targetName})` : ''}\n` +
                    `<${threadLink}|View Question> • ${timeAgo}` +
                    (event.errorMessage ? `\n⚠️ _${event.errorMessage}_` : ''),
            },
          });
        }
      } else {
        historyBlocks.push({
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '_No escalations yet. Questions will appear here once they start escalating._',
          },
        });
      }

      // Build the home view
      await client.views.publish({
        user_id: event.user,
        view: {
          type: 'home',
          blocks: [
            {
              type: 'header',
              text: {
                type: 'plain_text',
                text: '👋 Welcome to Question Router',
              },
            },
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: isConfigured
                  ? '✅ Your workspace is configured and ready to route questions!'
                  : '⚠️ Your workspace needs configuration to start routing questions.',
              },
            },
            {
              type: 'divider',
            },
            {
              type: 'header',
              text: {
                type: 'plain_text',
                text: '⚙️ Configuration Status',
              },
            },
            {
              type: 'section',
              fields: [
                {
                  type: 'mrkdwn',
                  text: `*First Escalation:*\n${config.firstEscalationMinutes} minutes`,
                },
                {
                  type: 'mrkdwn',
                  text: `*Second Escalation:*\n${config.secondEscalationMinutes} minutes`,
                },
                {
                  type: 'mrkdwn',
                  text: `*User Group:*\n${hasUserGroup ? '✅ Configured' : '❌ Not set'}`,
                },
                {
                  type: 'mrkdwn',
                  text: `*Escalation Channel:*\n${hasChannel ? '✅ Configured' : '❌ Not set'}`,
                },
                {
                  type: 'mrkdwn',
                  text: `*Answer Mode:*\n${config.answerDetectionMode}`,
                },
              ],
            },
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: isConfigured
                  ? '💡 Need to make changes? Use the button below to update your settings.'
                  : '🚀 *Get Started:* Click the button below to configure your escalation settings.',
              },
            },
            {
              type: 'actions',
              elements: [
                {
                  type: 'button',
                  text: {
                    type: 'plain_text',
                    text: isConfigured ? '⚙️ Update Configuration' : '🚀 Complete Setup',
                  },
                  style: isConfigured ? undefined : 'primary',
                  value: 'open_config',
                  action_id: 'open_config_modal',
                },
              ],
            },
            {
              type: 'divider',
            },
            {
              type: 'header',
              text: {
                type: 'plain_text',
                text: '📖 How It Works',
              },
            },
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text:
                  '*1️⃣ Questions are detected* - Any message with a `?` in monitored channels\n' +
                  '*2️⃣ First escalation* - After configured time, user group is mentioned in thread\n' +
                  '*3️⃣ Second escalation* - If still unanswered, posted to escalation channel\n' +
                  '*4️⃣ Marked answered* - Add ✅ reaction (or auto-detect based on your mode)',
              },
            },
            {
              type: 'divider',
            },
            {
              type: 'header',
              text: {
                type: 'plain_text',
                text: '🛠️ Available Commands',
              },
            },
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text:
                  '• `/qr-config` - Configure escalation settings\n' +
                  '• `/qr-targets` - Manage escalation targets (users, groups, channels)\n' +
                  '• `/qr-channel-config` - Override settings for specific channels\n' +
                  '• `/qr-channels` - List channels with custom settings\n' +
                  '• `/qr-setup` - Unified setup wizard for new workspaces\n' +
                  '• `/qr-test-escalation` - Test your escalation configuration\n' +
                  '• `/qr-stats` - View question statistics\n' +
                  '• `/qr-status` - Check a specific question status',
              },
            },
            {
              type: 'divider',
            },
            ...(customChannels.length > 0
              ? [
                  {
                    type: 'header' as const,
                    text: {
                      type: 'plain_text' as const,
                      text: '⚙️ Channel-Specific Settings',
                    },
                  },
                  {
                    type: 'section' as const,
                    text: {
                      type: 'mrkdwn' as const,
                      text: customChannels
                        .slice(0, 5)
                        .map((ch) => `• *#${ch.channelName}* - Custom escalation settings`)
                        .join('\n'),
                    },
                  },
                  ...(customChannels.length > 5
                    ? [
                        {
                          type: 'context' as const,
                          elements: [
                            {
                              type: 'mrkdwn' as const,
                              text: `_and ${customChannels.length - 5} more..._`,
                            },
                          ],
                        },
                      ]
                    : []),
                  {
                    type: 'divider' as const,
                  },
                ]
              : []),
            {
              type: 'header',
              text: {
                type: 'plain_text',
                text: '📊 Recent Escalations',
              },
            },
            ...historyBlocks,
            {
              type: 'divider',
            },
            {
              type: 'context',
              elements: [
                {
                  type: 'mrkdwn',
                  text: '💡 *Tip:* Add the Question Router to any channel where you want to track questions.',
                },
              ],
            },
          ],
        },
      });
    } catch (error) {
      logger.error('Error publishing home view:', error);
    }
  });

  // Handle the "open config" button click
  app.action('open_config_modal', async ({ ack, body, client, logger }) => {
    await ack();

    try {
      // Trigger the config command programmatically
      await client.chat.postEphemeral({
        channel: body.user.id,
        user: body.user.id,
        text: '⚙️ Opening configuration modal...\n\nPlease run `/qr-config` to configure your settings.',
      });
    } catch (error) {
      logger.error('Error handling config button:', error);
    }
  });
}
