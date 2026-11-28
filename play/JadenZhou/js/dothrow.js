// dothrow.js -- throwing and firing.
// C ref: dothrow.c
//
// Ported so far: the #fire command's fireassist (swap to or wield the
// launcher and requeue #fire) and throw_obj() up to the direction
// prompt.  Throwing itself (throwit()), autoquiver and doquiver_core()
// are not ported yet.

import { use_pole, could_pole_mon, use_whip, snuff_candle } from './apply.js';
import { end_burn } from './timeout.js';
import { get_obj_location, inside_shop } from './shk.js';
import { shop_keeper, costly_spot, stolen_value, subfrombill, is_unpaid,
         contained_gold, donate_gold } from './shk.js';
import { in_rooms } from './hack.js';
import { SHOPBASE, Has_contents } from './const.js';
import { Shk_Your } from './shk.js';
import { container_impact_dmg } from './dokick.js';
import { explode } from './explode.js';
import { d } from './rng.js';
import { EXPL_FIERY, NO_TRAP_FLAGS } from './const.js';
import { hits_bars } from './mthrowu.js';
import { glyph_at, glyph_is_warning, You_hear as
         You_hear_br, You_feel } from './display.js';
import { noit_mhim } from './mhitu.js';
import { shade_miss } from './uhitm.js';
import { switch_terrain } from './hack.js';
import { dotrap, trapname, is_waterwall } from './trap.js';
import { cmdq_add_ec, cmdq_add_key } from './cmd.js';
import { is_art } from './artifact.js';
import { game } from './gstate.js';
import { tamedog } from './dog.js';
import { drag_ball, move_bc, drop_ball } from './ball.js';
import { You, You_cant } from './display.js';
import { check_capacity } from './hack.js';
import { getdir } from './cmd.js';
import { doquiver_core } from './wield.js';
import { ECMD_OK, ECMD_TIME, ECMD_CANCEL, W_WEP, W_SWAPWEP, Race_if } from './const.js';
import { BULLWHIP, BOOMERANG, AKLYS, WAN_PROBING, WAN_OPENING, WAN_LOCKING,
         WAN_STRIKING, is_pick, is_spear, is_blade, is_sword, greatest_erosion,
         is_axe, is_weptool, matching_launcher, is_missile, is_wet_towel,
         is_ammo, is_pole, ammo_and_launcher } from './objects.js';
import { zap_map, bhitpile, boomhit } from './zap.js';
import { M1_NOHANDS, M1_NOTAKE, S_COCKATRICE, PM_CHICKATRICE, PM_COCKATRICE,
         PM_MEDUSA, MZ_MEDIUM, mons } from './monsters.js';
import { pline, newsym, flush_screen, canspotmon, canseemon } from './display.js';
import { vision_recalc } from './vision.js';
import { u_on_newpos } from './mklev.js';
import { check_special_room } from './hack.js';
import { m_at, may_passwall, closed_door, sobj_at, is_pool, is_lava } from './makemon.js';
import { bad_rock, wake_nearto, wakeup, setmangry } from './mon.js';
import { t_at, VIBRATING_SQUARE, WEB, losehp, Maybe_Half_Phys } from './trap.js';
import { x_monnam, ARTICLE_A, SUPPRESS_SADDLE, AUGMENT_IT } from './do_name.js';
import { BOULDER } from './objects.js';
import { isok, IS_DOOR, IS_OBSTRUCTED, D_ISOPEN, IRONBARS, PASSES_WALLS,
         LEVITATION, FLYING, MAGIC_PORTAL, FIRE_TRAP, STRAT_WAITMASK } from './const.js';
import { rn2, rnd, rn2_on_display_rng } from './rng.js';
import { CONFUSION, STUNNED, FUMBLING, BLINDED, HALLUC, HALLUC_RES, STONE_RES, DEAF,
         A_STR, A_DEX, A_CON, STR19, P_SLING, P_SPEAR, P_SHURIKEN,
         P_DAGGER, P_KNIFE, P_DART, P_CROSSBOW, P_SABER, P_SHORT_SWORD,
         P_SKILLED, P_EXPERT, SLT_ENCUMBER, LOST_THROWN, BOLT_LIM, TT_INFLOOR,
         THROWN_WEAPON, THROWN_TETHERED_WEAPON, WATER, LAVAWALL, ZAP_POS,
         ZAPPED_WAND, SDOOR,
         IS_SINK, IS_SOFT, M_AP_OBJECT, HAND, Is_airlevel, GETOBJ_EXCLUDE,
         GETOBJ_DOWNPLAY, GETOBJ_SUGGEST, GETOBJ_PROMPT,
         GETOBJ_ALLOWCNT } from './const.js';
import { objects, COIN_CLASS, WEAPON_CLASS, GEM_CLASS, ARMOR_CLASS,
         POTION_CLASS, VENOM_CLASS, GLASS, PIERCE, CORPSE, ROCK, FLINT,
         HEAVY_IRON_BALL, WAR_HAMMER, PICK_AXE, DWARVISH_MATTOCK, YA, YUMI,
         ELVEN_ARROW, ELVEN_BOW, ORCISH_ARROW, ORCISH_BOW, STRANGE_OBJECT,
         EXPENSIVE_CAMERA, POT_WATER, EGG, CREAM_PIE, MELON, ACID_VENOM,
         BLINDING_VENOM } from './objects.js';
import { PM_CAVE_DWELLER, PM_MONK, PM_RANGER, PM_ROGUE, PM_NINJA, PM_SAMURAI,
         PM_WIZARD, PM_CLERIC, PM_HEALER, PM_TOURIST, PM_VALKYRIE, PM_ELF,
         PM_ORC, PM_GNOME, PM_HUMAN, PM_DWARF, PM_SHADE,
         M2_ROCKTHROW } from './monsters.js';
import { ART_MJOLLNIR } from './artilist.js';
import { welded, weldmsg } from './wield.js';
import { getobj, freeinv, stackobj, prinv } from './invent.js';
import { addinv_before } from './invent.js';
import { dry_a_towel } from './weapon.js';
import { setuwep, setuqwep, set_twoweap, setuswapwep } from './wield.js';
import { artifact_hit } from './artifact.js';
import { killer_xname } from './mthrowu.js';
import { BACKTRACK, W_QUIVER, ARM, FOOT } from './const.js';
import { ACURR, acurrstr, exercise } from './attrib.js';
import { calc_capacity } from './hack.js';
import { canletgo, flooreffects, obj_no_longer_held, ship_object,
         impact_disturbs_zombies } from './do.js';
import { u_wipe_engr } from './engrave.js';
import { splitobj, place_object, is_flammable, weight, unsplitobj } from './mkobj.js';
import { encumber_msg } from './pickup.js';
import { remove_worn_item, mpickobj } from './steal.js';
import { weapon_type, P_SKILL, hitval } from './weapon.js';
import { add_to_minv } from './mkobj.js';
import { mon_nam } from './do_name.js';
import { s_suffix } from './hacklib.js';
import { pline_The } from './display.js';
import { Is_waterlevel as Is_waterlevel_tg } from './const.js';
import { AT_ENGL, AD_DGST } from './monsters.js';
import { sellobj } from './shk.js';
import { ghitm } from './dokick.js';
import { weapon_descr, skill_name, body_part } from './insight.js';
import { xname, an, singular, The, Tobjnam } from './objnam.js';
import { the, surface } from './iactions.js';
import { doname, otense } from './objnam.js';
import { Yname2 as Yname2_bh } from './objnam.js';
import { dropy, dropz, doaltarobj } from './do.js';
import { IS_ALTAR, PIT, SPIKED_PIT, HOLE, TRAPDOOR, is_pit, is_hole } from './const.js';
import { IS_TREE, KILLED_BY } from './const.js';
import { BRK_FROM_INV, BRK_KNOWN2BREAK, BRK_KNOWN2NOTBREAK, BRK_KNOWN_OUTCOME } from './const.js';
import { cansee } from './vision.js';
import { obj_resists } from './dogmove.js';
import { map_invisible, unmap_object, glyph_is_invisible, tmp_at, obj_to_glyph,
         DISP_FLASH, DISP_TETHER, DISP_END } from './display.js';
import { in_out_region } from './region.js';
import { show_transient_light, transient_light_cleanup } from './light.js';
import {
    Stone_resistance, Stunned, Confusion, Blind, Hallucination, Deaf, Fumbling, Levitation,
    Underwater, Blind as Blind_br
} from './youprop.js';
import { Upolyd, Role_if } from './const.js';
import { uprop } from './youprop.js';
import { goodpos as goodpos_hu, m_at as m_at_hu,
         place_monster as place_monster_hu } from './makemon.js';
import { MM_IGNOREWATER as MM_IGNOREWATER_HU, MM_IGNORELAVA as MM_IGNORELAVA_HU,
         HURTLING as HURTLING_HU,
         FORCEBUNGLE as FORCEBUNGLE_HU, W_ARMU as W_ARMU_HU, W_ARM as W_ARM_HU,
         W_ARMC as W_ARMC_HU, TT_WEB as TT_WEB_HU, TT_LAVA as TT_LAVA_HU,
         TT_INFLOOR as TT_INFLOOR_HU, TT_BURIEDBALL as TT_BURIEDBALL_HU
       } from './const.js';
import { mons as mons_hu, MZ_HUGE as MZ_HUGE_HU, PM_GRID_BUG as PM_GRID_BUG_HU,
         PM_COCKATRICE as PM_COCKATRICE_HU,
         PM_CHICKATRICE as PM_CHICKATRICE_HU } from './monsters.js';
import { m_in_out_region as m_in_out_region_hu } from './region.js';
import { newsym as newsym_hu, canseemon as canseemon_hu } from './display.js';
import { set_apparxy as set_apparxy_hu } from './monmove.js';
import { mintrap as mintrap_hu, t_at as t_at_hu,
         Trap_Killed_Mon as Trap_Killed_Mon_HU,
         Trap_Caught_Mon as Trap_Caught_Mon_HU,
         Trap_Moved_Mon as Trap_Moved_Mon_HU } from './trap.js';
import { a_monnam as a_monnam_hu, Some_Monnam as Some_Monnam_hu } from './do_name.js';
import { wakeup as wakeup_hu, seemimic as seemimic_hu,
         minliquid as minliquid_hu } from './mon.js';
