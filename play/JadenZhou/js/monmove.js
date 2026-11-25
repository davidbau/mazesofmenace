// monmove.js — monster movement: dochugw(), dochug(), m_move(), postmov(),
// distfleeck(), onscary(), set_apparxy() and their helpers.
// C ref: monmove.c (plus small helpers from mondata.h, mthrowu.c, muse.c,
// mhitu.c, vision.c, dogmove.c as noted)
//
// Branches that need code no session reaches yet throw a
// 'not ported yet' error instead of skipping their rolls.

import { fracture_rock } from './zap.js';
import { pline_The, verbalize, You_see, You_hear, You } from './display.js';
import { rn1 } from './rng.js';
import { minv } from './mon.js';
import { m_lined_up, m_carrying } from './mthrowu.js';
import { game } from './gstate.js';
import { worm_move, worm_nomove, wormhitu, see_wsegs } from './worm.js';
import { picking_lock } from './lock.js';
import { is_digging, watch_dig } from './dig.js';
import { rn2, rnd, d } from './rng.js';
import { dist2, distmin, mdistu } from './hacklib.js';
import { cansee, couldsee, clear_path, vision_recalc,
         recalc_block_point } from './vision.js';
import { newsym, pline, canseemon, canspotmon, vobj_at } from './display.js';
import { can_hide_under_obj, nonliving } from './makemon.js';
import { Monnam, Adjmonnam } from './do_name.js';
import { W_NONDIGGABLE as W_NONDIGGABLE_MM } from './const.js';
import { dmgtype as dmgtype_mm, is_animal, mindless, nohands, verysmall,
         hides_under, amorphous, likes_gems, throws_rocks, tunnels, needspick,
         is_covetous, is_mercenary, likes_gold, likes_magic, metallivorous,
         unique_corpstat, is_rider, likes_objs, is_unicorn, likes_lava,
         is_watch, is_mind_flayer, webmaker,
         slimeproof as
         slimeproof_mo, is_armed, attacktype, noattacks,
         resist_conflict, can_blow } from './mondata.js';
import { Norep as Norep_mm } from './display.js';
import { makeplural as makeplural_mm } from './objnam.js';
import { locomotion as locomotion_mm } from './trap.js';
import { mintrap, Trap_Caught_Mon, Trap_Killed_Mon,
         Trap_Moved_Mon, t_at } from './trap.js';
import { mon_knows_traps, get_atkdam_type,
         cvt_adtyp_to_mseenres } from './mondata.js';
import { mdig_tunnel, may_dig } from './dig.js';
import { mwelded } from './weapon.js';
import { maketrap } from './trap.js';
import { y_monnam } from './do_name.js';
import { stairway_at } from './display.js';
import { stairway_find_dir } from './mklev.js';
import { hideunder_async } from './makemon.js';
import { Is_candle } from './mkobj.js';
import { STAIRS, LADDER, WEB, IS_WATERWALL, LAVAWALL } from './const.js';
import { IS_TREE, IS_STWALL, NEED_PICK_AXE, NEED_AXE, NEED_PICK_OR_AXE,
         P_AXE } from './const.js';
import { splitobj, obj_extract_self, bill_dummy_object } from './mkobj.js';
import { distant_name, doname } from './objnam.js';
import { mpickobj } from './steal.js';
import { find_defensive, find_offensive, find_misc, use_defensive,
         use_misc, cures_stoning, mcould_eat_tin } from './muse.js';
import { mattacku, unstuck, expels } from './mhitu.js';
import { castmu } from './mcastu.js';
import { M_ATTK_HIT, G_GENOD } from './const.js';
import { Is_rogue_level, M_ATTK_DEF_DIED, M_ATTK_AGR_DIED, NORMAL_SPEED } from './const.js';
import { mattackm } from './mhitm.js';
import { obj_resists, dogfood, finish_meating } from './dogmove.js';
import { MANFOOD, ACCFOOD } from './const.js';
import { touch_artifact, has_magic_key, artifact_light } from './artifact.js';
import { is_metallic, is_rustprone, AMULET_OF_STRANGULATION,
         RIN_SLOW_DIGESTION, is_pick, is_pole, is_axe,
         Is_container } from './objects.js';
import { resists_poison } from './mondata.js';
import { mksobj_at } from './mkobj.js';
import { an, xname } from './objnam.js';
import { delobj } from './invent.js';
import { grow_up } from './makemon.js';
import { is_organic } from './objects.js';
import { eaten_stat } from './eat.js';
import { extract_from_minvent } from './steal.js';
import { m_consume_obj, mondied, wake_nearto, disturb_buried_zombies } from './mon.js';
import { newcham } from './mon.js';
import { PROT_FROM_SHAPE_CHANGERS, NC_SHOW_MSG, NO_NC_FLAGS } from './const.js';
import { tty_display_nhwindow } from './wintty.js';
import { mon_learns_traps } from './mondata.js';
import { TRAPPED_DOOR } from './const.js';
import { has_ceiling } from './insight.js';
import { cuss, tactics } from './wizard.js';
import { mon_wield_item, select_rwep, autoreturn_weapon,
         m_has_launcher_and_ammo } from './weapon.js';
import { visible_region_at, create_gas_cloud, m_in_out_region } from './region.js';
import { noteleport_level, tele_restrict, rloc, mnexto } from './teleport.js';
import { wipe_engr_at, sticks } from './engrave.js';
import { acurrstr } from './attrib.js';
import {
    m_at, MON_AT, place_monster, sobj_at, is_pool, is_lava, accessible,
    closed_door, sengr_at
} from './makemon.js';
import { monsndx, is_flyer, is_floater, is_swimmer, passes_walls, haseyes,
         perceives, can_teleport, is_undead, is_human, is_vampshifter,
         dmgtype, Resists_Elem } from './mondata.js';
import { mfndpos, monnear, mon_allowflags, check_gear_next_turn,
         maybe_unhide_at } from './mon.js';
import { gettrack } from './track.js';
import { dog_move, can_carry, can_touch_safely, curr_mon_load,
         max_mon_load } from './dogmove.js';
import * as OBJ from './objects.js';
import * as M from './monsters.js';
import { mons } from './monsters.js';
import { objects, BOULDER, ROCK, SCR_SCARE_MONSTER, GOLD_PIECE, CORPSE,
         GEM_CLASS, MINERAL, GEMSTONE, WEAPON_CLASS, ARMOR_CLASS,
         FOOD_CLASS, AMULET_CLASS, POTION_CLASS, SCROLL_CLASS, WAND_CLASS,
         RING_CLASS, SPBOOK_CLASS, ROCK_CLASS, BALL_CLASS,
         CREDIT_CARD, SKELETON_KEY, LOCK_PICK } from './objects.js';
import {
    MMOVE_NOTHING, MMOVE_MOVED, MMOVE_DIED, MMOVE_DONE, MMOVE_NOMOVES,
    ALLOW_U, ALLOW_M, ALLOW_MDISP, ALLOW_ROCK, NOTONL, MTSZ, BOLT_LIM, RLOC_MSG,
    STRAT_ARRIVE, STRAT_WAITFORU, STRAT_WAITMASK, STRAT_CLOSE,
    INVIS, STEALTH, AGGRAVATE_MONSTER, CONFLICT, W_ARTI, M_AP_FURNITURE,
    M_AP_OBJECT, NON_PM, IS_DOOR, IS_ALTAR, IRONBARS, isok, SHOPBASE,
    DISPLACED, HALLUC, SEE_INVIS, D_LOCKED, D_CLOSED, D_TRAPPED, M_AP_MONSTER, M_AP_NOTHING,
    COLNO, ROWNO, IS_OBSTRUCTED, MFAST, I_SPECIAL,
    NO_TRAP_FLAGS, D_ISOPEN, D_NODOOR, D_BROKEN, DEAF, W_ARMG, STONE_RES,
    MON_OFFMAP, MON_DETACH, MON_MIGRATING, MON_LIMBO,
    NEED_WEAPON, NEED_HTH_WEAPON, P_PICK_AXE, P_POLEARMS, P_LANCE,
    MON_POLE_DIST,
} from './const.js';
import { STRANGE_OBJECT, WAN_STRIKING } from './objects.js';
import { ART_EXCALIBUR, ART_SNICKERSNEE } from './artilist.js';
import { In_hell } from './dungeon.js';
import { stop_occupation } from './allmain.js';
import { shk_move, costly_spot, after_shk_move, inhishop, add_damage } from './shk.js';
import { in_rooms, in_town } from './hack.js';
import { pri_move, in_your_sanctuary, inhistemple } from './priest.js';
import { quest_stat_check, quest_talk } from './quest.js';
import {
    Hallucination, Deaf, Invis, Displaced, Stealth, Aggravate_monster, Conflict, Underwater,
    Protection_from_shape_changers, Unaware
} from './youprop.js';
import { Upolyd, u_at, m_next2u } from './const.js';
import { DOOR as DOOR_MM, ROOM as ROOM_MM, CORR as CORR_MM } from './const.js';
import { Is_special as Is_special_mm } from './dungeon.js';
import { switch_terrain as switch_terrain_mm } from './hack.js';
import { mons as mons_mm, PM_LEPRECHAUN as PM_LEPRECHAUN_MM } from './monsters.js';
import { t_at as t_at_mm } from './trap.js';
import { findgold as findgold_mm, mdrop_obj as mdrop_obj_mm } from './steal.js';
import { bury_an_obj as bury_an_obj_mm } from './dig.js';
import { COIN_CLASS as COIN_CLASS_MM } from './objects.js';
import { gd_move } from './vault.js';
import { sensemon as sensemon_mb } from './display.js';
import { losehp as losehp_mb } from './trap.js';
import { wakeup as wakeup_mb, monkilled as monkilled_mb } from './mon.js';
import { telepathic as telepathic_mb } from './mondata.js';
import { mon_nam as mon_nam_mb } from './do_name.js';
import { TELEPAT as TELEPAT_MB, HALF_SPDAM as HALF_SPDAM_MB,
         KILLED_BY_AN as KILLED_BY_AN_MB } from './const.js';
import { AD_DRIN as AD_DRIN_MB } from './monsters.js';
import { vegan as vegan_mm, is_rider as is_rider_mm, flesh_petrifies as flesh_petrifies_mm,
         resists_ston as resists_ston_mm } from './mondata.js';
import { touch_petrifies as touch_petrifies_mo } from './mondata.js';
import { mstoning as mstoning_mo } from './mon.js';
import { revive_corpse as revive_corpse_mo } from './zap.js';
import { objdescr_is } from './o_init.js';
import { wake_msg as wake_msg_mm } from './mon.js';
import { cursed_object_at as cursed_object_at_ud } from './dogmove.js';
import { mdisplacem as mdisplacem_mm } from './mhitm.js';
import { M_ATTK_HIT as M_ATTK_HIT_MM, M_ATTK_DEF_DIED as M_ATTK_DEF_DIED_MM,
         M_ATTK_AGR_DIED as M_ATTK_AGR_DIED_MM } from './const.js';
import { bare_artifactname } from './iactions.js';
import { yname } from './objnam.js';
import { aggravate as aggravate_mm } from './potion.js';

// ── small helpers (C ref: youprop.h / mondata.h / display.h macros) ──

/* C ref: monst.h mon_offmap() */
function mon_offmap(mon) {
    return ((mon.mstate || 0)
            & (MON_DETACH | MON_MIGRATING | MON_LIMBO | MON_OFFMAP)) !== 0;
}

/* mondata.h */
function is_wanderer(ptr) { return (ptr.mflags2 & M.M2_WANDER) !== 0; }
function corpse_eater(ptr) {
    const n = monsndx(ptr);
    return n === M.PM_PURPLE_WORM || n === M.PM_BABY_PURPLE_WORM
        || n === M.PM_GHOUL || n === M.PM_PIRANHA;
}
/* C ref: mondata.c can_track() */
function can_track(ptr) {
    if (game.uwep && game.uwep.oartifact === ART_EXCALIBUR)
        return true;
    return haseyes(ptr);
}
/* C ref: monmove.c flees_light() macro */
function flees_light(mtmp) {
    return mtmp.data === mons[M.PM_GREMLIN]
        && (game.uwep && game.uwep.lamplit) /* artifact_light(uwep) */
        && couldsee(mtmp.mx, mtmp.my);
}
/* C ref: monst.h helpless() */
export function helpless(mon) { return !!(mon.msleeping || !mon.mcanmove); }
/* C ref: mondata.h is_lminion() */
function is_lminion(mon) {
    return (mon.data.mflags2 & M.M2_MINION) !== 0 && mon.data.maligntyp >= 0
        /* mon_aligntyp(mon) == A_LAWFUL */
        && mon.data.maligntyp > 0;
}
/* C ref: monmove.h m_canseeu() */
export function m_canseeu(m) {
    return ((!Invis() || perceives(m.data))
            && !(Underwater() || game.u.uburied || m.mburied))
        ? couldsee(m.mx, m.my) : false;
}

// C ref: monmove.c mb_trapped()
/* monster has triggered trapped door lock or was present when it got
   triggered remotely (at door spot, door hit by zap);
   returns True if mtmp dies */
export async function mb_trapped(mtmp, canseeit) {
    if (game.flags.verbose) {
        if (canseeit && !Unaware())
            await pline("KABOOM!!  You see a door explode."); /* pline_mon() */
        else if (!Deaf())
            await You_hear(`a ${(mdistu(mtmp) > 7 * 7) ? "distant" : "nearby"} explosion.`);
    }
    await wake_nearto(mtmp.mx, mtmp.my, 7 * 7);
    mtmp.mstun = 1;
    mtmp.mhp -= rnd(15);
    if (mtmp.mhp < 1) { /* DEADMONSTER(mtmp) */
        await mondied(mtmp);
        if (mtmp.mhp < 1) /* DEADMONSTER(mtmp) */
            return true;
        /* will get here if lifesaved */
    }
    mon_learns_traps(mtmp, TRAPPED_DOOR);
    return false;
}
/* C ref: mon.c m_in_air() */
export function m_in_air(mtmp) {
    return is_flyer(mtmp.data) || is_floater(mtmp.data)
        || ((mtmp.data.mflags1 & M.M1_CLING) !== 0
            && false /* has_ceiling() && mundetected: not ported yet */
            && mtmp.mundetected);
}
/* C ref: obj.h OBJ_AT() -- floor objects live in game.level.objects */
function OBJ_AT(x, y) {
    for (const o of game.level.objects || [])
        if (o.ox === x && o.oy === y && o.where !== 'gone') return true;
    return false;
}
function objects_at(x, y) {
    return (game.level.objects || []).filter(o => o.ox === x && o.oy === y);
}
/* C ref: hack.c in_rooms(x, y, SHOPBASE) used as a boolean */
function in_shop(x, y) {
    return !!in_rooms(x, y, SHOPBASE);
}
/* C ref: monmove.c monhaskey() */
export function monhaskey(mon, for_unlocking) {
    if (for_unlocking && m_carrying(mon, CREDIT_CARD))
        return true;
    return !!(m_carrying(mon, SKELETON_KEY) || m_carrying(mon, LOCK_PICK));
}

