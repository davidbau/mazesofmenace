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
    };

    return vfsWriteFile(vfsPath(filename), JSON.stringify(payload));
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
 * @returns {boolean} true if bones loaded (mklev should return).
 */
export function try_load_bones(lev) {
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
    rebuildObjectsAt(fobj);

    if (!game.u) game.u = {};
    if (!game.u.uroleplay) game.u.uroleplay = {};
    game.u.uroleplay.numbones = (game.u.uroleplay.numbones | 0) + 1;

    vfsDeleteFile(vfsPath(filename));
    return true;
}
