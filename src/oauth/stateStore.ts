/**
 * OAuth State Store
 * Persists OAuth state to database to survive server restarts
 *
 * This fixes the "slack_oauth_missing_state" error that occurs when
 * Railway or other platforms restart between /install and /oauth_redirect
 */

import { InstallURLOptions } from '@slack/oauth';
import { Prisma } from '@prisma/client';
import { prisma } from '../utils/db.js';
import { logger } from '../utils/logger.js';

// State expires after 10 minutes (Slack's OAuth flow should complete in seconds)
const STATE_EXPIRY_MINUTES = 10;

/**
 * State store for use with ExpressReceiver
 * Stores OAuth state in database instead of memory
 */
export const stateStore = {
  /**
   * Generate and store a new OAuth state value along with installation options
   */
  generateStateParam: async (installOptions: InstallURLOptions, now: Date): Promise<string> => {
    try {
      // Generate a random state value (Slack's default behavior)
      const state = generateRandomState();

      // Calculate expiry time
      const expiresAt = new Date(now.getTime() + STATE_EXPIRY_MINUTES * 60 * 1000);

      logger.debug('Generating OAuth state', {
        state: state.substring(0, 8) + '...',
        expiresAt: expiresAt.toISOString(),
        hasInstallOptions: !!installOptions,
      });

      // Store in database with installation options
      await prisma.oAuthState.create({
        data: {
          state,
          installOptions: installOptions as unknown as Prisma.InputJsonValue,
          expiresAt,
        },
      });

      logger.info('OAuth state stored successfully', {
        state: state.substring(0, 8) + '...',
      });

      return state;
    } catch (error) {
      logger.error('Failed to generate OAuth state', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  },

  /**
   * Verify state and return the stored installation options
   */
  verifyStateParam: async (now: Date, state: string): Promise<InstallURLOptions> => {
    try {
      logger.debug('Verifying OAuth state', {
        state: state.substring(0, 8) + '...',
      });

      // Fetch state from database
      const storedState = await prisma.oAuthState.findUnique({
        where: { state },
      });

      if (!storedState) {
        logger.warn('OAuth state not found in database', {
          state: state.substring(0, 8) + '...',
        });
        throw new Error('OAuth state not found');
      }

      // Check if expired
      if (storedState.expiresAt < now) {
        logger.warn('OAuth state expired', {
          state: state.substring(0, 8) + '...',
          expiresAt: storedState.expiresAt.toISOString(),
          now: now.toISOString(),
        });

        // Clean up expired state
        await prisma.oAuthState.delete({
          where: { state },
        });

        throw new Error('OAuth state expired');
      }

      logger.info('OAuth state verified successfully', {
        state: state.substring(0, 8) + '...',
      });

      // Get install options
      const installOptions = storedState.installOptions as unknown as InstallURLOptions;

      // Delete state after successful verification (one-time use)
      await prisma.oAuthState.delete({
        where: { state },
      });

      logger.debug('OAuth state deleted after verification', {
        state: state.substring(0, 8) + '...',
      });

      // Return the install options
      return installOptions;
    } catch (error) {
      logger.error('Failed to verify OAuth state', {
        error: error instanceof Error ? error.message : String(error),
        state: state.substring(0, 8) + '...',
      });
      throw error;
    }
  },
};

/**
 * Generate a random state string
 * Uses crypto for secure random generation
 */
function generateRandomState(): string {
  // Generate 32 random bytes and convert to hex string
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Cleanup expired OAuth states (to be called periodically)
 * This prevents the oauth_states table from growing indefinitely
 */
export async function cleanupExpiredStates(): Promise<number> {
  try {
    const result = await prisma.oAuthState.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });

    if (result.count > 0) {
      logger.info('Cleaned up expired OAuth states', {
        count: result.count,
      });
    }

    return result.count;
  } catch (error) {
    logger.error('Failed to cleanup expired OAuth states', {
      error: error instanceof Error ? error.message : String(error),
    });
    return 0;
  }
}
