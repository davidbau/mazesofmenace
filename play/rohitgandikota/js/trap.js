// trap.js — traps.
// C ref: src/trap.c
//
// Only the level-generation entry points are here so far. maketrap() itself
// still lives in js/mklev.js alongside the rest of the level builder; this file
// holds the pieces of src/trap.c it calls into, so that a grep for a C symbol
// finds it in the file its C twin lives in.

import { m_at, t_at as t_at_mon } from './mon.js';
import { inv_cnt, crawl_destination, unmul, in_rooms } from './hack.js';
import { near_capacity } from './attrib.js';
import { UNENCUMBERED, SLT_ENCUMBER, KILLED_BY, DROWNING, BURNING,
         WATER, FIRE_RES } from './const.js';
import { goodpos, makemon, remove_monster } from './makemon.js';
import { waterbody_name } from './pager.js';
import { hliquid } from './do_name.js';
import { Teleport_control, Unaware, Sleep_resistance } from './youprop.js';
import { teleds, safe_teleds, TELEDS_ALLOW_DRAG,
         TELEDS_TELEPORT } from './teleport.js';
import { done } from './end.js';
import { recalc_block_point, vision_recalc } from './vision.js';
import { useupall } from './invent.js';
import { destroy_items, obj_resists } from './zap.js';

import { game } from './gstate.js';
import { rn2, rnd } from './rng.js';
import { mksobj, place_object, splitobj } from './mkobj.js';
import { weight } from './invent.js';
import { dmgval } from './weapon.js';
import { observe_object } from './o_init.js';
import { canspotmon, display_object_at, newsym, pline,
         temporary_object_glyph } from './display.js';
import { You, You_hear, You_feel, You_see, Your, Norep } from './pline.js';
import { an, the, doname, mshot_xname, xname, Yname2 } from './objnam.js';
import { upstart } from './do_name.js';
import { losehp } from './hack.js';
import { monkilled } from './mon.js';
import { find_mac, which_armor } from './worn.js';
import { canseemon } from './display.js';
import { cansee } from './vision.js';
import { passes_walls, likes_lava, throws_rocks } from './mondata.js';
import { has_ceiling, Can_fall_thru } from './dungeon.js';
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
import { MON_WEP, DEADMONSTER, helpless } from './monst.js';
import { erosion_matters } from './mkobj.js';
import { cxname, vtense, suit_simple_name,
         gloves_simple_name } from './objnam.js';
import { helm_simple_name, cloak_simple_name, hard_helmet } from './do_wear.js';
import { update_inventory } from './invent.js';
import { OCLASSES } from './objects_data.js';
import { is_pool, is_lava } from './mon.js';
import { encumber_msg } from './attrib.js';
import { nomul } from './hack.js';
import { pickup } from './pickup.js';
import { surface, In_sokoban } from './dungeon.js';
import { Is_airlevel, Is_waterlevel } from './const.js';
import { count_wsegs } from './worm.js';

/* src/trap.h — trapeffect_*() return values. */
/* include/trap.h:98-101 — Trap_Is_Gone shares 0 with Finished. */
const Trap_Effect_Finished = 0, Trap_Is_Gone = 0,
      Trap_Caught_Mon = 1, Trap_Killed_Mon = 2, Trap_Moved_Mon = 3;

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
         VIBRATING_SQUARE, BOLT_LIM, WT_ELF, VAULT, TEMPLE, SHOPBASE,
         Is_firelevel, Is_earthlevel, IS_AIR, IS_ROOM,
         IS_WALL, IS_DOOR, SDOOR, MIGR_RANDOM, MON_MIGRATING,
         NO_MM_FLAGS, TIMEOUT } from './const.js';
import { just_an } from './objnam.js';
import { Deaf, Levitation, Flying, Hallucination, Underwater,
         See_invisible, Invis } from './youprop.js';
import { mindless } from './mondata.js';
import { couldsee } from './vision.js';
import { mdistu } from './monmove.js';
import { wake_nearby, wake_nearto } from './mon.js';
import { MFLAGS, PMNAMES, ATTKS, MONSYMS } from './monst_data.js';
import { is_pit, is_hole, TT_BEARTRAP, TT_PIT, Upolyd, LEFT_SIDE,
         RIGHT_SIDE } from './const.js';
import { defsyms, cmap_names } from './drawing_data.js';
import { xytodir } from './cmd.js';
import { mons_see_trap } from './mondata.js';
const CM_S_arrow_trap = cmap_names.S_arrow_trap;
import { set_wounded_legs } from './do.js';
import { obj_extract_self, sobj_at } from './invent.js';
import { metallivorous } from './mondata.js';
import { amorphous, is_whirly, unsolid, is_clinger, is_floater, is_flyer,
         webmaker, nohands, defended, resists_fire, resists_sleep, breathless,
         resists_magm, resists_blnd, flaming, acidic } from './mondata.js';
import { ECMD_OK } from './const.js';

// src/trap.c:5250 dountrap() and the preliminary could_untrap() checks.
export async function dountrap() {
    const mdat = game.youmonst.data;
    if ((nohands(mdat) && !webmaker(mdat)) || !mdat.mmove) {
        await pline('And just how do you expect to do that?');
        return ECMD_OK;
    }
    (game.unported ||= new Set()).add('trap:dountrap');
    return ECMD_OK;
}

// include/rm.h:538 Sokoban — the level flag, not the dungeon branch.
// (lspo_level_flags stores 1, not true, so no strict-equality test here.)
const Sokoban = () => !!game.level?.flags?.sokoban_rules;

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

// src/dungeon.c:1714 ceiling(), used by the falling-rock message.
function trap_ceiling(x, y) {
    const lev = game.level?.at(x, y);

    if (in_rooms(x, y, VAULT))
        return "vault's ceiling";
    if (in_rooms(x, y, TEMPLE))
        return "temple's ceiling";
    if (in_rooms(x, y, SHOPBASE))
        return "shop's ceiling";
    if (Is_waterlevel(game.u.uz))
        return 'water above';
    if (lev && IS_AIR(lev.typ))
        return 'sky';
    if (Is_firelevel(game.u.uz))
        return 'flames above';
    if (In_quest(game.u.uz))
        return 'expanse above';
    if (Underwater())
        return "water's surface";
    if (lev && ((IS_ROOM(lev.typ) && !Is_earthlevel(game.u.uz))
                || IS_WALL(lev.typ) || IS_DOOR(lev.typ)
                || lev.typ === SDOOR))
        return 'ceiling';
    return 'rock cavern';
}

