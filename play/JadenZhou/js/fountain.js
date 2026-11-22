// fountain.js -- drinking from and dipping into fountains and sinks.
// C ref: fountain.c
//
// Ported: floating_above(), dowatersnakes(), dowaterdemon(),
// dowaternymph(), dogushforth(), gush(), dofindgem(),
// watchman_warn_fountain(), dryup(), drinkfountain(), dipfountain(),
// wash_hands(), breaksink(), drinksink(), dipsink(), sink_backs_up().
// Paths that reach unported code throw 'not ported yet'.

import { game } from './gstate.js';
import { rn2, rnd, rn1 } from './rng.js';
import { pline, You, Your, You_feel, You_see, pline_The, newsym,
         canspotmon, glyph_at, Hallucination as Hallucination_d,
         Blind as Blind_d } from './display.js';
import { You_hear, get_iter_mons } from './sounds.js';
import { tty_display_nhwindow, tty_yn_function } from './wintty.js';
import { makemon } from './makemon.js';
import { sobj_at, m_at } from './makemon.js';
import { t_at, mintrap, losehp, water_damage, water_damage_chain,
         delfloortrap } from './trap.js';
import { makeplural, xname } from './objnam.js';
import { rndmonnam, a_monnam, Amonnam } from './do_name.js';
import { mhis } from './mhitu.js';
import { level_difficulty, dunlev, dunlevs_in_dungeon } from './dungeon.js';
import { mongrantswish, fruitname, hliquid, make_glib, dopotion,
         potionbreathe, trycall } from './potion.js';
import { distmin } from './hacklib.js';
import { do_clear_area_async, couldsee, cansee } from './vision.js';
import { set_levltyp } from './mkmaze.js';
import { del_engr_at } from './engrave.js';
import { minliquid, angry_guards } from './mon.js';
import { mksobj_at, mkobj_at, mkobj, rnd_class, curse, uncurse, bless,
         mkgold } from './mkobj.js';
import { exercise, adjattrib, poison_strdmg, ACURR } from './attrib.js';
import { in_town } from './hack.js';
import { mbodypart } from './shk.js';
import { newuhs, morehungry, vomit } from './eat.js';
import { body_part, enlightenment } from './insight.js';
import { surface } from './iactions.js';
import { monflee } from './monmove.js';
import { exist_artifact, artiname, discover_artifact } from './artifact.js';
import { oname } from './do_name.js';
import { money_cnt } from './u_init.js';
import { somegold } from './steal.js';
import { delobj, obfree, useup, hands_obj } from './invent.js';
import { fingers_or_gloves } from './do_wear.js';
import { monstseesu, monstunseesu } from './uhitm.js';
import { more_experienced, newexplevel } from './exper.js';
import { create_gas_cloud, S_cloud } from './region.js';
import { observe_object } from './o_init.js';
import { the } from './iactions.js';
import { genders } from './role.js';
import { pronoun_gender } from './do_name.js';
import { nexttodoor } from './mklev.js';
import { haseyes } from './mondata.js';
import { ART_EXCALIBUR } from './artilist.js';
import * as M from './monsters.js';
import { mons, PM_WATER_MOCCASIN, PM_WATER_DEMON, PM_WATER_NYMPH,
         PM_SEWER_RAT, PM_WATER_ELEMENTAL, PM_KNIGHT,
         PM_WATCHMAN, PM_WATCH_CAPTAIN } from './monsters.js';
import { objects, POTION_CLASS, RING_CLASS, COIN_CLASS, LONG_SWORD,
         DILITHIUM_CRYSTAL, LUCKSTONE, BOULDER, POT_WATER, POT_POLYMORPH,
         POT_OIL, POT_ACID, POT_LEVITATION, POT_OBJECT_DETECTION,
         POT_GAIN_LEVEL, POT_GAIN_ENERGY, POT_MONSTER_DETECTION,
         POT_FRUIT_JUICE, OBJ_DESCR } from './objects.js';
import { G_GONE, NO_TRAP_FLAGS, MM_NOMSG, TT_INFLOOR, TT_LAVA, A_MAX,
         A_WIS, A_CON, A_DEX, A_LAWFUL, ROOM, POOL, FOUNTAIN, IS_FOUNTAIN,
         F_LOOTED, F_WARNED, S_LRING, HEAD, ARM, HAND, FACE,
         MAGICENLIGHTENMENT, ENL_GAMEINPROGRESS, KILLED_BY, KILLED_BY_AN,
         ER_NOTHING, ER_GREASED, ER_DESTROYED, M_SEEN_FIRE, SEE_INVIS,
         FROMOUTSIDE, LEVITATION, BLINDED, HALLUC, HALLUC_RES, DEAF,
         INVIS, POISON_RES, FIRE_RES, UNCHANGING, GLIB, ONAME_VIA_DIP,
         ONAME_KNOW_ARTI, PRONOUN_HALLU } from './const.js';