import { which_armor as which_armor_hu } from './worn.js';
import { stop_occupation as stop_occupation_hu } from './allmain.js';
import { hliquid as hliquid_hu } from './potion.js';
import { endmultishot as endmultishot_hu } from './end.js';
import { nomul as nomul_hu } from './hack.js';
import { hmon as hmon_dt, passive_obj as passive_obj_dt } from './uhitm.js';
import { spec_abon as spec_abon_dt } from './artifact.js';
import { find_mac as find_mac_dt } from './worn.js';
import { weapon_hit_bonus as weapon_hit_bonus_dt } from './weapon.js';
import { cutworm as cutworm_dt, remove_monster_at } from './worm.js';
import { miss as miss_dt } from './zap.js';
import { mshot_xname as mshot_xname_dt,
         should_mulch_missile as should_mulch_missile_dt } from './mthrowu.js';
import { potionhit as potionhit_dt } from './potion.js';
import { dogfood as dogfood_dt } from './dogmove.js';
import { obfree as obfree_dt } from './invent.js';
import { hot_pursuit as hot_pursuit_dt, inside_shop as inside_shop_sk } from './shk.js';
import { in_rooms as in_rooms_dt } from './hack.js';
import { distmin as distmin_dt } from './hacklib.js';
import { your_race as your_race_dt, is_orc as is_orc_dt, is_elf as is_elf_dt,
         nohands, throws_rocks, notake, touch_petrifies, digests,
         is_unicorn, is_whirly, is_animal } from './mondata.js';
import { is_quest_artifact as is_quest_artifact_dt } from './questpgr.js';
import { is_domestic as is_domestic_dt } from './makemon.js';
import { Monnam as Monnam_dt } from './do_name.js';
import { engulfing_u as engulfing_u_dt, SHOPBASE as SHOPBASE_DT,
         HMON_THROWN as HMON_THROWN_DT, HMON_KICKED as HMON_KICKED_DT,
         HMON_APPLIED as HMON_APPLIED_DT, A_DEX as A_DEX_DT, A_STR as A_STR_DT,
         ACCFOOD as ACCFOOD_DT, POTHIT_HERO_THROW as POTHIT_HERO_THROW_DT,
         M_AP_TYPMASK as M_AP_TYPMASK_DT, M_AP_MONSTER as M_AP_MONSTER_DT,
         P_BOW as P_BOW_DT, P_AXE as P_AXE_DT } from './const.js';
import { FAKE_AMULET_OF_YENDOR as FAKE_AMULET_OF_YENDOR_DT,
         GAUNTLETS_OF_POWER as GAUNTLETS_OF_POWER_DT,
         GAUNTLETS_OF_FUMBLING as GAUNTLETS_OF_FUMBLING_DT,
         LEATHER_GLOVES as LEATHER_GLOVES_DT,
         GAUNTLETS_OF_DEXTERITY as GAUNTLETS_OF_DEXTERITY_DT,
         MINERAL as MINERAL_DT, ELVEN_BOW as ELVEN_BOW_DT, YUMI as YUMI_DT,
         HEAVY_IRON_BALL as HEAVY_IRON_BALL_DT, EGG as EGG_DT,
         CREAM_PIE as CREAM_PIE_DT, ACID_VENOM as ACID_VENOM_DT,
         POTION_CLASS as POTION_CLASS_DT, FOOD_CLASS as FOOD_CLASS_DT,
         TOOL_CLASS as TOOL_CLASS_DT,
         BANANA as BANANA_DT, VEGGY as VEGGY_DT, CORPSE as CORPSE_DT } from './objects.js';
import { S_UNICORN as S_UNICORN_DT, M2_JEWELS as M2_JEWELS_DT,
         PM_MONKEY as PM_MONKEY_DT, PM_APE as PM_APE_DT,
         PM_LICHEN as PM_LICHEN_DT, PM_ELF as PM_ELF_DT } from './monsters.js';
import { cansee as cansee_br } from './vision.js';
import { is_crackable } from './objects.js';
import { erode_obj } from './trap.js';
import { ERODE_CRACK, EF_DESTROY, EF_VERBOSE, ER_DESTROYED, EYE } from './const.js';
import { costly_spot as costly_spot_br } from './shk.js';
import { KICKED_WEAPON, OBJ_AT } from './const.js';
import { is_pool_or_lava } from './hack.js';
import { add_damage as add_damage_bh, pay_for_damage as pay_for_damage_bh } from './shk.js';
import { doorlock as doorlock_bh } from './lock.js';
import { learnwand as learnwand_bh } from './zap.js';
import { SPE_KNOCK as SPE_KNOCK_BH, SPE_WIZARD_LOCK as SPE_WIZARD_LOCK_BH,
         SPE_FORCE_BOLT as SPE_FORCE_BOLT_BH } from './objects.js';
import { D_BROKEN as D_BROKEN_BH, SHOP_DOOR_COST as SHOP_DOOR_COST_BH,
         DEAF as DEAF_BH } from './const.js';
import { potionbreathe } from './potion.js';
import { haseyes } from './mondata.js';
import { armor_simple_name, makeplural, vtense } from './objnam.js';
import { change_luck } from './attrib.js';
import { POT_OIL, MIRROR, TOWEL, STATUE, LENSES, CRYSTAL_BALL } from './objects.js';
import { M1_BREATHLESS, PM_CYCLOPS, PM_FLOATING_EYE, PM_PYROLISK } from './monsters.js';
import { LOW_PM } from './const.js';
import { delobj } from './invent.js';
import { dist2 } from './hacklib.js';
import { WWALKING as WWALKING_HT } from './const.js';
import { drown as drown_ht } from './trap.js';
import { Norep as Norep_ht } from './display.js';
import { is_moat as is_moat_ht } from './makemon.js';
import { minstapetrify, instapetrify } from './trap.js';
import { killer } from './topten.js';
import { corpse_xname } from './objnam.js';
import { pmname, ARTICLE_YOUR, EXACT_NAME, SUPPRESS_NAME } from './do_name.js';
import { CXN_PFX_THE, NEUTRAL } from './const.js';
import { INVIS_BEAM, FLASHED_LIGHT } from './const.js';
import { DISP_BEAM } from './display.js';
import { flash_hits_mon } from './uhitm.js';
import { perceives } from './mondata.js';

/* C ref: weight.h WT_SPLASH_THRESHOLD -- weight needed to make splash in
   water */
const WT_SPLASH_THRESHOLD = 9;

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
            return await throw_gold(obj);
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
            && touch_petrifies(mons[obj.corpsenm]) && !Stone_resistance()) {
            await You(`throw ${corpse_xname(obj, null, CXN_PFX_THE)} with your bare ${
                /* throwing with one hand, but pluralize since the
                   expression "with your bare hands" sounds better */
                makeplural(body_part(HAND))}.`);
            killer().name = `throwing ${killer_xname(obj)} bare-handed`;
            await instapetrify(killer().name);
        }
        if (welded(obj)) {
            await weldmsg(obj);
            res = ECMD_TIME;
            break unsplit;
        }
        if (is_wet_towel(obj))
            await dry_a_towel(obj, -1, false);

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
        /* (void) */ unsplitobj(obj);
    }
    return res;
}

// C ref: dothrow.c throw_gold()
async function throw_gold(obj) {
    const g = game;
    const u = g.u;
    let range, odx, ody;
    let mon;

    if (!u.dx && !u.dy && !u.dz) {
        await You("cannot throw gold at yourself.");
        /* If we tried to throw part of a stack, force it to merge back
           together (same as in throw_obj).  Essential for gold. */
        if (obj.o_id === g.context.objsplit?.parent_oid
            || obj.o_id === g.context.objsplit?.child_oid)
            /* (void) */ unsplitobj(obj);
        return ECMD_CANCEL;
    }
    freeinv(obj);
    if (u.uswallow) {
        let swallower = mon_nam(u.ustuck);

        if (digests(u.ustuck.data))
            swallower = s_suffix(swallower) + " entrails";
        await pline_The(`gold disappears into ${swallower}.`);
        add_to_minv(u.ustuck, obj);
        return ECMD_TIME;
    }

    if (u.dz) {
        if (u.dz < 0 && !Is_airlevel(u.uz) && !Underwater()
            && !Is_waterlevel_tg(u.uz))
            throw new Error('throw_gold(): gold thrown at the ceiling not ported yet');
        g.bhitpos = { x: u.ux, y: u.uy };
    } else {
        /* consistent with range for normal objects */
        range = Math.trunc(acurrstr() / 2) - Math.trunc(obj.owt / 40);

        /* see if the gold has a place to move into */
        odx = u.ux + u.dx;
        ody = u.uy + u.dy;
        if (!isok(odx, ody)
            || !ZAP_POS(g.level.at(odx, ody).typ) || closed_door(odx, ody)) {
            g.bhitpos = { x: u.ux, y: u.uy };
        } else {
            const pobj = { obj };
            mon = await bhit(u.dx, u.dy, range, THROWN_WEAPON,
                             null, null, pobj);
            obj = pobj.obj;
            if (!obj)
                return ECMD_TIME; /* object is gone */
            if (mon) {
                if (await ghitm(mon, obj)) /* was it caught? */
                    return ECMD_TIME;
            } else {
                if (await ship_object(obj, g.bhitpos.x, g.bhitpos.y, false))
                    return ECMD_TIME;
            }
        }
    }

    if (await flooreffects(obj, g.bhitpos.x, g.bhitpos.y, "fall"))
        return ECMD_TIME;
    if (u.dz > 0)
        await pline_The(`gold hits the ${surface(g.bhitpos.x, g.bhitpos.y)}.`);
    place_object(obj, g.bhitpos.x, g.bhitpos.y);
    if (u.ushops && u.ushops.length)
        await sellobj(obj, g.bhitpos.x, g.bhitpos.y);
    stackobj(obj);
    newsym(g.bhitpos.x, g.bhitpos.y);
    return ECMD_TIME;
}

