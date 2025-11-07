import { App } from '@slack/bolt';
import dotenv from 'dotenv';
import { logger } from './utils/logger.js';
import { prisma } from './utils/prisma.js';
import { registerMessageHandler } from './events/message.js';

dotenv.config();

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true,
  appToken: process.env.SLACK_APP_TOKEN,
});

// Register event handlers
registerMessageHandler(app);

// Basic test command
app.command('/qr-test', async ({ command, ack, say }) => {
  await ack();
  await say(`Hello <@${command.user_id}>! The Slack Question Router is running! 🚀`);
  logger.info('Test command executed', { userId: command.user_id });
});

// Start the app
(async () => {
  try {
    await app.start();
    logger.info('⚡️ Slack Question Router is running in Socket Mode!');
  } catch (error) {
    logger.error('Failed to start app:', error);
    process.exit(1);
  }
})();

// Graceful shutdown
const shutdown = async (signal: string) => {
  logger.info(`${signal} received, shutting down gracefully...`);
  try {
    await app.stop();
    await prisma.$disconnect();
    logger.info('Shutdown complete');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