/* C ref: youprop.h -- the property macros used here */
function uprop(p) { return game.u.uprops[p]; }
function Blind() { return Blind_d(); }
function Hallucination() { return Hallucination_d(); }
function Levitation() {
    return !!((uprop(LEVITATION).intrinsic || uprop(LEVITATION).extrinsic)
              && !uprop(LEVITATION).blocked);
}
function Deaf() {
    return !!(uprop(DEAF).intrinsic || uprop(DEAF).extrinsic
              || game.u.uroleplay?.deaf);
}
function See_invisible() {
    return !!(uprop(SEE_INVIS).intrinsic || uprop(SEE_INVIS).extrinsic);
}
function Invis() {
    return !!((uprop(INVIS).intrinsic || uprop(INVIS).extrinsic)
              && !uprop(INVIS).blocked);
}
function Invisible() { return Invis() && !See_invisible(); }
function Poison_resistance() {
    return !!(uprop(POISON_RES).intrinsic || uprop(POISON_RES).extrinsic);
}
function Fire_resistance() {
    return !!(uprop(FIRE_RES).intrinsic || uprop(FIRE_RES).extrinsic);
}
function Unchanging() {
    return !!(uprop(UNCHANGING).intrinsic || uprop(UNCHANGING).extrinsic);
}
function Glib() { return !!(uprop(GLIB).intrinsic || uprop(GLIB).extrinsic); }
void HALLUC; void HALLUC_RES; void BLINDED;

/* C ref: role.h Role_if(), hack.h wizard */
function Role_if(pm) { return game.urole.mnum === pm; }
function wizard() { return !!game.flags?.debug; }
/* C ref: monst.h DEADMONSTER() */
function DEADMONSTER(mon) { return mon.mhp < 1; }
/* C ref: mondata.h breathless(), is_watch(), nolimbs() */
function breathless(ptr) { return (ptr.mflags1 & M.M1_BREATHLESS) !== 0; }
function is_watch(ptr) {
    return ptr === mons[PM_WATCHMAN] || ptr === mons[PM_WATCH_CAPTAIN];
}
function nolimbs(ptr) {
    return (ptr.mflags1 & M.M1_NOLIMBS) === M.M1_NOLIMBS;
}

/* C ref: rm.h fountain/sink flag macros (looted == flags) */
function lev(x, y) { return game.level.at(x, y); }
function FOUNTAIN_IS_WARNED(x, y) { return (lev(x, y).flags || 0) & F_WARNED; }
function FOUNTAIN_IS_LOOTED(x, y) { return (lev(x, y).flags || 0) & F_LOOTED; }
function SET_FOUNTAIN_WARNED(x, y) { lev(x, y).flags = (lev(x, y).flags || 0) | F_WARNED; }
function SET_FOUNTAIN_LOOTED(x, y) { lev(x, y).flags = (lev(x, y).flags || 0) | F_LOOTED; }
function CLEAR_FOUNTAIN_LOOTED(x, y) { lev(x, y).flags = (lev(x, y).flags || 0) & ~F_LOOTED; }

/* C ref: you.h u_at() */
function u_at(x, y) { return game.u.ux === x && game.u.uy === y; }

const nothing_seems_to_happen = "Nothing seems to happen.";

// C ref: fountain.c floating_above()
/* used when trying to dip in or drink from fountain or sink or pool while
   levitating above it, or when trying to move downwards in that state */
export async function floating_above(what) {
    const u = game.u;
    let umsg = "are floating high above the %s.";

    if (u.utrap && (u.utraptype === TT_INFLOOR || u.utraptype === TT_LAVA)) {
        /* when stuck in floor (not possible at fountain or sink location,
           so must be attempting to move down), override the usual message */
        umsg = "are trapped in the %s.";
        what = surface(u.ux, u.uy); /* probably redundant */
    }
    await You(umsg.replace('%s', what));
}

// C ref: fountain.c dowatersnakes() -- Fountain of snakes!
async function dowatersnakes() {
    let num = rn1(5, 2);
    let mtmp;

    if (!(game.mvitals[PM_WATER_MOCCASIN].mvflags & G_GONE)) {
        if (!Blind()) {
            await pline(`An endless stream of ${
                Hallucination() ? makeplural(rndmonnam(null)) : "snakes"
            } pours forth!`);
        } else {
            /* Soundeffect(se_snakes_hissing, 75) */
            await You_hear("something hissing!");
        }
        while (num-- > 0)
            if ((mtmp = makemon(mons[PM_WATER_MOCCASIN], game.u.ux, game.u.uy,
                                MM_NOMSG)) != null
                && t_at(mtmp.mx, mtmp.my))
                await mintrap(mtmp, NO_TRAP_FLAGS);
    } else {
        /* Soundeffect(se_furious_bubbling, 20) */
        await pline_The("fountain bubbles furiously for a moment, then calms.");
    }
}

