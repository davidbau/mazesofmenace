// dbridge.js — Drawbridge find / open / close / destroy + entity driver.
// C ref: dbridge.c is_drawbridge_wall / find_drawbridge /
//        get_wall_for_db / open_drawbridge / close_drawbridge /
//        destroy_drawbridge; invent.c delallobj (open/close).
// Envelope (D-0959/D-0977/D-1967): terrain + messages + wake + trap/engr
// clear + vision/stronghold flags; dig furniture_handled / dighole;
// music passtune open/close.
// Entity family: e_at / m_to_e / u_to_e / set_entity / is_u /
// e_canseemon / e_nam / E_phrase / automiss / e_survives_at / e_missed /
// e_jumps / e_died / do_entity / nokiller live in C order (dbridge.c
// :340–769; imports.mjs --can: monsters/rng/pickup/steed/trap/teleport/
// end/mhitm/uhitm/hack/sndprocs/region/mondata/eat/attrib all SAFE —
// same 89-module SCC, hoisted function declarations, no top-level TDZ).
// Named omit: revive_nasty; scatter iron-chain debris rn2 loop;
// flooreffects body (boulder → delobj in liquid); Blind/Unaware You_see
// polish; debugpline D_DEBUG-only lines.

import { game } from './gstate.js';
import { pline, newsym, canseemon, Hallucination, canspotmon } from './display.js';
import { cansee, recalc_block_point, vision_recalc } from './vision.js';
import { obj_extract_self, delobj, objects_at } from './mkobj.js';
import { m_at } from './mon.js';
import {
    mons, is_flyer, is_floater, is_swimmer, likes_lava, noncorporeal,
    passes_walls, amphibious, breathless,
} from './monsters.js';
import { t_at, deltrap, drown, lava_effects } from './trap.js';
import { del_engr_at } from './engrave.js';
import { hliquid, mon_nam, Monnam } from './do_name.js';
import { mhe } from './mondata.js';
import { vtense } from './objnam.js';
import { objectNames } from './generated/objects_data.js';
import { PM_LONG_WORM_TAIL } from './generated/monsters_data.js';
import { se_crushing_sound, se_splash } from './generated/seffects_data.js';
import { Soundeffect } from './sndprocs.js';
import { rnd } from './rng.js';
import { is_pool, is_lava } from './hack.js';
import { spoteffects } from './pickup.js';
import { remove_monster, place_monster } from './steed.js';
import { update_monster_region } from './region.js';
import { enexto, teleds } from './teleport.js';
import { done } from './end.js';
import { monkilled } from './mhitm.js';
import { xkilled } from './uhitm.js';
import { Unaware } from './eat.js';
import { Fumbling } from './attrib.js';
import { dist2 } from './hacklib.js';
import { unpunish } from './read.js';
import {
    isok, u_at, ENTITIES, IS_DRAWBRIDGE, DRAWBRIDGE_UP, DRAWBRIDGE_DOWN,
    DB_NORTH, DB_SOUTH, DB_EAST, DB_WEST, DB_DIR, DB_MOAT, DB_LAVA, DB_ICE,
    DB_UNDER, W_NONDIGGABLE,
    DOOR, D_NODOOR, DBWALL, MOAT, LAVAPOOL, ROOM, ICE, ICED_MOAT,
    Is_stronghold, Is_waterlevel,
    XKILL_GIVEMSG, XKILL_NOMSG, XKILL_NOCORPSE, XKILL_NOCONDUCT,
    CRUSHING, DROWNING, BURNING, NO_KILLER_PREFIX, KILLED_BY_AN,
    TELEDS_NO_FLAGS,
    LEVITATION, FLYING, WWALKING, SWIMMING, MAGICAL_BREATHING, PASSES_WALLS,
    CONFUSION, STUNNED,
} from './const.js';

const BOULDER = objectNames.indexOf('BOULDER');

/** C ref: pline.c You_hear — acoustics/Deaf; Unaware/Underwater deferred. */
async function You_hear(line) {
    const u = game.u || {};
    if (u.Deaf || game.flags?.acoustics === false) return;
    await pline(`You hear ${line}`);
}

/**
 * C ref: pline.c You_see — "You see " prefix; Blind→sense / Unaware deferred.
 */
async function You_see(line) {
    const u = game.u || {};
    const blind = !!((u.HBlinded | 0) || (u.EBlinded | 0) || u.Blind);
    if (blind) await pline(`You sense ${line}`);
    else await pline(`You see ${line}`);
}

/** C ref: distu — squared distance from hero. */
function distu(x, y) {
    const u = game.u || {};
    return dist2(u.ux | 0, u.uy | 0, x | 0, y | 0);
}

/**
 * C ref: invent.c delallobj — destroy floor pile at (x,y) for drawbridge.
 * Named omit: none beyond delobj invocation-item resist path.
 */