// C ref: dothrow.c throwing_weapon()
/* return true for weapon meant to be thrown; excludes ammo */
export function throwing_weapon(obj) {
    const oc = objects[obj.otyp];
    return !!(is_missile(obj) || is_spear(obj)
              /* daggers and knife (excludes scalpel) */
              || (is_blade(obj) && !is_sword(obj) && (oc.oc_dir & PIERCE))
              /* special cases [might want to add AXE] */
              || obj.otyp === WAR_HAMMER || obj.otyp === AKLYS);
}

// C ref: dothrow.c throwit_return()
function throwit_return(clear_thrownobj) {
    game.iflags.returning_missile = null;
    if (clear_thrownobj)
        game.thrownobj = null;
}

// C ref: dothrow.c sho_obj_return_to_u()
async function sho_obj_return_to_u(obj) {
    const u = game.u;

    /* might already be our location (bounced off a wall) */
    if ((u.dx || u.dy) && (game.bhitpos.x !== u.ux || game.bhitpos.y !== u.uy)) {
        let x = game.bhitpos.x - u.dx, y = game.bhitpos.y - u.dy;

        await tmp_at(DISP_FLASH, obj_to_glyph(obj, rn2_on_display_rng));
        while (isok(x, y) && (x !== u.ux || y !== u.uy)) {
            await tmp_at(x, y);
            /* nh_delay_output() */
            x -= u.dx;
            y -= u.dy;
        }
        await tmp_at(DISP_END, 0);
    }
}

// C ref: dothrow.c swallowit()
/* engulfer gets the thrown object */
function swallowit(obj) {
    if (obj !== game.uball) {
        mpickobj(game.u.ustuck, obj); /* clears 'gt.thrownobj' */
        throwit_return(false);
    } else
        throwit_return(true);
}

// C ref: dothrow.c throwit_mon_hit()
/* thrown object hits a monster.
   mon may be NULL.
   returns TRUE if shopkeeper caught the object.
   may delete object, clearing gt.thrownobj */
export async function throwit_mon_hit(obj, mon) {
    const g = game;
    const u = g.u;
    if (mon) {
        if (mon.isshk && obj.where === 'OBJ_MINVENT' && obj.ocarry === mon)
            return true;
        await snuff_candle(obj);
        g.notonhead = (g.bhitpos.x !== mon.mx || g.bhitpos.y !== mon.my);
        const obj_gone = await thitmonst(mon, obj);
        /* Monster may have been tamed; this frees old mon [obsolete] */
        mon = m_at(g.bhitpos.x, g.bhitpos.y);

        /* [perhaps this should be moved into thitmonst or hmon] */
        if (mon && mon.isshk
            && (!inside_shop_sk(u.ux, u.uy)
                || !in_rooms_dt(mon.mx, mon.my, SHOPBASE_DT)
                       .includes((u.ushops || '')[0])))
            hot_pursuit_dt(mon);

        if (obj_gone)
            g.thrownobj = null;
    }
    return false;
}

// C ref: dothrow.c tmiss()
/* thrown object misses target monster */
async function tmiss(obj, mon, maybe_wakeup) {
    const missile = mshot_xname_dt(obj);

    /* If the target can't be seen or doesn't look like a valid target,
       avoid "the arrow misses it," or worse, "the arrows misses the mimic."
       An attentive player will still notice that this is different from
       an arrow just landing short of any target (no message in that case),
       so will realize that there is a valid target here anyway. */
    const ap = (mon.m_ap_type || 0) & M_AP_TYPMASK_DT;
    if (!canseemon(mon) || (ap && ap !== M_AP_MONSTER_DT))
        await pline(`${The(missile)} ${otense(obj, "miss")}.`);
    else
        await miss_dt(missile, mon);
    if (maybe_wakeup && !rn2(3))
        await wakeup(mon, true);
    return;
}

/* C ref: dothrow.c special_obj_hits_leader() */
function special_obj_hits_leader(obj, mon) {
    return ((is_quest_artifact_dt(obj) || objects[obj.otyp].oc_unique
             || (obj.otyp === FAKE_AMULET_OF_YENDOR_DT && !obj.known))
            && game.quest_status?.leader_m_id
            && mon.m_id === game.quest_status.leader_m_id);
}

/* C ref: mondata.h befriend_with_obj() */
function befriend_with_obj_dt(ptr, obj) {
    return (ptr === mons[PM_MONKEY_DT] || ptr === mons[PM_APE_DT])
        ? obj.otyp === BANANA_DT
        : (is_domestic_dt(ptr) && obj.oclass === FOOD_CLASS_DT
           && (ptr.mlet !== S_UNICORN_DT
               || objects[obj.otyp].oc_material === VEGGY_DT
               || (obj.otyp === CORPSE_DT && obj.corpsenm === PM_LICHEN_DT)));
}

// C ref: dothrow.c thitmonst()
/*
 * Object thrown by player arrives at monster's location.
 * Return 1 if obj has disappeared or otherwise been taken care of,
 * 0 if caller must take care of it.
 * Also used for kicked objects and for polearms/grapnel applied at range.
 */
export async function thitmonst(mon,
                                obj) { /* gt.thrownobj or gk.kickedobj or uwep */
    const g = game;
    const u = g.u;
    let tmp;     /* Base chance to hit */
    let disttmp; /* distance modifier */
    const otyp = obj.otyp;
    const guaranteed_hit = !!engulfing_u_dt(mon);

    const hmode = (obj === g.uwep) ? HMON_APPLIED_DT
                  : (obj === g.kickedobj) ? HMON_KICKED_DT
                    : HMON_THROWN_DT;

    /* Differences from melee weapons:
     *
     * Dex still gives a bonus, but strength does not.
     * Polymorphed players lacking attacks may still throw.
     * There's a base -1 to hit.
     * No bonuses for fleeing or stunned targets (they don't dodge
     *    melee blows as readily, but dodging arrows is hard anyway).
     * Not affected by traps, etc.
     * Certain items which don't in themselves do damage ignore 'tmp'.
     * Distance and monster size affect chance to hit.
     */
    tmp = -1 + ((u.uluck || 0) + (u.moreluck || 0)) + find_mac_dt(mon)
          + (u.uhitinc || 0)
          + (Upolyd() ? g.youmonst.data.mlevel : u.ulevel);
    if (ACURR(A_DEX_DT) < 4)
        tmp -= 3;
    else if (ACURR(A_DEX_DT) < 6)
        tmp -= 2;
    else if (ACURR(A_DEX_DT) < 8)
        tmp -= 1;
    else if (ACURR(A_DEX_DT) >= 14)
        tmp += (ACURR(A_DEX_DT) - 14);

    /* Modify to-hit depending on distance; but keep it sane.
     * Polearms get a distance penalty even when wielded; it's
     * hard to hit at a distance.
     */
    disttmp = 3 - distmin_dt(u.ux, u.uy, mon.mx, mon.my);
    if (disttmp < -4)
        disttmp = -4;
    tmp += disttmp;

    /* gloves are a hindrance to proper use of bows */
    if (g.uarmg && g.uwep && objects[g.uwep.otyp].oc_skill === P_BOW_DT) {
        switch (g.uarmg.otyp) {
        case GAUNTLETS_OF_POWER_DT: /* metal */
            tmp -= 2;
            break;
        case GAUNTLETS_OF_FUMBLING_DT:
            tmp -= 3;
            break;
        case LEATHER_GLOVES_DT:
        case GAUNTLETS_OF_DEXTERITY_DT:
            break;
        default:
            break; /* impossible("Unknown type of gloves") */
        }
    }

    tmp += omon_adj(mon, obj, true);
    if (is_orc_dt(mon.data)
        && (Upolyd() ? is_elf_dt(g.youmonst.data) : Race_if(PM_ELF_DT)))
        tmp++;
    if (guaranteed_hit) {
        tmp += 1000; /* Guaranteed hit */
    }

    /* throwing real gems to co-aligned unicorns boosts Luck,
       to cross-aligned unicorns changes Luck by random amount;
       throwing worthless glass doesn't affect Luck but doesn't anger them;
       5.0: treat rocks and gray stones as attacks rather than like glass
       and also treat gems or glass shot via sling as attacks */
    if (obj.oclass === GEM_CLASS && is_unicorn(mon.data)
        && objects[obj.otyp].oc_material !== MINERAL_DT && !uslinging()) {
        if (mon.msleeping || !mon.mcanmove) { /* helpless(mon) */
            await tmiss(obj, mon, false);
            return 0;
        } else if (mon.mtame) {
            await pline(`${Monnam_dt(mon)} catches and drops ${the(xname(obj))}.`);
            return 0;
        } else {
            await pline(`${Monnam_dt(mon)} catches ${the(xname(obj))}.`);
            throw new Error('thitmonst(): gem_accept() not ported yet');
        }
    }

    /* don't make game unwinnable if naive player throws artifact
       at leader... (kicked artifact is ok too; HMON_APPLIED could
       occur if quest artifact polearm or grapnel ever gets added) */
    if (hmode !== HMON_APPLIED_DT && special_obj_hits_leader(obj, mon))
        throw new Error('thitmonst(): special object hits leader not ported yet');

    const dieroll = rnd(20);

    if (obj.oclass === WEAPON_CLASS || is_weptool(obj)
        || obj.oclass === GEM_CLASS) {
        if (hmode === HMON_KICKED_DT) {
            /* throwing adjustments and weapon skill bonus don't apply */
            tmp -= (is_ammo(obj) ? 5 : 3);
        } else if (is_ammo(obj)) {
            if (!ammo_and_launcher(obj, g.uwep)) {
                tmp -= 4;
            } else {
                const uwep = g.uwep;
                tmp += (uwep.spe || 0) - greatest_erosion(uwep);
                tmp += weapon_hit_bonus_dt(uwep);
                if (uwep.oartifact)
                    tmp += spec_abon_dt(uwep, mon);
                /*
                 * Elves and Samurais are highly trained w/bows,
                 * especially their own special types of bow.
                 * Polymorphing won't make you a bow expert.
                 */
                if ((Race_if(PM_ELF_DT) || Role_if(PM_SAMURAI))
                    && (!Upolyd() || your_race_dt(g.youmonst.data))
                    && objects[uwep.otyp].oc_skill === P_BOW_DT) {
                    ++tmp;
                    if ((Race_if(PM_ELF_DT) && uwep.otyp === ELVEN_BOW_DT)
                        || (Role_if(PM_SAMURAI) && uwep.otyp === YUMI_DT))
                        ++tmp;
                }
            }
        } else { /* thrown non-ammo or applied polearm/grapnel */
            if (otyp === BOOMERANG) /* arbitrary */
                tmp += 4;
            else if (throwing_weapon(obj)) /* meant to be thrown */
                tmp += 2;
            else if (obj === g.thrownobj) /* not meant to be thrown */
                tmp -= 2;
            /* we know we're dealing with a weapon or weptool handled
               by WEAPON_SKILLS once ammo objects have been excluded */
            tmp += weapon_hit_bonus_dt(obj);
        }

        if (tmp >= dieroll) {
            const wasthrown = !!g.thrownobj,
                /* remember weapon attribute; hmon() might destroy obj */
                chopper = is_axe(obj);

            /* attack hits mon */
            if (hmode === HMON_APPLIED_DT) { /* ranged hit with wielded polearm */
                /* hmon()'s caller is expected to do this; however, hmon()
                   delivers the "hit with wielded weapon for first time"
                   gamelog message when applicable */
                u.uconduct.weaphit++;
            }
            if (await hmon_dt(mon, obj, hmode, dieroll)) { /* mon still alive */
                if (mon.wormno)
                    await cutworm_dt(mon, g.bhitpos.x, g.bhitpos.y, chopper);
            }
            await exercise(A_DEX_DT, true);
            /* if hero was swallowed and projectile killed the engulfer,
               'obj' got added to engulfer's inventory and then dropped,
               so we can't safely use that pointer anymore; it escapes
               the chance to be used up here... */
            if (wasthrown && !g.thrownobj)
                return 1;

            /* projectiles other than magic stones sometimes disappear
               when thrown; projectiles aren't among the types of weapon
               that hmon() might have destroyed so obj is intact */
            if (should_mulch_missile_dt(obj)) {
                if ((u.ushops && u.ushops.length) || obj.unpaid)
                    await check_shop_obj(obj, g.bhitpos.x, g.bhitpos.y, true);
                obfree_dt(obj, null);
                return 1;
            }
            await passive_obj_dt(mon, obj, null);
        } else {
            await tmiss(obj, mon, true);
            if (hmode === HMON_APPLIED_DT)
                await wakeup(mon, true);
        }

    } else if (otyp === HEAVY_IRON_BALL_DT) {
        await exercise(A_STR_DT, true);
        if (tmp >= dieroll) {
            const was_swallowed = guaranteed_hit;

            await exercise(A_DEX_DT, true);
            if (!await hmon_dt(mon, obj, hmode, dieroll)) { /* mon killed */
                if (was_swallowed && !u.uswallow && obj === g.uball)
                    return 1; /* already did placebc() */
            }
        } else {
            await tmiss(obj, mon, true);
        }

    } else if (otyp === BOULDER) {
        await exercise(A_STR_DT, true);
        if (tmp >= dieroll) {
            await exercise(A_DEX_DT, true);
            await hmon_dt(mon, obj, hmode, dieroll);
        } else {
            await tmiss(obj, mon, true);
        }

    } else if ((otyp === EGG_DT || otyp === CREAM_PIE_DT
                || otyp === BLINDING_VENOM || otyp === ACID_VENOM_DT)
               && (guaranteed_hit || ACURR(A_DEX_DT) > rnd(25))) {
        await hmon_dt(mon, obj, hmode, dieroll);
        return 1; /* hmon used it up */

    } else if (obj.oclass === POTION_CLASS_DT
               && (guaranteed_hit || ACURR(A_DEX_DT) > rnd(25))) {
        await potionhit_dt(mon, obj, POTHIT_HERO_THROW_DT);
        return 1;

    } else if (befriend_with_obj_dt(mon.data, obj)
               || (mon.mtame && dogfood_dt(mon, obj) <= ACCFOOD_DT)) {
        if (await tamedog(mon, obj, true)) {
            return 1; /* obj is gone */
        } else {
            await tmiss(obj, mon, false);
            mon.msleeping = 0;
            mon.mstrategy &= ~STRAT_WAITMASK;
        }
    } else if (guaranteed_hit) {
        const md = u.ustuck.data;

        /* this assumes that guaranteed_hit is due to swallowing */
        await wakeup(mon, true);
        if (obj.otyp === CORPSE && touch_petrifies(mons[obj.corpsenm])) {
            if (is_animal(md)) {
                await minstapetrify(u.ustuck, true);
                /* Don't leave a cockatrice corpse available in a statue */
                if (!u.uswallow) {
                    delobj(obj);
                    return 1;
                }
            }
        }
        const trail = digests(md) ? " entrails"
                      : is_whirly(md) ? " currents" : "";
        let monname = mon_nam(mon);
        if (trail)
            monname = s_suffix(monname);
        await pline(`${Tobjnam(obj, "vanish")} into ${monname}${trail}.`);
    } else {
        await tmiss(obj, mon, true);
    }

    return 0;
}

