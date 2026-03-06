# Architecture & Design

> *"You enter a vast hall of interconnected modules. The architecture is elegant,
> if somewhat maze-like."*

**See also:**
[DEVELOPMENT.md](DEVELOPMENT.md) (dev workflow) |
[DECISIONS.md](DECISIONS.md) (trade-offs) |
[LORE.md](LORE.md) (porting lessons)

## Overview

This project is a faithful JavaScript port of NetHack 3.7, rendering the classic
ASCII/DEC-symbol display in a web browser. The goal is **readable, traceable
JavaScript** that mirrors the C implementation's logic, with comments referencing
the original C source files and line numbers.

## Design Philosophy

> *"The strident call of fidelity echoes through the corridors."*

This port prioritizes **fidelity, readability, and traceable implementation**:

- Every function is hand-ported readable JavaScript that can be followed alongside the C source (not compiled/WASM)
- Comments link each JS function to its C counterpart (e.g., `// C ref: uhitm.c find_roll_to_hit()`)
- Display matches terminal NetHack exactly: 80×24 grid, 16 ANSI colors, DEC line-drawing characters
- We port the core game loop first, then layer on subsystems in priority order

For the design trade-offs that created this architecture (async game loop, ES6 modules without bundling, `<pre>`/`<span>` rendering), see [DECISIONS.md](DECISIONS.md).

## Architecture

### Module Structure