function delallobj(x, y) {
    const u = game.u || {};
    let otmp = objects_at(x, y);
    while (otmp) {
        if (otmp === u.uball) unpunish();
        // after unpunish(), or might get deallocated chain
        const otmp2 = otmp.nexthere;
        if (otmp === u.uchain) {
            otmp = otmp2;
            continue;
        }
        delobj(otmp);
        otmp = otmp2;
    }
}

/** C ref: mon.c wake_nearto — clear sleep/wait within dist2 (no RNG). */
function wake_nearto(x, y, distance) {
    for (const mtmp of game.fmon || []) {
        if (!mtmp || mtmp.mx == null) continue;
        const dx = (mtmp.mx | 0) - (x | 0);
        const dy = (mtmp.my | 0) - (y | 0);
        if (distance === 0 || dx * dx + dy * dy < distance) {
            mtmp.msleeping = 0;
            if (mtmp.mstrategy != null) mtmp.mstrategy &= ~0x01;
        }
    }
}

/** C ref: mkobj.c sobj_at — first floor object of otyp at (x,y). */
function sobj_at(otyp, x, y) {
    for (let o = objects_at(x, y); o; o = o.nexthere) {
        if ((o.otyp | 0) === (otyp | 0)) return o;
    }
    return null;
}

/**
 * C ref: dbridge.c is_drawbridge_wall — DB dir if (x,y) is portcullis
 * DOOR/DBWALL adjacent to a drawbridge, else -1.
 */
export function is_drawbridge_wall(x, y) {
    if (!isok(x, y)) return -1;
    const lev = game.level?.at(x, y);
    if (!lev) return -1;
    if (lev.typ !== DOOR && lev.typ !== DBWALL) return -1;

    const e = game.level.at(x + 1, y);
    if (e && IS_DRAWBRIDGE(e.typ)
        && ((e.drawbridgemask | 0) & DB_DIR) === DB_WEST) {
        return DB_WEST;
    }
    const w = game.level.at(x - 1, y);
    if (w && IS_DRAWBRIDGE(w.typ)
        && ((w.drawbridgemask | 0) & DB_DIR) === DB_EAST) {
        return DB_EAST;
    }
    const n = game.level.at(x, y - 1);
    if (n && IS_DRAWBRIDGE(n.typ)
        && ((n.drawbridgemask | 0) & DB_DIR) === DB_SOUTH) {
        return DB_SOUTH;
    }
    const s = game.level.at(x, y + 1);
    if (s && IS_DRAWBRIDGE(s.typ)
        && ((s.drawbridgemask | 0) & DB_DIR) === DB_NORTH) {
        return DB_NORTH;
    }
    return -1;
}

/**
 * C ref: dbridge.c is_db_wall :169–173 — closed portcullis (typ == DBWALL).
 * Callers: zap.c zap_updown WAN_OPENING / WAN_STRIKING / WAN_LOCKING;
 * lock/hack/dig named.
 */
export function is_db_wall(x, y) {
    return (game.level?.at(x, y)?.typ | 0) === DBWALL;
}

/**
 * C ref: dbridge.c find_drawbridge — if (xy) is bridge or wall, set to
 * bridge coords and return true.
 * @param {{x:number,y:number}} xy mutable
 */
export function find_drawbridge(xy) {
    const lev = game.level?.at(xy.x, xy.y);
    if (lev && IS_DRAWBRIDGE(lev.typ)) return true;
    const dir = is_drawbridge_wall(xy.x, xy.y);
    if (dir >= 0) {
        switch (dir) {
        case DB_NORTH: xy.y++; break;
        case DB_SOUTH: xy.y--; break;
        case DB_EAST: xy.x--; break;
        case DB_WEST: xy.x++; break;
        }
        return true;
    }
    return false;
}

/**
 * C ref: dbridge.c get_wall_for_db — move (xy) from bridge to wall cell.
 * @param {{x:number,y:number}} xy mutable
 */
export function get_wall_for_db(xy) {
    const lev = game.level?.at(xy.x, xy.y);
    const dir = (lev?.drawbridgemask | 0) & DB_DIR;
    switch (dir) {
    case DB_NORTH: xy.y--; break;
    case DB_SOUTH: xy.y++; break;
    case DB_EAST: xy.x++; break;
    case DB_WEST: xy.x--; break;
    }
}

/**
 * C ref: decl.c occupants zero-init — C `go.occupants` (instance_globals_o
 * `struct entity occupants[ENTITIES]`, `{ { 0 } }`) lives on `game` here,
 * lazily zeroed to ENTITIES records.
 */
function occupants() {
    let occ = game.occupants;
    if (!Array.isArray(occ) || occ.length !== ENTITIES) {
        occ = [];
        for (let i = 0; i < ENTITIES; i++) {
            occ.push({ emon: null, edata: null, ex: 0, ey: 0 });
        }
        game.occupants = occ;
    }
    return occ;
}

