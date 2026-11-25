// mthrowu.js — monsters throwing, shooting, spitting and breathing at the
// hero or at other monsters.
// C ref: mthrowu.c.  thitu(), drop_throw(), monmulti(), monshoot(),
// ohitmon(), ucatchgem(), u_catch_thrown_obj(), m_throw(),
// return_from_mtoss(), thrwmm(), spitmm(), breamm(), m_useupall(),
// m_useup(), thrwmu(), spitmu(), breamu(), m_lined_up(), hit_bars() and
// hits_bars().  linedup()/lined_up() live in monmove.js, m_carrying() and
// m_has_launcher_and_ammo() in weapon.js.  Paths that aren't ported yet
// throw a 'not ported yet' error instead of skipping their rolls.

import { DEADMONSTER } from './mon.js';
import { ordin } from './hacklib.js';
import { passes_rocks } from './trap.js';
import { resists_poison } from './mondata.js';
import { rounddiv } from './hack.js';
import { game } from './gstate.js';
import { rn2, rnd, rnl, rn2_on_display_rng, ROLL_FROM } from './rng.js';
import { distmin, dist2, s_suffix, strncmpi } from './hacklib.js';
import { cansee, couldsee } from './vision.js';
import {
    pline, You, Your, pline_The, newsym, canseemon, canspotmon, tmp_at,
    obj_to_glyph, DISP_FLASH, DISP_TETHER, DISP_END
} from './display.js';
import { BOLT_LIM, MON_POLE_DIST, NEED_WEAPON, NEED_RANGED_WEAPON,
         PET_MISSILE_RANGE2, P_POLEARMS, P_LANCE, P_BOW, P_CROSSBOW, P_DART,
         P_SHURIKEN, P_SPEAR, P_KNIFE, M_ATTK_MISS, M_ATTK_HIT, M_SEEN_ACID,
         M_SEEN_REFL, KILLED_BY, KILLED_BY_AN, A_STR, A_CON, A_DEX,
         ACID_RES, SLEEP_RES, STONE_RES, BLINDED, DEAF, HALLUC, CONFUSION,
         STUNNED, FUMBLING, STONED, SLT_ENCUMBER, BRK_BY_HERO, BRK_MELEE,
         W_NONDIGGABLE, POTHIT_OTHER_THROW, POTHIT_MONST_THROW, M_AP_NOTHING,
         M_AP_MONSTER, IRONBARS, isok, IS_OBSTRUCTED, IS_SINK,
         LOW_PM, ARM, EYE, FACE, HAND, FOOT, W_WEP, XKILL_NOMSG,
         POISON_RES, NEUTRAL, G_GENOD } from './const.js';
import * as O from './objects.js';
import { objects, WEAPON_CLASS, TOOL_CLASS, GEM_CLASS, POTION_CLASS,
         VENOM_CLASS, COIN_CLASS, ARMOR_CLASS, ROCK_CLASS, FOOD_CLASS,
         SPBOOK_CLASS, WAND_CLASS, BALL_CLASS, CHAIN_CLASS, RING_CLASS,
         SILVER, GOLD, GEMSTONE, MINERAL, STRANGE_OBJECT } from './objects.js';
import * as M from './monsters.js';
import { mons } from './monsters.js';
import { ART_SNICKERSNEE } from './artilist.js';
import { mon_wield_item, select_rwep, autoreturn_weapon, mwelded, dmgval,
         setmnotwielded, m_carrying } from './weapon.js';
import { lined_up, linedup } from './monmove.js';
import {
    m_at, closed_door, is_pool, is_lava, is_prince, is_lord, is_mplayer,
    nonliving
} from './makemon.js';
import { monsndx, is_elf, is_orc, is_gnome, is_vampshifter, hates_silver,
         mon_hates_silver, Resists_Elem, get_atkdam_type,
         cvt_adtyp_to_mseenres, can_blnd, haseyes } from './mondata.js';
import { is_ammo, matching_launcher, ammo_and_launcher, is_missile,
         freehand } from './wield.js';
import { multishot_class_bonus, omon_adj, breaktest } from './dothrow.js';
import { splitobj, obj_extract_self, clear_dknown, place_object,
         add_to_minv, mksobj, is_poisonable, is_flammable,
         weight } from './mkobj.js';
import { stackobj, delobj, obfree } from './invent.js';
import { flooreffects, ship_object, down_gate, dropy } from './do.js';
import { observe_object, discover_object } from './o_init.js';
import { xname, doname, singular, an, The, Tobjnam, otense, vtense,
         obj_is_pname, distant_name, corpse_xname, the_unique_obj,
         makeplural, CXN_NORMAL } from './objnam.js';
import { the, simpleonames, bare_artifactname } from './iactions.js';
import { Monnam, mon_nam, some_mon_nam, pronoun_gender,
         PRONOUN_HALLU } from './do_name.js';
import { genders } from './role.js';
import { find_mac } from './worn.js';
import { seemimic, xkilled, mondied, setmangry, monkilled,
         wake_nearto } from './mon.js';
import { exercise, ACURR, poisoned } from './attrib.js';
import { losehp, Maybe_Half_Phys } from './trap.js';
import { stop_occupation } from './allmain.js';
import { nomul, calc_capacity } from './hack.js';
import { make_blinded, potionhit, make_stoned, hliquid } from './potion.js';
import { You_hear } from './sounds.js';
import { monstseesu, monstunseesu, shade_miss, passive_obj } from './uhitm.js';
import { mswings_verb, mhim } from './mhitu.js';
import { hit, miss, exclam, dobuzz } from './zap.js';
import { hold_another_object } from './wizcmds.js';
import { extract_from_minvent, extract_from_minvent_g } from './steal.js';
import { body_part } from './insight.js';
import { mbodypart } from './shk.js';
import { m_seenres } from './muse.js';
import { spec_abon } from './artifact.js';
import {
    Sleep_resistance, Acid_resistance, Stone_resistance, Stunned, Confusion, BlindedTimeout,
    Blind, Stoned, Hallucination, Deaf, Fumbling, Underwater, Hate_silver
} from './youprop.js';
import { Role_if, u_at, MIGR_NOWHERE } from './const.js';
import { munstone } from './muse.js';
import { hero_breaks, breaks } from './dothrow.js';
import { dissolve_bars } from './monmove.js';
import { acurrstr } from './attrib.js';
import { WT_IRON_BALL_INCR } from './const.js';

/* C ref: youprop.h -- (H* || E*) && !B* */
function verbose() { return game.flags.verbose ?? true; }

/* C ref: mondata.c poly_when_stoned() -- golems other than stone golem
   turn into stone golems */
function poly_when_stoned(ptr) {
    return ptr.mlet === M.S_GOLEM && ptr !== mons[M.PM_STONE_GOLEM]
           && !(game.mvitals[M.PM_STONE_GOLEM].mvflags & G_GENOD);
}
/* C ref: hack.h mdistu() */
function mdistu(mon) {
    const dx = mon.mx - game.u.ux, dy = mon.my - game.u.uy;
    return dx * dx + dy * dy;
}
/* C ref: hacklib.c sgn() */
function sgn(n) { return n < 0 ? -1 : n > 0 ? 1 : 0; }
/* C ref: obj.h is_pole() */
function is_pole(otmp) {
    return (otmp.oclass === WEAPON_CLASS || otmp.oclass === TOOL_CLASS)
           && (objects[otmp.otyp].oc_skill === P_POLEARMS
               || objects[otmp.otyp].oc_skill === P_LANCE
               || otmp.oartifact === ART_SNICKERSNEE);
}
/* C ref: obj.h stone_missile() */
function stone_missile(o) {
    return (objects[o.otyp].oc_material === GEMSTONE
            || objects[o.otyp].oc_material === MINERAL)
           && o.oclass !== RING_CLASS;
}
/* C ref: obj.h is_flimsy() */
function is_flimsy(otmp) {
    return objects[otmp.otyp].oc_material <= O.LEATHER
           || otmp.otyp === O.RUBBER_HOSE;
}
/* C ref: mondata.h */
function passes_walls(ptr) { return (ptr.mflags1 & M.M1_WALLWALK) !== 0; }
function unsolid(ptr) { return (ptr.mflags1 & M.M1_UNSOLID) !== 0; }
function noncorporeal(ptr) { return ptr.mlet === M.S_GHOST; }
function amorphous(ptr) { return (ptr.mflags1 & M.M1_AMORPHOUS) !== 0; }
function bigmonst(ptr) { return ptr.msize >= M.MZ_LARGE; }
function likes_gems(ptr) { return (ptr.mflags2 & M.M2_JEWELS) !== 0; }
function is_unicorn(ptr) { return ptr.mlet === M.S_UNICORN && likes_gems(ptr); }
function throws_rocks(ptr) { return (ptr.mflags2 & M.M2_ROCKTHROW) !== 0; }
function touch_petrifies(ptr) {
    return ptr === mons[M.PM_COCKATRICE] || ptr === mons[M.PM_CHICKATRICE];
}
function resists_acid(mon) { return Resists_Elem(mon, ACID_RES); }
function resists_ston(mon) { return Resists_Elem(mon, STONE_RES); }
/* C ref: objnam.c makeknown() */
function makeknown(otyp) { discover_object(otyp, true, true, true); }
/* C ref: hacklib.c upstart() */
function upstart(s) { return s ? s[0].toUpperCase() + s.slice(1) : s; }
function plur(x) { return (x === 1) ? "" : "s"; }

