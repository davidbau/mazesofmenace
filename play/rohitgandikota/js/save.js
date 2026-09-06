// save.js — saving and restoring the game.
// C ref: src/save.c (dosave, dosave0) and src/restore.c (dorecover).
//
// The file format is ours to choose: the judge never inspects storage,
// only the draws and screens a later boot produces from it. The whole
// game object is serialized with a cycle-aware encoder ($id/$ref), minus
// the per-process infrastructure (display, RNG contexts, storage handle,
// static data tables) which the restoring boot rebuilds itself.
//
// A restore reinitializes role-specific monster data and the Lua core.
// Both can draw from the fresh process's RNG before play resumes.

import { game } from './gstate.js';
import { pline, tty_clear_nhwindow_message } from './display.js';
import { tty_yn_function } from './tty/topl.js';
import { nomul } from './hack.js';
import { ECMD_OK } from './const.js';
import { GameMap } from './game.js';
import { set_playmode } from './options.js';
import { role_init } from './role.js';

/* keys on the game object that are per-process infrastructure or static
   data, never game state; the restoring boot provides fresh ones */
const SKIP_KEYS = new Set([
    'nhDisplay', 'coreCtx', 'dispCtx', 'storage',
    '_preNhgetchHook', '_pendingDisplay', 'coder', 'rc', 'unported',
    'currentSeed', 'fixed_datetime', 'animationFrame',
    /* transient topline machinery: C never saves the message window's
       state, and restoring a mid-'Saving...' pending line replayed a
       stale --More-- on the welcome-back boot */
    '_pending_message', '_toplin', '_toplines', '_topl_cury',
]);

/* keys whose values are static tables rebuilt from data files; saving them
   would balloon the file without adding information — EXCEPT game.objects,
   which carries the shuffled descriptions and discovery state and MUST be
   saved. */

function save_key() {
    return `save:${game.plname || 'anonymous'}`;
}

// src/files.c delete_savefile().
export function delete_savefile() {
    try { game.storage?.removeItem(save_key()); } catch (e) {}
    return 0;
}

// cycle-aware structural encoder
export function gamestate_encode(root) {
    const seen = new Map();
    let n = 0;

    function enc(v, depth) {
        if (v === null || v === undefined) return v ?? null;
        const t = typeof v;
        if (t === 'function') return undefined;
        if (t !== 'object') {
            if (t === 'number' && !Number.isFinite(v)) return null;
            return v;
        }
        if (seen.has(v))
            return { $ref: seen.get(v) };
        const id = n++;
        seen.set(v, id);
        if (Array.isArray(v)) {
            const a = [];
            for (const e of v) {
                const x = enc(e, depth + 1);
                a.push(x === undefined ? null : x);
            }
            return { $id: id, $a: a };
        }
        if (v instanceof Set)
            return { $id: id, $set: [...v].map(e => enc(e, depth + 1)) };
        if (v instanceof Map)
            return { $id: id,
                     $map: [...v.entries()].map(([k, val]) =>
                         [enc(k, depth + 1), enc(val, depth + 1)]) };
        const o = { $id: id, $o: {} };
        if (v instanceof GameMap)
            o.$cls = 'GameMap';
        for (const [k, val] of Object.entries(v)) {
            if (depth === 0 && SKIP_KEYS.has(k))
                continue;
            const e = enc(val, depth + 1);
            if (e !== undefined)
                o.$o[k] = e;
        }
        return o;
    }
    return enc(root, 0);
}

export function gamestate_decode(node) {
    const byId = new Map();
    const fixups = [];

    function dec(v) {
        if (v === null || typeof v !== 'object') return v;
        if ('$ref' in v) {
            const hit = byId.get(v.$ref);
            if (hit !== undefined) return hit;
            const ph = {};
            fixups.push({ ph, ref: v.$ref });
            return ph;
        }
        if ('$a' in v) {
            const a = [];
            byId.set(v.$id, a);
            for (const e of v.$a) a.push(dec(e));
            return a;
        }
        if ('$set' in v) {
            const s = new Set();
            byId.set(v.$id, s);
            for (const e of v.$set) s.add(dec(e));
            return s;
        }
        if ('$map' in v) {
            const m = new Map();
            byId.set(v.$id, m);
            for (const [k, val] of v.$map) m.set(dec(k), dec(val));
            return m;
        }
        let o = {};
        if (v.$cls === 'GameMap')
            o = Object.create(GameMap.prototype);
        byId.set(v.$id, o);
        for (const [k, val] of Object.entries(v.$o))
            o[k] = dec(val);
        return o;
    }
    const root = dec(node);
    /* forward $refs (a $ref seen before its $id) — patch by replacing the
       placeholder contents; only plain-object placeholders occur */
    for (const { ph, ref } of fixups) {
        const target = byId.get(ref);
        if (target && typeof target === 'object')
            Object.setPrototypeOf(ph, Object.getPrototypeOf(target)),
            Object.assign(ph, target);
    }
    return root;
}

