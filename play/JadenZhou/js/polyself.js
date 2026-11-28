// polyself.js — polymorphing the hero.
// C ref: polyself.c
//
// Ported so far: set_uasmon(), float_vs_flight(), polysense(), polyself(),
// polymon(), polyman(), rehumanize(), break_armor(), drop_weapon(),
// uunstick(), skinback().  newman() is not ported yet.

import { is_golem, nonliving, weirdnonliving } from './makemon.js';
import { is_pool_or_lava, rounddiv } from './hack.js';
import { new_light_source, del_light_source } from './light.js';
import { monst_to_any } from './timeout.js';
import { LS_MONSTER } from './const.js';
import { game } from './gstate.js';
import { livelog_printf, urgent_pline } from './display.js';
import { LL_CONDUCT } from './const.js';
import {
    NON_PM, FROMFORM, I_SPECIAL, TT_PIT, FIRE_RES, COLD_RES, SLEEP_RES,
    DISINT_RES, SHOCK_RES, POISON_RES, ACID_RES, STONE_RES, DRAIN_RES,
    ANTIMAGIC, SICK_RES, STUNNED, HALLUC_RES, SEE_INVIS, TELEPAT,
    INFRAVISION, INVIS, TELEPORT, TELEPORT_CONTROL, LEVITATION, FLYING,
    SWIMMING, PASSES_WALLS, REGENERATION, REFLECTING, BLINDED, BLND_RES,
    PROT_FROM_SHAPE_CHANGERS, WARN_OF_MON, FROMRACE, STEALTH, FROMOUTSIDE,
} from './const.js';
import {
    mons, MR_FIRE, MR_COLD, MR_SLEEP, MR_DISINT, MR_ELEC, MR_POISON, MR_ACID,
    MR_STONE, AD_MAGM, AD_RBRE, AD_HALU, AD_BLND, AT_EXPL, AT_GAZE, S_FUNGUS,
    M2_HUMAN, M2_ELF, PM_BABY_GRAY_DRAGON, PM_GHOUL, PM_STALKER,
    PM_SILVER_DRAGON, PM_PURPLE_WORM, PM_BABY_PURPLE_WORM, PM_SHRIEKER,
    PM_VAMPIRE, PM_VAMPIRE_LEADER, PM_VAMPIRE_BAT, PM_FOG_CLOUD, PM_WOLF,
    LOW_PM, NUMMONS,
} from './monsters.js';
import { set_mon_data, is_vampire, resists_drli, dmgtype, dmgtype_fromattack,
         is_bat, perceives, telepathic, infravision, pm_invisible,
         can_teleport, control_teleport, is_floater, is_flyer, is_swimmer,
         passes_walls, regenerates, haseyes, nohands, verysmall, bigmonst,
         humanoid, slithy, amorphous, unsolid, hides_under,
         type_is_pname, likes_gems, is_whirly, has_head, is_hider, polyok,
         strongmonst, is_giant, is_male, is_female, is_neuter, cantwield,
         could_twoweap, flaming, webmaker, likes_lava, is_unicorn,
         is_mind_flayer, is_placeholder, can_breathe, emits_light, attacktype,
         sliparm, breakarm, num_horns, Is_dragon_armor } from './mondata.js';
import * as M from './monsters.js';
import * as O from './objects.js';
import {
    POLYMORPH_CONTROL, UNCHANGING, STONED, SLIMED, STRANGLED, SICK,
    M_AP_NOTHING, M_AP_OBJECT, P_SHORT_SWORD, P_SABER, W_ARMU, G_GENOD,
    TT_WEB, TT_BEARTRAP, TT_INFLOOR, TT_BURIEDBALL, TT_LAVA,
    POLY_CONTROLLED, POLY_LOW_CTRL, POLY_MONSTER, POLY_REVERT, A_STR, A_CON,
    A_WIS, KILLED_BY_AN, NEUTRAL, MALE, FEMALE, Never_mind,
    thats_enough_tries, ismnum, In_endgame, MV_KNOWS_EGG, A_MAX, A_INT,
    MAXULEV,
} from './const.js';
import { rn2, rnd, rn1, d, rnl } from './rng.js';
import { MZ_HUGE } from './monsters.js';
import { touch_petrifies } from './mondata.js';
import { unpunish } from './read.js';
import { pline, You, Your, You_cant, You_feel, pline_The, newsym,
         see_monsters, canspotmon } from './display.js';
import { ACURR, exercise, ATTRMAX, ATTRMIN, adjabil, newhp,
         setuhpmax } from './attrib.js';
import { rndexp, hliquid, find_delayed_killer, dealloc_killer } from './potion.js';
import { POLYMORPH, GENOCIDED } from './const.js';
import { buried_ball_to_freedom } from './dig.js';
import { newpw } from './exper.js';
import { newuhs } from './eat.js';
import { max_rank_sz } from './botl.js';
import { losehp, selftouch, set_utrap, reset_utrap } from './trap.js';
import { instapetrify } from './trap.js';
import { tty_getlin } from './wintty.js';
import { mungspaces, plur } from './hacklib.js';
import { name_to_mon, your_race, is_vampshifter, is_were, is_orc, is_elf,
         is_dwarf, is_gnome, is_undead, poly_when_stoned,
         little_to_big } from './mondata.js';
import { pmname, Some_Monnam, Monnam, mon_nam, Mgender } from './do_name.js';
import { an, the_unique_pm, vtense, yname, makeplural, cloak_simple_name,
         helm_simple_name } from './objnam.js';
import { the, simpleonames, surface } from './iactions.js';
import { unmul } from './allmain.js';
import { make_glib, set_mimic_blocking, set_itimeout, make_blinded,
         make_sick, make_stoned, make_slimed } from './potion.js';
import { Sick_resistance } from './youprop.js';
import { SICK_ALL, DISMOUNT_POLY } from './const.js';
import { hideunder_async } from './makemon.js';
import { expels } from './mhitu.js';
import { can_ride, dismount_steed } from './steed.js';
import { end_burn } from './timeout.js';
import { getdir } from './cmd.js';
import { ubuzz } from './zap.js';
import { ECMD_CANCEL, ECMD_TIME } from './const.js';
import { AT_BREA, AD_ANY, AT_SPIT, AD_DRST, AD_ACID } from './monsters.js';
import { throwit } from './dothrow.js';
import { mksobj } from './mkobj.js';
import { impossible } from './hack.js';
import { attacktype_fordmg } from './mondata.js';
import { golemhp, is_pool, is_lava, is_home_elemental } from './makemon.js';
import { find_ac } from './u_init.js';
import { set_ustuck } from './uhitm.js';
import { spoteffects, nomul } from './hack.js';
import { encumber_msg } from './pickup.js';
import { retouch_equipment, artifact_light } from './artifact.js';
import { character_race } from './role.js';
import { dropx, canletgo } from './do.js';
import { donning, cancel_don, Armor_gone, Cloak_off, Helmet_off,
         Gloves_off, Shield_off, Boots_off, Blindf_off } from './do_wear.js';
import { useup } from './invent.js';
import { setworn, racial_exception, WrappingAllowed } from './worn.js';
import { uwepgone, uswapwepgone, untwoweapon } from './wield.js';
import { weapon_descr } from './insight.js';
import { sticks } from './engrave.js';
import {
    Punished, Stunned, Blind, Stoned, Strangled, Slimed, Flying, Polymorph_control, Unchanging,
    Unaware
} from './youprop.js';
import { Upolyd } from './const.js';
import { done as done_ps } from './end.js';
import { killer as killer_ps } from './topten.js';
import { DIED as DIED_PS } from './const.js';
import { NO_KILLER_PREFIX as NO_KILLER_PREFIX_PS, KILLED_BY as KILLED_BY_PS } from './const.js';
import { otense as otense_ps } from './objnam.js';
import { observe_object as observe_object_ps, makeknown as makeknown_ps } from './o_init.js';
import { Hallucination as Hallucination_ps } from './youprop.js';
import { arti_light_radius } from './light.js';
import { is_clinger as is_clinger_ps, digests as digests_ps } from './mondata.js';
import { ECMD_OK as ECMD_OK_PS, IS_FOUNTAIN as IS_FOUNTAIN_PS,
         Is_airlevel as Is_airlevel_ps,
         Is_waterlevel as Is_waterlevel_ps } from './const.js';
import { There as There_ps } from './display.js';
import { level_objects_at as level_objects_at_ps } from './mkobj.js';
import { Stone_resistance as Stone_resistance_ps } from './youprop.js';
import { cxname as cxname_ps } from './objnam.js';
import { has_ceiling as has_ceiling_ps, youhiding as youhiding_ps } from './insight.js';
import { were_summon as were_summon_ps } from './were.js';
import * as TT from './trap.js';
import { couldsee as couldsee_gz } from './vision.js';
import { Invis as Invis_gz, See_invisible as See_invisible_gz,
         Free_action as Free_action_gz, Confusion as Confusion_gz } from './youprop.js';
import { y_monnam as y_monnam_gz, l_monnam as l_monnam_gz } from './do_name.js';
import { setmangry as setmangry_gz } from './mon.js';
import { helpless as helpless_gz } from './monmove.js';
import { resists_fire as resists_fire_gz } from './mondata.js';
import { destroy_items as destroy_items_gz } from './zap.js';
import { ignite_items as ignite_items_gz } from './trap.js';
import { STONING as STONING_GZ, M_AP_TYPE as M_AP_TYPE_GZ,
         M_AP_FURNITURE as M_AP_FURNITURE_GZ } from './const.js';
import { canseemon as canseemon_gz } from './display.js';
import { t_at as t_at_sw, deltrap as deltrap_sw, dotrap as dotrap_sw,
         maketrap as maketrap_sw, feeltrap as feeltrap_sw } from './trap.js';
import { IS_AIR as IS_AIR_SW, NATTK as NATTK_SW, A_DEX as A_DEX_SW,
         NO_TRAP_FLAGS as NO_TRAP_FLAGS_SW, STAIRS as STAIRS_SW,
         SHOPBASE as SHOPBASE_SW, SHOP_WEB_COST as SHOP_WEB_COST_SW } from './const.js';
import { Levitation as Levitation_sw } from './youprop.js';
import { is_animal as is_animal_sw } from './mondata.js';
import { bury_objs as bury_objs_sw } from './dig.js';
import { On_stairs as On_stairs_sw } from './dogmove.js';
import { in_rooms as in_rooms_sw } from './hack.js';
import { add_damage as add_damage_sw } from './shk.js';
import { wakeup as wakeup_ps, killed as killed_ps, DEADMONSTER as DEADMONSTER_ps } from './mon.js';
import { mindless as mindless_ps } from './mondata.js';
import { BOLT_LIM as BOLT_LIM_PS } from './const.js';
import { mdistu as mdistu_ps, s_suffix as s_suffix_ps } from './hacklib.js';
import { maybe_adjust_light } from './mkobj.js';
import { were_beastie, counter_were } from './were.js';
import { strsubst as strsubst_ps } from './hacklib.js';
import { tty_yn_function as tty_yn_function_ps } from './wintty.js';
import { is_flimsy, is_sword } from './objects.js';
import { name_to_monclass as name_to_monclass_ps } from './mondata.js';
import { mkclass_poly as mkclass_poly_ps } from './makemon.js';

// C ref: mon.c valid_vampshiftform()
function valid_vampshiftform(base, form) {
    if (base >= LOW_PM && is_vampire(mons[base])) {
        if (form === PM_VAMPIRE_BAT || form === PM_FOG_CLOUD
            || (form === PM_WOLF && base !== PM_VAMPIRE))
            return true;
    }
    return false;
}

