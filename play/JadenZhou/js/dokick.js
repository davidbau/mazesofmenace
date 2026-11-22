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
import { in_town } from './hack.js';
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
import { Is_container, weight, obj_extract_self } from './mkobj.js';
import { Has_contents, WEB, STATUE_TRAP, is_pit, STONE_RES, FUMBLING, ZAP_POS, LOW_PM } from './const.js';
import { BAG_OF_HOLDING, BAG_OF_TRICKS, objects, GLASS, GEM_CLASS, EGG, MIRROR, CORPSE, COIN_CLASS, LARGE_BOX, CHEST } from './objects.js';
import { shop_keeper, costly_spot, onshopbill, costly_adjacent } from './shk.js';
import { obj_resists } from './dogmove.js';
import { change_luck } from './attrib.js';
import { You_hear } from './sounds.js';
import { useup, obfree } from './invent.js';
import { killer_xname } from './mthrowu.js';
import { breaktest } from './dothrow.js';
import { t_at, chest_trap } from './trap.js';
import { PM_COCKATRICE, PM_CHICKATRICE } from './monsters.js';
import { is_ice } from './dig.js';
import { ART_MJOLLNIR } from './artilist.js';
import { closed_door } from './makemon.js';
import { Norep, Your, pline_The } from './display.js';
import { singular, doname, The, distant_name, xname, otense } from './objnam.js';
import { breakchestlock } from './lock.js';
import { addtobill } from './shk.js';
import { flooreffects, impact_disturbs_zombies } from './do.js';
import { place_object } from './mkobj.js';
import { stackobj } from './invent.js';
import { attack_checks } from './uhitm.js';
import { overexertion } from './hack.js';
import { canspotmon, canseemon } from './display.js';
import { wakeup, setmangry } from './mon.js';
import { mpickobj } from './steal.js';
import { miss } from './zap.js';
import { Monnam, mon_nam } from './do_name.js';
import { cansee } from './vision.js';
import { M2_GREEDY, M2_MERC, S_MIMIC } from './monsters.js';
import { M_AP_NOTHING } from './const.js';

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
// C ref: dokick.c ghitm()
/*
 *  Return TRUE if caught (the gold taken care of), FALSE otherwise.
 *  The gold object is *not* attached to the fobj chain!
 */
export async function ghitm(mtmp, gold) {
    let msg_given = false;

    if (!likes_gold(mtmp.data) && !mtmp.isshk && !mtmp.ispriest
        && !mtmp.isgd && !is_mercenary(mtmp.data)) {
        await wakeup(mtmp, true);
    } else if (!mtmp.mcanmove) {
        /* too light to do real damage */
        if (canseemon(mtmp)) {
            await pline_The(`${xname(gold)} harmlessly ${otense(gold, "hit")} ${
                             mon_nam(mtmp)}.`);
            msg_given = true;
        }
    } else {
        const was_sleeping = mtmp.msleeping;

        mtmp.msleeping = 0; /* end indeterminate sleep */
        finish_meating(mtmp);
        if (!mtmp.isgd && !rn2(4)) /* not always pleasing */
            await setmangry(mtmp, true);
        /* greedy monsters catch gold */
        if (cansee(mtmp.mx, mtmp.my))
            await pline(`${Monnam(mtmp)} ${was_sleeping ? "awakens and " : ""
                         }catches the gold.`);
        if (mtmp.isshk || mtmp.ispriest || mtmp.isgd || is_mercenary(mtmp.data))
            throw new Error('ghitm(): gold caught by a shopkeeper/priest/guard/mercenary not ported yet');
        /* (void) */ mpickobj(mtmp, gold);
        gold = null; /* obj has been freed */
        return true;
    }

    if (!msg_given)
        await miss(xname(gold), mtmp);
    return false;
}

/* C ref: mondata.h likes_gold(), is_mercenary() */
function likes_gold(ptr) { return (ptr.mflags2 & M2_GREEDY) !== 0; }
function is_mercenary(ptr) { return (ptr.mflags2 & M2_MERC) !== 0; }

// C ref: dogmove.c finish_meating()
function finish_meating(mtmp) {
    mtmp.meating = 0;
    if ((mtmp.m_ap_type || 0) !== M_AP_NOTHING && mtmp.data.mlet !== S_MIMIC) {
        /* was eating a mimic and now appearance needs resetting */
        mtmp.m_ap_type = M_AP_NOTHING;
        mtmp.mappearance = 0;
        newsym(mtmp.mx, mtmp.my);
    }
}

