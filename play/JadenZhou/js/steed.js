// steed.js -- riding (C ref: steed.c).
//
// Ported so far: doride(), mount_steed(), maybewakesteed(),
// exercise_steed(), landing_spot(), dismount_steed() and stucksteed();
// kick_steed(), poly_steed() and the less common dismount cases stop
// with "not ported yet".

import { game } from './gstate.js';
import { rn2, rnd, rn1 } from './rng.js';
import { pline, You, You_cant } from './display.js';
import { m_at, MON_AT, can_saddle, which_armor, accessible, sobj_at,
         place_monster, is_pool, is_lava } from './makemon.js';
import { isok, dist2 } from './hacklib.js';
import { near_capacity, test_move, end_running, xytodir } from './hack.js';
import { losehp, t_at, u_locomotion, set_wounded_legs, heal_legs, mintrap,
         float_down } from './trap.js'; /* C ref: hack.c losehp() */
import { getdir } from './cmd.js';
import { mon_nam, Monnam, YMonnam, x_monnam, ARTICLE_A, SUPPRESS_IT,
         SUPPRESS_INVISIBLE, SUPPRESS_HALLUCINATION } from './do_name.js';
import { SLT_ENCUMBER, M_AP_FURNITURE, M_AP_OBJECT, TEST_MOVE, W_SADDLE,
         HALLUC, WOUNDED_LEGS, BLINDED, TELEPAT, CONFUSION, FUMBLING, GLIB,
         LEVITATION, HALF_PHDAM, MAXULEV, STONE_RES } from './const.js';
import { mons, PM_LONG_WORM, PM_KNIGHT, M1_HUMANOID, MZ_SMALL, MZ_LARGE,
         PM_COCKATRICE, PM_CHICKATRICE } from './monsters.js';
import { is_swimmer, is_flyer, is_floater } from './mondata.js';

import { ECMD_OK, ECMD_TIME, ECMD_CANCEL } from './const.js';
import { DISMOUNT_BYCHOICE, DISMOUNT_THROWN, DISMOUNT_KNOCKED, DISMOUNT_FELL,
         DISMOUNT_POLY, DISMOUNT_ENGULFED, DISMOUNT_BONES, DISMOUNT_GENERIC,
         TELEDS_ALLOW_DRAG, DIR_ERR, N_DIRS, xdir, ydir, N_DIRS_Z, STUNNED,
         VIBRATING_SQUARE, KILLED_BY_AN, BOTH_SIDES, TT_BEARTRAP, TT_PIT,
         TT_WEB, NO_TRAP_FLAGS, P_RIDING, STEALTH, FLYING,
         has_mgivenname } from './const.js';
import { BOULDER } from './objects.js';
import { PM_GRID_BUG, M1_CLING, M2_ROCKTHROW } from './monsters.js';
import { teleds, enexto, rloc_to } from './teleport.js';
import { steed_vs_stealth } from './polyself.js';
import { is_pole } from './wield.js';
import { use_skill } from './weapon.js';
import { encumber_msg } from './pickup.js';
import { an } from './objnam.js';
import { pmname, Mgender } from './do_name.js';
import { has_ceiling } from './insight.js';
import { wseg_mon_at } from './worm.js';
import { finish_meating } from './dog.js';

/* C ref: youprop.h Flying, Levitation, Stealth */
function Flying() {
    const p = game.u.uprops[FLYING] || {};
    return !!((p.intrinsic || p.extrinsic
               || (game.u.usteed && is_flyer(game.u.usteed.data)))
              && !p.blocked);
}
function Levitation() {
    const p = game.u.uprops[LEVITATION] || {};
    return !!((p.intrinsic || p.extrinsic) && !p.blocked);
}
function Stealth() {
    const p = game.u.uprops[STEALTH] || {};
    return !!((p.intrinsic || p.extrinsic) && !p.blocked);
}
/* C ref: mondata.h throws_rocks() */
function throws_rocks(ptr) { return (ptr.mflags2 & M2_ROCKTHROW) !== 0; }
// C ref: cmd.c dirtocoord()
function dirtocoord(cc, dd) {
    if (dd > DIR_ERR && dd < N_DIRS_Z) {
        cc.x = xdir[dd];
        cc.y = ydir[dd];
    }
}

