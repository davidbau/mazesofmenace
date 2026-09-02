// zap.js — wands, spells and the rays they throw.
// C ref: src/zap.c
//
// Only obj_resists() is here so far. It is the first thing needed from this
// file because meatmetal() calls it before eating anything, which puts its
// rn2(100) into the stream ahead of the next monster's turn.

import { POLY_NOFLAGS } from './const.js';
import { Unchanging } from './youprop.js';
import { rnd_hallublast } from './mthrowu.js';
import { disguised_as_non_mon } from './uhitm.js';
import { uhim } from './mhitu.js';
import { ansimpleoname, bare_artifactname } from './objnam.js';
import { Is_box } from './obj.js';
import { boxlock } from './lock.js';
import { in_rooms } from './hack.js';
import { CORPSTAT_HISTORIC } from './const.js';
import { Role_if, adjalign } from './attrib.js';
import { does_block } from './vision.js';
import { sokoban_guilt } from './trap.js';
import { breakobj } from './dothrow.js';
import { shkname } from './shknam.js';
import { costly_spot, billable } from './shk.js';
import { game } from './gstate.js';
import { isok, s_suffix } from './hacklib.js';
import { is_lava, is_pool, m_at, t_at } from './mon.js';
import { cansee, couldsee, block_point, unblock_point, recalc_block_point,
         vision_recalc } from './vision.js';
import { display_cmap_at, display_object_at, flush_screen, map_invisible,
         newsym, shieldeff, temporary_object_glyph,
         unmap_invisible, bot, docrt } from './display.js';
import { closed_door } from './cmd.js';
import { is_drawbridge_wall, is_ice, is_moat } from './dbridge.js';

import { STONE, WATER, LAVAWALL, IRONBARS, IS_SINK, POOL, MOAT, WEB, u_at,
         THROWN_WEAPON, KICKED_WEAPON, ZAPPED_WAND, FLASHED_LIGHT, M_AP_TYPE,
         M_AP_NOTHING, M_AP_MONSTER, M_AP_OBJECT, ICE, DRAWBRIDGE_UP,
         DRAWBRIDGE_DOWN, DB_ICE, DB_UNDER, DB_FLOOR, ICED_POOL, ICED_MOAT,
         ROOM, PIT, VWALL, HWALL, IS_WALL, IS_WATERWALL,
         TT_LAVA, TT_INFLOOR,
         Is_airlevel, Is_waterlevel, st_all, plur,
         ONAME_WISH, ONAME_KNOW_ARTI, IS_ROOM, STRAT_WAITMASK,
         ZAP_POS, W_ARM, W_ARMS, W_ARMG, W_ARMH, W_WEP, W_AMUL, HI_ZAP,
         W_RING, W_ARMOR, W_ACCESSORY, W_ART,
         A_STR, A_CON, A_CHA, A_DEX, A_INT, M_SEEN_MAGR,
         KILLED_BY_AN, KILLED_BY, NO_KILLER_PREFIX,
         LEVITATION, FLYING, DOOR, SDOOR,
         D_NODOOR, D_BROKEN, D_ISOPEN, D_CLOSED, D_LOCKED, D_TRAPPED,
         IS_DOOR, IS_DRAWBRIDGE, IS_FURNITURE, SCORR, SHOPBASE, NC_SHOW_MSG,
         NC_VIA_WAND_OR_SPELL, NON_PM, HEADSTONE, HEAD,
         XKILL_NOCORPSE, BEAR_TRAP, LANDMINE, MAGIC_PORTAL, STATUE_TRAP,
         VIBRATING_SQUARE, HOLE, TRAPDOOR, ROCKTRAP, is_pit,
         NO_TRAP_FLAGS, FORCETRAP, ENGRAVE, FACE, FOOT, LEG,
         COST_DRAIN, TIMEOUT, INTRINSIC,
         ANIMATE_SPELL, In_sokoban, Upolyd } from './const.js';
import { mungspaces } from './hacklib.js';
import { display_binventory, hands_obj, hold_another_object } from './invent.js';
import { force_decor, u_safe_from_fatal_corpse } from './pickup.js';
import { an, aobjnam, doname } from './objnam.js';
import { artifact_origin, defends, defends_when_carried } from './artifact.js';
import { tty_create_nhwindow, tty_putstr, tty_display_nhwindow,
         tty_destroy_nhwindow, NHW_TEXT } from './tty/wintty.js';
import { OCLASSES } from './objects_data.js';
import { DEADMONSTER, is_vampshifter } from './monst.js';
import { killed, monkilled, seemimic, shieldeff_mon, wakeup,
         wake_nearto, healmon, newcham, validspecmon, xkilled,
         set_ustuck, unstuck } from './mon.js';
import { ONAMES } from './objects_data.js';
import { rn2, rnd, d } from './rng.js';
import { is_rider, create_critters } from './makemon.js';
import { OBJ_INVENT, OBJ_MINVENT, OBJ_BURIED, OBJ_CONTAINED, BURIED_TOO, CONTAINED_TOO } from './const.js';
import { getobj, GETOBJ_SUGGEST, GETOBJ_EXCLUDE, update_inventory,
         stackobj } from './invent.js';
import { getdir } from './cmd.js';
import { attach_egg_hatch_timeout, fall_asleep,
         MELT_ICE_AWAY, peek_timer, start_timer, stop_timer,
         REVIVE_MON, ROT_CORPSE, TIMER_LEVEL, TIMER_OBJECT }
    from './timeout.js';
import { healup, make_stunned, potionbreathe } from './potion.js';
import { cvt_sdoor_to_door, findit } from './detect.js';
import { readobjnam } from './objnam.js';
import { getlin } from './cmd.js';
import { prinv, reorder_invent, addinv } from './invent.js';
import { makeknown, observe_object } from './o_init.js';
import { losexp, more_experienced } from './exper.js';
import { encumber_msg, exercise, Fast, Very_fast } from './attrib.js';
import { A_WIS } from './const.js';
import { rn1 } from './rng.js';
import { livelog_add, Norep, pline_The, You, Your, You_feel,
         You_hear } from './pline.js';
import { pline } from './display.js';
import { An, The, distant_name, vtense, xname, Yname2, yname, makeplural,
         Tobjnam, Yobjnam2, otense } from './objnam.js';
import { Monnam, mon_nam, noit_mon_nam, hliquid } from './do_name.js';
import { canseemon, canspotmon } from './display.js';
import { engulfing_u } from './const.js';
import { nothing_happens, ECMD_OK, ECMD_TIME, ECMD_CANCEL, NODIR, IMMEDIATE,
         OBJ_FLOOR } from './const.js';
import { splitobj, mkobj, mksobj, mksobj_at, place_object, rnd_class,
         set_corpsenm,
         dead_species, erosion_matters, is_weptool, unbless,
         uncurse, obj_ice_effects } from './mkobj.js';
import { delobj } from './mon.js';
import { obj_extract_self, sobj_at, useup, useupall, useupf, weight }
    from './invent.js';
import { closeholdingtrap, is_flammable, is_rottable, burnarmor,
         activate_statue_trap, animate_statue, deltrap, dotrap, ignite_items,
         openholdingtrap, trapname } from './trap.js';
import { Is_container, is_metallic } from './obj.js';
import { MATERIALS } from './objects_data.js';
import { ATTKS, MONSYMS, PMNAMES } from './monst_data.js';
import { breathless, defended, haseyes, resists_blnd, resists_blnd_by_arti,
         resists_cold,
         resists_elec, resists_fire, resists_magm, resists_sleep,
         nohands, nonliving, is_demon, is_undead, carnivorous, digests,
         sticks, is_swimmer }
    from './mondata.js';
import { find_mac } from './worn.js';
import { Reflecting, Sleep_resistance, Fire_resistance, Cold_resistance,
         Shock_resistance, Blind, Deaf, Unaware, Hallucination,
         Invis, See_invisible, Teleport_control,
         Underwater, Levitation, Antimagic, Passes_walls } from './youprop.js';
import { cmap_names } from './drawing_data.js';
import { CLR_ORANGE, CLR_WHITE, CLR_BLACK, CLR_GREEN,
         CLR_YELLOW } from './terminal.js';
import { create_gas_cloud } from './region.js';
import { show_transient_light, transient_light_cleanup } from './light.js';
import { boolean_option } from './options.js';
import { finish_meating } from './dogmove.js';
import { name_to_monplus } from './mondata.js';
import { del_engr, engr_at, make_engr_at, random_engraving, rloc_engr,
         wipe_engr_at } from './engrave.js';
import { ceiling, surface } from './dungeon.js';
import { body_part } from './polyself.js';
import { find_ac, hard_helmet } from './do_wear.js';
import { tele } from './teleport.js';
import { ustatusline, enlightenment } from './insight.js';
import { MAGICENLIGHTENMENT, ENL_GAMEINPROGRESS } from './const.js';
import { display_nhwindow_message } from './display.js';
import { waterbody_name } from './pager.js';

/* include/objclass.h:200/:201/:204 — local copies of the material
   predicates trap.js also carries (they are header macros in C). */
const is_rustprone_zap = (o) =>
    game.objects[o.otyp].oc_material === MATERIALS.IRON;
const is_crackable_zap = (o) =>
    game.objects[o.otyp].oc_material === MATERIALS.GLASS
    && o.oclass === OCLASSES.ARMOR_CLASS;
const is_corrodeable_zap = (o) =>
    game.objects[o.otyp].oc_material === MATERIALS.COPPER
    || game.objects[o.otyp].oc_material === MATERIALS.IRON;
const is_poisonable_zap = (o) =>
    o.oclass === OCLASSES.WEAPON_CLASS
    && game.objects[o.otyp].oc_dir !== 0 /* piercing weapons */;

// src/zap.c:1459 obj_resists() — does this object survive being destroyed?
//
// ochance/achance are PERCENTAGES, and the artifact one is checked against the
// same single draw, so the rn2(100) is spent whether or not the object is an
// artifact. Skipping the draw for ordinary objects would desynchronise the
// stream even when the answer happened to be right.
export function obj_resists(obj, ochance, achance) {
    if (obj.otyp === ONAMES.AMULET_OF_YENDOR
        || obj.otyp === ONAMES.SPE_BOOK_OF_THE_DEAD
        || obj.otyp === ONAMES.CANDELABRUM_OF_INVOCATION
        || obj.otyp === ONAMES.BELL_OF_OPENING
        || (obj.otyp === ONAMES.CORPSE && is_rider(game.mons[obj.corpsenm]))) {
        return true;
    } else {
        const chance = rn2(100);

        return chance < (obj.oartifact ? achance : ochance);
    }
}

// src/zap.c:1382 drain_item(). Remove one positive charge or enchantment and
// immediately adjust every derived effect supplied by a worn hero item.
export async function drain_item(obj, by_you) {
    const oclass = game.objects[obj?.otyp];
    if (!obj
        || (!oclass?.oc_charged
            && obj.oclass !== OCLASSES.WEAPON_CLASS
            && obj.oclass !== OCLASSES.ARMOR_CLASS
            && !is_weptool(obj))
        || (obj.spe | 0) <= 0)
        return false;
    if (defends(ATTKS.AD_DRLI, obj)
        || defends_when_carried(ATTKS.AD_DRLI, obj)
        || obj_resists(obj, 10, 90))
        return false;

    if (by_you) {
        const { costly_alteration } = await import('./shk.js');
        await costly_alteration(obj, COST_DRAIN);
    }

    obj.spe--;
    const u = game.u;
    const wornmask = obj.owornmask | 0;
    const uRing = obj === u.uleft || obj === u.uright;
    const abon = (u.abon ||= {}).a
        ||= new Array(u.acurr?.a?.length || 6).fill(0);

    switch (obj.otyp) {
    case ONAMES.RIN_GAIN_STRENGTH:
        if ((wornmask & W_RING) && uRing) {
            abon[A_STR]--;
            (game.disp ||= {}).botl = true;
        }
        break;
    case ONAMES.RIN_GAIN_CONSTITUTION:
        if ((wornmask & W_RING) && uRing) {
            abon[A_CON]--;
            (game.disp ||= {}).botl = true;
        }
        break;
    case ONAMES.RIN_ADORNMENT:
        if ((wornmask & W_RING) && uRing) {
            abon[A_CHA]--;
            (game.disp ||= {}).botl = true;
        }
        break;
    case ONAMES.RIN_INCREASE_ACCURACY:
        if ((wornmask & W_RING) && uRing)
            u.uhitinc = (u.uhitinc || 0) - 1;
        break;
    case ONAMES.RIN_INCREASE_DAMAGE:
        if ((wornmask & W_RING) && uRing)
            u.udaminc = (u.udaminc || 0) - 1;
        break;
    case ONAMES.RIN_PROTECTION:
        if (uRing) {
            (game.disp ||= {}).botl = true;
        }
        break;
    case ONAMES.HELM_OF_BRILLIANCE:
        if ((wornmask & W_ARMH) && obj === u.uarmh) {
            abon[A_INT]--;
            abon[A_WIS]--;
            (game.disp ||= {}).botl = true;
        }
        break;
    case ONAMES.GAUNTLETS_OF_DEXTERITY:
        if ((wornmask & W_ARMG) && obj === u.uarmg) {
            abon[A_DEX]--;
            (game.disp ||= {}).botl = true;
        }
        break;
    default:
        break;
    }
    if (game.disp?.botl)
        await bot();
    if ((game.invent || []).includes(obj))
        update_inventory();
    return true;
}

// src/zap.c:3547 exclam() — the punctuation that ends a hit message, and it
// encodes the damage: "?" for a negative force, "." for 4 or less, "!" above
// that. force == 0 happens with e.g. a sleep ray.
export function exclam(force) {
    return (force < 0) ? '?' : (force <= 4) ? '.' : '!';
}

// src/zap.c:6100 resist() — the magic-resistance saving throw.
//
// One draw, and its MODULUS is computed rather than constant:
//
//     resisted = rn2(100 + alev - dlev) < mtmp->data->mr;
//
// alev comes from the item class attacking (a wand is 12, an instrument or
// artifact 10, a scroll 9, a potion 6, a ring 5, a spell your own level) and
// dlev from the monster, clamped to 50 above and raised to 1 below. So the
// span of the roll differs per call and rn2's argument is NOT interchangeable
// with a fixed 100 -- getting alev wrong changes the stream, not just the
// odds.
//
// The fake-player shortcut returns BEFORE the draw, so a Conflict ring test
// against an mplayer costs nothing.
//
// Damage halving is (damage + 1) / 2, rounding UP, so a resisted 1 point
// still does 1.
//
// shieldeff_mon, monkilled and the m_using distinction are recorded; killed
// is real.
export function resist(mtmp, oclass, damage, tell) {
    let alev, dlev;

    /* fake players always pass resistance test against Conflict */
    if (oclass === OCLASSES.RING_CLASS && !damage && !tell
        && note_zap_unported('resist:is_mplayer'))
        return 1;                       /* NO DRAW on this path */

    /* attack level */
    switch (oclass) {
    case OCLASSES.WAND_CLASS:   alev = 12; break;
    case OCLASSES.TOOL_CLASS:   alev = 10; break;   /* instrument */
    case OCLASSES.WEAPON_CLASS: alev = 10; break;   /* artifact */
    case OCLASSES.SCROLL_CLASS: alev = 9;  break;
    case OCLASSES.POTION_CLASS: alev = 6;  break;
    case OCLASSES.RING_CLASS:   alev = 5;  break;
    default:                    alev = game.u.ulevel; break;   /* spell */
    }
    /* defense level */
    dlev = mtmp.m_lev;
    if (dlev > 50)
        dlev = 50;
    else if (dlev < 1)
        dlev = note_zap_unported('resist:is_mplayer2') ? game.u.ulevel : 1;

    const resisted = rn2(100 + alev - dlev) < game.mons[mtmp.mnum].mr;
    if (resisted) {
        if (tell)
            shieldeff_mon(mtmp);
        damage = ((damage + 1) / 2) | 0;
    }

    if (damage) {
        mtmp.mhp -= damage;
        if (DEADMONSTER(mtmp)) {
            if (game.m_using)
                note_zap_unported('resist:monkilled');
            else
                killed(mtmp);
        }
    }
    return resisted;
}

const note_zap_unported = (w) => {
    (game.unported ||= new Set()).add('zap:' + w);
    return false;
};

function note_unported_zap(what) {
    (game.unported ||= new Set()).add('zap:' + what);
}

// src/zap.c:2618 zap_ok() — getobj callback for 'z'.
export function zap_ok(obj) {
    if (obj && obj.oclass === OCLASSES.WAND_CLASS)
        return GETOBJ_SUGGEST;
    return GETOBJ_EXCLUDE;
}

// src/zap.c:2514 zappable() — does the wand have a charge to spend?
//
// The wrest roll rn2(WAND_WREST_CHANCE=121) fires ONLY at exactly zero
// charges; a wand with charges pays none.
export async function zappable(wand) {
    if (wand.spe < 0 || (wand.spe === 0 && rn2(121)))
        return 0;
    if (wand.spe === 0)
        await You("wrest one last charge from the worn-out wand.");
    wand.spe--;
    return 1;
}

export function increment_intrinsic_timeout(key, amount) {
    const intrinsic = game.u.intrinsic ||= {};
    const current = intrinsic[key] | 0;
    const timeout = Math.max(0, Math.min(TIMEOUT,
        (current & TIMEOUT) + amount));
    intrinsic[key] = (current & ~TIMEOUT) | timeout;
}

