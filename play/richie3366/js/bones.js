// bones.js — Bones file I/O via frozen storage VFS (partial).
// C ref: bones.c savebones / getbones; files.c set_bonesfile_name /
// open_bonesfile / delete_bonesfile; restore.c restmonchn / restobjchn
// ghostly next_ident remapping.

import { game } from './gstate.js';
import { vfsReadFile, vfsWriteFile, vfsDeleteFile } from './storage.js';
import { next_ident } from './mkobj.js';
import { mons } from './monsters.js';
import { GameMap } from './game.js';
import { OBJ_FLOOR, OBJ_MINVENT, OBJ_BURIED } from './const.js';
import { peace_minded, set_malign } from './makemon.js';
import { save_track, rest_track } from './track.js';
import { yn_function } from './getline.js';
import { paint_gbuf_level_to_terminal } from './display.js';
import { vision_off_newsym_gbuf } from './vision.js';

const BONES_VFS_PREFIX = 'bones/';

/**
 * C ref: files.c set_bonesfile_name — "bon" + dungeon boneid + "0" + "." + dlevel.
 * Named omissions: bones_pools digit; quest filecode; Is_special boneid letter.
 */
export function set_bonesfile_name(lev) {
    const dnum = lev?.dnum | 0;
    const dlevel = lev?.dlevel | 0;
    const dun = game.dungeons?.[dnum];
    let boneid = dun?.boneid;
    if (typeof boneid === 'number') boneid = String.fromCharCode(boneid);
    if (!boneid || boneid === '\0') boneid = 'D';
    const bonesid = `${boneid}0.${dlevel}`;
    return { filename: `bon${bonesid}`, bonesid };
}

function vfsPath(filename) {
    return BONES_VFS_PREFIX + filename;
}

/** C ref: files.c open_bonesfile existence probe (no NHFILE). */
export function bones_file_exists(lev) {
    const { filename } = set_bonesfile_name(lev);
    return vfsReadFile(vfsPath(filename)) != null;
}

/** C ref: files.c delete_bonesfile — VFS unlink. */
export function delete_bonesfile(lev) {
    const { filename } = set_bonesfile_name(lev);
    return vfsDeleteFile(vfsPath(filename));
}

/** Serialize one object; cobj as nobj-order array. Drop back-pointers. */
function serObj(otmp) {
    if (!otmp) return null;
    const out = {};
    for (const k of Object.keys(otmp)) {
        if (k === 'nobj' || k === 'nexthere' || k === 'ocarry'
            || k === 'ocontainer' || k === 'cobj' || k === 'v') {
            continue;
        }
        const v = otmp[k];
        if (v != null && typeof v === 'object') {
            // skip non-plain / live graph blobs
            if (k === 'oextra') {
                try {
                    out[k] = JSON.parse(JSON.stringify(v));
                } catch {
                    /* omit */
                }
            }
            continue;
        }
        out[k] = v;
    }
    out.cobj = serObjChain(otmp.cobj);
    return out;
}

function serObjChain(head) {
    const arr = [];
    for (let o = head; o; o = o.nobj) arr.push(serObj(o));
    return arr;
}

function serMon(mtmp) {
    if (!mtmp) return null;
    const out = {};
    for (const k of Object.keys(mtmp)) {
        // Skip live graph / derived; mtrack is serialized explicitly below
        // (C savemon writes full struct monst including mtrack[MTSZ]).
        if (k === 'nmon' || k === 'data' || k === 'minvent' || k === 'mtrack') {
            continue;
        }
        const v = mtmp[k];
        if (v != null && typeof v === 'object') {
            if (k === 'mextra') {
                try {
                    out[k] = JSON.parse(JSON.stringify(v, (_key, val) => {
                        if (val && typeof val === 'object'
                            && (val.mnum != null || val.mx != null)) {
                            return undefined; // drop back-refs to monst
                        }
                        return val;
                    }));
                } catch {
                    /* omit */
                }
            }
            continue;
        }
        out[k] = v;
    }
    // C ref: monst.h mtrack[MTSZ]; save.c savemon / restore.c restmon
    out.mtrack = [];
    for (let j = 0; j < 4; j++) {
        const c = mtmp.mtrack?.[j];
        out.mtrack.push({ x: c?.x | 0, y: c?.y | 0 });
    }
    out.minvent = serObjChain(mtmp.minvent);
    return out;
}

