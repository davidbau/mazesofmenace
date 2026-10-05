// @ts-nocheck
// game.js — Core game data structures.
// C ref: rm.h struct rm, dungeon.h, you.h
import { COLNO, ROWNO, STONE } from './const.js';
import { NO_COLOR } from './terminal.js';
// C obj.h: scalar #define aliases in struct obj.  Store each value once,
// while keeping the C field names at the call sites.  These accessors belong
// to the prototype: struct copies and saves contain the real fields only.
const objProto = {};
for (const [alias, field] of Object.entries({
    on_ice: 'recharged',
    orotten: 'oeroded', odiluted: 'oeroded', norevive: 'oeroded2',
    degraded_horn: 'obroken', opoisoned: 'otrapped',
    leashmon: 'corpsenm', fromsink: 'corpsenm', novelidx: 'corpsenm',
    migr_species: 'corpsenm', next_boulder: 'corpsenm',
    spestudied: 'usecount', wishedfor: 'usecount',
})) {
    Object.defineProperty(objProto, alias, {
        get() { return this[field]; },
        set(value) { this[field] = value; },
        enumerable: true,
    });
}

// C newobj() followed by *obj = <initial value>.  This is a shallow struct
// copy, not a copy of objects reached through its pointers (including oextra).
// The caller supplies zero-initialization or an existing struct as C does.
export function newobj(...fields) {
    return Object.assign(Object.create(objProto), ...fields);
}

// C you.h: struct you. Worn slots are globals in C, not members of this
// struct; their placement on game.u must not make memcpy duplicate objects.
export const YOU_FIELDS = (`
    ux uy dx dy dz tx ty ux0 uy0 uz uz0 utolev utotype ucamefrom umoved
    last_str_turn ulevel ulevelmax ulevelpeak utrap utraptype
    urooms urooms0 uentered ushops ushops0 ushops_entered ushops_left
    uhunger uhs uprops umconf usick_type nv_range xray_range unblind_telepat_range
    bglyph cglyph bc_order bc_felt umonster umonnum mh mhmax mtimedone macurr mamax
    ulycn ucreamed uswldtim uswallow uinwater uundetected mfemale uinvulnerable
    uburied uedibility uhandedness udg_cnt uevent uhave uconduct uroleplay
    acurr aexe abon amax atemp atime ualign ualignbase uluck moreluck uhitinc
    udaminc uac uspellprot usptime uspmtime uhp uhpmax uhppeak uen uenmax uenpeak
    uhpinc ueninc ugangr ugifts ublessed ublesscnt umoney0 uspare1 uexp urexp
    ucleansed usleep uinvault ustuck usteed ustuck_mid usteed_mid ugallop urideturns
    umortality ugrave_arise weapon_slots skills_advanced skill_record
    weapon_skills twoweap mcham umovement uachieved umonst
`).trim().split(/\s+/);
const YOU_INLINE_FIELDS = new Set((`
    uz uz0 utolev ucamefrom urooms urooms0 uentered ushops ushops0
    ushops_entered ushops_left uprops macurr mamax uevent uhave uconduct
    uroleplay acurr aexe abon amax atemp atime ualign ualignbase uhpinc ueninc
    skill_record weapon_skills uachieved
`).trim().split(/\s+/));

function copy_you_inline(value) {
    if (value == null || typeof value !== 'object')
        return value;
    if (ArrayBuffer.isView(value))
        return value.slice();
    if (Array.isArray(value))
        return value.map(copy_you_inline);
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, copy_you_inline(v)]));
}

// umonst remain pointers. Restore into the existing hero, leaving C globals
// (including the worn slots) alone. No traversal of pointed-to game graphs.
export function copy_you(source, destination = {}) {
    for (const key of YOU_FIELDS)
        destination[key] = YOU_INLINE_FIELDS.has(key)
            ? copy_you_inline(source[key]) : source[key];
    return destination;
}

// Prototype for struct rm location objects.
// C ref: rm.h:200-207 — all of these are #define aliases for the single 'flags' bitfield:
//   #define doormask   flags
//   #define altarmask  flags
//   #define wall_info  flags
//   #define ladder     flags
//   #define drawbridgemask flags
//   #define looted     flags
//   #define icedpool   flags
//   #define emptygrave flags
// In JS we have a single 'flags' field; the aliases below are getters/setters so
// any code reading loc.doormask / loc.wall_info / loc.ladder etc. transparently
// accesses loc.flags — exactly as C does via the preprocessor.
const rmProto = {};
for (const alias of [
    'doormask', 'altarmask', 'wall_info', 'ladder',
    'drawbridgemask', 'looted', 'icedpool', 'emptygrave',
]) {
    Object.defineProperty(rmProto, alias, {
        get() { return this.flags; },
        set(v) { this.flags = v; },
        enumerable: true,
        configurable: true,
    });
}
// A single map cell. Mirrors C's struct rm.
export function makeLocation() {
    const loc = Object.create(rmProto);
    loc.typ = STONE; // terrain type (STONE, ROOM, CORR, DOOR, etc.)
    loc.roomno = 0; // room number (0 = not in a room)
    loc.lit = false; // is this cell lit?
    loc.waslit = false; // was this cell lit last time we checked?
    loc.flags = 0; // C struct rm::flags — single bitfield, shared by all aliases
    loc.seenv = 0; // which angles the hero has seen this wall from
    loc.horizontal = false; // is this a horizontal wall?
    loc.edge = false; // is this at the edge of the map?
    loc.candig = false; // C struct rm::candig; also aliased as arboreal_sdoor in rm.h
    loc.disp_ch = ' '; // current display character
    loc.disp_is_warning = false;
    loc.disp_color = NO_COLOR;
    loc.disp_decgfx = false;
    loc.disp_attr = 0;
    loc.gnew = 0; // dirty flag for flush_glyph_buf
    loc.glyph_symidx = -1; // S_* symbol index
    loc.remembered_glyph = undefined; // { ch, color, decgfx, symidx }
    return loc;
}
// The dungeon level map. C ref: struct level.
export class GameMap {
    constructor() {
        this.locations = [];
        for (let x = 0; x < COLNO; x++) {
            this.locations[x] = [];
            for (let y = 0; y < ROWNO; y++) {
                this.locations[x][y] = makeLocation();
            }
        }
        this.rooms = [];
        this.nroom = 0;
        this.doors = [];
        this.doorindex = 0;
        this.objects = [];
        // C ref: mkobj.c svl.level.objects[x][y] — per-tile nexthere chain head.
        // COLNO x ROWNO 2D array, each entry is the first obj at that tile (or null).
        // Mirrors C's struct level { struct obj *objects[COLNO][ROWNO]; }.
        this.levelObjects = [];
        for (let x = 0; x < COLNO; x++) {
            this.levelObjects[x] = [];
            for (let y = 0; y < ROWNO; y++) {
                this.levelObjects[x][y] = null;
            }
        }
        this.monsters = [];
        this.traps = [];
        this.flags = {
            nfountains: 0,
            nsinks: 0,
            hero_memory: true,
            is_maze_lev: false,
        };
    }
    at(x, y) {
        if (x < 0 || x >= COLNO || y < 0 || y >= ROWNO)
            return null;
        return this.locations[x]?.[y] || null;
    }
}
