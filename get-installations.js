#!/usr/bin/env node
/**
 * List All Slack Installations
 * Shows all workspaces that have installed the app
 */

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function listInstallations() {
  try {
    console.log('📱 Slack Installations\n' + '='.repeat(60));

    const installations = await prisma.slackInstallation.findMany({
      select: {
        id: true,
        teamId: true,
        enterpriseId: true,
        botUserId: true,
        botScopes: true,
        userToken: true,
        userId: true,
        isEnterpriseInstall: true,
        installedAt: true,
        updatedAt: true,
      },
      orderBy: {
        installedAt: 'desc'
      }
    });

    if (installations.length === 0) {
      console.log('\n❌ No installations found');
      console.log('\nTo install the app, visit:');
      console.log('   https://your-domain.com/slack/install\n');
      return;
    }

    console.log(`\n✅ Found ${installations.length} installation(s)\n`);

    for (const [index, inst] of installations.entries()) {
      console.log(`${index + 1}. Installation ${inst.id}`);
      console.log(`   Team ID: ${inst.teamId || 'N/A'}`);
      console.log(`   Enterprise ID: ${inst.enterpriseId || 'N/A'}`);
      console.log(`   Bot User ID: ${inst.botUserId}`);
      console.log(`   Bot Scopes: ${inst.botScopes.join(', ')}`);
      console.log(`   Has User Token: ${inst.userToken ? 'Yes' : 'No'}`);
      console.log(`   User ID: ${inst.userId || 'N/A'}`);
      console.log(`   Is Enterprise: ${inst.isEnterpriseInstall}`);
      console.log(`   Installed: ${inst.installedAt.toISOString()}`);
      console.log(`   Last Updated: ${inst.updatedAt.toISOString()}`);

      // Check if workspace exists
      if (inst.teamId) {
        const workspace = await prisma.workspace.findUnique({
          where: { slackTeamId: inst.teamId },
          select: {
            teamName: true,
            createdAt: true,
            _count: {
              select: {
                channels: true,
                questions: true,
                users: true
              }
            }
          }
        });

        if (workspace) {
          console.log(`   Workspace: ${workspace.teamName || 'Unknown'}`);
          console.log(`   Channels: ${workspace._count.channels}`);
          console.log(`   Questions: ${workspace._count.questions}`);
          console.log(`   Users: ${workspace._count.users}`);
        } else {
          console.log(`   ⚠️  Workspace record not yet created (will be created on first use)`);
        }
      }

      console.log('');
    }

    console.log('='.repeat(60));

    // Summary
    const teamIds = installations.map(i => i.teamId).filter(Boolean);
    const uniqueTeams = new Set(teamIds);

    console.log('\n📊 Summary:');
    console.log(`   Total installations: ${installations.length}`);
    console.log(`   Unique teams: ${uniqueTeams.size}`);
    console.log(`   Enterprise installs: ${installations.filter(i => i.isEnterpriseInstall).length}`);
    console.log('');

  } catch (error) {
    console.error('❌ Error fetching installations:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

listInstallations();