/**
 * C ref: dbridge.c e_at `:286–301` — first valid occupant record at
 * (x,y), else null. C `debugpline1` is D_DEBUG-only, omitted.
 */
export function e_at(x, y) {
    const occ = occupants();
    for (let entitycnt = 0; entitycnt < ENTITIES; entitycnt++) {
        if (occ[entitycnt].edata
            && (occ[entitycnt].ex | 0) === (x | 0)
            && (occ[entitycnt].ey | 0) === (y | 0)) {
            return occ[entitycnt];
        }
    }
    return null;
}

/**
 * C ref: dbridge.c m_to_e `:304–319` — fill etmp from the monster at
 * (x,y), or clear it when mtmp is null. Worm-tail edata when the
 * recorded square differs from the worm head (C `&mons[PM_LONG_WORM_TAIL]`).
 */
export function m_to_e(mtmp, x, y, etmp) {
    etmp.emon = mtmp;
    if (mtmp) {
        etmp.ex = x | 0;
        etmp.ey = y | 0;
        if (mtmp.wormno && ((x | 0) !== (mtmp.mx | 0) || (y | 0) !== (mtmp.my | 0))) {
            etmp.edata = mons(PM_LONG_WORM_TAIL);
        } else {
            etmp.edata = mtmp.data;
        }
    } else {
        etmp.edata = null;
        etmp.ex = etmp.ey = 0;
    }
}

/**
 * C ref: dbridge.c u_to_e `:321–328` — fill etmp from the hero
 * (C `&gy.youmonst`, `u.ux/u.uy`, `gy.youmonst.data`).
 */
export function u_to_e(etmp) {
    const u = game.u || {};
    etmp.emon = game.youmonst;
    etmp.ex = u.ux | 0;
    etmp.ey = u.uy | 0;
    etmp.edata = game.youmonst ? game.youmonst.data : null;
}

/**
 * C ref: dbridge.c set_entity `:330–339` — record whoever is at the
 * span/portcullis square into etmp. C notes `m_at()` may yield null
 * and that is fine (m_to_e clears the record then).
 */
export function set_entity(x, y, etmp) {
    if (u_at(x, y)) {
        u_to_e(etmp);
    } else {
        m_to_e(m_at(x, y), x, y, etmp);
    }
}

/**
 * C ref: dbridge.c is_u macro `:341` — the occupant is the hero
 * (C `etmp->emon == &gy.youmonst`, pointer identity).
 */
export function is_u(etmp) {
    return etmp.emon === game.youmonst;
}

/**
 * C ref: dbridge.c e_canseemon macro `:342` — hero always, else
 * C `canseemon(etmp->emon)`.
 */
export function e_canseemon(etmp) {
    return is_u(etmp) || canseemon(etmp.emon);
}

/**
 * C ref: dbridge.c e_nam `:351–355` — "you" for the hero, else
 * C `mon_nam(etmp->emon)`.
 */
export function e_nam(etmp) {
    return is_u(etmp) ? 'you' : mon_nam(etmp.emon);
}

/**
 * C ref: dbridge.c E_phrase `:361–377` — capitalized entity name plus an
 * optional verb, 2nd→3rd person converted for monsters (C `vtense` with a
 * null subject). C writes a static 80-char buffer; JS returns the string
 * (callers consume it immediately in pline args).
 */
export function E_phrase(etmp, verb) {
    let s = is_u(etmp) ? 'You' : Monnam(etmp.emon);
    if (!verb || !verb[0]) return s;
    s += ' ';
    s += is_u(etmp) ? verb : vtense(null, verb);
    return s;
}

/** C ref: youprop.h Passes_walls — H||E ≡ uprops[PASSES_WALLS] (D-1967 local; teleport.js keeps its own). */
function hero_Passes_walls() {
    const u = game.u || {};
    const p = u.uprops?.[PASSES_WALLS];
    return !!((u.HPasses_walls | 0) || (u.EPasses_walls | 0)
        || (p?.intrinsic | 0) || (p?.extrinsic | 0));
}

/** C ref: youprop.h Wwalking — (HW||EW) && !Is_waterlevel (D-1967 local). */
function hero_Wwalking() {
    const u = game.u || {};
    const p = u.uprops?.[WWALKING];
    const he = ((u.HWwalking | 0) || (u.EWwalking | 0)
        || (p?.intrinsic | 0) || (p?.extrinsic | 0));
    return !!(he && !Is_waterlevel(u.uz));
}

/** C ref: youprop.h Swimming — H||E||steed is_swimmer (D-1967 local). */
function hero_Swimming() {
    const u = game.u || {};
    const p = u.uprops?.[SWIMMING];
    if ((u.HSwimming | 0) || (u.ESwimming | 0)
        || (p?.intrinsic | 0) || (p?.extrinsic | 0)) return true;
    return !!(u.usteed && is_swimmer(u.usteed.data));
}

