// save.js — Game save / restore via frozen storage VFS (JSON subset).
// C ref: save.c dosave / dosave0 / savelev / savetrapchn / save_msghistory /
//        save_gamelog / save_luadata; restore.c dorecover / getlev
//        trap loop / place_monster / restore_cham / inven_inuse /
//        restore_msghistory / restore_gamelog; nhlua.c
//        restore_luadata / save_luadata; files.c SAVEF; unixmain
//        attempt_restore; allmain welcome(FALSE).
// Level blob codec: js/lev_json.js (shared with bones.js).

import { game } from './gstate.js';
import { vfsReadFile, vfsWriteFile, vfsDeleteFile } from './storage.js';
import { yn_function } from './getline.js';
import { pline, docrt, getmsghistory, putmsghistory } from './display.js';
import { gamelog_add } from './pline.js';
import { change_luck } from './attrib.js';
import {
    FULL_MOON, OBJ_INVENT, OBJ_CONTAINED, OBJ_MIGRATING,
    ECMD_OK, BUFSZ, VISITED, LFILE_EXISTS, REST_CURRENT_LEVEL,
    W_WEP, W_SWAPWEP, W_QUIVER,
} from './const.js';
import { objects_globals_init, objectNames } from './objects.js';
import { nh_terminate_capture } from './topten.js';
import { l_nhcore_init, restore_waterlevel } from './mklev.js';
import {
    save_mapseenchn,
    restore_mapseenchn,
    ledger_no,
    maxledgerno,
    save_dungeon_topology,
    restore_dungeon_topology,
} from './dungeon.js';
import { rest_track } from './track.js';
import { restore_timers, restore_light_sources, run_timers, dobjsfree } from './mkobj.js';
import { vision_reset } from './vision.js';
import { setworn } from './do_wear.js';
import { setuwep, setuswapwep, setuqwep } from './wield.js';
import { restore_artifacts } from './artifact.js';
import { save_oracles, restore_oracles } from './rumors.js';
import {
    serObj,
    serObjChain,
    deserObjChain,
    serLevel,
    deserLevel,
    levelBlobFromPayload,
    snapshotGlobalTimers,
    snapshotGlobalLights,
    deserTimerList,
    deserLightList,
    serMonList,
    deserMonList,
    relinkGlobalTimersLights,
    findOidInRoots,
    findMidInRoots,
} from './lev_json.js';

export { serObj, serMon, serLevel, deserLevel, serTraps, deserTraps } from './lev_json.js';

const SAVE_VFS_PREFIX = 'save/';

/** C ref: files.c set_savefile_name — contest uses plname under save/. */
export function set_savefile_name(plname) {
    const name = String(plname || game.plname || 'Hero').replace(/[/\\]/g, '_');
    return `${SAVE_VFS_PREFIX}${name}`;
}

function vfsPath(path) {
    return path;
}

function serInventArray(invent) {
    return (invent || []).map((o) => serObj(o));
}

const WORN_SLOTS = [
    'uwep', 'uswapwep', 'uquiver',
    'uarm', 'uarmc', 'uarmh', 'uarms', 'uarmg', 'uarmf', 'uarmu',
    'uleft', 'uright', 'uchain', 'uball', 'uamul', 'ublindf',
];

const PICK_AXE = objectNames.indexOf('PICK_AXE');
const GRAPPLING_HOOK = objectNames.indexOf('GRAPPLING_HOOK');

/** Live obj/mon pointers that JSON.stringify cannot cycle through. */
const CONTEXT_LIVE_KEYS = new Set(['piece', 'tin', 'book', 'hitmon', 'stylus']);

function serObjectsMutable(objects) {
    if (!objects) return [];
    return objects.map((oc) => ({
        oc_name_known: oc.oc_name_known | 0,
        oc_descr_idx: oc.oc_descr_idx | 0,
        oc_color: oc.oc_color | 0,
        oc_tough: oc.oc_tough | 0,
        oc_material: oc.oc_material | 0,
        oc_prob: oc.oc_prob | 0,
        oc_encountered: oc.oc_encountered | 0,
        oc_uname: oc.oc_uname || null,
    }));
}

function deserInventArray(arr) {
    const invent = [];
    for (const raw of arr || []) {
        if (!raw) continue;
        const otmp = { ...raw };
        const kids = otmp.cobj;
        delete otmp.cobj;
        otmp.nobj = null;
        otmp.nexthere = null;
        otmp.ocarry = null;
        otmp.ocontainer = null;
        otmp.where = OBJ_INVENT;
        otmp.cobj = deserObjChain(kids, OBJ_CONTAINED);
        if (otmp.cobj) {
            for (let c = otmp.cobj; c; c = c.nobj) c.ocontainer = otmp;
        }
        invent.push(otmp);
    }
    return invent;
}

function rebuildObjectsAt(fobj) {
    game._objects_at = new Map();
    const stack = [];
    for (let o = fobj; o; o = o.nobj) stack.push(o);
    for (let i = stack.length - 1; i >= 0; i--) {
        const otmp = stack[i];
        otmp.nexthere = null;
        const key = `${otmp.ox},${otmp.oy}`;
        const cur = game._objects_at.get(key) || null;
        otmp.nexthere = cur;
        game._objects_at.set(key, otmp);
    }
}

