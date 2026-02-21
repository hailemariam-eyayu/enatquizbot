require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const bot = new TelegramBot(process.env.BOT_TOKEN, {
  request: {
    agentOptions: {
      rejectUnauthorized: false
    }
  }
});

const GROUP_ID = -1002032084985;

async function testDelete() {
  try {
    console.log('📤 Sending test message...');
    const msg = await bot.sendMessage(GROUP_ID, '🧪 Test message - will be deleted immediately');
    console.log(`✅ Sent message ID: ${msg.message_id}`);
    
    console.log('⏳ Waiting 2 seconds...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('🗑️ Trying to delete...');
    await bot.deleteMessage(GROUP_ID, msg.message_id);
    console.log('✅ Successfully deleted test message!');
    console.log('\n✅ Bot CAN delete its own messages!');
    console.log('❌ But old messages (1600-1695) were sent by a different source');
    
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
  
  process.exit(0);
}

testDelete();