// C ref: fountain.c dowaterdemon() -- Water demon
async function dowaterdemon() {
    let mtmp;

    if (!(game.mvitals[PM_WATER_DEMON].mvflags & G_GONE)) {
        if ((mtmp = makemon(mons[PM_WATER_DEMON], game.u.ux, game.u.uy,
                            MM_NOMSG)) != null) {
            if (!Blind())
                await You(`unleash ${a_monnam(mtmp)}!`);
            else
                await You_feel("the presence of evil.");

            /* Give those on low levels a (slightly) better chance of survival
             */
            if (rnd(100) > (80 + level_difficulty())) {
                await pline(`Grateful for ${mhis(mtmp)} release, ${
                    mhe(mtmp)} grants you a wish!`);
                /* give a wish and discard the monster (mtmp set to null) */
                const monp = { mon: mtmp };
                await mongrantswish(monp);
                mtmp = monp.mon;
            } else if (t_at(mtmp.mx, mtmp.my))
                await mintrap(mtmp, NO_TRAP_FLAGS);
        }
    } else {
        /* Soundeffect(se_furious_bubbling, 20) */
        await pline_The("fountain bubbles furiously for a moment, then calms.");
    }
}

/* C ref: mondata.h mhe() */
function mhe(mtmp) { return genders[pronoun_gender(mtmp, PRONOUN_HALLU)].he; }

// C ref: fountain.c dowaternymph() -- Water Nymph
async function dowaternymph() {
    let mtmp;

    if (!(game.mvitals[PM_WATER_NYMPH].mvflags & G_GONE)
        && (mtmp = makemon(mons[PM_WATER_NYMPH], game.u.ux, game.u.uy,
                           MM_NOMSG)) != null) {
        if (!Blind())
            await You(`attract ${a_monnam(mtmp)}!`);
        else
            await You_hear("a seductive voice.");
        mtmp.msleeping = 0;
        if (t_at(mtmp.mx, mtmp.my))
            await mintrap(mtmp, NO_TRAP_FLAGS);
    } else if (!Blind()) {
        /* Soundeffect(se_bubble_rising, 50); Soundeffect(se_loud_pop, 50) */
        await pline("A large bubble rises to the surface and pops.");
    } else {
        /* Soundeffect(se_loud_pop, 50) */
        await You_hear("a loud pop.");
    }
}

// C ref: fountain.c dogushforth() -- Gushing forth along LOS from (u.ux, u.uy)
export async function dogushforth(drinking) {
    const madepool = { v: 0 };

    await do_clear_area_async(game.u.ux, game.u.uy, 7, gush, madepool);
    if (!madepool.v) {
        if (drinking)
            await Your("thirst is quenched.");
        else
            await pline("Water sprays all over you.");
    }
}

// C ref: fountain.c gush()
async function gush(x, y, poolcnt) {
    let mtmp;
    let ttmp;

    if (((x + y) % 2) || u_at(x, y)
        || (rn2(1 + distmin(game.u.ux, game.u.uy, x, y)))
        || (lev(x, y).typ !== ROOM)
        || (sobj_at(BOULDER, x, y)) || nexttodoor(x, y))
        return;

    if ((ttmp = t_at(x, y)) != null && !delfloortrap(ttmp))
        return;

    if (!(poolcnt.v++))
        await pline("Water gushes forth from the overflowing fountain!");

    /* Put a pool at x, y */
    set_levltyp(x, y, POOL);
    lev(x, y).flags = 0;
    /* No kelp! */
    del_engr_at(x, y);
    await water_damage_chain(level_objects_at(x, y), true);

    if ((mtmp = m_at(x, y)) != null)
        await minliquid(mtmp);
    else
        newsym(x, y);
}

/* C ref: level.objects[x][y] -- the top of the pile at <x,y>; the JS
   floor chain (fobj, newest first) is filtered to that spot */
function level_objects_at(x, y) {
    return (game.level.objects || []).filter(o => o.ox === x && o.oy === y
                                             && o.where === 'OBJ_FLOOR');
}

// C ref: fountain.c dofindgem() -- Find a gem in the sparkling waters.
async function dofindgem() {
    if (!Blind())
        await You("spot a gem in the sparkling waters!");
    else
        await You_feel("a gem here!");
    mksobj_at(rnd_class(DILITHIUM_CRYSTAL, LUCKSTONE - 1),
              game.u.ux, game.u.uy, false, false);
    SET_FOUNTAIN_LOOTED(game.u.ux, game.u.uy);
    newsym(game.u.ux, game.u.uy);
    exercise(A_WIS, true); /* a discovery! */
}