/**
 * C save.c dosave0 `:185–215` — other LFILE_EXISTS ledgers, skip current.
 * serLevel of the in-memory stash; relink stays on the blob (M2).
 * @param {number} currentLedger
 * @returns {Record<string, object>}
 */
function serOtherLevels(currentLedger) {
    const levels = {};
    const maxL = maxledgerno();
    for (let ltmp = 1; ltmp <= maxL; ltmp++) {
        if (ltmp === currentLedger) continue;
        const info = game.level_info?.[ltmp];
        if (!info || !((info.flags | 0) & LFILE_EXISTS)) continue;
        levels[String(ltmp)] = serLevel(info);
    }
    return levels;
}

/**
 * C dungeon.c save_dungeon `:172–176` — count = maxledgerno(); i < count.
 * @returns {{ flags: number }[]}
 */
function serLinfo() {
    const count = maxledgerno();
    const out = [];
    for (let i = 0; i < count; i++) {
        out.push({ flags: game.level_info?.[i]?.flags | 0 });
    }
    return out;
}

/**
 * C restore.c dorecover other-level loop `:869–888` + getlev relink
 * `:1299–1300`. Bodies stay on `level_info` (M2: do not insert timers
 * or lights into `_timer_base` / `light_base`).
 * @param {object} payload
 */
function restoreOtherLedgers(payload) {
    if (!game.level_info) game.level_info = [];
    if (Array.isArray(payload.linfo)) {
        for (let i = 0; i < payload.linfo.length; i++) {
            const flags = payload.linfo[i]?.flags | 0;
            const prev = game.level_info[i] || {};
            game.level_info[i] = { ...prev, flags };
        }
    }
    const levels = payload.levels;
    if (!levels || typeof levels !== 'object' || Array.isArray(levels)) return;
    for (const key of Object.keys(levels)) {
        const i = Number(key);
        if (!Number.isFinite(i) || i < 1) continue;
        const blob = levels[key];
        if (!blob || typeof blob !== 'object') continue;
        const info = deserLevel(blob);
        const flags = (game.level_info[i]?.flags | 0) | LFILE_EXISTS | VISITED;
        game.level_info[i] = { ...info, flags };
    }
}

/**
 * C save.c savelev_core `:515–516` writes `svm.moves` as lev-timestmp
 * (read back as `svo.omoves`). dorecover `restlevelfile` of every
 * other ledger therefore restamps omoves to restore-time moves, so the
 * next `goto_level` getlev sees elapsed==0 and skips hide_monst rnd(10).
 * JSON does not rewrite blobs through FREEING; this is the timestamp
 * analogue only (not teardown). Current ledger keeps save-time omoves
 * (C second getlev rereads the original current savelev).
 * @param {number} currentLedger
 */
function restampOtherLedgerOmoves(currentLedger) {
    const moves = game.moves | 0;
    const maxL = maxledgerno();
    for (let i = 1; i <= maxL; i++) {
        if (i === currentLedger) continue;
        const info = game.level_info?.[i];
        if (!info || !((info.flags | 0) & LFILE_EXISTS)) continue;
        info.omoves = moves;
    }
}

/**
 * C save.c savegamestate Sfo_context_info. Stamp o_id/m_id from live
 * pointers; drop piece/tin/book/hitmon/stylus so stringify cannot cycle.
 * @param {object|null|undefined} ctx
 * @returns {object}
 */
function serContext(ctx) {
    if (!ctx || typeof ctx !== 'object') return {};
    let out;
    try {
        out = JSON.parse(JSON.stringify(ctx, (k, v) => {
            if (typeof v === 'function') return undefined;
            if (CONTEXT_LIVE_KEYS.has(k)) return undefined;
            if (v != null && typeof v === 'object' && !Array.isArray(v)
                && (v.otyp != null || v.mnum != null || v.mx != null
                    || v.data != null)) {
                return undefined;
            }
            return v;
        }));
    } catch {
        out = {};
    }
    if (ctx.victual) {
        if (!out.victual) out.victual = {};
        out.victual.o_id = (ctx.victual.o_id | 0)
            || (ctx.victual.piece?.o_id | 0);
        delete out.victual.piece;
    }
    if (ctx.tin) {
        if (!out.tin) out.tin = {};
        out.tin.o_id = (ctx.tin.o_id | 0) || (ctx.tin.tin?.o_id | 0);
        delete out.tin.tin;
    }
    if (ctx.spbook) {
        if (!out.spbook) out.spbook = {};
        out.spbook.o_id = (ctx.spbook.o_id | 0) || (ctx.spbook.book?.o_id | 0);
        delete out.spbook.book;
    }
    if (ctx.polearm) {
        if (!out.polearm) out.polearm = {};
        out.polearm.m_id = (ctx.polearm.m_id | 0)
            || (ctx.polearm.hitmon?.m_id | 0);
        delete out.polearm.hitmon;
    }
    return out;
}