// C ref: polyself.c set_uasmon()
/* update the gy.youmonst.data structure pointer and intrinsics */
export function set_uasmon() {
    const g = game;
    const u = g.u;
    const youmonst = g.youmonst;
    const mdat = mons[u.umonnum];
    const was_vampshifter = valid_vampshiftform(youmonst.cham, u.umonnum);

    set_mon_data(youmonst, mdat);
    youmonst.m_id = 1;

    /* Protection_from_shape_changers (youprop.h) */
    const prot = u.uprops[PROT_FROM_SHAPE_CHANGERS];
    if (prot.intrinsic || prot.extrinsic)
        youmonst.cham = NON_PM;
    else if (is_vampire(youmonst.data))
        youmonst.cham = youmonst.mnum;
    /* assume hero-as-chameleon/doppelganger/sandestin doesn't change shape */
    else if (!was_vampshifter)
        youmonst.cham = NON_PM;
    u.mcham = youmonst.cham; /* for save/restore since youmonst isn't */

    function PROPSET(PropIndx, ON) {
        if (ON)
            u.uprops[PropIndx].intrinsic |= FROMFORM;
        else
            u.uprops[PropIndx].intrinsic &= ~FROMFORM;
    }
    const resist_from_form = (MRtyp) => (youmonst.data.mresists & MRtyp) !== 0;

    PROPSET(FIRE_RES, resist_from_form(MR_FIRE));
    PROPSET(COLD_RES, resist_from_form(MR_COLD));
    PROPSET(SLEEP_RES, resist_from_form(MR_SLEEP));
    PROPSET(DISINT_RES, resist_from_form(MR_DISINT));
    PROPSET(SHOCK_RES, resist_from_form(MR_ELEC));
    PROPSET(POISON_RES, resist_from_form(MR_POISON));
    PROPSET(ACID_RES, resist_from_form(MR_ACID));
    PROPSET(STONE_RES, resist_from_form(MR_STONE));
    {
        /* resists_drli() takes wielded weapon into account; suppress it */
        const save_uwep = g.uwep;

        g.uwep = null;
        PROPSET(DRAIN_RES, resists_drli(youmonst));
        g.uwep = save_uwep;
    }
    /* resists_magm() takes wielded, worn, and carried equipment into
       into account; cheat and duplicate its monster-specific part */
    PROPSET(ANTIMAGIC, (dmgtype(mdat, AD_MAGM)
                        || mdat === mons[PM_BABY_GRAY_DRAGON]
                        || dmgtype(mdat, AD_RBRE)));
    PROPSET(SICK_RES, (mdat.mlet === S_FUNGUS || mdat === mons[PM_GHOUL]));

    PROPSET(STUNNED, (mdat === mons[PM_STALKER] || is_bat(mdat)));
    PROPSET(HALLUC_RES, dmgtype(mdat, AD_HALU));
    PROPSET(SEE_INVIS, perceives(mdat));
    PROPSET(TELEPAT, telepathic(mdat));
    /* note that Infravision uses mons[race] rather than usual mons[role] */
    const Upolyd = (u.umonnum !== u.umonster);
    PROPSET(INFRAVISION, infravision(Upolyd ? mdat : mons[g.urace.mnum]));
    PROPSET(INVIS, pm_invisible(mdat));
    PROPSET(TELEPORT, can_teleport(mdat));
    PROPSET(TELEPORT_CONTROL, control_teleport(mdat));
    PROPSET(LEVITATION, is_floater(mdat));
    /* floating eye is the only 'floater'; it is also flagged as a 'flyer';
       suppress flying for it so that enlightenment doesn't confusingly
       show latent flight capability always blocked by levitation */
    PROPSET(FLYING, (is_flyer(mdat) && !is_floater(mdat)));
    PROPSET(SWIMMING, is_swimmer(mdat));
    /* [don't touch MAGICAL_BREATHING here; both Amphibious and Breathless
       key off of it but include different monster forms...] */
    PROPSET(PASSES_WALLS, passes_walls(mdat));
    PROPSET(REGENERATION, regenerates(mdat));
    PROPSET(REFLECTING, (mdat === mons[PM_SILVER_DRAGON]));
    PROPSET(BLINDED, !haseyes(mdat));
    PROPSET(BLND_RES, (dmgtype_fromattack(mdat, AD_BLND, AT_EXPL)
                       || dmgtype_fromattack(mdat, AD_BLND, AT_GAZE)));

    /* whether the player is flying/floating depends on their steed,
       which won't be known during the restore process: but BFlying
       and BStealth should be set correctly already in that case, so
       there's nothing to do */
    if (!g.program_state?.restoring)
        float_vs_flight(); /* maybe toggle (BFlying & I_SPECIAL) */
    polysense();

    /* STATUS_HILITES status_initialize(REASSESS_ONLY): no window port yet */
    /* we can reset this now, having just done what it is meant to trigger */
    g.were_changes = 0;
}

// C ref: polyself.c float_vs_flight()
/* Levitation overrides Flying; set or clear BFlying|I_SPECIAL */
export function float_vs_flight() {
    const u = game.u;
    const stuck_in_floor = (u.utrap && u.utraptype !== TT_PIT);
    const lev = u.uprops[LEVITATION], fly = u.uprops[FLYING];

    /* floating overrides flight; so does being trapped in the floor */
    if ((lev.intrinsic || lev.extrinsic)
        || ((fly.intrinsic || fly.extrinsic) && stuck_in_floor))
        fly.blocked |= I_SPECIAL;
    else
        fly.blocked &= ~I_SPECIAL;
    /* being trapped on the ground (bear trap, web, molten lava survived
       with fire resistance, former lava solidified via cold, tethered
       to a buried iron ball) overrides floating--the floor is reachable */
    if ((lev.intrinsic || lev.extrinsic) && stuck_in_floor)
        lev.blocked |= I_SPECIAL;
    else
        lev.blocked &= ~I_SPECIAL;

    /* riding blocks stealth unless hero+steed fly, so a change in flying
       might cause a change in stealth */
    steed_vs_stealth();

    game.disp_botl = true;
}

// C ref: polyself.c steed_vs_stealth()
/* riding blocks stealth unless hero+steed fly */
export function steed_vs_stealth() {
    const u = game.u;
    const lev = u.uprops[LEVITATION], fly = u.uprops[FLYING];
    const Flying = ((fly.intrinsic || fly.extrinsic)
                    || (u.usteed && is_flyer(u.usteed.data))) && !fly.blocked;
    const Levitation = (lev.intrinsic || lev.extrinsic) && !lev.blocked;

    if (u.usteed && !Flying && !Levitation)
        u.uprops[STEALTH].blocked |= FROMOUTSIDE;
    else
        u.uprops[STEALTH].blocked &= ~FROMOUTSIDE;
}

// C ref: polyself.c polysense()
function polysense() {
    const g = game;
    const u = g.u;
    let warnidx = NON_PM;

    if (!g.context) g.context = {};
    g.context.warntype = g.context.warntype || {};
    g.context.warntype.speciesidx = NON_PM;
    g.context.warntype.species = null;
    g.context.warntype.polyd = 0;
    u.uprops[WARN_OF_MON].intrinsic &= ~FROMRACE;

    switch (u.umonnum) {
    case PM_PURPLE_WORM:
    case PM_BABY_PURPLE_WORM:
        warnidx = PM_SHRIEKER;
        break;
    case PM_VAMPIRE:
    case PM_VAMPIRE_LEADER:
        g.context.warntype.polyd = M2_HUMAN | M2_ELF;
        u.uprops[WARN_OF_MON].intrinsic |= FROMRACE;
        return;
    }
    if (warnidx >= LOW_PM && warnidx < NUMMONS) { /* ismnum(warnidx) */
        g.context.warntype.speciesidx = warnidx;
        g.context.warntype.species = mons[warnidx];
        u.uprops[WARN_OF_MON].intrinsic |= FROMRACE;
    }
}

/* ------------------------------------------------------------------ */
/* polyself(), polymon(), polyman(), rehumanize(), break_armor(),
   drop_weapon() and their helpers                                    */

/* C ref: mondata.h predicates used below */
export function lays_eggs(ptr) { return (ptr.mflags1 & M.M1_OVIPAROUS) !== 0; }
/* creature will slide out of armor */
/* creature will break out of armor */
export function has_horns(ptr) { return num_horns(ptr) > 0; }
/* C ref: youprop.h */
function uprop_on(p) {
    const pr = game.u.uprops[p];
    return !!(pr.intrinsic || pr.extrinsic);
}
const no_longer_petrify_resistant =
    "No longer petrify-resistant, you";

// C ref: polyself.c check_strangling()
async function check_strangling(on) {
    /* on -- maybe resume strangling */
    if (on) {
        if (game.uamul && game.uamul.otyp === O.AMULET_OF_STRANGULATION)
            throw new Error('check_strangling(): can_be_strangled() not ported yet');
    /* off -- maybe block strangling */
    } else {
        if (Strangled())
            throw new Error('check_strangling(): can_be_strangled() not ported yet');
    }
}

// C ref: polyself.c polyman()
/* make a (new) human out of the player */
async function polyman(fmt, arg) {
    const u = game.u;
    const youmonst = game.youmonst;
    const sticking = (sticks(youmonst.data) && u.ustuck && !u.uswallow),
          was_mimicking = ((youmonst.m_ap_type || 0) !== M_AP_NOTHING);
    const was_blind = Blind(),
          had_see_invis = uprop_on(SEE_INVIS);

    if (Upolyd()) {
        u.acurr = { a: u.macurr.a.slice() }; /* restore old attribs */
        u.amax = { a: u.mamax.a.slice() };
        u.umonnum = u.umonster;
        game.flags.female = u.mfemale;
    }
    set_uasmon();

    u.mh = u.mhmax = 0;
    u.mtimedone = 0;
    await skinback(false);
    u.uundetected = 0;

    if (sticking)
        await uunstick();
    find_ac();
    if (was_mimicking) {
        if (game.multi < 0)
            await unmul("");
        youmonst.m_ap_type = M_AP_NOTHING;
        youmonst.mappearance = 0;
    }

    newsym(u.ux, u.uy);

    await urgent_pline(fmt.replace("%s", arg));
    /* check whether player foolishly genocided self while poly'd */
    if (ugenocided()) {
        /* intervening activity might have clobbered genocide info */
        const kptr = find_delayed_killer(POLYMORPH);

        if (kptr != null && kptr.name) {
            game.killer.format = kptr.format;
            game.killer.name = kptr.name;
        } else {
            game.killer.format = KILLED_BY_PS;
            game.killer.name = "self-genocide";
        }
        dealloc_killer(kptr);
        await done_ps(GENOCIDED);
    }

    if (uprop_on(SEE_INVIS) !== had_see_invis)
        set_mimic_blocking(); /* See_invisible just toggled */

    if (u.twoweap && !could_twoweap(youmonst.data))
        await untwoweapon();

    if (u.utrap && u.utraptype === TT_PIT) {
        set_utrap(rn1(6, 2), TT_PIT); /* time to escape resets */
    }
    if (was_blind && !Blind()) { /* reverting from eyeless */
        set_itimeout(BLINDED, 1); /* set_itimeout(&HBlinded, 1L) */
        await make_blinded(0, true); /* remove blindness */
    }
    await check_strangling(true);

    if (!uprop_on(LEVITATION) && !u.ustuck && is_pool_or_lava(u.ux, u.uy))
        await spoteffects(true);

    see_monsters();
}

