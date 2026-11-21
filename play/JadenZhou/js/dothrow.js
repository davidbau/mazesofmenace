// dothrow.js -- throwing and firing.
// C ref: dothrow.c
//
// Ported so far: the #fire command's fireassist (swap to or wield the
// launcher and requeue #fire) and throw_obj() up to the direction
// prompt.  Throwing itself (throwit()), autoquiver and doquiver_core()
// are not ported yet.

import { game } from './gstate.js';
import { You, You_cant } from './display.js';
import { check_capacity } from './hack.js';
import { getdir } from './cmd.js';
import { is_ammo, is_pole, ammo_and_launcher, doquiver_core } from './wield.js';
import { ECMD_OK, ECMD_TIME, ECMD_CANCEL, W_WEP } from './const.js';
import { BULLWHIP, BOOMERANG, AKLYS } from './objects.js';
import { M1_NOHANDS, M1_NOTAKE, S_COCKATRICE, PM_CHICKATRICE, PM_COCKATRICE,
         PM_MEDUSA, mons } from './monsters.js';
import { pline, newsym, flush_screen, canspotmon, canseemon } from './display.js';
import { vision_recalc } from './vision.js';
import { u_on_newpos } from './mklev.js';
import { check_special_room } from './hack.js';
import { m_at, may_passwall, closed_door, sobj_at, is_pool, is_lava } from './makemon.js';
import { bad_rock, wake_nearto, wakeup, setmangry } from './mon.js';
import { t_at, VIBRATING_SQUARE, WEB } from './trap.js';
import { x_monnam, ARTICLE_A, SUPPRESS_SADDLE, AUGMENT_IT } from './do_name.js';
import { BOULDER } from './objects.js';
import { isok, IS_DOOR, IS_OBSTRUCTED, D_ISOPEN, IRONBARS, PASSES_WALLS,
         LEVITATION, FLYING, MAGIC_PORTAL, FIRE_TRAP, STRAT_WAITMASK } from './const.js';
import { rn2, rnd } from './rng.js';
import { CONFUSION, STUNNED, FUMBLING, BLINDED, HALLUC, HALLUC_RES, STONE_RES, DEAF,
         A_STR, A_DEX, A_CON, STR19, P_SLING, P_SPEAR, P_SHURIKEN,
         P_DAGGER, P_KNIFE, P_DART, P_CROSSBOW, P_SABER, P_SHORT_SWORD,
         P_SKILLED, P_EXPERT, SLT_ENCUMBER, LOST_THROWN, BOLT_LIM, TT_INFLOOR,
         THROWN_WEAPON, THROWN_TETHERED_WEAPON, WATER, LAVAWALL, ZAP_POS,
         IS_SINK, IS_SOFT, M_AP_OBJECT, HAND, Is_airlevel, GETOBJ_EXCLUDE,
         GETOBJ_DOWNPLAY, GETOBJ_SUGGEST, GETOBJ_PROMPT,
         GETOBJ_ALLOWCNT } from './const.js';
import { objects, COIN_CLASS, WEAPON_CLASS, GEM_CLASS, ARMOR_CLASS,
         POTION_CLASS, VENOM_CLASS, GLASS, PIERCE, CORPSE, ROCK,
         HEAVY_IRON_BALL, WAR_HAMMER, PICK_AXE, DWARVISH_MATTOCK, YA, YUMI,
         ELVEN_ARROW, ELVEN_BOW, ORCISH_ARROW, ORCISH_BOW, STRANGE_OBJECT,
         EXPENSIVE_CAMERA, POT_WATER, EGG, CREAM_PIE, MELON, ACID_VENOM,
         BLINDING_VENOM } from './objects.js';
import { PM_CAVE_DWELLER, PM_MONK, PM_RANGER, PM_ROGUE, PM_NINJA, PM_SAMURAI,
         PM_WIZARD, PM_CLERIC, PM_HEALER, PM_TOURIST, PM_VALKYRIE, PM_ELF,
         PM_ORC, PM_GNOME, PM_HUMAN, PM_DWARF, PM_SHADE,
         M2_ROCKTHROW } from './monsters.js';
import { ART_MJOLLNIR } from './artilist.js';
import { welded, matching_launcher, is_missile, is_wet_towel } from './wield.js';
import { getobj, freeinv, stackobj } from './invent.js';
import { ACURR, acurrstr, exercise } from './attrib.js';
import { calc_capacity } from './hack.js';
import { canletgo, flooreffects, obj_no_longer_held, ship_object,
         impact_disturbs_zombies } from './do.js';
import { u_wipe_engr } from './engrave.js';
import { splitobj, place_object, is_flammable, weight } from './mkobj.js';
import { encumber_msg } from './pickup.js';
import { remove_worn_item } from './steal.js';
import { weapon_type, P_SKILL } from './weapon.js';
import { weapon_descr, skill_name, inside_shop, body_part } from './insight.js';
import { xname, an, singular, The, Tobjnam } from './objnam.js';
import { the } from './iactions.js';
import { cansee } from './vision.js';
import { obj_resists } from './dogmove.js';
import { map_invisible, unmap_object, glyph_is_invisible } from './display.js';

/* C ref: weight.h WT_SPLASH_THRESHOLD -- weight needed to make splash in
   water */
const WT_SPLASH_THRESHOLD = 9;

/* C ref: mondata.h touch_petrifies() */
function touch_petrifies(ptr) {
    const n = mons.indexOf(ptr);
    return n === PM_COCKATRICE || n === PM_CHICKATRICE;
}

/* C ref: mondata.h nohands(), notake() */
function nohands(ptr) { return (ptr.mflags1 & M1_NOHANDS) !== 0; }
function notake(ptr) { return (ptr.mflags1 & M1_NOTAKE) !== 0; }

/* C ref: cmd.c cmdq_add_ec(CQ_CANNED, fn), cmdq_add_key(CQ_CANNED, key);
   the extended command is kept by its cmd.c function name */
function cmdq_add_ec(fn) {
    if (!game.cmdq) game.cmdq = [];
    game.cmdq.push({ typ: 'ec', fn });
}
function cmdq_add_key(key) {
    if (!game.cmdq) game.cmdq = [];
    game.cmdq.push({ typ: 'key', key });
}

/* C ref: dothrow.c AutoReturn() -- uwep might already be removed from
   inventory so test for W_WEP instead */