// src/zap.c:1239 cancel_item(). Cancellation removes enchantment and magic
// from exposed inventory while preserving the few explicitly immune items.
function cancel_item(obj) {
    const otyp = obj.otyp;
    const wornmask = obj.owornmask | 0;
    const abon = (game.u.abon ||= {}).a
        ||= new Array(game.u.acurr?.a?.length || 6).fill(0);

    if ((game.invent || []).includes(obj)) {
        switch (otyp) {
        case ONAMES.RIN_GAIN_STRENGTH:
            if (wornmask & W_RING) {
                abon[A_STR] -= obj.spe | 0;
                (game.disp ||= {}).botl = true;
            }
            break;
        case ONAMES.RIN_GAIN_CONSTITUTION:
            if (wornmask & W_RING) {
                abon[A_CON] -= obj.spe | 0;
                (game.disp ||= {}).botl = true;
            }
            break;
        case ONAMES.RIN_ADORNMENT:
            if (wornmask & W_RING) {
                abon[A_CHA] -= obj.spe | 0;
                (game.disp ||= {}).botl = true;
            }
            break;
        case ONAMES.RIN_INCREASE_ACCURACY:
            if (wornmask & W_RING)
                game.u.uhitinc = (game.u.uhitinc || 0) - (obj.spe | 0);
            break;
        case ONAMES.RIN_INCREASE_DAMAGE:
            if (wornmask & W_RING)
                game.u.udaminc = (game.u.udaminc || 0) - (obj.spe | 0);
            break;
        case ONAMES.RIN_PROTECTION:
            if (wornmask & W_RING)
                (game.disp ||= {}).botl = true;
            break;
        case ONAMES.GAUNTLETS_OF_DEXTERITY:
            if (wornmask & W_ARMG) abon[A_DEX] -= obj.spe | 0;
            break;
        case ONAMES.HELM_OF_BRILLIANCE:
            if (wornmask & W_ARMH) {
                abon[A_INT] -= obj.spe | 0;
                abon[A_WIS] -= obj.spe | 0;
            }
            break;
        default:
            break;
        }
        if (wornmask & W_ARMOR)
            (game.disp ||= {}).botl = true;
    }

    const cancellable = !!game.objects[otyp].oc_magic
        || ((obj.spe | 0) && (obj.oclass === OCLASSES.ARMOR_CLASS
                              || obj.oclass === OCLASSES.WEAPON_CLASS
                              || is_weptool(obj, game.objects)))
        || otyp === ONAMES.POT_ACID || otyp === ONAMES.POT_SICKNESS
        || (otyp === ONAMES.POT_WATER && (obj.blessed || obj.cursed))
        || otyp === ONAMES.SPE_NOVEL;

    if (cancellable) {
        const cancelledSpe = obj.oclass === OCLASSES.WAND_CLASS
            || otyp === ONAMES.CRYSTAL_BALL ? -1 : 0;
        if (obj.spe !== cancelledSpe
            && otyp !== ONAMES.WAN_CANCELLATION
            && otyp !== ONAMES.MAGIC_LAMP
            && otyp !== ONAMES.CANDELABRUM_OF_INVOCATION)
            obj.spe = cancelledSpe;

        switch (obj.oclass) {
        case OCLASSES.SCROLL_CLASS:
            obj.otyp = ONAMES.SCR_BLANK_PAPER;
            obj.spe = 0;
            break;
        case OCLASSES.SPBOOK_CLASS:
            if (otyp !== ONAMES.SPE_CANCELLATION
                && otyp !== ONAMES.SPE_BOOK_OF_THE_DEAD) {
                obj.otyp = ONAMES.SPE_BLANK_PAPER;
                if (otyp === ONAMES.SPE_NOVEL) {
                    obj.novelidx = 0;
                    delete obj.oname;
                }
            }
            break;
        case OCLASSES.POTION_CLASS:
            if (otyp === ONAMES.POT_SICKNESS
                || otyp === ONAMES.POT_SEE_INVISIBLE) {
                obj.otyp = ONAMES.POT_FRUIT_JUICE;
            } else {
                obj.otyp = ONAMES.POT_WATER;
                obj.odiluted = 0;
            }
            break;
        default:
            break;
        }
    }

    /* src/zap.c:1327. Cancellation keeps a non-Rider corpse's remaining
       deadline but replaces revival with ordinary rot. */
    if (obj.otyp === ONAMES.CORPSE && obj.timed
        && !is_rider(game.mons[obj.corpsenm])) {
        const timeout = peek_timer(REVIVE_MON, obj);
        if (timeout) {
            stop_timer(REVIVE_MON, obj);
            start_timer(timeout, TIMER_OBJECT, ROT_CORPSE, obj);
        }
    }
    unbless(obj);
    uncurse(obj);
}

// src/mon.c:4431 normal_shape(), the cancellation subset. Shapechangers
// return to their base form, werecreatures return to human form, and mimics
// drop their disguise. newcham can print, so this helper is asynchronous.
async function cancel_normal_shape(mon) {
    const mcham = mon.cham ?? NON_PM;
    if (mcham !== NON_PM && game.mons[mcham]) {
        const wasCancelled = mon.mcan;
        await newcham(mon, game.mons[mcham], NC_SHOW_MSG);
        mon.cham = NON_PM;
        mon.mcan = wasCancelled;
        newsym(mon.mx, mon.my);
    }

    const { is_were, new_were } = await import('./were.js');
    if (is_were(mon.data) && mon.data.mlet !== MONSYMS.S_HUMAN)
        await new_were(mon);

    if (M_AP_TYPE(mon) !== M_AP_NOTHING) {
        if (!mon.meating) {
            if (M_AP_TYPE(mon) !== M_AP_MONSTER)
                mon.msleeping = 1;
            seemimic(mon);
        } else {
            await finish_meating(mon);
        }
    }
}

// src/zap.c:3150 cancel_monst(). Wands and spells must make the resistance
// roll before setting mcan, even for monsters with zero magic resistance.
// That draw is part of every later turn's deterministic state.
export async function cancel_monst(mdef, obj, youattack, allow_cancel_kill,
                                   self_cancel) {
    const youdefend = mdef === game.youmonst;
    if (youdefend ? (!youattack && Antimagic())
                  : resist(mdef, obj.oclass, 0, false))
        return false;

    if (self_cancel) {
        const inventory = youdefend ? game.invent : (mdef.minvent || []);
        for (const otmp of inventory)
            cancel_item(otmp);
        if (youdefend) {
            (game.disp ||= {}).botl = true;
            find_ac();
        }
    }

    if (youdefend) {
        if (Upolyd(game.u)) {
            if (game.u.umonnum === PMNAMES.PM_CLAY_GOLEM) {
                if (!Blind())
                    await pline('Some writing vanishes from your head!');
                else
                    await You_feel(`${Hallucination() ? 'dark' : 'light'} headed.`);
                game.u.mh = 0;
            }
            const unchanging = !!(game.u.intrinsic?.HUnchanging
                                   || game.u.uprops?.UNCHANGING);
            if (unchanging && game.u.mh > 0) {
                await Your('amulet grows hot for a moment, then cools.');
            } else {
                const { rehumanize } = await import('./polyself.js');
                await rehumanize();
            }
        }
    } else {
        mdef.mcan = 1;
        await cancel_normal_shape(mdef);

        if (mdef.mnum === PMNAMES.PM_CLAY_GOLEM) {
            if (canseemon(mdef))
                await pline(`Some writing vanishes from ${
                    s_suffix(mon_nam(mdef))} head!`);
            if (allow_cancel_kill) {
                if (youattack)
                    await killed(mdef);
                else
                    await monkilled(mdef, '', ATTKS.AD_SPEL);
            }
        }
    }
    return true;
}

export async function speed_up(duration) {
    if (!Very_fast()) {
        await You(`are suddenly moving ${Fast() ? '' : 'much '}faster.`);
    } else {
        await Your(`${makeplural(body_part(LEG))} get new energy.`);
    }
    exercise(A_DEX, true);
    increment_intrinsic_timeout('HFast', duration);
}

async function u_slow_down() {
    (game.u.intrinsic ||= {}).HFast = 0;
    if (!Fast())
        await You('slow down.');
    else
        await Your('quickness feels less natural.');
    exercise(A_DEX, false);
}

// src/lock.c:1056 boxlock() and src/zap.c:2687 boxlock_invent().
// Self-zapped opening and locking magic reaches every carried chest or box.
async function boxlock_invent(spell) {
    let boxing = false;
    const wizard = game.urole?.name?.m === 'Wizard';
    for (const item of game.invent || []) {
        if (item.otyp !== ONAMES.LARGE_BOX && item.otyp !== ONAMES.CHEST)
            continue;
        boxing = true;
        if (spell.otyp === ONAMES.WAN_LOCKING
            || spell.otyp === ONAMES.SPE_WIZARD_LOCK) {
            if (!item.olocked) {
                await pline('Klunk!');
                item.olocked = 1;
                item.obroken = 0;
                item.lknown = wizard ? 1 : 0;
            }
        } else if (item.olocked) {
            await pline('Klick!');
            item.olocked = 0;
            item.lknown = wizard ? 1 : 0;
        } else {
            item.obroken = 0;
        }
    }
    if (boxing)
        update_inventory();
}

// src/trap.c:6252 openfallingtrap(), hero arm. The self-zap caller only
// opens trapdoors and falling-rock traps, not holes or pits.
async function openfallingtrap_hero(noticed) {
    const trap = t_at(game.u.ux, game.u.uy);
    if (!trap || (trap.ttyp !== TRAPDOOR && trap.ttyp !== ROCKTRAP)
        || game.u.utrap)
        return false;
    noticed.v = true;
    await dotrap(trap, FORCETRAP);
    return !!game.u.utrap;
}

// src/zap.c:1225 unturn_you(). Carried eggs regain their hatch timer before
// the hero receives the form-dependent dread effect.
export async function unturn_you() {
    let revivedCount = 0;
    for (const item of [...(game.invent || [])]) {
        if (item.otyp === ONAMES.EGG && item.corpsenm !== NON_PM
            && !dead_species(item.corpsenm, true))
            attach_egg_hatch_timeout(item, 0);
        else if (item.otyp === ONAMES.CORPSE) {
            const savedNorevive = item.norevive;
            item.norevive = 0;
            const { revive_corpse } = await import('./do.js');
            const revived = await revive_corpse(item, true);
            if (revived) {
                revivedCount++;
                await pline(`It suddenly ${nonliving(revived.data)
                    ? 'reanimates' : 'comes alive'}!`);
            } else {
                item.norevive = savedNorevive;
            }
        }
    }
    if (revivedCount)
        await encumber_msg();
    if (is_undead(game.youmonst.data)) {
        const oldStun = (game.u.intrinsic?.HStun | 0) & TIMEOUT;
        await You_feel(`frightened and ${oldStun ? 'even more ' : ''}stunned.`);
        await make_stunned(oldStun + rnd(30), false);
    } else {
        await You('shudder in dread.');
    }
}

// src/zap.c:568 release_hold() -- opening magic releases the monster holding
// the hero, the swallowed hero, or a monster held by a sticky hero form.
export async function release_hold() {
    const mtmp = game.u.ustuck;
    if (!mtmp)
        return;

    const mdat = game.mons[mtmp.mnum];
    if (game.u.uswallow) {
        if (digests(mdat)) {
            if (!Blind())
                await pline(`${Monnam(mtmp)} opens its mouth!`);
            else
                await You_feel('a sudden rush of air!');
        }
        const { expels } = await import('./mhitu.js');
        await expels(mtmp, mdat, true);
    } else if (sticks(game.youmonst.data)) {
        set_ustuck(null);
        await You(`release ${mon_nam(mtmp)}.`);
    } else {
        await unstuck(mtmp);
        const relation = !nohands(mdat)
            ? `from ${s_suffix(mon_nam(mtmp))} grasp`
            : `by ${mon_nam(mtmp)}`;
        await You(`are released ${relation}.`);
    }
}

// src/zap.c:2705 zapyourself() — the hero zapped themself.
//
// Returns the retributive damage. dozap() applies it after wand discovery and
// inventory damage have finished, matching the C caller.
// src/zap.c:654 get_obj_location() — where an object is; fills cc and
// returns true when it has a map position.
export function get_obj_location(obj, cc, locflags) {
    switch (obj.where) {
    case OBJ_INVENT:
        cc.x = game.u.ux;
        cc.y = game.u.uy;
        return true;
    case OBJ_FLOOR:
        cc.x = obj.ox;
        cc.y = obj.oy;
        return true;
    case OBJ_MINVENT:
        if (obj.ocarry?.mx) {
            cc.x = obj.ocarry.mx;
            cc.y = obj.ocarry.my;
            return true;
        }
        break; /* !mx => migrating monster */
    case OBJ_BURIED:
        if (locflags & BURIED_TOO) {
            cc.x = obj.ox;
            cc.y = obj.oy;
            return true;
        }
        break;
    case OBJ_CONTAINED:
        if (locflags & CONTAINED_TOO)
            return get_obj_location(obj.ocontainer, cc, locflags);
        break;
    }
    cc.x = cc.y = 0;
    return false;
}

export async function zapyourself(obj, ordinary) {
    let damage = 0;
    let learn_it = false;
    const antimagic = !!(game.u.intrinsic?.HAntimagic
                         || game.u.uprops?.ANTIMAGIC
                         || game.u.uprops?.MAGIC_RES);

    switch (obj.otyp) {
    case ONAMES.WAN_STRIKING:
    case ONAMES.SPE_FORCE_BOLT:
        learn_it = true;
        if (antimagic) {
            await shieldeff(game.u.ux, game.u.uy);
            await pline('Boing!');
        } else {
            if (ordinary) {
                await You('bash yourself!');
                damage = d(2, 12);
            } else {
                damage = d(1 + obj.spe, 6);
            }
            exercise(A_STR, false);
        }
        break;
    case ONAMES.WAN_LIGHTNING: {
        learn_it = true;
        const origDamage = d(12, 6);
        if (!Shock_resistance()) {
            await You('shock yourself!');
            damage = origDamage;
            exercise(A_CON, false);
        } else {
            await shieldeff(game.u.ux, game.u.uy);
            await You('zap yourself, but seem unharmed.');
        }
        await destroy_items(game.youmonst, ATTKS.AD_ELEC, origDamage);
        await flashburn(rnd(100), true);
        break;
    }
    case ONAMES.WAN_FIRE:
    case ONAMES.FIRE_HORN: {
        learn_it = true;
        const origDamage = d(12, 6);
        if (Fire_resistance()) {
            await shieldeff(game.u.ux, game.u.uy);
            await You_feel('rather warm.');
        } else {
            await pline("You've set yourself afire!");
            damage = origDamage;
        }
        if (game.u.uprops?.SLIMED)
            game.u.uprops.SLIMED = 0;
        await burnarmor(game.youmonst);
        await destroy_items(game.youmonst, ATTKS.AD_FIRE, origDamage);
        await ignite_items(game.invent);
        break;
    }
    case ONAMES.WAN_COLD:
    case ONAMES.SPE_CONE_OF_COLD:
    case ONAMES.FROST_HORN: {
        learn_it = true;
        const origDamage = d(12, 6);
        if (Cold_resistance()) {
            await shieldeff(game.u.ux, game.u.uy);
            await You_feel('a little chill.');
        } else {
            await You('imitate a popsicle!');
            damage = origDamage;
        }
        await destroy_items(game.youmonst, ATTKS.AD_COLD, origDamage);
        break;
    }
    case ONAMES.WAN_MAGIC_MISSILE:
    case ONAMES.SPE_MAGIC_MISSILE:
        learn_it = true;
        if (antimagic) {
            await shieldeff(game.u.ux, game.u.uy);
            await pline_The('missiles bounce!');
        } else {
            damage = d(4, 6);
            await pline("Idiot!  You've shot yourself!");
        }
        break;
    case ONAMES.WAN_CANCELLATION:
    case ONAMES.SPE_CANCELLATION:
        await cancel_monst(game.youmonst, obj, true, true, true);
        break;
    case ONAMES.SPE_DRAIN_LIFE:
        if (!(game.u.intrinsic?.HDrain_resistance
              || game.u.uprops?.DRAIN_RES)) {
            learn_it = true;
            await losexp('life drainage');
        }
        damage = 0;
        break;
    case ONAMES.WAN_MAKE_INVISIBLE: {
        const msg = !Invis() && !Blind() && !game.u.blocked?.INVIS;
        if (game.u.blocked?.INVIS
            && game.u.uarmc?.otyp === ONAMES.MUMMY_WRAPPING) {
            await You_feel(`rather itchy under ${yname(game.u.uarmc)}.`);
            break;
        }
        increment_intrinsic_timeout('HInvis', rn1(15, 31));
        if (msg) {
            learn_it = true;
            newsym(game.u.ux, game.u.uy);
            await pline(`${Hallucination() ? 'Far out, man!  You'
                                           : 'Gee!  All of a sudden, you'} ${
                See_invisible() ? 'can see right through yourself'
                                : "can't see yourself"}.`);
        }
        break;
    }
    case ONAMES.WAN_SPEED_MONSTER:
        await speed_up(rn1(25, 50));
        learn_it = true;
        break;
    case ONAMES.WAN_SLEEP:
    case ONAMES.SPE_SLEEP: {
        learn_it = true;
        if (Sleep_resistance()) {
            await shieldeff(game.u.ux, game.u.uy);
            await You("don't feel sleepy!");
            break;
        }
        if (ordinary)
            await pline_The("sleep ray hits you!");
        else
            await You("fall asleep!");
        /* monstunseesu(M_SEEN_SLEEP) — monster memory, recorded */
        await fall_asleep(-rnd(50), true);
        break;
    }
    case ONAMES.WAN_SLOW_MONSTER:
    case ONAMES.SPE_SLOW_MONSTER:
        if ((game.u.intrinsic?.HFast | 0) & (TIMEOUT | INTRINSIC)) {
            learn_it = true;
            await u_slow_down();
        }
        break;
    case ONAMES.WAN_TELEPORTATION:
    case ONAMES.SPE_TELEPORT_AWAY: {
        const oldX = game.u.ux, oldY = game.u.uy;
        await tele();
        const stunned = !!(game.u.uprops?.STUNNED?.intrinsic
                           || game.u.uprops?.STUNNED);
        const dx = game.u.ux - oldX, dy = game.u.uy - oldY;
        if ((Teleport_control() && !stunned)
            || !couldsee(oldX, oldY) || dx * dx + dy * dy >= 16)
            learn_it = true;
        break;
    }
    case ONAMES.WAN_DEATH:
    case ONAMES.SPE_FINGER_OF_DEATH: {
        /* nonliving()/is_demon() hero forms are not reachable un-polymorphed */
        learn_it = true;
        game.killer ||= {};
        game.killer.name = `shot ${game.flags?.female ? 'her' : 'him'}self`
                           + ' with a death ray';
        game.killer.format = 2; /* NO_KILLER_PREFIX */
        await pline('You irradiate yourself with pure energy!');
        await pline('You die.');
        /* They might survive with an amulet of life saving */
        const { done, DIED } = await import('./end.js');
        await done(DIED);
        break;
    }
    case ONAMES.WAN_UNDEAD_TURNING:
    case ONAMES.SPE_TURN_UNDEAD:
        learn_it = true;
        await unturn_you();
        break;
    case ONAMES.WAN_OPENING:
    case ONAMES.SPE_KNOCK: {
        if (game.u.ustuck) {
            await release_hold();
            learn_it = true;
        }
        if (game.uball || game.u.uball) {
            const { unpunish } = await import('./read.js');
            unpunish();
            learn_it = true;
        }
        const noticed = { v: learn_it };
        const escaped = game.u.utrap
            ? await openholdingtrap(game.youmonst, noticed) : false;
        if (!escaped) {
            await boxlock_invent(obj);
            await openfallingtrap_hero(noticed);
        }
        learn_it = noticed.v;
        break;
    }
    case ONAMES.WAN_LOCKING:
    case ONAMES.SPE_WIZARD_LOCK: {
        const noticed = { v: learn_it };
        const shouldBox = game.u.utrap
            || !await closeholdingtrap(game.youmonst, noticed);
        if (shouldBox)
            await boxlock_invent(obj);
        learn_it = noticed.v;
        break;
    }
    case ONAMES.WAN_POLYMORPH:
    case ONAMES.SPE_POLYMORPH:
        if (!Unchanging()) {
            learn_it = true;
            const { polyself } = await import('./polyself.js');
            await polyself(POLY_NOFLAGS);
        }
        break;
    case ONAMES.SPE_HEALING:
    case ONAMES.SPE_EXTRA_HEALING: {
        learn_it = true; /* (no effect for spells...) */
        await healup(d(6, obj.otyp === ONAMES.SPE_EXTRA_HEALING ? 8 : 4),
                     0, false,
                     (!!obj.blessed
                      || obj.otyp === ONAMES.SPE_EXTRA_HEALING));
        await You_feel(`${obj.otyp === ONAMES.SPE_EXTRA_HEALING ? 'much ' : ''}better.`);
        break;
    }
    case ONAMES.WAN_SECRET_DOOR_DETECTION:
    case ONAMES.SPE_DETECT_UNSEEN:
        /* src/zap.c:2552 — findit() gives sufficient feedback to discover
           the wand even when it finds nothing */
        learn_it = !!obj.dknown;
        await findit();
        break;
    case ONAMES.WAN_PROBING:
        for (const item of game.invent || []) {
            observe_object(item);
            if (Is_container(item) || item.otyp === ONAMES.STATUE) {
                item.lknown = 1;
                item.cknown = 1;
            } else if (item.otyp === ONAMES.TIN) {
                item.known = 1;
            }
        }
        update_inventory();
        learn_it = true;
        await ustatusline();
        break;
    case ONAMES.EXPENSIVE_CAMERA: {
        let lightDamage = 5;
        if (game.u.umonnum === PMNAMES.PM_GREMLIN) {
            lightDamage = rnd(lightDamage);
            if (lightDamage > 10)
                lightDamage = 10 + rnd(lightDamage - 10);
            if (lightDamage > 20)
                lightDamage = 20;
            await pline(`Ow, that light hurts${
                lightDamage > 2 || game.u.mh <= 5 ? '!' : '.'}`);
            const { losehp } = await import('./hack.js');
            await losehp(lightDamage, 'zapped himself with an expensive camera',
                         KILLED_BY);
        }
        const duration = lightDamage + rnd(25);
        if (!resists_blnd(null)) {
            await You('are blinded by the flash!');
            const { make_blinded } = await import('./potion.js');
            await make_blinded(duration, false);
            if (!Blind())
                await Your('vision clears.');
            learn_it = true;
        } else if (resists_blnd_by_arti(null)) {
            note_unported_zap('zapyourself:camera_shieldeff');
            learn_it = true;
        }
        break;
    }
    default:
        note_unported_zap(`zapyourself:otyp=${obj.otyp}`);
        break;
    }
    if (learn_it)
        learnwand(obj);
    return damage;
}

