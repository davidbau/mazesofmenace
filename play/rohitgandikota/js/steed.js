// steed.js — riding.
// C ref: src/steed.c
//
// put_saddle_on_mon() DRAWS: with no saddle passed it calls
// mksobj(SADDLE, ...), which spends a next_ident(). doride()/mount_steed()
// are live; dismount_steed() records its landing machinery.

import { game } from './gstate.js';
import { MONSYMS, MFLAGS } from './monst_data.js';
import { humanoid, amorphous, noncorporeal, is_whirly,
         unsolid, verysmall, bigmonst, is_swimmer, is_floater,
         is_flyer, cant_drown, likes_lava } from './mondata.js';
import { which_armor } from './worn.js';
import { mksobj } from './mkobj.js';
import { ONAMES } from './objects_data.js';
import { W_SADDLE, ECMD_OK, ECMD_TIME, ECMD_CANCEL, isok, SLT_ENCUMBER,
         TELEDS_ALLOW_DRAG, Upolyd, u_at, DIR_ERR, DIR_LEFT, DIR_RIGHT,
         N_DIRS, VIBRATING_SQUARE, LEFT_SIDE, RIGHT_SIDE,
         TT_BEARTRAP, TT_PIT, TT_WEB, TEST_MOVE,
         DISMOUNT_GENERIC, DISMOUNT_FELL, DISMOUNT_THROWN, DISMOUNT_KNOCKED,
         DISMOUNT_POLY, DISMOUNT_ENGULFED, DISMOUNT_BONES, DISMOUNT_BYCHOICE,
         has_mgivenname, RLOC_ERR, RLOC_NOMSG, KILLED_BY_AN } from './const.js';
import { OBJ_MINVENT, is_metallic } from './obj.js';
import { rn2, rnd, rn1 } from './rng.js';
import { newsym, pline } from './display.js';
import { You, You_cant, Your } from './pline.js';
import { Monnam, mon_nam, pmname, hliquid, y_monnam } from './do_name.js';
import { m_at, is_pool, is_lava, t_at, killed, monkilled } from './mon.js';
import { remove_monster, place_monster } from './makemon.js';
import { near_capacity, encumber_msg, adjalign } from './attrib.js';
import { losehp, test_move, u_locomotion } from './hack.js';
import { teleds, enexto, rloc_to, rloc } from './teleport.js';
import { surface } from './dungeon.js';
import { helpless, DEADMONSTER } from './monst.js';
import { finish_meating } from './dogmove.js';
import { xytodir, dirtocoord } from './cmd.js';
import { accessible } from './monmove.js';
import { distu } from './hacklib.js';
import { sobj_at, fully_identify_obj } from './invent.js';
import { an } from './objnam.js';
import { throws_rocks } from './mondata.js';
import { grounded, sokoban_guilt } from './trap.js';
import { is_pole } from './mhitu.js';
import { PMNAMES } from './monst_data.js';
import { Glib, Flying, Levitation, Half_physical_damage, Stealth, Hallucination } from './youprop.js';
import { greatest_erosion } from './do_wear.js';
import { u_handsy } from './pickup.js';
import { Underwater } from './youprop.js';
import { Stone_resistance } from './youprop.js';
import { Fumbling } from './youprop.js';
import { getdir } from './cmd.js';
import { Never_mind } from './const.js';
import { A_WIS } from './const.js';
import { A_DEX } from './const.js';
import { A_CHA } from './const.js';
import { P_RIDING } from './const.js';
import { P_ISRESTRICTED } from './const.js';
import { P_UNSKILLED } from './const.js';
import { P_BASIC } from './const.js';
import { P_SKILLED } from './const.js';
import { P_EXPERT } from './const.js';
import { Mgender } from './const.js';
import { canspotmon } from './display.js';
import { touch_petrifies } from './dog.js';
import { poly_when_stoned } from './mondata.js';
import { polymon, steed_vs_stealth } from './polyself.js';
import { ATTKS } from './monst_data.js';
import { instapetrify } from './trap.js';
import { exercise } from './attrib.js';
import { ACURR } from './attrib.js';
import { Role_if } from './attrib.js';
import { P_SKILL } from './weapon.js';
import { objdescr_is } from './o_init.js';
import { remove_worn_item } from './steal.js';
import { freeinv } from './invent.js';

