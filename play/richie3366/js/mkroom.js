// mkroom.js — C ref: nethack-c/upstream/src/mkroom.c save/restore closure
// (`save_room` `:843–857`, `save_rooms` `:862–871`, `rest_room` `:874–886`,
// `rest_rooms` `:892–906`). The NHFILE binary codec (Sfo_/Sfi_mkroom,
// Sfo_/Sfi_int) ⇔ plain JSON records: `save_rooms()` returns
// `{ nroom, rooms }`, `rest_rooms()` consumes it (engrave.js
// save/rest_engravings precedent — the binary format stays a named
// omission). C globals ⇔ `game.level`: `svn.nroom` ⇔ `level.nroom`,
// `svr.rooms` ⇔ `level.rooms`, `gs.subrooms[k]` ⇔
// `level.rooms[MAXNROFROOMS + 1 + k]`, `gn.nsubroom` ⇔ `level.nsubroom`.

import { game } from './gstate.js';
import { MAXNROFROOMS } from './const.js';

/** First subroom slot (`&svr.rooms[MAXNROFROOMS+1]` ⇔ `gs.subrooms`). */
const SUBROOM_BASE = MAXNROFROOMS + 1;

/**
 * Scalar `struct mkroom` fields (mkroom.h:12–22) carried in a record.
 * `sbrooms`/`resident` pointers are NOT serialized: C writes them as
 * garbage (`:848–851` "who cares?"), restore re-links subrooms
 * positionally (`:882`) and nulls residents (`:884`, `:902` — re-linked
 * from fmon restore, restore.c:1181–1184 ⇔ getlev_place_monsters).
 * `nsubrooms` IS carried (whole-struct codec) and is the restore loop
 * bound, exactly like C (`:880`).
 */
const MKROOM_SCALAR_FIELDS = [
    'lx', 'hx', 'ly', 'hy',
    'rtype', 'orig_rtype', 'rlit', 'needfill', 'needjoining',
    'doorct', 'fdoor', 'nsubrooms', 'irregular', 'roomnoidx',
];

/**
 * C ref: mkroom.c save_room `:843–857` (staticfn → file-local) — whole-
 * struct write (`Sfo_mkroom` `:853` ⇔ scalar copy below) then recurse
 * over `sbrooms` (`:854–856`). Children are read from `subrooms`
 * (save_rooms records, idempotent re-save) or `sbrooms` (live rooms);
 * either way the record nests them under `subrooms`, mirroring the C
 * file order (parent record, then each subroom inline).
 * Absent keys stay absent (never defaulted): live rooms omit
 * `orig_rtype` until stamped (mklev.js), and readers fall back with
 * `orig_rtype ?? rtype` (dungeon.js) — writing an explicit 0 would
 * break that fallback.
 * @param {object} r live room or an older record
 * @returns {object} plain record (no pointers, no monster refs)
 */
function save_room(r) {
    const src = (r && typeof r === 'object') ? r : {};
    const rec = {};
    // C `:853`: the whole struct goes to the file.
    for (const k of MKROOM_SCALAR_FIELDS) {
        if (src[k] !== undefined) rec[k] = src[k];
    }
    // C `:854–856`: one inline record per subroom, in order.
    const kids = Array.isArray(src.subrooms)
        ? src.subrooms
        : (Array.isArray(src.sbrooms) ? src.sbrooms : []);
    const n = (src.nsubrooms !== undefined && src.nsubrooms !== null)
        ? (src.nsubrooms | 0)
        : kids.length;
    rec.subrooms = [];
    for (let i = 0; i < n; i++) {
        const kid = kids[i];
        rec.subrooms.push(
            (kid && typeof kid === 'object') ? save_room(kid) : null,
        );
    }
    return rec;
}

/**
 * C ref: mkroom.c save_rooms `:862–871` — write the room count
 * (`Sfo_int` `:867`), then one `save_room` per room (`:868–869`).
 * @param {object} level rooms source (`game.level` for the live entry)
 * @returns {{ nroom: number, rooms: object[] }} save envelope
 */
export function save_rooms_from(level) {
    const lvl = (level && typeof level === 'object') ? level : {};
    // C `:867`: `svn.nroom` first.
    const nroom = lvl.nroom | 0;
    const rooms = [];
    // C `:868–869`: `svr.rooms[0..nroom-1]` in order.
    for (let i = 0; i < nroom; i++) {
        rooms.push(save_room(lvl.rooms ? lvl.rooms[i] : undefined));
    }
    return { nroom, rooms };
}