/**
 * C restore.c restobjchn `:283–290` / restmonchn `:451–453`.
 * Missing o_id/m_id leaves the pointer null (old save / not in progress).
 * @param {object} ctx
 * @param {object} objRoots
 * @param {object} monRoots
 */
function rebindContextIds(ctx, objRoots, monRoots) {
    if (!ctx) return;
    if (ctx.victual) {
        const id = ctx.victual.o_id | 0;
        ctx.victual.piece = id ? findOidInRoots(id, objRoots) : null;
    }
    if (ctx.tin) {
        const id = ctx.tin.o_id | 0;
        ctx.tin.tin = id ? findOidInRoots(id, objRoots) : null;
    }
    if (ctx.spbook) {
        const id = ctx.spbook.o_id | 0;
        ctx.spbook.book = id ? findOidInRoots(id, objRoots) : null;
    }
    if (ctx.polearm) {
        const id = ctx.polearm.m_id | 0;
        ctx.polearm.hitmon = id ? findMidInRoots(id, monRoots) : null;
    }
}

/**
 * C save.c savefruitchn `:950–971` fid>=0. Preserve JS nextf order
 * (fruitadd newest-first); do not emulate C load prepend-reverse.
 * @returns {{ fname: string, fid: number }[]}
 */
function serFruitchn() {
    const out = [];
    for (let f = game.ffruit; f; f = f.nextf) {
        if ((f.fid | 0) < 0) continue;
        out.push({ fname: String(f.fname || ''), fid: f.fid | 0 });
    }
    return out;
}

/**
 * C restore.c loadfruitchn. Missing/non-array = old save (keep init fruit).
 * @param {unknown} arr
 */
function loadFruitchn(arr) {
    if (!Array.isArray(arr)) return;
    let head = null;
    let prev = null;
    for (const raw of arr) {
        if (!raw || typeof raw !== 'object') continue;
        const node = {
            fname: String(raw.fname || ''),
            fid: raw.fid | 0,
            nextf: null,
        };
        if (!head) head = node;
        else prev.nextf = node;
        prev = node;
    }
    game.ffruit = head;
}

/**
 * C restore.c restgamestate `:687–699` setworn walk then setuwep so
 * unweapon recomputes. JS setworn does not place W_WEP/SWAP/QUIVER;
 * those slots use wield helpers, then C's pick-axe/grapple override.
 * @param {object[]} invent
 */
function restWornFromInvent(invent) {
    const u = game.u || (game.u = {});
    let wep = null;
    let swap = null;
    let quiver = null;
    for (const otmp of invent || []) {
        const mask = otmp?.owornmask | 0;
        if (!mask) continue;
        setworn(otmp, mask);
        if (mask & W_WEP) wep = otmp;
        if (mask & W_SWAPWEP) swap = otmp;
        if (mask & W_QUIVER) quiver = otmp;
    }
    if (swap) setuswapwep(swap);
    if (quiver) setuqwep(quiver);
    const otmp = wep || u.uwep || null;
    u.uwep = null;
    setuwep(otmp);
    if (!u.uwep || u.uwep.otyp === PICK_AXE || u.uwep.otyp === GRAPPLING_HOOK) {
        if (!game.gu) game.gu = {};
        game.gu.unweapon = true;
    }
}

/**
 * C ref: save.c dosave0 — write current game to VFS (JSON subset of savelev).
 * Named omissions: binary NHFILE format; hangup arms; overwrite yn;
 * compress; uid/nhuuid/urealtime/wreserve; save_killers;
 * save_bc loose ball when swallowed.
 * mapseenchn cemetery JSON is save_dungeon/save_mapseen (D-1685);
 * current-level bonesinfo is savelev savecemetery.
 */