// C ref: polyself.c polyself()
export async function polyself(psflags) {
    const u = game.u;
    const youmonst = game.youmonst;
    let buf = '';
    let old_light, mntmp, klass, tryct;
    const gvariant = { v: NEUTRAL };
    let forcecontrol = ((psflags & POLY_CONTROLLED) !== 0);
    const low_control = ((psflags & POLY_LOW_CTRL) !== 0);
    let monsterpoly = ((psflags & POLY_MONSTER) !== 0);
    const formrevert = ((psflags & POLY_REVERT) !== 0),
          draconian = !!(game.uarm && Is_dragon_armor(game.uarm)),
          iswere = (ismnum(u.ulycn)),
          isvamp = (is_vampire(youmonst.data)
                    || is_vampshifter(youmonst));
    let controllable_poly = Polymorph_control() && !(Stunned() || Unaware());

    if (Unchanging()) {
        await You("fail to transform!");
        return;
    }
    /* being Stunned|Unaware doesn't negate this aspect of Poly_control */
    if (!Polymorph_control() && !forcecontrol && !draconian && !iswere
        && !isvamp) {
        if (rn2(20) > ACURR(A_CON)) {
            await You("shudder for a moment."); /* You1(shudder_for_moment) */
            await losehp(rnd(30), "system shock", KILLED_BY_AN);
            await exercise(A_CON, false);
            return;
        }
    }
    old_light = emits_light(youmonst.data);
    mntmp = NON_PM;

    if (formrevert) {
        mntmp = youmonst.cham;
        monsterpoly = true;
        controllable_poly = false;
    }

    if (forcecontrol && low_control
        && (draconian || monsterpoly || isvamp || iswere))
        forcecontrol = false;

    if (monsterpoly && isvamp) {
        /* goto do_vampyr; */
        await polyself_special('vampyr', mntmp, controllable_poly, gvariant,
                               old_light);
        return;
    }

    if (controllable_poly || forcecontrol) {
        buf = '';
        tryct = 5;

        do {
            mntmp = NON_PM;
            buf = await tty_getlin("Become what kind of monster? [type the name]");
            buf = mungspaces(buf);
            if (buf[0] === '\x1b') {
                /* user is cancelling controlled poly */
                if (forcecontrol) { /* wizard mode #polyself */
                    await pline(Never_mind);
                    return;
                }
                buf = "*"; /* resort to random */
            }
            if (buf === "*" || buf === "random") {
                /* explicitly requesting random result */
                tryct = 0; /* will skip thats_enough_tries */
                continue;  /* end do-while(--tryct > 0) loop */
            }
            klass = 0;
            mntmp = name_to_mon(buf, gvariant);
            let by_class = (mntmp < LOW_PM);
            let done = false;
            /* C's 'goto by_class' retry (from the !polyok() case below)
               is this loop's 'continue' */
            for (;;) {
            if (by_class) {
                /* by_class: */
                const mndx = { v: NON_PM };
                klass = name_to_monclass_ps(buf, mndx);
                mntmp = mndx.v;
                if (klass && mntmp === NON_PM)
                    mntmp = (draconian && klass === M.S_DRAGON)
                            ? armor_to_dragon(game.uarm.otyp)
                            : mkclass_poly_ps(klass);

            /* placeholder monsters are for corpses and all flagged
               M2_NOPOLY but they are reasonable polymorph targets;
               pick a suitable substitute (which might be geno'd) */
            } else if (is_placeholder(mons[mntmp])
                       /* when your own race, fall to !polyok() case */
                       && !your_race(mons[mntmp])
                       /* same for generic human, even if hero isn't human */
                       && mntmp !== M.PM_HUMAN) {
                /* far less general than mkclass() */
                if (mntmp === M.PM_ORC)
                    mntmp = rn2(3) ? M.PM_HILL_ORC : M.PM_MORDOR_ORC;
                else if (mntmp === M.PM_ELF)
                    mntmp = rn2(3) ? M.PM_GREEN_ELF : M.PM_GREY_ELF;
                else if (mntmp === M.PM_GIANT)
                    mntmp = rn2(3) ? M.PM_STONE_GIANT : M.PM_HILL_GIANT;
                /* note: PM_DWARF and PM_GNOME are ordinary monsters and
                   no longer flagged no-poly so have no need for placeholder
                   handling; PM_HUMAN is a placeholder without a suitable
                   substitute so gets handled differently below */
            }

            if (mntmp < LOW_PM) {
                if (!klass)
                    await pline("I've never heard of such monsters.");
                else
                    await You_cant("polymorph into any of those.");
            } else if (game.flags.debug && Upolyd()
                       && (mntmp === u.umonster
                           /* "priest" and "priestess" match the monster
                              rather than the role; override that unless
                              the text explicitly contains "aligned" */
                           || (u.umonster === M.PM_CLERIC
                               && mntmp === M.PM_ALIGNED_CLERIC
                               && !buf.toLowerCase().includes("aligned")))) {
                /* in wizard mode, picking own role while poly'd reverts to
                   normal without newman()'s chance of level or sex change */
                await rehumanize();
                old_light = 0; /* rehumanize() extinguishes u-as-mon light */
                await polyself_made_change(old_light); /* goto made_change */
                return;
            } else if (iswere && (were_beastie(mntmp) === u.ulycn
                                  || mntmp === counter_were(u.ulycn)
                                  || (Upolyd() && mntmp === M.PM_HUMAN))) {
                /* goto do_shift; */
                await polyself_special('shift', mntmp, controllable_poly,
                                       gvariant, old_light);
                return;
            } else if (!polyok(mons[mntmp])
                       /* Note:  humans are illegal as monsters, but an
                          illegal monster forces newman(), which is what
                          we want if they specified a human.... (unless
                          they specified a unique monster) */
                       && !(mntmp === M.PM_HUMAN
                            || (your_race(mons[mntmp])
                                && (mons[mntmp].geno & M.G_UNIQ) === 0)
                            || mntmp === game.urole.mnum)) {
                let pm_name;

                /* mkclass_poly() can pick a !polyok()
                   candidate; if so, usually try again */
                if (klass) {
                    if (rn2(3) || --tryct > 0) {
                        by_class = true;
                        continue; /* goto by_class */
                    }
                    /* no retries left; put one back on counter
                       so that end of loop decrement will yield
                       0 and trigger thats_enough_tries message */
                    ++tryct;
                }
                pm_name = pmname(mons[mntmp], game.flags.female ? FEMALE : MALE);
                if (the_unique_pm(mons[mntmp]))
                    pm_name = the(pm_name);
                else if (!type_is_pname(mons[mntmp]))
                    pm_name = an(pm_name);
                await You_cant(`polymorph into ${pm_name}.`);
            } else
                done = true; /* break out of the do-while */
            break;
            } /* for (;;) by_class retry */
            if (done)
                break;
        } while (--tryct > 0);

        if (!tryct)
            await pline(thats_enough_tries);
        /* allow skin merging, even when polymorph is controlled */
        if (draconian && (tryct <= 0
                          || mntmp === armor_to_dragon(game.uarm.otyp))) {
            /* goto do_merge; */
            await polyself_special('merge', mntmp, controllable_poly,
                                   gvariant, old_light);
            return;
        }
        if (isvamp && (tryct <= 0 || mntmp === PM_WOLF
                       || mntmp === PM_FOG_CLOUD || is_bat(mons[mntmp]))) {
            /* goto do_vampyr; */
            await polyself_special('vampyr', mntmp, controllable_poly,
                                   gvariant, old_light);
            return;
        }
    } else if (draconian || iswere || isvamp) {
        /* special changes that don't require polyok() */
        await polyself_special(draconian ? 'merge' : iswere ? 'shift' : 'vampyr',
                               mntmp, controllable_poly, gvariant, old_light);
        return;
    }

    if (mntmp < LOW_PM) {
        tryct = 200;
        do {
            /* randomly pick an "ordinary" monster */
            mntmp = rn1(M.SPECIAL_PM - LOW_PM, LOW_PM);
            if (polyok(mons[mntmp]) && !is_placeholder(mons[mntmp]))
                break;
        } while (--tryct > 0);
    }

    /* The below polyok() fails either if everything is genocided, or if
     * we deliberately chose something illegal to force newman().
     */
    game.sex_change_ok = (game.sex_change_ok || 0) + 1;
    if (!polyok(mons[mntmp]) || (!forcecontrol && !rn2(5))
        || your_race(mons[mntmp])) {
        await newman();
    } else {
        await polymon(mntmp);
    }
    game.sex_change_ok--; /* reset */

    await polyself_made_change(old_light);
}

/* C ref: polyself.c polyself() -- the "special changes that don't require
   polyok()" block, entered at its do_merge:, do_shift: or do_vampyr: label;
   it ends with 'goto made_change' */
async function polyself_special(entry, mntmp, controllable_poly, gvariant,
                                old_light) {
    const u = game.u;
    let buf;

    if (entry === 'merge') {
        /* do_merge: */
        mntmp = armor_to_dragon(game.uarm.otyp);
        if (!(game.mvitals[mntmp].mvflags & G_GENOD)) {
            const uarm = game.uarm;
            const was_lit = uarm.lamplit;
            const arm_light = artifact_light(uarm) ? arti_light_radius(uarm) : 0;

            /* allow G_EXTINCT */
            if (uarm.otyp >= O.GRAY_DRAGON_SCALES
                && uarm.otyp <= O.YELLOW_DRAGON_SCALES) { /* Is_dragon_scales() */
                /* dragon scales remain intact as uskin */
                await You("merge with your scaly armor.");
            } else { /* dragon scale mail reverts to scales */
                /* similar to noarmor(invent.c),
                   shorten to "<color> scale mail" */
                buf = strsubst_ps(simpleonames(uarm), " dragon ", " ");
                /* tricky phrasing; dragon scale mail is singular, dragon
                   scales are plural (note: we don't use "set of scales",
                   which usually overrides the distinction, here) */
                await Your(`${buf} reverts to scales as you merge with them.`);
                /* uarm->spe enchantment remains unchanged;
                   re-converting scales to mail poses risk
                   of evaporation due to over enchanting */
                uarm.otyp += O.GRAY_DRAGON_SCALES - O.GRAY_DRAGON_SCALE_MAIL;
                observe_object_ps(uarm, Hallucination_ps());
                game.disp_botl = true; /* AC is changing */
            }
            game.uskin = uarm;
            game.uarm = null;
            /* save/restore hack */
            game.uskin.owornmask |= I_SPECIAL;
            if (was_lit)
                await maybe_adjust_light(game.uskin, arm_light);
            /* update_inventory(): no perm_invent */
        }
    } else if (entry === 'shift') {
        /* do_shift: */
        if (Upolyd() && were_beastie(mntmp) !== u.ulycn)
            mntmp = M.PM_HUMAN; /* Illegal; force newman() */
        else
            mntmp = u.ulycn;
    } else { /* entry === 'vampyr' */
        /* do_vampyr: */
        if (mntmp < LOW_PM || (mons[mntmp].geno & M.G_UNIQ)) {
            mntmp = (game.youmonst.data === mons[PM_VAMPIRE_LEADER]
                     && !rn2(10)) ? PM_WOLF
                                  : !rn2(4) ? PM_FOG_CLOUD
                                            : PM_VAMPIRE_BAT;
            if (ismnum(game.youmonst.cham)
                && !is_vampire(game.youmonst.data) && !rn2(2))
                mntmp = game.youmonst.cham;
        }
        if (controllable_poly) {
            buf = `Become ${an(pmname(mons[mntmp], gvariant.v))}?`;
            if ((await tty_yn_function_ps(buf, "yn", 'n')) !== 'y') /* y_n() */
                return;
        }
    }
    /* if polymon fails, "you feel" message has been given
       so don't follow up with another polymon or newman;
       sex_change_ok left disabled here */
    if (mntmp === M.PM_HUMAN)
        await newman(); /* werecritter */
    else
        /* (void) */ await polymon(mntmp);
    await polyself_made_change(old_light); /* goto made_change */
}

