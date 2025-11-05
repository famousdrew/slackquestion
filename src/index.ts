import { App } from '@slack/bolt';
import dotenv from 'dotenv';
import { registerMessageHandler } from './events/messageHandler.js';
import { registerReactionHandler } from './events/reactionHandler.js';
import { registerStatsCommand } from './commands/statsCommand.js';
import { disconnectDb } from './utils/db.js';

dotenv.config();

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true,
  appToken: process.env.SLACK_APP_TOKEN,
});

// Register event handlers
registerMessageHandler(app);
registerReactionHandler(app);

// Register commands
registerStatsCommand(app);

// Test command
app.command('/qr-test', async ({ command, ack, respond }) => {
  await ack();
  await respond({
    response_type: 'ephemeral',
    text: `Hello <@${command.user_id}>! The Slack Question Router is running! 🚀\n\nI'm now monitoring channels for questions and tracking them in the database.\n\nTry:\n• Posting a question in a channel to see me detect it\n• Use \`/qr-stats\` to see statistics`,
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  await disconnectDb();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  await disconnectDb();
  process.exit(0);
});

// Start the app
(async () => {
  const port = process.env.PORT || 3000;
  await app.start(port);
  console.log(`⚡️ Slack Question Router is running on port ${port}!`);
  console.log(`📊 Question detection is active`);
  console.log(`💾 Database connected`);
})();
