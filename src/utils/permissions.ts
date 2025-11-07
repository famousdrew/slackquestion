/**
 * Permission utility functions
 */
import { WebClient } from '@slack/web-api';

/**
 * Check if a user is a workspace admin or owner
 */
export async function isWorkspaceAdmin(client: WebClient, userId: string): Promise<boolean> {
  try {
    const userInfo = await client.users.info({ user: userId });

    if (!userInfo.ok || !userInfo.user) {
      return false;
    }

    // Check if user is admin or owner
    return userInfo.user.is_admin === true || userInfo.user.is_owner === true;
  } catch (error) {
    console.error('Error checking user permissions:', error);
    return false;
  }
}

/**
 * Send permission denied message
 */
export async function sendPermissionDenied(
  client: WebClient,
  channelId: string,
  userId: string
): Promise<void> {
  await client.chat.postEphemeral({
    channel: channelId,
    user: userId,
    text: '🔒 *Permission Denied*\n\nOnly workspace admins can configure Question Router settings.\n\nPlease contact your workspace administrator to make configuration changes.',
  });
}
