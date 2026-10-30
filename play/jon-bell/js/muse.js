// @ts-nocheck
// muse.js — monsters using objects: the OFFENSIVE half of muse.c.
// C ref: nethack-c-v5/upstream/src/muse.c
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
import { pline, newsym, canspotmon, canseemon, map_invisible, You_hear, shieldeff } from './display.js';
import { cansee, couldsee } from './vision.js';
import { m_at, mon_nam, exclam } from './uhitm.js';
import { Monnam } from './mcastu.js';
import { find_mac } from './trap.js';
import { _zp_unturn_you, unturn_dead, cancel_monst, resist, hit as zap_hit_message, miss, dobuzz, bhito, lightdamage, BlindedTimeout, make_blinded } from './zap.js';
import { Blind } from './vision.js';
import { resists_blnd, wakeup, mon_nam_too } from './mhitm.js';
import { makeplural } from './objnam.js';
import { verbalize } from './cmd.js';
import { The, vtense, an, xname_wand, simple_typename, xname } from './objnam.js';
import { doname, singular, simpleonames } from './objnam.js';
import { distmin } from './hacklib.js';
import { observe_object } from './o_init.js';
import { m_throw } from './mhitu.js';
import { losehp } from './dokick.js';
import { breaks, find_drawbridge } from './dokick.js';
import { destroy_drawbridge } from './dig.js';
import { nomul, stop_occupation } from './allmain.js';
import { monstunseesu, seemimic as seemimic_real, resists_magm } from './mhitm.js';
import { monstseesu as monstseesu_real } from './mcastu.js';
import { discover_object } from './o_init.js';
import { BOLT_LIM, M_AP_NOTHING, ANTIMAGIC, HALF_SPDAM, isok, IS_DOOR, SDOOR, DRAWBRIDGE_UP, D_LOCKED, D_CLOSED, D_BROKEN, SHOPBASE, POOL, OBJ_FLOOR, KILLED_BY_AN, TELL, TEMPLE, RLOC_MSG, NOTELL } from './const.js';
import { doorlock } from './lock.js';
import { unknow_object } from './mklev.js';
import { in_rooms, add_damage } from './shk.js';
import { tele, tele_restrict, rloc } from './teleport.js';
import { mreadmsg, precheck as precheck_shared } from './makemon.js';
import { m_useup, monkilled_trap } from './trap.js';
import { drop_boulder_on_monster, drop_boulder_on_player } from './read.js';
import { ceiling, set_msg_xy } from './cmd.js';
import { closed_door } from './look.js';
import { IS_OBSTRUCTED, IS_AIR } from './const.js';
import { HALLUC, HALLUC_RES } from './const.js';
import { impossible } from './pline.js';

/* C ref: muse.c:1272-1290 — the offensive MUSE_* values, verbatim.  Declared
 * again here (rather than imported) because js/makemon.js keeps its copies
 * module-private; the VALUES are C's and must stay in sync with that block. */
const MUSE_WAN_STRIKING = 7;
const MUSE_CAMERA = 18;
const MUSE_SCR_EARTH = 17;
const MUSE_WAN_DEATH = 1, MUSE_WAN_SLEEP = 2, MUSE_WAN_FIRE = 3,
      MUSE_WAN_COLD = 4, MUSE_WAN_LIGHTNING = 5, MUSE_WAN_MAGIC_MISSILE = 6;
const MUSE_FROST_HORN = 12, MUSE_FIRE_HORN = 13;
const FROST_HORN = 250;
const AD_MAGM = 1, AD_FIRE = 2, AD_COLD = 3;
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
const WAN_TELEPORTATION = 424;
const WAN_UNDEAD_TURNING = 421;
const WAN_MAGIC_MISSILE = 429;
/* objclass.h oclass numbers: POTION_CLASS 8, WAND_CLASS 11 (objects.h:96
 * marks the wand GENERIC entry "[11]"; 10 is SPBOOK_CLASS). */
const POTION_CLASS = 8;
const WAND_CLASS = 11;
const WAN_CANCELLATION = 423, SPE_CANCELLATION = 402; /* zap.js:290, :360 */

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

function makeknown(otyp) { discover_object(otyp, true, true, true); }

/* C ref: zap.c:3550-3563 hit(str, mtmp, force) — the "The wand hits <mon>!"
 * message.  No JS module carried this yet (js/zap.js has miss() only). */
