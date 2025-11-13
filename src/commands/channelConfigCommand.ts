/**
 * Channel Configuration Command Handler
 * Allows admins to override workspace settings for specific channels
 */
import boltPkg from '@slack/bolt';
import type { App } from '@slack/bolt';
import { ensureWorkspace, prisma } from '../utils/db.js';
import { isWorkspaceAdmin, sendPermissionDenied } from '../utils/permissions.js';
import {
  getChannelConfigBySlackId,
  updateChannelSettings,
  clearChannelSettings,
  getChannelsWithCustomSettings,
  hasCustomSettings,
  type ChannelSettings,
} from '../services/channelConfigService.js';
import { getWorkspaceConfig, type AnswerDetectionMode } from '../services/configService.js';

export function registerChannelConfigCommand(app: App) {
  app.command('/qr-channel-config', async ({ command, ack, client, logger }) => {
    await ack();

    try {
      // Check admin permissions
      const isAdmin = await isWorkspaceAdmin(client, command.user_id);
      if (!isAdmin) {
        await sendPermissionDenied(client, command.channel_id, command.user_id);
        return;
      }

      const teamInfo = await client.team.info();
      const teamId = teamInfo.team?.id;

      if (!teamId) {
        throw new Error('Could not get team information');
      }

      const workspace = await ensureWorkspace(teamId);
      const workspaceConfig = await getWorkspaceConfig(workspace.id);

      // Get channel info
      const channelInfo = await client.conversations.info({
        channel: command.channel_id,
      });

      if (!channelInfo.channel) {
        throw new Error('Could not get channel information');
      }

      const channelName = channelInfo.channel.name || 'this channel';

      // Get current channel config
      const channelConfig = await getChannelConfigBySlackId(workspace.id, command.channel_id);
      const settings = channelConfig?.settings || {};

      // Build modal with current settings
      await client.views.open({
        trigger_id: command.trigger_id,
        view: {
          type: 'modal',
          callback_id: 'channel_config_modal',
          title: {
            type: 'plain_text',
            text: 'Channel Settings',
          },
          submit: {
            type: 'plain_text',
            text: 'Save',
          },
          close: {
            type: 'plain_text',
            text: 'Cancel',
          },
          private_metadata: JSON.stringify({
            channelId: command.channel_id,
            workspaceId: workspace.id,
          }),
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `Configure custom settings for *#${channelName}*\n\nLeave fields empty to use workspace defaults.`,
              },
            },
            {
              type: 'divider',
            },
            {
              type: 'input',
              block_id: 'escalation_enabled',
              optional: true,
              label: {
                type: 'plain_text',
                text: 'Escalation Status',
              },
              element: {
                type: 'static_select',
                action_id: 'enabled_select',
                initial_option: settings.escalationEnabled === false
                  ? {
                      text: { type: 'plain_text', text: '❌ Disabled' },
                      value: 'false',
                    }
                  : {
                      text: { type: 'plain_text', text: '✅ Enabled (default)' },
                      value: 'true',
                    },
                options: [
                  {
                    text: { type: 'plain_text', text: '✅ Enabled (default)' },
                    value: 'true',
                  },
                  {
                    text: { type: 'plain_text', text: '❌ Disabled' },
                    value: 'false',
                  },
                ],
              },
              hint: {
                type: 'plain_text',
                text: 'Disable escalation for this channel completely',
              },
            },
            {
              type: 'input',
              block_id: 'first_escalation',
              optional: true,
              label: {
                type: 'plain_text',
                text: 'First Escalation (minutes)',
              },
              element: {
                type: 'plain_text_input',
                action_id: 'first_escalation_input',
                placeholder: {
                  type: 'plain_text',
                  text: `Workspace default: ${workspaceConfig.firstEscalationMinutes}`,
                },
                initial_value: settings.firstEscalationMinutes?.toString() || '',
              },
              hint: {
                type: 'plain_text',
                text: 'Override workspace default for this channel',
              },
            },
            {
              type: 'input',
              block_id: 'second_escalation',
              optional: true,
              label: {
                type: 'plain_text',
                text: 'Second Escalation (minutes)',
              },
              element: {
                type: 'plain_text_input',
                action_id: 'second_escalation_input',
                placeholder: {
                  type: 'plain_text',
                  text: `Workspace default: ${workspaceConfig.secondEscalationMinutes}`,
                },
                initial_value: settings.secondEscalationMinutes?.toString() || '',
              },
            },
            {
              type: 'input',
              block_id: 'final_escalation',
              optional: true,
              label: {
                type: 'plain_text',
                text: 'Final Escalation (minutes)',
              },
              element: {
                type: 'plain_text_input',
                action_id: 'final_escalation_input',
                placeholder: {
                  type: 'plain_text',
                  text: `Workspace default: ${workspaceConfig.finalEscalationMinutes}`,
                },
                initial_value: settings.finalEscalationMinutes?.toString() || '',
              },
            },
            {
              type: 'input',
              block_id: 'answer_mode',
              optional: true,
              label: {
                type: 'plain_text',
                text: 'Answer Detection Mode',
              },
              element: {
                type: 'static_select',
                action_id: 'mode_select',
                placeholder: {
                  type: 'plain_text',
                  text: `Workspace default: ${workspaceConfig.answerDetectionMode}`,
                },
                initial_option: settings.answerDetectionMode
                  ? {
                      text: { type: 'plain_text', text: getModeLabel(settings.answerDetectionMode) },
                      value: settings.answerDetectionMode,
                    }
                  : undefined,
                options: [
                  {
                    text: { type: 'plain_text', text: 'Emoji Only - Requires ✅ reaction' },
                    value: 'emoji_only',
                  },
                  {
                    text: { type: 'plain_text', text: 'Thread Auto - Any reply marks answered' },
                    value: 'thread_auto',
                  },
                  {
                    text: { type: 'plain_text', text: 'Hybrid - Replies pause, emoji completes' },
                    value: 'hybrid',
                  },
                ],
              },
            },
            {
              type: 'divider',
            },
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: hasCustomSettings(settings)
                  ? '_This channel has custom settings_'
                  : '_Using workspace defaults_',
              },
            },
          ],
        },
      });
    } catch (error) {
      logger.error('Error opening channel config modal:', error);
      try {
        await client.chat.postEphemeral({
          channel: command.channel_id,
          user: command.user_id,
          text: `❌ Error opening channel config modal: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
      } catch (ephemeralError) {
        logger.error('Could not send ephemeral error message:', ephemeralError);
      }
    }
  });

  // Handle modal submission
  app.view('channel_config_modal', async ({ ack, view, body, client, logger }) => {
    await ack();

    try {
      const metadata = JSON.parse(view.private_metadata);
      const { channelId, workspaceId } = metadata;

      // Extract values
      const escalationEnabled =
        view.state.values.escalation_enabled.enabled_select.selected_option?.value === 'true';
      const firstEscalation =
        view.state.values.first_escalation.first_escalation_input.value?.trim();
      const secondEscalation =
        view.state.values.second_escalation.second_escalation_input.value?.trim();
      const finalEscalation =
        view.state.values.final_escalation.final_escalation_input.value?.trim();
      const answerMode = view.state.values.answer_mode.mode_select.selected_option?.value as
        | AnswerDetectionMode
        | undefined;

      // Build settings object
      const settings: Partial<ChannelSettings> = {};

      if (escalationEnabled === false) {
        settings.escalationEnabled = false;
      }

      if (firstEscalation) {
        const minutes = parseInt(firstEscalation);
        if (isNaN(minutes) || minutes < 1) {
          throw new Error('First escalation must be a positive number');
        }
        settings.firstEscalationMinutes = minutes;
      }

      if (secondEscalation) {
        const minutes = parseInt(secondEscalation);
        if (isNaN(minutes) || minutes < 1) {
          throw new Error('Second escalation must be a positive number');
        }
        settings.secondEscalationMinutes = minutes;
      }

      if (finalEscalation) {
        const minutes = parseInt(finalEscalation);
        if (isNaN(minutes) || minutes < 1) {
          throw new Error('Final escalation must be a positive number');
        }
        settings.finalEscalationMinutes = minutes;
      }

      if (answerMode) {
        settings.answerDetectionMode = answerMode;
      }

      // Get the channel from the database
      const channel = await prisma.channel.findFirst({
        where: {
          workspaceId,
          slackChannelId: channelId,
        },
      });

      if (!channel) {
        throw new Error('Channel not found in database');
      }

      // If all settings are empty/default, clear the channel config
      if (Object.keys(settings).length === 0 || (Object.keys(settings).length === 1 && settings.escalationEnabled === true)) {
        await clearChannelSettings(channel.id);

        await client.chat.postEphemeral({
          channel: channelId,
          user: body.user.id,
          text: '✅ Channel settings cleared. Now using workspace defaults.',
        });
      } else {
        // Update channel settings
        await updateChannelSettings(channel.id, settings);

        const channelInfo = await client.conversations.info({ channel: channelId });
        const channelName = channelInfo.channel?.name || 'this channel';

        await client.chat.postEphemeral({
          channel: channelId,
          user: body.user.id,
          text: `✅ Channel settings updated for #${channelName}\n\n${formatSettings(settings)}`,
        });
      }

      console.log(
        `✅ Channel config updated for channel ${channelId} by ${body.user.id}`
      );
    } catch (error) {
      logger.error('Error saving channel config:', error);
      try {
        await client.chat.postEphemeral({
          channel: body.user.id,
          user: body.user.id,
          text: `❌ Failed to save channel configuration: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`,
        });
      } catch (ephemeralError) {
        logger.error('Could not send ephemeral error message:', ephemeralError);
      }
    }
  });

  // List channels with custom settings
  app.command('/qr-channels', async ({ command, ack, client, logger }) => {
    await ack();

    try {
      const teamInfo = await client.team.info();
      const teamId = teamInfo.team?.id;

      if (!teamId) {
        throw new Error('Could not get team information');
      }

      const workspace = await ensureWorkspace(teamId);
      const channels = await getChannelsWithCustomSettings(workspace.id);

      let message = '*📋 Channels with Custom Settings*\n\n';

      if (channels.length === 0) {
        message += '_No channels have custom settings. All channels use workspace defaults._';
      } else {
        for (const channel of channels) {
          message += `*#${channel.channelName || 'unknown'}*\n`;
          message += formatSettings(channel.settings);
          message += '\n';
        }
      }

      message += '\n💡 Use `/qr-channel-config` in any channel to customize its settings.';

      await client.chat.postEphemeral({
        channel: command.channel_id,
        user: command.user_id,
        text: message,
      });
    } catch (error) {
      logger.error('Error listing channels:', error);
      await client.chat.postEphemeral({
        channel: command.channel_id,
        user: command.user_id,
        text: `❌ Error: ${error instanceof Error ? error.message : 'Failed to list channels'}`,
      });
    }
  });
}

function getModeLabel(mode: AnswerDetectionMode): string {
  switch (mode) {
    case 'emoji_only':
      return 'Emoji Only - Requires ✅ reaction';
    case 'thread_auto':
      return 'Thread Auto - Any reply marks answered';
    case 'hybrid':
      return 'Hybrid - Replies pause, emoji completes';
    default:
      return mode;
  }
}

function formatSettings(settings: ChannelSettings): string {
  const parts: string[] = [];

  if (settings.escalationEnabled === false) {
    parts.push('• Escalation: ❌ Disabled');
  }

  if (settings.firstEscalationMinutes) {
    parts.push(`• First: ${settings.firstEscalationMinutes} min`);
  }

  if (settings.secondEscalationMinutes) {
    parts.push(`• Second: ${settings.secondEscalationMinutes} min`);
  }

  if (settings.finalEscalationMinutes) {
    parts.push(`• Final: ${settings.finalEscalationMinutes} min`);
  }

  if (settings.answerDetectionMode) {
    parts.push(`• Mode: ${settings.answerDetectionMode}`);
  }

  return parts.join('\n');
}