/* gm.m_shot (decl.h) -- multishot volley feedback */
function m_shot() {
    if (!game.m_shot) game.m_shot = { s: false, o: STRANGE_OBJECT, n: 0, i: 0 };
    return game.m_shot;
}

/* C ref: mthrowu.c URETREATING() */
function URETREATING(x, y) {
    const u = game.u;
    return distmin(u.ux, u.uy, x, y) > distmin(u.ux0, u.uy0, x, y);
}

// C ref: objnam.c mshot_xname()
/* xname() output augmented for multishot missile feedback */
export function mshot_xname(obj) {
    let onm = xname(obj);
    const ms = m_shot();

    if (ms.n > 1 && ms.o === obj.otyp) {
        /* "the Nth arrow"; value will eventually be passed to an() or
           The(), both of which correctly handle this "the " prefix */
        onm = `the ${ms.i}${ordin(ms.i)} ${onm}`;
    }
    return onm;
}

// C ref: objnam.c killer_xname()
/* treat an object as fully ID'd when it might be used as reason for death */
export function killer_xname(obj) {
    /* bypass object twiddling for artifacts */
    if (obj.oartifact)
        return bare_artifactname(obj);

    /* remember original settings for core of the object */
    const save_obj = { ...obj };
    const save_oname = obj.oextra?.oname;

    obj.known = obj.dknown = 1;
    obj.bknown = obj.rknown = obj.greased = 0;
    /* if character is a priest[ess], bknown will get toggled back on */
    if (obj.otyp !== O.POT_WATER)
        obj.blessed = obj.cursed = 0;
    else
        obj.bknown = 1; /* describe holy/unholy water as such */
    obj.otrapped /* opoisoned */ = 0;
    /* strip user-supplied name; artifacts keep theirs */
    if (save_oname)
        obj.oextra.oname = null;
    /* temporarily identify the type of object */
    const save_ocknown = objects[obj.otyp].oc_name_known;
    objects[obj.otyp].oc_name_known = 1;
    const save_ocuname = objects[obj.otyp].oc_uname;
    objects[obj.otyp].oc_uname = null; /* avoid "foo called bar" */

    let buf;
    try {
        /* format the object */
        if (obj.otyp === O.CORPSE)
            buf = corpse_xname(obj, null, CXN_NORMAL);
        else if (obj.otyp === O.SLIME_MOLD)
            buf = `deadly slime mold${plur(obj.quan)}`;
        else
            buf = xname(obj);
        /* apply an article if appropriate; caller should always use
           KILLED_BY */
        if (obj.quan === 1 && !buf.includes("'s ") && !buf.includes("s' "))
            buf = (obj_is_pname(obj) || the_unique_obj(obj)) ? the(buf) : an(buf);
    } finally {
        objects[obj.otyp].oc_name_known = save_ocknown;
        objects[obj.otyp].oc_uname = save_ocuname;
        Object.assign(obj, save_obj); /* restore object's core settings */
        if (save_oname)
            obj.oextra.oname = save_oname;
    }
    return buf;
}

// C ref: mthrowu.c thitu()
/* hero is hit by something other than a monster (though it could be a
   missile thrown or shot by a monster); objp is a { obj } holder (C's
   struct obj **), cleared if the object gets used up */
export async function thitu(
    tlev, /* pseudo-level used when deciding whether to hit hero's AC */
    dam,
    objp,
    name) { /* if null, then format `*objp' */
    const u = game.u;
    let obj = objp ? objp.obj : null;
    let onm, knm;
    let kprefix = KILLED_BY_AN, dieroll;
    const named = (name != null);

    if (!name) {
        if (!obj)
            throw new Error('thitu: name & obj both null?'); /* panic() */
        name = (obj.quan > 1) ? doname(obj) : mshot_xname(obj);
        knm = killer_xname(obj);
        kprefix = KILLED_BY; /* killer_name supplies "an" if warranted */
    } else {
        knm = name;
        /* [perhaps ought to check for plural here too] */
        if (!strncmpi(name, "the ", 4) || !strncmpi(name, "an ", 3)
            || !strncmpi(name, "a ", 2))
            kprefix = KILLED_BY;
    }
    onm = (obj && obj_is_pname(obj)) ? the(name)
          : (obj && obj.quan > 1) ? name
            : an(name);
    const is_acid = (obj && obj.otyp === O.ACID_VENOM);

    if (u.uac + tlev <= (dieroll = rnd(20))) {
        game.mesg_given = (game.mesg_given || 0) + 1;
        if (Blind() || !verbose()) {
            await pline("It misses.");
        } else if (u.uac + tlev <= dieroll - 2) {
            await pline(`${upstart(onm)} ${vtense(onm, "miss")} you.`);
        } else
            await You(`are almost hit by ${onm}.`);
        return 0;
    } else {
        if (Blind() || !verbose())
            await You(`are hit${exclam(dam)}`);
        else
            await You(`are hit by ${onm}${exclam(dam)}`);

        if (is_acid && Acid_resistance()) {
            await pline("It doesn't seem to hurt you.");
            monstseesu(M_SEEN_ACID);
        } else if (obj && stone_missile(obj)
                   && passes_rocks(game.youmonst.data)) {
            /* use 'named' as an approximation for "hitting from above";
               we avoid "passes through you" for horizontal flight path
               because missile stops and that wording would suggest that
               it should keep going */
            await pline(`It ${named ? "passes harmlessly through"
                                    : "doesn't harm"} you.`);
        } else if (obj && obj.oclass === POTION_CLASS) {
            /* an explosion which scatters objects might hit hero with one
               (potions deliberately thrown at hero are handled by m_throw) */
            await potionhit(game.youmonst, obj, POTHIT_OTHER_THROW);
            objp.obj = obj = null; /* potionhit() uses up the potion */
        } else {
            if (obj && objects[obj.otyp].oc_material === SILVER
                && Hate_silver()) {
                /* extra damage already applied by dmgval() */
                await pline_The("silver sears your flesh!");
                exercise(A_CON, false);
            }
            if (is_acid) {
                await pline("It burns!");
                monstunseesu(M_SEEN_ACID);
            }
            await losehp(dam, knm, kprefix); /* acid damage */
            exercise(A_STR, false);
        }
        return 1;
    }
}

// C ref: dothrow.c should_mulch_missile()
/* Be sure this corresponds with what happens to player-thrown objects in
 * dothrow.c (for consistency). --KAA */
export function should_mulch_missile(obj) {
    let broken;

    /* only ammo (excluding magic stones) or missiles will break */
    if (!obj || !(is_ammo(obj) || is_missile(obj))
        || obj.otyp === O.BOOMERANG
        || objects[obj.otyp].oc_magic)
        return false;

    /* we had been breaking 2/3 of everything unconditionally.  we still
       don't want anything to survive unconditionally, but we need ammo to
       stay around longer on average. */
    const chance = 3 + greatest_erosion(obj) - (obj.spe || 0);
    broken = chance > 1 ? rn2(chance) : !rn2(4);
    if (obj.blessed && (game.context.mon_moving ? !rn2(3) : !rnl(4)))
        broken = false;

    /* Flint and hard gems don't break easily */
    if (((obj.oclass === GEM_CLASS && objects[obj.otyp].oc_tough)
         || obj.otyp === O.FLINT)
        && !rn2(2))
        broken = false;

    return !!broken;
}
/* C ref: obj.h greatest_erosion() */
function greatest_erosion(otmp) {
    return Math.max(otmp.oeroded || 0, otmp.oeroded2 || 0);
}

