// @ts-nocheck
// muse.js — monsters using objects: the OFFENSIVE half of muse.c.
// C ref: nethack-c/src/muse.c
//
// find_offensive() already lives in js/makemon.js (it was ported alongside the
// verdict: precheck(), mzapwand(), use_offensive(), and the monster-side beam
// walker mbhit()/mbhitm().
//
// Two arms of use_offensive() are ported: MUSE_WAN_STRIKING (the wand beam) and
// the shared MUSE_POT_PARALYSIS/BLINDNESS/CONFUSION/SLEEPING/ACID arm (the
// hurled potion).  Every other arm returns C's own no-action value (0,
// muse.c:2019 `case 0: return 0;`) and carries a KNOWN GAP comment naming the C
// file:line and the missing dependency.  They are NOT thrown: the replay runner
// of correctly-matched leaves elsewhere.

import { game } from './gstate.js';
import { dist2 } from './hacklib.js';
import { rn1, rn2, rnd, d } from './rng.js';
import { pline, newsym, canspotmon, canseemon, map_invisible } from './display.js';
import { cansee, couldsee } from './vision.js';
import { m_at, mon_nam, exclam } from './uhitm.js';
import { Monnam } from './mcastu.js';
import { find_mac } from './trap.js';
import { resist, miss, dobuzz, bhito } from './zap.js';
import { The, vtense, an, xname_wand, simple_typename, xname } from './objnam.js';
import { doname, singular } from './objnam.js';
import { distmin } from './hacklib.js';
import { observe_object } from './o_init.js';
import { m_throw } from './mhitu.js';
import { losehp } from './dokick.js';
import { breaks } from './dokick.js';
import { nomul } from './allmain.js';
import { monstunseesu, seemimic as seemimic_real, resists_magm } from './mhitm.js';
import { monstseesu as monstseesu_real } from './mcastu.js';
import { discover_object } from './o_init.js';
import { BOLT_LIM, M_AP_NOTHING, ANTIMAGIC, HALF_SPDAM, isok, IS_DOOR, SDOOR, D_LOCKED, D_CLOSED, D_BROKEN, SHOPBASE, POOL, OBJ_FLOOR, KILLED_BY_AN, TELL } from './const.js';
import { doorlock } from './lock.js';
import { in_rooms, add_damage } from './shk.js';

/* C ref: muse.c:1272-1290 — the offensive MUSE_* values, verbatim.  Declared
 * again here (rather than imported) because js/makemon.js keeps its copies
 * module-private; the VALUES are C's and must stay in sync with that block. */
const MUSE_WAN_STRIKING = 7;
const MUSE_WAN_DEATH = 1, MUSE_WAN_SLEEP = 2, MUSE_WAN_FIRE = 3,
      MUSE_WAN_COLD = 4, MUSE_WAN_LIGHTNING = 5, MUSE_WAN_MAGIC_MISSILE = 6;
const MUSE_POT_PARALYSIS = 9;
const MUSE_POT_BLINDNESS = 10;
const MUSE_POT_CONFUSION = 11;
const MUSE_POT_ACID = 14;
const MUSE_WAN_TELEPORTATION = 15;
const MUSE_POT_SLEEPING = 16;
const MUSE_WAN_UNDEAD_TURNING = 20;

/* objects.h otyps (same values js/makemon.js pins for find_offensive).
 * WAN_STRIKING is the wand the shopkeeper carries. */
const WAN_STRIKING = 417;
const WAN_UNDEAD_TURNING = 421;
const WAN_MAGIC_MISSILE = 429;
/* objclass.h oclass numbers: POTION_CLASS 8, WAND_CLASS 11 (objects.h:96
 * marks the wand GENERIC entry "[11]"; 10 is SPBOOK_CLASS). */
const POTION_CLASS = 8;
const WAND_CLASS = 11;

/* C ref: hack.h:1415 WAND_BACKFIRE_CHANCE. */
const WAND_BACKFIRE_CHANCE = 100;

/* C ref: monst.h:77 M_SEEN_MAGR — the "hero resists magic missile / AD_MAGM"
 * bit of mtmp->seen_resistance. */
const M_SEEN_MAGR = 0x0001;

/* C ref: youprop.h — hero properties this file tests. */
function propOn(id) {
    const p = game.u?.uprops?.[id];
    return !!(p && (p.intrinsic || p.extrinsic));
}
function Antimagic() { return propOn(ANTIMAGIC); }
function Half_spell_damage() { return propOn(HALF_SPDAM); }

function DEADMONSTER(mon) { return !!(mon && (mon.mhp | 0) <= 0); }

