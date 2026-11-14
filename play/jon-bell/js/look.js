import { displayLookWindow } from './look-window.js';
import { ECMD_OK, ECMD_TIME, HAND } from './const.js';
import { trapname } from './trap.js';
// @ts-nocheck
// look.js — `:` (dolook) and look_here implementation.
//
// C ref: invent.c:4319 dolook(void) → look_here(0, LOOKHERE_NOFLAGS)
// C ref: invent.c:4105 look_here(int obj_cnt, unsigned lookhere_flags)
// C ref: invent.c:4037 dfeature_at(coordxy x, coordxy y, char *buf)
//
// function — uswallow stomach contents, the region/trap pre-message, the
// Blind preamble, dfeature line construction, the lava/pool/no-object
// short-circuit, the pile_limit summary, the single-object arm, and the
// multi-object arm. Swallowed inventories use the shared display_minventory
// menu below.
//
// dfeature_at: cover DOOR/FOUNTAIN/THRONE/SINK/ALTAR/STAIRS/TREE/IRONBARS
// and a few decoration types via defsyms-style explanations.

import { game } from './gstate.js';
import { hide_unhide_msgtypes, MSGTYP_MASK_REP_SHOW } from './options.js';
import { nomul } from './hack.js';
import { impossible } from './pline.js';
import { classifyTerrain, invalidateTerrainStatus } from './terrain-status.js';
import { mon_visible, canspotmon, time_botl_run_ended } from './display.js';
import { pline, You_see } from './pline.js';
import {
    DOOR, D_NODOOR, D_ISOPEN, D_BROKEN, FOUNTAIN, THRONE, SINK, ALTAR,
    GRAVE, TREE, IRONBARS, DRAWBRIDGE_DOWN, DBWALL,
    STONE, ROOM, CORR, ICE, AIR, CLOUD,
    POOL, MOAT, WATER, DRAWBRIDGE_UP, LAVAPOOL, LAVAWALL,
    D_CLOSED, D_LOCKED, BLINDED, STONE_RES, FIRE_RES,
    VIBRATING_SQUARE,
    IS_DOOR, IS_OBSTRUCTED, IS_AIR, IS_POOL, IS_LAVA, IS_WATERWALL,
    IS_STWALL, IS_TREE, ACCESSIBLE,
    IS_ALTAR, IS_GRAVE, IS_FOUNTAIN, IS_WALL, IS_ROOM, SDOOR,
    W_NONDIGGABLE, DB_UNDER, DB_ICE, DB_LAVA, DB_MOAT, LEVITATION, FLYING,
    M_AP_TYPE, M_AP_FURNITURE, M_AP_OBJECT,
    A_NONE, A_CHAOTIC, A_NEUTRAL, A_LAWFUL,
    AM_MASK, AM_SHRINE, AM_SANCTUM, Amask2align,
    isok, u_at, Is_waterlevel, Is_earthlevel, Is_airlevel, Is_juiblex_level, is_pit, STOMACH,
    LOOKHERE_NOFLAGS, LOOKHERE_PICKED_SOME, LOOKHERE_SKIP_DFEATURE,
    PLNMSG_ONE_ITEM_HERE, DUST, ENGRAVE, BURN, MARK, ENGR_BLOOD, HEADSTONE,
} from './const.js';
import { t_at } from './trap.js';
import { is_drawbridge_wall } from './dbridge.js';
import { dist2 } from './hacklib.js';
import { s_suffix } from './hacklib.js';
import { m_at } from './uhitm.js';
import { is_safemon } from './display.js';
import { mon_nam } from './uhitm.js';
import { engr_at } from './engrave.js';
import { stairway_at, stairs_description } from './stairs.js';
/* hliquid: C do_name.c:1479 — the hallucination-substituted liquid word used by
 * avoid_moving_on_liquid's mention_walls feedback.  Hoisted function
 * declaration, so the mhitm <-> look module cycle cannot leave it in TDZ. */
