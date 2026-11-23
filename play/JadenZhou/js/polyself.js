// polyself.js — polymorphing the hero.
// C ref: polyself.c
//
// Ported so far: set_uasmon(), float_vs_flight(), polysense(), polyself(),
// polymon(), polyman(), rehumanize(), break_armor(), drop_weapon(),
// uunstick(), skinback().  newman() is not ported yet.

import { game } from './gstate.js';
import { livelog_printf } from './display.js';
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
import {
    set_mon_data, is_vampire, resists_drli, dmgtype, dmgtype_fromattack,
    is_bat, perceives, telepathic, infravision, pm_invisible, can_teleport,
    control_teleport, is_floater, is_flyer, is_swimmer, passes_walls,
    regenerates, haseyes,
} from './mondata.js';
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
import { rn2, rnd, rn1, d } from './rng.js';
import { pline, You, Your, You_cant, You_feel, pline_The, newsym,
         see_monsters, canspotmon } from './display.js';
import { ACURR, exercise, ATTRMAX, ATTRMIN, adjabil, newhp,
         setuhpmax } from './attrib.js';
import { rndexp } from './potion.js';
import { newpw } from './exper.js';
import { newuhs } from './eat.js';
import { max_rank_sz } from './botl.js';
import { losehp, selftouch, set_utrap, reset_utrap } from './trap.js';
import { tty_getlin } from './wintty.js';
import { mungspaces } from './hacklib.js';
import { name_to_mon, your_race, is_vampshifter, is_were, is_orc, is_elf,
         is_dwarf, is_gnome, is_undead, poly_when_stoned,
         little_to_big } from './mondata.js';
import { pmname, Some_Monnam, Monnam } from './do_name.js';
import { an, the_unique_pm, vtense, yname, makeplural } from './objnam.js';
import { the, simpleonames, surface, cloak_simple_name,
         helm_simple_name } from './iactions.js';
import { Unaware } from './eat.js';
import { unmul } from './allmain.js';
import { make_glib, set_mimic_blocking } from './potion.js';
import { golemhp, is_pool, is_lava } from './makemon.js';
import { find_ac } from './u_init.js';
import { set_ustuck } from './uhitm.js';
import { spoteffects, nomul } from './hack.js';
import { encumber_msg } from './pickup.js';
import { retouch_equipment } from './artifact.js';
import { character_race } from './role.js';
import { dropx, canletgo } from './do.js';
import { donning, cancel_don, Armor_gone, Cloak_off, Helmet_off,
         Gloves_off, Shield_off, Boots_off, Blindf_off } from './do_wear.js';
