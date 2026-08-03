// trap.js — traps.
// C ref: src/trap.c
//
// Only the level-generation entry points are here so far. maketrap() itself
// still lives in js/mklev.js alongside the rest of the level builder; this file
// holds the pieces of src/trap.c it calls into, so that a grep for a C symbol
// finds it in the file its C twin lives in.

import { t_at as t_at_mon } from './mon.js';
import { game } from './gstate.js';
import { rn2, rnd } from './rng.js';
import { mksobj, place_object } from './mkobj.js';
import { weight } from './invent.js';
import { dmgval } from './weapon.js';
import { observe_object } from './o_init.js';
import { newsym, pline } from './display.js';
import { You, You_hear, You_feel, Your, Norep } from './pline.js';
import { an, the, doname, mshot_xname, xname } from './objnam.js';
import { upstart } from './do_name.js';
import { losehp } from './hack.js';
import { monkilled } from './mon.js';
import { find_mac, which_armor } from './worn.js';
import { canseemon } from './display.js';
import { cansee } from './vision.js';
import { passes_walls } from './mondata.js';
import { has_ceiling } from './dungeon.js';
import { Monnam } from './do_name.js';
import { MATERIALS } from './objects_data.js';
import { W_ARMF, A_DEX } from './const.js';
import { d, rn1 } from './rng.js';
import { exercise } from './attrib.js';
import { ONAMES } from './objects_data.js';
import { KILLED_BY_AN, A_STR } from './const.js';
import { W_SADDLE, NO_TRAP_FLAGS, HEAD, ARM, W_ARMH, W_ARMS, W_ARMG,
         W_ARMC, W_ARM, W_ARMU, W_WEP, W_SWAPWEP, MAX_ERODE,
         ERODE_BURN, ERODE_RUST, ERODE_ROT, ERODE_CORRODE, ERODE_CRACK,
         EF_NONE, EF_GREASE, EF_VERBOSE, EF_PAY, EF_DESTROY,
         ER_NOTHING, ER_DAMAGED, ER_DESTROYED } from './const.js';
import { rnl } from './rng.js';
import { body_part } from './polyself.js';
import { mon_nam } from './do_name.js';
import { MON_WEP, DEADMONSTER } from './monst.js';
import { erosion_matters } from './mkobj.js';
import { cxname, vtense, suit_simple_name,
         gloves_simple_name } from './objnam.js';
import { helm_simple_name, cloak_simple_name } from './do_wear.js';
import { update_inventory } from './invent.js';
import { OCLASSES } from './objects_data.js';
import { is_pool, is_lava } from './mon.js';
import { encumber_msg } from './attrib.js';
import { nomul } from './hack.js';
import { pickup } from './pickup.js';
import { surface, In_sokoban } from './dungeon.js';
import { Is_airlevel, Is_waterlevel } from './const.js';

/* src/trap.h — trapeffect_*() return values. */
/* include/trap.h:98-101 — Trap_Is_Gone shares 0 with Finished. */
const Trap_Effect_Finished = 0, Trap_Is_Gone = 0,
      Trap_Caught_Mon = 1, Trap_Killed_Mon = 2;

function note_unported_trap(what) {
    (game.unported ||= new Set()).add(what);
}

/* src/hacklib.c exclam() — the punctuation a damage amount earns. */
const exclam = (force) => (force < 0 ? '?' : (force <= 4) ? '.' : '!');
import { In_quest, TOOKPLUNGE, VIASITTING, HURTLING,
         ARROW_TRAP, DART_TRAP, ROCKTRAP, SQKY_BOARD, BEAR_TRAP, LANDMINE,
         ROLLING_BOULDER_TRAP, SLP_GAS_TRAP, RUST_TRAP, FIRE_TRAP, PIT,
         SPIKED_PIT, HOLE, TRAPDOOR, TELEP_TRAP, LEVEL_TELEP, MAGIC_PORTAL,
         WEB, STATUE_TRAP, MAGIC_TRAP, ANTI_MAGIC, POLY_TRAP,
         VIBRATING_SQUARE } from './const.js';
import { MFLAGS, PMNAMES, ATTKS } from './monst_data.js';
import { is_pit, is_hole, TT_BEARTRAP, Upolyd, LEFT_SIDE,
         RIGHT_SIDE } from './const.js';
import { set_wounded_legs } from './do.js';
import { sobj_at } from './invent.js';
import { metallivorous } from './mondata.js';
import { amorphous, is_whirly, unsolid, is_clinger, is_floater, is_flyer,
         webmaker, defended, resists_fire, resists_sleep,
         resists_magm } from './mondata.js';

// include/rm.h:538 Sokoban — the level flag, not the dungeon branch.
const Sokoban = () => game.level?.flags?.sokoban_rules === true;

// src/dungeon.c dunlevs_in_dungeon()
function dunlevs_in_dungeon(lev) {
    return game.dungeons[lev.dnum].num_dunlevs;
}

// src/dungeon.c dunlev()
function dunlev(lev) {
    return lev.dlevel;
}

// include/dungeon.h In_hell() — the Gehennom branch.
function In_hell(lev) {
    return lev.dnum === game.hell_dnum;
}

// src/trap.c:418 dng_bottom() — how far down a hole can reach, stopping at the
// quest's locate level and, before the invocation, one short of Gehennom's.
function dng_bottom(lev) {
    let bottom = dunlevs_in_dungeon(lev);

    if (In_quest(lev)) {
        const qlocate_depth = game.qlocate_level?.dlevel ?? bottom;
        if ((game.dungeons[lev.dnum].dunlev_ureached ?? 0) < qlocate_depth)
            bottom = qlocate_depth;
    } else if (In_hell(lev)) {
        if (!game.u?.uevent?.invoked)
            bottom -= 1;
    }
    return bottom;
}

// src/trap.c:442 hole_destination() — where a hole or trapdoor drops you.
//
// One rn2(4) per level of descent, so it usually stops after a single draw but
// occasionally tunnels several levels down. maketrap() calls this at CREATION
// time for every HOLE and TRAPDOOR, which is why a level with a trapdoor on it
// costs draws the rest of the stream depends on.
export function hole_destination(dst) {
    const bottom = dng_bottom(game.u.uz);

    dst.dnum = game.u.uz.dnum;
    dst.dlevel = dunlev(game.u.uz);
    while (dst.dlevel < bottom) {
        dst.dlevel++;
        if (rn2(4))
            break;
    }
}

// src/trap.c:1061 floor_trigger() — is this trap one that fires by being
// stepped ON, as opposed to one that catches anything passing through?
function floor_trigger(ttyp) {
    switch (ttyp) {
    case ARROW_TRAP:
    case DART_TRAP:
    case ROCKTRAP:
    case SQKY_BOARD:
    case BEAR_TRAP:
    case LANDMINE:
    case ROLLING_BOULDER_TRAP:
    case SLP_GAS_TRAP:
    case RUST_TRAP:
    case FIRE_TRAP:
    case PIT:
    case SPIKED_PIT:
    case HOLE:
    case TRAPDOOR:
        return true;
    default:
        return false;
    }
}

