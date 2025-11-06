/**
 * Configuration Command Handler with Modal UI
 * Allows admins to configure workspace settings via Slack modal
 */
import { App } from '@slack/bolt';
import { ensureWorkspace, prisma } from '../utils/db.js';
import {
  getWorkspaceConfig,
  getAnswerDetectionModeDescription,
  type AnswerDetectionMode,
} from '../services/configService.js';

export function registerConfigCommand(app: App) {
  // Command handler - opens modal
  app.command('/qr-config', async ({ command, ack, client, logger }) => {
    await ack();

    try {
      // Get team info
      const teamInfo = await client.team.info();
      const teamId = teamInfo.team?.id;

      if (!teamId) {
        throw new Error('Could not get team information');
      }

      const workspace = await ensureWorkspace(teamId);
      const config = await getWorkspaceConfig(workspace.id);

      // Fetch user groups for the dropdown
      const userGroupsResponse = await client.usergroups.list();
      const userGroups = userGroupsResponse.usergroups || [];

      // Fetch public and private channels for the dropdown
      const channelsResponse = await client.conversations.list({
        types: 'public_channel,private_channel',
        exclude_archived: true,
        limit: 1000,
      });
      const channels = channelsResponse.channels || [];

      // Open modal
      await client.views.open({
        trigger_id: command.trigger_id,
        view: {
          type: 'modal',
          callback_id: 'config_modal',
          title: {
            type: 'plain_text',
            text: 'Question Router Config',
          },
          submit: {
            type: 'plain_text',
            text: 'Save',
          },
          close: {
            type: 'plain_text',
            text: 'Cancel',
          },
          blocks: [
            {
              type: 'header',
              text: {
                type: 'plain_text',
                text: '⚙️ Escalation Timing',
              },
            },
            {
              type: 'input',
              block_id: 'first_escalation',
              label: {
                type: 'plain_text',
                text: 'First Escalation (minutes)',
              },
              element: {
                type: 'number_input',
                action_id: 'first_escalation_input',
                is_decimal_allowed: false,
                initial_value: config.firstEscalationMinutes.toString(),
                min_value: '1',
                max_value: '1440',
              },
              hint: {
                type: 'plain_text',
                text: 'Time before posting in thread with user group mention',
              },
            },
            {
              type: 'input',
              block_id: 'second_escalation',
              label: {
                type: 'plain_text',
                text: 'Second Escalation (minutes)',
              },
              element: {
                type: 'number_input',
                action_id: 'second_escalation_input',
                is_decimal_allowed: false,
                initial_value: config.secondEscalationMinutes.toString(),
                min_value: '1',
                max_value: '1440',
              },
              hint: {
                type: 'plain_text',
                text: 'Time before posting to escalation channel',
              },
            },
            {
              type: 'divider',
            },
            {
              type: 'header',
              text: {
                type: 'plain_text',
                text: '👥 Escalation Targets',
              },
            },
            {
              type: 'input',
              block_id: 'escalation_user_group',
              optional: true,
              label: {
                type: 'plain_text',
                text: 'User Group for First Escalation',
              },
              element: {
                type: 'static_select',
                action_id: 'user_group_select',
                placeholder: {
                  type: 'plain_text',
                  text: 'Select a user group',
                },
                initial_option: config.escalationUserGroup
                  ? (() => {
                      const selectedGroup = userGroups.find((ug) => ug.id === config.escalationUserGroup);
                      return selectedGroup
                        ? {
                            text: {
                              type: 'plain_text',
                              text: `@${selectedGroup.handle} (${selectedGroup.name})`,
                            },
                            value: selectedGroup.id || '',
                          }
                        : undefined;
                    })()
                  : undefined,
                options:
                  userGroups.length > 0
                    ? userGroups.map((ug) => ({
                        text: {
                          type: 'plain_text',
                          text: `@${ug.handle} (${ug.name})`,
                        },
                        value: ug.id || '',
                      }))
                    : [
                        {
                          text: {
                            type: 'plain_text',
                            text: 'No user groups available',
                          },
                          value: 'none',
                        },
                      ],
              },
              hint: {
                type: 'plain_text',
                text: 'This user group will be mentioned in the thread',
              },
            },
            {
              type: 'input',
              block_id: 'escalation_channel',
              optional: true,
              label: {
                type: 'plain_text',
                text: 'Channel for Second Escalation',
              },
              element: {
                type: 'conversations_select',
                action_id: 'channel_select',
                default_to_current_conversation: false,
                initial_conversation: config.escalationChannelId || undefined,
                filter: {
                  include: ['public', 'private'],
                  exclude_bot_users: true,
                },
              },
              hint: {
                type: 'plain_text',
                text: 'Public or private channel where unanswered questions will be escalated',
              },
            },
            {
              type: 'divider',
            },
            {
              type: 'header',
              text: {
                type: 'plain_text',
                text: '✅ Answer Detection',
              },
            },
            {
              type: 'input',
              block_id: 'answer_mode',
              label: {
                type: 'plain_text',
                text: 'Answer Detection Mode',
              },
              element: {
                type: 'static_select',
                action_id: 'answer_mode_select',
                initial_option: {
                  text: {
                    type: 'plain_text',
                    text: getModeLabel(config.answerDetectionMode as AnswerDetectionMode),
                  },
                  value: config.answerDetectionMode,
                },
                options: [
                  {
                    text: {
                      type: 'plain_text',
                      text: 'Emoji Only - Requires ✅ reaction',
                    },
                    value: 'emoji_only',
                  },
                  {
                    text: {
                      type: 'plain_text',
                      text: 'Thread Auto - Any reply marks answered',
                    },
                    value: 'thread_auto',
                  },
                  {
                    text: {
                      type: 'plain_text',
                      text: 'Hybrid - Replies pause, emoji completes',
                    },
                    value: 'hybrid',
                  },
                ],
              },
              hint: {
                type: 'plain_text',
                text: getAnswerDetectionModeDescription(config.answerDetectionMode),
              },
            },
            {
              type: 'context',
              elements: [
                {
                  type: 'mrkdwn',
                  text: '💡 *Tip:* Use emoji_only for precise control, thread_auto for casual channels, or hybrid for a balance.',
                },
              ],
            },
          ],
        },
      });
    } catch (error) {
      logger.error('Error opening config modal:', error);
      // Send error message to user
      try {
        await client.chat.postEphemeral({
          channel: command.channel_id,
          user: command.user_id,
          text: `❌ Error opening config modal: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
      } catch (ephemeralError) {
        logger.error('Could not send ephemeral error message:', ephemeralError);
      }
    }
  });

  // Modal submission handler
  app.view('config_modal', async ({ ack, view, body, client, logger }) => {
    await ack();

    try {
      const teamId = body.team?.id;
      if (!teamId) {
        throw new Error('Could not get team information');
      }

      const workspace = await ensureWorkspace(teamId);

      // Extract values from the modal
      const firstEscalation = parseInt(
        view.state.values.first_escalation.first_escalation_input.value || '120'
      );
      const secondEscalation = parseInt(
        view.state.values.second_escalation.second_escalation_input.value || '240'
      );
      const userGroupValue =
        view.state.values.escalation_user_group.user_group_select.selected_option?.value || null;
      const userGroup = userGroupValue === 'none' ? null : userGroupValue;
      const channel =
        view.state.values.escalation_channel.channel_select.selected_conversation || null;
      const answerMode =
        (view.state.values.answer_mode.answer_mode_select.selected_option
          ?.value as AnswerDetectionMode) || 'emoji_only';

      // Update config in database
      await prisma.workspaceConfig.upsert({
        where: { workspaceId: workspace.id },
        create: {
          workspaceId: workspace.id,
          firstEscalationMinutes: firstEscalation,
          secondEscalationMinutes: secondEscalation,
          escalationUserGroup: userGroup,
          escalationChannelId: channel,
          answerDetectionMode: answerMode,
        },
        update: {
          firstEscalationMinutes: firstEscalation,
          secondEscalationMinutes: secondEscalation,
          escalationUserGroup: userGroup,
          escalationChannelId: channel,
          answerDetectionMode: answerMode,
          updatedAt: new Date(),
        },
      });

      // Send confirmation message
      await client.chat.postEphemeral({
        channel: body.user.id,
        user: body.user.id,
        text: `✅ Configuration updated successfully!\n\n` +
          `*Escalation Timing:*\n` +
          `• First: ${firstEscalation} minutes\n` +
          `• Second: ${secondEscalation} minutes\n\n` +
          `*Answer Mode:* ${getModeLabel(answerMode)}`,
      });

      console.log(
        `✅ Config updated for workspace ${workspace.slackTeamId}: ${firstEscalation}/${secondEscalation} min, mode: ${answerMode}`
      );
    } catch (error) {
      logger.error('Error saving config:', error);
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
