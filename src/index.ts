import boltPkg from '@slack/bolt';
const App = (boltPkg as any).App || boltPkg;
const ExpressReceiver = (boltPkg as any).ExpressReceiver;
import type { App as AppType } from '@slack/bolt';
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
import { installer } from './oauth/installer.js';

// Load environment variables
dotenv.config();

// Validate environment variables before starting
validateEnv();

// Create custom receiver with OAuth support
const receiver = new ExpressReceiver({
  signingSecret: process.env.SLACK_SIGNING_SECRET!,
  clientId: process.env.SLACK_CLIENT_ID!,
  clientSecret: process.env.SLACK_CLIENT_SECRET!,
  stateSecret: process.env.SLACK_STATE_SECRET!,
  scopes: [
    'channels:history',
    'channels:read',
    'chat:write',
    'groups:history',
    'groups:read',
    'reactions:read',
    'users:read',
    'usergroups:read',
    'commands',
  ],
  installerOptions: {
    directInstall: true, // Enable direct install link
  },
  installationStore: installer.installationStore,
});

// Add custom routes BEFORE initializing the app
receiver.router.get('/', (req: any, res: any) => {
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Slack Question Router</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
          .button { display: inline-block; padding: 12px 24px; background: #4A154B; color: white; text-decoration: none; border-radius: 4px; margin: 10px 0; }
          .button:hover { background: #611f69; }
        </style>
      </head>
      <body>
        <h1>🎯 Slack Question Router</h1>
        <p>Never miss a question in Slack again!</p>
        <p>Automatically detect, route, and escalate questions to the right experts.</p>
        <a href="/slack/install" class="button">Add to Slack</a>
        <hr>
        <p><small>Version 2.0 - OAuth Edition</small></p>
      </body>
    </html>
  `);
});

// Initialize the Bolt app with OAuth
const app = new App({
  receiver,
  // Note: token is now fetched automatically from installation store
  // No need to specify token, appToken, or socketMode
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
app.command('/qr-test', async ({ command, ack, respond, client, logger }: any) => {
  await ack();

  // Get user groups to help find the ID
  try {
    const result = await client.usergroups.list();
    logger.info(`Usergroups result: ${JSON.stringify(result)}`);
    const groups = result.usergroups?.map((g: any) => `• @${g.handle} - ID: \`${g.id}\``).join('\n') || 'No user groups found';

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
    // OAuth requires HTTP server on a specific port
    const port = parseInt(process.env.PORT || '3000');
    await app.start(port);

    logger.info('Slack Question Router started with OAuth V2', {
      port,
      mode: 'HTTP',
    });
    logger.info('Question detection is active');
    logger.info('Database connected');
    logger.info('OAuth endpoints available:', {
      install: `http://localhost:${port}/slack/install`,
      redirect: `http://localhost:${port}/slack/oauth_redirect`,
      events: `http://localhost:${port}/slack/events`,
    });

    // Start escalation engine
    startEscalationEngine(app);

    // Start health check server (on different port if needed)
    const healthCheckPort = parseInt(process.env.HEALTH_CHECK_PORT || '3001');
    if (healthCheckPort !== port) {
      startHealthCheckServer(app, healthCheckPort);
    } else {
      logger.info('Health check endpoint available at /health on main port');
    }

    logger.info('All systems ready - awaiting events');
  } catch (error) {
    logger.error('Failed to start bot', error as Error);
    process.exit(1);
  }
})();