// src/trap.c:1085 check_in_air() — is this monster off the ground, allowing
// for the trap flags? A flyer that was pushed or sat down is NOT in the air.
function check_in_air(mtmp, trflags) {
    const plunged = (trflags & (TOOKPLUNGE | VIASITTING)) !== 0;

    return ((trflags & HURTLING) !== 0
            || is_floater(mtmp.data)
            || (is_flyer(mtmp.data) && !plunged));
}

// src/trap.c:1106 m_harmless_trap() — would this trap actually hurt `mtmp`?
//
// mfndpos() calls it to decide whether a square holding a trap is worth
// refusing. Nothing here draws; every arm is a species or resistance test.
//
// The opening line covers most of it: anything that triggers by being stepped
// on does nothing to a monster that is in the air. Sokoban suppresses that,
// because its pits and holes are the puzzle.
export function m_harmless_trap(mtmp, ttmp) {
    const mdat = mtmp.data;

    if (!Sokoban() && floor_trigger(ttmp.ttyp) && check_in_air(mtmp, 0))
        return true;

    switch (ttmp.ttyp) {
    case ARROW_TRAP:
    case DART_TRAP:
    case ROCKTRAP:
    case SQKY_BOARD:
        break;
    case BEAR_TRAP:
        if (mdat.msize <= MFLAGS.MZ_SMALL || amorphous(mdat)
            || is_whirly(mdat) || unsolid(mdat))
            return true;
        break;
    case LANDMINE:
    case ROLLING_BOULDER_TRAP:
        break;
    case SLP_GAS_TRAP:
        if (resists_sleep(mtmp) || defended(mtmp, ATTKS.AD_SLEE))
            return true;
        break;
    case RUST_TRAP:
        if (mdat.pmidx !== PMNAMES.PM_IRON_GOLEM)
            return true;
        break;
    case FIRE_TRAP:
        if (resists_fire(mtmp) || defended(mtmp, ATTKS.AD_FIRE))
            return true;
        break;
    case PIT:
    case SPIKED_PIT:
    case HOLE:
    case TRAPDOOR:
        if (is_clinger(mdat) && !Sokoban())
            return true;
        break;
    case TELEP_TRAP:
    case LEVEL_TELEP:
    case MAGIC_PORTAL:
        break;
    case WEB:
        if (amorphous(mdat) || webmaker(mdat)
            || is_whirly(mdat) || unsolid(mdat))
            return true;
        break;
    case STATUE_TRAP:
        return true;
    case MAGIC_TRAP:
        return true;                    /* usually */
    case ANTI_MAGIC:
        if (resists_magm(mtmp) || defended(mtmp, ATTKS.AD_MAGM))
            return true;
        break;
    case POLY_TRAP:
        break;
    case VIBRATING_SQUARE:
        return true;
    default:
        break;                          /* impossible() */
    }

    return false;
}

// src/trap.c:6776 unconscious()
export function unconscious() {
    if ((game.multi ?? 0) >= 0)
        return false;

    return !!(game.u.usleep
              || (game.nomovemsg
                  && (game.nomovemsg.startsWith("You awake")
                      || game.nomovemsg.startsWith("You regain con")
                      || game.nomovemsg.startsWith("You are consci"))));
}


// src/trap.c:3578 seetrap() — the hero notices a trap.
export function seetrap(trap) {
    if (!trap.tseen) {
        trap.tseen = 1;
        newsym(trap.tx, trap.ty);
    }
}

// src/trap.c:6531 deltrap() — take a trap off the level.
export function deltrap(trap) {
    const list = game.level?.traps;
    if (!list) return;
    const i = list.indexOf(trap);
    if (i >= 0) list.splice(i, 1);
}

// src/trap.c:1018 t_missile() — the projectile a trap fires.
function t_missile(otyp, trap) {
    const otmp = mksobj(otyp, true, false);

    otmp.quan = 1;
    otmp.owt = weight(otmp);
    otmp.opoisoned = 0;
    otmp.ox = trap.tx;
    otmp.oy = trap.ty;
    return otmp;
}

// src/trap.c:1250 trapeffect_dart_trap() — the hero's arm.
//
// Draw order: the once/tseen rn2(15) disarm check, then t_missile's mksobj,
// then the rn2(6) poison roll, then dmgval, then thitu's rnd(20).
// src/trap.c trapeffect_arrow_trap()
async function trapeffect_arrow_trap(mtmp, trap, trflags) {
    if (mtmp === game.youmonst) {
        if (trap.once && trap.tseen && !rn2(15)) {
            await You_hear('a loud click!');
            deltrap(trap);
            newsym(game.u.ux, game.u.uy);
            return Trap_Is_Gone;
        }
        trap.once = 1;
        seetrap(trap);
        await pline('An arrow shoots out at you!');
        const otmp = t_missile(ONAMES.ARROW, trap);
        const dam = dmgval(otmp, game.youmonst);
        /* u.usteed && !rn2(2) && steedintrap: no steeds in the traps yet */
        if (await thitu(8, dam, { obj: otmp }, 'arrow')) {
            /* obfree(otmp) — the arrow is destroyed */
        } else {
            place_object(otmp, game.u.ux, game.u.uy);
            if (!game.u.ublind)
                observe_object(otmp);
            const { stackobj } = await import('./invent.js');
            stackobj(otmp);
            newsym(game.u.ux, game.u.uy);
        }
        return Trap_Effect_Finished;
    }

    const in_sight = canseemon(mtmp) || (mtmp === game.u.usteed);
    const see_it = cansee(mtmp.mx, mtmp.my);
    let trapkilled = false;

    if (trap.once && trap.tseen && !rn2(15)) {
        if (in_sight && see_it)
            await pline(`${Monnam(mtmp)} triggers a trap but nothing happens.`);
        deltrap(trap);
        newsym(mtmp.mx, mtmp.my);
        return Trap_Is_Gone;
    }
    trap.once = 1;
    const otmp = t_missile(ONAMES.ARROW, trap);
    if (in_sight)
        seetrap(trap);
    if (await thitm(8, mtmp, otmp, 0, false))
        trapkilled = true;

    return trapkilled ? Trap_Killed_Mon : mtmp.mtrapped
        ? Trap_Caught_Mon : Trap_Effect_Finished;
}

async function trapeffect_dart_trap(mtmp, trap, trflags) {
    if (mtmp !== game.youmonst) {
        /* src/trap.c dart monster arm */
        const in_sight = canseemon(mtmp) || (mtmp === game.u.usteed);
        const see_it = cansee(mtmp.mx, mtmp.my);
        let trapkilled = false;

        if (trap.once && trap.tseen && !rn2(15)) {
            if (in_sight && see_it)
                await pline(`${Monnam(mtmp)} triggers a trap but nothing happens.`);
            deltrap(trap);
            newsym(mtmp.mx, mtmp.my);
            return Trap_Is_Gone;
        }
        trap.once = 1;
        const otmp = t_missile(ONAMES.DART, trap);
        if (!rn2(6))
            otmp.opoisoned = 1;
        if (in_sight)
            seetrap(trap);
        if (await thitm(7, mtmp, otmp, 0, false))
            trapkilled = true;

        return trapkilled ? Trap_Killed_Mon : mtmp.mtrapped
            ? Trap_Caught_Mon : Trap_Effect_Finished;
    }

    if (trap.once && trap.tseen && !rn2(15)) {
        await You_hear('a soft click.');
        deltrap(trap);
        newsym(game.u.ux, game.u.uy);
        return Trap_Is_Gone;
    }
    trap.once = 1;
    seetrap(trap);
    await pline('A little dart shoots out at you!');
    let otmp = t_missile(ONAMES.DART, trap);
    if (!rn2(6))
        otmp.opoisoned = 1;
    const dam = dmgval(otmp, game.youmonst);
    if (await thitu(7, dam, { obj: otmp }, 'little dart')) {
        if (otmp.opoisoned)
            note_unported_trap('trapeffect_dart_trap:poisoned');
        /* obfree(otmp) — the dart is destroyed */
    } else {
        place_object(otmp, game.u.ux, game.u.uy);
        if (!game.u.ublind)
            observe_object(otmp);
        /* js/invent.js is reached through a cycle from here (trap -> invent
           -> pickup -> hack -> trap), so stackobj is bound at call time. */
        const { stackobj } = await import('./invent.js');
        stackobj(otmp);
        newsym(game.u.ux, game.u.uy);
    }
    return Trap_Effect_Finished;
}