function hit(str, mtmp, force) {
    return zap_hit_message(str, mtmp, force);
}

/* C ref: muse.c:58-160 precheck(mon, obj) — pre-use hazards.  For a wand
 * the only one is the cursed-wand backfire; the POTION_CLASS arms (milky /
 * smoky potion occupants) live in the shared port, guarded by the caller, which
 * only reaches precheck for oclass != POTION_CLASS. */
async function precheck(mon, obj) {
    if (!obj)
        return 0;
    /* C muse.c:1147 — `obj->cursed && !rn2(WAND_BACKFIRE_CHANCE)`: the rn2 is
     * only drawn for a CURSED wand, so an uncursed one costs nothing.  The
     * draw is kept because C makes it unconditionally for a cursed wand. */
    // C v5 muse.c:131-160: consume the wand before applying blast damage.
    return precheck_shared(mon, obj);
}

/* C ref: do_name.c:1220-1248 monverbself() */
function _monverbself(mtmp, verb, othertext) {
    let monnamtext = Monnam(mtmp);
    const selfbuf = mon_nam_too(mtmp, mtmp);
    const verbs = vtense(selfbuf, verb);
    if (verbs === verb) {
        monnamtext = makeplural(monnamtext);
        if (monnamtext.toLowerCase() === 'they')
            monnamtext = monnamtext[0] === 'T' ? 'Them' : 'them';
    }
    return `${monnamtext} ${verbs}${othertext ? ' ' + othertext : ''} ${selfbuf}`;
}

/* C ref: muse.c:167-192 mzapwand(mtmp, otmp, self) — announce the zap, spend a
 * charge, and (when seen) interrupt the hero's occupation. */
export async function mzapwand(mtmp, otmp, self) {
    if ((otmp.spe | 0) < 1) {
        /* C: impossible("Mon zapping wand with %d charges?") then return —
         * the charge is NOT spent. */
        await impossible('Mon zapping wand with %d charges?', otmp.spe);
        return;
    }
    if (!canseemon(mtmp)) {
        /* C muse.c:174-181 — an unseen zapper is only heard.  RNG-free. */
        const range = couldsee(mtmp.mx | 0, mtmp.my | 0)
                      ? (BOLT_LIM + 1) : (BOLT_LIM - 3);
        const near = dist2(mtmp.mx | 0, mtmp.my | 0,
                           game.u.ux | 0, game.u.uy | 0) <= range * range;
        await You_hear(`a ${near ? "nearby" : "distant"} zap.`);
        unknow_object(otmp); /* hero loses info when unseen obj is used */
    } else if (self) {
        await pline(`${_monverbself(mtmp, 'zap', null)} with ${await doname(otmp)}!`);
    } else {
        set_msg_xy(mtmp.mx, mtmp.my); /* pline_mon (pline.c:138-146) */
        await pline(`${Monnam(mtmp)} zaps ${an(xname(otmp))}!`);
        await stop_occupation();
    }
    otmp.spe = (otmp.spe | 0) - 1;
}

/* C ref: muse.c:195-233 mplayhorn(mtmp, otmp, self) — announce the horn,
 * spend a charge.  The self arm is unreachable from use_offensive. */
export async function mplayhorn(mtmp, otmp, self) {
    if (!canseemon(mtmp)) {
        const range = couldsee(mtmp.mx | 0, mtmp.my | 0)
                      ? (BOLT_LIM + 1) : (BOLT_LIM - 3);
        const near = dist2(mtmp.mx | 0, mtmp.my | 0,
                           game.u.ux | 0, game.u.uy | 0) <= range * range;
        await You_hear(`a horn being played ${near ? "nearby" : "in the distance"}.`);
        unknow_object(otmp); /* hero loses info when unseen obj is used */
    } else if (self) {
        observe_object(otmp);
        let objnamp = xname(otmp);
        if (objnamp.length >= 128) /* QBUFSZ */
            objnamp = simpleonames(otmp);
        pline(`${_monverbself(mtmp, 'play', `a ${objnamp} directed at`)}!`);
        makeknown(otmp.otyp | 0);
    } else {
        observe_object(otmp);
        let objnamp = xname(otmp);
        if (objnamp.length >= 128) /* QBUFSZ */
            objnamp = simpleonames(otmp);
        pline(`${Monnam(mtmp)} plays ${an(objnamp)} directed at you!`);
        makeknown(otmp.otyp | 0);
        await stop_occupation();
    }
    otmp.spe = (otmp.spe | 0) - 1;
}