// src/steed.c:17 rider_cant_reach().
export async function rider_cant_reach() {
    await You(`aren't skilled enough to reach from ${y_monnam(game.u.usteed)}.`);
}











































function note_unported_steed(what) {
    (game.unported ||= new Set()).add('steed:' + what);
}

// src/steed.c:8 steeds[] — the monster classes that can be ridden.
const steeds = [
    MONSYMS.S_QUADRUPED, MONSYMS.S_UNICORN, MONSYMS.S_ANGEL,
    MONSYMS.S_CENTAUR, MONSYMS.S_DRAGON, MONSYMS.S_JABBERWOCK,
];

// src/steed.c:26 can_saddle()
export function can_saddle(mtmp) {
    const ptr = mtmp.data;

    return steeds.includes(ptr.mlet) && ptr.msize >= MFLAGS.MZ_MEDIUM
        && (!humanoid(ptr) || ptr.mlet === MONSYMS.S_CENTAUR)
        && !amorphous(ptr) && !noncorporeal(ptr) && !is_whirly(ptr)
        && !unsolid(ptr);
}

/* include/youprop.h Confusion */
const Confusion = () => !!(game.u.intrinsic?.HConfusion);

// src/steed.c:36 use_saddle(); apply a saddle to an adjacent animal
export async function use_saddle(otmp) {
    let mtmp;
    let ptr;
    let chance;

    if (!(await u_handsy()))
        return ECMD_OK;

    /* Select an animal */
    if (game.u.uswallow || Underwater() || !(await getdir(null))) {
        await pline(Never_mind);
        return ECMD_CANCEL;
    }
    if (!game.u.dx && !game.u.dy) {
        await pline('Saddle yourself?  Very funny...');
        return ECMD_OK;
    }
    if (!isok(game.u.ux + game.u.dx, game.u.uy + game.u.dy)
        || !(mtmp = m_at(game.u.ux + game.u.dx, game.u.uy + game.u.dy)) || !canspotmon(mtmp)) {
        await pline('I see nobody there.');
        return ECMD_TIME;
    }

    /* Is this a valid monster? */
    if ((mtmp.misc_worn_check & W_SADDLE) !== 0
        || which_armor(mtmp, W_SADDLE)) {
        await pline(`${Monnam(mtmp)} doesn't need another one.`);
        return ECMD_TIME;
    }
    ptr = mtmp.data;
    if (touch_petrifies(ptr) && !game.u.uarmg && !Stone_resistance()) {
        await You(`touch ${mon_nam(mtmp)}.`);
        if (!(poly_when_stoned(game.youmonst.data) && await polymon(PMNAMES.PM_STONE_GOLEM))) {
            const kbuf = `attempting to saddle ${an(pmname(mtmp.data, Mgender(mtmp)))}`;
            await instapetrify(kbuf);
        }
    }
    if (ptr === game.mons[PMNAMES.PM_AMOROUS_DEMON]) {
        await pline('Shame on you!');
        exercise(A_WIS, false);
        return ECMD_TIME;
    }
    if (mtmp.isminion || mtmp.isshk || mtmp.ispriest || mtmp.isgd
        || mtmp.iswiz) {
        await pline(`I think ${mon_nam(mtmp)} would mind.`);
        return ECMD_TIME;
    }
    if (!can_saddle(mtmp)) {
        await You_cant('saddle such a creature.');
        return ECMD_TIME;
    }

    /* Calculate your chance */
    chance = ACURR(A_DEX) + Math.trunc(ACURR(A_CHA) / 2) + 2 * mtmp.mtame;
    chance += game.u.ulevel * (mtmp.mtame ? 20 : 5);
    if (!mtmp.mtame)
        chance -= 10 * mtmp.m_lev;
    if (Role_if(PMNAMES.PM_KNIGHT))
        chance += 20;
    switch (P_SKILL(P_RIDING)) {
    case P_ISRESTRICTED:
    case P_UNSKILLED:
    default:
        chance -= 20;
        break;
    case P_BASIC:
        break;
    case P_SKILLED:
        chance += 15;
        break;
    case P_EXPERT:
        chance += 30;
        break;
    }
    if (Confusion() || Fumbling() || Glib())
        chance -= 20;
    else if (game.u.uarmg && objdescr_is(game.u.uarmg, 'riding gloves'))
        /* Bonus for wearing "riding" (but not fumbling) gloves */
        chance += 10;
    else if (game.u.uarmf && objdescr_is(game.u.uarmf, 'riding boots'))
        /* ... or for "riding boots" */
        chance += 10;
    if (otmp.cursed)
        chance -= 50;

    /* [intended] steed becomes alert if possible */
    await maybewakesteed(mtmp);

    /* Make the attempt */
    if (rn2(100) < chance) {
        await You(`put the saddle on ${mon_nam(mtmp)}.`);
        if (otmp.owornmask)
            await remove_worn_item(otmp, false);
        freeinv(otmp);
        /* !can_saddle(mtmp) already eliminated above */
        put_saddle_on_mon(otmp, mtmp);
    } else
        await pline(`${Monnam(mtmp)} resists!`);
    return ECMD_TIME;
}