export function dosave0() {
    const u = game.u || {};
    // C save.c savemonchn `:904–907` — stamp m_id from live pointers.
    u.usteed_mid = (u.usteed && (u.usteed.m_id | 0)) ? (u.usteed.m_id | 0) : 0;
    u.ustuck_mid = (u.ustuck && (u.ustuck.m_id | 0)) ? (u.ustuck.m_id | 0) : 0;
    // C: undo date-dependent luck before persisting
    if (game.flags?.moonphase === FULL_MOON) change_luck(-1);
    if (game.flags?.friday13) change_luck(1);

    // C save.c:490–491 — dobjsfree before persisting when objs_deleted.
    dobjsfree();

    const path = set_savefile_name(game.plname);
    const currentLedger = ledger_no(u.uz);
    // goto_level only writes level_info[old] on leave; synthesize current
    // linfo flags + omoves (C savelev of the live floor).
    if (!game.level_info) game.level_info = [];
    const prevCur = game.level_info[currentLedger] || { flags: 0 };
    game.level_info[currentLedger] = {
        ...prevCur,
        flags: (prevCur.flags | 0) | VISITED | LFILE_EXISTS,
        omoves: game.moves | 0,
    };
    const payload = {
        version: 1,
        plname: game.plname,
        u: serHero(u),
        invent: serInventArray(game.invent),
        objects: serObjectsMutable(game.objects),
        bases: game.bases ? [...game.bases] : null,
        oclass_prob_totals: game.oclass_prob_totals
            ? [...game.oclass_prob_totals] : null,
        disco: game.disco ? [...game.disco] : [],
        flags: game.flags ? { ...game.flags } : {},
        // C restore.c ~576–580: iflags (perm_invent) is not in the save.
        context: serContext(game.context),
        moves: game.moves | 0,
        multi: game.multi | 0,
        urole: game.urole
            ? JSON.parse(JSON.stringify(game.urole)) : null,
        urace: game.urace
            ? JSON.parse(JSON.stringify(game.urace)) : null,
        mvitals: game.mvitals
            ? JSON.parse(JSON.stringify(game.mvitals)) : null,
        dungeons: game.dungeons
            ? JSON.parse(JSON.stringify(game.dungeons)) : null,
        n_dgns: game.n_dgns | 0,
        branches: game.branches
            ? JSON.parse(JSON.stringify(game.branches)) : null,
        // C dungeon.c save_dungeon `Sfo_dgn_topology` — every special-level
        // d_level (castle, sanctum, quest starts …) survives the save.
        topology_levels: save_dungeon_topology(),
        // C save.c savelev current then other LFILE_EXISTS (D-1697).
        current: serLevel(null),
        current_ledger: currentLedger,
        levels: serOtherLevels(currentLedger),
        linfo: serLinfo(),
        dungeon_topology: game.dungeon_topology
            ? JSON.parse(JSON.stringify(game.dungeon_topology)) : null,
        tune: game.tune || null,
        inv_pos: game.svi?.inv_pos
            ? { x: game.svi.inv_pos.x | 0, y: game.svi.inv_pos.y | 0 }
            : (game.inv_pos
                ? { x: game.inv_pos.x | 0, y: game.inv_pos.y | 0 }
                : null),
        // C save.c save_dungeon → save_mapseen + savecemetery
        mapseenchn: save_mapseenchn(),
        spl_book: game.spl_book
            ? JSON.parse(JSON.stringify(game.spl_book)) : null,
        spl_orderindx: game.spl_orderindx
            ? [...game.spl_orderindx] : null,
        artiexist: game.artiexist
            ? [...game.artiexist] : null,
        // C save.c save_artifacts artidisco; restore_artifacts hack_artifacts
        artidisco: game.artidisco ? [...game.artidisco] : null,
        // C save.c `:321` save_oracles oracle_cnt + live oracle_loc deck.
        oracles: save_oracles(),
        quest_status: game.quest_status
            ? JSON.parse(JSON.stringify(game.quest_status)) : null,
        pl_fruit: game.pl_fruit || null,
        ffruit: serFruitchn(),
        migrating_objs: serObjChain(game.migrating_objs),
        migrating_mons: serMonList(game.migrating_mons),
        // C savegamestate save_timers(RANGE_GLOBAL) + timer_id + lights
        timer_id: game.timer_id | 0,
        timer_global: snapshotGlobalTimers(),
        lights_global: snapshotGlobalLights(),
        preferred_pet: game.preferred_pet || null,
        _goldCount: game._goldCount | 0,
        _lastinvnr: game._lastinvnr | 0,
        datetime_saved: game.datetime || null,
        uz: u.uz ? { ...u.uz } : { dnum: 0, dlevel: 1 },
        // C save.c save_msghistory `:1029–1056` after savenames;
        // save_gamelog `:236–262` after save_msghistory;
        // save_luadata nhlua.c `:1327–1341` after save_gamelog.
        msghistory: save_msghistory(),
        gamelog: save_gamelog(),
        luadata: save_luadata(),
    };

    return vfsWriteFile(vfsPath(path), JSON.stringify(payload));
}

/**
 * C ref: save.c save_msghistory `:1029–1056`. JSON analogue of
 * Sfo_int length + Sfo_char then Sfo_int -1. Skip empty; truncate
 * BUFSZ-1. getmsghistory snapshots with WIN_LOCKHISTORY then unlocks.
 * update_file/FREEING / debugpline1 omitted (JSON VFS always writes).
 * @returns {string[]}
 */
export function save_msghistory() {
    const out = [];
    let init = true;
    let msg;
    while ((msg = getmsghistory(init))) {
        init = false;
        let msglen = msg.length;
        if (msglen < 1) continue;
        if (msglen > BUFSZ - 1) msglen = BUFSZ - 1;
        out.push(msg.slice(0, msglen));
    }
    return out;
}

/**
 * C ref: save.c save_gamelog `:236–262`. JSON analogue of Sfo_int
 * length + Sfo_char text + Sfo_gamelog_line (turn/flags) then Sfo_int
 * -1. Walk gg.gamelog in list order; do not skip empty (unlike
 * save_msghistory). FREEING / discard_gamelog omitted (JSON VFS
 * always writes; in-memory list stays).
 * @returns {{ text: string, turn: number, flags: number }[]}
 */
export function save_gamelog() {
    const out = [];
    for (const tmp of game.gamelog || []) {
        out.push({
            text: String(tmp.text ?? ''),
            turn: tmp.turn | 0,
            flags: tmp.flags | 0,
        });
    }
    return out;
}

