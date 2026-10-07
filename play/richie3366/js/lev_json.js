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
    RANGE_LEVEL, RANGE_GLOBAL,
    LS_OBJECT, LS_MONSTER,
    W_WEP,
} from './const.js';
import { mons } from './monsters.js';
import { savemon_edog } from './makemon.js';
import { restmon } from './restore.js';
import { savecemetery, restcemetery, save_exclusions } from './dungeon.js';
import { forget_temple_entry } from './priest.js';
import { peek_track } from './track.js';
import { save_engravings } from './engrave.js';
import { save_worm } from './worm.js';
import { save_rooms, save_rooms_from } from './mkroom.js';
import { write_timer, maybe_write_timer } from './mkobj.js';
import { write_ls, maybe_write_ls, discard_flashes } from './light.js';
import { restshk } from './shk.js';

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
        // C restobj `:206–210` — omonst_length > 0 defers to restmon(OMONST).
        if (otmp.oextra && otmp.oextra.omonst != null) {
            restmon(otmp.oextra.omonst);
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
    // C save.c:834 savemon — Sfo_monst writes the whole struct incl the raw
    // mw pointer; on restore only its null/non-null bit is load-bearing
    // (restore.c:432 relinks via the W_WEP minvent scan), so persist it as
    // a flag (object-valued fields are skipped by the loop above).
    out.mw = mtmp.mw ? 1 : 0;
    savemon_edog(mtmp, out);
    return out;
}

function deserMon(raw, ghostly = false) {
    const mtmp = { ...raw };
    delete mtmp.minvent;
    delete mtmp.mtrack;
    mtmp.minvent = deserObjChain(raw.minvent, OBJ_MINVENT);
    for (let o = mtmp.minvent; o; o = o.nobj) o.ocarry = mtmp;
    // C restore.c:432–444 restmonchn — the saved mw is only a non-null
    // flag; relink it to the minvent member carrying W_WEP, else
    // MON_NOWEP. The :443 impossible diagnostic is omitted (sync restore
    // path; file precedent "impossible-only, unwritten").
    mtmp.mw = null;
    if (raw.mw) {
        for (let o = mtmp.minvent; o; o = o.nobj) {
            if (((o.owornmask | 0) & W_WEP) !== 0) {
                mtmp.mw = o;
                break;
            }
        }
    }
    mtmp.data = mons(mtmp.mnum | 0);
    mtmp.mtrack = [];
    for (let j = 0; j < 4; j++) {
        const c = raw.mtrack?.[j];
        mtmp.mtrack.push({ x: c?.x | 0, y: c?.y | 0 });
    }
    // C restmonchn `:393` restmon(mtmp) after newmonst — full mextra
    // rebuild in C order (covers the old restmon_edog arm).
    restmon(mtmp);
    // C restore.c:446–447 restmonchn — isshk → restshk (bill_p re-alias;
    // ghostly re-home + pacify). JSON duplicated bill; -1000 sentinel stays.
    if (mtmp.isshk) restshk(mtmp, ghostly);
    return mtmp;
}

export function jsonClone(v, fallback) {
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
    // C ref: timeout.c maybe_write_timer `:2639`/`:2646` write_it arm
    // (`write_timer`) — per-entry save write with the pointer→id fixup.
    // write_timer returns the record (the Sfo_fe analogue); callers skip
    // nothing (C writes every selected entry; bad-kind panics loud).
    return write_timer(t);
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
    // C ref: light.c maybe_write_ls `:582–608` write_it arm (`:598`
    // write_ls) — per-entry save write with the pointer→id fixup and the
    // chain verification. write_ls returns the record (the Sfo_ls_t
    // analogue) or Null for the bad-type arm C `:699–701` (impossible-only,
    // unwritten); callers skip Null. lightIdNumber stays for the relink
    // (numeric-id) path below, not the save write.
    return write_ls(ls);
}

function snapshotLocalTimers() {
    // C ref: timeout.c save_timers RANGE_LEVEL write pass
    // (maybe_write_timer `:2641–2647` via `:2679`).
    const out = [];
    maybe_write_timer(RANGE_LEVEL, (t) => out.push(serTimer(t)));
    return out;
}