/* C ref: muse.c:1596-1702 mbhitm(mtmp, otmp) — apply otmp's zap effect to one
 * target on the beam.  mtmp is &gy.youmonst when the beam is hitting the hero.
 * Only the WAN_STRIKING case is ported. */
async function mbhitm(mtmp, otmp) {
    let tmp, tgt_x = 0, tgt_y = 0;
    let reveal_invis = false, learnit = false;
    const hits_you = is_youmonst(mtmp);
    const u = game.u || {};
    /* C's dead mtmp keeps its stale mx,my (mon.c:2718); this port's
     * monkilled_trap() zeroes them, so remember the target square for the
     * cansee() test at the end (muse.c:1647-1649). */
    if (!hits_you) { tgt_x = mtmp.mx | 0; tgt_y = mtmp.my | 0; }

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
                shieldeff(u.ux | 0, u.uy | 0); /* C muse.c:1613 */
                pline("Boing!");
                learnit = true;
            } else if (rnd(20) < 10 + (u.uac | 0)
                       && !(game.gb?.buzzer && !game.gb.buzzer.mwandexp)) {
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
            await stop_occupation();
            nomul(0);
        } else if (resists_magm(mtmp)) {
            shieldeff(mtmp.mx | 0, mtmp.my | 0); /* C muse.c:1630 */
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
            && (hits_you || cansee(tgt_x, tgt_y)))
            makeknown(WAN_STRIKING);
        break;
    case WAN_TELEPORTATION:
        /* C muse.c:1656-1668 */
        if (hits_you) {
            await tele();
            if (game.zap_oseen)
                makeknown(WAN_TELEPORTATION);
        } else {
            /* for consistency with zap.c, don't identify */
            if (mtmp.ispriest && in_rooms(mtmp.mx | 0, mtmp.my | 0, TEMPLE)?.length) {
                if (cansee(mtmp.mx | 0, mtmp.my | 0))
                    pline(`${Monnam(mtmp)} resists the magic!`);
            } else if (!tele_restrict(mtmp))
                await rloc(mtmp, RLOC_MSG);
        }
        break;
    case WAN_CANCELLATION:
    case SPE_CANCELLATION:
        /* C muse.c:1666-1668 */
        await cancel_monst(mtmp, otmp, false, true, false);
        break;
    case WAN_UNDEAD_TURNING:
        /* C muse.c:1669-1694 */
        if (hits_you) {
            await _zp_unturn_you();
            learnit = !!game.zap_oseen;
        } else {
            let wake = false;

            if (await unturn_dead(mtmp)) /* affects mtmp's invent, not mtmp */
                wake = true;
            if (((mtmp.data.mflags2 | 0) & 0x2 /* M2_UNDEAD */)
                || [226, 227, 228].includes(mtmp.cham | 0)) {
                wake = reveal_invis = true;
                /* context.bypasses=True: if resist() happens to be fatal,
                   make_corpse() will set obj->bypass on the new corpse */
                game.context.bypasses = true;
                await resist(mtmp, WAND_CLASS, rnd(8), NOTELL);
            }
            if (wake) {
                if (!DEADMONSTER(mtmp))
                    await wakeup(mtmp, false);
                learnit = !!game.zap_oseen;
            }
        }
        if (learnit)
            makeknown(WAN_UNDEAD_TURNING);
        break;
    default:
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
    // C muse.c:1746-1807 reads the shared gb.bhitpos even after callbacks;
    // drawbridge debris can change it (explode.c:843-856 scatter).
    game.bhitpos ||= { x: 0, y: 0 };

    game.bhitpos.x = mon.mx | 0;
    game.bhitpos.y = mon.my | 0;
    const ddx = sgn((mon.mux | 0) - (mon.mx | 0));
    const ddy = sgn((mon.muy | 0) - (mon.my | 0));

    while (range-- > 0) {
        game.bhitpos.x += ddx;
        game.bhitpos.y += ddy;
        const x = game.bhitpos.x, y = game.bhitpos.y;

        if (!isok(x, y)) {
            game.bhitpos.x -= ddx;
            game.bhitpos.y -= ddy;
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
        if (await fhito_loc(obj, game.bhitpos.x, game.bhitpos.y, fhito))
            range--;
        const loc = game.level?.at(game.bhitpos.x, game.bhitpos.y);
        const ltyp = loc ? (loc.typ | 0) : 0;
        /* C muse.c:1775-1783 — a striking beam destroys a drawbridge it
         * crosses, unless it is passing over the raised bridge's moat. */
        const dbx = { value: x }, dby = { value: y };
        if (otyp === WAN_STRIKING && ltyp !== DRAWBRIDGE_UP
            && find_drawbridge(dbx, dby)) {
            await destroy_drawbridge(dbx.value, dby.value);
        } else if (IS_DOOR(ltyp) || ltyp === SDOOR) {
            /* C muse.c:1783-1800 — monsters never zap opening/locking magic, so
             * WAN_STRIKING is the only case that does anything here. */
            if (otyp === WAN_STRIKING) {
                if (await doorlock(obj, game.bhitpos.x, game.bhitpos.y)) {
                    if (game.zap_oseen)
                        makeknown(otyp);
                    /* C muse.c:1794-1797 — a shop door broken by the beam goes
                     * on the shopkeeper's repair list at NO charge. */
                    if ((game.level.at(game.bhitpos.x, game.bhitpos.y).doormask | 0) === D_BROKEN
                        && in_rooms(game.bhitpos.x, game.bhitpos.y, SHOPBASE).length)
                        add_damage(game.bhitpos.x, game.bhitpos.y, 0);
                }
            }
        }
        if (!ZAP_POS(ltyp)
            || (IS_DOOR(ltyp) && ((game.level.at(game.bhitpos.x, game.bhitpos.y).doormask | 0) & (D_LOCKED | D_CLOSED)))) {
            game.bhitpos.x -= ddx;
            game.bhitpos.y -= ddy;
            break;
        }
    }
}