/** C ref: youprop.h Amphibious — HMagical_breathing||E||amphibious(data) (D-1967 local). */
function hero_Amphibious() {
    const u = game.u || {};
    const p = u.uprops?.[MAGICAL_BREATHING];
    if ((u.HMagical_breathing | 0) || (u.EMagical_breathing | 0)
        || (p?.intrinsic | 0) || (p?.extrinsic | 0)) return true;
    return amphibious(game.youmonst?.data);
}

/** C ref: youprop.h Breathless — HMagical_breathing||E||breathless(data) (D-1967 local). */
function hero_Breathless() {
    const u = game.u || {};
    const p = u.uprops?.[MAGICAL_BREATHING];
    if ((u.HMagical_breathing | 0) || (u.EMagical_breathing | 0)
        || (p?.intrinsic | 0) || (p?.extrinsic | 0)) return true;
    return breathless(game.youmonst?.data);
}

/** C ref: youprop.h Flying — (H||E||steed is_flyer) && !BFlying (D-1967 local). */
function hero_Flying() {
    const u = game.u || {};
    const p = u.uprops?.[FLYING];
    const blocked = (u.BFlying | 0) || (p?.blocked | 0);
    const steedFlyer = !!(u.usteed && is_flyer(u.usteed.data));
    const he = ((u.HFlying | 0) || (u.EFlying | 0)
        || (p?.intrinsic | 0) || (p?.extrinsic | 0) || steedFlyer);
    return !!(he && !blocked);
}

/** C ref: youprop.h Levitation — (H||E) && !B (D-1967 local). */
function hero_Levitation() {
    const u = game.u || {};
    const p = u.uprops?.[LEVITATION];
    const blocked = (u.BLevitation | 0) || (p?.blocked | 0);
    const he = ((u.HLevitation | 0) || (u.ELevitation | 0)
        || (p?.intrinsic | 0) || (p?.extrinsic | 0));
    return !!(he && !blocked);
}

/** C ref: youprop.h Deaf — HDeaf||EDeaf||u.Deaf||uroleplay.deaf (D-1967 local). */
function hero_Deaf() {
    const u = game.u || {};
    return !!((u.HDeaf | 0) || (u.EDeaf | 0) || u.Deaf || u.uroleplay?.deaf);
}

/** C ref: youprop.h Confusion ≡ HConfusion (D-1967 local). */
function hero_Confusion() {
    const u = game.u || {};
    return !!((u.HConfusion | 0) || (u.Confusion | 0)
        || (u.uprops?.[CONFUSION]?.intrinsic | 0));
}

/** C ref: youprop.h Stunned ≡ HStun (D-1967 local). */
function hero_Stunned() {
    const u = game.u || {};
    return !!((u.HStun | 0) || (u.Stunned | 0)
        || (u.uprops?.[STUNNED]?.intrinsic | 0));
}

/** C ref: monst.h helpless — msleeping || !mcanmove (inline, no clone). */
function helpless_mon(mon) {
    return !!(mon && (mon.msleeping || !mon.mcanmove));
}

/**
 * C ref: dbridge.c automiss `:486–490` — passes-walls or noncorporeal
 * are never directly affected by bridge/portcullis.
 */
export function automiss(etmp) {
    return !!((is_u(etmp) ? hero_Passes_walls() : passes_walls(etmp.edata))
        || noncorporeal(etmp.edata));
}

/**
 * C ref: dbridge.c e_survives_at `:380–399` — simple-minded can-it-be-here.
 * C order: noncorporeal → pool → lava → db_wall → TRUE. The lava arm
 * forces lava_effects via e_died when is_u (see e_died).
 */
export function e_survives_at(etmp, x, y) {
    if (noncorporeal(etmp.edata)) return true;
    if (is_pool(x, y)) {
        return !!((is_u(etmp)
            && (hero_Wwalking() || hero_Amphibious() || hero_Breathless()
                || hero_Swimming() || hero_Flying() || hero_Levitation()))
            || is_swimmer(etmp.edata)
            || is_flyer(etmp.edata)
            || is_floater(etmp.edata));
    }
    if (is_lava(x, y)) {
        return !!((is_u(etmp) && (hero_Levitation() || hero_Flying()))
            || likes_lava(etmp.edata)
            || is_flyer(etmp.edata));
    }
    if (is_db_wall(x, y)) {
        return !!(is_u(etmp) ? hero_Passes_walls() : passes_walls(etmp.edata));
    }
    return true;
}

/**
 * C ref: dbridge.c e_died `:402–480` — kill whoever was on the bridge.
 * Hero DROWNING/BURNING clear killer (drown/lava_effects set their own)
 * else default "falling drawbridge" when empty, then done() plus the
 * enexto/teleds force-teleport rescue when the corpse square is still
 * unsurvivable. Monster arm picks monkilled (mon_moving) vs xkilled
 * (you caused it) with AD_DGST when NOCORPSE else AD_PHYS, then the
 * life-saved re-kill with NOMSG|NOCONDUCT and the worm-tail edata clear.
 * Async: drown/lava_effects/done/monkilled/xkilled/pline/teleds can
 * reach nhgetch. C monattk.h AD_PHYS=0, AD_DGST=26 cited inline.
 */