// C ref: monmove.c watch_on_duty()
async function watch_on_duty(mtmp) {
    const u = game.u;
    const cc = { x: 0, y: 0 };

    if (mtmp.mpeaceful && in_town(u.ux + u.dx, u.uy + u.dy)
        && mtmp.mcansee && m_canseeu(mtmp) && !rn2(3)) {
        if (picking_lock(cc) && IS_DOOR(game.level.at(cc.x, cc.y).typ)
            && (game.level.at(cc.x, cc.y).doormask & D_LOCKED)) {
            if (couldsee(mtmp.mx, mtmp.my))
                throw new Error('watch_on_duty(): mon_yells()/angry_guards() not ported yet');
        } else if (is_digging()) {
            /* chewing, wand/spell of digging are checked elsewhere */
            watch_dig(mtmp, game.context.digging.pos.x,
                      game.context.digging.pos.y, false);
        }
    }
}

// ── C ref: monmove.c dochugw() ──
export async function dochugw(mtmp, chug) {
    const g = game;
    const x = mtmp.mx, y = mtmp.my; /* 'mtmp's location before dochug() */
    /* skip canspotmon() if occupation is Null */
    const already_saw_mon = (chug && g.occupation) ? canspotmon(mtmp) : false;
    const rd = chug ? await dochug(mtmp) : 0;
    const halluc = !!(g.u.uprops?.[HALLUC]?.intrinsic || g.u.uprops?.[HALLUC]?.extrinsic);

    /*
     * A similar check is in monster_nearby() in hack.c.
     */

    /* check whether hero notices monster and stops current activity */
    if (g.occupation && !rd
        /* monster is hostile and can attack (or hallu distorts knowledge) */
        && (halluc || (!mtmp.mpeaceful && !noattacks(mtmp.data)))
        /* it's close enough to be a threat */
        && mdistu(mtmp) <= (BOLT_LIM + 1) * (BOLT_LIM + 1)
        /* and either couldn't see it before, or it was too far away */
        && (!already_saw_mon || !couldsee(x, y)
            || dist2(x, y, g.u.ux, g.u.uy) > (BOLT_LIM + 1) * (BOLT_LIM + 1))
        /* can see it now, or sense it and would normally see it */
        && canspotmon(mtmp) && couldsee(mtmp.mx, mtmp.my)
        /* monster isn't paralyzed or afraid (scare monster/Elbereth) */
        && mtmp.mcanmove && !onscary(g.u.ux, g.u.uy, mtmp))
        await stop_occupation();

    return rd;
}

// ── C ref: monmove.c onscary() ──
export function onscary(x, y, mtmp) {
    const u = game.u;
    /* <0,0> is used by musical scaring;
     * it doesn't care about scrolls or engravings or dungeon branch */
    const auditory_scare = (x === 0 && y === 0),
          magical_scare = !auditory_scare;

    /* creatures who are directly resistant to any type of scaring:
     * Rodney, lawful minions, Angels, the Riders */
    if (mtmp.iswiz || is_lminion(mtmp) || mtmp.data === mons[M.PM_ANGEL]
        || is_rider(mtmp.data))
        return false;

    /* creatures who are directly resistant to magical scaring
     * based on the mere presence of something at a location:
     * humans etc.
     * uniques have ascended their base monster instincts */
    if (magical_scare
        && (mtmp.data.mlet === M.S_HUMAN || unique_corpstat(mtmp.data)))
        return false;

    /* creatues who resist scaring under particular circumstances:
     * shopkeepers inside their own shop
     * priests inside their own temple */
    if ((mtmp.isshk && inhishop(mtmp))
        || (mtmp.ispriest && inhistemple(mtmp)))
        return false;

    if (auditory_scare)
        return true;

    /* should this still be true for defiled/molochian altars? */
    if (IS_ALTAR(game.level.at(x, y).typ)
        && (mtmp.data.mlet === M.S_VAMPIRE || is_vampshifter(mtmp)))
        return true;

    /* the scare monster scroll doesn't have any of the below
     * restrictions, being its own source of power */
    if (sobj_at(SCR_SCARE_MONSTER, x, y))
        return true;

    /*
     * Creatures who don't (or can't) fear a written Elbereth: ...
     */
    const ep = sengr_at("Elbereth", x, y, true);
    if (!ep) return false;
    if (!(u_at(x, y)
          || (Displaced() && mtmp.mux === x && mtmp.muy === y)
          || (ep.guardobjects && OBJ_AT(x, y) /* vobj_at() */)))
        return false;
    if (mtmp.isshk || mtmp.isgd || !mtmp.mcansee || mtmp.mpeaceful
        || mtmp.data === mons[M.PM_MINOTAUR])
        return false;
    /* Inhell || In_endgame(&u.uz): the endgame isn't ported yet */
    if (In_hell(u.uz))
        return false;
    return true;
}

// ── C ref: monmove.c mon_regen() ──
export function mon_regen(mon, digest_meal) {
    if (game.moves % 20 === 0 || (mon.data.mflags1 & M.M1_REGEN))
        if (mon.mhp < mon.mhpmax) mon.mhp++; /* healmon(mon, 1, 0) */
    if (mon.mspec_used)
        mon.mspec_used--;
    if (digest_meal) {
        if (mon.meating) {
            mon.meating--;
            if (mon.meating <= 0)
                finish_meating(mon);
        }
    }
}

// ── C ref: monmove.c release_hero() ──
/* ungrab/expel held/swallowed hero */
async function release_hero(mon) {
    const u = game.u;
    if (mon === u.ustuck) {
        if (u.uswallow) {
            await expels(mon, mon.data, true);
        } else if (!sticks(game.youmonst.data)) {
            await unstuck(mon); /* let go */
            await You("get released!");
        }
    }
}

// ── C ref: monmove.c disturb() ──
async function disturb(mtmp) {
    /*
     * + Ettins are hard to surprise.
     * + Nymphs, jabberwocks, and leprechauns do not easily wake up.
     */
    if (couldsee(mtmp.mx, mtmp.my) && mdistu(mtmp) <= 100
        && (!Stealth() || (mtmp.data === mons[M.PM_ETTIN] && rn2(10)))
        && (!(mtmp.data.mlet === M.S_NYMPH
              || mtmp.data === mons[M.PM_JABBERWOCK]
              || mtmp.data.mlet === M.S_LEPRECHAUN) || !rn2(50))
        && (Aggravate_monster()
            || (mtmp.data.mlet === M.S_DOG || mtmp.data.mlet === M.S_HUMAN)
            || (!rn2(7) && mtmp.m_ap_type !== M_AP_FURNITURE
                && mtmp.m_ap_type !== M_AP_OBJECT))) {
        await wake_msg_mm(mtmp, !mtmp.mpeaceful);
        mtmp.msleeping = 0;
        return 1;
    }
    return 0;
}

// ── C ref: monmove.c monflee() ──
/* monster begins fleeing for the specified time, 0 means untimed flee
 * if first, only adds fleetime if monster isn't already fleeing
 * if fleemsg, prints a message about new flight, otherwise, caller should */
export async function monflee(mtmp, fleetime, first, fleemsg) {
    /* shouldn't happen; maybe warrants impossible()? */
    if (mtmp.mhp < 1) /* DEADMONSTER(mtmp) */
        return;

    if (mtmp === game.u.ustuck)
        await release_hero(mtmp); /* expels/unstuck */

    if (!first || !mtmp.mflee) {
        /* don't lose untimed scare */
        if (!fleetime)
            mtmp.mfleetim = 0;
        else if (!mtmp.mflee || mtmp.mfleetim) {
            fleetime += (mtmp.mfleetim | 0);
            /* ensure monster flees long enough to visibly stop fighting */
            if (fleetime === 1)
                fleetime++;
            mtmp.mfleetim = Math.min(fleetime, 127);
        }
        if (!mtmp.mflee && fleemsg && canseemon(mtmp)
            && mtmp.m_ap_type !== M_AP_FURNITURE
            && mtmp.m_ap_type !== M_AP_OBJECT) {
            /* unfortunately we can't distinguish between temporary
               sleep and temporary paralysis, so both conditions
               receive the same alternate message */
            if (!mtmp.mcanmove || !mtmp.data.mmove) {
                await pline(`${Adjmonnam(mtmp, "immobile")} seems to flinch.`); /* pline_mon() */
            } else if (flees_light(mtmp)) {
                if (Unaware()) {
                    /* tell the player even if the hero is unconscious */
                    await pline(`${Monnam(mtmp)} is frightened.`); /* pline_mon() */
                } else if (rn2(10) || Deaf()) {
                    /* via flees_light(), will always be either via uwep
                       (Sunsword) or uarm (gold dragon scales/mail) or both;
                       TODO? check for both and describe the one which is
                       emitting light with a bigger radius */
                    const lsrc = (game.uwep && artifact_light(game.uwep))
                                 ? bare_artifactname(game.uwep)
                                 : (game.uarm && artifact_light(game.uarm))
                                   ? yname(game.uarm)
                                   : "[its imagination?]";

                    await pline(`${Monnam(mtmp)} flees from the painful light of ${lsrc}.`); /* pline_mon() */
                } else {
                    /* SetVoice(mtmp, 0, 80, 0) */
                    await verbalize("Bright light!");
                }
            } else {
                await pline(`${Monnam(mtmp)} turns to flee.`); /* pline_mon() */
            }
        }

        if (mtmp.data === mons[M.PM_VROCK] && !mtmp.mspec_used) {
            mtmp.mspec_used = 75 + rn2(25);
            await create_gas_cloud(mtmp.mx, mtmp.my, 5, 8);
        }

        mtmp.mflee = 1;
    }
    /* ignore recently-stepped spaces when made to flee */
    mon_track_clear(mtmp);
}

// C ref: monmove.c mind_blast()
async function mind_blast(mtmp) {
    const u = game.u;
    let m2, nmon = null;

    if (canseemon(mtmp))
        await pline(`${Monnam(mtmp)} concentrates.`); /* pline_mon() */
    if (mdistu(mtmp) > BOLT_LIM * BOLT_LIM) {
        await pline("You sense a faint wave of psychic energy."); /* You() */
        return;
    }
    await pline("A wave of psychic energy pours over you!");
    if (mtmp.mpeaceful
        && (!Conflict() || await resist_conflict(mtmp))) {
        await pline("It feels quite soothing.");
    } else if (!u.uinvulnerable) {
        let dmg;
        const m_sen = sensemon_mb(mtmp);
        /* C ref: youprop.h Blind_telepat, Half_spell_damage */
        const tp = u.uprops[TELEPAT_MB], hs = u.uprops[HALF_SPDAM_MB];
        const Blind_telepat = !!(tp && (tp.intrinsic || tp.extrinsic));
        const Half_spell_damage = !!(hs && (hs.intrinsic || hs.extrinsic));

        if (m_sen || (Blind_telepat && rn2(2)) || !rn2(10)) {
            /* hiding monsters are brought out of hiding when hit by
                a psychic blast, so do the same for hiding poly'd hero */
            if (u.uundetected) {
                u.uundetected = 0;
                newsym(u.ux, u.uy);
            } else if ((game.youmonst.m_ap_type || M_AP_NOTHING) !== M_AP_NOTHING
                        /* hero has no way to hide as monster but
                            check for that theoretical case anyway */
                        && game.youmonst.m_ap_type !== M_AP_MONSTER) {
                game.youmonst.m_ap_type = M_AP_NOTHING;
                game.youmonst.mappearance = 0;
                newsym(u.ux, u.uy);
            }
            await pline(`It locks on to your ${
                m_sen ? "telepathy"
                : Blind_telepat ? "latent telepathy"
                : "mind"}!`); /* note: hero is never mindless */
            dmg = rnd(15);
            if (Half_spell_damage)
                dmg = Math.trunc((dmg + 1) / 2);
            await losehp_mb(dmg, "psychic blast", KILLED_BY_AN_MB);
        }
    }
    for (m2 = game.fmon; m2; m2 = nmon) {
        nmon = m2.nmon;
        if (m2.mhp < 1) /* DEADMONSTER(m2) */
            continue;
        if (m2.mpeaceful === mtmp.mpeaceful)
            continue;
        if (mindless(m2.data))
            continue;
        if (m2 === mtmp)
            continue;
        if ((telepathic_mb(m2.data) && (rn2(2) || m2.mblinded)) || !rn2(10)) {
            /* wake it up first, to bring hidden monster out of hiding */
            await wakeup_mb(m2, false);
            if (cansee(m2.mx, m2.my))
                await pline(`It locks on to ${mon_nam_mb(m2)}.`);
            m2.mhp -= rnd(15);
            if (m2.mhp < 1) /* DEADMONSTER(m2) */
                await monkilled_mb(m2, "", AD_DRIN_MB);
        }
    }
}

// ── C ref: monmove.c distfleeck() ──
async function distfleeck(mtmp, out) {
    const u = game.u;
    let seescaryx, seescaryy;
    let sawscary = false;
    const bravegremlin = (rn2(5) === 0);

    out.inrange = (dist2(mtmp.mx, mtmp.my, mtmp.mux, mtmp.muy)
                   <= (BOLT_LIM * BOLT_LIM));
    out.nearby = out.inrange && monnear(mtmp, mtmp.mux, mtmp.muy);

    /* Note: if your image is displaced, the monster sees the Elbereth
     * at your displaced position, thus never attacking your displaced
     * position, but possibly attacking you by accident.  If you are
     * invisible, it sees the Elbereth at your real position, thus never
     * running into you by accident but possibly attacking the spot
     * where it guesses you are.
     */
    if (!mtmp.mcansee || (Invis() && !perceives(mtmp.data))) {
        seescaryx = mtmp.mux;
        seescaryy = mtmp.muy;
    } else {
        seescaryx = u.ux;
        seescaryy = u.uy;
    }

    sawscary = onscary(seescaryx, seescaryy, mtmp);
    if (out.nearby && (sawscary
                       || (flees_light(mtmp) && !bravegremlin)
                       || (!mtmp.mpeaceful && in_your_sanctuary(mtmp, 0, 0)))) {
        out.scared = 1;
        await monflee(mtmp, rnd(rn2(7) ? 10 : 100), true, true);
    } else
        out.scared = 0;
}

// C ref: priest.c in_your_sanctuary() -- ported in priest.js
export { in_your_sanctuary };

