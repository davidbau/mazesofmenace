import { displayLookWindow } from './look-window.js';
import { ECMD_OK, ECMD_TIME } from './const.js';
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
// multi-object arm — not the earlier single-feature placeholder.  See the
// block comment directly above look_here() for its remaining NAMED GAP (the
// multi-object/uswallow arm's menu-window presentation, whose content is real).
//
// dfeature_at: cover DOOR/FOUNTAIN/THRONE/SINK/ALTAR/STAIRS/TREE/IRONBARS
// and a few decoration types via defsyms-style explanations.

import { game } from './gstate.js';
import { nomul } from './allmain.js';
import { classifyTerrain, invalidateTerrainStatus } from './terrain-status.js';
import { pline, mon_visible, canspotmon, time_botl_run_ended } from './display.js';
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
import { dist2 } from './hacklib.js';
import { s_suffix } from './hacklib.js';
import { is_safemon } from './uhitm.js';
import { mon_nam } from './uhitm.js';
import { stairway_at, stairs_description, engr_at } from './mklev.js';
/* hliquid: C do_name.c:1479 — the hallucination-substituted liquid word used by
 * avoid_moving_on_liquid's mention_walls feedback.  Hoisted function
 * declaration, so the mhitm <-> look module cycle cannot leave it in TDZ. */
import { Amonnam, hliquid, poly_when_stoned } from './mhitm.js';
import { visible_region_at, reg_damg } from './region.js';
import { pushRngLogEntry } from './rng.js';
import { Blind } from './vision.js';
import { can_reach_floor } from './hold_another_object.js';
import { doname, doname_with_price, corpse_xname, an, vtense, CXN_ARTICLE } from './objnam.js';
import { DEFSYM_EXPLANATION } from './defsym_data.js';
import { ENV } from './hostenv.js';
/* mbodypart: C polyself.c:1956 — needed only by look_here's u.uswallow arm
 * ("Contents of <mon's> stomach").  js/cmd.js already imports FROM this file
 * (`_dfeature_at as look_dfeature_at`), so this creates the same kind of
 * cmd.js <-> look.js cycle the hliquid import above already accepts for
 * mhitm.js; mbodypart is a hoisted function declaration, so the cycle cannot
 * leave it in TDZ at call time (look_here only runs after both modules have
 * finished evaluating). */
import { force_decor, mbodypart, set_msg_xy, instapetrify,
         dfeature_at as _cmd_dfeature_at } from './cmd.js';

const _DIRTRACE = (typeof process !== 'undefined' && ENV
    && ENV.FF_DIRTRACE === '1');

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
    if (_is_grave(typ))    return { text: 'grave', article: 1 };
    if (typ === TREE)      return { text: 'tree', article: 1 };
    if (typ === IRONBARS)  return { text: 'set of iron bars', article: 1 };
    if (typ === DRAWBRIDGE_DOWN) return { text: 'lowered drawbridge', article: 1 };
    if (typ === DBWALL)    return { text: 'raised drawbridge', article: 1 };

    const stway = stairway_at(x, y);
    if (stway)
        return { text: stairs_description(stway, null, true), article: 1 };
    return null;
}


const _CORPSE_OTYP = 265;
const _PM_CHICKATRICE = 9;
const _PM_COCKATRICE = 10;
const _S_ARROW_TRAP_LK = 49; /* rm.h trap_to_defsym: S_arrow_trap + ttyp - 1 */

/* C ref: hack.h Underwater = !!u.uinwater.  Mirrored locally (established
 * convention: js/cmd.js and js/pickup.js each carry their own copy rather
 * than import one another for a one-line field read). */
function _Underwater() {
    return !!(game.u && game.u.uinwater);
}

/* C ref: trap.c:7100 trapname(ttyp, override), non-hallucinating half only —
 * defsyms[S_arrow_trap + ttyp - 1].explanation.  Mirrors js/trap.js's
 * file-local _tr_trapname (not exported); the hallucinating half draws on the
 * DISPLAY isaac64 stream and is out of scope for a message-only line. */
function _trapname_lk(ttyp) {
    return DEFSYM_EXPLANATION[_S_ARROW_TRAP_LK + (ttyp | 0) - 1] ?? 'trap';
}

/* C ref: dungeon.c:1750-1786 surface(x, y) — the narrative terrain word used
 * by read_engr_at's "on the <eloc>" and look_here's Blind "lying here on the
 * <surf>".  The u.uswallow branch (dungeon.c:1756-1760) is NOT transcribed:
 * every call site in this file already runs on the non-swallowed path (the
 * uswallow arm of look_here returns before either caller is reached), so
 * porting it here would be an untested, unreachable guess. */
