#!/usr/bin/env node
/**
 * Installation Readiness Checker
 * Verifies that the app is ready to accept multiple Slack workspace installations
 */

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function checkInstallationReadiness() {
  console.log('🔍 Checking installation readiness for multiple workspaces...\n');

  const checks = {
    passed: [],
    failed: [],
    warnings: []
  };

  // Check 1: Environment variables
  console.log('1️⃣ Checking environment variables...');
  const requiredEnvVars = [
    'SLACK_CLIENT_ID',
    'SLACK_CLIENT_SECRET',
    'SLACK_SIGNING_SECRET',
    'SLACK_STATE_SECRET',
    'DATABASE_URL'
  ];

  for (const envVar of requiredEnvVars) {
    if (process.env[envVar]) {
      checks.passed.push(`✅ ${envVar} is set`);
    } else {
      checks.failed.push(`❌ ${envVar} is missing`);
    }
  }

  // Check 2: Database connection
  console.log('\n2️⃣ Checking database connection...');
  try {
    await prisma.$connect();
    checks.passed.push('✅ Database connection successful');
  } catch (error) {
    checks.failed.push(`❌ Database connection failed: ${error.message}`);
    await cleanup();
    return { checks, canInstall: false };
  }

  // Check 3: slack_installations table exists
  console.log('\n3️⃣ Checking slack_installations table...');
  try {
    const tableCheck = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'slack_installations'
      ) as exists;
    `;

    if (tableCheck[0].exists) {
      checks.passed.push('✅ slack_installations table exists');
    } else {
      checks.failed.push('❌ slack_installations table is missing');
      checks.warnings.push('⚠️  Run: psql $DATABASE_URL -f migration-add-slack-installations.sql');
    }
  } catch (error) {
    checks.failed.push(`❌ Could not check table: ${error.message}`);
  }

  // Check 4: Current installations
  console.log('\n4️⃣ Checking existing installations...');
  try {
    const installations = await prisma.slackInstallation.findMany({
      select: {
        id: true,
        teamId: true,
        enterpriseId: true,
        botUserId: true,
        installedAt: true,
        updatedAt: true
      }
    });

    if (installations.length === 0) {
      checks.warnings.push('⚠️  No installations found - this is normal for a new deployment');
    } else {
      checks.passed.push(`✅ Found ${installations.length} installation(s)`);
      console.log('\n   Current installations:');
      installations.forEach((inst, idx) => {
        console.log(`   ${idx + 1}. Team: ${inst.teamId || 'N/A'} | Bot: ${inst.botUserId}`);
        console.log(`      Installed: ${inst.installedAt.toISOString()}`);
        console.log(`      Updated: ${inst.updatedAt.toISOString()}`);
      });
    }
  } catch (error) {
    checks.failed.push(`❌ Could not check installations: ${error.message}`);
  }

  // Check 5: Workspaces table
  console.log('\n5️⃣ Checking workspaces...');
  try {
    const workspaces = await prisma.workspace.findMany({
      select: {
        id: true,
        slackTeamId: true,
        teamName: true,
        createdAt: true
      }
    });

    if (workspaces.length === 0) {
      checks.warnings.push('⚠️  No workspaces found - workspace will be created on first use');
    } else {
      checks.passed.push(`✅ Found ${workspaces.length} workspace(s)`);
      console.log('\n   Registered workspaces:');
      workspaces.forEach((ws, idx) => {
        console.log(`   ${idx + 1}. ${ws.teamName || 'Unknown'} (${ws.slackTeamId})`);
      });
    }
  } catch (error) {
    checks.failed.push(`❌ Could not check workspaces: ${error.message}`);
  }

  // Check 6: Schema constraints
  console.log('\n6️⃣ Checking database constraints...');
  try {
    const constraints = await prisma.$queryRaw`
      SELECT
        tc.constraint_name,
        tc.table_name,
        kcu.column_name,
        tc.constraint_type
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      WHERE tc.table_name = 'slack_installations'
        AND tc.constraint_type = 'UNIQUE'
        AND tc.table_schema = 'public';
    `;

    if (constraints.length > 0) {
      checks.passed.push(`✅ Found ${constraints.length} unique constraint(s) on slack_installations`);
      console.log('\n   Unique constraints:');
      constraints.forEach(c => {
        console.log(`   - ${c.column_name} (${c.constraint_name})`);
      });
    } else {
      checks.warnings.push('⚠️  Could not verify unique constraints');
    }
  } catch (error) {
    checks.warnings.push(`⚠️  Could not check constraints: ${error.message}`);
  }

  await cleanup();

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 INSTALLATION READINESS SUMMARY');
  console.log('='.repeat(60));

  if (checks.passed.length > 0) {
    console.log('\n✅ Passed Checks:');
    checks.passed.forEach(check => console.log(`   ${check}`));
  }

  if (checks.warnings.length > 0) {
    console.log('\n⚠️  Warnings:');
    checks.warnings.forEach(warning => console.log(`   ${warning}`));
  }

  if (checks.failed.length > 0) {
    console.log('\n❌ Failed Checks:');
    checks.failed.forEach(failure => console.log(`   ${failure}`));
  }

  const canInstall = checks.failed.length === 0;
  console.log('\n' + '='.repeat(60));
  if (canInstall) {
    console.log('✅ READY: App is ready to accept installations from multiple Slack workspaces');
    console.log('\nTo install to a new workspace, visit:');
    console.log(`   https://your-domain.com/slack/install`);
  } else {
    console.log('❌ NOT READY: Please fix the failed checks above before installing');
  }
  console.log('='.repeat(60) + '\n');

  return { checks, canInstall };
}

async function cleanup() {
  await prisma.$disconnect();
}

// Run the check
checkInstallationReadiness()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
