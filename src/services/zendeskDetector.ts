/**
 * Zendesk Bot Detection Service
 * Identifies messages from Zendesk side conversations
 */

import type { App } from '@slack/bolt';

// Cache for Zendesk bot IDs per workspace
const zendeskBotCache = new Map<string, string>();

/**
 * Check if a message is from the Zendesk bot
 * @param message - Slack message object
 * @param client - Slack client for API calls
 * @returns true if message is from Zendesk bot
 */
export async function isZendeskMessage(message: any, client: any): Promise<boolean> {
  // Must be a bot message
  if (!message.bot_id) {
    return false;
  }

  // Check environment variable for explicit bot ID
  const envBotId = process.env.ZENDESK_BOT_USER_ID;
  if (envBotId && message.bot_id === envBotId) {
    return true;
  }

  // Check bot profile name
  if (message.bot_profile?.name) {
    const botName = message.bot_profile.name.toLowerCase();
    // Match "Zendesk" or variations
    if (botName === 'zendesk' || botName.includes('zendesk')) {
      return true;
    }
  }

  // Fallback: Fetch bot info and check name
  try {
    const botInfo = await client.bots.info({ bot: message.bot_id });
    if (botInfo.bot?.name) {
      const botName = botInfo.bot.name.toLowerCase();
      if (botName === 'zendesk' || botName.includes('zendesk')) {
        // Cache for future use
        if (message.team) {
          zendeskBotCache.set(message.team, message.bot_id);
        }
        return true;
      }
    }
  } catch (error) {
    // If we can't fetch bot info, log but don't fail
    console.warn('Could not fetch bot info:', error);
  }

  return false;
}

/**
 * Extract Zendesk ticket ID from message text
 * Looks for patterns like "#12345" or "ticket 12345"
 * @param text - Message text
 * @returns Ticket ID if found, null otherwise
 */
export function extractZendeskTicketId(text: string): string | null {
  // Pattern 1: #12345
  const hashPattern = /#(\d{4,})/;
  const hashMatch = text.match(hashPattern);
  if (hashMatch) {
    return hashMatch[1];
  }

  // Pattern 2: "ticket 12345" or "Ticket: 12345"
  const ticketPattern = /ticket[:\s]+(\d{4,})/i;
  const ticketMatch = text.match(ticketPattern);
  if (ticketMatch) {
    return ticketMatch[1];
  }

  // Pattern 3: Zendesk URL: https://company.zendesk.com/agent/tickets/12345
  const urlPattern = /zendesk\.com\/agent\/tickets\/(\d+)/;
  const urlMatch = text.match(urlPattern);
  if (urlMatch) {
    return urlMatch[1];
  }

  return null;
}

/**
 * Get the Zendesk bot's user ID for a workspace
 * Used as the "asker" for side conversation questions
 * @param teamId - Workspace team ID
 * @param client - Slack client
 * @returns Zendesk bot user ID or null
 */
export async function getZendeskBotUserId(teamId: string, client: any): Promise<string | null> {
  // Check cache first
  if (zendeskBotCache.has(teamId)) {
    return zendeskBotCache.get(teamId) || null;
  }

  // Check environment variable
  const envBotId = process.env.ZENDESK_BOT_USER_ID;
  if (envBotId) {
    zendeskBotCache.set(teamId, envBotId);
    return envBotId;
  }

  // Search for Zendesk bot in workspace users
  try {
    const result = await client.users.list({});
    const members = result.members || [];

    for (const member of members) {
      if (member.is_bot && member.profile?.real_name) {
        const botName = member.profile.real_name.toLowerCase();
        if (botName === 'zendesk' || botName.includes('zendesk')) {
          zendeskBotCache.set(teamId, member.id);
          return member.id;
        }
      }
    }
  } catch (error) {
    console.error('Error searching for Zendesk bot user:', error);
  }

  return null;
}
