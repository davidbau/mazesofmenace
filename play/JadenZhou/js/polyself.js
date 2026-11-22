// polyself.js — polymorphing the hero.
// C ref: polyself.c
//
// Ported so far: set_uasmon(), float_vs_flight(), polysense().

import { game } from './gstate.js';
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
    const Upolyd = (u.mtimedone !== 0);
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