/* C ref: decl.c gy.youmonst — C passes &gy.youmonst to fhitm when the beam
 * crosses the hero, and mbhitm compares against it.  This port keeps no global
 * hero-monst record, so the hero is recognised the same way js/teleport.js
 * does it: m_id == 1 (and the absent game.youmonst itself). */
function is_youmonst(m) { return !m || (m.m_id | 0) === 1; }

/* C ref: allmain.c:755-768 stop_occupation() — interrupt a multi-turn action.
 * There is no occupation running while a monster zaps, and the JS occupation
 * model lives in js/allmain.js; C's nomul(0)/svc.context.botl work is done by
 * the nomul() call that follows at each of this file's call sites. */
function stop_occupation() {
    if (game.occupation)
        game.occupation = null;
}

function makeknown(otyp) { discover_object(otyp, true, true, true); }

/* C ref: zap.c:3550-3563 hit(str, mtmp, force) — the "The wand hits <mon>!"
 * message.  No JS module carried this yet (js/zap.js has miss() only). */
function hit(str, mtmp, force) {
    const bp = game.bhitpos || { x: 0, y: 0 };
    const verbosely = (is_youmonst(mtmp)
                       || (game.flags?.verbose
                           && (cansee(bp.x, bp.y) || canspotmon(mtmp))));
    pline(`${The(str)} ${vtense(str, "hit")} ${verbosely ? mon_nam(mtmp) : "it"}${force}`);
}

/* C ref: muse.c:1093-1163 precheck(mon, obj) — pre-use hazards.  For a wand
 * the only one is the cursed-wand backfire; the POTION_CLASS arms (milky /
 * smoky potion occupants) are not ported and are guarded by the caller, which
 * only reaches precheck for oclass != POTION_CLASS. */
function precheck(mon, obj) {
    if (!obj)
        return 0;
    if (obj.oclass === POTION_CLASS) {
        /* KNOWN GAP — muse.c:1101-1140, the milky/smoky potion-occupant arms
         * (they makemon a ghost/djinni and draw rn2(POTION_OCCUPANT_CHANCE)).
         * Unreachable from here: use_offensive's only call site guards on
         * `otmp.oclass !== POTION_CLASS`, exactly as C does at muse.c:1841.
         * Returns C's "nothing happened" value rather than throwing. */
        return 0;
    }
    /* C muse.c:1147 — `obj->cursed && !rn2(WAND_BACKFIRE_CHANCE)`: the rn2 is
     * only drawn for a CURSED wand, so an uncursed one costs nothing.  The
     * draw is kept because C makes it unconditionally for a cursed wand. */
    if (obj.oclass === WAND_CLASS && obj.cursed && !rn2(WAND_BACKFIRE_CHANCE)) {
        /* KNOWN GAP — muse.c:1148-1173, the cursed-wand backfire: the wand
         * explodes for d(spe+2, 6), the monster may die (monkilled), and the
         * wand is m_useup'd.  Missing dependency: m_useup (muse.c) and the
         * d() damage application to a monster outside resist().  C's own
         * post-backfire state for a SURVIVING monster is
         * `gm.m.has_defense = gm.m.has_offense = gm.m.has_misc = 0` followed
         * by `return 0` (muse.c:1170-1172), and that is reproduced here, so
         * use_offensive's switch falls to `case 0: return 0` (muse.c:2009). */
        game.has_offense = 0;
        return 0;
    }
    return 0;
}

/* C ref: muse.c:167-192 mzapwand(mtmp, otmp, self) — announce the zap, spend a
 * charge, and (when seen) interrupt the hero's occupation. */
function mzapwand(mtmp, otmp, self) {
    if ((otmp.spe | 0) < 1) {
        /* C: impossible("Mon zapping wand with %d charges?") then return —
         * the charge is NOT spent. */
        return;
    }
    if (!canseemon(mtmp)) {
        /* C muse.c:174-181 — an unseen zapper is only heard.  RNG-free. */
        const range = couldsee(mtmp.mx | 0, mtmp.my | 0)
                      ? (BOLT_LIM + 1) : (BOLT_LIM - 3);
        const near = dist2(mtmp.mx | 0, mtmp.my | 0,
                           game.u.ux | 0, game.u.uy | 0) <= range * range;
        pline(`You hear a ${near ? "nearby" : "distant"} zap.`);
        /* KNOWN GAP — muse.c:181 unknow_object(otmp): the hero loses their
         * memory of the wand's charge count when an unseen monster uses it.
         * Missing dependency: unknow_object (o_init.c).  Display/knowledge
         * only, RNG-free; the charge below is still spent, as in C. */
    } else if (self) {
        /* KNOWN GAP — muse.c:182-184, the self-zap message
         * `pline("%s with %s!", monverbself(mtmp, Monnam(mtmp), "zap",
         * (char *) 0), doname(otmp))`.  Missing dependency: monverbself
         * (do_name.c).  Not reachable from this module — use_offensive is the
         * only caller and always passes self=FALSE (muse.c:1882); the self=TRUE
         * callers live in use_defensive/use_misc (js/makemon.js).  RNG-free
         * either way; the charge below is still spent, as in C. */
    } else {
        pline(`${Monnam(mtmp)} zaps ${an(xname(otmp))}!`);
        stop_occupation();
    }
    otmp.spe = (otmp.spe | 0) - 1;
}

