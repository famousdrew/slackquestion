/**
 * Authorized Slack Client Factory
 * Creates WebClient instances with proper OAuth tokens for multi-workspace support
 */
import { WebClient } from '@slack/web-api';
import { prisma } from './db.js';
import { logger } from './logger.js';

/**
 * Get an authorized WebClient for a specific workspace
 * Fetches the bot token from the installation store
 */
export async function getAuthorizedClient(workspaceSlackTeamId: string): Promise<WebClient> {
  try {
    // Fetch installation from database
    const installation = await prisma.slackInstallation.findUnique({
      where: { teamId: workspaceSlackTeamId },
    });

    if (!installation) {
      throw new Error(`No installation found for team ${workspaceSlackTeamId}`);
    }

    if (!installation.botToken) {
      throw new Error(`No bot token found for team ${workspaceSlackTeamId}`);
    }

    // Create authorized WebClient with the bot token
    const client = new WebClient(installation.botToken);

    logger.debug('Created authorized client for workspace', {
      teamId: workspaceSlackTeamId,
    });

    return client;
  } catch (error) {
    logger.error('Failed to create authorized client', {
      error: error instanceof Error ? error.message : String(error),
      teamId: workspaceSlackTeamId,
    });
    throw error;
  }
}

/**
 * Get an authorized WebClient for a workspace by internal UUID
 * Looks up the Slack team ID first, then fetches the token
 */
export async function getAuthorizedClientByWorkspaceId(workspaceId: string): Promise<WebClient> {
  try {
    // Get workspace to find Slack team ID
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
    });

    if (!workspace) {
      throw new Error(`Workspace ${workspaceId} not found`);
    }

    return getAuthorizedClient(workspace.slackTeamId);
  } catch (error) {
    logger.error('Failed to create authorized client by workspace ID', {
      error: error instanceof Error ? error.message : String(error),
      workspaceId,
    });
    throw error;
  }
}
