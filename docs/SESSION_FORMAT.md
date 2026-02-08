# C Reference Session Format

> *"You carefully read the scroll. It describes a session format."*

## Overview

A **session file** is a single JSON document that captures everything needed
to verify the JS port against C NetHack for a given playthrough: the random
seed, character options, command sequence, and ground-truth data (screen
states, RNG traces, terrain grids) captured from the C binary.

Each session file is self-contained. One file can span multiple dungeon
levels. Test code reads these files and replays the same sequence in JS,
comparing screen output and RNG consumption at each step.

**File location:** `test/comparison/sessions/`
**Naming convention:** `seed<N>.session.json` (e.g., `seed42.session.json`)

## Why JSON?

Previously, reference data was scattered across ~30 files per seed in
3 different text formats:
- `screen_NNN_*.txt` — 24-line terminal captures (DEC graphics)
- `rng_NNN_*.txt` — numbered RNG call logs with C source locations
- `typ_seed*_depth*.txt` — space-separated terrain type grids
- `trace_summary.txt` — human-readable summary

This made it hard to add new test sessions, required custom parsers for
each format, and spread related data across many files. A single JSON
document per session is easier to generate, parse, version, and extend.

## Format Specification

```jsonc
{
  // Schema version — increment when format changes
  "version": 1,

  // PRNG seed (passed as NETHACK_SEED to C binary)
  "seed": 42,

  // Wizard mode flag (affects startup sequence and available commands)
  "wizard": true,

  // Character creation options (match .nethackrc)
  "character": {
    "name": "Wizard",
    "role": "Valkyrie",
    "race": "human",
    "gender": "female",
    "align": "neutral"
  },

  // Terminal symbol set used for screen captures
  // "DECgraphics" means box-drawing chars are encoded as DEC VT100 codes
  // (l=TL corner, q=horizontal, k=TR corner, x=vertical, etc.)
  "symset": "DECgraphics",

  // Game state after startup (level generated, post-level init complete,
  // before any player commands)
  "startup": {
    // Total RNG calls consumed during startup
    // (o_init + level gen + post-level init)
    "rngCalls": 2807,

    // Terrain type grid for the starting level (depth 1)
    // 21 rows x 80 columns of integer terrain type codes
    // (STONE=0, VWALL=1, HWALL=2, ..., ROOM=25, STAIRS=26)
    "typGrid": [
      [0, 0, 0, "... 80 values per row ..."],
      "... 21 rows total ..."
    ],

    // Screen state: 24 lines as captured from C terminal
    // Row 0: message line
    // Rows 1-21: map area (DEC graphics encoding)
    // Rows 22-23: status lines
    "screen": [
      "",
      "                                                       lqqqqqqk",
      "                                                       x~%~~~~x",
      "                                                       ~~@~~~~x",
      "... 24 lines total ..."
    ]
  },

  // Ordered sequence of player actions and their ground truth
  "steps": [
    {
      // The key sent to C NetHack
      "key": ":",

      // Human-readable action description
      "action": "look",

      // Turn number after this step (0 = no game turn consumed)
      "turn": 0,

      // Dungeon level after this step
      "depth": 1,

      // RNG calls consumed during this step
      // Each entry: "fn(arg)=result" with optional " @ source:line"
      // Empty array if no RNG consumed (e.g., look command)
      "rng": [],

      // Screen state after this step (24 lines, same format as startup)
      "screen": [
        "There is a staircase up out of the dungeon here.",
        "                                                       lqqqqqqk",
        "..."
      ]
    },
    {
      "key": "h",
      "action": "move-west",
      "turn": 1,
      "depth": 1,
      "rng": [
        "rn2(12)=2 @ mon.c:1145",
        "rn2(12)=9 @ mon.c:1145",
        "rn2(12)=3 @ mon.c:1145",
        "rn2(12)=3 @ mon.c:1145",
        "rn2(70)=52 @ allmain.c:234",
        "rn2(400)=79 @ sounds.c:213",
        "rn2(20)=9 @ eat.c:3186",
        "rn2(82)=26 @ allmain.c:359",
        "rn2(31)=3 @ allmain.c:414"
      ],
      "screen": ["...", "... 24 lines ..."]
    },
    {
      "key": ">",
      "action": "descend",
      "turn": 12,
      "depth": 2,

      // When the level changes, include the new terrain grid
      "typGrid": [
        [0, 0, 0, "... depth 2 terrain ..."],
        "... 21 rows ..."
      ],

      "rng": ["..."],
      "screen": ["..."]
    }
  ]
}
```