// src/zap.c:3060 flashburn(). Lightning and camera flashes share the same
// blindness message and timeout path.
export async function flashburn(duration, viaLightning) {
    if (!resists_blnd(null)) {
        await You('are blinded by the flash!');
        const { make_blinded } = await import('./potion.js');
        await make_blinded(duration, false);
        if (!Blind())
            await Your('vision clears.');
        return true;
    }
    if (!viaLightning && resists_blnd_by_arti(null)) {
        await shieldeff(game.u.ux, game.u.uy);
        return true;
    }
    return false;
}

// src/zap.c:2539 zapnodir() — wands that need no direction.
// src/zap.c:2525 do_enlightenment_effect()
export async function do_enlightenment_effect() {
    await You_feel('self-knowledgeable...');
    await display_nhwindow_message();
    /* src/insight.c enlightenment(): the text goes into an NHW_MENU window
       that pages like ^X; ours builds the lines and shows them here */
    {
        const { tty_start_menu, tty_add_menu, tty_end_menu, tty_next_page }
            = await import('./tty/wintty.js');
        const { NHW_MENU, MENU_BEHAVE_STANDARD, MENU_ITEMFLAGS_NONE }
            = await import('./const.js');
        const { NO_COLOR, ATR_NONE } = await import('./terminal.js');
        const { xwaitforspace } = await import('./tty/getline.js');
        const win = tty_create_nhwindow(NHW_MENU);
        tty_start_menu(win, MENU_BEHAVE_STANDARD);
        for (const line of enlightenment(MAGICENLIGHTENMENT,
                                          ENL_GAMEINPROGRESS))
            tty_add_menu(win, null, 0, 0, 0, ATR_NONE, NO_COLOR, line,
                         MENU_ITEMFLAGS_NONE);
        tty_end_menu(win, null);
        await tty_display_nhwindow(win);
        await xwaitforspace(' \r\n\x1b');
        while (game.morc !== '\x1b' && tty_next_page(win))
            await xwaitforspace(' \r\n\x1b');
        tty_destroy_nhwindow(win);
        await docrt();
    }
    await pline_The('feeling subsides.');
    exercise(A_WIS, true);
}

export async function zapnodir(obj) {
    let known = false;

    switch (obj.otyp) {
    case ONAMES.WAN_SECRET_DOOR_DETECTION:
    case ONAMES.SPE_DETECT_UNSEEN:
        /* findit() gives sufficient feedback to discover the wand even
           when blinded or when it fails to find anything */
        known = !!obj.dknown;
        await findit();
        break;
    case ONAMES.WAN_STASIS: {
        const tmp_until = game.moves + rn1(21, 10);
        if (tmp_until > ((game.level.flags ||= {}).stasis_until || 0))
            game.level.flags.stasis_until = tmp_until;
        break;
    }
    case ONAMES.WAN_CREATE_MONSTER:
        /* create_critters() returns True iff hero sees a new monster appear */
        if (await create_critters(rn2(23) ? 1 : rn1(7, 2), null, false))
            known = !!obj.dknown;
        break;
    case ONAMES.WAN_WISHING:
        /* src/zap.c:2585 — Luck + rn2(5) gate, then the wish */
        if ((game.u.uluck || 0) + rn2(5) < 0) {
            await pline('Unfortunately, nothing happens.');
            known = false;
        } else {
            known = !!obj.dknown;
            await makewish();
        }
        break;
    case ONAMES.WAN_LIGHT:
    case ONAMES.SPE_LIGHT: {
        known = !!obj.dknown && !Blind();
        const { litroom } = await import('./read.js');
        await litroom(true, obj);
        break;
    }
    case ONAMES.WAN_ENLIGHTENMENT:
        note_unported_zap(`zapnodir:otyp=${obj.otyp}`);
        break;
    default:
        break;
    }

    if (known) {
        if (!game.objects[obj.otyp].oc_name_known)
            more_experienced(0, 10);
        /* effect was observable; discover the wand type provided
           that the wand itself has been seen */
        learnwand(obj);
    }
}

// src/zap.c:6160 MAXWISHTRY
const MAXWISHTRY = 5;

// src/zap.c:6165 wishcmdassist() — details shown when the player answers
// the wish prompt with "help".
async function wishcmdassist(triesleft) {
    const wishinfo = [
  'Wish details:',
  '',
  'Enter the name of an object, such as "potion of monster detection",',
  '"scroll labeled README", "elven mithril-coat", or "Grimtooth"',
  '(without the quotes).',
  '',
  'For object types which come in stacks, you may specify a plural name',
  'such as "potions of healing", or specify a count, such as "1000 gold',
  'pieces", although that aspect of your wish might not be granted.',
  '',
  'You may also specify various prefix values which might be used to',
  'modify the item, such as "uncursed" or "rustproof" or "+1".',
  'Most modifiers shown when viewing your inventory can be specified.',
  '',
  "You may specify 'nothing' to explicitly decline this wish.",
    ],
        preserve_wishless = "Doing so will preserve 'wishless' conduct.",
        retry_too = 'a randomly chosen item will be granted.',
        suppress_cmdassist =
            '(Suppress this assistance with !cmdassist in your config file.)',
        cardinals = ['zero', 'one', 'two', 'three', 'four', 'five'],
        too_many = 'too many';

    const win = tty_create_nhwindow(NHW_TEXT);
    if (!win)
        return;
    for (let i = 0; i < wishinfo.length; ++i)
        tty_putstr(win, 0, wishinfo[i]);
    if (!(game.u.uconduct?.wishes))
        tty_putstr(win, 0, preserve_wishless);
    tty_putstr(win, 0, '');
    tty_putstr(win, 0,
               `If you specify an unrecognized object name ${
                   (triesleft >= 0 && triesleft < cardinals.length)
                       ? cardinals[triesleft] : too_many
               }${(triesleft < MAXWISHTRY) ? ' more' : ''} time${
                   plur(triesleft)},`);
    tty_putstr(win, 0, retry_too);
    tty_putstr(win, 0, '');
    if (boolean_option('cmdassist'))
        tty_putstr(win, 0, suppress_cmdassist);
    await tty_display_nhwindow(win);
    tty_destroy_nhwindow(win);
}

/* src/zap.c:6221 MAX_WISH_HISTORY / wish_history[] — the wish history is
   DEBUG-only and the contest build does not define DEBUG, so the list
   stays empty and the add/menu bodies compile away. */
const MAX_WISH_HISTORY = 20;
const wish_history = new Array(MAX_WISH_HISTORY).fill(null);

// src/zap.c:6227 wish_history_add() — body is #ifdef DEBUG; no-op here.
function wish_history_add(buf) {
}

// src/zap.c:6314 makewish() — grant one wish.
export async function makewish() {
    let buf = '';
    let bufcpy = '', promptbuf;
    let otmp;
    const nothing = {}; /* cg.zeroobj; only its address matters */
    let tries = 0;
    game.u.uconduct ||= {};
    const oldwisharti = game.u.uconduct.wisharti || 0;

    (game.context ||= {}).resume_wish = 0;
    if (game.flags?.verbose !== false)
        await You('may wish for an object.');
    /* retry: */
    for (;;) {
        promptbuf = 'For what do you wish';
        if (boolean_option('cmdassist') && tries > 0)
            promptbuf += " (enter 'help' for assistance)";
        promptbuf += '?';

        /* iflags.menu_requested && wish_history[0]: the DEBUG-only history
           menu; the list is always empty here so getlin always runs */
        if (game.iflags?.menu_requested && wish_history[0] && (tries === 0))
            note_unported_zap('makewish:wish_history_menu');
        else
            buf = await getlin(promptbuf, null);

        if (game.iflags?.term_gone) {
            if (!game.iflags?.debug_fuzzer)
                game.context.resume_wish = 1;
            return;
        }

        buf = mungspaces(buf);
        if (buf[0] === '\x1b') {
            buf = '';
        } else if (buf.toLowerCase() === 'help') { /* !strcmpi(buf, "help") */
            await wishcmdassist(MAXWISHTRY - tries);
            buf = ''; /* for EDIT_GETLIN */
            continue; /* goto retry */
        }
        /*
         *  Note: if they wished for and got a non-object successfully,
         *  otmp == &hands_obj.  That includes an artifact which has been
         *  denied. Wishing for "nothing" requires a separate value to
         *  remain distinct.
         */
        bufcpy = buf;
        otmp = await readobjnam(buf, nothing);
        if (!otmp) {
            await pline(
                'Nothing fitting that description exists in the game.');
            if (++tries < MAXWISHTRY)
                continue; /* goto retry */
            await pline("That's enough tries!"); /* thats_enough_tries */
            otmp = await readobjnam(null, null);
            if (!otmp)
                return; /* for safety; should never happen */
        } else if (otmp === nothing) {
            /* explicitly wished for "nothing", presumably attempting
               to retain wishless conduct */
            livelog_add('declined to make a wish');
            return;
        } else if (otmp === hands_obj) {
            wish_history_add(bufcpy);
            /* wizard mode terrain wish: skip livelogging, etc */
            return;
        }
        break;
    }
    wish_history_add(bufcpy);

    if (otmp.oartifact) {
        /* update artifact bookkeeping; doesn't produce a livelog event */
        artifact_origin(otmp, ONAME_WISH | ONAME_KNOW_ARTI);
    }

    /* wisharti conduct is handled in readobjnam(). Log the request and actual
       result before the object is placed, matching src/zap.c:6387. */
    const wish = `"${bufcpy}", got "${doname(otmp)}"`;
    const oldwishes = game.u.uconduct.wishes || 0;
    const possessive = game.flags?.female ? 'her' : 'his';
    game.u.uconduct.wishes = oldwishes + 1; /* KMH */
    if (!oldwishes) {
        livelog_add(`made ${possessive} first wish - ${wish}`);
    } else if (!oldwisharti && game.u.uconduct.wisharti) {
        livelog_add(`made ${possessive} first artifact wish - ${wish}`);
    } else {
        livelog_add(`wished for ${wish}`);
    }

    if (otmp.otyp === ONAMES.CORPSE
        && !u_safe_from_fatal_corpse(otmp, st_all))
        otmp.wishedfor = 1;

    const verb = ((Is_airlevel(game.u.uz) || game.u.uinwater)
                  ? 'slip'
                  : (otmp.otyp === ONAMES.CORPSE && otmp.wishedfor)
                    ? 'materialize' : 'drop'),
          oops_msg = (game.u.uswallow
                      ? 'Oops!  %s out of your reach!'
                      : (Is_airlevel(game.u.uz) || Is_waterlevel(game.u.uz)
                         || game.level.at(game.u.ux, game.u.uy).typ < IRONBARS
                         || game.level.at(game.u.ux, game.u.uy).typ >= ICE)
                        ? 'Oops!  %s away from you!'
                        : !(otmp.otyp === ONAMES.CORPSE && otmp.wishedfor)
                          ? 'Oops!  %s to the floor!'
                          : 'Careful! %s on the floor!');

    /* The(aobjnam()) is safe since otmp is unidentified -dlc */
    await hold_another_object(otmp, oops_msg, The(aobjnam(otmp, verb)),
                              null);
    game.u.ublesscnt = (game.u.ublesscnt || 0) + rn1(100, 50);
                                        /* the gods take notice */
}

// src/zap.c:123 learnwand() — the zap's observable effect identifies the
// wand type (spells are suppressed so casting can't re-discover a book).
export function learnwand(obj) {
    if (obj.oclass !== OCLASSES.SPBOOK_CLASS) {
        if (game.objects[obj.otyp].oc_name_known) {
            observe_object(obj);
        } else {
            if (!game.u.ublind)
                observe_object(obj);
            if (obj.dknown)
                makeknown(obj.otyp);
        }
        update_inventory();
    }
}

// src/zap.c:1476 obj_shudders() — does the object with polymorph.
export function obj_shudders(obj) {
    let zap_odds;

    if (game.context?.bypasses && obj.bypass)
        return false;

    if (obj.oclass === OCLASSES.WAND_CLASS)
        zap_odds = 3;       /* half-life = 2 zaps */
    else if (obj.cursed)
        zap_odds = 3;
    else if (obj.blessed)
        zap_odds = 12;      /* half-life = 8 zaps */
    else
        zap_odds = 8;       /* half-life = 6 zaps */

    /* adjust for "large" quantities of identical things */
    if (obj.quan > 4)
        zap_odds = Math.trunc(zap_odds / 2);

    return !rn2(zap_odds);
}

/* module state mirroring go.obj_zapped / gp.poly_zapped */
let obj_zapped = false;
let poly_zapped = -1;

// src/zap.c:1637 do_osshock() — object is deleted by the polymorph shock;
// some of a stack may survive via splitobj, and some material may
// metamorphose into a golem later (create_polymon via poly_zapped).
export function do_osshock(obj) {
    obj_zapped = true;

    if (poly_zapped < 0) {
        /* some may metamorphose */
        const Luck = (game.u.uluck || 0) + (game.u.moreluck || 0);
        for (let i = obj.quan; i; i--)
            if (!rn2(Luck + 45)) {
                poly_zapped = game.objects[obj.otyp].oc_material;
                break;
            }
    }

    /* if quan > 1 then some will survive intact */
    if (obj.quan > 1) {
        obj = splitobj(obj, rnd(obj.quan - 1));
    }

    /* costly_spot billing — shops unported, recorded in delobj path */
    delobj(obj);
}

// src/zap.c:1678 obj_unpolyable() — resists polymorphing. Draws the
// obj_resists rn2(100) for every non-unpolyable object.
export function obj_unpolyable(obj) {
    /* include/obj.h:429 unpolyable() */
    const unpoly = obj.otyp === ONAMES.WAN_POLYMORPH
        || obj.otyp === ONAMES.SPE_POLYMORPH
        || obj.otyp === ONAMES.POT_POLYMORPH
        || obj.otyp === ONAMES.AMULET_OF_UNCHANGING;
    return (unpoly
            || obj === game.uball || obj === game.uskin
            || obj_resists(obj, 5, 95));
}

