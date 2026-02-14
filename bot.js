require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const { initDatabase, saveDatabase } = require('./database');
const XLSX = require('xlsx');
const fs = require('fs');

let db;

// Helper functions for database operations
const dbRun = (sql, params = []) => {
  try {
    // Filter out undefined values and log warning
    const cleanParams = params.map((p, idx) => {
      if (p === undefined) {
        console.error(`Warning: Parameter ${idx} is undefined in SQL: ${sql}`);
        return null; // Convert undefined to null
      }
      return p;
    });
    
    const stmt = db.prepare(sql);
    stmt.bind(cleanParams);
    stmt.step();
    const lastID = db.exec('SELECT last_insert_rowid() as id')[0]?.values[0]?.[0] || 0;
    stmt.free();
    saveDatabase();
    return { lastID };
  } catch (err) {
    console.error('Database error in dbRun:', err);
    console.error('SQL:', sql);
    console.error('Params:', params);
    throw err;
  }
};

const dbGet = (sql, params = []) => {
  try {
    const cleanParams = params.map(p => p === undefined ? null : p);
    const stmt = db.prepare(sql);
    stmt.bind(cleanParams);
    let result = null;
    if (stmt.step()) {
      result = stmt.getAsObject();
    }
    stmt.free();
    return result;
  } catch (err) {
    console.error('Database error in dbGet:', err);
    console.error('SQL:', sql);
    console.error('Params:', params);
    throw err;
  }
};

const dbAll = (sql, params = []) => {
  try {
    const cleanParams = params.map(p => p === undefined ? null : p);
    const stmt = db.prepare(sql);
    stmt.bind(cleanParams);
    const results = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    stmt.free();
    return results;
  } catch (err) {
    console.error('Database error in dbAll:', err);
    console.error('SQL:', sql);
    console.error('Params:', params);
    throw err;
  }
};

let bot;

// Initialize database and bot
(async () => {
  db = await initDatabase();
  
  // Disable SSL verification for corporate proxies
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  
  bot = new TelegramBot(process.env.BOT_TOKEN, { 
    polling: true,
    request: {
      agentOptions: {
        rejectUnauthorized: false
      }
    }
  });
  console.log('🤖 Bot is running...');
  setupBot();
})();

function setupBot() {
const ADMIN_IDS = process.env.ADMIN_IDS.split(',').map(id => parseInt(id.trim()));
const SUPER_ADMIN_ID = ADMIN_IDS[0]; // First admin in .env is super admin

// User state management
const userStates = {};

// Helper functions
const isAdmin = async (userId) => {
  // Check if user is in .env ADMIN_IDS (super admin)
  if (ADMIN_IDS.includes(userId)) return true;
  
  // Check if user is in database admins table
  const admin = await dbGet('SELECT * FROM admins WHERE user_id = ?', [userId]);
  return admin !== null;
};

const isSuperAdmin = (userId) => {
  return userId === SUPER_ADMIN_ID;
};

// Send message that auto-deletes after specified time (only in groups)
const sendAutoDeleteMessage = async (chatId, text, options = {}, deleteAfterMs = 300000) => {
  try {
    const sentMessage = await bot.sendMessage(chatId, text, options);
    
    // Check if this is a group chat
    const chat = await bot.getChat(chatId);
    const isGroup = chat.type === 'group' || chat.type === 'supergroup';
    
    // Only auto-delete in groups, not in private chats
    if (isGroup) {
      setTimeout(async () => {
        try {
          await bot.deleteMessage(chatId, sentMessage.message_id);
        } catch (err) {
          // Message might already be deleted or too old
          console.error('Could not delete message:', err.message);
        }
      }, deleteAfterMs);
    }
    
    return sentMessage;
  } catch (err) {
    console.error('Error sending auto-delete message:', err);
    throw err;
  }
};

const getMainMenu = async (userId, isGroup = false) => {
  if (isGroup) {
    // In groups, only show user options
    return {
      inline_keyboard: [
        [{ text: '📚 Active Exams', callback_data: 'group_active_exams' }],
        [{ text: '📈 My Results', callback_data: 'group_my_results' }]
      ]
    };
  }
  
  const admin = await isAdmin(userId);
  const superAdmin = isSuperAdmin(userId);
  
  const keyboard = admin
    ? [
        [{ text: '📝 Create Exam' }, { text: '📋 My Exams' }],
        [{ text: '▶️ Start Exam' }, { text: '⏹️ End Exam' }],
        [{ text: '📊 View Results' }, { text: '✏️ Edit Questions' }],
        [{ text: '📤 Upload Questions' }, { text: '🗑️ Delete Exam' }],
        ...(superAdmin ? [[{ text: '👥 Manage Admins' }, { text: '👥 Manage Groups' }]] : [])
      ]
    : [
        [{ text: '📚 Active Exams' }, { text: '📈 My Results' }]
      ];
  
  return { keyboard, resize_keyboard: true };
};

// Start command
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const isGroup = msg.chat.type === 'group' || msg.chat.type === 'supergroup';
  
  if (isGroup) {
    // Check if group is authorized
    const authorized = await dbGet('SELECT * FROM authorized_groups WHERE group_id = ?', [chatId]);
    
    if (!authorized) {
      return bot.sendMessage(chatId, 
        '⚠️ This group is not authorized to use this bot.\n\n' +
        'Contact the bot admin to authorize this group.'
      );
    }
    
    const menu = await getMainMenu(userId, true);
    bot.sendMessage(chatId, 
      '📚 *Quiz Bot - Group Mode*\n\n' +
      'Use the buttons below to access exams:',
      { parse_mode: 'Markdown', reply_markup: menu }
    );
  } else {
    // Private chat
    const admin = await isAdmin(userId);
    const menu = await getMainMenu(userId);
    
    bot.sendMessage(chatId, 
      `Welcome to Quiz Bot! 🎓\n\n${admin ? 'You are an Admin.' : 'You are a User.'}\n\nUse the menu below to navigate.`,
      { reply_markup: menu }
    );
  }
});

// Menu command
bot.onText(/\/menu/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const isGroup = msg.chat.type === 'group' || msg.chat.type === 'supergroup';
  
  const menu = await getMainMenu(userId, isGroup);
  bot.sendMessage(chatId, '📱 Main Menu', {
    reply_markup: menu
  });
});

// Authorize group command (in group)
bot.onText(/\/authorize/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const isGroup = msg.chat.type === 'group' || msg.chat.type === 'supergroup';
  
  if (!isGroup) {
    return bot.sendMessage(chatId, '❌ This command only works in groups.');
  }
  
  if (!isSuperAdmin(userId)) {
    return bot.sendMessage(chatId, '❌ Only the super admin can authorize groups.');
  }
  
  // Check if already authorized
  const existing = await dbGet('SELECT * FROM authorized_groups WHERE group_id = ?', [chatId]);
  
  if (existing) {
    return bot.sendMessage(chatId, '✅ This group is already authorized!');
  }
  
  // Add group
  await dbRun(
    'INSERT INTO authorized_groups (group_id, group_name, added_by) VALUES (?, ?, ?)',
    [chatId, msg.chat.title, userId]
  );
  
  bot.sendMessage(chatId, 
    '✅ *Group Authorized!*\n\n' +
    'This group can now use the quiz bot.\n\n' +
    'Members can:\n' +
    '• View active exams\n' +
    '• Take exams\n' +
    '• View their results\n\n' +
    'Use /start to begin!',
    { parse_mode: 'Markdown' }
  );
});

