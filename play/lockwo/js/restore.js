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
import { docrt, bot, cls, flush_screen, pline, topl_more, y_n, see_monsters } from './display.js';
import { init_vision_globals, vision_reset, vision_recalc } from './vision.js';
import { phase_of_the_moon, friday_13th, FULL_MOON, NEW_MOON } from './calendar.js';
import { Hello } from './role.js';
import { saveFileKey } from './save.js';
import { l_nhcore_init } from './mklev.js';
import { rn2 } from './rng.js';
import { quest_nemgend_or_null } from './questpgr.js';
import { check_special_room } from './shkroom.js';
import { read_engr_at, encumber_msg } from './invent.js';
import { run_object_timers } from './mkobj.js';

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

// C ref: role.c role_init(), which restore.c restgamestate() calls to "Reset the
// initial role, race, gender, and alignment".  Only two of its steps can reach
// the PRNG, and on a restore exactly one of them can fire:
//   * "Fix up the quest nemesis" — quest_status.nemgend is read off the species'
//     M2_NEUTER/M2_FEMALE/M2_MALE flag and only ROLLED (rn2(100)) for a nemesis
//     that carries none of the three.  Recorded restores bear this out: the
//     Wizard's (whose nemesis is the Dark One) draws rn2(100) here, the
//     Valkyrie/Monk/Knight/Priest ones draw nothing.
//   * the god-names fixup, whose randrole() loop is gated on
//     `flags.pantheon == -1` /* new game */ — a restored flags comes out of the
//     save file with the pantheon already chosen, which is why the recorded
//     Priest restore draws no randrole() even though a fresh Priest game does.
// Only the roll is mirrored here: assigning the table's fixed gender would make
// a restored game disagree with the newgame path (fastforward.js's role_init
// leaves quest_nemgend unset for the non-rolling roles), and the save blob
// already carries whatever the saving segment computed.
function role_init_nemgend() {
    if (quest_nemgend_or_null() == null)
        game.quest_nemgend = (rn2(100) < 50) ? 1 : 0;
}

// C: `wizard` is flags.debug and `discover` is flags.explore; our options parser
// records the play mode as flags.playmode (bones.js does the same widening).
function is_wizard() { return !!game.flags?.debug; }
function is_discover() {
    const f = game.flags || {};
    return !!(f.explore || f.discover || f.playmode === 'explore');
}

// C ref: restore.c dorecover() — `if (!wizard && !discover) delete_savefile();`
// A normal restore CONSUMES its save file, so a later segment that starts under
// the same character name begins a new game instead of restoring the same state
// twice.  In wizard/discover mode unixmain.c asks instead (below).
function delete_savefile() {
    const key = saveFileKey();
    const storage = game.storage;
    if (key && storage && typeof storage.removeItem === 'function') storage.removeItem(key);
}

// C ref: sys/unix/unixmain.c main() — after a successful dorecover(), wizard and
// discover mode get asked whether to keep the save file (wd_message() prints
// nothing for a plain wizard-mode restore: its three arms all need an error flag
// or `discover`).  The question is a topline write, so it forces the welcome
// line's --More-- first; answering 'n' (which every quitchar does, the prompt's
// default) deletes the file, 'y' keeps it.
async function ask_about_keeping_savefile() {
    if (!is_wizard() && !is_discover()) return;
    await topl_more();
    const ans = await y_n('Do you want to keep the save file?', 'yn', 'n');
    if (ans === 'n') delete_savefile();
}

// C ref: allmain.c moveloop_preamble(resuming=TRUE) tail — the steps the
// `if (resuming)` / unconditional arms run after the moon-phase report.
// fix_shop_damage() has no port yet (it only matters for a hero who damaged shop
// walls before saving), so it is the one omission here.
async function resume_preamble_tail() {
    const u = game.u || (game.u = {});
    game.disp = game.disp || {};
    game.disp.botlx = true;
    await read_engr_at(u.ux, u.uy); /* subset of pickup() */
    await encumber_msg();
    // gd.defer_see_monsters is set by restgamestate so the restore itself does
    // not paint monsters too early; moveloop_preamble releases it.
    see_monsters();
    u.uz0 = u.uz0 || {};
    u.uz0.dlevel = u.uz?.dlevel;
    game.context = game.context || {};
    game.context.move = 0;
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
    const keepMock = game.mockStorage;
    const keepCoreCtx = game.coreCtx;
    Object.assign(game, saved);
    game.nhDisplay = keepDisplay;
    game._preNhgetchHook = keepHook;
    game.datetime = keepDatetime;
    game.storage = keepStorage;
    game.mockStorage = keepMock;
    game.coreCtx = keepCoreCtx;

    // C ref: restore.c restgamestate() — role_init() runs partway through the
    // state reload, BEFORE restore_luadata()'s Lua-state creation below, so its
    // nemesis-gender roll comes first in the stream.
    role_init_nemgend();

    // C ref: restore.c restgamestate() tail -> nhlua.c restore_luadata(), whose
    // `if (!gl.luacore) l_nhcore_init();` fires because a freshly launched
    // process has no Lua state yet.  nhl_init() loads dat/nhlib.lua, whose
    // top-level `shuffle(align)` over a 3-element list is the ONLY PRNG
    // consumption on the whole restore path — rn2(3) then rn2(2), which is
    // exactly what the recorded restore segments draw before their first input
    // boundary.  It must run AFTER the state splice above, since the blob
    // carries the SAVING segment's splev_align and this re-rolls it.
    l_nhcore_init();

    // C ref: restore.c dorecover() — `if (!wizard && !discover) delete_savefile()`.
    if (!is_wizard() && !is_discover()) delete_savefile();

    // C ref: restore.c — "recompute vision (not saved)"; then docrt() repaints.
    init_vision_globals();
    vision_reset();
    game.vision_full_recalc = 0;
    vision_recalc(0);

    // C ref: restore.c dorecover() — run_timers(), "expire all timers that have
    // gone off while away", between vision_reset() and docrt().  The blob
    // restores svm.moves unchanged, so nothing is normally due; it still matters
    // for a floor corpse whose rot timer came due on a turn the port's own
    // nh_timeout did not reap.
    run_object_timers();

    // clear_nhwindow(WIN_MESSAGE) + docrt() (dorecover tail).
    game._pending_message = '';
    game._toplin = 0;
    game._toplines = '';
    await cls();
    await docrt();
    await flush_screen(1);
    await bot();

    // C ref: dorecover() tail -> welcome(FALSE), check_special_room(FALSE); then
    // unixmain's wizard/discover save-file question; then moveloop_preamble(TRUE).
    await pline(welcome_back_message());
    await check_special_room(false);
    await ask_about_keeping_savefile();
    await restore_preamble_messages();
    await resume_preamble_tail();

    return true;
}