// ── C ref: monmove.c set_apparxy() ──
export function set_apparxy(mtmp) {
    const u = game.u;
    let mx = mtmp.mux, my = mtmp.muy;

    /* pet knows your smell; grabber still has hold of you; monsters which
       know where you are don't suddenly forget, if you haven't moved away */
    if (mtmp.mtame || mtmp === u.ustuck || u_at(mx, my)) {
        mtmp.mux = u.ux;
        mtmp.muy = u.uy;
        return;
    }

    const notseen = (!mtmp.mcansee || (Invis() && !perceives(mtmp.data)));
    const notthere = (Displaced() && mtmp.data !== mons[M.PM_DISPLACER_BEAST]);
    let displ;
    /* add cases as required.  eg. Displacement ... */
    if (Underwater()) {
        displ = 1;
    } else if (notseen) {
        /* Xorns can smell quantities of valuable metal
           like that in solid gold coins, treat as seen */
        const umoney = money_cnt(game.invent);
        displ = (mtmp.data === mons[M.PM_XORN] && umoney) ? 0 : 1;
    } else if (notthere) {
        displ = couldsee(mx, my) ? 2 : 1;
    } else {
        displ = 0;
    }
    if (!displ) {
        mtmp.mux = u.ux;
        mtmp.muy = u.uy;
        return;
    }

    /* without something like the following, invisibility and displacement
       are too powerful */
    const gotu = notseen ? !rn2(3) : notthere ? !rn2(4) : false;

    if (!gotu) {
        let try_cnt = 0;

        do {
            if (++try_cnt > 200) {
                mx = u.ux;
                my = u.uy;
                break; /* punt */
            }
            mx = u.ux - displ + rn2(2 * displ + 1);
            my = u.uy - displ + rn2(2 * displ + 1);
        } while (!isok(mx, my)
                 || (displ !== 2 && mx === mtmp.mx && my === mtmp.my)
                 || ((mx !== u.ux || my !== u.uy) && !passes_walls(mtmp.data)
                     && !(accessible(mx, my)
                          || (closed_door(mx, my)
                              && (can_ooze(mtmp) || can_fog(mtmp)))))
                 || !couldsee(mx, my));
    } else {
        mx = u.ux;
        my = u.uy;
    }

    mtmp.mux = mx;
    mtmp.muy = my;
}

// C ref: invent.c money_cnt()
function money_cnt(otmp) {
    for (; otmp; otmp = otmp.nobj)
        if (otmp.oclass === objects[GOLD_PIECE].oc_class && otmp.otyp === GOLD_PIECE)
            return otmp.quan;
    return 0;
}
// C ref: monmove.c can_ooze()
function can_ooze(mtmp) {
    if (!amorphous(mtmp.data) || stuff_prevents_passage(mtmp))
        return false;
    return true;
}
// C ref: monmove.c stuff_prevents_passage()
/* does monster (or hero) carry stuff that won't fit under a door? */
function stuff_prevents_passage(mtmp) {
    let chain;

    if (mtmp === game.youmonst) {
        chain = [];
        for (let o = game.invent; o; o = o.nobj)
            chain.push(o);
    } else {
        chain = minv(mtmp);
    }
    const armcat = (obj, cat) => (obj.oclass === OBJ.ARMOR_CLASS
                                  && objects[obj.otyp].oc_armcat === cat);
    for (const obj of chain) {
        const typ = obj.otyp;

        if (typ === OBJ.COIN_CLASS && obj.quan > 100)
            return true;
        if (obj.oclass !== OBJ.GEM_CLASS && !(typ >= OBJ.ARROW && typ <= OBJ.BOOMERANG)
            && !(typ >= OBJ.DAGGER && typ <= OBJ.CRYSKNIFE) && typ !== OBJ.SLING
            && !armcat(obj, OBJ.ARM_CLOAK) /* is_cloak() */
            && typ !== OBJ.FEDORA
            && !armcat(obj, OBJ.ARM_GLOVES) /* is_gloves() */
            && typ !== OBJ.LEATHER_JACKET && typ !== OBJ.CREDIT_CARD
            && !armcat(obj, OBJ.ARM_SHIRT) /* is_shirt() */
            && !(typ === OBJ.CORPSE && verysmall(mons[obj.corpsenm]))
            && typ !== OBJ.FORTUNE_COOKIE && typ !== OBJ.CANDY_BAR
            && typ !== OBJ.PANCAKE
            && typ !== OBJ.LEMBAS_WAFER && typ !== OBJ.LUMP_OF_ROYAL_JELLY
            && obj.oclass !== OBJ.AMULET_CLASS && obj.oclass !== OBJ.RING_CLASS
            && obj.oclass !== OBJ.VENOM_CLASS && typ !== OBJ.SACK
            && typ !== OBJ.BAG_OF_HOLDING && typ !== OBJ.BAG_OF_TRICKS
            && !Is_candle(obj) && typ !== OBJ.OILSKIN_SACK && typ !== OBJ.LEASH
            && typ !== OBJ.STETHOSCOPE && typ !== OBJ.BLINDFOLD && typ !== OBJ.TOWEL
            && typ !== OBJ.TIN_WHISTLE && typ !== OBJ.MAGIC_WHISTLE
            && typ !== OBJ.MAGIC_MARKER && typ !== OBJ.TIN_OPENER
            && typ !== OBJ.SKELETON_KEY
            && typ !== OBJ.LOCK_PICK)
            return true;
        if (Is_container(obj) && obj.cobj && obj.cobj.length !== 0)
            return true;
    }
    return false;
}
// C ref: monmove.c can_fog()
export function can_fog(mtmp) {
    if (!(game.mvitals[M.PM_FOG_CLOUD].mvflags & G_GENOD) && is_vampshifter(mtmp)
        && !Protection_from_shape_changers() /* !Protection_from_shape_changers */
        && !stuff_prevents_passage(mtmp))
        return true;
    return false;
}

// C ref: monmove.c vamp_shift()
/* this is called when a vampire turns into a fog cloud in order to move
   under a closed door; if it was sensed via telepathy or seen via
   infravision, its new fog cloud shape will disappear */
async function vamp_shift(mon, ptr, domsg) {
    let reslt = 0;

    if (mon.data === ptr) {
        /* already right shape */
        reslt = 1;
    } else if (is_vampshifter(mon)) {
        reslt = await newcham(mon, ptr, domsg ? NC_SHOW_MSG : NO_NC_FLAGS);
        /* shape-change message is given when vampshifter turns into a
           fog cloud in order to move under a closed door */
        await tty_display_nhwindow(game.WIN_MESSAGE, false);
    }
    return reslt;
}

// ── C ref: mhitu.c ranged_attk_available() ──
function ranged_attk_available(mtmp) {
    let typ = -1;
    const ptr = mtmp.data;

    for (const a of ptr.mattk) {
        if ((a.aatyp === M.AT_SPIT || a.aatyp === M.AT_BREA /* DISTANCE_ATTK_TYPE() */
             || a.aatyp === M.AT_MAGC || a.aatyp === M.AT_GAZE)
            && (typ = get_atkdam_type(a.adtyp)) >= 0
            && ((mtmp.seen_resistance || 0)
                & cvt_adtyp_to_mseenres(typ)) === 0) /* m_seenres() */
            return true;
    }
    return false;
}

// ── C ref: mon.c m_respond() ──
export function m_respond(mtmp) {
    if (mtmp.data.msound === M.MS_SHRIEK
        && !(Math.abs(mtmp.mx - game.u.ux) > 1 || Math.abs(mtmp.my - game.u.uy) > 1))
        throw new Error('m_respond_shrieker() not ported yet');
    if (mtmp.data === mons[M.PM_MEDUSA] && couldsee(mtmp.mx, mtmp.my))
        throw new Error('m_respond_medusa() not ported yet');
    /* Erinyes will inform surrounding monsters of your crimes */
    if (mtmp.data === mons[M.PM_ERINYS] && !mtmp.mpeaceful && m_canseeu(mtmp))
        aggravate_mm();
}

// C ref: monmove.c m_arrival()
/* perform a special one-time action for a monster; returns -1 if nothing
   special happened, 0 if monster uses up its turn, 1 if monster is killed */
function m_arrival(mon) {
    mon.mstrategy &= ~STRAT_ARRIVE; /* always reset */

    return -1;
}

// ── C ref: monmove.c find_pmmonst() ──
function find_pmmonst(pm) {
    let mtmp = null;

    if ((game.mvitals[pm].mvflags & G_GENOD) === 0)
        for (mtmp = game.fmon; mtmp; mtmp = mtmp.nmon) {
            if (mtmp.mhp < 1) /* DEADMONSTER() */
                continue;
            if (mtmp.data === mons[pm])
                break;
        }

    return mtmp || null;
}

// ── C ref: monmove.c bee_eat_jelly() ──
/* killer bee 'mon' is on a spot containing lump of royal jelly 'obj' and
   will eat it if there is no queen bee on the level; return 1: mon died,
   0: mon ate jelly and used up its move, -1: mon didn't eat jelly to use
   its move [the return values are ordered so that a caller who does
   'if (res >= 0) return res' gets the right result] */
async function bee_eat_jelly(mon, obj) {
    let m_delay;
    const mtmp = find_pmmonst(M.PM_QUEEN_BEE);

    /* if there's no queen on the level, eat the royal jelly and become one */
    if (!mtmp) {
        m_delay = obj.blessed ? 3 : !obj.cursed ? 5 : 7;
        if (obj.quan > 1)
            obj = splitobj(obj, 1);
        if (canseemon(mon))
            await pline(`${Monnam(mon)} eats ${an(xname(obj))}.`); /* pline_mon() */
        delobj(obj);

        if (mon.m_lev < mons[M.PM_QUEEN_BEE].mlevel - 1)
            mon.m_lev = mons[M.PM_QUEEN_BEE].mlevel - 1;
        /* there should be delay after eating, but that's too much
           hassle; transform immediately, then have a short delay */
        await grow_up(mon, null);

        if (mon.mhp < 1) /* DEADMONSTER() */
            return 1; /* dead; apparently queen bees have been genocided */
        mon.mfrozen = m_delay, mon.mcanmove = 0;
        return 0; /* bee used its move */
    }
    return -1; /* a queen is already present; ordinary bee hasn't moved yet */
}

/* C ref: obj.h is_mines_prize(), is_soko_prize() */
export function is_mines_prize(o) {
    return o.o_id === game.context.achieveo?.mines_prize_oid;
}
export function is_soko_prize(o) {
    return o.o_id === game.context.achieveo?.soko_prize_oid;
}

// ── C ref: monmove.c gelcube_digests() ──
/* gelatinous cube eats something from its inventory */
async function gelcube_digests(mtmp) {
    if (mtmp.meating || !mtmp.minvent || !mtmp.minvent.length)
        return -1;

    /* walk mon->minvent in C chain order (newest first) */
    let otmp = null;
    for (const o of mtmp.minvent.slice().reverse()) {
        if (is_organic(o) && !o.oartifact
            && !is_mines_prize(o) && !is_soko_prize(o)) {
            otmp = o;
            break;
        }
    }

    if (!otmp)
        return -1;

    mtmp.meating = eaten_stat(mtmp.meating, otmp);
    extract_from_minvent(mtmp, otmp, true, true);
    await m_consume_obj(mtmp, otmp);
    return 0; /* used a move */
}