// src/mthrowu.c:96 thitu() — does a trap's or monster's missile hit the hero?
//
// The rnd(20) is spent whatever the outcome; everything after it is message
// and damage. Returns 1 on a hit.
export async function thitu(tlev, dam, objp, name) {
    const obj = objp ? objp.obj : null;

    /* src/mthrowu.c:87 — a null name comes from m_throw; format the missile
       itself, "the Nth arrow" during a volley. C panics when both are null. */
    if (!name)
        name = (obj && obj.quan > 1) ? doname(obj) : mshot_xname(obj);
    const onm = (obj && obj.oartifact) ? the(name)
                : (obj && obj.quan > 1) ? name
                  : an(name);
    const dieroll = rnd(20);

    if (game.u.uac + tlev <= dieroll) {
        game.mesg_given = (game.mesg_given | 0) + 1;
        if (game.u.ublind || game.flags?.verbose === false)
            await pline('It misses.');
        else if (game.u.uac + tlev <= dieroll - 2)
            await pline(`${upstart(onm)} misses you.`);
        else
            await You(`are almost hit by ${onm}.`);
        return 0;
    }

    if (game.u.ublind || game.flags?.verbose === false)
        await You(`are hit${exclam(dam)}`);
    else
        await You(`are hit by ${onm}${exclam(dam)}`);

    await losehp(dam, name, KILLED_BY_AN);
    exercise(A_STR, false);
    return 1;
}

// src/trap.c:1188 dotrap() — the hero steps on a trap.
//
// Only the arms whose effects are ported dispatch; every other trap type is
// recorded, so a session that walks onto one is visibly incomplete rather
// than silently wrong.
export async function dotrap(trap, trflags) {
    const ttype = trap.ttyp;

    game.u.utrap = 0;                   /* reset_utrap() */
    if (ttype === ARROW_TRAP)
        return await trapeffect_arrow_trap(game.youmonst, trap, trflags);
    if (ttype === DART_TRAP)
        return await trapeffect_dart_trap(game.youmonst, trap, trflags);
    if (ttype === MAGIC_TRAP)
        return await trapeffect_magic_trap(game.youmonst, trap, trflags);
    if (ttype === BEAR_TRAP)
        return await trapeffect_bear_trap(game.youmonst, trap, trflags);
    if (ttype === RUST_TRAP)
        return await trapeffect_rust_trap(game.youmonst, trap, trflags);

    note_unported_trap(`dotrap:ttyp=${ttype}`);
    return Trap_Effect_Finished;
}


// src/trap.c:4356 domagictrap() — the magic trap's effect roll.
//
// fate = rnd(20) drives everything. Under 10 is the blinding flash (which
// wakes nearby monsters); 10..19 are the individual arms. Only the pure
// message arms are live; the rest record, so a session that lands on one is
// visibly incomplete rather than silently wrong.
async function domagictrap() {
    const fate = rnd(20);

    if (fate < 10) {
        note_unported_trap('domagictrap:blinding_flash');
        return;
    }

    switch (fate) {
    case 13:  /* odd feelings */
        await pline('A shiver runs up and down your spine!');
        break;
    case 14:
        await You_hear('distant howling.');
        break;
    case 16:
        await Your('pack shakes violently!');
        break;
    case 17:
        await You('smell charred flesh.');
        break;
    case 18:
        await You_feel('tired.');
        break;
    default:
        note_unported_trap(`domagictrap:fate=${fate}`);
        break;
    }
}

// src/trap.c:2565 trapeffect_magic_trap() — the hero's arm.
async function trapeffect_magic_trap(mtmp, trap, trflags) {
    if (mtmp !== game.youmonst) {
        if (!rn2(21))
            note_unported_trap('trapeffect_magic_trap:monster_fire');
        return Trap_Effect_Finished;
    }

    seetrap(trap);
    if (!rn2(30)) {
        note_unported_trap('trapeffect_magic_trap:explosion');
        return Trap_Effect_Finished;
    }
    await domagictrap();
    /* steedintrap() — no steed on this tree */
    return Trap_Effect_Finished;
}

/* include/hack.h:1306 */
const FORCETRAP = 0x01, FORCEBUNGLE = 0x08, FAILEDUNTRAP = 0x40;

// src/mondata.c:1617 mon_knows_traps() — mtrapseen is a bitmask of trap types
// this monster has already walked into.
function mon_knows_traps(mtmp, ttyp) {
    return ((mtmp.mtrapseen | 0) & (1 << (ttyp - 1))) !== 0;
}

// src/mondata.c:1629 mon_learns_traps()
function mon_learns_traps(mtmp, ttyp) {
    mtmp.mtrapseen = (mtmp.mtrapseen | 0) | (1 << (ttyp - 1));
}

// src/mon.c:2130 m_in_air()
function m_in_air(mtmp) {
    return (is_flyer(mtmp.data) || is_floater(mtmp.data)
            || (is_clinger(mtmp.data)
                && has_ceiling(game.u.uz) && mtmp.mundetected));
}

// include/mondata.h:23 grounded()
export function grounded(ptr) {
    return !is_flyer(ptr) && !is_floater(ptr)
           && (!is_clinger(ptr) || !has_ceiling(game.u.uz));
}

// src/trap.c:1098 wearing_iron_shoes() — hero or monster wearing iron boots.
function wearing_iron_shoes(mtmp) {
    const armf = (mtmp === game.youmonst) ? (game.u.uarmf || null)
                                          : which_armor(mtmp, W_ARMF);
    return !!(armf && game.objects[armf.otyp].oc_material === MATERIALS.IRON);
}

/* Yname2(uarmf) — "Your <boots>"; xname through the hero's boots. */
function yname_boots() {
    return 'Your ' + xname(game.u.uarmf);
}

// src/trap.c:3570 feeltrap() — like seetrap() but works when blind.
export function feeltrap(trap) {
    trap.tseen = 1;
    newsym(trap.tx, trap.ty);
}