/* the 'made_change:' tail of polyself() */
async function polyself_made_change(old_light) {
    let new_light = emits_light(game.youmonst.data);
    if (old_light !== new_light) {
        if (old_light)
            del_light_source(LS_MONSTER, monst_to_any(game.youmonst));
        if (new_light === 1)
            ++new_light; /* otherwise it's undetectable */
        if (new_light)
            new_light_source(game.u.ux, game.u.uy, new_light, LS_MONSTER,
                             monst_to_any(game.youmonst));
    }
}

// C ref: polyself.c poly_gender()
/* Returns gender of polymorphed player;
 * 0/1=same meaning as flags.female, 2=none.
 */
export function poly_gender() {
    if (is_neuter(game.youmonst.data) || !humanoid(game.youmonst.data))
        return 2;
    return game.flags.female ? 1 : 0;
}

// C ref: polyself.c change_sex()
function change_sex() {
    const u = game.u;
    /* Some monsters are always of one sex and their sex can't be changed;
     * Succubi/incubi can change, but are handled below.
     *
     * !Upolyd check necessary because is_male() and is_female()
     * may be true for certain roles
     */
    if (!Upolyd()
        || (!is_male(game.youmonst.data) && !is_female(game.youmonst.data)
            && !is_neuter(game.youmonst.data)))
        game.flags.female = !game.flags.female;
    if (Upolyd()) /* poly'd: also change saved sex */
        u.mfemale = !u.mfemale;
    max_rank_sz(); /* [this appears to be superfluous] */
    if ((Upolyd() ? u.mfemale : game.flags.female) && game.urole.name.f)
        game.pl_character = game.urole.name.f;
    else
        game.pl_character = game.urole.name.m;
    if (!Upolyd()) {
        u.umonnum = u.umonster;
    } else if (u.umonnum === M.PM_AMOROUS_DEMON) {
        game.flags.female = !game.flags.female;
        set_uasmon();
    }
}

// C ref: attrib.c redist_attr()
/* polymorph changes a few attributes */
function redist_attr() {
    const u = game.u;
    let i, tmp;

    for (i = 0; i < A_MAX; i++) {
        if (i === A_INT || i === A_WIS)
            continue;
        /* Polymorphing doesn't change your mind */
        tmp = u.amax.a[i];
        u.amax.a[i] += (rn2(5) - 2);
        if (u.amax.a[i] > ATTRMAX(i))
            u.amax.a[i] = ATTRMAX(i);
        if (u.amax.a[i] < ATTRMIN(i))
            u.amax.a[i] = ATTRMIN(i);
        u.acurr.a[i] = Math.trunc(u.acurr.a[i] * u.amax.a[i] / tmp);
        /* ABASE(i) > ATTRMAX(i) is impossible */
        if (u.acurr.a[i] < ATTRMIN(i))
            u.acurr.a[i] = ATTRMIN(i);
    }
    /* encumber_msg(); -- caller needs to do this */
}

// C ref: polyself.c newman()
async function newman() {
    const u = game.u;
    let newform;
    let i, oldlvl, newlvl, hpmax, enmax;

    /* dead: -- we come directly here if experience level went to 0 or less */
    const dead = async () => {
        await urgent_pline("Your new form doesn't seem healthy enough to survive.");
        killer_ps().format = KILLED_BY_AN;
        killer_ps().name = "unsuccessful polymorph";
        await done_ps(DIED_PS);
        /* must have been life-saved to get here */
        await newuhs(false);
        await encumber_msg(); /* used to be done by redist_attr() */
        /* return; lifesaved */
    };

    oldlvl = u.ulevel;
    newlvl = oldlvl + rn1(5, -2);     /* new = old + {-2,-1,0,+1,+2} */
    if (newlvl > 127 || newlvl < 1) { /* level went below 0? */
        /* goto dead; old level is still intact (in case of lifesaving) */
        await dead();
        return;
    }
    if (newlvl > MAXULEV)
        newlvl = MAXULEV;
    /* If your level goes down, your peak level goes down by
       the same amount so that you can't simply use blessed
       full healing to undo the decrease.  But if your level
       goes up, your peak level does *not* undergo the same
       adjustment; you might end up losing out on the chance
       to regain some levels previously lost to other causes. */
    if (newlvl < oldlvl)
        u.ulevelmax -= (oldlvl - newlvl);
    if (u.ulevelmax < newlvl)
        u.ulevelmax = newlvl;
    u.ulevel = newlvl;

    poly_gender(); /* oldgend: only used by livelog_newform() */
    if (game.sex_change_ok && !rn2(10))
        change_sex();

    await adjabil(oldlvl, u.ulevel);

    /* random experience points for the new experience level */
    u.uexp = rndexp(false);

    /* set up new attribute points (particularly Con) */
    redist_attr();

    /*
     * New hit points:
     *  remove "level gain"-based HP from any extra HP accumulated
     *  (the "extra" might actually be negative);
     *  modify the extra, retaining {80%, 90%, 100%, or 110%};
     *  add in newly generated set of level-gain HP.
     */
    hpmax = u.uhpmax;
    for (i = 0; i < oldlvl; i++)
        hpmax -= u.uhpinc[i];
    /* hpmax * rn1(4,8) / 10; 0.95*hpmax on average */
    hpmax = rounddiv(hpmax * rn1(4, 8), 10);
    for (i = 0; (u.ulevel = i) < newlvl; i++)
        hpmax += newhp();
    if (hpmax < u.ulevel)
        hpmax = u.ulevel; /* min of 1 HP per level */
    /* retain same proportion for current HP; u.uhp * hpmax / u.uhpmax */
    u.uhp = rounddiv(u.uhp * hpmax, u.uhpmax);
    setuhpmax(hpmax, true); /* might reduce u.uhp */
    /*
     * Do the same for spell power.
     */
    enmax = u.uenmax;
    for (i = 0; i < oldlvl; i++)
        enmax -= u.ueninc[i];
    enmax = rounddiv(enmax * rn1(4, 8), 10);
    for (i = 0; (u.ulevel = i) < newlvl; i++)
        enmax += newpw();
    if (enmax < u.ulevel)
        enmax = u.ulevel;
    u.uen = rounddiv(u.uen * enmax, ((u.uenmax < 1) ? 1 : u.uenmax));
    u.uenmax = enmax;
    /* [should alignment record be tweaked too?] */

    u.uhunger = rn1(500, 500);
    if (uprop_on(SICK))
        await make_sick(0, null, false, SICK_ALL);
    if (Stoned())
        await make_stoned(0, null, 0, null);
    if (u.uhp <= 0) {
        if (Polymorph_control()) { /* even when Stunned || Unaware */
            if (u.uhp <= 0)
                u.uhp = 1;
        } else {
            await dead();
            return; /* lifesaved */
        }
    }
    await newuhs(false);
    /* use saved gender we're about to revert to, not current */
    newform = ((Upolyd() ? u.mfemale : game.flags.female)
               && game.urace.individual.f)
                ? game.urace.individual.f
                : (game.urace.individual.m)
                   ? game.urace.individual.m
                   : game.urace.noun;
    await polyman("You feel like a new %s!", newform);

    poly_gender(); /* newgend: only used by livelog_newform() */
    /* livelog_printf()/livelog_newform(): no livelog in this port */

    if (Slimed()) {
        await Your("body transforms, but there is still slime on you.");
        await make_slimed(10, null);
    }

    game.disp_botl = true;
    see_monsters();
    await encumber_msg();

    await retouch_equipment(2);
    if (!game.uarmg)
        await selftouch(no_longer_petrify_resistant);
}