// ── C ref: monmove.c dochug() ──
export async function dochug(mtmp) {
    const u = game.u;
    let mdat;
    let status = MMOVE_NOTHING;
    const d = { inrange: 0, nearby: 0, scared: 0 };
    let panicattk = false;

    /*
     * PHASE ONE: Pre-movement adjustments
     */

    mdat = mtmp.data;

    if (mtmp.mstrategy & STRAT_ARRIVE) {
        const res = m_arrival(mtmp);
        if (res >= 0)
            return res;
    }
    /* check for waitmask status change */
    if ((mtmp.mstrategy & STRAT_WAITFORU)
        && (m_canseeu(mtmp) || mtmp.mhp < mtmp.mhpmax))
        mtmp.mstrategy &= ~STRAT_WAITFORU;

    /* update quest status flags */
    quest_stat_check(mtmp);

    if (!mtmp.mcanmove || (mtmp.mstrategy & STRAT_WAITMASK)) {
        if (Hallucination())
            newsym(mtmp.mx, mtmp.my);
        if (mtmp.mcanmove && (mtmp.mstrategy & STRAT_CLOSE)
            && !mtmp.msleeping && monnear(mtmp, u.ux, u.uy))
            await quest_talk(mtmp); /* give the leaders a chance to speak */
        return 0; /* other frozen monsters can't do anything */
    }

    /* there is a chance we will wake it */
    if (mtmp.msleeping && !(await disturb(mtmp))) {
        if (Hallucination())
            newsym(mtmp.mx, mtmp.my);
        return 0;
    }

    /* not frozen or sleeping: wipe out texts written in the dust */
    wipe_engr_at(mtmp.mx, mtmp.my, 1, false);

    /* confused monsters get unconfused with small probability */
    if (mtmp.mconf && !rn2(50))
        mtmp.mconf = 0;

    /* stunned monsters get un-stunned with larger probability */
    if (mtmp.mstun && !rn2(10))
        mtmp.mstun = 0;

    /* Some monsters teleport. Teleportation costs a turn. */
    if (mtmp.mflee && !rn2(40) && can_teleport(mdat) && !mtmp.iswiz
        && !noteleport_level(mtmp)) {
        if (await rloc(mtmp, RLOC_MSG))
            await leppie_stash(mtmp);
        return 0;
    }

    /* some monsters have special abilities */
    m_respond(mtmp);

    /* fleeing monsters might regain courage */
    if (mtmp.mflee && !mtmp.mfleetim && mtmp.mhp === mtmp.mhpmax
        && !rn2(25))
        mtmp.mflee = 0;

    /* Cease conflict-induced swallow/grab if conflict has ended. Releasing
       the hero in this way uses up the monster's turn. */
    if (mtmp === u.ustuck && mtmp.mpeaceful && !mtmp.mconf && !Conflict()) {
        await release_hero(mtmp);
        return 0;
    }

    /*
     * PHASE TWO: Special Movements and Actions
     */

    /* The monster decides where it thinks you are. */
    set_apparxy(mtmp);

    /* Monsters that want to acquire things may teleport, so do it before
       inrange is set. This costs a turn only if mstate is set.  */
    if (is_covetous(mdat)) {
        await tactics(mtmp);
        /* tactics -> mnexto -> deal_with_overcrowding */
        if (mtmp.mstate)
            return 0;
        set_apparxy(mtmp);
    }

    /* check distance and scariness of attacks */
    await distfleeck(mtmp, d);

    /* search for and potentially use defensive or miscellaneous items. */
    if (await find_defensive(mtmp, false)) {
        if (await use_defensive(mtmp) !== 0)
            return 1;
    } else if (await find_misc(mtmp)) {
        if (await use_misc(mtmp) !== 0)
            return 1;
    }

    /* Demonic Blackmail! */
    if (d.nearby && mdat.msound === M.MS_BRIBE && mtmp.mpeaceful
        && !mtmp.mtame && !u.uswallow)
        throw new Error('dochug(): demon_talk() not ported yet');

    /* the watch will look around and see if you are up to no good :-) */
    if (is_watch(mdat)) {
        await watch_on_duty(mtmp);
    /* mind flayers can make psychic attacks! */
    } else if (is_mind_flayer(mdat) && !rn2(20)) {
        await mind_blast(mtmp);
        set_apparxy(mtmp);
        await distfleeck(mtmp, d);
    }

    /* If monster is nearby you, and has to wield a weapon, do so.  This
     * costs the monster a move, of course.
     */
    if ((!mtmp.mpeaceful || Conflict()) && d.inrange
        && dist2(mtmp.mx, mtmp.my, mtmp.mux, mtmp.muy) <= 8
        && attacktype(mdat, M.AT_WEAP)) {
        /* The scared check is necessary.  Otherwise a monster that is
         * one square near the player but fleeing into a wall would keep
         * switching between pick-axe and weapon.  If monster is stuck
         * in a trap, prefer ranged weapon (wielding is done in thrwmu).
         * This may cost the monster an attack, but keeps the monster
         * from switching back and forth if carrying both.
         */
        const mw_tmp = mtmp.mw || null; /* MON_WEP(mtmp) */
        if (!(d.scared && mw_tmp && is_pick(mw_tmp))
            && mtmp.weapon_check === NEED_WEAPON
            && !(mtmp.mtrapped && !d.nearby && select_rwep(mtmp))) {
            mtmp.weapon_check = NEED_HTH_WEAPON;
            if (await mon_wield_item(mtmp) !== 0)
                return 0;
        }
    }

    /*
     * PHASE THREE: Now the actual movement phase
     */

    /* A killer bee may eat honey in order to turn into a queen bee,
       costing it a move. */
    let otmp, res;
    if (mdat === mons[M.PM_KILLER_BEE]
        /* could be smarter and deliberately move to royal jelly, but
           then we'd need to scan the level for queen bee in advance;
           avoid that overhead and rely on serendipity... */
        && (otmp = sobj_at(OBJ.LUMP_OF_ROYAL_JELLY, mtmp.mx, mtmp.my)) !== null
        && (res = await bee_eat_jelly(mtmp, otmp)) >= 0)
        return res;

    if (mdat === mons[M.PM_GELATINOUS_CUBE]
        && (res = await gelcube_digests(mtmp)) >= 0)
        return res;

    /* A monster that passes the following checks has the opportunity
       to move. Movement itself is handled by the m_move() function. */
    if (!d.nearby || mtmp.mflee || d.scared || mtmp.mconf || mtmp.mstun
        || (mtmp.minvis && !rn2(3))
        || (mdat.mlet === M.S_LEPRECHAUN && !findgold_mm(game.invent)
            && (findgold_mm(mtmp.minvent) || rn2(2)))
        || (is_wanderer(mdat) && !rn2(4)) || (Conflict() && !mtmp.iswiz)
        || (!mtmp.mcansee && !rn2(4)) || mtmp.mpeaceful) {

        /* Possibly cast an undirected spell if not attacking you */
        /* note that most of the time castmu() will pick a directed
           spell and do nothing, so the monster moves normally */
        /* arbitrary distance restriction to keep monster far away
           from you from having cast dozens of sticks-to-snakes
           or similar spells by the time you reach it */
        if (!mtmp.mspec_used
            && dist2(mtmp.mx, mtmp.my, u.ux, u.uy) <= 49) {
            for (const a of mdat.mattk) {
                if (a.aatyp === M.AT_MAGC
                    && (a.adtyp === M.AD_SPEL || a.adtyp === M.AD_CLRC)) {
                    if ((await castmu(mtmp, a, false, false) & M_ATTK_HIT)) {
                        status = MMOVE_DONE; /* bypass m_move() */
                        break;
                    }
                }
            }
        }

        if (!status)
            status = await m_move(mtmp, 0);
        if (mon_offmap(mtmp))
            return 1;
        if (status !== MMOVE_DIED)
            await distfleeck(mtmp, d); /* recalc */

        switch (status) { /* for pets, cases 0 and 3 are equivalent */
        case MMOVE_NOMOVES:
            if (d.scared)
                panicattk = true;
            /*FALLTHRU*/
        case MMOVE_NOTHING: /* no movement, but it can still attack you */
        case MMOVE_DONE: /* absolutely no movement */
            /* vault guard might have vanished */
            if (mtmp.isgd && (DEADMONSTER_mm(mtmp) || mtmp.mx === 0))
                return 1; /* behave as if it died */
            /* During hallucination, monster appearance should
             * still change - even if it doesn't move.
             */
            if (Hallucination())
                newsym(mtmp.mx, mtmp.my);
            break;
        case MMOVE_MOVED: /* monster moved */
            /* if confused grabber has wandered off, let go */
            if (mtmp === u.ustuck && !m_next2u(mtmp))
                await unstuck(mtmp);
            if (!is_flyer(mdat) && !is_floater(mdat) /* grounded(mdat) */
                && ((mdat.mflags1 & M.M1_CLING) === 0 || !has_ceiling(game.u.uz)))
                disturb_buried_zombies(mtmp.mx, mtmp.my);
            /* Maybe it stepped on a trap and fell asleep... */
            if (helpless(mtmp))
                return 0;
            /* Monsters can move and then shoot on same turn;
               our hero can't.  Is that fair? */
            if (!d.nearby
                && (ranged_attk_available(mtmp)
                    || attacktype(mdat, M.AT_WEAP)
                    || find_offensive(mtmp)))
                break;
            /* a monster that's digesting you can move at the
             * same time -dlc
             */
            if (u.uswallow && mtmp === u.ustuck) /* engulfing_u(mtmp) */
                return await mattacku(mtmp);
            return 0;
        case MMOVE_DIED: /* monster died */
            return 1;
        }
    }

    /*
     * PHASE FOUR: Standard Attacks
     */

    /* Now, attack the player if possible - one attack set per monst */
    if (status !== MMOVE_DONE && (!mtmp.mpeaceful
                                  || (Conflict() && !resist_conflict(mtmp)))) {
        if (((d.inrange && !d.scared) || panicattk) && !noattacks(mdat)
            /* [is this hp check really needed?] */
            && (Upolyd() ? u.mh : u.uhp) > 0) {
            if (await mattacku(mtmp))
                return 1; /* monster died (e.g. exploded) */
        }
        if (mtmp.wormno) {
            if (await wormhitu(mtmp))
                return 1; /* worm died (poly'd hero passive counter-attack) */
        }
    }
    /* special speeches for quest monsters */
    if (!helpless(mtmp) && d.nearby)
        await quest_talk(mtmp);
    /* extra emotional attack for vile monsters */
    if (d.inrange && mtmp.data.msound === M.MS_CUSS && !mtmp.mpeaceful
        && couldsee(mtmp.mx, mtmp.my) && !mtmp.minvis && !rn2(5))
        await cuss(mtmp);

    /* note: can't get here when monster is dead, so this always returns 0 */
    return (status === MMOVE_DIED) ? 1 : 0;
}


// ── C ref: monmove.c mon_track_add() ──
export function mon_track_add(mtmp, x, y) {
    if (!mtmp.mtrack) mon_track_clear(mtmp);
    for (let j = MTSZ - 1; j > 0; j--)
        mtmp.mtrack[j] = mtmp.mtrack[j - 1];
    mtmp.mtrack[0] = { x, y };
}
// ── C ref: monmove.c mon_track_clear() ──
export function mon_track_clear(mtmp) {
    mtmp.mtrack = Array.from({ length: MTSZ }, () => ({ x: 0, y: 0 }));
}

// ── C ref: monmove.c m_avoid_kicked_loc() ──
export function m_avoid_kicked_loc(mtmp, nx, ny) {
    const kl = game.kickedloc;
    if ((mtmp.mpeaceful || mtmp.mtame)
        && mtmp.mcansee
        && !mtmp.mconf && !mtmp.mstun
        && !Conflict()
        && kl && isok(kl.x, kl.y)
        && nx === kl.x && ny === kl.y
        && Math.abs(nx - game.u.ux) <= 1 && Math.abs(ny - game.u.uy) <= 1)
        return true;
    return false;
}

// ── C ref: monmove.c m_move_aggress() ──
/* The part of m_move that deals with a monster attacking another monster
   (and that monster possibly retaliating).
   Extracted into its own function so that it can be called with monsters
   that have special move patterns (shopkeepers, priests, etc) that want
   to attack other monsters but aren't just roaming freely around the
   level (so allowing m_move to run fully for them could select an
   invalid move).
   x and y are the coordinates mtmp wants to attack.
   Return values are the same as for m_move, but this function only return
   MMOVE_DIED or MMOVE_DONE. */
async function m_move_aggress(mtmp, x, y) {
    let mtmp2;
    let mstatus = 0; /* M_ATTK_MISS */

    mtmp2 = m_at(x, y);
    if (mtmp2) {
        game.bhitpos = { x, y };
        game.notonhead = (x !== mtmp2.mx || y !== mtmp2.my);
        mstatus = await mattackm(mtmp, mtmp2);
    }

    if ((mstatus & M_ATTK_AGR_DIED) || mtmp.mhp < 1) /* aggressor died */
        return MMOVE_DIED;

    if ((mstatus & (M_ATTK_HIT | M_ATTK_DEF_DIED)) === M_ATTK_HIT
        && rn2(4) && mtmp2.movement > rn2(NORMAL_SPEED)) {
        if (mtmp2.movement > NORMAL_SPEED)
            mtmp2.movement -= NORMAL_SPEED;
        else
            mtmp2.movement = 0;
        game.bhitpos = { x: mtmp.mx, y: mtmp.my };
        game.notonhead = false;
        mstatus = await mattackm(mtmp2, mtmp); /* return attack */
        /* note: at this point, defender is the original (moving) aggressor */
        if (mstatus & M_ATTK_DEF_DIED)
            return MMOVE_DIED;
    }
    return MMOVE_DONE;
}

// ── C ref: mon.c meatmetal() ──
/* for rust monsters and rock moles: eats the topmost metal object on the
   monster's spot; returns 0 if nothing eaten, 1 if something eaten,
   2 if the monster died */
async function meatmetal(mtmp) {
    let otmpname;
    const vis = canseemon(mtmp);

    /* If a pet, eating is handled separately, in dog.c */
    if (mtmp.mtame)
        return 0;

    /* Eats topmost metal object if it is there; the pile at <mx,my> is
       read from fobj (newest first), like svl.level.objects[x][y] */
    const pile = (game.level.objects || []).filter(
        o => o.where === 'OBJ_FLOOR' && o.ox === mtmp.mx && o.oy === mtmp.my);
    for (const otmp of pile) {
        /* Don't eat indigestible/choking/inappropriate objects */
        if ((mtmp.data === mons[M.PM_RUST_MONSTER] && !is_rustprone(otmp))
            || (otmp.otyp === AMULET_OF_STRANGULATION
                || otmp.otyp === RIN_SLOW_DIGESTION)
            || (otmp.otrapped /* opoisoned */ && !resists_poison(mtmp)))
            continue;
        if (is_metallic(otmp) && !obj_resists(otmp, 5, 95)
            && await touch_artifact(otmp, mtmp)) {
            if (mtmp.data === mons[M.PM_RUST_MONSTER] && otmp.oerodeproof) {
                if (vis) {
                    /* call distant_name() for its side-effects even when
                       !verbose so won't be printed */
                    otmpname = distant_name(otmp, doname);
                    if (game.flags.verbose) /* pline_mon() */
                        await pline(`${Monnam(mtmp)} eats ${otmpname}!`);
                }
                /* The object's rustproofing is gone now */
                otmp.oerodeproof = 0;
                mtmp.mstun = 1;
                if (vis) {
                    /* (see above; format even if it won't be printed) */
                    otmpname = distant_name(otmp, doname);
                    if (game.flags.verbose)
                        await pline(`${Monnam(mtmp)} spits ${otmpname} out in disgust!`);
                }
            } else {
                if (cansee(mtmp.mx, mtmp.my)) {
                    /* (see above; format even if it won't be printed) */
                    otmpname = distant_name(otmp, doname);
                    if (game.flags.verbose)
                        await pline(`${Monnam(mtmp)} eats ${otmpname}!`);
                } else {
                    if (game.flags.verbose) {
                        /* Soundeffect(se_crunching_sound, 50) */
                        await You_hear("a crunching sound.");
                    }
                }
                mtmp.meating = Math.trunc(otmp.owt / 2) + 1;
                await m_consume_obj(mtmp, otmp);
                if (mtmp.mhp < 1) /* DEADMONSTER() */
                    return 2;
                /* Left behind a pile? */
                if (rnd(25) < 3)
                    mksobj_at(ROCK, mtmp.mx, mtmp.my, true, false);
                newsym(mtmp.mx, mtmp.my);
                return 1;
            }
        }
    }
    return 0;
}