// src/trap.c:3898 thitm() — a trap (or trap missile) hits a monster. Only
// the d_override arm is live here: pits and bear traps force the hit and
// pass no missile, so the to-hit rnd(20) and the missile bookkeeping never
// run for them.
async function thitm(tlev, mon, obj, d_override, nocorpse) {
    let strike;
    let trapkilled = false;

    if (d_override)
        strike = 1;
    else if (obj)
        strike = (find_mac(mon) + tlev + obj.spe <= rnd(20)) ? 1 : 0;
    else
        strike = (find_mac(mon) + tlev <= rnd(20)) ? 1 : 0;

    if (!strike) {
        if (obj && cansee(mon.mx, mon.my))
            await pline(`${Monnam(mon)} is almost hit by ${doname(obj)}!`);
    } else {
        let dam = 1;

        if (obj && cansee(mon.mx, mon.my))
            await pline(`${Monnam(mon)} is hit by ${doname(obj)}!`);
        if (d_override) {
            dam = d_override;
        } else if (obj) {
            dam = dmgval(obj, mon);
            if (dam < 1)
                dam = 1;
        }
        mon.mhp -= dam;
        if (mon.mhp <= 0) {
            const xx = mon.mx, yy = mon.my;

            await monkilled(mon, '', 0 /* AD_PHYS; nocorpse callers absent */);
            if (mon.mhp <= 0) {
                newsym(xx, yy);
                trapkilled = true;
            }
        }
    }
    /* src/trap.c:3955 — an unfired or force-hit missile lands on the
       monster's square; a normally-striking one is used up. */
    if (obj && (!strike || d_override)) {
        place_object(obj, mon.mx, mon.my);
        const { stackobj } = await import('./invent.js');
        stackobj(obj);
    } /* else dealloc_obj(obj): dropped reference is the JS equivalent */

    return trapkilled;
}

// src/trap.c:1478 trapeffect_bear_trap() — monster arm only; the hero arm
// is reached via dotrap and stays recorded until a session steps in one.
async function trapeffect_bear_trap(mtmp, trap, trflags) {
    const is_you = (mtmp === game.youmonst);
    const forcetrap = ((trflags & FORCETRAP) !== 0
                       || (trflags & FAILEDUNTRAP) !== 0
                       || (is_you && (trflags & VIASITTING) !== 0));

    if (is_you) {
        const dmg = d(2, 4);    /* drawn before the escape gates, as in C */

        if ((game.u.uprops?.LEVITATION || game.u.uprops?.FLYING) && !forcetrap)
            return Trap_Effect_Finished;
        feeltrap(trap);
        /* amorphous/whirly/unsolid and the MZ_SMALL escape need polyself;
           an unpolymorphed hero is human-sized and solid */
        if (Upolyd(game.u))
            note_unported_trap('trapeffect_bear_trap:poly_escapes');
        game.u.utrap = rn1(4, 4);       /* set_utrap((unsigned) rn1(4, 4), */
        game.u.utraptype = TT_BEARTRAP; /*           TT_BEARTRAP);         */
        if (game.u.usteed) {
            note_unported_trap('trapeffect_bear_trap:steed');
        } else {
            await pline(`${trap.madeby_u ? 'Your' : 'A'} bear trap closes on your foot!`);
            /* owlbear/bugbear howl needs polyself */
            if (wearing_iron_shoes(mtmp)) {
                await pline(`${yname_boots()} protects your leg.`);
            } else {
                await set_wounded_legs(rn2(2) ? RIGHT_SIDE : LEFT_SIDE,
                                       rn1(10, 10));
                await losehp(dmg, 'bear trap', KILLED_BY_AN);
            }
        }
        exercise(A_DEX, false);
        return Trap_Effect_Finished;
    }

    const mptr = mtmp.data;
    const in_sight = canseemon(mtmp) || (mtmp === game.u.usteed);
    let trapkilled = false;

    if (mptr.msize > MFLAGS.MZ_SMALL && !amorphous(mptr) && !m_in_air(mtmp)
        && !is_whirly(mptr) && !unsolid(mptr)) {
        mtmp.mtrapped = 1;
        if (in_sight) {
            await pline(`${Monnam(mtmp)} is caught in ${trap.madeby_u ? 'your' : 'a'} bear trap!`);
            seetrap(trap);
        } else {
            if (mtmp.mnum === PMNAMES.PM_OWLBEAR
                || mtmp.mnum === PMNAMES.PM_BUGBEAR)
                await You_hear('the roaring of an angry bear!');
        }
    } else if (forcetrap) {
        if (in_sight) {
            await pline(`${Monnam(mtmp)} evades ${trap.madeby_u ? 'your' : 'a'} bear trap!`);
            seetrap(trap);
        }
    }
    if (mtmp.mtrapped && !wearing_iron_shoes(mtmp))
        trapkilled = await thitm(0, mtmp, null, d(2, 4), false);

    return trapkilled ? Trap_Killed_Mon : mtmp.mtrapped
        ? Trap_Caught_Mon : Trap_Effect_Finished;
}

// src/trap.c:1826 trapeffect_pit() — monster arm only.
async function trapeffect_pit(mtmp, trap, trflags) {
    const ttype = trap.ttyp;
    let relevant_spikes = (ttype === SPIKED_PIT);
    const in_sight = canseemon(mtmp) || (mtmp === game.u.usteed);
    let trapkilled = false;
    const forcetrap = ((trflags & FORCETRAP) !== 0);
    const inescapable = (forcetrap || (Sokoban() && !trap.madeby_u));
    const mptr = mtmp.data;
    let fallverb = 'falls';

    if (!grounded(mptr)
        || (mtmp.wormno
            && !note_unported_trap('trapeffect_pit:count_wsegs'))) {
        if (forcetrap && !Sokoban()) {
            /* openfallingtrap; not inescapable here */
            if (in_sight) {
                seetrap(trap);
                await pline(`${Monnam(mtmp)} doesn't fall into the pit.`);
            }
            return Trap_Effect_Finished;
        }
        if (!inescapable)
            return Trap_Effect_Finished; /* avoids trap */
        fallverb = 'is dragged'; /* sokoban pit */
    }
    if (!passes_walls(mptr))
        mtmp.mtrapped = 1;
    if (in_sight) {
        await pline(`${Monnam(mtmp)} ${fallverb} into ${trap.madeby_u ? 'your' : 'a'} pit!`);
        if (mtmp.mnum === PMNAMES.PM_PIT_VIPER
            || mtmp.mnum === PMNAMES.PM_PIT_FIEND)
            await pline("How pitiful.  Isn't that the pits?");
        seetrap(trap);
    }
    /* mselftouch: only bites when the monster wields a petrifying corpse */
    if (mselftouch_would_fire(mtmp))
        note_unported_trap('trapeffect_pit:mselftouch');
    if (wearing_iron_shoes(mtmp))
        relevant_spikes = false;
    if (mtmp.mhp <= 0
        || await thitm(0, mtmp, null, rnd(relevant_spikes ? 10 : 6), false))
        trapkilled = true;

    return trapkilled ? Trap_Killed_Mon : mtmp.mtrapped
        ? Trap_Caught_Mon : Trap_Effect_Finished;
}

// src/trap.c:1817 m_easy_escape_pit()
function m_easy_escape_pit(mtmp) {
    return (mtmp.mnum === PMNAMES.PM_PIT_FIEND
            || mtmp.data.msize >= MFLAGS.MZ_HUGE);
}

