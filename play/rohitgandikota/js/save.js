// save.js: saved level and global records, following src/save.c.
// The cycle-aware JSON codec preserves aliases within each owned record.
// Save/free phases follow C's order. If the final storage write is refused,
// the adapter restores the original live owners so play can continue.
// Recovery in restore.js rebuilds process services and initializes role data
// and the Lua core in C's order before play resumes.

import { RANGE_LEVEL, RANGE_GLOBAL, REST_GSTATE, OBJ_FREE, has_omonst, OMONST, FULL_MOON } from './const.js';
import { game } from './gstate.js';
import { change_luck } from './attrib.js';
import { pline, tty_clear_nhwindow_message, docrt } from './display.js';
import { tty_yn_function } from './tty/topl.js';
import { nomul } from './hack.js';
import { ECMD_OK } from './const.js';
import { GameMap } from './game.js';
import { save_engravings } from './engrave.js';
import { getlev } from './restore.js';
import { save_timers } from './timeout.js';
import { save_light_sources } from './light.js';
import { save_waterlevel, checkpoint_waterlevel } from './mkmaze.js';
import { save_worm } from './worm.js';
import { save_regions } from './region.js';
import { initrack } from './track.js';
import { forget_temple_entry } from './priest.js';
import { ledger_no, ledger_to_dnum, ledger_to_dlev } from './dungeon.js';
import { dmonsfree } from './mon.js';
import { dobjsfree } from './mkobj.js';
import { checkpoint_vision } from './vision.js';
import { getRngLog } from './rng.js';
import { done_object_cleanup } from './end.js';
export { dorecover } from './restore.js';

// src/save.c:951 savefruitchn()
export function savefruitchn(release = false) {
    const saved = [];
    for (let f = game.ffruit; f; f = f.nextf)
        if (f.fid >= 0)
            saved.push({fname: f.fname, fid: f.fid});
    if (release)
        game.ffruit = null;
    return saved;
}

/* keys on the game object that are per-process infrastructure or static
   data, never game state; the restoring boot provides fresh ones */
