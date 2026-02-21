import asyncio
from telegram import Bot
from telegram.error import TelegramError

# --- CONFIGURATION ---
# IMPORTANT: Revoke this token at @BotFather after use!
BOT_TOKEN = '8266496171:AAG36K5a3sSuHZkDXNViKbVorjBomb1WqvQ'
GROUP_ID = -1002032084985
START_ID = 1602  # The ID from your link: /1602

async def delete_today_only():
    bot = Bot(token=BOT_TOKEN)
    
    print(f"Cleaning up messages starting from ID {START_ID}...")
    
    deleted_count = 0
    # We will check the next 10,000 IDs from your starting point
    for msg_id in range(START_ID, START_ID + 10000):
        try:
            # The bot attempts to delete. 
            # If it's the bot's own message, it disappears.
            await bot.delete_message(chat_id=GROUP_ID, message_id=msg_id)
            deleted_count += 1
            
            # Print progress every 5 deletions
            if deleted_count % 5 == 0:
                print(f"Deleted {deleted_count} messages so far...")
            
            # Very small sleep to prevent being kicked by Telegram for spamming
            await asyncio.sleep(0.02)
            
        except TelegramError as e:
            # If the error is "Message to delete not found", we might have 
            # reached the end of the current chat history.
            if "Message to delete not found" in str(e):
                # We continue just in case there's a gap in IDs
                continue
            continue

    print("-" * 30)
    print(f"Done! Total of {deleted_count} messages removed from today.")
    print("-" * 30)

if __name__ == "__main__":
    asyncio.run(delete_today_only())