// src/steed.c put_saddle_on_mon() — saddle `mtmp`, making the saddle if the
// caller did not supply one.
//
// The mksobj() is the draw. fully_identify_obj() is discovery bookkeeping and
// update_mon_extrinsics() is a no-op for a saddle, which grants nothing.
export function put_saddle_on_mon(saddle, mtmp) {
    if (!can_saddle(mtmp) || which_armor(mtmp, W_SADDLE))
        return;

    if (!saddle) {
        saddle = mksobj(ONAMES.SADDLE, true, false);
        if (!saddle)
            return;
        fully_identify_obj(saddle);
    }

    (mtmp.minvent ||= []).unshift(saddle);      /* mpickobj() */
    saddle.where = OBJ_MINVENT;
    saddle.ocarry = mtmp;

    mtmp.misc_worn_check = (mtmp.misc_worn_check || 0) | W_SADDLE;
    saddle.owornmask = W_SADDLE;
    saddle.leashmon = mtmp.m_id;
}


// src/steed.c:35 can_ride()
export function can_ride(mtmp) {
    return (mtmp.mtame && humanoid(game.youmonst.data)
            && !verysmall(game.youmonst.data) && !bigmonst(game.youmonst.data)
            && (!game.u.uinwater || is_swimmer(mtmp.data)));
}

// src/steed.c:178 doride() — the #ride command.
export async function doride() {
    const { getdir } = await import('./cmd.js');

    if (game.u.usteed) {
        await dismount_steed(DISMOUNT_BYCHOICE);
    } else if (await getdir(null)
               && isok(game.u.ux + game.u.dx, game.u.uy + game.u.dy)) {
        let force = false;
        if (game.wizard) {
            const { tty_yn_function } = await import('./tty/topl.js');
            force = (await tty_yn_function(
                'Force the mount to succeed?', 'yn', 'n')) === 'y';
        }
        return (await mount_steed(
                    m_at(game.u.ux + game.u.dx, game.u.uy + game.u.dy),
                    force))
            ? ECMD_TIME : ECMD_OK;
    } else {
        return ECMD_CANCEL;
    }
    return ECMD_TIME;
}

// src/steed.c:349 maybewakesteed() — wake the steed being mounted.
export async function maybewakesteed(steed) {
    let frozen = steed.mfrozen | 0;
    const wasimmobile = helpless(steed);

    steed.msleeping = 0;
    if (frozen) {
        frozen = (frozen + 1) >> 1; /* half */
        if (!rn2(frozen)) {
            steed.mfrozen = 0;
            steed.mcanmove = 1;
        } else {
            steed.mfrozen = frozen;
        }
    }
    if (wasimmobile && !helpless(steed))
        await pline(`${Monnam(steed)} wakes up.`);
    /* regardless of waking, terminate any meal in progress */
    finish_meating(steed);
}