export const SAVE_SKIP_KEYS = new Set([
    'nhDisplay', 'coreCtx', 'dispCtx', 'storage',
    '_preNhgetchHook', '_pendingDisplay', 'coder', 'rc', 'unported',
    'currentSeed', 'fixed_datetime', 'animationFrame',
    'program_state', 'luacore', 'wportal',
    // include/decl.h:536: lastinvnr is never saved or restored.
    'lastinvnr',
    // include/decl.h:586: instance counter, not part of savegamestate().
    'mkot_trap_warn_count',
    // C rebuilds command bindings from this process's configuration. Command
    // queues and the one-time key-help message also start fresh after restore.
    'Cmd', 'cmd_bind', 'command_queue', 'dowhatdoes_once',
    // C saves flags, but not instance_flags or compiled configuration rules.
    // These use the restoring process's configuration (include/flag.h).
    'iflags', 'menu_colorings', 'plinemsg_types', 'apelist',
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
            if (depth === 0 && SAVE_SKIP_KEYS.has(k))
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
    await tty_clear_nhwindow_message(game._topl_cury || 0);
    game._pending_message = '';
    /* src/save.c:46 y_n() — ynq defaults 'n' (include/hack.h y_n macro) */
    const ans = await tty_yn_function('Really save?', 'yn', 'n', true);
    await tty_clear_nhwindow_message(game._topl_cury || 0);
    game._pending_message = '';
    if (ans === 'n') {
        if ((game.multi ?? 0) > 0)
            nomul(0);
    } else {
        await pline('Saving...');
        if (await dosave0()) {
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
        } else {
            await pline('Cannot open save file.');
            await docrt();
        }
    }
    return ECMD_OK;
}

// JSON storage adapter: retain the owners which save/free changes, so an
// atomic refused write can resume this same live game. This is deliberately
// not a clone of the game graph, display, storage or static data tables.
function save_checkpoint() {
    const records = new Map();
    function remember(record) {
        if (record && !records.has(record))
            records.set(record, Array.isArray(record) ? record.slice() : { ...record });
    }
    function objects(chain) {
        for (const obj of chain || []) {
            remember(obj);
            objects(obj.cobj);
        }
    }
    function monsters(chain) {
        remember(chain); // dmonsfree can splice the current monster list.
        for (const mon of chain || []) {
            remember(mon);
            remember(mon.epri);
            objects(mon.minvent);
        }
    }

    for (const record of [game, game.u, game.level, game.program_state,
        game.context, game.iflags, game.disp, game.gl, game.a11y])
        remember(record);
    for (const name of ['victual', 'tin', 'spbook', 'polearm', 'objsplit'])
        remember(game.context?.[name]);
    for (const chain of [game.invent, game.level.objects, game.level.buriedobjs,
        game.billobjs, game.migrating_objs, [game.u.uball, game.u.uchain].filter(Boolean)])
        objects(chain);
    monsters(game.level.monsters);
    monsters(game.migrating_mons);
    for (const engraving of game.level.lev_engr || [])
        remember(engraving);
    remember(game.light_sources); // discard_flashes splices this array.
    remember(game._msg_history); // Dormant held/hiding feedback can append.
    for (const rng of [game.coreCtx, game.dispCtx]) {
        remember(rng);
        remember(rng?.r);
        remember(rng?.m);
    }
    const visited = game.visited_ledgers && [...game.visited_ledgers];
    const log = getRngLog();
    const logLength = log.length;
    const restoreClouds = checkpoint_waterlevel();
    const restoreVision = checkpoint_vision();
    return () => {
        for (const [record, saved] of records) {
            for (const key of Object.keys(record))
                if (!Object.hasOwn(saved, key))
                    delete record[key];
            Object.assign(record, saved);
            if (Array.isArray(record))
                record.length = saved.length;
        }
        if (visited) {
            game.visited_ledgers.clear();
            for (const key of visited)
                game.visited_ledgers.add(key);
        }
        restoreClouds();
        restoreVision();
        log.length = logLength;
    };
}

// src/save.c:74 dosave0(). Level records are owned snapshots, not live maps.
export async function dosave0() {
    if (!game.storage)
        return false;
    const state = game.program_state ||= {};
    state.saving = (state.saving || 0) + 1;
    const current = game.u.uz;
    const currentKey = `${current.dnum}:${current.dlevel}`;
    const key = save_key();
    try {
        // save.c:98 precedes create_savefile(). Cleanup remains complete even
        // if storage refuses: retain that playable state before writing/freeing.
        await done_object_cleanup();
        const rollback = save_checkpoint();
        // src/save.c:141-145: resume applies the new date's luck adjustment.
        // The checkpoint retains the original luck if the final write refuses.
        if (game.flags.moonphase === FULL_MOON)
            change_luck(-1);
        if (game.flags.friday13)
            change_luck(1);
        const level = savelev(ledger_no(current), true);
        const saved = savegamestate(level);
        saved.saved_levels.set(currentKey, level);

        // save.c:180-212: copy other level files in numeric ledger order.
        game.u.uz = { dnum: 0, dlevel: 0 };
        game.u.ustuck = game.u.usteed = null;
        game.u.uswallow = 0;
        const levels = [...saved.saved_levels.entries()].filter(([name]) => name !== currentKey);
        const ledger = name => {
            const [dnum, dlevel] = name.split(':').map(Number);
            return ledger_no({ dnum, dlevel });
        };
        levels.sort(([a], [b]) => ledger(a) - ledger(b));
        for (const [name, record] of levels) {
            await getlev(record);
            saved.saved_levels.set(name, savelev(ledger(name), true));
        }
        const bytes = JSON.stringify(gamestate_encode(saved));
        // Only the storage API's refusal is resumable. Earlier save/encoding
        // errors must propagate instead of being mistaken for a failed write.
        try {
            game.storage.setItem(key, bytes);
        } catch (error) {
            rollback();
            return false;
        }
        return true;
    } finally {
        game.u.uz = current;
        state.saving--;
    }
}

// src/save.c:265 savegamestate(). Local owners were already written/freed.
function savegamestate(level) {
    const timers = save_timers(RANGE_GLOBAL, true);
    const lights = save_light_sources(RANGE_GLOBAL, true);
    const saved = gamestate_decode(gamestate_encode({ ...game,
        _save_version: 1, level,
        saved_levels: game.saved_levels || new Map(),
        timer_base: timers.timers, timer_id: timers.timer_id,
        light_sources: lights
    }));
    // The current-level record is already independent and must stay original.
    saved.level = level;
    saveobjchn(saved.invent, false);
    saveobjchn(saved.migrating_objs, false);
    savemonchn(saved.migrating_mons, false);
    const loose = ['uball', 'uchain'].map(slot => game.u[slot])
        .filter(obj => game.u.uswallow && obj && obj.where === OBJ_FREE);
    saveobjchn(['uball', 'uchain'].map(slot => saved.u[slot])
        .filter(obj => saved.u.uswallow && obj && obj.where === OBJ_FREE), false);
    saveobjchn(game.invent);
    saveobjchn(loose);
    saveobjchn(game.migrating_objs);
    savemonchn(game.migrating_mons);
    game.invent = [];
    game.migrating_objs = [];
    game.migrating_mons = [];
    return saved;
}

// src/save.c:429 savelev()/savelev_core(). JSON owns one complete level record.
export function savelev(lev, release = false) {
    const state = game.program_state ||= {};
    state.saving = (state.saving || 0) + 1;
    try {
        const level = game.level;
        if (game.iflags?.purge_monsters)
            dmonsfree();
        if (game.objs_deleted)
            dobjsfree();
        if (lev > 0) {
            const key = `${ledger_to_dnum(lev)}:${ledger_to_dlev(lev)}`;
            (game.visited_ledgers ||= new Set()).add(key);
        }
        level._saved_format = 1;
        level._saved_ledger = lev;
        level._saved_omoves = game.moves;
        level._saved_stairs = game.stairs;
        level._saved_updest = { ...game.updest };
        level._saved_dndest = { ...game.dndest };
        level._saved_timers = save_timers(RANGE_LEVEL, release);
        level._saved_lights = save_light_sources(RANGE_LEVEL, release);
        level._saved_worms = save_worm(release);
        level._saved_billobjs = game.billobjs || [];
        level._saved_engravings = save_engravings();
        const regions = save_regions();
        level._saved_regions = regions.regions;
        level._saved_regions_moves = regions.moves;
        save_waterlevel(release);
        level._saved_exclusion_zones = game.exclusion_zones || [];
        level._saved_track = {
            utcnt: game.utcnt || 0, utpnt: game.utpnt || 0,
            utrack: game.utrack || []
        };
        for (const mon of level.monsters || []) {
            mon.mtemplit = 0;
            if (mon.ispriest)
                forget_temple_entry(mon);
        }
        const saved = gamestate_decode(gamestate_encode(level));
        // C's relative fields are stored in this record, never in live owners.
        saved.flags.stasis_until = (saved.flags.stasis_until || 0) - game.moves;
        savemonchn(saved.monsters, false);
        saveobjchn(saved.objects, false);
        saveobjchn(saved.buriedobjs, false);
        saveobjchn(saved._saved_billobjs, false);
        const relative = state.restoring !== REST_GSTATE;
        for (let stair = saved._saved_stairs; stair; stair = stair.next)
            if (relative && stair.tolev.dnum === game.u.uz.dnum)
                stair.tolev.dlevel -= game.u.uz.dlevel;
        for (const trap of saved.traps || [])
            if (relative && trap.dst?.dnum === game.u.uz.dnum)
                trap.dst.dlevel -= game.u.uz.dlevel;
        if (release) {
            savemonchn(level.monsters);
            saveobjchn(level.objects);
            saveobjchn(level.buriedobjs);
            saveobjchn(game.billobjs);
            game.billobjs = [];
            game.regions = [];
            game.max_regions = 0;
            game.stairs = null;
            game.exclusion_zones = [];
            initrack();
            game.level = new GameMap();
        }
        return saved;
    } finally {
        state.saving--;
    }
}

// src/save.c:762 saveobjchn(). The writing pass receives an independent copy.
// GC releases memory; the surviving context and equipment references still
// need C's invalidation. Do not call gameplay object destruction here.
function saveobjchn(objects, release = true) {
    for (const obj of objects || []) {
        if (!release && has_omonst(obj))
            savemon(OMONST(obj));
        saveobjchn(obj.cobj, release);
        if (!release)
            continue;
        for (const [name, field] of [['victual', 'piece'], ['tin', 'tin'], ['spbook', 'book']]) {
            const context = game.context?.[name];
            if (context?.[field] === obj) {
                context.o_id = obj.o_id;
                context[field] = null;
            }
        }
        const split = game.context?.objsplit;
        if (split && (split.parent_oid === obj.o_id || split.child_oid === obj.o_id))
            split.parent_oid = split.child_oid = 0;
        for (const slot of Object.keys(game.u || {}))
            if (game.u[slot] === obj)
                game.u[slot] = null;
        if (game.thrownobj === obj)
            game.thrownobj = null;
        if (game.kickedobj === obj)
            game.kickedobj = null;
        obj.where = OBJ_FREE;
        obj.nexthere = null;
        obj.cobj = null;
        obj.timed = obj.lamplit = obj.owornmask = obj.leashmon = 0;
    }
}

// src/save.c:829 savemon(), relative pet timestamps in the serialized copy.
function savemon(mon) {
    mon.mtemplit = 0;
    if (mon.edog) {
        mon.edog.droptime = (mon.edog.droptime || 0) - game.moves;
        mon.edog.hungrytime = (mon.edog.hungrytime || 0) - game.moves;
    }
}

// src/save.c:884 savemonchn(). Writing and freeing operate on separate owners.
function savemonchn(monsters, release = true) {
    for (const mon of monsters || []) {
        if (!release) {
            if (mon.ispriest)
                forget_temple_entry(mon);
            savemon(mon);
        }
        saveobjchn(mon.minvent, release);
        if (!release)
            continue;
        const polearm = game.context?.polearm;
        if (polearm?.hitmon === mon) {
            polearm.m_id = mon.m_id;
            polearm.hitmon = null;
        }
        for (const slot of ['ustuck', 'usteed']) {
            if (game.u[slot] === mon) {
                game.u[`${slot}_mid`] = mon.m_id;
                game.u[slot] = null;
            }
        }
    }
}
