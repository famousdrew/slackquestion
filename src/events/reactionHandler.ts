/**
 * Reaction Event Handler
 * Handles reactions to detect answered questions and dismissals
 */
import boltPkg from '@slack/bolt';
import type { App } from '@slack/bolt';
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

      // Find the question - check if this message is a tracked question
      let question = await findQuestionByMessageId(workspace.id, messageTs);

      // If not found, check if this is a reply in a question thread
      let isThreadReply = false;
      let replyMessageTs: string | null = null;

      if (!question) {
        // Try to fetch the message to see if it's part of a thread
        try {
          const messageResult = await client.conversations.history({
            channel: channelId,
            latest: messageTs,
            inclusive: true,
            limit: 1
          });

          const message = messageResult.messages?.[0];
          if (message && message.thread_ts && message.thread_ts !== messageTs) {
            // This is a threaded reply, look for question by thread_ts
            question = await findQuestionByMessageId(workspace.id, message.thread_ts);
            if (question) {
              isThreadReply = true;
              replyMessageTs = messageTs;
            }
          }
        } catch (error) {
          logger.warn('Could not fetch message details:', error);
        }
      }

      if (!question) {
        // Not a tracked question or reply in a question thread
        return;
      }

      // Already answered
      if (question.status === 'answered') {
        return;
      }

      // Handle answer marking reactions (✅, 🎯, 🙏)
      const answerReactions = ['white_check_mark', 'heavy_check_mark', 'ballot_box_with_check', 'dart', 'pray'];

      if (answerReactions.includes(reaction)) {
        // Check if this is a thread reply
        if (isThreadReply && replyMessageTs) {
          // Thread reply - only allow asker to mark
          if (user !== question.asker.slackUserId) {
            logger.info(`User ${user} is not the asker, ignoring thread reply marking`);
            return;
          }

          // Fetch the reply message to get the author
          try {
            const replyResult = await client.conversations.replies({
              channel: channelId,
              ts: replyMessageTs,
              inclusive: true,
              limit: 1
            });

            const replyMessage = replyResult.messages?.[0];
            if (!replyMessage) {
              logger.warn('Could not fetch reply message');
              return;
            }

            // Skip if reply is from a bot
            if (replyMessage.bot_id) {
              logger.info('Reply is from a bot, ignoring');
              return;
            }

            const replyAuthorId = replyMessage.user;

            // Skip if message has no author
            if (!replyAuthorId) {
              logger.warn('Reply message has no author');
              return;
            }

            // Skip if asker is marking their own reply
            if (replyAuthorId === question.asker.slackUserId) {
              logger.info('Asker cannot mark their own reply as answer');
              return;
            }

            // Get reply author info
            const authorInfo = await client.users.info({ user: replyAuthorId });
            const authorData = {
              displayName: authorInfo.user?.profile?.display_name || authorInfo.user?.name,
              realName: authorInfo.user?.profile?.real_name,
            };
            const answerUser = await ensureUser(workspace.id, replyAuthorId, authorData);

            // Mark as answered with the reply author and message ID
            await markQuestionAnswered(question.id, answerUser.id, replyMessageTs);
            logger.info(`Question ${question.id} marked as answered by ${replyAuthorId} (thread reply)`);
          } catch (error) {
            logger.error('Error processing thread reply answer:', error);
          }
        } else {
          // Original message - anyone can mark it (existing behavior)
          const userInfo = await client.users.info({ user });
          const userData = {
            displayName: userInfo.user?.profile?.display_name || userInfo.user?.name,
            realName: userInfo.user?.profile?.real_name,
          };
          const answerUser = await ensureUser(workspace.id, user, userData);

          await markQuestionAnswered(question.id, answerUser.id);
          logger.info(`Question ${question.id} marked as answered by user ${user} (original message)`);
        }
        return;
      }

      // Handle other reactions
      switch (reaction) {

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
      }

    } catch (error) {
      logger.error('Error handling reaction:', error);
    }
  });
}