```
webhack/
├── index.html                 Main HTML page (80×24 terminal)
├── package.json               Node.js project config (ES modules, test scripts)
├── CNAME                      GitHub Pages domain (mazesofmenace.net)
├── Guidebook.txt              Original NetHack Guidebook
├── README.md                  Project overview and status
├── AGENTS.md                  Agent workflow instructions
├── scripts/generators/gen_monsters.py          Code generator: C monsters.h → JS monsters.js
├── scripts/generators/gen_objects.py           Code generator: C objects.h → JS objects.js
├── scripts/generators/gen_artifacts.py         Code generator: C artilist.h → JS artifacts.js
├── scripts/generators/gen_weapon_constants.py  Code generator: C skills.h/monst.h → JS weapon constants
│
├── js/                        ── Game Source (32 modules) ──
│   │
│   │  ┌─ Core ─────────────────────────────────────────────┐
│   ├── nethack.js             Entry point, game init (← allmain.c)
│   ├── const.js              Game constants & terrain types (← rm.h, hack.h)
│   ├── player.js              Player state (← you.h, decl.h)
│   ├── cmd.js                 Command dispatch (← cmd.c)
│   │
│   │  ┌─ Display & I/O ───────────────────────────────────┐
│   ├── display.js             Browser TTY display (← win/tty/*.c)
│   ├── input.js               Async keyboard queue (← tty input)
│   ├── const.js              (also includes display symbols & colors from ← defsym.h, drawing.c)
│   ├── pager.js               In-terminal text pager (← pager.c)
│   │
│   │  ┌─ RNG ─────────────────────────────────────────────┐
│   ├── isaac64.js             ISAAC64 PRNG engine, BigInt (← isaac64.c)
│   ├── rng.js                 RNG interface: rn2, rnd, d (← rnd.c)
│   │
│   │  ┌─ World Generation ────────────────────────────────┐
│   ├── dungeon.js             Level generation (← mklev.c, mkroom.c, sp_lev.c)
│   ├── game.js                Level map data structures (← rm.h, mkmap.c)
│   ├── themerms.js            Themeroom definitions (← dat/themerms.lua)
│   ├── vision.js              Field of view, Algorithm C (← vision.c)
│   │
│   │  ┌─ Creatures ───────────────────────────────────────┐
│   ├── monsters.js            Monster data table (← monsters.h)
│   ├── mondata.js             Monster predicate functions (← mondata.h)
│   ├── makemon.js             Monster creation (← makemon.c)
│   ├── monmove.js             Monster movement AI (← monmove.c)
│   ├── dog.js                 Pet AI helpers (← dog.c)
│   │
│   │  ┌─ Objects ─────────────────────────────────────────┐
│   ├── objects.js             Object data table (← objects.h)
│   ├── objdata.js             Object predicate functions (← objclass.h)
│   ├── mkobj.js               Object creation (← mkobj.c)
│   ├── o_init.js              Object init & description shuffle (← o_init.c)
│   │
│   │  ┌─ Character Creation ──────────────────────────────┐
│   ├── u_init.js              Post-level init: pet, inventory, attrs (← u_init.c)
│   │
│   │  ┌─ Combat ──────────────────────────────────────────┐
│   ├── uhitm.js               Hero-vs-monster combat core (← uhitm.c)
│   ├── mhitu.js               Monster-vs-hero combat core (← mhitu.c)
│   ├── mhitm.js               Monster-vs-monster combat core (← mhitm.c)
│   │
│   │  ┌─ Persistence ─────────────────────────────────────┐
│   ├── storage.js             Save/restore via localStorage (← save.c, restore.c)
│   ├── bones.js               Bones file management (← bones.c)
│   ├── topten.js              High score list (← topten.c)
│   │
│   │  ┌─ Data Files ──────────────────────────────────────┐
│   ├── hacklib.js             xcrypt cipher & data parsing (← hacklib.c)
│   ├── epitaph_data.js        Encrypted epitaphs (← dat/epitaph)
│   ├── engrave_data.js        Encrypted engravings (← dat/engrave)
│   └── rumor_data.js          Encrypted rumors (← dat/rumors)
│
├── dat/                       ── Help Text Data ──
│   ├── help.txt               General help
│   ├── hh.txt                 Quick reference
│   ├── history.txt            Version history
│   ├── opthelp.txt            Options help
│   └── wizhelp.txt            Wizard mode help
│
├── docs/                      ── Documentation ──
│   ├── DESIGN.md              This file
│   ├── DECISIONS.md           Design decision log
│   ├── SESSION_FORMAT.md      Session file format spec (v2)
│   ├── COLLECTING_SESSIONS.md How to capture C reference sessions
│   ├── DEVELOPMENT.md         Development workflow
│   ├── PHASE_1_PRNG_ALIGNMENT.md   Phase 1 goals & progress
│   ├── PHASE_2_GAMEPLAY_ALIGNMENT.md Phase 2 goals & progress
│   └── bugs/
│       └── pet-ai-rng-divergence.md Known pet AI divergence
│
├── test/                      ── Test Infrastructure ──
│   ├── unit/                  26 unit test files (node --test)
│   │   ├── rng.test.js        PRNG functions
│   │   ├── isaac64.test.js    ISAAC64 engine
│   │   ├── dungeon.test.js    Level generation
│   │   ├── map.test.js        Map structures
│   │   ├── combat.test.js     Combat system
│   │   ├── makemon.test.js    Monster creation
│   │   ├── mkobj.test.js      Object creation
│   │   ├── o_init.test.js     Object shuffling
│   │   ├── u_init.test.js     Character init
│   │   ├── chargen.test.js    Character creation (90 golden sessions)
│   │   ├── monsters.test.js   Monster data
│   │   ├── objects.test.js    Object data
│   │   ├── player.test.js     Player state
│   │   ├── monmove.test.js    Monster movement
│   │   ├── config.test.js     Configuration
│   │   ├── fov.test.js        Field of view
│   │   ├── gameloop.test.js   Game loop
│   │   ├── bones.test.js      Bones system
│   │   ├── storage.test.js    Save/restore
│   │   ├── topten.test.js     High scores
│   │   ├── epitaph.test.js    Epitaph decryption
│   │   ├── hacklib.test.js    hacklib utilities
│   │   ├── wizard.test.js     Wizard mode
│   │   ├── gameover.test.js   Game over logic
│   │   ├── display_gameover.test.js  Death screen
│   │   └── screen_compare.test.js    Screen comparison
│   │
│   ├── e2e/                   End-to-end browser tests (Puppeteer)
│   │   ├── game.e2e.test.js
│   │   └── gameplay.e2e.test.js
│   │
│   └── comparison/            ── C Comparison Testing ──
│       ├── sessions.test.js       Session replay test entrypoint
│       ├── gen_rng_log.js     Generate JS RNG logs
│       ├── gen_typ_grid.js    Generate JS terrain grids
│       ├── sessions/          96 golden session files (.session.json)
│       ├── golden/            ISAAC64 reference outputs (4 seeds)
│       ├── isaac64_reference.c  C ISAAC64 for golden generation
│       └── c-harness/         C NetHack build & capture tools
│           ├── setup.sh           Build patched C NetHack
│           ├── macosx-minimal     macOS build hints file
│           ├── run_session.py     Capture gameplay sessions via tmux
│           ├── run_dumpmap.py     Capture map grids
│           ├── run_trace.py       Capture RNG traces
│           ├── gen_chargen_sessions.py  Generate chargen sessions
│           ├── gen_map_sessions.py     Generate map sessions
│           ├── capture_inventory.py    Capture inventory data
│           ├── plan_session.py    Session planning helper
│           └── patches/
│               ├── 001-deterministic-seed.patch
│               ├── 002-map-dumper.patch
│               ├── 003-prng-logging.patch
│               ├── 004-obj-dumper.patch
│               └── 005-midlog-infrastructure.patch
│
├── spoilers/                  ── Spoiler Guide (separate site) ──
│   ├── guide.md               Guide source (Markdown)
│   ├── index.html             Built HTML guide
│   ├── style.css              Guide styling
│   ├── template.html          Pandoc HTML template
│   ├── template.tex           Pandoc LaTeX template
│   ├── latex-filter.lua       Pandoc Lua filter
│   ├── build.sh               Build HTML version
│   └── build-latex.sh         Build PDF version
│
└── nethack-c/                 ── Reference C Source (git-ignored) ──
    └── (cloned & patched by test/comparison/c-harness/setup.sh)
```