// ── C ref: mon.c meatobj() ──
/* monster eats a pile of objects */
async function meatobj(mtmp) /* for gelatinous cubes */ {
    let ptr;
    const original_ptr = mtmp.data;
    let count = 0, ecount = 0;
    let buf = '', otmpname;

    /* If a pet, eating is handled separately, in dog.c */
    if (mtmp.mtame)
        return 0;

    /* eat organic objects, including cloth and wood, if present;
       engulf others, except huge rocks and metal attached to player
       [despite comment at top, doesn't assume that eater is a g-cube];
       the pile at <mx,my> is read from fobj (newest first), like
       svl.level.objects[x][y], with otmp2 = otmp->nexthere taken first */
    const pile = (game.level.objects || []).filter(
        o => o.where === 'OBJ_FLOOR' && o.ox === mtmp.mx && o.oy === mtmp.my);
    for (const otmp of pile) {
        /* avoid special items; once hero picks them up, they'll cease
           being special, becoming eligible for engulf and devore if
           dropped again */
        if (is_mines_prize(otmp) || is_soko_prize(otmp))
            continue;

        /* touch sensitive items */
        if (otmp.otyp === CORPSE && is_rider_mm(mons[otmp.corpsenm])) {
            const ox = otmp.ox, oy = otmp.oy;
            const revived_it = await revive_corpse_mo(otmp);

            newsym(ox, oy);
            /* Rider corpse isn't just inedible; can't engulf it either */
            if (!revived_it)
                continue;
            /* [should check whether revival forced 'mtmp' off the level
               and return 3 in that situation (if possible...)] */
            break;

        /* untouchable (or inaccessible) items */
        } else if ((otmp.otyp === CORPSE
                    && touch_petrifies_mo(mons[otmp.corpsenm])
                    && !resists_ston_mm(mtmp))
                   /* don't engulf boulders and statues or ball&chain */
                   || otmp.oclass === ROCK_CLASS
                   || otmp === game.uball || otmp === game.uchain
                   /* normally mtmp won't have stepped onto scare monster
                      scroll, but if it does, don't eat or engulf that
                      (note: scrolls inside eaten containers will still
                      become engulfed) */
                   || otmp.otyp === SCR_SCARE_MONSTER) {
            /* do nothing--neither eaten nor engulfed */
            continue;

        /* inedible items -- engulf these */
        } else if (!is_organic(otmp) || obj_resists(otmp, 5, 95)
                   || !(await touch_artifact(otmp, mtmp))
                   /* redundant due to non-organic composition but
                      included for emphasis */
                   || (otmp.otyp === AMULET_OF_STRANGULATION
                       || otmp.otyp === RIN_SLOW_DIGESTION)
                   || (otmp.otrapped /* opoisoned */ && !resists_poison(mtmp))
                   /* cockatrice corpses handled above; this
                      touch_petrifies() check catches eggs */
                   || (mstoning_mo(otmp) && !resists_ston_mm(mtmp))
                   || (otmp.otyp === OBJ.GLOB_OF_GREEN_SLIME
                       && !slimeproof_mo(mtmp.data))) {
            /* engulf */
            ++ecount;
            /* call distant_name() for its possible side-effects even if
               the result won't be printed */
            otmpname = distant_name(otmp, doname);
            if (ecount === 1)
                buf = `${Monnam(mtmp)} engulfs ${otmpname}.`;
            else if (ecount === 2)
                buf = `${Monnam(mtmp)} engulfs several objects.`;
            obj_extract_self(otmp);
            mpickobj(mtmp, otmp); /* slurp */

        /* lastly, edible items; yum! */
        } else {
            /* devour */
            ++count;
            if (cansee(mtmp.mx, mtmp.my)) {
                /* (see above; distant_name() sometimes has side-effects */
                otmpname = distant_name(otmp, doname);
                if (game.flags.verbose) /* pline_mon() */
                    await pline(`${Monnam(mtmp)} eats ${otmpname}!`);
                /* give this one even if !verbose */
                if (otmp.oclass === SCROLL_CLASS
                    && objdescr_is(otmp, "YUM YUM"))
                    await pline(`Yum${otmp.blessed ? '!' : '.'}`);
            } else {
                /* Soundeffect(se_slurping_sound, 30) */
                if (game.flags.verbose)
                    await You_hear("a slurping sound.");
            }
            await m_consume_obj(mtmp, otmp);
            /* in case it polymorphed or died */
            ptr = mtmp.data;
            if (ptr !== original_ptr)
                return !ptr ? 2 : 1;
        }

        /* Engulf & devour is instant, so don't set meating */
        if (mtmp.minvis)
            newsym(mtmp.mx, mtmp.my);
    }

    if (ecount > 0) {
        if (cansee(mtmp.mx, mtmp.my) && game.flags.verbose && buf)
            await pline(buf); /* pline1() */
        else if (game.flags.verbose)
            await You_hear(`${(ecount === 1) ? "a" : "several"} slurping sound${
                (ecount === 1) ? "" : "s"}.`);
    }
    return (count > 0 || ecount > 0) ? 1 : 0;
}

// ── C ref: mon.c meatcorpse() ──
/* Monster eats a corpse off the ground.
   Return value is 0 = nothing eaten, 1 = ate a corpse, 2 = died. */
async function meatcorpse(mtmp) /* for purple worms and other voracious monsters */ {
    const original_ptr = mtmp.data;
    const x = mtmp.mx, y = mtmp.my;
    let ptr;

    /* if a pet, eating is handled separately, in dog.c */
    if (mtmp.mtame)
        return 0;

    /* skips past any globs; the pile at <x,y> is read from fobj (newest
       first), like sobj_at() and nxtobj(otmp, CORPSE, TRUE) */
    const corpses = (game.level.objects || []).filter(
        o => o.where === 'OBJ_FLOOR' && o.ox === x && o.oy === y
             && o.otyp === OBJ.CORPSE);
    for (let otmp of corpses) {
        /* won't get back here if otmp is split or gets used up */
        const corpsepm = mons[otmp.corpsenm];
        /* skip some corpses */
        if (vegan_mm(corpsepm) /* ignore veggy corpse even if omnivorous */
            /* don't eat harmful corpses */
            || (flesh_petrifies_mm(corpsepm) && !resists_ston_mm(mtmp)))
            continue;
        if (is_rider_mm(corpsepm)) {
            /* revive_corpse(otmp), newsym(x, y) */
            throw new Error('meatcorpse(): Rider corpse revival not ported yet');
        }

        if (otmp.quan > 1)
            otmp = splitobj(otmp, 1);

        if (cansee(x, y) && canseemon(mtmp)) {
            /* call distant_name() for its possible side-effects even if
               the result won't be printed */
            const otmpname = distant_name(otmp, doname);

            if (game.flags.verbose) /* pline_mon() */
                await pline(`${Monnam(mtmp)} eats ${otmpname}!`);
        } else {
            /* Soundeffect(se_masticating_sound, 50) */
            if (game.flags.verbose)
                await You_hear("a masticating sound.");
        }

        await m_consume_obj(mtmp, otmp);
        /* in case it polymorphed or died */
        ptr = mtmp.data;
        if (ptr !== original_ptr)
            return !ptr ? 2 : 1;

        /* Engulf & devour is instant, so don't set meating */
        if (mtmp.minvis)
            newsym(x, y);

        return 1;
    }
    return 0;
}

// ── C ref: monmove.c m_avoid_soko_push_loc() ──
/* return TRUE if monster shouldn't move to (nx,ny) to avoid pushing boulder
   in sokoban: if hero is 2 squares away, and there's a boulder between the
   location and hero */
export function m_avoid_soko_push_loc(mtmp, nx, ny) {
    if (game.level.flags.sokoban_rules /* Sokoban */
        && (mtmp.mpeaceful || mtmp.mtame)
        && !mtmp.mconf && !mtmp.mstun
        && !Conflict()
        && (dist2(nx, ny, game.u.ux, game.u.uy) === 4)
        && sobj_at(BOULDER, nx + Math.sign(game.u.ux - nx), ny + Math.sign(game.u.uy - ny)))
        return true;
    return false;
}

// ── C ref: monmove.c should_displace() ──
export function should_displace(mtmp, mfp, ggx, ggy) {
    let shortest_with_displacing = -1;
    let shortest_without_displacing = -1;
    let count_without_displacing = 0;

    for (let i = 0; i < mfp.cnt; i++) {
        const nx = mfp.poss[i].x;
        const ny = mfp.poss[i].y;
        const ndist = dist2(nx, ny, ggx, ggy);
        if (MON_AT(nx, ny) && (mfp.info[i] & ALLOW_MDISP)
            && !(mfp.info[i] & ALLOW_M)
            && !undesirable_disp(mtmp, nx, ny)) {
            if (shortest_with_displacing === -1
                || (ndist < shortest_with_displacing))
                shortest_with_displacing = ndist;
        } else {
            if ((shortest_without_displacing === -1)
                || (ndist < shortest_without_displacing))
                shortest_without_displacing = ndist;
            count_without_displacing++;
        }
    }
    if (shortest_with_displacing > -1
        && (shortest_with_displacing < shortest_without_displacing
            || !count_without_displacing))
        return true;
    return false;
}
// C ref: monmove.c undesirable_disp()
/* Is the square close enough for the monster to move or attack into?
 * Is a monster barging into a square (to swap places) undesirable?
 * not an accidental bump, so we don't consider mstun or mconf here. */
export function undesirable_disp(
    mtmp, /* barging creature */
    x,
    y) /* spot 'mtmp' is considering moving to */
{
    const is_pet = (mtmp.mtame && !mtmp.isminion);
    const trap = t_at_mm(x, y);

    if (is_pet) {
        /* Pets avoid a trap if you've seen it usually. */
        if (trap && trap.tseen && rn2(40))
            return true;
        /* Pets avoid cursed locations */
        if (cursed_object_at_ud(x, y))
            return true;

    /* Monsters avoid a trap if they've seen that type before */
    } else if (trap && rn2(40)
               && mon_knows_traps(mtmp, trap.ttyp)) {
        return true;
    }

    /* oversimplification:  creatures that bargethrough can't swap places
       when target monster is in rock or closed door or water (in particular,
       avoid moving to spots where mondied() won't leave a corpse; doesn't
       matter whether barger is capable of moving to such a target spot if
       it were unoccupied) */
    if (!accessible(x, y)
        /* mondied() allows is_pool() as an exception to !accessible(),
           but we'll only do that if 'mtmp' is already at a water location
           so that we don't swap a water critter onto land */
        && !(is_pool(x, y) && is_pool(mtmp.mx, mtmp.my)))
        return true;

    return false;
}

// ── C ref: mthrowu.c linedup() ──
export function linedup(ax, ay, bx, by, boulderhandling) {
    const tbx = ax - bx, tby = ay - by;
    game.tbx = tbx;
    game.tby = tby;

    /* sometimes displacement makes a monster think that you're at its
       own location; prevent it from throwing and zapping in that case */
    if (!tbx && !tby)
        return false;

    /* straight line, orthogonal to the map or diagonal */
    if ((!tbx || !tby || Math.abs(tbx) === Math.abs(tby))
        && distmin(tbx, tby, 0, 0) < BOLT_LIM) {
        if (u_at(ax, ay) ? couldsee(bx, by) : clear_path(ax, ay, bx, by))
            return true;
        /* don't have line of sight, but might still be lined up
           if that lack of sight is due solely to boulders */
        if (boulderhandling === 0)
            return false;
        const dx = Math.sign(ax - bx), dy = Math.sign(ay - by);
        let boulderspots = 0;
        do {
            /* <bx,by> is guaranteed to eventually converge with <ax,ay> */
            bx += dx, by += dy;
            if (blocking_terrain(bx, by))
                return false;
            if (sobj_at(BOULDER, bx, by))
                ++boulderspots;
        } while (bx !== ax || by !== ay);
        /* reached target position without encountering obstacle */
        if (boulderhandling === 1 || rn2(2 + boulderspots) < 2)
            return true;
    }
    return false;
}
// C ref: mthrowu.c linedup_callback()
/* Return TRUE if fnc returns TRUE for any location between <ax,ay> and
   <bx,by> (excluding <bx,by> itself, including <ax,ay>) */
export function linedup_callback(ax, ay, bx, by, fnc) {
    let dx, dy;

    /* These two values are set for use after successful return. */
    game.tbx = ax - bx;
    game.tby = ay - by;

    /* sometimes displacement makes a monster think that you're at its
       own location; prevent it from throwing and zapping in that case */
    if (!game.tbx && !game.tby)
        return false;

    /* straight line, orthogonal to the map or diagonal */
    if ((!game.tbx || !game.tby || Math.abs(game.tbx) === Math.abs(game.tby))
        && distmin(game.tbx, game.tby, 0, 0) < BOLT_LIM) {
        dx = Math.sign(ax - bx), dy = Math.sign(ay - by);
        do {
            /* <bx,by> is guaranteed to eventually converge with <ax,ay> */
            bx += dx, by += dy;
            if (blocking_terrain(bx, by))
                return false;
            if (fnc(bx, by))
                return true;
        } while (bx !== ax || by !== ay);
    }
    return false;
}

// C ref: mthrowu.c blocking_terrain()
function blocking_terrain(x, y) {
    if (!isok(x, y) || IS_OBSTRUCTED(game.level.at(x, y).typ)
        || closed_door(x, y)
        || IS_WATERWALL(game.level.at(x, y).typ) /* is_waterwall(x, y) */
        || game.level.at(x, y).typ === LAVAWALL)
        return true;
    return false;
}

// ── C ref: mthrowu.c lined_up() ──
/* is mtmp in position to use ranged attack on hero? */
export function lined_up(mtmp) {
    return m_lined_up(game.youmonst, mtmp) ? true : false;
}

// ── C ref: monmove.c m_balks_at_approaching() ──
function m_balks_at_approaching(oldappr, mtmp, pr) {
    const mwep = mtmp.mw || null; /* MON_WEP(mtmp) */
    const x = mtmp.mx, y = mtmp.my, ux = mtmp.mux, uy = mtmp.muy;
    const edist = dist2(x, y, ux, uy);
    let arw;

    pr.min = 0;
    pr.max = 0;

    /* peaceful, far away, or can't see you */
    if (mtmp.mpeaceful || (edist >= 5 * 5) || !m_canseeu(mtmp))
        return oldappr;

    /* has ammo+launcher */
    if (m_has_launcher_and_ammo(mtmp))
        return -1;

    /* is using a polearm and in range */
    if (mtmp.mw && is_pole(mtmp.mw)
        && edist <= MON_POLE_DIST)
        return -1;

    /* is using a throw-and-return weapon; provide min and max preferred range
     */
    if (mwep && (arw = autoreturn_weapon(mwep)) != null) {
        pr.min = 2 * 2;
        pr.max = arw.range;
        return -2;
    }

    /* can attack from distance, and hp loss or attack not used */
    if (ranged_attk_available(mtmp)
        && ((mtmp.mhp < Math.trunc((mtmp.mhpmax + 1) / 3))
            || !mtmp.mspec_used))
        return -1;

    return oldappr; /* leaves appr unchanged */
}

// ── C ref: dogmove.c could_reach_item() ──
function could_reach_item(mon, nx, ny) {
    if ((!is_pool(nx, ny) || is_swimmer(mon.data))
        && (!is_lava(nx, ny) || likes_lava(mon.data))
        && (!sobj_at(BOULDER, nx, ny) || throws_rocks(mon.data)))
        return true;
    return false;
}

const practical = [WEAPON_CLASS, ARMOR_CLASS, GEM_CLASS, FOOD_CLASS];
const magical = [AMULET_CLASS, POTION_CLASS, SCROLL_CLASS, WAND_CLASS,
                 RING_CLASS, SPBOOK_CLASS];