// C ref: dothrow.c throwit()
/* throw an object, NB: obj may be consumed in the process */
export async function throwit(obj,
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
        await exercise(A_CON, false);
        u.dx = u.dy = 0;
        u.dz = 1;
    }

    g.thrownobj = obj;
    g.thrownobj.how_lost = LOST_THROWN;
    g.iflags.returning_missile = AutoReturn(obj, wep_mask) ? obj : null;
    /* NOTE:  No early returns after this point or returning_missile
       will be left with a stale pointer. */

    if (u.uswallow) {
        if (obj === g.uball) {
            g.uball.ox = g.uchain.ox = u.ux;
            g.uball.oy = g.uchain.oy = u.uy;
        }
        mon = u.ustuck;
        g.bhitpos.x = mon.mx;
        g.bhitpos.y = mon.my;
        if (tethered_weapon)
            await tmp_at(DISP_TETHER, obj_to_glyph(obj, rn2_on_display_rng));
    } else if (u.dz) {
        /* toss_up(), hitfloor(), potionhit() on the steed */
        throw new Error('throwit(): throwing up or down not ported yet');
    } else if (obj.otyp === BOOMERANG && !Underwater()) {
        if (Is_airlevel(u.uz) || Levitation())
            await hurtle(-u.dx, -u.dy, 1, true);
        mon = await boomhit(obj, u.dx, u.dy);
        g.iflags.returning_missile = null; /* has returned or isn't going to */
        if (mon === g.youmonst) { /* the thing was caught */
            await exercise(A_DEX_DT, true);
            obj = await return_throw_to_inv(obj, wep_mask, twoweap, oldslot);
            throwit_return(true);
            return;
        }
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
            await hurtle(-u.dx, -u.dy, urange, true);

        if (!obj) {
            /* bhit display cleanup was left with this caller
               for tethered_weapon, but clean it up now since
               we're about to return */
            if (tethered_weapon)
                await tmp_at(DISP_END, 0);
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
        if (tethered_weapon)
            await tmp_at(DISP_END, 0);
    } else if (u.uswallow && !g.iflags.returning_missile) {
        swallowit(obj);
        return;
    } else {
        /* Mjollnir must be wielded to be thrown--caller verifies this;
           aklys must be wielded as primary to return when thrown */
        if (g.iflags.returning_missile) { /* Mjollnir or aklys */
            if (rn2(100)) {
                if (tethered_weapon)
                    await tmp_at(DISP_END, BACKTRACK);
                else
                    await sho_obj_return_to_u(obj); /* display its flight */

                if (!impaired && rn2(100)) {
                    await pline(`${Tobjnam(obj, "return")} to your hand!`);
                    obj = await addinv_before(obj, oldslot);
                    await encumber_msg();
                    /* addinv autoquivers an aklys if quiver is empty;
                       if obj is quivered, remove it before wielding */
                    if (obj.owornmask & W_QUIVER)
                        setuqwep(null);
                    setuwep(obj);
                    set_twoweap(twoweap); /* u.twoweap = twoweap */
                    if (cansee(g.bhitpos.x, g.bhitpos.y))
                        newsym(g.bhitpos.x, g.bhitpos.y);
                } else {
                    let dmg = rn2(2);

                    if (!dmg) {
                        await pline(Blind()
                            ? `Something lands ${Levitation() ? "beneath" : "at"} your ${makeplural(body_part(FOOT))}.`
                            : `${Tobjnam(obj, "return")} back to you, landing ${Levitation() ? "beneath" : "at"} your ${makeplural(body_part(FOOT))}.`);
                    } else {
                        dmg += rnd(3);
                        await pline(Blind()
                            ? `${Tobjnam(obj, "hit")} your ${body_part(ARM)}!`
                            : `${Tobjnam(obj, "fly")} back toward you, hitting your ${body_part(ARM)}!`);
                        if (obj.oartifact) {
                            const pdmg = { val: dmg };
                            /* (void) */ await artifact_hit(null, g.youmonst, obj, pdmg, 0);
                            dmg = pdmg.val;
                        }
                        await losehp(Maybe_Half_Phys(dmg), killer_xname(obj),
                                     KILLED_BY);
                    }

                    if (u.uswallow) {
                        swallowit(obj);
                        return;
                    }
                    if (!(await ship_object(obj, u.ux, u.uy, false)))
                        await dropy(obj);
                }
                throwit_return(true);
                return;
            } else {
                if (tethered_weapon)
                    await tmp_at(DISP_END, 0);
                /* when this location is stepped on, the weapon will be
                   auto-picked up due to 'obj->how_lost' of LOST_THROWN;
                   addinv() prevents thrown Mjollnir from being placed
                   into the quiver slot, but an aklys will end up there if
                   that slot is empty at the time; since hero will need to
                   explicitly rewield the weapon to get throw-and-return
                   capability back anyway, quivered or not shouldn't matter */
                await pline(`${Tobjnam(obj, "fail")} to return!`);

                if (u.uswallow) {
                    swallowit(obj);
                    return;
                }
                /* continue below with placing 'obj' at target location */
            }
        }

        const bx = g.bhitpos.x, by = g.bhitpos.y;
        if ((!IS_SOFT(g.level.at(bx, by).typ) && breaktest(obj))
            /* venom [via #monster to spit while poly'd] fails breaktest()
               but we want to force breakage even when location IS_SOFT() */
            || obj.oclass === VENOM_CLASS) {
            await tmp_at(DISP_FLASH, obj_to_glyph(obj, rn2_on_display_rng));
            await tmp_at(bx, by);
            /* nh_delay_output() */
            await tmp_at(DISP_END, 0);
            await breakmsg(obj, cansee_br(bx, by));
            if (await breakobj(obj, bx, by, true, true)) {
                throwit_return(true);
                return;
            }
        }
        if (!(Deaf() || u.uroleplay?.deaf) && !Underwater()) {
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
        /* (void) */ await snuff_candle(obj);
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
            await container_impact_dmg(obj, u.ux, u.uy);
            impact_disturbs_zombies(obj, true);
        }
        /* charge for items thrown out of shop;
           shk takes possession for items thrown into one */
        if (((u.ushops && u.ushops.length) || obj.unpaid) && obj !== g.uball)
            await check_shop_obj(obj, g.bhitpos.x, g.bhitpos.y, false);

        stackobj(obj);
        if (obj === g.uball)
            await drop_ball(bx, by);
        if (cansee(bx, by))
            newsym(bx, by);
        /* if (obj_sheds_light(obj)) vision_full_recalc = 1: lit objects
           are refused above */
    }

    throwit_return(false);
}

