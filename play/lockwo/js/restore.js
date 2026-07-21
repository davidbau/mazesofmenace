// restore.js — restore a saved game from persistent storage.
// C ref: src/restore.c — dorecover() / restgamestate() / getlev();
//        sys/unix/unixmain.c — restore_saved_game() at startup.
//
// unixmain decides at launch: if the player already has a save file it calls
// dorecover() instead of newgame().  We mirror that in jsmain.start(): if the
// shared storage handle holds a save for this player name, restore it.
// dorecover() reads the whole game back, recomputes the (unsaved) vision, draws
// the map (docrt), greets with welcome(FALSE) ("... welcome back to NetHack!"),
// then moveloop_preamble(resuming=TRUE) re-evaluates the moon phase / Friday
// the 13th for the RESTORING process's date and reports it — which is why a
// Friday-the-13th save reloaded under a full moon prints "You are lucky!  Full
// moon tonight." here.
//
// The save blob is the reference-preserving serialization written by
// save.js:serializeGameState.  Decoding rebuilds the object graph (restoring
// shared identity, permonst templates, typed arrays, the GameMap prototype),
// then we splice the restored state into the live `game` object — keeping the
// restoring segment's own runtime environment (display handle, capture hook,
// wall-clock datetime) untouched.

import { game } from './gstate.js';
import { GameMap } from './game.js';
import { monster_by_pmidx } from './makemon.js';
import { docrt, bot, cls, flush_screen, pline, topl_more } from './display.js';
import { init_vision_globals, vision_reset, vision_recalc } from './vision.js';
import { phase_of_the_moon, friday_13th, FULL_MOON, NEW_MOON } from './calendar.js';
import { Hello } from './role.js';
import { saveFileKey } from './save.js';

// Reference-preserving deserializer — the inverse of save.js:serializeGameState.
// Two passes: build empty shells for every node so references can be wired even
// through cycles, then fill each shell.  Value slots are primitives, {$r:id}
// back-references, or {$m:pmidx} permonst rebindings.
export function deserializeGameState(str) {
    const { root, nodes } = JSON.parse(str);
    const built = new Array(nodes.length);

    // Pass 1: allocate shells.
    for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        if (n.$a) built[i] = [];
        else if (n.$s) built[i] = new Set();
        else if (n.$ta) built[i] = null; // typed array built in pass 2 (has data)
        else if (n.$c) built[i] = Object.create(GameMap.prototype);
        else built[i] = {};
    }

    const resolve = (e) => {
        if (e === null || typeof e !== 'object') return e;
        if ('$r' in e) return built[e.$r];
        if ('$m' in e) return monster_by_pmidx(e.$m);
        return e;
    };

    // Pass 2: fill shells.
    for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        if (n.$ta) {
            const Ctor = TYPED_ARRAY_CTORS[n.$ta] || Array;
            built[i] = Ctor.from ? Ctor.from(n.d) : n.d.slice();
        } else if (n.$a) {
            const arr = built[i];
            for (const e of n.$a) arr.push(resolve(e));
        } else if (n.$s) {
            const set = built[i];
            for (const e of n.$s) set.add(resolve(e));
        } else {
            const obj = built[i];
            const src = n.$o || {};
            for (const k of Object.keys(src)) obj[k] = resolve(src[k]);
        }
    }

    return resolve(root);
}

const TYPED_ARRAY_CTORS = {
    Int8Array, Uint8Array, Uint8ClampedArray, Int16Array, Uint16Array,
    Int32Array, Uint32Array, Float32Array, Float64Array,
};

// Does a save exist for the current player?  C ref: restore_saved_game().
export function have_saved_game() {
    const key = saveFileKey();
    const storage = game.storage;
    return !!(key && storage && typeof storage.getItem === 'function'
              && storage.getItem(key) != null);
}

// C ref: allmain.c welcome(FALSE) — "... the<race> <role>, welcome back to
// NetHack!".  Alignment/gender words are shown only when they differ from the
// original (they don't for a straightforward save/restore), so buf is just the
// race adjective and role name.
function welcome_back_message() {
    const urole = game.urole || {};
    const urace = game.urace || {};
    const female = !!game.flags?.female;
    const roleNm = (female && urole.name?.f) ? urole.name.f : urole.name?.m;
    const buf = ` ${urace.adj || 'human'} ${roleNm || 'Adventurer'}`;
    return `${Hello(urole.mnum)} ${game.plname || 'Hero'}, the${buf}, welcome back to NetHack!`;
}

// C ref: allmain.c moveloop_preamble(resuming=TRUE) — the moon-phase / Friday
// the 13th messages for the restoring process's date.  Each message forces the
// previous top-line message's --More-- (topl_more) first; the welcome line's
// --More-- naturally spans two captured frames because the xwaitforspace loop
// ignores the non-dismiss keys queued before the space that dismisses it.
async function restore_preamble_messages() {
    const u = game.u || (game.u = {});
    const moonphase = phase_of_the_moon();
    const msgs = [];
    if (moonphase === FULL_MOON) {
        msgs.push('You are lucky!  Full moon tonight.');
        u.uluck = (u.uluck || 0) + 1; // change_luck(1)
    } else if (moonphase === NEW_MOON) {
        msgs.push('Be careful!  New moon tonight.');
    }
    if (friday_13th()) {
        msgs.push('Watch out!  Bad things can happen on Friday the 13th.');
        u.uluck = (u.uluck || 0) - 1; // change_luck(-1)
    }
    for (const m of msgs) {
        await topl_more();
        await pline(m);
    }
}

// C ref: restore.c dorecover() + unixmain.c restore_saved_game(), followed by
// allmain.c moveloop_preamble(resuming=TRUE).  Returns true when a game was
// restored (so start() skips newgame()).
export async function dorestore() {
    const key = saveFileKey();
    const storage = game.storage;
    const blob = storage.getItem(key);
    if (blob == null) return false;

    const saved = deserializeGameState(blob);

    // Splice the restored state into the live game object, but preserve the
    // restoring segment's runtime environment (these were set up by
    // jsmain.start() and are intentionally NOT in the save blob).
    const keepDisplay = game.nhDisplay;
    const keepHook = game._preNhgetchHook;
    const keepDatetime = game.datetime;
    const keepStorage = game.storage;
    Object.assign(game, saved);
    game.nhDisplay = keepDisplay;
    game._preNhgetchHook = keepHook;
    game.datetime = keepDatetime;
    game.storage = keepStorage;

    // C ref: restore.c — "recompute vision (not saved)"; then docrt() repaints.
    init_vision_globals();
    vision_reset();
    game.vision_full_recalc = 0;
    vision_recalc(0);

    // clear_nhwindow(WIN_MESSAGE) + docrt() (dorecover tail).
    game._pending_message = '';
    game._toplin = 0;
    game._toplines = '';
    await cls();
    await docrt();
    await flush_screen(1);
    await bot();

    // C ref: dorecover() -> welcome(FALSE); then moveloop_preamble(TRUE).
    await pline(welcome_back_message());
    await restore_preamble_messages();

    return true;
}