function AutoReturn(o, wmsk) {
    return (((wmsk & W_WEP) !== 0
             && (o.otyp === AKLYS
                 || (o.oartifact === ART_MJOLLNIR
                     && game.urole.mnum === PM_VALKYRIE)))
            || o.otyp === BOOMERANG);
}

// C ref: dothrow.c ok_to_throw() -- common to dothrow() and dofire()
async function ok_to_throw() {
    const shotlimit = Math.max(0, game.command_count || 0);
    game.multi = 0; /* reset; it's been used up */

    if (notake(game.youmonst.data)) {
        await You("are physically incapable of throwing or shooting anything.");
        return { ok: false, shotlimit };
    } else if (nohands(game.youmonst.data)) {
        await You_cant("throw or shoot without hands."); /* not body_part(HAND) */
        return { ok: false, shotlimit };
    }
    if (await check_capacity(null))
        return { ok: false, shotlimit };
    return { ok: true, shotlimit };
}

/* C ref: youprop.h -- the hero's properties used by the throwing code */
function uprop(p) {
    const u = game.u;
    if (!u.uprops[p]) u.uprops[p] = { intrinsic: 0, extrinsic: 0, blocked: 0 };
    return u.uprops[p];
}
function uhave(p) { return !!(uprop(p).intrinsic || uprop(p).extrinsic); }
function Confusion() { return uhave(CONFUSION); }
function Stunned() { return uhave(STUNNED); }
function Fumbling() { return uhave(FUMBLING); }
function Blind() { return uhave(BLINDED) && !uprop(BLINDED).blocked; }
function Hallucination() {
    return !!(uprop(HALLUC).intrinsic
              && !(uprop(HALLUC_RES).intrinsic || uprop(HALLUC_RES).extrinsic));
}
function Levitation() {
    return !!((uprop(LEVITATION).intrinsic || uprop(LEVITATION).extrinsic)
              && !uprop(LEVITATION).blocked);
}
function Stone_resistance() { return uhave(STONE_RES); }
function Underwater() { return !!game.u.uinwater; }
function Upolyd() { return game.u.umonnum !== game.u.umonster; }
function Role_if(pm) { return game.urole.mnum === pm; }
/* C ref: obj.h is_art(), is_pick(); mondata.h throws_rocks() */
function is_art(o, art) { return !!(o && o.oartifact === art); }
function is_pick(otmp) {
    return otmp.otyp === PICK_AXE || otmp.otyp === DWARVISH_MATTOCK;
}
function throws_rocks(ptr) { return (ptr.mflags2 & M2_ROCKTHROW) !== 0; }

// C ref: dothrow.c multishot_class_bonus()
export function multishot_class_bonus(pm, ammo, launcher) /* can be NULL */ {
    let multishot = 0;
    const skill = objects[ammo.otyp].oc_skill;

    switch (pm) {
    case PM_CAVE_DWELLER:
        /* give bonus for low-tech gear */
        if (skill === -P_SLING || skill === P_SPEAR)
            multishot++;
        break;
    case PM_MONK:
        /* allow higher volley count despite skill limitation */
        if (skill === -P_SHURIKEN)
            multishot++;
        break;
    case PM_RANGER:
        /* arbitrary; encourage use of other missiles beside daggers */
        if (skill !== P_DAGGER)
            multishot++;
        break;
    case PM_ROGUE:
        /* possibly should add knives... */
        if (skill === P_DAGGER)
            multishot++;
        break;
    case PM_NINJA:
        if (skill === -P_SHURIKEN || skill === -P_DART)
            multishot++;
        /*FALLTHRU*/
    // eslint-disable-next-line no-fallthrough
    case PM_SAMURAI:
        /* role-specific launcher and its ammo */
        if (ammo.otyp === YA && launcher && launcher.otyp === YUMI)
            multishot++;
        break;
    default:
        break; /* No bonus */
    }

    return multishot;
}

