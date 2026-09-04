// lev_json.js — JSON analogue of save.c savelev / restore.c getlev
// (one floor blob). C field order is comments, not the wire format.
// Callers: save.js dosave0 / try_restore_save; bones.js savebones /
// getbones. In-session goto_level keeps live pointers in level_info
// (no JSON mid-game). Bones ghostly extras stay in bones.js (D-0274).
// Named: binary NHFILE; worms; exclusions; C dst relative dance
// (JSON stores stairs/trap dst.dlevel absolute). Bubbles: save_waterlevel
// JSON analogue (D-1827). Two relink sites:
// deserLevel RANGE_LEVEL (never billobjs); restgamestate RANGE_GLOBAL
// against invent + migrating (D-1698). JSON gamestate-before-current is
// a no-op for RANGE_GLOBAL (those objects are never on fobj).

import { game } from './gstate.js';
import { GameMap } from './game.js';
import {
    OBJ_FLOOR, OBJ_MINVENT, OBJ_BURIED, OBJ_CONTAINED,
    TIMER_LEVEL, TIMER_GLOBAL, TIMER_OBJECT, TIMER_MONSTER,
    LS_OBJECT, LS_MONSTER, ESHK,
} from './const.js';
import { mons } from './monsters.js';
import { restmon_edog, savemon_edog } from './makemon.js';
import { savecemetery, restcemetery } from './dungeon.js';
import { forget_temple_entry } from './priest.js';
import { peek_track } from './track.js';
import { timer_is_local, light_is_local } from './mkobj.js';

/**
 * C ref: save.c savetrapchn / restore.c getlev trap loop `:1149–1163`.
 * Live list is `level.traps` (`maketrap` / `t_at`); `game.ftrap` is not.
 * JSON stores `dst.dlevel` absolute (C subtracts `u.uz.dlevel` when the
 * destination is the same dungeon). Skip `ntrap` — array order is the chain.
 * @param {object[]|null|undefined} list
 * @returns {object[]}
 */
export function serTraps(list) {
    const out = [];
    for (const t of list || []) {
        if (!t) continue;
        out.push(serTrap(t));
    }
    return out;
}

function serTrap(t) {
    return {
        ttyp: t.ttyp | 0,
        tx: t.tx | 0,
        ty: t.ty | 0,
        tseen: !!t.tseen,
        once: t.once | 0,
        madeby_u: t.madeby_u | 0,
        tnote: t.tnote | 0,
        conjoined: t.conjoined | 0,
        launch: coord2(t.launch),
        launch2: coord2(t.launch2),
        teledest: coord2(t.teledest),
        dst: t.dst
            ? { dnum: t.dst.dnum | 0, dlevel: t.dst.dlevel | 0 }
            : { dnum: -1, dlevel: -1 },
    };
}

function coord2(p) {
    return p ? { x: p.x | 0, y: p.y | 0 } : { x: -1, y: -1 };
}

/**
 * @param {unknown} arr
 * @returns {object[]}
 */
export function deserTraps(arr) {
    const out = [];
    if (!Array.isArray(arr)) return out;
    for (const raw of arr) {
        if (!raw || typeof raw !== 'object') continue;
        const t = serTrap(raw);
        t.ntrap = null;
        out.push(t);
    }
    return out;
}