// C ref: dokick.c maybe_kick_monster()
async function maybe_kick_monster(mon, x, y) {
    if (mon) {
        const save_forcefight = game.context.forcefight;

        game.bhitpos = { x, y };
        if (!mon.mpeaceful || !canspotmon(mon))
            game.context.forcefight = true; /* attack even if invisible */
        /* kicking might be halted by discovery of hidden monster,
           by player declining to attack peaceful monster,
           or by passing out due to encumbrance */
        if (await attack_checks(mon, null) || await overexertion())
            mon = null; /* don't kick after all */
        game.context.forcefight = save_forcefight;
    }
    return mon != null;
}

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
        /* oldglyph = glyph_at(x, y): used after kick_monster() */
        if (!await maybe_kick_monster(mtmp, x, y))
            return (g.context.move ? ECMD_TIME : ECMD_OK);
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

    if (mtmp) {
        /* save mtmp->data (for recoil) in case mtmp gets killed */
        throw new Error('dokick(): kick_monster() not ported yet');
    }

    unmap_invisible(x, y);
    if ((is_pool(x, y) || g.maploc.typ === LAVAWALL) !== !!u.uinwater) {
        throw new Error('dokick(): splashing water or lava not ported yet');
    }

    if (OBJ_AT(x, y) && (!Levitation() || Is_airlevel(u.uz)
                         || Is_waterlevel(u.uz) || sobj_at(BOULDER, x, y))) {
        const kickobjnam = { val: '' };

        if (await kick_object(x, y, kickobjnam)) {
            if (Is_airlevel(u.uz))
                throw new Error('dokick(): hurtle() not ported yet'); /* assume it's light */
            return ECMD_TIME;
        }
        /* goto ouch; */
        await kick_ouch(x, y, kickobjnam.val);
        return ECMD_TIME;
    }

    if (IS_DOOR(g.maploc.typ))
        await kick_door(x, y, avrg_attrib);
    else
        return await kick_nondoor(x, y, avrg_attrib);
    return ECMD_TIME;
}

// C ref: dokick.c container_impact_dmg()
export async function container_impact_dmg(obj,
                                           x, /* coordinates where object was */
                                           y) { /* before the impact, not after */
    const u = game.u;
    let shkp;
    const loss = 0;
    let costly, wchange = false;

    /* only consider normal containers */
    if (!Is_container(obj) || !Has_contents(obj)
        || obj.otyp === BAG_OF_HOLDING || obj.otyp === BAG_OF_TRICKS) /* Is_mbag */
        return;

    const rooms = in_rooms(x, y, SHOPBASE);
    costly = !!((shkp = shop_keeper(rooms.length ? rooms.charCodeAt(0) : 0))
                && costly_spot(x, y));
    /* if dropped or thrown, shop ownership flags are set on this obj */
    void u;

    for (const otmp of obj.cobj.slice()) {
        let result = null;

        if (objects[otmp.otyp].oc_material === GLASS
            && otmp.oclass !== GEM_CLASS && !obj_resists(otmp, 33, 100)) {
            result = "shatter";
        } else if (otmp.otyp === EGG && !rn2(3)) {
            result = "cracking";
        }
        if (result) {
            if (otmp.otyp === MIRROR)
                change_luck(-2);

            /* eggs laid by you.  penalty is -1 per egg, max 5,
             * but it's always exactly 1 that breaks */
            if (otmp.otyp === EGG && otmp.spe && otmp.corpsenm >= LOW_PM)
                change_luck(-1);
            await You_hear(`a muffled ${result}.`);
            if (costly)
                throw new Error('container_impact_dmg(): stolen_value() not ported yet');
            if (otmp.quan > 1) {
                useup(otmp);
            } else {
                obj_extract_self(otmp);
                obfree(otmp, null);
            }
            /* contents of this container are no longer known */
            obj.cknown = 0;
            wchange = true;
        }
    }
    if (wchange)
        obj.owt = weight(obj);
    void loss;
}