// C ref: dothrow.c throw_obj()
/* Throw the selected object, asking for direction */
async function throw_obj(obj, shotlimit) {
    const g = game;
    const u = g.u;
    let otmp, oldslot;
    let multishot;
    let skill;
    let wep_mask;
    let twoweap, weakmultishot;
    let res = ECMD_TIME;
    const save_osplit = { ...(g.context.objsplit || { parent_oid: 0, child_oid: 0 }) };

    unsplit: {
        /* ask "in what direction?" */
        if (!(await getdir(null))) {
            /* No direction specified, so cancel the throw */
            res = ECMD_CANCEL; /* no time passes */
            break unsplit;
        }

        /*
         * Throwing gold is usually for getting rid of it when
         * a leprechaun approaches, or for bribing an oncoming
         * angry monster.  So throw the whole object.
         *
         * If the gold is in quiver, throw one coin at a time,
         * possibly using a sling.
         */
        if (obj.oclass === COIN_CLASS && obj !== g.uquiver) {
            /* throw_gold will unsplit the stack itself if necessary and may
               have freed the object, so don't route through unsplit_stack */
            throw new Error('throw_obj(): throw_gold() not ported yet');
        }

        if (!await canletgo(obj, "throw")) {
            res = ECMD_OK;
            break unsplit;
        }
        if (is_art(obj, ART_MJOLLNIR) && obj !== g.uwep) {
            await pline(`${The(xname(obj))} must be wielded before it can be thrown.`);
            res = ECMD_OK;
            break unsplit;
        }
        if ((is_art(obj, ART_MJOLLNIR) && ACURR(A_STR) < STR19(25))
            || (obj.otyp === BOULDER && !throws_rocks(g.youmonst.data))) {
            await pline("It's too heavy.");
            res = ECMD_TIME;
            break unsplit;
        }
        if (!u.dx && !u.dy && !u.dz) {
            await You("cannot throw an object at yourself.");
            res = ECMD_OK;
            break unsplit;
        }
        u_wipe_engr(2);
        if (!g.uarmg && obj.otyp === CORPSE
            && touch_petrifies(mons[obj.corpsenm]) && !Stone_resistance())
            throw new Error('throw_obj(): instapetrify() from a bare-handed corpse not ported yet');
        if (welded(obj))
            throw new Error('throw_obj(): weldmsg() not ported yet');
        if (is_wet_towel(obj))
            throw new Error('throw_obj(): dry_a_towel() not ported yet');

        /* Multishot calculations
         * (potential volley of up to N missiles; default for N is 1)
         */
        multishot = 1;
        skill = objects[obj.otyp].oc_skill;
        if (obj.quan > 1 /* no point checking if there's only 1 */
            /* ammo requires corresponding launcher be wielded */
            && (is_ammo(obj) ? matching_launcher(obj, g.uwep)
                             /* otherwise any stackable (non-ammo) weapon */
                             : obj.oclass === WEAPON_CLASS)
            && !(Confusion() || Stunned())) {
            /* some roles don't get a volley bonus until becoming expert */
            weakmultishot = (Role_if(PM_WIZARD) || Role_if(PM_CLERIC)
                             || (Role_if(PM_HEALER) && skill !== P_KNIFE)
                             || (Role_if(PM_TOURIST) && skill !== -P_DART)
                             /* poor dexterity also inhibits multishot */
                             || Fumbling() || ACURR(A_DEX) <= 6);

            /* Bonus if the player is proficient in this weapon... */
            switch (P_SKILL(weapon_type(obj))) {
            case P_EXPERT:
                multishot++;
                /*FALLTHRU*/
            // eslint-disable-next-line no-fallthrough
            case P_SKILLED:
                if (!weakmultishot)
                    multishot++;
                break;
            default: /* basic or unskilled: no bonus */
                break;
            }
            /* ...or is using a special weapon for their role... */
            multishot += multishot_class_bonus(g.urole.mnum, obj, g.uwep);

            /* ...or using their race's special bow; no bonus for spears */
            if (!weakmultishot) {
                switch (g.urace.mnum) {
                case PM_ELF:
                    if (obj.otyp === ELVEN_ARROW && g.uwep
                        && g.uwep.otyp === ELVEN_BOW)
                        multishot++;
                    break;
                case PM_ORC:
                    if (obj.otyp === ORCISH_ARROW && g.uwep
                        && g.uwep.otyp === ORCISH_BOW)
                        multishot++;
                    break;
                case PM_GNOME:
                    /* arbitrary; there isn't any gnome-specific gear */
                    if (skill === -P_CROSSBOW)
                        multishot++;
                    break;
                case PM_HUMAN:
                case PM_DWARF:
                default:
                    break; /* No bonus */
                }

                /* when launcher is own quest artifact, give extra +1 with
                   any type of ammo appropriate for that launcher */
                if (g.uwep && g.uwep.oartifact
                    && g.uwep.oartifact === g.urole.questarti
                    && ammo_and_launcher(obj, g.uwep))
                    ++multishot;
            }

            /* crossbows are slow to load and probably shouldn't allow
               multiple shots at all, but that would result in players never
               using them; instead, high strength is necessary to load and
               shoot quickly */
            if (multishot > 1 && skill === -P_CROSSBOW
                && ammo_and_launcher(obj, g.uwep)
                && acurrstr() < (g.urace.mnum === PM_GNOME ? 16 : 18))
                multishot = rnd(multishot);

            multishot = rnd(multishot);
            if (multishot > obj.quan)
                multishot = obj.quan;
            if (shotlimit > 0 && multishot > shotlimit)
                multishot = shotlimit;
        }

        if (!g.m_shot) g.m_shot = { s: false, o: 0, n: 0, i: 0 };
        g.m_shot.s = ammo_and_launcher(obj, g.uwep) ? true : false;
        /* give a message if shooting more than one, or if player
           attempted to specify a count */
        if (multishot > 1 || shotlimit > 0) {
            /* "You shoot N arrows." or "You throw N daggers." */
            await You(`${g.m_shot.s ? "shoot" : "throw"} ${multishot} ${
                (multishot === 1) ? singular(obj, xname) : xname(obj)}.`);
        }

        wep_mask = obj.owornmask;
        oldslot = null;
        g.m_shot.o = obj.otyp;
        g.m_shot.n = multishot;
        for (g.m_shot.i = 1; g.m_shot.i <= g.m_shot.n; g.m_shot.i++) {
            twoweap = u.twoweap;
            /* split this object off from its slot if necessary */
            if (obj.quan > 1) {
                otmp = splitobj(obj, 1);
            } else {
                otmp = obj;
                if (otmp.owornmask)
                    await remove_worn_item(otmp, false);
                oldslot = obj.nobj;
                /* obj will leave inventory and may be freed by throwit,
                   don't try to unsplit it from potential parent stack
                   below */
                obj = null;
            }
            freeinv(otmp);
            await throwit(otmp, wep_mask, twoweap, oldslot);
            await encumber_msg();
        }
        g.m_shot.n = g.m_shot.i = 0;
        g.m_shot.o = STRANGE_OBJECT;
        g.m_shot.s = false;
    }
    /* unsplit_stack: */
    /* might need to undo an object split.
     * We used to use freeinv(obj),addinv(obj) here, but that can
     * merge obj into another stack--usually quiver--even if it hadn't
     * been split from there (possibly triggering a panic in addinv),
     * and freeinv+addinv potentially has other side-effects.
     */
    if (obj && obj !== g.uquiver
        && (obj.o_id === save_osplit.parent_oid
            || obj.o_id === save_osplit.child_oid)) {
        /* futureproofing: objsplit will have been affected if partial stack
           was thrown; objects will have been split off stack to throw. */
        g.context.objsplit = save_osplit;
        throw new Error('throw_obj(): unsplitobj() not ported yet');
    }
    return res;
}

// C ref: dothrow.c throwing_weapon()
/* return true for weapon meant to be thrown; excludes ammo */
function throwing_weapon(obj) {
    const oc = objects[obj.otyp];
    return !!(is_missile(obj) || is_spear(obj)
              /* daggers and knife (excludes scalpel) */
              || (is_blade(obj) && !is_sword(obj) && (oc.oc_dir & PIERCE))
              /* special cases [might want to add AXE] */
              || obj.otyp === WAR_HAMMER || obj.otyp === AKLYS);
}
/* C ref: obj.h is_spear(), is_blade(), is_sword() */
function is_spear(otmp) {
    return otmp.oclass === WEAPON_CLASS
        && objects[otmp.otyp].oc_skill === P_SPEAR;
}
function is_blade(otmp) {
    return otmp.oclass === WEAPON_CLASS
        && objects[otmp.otyp].oc_skill >= P_DAGGER
        && objects[otmp.otyp].oc_skill <= P_SABER;
}
function is_sword(otmp) {
    return otmp.oclass === WEAPON_CLASS
        && objects[otmp.otyp].oc_skill >= P_SHORT_SWORD
        && objects[otmp.otyp].oc_skill <= P_SABER;
}

// C ref: dothrow.c throwit_return()
function throwit_return(clear_thrownobj) {
    game.iflags.returning_missile = null;
    if (clear_thrownobj)
        game.thrownobj = null;
}

