// dokick.js -- the #kick command.
// C ref: dokick.c
//
// Ported so far: dokick() for kicking empty space, walls, doors, secret
// doors/corridors and stairs (kick_dumb(), kick_ouch(), kick_door(),
// kick_nondoor() up to the furniture cases, kickstr()).  Kicking monsters
// (maybe_kick_monster()/kick_monster()), objects (kick_object()) and
// furniture (thrones, altars, fountains, graves, trees, sinks) are not
// ported yet.

import { game } from './gstate.js';
import { rn2, rnd, rn1, rnl } from './rng.js';
import { pline, You, You_cant, newsym, unmap_invisible } from './display.js';
import { getdir } from './cmd.js';
import { tty_display_nhwindow } from './wintty.js';
import { isok, IS_DOOR, IS_OBSTRUCTED, IS_STWALL, IS_TREE, IS_THRONE,
         IS_FOUNTAIN, IS_GRAVE, IS_SINK, IS_ALTAR, IS_DRAWBRIDGE, OBJ_AT,
         SDOOR, SCORR, CORR, IRONBARS, STAIRS, LADDER, DBWALL, LAVAWALL,
         D_ISOPEN, D_BROKEN, D_NODOOR, D_TRAPPED, D_LOCKED, LA_DOWN,
         SHOPBASE, TT_PIT, TT_WEB, TT_BEARTRAP, PASSES_WALLS, WOUNDED_LEGS,
         LEVITATION, BLINDED, DEAF, LEG, FOOT, A_STR, A_DEX, A_CON,
         SLT_ENCUMBER, ECMD_OK, ECMD_TIME, ECMD_CANCEL, ECMD_FAIL, KILLED_BY,
         RIGHT_SIDE, LEFT_SIDE, BOTH_SIDES, Is_airlevel, Is_waterlevel } from './const.js';
import { mons, MZ_SMALL, S_LIZARD, PM_SAMURAI, PM_MONK, PM_SASQUATCH, M1_NOLIMBS, M1_SLITHY,
         M2_GIANT } from './monsters.js';
import { BOULDER, KICKING_BOOTS } from './objects.js';
import { m_at, sobj_at, is_pool } from './makemon.js';
import { near_capacity, in_rooms } from './hack.js';
import { ACURR, acurrstr, exercise } from './attrib.js';
import { wake_nearby, wake_nearto } from './mon.js';
import { u_wipe_engr } from './engrave.js';
import { losehp, Maybe_Half_Phys, set_wounded_legs } from './trap.js';
import { body_part } from './insight.js';
import { makeplural } from './objnam.js';
import { recalc_block_point, unblock_point } from './vision.js';
import { cvt_sdoor_to_door } from './detect.js';

/* C ref: youprop.h -- the hero's properties used by the kick code */
function uprop(p) {
    const u = game.u;
    if (!u.uprops[p]) u.uprops[p] = { intrinsic: 0, extrinsic: 0, blocked: 0 };
    return u.uprops[p];
}
function uhave(p) { return !!(uprop(p).intrinsic || uprop(p).extrinsic); }
function Blind() { return uhave(BLINDED) && !uprop(BLINDED).blocked; }
function Levitation() { return uhave(LEVITATION) && !uprop(LEVITATION).blocked; }
function Passes_walls() { return uhave(PASSES_WALLS); }
function Wounded_legs() { return uhave(WOUNDED_LEGS); }
function Deaf() { return uhave(DEAF) || !!game.u.uroleplay?.deaf; }
function Upolyd() { return game.u.umonnum !== game.u.umonster; }
function Role_if(pm) { return game.urole.mnum === pm; }
/* C ref: mondata.h nolimbs(), slithy(), verysmall(), is_giant() */
function nolimbs(ptr) { return (ptr.mflags1 & M1_NOLIMBS) === M1_NOLIMBS; }
function slithy(ptr) { return (ptr.mflags1 & M1_SLITHY) !== 0; }
function verysmall(ptr) { return ptr.msize < MZ_SMALL; }
function is_giant(ptr) { return (ptr.mflags2 & M2_GIANT) !== 0; }
/* C ref: skills.h martial_bonus(); dokick.c is_bigfoot(), martial() */
function martial_bonus() { return Role_if(PM_SAMURAI) || Role_if(PM_MONK); }
function is_bigfoot(x) { return x === mons[PM_SASQUATCH]; }
function martial() {
    return martial_bonus() || is_bigfoot(game.youmonst.data)
        || !!(game.uarmf && game.uarmf.otyp === KICKING_BOOTS);
}

/* C ref: decl.c gm.maploc, gn.nowhere -- the location being kicked */
const nowhere = { typ: 0 };

