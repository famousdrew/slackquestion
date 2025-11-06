import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function checkRecentQuestions() {
  console.log('Fetching recent questions...\n');

  // Get questions from last hour
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  const questions = await prisma.question.findMany({
    where: {
      askedAt: {
        gte: oneHourAgo
      }
    },
    include: {
      escalations: true,
      channel: true,
      asker: true,
    },
    orderBy: {
      askedAt: 'desc'
    },
    take: 20
  });

  console.log(`📊 Found ${questions.length} questions in the last hour\n`);

  for (const q of questions) {
    console.log('='.repeat(80));
    console.log(`Question ID: ${q.id}`);
    console.log(`Text: ${q.messageText}`);
    console.log(`Asked by: ${q.asker.displayName || q.asker.realName}`);
    console.log(`Channel: ${q.channel.channelName}`);
    console.log(`Asked at: ${q.askedAt}`);
    console.log(`Status: ${q.status}`);
    console.log(`Escalation Level: ${q.escalationLevel}`);
    console.log(`Answered at: ${q.answeredAt}`);
    console.log(`Last Escalated: ${q.lastEscalatedAt}`);
    console.log(`\nEscalations:`);
    q.escalations.forEach(esc => {
      console.log(`  - Level ${esc.escalationLevel} at ${esc.escalatedAt} (${esc.actionTaken})`);
    });
    console.log('');
  }

  // Check all channels
  console.log('\n\n📺 CHANNELS BEING MONITORED:\n');
  const channels = await prisma.channel.findMany({
    include: {
      _count: {
        select: { questions: true }
      }
    }
  });

  for (const ch of channels) {
    console.log(`${ch.channelName || ch.slackChannelId}: ${ch._count.questions} questions total, monitored: ${ch.isMonitored}`);
  }

  await prisma.$disconnect();
}

checkRecentQuestions().catch(console.error);
