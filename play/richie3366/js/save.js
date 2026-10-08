// save.js — Game save / restore via frozen storage VFS (JSON subset).
// C ref: save.c dosave / dosave0 / savelev / savetrapchn / save_msghistory /
//        save_gamelog / save_luadata; restore.c dorecover / getlev
//        trap loop / place_monster / restore_cham / inven_inuse /
//        restore_msghistory / restore_gamelog; nhlua.c
//        restore_luadata / save_luadata; files.c SAVEF; unixmain
//        attempt_restore; allmain welcome(FALSE).
// Level blob codec: js/lev_json.js (shared with bones.js).

import { game } from './gstate.js';
import { set_playmode } from './options.js';
import { getnow, time_from_yyyymmddhhmmss, yyyymmddhhmmss } from './calendar.js';
import { timet_delta } from './allmain.js';
import { vfsReadFile, vfsWriteFile, vfsDeleteFile } from './storage.js';
import { yn_function } from './getline.js';
import { pline, docrt, getmsghistory, putmsghistory, assign_graphics } from './display.js';
import { gamelog_add } from './pline.js';
import { change_luck } from './attrib.js';
import {
    FULL_MOON, OBJ_INVENT, OBJ_CONTAINED, OBJ_FREE, OBJ_MIGRATING,
    ECMD_OK, BUFSZ, VISITED, LFILE_EXISTS, REST_GSTATE, REST_CURRENT_LEVEL,
    W_WEP, W_SWAPWEP, W_QUIVER, PL_NSIZ,
    WRITING, FREEING, NHF_SAVEFILE, Is_rogue_level, ROGUESET,
    TRICKED,
} from './const.js';
import { objects_globals_init, objectNames } from './objects.js';
import { savenames, restnames } from './o_init.js';
import { nh_terminate_capture } from './topten.js';
import { l_nhcore_init, restore_waterlevel } from './mklev.js';
import {
    save_mapseenchn,
    restore_mapseenchn,
    ledger_no,
    maxledgerno,
    save_dungeon_topology,
    restore_dungeon_topology,
    load_exclusions,
} from './dungeon.js';
import { rest_track } from './track.js';
import { open_levelfile, new_nhfile, store_version, FNIDX_HISTORICAL, close_nhfile } from './files.js';
import { done } from './end.js';
import { rest_regions } from './region.js';
import { restore_timers, restore_light_sources, run_timers, dobjsfree } from './mkobj.js';
import { dmonsfree } from './mon.js';
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
import { relink_light_sources } from './light.js';
import { rest_engravings } from './engrave.js';
import { rest_worm } from './worm.js';
import { rest_rooms } from './mkroom.js';
import { adj_erinys, reset_erinys } from './monsters.js';
import { set_uasmon } from './polyself.js';
import {
    reset_oattached_mids,
    restlevchn,
    moves_to_relative_time,
    restlevelstate,
} from './restore.js';

const SAVE_VFS_PREFIX = 'save/';
// C ref: fnamesiz.h UNIX arm — SAVEX `save/99999.e` (sizeof 12),
// SAVE_EXTENSION `""` (sizeof 1); INDEXT `.xxxxxx` (INDSIZE, sizeof 8).
const SAVE_SAVEX_LEN = 'save/99999.e'.length + 1;
const SAVE_EXTENSION_UNIX = '';
const SAVE_INDEXT_LEN = '.xxxxxx'.length + 1;
// C ref: fnamesiz.h:74 — SAVESIZE = PL_NSIZ + sizeof(SAVEX)
// + sizeof(SAVE_EXTENSION) + INDSIZE (53 on the UNIX contest build).
const SAVESIZE = PL_NSIZ + SAVE_SAVEX_LEN + (SAVE_EXTENSION_UNIX.length + 1) + SAVE_INDEXT_LEN;

/**
 * C ref: sys/unix/unixunix.c:297 `regularize` — normalize a file-name
 * suffix: `.`, `/` and ` ` each become `_`. The SYSV 14-character
 * truncation arm (`#if defined(SYSV) && !defined(LINUX) &&
 * !defined(__APPLE__)`) is compiled out on the contest targets
 * (Linux/macOS/Chrome) — named, not ported.
 */
