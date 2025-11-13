/**
 * Message Event Handler
 * Listens for messages in channels and detects questions
 */
import { App } from '@slack/bolt';
import { isQuestion } from '../services/questionDetector.js';
import { storeQuestion, questionExists } from '../services/questionStorage.js';
import { ensureWorkspace, ensureChannel, ensureUser } from '../utils/db.js';
import { isZendeskMessage, extractZendeskTicketId, getZendeskBotUserId, extractAskerName } from '../services/zendeskDetector.js';
import { prisma } from '../utils/db.js';
import { sanitizeDisplayName, sanitizeMessageText } from '../utils/sanitize.js';
import type { User } from '@prisma/client';

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

      // Store the question with race condition handling
      // We try to store directly and handle duplicate errors rather than check-then-insert
      let question;
      try {
        question = await storeQuestion({
          workspaceId: workspace.id,
          channelId: channel.id,
          askerId: user.id,
          slackMessageId: messageTs,
          slackThreadId: threadTs,
          messageText,
          askedAt: new Date(parseFloat(messageTs) * 1000),
        });
        logger.info(`Question stored with ID: ${question.id}`);
      } catch (error: any) {
        // Handle unique constraint violation (duplicate message)
        if (error.code === 'P2002') {
          logger.info('Question already stored (concurrent insert), skipping');
          return;
        }
        // Re-throw other errors
        throw error;
      }

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
 * Find a Slack user by their display name or real name
 * Uses fuzzy matching to handle variations
 * @param workspaceId - Workspace ID to search in
 * @param displayName - Name to search for (from Zendesk)
 * @returns Matching User or null if not found
 */
async function findSlackUserByName(
  workspaceId: string,
  displayName: string
): Promise<User | null> {
  // 1. Try exact match on display_name (case-insensitive)
  let user = await prisma.user.findFirst({
    where: {
      workspaceId,
      displayName: { equals: displayName, mode: 'insensitive' }
    }
  });

  if (user) return user;

  // 2. Try exact match on real_name (case-insensitive)
  user = await prisma.user.findFirst({
    where: {
      workspaceId,
      realName: { equals: displayName, mode: 'insensitive' }
    }
  });

  if (user) return user;

  // 3. Try partial match (in case Zendesk has "Drew Clark" but Slack has "Drew")
  // Split name and try first part
  const nameParts = displayName.split(' ');
  if (nameParts.length > 1) {
    const firstName = nameParts[0];
    user = await prisma.user.findFirst({
      where: {
        workspaceId,
        OR: [
          { displayName: { contains: firstName, mode: 'insensitive' } },
          { realName: { contains: firstName, mode: 'insensitive' } }
        ]
      }
    });
  }

  return user;
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

    // Try to extract the real asker's name from Zendesk message
    // Pattern: "Drew Clark in ticket #123:"
    const rawZendeskAskerName = extractAskerName(messageText);
    let actualAsker = zendeskBotUser;

    if (rawZendeskAskerName) {
      // Sanitize the name to prevent injection attacks
      const zendeskAskerName = sanitizeDisplayName(rawZendeskAskerName);

      if (!zendeskAskerName) {
        logger.warn(`Extracted asker name contains invalid characters: "${rawZendeskAskerName}"`);
      } else {
        logger.info(`Extracted asker name from Zendesk: "${zendeskAskerName}"`);
        const matchedUser = await findSlackUserByName(workspace.id, zendeskAskerName);

        if (matchedUser) {
          actualAsker = matchedUser;
          logger.info(`Matched Zendesk asker "${zendeskAskerName}" to Slack user ${matchedUser.displayName} (${matchedUser.slackUserId})`);
        } else {
          logger.info(`Could not match Zendesk asker "${zendeskAskerName}" to Slack user, using Zendesk bot`);
        }
      }
    }

    // Extract Zendesk ticket ID if present in message
    const ticketId = extractZendeskTicketId(messageText);

    // Store the side conversation as a question with race condition handling
    let question;
    try {
      question = await storeQuestion({
        workspaceId: workspace.id,
        channelId: channel.id,
        askerId: actualAsker.id,  // Use matched user or fallback to Zendesk bot
        slackMessageId: messageTs,
        slackThreadId: threadTs,
        messageText,
        askedAt: new Date(parseFloat(messageTs) * 1000),
        isSideConversation: true,
        zendeskTicketId: ticketId,
        sourceApp: 'zendesk',
      });
      logger.info(`Zendesk side conversation stored with ID: ${question.id}${ticketId ? ` (Ticket #${ticketId})` : ''}`);
    } catch (error: any) {
      // Handle unique constraint violation (duplicate message)
      if (error.code === 'P2002') {
        logger.info('Side conversation already stored (concurrent insert), skipping');
        return;
      }
      // Re-throw other errors
      throw error;
    }

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