/** Serialize one object; cobj as nobj-order array. Drop live graph. */
export function serObj(otmp) {
    if (!otmp) return null;
    const out = {};
    for (const k of Object.keys(otmp)) {
        if (k === 'nobj' || k === 'nexthere' || k === 'ocarry'
            || k === 'ocontainer' || k === 'cobj' || k === 'v') {
            continue;
        }
        const v = otmp[k];
        if (v != null && typeof v === 'object') {
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

export function serObjChain(head) {
    const arr = [];
    for (let o = head; o; o = o.nobj) arr.push(serObj(o));
    return arr;
}

export function deserObjChain(arr, where) {
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
        // C restobjchn: nested restobj keeps saved where=OBJ_CONTAINED;
        // only ocontainer pointers are rewritten (restore.c:270-277).
        otmp.cobj = deserObjChain(kids, OBJ_CONTAINED);
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
 * C ref: save.c savemon `:860–894` — mnum from monsndx; forget_temple_entry
 * for ispriest (savemonchn). EDOG blob when present.
 */
export function serMon(mtmp) {
    if (!mtmp) return null;
    if (mtmp.ispriest) forget_temple_entry(mtmp);
    const out = {};
    for (const k of Object.keys(mtmp)) {
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
                            return undefined;
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
    out.mnum = mtmp.mnum | 0;
    if (!out.mnum && mtmp.data?.mndx != null) out.mnum = mtmp.data.mndx | 0;
    out.mtrack = [];
    for (let j = 0; j < 4; j++) {
        const c = mtmp.mtrack?.[j];
        out.mtrack.push({ x: c?.x | 0, y: c?.y | 0 });
    }
    out.minvent = serObjChain(mtmp.minvent);
    savemon_edog(mtmp, out);
    return out;
}

function deserMon(raw) {
    const mtmp = { ...raw };
    delete mtmp.minvent;
    delete mtmp.mtrack;
    mtmp.minvent = deserObjChain(raw.minvent, OBJ_MINVENT);
    for (let o = mtmp.minvent; o; o = o.nobj) o.ocarry = mtmp;
    mtmp.data = mons(mtmp.mnum | 0);
    mtmp.mtrack = [];
    for (let j = 0; j < 4; j++) {
        const c = raw.mtrack?.[j];
        mtmp.mtrack.push({ x: c?.x | 0, y: c?.y | 0 });
    }
    restmon_edog(mtmp);
    // C restshk: bill_p aliases bill (js/shk.js:361). JSON.stringify
    // duplicated the array; -1000 sentinel stays.
    const eshk = ESHK(mtmp);
    if (eshk && eshk.bill_p !== -1000) eshk.bill_p = eshk.bill || [];
    return mtmp;
}

function jsonClone(v, fallback) {
    if (v == null) return fallback;
    try {
        return JSON.parse(JSON.stringify(v, (_k, val) =>
            (typeof val === 'function' ? undefined : val)));
    } catch {
        return fallback;
    }
}

function snapDest(d) {
    return {
        lx: d?.lx | 0, ly: d?.ly | 0, hx: d?.hx | 0, hy: d?.hy | 0,
        nlx: d?.nlx | 0, nly: d?.nly | 0, nhx: d?.nhx | 0, nhy: d?.nhy | 0,
    };
}

function serLocations(lvl) {
    const locations = [];
    if (!lvl?.locations) return locations;
    for (let x = 0; x < lvl.locations.length; x++) {
        locations[x] = (lvl.locations[x] || []).map((cell) => {
            if (!cell) return null;
            return { ...cell };
        });
    }
    return locations;
}

function serBuried(list) {
    if (!list) return [];
    if (Array.isArray(list)) return list.map((o) => serObj(o)).filter(Boolean);
    return serObjChain(list);
}

function serDamage(head) {
    const out = [];
    for (let d = head; d; d = d.next) {
        out.push({
            when: d.when | 0,
            place: { x: d.place?.x | 0, y: d.place?.y | 0 },
            cost: d.cost | 0,
            typ: d.typ | 0,
            flags: d.flags | 0,
            shopindex: d.shopindex | 0,
        });
    }
    return out;
}

function deserDamage(arr) {
    if (!Array.isArray(arr) || arr.length === 0) return null;
    let head = null;
    let prev = null;
    for (const raw of arr) {
        if (!raw) continue;
        const node = {
            when: raw.when | 0,
            place: { x: raw.place?.x | 0, y: raw.place?.y | 0 },
            cost: raw.cost | 0,
            typ: raw.typ | 0,
            flags: raw.flags | 0,
            shopindex: raw.shopindex | 0,
            next: null,
        };
        if (!head) head = node;
        else prev.next = node;
        prev = node;
    }
    return head;
}

function serTimer(t) {
    let arg_id = 0;
    let arg_kind = t.kind | 0;
    if ((t.kind | 0) === TIMER_OBJECT) {
        arg_id = t.arg_id != null ? (t.arg_id | 0) : (t.obj?.o_id | 0);
    } else if ((t.kind | 0) === TIMER_MONSTER) {
        arg_id = t.arg_id != null ? (t.arg_id | 0) : (t.mon?.m_id | 0);
    }
    return {
        timeout: t.timeout | 0,
        tid: t.tid | 0,
        kind: t.kind | 0,
        action: t.action | 0,
        a_long: t.a_long | 0,
        arg_id,
        arg_kind,
    };
}

function deserTimer(raw) {
    return {
        next: null,
        timeout: raw.timeout | 0,
        tid: raw.tid | 0,
        kind: raw.kind | 0,
        action: raw.action | 0,
        a_long: raw.a_long | 0,
        arg_id: raw.arg_id | 0,
        arg_kind: raw.arg_kind | 0,
        obj: null,
        mon: null,
    };
}

function lightIdNumber(ls) {
    if (!ls) return 0;
    const id = ls.id;
    if (id == null) return 0;
    if (typeof id === 'number') return id | 0;
    if ((ls.type | 0) === LS_MONSTER) return id.m_id | 0;
    return id.o_id | 0;
}

function serLight(ls) {
    return {
        type: ls.type | 0,
        x: ls.x | 0,
        y: ls.y | 0,
        range: ls.range | 0,
        id: lightIdNumber(ls),
    };
}

function snapshotLocalTimers() {
    const out = [];
    for (let t = game._timer_base; t; t = t.next) {
        if (!timer_is_local(t)) continue;
        out.push(serTimer(t));
    }
    return out;
}

function snapshotLocalLights() {
    const out = [];
    for (const ls of game.light_base || []) {
        if (!ls) continue;
        // C save_light_sources discard_flashes: LS_OBJECT && !id
        if ((ls.type | 0) === LS_OBJECT && !ls.id) continue;
        // C maybe_write_ls RANGE_LEVEL: light_is_local (mx > 0)
        if (!light_is_local(ls)) continue;
        out.push(serLight(ls));
    }
    return out;
}

function serTimerList(list) {
    const out = [];
    for (const t of list || []) {
        if (!t) continue;
        out.push(serTimer(t));
    }
    return out;
}

function serLightList(list) {
    const out = [];
    for (const ls of list || []) {
        if (!ls) continue;
        if ((ls.type | 0) === LS_OBJECT && !ls.id) continue;
        out.push(serLight(ls));
    }
    return out;
}

/**
 * C shk.c find_oid — walk fobj / buried / minvent, never billobjs
 * (C panics if a timer/light points there). Loud throw ≡ C panic.
 */
function o_on_chain(id, head) {
    const want = id | 0;
    if (!want) return null;
    for (let o = head; o; o = o.nobj) {
        if ((o.o_id | 0) === want) return o;
        const c = o_on_chain(want, o.cobj);
        if (c) return c;
    }
    return null;
}

function find_oid_in_blob(id, roots) {
    const o = o_on_chain(id, roots.fobj)
        || o_on_chain(id, roots.buried);
    if (o) return o;
    for (const m of roots.fmon || []) {
        if (!m) continue;
        const inv = o_on_chain(id, m.minvent);
        if (inv) return inv;
    }
    return null;
}

function find_mid_in_blob(id, fmon) {
    const want = id | 0;
    if (!want) return null;
    for (const m of fmon || []) {
        if (m && (m.m_id | 0) === want) return m;
    }
    return null;
}

/**
 * C restore.c getlev `:1299–1300` relink_timers / relink_light_sources
 * against this blob's fobj / buriedobjlist / fmon[].minvent. Never
 * billobjs. Failed lookup throws (≡ C panic).
 * @param {{ fobj?: object, level?: object, fmon?: object[], timers?: object[], lights?: object[] }} info
 */
export function relinkLevelTimersLights(info) {
    const roots = {
        fobj: info.fobj,
        buried: info.level?.buriedobjlist,
        fmon: info.fmon || [],
    };
    for (const t of info.timers || []) {
        if (!t) continue;
        const kind = t.kind | 0;
        if (kind === TIMER_LEVEL || kind === TIMER_GLOBAL) continue;
        if (kind === TIMER_MONSTER) {
            throw new Error('relink_timers: TIMER_MONSTER');
        }
        if (kind !== TIMER_OBJECT) continue;
        const oid = t.arg_id | 0;
        const obj = find_oid_in_blob(oid, roots);
        if (!obj) {
            throw new Error(`relink_timers: no object ${oid}`);
        }
        t.obj = obj;
    }
    for (const ls of info.lights || []) {
        if (!ls) continue;
        const type = ls.type | 0;
        const nid = typeof ls.id === 'number' ? (ls.id | 0) : lightIdNumber(ls);
        if (type === LS_OBJECT) {
            const obj = find_oid_in_blob(nid, roots);
            if (!obj) {
                throw new Error(`relink_light_sources: no object ${nid}`);
            }
            ls.id = obj;
        } else if (type === LS_MONSTER) {
            const mon = find_mid_in_blob(nid, roots.fmon);
            if (!mon) {
                throw new Error(`relink_light_sources: no monster ${nid}`);
            }
            ls.id = mon;
        }
    }
}

function o_on_invent(id, invent) {
    const want = id | 0;
    if (!want || !invent) return null;
    if (Array.isArray(invent)) {
        for (const o of invent) {
            if (!o) continue;
            if ((o.o_id | 0) === want) return o;
            const c = o_on_chain(want, o.cobj);
            if (c) return c;
        }
        return null;
    }
    return o_on_chain(id, invent);
}

function walkMons(list, fn) {
    if (!list) return;
    if (Array.isArray(list)) {
        for (const m of list) {
            if (m) fn(m);
        }
        return;
    }
    for (let m = list; m; m = m.nmon) fn(m);
}

/**
 * C shk.c find_oid subset: invent / fobj / buried / migrating_objs then
 * fmon / migrating_mons / mydogs minvent. Never billobjs.
 * @param {number} id
 * @param {object} roots
 * @returns {object|null}
 */
export function findOidInRoots(id, roots) {
    const o = o_on_invent(id, roots.invent)
        || o_on_chain(id, roots.fobj)
        || o_on_chain(id, roots.buried)
        || o_on_chain(id, roots.migrating_objs);
    if (o) return o;
    let found = null;
    const scan = (m) => {
        if (found || !m) return;
        found = o_on_chain(id, m.minvent);
    };
    walkMons(roots.fmon, scan);
    if (found) return found;
    walkMons(roots.migrating_mons, scan);
    if (found) return found;
    walkMons(roots.mydogs, scan);
    return found;
}

export function findMidInRoots(id, roots) {
    const want = id | 0;
    if (!want) return null;
    let found = null;
    const scan = (m) => {
        if (!found && m && (m.m_id | 0) === want) found = m;
    };
    walkMons(roots.fmon, scan);
    if (found) return found;
    walkMons(roots.migrating_mons, scan);
    if (found) return found;
    walkMons(roots.mydogs, scan);
    return found;
}

/**
 * C timeout.c save_timers(RANGE_GLOBAL). Snapshot; do not peel
 * (C peels because FREEING; JSON Game dies after S).
 * @returns {object[]}
 */
export function snapshotGlobalTimers() {
    const out = [];
    for (let t = game._timer_base; t; t = t.next) {
        if (timer_is_local(t)) continue;
        out.push(serTimer(t));
    }
    return out;
}

/**
 * C ref: light.c save_light_sources(RANGE_GLOBAL) / maybe_write_ls.
 * Same `light_is_local` as the in-memory peel (LS_MONSTER `mx > 0`).
 * @returns {object[]}
 */
export function snapshotGlobalLights() {
    const out = [];
    for (const ls of game.light_base || []) {
        if (!ls) continue;
        if ((ls.type | 0) === LS_OBJECT && !ls.id) continue;
        if (light_is_local(ls)) continue;
        out.push(serLight(ls));
    }
    return out;
}

export function deserTimerList(arr) {
    return (arr || []).map(deserTimer);
}

export function deserLightList(arr) {
    const out = [];
    for (const raw of arr || []) {
        if (!raw) continue;
        out.push({
            type: raw.type | 0,
            x: raw.x | 0,
            y: raw.y | 0,
            range: raw.range | 0,
            id: raw.id | 0,
        });
    }
    return out;
}

export function serMonList(list) {
    const out = [];
    walkMons(list, (m) => out.push(serMon(m)));
    return out;
}

export function deserMonList(arr) {
    const out = [];
    for (const raw of arr || []) {
        if (raw) out.push(deserMon(raw));
    }
    return out;
}

/**
 * C restore.c restgamestate `:725–726` relink_timers(FALSE) /
 * relink_light_sources(FALSE). RANGE_GLOBAL only: invent +
 * migrating_objs + migrating_mons/mydogs minvent. Never billobjs.
 * Failed lookup throws (≡ C panic). Skip already-relinked current-level
 * entries (obj pointer / non-numeric light id).
 * @param {object[]} timers
 * @param {object[]} lights
 * @param {{ invent?: object[], migrating_objs?: object, migrating_mons?: object[]|object, mydogs?: object[]|object }} roots
 */
export function relinkGlobalTimersLights(timers, lights, roots) {
    const gRoots = {
        invent: roots.invent,
        migrating_objs: roots.migrating_objs,
        migrating_mons: roots.migrating_mons,
        mydogs: roots.mydogs,
    };
    for (const t of timers || []) {
        if (!t || t.obj) continue;
        const kind = t.kind | 0;
        if (kind === TIMER_LEVEL || kind === TIMER_GLOBAL) continue;
        if (kind === TIMER_MONSTER) {
            throw new Error('relink_timers: TIMER_MONSTER');
        }
        if (kind !== TIMER_OBJECT) continue;
        const oid = t.arg_id | 0;
        const obj = findOidInRoots(oid, gRoots);
        if (!obj) {
            throw new Error(`relink_timers: no object ${oid}`);
        }
        t.obj = obj;
    }
    for (const ls of lights || []) {
        if (!ls) continue;
        if (typeof ls.id !== 'number') continue;
        const type = ls.type | 0;
        const nid = ls.id | 0;
        if (type === LS_OBJECT) {
            const obj = findOidInRoots(nid, gRoots);
            if (!obj) {
                throw new Error(`relink_light_sources: no object ${nid}`);
            }
            ls.id = obj;
        } else if (type === LS_MONSTER) {
            const mon = findMidInRoots(nid, gRoots);
            if (!mon) {
                throw new Error(`relink_light_sources: no monster ${nid}`);
            }
            ls.id = mon;
        }
    }
}

/**
 * C ref: mkmaze.c save_waterlevel — JSON analogue of bubble_count +
 * xmin/ymin/xmax/ymax + each bubble (x,y,dx,dy,bm). Skip cons/next/prev.
 * @param {object|null|undefined} bbubbles
 * @param {object|null|undefined} bounds
 */
function serWaterlevel(bbubbles, bounds) {
    if (!bbubbles) return null;
    const bubbles = [];
    for (let b = bbubbles; b; b = b.next) {
        bubbles.push({
            x: b.x | 0,
            y: b.y | 0,
            dx: b.dx | 0,
            dy: b.dy | 0,
            bm: Array.from(b.bm || []),
        });
    }
    return {
        xmin: bounds?.xmin | 0,
        ymin: bounds?.ymin | 0,
        xmax: bounds?.xmax | 0,
        ymax: bounds?.ymax | 0,
        bubbles,
    };
}

/**
 * JSON analogue of savelev_core. `src == null` reads live `game.*`
 * (snapshot; does not peel timers/lights). A stash record uses the
 * same field names `goto_level` writes into `level_info`.
 * @param {object|null|undefined} src
 * @returns {object}
 */
export function serLevel(src) {
    const live = src == null;
    const lvl = live ? game.level : src.level;
    const fmon = live ? (game.fmon || []) : (src.fmon || []);
    const fobj = live ? game.fobj : src.fobj;
    const buried = live
        ? lvl?.buriedobjlist
        : (src.level?.buriedobjlist ?? src.buriedobjlist);
    const billobjs = live ? game.billobjs : src.billobjs;
    const traps = live
        ? (lvl?.traps || [])
        : (src.level?.traps || src.ftrap || []);
    const timers = live
        ? snapshotLocalTimers()
        : serTimerList(src.timers);
    const lights = live
        ? snapshotLocalLights()
        : serLightList(src.lights);
    const track = live
        ? peek_track()
        : jsonClone(src.track, { utcnt: 0, utpnt: 0, utrack: [] });
    const regions = live
        ? jsonClone(game.regions || [], [])
        : jsonClone(src.regions || [], []);
    const updest = live ? snapDest(game.updest) : snapDest(src.updest);
    const dndest = live ? snapDest(game.dndest) : snapDest(src.dndest);
    const lastseentyp = live
        ? jsonClone(game.lastseentyp, null)
        : jsonClone(src.lastseentyp, null);
    const damagelist = live
        ? (lvl?.damagelist || null)
        : (src.damagelist ?? lvl?.damagelist ?? null);
    const stairs = live ? game.stairs : src.stairs;
    const head_engr = live ? game.head_engr : src.head_engr;
    const bonesinfo = live ? lvl?.bonesinfo : (src.level?.bonesinfo ?? src.bonesinfo);

    const monsOut = [];
    for (const m of fmon) {
        if (m) monsOut.push(serMon(m));
    }

    return {
        omoves: live ? (game.moves | 0) : (src.omoves | 0),
        locations: serLocations(lvl),
        lastseentyp,
        stairs: jsonClone(stairs, null),
        updest,
        dndest,
        level_flags: lvl?.flags ? { ...lvl.flags } : {},
        rooms: jsonClone(lvl?.rooms, []),
        nroom: lvl?.nroom | 0,
        doors: jsonClone(lvl?.doors, []),
        doorindex: lvl?.doorindex | 0,
        upstair: lvl?.upstair ? { ...lvl.upstair } : null,
        dnstair: lvl?.dnstair ? { ...lvl.dnstair } : null,
        fmon: monsOut,
        fobj: serObjChain(fobj),
        buriedobjlist: serBuried(buried),
        billobjs: serObjChain(billobjs),
        traps: serTraps(traps),
        head_engr: jsonClone(head_engr, null),
        bonesinfo: savecemetery(bonesinfo),
        regions,
        timers,
        track,
        lights,
        damagelist: serDamage(damagelist),
        // C save.c savelev bbubbly + save_waterlevel
        waterlevel: live
            ? serWaterlevel(game.bbubbles, game.waterlevel_bounds)
            : (src.waterlevel || serWaterlevel(src.bbubbles, src.waterlevel_bounds)),
    };
}

/**
 * JSON analogue of getlev hydration. Returns a stash-shaped record
 * whose `level` is `new GameMap()` + overlay, never a plain object.
 * Relinks RANGE_LEVEL timers/lights against this blob only (C
 * restore.c:1299–1300). Does **not** insert into `_timer_base` /
 * `light_base` (caller installs current; other ledgers stay on the
 * stash — M2).
 * @param {object|null|undefined} blob
 * @param {{ skipRelink?: boolean }} [opts]
 * @returns {object}
 */
export function deserLevel(blob, opts) {
    const src = blob && typeof blob === 'object' ? blob : {};
    const map = new GameMap();
    if (src.locations) {
        for (let x = 0; x < src.locations.length; x++) {
            const col = src.locations[x];
            if (!col) continue;
            for (let y = 0; y < col.length; y++) {
                if (col[y] && map.locations[x]) {
                    map.locations[x][y] = { ...map.locations[x][y], ...col[y] };
                }
            }
        }
    }
    map.rooms = src.rooms || [];
    map.nroom = src.nroom | 0;
    map.doors = src.doors || [];
    map.doorindex = src.doorindex | 0;
    map.flags = { ...map.flags, ...(src.level_flags || src.flags || {}) };
    map.upstair = src.upstair || null;
    map.dnstair = src.dnstair || null;
    map.buriedobjlist = deserObjChain(src.buriedobjlist, OBJ_BURIED);
    map.traps = deserTraps(src.traps ?? src.ftrap);
    map.bonesinfo = restcemetery(src.bonesinfo);
    map.damagelist = deserDamage(src.damagelist);

    const fmon = [];
    for (const rawM of src.fmon || []) {
        if (!rawM) continue;
        fmon.push(deserMon(rawM));
    }

    const info = {
        flags: src.flags | 0,
        omoves: src.omoves | 0,
        level: map,
        fmon,
        fobj: deserObjChain(src.fobj, OBJ_FLOOR),
        ftrap: map.traps,
        stairs: src.stairs || null,
        head_engr: src.head_engr || null,
        track: src.track || null,
        regions: jsonClone(src.regions || [], []),
        updest: snapDest(src.updest),
        dndest: snapDest(src.dndest),
        lastseentyp: jsonClone(src.lastseentyp, null),
        timers: (src.timers || []).map(deserTimer),
        lights: (src.lights || []).map((raw) => ({
            type: raw.type | 0,
            x: raw.x | 0,
            y: raw.y | 0,
            range: raw.range | 0,
            id: raw.id | 0,
        })),
        billobjs: deserObjChain(src.billobjs, OBJ_FLOOR),
        damagelist: map.damagelist,
        // C restore.c rest_bubbles — blob for restore_waterlevel on install
        waterlevel: src.waterlevel || null,
    };
    if (!opts?.skipRelink) relinkLevelTimersLights(info);
    return info;
}

/**
 * Old Cluster 0 / pre-`current` payload: scattered top-level map keys.
 * Missing `current` means old save (seed0013 mid-dev; keep loadable).
 * @param {object} payload
 * @returns {object}
 */
export function levelBlobFromPayload(payload) {
    if (payload?.current && typeof payload.current === 'object') {
        return payload.current;
    }
    return {
        omoves: payload.moves | 0,
        locations: payload.locations,
        lastseentyp: payload.lastseentyp,
        stairs: payload.stairs,
        updest: payload.updest,
        dndest: payload.dndest,
        level_flags: payload.level_flags,
        rooms: payload.rooms,
        nroom: payload.nroom,
        doors: payload.doors,
        doorindex: payload.doorindex,
        upstair: payload.upstair,
        dnstair: payload.dnstair,
        fmon: payload.fmon,
        fobj: payload.fobj,
        buriedobjlist: payload.buriedobjlist,
        billobjs: payload.billobjs,
        traps: payload.traps ?? payload.ftrap,
        head_engr: payload.head_engr,
        bonesinfo: payload.bonesinfo,
        regions: payload.regions,
        timers: payload.timers,
        track: payload.track,
        lights: payload.lights,
        damagelist: payload.damagelist,
        waterlevel: payload.waterlevel || null,
        flags: payload.level_flags,
    };
}