function uhave(prop) {
    const p = game.u.uprops[prop];
    return !!(p && (p.intrinsic || p.extrinsic));
}
/* C ref: you.h Upolyd, Role_if() */
function Upolyd() { return game.u.umonnum !== game.u.umonster; }
function Role_if(pm) { return game.urole.mnum === pm; }

// C ref: steed.c can_ride()
/* Can this monster wear a saddle and can the hero ride it? */
function can_ride(mtmp) {
    const ydat = game.youmonst.data;
    return (mtmp.mtame && (ydat.mflags1 & M1_HUMANOID) !== 0
            && !(ydat.msize < MZ_SMALL) && !(ydat.msize >= MZ_LARGE)
            && (!game.u.uinwater || is_swimmer(mtmp.data)));
}

// C ref: steed.c stucksteed()
/* decide whether hero's steed is able to move;
   doesn't check for holding traps--those affect the hero directly */
export async function stucksteed(checkfeeding) {
    const steed = game.u.usteed;

    if (steed) {
        /* check whether steed can move */
        if (steed.msleeping || !steed.mcanmove) { /* helpless(steed) */
            await pline(`${YMonnam(steed)} won't move!`);
            return true;
        }
        /* optionally check whether steed is in the midst of a meal */
        if (checkfeeding && steed.meating) {
            await pline(`${YMonnam(steed)} is still eating.`);
            return true;
        }
    }
    return false;
}


// C ref: steed.c doride() -- the #ride command
export async function doride() {
    const u = game.u;
    let forcemount = false;

    if (u.usteed) {
        await dismount_steed(DISMOUNT_BYCHOICE);
    } else if (await getdir(null) && isok(u.ux + u.dx, u.uy + u.dy)) {
        if (game.flags.debug)
            throw new Error('doride(): wizard-mode forced mount query not ported yet');
        return (await mount_steed(m_at(u.ux + u.dx, u.uy + u.dy), forcemount))
               ? ECMD_TIME : ECMD_OK;
    } else {
        return ECMD_CANCEL;
    }
    return ECMD_TIME;
}