export async function e_died(etmp, xkill_flags, how) {
    const AD_PHYS = 0;
    const AD_DGST = 26;
    if (is_u(etmp)) {
        if ((how | 0) === DROWNING) {
            if (!game.killer) game.killer = { name: '', format: 0 };
            game.killer.name = '';
            await drown();
        } else if ((how | 0) === BURNING) {
            if (!game.killer) game.killer = { name: '', format: 0 };
            game.killer.name = '';
            await lava_effects();
        } else {
            if (!game.killer) game.killer = { name: '', format: 0 };
            if (!game.killer.name) {
                game.killer.format = KILLED_BY_AN;
                game.killer.name = 'falling drawbridge';
            }
            await done(how | 0);
            if (!e_survives_at(etmp, etmp.ex | 0, etmp.ey | 0)) {
                const cc = { x: 0, y: 0 };
                if (enexto(cc, etmp.ex | 0, etmp.ey | 0, etmp.edata)) {
                    await pline(`A ${Hallucination() ? 'normal' : 'strange'} force teleports you away...`);
                    await teleds(cc.x | 0, cc.y | 0, TELEDS_NO_FLAGS);
                }
            }
        }
        const u = game.u || {};
        etmp.ex = u.ux | 0;
        etmp.ey = u.uy | 0;
    } else {
        if (!game.killer) game.killer = { name: '', format: 0 };
        game.killer.name = '';
        const mk_message = ((xkill_flags & XKILL_NOMSG) !== 0) ? null : '';
        const mk_corpse = ((xkill_flags & XKILL_NOCORPSE) !== 0) ? AD_DGST : AD_PHYS;
        if (game.context?.mon_moving) await monkilled(etmp.emon, mk_message, mk_corpse);
        else await xkilled(etmp.emon, xkill_flags | 0);
        if (!((etmp.emon?.mhp | 0) < 1)) {
            const seeit = canspotmon(etmp.emon);
            xkill_flags = (xkill_flags | 0) | XKILL_NOMSG | XKILL_NOCONDUCT;
            const mk_corpse2 = ((xkill_flags & XKILL_NOCORPSE) !== 0) ? AD_DGST : AD_PHYS;
            if (game.context?.mon_moving) await monkilled(etmp.emon, '', mk_corpse2);
            else await xkilled(etmp.emon, xkill_flags);
            if ((etmp.emon?.mhp | 0) < 1) {
                if (seeit) await pline(`Unfortunately for ${mon_nam(etmp.emon)}, ${mhe(etmp.emon)} is still crushed.`);
            }
        }
        etmp.edata = null;
        const occ = occupants();
        for (let entitycnt = 0; entitycnt < ENTITIES; entitycnt++) {
            if (etmp !== occ[entitycnt] && etmp.emon === occ[entitycnt].emon) {
                occ[entitycnt].edata = null;
            }
        }
    }
}

/**
 * C ref: dbridge.c e_missed `:496–525` — does the falling bridge miss?
 * C order: automiss → flyer(5/8, needs mobility) → floater/Levitation(3)
 * → chunks+pool(2) → 0, then db_wall −3, then misses >= rnd(8).
 * debugpline omitted (D_DEBUG-only). rnd is sync core stream.
 */
export function e_missed(etmp, chunks) {
    let misses;
    if (automiss(etmp)) return true;
    if (is_flyer(etmp.edata)
        && (is_u(etmp) ? !Unaware() : !helpless_mon(etmp.emon))) misses = 5;
    else if (is_floater(etmp.edata) || (is_u(etmp) && hero_Levitation())) misses = 3;
    else if (chunks && is_pool(etmp.ex | 0, etmp.ey | 0)) misses = 2;
    else misses = 0;
    if (is_db_wall(etmp.ex | 0, etmp.ey | 0)) misses -= 3;
    return misses >= rnd(8);
}

/**
 * C ref: dbridge.c e_jumps `:531–551` — can etmp jump from death?
 * C order: immobile → FALSE (Unaware||Fumbling hero; helpless/!mmove/
 * wormno monster), Confusion −2, Stunned −3, db_wall −2, tmp >= rnd(10).
 */
export function e_jumps(etmp) {
    let tmp = 4;
    if (is_u(etmp) ? (Unaware() || Fumbling())
        : (helpless_mon(etmp.emon) || !(etmp.edata?.mmove | 0) || etmp.emon?.wormno)) {
        return false;
    }
    if (is_u(etmp) ? hero_Confusion() : etmp.emon?.mconf) tmp -= 2;
    if (is_u(etmp) ? hero_Stunned() : etmp.emon?.mstun) tmp -= 3;
    if (is_db_wall(etmp.ex | 0, etmp.ey | 0)) tmp -= 2;
    return tmp >= rnd(10);
}