// C ref: dothrow.c throwit_mon_hit()
/* thrown object hits a monster.
   mon may be NULL.
   returns TRUE if shopkeeper caught the object.
   may delete object, clearing gt.thrownobj */
async function throwit_mon_hit(obj, mon) {
    if (mon) {
        if (mon.isshk && obj.where === 'OBJ_MINVENT' && obj.ocarry === mon)
            return true;
        /* snuff_candle(obj), thitmonst(mon, obj): hitting a monster with
           a thrown object */
        throw new Error('throwit_mon_hit(): thitmonst() not ported yet');
    }
    return false;
}

// C ref: dothrow.c throwit()
/* throw an object, NB: obj may be consumed in the process */
async function throwit(obj,
                       wep_mask,  /* used to re-equip returning boomerang */
                       twoweap,   /* used to restore twoweapon mode if
                                   * wielded weapon returns */
                       oldslot) { /* for thrown-and-return used with !fixinv */
    const g = game;
    const u = g.u;
    let mon = null;
    let range, urange;
    let crossbowing;
    let impaired = (Confusion() || Stunned() || Blind()
                    || Hallucination() || Fumbling());
    /* autoreturn_weapon(obj): only the aklys is a tethered weapon */
    const tethered_weapon = (obj.otyp === AKLYS && (wep_mask & W_WEP) !== 0);
    void twoweap; void oldslot;

    g.notonhead = false; /* reset potentially stale value */
    if ((obj.cursed || obj.greased) && (u.dx || u.dy) && !rn2(7)) {
        let slipok = true;

        if (ammo_and_launcher(obj, g.uwep)) {
            await pline(`${Tobjnam(obj, "misfire")}!`);
        } else {
            /* only slip if it's greased or meant to be thrown */
            if (obj.greased || throwing_weapon(obj))
                /* BUG: this message is grammatically incorrect if obj has
                   a plural name; greased gloves or boots for instance. */
                await pline(`${Tobjnam(obj, "slip")} as you throw it!`);
            else
                slipok = false;
        }
        if (slipok) {
            u.dx = rn2(3) - 1;
            u.dy = rn2(3) - 1;
            if (!u.dx && !u.dy)
                u.dz = 1;
            impaired = true;
        }
    }

    if ((u.dx || u.dy || (u.dz < 1))
        && calc_capacity(obj.owt) > SLT_ENCUMBER
        && (Upolyd() ? (u.mh < 5 && u.mh !== u.mhmax)
                     : (u.uhp < 10 && u.uhp !== u.uhpmax))
        && obj.owt > ((Upolyd() ? u.mh : u.uhp) * 2)
        && !Is_airlevel(u.uz)) {
        await You(`have so little stamina, ${the(xname(obj))} drops from your grasp.`);
        exercise(A_CON, false);
        u.dx = u.dy = 0;
        u.dz = 1;
    }

    g.thrownobj = obj;
    g.thrownobj.how_lost = LOST_THROWN;
    g.iflags.returning_missile = AutoReturn(obj, wep_mask) ? obj : null;
    /* NOTE:  No early returns after this point or returning_missile
       will be left with a stale pointer. */

    if (u.uswallow) {
        throw new Error('throwit(): throwing while engulfed not ported yet');
    } else if (u.dz) {
        /* toss_up(), hitfloor(), potionhit() on the steed */
        throw new Error('throwit(): throwing up or down not ported yet');
    } else if (obj.otyp === BOOMERANG && !Underwater()) {
        throw new Error('throwit(): boomhit() not ported yet');
    } else {
        /* crossbow range is independent of strength */
        crossbowing = (ammo_and_launcher(obj, g.uwep)
                       && weapon_type(g.uwep) === P_CROSSBOW);
        urange = Math.trunc((crossbowing ? 18 : acurrstr()) / 2);
        /* balls are easy to throw or at least roll;
         * also, this insures the maximum range of a ball is greater
         * than 1, so the effects from throwing attached balls are
         * actually possible
         */
        if (obj.otyp === HEAVY_IRON_BALL)
            range = urange - Math.trunc(obj.owt / 100);
        else
            range = urange - Math.trunc(obj.owt / 40);
        if (obj === g.uball) {
            if (u.ustuck)
                range = 1;
            else if (range >= 5)
                range = 5;
        }
        if (range < 1)
            range = 1;

        if (is_ammo(obj)) {
            if (ammo_and_launcher(obj, g.uwep)) {
                if (crossbowing)
                    range = BOLT_LIM;
                else
                    range++;
            } else if (obj.oclass !== GEM_CLASS) {
                range = Math.trunc(range / 2);
                await pline(`You aren't wielding ${an(skill_name(weapon_type(obj)))}, so you throw your ${
                    weapon_descr(obj)} by ${body_part(HAND)}.`);
            }
        }

        if (Is_airlevel(u.uz) || Levitation()) {
            /* action, reaction... */
            urange -= range;
            if (urange < 1)
                urange = 1;
            range -= urange;
            if (range < 1)
                range = 1;
        }

        if (obj.otyp === BOULDER)
            range = 20; /* you must be giant */
        else if (is_art(obj, ART_MJOLLNIR))
            range = Math.trunc((range + 1) / 2); /* it's heavy */
        else if (tethered_weapon) /* primary weapon is aklys */
            /* range of a tethered_weapon is limited by the
               length of the attached cord [implicit aspect of item] */
            /* isqrt(arw->range): the aklys's range is AKLYS_LIM*AKLYS_LIM
               with AKLYS_LIM = BOLT_LIM / 2 (weapon.c arwep[]) */
            range = Math.min(range, Math.trunc(Math.sqrt(
                Math.trunc(BOLT_LIM / 2) * Math.trunc(BOLT_LIM / 2))));
        else if (obj === g.uball && u.utrap && u.utraptype === TT_INFLOOR)
            range = 1;

        if (Underwater())
            range = 1;

        const pobj = { obj };
        mon = await bhit(u.dx, u.dy, range,
                         tethered_weapon ? THROWN_TETHERED_WEAPON : THROWN_WEAPON,
                         null, null, pobj);
        obj = pobj.obj;
        g.thrownobj = obj; /* obj may be null now */

        /* have to do this after bhit() so u.ux & u.uy are correct */
        if (Is_airlevel(u.uz) || Levitation())
            throw new Error('throwit(): hurtle() not ported yet');

        if (!obj) {
            /* bhit display cleanup was left with this caller
               for tethered_weapon, but clean it up now since
               we're about to return */
            /* if (tethered_weapon) tmp_at(DISP_END, 0): display only */
            throwit_return(false);
            return;
        }
    }

    if (await throwit_mon_hit(obj, mon)) {
        throwit_return(true); /* alert shk caught it */
        return;
    }

    if (!g.thrownobj) {
        /* missile has already been handled */
        /* if (tethered_weapon) tmp_at(DISP_END, 0): display only */
    } else if (u.uswallow && !g.iflags.returning_missile) {
        throw new Error('throwit(): swallowit() not ported yet');
    } else {
        /* Mjollnir must be wielded to be thrown--caller verifies this;
           aklys must be wielded as primary to return when thrown */
        if (g.iflags.returning_missile) /* Mjollnir or aklys */
            throw new Error('throwit(): returning missile not ported yet');

        const bx = g.bhitpos.x, by = g.bhitpos.y;
        if ((!IS_SOFT(g.level.at(bx, by).typ) && breaktest(obj))
            /* venom [via #monster to spit while poly'd] fails breaktest()
               but we want to force breakage even when location IS_SOFT() */
            || obj.oclass === VENOM_CLASS) {
            /* tmp_at(DISP_FLASH, ...) display only; breakmsg(), breakobj() */
            throw new Error('throwit(): breakobj() not ported yet');
        }
        if (!(uhave(DEAF) || u.uroleplay?.deaf) && !Underwater()) {
            /* Some sound effects when item lands in water or lava */
            if (is_pool(bx, by) || (is_lava(bx, by) && !is_flammable(obj))) {
                /* Soundeffect(se_splash, 50) */
                await pline((weight(obj) > WT_SPLASH_THRESHOLD)
                            ? "Splash!" : "Plop!");
            }
        }
        if (await flooreffects(obj, bx, by, "fall")) {
            throwit_return(true);
            return;
        }
        obj_no_longer_held(obj);
        if (mon && mon.isshk && is_pick(obj))
            throw new Error('throwit(): shopkeeper snatching a pick not ported yet');
        /* (void) snuff_candle(obj) */
        if (obj.lamplit)
            throw new Error('throwit(): snuff_candle() not ported yet');
        if (!mon && await ship_object(obj, bx, by, false)) {
            throwit_return(true);
            return;
        }
        g.thrownobj = null;
        place_object(obj, bx, by);
        /* container contents might break;
           do so before turning ownership of gt.thrownobj over to shk
           (container_impact_dmg handles item already owned by shop) */
        if (!IS_SOFT(g.level.at(bx, by).typ)) {
            /* <x,y> is spot where you initiated throw, not gb.bhitpos */
            if (obj.cobj && obj.cobj.length) /* container_impact_dmg() */
                throw new Error('throwit(): container_impact_dmg() not ported yet');
            impact_disturbs_zombies(obj, true);
        }
        /* charge for items thrown out of shop;
           shk takes possession for items thrown into one */
        if (((u.ushops && u.ushops.length) || obj.unpaid) && obj !== g.uball)
            throw new Error('throwit(): check_shop_obj() not ported yet');

        stackobj(obj);
        if (obj === g.uball)
            throw new Error('throwit(): drop_ball() not ported yet');
        if (cansee(bx, by))
            newsym(bx, by);
        /* if (obj_sheds_light(obj)) vision_full_recalc = 1: lit objects
           are refused above */
    }

    throwit_return(false);
}

