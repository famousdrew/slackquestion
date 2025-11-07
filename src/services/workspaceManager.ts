/**
 * Workspace Manager Service
 * Handles workspace, channel, and user initialization
 */

import { prisma } from '../utils/prisma.js';
import { logger } from '../utils/logger.js';

export async function ensureWorkspace(slackTeamId: string, teamName?: string) {
  let workspace = await prisma.workspace.findUnique({
    where: { slackTeamId },
  });

  if (!workspace) {
    workspace = await prisma.workspace.create({
      data: {
        slackTeamId,
        teamName,
      },
    });
    logger.info('Workspace created:', { slackTeamId, teamName });
  }

  return workspace;
}

export async function ensureChannel(
  workspaceId: string,
  slackChannelId: string,
  channelName?: string
) {
  let channel = await prisma.channel.findUnique({
    where: {
      workspaceId_slackChannelId: {
        workspaceId,
        slackChannelId,
      },
    },
  });

  if (!channel) {
    channel = await prisma.channel.create({
      data: {
        workspaceId,
        slackChannelId,
        channelName,
        isMonitored: true,
      },
    });
    logger.info('Channel created:', { slackChannelId, channelName });
  }

  return channel;
}

export async function ensureUser(
  workspaceId: string,
  slackUserId: string,
  userInfo?: {
    displayName?: string;
    realName?: string;
    email?: string;
  }
) {
  let user = await prisma.user.findUnique({
    where: {
      workspaceId_slackUserId: {
        workspaceId,
        slackUserId,
      },
    },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        workspaceId,
        slackUserId,
        displayName: userInfo?.displayName,
        realName: userInfo?.realName,
        email: userInfo?.email,
        isActive: true,
        lastSeenAt: new Date(),
      },
    });
    logger.info('User created:', { slackUserId, displayName: userInfo?.displayName });
  } else {
    // Update last seen
    user = await prisma.user.update({
      where: { id: user.id },
      data: { lastSeenAt: new Date() },
    });
  }

  return user;
}

export async function isChannelMonitored(
  workspaceId: string,
  slackChannelId: string
): Promise<boolean> {
  const channel = await prisma.channel.findUnique({
    where: {
      workspaceId_slackChannelId: {
        workspaceId,
        slackChannelId,
      },
    },
  });

  return channel?.isMonitored ?? false;
}