// src/steed.c:420 kick_steed() lowers an awake steed's tameness, possibly
// throw the rider, or start a gallop. The helpless response has extra
// pronoun-sensitive text and remains separately visible in the gap audit.
export async function kick_steed() {
    const steed = game.u.usteed;
    if (!steed)
        return;
    if (helpless(steed)) {
        note_unported_steed('kick:helpless');
        return;
    }

    if (steed.mtame)
        steed.mtame--;
    if (!steed.mtame && steed.mleashed)
        note_unported_steed('kick:m_unleash');
    if (!steed.mtame
        || game.u.ulevel + steed.mtame < rnd(20)) {
        newsym(steed.mx, steed.my);
        await dismount_steed(DISMOUNT_THROWN);
        return;
    }

    await pline(`${Monnam(steed)} gallops!`);
    game.u.ugallop = (game.u.ugallop | 0) + rn1(20, 30);
}

// src/steed.c:197 mount_steed() — start riding the given monster.
export async function mount_steed(mtmp, force) {
    if (game.u.usteed) {
        await You(`are already riding ${mon_nam(game.u.usteed)}.`);
        return false;
    }
    if (game.u.uprops?.HALLUC && !force) {
        await pline('Maybe you should find a designated driver.');
        return false;
    }
    if (Upolyd(game.u))
        note_unported_steed('mount:upolyd_form');
    if (!force && near_capacity() > SLT_ENCUMBER) {
        await You_cant('do that while carrying so much stuff.');
        return false;
    }
    if (!mtmp || (!force && ((game.u.ublind && !game.u.uprops?.TELEPAT)
                             || mtmp.mundetected || mtmp.m_ap_type
                             || (mtmp.minvis
                                 && !game.u.uprops?.SEE_INVIS)))) {
        await pline('I see nobody there.');
        return false;
    }
    if (game.u.uswallow || game.u.ustuck || game.u.utrap
        || game.uball /* Punished */ || game.u.uprops?.FUMBLING) {
        if (game.uball
            || !(game.u.uswallow || game.u.ustuck || game.u.utrap))
            await You('are unable to swing your leg over.');
        else
            await You('are stuck here for now.');
        return false;
    }

    const otmp = which_armor(mtmp, W_SADDLE);
    if (!otmp) {
        await pline(`${Monnam(mtmp)} is not saddled.`);
        return false;
    }
    if (!mtmp.mtame || mtmp.isminion) {
        await pline(`I think ${mon_nam(mtmp)} would mind.`);
        return false;
    }
    if (mtmp.mtrapped) {
        note_unported_steed('mount:trapped_steed');
        return false;
    }
    if (!can_saddle(mtmp) || !can_ride(mtmp)) {
        await You_cant('ride such a creature.');
        return false;
    }

    /* Is the player impaired? */
    const ptr = mtmp.data;
    if (!force && !is_floater(ptr) && !is_flyer(ptr)
        && game.u.uprops?.LEVITATION) {
        note_unported_steed('mount:levitation');
        return false;
    }
    if (!force && game.u.uarm && is_metallic(game.u.uarm)
        && greatest_erosion(game.u.uarm)) {
        const condition = game.u.uarm.oeroded ? 'rusty' : 'corroded';
        await Your(`${condition} armor is too stiff to be able to mount ${
            mon_nam(mtmp)}.`);
        return false;
    }
    const Confusion = game.u.intrinsic?.HConfusion
                      || game.u.uprops?.CONFUSION;
    const Wounded_legs = (game.u.intrinsic?.HWounded_legs || 0) > 0
                         || (game.u.EWounded_legs || 0);
    if (!force
        && (Confusion || game.u.uprops?.FUMBLING || Glib()
            || Wounded_legs || otmp.cursed || otmp.greased
            || (game.u.ulevel + mtmp.mtame
                < rnd(20)))) { /* rnd(MAXULEV / 2 + 5) */
        if (game.u.uprops?.LEVITATION) {
            await pline(`${Monnam(mtmp)} slips away from you.`);
            return false;
        }
        await You(`slip while trying to get on ${mon_nam(mtmp)}.`);
        await losehp(rn1(5, 10),
               `slipped while mounting ${mon_nam(mtmp)}`,
               2 /* NO_KILLER_PREFIX */);
        return false;
    }

    /* Success */
    await maybewakesteed(mtmp);
    if (!force) {
        await You(`mount ${mon_nam(mtmp)}.`);
        if (game.u.uprops?.FLYING)
            await You(`and ${mon_nam(mtmp)} take flight together.`);
    }
    /* src/steed.c:368: a polearm which was unsuitable on foot becomes a
       proper wielded weapon as soon as the hero is mounted. */
    if (game.u.uwep && is_pole(game.u.uwep))
        game.unweapon = false;
    game.u.usteed = mtmp;
    if (game.u.uprops?.STEALTH)
        note_unported_steed('mount:steed_vs_stealth');
    remove_monster(mtmp.mx, mtmp.my);
    await teleds(mtmp.mx, mtmp.my, TELEDS_ALLOW_DRAG);
    (game.disp ||= {}).botl = true;
    return true;
}