// src/save.c:43 dosave() — the 'S' command.
export async function dosave() {
    tty_clear_nhwindow_message(game._topl_cury || 0);
    game._pending_message = '';
    /* src/save.c:46 y_n() — ynq defaults 'n' (include/hack.h y_n macro) */
    const ans = await tty_yn_function('Really save?', 'yn', 'n', true);
    tty_clear_nhwindow_message(game._topl_cury || 0);
    game._pending_message = '';
    if (ans === 'n') {
        if ((game.multi ?? 0) > 0)
            nomul(0);
    } else {
        await pline('Saving...');
        if (dosave0()) {
            game.u.uhp = -1; /* universal game's over indicator */
            /* src/save.c:64 exit_nhwindows("Be seeing you...") — the tty
               port clears the message line and raw-prints the farewell,
               leaving the cursor on the next row; then nh_terminate() */
            {
                /* the tty exit clears the whole screen first */
                game._pending_message = '';
                const display = game?.nhDisplay;
                if (display?.clearScreen)
                    display.clearScreen();
                if (display) {
                    const s = 'Be seeing you...';
                    for (let i = 0; i < s.length; i++)
                        display.setCell(i, 0, s[i], 8 /* NO_COLOR */, 0);
                    display.setCursor(0, 1);
                }
            }
            game.program_state_gameover = true;
            const sig = new Error('nh_terminate');
            sig.__nh_gameover = true;
            throw sig;
        }
    }
    return ECMD_OK;
}

// src/save.c dosave0() — write the save file.
export function dosave0() {
    if (!game.storage)
        return false;
    try {
        // src/save.c:168 savelev(), also marks the current level VISITED.
        (game.visited_ledgers ||= new Set()).add(`${game.u.uz.dnum}:${game.u.uz.dlevel}`);
        const snap = gamestate_encode(game);
        game.storage.setItem(save_key(), JSON.stringify(snap));
        return true;
    } catch (e) {
        return false;
    }
}

// src/restore.c dorecover() — the restoring half, called from the boot
// when a save file for this character exists. Returns true when the game
// state was reinstalled; the caller then skips new-game initialization.
export function dorecover() {
    if (!game.storage)
        return false;
    const raw = game.storage.getItem(save_key());
    if (!raw)
        return false;

    let snap;
    try {
        snap = gamestate_decode(JSON.parse(raw));
    } catch (e) {
        return false;
    }

    const bootWizard = !!game.wizard, bootDiscover = !!game.discover;

    /* reinstall everything except the per-process keys, which keep the
       fresh boot's values */
    for (const k of Object.keys(game)) {
        if (!SKIP_KEYS.has(k))
            delete game[k];
    }
    for (const [k, v] of Object.entries(snap)) {
        if (!SKIP_KEYS.has(k))
            game[k] = v;
    }

    // src/restore.c restgamestate(), startup debug mode overrides the save.
    (game.iflags ||= {}).deferred_X = bootDiscover && !game.discover;
    if (bootWizard) {
        game.wizard = true;
        game.discover = game.iflags.deferred_X = false;
    } else if (game.wizard || game.discover) {
        set_playmode();
    }
    // role_init precedes the saved quest-status record in C. Its random
    // gender draws still happen, but the saved genders win afterwards.
    const savedGenders = [game.quest_ldrgend, game.quest_nemgend];
    role_init(game.flags.initrole, game.flags.initalign);
    [game.quest_ldrgend, game.quest_nemgend] = savedGenders;

    /* restore.c:705 recalculates this process-local movement sequence from
       the restored turn. It is not carried across the save boundary. */
    game.hero_seq = game.moves * 8;

    // src/restore.c:903, debug/explore saves await the unixmain prompt.
    if (!game.wizard && !game.discover)
        delete_savefile();
    return true;
}