// src/trap.c:1324 trapeffect_rocktrap(). The missile is always created before
// the 2d6 damage roll for monsters, and it lands on the monster's square.
async function trapeffect_rocktrap(mtmp, trap, trflags) {
    if (mtmp === game.youmonst) {
        if (trap.once && trap.tseen && !rn2(15)) {
            await pline(`A trap door in ${the(trap_ceiling(game.u.ux, game.u.uy))} opens, but nothing falls out!`);
            deltrap(trap);
            newsym(game.u.ux, game.u.uy);
            return Trap_Effect_Finished;
        }

        let dmg = d(2, 6);
        let harmless = false;
        trap.once = 1;
        feeltrap(trap);
        const otmp = t_missile(ONAMES.ROCK, trap);
        place_object(otmp, game.u.ux, game.u.uy);

        await pline(`A trap door in ${the(trap_ceiling(game.u.ux, game.u.uy))} opens and ${an(xname(otmp))} falls on your ${body_part(HEAD)}!`);
        const uarmh = game.u.uarmh;
        const passes_rocks = passes_walls(game.youmonst.data)
                              && !unsolid(game.youmonst.data);
        if (uarmh) {
            if (passes_rocks) {
                await pline(`Unfortunately, you are wearing ${an(helm_simple_name(uarmh))}.`);
                dmg = 2;
            } else if (hard_helmet(uarmh)) {
                await pline('Fortunately, you are wearing a hard helmet.');
                dmg = 2;
            } else if (game.flags?.verbose !== false) {
                await pline(`${Yname2(uarmh)} does not protect you.`);
            }
        } else if (passes_rocks) {
            await pline('It passes harmlessly through you.');
            harmless = true;
        }
        if (!game.u.ublind)
            observe_object(otmp);
        const { stackobj } = await import('./invent.js');
        stackobj(otmp);
        newsym(game.u.ux, game.u.uy);

        if (!harmless) {
            if (game.u.uprops?.HALF_PHDAM)
                dmg = Math.trunc((dmg + 1) / 2);
            await losehp(dmg, 'falling rock', KILLED_BY_AN);
            exercise(A_STR, false);
        }
        return Trap_Effect_Finished;
    }

    const in_sight = canseemon(mtmp) || (mtmp === game.u.usteed);
    const see_it = cansee(mtmp.mx, mtmp.my);
    if (trap.once && trap.tseen && !rn2(15)) {
        if (in_sight && see_it)
            await pline(`A trap door above ${mon_nam(mtmp)} opens, but nothing falls out!`);
        deltrap(trap);
        newsym(mtmp.mx, mtmp.my);
        return Trap_Is_Gone;
    }

    trap.once = 1;
    const otmp = t_missile(ONAMES.ROCK, trap);
    if (in_sight)
        seetrap(trap);
    const trapkilled = await thitm(0, mtmp, otmp, d(2, 6), false);
    return trapkilled ? Trap_Killed_Mon : mtmp.mtrapped
        ? Trap_Caught_Mon : Trap_Effect_Finished;
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

// src/trap.c:7100 trapname() — the display name of a trap type; the
// hallucination riff list draws on the display rng and is recorded.
export function trapname(ttyp, override) {
    if (Hallucination() && !override)
        note_unported_trap('trapname:hallucination');
    return defsyms[CM_S_arrow_trap + ttyp - 1].explain;
}

// src/trap.c:6552 conjoined_pits() — did the hero step between two pits dug
// into each other? False-fast unless currently in a pit.
function conjoined_pits(trap2, trap1, u_entering_trap2) {
    if (!trap1 || !trap2)
        return false;
    if (!isok(trap2.tx, trap2.ty) || !isok(trap1.tx, trap1.ty)
        || !is_pit(trap2.ttyp) || !is_pit(trap1.ttyp)
        || (u_entering_trap2
            && !(game.u.utrap && game.u.utraptype === TT_PIT)))
        return false;
    const dx = Math.sign(trap2.tx - trap1.tx);
    const dy = Math.sign(trap2.ty - trap1.ty);
    const diridx = xytodir(dx, dy);
    if (diridx !== -1 /* DIR_ERR */) {
        const adjidx = (diridx + 4) % 8;    /* DIR_180 */
        if (((trap1.conjoined | 0) & (1 << diridx))
            && ((trap2.conjoined | 0) & (1 << adjidx)))
            return true;
    }
    return false;
}

// src/trap.c:6604 adj_nonconjoined_pit()
function adj_nonconjoined_pit(adjtrap) {
    const trap_with_u = t_at_mon(game.u.ux0 ?? 0, game.u.uy0 ?? 0);
    if (trap_with_u && adjtrap && game.u.utrap
        && game.u.utraptype === TT_PIT
        && is_pit(trap_with_u.ttyp) && is_pit(adjtrap.ttyp)) {
        if (xytodir(game.u.dx, game.u.dy) !== -1)
            return true;
    }
    return false;
}

// src/trap.c:1188 dotrap() — the hero steps on a trap.
//
// Only the arms whose effects are ported dispatch; every other trap type is
// recorded, so a session that walks onto one is visibly incomplete rather
// than silently wrong.
export async function dotrap(trap, trflags) {
    const ttype = trap.ttyp;
    const already_seen = !!trap.tseen;
    let forcetrap = ((trflags & FORCETRAP) !== 0
                     || (trflags & FAILEDUNTRAP) !== 0);
    const forcebungle = (trflags & FORCEBUNGLE) !== 0;
    const plunged = (trflags & TOOKPLUNGE) !== 0;
    const conj_pit = conjoined_pits(trap,
                                    t_at_mon(game.u.ux0 ?? 0,
                                             game.u.uy0 ?? 0),
                                    true);
    const adj_pit = adj_nonconjoined_pit(trap);
    /* a_your[trap->madeby_u] */
    const a_your = trap.madeby_u ? 'your' : 'a';

    nomul(0);

    if (fixed_tele_trap(trap)) {
        trflags |= FORCETRAP;
        forcetrap = true;
    }

    /* KMH -- You can't escape the Sokoban level traps */
    if (Sokoban() && (is_pit(ttype) || is_hole(ttype))) {
        await pline(`Air currents pull you down into ${a_your} ${
            trapname(ttype, true)}!`);
        /* then proceed to normal trap effect */
    } else if (!forcetrap) {
        if (floor_trigger(ttype) && check_in_air(game.youmonst, trflags)) {
            if (already_seen) {
                const { u_locomotion } = await import('./hack.js');
                await You(`${u_locomotion('step')} over ${
                    (ttype === ARROW_TRAP && !trap.madeby_u)
                        ? 'an' : a_your} ${trapname(ttype, false)}.`);
            }
            return Trap_Effect_Finished;
        }
        if (already_seen && !game.u.uprops?.FUMBLING
            && !(ttype === MAGIC_PORTAL || ttype === VIBRATING_SQUARE)
            && ttype !== ANTI_MAGIC && !forcebungle && !plunged
            && !conj_pit && !adj_pit
            && (!rn2(5)
                || (is_pit(ttype)
                    && is_clinger(game.youmonst?.data
                                  ?? { mflags1: 0 })))) {
            await You(`escape ${(ttype === ARROW_TRAP && !trap.madeby_u)
                                    ? 'an' : a_your} ${
                trapname(ttype, false)}.`);
            return Trap_Effect_Finished;
        }
    }

    if (game.u.usteed)
        mon_learns_traps(game.u.usteed, ttype);
    mons_see_trap(trap);

    game.u.utrap = 0;                   /* reset_utrap() */
    if (ttype === ARROW_TRAP)
        return await trapeffect_arrow_trap(game.youmonst, trap, trflags);
    if (ttype === DART_TRAP)
        return await trapeffect_dart_trap(game.youmonst, trap, trflags);
    if (ttype === ROCKTRAP)
        return await trapeffect_rocktrap(game.youmonst, trap, trflags);
    if (ttype === SQKY_BOARD)
        return await trapeffect_sqky_board(game.youmonst, trap, trflags);
    if (ttype === MAGIC_TRAP)
        return await trapeffect_magic_trap(game.youmonst, trap, trflags);
    if (ttype === BEAR_TRAP)
        return await trapeffect_bear_trap(game.youmonst, trap, trflags);
    if (ttype === SLP_GAS_TRAP)
        return await trapeffect_slp_gas_trap(game.youmonst, trap, trflags);
    if (ttype === RUST_TRAP)
        return await trapeffect_rust_trap(game.youmonst, trap, trflags);
    if (ttype === HOLE || ttype === TRAPDOOR)
        return await trapeffect_hole(game.youmonst, trap, trflags);
    if (ttype === ANTI_MAGIC)
        return await trapeffect_anti_magic(game.youmonst, trap, trflags);
    if (ttype === TELEP_TRAP)
        return await trapeffect_telep_trap(game.youmonst, trap, trflags);

    note_unported_trap(`dotrap:ttyp=${ttype}`);
    return Trap_Effect_Finished;
}

// src/trap.c:3063 trapnote() — the name of the note a squeaky board plays,
// optionally with "a"/"an" prefixed.
function trapnote(trap, noprefix) {
    const tnnames = [
        'C note',  'D flat', 'D note',  'E flat',
        'E note',  'F note', 'F sharp', 'G note',
        'G sharp', 'A note', 'B flat',  'B note',
    ];
    const tn = tnnames[trap.tnote];
    return noprefix ? tn : just_an(tn) + tn;
}

// src/trap.c:1403 trapeffect_sqky_board() — a squeaky board plays its note.
// No draws in either arm; Soundeffect() is audio-only.
async function trapeffect_sqky_board(mtmp, trap, trflags) {
    const forcetrap = ((trflags & FORCETRAP) !== 0
                       || (trflags & FAILEDUNTRAP) !== 0
                       || (Flying() && (trflags & VIASITTING) !== 0));

    if (mtmp === game.youmonst) {
        if ((Levitation() || Flying()) && !forcetrap) {
            if (!game.u.ublind) {
                seetrap(trap);
                if (Hallucination())
                    await You('notice a crease in the linoleum.');
                else
                    await You('notice a loose board below you.');
            }
        } else {
            seetrap(trap);
            await pline(`A board beneath you ${
                Deaf() ? 'vibrates' : 'squeaks '}${
                Deaf() ? '' : trapnote(trap, false)}${
                Deaf() ? '' : ' loudly'}.`);
            wake_nearby(false);
        }
    } else {
        const in_sight = canseemon(mtmp) || (mtmp === game.u.usteed);

        if (m_in_air(mtmp))
            return Trap_Effect_Finished;
        /* stepped on a squeaky board */
        if (in_sight) {
            if (!Deaf()) {
                await pline(`A board beneath ${mon_nam(mtmp)} squeaks ${
                    trapnote(trap, false)} loudly.`);
                seetrap(trap);
            } else if (!mindless(mtmp.data)) {
                await pline(
                    `${Monnam(mtmp)} stops momentarily and appears to cringe.`);
            }
        } else {
            /* same near/far threshold as mzapmsg() */
            const range = couldsee(mtmp.mx, mtmp.my) /* 9 or 5 */
                ? (BOLT_LIM + 1) : (BOLT_LIM - 3);

            await You_hear(`${trapnote(trap, false)} squeak ${
                (mdistu(mtmp) <= range * range)
                    ? 'nearby' : 'in the distance'}.`);
        }
        /* wake up nearby monsters */
        wake_nearto(mtmp.mx, mtmp.my, 40);
    }
    return Trap_Effect_Finished;
}

// src/trap.c:2323 trapeffect_anti_magic() — the hero's arm: drain 2d6 Pw,
// with half (rounded down) coming from max when max exceeds the drain.
// The iron-shoes and Antimagic-implosion arms need states not yet
// reachable; the monster arm records.
async function trapeffect_anti_magic(mtmp, trap, trflags) {
    if (mtmp === game.youmonst) {
        const u = game.u;
        let exclaim_it = false;

        seetrap(trap);
        if (u.uprops?.ANTIMAGIC || u.uprops?.MAGIC_RES) {
            /* the rnd(4)-per-source implosion damage + losehp */
            note_unported_trap('trapeffect_anti_magic:antimagic_implosion');
            return Trap_Effect_Finished;
        }

        let drain = d(2, 6); /* 2d6 => 2..12 */
        const halfd = rnd(Math.trunc(drain / 2)); /* 1..drain/2 */
        if (u.uenmax > drain) {
            u.uenmax -= halfd; /* drain_en() will set context.botl */
            drain -= halfd;
            exclaim_it = true;
        }
        await drain_en(drain, exclaim_it);
    } else {
        note_unported_trap('trapeffect_anti_magic:monster');
    }
    return Trap_Effect_Finished;
}

// src/trap.c:5202 drain_en() — reduce current magical energy.
async function drain_en(n, max_already_drained) {
    const u = game.u;
    let mesg;
    let punct = max_already_drained ? '!' : '.';

    if (u.uenmax < 1) {
        /* energy is completely gone */
        if (u.uen || u.uenmax) { /* paranoia */
            u.uen = u.uenmax = 0;
            (game.disp ||= {}).botl = true;
        }
        mesg = 'momentarily lethargic';
    } else {
        /* throttle further loss a bit when there's not much left to lose */
        if (n > Math.trunc((u.uen + u.uenmax) / 3))
            n = rnd(n);

        mesg = 'your magical energy drain away';
        if (n > u.uen)
            punct = '!';

        u.uen -= n;
        if (u.uen < 0) {
            u.uenmax -= rnd(-u.uen);
            if (u.uenmax < 0)
                u.uenmax = 0;
            u.uen = 0;
        } else if (u.uen > u.uenmax) {
            u.uen = u.uenmax;
        }
        (game.disp ||= {}).botl = true;
    }
    await You_feel(`${mesg}${punct}`);
}

// src/trap.c:1730 trapeffect_fire_trap(), monster path. Magic traps use
// this when their one-in-21 monster trigger fires.
async function trapeffect_fire_trap(mtmp, trap, trflags) {
    if (mtmp === game.youmonst) {
        note_unported_trap('trapeffect_fire_trap:hero');
        return Trap_Effect_Finished;
    }

    const in_sight = canseemon(mtmp) || mtmp === game.u.usteed;
    const see_it = cansee(trap.tx, trap.ty);
    const orig_dmg = d(2, 4);
    let trapkilled = false;

    if (in_sight) {
        await pline(`A tower of flame erupts from the ${
            surface(mtmp.mx, mtmp.my)} under ${mon_nam(mtmp)}!`);
    } else if (see_it) {
        await You_see(`a tower of flame erupt from the ${
            surface(mtmp.mx, mtmp.my)}!`);
    }

    if (resists_fire(mtmp)) {
        if (in_sight)
            await pline(`${Monnam(mtmp)} is uninjured.`);
    } else {
        let num = orig_dmg;
        let alt = 0;
        let immolate = false;
        switch (mtmp.mnum) {
        case PMNAMES.PM_PAPER_GOLEM:
            immolate = true;
            alt = mtmp.mhpmax;
            break;
        case PMNAMES.PM_STRAW_GOLEM:
            alt = Math.trunc(mtmp.mhpmax / 2);
            break;
        case PMNAMES.PM_WOOD_GOLEM:
            alt = Math.trunc(mtmp.mhpmax / 4);
            break;
        case PMNAMES.PM_LEATHER_GOLEM:
            alt = Math.trunc(mtmp.mhpmax / 8);
            break;
        }
        if (alt > num)
            num = alt;

        if (await thitm(0, mtmp, null, num, immolate)) {
            trapkilled = true;
        } else {
            mtmp.mhpmax -= rn2(num + 1);
            if (mtmp.mhp > mtmp.mhpmax)
                mtmp.mhp = mtmp.mhpmax;
        }
    }

    if (await burnarmor(mtmp) || rn2(3)) {
        const xtradmg = await destroy_items(mtmp, ATTKS.AD_FIRE, orig_dmg);
        if (mtmp.mhp > 0) {
            mtmp.mhp -= xtradmg;
            if (mtmp.mhp <= 0) {
                await monkilled(mtmp, '', ATTKS.AD_FIRE);
                trapkilled = true;
            }
        }
    }

    if (mtmp.mhp <= 0)
        trapkilled = true;
    if (see_it)
        seetrap(trap);
    return trapkilled ? Trap_Killed_Mon : mtmp.mtrapped
        ? Trap_Caught_Mon : Trap_Effect_Finished;
}


// src/trap.c:4356 domagictrap() — the magic trap's effect roll.
//
// fate = rnd(20) drives everything. Under 10 is the blinding flash, which
// wakes nearby monsters; 10..19 are the individual arms.
async function domagictrap() {
    const fate = rnd(20);

    if (fate < 10) {
        let cnt = rnd(4);

        if (!resists_blnd(null)) {
            await You('are momentarily blinded by a flash of light!');
            const { make_blinded } = await import('./potion.js');
            await make_blinded(rn1(5, 10), false);
            if (!game.u.ublind)
                await Your('vision clears.');
        } else if (!game.u.ublind) {
            await You_see('a flash of light!');
        }

        const intr = (game.u.intrinsic ||= {});
        if (!Deaf()) {
            await You_hear('a deafening roar!');
            intr.HDeaf = Math.min(TIMEOUT,
                (intr.HDeaf | 0) + rn1(20, 30));
        } else {
            await You_feel('rankled.');
            intr.HDeaf = Math.min(TIMEOUT,
                (intr.HDeaf | 0) + rn1(5, 15));
        }
        (game.disp ||= {}).botl = true;

        while (cnt--)
            makemon(null, game.u.ux, game.u.uy, NO_MM_FLAGS);
        wake_nearto(game.u.ux, game.u.uy, 7 * 7);
        return;
    }

    switch (fate) {
    case 11: { /* toggle intrinsic invisibility */
        await You_hear('a low hum.');
        const was_invisible = Invis();
        if (!was_invisible && !game.u.ublind) {
            await pline(`${Hallucination() ? 'Far out, man!  You'
                                           : 'Gee!  All of a sudden, you'} ${
                See_invisible() ? 'can see right through yourself'
                                : "can't see yourself"}.`);
        }
        (game.u.uprops ||= {}).INVIS = !was_invisible;
        newsym(game.u.ux, game.u.uy);
        break;
    }
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
            return await trapeffect_fire_trap(mtmp, trap, trflags);
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
/* include/hack.h:1306 — trap-activation flags. FORCEBUNGLE is 0x04
   (0x08 is RECURSIVETRAP). */
const FORCETRAP = 0x01, FORCEBUNGLE = 0x04, FAILEDUNTRAP = 0x40;

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

// src/trap.c:2527 trapeffect_landmine(). Damage is rolled before the mine
// tests whether a monster is heavy enough to press its trigger. That discarded
// rnd(16) is part of every light monster's path.
async function trapeffect_landmine(mtmp, trap, trflags) {
    let damage = rnd(16);

    if (wearing_iron_shoes(mtmp))
        damage = Math.trunc((damage + 3) / 4);

    if (mtmp === game.youmonst) {
        note_unported_trap('trapeffect_landmine:hero');
        return Trap_Effect_Finished;
    }

    /* MINE_TRIGGER_WT is WT_ELF / 2. Monsters below the threshold leave the
       mine untouched after this one weight roll. */
    if (rn2(mtmp.data.cwt + 1) < Math.trunc(WT_ELF / 2))
        return Trap_Effect_Finished;

    if (m_in_air(mtmp) && rn2(3))
        return Trap_Effect_Finished;

    note_unported_trap(`trapeffect_landmine:explosion:damage=${damage}`);
    return Trap_Effect_Finished;
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

// src/trap.c:1560 trapeffect_slp_gas_trap() — sleep gas affects a breathing,
// non-resistant creature for rnd(25) turns.
async function trapeffect_slp_gas_trap(mtmp, trap, trflags) {
    if (mtmp === game.youmonst) {
        seetrap(trap);
        if (Sleep_resistance() || breathless(game.youmonst.data)) {
            await You('are enveloped in a cloud of gas!');
        } else {
            await pline('A cloud of gas puts you to sleep!');
            const { fall_asleep } = await import('./timeout.js');
            await fall_asleep(-rnd(25), true);
        }
        if (game.u.usteed)
            note_unported_trap('trapeffect_slp_gas_trap:steed');
        return Trap_Effect_Finished;
    }

    const in_sight = canseemon(mtmp) || (mtmp === game.u.usteed);
    if (!resists_sleep(mtmp) && !breathless(mtmp.data) && !helpless(mtmp)) {
        let amount = rnd(25);
        if (!defended(mtmp, ATTKS.AD_SLEE) && mtmp.mcanmove) {
            mtmp.meating = 0;
            amount += mtmp.mfrozen | 0;
            mtmp.mcanmove = 0;
            mtmp.mfrozen = Math.min(amount, 127);
            if (in_sight) {
                await pline(`${Monnam(mtmp)} suddenly falls asleep!`);
                seetrap(trap);
            }
        }
    }
    return Trap_Effect_Finished;
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

// src/trap.c:972 mu_maybe_destroy_web(), monster arm.
async function mu_maybe_destroy_web(mtmp, domsg, trap) {
    const mptr = mtmp.data;
    if (!(amorphous(mptr) || is_whirly(mptr) || flaming(mptr)
          || unsolid(mptr) || mtmp.mnum === PMNAMES.PM_GELATINOUS_CUBE))
        return false;

    const article = trap.madeby_u ? 'your' : 'a';
    if (flaming(mptr) || acidic(mptr)) {
        if (domsg)
            await pline(`${Monnam(mtmp)} ${flaming(mptr) ? 'burns' : 'dissolves'} ${article} spider web!`);
        deltrap(trap);
        newsym(trap.tx, trap.ty);
    } else if (domsg) {
        await pline(`${Monnam(mtmp)} flows through ${article} spider web.`);
        seetrap(trap);
    }
    return true;
}

// src/trap.c:2106 trapeffect_web(), monster arm.
async function trapeffect_web(mtmp, trap, trflags) {
    if (mtmp === game.youmonst) {
        note_unported_trap('trapeffect_web:hero');
        return Trap_Effect_Finished;
    }

    const in_sight = canseemon(mtmp) || mtmp === game.u.usteed;
    const forcetrap = (trflags & FORCETRAP) !== 0;
    const mptr = mtmp.data;
    const article = trap.madeby_u ? 'your' : 'a';
    if (webmaker(mptr))
        return Trap_Effect_Finished;
    if (await mu_maybe_destroy_web(mtmp, in_sight, trap))
        return Trap_Effect_Finished;

    let tear_web = false;
    const alwaysTears = [
        PMNAMES.PM_TITANOTHERE, PMNAMES.PM_BALUCHITHERIUM,
        PMNAMES.PM_PURPLE_WORM, PMNAMES.PM_JABBERWOCK,
        PMNAMES.PM_IRON_GOLEM, PMNAMES.PM_BALROG, PMNAMES.PM_KRAKEN,
        PMNAMES.PM_MASTODON, PMNAMES.PM_ORION, PMNAMES.PM_NORN,
        PMNAMES.PM_CYCLOPS, PMNAMES.PM_LORD_SURTUR,
    ];
    const bear = mtmp.mnum === PMNAMES.PM_OWLBEAR
        || mtmp.mnum === PMNAMES.PM_BUGBEAR;
    if (bear && !in_sight) {
        await You_hear('the roaring of a confused bear!');
        mtmp.mtrapped = 1;
    } else if (alwaysTears.includes(mtmp.mnum)) {
        tear_web = true;
    } else if (mptr.mlet === MONSYMS.S_GIANT
               || (mptr.mlet === MONSYMS.S_DRAGON
                   && (mptr.mflags2 & MFLAGS.M2_NASTY))
               || (mtmp.wormno && count_wsegs(mtmp) > 5)) {
        tear_web = true;
    } else {
        if (in_sight) {
            await pline(`${Monnam(mtmp)} is caught in ${article} spider web.`);
            seetrap(trap);
        }
        mtmp.mtrapped = 1;
    }

    if (tear_web) {
        if (in_sight)
            await pline(`${Monnam(mtmp)} tears through ${article} spider web!`);
        deltrap(trap);
        newsym(mtmp.mx, mtmp.my);
    } else if (forcetrap && !mtmp.mtrapped && in_sight) {
        await pline(`${Monnam(mtmp)} avoids ${article} spider web!`);
        seetrap(trap);
    }
    return mtmp.mtrapped ? Trap_Caught_Mon : Trap_Effect_Finished;
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
    case ROCKTRAP:
        return await trapeffect_rocktrap(mtmp, trap, trflags);
    case SQKY_BOARD:
        return await trapeffect_sqky_board(mtmp, trap, trflags);
    case MAGIC_TRAP:
        return await trapeffect_magic_trap(mtmp, trap, trflags);
    case BEAR_TRAP:
        return await trapeffect_bear_trap(mtmp, trap, trflags);
    case SLP_GAS_TRAP:
        return await trapeffect_slp_gas_trap(mtmp, trap, trflags);
    case LANDMINE:
        return await trapeffect_landmine(mtmp, trap, trflags);
    case PIT:
    case SPIKED_PIT:
        return await trapeffect_pit(mtmp, trap, trflags);
    case HOLE:
    case TRAPDOOR:
        return await trapeffect_hole(mtmp, trap, trflags);
    case RUST_TRAP:
        return await trapeffect_rust_trap(mtmp, trap, trflags);
    case ROLLING_BOULDER_TRAP:
        return await trapeffect_rolling_boulder_trap(mtmp, trap, trflags);
    case TELEP_TRAP:
        return await trapeffect_telep_trap(mtmp, trap, trflags);
    case WEB:
        return await trapeffect_web(mtmp, trap, trflags);
    default:
        note_unported_trap(`trapeffect_selector:ttyp=${trap.ttyp}`);
        return Trap_Effect_Finished;
    }
}

// src/trap.c:2070 trapeffect_telep_trap(), hero path. A one-shot trap is the
// vault teleporter; ordinary traps use the level's normal random teleport.
async function trapeffect_telep_trap(mtmp, trap, trflags) {
    if (mtmp !== game.youmonst) {
        note_unported_trap('trapeffect_telep_trap:monster');
        return Trap_Moved_Mon;
    }

    seetrap(trap);
    const { noteleport_level, tele, vault_tele } =
        await import('./teleport.js');
    if (game.u.uprops?.ANTIMAGIC || noteleport_level(game.youmonst)) {
        await You_feel('a wrenching sensation.');
    } else if (trap.once) {
        deltrap(trap);
        newsym(game.u.ux, game.u.uy);
        await vault_tele();
    } else if (isok(trap.teledest?.x ?? 0, trap.teledest?.y ?? 0)) {
        note_unported_trap('trapeffect_telep_trap:fixed_destination');
    } else {
        await tele();
    }
    return Trap_Effect_Finished;
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
        mons_see_trap(trap);

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
   :204 is_corrodeable(), :206 is_damageable() */
export const is_rustprone = (otmp) =>
    game.objects[otmp.otyp].oc_material === MATERIALS.IRON;
export const is_crackable = (otmp) =>
    game.objects[otmp.otyp].oc_material === MATERIALS.GLASS
    && otmp.oclass === OCLASSES.ARMOR_CLASS;
export const is_corrodeable = (otmp) =>
    game.objects[otmp.otyp].oc_material === MATERIALS.COPPER
    || game.objects[otmp.otyp].oc_material === MATERIALS.IRON;
export const is_damageable = (otmp) =>
    is_rustprone(otmp) || is_flammable(otmp) || is_rottable(otmp)
    || is_corrodeable(otmp) || is_crackable(otmp);

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

// src/trap.c:85 burnarmor(). Fire chooses one armor slot repeatedly until it
// either finds something it can affect or reaches the torso arm, which always
// finishes the search. A torso hit lets the caller burn carried items too.
export async function burnarmor(victim) {
    if (!victim)
        return false;
    const hitting_u = victim === game.youmonst;

    const towels = (hitting_u ? game.invent : victim.minvent || [])
        .filter((obj) => obj.otyp === ONAMES.TOWEL && (obj.spe | 0) > 0);
    for (const item of towels) {
        const oldspe = item.spe | 0;
        const newspe = rn2(oldspe + 1);
        if (newspe < oldspe) {
            item.spe = newspe;
            if (hitting_u)
                await pline(`${Yname2(item)} dries${newspe ? '' : ' out'}.`);
            else if (canseemon(victim))
                await pline(`${Monnam(victim)}'s ${xname(item)} dries${
                    newspe ? '' : ' out'}.`);
            break;
        }
    }

    const armor = (slot) => hitting_u ? game.u[slot]
        : which_armor(victim, {
            uarmh: W_ARMH, uarmc: W_ARMC, uarm: W_ARM, uarmu: W_ARMU,
            uarms: W_ARMS, uarmg: W_ARMG, uarmf: W_ARMF,
        }[slot]);
    const burn = async (obj, descr) =>
        await erode_obj(obj, descr, ERODE_BURN, EF_GREASE);
    const materialNames = [
        'mysterious', 'liquid', 'wax', 'organic', 'flesh', 'paper', 'cloth',
        'leather', 'wooden', 'bone', 'dragonhide', 'iron', 'metal', 'copper',
        'silver', 'gold', 'platinum', 'mithril', 'plastic', 'glass',
        'gemstone', 'stone',
    ];

    for (;;) {
        let item;
        switch (rn2(5)) {
        case 0:
            item = armor('uarmh');
            if (!await burn(item, item
                ? `${materialNames[game.objects[item.otyp].oc_material]} ${
                    helm_simple_name(item)}` : 'helmet'))
                continue;
            break;
        case 1:
            item = armor('uarmc');
            if (item) {
                await burn(item, cloak_simple_name(item));
                return true;
            }
            item = armor('uarm');
            if (item) {
                await burn(item, xname(item));
                return true;
            }
            item = armor('uarmu');
            if (item)
                await burn(item, 'shirt');
            return true;
        case 2:
            if (!await burn(armor('uarms'), 'wooden shield'))
                continue;
            break;
        case 3:
            if (!await burn(armor('uarmg'), 'gloves'))
                continue;
            break;
        case 4:
            if (!await burn(armor('uarmf'), 'boots'))
                continue;
            break;
        }
        break;
    }
    return false;
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

// src/apply.c:698 number_leashed()
function number_leashed() {
    let i = 0;
    for (const obj of (game.invent || []))
        if (obj.otyp === ONAMES.LEASH && obj.leashmon)
            i++;
    return i;
}

// src/hack.c:3221 set_uinwater() — besides the flag, entering/leaving water
// re-evaluates terrain-derived properties.
function set_uinwater(in_out) {
    if (!!in_out !== !!game.u.uinwater) {
        game.u.uinwater = in_out ? 1 : 0;
        /* switch_terrain() toggles Lev/Fly from terrain; no recorded
           session carries either, so the call is recorded */
        note_unported_trap('set_uinwater:switch_terrain');
    }
}

// src/trap.c:4900 emergency_disrobe() — drop random items until light
// enough to crawl out; true if now unencumbered enough.
async function emergency_disrobe(state) {
    let invc = inv_cnt(true);

    while (near_capacity() > (game.u.uprops?.PUNISHED ? UNENCUMBERED
                                                      : SLT_ENCUMBER)) {
        let otmp = null;

        /* Pick a random object */
        if (invc > 0) {
            let i = rn2(invc);
            for (const obj of (game.invent || [])) {
                /* undroppables: body armor, boots, gloves, amulets, rings,
                   cursed loadstones, items mid-removal */
                const u = game.u;
                if (!((obj.otyp === ONAMES.LOADSTONE && obj.cursed)
                      || obj === u.uamul || obj === u.uleft
                      || obj === u.uright || obj === u.ublindf
                      || obj === u.uarm || obj === u.uarmc
                      || obj === u.uarmg || obj === u.uarmf
                      || obj === u.uarmu
                      || (obj.cursed && (obj === u.uarmh || obj === u.uarms))
                      || (obj.owornmask & W_WEP && obj.cursed) /* welded */
                      || obj.in_use))
                    otmp = obj;
                /* reached the mark and found some stuff to drop? */
                if (--i < 0 && otmp)
                    break;
            }
        }
        if (!otmp)
            return false; /* nothing to drop! */
        if (otmp.owornmask)
            note_unported_trap('emergency_disrobe:remove_worn_item');
        state.lostsome = true;
        const { dropx } = await import('./do.js');
        await dropx(otmp);
        invc--;
    }
    return true;
}

// src/trap.c:4946 rnd_nextto_goodpos() — pick a random goodpos() next to
// x,y; for the hero it uses crawl_destination(). Mutates and returns the
// coord, null when none works. The Fisher-Yates over N_DIRS draws all
// eight rn2()s before any direction is tested.
export async function rnd_nextto_goodpos(cc, mtmp) {
    const is_u = (mtmp === game.youmonst || mtmp === null);
    const dirs = [];
    for (let i = 0; i < N_DIRS; ++i)
        dirs[i] = i;
    for (let i = N_DIRS; i > 0; --i) {
        const j = rn2(i);
        const k = dirs[j];
        dirs[j] = dirs[i - 1];
        dirs[i - 1] = k;
    }
    for (let i = 0; i < N_DIRS; ++i) {
        const nx = cc.x + xdir[dirs[i]];
        const ny = cc.y + ydir[dirs[i]];
        /* crawl_destination and goodpos both include an isok() check */
        if (is_u ? await crawl_destination(nx, ny)
                 : goodpos(nx, ny, mtmp, 0)) {
            cc.x = nx;
            cc.y = ny;
            return true;
        }
    }
    return false;
}

// src/trap.c:4977 back_on_ground() — message after leaving a pool.
async function back_on_ground(rescued) {
    /* Levitation/Flying and the ice/bridge/altar wordings need state no
       session carries; the ordinary floor case is the live one */
    const preposit = 'on';
    let surf = surface(game.u.ux, game.u.uy);
    if (surf === 'floor' || surf === 'ground')
        surf = 'solid ground';
    const you_are_back = rescued ? 'You are back' : "You're back";
    await pline(`${you_are_back} ${preposit} ${surf}.`);
}

// src/trap.c:5059 drown() — the hero is in water. Returns true if the hero
// changed location while surviving.
export async function drown() {
    const u = game.u;
    let inpool_ok = false;
    const is_solid = game.level?.at(u.ux, u.uy)?.typ === WATER;

    newsym(u.ux, u.uy); /* feel_newsym: in case Blind, map the water here */
    const swimming = !!u.uprops?.SWIMMING;
    const amphibious = !!u.uprops?.AMPHIBIOUS;
    const breathless = !!u.uprops?.BREATHLESS;
    /* happily wading in the same contiguous pool */
    if (u.uinwater && is_pool(u.ux - u.dx, u.uy - u.dy)
        && (swimming || amphibious || breathless)) {
        /* water effects on objects every now and then */
        if (!rn2(5))
            inpool_ok = true;
        else
            return false;
    }

    if (!u.uinwater) {
        await You(`${is_solid ? 'plunge' : 'fall'} into the ${
            waterbody_name(u.ux, u.uy)}${
            (amphibious || swimming || breathless) ? '.' : '!'}`);
        if (!swimming && !is_solid)
            await You(`sink like ${Hallucination() ? 'the Titanic'
                                                   : 'a rock'}.`);
    }

    await water_damage_chain(game.invent || [], false);

    /* gremlin split and iron golem rust need polyself */
    if (u.umonnum !== u.umonster)
        note_unported_trap('drown:polyd');
    if (inpool_ok)
        return false;

    {
        const i = number_leashed();
        if (i > 0) {
            await pline(`The leash${i > 1 ? 'es' : ''} slip${
                i > 1 ? '' : 's'} loose.`);
            note_unported_trap('drown:unleash_all');
        }
    }

    if (amphibious || breathless || swimming) {
        if (amphibious || breathless) {
            if (game.flags?.verbose !== false)
                await pline("But you aren't drowning.");
            if (!Is_waterlevel(u.uz)) {
                if (Hallucination())
                    await Your('keel hits the bottom.');
                else
                    await You('touch bottom.');
            }
        }
        if (u.uprops?.PUNISHED)
            note_unported_trap('drown:placebc');
        vision_recalc(2); /* unsee old position */
        set_uinwater(1);
        note_unported_trap('drown:under_water');
        game.vision_full_recalc = 1;
        return false;
    }
    /* include/mondata.h:82 can_teleport(): M1_TPORT (monflag.h:110) */
    if ((u.uprops?.TELEPORT
         || (game.mons[u.umonnum].mflags1 & MFLAGS.M1_TPORT))
        && !Unaware()
        && (Teleport_control() || rn2(3) < (game.u.uluck | 0) + 2)) {
        await You('attempt a teleport spell.'); /* utcsri!carroll */
        note_unported_trap('drown:dotele');
    }
    if (u.usteed) {
        note_unported_trap('drown:dismount');
        if (!is_pool(u.ux, u.uy))
            return true;
    }
    /* if sleeping, wake up now; being doused revives from fainting */
    if (u.usleep)
        await unmul('Suddenly you wake up!');
    /* is_fainted()/reset_faint need the hunger-faint state */

    const cc = { x: u.ux, y: u.uy };
    /* have to be able to move in order to crawl */
    if (game.multi >= 0 && game.mons[u.umonnum].mmove
        && await rnd_nextto_goodpos(cc, game.youmonst ?? null)) {
        const state = { lostsome: false };
        /* time to do some strip-tease... */
        const succ = Is_waterlevel(u.uz) ? true
                     : await emergency_disrobe(state);

        await You(`try to crawl out of the ${hliquid('water')}.`);
        if (state.lostsome)
            await You('dump some of your gear to lose weight...');
        if (succ) {
            await pline('Pheew!  That was close.');
            await teleds(cc.x, cc.y, TELEDS_ALLOW_DRAG);
            return true;
        }
        /* still too much weight */
        await pline('But in vain.');
    }
    set_uinwater(1);
    await pline('You drown.'); /* urgent_pline */
    for (let i = 0; i < 2; i++) {
        let pool_of_water = waterbody_name(u.ux, u.uy);
        let kfmt = KILLED_BY_AN;
        /* avoid "drowned in [a] water" */
        if (pool_of_water === 'water') {
            pool_of_water = 'deep water';
            kfmt = KILLED_BY;
        } else if (pool_of_water === 'limitless water') {
            kfmt = KILLED_BY;
        }
        game.killer = { format: kfmt, name: pool_of_water };
        await done(DROWNING);
        /* oops, still alive; get out of the water */
        if (await safe_teleds(TELEDS_ALLOW_DRAG | TELEDS_TELEPORT))
            break;
        await pline("You're still drowning.");
    }
    if (u.uinwater) {
        set_uinwater(0);
        note_unported_trap('drown:rescued_from_terrain');
    }
    return true;
}

// src/trap.c:6790 lava_effects() — the hero is in lava. Returns true if
// the hero changed location while surviving.
export async function lava_effects() {
    const u = game.u;
    const dmg = d(6, 6); /* only applicable for water walking */

    newsym(u.ux, u.uy); /* feel_newsym */
    /* burn_away_slime() needs the sliming timer; no session carries it */
    if (likes_lava(game.mons[u.umonnum]))
        return false;

    const fire_res = !!u.uprops?.FIRE_RES;
    const wwalking = !!u.uprops?.WWALKING;
    let usurvive = fire_res || (wwalking && dmg < u.uhp);
    /* flag items to be destroyed before any messages */
    if (!usurvive) {
        for (const obj of [...(game.invent || [])]) {
            if (obj.in_use)
                continue;
            if ((game.objects[obj.otyp].oc_material <= MATERIALS.WOOD
                 || obj.oclass === OCLASSES.POTION_CLASS)
                && !obj.oerodeproof
                && game.objects[obj.otyp].oc_oprop !== FIRE_RES
                && obj.otyp !== ONAMES.SCR_FIRE
                && obj.otyp !== ONAMES.SPE_FIREBALL
                && !obj_resists(obj, 0, 0))
                obj.in_use = 1;
        }
    }

    /* boots burn first; assumption: water walking comes from boots */
    if (u.uarmf && (u.uarmf.in_use
                    || (game.objects[u.uarmf.otyp].oc_material
                            <= MATERIALS.WOOD
                        && !u.uarmf.oerodeproof))) {
        note_unported_trap('lava_effects:boots_burn');
    }

    if (!fire_res) {
        if (wwalking) {
            note_unported_trap('lava_effects:wwalking');
        } else {
            await You(`fall into the ${waterbody_name(u.ux, u.uy)}!`);
        }

        usurvive = false; /* Lifesaved || discover || wizard */

        for (const obj of [...(game.invent || [])]) {
            if (obj.otyp === ONAMES.SPE_BOOK_OF_THE_DEAD) {
                note_unported_trap('lava_effects:book_of_the_dead');
            } else if (obj.in_use) {
                if (obj.owornmask)
                    note_unported_trap('lava_effects:worn_burn');
                useupall(obj);
            }
        }

        /* s/he died... burn to death */
        for (let burncount = 0; burncount < 2; ++burncount) {
            const shownHp = u.uhp;
            u.uhp = -1;
            game.killer = { format: KILLED_BY, name: 'molten lava' };
            game._deferred_status_hp_until_more = shownHp;
            await pline('You burn to a crisp...'); /* urgent_pline */
            await done(BURNING);
            if (await safe_teleds(TELEDS_ALLOW_DRAG | TELEDS_TELEPORT))
                break;
            await pline("You're still burning.");
        }

        await You('find yourself back on solid ground.');
    } else {
        note_unported_trap('lava_effects:fire_resistant');
    }
    return true;
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

// src/trap.c:602 fall_through() — the hero falls through a trap door or
// hole. The Sokoban, levitation, huge-form and pet-jerk refusal arms read
// real state; impact_drop and shop digging record. Ends with
// schedule_goto, so the level change happens at the moveloop seam exactly
// as C defers it.
export async function fall_through(td, ftflags) {
    let dont_fall = null;
    let t = null;

    if (game.u.ublind && game.u.uprops?.LEVITATION)
        return;

    let newlevel = game.u.uz.dlevel + 1;

    if (td) {
        t = t_at_mon(game.u.ux, game.u.uy);
        feeltrap(t);
        if (!(ftflags & TOOKPLUNGE)) {
            if (t.ttyp === TRAPDOOR)
                await pline('A trap door opens up under you!');
            else
                await pline("There's a gaping hole under you!");
        }
    } else {
        const { surface } = await import('./dungeon.js');
        await pline_The(`${surface(game.u.ux, game.u.uy)} opens up under you!`);
    }

    /* Sokoban / Can_fall_thru: ordinary dungeon levels can */
    if (game.u.uprops?.LEVITATION || game.u.ustuck) {
        dont_fall = "don't fall in.";
    } else if (game.mons[game.u.umonnum]?.msize >= MFLAGS.MZ_HUGE) {
        dont_fall = "don't fit through.";
    }
    /* next_to_u() pet-jerk arm — pets always count adjacent for now, the
       same simplification js/teleport.js documents */
    if (dont_fall) {
        await You(dont_fall);
        note_unported_trap('fall_through:impact_drop');
        return;
    }

    /* shopdig / Is_stronghold(find_hell): no shops or castle here yet */
    const dtmp = { dnum: game.u.uz.dnum, dlevel: newlevel };
    if (t && t.dst && t.dst.dnum >= 0) {
        dtmp.dnum = t.dst.dnum;
        dtmp.dlevel = t.dst.dlevel;
    }
    const dist = dtmp.dlevel - game.u.uz.dlevel;
    if (dist > 1)
        await You(`fall down a ${dist > 3 ? 'very ' : ''}${dist > 2 ? 'deep ' : ''}shaft!`);

    const { schedule_goto, UTOTYPE_FALLING, UTOTYPE_NONE } =
        await import('./do.js');
    schedule_goto(dtmp,
                  !game.u.uprops?.FLYING ? UTOTYPE_FALLING : UTOTYPE_NONE,
                  null, null);
}

// src/trap.c:2013 trapeffect_hole().
async function trapeffect_hole(mtmp, trap, trflags) {
    if (mtmp === game.youmonst) {
        await fall_through(true, trflags & TOOKPLUNGE);
        return Trap_Effect_Finished;
    }

    if (!Can_fall_thru(game.u.uz) || mtmp === game.u.ustuck)
        return Trap_Effect_Finished;

    const in_sight = canseemon(mtmp) || mtmp === game.u.usteed;
    const forcetrap = (trflags & FORCETRAP) !== 0;
    const inescapable = forcetrap || (Sokoban() && !trap.madeby_u);
    const too_large = mtmp.data.msize >= MFLAGS.MZ_HUGE;
    const long_worm = !!mtmp.wormno;

    if (!grounded(mtmp.data) || long_worm || too_large) {
        if (long_worm)
            note_unported_trap('trapeffect_hole:count_wsegs');
        if (forcetrap && !Sokoban()) {
            if (in_sight) {
                seetrap(trap);
                if (trap.ttyp === TRAPDOOR)
                    await pline(`A trap door opens, but ${mon_nam(mtmp)} doesn't fall through.`);
                else
                    await pline(`${Monnam(mtmp)} doesn't fall through the hole.`);
            }
            return Trap_Effect_Finished;
        }
        if (!inescapable)
            return Trap_Effect_Finished;
        if (in_sight) {
            await pline(`${Monnam(mtmp)} seems to be yanked down!`);
            seetrap(trap);
        }
    }

    if (in_sight) {
        await pline(`Suddenly, ${mon_nam(mtmp)} ${
            trap.ttyp === HOLE ? 'falls into a hole'
                               : 'falls through a trap door'}.`);
        seetrap(trap);
    }

    const mx = mtmp.mx, my = mtmp.my;
    const dest = (trap.dst?.dnum ?? -1) >= 0
        ? { dnum: trap.dst.dnum, dlevel: trap.dst.dlevel }
        : { dnum: game.u.uz.dnum, dlevel: game.u.uz.dlevel + 1 };
    remove_monster(mx, my);
    const at = (game.level.monsters || []).indexOf(mtmp);
    if (at >= 0)
        game.level.monsters.splice(at, 1);
    mtmp.mstate = (mtmp.mstate || 0) | MON_MIGRATING;
    mtmp.mtrack ||= [{}, {}, {}];
    mtmp.mtrack[2] = { x: game.u.uz.dnum, y: game.u.uz.dlevel };
    mtmp.mtrack[1] = { x: mx, y: my };
    mtmp.mtrack[0] = { x: MIGR_RANDOM, y: 0 };
    mtmp.mux = dest.dnum;
    mtmp.muy = dest.dlevel;
    mtmp.mx = mtmp.my = 0;
    mtmp.mlstmv = game.moves;
    (game.migrating_mons ||= []).unshift(mtmp);
    return Trap_Moved_Mon;
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

/* ==== the rolling-boulder launch machinery (maketrap's last gap) ==== */

import { xdir, ydir, ZAP_POS, is_xport, N_DIRS, ROLL, LAUNCH_UNSEEN,
         LAUNCH_KNOWN, IS_STWALL, IS_TREE, IRONBARS, D_BROKEN } from './const.js';
import { closed_door } from './cmd.js';
import { is_pool_or_lava } from './dbridge.js';
import { stackobj } from './invent.js';
import { isok } from './hacklib.js';

// src/trap.c:3695 isclearpath() — may a boulder roll `distance` squares
// from cc along (dx,dy)? Walks the squares; on success cc is advanced to
// the far end. No draws.
function isclearpath(cc, distance, dx, dy) {
    let x = cc.x, y = cc.y;

    while (distance-- > 0) {
        x += dx;
        y += dy;
        if (!isok(x, y))
            return false;
        const typ = game.level.at(x, y).typ;
        if (!ZAP_POS(typ) || closed_door(x, y))
            return false;
        const t = t_at_mon(x, y);
        if (t && (is_pit(t.ttyp) || is_hole(t.ttyp) || is_xport(t.ttyp)))
            return false;
    }
    cc.x = x;
    cc.y = y;
    return true;
}

// src/trap.c:3599 find_random_launch_coord() — pick where the boulder
// waits. Exactly two draws when reached: rn1(5,4) for the distance and
// rn2(8) for the first direction tried; the retry loop itself spends
// nothing. A rolling-boulder trap needs the path clear BOTH ways.
function find_random_launch_coord(ttmp, cc) {
    let success = false;
    const bcc = { x: 0, y: 0 };
    let mindist = 4;
    let trycount = 0;

    if (!ttmp || !cc || Sokoban())
        return false;

    const x = ttmp.tx;
    const y = ttmp.ty;

    /* gl.launchplace is nonzero only for a des file's launchfrom= option,
       which no registered level uses; with (0,0) bcc is the trap's own
       square and linedup(x,y,x,y,1) is FALSE (mthrowu.c: !tbx && !tby). */
    const lp = game.launchplace ?? { x: 0, y: 0 };
    if (lp.x || lp.y)
        note_unported_trap('find_random_launch_coord:launchplace');

    if (ttmp.ttyp === ROLLING_BOULDER_TRAP)
        mindist = 2;
    let distance = rn1(5, 4); /* 4..8 away */
    let tmp = rn2(8);         /* randomly pick a direction to try first */
    while (distance >= mindist) {
        const dx = xdir[tmp];
        const dy = ydir[tmp];
        cc.x = x;
        cc.y = y;
        /* Prevent boulder from being placed on water */
        if (ttmp.ttyp === ROLLING_BOULDER_TRAP
            && is_pool_or_lava(x + distance * dx, y + distance * dy))
            success = false;
        else
            success = isclearpath(cc, distance, dx, dy);
        if (ttmp.ttyp === ROLLING_BOULDER_TRAP) {
            bcc.x = x;
            bcc.y = y;
            const success_otherway = isclearpath(bcc, distance, -dx, -dy);
            if (!success_otherway)
                success = false;
        }
        if (success)
            break;
        if (++tmp > 7)
            tmp = 0;
        if ((++trycount % 8) === 0)
            --distance;
    }
    return success;
}

// src/trap.c:3659 mkroll_launch() — set the trap's launch point(s) and, if
// a spot was found, create the waiting boulder there (mksobj draws). On
// failure the launch point IS the trap square, which is also what tells
// mktrap's victim roll to skip this trap.
export function mkroll_launch(ttmp, x, y, otyp, ocount) {
    const cc = { x: 0, y: 0 };

    const success = find_random_launch_coord(ttmp, cc);

    if (!success) {
        /* create the trap without any ammo, launch pt at trap location */
        cc.x = x;
        cc.y = y;
    } else {
        const otmp = mksobj(otyp, true, false);
        otmp.quan = ocount;
        otmp.owt = weight(otmp);
        place_object(otmp, cc.x, cc.y);
        stackobj(otmp);
    }
    ttmp.launch = { x: cc.x, y: cc.y };
    if (ttmp.ttyp === ROLLING_BOULDER_TRAP) {
        ttmp.launch2 = { x: x - (cc.x - x), y: y - (cc.y - y) };
    } else {
        ttmp.launch_otyp = otyp;
    }
    newsym(ttmp.launch.x, ttmp.launch.y);
    return 1;
}

// src/trap.c:3282 launch_obj() moves a trap-launched object along its fixed
// path. Rolling boulders keep moving after a monster hit unless consumed.
export async function launch_obj(otyp, x1, y1, x2, y2, style) {
    let otmp = sobj_at(otyp, x1, y1);
    let otherside = false;

    if (!otmp && otyp === ONAMES.BOULDER) {
        otherside = true;
        otmp = sobj_at(otyp, x2, y2);
    }
    if (!otmp)
        return 0;
    if (otherside) {
        [x1, x2] = [x2, x1];
        [y1, y2] = [y2, y1];
    }

    let singleobj;
    if (otmp.quan === 1) {
        obj_extract_self(otmp);
        singleobj = otmp;
    } else {
        singleobj = splitobj(otmp, 1);
        obj_extract_self(singleobj);
    }
    newsym(x1, y1);
    /* src/trap.c:3321 tmp_at(DISP_FLASH, obj_to_glyph(...)); tmp_at(x,y).
       The temporary boulder is visible while a later hit message pauses on
       --More--, even though it has already been unlinked from the floor.
       Removing a boulder schedules a vision update, so settle that first or
       pline() would repaint the floor over this temporary glyph. */
    if (game.vision_full_recalc)
        vision_recalc(0);
    const launchedGlyph = temporary_object_glyph(singleobj);
    display_object_at(singleobj, x1, y1, launchedGlyph);

    let dist = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1));
    let x = x1, y = y1;
    let tmpx = x1, tmpy = y1;
    let finalx = x2, finaly = y2;
    const dx = Math.sign(x2 - x1), dy = Math.sign(y2 - y1);
    const rolling = (style & ROLL) !== 0;
    let used_up = false;
    game.bhitpos = { x, y };

    if ((style & LAUNCH_KNOWN) !== 0)
        singleobj.otrapped = 1;
    /* LAUNCH_UNSEEN only changes sound and animation, neither draws from the
       core RNG. Keep the flag consumed so the remaining style is ROLL. */
    style &= ~(LAUNCH_UNSEEN | LAUNCH_KNOWN);

    while (dist-- > 0 && !used_up) {
        /* C advances tmp_at at the start of each animation iteration. If a
           collision message pauses, the glyph remains one square behind the
           object being tested for impact. */
        if (x !== tmpx || y !== tmpy) {
            newsym(tmpx, tmpy);
            display_object_at(singleobj, x, y, launchedGlyph);
            tmpx = x;
            tmpy = y;
        }
        if (!isok(game.bhitpos.x + dx, game.bhitpos.y + dy)) {
            finalx = x;
            finaly = y;
            break;
        }
        x = game.bhitpos.x += dx;
        y = game.bhitpos.y += dy;

        const mtmp = m_at(x, y);
        if (mtmp) {
            if (otyp === ONAMES.BOULDER && throws_rocks(mtmp.data)
                && rn2(3)) {
                if (cansee(x, y))
                    await pline(`${Monnam(mtmp)} snatches the boulder.`);
                singleobj.otrapped = 0;
                const { mpickobj } = await import('./steal.js');
                mpickobj(mtmp, singleobj);
                used_up = true;
                break;
            }
            const { ohitmon } = await import('./mthrowu.js');
            if (await ohitmon(mtmp, singleobj, rolling ? -1 : dist, false)) {
                used_up = true;
                break;
            }
        } else if (game.u.ux === x && game.u.uy === y) {
            const dam = dmgval(singleobj, game.youmonst);
            if (game.multi)
                nomul(0);
            await thitu(9 + (singleobj.spe || 0), dam,
                        { obj: singleobj }, null);
        }

        if (rolling) {
            const floorfx = await import('./do.js');
            if (await floorfx.flooreffects(singleobj, x, y, 'fall')) {
                used_up = true;
                break;
            }

            const otmp2 = otyp === ONAMES.BOULDER
                ? sobj_at(ONAMES.BOULDER, x, y) : null;
            if (otmp2) {
                await You_hear(`a loud crash${cansee(x, y)
                    ? ' as one boulder sets another in motion' : ''}!`);
                obj_extract_self(otmp2);
                otmp2.otrapped = singleobj.otrapped;
                singleobj.otrapped = 0;
                place_object(singleobj, x, y);
                singleobj = otmp2;
                wake_nearto(x, y, 100);
            }
        }

        if (otyp === ONAMES.BOULDER && closed_door(x, y)) {
            if (cansee(x, y))
                await pline('The boulder crashes through a door.');
            game.level.at(x, y).doormask = D_BROKEN;
            if (dist)
                recalc_block_point(x, y);
        }

        if (dist > 0 && isok(x + dx, y + dy)) {
            const nexttyp = game.level.at(x + dx, y + dy).typ;
            if (nexttyp === IRONBARS) {
                note_unported_trap('launch_obj:hits_bars');
                finalx = x;
                finaly = y;
                break;
            }
            if (IS_STWALL(nexttyp) || IS_TREE(nexttyp)) {
                finalx = x;
                finaly = y;
                if (!Deaf())
                    await pline('Thump!');
                wake_nearto(x, y, 16);
                break;
            }
        }
    }

    /* End the tmp_at display; the final placement is redrawn below. */
    newsym(tmpx, tmpy);
    if (!used_up) {
        singleobj.otrapped = 0;
        place_object(singleobj, finalx, finaly);
        newsym(finalx, finaly);
        return 1;
    }
    return 2;
}

// src/trap.c trapeffect_rolling_boulder_trap(), monster arm.
async function trapeffect_rolling_boulder_trap(mtmp, trap, trflags) {
    if (mtmp === game.youmonst) {
        note_unported_trap('rolling_boulder:hero');
        return Trap_Effect_Finished;
    }
    if (check_in_air(mtmp, trflags))
        return Trap_Effect_Finished;

    const in_sight = mtmp === game.u.usteed
        || (cansee(mtmp.mx, mtmp.my) && canspotmon(mtmp));
    newsym(mtmp.mx, mtmp.my);
    if (in_sight) {
        await pline(`${Deaf() ? '' : 'Click!  '}${Monnam(mtmp)} triggers `
                    + `${trap.tseen ? 'a rolling boulder trap' : 'something'}.`);
    }
    if (await launch_obj(ONAMES.BOULDER,
                         trap.launch.x, trap.launch.y,
                         trap.launch2.x, trap.launch2.y,
                         ROLL | (in_sight ? 0 : LAUNCH_UNSEEN))) {
        if (in_sight)
            trap.tseen = true;
        if (DEADMONSTER(mtmp))
            return Trap_Killed_Mon;
    }
    return mtmp.mtrapped ? Trap_Caught_Mon : Trap_Effect_Finished;
}