// C ref: do.c legs_in_no_shape()
export async function legs_in_no_shape(for_what, /* jumping, kicking, riding */
                                       by_steed) {
    if (by_steed && game.u.usteed) {
        throw new Error('legs_in_no_shape(): steed message not ported yet');
    } else {
        const wl = (uprop(WOUNDED_LEGS).extrinsic & BOTH_SIDES);
        let bp = body_part(LEG);

        if (wl === BOTH_SIDES)
            bp = makeplural(bp);
        await pline(`Your ${(wl === LEFT_SIDE) ? "left "
                            : (wl === RIGHT_SIDE) ? "right " : ""}${bp} ${
            (wl === BOTH_SIDES) ? "are" : "is"} in no shape for ${for_what}.`);
    }
}

// C ref: dokick.c kickstr()
function kickstr(kickobjnam) {
    const maploc = game.maploc;
    let what;

    if (kickobjnam)
        what = kickobjnam;
    else if (maploc === nowhere)
        what = "nothing";
    else if (IS_DOOR(maploc.typ))
        what = "a door";
    else if (IS_TREE(maploc.typ))
        what = "a tree";
    else if (IS_STWALL(maploc.typ))
        what = "a wall";
    else if (IS_OBSTRUCTED(maploc.typ))
        what = "a rock";
    else if (IS_THRONE(maploc.typ))
        what = "a throne";
    else if (IS_FOUNTAIN(maploc.typ))
        what = "a fountain";
    else if (IS_GRAVE(maploc.typ))
        what = "a headstone";
    else if (IS_SINK(maploc.typ))
        what = "a sink";
    else if (IS_ALTAR(maploc.typ))
        what = "an altar";
    else if (IS_DRAWBRIDGE(maploc.typ))
        what = "a drawbridge";
    else if (maploc.typ === STAIRS)
        what = "the stairs";
    else if (maploc.typ === LADDER)
        what = "a ladder";
    else if (maploc.typ === IRONBARS)
        what = "an iron bar";
    else
        what = "something weird";
    return `kicking ${what}`;
}

// C ref: dokick.c kick_dumb()
async function kick_dumb(x, y) {
    exercise(A_DEX, false);
    if (martial() || ACURR(A_DEX) >= 16 || rn2(3)) {
        await You("kick at empty space.");
        if (Blind())
            throw new Error('kick_dumb(): feel_location() not ported yet');
    } else {
        await pline("Dumb move!  You strain a muscle.");
        exercise(A_STR, false);
        await set_wounded_legs(RIGHT_SIDE, 5 + rnd(5));
    }
    if ((Is_airlevel(game.u.uz) || Levitation()) && rn2(2))
        throw new Error('kick_dumb(): hurtle() not ported yet');
    void x; void y;
}

// C ref: dokick.c kick_ouch()
async function kick_ouch(x, y, kickobjnam) {
    let dmg;

    await pline("Ouch!  That hurts!");
    exercise(A_DEX, false);
    exercise(A_STR, false);
    if (isok(x, y)) {
        if (Blind())
            throw new Error('kick_ouch(): feel_location() not ported yet');
        /* is_drawbridge_wall(x, y) >= 0 */
        if (game.level.at(x, y).typ === DBWALL)
            throw new Error('kick_ouch(): is_drawbridge_wall() not ported yet');
        await wake_nearto(x, y, 5 * 5);
    }
    if (!rn2(3))
        await set_wounded_legs(RIGHT_SIDE, 5 + rnd(5));
    dmg = rnd(ACURR(A_CON) > 15 ? 3 : 5);
    await losehp(Maybe_Half_Phys(dmg), kickstr(kickobjnam), KILLED_BY);
    if (Is_airlevel(game.u.uz) || Levitation())
        throw new Error('kick_ouch(): hurtle() not ported yet'); /* rn1(2, 4) */
}

