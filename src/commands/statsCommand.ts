/**
 * Stats Command Handler
 * Displays question/answer statistics
 */
import boltPkg from '@slack/bolt';
import type { App } from '@slack/bolt';
import { getQuestionStats } from '../services/questionStorage.js';
import { ensureWorkspace } from '../utils/db.js';

export function registerStatsCommand(app: App) {
  app.command('/qr-stats', async ({ command, ack, respond, client, logger }) => {
    await ack();

    try {
      // Parse timeframe parameter
      const args = command.text.trim().toLowerCase();
      let daysBack = 7; // default to last 7 days
      let timeframeLabel = 'Last 7 days';

      switch (args) {
        case 'today':
          daysBack = 1;
          timeframeLabel = 'Today';
          break;
        case 'week':
          daysBack = 7;
          timeframeLabel = 'Last 7 days';
          break;
        case 'month':
          daysBack = 30;
          timeframeLabel = 'Last 30 days';
          break;
        case 'all':
          daysBack = 36500; // ~100 years
          timeframeLabel = 'All time';
          break;
      }

      // Get team info
      const teamInfo = await client.team.info();
      const teamId = teamInfo.team?.id;

      if (!teamId) {
        await respond('Error: Could not get team information');
        return;
      }

      const workspace = await ensureWorkspace(teamId);

      // Get stats
      const stats = await getQuestionStats(workspace.id, daysBack);

      // Format response time
      const formatTime = (minutes: number): string => {
        if (minutes < 60) {
          return `${Math.round(minutes)} minutes`;
        } else if (minutes < 1440) {
          return `${(minutes / 60).toFixed(1)} hours`;
        } else {
          return `${(minutes / 1440).toFixed(1)} days`;
        }
      };

      // Build response
      let responseText = `📊 *Question Router Stats* (${timeframeLabel})\n\n`;

      // Overall stats
      responseText += `*Overview:*\n`;
      responseText += `• Questions asked: ${stats.total}\n`;
      responseText += `• Answered: ${stats.answered} (${stats.answerRate.toFixed(1)}%)\n`;
      responseText += `• Unanswered: ${stats.unanswered} (${(100 - stats.answerRate).toFixed(1)}%)\n`;

      if (stats.answered > 0) {
        responseText += `• Avg response time: ${formatTime(stats.avgResponseTime)}\n`;
      }

      // Top responders
      if (stats.topResponders.length > 0) {
        responseText += `\n*Top Responders:*\n`;
        stats.topResponders.forEach((responder, index) => {
          responseText += `${index + 1}. ${responder.name}: ${responder.count} answer${responder.count !== 1 ? 's' : ''}\n`;
        });
      }

      // Channel stats
      if (stats.channelStats.length > 0) {
        responseText += `\n*By Channel:*\n`;
        stats.channelStats.forEach(channel => {
          responseText += `• #${channel.channelName}: ${channel.total} question${channel.total !== 1 ? 's' : ''}, ${channel.answerRate.toFixed(0)}% answered\n`;
        });
      }

      // No data message
      if (stats.total === 0) {
        responseText = `📊 *Question Router Stats* (${timeframeLabel})\n\n`;
        responseText += `No questions tracked yet in this timeframe.\n\n`;
        responseText += `The bot will start detecting questions automatically as people post in monitored channels.`;
      }

      await respond({
        response_type: 'ephemeral',
        text: responseText,
      });

    } catch (error) {
      logger.error('Error in stats command:', error);
      await respond('Error generating statistics. Please try again later.');
    }
  });
}
