# Winners & Profile Management Feature

## Overview
This feature adds user profile management and automatic winner announcement with tie-breaking logic.

## Database Changes

### New Table: user_profiles
```sql
CREATE TABLE user_profiles (
  user_id INTEGER PRIMARY KEY,
  branch TEXT DEFAULT 'Enat',
  phone TEXT,
  updated_at INTEGER
)
```

### Updated Table: exams
Added columns:
- `num_winners INTEGER DEFAULT 0` - Number of winners to announce
- `tie_break_note TEXT` - Custom note for tie-breaking instructions

## User Features

### Profile Management
Users can access via "👤 My Profile" button:
- View current profile (branch, phone)
- Update branch
- Update phone number
- Phone auto-detected from Telegram if available

### Menu Structure
```
User Menu:
- 📚 Active Exams
- 📈 My Results
- 👤 My Profile (NEW)
```

## Admin Features

### Starting Exam with Winners
When admin starts an exam, they're prompted:
1. Select target (Bot/Group/All)
2. Enter number of winners (0 = no winners announcement)
3. If winners > 0, enter tie-break note (optional)

### Default Tie-Break Note
```
Note: We need {num_winners} winner(s) but we have {actual_count} participants 
with equal scores. To select among them, please send your activation code 
in private chat to @{admin_username}
```

Admin can customize this note.

### Winner Announcement
When admin ends exam:
1. Calculate top scorers
2. If exact match to num_winners → announce winners
3. If more people tied → announce all tied + show tie-break note
4. Send announcement to exam's target (group/bot/all)

## Implementation Files

### bot.js Changes
1. Add "My Profile" menu option for users
2. Add profile management handlers
3. Update exam start flow to ask for winners
4. Update exam end flow to announce winners
5. Add tie-breaking logic

### Flow Diagrams

#### User Profile Flow
```
User clicks "My Profile"
  ↓
Show current profile
  ↓
Buttons: [Update Branch] [Update Phone] [Back]
  ↓
User selects update
  ↓
Bot asks for new value
  ↓
Save to database
  ↓
Show updated profile
```

#### Admin Start Exam Flow
```
Admin clicks "Start Exam"
  ↓
Select exam
  ↓
Select target (Bot/Group/All)
  ↓
Ask: "How many winners? (0 for none)"
  ↓
If > 0: Ask for tie-break note
  ↓
Start exam
```

#### Winner Announcement Flow
```
Admin ends exam
  ↓
Calculate results
  ↓
Get top N scorers
  ↓
Check for ties
  ↓
If exact match:
  - Announce winners
Else if more tied:
  - Announce all tied
  - Show tie-break note
  ↓
Send to target groups/chats
```

## Example Messages

### Winner Announcement (No Ties)
```
🏆 EXAM RESULTS: "General Knowledge Quiz"

Congratulations to our winners! 🎉

🥇 1st Place: John Doe - 95/100 (95%)
   Branch: Enat | Phone: +251912345678

🥈 2nd Place: Jane Smith - 92/100 (92%)
   Branch: Addis | Phone: +251923456789

🥉 3rd Place: Bob Wilson - 90/100 (90%)
   Branch: Enat | Phone: +251934567890
```

### Winner Announcement (With Ties)
```
🏆 EXAM RESULTS: "General Knowledge Quiz"

Top Scorers (Tied):

🥇 John Doe - 95/100 (95%)
   Branch: Enat | Phone: +251912345678

🥇 Jane Smith - 95/100 (95%)
   Branch: Addis | Phone: +251923456789

🥇 Bob Wilson - 95/100 (95%)
   Branch: Enat | Phone: +251934567890

🥇 Alice Brown - 95/100 (95%)
   Branch: Bahir Dar | Phone: +251945678901

⚠️ Note: We need 3 winner(s) but we have 4 participants with equal scores. 
To select among them, please send your activation code in private chat to @admin_username
```

## Next Steps
1. Implement profile management UI
2. Add winner count to exam start flow
3. Implement winner calculation logic
4. Create announcement formatter
5. Test tie-breaking scenarios