function _surface_lk(x, y) {
    const lev = game.level && game.level.at ? game.level.at(x, y) : null;
    if (!lev) return 'ground';
    const levtyp = _surface_at(lev);
    if (IS_AIR(levtyp))
        return Is_waterlevel(game.u?.uz) ? 'air bubble'
             : (levtyp === CLOUD ? 'cloud' : 'air');
    if (is_pool(x, y))
        return (_Underwater() && !Is_waterlevel(game.u?.uz)) ? 'bottom' : hliquid('water');
    if (lev.typ === ICE) return 'ice';
    if (_is_lava_local(x, y)) return hliquid('lava');
    if (lev.typ === DRAWBRIDGE_DOWN) return 'bridge';
    if (IS_ALTAR(levtyp)) return 'altar';
    if (IS_GRAVE(levtyp)) return 'headstone';
    if (IS_FOUNTAIN(levtyp)) return 'fountain';
    if (stairway_at(x, y) !== null) return 'stairs'; /* On_stairs() */
    if (IS_WALL(levtyp) || levtyp === SDOOR) return 'wall';
    if (IS_DOOR(levtyp)) return 'doorway';
    if (IS_ROOM(levtyp) && !Is_earthlevel(game.u?.uz)) return 'floor';
    return 'ground';
}

export async function read_engr_at(x, y) {
    const ep = engr_at(x, y);
    /* C engrave.c:321 — eloc = surface(x, y) is computed before the engraving
     * test; under hallucination over a pool it draws hliquid's rn2(41) on the
     * DISPLAY stream even when nothing is engraved here. */
    const eloc = _surface_lk(x, y);
    if (!ep || !ep.text) return;
    const blind = Blind();
    let sensed = false;
    switch (ep.engr_type) {
    case DUST:
        if (!blind) {
            sensed = true;
            await pline(`Something is written here in the ${lev_is_ice_lk(x, y) ? 'frost' : 'dust'}.`);
        }
        break;
    case ENGRAVE:
    case HEADSTONE:
        if (!blind || can_reach_floor(true)) {
            sensed = true;
            await pline(`Something is engraved here on the ${eloc}.`);
        }
        break;
    case BURN:
        if (!blind || can_reach_floor(true)) {
            sensed = true;
            await pline(`Some text has been ${lev_is_ice_lk(x, y) ? 'melted' : 'burned'} into the ${eloc} here.`);
        }
        break;
    case MARK:
        if (!blind) {
            sensed = true;
            await pline(`There's some graffiti on the ${eloc} here.`);
        }
        break;
    case ENGR_BLOOD:
        if (!blind) {
            sensed = true;
            await pline('You see a message scrawled in blood here.');
        }
        break;
    default:
        /* C: impossible("%s is written in a very strange way.", Something);
         * sensed = TRUE; — impossible() is a debug/panic channel this port
         * does not surface as a player-visible pline. */
        sensed = true;
        break;
    }
    if (!sensed) return;
    /* C engrave.c:373-407 — the reveal line and its trailing punctuation. */
    const elen = ep.text.length;
    const off = ep.off | 0;
    let endpunct = '.';
    if (elen >= 2) {
        const pristineChar = (ep.pristine || '').charAt(off + elen - 1);
        const actualChar = ep.text.charAt(elen - 1);
        if (pristineChar === actualChar && '.!?'.includes(actualChar))
            endpunct = '';
    }
    await pline(`You ${blind ? 'feel the words' : 'read'}: "${ep.text}"${endpunct}`);
    /* C engrave.c:398 — a successful read copies actual_text into
     * remembered_text.  /e and /E later report this remembered copy, which
     * matters after movement has smudged an Elbereth engraving. */
    ep.remembered = ep.text;
    ep.eread = 1;
    ep.erevealed = 1;
}
/* Local is_ice(x,y) helper for read_engr_at (engrave.c is_ice). */
function lev_is_ice_lk(x, y) {
    const lev = game.level && game.level.at ? game.level.at(x, y) : null;
    return !!lev && lev.typ === ICE;
}

/* C ref: invent.c:4333 will_feel_cockatrice(otmp, force_touch).  Mirrors
 * js/cmd.js's real port (same file cannot be imported without a cycle risk
 * this port avoids by the same convention js/eat.js/js/pickup.js already
 * use for their own local mirrors), but reads Blind via js/vision.js's real
 * Blind() rather than the `flags.blind` field — see vision.js's own comment
 * on why that field under-reports. */
function _will_feel_cockatrice_lk(otmp, force_touch) {
    const u = game.u;
    const hasGloves = !!(u && u.uarmg);
    const sr = game.u?.uprops?.[STONE_RES];
    const hasStoneResistance = !!((sr?.intrinsic | 0) || (sr?.extrinsic | 0));
    const isCorpse = !!otmp && (otmp.otyp | 0) === _CORPSE_OTYP;
    const corpsenm = otmp ? (otmp.corpsenm | 0) : -1;
    const touchPetrifies = corpsenm === _PM_COCKATRICE || corpsenm === _PM_CHICKATRICE;
    return (Blind() || force_touch) && !hasGloves && !hasStoneResistance
        && isCorpse && touchPetrifies;
}

async function _feel_cockatrice_lk(otmp, force_touch) {
    if (!_will_feel_cockatrice_lk(otmp, force_touch)) return;
    const name = corpse_xname(otmp, null, CXN_ARTICLE);
    if (poly_when_stoned(game.youmonst?.data))
        await pline(`You touched ${name} with your bare hands.`);
    else
        await pline(`Touching ${name} is a fatal mistake...`);
    await instapetrify(`touching ${name} bare-handed`);
}

