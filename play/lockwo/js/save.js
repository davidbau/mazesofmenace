// save.js — save game to persistent storage + the "Be seeing you..." exit.
// C ref: src/save.c — dosave() / dosave0() / savegamestate() / savelev().
//
// The C code serializes the whole game (current level + non-level game state +
// every other level file) into a binary save file via the structlevel/sfo
// writers.  This JS port targets the same OBSERVABLE behaviour (SCREENS): the
// contest sandbox shares one Web-Storage-shaped handle across a session's
// segments (jsmain.runSegment `storage`), so a save written here in segment N
// is read back by restore.c's dorecover() in segment N+1.  Instead of C's
// binary layout we serialize the live JS `game` object graph with a
// reference-preserving codec (so shared object identity — a worn weapon that is
// also in invent, a permonst template shared by many monsters — survives the
// round trip), which reproduces the identical screens on restore.  RNG state is
// NOT saved (C doesn't save it either; the restoring process reseeds), and the
// display / vision / status caches are rebuilt by docrt()/vision_recalc() on
// the far side, exactly as C recomputes them (restore.c: "recompute vision
// (not saved)").

import { game } from './gstate.js';
import { GameMap } from './game.js';
import { monster_by_pmidx } from './makemon.js';
import { NO_COLOR } from './terminal.js';
import { y_n, pline } from './display.js';
import { nhgetch } from './input.js';

// Keys on the game object that must NOT travel in the save file.  These are
// either the runtime environment that the restoring segment sets up fresh (the
// display handle, the input-capture hook, the wall-clock datetime that drives
// the moon phase, the storage handle itself) or derived display/vision caches
// that restore.c explicitly recomputes rather than saving (vision maps, the
// status-line render cache, the serialized screen buffer, the top-line message
// state).  docrt()/bot()/vision_recalc() rebuild all of these after restore.
export const SAVE_SKIP_KEYS = new Set([
    // runtime environment (kept fresh by the restoring segment)
    'nhDisplay', '_preNhgetchHook', '_pendingDisplay', 'storage', 'datetime',
    // vision — "recompute vision (not saved)" (restore.c)
    'viz_array', '_viz_rmin', '_viz_rmax',
    'vis_start_col', 'vis_start_row', 'vis_step',
    // display / status / top-line caches — rebuilt by docrt()/bot()
    '_screen_output', '_toplines', '_toplin', '_pending_message',
    'active_buf', '_wc', 'cs_func', 'cs_arg', 'cs_left', 'cs_right', 'cs_rows',
]);

// Reference-preserving serializer.  Produces { root, nodes } where `nodes` is a
// flat list of every non-primitive reached from `root`; each object/array is
// emitted exactly once and everywhere else referenced by its index ({$r:id}),
// so cycles and shared identity are preserved.  permonst templates (mon.data)
// are emitted as {$m:pmidx} and rebound to the canonical MONS[] entry on the
// decode side; typed arrays as {$ta:ctor,d:[...]}; Sets as {$s:[...]}; the
// dungeon-level map (GameMap) is tagged {$c:1} so its prototype is restored.
export function serializeGameState(root) {
    const nodes = [];
    const seen = new Map();

    const isPermonst = (v) =>
        v && typeof v === 'object' && typeof v.pmidx === 'number'
        && monster_by_pmidx(v.pmidx) === v;

    function enc(val) {
        if (val === null) return null;
        const t = typeof val;
        if (t === 'number' || t === 'string' || t === 'boolean') return val;
        if (t !== 'object') return undefined; // functions / symbols / undefined
        if (isPermonst(val)) return { $m: val.pmidx };
        if (seen.has(val)) return { $r: seen.get(val) };
        const id = nodes.length;
        seen.set(val, id);
        nodes.push(null); // reserve slot before recursing (handles cycles)
        let node;
        if (ArrayBuffer.isView(val)) {
            node = { $ta: val.constructor.name, d: Array.from(val) };
        } else if (val instanceof Set) {
            node = { $s: [...val].map((e) => { const x = enc(e); return x === undefined ? null : x; }) };
        } else if (Array.isArray(val)) {
            node = { $a: val.map((e) => { const x = enc(e); return x === undefined ? null : x; }) };
        } else {
            const o = {};
            for (const k of Object.keys(val)) {
                if (SAVE_SKIP_KEYS.has(k)) continue;
                const e = enc(val[k]);
                if (e !== undefined) o[k] = e;
            }
            node = (val instanceof GameMap) ? { $c: 1, $o: o } : { $o: o };
        }
        nodes[id] = node;
        return { $r: id };
    }

    const r = enc(root);
    return JSON.stringify({ root: r, nodes });
}