/* src/zap.c:1688 charged_objs[] */
const charged_objs = [OCLASSES.WAND_CLASS, OCLASSES.WEAPON_CLASS,
                      OCLASSES.ARMOR_CLASS];

// src/zap.c:1702 poly_obj() — polymorph obj; STRANGE_OBJECT id means pick a
// random object of the same class, trying up to 3 times to keep the
// magic-or-not status. The worn-item tail applies to inventory items only;
// the floor-pile path (the one live today) swaps the object in place.
export async function poly_obj(obj, id) {
    let otmp;
    const can_merge = (id === ONAMES.STRANGE_OBJECT);
    const obj_location = obj.where;

    if (obj.otyp === ONAMES.BOULDER && In_sokoban(game.u.uz))
        note_unported_zap('poly_obj:sokoban_guilt');
    if (id === ONAMES.STRANGE_OBJECT) { /* preserve symbol */
        let try_limit = 3;
        const magic_obj = game.objects[obj.otyp].oc_magic;

        otmp = null;
        do {
            if (otmp)
                delobj(otmp);
            otmp = mkobj(obj.oclass, false);
        } while (--try_limit > 0
                 && game.objects[otmp.otyp].oc_magic !== magic_obj);
    } else {
        /* literally replace obj with this new thing */
        otmp = mksobj(id, false, false);
        const USES_CORPSENM = (typ) => typ === ONAMES.CORPSE
            || typ === ONAMES.STATUE || typ === ONAMES.FIGURINE;
        if (USES_CORPSENM(obj.otyp) && USES_CORPSENM(id))
            set_corpsenm(otmp, obj.corpsenm);
    }

    /* preserve quantity */
    otmp.quan = obj.quan;
    /* preserve the shopkeeper's (lack of) interest */
    otmp.no_charge = obj.no_charge;
    /* preserve inventory letter if in inventory */
    if (obj_location === 3 /* OBJ_INVENT */)
        otmp.invlet = obj.invlet;

    /* avoid abusing eggs laid by you */
    if (obj.otyp === ONAMES.EGG && obj.spe)
        note_unported_zap('poly_obj:hero_laid_egg');

    /* keep special fields (including charges on wands) */
    if (charged_objs.includes(otmp.oclass))
        otmp.spe = obj.spe;
    otmp.recharged = obj.recharged;

    otmp.cursed = obj.cursed;
    otmp.blessed = obj.blessed;

    if (erosion_matters(otmp, game.objects)) {
        if (is_flammable(otmp) || is_rustprone_zap(otmp)
            || is_crackable_zap(otmp))
            otmp.oeroded = obj.oeroded;
        if (is_corrodeable_zap(otmp) || is_rottable(otmp))
            otmp.oeroded2 = obj.oeroded2;
        /* is_damageable */
        if (is_flammable(otmp) || is_rustprone_zap(otmp)
            || is_rottable(otmp) || is_corrodeable_zap(otmp)
            || is_crackable_zap(otmp))
            otmp.oerodeproof = obj.oerodeproof;
    }

    /* keep chest/box traps and poisoned ammo if we may */
    if (obj.otrapped && (otmp.otyp === ONAMES.LARGE_BOX
                         || otmp.otyp === ONAMES.CHEST
                         || otmp.otyp === ONAMES.ICE_BOX))
        otmp.otrapped = 1;
    if (obj.opoisoned && is_poisonable_zap(otmp))
        otmp.opoisoned = 1;

    if (id === ONAMES.STRANGE_OBJECT && obj.otyp === ONAMES.CORPSE) {
        if (obj.corpsenm === PMNAMES.PM_CROCODILE)
            note_unported_zap('poly_obj:crocodile_shoes');
    }
    if (obj.otyp === ONAMES.LEASH && obj.leashmon)
        note_unported_zap('poly_obj:leash');

    /* no box contents --KAA */
    if (otmp.cobj?.length)
        otmp.cobj = [];

    /* 'n' merged objects may be fused into 1 object */
    if (otmp.quan > 1 && (!game.objects[otmp.otyp].oc_merge
                          || (can_merge && otmp.quan > rn2(1000))))
        otmp.quan = 1;

    switch (otmp.oclass) {
    case OCLASSES.TOOL_CLASS:
        if (otmp.otyp === ONAMES.MAGIC_LAMP) {
            otmp.otyp = ONAMES.OIL_LAMP;
            otmp.age = 1500;
        } else if (otmp.otyp === ONAMES.MAGIC_MARKER) {
            otmp.recharged = 1; /* degraded quality */
        }
        break;

    case OCLASSES.WAND_CLASS:
        while (otmp.otyp === ONAMES.WAN_WISHING
               || otmp.otyp === ONAMES.WAN_POLYMORPH)
            otmp.otyp = rnd_class(ONAMES.WAN_LIGHT, ONAMES.WAN_LIGHTNING);
        if ((otmp.recharged || 0) < rn2(7)) /* recharge_limit */
            otmp.recharged = (otmp.recharged || 0) + 1;
        break;

    case OCLASSES.POTION_CLASS:
        while (otmp.otyp === ONAMES.POT_POLYMORPH)
            otmp.otyp = rnd_class(ONAMES.POT_GAIN_ABILITY, ONAMES.POT_WATER);
        if (otmp.otyp === ONAMES.POT_OIL || obj.otyp === ONAMES.POT_OIL)
            note_unported_zap('poly_obj:fixup_oil');
        break;

    case OCLASSES.SPBOOK_CLASS:
        while (otmp.otyp === ONAMES.SPE_POLYMORPH)
            otmp.otyp = rnd_class(game.bases[OCLASSES.SPBOOK_CLASS],
                                  ONAMES.SPE_BLANK_PAPER);
        if (otmp.otyp !== ONAMES.SPE_BLANK_PAPER
            && otmp.otyp !== ONAMES.SPE_NOVEL) {
            otmp.spestudied = (obj.spestudied || 0) + 1;
            if (otmp.spestudied > 4 /* MAX_SPELL_STUDY */) {
                otmp.otyp = ONAMES.SPE_BLANK_PAPER;
                otmp.spestudied = rn2(otmp.spestudied);
            }
        }
        break;

    case OCLASSES.GEM_CLASS:
        if (otmp.quan > rnd(4)
            && game.objects[obj.otyp].oc_material === MATERIALS.MINERAL
            && game.objects[otmp.otyp].oc_material !== MATERIALS.MINERAL) {
            otmp.otyp = ONAMES.ROCK; /* transmutation backfired */
            otmp.quan = Math.trunc(otmp.quan / 2); /* material lost */
        }
        break;
    }

    /* update the weight */
    otmp.owt = weight(otmp);

    /* replace_object(obj, otmp) — floor swap; the worn-inventory tail
       (freeinv/addinv, Wear/Takeoff side effects) is inventory-only and
       recorded when it first matters. */
    if (obj_location === OBJ_FLOOR) {
        otmp.ox = obj.ox;
        otmp.oy = obj.oy;
        otmp.where = OBJ_FLOOR;
        const idx = game.level.objects.indexOf(obj);
        if (idx >= 0)
            game.level.objects[idx] = otmp;
        else
            game.level.objects.unshift(otmp);
    } else {
        note_unported_zap('poly_obj:non_floor_swap');
    }

    if ((otmp.otyp === ONAMES.MIRROR || otmp.otyp === ONAMES.CRYSTAL_BALL)
        && obj.otyp !== otmp.otyp)
        note_unported_zap('poly_obj:luck_mirror');

    if (obj_location === OBJ_FLOOR) {
        const { shop_object_transformed } = await import('./shk.js');
        await shop_object_transformed(obj, otmp, obj.ox, obj.oy);
    }

    /* src/zap.c poly_obj tail — delobj(obj) on the original; its
       obj_resists(0,0) guard DRAWS one rn2(100) every time. The floor swap
       above already removed obj from the list, so mark it free first so
       delobj's list splice is a no-op. */
    obj.where = 0; /* OBJ_FREE */
    delobj(obj);
    return otmp;
}

// src/zap.c:1544 create_polymon() — a golem rises from the polymorphed
// pile. Draws happen only when do_osshock set poly_zapped, which any
// session reaching it will show; the golem machinery itself is recorded.
function create_polymon(pile_head, okind) {
    note_unported_zap('create_polymon:okind=' + okind);
}

// src/zap.c:1993 stone_to_flesh_obj(). Simple mineral objects become their
// meat counterparts. Statue and figurine animation remains separate because
// it creates or transforms monsters rather than replacing one floor object.
async function stone_to_flesh_obj(obj) {
    const material = game.objects[obj.otyp].oc_material;
    if (material !== MATERIALS.MINERAL && material !== MATERIALS.GEMSTONE)
        return 0;
    if (obj_resists(obj, 2, 98))
        return 0;

    const ox = obj.ox, oy = obj.oy;
    let replacement = null;
    let res = 1;

    if (obj.otyp === ONAMES.BOULDER) {
        replacement = ONAMES.ENORMOUS_MEATBALL;
    } else if (obj.otyp === ONAMES.STATUE) {
        res = await animate_statue(obj, ox, oy, ANIMATE_SPELL) ? 1 : 0;
    } else if (obj.otyp === ONAMES.FIGURINE) {
        note_unported_zap('stone_to_flesh_obj:figurine');
        res = 0;
    } else {
        switch (obj.oclass) {
        case OCLASSES.RING_CLASS:
            replacement = ONAMES.MEAT_RING;
            break;
        case OCLASSES.WAND_CLASS:
            replacement = ONAMES.MEAT_STICK;
            break;
        case OCLASSES.GEM_CLASS:
            replacement = ONAMES.MEATBALL;
            break;
        default:
            res = 0;
            break;
        }
    }

    if (replacement !== null) {
        await poly_obj(obj, replacement);
        const role = game.urole?.mnum ?? game.urole?.malenum;
        const smellsPlain = role === PMNAMES.PM_MONK || role === 'PM_MONK'
            || !game.u.uconduct?.unvegetarian
            || !carnivorous(game.youmonst.data);
        await Norep(smellsPlain ? 'You smell the odor of meat.'
                                : 'You smell a delicious smell.');
    }
    newsym(ox, oy);
    return res;
}

// src/zap.c:2119 bhito() — zap effect hits an object on the floor.
// The POLYMORPH arm is live; PROBING learns the object; the other wand
// types record themselves.
export async function bhito(obj, otmp) {
    let res = 1; /* affected object by default */
    let learn_it = false;

    if (obj === otmp)
        return 0;

    if (obj.bypass) {
        if (game.context?.bypasses)
            return 0;
        obj.bypass = 0;
    }

    if (obj === game.uball) {
        res = 0;
    } else if (obj === game.uchain) {
        if (otmp.otyp === ONAMES.WAN_OPENING
            || otmp.otyp === ONAMES.SPE_KNOCK) {
            learn_it = true;
            const { unpunish } = await import('./read.js');
            unpunish();
        } else
            res = 0;
    } else {
        switch (otmp.otyp) {
        case ONAMES.WAN_POLYMORPH:
        case ONAMES.SPE_POLYMORPH:
            if (obj_unpolyable(obj)) {
                res = 0;
                break;
            }
            game.u.uconduct ||= {};
            game.u.uconduct.polypiles =
                (game.u.uconduct.polypiles || 0) + 1;

            /* any saved lock context will be dangerously obsolete */
            if (obj.otyp === ONAMES.LARGE_BOX || obj.otyp === ONAMES.CHEST
                || obj.otyp === ONAMES.ICE_BOX)
                note_unported_zap('bhito:boxlock');

            if (obj_shudders(obj)) {
                if (cansee(obj.ox, obj.oy))
                    learn_it = true;
                do_osshock(obj);
                break;
            }
            obj = await poly_obj(obj, ONAMES.STRANGE_OBJECT);
            newsym(obj.ox, obj.oy);
            break;
        case ONAMES.WAN_PROBING:
            res = obj.dknown ? 0 : 1;
            observe_object(obj);
            note_unported_zap('bhito:probing_contents');
            learn_it = true;
            break;
        case ONAMES.WAN_STRIKING:
        case ONAMES.SPE_FORCE_BOLT: {
            /* src/zap.c:2297: even an ordinary floor object which does not
               break still goes through breaktest(), whose obj_resists()
               check spends rn2(100). Monster-fired striking wands use this
               path too, so omitting it shifts the whole turn stream. */
            const { breaktest } = await import('./dothrow.js');
            if (breaktest(obj))
                note_unported_zap('bhito:striking_breakage');
            res = 0;
            break;
        }
        case ONAMES.WAN_CANCELLATION:
        case ONAMES.SPE_CANCELLATION:
            cancel_item(obj);
            newsym(obj.ox, obj.oy);
            break;
        case ONAMES.WAN_TELEPORTATION:
        case ONAMES.SPE_TELEPORT_AWAY:
            note_unported_zap('bhito:teleport');
            res = 0;
            break;
        case ONAMES.WAN_MAKE_INVISIBLE:
            res = 0;
            break;
        case ONAMES.WAN_UNDEAD_TURNING:
        case ONAMES.SPE_TURN_UNDEAD: {
            if (obj.otyp === ONAMES.EGG) {
                if (obj.corpsenm !== NON_PM
                    && !dead_species(obj.corpsenm, true)) {
                    attach_egg_hatch_timeout(obj, 0);
                }
                break;
            }
            if (obj.otyp !== ONAMES.CORPSE)
                break;
            const ox = obj.ox, oy = obj.oy;
            const saveNorevive = obj.norevive;
            obj.norevive = 0;
            const { revive_corpse } = await import('./do.js');
            const revived = await revive_corpse(obj, true);
            if (!revived) {
                obj.norevive = saveNorevive;
                res = 0;
            } else if (cansee(ox, oy) && canspotmon(revived)) {
                await pline(`${Monnam(revived)} is resurrected!`);
                learn_it = true;
                exercise(A_WIS, true);
            }
            break;
        }
        case ONAMES.WAN_OPENING:
        case ONAMES.SPE_KNOCK:
        case ONAMES.WAN_LOCKING:
        case ONAMES.SPE_WIZARD_LOCK:
            if (Is_box(obj))
                res = await boxlock(obj, otmp);
            else
                res = 0;
            if (res)
                learn_it = true;
            break;
        case ONAMES.SPE_STONE_TO_FLESH:
            res = await stone_to_flesh_obj(obj);
            break;
        default:
            res = 0;
            break;
        }
    }
    if (learn_it)
        learnwand(otmp);
    return res;
}

// src/zap.c:2428 bhitpile() — apply fhito to every object in the pile at
// (tx,ty). The flat objects list is PREPEND-ordered, so filtering it gives
// the same order C's per-square nexthere chain would.
export async function bhitpile(obj, fhito, tx, ty, zz) {
    let hitanything = 0;

    const pile = (game.level.objects || [])
        .filter(o => o.where === OBJ_FLOOR && o.ox === tx && o.oy === ty);
    if (!pile.length)
        return 0;

    /* hidingunder — hero hiding under the top of the pile; hides_under
       hero forms are not modelled */

    if (obj.otyp === ONAMES.SPE_FORCE_BOLT
        || obj.otyp === ONAMES.WAN_STRIKING) {
        const trap = t_at(tx, ty);
        if (trap?.ttyp === STATUE_TRAP
            && await activate_statue_trap(trap, tx, ty, true))
            learnwand(obj);
    }

    poly_zapped = -1;
    for (const otmp of pile) {
        if (otmp.where !== OBJ_FLOOR || otmp.ox !== tx || otmp.oy !== ty)
            continue;
        hitanything += await fhito(otmp, obj);
    }
    if (poly_zapped >= 0)
        create_polymon(null, poly_zapped);

    /* boulder re-stack — boulders polymorphed mid-pile; recorded */

    return hitanything;
}

// src/zap.c:3415 zapsetup() / :3421 zapwrapup()
export function zapsetup() {
    obj_zapped = false;
}
export async function zapwrapup() {
    /* if do_osshock() set obj_zapped while polying, give a message now */
    if (obj_zapped)
        await You_feel('shuddering vibrations.');
    obj_zapped = false;
}

// src/mon.c:5077 wiz_force_cham_form(), the debug-only monster polymorph
// selector. The ordinary path remains random. A named form is checked with
// the same special-monster rules before newcham receives it.
async function controlled_newcham(mtmp, ncflags) {
    if (!(game.wizard && game.flags?.monpolycontrol))
        return await newcham(mtmp, null, ncflags);

    let prompt = `Change ${noit_mon_nam(mtmp)} @ <${mtmp.mx},${mtmp.my}> into what?`;
    let tryct = 5;
    do {
        if (tryct === 4)
            prompt = prompt.replace(/ into what\?$/, ' into what kind of monster?');

        const answer = mungspaces(await getlin(prompt));
        if (answer[0] === '\x1b' || answer === '*'
            || answer.toLowerCase() === 'random')
            break;

        const mndx = name_to_monplus(answer, null, null);
        if (mndx !== NON_PM && validspecmon(mtmp, mndx))
            return await newcham(mtmp, game.mons[mndx], ncflags);

        await pline("It can't become that.");
    } while (--tryct > 0);

    if (!tryct)
        await pline("That's enough tries!");
    return await newcham(mtmp, null, ncflags);
}

