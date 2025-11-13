/**
 * Test Escalation Command
 * Allows admins to test escalation configuration without waiting
 */
import boltPkg from '@slack/bolt';
import type { App } from '@slack/bolt';
import { ensureWorkspace } from '../utils/db.js';
import { getTargetsForLevel } from '../services/escalationTargetService.js';
import { isWorkspaceAdmin, sendPermissionDenied } from '../utils/permissions.js';

export function registerTestEscalationCommand(app: App) {
  app.command('/qr-test-escalation', async ({ command, ack, client, logger }) => {
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

      // Get targets for all levels
      const level1Targets = await getTargetsForLevel(workspace.id, 1);
      const level2Targets = await getTargetsForLevel(workspace.id, 2);
      const level3Targets = await getTargetsForLevel(workspace.id, 3);

      // Build test results message
      let message = '🧪 *Escalation Configuration Test*\n\n';

      // Level 1
      message += '*Level 1 Escalation:*\n';
      if (level1Targets.length === 0) {
        message += '❌ No targets configured\n';
      } else {
        level1Targets.forEach((target, idx) => {
          message += `✅ ${idx + 1}. ${getTargetIcon(target.targetType)} ${target.targetName || target.targetId}\n`;
        });
      }
      message += '\n';

      // Level 2
      message += '*Level 2 Escalation:*\n';
      if (level2Targets.length === 0) {
        message += '❌ No targets configured\n';
      } else {
        level2Targets.forEach((target, idx) => {
          message += `✅ ${idx + 1}. ${getTargetIcon(target.targetType)} ${target.targetName || target.targetId}\n`;
        });
      }
      message += '\n';

      // Level 3
      message += '*Level 3 Escalation:*\n';
      if (level3Targets.length === 0) {
        message += '❌ No targets configured\n';
      } else {
        level3Targets.forEach((target, idx) => {
          message += `✅ ${idx + 1}. ${getTargetIcon(target.targetType)} ${target.targetName || target.targetId}\n`;
        });
      }
      message += '\n';

      // Test simulation option
      const totalTargets = level1Targets.length + level2Targets.length + level3Targets.length;

      if (totalTargets === 0) {
        message += '⚠️ *No escalation targets configured!*\n\n';
        message += 'Use `/qr-targets` to add targets before testing.\n';
      } else {
        message += '✨ *Configuration looks good!*\n\n';
        message += `Total targets: ${totalTargets}\n`;
        message += `• Level 1: ${level1Targets.length}\n`;
        message += `• Level 2: ${level2Targets.length}\n`;
        message += `• Level 3: ${level3Targets.length}\n\n`;
        message += '💡 To test the full flow:\n';
        message += '1. Post a test question in this channel\n';
        message += '2. Don\'t answer it\n';
        message += '3. Wait for escalations to trigger\n';
        message += '4. Mark it answered with ✅ when done\n';
      }

      // Build blocks array
      const blocks: any[] = [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: message,
          },
        },
      ];

      // Add test button if targets are configured
      if (totalTargets > 0) {
        blocks.push({
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: '🧪 Send Test Notification',
              },
              action_id: 'send_test_notification',
              style: 'primary',
            },
          ],
        });
      }

      // Send as ephemeral message
      await client.chat.postEphemeral({
        channel: command.channel_id,
        user: command.user_id,
        text: message,
        blocks,
      });
    } catch (error) {
      logger.error('Error in test escalation command:', error);
      await client.chat.postEphemeral({
        channel: command.channel_id,
        user: command.user_id,
        text: `❌ Error testing escalation: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }
  });

  // Handle test notification button
  app.action('send_test_notification', async ({ ack, body, client, logger }) => {
    await ack();

    try {
      const teamInfo = await client.team.info();
      const teamId = teamInfo.team?.id;

      if (!teamId) {
        throw new Error('Could not get team information');
      }

      const workspace = await ensureWorkspace(teamId);
      const level1Targets = await getTargetsForLevel(workspace.id, 1);

      if (level1Targets.length === 0) {
        await client.chat.postEphemeral({
          channel: (body as any).channel?.id || body.user.id,
          user: body.user.id,
          text: '❌ No Level 1 targets configured. Add targets with `/qr-targets` first.',
        });
        return;
      }

      // Send test notification to Level 1 targets
      const channelId = (body as any).channel?.id || body.user.id;
      let notificationsSent = 0;

      for (const target of level1Targets) {
        try {
          switch (target.targetType) {
            case 'user_group':
              await client.chat.postMessage({
                channel: channelId,
                text: `🧪 *Test Notification*\n\n<!subteam^${target.targetId}> - This is a test escalation from Question Router.\n\nIf you see this, your Level 1 escalation is configured correctly! ✅`,
              });
              notificationsSent++;
              break;

            case 'user':
              await client.chat.postMessage({
                channel: channelId,
                text: `🧪 *Test Notification*\n\n<@${target.targetId}> - This is a test escalation from Question Router.\n\nIf you see this, your Level 1 escalation is configured correctly! ✅`,
              });
              // Also send DM
              await client.chat.postMessage({
                channel: target.targetId,
                text: `🧪 *Test Direct Message*\n\nThis is a test DM from Question Router. You received this because you're configured as a Level 1 escalation target.\n\n✅ Your configuration is working correctly!`,
              });
              notificationsSent++;
              break;

            case 'channel':
              await client.chat.postMessage({
                channel: target.targetId,
                text: `🧪 *Test Escalation Alert*\n\nThis is a test notification from Question Router in <@${body.user.id}>'s workspace.\n\nIf you see this message, your Level 1 escalation channel is configured correctly! ✅`,
              });
              notificationsSent++;
              break;
          }
        } catch (error) {
          logger.error(`Error sending test to target ${target.targetId}:`, error);
        }
      }

      // Confirm to user
      await client.chat.postEphemeral({
        channel: channelId,
        user: body.user.id,
        text: `✅ Sent ${notificationsSent} test notification(s) to Level 1 targets!\n\nCheck the channel/DMs to verify they were received.`,
      });
    } catch (error) {
      logger.error('Error sending test notification:', error);
      await client.chat.postEphemeral({
        channel: (body as any).channel?.id || body.user.id,
        user: body.user.id,
        text: `❌ Error: ${error instanceof Error ? error.message : 'Failed to send test'}`,
      });
    }
  });
}

function getTargetIcon(targetType: string): string {
  switch (targetType) {
    case 'user':
      return '👤';
    case 'user_group':
      return '👥';
    case 'channel':
      return '#️⃣';
    default:
      return '❓';
  }
}