// C ref: dokick.c kick_door()
/* kick a door */
async function kick_door(x, y, avrg_attrib) {
    const maploc = game.maploc;
    let doorbuster;

    if (maploc.doormask === D_ISOPEN || maploc.doormask === D_BROKEN
        || maploc.doormask === D_NODOOR) {
        await kick_dumb(x, y);
        return; /* uses a turn */
    }

    /* not enough leverage to kick open doors while levitating */
    if (Levitation()) {
        await kick_ouch(x, y, "");
        return;
    }

    exercise(A_DEX, true);
    doorbuster = Upolyd() && is_giant(game.youmonst.data);
    /* door is known to be CLOSED or LOCKED */
    if (doorbuster
        || (rnl(35) < avrg_attrib + (!martial() ? 0 : ACURR(A_DEX)))) {
        const shopdoor = in_rooms(x, y, SHOPBASE).length > 0;

        /* break the door */
        if (maploc.doormask & D_TRAPPED) {
            throw new Error('kick_door(): b_trapped() not ported yet');
        } else if (ACURR(A_STR) > 18 && !rn2(5) && !shopdoor) {
            /* Soundeffect(se_kick_door_it_shatters, 50) */
            await pline("As you kick the door, it shatters to pieces!");
            exercise(A_STR, true);
            maploc.doormask = D_NODOOR;
        } else {
            /* Soundeffect(se_kick_door_it_crashes_open, 50) */
            await pline("As you kick the door, it crashes open!");
            exercise(A_STR, true);
            maploc.doormask = D_BROKEN;
        }
        /* feel_newsym(x, y): we know we broke it */
        if (Blind())
            throw new Error('kick_door(): feel_location() not ported yet');
        newsym(x, y);
        recalc_block_point(x, y); /* vision */
        if (shopdoor)
            throw new Error('kick_door(): add_damage()/pay_for_damage() not ported yet');
        if (in_town(x, y))
            throw new Error('kick_door(): watchman_thief_arrest() not ported yet');
    } else {
        if (Blind())
            throw new Error('kick_door(): feel_location() not ported yet');
        exercise(A_STR, true);
        /* note: this used to be unconditional "WHAMMM!!!" but that has a
           fairly strong connotation of noise that a deaf hero shouldn't
           hear; we've kept the extra 'm's and one of the extra '!'s */
        await pline(`${(Deaf() || !rn2(3)) ? "Thwack" : "Whammm"}!!`);
        if (in_town(x, y))
            throw new Error('kick_door(): watchman_door_damage() not ported yet');
    }
}

/* C ref: hack.c in_town() -- a town only exists on special levels
   (has_town); the town room check isn't ported */
function in_town(x, y) {
    void x; void y;
    if (!game.level.flags.has_town)
        return false;
    throw new Error('in_town(): town rooms not ported yet');
}

// C ref: dokick.c kick_nondoor()
/* kick non-door terrain */
async function kick_nondoor(x, y, avrg_attrib) {
    const maploc = game.maploc;

    if (maploc.typ === SDOOR) {
        if (!Levitation() && rn2(30) < avrg_attrib) {
            cvt_sdoor_to_door(maploc); /* ->typ = DOOR */
            /* Soundeffect(se_crash_door, 40) */
            await pline(`Crash!  ${
                /* don't "kick open" when it's locked
                   unless it also happens to be trapped */
                ((maploc.doormask & (D_LOCKED | D_TRAPPED)) === D_LOCKED)
                    ? "Your kick uncovers" : "You kick open"} a secret door!`);
            exercise(A_DEX, true);
            if (maploc.doormask & D_TRAPPED) {
                throw new Error('kick_nondoor(): b_trapped() not ported yet');
            } else if (maploc.doormask !== D_NODOOR
                       && !(maploc.doormask & D_LOCKED))
                maploc.doormask = D_ISOPEN;
            /* feel_newsym(x, y): we know it's gone */
            if (Blind())
                throw new Error('kick_nondoor(): feel_location() not ported yet');
            newsym(x, y);
            if (maploc.doormask === D_ISOPEN
                || maploc.doormask === D_NODOOR)
                unblock_point(x, y); /* vision */
            return ECMD_TIME;
        } else {
            await kick_ouch(x, y, "");
            return ECMD_TIME;
        }
    }
    if (maploc.typ === SCORR) {
        if (!Levitation() && rn2(30) < avrg_attrib) {
            /* Soundeffect(se_crash_door, 40) */
            await pline("Crash!  You kick open a secret passage!");
            exercise(A_DEX, true);
            maploc.typ = CORR;
            /* feel_newsym(x, y): we know it's gone */
            if (Blind())
                throw new Error('kick_nondoor(): feel_location() not ported yet');
            newsym(x, y);
            unblock_point(x, y); /* vision */
            return ECMD_TIME;
        } else {
            await kick_ouch(x, y, "");
            return ECMD_TIME;
        }
    }
    if (IS_THRONE(maploc.typ))
        throw new Error('kick_nondoor(): kicking a throne not ported yet');
    if (IS_ALTAR(maploc.typ))
        throw new Error('kick_nondoor(): kicking an altar not ported yet');
    if (IS_FOUNTAIN(maploc.typ))
        throw new Error('kick_nondoor(): kicking a fountain not ported yet');
    if (IS_GRAVE(maploc.typ))
        throw new Error('kick_nondoor(): kicking a grave not ported yet');
    if (maploc.typ === IRONBARS) {
        await kick_ouch(x, y, "");
        return ECMD_TIME;
    }
    if (IS_TREE(maploc.typ))
        throw new Error('kick_nondoor(): kicking a tree not ported yet');
    if (IS_SINK(maploc.typ))
        throw new Error('kick_nondoor(): kicking a sink not ported yet');
    if (maploc.typ === STAIRS || maploc.typ === LADDER
        || IS_STWALL(maploc.typ)) {
        if (!IS_STWALL(maploc.typ) && maploc.ladder === LA_DOWN) {
            await kick_dumb(x, y);
            return ECMD_TIME;
        }
        await kick_ouch(x, y, "");
        return ECMD_TIME;
    }
    await kick_dumb(x, y);
    return ECMD_TIME;
}