// C ref: mthrowu.c drop_throw()
/* Returns FALSE if object still exists (not destroyed). */
async function drop_throw(obj, ohit, x, y) {
    let broken;

    if (obj.otyp === O.CREAM_PIE || obj.oclass === VENOM_CLASS
        || (ohit && obj.otyp === O.EGG)) {
        broken = true;
    } else {
        broken = (ohit && should_mulch_missile(obj));
    }

    if (broken) {
        delobj(obj);
    } else {
        if (down_gate(x, y) !== MIGR_NOWHERE)
            broken = await ship_object(obj, x, y, false);
        if (!broken) {
            let mtmp = m_at(x, y);
            if (!(broken = await flooreffects(obj, x, y, "fall"))) {
                place_object(obj, x, y);
                if (!mtmp && u_at(x, y))
                    mtmp = game.youmonst;
                if (mtmp && ohit)
                    await passive_obj(mtmp, obj, null);
                stackobj(obj);
            }
        }
    }
    game.thrownobj = null;
    return broken;
}

// C ref: mthrowu.c monmulti()
/* calculate multishot volley count for mtmp throwing otmp (if not ammo) or
   shooting otmp with mwep (if otmp is ammo and mwep appropriate launcher) */
function monmulti(mtmp, otmp, mwep) {
    let multishot = 1;

    if (otmp.quan > 1 /* no point checking if there's only 1 */
        /* ammo requires corresponding launcher be wielded */
        && (is_ammo(otmp)
            ? matching_launcher(otmp, mwep)
            /* otherwise any stackable (non-ammo) weapon */
            : otmp.oclass === WEAPON_CLASS)
        && !mtmp.mconf) {
        /* Assumes lords are skilled, princes are expert */
        if (is_prince(mtmp.data))
            multishot += 2;
        else if (is_lord(mtmp.data))
            multishot++;
        /* fake players treated as skilled (regardless of role limits) */
        else if (is_mplayer(mtmp.data))
            multishot++;

        /* this portion is different from hero multishot; from slash'em? */
        /* Elven Craftsmanship makes for light, quick bows */
        if (otmp.otyp === O.ELVEN_ARROW && !otmp.cursed)
            multishot++;
        /* for arrow, we checked bow&arrow when entering block, but for
           bow, so far we've only validated that otmp is a weapon stack;
           need to verify that it's a stack of arrows rather than darts */
        if (mwep && mwep.otyp === O.ELVEN_BOW && ammo_and_launcher(otmp, mwep)
            && !mwep.cursed)
            multishot++;
        /* 1/3 of launcher enchantment */
        if (ammo_and_launcher(otmp, mwep) && mwep.spe > 1)
            multishot += rounddiv(mwep.spe, 3);
        /* Some randomness */
        multishot = rnd(multishot);

        /* class bonus */
        multishot += multishot_class_bonus(monsndx(mtmp.data), otmp, mwep);

        /* racial bonus */
        if ((is_elf(mtmp.data) && otmp.otyp === O.ELVEN_ARROW
             && mwep && mwep.otyp === O.ELVEN_BOW)
            || (is_orc(mtmp.data) && otmp.otyp === O.ORCISH_ARROW
                && mwep && mwep.otyp === O.ORCISH_BOW)
            || (is_gnome(mtmp.data) && otmp.otyp === O.CROSSBOW_BOLT
                && mwep && mwep.otyp === O.CROSSBOW))
            multishot++;
    }

    if (otmp.quan < multishot)
        multishot = otmp.quan;
    if (multishot < 1)
        multishot = 1;
    return multishot;
}

// C ref: mthrowu.c monshoot()
/* mtmp throws otmp, or shoots otmp with mwep, at hero or at monster mtarg */
async function monshoot(mtmp, otmp, mwep) {
    const mtarg = game.mtarget || null;
    const dm = distmin(mtmp.mx, mtmp.my,
                       mtarg ? mtarg.mx : mtmp.mux,
                       mtarg ? mtarg.my : mtmp.muy);
    const multishot = monmulti(mtmp, otmp, mwep);
    const ms = m_shot();

    /*
     * Caller must have called linedup() to set up <gt.tbx, gt.tby>.
     */

    if (canseemon(mtmp)) {
        let onm;

        if (multishot > 1) {
            /* "N arrows"; multishot > 1 implies otmp->quan > 1, so
               xname()'s result will already be pluralized */
            onm = `${multishot} ${xname(otmp)}`;
        } else {
            /* "an arrow" */
            onm = singular(otmp, xname);
            onm = obj_is_pname(otmp) ? the(onm) : an(onm);
        }
        ms.s = ammo_and_launcher(otmp, mwep) ? true : false;
        const trgbuf = mtarg ? some_mon_nam(mtarg) : "";
        /* set_msg_xy(mtmp->mx, mtmp->my): tty ignores the position */
        await pline(`${Monnam(mtmp)} ${ms.s ? "shoots" : "throws"} ${onm}${
            mtarg ? " at " : ""}${trgbuf}!`);
        ms.o = otmp.otyp;
    } else {
        ms.o = STRANGE_OBJECT; /* don't give multishot feedback */
    }
    ms.n = multishot;
    for (ms.i = 1; ms.i <= ms.n; ms.i++) {
        await m_throw(mtmp, mtmp.mx, mtmp.my, sgn(game.tbx), sgn(game.tby),
                      dm, otmp);
        /* conceptually all N missiles are in flight at once, but
           if mtmp gets killed (shot kills adjacent gas spore and
           triggers explosion, perhaps), inventory will be dropped
           and otmp might go away via merging into another stack */
        if (DEADMONSTER(mtmp) && ms.i < ms.n)
            /* cancel pending shots (perhaps ought to give a message here
               since we gave one above about throwing/shooting N missiles) */
            break; /* endmultishot(FALSE); */
    }
    /* reset 'gm.m_shot' */
    ms.n = ms.i = 0;
    ms.o = STRANGE_OBJECT;
    ms.s = false;
}

// C ref: mthrowu.c ohitmon()
/* an object launched by someone/thing other than player attacks a monster;
   return 1 if the object has stopped moving (hit or its range used up);
   can anger the monster, if this happened due to hero (eg. exploding
   bag of holding throwing the items) */
