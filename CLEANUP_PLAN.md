# Session Test Infrastructure Cleanup Plan

## Background: How Session Testing Works

### The C Parity Testing Approach

This project ports NetHack from C to JavaScript. To ensure faithfulness, we use **session testing**: we record what the C NetHack does (keystrokes, RNG calls, screen output, map grids) and replay the same inputs in JS to verify identical behavior.

A **session file** captures a complete game interaction:
```json
{
  "seed": 12345,
  "options": { "role": "Valkyrie", "race": "human", ... },
  "steps": [
    { "key": null, "action": "startup", "rng": ["rn2(2)=1", ...] },
    { "key": "h", "action": "move", "rng": ["rn2(20)=5", ...] }
  ]
}
```

The session test runner:
1. Initializes a JS game with the same seed and options
2. Feeds each keystroke
3. Compares the JS RNG calls against the recorded C RNG calls
4. Reports any divergence (JS behaving differently than C)

### The Problem: Test Code That Pretends to Be Game Code

Over time, the test infrastructure grew a parallel implementation of the game. Instead of testing `NetHackGame` (the actual game users play), tests run a separate `HeadlessGame` class that duplicates 600+ lines of game logic.

**Why did this happen?** The original `NetHackGame` was designed for browser play:
- It reads configuration from URL parameters
- It creates a DOM-based Display for canvas rendering
- It prompts the user interactively for character selection

None of this works in a Node.js test environment. Rather than refactor `NetHackGame` to be testable, a parallel `HeadlessGame` was created.

**The consequence:** We now maintain two implementations of:
- Turn processing (`processTurnEnd()` vs `simulateTurnEnd()`)
- Monster movement (`mcalcmove()`)
- Sound effects (`dosounds()`)
- Level changes (`changeLevel()`)

When we fix a bug in one, we must remember to fix the other. When we forget, tests pass but the actual game is broken (or vice versa).

## Rationale: Why Unify the Infrastructure

### Principle 1: Test What Users Play

The fundamental testing principle is violated when test code runs different code than production. Our goal is to verify that `NetHackGame` matches C NetHack. If tests run `HeadlessGame` instead, we're verifying the wrong thing.

**Before (current):**
```
C NetHack ──records──> session.json
                           │
HeadlessGame ◄──replays────┘  (test code, not the real game)
     │
     └── compares ──> "Test passed!"

But users run NetHackGame, which might behave differently!
```

**After (this plan):**
```
C NetHack ──records──> session.json
                           │
NetHackGame ◄──replays─────┘  (the actual game!)
     │
     └── compares ──> "Test passed!"

If tests pass, the real game matches C.
```

### Principle 2: Dependency Injection Over Duplication

The reason `HeadlessGame` exists is that `NetHackGame` has hardcoded dependencies:
- `new Display('game')` - creates DOM canvas
- `getUrlParams()` - reads browser URL
- `nhgetch()` - waits for user keyboard input

The solution is **dependency injection**: let the caller provide these dependencies.

```javascript
// Before: hardcoded
class NetHackGame {
    async init() {
        this.display = new Display('game');  // Only works in browser
    }
}

// After: injectable
class NetHackGame {
    constructor(options = {}) {
        this.display = options.display || new Display('game');
    }
}

// Test code:
const game = new NetHackGame({ display: new HeadlessDisplay() });
```

This pattern is standard in testable software design. It lets us:
- Test with `HeadlessDisplay` (captures screen as text)
- Play in browser with `Display` (renders to canvas)
- Add future displays (ANSI terminal, accessibility, etc.)

### Principle 3: Single Source of Truth

When logic exists in one place, there's one place to understand it, one place to fix bugs, and one place to verify correctness.

**Current state (multiple sources of truth):**
- Chargen menus: `nethack.js` AND `session_test_runner.js`
- Turn processing: `nethack.js` AND `session_helpers.js`
- Level changes: `nethack.js` AND `session_helpers.js`

**After cleanup (single source of truth):**
- All game logic: `nethack.js`
- All display logic: `display.js` + `headless_display.js` (same interface)
- All test logic: `session_test_runner.js` (comparison only, no game logic)

### Principle 4: Wizard Mode Is a Testing Necessity

C NetHack's wizard mode (`-D` flag) exists specifically for debugging and testing. Key capabilities:

| Command | Purpose | Testing Use |
|---------|---------|-------------|
| Ctrl+V | Level teleport | Test map generation at any depth |
| #wish | Create any item | Test item interactions |
| Ctrl+E | Search everywhere | Verify map contents |
| Ctrl+F | Reveal map | Compare against C map |

