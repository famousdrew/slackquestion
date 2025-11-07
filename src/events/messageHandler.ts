/**
 * Message Event Handler
 * Listens for messages in channels and detects questions
 */
import { App } from '@slack/bolt';
import { isQuestion } from '../services/questionDetector.js';
import { storeQuestion, questionExists } from '../services/questionStorage.js';
import { ensureWorkspace, ensureChannel, ensureUser } from '../utils/db.js';
import { isZendeskMessage, extractZendeskTicketId, getZendeskBotUserId } from '../services/zendeskDetector.js';

export function registerMessageHandler(app: App) {
  // Handle regular channel messages
  app.message(async ({ message, client, logger }) => {
    try {
      logger.info(`Message received: ${JSON.stringify(message).substring(0, 200)}`);

      // Check if this is a Zendesk side conversation
      const isZendesk = await isZendeskMessage(message, client);

      if (isZendesk && process.env.ZENDESK_INTEGRATION_ENABLED === 'true') {
        logger.info('Zendesk side conversation detected');
        await handleZendeskSideConversation(message, client, logger);
        return;
      }

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

/**
 * Handle Zendesk side conversation messages
 * Treats all side conversations as questions to track
 */
async function handleZendeskSideConversation(message: any, client: any, logger: any) {
  try {
    // Ensure message has required fields
    if (!('text' in message) || !message.text) {
      logger.info('Zendesk message has no text, skipping');
      return;
    }

    const messageText = message.text;
    const channelId = message.channel;
    const messageTs = message.ts;
    const threadTs = message.thread_ts;

    // Only track parent messages (not replies within side conversation thread)
    if (threadTs && threadTs !== messageTs) {
      logger.info('Skipping threaded reply in side conversation');
      return;
    }

    logger.info(`Processing Zendesk side conversation: "${messageText.substring(0, 100)}..."`);

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

    // Get or create Zendesk bot user as the "asker"
    const zendeskBotUserId = await getZendeskBotUserId(teamId, client);
    if (!zendeskBotUserId) {
      logger.error('Could not determine Zendesk bot user ID');
      return;
    }

    // Ensure Zendesk bot user exists in our database
    const zendeskBotUser = await ensureUser(workspace.id, zendeskBotUserId, {
      displayName: 'Zendesk',
      realName: 'Zendesk Side Conversation',
    });

    // Check if we've already stored this question
    const exists = await questionExists(workspace.id, messageTs);
    if (exists) {
      logger.info('Side conversation already stored, skipping');
      return;
    }

    // Extract Zendesk ticket ID if present in message
    const ticketId = extractZendeskTicketId(messageText);

    // Store the side conversation as a question
    const question = await storeQuestion({
      workspaceId: workspace.id,
      channelId: channel.id,
      askerId: zendeskBotUser.id,
      slackMessageId: messageTs,
      slackThreadId: threadTs,
      messageText,
      askedAt: new Date(parseFloat(messageTs) * 1000),
      isSideConversation: true,
      zendeskTicketId: ticketId,
      sourceApp: 'zendesk',
    });

    logger.info(`Zendesk side conversation stored with ID: ${question.id}${ticketId ? ` (Ticket #${ticketId})` : ''}`);

    // Add :question: emoji to acknowledge detection
    try {
      await client.reactions.add({
        channel: channelId,
        timestamp: messageTs,
        name: 'question',
      });
      logger.info('Added :question: reaction to side conversation');
    } catch (reactionError) {
      logger.warn('Could not add reaction:', reactionError);
    }
  } catch (error) {
    logger.error('Error handling Zendesk side conversation:', error);
  }
}
