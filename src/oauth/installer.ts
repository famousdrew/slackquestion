/**
 * OAuth Installation Provider
 * Handles OAuth V2 flow and stores installation data in the database
 */

import { InstallProvider, Installation, InstallURLOptions } from '@slack/oauth';
import { prisma } from '../utils/db.js';
import { logger } from '../utils/logger.js';

/**
 * Create the OAuth installation provider with database-backed storage
 */
export const installer = new InstallProvider({
  clientId: process.env.SLACK_CLIENT_ID!,
  clientSecret: process.env.SLACK_CLIENT_SECRET!,
  stateSecret: process.env.SLACK_STATE_SECRET!, // Random string for CSRF protection
  installationStore: {
    /**
     * Store a new installation or update an existing one
     */
    storeInstallation: async (installation: Installation) => {
      try {
        const isEnterpriseInstall = installation.isEnterpriseInstall || false;
        const teamId = installation.team?.id;
        const enterpriseId = installation.enterprise?.id;

        if (!teamId && !enterpriseId) {
          throw new Error('Installation must have either team ID or enterprise ID');
        }

        logger.info('Storing Slack installation', {
          teamId,
          enterpriseId,
          isEnterpriseInstall,
        });

        // Prepare installation data
        const installationData = {
          botToken: installation.bot?.token || '',
          botUserId: installation.bot?.userId || '',
          botScopes: installation.bot?.scopes || [],
          userToken: installation.user?.token,
          userId: installation.user?.id,
          userScopes: installation.user?.scopes || [],
          incomingWebhook: installation.incomingWebhook || null,
          appId: installation.appId || '',
          tokenType: installation.tokenType || 'bot',
          isEnterpriseInstall,
          metadata: installation as any, // Store full installation as backup
          updatedAt: new Date(),
        };

        if (isEnterpriseInstall && enterpriseId) {
          // Enterprise installation
          await prisma.slackInstallation.upsert({
            where: { enterpriseId },
            update: installationData,
            create: {
              ...installationData,
              enterpriseId,
            },
          });
        } else if (teamId) {
          // Workspace installation
          await prisma.slackInstallation.upsert({
            where: { teamId },
            update: installationData,
            create: {
              ...installationData,
              teamId,
            },
          });
        }

        logger.info('Successfully stored Slack installation', {
          teamId,
          enterpriseId,
        });
      } catch (error) {
        logger.error('Failed to store installation', {
          error: error instanceof Error ? error.message : String(error),
          installation,
        });
        throw error;
      }
    },

    /**
     * Fetch an installation from the database
     */
    fetchInstallation: async (installQuery) => {
      try {
        const { teamId, enterpriseId, isEnterpriseInstall } = installQuery;

        logger.debug('Fetching Slack installation', {
          teamId,
          enterpriseId,
          isEnterpriseInstall,
        });

        let installation;

        if (isEnterpriseInstall && enterpriseId) {
          // Fetch enterprise installation
          installation = await prisma.slackInstallation.findUnique({
            where: { enterpriseId },
          });
        } else if (teamId) {
          // Fetch workspace installation
          installation = await prisma.slackInstallation.findUnique({
            where: { teamId },
          });
        }

        if (!installation) {
          logger.warn('Installation not found', {
            teamId,
            enterpriseId,
          });
          throw new Error('Installation not found');
        }

        logger.debug('Successfully fetched installation', {
          teamId: installation.teamId,
          enterpriseId: installation.enterpriseId,
        });

        // Return installation in the format Bolt expects
        return installation.metadata as Installation;
      } catch (error) {
        logger.error('Failed to fetch installation', {
          error: error instanceof Error ? error.message : String(error),
          installQuery,
        });
        throw error;
      }
    },

    /**
     * Delete an installation from the database
     */
    deleteInstallation: async (installQuery) => {
      try {
        const { teamId, enterpriseId, isEnterpriseInstall } = installQuery;

        logger.info('Deleting Slack installation', {
          teamId,
          enterpriseId,
          isEnterpriseInstall,
        });

        if (isEnterpriseInstall && enterpriseId) {
          await prisma.slackInstallation.delete({
            where: { enterpriseId },
          });
        } else if (teamId) {
          await prisma.slackInstallation.delete({
            where: { teamId },
          });
        }

        logger.info('Successfully deleted installation', {
          teamId,
          enterpriseId,
        });
      } catch (error) {
        logger.error('Failed to delete installation', {
          error: error instanceof Error ? error.message : String(error),
          installQuery,
        });
        throw error;
      }
    },
  },
});

/**
 * Generate OAuth installation URL
 * Call this from your landing page to start the OAuth flow
 */
export async function generateInstallUrl(
  options?: InstallURLOptions
): Promise<string> {
  try {
    const url = await installer.generateInstallUrl({
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
      ...options,
    });

    logger.info('Generated OAuth installation URL');
    return url;
  } catch (error) {
    logger.error('Failed to generate install URL', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
