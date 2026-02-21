import asyncio
from telegram import Bot
from telegram.error import TelegramError

# --- CONFIGURATION ---
# PLEASE REVOKE THIS TOKEN AT @BOTFATHER AFTER USE FOR SECURITY
BOT_TOKEN = '8266496171:AAG36K5a3sSuHZkDXNViKbVorjBomb1WqvQ'
GROUP_ID = -1002032084985
START_ID = 1602  # From your link: /1602
SCAN_LIMIT = 5000 # How many message IDs to check moving forward

async def delete_bot_self_messages():
    bot = Bot(token=BOT_TOKEN)
    
    print(f"Starting cleanup from ID {START_ID}...")
    
    deleted_count = 0
    # We loop from the start ID forward to the most recent messages
    for msg_id in range(START_ID, START_ID + SCAN_LIMIT):
        try:
            # Bot attempts to delete its own message
            await bot.delete_message(chat_id=GROUP_ID, message_id=msg_id)
            deleted_count += 1
            
            if deleted_count % 10 == 0:
                print(f"Successfully deleted {deleted_count} messages...")
            
            # Small delay to respect Telegram's flood limits
            await asyncio.sleep(0.05) 
            
        except TelegramError as e:
            # Check if it's an authorization error
            if "Unauthorized" in str(e):
                print("Error: The token is invalid or the bot was kicked.")
                return
            # This triggers if the message is NOT from the bot, 
            # if the ID doesn't exist yet, or if it's already deleted.
            continue

    print("-" * 30)
    print(f"Cleanup finished! Total deleted: {deleted_count}")
    print("-" * 30)

if __name__ == "__main__":
    try:
        asyncio.run(delete_bot_self_messages())
    except KeyboardInterrupt:
        print("\nStopped by user.")