// Cleanup bot messages in group (Admin only)
bot.onText(/\/cleanup/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const isGroup = msg.chat.type === 'group' || msg.chat.type === 'supergroup';
  
  if (!isGroup) {
    return bot.sendMessage(chatId, '❌ This command only works in groups.');
  }
  
  if (!(await isAdmin(userId))) {
    return bot.sendMessage(chatId, '❌ Only admins can use this command.');
  }
  
  const statusMsg = await bot.sendMessage(chatId, '🧹 Cleaning up bot messages...');
  
  try {
    let deletedCount = 0;
    let failedCount = 0;
    
    // Get bot info to identify bot messages
    const botInfo = await bot.getMe();
    const botId = botInfo.id;
    
    // Try to delete messages (Telegram limits: can only delete messages less than 48 hours old)
    // We'll try to delete the last 100 messages from the bot
    const messageId = msg.message_id;
    
    // Delete messages going backwards from current message
    for (let i = 1; i <= 100; i++) {
      try {
        await bot.deleteMessage(chatId, messageId - i);
        deletedCount++;
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 50));
      } catch (err) {
        failedCount++;
        // Stop if we hit too many failures (likely reached old messages or non-bot messages)
        if (failedCount > 20) break;
      }
    }
    
    // Delete the status message
    await bot.deleteMessage(chatId, statusMsg.message_id);
    
    // Send final status that auto-deletes
    const finalMsg = await bot.sendMessage(chatId, 
      `✅ Cleanup complete!\n\n` +
      `🗑️ Deleted: ${deletedCount} messages\n` +
      `⏱️ This message will auto-delete in 10 seconds.`
    );
    
    // Delete the cleanup command message
    try {
      await bot.deleteMessage(chatId, msg.message_id);
    } catch (err) {
      // Might not have permission
    }
    
    // Delete final status after 10 seconds
    setTimeout(async () => {
      try {
        await bot.deleteMessage(chatId, finalMsg.message_id);
      } catch (err) {
        console.error('Could not delete final message:', err.message);
      }
    }, 10000);
    
  } catch (err) {
    console.error('Error during cleanup:', err);
    await bot.editMessageText(
      '❌ Error during cleanup. Make sure the bot has delete message permissions.',
      {
        chat_id: chatId,
        message_id: statusMsg.message_id
      }
    );
  }
});

// Create Exam (Admin only)
bot.onText(/📝 Create Exam/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  
  if (!isAdmin(userId)) {
    return bot.sendMessage(chatId, '❌ Only admins can create exams.');
  }
  
  userStates[userId] = { action: 'create_exam', step: 'name' };
  bot.sendMessage(chatId, '📝 Enter exam name:', { reply_markup: { remove_keyboard: true } });
});

// My Exams (Admin only)
bot.onText(/📋 My Exams/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  
  if (!isAdmin(userId)) {
    return bot.sendMessage(chatId, '❌ Only admins can view this.');
  }
  
  const exams = await dbAll('SELECT * FROM exams WHERE created_by = ? ORDER BY created_at DESC', [userId]);
  
  if (exams.length === 0) {
    return bot.sendMessage(chatId, '📋 No exams created yet.');
  }
  
  let message = '📋 *Your Exams:*\n\n';
  exams.forEach(exam => {
    const status = exam.status === 'active' ? '🟢' : exam.status === 'ended' ? '🔴' : '⚪';
    message += `${status} *${exam.name}*\n`;
    message += `   ID: ${exam.id} | Status: ${exam.status}\n\n`;
  });
  
  bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
});

// Start Exam (Admin only)
bot.onText(/▶️ Start Exam/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  
  if (!isAdmin(userId)) {
    return bot.sendMessage(chatId, '❌ Only admins can start exams.');
  }
  
  const exams = await dbAll('SELECT * FROM exams WHERE created_by = ? AND status = ?', [userId, 'pending']);
  
  if (exams.length === 0) {
    return sendAutoDeleteMessage(chatId, '❌ No pending exams to start.');
  }
  
  const buttons = exams.map(exam => [{
    text: exam.name,
    callback_data: `start_exam_${exam.id}`
  }]);
  
  bot.sendMessage(chatId, '▶️ Select exam to start:', {
    reply_markup: { inline_keyboard: buttons }
  });
});

// End Exam (Admin only)
bot.onText(/⏹️ End Exam/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  
  if (!isAdmin(userId)) {
    return bot.sendMessage(chatId, '❌ Only admins can end exams.');
  }
  
  const exams = await dbAll('SELECT * FROM exams WHERE created_by = ? AND status = ?', [userId, 'active']);
  
  if (exams.length === 0) {
    return sendAutoDeleteMessage(chatId, '❌ No active exams to end.');
  }
  
  const buttons = exams.map(exam => [{
    text: exam.name,
    callback_data: `end_exam_${exam.id}`
  }]);
  
  bot.sendMessage(chatId, '⏹️ Select exam to end:', {
    reply_markup: { inline_keyboard: buttons }
  });
});

// View Results (Admin only)
bot.onText(/📊 View Results/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  
  if (!isAdmin(userId)) {
    return bot.sendMessage(chatId, '❌ Only admins can view results.');
  }
  
  // Show ALL ended exams (not just created by this admin)
  const exams = await dbAll('SELECT * FROM exams WHERE status = ? ORDER BY created_at DESC', ['ended']);
  
  if (exams.length === 0) {
    return sendAutoDeleteMessage(chatId, '❌ No ended exams yet.');
  }
  
  const buttons = exams.map(exam => {
    // Get creator info
    const creatorId = exam.created_by;
    const isOwner = creatorId === userId;
    const ownerLabel = isOwner ? ' (You)' : ` (Admin: ${creatorId})`;
    
    return [{
      text: `${exam.name}${ownerLabel}`,
      callback_data: `results_${exam.id}`
    }];
  });
  
  bot.sendMessage(chatId, '📊 Select exam to view results:', {
    reply_markup: { inline_keyboard: buttons }
  });
});

// Active Exams (User)
bot.onText(/📚 Active Exams/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  
  const exams = await dbAll('SELECT * FROM exams WHERE status = ?', ['active']);
  
  if (exams.length === 0) {
    return sendAutoDeleteMessage(chatId, '📚 No active exams at the moment.');
  }
  
  const buttons = exams.map(exam => [{
    text: exam.name,
    callback_data: `join_exam_${exam.id}`
  }]);
  
  bot.sendMessage(chatId, '📚 Select an exam to join:', {
    reply_markup: { inline_keyboard: buttons }
  });
});

// My Results (User)
bot.onText(/📈 My Results/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  
  const exams = await dbAll(
    'SELECT DISTINCT e.* FROM exams e JOIN participants p ON e.id = p.exam_id WHERE p.user_id = ? AND e.status = ?',
    [userId, 'ended']
  );
  
  if (exams.length === 0) {
    return sendAutoDeleteMessage(chatId, '📈 No completed exams yet.');
  }
  
  const buttons = exams.map(exam => [{
    text: exam.name,
    callback_data: `my_result_${exam.id}`
  }]);
  
  bot.sendMessage(chatId, '📈 Select exam to view your results:', {
    reply_markup: { inline_keyboard: buttons }
  });
});

// Delete Exam (Admin only)
bot.onText(/🗑️ Delete Exam/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  
  if (!isAdmin(userId)) {
    return bot.sendMessage(chatId, '❌ Only admins can delete exams.');
  }
  
  const exams = await dbAll('SELECT * FROM exams WHERE created_by = ? ORDER BY created_at DESC', [userId]);
  
  if (exams.length === 0) {
    return bot.sendMessage(chatId, '❌ No exams to delete.');
  }
  
  const buttons = exams.map(exam => {
    const status = exam.status === 'active' ? '🟢' : exam.status === 'ended' ? '🔴' : '⚪';
    return [{
      text: `${status} ${exam.name} (${exam.status})`,
      callback_data: `confirm_delete_exam_${exam.id}`
    }];
  });
  
  bot.sendMessage(chatId, '🗑️ Select exam to delete:', {
    reply_markup: { inline_keyboard: buttons }
  });
});

// Edit Questions (Admin only)
bot.onText(/✏️ Edit Questions/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  
  if (!isAdmin(userId)) {
    return bot.sendMessage(chatId, '❌ Only admins can edit questions.');
  }
  
  const exams = await dbAll('SELECT * FROM exams WHERE created_by = ? AND status = ? ORDER BY created_at DESC', [userId, 'pending']);
  
  if (exams.length === 0) {
    return bot.sendMessage(chatId, '❌ No pending exams. You can only edit questions in pending exams.');
  }
  
  const buttons = exams.map(exam => [{
    text: exam.name,
    callback_data: `select_exam_edit_${exam.id}`
  }]);
  
  bot.sendMessage(chatId, '✏️ Select exam to edit questions:', {
    reply_markup: { inline_keyboard: buttons }
  });
});

// Upload Questions (Admin only)
bot.onText(/📤 Upload Questions/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  
  if (!(await isAdmin(userId))) {
    return bot.sendMessage(chatId, '❌ Only admins can upload questions.');
  }
  
  const exams = await dbAll('SELECT * FROM exams WHERE created_by = ? AND status = ? ORDER BY created_at DESC', [userId, 'pending']);
  
  if (exams.length === 0) {
    return bot.sendMessage(chatId, '❌ No pending exams. Create an exam first.');
  }
  
  const buttons = exams.map(exam => [{
    text: exam.name,
    callback_data: `select_exam_upload_${exam.id}`
  }]);
  
  bot.sendMessage(chatId, '📤 Select exam to upload questions:', {
    reply_markup: { inline_keyboard: buttons }
  });
});