export async function ohitmon(
    mtmp,     /* accidental target, located at <gb.bhitpos.x,.y> */
    otmp,     /* missile; might be destroyed by drop_throw */
    range,    /* how much farther will object travel if it misses;
               * use -1 to signify to keep going even after hit,
               * unless it's gone (for rolling_boulder_traps) */
    verbose_) { /* give messages even when you can't see what happened */
    let damage, tmp;
    let objgone;
    const marcher = game.marcher || null, mtarget = game.mtarget || null;
    const mon_launcher = marcher ? (marcher.mw || null) : null;
    const bx = game.bhitpos.x, by = game.bhitpos.y;

    /* assert(otmp != NULL); */
    game.notonhead = (bx !== mtmp.mx || by !== mtmp.my);
    const ismimic = mtmp.m_ap_type && mtmp.m_ap_type !== M_AP_MONSTER;
    const vis = cansee(bx, by);
    if (vis)
        observe_object(otmp, Hallucination());

    tmp = 5 + find_mac(mtmp) + omon_adj(mtmp, otmp, false);
    /* High level monsters will be more likely to hit */
    /* This check applies only if this monster is the target
     * the archer was aiming at. */
    if (marcher && mtarget === mtmp) {
        if (marcher.m_lev > 5)
            tmp += marcher.m_lev - 5;
        if (mon_launcher && mon_launcher.oartifact)
            tmp += spec_abon(mon_launcher, mtmp);
    }
    if (tmp < rnd(20)) {
        if (!ismimic) {
            if (vis)
                await miss(distant_name(otmp, mshot_xname), mtmp);
            else if (verbose_ && !mtarget)
                await pline("It is missed.");
        }
        if (!range) { /* Last position; object drops */
            await drop_throw(otmp, 0, mtmp.mx, mtmp.my);
            return 1;
        }
    } else if (otmp.oclass === POTION_CLASS) {
        if (ismimic)
            seemimic(mtmp);
        mtmp.msleeping = 0;
        /* probably thrown by a monster rather than 'other', but the
           distinction only matters when hitting the hero */
        await potionhit(mtmp, otmp, POTHIT_OTHER_THROW);
        return 1;
    } else {
        const material = objects[otmp.otyp].oc_material;
        const harmless = (stone_missile(otmp) && passes_rocks(mtmp.data));

        damage = dmgval(otmp, mtmp);
        if (otmp.otyp === O.ACID_VENOM && resists_acid(mtmp))
            damage = 0;
        if (ismimic)
            seemimic(mtmp);
        mtmp.msleeping = 0;
        /* Soundeffect(se_splat_egg, 35) */
        if (vis) {
            if (otmp.otyp === O.EGG) {
                await pline(`Splat!  ${Monnam(mtmp)} is hit with ${
                    otmp.known ? an(mons[otmp.corpsenm].pmnames[NEUTRAL])
                               : "an"} egg!`);
            } else {
                let how;

                if (!harmless)
                    how = exclam(damage); /* "!" or "." */
                else
                    how = ` but passes harmlessly through ${mhim(mtmp).slice(0, 9)}.`;
                await hit(distant_name(otmp, mshot_xname), mtmp, how);
            }
        } else if (verbose_ && !mtarget)
            await pline(`${(otmp.otyp === O.EGG) ? "Splat!  " : ""}${
                Monnam(mtmp)} is hit${exclam(damage)}`);

        if (otmp.otrapped /* opoisoned */ && is_poisonable(otmp)) {
            if (resists_poison(mtmp)) {
                if (vis)
                    await pline_The(`poison doesn't seem to affect ${mon_nam(mtmp)}.`);
            } else {
                if (rn2(30)) {
                    damage += rnd(6);
                } else {
                    if (vis)
                        await pline_The("poison was deadly...");
                    damage = mtmp.mhp;
                }
            }
        }
        if (material === SILVER && mon_hates_silver(mtmp)) {
            const flesh = (!noncorporeal(mtmp.data)
                           && !amorphous(mtmp.data));

            /* note: extra silver damage is handled by dmgval() */
            if (vis) {
                let m_name = mon_nam(mtmp);

                if (flesh) /* s_suffix returns a modifiable buffer */
                    m_name = s_suffix(m_name) + " flesh";
                await pline_The(`silver sears ${m_name}!`);
            } else if (verbose_ && !mtarget) {
                await pline(`${flesh ? "Its flesh" : "It"} is seared!`);
            }
        }
        if (otmp.otyp === O.ACID_VENOM && cansee(mtmp.mx, mtmp.my)) {
            if (resists_acid(mtmp)) {
                if (vis || (verbose_ && !mtarget))
                    await pline(`${Monnam(mtmp)} is unaffected.`);
            } else {
                if (vis)
                    await pline_The(`${hliquid("acid")} burns ${mon_nam(mtmp)}!`);
                else if (verbose_ && !mtarget)
                    await pline("It is burned!");
            }
        }
        if (otmp.otyp === O.EGG && touch_petrifies(mons[otmp.corpsenm])) {
            if (!await munstone(mtmp, false))
                throw new Error('ohitmon(): minstapetrify() not ported yet');
            if (resists_ston(mtmp))
                damage = 0;
        }

        /* might already be dead (if petrified) */
        if (!harmless && !DEADMONSTER(mtmp)) {
            mtmp.mhp -= damage;
            if (DEADMONSTER(mtmp)) {
                if (vis || (verbose_ && !mtarget))
                    await pline(`${Monnam(mtmp)} is ${
                        (nonliving(mtmp.data) || is_vampshifter(mtmp)
                         || !canspotmon(mtmp)) ? "destroyed" : "killed"}!`);
                /* don't blame hero for unknown rolling boulder trap */
                if (!game.context.mon_moving
                    && (otmp.otyp !== O.BOULDER || range >= 0 || otmp.otrapped))
                    await xkilled(mtmp, XKILL_NOMSG);
                else
                    await mondied(mtmp);
            }
        }

        /* blinding venom and cream pie do 0 damage, but verify
           that the target is still alive anyway */
        if (!DEADMONSTER(mtmp)
            && can_blnd(null, mtmp,
                        (otmp.otyp === O.BLINDING_VENOM) ? M.AT_SPIT
                                                         : M.AT_WEAP,
                        otmp)) {
            if (vis && mtmp.mcansee)
                /* shorten object name to reduce redundancy in the
                   two message [first via hit() above] sequence */
                await pline(`${Monnam(mtmp)} is blinded by ${
                    the((otmp.oclass === VENOM_CLASS) ? "venom"
                        : (otmp.otyp === O.CREAM_PIE) ? "pie"
                          : xname(otmp))}.`); /* catchall; not used */
            mtmp.mcansee = 0;
            tmp = (mtmp.mblinded || 0) + rnd(25) + 20;
            if (tmp > 127)
                tmp = 127;
            mtmp.mblinded = tmp;
        }

        if (!DEADMONSTER(mtmp) && !game.context.mon_moving)
            await setmangry(mtmp, true);

        objgone = await drop_throw(otmp, 1, game.bhitpos.x, game.bhitpos.y);
        if (!objgone && range === -1) { /* special case */
            obj_extract_self(otmp);      /* free it for motion again */
            return 0;
        }
        return 1;
    }
    return 0;
}

// C ref: mthrowu.c ucatchgem()
/* hero catches gem thrown by mon iff poly'd into unicorn; might drop it */
async function ucatchgem(
    gem,   /* caller has verified gem->oclass */
    mon) {
    /* won't catch rock or gray stone; catch (then drop) worthless glass */
    if (gem.otyp <= O.LAST_GLASS_GEM && is_unicorn(game.youmonst.data)) {
        const gem_xname = xname(gem),
            mon_s_name = s_suffix(mon_nam(mon));

        if (gem.otyp >= O.FIRST_GLASS_GEM) {
            await You(`catch the ${gem_xname}.`);
            await You(`are not interested in ${mon_s_name} junk.`);
            makeknown(gem.otyp);
            await dropy(gem);
        } else {
            await You(`accept ${mon_s_name} gift in the spirit in which it was intended.`);
            await hold_another_object(gem, "You catch, but drop, %s.",
                                      gem_xname, "You catch:");
        }
        return true;
    }
    return false;
}

// C ref: mthrowu.c u_catch_thrown_obj()
/* hero may catch thrown obj. it is added to inventory, if possible */
async function u_catch_thrown_obj(otmp) {
    const catch_chance = 100 - ACURR(A_DEX)
                         - ((Role_if(M.PM_MONK) || Role_if(M.PM_ROGUE)) ? 20 : 0);

    if (!Blind() && !Confusion() && !Stunned() && !Fumbling()
        && otmp.oclass !== VENOM_CLASS
        && !nohands(game.youmonst.data) && freehand()
        && calc_capacity(otmp.owt) <= SLT_ENCUMBER && !rn2(catch_chance)) {
        const buf = `You catch the ${simpleonames(otmp)}!`;

        await hold_another_object(otmp, "You catch, but drop, the %s.",
                                  simpleonames(otmp), buf);
        return true;
    }
    return false;
}
function nohands(ptr) { return (ptr.mflags1 & M.M1_NOHANDS) !== 0; }

/* C ref: mthrowu.c MT_FLIGHTCHECK() -- singleref is the { obj } holder
   for hits_bars() (the missile is set to null if it breaks) */
async function MT_FLIGHTCHECK(pre, forcehit, dx, dy, singleref) {
    const bx = game.bhitpos.x, by = game.bhitpos.y;
    const nx = bx + dx, ny = by + dy;
    return (/* missile hits edge of screen */
        !isok(nx, ny)
        /* missile hits the wall */
        || IS_OBSTRUCTED(game.level.at(nx, ny).typ)
        /* missile hit closed door */
        || closed_door(nx, ny)
        /* missile might hit iron bars */
        /* the random chance for small objects hitting bars is */
        /* skipped when reaching them at point blank range */
        || (game.level.at(nx, ny).typ === IRONBARS
            && await hits_bars(singleref, bx, by, nx, ny,
                         (pre ? 0 : forcehit), 0))
        /* Thrown objects "sink" */
        || (!pre && IS_SINK(game.level.at(bx, by).typ)));
}