/**
 * C ref: dbridge.c do_entity `:554–759` — crush/jump head: automiss ride,
 * e_missed branch (portcullis-miss pline vs drawbridge debugpline), the
 * DRAWBRIDGE_DOWN crush with NO_KILLER_PREFIX "crushed to death
 * underneath a drawbridge", and the must_jump portcullis e_jumps split
 * (relocate on success, "crushed by the falling portcullis" + crushing
 * sound on failure). Async: pline/You_hear/spoteffects/e_died can reach
 * nhgetch. Short-circuit, RNG (rnd via e_missed/e_jumps) and killer
 * order preserved. debugpline D_DEBUG-only omitted.
 */
export async function do_entity(etmp) {
    let must_jump = false;
    let relocates = false;
    let e_inview;
    if (!etmp?.edata) return;
    e_inview = e_canseemon(etmp);
    const oldx = etmp.ex | 0;
    const oldy = etmp.ey | 0;
    const at_portcullis = is_db_wall(oldx, oldy);
    const crm = game.level?.at(oldx, oldy);
    if (automiss(etmp) && e_survives_at(etmp, oldx, oldy)) {
        if (e_inview && (at_portcullis || (crm && IS_DRAWBRIDGE(crm.typ | 0)))) {
            await pline(`The ${at_portcullis ? 'portcullis' : 'drawbridge'} passes through ${e_nam(etmp)}!`);
        }
        if (is_u(etmp)) await spoteffects(false);
        return;
    }
    if (e_missed(etmp, false)) {
        if (at_portcullis) {
            await pline(`The portcullis misses ${e_nam(etmp)}!`);
        }
        if (e_survives_at(etmp, oldx, oldy)) {
            return;
        } else {
            if (at_portcullis) must_jump = true;
            else relocates = true;
        }
    } else {
        if ((crm?.typ | 0) === DRAWBRIDGE_DOWN) {
            if (is_u(etmp)) {
                if (!game.killer) game.killer = { name: '', format: 0 };
                game.killer.format = NO_KILLER_PREFIX;
                game.killer.name = 'crushed to death underneath a drawbridge';
            }
            await pline(`${E_phrase(etmp, 'are')} crushed underneath the drawbridge.`);
            await e_died(
                etmp,
                (XKILL_NOCORPSE | 0) | (e_inview ? XKILL_GIVEMSG : XKILL_NOMSG),
                CRUSHING,
            );
            return;
        }
        must_jump = true;
    }
    if (must_jump) {
        if (at_portcullis) {
            if (e_jumps(etmp)) {
                relocates = true;
            } else {
                if (e_inview) {
                    await pline(`${E_phrase(etmp, 'are')} crushed by the falling portcullis!`);
                } else if (!hero_Deaf()) {
                    Soundeffect(se_crushing_sound, 100);
                    await You_hear('a crushing sound.');
                }
                await e_died(
                    etmp,
                    (XKILL_NOCORPSE | 0) | (e_inview ? XKILL_GIVEMSG : XKILL_NOMSG),
                    CRUSHING,
                );
                return;
            }
        } else {
            relocates = !e_jumps(etmp);
        }
    }
    let newx = oldx;
    let newy = oldy;
    {
        const pt = { x: newx, y: newy };
        find_drawbridge(pt);
        newx = pt.x | 0;
        newy = pt.y | 0;
    }
    if (newx === oldx && newy === oldy) {
        const pt = { x: newx, y: newy };
        get_wall_for_db(pt);
        newx = pt.x | 0;
        newy = pt.y | 0;
    }
    if (relocates && e_at(newx, newy)) {
        const other = e_at(newx, newy);
        if (e_survives_at(other, newx, newy) && automiss(other)) {
            relocates = false;
        } else {
            while (e_at(newx, newy) !== null && e_at(newx, newy) !== etmp) {
                await do_entity(other);
            }
            if (e_at(oldx, oldy) !== etmp) return;
        }
    }
    if (relocates && !e_at(newx, newy)) {
        if (!is_u(etmp)) {
            remove_monster(etmp.ex | 0, etmp.ey | 0);
            place_monster(etmp.emon, newx, newy);
            update_monster_region(etmp.emon);
        } else {
            game.u.ux = newx;
            game.u.uy = newy;
        }
        etmp.ex = newx;
        etmp.ey = newy;
        e_inview = e_canseemon(etmp);
    }
    if (is_db_wall(etmp.ex | 0, etmp.ey | 0)) {
        if (e_inview) {
            if (is_u(etmp)) {
                await pline('You tumble towards the closed portcullis!');
                if (automiss(etmp)) await pline('You pass through it!');
                else await pline('The drawbridge closes in...');
            } else {
                await pline(`${E_phrase(etmp, 'disappear')} behind the drawbridge.`);
            }
        }
        if (!e_survives_at(etmp, etmp.ex | 0, etmp.ey | 0)) {
            if (!game.killer) game.killer = { name: '', format: 0 };
            game.killer.format = KILLED_BY_AN;
            game.killer.name = 'closing drawbridge';
            await e_died(etmp, XKILL_NOMSG, CRUSHING);
            return;
        }
    } else {
        if (is_pool(etmp.ex | 0, etmp.ey | 0) && !e_inview) {
            if (!hero_Deaf()) {
                Soundeffect(se_splash, 100);
                await You_hear('a splash.');
            }
        }
        if (e_survives_at(etmp, etmp.ex | 0, etmp.ey | 0)) {
            if (e_inview && !is_flyer(etmp.edata) && !is_floater(etmp.edata)) {
                await pline(`${E_phrase(etmp, 'fall')} from the bridge.`);
            }
            return;
        }
        if (is_pool(etmp.ex | 0, etmp.ey | 0) || is_lava(etmp.ex | 0, etmp.ey | 0)) {
            if (e_inview && !is_u(etmp)) {
                const lava = is_lava(etmp.ex | 0, etmp.ey | 0);
                if (Hallucination()) {
                    await pline(`${E_phrase(etmp, 'drink')} the ${lava ? 'lava' : 'moat'} and disappears.`);
                } else {
                    await pline(`${E_phrase(etmp, 'fall')} into the ${lava ? hliquid('lava') : 'moat'}.`);
                }
            }
        }
        if (!game.killer) game.killer = { name: '', format: 0 };
        game.killer.format = NO_KILLER_PREFIX;
        game.killer.name = 'fell from a drawbridge';
        await e_died(
            etmp,
            (XKILL_NOCORPSE | 0) | (e_inview ? XKILL_GIVEMSG : XKILL_NOMSG),
            is_pool(etmp.ex | 0, etmp.ey | 0) ? DROWNING
                : is_lava(etmp.ex | 0, etmp.ey | 0) ? BURNING
                    : CRUSHING,
        );
        return;
    }
}