// C ref: fountain.c watchman_warn_fountain()
async function watchman_warn_fountain(mtmp) {
    if (is_watch(mtmp.data) && couldsee(mtmp.mx, mtmp.my)
        && mtmp.mpeaceful) {
        if (!Deaf()) {
            await pline(`${Amonnam(mtmp)} yells:`);
            await verbalize("Hey, stop using that fountain!");
        } else {
            await pline(`${Amonnam(mtmp)} earnestly ${
                nolimbs(mtmp.data) ? "shakes" : "waves"} ${mhis(mtmp)} ${
                nolimbs(mtmp.data) ? mbodypart(mtmp, HEAD)
                                   : makeplural(mbodypart(mtmp, ARM))}!`);
        }
        return true;
    }
    return false;
}

/* C ref: pline.c verbalize() -- SetVoice() only matters for speech
   output, which the tty doesn't do */
async function verbalize(line) {
    if (Deaf())
        return; /* vpline(): PLINE_VERBALIZE is dropped when Deaf */
    await pline(`"${line}"`);
}

// C ref: fountain.c dryup()
export async function dryup(x, y, isyou) {
    if (IS_FOUNTAIN(lev(x, y).typ)
        && (!rn2(3) || FOUNTAIN_IS_WARNED(x, y))) {
        if (isyou && in_town(x, y) && !FOUNTAIN_IS_WARNED(x, y)) {
            SET_FOUNTAIN_WARNED(x, y);
            /* Warn about future fountain use. */
            const mtmp = await get_iter_mons(watchman_warn_fountain);
            /* You can see or hear this effect */
            if (!mtmp)
                await pline_The("flow reduces to a trickle.");
            return;
        }
        if (isyou && wizard()) {
            if ((await tty_yn_function("Dry up fountain?", "yn", 'n')) === 'n') /* y_n() */
                return;
        }
        /* FIXME: sight-blocking clouds should use block_point() when
           being created and unblock_point() when going away, then this
           glyph hackery wouldn't be necessary */
        if (cansee(x, y)) {
            const glyph = glyph_at(x, y);

            if (!(glyph.kind === 'cmap' || glyph.kind === 'trap') /* glyph_is_cmap() */
                || glyph.cmapidx !== S_cloud)
                await pline_The("fountain dries up!");
        }
        /* replace the fountain with ordinary floor */
        set_levltyp(x, y, ROOM); /* updates level.flags.nfountains */
        lev(x, y).flags = 0;
        lev(x, y).blessedftn = 0;
        /* The location is seen if the hero/monster is invisible
           or felt if the hero is blind. */
        newsym(x, y);
        if (isyou && in_town(x, y))
            await angry_guards(false);
    }
}