/* src/trap.c:5624 fill_pit() — a boulder on the square settles into the
   pit through flooreffects. Reached only from the boulder escape arm,
   which needs a boulder in the pit; record until one exists. */
function fill_pit_note(x, y) {
    note_unported_trap('mintrap:fill_pit');
}

/* src/trap.c mselftouch() fires only for a monster wielding a petrifying
   corpse bare-handed; nothing generated yet can. The gate keeps the note
   honest. */
function mselftouch_would_fire(mon) {
    const mwep = mon.mw;
    return !!(mwep && mwep.otyp === ONAMES.CORPSE);
}

// src/trap.c trapeffect_selector() — dispatch one trap's effect for whoever
// stepped on it. Only the arms this port has are wired; the rest record so a
// session that lands on one is visibly incomplete rather than silently wrong.
async function trapeffect_selector(mtmp, trap, trflags) {
    switch (trap.ttyp) {
    case ARROW_TRAP:
        return await trapeffect_arrow_trap(mtmp, trap, trflags);
    case DART_TRAP:
        return await trapeffect_dart_trap(mtmp, trap, trflags);
    case MAGIC_TRAP:
        return await trapeffect_magic_trap(mtmp, trap, trflags);
    case BEAR_TRAP:
        return await trapeffect_bear_trap(mtmp, trap, trflags);
    case PIT:
    case SPIKED_PIT:
        return await trapeffect_pit(mtmp, trap, trflags);
    case RUST_TRAP:
        return await trapeffect_rust_trap(mtmp, trap, trflags);
    default:
        note_unported_trap(`trapeffect_selector:ttyp=${trap.ttyp}`);
        return Trap_Effect_Finished;
    }
}

// src/trap.c:3733 mintrap() — a monster steps onto a trap.
//
// The "already caught in it" half is recorded: escaping draws rn2(40) and
// then branches through boulders, metallivores and eels, none of which any
// session has reached. The fresh-trigger half is live, because that is what
// spends draws on the common path.
export async function mintrap(mtmp, mintrapflags) {
    const trap = t_at_mon(mtmp.mx, mtmp.my);
    let trap_result = Trap_Effect_Finished;

    if (!trap) {
        mtmp.mtrapped = 0;      /* perhaps teleported? */
    } else if (mtmp.mtrapped) { /* is currently in the trap */
        if (!trap.tseen && cansee(mtmp.mx, mtmp.my) && canseemon(mtmp)
            && (is_pit(trap.ttyp) || trap.ttyp === BEAR_TRAP
                || trap.ttyp === HOLE
                || trap.ttyp === WEB)) {
            /* If you come upon an obviously trapped monster, then
               you must be able to see the trap it's in too. */
            seetrap(trap);
        }

        if (!rn2(40) || (is_pit(trap.ttyp) && m_easy_escape_pit(mtmp))) {
            if (sobj_at(ONAMES.BOULDER, mtmp.mx, mtmp.my)
                && is_pit(trap.ttyp)) {
                if (!rn2(2)) {
                    mtmp.mtrapped = 0;
                    if (canseemon(mtmp))
                        await pline(`${Monnam(mtmp)} pulls free...`);
                    fill_pit_note(mtmp.mx, mtmp.my);
                }
            } else {
                if (canseemon(mtmp)) {
                    if (is_pit(trap.ttyp))
                        await pline(`${Monnam(mtmp)} climbs ${
                            m_easy_escape_pit(mtmp) ? 'easily ' : ''}out of the pit.`);
                    else if (trap.ttyp === BEAR_TRAP || trap.ttyp === WEB)
                        await pline(`${Monnam(mtmp)} pulls free of the ${
                            trap.ttyp === BEAR_TRAP ? 'bear trap' : 'web'}.`);
                }
                mtmp.mtrapped = 0;
            }
        } else if (metallivorous(mtmp.data)) {
            if (trap.ttyp === BEAR_TRAP) {
                if (canseemon(mtmp))
                    await pline(`${Monnam(mtmp)} eats a bear trap!`);
                deltrap(trap);
                mtmp.meating = 5;
                mtmp.mtrapped = 0;
            } else if (trap.ttyp === SPIKED_PIT) {
                if (canseemon(mtmp))
                    await pline(`${Monnam(mtmp)} munches on some spikes!`);
                trap.ttyp = PIT;
                mtmp.meating = 5;
            }
        }
        trap_result = mtmp.mtrapped ? Trap_Caught_Mon : Trap_Effect_Finished;
    } else {
        const tt = trap.ttyp;
        let forcetrap = ((mintrapflags & FORCETRAP) !== 0);
        const forcebungle = (mintrapflags & FORCEBUNGLE) !== 0;
        /* monster has seen such a trap before */
        const already_seen = (mon_knows_traps(mtmp, tt)
                              || (tt === HOLE && !mindless(mtmp.data)));

        if (fixed_tele_trap(trap)) {
            mintrapflags |= FORCETRAP;
            forcetrap = true;
        }

        if (mtmp === game.u.usteed) {
            /* true when called from dotrap, inescapable is not an option */
        } else if (Sokoban() && (is_pit(tt) || is_hole(tt)) && !trap.madeby_u) {
            /* nothing here, the trap effects will handle messaging */
        } else if (!forcetrap) {
            if (floor_trigger(tt) && check_in_air(mtmp, mintrapflags))
                return Trap_Effect_Finished;
            if (already_seen && rn2(4) && !forcebungle)
                return Trap_Effect_Finished;
        }

        mon_learns_traps(mtmp, tt);
        /* mons_see_trap() marks the trap seen by onlookers */

        /* Monster is aggravated by being trapped by you. Recognizing who made
           the trap isn't completely unreasonable; everybody has their own
           style. */
        if (trap.madeby_u && rnl(5))
            note_unported_trap('mintrap:setmangry');

        trap_result = await trapeffect_selector(mtmp, trap, mintrapflags);
    }
    return trap_result;
}

/* src/trap.c fixed_tele_trap() — a vault or level teleporter always fires. */
function fixed_tele_trap(trap) {
    return (trap.ttyp === LEVEL_TELEP || (trap.ttyp === TELEP_TRAP && trap.once));
}


/* is_pit by trap type, exported for trapmove's adjacent-pit check. */
export function is_pit_ttyp(ttyp) {
    return is_pit(ttyp);
}
// src/trap.c:6648 uteetering_at_seen_pit() — escaped a pit and standing on
// the precipice.
export function uteetering_at_seen_pit(trap) {
    return !!(trap && is_pit(trap.ttyp) && trap.tseen
              && game.u.ux === trap.tx && game.u.uy === trap.ty
              && !(game.u.utrap && game.u.utraptype === TT_PIT));
}

// src/trap.c:6660 uescaped_shaft() — didn't fall through a hole / didn't
// release a trap door.
export function uescaped_shaft(trap) {
    return !!(trap && is_hole(trap.ttyp) && trap.tseen
              && game.u.ux === trap.tx && game.u.uy === trap.ty);
}

// src/apply.c:1518 splash_lit() — a lit lamp/candle hit by water. Only a
// BRASS_LANTERN survives a rust-trap splash; everything else lamplit goes
// out. No light-source timers exist in the port yet, so a lamplit object
// records; an unlit one returns false without drawing, which is the whole
// path today.
function splash_lit(obj) {
    if (!obj || !obj.lamplit)
        return false;
    note_unported_trap('splash_lit:lamplit');
    return false;
}