/* C muse.c:864: defensive wands use the same monster/object hit callbacks. */
export function mbhit_wand(mon, range, obj) {
    return mbhit(mon, range, mbhitm, bhito, obj);
}

/* C muse.c:1826-2032 use_offensive(): act on find_offensive()'s verdict.
 * The fire-scroll arm at 1956-2004 is disabled by C's #if 0. */
export async function use_offensive(mtmp) {
    const otmp = game.offensive;
    let i;

    /* C muse.c:1834-1836 — mwandexp: a monster's FIRST attack-wand shot always
     * misses (buzz_force_miss); mbhitm reads the same flag via game.gb.buzzer. */

    if (otmp.oclass !== POTION_CLASS && (i = await precheck(mtmp, otmp)) !== 0)
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
        await mzapwand(mtmp, otmp, false);
        if (oseen) makeknown(otmp.otyp | 0);
        game.m_using = true;
        game.gc_current_wand = otmp;
        (game.gb ||= {}).buzzer = mtmp;
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
        game.gb.buzzer = 0;
        game.gc_current_wand = 0;
        game.m_using = false;
        mtmp.mwandexp = true;
        return DEADMONSTER(mtmp) ? 1 : 2;
    case MUSE_FIRE_HORN:
    case MUSE_FROST_HORN:
        /* C muse.c:1867-1880 — a fire/frost horn is blown, then buzzes as an
         * AD_FIRE/AD_COLD ray of rn1(6, 6) dice via BZ_M_WAND(BZ_OFS_AD()). */
        await mplayhorn(mtmp, otmp, false);
        game.m_using = true;
        (game.gb ||= {}).buzzer = mtmp;
        game.gc_current_wand = otmp; /* needed by zhitu() (muse.c:1874) */
        {
            const ofs = Math.abs(((otmp.otyp | 0) === FROST_HORN ? AD_COLD : AD_FIRE) - AD_MAGM) % 10;
            const nd = rn1(6, 6);
            await dobuzz(-30 - ofs, nd, mtmp.mx | 0, mtmp.my | 0,
                         sgn((mtmp.mux | 0) - (mtmp.mx | 0)),
                         sgn((mtmp.muy | 0) - (mtmp.my | 0)), true, false, !mtmp.mwandexp);
        }
        game.gb.buzzer = 0;
        game.gc_current_wand = 0;
        game.m_using = false;
        mtmp.mwandexp = true;
        return DEADMONSTER(mtmp) ? 1 : 2;
    case MUSE_WAN_TELEPORTATION:
    case MUSE_WAN_UNDEAD_TURNING:
    case MUSE_WAN_STRIKING:
        game.zap_oseen = oseen;
        await mzapwand(mtmp, otmp, false);
        game.m_using = true;
        (game.gb ||= {}).buzzer = mtmp;
        /* C muse.c:1884 — rn1(8, 6) is the beam's range and is drawn BEFORE
         * mbhit runs (it is an argument). */
        await mbhit(mtmp, rn1(8, 6), mbhitm, bhito, otmp);
        game.gb.buzzer = 0;
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
            set_msg_xy(mtmp.mx, mtmp.my); /* pline_mon muse.c:2017 */
            pline(`${Monnam(mtmp)} hurls ${(await singular(otmp, doname))}!`);
        }
        await m_throw(mtmp, mtmp.mx | 0, mtmp.my | 0,
                sgn((mtmp.mux | 0) - (mtmp.mx | 0)),
                sgn((mtmp.muy | 0) - (mtmp.my | 0)),
                distmin(mtmp.mx | 0, mtmp.my | 0, mtmp.mux | 0, mtmp.muy | 0),
                otmp);
        return 2;
    case MUSE_SCR_EARTH: {
        /* C muse.c:1891-1937.  TODO (C): handle steeds. */
        /* don't use monster fields after killing it */
        const confused = !!mtmp.mconf;
        const mmx = mtmp.mx | 0, mmy = mtmp.my | 0;
        const is_cursed = !!otmp.cursed, is_blessed = !!otmp.blessed;

        await mreadmsg(mtmp, otmp);
        /* Identify the scroll */
        if (canspotmon(mtmp)) {
            pline(`The ${ceiling(mmx, mmy)} rumbles ${otmp.blessed ? "around" : "above"} ${mon_nam(mtmp)}!`);
            if (oseen) makeknown(otmp.otyp | 0);
        } else if (cansee(mmx, mmy)) {
            pline(`The ${ceiling(mmx, mmy)} rumbles in the middle of nowhere!`);
            if (mtmp.minvis) map_invisible(mmx, mmy);
            if (oseen) makeknown(otmp.otyp | 0);
        }

        /* could be fatal to monster, so use up the scroll before
           there's a chance that monster's inventory will be dropped */
        await m_useup(mtmp, otmp);

        /* Loop through the surrounding squares */
        for (let x = mmx - 1; x <= mmx + 1; x++) {
            for (let y = mmy - 1; y <= mmy + 1; y++) {
                const lev = isok(x, y) ? game.level?.at(x, y) : null;
                /* Is this a suitable spot? */
                if (lev && !closed_door(x, y)
                    && !IS_OBSTRUCTED(lev.typ | 0) && !IS_AIR(lev.typ | 0)
                    && ((x === mmx && y === mmy) ? !is_blessed : !is_cursed)
                    && (x !== (game.u.ux | 0) || y !== (game.u.uy | 0))) {
                    await drop_boulder_on_monster(x, y, confused, false);
                }
            }
        }
        /* Attack the player */
        if (distmin(mmx, mmy, game.u.ux | 0, game.u.uy | 0) === 1 && !is_cursed) {
            await drop_boulder_on_player(confused, !is_cursed, false, true);
        }

        return DEADMONSTER(mtmp) ? 1 : 2;
    }
    case MUSE_CAMERA: {
        /* C muse.c:1938-1954.  SetVoice is a no-op here. */
        /* C muse.c:1941, youprop.h:115-120: resistance suppresses the timeout. */
        if (game.u?.uprops?.[HALLUC]?.intrinsic && !propOn(HALLUC_RES)) {
            await verbalize("Say cheese!");
        } else if (!Blind()) {
            pline(`${Monnam(mtmp)} takes a picture of you with ${an(xname(otmp))}!`);
        }
        game.m_using = true;
        if (!Blind() && !resists_blnd(game.youmonst)) {
            pline("You are blinded by the flash of light!");
            make_blinded(BlindedTimeout() + rnd(1 + 50), false);
        }
        await lightdamage(otmp, true, 5);
        game.m_using = false;
        otmp.spe = (otmp.spe | 0) - 1;
        return 1;
    }
    case 0:
        return 0; /* C muse.c:2024-2025: an exploded wand. */
    default:
        await impossible('%s wanted to perform action %d?', Monnam(mtmp), game.has_offense);
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