import { Amonnam, hliquid } from './do_name.js';
import { poly_when_stoned } from './mondata.js';
import { visible_region_at, reg_damg } from './region.js';
import { pushRngLogEntry } from './rng.js';
import { Blind } from './vision.js';
import { doname, doname_with_price, corpse_xname, an, vtense, makeplural, CXN_ARTICLE, CXN_PFX_THE } from './objnam.js';
import { ENV } from './hostenv.js';
/* mbodypart: C polyself.c:1956 — needed only by look_here's u.uswallow arm
 * ("Contents of <mon's> stomach").  js/cmd.js already imports FROM this file
 * (`_dfeature_at as look_dfeature_at`), so this creates the same kind of
 * cmd.js <-> look.js cycle the hliquid import above already accepts for
 * mhitm.js; mbodypart is a hoisted function declaration, so the cycle cannot
 * leave it in TDZ at call time (look_here only runs after both modules have
 * finished evaluating). */
import { mbodypart, body_part, instapetrify, pooleffects_is_flyer } from './cmd.js';
import { force_decor } from './pickup.js';
import { display_minventory, dfeature_at as _cmd_dfeature_at } from './invent.js';
import { set_msg_xy } from './pline.js';
import { read_engr_at } from './engrave.js';
import { surface } from './dungeon.js';
export { _surface_at, _surface_lk, read_engr_at }; // relocate-fns
export { end_running } from './hack.js'; // relocate-fns
export { _is_lava_local, _is_pool_local }; // relocate-fns


// C ref: rm.h IS_DOOR(typ) — only the DOOR typ
function _is_door(typ) { return typ === DOOR; }
// rm.h: IS_FOUNTAIN/IS_THRONE/IS_SINK/IS_ALTAR/IS_GRAVE are single-typ checks
function _is_fountain(typ) { return typ === FOUNTAIN; }
function _is_throne(typ)   { return typ === THRONE; }
function _is_sink(typ)     { return typ === SINK; }
function _is_altar(typ)    { return typ === ALTAR; }
function _is_grave(typ)    { return typ === GRAVE; }


/* C ref: insight.c:3207 align_str(aligntyp alignment) — the alignment
 * adjective.  Transcribed verbatim, including the two arms the altar text
 * cannot reach on a normal altar (A_NONE and the "unknown" default). */
function _align_str(alignment) {
    switch (alignment | 0) {
    case A_CHAOTIC: return 'chaotic';
    case A_NEUTRAL: return 'neutral';
    case A_LAWFUL:  return 'lawful';
    case A_NONE:    return 'unaligned';
    }
    return 'unknown';
}

/* C ref: pray.c:2530 align_gname(aligntyp alignment) — the deity name for an
 * alignment, read from gu.urole.lgod/ngod/cgod (role.c roles[] entries copied
 * into urole at chargen; js/fastforward.js:76-78 stores them on game.u as
 * lgod/ngod/cgod).  A leading '_' marks a goddess and is stripped (pray.c:2553).
 * Moloch is pray.c:58's `static const char *const Moloch` for A_NONE. */
const _MOLOCH = 'Moloch';
function _align_gname(alignment) {
    const u = game.u || {};
    let gnam;
    switch (alignment | 0) {
    case A_NONE:    gnam = _MOLOCH; break;
    case A_LAWFUL:  gnam = u.lgod ?? game.urole?.lgod; break;
    case A_NEUTRAL: gnam = u.ngod ?? game.urole?.ngod; break;
    case A_CHAOTIC: gnam = u.cgod ?? game.urole?.cgod; break;
    default:
        /* C: impossible("unknown alignment."); gnam = "someone"; */
        gnam = 'someone';
        break;
    }
    if (gnam == null)
        throw new Error('not yet ported: align_gname with unset urole pantheon'
            + ` (alignment ${alignment})`);
    if (gnam.charAt(0) === '_') gnam = gnam.slice(1); /* goddess marker */
    return gnam;
}

/* C ref: pray.c:2514 a_gname_at(coordxy x, coordxy y) —
 *   if (!IS_ALTAR(levl[x][y].typ)) return (char *) 0;
 *   return align_gname(a_align(x, y));
 * with a_align(x,y) == Amask2align(levl[x][y].altarmask & AM_MASK) (align.h). */