// C ref: dokick.c dokick()
/* the #kick command */
export async function dokick() {
    const g = game;
    const u = g.u;
    let x, y;
    let avrg_attrib;
    let mtmp;
    let no_kick = false;

    if (nolimbs(g.youmonst.data) || slithy(g.youmonst.data)) {
        await You("have no legs to kick with.");
        no_kick = true;
    } else if (verysmall(g.youmonst.data)) {
        await You("are too small to do any kicking.");
        no_kick = true;
    } else if (u.usteed) {
        throw new Error('dokick(): kicking your steed not ported yet');
    } else if (Wounded_legs()) {
        await legs_in_no_shape("kicking", false);
        no_kick = true;
    } else if (near_capacity() > SLT_ENCUMBER) {
        await pline("Your load is too heavy to balance yourself for a kick.");
        no_kick = true;
    } else if (g.youmonst.data.mlet === S_LIZARD) {
        await pline("Your legs cannot kick effectively.");
        no_kick = true;
    } else if (u.uinwater && !rn2(2)) {
        await pline("Your slow motion kick doesn't hit anything.");
        no_kick = true;
    } else if (u.utrap) {
        no_kick = true;
        switch (u.utraptype) {
        case TT_PIT:
            if (!Passes_walls())
                await pline("There's not enough room to kick down here.");
            else
                no_kick = false;
            break;
        case TT_WEB:
        case TT_BEARTRAP:
            await You_cant(`move your ${body_part(LEG)}!`);
            break;
        default:
            break;
        }
    } else if (sobj_at(BOULDER, u.ux, u.uy) && !Passes_walls()) {
        await pline("There's not enough room to kick in here.");
        no_kick = true;
    }

    if (no_kick) {
        /* ignore direction typed before player notices kick failed */
        await tty_display_nhwindow(g.WIN_MESSAGE, true); /* --More-- */
        return ECMD_FAIL;
    }

    if (!await getdir(null))
        return ECMD_CANCEL;
    if (!u.dx && !u.dy)
        return ECMD_CANCEL;

    x = u.ux + u.dx;
    y = u.uy + u.dy;
    g.kickedloc = { x, y };

    /* KMH -- Kicking boots always succeed */
    if (g.uarmf && g.uarmf.otyp === KICKING_BOOTS)
        avrg_attrib = 99;
    else
        avrg_attrib = Math.trunc((acurrstr() + ACURR(A_DEX) + ACURR(A_CON)) / 3);

    if (u.uswallow) {
        throw new Error('dokick(): kicking while engulfed not ported yet');
    } else if (u.utrap && u.utraptype === TT_PIT) {
        /* must be Passes_walls */
        await You("kick at the side of the pit.");
        return ECMD_TIME;
    }
    if (Levitation()) {
        throw new Error('dokick(): bracing while levitating not ported yet');
    }

    mtmp = isok(x, y) ? m_at(x, y) : null;
    /* might not kick monster if it is hidden and becomes revealed,
       if it is peaceful and player declines to attack, or if the
       hero passes out due to encumbrance with low hp; svc.context.move
       will be 1 unless player declines to kick peaceful monster */
    if (mtmp) {
        /* maybe_kick_monster() needs attack_checks() */
        throw new Error('dokick(): maybe_kick_monster() not ported yet');
    }

    await wake_nearby(false);
    u_wipe_engr(2);

    if (!isok(x, y)) {
        g.maploc = nowhere;
        await kick_ouch(x, y, "");
        return ECMD_TIME;
    }
    g.maploc = g.level.at(x, y);

    /*
     * The next five tests should stay in their present order:
     * monsters, pools, objects, non-doors, doors.
     */

    unmap_invisible(x, y);
    if ((is_pool(x, y) || g.maploc.typ === LAVAWALL) !== !!u.uinwater) {
        throw new Error('dokick(): splashing water or lava not ported yet');
    }

    if (OBJ_AT(x, y) && (!Levitation() || Is_airlevel(u.uz)
                         || Is_waterlevel(u.uz) || sobj_at(BOULDER, x, y))) {
        throw new Error('dokick(): kick_object() not ported yet');
    }

    if (IS_DOOR(g.maploc.typ))
        await kick_door(x, y, avrg_attrib);
    else
        return await kick_nondoor(x, y, avrg_attrib);
    return ECMD_TIME;
}