// C ref: dothrow.c breaktest()
/*
 * Check to see if obj (which has just hit hard something at speed, e.g.
 * thrown or dropped from height) is going to break, but don't actually
 * break it. Return 0 if the object isn't going to break, 1 if it is.
 */
export function breaktest(obj) {
    let nonbreakchance = 1; /* chance for non-artifacts to resist */

    /* this may need to be changed if actual glass armor gets added someday;
       for now, it affects crystal plate mail and helm of brilliance;
       either of them will have to be cracked 4 times before breaking */
    if (obj.oclass === ARMOR_CLASS && objects[obj.otyp].oc_material === GLASS)
        nonbreakchance = 90;

    if (obj_resists(obj, nonbreakchance, 99))
        return false;
    if (objects[obj.otyp].oc_material === GLASS && !obj.oartifact
        && obj.oclass !== GEM_CLASS)
        return true;
    switch (obj.oclass === POTION_CLASS ? POT_WATER : obj.otyp) {
    case EXPENSIVE_CAMERA:
    case POT_WATER: /* really, all potions */
    case EGG:
    case CREAM_PIE:
    case MELON:
    case ACID_VENOM:
    case BLINDING_VENOM:
        return true;
    default:
        return false;
    }
}

// C ref: zap.c bhit() -- thrown objects (THROWN_WEAPON); kicked objects,
// zapped wands, flashed light and invisible beams are not ported yet
/*
 *  Called for the following distance effects:
 *      when a weapon is thrown (weapon == THROWN_WEAPON)
 *      when an object is kicked (KICKED_WEAPON)
 *      when an IMMEDIATE wand is zapped (ZAPPED_WAND)
 *      when a light beam is flashed (FLASHED_LIGHT)
 *      when a mirror is applied (INVIS_BEAM)
 *  A thrown/kicked object falls down at end of its range or when a monster
 *  is hit.  The variable 'gb.bhitpos' is set to the final position of the
 *  weapon thrown/zapped.  The ray of a wand may affect (by calling a provided
 *  function) several objects and monsters on its path.  The return value
 *  is the monster hit (weapon != ZAPPED_WAND), or a null monster pointer.
 */
