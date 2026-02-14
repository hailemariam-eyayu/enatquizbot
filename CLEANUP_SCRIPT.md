# Cleanup Messages Script

This script deletes old bot messages from a Telegram group.

## How to Use

### 1. Get Your Group ID

In your group, send this command to the bot:
```
/start
```

Or use a bot like @userinfobot to get the group ID. Group IDs are negative numbers like `-1001234567890`.

### 2. Run the Script

```bash
node cleanup_messages.js <GROUP_ID> [MESSAGE_RANGE]
```

**Parameters:**
- `GROUP_ID` (required): Your group's ID (negative number)
- `MESSAGE_RANGE` (optional): How many message IDs to check (default: 2000)

**Examples:**

Delete messages checking last 2000 IDs:
```bash
node cleanup_messages.js -1001234567890
```

Delete messages checking last 5000 IDs:
```bash
node cleanup_messages.js -1001234567890 5000
```

Delete messages checking last 10000 IDs (for very old messages):
```bash
node cleanup_messages.js -1001234567890 10000
```

## What It Does

1. Connects to Telegram using your bot token
2. Sends a test message to find the current message ID
3. Goes backwards through message IDs trying to delete each one
4. Only deletes messages sent by your bot (same token)
5. Shows progress as it works
6. Reports how many messages were deleted

## Important Notes

- ⚠️ Can only delete messages sent by THIS bot token
- ⚠️ Cannot delete messages from other bots
- ⚠️ Telegram only allows deleting messages less than 48 hours old
- ⚠️ Bot needs "Delete Messages" permission in the group
- ⏱️ Takes time for large ranges (50ms delay per message to avoid rate limits)

## Troubleshooting

**"Could not send test message"**
- Make sure bot is added to the group
- Make sure bot is an admin with delete permissions

**"Deleted: 0 messages"**
- Messages might be from a different bot token
- Messages might be older than 48 hours
- Try increasing the MESSAGE_RANGE

**Script runs but old messages still there**
- Those messages were sent by a different bot instance
- You need to manually delete them or use that bot's token