/**
 * C ref: dat/nhlib.lua table_stringify. Persistable Lua table → source
 * `{["k"]=v,}` for string/boolean/number/table/nil. pairs() order is
 * JS insertion order. Functions skipped. No escape of `]]` in strings
 * (C does not either).
 * @param {object} tbl
 * @returns {string}
 */
export function table_stringify(tbl) {
    let str = '';
    if (!tbl || typeof tbl !== 'object' || Array.isArray(tbl)) {
        return '{}';
    }
    for (const key of Object.keys(tbl)) {
        const value = tbl[key];
        if (value !== null && typeof value === 'object') {
            if (Array.isArray(value)) continue;
            str += `["${key}"]=${table_stringify(value)}`;
        } else if (typeof value === 'string') {
            str += `["${key}"]=[[${value}]]`;
        } else if (typeof value === 'boolean') {
            str += `["${key}"]=${value}`;
        } else if (typeof value === 'number' && Number.isFinite(value)) {
            str += `["${key}"]=${value}`;
        } else if (value == null) {
            str += `["${key}"]=nil`;
        } else {
            continue;
        }
        str += ',';
    }
    return `{${str}}`;
}

/**
 * C ref: dat/nhcore.lua get_variables_string.
 * @returns {string}
 */
export function get_variables_string() {
    return `nh_lua_variables=${table_stringify(game.nh_lua_variables || {})};`;
}

/**
 * C ref: nhlua.c get_nh_lua_variables `:1296–1316`. Panic if !luacore.
 * If get_variables_string pcall fails, C returns NULL; JSON analogue
 * returns null so save_luadata can write emptystr.
 * @returns {string|null}
 */
export function get_nh_lua_variables() {
    if (!game.luacore) {
        throw new Error('nh luacore not inited');
    }
    try {
        return get_variables_string();
    } catch {
        return null;
    }
}

/**
 * C ref: save.c save_luadata via nhlua.c `:1327–1341`. JSON analogue of
 * Sfo_unsigned length + Sfo_char lua source (NUL-terminated in C).
 * get_nh_lua_variables NULL → emptystr. FREEING omitted (JSON VFS
 * always writes; in-memory table stays).
 * @returns {string}
 */
export function save_luadata() {
    let lua_data = get_nh_lua_variables();
    if (!lua_data) lua_data = '';
    return lua_data;
}

/** Plain-data hero fields; worn slots omitted (owornmask + setworn). */
function serHero(u) {
    if (!u) return {};
    const out = {};
    for (const k of Object.keys(u)) {
        if (WORN_SLOTS.includes(k)) continue;
        const v = u[k];
        if (typeof v === 'function') continue;
        if (v != null && typeof v === 'object') {
            // Skip live object/mon pointers not in worn list
            if (v.otyp != null || v.mnum != null || v.mx != null) continue;
            try {
                out[k] = JSON.parse(JSON.stringify(v));
            } catch {
                /* omit */
            }
            continue;
        }
        out[k] = v;
    }
    return out;
}

/**
 * C ref: restore.c inven_inuse `:112–125` — objects marked in_use at
 * save (HUP cheat) get used up after invent + current level exist.
 * Named omit on done_object_cleanup (end.c) stays; this is dorecover.
 * @param {boolean} quietly
 */
async function inven_inuse(quietly) {
    const { useup } = await import('./eat.js');
    const { xname } = await import('./objnam.js');
    for (const otmp of [...(game.invent || [])]) {
        if (!otmp?.in_use) continue;
        if (!quietly) await pline(`Finishing off ${xname(otmp)}...`);
        useup(otmp);
    }
}

/**
 * C ref: restore.c dorecover + getlev/restgamestate subset.
 * Async for restore_cham / inven_inuse / run_timers (C `:922–931`).
 * @returns {Promise<boolean>} true if a save was loaded
 */
