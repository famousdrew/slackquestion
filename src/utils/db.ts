/**
 * Database client and utilities
 */
import { PrismaClient } from '@prisma/client';

// Singleton pattern for Prisma client
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

/**
 * Ensure workspace exists in database
 */
export async function ensureWorkspace(slackTeamId: string, teamName?: string) {
  return await prisma.workspace.upsert({
    where: { slackTeamId },
    update: { teamName, updatedAt: new Date() },
    create: { slackTeamId, teamName },
  });
}

/**
 * Ensure user exists in database
 */
export async function ensureUser(
  workspaceId: string,
  slackUserId: string,
  userData?: {
    displayName?: string;
    realName?: string;
  }
) {
  return await prisma.user.upsert({
    where: {
      workspaceId_slackUserId: {
        workspaceId,
        slackUserId,
      },
    },
    update: {
      ...userData,
      lastSeenAt: new Date(),
    },
    create: {
      workspaceId,
      slackUserId,
      ...userData,
      lastSeenAt: new Date(),
    },
  });
}

/**
 * Ensure channel exists in database
 */
export async function ensureChannel(
  workspaceId: string,
  slackChannelId: string,
  channelName?: string
) {
  return await prisma.channel.upsert({
    where: {
      workspaceId_slackChannelId: {
        workspaceId,
        slackChannelId,
      },
    },
    update: { channelName },
    create: {
      workspaceId,
      slackChannelId,
      channelName,
      isMonitored: true,
    },
  });
}

/**
 * Get workspace configuration
 */
export async function getWorkspaceConfig(workspaceId: string) {
  return await prisma.workspaceConfig.upsert({
    where: { workspaceId },
    update: {},
    create: { workspaceId },
  });
}

/**
 * Gracefully disconnect from database
 */
export async function disconnectDb() {
  await prisma.$disconnect();
}
