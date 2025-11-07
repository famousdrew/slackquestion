/**
 * Slack utility helper functions
 */
import type { TeamInfoResponse } from '@slack/web-api';

/**
 * Generate a Slack thread link
 * @param teamDomain - Workspace domain (e.g., 'myworkspace')
 * @param channelId - Channel ID
 * @param messageTs - Message timestamp
 * @returns Formatted Slack thread URL
 */
export function buildThreadLink(teamDomain: string, channelId: string, messageTs: string): string {
  const formattedTs = messageTs.replace('.', '');
  return `https://${teamDomain}.slack.com/archives/${channelId}/p${formattedTs}`;
}

/**
 * Get team domain from workspace info
 * @param teamInfo - Slack team info response
 * @returns Team domain or fallback
 */
export function getTeamDomain(teamInfo: TeamInfoResponse): string {
  return teamInfo.team?.domain || 'your-workspace';
}