// C ref: polyself.c polymon()
/* (try to) make a mntmp monster out of the player; return 1 if successful */
export async function polymon(mntmp) {
    const u = game.u;
    const youmonst = game.youmonst;
    let buf;
    let ustuckNam;
    const sticking = sticks(youmonst.data) && u.ustuck && !u.uswallow,
          was_blind = Blind(),
          was_hiding_under = u.uundetected && hides_under(youmonst.data);
    let dochange = false;
    let was_expelled = false;
    let mlvl, newMaxStr;

    if (game.mvitals && (game.mvitals[mntmp]?.mvflags & G_GENOD)) { /* allow G_EXTINCT */
        await You_feel(`rather ${pmname(mons[mntmp], game.flags.female ? FEMALE : MALE)}-ish.`);
        await exercise(A_WIS, true);
        return 0;
    }

    /* KMH, conduct */
    if (!u.uconduct.polyselfs++)
        livelog_printf(LL_CONDUCT,
                       `changed form for the first time, becoming ${
                           an(pmname(mons[mntmp], game.flags.female ? FEMALE : MALE))}`);

    /* exercise used to be at the very end but only Wis was affected
       there since the polymorph was always in effect by then */
    await exercise(A_CON, false);
    await exercise(A_WIS, true);

    if (!Upolyd()) {
        /* Human to monster; save human stats */
        u.macurr = { a: u.acurr.a.slice() };
        u.mamax = { a: u.amax.a.slice() };
        u.mfemale = game.flags.female;
    } else {
        /* Monster to monster; restore human stats, to be
         * immediately changed to provide stats for the new monster
         */
        u.acurr = { a: u.macurr.a.slice() };
        u.amax = { a: u.mamax.a.slice() };
        game.flags.female = u.mfemale;
    }

    /* if stuck mimicking gold, stop immediately */
    if (game.multi < 0 && (youmonst.m_ap_type || 0) === M_AP_OBJECT
        && youmonst.data.mlet !== M.S_MIMIC)
        await unmul("");
    /* if becoming a non-mimic, stop mimicking anything */
    if (mons[mntmp].mlet !== M.S_MIMIC) {
        /* as in polyman() */
        youmonst.m_ap_type = M_AP_NOTHING;
        youmonst.mappearance = 0;
    }
    if (is_male(mons[mntmp])) {
        if (game.flags.female)
            dochange = true;
    } else if (is_female(mons[mntmp])) {
        if (!game.flags.female)
            dochange = true;
    } else if (!is_neuter(mons[mntmp]) && mntmp !== u.ulycn) {
        if (game.sex_change_ok && !rn2(10))
            dochange = true;
    }

    ustuckNam = u.ustuck ? Some_Monnam(u.ustuck) : "";

    buf = (u.umonnum !== mntmp) ? "" : "new ";
    if (dochange) {
        game.flags.female = !game.flags.female;
        buf += (is_male(mons[mntmp]) || is_female(mons[mntmp]))
                   ? "" : game.flags.female ? "female " : "male ";
    }
    buf += pmname(mons[mntmp], game.flags.female ? FEMALE : MALE);
    await You(`${(u.umonnum !== mntmp) ? "turn into" : "feel like"} ${an(buf)}!`);

    if (Stoned() && poly_when_stoned(mons[mntmp])) {
        /* poly_when_stoned already checked stone golem genocide */
        mntmp = M.PM_STONE_GOLEM;
        await make_stoned(0, "You turn to stone!", 0, null);
    }

    u.mtimedone = rn1(500, 500);
    u.umonnum = mntmp;
    set_uasmon();

    /* New stats for monster, to last only as long as polymorphed.
     * Currently only strength gets changed.
     */
    newMaxStr = uasmon_maxStr();
    if (strongmonst(mons[mntmp])) {
        u.acurr.a[A_STR] = u.amax.a[A_STR] = newMaxStr;
    } else {
        /* not a strongmonst(); if hero has exceptional strength, remove it
           (note: removal is temporary until returning to original form);
           we don't attempt to enforce lower maximum for wimpy forms;
           unlike for strongmonst, current strength does not get set to max */
        u.amax.a[A_STR] = newMaxStr;
        /* make sure current is not higher than max (strip exceptional Str) */
        if (u.acurr.a[A_STR] > u.amax.a[A_STR])
            u.acurr.a[A_STR] = u.amax.a[A_STR];
    }

    if (uprop_on(STONE_RES) && Stoned()) { /* parnes@eniac.seas.upenn.edu */
        await make_stoned(0, "You no longer seem to be petrifying.", 0, null);
    }
    if (Sick_resistance() && uprop_on(SICK)) {
        await make_sick(0, null, false, SICK_ALL);
        await You("no longer feel sick.");
    }
    if (Slimed()) {
        if (flaming(youmonst.data)) {
            await make_slimed(0, "The slime burns away!");
        } else if (mntmp === M.PM_GREEN_SLIME) {
            /* do it silently */
            await make_slimed(0, null);
        }
    }
    await check_strangling(false); /* maybe stop strangling */
    if (nohands(youmonst.data))
        make_glib(0);

    /*
    mlvl = adj_lev(&mons[mntmp]);
     * We can't do the above, since there's no such thing as an
     * "experience level of you as a monster" for a polymorphed character.
     */
    mlvl = mons[mntmp].mlevel;
    if (youmonst.data.mlet === M.S_DRAGON && mntmp >= M.PM_GRAY_DRAGON) {
        u.mhmax = In_endgame(u.uz) ? (8 * mlvl) : (4 * mlvl + d(mlvl, 4));
    } else if (is_golem(youmonst.data)) {
        u.mhmax = golemhp(mntmp);
    } else {
        if (!mlvl)
            u.mhmax = rnd(4);
        else
            u.mhmax = d(mlvl, 8);
        if (is_home_elemental(mons[mntmp]))
            u.mhmax *= 3;
    }
    u.mh = u.mhmax;

    if (u.ulevel < mlvl) {
        /* Low level characters can't become high level monsters for long */
        u.mtimedone = Math.trunc(u.mtimedone * u.ulevel / mlvl);
    }

    if (game.uskin && mntmp !== armor_to_dragon(game.uskin.otyp))
        await skinback(false);
    await break_armor();
    await drop_weapon(1);
    find_ac(); /* (repeated below) */
    /* if hiding under something and can't hide anymore, unhide now;
       but don't auto-hide when not already hiding-under */
    if (was_hiding_under)
        await hideunder_async(youmonst);

    if (u.utrap && u.utraptype === TT_PIT) {
        set_utrap(rn1(6, 2), TT_PIT); /* time to escape resets */
    }
    if (was_blind && !Blind()) { /* previous form was eyeless */
        set_itimeout(BLINDED, 1); /* set_itimeout(&HBlinded, 1L) */
        await make_blinded(0, true); /* remove blindness */
    }
    newsym(u.ux, u.uy); /* Change symbol */

    /* you now know what an egg of your type looks like; [moved from
       below in case expels() -> spoteffects() drops hero onto any eggs] */
    if (lays_eggs(youmonst.data)) {
        learn_egg_type(u.umonnum);
        /* make queen bees recognize killer bee eggs */
        learn_egg_type(egg_type_from_parent(u.umonnum, true));
    }

    if (u.uswallow) {
        let usiz;

        /* if new form can't be swallowed, make engulfer expel hero */
        if (unsolid(youmonst.data)
            /* subset of engulf_target() */
            || (usiz = youmonst.data.msize) >= MZ_HUGE
            || (u.ustuck.data.msize < usiz && !is_whirly(u.ustuck.data))) {
            let expels_mesg = true;

            if (unsolid(youmonst.data)) {
                if (canspotmon(u.ustuck)) /* [see below for explanation] */
                    ustuckNam = Monnam(u.ustuck);
                await pline(`${ustuckNam} can no longer contain you.`);
                expels_mesg = false;
            }
            await expels(u.ustuck, u.ustuck.data, expels_mesg);
            was_expelled = true;
            /* FIXME? if expels() triggered rehumanize then we should
               return early */
        }

    /* [note:  this 'sticking' handling is only sufficient for changing from
       grabber to engulfer or vice versa because engulfing by poly'd hero
       always ends immediately so won't be in effect during a polymorph] */
    } else if (u.ustuck && !sticking /* && !u.uswallow */
               /* being held; if now capable of holding, make holder
                  release so that hero doesn't automagically start holding
                  it; or, release if no longer capable of being held */
               && (sticks(youmonst.data) || unsolid(youmonst.data))) {
        /* u.ustuck name was saved above in case we're changing from can-see
           to can't-see; but might have changed from can't-see to can-see so
           override here if hero knows who u.ustuck is */
        if (canspotmon(u.ustuck))
            ustuckNam = Monnam(u.ustuck);
        set_ustuck(null);
        await pline(`${ustuckNam} loses its grip on you.`);
    } else if (sticking && !sticks(youmonst.data)) {
        /* was holding onto u.ustuck but no longer capable of that */
        await uunstick();
    }

    if (u.usteed) {
        if (touch_petrifies(u.usteed.data) && !uprop_on(STONE_RES) && rnl(3)) {
            await pline(`${no_longer_petrify_resistant} touch ${mon_nam(u.usteed)}.`);
            buf = `riding ${an(pmname(u.usteed.data, Mgender(u.usteed)))}`;
            await instapetrify(buf);
        }
        if (!can_ride(u.usteed))
            await dismount_steed(DISMOUNT_POLY);
    }

    find_ac();
    if (((!uprop_on(LEVITATION) && !u.ustuck && !Flying()
          && is_pool_or_lava(u.ux, u.uy))
         || (u.uinwater && !uprop_on(SWIMMING)))
        /* if expelled above, expels() already called spoteffects() */
        && !was_expelled) {
        await spoteffects(true);
        /* FIXME? if spoteffects() triggered rehumanize then we should
           return early */
    }
    if (uprop_on(PASSES_WALLS) && u.utrap
        && (u.utraptype === TT_INFLOOR || u.utraptype === TT_BURIEDBALL)) {
        if (u.utraptype === TT_INFLOOR) {
            await pline_The("rock seems to no longer trap you.");
        } else {
            await pline_The("buried ball is no longer bound to you.");
            await buried_ball_to_freedom();
        }
        await reset_utrap(true);
    } else if (likes_lava(youmonst.data) && u.utrap
               && u.utraptype === TT_LAVA) {
        await pline_The(`${hliquid("lava")} now feels soothing.`);
        await reset_utrap(true);
    }
    if (amorphous(youmonst.data) || is_whirly(youmonst.data)
        || unsolid(youmonst.data)) {
        if (Punished()) {
            await You("slip out of the iron chain.");
            await unpunish();
        } else if (u.utrap && u.utraptype === TT_BURIEDBALL) {
            await You("slip free of the buried ball and chain.");
            await buried_ball_to_freedom();
        }
    }
    if (u.utrap && (u.utraptype === TT_WEB || u.utraptype === TT_BEARTRAP)
        && (amorphous(youmonst.data) || is_whirly(youmonst.data)
            || unsolid(youmonst.data)
            || (youmonst.data.msize <= M.MZ_SMALL
                && u.utraptype === TT_BEARTRAP))) {
        await You(`are no longer stuck in the ${
            u.utraptype === TT_WEB ? "web" : "bear trap"}.`);
        /* probably should burn webs too if PM_FIRE_ELEMENTAL */
        await reset_utrap(true);
    }
    if (webmaker(youmonst.data) && u.utrap && u.utraptype === TT_WEB) {
        await You("orient yourself on the web.");
        await reset_utrap(true);
    }
    await check_strangling(true); /* maybe start strangling */

    game.disp_botl = true;
    game.vision_full_recalc = 1;
    see_monsters();
    await encumber_msg();

    await retouch_equipment(2);
    /* this might trigger a recursive call to polymon() [stone golem
       wielding cockatrice corpse and hit by stone-to-flesh, becomes
       flesh golem above, now gets transformed back into stone golem;
       fortunately neither form uses #monster] */
    if (!game.uarmg)
        await selftouch(no_longer_petrify_resistant);

    /* the explanation of '#monster' used to be shown sooner, but there are
       possible fatalities above and it isn't useful unless hero survives */
    if (game.flags.verbose) {
        const use_thec = (cmd, what) => `Use the command #${cmd} to ${what}.`;
        const monsterc = "monster";
        const uptr = youmonst.data;
        const might_hide = (is_hider(uptr) || hides_under(uptr));

        if (can_breathe(uptr))
            await pline(use_thec(monsterc, "use your breath weapon"));
        if (attacktype(uptr, M.AT_SPIT))
            await pline(use_thec(monsterc, "spit venom"));
        if (uptr.mlet === M.S_NYMPH)
            await pline(use_thec(monsterc, "remove an iron ball"));
        if (attacktype(uptr, M.AT_GAZE))
            await pline(use_thec(monsterc, "gaze at monsters"));
        if (might_hide && webmaker(uptr))
            await pline(use_thec(monsterc, "hide or to spin a web"));
        else if (might_hide)
            await pline(use_thec(monsterc, "hide"));
        else if (webmaker(uptr))
            await pline(use_thec(monsterc, "spin a web"));
        if (is_were(uptr))
            await pline(use_thec(monsterc, "summon help"));
        if (u.umonnum === M.PM_GREMLIN)
            await pline(use_thec(monsterc, "multiply in a fountain"));
        if (is_unicorn(uptr))
            await pline(use_thec(monsterc, "use your horn"));
        if (is_mind_flayer(uptr))
            await pline(use_thec(monsterc, "emit a mental blast"));
        if (uptr.msound === M.MS_SHRIEK) /* worthless, actually */
            await pline(use_thec(monsterc, "shriek"));
        if (is_vampire(uptr) || is_vampshifter(youmonst))
            await pline(use_thec(monsterc, "change shape"));

        if (lays_eggs(uptr) && game.flags.female
            && !(uptr === mons[M.PM_GIANT_EEL]
                 || uptr === mons[M.PM_ELECTRIC_EEL]))
            await pline(use_thec("sit",
                                 /* eggs_in_water(uptr) */
                                 (lays_eggs(uptr) && uptr.mlet === M.S_EEL
                                  && is_swimmer(uptr))
                                     ? "spawn in the water" : "lay an egg"));
    }
    return 1;
}

// C ref: polyself.c uasmon_maxStr()
/* determine hero's temporary strength value used while polymorphed;
   hero poly'd into M2_STRONG monster usually gets 18/100 strength but
   there are exceptions; non-M2_STRONG get maximum strength set to 18 */
