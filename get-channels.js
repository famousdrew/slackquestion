/**
 * One-time script to fetch channels
 * Run with: node get-channels.js
 */
import { WebClient } from '@slack/web-api';
import dotenv from 'dotenv';

dotenv.config();

const client = new WebClient(process.env.SLACK_BOT_TOKEN);

async function getChannels() {
  try {
    console.log('Fetching all channels (public and private)...\n');

    const result = await client.conversations.list({
      types: 'public_channel,private_channel',
      limit: 1000,
    });

    if (result.channels && result.channels.length > 0) {
      console.log('Channels the bot can see:\n');
      result.channels.forEach(channel => {
        const type = channel.is_private ? '🔒 Private' : '📢 Public';
        const isMember = channel.is_member ? '✅ Member' : '❌ Not member';
        console.log(`${type} - ${isMember} - #${channel.name}`);
        console.log(`   ID: ${channel.id}`);
        console.log('');
      });

      // Specifically look for tier_2
      const tier2 = result.channels.find(c => c.name === 'tier_2');
      if (tier2) {
        console.log('\n🎯 Found #tier_2:');
        console.log(`   ID: ${tier2.id}`);
        console.log(`   Is Private: ${tier2.is_private}`);
        console.log(`   Is Member: ${tier2.is_member}`);
        console.log(`   Is Archived: ${tier2.is_archived}`);
      } else {
        console.log('\n❌ Could not find a channel named "tier_2"');
      }
    } else {
      console.log('No channels found.');
    }
  } catch (error) {
    console.error('Error fetching channels:', error.message);
  }
}

getChannels();