function regularize_save_suffix(s) {
    return String(s).replace(/[. /]/g, '_');
}

/**
 * C ref: files.c:1020–1123 `set_savefile_name` — UNIX contest build, in C
 * order. Builds the save path from `game.plname` (C `svp.plname`) into
 * `game.SAVEF` (C `gs.SAVEF`); the return is a JS convenience (C is void).
 * @param {number} regularize_it C boolean — regularize the name suffix
 * @returns {string} the new `game.SAVEF`
 */
export function set_savefile_name(regularize_it) {
    // C :1022–1025 — `sfindicator`/`postappend` stay null on UNIX (only the
    // VMS arm sets `postappend = ";1"`); the indicator/extension appends
    // below are live null/empty-guarded no-ops keeping C short-circuit.
    let regoffset = 0;
    let overflow = 0;
    let indicator_spot = 0; // 0=no indicator, 1=before ext, 2=after ext
    const postappend = null;
    const sfindicator = null;
    // C :1030–1034 VMS arm (`[.save]%d%s`, regoffset 7, spot 1, `;1`) —
    // compiled out without VMS — named, not ported.
    // C :1036–1053 WIN32 arm (`fname_encode` `%`-quoting via okchars into
    // tmp) — compiled out without WIN32; `fname_encode` has no JS
    // counterpart by design — named, not cloned.
    // C :1054–1057 UNIX arm (contest live).
    const plname = String(game.plname || 'Hero');
    // C :1055 `Sprintf(gs.SAVEF, "save/%d%s", (int) getuid(), svp.plname)` —
    // contest adaptation (Rule #2): no POSIX uid in dual-runtime ESM and the
    // VFS is single-user, so the uid digits are folded out and the path stays
    // `save/<plname>` as before. Named in the map.
    let SAVEF = `${SAVE_VFS_PREFIX}${plname}`;
    regoffset = 5; // C :1056
    indicator_spot = 2; // C :1057
    // C :1059–1064 MSDOS arm (SAVEP + plname strncat) — compiled out — named.
    // C :1065–1085 MICRO/AMIGA arm (SAVEP + 8-char/`bbs_id` truncation,
    // regoffset = strlen(SAVEP)) — compiled out — named.
    // C :1086–1087 — regularize the suffix only; regoffset skips `save/`,
    // which itself contains a `/` that must survive.
    if (regularize_it) {
        SAVEF = SAVEF.slice(0, regoffset) + regularize_save_suffix(SAVEF.slice(regoffset));
    }
    // C :1088–1093 indicator spot 1 — `sfindicator` is null on UNIX: live
    // guard, never fires, `overflow` stays 0.
    if (indicator_spot === 1 && sfindicator && !overflow) {
        if (SAVEF.length + sfindicator.length < SAVESIZE - 1) SAVEF += sfindicator;
        else overflow = 2;
    }
    // C :1094–1104 SAVE_EXTENSION arm — `#ifdef SAVE_EXTENSION` is live, but
    // the UNIX extension is `""`, so `strlen("") > 0` is false: live no-op
    // (the `(0)` bracket keeps the `&& !overflow` explicit dead code, as in C).
    if (SAVE_EXTENSION_UNIX.length > 0 && !overflow) {
        if (SAVEF.length + SAVE_EXTENSION_UNIX.length < SAVESIZE - 1) {
            SAVEF += SAVE_EXTENSION_UNIX;
        } else overflow = 3;
    }
    // C :1105–1108 indicator spot 2 — `sfindicator` null: live guard, never fires.
    if (indicator_spot === 2 && sfindicator && !overflow) {
        if (SAVEF.length + sfindicator.length < SAVESIZE - 1) SAVEF += sfindicator;
        else overflow = 4;
    }
    // C :1109–1115 postappend — null on UNIX: live guard, never fires.
    if (postappend && !overflow) {
        if (SAVEF.length + postappend.length < SAVESIZE - 1) SAVEF += postappend;
        else overflow = 5;
    }
    // C :1116–1122 overflow `impossible("set_savefile_name() couldn't
    // complete without overflow %d")` — inside `#if (NH_DEVEL_STATUS !=
    // NH_STATUS_RELEASED)`; the contest pins RELEASED (patchlevel.h:33), so
    // the arm is compiled out — named, not ported (also avoids the async
    // display edge).
    game.SAVEF = SAVEF;
    return game.SAVEF;
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
        /* C save.c:201 — onhfp = open_levelfile(ltmp, whynot): the gate
           above is the open() probe (stash ⟺ flag, so the handle is
           non-null here); getlev/savelev read the stash below. The !onhfp
           HUP/tricked arm (pline1/delete_savefile/done-TRICKED) is named
           in c-js-map/data.md — no HUP signals or pline1 in JS. */
        const onhfp = open_levelfile(ltmp, null);
        levels[String(ltmp)] = serLevel(info);
        close_nhfile(onhfp); // C save.c:211 — after getlev (non-null here per the gate above)
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
 * C ref: save.c save_adjust_levelflags `:570–574` (staticfn → exported:
 * sole C caller savelev `:520`, paired with rest_adjust_levelflags `:522`
 * around the Sfo_levelflags write).
 * C: moves_to_relative_time(&svl.level.flags.stasis_until) — relativize
 * before the write so the wire holds moves-relative time. Whole 1-line
 * body, live below. The C call site is a named wire-format omission, not
 * wired: lev_json.js serLevel `:800` spreads lvl.flags verbatim (absolute
 * stasis_until), so there is no relativize step and no `:522` post-write
 * restore (rest_adjust_levelflags js/restore.js named pair; review 364
 * "Named difference of save format", review 2326).
 */
export function save_adjust_levelflags() {
    moves_to_relative_time(game.level && game.level.flags, 'stasis_until'); // C `:573`
}

/**
 * C ref: save.c savelevchn `:974–994` — special-level chain.
 * Walk svs.sp_levchn (JS: game.sp_levchn array, dungeon.js add_level keeps
 * C's (dnum, dlevel) insertion order): the count under update_file (C
 * `:979–982` Sfo_int lev_count) is the JSON array length; each node under
 * update_file (C `:984–990` Sfo_s_level — a raw s_level struct write,
 * dungeon.h:25–32 via sfstruct.c SFO_CBODY) emits its meaningful fields.
 * The `next` pointer is binary-only (array order is chain order; C
 * restlevchn appends back in order). C memset-zeroes the struct and sets
 * only the five level bits (dungeon.c:577–588); `unconnected` is a
 * dungeon-level bit, never set on s_level — not emitted. The release_data
 * arm (C `:984`, `:992–993`: free each node, null the head) is named, not
 * ported: JSON persist never frees the live chain (savefruitchn precedent,
 * js/bones.js:339). Callers: savegamestate `:315` → dosave0 `sp_levchn`
 * below; free_dungeons `:1065` (FREE_ALL_MEMORY-only) has no JS analogue.
 * @returns {object[]}
 */
export function savelevchn() {
    const out = [];
    for (const tmplev of game.sp_levchn || []) {
        if (!tmplev) continue;
        const flags = tmplev.flags || {};
        let boneid = tmplev.boneid;
        if (typeof boneid === 'number') boneid = String.fromCharCode(boneid);
        out.push({
            dlevel: {
                dnum: tmplev.dlevel?.dnum | 0,
                dlevel: tmplev.dlevel?.dlevel | 0,
            },
            proto: String(tmplev.proto || ''),
            boneid: String(boneid || ''),
            rndlevs: tmplev.rndlevs | 0,
            flags: {
                town: !!flags.town,
                hellish: !!flags.hellish,
                maze_like: !!flags.maze_like,
                rogue_like: !!flags.rogue_like,
                align: flags.align | 0,
            },
        });
    }
    return out;
}

/**
 * C ref: save.c tricked_fileremoved `:336–347` — vanished-file guard shared
 * by savestateinlock `:377` and goto_level (do.c `:1705`).
 * `!nhfp` (C `:339`): pline1(whynot) — pline1 renders as pline (apply.js
 * precedent) — then pline "Probably someone removed it." (C `:341`),
 * Strcpy svk.killer.name (C `:342`; game.killer, end.js shape) and
 * done(TRICKED) (C `:343`; async, awaited), returning TRUE (C `:344`).
 * Non-null handle returns FALSE (C `:346`). Callers: do.c:1705 →
 * js/do.js goto_level stash arm (wired); save.c:377 → savestateinlock
 * (INSURANCE-only, unported — ships with that function).
 * @param {object|null} nhfp open_levelfile handle or null
 * @param {string} whynot C `char *whynot` message text
 * @returns {Promise<boolean>}
 */
export async function tricked_fileremoved(nhfp, whynot) {
    if (!nhfp) {
        await pline(String(whynot ?? '')); // C `:340` pline1(whynot)
        await pline('Probably someone removed it.'); // C `:341`
        if (!game.killer) game.killer = { name: '', format: 0 }; // C `:342`
        game.killer.name = String(whynot ?? '');
        await done(TRICKED); // C `:343`
        return true; // C `:344`
    }
    return false; // C `:346`
}

/**
 * C ref: save.c save_bc `:696–721` — dangling ball & chain (the swallowed
 * case: on floor or in invent they ride with fobj/invent instead).
 * gl.loosechain/gl.looseball (decl.h:563–564) were snapshotted by the
 * caller — dosave0 `:166–167`, BALL_IN_MON/CHAIN_IN_MON (`u.uswallow` +
 * OBJ_FREE, hack.h:1412–1413) — because savelev may already have freed
 * the floor/invent pointers. Chain first, then ball (C `:704–714`), so
 * ball is the head; saveobjchn (JS: serObjChain, lev_json.js) emits
 * ball, chain. The nobj surgery is C-literal (both nodes are OBJ_FREE,
 * in no live chain). The FREEING arms (C `:707–710`, `:715–718`:
 * setworn(0, W_CHAIN/W_BALL), clear loose) are named, not ported: JSON
 * persist never unwears live ball/chain (savefruitchn precedent).
 * Caller: savegamestate `:304` → dosave0 `bc_objs` below.
 * @returns {object[]}
 */
export function save_bc() {
    const gl = game.gl || {};
    let bc_objs = null;
    if (gl.loosechain) {
        gl.loosechain.nobj = bc_objs; /* uchain */
        bc_objs = gl.loosechain;
    }
    if (gl.looseball) {
        gl.looseball.nobj = bc_objs;
        bc_objs = gl.looseball;
    }
    return serObjChain(bc_objs);
}

/**
 * C ref: save.c dosave0 — write current game to VFS (JSON subset of savelev).
 * Named omissions: binary NHFILE format; hangup arms; overwrite yn;
 * compress (+nh_sfconvert pair at :224 — ships with that arm; :119 rides
 * the HUP/overwrite arms); uid/nhuuid/wreserve.
 * mapseenchn cemetery JSON is save_dungeon/save_mapseen (D-1685);
 * current-level bonesinfo is savelev savecemetery.
 * save_bc loose ball when swallowed + savelevchn ride the payload
 * below; their restores are restgamestate's bc walk (restore.c:659–669)
 * and restlevchn (restore.c:130–150) — separate functions, own rows.
 */
export async function dosave0() {
    // C save.c:98 dosave0 — hangup/panic save fix-up: in-use item used
    // up, thrown/kicked missiles and limbo ball&chain onto the map
    // before persisting (end.c done_object_cleanup; imports.mjs
    // save→end is CHECK, so lazy dynamic import like end.js:995).
    // The `:80–96` preamble (saving++, notice_mon_off, uinvulnerable=0,
    // save_uswallow/uinwater/uburied restores) stays unported — own rows.
    const { done_object_cleanup, save_killers } = await import('./end.js');
    await done_object_cleanup();
    const u = game.u || {};
    // C save.c savemonchn `:904–907` — stamp m_id from live pointers.
    u.usteed_mid = (u.usteed && (u.usteed.m_id | 0)) ? (u.usteed.m_id | 0) : 0;
    u.ustuck_mid = (u.ustuck && (u.ustuck.m_id | 0)) ? (u.ustuck.m_id | 0) : 0;
    // C: undo date-dependent luck before persisting
    if (game.flags?.moonphase === FULL_MOON) change_luck(-1);
    if (game.flags?.friday13) change_luck(1);

    // C save.c:487–491 — savelev preamble (mode != FREEING): dmonsfree
    // when dead monsters are still pending, then dobjsfree.
    if (game.iflags?.purge_monsters) await dmonsfree();
    dobjsfree();

    // C files.c analogue — SAVEF preset (regularized, TRUE) before the save write.
    set_savefile_name(1);
    const path = game.SAVEF;
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
    // C save.c savegamestate `:282–284, :289–292` — fold the pending delta
    // into realtime, persist realtime + start_timing, then refresh the
    // live start to now for the next update.
    const nowSave = getnow();
    if (!game.urealtime) {
        game.urealtime = { realtime: 0, start_timing: nowSave, finish_time: 0 };
    }
    game.urealtime.finish_time = nowSave;
    game.urealtime.realtime = (game.urealtime.realtime | 0)
        + timet_delta(nowSave, game.urealtime.start_timing | 0);
    const savedStartTiming = game.urealtime.start_timing | 0;
    game.urealtime.start_timing = nowSave;
    // C save.c:156–157 — create_savefile set structlevel / historical /
    // WRITING; dosave0 ORs FREEING, then store_version. creat /
    // viable_nhfile stay named (no POSIX creat). The handle fields
    // store_version reads are set here. Schema key stays `version: 1`;
    // the C header is `version_header`.
    const nhfp = new_nhfile();
    nhfp.ftype = NHF_SAVEFILE;
    nhfp.mode = WRITING | FREEING;
    nhfp.structlevel = true;
    nhfp.fieldlevel = false;
    nhfp.addinfo = false;
    nhfp.style.deflt = false;
    nhfp.style.binary = true;
    nhfp.fnidx = FNIDX_HISTORICAL;
    nhfp.fd = 0;
    store_version(nhfp);
    // C save.c:325 savenames(nhfp) — bases/disco/objclass/uname chunk.
    const names = savenames();
    // C save.c:166–167 dosave0 — snapshot dangling ball/chain before
    // savelev (which frees floor/invent pointers when FREEING), so
    // save_bc can persist them separately. BALL_IN_MON/CHAIN_IN_MON:
    // u.uswallow + OBJ_FREE (hack.h:1412–1413); decl.h:563–564 home.
    if (!game.gl) game.gl = {};
    game.gl.looseball = (u.uswallow && u.uball && u.uball.where === OBJ_FREE)
        ? u.uball : null;
    game.gl.loosechain = (u.uswallow && u.uchain && u.uchain.where === OBJ_FREE)
        ? u.uchain : null;
    const payload = {
        version: 1,
        version_header: nhfp.sf || null,
        plname: game.plname,
        u: serHero(u),
        invent: serInventArray(game.invent),
        // C save.c:304 save_bc(nhfp) — after invent, before migrating.
        bc_objs: save_bc(),
        objects: names.objects,
        bases: names.bases,
        oclass_prob_totals: game.oclass_prob_totals
            ? [...game.oclass_prob_totals] : null,
        disco: names.disco,
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
        // C save.c:315 savelevchn(nhfp) — after save_dungeon, before
        // quest_status.
        sp_levchn: savelevchn(),
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
        // C save.c `:293` save_killers delayed-killer chain (sentinel first).
        killers: save_killers(),
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
        // C include/decl.h:536 — gl.lastinvnr «never saved&restored»;
        // savegamestate omits it, so the JSON payload does too (D-3584).
        datetime_saved: game.datetime || null,
        // C save.c `:288` — Sfo_char(yyyymmddhhmmss(ubirthday), 14).
        ubirthday: yyyymmddhhmmss(Math.trunc(Number(game.ubirthday) || 0)),
        // C save.c savegamestate `:289–290` — realtime + the 14-char
        // start_timing stamp. Restore parses the stamp, then replaces
        // it with getnow() (restore.c:622–625).
        urealtime: {
            realtime: game.urealtime.realtime | 0,
            start_timing: savedStartTiming,
            start_timing_stamp: yyyymmddhhmmss(Math.trunc(Number(savedStartTiming) || 0)),
        },
        uz: u.uz ? { ...u.uz } : { dnum: 0, dlevel: 1 },
        // C save.c save_msghistory `:1029–1056` after savenames;
        // save_gamelog `:236–262` after save_msghistory;
        // save_luadata nhlua.c `:1327–1341` after save_gamelog.
        msghistory: save_msghistory(),
        gamelog: save_gamelog(),
        luadata: save_luadata(),
    };

    close_nhfile(nhfp); // C save.c:216 — handle drained after the level writes
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
 * C ref: restore.c inven_inuse `:112–125` — objects marked in_use get
 * used up (dorecover after invent + level exist; end.c
 * done_object_cleanup `:854` with TRUE before disclosure/bones).
 * Exported for the end.c caller (imports.mjs: save→end is CHECK, so
 * end.js loads it lazily via dynamic import, same as its allmain.js
 * edge); dorecover below is the direct caller.
 * @param {boolean} quietly
 */
export async function inven_inuse(quietly) {
    // C restore.c `:121` useup lives in invent.c — eat.js only imports
    // it (never re-exports), so the old './eat.js' source gave
    // `useup is not a function` whenever an in_use item existed.
    const { useup } = await import('./invent.js');
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
    // C files.c:1276 restore_saved_game `set_savefile_name(TRUE)` before fqname(SAVEF).
    set_savefile_name(1);
    const path = game.SAVEF;
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

    // C restore.c dorecover `:794–795` — "suppress map display if some
    // part of the code tries to update that": restoring = REST_GSTATE at
    // entry, covering getlev(0) + restgamestate. JSON has one hydration
    // pass instead of C's three (REST_GSTATE → REST_LEVELS →
    // REST_CURRENT_LEVEL), so this stays until the REST_CURRENT_LEVEL
    // envelope below, cleared like C's `:944` clear before docrt. Gates
    // suppress_map_output (display.js) so restore-time newsym/see_monsters
    // paints draw no display RNG — without it a Hallu restore desyncs the
    // monster glyphs (scen-trap-Wizard-94001 seg1 step 0).
    if (!game.program_state) game.program_state = {};
    game.program_state.restoring = REST_GSTATE;

    objects_globals_init();
    // C restore.c:719 restnames(nhfp) — bases/disco/objclass/uname chunk.
    restnames(payload);
    if (payload.oclass_prob_totals) {
        game.oclass_prob_totals = payload.oclass_prob_totals;
    }

    game.plname = payload.plname || game.plname;
    // C restore.c:587–595 — a startup wizard request overrides saved modes;
    // saved special modes must pass authorization again. Explore requested
    // for a normal save stays deferred until the save has been removed.
    const newgameflags = game.flags || {};
    game.flags = { ...newgameflags, ...(payload.flags || {}) };
    const restoredWizard = !!(game.flags.debug || game.flags.wizard);
    const restoredExplore = !!(game.flags.explore || game.flags.discover);
    game.iflags.deferred_X = !!(newgameflags.explore && !restoredExplore);
    game.wizard = restoredWizard;
    game.discover = restoredExplore;
    if (newgameflags.debug) {
        game.flags.debug = game.flags.wizard = game.wizard = true;
        game.flags.explore = game.flags.discover = game.discover = false;
        game.iflags.deferred_X = false;
    } else if (restoredWizard || restoredExplore) {
        set_playmode();
    }
    // C restore.c:596 — role_init() re-derivation runs even on restore.
    // Its only surviving effect is the RNG burn (ldrgend/nemgend and any
    // selection draws); urole/urace/quest_status/flags are overwritten
    // from the payload below, like C's Sfi. pantheon is saved/restored:
    // C sees the launch -1 here, then Sfi overwrites the selection.
    // (game.plname already holds the save name, so plnamesuffix never
    // prompts; idempotent for dashless names like C's launch parse.)
    const savedPantheon = game.flags.pantheon;
    game.flags.pantheon = -1;
    const { role_init } = await import('./roles.js');
    await role_init();
    game.flags.pantheon = savedPantheon;
    // C: iflags (perm_invent, graphics) stay from nethackrc; not in save.
    game.context = { ...(payload.context || {}) };
    game.moves = payload.moves | 0;
    game.multi = payload.multi | 0;
    // C restore.c `:618–625` — realtime from the save; start_timing is the
    // saved value, then current time for the next realtime update.
    if (payload.urealtime) {
        game.urealtime = {
            realtime: payload.urealtime.realtime | 0,
            start_timing: payload.urealtime.start_timing | 0,
            finish_time: 0,
        };
    }
    if (!game.urealtime) {
        game.urealtime = { realtime: 0, start_timing: 0, finish_time: 0 };
    }
    // C restore.c `:615–617` — ubirthday from the 14-char stamp.
    // Old saves without the key keep the pre-restore value.
    if (typeof payload.ubirthday === 'string') {
        game.ubirthday = time_from_yyyymmddhhmmss(payload.ubirthday);
    }
    // C restore.c `:619–625` — parse start_timing, then current time
    // is what the next realtime update uses.
    if (typeof payload.urealtime?.start_timing_stamp === 'string') {
        game.urealtime.start_timing = time_from_yyyymmddhhmmss(
            payload.urealtime.start_timing_stamp,
        );
    }
    game.urealtime.start_timing = getnow();
    game.urole = payload.urole;
    game.urace = payload.urace;
    game.mvitals = payload.mvitals || [];
    // C restore.c restgamestate `:680–684` — "things after this can have
    // unintended display side-effects too early in the game": disable
    // see_monsters here (gate at display.js:see_monsters), re-enabled at
    // the top of moveloop (C allmain.c:92–94; preamble catch-up at
    // js/allmain.js:326–329). Sits after mvitals `:676–678` like C,
    // before the worn loop (restWornFromInvent below, C `:687–690`).
    game.defer_see_monsters = true;
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
    // C restore.c restgamestate `:703` restlevchn(nhfp) — after
    // restore_dungeon, before quest_status `:706`. Ungated like C: a
    // missing key (pre-chain saves) restores an empty chain.
    restlevchn(payload.sp_levchn);
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
    // C include/decl.h:536 — gl.lastinvnr «never saved&restored»:
    // early_init runs decl_globals_init (allmain.c:40) before dorecover
    // (unixmain.c:66 vs :263), so a fresh C process restores with the
    // g_init_l value 51 (decl.c «lastinvr») and restgamestate leaves it
    // — the next assigninvlet tries 'a' first (nhlua.c «next inv letter
    // to try to use will be 'a'»). D-3584's BSS-0 guess is falsified by
    // scen-quest-Knight-94336 (C «a - a saddle.» with 'a' free; from 0
    // the scan starts at 'b'). Ignore any legacy payload key.
    game._lastinvnr = 51;
    if (payload.timer_id != null) game.timer_id = payload.timer_id | 0;
    if (payload.quest_status) game.quest_status = payload.quest_status;
    if (payload.pl_fruit != null) game.pl_fruit = payload.pl_fruit;
    loadFruitchn(payload.ffruit);
    restore_artifacts(payload.artidisco);
    // C restore.c `:712` restore_oracles (flg=1 when cnt nonzero; old
    // saves without the key keep the fresh-boot flg 0 → init_oracles).
    restore_oracles(payload.oracles);
    // C restore.c `:653` restore_killers (old saves without the key keep
    // the fresh-boot sentinel; save→end is lazy like dosave0 above).
    const { restore_killers } = await import('./end.js');
    restore_killers(payload.killers);

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

    // C restore.c dorecover `:827` restlevelstate() — after restgamestate
    // + init_oclass_probs, before the restlevelfile loop. Empty body in C
    // (`:744–748`); wired to keep the dorecover sequence complete.
    restlevelstate();
    // C restore.c restlevelfile others then getlev current. JSON hydrates
    // others into level_info without tearing down the live map (no FREEING).
    // Missing `levels` = old save, current-only (seed0013).
    restoreOtherLedgers(payload);
    restampOtherLedgerOmoves(ledger_no(u.uz));

    // C restore.c getlev current. Missing `current` = old scattered keys.
    const info = deserLevel(levelBlobFromPayload(payload));
    game.level = info.level;
    // C restore.c:1132 getlev → rest_rooms (mkroom.c:892–906): rebuild
    // live rooms from the records (subrooms re-linked positionally,
    // residents nulled — re-linked from fmon below, restore.c:1181–1184).
    rest_rooms({ nroom: info.level.nroom, rooms: info.level.rooms });
    game.fmon = info.fmon;
    game.fobj = info.fobj;
    game.billobjs = info.billobjs;
    game.ftrap = info.level.traps;
    game.head_engr = rest_engravings(info.head_engr); // C restore.c:1174 getlev.
    rest_worm(info.worm_data); // C restore.c:1147 getlev → rest_worm.
    game.stairs = info.stairs;
    game.lastseentyp = info.lastseentyp;
    // C restore.c getlev `:1225` rest_regions — rebuild live regions from
    // the save (ttl rebased on elapsed moves, expired dropped); save-file
    // restore is never ghostly (ghostly ⇔ bones → getlev_bones, D-2639).
    rest_regions(info.regions || [], (game.moves | 0) - (info.omoves | 0), false);
    if (info.updest) game.updest = { ...info.updest };
    if (info.dndest) game.dndest = { ...info.dndest };
    // C restore.c rest_bubbles after rest_regions
    if (info.waterlevel) restore_waterlevel(info.waterlevel);
    // C restore.c getlev `:1227` load_exclusions — after rest_bubbles.
    // Old saves without the key install an empty list.
    load_exclusions(info.exclusion_zones);
    // C restore.c dorecover → restore_dungeon mapseen_count +
    // load_mapseen (dungeon.c :251–262 / :2752). After branches.
    restore_mapseenchn(payload);
    rebuildObjectsAt(info.fobj);
    // C restore.c dorecover `:900` restlevelstate() — after the final
    // getlev of the current level, before something_worth_saving (`:901`)
    // and the Rogue-graphics arm below (`:905`). Empty body in C
    // (`:744–748`); wired to keep the dorecover sequence complete.
    restlevelstate();
    // C restore.c restgamestate `:905–906` — a Rogue-level save restores
    // Rogue graphics (before the `:910+` ball&chain walk below).
    if (Is_rogue_level(game.u?.uz)) assign_graphics(ROGUESET);

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
    // C restore.c restgamestate `:726` relink_light_sources(FALSE) in C
    // order: every entry not still flagged LSF_NEEDS_FIXUP is skipped
    // exactly like C `:539` (the blob relinker above already linked the
    // globals, so this is a flag-gated guard today).
    relink_light_sources(false);

    // C restore.c restgamestate `:727` adj_erinys(u.ualign.abuse) in C
    // order, right after relink_light_sources. C runs in a fresh process
    // (mons[] at baseline); JS reuses the module, so reset first
    // (allmain.js newgame precedent) then re-apply the restored abuse.
    reset_erinys();
    adj_erinys(game.u?.ualign?.abuse ?? 0);

    // C getlev rest_track / restore_timers / restore_light_sources
    // for the current ledger only (M2: other ledgers stay on stash).
    if (info.track) rest_track(info.track);
    restore_timers(info.timers);
    restore_light_sources(info.lights);
    // C restore.c getlev `:1300` relink_light_sources(ghostly) in C order.
    // Save-file restore is never ghostly (ghostly ⇔ bones → getlev_bones,
    // which never installs lights — named omission); level entries arrive
    // already linked by relinkLevelTimersLights, so flag-gated skip.
    relink_light_sources(false);
    // C restore.c getlev `:1301` reset_oattached_mids(ghostly) in C order,
    // right after relink. Never ghostly here, so a no-op walk of
    // game.fobj (both C arms are ghostly-gated); wired to keep the
    // getlev tail complete.
    reset_oattached_mids(false);

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
    // C restore.c:604 youmonst.cham = u.mcham, then :627 set_uasmon()
    // while program_state.restoring is already nonzero (dorecover sets
    // REST_GSTATE before restgamestate), so float_vs_flight is skipped.
    // A reused JS youmonst.data would prorate umovement; C's fresh
    // youmonst.data is null, so old_speed is 0.
    if (!game.youmonst) game.youmonst = {};
    game.youmonst.data = null;
    game.youmonst.cham = (u.mcham ?? 0) | 0;
    set_uasmon();
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

    // C restore.c:903-904 — a normal-mode restore deletes the save here;
    // wizard/discover deletion is the unixmain keep-savefile prompt's 'n'
    // arm (jsmain.js restore sequence), so the save stays until answered.
    if (!game.wizard && !game.discover) {
        vfsDeleteFile(vfsPath(path));
    }
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
    if (!(await dosave0())) {
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