/**
 * C ref: dbridge.c nokiller `:763–769` — clear stale killer plus both
 * entity records before returning from open/close/destroy.
 */
export function nokiller() {
    if (!game.killer) game.killer = { name: '', format: 0, next: null };
    game.killer.name = '';
    game.killer.format = 0;
    const occ = occupants();
    m_to_e(null, 0, 0, occ[0]);
    m_to_e(null, 0, 0, occ[1]);
}

/**
 * C ref: dbridge.c close_drawbridge — raise bridge at (x,y).
 * Terrain + messages + delallobj + traps/engr + vision. Crush/entity
 * and revive_nasty deferred (named omit).
 */
export async function close_drawbridge(x, y) {
    const lev1 = game.level?.at(x, y);
    if (!lev1 || lev1.typ !== DRAWBRIDGE_DOWN) return;

    const wall = { x: x | 0, y: y | 0 };
    get_wall_for_db(wall);
    const x2 = wall.x | 0;
    const y2 = wall.y | 0;
    const lev2 = game.level?.at(x2, y2);
    if (!lev2) return;

    const u = game.u || {};
    if (cansee(x, y) || cansee(x2, y2)) {
        const coming = (((u.ux | 0) === (x | 0) || (u.uy | 0) === (y | 0))
                && !u.Underwater)
            || distu(x2, y2) < distu(x, y);
        await You_see(`a drawbridge ${coming ? 'coming' : 'going'} up!`);
    } else {
        await You_hear('chains rattling and gears turning.');
    }

    lev1.typ = DRAWBRIDGE_UP;
    lev2.typ = DBWALL;
    switch ((lev1.drawbridgemask | 0) & DB_DIR) {
    case DB_NORTH:
    case DB_SOUTH:
        lev2.horizontal = true;
        break;
    case DB_WEST:
    case DB_EAST:
        lev2.horizontal = false;
        break;
    }
    lev2.wall_info = (lev2.wall_info | 0) | W_NONDIGGABLE;
    // set_entity / do_entity deferred

    if (objects_at(x, y) && !(u.Deaf || game.flags?.acoustics === false)) {
        await You_hear('smashing and crushing.');
    }
    // revive_nasty deferred
    delallobj(x, y);
    delallobj(x2, y2);
    {
        const t = t_at(x, y);
        if (t) deltrap(t);
    }
    {
        const t = t_at(x2, y2);
        if (t) deltrap(t);
    }
    del_engr_at(x, y);
    del_engr_at(x2, y2);
    newsym(x, y);
    newsym(x2, y2);
    recalc_block_point(x2, y2); // C block_point
    vision_recalc(0);
    // nokiller deferred
}

/**
 * C ref: dbridge.c open_drawbridge — lower bridge at (x,y).
 * Terrain + messages + delallobj + traps/engr + vision + stronghold
 * uopened_dbridge. Crush/entity and revive_nasty deferred.
 */
