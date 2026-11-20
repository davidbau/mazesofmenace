// steed.js -- riding (C ref: steed.c).
//
// Ported so far: doride() and mount_steed() up to the failure checks
// (including slipping while mounting); actually mounting, dismounting
// and everything done while riding are not ported yet.

import { game } from './gstate.js';
import { rnd, rn1 } from './rng.js';
import { pline, You, You_cant } from './display.js';
import { m_at, can_saddle, which_armor } from './makemon.js';
import { isok } from './hacklib.js';
import { near_capacity, test_move, end_running } from './hack.js';
import { getdir } from './cmd.js';
import { mon_nam, Monnam, x_monnam, ARTICLE_A, SUPPRESS_IT,
         SUPPRESS_INVISIBLE, SUPPRESS_HALLUCINATION } from './do_name.js';
import { SLT_ENCUMBER, M_AP_FURNITURE, M_AP_OBJECT, TEST_MOVE, W_SADDLE,
         HALLUC, WOUNDED_LEGS, BLINDED, TELEPAT, CONFUSION, FUMBLING, GLIB,
         LEVITATION, HALF_PHDAM, MAXULEV, STONE_RES } from './const.js';
import { mons, PM_LONG_WORM, PM_KNIGHT, M1_HUMANOID, MZ_SMALL, MZ_LARGE,
         PM_COCKATRICE, PM_CHICKATRICE } from './monsters.js';
import { is_swimmer, is_flyer, is_floater } from './mondata.js';

import { ECMD_OK, ECMD_TIME, ECMD_CANCEL } from './const.js';

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

// C ref: hack.c losehp() -- the not-polymorphed, surviving case
async function losehp(n, knam, k_format) {
    const u = game.u;
    game.disp_botl = true; /* u.uhp or u.mh is changing */
    end_running(true);
    if (Upolyd())
        throw new Error('losehp(): polymorphed hero not ported yet');

    u.uhp -= n;
    /* showdamage(n): the showdamage option isn't ported (default off) */
    if (u.uhp > u.uhpmax)
        u.uhpmax = u.uhp; /* perhaps n was negative */
    if (u.uhp < 1)
        throw new Error('losehp(): death (done(DIED)) not ported yet');
    /* else if (n > 0 && u.uhp * 10 < u.uhpmax) maybe_wail(): */
    if (n > 0 && u.uhp * 10 < u.uhpmax)
        throw new Error('losehp(): maybe_wail() not ported yet');
}

// C ref: steed.c doride() -- the #ride command
export async function doride() {
    const u = game.u;
    let forcemount = false;

    if (u.usteed) {
        throw new Error('doride(): dismount_steed() not ported yet');
    } else if (await getdir(null) && isok(u.ux + u.dx, u.uy + u.dy)) {
        if (game.flags.debug)
            throw new Error('doride(): wizard-mode forced mount query not ported yet');
        return (await mount_steed(m_at(u.ux + u.dx, u.uy + u.dy), forcemount))
               ? ECMD_TIME : ECMD_OK;
    } else {
        return ECMD_CANCEL;
    }
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
    throw new Error('mount_steed(): mounting (maybewakesteed() ...) not ported yet');
}