export async function try_restore_save() {
    const path = set_savefile_name(game.plname);
    const raw = vfsReadFile(vfsPath(path));
    if (raw == null) return false;

    let payload;
    try {
        payload = JSON.parse(raw);
    } catch {
        vfsDeleteFile(vfsPath(path));
        return false;
    }
    if (!payload || payload.version !== 1) {
        vfsDeleteFile(vfsPath(path));
        return false;
    }

    objects_globals_init();
    if (payload.objects && game.objects) {
        for (let i = 0; i < payload.objects.length && i < game.objects.length; i++) {
            const src = payload.objects[i];
            const dst = game.objects[i];
            if (!src || !dst) continue;
            dst.oc_name_known = src.oc_name_known | 0;
            dst.oc_descr_idx = src.oc_descr_idx | 0;
            dst.oc_color = src.oc_color | 0;
            dst.oc_tough = src.oc_tough | 0;
            dst.oc_material = src.oc_material | 0;
            dst.oc_prob = src.oc_prob | 0;
            dst.oc_encountered = src.oc_encountered | 0;
            if (src.oc_uname) dst.oc_uname = src.oc_uname;
        }
    }
    if (payload.bases) game.bases = payload.bases;
    if (payload.oclass_prob_totals) {
        game.oclass_prob_totals = payload.oclass_prob_totals;
    }

    game.plname = payload.plname || game.plname;
    game.disco = payload.disco || [];
    game.flags = { ...(game.flags || {}), ...(payload.flags || {}) };
    // C: iflags (perm_invent, graphics) stay from nethackrc; not in save.
    game.context = { ...(payload.context || {}) };
    game.moves = payload.moves | 0;
    game.multi = payload.multi | 0;
    game.urole = payload.urole;
    game.urace = payload.urace;
    game.mvitals = payload.mvitals || [];
    game.dungeons = payload.dungeons || game.dungeons;
    game.n_dgns = payload.n_dgns | 0;
    game.branches = payload.branches || game.branches;
    // C dungeon.c restore_dungeon `Sfi_dgn_topology` — a restore boots from a
    // fresh game object without init_dungeons/fixup, so the `game.*_level`
    // fields must come from the save (old saves without the key keep current
    // values). Without this, `depth(game.stronghold_level)` falls back to
    // dungeon 0 level 1 and `maybe_generate_rnd_mon` (allmain.c:165) draws
    // `rn2(50)` where C draws `rn2(70)`.
    if (payload.topology_levels) {
        restore_dungeon_topology(payload.topology_levels);
    }
    if (payload.dungeon_topology) {
        game.dungeon_topology = payload.dungeon_topology;
    }
    if (payload.tune != null) game.tune = payload.tune;
    if (payload.inv_pos) {
        if (!game.svi) game.svi = {};
        game.svi.inv_pos = {
            x: payload.inv_pos.x | 0,
            y: payload.inv_pos.y | 0,
        };
        game.inv_pos = game.svi.inv_pos;
    }
    game.spl_book = payload.spl_book;
    game.spl_orderindx = payload.spl_orderindx;
    game.artiexist = payload.artiexist;
    game.preferred_pet = payload.preferred_pet;
    game._goldCount = payload._goldCount | 0;
    game._lastinvnr = payload._lastinvnr | 0;
    if (payload.timer_id != null) game.timer_id = payload.timer_id | 0;
    if (payload.quest_status) game.quest_status = payload.quest_status;
    if (payload.pl_fruit != null) game.pl_fruit = payload.pl_fruit;
    loadFruitchn(payload.ffruit);
    restore_artifacts(payload.artidisco);
    // C restore.c `:712` restore_oracles (flg=1 when cnt nonzero; old
    // saves without the key keep the fresh-boot flg 0 → init_oracles).
    restore_oracles(payload.oracles);

    const invent = deserInventArray(payload.invent);
    game.invent = invent;

    const u = { ...(payload.u || {}) };
    for (const slot of WORN_SLOTS) u[slot] = null;
    if (payload.uz) u.uz = { ...payload.uz };
    game.u = u;

    if (payload.migrating_objs) {
        game.migrating_objs = deserObjChain(payload.migrating_objs, OBJ_MIGRATING);
    }
    if (payload.migrating_mons) {
        game.migrating_mons = deserMonList(payload.migrating_mons);
    }

    // C restore.c restlevelfile others then getlev current. JSON hydrates
    // others into level_info without tearing down the live map (no FREEING).
    // Missing `levels` = old save, current-only (seed0013).
    restoreOtherLedgers(payload);
    restampOtherLedgerOmoves(ledger_no(u.uz));

    // C restore.c getlev current. Missing `current` = old scattered keys.
    const info = deserLevel(levelBlobFromPayload(payload));
    game.level = info.level;
    game.fmon = info.fmon;
    game.fobj = info.fobj;
    game.billobjs = info.billobjs;
    game.ftrap = info.level.traps;
    game.head_engr = info.head_engr;
    game.stairs = info.stairs;
    game.lastseentyp = info.lastseentyp;
    game.regions = info.regions || [];
    if (info.updest) game.updest = { ...info.updest };
    if (info.dndest) game.dndest = { ...info.dndest };
    // C restore.c rest_bubbles after rest_regions
    if (info.waterlevel) restore_waterlevel(info.waterlevel);
    // C restore.c dorecover → restore_dungeon mapseen_count +
    // load_mapseen (dungeon.c :251–262 / :2752). After branches.
    restore_mapseenchn(payload);
    rebuildObjectsAt(info.fobj);

    // C restgamestate `:687–699` after invent.
    restWornFromInvent(invent);

    // C restgamestate restore_timers(RANGE_GLOBAL) then invent then
    // relink `:725–726`. JSON hydrates invent first (ids only), then
    // inserts globals and relinks. Current-level timers already have
    // obj from deserLevel; M2: only those plus RANGE_GLOBAL go on
    // `_timer_base`.
    const globalTimers = deserTimerList(payload.timer_global);
    const globalLights = deserLightList(payload.lights_global);
    restore_timers(globalTimers);
    restore_light_sources(globalLights);
    const idRoots = {
        invent,
        fobj: game.fobj,
        buried: game.level?.buriedobjlist,
        migrating_objs: game.migrating_objs,
        fmon: game.fmon,
        migrating_mons: game.migrating_mons,
        mydogs: game.mydogs,
    };
    rebindContextIds(game.context, idRoots, idRoots);
    relinkGlobalTimersLights(globalTimers, globalLights, {
        invent,
        migrating_objs: game.migrating_objs,
        migrating_mons: game.migrating_mons,
        mydogs: game.mydogs,
    });

    // C getlev rest_track / restore_timers / restore_light_sources
    // for the current ledger only (M2: other ledgers stay on stash).
    if (info.track) rest_track(info.track);
    restore_timers(info.timers);
    restore_light_sources(info.lights);

    // C restore.c restgamestate `:720–722` after restnames:
    // restore_msghistory, restore_gamelog, restore_luadata.
    restore_msghistory(payload);
    restore_gamelog(payload);
    restore_luadata(payload);

    // C restore.c second getlev REST_CURRENT_LEVEL `:896–898` then
    // envelope `:922–942`. JSON has one install of current: place
    // occupancy, one restore_cham per current fmon (M6; elapsed 0 so
    // no hide_monst rnd(10)), then inven_inuse / vision_reset /
    // vision_full_recalc=1 / run_timers last. Other ledgers stay on
    // stash — zero restore_cham until goto_level.
    if (!game.program_state) game.program_state = {};
    game.program_state.restoring = REST_CURRENT_LEVEL;
    const { getlev_place_monsters, getlev_catchup_monsters } =
        await import('./do.js');
    getlev_place_monsters();
    await getlev_catchup_monsters(0);

    await inven_inuse(false);
    // C: reglyph_darkroom named omit — no JS analogue.
    vision_reset();
    game.vision_full_recalc = 1;
    await run_timers();
    game.program_state.restoring = 0;
    u.usteed_mid = 0;
    u.ustuck_mid = 0;
    game.program_state.beyond_savefile_load = 1;

    // C: delete save after successful restore
    vfsDeleteFile(vfsPath(path));
    return true;
}