// src/steed.c:386 exercise_steed() — riding skill accrues per 100 turns.
export function exercise_steed() {
    if (!game.u.usteed)
        return;
    game.u.urideturns = (game.u.urideturns || 0) + 1;
    if (game.u.urideturns >= 100) {
        game.u.urideturns = 0;
        note_unported_steed('exercise_steed:use_skill');
    }
}

// src/steed.c:460 landing_spot() — find a spot for the hero to land after
// dismounting. Sixty percent of the function is candidate bookkeeping; the
// draws are the rn2(2) knock-direction shuffle (DISMOUNT_KNOCKED only) and
// the !rn2(viable) reservoir choice among equally-distant candidates.
async function landing_spot(spot, reason, forceit) {
    const trycc = Array.from({ length: 8 }, () => ({ x: 0, y: 0 }));
    let best_j, clockwise_j, counterclk_j;
    let n = 0, viable = 0, min_distance = -1;
    let found = false;

    let j = xytodir(game.u.dx, game.u.dy);
    if (reason === DISMOUNT_KNOCKED && j !== DIR_ERR) {
        /* we'll check preferred location first; if viable it'll be picked */
        best_j = j;
        trycc[0].x = game.u.dx; trycc[0].y = game.u.dy;
        /* the two next best locations are checked second and third */
        const i = rn2(2);
        const cc = { x: 0, y: 0 };
        clockwise_j = DIR_RIGHT(j);
        dirtocoord(cc, clockwise_j);
        trycc[1 + i].x = cc.x; trycc[1 + i].y = cc.y;
        counterclk_j = DIR_LEFT(j);
        dirtocoord(cc, counterclk_j);
        trycc[2 - i].x = cc.x; trycc[2 - i].y = cc.y;
        n = 3;
    } else {
        best_j = clockwise_j = counterclk_j = -1;
    }
    for (j = 0; j < N_DIRS; ++j) {
        if (j === best_j || j === clockwise_j || j === counterclk_j)
            continue;
        /* j==0 is W, j==1 NW, ...; odd j values are diagonals here */
        /* include/hack.h:1414 NODIAG() — only the grid bug */
        if (reason === DISMOUNT_POLY
            && game.u.umonnum === PMNAMES.PM_GRID_BUG && (j % 1) !== 0)
            continue;
        const cc = { x: 0, y: 0 };
        dirtocoord(cc, j);
        trycc[n].x = cc.x; trycc[n].y = cc.y;
        n++;
    }

    /*
     * Up to three passes;
     * i==0: voluntary dismount without impairment avoids known traps and
     *       boulders;
     * i==1: voluntary dismount with impairment or knocked out of saddle
     *       avoids boulders but allows known traps;
     * i==2: other, allow traps and boulders.
     */
    const impaird = !!(game.u.uprops?.STUNNED
                       || game.u.intrinsic?.HConfusion
                       || game.u.uprops?.CONFUSION
                       || game.u.uprops?.FUMBLING);
    viable = 0;
    for (let i = (reason === DISMOUNT_BYCHOICE && !impaird) ? 0
                 : ((reason === DISMOUNT_BYCHOICE && impaird)
                    || reason === DISMOUNT_KNOCKED) ? 1
                   : 2;
         i <= 2 && !found; ++i) {
        for (j = 0; j < n; ++j) {
            const x = game.u.ux + trycc[j].x;
            const y = game.u.uy + trycc[j].y;
            if (!isok(x, y) || u_at(x, y)) /* [note: u_at() can't happen] */
                continue;

            if (accessible(x, y) && !m_at(x, y) /* MON_AT */
                && await test_move(game.u.ux, game.u.uy,
                                   x - game.u.ux, y - game.u.uy,
                                   TEST_MOVE)) {
                ++viable;
                const distance = distu(x, y);
                if (min_distance < 0 /* no viable candidate yet */
                    || ((best_j === -1) ? (distance < min_distance) : (j < 3))
                    /* or equally good, maybe substitute this one */
                    || (distance === min_distance && !rn2(viable))) {
                    /* traps avoided on pass 0; boulders avoided on 0 and 1 */
                    let t;
                    const kn_trap = i === 0 && ((t = t_at(x, y)) != null
                                                && t.tseen
                                                && t.ttyp !== VIBRATING_SQUARE);
                    const boulder = i <= 1
                        && (sobj_at(ONAMES.BOULDER, x, y)
                            && !throws_rocks(game.youmonst.data));
                    if (!kn_trap && !boulder) {
                        spot.x = x;
                        spot.y = y;
                        min_distance = distance;
                        found = true;
                        if (best_j !== -1 && j < 3)
                            break;
                    }
                }
            }
        }
    }

    /* If we didn't find a good spot and forceit is on, try enexto(). */
    if (forceit && !found)
        found = enexto(spot, game.u.ux, game.u.uy, game.youmonst.data);

    return found;
}