// src/zap.c:158 bhitm(), immediate wand or spell effect on a monster.
export async function bhitm(mtmp, otmp) {
    let wake = true;
    let reveal_invis = false;
    let learn_it = false;
    const role = game.urole?.mnum ?? game.urole?.malenum;
    const double_damage = (role === 'PM_KNIGHT' || role === PMNAMES.PM_KNIGHT)
                          && game.u.uhave?.questart;
    const disguised_mimic = mtmp.data?.mlet === MONSYMS.S_MIMIC
                             && M_AP_TYPE(mtmp) !== M_AP_NOTHING;

    switch (otmp.otyp) {
    case ONAMES.WAN_STRIKING: {
        reveal_invis = true;
        learn_it = cansee(game.bhitpos.x, game.bhitpos.y);
        if (resists_magm(mtmp)) {
            if (disguised_mimic && M_AP_TYPE(mtmp) !== M_AP_MONSTER)
                seemimic(mtmp);
            shieldeff_mon(mtmp);
            await pline('Boing!');
        } else if (game.u.uswallow || rnd(20) < 10 + find_mac(mtmp)) {
            if (disguised_mimic)
                seemimic(mtmp);
            let dmg = d(2, 12);
            if (double_damage)
                dmg *= 2;
            await hit('wand', mtmp, exclam(dmg));
            const resisted = resist(mtmp, otmp.oclass, dmg, true);
            if (resisted && cansee(mtmp.mx, mtmp.my))
                await pline(`${Monnam(mtmp)} resists!`);
        } else {
            if (!disguised_mimic)
                await miss('wand', mtmp);
            learn_it = false;
        }
        break;
    }
    case ONAMES.WAN_POLYMORPH:
    case ONAMES.SPE_POLYMORPH:
    case ONAMES.POT_POLYMORPH: {
        const hasLongWormTag = mtmp.mnum === PMNAMES.PM_LONG_WORM
            && mtmp.mextra?.mcorpsenm !== undefined;

        if (hasLongWormTag) {
            /* A long worm created earlier in this beam is not changed again
               when the beam reaches one of its new tail segments. */
        } else if (resists_magm(mtmp)) {
            shieldeff_mon(mtmp);
        } else if (!resist(mtmp, otmp.oclass, 0, false)) {
            const polyspot = otmp.otyp !== ONAMES.POT_POLYMORPH;
            const give_msg = !Hallucination()
                && (canseemon(mtmp) || engulfing_u(mtmp));

            if (polyspot && (mtmp.minvent || []).length) {
                for (const obj of mtmp.minvent)
                    obj.bypass = 1;
                game.context.bypasses = true;
            }

            if ((mtmp.cham ?? NON_PM) === NON_PM && !rn2(25)) {
                if (canseemon(mtmp)) {
                    await pline(`${Monnam(mtmp)} shudders!`);
                    learn_it = true;
                }
                await xkilled(mtmp, XKILL_NOCORPSE);
            } else {
                let ncflags = polyspot ? NC_VIA_WAND_OR_SPELL : 0;
                if (give_msg)
                    ncflags |= NC_SHOW_MSG;

                let changed = await controlled_newcham(mtmp, ncflags);
                if (!changed && (mtmp.cham ?? NON_PM) !== NON_PM)
                    changed = await newcham(mtmp, game.mons[mtmp.cham], ncflags);
                if (changed && give_msg
                    && (canspotmon(mtmp) || engulfing_u(mtmp)))
                    learn_it = true;
            }

            if (!DEADMONSTER(mtmp) && mtmp.mnum === PMNAMES.PM_LONG_WORM) {
                (mtmp.mextra ||= {}).mcorpsenm = PMNAMES.PM_LONG_WORM;
                game.context.bypasses = true;
            }
        }
        break;
    }
    case ONAMES.WAN_CANCELLATION:
    case ONAMES.SPE_CANCELLATION:
        if (disguised_mimic)
            seemimic(mtmp);
        await cancel_monst(mtmp, otmp, true, true, false);
        break;
    default:
        note_unported_zap(`bhitm:otyp=${otmp.otyp}`);
        wake = false;
        break;
    }

    if (wake && !DEADMONSTER(mtmp))
        await wakeup(mtmp, true);
    if (reveal_invis && !DEADMONSTER(mtmp)
        && cansee(game.bhitpos.x, game.bhitpos.y) && !canspotmon(mtmp))
        map_invisible(game.bhitpos.x, game.bhitpos.y);
    if (learn_it)
        learnwand(otmp);
    return 0;
}

// src/lock.c:1103 doorlock(): apply opening, locking, or striking magic to
// a door.  bhit() calls this after monsters and floor piles, matching C's
// order so a broken door opens vision before the zap continues beyond it.
export async function doorlock(otmp, x, y) {
    const door = game.level?.at(x, y);
    if (!door)
        return false;

    if (door.typ === SDOOR) {
        switch (otmp.otyp) {
        case ONAMES.WAN_OPENING:
        case ONAMES.SPE_KNOCK:
        case ONAMES.WAN_STRIKING:
        case ONAMES.SPE_FORCE_BOLT:
            door.typ = DOOR;
            door.doormask = D_CLOSED | (door.doormask & D_TRAPPED);
            newsym(x, y);
            if (cansee(x, y))
                await pline('A door appears in the wall!');
            if (otmp.otyp === ONAMES.WAN_OPENING
                || otmp.otyp === ONAMES.SPE_KNOCK)
                return true;
            break;
        default:
            return false;
        }
    } else if (!IS_DOOR(door.typ)) {
        return false;
    }

    let msg = null;
    let loudness = 0;
    switch (otmp.otyp) {
    case ONAMES.WAN_LOCKING:
    case ONAMES.SPE_WIZARD_LOCK:
        switch (door.doormask & ~D_TRAPPED) {
        case D_CLOSED:
            msg = 'The door locks!';
            break;
        case D_ISOPEN:
            msg = 'The door swings shut, and locks!';
            break;
        case D_BROKEN:
            msg = 'The broken door reassembles and locks!';
            break;
        case D_NODOOR:
            msg = 'A cloud of dust springs up and assembles itself into a door!';
            break;
        default:
            return false;
        }
        door.doormask = D_LOCKED | (door.doormask & D_TRAPPED);
        block_point(x, y);
        newsym(x, y);
        break;
    case ONAMES.WAN_OPENING:
    case ONAMES.SPE_KNOCK:
        if (!(door.doormask & D_LOCKED))
            return false;
        msg = 'The door unlocks!';
        door.doormask = D_CLOSED | (door.doormask & D_TRAPPED);
        break;
    case ONAMES.WAN_STRIKING:
    case ONAMES.SPE_FORCE_BOLT: {
        if (!(door.doormask & (D_LOCKED | D_CLOSED)))
            return false;
        if (door.doormask & D_TRAPPED) {
            door.doormask = D_NODOOR;
            unblock_point(x, y);
            newsym(x, y);
            note_unported_zap('doorlock:trapped_door');
            loudness = 40;
            break;
        }
        const sawit = cansee(x, y);
        door.doormask = D_BROKEN;
        recalc_block_point(x, y);
        const seeit = cansee(x, y);
        newsym(x, y);
        if (game.flags?.verbose !== false) {
            if ((sawit || seeit) && !Unaware())
                await pline_The('door crashes open!');
            else if (!Deaf())
                await You_hear('a crashing sound.');
        }
        if (game.vision_full_recalc)
            vision_recalc(0);
        loudness = 20;
        break;
    }
    default:
        return false;
    }

    if (msg && cansee(x, y))
        await pline(msg);
    if (loudness)
        wake_nearto(x, y, loudness);
    return true;
}

// src/zap.c:3628 zap_map() — per-square terrain effects of a lateral zap.
// Trap explosion applies to cancellation only; the engraving arm fires for
// down zaps only; secret-door reveals belong to striking/opening/locking.
// A lateral polymorph over plain floor does nothing here.
export async function zap_map(x, y, obj) {
    const ttmp = t_at(x, y);
    let learn_it = false;
    if (ttmp && (obj.otyp === ONAMES.WAN_CANCELLATION
                 || obj.otyp === ONAMES.SPE_CANCELLATION))
        note_unported_zap('zap_map:maybe_explode_trap');
    if (game.u.dz > 0) {
        const engraving = engr_at(x, y);
        if (engraving && engraving.engr_type !== HEADSTONE) {
            switch (obj.otyp) {
            case ONAMES.WAN_POLYMORPH:
            case ONAMES.SPE_POLYMORPH: {
                del_engr(engraving);
                const replacement = random_engraving();
                make_engr_at(x, y, replacement.text, replacement.pristine,
                             game.moves, 0);
                break;
            }
            case ONAMES.WAN_CANCELLATION:
            case ONAMES.SPE_CANCELLATION:
            case ONAMES.WAN_MAKE_INVISIBLE:
                del_engr(engraving);
                break;
            case ONAMES.WAN_TELEPORTATION:
            case ONAMES.SPE_TELEPORT_AWAY:
                await rloc_engr(engraving);
                break;
            case ONAMES.SPE_STONE_TO_FLESH:
                if (engraving.engr_type === ENGRAVE) {
                    await pline_The(Hallucination()
                        ? 'floor runs like butter!'
                        : 'edges on the floor get smoother.');
                    wipe_engr_at(x, y, d(2, 4), true);
                }
                break;
            case ONAMES.WAN_STRIKING:
            case ONAMES.SPE_FORCE_BOLT:
                wipe_engr_at(x, y, d(2, 4), true);
                break;
            default:
                break;
            }
        }
    }
    const terrainType = game.level.at(x, y)?.typ;
    const drawbridge = IS_DRAWBRIDGE(terrainType)
        || is_drawbridge_wall(x, y) >= 0;
    if (drawbridge
        && (obj.otyp === ONAMES.WAN_STRIKING
            || obj.otyp === ONAMES.SPE_FORCE_BOLT
            || obj.otyp === ONAMES.WAN_OPENING
            || obj.otyp === ONAMES.SPE_KNOCK
            || obj.otyp === ONAMES.WAN_LOCKING
            || obj.otyp === ONAMES.SPE_WIZARD_LOCK))
        note_unported_zap('zap_map:drawbridge');
    if (obj.otyp === ONAMES.WAN_PROBING && ttmp) {
        const already_seen = !!ttmp.tseen;
        const hallu = !!Hallucination();
        ttmp.tseen = 1;
        newsym(x, y);
        if (!already_seen || hallu) {
            const name = trapname(ttmp.ttyp, false);
            const use_the = hallu && !rn2(4);
            await You(`find ${use_the ? `the ${name}` : an(name)}${
                use_the ? '!' : '.'}`);
            learn_it = !hallu;
        }
    }
    if (obj.otyp === ONAMES.WAN_PROBING && terrainType === SDOOR) {
        const door = game.level.at(x, y);
        cvt_sdoor_to_door(door);
        recalc_block_point(x, y);
        newsym(x, y);
        if (cansee(x, y)) {
            await pline('Probing reveals a secret door.');
            learn_it = true;
        } else {
            note_unported_zap('zap_map:probing_unseen_secret_door');
        }
    }
    if (obj.otyp === ONAMES.WAN_PROBING && game.u.dz > 0
        && (terrainType === ICE || IS_FURNITURE(terrainType))) {
        await force_decor(true);
        learn_it = true;
    }
    if (obj.otyp === ONAMES.WAN_PROBING
        && (!cansee(x, y) || terrainType === SCORR))
        note_unported_zap('zap_map:probing');
    if (learn_it)
        learnwand(obj);
}

const flash_types = [
    'magic missile', 'bolt of fire', 'bolt of cold', 'sleep ray', 'death ray',
    'bolt of lightning', '', '', '', '',
    'magic missile', 'fireball', 'cone of cold', 'sleep ray',
    'finger of death', 'bolt of lightning', '', '', '', '',
    'blast of missiles', 'blast of fire', 'blast of frost',
    'blast of sleep gas', 'blast of disintegration', 'blast of lightning',
    'blast of poison gas', 'blast of acid', '', '',
];

// src/zap.c:89 zaptype().
function zaptype(type) {
    if (type <= -30 && type >= -39)
        type += 30;
    return Math.abs(type);
}

export function flash_str(typ, nohallu = false) {
    /* nohallu: suppress hallucination (for death reasons) */
    typ = zaptype(typ);
    if (Hallucination() && !nohallu) {
        /* always return "blast of <something>";
           this could be extended with hallucinatory rays, but probably
           not worth it at this time */
        return `blast of ${rnd_hallublast()}`;
    }
    return flash_types[typ];
}

// src/zap.c:4705 zap_hit(). Hero spell bonuses remain an explicit gap.
function zap_hit(ac, spell_type) {
    const chance = rn2(20);
    if (spell_type)
        note_unported_zap('zap_hit:spell_bonus');
    if (!chance)
        return rnd(10) < ac;
    if (ac < 0)
        ac = -rnd(-ac);
    return 3 - chance < ac;
}

const DMG_DESTROY_SCALE = 5;
const MAX_ITEMS_DESTROYED = 20;

const destroy_strings = [
    ['freezes and shatters', 'freeze and shatter', 'shattered potion'],
    ['boils and explodes', 'boil and explode', 'boiling potion'],
    ['ignites and explodes', 'ignite and explode', 'exploding potion'],
    ['catches fire and burns', 'catch fire and burn', 'burning scroll'],
    ['catches fire and burns', '', 'burning book'],
    ['turns to dust and vanishes', '', ''],
    ['breaks apart and explodes', '', 'exploding wand'],
];

function destroyable(obj, dmgtyp) {
    if (obj.oartifact || (obj.in_use && obj.quan === 1))
        return false;

    if (dmgtyp === ATTKS.AD_FIRE) {
        if (obj.otyp === ONAMES.SCR_FIRE || obj.otyp === ONAMES.SPE_FIREBALL)
            return false;
        return obj.otyp === ONAMES.GLOB_OF_GREEN_SLIME
            || obj.oclass === OCLASSES.POTION_CLASS
            || obj.oclass === OCLASSES.SCROLL_CLASS
            || obj.oclass === OCLASSES.SPBOOK_CLASS;
    }
    if (dmgtyp === ATTKS.AD_COLD)
        return obj.oclass === OCLASSES.POTION_CLASS
            && obj.otyp !== ONAMES.POT_OIL;
    if (dmgtyp === ATTKS.AD_ELEC)
        return (obj.oclass === OCLASSES.RING_CLASS
                || obj.oclass === OCLASSES.WAND_CLASS)
            && obj.otyp !== ONAMES.RIN_SHOCK_RESISTANCE
            && obj.otyp !== ONAMES.WAN_LIGHTNING;
    return false;
}

function inventory_resistance_check(dmgtyp) {
    const prop = dmgtyp === ATTKS.AD_COLD ? 'COLD_RES'
               : dmgtyp === ATTKS.AD_FIRE ? 'FIRE_RES'
                 : dmgtyp === ATTKS.AD_ELEC ? 'SHOCK_RES' : null;
    let probability = prop
        && (((game.u.uprops?.[prop] || 0)
             & (W_ARMOR | W_ACCESSORY | W_WEP | W_ART)) !== 0) ? 99 : 0;

    if (!probability && game.u.uarmc?.otyp === ONAMES.DWARVISH_CLOAK
        && (dmgtyp === ATTKS.AD_COLD || dmgtyp === ATTKS.AD_FIRE))
        probability = 90;
    return probability ? rn2(100) < probability : false;
}

export function m_useup(mon, obj) {
    if (obj.quan > 1) {
        obj.quan--;
        obj.owt = weight(obj);
    } else {
        obj_extract_self(obj);
        const at = mon.minvent?.indexOf(obj) ?? -1;
        if (at >= 0)
            mon.minvent.splice(at, 1);
    }
}

async function recharge_ring_neutral(obj) {
    if ((obj.spe | 0) > rn2(7) || (obj.spe | 0) <= -5) {
        await pline(`${Yobjnam2(obj, 'pulsate')} momentarily, then ${
            otense(obj, 'explode')}!`);
        const amount = rnd(3 * Math.abs(obj.spe | 0));
        useup(obj);
        const damage = game.u.uprops?.HALF_PHDAM
            ? Math.trunc((amount + 1) / 2) : amount;
        const { losehp } = await import('./hack.js');
        await losehp(damage, 'exploding ring', KILLED_BY_AN);
    } else {
        await pline(`${Yname2(obj)} spins clockwise for a moment.`);
        obj.spe = (obj.spe | 0) + 1;
    }
}

async function maybe_destroy_item(carrier, obj, dmgtyp) {
    const u_carry = carrier === game.youmonst;
    const vis = !u_carry && canseemon(carrier);
    let dmg = 0, dindx = 0, quan = 0;
    let xresist = false, skip = false, chargeit = false;

    if (u_carry && inventory_resistance_check(dmgtyp))
        return 0;

    switch (dmgtyp) {
    case ATTKS.AD_COLD:
        quan = obj.quan;
        dmg = rnd(4);
        break;
    case ATTKS.AD_FIRE:
        xresist = obj.oclass !== OCLASSES.POTION_CLASS
            && obj.otyp !== ONAMES.GLOB_OF_GREEN_SLIME
            && (u_carry ? Fire_resistance() : resists_fire(carrier));
        if (obj.otyp === ONAMES.SPE_BOOK_OF_THE_DEAD) {
            skip = true;
            if (u_carry ? !game.u.ublind : vis)
                await pline(`${The(xname(obj))} glows a strange dark red, but remains intact.`);
            break;
        }
        quan = obj.quan;
        if (obj.oclass === OCLASSES.POTION_CLASS) {
            dindx = obj.otyp === ONAMES.POT_OIL ? 2 : 1;
            dmg = rnd(6);
        } else if (obj.oclass === OCLASSES.SCROLL_CLASS) {
            dindx = 3;
            dmg = 1;
        } else if (obj.oclass === OCLASSES.SPBOOK_CLASS) {
            dindx = 4;
            dmg = 1;
        } else {
            dindx = 1;
            dmg = Math.trunc(((obj.owt | 0) + 19) / 20);
        }
        break;
    case ATTKS.AD_ELEC:
        xresist = obj.oclass !== OCLASSES.RING_CLASS
            && (u_carry ? Shock_resistance() : resists_elec(carrier));
        quan = obj.quan;
        if (obj.oclass === OCLASSES.RING_CLASS) {
            if ((((obj.owornmask | 0) & W_RING) && game.u.uarmg
                 && !is_metallic(game.u.uarmg))
                || obj.otyp === ONAMES.RIN_SHOCK_RESISTANCE) {
                skip = true;
            } else if (game.objects[obj.otyp].oc_charged && rn2(3)) {
                chargeit = true;
            } else {
                dindx = 5;
            }
        } else {
            dindx = 6;
            dmg = rnd(10);
        }
        break;
    default:
        skip = true;
        note_unported_zap(`maybe_destroy_item:dmgtyp=${dmgtyp}`);
        break;
    }

    if (chargeit) {
        if (u_carry)
            await recharge_ring_neutral(obj);
    } else if (!skip) {
        const osym = obj.oclass;
        if (obj.in_use)
            --quan;
        let cnt = 0;
        for (let i = 0; i < quan; ++i)
            if (!rn2(3))
                ++cnt;
        if (!cnt)
            return 0;

        if (u_carry || vis) {
            const mult = cnt === 1 ? (quan === 1 ? '' : 'One of ')
                       : cnt < quan ? 'Some of '
                         : quan === 2 ? 'Both of ' : 'All of ';
            const name = cnt === 1 && quan === 1 ? Yname2(obj) : yname(obj);
            await pline(`${mult}${name} ${destroy_strings[dindx][cnt > 1 ? 1 : 0]}!`);
        }
        if (u_carry && osym === OCLASSES.POTION_CLASS
            && dmgtyp !== ATTKS.AD_COLD
            && (!breathless(game.youmonst.data)
                || haseyes(game.youmonst.data)))
            await potionbreathe(obj);

        for (let i = 0; i < cnt; ++i) {
            if (u_carry)
                useup(obj);
            else
                m_useup(carrier, obj);
        }
        if (dmg) {
            if (!u_carry)
                return xresist ? 0 : dmg;
            if (xresist) {
                await You("aren't hurt!");
            } else {
                let how = destroy_strings[dindx][2];
                if (dmgtyp === ATTKS.AD_FIRE
                    && osym === OCLASSES.FOOD_CLASS)
                    how = 'exploding glob of slime';
                const { losehp } = await import('./hack.js');
                await losehp(dmg, cnt === 1 ? how : makeplural(how),
                             cnt === 1 ? KILLED_BY_AN : KILLED_BY);
                exercise(A_STR, false);
            }
        }
    }
    return dmg;
}