// src/mkobj.c:2270 is_flammable()
export function is_flammable(otmp) {
    const otyp = otmp.otyp;
    const omat = game.objects[otyp].oc_material;
    /* Is_candle */
    if (otyp === ONAMES.TALLOW_CANDLE || otyp === ONAMES.WAX_CANDLE)
        return false;
    if (game.objects[otyp].oc_oprop === 26 /* FIRE_RES */
        || otyp === ONAMES.WAN_FIRE)
        return false;
    return (omat <= MATERIALS.WOOD && omat !== MATERIALS.LIQUID)
           || omat === MATERIALS.PLASTIC;
}

// src/mkobj.c:2289 is_rottable()
export function is_rottable(otmp) {
    const omat = game.objects[otmp.otyp].oc_material;
    return omat <= MATERIALS.WOOD && omat !== MATERIALS.LIQUID;
}

/* include/objclass.h:200 is_rustprone(), :201 is_crackable(),
   :204 is_corrodeable() */
const is_rustprone = (otmp) =>
    game.objects[otmp.otyp].oc_material === MATERIALS.IRON;
const is_crackable = (otmp) =>
    game.objects[otmp.otyp].oc_material === MATERIALS.GLASS
    && otmp.oclass === OCLASSES.ARMOR_CLASS;
const is_corrodeable = (otmp) =>
    game.objects[otmp.otyp].oc_material === MATERIALS.COPPER
    || game.objects[otmp.otyp].oc_material === MATERIALS.IRON;

// src/trap.c:171 erode_obj() — generic erode-item function. Draws only the
// rnl(4) blessed-protection roll. The shop-billing (EF_PAY) and destroy-arm
// unwearing paths sit on unported subsystems and record themselves.
export async function erode_obj(otmp, ostr, type, ef_flags) {
    const action = ['smoulder', 'rust', 'rot', 'corrode', 'crack'];
    const msg = ['burnt', 'rusted', 'rotten', 'corroded', 'cracked'];
    const bythe = ['heat', 'oxidation', 'decay', 'corrosion', 'impact'];

    if (!otmp)
        return ER_NOTHING;

    let check_grease = (ef_flags & EF_GREASE) !== 0;
    const print = (ef_flags & EF_VERBOSE) !== 0;
    let vulnerable = false, is_primary = true, crackers = false;

    const victim = carried_tr(otmp) ? game.youmonst
                   : otmp.ocarry ? otmp.ocarry : null;
    const uvictim = victim === game.youmonst;
    const vismon = victim && !uvictim && canseemon(victim);
    const visobj = !victim && cansee(game.bhitpos?.x ?? 0,
                                     game.bhitpos?.y ?? 0);

    switch (type) {
    case ERODE_BURN:
        vulnerable = is_flammable(otmp);
        check_grease = false;
        break;
    case ERODE_RUST:
        vulnerable = is_rustprone(otmp);
        break;
    case ERODE_ROT:
        vulnerable = is_rottable(otmp);
        check_grease = false;
        is_primary = false;
        break;
    case ERODE_CORRODE:
        vulnerable = is_corrodeable(otmp);
        is_primary = false;
        break;
    case ERODE_CRACK:
        vulnerable = is_crackable(otmp);
        is_primary = true;
        crackers = true;
        break;
    default:
        return ER_NOTHING;
    }
    const erosion = is_primary ? (otmp.oeroded || 0) : (otmp.oeroded2 || 0);

    if (!ostr)
        ostr = cxname(otmp);

    if (check_grease && otmp.greased) {
        note_unported_trap('erode_obj:grease_protect');
        return 1 /* ER_GREASED */;
    } else if (!erosion_matters(otmp, game.objects)) {
        return ER_NOTHING;
    } else if (!vulnerable || (otmp.oerodeproof && otmp.rknown)) {
        if (game.flags?.verbose && print && (uvictim || vismon))
            await pline(`${uvictim ? 'Your' : "The"} ${ostr} ${vtense(ostr, 'are')} not affected by ${bythe[type]}.`);
        return ER_NOTHING;
    } else if (otmp.oerodeproof || (otmp.blessed && !rnl(4))) {
        if (game.flags?.verbose && (print || otmp.oerodeproof)
            && (uvictim || vismon || visobj))
            await pline(`Somehow, ${uvictim ? 'your' : 'the'} ${ostr} ${vtense(ostr, 'are')} not affected by the ${bythe[type]}.`);
        if (otmp.oerodeproof) {
            otmp.rknown = 1;
            if (uvictim)
                update_inventory();
        }
        return ER_NOTHING;
    } else if (erosion < MAX_ERODE) {
        const adverb = (erosion + 1 === MAX_ERODE) ? ' completely'
                       : erosion ? ' further' : '';
        if (uvictim || vismon || visobj)
            await pline(`${uvictim ? 'Your' : vismon ? Monnam(victim) + "'s" : 'The'} ${ostr} ${vtense(ostr, action[type])}${adverb}!`);
        if (ef_flags & EF_PAY)
            note_unported_trap('erode_obj:costly_alteration');
        if (is_primary)
            otmp.oeroded = (otmp.oeroded || 0) + 1;
        else
            otmp.oeroded2 = (otmp.oeroded2 || 0) + 1;
        if (uvictim)
            update_inventory();
        return ER_DAMAGED;
    } else if (ef_flags & EF_DESTROY) {
        note_unported_trap('erode_obj:destroy');
        return ER_NOTHING;
    } else {
        if (game.flags?.verbose && print) {
            if (uvictim)
                await Your(`${ostr} ${vtense(ostr, game.u.ublind ? 'feel' : 'look')} completely ${msg[type]}.`);
            else if (vismon || visobj)
                await pline(`The ${ostr} ${vtense(ostr, game.u.ublind ? 'feel' : 'look')} completely ${msg[type]}.`);
        }
        return ER_NOTHING;
    }
}

/* include/obj.h carried() — obj is in hero inventory */
function carried_tr(obj) {
    return obj.where === 3 /* OBJ_INVENT */ || game.invent.includes(obj);
}

