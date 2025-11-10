/**
 * Utility script to check questions in work_questions channel
 * Usage: node check-work-questions.js
 *
 * Requires: .env file with DATABASE_URL configured
 */
import dotenv from 'dotenv';
import { prisma } from './dist/utils/db.js';

dotenv.config();

async function checkWorkQuestions() {
  try {
    // Find the work_questions channel
    const channel = await prisma.channel.findFirst({
      where: {
        OR: [
          { channelName: { contains: 'work_questions', mode: 'insensitive' } },
          { channelName: { contains: 'work-questions', mode: 'insensitive' } }
        ]
      },
      include: {
        workspace: true
      }
    });

    if (!channel) {
      console.log('Channel not found in database');
      console.log('\nAvailable channels:');
      const channels = await prisma.channel.findMany({
        select: { channelName: true, slackChannelId: true, isMonitored: true }
      });
      channels.forEach(c => console.log(`  - ${c.channelName} (${c.slackChannelId}) - monitored: ${c.isMonitored}`));
      await prisma.$disconnect();
      return;
    }

    console.log(`Found channel: ${channel.channelName} (ID: ${channel.slackChannelId})`);
    console.log(`Monitored: ${channel.isMonitored}`);
    console.log(`Workspace: ${channel.workspace.teamName}`);

    // Get recent questions in this channel
    const questions = await prisma.question.findMany({
      where: { channelId: channel.id },
      orderBy: { askedAt: 'desc' },
      take: 20,
      include: {
        asker: true
      }
    });

    console.log(`\nRecent questions detected: ${questions.length}`);
    questions.forEach(q => {
      const date = new Date(q.askedAt).toLocaleString();
      const preview = q.messageText.substring(0, 80).replace(/\n/g, ' ');
      console.log(`[${date}] ${q.asker.displayName}: "${preview}..."`);
      console.log(`  Status: ${q.status}, Escalation Level: ${q.escalationLevel}`);
    });

    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error.message);
    await prisma.$disconnect();
    process.exit(1);
  }
}

checkWorkQuestions();