// C ref: fountain.c drinkfountain() -- quaff from a fountain when standing
// on its location
export async function drinkfountain() {
    const u = game.u;
    /* What happens when you drink from a fountain? */
    const mgkftn = (lev(u.ux, u.uy).blessedftn === 1);
    const fate = rnd(30);

    if (Levitation()) {
        await floating_above("fountain");
        return;
    }

    if (mgkftn && u.uluck >= 0 && fate >= 10) {
        let i, ii;
        const littleluck = (u.uluck < 4);

        await pline("Wow!  This makes you feel great!");
        /* blessed restore ability */
        for (ii = 0; ii < A_MAX; ii++)
            if (u.acurr.a[ii] < u.amax.a[ii]) { /* ABASE(ii) < AMAX(ii) */
                u.acurr.a[ii] = u.amax.a[ii];
                game.disp_botl = true;
            }
        /* gain ability, blessed if "natural" luck is high */
        i = rn2(A_MAX); /* start at a random attribute */
        for (ii = 0; ii < A_MAX; ii++) {
            if ((await adjattrib(i, 1, littleluck ? -1 : 0)) && littleluck)
                break;
            if (++i >= A_MAX)
                i = 0;
        }
        await tty_display_nhwindow(game.WIN_MESSAGE, false);
        await pline("A wisp of vapor escapes the fountain...");
        exercise(A_WIS, true);
        lev(u.ux, u.uy).blessedftn = 0;
        return;
    }

    if (fate < 10) {
        await pline_The("cool draught refreshes you.");
        u.uhunger += rnd(10); /* don't choke on water */
        await newuhs(false);
        if (mgkftn)
            return;
    } else {
        switch (fate) {
        case 19: /* Self-knowledge */
            await You_feel("self-knowledgeable...");
            await tty_display_nhwindow(game.WIN_MESSAGE, false);
            await enlightenment(MAGICENLIGHTENMENT, ENL_GAMEINPROGRESS);
            exercise(A_WIS, true);
            await pline_The("feeling subsides.");
            break;
        case 20: /* Foul water */
            await pline_The("water is foul!  You gag and vomit.");
            await morehungry(rn1(20, 11));
            await vomit();
            break;
        case 21: /* Poisonous */
            await pline_The("water is contaminated!");
            if (Poison_resistance()) {
                await pline(`Perhaps it is runoff from the nearby ${
                    fruitname(false)} farm.`);
                await losehp(rnd(4), "unrefrigerated sip of juice", KILLED_BY_AN);
                break;
            }
            {
                const strloss = rn1(4, 3), dmg = rnd(10);
                await poison_strdmg(strloss, dmg, "contaminated water",
                                    KILLED_BY);
            }
            exercise(A_CON, false);
            break;
        case 22: /* Fountain of snakes! */
            await dowatersnakes();
            break;
        case 23: /* Water demon */
            await dowaterdemon();
            break;
        case 24: { /* Maybe curse some items */
            let obj, nextobj;
            let buc_changed = 0;

            await pline("This water's no good!");
            await morehungry(rn1(20, 11));
            exercise(A_CON, false);
            /* this is more severe than rndcurse() */
            for (obj = game.invent; obj; obj = nextobj) {
                nextobj = obj.nobj;
                if (obj.oclass !== COIN_CLASS && !obj.cursed && !rn2(5)) {
                    curse(obj);
                    ++buc_changed;
                }
            }
            /* if (buc_changed) update_inventory(): no perm_invent */
            void buc_changed;
            break;
        }
        case 25: /* See invisible */
            if (Blind()) {
                if (Invisible()) {
                    await You("feel transparent.");
                } else {
                    await You("feel very self-conscious.");
                    await pline("Then it passes.");
                }
            } else {
                await You_see("an image of someone stalking you.");
                await pline("But it disappears.");
            }
            uprop(SEE_INVIS).intrinsic |= FROMOUTSIDE; /* HSee_invisible */
            newsym(u.ux, u.uy);
            exercise(A_WIS, true);
            break;
        case 26: /* See Monsters */
            if (await monster_detect(null, 0))
                await pline_The(`${hliquid("water")} tastes like nothing.`);
            exercise(A_WIS, true);
            break;
        case 27: /* Find a gem in the sparkling waters. */
            if (!FOUNTAIN_IS_LOOTED(u.ux, u.uy)) {
                await dofindgem();
                break;
            }
            /*FALLTHRU*/
        case 28: /* Water Nymph */ // eslint-disable-line no-fallthrough
            await dowaternymph();
            break;
        case 29: /* Scare */
        {
            await pline(`This ${hliquid("water")} gives you bad breath!`);
            for (let mtmp = game.fmon; mtmp; mtmp = mtmp.nmon) {
                if (DEADMONSTER(mtmp))
                    continue;
                await monflee(mtmp, 0, false, false);
            }
            break;
        }
        case 30: /* Gushing forth in this room */
            await dogushforth(true);
            break;
        default:
            await pline(`This tepid ${hliquid("water")} is tasteless.`);
            break;
        }
    }
    await dryup(u.ux, u.uy, true);
}

// C ref: detect.c monster_detect() -- used by crystal balls, potions,
// fountains.  Returns 1 if nothing was detected, 0 if something was.
// Only the nothing-detected path and the fountain caller (no object)
// are reached; the detection display (browse_map()) isn't ported yet.
export async function monster_detect(otmp, mclass) {
    let mcnt = 0;

    /* Note: This used to just check fmon for a non-zero value
     * but in versions since 3.3.0 fmon can test TRUE due to the
     * presence of dmons, so we have to find at least one
     * with positive hit-points to know for sure.
     */
    for (let mtmp = game.fmon; mtmp; mtmp = mtmp.nmon) {
        if (DEADMONSTER(mtmp) || (mtmp.isgd && !mtmp.mx))
            continue;
        ++mcnt;
        break; /* no need for full count, just 1 or more vs 0 */
    }

    if (!mcnt) {
        if (otmp)
            throw new Error('monster_detect(): strange_feeling() for an object not ported yet');
        return 1;
    }
    void mclass;
    throw new Error('monster_detect(): monster display and browse_map() not ported yet');
}