// ── C ref: monmove.c mon_would_take_item() ──
export function mon_would_take_item(mtmp, otmp) {
    /* pctload = (curr_mon_load(mtmp) * 100) / max_mon_load(mtmp) */
    const pctload = () => Math.trunc((curr_mon_load(mtmp) * 100)
                                     / max_mon_load(mtmp));

    if (otmp === game.uball || otmp === game.uchain)
        return false;
    if (mtmp.mtame && otmp.cursed)
        return false; /* note: will get overridden if mtmp will eat otmp */
    if (is_unicorn(mtmp.data) && objects[otmp.otyp].oc_material !== GEMSTONE)
        return false;
    if (!mindless(mtmp.data) && !is_animal(mtmp.data) && pctload() < 75
        && searches_for_item(mtmp, otmp))
        return true;
    if (likes_gold(mtmp.data) && otmp.otyp === GOLD_PIECE && pctload() < 95)
        return true;
    if (likes_gems(mtmp.data) && otmp.oclass === GEM_CLASS
        && objects[otmp.otyp].oc_material !== MINERAL && pctload() < 85)
        return true;
    if (likes_objs(mtmp.data) && practical.includes(otmp.oclass)
        && pctload() < 75)
        return true;
    if (likes_magic(mtmp.data) && magical.includes(otmp.oclass)
        && pctload() < 85)
        return true;
    if (throws_rocks(mtmp.data) && otmp.otyp === BOULDER
        && pctload() < 50 && !game.level.flags.sokoban_rules)
        return true;
    if (mtmp.data === mons[M.PM_GELATINOUS_CUBE]
        && otmp.oclass !== ROCK_CLASS && otmp.oclass !== BALL_CLASS
        && !(otmp.otyp === OBJ.CORPSE
             && (otmp.corpsenm === M.PM_COCKATRICE
                 || otmp.corpsenm === M.PM_CHICKATRICE))) /* touch_petrifies() */
        return true;

    return false;
}
// ── C ref: muse.c searches_for_item() ──
function searches_for_item(mon, obj) {
    const typ = obj.otyp;
    const O = OBJ;

    /* don't let monsters interact with protected items on the floor */
    if (obj.where === 'OBJ_FLOOR'
        && (obj.ox === mon.mx && obj.oy === mon.my)
        && onscary(obj.ox, obj.oy, mon)) {
        return false;
    }

    if (is_animal(mon.data) || mindless(mon.data)
        || mon.data === mons[M.PM_GHOST]) /* don't loot bones piles */
        return false;

    if (typ === O.WAN_MAKE_INVISIBLE || typ === O.POT_INVISIBILITY)
        return (!mon.minvis && !mon.invis_blkd
                && !attacktype(mon.data, M.AT_GAZE));
    if (typ === O.WAN_SPEED_MONSTER || typ === O.POT_SPEED)
        return (mon.mspeed !== MFAST);

    switch (obj.oclass) {
    case O.WAND_CLASS:
        if (obj.spe <= 0)
            return false;
        if (typ === O.WAN_DIGGING)
            return !is_floater(mon.data);
        if (typ === O.WAN_POLYMORPH)
            return (mons[monsndx(mon.data)].difficulty < 6);
        if (objects[typ].oc_dir === O.RAY || typ === O.WAN_STRIKING
            || typ === O.WAN_UNDEAD_TURNING
            || typ === O.WAN_TELEPORTATION || typ === O.WAN_CREATE_MONSTER)
            return true;
        break;
    case O.POTION_CLASS:
        if (typ === O.POT_HEALING || typ === O.POT_EXTRA_HEALING
            || typ === O.POT_FULL_HEALING || typ === O.POT_POLYMORPH
            || typ === O.POT_GAIN_LEVEL || typ === O.POT_PARALYSIS
            || typ === O.POT_SLEEPING || typ === O.POT_ACID
            || typ === O.POT_CONFUSION)
            return true;
        if (typ === O.POT_BLINDNESS && !attacktype(mon.data, M.AT_GAZE))
            return true;
        break;
    case O.SCROLL_CLASS:
        if (typ === O.SCR_TELEPORTATION || typ === O.SCR_CREATE_MONSTER
            || typ === O.SCR_EARTH || typ === O.SCR_FIRE)
            return true;
        break;
    case O.AMULET_CLASS:
        if (typ === O.AMULET_OF_LIFE_SAVING)
            return !(nonliving(mon.data) || is_vampshifter(mon));
        if (typ === O.AMULET_OF_REFLECTION || typ === O.AMULET_OF_GUARDING)
            return true;
        break;
    case O.TOOL_CLASS:
        if (typ === O.PICK_AXE)
            return needspick(mon.data);
        if (typ === O.UNICORN_HORN)
            return (!obj.cursed && !is_unicorn(mon.data)
                    && mon.data !== mons[M.PM_KI_RIN]);
        if (typ === O.FROST_HORN || typ === O.FIRE_HORN)
            return (obj.spe > 0 && can_blow(mon));
        if (typ >= O.LARGE_BOX && typ <= O.BAG_OF_TRICKS /* Is_container */
            && !((typ === O.BAG_OF_HOLDING || typ === O.BAG_OF_TRICKS) /* Is_mbag */
                 && obj.cursed)
            && !obj.olocked)
            return true;
        if (typ === O.EXPENSIVE_CAMERA)
            return (obj.spe > 0);
        break;
    case O.FOOD_CLASS:
        if (typ === O.CORPSE)
            return (((mon.misc_worn_check || 0) & W_ARMG) !== 0
                    && (obj.corpsenm === M.PM_COCKATRICE
                        || obj.corpsenm === M.PM_CHICKATRICE)) /* touch_petrifies */
                || (!Resists_Elem(mon, STONE_RES) /* resists_ston() */
                    && cures_stoning(mon, obj, false));
        if (typ === O.TIN)
            return (mcould_eat_tin(mon)
                    && (!Resists_Elem(mon, STONE_RES) /* resists_ston() */
                        && cures_stoning(mon, obj, true)));
        if (typ === O.EGG && obj.corpsenm >= 0)
            return (obj.corpsenm === M.PM_COCKATRICE
                    || obj.corpsenm === M.PM_CHICKATRICE); /* touch_petrifies */
        break;
    default:
        break;
    }

    return false;
}

// ── C ref: monmove.c mon_would_consume_item() ──
function mon_would_consume_item(mtmp, otmp) {
    let ftyp;

    if (otmp.otyp === CORPSE && !touch_petrifies_mo(mons[otmp.corpsenm])
        && corpse_eater(mtmp.data))
        return true;

    if (mtmp.mtame && mtmp.edog /* has_edog(): not guardian angel */
        && (ftyp = dogfood(mtmp, otmp)) < MANFOOD
        && (ftyp < ACCFOOD || mtmp.edog.hungrytime <= game.moves))
        return true;

    return false;
}

const SQSRCHRADIUS = 5;

// ── C ref: monmove.c m_search_items() ──
function m_search_items(mtmp, st) {
    let minr = SQSRCHRADIUS; /* not too far away */
    const omx = mtmp.mx, omy = mtmp.my;
    const ptr = mtmp.data;

    /* cut down the search radius if it thinks character is closer. */
    if (distmin(mtmp.mux, mtmp.muy, omx, omy) < SQSRCHRADIUS
        && !mtmp.mpeaceful)
        minr--;
    /* guards shouldn't get too distracted */
    if (!mtmp.mpeaceful && is_mercenary(ptr))
        minr = 1;

    /* in shop, usually skip */
    let skip = false;
    if (in_shop(omx, omy) && (rn2(25) || mtmp.isshk))
        skip = true;

    if (!skip) {
        /* distmin() gives a rectangular area */
        const hmx = Math.min(COLNO - 1, omx + minr);
        const hmy = Math.min(ROWNO - 1, omy + minr);
        const lmx = Math.max(1, omx - minr);
        const lmy = Math.max(0, omy - minr);

        for (let xx = lmx; xx <= hmx; xx++) {
            for (let yy = lmy; yy <= hmy; yy++) {
                /* no object here */
                if (!OBJ_AT(xx, yy))
                    continue;
                /* found an object closer already */
                if (minr < distmin(omx, omy, xx, yy))
                    continue;
                if (!could_reach_item(mtmp, xx, yy))
                    continue;
                /* hiders avoid hero's line of sight */
                if (hides_under(ptr) && cansee(xx, yy))
                    continue;
                /* don't get stuck circling around object that's
                   underneath an immobile or hidden monster;
                   paralysis victims excluded */
                const mtoo = m_at(xx, yy);
                if (mtoo
                    && (helpless(mtoo) || mtoo.mundetected
                        || (mtoo.mappearance && !mtoo.iswiz)
                        || !mtoo.data.mmove))
                    continue;
                /* Don't get stuck circling an Elbereth */
                if (onscary(xx, yy, mtmp))
                    continue;
                /* ignore obj if there's a trap and monster knows it */
                const ttmp = t_at(xx, yy);
                if (ttmp && mon_knows_traps(mtmp, ttmp.ttyp)) {
                    if (st.ggx === xx && st.ggy === yy) {
                        st.ggx = mtmp.mux;
                        st.ggy = mtmp.muy;
                    }
                    continue;
                }
                /* avoid getting stuck on eg. items in niches */
                if (!clear_path(mtmp.mx, mtmp.my, xx, yy)) /* m_cansee() */
                    continue;

                const costly = costly_spot(xx, yy);

                /* look through the items on this location */
                for (const otmp of objects_at(xx, yy)) {
                    /* monsters may pick rocks up, but won't go out of
                       their way to grab them */
                    if (otmp.otyp === ROCK)
                        continue;
                    /* avoid special items; once hero picks them up, they'll
                       cease being special */
                    if (is_mines_prize(otmp) || is_soko_prize(otmp))
                        continue;
                    /* skip shop merchandise */
                    if (costly && !otmp.no_charge)
                        continue;
                    if (((mon_would_take_item(mtmp, otmp)
                          && (can_carry(mtmp, otmp) > 0))
                         || mon_would_consume_item(mtmp, otmp))
                        && can_touch_safely(mtmp, otmp)) {
                        minr = distmin(omx, omy, xx, yy);
                        st.ggx = otmp.ox;
                        st.ggy = otmp.oy;
                        if (st.ggx === omx && st.ggy === omy) {
                            st.mmoved = MMOVE_DONE; /* actually unnecessary */
                            return true;
                        }
                        /* found an item of interest; skip the rest of
                           the pile */
                        break;
                    }
                }
            }
        }
    }

    /* finish_search: */
    if (minr < SQSRCHRADIUS && st.appr === -1) {
        if (distmin(omx, omy, mtmp.mux, mtmp.muy) <= 3) {
            st.ggx = mtmp.mux;
            st.ggy = mtmp.muy;
        } else
            st.appr = 1;
    }
    return false;
}

// ── C ref: monmove.c holds_up_web() ──
/* can a web be anchored at x,y? */
function holds_up_web(x, y) {
    let sway;
    const lev = isok(x, y) ? game.level.at(x, y) : null;

    if (!isok(x, y)
        || IS_OBSTRUCTED(lev.typ)
        || ((lev.typ === STAIRS || lev.typ === LADDER)
            && (sway = stairway_at(x, y)) != null && sway.up)
        || lev.typ === IRONBARS)
        return true;

    return false;
}

// ── C ref: monmove.c count_webbing_walls() ──
/* returns the number of walls in the four cardinal directions that could
   hold up a web */
function count_webbing_walls(x, y) {
    return ((holds_up_web(x, y - 1) ? 1 : 0) + (holds_up_web(x + 1, y) ? 1 : 0)
            + (holds_up_web(x, y + 1) ? 1 : 0) + (holds_up_web(x - 1, y) ? 1 : 0));
}

// ── C ref: monmove.c soko_allow_web() ──
/* reject webs which interfere with solving Sokoban */
function soko_allow_web(mon) {
    /* for a non-Sokoban level or a solved Sokoban level, no restriction */
    if (!game.level.flags?.sokoban_rules) /* Sokoban */
        return true;
    /* not-yet-solved Sokoban level:  allow web only when spinner can see
       the stairs up [we really want 'is in same chamber as stairs up'] */
    const stway = stairway_find_dir(true); /* stairs up */
    if (stway && clear_path(mon.mx, mon.my, stway.sx, stway.sy)) /* m_cansee() */
        return true;
    return false;
}

// ── C ref: trap.c count_traps() ──
function count_traps(ttyp) {
    let ret = 0;
    for (const trap of game.level.traps || [])
        if (trap.ttyp === ttyp)
            ret++;
    return ret;
}

// ── C ref: monmove.c maybe_spin_web() ──
/* monster might spin a web */
async function maybe_spin_web(mtmp) {
    if (webmaker(mtmp.data)
        && !helpless(mtmp) && !mtmp.mspec_used
        && !t_at(mtmp.mx, mtmp.my) && soko_allow_web(mtmp)) {
        let trap;
        const prob = ((((mtmp.data === mons[M.PM_GIANT_SPIDER]) ? 15 : 5)
                       * (count_webbing_walls(mtmp.mx, mtmp.my) + 1))
                      - (3 * count_traps(WEB)));

        if (rn2(1000) < prob
            && (trap = maketrap(mtmp.mx, mtmp.my, WEB)) != null) {
            mtmp.mspec_used = d(4, 4); /* 4..16 */
            if (cansee(mtmp.mx, mtmp.my)) {
                const mbuf = canspotmon(mtmp) ? y_monnam(mtmp) : "something";
                await pline(`${mbuf.charAt(0).toUpperCase()}${mbuf.slice(1)} spins a web.`); /* pline_mon(), upstart() */
                trap.tseen = 1;
            }
            if (in_shop(mtmp.mx, mtmp.my)) /* *in_rooms(mx, my, SHOPBASE) */
                add_damage(mtmp.mx, mtmp.my, 0);
        }
    }
}

// ── C ref: monmove.c m_digweapon_check() ──
/* monster can tunnel and wants to; maybe wield a digging tool;
   return True if it spends this move wielding one, False otherwise */
export async function m_digweapon_check(mtmp, nix, niy) {
    let can_tunnel = false;
    const mw_tmp = mtmp.mw; /* MON_WEP(mtmp) */

    if (!Is_rogue_level(game.u.uz))
        can_tunnel = tunnels(mtmp.data);

    if (can_tunnel && needspick(mtmp.data) && !mwelded(mw_tmp)
        && (may_dig(nix, niy) || closed_door(nix, niy))) {
        const typ = game.level.at(nix, niy).typ;
        /* may_dig() is either IS_STWALL or IS_TREE */
        if (closed_door(nix, niy)) {
            if (!mw_tmp || !is_pick(mw_tmp) || !is_axe(mw_tmp))
                mtmp.weapon_check = NEED_PICK_OR_AXE;
        } else if (IS_TREE(typ)) {
            if (!mw_tmp || !is_axe(mw_tmp))
                mtmp.weapon_check = NEED_AXE;
        } else if (IS_STWALL(typ)) {
            if (!mw_tmp || !is_pick(mw_tmp))
                mtmp.weapon_check = NEED_PICK_AXE;
        }
        if (mtmp.weapon_check >= NEED_PICK_AXE && await mon_wield_item(mtmp))
            return true;
    }
    return false;
}