Our current "wizard mode" only auto-selects Valkyrie/Human/Female/Neutral. To properly test map generation at dungeon levels 2-5, we need level teleport. The C test harness uses this:

```python
# From gen_map_sessions.py
wizard_level_teleport(session, depth)  # Sends Ctrl+V, types depth, Enter
execute_dumpmap(session)               # Runs #dumpmap to capture map
```

We need equivalent functionality in JS to test the same scenarios.

## Cost/Benefit Analysis

### Costs

| Cost | Mitigation |
|------|------------|
| **~2-3 days of refactoring** | Phased approach allows incremental progress |
| **Risk of introducing bugs** | Migration strategy keeps old code until new code verified |
| **Learning curve for new APIs** | APIs are simpler than current dual-implementation |

### Benefits

| Benefit | Impact |
|---------|--------|
| **Eliminate 600+ lines of duplication** | Less code to maintain |
| **Single source of truth** | Fix bugs once, not twice |
| **Test the actual game** | Higher confidence in correctness |
| **Faster debugging** | Same code path for play and test |
| **Foundation for future features** | Replay system, AI training, accessibility |
| **Easier onboarding** | New contributors learn one implementation |

### Why Now?

1. **Critical mass of sessions**: We have 150+ session files; test infrastructure is used daily
2. **Frequent duplication bugs**: Multiple recent bugs were fixed in one place but not the other
3. **Map testing blocked**: Can't properly test map generation without wizard mode
4. **Compounding cost**: Every new feature adds to both implementations

## Goal

Unify the test infrastructure into three clean categories:
1. **Unit tests** - Pure JS logic tests (existing, no changes needed)
2. **E2E tests** - Browser-based integration tests (existing, no changes needed)
3. **Session tests** - Fast headless replay against C reference sessions

The session test runner should be simple and avoid mixing test logic with game logic. All NetHack behavior should live in `nethack.js`.

## Current Problems

### 1. Duplicated Game Logic (~600 lines)
`session_helpers.js` contains a `HeadlessGame` class that duplicates most of `NetHackGame`:
- `simulateTurnEnd()` duplicates `processTurnEnd()`
- `mcalcmove()`, `shouldInterruptMulti()`, `dosounds()` are copy-pasted
- Bug fixes must be applied in two places

### 2. Chargen Menu Builders in Test Code (~150 lines)
`session_test_runner.js` rebuilds chargen screens to compare against C:
- `buildRoleMenuLines()`, `buildRaceMenuLines()`, etc.
- Duplicates display logic from `nethack.js`
- Fragile: changes to chargen UI require updating both places

### 3. No Clean Headless Interface
`NetHackGame` is designed for interactive browser play:
- Initialization reads URL params, creates DOM-based Display
- No way to inject custom Display/Input for testing
- No way to pass "command line options" programmatically