/* C ref: muse.c:1596-1702 mbhitm(mtmp, otmp) — apply otmp's zap effect to one
 * target on the beam.  mtmp is &gy.youmonst when the beam is hitting the hero.
 * Only the WAN_STRIKING case is ported. */
async function mbhitm(mtmp, otmp) {
    let tmp;
    let reveal_invis = false, learnit = false;
    const hits_you = is_youmonst(mtmp);
    const u = game.u || {};

    if (!hits_you && otmp.otyp !== WAN_UNDEAD_TURNING) {
        mtmp.msleeping = 0;
        if (mtmp.m_ap_type)
            seemimic(mtmp);
    }
    switch (otmp.otyp | 0) {
    case WAN_STRIKING:
        reveal_invis = true;
        if (hits_you) {
            if (Antimagic()) {
                monstseesu(M_SEEN_MAGR);
                pline("Boing!");
                learnit = true;
            } else if (rnd(20) < 10 + (u.uac | 0)
                       && !(game.buzzer && !game.buzzer.mwandexp)) {
                /* C muse.c:1618-1620 — the to-hit rnd(20) is evaluated FIRST
                 * and is therefore always drawn, even when the second test (a
                 * monster's first-ever wand shot always misses) forces a miss. */
                monstunseesu(M_SEEN_MAGR);
                pline("The wand hits you!");
                tmp = d(2, 12);
                if (Half_spell_damage())
                    tmp = Math.trunc((tmp + 1) / 2);
                await losehp(tmp, "wand", KILLED_BY_AN);
                learnit = true;
            } else {
                pline("The wand misses you.");
            }
            stop_occupation();
            nomul(0);
        } else if (resists_magm(mtmp)) {
            pline("Boing!");
            learnit = true;
        } else if (rnd(20) < 10 + find_mac(mtmp)) {
            tmp = d(2, 12);
            hit("wand", mtmp, exclam(tmp));
            await resist(mtmp, otmp.oclass, tmp, TELL);
            learnit = true;
        } else {
            miss("wand", mtmp);
        }
        /* C muse.c:1651-1655 — wand discovery needs the zap AND the impact
         * spot to have been seen. */
        if (learnit && game.zap_oseen
            && (hits_you || cansee(mtmp.mx | 0, mtmp.my | 0)))
            makeknown(WAN_STRIKING);
        break;
    default:
        /* KNOWN GAP — muse.c:1656-1701 handles WAN_TELEPORTATION,
         * WAN_CANCELLATION/SPE_CANCELLATION, WAN_UNDEAD_TURNING,
         * WAN_POLYMORPH, WAN_SLOW_MONSTER, WAN_SPEED_MONSTER and
         * WAN_DIGGING; several draw RNG (rloc, unturn_dead, newcham).
         * Missing dependencies: rloc/tele_restrict (teleport.c), cancel_monst
         * (zap.c), unturn_dead (zap.c), newcham (mon.c), dig (dig.c).
         * Only reachable via mbhit, whose only caller is use_offensive's
         * MUSE_WAN_STRIKING arm below (the TELEPORTATION/UNDEAD_TURNING arms
         * return C's no-action 0 before ever calling mbhit), so this is
         * currently dead — but it returns C's own `return 0` (muse.c:1702)
         * rather than throwing, because a throw discards the entire matched
         * RNG prefix of the replay, not just the work after it. */
        break;
    }

    if (reveal_invis && !DEADMONSTER(mtmp)
        && cansee(game.bhitpos.x, game.bhitpos.y) && !canspotmon(mtmp))
        map_invisible(game.bhitpos.x, game.bhitpos.y);

    return 0;
}

