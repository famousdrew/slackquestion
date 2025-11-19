/**
 * Data Cleanup Service
 * Automatically deletes old answered questions per privacy policy and data retention requirements
 * Complies with GDPR Article 5 (data minimization and storage limitation)
 */
import { prisma } from '../utils/db.js';
import { logger } from '../utils/logger.js';
import { QUESTION_STATUS } from '../utils/constants.js';
import { cleanupExpiredStates } from '../oauth/stateStore.js';

// Data retention configuration from environment variables
const ANSWERED_QUESTIONS_RETENTION_DAYS = parseInt(
  process.env.ANSWERED_QUESTIONS_RETENTION_DAYS || '90',
  10
);

const DISMISSED_QUESTIONS_RETENTION_DAYS = parseInt(
  process.env.DISMISSED_QUESTIONS_RETENTION_DAYS || '30',
  10
);

const UNANSWERED_QUESTIONS_RETENTION_DAYS = parseInt(
  process.env.UNANSWERED_QUESTIONS_RETENTION_DAYS || '365',
  10
);

// Run cleanup daily at 2 AM (in milliseconds)
const CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours

let cleanupIntervalId: NodeJS.Timeout | null = null;

/**
 * Delete old answered questions based on retention policy
 * Questions are permanently deleted, not soft-deleted, to comply with data minimization
 */
export async function cleanupOldAnsweredQuestions(): Promise<number> {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - ANSWERED_QUESTIONS_RETENTION_DAYS);

    logger.info('Starting cleanup of old answered questions', {
      retentionDays: ANSWERED_QUESTIONS_RETENTION_DAYS,
      cutoffDate: cutoffDate.toISOString(),
    });

    const result = await prisma.question.deleteMany({
      where: {
        status: QUESTION_STATUS.ANSWERED,
        answeredAt: {
          lt: cutoffDate,
        },
      },
    });

    if (result.count > 0) {
      logger.info('Cleaned up old answered questions', {
        deletedCount: result.count,
        retentionDays: ANSWERED_QUESTIONS_RETENTION_DAYS,
      });
    } else {
      logger.debug('No old answered questions to clean up');
    }

    return result.count;
  } catch (error) {
    logger.error('Error during answered questions cleanup', error as Error);
    throw error;
  }
}

/**
 * Delete old dismissed questions (false positives)
 * These have shorter retention since they're not useful for analytics
 */
export async function cleanupOldDismissedQuestions(): Promise<number> {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - DISMISSED_QUESTIONS_RETENTION_DAYS);

    logger.info('Starting cleanup of old dismissed questions', {
      retentionDays: DISMISSED_QUESTIONS_RETENTION_DAYS,
      cutoffDate: cutoffDate.toISOString(),
    });

    const result = await prisma.question.deleteMany({
      where: {
        status: QUESTION_STATUS.DISMISSED,
        updatedAt: {
          lt: cutoffDate,
        },
      },
    });

    if (result.count > 0) {
      logger.info('Cleaned up old dismissed questions', {
        deletedCount: result.count,
        retentionDays: DISMISSED_QUESTIONS_RETENTION_DAYS,
      });
    } else {
      logger.debug('No old dismissed questions to clean up');
    }

    return result.count;
  } catch (error) {
    logger.error('Error during dismissed questions cleanup', error as Error);
    throw error;
  }
}

/**
 * Archive very old unanswered questions
 * After 1 year, unanswered questions are no longer relevant
 */