// C ref: dokick.c kick_object() -- jacket around really_kick_object;
// 'kickobjnam' is a { val } holder for C's char buffer
async function kick_object(x, y, kickobjnam) {
    let res = 0;

    kickobjnam.val = '';
    /* if a pile, the "top" object gets kicked */
    game.kickedobj = objects_at_top(x, y);
    if (game.kickedobj) {
        /* formatted object name matters iff res==0 */
        kickobjnam.val = killer_xname(game.kickedobj);
        /* kick object; if fatal, done() will clean up kickedobj */
        res = await really_kick_object(x, y);
        game.kickedobj = null;
    }
    return res;
}

/* C ref: display.h level.objects[x][y] -- the top object of the pile */
function objects_at_top(x, y) {
    for (const o of game.level?.objects || [])
        if (o.ox === x && o.oy === y && o.where === 'OBJ_FLOOR')
            return o;
    return null;
}

// C ref: shk.c find_objowner()
function find_objowner(obj, x, y) {
    let shkp, deflt_shkp = null;

    if (obj.where === 'OBJ_ONBILL')
        throw new Error('find_objowner(): used-up bill object not ported yet');
    const where = in_rooms(x, y, SHOPBASE);

    /* conceptually object could be inside up to 4 rooms simultaneously;
       in practice it will usually be one room but can sometimes be two;
       check shk and bill for each room rather than just the first;
       fallback to the first shk if obj isn't on the relevant bill(s) */
    for (let i = 0; i < where.length; i++)
        if ((shkp = shop_keeper(where.charCodeAt(i))) != null) {
            if (onshopbill(obj, shkp, true))
                return shkp;
            if (!deflt_shkp)
                deflt_shkp = shkp;
        }
    return deflt_shkp;
}

// C ref: dothrow.c hero_breaks() -- the "doesn't break" outcome; breaking
// (breakmsg(), breakobj()) is not ported yet
async function hero_breaks(obj, x, y, breakflags) {
    void x; void y; void breakflags;
    /* only call breaktest if caller hasn't already specified the outcome */
    if (!breaktest(obj))
        return false;
    throw new Error('hero_breaks(): breakmsg()/breakobj() not ported yet');
}

