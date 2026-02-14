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

// Configuration
const GROUP_ID = process.argv[2]; // Pass group ID as argument
const MESSAGE_RANGE = parseInt(process.argv[3]) || 2000; // How many message IDs to try

if (!GROUP_ID) {
  console.error('Usage: node cleanup_messages.js <GROUP_ID> [MESSAGE_RANGE]');
  console.error('Example: node cleanup_messages.js -1001234567890 2000');
  process.exit(1);
}

async function cleanupMessages() {
  console.log(`🧹 Starting cleanup for group ${GROUP_ID}`);
  console.log(`📊 Will try to delete messages in range of ${MESSAGE_RANGE} IDs`);
  
  try {
    // Get a recent message to find current message ID
    console.log('📡 Getting chat info...');
    const chat = await bot.getChat(GROUP_ID);
    console.log(`✅ Found group: ${chat.title || 'Unknown'}`);
    
    // Get bot info
    const botInfo = await bot.getMe();
    console.log(`🤖 Bot: @${botInfo.username} (ID: ${botInfo.id})`);
    
    let deletedCount = 0;
    let failedCount = 0;
    let lastMessageId = null;
    
    // Try to send a test message to get current message ID
    try {
      const testMsg = await bot.sendMessage(GROUP_ID, '🧹 Cleanup script running...');
      lastMessageId = testMsg.message_id;
      await bot.deleteMessage(GROUP_ID, testMsg.message_id);
      console.log(`📍 Current message ID: ${lastMessageId}`);
    } catch (err) {
      console.error('❌ Could not send test message. Make sure bot is in the group and has permissions.');
      process.exit(1);
    }
    
    console.log('\n🗑️ Starting deletion process...\n');
    
    // Try deleting messages going backwards
    for (let i = 1; i <= MESSAGE_RANGE; i++) {
      const messageId = lastMessageId - i;
      
      try {
        await bot.deleteMessage(GROUP_ID, messageId);
        deletedCount++;
        
        // Show progress every 50 deletions
        if (deletedCount % 50 === 0) {
          console.log(`✅ Deleted ${deletedCount} messages so far...`);
        }
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 50));
        
      } catch (err) {
        failedCount++;
        
        // Show progress every 500 failures
        if (failedCount % 500 === 0) {
          console.log(`⏭️  Skipped ${failedCount} messages (not from bot or too old)...`);
        }
      }
    }
    
    console.log('\n✅ Cleanup complete!');
    console.log(`🗑️  Deleted: ${deletedCount} messages`);
    console.log(`⏭️  Skipped: ${failedCount} messages`);
    
    // Send final status to group
    const finalMsg = await bot.sendMessage(
      GROUP_ID,
      `✅ Cleanup complete!\n\n` +
      `🗑️ Deleted: ${deletedCount} messages\n` +
      `⏭️ Skipped: ${failedCount} messages\n\n` +
      `⏱️ This message will auto-delete in 10 seconds.`
    );
    
    // Delete final message after 10 seconds
    setTimeout(async () => {
      try {
        await bot.deleteMessage(GROUP_ID, finalMsg.message_id);
        console.log('✅ Cleanup message deleted');
        process.exit(0);
      } catch (err) {
        console.error('Could not delete final message');
        process.exit(0);
      }
    }, 10000);
    
  } catch (err) {
    console.error('❌ Error during cleanup:', err.message);
    process.exit(1);
  }
}

cleanupMessages();