// C ref: fountain.c dipfountain() -- dip an object into a fountain when
// standing on its location
export async function dipfountain(obj) {
    const u = game.u;
    let er = ER_NOTHING;
    const is_hands = (obj === hands_obj);

    if (Levitation()) {
        await floating_above("fountain");
        return;
    }

    if (obj.otyp === LONG_SWORD && u.ulevel >= 5
        && !rn2(Role_if(PM_KNIGHT) ? 6 : 30)
        /* once upon a time it was possible to poly N daggers into N swords */
        && obj.quan === 1 && !obj.oartifact
        && !exist_artifact(LONG_SWORD, artiname(ART_EXCALIBUR))) {
        /* static const char lady[] = "Lady of the Lake"; (livelog only) */

        if (u.ualign.type !== A_LAWFUL) {
            /* Ha!  Trying to cheat her. */
            await pline(`A freezing mist rises from the ${hliquid("water")
                        } and envelopes the sword.`);
            await pline_The("fountain disappears!");
            curse(obj);
            if (obj.spe > -6 && !rn2(3))
                obj.spe--;
            obj.oerodeproof = 0;
            exercise(A_WIS, false);
            /* livelog_printf(LL_ARTIFACT, ...): no livelog */
        } else {
            /* The lady of the lake acts! - Eric Backus */
            /* Be *REAL* nice */
            await pline(
              "From the murky depths, a hand reaches up to bless the sword.");
            await pline("As the hand retreats, the fountain disappears!");
            obj = oname(obj, artiname(ART_EXCALIBUR),
                        ONAME_VIA_DIP | ONAME_KNOW_ARTI);
            discover_artifact(ART_EXCALIBUR);
            bless(obj);
            obj.oeroded = obj.oeroded2 = 0;
            obj.oerodeproof = 1;
            exercise(A_WIS, true);
            /* livelog_printf(LL_ARTIFACT, ...): no livelog */
        }
        /* update_inventory(): no perm_invent */
        set_levltyp(u.ux, u.uy, ROOM); /* updates level.flags.nfountains */
        lev(u.ux, u.uy).flags = 0;
        newsym(u.ux, u.uy);
        if (in_town(u.ux, u.uy))
            await angry_guards(false);
        return;
    } else if (is_hands || obj === game.uarmg) {
        er = await wash_hands();
    } else {
        er = await water_damage(obj, null, true);
    }

    if (er === ER_DESTROYED || (er !== ER_NOTHING && !rn2(2))) {
        return; /* no further effect */
    }

    switch (rnd(30)) {
    case 16: /* Curse the item */
        if (!is_hands && obj.oclass !== COIN_CLASS && !obj.cursed) {
            curse(obj);
        }
        break;
    case 17:
    case 18:
    case 19:
    case 20: /* Uncurse the item */
        if (!is_hands && obj.cursed) {
            if (!Blind())
                await pline_The(`${hliquid("water")} glows for a moment.`);
            uncurse(obj);
        } else {
            await pline("A feeling of loss comes over you.");
        }
        break;
    case 21: /* Water Demon */
        await dowaterdemon();
        break;
    case 22: /* Water Nymph */
        await dowaternymph();
        break;
    case 23: /* an Endless Stream of Snakes */
        await dowatersnakes();
        break;
    case 24: /* Find a gem */
        if (!FOUNTAIN_IS_LOOTED(u.ux, u.uy)) {
            await dofindgem();
            break;
        }
        /*FALLTHRU*/
    case 25: /* Water gushes forth */ // eslint-disable-line no-fallthrough
        await dogushforth(false);
        break;
    case 26: /* Strange feeling */
        await pline(`A strange tingling runs up your ${body_part(ARM)}.`);
        break;
    case 27: /* Strange feeling */
        await You_feel("a sudden chill.");
        break;
    case 28: /* Strange feeling */
        await pline("An urge to take a bath overwhelms you.");
        {
            let money = money_cnt(game.invent);
            let otmp, nextobj;

            if (money > 10) {
                /* Amount to lose.  Might get rounded up as fountains don't
                 * pay change... */
                money = Math.trunc(somegold(money) / 10);
                for (otmp = game.invent; otmp && money > 0; otmp = nextobj) {
                    nextobj = otmp.nobj;
                    if (otmp.oclass === COIN_CLASS) {
                        const denomination = objects[otmp.otyp].oc_cost;
                        let coin_loss =
                            Math.trunc((money + denomination - 1) / denomination);
                        coin_loss = Math.min(coin_loss, otmp.quan);
                        otmp.quan -= coin_loss;
                        money -= coin_loss * denomination;
                        if (!otmp.quan)
                            delobj(otmp);
                    }
                }
                await You("lost some of your gold in the fountain!");
                CLEAR_FOUNTAIN_LOOTED(u.ux, u.uy);
                exercise(A_WIS, false);
            }
        }
        break;
    case 29: /* You see coins */
        /* We make fountains have more coins the closer you are to the
         * surface.  After all, there will have been more people going
         * by.  Just like a shopping mall!  Chris Woodbury  */

        if (FOUNTAIN_IS_LOOTED(u.ux, u.uy))
            break;
        SET_FOUNTAIN_LOOTED(u.ux, u.uy);
        mkgold((rnd((dunlevs_in_dungeon(u.uz) - dunlev(u.uz) + 1) * 2) + 5),
               u.ux, u.uy);
        if (!Blind())
            await pline(`Far below you, you see coins glistening in the ${
                hliquid("water")}.`);
        exercise(A_WIS, true);
        newsym(u.ux, u.uy);
        break;
    default:
        if (er === ER_NOTHING)
            await pline(nothing_seems_to_happen);
        break;
    }
    /* update_inventory(): no perm_invent */
    await dryup(u.ux, u.uy, true);
}