// C ref: steed.c mount_steed() -- start riding, with the given monster
async function mount_steed(mtmp, force) {
    const u = game.u;
    let otmp;

    /* Sanity checks */
    if (u.usteed) {
        await You(`are already riding ${mon_nam(u.usteed)}.`);
        return false;
    }

    /* Is the player in the right form? */
    if (uhave(HALLUC) && !force) {
        await pline("Maybe you should find a designated driver.");
        return false;
    }
    if (uhave(WOUNDED_LEGS))
        throw new Error('mount_steed(): legs_in_no_shape() not ported yet');

    if (Upolyd())
        throw new Error('mount_steed(): polymorphed hero not ported yet');
    if (!force && (near_capacity() > SLT_ENCUMBER)) {
        await You_cant("do that while carrying so much stuff.");
        return false;
    }

    /* Can the player reach and see the monster? */
    const Blind = uhave(BLINDED), Blind_telepat = uhave(TELEPAT);
    if (!mtmp || (!force && ((Blind && !Blind_telepat) || mtmp.mundetected
                             || mtmp.m_ap_type === M_AP_FURNITURE
                             || mtmp.m_ap_type === M_AP_OBJECT))) {
        await pline("I see nobody there.");
        return false;
    }
    if (mtmp.data === mons[PM_LONG_WORM]
        && (u.ux + u.dx !== mtmp.mx || u.uy + u.dy !== mtmp.my))
        throw new Error('mount_steed(): long worm tails not ported yet');
    if (u.uswallow || u.ustuck || u.utrap || game.uball
        || !await test_move(u.ux, u.uy, mtmp.mx - u.ux, mtmp.my - u.uy,
                            TEST_MOVE)) {
        if (game.uball || !(u.uswallow || u.ustuck || u.utrap))
            await You("are unable to swing your leg over."); /* body_part(LEG) */
        else
            await You("are stuck here for now.");
        return false;
    }

    /* Is this a valid monster? */
    otmp = which_armor(mtmp, W_SADDLE);
    if (!otmp) {
        await pline(`${Monnam(mtmp)} is not saddled.`);
        return false;
    }

    const ptr = mtmp.data;
    /* touch_petrifies(ptr) && !Stone_resistance */
    if ((ptr === mons[PM_COCKATRICE] || ptr === mons[PM_CHICKATRICE])
        && !uhave(STONE_RES))
        throw new Error('mount_steed(): instapetrify() not ported yet');
    if (!mtmp.mtame || mtmp.isminion) {
        await pline(`I think ${mon_nam(mtmp)} would mind.`);
        return false;
    }
    if (mtmp.mtrapped)
        throw new Error('mount_steed(): trapname() not ported yet');

    if (!force && !Role_if(PM_KNIGHT) && !(--mtmp.mtame))
        throw new Error('mount_steed(): steed resists (no longer tame) not ported yet');
    if (!force && u.uinwater && !is_swimmer(ptr))
        throw new Error('mount_steed(): hliquid() not ported yet');
    if (!can_saddle(mtmp) || !can_ride(mtmp)) {
        await You_cant("ride such a creature.");
        return false;
    }

    /* Is the player impaired? */
    if (!force && !is_floater(ptr) && !is_flyer(ptr) && uhave(LEVITATION))
        throw new Error('mount_steed(): levitating hero (Lev_at_will) not ported yet');
    /* uarm && is_metallic(uarm) && greatest_erosion(uarm) */
    if (!force && game.uarm && (game.uarm.oeroded || game.uarm.oeroded2))
        throw new Error('mount_steed(): eroded metallic armor check not ported yet');
    if (!force
        && (uhave(CONFUSION) || uhave(FUMBLING) || uhave(GLIB)
            || uhave(WOUNDED_LEGS) || otmp.cursed || otmp.greased
            || (u.ulevel + mtmp.mtame < rnd(Math.trunc(MAXULEV / 2) + 5)))) {
        if (uhave(LEVITATION)) {
            await pline(`${Monnam(mtmp)} slips away from you.`);
            return false;
        }
        await You(`slip while trying to get on ${mon_nam(mtmp)}.`);

        /* "a saddled mumak" or "a saddled pony called Dobbin" */
        const buf = `slipped while mounting ${x_monnam(mtmp, ARTICLE_A, null,
                         SUPPRESS_IT | SUPPRESS_INVISIBLE
                             | SUPPRESS_HALLUCINATION,
                         true)}`;
        const dmg = rn1(5, 10);
        /* Maybe_Half_Phys() */
        await losehp(uhave(HALF_PHDAM) ? Math.trunc((dmg + 1) / 2) : dmg,
                     buf, 2 /* NO_KILLER_PREFIX */);
        return false;
    }

    /* Success */
    await maybewakesteed(mtmp);
    if (!force) {
        if (uhave(LEVITATION) && !is_floater(ptr) && !is_flyer(ptr))
            /* Must have Lev_at_will at this point */
            await pline(`${Monnam(mtmp)} magically floats up!`);
        await You(`mount ${mon_nam(mtmp)}.`);
        if (Flying())
            await You(`and ${mon_nam(mtmp)} take flight together.`);
    }
    /* setuwep handles polearms differently when you're mounted */
    if (game.uwep && is_pole(game.uwep))
        game.unweapon = false;
    u.usteed = mtmp;
    {
        const was_stealthy = Stealth();

        steed_vs_stealth();
        if (was_stealthy && !Stealth())
            await You("aren't stealthy anymore.");
    }
    /* remove_monster(mtmp->mx, mtmp->my): the ridden steed is no longer
       on the map grid; here m_at() skips u.usteed, which has that effect */
    await teleds(mtmp.mx, mtmp.my, TELEDS_ALLOW_DRAG);
    game.disp_botl = true;
    return true;
}