// C ref: dothrow.c return_throw_to_inv()
/* hero catches a thrown object that returned (a boomerang) */
async function return_throw_to_inv(
    obj,      /* object to add to invent */
    wep_mask, /* its owornmask before it was removed from invent */
    twoweap,  /* True if hero was dual-wielding before removal */
    oldslot) { /* following item in invent in case of '!fixinv' */
    const g = game;
    let otmp = null;
    const os = g.context.objsplit || { parent_oid: 0, child_oid: 0 };

    /* if 'obj' is from a stack split, we can put it back by undoing split
       so there's no chance of merging with some other compatible stack */
    if (obj.o_id === os.parent_oid || obj.o_id === os.child_oid) {
        obj.nobj = g.invent;
        g.invent = obj;
        obj.where = 'OBJ_INVENT';
        otmp = unsplitobj(obj);
        if (!otmp) {
            g.invent = obj.nobj;
            obj.nobj = null;
            obj.where = 'OBJ_FREE';
        } else {
            obj = otmp;
        }
    }

    /* if 'obj' wasn't from a stack split or if it wouldn't merge back
       (maybe new erosion damage?) then it needs to be added to invent;
       don't merge with any other stack even if there is a compatible one
       (others with similar erosion?); can't use addinv_nomerge() here */
    if (!otmp) {
        obj.nomerge = 1; /* redundant unless 'oldslot' somehow went away */
        obj = await addinv_before(obj, oldslot);
        obj.nomerge = 0;

        /* in case addinv() autoquivered */
        if ((obj.owornmask & W_QUIVER) !== 0
            && ((obj.owornmask | wep_mask) & (W_WEP | W_SWAPWEP)) !== 0)
            setuqwep(null);

        if ((wep_mask & W_WEP) && !g.uwep)
            setuwep(obj);
        else if ((wep_mask & W_SWAPWEP) && !g.uswapwep)
            setuswapwep(obj);
        else if ((wep_mask & W_QUIVER) && !g.uquiver)
            setuqwep(obj);

        /* in case the throw ended dual-wielding, reinstate it after
           successful catch (not needed for boomerang split/unsplit) */
        if (twoweap && !g.u.twoweap)
            set_twoweap(true); /* u.twoweap = TRUE */
    }

    await encumber_msg();
    return obj;
}

// C ref: dothrow.c check_shop_obj()
/* charge for an object thrown out of a shop (or into a different shop), or
   let the shopkeeper take possession of one thrown into his shop */
async function check_shop_obj(obj, x, y, broken) {
    const u = game.u;
    const ushops = (u.ushops || '').charCodeAt(0) || 0; /* *u.ushops */
    const shkp = shop_keeper(ushops);

    if (!shkp)
        return;

    const costly_xy = costly_spot(x, y);
    if (broken || !costly_xy
        || ((in_rooms(x, y, SHOPBASE).charCodeAt(0) || 0) !== ushops)) {
        /* thrown out of a shop or into a different shop */
        if (is_unpaid(obj))
            await stolen_value(obj, u.ux, u.uy, !!shkp.mpeaceful, false);
        if (broken)
            obj.no_charge = 1;
    } else if (costly_xy) {
        const oshops = in_rooms(x, y, SHOPBASE).charCodeAt(0) || 0;

        /* ushops0: in case we threw while levitating and recoiled
           out of shop (most likely to the shk's spot in front of door) */
        if (oshops === ushops
            || oshops === ((u.ushops0 || '').charCodeAt(0) || 0)) {
            if (is_unpaid(obj)) {
                const gtg = Has_contents(obj) ? contained_gold(obj, true) : 0;

                subfrombill(obj, shkp);
                if (gtg > 0)
                    await donate_gold(gtg, shkp, true);
            } else if (x !== shkp.mx || y !== shkp.my) {
                await sellobj(obj, x, y);
            }
        }
    }
}

// C ref: dothrow.c omon_adj()
/* an object may hit a monster; various factors adjust chance of hitting */
export function omon_adj(mon, obj, mon_notices) {
    let tmp = 0;

    /* size of target affects the chance of hitting */
    tmp += (mon.data.msize - MZ_MEDIUM); /* -2..+5 */
    /* sleeping target is more likely to be hit */
    if (mon.msleeping) {
        tmp += 2;
    }
    /* ditto for immobilized target */
    if (!mon.mcanmove || !mon.data.mmove) {
        tmp += 4;
        if (mon_notices && mon.data.mmove && !rn2(10)) {
            mon.mcanmove = 1;
            mon.mfrozen = 0;
        }
    }
    /* some objects are more likely to hit than others */
    switch (obj.otyp) {
    case HEAVY_IRON_BALL:
        if (obj !== game.uball)
            tmp += 2;
        break;
    case BOULDER:
        tmp += 6;
        break;
    default:
        if (obj.oclass === WEAPON_CLASS || is_weptool(obj)
            || obj.oclass === GEM_CLASS)
            tmp += hitval(obj, mon);
        break;
    }
    return tmp;
}

// C ref: dothrow.c hitfloor()
/* Object hits floor at hero's feet.
   Called from drop(), throwit(), hold_another_object(), litter(). */
export async function hitfloor(obj,
                               verbosely) /* usually True; False if caller has given drop mesg */ {
    const u = game.u;

    if (IS_SOFT(game.level.at(u.ux, u.uy).typ) || u.uinwater || u.uswallow) {
        await dropy(obj);
        return;
    }
    if (IS_ALTAR(game.level.at(u.ux, u.uy).typ)) {
        await doaltarobj(obj);
    } else if (verbosely) {
        const verb = (obj.otyp === WAN_STRIKING) ? "strike" : "hit";
        let surf = surface(u.ux, u.uy);
        const t = t_at(u.ux, u.uy);

        /* describe something that might keep the object where it is
           or precede next message stating that it falls */
        if (t && t.tseen) {
            switch (t.ttyp) {
            case TRAPDOOR:
                surf = "trap door";
                break;
            case HOLE:
                surf = "edge of the hole";
                break;
            case PIT:
            case SPIKED_PIT:
                surf = "edge of the pit";
                break;
            default:
                break;
            }
        }
        const dn = doname(obj);
        await pline(`${dn.charAt(0).toUpperCase() + dn.slice(1)} ${ /* Doname2() */
            otense(obj, verb)} the ${surf}.`);
    }

    if (await hero_breaks(obj, u.ux, u.uy, BRK_FROM_INV))
        return;
    if (await ship_object(obj, u.ux, u.uy, false))
        return;
    await dropz(obj, true);
}

// C ref: dothrow.c hero_breaks()
/*
 * The object is going to break because of something the hero did.
 * Return 0 if the object doesn't break, 1 if the object broke.
 */
export async function hero_breaks(obj,
                           x, y, /* object location (ox, oy may not be right) */
                           breakflags) {
    /* from_invent: thrown or dropped by player; maybe on shop bill;
       by-hero is implicit so callers don't need to specify BRK_BY_HERO */
    const from_invent = (breakflags & BRK_FROM_INV) !== 0,
        in_view = Blind_br() ? false : (from_invent || cansee_br(x, y));
    let brk = (breakflags & BRK_KNOWN_OUTCOME);

    /* only call breaktest if caller hasn't already specified the outcome */
    if (!brk)
        brk = breaktest(obj) ? BRK_KNOWN2BREAK : BRK_KNOWN2NOTBREAK;
    if (brk === BRK_KNOWN2NOTBREAK)
        return 0;

    await breakmsg(obj, in_view);
    return await breakobj(obj, x, y, true, from_invent);
}

// C ref: dothrow.c breaks()
/*
 * The object is going to break for a reason other than the hero doing
 * something to it.
 * Return 0 if the object doesn't break, 1 if the object broke.
 */
export async function breaks(obj,
                             x, y) /* object location (ox, oy may not be right) */
{
    const in_view = Blind_br() ? false : cansee_br(x, y);

    if (!breaktest(obj))
        return 0;
    await breakmsg(obj, in_view);
    return await breakobj(obj, x, y, false, false);
}

// C ref: dothrow.c breakobj()
/*
 * Unconditionally break an object. Assumes all resistance checks
 * and break messages have been delivered prior to getting here.
 */