// C ref: mthrowu.c m_throw()
export async function m_throw(
    mon,      /* launching monster */
    x, y,     /* launch point */
    dx, dy,   /* direction */
    range,    /* maximum distance */
    obj) {    /* missile (or stack providing it) */
    const u = game.u;
    let mtmp;
    let singleobj;
    let forcehit;
    const sym = obj.oclass;
    let hitu = 0, oldumort, blindinc = 0;
    const arw = autoreturn_weapon(obj);
    const tethered_weapon = (obj === mon.mw && arw && arw.tethered !== 0);
    let return_flightpath = false;

    game.bhitpos = { x, y };
    game.notonhead = false; /* reset potentially stale value */

    if (obj.quan === 1) {
        /*
         * Remove object from minvent.  This cannot be done later on;
         * what if the player dies before then, leaving the monster
         * with 0 daggers?  (This caused the infamous 2^32-1 orcish
         * dagger bug).
         *
         * VENOM is not in minvent--it should already be OBJ_FREE.
         * The extract below does nothing.
         */

        /* not possibly_unwield(), which checks the object's location,
           not its existence */
        if (mon.mw === obj)
            setmnotwielded(mon, obj);
        obj_extract_self(obj);
        singleobj = obj;
        obj = null;
    } else {
        singleobj = splitobj(obj, 1);
        obj_extract_self(singleobj);
    }
    /* global pointer for missile object in OBJ_FREE state */
    game.thrownobj = singleobj;

    singleobj.owornmask = 0; /* threw one of multiple weapons in hand? */
    if (!canseemon(mon))
        clear_dknown(singleobj); /* singleobj->dknown = 0; */

    if ((singleobj.cursed || singleobj.greased) && (dx || dy) && !rn2(7)) {
        if (canseemon(mon) && verbose()) {
            if (is_ammo(singleobj))
                await pline(`${Monnam(mon)} misfires!`);
            else
                await pline(`${Tobjnam(singleobj, "slip")} as ${mon_nam(mon)} throws it!`);
        }
        dx = rn2(3) - 1;
        dy = rn2(3) - 1;
        /* check validity of new direction */
        if (!dx && !dy) {
            await drop_throw(singleobj, 0, game.bhitpos.x, game.bhitpos.y);
            return;
        }
    }

    const sref = { obj: singleobj };
    if (await MT_FLIGHTCHECK(true, 0, dx, dy, sref)) {
        if (sref.obj)
            await drop_throw(singleobj, 0, game.bhitpos.x, game.bhitpos.y);
        return;
    }
    game.mesg_given = 0; /* a 'missile misses' message has not yet been shown */

    /* Note: drop_throw may destroy singleobj.  Since obj must be destroyed
     * early to avoid the dagger bug, anyone who modifies this code should
     * be careful not to use either one after it's been freed.
     */
    if (sym) {
        if (!tethered_weapon) {
            tmp_at(DISP_FLASH, obj_to_glyph(singleobj, rn2_on_display_rng));
        } else {
            tmp_at(DISP_TETHER, obj_to_glyph(singleobj, rn2_on_display_rng));
        }
    }
    while (range-- > 0) { /* Actually the loop is always exited by break */
        singleobj.ox = game.bhitpos.x += dx;
        singleobj.oy = game.bhitpos.y += dy;
        if (cansee(game.bhitpos.x, game.bhitpos.y))
            observe_object(singleobj, Hallucination());

        mtmp = m_at(game.bhitpos.x, game.bhitpos.y);
        if (mtmp && await shade_miss(mon, mtmp, singleobj, true, true)) {
            /* if mtmp is a shade and missile passes harmlessly through it,
               give message and skip it in order to keep going */
            mtmp = null;
        } else if (mtmp) {
            if (await ohitmon(mtmp, singleobj, range, true))
                break;
        } else if (u_at(game.bhitpos.x, game.bhitpos.y)) {
            if (game.multi)
                nomul(0);

            /* hero might be poly'd into a unicorn */
            if (singleobj.oclass === GEM_CLASS
                && await ucatchgem(singleobj, mon))
                break;

            if (!tethered_weapon && await u_catch_thrown_obj(singleobj))
                break;

            if (singleobj.oclass === POTION_CLASS) {
                await potionhit(game.youmonst, singleobj, POTHIT_MONST_THROW);
                break;
            }
            oldumort = u.umortality || 0;

            const oref = { obj: singleobj };
            switch (singleobj.otyp) {
            case O.EGG:
                if (!touch_petrifies(mons[singleobj.corpsenm])) {
                    /* impossible("monster throwing egg type %d") */
                    hitu = 0;
                    break;
                }
                /* FALLTHRU */
            case O.CREAM_PIE:
            case O.BLINDING_VENOM:
                hitu = await thitu(8, 0, oref, null);
                break;
            default: {
                let dam, hitv;

                dam = dmgval(singleobj, game.youmonst);
                hitv = 3 - distmin(u.ux, u.uy, mon.mx, mon.my);
                if (hitv < -4)
                    hitv = -4;
                /* [elves get a shooting bonus, orcs don't...] */
                if (is_elf(mon.data)
                    && objects[singleobj.otyp].oc_skill === -P_BOW) {
                    hitv++;
                    if (mon.mw && mon.mw.otyp === O.ELVEN_BOW)
                        hitv++;
                    if (singleobj.otyp === O.ELVEN_ARROW)
                        dam++;
                }
                if (bigmonst(game.youmonst.data))
                    hitv++;
                hitv += 8 + (singleobj.spe || 0);
                if (dam < 1)
                    dam = 1;
                if (singleobj.otyp !== O.ACID_VENOM)
                    dam = Maybe_Half_Phys(dam);
                hitu = await thitu(hitv, dam, oref, null);
            }
            }
            singleobj = oref.obj;
            if (hitu && singleobj.otrapped /* opoisoned */ && is_poisonable(singleobj)) {
                const onmbuf = xname(singleobj);
                const knmbuf = killer_xname(singleobj);
                await poisoned(onmbuf, A_STR, knmbuf,
                               /* if damage triggered life-saving,
                                  poison is limited to attrib loss */
                               ((u.umortality || 0) > oldumort) ? 0 : 10, true);
            }
            if (hitu && can_blnd(null, game.youmonst,
                                 (singleobj.otyp === O.BLINDING_VENOM)
                                     ? M.AT_SPIT : M.AT_WEAP,
                                 singleobj)) {
                blindinc = rnd(25);
                if (singleobj.otyp === O.CREAM_PIE) {
                    if (!Blind())
                        await pline("Yecch!  You've been creamed.");
                    else
                        await pline(`There's something sticky all over your ${
                            body_part(FACE)}.`);
                } else if (singleobj.otyp === O.BLINDING_VENOM) {
                    let eyes = body_part(EYE);

                    if (eyecount(game.youmonst.data) !== 1)
                        eyes = makeplural(eyes);
                    /* venom in the eyes */
                    if (!Blind())
                        await pline_The("venom blinds you.");
                    else
                        await Your(`${eyes} ${vtense(eyes, "sting")}.`);
                }
            }
            if (hitu && singleobj.otyp === O.EGG) {
                if (!Stoned() && !Stone_resistance()
                    && !(poly_when_stoned(game.youmonst.data)
                         && (() => { throw new Error('m_throw(): polymon(PM_STONE_GOLEM) not ported yet'); })())) {
                    await make_stoned(5, null, KILLED_BY, "");
                }
            }
            await stop_occupation();
            if (hitu) {
                if (!tethered_weapon) {
                    await drop_throw(singleobj, hitu, u.ux, u.uy);
                } else {
                    /* ready for return journey */
                    return_flightpath = true;
                }
                break;
            }
        }

        forcehit = !rn2(5);
        sref.obj = singleobj;
        if (!range || await MT_FLIGHTCHECK(false, forcehit, dx, dy, sref)) {
            singleobj = sref.obj;
            /* end of path or blocked */
            if (singleobj) { /* hits_bars might have destroyed it */
                /* note: pline(The(missile)) rather than pline_The(missile)
                   in order to get "Grimtooth" rather than "The Grimtooth" */
                const ms = m_shot();
                if (range && cansee(game.bhitpos.x, game.bhitpos.y)
                    && IS_SINK(game.level.at(game.bhitpos.x, game.bhitpos.y).typ))
                    await pline(`${The(mshot_xname(singleobj))} ${
                        otense(singleobj, Hallucination() ? "plop" : "drop")} onto the sink.`);
                else if (ms.n > 1
                         && (!game.mesg_given
                             || game.bhitpos.x !== u.ux
                             || game.bhitpos.y !== u.uy)
                         && (cansee(game.bhitpos.x, game.bhitpos.y)
                             || (game.marcher && canseemon(game.marcher))))
                    await pline(`${The(mshot_xname(singleobj))} misses.`);
                if (!tethered_weapon) {
                    await drop_throw(singleobj, 0,
                                     game.bhitpos.x, game.bhitpos.y);
                } else {
                    /*ready for return journey */
                    return_flightpath = true;
                }
            }
            break;
        }
        tmp_at(game.bhitpos.x, game.bhitpos.y);
        /* nh_delay_output(): display timing only */
    }
    tmp_at(game.bhitpos.x, game.bhitpos.y);
    /* nh_delay_output(): display timing only */
    if (arw && return_flightpath)
        await return_from_mtoss(mon, singleobj, tethered_weapon);
        /* mon could be DEADMONSTER now */
    else
        tmp_at(DISP_END, 0);
    game.mesg_given = 0; /* reset */

    if (blindinc) {
        u.ucreamed = (u.ucreamed || 0) + blindinc;
        await make_blinded(BlindedTimeout() + blindinc, false);
        if (!Blind())
            await Your("vision quickly clears."); /* Your1(vision_clears) */
    }
    /* note: all early returns follow drop_throw() which clears thrownobj */
    game.thrownobj = null;
}
/* C ref: mondata.h eyecount() */
function eyecount(ptr) {
    return !haseyes(ptr) ? 0
           : (ptr === mons[M.PM_CYCLOPS] || ptr === mons[M.PM_FLOATING_EYE])
             ? 1 : 2;
}

