/**
 * Escalation Target Service
 * Manages flexible escalation targets (users, groups, channels) for workspaces
 */
import { prisma } from '../utils/db.js';

export type EscalationTargetType = 'user' | 'user_group' | 'channel';

export interface EscalationTargetData {
  id?: string;
  targetType: EscalationTargetType;
  targetId: string;
  targetName?: string;
  escalationLevel: number;
  priority: number;
  isActive: boolean;
  settings?: any;
}

export interface CreateEscalationTargetInput {
  targetType: EscalationTargetType;
  targetId: string;
  targetName?: string;
  escalationLevel: number;
  priority?: number;
  settings?: any;
}

/**
 * Get all escalation targets for a workspace
 */
export async function getEscalationTargets(
  workspaceId: string,
  escalationLevel?: number
): Promise<EscalationTargetData[]> {
  const targets = await prisma.escalationTarget.findMany({
    where: {
      workspaceId,
      ...(escalationLevel !== undefined && { escalationLevel }),
      isActive: true,
    },
    orderBy: [{ escalationLevel: 'asc' }, { priority: 'asc' }],
  });

  return targets.map((t) => ({
    id: t.id,
    targetType: t.targetType as EscalationTargetType,
    targetId: t.targetId,
    targetName: t.targetName || undefined,
    escalationLevel: t.escalationLevel,
    priority: t.priority,
    isActive: t.isActive,
    settings: t.settings || undefined,
  }));
}

/**
 * Get escalation targets for a specific level
 */
export async function getTargetsForLevel(
  workspaceId: string,
  escalationLevel: number
): Promise<EscalationTargetData[]> {
  return getEscalationTargets(workspaceId, escalationLevel);
}

/**
 * Add a new escalation target
 */
export async function addEscalationTarget(
  workspaceId: string,
  input: CreateEscalationTargetInput
): Promise<EscalationTargetData> {
  // Get the current max priority for this level
  const existingTargets = await prisma.escalationTarget.findMany({
    where: {
      workspaceId,
      escalationLevel: input.escalationLevel,
    },
    orderBy: { priority: 'desc' },
    take: 1,
  });

  const priority = input.priority ?? (existingTargets[0]?.priority ?? -1) + 1;

  const target = await prisma.escalationTarget.create({
    data: {
      workspaceId,
      targetType: input.targetType,
      targetId: input.targetId,
      targetName: input.targetName,
      escalationLevel: input.escalationLevel,
      priority,
      settings: input.settings,
    },
  });

  return {
    id: target.id,
    targetType: target.targetType as EscalationTargetType,
    targetId: target.targetId,
    targetName: target.targetName || undefined,
    escalationLevel: target.escalationLevel,
    priority: target.priority,
    isActive: target.isActive,
    settings: target.settings || undefined,
  };
}

/**
 * Update an escalation target
 */
export async function updateEscalationTarget(
  targetId: string,
  updates: Partial<EscalationTargetData>
): Promise<void> {
  await prisma.escalationTarget.update({
    where: { id: targetId },
    data: {
      ...(updates.targetName !== undefined && { targetName: updates.targetName }),
      ...(updates.priority !== undefined && { priority: updates.priority }),
      ...(updates.isActive !== undefined && { isActive: updates.isActive }),
      ...(updates.settings !== undefined && { settings: updates.settings }),
      updatedAt: new Date(),
    },
  });
}

/**
 * Remove an escalation target
 */
export async function removeEscalationTarget(targetId: string): Promise<void> {
  await prisma.escalationTarget.delete({
    where: { id: targetId },
  });
}

/**
 * Reorder escalation targets within a level
 */
export async function reorderTargets(
  workspaceId: string,
  escalationLevel: number,
  targetIds: string[]
): Promise<void> {
  // Update priority for each target based on array order
  await Promise.all(
    targetIds.map((id, index) =>
      prisma.escalationTarget.update({
        where: { id },
        data: { priority: index },
      })
    )
  );
}

/**
 * Migrate existing config to escalation targets
 * This helps with backward compatibility
 */
export async function migrateFromLegacyConfig(workspaceId: string): Promise<void> {
  const config = await prisma.workspaceConfig.findUnique({
    where: { workspaceId },
  });

  if (!config) return;

  const existingTargets = await prisma.escalationTarget.findMany({
    where: { workspaceId },
  });

  // Only migrate if no targets exist yet
  if (existingTargets.length > 0) return;

  const targetsToCreate: CreateEscalationTargetInput[] = [];

  // Migrate user group (first escalation)
  if (config.escalationUserGroup) {
    targetsToCreate.push({
      targetType: 'user_group',
      targetId: config.escalationUserGroup,
      escalationLevel: 1,
      priority: 0,
    });
  }

  // Migrate channel (second escalation)
  if (config.escalationChannelId) {
    targetsToCreate.push({
      targetType: 'channel',
      targetId: config.escalationChannelId,
      escalationLevel: 2,
      priority: 0,
    });
  }

  // Migrate final escalation user
  if (config.finalEscalationUserId) {
    targetsToCreate.push({
      targetType: 'user',
      targetId: config.finalEscalationUserId,
      escalationLevel: 3,
      priority: 0,
    });
  }

  // Create all targets
  for (const target of targetsToCreate) {
    await addEscalationTarget(workspaceId, target);
  }

  console.log(
    `✅ Migrated ${targetsToCreate.length} escalation targets for workspace ${workspaceId}`
  );
}

/**
 * Get formatted target description for display
 */
export function getTargetDescription(target: EscalationTargetData): string {
  switch (target.targetType) {
    case 'user':
      return `👤 User: ${target.targetName || target.targetId}`;
    case 'user_group':
      return `👥 Group: ${target.targetName || target.targetId}`;
    case 'channel':
      return `#️⃣ Channel: ${target.targetName || target.targetId}`;
    default:
      return target.targetId;
  }
}

/**
 * Validate target exists in Slack
 */
export async function validateTarget(
  client: any,
  targetType: EscalationTargetType,
  targetId: string
): Promise<{ valid: boolean; name?: string; error?: string }> {
  try {
    switch (targetType) {
      case 'user':
        const userInfo = await client.users.info({ user: targetId });
        if (userInfo.ok && userInfo.user) {
          return {
            valid: true,
            name: userInfo.user.real_name || userInfo.user.name,
          };
        }
        return { valid: false, error: 'User not found' };

      case 'user_group':
        const groupsInfo = await client.usergroups.list();
        const group = groupsInfo.usergroups?.find((g: any) => g.id === targetId);
        if (group) {
          return {
            valid: true,
            name: `@${group.handle}`,
          };
        }
        return { valid: false, error: 'User group not found' };

      case 'channel':
        const channelInfo = await client.conversations.info({ channel: targetId });
        if (channelInfo.ok && channelInfo.channel) {
          return {
            valid: true,
            name: `#${channelInfo.channel.name}`,
          };
        }
        return { valid: false, error: 'Channel not found' };

      default:
        return { valid: false, error: 'Invalid target type' };
    }
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Validation failed',
    };
  }
}