// Manage Groups (Super Admin only)
bot.onText(/👥 Manage Groups/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  
  if (!isSuperAdmin(userId)) {
    return bot.sendMessage(chatId, '❌ Only the super admin can manage groups.');
  }
  
  const groups = await dbAll('SELECT * FROM authorized_groups ORDER BY added_at DESC');
  
  let message = '👥 *Group Management*\n\n';
  
  if (groups.length > 0) {
    message += '*Authorized Groups:*\n';
    groups.forEach((group, idx) => {
      message += `${idx + 1}. ${group.group_name || 'Unknown'} (${group.group_id})\n`;
    });
  } else {
    message += '_No authorized groups yet._\n';
  }
  
  message += '\n*How to authorize a group:*\n';
  message += '1. Add this bot to your group\n';
  message += '2. Make the bot an admin\n';
  message += '3. Send /authorize in the group\n';
  
  const buttons = [
    ...(groups.length > 0 ? [[{ text: '➖ Remove Group', callback_data: 'remove_group' }]] : []),
    [{ text: '« Back', callback_data: 'back_to_menu' }]
  ];
  
  bot.sendMessage(chatId, message, {
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: buttons }
  });
});
bot.onText(/👥 Manage Admins/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  
  if (!isSuperAdmin(userId)) {
    return bot.sendMessage(chatId, '❌ Only the super admin can manage admins.');
  }
  
  const admins = await dbAll('SELECT * FROM admins ORDER BY added_at DESC');
  
  let message = '👥 *Admin Management*\n\n';
  message += `🔑 Super Admin: You (${userId})\n\n`;
  
  if (admins.length > 0) {
    message += '*Other Admins:*\n';
    admins.forEach((admin, idx) => {
      message += `${idx + 1}. ${admin.first_name || admin.username || 'User'} (${admin.user_id})\n`;
    });
  } else {
    message += '_No other admins yet._\n';
  }
  
  const buttons = [
    [{ text: '➕ Add Admin', callback_data: 'add_admin' }],
    ...(admins.length > 0 ? [[{ text: '➖ Remove Admin', callback_data: 'remove_admin' }]] : []),
    [{ text: '« Back', callback_data: 'back_to_menu' }]
  ];
  
  bot.sendMessage(chatId, message, {
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: buttons }
  });
});

// Handle text messages (state-based)
bot.on('message', async (msg) => {
  if (!msg.text || msg.text.startsWith('/') || msg.text.startsWith('📝') || 
      msg.text.startsWith('📋') || msg.text.startsWith('▶️') || 
      msg.text.startsWith('⏹️') || msg.text.startsWith('📊') ||
      msg.text.startsWith('📚') || msg.text.startsWith('📈') ||
      msg.text.startsWith('✏️') || msg.text.startsWith('🗑️') ||
      msg.text.startsWith('📤')) {
    return;
  }
  
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const state = userStates[userId];
  
  if (!state) return;
  
  // Create exam flow
  if (state.action === 'create_exam') {
    if (state.step === 'name') {
      state.examName = msg.text;
      state.step = 'start_time';
      bot.sendMessage(chatId, '⏰ Enter start time (minutes from now, or 0 for immediate):');
    } else if (state.step === 'start_time') {
      const minutes = parseInt(msg.text);
      if (isNaN(minutes) || minutes < 0) {
        return bot.sendMessage(chatId, '❌ Invalid time. Enter a number >= 0:');
      }
      state.startTime = Math.floor(Date.now() / 1000) + (minutes * 60);
      state.step = 'confirm';
      
      const result = await dbRun(
        'INSERT INTO exams (name, start_time, created_by) VALUES (?, ?, ?)',
        [state.examName, state.startTime, userId]
      );
      
      state.examId = result.lastID;
      
      bot.sendMessage(chatId, 
        `✅ Exam "${state.examName}" created!\n\nNow add questions.`,
        { reply_markup: {
          inline_keyboard: [[
            { text: '➕ Add Question', callback_data: `add_question_${state.examId}` },
            { text: '✅ Done', callback_data: `done_exam_${state.examId}` }
          ]]
        }}
      );
      
      delete userStates[userId];
    }
  }
  
  // Add question flow
  if (state.action === 'add_question') {
    if (state.step === 'text') {
      state.questionText = msg.text;
      state.step = 'options';
      bot.sendMessage(chatId, '📝 Enter options (one per line, minimum 2):');
    } else if (state.step === 'options') {
      const options = msg.text.split('\n').map(o => o.trim()).filter(o => o);
      if (options.length < 2) {
        return bot.sendMessage(chatId, '❌ Need at least 2 options. Try again:');
      }
      state.options = options;
      state.step = 'correct';
      
      let optionsText = 'Select correct answer:\n\n';
      options.forEach((opt, idx) => {
        optionsText += `${idx + 1}. ${opt}\n`;
      });
      
      const buttons = options.map((opt, idx) => [{
        text: `${idx + 1}. ${opt}`,
        callback_data: `correct_${state.examId}_${idx}`
      }]);
      
      bot.sendMessage(chatId, optionsText, {
        reply_markup: { inline_keyboard: buttons }
      });
    } else if (state.step === 'explanation') {
      state.explanation = msg.text === '-' ? null : msg.text;
      
      await dbRun(
        'INSERT INTO questions (exam_id, question_text, options, correct_option, explanation) VALUES (?, ?, ?, ?, ?)',
        [state.examId, state.questionText, JSON.stringify(state.options), state.correctOption, state.explanation]
      );
      
      bot.sendMessage(chatId, '✅ Question added!', {
        reply_markup: {
          inline_keyboard: [[
            { text: '➕ Add Another', callback_data: `add_question_${state.examId}` },
            { text: '✅ Done', callback_data: `done_exam_${state.examId}` }
          ]]
        }
      });
      
      delete userStates[userId];
    }
  }
  
  // Edit question flows
  if (state.action === 'edit_question_text') {
    dbRun('UPDATE questions SET question_text = ? WHERE id = ?', [msg.text, state.questionId]);
    bot.sendMessage(chatId, '✅ Question text updated!');
    
    setTimeout(() => {
      bot.emit('callback_query', { 
        message: { chat: { id: chatId } },
        from: { id: userId },
        data: `edit_q_${state.questionId}`,
        id: Date.now().toString()
      });
    }, 500);
    
    delete userStates[userId];
  }
  
  if (state.action === 'edit_question_options') {
    const options = msg.text.split('\n').map(o => o.trim()).filter(o => o);
    if (options.length < 2) {
      return bot.sendMessage(chatId, '❌ Need at least 2 options. Try again:');
    }
    
    const question = await dbGet('SELECT * FROM questions WHERE id = ?', [state.questionId]);
    const oldOptions = JSON.parse(question.options);
    
    // Reset correct option if it's out of range
    let newCorrectOption = question.correct_option;
    if (newCorrectOption >= options.length) {
      newCorrectOption = 0;
    }
    
    dbRun('UPDATE questions SET options = ?, correct_option = ? WHERE id = ?', 
      [JSON.stringify(options), newCorrectOption, state.questionId]);
    
    bot.sendMessage(chatId, '✅ Options updated!');
    
    if (question.correct_option >= options.length) {
      bot.sendMessage(chatId, '⚠️ Correct answer was reset to option 1. Please update it.');
    }
    
    setTimeout(() => {
      bot.emit('callback_query', { 
        message: { chat: { id: chatId } },
        from: { id: userId },
        data: `edit_q_${state.questionId}`,
        id: Date.now().toString()
      });
    }, 500);
    
    delete userStates[userId];
  }
  
  if (state.action === 'edit_question_explanation') {
    const explanation = msg.text === '-' ? null : msg.text;
    dbRun('UPDATE questions SET explanation = ? WHERE id = ?', [explanation, state.questionId]);
    bot.sendMessage(chatId, '✅ Explanation updated!');
    
    setTimeout(() => {
      bot.emit('callback_query', { 
        message: { chat: { id: chatId } },
        from: { id: userId },
        data: `edit_q_${state.questionId}`,
        id: Date.now().toString()
      });
    }, 500);
    
    delete userStates[userId];
  }
  
  // Add admin flow
  if (state.action === 'add_admin') {
    const newAdminId = parseInt(msg.text);
    
    if (isNaN(newAdminId)) {
      return bot.sendMessage(chatId, '❌ Invalid user ID. Please send a valid number.');
    }
    
    if (ADMIN_IDS.includes(newAdminId)) {
      return bot.sendMessage(chatId, '❌ This user is already a super admin.');
    }
    
    const existingAdmin = await dbGet('SELECT * FROM admins WHERE user_id = ?', [newAdminId]);
    
    if (existingAdmin) {
      return bot.sendMessage(chatId, '❌ This user is already an admin.');
    }
    
    // Try to get user info
    try {
      const userInfo = await bot.getChat(newAdminId);
      
      await dbRun(
        'INSERT INTO admins (user_id, username, first_name, added_by) VALUES (?, ?, ?, ?)',
        [newAdminId, userInfo.username, userInfo.first_name, userId]
      );
      
      bot.sendMessage(chatId, `✅ Admin added successfully!\n\nUser: ${userInfo.first_name || userInfo.username || newAdminId}`);
      
      // Notify the new admin
      try {
        const menu = await getMainMenu(newAdminId);
        bot.sendMessage(newAdminId, 
          '🎉 Congratulations! You have been added as an admin.\n\nUse /start to see your admin menu.',
          { reply_markup: menu }
        );
      } catch (err) {
        bot.sendMessage(chatId, '⚠️ Admin added but could not notify them. They need to start the bot first.');
      }
      
    } catch (err) {
      // User not found or bot blocked
      await dbRun(
        'INSERT INTO admins (user_id, username, first_name, added_by) VALUES (?, ?, ?, ?)',
        [newAdminId, null, null, userId]
      );
      
      bot.sendMessage(chatId, 
        `✅ Admin added successfully!\n\n` +
        `User ID: ${newAdminId}\n\n` +
        `⚠️ Note: Could not fetch user info. They need to start the bot to see admin features.`
      );
    }
    
    delete userStates[userId];
  }
});