// C ref: mthrowu.c return_from_mtoss()
async function return_from_mtoss(magr, otmp, tethered_weapon) {
    const impaired = !!(magr.mconf || magr.mstun || magr.mblinded);
    let notcaught = false, hits_thrower = false;
    let x = game.bhitpos.x, y = game.bhitpos.y;
    const made_it_back = rn2(100);
    let dmg = 0;

    if (otmp && made_it_back) {
        /* it made it back to thrower's location */
        if (tethered_weapon) {
            throw new Error('return_from_mtoss(): tethered weapon backtrack not ported yet');
        } else {
            const dx = sgn(x - magr.mx),
                dy = sgn(y - magr.my);

            if (x !== magr.mx || y !== magr.my) {
                tmp_at(DISP_FLASH, obj_to_glyph(otmp, rn2_on_display_rng));
                while (isok(x, y) && (x !== magr.mx || y !== magr.my)) {
                    tmp_at(x, y);
                    /* nh_delay_output() */
                    x -= dx;
                    y -= dy;
                }
                tmp_at(DISP_END, 0);
            }
        }
        x = magr.mx;
        y = magr.my;
        if (!impaired && rn2(100)) {
            if (!game.mtoss_do_not_annoy
                || (game.moves - game.mtoss_do_not_annoy) > 500) {
                await pline(`${Tobjnam(otmp, "return")} to ${
                    s_suffix(mon_nam(magr))} ${mbodypart(magr, HAND)}!`);
                game.mtoss_do_not_annoy = game.moves;
            }
            if (otmp) {
                add_to_minv(magr, otmp);
                if (tethered_weapon) {
                    magr.mw = otmp;
                    otmp.owornmask |= W_WEP;
                }
            }
            if (cansee(x, y))
                newsym(x, y);
        } else {
            dmg = rn2(2);
            throw new Error('return_from_mtoss(): missile landing at/hitting the thrower not ported yet');
        }
    } else {
        /* it didn't make it back to thrower's location */
        if (tethered_weapon)
            tmp_at(DISP_END, 0);
        await You_hear("a loud snap!");
        notcaught = true;
    }
    if (otmp) {
        if (hits_thrower)
            throw new Error('return_from_mtoss(): hitting the thrower not ported yet');
        if (notcaught) {
            if (otmp.lamplit)
                throw new Error('return_from_mtoss(): snuff_candle() not ported yet');
            if (!await ship_object(otmp, x, y, false)) {
                if (await flooreffects(otmp, x, y, "drop")) {
                    if (cansee(x, y))
                        newsym(x, y);
                    return;
                }
                place_object(otmp, x, y);
                stackobj(otmp);
            }
            if (!Deaf() && !Underwater()) {
                /* Some sound effects when item lands in water or lava */
                if (is_pool(x, y) || (is_lava(x, y) && !is_flammable(otmp))) {
                    /* Soundeffect(se_splash, 50) */
                    await pline((weight(otmp) > 9) ? "Splash!" : "Plop!");
                }
            }
            /* obj_sheds_light(otmp): vision_full_recalc */
        }
    }
    void dmg;
    if (cansee(x, y))
        newsym(x, y);
}

// C ref: mthrowu.c thrwmm()
/* Monster throws item at another monster */
export async function thrwmm(mtmp, mtarg) {
    let otmp, mwep;

    /* Polearms won't be applied by monsters against other monsters */
    if (mtmp.weapon_check === NEED_WEAPON || !mtmp.mw) {
        mtmp.weapon_check = NEED_RANGED_WEAPON;
        /* mon_wield_item resets weapon_check as appropriate */
        if (await mon_wield_item(mtmp) !== 0)
            return M_ATTK_MISS;
    }

    /* Pick a weapon */
    otmp = select_rwep(mtmp);
    if (!otmp)
        return M_ATTK_MISS;
    const ispole = is_pole(otmp);

    const x = mtmp.mx;
    const y = mtmp.my;

    mwep = mtmp.mw || null; /* wielded weapon */

    if (!ispole && m_lined_up(mtarg, mtmp)) {
        const chance = Math.max(BOLT_LIM - distmin(x, y, mtarg.mx, mtarg.my), 1);

        if (!mtarg.mflee || !rn2(chance)) {
            if (ammo_and_launcher(otmp, mwep)
                && dist2(mtmp.mx, mtmp.my, mtarg.mx, mtarg.my)
                   > PET_MISSILE_RANGE2)
                return M_ATTK_MISS; /* Out of range */
            /* Set target monster */
            game.mtarget = mtarg;
            game.marcher = mtmp;
            await monshoot(mtmp, otmp, mwep); /* multishot shooting or throwing */
            game.marcher = game.mtarget = null;
            nomul(0);
            return M_ATTK_HIT;
        }
    }
    return M_ATTK_MISS;
}

// C ref: mthrowu.c spitmm()
/* monster spits substance at monster */
export async function spitmm(mtmp, mattk, mtarg) {
    let otmp;

    if (mtmp.mcan) {
        if (!Deaf() && mdistu(mtmp) < BOLT_LIM * BOLT_LIM) {
            if (canspotmon(mtmp)) {
                await pline(`A dry rattle comes from ${s_suffix(mon_nam(mtmp))} throat.`);
            } else {
                /* Soundeffect(se_dry_throat_rattle, 50) */
                await You_hear("a dry rattle nearby.");
            }
        }
        return M_ATTK_MISS;
    }
    if (m_lined_up(mtarg, mtmp)) {
        const utarg = (mtarg === game.youmonst);
        const tx = utarg ? mtmp.mux : mtarg.mx;
        const ty = utarg ? mtmp.muy : mtarg.my;

        switch (mattk.adtyp) {
        case M.AD_BLND:
        case M.AD_DRST:
            otmp = mksobj(O.BLINDING_VENOM, true, false);
            break;
        default:
            /* impossible("bad attack type in spitmm") */
            /* FALLTHRU */
        case M.AD_ACID:
            otmp = mksobj(O.ACID_VENOM, true, false);
            break;
        }
        if (!rn2(BOLT_LIM - distmin(mtmp.mx, mtmp.my, tx, ty))) {
            if (canseemon(mtmp))
                await pline(`${Monnam(mtmp)} spits venom!`);
            if (!utarg)
                game.mtarget = mtarg;
            await m_throw(mtmp, mtmp.mx, mtmp.my, sgn(game.tbx), sgn(game.tby),
                          distmin(mtmp.mx, mtmp.my, tx, ty), otmp);
            game.mtarget = null;
            nomul(0);

            /* If this is a pet, it'll get hungry. Minions and
             * spell beings won't hunger */
            if (mtmp.mtame && !mtmp.isminion) {
                const dog = mtmp.edog;

                /* Hunger effects will catch up next move */
                if (dog.hungrytime > 1)
                    dog.hungrytime -= 5;
            }

            return M_ATTK_HIT;
        } else {
            obj_extract_self(otmp);
            obfree(otmp, null);
        }
    }
    return M_ATTK_MISS;
}

