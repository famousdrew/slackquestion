import { App } from '@slack/bolt';
import dotenv from 'dotenv';
import { registerMessageHandler } from './events/messageHandler.js';
import { registerReactionHandler } from './events/reactionHandler.js';
import { registerAppHomeHandler } from './events/appHome.js';
import { registerStatsCommand } from './commands/statsCommand.js';
import { registerConfigCommand } from './commands/configCommand.js';
import { registerTargetsCommand } from './commands/targetsCommand.js';
import { registerTestEscalationCommand } from './commands/testEscalationCommand.js';
import { registerSetupCommand } from './commands/setupCommand.js';
import { registerChannelConfigCommand } from './commands/channelConfigCommand.js';
import { disconnectDb } from './utils/db.js';
import { startEscalationEngine, stopEscalationEngine } from './services/escalationEngine.js';

dotenv.config();

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true,
  appToken: process.env.SLACK_APP_TOKEN,
});

// Debug: Log ALL incoming payloads
app.use(async ({ payload, next, logger }) => {
  logger.info(`📦 Received payload type: ${payload.type || 'unknown'}`);
  logger.info(`📦 Payload: ${JSON.stringify(payload).substring(0, 200)}`);
  await next();
});

// Debug: Log ALL events
app.event(/.*/, async ({ event, logger }) => {
  logger.info(`🔔 Event received: ${event.type}`);
  logger.info(`Event data: ${JSON.stringify(event).substring(0, 300)}`);
});

// Register event handlers
registerMessageHandler(app);
registerReactionHandler(app);
registerAppHomeHandler(app);

// Register commands
registerSetupCommand(app);
registerStatsCommand(app);
registerConfigCommand(app);
registerTargetsCommand(app);
registerTestEscalationCommand(app);
registerChannelConfigCommand(app);

// Test command
app.command('/qr-test', async ({ command, ack, respond, client, logger }) => {
  await ack();

  // Get user groups to help find the ID
  try {
    const result = await client.usergroups.list();
    logger.info(`Usergroups result: ${JSON.stringify(result)}`);
    const groups = result.usergroups?.map(g => `• @${g.handle} - ID: \`${g.id}\``).join('\n') || 'No user groups found';

    await respond({
      response_type: 'ephemeral',
      text: `Hello <@${command.user_id}>! The Slack Question Router is running! 🚀\n\nI'm now monitoring channels for questions and tracking them in the database.\n\n**User Groups in this workspace:**\n${groups}\n\nTry:\n• Posting a question in a channel to see me detect it\n• Use \`/qr-stats\` to see statistics`,
    });
  } catch (error) {
    logger.error(`Error fetching usergroups: ${error}`);
    await respond({
      response_type: 'ephemeral',
      text: `Hello <@${command.user_id}>! The Slack Question Router is running! 🚀\n\nError fetching user groups: ${error}\n\nTry:\n• Posting a question in a channel to see me detect it\n• Use \`/qr-stats\` to see statistics`,
    });
  }
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  stopEscalationEngine();
  await disconnectDb();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  stopEscalationEngine();
  await disconnectDb();
  process.exit(0);
});

// Start the app
(async () => {
  try {
    // Socket Mode doesn't need a port - it uses WebSockets
    await app.start();

    console.log(`⚡️ Slack Question Router is running in Socket Mode!`);
    console.log(`📊 Question detection is active`);
    console.log(`💾 Database connected`);

    // Test if we can call Slack API
    const auth = await app.client.auth.test();
    console.log(`✅ Connected to Slack workspace: ${auth.team}`);
    console.log(`🤖 Bot user: ${auth.user}`);
    console.log(`🎉 Ready to receive events!`);

    // Start escalation engine
    startEscalationEngine(app);
  } catch (error) {
    console.error('❌ Failed to start bot:', error);
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