/**
 * C ref: light.c save_light_sources `:427–439` RANGE_LEVEL write pass
 * (live level: bones + dosave current level): discard flashes, then
 * the shared maybe_write_ls selector with the serLight writer
 * (D-3060 unification; snapshotLocalTimers precedent). No peel — the
 * live list stays (bones mid-game; dosave exits).
 */
function snapshotLocalLights() {
    discard_flashes(); // C :427
    game.vision_full_recalc = 0; // C :432
    const out = [];
    maybe_write_ls(RANGE_LEVEL, (ls) => { // C :434–436
        const rec = serLight(ls); // C :598 write_ls
        if (rec) out.push(rec);
    });
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

function serLightList(list, roots) {
    const out = [];
    for (const ls of list || []) {
        if (!ls) continue;
        // C maybe_write_ls `:576–578` — a null id is impossible'd and
        // UNWRITTEN for either type. The stash-time peel already
        // reported it (save_light_sources `:444–446`), so the dosave
        // re-write skips silently (D-3224 named the LS_OBJECT arm;
        // LS_MONSTER is the same C arm — routing it to write_ls would
        // impossible a second time and emit id 0, which restore
        // throws on).
        if (!ls.id) continue;
        const rec = serStashLight(ls, roots);
        if (rec) out.push(rec);
    }
    return out;
}

/**
 * C ref: light.c write_ls `:633–702` as it runs at STASH time
 * (save_light_sources update_file arm `:433–439`, chains live): the
 * persisted id is the pointer's o_id/m_id. JS defers the numeric write
 * to dosave (serOtherLevels → serLevel(src) → serLightList), when the
 * stashed monsters/objects are no longer in the live chains — routing
 * stashed entries through write_ls's live find_oid/find_mid/whereis_mon
 * verification impossibles on healthy entries and, for LS_MONSTER,
 * writes id 0 (the `:684–687` arm leaves auint 0), which restore
 * throws on (`relink_light_sources: no monster 0`; D-3246:
 * scen-special-Samurai-94217, healthy m_id 383 emitter on stashed
 * ledger 25). C's dosave never re-verifies (it copies level files),
 * so resolve against the STASH roots (the frozen stash-time chains):
 * a pointer the stash resolves writes its o_id/m_id silently — C is
 * silent there too when the pointer resolves. Anything else (a peeled
 * youmonst player light, FM_YOU-live; genuine garbage) falls back to
 * serLight, i.e. today's live write_ls behavior bit-for-bit.
 * Bad-type entries route to serLight as well (C `:699–701`
 * impossible-only, unwritten). Already-numeric ids (the C `:641–642`
 * NEEDS_FIXUP shape — unreachable via serLevel, whose stash infos
 * always carry relinked pointers) write through untouched.
 * Sync like C. Sole caller serLightList above (stash re-write only;
 * live snapshots keep serLight → write_ls).
 * @param {object} ls stashed light_base entry (id = pointer)
 * @param {{ fobj?: object, buried?: object, fmon?: object[] }} [roots]
 * @returns {{type:number,x:number,y:number,range:number,id:number}|null}
 */
function serStashLight(ls, roots) {
    const t = ls.type | 0;
    // C `:640` / `:699–701` — bad type is impossible-only, unwritten.
    if (t !== LS_OBJECT && t !== LS_MONSTER) return serLight(ls);
    if (typeof ls.id === 'number') {
        // C `:641–642` — NEEDS_FIXUP entries write untouched.
        return { type: t, x: ls.x | 0, y: ls.y | 0, range: ls.range | 0, id: ls.id | 0 };
    }
    const stash = roots || {};
    if (t === LS_OBJECT) {
        // C `:646–654` transposed onto the stash: find_oid over the
        // frozen fobj/buried/minvent, then the `:650` identity check
        // (never billobjs — find_oid_in_blob, C find_oid).
        const otmp = ls.id;
        const auint = otmp ? otmp.o_id | 0 : 0;
        if (otmp && auint && find_oid_in_blob(auint, stash) === otmp) {
            return { type: t, x: ls.x | 0, y: ls.y | 0, range: ls.range | 0, id: auint };
        }
        return serLight(ls);
    }
    // C `:655–687` transposed: whereis_mon + the `:677` find_mid
    // identity check over the stash fmon (a level stash holds no
    // migrating/mydogs entries — mx 0 sorts RANGE_GLOBAL — and never
    // youmonst, which falls through to the live FM_YOU arm below).
    const mtmp = ls.id;
    const auint = mtmp ? mtmp.m_id | 0 : 0;
    if (mtmp && auint && find_mid_in_blob(auint, stash.fmon) === mtmp) {
        return { type: t, x: ls.x | 0, y: ls.y | 0, range: ls.range | 0, id: auint };
    }
    return serLight(ls);
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
    // C ref: timeout.c save_timers RANGE_GLOBAL write pass
    // (maybe_write_timer `:2634–2640` via `:2679`).
    const out = [];
    maybe_write_timer(RANGE_GLOBAL, (t) => out.push(serTimer(t)));
    return out;
}

/**
 * C ref: light.c save_light_sources `:427–439` RANGE_GLOBAL write pass
 * (dosave): discard flashes, then the shared maybe_write_ls selector
 * with the serLight writer (D-3060 unification; snapshotGlobalTimers
 * precedent). Snapshot; do not peel (C peels because FREEING; JSON
 * Game dies after S).
 * @returns {object[]}
 */
export function snapshotGlobalLights() {
    discard_flashes(); // C :427
    game.vision_full_recalc = 0; // C :432
    const out = [];
    maybe_write_ls(RANGE_GLOBAL, (ls) => { // C :434–436
        const rec = serLight(ls); // C :598 write_ls
        if (rec) out.push(rec);
    });
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
        : serLightList(src.lights, { fobj, buried, fmon });
    const track = live
        ? peek_track()
        : jsonClone(src.track, { utcnt: 0, utpnt: 0, utrack: [] });
    const regions = live
        ? jsonClone(game.regions || [], [])
        : jsonClone(src.regions || [], []);
    // C save.c savelev → save_exclusions (dungeon.c:2595-2614); non-live
    // re-serializes the stash array as-is (count ⇔ length).
    const exclusion_zones = live
        ? save_exclusions()
        : jsonClone(src.exclusion_zones || [], []);
    const updest = live ? snapDest(game.updest) : snapDest(src.updest);
    const dndest = live ? snapDest(game.dndest) : snapDest(src.dndest);
    const lastseentyp = live
        ? jsonClone(game.lastseentyp, null)
        : jsonClone(src.lastseentyp, null);
    const damagelist = live
        ? (lvl?.damagelist || null)
        : (src.damagelist ?? lvl?.damagelist ?? null);
    const stairs = live ? game.stairs : src.stairs;
    const head_engr = live ? save_engravings() : src.head_engr; // C save.c:548 (stash re-serializes as-is).
    // C save.c:543 savelev → save_worm (worm.c:527–568): live snapshots
    // the chains tail-first; a stash re-serializes its records as-is.
    const worm_data = live ? save_worm() : src.worm_data;
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
        // C save.c:534 savelev → save_rooms (mkroom.c:862–871): live
        // reads game.level; a stash re-serializes its records as-is
        // (head_engr precedent — records carry no pointers/monsters).
        ...(live ? save_rooms() : save_rooms_from(src.level)),
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
        worm_data: jsonClone(worm_data, null),
        bonesinfo: savecemetery(bonesinfo),
        regions,
        exclusion_zones,
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
 * @param {{ skipRelink?: boolean, ghostly?: boolean }} [opts]
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
        fmon.push(deserMon(rawM, !!opts?.ghostly));
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
        // C restore.c:1147 getlev → rest_worm (worm.c:577–603): blob for
        // the rest_worm install at the caller's install site (head_engr
        // precedent — deserLevel builds info, callers install).
        worm_data: src.worm_data || null,
        track: src.track || null,
        regions: jsonClone(src.regions || [], []),
        // Records for load_exclusions at install (copies fields into
        // fresh nodes — no aliasing, no clone needed here).
        exclusion_zones: src.exclusion_zones || null,
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
        worm_data: payload.worm_data || null,
        bonesinfo: payload.bonesinfo,
        regions: payload.regions,
        exclusion_zones: payload.exclusion_zones,
        timers: payload.timers,
        track: payload.track,
        lights: payload.lights,
        damagelist: payload.damagelist,
        waterlevel: payload.waterlevel || null,
        flags: payload.level_flags,
    };
}