/**
 * C ref: bones.c savebones create_bonesfile + savelev subset.
 * Persists current level after ghost envelope for cross-segment getbones.
 */
export function write_bonesfile(lev) {
    const { filename, bonesid } = set_bonesfile_name(lev);
    // C: open_bonesfile miss required — do not replace existing
    if (vfsReadFile(vfsPath(filename)) != null) return false;

    const lvl = game.level;
    const locations = [];
    if (lvl?.locations) {
        for (let x = 0; x < lvl.locations.length; x++) {
            // C bones.c savebones — clear seenv/waslit/glyph before save
            locations[x] = (lvl.locations[x] || []).map((cell) => {
                if (!cell) return null;
                const out = { ...cell };
                out.seenv = 0;
                out.waslit = false;
                out.remembered_glyph = undefined;
                out.disp_ch = ' ';
                out.disp_color = 8; // NO_COLOR
                out.disp_decgfx = false;
                out.disp_attr = 0;
                out.gnew = 0;
                out.glyph_symidx = -1;
                return out;
            });
        }
    }
    // C: svl.lastseentyp[x][y] = 0
    if (game.lastseentyp) game.lastseentyp = null;

    const fmon = [];
    for (const m of game.fmon || []) {
        // C ref: bones.c savebones — pets lose tame/peaceful for next hero
        if (m.mtame) {
            m.mtame = 0;
            m.mpeaceful = 0;
        }
        fmon.push(serMon(m));
    }
    // migrating_mons are off-level (mx==0); C savelev does not include them.

    const payload = {
        version: 1,
        bonesid,
        dnum: lev?.dnum | 0,
        dlevel: lev?.dlevel | 0,
        locations,
        rooms: lvl?.rooms ? JSON.parse(JSON.stringify(lvl.rooms)) : [],
        nroom: lvl?.nroom | 0,
        doors: lvl?.doors ? JSON.parse(JSON.stringify(lvl.doors)) : [],
        doorindex: lvl?.doorindex | 0,
        flags: lvl?.flags ? { ...lvl.flags } : {},
        fmon,
        fobj: serObjChain(game.fobj),
        buriedobjlist: Array.isArray(lvl?.buriedobjlist)
            ? (lvl.buriedobjlist || []).map((o) => serObj(o))
            : serObjChain(lvl?.buriedobjlist),
        billobjs: serObjChain(game.billobjs),
        ftrap: (game.ftrap || lvl?.traps || []).map((t) => ({ ...t })),
        head_engr: game.head_engr
            ? JSON.parse(JSON.stringify(game.head_engr))
            : null,
        stairs: game.stairs
            ? JSON.parse(JSON.stringify(game.stairs))
            : null,
        upstair: lvl?.upstair ? { ...lvl.upstair } : null,
        dnstair: lvl?.dnstair ? { ...lvl.dnstair } : null,
        // C: savecemetery / level.bonesinfo — who[] for bones_include_name
        bonesinfo: serCemetery(lvl?.bonesinfo),
        // C ref: save.c savelev → save_track; restore.c getlev → rest_track.
        // Dead hero's utrack (often on/near the grave) must persist so
        // hostile can_track monsters gettrack() after getbones.
        track: save_track(),
    };

    return vfsWriteFile(vfsPath(filename), JSON.stringify(payload));
}

/** C ref: bones.c cemetery chain → JSON list (newest first). */
function serCemetery(head) {
    const out = [];
    for (let bp = head; bp; bp = bp.next) {
        out.push({
            who: String(bp.who || ''),
            how: String(bp.how || ''),
            when: String(bp.when || ''),
            frpx: bp.frpx | 0,
            frpy: bp.frpy | 0,
            bonesknown: !!bp.bonesknown,
        });
    }
    return out;
}

/** C ref: restore restcemetery — JSON list → linked cemetery. */
function deserCemetery(arr) {
    let head = null;
    let prev = null;
    for (const raw of arr || []) {
        if (!raw) continue;
        const bp = {
            who: String(raw.who || ''),
            how: String(raw.how || ''),
            when: String(raw.when || ''),
            frpx: raw.frpx | 0,
            frpy: raw.frpy | 0,
            bonesknown: !!raw.bonesknown,
            next: null,
        };
        if (!head) head = bp;
        else prev.next = bp;
        prev = bp;
    }
    return head;
}

