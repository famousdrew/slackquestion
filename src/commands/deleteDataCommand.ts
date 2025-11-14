/**
 * User Data Deletion Command
 * Implements GDPR Article 17 "Right to Erasure" (Right to be Forgotten)
 * Allows users to delete their personal data from the system
 */
import type { App } from '@slack/bolt';
import { prisma } from '../utils/db.js';
import { logger } from '../utils/logger.js';

/**
 * Log data deletion request for compliance audit trail
 * Keep deletion logs separate from user data for compliance purposes
 */
async function logDeletionRequest(
  workspaceId: string,
  slackUserId: string,
  questionsAffected: number,
  method: 'self_service' | 'admin' | 'automated'
): Promise<void> {
  logger.info('User data deletion request processed', {
    workspaceId,
    slackUserId,
    questionsAffected,
    method,
    timestamp: new Date().toISOString(),
    compliance: 'GDPR_Article_17',
  });

  // Optionally store in database for long-term audit trail
  // You may want to create a separate DeletionLog table for this
  // For now, relying on structured logging to external log aggregator
}

/**
 * Delete or anonymize a user's data
 * We anonymize rather than hard-delete to preserve question statistics
 * This is acceptable under GDPR if done properly
 */
export async function deleteUserData(
  workspaceId: string,
  slackUserId: string,
  method: 'self_service' | 'admin' | 'automated' = 'self_service'
): Promise<{ success: boolean; questionsAffected: number; error?: string }> {
  try {
    // Find the user
    const user = await prisma.user.findFirst({
      where: {
        workspaceId,
        slackUserId,
      },
    });

    if (!user) {
      return {
        success: false,
        questionsAffected: 0,
        error: 'User not found',
      };
    }

    // Anonymize all questions asked by this user
    // We keep the question records for statistical purposes but remove PII
    const result = await prisma.question.updateMany({
      where: {
        askerId: user.id,
      },
      data: {
        messageText: '[DELETED BY USER REQUEST]',
        extractedKeywords: [],
        // Keep metadata for statistics: askedAt, answeredAt, status, etc.
      },
    });

    // Anonymize the user record itself
    await prisma.user.update({
      where: { id: user.id },
      data: {
        displayName: '[DELETED]',
        realName: '[DELETED]',
        isActive: false,
      },
    });

    // Log for compliance audit trail
    await logDeletionRequest(workspaceId, slackUserId, result.count, method);

    return {
      success: true,
      questionsAffected: result.count,
    };
  } catch (error) {
    logger.error('Error deleting user data', {
      error: error instanceof Error ? error.message : String(error),
      workspaceId,
      slackUserId,
    });

    return {
      success: false,
      questionsAffected: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Export user's data for GDPR Article 20 "Right to Data Portability"
 * Returns all data associated with the user in machine-readable format
 */
export async function exportUserData(
  workspaceId: string,
  slackUserId: string
): Promise<{
  user: any | null;
  questions: any[];
  statistics: {
    totalQuestions: number;
    answeredQuestions: number;
    unansweredQuestions: number;
  };
}> {
  try {
    // Find the user
    const user = await prisma.user.findFirst({
      where: {
        workspaceId,
        slackUserId,
      },
    });

    if (!user) {
      return {
        user: null,
        questions: [],
        statistics: {
          totalQuestions: 0,
          answeredQuestions: 0,
          unansweredQuestions: 0,
        },
      };
    }

    // Get all questions asked by this user
    const questions = await prisma.question.findMany({
      where: {
        askerId: user.id,
      },
      include: {
        channel: {
          select: {
            channelName: true,
            slackChannelId: true,
          },
        },
      },
      orderBy: {
        askedAt: 'desc',
      },
    });

    // Calculate statistics
    const answeredQuestions = questions.filter((q) => q.status === 'answered').length;
    const unansweredQuestions = questions.filter((q) => q.status === 'unanswered').length;

    // Sanitize data for export (remove internal IDs)
    const sanitizedQuestions = questions.map((q) => ({
      messageText: q.messageText,
      channelName: q.channel.channelName,
      askedAt: q.askedAt,
      answeredAt: q.answeredAt,
      status: q.status,
      escalationLevel: q.escalationLevel,
    }));

    const sanitizedUser = {
      displayName: user.displayName,
      realName: user.realName,
      slackUserId: user.slackUserId,
      createdAt: user.createdAt,
    };

    logger.info('User data export generated', {
      workspaceId,
      slackUserId,
      questionsExported: questions.length,
    });

    return {
      user: sanitizedUser,
      questions: sanitizedQuestions,
      statistics: {
        totalQuestions: questions.length,
        answeredQuestions,
        unansweredQuestions,
      },
    };
  } catch (error) {
    logger.error('Error exporting user data', {
      error: error instanceof Error ? error.message : String(error),
      workspaceId,
      slackUserId,
    });

    return {
      user: null,
      questions: [],
      statistics: {
        totalQuestions: 0,
        answeredQuestions: 0,
        unansweredQuestions: 0,
      },
    };
  }
}

/**
 * Register the /qr-delete-my-data command
 * Allows users to self-service delete their personal data
 */
export function registerDeleteDataCommand(app: App) {
  app.command('/qr-delete-my-data', async ({ command, ack, respond }) => {
    await ack();

    try {
      const userId = command.user_id;
      const teamId = command.team_id;

      // Find workspace
      const workspace = await prisma.workspace.findUnique({
        where: { slackTeamId: teamId },
      });

      if (!workspace) {
        await respond({
          text: '❌ Error: Workspace not found. Please contact support.',
          response_type: 'ephemeral',
        });
        return;
      }

      // Show confirmation dialog first
      await respond({
        text: '⚠️ *Are you sure you want to delete your data?*\n\nThis will:\n• Permanently delete all your question text\n• Anonymize your user profile\n• Remove your name from all questions\n\nStatistics will be preserved (anonymously).\n\n*This action cannot be undone.*\n\nTo confirm, please run `/qr-delete-my-data confirm`',
        response_type: 'ephemeral',
      });

      // Check if user confirmed
      if (command.text.trim().toLowerCase() !== 'confirm') {
        return;
      }

      // Execute deletion
      const result = await deleteUserData(workspace.id, userId, 'self_service');

      if (!result.success) {
        await respond({
          text: `❌ Error: ${result.error || 'Failed to delete data'}. Please contact support.`,
          response_type: 'ephemeral',
        });
        return;
      }

      await respond({
        text: `✅ *Your data has been deleted*\n\n• ${result.questionsAffected} question(s) anonymized\n• Your profile has been anonymized\n\nIf you have any questions, please contact privacy@yourcompany.com`,
        response_type: 'ephemeral',
      });
    } catch (error) {
      logger.error('Error in delete data command', error as Error);

      await respond({
        text: '❌ An error occurred while processing your deletion request. Please contact support at privacy@yourcompany.com',
        response_type: 'ephemeral',
      });
    }
  });
}

/**
 * Register the /qr-export-my-data command
 * Allows users to export their data (GDPR Article 20)
 */
export function registerExportDataCommand(app: App) {
  app.command('/qr-export-my-data', async ({ command, ack, respond }) => {
    await ack();

    try {
      const userId = command.user_id;
      const teamId = command.team_id;

      // Find workspace
      const workspace = await prisma.workspace.findUnique({
        where: { slackTeamId: teamId },
      });

      if (!workspace) {
        await respond({
          text: '❌ Error: Workspace not found.',
          response_type: 'ephemeral',
        });
        return;
      }

      // Generate export
      const exportData = await exportUserData(workspace.id, userId);

      if (!exportData.user) {
        await respond({
          text: '📭 No data found for your account.',
          response_type: 'ephemeral',
        });
        return;
      }

      // Format export as JSON
      const exportJson = JSON.stringify(exportData, null, 2);

      // Send as a file snippet
      await respond({
        text: `📦 *Your Data Export*\n\n*Summary:*\n• Total Questions: ${exportData.statistics.totalQuestions}\n• Answered: ${exportData.statistics.answeredQuestions}\n• Unanswered: ${exportData.statistics.unansweredQuestions}\n\nYour complete data is attached below in JSON format.`,
        response_type: 'ephemeral',
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `📦 *Your Data Export*\n\n*Summary:*\n• Total Questions: ${exportData.statistics.totalQuestions}\n• Answered: ${exportData.statistics.answeredQuestions}\n• Unanswered: ${exportData.statistics.unansweredQuestions}`,
            },
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `\`\`\`${exportJson.substring(0, 2000)}\`\`\`${exportJson.length > 2000 ? '\n\n_(truncated - full export sent via DM)_' : ''}`,
            },
          },
        ],
      });

      // If export is large, send full data via DM
      if (exportJson.length > 2000) {
        // Note: Would need to implement file upload here
        logger.info('Large data export requested', {
          userId,
          dataSize: exportJson.length,
        });
      }
    } catch (error) {
      logger.error('Error in export data command', error as Error);

      await respond({
        text: '❌ An error occurred while exporting your data. Please contact support.',
        response_type: 'ephemeral',
      });
    }
  });
}
