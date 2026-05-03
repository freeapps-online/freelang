# Refactor Plan

## Current Assessment

### Problems Found

#### 1. Dead Code (delete immediately)
- `web/src/components/PracticeTab.tsx` (200 lines) — pro app leftover, not imported
- `web/src/components/TranslateTab.tsx` (183 lines) — pro app leftover, not imported
- `web/src/components/ConversationTab.tsx` — pro app leftover, not imported
- `web/src/components/MicButton.tsx` — not imported anywhere
- `web/src/hooks/useSwipeCard.ts` (53 lines) — created but never used
- `web/src/hooks/useFeedbackTimer.ts` (37 lines) — created but never used
- `web/src/speech.d.ts` — check if still needed

#### 2. Duplicate Code
- `MiniStat` component defined **5 times** (FlashcardsTab, ClozeTab, SpeakTab, WordStatsPanel, SentenceStatsPanel)
- `WordStatsPanel` defined **2 times** (FlashcardsTab inline + practice/WordStatsPanel.tsx)
- `SentenceStatsPanel` defined **2 times** (SpeakTab inline + practice/SentenceStatsPanel.tsx)
- `DictionarySheet` defined **2 times** (FlashcardsTab inline + practice/DictionarySheet.tsx)
- Swipe/drag logic duplicated across all 4 tabs (~30 lines each)
- Voice mode state machine duplicated across FlashcardsTab, MissingLetterTab, ClozeTab (~80 lines each)

#### 3. Unused Shared Components (created during failed refactor)
All files in `web/src/components/practice/` except `index.ts` are NOT imported by any tab:
- CardShell.tsx, FeedbackToast.tsx, PracticeLayout.tsx, SwipeHint.tsx, VoiceControls.tsx
- WordStatsPanel.tsx, SentenceStatsPanel.tsx, DictionarySheet.tsx

These are correct extractions but the tabs still use inline versions.

#### 4. Large Files
- `i18n.ts` (923 lines) — translation strings, acceptable but could split by language
- `FlashcardsTab.tsx` (898 lines) — too large, has 3 components + 1 exported
- `App.tsx` (564 lines) — acceptable for the root component
- `SpeakTab.tsx` (499 lines) — has inline SentenceStatsPanel + MiniStat
- `ClozeTab.tsx` (499 lines) — has inline ClozeStatsPanel + MiniStat

### File Sizes Summary
| File | Lines | Status |
|------|-------|--------|
| FlashcardsTab.tsx | 898 | Has inline DictionarySheet(248), WordStatsPanel(162), MiniStat(9) |
| SpeakTab.tsx | 499 | Has inline SentenceStatsPanel(106), MiniStat(9) |
| ClozeTab.tsx | 499 | Has inline ClozeStatsPanel(126), MiniStat(9) |
| MissingLetterTab.tsx | 418 | Imports WordStatsPanel from FlashcardsTab (!) |
| App.tsx | 564 | Acceptable |

## Refactor Steps (in order, one at a time)

### Step 1: Delete dead code
Delete unused files. Zero risk. Just removal.

### Step 2: Extract MiniStat to shared
Create `practice/MiniStat.tsx` (9 lines). Delete from all 5 locations.
Import from shared. Build. Test. Deploy.

### Step 3: Make tabs import WordStatsPanel from practice/
The shared `practice/WordStatsPanel.tsx` already exists and is correct.
- FlashcardsTab: delete inline WordStatsPanel (lines 729-889), import from practice/
- MissingLetterTab: change import from FlashcardsTab to practice/
Build. Test. Deploy.

### Step 4: Make tabs import SentenceStatsPanel from practice/
The shared `practice/SentenceStatsPanel.tsx` already exists.
- SpeakTab: delete inline SentenceStatsPanel + MiniStat, import from practice/
- ClozeTab: delete inline ClozeStatsPanel + MiniStat, import SentenceStatsPanel with passScore
Build. Test. Deploy.

### Step 5: Make FlashcardsTab import DictionarySheet from practice/
The shared `practice/DictionarySheet.tsx` already exists.
- Delete inline DictionarySheet from FlashcardsTab (lines 477-725)
Build. Test. Deploy.

### Step 6: Delete unused shared hooks
Delete `hooks/useSwipeCard.ts` and `hooks/useFeedbackTimer.ts` — they were created
for a refactor approach that didn't work. Can recreate if needed later.

### Rules for future refactoring
1. One file at a time
2. Build after each change
3. Test on mobile after deploy
4. Never change JSX structure and imports in the same commit
5. Keep inline versions until shared version is proven to work