export async function breakobj(
    obj,
    x, y,          /* object location (ox, oy may not be right) */
    hero_caused,   /* is this the hero's fault? */
    from_invent) {
    const u = game.u;
    let fracture = false;
    let explosion = false;

    if (is_crackable(obj)) /* if erodeproof, erode_obj() will say so */
        return ((await erode_obj(obj, armor_simple_name(obj), ERODE_CRACK,
                                 EF_DESTROY | EF_VERBOSE)) === ER_DESTROYED);

    switch (obj.oclass === POTION_CLASS ? POT_WATER : obj.otyp) {
    case MIRROR:
        if (hero_caused)
            change_luck(-2);
        break;
    case POT_WATER: /* really, all potions */
        obj.in_use = 1; /* in case it's fatal */
        if (obj.otyp === POT_OIL && obj.lamplit) {
            throw new Error('breakobj(): explode_oil() not ported yet');
        } else if (dist2(x, y, u.ux, u.uy) <= 2) { /* next2u(x, y) */
            const ptr = game.youmonst.data;
            const breathless = (ptr.mflags1 & M1_BREATHLESS) !== 0;
            if (!breathless || haseyes(ptr)) {
                /* wet towel protects both eyes and breathing */
                if (obj.otyp !== POT_WATER
                    && !(game.ublindf && game.ublindf.otyp === TOWEL)) { /* !Half_gas_damage */
                    if (!breathless) {
                        /* [what about "familiar odor" when known?] */
                        await You("smell a peculiar odor...");
                    } else {
                        let eyes = body_part(EYE);

                        /* eyecount(ptr) */
                        if (!(haseyes(ptr) && (ptr === mons[PM_CYCLOPS]
                                               || ptr === mons[PM_FLOATING_EYE])))
                            eyes = makeplural(eyes);
                        await pline(`Your ${eyes} ${vtense(eyes, "water")}.`); /* Your() */
                    }
                }
                await potionbreathe(obj);
            }
        }
        /* monster breathing isn't handled... [yet?] */
        break;
    case EXPENSIVE_CAMERA:
        throw new Error('breakobj(): release_camera_demon() not ported yet');
    case EGG:
        /* breaking your own eggs is bad luck */
        if (hero_caused && obj.spe && obj.corpsenm >= LOW_PM) /* ismnum() */
            change_luck(-Math.min(obj.quan, 5));
        if (obj.corpsenm === PM_PYROLISK)
            explosion = true;
        break;
    case BOULDER:
    case STATUE:
        /* caller will handle object disposition;
           we're just doing the shop theft handling */
        fracture = true;
        break;
    default:
        break;
    }

    if (hero_caused) {
        if (from_invent || obj.unpaid) {
            if ((u.ushops && u.ushops.length) || obj.unpaid)
                await check_shop_obj(obj, x, y, true);
        } else if (!obj.no_charge && costly_spot_br(x, y)) {
            /* it is assumed that the obj is a floor-object */
            throw new Error('breakobj(): breaking a shop floor object not ported yet');
        }
    }
    if (!fracture)
        delobj(obj);
    if (explosion)
        await explode(x, y, -11, d(3, 6), 0, EXPL_FIERY);
    return 1;
}