## Field Reference

### Top Level

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `version` | number | yes | Schema version (currently 1) |
| `seed` | number | yes | PRNG seed for ISAAC64 |
| `wizard` | boolean | yes | Whether wizard mode (`-D`) is enabled |
| `character` | object | yes | Character creation options |
| `symset` | string | yes | Terminal symbol set (`"DECgraphics"`) |
| `startup` | object | yes | Game state after initialization |
| `steps` | array | yes | Ordered player actions with ground truth |

### `character`

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Player name |
| `role` | string | Role (e.g., `"Valkyrie"`, `"Wizard"`) |
| `race` | string | Race (e.g., `"human"`, `"elf"`) |
| `gender` | string | `"male"` or `"female"` |
| `align` | string | `"lawful"`, `"neutral"`, or `"chaotic"` |

### `startup`

| Field | Type | Description |
|-------|------|-------------|
| `rngCalls` | number | Total PRNG consumptions during startup |
| `typGrid` | number[][] | 21x80 terrain type grid for starting level |
| `screen` | string[] | 24-line terminal screen after startup |

### `steps[i]`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `key` | string | yes | Key sent to C NetHack (e.g., `"h"`, `"."`, `">"`) |
| `action` | string | yes | Human-readable description |
| `turn` | number | yes | Game turn after this step |
| `depth` | number | yes | Dungeon level after this step |
| `rng` | string[] | yes | RNG calls consumed (may be empty) |
| `screen` | string[] | yes | 24-line screen after this step |
| `typGrid` | number[][] | no | Terrain grid (on level changes or terrain modifications) |

## RNG Trace Format

Each RNG entry is a compact string:

```
fn(arg)=result @ source:line
```

Examples:
```
rn2(12)=2 @ mon.c:1145
rnd(8)=5 @ makemon.c:320
rn1(31,15)=22 @ allmain.c:414
```

The `@ source:line` suffix is optional but useful for debugging divergences.
It references the C source file where the call originates.

Only primitive RNG functions are logged: `rn2`, `rnd`, `rn1`. Wrapper
functions like `rne` and `rnz` are not logged separately — their internal
`rn2` calls appear individually.

The global RNG call index is not stored per-entry. It can be reconstructed:
`startup.rngCalls + sum of rng.length for all preceding steps + position`.

## Screen Format

Screens are 24 lines of text as captured from the C terminal via tmux:

- **Row 0**: Message line (may be empty)
- **Rows 1-21**: Map area (21 rows, up to 80 columns)
- **Row 22**: Status line 1 (name, attributes)
- **Row 23**: Status line 2 (level, HP, etc.)

Map rows use DEC graphics encoding when `symset` is `"DECgraphics"`:

| DEC char | Unicode | Meaning |
|----------|---------|---------|
| `l` | `\u250c` | Top-left corner |
| `q` | `\u2500` | Horizontal wall |
| `k` | `\u2510` | Top-right corner |
| `x` | `\u2502` | Vertical wall |
| `m` | `\u2514` | Bottom-left corner |
| `j` | `\u2518` | Bottom-right corner |
| `n` | `\u253c` | Cross wall |
| `t` | `\u251c` | Right T |
| `u` | `\u2524` | Left T |
| `v` | `\u2534` | Bottom T |
| `w` | `\u252c` | Top T |
| `~` | `\u00b7` | Room floor |

Test code converts DEC to Unicode before comparison. The DEC encoding is
preserved in the session file because it's the raw C output — no lossy
transformation.

**Note:** The tmux capture shifts map columns by 1 (column 0 is not
captured). Test code prepends a space to map rows to correct this. This
quirk is documented here so future capture methods can avoid it.

## Terrain Type Grid

The `typGrid` is a 21x80 array of integers matching C's `levl[x][y].typ`
values. Key type codes (from `include/rm.h` / `js/config.js`):