// ── C ref: monmove.c m_move() ──
export async function m_move(mtmp, after) {
    const u = game.u;
    let appr;
    let ggx, ggy, nix, niy;
    let chcnt;
    let can_tunnel = false;
    let can_open = false, can_unlock = false;
    let getitems = false;
    let avoid = false;
    let better_with_displacing = false;
    let ptr;
    let chi, mmoved = MMOVE_NOTHING;
    const pr = { min: 0, max: 0 };
    let flag;
    let omx = mtmp.mx, omy = mtmp.my;

    if (!mtmp.mtrack) mon_track_clear(mtmp);

    if (mtmp.mtrapped) {
        const i = await mintrap(mtmp, NO_TRAP_FLAGS);

        if (i === Trap_Killed_Mon) {
            newsym(mtmp.mx, mtmp.my);
            return MMOVE_DIED;
        } /* it died */
        if (i === Trap_Caught_Mon)
            return MMOVE_NOTHING; /* still in trap, so didn't move */
    }
    ptr = mtmp.data; /* mintrap() can change mtmp->data -dlc */

    if (mtmp.meating) {
        mtmp.meating--;
        if (mtmp.meating <= 0)
            finish_meating(mtmp);
        return MMOVE_DONE; /* still eating */
    }
    if (hides_under(ptr) && OBJ_AT(mtmp.mx, mtmp.my)
        && can_hide_under_obj(vobj_at(mtmp.mx, mtmp.my)) /* level.objects[x][y] */
        && rn2(10))
        return MMOVE_NOTHING; /* do not leave hiding place */

    /* set up pre-move visibility flags */
    const seenflgs = (canseemon(mtmp) ? 1 : 0) | (canspotmon(mtmp) ? 2 : 0);

    /* Where does 'mtmp' think you are?  Not necessary if m_move() called
       from this file, but needed for other calls of m_move(). */
    set_apparxy(mtmp); /* set mtmp->mux, mtmp->muy */

    if (!Is_rogue_level(game.u.uz))
        can_tunnel = tunnels(ptr);
    can_open = !(nohands(ptr) || verysmall(ptr));
    can_unlock = ((can_open && monhaskey(mtmp, true))
                  || mtmp.iswiz || is_rider(ptr));
    if (!mtmp.wormno) { /* if (mtmp->wormno) goto not_special; */
    /* my dog gets special treatment */
    if (mtmp.mtame) {
        return await postmov(mtmp, ptr, omx, omy, await dog_move(mtmp, after),
                       seenflgs, can_tunnel, can_unlock, can_open);
    }

    /* and the acquisitive monsters get special treatment */
    if (is_covetous(ptr)) { /* [should this include
                             *  '&& mtmp->mstrategy != STRAT_NONE'?] */
        let covetousattack;
        const tx = mtmp.mgoal ? mtmp.mgoal.x : 0,
              ty = mtmp.mgoal ? mtmp.mgoal.y : 0;
        const intruder = isok(tx, ty) ? m_at(tx, ty) : null;
        /*
         * if there's a monster on the object or in possession of it,
         * attack it.
         */
        if (intruder && intruder !== mtmp
            /* 5.0: this used to use 'dist2() < 2' which meant that intended
               attack was disallowed if they were adjacent diagonally */
            && dist2(mtmp.mx, mtmp.my, tx, ty) <= 2) {
            game.bhitpos = { x: tx, y: ty };
            game.notonhead = (intruder.mx !== tx || intruder.my !== ty);
            covetousattack = await mattackm(mtmp, intruder);
            /* 5.0: this used to erroneously use '== 2' (M_ATTK_DEF_DIED) */
            if (covetousattack & M_ATTK_AGR_DIED)
                return MMOVE_DIED;
            mmoved = MMOVE_MOVED;
            return await postmov(mtmp, ptr, omx, omy, mmoved,
                                 seenflgs, can_tunnel, can_unlock, can_open);
        }
        /* otherwise continue with normal AI routine */
    }

    /* likewise for shopkeeper, guard, or priest */
    if (mtmp.isshk || mtmp.isgd || mtmp.ispriest) {
        const xm = mtmp.isshk ? await shk_move(mtmp)
                   : mtmp.isgd ? await gd_move(mtmp)
                     : await pri_move(mtmp);

        switch (xm) {
        case -2:
            return MMOVE_DIED;
        case -1:
            mmoved = MMOVE_NOTHING; /* shk follow hero outside shop */
            break;
        default:
            /* impossible("unknown shk/gd/pri_move return value (%d)", xm) */
            /*FALLTHRU*/
        case 0:
        case 1:
            return await postmov(mtmp, ptr, omx, omy,
                                 (xm !== 1) ? MMOVE_NOTHING : MMOVE_MOVED,
                                 seenflgs, can_tunnel, can_unlock, can_open);
        }
    }

    /* teleport if that lies in our nature */
    if (ptr === mons[M.PM_TENGU] && !rn2(5) && !mtmp.mcan
        && !(await tele_restrict(mtmp))) {
        if (mtmp.mhp < 7 || mtmp.mpeaceful || rn2(2))
            await rloc(mtmp, RLOC_MSG);
        else
            await mnexto(mtmp, RLOC_MSG);
        return await postmov(mtmp, ptr, omx, omy, MMOVE_MOVED,
                             seenflgs, can_tunnel, can_unlock, can_open);
    }
    } /* !mtmp->wormno */

    /* not_special: */
    if (u.uswallow && !mtmp.mflee && u.ustuck !== mtmp)
        return MMOVE_MOVED;
    omx = mtmp.mx;
    omy = mtmp.my;
    ggx = mtmp.mux;
    ggy = mtmp.muy;
    appr = mtmp.mflee ? -1 : 1;
    if (mtmp.mconf || (u.uswallow && mtmp === u.ustuck) /* engulfing_u */) {
        appr = 0;
    } else {
        const lev = game.level;
        const should_see = (couldsee(omx, omy)
                            && (lev.at(ggx, ggy).lit || !lev.at(omx, omy).lit)
                            && (dist2(omx, omy, ggx, ggy) <= 36));

        if (!mtmp.mcansee
            || (should_see && Invis() && !perceives(ptr) && rn2(11))
            || (game.youmonst.m_ap_type === M_AP_OBJECT
                && game.youmonst.mappearance === STRANGE_OBJECT)
            || u.uundetected
            || (game.youmonst.m_ap_type === M_AP_OBJECT
                && game.youmonst.mappearance === GOLD_PIECE && !likes_gold(ptr))
            || (mtmp.mpeaceful && !mtmp.isshk) /* allow shks to follow */
            || ((monsndx(ptr) === M.PM_STALKER || ptr.mlet === M.S_BAT
                 || ptr.mlet === M.S_LIGHT) && !rn2(3)))
            appr = 0;

        if (appr === 1 && leppie_avoidance(mtmp))
            appr = -1;

        /* hostiles with ranged weapon or attack try to stay away */
        appr = m_balks_at_approaching(appr, mtmp, pr);

        if (!should_see && can_track(ptr)) {
            const cp = gettrack(omx, omy);
            if (cp) {
                ggx = cp.x;
                ggy = cp.y;
            }
        }
    }

    if ((!mtmp.mpeaceful || !rn2(10)) && (!Is_rogue_level(game.u.uz))) {
        const in_line = (lined_up(mtmp)
             && (distmin(mtmp.mx, mtmp.my, mtmp.mux, mtmp.muy)
                 <= (throws_rocks(game.youmonst.data) ? 20
                                                      : (Math.trunc(acurrstr() / 2) + 1))));

        if (appr !== 1 || !in_line) {
            /* Monsters in combat won't pick stuff up, avoiding the
             * situation where you toss arrows at it and it has nothing
             * better to do than pick the arrows up.
             */
            getitems = true;
        }
    }

    if (getitems) {
        const st = { ggx, ggy, mmoved, appr };
        const found = m_search_items(mtmp, st);
        ggx = st.ggx; ggy = st.ggy; mmoved = st.mmoved; appr = st.appr;
        if (found)
            return await postmov(mtmp, ptr, omx, omy, mmoved,
                           seenflgs, can_tunnel, can_unlock, can_open);
    }

    /* don't tunnel if hostile and close enough to prefer a weapon */
    if (can_tunnel && needspick(ptr)
        && ((!mtmp.mpeaceful || Conflict())
            && dist2(mtmp.mx, mtmp.my, mtmp.mux, mtmp.muy) <= 8))
        can_tunnel = false;

    nix = omx;
    niy = omy;
    flag = mon_allowflags(mtmp);
    const mfp = { cnt: 0, poss: [], info: [] };
    {
        let nearer;
        let ndist, nidist;

        const cnt = mfndpos(mtmp, mfp, flag);
        if (cnt === 0 && !is_unicorn(mtmp.data)) {
            if (await find_defensive(mtmp, true) && await use_defensive(mtmp))
                return MMOVE_DONE;
            return MMOVE_NOMOVES;
        }
        chcnt = 0;
        const jcnt = Math.min(MTSZ, cnt - 1);
        chi = -1;
        nidist = dist2(nix, niy, ggx, ggy);
        /* allow monsters be shortsighted on some levels for balance */
        if (!mtmp.mpeaceful && game.level.flags?.shortsighted
            && nidist > (couldsee(nix, niy) ? 144 : 36) && appr === 1)
            appr = 0;
        if (is_unicorn(ptr) && noteleport_level(mtmp)) {
            /* on noteleport levels, perhaps we cannot avoid hero */
            for (let i = 0; i < cnt; i++)
                if (!(mfp.info[i] & NOTONL))
                    avoid = true;
        }
        better_with_displacing = should_displace(mtmp, mfp, ggx, ggy);
        for (let i = 0; i < cnt; i++) {
            if (avoid && (mfp.info[i] & NOTONL))
                continue;
            const nx = mfp.poss[i].x;
            const ny = mfp.poss[i].y;

            if (m_avoid_kicked_loc(mtmp, nx, ny))
                continue;

            if (MON_AT(nx, ny) && (mfp.info[i] & ALLOW_MDISP)
                && !(mfp.info[i] & ALLOW_M) && !better_with_displacing)
                continue;
            let skip = false;
            if (appr !== 0) {
                for (let j = 0; j < jcnt; j++) {
                    const mtrk = mtmp.mtrack[j];
                    if (nx === mtrk.x && ny === mtrk.y)
                        if (rn2(4 * (cnt - j))) {
                            skip = true; /* goto nxti */
                            break;
                        }
                }
            }
            if (skip) continue;

            nearer = ((ndist = dist2(nx, ny, ggx, ggy)) < nidist);

            if ((appr === 1 && nearer) || (appr === -1 && !nearer)
                || (!appr && !rn2(++chcnt))
                || (appr === -2
                    && ((ndist <= pr.min && !nearer)
                        || (ndist >= pr.max && nearer)))
                || (mmoved === MMOVE_NOTHING)) {
                nix = nx;
                niy = ny;
                nidist = ndist;
                chi = i;
                mmoved = MMOVE_MOVED;
            }
            /* nxti: */
        }
    }

    if (mmoved !== MMOVE_NOTHING) {
        if (mmoved === MMOVE_MOVED && !u_at(nix, niy) && u.ustuck === mtmp)
            throw new Error('m_move(): itsstuck() not ported yet');

        if (mmoved === MMOVE_MOVED && await m_digweapon_check(mtmp, nix, niy))
            return MMOVE_DONE;

        /* If ALLOW_U is set, either it's trying to attack you, or it
         * thinks it is.  In either case, attack this spot in preference to
         * all others.
         */
        if (mfp.info[chi] & ALLOW_U) {
            nix = mtmp.mux;
            niy = mtmp.muy;
        }
        if (u_at(nix, niy)) {
            mtmp.mux = u.ux;
            mtmp.muy = u.uy;
            return MMOVE_NOTHING;
        }
        /* The monster may attack another based on 1 of 2 conditions:
         * 1 - It may be confused.
         * 2 - It may mistake the monster for your (displaced) image.
         */
        if ((mfp.info[chi] & ALLOW_M) !== 0
            || (nix === mtmp.mux && niy === mtmp.muy))
            return await m_move_aggress(mtmp, nix, niy);

        if ((mfp.info[chi] & ALLOW_MDISP) !== 0) {
            const mtmp2 = m_at(nix, niy); /* ALLOW_MDISP implies m_at() is !Null */
            const mstatus = await mdisplacem_mm(mtmp, mtmp2, false);
            /*[if either dies, this reports mtmp has died; is that correct?]*/
            if (mstatus & (M_ATTK_AGR_DIED_MM | M_ATTK_DEF_DIED_MM))
                return MMOVE_DIED;
            if (mstatus & M_ATTK_HIT_MM)
                return MMOVE_MOVED;
            return MMOVE_DONE;
        }

        if (!(await m_in_out_region(mtmp, nix, niy)))
            return MMOVE_DONE;

        if ((mfp.info[chi] & ALLOW_ROCK) && m_can_break_boulder(mtmp))
            await m_break_boulder(mtmp, nix, niy);

        await m_postmove_effect(mtmp);

        /* move a normal monster; for a long worm, remove_monster() and
           place_monster() only manipulate the head; they leave tail as-is */
        /* remove_monster(omx, omy): game.level.monsters is a list keyed
           by mx/my, so place_monster() moving it is enough */
        place_monster(mtmp, nix, niy);
        /* msg_mon_movement(): a11y.mon_movement is off by default */
        /* for a long worm, insert a new segment to reconnect the head
           with the tail; worm_move() keeps the end of the tail if worm
           is scheduled to grow, removes that for move-without-growing */
        if (mtmp.wormno)
            worm_move(mtmp);

        maybe_unhide_at(mtmp.mx, mtmp.my);

        mon_track_add(mtmp, omx, omy);
    } else {
        if (is_unicorn(ptr) && rn2(2) && !(await tele_restrict(mtmp))) {
            await rloc(mtmp, RLOC_MSG);
            return MMOVE_MOVED;
        }
        /* for a long worm, shrink it (by discarding end of tail) when
           it has failed to move */
        if (mtmp.wormno)
            worm_nomove(mtmp);
    }
    return await postmov(mtmp, ptr, omx, omy, mmoved,
                   seenflgs, can_tunnel, can_unlock, can_open);
}

// C ref: monmove.c m_break_boulder()
/* monster mtmp breaks boulder at x,y */
async function m_break_boulder(mtmp, x, y) {
    let otmp;

    if (m_can_break_boulder(mtmp) && ((otmp = sobj_at(BOULDER, x, y)) !== null)) {
        if (!is_rider(mtmp.data)) {
            if (!Deaf() && (mdistu(mtmp) < 4 * 4)) {
                /* if (canspotmon(mtmp)) set_msg_xy(mtmp->mx, mtmp->my):
                   accessibility only */
                await pline(`${Monnam(mtmp)} mutters ${
                    mtmp.ispriest ? "a prayer" : "an incantation"}.`);
            }
            mtmp.mspec_used = (mtmp.mspec_used || 0) + rn1(20, 10);
        }
        if (cansee(x, y)) {
            /* set_msg_xy(x, y): accessibility only */
            await pline_The("boulder falls apart.");
        }

        /* boulders pushed onto shop's boundary or free spot are cases where
           an item not in hero's inventory can have its unpaid flag set;
           if the boulder isn't already on the bill, don't charge for it */
        if (otmp.unpaid) {
            /* remove original from bill + add cloned copy to used-up bill */
            await bill_dummy_object(otmp);
        }
        /* fracturing keeps otmp, changing its otyp from BOULDER to ROCK */
        await fracture_rock(otmp);
    }
}

// C ref: monmove.c m_can_break_boulder()
export function m_can_break_boulder(mtmp) {
    return (is_rider(mtmp.data)
            || (!mtmp.mspec_used
                && (mtmp.isshk || mtmp.ispriest
                    || (mtmp.data.msound === M.MS_LEADER))));
}

// C ref: monmove.c m_postmove_effect()
/* do whatever effects monster has after moving.
   called for both monsters and polyed hero.
   for hero, called after location changes,
   to prevent spam messages for hero getting enveloped in a cloud.
   for monsters, called before location changes,
   because monsters don't have "previous location" field */