function uasmon_maxStr() {
    let newMaxStr;
    let mndx = game.u.umonnum;
    const ptr = mons[mndx];

    if (is_orc(ptr)) {
        if (mndx !== M.PM_URUK_HAI && mndx !== M.PM_ORC_CAPTAIN)
            mndx = M.PM_ORC;
    } else if (is_elf(ptr)) {
        mndx = M.PM_ELF;
    } else if (is_dwarf(ptr)) {
        mndx = M.PM_DWARF;
    } else if (is_gnome(ptr)) {
        mndx = M.PM_GNOME;
    }
    const R = character_race(mndx);

    if (strongmonst(ptr)) {
        /* ettins, titans and minotaurs don't pass the is_giant() test;
           giant mummies and giant zombies do but we throttle those */
        const live_H = is_giant(ptr) && !is_undead(ptr);

        newMaxStr = R ? R.attrmax[A_STR] : live_H ? 18 + 100 + 1 /* STR19(19) */
                                                  : 18 + 100; /* STR18(100) */
    } else {
        newMaxStr = R ? R.attrmax[A_STR] : 18; /* 18 is same as STR18(0) */
    }
    return newMaxStr;
}

// C ref: polyself.c dropp()
/* dropx() jacket for break_armor() */
async function dropp(obj) {
    /*
     * Dropping worn armor while polymorphing might put hero into water
     * (loss of levitation boots or water walking boots that the new
     * form can't wear), where emergency_disrobe() could remove it from
     * inventory.  Without this, dropx() could trigger an 'object lost'
     * panic.
     */
    for (let otmp = game.invent; otmp; otmp = otmp.nobj) {
        if (otmp === obj) {
            await dropx(obj);
            break;
        }
    }
}

// C ref: polyself.c break_armor()
async function break_armor() {
    const u = game.u;
    let otmp;
    const uptr = game.youmonst.data;

    if (breakarm(uptr)) {
        if ((otmp = game.uarm) != null) {
            if (donning(otmp))
                cancel_don();
            /* for gold DSM, we don't want Armor_gone() to report that it
               stops shining _after_ we've been told that it is destroyed */
            if (otmp.lamplit)
                end_burn(otmp, false);

            await You("break out of your armor!");
            await exercise(A_STR, false);
            await Armor_gone();
            useup(otmp);
        }
        if ((otmp = game.uarmc) != null
            /* mummy wrapping adapts to small and very big sizes */
            && (otmp.otyp !== O.MUMMY_WRAPPING || !WrappingAllowed(uptr))) {
            if (otmp.otyp === O.MUMMY_WRAPPING) {
                /* doesn't have a clasp to break open */
                await Your(`${cloak_simple_name(otmp)} tears apart!`);
                await Cloak_off();
                useup(otmp);
            } else if (otmp.otyp === O.ALCHEMY_SMOCK) {
                await pline_The(`knot on your ${cloak_simple_name(otmp)} is pulled apart!`);
                await Cloak_off();
                await dropp(otmp);
            } else {
                await pline_The(`clasp on your ${cloak_simple_name(otmp)} breaks open!`);
                await Cloak_off();
                await dropp(otmp);
            }
        }
        if (game.uarmu) {
            await Your("shirt rips to shreds!");
            useup(game.uarmu);
        }
    } else if (sliparm(uptr)) {
        if ((otmp = game.uarm) != null
            && racial_exception(game.youmonst, otmp) < 1) {
            if (donning(otmp))
                cancel_don();
            await Your("armor falls around you!");
            /* [note: _gone() instead of _off() dates to when life-saving
               could force fire resisting armor back on if hero burned in
               hell (3.0, predating Gehennom); the armor isn't actually
               gone here but also isn't available to be put back on] */
            await Armor_gone();
            await dropp(otmp);
        }
        if ((otmp = game.uarmc) != null
            /* mummy wrapping adapts to small and very big sizes */
            && (otmp.otyp !== O.MUMMY_WRAPPING || !WrappingAllowed(uptr))) {
            if (is_whirly(uptr))
                await Your(`${cloak_simple_name(otmp)} falls, unsupported!`);
            else
                await You(`shrink out of your ${cloak_simple_name(otmp)}!`);
            await Cloak_off();
            await dropp(otmp);
        }
        if ((otmp = game.uarmu) != null) {
            if (is_whirly(uptr))
                await You("seep right through your shirt!");
            else
                await You("become much too small for your shirt!");
            setworn(null, otmp.owornmask & W_ARMU);
            await dropp(otmp);
        }
    }
    if (has_horns(uptr)) {
        if ((otmp = game.uarmh) != null) {
            if (is_flimsy(otmp) && !donning(otmp)) {
                /* Future possibilities: This could damage/destroy helmet */
                const hornbuf = `horn${plur(num_horns(uptr))}`;
                await Your(`${hornbuf} ${vtense(hornbuf, "pierce")} through ${yname(otmp)}.`);
            } else {
                if (donning(otmp))
                    cancel_don();
                await Your(`${helm_simple_name(otmp)} falls to the ${surface(u.ux, u.uy)}!`);
                await Helmet_off();
                await dropp(otmp);
            }
        }
    }
    if (nohands(uptr) || verysmall(uptr)) {
        if ((otmp = game.uarmg) != null) {
            if (donning(otmp))
                cancel_don();
            /* Drop weapon along with gloves */
            await You(`drop your gloves${game.uwep ? " and weapon" : ""}!`);
            await drop_weapon(0);
            await Gloves_off();
            /* Glib manipulation (ends immediately) handled by Gloves_off */
            await dropp(otmp);
        }
        if ((otmp = game.uarms) != null) {
            await You("can no longer hold your shield!");
            await Shield_off();
            await dropp(otmp);
        }
        if ((otmp = game.uarmh) != null) {
            if (donning(otmp))
                cancel_don();
            await Your(`${helm_simple_name(otmp)} falls to the ${surface(u.ux, u.uy)}!`);
            await Helmet_off();
            await dropp(otmp);
        }
    }
    if (nohands(uptr) || verysmall(uptr)
        || slithy(uptr) || uptr.mlet === M.S_CENTAUR) {
        if ((otmp = game.uarmf) != null) {
            if (donning(otmp))
                cancel_don();
            if (is_whirly(uptr))
                await Your("boots fall away!");
            else
                await Your(`boots ${verysmall(uptr) ? "slide" : "are pushed"} off your feet!`);
            await Boots_off();
            await dropp(otmp);
        }
    }
    /* not armor, but eyewear shouldn't stay worn without a head to wear
       it/them on (should also come off if head is too tiny or too huge,
       but putting accessories on doesn't reject those cases [yet?]);
       amulet stays worn */
    if ((otmp = game.ublindf) != null && !has_head(uptr)) {
        let eyewear = simpleonames(otmp); /* blindfold|towel|lenses */

        if (eyewear.startsWith("pair of ")) /* lenses */
            eyewear = eyewear.slice(8);
        await Your(`${eyewear} ${vtense(eyewear, "fall")} off!`);
        await Blindf_off(null); /* Null: skip usual off mesg */
        await dropp(otmp);
    }
    /* rings stay worn even when no hands */
}

// C ref: polyself.c drop_weapon()
async function drop_weapon(alone) {
    const u = game.u;
    let otmp;
    let what, which, whichtoo;
    let candropwep, candropswapwep;

    if (game.uwep) {
        /* !alone check below is currently superfluous but in the
         * future it might not be so if there are monsters which cannot
         * wear gloves but can wield weapons
         */
        if (!alone || cantwield(game.youmonst.data)) {
            candropwep = await canletgo(game.uwep, "");
            candropswapwep = !u.twoweap || await canletgo(game.uswapwep, "");
            if (alone) {
                what = (candropwep && candropswapwep) ? "drop" : "release";
                which = is_sword(game.uwep) ? "sword" : weapon_descr(game.uwep);
                if (u.twoweap) {
                    whichtoo = is_sword(game.uswapwep) ? "sword"
                               : weapon_descr(game.uswapwep);
                    if (which !== whichtoo)
                        which = "weapon";
                }
                if (game.uwep.quan !== 1 || u.twoweap)
                    which = makeplural(which);

                await You(`find you must ${what} ${
                    which.startsWith("corpse") ? "the" : "your"} ${which}!`);
            }
            /* if either uwep or wielded uswapwep is flagged as 'in_use'
               then don't drop it or explicitly update inventory; leave
               those actions to caller (or caller's caller, &c) */
            if (u.twoweap) {
                otmp = game.uswapwep;
                uswapwepgone();
                if (!otmp.in_use && candropswapwep)
                    await dropx(otmp);
            }
            otmp = game.uwep;
            uwepgone();
            if (!otmp.in_use && candropwep)
                await dropx(otmp);
            /* [note: dropp vs dropx -- if heart of ahriman is wielded, we
               might be losing levitation by dropping it; but that won't
               happen until the drop, unlike Boots_off() dumping hero into
               water and triggering emergency_disrobe() before dropx()] */

            /* update_inventory(): no perm_invent */
        } else if (!could_twoweap(game.youmonst.data)) {
            await untwoweapon();
        }
    }
}

// C ref: polyself.c rehumanize()
/* return to original form, usually either due to polymorph timing out
   or dying from loss of hit points while being polymorphed */
export async function rehumanize() {
    const u = game.u;
    const was_flying = Flying();

    /* You can't revert back while unchanging */
    if (Unchanging()) {
        if (u.mh < 1) {
            killer_ps().format = NO_KILLER_PREFIX_PS;
            killer_ps().name = "killed while stuck in creature form";
            await done_ps(DIED_PS);
            /* can get to here if declining to die in explore or wizard
               mode; since we're wearing an amulet of unchanging we can't
               be wearing an amulet of life-saving */
            return; /* don't rehumanize after all */
        } else if (game.uamul && game.uamul.otyp === O.AMULET_OF_UNCHANGING) {
            await Your(`${simpleonames(game.uamul)} ${otense_ps(game.uamul, "fail")}!`);
            observe_object_ps(game.uamul, Hallucination_ps());
            makeknown_ps(O.AMULET_OF_UNCHANGING);
        }
    }

    /*
     * Right now, dying while being a shifted vampire (bat, cloud, wolf)
     * reverts to human rather than to vampire.
     */

    if (emits_light(game.youmonst.data))
        del_light_source(LS_MONSTER, monst_to_any(game.youmonst));
    await polyman("You return to %s form!", game.urace.adj);

    if (u.uhp < 1) {
        /* can only happen if some bit of code reduces u.uhp
           instead of u.mh while poly'd */
        await Your("old form was not healthy enough to survive.");
        killer_ps().name = `reverting to unhealthy ${game.urace.adj} form`;
        killer_ps().format = KILLED_BY_PS;
        await done_ps(DIED_PS);
    }
    nomul(0);

    game.disp_botl = true;
    game.vision_full_recalc = 1;
    await encumber_msg();
    /* update_inventory(): no perm_invent */
    if (was_flying && !Flying() && u.usteed)
        await You(`and ${mon_nam(u.usteed)} return gently to the ${surface(u.ux, u.uy)}.`);
    await retouch_equipment(2);
    if (!game.uarmg)
        await selftouch(no_longer_petrify_resistant);
}

// C ref: polyself.c uunstick()
export async function uunstick() {
    const mtmp = game.u.ustuck;

    if (!mtmp)
        throw new Error('uunstick: no ustuck?'); /* impossible() */
    set_ustuck(null); /* before pline() */
    await pline(`${Monnam(mtmp)} is no longer in your clutches.`);
}