function _a_gname_at(x, y) {
    const lev = game.level?.at?.(x, y);
    if (!lev || !_is_altar(lev.typ)) return null;
    return _align_gname(Amask2align(((lev.altarmask ?? lev.flags) | 0) & AM_MASK));
}

// Compute the dfeature string at (x, y).
// C ref: invent.c:4037 dfeature_at()
// Returns { text, article } where article=1 means caller should an()-prefix,
// article=0 means raw text. Returns null when no dfeature at this tile.
//
// Exported (as look_dfeature_at) because C's look_here() calls dfeature_at()
// unconditionally and the LIVE look_here fragments live in js/cmd.js
// (_spoteffects_pickup / _look_here_pile — see the map in js/pickup.js:328).
// cmd.js carries its OWN dfeature_at() at cmd.js:21553, but its stairs and
// altar arms bottom out in `throw new Error('not yet ported')` stubs
// (stairs_description / align_str, cmd.js:21617-21618), so wiring THAT one into
// altar holding a pile.  This body has no throwing arm.
export function _dfeature_at(x, y) {
    const lev = game.level?.at?.(x, y);
    if (!lev) return null;
    const typ = lev.typ;

    // DOOR variations
    if (_is_door(typ)) {
        const mask = lev.doormask | 0;
        /* C invent.c:4059-4062 — override door description for open drawbridge */
        if (is_drawbridge_wall(x, y) >= 0)
            return { text: 'open drawbridge portcullis', article: 1 };
        if (mask === D_NODOOR) return { text: 'doorway', article: 1 };
        if (mask & D_ISOPEN)   return { text: 'open door', article: 1 };
        if (mask & D_BROKEN)   return { text: 'broken door', article: 1 };
        return { text: 'closed door', article: 1 };
    }
    if (_is_fountain(typ)) return { text: 'fountain', article: 1 };
    if (_is_throne(typ))   return { text: 'opulent throne', article: 1 };
    if (_is_lava_local(x, y)) return { text: 'molten lava', article: 0 };
    if (typ === ICE
        || (typ === DRAWBRIDGE_UP
            && ((lev.drawbridgemask | 0) & DB_UNDER) === DB_ICE)) {
        return { text: _cmd_dfeature_at(x, y), article: 0 };
    }
    if (_is_pool_local(x, y)) return { text: 'pool of water', article: 1 };
    if (_is_sink(typ))     return { text: 'sink', article: 1 };
    if (_is_altar(typ)) {
        /* C invent.c:4075-4080 —
         *   Sprintf(altbuf, "%saltar to %s (%s)",
         *           (lev->altarmask & AM_SANCTUM) ? "high " : "",
         *           a_gname(),
         *           align_str(Amask2align(lev->altarmask & ~AM_SHRINE)));
         * dfeature_at's caller look_here always passes the hero's own square,
         * which is the square a_gname() (pray.c:2507 -> a_gname_at(u.ux,u.uy))
         * reads, so (x, y) is threaded through rather than re-reading u.
         * C uses `& ~AM_SHRINE` for the adjective and `& AM_MASK` (inside
         * a_align) for the deity; Amask2align masks with AM_MASK itself so the
         * two agree, and both are transcribed literally. */
        const amask = (lev.altarmask ?? lev.flags) | 0;
        const high = (amask & AM_SANCTUM) ? 'high ' : '';
        const text = `${high}altar to ${_a_gname_at(x, y)}`
            + ` (${_align_str(Amask2align(amask & ~AM_SHRINE))})`;
        return { text, article: 1 };
    }
    const stway = stairway_at(x, y);
    if (stway)
        return { text: stairs_description(stway, null, true), article: 1 };
    // C invent.c:4081-4093: a surviving stairway takes precedence over these
    // terrain types, even when the square's typ has been changed by a wish.
    if (typ === DRAWBRIDGE_DOWN) return { text: 'lowered drawbridge', article: 1 };
    if (typ === DBWALL)    return { text: 'raised drawbridge', article: 1 };
    if (_is_grave(typ))    return { text: 'grave', article: 1 };
    if (typ === TREE)      return { text: 'tree', article: 1 };
    if (typ === IRONBARS)  return { text: 'set of iron bars', article: 1 };
    return null;
}