// C ref: mthrowu.c breathwep_name()
/* Return the name of a breath weapon. If the player is hallucinating,
 * return a silly name instead.  typ is AD_MAGM, AD_FIRE, etc */
const breathwep = [
    "fragments", "fire", "frost", "sleep gas", "a disintegration blast",
    "lightning", "poison gas", "acid", "strange breath #8",
    "strange breath #9"
];

// C ref: mthrowu.c hallublasts[]
/* hallucinatory ray types */
const hallublasts = [
    "asteroids", "beads", "bubbles", "butterflies", "champagne", "chaos",
    "coins", "cotton candy", "crumbs", "dark matter", "darkness", "data",
    "dust specks", "emoticons", "emotions", "entropy", "flowers", "foam",
    "fog", "gamma rays", "gelatin", "gemstones", "ghosts", "glass shards",
    "glitter", "good vibes", "gravel", "gravity", "gravy", "grawlixes",
    "holy light", "hornets", "hot air", "hyphens", "hypnosis", "infrared",
    "insects", "jargon", "laser beams", "leaves", "lightening", "logic gates",
    "magma", "marbles", "mathematics", "megabytes", "metal shavings",
    "metapatterns", "meteors", "mist", "mud", "music", "nanites", "needles",
    "noise", "nostalgia", "oil", "paint", "photons", "pixels", "plasma",
    "polarity", "powder", "powerups", "prismatic light", "pure logic",
    "purple", "radio waves", "rainbows", "rock music", "rocket fuel", "rope",
    "sadness", "salt", "sand", "scrolls", "sludge", "smileys", "snowflakes",
    "sparkles", "specularity", "spores", "stars", "steam", "tetrahedrons",
    "text", "the past", "tornadoes", "toxic waste", "ultraviolet light",
    "viruses", "water", "waveforms", "wind", "X-rays", "zorkmids"
];

// C ref: mthrowu.c rnd_hallublast()
/* Return a random hallucinatory blast. */
export function rnd_hallublast() {
    return ROLL_FROM(hallublasts);
}

function breathwep_name(typ) {
    if (Hallucination())
        return rnd_hallublast();
    return breathwep[typ - 1]; /* BZ_OFS_AD(typ) */
}

// C ref: mthrowu.c breamm()
/* monster breathes at monster (ranged) */
export async function breamm(mtmp, mattk, mtarg) {
    const typ = get_atkdam_type(mattk.adtyp);
    const utarget = (mtarg === game.youmonst);

    if (m_lined_up(mtarg, mtmp)) {
        if (mtmp.mcan) {
            if (!Deaf()) {
                if (canseemon(mtmp)) {
                    await pline(`${Monnam(mtmp)} coughs.`);
                } else {
                    /* Soundeffect(se_cough, 100) */
                    await You_hear("a cough.");
                }
            }
            return M_ATTK_MISS;
        }

        /* if we've seen the actual resistance, don't bother, or
           if we're close by and they reflect, just jump the player */
        if (utarget && (m_seenres(mtmp, cvt_adtyp_to_mseenres(typ))
                        || m_seenres(mtmp, M_SEEN_REFL)))
            return M_ATTK_HIT;

        if (!mtmp.mspec_used && rn2(3)) {
            /* BZ_VALID_ADTYP(typ): AD_MAGM .. AD_SPC2 */
            if (typ >= M.AD_MAGM && typ <= M.AD_SPC2) {
                if (canseemon(mtmp))
                    await pline(`${Monnam(mtmp)} breathes ${breathwep_name(typ)}!`);
                game.buzzer = mtmp;
                /* BZ_M_BREATH(BZ_OFS_AD(typ)) */
                await dobuzz(-20 - (typ - 1), mattk.damn,
                             mtmp.mx, mtmp.my, sgn(game.tbx), sgn(game.tby),
                             utarget, utarget, false);
                game.buzzer = null;
                nomul(0);
                /* breath runs out sometimes. Also, give monster some
                 * cunning; don't breath if the target fell asleep.
                 */
                if (!utarget || !rn2(3))
                    mtmp.mspec_used = 8 + rn2(18);
                if (utarget && typ === M.AD_SLEE && !Sleep_resistance())
                    mtmp.mspec_used += rnd(20);

                /* If this is a pet, it'll get hungry. Minions and
                 * spell beings won't hunger */
                if (mtmp.mtame && !mtmp.isminion) {
                    const dog = mtmp.edog;

                    /* Hunger effects will catch up next move */
                    if (dog.hungrytime >= 10)
                        dog.hungrytime -= 10;
                }
            } else {
                /* impossible("Breath weapon %d used", typ-1) */
            }
        } else
            return M_ATTK_MISS;
    }
    return M_ATTK_HIT;
}

// C ref: mthrowu.c m_useupall()
/* remove an entire item from a monster's inventory; destroy that item */
export function m_useupall(mon, obj) {
    extract_from_minvent(mon, obj, true, false);
    obfree(obj, null);
}
/* m_useupall() for a generator caller: yields extract_from_minvent()'s
   update_mon_extrinsics() messages */
export function* m_useupall_g(mon, obj) {
    yield* extract_from_minvent_g(mon, obj, true, false);
    obfree(obj, null);
}

// C ref: mthrowu.c m_useup()
/* remove one instance of an item from a monster's inventory */
export function m_useup(mon, obj) {
    if (obj.quan > 1) {
        obj.quan--;
        obj.owt = weight(obj);
    } else {
        m_useupall(mon, obj);
    }
}
/* m_useup() for a generator caller (see m_useupall_g()) */
export function* m_useup_g(mon, obj) {
    if (obj.quan > 1) {
        obj.quan--;
        obj.owt = weight(obj);
    } else {
        yield* m_useupall_g(mon, obj);
    }
}

// C ref: mthrowu.c thrwmu()
/* monster attempts ranged weapon attack against player */
export async function thrwmu(mtmp) {
    const u = game.u;
    let otmp, mwep;
    let onm;
    let rang;
    let arw;
    let always_toss = false;

    /* Rearranged beginning so monsters can use polearms not in a line */
    if (mtmp.weapon_check === NEED_WEAPON || !mtmp.mw) {
        mtmp.weapon_check = NEED_RANGED_WEAPON;
        /* mon_wield_item resets weapon_check as appropriate */
        if (await mon_wield_item(mtmp) !== 0)
            return;
    }

    /* Pick a weapon */
    otmp = select_rwep(mtmp);
    if (!otmp)
        return;

    if (is_pole(otmp)) {
        let dam, hitv;

        if (otmp !== mtmp.mw)
            return; /* polearm, aklys must be wielded */

        /*
         * MON_POLE_DIST encompasses knight's move range (5): two spots
         * away provided it's not on a straight diagonal, same as skilled
         * hero.  Using polearm while adjacent is allowed but the verb
         * is adjusted from "thrusts" to "bashes", where the hero would
         * have to switch from applying a polearm to ordinary melee attack
         * to accomplish that.
         */
        rang = dist2(mtmp.mx, mtmp.my, mtmp.mux, mtmp.muy);
        if (rang > MON_POLE_DIST || !couldsee(mtmp.mx, mtmp.my))
            return; /* Out of range, or intervening wall */

        if (canseemon(mtmp)) {
            onm = xname(otmp);
            /* pline_mon(): tty ignores the position */
            await pline(`${Monnam(mtmp)} ${
                /* "thrusts" or "swings", or "bashes with" if adjacent */
                mswings_verb(otmp, (rang <= 2) ? true : false)} ${
                obj_is_pname(otmp) ? the(onm) : an(onm)}.`);
        }

        dam = dmgval(otmp, game.youmonst);
        hitv = 3 - distmin(u.ux, u.uy, mtmp.mx, mtmp.my);
        if (hitv < -4)
            hitv = -4;
        if (bigmonst(game.youmonst.data))
            hitv++;
        hitv += 8 + (otmp.spe || 0);
        if (dam < 1)
            dam = 1;

        await thitu(hitv, Maybe_Half_Phys(dam), { obj: otmp }, null);
        await stop_occupation();
        return;
    } else if ((arw = autoreturn_weapon(otmp)) != null && !mwelded(otmp)) {
        rang = dist2(mtmp.mx, mtmp.my, mtmp.mux, mtmp.muy);
        if (rang > arw.range || !couldsee(mtmp.mx, mtmp.my))
            return; /* Out of range, or intervening wall */
        always_toss = true;
    }

    const x = mtmp.mx;
    const y = mtmp.my;
    /* If you are coming toward the monster, the monster
     * should try to soften you up with missiles.  If you are
     * going away, you are probably hurt or running.  Give
     * chase, but if you are getting too far away, throw.
     */
    if (!lined_up(mtmp)
        || (URETREATING(x, y)
            && (!always_toss
                && rn2(BOLT_LIM - distmin(x, y, mtmp.mux, mtmp.muy)))))
        return;

    mwep = mtmp.mw || null; /* wielded weapon */
    await monshoot(mtmp, otmp, mwep); /* multishot shooting or throwing */
    nomul(0);
}