// C ref: fountain.c wash_hands() -- dipping '-' in fountain, pool, or sink
export async function wash_hands() {
    const hands = makeplural(body_part(HAND));
    let res = ER_NOTHING;
    const was_glib = Glib();

    await You(`wash your ${game.uarmg ? "gloved " : ""}${hands} in the ${
        hliquid("water")}.`);
    if (Glib()) {
        make_glib(0);
        await Your(`${fingers_or_gloves(true)} are no longer slippery.`);
    }
    if (game.uarmg)
        res = await water_damage(game.uarmg, null, true);
    /* not what ER_GREASED is for, but the checks in dipfountain just
       compare the result to ER_DESTROYED and ER_NOTHING, so it works */
    if (was_glib && res === ER_NOTHING)
        res = ER_GREASED;
    return res;
}

// C ref: fountain.c breaksink() -- convert a sink into a fountain
export async function breaksink(x, y) {
    if (cansee(x, y) || u_at(x, y))
        await pline_The("pipes break!  Water spurts out!");
    /* updates level.flags.nsinks and level.flags.nfountains */
    set_levltyp(x, y, FOUNTAIN);
    lev(x, y).flags = 0; /* looted = 0 */
    lev(x, y).blessedftn = 0;
    SET_FOUNTAIN_LOOTED(x, y);
    newsym(x, y);
}

// C ref: fountain.c drinksink() -- quaff from a sink while standing on its
// location
export async function drinksink() {
    const u = game.u;
    let otmp;
    let mtmp;

    if (Levitation()) {
        await floating_above("sink");
        return;
    }
    switch (rn2(20)) {
    case 0:
        await You(`take a sip of very cold ${hliquid("water")}.`);
        break;
    case 1:
        await You(`take a sip of very warm ${hliquid("water")}.`);
        break;
    case 2:
        await You(`take a sip of scalding hot ${hliquid("water")}.`);
        if (Fire_resistance()) {
            await pline("It seems quite tasty.");
            monstseesu(M_SEEN_FIRE);
        } else {
            await losehp(rnd(6), "sipping boiling water", KILLED_BY);
            monstunseesu(M_SEEN_FIRE);
        }
        /* boiling water burns considered fire damage */
        break;
    case 3:
        if (game.mvitals[PM_SEWER_RAT].mvflags & G_GONE)
            await pline_The("sink seems quite dirty.");
        else {
            mtmp = makemon(mons[PM_SEWER_RAT], u.ux, u.uy, MM_NOMSG);
            if (mtmp)
                await pline(`Eek!  There's ${
                    (Blind() || !canspotmon(mtmp)) ? "something squirmy"
                                                   : a_monnam(mtmp)
                } in the sink!`);
        }
        break;
    case 4:
        for (;;) {
            otmp = mkobj(POTION_CLASS, false);
            if (otmp.otyp !== POT_WATER)
                break;
            /* reject water and try again */
            obfree(otmp, null);
        }
        otmp.cursed = otmp.blessed = 0;
        await pline(`Some ${
            Blind() ? "odd" : hcolor(OBJ_DESCR(objects[otmp.otyp]))
        } liquid flows from the faucet.`);
        if (!(Blind() || Hallucination()))
            observe_object(otmp, Hallucination());
        otmp.quan++;       /* Avoid panic upon useup() */
        otmp.fromsink = 1; /* kludge for docall() */
        await dopotion(otmp);
        obfree(otmp, null);
        break;
    case 5:
        if (!((lev(u.ux, u.uy).flags || 0) & S_LRING)) {
            await You("find a ring in the sink!");
            mkobj_at(RING_CLASS, u.ux, u.uy, true);
            lev(u.ux, u.uy).flags = (lev(u.ux, u.uy).flags || 0) | S_LRING;
            exercise(A_WIS, true);
            newsym(u.ux, u.uy);
        } else
            await pline(`Some dirty ${hliquid("water")} backs up in the drain.`);
        break;
    case 6:
        await breaksink(u.ux, u.uy);
        break;
    case 7:
        await pline_The(`${hliquid("water")} moves as though of its own will!`);
        if ((game.mvitals[PM_WATER_ELEMENTAL].mvflags & G_GONE)
            || !makemon(mons[PM_WATER_ELEMENTAL], u.ux, u.uy, MM_NOMSG))
            await pline("But it quiets down.");
        break;
    case 8:
        await pline(`Yuk, this ${hliquid("water")} tastes awful.`);
        more_experienced(1, 0);
        await newexplevel();
        break;
    case 9:
        await pline("Gaggg... this tastes like sewage!  You vomit.");
        await morehungry(rn1(30 - ACURR(A_CON), 11));
        await vomit();
        break;
    case 10:
        await pline(`This ${hliquid("water")} contains toxic wastes!`);
        if (!Unchanging()) {
            await You("undergo a freakish metamorphosis!");
            throw new Error('drinksink(): polyself() not ported yet');
        }
        break;
    /* more odd messages --JJB */
    case 11:
        /* Soundeffect(se_clanking_pipe, 50) */
        await You_hear("clanking from the pipes...");
        break;
    case 12:
        /* Soundeffect(se_sewer_song, 100) */
        await You_hear("snatches of song from among the sewers...");
        break;
    case 13:
        await pline("Ew, what a stench!");
        await create_gas_cloud(u.ux, u.uy, 1, 4);
        break;
    case 19:
        if (Hallucination()) {
            await pline("From the murky drain, a hand reaches up... --oops--");
            break;
        }
        /*FALLTHRU*/
    default: { // eslint-disable-line no-fallthrough
        const temp = rn2(3) ? (rn2(2) ? "cold" : "warm") : "hot";
        await You(`take a sip of ${temp} ${hliquid("water")}.`);
    }
    }
}

