/**
 * App Home Tab Handler
 * Provides onboarding and configuration status for workspace admins
 */
import { App } from '@slack/bolt';
import { ensureWorkspace } from '../utils/db.js';
import { getWorkspaceConfig } from '../services/configService.js';

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
                  '• `/qr-stats` - View question statistics\n' +
                  '• `/qr-status` - Check a specific question status',
              },
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