// C ref: mthrowu.c spitmu()
/* monster spits substance at you */
export async function spitmu(mtmp, mattk) {
    return await spitmm(mtmp, mattk, game.youmonst);
}

// C ref: mthrowu.c breamu()
/* monster breathes at you (ranged) */
export async function breamu(mtmp, mattk) {
    return await breamm(mtmp, mattk, game.youmonst);
}

// C ref: mthrowu.c m_lined_up()
export function m_lined_up(mtarg, mtmp) {
    const u = game.u;
    const utarget = (mtarg === game.youmonst);
    const tx = utarget ? mtmp.mux : mtarg.mx;
    const ty = utarget ? mtmp.muy : mtarg.my;
    const ignore_boulders = utarget && (throws_rocks(mtmp.data)
                                        || m_carrying(mtmp, O.WAN_STRIKING));

    /* hero concealment usually trumps monst awareness of being lined up */
    if (utarget && u.umonnum !== u.umonster && rn2(25)
        && (u.uundetected || (game.youmonst.m_ap_type
                              && game.youmonst.m_ap_type !== M_AP_NOTHING
                              && game.youmonst.m_ap_type !== M_AP_MONSTER)))
        return false;

    /* [no callers care about the 1 vs 2 situation any more] */
    return linedup(tx, ty, mtmp.mx, mtmp.my,
                   utarget ? (ignore_boulders ? 1 : 2) : 0);
}

// C ref: mthrowu.c hit_bars()
export async function hit_bars(
    objp,             /* objp.obj will be set to null if object breaks */
    objx, objy,       /* hero's (when wielded) or missile's spot */
    barsx, barsy,     /* adjacent spot where bars are located */
    breakflags) {     /* breakage control */
    const otmp = objp.obj;
    const obj_type = otmp.otyp;
    const nodissolve = ((game.level.at(barsx, barsy).wall_info || 0)
                        & W_NONDIGGABLE) !== 0,
        your_fault = (breakflags & BRK_BY_HERO) !== 0,
        melee_attk = (breakflags & BRK_MELEE) !== 0;
    let noise = 0;

    if (your_fault
        ? await hero_breaks(otmp, objx, objy, breakflags)
        : await breaks(otmp, objx, objy)) {
        objp.obj = null; /* object is now gone */
        /* breakage makes its own noises */
        if (obj_type === O.POT_ACID) {
            if (cansee(barsx, barsy) && !nodissolve) {
                await pline_The("iron bars are dissolved!");
            } else {
                /* Soundeffect(se_angry_snakes, 100) */
                await You_hear(Hallucination() ? "angry snakes!"
                                               : "a hissing noise.");
            }
            if (!nodissolve)
                await dissolve_bars(barsx, barsy);
        }
    } else {
        if (!Deaf()) {
            const barsounds = ["", "Whang", "Whap", "Flapp", "Clink", "Clonk"];
            const bsindx = (obj_type === O.BOULDER || obj_type === O.HEAVY_IRON_BALL)
                           ? 1
                           : harmless_missile(otmp) ? 2
                           : is_flimsy(otmp) ? 3
                           : (otmp.oclass === COIN_CLASS
                              || objects[obj_type].oc_material === GOLD
                              || objects[obj_type].oc_material === SILVER)
                             ? 4
                             : barsounds.length - 1;

            /* Soundeffect(se[bsindx], 100) */
            await pline(`${barsounds[bsindx]}!`);
        }
        if (!(harmless_missile(otmp) || is_flimsy(otmp)))
            noise = 4 * 4;

        if (your_fault && (otmp.otyp === O.WAR_HAMMER
                           || otmp.otyp === O.HEAVY_IRON_BALL)) {
            /* iron ball isn't a weapon or wep-tool so doesn't use obj->spe;
               weight is normally 480 but can be increased by increments
               of 160 (scrolls of punishment read while already punished) */
            const spe = ((otmp.otyp === O.HEAVY_IRON_BALL) /* 3+ for iron ball */
                         ? Math.trunc(otmp.owt / WT_IRON_BALL_INCR)
                         : otmp.spe);
            /* chance: used in saving throw for the bars; more likely to
               break those when 'chance' is _lower_; acurrstr(): 3..25 */
            const chance = (melee_attk ? 40 : 60) - acurrstr() - spe;

            if (!rn2(Math.max(2, chance))) {
                await You("break the bars apart!");
                await dissolve_bars(barsx, barsy);
                noise = noise * 2;
            }
        }

        if (noise)
            await wake_nearto(barsx, barsy, noise);
    }
}

// C ref: dothrow.c harmless_missile()
/* Will 'obj' cause damage if it falls on hero's head when thrown upward? */
function harmless_missile(obj) {
    const otyp = obj.otyp;

    /* this list is fairly arbitrary */
    switch (otyp) {
    case O.SLING:
    case O.EUCALYPTUS_LEAF:
    case O.KELP_FROND:
    case O.SPRIG_OF_WOLFSBANE:
    case O.FORTUNE_COOKIE:
    case O.PANCAKE:
        return true;
    case O.RUBBER_HOSE:
    case O.BAG_OF_TRICKS:
        return ((obj.spe || 0) < 1);
    case O.SACK:
    case O.OILSKIN_SACK:
    case O.BAG_OF_HOLDING:
        return !(obj.cobj && obj.cobj.length);
    default:
        if (obj.oclass === SPBOOK_CLASS || obj.oclass === O.SCROLL_CLASS)
            throw new Error('harmless_missile(): paper objects not ported yet');
        break;
    }
    return false;
}

// C ref: mthrowu.c hits_bars()
/* TRUE iff thrown/kicked/rolled object doesn't pass through iron bars */
export async function hits_bars(
    obj_p,          /* obj_p.obj will be set to null if object breaks */
    x, y,
    barsx, barsy,
    always_hit,     /* caller can force a hit for items which would
                     * fit through */
    whodidit) {     /* 1==hero, 0=other, -1==just check whether it
                     * will pass through */
    const otmp = obj_p.obj;
    const obj_type = otmp.otyp;
    let hits = always_hit;

    if (!hits)
        switch (otmp.oclass) {
        case WEAPON_CLASS: {
            const oskill = objects[obj_type].oc_skill;

            hits = (oskill !== -P_BOW && oskill !== -P_CROSSBOW
                    && oskill !== -P_DART && oskill !== -P_SHURIKEN
                    && oskill !== P_SPEAR
                    && oskill !== P_KNIFE); /* but not dagger */
            break;
        }
        case ARMOR_CLASS:
            hits = (objects[obj_type].oc_armcat !== O.ARM_GLOVES);
            break;
        case TOOL_CLASS:
            hits = (obj_type !== O.SKELETON_KEY && obj_type !== O.LOCK_PICK
                    && obj_type !== O.CREDIT_CARD && obj_type !== O.TALLOW_CANDLE
                    && obj_type !== O.WAX_CANDLE && obj_type !== O.LENSES
                    && obj_type !== O.TIN_WHISTLE && obj_type !== O.MAGIC_WHISTLE);
            break;
        case ROCK_CLASS: /* includes boulder */
            if (obj_type !== O.STATUE || mons[otmp.corpsenm].msize > M.MZ_TINY)
                hits = true;
            break;
        case FOOD_CLASS:
            if (obj_type === O.CORPSE && mons[otmp.corpsenm].msize > M.MZ_TINY)
                hits = true;
            else
                hits = (obj_type === O.MEAT_STICK
                        || obj_type === O.ENORMOUS_MEATBALL);
            break;
        case SPBOOK_CLASS:
        case WAND_CLASS:
        case BALL_CLASS:
        case CHAIN_CLASS:
            hits = true;
            break;
        default:
            break;
        }

    if (hits && whodidit !== -1) {
        await hit_bars(obj_p, x, y, barsx, barsy,
                       (whodidit === 1) ? BRK_BY_HERO : 0);
    }

    return !!hits;
}