export async function bhit(ddx, ddy, range,   /* direction and range */
                           weapon,             /* defined in hack.h */
                           fhitm, fhito,       /* fns called when mon/obj hit */
                           pobj) {             /* object tossed/used, set to NULL
                                                * if object is destroyed */
    const g = game;
    const u = g.u;
    let mtmp, result = null;
    let obj = pobj.obj;
    let ttmp;
    let typ;
    let point_blank = true;
    let in_skip = false, allow_skip = false;
    let tethered_weapon = false;
    const skip = { start: 0, end: 0 };
    let skipcount = 0;
    const was_returning = (g.iflags.returning_missile === obj) ? obj : null;
    void fhitm; void point_blank;

    if (weapon !== THROWN_WEAPON && weapon !== THROWN_TETHERED_WEAPON)
        throw new Error('bhit(): kicked objects, wands and beams not ported yet');
    if (fhito)
        throw new Error('bhit(): bhitpile() not ported yet');

    g.bhitpos = { x: u.ux, y: u.uy };

    if (weapon === THROWN_WEAPON && obj && obj.otyp === ROCK) {
        skiprange(range, skip);
        allow_skip = !rn2(3);
    }

    if (weapon === THROWN_TETHERED_WEAPON && obj) {
        tethered_weapon = true;
        weapon = THROWN_WEAPON; /* simplify 'if's that follow below */
        /* tmp_at(DISP_TETHER, obj_to_glyph(obj, rn2_on_display_rng)):
           transient display only */
    } /* else tmp_at(DISP_FLASH, ...): transient display only */

    while (range-- > 0) {
        g.bhitpos.x += ddx;
        g.bhitpos.y += ddy;
        const x = g.bhitpos.x, y = g.bhitpos.y;

        if (!isok(x, y)) {
            g.bhitpos.x -= ddx;
            g.bhitpos.y -= ddy;
            break;
        }

        if (is_pick(obj) && inside_shop(x, y))
            throw new Error('bhit(): shkcatch() not ported yet');

        typ = g.level.at(x, y).typ;

        /* WATER aka "wall of water" stops items */
        if (typ === WATER || typ === LAVAWALL) /* IS_WATERWALL(typ) */
            break;

        /* iron bars will block anything big enough and break some things */
        if (obj.lamplit && !Blind())
            throw new Error('bhit(): show_transient_light() not ported yet');
        if (typ === IRONBARS)
            throw new Error('bhit(): hits_bars() not ported yet');

        mtmp = m_at(x, y);
        ttmp = t_at(x, y);
        if (!mtmp && ttmp && (ttmp.ttyp === WEB) && !rn2(3)) {
            throw new Error('bhit(): stuck in a web not ported yet');
        }

        /*
         * skipping rocks
         *
         * skiprange_start is only set if this is a thrown rock
         */
        if (skip.start && (range === skip.start) && allow_skip) {
            if (is_pool(x, y) && !mtmp) {
                throw new Error('bhit(): skipping rocks not ported yet');
            } else if (skip.start > skip.end + 1) {
                --skip.start;
            }
        }
        if (in_skip) {
            void skipcount;
        }

        /* if mtmp is a shade and missile passes harmlessly through it,
           give message and skip it in order to keep going;
           thrown objects don't hit mimics pretending to be objects */
        if (mtmp && (mtmp.data === mons[PM_SHADE]
                     || mtmp.m_ap_type === M_AP_OBJECT))
            throw new Error('bhit(): shade_miss()/hidden mimic not ported yet');

        if (mtmp) {
            g.notonhead = (x !== mtmp.mx || y !== mtmp.my);
            /* THROWN_WEAPON, KICKED_WEAPON */
            /* if (!tethered_weapon) tmp_at(DISP_END, 0): display only */
            if (cansee(x, y) && !canspotmon(mtmp))
                map_invisible(x, y);
            result = mtmp;
            break; /* goto bhit_done */
        }
        if (!ZAP_POS(typ) || closed_door(x, y)) {
            g.bhitpos.x -= ddx;
            g.bhitpos.y -= ddy;
            break;
        }
        /* 'I' present but no monster: erase; do this before tmp_at() */
        if (g.level.at(x, y).glyph !== undefined && glyph_is_invisible(g.level.at(x, y).glyph)
            && cansee(x, y)) {
            unmap_object(x, y);
            newsym(x, y);
        }
        /* tmp_at(x, y); nh_delay_output(): transient display only */
        if (IS_SINK(typ))
            break; /* physical objects fall onto sink */
        /* limit range of ball so hero won't make an invalid move */
        if (range > 0 && obj.otyp === HEAVY_IRON_BALL)
            throw new Error('bhit(): thrown heavy iron ball not ported yet');

        /* thrown/kicked missile has moved away from its starting spot */
        point_blank = false; /* affects passing through iron bars */
    }

    /* if ((weapon != ZAPPED_WAND && weapon != INVIS_BEAM && !tethered_weapon)
           || (was_returning && was_returning != iflags.returning_missile))
           tmp_at(DISP_END, 0): transient display only */
    void tethered_weapon; void was_returning;

    /* bhit_done: */
    /* transient_light_cleanup(): lit objects are refused above */
    return result;
}

// C ref: zap.c skiprange()
function skiprange(range, skip) {
    const tr = Math.trunc(range / 4);
    const tmp = range - ((tr > 0) ? rnd(tr) : 0);

    skip.start = tmp;
    skip.end = tmp - (Math.trunc(tmp / 4) * rnd(3));
    if (skip.end >= tmp)
        skip.end = tmp - 1;
}

/* C ref: hack.h uslinging() */
function uslinging() {
    return !!game.uwep && objects[game.uwep.otyp].oc_skill === P_SLING;
}

// C ref: dothrow.c throw_ok()
/* getobj callback for object to be thrown */
function throw_ok(obj) {
    if (!obj)
        return GETOBJ_EXCLUDE;

    if (obj.bknown && welded(obj)) /* not a candidate if known to be stuck */
        return GETOBJ_DOWNPLAY;

    if (AutoReturn(obj, obj.owornmask)
        /* to get here, obj is boomerang or is uwep and (alkys or Mjollnir) */
        && (obj.oartifact !== ART_MJOLLNIR || ACURR(A_STR) >= STR19(25)))
        return GETOBJ_SUGGEST;

    if (obj.quan === 1 && (obj === game.uwep
                           || (obj === game.uswapwep && game.u.twoweap)))
        return GETOBJ_DOWNPLAY;

    if (obj.oclass === COIN_CLASS)
        return GETOBJ_SUGGEST;

    if (!uslinging() && obj.oclass === WEAPON_CLASS)
        return GETOBJ_SUGGEST;
    /* Possible extension: exclude weapons that make no sense to throw,
       such as whips, bows, slings, rubber hoses. */

    if (uslinging() && obj.oclass === GEM_CLASS)
        return GETOBJ_SUGGEST;

    if (throws_rocks(game.youmonst.data) && obj.otyp === BOULDER)
        return GETOBJ_SUGGEST;

    return GETOBJ_DOWNPLAY;
}