import { useup } from './invent.js';
import { setworn, racial_exception } from './worn.js';
import { uwepgone, uswapwepgone, untwoweapon } from './wield.js';
import { weapon_descr } from './insight.js';
import { sticks } from './engrave.js';

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
function nohands(ptr) { return (ptr.mflags1 & M.M1_NOHANDS) !== 0; }
function verysmall(ptr) { return ptr.msize < M.MZ_SMALL; }
function bigmonst(ptr) { return ptr.msize >= M.MZ_LARGE; }
function humanoid(ptr) { return (ptr.mflags1 & M.M1_HUMANOID) !== 0; }
function slithy(ptr) { return (ptr.mflags1 & M.M1_SLITHY) !== 0; }
function has_head(ptr) { return (ptr.mflags1 & M.M1_NOHEAD) === 0; }
function amorphous(ptr) { return (ptr.mflags1 & M.M1_AMORPHOUS) !== 0; }
function unsolid(ptr) { return (ptr.mflags1 & M.M1_UNSOLID) !== 0; }
function noncorporeal(ptr) { return ptr.mlet === M.S_GHOST; }
function hides_under(ptr) { return (ptr.mflags1 & M.M1_CONCEAL) !== 0; }
function is_hider(ptr) { return (ptr.mflags1 & M.M1_HIDE) !== 0; }
function lays_eggs(ptr) { return (ptr.mflags1 & M.M1_OVIPAROUS) !== 0; }
function polyok(ptr) { return (ptr.mflags2 & M.M2_NOPOLY) === 0; }
function strongmonst(ptr) { return (ptr.mflags2 & M.M2_STRONG) !== 0; }
function is_giant(ptr) { return (ptr.mflags2 & M.M2_GIANT) !== 0; }
function is_male(ptr) { return (ptr.mflags2 & M.M2_MALE) !== 0; }
function is_female(ptr) { return (ptr.mflags2 & M.M2_FEMALE) !== 0; }
function is_neuter(ptr) { return (ptr.mflags2 & M.M2_NEUTER) !== 0; }
function type_is_pname(ptr) { return (ptr.mflags2 & M.M2_PNAME) !== 0; }
function likes_gems(ptr) { return (ptr.mflags2 & M.M2_JEWELS) !== 0; }
function is_golem(ptr) { return ptr.mlet === M.S_GOLEM; }
function cantwield(ptr) { return nohands(ptr) || verysmall(ptr); }
function could_twoweap(ptr) {
    return ((ptr.mattk[0].aatyp === M.AT_WEAP ? 1 : 0)
            + (ptr.mattk[1].aatyp === M.AT_WEAP ? 1 : 0)
            + (ptr.mattk[2].aatyp === M.AT_WEAP ? 1 : 0)) > 1;
}
function is_whirly(ptr) {
    return ptr.mlet === M.S_VORTEX || ptr === mons[M.PM_AIR_ELEMENTAL];
}
function flaming(ptr) {
    return ptr === mons[M.PM_FIRE_VORTEX] || ptr === mons[M.PM_FLAMING_SPHERE]
        || ptr === mons[M.PM_FIRE_ELEMENTAL] || ptr === mons[M.PM_SALAMANDER];
}
function webmaker(ptr) {
    return ptr === mons[M.PM_CAVE_SPIDER] || ptr === mons[M.PM_GIANT_SPIDER];
}
function likes_lava(ptr) {
    return ptr === mons[M.PM_FIRE_ELEMENTAL] || ptr === mons[M.PM_SALAMANDER];
}
function is_unicorn(ptr) { return ptr.mlet === M.S_UNICORN && likes_gems(ptr); }
function is_mind_flayer(ptr) {
    return ptr === mons[M.PM_MIND_FLAYER]
        || ptr === mons[M.PM_MASTER_MIND_FLAYER];
}
// C ref: mondata.h is_home_elemental() -- only true on the elemental planes
function is_home_elemental(ptr) {
    if (ptr.mlet !== M.S_ELEMENTAL)
        return false;
    if (In_endgame(game.u.uz))
        throw new Error('is_home_elemental(): elemental planes not ported yet');
    return false;
}
function is_placeholder(ptr) {
    return ptr === mons[M.PM_ORC] || ptr === mons[M.PM_GIANT]
        || ptr === mons[M.PM_ELF] || ptr === mons[M.PM_HUMAN];
}
function attacktype(ptr, atyp) {
    return ptr.mattk.some(a => a.aatyp === atyp);
}
function can_breathe(ptr) { return attacktype(ptr, M.AT_BREA); }
// C ref: mondata.h emits_light()
function emits_light(ptr) {
    return (ptr.mlet === M.S_LIGHT || ptr === mons[M.PM_FLAMING_SPHERE]
            || ptr === mons[M.PM_SHOCKING_SPHERE]
            || ptr === mons[M.PM_BABY_GOLD_DRAGON]
            || ptr === mons[M.PM_FIRE_VORTEX])
        ? 1
        : (ptr === mons[M.PM_FIRE_ELEMENTAL]
           || ptr === mons[M.PM_GOLD_DRAGON]) ? 1 : 0;
}
// C ref: mondata.c sliparm()
/* creature will slide out of armor */
function sliparm(ptr) {
    return (is_whirly(ptr) || ptr.msize <= M.MZ_SMALL
            || noncorporeal(ptr));
}
// C ref: mondata.c breakarm()
/* creature will break out of armor */
function breakarm(ptr) {
    if (sliparm(ptr))
        return false;

    return (bigmonst(ptr)
            || (ptr.msize > M.MZ_SMALL && !humanoid(ptr))
            /* special cases of humanoids that cannot wear suits */
            || ptr === mons[M.PM_MARILITH]
            || ptr === mons[M.PM_WINGED_GARGOYLE]);
}
// C ref: mondata.c num_horns()
function num_horns(ptr) {
    switch (mons.indexOf(ptr)) { /* monsndx(ptr) */
    case M.PM_HORNED_DEVIL: /* ? "more than one" */
    case M.PM_MINOTAUR:
    case M.PM_ASMODEUS:
    case M.PM_BALROG:
        return 2;
    case M.PM_WHITE_UNICORN:
    case M.PM_GRAY_UNICORN:
    case M.PM_BLACK_UNICORN:
    case M.PM_KI_RIN:
        return 1;
    default:
        break;
    }
    return 0;
}
function has_horns(ptr) { return num_horns(ptr) > 0; }
/* C ref: obj.h is_flimsy(), is_sword(), WrappingAllowed(),
   Is_dragon_armor() */
