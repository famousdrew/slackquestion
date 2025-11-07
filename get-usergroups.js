/**
 * One-time script to fetch user group IDs
 * Run with: node get-usergroups.js
 */
import { WebClient } from '@slack/web-api';
import dotenv from 'dotenv';

dotenv.config();

const client = new WebClient(process.env.SLACK_BOT_TOKEN);

async function getUserGroups() {
  try {
    console.log('Fetching user groups...\n');

    const result = await client.usergroups.list();

    if (result.usergroups && result.usergroups.length > 0) {
      console.log('User Groups in your workspace:\n');
      result.usergroups.forEach(group => {
        console.log(`📋 @${group.handle}`);
        console.log(`   ID: ${group.id}`);
        console.log(`   Name: ${group.name}`);
        console.log(`   Members: ${group.user_count || 'unknown'}`);
        console.log('');
      });
    } else {
      console.log('No user groups found.');
    }
  } catch (error) {
    console.error('Error fetching user groups:', error.message);
    console.error('\nYou need to add the "usergroups:read" scope to your Slack app:');
    console.error('1. Go to https://api.slack.com/apps');
    console.error('2. Select your app');
    console.error('3. Go to "OAuth & Permissions"');
    console.error('4. Add "usergroups:read" under Bot Token Scopes');
    console.error('5. Reinstall the app to your workspace');
    console.error('6. Update SLACK_BOT_TOKEN in .env with the new token');
  }
}

getUserGroups();