/* trap.c:7100 trapname(ttyp, override) is js/makemon.js trapname(); look_here
 * calls it with FALSE so a hallucinating hero draws the DISPLAY stream. */

/* C dungeon.c:1750-1786: use the shared surface port, including the swallowed
 * hero's maw/husk.  Restore calls read_engr_at directly (allmain.c:87),
 * bypassing look_here's swallowed-hero guard. */
function _surface_lk(x, y) {
    return surface(x, y);
}

/* C ref: engrave.c:318-407 read_engr_at(x, y).
 * Canonical definition is exported from js/cmd.js and re-exported above. */





// ── Terrain and trap predicates for lookaround ──


// C ref: dbridge.c:115-128 db_under_typ(mask) — terrain under a drawbridge.
//   switch (mask & DB_UNDER) { DB_ICE: return ICE; DB_LAVA: return LAVAPOOL;
//     DB_MOAT: return MOAT; default: return STONE; }
// Ported inline (db_under_typ is also exported by dokick.js; keep look.js
// self-contained to avoid pulling that heavy module). RNG: none.
function _db_under_typ(mask) {
    switch ((mask & DB_UNDER) | 0) {
    case DB_ICE:
        return ICE;
    case DB_LAVA:
        return LAVAPOOL;
    case DB_MOAT:
        return MOAT;
    default:
        return STONE;
    }
}

// C ref: rm.h:133 SURFACE_AT(x,y) macro —
//   ((levl[x][y].typ == DRAWBRIDGE_UP)
//    ? db_under_typ(levl[x][y].drawbridgemask)
//    : levl[x][y].typ)
// Uses the underlying terrain in front of a closed drawbridge. drawbridgemask
// side-channel. RNG: none.
function _surface_at(lev) {
    return (lev.typ === DRAWBRIDGE_UP)
        ? _db_under_typ(lev.drawbridgemask)
        : lev.typ;
}



// C ref: monst.h:238-240 is_door_mappear macro
// M_AP_TYPE(mon) == M_AP_FURNITURE && (mappearance == S_hcdoor || mappearance == S_vcdoor)
// S_hcdoor = 16, S_vcdoor = 15 (defsym.h PCHAR2 enum values)
const S_VCDOOR = 15; /* vertical closed door — defsym.h PCHAR2(15,...) */
const S_HCDOOR = 16; /* horizontal closed door — defsym.h PCHAR2(16,...) */
export function is_door_mappear(mon) {
    if (!mon) return false;
    const ap_type = M_AP_TYPE(mon);
    if (ap_type !== M_AP_FURNITURE) return false;
    const mappearance = mon.mappearance | 0;
    return mappearance === S_HCDOOR || mappearance === S_VCDOOR;
}


// C ref: dbridge.c:46-83 is_pool / is_lava / is_pool_or_lava
// is_pool: POOL, MOAT, WATER, or a drawbridge with a moat underneath.
// is_lava: LAVAPOOL, LAVAWALL, or a drawbridge with lava underneath.
export { is_pool } from './dbridge.js';
import { is_pool } from './dbridge.js';
export { is_pool_or_lava } from './dbridge.js'; // relocate-fns
/* Pre-existing file-local spelling, kept so this file's own call sites and the
 * two comments in mklev.js/teleport.js that cite it by name still resolve. */
const _is_pool_local = is_pool;
function _is_lava_local(x, y) {
    if (!isok(x, y)) return false;
    const lev = game.level?.at(x, y);
    if (!lev) return false;
    const typ = lev.typ;
    if (typ === LAVAPOOL || typ === LAVAWALL) return true;
    return typ === DRAWBRIDGE_UP
        && ((lev.drawbridgemask | 0) & DB_UNDER) === DB_LAVA;
}





