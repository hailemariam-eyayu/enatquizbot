require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const TOKEN = '8266496171:AAG36K5a3sSuHZkDXNViKbVorjBomb1WqvQ';
const bot = new TelegramBot(TOKEN, {
  request: {
    agentOptions: {
      rejectUnauthorized: false
    }
  }
});

const GROUP_ID = -1002032084985;
const START_ID = 1650; // Try a range around 1667
const END_ID = 1700;

async function debugDelete() {
  try {
    console.log(`🔍 Checking messages ${START_ID} to ${END_ID} in group ${GROUP_ID}`);
    console.log(`🤖 Using token: ${TOKEN.substring(0, 20)}...`);
    
    const botInfo = await bot.getMe();
    console.log(`✅ Bot: @${botInfo.username} (ID: ${botInfo.id})\n`);
    
    let foundMessages = [];
    let deletedCount = 0;
    
    for (let msgId = START_ID; msgId <= END_ID; msgId++) {
      try {
        await bot.deleteMessage(GROUP_ID, msgId);
        deletedCount++;
        console.log(`✅ Deleted message ${msgId}`);
        foundMessages.push(msgId);
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (err) {
        // Message doesn't exist or can't be deleted
      }
    }
    
    console.log(`\n📊 Results:`);
    console.log(`✅ Deleted: ${deletedCount} messages`);
    console.log(`📝 Message IDs deleted:`, foundMessages);
    
    if (deletedCount === 0) {
      console.log(`\n✅ No bot messages found in range ${START_ID}-${END_ID}`);
      console.log(`This means the messages were already deleted or don't exist!`);
    }
    
  } catch (err) {
    console.error(`❌ Error:`, err.message);
  }
  
  process.exit(0);
}

debugDelete();
