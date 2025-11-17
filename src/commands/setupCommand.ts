/**
 * Unified Setup Wizard
 * Guides new users through complete configuration in one flow
 */
import boltPkg from '@slack/bolt';
import type { App } from '@slack/bolt';
import { ensureWorkspace, prisma } from '../utils/db.js';
import { getWorkspaceConfig } from '../services/configService.js';
import { getEscalationTargets } from '../services/escalationTargetService.js';
import { isWorkspaceAdmin, sendPermissionDenied } from '../utils/permissions.js';

export function registerSetupCommand(app: App) {
  app.command('/qr-setup', async ({ command, ack, client, logger }) => {
    await ack();

    try {
      // Check if user is workspace admin
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
      const config = await getWorkspaceConfig(workspace.id);
      const targets = await getEscalationTargets(workspace.id);

      // Check current setup status
      const hasTargets = targets.length > 0;
      const setupComplete = hasTargets && config.escalationUserGroup !== null;

      if (setupComplete) {
        // Already configured - show summary
        await client.chat.postEphemeral({
          channel: command.channel_id,
          user: command.user_id,
          text: '✅ *Question Router is Already Configured*\n\n' +
            'Your workspace is fully set up! Use these commands to manage your configuration:\n\n' +
            '• `/qr-config` - Adjust timing and answer detection\n' +
            '• `/qr-targets` - Manage escalation targets\n' +
            '• `/qr-test-escalation` - Test your configuration\n' +
            '• `/qr-stats` - View question statistics',
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: '✅ *Question Router is Already Configured*\n\n' +
                  'Your workspace is fully set up! Use these commands to manage your configuration:',
              },
            },
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text:
                  '• `/qr-config` - Adjust timing and answer detection\n' +
                  '• `/qr-targets` - Manage escalation targets\n' +
                  '• `/qr-test-escalation` - Test your configuration\n' +
                  '• `/qr-stats` - View question statistics',
              },
            },
            {
              type: 'actions',
              elements: [
                {
                  type: 'button',
                  text: {
                    type: 'plain_text',
                    text: '⚙️ Adjust Settings',
                  },
                  action_id: 'open_config_from_setup',
                },
                {
                  type: 'button',
                  text: {
                    type: 'plain_text',
                    text: '🎯 Manage Targets',
                  },
                  action_id: 'open_targets_from_setup',
                },
                {
                  type: 'button',
                  text: {
                    type: 'plain_text',
                    text: '🧪 Test Configuration',
                  },
                  action_id: 'test_from_setup',
                },
              ],
            },
          ],
        });
      } else {
        // Show setup wizard
        await client.chat.postEphemeral({
          channel: command.channel_id,
          user: command.user_id,
          text: '🚀 *Welcome to Question Router Setup*\n\n' +
            'Let\'s get you configured in 3 easy steps!',
          blocks: [
            {
              type: 'header',
              text: {
                type: 'plain_text',
                text: '🚀 Welcome to Question Router Setup',
              },
            },
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: 'Let\'s configure your workspace in 3 easy steps:\n\n' +
                  '*Step 1:* Set escalation timing ⏱️\n' +
                  '*Step 2:* Add who gets notified 👥\n' +
                  '*Step 3:* Test your configuration 🧪',
              },
            },
            {
              type: 'divider',
            },
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: '*What is Question Router?*\n\n' +
                  'This bot automatically detects questions in your channels and escalates unanswered ones to your support team.\n\n' +
                  '• Questions marked with ❓ automatically\n' +
                  '• Escalates to your team if unanswered\n' +
                  '• Tracks metrics and response times',
              },
            },
            {
              type: 'actions',
              elements: [
                {
                  type: 'button',
                  text: {
                    type: 'plain_text',
                    text: '▶️ Start Setup',
                  },
                  action_id: 'start_setup_wizard',
                  style: 'primary',
                },
              ],
            },
          ],
        });
      }
    } catch (error) {
      logger.error('Error in setup command:', error);
      await client.chat.postEphemeral({
        channel: command.channel_id,
        user: command.user_id,
        text: `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }
  });

  // Start setup wizard button
  app.action('start_setup_wizard', async ({ ack, body, client, logger }) => {
    await ack();

    try {
      const [teamInfo, userGroupsResponse] = await Promise.all([
        client.team.info(),
        client.usergroups.list(),
      ]);

      const teamId = teamInfo.team?.id;
      if (!teamId) {
        throw new Error('Could not get team information');
      }

      const workspace = await ensureWorkspace(teamId);
      const config = await getWorkspaceConfig(workspace.id);
      const userGroups = userGroupsResponse.usergroups || [];

      // Open comprehensive setup modal
      await client.views.open({
        trigger_id: (body as any).trigger_id,
        view: {
          type: 'modal',
          callback_id: 'complete_setup_modal',
          title: {
            type: 'plain_text',
            text: 'Complete Setup',
          },
          submit: {
            type: 'plain_text',
            text: 'Finish Setup',
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
                text: '⏱️ Step 1: Escalation Timing',
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
                text: 'How long to wait before notifying your team (default: 2 minutes)',
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
                text: 'Time before escalating further (default: 4 minutes)',
              },
            },
            {
              type: 'divider',
            },
            {
              type: 'header',
              text: {
                type: 'plain_text',
                text: '👥 Step 2: Who Gets Notified',
              },
            },
            {
              type: 'input',
              block_id: 'escalation_user_group',
              optional: true,
              label: {
                type: 'plain_text',
                text: 'User Group (Level 1)',
              },
              element: {
                type: 'static_select',
                action_id: 'user_group_select',
                placeholder: {
                  type: 'plain_text',
                  text: 'Select your support team',
                },
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
                text: 'This group will be @ mentioned when questions go unanswered',
              },
            },
            {
              type: 'input',
              block_id: 'escalation_channel',
              optional: true,
              label: {
                type: 'plain_text',
                text: 'Escalation Channel (Level 2)',
              },
              element: {
                type: 'conversations_select',
                action_id: 'channel_select',
                default_to_current_conversation: false,
                filter: {
                  include: ['public', 'private'],
                  exclude_bot_users: true,
                },
              },
              hint: {
                type: 'plain_text',
                text: 'Channel where critical unanswered questions are posted',
              },
            },
            {
              type: 'divider',
            },
            {
              type: 'header',
              text: {
                type: 'plain_text',
                text: '✅ Step 3: Answer Detection',
              },
            },
            {
              type: 'input',
              block_id: 'answer_mode',
              label: {
                type: 'plain_text',
                text: 'How should answers be detected?',
              },
              element: {
                type: 'static_select',
                action_id: 'answer_mode_select',
                initial_option: {
                  text: {
                    type: 'plain_text',
                    text: 'Hybrid (Recommended) - Replies stop escalation, ✅ marks complete',
                  },
                  value: 'hybrid',
                },
                options: [
                  {
                    text: {
                      type: 'plain_text',
                      text: 'Hybrid (Recommended) - Replies stop escalation, ✅ marks complete',
                    },
                    value: 'hybrid',
                  },
                  {
                    text: {
                      type: 'plain_text',
                      text: 'Emoji Only - Requires ✅ reaction to mark answered',
                    },
                    value: 'emoji_only',
                  },
                  {
                    text: {
                      type: 'plain_text',
                      text: 'Thread Auto - Any reply automatically marks answered',
                    },
                    value: 'thread_auto',
                  },
                ],
              },
            },
            {
              type: 'context',
              elements: [
                {
                  type: 'mrkdwn',
                  text: '💡 You can always adjust these settings later with `/qr-config` and `/qr-targets`',
                },
              ],
            },
          ],
        },
      });
    } catch (error) {
      logger.error('Error opening setup modal:', error);
    }
  });

  // Handle complete setup submission
  app.view('complete_setup_modal', async ({ ack, view, body, client, logger }) => {
    await ack();

    try {
      const teamId = body.team?.id;
      if (!teamId) {
        throw new Error('Could not get team information');
      }

      const workspace = await ensureWorkspace(teamId);

      // Extract all values
      const firstEscalation = parseInt(
        view.state.values.first_escalation.first_escalation_input.value || '2'
      );
      const secondEscalation = parseInt(
        view.state.values.second_escalation.second_escalation_input.value || '4'
      );
      const userGroupValue =
        view.state.values.escalation_user_group.user_group_select.selected_option?.value || null;
      const userGroup = userGroupValue === 'none' ? null : userGroupValue;
      const channel =
        view.state.values.escalation_channel.channel_select.selected_conversation || null;
      const answerMode =
        view.state.values.answer_mode.answer_mode_select.selected_option?.value || 'hybrid';

      // Save config
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

      // Send success message with next steps
      await client.chat.postEphemeral({
        channel: body.user.id,
        user: body.user.id,
        text: '🎉 *Setup Complete!* Question Router is now active.\n\n' +
          '*What happens next?*\n' +
          '1. Add Question Router to channels you want to monitor\n' +
          '2. Questions will be detected automatically\n' +
          '3. Unanswered questions will escalate per your settings\n\n' +
          '*Useful Commands:*\n' +
          '• `/qr-test-escalation` - Test your configuration\n' +
          '• `/qr-targets` - Add more escalation targets\n' +
          '• `/qr-stats` - View question metrics\n' +
          '• `/qr-config` - Adjust settings anytime',
      });

      console.log(`✅ Setup completed for workspace ${workspace.slackTeamId}`);
    } catch (error) {
      logger.error('Error completing setup:', error);
      await client.chat.postEphemeral({
        channel: body.user.id,
        user: body.user.id,
        text: `❌ Setup error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }
  });

  // Helper actions for already-configured users
  app.action('open_config_from_setup', async ({ ack }) => {
    await ack();
    // The user should run /qr-config themselves
  });

  app.action('open_targets_from_setup', async ({ ack }) => {
    await ack();
    // The user should run /qr-targets themselves
  });

  app.action('test_from_setup', async ({ ack }) => {
    await ack();
    // The user should run /qr-test-escalation themselves
  });
}