// src/steed.c:576 dismount_steed() — stop riding the current steed. The
// engulfed/bones/thrown terrain-death arms sit on state the port does not
// carry yet and record themselves; the by-choice path used today runs in
// full: landing_spot, saddle-curse check, the no-name message, place the
// steed back on the map, teleds the hero to the landing spot, float_down.
export async function dismount_steed(reason) {
    const cc = { x: 0, y: 0 };
    const save_utrap = game.u.utrap;
    const Wounded_legs = (game.u.intrinsic?.HWounded_legs || 0) > 0
                         || (game.u.EWounded_legs || 0);
    let repair_leg_damage = !!Wounded_legs;
    let have_spot = await landing_spot(cc, reason, 0);

    const mtmp = game.u.usteed; /* make a copy of steed pointer */
    /* Sanity check */
    if (!mtmp) /* Just return silently */
        return;
    game.u.usteed = null;
    const ufly = Flying(), ulev = Levitation();
    let verb = u_locomotion('fall');
    game.u.usteed = mtmp;

    /* Check the reason for dismounting */
    const otmp = which_armor(mtmp, W_SADDLE);
    switch (reason) {
    case DISMOUNT_THROWN:
    case DISMOUNT_KNOCKED:
    case DISMOUNT_FELL: {
        if (reason === DISMOUNT_THROWN)
            verb = 'are thrown';
        await You(`${verb} off of ${mon_nam(mtmp)}!`);
        if (!have_spot)
            have_spot = await landing_spot(cc, reason, 1);
        if (!ulev && !ufly) {
            const damage = rn1(10, 10);
            await losehp(Half_physical_damage() ? Math.trunc((damage + 1) / 2)
                : damage, 'riding accident', KILLED_BY_AN);
            const { set_wounded_legs } = await import('./do.js');
            await set_wounded_legs(LEFT_SIDE | RIGHT_SIDE,
                                   (game.u.intrinsic?.HWounded_legs || 0)
                                       + rn1(5, 5));
            repair_leg_damage = false;
        }
        break;
    }
    case DISMOUNT_POLY:
        await You(`can no longer ride ${mon_nam(game.u.usteed)}.`);
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
            await You(`can't.  The saddle ${otmp.bknown ? 'is' : 'seems to be'} cursed.`);
            otmp.bknown = 1; /* ok to skip set_bknown() here */
            return;
        }
        if (!have_spot) {
            await You("can't.  There isn't anywhere for you to stand.");
            return;
        }
        if (!has_mgivenname(mtmp)) {
            await pline(`You've been through the dungeon on ${an(pmname(mtmp.data, Mgender(mtmp)))} with no name.`);
            if (Hallucination())
                await pline('It felt good to get out of the rain.');
        } else {
            await You(`dismount ${mon_nam(mtmp)}.`);
        }
    }
    /* While riding, Wounded_legs refers to the steed's legs;
       after dismounting, it reverts to the hero's legs. */
    if (repair_leg_damage) {
        const { heal_legs } = await import('./do.js');
        await heal_legs(1);
    }

    /* Release the steed */
    game.u.usteed = null;
    game.u.ugallop = 0;
    const was_stealthy = Stealth();
    steed_vs_stealth();
    if (Stealth() && !was_stealthy)
        await You('seem less noisy now.');

    if (game.u.utraptype === TT_BEARTRAP
        || game.u.utraptype === TT_PIT
        || game.u.utraptype === TT_WEB) {
        mtmp.mtrapped = 1;
    }

    const steedcc = { x: game.u.ux, y: game.u.uy };
    if (m_at(game.u.ux, game.u.uy)) {
        /* hero's spot has a monster in it; hero must have been plucked
           from saddle as engulfer moved into his spot */
        if (!enexto(steedcc, game.u.ux, game.u.uy, mtmp.data)
            && !enexto(steedcc, game.u.ux, game.u.uy, game.mons[PMNAMES.PM_BAT]))
            enexto(steedcc, game.u.ux, game.u.uy, game.mons[PMNAMES.PM_GHOST]);
    }
    if (!DEADMONSTER(mtmp)) {
        game.in_steed_dismounting = (game.in_steed_dismounting || 0) + 1;
        place_monster(mtmp, steedcc.x, steedcc.y);
        game.in_steed_dismounting--;

        if (reason === DISMOUNT_BONES) {
            if (enexto(cc, game.u.ux, game.u.uy, mtmp.data))
                await rloc_to(mtmp, cc.x, cc.y);
            else
                await rloc(mtmp, RLOC_ERR | RLOC_NOMSG);
            return;
        }

        /* Set hero's and/or steed's positions.  Usually try moving the
           hero first. */
        if (!game.u.uswallow && !game.u.ustuck && have_spot) {
            const mdat = mtmp.data;

            /* The steed may drop into water/lava */
            if (grounded(mdat)) {
                if (is_pool(game.u.ux, game.u.uy)) {
                    if (!Underwater())
                        await pline(`${Monnam(mtmp)} falls into the ${surface(game.u.ux, game.u.uy)}!`);
                    if (!cant_drown(mdat)) {
                        await killed(mtmp);
                        adjalign(-1);
                    }
                } else if (is_lava(game.u.ux, game.u.uy)) {
                    await pline(`${Monnam(mtmp)} is pulled into the ${hliquid('lava')}!`);
                    if (!likes_lava(mdat)) {
                        await killed(mtmp);
                        adjalign(-1);
                    }
                }
            }
            /* [ALI] No need to move the player if the steed died. */
            if (!DEADMONSTER(mtmp)) {
                /* Keep steed here, move the player to cc;
                 * teleds() clears u.utrap */
                game.in_steed_dismounting = true;
                await teleds(cc.x, cc.y, TELEDS_ALLOW_DRAG);
                if (sobj_at(ONAMES.BOULDER, cc.x, cc.y))
                    await sokoban_guilt();
                game.in_steed_dismounting = false;

                /* Put your steed in your trap */
                if (save_utrap) {
                    const { mintrap } = await import('./trap.js');
                    await mintrap(mtmp, 0 /* NO_TRAP_FLAGS */);
                }
            }
        /* Couldn't move hero... try moving the steed. */
        } else if (enexto(cc, game.u.ux, game.u.uy, mtmp.data)) {
            /* Keep player here, move the steed to cc */
            await rloc_to(mtmp, cc.x, cc.y);
        /* Otherwise, steed goes bye-bye. */
        } else {
            if (reason === DISMOUNT_BYCHOICE) {
                await killed(mtmp);
                adjalign(-1);
            } else
                await monkilled(mtmp, '', -ATTKS.AD_PHYS);
        }
    } /* !DEADMONST(mtmp) */

    /* usually return the hero to the surface */
    if (reason !== DISMOUNT_ENGULFED && reason !== DISMOUNT_BONES) {
        game.in_steed_dismounting = true;
        const { float_down } = await import('./trap.js');
        await float_down(0, W_SADDLE);
        game.in_steed_dismounting = false;
        (game.disp ||= {}).botl = true;
        await encumber_msg();
        game.vision_full_recalc = 1;
    } else {
        (game.disp ||= {}).botl = true;
    }
    /* polearms behave differently when not mounted */
    if (game.u.uwep && is_pole(game.u.uwep))
        game.unweapon = true;
    return;
}