// src/trap.c:4712 water_damage() — get an object wet and damage it.
// Draws: greased rn2(2), cursed-container rn2(3), the (Luck+5) > rn2(20)
// protection roll when force is FALSE, spestudied rn2. The towel and
// acid-potion arms sit on unported subsystems and record.
export async function water_damage(obj, ostr, force) {
    const in_invent = obj && carried_tr(obj);
    let described = false;

    if (!obj)
        return ER_NOTHING;

    if (splash_lit(obj))
        return ER_DAMAGED;

    if (!ostr)
        ostr = cxname(obj);

    if (obj.otyp === ONAMES.CAN_OF_GREASE && obj.spe > 0) {
        return ER_NOTHING;
    } else if (obj.otyp === ONAMES.TOWEL && obj.spe < 7) {
        note_unported_trap('water_damage:wet_a_towel');
        /* wet_a_towel(obj, -rnd(7 - obj->spe), TRUE) — the draw is real */
        rnd(7 - obj.spe);
        return ER_NOTHING;
    } else if (obj.greased) {
        if (!rn2(2)) {
            obj.greased = 0;
            if (in_invent) {
                await pline_The(`grease on ${xname(obj)} washes off.`);
                described = true;
                update_inventory();
            }
            if (obj.otyp === ONAMES.POT_ACID) {
                note_unported_trap('water_damage:pot_acid');
                return ER_DESTROYED;
            }
        }
        return 1 /* ER_GREASED */;
    } else if (Is_container_tr(obj)
               && (!Waterproof_container_tr(obj)
                   || (obj.cursed && !rn2(3)))) {
        if (in_invent)
            await pline(`Some water gets into your ${ostr}!`);
        await water_damage_chain(obj.cobj || [], false);
        return ER_DAMAGED;
    } else if (Waterproof_container_tr(obj)) {
        if (in_invent && !game.u.ublind && !Underwater_tr())
            await pline_The(`water cannot get into your ${ostr}.`);
        return ER_DAMAGED;
    } else if (!force && ((game.u.uluck || 0) + 5) > rn2(20)) {
        return ER_NOTHING;
    } else if (obj.oclass === OCLASSES.SCROLL_CLASS) {
        if (obj.otyp === ONAMES.SCR_BLANK_PAPER)
            return 0;
        if (in_invent)
            await Your(`${ostr} ${vtense(ostr, 'fade')}.`);
        obj.otyp = ONAMES.SCR_BLANK_PAPER;
        obj.dknown = 0;
        obj.spe = 0;
        if (in_invent)
            update_inventory();
        return ER_DAMAGED;
    } else if (obj.oclass === OCLASSES.SPBOOK_CLASS) {
        if (obj.otyp === ONAMES.SPE_BOOK_OF_THE_DEAD) {
            await pline('Steam rises from the Book of the Dead.');
            return ER_NOTHING;
        }
        if (in_invent)
            await Your(`${ostr} ${vtense(ostr, 'fade')}.`);
        if (obj.spestudied)
            obj.spestudied = rn2(obj.spestudied);
        obj.otyp = ONAMES.SPE_BLANK_PAPER;
        obj.dknown = 0;
        if (in_invent)
            update_inventory();
        return ER_DAMAGED;
    } else if (obj.oclass === OCLASSES.POTION_CLASS) {
        if (obj.otyp === ONAMES.POT_ACID) {
            note_unported_trap('water_damage:pot_acid');
            return ER_DESTROYED;
        } else if (obj.odiluted) {
            if (in_invent)
                await Your(`${ostr} ${vtense(ostr, 'dilute')} further.`);
            obj.otyp = ONAMES.POT_WATER;
            obj.dknown = 0;
            obj.blessed = obj.cursed = 0;
            obj.odiluted = 0;
            if (in_invent)
                update_inventory();
            return ER_DAMAGED;
        } else if (obj.otyp !== ONAMES.POT_WATER) {
            if (in_invent)
                await Your(`${ostr} ${vtense(ostr, 'dilute')}.`);
            obj.odiluted = (obj.odiluted || 0) + 1;
            if (in_invent)
                update_inventory();
            return ER_DAMAGED;
        }
    } else {
        return await erode_obj(obj, ostr, ERODE_RUST, EF_NONE);
    }
    return ER_NOTHING;
}

/* include/obj.h Is_container() / Waterproof_container() */
function Is_container_tr(obj) {
    return obj.otyp === ONAMES.LARGE_BOX || obj.otyp === ONAMES.CHEST
        || obj.otyp === ONAMES.ICE_BOX || obj.otyp === ONAMES.SACK
        || obj.otyp === ONAMES.OILSKIN_SACK || obj.otyp === ONAMES.BAG_OF_HOLDING
        || obj.otyp === ONAMES.BAG_OF_TRICKS;
}
function Waterproof_container_tr(obj) {
    return obj.otyp === ONAMES.OILSKIN_SACK || obj.otyp === ONAMES.CHEST
        || obj.otyp === ONAMES.LARGE_BOX || obj.otyp === ONAMES.ICE_BOX;
}
function Underwater_tr() {
    return !!game.u?.uinwater;
}

// src/trap.c:4855 water_damage_chain() — apply water damage down a
// container's contents chain.
export async function water_damage_chain(objs, here) {
    for (const obj of (objs || []))
        await water_damage(obj, null, false);
}

// src/trap.c:1602 trapeffect_rust_trap() — a gush of water; one rn2(5)
// picks the target slot, then water_damage on whatever is there.
async function trapeffect_rust_trap(mtmp, trap, trflags) {
    const A_gush = 'A gush of water hits';

    if (mtmp === game.youmonst) {
        seetrap(trap);

        switch (rn2(5)) {
        case 0:
            await pline(`${A_gush} you on the ${body_part(HEAD)}!`);
            await water_damage(game.u.uarmh,
                               helm_simple_name(game.u.uarmh), true);
            break;
        case 1: {
            await pline(`${A_gush} your left ${body_part(ARM)}!`);
            if (await water_damage(game.u.uarms, 'shield', true)
                !== ER_NOTHING)
                break;
            if (game.u.twoweap
                || (game.u.uwep && bimanual_tr(game.u.uwep)))
                await water_damage(game.u.twoweap ? game.u.uswapwep
                                                  : game.u.uwep, null, true);
            await water_damage(game.u.uarmg,
                               gloves_simple_name(game.u.uarmg), true);
            break;
        }
        case 2:
            await pline(`${A_gush} your right ${body_part(ARM)}!`);
            await water_damage(game.u.uwep, null, true);
            await water_damage(game.u.uarmg,
                               gloves_simple_name(game.u.uarmg), true);
            break;
        default:
            await pline(`${A_gush} you!`);
            for (const otmp of [...game.invent]) {
                if (otmp.lamplit && otmp !== game.u.uwep
                    && (otmp !== game.u.uswapwep || !game.u.twoweap))
                    splash_lit(otmp);
            }
            if (game.u.uarmc)
                await water_damage(game.u.uarmc,
                                   cloak_simple_name(game.u.uarmc), true);
            else if (game.u.uarm)
                await water_damage(game.u.uarm,
                                   suit_simple_name(game.u.uarm), true);
            else if (game.u.uarmu)
                await water_damage(game.u.uarmu, 'shirt', true);
        }
        update_inventory();

        if (Upolyd(game.u))
            note_unported_trap('rust_trap:polyd_iron_golem_gremlin');
    } else {
        const in_sight = canseemon(mtmp) || (mtmp === game.u.usteed);
        let trapkilled = false;
        const mptr = game.mons[mtmp.mnum];

        if (in_sight)
            seetrap(trap);
        switch (rn2(5)) {
        case 0:
            if (in_sight)
                await pline(`${A_gush} ${mon_nam(mtmp)} on the head!`);
            await water_damage(which_armor(mtmp, W_ARMH), 'helmet', true);
            break;
        case 1: {
            if (in_sight)
                await pline(`${A_gush} ${mon_nam(mtmp)}'s left arm!`);
            const shield = which_armor(mtmp, W_ARMS);
            if (await water_damage(shield, 'shield', true) !== ER_NOTHING)
                break;
            const wep = MON_WEP(mtmp);
            if (wep && bimanual_tr(wep))
                await water_damage(wep, null, true);
            await water_damage(which_armor(mtmp, W_ARMG), 'gloves', true);
            break;
        }
        case 2:
            if (in_sight)
                await pline(`${A_gush} ${mon_nam(mtmp)}'s right arm!`);
            await water_damage(MON_WEP(mtmp), null, true);
            await water_damage(which_armor(mtmp, W_ARMG), 'gloves', true);
            break;
        default:
            if (in_sight)
                await pline(`${A_gush} ${mon_nam(mtmp)}!`);
            for (const otmp of (mtmp.minvent || []))
                if (otmp.lamplit && (otmp.owornmask & (W_WEP | W_SWAPWEP)) === 0)
                    splash_lit(otmp);
            {
                let target;
                if ((target = which_armor(mtmp, W_ARMC)) != null)
                    await water_damage(target, cloak_simple_name(target), true);
                else if ((target = which_armor(mtmp, W_ARM)) != null)
                    await water_damage(target, suit_simple_name(target), true);
                else if ((target = which_armor(mtmp, W_ARMU)) != null)
                    await water_damage(target, 'shirt', true);
            }
        }

        if (completelyrusts_tr(mptr)) {
            if (in_sight)
                await pline(`${Monnam(mtmp)} falls to pieces!`);
            monkilled(mtmp, null, ATTKS.AD_RUST);
            if (DEADMONSTER(mtmp))
                trapkilled = true;
        } else if (mptr.pmidx === PMNAMES.PM_GREMLIN && rn2(3)) {
            note_unported_trap('rust_trap:gremlin_split');
        }

        return trapkilled ? Trap_Killed_Mon
               : mtmp.mtrapped ? Trap_Caught_Mon : Trap_Effect_Finished;
    }
    return Trap_Effect_Finished;
}