/**
 * C ref: mkroom.c save_rooms — the live entry (C reads the `svn`/`svr`
 * globals; JS reads `game.level`). Wired at the savelev analogue
 * (lev_json.js `serLevel` live branch ⇔ save.c:534).
 * @returns {{ nroom: number, rooms: object[] }} save envelope
 */
export function save_rooms() {
    return save_rooms_from(game.level);
}

/**
 * C ref: mkroom.c rest_room `:874–886` (staticfn → file-local) — whole-
 * struct read (`Sfi_mkroom` `:879` ⇔ scalar copy below), then per
 * subroom: link `sbrooms[i]` at the next `gs.subrooms` slot (`:882`),
 * recurse into that slot (`:883`), null its resident and bump
 * `nsubroom` (`:884`). Installs into FRESH objects (C reuses fixed-
 * array slots and overwrites every serialized field; GC frees the old
 * objects — no in-place stale keys). Never mutates the record.
 * @param {object} r fresh room object to fill
 * @param {object} rec record from `save_room` (or a legacy raw clone:
 *   children under `sbrooms`, `resident` ignored — always nulled)
 */
function rest_room(r, rec) {
    const level = game.level;
    const src = (rec && typeof rec === 'object') ? rec : {};
    // C `:879`: the whole struct comes back from the file.
    for (const k of MKROOM_SCALAR_FIELDS) {
        if (src[k] !== undefined) r[k] = src[k];
    }
    const kids = Array.isArray(src.subrooms)
        ? src.subrooms
        : (Array.isArray(src.sbrooms) ? src.sbrooms : []);
    r.sbrooms = [];
    // C `:880–885`: the file's `nsubrooms` is the loop bound.
    const n = r.nsubrooms | 0;
    for (let i = 0; i < n; i++) {
        // C `:882`: link the slot BEFORE reading into it.
        const slot = SUBROOM_BASE + (level.nsubroom | 0);
        const child = {};
        r.sbrooms[i] = child;
        level.rooms[slot] = child;
        // C `:883–884`: recurse, null resident, bump.
        rest_room(child, kids[i]);
        child.resident = null;
        level.nsubroom = (level.nsubroom | 0) + 1;
    }
    // C writes the pointer fields as garbage and restore fixes them
    // here: `sbrooms` re-linked above, `resident` stays null until the
    // fmon loop re-links it (restore.c:1181–1184).
    if (r.resident !== undefined) r.resident = null;
}

/**
 * C ref: mkroom.c rest_rooms `:892–906` — read the room count
 * (`Sfi_int` `:897`), reset `nsubroom` (`:899`), restore each room and
 * null its resident (`:900–903`), then re-stamp both ending flags
 * (`:904–905`). The flags are fresh `{ hx: -1 }` slots: C sets only
 * `.hx` on fixed-array slots, but JS has no fixed array — iteration
 * stops at the flag either way, so no stale tail is kept. Never
 * mutates the stored envelope (stashes are re-installed on every
 * revisit and re-serialized on save).
 * Wired at every getlev analogue of restore.c:1132 (lev_json-shaped
 * installs): save.js dorecover, do.js goto_level, bones.js
 * getlev_bones — each calls this right after `game.level` is assigned.
 * @param {{ nroom?: number, rooms?: object[] }} stored `save_rooms`
 *   envelope (or a legacy stash: only `rooms[0..nroom-1]` are read)
 */
export function rest_rooms(stored) {
    const level = game.level;
    const src = (stored && typeof stored === 'object') ? stored : {};
    // C `:897`: `svn.nroom` first.
    const nroom = src.nroom | 0;
    level.nroom = nroom;
    // C `:899`: subroom slots reassigned from the base.
    level.nsubroom = 0;
    const recs = Array.isArray(src.rooms) ? src.rooms : [];
    // Fresh flat array (C reuses the fixed `svr.rooms`; GC frees the old
    // one). Assigned before the loop so `rest_room` subroom slots land here.
    const rooms = [];
    level.rooms = rooms;
    // C `:900–903`: restore each room, null its resident.
    for (let i = 0; i < nroom; i++) {
        const r = {};
        rest_room(r, recs[i]);
        r.resident = null;
        rooms[i] = r;
    }
    // C `:904–905`: restore ending flags.
    rooms[nroom] = { hx: -1 };
    rooms[SUBROOM_BASE + (level.nsubroom | 0)] = { hx: -1 };
}
