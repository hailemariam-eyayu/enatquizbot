const initSqlJs = require('sql.js');
const fs = require('fs');

let db;

async function initDatabase() {
  const SQL = await initSqlJs();
  
  // Load existing database or create new one
  if (fs.existsSync('./quiz_bot.db')) {
    const buffer = fs.readFileSync('./quiz_bot.db');
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  // Create tables
  db.run(`
    CREATE TABLE IF NOT EXISTS exams (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      start_time INTEGER NOT NULL,
      end_time INTEGER,
      status TEXT DEFAULT 'pending',
      created_by INTEGER NOT NULL,
      created_at INTEGER DEFAULT (strftime('%s', 'now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      exam_id INTEGER NOT NULL,
      question_text TEXT NOT NULL,
      options TEXT NOT NULL,
      correct_option INTEGER NOT NULL,
      explanation TEXT,
      poll_id TEXT,
      FOREIGN KEY (exam_id) REFERENCES exams(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS user_answers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      exam_id INTEGER NOT NULL,
      question_id INTEGER NOT NULL,
      selected_option INTEGER NOT NULL,
      answered_at INTEGER DEFAULT (strftime('%s', 'now')),
      UNIQUE(user_id, exam_id, question_id),
      FOREIGN KEY (exam_id) REFERENCES exams(id),
      FOREIGN KEY (question_id) REFERENCES questions(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS participants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      exam_id INTEGER NOT NULL,
      username TEXT,
      first_name TEXT,
      joined_at INTEGER DEFAULT (strftime('%s', 'now')),
      UNIQUE(user_id, exam_id),
      FOREIGN KEY (exam_id) REFERENCES exams(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL UNIQUE,
      username TEXT,
      first_name TEXT,
      added_by INTEGER NOT NULL,
      added_at INTEGER DEFAULT (strftime('%s', 'now'))
    )
  `);

  return db;
}

function saveDatabase() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync('./quiz_bot.db', buffer);
  }
}

// Auto-save every 5 seconds
setInterval(saveDatabase, 5000);

// Save on exit
process.on('exit', saveDatabase);
process.on('SIGINT', () => {
  saveDatabase();
  process.exit();
});

module.exports = { initDatabase, saveDatabase };
