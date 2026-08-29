// save.js — Game save / restore via frozen storage VFS (JSON subset).
// C ref: save.c dosave / dosave0 / save_msghistory / save_gamelog /
//        save_luadata; restore.c dorecover / restore_msghistory /
//        restore_gamelog; nhlua.c restore_luadata / save_luadata;
//        files.c SAVEF; unixmain attempt_restore; allmain welcome(FALSE).

import { game } from './gstate.js';
import { vfsReadFile, vfsWriteFile, vfsDeleteFile } from './storage.js';
import { yn_function } from './getline.js';
import { pline, docrt, getmsghistory, putmsghistory } from './display.js';
import { gamelog_add } from './pline.js';
import { change_luck } from './attrib.js';
import {
    FULL_MOON, OBJ_FLOOR, OBJ_INVENT, OBJ_MINVENT, OBJ_CONTAINED,
    OBJ_BURIED, ECMD_OK, BUFSZ,
} from './const.js';
import { GameMap } from './game.js';
import { mons } from './monsters.js';
import { restmon_edog, savemon_edog } from './makemon.js';
import { objects_globals_init } from './objects.js';
import { nh_terminate_capture } from './topten.js';
import { l_nhcore_init } from './mklev.js';
import {
    save_mapseenchn,
    restore_mapseenchn,
    savecemetery,
    restcemetery,
} from './dungeon.js';

const SAVE_VFS_PREFIX = 'save/';

/** C ref: files.c set_savefile_name — contest uses plname under save/. */
export function set_savefile_name(plname) {
    const name = String(plname || game.plname || 'Hero').replace(/[/\\]/g, '_');
    return `${SAVE_VFS_PREFIX}${name}`;
}

function vfsPath(path) {
    return path;
}

/** Serialize one object; cobj as nobj-order array. Drop live graph. */
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

function serInventArray(invent) {
    return (invent || []).map((o) => serObj(o));
}

function serMon(mtmp) {
    if (!mtmp) return null;
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
    out.mtrack = [];
    for (let j = 0; j < 4; j++) {
        const c = mtmp.mtrack?.[j];
        out.mtrack.push({ x: c?.x | 0, y: c?.y | 0 });
    }
    out.minvent = serObjChain(mtmp.minvent);
    // C save.c savemon `:860–869` — EDOG blob when present.
    savemon_edog(mtmp, out);
    return out;
}

const WORN_SLOTS = [
    'uwep', 'uswapwep', 'uquiver',
    'uarm', 'uarmc', 'uarmh', 'uarms', 'uarmg', 'uarmf', 'uarmu',
    'uleft', 'uright', 'uchain', 'uball',
];

function serWorn(u) {
    const worn = {};
    for (const slot of WORN_SLOTS) {
        const obj = u?.[slot];
        worn[slot] = obj?.invlet ?? null;
    }
    return worn;
}

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
        // C restobjchn: nested restobj keeps saved where=OBJ_CONTAINED;
        // only ocontainer pointers are rewritten (restore.c:270-277).
        // Passing the parent chain's where (FLOOR/INVENT/MINVENT) made
        // get_obj_location(obj, 0) accept contained eggs as if hatch
        // had passed CONTAINED_TOO (D-1036 risk 4 / D-1054).
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