/**
 * C ref: restore.c restore_msghistory `:1411–1441`. JSON analogue of
 * Sfi_int length (break on -1) + Sfi_char. Each msg
 * putmsghistory(msg, TRUE); if any, putmsghistory(NULL, TRUE).
 * Missing/non-array field = old JSON save without this chunk (empty
 * walk). Length > BUFSZ-1 is C panic; JSON analogue throws.
 * SFCTOOL / debugpline1 omitted.
 * @param {{ msghistory?: unknown }} payload
 */
export function restore_msghistory(payload) {
    const msgs = payload?.msghistory;
    if (!Array.isArray(msgs)) return;
    let msgcount = 0;
    for (const raw of msgs) {
        const s = String(raw ?? '');
        if (s.length > BUFSZ - 1) {
            throw new Error(`restore_msghistory: msg too big (${s.length})`);
        }
        putmsghistory(s, true);
        msgcount++;
    }
    if (msgcount) putmsghistory(null, true);
}

/**
 * C ref: restore.c restore_gamelog `:1386–1409`. JSON analogue of
 * Sfi_int length (break on -1) + Sfi_char + Sfi_gamelog_line then
 * gamelog_add(flags, turn, msg). Missing/non-array field = old JSON
 * save without this chunk (empty walk; gg.gamelog stays NULL).
 * Length > BUFSZ*2-1 is C panic; JSON analogue throws. SFCTOOL
 * omitted. C starts with gg.gamelog NULL; present chunk replaces.
 * @param {{ gamelog?: unknown }} payload
 */
export function restore_gamelog(payload) {
    const entries = payload?.gamelog;
    if (!Array.isArray(entries)) return;
    // C restgamestate starts with gg.gamelog == NULL; gamelog_add
    // appends. A present JSON chunk is the whole list.
    game.gamelog = [];
    for (const raw of entries) {
        const rec = raw && typeof raw === 'object' ? raw : {};
        const msg = String(rec.text ?? '');
        if (msg.length > BUFSZ * 2 - 1) {
            throw new Error(`restore_gamelog: msg too big (${msg.length})`);
        }
        gamelog_add(rec.flags | 0, rec.turn | 0, msg);
    }
}

/**
 * Parse `dat/nhlib.lua` table_stringify output at pos.i. C luaL_loadstring
 * panics via nhl_pcall_handle(NHLpa_panic) on bad source; JSON analogue
 * throws.
 * @param {string} src
 * @param {{ i: number }} pos
 * @returns {object}
 */
function parse_table_stringify(src, pos) {
    if (src[pos.i] !== '{') {
        throw new Error('restore_luadata: Lua error table_stringify');
    }
    pos.i++;
    const out = {};
    while (pos.i < src.length && src[pos.i] !== '}') {
        if (src[pos.i] === ',') {
            pos.i++;
            continue;
        }
        if (src.slice(pos.i, pos.i + 2) !== '["') {
            throw new Error('restore_luadata: Lua error table key');
        }
        pos.i += 2;
        const kEnd = src.indexOf('"]=', pos.i);
        if (kEnd < 0) {
            throw new Error('restore_luadata: Lua error table key');
        }
        const key = src.slice(pos.i, kEnd);
        pos.i = kEnd + 3;
        out[key] = parse_lua_value(src, pos);
    }
    if (src[pos.i] !== '}') {
        throw new Error('restore_luadata: Lua error table end');
    }
    pos.i++;
    return out;
}

