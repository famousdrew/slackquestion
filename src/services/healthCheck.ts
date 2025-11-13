/**
 * Health Check Service
 * Provides HTTP endpoint for monitoring application health
 */
import http from 'http';
import boltPkg from '@slack/bolt';
import type { App } from '@slack/bolt';
import { prisma } from '../utils/db.js';
import { logger } from '../utils/logger.js';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  uptime: number;
  timestamp: string;
  checks: {
    database: {
      status: 'up' | 'down';
      responseTime?: number;
      error?: string;
    };
    slack: {
      status: 'connected' | 'disconnected';
      workspace?: string;
      botUser?: string;
      error?: string;
    };
    escalationEngine: {
      status: 'running' | 'stopped';
    };
  };
}

let server: http.Server | null = null;
let slackApp: App | null = null;
let escalationEngineRunning = false;

/**
 * Start the health check HTTP server
 */
export function startHealthCheckServer(app: App, port: number = 3000): void {
  slackApp = app;

  server = http.createServer(async (req, res) => {
    // Only respond to /health endpoint
    if (req.url !== '/health') {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found' }));
      return;
    }

    // Only allow GET requests
    if (req.method !== 'GET') {
      res.writeHead(405, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Method not allowed' }));
      return;
    }

    try {
      const healthStatus = await getHealthStatus();

      // Set status code based on health
      const statusCode = healthStatus.status === 'healthy' ? 200 : 503;

      res.writeHead(statusCode, {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      });

      res.end(JSON.stringify(healthStatus, null, 2));
    } catch (error) {
      logger.error('Error in health check', error as Error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'unhealthy',
        error: 'Health check failed',
        timestamp: new Date().toISOString(),
      }));
    }
  });

  server.listen(port, () => {
    logger.info('Health check endpoint started', { port, endpoint: `/health` });
  });
}

/**
 * Stop the health check server
 */
export function stopHealthCheckServer(): Promise<void> {
  return new Promise((resolve) => {
    if (server) {
      server.close(() => {
        logger.info('Health check server stopped');
        resolve();
      });
    } else {
      resolve();
    }
  });
}

/**
 * Mark escalation engine as running/stopped
 */
export function setEscalationEngineStatus(running: boolean): void {
  escalationEngineRunning = running;
}

/**
 * Get comprehensive health status
 */
async function getHealthStatus(): Promise<HealthStatus> {
  const checks = await Promise.all([
    checkDatabase(),
    checkSlackConnection(),
  ]);

  const [database, slack] = checks;

  // Determine overall status
  let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

  if (database.status === 'down' || slack.status === 'disconnected') {
    status = 'unhealthy';
  } else if (!escalationEngineRunning) {
    status = 'degraded';
  }

  return {
    status,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    checks: {
      database,
      slack,
      escalationEngine: {
        status: escalationEngineRunning ? 'running' : 'stopped',
      },
    },
  };
}

/**
 * Check database connectivity
 */
async function checkDatabase(): Promise<{
  status: 'up' | 'down';
  responseTime?: number;
  error?: string;
}> {
  const startTime = Date.now();

  try {
    // Simple query to test connection
    await prisma.$queryRaw`SELECT 1`;

    const responseTime = Date.now() - startTime;

    return {
      status: 'up',
      responseTime,
    };
  } catch (error) {
    return {
      status: 'down',
      error: error instanceof Error ? error.message : 'Unknown database error',
    };
  }
}

/**
 * Check Slack connection status
 */
async function checkSlackConnection(): Promise<{
  status: 'connected' | 'disconnected';
  workspace?: string;
  botUser?: string;
  error?: string;
}> {
  if (!slackApp) {
    return {
      status: 'disconnected',
      error: 'Slack app not initialized',
    };
  }

  try {
    const auth = await slackApp.client.auth.test();

    if (auth.ok) {
      return {
        status: 'connected',
        workspace: auth.team as string,
        botUser: auth.user as string,
      };
    } else {
      return {
        status: 'disconnected',
        error: 'Authentication failed',
      };
    }
  } catch (error) {
    return {
      status: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown Slack error',
    };
  }
}
