/**
 * Escalation Targets Command Handler
 * Allows admins to manage escalation targets (users, groups, channels)
 */
import { App } from '@slack/bolt';
import { ensureWorkspace } from '../utils/db.js';
import {
  getEscalationTargets,
  addEscalationTarget,
  removeEscalationTarget,
  getTargetDescription,
  validateTarget,
  type EscalationTargetType,
} from '../services/escalationTargetService.js';
import { isWorkspaceAdmin, sendPermissionDenied } from '../utils/permissions.js';

/**
 * Helper function to generate targets list blocks
 */
async function buildTargetsListBlocks(workspaceId: string): Promise<any[]> {
  const targets = await getEscalationTargets(workspaceId);

  // Group targets by level
  const targetsByLevel = new Map<number, typeof targets>();
  for (const target of targets) {
    if (!targetsByLevel.has(target.escalationLevel)) {
      targetsByLevel.set(target.escalationLevel, []);
    }
    targetsByLevel.get(target.escalationLevel)!.push(target);
  }

  // Build message blocks
  const blocks: any[] = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: '🎯 Escalation Targets',
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: 'Manage who gets notified at each escalation level.',
      },
    },
    {
      type: 'divider',
    },
  ];

  // Show targets for each level
  const levels = [1, 2, 3];
  for (const level of levels) {
    const levelTargets = targetsByLevel.get(level) || [];

    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Level ${level} Escalation:*`,
      },
    });

    if (levelTargets.length === 0) {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '_No targets configured_',
        },
      });
    } else {
      const targetList = levelTargets
        .map((t, idx) => `${idx + 1}. ${getTargetDescription(t)}`)
        .join('\n');

      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: targetList,
        },
      });
    }
  }

  blocks.push(
    {
      type: 'divider',
    },
    {
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: '➕ Add Target',
          },
          action_id: 'add_escalation_target',
          style: 'primary',
        },
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: '🗑️ Remove Target',
          },
          action_id: 'remove_escalation_target',
          style: 'danger',
        },
      ],
    }
  );

  return blocks;
}

export function registerTargetsCommand(app: App) {
  // Main command - shows current targets and options
  app.command('/qr-targets', async ({ command, ack, client, logger }) => {
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
      const blocks = await buildTargetsListBlocks(workspace.id);

      // Send ephemeral message
      await client.chat.postEphemeral({
        channel: command.channel_id,
        user: command.user_id,
        blocks,
        text: 'Escalation Targets Configuration',
      });
    } catch (error) {
      logger.error('Error in /qr-targets command:', error);
      await client.chat.postEphemeral({
        channel: command.channel_id,
        user: command.user_id,
        text: `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }
  });

  // Add target button handler
  app.action('add_escalation_target', async ({ ack, body, client, logger }) => {
    await ack();

    try {
      // Fetch user groups and channels
      const userGroupsResponse = await client.usergroups.list();
      const userGroups = userGroupsResponse.usergroups || [];

      // Open modal for adding target
      await client.views.open({
        trigger_id: (body as any).trigger_id,
        view: {
          type: 'modal',
          callback_id: 'add_target_modal',
          title: {
            type: 'plain_text',
            text: 'Add Escalation Target',
          },
          submit: {
            type: 'plain_text',
            text: 'Add',
          },
          close: {
            type: 'plain_text',
            text: 'Cancel',
          },
          blocks: [
            {
              type: 'input',
              block_id: 'escalation_level',
              label: {
                type: 'plain_text',
                text: 'Escalation Level',
              },
              element: {
                type: 'static_select',
                action_id: 'level_select',
                placeholder: {
                  type: 'plain_text',
                  text: 'Select level',
                },
                options: [
                  {
                    text: { type: 'plain_text', text: 'Level 1 - First Escalation' },
                    value: '1',
                  },
                  {
                    text: { type: 'plain_text', text: 'Level 2 - Second Escalation' },
                    value: '2',
                  },
                  {
                    text: { type: 'plain_text', text: 'Level 3 - Final Escalation' },
                    value: '3',
                  },
                ],
              },
            },
            {
              type: 'input',
              block_id: 'target_type',
              label: {
                type: 'plain_text',
                text: 'Target Type',
              },
              element: {
                type: 'static_select',
                action_id: 'type_select',
                placeholder: {
                  type: 'plain_text',
                  text: 'Select type',
                },
                options: [
                  {
                    text: { type: 'plain_text', text: '👤 User (by @mention)' },
                    value: 'user',
                  },
                  {
                    text: { type: 'plain_text', text: '👥 User Group' },
                    value: 'user_group',
                  },
                  {
                    text: { type: 'plain_text', text: '#️⃣ Channel' },
                    value: 'channel',
                  },
                ],
              },
              hint: {
                type: 'plain_text',
                text: 'Choose the type of escalation target',
              },
            },
            {
              type: 'input',
              block_id: 'user_target',
              optional: true,
              label: {
                type: 'plain_text',
                text: 'User (if User selected above)',
              },
              element: {
                type: 'users_select',
                action_id: 'user_select',
                placeholder: {
                  type: 'plain_text',
                  text: 'Select a user',
                },
              },
            },
            {
              type: 'input',
              block_id: 'group_target',
              optional: true,
              label: {
                type: 'plain_text',
                text: 'User Group (if User Group selected above)',
              },
              element: {
                type: 'static_select',
                action_id: 'group_select',
                placeholder: {
                  type: 'plain_text',
                  text: 'Select a user group',
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
            },
            {
              type: 'input',
              block_id: 'channel_target',
              optional: true,
              label: {
                type: 'plain_text',
                text: 'Channel (if Channel selected above)',
              },
              element: {
                type: 'conversations_select',
                action_id: 'channel_select',
                placeholder: {
                  type: 'plain_text',
                  text: 'Select a channel',
                },
                filter: {
                  include: ['public', 'private'],
                  exclude_bot_users: true,
                },
              },
            },
          ],
        },
      });
    } catch (error) {
      logger.error('Error opening add target modal:', error);
    }
  });

  // Handle add target modal submission
  app.view('add_target_modal', async ({ ack, view, body, client, logger }) => {
    await ack();

    try {
      const teamId = body.team?.id;
      if (!teamId) {
        throw new Error('Could not get team information');
      }

      const workspace = await ensureWorkspace(teamId);

      // Extract values
      const level = parseInt(view.state.values.escalation_level.level_select.selected_option!.value);
      const targetType = view.state.values.target_type.type_select.selected_option!
        .value as EscalationTargetType;

      let targetId: string | undefined;
      let targetName: string | undefined;

      // Get the appropriate target based on type
      switch (targetType) {
        case 'user':
          targetId = view.state.values.user_target.user_select.selected_user || undefined;
          break;
        case 'user_group':
          targetId = view.state.values.group_target.group_select.selected_option?.value || undefined;
          break;
        case 'channel':
          targetId =
            view.state.values.channel_target.channel_select.selected_conversation || undefined;
          break;
      }

      if (!targetId) {
        const typeLabel =
          targetType === 'user' ? 'user' :
          targetType === 'user_group' ? 'user group' : 'channel';
        throw new Error(`Please select a ${typeLabel} from the dropdown before submitting.`);
      }

      // Validate the target
      const validation = await validateTarget(client, targetType, targetId);
      if (!validation.valid) {
        throw new Error(validation.error || 'Could not validate the selected target. Please try again.');
      }

      // Add the target
      await addEscalationTarget(workspace.id, {
        targetType,
        targetId,
        targetName: validation.name,
        escalationLevel: level,
      });

      console.log(
        `✅ Added escalation target: ${targetType} ${targetId} at level ${level} for workspace ${workspace.slackTeamId}`
      );

      // Show updated targets list
      const blocks = await buildTargetsListBlocks(workspace.id);

      await client.chat.postEphemeral({
        channel: body.user.id,
        user: body.user.id,
        text: `✅ Added ${targetType} target "${validation.name}" to level ${level} escalation\n\nHere's your updated configuration:`,
        blocks,
      });
    } catch (error) {
      logger.error('Error adding escalation target:', error);
      await client.chat.postEphemeral({
        channel: body.user.id,
        user: body.user.id,
        text: `❌ Error: ${error instanceof Error ? error.message : 'Failed to add target'}`,
      });
    }
  });

  // Remove target button handler
  app.action('remove_escalation_target', async ({ ack, body, client, logger }) => {
    await ack();

    try {
      const teamInfo = await client.team.info();
      const teamId = teamInfo.team?.id;

      if (!teamId) {
        throw new Error('Could not get team information');
      }

      const workspace = await ensureWorkspace(teamId);
      const targets = await getEscalationTargets(workspace.id);

      if (targets.length === 0) {
        await client.chat.postEphemeral({
          channel: (body as any).channel?.id || body.user.id,
          user: body.user.id,
          text: '❌ No targets to remove',
        });
        return;
      }

      // Open modal for removing target
      await client.views.open({
        trigger_id: (body as any).trigger_id,
        view: {
          type: 'modal',
          callback_id: 'remove_target_modal',
          title: {
            type: 'plain_text',
            text: 'Remove Target',
          },
          submit: {
            type: 'plain_text',
            text: 'Remove',
          },
          close: {
            type: 'plain_text',
            text: 'Cancel',
          },
          blocks: [
            {
              type: 'input',
              block_id: 'target_select',
              label: {
                type: 'plain_text',
                text: 'Select target to remove',
              },
              element: {
                type: 'static_select',
                action_id: 'target',
                placeholder: {
                  type: 'plain_text',
                  text: 'Choose a target',
                },
                options: targets.map((t) => ({
                  text: {
                    type: 'plain_text',
                    text: `Level ${t.escalationLevel}: ${getTargetDescription(t)}`,
                  },
                  value: t.id!,
                })),
              },
            },
          ],
        },
      });
    } catch (error) {
      logger.error('Error opening remove target modal:', error);
    }
  });

  // Handle remove target modal submission
  app.view('remove_target_modal', async ({ ack, view, body, client, logger }) => {
    await ack();

    try {
      const teamInfo = await client.team.info();
      const teamId = teamInfo.team?.id;

      if (!teamId) {
        throw new Error('Could not get team information');
      }

      const workspace = await ensureWorkspace(teamId);
      const targetId = view.state.values.target_select.target.selected_option!.value;

      await removeEscalationTarget(targetId);

      console.log(`✅ Removed escalation target: ${targetId}`);

      // Show updated targets list
      const blocks = await buildTargetsListBlocks(workspace.id);

      await client.chat.postEphemeral({
        channel: body.user.id,
        user: body.user.id,
        text: '✅ Escalation target removed\n\nHere\'s your updated configuration:',
        blocks,
      });
    } catch (error) {
      logger.error('Error removing escalation target:', error);
      await client.chat.postEphemeral({
        channel: body.user.id,
        user: body.user.id,
        text: `❌ Error: ${error instanceof Error ? error.message : 'Failed to remove target'}`,
      });
    }
  });
}