/* C ref: invent.c:4105 look_here(int obj_cnt, unsigned lookhere_flags).
 * Full body: uswallow stomach-contents arm, the region/trap pre-message, the
 * Blind preamble, dfeature line construction, the lava/pool/no-object
 * short-circuit, the skip_objects (pile_limit) summary, the single-object
 * arm, and the multi-object arm.
 *
 * obj_cnt > 0 means "autopickup in progress" (only used for skip_objects'
 * threshold test and its "two/a few/several/many [more]" wording).
 *
 * NAMED GAP, reached only on a path this port cannot fully model:
 *   - display_minventory() (invent.c:5341) for the uswallow arm's stomach
 *     listing: real content
 *     (doname_with_price per item), approximate presentation.
 *
 * Returns ECMD_TIME when blind, otherwise ECMD_OK; callers decide whether
 * that result controls command timing. Pickup ignores it, as in C. */
export async function look_here(obj_cnt = 0, lookhere_flags = LOOKHERE_NOFLAGS) {
    const g = game;
    const u = g.u || {};
    const x = u.ux | 0, y = u.uy | 0;
    const blind = Blind();
    const verb = blind ? 'feel' : 'see';
    const picked_some = !!(lookhere_flags & LOOKHERE_PICKED_SOME);
    let skip_dfeature = !!(lookhere_flags & LOOKHERE_SKIP_DFEATURE);
    const pile_limit = (g.flags && g.flags.pile_limit != null) ? (g.flags.pile_limit | 0) : 5;
    const skip_objects = pile_limit > 0 && obj_cnt >= pile_limit;

    g.context = g.context || {};

    /* C invent.c:4120-4160 — u.uswallow: "Contents of <mon>'s stomach". */
    if (u.uswallow) {
        const mtmp = u.ustuck;
        const possessive = s_suffix(mon_nam(mtmp));
        const stomach = mbodypart(mtmp, STOMACH);
        const suffix = `${possessive} ${stomach}`; /* fbuf sans "Contents of " (12 chars) */
        await pline(`You ${blind ? 'try' : 'look around'} to ${verb} what is lying in ${suffix}.`);
        let otmp = mtmp ? (mtmp.minvent ?? null) : null;
        if (otmp) {
            for (let o = otmp; o; o = o.nobj) {
                if ((o.otyp | 0) === _CORPSE_OTYP) await _feel_cockatrice_lk(o, false);
            }
            await pline(blind ? 'You feel:' : `Contents of ${suffix}:`);
            for (let o = otmp; o; o = o.nobj) {
                await pline((await doname_with_price(o)));
            }
        } else {
            await pline(`You ${verb} no objects here.`);
        }
        return Blind() ? ECMD_TIME : ECMD_OK;
    }

    /* C invent.c:4162-4178 — visible poison-gas/vapor cloud and/or a seen
     * trap: "There is <a poison gas cloud>[ and ][an arrow trap] here." */
    if (!skip_objects) {
        const reg = visible_region_at(x, y);
        let trap = t_at(x, y);
        if (trap && !trap.tseen) trap = null;
        if (reg || trap) {
            const regPart = reg ? `a ${reg_damg(reg) ? 'poison gas' : 'vapor'} cloud` : '';
            const joiner = (reg && trap) ? ' and ' : '';
            const trapPart = trap ? an(_trapname_lk(trap.ttyp | 0)) : '';
            await pline(`There is ${regPart}${joiner}${trapPart} here.`);
        }
    }

    let otmp = g.level?.levelObjects?.[x]?.[y] ?? null;
    const df = _dfeature_at(x, y);
    let dfeature = df ? df.text : null;
    /* C invent.c:4180-4181 — Underwater suppresses "pool of water". */
    if (dfeature === 'pool of water' && _Underwater()) dfeature = null;

    /* C invent.c:4184-4218 — the Blind preamble. Runs before arm selection,
     * for every arm. */
    if (blind) {
        const drift = Is_airlevel(u.uz) || Is_waterlevel(u.uz);
        if (dfeature && dfeature.slice(0, 6) === 'altar ') {
            await pline('You try to feel what is here.');
        } else if (_surface_at(g.level?.at ? g.level.at(x, y) : {}) === ICE) {
            /* C invent.c:4190-4198. */
            if (!g.flags?.mention_decor || (g.iflags?.prev_decor | 0) === ICE)
                force_decor(false);
            await pline('You try to feel what is on it.');
            skip_dfeature = true;
        } else {
            const cant_reach = !can_reach_floor(true);
            const surf = _surface_lk(x, y);
            const where = cant_reach ? 'lying beneath you' : 'lying here on the ';
            const onwhat = cant_reach ? '' : surf;
            await pline(`You try to feel what is ${drift ? 'floating here' : where}${drift ? '' : onwhat}.`);
            if (dfeature && !drift && dfeature === surf) skip_dfeature = true;
        }
        const trap2 = t_at(x, y);
        if (!can_reach_floor(!!trap2 && is_pit(trap2.ttyp | 0))) {
            await pline("But you can't reach it!");
            return ECMD_OK;
        }
    }

    /* C invent.c:4220-4239 — "There <is/are> <a dfeature> here." */
    let fbuf = null;
    if (dfeature && !skip_dfeature) {
        const p = dfeature.indexOf(' ');
        const article0 = dfeature === 'molten lava' || dfeature === 'iron bars'
            || dfeature === 'ice' || dfeature.startsWith('frozen ')
            || (p >= 0 && dfeature.slice(p).toLowerCase() === ' ice');
        const phrase = article0 ? dfeature : an(dfeature);
        fbuf = `There ${vtense(phrase, 'are')} ${phrase} here.`;
    }

    /* C invent.c:4241-4250 — no object, or lava, or (pool && !Underwater). */
    if (!otmp || _is_lava_local(x, y) || (is_pool(x, y) && !_Underwater())) {
        if (fbuf) await pline(fbuf);
        await read_engr_at(x, y);
        if (!skip_objects && (blind || !dfeature))
            await pline(`You ${verb} no objects here.`);
        return Blind() ? ECMD_TIME : ECMD_OK;
    }
    /* we know there is something here */

    if (skip_objects) {
        /* C invent.c:4252-4276 */
        if (fbuf) await pline(fbuf);
        await read_engr_at(x, y);
        const quan1 = (otmp.quan == null ? 1 : (otmp.quan | 0)) === 1;
        if (obj_cnt === 1 && quan1) {
            await pline(`There is ${picked_some ? 'another' : 'an'} object here.`);
        } else {
            const word = (obj_cnt === 2) ? 'two'
                : (obj_cnt < 5) ? 'a few'
                : (obj_cnt < 10) ? 'several' : 'many';
            await pline(`There are ${word}${picked_some ? ' more' : ''} objects here.`);
        }
        for (let o = otmp; o; o = o.nexthere) {
            if ((o.otyp | 0) === _CORPSE_OTYP && _will_feel_cockatrice_lk(o, false)) {
                const quan = o.quan == null ? 1 : (o.quan | 0);
                const subj = obj_cnt > 1 ? 'Including' : (quan > 1 ? "They're" : "It's");
                const heroData = (g.youmonst && g.youmonst.data) ? g.youmonst.data : null;
                const suffix = poly_when_stoned(heroData) ? '' : ', unfortunately';
                await pline(`${subj} ${corpse_xname(o, null, CXN_ARTICLE)}${suffix}.`);
                await _feel_cockatrice_lk(o, false);
                break;
            }
        }
    } else if (!otmp.nexthere) {
        /* C invent.c:4278-4285 — only one object. */
        if (fbuf) await pline(fbuf);
        await read_engr_at(x, y);
        await pline(`You ${verb} here ${(await doname_with_price(otmp))}.`);
        g.iflags = g.iflags || {};
        g.iflags.last_msg = PLNMSG_ONE_ITEM_HERE;
        if ((otmp.otyp | 0) === _CORPSE_OTYP) await _feel_cockatrice_lk(otmp, false);
    } else {
        // C invent.c:4286-4313: these are putstr lines in a menu window,
        // not plines joined onto the command topline.
        const lines = [
            ...(fbuf ? [fbuf, ''] : []),
            `${picked_some ? 'Other things' : 'Things'} that ${blind ? 'you feel' : 'are'} here:`,
        ];
        let felt = false;
        let o = otmp;
        for (; o; o = o.nexthere) {
            if ((o.otyp | 0) === _CORPSE_OTYP && _will_feel_cockatrice_lk(o, false)) {
                felt = true;
                lines.push(`${(await doname(o))}...`);
                break;
            }
            lines.push((await doname_with_price(o)));
        }
        await displayLookWindow(lines);
        if (felt) await _feel_cockatrice_lk(o, false); /* C reuses the loop var itself */
        await read_engr_at(x, y);
    }
    return Blind() ? ECMD_TIME : ECMD_OK;
}