// C ref: polyself.c skinback()
export async function skinback(silently) {
    if (game.uskin) {
        const old_light = arti_light_radius(game.uskin);

        if (!silently)
            await Your("skin returns to its original form.");
        game.uarm = game.uskin;
        game.uskin = null;
        /* undo save/restore hack */
        game.uarm.owornmask &= ~I_SPECIAL;

        if (artifact_light(game.uarm))
            await maybe_adjust_light(game.uarm, old_light);
    }
}

// C ref: polyself.c armor_to_dragon()
function armor_to_dragon(atyp) {
    switch (atyp) {
    case O.GRAY_DRAGON_SCALE_MAIL:
    case O.GRAY_DRAGON_SCALES:
        return M.PM_GRAY_DRAGON;
    case O.SILVER_DRAGON_SCALE_MAIL:
    case O.SILVER_DRAGON_SCALES:
        return M.PM_SILVER_DRAGON;
    case O.GOLD_DRAGON_SCALE_MAIL:
    case O.GOLD_DRAGON_SCALES:
        return M.PM_GOLD_DRAGON;
    case O.RED_DRAGON_SCALE_MAIL:
    case O.RED_DRAGON_SCALES:
        return M.PM_RED_DRAGON;
    case O.ORANGE_DRAGON_SCALE_MAIL:
    case O.ORANGE_DRAGON_SCALES:
        return M.PM_ORANGE_DRAGON;
    case O.WHITE_DRAGON_SCALE_MAIL:
    case O.WHITE_DRAGON_SCALES:
        return M.PM_WHITE_DRAGON;
    case O.BLACK_DRAGON_SCALE_MAIL:
    case O.BLACK_DRAGON_SCALES:
        return M.PM_BLACK_DRAGON;
    case O.BLUE_DRAGON_SCALE_MAIL:
    case O.BLUE_DRAGON_SCALES:
        return M.PM_BLUE_DRAGON;
    case O.GREEN_DRAGON_SCALE_MAIL:
    case O.GREEN_DRAGON_SCALES:
        return M.PM_GREEN_DRAGON;
    case O.YELLOW_DRAGON_SCALE_MAIL:
    case O.YELLOW_DRAGON_SCALES:
        return M.PM_YELLOW_DRAGON;
    default:
        return NON_PM;
    }
}

// C ref: timeout.c learn_egg_type()
/* give the hero knowledge of an egg type */
export function learn_egg_type(mnum) {
    /* baby monsters hatch from grown-up eggs */
    mnum = little_to_big(mnum);
    game.mvitals[mnum].mvflags |= MV_KNOWS_EGG;
    /* we might have just learned about other eggs being carried */
    /* update_inventory(): no perm_invent */
}

// C ref: mon.c egg_type_from_parent()
/* type of egg laid by #sit; usually matches parent */
function egg_type_from_parent(
    mnum, /* parent monster; caller must handle lays_eggs() check */
    force_ordinary) {
    if (force_ordinary || !BREEDER_EGG()) {
        if (mnum === M.PM_QUEEN_BEE)
            mnum = M.PM_KILLER_BEE;
        else if (mnum === M.PM_WINGED_GARGOYLE)
            mnum = M.PM_GARGOYLE;
    }
    return mnum;
}
/* C ref: mon.c BREEDER_EGG */
function BREEDER_EGG() { return !rn2(77); }

// C ref: polyself.c dobreathe()
export async function dobreathe() {
    const u = game.u;

    if (Strangled()) {
        await You_cant("breathe.  Sorry.");
        return 0; /* ECMD_OK */
    }
    if (u.uen < 15) {
        await You("don't have enough energy to breathe!");
        return 0; /* ECMD_OK */
    }
    u.uen -= 15;
    game.disp_botl = true;

    if (!await getdir(null))
        return ECMD_CANCEL;

    const mattk = attacktype_fordmg(game.youmonst.data, AT_BREA, AD_ANY);
    if (!mattk)
        impossible("bad breath attack?"); /* mouthwash needed... */
    else if (!u.dx && !u.dy && !u.dz)
        throw new Error('dobreathe(): ubreatheu() not ported yet');
    else /* BZ_U_BREATH(BZ_OFS_AD(mattk->adtyp)) */
        await ubuzz(20 + Math.abs(mattk.adtyp - AD_MAGM) % 10, mattk.damn);
    return ECMD_TIME;
}

// C ref: polyself.c dospit()
export async function dospit() {
    let otmp;
    let mattk;

    if (!await getdir(null))
        return ECMD_CANCEL;
    mattk = attacktype_fordmg(game.youmonst.data, AT_SPIT, AD_ANY);
    if (!mattk) {
        impossible("bad spit attack?");
    } else {
        switch (mattk.adtyp) {
        case AD_BLND:
        case AD_DRST:
            otmp = mksobj(O.BLINDING_VENOM, true, false);
            break;
        default:
            impossible("bad attack type in dospit");
            /*FALLTHRU*/
        case AD_ACID:
            otmp = mksobj(O.ACID_VENOM, true, false);
            break;
        }
        otmp.spe = 1; /* to indicate it's yours */
        await throwit(otmp, 0, false, null);
    }
    return ECMD_TIME;
}

// C ref: polyself.c doremove()
export async function doremove() {
    const u = game.u;

    if (!Punished()) {
        if (u.utrap && u.utraptype === TT_BURIEDBALL) {
            await pline_The(`ball and chain are buried firmly in the ${
                surface(u.ux, u.uy)}.`);
            return ECMD_OK_PS;
        }
        await You("are not chained to anything!");
        return ECMD_OK_PS;
    }
    await unpunish();
    return ECMD_TIME;
}

// C ref: polyself.c dospinweb()
export async function dospinweb() {
    const u = game.u;
    const x = u.ux, y = u.uy;
    let ttmp = t_at_sw(x, y);
    /* disallow webs on water, lava, air & cloud */
    const reject_terrain = is_pool_or_lava(x, y)
                           || IS_AIR_SW(game.level.at(x, y).typ);

    /* [at the time this was written, it was not possible to be both a
       webmaker and a flyer, but with the advent of amulet of flying that
       became a possibility; at present hero can spin a web while flying] */
    if (Levitation_sw() || reject_terrain) {
        await You(`must be on ${reject_terrain ? "solid" : "the"} ground to spin a web.`);
        return ECMD_OK_PS;
    }
    if (u.uswallow) {
        await You(`release web fluid inside ${mon_nam(u.ustuck)}.`);
        if (is_animal_sw(u.ustuck.data)) {
            await expels(u.ustuck, u.ustuck.data, true);
            return ECMD_OK_PS;
        }
        if (is_whirly(u.ustuck.data)) {
            let i;

            for (i = 0; i < NATTK_SW; i++)
                if (u.ustuck.data.mattk[i].aatyp === M.AT_ENGL)
                    break;
            if (i === NATTK_SW)
                impossible("Swallower has no engulfing attack?");
            else {
                let sweep = '';

                switch (u.ustuck.data.mattk[i].adtyp) {
                case M.AD_FIRE:
                    sweep = "ignites and ";
                    break;
                case M.AD_ELEC:
                    sweep = "fries and ";
                    break;
                case M.AD_COLD:
                    sweep = "freezes, shatters and ";
                    break;
                }
                await pline_The(`web ${sweep}is swept away!`);
            }
            return ECMD_OK_PS;
        } /* default: a nasty jelly-like creature */
        await pline_The(`web dissolves into ${mon_nam(u.ustuck)}.`);
        return ECMD_OK_PS;
    }
    if (u.utrap) {
        await You("cannot spin webs while stuck in a trap.");
        return ECMD_OK_PS;
    }
    await exercise(A_DEX_SW, true);
    if (ttmp) {
        switch (ttmp.ttyp) {
        case TT.PIT:
        case TT.SPIKED_PIT:
            await You("spin a web, covering up the pit.");
            deltrap_sw(ttmp);
            await bury_objs_sw(x, y);
            newsym(x, y);
            return ECMD_TIME;
        case TT.SQKY_BOARD:
            await pline_The("squeaky board is muffled.");
            deltrap_sw(ttmp);
            newsym(x, y);
            return ECMD_TIME;
        case TT.TELEP_TRAP:
        case TT.LEVEL_TELEP:
        case TT.MAGIC_PORTAL:
        case TT.VIBRATING_SQUARE:
            await Your("webbing vanishes!");
            return ECMD_OK_PS;
        case TT.WEB:
            await You("make the web thicker.");
            return ECMD_TIME;
        case TT.HOLE:
        case TT.TRAPDOOR:
            await You(`web over the ${
                (ttmp.ttyp === TT.TRAPDOOR) ? "trap door" : "hole"}.`);
            deltrap_sw(ttmp);
            newsym(x, y);
            return ECMD_TIME;
        case TT.ROLLING_BOULDER_TRAP:
            await You("spin a web, jamming the trigger.");
            deltrap_sw(ttmp);
            newsym(x, y);
            return ECMD_TIME;
        case TT.ARROW_TRAP:
        case TT.DART_TRAP:
        case TT.BEAR_TRAP:
        case TT.ROCKTRAP:
        case TT.FIRE_TRAP:
        case TT.LANDMINE:
        case TT.SLP_GAS_TRAP:
        case TT.RUST_TRAP:
        case TT.MAGIC_TRAP:
        case TT.ANTI_MAGIC:
        case TT.POLY_TRAP:
            await You("have triggered a trap!");
            await dotrap_sw(ttmp, NO_TRAP_FLAGS_SW);
            return ECMD_TIME;
        default:
            impossible(`Webbing over trap type ${ttmp.ttyp}?`);
            return ECMD_OK_PS;
        }
    } else if (On_stairs_sw(x, y)) {
        /* cop out: don't let them hide the stairs */
        await Your(`web fails to impede access to the ${
            (game.level.at(x, y).typ === STAIRS_SW) ? "stairs" : "ladder"}.`);
        return ECMD_TIME;
    }
    ttmp = maketrap_sw(x, y, TT.WEB);
    if (ttmp) {
        await You("spin a web.");
        ttmp.madeby_u = 1;
        feeltrap_sw(ttmp);
        if (in_rooms_sw(x, y, SHOPBASE_SW).length)
            add_damage_sw(x, y, SHOP_WEB_COST_SW);
    }
    return ECMD_TIME;
}

// C ref: polyself.c dosummon()
export async function dosummon() {
    const u = game.u;
    /* int placeholder: were_summon()'s visible count */
    const out = { visible: 0 };

    if (u.uen < 10) {
        await You("lack the energy to send forth a call for help!");
        return ECMD_OK_PS;
    }
    u.uen -= 10;
    game.disp_botl = true;

    await You("call upon your brethren for help!");
    await exercise(A_WIS, true);
    if (!await were_summon_ps(game.youmonst.data, true, out))
        await pline("But none arrive.");
    return ECMD_TIME;
}

