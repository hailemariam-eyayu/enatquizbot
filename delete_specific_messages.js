require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');

// Disable SSL verification for corporate proxies
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const bot = new TelegramBot(process.env.BOT_TOKEN, {
  request: {
    agentOptions: {
      rejectUnauthorized: false
    }
  }
});

const GROUP_ID = -1002032084985;

// Define the range of message IDs to delete
// Based on your link, message 1667 is one of them
// Let's try deleting messages around that range
const START_ID = 1600;  // Start from message 1600
const END_ID = 1695;    // Up to current message

async function deleteSpecificMessages() {
  console.log(`🧹 Deleting messages from ${START_ID} to ${END_ID} in group ${GROUP_ID}`);
  
  let deletedCount = 0;
  let failedCount = 0;
  
  for (let messageId = START_ID; messageId <= END_ID; messageId++) {
    try {
      await bot.deleteMessage(GROUP_ID, messageId);
      deletedCount++;
      console.log(`✅ Deleted message ${messageId}`);
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (err) {
      failedCount++;
      // Silently skip messages that can't be deleted
    }
  }
  
  console.log('\n✅ Cleanup complete!');
  console.log(`🗑️  Deleted: ${deletedCount} messages`);
  console.log(`⏭️  Skipped: ${failedCount} messages`);
  
  process.exit(0);
}

deleteSpecificMessages();