// C ref: steed.c exercise_steed()
/* You and your steed have moved */
export async function exercise_steed() {
    const u = game.u;

    if (!u.usteed)
        return;

    /* It takes many turns of riding to exercise skill */
    u.urideturns = (u.urideturns || 0) + 1;
    if (u.urideturns >= 100) {
        u.urideturns = 0;
        await use_skill(P_RIDING, 1);
    }
    return;
}

// C ref: steed.c landing_spot()
/*
 * Try to find a dismount point adjacent to the steed's location.
 * If all else fails, try enexto().  Use enexto() as a last resort because
 * enexto() chooses its point randomly, possibly even outside the
 * room's walls, which is not what we want.
 * Adapted from mail daemon code.
 */
async function landing_spot(
    spot, /* landing position (we fill it in) */
    reason,
    forceit) {
    const u = game.u;
    const cc = { x: 0, y: 0 };
    const tryxy = []; /* try[8]: the 8 spots adjacent to the hero's spot */
    let i, j, best_j, clockwise_j, counterclk_j,
        n, viable, distance, min_distance = -1;
    let x, y;
    let found, impaird, kn_trap, boulder;
    let t;

    for (i = 0; i < 8; i++)
        tryxy.push({ x: 0, y: 0 });
    n = 0;
    j = xytodir(u.dx, u.dy);
    if (reason === DISMOUNT_KNOCKED && j !== DIR_ERR) {
        /* we'll check preferred location first; if viable it'll be picked */
        best_j = j;
        tryxy[0].x = u.dx, tryxy[0].y = u.dy;
        /* the two next best locations are checked second and third */
        i = rn2(2);
        clockwise_j = (j + 1) % N_DIRS; /* DIR_RIGHT(j) */
        dirtocoord(cc, clockwise_j);
        tryxy[1 + i].x = cc.x, tryxy[1 + i].y = cc.y; /* [1] or [2] */
        counterclk_j = (j + 7) % N_DIRS; /* DIR_LEFT(j) */
        dirtocoord(cc, counterclk_j);
        tryxy[2 - i].x = cc.x, tryxy[2 - i].y = cc.y; /* [2] or [1] */
        n = 3;
    } else {
        best_j = clockwise_j = counterclk_j = -1;
    }
    for (j = 0; j < N_DIRS; ++j) {
        /* fortunately NODIAG() handling isn't needed for DISMOUNT_KNOCKED
           because hero can only ride when humanoid */
        if (j === best_j || j === clockwise_j || j === counterclk_j)
            continue;
        /* j==0 is W, j==1 NW, j==2 N, j==3 NE, ..., around to j==7 SW;
           so odd j values are diagonal directions here */
        if (reason === DISMOUNT_POLY && game.u.umonnum === PM_GRID_BUG
            && (j % 1) !== 0) /* NODIAG(u.umonnum) */
            continue;
        dirtocoord(cc, j);
        tryxy[n++] = { x: cc.x, y: cc.y };
    }

    /*
     * Up to three passes;
     * i==0: voluntary dismount without impairment avoids known traps and
     *       boulders;
     * i==1: voluntary dismount with impairment or knocked out of saddle
     *       avoids boulders but allows known traps;
     * i==2: other, allow traps and boulders.
     *
     * Fallback to i==1 if nothing appropriate was found for i==0 and
     * to i==2 as last resort.
     */
    impaird = (uhave(STUNNED) || uhave(CONFUSION) || uhave(FUMBLING));
    viable = 0;
    found = false;
    for (i = (reason === DISMOUNT_BYCHOICE && !impaird) ? 0
             : ((reason === DISMOUNT_BYCHOICE && impaird)
                || reason === DISMOUNT_KNOCKED) ? 1
               : 2;
         i <= 2 && !found; ++i) {
        for (j = 0; j < n; ++j) {
            x = u.ux + tryxy[j].x;
            y = u.uy + tryxy[j].y;
            if (!isok(x, y) || (x === u.ux && y === u.uy)) /* [note: u_at() can't happen] */
                continue;

            if (accessible(x, y) && !MON_AT(x, y)
                && await test_move(u.ux, u.uy, x - u.ux, y - u.uy, TEST_MOVE)) {
                ++viable;
                distance = dist2(x, y, u.ux, u.uy); /* distu(x, y) */
                if (min_distance < 0 /* no viable candidate yet */
                    /* or better than pending candidate (note: orthogonal
                       spots are distance 1 and diagonal ones distance 2;
                       treating one as better than the other is arbitrary
                       and not wanted for DISMOUNT_KNOCKED) */
                    || ((best_j === -1) ? (distance < min_distance) : (j < 3))
                    /* or equally good, maybe substitute this one */
                    || (distance === min_distance && !rn2(viable))) {
                    /* traps avoided on pass 0; boulders avoided on 0 and 1 */
                    kn_trap = i === 0 && ((t = t_at(x, y)) != null && !!t.tseen
                                          && t.ttyp !== VIBRATING_SQUARE);
                    boulder = i <= 1 && (!!sobj_at(BOULDER, x, y)
                                         && !throws_rocks(game.youmonst.data));
                    if (!kn_trap && !boulder) {
                        spot.x = x;
                        spot.y = y;
                        min_distance = distance;
                        found = true;
                        if (best_j !== -1 && j < 3)
                            /* since best_j is first candidate (j==0), j==1
                               and j==2 can only get here when best_j was
                               not viable; 50:50 chance for clockwise_j to
                               come before counterclk_j so each has same
                               chance to be next after best_j */
                            break;
                    }
                }
            }
        }
    }

    /* If we didn't find a good spot and forceit is on, try enexto(). */
    if (forceit && !found)
        found = enexto(spot, u.ux, u.uy, game.youmonst.data);

    return found;
}

