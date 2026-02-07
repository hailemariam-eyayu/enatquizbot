# Telegram Quiz Bot 🎓

A Telegram bot for conducting exams using quiz-style polls with admin controls and detailed analytics.

## Features

### Admin Capabilities
- ✅ Create exam sessions with name and timing
- ✅ Add multiple-choice questions with explanations
- ✅ Start/end exams via button clicks
- ✅ View comprehensive results and analytics
- ✅ Leaderboard and per-question statistics
- ✅ Track participant performance

### User Experience
- ✅ Join active exams
- ✅ Answer questions via Telegram quiz polls
- ✅ View results after exam ends
- ✅ See correct answers with explanations
- ✅ Track personal performance

## Setup

1. **Install dependencies:**
```bash
npm install
```

2. **Create a Telegram bot:**
   - Talk to [@BotFather](https://t.me/botfather) on Telegram
   - Create a new bot with `/newbot`
   - Copy the bot token

3. **Configure environment:**
   - Copy `.env.example` to `.env`
   - Add your bot token and admin user IDs

```env
BOT_TOKEN=your_bot_token_here
ADMIN_IDS=123456789,987654321
```

To get your user ID, message [@userinfobot](https://t.me/userinfobot) on Telegram.

4. **Run the bot:**
```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

## Usage

### For Admins

1. **Create Exam:**
   - Click "📝 Create Exam"
   - Enter exam name
   - Set start time (minutes from now, 0 for immediate)

2. **Add Questions:**
   - Click "➕ Add Question"
   - Enter question text
   - Enter options (one per line)
   - Select correct answer
   - Add explanation (optional)

3. **Start Exam:**
   - Click "▶️ Start Exam"
   - Select exam to activate

4. **End Exam:**
   - Click "⏹️ End Exam"
   - Select exam to end

5. **View Results:**
   - Click "📊 View Results"
   - See leaderboard and analytics

### For Users

1. **Join Exam:**
   - Click "📚 Active Exams"
   - Select exam to join
   - Answer quiz polls

2. **View Results:**
   - Click "📈 My Results" (after exam ends)
   - See your score and feedback

## Database Schema

- **exams**: Exam sessions
- **questions**: Questions with options and correct answers
- **user_answers**: User responses
- **participants**: Exam participants

## Technical Details

- Built with `node-telegram-bot-api`
- SQLite database for persistence
- Quiz-mode polls for questions
- Real-time answer tracking
- Prevents answer changes after exam ends

## Notes

- Answers are hidden during active exams
- Quiz feedback shown only after exam ends
- Late joins are supported
- Multiple exams can run simultaneously
- All data persists in `quiz_bot.db`