// src/zap.c:5965 destroy_items(). Damage limits the number of eligible stacks;
// reservoir sampling gives later stacks the same chance as earlier ones.
export async function destroy_items(mon, osym, dmg_in) {
    let limit = Math.trunc(dmg_in / DMG_DESTROY_SCALE);
    if (dmg_in % DMG_DESTROY_SCALE > rn2(DMG_DESTROY_SCALE))
        ++limit;
    limit = Math.min(limit, MAX_ITEMS_DESTROYED);
    if (limit < 1)
        return 0;

    const u_carry = mon === game.youmonst;
    const invent = u_carry ? game.invent : (mon.minvent || []);
    const selected = [];
    let eligible = 0;

    for (const obj of invent) {
        if (!destroyable(obj, osym))
            continue;
        const i = eligible < limit ? eligible : rn2(eligible);
        ++eligible;
        if (i >= limit)
            continue;
        const prop = game.objects[obj.otyp].oc_oprop;
        selected[i] = {
            obj,
            deferred: u_carry && (((obj.owornmask | 0)
                                   && (prop === LEVITATION || prop === FLYING))
                                  || (obj.otyp === ONAMES.POT_WATER
                                      && game.u.ulycn >= 0)),
        };
    }

    let damage = 0;
    for (let defer = 0; defer <= 1; ++defer) {
        for (const item of selected.slice(0, Math.min(eligible, limit))) {
            if (!item || item.deferred !== !!defer || !invent.includes(item.obj))
                continue;
            damage += await maybe_destroy_item(mon, item.obj, osym);
        }
    }
    return damage;
}

// src/zap.c:4238 zhitm(). The common missile, elemental, and sleep-ray paths
// are complete. Other ray families stay marked until their item-destruction
// and status effects are ported together.
export function sleep_monst(mon, amount, how) {
    const ptr = game.mons[mon.mnum];
    if (how >= 0 && !mon.msleeping && !mon.mfrozen
        && ptr.mlet === MONSYMS.S_MIMIC
        && (M_AP_TYPE(mon) === M_AP_FURNITURE
            || M_AP_TYPE(mon) === M_AP_OBJECT))
        seemimic(mon);

    if (resists_sleep(mon) || defended(mon, ATTKS.AD_SLEE)
        || (how >= 0 && resist(mon, how, 0, false))) {
        shieldeff_mon(mon);
    } else if (mon.mcanmove) {
        finish_meating(mon);
        amount += mon.mfrozen || 0;
        if (amount > 0) {
            mon.mcanmove = 0;
            mon.mfrozen = Math.min(amount, 127);
        } else {
            mon.msleeping = 1;
        }
        return true;
    }
    return false;
}

export async function zhitm(mon, type, nd) {
    const damgtype = zaptype(type) % 10;
    let damage = 0;

    switch (damgtype) {
    case 0:
        if (resists_magm(mon) || defended(mon, ATTKS.AD_MAGM)) {
            shieldeff_mon(mon);
            break;
        }
        damage = d(nd, 6);
        break;
    case 1: {
        if (resists_fire(mon) || defended(mon, ATTKS.AD_FIRE)) {
            shieldeff_mon(mon);
            break;
        }
        damage = d(nd, 6);
        const orig_damage = damage;
        if (resists_cold(mon))
            damage += 7;
        if (await burnarmor(mon) && !rn2(3)) {
            damage += await destroy_items(mon, ATTKS.AD_FIRE, orig_damage);
            await ignite_items(mon.minvent || []);
        }
        break;
    }
    case 2:
        if (resists_cold(mon) || defended(mon, ATTKS.AD_COLD)) {
            shieldeff_mon(mon);
            break;
        }
        damage = d(nd, 6);
        {
            const orig_damage = damage;
            if (resists_fire(mon))
                damage += d(nd, 3);
            if (!rn2(3))
                damage += await destroy_items(mon, ATTKS.AD_COLD, orig_damage);
        }
        break;
    case 3:
        sleep_monst(mon, d(nd, 25),
                    type === 3 ? OCLASSES.WAND_CLASS : 0);
        break;
    case 4: {
        /* src/zap.c:4299 ZT_DEATH. Disintegration breath shares this zap
           number but has armor-destruction rules which remain separate. */
        if (Math.abs(type) === 24) {
            note_unported_zap('zhitm:disintegration');
            return 0;
        }
        const ptr = game.mons[mon.mnum];
        if (mon.mnum === PMNAMES.PM_DEATH) {
            healmon(mon, Math.trunc(mon.mhpmax * 3 / 2),
                    Math.trunc(mon.mhpmax / 2));
            if (mon.mhpmax >= 1000)
                mon.mhpmax = 999;
            break;
        }
        if (nonliving(ptr) || is_demon(ptr) || is_vampshifter(mon)
            || resists_magm(mon)) {
            shieldeff_mon(mon);
            break;
        }
        type = -1; /* death rays do not permit a saving throw */
        damage = mon.mhp + 1;
        break;
    }
    case 5: {
        damage = d(nd, 6);
        const orig_damage = damage;
        if (resists_elec(mon) || defended(mon, ATTKS.AD_ELEC)) {
            shieldeff_mon(mon);
            damage = 0;
        }
        if (!resists_blnd(mon)
            && !(type > 0 && engulfing_u(mon)) && nd > 2) {
            const blind = rnd(50);
            mon.mcansee = 0;
            mon.mblinded = Math.min(127, (mon.mblinded | 0) + blind);
        }
        if (!rn2(3))
            damage += await destroy_items(mon, ATTKS.AD_ELEC, orig_damage);
        break;
    }
    default:
        note_unported_zap(`zhitm:type=${damgtype}`);
        return 0;
    }

    if (damage > 0 && type >= 0
        && resist(mon, type < 10 ? OCLASSES.WAND_CLASS : 0, 0, false))
        damage = Math.trunc(damage / 2);
    mon.mhp -= damage;
    return damage;
}

// src/zap.c:4401 zhitu(), a ray striking the hero. The fire arm is shared by
// wands, spells, breath, and rebounding beams.
async function zhitu(type, nd, fltxt, sx, sy) {
    const abstyp = zaptype(type);
    let damage = 0;

    switch (abstyp % 10) {
    case 0: { /* ZT_MAGIC_MISSILE */
        const antimagic = !!(game.u.intrinsic?.HAntimagic
                             || game.u.uprops?.ANTIMAGIC
                             || game.u.uprops?.MAGIC_RES);
        if (antimagic) {
            note_unported_zap('zhitu:magic_missile_shieldeff');
            await pline_The('missiles bounce off!');
            if (game.buzzer)
                game.buzzer.seen_resistance =
                    (game.buzzer.seen_resistance ?? 0) | M_SEEN_MAGR;
        } else {
            damage = d(nd, 6);
            exercise(A_STR, false);
            if (game.buzzer)
                game.buzzer.seen_resistance =
                    (game.buzzer.seen_resistance ?? 0) & ~M_SEEN_MAGR;
        }
        break;
    }
    case 1: { /* ZT_FIRE */
        const origDamage = d(nd, 6);
        if (Fire_resistance()) {
            note_unported_zap('zhitu:fire_shieldeff');
            await You("don't feel hot!");
        } else {
            damage = origDamage;
        }
        /* burn_away_slime() has no effect without an active slime timeout. */
        if (await burnarmor(game.youmonst)) {
            if (!rn2(3))
                await destroy_items(game.youmonst, ATTKS.AD_FIRE, origDamage);
            if (!rn2(3))
                await ignite_items(game.invent);
        }
        break;
    }
    case 2: { /* ZT_COLD */
        const origDamage = d(nd, 6);
        if (Cold_resistance()) {
            note_unported_zap('zhitu:cold_shieldeff_golem');
            await You("don't feel cold.");
        } else {
            damage = origDamage;
        }
        if (!rn2(3))
            await destroy_items(game.youmonst, ATTKS.AD_COLD, origDamage);
        break;
    }
    default:
        note_unported_zap(`zhitu:type=${abstyp % 10}`);
        return;
    }

    if (damage && game.u.uprops?.HALF_SPDAM && abstyp < 20)
        damage = Math.trunc((damage + 1) / 2);
    const self = game.flags?.female ? 'herself' : 'himself';
    const killer = type < 0 ? fltxt : `${fltxt} ${
        abstyp < 10 ? 'zapped' : abstyp < 20 ? 'cast' : 'exhaled'} by ${self}`;
    const { losehp } = await import('./hack.js');
    await losehp(damage, killer, KILLED_BY_AN);
}

// src/zap.c:4664 bounce_dir().
function bounce_dir(sx, sy, delta, bounceback) {
    if (!delta.dx || !delta.dy || (bounceback > 0 && !rn2(bounceback))) {
        delta.dx = -delta.dx;
        delta.dy = -delta.dy;
        return;
    }

    const lsx = sx - delta.dx, lsy = sy - delta.dy;
    let bounce = 0;
    const vert = game.level?.at(sx, lsy);
    if (isok(sx, lsy) && vert && ZAP_POS(vert.typ)
        && !closed_door(sx, lsy)
        && (IS_ROOM(vert.typ)
            || (isok(sx + delta.dx, lsy)
                && ZAP_POS(game.level.at(sx + delta.dx, lsy).typ))))
        bounce = 1;
    const horiz = game.level?.at(lsx, sy);
    if (isok(lsx, sy) && horiz && ZAP_POS(horiz.typ)
        && !closed_door(lsx, sy)
        && (IS_ROOM(horiz.typ)
            || (isok(lsx, sy + delta.dy)
                && ZAP_POS(game.level.at(lsx, sy + delta.dy).typ)))) {
        if (!bounce || rn2(2))
            bounce = 2;
    }
    switch (bounce) {
    case 0:
        delta.dx = -delta.dx;
        delta.dy = -delta.dy;
        break;
    case 1:
        delta.dy = -delta.dy;
        break;
    case 2:
        delta.dx = -delta.dx;
        break;
    }
}

const zap_colors = [
    HI_ZAP, CLR_ORANGE, CLR_WHITE, HI_ZAP,
    CLR_BLACK, CLR_WHITE, CLR_GREEN, CLR_YELLOW,
];

// src/display.c:2461 zapdir_to_glyph(). A zap type changes the color, while
// these four cmap entries supply the active symbol-set character.
function zapdir_cmap(dx, dy) {
    if (dx === dy)
        return cmap_names.S_lslant;
    if (dx && dy)
        return cmap_names.S_rslant;
    return dx ? cmap_names.S_hbeam : cmap_names.S_vbeam;
}

// src/muse.c:2836 ureflects(), outermost equipment first.
export async function ureflects(fmt = null, str = null) {
    const mask = game.u.uprops?.REFLECTING | 0;
    let source = null;
    let identify = 0;

    if (mask & W_ARMS) {
        source = 'shield';
        identify = ONAMES.SHIELD_OF_REFLECTION;
    } else if (mask & W_WEP) {
        source = 'weapon';
    } else if (mask & W_AMUL) {
        source = 'medallion';
        identify = ONAMES.AMULET_OF_REFLECTION;
    } else if (mask & W_ARM) {
        source = game.u.uskin ? 'luster' : 'armor';
    }
    if (!source) {
        note_unported_zap('ureflects:source');
        source = 'body';
    }
    if (fmt !== null && str !== null) {
        const message = fmt.replace('%s', str).replace('%s', source);
        await pline(message);
    } else {
        await pline(`But it reflects from your ${source}!`);
    }
    if (identify)
        makeknown(identify);
}

// src/zap.c:4598 burn_floor_objects(). Fire consumes eligible paper and slime
// stacks, then lights every exposed fuel source left on the square.
export async function burn_floor_objects(x, y, give_feedback, u_caused) {
    const at = () => (game.level?.objects || []).filter(obj =>
        obj.where === OBJ_FLOOR && obj.ox === x && obj.oy === y);
    let count = 0;

    for (const obj of [...at()]) {
        const eligible = obj.oclass === OCLASSES.SCROLL_CLASS
            || obj.oclass === OCLASSES.SPBOOK_CLASS
            || (obj.oclass === OCLASSES.FOOD_CLASS
                && obj.otyp === ONAMES.GLOB_OF_GREEN_SLIME);
        if (!eligible || obj.otyp === ONAMES.SCR_FIRE
            || obj.otyp === ONAMES.SPE_FIREBALL || obj_resists(obj, 2, 100))
            continue;

        const quantity = obj.quan | 0;
        let destroyed = 0;
        for (let i = quantity; i > 0; --i)
            if (!rn2(3))
                ++destroyed;
        if (!destroyed)
            continue;

        let singular = '', plural = '';
        if (give_feedback) {
            const originalQuantity = obj.quan;
            obj.quan = 1;
            singular = u_at(x, y) ? xname(obj) : distant_name(obj, xname);
            obj.quan = 2;
            plural = u_at(x, y) ? xname(obj) : distant_name(obj, xname);
            obj.quan = originalQuantity;
        }

        if (u_caused) {
            await useupf(obj, destroyed);
        } else if (destroyed < quantity) {
            obj.quan -= destroyed;
            obj.owt = weight(obj);
        } else {
            delobj(obj);
        }
        count += destroyed;
        if (give_feedback) {
            if (destroyed > 1)
                await pline(`${destroyed} ${plural} burn.`);
            else
                await pline(`${An(singular)} burns.`);
        }
    }
    await ignite_items(at());
    return count;
}

// src/zap.c:5088 start_melt_ice_timeout(). Newly made ice normally receives a
// random level timer between 50 and 2000 turns; a failed search leaves it
// permanent.
export function start_melt_ice_timeout(x, y, minTime = 0) {
    let when = Number(minTime) || 0;
    if (when < 49)
        when = 49;
    while (++when <= 2000) {
        if (!rn2((2000 - when) + 50))
            break;
    }
    if (when <= 2000) {
        const packed = ((x & 0xffff) << 16) | (y & 0xffff);
        start_timer(when, TIMER_LEVEL, MELT_ICE_AWAY, packed);
    }
}

// src/zap.c:5040 melt_ice(). Restore the water hidden under ice, discard or
// convert traps that fall into it, resume ice-delayed object timers, then
// apply the new liquid terrain to an occupant of the square.
export async function melt_ice(x, y, msg = null) {
    const loc = game.level?.at(x, y);
    if (!loc || !is_ice(x, y))
        return;

    if (loc.typ === DRAWBRIDGE_UP || loc.typ === DRAWBRIDGE_DOWN) {
        loc.drawbridgemask = (loc.drawbridgemask ?? 0) & ~DB_ICE;
    } else {
        loc.typ = loc.icedpool === ICED_POOL ? POOL : MOAT;
        loc.icedpool = 0;
    }

    const packed = ((x & 0xffff) << 16) | (y & 0xffff);
    game.timer_base = (game.timer_base || []).filter(timer => {
        if (timer.func_index !== MELT_ICE_AWAY)
            return true;
        const arg = timer.arg?.a_long ?? timer.arg;
        return arg !== packed;
    });

    const trap = t_at(x, y);
    if (trap) {
        const trappedMonster = m_at(x, y);
        if (trappedMonster?.mtrapped)
            trappedMonster.mtrapped = 0;
        if (trap.ttyp === LANDMINE || trap.ttyp === BEAR_TRAP) {
            const obj = mksobj(trap.ttyp === LANDMINE
                ? ONAMES.LAND_MINE : ONAMES.BEARTRAP, true, false);
            obj.quan = 1;
            obj.owt = weight(obj);
            obj.opoisoned = 0;
            place_object(obj, x, y);
            stackobj(obj);
            deltrap(trap);
        } else if (trap.ttyp !== MAGIC_PORTAL
                   && trap.ttyp !== VIBRATING_SQUARE) {
            deltrap(trap);
        }
    }

    obj_ice_effects(x, y, false);
    const { unearth_objs } = await import('./mklev.js');
    unearth_objs(x, y);
    if (Underwater())
        vision_recalc(1);
    newsym(x, y);
    if (cansee(x, y) || u_at(x, y))
        await Norep(msg || 'The ice crackles and melts.');

    let boulder = sobj_at(ONAMES.BOULDER, x, y);
    if (boulder) {
        if (cansee(x, y))
            await pline(An(xname(boulder)) + ' settles...');
        const { boulder_hits_pool } = await import('./do.js');
        do {
            obj_extract_self(boulder);
            await boulder_hits_pool(boulder, x, y, false);
            boulder = is_pool(x, y)
                ? sobj_at(ONAMES.BOULDER, x, y) : null;
        } while (boulder);
        newsym(x, y);
    }

    if (u_at(x, y)) {
        const { spoteffects } = await import('./hack.js');
        await spoteffects(true);
    } else if (is_pool(x, y)) {
        const monster = m_at(x, y);
        if (monster) {
            const { minliquid } = await import('./mon.js');
            await minliquid(monster);
        }
    }
}

