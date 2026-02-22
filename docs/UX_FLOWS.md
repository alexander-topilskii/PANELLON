# UX Flows

## 1. Start and Seed Flow

1. User opens app.
2. Start screen shows seed input and enter action.
3. Effective seed resolved by priority contract.
4. User enters world at floor 0 spawn.

Edge cases:

- invalid/empty seed input -> fallback to default seed.
- WebGL unavailable -> dedicated error screen with explanation.

## 2. Exploration Flow

1. User moves in corridor.
2. User approaches door.
3. Optional preview becomes visible.
4. User enters room mode.
5. User exits room back to corridor.

Design intent:

- no sudden camera snaps;
- clear feedback on mode switch.

## 3. Floor Transition Flow

1. User enters stair trigger.
2. Fade-out starts.
3. Previous floor resources disposed.
4. Next floor context generated/loaded.
5. Fade-in ends at new spawn.

Failure behavior:

- on generation failure, show retry overlay and safe fallback.

## 4. Pause/Settings Flow

1. `Escape` unlocks pointer and opens menu.
2. User can inspect seed/floor/cache usage.
3. User closes menu and returns to play state.

## 5. Archive Flow

1. While in room, user clicks "Archive".
2. Entry saved to IndexedDB archive with metadata.
3. Archive list displays stored finds.
4. User can inspect and reopen context.

## 6. Error Messaging Principles

- One clear reason per error dialog.
- Always provide recovery action ("retry", "clear cache", "continue").
- Avoid technical jargon in user-facing copy.
