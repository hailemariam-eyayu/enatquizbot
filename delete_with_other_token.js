require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');

// Disable SSL verification for corporate proxies
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// Use the OTHER bot token
const OTHER_TOKEN = '8278091214:AAGgI5W_wu5o_cMPWf_rXimWGhCEI56NFU0';

const bot = new TelegramBot(OTHER_TOKEN, {
  request: {
    agentOptions: {
      rejectUnauthorized: false
    }
  }
});

const GROUP_ID = -1002032084985;

// Define the range of message IDs to delete
const START_ID = 1600;
const END_ID = 1695;

async function deleteWithOtherToken() {
  console.log(`🧹 Trying to delete messages with OTHER bot token`);
  console.log(`📊 Range: ${START_ID} to ${END_ID}`);
  
  try {
    const botInfo = await bot.getMe();
    console.log(`🤖 Using bot: @${botInfo.username} (ID: ${botInfo.id})`);
  } catch (err) {
    console.error('❌ Error getting bot info:', err.message);
    process.exit(1);
  }
  
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
    }
  }
  
  console.log('\n✅ Cleanup complete!');
  console.log(`🗑️  Deleted: ${deletedCount} messages`);
  console.log(`⏭️  Skipped: ${failedCount} messages`);
  
  process.exit(0);
}

deleteWithOtherToken();
