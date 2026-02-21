# Implementation Plan: New Button-Based Exam System

## Current Status
- Database schema updated ✅
- In-memory storage added ✅
- Design document created ✅

## Implementation Phases

### Phase 1: Core Exam System (PRIORITY)
**Files to modify:** bot.js

#### 1.1 Replace join_exam handler
- Remove poll sending code
- Add button-based question display
- Initialize userExamAnswers for the user
- Send all questions with inline buttons
- Send review/submit message

#### 1.2 Add answer button handler
- Callback: `ans_{examId}_{questionId}_{optionIndex}_{userId}`
- Store answer in userExamAnswers
- Update button display (highlight selected)
- Update review message

#### 1.3 Add submit handler
- Callback: `submit_{examId}_{userId}`
- Check for unanswered questions
- Show confirmation if incomplete
- Save all answers to database
- Calculate and show results privately
- Clear userExamAnswers

#### 1.4 Remove poll_answer handler
- No longer needed with button system

### Phase 2: Winner System
**Files to modify:** bot.js

#### 2.1 Update start_exam handler
- Ask for number of winners
- Ask for tie-break contact
- Save to exam record

#### 2.2 Update end_exam handler
- Calculate top scorers
- Implement tie-breaking logic
- Format winner announcement
- Send to appropriate groups/chats

### Phase 3: Profile Management
**Files to modify:** bot.js

#### 3.1 Add profile menu
- Add "👤 My Profile" button to user menu
- Show current profile (branch, phone)
- Buttons: Update Branch, Update Phone

#### 3.2 Add profile handlers
- Update branch flow
- Update phone flow
- Auto-detect phone from Telegram

#### 3.3 Integrate with winner announcement
- Include branch and phone in winner display

### Phase 4: Testing & Refinement
- Test complete exam flow
- Test winner announcement with ties
- Test profile management
- Fix any bugs

## Code Sections to Replace

### Section 1: join_exam (Lines ~1802-1850)
**Current:** Sends polls
**New:** Sends text questions with buttons + review message

### Section 2: poll_answer (Lines ~1740-1790)
**Current:** Handles poll votes
**New:** DELETE - no longer needed

### Section 3: start_exam (Lines ~1200-1350)
**Current:** Just starts exam
**New:** Ask for winners + contact

### Section 4: end_exam (Lines ~1420-1480)
**Current:** Just ends exam
**New:** Calculate and announce winners

## New Functions to Add

```javascript
// Format question with buttons
function formatQuestionMessage(questionNum, total, questionText, options, selectedOption) {
  // Returns formatted message
}

// Format review message
function formatReviewMessage(examId, questions, userAnswers) {
  // Returns review with submit button
}

// Calculate winners
function calculateWinners(examId, numWinners) {
  // Returns winner data with tie info
}

// Format winner announcement
function formatWinnerAnnouncement(exam, winners, tieInfo) {
  // Returns formatted announcement
}
```

## Estimated Lines of Code
- Phase 1: ~300 lines
- Phase 2: ~200 lines
- Phase 3: ~150 lines
- Total: ~650 new/modified lines

## Timeline
- Phase 1: 30-40 minutes (critical path)
- Phase 2: 20 minutes
- Phase 3: 15 minutes
- Testing: 10 minutes
- **Total: ~1.5 hours**

## Risk Areas
1. Message editing with inline buttons (Telegram API limits)
2. In-memory storage cleanup (memory leaks)
3. Concurrent users taking same exam
4. Long messages (Telegram 4096 char limit)

## Next Steps
1. Implement Phase 1 (core exam system)
2. Test basic flow
3. Commit and push
4. Implement Phase 2 (winners)
5. Implement Phase 3 (profiles)
6. Final testing and deployment

---

**Ready to proceed with Phase 1?**
