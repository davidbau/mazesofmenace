# Special Level Finalization Pipeline

## Overview

Special levels (Oracle, Mines, Castle, etc.) require a complete finalization pipeline to match C NetHack's RNG behavior. This document describes the required steps discovered through test regression debugging (2026-02-10).

## The Problem

After commit 065cdb0 added `makelevel(depth, dnum, dlevel)` support for special levels, tests calling `makelevel(1)` without branch coordinates fell through to procedural generation, causing themerooms RNG explosion (1.4M+ calls vs 2.9K expected).

## The Solution

### 1. Proper Level Selection

Tests must specify branch coordinates:

```javascript
// WRONG - generates procedural dungeon
const map = makelevel(1);

// CORRECT - generates Oracle special level
const { DUNGEONS_OF_DOOM } = await import('../../js/special_levels.js');
const map = makelevel(5, DUNGEONS_OF_DOOM, 5);
```

### 2. Complete Finalization Pipeline

Special levels in `finalize_level()` must execute all steps:

```javascript
export function finalize_level() {
    // 1. Execute deferred placements (objects/monsters/traps)
    executeDeferredObjects();
    executeDeferredMonsters();
    executeDeferredTraps();

    // 2. Fill ordinary rooms with random content
    // This was MISSING - caused -93 fill_ordinary_room calls
    for (let i = 0; i < map.nroom; i++) {
        const croom = map.rooms[i];
        if (croom.rtype === OROOM && croom.needfill === FILL_NORMAL) {
            fill_ordinary_room(map, croom, depth, bonusItems);
        }
    }

    // 3. Wallification
    wallification(levelState.map);

    // 4. Topology finalization (bound_digging + mineralize)
    // This was MISSING - caused -922 mineralize calls
    bound_digging(levelState.map);
    mineralize(levelState.map, depth);

    return levelState.map;
}
```

### 3. Room needfill Initialization

Rooms created via `des.room()` need `needfill=FILL_NORMAL`:

```javascript
// In create_room_splev() after calling dungeon.create_room:
const room = levelState.map.rooms[levelState.map.rooms.length - 1];
if (rtype === OROOM || rtype === THEMEROOM) {
    room.needfill = FILL_NORMAL;  // Required for fill_ordinary_room
}
```

## RNG Alignment Results

| Metric | Before | After | Delta |
|--------|--------|-------|-------|
| Total RNG calls | 2213 | 3416 | +1203 |
| Gap from C (2924) | -711 | +492 | Improved |
| mineralize | 0 | 1009 | +1009 (C: 922) |
| fill_ordinary_room | 0 | 75 | +75 (C: 93) |

## Remaining Issues

1. **Room Count:** Oracle creates 7 rooms, C expects 9 (missing 2 rooms/niches)
2. **Corridor Generation:** Excessive finddpos/dig_corridor calls (JS=672/636 vs C=36/186)
3. **C-Specific Functions:** Missing nhl_rn2, start_corpse_timeout, makeniche implementations

## Key Learnings

- Special levels bypass procedural generation but still need full finalization
- `fill_ordinary_room` runs AFTER corridors but BEFORE wallification
- `mineralize` runs AFTER wallification but BEFORE returning the map
- Room `needfill` must be explicitly set for special level rooms
- Constants: `FILL_NONE=0`, `FILL_NORMAL=1`

## Files Modified

- `js/dungeon.js`: Export mineralize, bound_digging, fill_ordinary_room
- `js/sp_lev.js`: Import and call finalization functions, set room needfill
- `js/special_levels.js`: Register Oracle at (DUNGEONS_OF_DOOM, 5)
- `test/unit/wizard.test.js`: Call makelevel with branch coordinates

## 2026-02-12 Regression Note

- `storage.test` regression root cause: one `des.room()` construction path emitted room objects without `sbrooms`/`nsubrooms`.
- Failure mode: nested room generation (`create_subroom`) crashed in `add_subroom_to_map` when attaching a subroom to that incomplete parent room.
- Fix:
  - Normalize parent room subroom fields in `js/dungeon.js` before attachment.
  - Ensure manual room objects in `js/sp_lev.js` include `nsubrooms` and `sbrooms`.
- Scope control:
  - Ordered deferred replay metadata (`deferredActions`) is now only populated when explicit parity finalization context is active, preventing this path from affecting non-parity generation flows.