/**
 * C ref: bones.c bones_include_name — cemetery who[] prefix "name-".
 * @param {string} name
 * @returns {boolean}
 */
export function bones_include_name(name) {
    const buf = `${name || ''}-`;
    const len = buf.length;
    for (let bp = game.level?.bonesinfo; bp; bp = bp.next) {
        const who = String(bp.who || '');
        if (who.length >= len && who.slice(0, len) === buf) return true;
    }
    return false;
}

function deserObjChain(arr, where) {
    let head = null;
    let prev = null;
    for (const raw of arr || []) {
        if (!raw) continue;
        const otmp = { ...raw };
        const kids = otmp.cobj;
        delete otmp.cobj;
        otmp.nobj = null;
        otmp.nexthere = null;
        otmp.ocarry = null;
        otmp.ocontainer = null;
        otmp.where = where;
        otmp.cobj = deserObjChain(kids, where);
        if (otmp.cobj) {
            for (let c = otmp.cobj; c; c = c.nobj) c.ocontainer = otmp;
        }
        if (!head) head = otmp;
        else prev.nobj = otmp;
        prev = otmp;
    }
    return head;
}

/**
 * C ref: restore.c restobjchn ghostly — next_ident per object, parent before cobj.
 */
function remapObjChainIds(head) {
    for (let otmp = head; otmp; otmp = otmp.nobj) {
        otmp.o_id = next_ident();
        if (otmp.cobj) remapObjChainIds(otmp.cobj);
    }
}

/**
 * C ref: restore.c restmonchn ghostly — next_ident per mon, then minvent objs.
 */
function remapMonChainIds(monsList) {
    for (const mtmp of monsList) {
        mtmp.m_id = next_ident();
        remapObjChainIds(mtmp.minvent);
    }
}

