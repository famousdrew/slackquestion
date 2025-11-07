/**
 * Question Manager Service
 * Handles database operations for questions
 */

import { prisma } from '../utils/prisma.js';
import { logger } from '../utils/logger.js';
import { extractKeywords } from './questionDetector.js';

interface CreateQuestionParams {
  workspaceId: string;
  channelId: string;
  askerId: string;
  slackMessageId: string;
  slackThreadId?: string;
  messageText: string;
}

export async function createQuestion(params: CreateQuestionParams) {
  try {
    const keywords = extractKeywords(params.messageText);

    const question = await prisma.question.create({
      data: {
        workspaceId: params.workspaceId,
        channelId: params.channelId,
        askerId: params.askerId,
        slackMessageId: params.slackMessageId,
        slackThreadId: params.slackThreadId,
        messageText: params.messageText,
        extractedKeywords: keywords,
        askedAt: new Date(),
        status: 'unanswered',
      },
    });

    logger.info('Question created:', {
      id: question.id,
      channelId: params.channelId,
      keywords,
    });

    return question;
  } catch (error) {
    logger.error('Failed to create question:', error);
    throw error;
  }
}

export async function getQuestionByMessageId(
  workspaceId: string,
  slackMessageId: string
) {
  return prisma.question.findFirst({
    where: {
      workspaceId,
      slackMessageId,
    },
  });
}

export async function markQuestionAsAnswered(
  questionId: string,
  answererId: string
) {
  try {
    const question = await prisma.question.update({
      where: { id: questionId },
      data: {
        status: 'answered',
        answeredAt: new Date(),
        answererId,
      },
    });

    logger.info('Question marked as answered:', {
      questionId,
      answererId,
    });

    return question;
  } catch (error) {
    logger.error('Failed to mark question as answered:', error);
    throw error;
  }
}

export async function getUnansweredQuestions(workspaceId: string) {
  return prisma.question.findMany({
    where: {
      workspaceId,
      status: 'unanswered',
    },
    orderBy: {
      askedAt: 'asc',
    },
    include: {
      channel: true,
      asker: true,
    },
  });
}