// Callback query handler
bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  const userId = query.from.id;
  const data = query.data;
  
  // Log callback data for debugging edit questions
  if (data.startsWith('edit_q')) {
    console.log(`Edit question callback: ${data}`);
  }
  
  bot.answerCallbackQuery(query.id);
  
  // Add question
  if (data.startsWith('add_question_')) {
    const examId = parseInt(data.split('_')[2]);
    userStates[userId] = { action: 'add_question', step: 'text', examId };
    bot.sendMessage(chatId, '❓ Enter question text:');
  }
  
  // Done adding questions
  else if (data.startsWith('done_exam_')) {
    bot.sendMessage(chatId, '✅ Exam setup complete!', {
      reply_markup: getMainMenu(userId)
    });
  }
  
  // Confirm delete exam
  else if (data.startsWith('confirm_delete_exam_')) {
    const examId = parseInt(data.split('_')[3]);
    
    const exam = await dbGet('SELECT * FROM exams WHERE id = ?', [examId]);
    
    if (!exam) {
      return bot.sendMessage(chatId, '❌ Exam not found.');
    }
    
    const questions = await dbAll('SELECT * FROM questions WHERE exam_id = ?', [examId]);
    const participants = await dbAll('SELECT * FROM participants WHERE exam_id = ?', [examId]);
    
    const buttons = [
      [
        { text: '✅ Yes, Delete', callback_data: `delete_exam_${examId}` },
        { text: '❌ Cancel', callback_data: 'back_to_menu' }
      ]
    ];
    
    bot.sendMessage(chatId, 
      `⚠️ *Confirm Deletion*\n\n` +
      `Exam: *${exam.name}*\n` +
      `Status: ${exam.status}\n` +
      `Questions: ${questions.length}\n` +
      `Participants: ${participants.length}\n\n` +
      `This will permanently delete the exam and all related data. Are you sure?`,
      { 
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: buttons }
      }
    );
  }
  
  // Delete exam
  else if (data.startsWith('delete_exam_')) {
    const examId = parseInt(data.split('_')[2]);
    
    const exam = await dbGet('SELECT * FROM exams WHERE id = ?', [examId]);
    
    if (!exam) {
      return bot.sendMessage(chatId, '❌ Exam not found.');
    }
    
    // Delete all related data
    dbRun('DELETE FROM user_answers WHERE exam_id = ?', [examId]);
    dbRun('DELETE FROM participants WHERE exam_id = ?', [examId]);
    dbRun('DELETE FROM questions WHERE exam_id = ?', [examId]);
    dbRun('DELETE FROM exams WHERE id = ?', [examId]);
    
    bot.sendMessage(chatId, `✅ Exam "${exam.name}" and all related data deleted successfully!`, {
      reply_markup: getMainMenu(userId)
    });
  }
  
  // Back to menu
  else if (data === 'back_to_menu') {
    const menu = await getMainMenu(userId);
    bot.sendMessage(chatId, '👍 Back to main menu', {
      reply_markup: menu
    });
  }
  
  // Add admin
  else if (data === 'add_admin') {
    if (!isSuperAdmin(userId)) {
      return bot.sendMessage(chatId, '❌ Only super admin can add admins.');
    }
    
    userStates[userId] = { action: 'add_admin' };
    bot.sendMessage(chatId, 
      '➕ *Add New Admin*\n\n' +
      'Send the user ID of the person you want to make admin.\n\n' +
      '_Tip: Ask them to message @userinfobot to get their user ID._',
      { parse_mode: 'Markdown' }
    );
  }
  
  // Remove admin
  else if (data === 'remove_admin') {
    if (!isSuperAdmin(userId)) {
      return bot.sendMessage(chatId, '❌ Only super admin can remove admins.');
    }
    
    const admins = await dbAll('SELECT * FROM admins ORDER BY added_at DESC');
    
    if (admins.length === 0) {
      return bot.sendMessage(chatId, '❌ No admins to remove.');
    }
    
    const buttons = admins.map(admin => [{
      text: `${admin.first_name || admin.username || 'User'} (${admin.user_id})`,
      callback_data: `confirm_remove_admin_${admin.user_id}`
    }]);
    
    buttons.push([{ text: '« Back', callback_data: 'back_to_menu' }]);
    
    bot.sendMessage(chatId, '➖ Select admin to remove:', {
      reply_markup: { inline_keyboard: buttons }
    });
  }
  
  // Remove group
  else if (data === 'remove_group') {
    if (!isSuperAdmin(userId)) {
      return bot.sendMessage(chatId, '❌ Only super admin can remove groups.');
    }
    
    const groups = await dbAll('SELECT * FROM authorized_groups ORDER BY added_at DESC');
    
    if (groups.length === 0) {
      return bot.sendMessage(chatId, '❌ No groups to remove.');
    }
    
    const buttons = groups.map(group => [{
      text: `${group.group_name || 'Unknown'} (${group.group_id})`,
      callback_data: `confirm_remove_group_${group.group_id}`
    }]);
    
    buttons.push([{ text: '« Back', callback_data: 'back_to_menu' }]);
    
    bot.sendMessage(chatId, '➖ Select group to remove:', {
      reply_markup: { inline_keyboard: buttons }
    });
  }
  
  // Confirm remove group
  else if (data.startsWith('confirm_remove_group_')) {
    const groupId = parseInt(data.split('_')[3]);
    
    if (!isSuperAdmin(userId)) {
      return bot.sendMessage(chatId, '❌ Only super admin can remove groups.');
    }
    
    const group = await dbGet('SELECT * FROM authorized_groups WHERE group_id = ?', [groupId]);
    
    if (!group) {
      return bot.sendMessage(chatId, '❌ Group not found.');
    }
    
    dbRun('DELETE FROM authorized_groups WHERE group_id = ?', [groupId]);
    
    bot.sendMessage(chatId, `✅ Group "${group.group_name}" removed successfully!`);
    
    // Notify the group
    try {
      bot.sendMessage(groupId, '⚠️ This group has been deauthorized from using the quiz bot.');
    } catch (err) {
      // Group might not exist or bot was removed
    }
  }
  
  // Group: Active Exams
  else if (data === 'group_active_exams') {
    const isGroup = query.message.chat.type === 'group' || query.message.chat.type === 'supergroup';
    
    if (!isGroup) {
      return bot.sendMessage(chatId, '❌ This feature only works in groups.');
    }
    
    // Check if group is authorized
    const authorized = await dbGet('SELECT * FROM authorized_groups WHERE group_id = ?', [chatId]);
    
    if (!authorized) {
      return bot.sendMessage(chatId, '❌ This group is not authorized.');
    }
    
    // Get active exams for this group or all groups
    const exams = await dbAll('SELECT * FROM exams WHERE status = ? AND (group_id = ? OR group_id IS NULL)', ['active', chatId]);
    
    if (exams.length === 0) {
      return sendAutoDeleteMessage(chatId, '📚 No active exams at the moment.');
    }
    
    const buttons = exams.map(exam => [{
      text: exam.name,
      callback_data: `join_exam_${exam.id}`
    }]);
    
    bot.sendMessage(chatId, '📚 Select an exam to join:', {
      reply_markup: { inline_keyboard: buttons }
    });
  }
  
  // Group: My Results
  else if (data === 'group_my_results') {
    const isGroup = query.message.chat.type === 'group' || query.message.chat.type === 'supergroup';
    
    if (!isGroup) {
      return bot.sendMessage(chatId, '❌ This feature only works in groups.');
    }
    
    const exams = await dbAll(
      'SELECT DISTINCT e.* FROM exams e JOIN participants p ON e.id = p.exam_id WHERE p.user_id = ? AND e.status = ?',
      [userId, 'ended']
    );
    
    if (exams.length === 0) {
      return bot.sendMessage(chatId, '📈 No completed exams yet.');
    }
    
    const buttons = exams.map(exam => [{
      text: exam.name,
      callback_data: `my_result_${exam.id}`
    }]);
    
    bot.sendMessage(chatId, '📈 Select exam to view your results:', {
      reply_markup: { inline_keyboard: buttons }
    });
  }
  
  // Confirm remove admin
  else if (data.startsWith('confirm_remove_admin_')) {
    const adminId = parseInt(data.split('_')[3]);
    
    if (!isSuperAdmin(userId)) {
      return bot.sendMessage(chatId, '❌ Only super admin can remove admins.');
    }
    
    const admin = await dbGet('SELECT * FROM admins WHERE user_id = ?', [adminId]);
    
    if (!admin) {
      return bot.sendMessage(chatId, '❌ Admin not found.');
    }
    
    dbRun('DELETE FROM admins WHERE user_id = ?', [adminId]);
    
    bot.sendMessage(chatId, `✅ Admin ${admin.first_name || admin.username || adminId} removed successfully!`);
    
    // Notify the removed admin
    try {
      bot.sendMessage(adminId, '⚠️ You have been removed as an admin.');
    } catch (err) {
      // User might have blocked the bot
    }
  }
  
  // Select exam to upload questions
  else if (data.startsWith('select_exam_upload_')) {
    const examId = parseInt(data.split('_')[3]);
    
    userStates[userId] = { action: 'upload_questions', examId };
    
    const formatExample = 
      `📤 *Upload Questions File*\n\n` +
      `Send a .txt file with this format:\n\n` +
      `\`\`\`\n` +
      `1. What is 2+2?\n` +
      `A. 3\n` +
      `B. 4\n` +
      `C. 5\n` +
      `D. 6\n` +
      `Ans: B\n` +
      `Explain: Basic addition\n\n` +
      `2. Capital of France?\n` +
      `A. London\n` +
      `B. Paris\n` +
      `C. Berlin\n` +
      `Ans: B\n` +
      `Explain: Paris is the capital\n` +
      `\`\`\`\n\n` +
      `*Format Rules:*\n` +
      `• Start with number and dot (1., 2., etc.)\n` +
      `• Options: A., B., C., D. (one per line)\n` +
      `• Ans: followed by letter (A, B, C, or D)\n` +
      `• Explain: followed by explanation (optional)\n` +
      `• Blank line between questions\n\n` +
      `Now send your .txt file:`;
    
    bot.sendMessage(chatId, formatExample, { parse_mode: 'Markdown' });
  }
  
  // Select exam to edit questions
  else if (data.startsWith('select_exam_edit_')) {
    const examId = parseInt(data.split('_')[3]);
    
    const questions = await dbAll('SELECT * FROM questions WHERE exam_id = ?', [examId]);
    
    if (questions.length === 0) {
      return bot.sendMessage(chatId, '❌ No questions in this exam to edit.');
    }
    
    const buttons = questions.map((q, idx) => [{
      text: `${idx + 1}. ${q.question_text.substring(0, 50)}...`,
      callback_data: `edit_q_${q.id}`
    }]);
    
    buttons.push([{ text: '« Back', callback_data: 'back_to_menu' }]);
    
    bot.sendMessage(chatId, '✏️ Select question to edit:', {
      reply_markup: { inline_keyboard: buttons }
    });
  }
  
  // Edit question - show options
  else if (data.startsWith('edit_q_')) {
    const questionId = parseInt(data.split('_')[2]);
    
    const question = await dbGet('SELECT * FROM questions WHERE id = ?', [questionId]);
    
    if (!question) {
      return bot.sendMessage(chatId, '❌ Question not found.');
    }
    
    const options = JSON.parse(question.options);
    
    let message = `📝 *Current Question:*\n\n`;
    message += `*Q:* ${question.question_text}\n\n`;
    message += `*Options:*\n`;
    options.forEach((opt, idx) => {
      const marker = idx === question.correct_option ? '✅' : '  ';
      message += `${marker} ${idx + 1}. ${opt}\n`;
    });
    
    if (question.explanation) {
      message += `\n*Explanation:* ${question.explanation}`;
    }
    
    const buttons = [
      [{ text: '✏️ Edit Question Text', callback_data: `edit_q_text_${questionId}` }],
      [{ text: '✏️ Edit Options', callback_data: `edit_q_options_${questionId}` }],
      [{ text: '✏️ Change Correct Answer', callback_data: `edit_q_correct_${questionId}` }],
      [{ text: '✏️ Edit Explanation', callback_data: `edit_q_explanation_${questionId}` }],
      [{ text: '🗑️ Delete Question', callback_data: `delete_single_q_${questionId}` }],
      [{ text: '« Back', callback_data: `select_exam_edit_${question.exam_id}` }]
    ];
    
    try {
      await bot.sendMessage(chatId, message, {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: buttons }
      });
    } catch (err) {
      console.error('Error sending edit question message:', err);
      bot.sendMessage(chatId, '❌ Error displaying question. Please try again.');
    }
  }
  
  // Edit question text
  else if (data.startsWith('edit_q_text_')) {
    const questionId = parseInt(data.split('_')[3]);
    userStates[userId] = { action: 'edit_question_text', questionId };
    bot.sendMessage(chatId, '✏️ Enter new question text:');
  }
  
  // Edit options
  else if (data.startsWith('edit_q_options_')) {
    const questionId = parseInt(data.split('_')[3]);
    userStates[userId] = { action: 'edit_question_options', questionId };
    bot.sendMessage(chatId, '✏️ Enter new options (one per line, minimum 2):');
  }
  
  // Change correct answer
  else if (data.startsWith('edit_q_correct_')) {
    const questionId = parseInt(data.split('_')[3]);
    
    const question = await dbGet('SELECT * FROM questions WHERE id = ?', [questionId]);
    const options = JSON.parse(question.options);
    
    const buttons = options.map((opt, idx) => [{
      text: `${idx + 1}. ${opt}`,
      callback_data: `set_correct_${questionId}_${idx}`
    }]);
    
    buttons.push([{ text: '« Back', callback_data: `edit_q_${questionId}` }]);
    
    bot.sendMessage(chatId, '✏️ Select new correct answer:', {
      reply_markup: { inline_keyboard: buttons }
    });
  }
  
  // Set correct answer
  else if (data.startsWith('set_correct_')) {
    const parts = data.split('_');
    const questionId = parseInt(parts[2]);
    const correctIdx = parseInt(parts[3]);
    
    dbRun('UPDATE questions SET correct_option = ? WHERE id = ?', [correctIdx, questionId]);
    
    bot.sendMessage(chatId, '✅ Correct answer updated!');
    
    // Show question again
    setTimeout(() => {
      bot.emit('callback_query', { 
        message: { chat: { id: chatId } },
        from: { id: userId },
        data: `edit_q_${questionId}`,
        id: Date.now().toString()
      });
    }, 500);
  }
  
  // Edit explanation
  else if (data.startsWith('edit_q_explanation_')) {
    const questionId = parseInt(data.split('_')[3]);
    userStates[userId] = { action: 'edit_question_explanation', questionId };
    bot.sendMessage(chatId, '✏️ Enter new explanation (or "-" to remove):');
  }
  
  // Delete single question
  else if (data.startsWith('delete_single_q_')) {
    const questionId = parseInt(data.split('_')[3]);
    
    const question = await dbGet('SELECT * FROM questions WHERE id = ?', [questionId]);
    
    if (!question) {
      return bot.sendMessage(chatId, '❌ Question not found.');
    }
    
    dbRun('DELETE FROM questions WHERE id = ?', [questionId]);
    dbRun('DELETE FROM user_answers WHERE question_id = ?', [questionId]);
    
    bot.sendMessage(chatId, '✅ Question deleted!');
    
    // Go back to exam questions list
    setTimeout(() => {
      bot.emit('callback_query', { 
        message: { chat: { id: chatId } },
        from: { id: userId },
        data: `select_exam_edit_${question.exam_id}`,
        id: Date.now().toString()
      });
    }, 500);
  }
  
  // Select correct answer
  else if (data.startsWith('correct_')) {
    const parts = data.split('_');
    const examId = parseInt(parts[1]);
    const correctIdx = parseInt(parts[2]);
    
    userStates[userId].correctOption = correctIdx;
    userStates[userId].step = 'explanation';
    
    bot.sendMessage(chatId, '💡 Enter explanation (or "-" to skip):');
  }
  
  // Start exam - select target
  else if (data.startsWith('start_exam_')) {
    const examId = parseInt(data.split('_')[2]);
    
    const questions = await dbAll('SELECT * FROM questions WHERE exam_id = ?', [examId]);
    
    if (questions.length === 0) {
      return bot.sendMessage(chatId, '❌ Cannot start exam without questions! Add questions first.');
    }
    
    // Show target selection (groups + bot users)
    const groups = await dbAll('SELECT * FROM authorized_groups ORDER BY group_name ASC');
    
    let message = '🎯 *Select where to publish this exam:*\n\n';
    message += 'Choose one or more destinations:\n';
    
    const buttons = [];
    
    // Add "Bot Users" option
    buttons.push([{ text: '🤖 Bot Users (Private Chat)', callback_data: `target_bot_${examId}` }]);
    
    // Add each group
    groups.forEach(group => {
      buttons.push([{ 
        text: `👥 ${group.group_name || 'Unknown Group'}`, 
        callback_data: `target_group_${examId}_${group.group_id}` 
      }]);
    });
    
    // Add "All" option
    buttons.push([{ text: '🌐 All (Bot + All Groups)', callback_data: `target_all_${examId}` }]);
    buttons.push([{ text: '« Back', callback_data: 'back_to_menu' }]);
    
    bot.sendMessage(chatId, message, {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: buttons }
    });
  }
  
  // Target: Bot users
  else if (data.startsWith('target_bot_')) {
    const examId = parseInt(data.split('_')[2]);
    
    await dbRun('UPDATE exams SET status = ?, start_time = ?, group_id = ? WHERE id = ?', 
      ['active', Math.floor(Date.now() / 1000), null, examId]);
    
    const exam = await dbGet('SELECT * FROM exams WHERE id = ?', [examId]);
    const questions = await dbAll('SELECT * FROM questions WHERE exam_id = ?', [examId]);
    
    bot.sendMessage(chatId, `✅ Exam "${exam.name}" is now active for Bot Users with ${questions.length} questions!`);
  }
  
  // Target: Specific group
  else if (data.startsWith('target_group_')) {
    const parts = data.split('_');
    const examId = parseInt(parts[2]);
    // Group ID might be negative, so we need to handle it properly
    const groupId = parts.slice(3).join('_'); // Join remaining parts in case of negative numbers
    const groupIdNum = parseInt(groupId);
    
    await dbRun('UPDATE exams SET status = ?, start_time = ?, group_id = ? WHERE id = ?', 
      ['active', Math.floor(Date.now() / 1000), groupIdNum, examId]);
    
    const exam = await dbGet('SELECT * FROM exams WHERE id = ?', [examId]);
    const group = await dbGet('SELECT * FROM authorized_groups WHERE group_id = ?', [groupIdNum]);
    const questions = await dbAll('SELECT * FROM questions WHERE exam_id = ?', [examId]);
    
    bot.sendMessage(chatId, `✅ Exam "${exam.name}" is now active in group "${group.group_name}" with ${questions.length} questions!`);
    
    // Notify the group
    try {
      const menu = await getMainMenu(userId, true);
      bot.sendMessage(groupIdNum, 
        `📢 *New Exam Available!*\n\n` +
        `📝 ${exam.name}\n` +
        `❓ ${questions.length} questions\n\n` +
        `Click the button below to start:`,
        { parse_mode: 'Markdown', reply_markup: menu }
      );
    } catch (err) {
      bot.sendMessage(chatId, '⚠️ Exam started but could not notify the group.');
    }
  }
  
  // Target: All
  else if (data.startsWith('target_all_')) {
    const examId = parseInt(data.split('_')[2]);
    
    await dbRun('UPDATE exams SET status = ?, start_time = ?, group_id = ? WHERE id = ?', 
      ['active', Math.floor(Date.now() / 1000), null, examId]);
    
    const exam = await dbGet('SELECT * FROM exams WHERE id = ?', [examId]);
    const questions = await dbAll('SELECT * FROM questions WHERE exam_id = ?', [examId]);
    const groups = await dbAll('SELECT * FROM authorized_groups');
    
    bot.sendMessage(chatId, `✅ Exam "${exam.name}" is now active for Bot Users and ${groups.length} groups with ${questions.length} questions!`);
    
    // Notify all groups
    const menu = await getMainMenu(userId, true);
    for (const group of groups) {
      try {
        bot.sendMessage(group.group_id, 
          `📢 *New Exam Available!*\n\n` +
          `📝 ${exam.name}\n` +
          `❓ ${questions.length} questions\n\n` +
          `Click the button below to start:`,
          { parse_mode: 'Markdown', reply_markup: menu }
        );
      } catch (err) {
        // Group might not exist or bot was removed
      }
    }
  }
  
  // End exam
  else if (data.startsWith('end_exam_')) {
    const examId = parseInt(data.split('_')[2]);
    
    await dbRun('UPDATE exams SET status = ?, end_time = ? WHERE id = ?', 
      ['ended', Math.floor(Date.now() / 1000), examId]);
    
    const exam = await dbGet('SELECT * FROM exams WHERE id = ?', [examId]);
    
    bot.sendMessage(chatId, `✅ Exam "${exam.name}" has ended!`);
    
    // Notify participants
    const participants = await dbAll('SELECT DISTINCT user_id FROM participants WHERE exam_id = ?', [examId]);
    participants.forEach(p => {
      bot.sendMessage(p.user_id, 
        `📢 Exam "${exam.name}" has ended! Check your results.`,
        { reply_markup: {
          inline_keyboard: [[{ text: '📈 View Results', callback_data: `my_result_${examId}` }]]
        }}
      );
    });
  }
  
  // Join exam
  else if (data.startsWith('join_exam_')) {
    const examId = parseInt(data.split('_')[2]);
    
    // Check if user already joined this exam
    const alreadyJoined = await dbGet(
      'SELECT * FROM participants WHERE user_id = ? AND exam_id = ?',
      [userId, examId]
    );
    
    if (alreadyJoined) {
      return sendAutoDeleteMessage(chatId, '❌ You have already joined this exam. You can only take each exam once.');
    }
    
    const questions = await dbAll('SELECT * FROM questions WHERE exam_id = ?', [examId]);
    
    if (questions.length === 0) {
      return sendAutoDeleteMessage(chatId, '❌ This exam has no questions yet. Please wait for the admin to add questions.');
    }
    
    // Add participant
    await dbRun(
      'INSERT OR IGNORE INTO participants (user_id, exam_id, username, first_name) VALUES (?, ?, ?, ?)',
      [userId, examId, query.from.username || null, query.from.first_name || null]
    );
    
    bot.sendMessage(chatId, `✅ Joined exam! Sending ${questions.length} questions...\n\n⚠️ Answer carefully - you won't see results until the exam ends.`);
    
    // Send questions as regular polls (not quiz mode to hide answers)
    for (const q of questions) {
      const options = JSON.parse(q.options);
      const pollMsg = await bot.sendPoll(chatId, q.question_text, options, {
        type: 'regular',
        is_anonymous: false,  // Must be false to receive poll_answer events
        allows_multiple_answers: false
      });
      
      // Store poll_id
      await dbRun('UPDATE questions SET poll_id = ? WHERE id = ?', [pollMsg.poll.id, q.id]);
    }
  }
  
  // View results (admin)
  else if (data.startsWith('results_')) {
    const examId = parseInt(data.split('_')[1]);
    
    const exam = await dbGet('SELECT * FROM exams WHERE id = ?', [examId]);
    const participants = await dbAll('SELECT * FROM participants WHERE exam_id = ?', [examId]);
    const questions = await dbAll('SELECT * FROM questions WHERE exam_id = ?', [examId]);
    
    let results = [];
    
    for (const p of participants) {
      const answers = await dbAll(
        'SELECT * FROM user_answers WHERE user_id = ? AND exam_id = ? ORDER BY answered_at ASC',
        [p.user_id, examId]
      );
      
      let correct = 0;
      let firstAnswerTime = null;
      
      for (const ans of answers) {
        const q = questions.find(q => q.id === ans.question_id);
        if (q && q.correct_option === ans.selected_option) correct++;
        if (!firstAnswerTime || ans.answered_at < firstAnswerTime) {
          firstAnswerTime = ans.answered_at;
        }
      }
      
      results.push({
        name: p.first_name || p.username || 'User',
        userId: p.user_id,
        username: p.username,
        correct,
        total: questions.length,
        percentage: ((correct / questions.length) * 100).toFixed(1),
        firstAnswerTime: firstAnswerTime || 0,
        answers
      });
    }
    
    // Sort by score (desc), then by first answer time (asc)
    results.sort((a, b) => {
      if (b.correct !== a.correct) return b.correct - a.correct;
      return a.firstAnswerTime - b.firstAnswerTime;
    });
    
    // Show creator info
    const creatorInfo = exam.created_by === userId ? 'You' : `Admin ID: ${exam.created_by}`;
    
    let message = `📊 *Results for "${exam.name}"*\n`;
    message += `👤 Created by: ${creatorInfo}\n\n`;
    message += `👥 Participants: ${results.length}\n`;
    message += `❓ Questions: ${questions.length}\n\n`;
    message += `🏆 *Leaderboard:*\n\n`;
    
    results.forEach((r, idx) => {
      const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}.`;
      message += `${medal} ${r.name}: ${r.correct}/${r.total} (${r.percentage}%)\n`;
    });
    
    bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    
    // Detailed analytics and export buttons
    const buttons = [
      [{ text: '📊 Detailed Analytics', callback_data: `detailed_${examId}` }],
      [{ text: '📥 Export CSV', callback_data: `export_csv_${examId}` }],
      [{ text: '📥 Export Excel', callback_data: `export_xlsx_${examId}` }]
    ];
    bot.sendMessage(chatId, 'View more details:', {
      reply_markup: { inline_keyboard: buttons }
    });
  }
  
  // Detailed analytics
  else if (data.startsWith('detailed_')) {
    const examId = parseInt(data.split('_')[1]);
    
    const exam = await dbGet('SELECT * FROM exams WHERE id = ?', [examId]);
    const participants = await dbAll('SELECT * FROM participants WHERE exam_id = ?', [examId]);
    const questions = await dbAll('SELECT * FROM questions WHERE exam_id = ?', [examId]);
    
    let message = `📋 *Detailed Results: "${exam.name}"*\n\n`;
    
    for (const p of participants) {
      const answers = await dbAll(
        'SELECT * FROM user_answers WHERE user_id = ? AND exam_id = ? ORDER BY question_id ASC',
        [p.user_id, examId]
      );
      
      let correct = 0;
      message += `👤 *${p.first_name || p.username || 'User'}*\n`;
      
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        const options = JSON.parse(q.options);
        const userAnswer = answers.find(a => a.question_id === q.id);
        
        if (userAnswer) {
          const isCorrect = userAnswer.selected_option === q.correct_option;
          if (isCorrect) correct++;
          
          const answerTime = new Date(userAnswer.answered_at * 1000).toLocaleTimeString();
          message += `  ${i + 1}. ${options[userAnswer.selected_option]} ${isCorrect ? '✅' : '❌'} (${answerTime})\n`;
        } else {
          message += `  ${i + 1}. No answer ❌\n`;
        }
      }
      
      message += `  *Total: ${correct}/${questions.length}*\n\n`;
    }
    
    // Split message if too long
    if (message.length > 4000) {
      const chunks = message.match(/[\s\S]{1,4000}/g) || [];
      for (const chunk of chunks) {
        await bot.sendMessage(chatId, chunk, { parse_mode: 'Markdown' });
      }
    } else {
      bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    }
  }
  
  // Export CSV
  else if (data.startsWith('export_csv_')) {
    const examId = parseInt(data.split('_')[2]);
    
    const exam = await dbGet('SELECT * FROM exams WHERE id = ?', [examId]);
    const participants = await dbAll('SELECT * FROM participants WHERE exam_id = ?', [examId]);
    const questions = await dbAll('SELECT * FROM questions WHERE exam_id = ?', [examId]);
    
    let csv = 'Name,Username,';
    questions.forEach((q, idx) => {
      csv += `Q${idx + 1} Answer,Q${idx + 1} Status,Q${idx + 1} Time,`;
    });
    csv += 'Total Correct,Total Questions,Percentage,First Answer Time\n';
    
    for (const p of participants) {
      const answers = await dbAll(
        'SELECT * FROM user_answers WHERE user_id = ? AND exam_id = ? ORDER BY question_id ASC',
        [p.user_id, examId]
      );
      
      let correct = 0;
      let firstAnswerTime = null;
      let row = `"${p.first_name || 'N/A'}","${p.username || 'N/A'}",`;
      
      for (const q of questions) {
        const options = JSON.parse(q.options);
        const userAnswer = answers.find(a => a.question_id === q.id);
        
        if (userAnswer) {
          const isCorrect = userAnswer.selected_option === q.correct_option;
          if (isCorrect) correct++;
          
          const answerTime = new Date(userAnswer.answered_at * 1000).toLocaleString();
          if (!firstAnswerTime || userAnswer.answered_at < firstAnswerTime) {
            firstAnswerTime = userAnswer.answered_at;
          }
          
          row += `"${options[userAnswer.selected_option]}","${isCorrect ? 'Correct' : 'Wrong'}","${answerTime}",`;
        } else {
          row += '"No Answer","Wrong","N/A",';
        }
      }
      
      const percentage = ((correct / questions.length) * 100).toFixed(1);
      const firstTime = firstAnswerTime ? new Date(firstAnswerTime * 1000).toLocaleString() : 'N/A';
      row += `${correct},${questions.length},${percentage}%,"${firstTime}"\n`;
      csv += row;
    }
    
    const filename = `exam_${examId}_results.csv`;
    fs.writeFileSync(filename, csv);
    
    await bot.sendDocument(chatId, filename, {
      caption: `📊 Results for "${exam.name}"`
    });
    
    fs.unlinkSync(filename);
  }
  
  // Export Excel
  else if (data.startsWith('export_xlsx_')) {
    const examId = parseInt(data.split('_')[2]);
    
    const exam = await dbGet('SELECT * FROM exams WHERE id = ?', [examId]);
    const participants = await dbAll('SELECT * FROM participants WHERE exam_id = ?', [examId]);
    const questions = await dbAll('SELECT * FROM questions WHERE exam_id = ?', [examId]);
    
    const data = [];
    const headers = ['Name', 'Username'];
    
    questions.forEach((q, idx) => {
      headers.push(`Q${idx + 1} Answer`, `Q${idx + 1} Status`, `Q${idx + 1} Time`);
    });
    headers.push('Total Correct', 'Total Questions', 'Percentage', 'First Answer Time');
    data.push(headers);
    
    for (const p of participants) {
      const answers = await dbAll(
        'SELECT * FROM user_answers WHERE user_id = ? AND exam_id = ? ORDER BY question_id ASC',
        [p.user_id, examId]
      );
      
      let correct = 0;
      let firstAnswerTime = null;
      const row = [p.first_name || 'N/A', p.username || 'N/A'];
      
      for (const q of questions) {
        const options = JSON.parse(q.options);
        const userAnswer = answers.find(a => a.question_id === q.id);
        
        if (userAnswer) {
          const isCorrect = userAnswer.selected_option === q.correct_option;
          if (isCorrect) correct++;
          
          const answerTime = new Date(userAnswer.answered_at * 1000).toLocaleString();
          if (!firstAnswerTime || userAnswer.answered_at < firstAnswerTime) {
            firstAnswerTime = userAnswer.answered_at;
          }
          
          row.push(options[userAnswer.selected_option], isCorrect ? 'Correct' : 'Wrong', answerTime);
        } else {
          row.push('No Answer', 'Wrong', 'N/A');
        }
      }
      
      const percentage = ((correct / questions.length) * 100).toFixed(1);
      const firstTime = firstAnswerTime ? new Date(firstAnswerTime * 1000).toLocaleString() : 'N/A';
      row.push(correct, questions.length, `${percentage}%`, firstTime);
      data.push(row);
    }
    
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Results');
    
    const filename = `exam_${examId}_results.xlsx`;
    XLSX.writeFile(wb, filename);
    
    await bot.sendDocument(chatId, filename, {
      caption: `📊 Results for "${exam.name}"`
    });
    
    fs.unlinkSync(filename);
  }
  
  // Question analytics
  else if (data.startsWith('analytics_')) {
    const examId = parseInt(data.split('_')[1]);
    
    const questions = await dbAll('SELECT * FROM questions WHERE exam_id = ?', [examId]);
    
    let message = '📊 *Question Analytics:*\n\n';
    
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const options = JSON.parse(q.options);
      const answers = await dbAll('SELECT selected_option FROM user_answers WHERE question_id = ?', [q.id]);
      
      const optionCounts = new Array(options.length).fill(0);
      answers.forEach(a => optionCounts[a.selected_option]++);
      
      const correctCount = optionCounts[q.correct_option];
      const totalAnswers = answers.length;
      const difficulty = totalAnswers > 0 ? ((correctCount / totalAnswers) * 100).toFixed(1) : 0;
      
      message += `*Q${i + 1}:* ${q.question_text.substring(0, 50)}...\n`;
      message += `✅ Correct: ${correctCount}/${totalAnswers} (${difficulty}%)\n`;
      
      options.forEach((opt, idx) => {
        const count = optionCounts[idx];
        const percent = totalAnswers > 0 ? ((count / totalAnswers) * 100).toFixed(0) : 0;
        const marker = idx === q.correct_option ? '✅' : '❌';
        message += `  ${marker} ${opt}: ${count} (${percent}%)\n`;
      });
      
      message += '\n';
    }
    
    bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
  }
  
  // My results (user)
  else if (data.startsWith('my_result_')) {
    const examId = parseInt(data.split('_')[2]);
    
    const exam = await dbGet('SELECT * FROM exams WHERE id = ?', [examId]);
    const questions = await dbAll('SELECT * FROM questions WHERE exam_id = ?', [examId]);
    const answers = await dbAll(
      'SELECT * FROM user_answers WHERE user_id = ? AND exam_id = ?',
      [userId, examId]
    );
    
    let correct = 0;
    let wrong = 0;
    
    let message = `📈 *Your Results: "${exam.name}"*\n\n`;
    
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const options = JSON.parse(q.options);
      const userAnswer = answers.find(a => a.question_id === q.id);
      
      const isCorrect = userAnswer && userAnswer.selected_option === q.correct_option;
      if (isCorrect) correct++;
      else wrong++;
      
      message += `*Q${i + 1}:* ${q.question_text}\n`;
      
      if (userAnswer) {
        message += `Your answer: ${options[userAnswer.selected_option]} ${isCorrect ? '✅' : '❌'}\n`;
      } else {
        message += `Your answer: Not answered ❌\n`;
      }
      
      message += `Correct answer: ${options[q.correct_option]}\n`;
      
      if (q.explanation) {
        message += `💡 ${q.explanation}\n`;
      }
      
      message += '\n';
    }
    
    const score = ((correct / questions.length) * 100).toFixed(1);
    message = `📊 *Score: ${correct}/${questions.length} (${score}%)*\n` +
              `✅ Correct: ${correct}\n` +
              `❌ Wrong: ${wrong}\n\n` + message;
    
    bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
  }
});

// Handle poll answers
bot.on('poll_answer', async (pollAnswer) => {
  try {
    const userId = pollAnswer.user.id;
    const pollId = pollAnswer.poll_id;
    const selectedOptions = pollAnswer.option_ids;
    
    // Ignore if user retracted their vote (empty array)
    if (!selectedOptions || selectedOptions.length === 0) {
      return;
    }
    
    const selectedOption = selectedOptions[0];
    
    // Find question by poll_id
    const question = await dbGet('SELECT * FROM questions WHERE poll_id = ?', [pollId]);
    
    if (!question) return;
    
    // Check if exam is still active
    const exam = await dbGet('SELECT * FROM exams WHERE id = ? AND status = ?', [question.exam_id, 'active']);
    
    if (!exam) return;
    
    // Check if user already answered this question
    const existing = await dbGet(
      'SELECT * FROM user_answers WHERE user_id = ? AND question_id = ?',
      [userId, question.id]
    );
    
    if (existing) {
      return; // User already answered, ignore vote change
    }
    
    // Save answer
    await dbRun(
      'INSERT INTO user_answers (user_id, exam_id, question_id, selected_option) VALUES (?, ?, ?, ?)',
      [userId, question.exam_id, question.id, selectedOption]
    );
  } catch (err) {
    console.error('Error handling poll answer:', err);
  }
});

// Handle document uploads
bot.on('document', async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const state = userStates[userId];
  
  if (!state || state.action !== 'upload_questions') return;
  
  const document = msg.document;
  
  // Check if it's a text file
  if (!document.file_name.endsWith('.txt')) {
    return bot.sendMessage(chatId, '❌ Please upload a .txt file.');
  }
  
  try {
    bot.sendMessage(chatId, '⏳ Processing file...');
    
    // Download file
    const fileLink = await bot.getFileLink(document.file_id);
    const https = require('https');
    
    https.get(fileLink, (response) => {
      let data = '';
      
      response.on('data', (chunk) => {
        data += chunk;
      });
      
      response.on('end', async () => {
        try {
          const questions = parseQuestionsFile(data);
          
          if (questions.length === 0) {
            return bot.sendMessage(chatId, '❌ No valid questions found in file. Please check the format.');
          }
          
          // Insert questions into database
          let successCount = 0;
          let errorCount = 0;
          
          for (const q of questions) {
            try {
              await dbRun(
                'INSERT INTO questions (exam_id, question_text, options, correct_option, explanation) VALUES (?, ?, ?, ?, ?)',
                [state.examId, q.question, JSON.stringify(q.options), q.correctOption, q.explanation]
              );
              successCount++;
            } catch (err) {
              errorCount++;
              console.error('Error inserting question:', err);
            }
          }
          
          bot.sendMessage(chatId, 
            `✅ Upload complete!\n\n` +
            `✓ Added: ${successCount} questions\n` +
            `${errorCount > 0 ? `✗ Failed: ${errorCount} questions\n` : ''}`,
            { reply_markup: getMainMenu(userId) }
          );
          
          delete userStates[userId];
        } catch (err) {
          bot.sendMessage(chatId, `❌ Error parsing file: ${err.message}\n\nPlease check the format and try again.`);
        }
      });
    }).on('error', (err) => {
      bot.sendMessage(chatId, `❌ Error downloading file: ${err.message}`);
    });
    
  } catch (err) {
    bot.sendMessage(chatId, `❌ Error: ${err.message}`);
  }
});

} // End of setupBot function

// Parse questions from text file
function parseQuestionsFile(text) {
  const questions = [];
  const lines = text.split('\n').map(l => l.trim());
  
  let currentQuestion = null;
  let currentOptions = [];
  let correctOption = null;
  let explanation = null;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Skip empty lines
    if (!line) {
      // Save previous question if exists
      if (currentQuestion && currentOptions.length >= 2 && correctOption !== null) {
        questions.push({
          question: currentQuestion,
          options: currentOptions,
          correctOption: correctOption,
          explanation: explanation
        });
      }
      currentQuestion = null;
      currentOptions = [];
      correctOption = null;
      explanation = null;
      continue;
    }
    
    // Question line (starts with number and dot)
    if (/^\d+\.\s/.test(line)) {
      // Save previous question if exists
      if (currentQuestion && currentOptions.length >= 2 && correctOption !== null) {
        questions.push({
          question: currentQuestion,
          options: currentOptions,
          correctOption: correctOption,
          explanation: explanation
        });
      }
      currentQuestion = line.replace(/^\d+\.\s*/, '');
      currentOptions = [];
      correctOption = null;
      explanation = null;
    }
    // Option line (A., B., C., D.)
    else if (/^[A-Z]\.\s/.test(line)) {
      const option = line.replace(/^[A-Z]\.\s*/, '');
      currentOptions.push(option);
    }
    // Answer line
    else if (/^Ans:\s*/i.test(line)) {
      const answer = line.replace(/^Ans:\s*/i, '').trim().toUpperCase();
      const answerIndex = answer.charCodeAt(0) - 65; // A=0, B=1, C=2, D=3
      if (answerIndex >= 0 && answerIndex < currentOptions.length) {
        correctOption = answerIndex;
      }
    }
    // Explanation line
    else if (/^Explain:\s*/i.test(line)) {
      explanation = line.replace(/^Explain:\s*/i, '').trim();
    }
  }
  
  // Save last question
  if (currentQuestion && currentOptions.length >= 2 && correctOption !== null) {
    questions.push({
      question: currentQuestion,
      options: currentOptions,
      correctOption: correctOption,
      explanation: explanation
    });
  }
  
  return questions;
}
