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
import { validateEnv } from './utils/env.js';
import { startHealthCheckServer, stopHealthCheckServer } from './services/healthCheck.js';
import { logger } from './utils/logger.js';

// Load environment variables
dotenv.config();

// Validate environment variables before starting
validateEnv();

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true,
  appToken: process.env.SLACK_APP_TOKEN,
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
  logger.info('SIGTERM received, shutting down gracefully...');
  stopEscalationEngine();
  await stopHealthCheckServer();
  await disconnectDb();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully...');
  stopEscalationEngine();
  await stopHealthCheckServer();
  await disconnectDb();
  process.exit(0);
});

// Global error handlers
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Promise Rejection', {
    reason: reason instanceof Error ? reason.message : String(reason),
    stack: reason instanceof Error ? reason.stack : undefined,
  });
  // Log but don't exit - let the app continue running
});

process.on('uncaughtException', async (error) => {
  logger.error('Uncaught Exception - initiating shutdown', error);
  // This is serious - attempt graceful shutdown
  try {
    stopEscalationEngine();
    await stopHealthCheckServer();
    await disconnectDb();
  } catch (shutdownError) {
    logger.error('Error during emergency shutdown', shutdownError as Error);
  }
  process.exit(1);
});

// Start the app
(async () => {
  try {
    // Socket Mode doesn't need a port - it uses WebSockets
    await app.start();

    logger.info('Slack Question Router started in Socket Mode');
    logger.info('Question detection is active');
    logger.info('Database connected');

    // Test if we can call Slack API
    const auth = await app.client.auth.test();
    logger.info('Connected to Slack workspace', {
      workspace: auth.team,
      botUser: auth.user,
    });

    // Start escalation engine
    startEscalationEngine(app);

    // Start health check server
    const healthCheckPort = parseInt(process.env.HEALTH_CHECK_PORT || '3000');
    startHealthCheckServer(app, healthCheckPort);

    logger.info('All systems ready - awaiting events');
  } catch (error) {
    logger.error('Failed to start bot', error as Error);
    process.exit(1);
  }
})();