// src/zap.c:5141 zap_over_floor(). Elemental rays alter terrain before their
// remaining range is applied to the next beam square.
export async function zap_over_floor(x, y, type, ignoremon = false) {
    const damgtype = zaptype(type) % 10;
    const loc = game.level?.at(x, y);
    if (!loc)
        return 0;
    const seeIt = cansee(x, y);
    const fire = damgtype === ATTKS.AD_FIRE - ATTKS.AD_MAGM;
    const cold = damgtype === ATTKS.AD_COLD - ATTKS.AD_MAGM;
    let rangemod = 0;

    if (fire) {
        let trap = t_at(x, y);
        if (trap?.ttyp === WEB) {
            if (seeIt)
                await Norep('A web bursts into flames!');
            deltrap(trap);
            trap = null;
            if (seeIt)
                newsym(x, y);
        }

        if (is_ice(x, y)) {
            await melt_ice(x, y);
        } else if (is_pool(x, y)) {
            const onWaterLevel = Is_waterlevel(game.u.uz);
            let message = !Deaf() ? 'You hear hissing gas.'
                : type >= 0 ? 'That seemed remarkably uneventful.' : null;

            if (!onWaterLevel)
                create_gas_cloud(x, y, rnd(5), 0);

            if (loc.typ !== POOL) {
                trap = null;
                if (onWaterLevel)
                    message = (seeIt || !Deaf()) ? 'Some water boils.' : null;
                else if (seeIt)
                    message = 'Some water evaporates.';
            } else {
                rangemod -= 3;
                loc.typ = ROOM;
                loc.flags = 0;
                const { maketrap } = await import('./mklev.js');
                trap = maketrap(x, y, PIT);
                if (seeIt)
                    message = 'The water evaporates.';
            }
            if (message)
                await Norep(message);

            if (loc.typ === ROOM) {
                const occupant = m_at(x, y);
                if (occupant && is_swimmer(occupant.data)
                    && occupant.mundetected) {
                    occupant.mundetected = 0;
                }
                newsym(x, y);
                if (trap) {
                    if (u_at(x, y))
                        await dotrap(trap, NO_TRAP_FLAGS);
                    else if (occupant)
                        await mintrap(occupant, NO_TRAP_FLAGS);
                }
            }
        }
    } else if (cold
               && (is_pool(x, y) || is_lava(x, y)
                   || loc.typ === LAVAWALL)) {
        const lavawall = loc.typ === LAVAWALL;
        const lava = is_lava(x, y) || lavawall;
        const moat = is_moat(x, y);
        const chance = Math.max(2,
            5 + (game.level?.flags?.temperature ?? 0) * 10);

        if (IS_WATERWALL(loc.typ) || (lavawall && rn2(chance))) {
            if (seeIt) {
                await pline_The(`${hliquid(lavawall ? 'lava' : 'water')} `
                    + 'freezes for a moment.');
            } else {
                await You_hear('a soft crackling.');
            }
            rangemod -= 1000;
        } else {
            const waterName = waterbody_name(x, y);
            rangemod -= 3;
            if (loc.typ === DRAWBRIDGE_UP) {
                loc.drawbridgemask = ((loc.drawbridgemask ?? 0) & ~DB_UNDER)
                    | (lava ? DB_FLOOR : DB_ICE);
            } else {
                loc.icedpool = lava ? 0
                    : loc.typ === POOL ? ICED_POOL : ICED_MOAT;
                if (lavawall) {
                    const vertical = (isok(x, y - 1)
                                      && IS_WALL(game.level.at(x, y - 1).typ))
                        || (isok(x, y + 1)
                            && IS_WALL(game.level.at(x, y + 1).typ));
                    loc.typ = vertical ? VWALL : HWALL;
                    const { fix_wall_spines } = await import('./mklev.js');
                    fix_wall_spines(Math.max(0, x - 1), Math.max(0, y - 1),
                                    Math.min(79, x + 1), Math.min(20, y + 1));
                } else {
                    loc.typ = lava ? ROOM : ICE;
                }
            }

            const { bury_objs } = await import('./mklev.js');
            bury_objs(x, y);
            if (seeIt) {
                if (lava) {
                    await Norep(`The ${hliquid('lava')} cools and solidifies.`);
                } else if (moat) {
                    await Norep(`The ${waterName} is bridged with ice!`);
                } else {
                    await Norep(`The ${hliquid('water')} freezes.`);
                }
                newsym(x, y);
            } else if (!lava) {
                await You_hear('a crackling sound.');
            }

            if (u_at(x, y)) {
                if (game.u.uinwater) {
                    game.u.uinwater = 0;
                    game.u.uundetected = 0;
                    await docrt();
                    game.vision_full_recalc = 1;
                } else if (game.u.utrap
                           && game.u.utraptype === TT_LAVA) {
                    if (Passes_walls()) {
                        await You('pass through the now-solid rock.');
                        game.u.utrap = 0;
                        game.u.utraptype = 0;
                    } else {
                        game.u.utrap = rn1(50, 20);
                        game.u.utraptype = TT_INFLOOR;
                        await You('are firmly stuck in the cooling rock.');
                    }
                }
            } else {
                const occupant = m_at(x, y);
                if (occupant && is_swimmer(occupant.data)
                    && occupant.mundetected) {
                    occupant.mundetected = 0;
                    newsym(x, y);
                }
            }

            if (!lava) {
                start_melt_ice_timeout(x, y, 0);
                obj_ice_effects(x, y, true);
            }
        }
    } else if (cold && is_ice(x, y)) {
        const packed = ((x & 0xffff) << 16) | (y & 0xffff);
        const timer = (game.timer_base || []).find(candidate =>
            candidate.func_index === MELT_ICE_AWAY
            && (candidate.arg?.a_long ?? candidate.arg) === packed);
        if (timer) {
            const remaining = timer.timeout - (game.moves ?? 0);
            game.timer_base.splice(game.timer_base.indexOf(timer), 1);
            start_melt_ice_timeout(x, y, remaining);
        }
    } else if (damgtype === ATTKS.AD_DRST - ATTKS.AD_MAGM
               && ZAP_POS(loc.typ)) {
        create_gas_cloud(x, y, 1, 8);
    }
    if (fire) {
        if (await burn_floor_objects(x, y, false, type > 0)
            && couldsee(x, y)) {
            newsym(x, y);
            await You(`${!Blind() ? 'see a puff' : 'smell a whiff'} of smoke.`);
        }
    }
    const mon = m_at(x, y);
    if (!ignoremon && mon)
        await wakeup(mon, type >= 0);
    return rangemod;
}

// src/zap.c:4780 dobuzz(). This ports the lateral beam walk, monster hit,
// death, and ordinary terrain bounce spine used by wand and spell rays.
// sayhit/saymiss: report out of sight hit/miss events; forcemiss: an
// inexperienced monster wand user always misses (src/zap.c:4780).
export async function dobuzz(type, nd, startx, starty, ddx, ddy,
                             sayhit = true, saymiss = false, forcemiss = false) {
    if (game.u.uswallow) {
        note_unported_zap('dobuzz:swallowed');
        return;
    }

    let range = rn1(7, 7);
    if (!ddx && !ddy)
        range = 1;
    let sx = startx, sy = starty;
    const delta = { dx: ddx, dy: ddy };
    const beam_cells = [];
    const damgtype = zaptype(type) % 10;

    try {
        while (range-- > 0) {
            const lsx = sx, lsy = sy;
            sx += delta.dx;
            sy += delta.dy;
            let loc = isok(sx, sy) ? game.level?.at(sx, sy) : null;

            if (loc && loc.typ !== STONE) {
                let mon = m_at(sx, sy);
                if (cansee(sx, sy)) {
                    if (mon && !canspotmon(mon))
                        map_invisible(sx, sy);
                    else if (!mon)
                        unmap_invisible(sx, sy);
                    if (ZAP_POS(loc.typ)
                        || (isok(lsx, lsy) && cansee(lsx, lsy))) {
                        display_cmap_at(zapdir_cmap(delta.dx, delta.dy),
                                        sx, sy,
                                        zap_colors[damgtype] ?? HI_ZAP, 'zap');
                        beam_cells.push([sx, sy]);
                    }
                    await game.animationFrame();
                }

                const gas_hit = damgtype === ATTKS.AD_DRST - ATTKS.AD_MAGM;
                if (!gas_hit)
                    range += await zap_over_floor(sx, sy, type, true);

                if (mon) {
                    if (type >= 0)
                        mon.mstrategy = (mon.mstrategy | 0) & ~STRAT_WAITMASK;
                    if (!forcemiss && zap_hit(find_mac(mon), type >= 10 && type < 20 ? type : 0)) {
                        const damage = await zhitm(mon, type, nd);
                        if (DEADMONSTER(mon)) {
                            if (type < 0)
                                await monkilled(mon, flash_str(type),
                                                ATTKS.AD_RBRE);
                            else
                                await killed(mon);
                        } else {
                            if (sayhit || canseemon(mon))
                                await pline_The(`${flash_str(type)} hits ${
                                    mon_nam(mon)}${exclam(damage)}`);
                            if (damgtype !== 3)
                                await wakeup(mon, type >= 0);
                        }
                        range -= 2;
                    } else {
                        if (saymiss
                            || (canseemon(mon) && !disguised_as_non_mon(mon)))
                            await miss(flash_str(type), mon);
                    }
                } else if (game.u.ux === sx && game.u.uy === sy && range >= 0) {
                    const { nomul } = await import('./hack.js');
                    nomul(0);
                    if (!forcemiss && zap_hit(game.u.uac | 0, 0)) {
                        range -= 2;
                        const fltxt = flash_str(type);
                        await pline(`${The(fltxt)} hits you!`);
                        if (Reflecting()) {
                            await ureflects();
                            delta.dx = -delta.dx;
                            delta.dy = -delta.dy;
                        } else if (damgtype === 3) {
                            if (Sleep_resistance())
                                await You("don't feel sleepy.");
                            else
                                await fall_asleep(-d(nd, 25), true);
                        } else {
                            await zhitu(type, nd, fltxt, sx, sy);
                        }
                    } else if (!game.u.uprops?.BLINDED) {
                        await pline(`${The(flash_str(type))} whizzes by you!`);
                    }
                    if (game.occupation) {
                        const { stop_occupation } = await import('./allmain.js');
                        await stop_occupation();
                    }
                    nomul(0);
                }
                if (gas_hit)
                    await zap_over_floor(sx, sy, type, true);
            }

            loc = isok(sx, sy) ? game.level?.at(sx, sy) : null;
            if (!loc || loc.typ === STONE || !ZAP_POS(loc.typ)
                || (closed_door(sx, sy) && range >= 0)) {
                const bchance = (!loc || loc.typ === STONE) ? 10 : 75;
                if (--range > 0 && isok(lsx, lsy) && cansee(lsx, lsy))
                    await pline_The(`${flash_str(type)} bounces!`);
                bounce_dir(sx, sy, delta, bchance);
            }
        }
    } finally {
        for (const [x, y] of beam_cells)
            newsym(x, y);
    }
}

export async function ubuzz(type, nd) {
    await dobuzz(type, nd, game.u.ux, game.u.uy, game.u.dx, game.u.dy);
}

// src/zap.c:3219 zap_updown(). The ordinary downward path applies an
// immediate wand to every object under the hero, then applies map effects.
// Terrain and trap special cases remain explicit until a C trace reaches one.
async function zap_updown(obj) {
    let disclose = false;
    const x = game.u.ux, y = game.u.uy;
    const ttmp = t_at(x, y);
    const striking = obj.otyp === ONAMES.WAN_STRIKING
        || obj.otyp === ONAMES.SPE_FORCE_BOLT;
    const opening = obj.otyp === ONAMES.WAN_OPENING
        || obj.otyp === ONAMES.SPE_KNOCK;
    const locking = obj.otyp === ONAMES.WAN_LOCKING
        || obj.otyp === ONAMES.SPE_WIZARD_LOCK;
    const handles_trap_conversion = game.u.dz > 0 && ttmp
        && ((striking && ttmp.ttyp === TRAPDOOR)
            || (locking && ttmp.ttyp === HOLE));
    const releases_holding_trap = game.u.dz > 0 && opening
        && game.u.utrap;
    const opens_falling_trap = game.u.dz > 0 && opening && !game.u.utrap
        && ttmp && (ttmp.ttyp === TRAPDOOR || ttmp.ttyp === ROCKTRAP
                    || ttmp.ttyp === HOLE || is_pit(ttmp.ttyp));
    const closes_holding_trap = game.u.dz > 0 && locking && ttmp
        && (ttmp.ttyp === BEAR_TRAP || ttmp.ttyp === WEB)
        && !game.u.utrap;
    const handles_special = handles_trap_conversion
        || releases_holding_trap || opens_falling_trap
        || closes_holding_trap;

    switch (obj.otyp) {
    case ONAMES.WAN_PROBING: {
        let revealed = 0;
        if (game.u.dz < 0) {
            await You(`probe towards the ${ceiling(x, y)}.`);
        } else {
            const terrain = game.level.at(x, y)?.typ;
            revealed += await bhitpile(obj, bhito, x, y, game.u.dz);
            await zap_map(x, y, obj);
            const surf = terrain === ICE || IS_FURNITURE(terrain)
                ? 'it' : `the ${surface(x, y)}`;
            await You(`probe beneath ${surf}.`);
            revealed += await display_binventory(x, y, true);
        }
        if (!revealed)
            await Your('probe reveals nothing.');
        return true;
    }
    case ONAMES.WAN_OPENING:
    case ONAMES.SPE_KNOCK:
    case ONAMES.WAN_LOCKING:
    case ONAMES.SPE_WIZARD_LOCK:
        if (!handles_special)
            note_unported_zap(`zap_updown:special otyp=${obj.otyp}`);
        break;
    case ONAMES.SPE_STONE_TO_FLESH: {
        const qstart = game.special_levels?.qstart_level;
        const isQstart = qstart && game.u.uz.dnum === qstart.dnum
            && game.u.uz.dlevel === qstart.dlevel;
        const hasFloorObject = (game.level.objects || []).some(otmp =>
            otmp.where === OBJ_FLOOR && otmp.ox === x && otmp.oy === y);
        if (Is_airlevel(game.u.uz) || Is_waterlevel(game.u.uz)
            || Underwater() || (isQstart && game.u.dz < 0)) {
            await pline(nothing_happens);
        } else if (game.u.dz < 0) {
            await pline(`Blood drips on your ${body_part(FACE)}.`);
        } else if (game.u.dz > 0 && !hasFloorObject) {
            const engraving = engr_at(x, y);
            if (!(engraving && engraving.engr_type === ENGRAVE)) {
                if (is_pool(x, y) || is_ice(x, y)) {
                    await pline(nothing_happens);
                } else {
                    await pline(`Blood ${is_lava(x, y) ? 'boils' : 'pools'} ${
                        Levitation() ? 'beneath' : 'at'} your ${
                        makeplural(body_part(FOOT))}.`);
                }
            }
        }
        break;
    }
    case ONAMES.WAN_STRIKING:
    case ONAMES.SPE_FORCE_BOLT:
        if (game.u.dz > 0 && !handles_trap_conversion)
            note_unported_zap(`zap_updown:special otyp=${obj.otyp}`);
        break;
    default:
        break;
    }

    if (game.u.dz > 0) {
        if (releases_holding_trap) {
            const noticed = { v: disclose };
            await openholdingtrap(game.youmonst, noticed);
            disclose = noticed.v;
        } else if (opens_falling_trap) {
            disclose = true;
            const { dotrap } = await import('./trap.js');
            await dotrap(ttmp, FORCETRAP);
        } else if (closes_holding_trap) {
            const noticed = { v: disclose };
            await closeholdingtrap(game.youmonst, noticed);
            disclose = noticed.v;
        } else if (ttmp && striking && ttmp.ttyp === TRAPDOOR) {
            if (Blind() && !ttmp.tseen) {
                await pline('Something beneath you shatters.');
            } else if (!ttmp.tseen) {
                await pline("There's a trapdoor beneath you; it shatters.");
            } else {
                await pline('The trapdoor beneath you shatters.');
                disclose = true;
            }
            ttmp.ttyp = HOLE;
            ttmp.tseen = 1;
            newsym(x, y);
            const { dotrap } = await import('./trap.js');
            await dotrap(ttmp, NO_TRAP_FLAGS);
        } else if (ttmp && locking && ttmp.ttyp === HOLE) {
            ttmp.ttyp = TRAPDOOR;
            if (Blind() || !ttmp.tseen) {
                await pline(`Some ${is_ice(x, y) ? 'frost' : 'dust'} swirls beneath you.`);
            } else {
                ttmp.tseen = 1;
                newsym(x, y);
                await pline('A trapdoor appears beneath you.');
                disclose = true;
            }
        }
        await bhitpile(obj, bhito, x, y, game.u.dz);
        await zap_map(x, y, obj);
    } else if (game.u.dz < 0) {
        if (striking
            && rn2(3)
            && !Is_airlevel(game.u.uz)
            && !Is_waterlevel(game.u.uz)
            && !Underwater()
            && !(game.special_levels?.qstart_level
                 && game.u.uz.dnum === game.special_levels.qstart_level.dnum
                 && game.u.uz.dlevel === game.special_levels.qstart_level.dlevel)) {
            await pline(`A rock is dislodged from the ${
                ceiling(game.u.ux, game.u.uy)} and falls on your ${
                body_part(HEAD)}.`);
            let damage = rnd(hard_helmet(game.u.uarmh) ? 2 : 6);
            if (game.u.uprops?.HALF_PHDAM)
                damage = Math.trunc((damage + 1) / 2);
            const { losehp } = await import('./hack.js');
            await losehp(damage, 'falling rock', KILLED_BY_AN);
            const rock = mksobj_at(ONAMES.ROCK, x, y, false, false);
            xname(rock);
            stackobj(rock);
            newsym(x, y);
        }
        if (game.u.uundetected)
            note_unported_zap('zap_updown:hiding-under');
    }

    return disclose;
}

