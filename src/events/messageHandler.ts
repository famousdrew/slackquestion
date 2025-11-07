/**
 * Message Event Handler
 * Listens for messages in channels and detects questions
 */
import { App } from '@slack/bolt';
import { isQuestion } from '../services/questionDetector.js';
import { storeQuestion, questionExists } from '../services/questionStorage.js';
import { ensureWorkspace, ensureChannel, ensureUser } from '../utils/db.js';

export function registerMessageHandler(app: App) {
  // Handle regular channel messages
  app.message(async ({ message, client, logger }) => {
    try {
      logger.info(`Message received: ${JSON.stringify(message).substring(0, 200)}`);

      // Only process regular messages (not bot messages, edits, etc.)
      if (message.subtype || !('text' in message) || !message.text) {
        logger.info(`Skipping message - subtype: ${message.subtype}, has text: ${('text' in message)}`);
        return;
      }

      const messageText = message.text;
      logger.info(`Processing message text: "${messageText}"`);
      const userId = message.user;
      const channelId = message.channel;
      const messageTs = message.ts;
      const threadTs = message.thread_ts;

      // Skip messages in threads (replies)
      if (threadTs && threadTs !== messageTs) {
        logger.info('Skipping threaded message (reply)');
        return;
      }

      // Check if this is a question
      if (!isQuestion(messageText)) {
        return;
      }

      logger.info(`Question detected: "${messageText.substring(0, 50)}..."`);

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

      // Get channel info
      const channelInfo = await client.conversations.info({
        channel: channelId,
      });
      const channelName = channelInfo.channel?.name;

      // Ensure channel exists and is monitored
      const channel = await ensureChannel(workspace.id, channelId, channelName);

      if (!channel.isMonitored) {
        logger.info(`Channel ${channelName} is not monitored, skipping`);
        return;
      }

      // Get user info
      const userInfo = await client.users.info({
        user: userId,
      });

      const userData = {
        displayName: userInfo.user?.profile?.display_name || userInfo.user?.name,
        realName: userInfo.user?.profile?.real_name,
        email: userInfo.user?.profile?.email,
      };

      // Ensure user exists
      const user = await ensureUser(workspace.id, userId, userData);

      // Check if we've already stored this question
      const exists = await questionExists(workspace.id, messageTs);
      if (exists) {
        logger.info('Question already stored, skipping');
        return;
      }

      // Store the question
      const question = await storeQuestion({
        workspaceId: workspace.id,
        channelId: channel.id,
        askerId: user.id,
        slackMessageId: messageTs,
        slackThreadId: threadTs,
        messageText,
        askedAt: new Date(parseFloat(messageTs) * 1000),
      });

      logger.info(`Question stored with ID: ${question.id}`);

      // Add :question: emoji to acknowledge detection and signal tracking
      try {
        await client.reactions.add({
          channel: channelId,
          timestamp: messageTs,
          name: 'question',
        });
        logger.info('Added :question: reaction to message');
      } catch (reactionError) {
        // Reaction might fail if already added or permissions issue
        logger.warn('Could not add reaction:', reactionError);
      }

    } catch (error) {
      logger.error('Error handling message:', error);
    }
  });
}
