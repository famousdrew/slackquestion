/**
 * Reaction Event Handler
 * Handles reactions to detect answered questions and dismissals
 */
import { App } from '@slack/bolt';
import { findQuestionByMessageId, markQuestionAnswered } from '../services/questionStorage.js';
import { ensureWorkspace, ensureUser, prisma } from '../utils/db.js';

export function registerReactionHandler(app: App) {
  app.event('reaction_added', async ({ event, client, logger }) => {
    try {
      const { reaction, user, item } = event;

      // Only handle message reactions
      if (item.type !== 'message') {
        return;
      }

      const channelId = item.channel;
      const messageTs = item.ts;

      // Get team info
      const teamInfo = await client.team.info();
      const teamId = teamInfo.team?.id;

      if (!teamId) {
        return;
      }

      const workspace = await ensureWorkspace(teamId);

      // Find the question
      const question = await findQuestionByMessageId(workspace.id, messageTs);

      if (!question) {
        // Not a tracked question
        return;
      }

      // Already answered
      if (question.status === 'answered') {
        return;
      }

      // Handle different reactions
      switch (reaction) {
        case 'white_check_mark':
        case 'heavy_check_mark':
        case 'ballot_box_with_check':
          // Mark as answered - check if reactor is the question asker
          if (user === question.asker.slackUserId) {
            const userInfo = await client.users.info({ user });
            const userData = {
              displayName: userInfo.user?.profile?.display_name || userInfo.user?.name,
              realName: userInfo.user?.profile?.real_name,
              email: userInfo.user?.profile?.email,
            };
            const answerUser = await ensureUser(workspace.id, user, userData);

            await markQuestionAnswered(question.id, answerUser.id);
            logger.info(`Question ${question.id} marked as answered by asker's reaction`);
          }
          break;

        case 'no_entry':
        case 'no_entry_sign':
          // Dismiss as not a real question
          await prisma.question.update({
            where: { id: question.id },
            data: { status: 'dismissed' },
          });
          logger.info(`Question ${question.id} dismissed`);
          break;

        case 'no_bell':
          // Snooze for 1 hour
          await prisma.question.update({
            where: { id: question.id },
            data: {
              status: 'snoozed',
              lastEscalatedAt: new Date(),
            },
          });
          logger.info(`Question ${question.id} snoozed for 1 hour`);
          break;

        case 'eyes':
          // Someone is working on it - snooze briefly
          await prisma.question.update({
            where: { id: question.id },
            data: {
              lastEscalatedAt: new Date(),
            },
          });
          logger.info(`Question ${question.id} acknowledged - escalation delayed`);
          break;
      }

    } catch (error) {
      logger.error('Error handling reaction:', error);
    }
  });
}