### Display Architecture

> *"The walls of the room are covered in `<span>` tags."*

**Choice: `<pre>` with per-cell `<span>` elements**

The display uses a `<pre>` element containing an 80×24 grid. Each character
position is a `<span>` with CSS classes for the 16 NetHack colors. This matches
the TTY window port's approach of writing individual characters at (x,y)
positions.

The C code's `window_procs` structure defines the windowing interface:
- `win_print_glyph(win, x, y, glyph_info)` → renders a character at (x,y)
- `win_putstr(win, attr, str)` → writes a string to a window
- `win_nhgetch()` → gets a character of input
- `win_yn_function(query, resp, def)` → yes/no prompts

Our JS `Display` class implements all these as methods that manipulate the DOM.

**Color mapping:** NetHack uses 16 colors (CLR_BLACK through CLR_WHITE plus
bright variants). These map directly to CSS classes: `.clr-red`, `.clr-green`,
etc.

**Window types:** NetHack has NHW_MESSAGE (top line), NHW_MAP (main map),
NHW_STATUS (bottom two lines), and NHW_MENU (popup menus). We implement all
four as regions within the terminal grid, with menus overlaying the map.

### Input Architecture

> *"You wait for input. Time passes..."*

**Choice: Async queue with Promise-based waiting**

The C game loop is synchronous: `ch = nhgetch()` blocks until a key is pressed.
In JavaScript, we can't block. Instead:

1. Keyboard events push characters into an input queue
2. `nhgetch()` returns a Promise that resolves when a character is available
3. The game loop uses `await nhgetch()` to wait for input
4. `moveloop_core()` becomes an async function

This is the fundamental architectural difference from the C version. Everything
else follows from this: the game loop, command dispatch, and all input-requesting
functions become async.

### Game Loop Architecture

> *"You are caught in an infinite loop!"*

**C version** (allmain.c:593):
```c
void moveloop(boolean resuming) {
    moveloop_preamble(resuming);
    for (;;) {
        moveloop_core();  // synchronous, blocks on input
    }
}
```

**JS version:**
```javascript
async function moveloop(resuming) {
    moveloop_preamble(resuming);
    while (true) {
        await moveloop_core();  // async, awaits input
    }
}
```

The core loop structure mirrors the C exactly:
1. Process monster movement (if time passed)
2. Update display (vision, status, messages)
3. Get player input via `rhack()` → command dispatch
4. Execute command (may consume time)
5. Repeat

### Data Porting Strategy

> *"You see here 382 monsters and 478 objects."*

**Monster data** (`monsters.h`, 3927 lines): The C uses macro-heavy definitions
like `MON(NAM("giant ant"), S_ANT, LVL(2,18,3,0,0), ...)`. We port these to
JS objects: `{ name: "giant ant", symbol: 'a', level: 2, speed: 18, ... }`.
Each entry includes a comment `// monsters.h:NNN` for traceability.

**Object data** (`objects.h`, 1647 lines): Similar macro-heavy definitions
ported to JS objects with traceability comments.

**Symbol data** (`defsym.h`): The PCHAR definitions map indices to characters,
descriptions, and colors. Ported to a JS array of `{ch, desc, color}` objects.

### Level Generation Strategy

> *"You hear the rumble of distant construction."*

NetHack's dungeon generation (mklev.c) uses this algorithm:
1. Decide number of rooms (3-5 on most levels)
2. Place rooms with random sizes at random positions
3. Connect rooms with corridors (using the order they were created)
4. Add doors at room boundaries
5. Place stairs (up and down)
6. Place furniture (fountains, altars, etc.)
7. Populate with monsters and objects

We port this algorithm faithfully, including the room-joining corridor algorithm
from `join()` in mklev.c which creates L-shaped corridors.

### Combat Architecture

> *"You hit the grid bug! The grid bug is killed!"*