export async function open_drawbridge(x, y) {
    const lev1 = game.level?.at(x, y);
    if (!lev1 || lev1.typ !== DRAWBRIDGE_UP) return;

    const wall = { x: x | 0, y: y | 0 };
    get_wall_for_db(wall);
    const x2 = wall.x | 0;
    const y2 = wall.y | 0;
    const lev2 = game.level?.at(x2, y2);
    if (!lev2) return;

    if (cansee(x, y) || cansee(x2, y2)) {
        const going = distu(x2, y2) < distu(x, y);
        await You_see(`a drawbridge ${going ? 'going' : 'coming'} down!`);
    } else {
        await You_hear('gears turning and chains rattling.');
    }

    lev1.typ = DRAWBRIDGE_DOWN;
    lev2.typ = DOOR;
    lev2.doormask = D_NODOOR;
    // set_entity / do_entity deferred

    // revive_nasty deferred
    delallobj(x, y);
    {
        const t = t_at(x, y);
        if (t) deltrap(t);
    }
    {
        const t = t_at(x2, y2);
        if (t) deltrap(t);
    }
    del_engr_at(x, y);
    del_engr_at(x2, y2);
    newsym(x, y);
    newsym(x2, y2);
    recalc_block_point(x2, y2); // C unblock_point — JS rebuilds
    vision_recalc(0);
    if (Is_stronghold(game.u?.uz)) {
        const uu = game.u || {};
        if (!uu.uevent) uu.uevent = {};
        uu.uevent.uopened_dbridge = true;
    }
    // nokiller deferred
}

/**
 * C ref: dbridge.c destroy_drawbridge — collapse bridge at (x,y).
 * Terrain + messages + wake + clear traps/engr + vision + stronghold
 * flags. Crush/entity and iron-chain scatter deferred (named omit).
 */
export async function destroy_drawbridge(x, y) {
    const lev1 = game.level?.at(x, y);
    if (!lev1 || !IS_DRAWBRIDGE(lev1.typ)) return;

    const wall = { x: x | 0, y: y | 0 };
    get_wall_for_db(wall);
    const x2 = wall.x | 0;
    const y2 = wall.y | 0;
    const lev2 = game.level?.at(x2, y2);
    if (!lev2) return;

    // C: (mask & DB_UNDER) == DB_MOAT || == DB_LAVA (DB_MOAT is 0).
    const underBits = (lev1.drawbridgemask | 0) & DB_UNDER;
    const isMoatOrLava = underBits === DB_MOAT || underBits === DB_LAVA;

    if (isMoatOrLava) {
        const lava = underBits === DB_LAVA;
        if (lev1.typ === DRAWBRIDGE_UP) {
            if (cansee(x2, y2) || u_at(x2, y2)) {
                await pline(
                    `The portcullis of the drawbridge falls into the ${
                        lava ? hliquid('lava') : 'moat'
                    }!`,
                );
            } else {
                await You_hear('a loud *SPLASH*!');
            }
        } else {
            if (cansee(x, y) || u_at(x, y)) {
                await pline(
                    `The drawbridge collapses into the ${
                        lava ? hliquid('lava') : 'moat'
                    }!`,
                );
            } else {
                await You_hear('a loud *SPLASH*!');
            }
        }
        lev1.typ = lava ? LAVAPOOL : MOAT;
        lev1.drawbridgemask = 0;
        const otmp2 = sobj_at(BOULDER, x, y);
        if (otmp2) {
            // flooreffects deferred — dunk boulder into liquid
            obj_extract_self(otmp2);
            delobj(otmp2);
        }
    } else {
        if (cansee(x, y) || u_at(x, y)) {
            await pline('The drawbridge disintegrates!');
        } else {
            await You_hear('a loud *CRASH*!');
        }
        const iceUnder = ((lev1.drawbridgemask | 0) & DB_ICE) !== 0;
        lev1.typ = iceUnder ? ICE : ROOM;
        lev1.icedpool = iceUnder ? ICED_MOAT : 0;
    }

    wake_nearto(x, y, 500);
    lev2.typ = DOOR;
    lev2.doormask = D_NODOOR;

    {
        const t = t_at(x, y);
        if (t) deltrap(t);
    }
    {
        const t = t_at(x2, y2);
        if (t) deltrap(t);
    }
    del_engr_at(x, y);
    del_engr_at(x2, y2);
    // scatter IRON_CHAIN debris rn2(6) loop deferred (no partial RNG)

    newsym(x, y);
    newsym(x2, y2);
    recalc_block_point(x2, y2);
    vision_recalc(0);

    if (Is_stronghold(game.u?.uz)) {
        const u = game.u || {};
        if (!u.uevent) u.uevent = {};
        u.uevent.uopened_dbridge = true;
        u.uevent.uheard_tune = 3;
    }
    // set_entity / do_entity / e_died crush deferred
}
