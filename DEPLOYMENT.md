# 🚀 Telegram Quiz Bot - Server Deployment Guide

## 📋 Prerequisites
- A server/computer with Ubuntu/Linux (or Windows)
- Node.js installed (v14 or higher)
- Git installed
- Internet connection

---

## 🔧 Step-by-Step Deployment

### 1️⃣ **Install Node.js (if not installed)**

#### On Ubuntu/Debian:
```bash
# Update package list
sudo apt update

# Install Node.js and npm
sudo apt install nodejs npm -y

# Verify installation
node --version
npm --version
```

#### On Windows:
- Download from: https://nodejs.org/
- Install and verify in CMD: `node --version`

---

### 2️⃣ **Install Git (if not installed)**

#### On Ubuntu/Debian:
```bash
sudo apt install git -y
git --version
```

#### On Windows:
- Download from: https://git-scm.com/
- Install and verify in CMD: `git --version`

---

### 3️⃣ **Clone the Repository**

```bash
# Navigate to your desired directory
cd ~

# Clone the repository
git clone https://github.com/hailemariam-eyayu/enatquizbot.git

# Enter the project directory
cd enatquizbot
```

---

### 4️⃣ **Install Dependencies**

```bash
# Install all required packages
npm install
```

If you get SSL certificate errors, use:
```bash
npm install --strict-ssl=false
```

---

### 5️⃣ **Configure Environment Variables**

```bash
# Create .env file from example
cp .env.example .env

# Edit the .env file
nano .env
```

Add your credentials:
```env
BOT_TOKEN=8278091214:AAGgI5W_wu5o_cMPWf_rXimWGhCEI56NFU0
ADMIN_IDS=5043280252
```

**Save and exit:**
- Press `Ctrl + X`
- Press `Y`
- Press `Enter`

---

### 6️⃣ **Test the Bot**

```bash
# Run the bot to test
node bot.js
```

You should see:
```
🤖 Bot is running...
```

Test it on Telegram. If it works, press `Ctrl + C` to stop.

---

### 7️⃣ **Install PM2 (Process Manager)**

PM2 keeps your bot running 24/7, even after you close the terminal or restart the server.

```bash
# Install PM2 globally
sudo npm install -g pm2

# Verify installation
pm2 --version
```

---

### 8️⃣ **Start Bot with PM2**

```bash
# Start the bot
pm2 start bot.js --name quiz-bot

# View bot status
pm2 status

# View bot logs
pm2 logs quiz-bot

# Stop viewing logs (press Ctrl + C)
```

---

### 9️⃣ **Make Bot Auto-Start on Server Reboot**

```bash
# Generate startup script
pm2 startup

# Copy and run the command it shows (it will look like):
# sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u YOUR_USERNAME --hp /home/YOUR_USERNAME

# Save current PM2 process list
pm2 save
```

---

### 🔟 **Useful PM2 Commands**

```bash
# View bot status
pm2 status

# View real-time logs
pm2 logs quiz-bot

# Restart bot
pm2 restart quiz-bot

# Stop bot
pm2 stop quiz-bot

# Delete bot from PM2
pm2 delete quiz-bot

# View bot info
pm2 info quiz-bot

# Monitor CPU/Memory usage
pm2 monit
```

---

## 🔄 **Updating the Bot**

When you make changes and push to GitHub:

```bash
# Navigate to project directory
cd ~/enatquizbot

# Pull latest changes
git pull origin main

# Install any new dependencies
npm install

# Restart the bot
pm2 restart quiz-bot
```

---

## 🐛 **Troubleshooting**

### Bot not responding?
```bash
# Check if bot is running
pm2 status

# Check logs for errors
pm2 logs quiz-bot --lines 50
```

### Port already in use?
```bash
# Find and kill the process
pm2 delete quiz-bot
pm2 start bot.js --name quiz-bot
```

### Database issues?
```bash
# Delete database and restart (WARNING: loses all data)
rm quiz_bot.db
pm2 restart quiz-bot
```

### SSL Certificate errors?
```bash
# Reinstall dependencies without SSL check
npm install --strict-ssl=false
pm2 restart quiz-bot
```

---

## 📊 **Monitoring**

### Check bot health:
```bash
pm2 status
```

### View resource usage:
```bash
pm2 monit
```

### View logs:
```bash
# Real-time logs
pm2 logs quiz-bot

# Last 100 lines
pm2 logs quiz-bot --lines 100

# Error logs only
pm2 logs quiz-bot --err
```

---

## 🔒 **Security Tips**

1. **Never commit .env file to GitHub**
   - Already in .gitignore ✅

2. **Keep your bot token secret**
   - Don't share it publicly

3. **Update regularly**
   ```bash
   cd ~/enatquizbot
   git pull
   npm install
   pm2 restart quiz-bot
   ```

4. **Backup your database**
   ```bash
   cp quiz_bot.db quiz_bot_backup_$(date +%Y%m%d).db
   ```

---

## 📱 **Testing Checklist**

After deployment, test these features:

### Admin Features:
- [ ] Create exam
- [ ] Add questions manually
- [ ] Upload questions from file
- [ ] Edit questions
- [ ] Start exam
- [ ] End exam
- [ ] View results
- [ ] Export CSV/Excel
- [ ] Delete exam

### User Features:
- [ ] View active exams
- [ ] Join exam (should work only once)
- [ ] Answer questions (no feedback during exam)
- [ ] View results after exam ends

---

## 🎉 **Success!**

Your bot is now running 24/7 on your server!

**Bot URL:** https://t.me/YOUR_BOT_USERNAME

**Repository:** https://github.com/hailemariam-eyayu/enatquizbot

---

## 📞 **Need Help?**

If you encounter issues:
1. Check logs: `pm2 logs quiz-bot`
2. Check status: `pm2 status`
3. Restart bot: `pm2 restart quiz-bot`
4. Check GitHub issues

---

## 🌟 **Optional: Set Up Firewall (Ubuntu)**

```bash
# Allow SSH (important!)
sudo ufw allow ssh

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status
```

---

**Good luck with your quiz bot! 🚀**