function findByInvlet(invent, invlet) {
    if (invlet == null) return null;
    return (invent || []).find((o) => o.invlet === invlet) || null;
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
 * C ref: save.c dosave0 — write current game to VFS (JSON subset of savelev).
 * Named omissions: binary NHFILE format; multi-level ledger files; hangup
 * arms; overwrite yn; compress; looseball/chain when swallowed.
 * mapseenchn cemetery JSON is save_dungeon/save_mapseen (D-1685);
 * current-level bonesinfo is savelev savecemetery.
 */
export function dosave0() {
    const u = game.u || {};
    // C: undo date-dependent luck before persisting
    if (game.flags?.moonphase === FULL_MOON) change_luck(-1);
    if (game.flags?.friday13) change_luck(1);

    const path = set_savefile_name(game.plname);
    const lvl = game.level;
    const locations = [];
    if (lvl?.locations) {
        for (let x = 0; x < lvl.locations.length; x++) {
            locations[x] = (lvl.locations[x] || []).map((cell) => {
                if (!cell) return null;
                return { ...cell };
            });
        }
    }

    const fmon = [];
    for (const m of game.fmon || []) fmon.push(serMon(m));

    const payload = {
        version: 1,
        plname: game.plname,
        u: serHero(u),
        worn: serWorn(u),
        invent: serInventArray(game.invent),
        objects: serObjectsMutable(game.objects),
        bases: game.bases ? [...game.bases] : null,
        oclass_prob_totals: game.oclass_prob_totals
            ? [...game.oclass_prob_totals] : null,
        disco: game.disco ? [...game.disco] : [],
        flags: game.flags ? { ...game.flags } : {},
        iflags: game.iflags ? { ...game.iflags } : {},
        context: game.context
            ? JSON.parse(JSON.stringify(game.context, (_k, v) =>
                (typeof v === 'function' ? undefined : v)))
            : {},
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
        locations,
        rooms: lvl?.rooms ? JSON.parse(JSON.stringify(lvl.rooms)) : [],
        nroom: lvl?.nroom | 0,
        doors: lvl?.doors ? JSON.parse(JSON.stringify(lvl.doors)) : [],
        doorindex: lvl?.doorindex | 0,
        level_flags: lvl?.flags ? { ...lvl.flags } : {},
        fmon,
        fobj: serObjChain(game.fobj),
        buriedobjlist: serObjChain(lvl?.buriedobjlist),
        billobjs: serObjChain(game.billobjs),
        ftrap: (game.ftrap || []).map((t) => ({ ...t })),
        head_engr: game.head_engr
            ? JSON.parse(JSON.stringify(game.head_engr)) : null,
        stairs: game.stairs
            ? JSON.parse(JSON.stringify(game.stairs)) : null,
        upstair: lvl?.upstair ? { ...lvl.upstair } : null,
        dnstair: lvl?.dnstair ? { ...lvl.dnstair } : null,
        lastseentyp: game.lastseentyp
            ? JSON.parse(JSON.stringify(game.lastseentyp)) : null,
        // C save.c save_dungeon → save_mapseen + savecemetery
        // (dungeon.c :179–187 / :2716). JSON analogue of mapseenchn.
        mapseenchn: save_mapseenchn(),
        // C save.c savelev `:505` savecemetery(&level.bonesinfo).
        bonesinfo: savecemetery(lvl?.bonesinfo),
        spl_book: game.spl_book
            ? JSON.parse(JSON.stringify(game.spl_book)) : null,
        spl_orderindx: game.spl_orderindx
            ? [...game.spl_orderindx] : null,
        artiexist: game.artiexist
            ? [...game.artiexist] : null,
        preferred_pet: game.preferred_pet || null,
        _goldCount: game._goldCount | 0,
        _lastinvnr: game._lastinvnr | 0,
        datetime_saved: game.datetime || null,
        // level dnum/dlevel
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

/** Plain-data hero fields; worn slots omitted (see serWorn). */
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
 * C ref: restore.c dorecover + getlev/restgamestate subset.
 * @returns {boolean} true if a save was loaded
 */
export function try_restore_save() {
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
    game.iflags = { ...(game.iflags || {}), ...(payload.iflags || {}) };
    game.context = { ...(payload.context || {}) };
    game.moves = payload.moves | 0;
    game.multi = payload.multi | 0;
    game.urole = payload.urole;
    game.urace = payload.urace;
    game.mvitals = payload.mvitals || [];
    game.dungeons = payload.dungeons || game.dungeons;
    game.n_dgns = payload.n_dgns | 0;
    game.branches = payload.branches || game.branches;
    game.spl_book = payload.spl_book;
    game.spl_orderindx = payload.spl_orderindx;
    game.artiexist = payload.artiexist;
    game.preferred_pet = payload.preferred_pet;
    game._goldCount = payload._goldCount | 0;
    game._lastinvnr = payload._lastinvnr | 0;

    const invent = deserInventArray(payload.invent);
    game.invent = invent;

    const u = { ...(payload.u || {}) };
    for (const slot of WORN_SLOTS) {
        u[slot] = findByInvlet(invent, payload.worn?.[slot]);
    }
    if (payload.uz) u.uz = { ...payload.uz };
    game.u = u;

    const map = new GameMap();
    if (payload.locations) {
        for (let x = 0; x < payload.locations.length; x++) {
            const col = payload.locations[x];
            if (!col) continue;
            for (let y = 0; y < col.length; y++) {
                if (col[y] && map.locations[x]) {
                    map.locations[x][y] = { ...map.locations[x][y], ...col[y] };
                }
            }
        }
    }
    map.rooms = payload.rooms || [];
    map.nroom = payload.nroom | 0;
    map.doors = payload.doors || [];
    map.doorindex = payload.doorindex | 0;
    map.flags = { ...map.flags, ...(payload.level_flags || {}) };
    map.upstair = payload.upstair || null;
    map.dnstair = payload.dnstair || null;
    map.buriedobjlist = deserObjChain(payload.buriedobjlist, OBJ_BURIED);
    map.traps = payload.ftrap || [];

    const fmon = [];
    for (const rawM of payload.fmon || []) {
        const mtmp = { ...rawM };
        mtmp.minvent = deserObjChain(rawM.minvent, OBJ_MINVENT);
        for (let o = mtmp.minvent; o; o = o.nobj) o.ocarry = mtmp;
        mtmp.data = mons(mtmp.mnum | 0);
        mtmp.mtrack = [];
        for (let j = 0; j < 4; j++) {
            const c = rawM.mtrack?.[j];
            mtmp.mtrack.push({ x: c?.x | 0, y: c?.y | 0 });
        }
        // C restore.c restmon `:349–361` — newedog + apport clamp.
        restmon_edog(mtmp);
        fmon.push(mtmp);
    }

    const fobj = deserObjChain(payload.fobj, OBJ_FLOOR);
    game.level = map;
    game.fmon = fmon;
    game.fobj = fobj;
    game.billobjs = deserObjChain(payload.billobjs, OBJ_FLOOR);
    game.ftrap = payload.ftrap || [];
    game.head_engr = payload.head_engr || null;
    game.stairs = payload.stairs || null;
    game.lastseentyp = payload.lastseentyp || null;
    // C restore.c getlev `:1102` restcemetery(&level.bonesinfo).
    map.bonesinfo = restcemetery(payload.bonesinfo);
    // C restore.c dorecover → restore_dungeon mapseen_count +
    // load_mapseen (dungeon.c :251–262 / :2752). After branches.
    restore_mapseenchn(payload);
    rebuildObjectsAt(fobj);

    // C restore.c restgamestate `:720–722` after restnames:
    // restore_msghistory, restore_gamelog, restore_luadata.
    restore_msghistory(payload);
    restore_gamelog(payload);
    restore_luadata(payload);

    // C restore.c dorecover :942 — after restoring=0 / early_raw_messages,
    // before docrt. Invent sync_perminvent WIN_INVEN gate (D-1603).
    if (!game.program_state) game.program_state = {};
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