/* include/monst.h completelyrusts() — iron golems */
function completelyrusts_tr(mptr) {
    return mptr.pmidx === PMNAMES.PM_IRON_GOLEM;
}

/* include/obj.h bimanual() — two-handed weapon or polearm */
function bimanual_tr(obj) {
    return !!game.objects[obj.otyp]?.oc_bimanual;
}

// src/trap.c:4024 float_down() — return the hero to the surface when
// levitation ends (or, with emask W_SADDLE, when dismounting). The
// levitation-specific arms (BLevitation, BFlying, Punished ball-drag,
// drown/lava) belong to state the port does not carry yet and record
// themselves; the dismount path used today runs the trap check and the
// pickup(1) tail for real.
export async function float_down(hmask, emask) {
    let trap = null;
    let no_msg = false;

    /* HLevitation &= ~hmask; ELevitation &= ~emask; — the flat uprops map
       has one LEVITATION slot; clear it only when a mask was given and it
       was set (nothing grants levitation yet, so this is bookkeeping). */
    if ((hmask || emask) && game.u.uprops?.LEVITATION)
        note_unported_trap('float_down:levitation_sources');
    if (game.u.uprops?.LEVITATION)
        return 0; /* maybe another ring/potion/boots */

    game.disp ||= {};
    game.disp.botl = true;
    nomul(0); /* stop running or resting */

    if (game.u.uswallow) {
        note_unported_trap('float_down:uswallow');
        await encumber_msg();
        return 1;
    }

    if (game.uball)
        note_unported_trap('float_down:punished_ball_drop');

    /* check for falling into pool - added by GAN 10/20/86 */
    const Flying = !!game.u.uprops?.FLYING
        || !!(game.u.usteed && is_flyer(game.u.usteed.data));
    if (!Flying) {
        if (!game.u.uswallow && game.u.ustuck) {
            note_unported_trap('float_down:ustuck_release');
        }
        if (is_pool(game.u.ux, game.u.uy) && !game.u.uinwater)
            note_unported_trap('float_down:drown');
        if (is_lava(game.u.ux, game.u.uy)) {
            note_unported_trap('float_down:lava_effects');
            no_msg = true;
        }
    }
    if (!trap) {
        trap = t_at_mon(game.u.ux, game.u.uy);
        if (Is_airlevel(game.u.uz)) {
            await You('begin to tumble in place.');
        } else if (Is_waterlevel(game.u.uz) && !no_msg) {
            await You_feel('heavier.');
        } else if (!game.u.uinwater && !no_msg) {
            if (!(emask & W_SADDLE)) {
                if (In_sokoban(game.u.uz) && trap) {
                    await You('fall over.');
                    await losehp(rnd(2), 'dangerous winds', 0 /* KILLED_BY */);
                    if (game.u.usteed) {
                        const { dismount_steed } = await import('./steed.js');
                        await dismount_steed(1 /* DISMOUNT_FELL */);
                    }
                    note_unported_trap('float_down:selftouch');
                } else if (game.u.usteed && (is_floater(game.u.usteed.data)
                                             || is_flyer(game.u.usteed.data))) {
                    await You('settle more firmly in the saddle.');
                } else {
                    await You(`float gently to the ${surface(game.u.ux, game.u.uy)}.`);
                }
            }
        }
    }

    /* levitation gives maximum carrying capacity, so having it end
       potentially triggers greater encumbrance; do this after
       'come down' messages, before trap activation or autopickup */
    await encumber_msg();

    const current_dungeon_level = { dnum: game.u.uz.dnum,
                                    dlevel: game.u.uz.dlevel };
    if (trap) {
        switch (trap.ttyp) {
        case STATUE_TRAP:
            break;
        case HOLE:
        case TRAPDOOR:
            /* Can_fall_thru(&u.uz) — every level in the sessions can */
            if (game.u.ustuck)
                break;
            /* FALLTHRU */
        default:
            if (!game.u.utrap) /* not already in the trap */
                await dotrap(trap, NO_TRAP_FLAGS);
        }
    }
    /* on_level(&u.uz, &current_dungeon_level) — dungeon.h macro, inline */
    if (!Is_airlevel(game.u.uz) && !Is_waterlevel(game.u.uz)
        && !game.u.uswallow
        && game.u.uz.dnum === current_dungeon_level.dnum
        && game.u.uz.dlevel === current_dungeon_level.dlevel)
        await pickup(1);
    return 1;
}


// src/trap.c:4183 climb_pit() — the hero struggles out of a pit. The
// Passes_walls, boulder-crevice and flying arms are gated; the ordinary
// escape is the --utrap roll.
export async function climb_pit() {
    if (!game.u.utrap || game.u.utraptype !== TT_PIT)
        return;

    if (game.u.uprops?.WWALKING /* Passes_walls */) {
        note_unported_trap('climb_pit:passes_walls');
    } else if (!rn2(2) && sobj_at(ONAMES.BOULDER, game.u.ux, game.u.uy)) {
        await Your('leg gets stuck in a crevice.');
        await You('free your leg.');
    } else if (game.u.uprops?.FLYING && !Sokoban()) {
        note_unported_trap('climb_pit:flying');
    } else if (!(--game.u.utrap)) {
        game.u.utrap = 0;
        game.u.utraptype = 0;   /* reset_utrap(FALSE) */
        await You('crawl to the edge of the pit.');
        fill_pit_note(game.u.ux, game.u.uy);
        game.vision_full_recalc = 1; /* vision limits change */
    } else if (game.u.dz || game.flags?.verbose !== false) {
        await Norep('You are still in a pit.');
    }
}