function rebuildObjectsAt(fobj) {
    game._objects_at = new Map();
    // Walk oldest→newest so top-of-pile matches C nexthere head = newest
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
 * C ref: bones.c getbones open + getlev + ghostly id remap + delete.
 * Wizard Get bones? / Unlink bones? via y_n (D-0581).
 * @returns {Promise<boolean>} true if bones loaded (mklev should return).
 */
export async function try_load_bones(lev) {
    const { filename, bonesid } = set_bonesfile_name(lev);
    const raw = vfsReadFile(vfsPath(filename));
    if (raw == null) return false;

    let payload;
    try {
        payload = JSON.parse(raw);
    } catch {
        vfsDeleteFile(vfsPath(filename));
        return false;
    }
    if (!payload || payload.bonesid !== bonesid) {
        // C: trickery / abandon — treat as miss for non-wizard
        vfsDeleteFile(vfsPath(filename));
        return false;
    }

    const flags = game.flags || {};
    const wizard = !!(flags.wizard || flags.debug);
    // Keep stale terminal map through Get/Unlink yn like C gbuf (display
    // redraw waits until goto_level flush_screen(-1) / docrt).
    // C: vision_recalc(2) newsyms leave-level into gbuf; Get bones? yn
    // flush_screen paints that gbuf before postpone. JS applies the same
    // mon→memory newsym pass on the stashed leave-level, then paints dirty
    // cells (ordinary vision_recalc(2) skips the loop — see vision.js).
    game._stale_map_flush = true;
    if (game._leave_gbuf_level) {
        const savedLevel = game.level;
        const savedFmon = game.fmon;
        let leaveFmon = null;
        for (const info of game.level_info || []) {
            if (info?.level === game._leave_gbuf_level) {
                leaveFmon = info.fmon;
                break;
            }
        }
        game.level = game._leave_gbuf_level;
        game.fmon = leaveFmon;
        // D-0852: goto_level already ran vision_off_newsym_gbuf for RNG;
        // only re-newsym when leave path skipped that burn.
        if (!game._leave_viz_burned) {
            vision_off_newsym_gbuf();
        }
        paint_gbuf_level_to_terminal(game._leave_gbuf_level);
        game.level = savedLevel;
        game.fmon = savedFmon;
    }
    try {
        // C: after validate OK — wizard y_n("Get bones?"); 'n' → leave file
        if (wizard) {
            if ((await yn_function('Get bones?', 'yn', 'n')) === 'n') {
                return false;
            }
        }

        const map = new GameMap();
    if (payload.locations) {
        for (let x = 0; x < payload.locations.length; x++) {
            const col = payload.locations[x];
            if (!col) continue;
            for (let y = 0; y < col.length; y++) {
                if (col[y] && map.locations[x]) {
                    const cell = { ...map.locations[x][y], ...col[y] };
                    // C savebones cleared glyph memory; strip any stale
                    // display/memory fields from older JS bones payloads.
                    cell.seenv = 0;
                    cell.waslit = false;
                    cell.remembered_glyph = undefined;
                    cell.disp_ch = ' ';
                    cell.disp_color = 8;
                    cell.disp_decgfx = false;
                    cell.disp_attr = 0;
                    cell.gnew = 0;
                    cell.glyph_symidx = -1;
                    map.locations[x][y] = cell;
                }
            }
        }
    }
    map.rooms = payload.rooms || [];
    map.nroom = payload.nroom | 0;
    map.doors = payload.doors || [];
    map.doorindex = payload.doorindex | 0;
    map.flags = { ...map.flags, ...(payload.flags || {}) };
    map.upstair = payload.upstair || null;
    map.dnstair = payload.dnstair || null;
    map.buriedobjlist = null;
    map.traps = payload.ftrap || [];

    const fmon = [];
    for (const rawM of payload.fmon || []) {
        const mtmp = { ...rawM };
        mtmp.minvent = deserObjChain(rawM.minvent, OBJ_MINVENT);
        for (let o = mtmp.minvent; o; o = o.nobj) o.ocarry = mtmp;
        const mnum = mtmp.mnum | 0;
        mtmp.data = mons(mnum);
        // C ref: restore.c restmon — mtrack is part of struct monst (not cleared)
        mtmp.mtrack = [];
        for (let j = 0; j < 4; j++) {
            const c = rawM.mtrack?.[j];
            mtmp.mtrack.push({ x: c?.x | 0, y: c?.y | 0 });
        }
        fmon.push(mtmp);
    }

    const fobj = deserObjChain(payload.fobj, OBJ_FLOOR);
    const buried = deserObjChain(payload.buriedobjlist, OBJ_BURIED);
    const billobjs = deserObjChain(payload.billobjs, OBJ_FLOOR);

    // C restmonchn / restobjchn order: mons(+invent), fobj, buried, bill
    remapMonChainIds(fmon);
    remapObjChainIds(fobj);
    remapObjChainIds(buried);
    remapObjChainIds(billobjs);

    // C ref: restore.c getlev ghostly — reset peaceful/malign for new hero
    // (shopkeepers keep saved peace; unicorn coalign special before peace_minded).
    // Named omission: shk name-based residency peace; hide_monst after.
    const sgn = (x) => (x < 0 ? -1 : x > 0 ? 1 : 0);
    const ual = game.u?.ualign?.type ?? 0;
    for (const mtmp of fmon) {
        if (!mtmp.isshk) {
            const ptr = mtmp.data;
            const uniCoalign = !!(ptr && ptr.mlet === 'S_UNICORN'
                && sgn(ual) === sgn(ptr.maligntyp | 0));
            mtmp.mpeaceful = uniCoalign ? 1 : (peace_minded(ptr) ? 1 : 0);
        }
        set_malign(mtmp);
    }

    game.level = map;
    game.fmon = fmon;
    game.fobj = fobj;
    map.buriedobjlist = buried;
    game.billobjs = billobjs;
    game.ftrap = payload.ftrap || [];
    game.head_engr = payload.head_engr || null;
    game.stairs = payload.stairs || null;
    // C: restcemetery → level.bonesinfo (bones_include_name / familiar)
    map.bonesinfo = deserCemetery(payload.bonesinfo);
    rebuildObjectsAt(fobj);
    // C ref: restore.c getlev → rest_track (bones NHFILE includes utrack)
    rest_track(payload.track);

    if (!game.u) game.u = {};
    if (!game.u.uroleplay) game.u.uroleplay = {};
    game.u.uroleplay.numbones = (game.u.uroleplay.numbones | 0) + 1;

    // C: wizard y_n("Unlink bones?"); 'n' → keep file
        if (wizard) {
            if ((await yn_function('Unlink bones?', 'yn', 'n')) === 'n') {
                return true;
            }
        }
        vfsDeleteFile(vfsPath(filename));
        return true;
    } finally {
        game._stale_map_flush = false;
        game._leave_gbuf_level = null;
        game._leave_viz_snapshot = null;
        game._leave_viz_burned = false;
    }
}