Combat mirrors the C's `uhitm.c` (hero hits monster) and `mhitu.c` (monster
hits hero). The core flow:
1. To-hit roll: `1d20 + bonuses >= target AC + 10`
2. Damage roll: weapon base damage + strength bonus
3. Special effects (poison, drain, etc.)

### Vision/FOV Architecture

> *"It is dark. You can see four directions."*

The JS `vision.js` is a faithful port of the C's Algorithm C from `vision.c`,
the recursive line-of-sight scanner that NetHack actually uses. It traces
visibility along octant rays, handling walls, doors, and partial occlusion
exactly as the C does. This replaced an earlier simplified rule-based approach.

## Global State Management

> *"You feel the weight of hundreds of global variables."*

The C version uses extensive global variables (declared in decl.c/decl.h):
- `u` -- the player (`struct you`)
- `level` -- current level data
- `mons[]` -- monster type data
- `objects[]` -- object type data
- `fmon` -- linked list of monsters on level
- `invent` -- player's inventory chain
- `moves` -- turn counter

In JS, these become properties of a global `NetHack` game state object,
preserving the same names for readability:
```javascript
const NH = {
    u: { ... },        // player state
    level: { ... },    // current level
    moves: 0,          // turn counter
    fmon: null,         // monster list head
    invent: null,       // inventory list head
};
```

## Map Representation

> *"You try to map the level. This is too hard to map!"*

The C version uses `level.locations[x][y]` (an array of `struct rm`).
Each location has:
- `typ` -- terrain type (ROOM, CORR, DOOR, WALL, etc.)
- `seenv` -- which directions player has seen this from
- `flags` -- door state, etc.
- `lit` -- illumination state
- `glyph` -- what's currently displayed here

We mirror this exactly in JS with a 2D array of location objects.
Map dimensions: COLNO=80, ROWNO=21 (matching the C constants).

### Special Level Strategy

> *You read a scroll labeled "des.room()". It's a special level definition!*

NetHack 3.7 defines special levels (Oracle, Castle, Medusa, Sokoban, etc.) via
141 Lua scripts in `dat/`.  WebHack ports these directly to JavaScript rather
than embedding a Lua interpreter.  See Decision 11 in DECISIONS.md for the full
analysis.

The porting requires three foundation pieces:

1. **`des.*` API** -- JS implementations of the 35+ level-builder functions that
   C exposes to Lua via `sp_lev.c`.  These are the verbs of level definition:
   `des.room()`, `des.monster()`, `des.terrain()`, `des.map()`, etc.

2. **Selection API** -- Geometric operations on map coordinates used by complex
   levels and theme rooms: set union/intersection, flood fill, grow, random
   coordinate selection.

3. **`nhlib` helpers** -- Utility functions shared across level files: `percent()`,
   `shuffle()`, dice rolling (already in `rng.js`).

### PRNG Comparison Architecture

> *You sense the presence of determinism.*

The C and JS versions share an identical PRNG (ISAAC64, BigInt-based).  The
core verification strategy: replay the same deterministic seed through both
implementations and compare PRNG call sequences, screen output, and map grids.

**C harness** (`test/comparison/c-harness/`): Patches applied to C NetHack
enable deterministic seeding, PRNG call logging with caller context, map
grid dumping, and object inspection. Python scripts drive tmux sessions to
capture reference data as JSON session files.

**Session files** (`test/comparison/sessions/`): 96 golden reference files
in a unified format (see `docs/SESSION_FORMAT.md`). Two session types:
- **`"gameplay"`** -- full playthrough with RNG traces, screens, and step data
- **`"map"`** -- terrain type grids at multiple dungeon depths

**Session runner** (`test/comparison/sessions.test.js`): Replays each
session through the JS engine, comparing RNG traces call-by-call, screen
output character-by-character, and terrain grids cell-by-cell.

**Current status**: Character creation (90 chargen sessions across 13 roles,
5 races, all alignments) matches the C bit-identically. Gameplay sessions
track RNG through dungeon generation and into the game loop, with remaining
divergences in unimplemented subsystems (shops, some special levels).

### Encrypted Data Files

> *"You try to read the scroll. It's encrypted!"*

NetHack's `makedefs` tool encrypts data files (epitaphs, rumors, engravings)
with a trivial XOR cipher defined in `hacklib.c`. Rather than running makedefs
at build time, we embed the encrypted strings directly in JS modules
(`epitaph_data.js`, `rumor_data.js`, `engrave_data.js`) and decrypt them at
load time using `hacklib.js`'s `xcrypt()` -- the same self-inverse cipher.

---

> *"You ascend to a higher plane of existence. The architecture makes sense
> from up here."*
