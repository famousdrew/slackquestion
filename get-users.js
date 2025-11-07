/**
 * One-time script to fetch user IDs
 * Run with: node get-users.js
 */
import { WebClient } from '@slack/web-api';
import dotenv from 'dotenv';

dotenv.config();

const client = new WebClient(process.env.SLACK_BOT_TOKEN);

async function getUsers() {
  try {
    console.log('Fetching users...\n');

    const result = await client.users.list();

    if (result.members && result.members.length > 0) {
      console.log('Users in your workspace:\n');

      // Filter out bots and deleted users
      const activeUsers = result.members.filter(
        user => !user.is_bot && !user.deleted && user.id !== 'USLACKBOT'
      );

      activeUsers.forEach(user => {
        console.log(`👤 @${user.name}`);
        console.log(`   ID: ${user.id}`);
        console.log(`   Real Name: ${user.real_name || 'N/A'}`);
        console.log(`   Email: ${user.profile?.email || 'N/A'}`);
        console.log('');
      });

      console.log(`\nTotal active users: ${activeUsers.length}`);
    } else {
      console.log('No users found.');
    }
  } catch (error) {
    console.error('Error fetching users:', error.message);
    console.error('\nMake sure you have the "users:read" scope in your Slack app:');
    console.error('1. Go to https://api.slack.com/apps');
    console.error('2. Select your app');
    console.error('3. Go to "OAuth & Permissions"');
    console.error('4. Verify "users:read" is under Bot Token Scopes');
    console.error('5. If not, add it and reinstall the app');
    console.error('6. Update SLACK_BOT_TOKEN in .env with the new token');
  }
}

getUsers();