/* C ref: display.h m_at() for the former steed's spot: C keeps the ridden
   steed off the map grid until place_monster(); this port finds monsters
   by position, so the steed itself is skipped */
function m_at_not(x, y, mtmp) {
    for (const m of game.level.monsters || [])
        if (m !== mtmp && m.mx === x && m.my === y && !m.dead)
            return m;
    return wseg_mon_at(x, y);
}

// C ref: steed.c dismount_steed()
/* Stop riding the current steed */
export async function dismount_steed(
    reason) { /* Player was thrown off etc. */
    const u = game.u;
    let mtmp;
    let otmp;
    let verb;
    const cc = { x: 0, y: 0 }, steedcc = { x: 0, y: 0 };
    const save_utrap = u.utrap;
    let ulev, ufly;
    let repair_leg_damage = uhave(WOUNDED_LEGS);
    let have_spot = await landing_spot(cc, reason, 0);

    mtmp = u.usteed; /* make a copy of steed pointer */
    /* Sanity check */
    if (!mtmp) /* Just return silently */
        return;
    u.usteed = null; /* affects Fly test; could hypothetically affect Lev;
                      * also affects u_locomotion() */
    ufly = Flying() ? true : false;
    ulev = Levitation() ? true : false;
    verb = u_locomotion("fall"); /* only used for _FELL and _KNOCKED */
    u.usteed = mtmp;

    /* Check the reason for dismounting */
    otmp = which_armor(mtmp, W_SADDLE);
    switch (reason) {
    case DISMOUNT_THROWN:
    case DISMOUNT_KNOCKED:
    case DISMOUNT_FELL:
        if (reason === DISMOUNT_THROWN)
            verb = "are thrown";
        /*FALLTHRU*/
        await You(`${verb} off of ${mon_nam(mtmp)}!`);
        if (!have_spot)
            have_spot = await landing_spot(cc, reason, 1);
        if (!ulev && !ufly) {
            const dmg = rn1(10, 10);
            /* Maybe_Half_Phys() */
            await losehp(uhave(HALF_PHDAM) ? Math.trunc((dmg + 1) / 2) : dmg,
                         "riding accident", KILLED_BY_AN);
            await set_wounded_legs(BOTH_SIDES,
                                   (u.uprops[WOUNDED_LEGS]?.intrinsic || 0)
                                   + rn1(5, 5));
            repair_leg_damage = false;
        }
        break;
    case DISMOUNT_POLY:
        await You(`can no longer ride ${mon_nam(u.usteed)}.`);
        if (!have_spot)
            have_spot = await landing_spot(cc, reason, 1);
        break;
    case DISMOUNT_ENGULFED:
        /* caller displays message */
        break;
    case DISMOUNT_BONES:
        /* hero has just died... */
        break;
    case DISMOUNT_GENERIC:
        /* no messages, just make it so */
        break;
    case DISMOUNT_BYCHOICE:
    default:
        if (otmp && otmp.cursed) {
            await You(`can't.  The saddle ${otmp.bknown ? "is" : "seems to be"} cursed.`);
            otmp.bknown = 1; /* ok to skip set_bknown() here */
            return;
        }
        if (!have_spot) {
            await You("can't.  There isn't anywhere for you to stand.");
            return;
        }
        if (!has_mgivenname(mtmp)) {
            await pline(`You've been through the dungeon on ${
                        an(pmname(mtmp.data, Mgender(mtmp)))} with no name.`);
            if (uhave(HALLUC))
                await pline("It felt good to get out of the rain.");
        } else
            await You(`dismount ${mon_nam(mtmp)}.`);
    }
    /* While riding, Wounded_legs refers to the steed's legs;
       after dismounting, it reverts to the hero's legs. */
    if (repair_leg_damage)
        await heal_legs(1);

    /* Release the steed */
    u.usteed = null;
    u.ugallop = 0;
    {
        const was_stealthy = Stealth();

        steed_vs_stealth();
        if (Stealth() && !was_stealthy)
            await You("seem less noisy now.");
    }

    if (u.utraptype === TT_BEARTRAP
        || u.utraptype === TT_PIT
        || u.utraptype === TT_WEB) {
        mtmp.mtrapped = 1;
    }

    /*
     * rloc(), rloc_to(), and monkilled()->mondead()->m_detach() all
     * expect mtmp to be on the map or else have mtmp->mx be 0, but
     * setting the latter to 0 here would interfere with dropping
     * the saddle.  Prior to 3.6.2, being off the map didn't matter.
     *
     * place_monster() expects mtmp to be alive and not be u.usteed.
     *
     * Unfortunately, <u.ux,u.uy> (former steed's implicit location)
     * might now be occupied by an engulfer, so we can't just put mtmp
     * at that spot.  An engulfer's previous spot will be unoccupied
     * but we don't know where that was and even if we did, it might
     * be hostile terrain.
     */
    steedcc.x = u.ux, steedcc.y = u.uy;
    if (m_at_not(u.ux, u.uy, mtmp)) {
        /* hero's spot has a monster in it; hero must have been plucked
           from saddle as engulfer moved into his spot--other dismounts
           shouldn't run into this situation; find nearest viable spot */
        throw new Error('dismount_steed(): steed displaced by a monster at the hero\'s spot not ported yet');
    }

    if (!(mtmp.mhp < 1)) { /* !DEADMONSTER(mtmp) */
        game.in_steed_dismounting = (game.in_steed_dismounting || 0) + 1;
        place_monster(mtmp, steedcc.x, steedcc.y);
        game.in_steed_dismounting--;

        /* if for bones, there's no reason to place the hero;
           we want to make room for potential ghost, so move steed */
        if (reason === DISMOUNT_BONES)
            throw new Error('dismount_steed(): DISMOUNT_BONES not ported yet');

        /* Set hero's and/or steed's positions.  Usually try moving the
           hero first.  Note: for DISMOUNT_ENGULFED, caller hasn't set
           u.uswallow yet but has set u.ustuck. */
        if (!u.uswallow && !u.ustuck && have_spot) {
            const mdat = mtmp.data;

            /* The steed may drop into water/lava */
            if (!is_flyer(mdat) && !is_floater(mdat)
                && (!(mdat.mflags1 & M1_CLING) || !has_ceiling(u.uz))) { /* grounded(mdat) */
                if (is_pool(u.ux, u.uy))
                    throw new Error('dismount_steed(): steed falls into water not ported yet');
                else if (is_lava(u.ux, u.uy))
                    throw new Error('dismount_steed(): steed pulled into lava not ported yet');
            }
            /* Steed dismounting consists of two steps: being moved to another
             * square, and descending to the floor.  We have functions to do
             * each of these activities, but they're normally called
             * individually and include an attempt to look at or pick up the
             * objects on the floor:
             * teleds() --> spoteffects() --> pickup()
             * float_down() --> pickup()
             * We use this kludge to make sure there is only one such attempt.
             *
             * Clearly this is not the best way to do it.  A full fix would
             * involve having these functions not call pickup() at all,
             * instead calling them first and calling pickup() afterwards.
             * But it would take a lot of work to keep this change from
             * having any unforeseen side effects (for instance, you would
             * no longer be able to walk onto a square with a hole, and
             * autopickup before falling into the hole).
             */
            /* [ALI] No need to move the player if the steed died. */
            if (!(mtmp.mhp < 1)) {
                /* Keep steed here, move the player to cc;
                 * teleds() clears u.utrap
                 */
                game.in_steed_dismounting = true;
                await teleds(cc.x, cc.y, TELEDS_ALLOW_DRAG);
                if (sobj_at(BOULDER, cc.x, cc.y))
                    throw new Error('dismount_steed(): sokoban_guilt() not ported yet');
                game.in_steed_dismounting = false;

                /* Put your steed in your trap */
                if (save_utrap)
                    await mintrap(mtmp, NO_TRAP_FLAGS);
            }

        /* Couldn't move hero... try moving the steed. */
        } else if (enexto(cc, u.ux, u.uy, mtmp.data)) {
            /* Keep player here, move the steed to cc */
            await rloc_to(mtmp, cc.x, cc.y);
            /* Player stays put */

        /* Otherwise, steed goes bye-bye. */
        } else {
            throw new Error('dismount_steed(): no room for the steed (killed()) not ported yet');
        }
    } /* !DEADMONST(mtmp) */

    /* usually return the hero to the surface */
    if (reason !== DISMOUNT_ENGULFED && reason !== DISMOUNT_BONES) {
        game.in_steed_dismounting = true;
        await float_down(0, W_SADDLE);
        game.in_steed_dismounting = false;
        game.disp_botl = true;
        await encumber_msg();
        game.vision_full_recalc = 1;
    } else
        game.disp_botl = true;
    /* polearms behave differently when not mounted */
    if (game.uwep && is_pole(game.uwep))
        game.unweapon = true;
    return;
}

// C ref: steed.c maybewakesteed()
/* when attempting to saddle or mount a sleeping steed, try to wake it up
   (for the saddling case, it won't be u.usteed yet) */
async function maybewakesteed(steed) {
    let frozen = steed.mfrozen | 0;
    const wasimmobile = !!(steed.msleeping || !steed.mcanmove); /* helpless() */

    steed.msleeping = 0;
    if (frozen) {
        frozen = Math.trunc((frozen + 1) / 2); /* half */
        /* might break out of timed sleep or paralysis */
        if (!rn2(frozen)) {
            steed.mfrozen = 0;
            steed.mcanmove = 1;
        } else {
            /* didn't awake, but remaining duration is halved */
            steed.mfrozen = frozen;
        }
    }
    if (wasimmobile && !(steed.msleeping || !steed.mcanmove))
        await pline(`${Monnam(steed)} wakes up.`);
    /* regardless of waking, terminate any meal in progress */
    finish_meating(steed);
}