/**
 * @param {string} src
 * @param {{ i: number }} pos
 * @returns {string|number|boolean|object|null}
 */
function parse_lua_value(src, pos) {
    if (src[pos.i] === '{') return parse_table_stringify(src, pos);
    if (src.slice(pos.i, pos.i + 2) === '[[') {
        pos.i += 2;
        const end = src.indexOf(']]', pos.i);
        if (end < 0) {
            throw new Error('restore_luadata: Lua error string');
        }
        const s = src.slice(pos.i, end);
        pos.i = end + 2;
        return s;
    }
    if (src.slice(pos.i, pos.i + 4) === 'true') {
        pos.i += 4;
        return true;
    }
    if (src.slice(pos.i, pos.i + 5) === 'false') {
        pos.i += 5;
        return false;
    }
    if (src.slice(pos.i, pos.i + 3) === 'nil') {
        pos.i += 3;
        return null;
    }
    const m = /^-?\d+(?:\.\d+)?/.exec(src.slice(pos.i));
    if (m) {
        pos.i += m[0].length;
        return Number(m[0]);
    }
    throw new Error('restore_luadata: Lua error value');
}

/**
 * C ref: nhlua.c restore_luadata `:1344–1363` luaL_loadstring +
 * nhl_pcall_handle(0, 0, "restore_luadata", NHLpa_panic). JSON analogue
 * of the get_variables_string assignment chunk. Empty / emptystr = empty
 * Lua chunk (nh_lua_variables stays the nhcore.lua `{}`).
 * @param {string} lua_data
 */
function nhl_loadstring_luadata(lua_data) {
    let s = String(lua_data);
    if (s.endsWith('\0')) s = s.slice(0, -1);
    if (!s) return;
    if (!s.startsWith('nh_lua_variables=')) {
        throw new Error('restore_luadata: Lua error restore_luadata');
    }
    const rest = s.slice('nh_lua_variables='.length);
    const pos = { i: 0 };
    game.nh_lua_variables = parse_table_stringify(rest, pos);
    if (rest[pos.i] === ';') pos.i++;
    if (pos.i !== rest.length) {
        throw new Error('restore_luadata: Lua error restore_luadata');
    }
}

/**
 * C ref: nhlua.c restore_luadata `:1344–1363`. JSON analogue of
 * Sfi_unsigned length + Sfi_char then, if !gl.luacore, l_nhcore_init()
 * and luaL_loadstring + nhl_pcall_handle NHLpa_panic. Missing field =
 * old JSON save without this chunk (still init; leave nhcore `{}`).
 * Present empty string = C emptystr. SFCTOOL omitted.
 * @param {{ luadata?: unknown }} payload
 */
export function restore_luadata(payload) {
    // C restgamestate always reads the chunk; unixmain does not init
    // luacore before dorecover, so restore_luadata is the restore-path
    // l_nhcore_init (nhlib shuffle).
    if (!game.luacore) l_nhcore_init();
    const lua_data = payload?.luadata;
    if (lua_data == null) return;
    if (typeof lua_data !== 'string') {
        throw new Error('restore_luadata: Lua error restore_luadata');
    }
    nhl_loadstring_luadata(lua_data);
}

/**
 * C ref: save.c dosave — #save / 'S'.
 * Named omissions: hangup path; sound_exit; overwrite old-save yn.
 */
export async function dosave() {
    game._pending_message = '';
    const ans = await yn_function('Really save?', 'yn', 'n');
    if (ans === 'n') {
        game._pending_message = '';
        if ((game.multi | 0) > 0) {
            const { nomul } = await import('./hack.js');
            nomul(0);
        }
        return ECMD_OK;
    }
    game._pending_message = '';
    // C: pline("Saving..."); display_nhwindow only more()'s if NEED_MORE
    await pline('Saving...');
    if (!dosave0()) {
        await pline('Cannot open save file.');
        await docrt();
        return ECMD_OK;
    }
    if (!game.program_state) game.program_state = {};
    game.program_state.savefile_completed =
        (game.program_state.savefile_completed | 0) + 1;
    // C: u.uhp = -1 — game over indicator; bot no-ops
    if (game.u) game.u.uhp = -1;
    game.program_state.gameover = true;

    // C: exit_nhwindows("Be seeing you...") via settty — clear + raw message
    await exit_nhwindows_save('Be seeing you...');
    nh_terminate_capture();
    return ECMD_OK;
}

/** C ref: wintty.c tty_exit_nhwindows / settty(str) for save farewell. */
async function exit_nhwindows_save(str) {
    const display = game?.nhDisplay;
    // C settty leaves curses — blank screen + raw message, no map/status
    if (display?.clearScreen) display.clearScreen();
    game._pending_message = str || '';
    if (display?.grid && display.setCell) {
        const cols = display.cols || 80;
        const msg = str || '';
        for (let c = 0; c < Math.min(msg.length, cols); c++) {
            display.setCell(c, 0, msg[c], 8, 0);
        }
        // C settty leaves cursor on the next line
        if (display.setCursor) display.setCursor(0, 1);
    }
    // Do not flush_screen — that would redraw the map over the farewell.
}