async function fhito_loc(obj, tx, ty, fhito) {
    if (!fhito)
        return false;
    let hitanything = 0;
    const pile = game.level?.levelObjects?.[tx]?.[ty] ?? null;
    for (let otmp = pile, next_obj = null; otmp; otmp = next_obj) {
        next_obj = otmp.nexthere;
        if (otmp.where !== OBJ_FLOOR || otmp.ox !== tx || otmp.oy !== ty)
            continue;
        hitanything += await fhito(otmp, obj);
    }
    return hitanything ? true : false;
}

async function mbhit(mon, range, fhitm, fhito, obj) {
    const otyp = obj.otyp | 0;
    const bhitpos = (game.bhitpos = game.bhitpos || { x: 0, y: 0 });

    bhitpos.x = mon.mx | 0;
    bhitpos.y = mon.my | 0;
    const ddx = sgn((mon.mux | 0) - (mon.mx | 0));
    const ddy = sgn((mon.muy | 0) - (mon.my | 0));

    while (range-- > 0) {
        bhitpos.x += ddx;
        bhitpos.y += ddy;
        const x = bhitpos.x, y = bhitpos.y;

        if (!isok(x, y)) {
            bhitpos.x -= ddx;
            bhitpos.y -= ddy;
            break;
        }
        const u = game.u || {};
        let mtmp;
        if (x === (u.ux | 0) && y === (u.uy | 0)) {
            await fhitm(game.youmonst, obj);
            range -= 3;
        } else if ((mtmp = m_at(x, y)) != null) {
            if (cansee(x, y) && !canspotmon(mtmp))
                map_invisible(x, y);
            await fhitm(mtmp, obj);
            range -= 3;
        }
        if (await fhito_loc(obj, x, y, fhito))
            range--;
        const loc = game.level?.at(x, y);
        const ltyp = loc ? (loc.typ | 0) : 0;
        /* KNOWN GAP — muse.c:1775-1783: `otyp == WAN_STRIKING && ltyp !=
         * DRAWBRIDGE_UP && find_drawbridge(&dbx, &dby)` then
         * destroy_drawbridge(dbx, dby), which draws RNG (it can kill the
         * monster and shatter objects).  Missing dependency:
         * destroy_drawbridge (dbridge.c).  C's `if/else if` makes the DOOR
         * arm below the alternative, so skipping the drawbridge test means a
         * striking beam crossing a drawbridge falls into the DOOR arm
         * instead; DRAWBRIDGE_UP is not IS_DOOR, so it simply does nothing. */
        if (IS_DOOR(ltyp) || ltyp === SDOOR) {
            /* C muse.c:1783-1800 — monsters never zap opening/locking magic, so
             * WAN_STRIKING is the only case that does anything here. */
            if (otyp === WAN_STRIKING) {
                if (await doorlock(obj, x, y)) {
                    if (game.zap_oseen)
                        makeknown(otyp);
                    /* C muse.c:1794-1797 — a shop door broken by the beam goes
                     * on the shopkeeper's repair list at NO charge. */
                    if ((loc.doormask | 0) === D_BROKEN
                        && in_rooms(x, y, SHOPBASE).length)
                        add_damage(x, y, 0);
                }
            }
        }
        if (!ZAP_POS(ltyp)
            || (IS_DOOR(ltyp) && ((loc.doormask | 0) & (D_LOCKED | D_CLOSED)))) {
            bhitpos.x -= ddx;
            bhitpos.y -= ddy;
            break;
        }
    }
}

/* C ref: muse.c:1826-1900+ use_offensive(mtmp) — act on find_offensive()'s
 * verdict.  Returns 0 (nothing done), 1 (monster died) or 2 (acted).
 * Only MUSE_WAN_STRIKING is ported; every other arm returns C's own
 * no-action 0 and is documented as a KNOWN GAP in the switch's default. */