// The storage key under which this character's save lives.  C keys the save
// file on the player name (SAVEF); we do the same so restore in a later segment
// finds it.
export function saveFileKey() {
    const nm = game.plname || '';
    return nm ? `nethack.save.${nm}` : '';
}

// C ref: save.c dosave0() — returns 1 on a successful save.  Writes the
// serialized game state to the shared storage handle under the player's key.
export function dosave0() {
    const key = saveFileKey();
    const storage = game.storage;
    if (!key || !storage || typeof storage.setItem !== 'function') return 0;
    try {
        storage.setItem(key, serializeGameState(game));
    } catch {
        return 0;
    }
    return 1;
}

// C ref: save.c dosave0() — before writing, undo the date-dependent luck
// adjustments made at game start (moveloop_preamble); the restoring segment
// re-applies them for its own date.  Screens don't depend on Luck here, but we
// mirror the bookkeeping faithfully.
function undo_startup_luck() {
    const u = game.u;
    if (!u) return;
    // FULL_MOON gave +1 at start; friday13 gave -1.  Undo both.
    if (game.flags?.moonphase === 4 /* FULL_MOON */) u.uluck = (u.uluck || 0) - 1;
    if (game.flags?.friday13) u.uluck = (u.uluck || 0) + 1;
}

// C ref: save.c dosave() — the 'S' command.  Clear the message window, confirm
// "Really save?"; on 'y' write the save and terminate with "Be seeing you...".
export async function dosave() {
    // clear_nhwindow(WIN_MESSAGE)
    game._pending_message = '';
    const ans = await y_n('Really save?', 'yn\x1b', 'n');
    game._pending_message = '';
    if (ans === 'n') {
        game.context = game.context || {};
        game.context.move = 0;
        return;
    }
    // 'y': pline("Saving...") is printed then immediately obliterated by the
    // exit screen (never captured as its own boundary — see save.c: the
    // "Saving..." message is only flushed by display_nhwindow just before
    // exit_nhwindows clears the screen).
    await pline('Saving...');
    undo_startup_luck();
    const ok = dosave0();
    game.context = game.context || {};
    game.context.move = 0;
    if (ok) {
        await exit_be_seeing_you();
    }
}

// C ref: win/tty/wintty.c tty_exit_nhwindows() -> tty_suspend_nhwindows() ->
// settty("Be seeing you...") -> term_end_screen() clears the screen (cursor
// home), then raw_print(str) writes the text at row 0 and a newline leaves the
// cursor at column 0 of row 1.  nh_terminate() then ends the program; we model
// termination by firing the capture (via nhgetch's pre-hook) on the cleared
// "Be seeing you..." screen and letting the empty input queue end the segment.
async function exit_be_seeing_you() {
    const disp = game.nhDisplay;
    if (disp?.clearScreen) {
        disp.clearScreen();
        disp.putstr(0, 0, 'Be seeing you...', NO_COLOR, 0);
        disp.setCursor(0, 1);
    }
    // Capture this final frame, then terminate: nhgetch fires the capture hook
    // (recording "Be seeing you...") and, with no keys left, ends the segment.
    await nhgetch();
}