function is_flimsy(otmp) {
    return O.objects[otmp.otyp].oc_material <= O.LEATHER
        || otmp.otyp === O.RUBBER_HOSE;
}
function is_sword(otmp) {
    return otmp.oclass === O.WEAPON_CLASS
        && O.objects[otmp.otyp].oc_skill >= P_SHORT_SWORD
        && O.objects[otmp.otyp].oc_skill <= P_SABER;
}
function WrappingAllowed(mptr) {
    return humanoid(mptr) && mptr.msize >= M.MZ_SMALL
        && mptr.msize <= M.MZ_HUGE
        && !noncorporeal(mptr) && mptr.mlet !== M.S_CENTAUR
        && mptr !== mons[M.PM_WINGED_GARGOYLE] && mptr !== mons[M.PM_MARILITH];
}
function Is_dragon_armor(obj) {
    return (obj.otyp >= O.GRAY_DRAGON_SCALES
            && obj.otyp <= O.YELLOW_DRAGON_SCALES)
        || (obj.otyp >= O.GRAY_DRAGON_SCALE_MAIL
            && obj.otyp <= O.YELLOW_DRAGON_SCALE_MAIL);
}
/* C ref: youprop.h */
function uprop_on(p) {
    const pr = game.u.uprops[p];
    return !!(pr.intrinsic || pr.extrinsic);
}
function Upolyd() { return game.u.umonnum !== game.u.umonster; }
/* Blind: (HBlinded || EBlinded) && !BBlinded */
function Blind() {
    const p = game.u.uprops[BLINDED];
    return !!((p.intrinsic || p.extrinsic) && !p.blocked);
}
function Polymorph_control() { return uprop_on(POLYMORPH_CONTROL); }
function Unchanging() { return uprop_on(UNCHANGING); }
function Stunned() { return uprop_on(STUNNED); }
function Stoned() { return uprop_on(STONED); }
function Slimed() { return uprop_on(SLIMED); }
function Strangled() { return uprop_on(STRANGLED); }
function Punished() { return !!game.uball; }
function Flying() {
    const fly = game.u.uprops[FLYING];
    return !!((fly.intrinsic || fly.extrinsic
               || (game.u.usteed && is_flyer(game.u.usteed.data)))
              && !fly.blocked);
}
function plur(x) { return x === 1 ? "" : "s"; }
/* C ref: dbridge.c is_pool_or_lava() */
function is_pool_or_lava(x, y) {
    return is_pool(x, y) || is_lava(x, y);
}
const no_longer_petrify_resistant =
    "You no longer seem to be petrify-resistant. You";

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

    await pline(fmt.replace('%s', arg)); /* urgent_pline() */
    /* check whether player foolishly genocided self while poly'd */
    if (game.mvitals && (game.mvitals[u.umonster]?.mvflags & G_GENOD))
        throw new Error('polyman(): self-genocide while polymorphed not ported yet');

    if (uprop_on(SEE_INVIS) !== had_see_invis)
        set_mimic_blocking(); /* See_invisible just toggled */

    if (u.twoweap && !could_twoweap(youmonst.data))
        await untwoweapon();

    if (u.utrap && u.utraptype === TT_PIT) {
        set_utrap(rn1(6, 2), TT_PIT); /* time to escape resets */
    }
    if (was_blind && !Blind()) /* reverting from eyeless */
        throw new Error('polyman(): set_itimeout(&HBlinded)/make_blinded() not ported yet');
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
            exercise(A_CON, false);
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

    if (monsterpoly && isvamp)
        throw new Error('polyself(): vampire shapeshift (do_vampyr) not ported yet');

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
            if (mntmp < LOW_PM) {
                /* by_class: */
                throw new Error('polyself(): name_to_monclass()/mkclass_poly() not ported yet');
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
            } else if (iswere) {
                throw new Error('polyself(): lycanthrope shift (do_shift) not ported yet');
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
                pm_name = pmname(mons[mntmp], game.flags.female ? FEMALE : MALE);
                if (the_unique_pm(mons[mntmp]))
                    pm_name = the(pm_name);
                else if (!type_is_pname(mons[mntmp]))
                    pm_name = an(pm_name);
                await You_cant(`polymorph into ${pm_name}.`);
            } else
                break;
        } while (--tryct > 0);

        if (!tryct)
            await pline(thats_enough_tries);
        /* allow skin merging, even when polymorph is controlled */
        if (draconian)
            throw new Error('polyself(): dragon armor merge (do_merge) not ported yet');
        if (isvamp)
            throw new Error('polyself(): vampire shapeshift (do_vampyr) not ported yet');
    } else if (draconian || iswere || isvamp) {
        /* special changes that don't require polyok() */
        throw new Error('polyself(): draconian/lycanthrope/vampire polymorph not ported yet');
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

/* the 'made_change:' tail of polyself() */
async function polyself_made_change(old_light) {
    const new_light = emits_light(game.youmonst.data);
    if (old_light !== new_light) {
        /* del_light_source()/new_light_source() for LS_MONSTER */
        throw new Error('polyself(): hero light source change not ported yet');
    }
}

// C ref: hacklib.c rounddiv()
/* round x/y to nearest integer */
function rounddiv(x, y) {
    let r, m;
    let divsgn = 1;

    if (y === 0)
        throw new Error('division by zero in rounddiv'); /* panic() */
    else if (y < 0) {
        divsgn = -divsgn;
        y = -y;
    }
    if (x < 0) {
        divsgn = -divsgn;
        x = -x;
    }
    r = Math.trunc(x / y);
    m = x % y;
    if (2 * m >= y)
        r++;

    return divsgn * r;
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

    oldlvl = u.ulevel;
    newlvl = oldlvl + rn1(5, -2);     /* new = old + {-2,-1,0,+1,+2} */
    if (newlvl > 127 || newlvl < 1) { /* level went below 0? */
        /* goto dead; old level is still intact (in case of lifesaving) */
        throw new Error('newman(): "new form doesn\'t seem healthy enough" death not ported yet');
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
        throw new Error('newman(): make_sick() not ported yet');
    if (Stoned())
        throw new Error('newman(): make_stoned() not ported yet');
    if (u.uhp <= 0) {
        if (Polymorph_control()) { /* even when Stunned || Unaware */
            if (u.uhp <= 0)
                u.uhp = 1;
        } else {
            throw new Error('newman(): "new form doesn\'t seem healthy enough" death not ported yet');
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

    if (Slimed())
        throw new Error('newman(): "still slime on you" make_slimed() not ported yet');

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
    const was_expelled = false;
    let mlvl, newMaxStr;

    if (game.mvitals && (game.mvitals[mntmp]?.mvflags & G_GENOD)) { /* allow G_EXTINCT */
        await You_feel(`rather ${pmname(mons[mntmp], game.flags.female ? FEMALE : MALE)}-ish.`);
        exercise(A_WIS, true);
        return 0;
    }

    /* KMH, conduct */
    if (!u.uconduct.polyselfs++)
        livelog_printf(LL_CONDUCT,
                       `changed form for the first time, becoming ${
                           an(pmname(mons[mntmp], game.flags.female ? FEMALE : MALE))}`);

    /* exercise used to be at the very end but only Wis was affected
       there since the polymorph was always in effect by then */
    exercise(A_CON, false);
    exercise(A_WIS, true);

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

    if (Stoned() && poly_when_stoned(mons[mntmp]))
        throw new Error('polymon(): poly_when_stoned make_stoned() not ported yet');

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

    if (uprop_on(STONE_RES) && Stoned()) /* parnes@eniac.seas.upenn.edu */
        throw new Error('polymon(): make_stoned() not ported yet');
    if (uprop_on(SICK_RES) && uprop_on(SICK))
        throw new Error('polymon(): make_sick() not ported yet');
    if (Slimed()) {
        if (flaming(youmonst.data) || mntmp === M.PM_GREEN_SLIME)
            throw new Error('polymon(): make_slimed() not ported yet');
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
        throw new Error('polymon(): hideunder() for the hero not ported yet');

    if (u.utrap && u.utraptype === TT_PIT) {
        set_utrap(rn1(6, 2), TT_PIT); /* time to escape resets */
    }
    if (was_blind && !Blind()) /* previous form was eyeless */
        throw new Error('polymon(): set_itimeout(&HBlinded)/make_blinded() not ported yet');
    newsym(u.ux, u.uy); /* Change symbol */

    /* you now know what an egg of your type looks like; [moved from
       below in case expels() -> spoteffects() drops hero onto any eggs] */
    if (lays_eggs(youmonst.data)) {
        learn_egg_type(u.umonnum);
        /* make queen bees recognize killer bee eggs */
        learn_egg_type(egg_type_from_parent(u.umonnum, true));
    }

    if (u.uswallow) {
        throw new Error('polymon(): polymorphing while engulfed (expels()) not ported yet');
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

    if (u.usteed)
        throw new Error('polymon(): polymorphing while riding (can_ride()/dismount_steed()) not ported yet');

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
        throw new Error('polymon(): freeing hero from floor/buried ball not ported yet');
    } else if (likes_lava(youmonst.data) && u.utrap
               && u.utraptype === TT_LAVA) {
        throw new Error('polymon(): "lava now feels soothing" not ported yet');
    }
    if (amorphous(youmonst.data) || is_whirly(youmonst.data)
        || unsolid(youmonst.data)) {
        if (Punished() || (u.utrap && u.utraptype === TT_BURIEDBALL))
            throw new Error('polymon(): slipping out of the chain not ported yet');
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
            throw new Error('polymon(): "#sit to lay an egg" hint (eggs_in_water()) not ported yet');
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
                throw new Error('break_armor(): end_burn() not ported yet');

            await You("break out of your armor!");
            exercise(A_STR, false);
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
    if (Unchanging())
        throw new Error('rehumanize(): Unchanging not ported yet');

    /*
     * Right now, dying while being a shifted vampire (bat, cloud, wolf)
     * reverts to human rather than to vampire.
     */

    if (emits_light(game.youmonst.data))
        throw new Error('rehumanize(): del_light_source() not ported yet');
    await polyman("You return to %s form!", game.urace.adj);

    if (u.uhp < 1)
        throw new Error('rehumanize(): "old form was not healthy enough" not ported yet');
    nomul(0);

    game.disp_botl = true;
    game.vision_full_recalc = 1;
    await encumber_msg();
    /* update_inventory(): no perm_invent */
    if (was_flying && !Flying() && u.usteed)
        throw new Error('rehumanize(): steed returns gently not ported yet');
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
        if (game.uskin.lamplit) /* arti_light_radius()/artifact_light() */
            throw new Error('skinback(): maybe_adjust_light() not ported yet');
        if (!silently)
            await Your("skin returns to its original form.");
        game.uarm = game.uskin;
        game.uskin = null;
        /* undo save/restore hack */
        game.uarm.owornmask &= ~I_SPECIAL;
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
function learn_egg_type(mnum) {
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

    /* getdir(), then ubreatheu() or ubuzz(BZ_U_BREATH(...)) */
    throw new Error('dobreathe(): getdir()/ubuzz() of a hero breath weapon not ported yet');
}