// C ref: invent.c:4319 dolook(void) — explicit look-here command (':')
//   hide_unhide_msgtypes(TRUE, MSGTYP_MASK_REP_SHOW);
//   res = look_here(0, LOOKHERE_NOFLAGS);
//   hide_unhide_msgtypes(FALSE, MSGTYP_MASK_REP_SHOW);
//   return res;  // ECMD_OK or ECMD_TIME
// MSGTYPE handling is a display-options feature we don't model; behavior is
export async function dolook() {
    return await look_here();
}

// ── Terrain and trap predicates for lookaround ──

// C ref: monmove.c:2204-2209 closed_door()
// boolean closed_door(coordxy x, coordxy y) {
//   return IS_DOOR(levl[x][y].typ) && (levl[x][y].doormask & (D_LOCKED | D_CLOSED));
// }
export function closed_door(x, y) {
    const lev = game.level?.at(x, y);
    if (!lev) return false;
    return IS_DOOR(lev.typ) && !!(lev.doormask & (D_LOCKED | D_CLOSED));
}

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

// C ref: monmove.c:2212-2219 accessible(coordxy x, coordxy y)
//   int levtyp = SURFACE_AT(x, y);
//   return (boolean) (ACCESSIBLE(levtyp) && !closed_door(x, y));
// RNG: none. Reads levl[x][y].typ (and drawbridgemask via SURFACE_AT) plus
// doormask via closed_door — all from the level_tiles-reconstructed game.level.
export function accessible(x, y) {
    const lev = game.level?.at(x, y);
    if (!lev) return false;
    const levtyp = _surface_at(lev);
    return !!(ACCESSIBLE(levtyp) && !closed_door(x, y));
}