// src/zap.c:3431 weffects() — dispatch a zap's effect. The IMMEDIATE
// lateral arm uses bhit; directional rays use dobuzz.
export async function weffects(obj) {
    const otyp = obj.otyp;
    const dirprop = game.objects[otyp].oc_dir;
    const was_unkn = !game.objects[otyp].oc_name_known;
    let disclose = false;

    exercise(A_WIS, true);

    if (dirprop === IMMEDIATE) {
        zapsetup(); /* reset obj_zapped */
        if (game.u.uswallow) {
            note_unported_zap('weffects:uswallow');
        } else if (game.u.dz) {
            disclose = await zap_updown(obj);
        } else {
            await bhit(game.u.dx, game.u.dy, rn1(8, 6), ZAPPED_WAND,
                       bhitm, bhito, { obj });
        }
        await zapwrapup(); /* give feedback for obj_zapped */
    } else if (dirprop === NODIR) {
        await zapnodir(obj);
    } else {
        if (otyp === ONAMES.WAN_DIGGING || otyp === ONAMES.SPE_DIG) {
            const { zap_dig } = await import('./dig.js');
            await zap_dig();
        } else if (otyp >= ONAMES.SPE_MAGIC_MISSILE
                   && otyp <= ONAMES.SPE_FINGER_OF_DEATH) {
            await ubuzz(10 + (otyp - ONAMES.SPE_MAGIC_MISSILE),
                        Math.trunc(game.u.ulevel / 2) + 1);
        } else if (otyp >= ONAMES.WAN_MAGIC_MISSILE
                   && otyp <= ONAMES.WAN_LIGHTNING) {
            await ubuzz(otyp - ONAMES.WAN_MAGIC_MISSILE,
                        otyp === ONAMES.WAN_MAGIC_MISSILE ? 2 : 6);
        } else {
            note_unported_zap(`weffects:ray otyp=${otyp}`);
        }
        disclose = true;
    }
    if (disclose) {
        learnwand(obj);
        if (was_unkn)
            more_experienced(0, 10);
    }
}

// src/zap.c:2627 dozap() — the 'z' command.
export async function dozap() {
    if (nohands(game.youmonst.data)) {
        await You("aren't able to zap anything in your current form.");
        return ECMD_OK;
    }
    const { check_capacity } = await import('./hack.js');
    if (await check_capacity(null))
        return ECMD_OK;
    const obj = await getobj("zap", zap_ok, 0);
    if (!obj)
        return ECMD_CANCEL;

    if (obj.unpaid) {
        const { check_unpaid } = await import('./shk.js');
        await check_unpaid(obj);
    }

    const need_dir = game.objects[obj.otyp].oc_dir !== NODIR;
    if (!(await zappable(obj))) {
        await pline(nothing_happens);
    } else if (obj.cursed && !rn2(100)) {   /* WAND_BACKFIRE_CHANCE */
        note_unported_zap('dozap:backfire');
        return ECMD_TIME;
    } else if (!need_dir) {
        await weffects(obj);
    } else if (need_dir && !(await getdir(null))) {
        if (!game.u?.ublind)
            note_unported_zap('dozap:glows_and_fades');
        /* make him pay for knowing !NODIR */
    } else if (need_dir && !game.u.dx && !game.u.dy && !game.u.dz) {
        const damage = await zapyourself(obj, true);
        if (damage) {
            const self = game.flags?.female ? 'herself' : 'himself';
            const finalDamage = game.u.uprops?.HALF_PHDAM
                ? Math.trunc((damage + 1) / 2) : damage;
            const { losehp } = await import('./hack.js');
            await losehp(finalDamage, `zapped ${self} with ${xname(obj)}`,
                         NO_KILLER_PREFIX);
        }
    } else {
        await weffects(obj);
    }
    if (obj && obj.spe < 0) {
        await pline(`${Tobjnam(obj, 'turn')} to dust.`);
        useupall(obj);
    } else {
        update_inventory(); /* maybe used a charge */
    }
    return ECMD_TIME;
}

// src/zap.c:3827 bhit() — walk a missile (or beam) along a line.
//
// The physical-object, immediate-wand, and camera-flash spines share this
// walk. Camera flashes retain each `!` until the ray ends, matching tmp_at's
// DISP_BEAM mode, and pass through invisible monsters after flashing them.
export async function bhit(ddx, ddy, range, weapon, fhitm, fhito, pobjRef) {
    const obj = pobjRef.obj;
    let result = null;

    if (weapon === KICKED_WEAPON) {
        game.bhitpos = { x: game.u.ux + ddx, y: game.u.uy + ddy };
        range--;
    } else {
        game.bhitpos = { x: game.u.ux, y: game.u.uy };
    }

    let skiprange_start = 0, allow_skip = false;
    if (weapon === THROWN_WEAPON && obj && obj.otyp === ONAMES.ROCK) {
        /* skiprange(range, ...) computes bounce points without drawing */
        skiprange_start = 1;
        allow_skip = !rn2(3);
        if (allow_skip)
            note_unported_zap('bhit:rock_skip');
    }

    /* src/zap.c:3868 tmp_at(DISP_FLASH, obj_to_glyph(...)). Capture the
       glyph once even when the hero cannot see the flight. Hallucination
       therefore consumes one display-RNG draw before the first square. */
    const flightGlyph = (weapon === THROWN_WEAPON || weapon === KICKED_WEAPON)
        && obj ? temporary_object_glyph(obj) : null;
    let flightPos = null;
    const flashCells = [];
    const endFlight = () => {
        if (flightPos) {
            newsym(flightPos.x, flightPos.y);
            flightPos = null;
        }
    };

    while (range-- > 0) {
        game.bhitpos.x += ddx;
        game.bhitpos.y += ddy;
        const x = game.bhitpos.x, y = game.bhitpos.y;

        if (!isok(x, y)) {
            game.bhitpos.x -= ddx;
            game.bhitpos.y -= ddy;
            break;
        }

        const loc = game.level.at(x, y);
        const typ = loc?.typ ?? STONE;

        /* WATER aka "wall of water" stops items */
        if (typ === WATER || typ === LAVAWALL) {
            if (weapon === THROWN_WEAPON || weapon === KICKED_WEAPON)
                break;
        }

        if ((weapon === THROWN_WEAPON || weapon === KICKED_WEAPON)
            && obj?.lamplit && !Blind())
            await show_transient_light(obj, x, y);

        if ((weapon === THROWN_WEAPON || weapon === KICKED_WEAPON)
            && typ === IRONBARS) {
            /* hits_bars() breaks some things, rn2(5) unless point-blank */
            note_unported_zap('bhit:ironbars');
            game.bhitpos.x -= ddx;
            game.bhitpos.y -= ddy;
            break;
        }

        if (weapon === ZAPPED_WAND) {
            /* cancellation/opening/locking/striking/probing */
            await zap_map(x, y, obj);
        }

        let mtmp = m_at(x, y);
        const ttmp = t_at(x, y);
        if (!mtmp && ttmp && ttmp.ttyp === WEB
            && (weapon === THROWN_WEAPON || weapon === KICKED_WEAPON)
            && !rn2(3)) {
            if (cansee(x, y)) {
                note_unported_zap('bhit:web_message');
                ttmp.tseen = true;
                newsym(x, y);
            }
            break;
        }

        /* a mimic pretending to be an object is not hit by thrown things */
        if (mtmp
            && (((weapon === THROWN_WEAPON || weapon === KICKED_WEAPON)
                 && M_AP_TYPE(mtmp) === M_AP_OBJECT)
                || (weapon === FLASHED_LIGHT
                    && M_AP_TYPE(mtmp) === M_AP_OBJECT)))
            mtmp = null;

        if (mtmp) {
            game.notonhead = (x !== mtmp.mx || y !== mtmp.my);
            if (weapon === FLASHED_LIGHT) {
                if (mtmp.minvis) {
                    obj.ox = game.u.ux;
                    obj.oy = game.u.uy;
                    const { flash_hits_mon } = await import('./uhitm.js');
                    await flash_hits_mon(mtmp, obj);
                } else {
                    result = mtmp;
                    break;
                }
            } else if (weapon !== ZAPPED_WAND) {
                if (cansee(x, y) && !canspotmon(mtmp))
                    map_invisible(x, y);
                result = mtmp;
                break;
            }
            /* ZAPPED_WAND */
            if (await fhitm(mtmp, obj)) {
                result = mtmp;
                break;
            }
            range -= 3;
        }
        /* C runs the pile hit on every square, monster or not */
        if (fhito) {
            if (await bhitpile(obj, fhito, x, y, 0))
                range--;
        }

        if (weapon === ZAPPED_WAND && (IS_DOOR(typ) || typ === SDOOR)) {
            switch (obj.otyp) {
            case ONAMES.WAN_OPENING:
            case ONAMES.WAN_LOCKING:
            case ONAMES.WAN_STRIKING:
            case ONAMES.SPE_KNOCK:
            case ONAMES.SPE_WIZARD_LOCK:
            case ONAMES.SPE_FORCE_BOLT:
                if (await doorlock(obj, x, y)) {
                    if (cansee(x, y)
                        || (obj.otyp === ONAMES.WAN_STRIKING && !Deaf()))
                        learnwand(obj);
                    if (game.level.at(x, y).doormask === D_BROKEN
                        && (game.in_rooms?.(x, y, SHOPBASE) ?? '').length)
                        note_unported_zap('bhit:shop_door_damage');
                }
                break;
            default:
                break;
            }
        }

        if (!(typ >= POOL) /* !ZAP_POS(typ) */ || closed_door(x, y)) {
            game.bhitpos.x -= ddx;
            game.bhitpos.y -= ddy;
            break;
        }

        if (weapon === FLASHED_LIGHT) {
            display_cmap_at(cmap_names.S_flashbeam, x, y, CLR_WHITE,
                            'camera-flash');
            flashCells.push([x, y]);
            if (game.animationFrame) {
                await flush_screen(0);
                await game.animationFrame();
            }
        } else if (flightGlyph) {
            endFlight();
            if (cansee(x, y)) {
                display_object_at(obj, x, y, flightGlyph);
                flightPos = { x, y };
            }
            if (game.animationFrame)
                await game.animationFrame();
        }

        if (IS_SINK(typ) && weapon !== FLASHED_LIGHT)
            break;               /* physical objects fall onto sink */
    }

    endFlight();
    for (const [x, y] of flashCells)
        newsym(x, y);
    if (weapon === THROWN_WEAPON || weapon === KICKED_WEAPON)
        await transient_light_cleanup();
    return result;
}

// src/zap.c:3556 hit() / :3571 miss() — the missile/zap contact messages.
export async function hit(str, mtmp, force) {
    const verbosely = (mtmp === game.youmonst
                       || (game.flags.verbose
                           && (cansee(game.bhitpos?.x, game.bhitpos?.y)
                               || canspotmon(mtmp) || engulfing_u(mtmp))));

    await pline(`${The(str)} ${vtense(str, 'hit')} `
                + `${verbosely ? mon_nam(mtmp) : 'it'}${force}`);
}

export async function miss(str, mtmp) {
    await pline(`${The(str)} ${vtense(str, 'miss')} `
                + `${((cansee(game.bhitpos?.x, game.bhitpos?.y)
                       || canspotmon(mtmp)) && game.flags.verbose)
                    ? mon_nam(mtmp) : 'it'}.`);
}

// src/zap.c:56 ZT_SPELL(), zap type offset for damage from a monster spell.
export const ZT_SPELL = (x) => 10 + x;

// src/zap.c:5501 mon_spell_hits_spot(), what a monster's spell does to the
// spot it hits: clobber an engraving, then zap_over_floor().
export async function mon_spell_hits_spot(caster, adtyp, x, y) {
    /* a magic missile or acid spell hitting an engraved spot will
       thoroughly clobber an engraving (unless its type makes it be
       scuff-protected); zap_over_floor() doesn't handle this */
    if (adtyp === ATTKS.AD_MAGM || adtyp === ATTKS.AD_ACID) {
        const ep = engr_at(x, y);
        const etext = ep ? ep.engr_txt : null;

        if (etext)
            wipe_engr_at(x, y, etext.length + d(6, 6), true);
        /* the hero won't notice the damage until the engraving
           is re-examined (lookhere or move off and back on) */
    }

    /* accept any basic damage type that zap_over_floor() might handle */
    if (adtyp >= ATTKS.AD_MAGM && adtyp <= ATTKS.AD_ACID) {
        const zt_typ = adtyp - 1,            /* convert AD_xxxx to ZT_xxxx */
            zapdmgtyp = -ZT_SPELL(zt_typ); /* damage is from monster spell */

        await zap_over_floor(x, y, zapdmgtyp, true);
    } /* else impossible("Unsupported damage type (%d) for mon_spell_hits_spot.") */
}

// src/zap.c:5537 fracture_rock(), a boulder or statue turns into rocks.
export async function fracture_rock(obj) /* no texts here! */
{
    const cc = { x: 0, y: 0 };
    const by_you = !game.context?.mon_moving;

    if (by_you && get_obj_location(obj, cc, 0) && costly_spot(cc.x, cc.y)) {
        const shkpp = { shkp: null };
        const objroom = (in_rooms(cc.x, cc.y, SHOPBASE) || '\0').charCodeAt(0);

        if (billable(shkpp, obj, objroom, false)) {
            /* shop message says "you owe <shk> <$> for it!" so we need
               to precede that with a message explaining what "it" is */
            await You(`fracture ${s_suffix(shkname(shkpp.shkp))} ${xname(obj)}.`);
            /* breakobj() calls stolen_value(), which handles shop charges */
            await breakobj(obj, cc.x, cc.y, true, false);
        }
    }

    if (by_you && obj.otyp === ONAMES.BOULDER)
        await sokoban_guilt();

    obj.otyp = ONAMES.ROCK;
    obj.oclass = OCLASSES.GEM_CLASS;
    obj.quan = rn1(60, 7);
    obj.owt = weight(obj);
    obj.dknown = obj.bknown = obj.rknown = 0;
    obj.known = game.objects[obj.otyp].oc_uses_known ? 0 : 1;
    obj.oextra = null; /* dealloc_oextra(obj) */

    if (obj.where === OBJ_FLOOR) {
        obj_extract_self(obj); /* move rocks back on top */
        place_object(obj, obj.ox, obj.oy);
        if (!does_block(obj.ox, obj.oy, game.level.at(obj.ox, obj.oy))) {
            unblock_point(obj.ox, obj.oy);
            /* immediately update the display, in case this fracturing was
               caused by a zap that is about hit more things */
            vision_recalc(0);
        }
        if (cansee(obj.ox, obj.oy))
            newsym(obj.ox, obj.oy);
    }
}

// src/zap.c:5582 break_statue(), a statue shatters; false when a statue
// trap animated it instead.
export async function break_statue(obj) {
    /* [obj is assumed to be on floor, so no get_obj_location() needed] */
    const trap = t_at(obj.ox, obj.oy);
    let item;
    const by_you = !game.context?.mon_moving;

    if (trap && trap.ttyp === STATUE_TRAP
        && await activate_statue_trap(trap, obj.ox, obj.oy, true))
        return false;
    /* drop any objects contained inside the statue */
    while ((item = (obj.cobj || [])[0]) != null) {
        obj_extract_self(item);
        place_object(item, obj.ox, obj.oy);
    }
    if (by_you && Role_if(PMNAMES.PM_ARCHEOLOGIST)
        && (obj.spe & CORPSTAT_HISTORIC)) {
        await You_feel('guilty about damaging such a historic statue.');
        adjalign(-1);
    }
    obj.spe = 0;
    await fracture_rock(obj);
    return true;
}

// src/zap.c:3017 ubreatheu(); hero breathes at own location (can't hit
// anyone else)
export async function ubreatheu(mattk) {
    const dtyp = 20 + mattk[1] - 1;      /* breath by hero */

    await zhitu(dtyp, mattk[2], flash_str(dtyp, true), game.u.ux, game.u.uy);
}

// src/zap.c:3026 lightdamage(), a light-hating hero (gremlin) is hurt by a
// flash; returns the damage (0 when unaffected).
export async function lightdamage(obj, ordinary, amt) {
    let buf;
    let how;
    let dmg = amt;

    if (dmg && game.youmonst.data.pmidx === PMNAMES.PM_GREMLIN) {
        /* reduce high values (from destruction of wand with many charges) */
        dmg = rnd(dmg);
        if (dmg > 10)
            dmg = 10 + rnd(dmg - 10);
        if (dmg > 20)
            dmg = 20;
        await pline(`Ow, that light hurts${(dmg > 2 || game.u.mh <= 5) ? '!' : '.'}`);
        /* [composing killer/reason is superfluous here; if fatal, cause
           of death will always be "killed while stuck in creature form"] */
        if (obj.oclass === OCLASSES.SCROLL_CLASS || obj.oclass === OCLASSES.SPBOOK_CLASS)
            ordinary = false; /* say blasted rather than zapped */
        how = (obj.oclass === OCLASSES.SPBOOK_CLASS) ? 'spell of light'
              : (!obj.oartifact) ? ansimpleoname(obj)
                : bare_artifactname(obj);
        buf = `${ordinary ? 'zapped' : 'blasted'} ${uhim()}self with ${how}`;
        await losehp(Maybe_Half_Phys_zap(dmg), buf, NO_KILLER_PREFIX);
    }
    return dmg;
}
/* include/hack.h:1236 Maybe_Half_Phys() */
const Maybe_Half_Phys_zap = (dmg) =>
    (!!(game.u.intrinsic?.HHalf_physical_damage || game.u.uprops?.HALF_PHDAM)
     ? Math.trunc((dmg + 1) / 2) : dmg);

// src/zap.c:4765 buzz(), a ray that reports hits but not misses and
// never forces a miss.
export async function buzz(type, nd, sx, sy, dx, dy) {
    await dobuzz(type, nd, sx, sy, dx, dy, true, false, false);
}
