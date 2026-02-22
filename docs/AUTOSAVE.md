# Autosave Design

> *"You feel oddly secure, as if your progress is being watched over."*

**See also:**
[DESIGN.md](DESIGN.md) (architecture) |
[DECISIONS.md](DECISIONS.md) (trade-offs) |
[DEVELOPMENT.md](DEVELOPMENT.md) (dev workflow)

## Goal

Protect the player from losing progress due to browser crashes, accidental tab
closes, or power failures — without changing NetHack's gameplay semantics.

The autosave is a **crash recovery mechanism only**, not a save-scumming
opportunity. It must preserve the roguelike guarantee: death is permanent.

---

## Mechanism: Async Overwrite on Every Turn

After each turn completes and before waiting for the next keystroke, the game
kicks off a save in the background. The save is **fire-and-forget** — the game
loop does not await it. The player never waits for the save.

To avoid unbounded queuing, at most **one save may be in-flight and one
waiting**. If a save is already queued, the new snapshot replaces it (the
intermediate turn is disposable).

```
turn N completes
  └─ kick off save(snapshot_N)   [async, no await]
       if save already queued: replace queued snapshot with snapshot_N
       if save in-flight + queue empty: enqueue snapshot_N
       if idle: start immediately

player presses key for turn N+1
  └─ game loop runs immediately, save still running in background
```

Maximum queue depth: **1 in-flight + 1 waiting**. In the worst case (a crash)
the player loses one turn.

---

## Roguelike Integrity

**The only rule: delete the autosave synchronously on death.**

Death processing runs before any async work. The save must be invalidated
(deleted or flagged) before the game-over screen appears, so that closing the
tab at the moment of death cannot rescue a dead character.

```js
// In game-over handling (synchronous):
deleteSave();           // ← must happen before any await
await showDeathScreen();
```

The "restore loop" problem (restore → play → die → restore again) is prevented
automatically by the overwrite-on-every-turn design. Each save overwrites the
previous one, so restoring puts the player exactly where they were — there is
no earlier save to fall back to.

---

## Serialization Format

Raw `JSON.stringify` of a late-game save (50–60 dungeon levels) is ~20 MB —
too large for `localStorage` (typical 5–10 MB browser limit) and slow to
encode (~26 ms).

The game data is highly repetitive (map grids of uniform cells), so it
compresses extremely well. Benchmarks on representative game states:

| Levels cached | JSON only | + gzip (level 1) | Ratio |
|:---:|---:|---:|---:|
| 1  |  362 KB | 14 KB | 4% |
| 15 | 5167 KB | 120 KB | 2% |
| 60 | 20694 KB | 445 KB | 2% |

| Levels cached | JSON only | + gzip (level 1) |
|:---:|---:|---:|
| 1  | 0.9 ms | 0.2 ms |
| 15 | 6.9 ms | 2.3 ms |
| 60 | 26 ms  | 9.6 ms |

Gzip level 1 ("fastest") is both **faster** and **97–98% smaller** than plain
JSON at scale. A 60-level late-game save becomes 445 KB, well within any
storage limit.

### Compression API

Use [`fflate`](https://github.com/101arrowz/fflate) for gzip level 1 in the
browser. It is small (~15 KB minified), zero-dependency, and supports
configurable compression levels. The browser-native `CompressionStream` API is
an alternative but does not expose a compression level parameter, so it runs
at the slower default level (~36 ms at 60 levels vs ~10 ms for level 1).

```js
import { gzip } from 'fflate';

async function serializeSave(game) {
    const json = JSON.stringify(buildSaveData(game));
    const bytes = new TextEncoder().encode(json);
    return new Promise((resolve, reject) => {
        gzip(bytes, { level: 1 }, (err, compressed) => {
            if (err) reject(err); else resolve(compressed);
        });
    });
}
```

---

## Storage Backend

Compressed saves are binary (`Uint8Array`). Two options:

**IndexedDB** (preferred): stores binary directly, no encoding overhead,
no size limit concerns. Slightly more complex API.

**localStorage**: requires base64 encoding (+33% size overhead), but
simpler to use and consistent with the existing save infrastructure in
`js/storage.js`. At 445 KB × 1.33 = ~590 KB for a 60-level game, it
remains well within limits.

The existing `SAVE_KEY`, `deleteSave()`, and `loadSave()` infrastructure in
`js/storage.js` can be extended to support compressed binary; the version
field (`SAVE_VERSION`) should be bumped when the format changes.

---

## Implementation Sketch

```js
// In js/storage.js or a new js/autosave.js:

let _inFlight = false;
let _pending = null;

export function scheduleAutosave(game) {
    const snapshot = buildSaveData(game);   // sync: ~0.1–3 ms
    if (_inFlight) {
        _pending = snapshot;                // replace any waiting snapshot
        return;
    }
    _startSave(snapshot);
}

async function _startSave(snapshot) {
    _inFlight = true;
    try {
        const compressed = await serializeSave(snapshot);  // gzip in background
        storeSave(compressed);             // localStorage or IndexedDB write
    } finally {
        _inFlight = false;
        if (_pending) {
            const next = _pending;
            _pending = null;
            _startSave(next);
        }
    }
}

// In the game loop, after each turn:
scheduleAutosave(game);   // no await — returns immediately
```

```js
// In game-over handling — must be synchronous, before any await:
export function handleDeath(game) {
    deleteSave();           // ← synchronous, kills autosave integrity window
    _pending = null;        // drop any queued snapshot
    // _inFlight save will complete but be superseded by the deletion
    // (or: cancel by setting a flag checked inside _startSave)
    // ...
}
```

---

## Summary

| Property | Value |
|---|---|
| Saves per session | One per turn, async |
| Player-perceived latency | Zero (fire-and-forget) |
| Max turns lost on crash | 1 |
| Late-game save size | ~445 KB (60 levels, gzip level 1) |
| Late-game save time | ~10 ms (off main thread) |
| Save-scumming prevented by | Overwrite on every turn |
| Death integrity enforced by | `deleteSave()` called synchronously on death |