### 4. Incomplete Wizard Mode
Current wizard mode only auto-selects character. Missing:
- Level teleport (Ctrl+V in C NetHack)
- Map dump command (#dumpmap)
- Other debug commands needed for map testing

### 5. Multiple Test Runners with Different Approaches
- `session_test_runner.js` - library of test functions
- `session_helpers.js` - HeadlessGame + utilities
- `headless_game.js` - separate interface-only HeadlessGame
- Tests scattered across chargen.test.js, map.test.js, gameplay.test.js, etc.

## Architecture After Cleanup

```
┌─────────────────────────────────────────────────────────────────┐
│                     nethack.js                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  NetHackGame                                                ││
│  │  - constructor(options)  // seed, wizard, display, etc.     ││
│  │  - parityInit(session)   // init from session options       ││
│  │  - feedKey(key)          // inject keystroke                ││
│  │  - getTypGrid()          // extract current map grid        ││
│  │  - getRngLog()           // get RNG trace                   ││
│  │  - wizardLevelTeleport() // ^V equivalent                   ││
│  └─────────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  Exported Utilities (for test comparison)                   ││
│  │  - buildRoleMenuLines(), buildRaceMenuLines(), etc.         ││
│  │  - renderChargenScreen(state) → screen lines                ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   HeadlessDisplay                               │
│  - 80x24 character grid                                         │
│  - putstr(), renderMap(), renderStatus(), etc.                  │
│  - getScreenLines() → string[]                                  │
│  - Implements same interface as browser Display                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│               session_test_runner.js (simplified)               │
│  - Load session JSON                                            │
│  - Create NetHackGame with HeadlessDisplay                      │
│  - game.parityInit(session.options)                             │
│  - For each step: feedKey(), compare RNG/screen/grid            │
│  - Report results                                               │
│  (NO game logic - just orchestration)                           │
└─────────────────────────────────────────────────────────────────┘
```

## Implementation Plan

### Phase 1: Refactor NetHackGame Constructor

**File: js/nethack.js**

Add options-based constructor that accepts:

```javascript
class NetHackGame {
    constructor(options = {}) {
        // Core state
        this.player = new Player();
        this.map = null;
        this.display = options.display || null;  // Allow injection
        this.fov = new FOV();
        this.levels = {};
        this.gameOver = false;
        this.turnCount = 0;

        // Options (like C command line flags)
        this.seed = options.seed ?? null;
        this.wizard = options.wizard ?? false;
        this.enableRngLog = options.enableRngLog ?? false;

        // Character options (like .nethackrc)
        this.charOptions = {
            name: options.name ?? null,
            role: options.role ?? null,
            race: options.race ?? null,
            gender: options.gender ?? null,
            align: options.align ?? null,
        };
    }
}
```

### Phase 2: Add parityInit() Method

Initialize game state from session options without interactive prompts:

```javascript
async parityInit(sessionOptions) {
    // Set seed and init RNG
    this.seed = sessionOptions.seed;
    initRng(this.seed);
    setGameSeed(this.seed);

    if (this.enableRngLog) {
        enableRngLog();
    }

    // Set character from options (skip chargen UI)
    const roleIdx = ROLE_INDEX[sessionOptions.role];
    this.player.initRole(roleIdx);
    this.player.name = sessionOptions.name;
    this.player.race = RACE_INDEX[sessionOptions.race];
    this.player.gender = sessionOptions.gender === 'female' ? FEMALE : MALE;
    this.player.alignment = ALIGN_MAP[sessionOptions.align];
    this.player.wizard = sessionOptions.wizard;
    this.wizard = sessionOptions.wizard;

    // Init level generation
    setMakemonPlayerContext(this.player);
    initLevelGeneration(this.player.roleIndex);

    // Generate first level
    this.changeLevel(1);
    this.placePlayerOnLevel();

    // Post-level init
    const initResult = simulatePostLevelInit(this.player, this.map, 1);
    this.seerTurn = initResult.seerTurn;
}
```

### Phase 3: Add Keystroke Injection

```javascript
// Inject a keystroke and process it
feedKey(key) {
    // Push key to input buffer
    pushInput(key);

    // Process the command (call rhack or menu handler)
    // Return any messages/state changes
}

// Get current RNG log
getRngLog() {
    return getRngLog();
}

// Extract typGrid from current map
getTypGrid() {
    const grid = [];
    for (let y = 0; y < ROWNO; y++) {
        const row = [];
        for (let x = 0; x < COLNO; x++) {
            row.push(this.map.levl[x][y].typ);
        }
        grid.push(row);
    }
    return grid;
}
```

### Phase 4: Add Wizard Mode Commands

```javascript
// Wizard mode level teleport (Ctrl+V equivalent)
wizardLevelTeleport(targetDepth) {
    if (!this.wizard) {
        throw new Error('Level teleport requires wizard mode');
    }

    // Save current level
    this.levels[this.player.dungeonLevel] = this.map;

    // Generate or load target level
    if (!this.levels[targetDepth]) {
        this.changeLevel(targetDepth);
    } else {
        this.map = this.levels[targetDepth];
        this.player.dungeonLevel = targetDepth;
    }

    // Place player
    this.placePlayerOnLevel();
    this.fov.compute(this.map, this.player.x, this.player.y);
}
```

### Phase 5: Export Chargen Menu Builders

Move chargen screen builders to exports:

```javascript
// js/nethack.js or js/chargen.js
export function buildRoleMenuLines(raceIdx, gender, align, rfilter) {
    // Current _showRoleMenu logic, extracted to pure function
}

export function buildRaceMenuLines(roleIdx, gender, align, rfilter) {
    // Current _showRaceMenu logic
}

// etc.
```

### Phase 6: Create HeadlessDisplay

**File: js/headless_display.js**

```javascript
export class HeadlessDisplay {
    constructor() {
        this.screen = Array(24).fill(null).map(() => Array(80).fill(' '));
        this.messages = [];
    }

    // Implement Display interface
    putstr(row, col, text, color) { ... }
    renderMap(map, player, fov, flags) { ... }
    renderStatus(player) { ... }
    putstr_message(msg) { ... }
    clearScreen() { ... }

    // Test utilities
    getScreenLines() {
        return this.screen.map(row => row.join(''));
    }
}
```

### Phase 7: Simplify Session Test Runner

**File: test/comparison/session_test_runner.js**

```javascript
import { NetHackGame } from '../../js/nethack.js';
import { HeadlessDisplay } from '../../js/headless_display.js';
import { compareRng, compareGrids } from './comparison_utils.js';

export async function runSession(sessionPath) {
    const session = JSON.parse(fs.readFileSync(sessionPath));
    const display = new HeadlessDisplay();

    const game = new NetHackGame({
        display,
        enableRngLog: true,
        wizard: session.options.wizard,
    });

    await game.parityInit(session.options);

    const results = { passed: true, steps: [] };

    for (const step of session.steps) {
        if (step.key !== null) {
            game.feedKey(step.key);
        }

        // Compare RNG
        if (step.rng) {
            const cmp = compareRng(game.getRngLog(), step.rng);
            if (cmp.index !== -1) {
                results.passed = false;
                results.firstDivergence = cmp;
            }
        }

        // Compare screen (for chargen/interface)
        if (step.screen) {
            const screen = display.getScreenLines();
            // Compare...
        }

        // Compare typGrid (for map sessions)
        if (step.typGrid) {
            const grid = game.getTypGrid();
            const diffs = compareGrids(grid, step.typGrid);
            if (diffs.length > 0) {
                results.passed = false;
            }
        }
    }

    return results;
}
```

### Phase 8: Delete Redundant Files

After migration:
- Delete `session_helpers.js` HeadlessGame class
- Delete `headless_game.js`
- Simplify `session_test_runner.js` to ~200 lines
- Remove chargen menu builders from test code

## Files Changed

| File | Action |
|------|--------|
| `js/nethack.js` | Add options constructor, parityInit, feedKey, getTypGrid, wizardLevelTeleport |
| `js/headless_display.js` | NEW - Extract/create HeadlessDisplay |
| `js/chargen.js` | NEW (optional) - Export menu builders |
| `test/comparison/session_test_runner.js` | Simplify to ~200 lines |
| `test/comparison/session_helpers.js` | Remove HeadlessGame (~600 lines), keep utilities |
| `test/comparison/headless_game.js` | DELETE |
| `test/comparison/comparison_utils.js` | NEW - Extract compareRng, compareGrids |
| `test/comparison/sessions.test.js` | Simplify to use new runner |

## Benefits

1. **Single source of truth**: All game logic in `nethack.js`
2. **Faster development**: Fix bugs once, tests automatically verify
3. **Cleaner tests**: Test code only does comparison, not game simulation
4. **Better wizard mode**: Can test map generation at any depth
5. **Easier debugging**: Same code path for interactive and headless

## Migration Strategy

1. **Phase 1-4**: Add new APIs to NetHackGame (non-breaking)
2. **Phase 5-6**: Create HeadlessDisplay (parallel to old code)
3. **Phase 7**: Create new simplified runner (can coexist)
4. **Phase 8**: Switch sessions.test.js to new runner
5. **Phase 9**: Delete old code after verifying all tests pass

## Open Questions

1. Should HeadlessDisplay live in `js/` or `test/`? (Recommend `js/` since it implements the Display interface)

2. How to handle async input in feedKey()? (May need to make it async or use a command queue)

3. Should parityInit() consume RNG for chargen even when skipping UI? (Yes, for faithful parity)

4. Keep separate test files per type (chargen.test.js, map.test.js) or unify? (Recommend unify into sessions.test.js)

---

## Appendix A: Display Interface Methods

HeadlessDisplay must implement these methods from `js/display.js`:

```javascript
// Core rendering
putstr(row, col, text, color)           // Write text at position
putstr_message(msg)                      // Add to message line
clearScreen()                            // Clear entire screen
renderMap(map, player, fov, flags)       // Render dungeon map
renderStatus(player)                     // Render status lines (bottom 2 rows)

// Menu rendering (for chargen)
renderChargenMenu(lines, isFirstMenu)    // Render chargen menu screen
showMenu(items, prompt, flags)           // General menu display

// Message handling
acknowledgeMessages()                    // Handle --More-- prompts
getMessages()                            // Get current message buffer

// Screen extraction (test-only)
getScreenLines()                         // Return string[24] of screen content
getScreenAnsi()                          // Return ANSI-escaped screen (optional)
```

## Appendix B: Session Format Reference

### v3 Session Structure

```javascript
{
  "version": 3,
  "seed": 1,                           // RNG seed
  "source": "c",                       // "c" or "js"
  "type": "gameplay",                  // "chargen" | "gameplay" | "map" | "special" | "interface"
  "options": {
    "name": "Wizard",
    "role": "Valkyrie",                // Role name (not index)
    "race": "human",                   // Race name
    "gender": "female",                // "male" | "female"
    "align": "neutral",                // "lawful" | "neutral" | "chaotic"
    "wizard": true,                    // Wizard mode flag
    "symset": "DECgraphics",           // Symbol set
    "autopickup": false,
    "pickup_types": ""
  },
  "steps": [
    {
      "key": null,                     // null for startup, char code otherwise
      "action": "startup",             // Action name for debugging
      "rng": ["rn2(2)=1 @ file.c:123", ...],  // RNG calls during this step
      "screen": ["line1", "line2", ...],       // Plain text screen (24 lines)
      "screenAnsi": ["...", ...],              // ANSI-escaped screen (optional)
      "typGrid": [[1,2,3,...], ...]            // Map grid (for map sessions)
    },
    {
      "key": 104,                      // 'h' = move west
      "action": "move",
      "rng": [...]
    }
  ]
}
```

### Session Types

| Type | Description | Key Fields |
|------|-------------|------------|
| `chargen` | Character creation flow | steps with screen comparisons |
| `gameplay` | Turn-by-turn play | steps with RNG traces |
| `map` | Level generation | levels array with typGrid |
| `special` | Special level generation | levels with levelName |
| `interface` | Menu/UI testing | steps with screen comparisons |

## Appendix C: RNG Integration

### Current RNG API (js/rng.js)

```javascript
// Core functions
initRng(seed)                    // Initialize PRNG with seed
rn2(n)                           // Random 0..n-1
rnd(n)                           // Random 1..n
rn1(x, y)                        // Random x..x+y-1

// Logging (for parity testing)
enableRngLog()                   // Start recording calls
disableRngLog()                  // Stop recording
getRngLog()                      // Get array of logged calls
clearRngLog()                    // Clear the log

// Log entry format: "rn2(12)=5 @ functionName(file.c:123)"
```

### RNG Comparison Logic (to keep in comparison_utils.js)

```javascript
function compareRng(jsRng, sessionRng) {
    // Normalize both arrays (strip wrapper calls like rne/rnz)
    const jsCompact = jsRng.map(toCompact);
    const sessCompact = sessionRng.filter(s => !isMidlog(s)).map(toCompact);

    // Find first divergence
    for (let i = 0; i < Math.max(jsCompact.length, sessCompact.length); i++) {
        if (jsCompact[i] !== sessCompact[i]) {
            return { index: i, js: jsCompact[i], session: sessCompact[i] };
        }
    }
    return { index: -1 };  // No divergence
}

function toCompact(entry) {
    // "rn2(12)=5 @ file.c:123" → "rn2(12)=5"
    return entry.split('@')[0].trim();
}

function isMidlog(s) {
    // Filter mid-level trace entries (>entry / <exit)
    return s && (s.startsWith('>') || s.startsWith('<'));
}
```

## Appendix D: Existing Code References

### NetHackGame (js/nethack.js)

| Line | Current Code | Change Needed |
|------|--------------|---------------|
| 34 | `constructor()` | Add `options` parameter |
| 71-165 | `async init()` | Keep for browser, add `parityInit()` alternative |
| 126-135 | Wizard mode auto-select | Extract to reusable function |
| 279-313 | `playerSelection()` | Keep for browser, skip in `parityInit()` |
| ~500 | `changeLevel()` | Reuse in `wizardLevelTeleport()` |

### session_helpers.js

| Line | Code | Action |
|------|------|--------|
| 578-800 | `class HeadlessGame` | DELETE (use NetHackGame) |
| 213-320 | RNG comparison functions | MOVE to comparison_utils.js |
| 1790+ | `class HeadlessDisplay` | MOVE to js/headless_display.js |

### session_test_runner.js

| Line | Code | Action |
|------|------|--------|
| 282-501 | Chargen menu builders | DELETE (use exports from nethack.js) |
| 629-662 | `deriveChargenState()` | DELETE (game tracks state internally) |

## Appendix E: Test Commands

After cleanup, these commands should work:

```bash
# Run all tests
npm test

# Run only unit tests
npm run test:unit

# Run only session tests
npm run test:sessions

# Run single session
node test/comparison/session_test_runner.js sessions/seed1_gameplay.session.json

# Run sessions by type
node test/comparison/session_test_runner.js --type=chargen
node test/comparison/session_test_runner.js --type=map

# Verbose output
node test/comparison/session_test_runner.js --verbose
```

## Appendix F: Verification Checklist

After each phase, verify:

- [ ] `npm run test:unit` passes (no regressions)
- [ ] `npm run test:sessions` shows same pass/fail counts
- [ ] Browser gameplay still works (`npm run serve`)
- [ ] No new lint errors
- [ ] No increase in test runtime (should decrease)