// C ref: do_name.c hcolor() -- only the non-hallucinating case is ported
function hcolor(colorpref) {
    if (Hallucination() || !colorpref)
        throw new Error('hcolor(): hallucinatory colors not ported yet');
    return colorpref;
}

// C ref: fountain.c dipsink() -- for #dip(potion.c) when standing on a sink
export async function dipsink(obj) {
    const u = game.u;
    let try_call = false;
    const not_looted_yet = ((lev(u.ux, u.uy).flags || 0) & S_LRING) === 0,
          is_hands = (obj === hands_obj || (game.uarmg && obj === game.uarmg));

    if (!rn2(not_looted_yet ? 25 : 15)) {
        /* can't rely on using sink for unlimited scroll blanking; however,
           since sink will be converted into a fountain, hero can dip again */
        await breaksink(u.ux, u.uy); /* "The pipes break!  Water spurts out!" */
        if (Glib() && is_hands)
            await Your(`${fingers_or_gloves(true)} are still slippery.`);
        return;
    } else if (is_hands) {
        await wash_hands();
        return;
    } else if (obj.oclass !== POTION_CLASS) {
        await You(`hold ${the(xname(obj))} under the tap.`);
        if ((await water_damage(obj, null, true)) === ER_NOTHING)
            await pline(nothing_seems_to_happen);
        return;
    }

    /* at this point the object must be a potion */
    await You(`pour ${(obj.quan > 1 ? "one of " : "")}${the(xname(obj))
              } down the drain.`);
    switch (obj.otyp) {
    case POT_POLYMORPH:
        throw new Error('dipsink(): polymorph_sink() not ported yet');
    case POT_OIL:
        if (!Blind()) {
            await pline("It leaves an oily film on the basin.");
            try_call = true;
        } else {
            await pline(nothing_seems_to_happen);
        }
        break;
    case POT_ACID:
        /* acts like a drain cleaner product */
        try_call = true;
        if (!Blind()) {
            await pline_The("drain seems less clogged.");
        } else if (!Deaf()) {
            await You_hear("a sucking sound.");
        } else {
            await pline(nothing_seems_to_happen);
            try_call = false;
        }
        break;
    case POT_LEVITATION:
        await sink_backs_up(u.ux, u.uy);
        try_call = true;
        break;
    case POT_OBJECT_DETECTION:
        if (!((lev(u.ux, u.uy).flags || 0) & S_LRING)) {
            await You("sense a ring lost down the drain.");
            try_call = true;
            break;
        }
        /* FALLTHRU */
    case POT_GAIN_LEVEL: // eslint-disable-line no-fallthrough
    case POT_GAIN_ENERGY:
    case POT_MONSTER_DETECTION:
    case POT_FRUIT_JUICE:
    case POT_WATER:
        /* potions with no potionbreathe() effects, plus water.  if effects
           are added to potionbreathe these should go to that instead (except
           for water). */
        await pline(nothing_seems_to_happen);
        break;
    default:
        /* hero can feel the vapor on her skin, so no need to check Blind or
           breathless for this message */
        await pline("A wisp of vapor rises up...");
        /* NB: potionbreathe calls trycall or makeknown as appropriate */
        if (!breathless(game.youmonst.data) || haseyes(game.youmonst.data))
            await potionbreathe(obj);
        break;
    }
    if (try_call && obj.dknown)
        await trycall(obj);
    useup(obj);
}

// C ref: fountain.c sink_backs_up() -- find a ring in a sink
export async function sink_backs_up(x, y) {
    let buf;

    if (!Blind())
        buf = "Muddy waste pops up from the drain";
    else if (!Deaf())
        buf = "You hear a sloshing sound"; /* Deaf-aware */
    else
        buf = `Something splashes you in the ${body_part(FACE)}`;
    await pline(`${!Deaf() ? "Flupp!  " : ""}${buf}.`);

    if (!((lev(x, y).flags || 0) & S_LRING)) { /* once per sink */
        if (!Blind())
            await You_see("a ring shining in its midst.");
        mkobj_at(RING_CLASS, x, y, true);
        newsym(x, y);
        exercise(A_DEX, true);
        exercise(A_WIS, true); /* a discovery! */
        lev(x, y).flags = (lev(x, y).flags || 0) | S_LRING;
    }
}