// C ref: dothrow.c dothrow() -- the #throw command
export async function dothrow() {
    /*
     * Since some characters shoot multiple missiles at one time,
     * allow user to specify a count prefix for 'f' or 't' to limit
     * number of items thrown (to avoid possibly hitting something
     * behind target after killing it, or perhaps to conserve ammo).
     *
     * [3.6.0:  shot count setup has been moved into ok_to_throw().]
     */
    const otr = await ok_to_throw();
    if (!otr.ok)
        return ECMD_OK;
    const shotlimit = otr.shotlimit;

    const obj = await getobj("throw", throw_ok, GETOBJ_PROMPT | GETOBJ_ALLOWCNT);
    /* it is also possible to throw food */
    /* (or jewels, or iron balls... ) */

    return obj ? await throw_obj(obj, shotlimit) : ECMD_CANCEL;
}

// C ref: dothrow.c find_launcher()
function find_launcher(ammo) {
    let otmp, oX;

    if (!ammo)
        return null;

    for (oX = null, otmp = game.invent; otmp; otmp = otmp.nobj) {
        if (otmp.cursed && otmp.bknown)
            continue; /* known to be cursed, so skip */
        if (ammo_and_launcher(ammo, otmp)) {
            if (otmp.bknown)
                return otmp; /* known-B or known-U (known-C won't get here) */
            if (!oX)
                oX = otmp; /* unknown-BUC; used if no known-BU item found */
        }
    }
    return oX;
}

// C ref: dothrow.c dofire() -- the #fire command
export async function dofire() {
    let obj;
    const uwep = game.uwep;
    /* AutoReturn() verifies Valkyrie if weapon is Mjollnir, but it relies
       on its caller to make sure hero is strong enough to throw that */
    const uwep_Throw_and_Return = !!(uwep && AutoReturn(uwep, uwep.owornmask));
    let skip_fireassist = false;
    let altres, res = ECMD_OK;

    const otr = await ok_to_throw();
    if (!otr.ok)
        return ECMD_OK;
    const shotlimit = otr.shotlimit;

    obj = game.uquiver;
    /* if wielding a throw-and-return weapon, throw it if quiver is empty
       or has ammo rather than missiles */
    if (uwep_Throw_and_Return && (!obj || is_ammo(obj))) {
        obj = uwep;
        skip_fireassist = true;
    } else if (!obj) {
        if (!game.flags?.autoquiver) {
            /* if we're wielding a polearm, apply it */
            if (uwep && is_pole(uwep)) {
                throw new Error('dofire(): use_pole() not ported yet');
            /* if we're wielding a bullwhip, apply it */
            } else if (uwep && uwep.otyp === BULLWHIP) {
                throw new Error('dofire(): use_whip() not ported yet');
            } else if ((game.iflags?.fireassist ?? true)
                       && game.uswapwep && is_pole(game.uswapwep)
                       && !(game.uswapwep.cursed && game.uswapwep.bknown)) {
                /* we have a known not-cursed polearm as swap weapon.
                   swap to it and retry */
                cmdq_add_ec("doswapweapon");
                cmdq_add_ec("dofire");
                return ECMD_OK; /* haven't taken any time yet */
            } else {
                await You("have no ammunition readied.");
            }
        } else {
            throw new Error('dofire(): autoquiver() not ported yet');
        }
    }

    /* if autoquiver is disabled or has failed, prompt for missile */
    if (!obj) {
        /* in case we're using ^A to repeat prior 'f' command, don't
           use direction of previous throw as getobj()'s choice here */
        game.in_doagain = 0;

        /* this gives its own feedback about populating the quiver slot */
        res = await doquiver_core("fire");
        if (res !== ECMD_OK && res !== ECMD_TIME)
            return res;

        obj = game.uquiver;
    }

    if (game.uquiver && is_ammo(game.uquiver) && (game.iflags?.fireassist ?? true)
        && !skip_fireassist) {
        if (uwep && is_pole(uwep))
            throw new Error('dofire(): could_pole_mon() not ported yet');
        /* Try to find a launcher */
        if (ammo_and_launcher(game.uquiver, uwep)) {
            obj = game.uquiver;
        } else if (ammo_and_launcher(game.uquiver, game.uswapwep)) {
            /* swap weapons and retry fire */
            cmdq_add_ec("doswapweapon");
            cmdq_add_ec("dofire");
            return res;
        } else {
            const olauncher = find_launcher(game.uquiver);
            if (olauncher) {
                /* wield launcher, retry fire */
                if (uwep && !game.flags?.pushweapon)
                    cmdq_add_ec("doswapweapon");
                cmdq_add_ec("dowield");
                cmdq_add_key(olauncher.invlet);
                cmdq_add_ec("dofire");
                return res;
            }
        }
    }

    altres = obj ? await throw_obj(obj, shotlimit) : ECMD_CANCEL;
    /* fire can take time by filling quiver (if that causes something which
       was wielded to be unwielded) even if the throw itself gets cancelled */
    return (res === ECMD_TIME) ? res : altres;
}

// C ref: dothrow.c walk_path()
/*
 * Walk a path from src_cc to dest_cc, calling a proc for each location
 * except the starting one.  If the proc returns FALSE, stop walking
 * and return FALSE.  If stopped early, dest_cc will be the location
 * before the failed callback.
 */
export async function walk_path(src_cc, dest_cc, check_proc, arg) {
    let err;
    let x, y, dx, dy, x_change, y_change, i, prev_x, prev_y;
    let keep_going = true;

    /* Use Bresenham's Line Algorithm to walk from src to dest. */
    dx = dest_cc.x - src_cc.x;
    dy = dest_cc.y - src_cc.y;
    prev_x = x = src_cc.x;
    prev_y = y = src_cc.y;

    if (dx < 0) {
        x_change = -1;
        dx = -dx;
    } else {
        x_change = 1;
    }
    if (dy < 0) {
        y_change = -1;
        dy = -dy;
    } else {
        y_change = 1;
    }
    i = err = 0;
    if (dx < dy) {
        while (i++ < dy) {
            prev_x = x;
            prev_y = y;
            y += y_change;
            err += dx << 1;
            if (err > dy) {
                x += x_change;
                err -= dy << 1;
            }
            /* check for early exit condition */
            if (!(keep_going = await check_proc(arg, x, y)))
                break;
        }
    } else {
        while (i++ < dx) {
            prev_x = x;
            prev_y = y;
            x += x_change;
            err += dy << 1;
            if (err > dx) {
                y += y_change;
                err -= dx << 1;
            }
            /* check for early exit condition */
            if (!(keep_going = await check_proc(arg, x, y)))
                break;
        }
    }

    if (keep_going)
        return true; /* successful */

    dest_cc.x = prev_x;
    dest_cc.y = prev_y;
    return false;
}