export async function use_offensive(mtmp) {
    const otmp = game.offensive;
    let i;

    /* C muse.c:1834-1836 — mwandexp: a monster's FIRST attack-wand shot always
     * misses (buzz_force_miss); mbhitm reads the same flag via game.buzzer. */

    if (otmp.oclass !== POTION_CLASS && (i = precheck(mtmp, otmp)) !== 0)
        return i;
    const oseen = canseemon(mtmp);

    switch (game.has_offense | 0) {
    case MUSE_WAN_DEATH:
    case MUSE_WAN_SLEEP:
    case MUSE_WAN_FIRE:
    case MUSE_WAN_COLD:
    case MUSE_WAN_LIGHTNING:
    case MUSE_WAN_MAGIC_MISSILE:
        /* C muse.c:1846-1866 — all six offensive ray wands share the
         * BZ_M_WAND path.  The old port fell through to the ordinary attack
         * loop, which made a monster carrying a death wand throw its boulder
         * instead and skipped the hero-side exercise/zap RNG. */
        game.zap_oseen = oseen;
        mzapwand(mtmp, otmp, false);
        if (oseen) makeknown(otmp.otyp | 0);
        game.m_using = true;
        game.buzzer = mtmp;
        {
            const ofs = Math.abs((otmp.otyp | 0) - WAN_MAGIC_MISSILE) % 10;
            const nd = ((otmp.otyp | 0) === WAN_MAGIC_MISSILE) ? 2 : 6;
            const forceMiss = !mtmp.mwandexp;
            /* C muse.c:1815-1818,1834-1849: both buzz() and
             * buzz_force_miss() pass sayhit=TRUE, saymiss=FALSE. */
            await dobuzz(-30 - ofs, nd, mtmp.mx | 0, mtmp.my | 0,
                         sgn((mtmp.mux | 0) - (mtmp.mx | 0)),
                         sgn((mtmp.muy | 0) - (mtmp.my | 0)), true, false, forceMiss);
        }
        game.buzzer = 0;
        game.m_using = false;
        mtmp.mwandexp = true;
        return DEADMONSTER(mtmp) ? 1 : 2;
    case MUSE_WAN_TELEPORTATION:
    case MUSE_WAN_UNDEAD_TURNING:
    case MUSE_WAN_STRIKING:
        if (game.has_offense !== MUSE_WAN_STRIKING) {
            /* KNOWN GAP — muse.c:1878-1890 shares one arm between
             * MUSE_WAN_TELEPORTATION, MUSE_WAN_UNDEAD_TURNING and
             * MUSE_WAN_STRIKING; only STRIKING is ported.  See the switch
             * default below for why this returns 0 instead of throwing. */
            return 0;
        }
        game.zap_oseen = oseen;
        mzapwand(mtmp, otmp, false);
        game.m_using = true;
        game.buzzer = mtmp;
        /* C muse.c:1884 — rn1(8, 6) is the beam's range and is drawn BEFORE
         * mbhit runs (it is an argument). */
        await mbhit(mtmp, rn1(8, 6), mbhitm, bhito, otmp);
        game.buzzer = 0;
        game.m_using = false;
        if ((game.has_offense | 0) === MUSE_WAN_STRIKING)
            mtmp.mwandexp = true;
        return 2;
    case MUSE_POT_PARALYSIS:
    case MUSE_POT_BLINDNESS:
    case MUSE_POT_CONFUSION:
    case MUSE_POT_SLEEPING:
    case MUSE_POT_ACID:
        if (cansee(mtmp.mx | 0, mtmp.my | 0)) {
            observe_object(otmp);
            pline(`${Monnam(mtmp)} hurls ${(await singular(otmp, doname))}!`);
        }
        await m_throw(mtmp, mtmp.mx | 0, mtmp.my | 0,
                sgn((mtmp.mux | 0) - (mtmp.mx | 0)),
                sgn((mtmp.muy | 0) - (mtmp.my | 0)),
                distmin(mtmp.mx | 0, mtmp.my | 0, mtmp.mux | 0, mtmp.muy | 0),
                otmp);
        return 2;
    default:
        return 0;
    }
}

/* --- small local helpers with no shared owner in js/ --- */

/* xname() — C objnam.c:574-578.  Was a private WAND-only shim here that fell
 * back to simple_typename() for every other class; js/objnam.js now carries the
 * full xname_flags() body and this file imports xname from it directly. */

/* C ref: hacklib.h sgn(n). */
function sgn(n) { return n > 0 ? 1 : n < 0 ? -1 : 0; }

function ZAP_POS(typ) { return (typ | 0) >= POOL; }

/* C ref: mon.c:4397-4416 seemimic(mtmp) — a mimic that acts drops its
 * disguise.  RNG-free.  No shared port exists in js/, so it is implemented
 * here; the light-blocking arm needs does_block()/unblock_point(), which are
 * a KNOWN GAP (vision only, RNG-free). */
function seemimic(mtmp) {
    return seemimic_real(mtmp);
}

/* C ref: mondata.c:1552-1568 monstseesu(seenres) — every monster that can see
 * the hero records that the hero RESISTED this damage type, so it stops
 * choosing that attack.  RNG-free; mirrors js/mhitm.js's ported
 * monstunseesu(), which clears the same bit on the same monster set. */
function monstseesu(seenres) {
    return monstseesu_real(seenres);
}
