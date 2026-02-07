# ⚡ Quick Start Guide (5 Minutes)

## For Ubuntu/Linux Server:

```bash
# 1. Install Node.js and Git
sudo apt update
sudo apt install nodejs npm git -y

# 2. Clone repository
git clone https://github.com/hailemariam-eyayu/enatquizbot.git
cd enatquizbot

# 3. Install dependencies
npm install --strict-ssl=false

# 4. Create .env file
cp .env.example .env
nano .env
# Add your BOT_TOKEN and ADMIN_IDS, then save (Ctrl+X, Y, Enter)

# 5. Install PM2
sudo npm install -g pm2

# 6. Start bot
pm2 start bot.js --name quiz-bot

# 7. Make it auto-start on reboot
pm2 startup
# Run the command it shows
pm2 save

# 8. Check status
pm2 status
pm2 logs quiz-bot
```

## For Windows Server:

```cmd
# 1. Install Node.js from https://nodejs.org/

# 2. Clone repository
git clone https://github.com/hailemariam-eyayu/enatquizbot.git
cd enatquizbot

# 3. Install dependencies
npm install

# 4. Create .env file
copy .env.example .env
notepad .env
# Add your BOT_TOKEN and ADMIN_IDS, then save

# 5. Install PM2
npm install -g pm2

# 6. Start bot
pm2 start bot.js --name quiz-bot

# 7. Make it auto-start on reboot
pm2 startup
# Run the command it shows
pm2 save

# 8. Check status
pm2 status
pm2 logs quiz-bot
```

## ✅ Done!

Your bot is now running 24/7!

Test it on Telegram: https://t.me/YOUR_BOT_USERNAME

## 📝 Useful Commands:

```bash
pm2 status              # Check if bot is running
pm2 logs quiz-bot       # View logs
pm2 restart quiz-bot    # Restart bot
pm2 stop quiz-bot       # Stop bot
pm2 monit               # Monitor resources
```

## 🔄 Update Bot:

```bash
cd ~/enatquizbot
git pull
npm install
pm2 restart quiz-bot
```
