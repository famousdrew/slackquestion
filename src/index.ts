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
import { registerDeleteDataCommand, registerExportDataCommand } from './commands/deleteDataCommand.js';
import { disconnectDb } from './utils/db.js';
import { startEscalationEngine, stopEscalationEngine } from './services/escalationEngine.js';
import { startDataCleanupSchedule, stopDataCleanupSchedule } from './services/dataCleanup.js';
import { validateEnv } from './utils/env.js';
import { logger } from './utils/logger.js';
import { installationStore } from './oauth/installer.js';
import { stateStore, cleanupExpiredStates } from './oauth/stateStore.js';

// Load environment variables
dotenv.config();

// Validate environment variables before starting
validateEnv();

logger.info('Creating ExpressReceiver with OAuth configuration...');

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
    'reactions:write',
    'users:read',
    'usergroups:read',
    'commands',
    'team:read',
  ],
  installationStore,
  stateStore, // Database-backed state store to survive restarts
  installerOptions: {
    directInstall: true,
  },
});

logger.info('ExpressReceiver created successfully');

// Add custom routes BEFORE initializing the app
logger.info('Registering custom routes...');
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

// Add health check endpoint to main app
receiver.router.get('/health', async (req: any, res: any) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

logger.info('Custom routes registered');

// Initialize the Bolt app with OAuth
logger.info('Initializing Bolt App...');
const app = new App({
  receiver,
  // Note: token is now fetched automatically from installation store
  // No need to specify token, appToken, or socketMode
});

logger.info('Bolt App initialized successfully');

// Register event handlers
logger.info('Registering event handlers and commands...');
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

// Register data privacy commands (GDPR compliance)
registerDeleteDataCommand(app);
registerExportDataCommand(app);

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
  stopDataCleanupSchedule();
  await disconnectDb();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully...');
  stopEscalationEngine();
  stopDataCleanupSchedule();
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
    stopDataCleanupSchedule();
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
    const host = '0.0.0.0'; // Always bind to all interfaces for cloud deployments

    // Start the Express server directly from the receiver
    // This ensures we're binding to the correct host
    const server = await new Promise<any>((resolve, reject) => {
      const srv = receiver.app.listen(port, host, () => {
        resolve(srv);
      });
      srv.on('error', reject);
    });

    logger.info('Slack Question Router started with OAuth V2', {
      port,
      mode: 'HTTP',
      host,
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

    // Start data cleanup schedule (GDPR compliance)
    startDataCleanupSchedule();

    logger.info('All systems ready - awaiting events');
  } catch (error) {
    logger.error('Failed to start bot', error as Error);
    process.exit(1);
  }
})();