// C ref: dokick.c really_kick_object() -- guts of kick_object
async function really_kick_object(x, y) {
    const u = game.u;
    let range;
    let shkp = null;
    let trap;
    let costly, isgold, slide = false;
    const kobj = game.kickedobj;

    /* gk.kickedobj should always be set due to conditions of call */
    if (!kobj || kobj.otyp === BOULDER
        || kobj === game.uball || kobj === game.uchain)
        return 0;

    if ((trap = t_at(x, y)) != null) {
        if ((is_pit(trap.ttyp) && !Passes_walls()) || trap.ttyp === WEB)
            throw new Error('really_kick_object(): object in a pit or web not ported yet');
        if (trap.ttyp === STATUE_TRAP)
            throw new Error('really_kick_object(): activate_statue_trap() not ported yet');
    }

    if (uhave(FUMBLING) && !rn2(3)) {
        await Your("clumsy kick missed.");
        return 1;
    }

    if (!game.uarmf && kobj.otyp === CORPSE
        && (kobj.corpsenm === PM_COCKATRICE || kobj.corpsenm === PM_CHICKATRICE)
        && !uhave(STONE_RES))
        throw new Error('really_kick_object(): kicking a cockatrice corpse barefoot not ported yet');

    isgold = (kobj.oclass === COIN_CLASS);
    {
        let k_owt = kobj.owt;

        /* for non-gold stack, 1 item will be split off below (unless an
           early return occurs, so we aren't moving the split to here);
           calculate the range for that 1 rather than for the whole stack */
        if (kobj.quan > 1 && !isgold) {
            const save_quan = kobj.quan;

            kobj.quan = 1;
            k_owt = weight(kobj);
            kobj.quan = save_quan;
        }

        /* range < 2 means the object will not move
           (maybe dexterity should also figure here) */
        range = Math.trunc(acurrstr() / 2) - Math.trunc(k_owt / 40);
    }

    if (martial())
        range += rnd(3);

    if (is_pool(x, y)) {
        /* you're in the water too; significantly reduce range */
        range = Math.trunc(range / 3) + 1; /* {1,2}=>1, {3,4,5}=>2, {6,7,8}=>3 */
    } else if (Is_airlevel(u.uz) || Is_waterlevel(u.uz)) {
        /* you're in air, since is_pool did not match */
        range += rnd(3);
    } else {
        if (is_ice(x, y))
            range += rnd(3), slide = true;
        if (kobj.greased)
            range += rnd(3), slide = true;
    }

    /* Mjollnir is magically too heavy to kick */
    if (kobj.oartifact === ART_MJOLLNIR)
        range = 1;

    /* see if the object has a place to move into */
    if (!isok(x + u.dx, y + u.dy)
        || !ZAP_POS(game.level.at(x + u.dx, y + u.dy).typ)
        || closed_door(x + u.dx, y + u.dy))
        range = 1;

    /* 5.0: this used to skip 'costly' handling if kickedobj->no_charge
       was set but that optimization could result in no_charge staying set
       for objects kicked out of the shop */
    shkp = find_objowner(kobj, x, y);
    costly = !!(shkp && (costly_spot(x, y) || (costly_adjacent(shkp, x, y)
                                                && kobj.unpaid)));
    /* 5.0: give feedback about the item being kicked; some follow-on
       messages refer to "it" */
    await Norep(`You kick ${!isgold ? singular(kobj, doname) : doname(kobj)}.`);

    if (IS_OBSTRUCTED(game.level.at(x, y).typ) || closed_door(x, y)) {
        if ((!martial() && rn2(20) > ACURR(A_DEX))
            || IS_OBSTRUCTED(game.level.at(u.ux, u.uy).typ)
            || closed_door(u.ux, u.uy)) {
            if (Blind())
                await pline("It doesn't come loose.");
            else
                await pline(`${The(distant_name(kobj, xname))} ${otense(kobj, "do")}n't come loose.`);
            return (!rn2(3) || martial()) ? 1 : 0;
        }
        if (Blind())
            await pline("It comes loose.");
        else
            await pline(`${The(distant_name(kobj, xname))} ${otense(kobj, "come")} loose.`);
        obj_extract_self(kobj);
        newsym(x, y);
        /* strchr(u.urooms, '\0') finds the terminator, so an empty
           in_rooms() result counts as found */
        const r0 = in_rooms(x, y, SHOPBASE).charAt(0);
        if (costly && (!costly_spot(u.ux, u.uy)
                       || !(r0 === '' || (u.urooms || '').includes(r0)))) {
            if (!kobj.no_charge)
                await addtobill(kobj, false, false, false);
            else /* don't leave no_charge set when outside shop */
                kobj.no_charge = 0;
        }
        if (!(await flooreffects(kobj, u.ux, u.uy, "fall"))) {
            place_object(kobj, u.ux, u.uy);
            impact_disturbs_zombies(kobj, true);
            stackobj(kobj);
            newsym(u.ux, u.uy);
        }
        return 1;
    }

    /* a box gets a chance of breaking open here */
    if (kobj.otyp === LARGE_BOX || kobj.otyp === CHEST) { /* Is_box */
        const otrp = kobj.otrapped;

        if (range < 2)
            await pline("THUD!");
        await container_impact_dmg(kobj, x, y);
        if (kobj.olocked) {
            if (!rn2(5) || (martial() && !rn2(2))) {
                await You("break open the lock!");
                await breakchestlock(kobj, false);
                if (otrp)
                    await chest_trap(kobj, LEG, false);
                return 1;
            }
        } else {
            if (!rn2(3) || (martial() && !rn2(2))) {
                await pline_The("lid slams open, then falls shut.");
                kobj.lknown = 1;
                if (otrp)
                    await chest_trap(kobj, LEG, false);
                return 1;
            }
        }
        if (range < 2)
            return 1;
        /* else let it fall through to the next cases... */
    }

    /* fragile objects should not be kicked */
    if (await hero_breaks(kobj, kobj.ox, kobj.oy, 0))
        return 1;

    /* too heavy to move.  range is calculated as potential distance from
     * player, so range == 2 means the object may move up to one square
     * from its current position
     */
    if (range < 2) {
        if (!(kobj.otyp === LARGE_BOX || kobj.otyp === CHEST))
            await pline("Thump!");
        return (!rn2(3) || martial()) ? 1 : 0;
    }

    if (kobj.quan > 1 && isgold)
        throw new Error('really_kick_object(): kicking a stack of coins (scatter()) not ported yet');
    void slide; void costly;
    throw new Error('really_kick_object(): kicked object flight (bhit(KICKED_WEAPON)) not ported yet');
}
