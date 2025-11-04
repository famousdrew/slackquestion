import { App } from '@slack/bolt';
import dotenv from 'dotenv';

dotenv.config();

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true,
  appToken: process.env.SLACK_APP_TOKEN,
});

// Basic test command
app.command('/qr-test', async ({ command, ack, say }) => {
  await ack();
  await say(`Hello <@${command.user_id}>! The Slack Question Router is running! 🚀`);
});

// Start the app
(async () => {
  const port = process.env.PORT || 3000;
  await app.start(port);
  console.log(`⚡️ Slack Question Router is running on port ${port}!`);
})();