// C ref: dothrow.c hurtle_jump() -- hurtle_step() for jumping, with water
// walking forced on so a jump over water doesn't land in that water
export async function hurtle_jump(arg, x, y) {
    /* EWwalking |= I_SPECIAL: hurtle_step() is told it's a jump */
    const save_via_jumping = game.hurtle_via_jumping;
    game.hurtle_via_jumping = true;
    try {
        return await hurtle_step(arg, x, y);
    } finally {
        game.hurtle_via_jumping = save_via_jumping;
    }
}

// C ref: dothrow.c hurtle_step()
/*
 * Single step for the hero flying through the air from jumping, flying,
 * etc.  Called from hurtle() and jump() via walk_path().  We expect the
 * argument to be a pointer to an integer -- the range -- which is
 * used in the calculation of points off if we hit something.
 *
 * Bumping into monsters won't cause damage but will wake them and make
 * them angry.  Auto-pickup isn't done, since you don't have control over
 * your movements at the time.
 */
export async function hurtle_step(arg, x, y) {
    const u = game.u;
    let ox, oy;
    let mon;
    let may_pass = true;
    let ttmp;

    if (!isok(x, y)) {
        await pline("You feel the spirits holding you back."); /* You_feel() */
        return false;
    } else if (game.regions && game.regions.length) {
        throw new Error('hurtle_step(): in_out_region() not ported yet');
    } else if (arg.range === 0) {
        return false; /* previous step wants to stop now */
    }
    const via_jumping = !!game.hurtle_via_jumping; /* EWwalking & I_SPECIAL */
    const stopping_short = (via_jumping && arg.range < 2);
    const lev = game.level.at(x, y);
    const ltyp = lev.typ;

    const Passes_walls = !!(u.uprops?.[PASSES_WALLS]?.intrinsic
                            || u.uprops?.[PASSES_WALLS]?.extrinsic);
    if (!Passes_walls || !(may_pass = may_passwall(x, y))) {
        let why = null;
        const diagonal = (u.ux - x) !== 0 && (u.uy - y) !== 0,
            open_door = IS_DOOR(ltyp) && (lev.doormask & D_ISOPEN) !== 0,
            odoor_diag = open_door && diagonal;

        if (IS_OBSTRUCTED(lev.typ) || closed_door(x, y) || odoor_diag) {
            why = "bumping";
        } else if (ltyp === IRONBARS) {
            why = "crashing into iron bars";
        } else if (sobj_at(BOULDER, x, y)) {
            why = "bumping into a boulder";
        } else if (!may_pass) {
            why = "touching the edge of the universe";
        } else if (diagonal
                   && bad_rock(game.youmonst.data, u.ux, y)
                   && bad_rock(game.youmonst.data, x, u.uy)) {
            throw new Error('hurtle_step(): squeezing diagonally not ported yet');
        }
        if (why)
            throw new Error(`hurtle_step(): ${why} (losehp()) not ported yet`);
    }

    if ((mon = m_at(x, y)) !== null && mon !== undefined) {
        const seen = canspotmon(mon); /* glyph_is_monster(glyph_at(x, y)) */

        mon.mundetected = 0; /* wakeup() will handle mimic */
        if (!seen)
            throw new Error('hurtle_step(): bumping into an unseen monster not ported yet');
        /* after unhiding; combination of a_monnam() and some_mon_nam() */
        const mnam = x_monnam(mon, ARTICLE_A, null,
                              ((mon.mgivenname ? SUPPRESS_SADDLE : 0)
                               | AUGMENT_IT), false);
        await You(`bump into ${mnam}.`);
        await wakeup(mon, false);
        /* if (!canspotmon(mon)) map_invisible(mon->mx, mon->my): seen */
        await setmangry(mon, false);
        if (touch_petrifies(mon.data) && !game.uarmu && !game.uarm && !game.uarmc)
            throw new Error('hurtle_step(): instapetrify() not ported yet');
        if (touch_petrifies(game.youmonst.data))
            throw new Error('hurtle_step(): minstapetrify() not ported yet');
        await wake_nearto(x, y, 10);
        return false;
    }

    if ((u.ux - x) && (u.uy - y)
        && bad_rock(game.youmonst.data, u.ux, y)
        && bad_rock(game.youmonst.data, x, u.uy)) {
        /* Move at a diagonal. */
        /* Sokoban: "You come to an abrupt halt!" -- Sokoban isn't ported */
    }

    /* caller has already determined that dragging the ball is allowed */
    if (game.uball)
        throw new Error('hurtle_step(): drag_ball() not ported yet');

    ox = u.ux;
    oy = u.uy;
    u_on_newpos(x, y); /* set u.<ux,uy>, u.usteed-><mx,my>; cliparound(); */
    newsym(ox, oy);    /* update old position */
    vision_recalc(1);  /* update for new position */
    await flush_screen(1);
    /* if terrain type changes, levitation or flying might become blocked
       or unblocked; switch_terrain() might issue a message */
    if (ltyp !== game.level.at(ox, oy).typ
        && (u.uprops?.[LEVITATION]?.intrinsic || u.uprops?.[LEVITATION]?.extrinsic
            || u.uprops?.[FLYING]?.intrinsic || u.uprops?.[FLYING]?.extrinsic))
        throw new Error('hurtle_step(): switch_terrain() not ported yet');

    /* might be entering a special room (treasure zoo, thrown room, &c) that
       has a first-time entry message, or leaving shop with unpaid goods */
    await check_special_room(false);

    if (is_pool(x, y) && !u.uinwater) {
        throw new Error('hurtle_step(): moving over water not ported yet');
    } else if (is_lava(x, y) && !stopping_short) {
        throw new Error('hurtle_step(): moving over lava not ported yet');
    }

    if ((ttmp = t_at(x, y)) !== null && ttmp !== undefined) {
        if (stopping_short) {
            ; /* see the comment above hurtle_jump() */
        } else if (ttmp.ttyp === MAGIC_PORTAL || ttmp.ttyp === VIBRATING_SQUARE
                   || ttmp.ttyp === FIRE_TRAP) {
            throw new Error('hurtle_step(): dotrap() not ported yet');
        } else {
            /* (is_pit() || is_hole()) && Sokoban: Sokoban isn't ported */
            if (ttmp.tseen)
                throw new Error('hurtle_step(): "You pass right over" trapname() not ported yet');
        }
    }
    if (--arg.range < 0) /* make sure our range never goes negative */
        arg.range = 0;
    /* if (*range != 0) nh_delay_output(): display timing only */
    return true;
}
