# Critical Fixes Needed

## Issue 1: Winner Settings Contact Input Not Working
**Problem:** After entering contact (@username), nothing happens
**Root Cause:** Unknown - need to check logs
**Fix:** Add comprehensive logging and test locally

## Issue 2: Submit Button Not Working  
**Problem:** Clicking submit does nothing
**Root Cause:** Callback handler might not be triggered
**Fix:** Test callback handlers locally

## Issue 3: Answer Buttons Edit Message for Everyone
**Problem:** When user clicks A, the message updates for ALL users in group
**Current Behavior:** `bot.editMessageReplyMarkup()` edits the shared message
**Desired Behavior:** Show popup "You selected A" without editing message
**Fix:** 
- Remove `bot.editMessageReplyMarkup()` 
- Use `bot.answerCallbackQuery()` with `show_alert: true` for popup
- Don't edit the question messages at all
- Only update the review message (which is unique per user)

## Issue 4: No Prevention After Submit
**Problem:** Users can change answers after submitting
**Fix:** Check if user has submitted before allowing answer changes

## Implementation Plan

### Fix 3 (Priority 1): Answer Popups
```javascript
// In answer handler
bot.answerCallbackQuery(query.id, {
  text: `✅ You selected ${letter}`,
  show_alert: true  // Shows popup instead of toast
});

// Remove this:
// await bot.editMessageReplyMarkup(...)
```

### Fix 4: Prevent Changes After Submit
```javascript
// Add submitted flag to userExamAnswers
userExamAnswers[userId] = {
  examId,
  answers: {},
  submitted: false  // NEW
};

// In answer handler, check:
if (userExamAnswers[userId].submitted) {
  return bot.answerCallbackQuery(query.id, {
    text: '❌ You have already submitted your answers!',
    show_alert: true
  });
}

// In submit handler, set flag:
userExamAnswers[userId].submitted = true;
```

### Fix 1 & 2: Test Locally
- Run bot locally
- Test winner settings flow
- Test submit button
- Check logs for errors
