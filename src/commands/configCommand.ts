/**
 * Configuration Command Handler
 * Allows admins to configure workspace settings
 */
import { App } from '@slack/bolt';
import { ensureWorkspace } from '../utils/db.js';
import {
  getWorkspaceConfig,
  setAnswerDetectionMode,
  getAnswerDetectionModeDescription,
  type AnswerDetectionMode,
} from '../services/configService.js';

export function registerConfigCommand(app: App) {
  app.command('/qr-config', async ({ command, ack, respond, client, logger }) => {
    await ack();

    try {
      // Get team info
      const teamInfo = await client.team.info();
      const teamId = teamInfo.team?.id;

      if (!teamId) {
        await respond('Error: Could not get team information');
        return;
      }

      const workspace = await ensureWorkspace(teamId);
      const args = command.text.trim().toLowerCase().split(/\s+/);
      const subcommand = args[0];

      // Show current config
      if (!subcommand || subcommand === 'show') {
        const config = await getWorkspaceConfig(workspace.id);
        const modeDescription = getAnswerDetectionModeDescription(config.answerDetectionMode);

        await respond({
          response_type: 'ephemeral',
          text: `⚙️ *Current Configuration*\n\n` +
            `*Answer Detection Mode:* \`${config.answerDetectionMode}\`\n` +
            `${modeDescription}\n\n` +
            `*Escalation Timing:*\n` +
            `• First escalation: ${config.firstEscalationMinutes} minutes\n` +
            `• Second escalation: ${config.secondEscalationMinutes} minutes\n\n` +
            `*Commands:*\n` +
            `• \`/qr-config answer-mode <mode>\` - Set answer detection mode\n` +
            `  Available modes: \`emoji_only\`, \`thread_auto\`, \`hybrid\`\n` +
            `• \`/qr-config show\` - Show current configuration`,
        });
        return;
      }

      // Set answer detection mode
      if (subcommand === 'answer-mode') {
        const mode = args[1] as AnswerDetectionMode;

        if (!mode || !['emoji_only', 'thread_auto', 'hybrid'].includes(mode)) {
          await respond({
            response_type: 'ephemeral',
            text: `❌ Invalid mode. Available modes:\n` +
              `• \`emoji_only\` - Questions must be marked with ✅ emoji\n` +
              `• \`thread_auto\` - Any reply marks question as answered\n` +
              `• \`hybrid\` - Replies stop escalation, emoji required for stats`,
          });
          return;
        }

        await setAnswerDetectionMode(workspace.id, mode);
        const modeDescription = getAnswerDetectionModeDescription(mode);

        await respond({
          response_type: 'ephemeral',
          text: `✅ Answer detection mode updated to \`${mode}\`\n\n${modeDescription}`,
        });
        return;
      }

      // Unknown subcommand
      await respond({
        response_type: 'ephemeral',
        text: `❌ Unknown command. Use \`/qr-config show\` to see available commands.`,
      });

    } catch (error) {
      logger.error('Error in config command:', error);
      await respond('Error updating configuration. Please try again later.');
    }
  });
}
