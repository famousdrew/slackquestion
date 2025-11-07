/**
 * Message Event Handler
 * Listens for messages and detects questions
 */

import { App } from '@slack/bolt';
import { isQuestion } from '../services/questionDetector.js';
import { createQuestion } from '../services/questionManager.js';
import { ensureWorkspace, ensureChannel, ensureUser, isChannelMonitored } from '../services/workspaceManager.js';
import { logger } from '../utils/logger.js';

export function registerMessageHandler(app: App) {
  app.event('message', async ({ event, client }) => {
    try {
      // Only handle regular channel messages (not edits, deletes, etc.)
      if (event.subtype || !('text' in event) || !event.text) {
        return;
      }

      const messageEvent = event as any;
      const text = messageEvent.text;
      const channelId = messageEvent.channel;
      const userId = messageEvent.user;
      const messageTs = messageEvent.ts;
      const threadTs = messageEvent.thread_ts;

      // Skip bot messages
      if (messageEvent.bot_id) {
        return;
      }

      // Get team info
      const teamInfo = await client.team.info();
      const teamId = teamInfo.team?.id;
      const teamName = teamInfo.team?.name;

      if (!teamId) {
        logger.error('Could not get team ID');
        return;
      }

      // Ensure workspace exists
      const workspace = await ensureWorkspace(teamId, teamName);

      // Check if channel is monitored
      const monitored = await isChannelMonitored(workspace.id, channelId);
      if (!monitored) {
        // Auto-monitor new channels by creating them
        const channelInfo = await client.conversations.info({ channel: channelId });
        await ensureChannel(workspace.id, channelId, channelInfo.channel?.name);
      }

      // Ensure user exists
      const userInfo = await client.users.info({ user: userId });
      const user = await ensureUser(workspace.id, userId, {
        displayName: userInfo.user?.profile?.display_name,
        realName: userInfo.user?.real_name,
        email: userInfo.user?.profile?.email,
      });

      // Check if this is a question
      if (!isQuestion(text)) {
        logger.debug('Not a question:', text.substring(0, 50));
        return;
      }

      logger.info('Question detected:', {
        channel: channelId,
        user: userId,
        text: text.substring(0, 100),
      });

      // Get channel for database
      const channel = await ensureChannel(workspace.id, channelId);

      // Create question in database
      await createQuestion({
        workspaceId: workspace.id,
        channelId: channel.id,
        askerId: user.id,
        slackMessageId: messageTs,
        slackThreadId: threadTs,
        messageText: text,
      });

    } catch (error) {
      logger.error('Error handling message:', error);
    }
  });

  logger.info('Message event handler registered');
}