| Code | Constant | Display |
|------|----------|---------|
| 0 | STONE | (empty rock) |
| 1 | VWALL | `\|` |
| 2 | HWALL | `-` |
| 3-12 | corners/T-walls | various |
| 14 | SDOOR | secret door |
| 15 | SCORR | secret corridor |
| 23 | DOOR | `+` or `.` |
| 24 | CORR | `#` |
| 25 | ROOM | `.` |
| 26 | STAIRS | `<` or `>` |

The grid is row-major: `typGrid[y][x]` for row `y`, column `x`.

## Multi-Level Sessions

A session can span multiple dungeon levels. When a step causes a level
change (descending stairs, level teleport), that step includes a `typGrid`
field with the new level's terrain. The `depth` field on each step tracks
the current dungeon level.

```jsonc
{
  "steps": [
    // ... moves on depth 1 ...
    {
      "key": ">",
      "action": "descend",
      "turn": 15,
      "depth": 2,
      "typGrid": [[0, 0, "..."], "..."],  // depth 2 terrain
      "rng": ["..."],
      "screen": ["..."]
    },
    // ... moves on depth 2 ...
    {
      "key": ">",
      "action": "descend",
      "turn": 30,
      "depth": 3,
      "typGrid": [[0, 0, "..."], "..."],  // depth 3 terrain
      "rng": ["..."],
      "screen": ["..."]
    }
  ]
}
```

## Terrain Changes Within a Level

Digging, kicking doors open, creating pits, and other actions can modify
`levl[x][y].typ` without changing levels. When the capture harness detects
that the terrain grid has changed since the last capture, it includes a
`typGrid` on that step.

The harness runs `#dumpmap` after every step and compares to the previous
grid. If any cell differs, the new grid is included. This catches:
- Digging through walls/floors
- Kicking doors open (DOOR flags change)
- Drawbridge destruction
- Pit creation
- Any other terrain modification

This means `typGrid` can appear on any step, not just level-change steps.
Steps without terrain changes omit the field to keep the file compact.

## Generating Session Files

### From existing trace data

```bash
node test/comparison/gen_session.js
```

Converts the scattered trace files in `traces/seed42_reference/` into
`sessions/seed42.session.json`.

### From the C binary (future)

The `run_trace.py` harness can be extended to output session JSON directly,
enabling easy capture of new seeds and longer play sequences.

## Using Session Files in Tests

Tests load a session file and replay it in JS:

```javascript
import { readFileSync } from 'fs';

const session = JSON.parse(readFileSync('sessions/seed42.session.json'));

// Verify startup
const game = setupGame(session.seed, session.character);
assert.equal(getRngCount(), session.startup.rngCalls);
compareTypGrid(game.map, session.startup.typGrid);
compareScreen(renderScreen(game), session.startup.screen);

// Replay each step
for (const step of session.steps) {
    applyAction(game, step.key);
    compareRng(getRngLog(), step.rng);
    compareScreen(renderScreen(game), step.screen);
    if (step.typGrid) {
        compareTypGrid(game.map, step.typGrid);
    }
}
```

## Design Rationale

**Why one file per session, not per seed+depth?**
A session captures a continuous play sequence. Multi-level play is a single
RNG stream — splitting it would lose the continuity that makes the test
meaningful.

**Why keep DEC graphics instead of converting to Unicode?**
The session file stores raw C output. Keeping DEC encoding means no lossy
transformation during capture. The conversion to Unicode is a well-defined,
reversible mapping applied at test time.

**Why compact strings for RNG instead of structured objects?**
`"rn2(12)=2 @ mon.c:1145"` is more readable than
`{"fn":"rn2","arg":12,"result":2,"src":"mon.c:1145"}` and produces smaller
files. The string format is trivially parseable with a regex, and the
source location is optional — tests that only check call signatures can
ignore the `@ ...` suffix.

**Why include both screen and typGrid?**
They test different things. The screen tests rendering, FOV, object display,
and status lines. The typGrid tests terrain generation. A screen match
doesn't guarantee correct terrain (FOV hides most of the map), and a
typGrid match doesn't guarantee correct rendering.

---

*"You finish reading the scroll. It crumbles to dust."*
