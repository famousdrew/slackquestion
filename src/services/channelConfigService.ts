/**
 * Channel Configuration Service
 * Manages per-channel settings that override workspace defaults
 */
import { prisma } from '../utils/db.js';
import { AnswerDetectionMode } from './configService.js';

export interface ChannelSettings {
  // Override workspace escalation timings
  firstEscalationMinutes?: number;
  secondEscalationMinutes?: number;
  finalEscalationMinutes?: number;

  // Override answer detection mode
  answerDetectionMode?: AnswerDetectionMode;

  // Enable/disable escalation for this channel
  escalationEnabled?: boolean;

  // Override escalation targets for this channel
  useCustomTargets?: boolean;
  customTargetIds?: string[]; // IDs of EscalationTarget records specific to this channel
}

export interface ChannelConfigData {
  channelId: string;
  channelName: string | null;
  isMonitored: boolean;
  settings: ChannelSettings;
}

/**
 * Get channel configuration with settings
 */
export async function getChannelConfig(channelId: string): Promise<ChannelConfigData | null> {
  const channel = await prisma.channel.findUnique({
    where: { id: channelId },
  });

  if (!channel) return null;

  return {
    channelId: channel.id,
    channelName: channel.channelName,
    isMonitored: channel.isMonitored,
    settings: (channel.settings as ChannelSettings) || {},
  };
}

/**
 * Get channel configuration by Slack channel ID
 */
export async function getChannelConfigBySlackId(
  workspaceId: string,
  slackChannelId: string
): Promise<ChannelConfigData | null> {
  const channel = await prisma.channel.findUnique({
    where: {
      workspaceId_slackChannelId: {
        workspaceId,
        slackChannelId,
      },
    },
  });

  if (!channel) return null;

  return {
    channelId: channel.id,
    channelName: channel.channelName,
    isMonitored: channel.isMonitored,
    settings: (channel.settings as ChannelSettings) || {},
  };
}

/**
 * Update channel settings
 */
export async function updateChannelSettings(
  channelId: string,
  settings: Partial<ChannelSettings>
): Promise<void> {
  const currentChannel = await prisma.channel.findUnique({
    where: { id: channelId },
  });

  if (!currentChannel) {
    throw new Error('Channel not found');
  }

  const currentSettings = (currentChannel.settings as ChannelSettings) || {};
  const updatedSettings = { ...currentSettings, ...settings };

  await prisma.channel.update({
    where: { id: channelId },
    data: {
      settings: updatedSettings,
    },
  });
}

/**
 * Clear channel-specific settings (revert to workspace defaults)
 */
export async function clearChannelSettings(channelId: string): Promise<void> {
  await prisma.channel.update({
    where: { id: channelId },
    data: {
      settings: {},
    },
  });
}

/**
 * Get all channels with custom settings for a workspace
 */
export async function getChannelsWithCustomSettings(
  workspaceId: string
): Promise<ChannelConfigData[]> {
  const channels = await prisma.channel.findMany({
    where: {
      workspaceId,
      settings: {
        not: {},
      },
    },
    orderBy: {
      channelName: 'asc',
    },
  });

  return channels.map((channel) => ({
    channelId: channel.id,
    channelName: channel.channelName,
    isMonitored: channel.isMonitored,
    settings: (channel.settings as ChannelSettings) || {},
  }));
}

/**
 * Check if a channel has any custom settings
 */
export function hasCustomSettings(settings: ChannelSettings): boolean {
  return Object.keys(settings).length > 0;
}

/**
 * Get effective configuration for a channel
 * Merges workspace defaults with channel-specific overrides
 */
export async function getEffectiveChannelConfig(
  channelId: string,
  workspaceConfig: {
    firstEscalationMinutes: number;
    secondEscalationMinutes: number;
    finalEscalationMinutes: number;
    answerDetectionMode: AnswerDetectionMode;
  }
): Promise<{
  firstEscalationMinutes: number;
  secondEscalationMinutes: number;
  finalEscalationMinutes: number;
  answerDetectionMode: AnswerDetectionMode;
  escalationEnabled: boolean;
}> {
  const channelConfig = await getChannelConfig(channelId);
  const settings = channelConfig?.settings || {};

  return {
    firstEscalationMinutes: settings.firstEscalationMinutes ?? workspaceConfig.firstEscalationMinutes,
    secondEscalationMinutes: settings.secondEscalationMinutes ?? workspaceConfig.secondEscalationMinutes,
    finalEscalationMinutes: settings.finalEscalationMinutes ?? workspaceConfig.finalEscalationMinutes,
    answerDetectionMode: settings.answerDetectionMode ?? workspaceConfig.answerDetectionMode,
    escalationEnabled: settings.escalationEnabled ?? true,
  };
}