// C ref: dothrow.c breakmsg()
async function breakmsg(obj, in_view) {
    let to_pieces;

    if (is_crackable(obj)) /* breakobj() will call erode_obj() for message */
        return;

    to_pieces = "";
    switch (obj.oclass === POTION_CLASS ? POT_WATER : obj.otyp) {
    default: /* glass or crystal wand */
        /* if (obj->oclass != WAND_CLASS) impossible("breaking odd object") */
        /* FALLTHRU */
    case LENSES:
    case MIRROR:
    case CRYSTAL_BALL:
    case EXPENSIVE_CAMERA:
        to_pieces = " into a thousand pieces";
        /* FALLTHRU */
    case POT_WATER: /* really, all potions */
        if (!in_view) {
            await You_hear_br("something shatter!"); /* You_hear("%s shatter!", something) */
        } else {
            const dn = doname(obj);
            await pline(`${dn.charAt(0).toUpperCase()}${dn.slice(1)} shatter${ /* Doname2() */
                (obj.quan === 1) ? "s" : ""}${to_pieces}!`);
        }
        break;
    case EGG:
    case MELON:
        await pline("Splat!");
        break;
    case CREAM_PIE:
        if (in_view)
            await pline("What a mess!");
        break;
    case ACID_VENOM:
    case BLINDING_VENOM:
        await pline("Splash!");
        break;
    }
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

// C ref: zap.c bhit() -- thrown (THROWN_WEAPON) and kicked (KICKED_WEAPON)
// objects and IMMEDIATE wands (ZAPPED_WAND); flashed light and invisible
// beams are not ported yet
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
    let bhit_done = false; /* left the loop by 'goto bhit_done' */
    let shopdoor = false;
    const skip = { start: 0, end: 0 };
    let skipcount = 0;
    const was_returning = (g.iflags.returning_missile === obj) ? obj : null;
    void point_blank;

    if (weapon === KICKED_WEAPON) {
        /* object starts one square in front of player */
        g.bhitpos = { x: u.ux + ddx, y: u.uy + ddy };
        range--;
    } else {
        g.bhitpos = { x: u.ux, y: u.uy };
    }

    if (weapon === THROWN_WEAPON && obj && obj.otyp === ROCK) {
        skiprange(range, skip);
        allow_skip = !rn2(3);
    }

    if (weapon === FLASHED_LIGHT) {
        await tmp_at(DISP_BEAM, 0); /* cmap_to_glyph(S_flashbeam) */
    } else if (weapon === THROWN_TETHERED_WEAPON && obj) {
        tethered_weapon = true;
        weapon = THROWN_WEAPON; /* simplify 'if's that follow below */
        await tmp_at(DISP_TETHER, obj_to_glyph(obj, rn2_on_display_rng));
    } else if (weapon !== ZAPPED_WAND && weapon !== INVIS_BEAM)
        await tmp_at(DISP_FLASH, obj_to_glyph(obj, rn2_on_display_rng));

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
        if (typ === WATER || typ === LAVAWALL) { /* IS_WATERWALL(typ) */
            if (weapon === THROWN_WEAPON || weapon === KICKED_WEAPON)
                break;
        }

        /* iron bars will block anything big enough and break some things */
        if (weapon === THROWN_WEAPON || weapon === KICKED_WEAPON) {
            if (obj.lamplit && !Blind())
                await show_transient_light(obj, x, y);
            if (typ === IRONBARS
                && await hits_bars(pobj, x - ddx, y - ddy, x, y,
                                   point_blank ? 0 : (!rn2(5) ? 1 : 0), 1)) {
                /* caveat: obj might now be null... */
                obj = pobj.obj; /* not currently needed due to 'break'; keep */
                g.bhitpos.x -= ddx;
                g.bhitpos.y -= ddy;
                break;
            }
        } else if (weapon === FLASHED_LIGHT) {
            if (!Blind())
                await show_transient_light(null, x, y);
        }

        if (weapon === ZAPPED_WAND) {
            /* cancellation/opening/locking/striking/probing */
            await zap_map(x, y, obj);
            /* terrain might have changed (exposed secret door|corridor) */
            typ = g.level.at(x, y).typ;
        }

        mtmp = m_at(x, y);
        ttmp = t_at(x, y);
        if (!mtmp && ttmp && (ttmp.ttyp === WEB)
            && (weapon === THROWN_WEAPON || weapon === KICKED_WEAPON)
            && !rn2(3)) {
            if (cansee(x, y)) {
                await pline(`${Yname2_bh(obj)} gets stuck in a web!`);
                ttmp.tseen = true;
                newsym(x, y);
            }
            if (was_returning)
                g.iflags.returning_missile = null;
            break;
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
        const xyglyph = glyph_at(x, y);
        if (mtmp && (((weapon === THROWN_WEAPON || weapon === KICKED_WEAPON)
                      && (await shade_miss(game.youmonst, mtmp, obj, true, true)
                          || (mtmp.m_ap_type === M_AP_OBJECT
                              && xyglyph.kind !== 'mon' /* !glyph_is_monster() */
                              && !glyph_is_warning(xyglyph)
                              && !glyph_is_invisible(xyglyph))))
                     || (weapon === FLASHED_LIGHT
                         && mtmp.m_ap_type === M_AP_OBJECT)))
            mtmp = null;

        if (mtmp) {
            g.notonhead = (x !== mtmp.mx || y !== mtmp.my);
            if (weapon === FLASHED_LIGHT) {
                /* FLASHED_LIGHT hitting invisible monster should pass
                   through instead of stop so we call flash_hits_mon()
                   directly rather than returning mtmp back to caller.
                   That allows the flash to keep on going.  Note that we
                   use mtmp->minvis, not canspotmon(), because it makes no
                   difference whether hero can see the monster or not. */
                if (mtmp.minvis) {
                    obj.ox = u.ux, obj.oy = u.uy;
                    await flash_hits_mon(mtmp, obj);
                } else {
                    await tmp_at(DISP_END, 0);
                    result = mtmp; /* caller will call flash_hits_mon() */
                    bhit_done = true;
                    break; /* goto bhit_done */
                }
            } else if (weapon === INVIS_BEAM) {
                /* Like FLASHED_LIGHT, INVIS_BEAM should continue
                   through invisible targets; unlike it, we aren't
                   prepared for multiple hits so just get first one
                   that's either visible or could see its invisible
                   self.  [No tmp_at() cleanup is needed here.] */
                if (!mtmp.minvis || perceives(mtmp.data)) {
                    result = mtmp;
                    bhit_done = true;
                    break; /* goto bhit_done */
                }
            } else if (weapon !== ZAPPED_WAND) {
                /* THROWN_WEAPON, KICKED_WEAPON */
                if (!tethered_weapon)
                    await tmp_at(DISP_END, 0);
                if (cansee(x, y) && !canspotmon(mtmp))
                    map_invisible(x, y);
                result = mtmp;
                bhit_done = true;
                break; /* goto bhit_done */
            } else {
                /* ZAPPED_WAND */
                if (await fhitm(mtmp, obj)) {
                    result = mtmp;
                    bhit_done = true;
                    break; /* goto bhit_done */
                }
                range -= 3;
            }
        } else {
            if (weapon === ZAPPED_WAND && obj.otyp === WAN_PROBING
                && glyph_is_invisible(g.level.at(x, y).glyph)) {
                unmap_object(x, y);
                newsym(x, y);
            }
        }
        if (fhito) {
            if (await bhitpile(obj, fhito, x, y, 0))
                range--;
        } else {
            if (weapon === KICKED_WEAPON
                && ((obj.oclass === COIN_CLASS && OBJ_AT(x, y))
                    || await ship_object(obj, x, y, costly_spot(x, y)))) {
                await tmp_at(DISP_END, 0);
                bhit_done = true;
                break; /* goto bhit_done; result == (struct monst *) 0 */
            }
        }
        if (weapon === ZAPPED_WAND && (IS_DOOR(typ) || typ === SDOOR)) {
            switch (obj.otyp) {
            case WAN_OPENING:
            case WAN_LOCKING:
            case WAN_STRIKING:
            case SPE_KNOCK_BH:
            case SPE_WIZARD_LOCK_BH:
            case SPE_FORCE_BOLT_BH:
                if (await doorlock_bh(obj, x, y)) {
                    if (cansee_br(x, y) || (obj.otyp === WAN_STRIKING && !Deaf()))
                        learnwand_bh(obj);
                    if (g.level.at(x, y).doormask === D_BROKEN_BH
                        && in_rooms_dt(x, y, SHOPBASE_DT).length) {
                        shopdoor = true;
                        add_damage_bh(x, y, SHOP_DOOR_COST_BH);
                    }
                }
                break;
            }
        }
        if (!ZAP_POS(typ) || closed_door(x, y)) {
            g.bhitpos.x -= ddx;
            g.bhitpos.y -= ddy;
            break;
        }
        if (weapon !== ZAPPED_WAND && weapon !== INVIS_BEAM) {
            /* 'I' present but no monster: erase; do this before tmp_at() */
            if (g.level.at(x, y).glyph !== undefined
                && glyph_is_invisible(g.level.at(x, y).glyph)
                && cansee(x, y)) {
                unmap_object(x, y);
                newsym(x, y);
            }
            await tmp_at(x, y);
            /* nh_delay_output() */
            /* kicked objects fall in pools */
            if ((weapon === KICKED_WEAPON) && is_pool_or_lava(x, y))
                break;
            if (IS_SINK(typ) && weapon !== FLASHED_LIGHT)
                break; /* physical objects fall onto sink */
        }
        /* limit range of ball so hero won't make an invalid move */
        if (weapon === THROWN_WEAPON && range > 0
            && obj.otyp === HEAVY_IRON_BALL)
            throw new Error('bhit(): thrown heavy iron ball not ported yet');

        /* thrown/kicked missile has moved away from its starting spot */
        point_blank = false; /* affects passing through iron bars */
    }

    if (!bhit_done
        && ((weapon !== ZAPPED_WAND && weapon !== INVIS_BEAM
             && !tethered_weapon)
            || (was_returning && was_returning !== g.iflags.returning_missile)))
        await tmp_at(DISP_END, 0);

    if (!bhit_done && shopdoor)
        await pay_for_damage_bh("destroy", false);

    /* bhit_done: */
    /* note: for FLASHED_LIGHT, _caller_ must call transient_light_cleanup()
       after possibly calling flash_hits_mon() */
    if (weapon === THROWN_WEAPON || weapon === KICKED_WEAPON)
        await transient_light_cleanup();

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
export function uslinging() {
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

// C ref: dothrow.c autoquiver()
/* Suggested by Jeffrey Bay <jbay@convex.hp.com> */
function autoquiver() {
    let otmp, oammo = null, omissile = null, omisc = null, altammo = null;

    if (game.uquiver)
        return;

    /* Scan through the inventory */
    for (otmp = game.invent; otmp; otmp = otmp.nobj) {
        if (otmp.owornmask || otmp.oartifact || !otmp.dknown) {
            ; /* Skip it */
        } else if (otmp.otyp === ROCK
                   /* seen rocks or known flint or known glass */
                   || (otmp.otyp === FLINT
                       && objects[otmp.otyp].oc_name_known)
                   || (otmp.oclass === GEM_CLASS
                       && objects[otmp.otyp].oc_material === GLASS
                       && objects[otmp.otyp].oc_name_known)) {
            if (uslinging())
                oammo = otmp;
            else if (ammo_and_launcher(otmp, game.uswapwep))
                altammo = otmp;
            else if (!omisc)
                omisc = otmp;
        } else if (otmp.oclass === GEM_CLASS) {
            ; /* skip non-rock gems--they're ammo but
                 player has to select them explicitly */
        } else if (is_ammo(otmp)) {
            if (ammo_and_launcher(otmp, game.uwep))
                /* Ammo matched with launcher (bow+arrow, crossbow+bolt) */
                oammo = otmp;
            else if (ammo_and_launcher(otmp, game.uswapwep))
                altammo = otmp;
            else
                /* Mismatched ammo (no better than an ordinary weapon) */
                omisc = otmp;
        } else if (is_missile(otmp)) {
            /* Missile (dart, shuriken, etc.) */
            omissile = otmp;
        } else if (otmp.oclass === WEAPON_CLASS && throwing_weapon(otmp)) {
            /* Ordinary weapon */
            if (objects[otmp.otyp].oc_skill === P_DAGGER && !omissile)
                omissile = otmp;
            else if (otmp.otyp === AKLYS)
                continue;
            else
                omisc = otmp;
        }
    }

    /* Pick the best choice */
    if (oammo)
        setuqwep(oammo);
    else if (omissile)
        setuqwep(omissile);
    else if (altammo)
        setuqwep(altammo);
    else if (omisc)
        setuqwep(omisc);

    return;
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
                return await use_pole(uwep, true);
            /* if we're wielding a bullwhip, apply it */
            } else if (uwep && uwep.otyp === BULLWHIP) {
                return await use_whip(uwep);
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
            autoquiver();
            obj = game.uquiver;
            if (obj) {
                /* give feedback if quiver has now been filled */
                game.uquiver.owornmask &= ~W_QUIVER; /* less verbose */
                await prinv("You ready:", obj, 0);
                game.uquiver.owornmask |= W_QUIVER;
            } else {
                await You("have nothing appropriate for your quiver.");
            }
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
        if (uwep && is_pole(uwep) && could_pole_mon())
            return await use_pole(uwep, true);
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
        await You_feel("the spirits holding you back."); /* You_feel() */
        return false;
    } else if (!(await in_out_region(x, y))) {
        return false;
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

        let obj;
        if (IS_OBSTRUCTED(lev.typ) || closed_door(x, y) || odoor_diag) {
            why = IS_TREE(ltyp) ? "bumping into a tree"
                  : IS_OBSTRUCTED(ltyp) ? "bumping into a wall"
                    : odoor_diag ? "bumping into a door frame"
                      : "bumping into a closed door";
            if (odoor_diag)
                await You("hit the door frame!");
            await pline("Ouch!");
        } else if (ltyp === IRONBARS) {
            why = "crashing into iron bars";
            await You("crash into some iron bars.  Ouch!");
        } else if ((obj = sobj_at(BOULDER, x, y))) {
            why = "bumping into a boulder";
            await You(`bump into a ${xname(obj)}.  Ouch!`);
        } else if (!may_pass) {
            /* did we hit a no-dig non-wall position? */
            why = "touching the edge of the universe";
            await You("smack into something!");
        } else if (diagonal
                   && bad_rock(game.youmonst.data, u.ux, y)
                   && bad_rock(game.youmonst.data, x, u.uy)) {
            throw new Error('hurtle_step(): squeezing diagonally not ported yet');
        }
        if (why) {
            const dmg = rnd(2 + arg.range);
            await losehp(Maybe_Half_Phys(dmg), why, KILLED_BY);
            await wake_nearto(x, y, 10);
            return false;
        }
    }

    if ((mon = m_at(x, y)) !== null && mon !== undefined) {
        const glyph = glyph_at(x, y);

        mon.mundetected = 0; /* wakeup() will handle mimic */
        /* after unhiding; combination of a_monnam() and some_mon_nam();
           yields "someone" or "something" instead of "it" for unseen mon */
        const mnam = x_monnam(mon, ARTICLE_A, null,
                              ((mon.mgivenname ? SUPPRESS_SADDLE : 0)
                               | AUGMENT_IT), false);
        if (glyph.kind !== 'mon' /* !glyph_is_monster(glyph) */
            && !glyph_is_invisible(glyph))
            await You(`find ${mnam} by bumping into ${noit_mhim(mon)}.`);
        else
            await You(`bump into ${mnam}.`);
        await wakeup(mon, false);
        if (!canspotmon(mon))
            map_invisible(mon.mx, mon.my);
        await setmangry(mon, false);
        if (touch_petrifies(mon.data)
            /* this is a bodily collision, so check for body armor */
            && !game.uarmu && !game.uarm && !game.uarmc) {
            killer().name = `bumping into ${an(pmname(mon.data, NEUTRAL))}`;
            await instapetrify(killer().name);
        }
        if (touch_petrifies(game.youmonst.data)
            && !which_armor_hu(mon, W_ARMU_HU | W_ARM_HU | W_ARMC_HU)) {
            await minstapetrify(mon, true);
        }
        await wake_nearto(x, y, 10);
        return false;
    }

    if ((u.ux - x) && (u.uy - y)
        && bad_rock(game.youmonst.data, u.ux, y)
        && bad_rock(game.youmonst.data, x, u.uy)) {
        /* Move at a diagonal. */
        if (game.level.flags.sokoban_rules) { /* Sokoban */
            await You("come to an abrupt halt!");
            return false;
        }
    }

    /* caller has already determined that dragging the ball is allowed;
       if ball is carried we might still need to drag the chain */
    if (game.uball) { /* Punished */
        const bc = { bc_control: 0, ballx: 0, bally: 0, chainx: 0, chainy: 0,
                     cause_delay: false };

        if (await drag_ball(x, y, bc, true))
            move_bc(0, bc.bc_control, bc.ballx, bc.bally, bc.chainx, bc.chainy);
    }

    ox = u.ux;
    oy = u.uy;
    await u_on_newpos(x, y); /* set u.<ux,uy>, u.usteed-><mx,my>; cliparound(); */
    newsym(ox, oy);    /* update old position */
    vision_recalc(1);  /* update for new position */
    await flush_screen(1);
    /* if terrain type changes, levitation or flying might become blocked
       or unblocked; switch_terrain() might issue a message */
    if (ltyp !== game.level.at(ox, oy).typ)
        await switch_terrain();

    /* might be entering a special room (treasure zoo, thrown room, &c) that
       has a first-time entry message, or leaving shop with unpaid goods */
    await check_special_room(false);

    if (is_pool(x, y) && !u.uinwater) {
        const Flying_ht = !!((u.uprops?.[FLYING]?.intrinsic || u.uprops?.[FLYING]?.extrinsic)
                             && !u.uprops?.[FLYING]?.blocked);
        /* Wwalking: hurtle_jump()'s EWwalking |= I_SPECIAL is
           game.hurtle_via_jumping */
        const Wwalking_ht = !!((u.uprops?.[WWALKING_HT]?.intrinsic
                                || u.uprops?.[WWALKING_HT]?.extrinsic
                                || game.hurtle_via_jumping)
                               && !Is_waterlevel_tg(u.uz));
        if (is_waterwall(x, y) || !(Levitation() || Flying_ht || Wwalking_ht)) {
            /* couldn't move while hurtling; allow movement now so that
               drown() will give a chance to crawl out of pool and survive */
            game.multi = 0;
            await drown_ht();
            return false;
        } else if (!Is_waterlevel_tg(u.uz) && !stopping_short) {
            await Norep_ht(`You move over ${an(is_moat_ht(x, y) ? "moat" : "pool")}.`);
        }
    } else if (is_lava(x, y) && !stopping_short) {
        await Norep_ht("You move over some lava.");
    }

    if ((ttmp = t_at(x, y)) !== null && ttmp !== undefined) {
        if (stopping_short) {
            ; /* see the comment above hurtle_jump() */
        } else if (ttmp.ttyp === MAGIC_PORTAL) {
            await dotrap(ttmp, NO_TRAP_FLAGS);
            return false;
        } else if (ttmp.ttyp === VIBRATING_SQUARE) {
            await pline("The ground vibrates as you pass it.");
            await dotrap(ttmp, NO_TRAP_FLAGS); /* doesn't print messages */
        } else if (ttmp.ttyp === FIRE_TRAP) {
            await dotrap(ttmp, NO_TRAP_FLAGS);
        } else if ((is_pit(ttmp.ttyp) || is_hole(ttmp.ttyp))
                   && game.level.flags.sokoban_rules) { /* Sokoban */
            /* air currents overcome the recoil in Sokoban;
               when jumping, caller performs last step and enters trap */
            if (!via_jumping)
                await dotrap(ttmp, NO_TRAP_FLAGS);
            arg.range = 0;
            return true;
        } else {
            if (ttmp.tseen)
                await You(`pass right over ${an(trapname(ttmp.ttyp, false))}.`);
        }
    }
    if (--arg.range < 0) /* make sure our range never goes negative */
        arg.range = 0;
    /* if (*range != 0) nh_delay_output(): display timing only */
    return true;
}

// C ref: dothrow.c will_hurtle()
/* used by mhurtle_step() and mhitm_knockback() */
export function will_hurtle(mon, x, y) {
    if (!isok(x, y))
        return false;
    /* redundant when called by mhurtle() but needed for mhitm_knockback() */
    if (mon.data.msize >= MZ_HUGE_HU || mon === game.u.ustuck || mon.mtrapped)
        return false;
    /*
     * TODO: Treat walls, doors, iron bars, etc. specially
     * rather than just stopping before.
     */
    return goodpos_hu(x, y, mon, MM_IGNOREWATER_HU | MM_IGNORELAVA_HU);
}

// C ref: dothrow.c mhurtle_step()
async function mhurtle_step(mon, x, y) {
    const u = game.u;
    let mtmp;

    if (!isok(x, y))
        return false;

    if (will_hurtle(mon, x, y) && await m_in_out_region_hu(mon, x, y)) {
        let res;

        if (mon !== u.usteed) {
            remove_monster_at(mon.mx, mon.my); /* remove_monster() */
            newsym_hu(mon.mx, mon.my);
            place_monster_hu(mon, x, y);
            newsym_hu(mon.mx, mon.my);
        } else {
            throw new Error('mhurtle_step(): hurtling steed not ported yet');
        }
        /* flush_screen(1); nh_delay_output(): display timing only */
        set_apparxy_hu(mon);
        if (is_waterwall(x, y))
            return false;
        res = await mintrap_hu(mon, HURTLING_HU);
        if (res === Trap_Killed_Mon_HU
            || res === Trap_Caught_Mon_HU
            || res === Trap_Moved_Mon_HU)
            return false;
        return true;
    }
    if ((mtmp = m_at_hu(x, y)) != null && mtmp !== mon) {
        if (canseemon_hu(mon) || canseemon_hu(mtmp))
            await pline(`${Monnam_dt(mon)} bumps into ${a_monnam_hu(mtmp)}.`);
        await wakeup_hu(mtmp, !game.context.mon_moving);
        /* check whether 'mon' is turned to stone by touching 'mtmp' */
        if (touch_petrifies(mtmp.data)
            && !which_armor_hu(mon, W_ARMU_HU | W_ARM_HU | W_ARMC_HU)) {
            await minstapetrify(mon, !game.context.mon_moving);
            newsym_hu(mon.mx, mon.my);
        }
        /* and whether 'mtmp' is turned to stone by being touched by 'mon' */
        if (touch_petrifies(mon.data)
            && !which_armor_hu(mtmp, W_ARMU_HU | W_ARM_HU | W_ARMC_HU)) {
            await minstapetrify(mtmp, !game.context.mon_moving);
            newsym_hu(mtmp.mx, mtmp.my);
        }
    } else if (u.ux === x && u.uy === y) {
        /* a monster has caused 'mon' to hurtle against hero */
        await pline(`${Some_Monnam_hu(mon)} bumps into you.`);
        await stop_occupation_hu();
        /* check whether 'mon' is turned to stone by touching poly'd hero */
        if (u.umonnum !== u.umonster && touch_petrifies(game.youmonst.data)
            && !which_armor_hu(mon, W_ARMU_HU | W_ARM_HU | W_ARMC_HU)) {
            /* give poly'd hero credit/blame despite a monster causing it */
            await minstapetrify(mon, true);
            newsym_hu(mon.mx, mon.my);
        }
        /* and whether hero is turned to stone by being touched by 'mon' */
        if (touch_petrifies(mon.data)
            && !(game.uarmu || game.uarm || game.uarmc)) {
            killer().name = `being hit by ${
                /* combine m_monnam() and noname_monnam():
                   "{your,a} hurtling cockatrice" w/o assigned name */
                x_monnam(mon, mon.mtame ? ARTICLE_YOUR : ARTICLE_A,
                         "hurtling", EXACT_NAME | SUPPRESS_NAME, false)}`;
            await instapetrify(killer().name);
            newsym_hu(game.u.ux, game.u.uy);
        }
    }

    return false;
}

// C ref: dothrow.c hurtle()
/*
 * The player moves through the air for a few squares as a result of
 * throwing or kicking something.
 *
 * dx and dy should be the direction of the hurtle, not of the original
 * kick or throw.
 */
export async function hurtle(dx, dy, range, verbose) {
    const g = game;
    const u = g.u;
    const uc = { x: 0, y: 0 }, cc = { x: 0, y: 0 };

    /* The chain is stretched vertically, so you shouldn't be able to move
     * very far diagonally.  [...] give the player a message and return.
     */
    if (g.uball && g.uball.where !== 'OBJ_INVENT') { /* Punished && !carried(uball) */
        await You_feel("a tug from the iron ball."); /* You_feel() */
        nomul_hu(0);
        return;
    } else if (u.utrap) {
        await You(`are anchored by the ${
            (u.utraptype === TT_WEB_HU) ? "web"
            : (u.utraptype === TT_LAVA_HU) ? hliquid_hu("lava")
              : (u.utraptype === TT_INFLOOR_HU) ? surface(u.ux, u.uy)
                : (u.utraptype === TT_BURIEDBALL_HU) ? "buried ball"
                  : "trap"}.`);
        nomul_hu(0);
        return;
    }

    /* make sure dx and dy are [-1,0,1] */
    dx = Math.sign(dx);
    dy = Math.sign(dy);

    if (!range || (!dx && !dy) || u.ustuck)
        return; /* paranoia */

    nomul_hu(-range);
    g.multi_reason = "moving through the air";
    g.nomovemsg = ""; /* it just happens */
    if (verbose)
        await You(`${(range > 1) ? "hurtle" : "float"} in the opposite direction.`);
    /* if we're in the midst of shooting multiple projectiles, stop */
    endmultishot_hu(true);
    uc.x = u.ux;
    uc.y = u.uy;
    /* this setting of cc is only correct if dx and dy are [-1,0,1] only */
    cc.x = u.ux + (dx * range);
    cc.y = u.uy + (dy * range);
    await walk_path(uc, cc, hurtle_step, { range });
}

// C ref: dothrow.c mhurtle()
/* Move a monster through the air for a few squares. */
export async function mhurtle(mon, dx, dy, range) {
    const u = game.u;
    const mc = { x: 0, y: 0 }, cc = { x: 0, y: 0 };

    await wakeup_hu(mon, !game.context.mon_moving);
    /* At the very least, debilitate the monster */
    mon.movement = 0;
    mon.mstun = 1;

    /* Is the monster stuck or too heavy to push?
     * (very large monsters have too much inertia, even floaters and flyers)
     */
    if (mon.data.msize >= MZ_HUGE_HU || mon === u.ustuck || mon.mtrapped) {
        if (canseemon_hu(mon))
            await pline(`${Monnam_dt(mon)} doesn't budge!`);
        return;
    }

    /* Make sure dx and dy are [-1,0,1] */
    dx = Math.sign(dx);
    dy = Math.sign(dy);
    if (!range || (!dx && !dy))
        return; /* paranoia */
    /* don't let grid bugs be hurtled diagonally */
    if (dx && dy && mon.data === mons_hu[PM_GRID_BUG_HU]) /* NODIAG() */
        return;

    /* undetected monster can be moved by your strike */
    if (mon.mundetected) {
        mon.mundetected = 0;
        newsym_hu(mon.mx, mon.my);
    }
    if ((mon.m_ap_type || 0) & M_AP_TYPMASK_DT) /* M_AP_TYPE(mon) */
        seemimic_hu(mon);

    /* Send the monster along the path */
    mc.x = mon.mx;
    mc.y = mon.my;
    cc.x = mon.mx + (dx * range);
    cc.y = mon.my + (dy * range);
    await walk_path(mc, cc, mhurtle_step, mon);
    if (mon.mhp >= 1) { /* !DEADMONSTER(mon) */
        if (t_at_hu(mon.mx, mon.my))
            await mintrap_hu(mon, FORCEBUNGLE_HU);
        else
            await minliquid_hu(mon);
    }
    return;
}

