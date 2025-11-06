/**
 * Configuration Service
 * Manages workspace configuration settings
 */
import { prisma } from '../utils/db.js';

export type AnswerDetectionMode = 'emoji_only' | 'thread_auto' | 'hybrid';

export interface WorkspaceConfigData {
  answerDetectionMode: AnswerDetectionMode;
  firstEscalationMinutes: number;
  secondEscalationMinutes: number;
}

/**
 * Get or create workspace configuration
 */
export async function getWorkspaceConfig(workspaceId: string): Promise<WorkspaceConfigData> {
  let config = await prisma.workspaceConfig.findUnique({
    where: { workspaceId },
  });

  // Create default config if it doesn't exist
  if (!config) {
    config = await prisma.workspaceConfig.create({
      data: {
        workspaceId,
        answerDetectionMode: 'emoji_only',
        firstEscalationMinutes: parseInt(process.env.FIRST_ESCALATION_MINUTES || '2'),
        secondEscalationMinutes: parseInt(process.env.SECOND_ESCALATION_MINUTES || '4'),
      },
    });
  }

  return {
    answerDetectionMode: (config.answerDetectionMode || 'emoji_only') as AnswerDetectionMode,
    firstEscalationMinutes: config.firstEscalationMinutes,
    secondEscalationMinutes: config.secondEscalationMinutes,
  };
}

/**
 * Update answer detection mode
 */
export async function setAnswerDetectionMode(
  workspaceId: string,
  mode: AnswerDetectionMode
): Promise<void> {
  await prisma.workspaceConfig.upsert({
    where: { workspaceId },
    update: { answerDetectionMode: mode },
    create: {
      workspaceId,
      answerDetectionMode: mode,
      firstEscalationMinutes: parseInt(process.env.FIRST_ESCALATION_MINUTES || '2'),
      secondEscalationMinutes: parseInt(process.env.SECOND_ESCALATION_MINUTES || '4'),
    },
  });
}

/**
 * Get answer detection mode description
 */
export function getAnswerDetectionModeDescription(mode: AnswerDetectionMode): string {
  switch (mode) {
    case 'emoji_only':
      return 'Questions must be marked with ✅ emoji to count as answered';
    case 'thread_auto':
      return 'Any reply in the thread automatically marks question as answered';
    case 'hybrid':
      return 'Replies stop escalation, but ✅ emoji required for stats';
    default:
      return 'Unknown mode';
  }
}