export async function m_postmove_effect(mtmp) {
    const is_u = (mtmp === game.youmonst);
    const x = is_u ? game.u.ux0 : mtmp.mx,
          y = is_u ? game.u.uy0 : mtmp.my;

    /* Hezrous create clouds of stench. This does not cost a move. */
    if (mtmp.data === mons[M.PM_HEZROU]) /* stench */
        await create_gas_cloud(x, y, 1, 8);
    else if (mtmp.data === mons[M.PM_STEAM_VORTEX] && !mtmp.mcan)
        await create_gas_cloud(x, y, 1, 0); /* harmless vapor */
}
// C ref: monmove.c m_everyturn_effect()
export async function m_everyturn_effect(mtmp) {
    const is_u = (mtmp === game.youmonst);
    const x = is_u ? game.u.ux : mtmp.mx,
          y = is_u ? game.u.uy : mtmp.my;

    if (mtmp.data === mons[M.PM_FOG_CLOUD]) {
        /* don't leave a vapor cloud if some other gas cloud is already
           present, or when flowing under closed doors so that visibility
           changes aren't mixed with messages about doing such */
        if (!closed_door(x, y) && !visible_region_at(x, y))
            await create_gas_cloud(x, y, 1, 0); /* harmless vapor */
    }
}

// ── C ref: monmove.c postmov() ──
async function postmov(mtmp, ptr, omx, omy, mmoved, seenflgs,
                       can_tunnel, can_unlock, can_open) {
    let trapret;
    let canseeit = cansee(mtmp.mx, mtmp.my);
    const didseeit = canseeit;

    /* notice_mon(mtmp): a11y.mon_notices is off by default */

    if (mmoved === MMOVE_MOVED) {
        const nix = mtmp.mx, niy = mtmp.my;
        const lev = game.level;
        if (is_vampshifter(mtmp) && !amorphous(mtmp.data)
            && IS_DOOR(lev.at(nix, niy).typ)
            && ((lev.at(nix, niy).doormask & (D_LOCKED | D_CLOSED)) !== 0)
            && can_fog(mtmp)) {
            /* note: remove_monster()+place_monster is not right for
               long worms but they won't reach here */
            if (seenflgs) {
                place_monster(mtmp, omx, omy); /* remove_monster(nix, niy) */
                newsym(nix, niy), newsym(omx, omy);
            }
            if (await vamp_shift(mtmp, mons[M.PM_FOG_CLOUD],
                                 ((seenflgs & 1) !== 0) ? true : false)) {
                ptr = mtmp.data; /* update cached value */
            }
            if (seenflgs) {
                place_monster(mtmp, nix, niy); /* remove_monster(omx, omy) */
                newsym(omx, omy), newsym(nix, niy);
            }
        }

        newsym(omx, omy); /* update the old position */
        trapret = await mintrap(mtmp, NO_TRAP_FLAGS);
        if (trapret === Trap_Killed_Mon || trapret === Trap_Moved_Mon) {
            if (mtmp.mx)
                newsym(mtmp.mx, mtmp.my);
            return MMOVE_DIED; /* it died */
        } else if (mon_offmap(mtmp)) {
            return MMOVE_DONE;
        }
        ptr = mtmp.data; /* in case mintrap() caused polymorph */

        /* open a door, or crash through it, if 'mtmp' can */
        if (IS_DOOR(lev.at(mtmp.mx, mtmp.my).typ)
            && !passes_walls(ptr) /* doesn't need to open doors */
            && !can_tunnel) {     /* taken care of below */
            const here = lev.at(mtmp.mx, mtmp.my);
            let btrapped = (here.doormask & D_TRAPPED) !== 0;

            /* used after monster 'who' has been moved to closed door spot
               'where' which will now be changed to door state 'what' with
               map update */
            const UnblockDoor = (where, who, what) => {
                where.doormask = what;
                newsym(who.mx, who.my);
                recalc_block_point(who.mx, who.my);
                vision_recalc(0);
                /* update cached value since it might change */
                canseeit = didseeit || cansee(who.mx, who.my);
            };

            /* if mon has MKoT, disarm door trap; no message given */
            if (btrapped && has_magic_key(mtmp)) {
                /* BUG: this lets a vampire or blob or a doorbuster
                   holding the Key disarm the trap even though it isn't
                   using that Key when squeezing under or smashing the
                   door.  Not significant enough to worry about; perhaps
                   the Key's magic is more powerful for monsters? */
                here.doormask &= ~D_TRAPPED;
                btrapped = false;
            }
            if ((here.doormask & (D_LOCKED | D_CLOSED)) !== 0
                && amorphous(ptr)) {
                if (game.flags.verbose && canseemon(mtmp))
                    throw new Error('postmov(): oozing under a door message not ported yet');
            } else if ((here.doormask & D_LOCKED) !== 0 && can_unlock) {
                /* like the vampshift hack, there are sequencing
                   issues when the monster is moved to the door's spot
                   first then door handling plus feedback comes after */

                UnblockDoor(here, mtmp, !btrapped ? D_ISOPEN : D_NODOOR);
                if (btrapped) {
                    if (await mb_trapped(mtmp, canseeit))
                        return MMOVE_DIED;
                } else {
                    /* Soundeffect(se_door_unlock_and_open, 50) */
                    if (game.flags.verbose) {
                        if (canseeit && canspotmon(mtmp)) {
                            await pline(`${Monnam(mtmp)} unlocks and opens a door.`);
                        } else if (canseeit) {
                            await You_see("a door unlock and open.");
                        } else if (!Deaf()) {
                            await You_hear("a door unlock and open.");
                        }
                    }
                }
            } else if (here.doormask === D_CLOSED && can_open) {
                UnblockDoor(here, mtmp, !btrapped ? D_ISOPEN : D_NODOOR);
                if (btrapped) {
                    if (await mb_trapped(mtmp, canseeit))
                        return MMOVE_DIED;
                } else {
                    /* Soundeffect(se_door_open, 100) */
                    if (game.flags.verbose) {
                        if (canseeit && canspotmon(mtmp)) {
                            await pline(`${Monnam(mtmp)} opens a door.`);
                        } else if (canseeit) {
                            await You_see("a door open.");
                        } else if (!Deaf()) {
                            await You_hear("a door open.");
                        }
                    }
                }
            } else if ((here.doormask & (D_LOCKED | D_CLOSED)) !== 0) {
                /* mfndpos guarantees this must be a doorbuster */
                const mask = ((btrapped
                               || ((here.doormask & D_LOCKED) !== 0 && !rn2(2)))
                              ? D_NODOOR
                              : D_BROKEN);
                UnblockDoor(here, mtmp, mask);
                if (btrapped) {
                    if (await mb_trapped(mtmp, canseeit))
                        return MMOVE_DIED;
                } else {
                    /* Soundeffect(se_door_crash_open, 50) */
                    if (game.flags.verbose) {
                        if (canseeit && canspotmon(mtmp)) {
                            await pline(`${Monnam(mtmp)} smashes down a door.`);
                        } else if (canseeit) {
                            await You_see("a door crash open.");
                        } else if (!Deaf()) {
                            await You_hear("a door crash open.");
                        }
                    }
                }
                /* if it's a shop door, schedule repair */
                if (in_shop(mtmp.mx, mtmp.my)) /* *in_rooms(mx, my, SHOPBASE) */
                    add_damage(mtmp.mx, mtmp.my, 0);
            }
        } else if (lev.at(mtmp.mx, mtmp.my).typ === IRONBARS) {
            /* 3.6.2: was using may_dig() but that doesn't handle bars;
               AD_RUST catches rust monsters but metallivorous() is
                   needed for xorns and rock moles */
            if (!((lev.at(mtmp.mx, mtmp.my).wall_info || 0) & W_NONDIGGABLE_MM)
                && (dmgtype_mm(ptr, M.AD_RUST) || dmgtype_mm(ptr, M.AD_CORR)
                    || metallivorous(ptr))) {
                if (canseemon(mtmp)) /* pline_mon() */
                    await pline(`${Monnam(mtmp)} eats through the iron bars.`);
                await dissolve_bars(mtmp.mx, mtmp.my);
                return MMOVE_DONE;
            } else if (game.flags.verbose && canseemon(mtmp))
                await Norep_mm(`${Monnam(mtmp)} ${
                    /* pluralization fakes verb conjugation */
                    makeplural_mm(locomotion_mm(ptr, "pass"))} ${
                    passes_walls(ptr) ? "through" : "between"} the iron bars.`);
        } /* doors and bars */

        /* possibly dig */
        if (can_tunnel && may_dig(mtmp.mx, mtmp.my)
            && await mdig_tunnel(mtmp))
            return MMOVE_DIED; /* mon died (position already updated) */

        /* set also in domove(), hack.c */
        if (game.u.uswallow && mtmp === game.u.ustuck) {
            throw new Error('postmov(): engulfer movement not ported yet');
        } else {
            newsym(mtmp.mx, mtmp.my);
        }
    } /* mmoved==MMOVE_MOVED */

    if (mmoved === MMOVE_MOVED || mmoved === MMOVE_DONE) {
        if (OBJ_AT(mtmp.mx, mtmp.my) && mtmp.mcanmove) {
            /* Maybe a rock mole just ate some metal object */
            if (metallivorous(ptr)) {
                if (await meatmetal(mtmp) === 2)
                    return MMOVE_DIED; /* it died */
            }
            /* Maybe a cube ate just about anything */
            if (ptr === mons[M.PM_GELATINOUS_CUBE]) {
                let etmp;
                if ((etmp = await meatobj(mtmp)) >= 2)
                    return etmp; /* it died or got forced off the level */
            }
            /* Maybe a purple worm ate a corpse */
            if (corpse_eater(ptr)) {
                let etmp;
                if ((etmp = await meatcorpse(mtmp)) >= 2)
                    return etmp; /* it died or got forced off the level */
            }

            if (await mpickstuff(mtmp))
                mmoved = MMOVE_DONE;

            if (mtmp.minvis) {
                newsym(mtmp.mx, mtmp.my);
                if (mtmp.wormno)
                    see_wsegs(mtmp);
            }
        }

        await maybe_spin_web(mtmp);

        if (hides_under(ptr) || ptr.mlet === M.S_EEL) {
            /* Always set--or reset--mundetected if it's already hidden
               (just in case the object it was hiding under went away);
               usually set mundetected unless monster can't move. */
            if (mtmp.mundetected || (!helpless(mtmp) && rn2(5)))
                await hideunder_async(mtmp);
            newsym(mtmp.mx, mtmp.my);
        }
        if (mtmp.isshk) {
            await after_shk_move(mtmp);
        }
    }
    return mmoved;
}
// ── C ref: mon.c mpickstuff() ──
async function mpickstuff(mtmp) {
    /* prevent shopkeepers from leaving the door of their shop */
    if (mtmp.isshk && inhishop(mtmp))
        return false;

    /* non-tame monsters normally don't go shopping */
    if (!mtmp.mtame && in_shop(mtmp.mx, mtmp.my) && rn2(25))
        return false;

    /* item in a pool, but monster can't swim */
    if (!could_reach_item(mtmp, mtmp.mx, mtmp.my))
        return false;

    for (const otmp of objects_at(mtmp.mx, mtmp.my)) {
        /* avoid special items; once hero picks them up, they'll cease
           being special, becoming eligible for normal pickup */
        if (is_mines_prize(otmp) || is_soko_prize(otmp))
            continue;

        /* Nymphs take everything.  Most monsters don't pick up corpses. */
        if (mon_would_take_item(mtmp, otmp)) {
            if (otmp.otyp === CORPSE && mtmp.data.mlet !== M.S_NYMPH
                /* let a handful of corpse types thru to can_carry() */
                && !(otmp.corpsenm === M.PM_COCKATRICE
                     || otmp.corpsenm === M.PM_CHICKATRICE)
                && otmp.corpsenm !== M.PM_LIZARD
                && !(mons[otmp.corpsenm].mflags1 & M.M1_ACID))
                continue;
            if (!can_touch_safely(mtmp, otmp))
                continue;
            const carryamt = can_carry(mtmp, otmp);
            if (carryamt === 0)
                continue;
            /* handle cases where the critter can only get some */
            let otmp3 = otmp;
            if (carryamt !== otmp.quan) {
                otmp3 = splitobj(otmp, carryamt);
            }
            if (cansee(mtmp.mx, mtmp.my)) {
                /* call distant_name() for its possible side-effects even
                   if the result won't be printed; do it before the extract
                   from floor and subsequent pickup by mtmp */
                const otmpname = distant_name(otmp, doname);

                if (game.flags?.verbose)
                    await pline(`${Monnam(mtmp)} picks up ${otmpname}.`); /* pline_mon() */
            }
            obj_extract_self(otmp3); /* remove from floor */
            mpickobj(mtmp, otmp3); /* may merge and free otmp3 */
            /* let them try to equip it on the next turn */
            check_gear_next_turn(mtmp);
            newsym(mtmp.mx, mtmp.my);
            return true; /* pick only one object */
        }
    }
    return false;
}


// C ref: monmove.c dissolve_bars()
export async function dissolve_bars(x, y) {
    const lev = game.level.at(x, y);
    lev.typ = lev.edge /* edge == 1 */ ? DOOR_MM
        : (Is_special_mm(game.u.uz) || in_rooms(x, y, 0).length) ? ROOM_MM
          : CORR_MM;
    lev.flags = 0; /* doormask = D_NODOOR */
    newsym(x, y);
    if (u_at(x, y))
        await switch_terrain_mm();
}

// C ref: monmove.c leppie_avoidance()
/* does leprechaun want to avoid the hero? */
function leppie_avoidance(mtmp) {
    let lepgold, ygold;

    if (mtmp.data === mons_mm[PM_LEPRECHAUN_MM]
        && ((lepgold = findgold_mm(mtmp.minvent))
            && (lepgold.quan
                > ((ygold = findgold_mm(game.invent)) ? ygold.quan : 0))))
        return true;

    return false;
}

// C ref: monmove.c leppie_stash()
/* leprechaun might bury its gold after teleporting away */
async function leppie_stash(mtmp) {
    let gold;

    if (mtmp.data === mons_mm[PM_LEPRECHAUN_MM]
        && !(mtmp.mhp < 1) /* !DEADMONSTER(mtmp) */
        && !m_canseeu(mtmp)
        && !in_rooms(mtmp.mx, mtmp.my, SHOPBASE).length
        && game.level.at(mtmp.mx, mtmp.my).typ === ROOM_MM
        && !t_at_mm(mtmp.mx, mtmp.my)
        && rn2(4)
        && (gold = findgold_mm(mtmp.minvent)) != null) {
        await mdrop_obj_mm(mtmp, gold, false);
        /* gold = g_at(mtmp->mx, mtmp->my) */
        gold = (game.level.objects || []).find(o => o.ox === mtmp.mx && o.oy === mtmp.my
                                                && o.where === 'OBJ_FLOOR'
                                                && o.oclass === COIN_CLASS_MM) || null;
        if (gold)
            bury_an_obj_mm(gold, null);
    }
}

/* C ref: monst.h DEADMONSTER() */
function DEADMONSTER_mm(mon) { return mon.mhp < 1; }