// C ref: polyself.c domindblast()
export async function domindblast() {
    const u = game.u;
    let mtmp, nmon;
    let dmg;

    if (u.uen < 10) {
        await You("concentrate but lack the energy to maintain doing so.");
        return ECMD_OK_PS;
    }
    u.uen -= 10;
    game.disp_botl = true;

    await You("concentrate.");
    await pline("A wave of psychic energy pours out.");
    for (mtmp = game.fmon; mtmp; mtmp = nmon) {
        let u_sen;

        nmon = mtmp.nmon;
        if (DEADMONSTER_ps(mtmp))
            continue;
        if (mdistu_ps(mtmp) > BOLT_LIM_PS * BOLT_LIM_PS)
            continue;
        if (mtmp.mpeaceful)
            continue;
        if (mindless_ps(mtmp.data))
            continue;
        u_sen = telepathic(mtmp.data) && !mtmp.mcansee;
        if (u_sen || (telepathic(mtmp.data) && rn2(2)) || !rn2(10)) {
            dmg = rnd(15);
            /* wake it up first, to bring hidden monster out of hiding;
               but in case it is currently peaceful, don't make it hostile
               unless it will survive the psychic blast, otherwise hero
               would avoid the penalty for killing it while peaceful */
            await wakeup_ps(mtmp, (dmg > mtmp.mhp) ? true : false);
            await You(`lock in on ${s_suffix_ps(mon_nam(mtmp))} ${
                u_sen ? "telepathy"
                  : telepathic(mtmp.data) ? "latent telepathy"
                    : "mind"}.`);
            mtmp.mhp -= dmg;
            if (DEADMONSTER_ps(mtmp))
                await killed_ps(mtmp);
        }
    }
    return ECMD_TIME;
}

// C ref: polyself.c dogaze()
export async function dogaze() {
    const u = game.u;
    let mtmp;
    let looked = 0;
    let qbuf;
    let i;
    let adtyp = 0;

    for (i = 0; i < NATTK_SW; i++) {
        if (game.youmonst.data.mattk[i].aatyp === M.AT_GAZE) {
            adtyp = game.youmonst.data.mattk[i].adtyp;
            break;
        }
    }
    if (adtyp !== M.AD_CONF && adtyp !== M.AD_FIRE) {
        impossible(`gaze attack ${adtyp}?`);
        return ECMD_OK_PS;
    }

    if (Blind()) {
        await You_cant("see anything to gaze at.");
        return ECMD_OK_PS;
    } else if (Hallucination_ps()) {
        await You_cant("gaze at anything you can see.");
        return ECMD_OK_PS;
    }
    if (u.uen < 15) {
        await You("lack the energy to use your special gaze!");
        return ECMD_OK_PS;
    }
    u.uen -= 15;
    game.disp_botl = true;

    for (mtmp = game.fmon; mtmp; mtmp = mtmp.nmon) {
        if (DEADMONSTER_ps(mtmp))
            continue;
        if (canseemon_gz(mtmp) && couldsee_gz(mtmp.mx, mtmp.my)) {
            looked++;
            if (Invis_gz() && !perceives(mtmp.data)) {
                await pline(`${Monnam(mtmp)} seems not to notice your gaze.`);
            } else if (mtmp.minvis && !See_invisible_gz()) {
                await You_cant(`see where to gaze at ${Monnam(mtmp)}.`);
            } else if (M_AP_TYPE_GZ(mtmp) === M_AP_FURNITURE_GZ
                       || M_AP_TYPE_GZ(mtmp) === M_AP_OBJECT) {
                looked--;
                continue;
            } else if (game.flags.safe_dog && mtmp.mtame && !Confusion_gz()) {
                await You(`avoid gazing at ${y_monnam_gz(mtmp)}.`);
            } else {
                if (game.flags.confirm && mtmp.mpeaceful && !Confusion_gz()) {
                    qbuf = `Really ${(adtyp === M.AD_CONF) ? "confuse" : "attack"} ${
                        mon_nam(mtmp)}?`;
                    if (await tty_yn_function_ps(qbuf, "yn", 'n') !== 'y') /* y_n() */
                        continue;
                }
                await setmangry_gz(mtmp, true);
                if (helpless_gz(mtmp) || mtmp.mstun
                    || !mtmp.mcansee || !haseyes(mtmp.data)) {
                    looked--;
                    continue;
                }
                /* No reflection check for consistency with when a monster
                 * gazes at *you*--only medusa gaze gets reflected then.
                 */
                if (adtyp === M.AD_CONF) {
                    if (!mtmp.mconf)
                        await Your(`gaze confuses ${mon_nam(mtmp)}!`);
                    else
                        await pline(`${Monnam(mtmp)} is getting more and more confused.`);
                    mtmp.mconf = 1;
                } else if (adtyp === M.AD_FIRE) {
                    let dmg = d(2, 6);
                    const orig_dmg = dmg, lev = u.ulevel;

                    await You(`attack ${mon_nam(mtmp)} with a fiery gaze!`);
                    if (resists_fire_gz(mtmp)) {
                        await pline_The(`fire doesn't burn ${mon_nam(mtmp)}!`);
                        dmg = 0;
                    }
                    if (lev > rn2(20)) {
                        dmg += await destroy_items_gz(mtmp, M.AD_FIRE, orig_dmg);
                        await ignite_items_gz(mtmp.minvent);
                    }
                    if (dmg)
                        mtmp.mhp -= dmg;
                    if (DEADMONSTER_ps(mtmp))
                        await killed_ps(mtmp);
                }
                /* For consistency with passive() in uhitm.c, this only
                 * affects you if the monster is still alive.
                 */
                if (DEADMONSTER_ps(mtmp))
                    continue;

                if (mtmp.data === mons[M.PM_FLOATING_EYE] && !mtmp.mcan) {
                    if (!Free_action_gz()) {
                        await You(`are frozen by ${s_suffix_ps(mon_nam(mtmp))} gaze!`);
                        nomul((u.ulevel > 6 || rn2(4))
                                  ? -d(mtmp.m_lev + 1,
                                       mtmp.data.mattk[0].damd)
                                  : -200);
                        game.multi_reason = "frozen by a monster's gaze";
                        game.nomovemsg = null;
                        return ECMD_TIME;
                    } else
                        await You(`stiffen momentarily under ${
                            s_suffix_ps(mon_nam(mtmp))} gaze.`);
                }
                /* Technically this one shouldn't affect you at all because
                 * the Medusa gaze is an active monster attack that only
                 * works on the monster's turn, but for it to *not* have an
                 * effect would be too weird.
                 */
                if (mtmp.data === mons[M.PM_MEDUSA] && !mtmp.mcan) {
                    await pline(`Gazing at the awake ${l_monnam_gz(mtmp)} is not a very good idea.`);
                    /* as if gazing at a sleeping anything is fruitful... */
                    await urgent_pline("You turn to stone...");
                    killer_ps().format = KILLED_BY_PS;
                    killer_ps().name = "deliberately meeting Medusa's gaze";
                    await done_ps(STONING_GZ);
                }
            }
        }
    }
    if (!looked)
        await You("gaze at no place in particular.");
    return ECMD_TIME;
}

// C ref: polyself.c dohide()
export async function dohide() {
    const u = game.u;
    const ismimic = game.youmonst.data.mlet === M.S_MIMIC,
          on_ceiling = is_clinger_ps(game.youmonst.data) || Flying();
    const U_AP_TYPE = () => (game.youmonst.m_ap_type || M_AP_NOTHING);

    /* can't hide while being held (or holding) or while trapped
       (except for floor hiders [trapper or mimic] in pits) */
    if (u.ustuck || (u.utrap && (u.utraptype !== TT_PIT || on_ceiling))) {
        await You_cant(`hide while you're ${
            !u.ustuck ? "trapped"
              : u.uswallow ? (digests_ps(u.ustuck.data) ? "swallowed"
                                                        : "engulfed")
                : !sticks(game.youmonst.data) ? "being held"
                  : (humanoid(u.ustuck.data) ? "holding someone"
                                             : "holding that creature")}.`);
        if (u.uundetected || (ismimic && U_AP_TYPE() !== M_AP_NOTHING)) {
            u.uundetected = 0;
            game.youmonst.m_ap_type = M_AP_NOTHING;
            newsym(u.ux, u.uy);
        }
        return ECMD_OK_PS;
    }
    /* note: hero-as-eel handling is incomplete but unnecessary;
       such critters aren't offered the option of hiding via #monster */
    if (game.youmonst.data.mlet === M.S_EEL && !is_pool(u.ux, u.uy)) {
        if (IS_FOUNTAIN_PS(game.level.at(u.ux, u.uy).typ))
            await pline_The("fountain is not deep enough to hide in.");
        else
            await There_ps(`is no ${hliquid("water")} to hide in here.`);
        u.uundetected = 0;
        return ECMD_OK_PS;
    }
    if (hides_under(game.youmonst.data)) {
        let ct = 0;
        const pile = level_objects_at_ps(u.ux, u.uy);
        const otop = pile[0] || null;
        let otmp, k;

        if (!otop) {
            await There_ps("is nothing to hide under here.");
            u.uundetected = 0;
            return ECMD_OK_PS;
        }
        for (k = 0, otmp = otop;
             otmp && otmp.otyp === O.CORPSE
                  && touch_petrifies(mons[otmp.corpsenm]);
             otmp = pile[++k] || null)
            ct += otmp.quan;
        /* otmp will be Null iff the entire pile consists of 'trice corpses */
        if (!otmp && !Stone_resistance_ps()) {
            let corpse_name = cxname_ps(otop);

            /* for the plural case, we'll say "cockatrice corpses" or
               "chickatrice corpses" depending on the top of the pile
               even if both types are present */
            if (ct === 1)
                corpse_name = an(corpse_name);
            /* no need to check poly_when_stoned(); no hide-underers can
               turn into stone golems instead of becoming petrified */
            await pline(`Hiding under ${corpse_name}${plur(ct)} is a fatal mistake...`);
            const kbuf = `hiding under ${corpse_name}${plur(ct)}`;
            await instapetrify(kbuf);
            /* only reach here if life-saved */
            u.uundetected = 0;
            return ECMD_TIME;
        }
    }
    /* Planes of Air and Water */
    if (on_ceiling && !has_ceiling_ps(u.uz)) {
        await There_ps("is nowhere to hide above you.");
        u.uundetected = 0;
        return ECMD_OK_PS;
    }
    if ((is_hider(game.youmonst.data) && !Flying()) /* floor hider */
        && (Is_airlevel_ps(u.uz) || Is_waterlevel_ps(u.uz))) {
        await There_ps("is nowhere to hide beneath you.");
        u.uundetected = 0;
        return ECMD_OK_PS;
    }
    /* TODO? inhibit floor hiding at furniture locations, or
     * else make youhiding() give smarter messages at such spots.
     */

    if (u.uundetected || (ismimic && U_AP_TYPE() !== M_AP_NOTHING)) {
        await youhiding_ps(false, 1); /* "you are already hiding" */
        return ECMD_OK_PS;
    }

    if (ismimic) {
        /* should bring up a dialog "what would you like to imitate?" */
        game.youmonst.m_ap_type = M_AP_OBJECT;
        game.youmonst.mappearance = O.STRANGE_OBJECT;
    } else
        u.uundetected = 1;
    newsym(u.ux, u.uy);
    await youhiding_ps(false, 0); /* "you are now hiding" */
    return ECMD_TIME;
}

// C ref: polyself.c ugenocided()
/* has hero genocided self (role or race) */
export function ugenocided() {
    return !!((game.mvitals[game.urole.mnum].mvflags & G_GENOD)
              || (game.mvitals[game.urace.mnum].mvflags & G_GENOD));
}

// C ref: polyself.c udeadinside()
/* how hero feels "inside" after self-genocide of role or race */
export function udeadinside() {
    /* self-genocide used to always say "you feel dead inside" but that
       seems silly when you're polymorphed into something undead;
       monkilled() distinguishes between living (killed) and non (destroyed)
       for monster death message; we refine the nonliving aspect a bit */
    return !nonliving(game.youmonst.data)
             ? "dead"          /* living, including demons */
             : !weirdnonliving(game.youmonst.data)
                 ? "condemned" /* undead plus manes */
                 : "empty";    /* golems plus vortices */
}
