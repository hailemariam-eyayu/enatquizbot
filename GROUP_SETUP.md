# 👥 Group Setup Guide

## How to Use Quiz Bot in Groups

The bot now works in **private groups** where you control who can access exams.

---

## 🔧 Setup Steps

### 1️⃣ **Create a Private Group**

1. Open Telegram
2. Create a new group (or use existing)
3. Make it **private** (not public)
4. Add only your staff/students

### 2️⃣ **Add the Bot to Group**

1. Go to your group
2. Click group name → Add Members
3. Search for your bot username
4. Add the bot

### 3️⃣ **Make Bot an Admin**

1. Go to group settings
2. Click Administrators
3. Add your bot as admin
4. Give it these permissions:
   - ✅ Send Messages
   - ✅ Send Polls
   - ✅ Delete Messages (optional)

### 4️⃣ **Authorize the Group**

1. In the group, send: `/authorize`
2. ✅ Group is now authorized!

---

## 🧹 Cleanup Commands

### **Delete Bot Messages**

Admins can clean up bot messages in groups:

**Command:** `/cleanup` or `/cleanup 500`

- Deletes bot messages sent by THIS bot instance
- Default: checks last 200 messages
- Optional: specify number (e.g., `/cleanup 500` checks last 500)
- Only works in groups
- Only admins can use it
- Auto-deletes status messages

**Important Notes:**
- ⚠️ Can ONLY delete messages sent by the current bot instance (same bot token)
- ⚠️ Cannot delete messages from old/different bot instances
- ⚠️ Telegram only allows deleting messages less than 48 hours old
- ⚠️ Bot needs "Delete Messages" permission in the group

**To delete old messages from a different bot:**
You must manually delete them or use that bot's token to delete them.

---

## 📝 How It Works

### **For Admins (Private Chat with Bot):**
- Create exams
- Add questions
- Start/end exams
- View results
- Manage groups

### **For Users (In Group):**
- View active exams
- Take exams
- View their results

### **For Super Admin:**
- Manage authorized groups
- Remove groups
- Add/remove admins

---

## 🎯 Workflow

### **Admin Creates Exam:**
1. Admin opens private chat with bot
2. Creates exam with questions
3. Assigns exam to a group (or all groups)
4. Starts the exam

### **Users Take Exam:**
1. Users see exam in their group
2. Click to join and take exam
3. Answer questions
4. Wait for results

### **Admin Ends Exam:**
1. Admin ends exam from private chat
2. Users can now view results
3. Admin can export analytics

---

## 👥 Managing Groups

### **View Authorized Groups:**
1. Private chat with bot
2. Click "👥 Manage Groups"
3. See all authorized groups

### **Remove a Group:**
1. Click "👥 Manage Groups"
2. Click "➖ Remove Group"
3. Select group to remove
4. Group loses access

---

## 🔒 Security Features

✅ **Only authorized groups** can use the bot
✅ **Only group members** can take exams
✅ **You control** who joins the group
✅ **Admins manage** everything from private chat
✅ **Each group** can have different exams

---

## 📊 Multiple Groups

You can authorize multiple groups:
- Staff Group
- Students Group
- Department A Group
- Department B Group

Each group can have:
- Different exams
- Different participants
- Separate results

---

## ⚠️ Important Notes

1. **Bot must be admin** in the group
2. **Only super admin** can authorize groups
3. **Groups must be private** (recommended)
4. **Users must be in group** to take exams
5. **Admins manage from private chat**, not in group

---

## 🚀 Quick Commands

### In Group:
- `/start` - Show menu
- `/authorize` - Authorize group (super admin only)

### In Private Chat (Admin):
- `/start` - Admin menu
- `/menu` - Show menu
- All admin features available

---

## 📱 Example Setup

**Scenario:** Company wants to conduct employee training quiz

1. **Create "Employee Training" group**
2. **Add all employees**
3. **Add bot and make it admin**
4. **Super admin sends `/authorize` in group**
5. **Admin creates exam in private chat**
6. **Admin assigns exam to "Employee Training" group**
7. **Admin starts exam**
8. **Employees take exam in group**
9. **Admin ends exam and views results**

---

## ✅ Benefits

- 🔒 **Secure**: Only authorized groups
- 👥 **Controlled**: You manage who joins
- 📊 **Organized**: Separate groups for different teams
- 🎯 **Focused**: Exams sent to specific groups
- 📈 **Trackable**: Results per group

---

**Ready to set up your first group? Follow the steps above!** 🚀
