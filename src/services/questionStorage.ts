/**
 * Question Storage Service
 * Handles storing and retrieving questions from the database
 */
import { prisma } from '../utils/db.js';
import { extractKeywords } from './questionDetector.js';

export interface StoreQuestionParams {
  workspaceId: string;
  channelId: string;
  askerId: string;
  slackMessageId: string;
  slackThreadId?: string;
  messageText: string;
  askedAt: Date;
  isSideConversation?: boolean;
  zendeskTicketId?: string | null;
  sourceApp?: string;
}

/**
 * Store a new question in the database
 */
export async function storeQuestion(params: StoreQuestionParams) {
  const keywords = extractKeywords(params.messageText);

  return await prisma.question.create({
    data: {
      workspaceId: params.workspaceId,
      channelId: params.channelId,
      askerId: params.askerId,
      slackMessageId: params.slackMessageId,
      slackThreadId: params.slackThreadId,
      messageText: params.messageText,
      extractedKeywords: keywords,
      askedAt: params.askedAt,
      status: 'unanswered',
      escalationLevel: 0,
      isSideConversation: params.isSideConversation || false,
      zendeskTicketId: params.zendeskTicketId || null,
      sourceApp: params.sourceApp || 'slack',
    },
  });
}

/**
 * Check if a question already exists
 */
export async function questionExists(
  workspaceId: string,
  slackMessageId: string
): Promise<boolean> {
  const count = await prisma.question.count({
    where: {
      workspaceId,
      slackMessageId,
    },
  });
  return count > 0;
}

/**
 * Mark a question as answered
 */
export async function markQuestionAnswered(
  questionId: string,
  answererId: string,
  answeredAt: Date = new Date()
) {
  return await prisma.question.update({
    where: { id: questionId },
    data: {
      status: 'answered',
      answererId,
      answeredAt,
    },
  });
}

/**
 * Find a question by Slack message ID
 */
export async function findQuestionByMessageId(
  workspaceId: string,
  slackMessageId: string
) {
  return await prisma.question.findFirst({
    where: {
      workspaceId,
      slackMessageId,
    },
    include: {
      asker: true,
      answerer: true,
      channel: true,
    },
  });
}

/**
 * Get unanswered questions
 */
export async function getUnansweredQuestions(workspaceId: string) {
  return await prisma.question.findMany({
    where: {
      workspaceId,
      status: 'unanswered',
    },
    include: {
      asker: true,
      channel: true,
    },
    orderBy: {
      askedAt: 'asc',
    },
  });
}

/**
 * Get question statistics
 */
export async function getQuestionStats(
  workspaceId: string,
  daysBack: number = 7
) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysBack);

  const questions = await prisma.question.findMany({
    where: {
      workspaceId,
      askedAt: {
        gte: startDate,
      },
    },
    include: {
      asker: true,
      answerer: true,
      channel: true,
    },
  });

  type QuestionWithRelations = typeof questions[0];

  const total = questions.length;
  const answered = questions.filter((q: QuestionWithRelations) => q.status === 'answered').length;
  const unanswered = total - answered;
  const answerRate = total > 0 ? (answered / total) * 100 : 0;

  // Calculate average response time
  const responseTimes = questions
    .filter((q: QuestionWithRelations) => q.answeredAt)
    .map((q: QuestionWithRelations) => {
      const asked = new Date(q.askedAt).getTime();
      const answered = new Date(q.answeredAt!).getTime();
      return (answered - asked) / 1000 / 60; // minutes
    });

  const avgResponseTime = responseTimes.length > 0
    ? responseTimes.reduce((a: number, b: number) => a + b, 0) / responseTimes.length
    : 0;

  // Top responders
  const responderCounts = new Map<string, { count: number; name: string }>();
  questions.forEach((q: QuestionWithRelations) => {
    if (q.answerer) {
      const current = responderCounts.get(q.answerer.id) || { count: 0, name: q.answerer.displayName || q.answerer.realName || 'Unknown' };
      responderCounts.set(q.answerer.id, { count: current.count + 1, name: current.name });
    }
  });

  const topResponders = Array.from(responderCounts.entries())
    .map(([userId, data]) => ({ userId, count: data.count, name: data.name }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Questions by channel
  const channelCounts = new Map<string, { total: number; answered: number; name: string }>();
  questions.forEach((q: QuestionWithRelations) => {
    const current = channelCounts.get(q.channel.id) || { total: 0, answered: 0, name: q.channel.channelName || 'Unknown' };
    channelCounts.set(q.channel.id, {
      total: current.total + 1,
      answered: current.answered + (q.status === 'answered' ? 1 : 0),
      name: current.name,
    });
  });

  const channelStats = Array.from(channelCounts.entries())
    .map(([channelId, data]) => ({
      channelId,
      channelName: data.name,
      total: data.total,
      answered: data.answered,
      answerRate: (data.answered / data.total) * 100,
    }))
    .sort((a, b) => b.total - a.total);

  return {
    total,
    answered,
    unanswered,
    answerRate,
    avgResponseTime,
    topResponders,
    channelStats,
  };
}