// C ref: hack.c:906-913 may_dig(coordxy x, coordxy y)
//   struct rm *lev = &levl[x][y];
//   return (boolean) !((IS_STWALL(lev->typ) || IS_TREE(lev->typ))
//                      && (lev->wall_info & W_NONDIGGABLE));
// "intended to be called only on ROCKs or TREEs". wall_info is the shared
// `flags` bitfield. RNG: none.
export function may_dig(x, y) {
    const lev = game.level?.at(x, y);
    if (!lev) return false;
    return !((IS_STWALL(lev.typ) || IS_TREE(lev.typ))
             && (lev.wall_info & W_NONDIGGABLE));
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

// C ref: rm.h NODIAG macro (hack.h:1419)
// #define NODIAG(monnum) ((monnum) == PM_GRID_BUG)
// PM_GRID_BUG = 116 (from pm.generated.js)
const PM_GRID_BUG_LA = 116;
function NODIAG(monnum) { return (monnum | 0) === PM_GRID_BUG_LA; }

// C ref: dbridge.c:46-83 is_pool / is_lava / is_pool_or_lava
// is_pool: POOL, MOAT, WATER, or a drawbridge with a moat underneath.
// is_lava: LAVAPOOL, LAVAWALL, or a drawbridge with lava underneath.
export function is_pool(x, y) {
    if (!isok(x, y)) return false;
    const lev = game.level?.at(x, y);
    if (!lev) return false;
    const typ = lev.typ;
    if (typ === POOL || typ === MOAT || typ === WATER) return true;
    return typ === DRAWBRIDGE_UP
        && !Is_juiblex_level(game.u?.uz)
        && ((lev.drawbridgemask | 0) & DB_UNDER) === DB_MOAT;
}
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
export function is_pool_or_lava(x, y) {
    return _is_pool_local(x, y) || _is_lava_local(x, y);
}

// C ref: hack.c:2448-2464 avoid_moving_on_trap(x, y, msg)
// Returns TRUE if there's a known, visible, non-vibrating-square trap at (x, y).
// (RNG-free: only reads trap state.)
export function avoid_moving_on_trap(x, y, msg) {
    const trap = t_at(x, y);
    if (!trap) return false;
    if (!trap.tseen) return false;
    if (trap.ttyp === VIBRATING_SQUARE) return false;
    /* C hack.c:2456-2460 — rushes (run >= 2) report why they stopped. */
    if (msg && game.flags?.mention_walls) {
        set_msg_xy(x, y);
        void pline(`You stop in front of ${an(_trapname_lk(trap.ttyp | 0))}.`);
    }
    return true;
}

// C ref: hack.c:2466-2494 avoid_moving_on_liquid(x, y, msg) — static fn in C
// Returns TRUE if the hero should stop at the edge of a pool/lava.
// RNG-free; reads terrain type, hero flags, and seenv.
export function avoid_moving_on_liquid(x, y, msg) {
    const u = game.u || {};
    const levHere = game.level?.at(u.ux | 0, u.uy | 0);
    const levThere = game.level?.at(x, y);
    if (!levThere) return false;
    /* in_air: Levitation || Flying */
    const levitation = !!(u.uprops?.[LEVITATION]?.intrinsic || u.uprops?.[LEVITATION]?.extrinsic);
    const flying = !!(u.uprops?.[FLYING]?.intrinsic || u.uprops?.[FLYING]?.extrinsic);
    const in_air = levitation || flying;
    /* C hack.c:59-65 Known_wwalking / Known_lwalking.  These are
     * knowledge predicates, not movement properties: the hero only knows
     * water walking when identified water-walking boots are worn (and is not
     * riding), while lava walking additionally requires known fire resistance
     * and boots marked erosion-proof and rust-known. */
    const uarmf = u.uarmf;
    const known_wwalking = !!(uarmf
        && (uarmf.otyp | 0) === 167 /* WATER_WALKING_BOOTS */
        && game._oc_name_known?.[167]
        && !u.usteed);
    const fireRes = u.uprops?.[FIRE_RES];
    const known_lwalking = !!(known_wwalking && fireRes
        && ((fireRes.intrinsic | 0) || (fireRes.extrinsic | 0))
        && !(fireRes.blocked | 0)
        && uarmf.oerodeproof && uarmf.rknown);
    /* C condition: avoid if:
     * NOT ((levl[x][y].typ == levl[u.ux][u.uy].typ
     *       || (context.run < 2 && (!is_lava(x,y) || in_air))
     *       || context.travel)
     *      && (in_air || Known_lwalking || (is_pool(x,y) && Known_wwalking))
     *      && !(IS_WATERWALL || LAVAWALL))
     * AND is_pool_or_lava(x,y) && levl[x][y].seenv */
    const ctx = game.context || {};
    const run = ctx.run | 0;
    const travel = !!ctx.travel;
    const typHere = levHere?.typ ?? ROOM;
    const typThere = levThere.typ;
    const isLavaThere = _is_lava_local(x, y);
    const isPoolThere = _is_pool_local(x, y);
    /* safe conditions */
    const safe_terrain = (typThere === typHere
        || (run < 2 && (!isLavaThere || in_air))
        || travel);
    const safe_protected = (in_air || known_lwalking
        || (isPoolThere && known_wwalking));
    const notWaterwall = !(IS_WATERWALL(typThere) || typThere === LAVAWALL);
    if (safe_terrain && safe_protected && notWaterwall) return false;
    if (is_pool_or_lava(x, y) && levThere.seenv) {
        if (msg && game.flags?.mention_walls) {
            void pline(`You stop at the edge of the ${hliquid(isPoolThere ? 'water' : 'lava')}.`);
        }
        return true;
    }
    return false;
}

// C ref: hack.c:4046-4066 end_running(boolean and_travel)
// Clears context.run, optionally clears travel/travel1/mv, clears multi if > 0.
// WIRE_PENDING: stage-B-run-dispatch — will be called from moveloop_core multi>0 loop.
export function end_running(and_travel) {
    const ctx = game.context;
    if (!ctx) return;
    const wasRunning = !!(ctx.run | 0);
    if (ENV.FF_RUN_TRACE === '1')
        pushRngLogEntry(`^run_end_enter[run=${ctx.run|0} multi=${game.multi|0} move=${ctx.move?1:0} mv=${ctx.mv?1:0} travel=${ctx.travel?1:0} andTravel=${and_travel?1:0} moves=${game.moves|0}]`);
    /* C hack.c:4131-4136 — `if (svc.context.run) { svc.context.run = 0;
     *     if (flags.time) disp.time_botl = TRUE; ... }'.  moveloop_core suppresses
     * the turn counter's status update for the whole run (allmain.c:262), so the
     * stop is what puts the current svm.moves back on the physical line. */
    if (ctx.run | 0) time_botl_run_ended();
    ctx.run = 0;
    /* C hack.c:4141-4143 — only a real run stop with terrainstatus enabled
     * invalidates/reclassifies the status terrain. */
    if (wasRunning && game.flags?.terrainstatus) {
        invalidateTerrainStatus();
        classifyTerrain();
    }
    if (and_travel) {
        ctx.travel = 0;
        ctx.travel1 = 0;
        ctx.mv = 0;
    }
    if (game.gt && game.gt.travelmap)
        game.gt.travelmap = null;
    if ((game.multi | 0) > 0) {
        game.multi = 0;
    }
    if (ENV.FF_RUN_TRACE === '1')
        pushRngLogEntry(`^run_end_exit[run=${ctx.run|0} multi=${game.multi|0} move=${ctx.move?1:0} mv=${ctx.mv?1:0} travel=${ctx.travel?1:0} timeBotl=${game.disp?.time_botl|0} frozen=${game._timeBotlFrozenMoves ?? -1} moves=${game.moves|0}]`);
}

// C ref: hack.c:3814-3975 lookaround(void) — RNG-FREE run-stop predicate.
// Scans the 3×3 neighborhood of the hero and stops the run (nomul(0)) on:
//   - a visible non-safe monster in the path
//   - a known trap ahead
//   - a closed door orthogonally ahead
//   - a pool/lava ahead that would be dangerous
//   - a corridor intersection (corrct > 1 in run==2 mode)
// May rewrite u.dx/u.dy/u.last_str_turn for corridor turns.
// Consumes NO RNG.
// WIRE_PENDING: stage-B-run-dispatch — will be called from moveloop_core multi>0 loop.
export function lookaround() {
    const u = game.u;
    if (!u) return;
    const ctx = game.context || {};

    /* C hack.c:3823-3827 — grid bugs stop if moving diagonal */
    if (NODIAG(u.umonnum | 0) && u.dx && u.dy) {
        nomul(0);
        return;
    }

    /* C hack.c:3829-3830 — Blind or run==0: return without scanning */
    const bp = u.uprops?.[BLINDED];
    const blind = !!bp && !!((bp.intrinsic | 0) || (bp.extrinsic | 0))
        && !(bp.blocked | 0);
    if (blind || !(ctx.run)) return;

    const run = ctx.run | 0;
    const travel = !!ctx.travel;
    const ux = u.ux | 0, uy = u.uy | 0;
    const dx = u.dx | 0, dy = u.dy | 0;

    let corrct = 0, noturn = 0;
    let x0 = 0, y0 = 0, m0 = 1, i0 = 9;

    /* FF_DIRTRACE emit at a STOP exit (a nomul(0); return inside the scan). The
     * tail-of-function emit covers the no-stop / turn-resolution exits; this one
     * covers the early stop returns so the instrument shows the run-STOP cause
     * (e.g. the closed-door stop at hack.c:3884 that ends the run faithfully). */
    const _emitStop = (reason) => {
        if (!_DIRTRACE) return;
        pushRngLogEntry(
            `^ff_dirtrace[moves=${game.moves | 0} ux=${ux} uy=${uy}`
            + ` dxIn=${dx} dyIn=${dy} dxOut=${u.dx | 0} dyOut=${u.dy | 0}`
            + ` run=${run} corrct=${corrct} noturn=${noturn} m0=${m0} i0=${i0}`
            + ` x0=${x0} y0=${y0} lst=${u.last_str_turn | 0}`
            + ` turnGate=0 turnApplied=0 turnI=na stop=1 reason=${reason}]`);
    };

    /* C hack.c:3831-3939: nested x/y loop over 3×3 neighborhood */
    for (let x = ux - 1; x <= ux + 1; x++) {
        for (let y = uy - 1; y <= uy + 1; y++) {
            const infront = (x === ux + dx && y === uy + dy);
            /* ignore out of bounds and hero's own cell */
            if (!isok(x, y) || u_at(x, y)) continue;
            /* grid bugs: ignore diagonals */
            if (NODIAG(u.umonnum | 0) && x !== ux && y !== uy) continue;

            const lev = game.level?.at(x, y);
            if (!lev) continue;
            const typ = lev.typ;

            /* monster check */
            let mtmp = null;
            for (let m = game.fmon; m != null; m = m.nmon) {
                if ((m.mhp | 0) < 1) continue; /* DEADMONSTER — C m_at/MON_AT reads the grid, which m_detach cleared */
                if (m.mx === x && m.my === y) { mtmp = m; break; }
            }
            if (mtmp !== null
                && M_AP_TYPE(mtmp) !== M_AP_FURNITURE
                && M_AP_TYPE(mtmp) !== M_AP_OBJECT
                && mon_visible(mtmp)) {
                /* C hack.c:3849-3855: stop for visible hostile, or infront non-travel */
                if ((run !== 1 && !is_safemon(mtmp))
                    || (infront && !travel)) {
                    /* C hack.c:3853-3855: pline_xy(x, y,
                     *     "%s blocks your path.", upstart(a_monnam(mtmp))).
                     * Amonnam is exactly that naming composition.  pline()'s
                     * normal path updates the topline synchronously, so this
                     * remains a synchronous, RNG-free lookaround stop (apart
                     * from the same display-name stream C may use while
                     * hallucinating). */
                    if (game.flags?.mention_walls) {
                        set_msg_xy(x, y);
                        void pline(`${Amonnam(mtmp)} blocks your path.`);
                    }
                    nomul(0);
                    _emitStop(`monster@${x},${y}:tame${mtmp.mtame | 0}:peace${mtmp.mpeaceful | 0}:infront${infront ? 1 : 0}`);
                    return;
                }
            }

            /* stone is never interesting */
            if (typ === STONE) continue;
            /* skip the square we're moving away from */
            if (x === ux - dx && y === uy - dy) continue;

            /* trap check: avoid_moving_on_trap(x, y, infront && run > 1) */
            if (avoid_moving_on_trap(x, y, infront && run > 1)) {
                if (run === 1) {
                    /* goto bcorr — treat as corridor */
                    const bcorr_res = _bcorr(x, y, ux, uy, dx, dy, run, mtmp,
                        corrct, noturn, i0, x0, y0, m0);
                    corrct = bcorr_res.corrct;
                    noturn = bcorr_res.noturn;
                    i0 = bcorr_res.i0;
                    x0 = bcorr_res.x0;
                    y0 = bcorr_res.y0;
                    m0 = bcorr_res.m0;
                    continue;
                }
                if (infront) {
                    nomul(0);
                    _emitStop('trap-infront');
                    return;
                }
                /* run != 1 and !infront: fall through to the IS_OBSTRUCTED/etc check */
            }

            /* uninteresting terrain: obstructed/room/air/ice */
            if (IS_OBSTRUCTED(typ) || typ === ROOM
                || IS_AIR(typ) || typ === ICE) {
                continue;
            } else if (closed_door(x, y) || (mtmp && is_door_mappear(mtmp))) {
                /* closed door? */
                if (x !== ux && y !== uy) continue; /* ignore if diagonal */
                if (run !== 1 && !travel) {
                    nomul(0);
                    _emitStop('closed-door');
                    return;
                }
                /* orthogonal closed door → treat as corridor (bcorr) */
                const bcorr_res = _bcorr(x, y, ux, uy, dx, dy, run, mtmp,
                    corrct, noturn, i0, x0, y0, m0);
                corrct = bcorr_res.corrct;
                noturn = bcorr_res.noturn;
                i0 = bcorr_res.i0;
                x0 = bcorr_res.x0;
                y0 = bcorr_res.y0;
                m0 = bcorr_res.m0;
                continue;
            } else if (typ === CORR) {
                /* corridor */
                const bcorr_res = _bcorr(x, y, ux, uy, dx, dy, run, mtmp,
                    corrct, noturn, i0, x0, y0, m0);
                corrct = bcorr_res.corrct;
                noturn = bcorr_res.noturn;
                i0 = bcorr_res.i0;
                x0 = bcorr_res.x0;
                y0 = bcorr_res.y0;
                m0 = bcorr_res.m0;
                continue;
            } else if (is_pool_or_lava(x, y)) {
                if (infront && avoid_moving_on_liquid(x, y, true)) {
                    nomul(0);
                    _emitStop('liquid');
                    return;
                }
                continue;
            } else {
                /* e.g. objects, trap, stairs */
                if (run === 1) {
                    const bcorr_res = _bcorr(x, y, ux, uy, dx, dy, run, mtmp,
                        corrct, noturn, i0, x0, y0, m0);
                    corrct = bcorr_res.corrct;
                    noturn = bcorr_res.noturn;
                    i0 = bcorr_res.i0;
                    x0 = bcorr_res.x0;
                    y0 = bcorr_res.y0;
                    m0 = bcorr_res.m0;
                    continue;
                }
                if (run === 8) continue;
                if (mtmp) continue;
                /* off-axis continue checks */
                if (((x === ux - dx) && (y !== uy + dy))
                    || ((y === uy - dy) && (x !== ux + dx)))
                    continue;
                /* fall through to stop */
                nomul(0);
                _emitStop('obstruction');
                return;
            }
        }
    }

    /* C hack.c:3941-3944: corrct > 1 in run==2 → widen corridor → stop */
    if (corrct > 1 && run === 2) {
        nomul(0);
        _emitStop('corridor-widens');
        return;
    }

    /* C hack.c:3946-3974: corridor turn resolution — may rewrite u.dx/u.dy */
    let _turnGate = false, _turnApplied = false, _turnI = null;
    if ((run === 1 || run === 3 || run === 8)
        && !noturn && !m0 && i0
        && (corrct === 1 || (corrct === 2 && i0 === 1))) {
        _turnGate = true;
        let i;
        if (i0 === 2) {
            if (dx === y0 - uy && dy === ux - x0)
                i = 2;  /* straight turn right */
            else
                i = -2; /* straight turn left */
        } else if (dx && dy) {
            if ((dx === dy && y0 === uy) || (dx !== dy && y0 !== uy))
                i = -1; /* half turn left */
            else
                i = 1;  /* half turn right */
        } else {
            if ((x0 - ux === y0 - uy && !dy)
                || (x0 - ux !== y0 - uy && dy))
                i = 1;  /* half turn right */
            else
                i = -1; /* half turn left */
        }
        i += (u.last_str_turn | 0);
        _turnI = i;
        if (i <= 2 && i >= -2) {
            _turnApplied = true;
            u.last_str_turn = i;
            u.dx = x0 - ux;
            u.dy = y0 - uy;
        }
    }
    if (_DIRTRACE) {
        pushRngLogEntry(
            `^ff_dirtrace[moves=${game.moves | 0} ux=${ux} uy=${uy}`
            + ` dxIn=${dx} dyIn=${dy} dxOut=${u.dx | 0} dyOut=${u.dy | 0}`
            + ` run=${run} corrct=${corrct} noturn=${noturn} m0=${m0} i0=${i0}`
            + ` x0=${x0} y0=${y0} lst=${u.last_str_turn | 0}`
            + ` turnGate=${_turnGate ? 1 : 0} turnApplied=${_turnApplied ? 1 : 0}`
            + ` turnI=${_turnI == null ? 'na' : _turnI}`
            + ` stop=${(game.multi | 0) === 0 ? 1 : 0}]`);
    }
}

/* Helper: bcorr block — corridor counting logic (C hack.c:3894-3920).
 * Takes current corridor-tracking state and returns updated state.
 * Returns null to signal "skip this cell" (C's 'continue' from inside bcorr).
 *
 * C uses goto bcorr which jumps into the CORR else-if branch at label bcorr:.
 * The label is at the start of the inner if(typ!=ROOM) block, so all goto bcorr
 * sites run the same logic and then the outer 'continue' at line 3920.
 *
 * Important: when i > 2 inside bcorr, C does 'continue' WITHOUT incrementing
 * corrct.  We signal this by returning the state unchanged (same as skip). */
function _bcorr(x, y, ux, uy, dx, dy, run, mtmp,
    corrct, noturn, i0, x0, y0, m0) {
    /* C hack.c:3895: if (levl[u.ux][u.uy].typ != ROOM) — hero is in corridor */
    const levHero = game.level?.at(ux, uy);
    if (levHero && levHero.typ !== ROOM) {
        /* running or traveling: run==1/3/8 */
        if (run === 1 || run === 3 || run === 8) {
            /* i = dist2(x, y, u.ux+u.dx, u.uy+u.dy) */
            const i = dist2(x, y, ux + dx, uy + dy);
            /* C: if (i > 2) continue — skip cell, do NOT increment corrct */
            if (i > 2) {
                return { corrct, noturn, i0, x0, y0, m0 };
            }
            /* mark noturn if this corridor is not orthogonally next to prev */
            if (corrct === 1 && dist2(x, y, x0, y0) !== 1)
                noturn = 1;
            /* prefer the closer/orthogonal option */
            if (i < i0) {
                i0 = i;
                x0 = x;
                y0 = y;
                m0 = mtmp ? 1 : 0;
            }
        }
        corrct++;
    }
    return { corrct, noturn, i0, x0, y0, m0 };
}