export async function cleanupOldUnansweredQuestions(): Promise<number> {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - UNANSWERED_QUESTIONS_RETENTION_DAYS);

    logger.info('Starting cleanup of old unanswered questions', {
      retentionDays: UNANSWERED_QUESTIONS_RETENTION_DAYS,
      cutoffDate: cutoffDate.toISOString(),
    });

    const result = await prisma.question.deleteMany({
      where: {
        status: QUESTION_STATUS.UNANSWERED,
        askedAt: {
          lt: cutoffDate,
        },
      },
    });

    if (result.count > 0) {
      logger.info('Cleaned up old unanswered questions', {
        deletedCount: result.count,
        retentionDays: UNANSWERED_QUESTIONS_RETENTION_DAYS,
      });
    } else {
      logger.debug('No old unanswered questions to clean up');
    }

    return result.count;
  } catch (error) {
    logger.error('Error during unanswered questions cleanup', error as Error);
    throw error;
  }
}

/**
 * Run all cleanup tasks
 * This is the main function called by the scheduled job
 */
export async function runDataCleanup(): Promise<{
  answeredDeleted: number;
  dismissedDeleted: number;
  unansweredDeleted: number;
  oauthStatesDeleted: number;
  totalDeleted: number;
}> {
  logger.info('Starting scheduled data cleanup job');

  const startTime = Date.now();

  try {
    const answeredDeleted = await cleanupOldAnsweredQuestions();
    const dismissedDeleted = await cleanupOldDismissedQuestions();
    const unansweredDeleted = await cleanupOldUnansweredQuestions();
    const oauthStatesDeleted = await cleanupExpiredStates();

    const totalDeleted = answeredDeleted + dismissedDeleted + unansweredDeleted + oauthStatesDeleted;
    const duration = Date.now() - startTime;

    logger.info('Data cleanup job completed', {
      answeredDeleted,
      dismissedDeleted,
      unansweredDeleted,
      oauthStatesDeleted,
      totalDeleted,
      durationMs: duration,
    });

    return {
      answeredDeleted,
      dismissedDeleted,
      unansweredDeleted,
      oauthStatesDeleted,
      totalDeleted,
    };
  } catch (error) {
    logger.error('Data cleanup job failed', error as Error);
    throw error;
  }
}

/**
 * Start the scheduled data cleanup job
 * Runs daily at approximately 2 AM (relative to when the app started)
 */
export function startDataCleanupSchedule(): void {
  if (cleanupIntervalId) {
    logger.warn('Data cleanup schedule already running');
    return;
  }

  // Run immediately on startup (optional - comment out if you don't want this)
  // runDataCleanup().catch(error => {
  //   logger.error('Initial data cleanup failed', error as Error);
  // });

  // Schedule recurring cleanup
  cleanupIntervalId = setInterval(async () => {
    try {
      await runDataCleanup();
    } catch (error) {
      logger.error('Scheduled data cleanup failed', error as Error);
      // Don't stop the interval - try again next time
    }
  }, CLEANUP_INTERVAL_MS);

  logger.info('Data cleanup schedule started', {
    intervalHours: CLEANUP_INTERVAL_MS / (1000 * 60 * 60),
    retentionPolicies: {
      answeredQuestions: `${ANSWERED_QUESTIONS_RETENTION_DAYS} days`,
      dismissedQuestions: `${DISMISSED_QUESTIONS_RETENTION_DAYS} days`,
      unansweredQuestions: `${UNANSWERED_QUESTIONS_RETENTION_DAYS} days`,
    },
  });
}

/**
 * Stop the scheduled data cleanup job
 * Called during graceful shutdown
 */
export function stopDataCleanupSchedule(): void {
  if (cleanupIntervalId) {
    clearInterval(cleanupIntervalId);
    cleanupIntervalId = null;
    logger.info('Data cleanup schedule stopped');
  }
}

/**
 * Get current data retention configuration
 * Useful for displaying in privacy policy or admin dashboard
 */
export function getRetentionConfig() {
  return {
    answeredQuestionsRetentionDays: ANSWERED_QUESTIONS_RETENTION_DAYS,
    dismissedQuestionsRetentionDays: DISMISSED_QUESTIONS_RETENTION_DAYS,
    unansweredQuestionsRetentionDays: UNANSWERED_QUESTIONS_RETENTION_DAYS,
  };
}
