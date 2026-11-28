// muse.js — monsters using items: find_defensive()/use_defensive(),
// find_offensive()/use_offensive(), find_misc()/use_misc().
// C ref: muse.c.  Paths that aren't ported yet throw a 'not ported yet'
// error instead of skipping their rolls.

import { DEADMONSTER, minv } from './mon.js';
import { helpless } from './monmove.js';
import { stairway_at, verbalize, You_hear } from './display.js';
import { game } from './gstate.js';
import { worm_move } from './worm.js';
import { rn2, rnd, rn1, d } from './rng.js';
import { distmin, upstart, sgn, NODIAG, strsubst, mdistu } from './hacklib.js';
import { cansee, couldsee } from './vision.js';
import {
    pline, urgent_pline, pline_The, canseemon, canspotmon, map_invisible
} from './display.js';
import { Monnam } from './do_name.js';
import { an, xname, doname, singular } from './objnam.js';
import { simpleonames } from './iactions.js';
import { observe_object, discover_object, objdescr_is,
         makeknown } from './o_init.js';
import { unknow_object, unbless, level_objects_at } from './mkobj.js';
import { stop_occupation } from './allmain.js';
import { nomul } from './hack.js';
import { seemimic } from './mon.js';
import { monstseesu, monstunseesu } from './uhitm.js';
import { losehp, unconscious as unconscious_mu,
         wearing_iron_shoes } from './trap.js';
import { find_mac, Dragon_mail_to_pm, Dragon_scales_to_pm,
         Is_dragon_mail } from './worn.js';
import { resists_magm, is_animal, mindless, nohands, verysmall, throws_rocks,
         likes_gems, noncorporeal, amorphous, unsolid, is_mercenary, acidic,
         is_unicorn, touch_petrifies, resists_ston, resists_acid, slimeproof,
         attacktype, can_blow } from './mondata.js';
import { hit, miss, exclam, buzz, dobuzz, bhito,
         find_drawbridge, resist_async } from './zap.js';
import { TELL } from './const.js';
import { attacktype_fordmg } from './mondata.js';
import { AT_BREA as AT_BREA_US, AD_FIRE as AD_FIRE_US } from './monsters.js';
import { FIRE_TRAP as FIRE_TRAP_US } from './const.js';
import { SCR_FIRE as SCR_FIRE_US, POT_OIL as POT_OIL_US, WAN_FIRE as WAN_FIRE_US,
         FIRE_HORN as FIRE_HORN_US } from './objects.js';
import { m_throw, m_carrying } from './mthrowu.js';
import { POTION_CLASS, WAND_CLASS, WAN_OPENING, WAN_LOCKING, WAN_CANCELLATION,
         SPE_CANCELLATION, Is_mbag, SchroedingersBox, Is_dragon_scales,
         Is_container, bimanual } from './objects.js';
import { BOLT_LIM, G_GONE, ANTIMAGIC, HALF_SPDAM, KILLED_BY_AN,
         DRAWBRIDGE_UP, SDOOR, D_LOCKED, D_CLOSED, IS_DOOR,
         ZAP_POS } from './const.js';

import {
    newsym, sensemon, Norep, cls, show_glyph, docrt, You_feel
} from './display.js';
import { mon_nam, x_monnam, Some_Monnam, noit_mon_nam, mon_nam_too,
         pronoun_gender, a_monnam } from './do_name.js';
import { genders } from './role.js';
import { vtense, makeplural, distant_name } from './objnam.js';
import { ansimpleoname, surface, the } from './iactions.js';
import { s_suffix, highc } from './hacklib.js';
import { splitobj, bcsign, obj_extract_self, add_to_container, weight,
         place_object } from './mkobj.js';
import { extract_from_minvent, mpickobj, remove_worn_item } from './steal.js';
import { obfree, freeinv, carrying } from './invent.js';
import { trycall } from './potion.js';
import { m_useup } from './mthrowu.js';
import { healmon, mongone, monkilled, mondead, xkilled, maybe_unhide_at,
         newcham } from './mon.js';
import { monflee } from './monmove.js';
import { enexto, rloc, tele_restrict, noteleport_level,
         random_teleport_level } from './teleport.js';
import { mintrap, maketrap, seetrap, locomotion, trapname,
         Trap_Killed_Mon } from './trap.js';
import { makemon, place_monster, rndmonst, is_pool, is_lava,
         grow_up, nonliving, makemon_flush_msg } from './makemon.js';
import { mon_set_minvis, mon_adjust_speed, which_armor } from './worn.js';
import { mon_learns_traps, poly_when_stoned, Resists_Elem, is_bat,
         mon_hates_silver, is_flyer, is_human, is_elf, is_dwarf, is_gnome,
         is_orc, is_vampshifter } from './mondata.js';
import { On_W_tower_level, get_level, depth, ledger_no, on_level,
         dunlev, dunlevs_in_dungeon, In_hell } from './dungeon.js';
import { Can_fall_thru, Can_dig_down } from './mklev.js';
import { In_endgame, Is_botlevel, In_V_tower, In_sokoban, Is_knox_level,
         IS_FURNITURE, IS_DRAWBRIDGE, SCORR, CORR, W_NONDIGGABLE,
         NO_MM_FLAGS, MM_NOMSG, RLOC_MSG, NC_SHOW_MSG, NC_VIA_WAND_OR_SPELL,
         MIGR_RANDOM, MIGR_STAIRS_UP, MIGR_STAIRS_DOWN, MIGR_LADDER_UP,
         MIGR_LADDER_DOWN, MIGR_SSTAIRS, FORCETRAP, FORCEBUNGLE, PIT, HOLE,
         DEAF, STONE_RES, ACID_RES, NORMAL_SPEED, W_ARM, W_ARMS, W_AMUL,
         W_WEP, REFLECTING } from './const.js';
import { inhishop, add_damage } from './shk.js';
import { is_ice } from './dig.js';
import { unblock_point, recalc_block_point } from './vision.js';
import { dog_nutrition, can_carry } from './dogmove.js';
import { canletgo, dropy } from './do.js';
import { welded } from './wield.js';
import { body_part } from './insight.js';
import { learnwand } from './zap.js';
import { migrate_to_level, mon_has_amulet } from './dog.js';
import { paralyze_monst } from './mhitm.js';
import { rndmonnam } from './do_name.js';
import { HEAVY_IRON_BALL, SILVER, ICE_BOX, BAG_OF_HOLDING,
         SHIELD_OF_REFLECTION, AMULET_OF_REFLECTION, SILVER_DRAGON_SCALES,
         SILVER_DRAGON_SCALE_MAIL, AMULET_OF_LIFE_SAVING, ARMOR_CLASS,
         YELLOW_DRAGON_SCALES } from './objects.js';

import { monverbself, PRONOUN_HALLU } from './do_name.js';
import { same_race } from './mondata.js';
import { ARTICLE_A, SUPPRESS_INVISIBLE, SUPPRESS_SADDLE, SUPPRESS_IT,
         AUGMENT_IT, TELEPORT_CONTROL, STRAT_WAITFORU, XKILL_NOMSG,
         XKILL_NOCONDUCT, HAND, DOOR, DBWALL } from './const.js';
import { AMULET_OF_YENDOR, BELL_OF_OPENING, CANDELABRUM_OF_INVOCATION,
         SPE_BOOK_OF_THE_DEAD} from './objects.js';
import { ART_ORB_OF_DETECTION } from './artilist.js';
import { arti_reflects } from './artifact.js';
import { Can_rise_up, ceiling } from './dungeon.js';
import { is_drawbridge_wall, destroy_drawbridge } from './dbridge.js';
import { flooreffects } from './do.js';
import { set_malign } from './makemon.js';
import { G_UNIQ } from './monsters.js';
import { linedup_callback, mon_would_take_item } from './monmove.js';
import { xytodir } from './hack.js';
import { accessible } from './makemon.js';
import { resists_blnd } from './mondata.js';
import { xdir, ydir, N_DIRS, OBJ_AT, W_ARMH, Is_rogue_level,
         Is_earthlevel } from './const.js';
import { MITHRIL, GLASS, ARM_HELM } from './objects.js';
import { doorlock } from './lock.js';
import { in_rooms } from './hack.js';
import { D_BROKEN, SHOPBASE, TEMPLE } from './const.js';
import { tele } from './teleport.js';
import {
    Antimagic, Blind, Hallucination, Deaf, See_invisible, Teleport_control, Half_spell_damage
} from './youprop.js';
import { m_next2u, u_at } from './const.js';
import { mhe, mhim } from './mhitu.js';
import { dist2, isok } from './hacklib.js';
import { m_at, sobj_at } from './makemon.js';
import { t_at } from './trap.js';
import { monsndx, is_floater, passes_walls, dmgtype, haseyes,
         mon_knows_traps } from './mondata.js';
import { monnear } from './mon.js';
import { onscary, lined_up } from './monmove.js';
import * as M from './monsters.js';
import { mons } from './monsters.js';
import { BOULDER, BUGLE, UNICORN_HORN, CORPSE, TIN, POT_FULL_HEALING,
         POT_EXTRA_HEALING, POT_HEALING, POT_SICKNESS, WAN_DIGGING,
         WAN_TELEPORTATION, SCR_TELEPORTATION, WAN_CREATE_MONSTER,
         SCR_CREATE_MONSTER, WAN_UNDEAD_TURNING, WAN_DEATH, WAN_SLEEP,
         WAN_FIRE, FIRE_HORN, WAN_COLD, FROST_HORN, WAN_LIGHTNING,
         WAN_MAGIC_MISSILE, WAN_STRIKING, POT_PARALYSIS, POT_BLINDNESS,
         POT_CONFUSION, POT_SLEEPING, POT_ACID, SCR_EARTH,
         EXPENSIVE_CAMERA, POT_GAIN_LEVEL, BULLWHIP, WAN_MAKE_INVISIBLE,
         POT_INVISIBILITY, WAN_SPEED_MONSTER, POT_SPEED, WAN_POLYMORPH,
         POT_POLYMORPH, BAG_OF_TRICKS, LARGE_BOX,
         GLOB_OF_GREEN_SLIME } from './objects.js';
import { TIN_OPENER, WEAPON_CLASS, objects } from './objects.js';
import { P_DAGGER, P_KNIFE } from './const.js';
import { mwelded } from './weapon.js';
import { STAIRS, LADDER, TELEP_TRAP, WEB, BEAR_TRAP, is_hole, is_pit,
         M_SEEN_REFL, M_SEEN_MAGR, M_SEEN_SLEEP, M_SEEN_FIRE, M_SEEN_COLD,
         M_SEEN_ELEC, M_SEEN_ACID, POLY_TRAP, MFAST, NON_PM,
         SEE_INVIS } from './const.js';
import { cls as cls_mu, show_glyph as show_glyph_mu, mon_to_glyph as mon_to_glyph_mu,
         display_self as display_self_mu, docrt as docrt_mu, newsym as newsym_mu,
         canspotmon as canspotmon_mu, map_invisible as map_invisible_mu,
         You_feel as You_feel_mu } from './display.js';
import { rn2_on_display_rng as rn2_on_display_rng_mu } from './rng.js';
import { tty_display_map_nhwindow as tty_display_map_nhwindow_mu } from './wintty.js';
import { removed_from_icebox } from './pickup.js';
import { cancel_monst } from './zap.js';
import { hard_helmet } from './do_wear.js';
import { pline_mon } from './display.js';
import { in_your_sanctuary } from './priest.js';
import { shieldeff } from './display.js';

const WAND_BACKFIRE_CHANCE = 100; /* hack.h */
const QBUFSZ = 128; /* global.h */

/* C ref: muse.c MUSE_* (defensive) */
const MUSE_SCR_TELEPORTATION = 1;
const MUSE_WAN_TELEPORTATION_SELF = 2;
const MUSE_POT_HEALING = 3;
const MUSE_POT_EXTRA_HEALING = 4;
const MUSE_WAN_DIGGING = 5;
const MUSE_TRAPDOOR = 6;
const MUSE_TELEPORT_TRAP = 7;
const MUSE_UPSTAIRS = 8;
const MUSE_DOWNSTAIRS = 9;
const MUSE_WAN_CREATE_MONSTER = 10;
const MUSE_SCR_CREATE_MONSTER = 11;
const MUSE_UP_LADDER = 12;
const MUSE_DN_LADDER = 13;
const MUSE_SSTAIRS = 14;
const MUSE_WAN_TELEPORTATION = 15;
const MUSE_BUGLE = 16;
const MUSE_UNICORN_HORN = 17;
const MUSE_POT_FULL_HEALING = 18;
const MUSE_LIZARD_CORPSE = 19;
const MUSE_WAN_UNDEAD_TURNING = 20; /* also an offensive item */
/* C ref: muse.c MUSE_* (offensive) */
const MUSE_WAN_DEATH = 21;
const MUSE_WAN_SLEEP = 22;
const MUSE_WAN_FIRE = 23;
const MUSE_WAN_COLD = 24;
const MUSE_WAN_LIGHTNING = 25;
const MUSE_WAN_MAGIC_MISSILE = 26;
const MUSE_WAN_STRIKING = 27;
const MUSE_SCR_FIRE = 28; void MUSE_SCR_FIRE;
const MUSE_POT_PARALYSIS = 29;
const MUSE_POT_BLINDNESS = 30;
const MUSE_POT_CONFUSION = 31;
const MUSE_FROST_HORN = 32;
const MUSE_FIRE_HORN = 33;
const MUSE_POT_ACID = 34;
const MUSE_POT_SLEEPING = 35;
const MUSE_SCR_EARTH = 36;
const MUSE_CAMERA = 37;

/* mondata.h */
/* C ref: monst.h m_seenres() */
export function m_seenres(mon, mask) { return (mon.seen_resistance || 0) & mask; }

/* C ref: obj.h Has_contents() */
function Has_contents(o) { return !!(o.cobj && o.cobj.length); }
/* C ref: wizard.c mon_has_special() */
export function mon_has_special(mtmp) {
    for (const otmp of minv(mtmp))
        if (otmp.otyp === AMULET_OF_YENDOR
            || (otmp.oartifact || 0) >= ART_ORB_OF_DETECTION /* any_quest_artifact() */
            || otmp.otyp === BELL_OF_OPENING
            || otmp.otyp === CANDELABRUM_OF_INVOCATION
            || otmp.otyp === SPE_BOOK_OF_THE_DEAD)
            return true;
    return false;
}

// C ref: muse.c m_use_healing()
function m_use_healing(mtmp) {
    let obj;

    if ((obj = m_carrying(mtmp, POT_FULL_HEALING)) !== null) {
        game.m_defensive = obj;
        game.m_has_defense = MUSE_POT_FULL_HEALING;
        return true;
    }
    if ((obj = m_carrying(mtmp, POT_EXTRA_HEALING)) !== null) {
        game.m_defensive = obj;
        game.m_has_defense = MUSE_POT_EXTRA_HEALING;
        return true;
    }
    if ((obj = m_carrying(mtmp, POT_HEALING)) !== null) {
        game.m_defensive = obj;
        game.m_has_defense = MUSE_POT_HEALING;
        return true;
    }
    return false;
}

// C ref: muse.c m_sees_sleepy_soldier()
/* return TRUE if monster mtmp can see at least one sleeping soldier */
function m_sees_sleepy_soldier(mtmp) {
    const x = mtmp.mx, y = mtmp.my;

    for (let xx = x - 3; xx <= x + 3; xx++)
        for (let yy = y - 3; yy <= y + 3; yy++) {
            if (!isok(xx, yy) || (xx === x && yy === y))
                continue;
            const mon = m_at(xx, yy);
            if (mon && is_mercenary(mon.data)
                && mon.data !== mons[M.PM_GUARD]
                && helpless(mon))
                return true;
        }
    return false;
}

// C ref: muse.c cures_stoning()
export function cures_stoning(mon, obj, tinok) {
    if (obj.otyp === POT_ACID)
        return true;
    if (obj.otyp === GLOB_OF_GREEN_SLIME)
        return slimeproof(mon.data);
    if (obj.otyp !== CORPSE && (obj.otyp !== TIN || !tinok))
        return false;
    /* corpse, or tin that mon can open */
    if (obj.corpsenm === NON_PM) /* empty/special tin */
        return false;
    return (obj.corpsenm === M.PM_LIZARD
            || (mons[obj.corpsenm].mflags1 & M.M1_ACID) !== 0); /* acidic() */
}


// C ref: muse.c mon_reflects()
export async function mon_reflects(mon, str) {
    let orefl = which_armor(mon, W_ARMS);

    if (orefl && orefl.otyp === SHIELD_OF_REFLECTION) {
        if (str) {
            await pline(str.replace("%s", s_suffix(mon_nam(mon)))
                           .replace("%s", "shield"));
            makeknown(SHIELD_OF_REFLECTION);
        }
        return true;
    } else if (arti_reflects(mon.mw)) { /* MON_WEP(mon) */
        /* due to wielded artifact weapon */
        if (str)
            await pline(str.replace("%s", s_suffix(mon_nam(mon)))
                           .replace("%s", "weapon"));
        return true;
    } else if ((orefl = which_armor(mon, W_AMUL))
               && orefl.otyp === AMULET_OF_REFLECTION) {
        if (str) {
            await pline(str.replace("%s", s_suffix(mon_nam(mon)))
                           .replace("%s", "amulet"));
            makeknown(AMULET_OF_REFLECTION);
        }
        return true;
    } else if ((orefl = which_armor(mon, W_ARM))
               && (orefl.otyp === SILVER_DRAGON_SCALES
                   || orefl.otyp === SILVER_DRAGON_SCALE_MAIL)) {
        if (str)
            await pline(str.replace("%s", s_suffix(mon_nam(mon)))
                           .replace("%s", "armor"));
        return true;
    } else if (mon.data === mons[M.PM_SILVER_DRAGON]
               || mon.data === mons[M.PM_CHROMATIC_DRAGON]) {
        /* Silver dragons only reflect when mature; babies do not */
        if (str)
            await pline(str.replace("%s", s_suffix(mon_nam(mon)))
                           .replace("%s", "scales"));
        return true;
    }
    return false;
}

// C ref: muse.c munstone()
/* TRUE if the monster ate something */
export async function munstone(mon, by_you) {
    if (resists_ston(mon))
        return false;
    if (mon.meating || helpless(mon))
        return false;
    mon.mstrategy = (mon.mstrategy || 0) & ~STRAT_WAITFORU;

    const tinok = mcould_eat_tin(mon);
    for (const obj of minv(mon)) {
        if (cures_stoning(mon, obj, tinok)) {
            await mon_consume_unstone(mon, obj, by_you, true);
            return true;
        }
    }
    return false;
}

// C ref: muse.c munslime()
/* monster is in the process of being turned into green slime; if it has
   a means to burn the slime off, use it (muse_unslime() is not ported:
   each place it would be called stops explicitly) */
export async function munslime(mon, by_you) {
    const mptr = mon.data;

    void by_you;
    /*
     * muse_unslime() gives "mon starts turning green", "mon zaps
     * itself with a wand of fire", and "mon's slime burns away"
     * messages.  Monsters who don't get any chance at that just have
     * (via our caller) newcham()'s "mon turns into slime" feedback.
     */

    if (slimeproof(mptr))
        return false;
    if (mon.meating || helpless(mon))
        return false;
    mon.mstrategy &= ~STRAT_WAITFORU;

    /* if monster can breathe fire, do so upon self; a monster who deals
       fire damage by biting, clawing, gazing, and especially exploding
       isn't able to cure itself of green slime with its own attack
       [possible extension: monst capable of casting high level clerical
       spells could toss pillar of fire at self--probably too suicidal] */
    if (!mon.mcan && !mon.mspec_used
        && attacktype_fordmg(mptr, AT_BREA_US, AD_FIRE_US)) {
        /* odummy = cg.zeroobj; otyp == STRANGE_OBJECT */
        throw new Error('munslime(): muse_unslime() (fire breath) not ported yet');
    }

    /* same MUSE criteria as use_defensive() */
    if (!is_animal(mptr) && !mindless(mptr)) {
        let t;

        for (const obj of minv(mon)) /* C: mon->minvent, newest first */
            if (cures_sliming(mon, obj))
                throw new Error('munslime(): muse_unslime() (item) not ported yet');

        if (((t = t_at(mon.mx, mon.my)) == null || t.ttyp !== FIRE_TRAP_US)
            && mptr.mmove && !mon.mtrapped) {
            const xy = [[], []];
            let x, y, ridx, nxy = 0;

            for (x = mon.mx - 1; x <= mon.mx + 1; ++x)
                for (y = mon.my - 1; y <= mon.my + 1; ++y)
                    if (isok(x, y) && accessible(x, y)
                        && !m_at(x, y) && (x !== game.u.ux || y !== game.u.uy)) {
                        xy[0][nxy] = x, xy[1][nxy] = y;
                        ++nxy;
                    }
            for (let idx = 0; idx < nxy; ++idx) {
                ridx = rn1(nxy - idx, idx);
                if (ridx !== idx) {
                    x = xy[0][idx];
                    xy[0][idx] = xy[0][ridx];
                    xy[0][ridx] = x;
                    y = xy[1][idx];
                    xy[1][idx] = xy[1][ridx];
                    xy[1][ridx] = y;
                }
                if ((t = t_at(xy[0][idx], xy[1][idx])) != null
                    && t.ttyp === FIRE_TRAP_US)
                    break;
            }
        }
        if (t && t.ttyp === FIRE_TRAP_US)
            throw new Error('munslime(): muse_unslime() (fire trap) not ported yet');

    } /* MUSE */

    return false;
}

// C ref: muse.c cures_sliming()
/* TRUE if the monster can use 'obj' to burn away incipient slime */
function cures_sliming(mon, obj) {
    /* scroll of fire */
    if (obj.otyp === SCR_FIRE_US)
        return (haseyes(mon.data) && mon.mcansee && !nohands(mon.data));

    /* potion of oil; will be set burning if not already */
    if (obj.otyp === POT_OIL_US)
        return !nohands(mon.data);

    /* non-empty wand or horn of fire;
       hero doesn't need hands or even limbs to zap, so mon doesn't either */
    return ((obj.otyp === WAN_FIRE_US
             || (obj.otyp === FIRE_HORN_US && can_blow(mon)))
            && obj.spe > 0);
}

// C ref: muse.c mon_consume_unstone()
async function mon_consume_unstone(
    mon,
    obj,
    by_you,
    stoning) /* T: stop petrification, F: cure stun && confusion */
{
    const vis = canseemon(mon), tinned = obj.otyp === TIN,
        food = obj.otyp === CORPSE || tinned,
        acid = obj.otyp === POT_ACID
               || (food && acidic(mons[obj.corpsenm])),
        lizard = food && obj.corpsenm === M.PM_LIZARD;
    const nutrit = food ? dog_nutrition(mon, obj) : 0; /* also sets meating */

    /* give a "<mon> is slowing down" message and also remove
       intrinsic speed (comparable to similar effect on the hero) */
    if (stoning)
        await mon_adjust_speed(mon, -3, null);

    if (vis) {
        const save_quan = obj.quan;

        obj.quan = 1;
        await pline_mon(mon, `${Monnam(mon)} ${
            (obj.oclass === POTION_CLASS) ? "quaffs"
            : (obj.otyp === TIN) ? "opens and eats the contents of"
              : "eats"} ${distant_name(obj, doname)}.`);
        obj.quan = save_quan;
    } else if (!Deaf())
        await You_hear(`${(obj.oclass === POTION_CLASS) ? "drinking"
                                                        : "chewing"}.`);

    m_useup(mon, obj);
    /* obj is now gone */

    if (acid && !tinned && !resists_acid(mon)) {
        mon.mhp -= rnd(15);
        if (vis)
            await pline_mon(mon, `${Monnam(mon)} has a very bad case of stomach acid.`);
        if (DEADMONSTER(mon)) {
            await pline_mon(mon, `${Monnam(mon)} dies!`);
            if (by_you)
                /* hero gets credit (experience) and blame (possible loss
                   of alignment and/or luck and/or telepathy depending on
                   mon) for the kill but does not break pacifism conduct */
                await xkilled(mon, XKILL_NOMSG | XKILL_NOCONDUCT);
            else
                await mondead(mon);
            return;
        }
    }
    if (stoning && vis) {
        if (Hallucination())
            await pline(`What a pity - ${mon_nam(mon)} just ruined a future piece of art!`);
        else
            await pline_mon(mon, `${Monnam(mon)} seems limber!`);
    }
    if (lizard && (mon.mconf || mon.mstun)) {
        mon.mconf = 0;
        mon.mstun = 0;
        if (vis && !is_bat(mon.data) && mon.data !== mons[M.PM_STALKER])
            await pline_mon(mon, `${Monnam(mon)} seems steadier now.`);
    }
    if (mon.mtame && !mon.isminion && nutrit > 0) {
        const edog = mon.edog || mon.mextra?.edog; /* EDOG(mon) */

        if (edog.hungrytime < game.moves)
            edog.hungrytime = game.moves;
        edog.hungrytime += nutrit;
        mon.mconf = 0;
    }
    /* use up monster's next move */
    mon.movement -= NORMAL_SPEED;
    mon.mlstmv = game.moves;
}

// C ref: muse.c mcould_eat_tin()
/* can monster open a tin? */
export function mcould_eat_tin(mon) {
    /* monkeys who manage to steal tins can't open and eat them
       even if they happen to also have the appropriate tool */
    if (is_animal(mon.data))
        return false;

    const mwep = mon.mw; /* MON_WEP(mon) */
    const welded_wep = mwep && mwelded(mwep);
    /* this is different from the player; tin opener or dagger doesn't
       have to be wielded, and knife can be used instead of dagger */
    for (const obj of minv(mon)) {
        /* if stuck with a cursed weapon, don't check rest of inventory */
        if (welded_wep && obj !== mwep)
            continue;

        if (obj.otyp === TIN_OPENER
            || (obj.oclass === WEAPON_CLASS
                && (objects[obj.otyp].oc_skill === P_DAGGER
                    || objects[obj.otyp].oc_skill === P_KNIFE)))
            return true;
    }
    return false;
}

// C ref: muse.c find_defensive()
/* Select a defensive item/action for a monster.  Returns TRUE iff one is
   found. */
export function find_defensive(mtmp, tryescape) {
    const u = game.u;
    let obj;
    let t;
    const x = mtmp.mx, y = mtmp.my;
    const stuck = (mtmp === u.ustuck),
          immobile = (mtmp.data.mmove === 0);

    game.m_defensive = null;
    game.m_has_defense = 0;

    if (is_animal(mtmp.data) || mindless(mtmp.data))
        return false;
    if (!tryescape && dist2(x, y, mtmp.mux, mtmp.muy) > 25)
        return false;
    if (tryescape && Is_knox_level(u.uz)
        && !m_next2u(mtmp) && m_next2m(mtmp))
        return false;
    if (u.uswallow && stuck)
        return false;

    if (mtmp.mconf || mtmp.mstun || !mtmp.mcansee) {
        obj = null;
        if (!nohands(mtmp.data)) {
            for (const o of minv(mtmp))
                if (o.otyp === UNICORN_HORN && !o.cursed) {
                    obj = o;
                    break;
                }
        }
        if (obj || is_unicorn(mtmp.data) || mtmp.data === mons[M.PM_KI_RIN]) {
            game.m_defensive = obj;
            game.m_has_defense = MUSE_UNICORN_HORN;
            return true;
        }
    }

    if (mtmp.mconf || mtmp.mstun) {
        let liztin = null;

        for (const o of minv(mtmp)) {
            if (o.otyp === CORPSE && o.corpsenm === M.PM_LIZARD) {
                game.m_defensive = o;
                game.m_has_defense = MUSE_LIZARD_CORPSE;
                return true;
            } else if (o.otyp === TIN && o.corpsenm === M.PM_LIZARD) {
                liztin = o;
            }
        }
        /* confused or stunned monster might not be able to open tin */
        if (liztin && mcould_eat_tin(mtmp) && rn2(3)) {
            game.m_defensive = liztin;
            /* tin and corpse ultimately end up being handled the same */
            game.m_has_defense = MUSE_LIZARD_CORPSE;
            return true;
        }
    }

    /* check specifically for healing alone when blind (healing cures
       blindness); Pestilence won't use healing even when blind */
    if (!mtmp.mcansee && !nohands(mtmp.data)
        && mtmp.data !== mons[M.PM_PESTILENCE]) {
        if (m_use_healing(mtmp))
            return true;
    }

    /* monsters aren't given wands of undead turning but if they
       happen to have picked one up, use it against corpse wielder;
       when applicable, use it now even if 'mtmp' isn't wounded */
    if (!mtmp.mpeaceful && !nohands(mtmp.data)
        && game.uwep && game.uwep.otyp === CORPSE
        && touch_petrifies(mons[game.uwep.corpsenm])
        && !poly_when_stoned(mtmp.data) && !resists_ston(mtmp)
        && lined_up(mtmp)) { /* only lines up if distu range is within 5*5 */
        /* could use m_carrying(), then nxtobj() when matching wand
           is empty, but direct traversal is actually simpler here */
        for (const o of minv(mtmp))
            if (o.otyp === WAN_UNDEAD_TURNING && o.spe > 0) {
                game.m_defensive = o;
                game.m_has_defense = MUSE_WAN_UNDEAD_TURNING;
                return true;
            }
    }

    if (!tryescape) {
        /* do we try to heal? */
        const fraction = u.ulevel < 10 ? 5 : u.ulevel < 14 ? 4 : 3;
        if (mtmp.mhp >= mtmp.mhpmax
            || (mtmp.mhp >= 10 && mtmp.mhp * fraction >= mtmp.mhpmax))
            return false;

        if (mtmp.mpeaceful) {
            if (!nohands(mtmp.data)) {
                if (m_use_healing(mtmp))
                    return true;
            }
            return false;
        }
    }

    const typ = game.level.at(x, y).typ;
    if (stuck || immobile || mtmp.mtrapped) {
        ; /* fleeing by stairs or traps is not possible */
    } else if (typ === STAIRS) {
        const stway = stairway_at(x, y);
        if (stway && !stway.up && stway.tolev.dnum === u.uz.dnum) {
            if (!is_floater(mtmp.data))
                game.m_has_defense = MUSE_DOWNSTAIRS;
        } else if (stway && stway.up && stway.tolev.dnum === u.uz.dnum) {
            game.m_has_defense = MUSE_UPSTAIRS;
        } else if (stway && stway.tolev.dnum !== u.uz.dnum) {
            if (stway.up || !is_floater(mtmp.data))
                game.m_has_defense = MUSE_SSTAIRS;
        }
    } else if (typ === LADDER) {
        const stway = stairway_at(x, y);
        if (stway && stway.up && stway.tolev.dnum === u.uz.dnum) {
            game.m_has_defense = MUSE_UP_LADDER;
        } else if (stway && !stway.up && stway.tolev.dnum === u.uz.dnum) {
            if (!is_floater(mtmp.data))
                game.m_has_defense = MUSE_DN_LADDER;
        } else if (stway && stway.tolev.dnum !== u.uz.dnum) {
            if (stway.up || !is_floater(mtmp.data))
                game.m_has_defense = MUSE_SSTAIRS;
        }
    } else {
        /* Note: trap doors take precedence over teleport traps. */
        const ignore_boulders = (verysmall(mtmp.data)
                                 || throws_rocks(mtmp.data)
                                 || passes_walls(mtmp.data)),
            diag_ok = !NODIAG(monsndx(mtmp.data));
        const locs = [];

        /* collect viable spots; monster's <mx,my> comes first */
        locs.push([x, y]);
        for (let xx = x - 1; xx <= x + 1; xx++)
            for (let yy = y - 1; yy <= y + 1; yy++)
                if (isok(xx, yy) && (xx !== x || yy !== y))
                    locs.push([xx, yy]);
        /* look for a suitable trap among the viable spots */
        for (const [xx, yy] of locs) {
            /* skip if it's hero's location
               or a diagonal spot and monster can't move diagonally
               or some other monster is there */
            if (u_at(xx, yy)
                || (xx !== x && yy !== y && !diag_ok)
                || (m_at(xx, yy) && !(xx === x && yy === y)))
                continue;
            /* skip if there's no trap or can't/won't move onto trap */
            if ((t = t_at(xx, yy)) === null
                || (!ignore_boulders && sobj_at(BOULDER, xx, yy))
                || onscary(xx, yy, mtmp))
                continue;
            /* use trap if it's the correct type */
            if (is_hole(t.ttyp)
                && !is_floater(mtmp.data)
                && !mtmp.isshk && !mtmp.isgd && !mtmp.ispriest
                && Can_fall_thru(u.uz)) {
                game.trapx = xx;
                game.trapy = yy;
                game.m_has_defense = MUSE_TRAPDOOR;
                break; /* no need to look at any other spots */
            } else if (t.ttyp === TELEP_TRAP) {
                game.trapx = xx;
                game.trapy = yy;
                game.m_has_defense = MUSE_TELEPORT_TRAP;
            }
        }
    }

    if (nohands(mtmp.data)) /* can't use objects */
        return !!game.m_has_defense;

    if (is_mercenary(mtmp.data) && (obj = m_carrying(mtmp, BUGLE)) !== null
        && m_sees_sleepy_soldier(mtmp)) {
        game.m_defensive = obj;
        game.m_has_defense = MUSE_BUGLE;
    }

    /* use immediate physical escape prior to attempting magic */
    if (game.m_has_defense) /* stairs, trap door or tele-trap, bugle alert */
        return !!game.m_has_defense;

    /* kludge to cut down on trap destruction (particularly portals) */
    t = t_at(x, y);
    if (t && (is_pit(t.ttyp) || t.ttyp === WEB
              || t.ttyp === BEAR_TRAP))
        t = null; /* ok for monster to dig here */

    /* selection could be improved by collecting all possibilities
       into an array and then picking one at random */
    for (const o of minv(mtmp)) {
        /* don't always use the same selection pattern */
        if (game.m_has_defense && !rn2(3))
            break;

        /* nomore(MUSE_WAN_DIGGING); */
        if (game.m_has_defense === MUSE_WAN_DIGGING)
            break;
        if (o.otyp === WAN_DIGGING && o.spe > 0 && !stuck && !t
            && !mtmp.isshk && !mtmp.isgd && !mtmp.ispriest
            && !is_floater(mtmp.data)
            /* monsters digging in Sokoban can ruin things */
            && !game.level.flags.sokoban_rules /* Sokoban */
            /* digging wouldn't be effective; assume they know that */
            && !((game.level.at(x, y).wall_info || 0) & W_NONDIGGABLE)
            && !(Is_botlevel(u.uz) || In_endgame(u.uz))
            && !(is_ice(x, y) || is_pool(x, y) || is_lava(x, y))
            && !(mtmp.data === mons[M.PM_VLAD_THE_IMPALER] /* is_Vlad() */
                 && In_V_tower(u.uz))) {
            game.m_defensive = o;
            game.m_has_defense = MUSE_WAN_DIGGING;
        }
        if (game.m_has_defense === MUSE_WAN_TELEPORTATION_SELF) continue;
        if (game.m_has_defense === MUSE_WAN_TELEPORTATION) continue;
        if (o.otyp === WAN_TELEPORTATION && o.spe > 0) {
            /* use the TELEP_TRAP bit to determine if they know
             * about noteleport on this level or not.  Avoids
             * ineffective re-use of teleportation.  This does
             * mean if the monster leaves the level, they'll know
             * about teleport traps.
             */
            if (!noteleport_level(mtmp)
                || !mon_knows_traps(mtmp, TELEP_TRAP)) {
                game.m_defensive = o;
                game.m_has_defense = (mon_has_amulet(mtmp))
                                     ? MUSE_WAN_TELEPORTATION
                                     : MUSE_WAN_TELEPORTATION_SELF;
            }
        }
        if (game.m_has_defense === MUSE_SCR_TELEPORTATION) continue;
        if (o.otyp === SCR_TELEPORTATION && mtmp.mcansee
            && haseyes(mtmp.data)
            && (!o.cursed || (!(mtmp.isshk && inhishop(mtmp))
                              && !mtmp.isgd && !mtmp.ispriest))) {
            /* see WAN_TELEPORTATION case above */
            if (!noteleport_level(mtmp)
                || !mon_knows_traps(mtmp, TELEP_TRAP)) {
                game.m_defensive = o;
                game.m_has_defense = MUSE_SCR_TELEPORTATION;
            }
        }

        if (mtmp.data !== mons[M.PM_PESTILENCE]) {
            if (game.m_has_defense === MUSE_POT_FULL_HEALING) continue;
            if (o.otyp === POT_FULL_HEALING) {
                game.m_defensive = o;
                game.m_has_defense = MUSE_POT_FULL_HEALING;
            }
            if (game.m_has_defense === MUSE_POT_EXTRA_HEALING) continue;
            if (o.otyp === POT_EXTRA_HEALING) {
                game.m_defensive = o;
                game.m_has_defense = MUSE_POT_EXTRA_HEALING;
            }
            if (game.m_has_defense === MUSE_WAN_CREATE_MONSTER) continue;
            if (o.otyp === WAN_CREATE_MONSTER && o.spe > 0) {
                game.m_defensive = o;
                game.m_has_defense = MUSE_WAN_CREATE_MONSTER;
            }
            if (game.m_has_defense === MUSE_POT_HEALING) continue;
            if (o.otyp === POT_HEALING) {
                game.m_defensive = o;
                game.m_has_defense = MUSE_POT_HEALING;
            }
        } else { /* Pestilence */
            if (game.m_has_defense === MUSE_POT_FULL_HEALING) continue;
            if (o.otyp === POT_SICKNESS) {
                game.m_defensive = o;
                game.m_has_defense = MUSE_POT_FULL_HEALING;
            }
            if (game.m_has_defense === MUSE_WAN_CREATE_MONSTER) continue;
            if (o.otyp === WAN_CREATE_MONSTER && o.spe > 0) {
                game.m_defensive = o;
                game.m_has_defense = MUSE_WAN_CREATE_MONSTER;
            }
        }
        if (game.m_has_defense === MUSE_SCR_CREATE_MONSTER) continue;
        if (o.otyp === SCR_CREATE_MONSTER) {
            game.m_defensive = o;
            game.m_has_defense = MUSE_SCR_CREATE_MONSTER;
        }
    }
    return !!game.m_has_defense;
}

// C ref: muse.c use_defensive()
/* Perform a defensive action for a monster.  Must be called immediately
 * after find_defensive().  Return values are 0: did something, 1: died,
 * 2: did something and can't attack again (i.e. teleported).
 */
export async function use_defensive(mtmp) {
    const u = game.u;
    const MissingDefensiveItem = (what) => `use_defensive: no ${what}`;
    let i;
    let otmp = game.m_defensive;
    let t;
    let stway;

    if ((i = await precheck(mtmp, otmp)) !== 0)
        return i;
    const vis = cansee(mtmp.mx, mtmp.my);
    const vismon = canseemon(mtmp);
    const oseen = !!otmp && vismon;

    /* when using defensive choice to run away, we want monster to avoid
       rushing right straight back; don't override if already scared */
    const fleetim = !mtmp.mflee
        ? (33 - Math.trunc(30 * mtmp.mhp / mtmp.mhpmax)) : 0;
    const m_flee = async (m) => {
        if (fleetim && !m.iswiz) {
            await monflee(m, fleetim, false, false);
        }
    };

    switch (game.m_has_defense) {
    case MUSE_UNICORN_HORN:
        /* unlike most defensive cases, unicorn horn object is optional */
        if (vismon) {
            if (otmp)
                await pline_mon(mtmp, `${Monnam(mtmp)} uses a unicorn horn!`);
            else
                await pline_The(`tip of ${mon_nam(mtmp)}'s horn glows!`);
        }
        if (!mtmp.mcansee) {
            await mcureblindness(mtmp, vismon);
        } else if (mtmp.mconf || mtmp.mstun) {
            mtmp.mconf = mtmp.mstun = 0;
            if (vismon)
                await pline_mon(mtmp, `${Monnam(mtmp)} seems steadier now.`);
        } else {
            /* impossible("No need for unicorn horn?") */
        }
        return 2;
    case MUSE_BUGLE:
        if (!otmp)
            throw new Error(MissingDefensiveItem("bugle")); /* panic() */
        if (vismon) {
            await pline_mon(mtmp, `${Monnam(mtmp)} plays ${doname(otmp)}!`);
        } else if (!Deaf()) {
            /* Soundeffect(se_bugle_playing_reveille, 100) */
            await You_hear("a bugle playing reveille!");
        }
        throw new Error('use_defensive(): awaken_soldiers() not ported yet');
    case MUSE_WAN_TELEPORTATION_SELF:
        if (!otmp)
            throw new Error(MissingDefensiveItem("wand of teleportation"));
        if ((mtmp.isshk && inhishop(mtmp)) || mtmp.isgd || mtmp.ispriest)
            return 2;
        await m_flee(mtmp);
        await mzapwand(mtmp, otmp, true);
        await m_tele(mtmp, vismon, oseen, WAN_TELEPORTATION);
        return 2;
    case MUSE_WAN_TELEPORTATION:
        if (!otmp)
            throw new Error(MissingDefensiveItem("wand of teleportation"));
        game.zap_oseen = oseen;
        await mzapwand(mtmp, otmp, false);
        game.m_using = true;
        await mbhit(mtmp, rn1(8, 6), mbhitm, bhito, otmp);
        /* monster learns that teleportation isn't useful here */
        if (noteleport_level(mtmp))
            mon_learns_traps(mtmp, TELEP_TRAP);
        game.m_using = false;
        return 2;
    case MUSE_SCR_TELEPORTATION: {
        if (!otmp)
            throw new Error(MissingDefensiveItem("scroll of teleportation"));
        const obj_is_cursed = otmp.cursed;
        if (mtmp.isshk || mtmp.isgd || mtmp.ispriest)
            return 2;
        await m_flee(mtmp);
        /* we want to be able to access otmp after the teleport but it
           might get destroyed if still in mtmp's inventory (maybe mtmp
           lands in lava or on a fire trap) so take it out in advance */
        if (otmp.quan > 1)
            otmp = splitobj(otmp, 1);
        extract_from_minvent(mtmp, otmp, false, false);
        /* 'last_msg' will be changed to PLNMSG_UNKNOWN if any messages
           are issued by mreadmsg(), 'if (vismon) pline()', or m_tele() */
        game.iflags.last_msg = PLNMSG_enum;
        await mreadmsg(mtmp, otmp); /* sets otmp->dknown if !Blind or !Deaf */
        if (obj_is_cursed || mtmp.mconf) {
            const flev = { dnum: 0, dlevel: 0 };

            const nlev = random_teleport_level();
            if (mon_has_amulet(mtmp) || In_endgame(u.uz)) {
                if (vismon)
                    await pline_mon(mtmp, `${Monnam(mtmp)} seems very disoriented for a moment.`);
            } else if (nlev === depth(u.uz)) {
                if (vismon)
                    await pline_mon(mtmp, `${Monnam(mtmp)} shudders for a moment.`);
            } else {
                get_level(flev, nlev);
                await migrate_to_level(mtmp, ledger_no(flev), MIGR_RANDOM, null);
            }
        } else {
            await m_tele(mtmp, vismon, oseen, SCR_TELEPORTATION);
        }
        /* m_tele() handles makeknown(); trycall() will be a no-op when
           otmp->otyp is already discovered */
        if (otmp.dknown && game.iflags.last_msg !== PLNMSG_enum)
            await trycall(otmp);
        /* already removed from mtmp->minvent so not 'm_useup(mtmp, otmp)' */
        obfree(otmp, null);
        return 2;
    }
    case MUSE_WAN_DIGGING:
        if (!otmp)
            throw new Error(MissingDefensiveItem("wand of digging"));
        await m_flee(mtmp);
        await mzapwand(mtmp, otmp, false);
        if (oseen)
            makeknown(WAN_DIGGING);
        if (IS_FURNITURE(game.level.at(mtmp.mx, mtmp.my).typ)
            || IS_DRAWBRIDGE(game.level.at(mtmp.mx, mtmp.my).typ)
            || (is_drawbridge_wall(mtmp.mx, mtmp.my) >= 0)
            || stairway_at(mtmp.mx, mtmp.my)) {
            await pline_The("digging ray is ineffective.");
            return 2;
        }
        if (!Can_dig_down(u.uz) && !game.level.at(mtmp.mx, mtmp.my).candig) {
            /* can't dig further if there's already a pit (or other trap)
               here, or if pit creation fails for some reason */
            if (t_at(mtmp.mx, mtmp.my)
                || !(t = maketrap(mtmp.mx, mtmp.my, PIT))) {
                if (vismon) {
                    await pline_The(`${surface(mtmp.mx, mtmp.my)} here is too hard to dig in.`);
                }
                return 2;
            }
            /* pit creation succeeded */
            if (vis) {
                seetrap(t);
                await pline_mon(mtmp, `${Monnam(mtmp)} has made a pit in the ${
                    surface(mtmp.mx, mtmp.my)}.`);
            }
            await fill_pit(mtmp.mx, mtmp.my);
            recalc_block_point(mtmp.mx, mtmp.my);
            return (await mintrap(mtmp, FORCEBUNGLE) === Trap_Killed_Mon) ? 1 : 2;
        }
        t = maketrap(mtmp.mx, mtmp.my, HOLE);
        if (!t)
            return 2;
        recalc_block_point(mtmp.mx, mtmp.my);
        seetrap(t);
        if (vis) {
            await pline_mon(mtmp, `${Monnam(mtmp)} has made a hole in the ${
                surface(mtmp.mx, mtmp.my)}.`);
            await pline_mon(mtmp, `${Monnam(mtmp)} ${
                is_flyer(mtmp.data) ? "dives" : "falls"} through...`);
        } else if (!Deaf()) {
            /* Soundeffect(se_crash_through_floor, 100) */
            await You_hear(`something crash through the ${
                surface(mtmp.mx, mtmp.my)}.`);
        }
        await fill_pit(mtmp.mx, mtmp.my);
        /* we made sure that there is a level for mtmp to go to */
        await migrate_to_level(mtmp, ledger_no(u.uz) + 1, MIGR_RANDOM, null);
        return 2;
    case MUSE_WAN_UNDEAD_TURNING:
        if (!otmp)
            throw new Error(MissingDefensiveItem("wand of undead turning"));
        game.zap_oseen = oseen;
        await mzapwand(mtmp, otmp, false);
        game.m_using = true;
        await mbhit(mtmp, rn1(8, 6), mbhitm, bhito, otmp);
        game.m_using = false;
        return 2;
    case MUSE_WAN_CREATE_MONSTER: {
        const cc = { x: 0, y: 0 };
        /* pm: 0 => random, eel => aquatic, croc => amphibious */
        const pm = !is_pool(mtmp.mx, mtmp.my) ? null
                   : mons[u.uinwater ? M.PM_GIANT_EEL : M.PM_CROCODILE];

        if (!otmp)
            throw new Error(MissingDefensiveItem("wand of create monster"));
        if (!enexto(cc, mtmp.mx, mtmp.my, pm))
            return 0;
        await mzapwand(mtmp, otmp, false);
        let mon;
        game.makemon_want_msg = true; /* see makemon()'s Norep() comment */
        try {
            mon = makemon(null, cc.x, cc.y, NO_MM_FLAGS);
        } finally {
            game.makemon_want_msg = false;
        }
        await makemon_flush_msg();
        if (mon && canspotmon(mon) && oseen)
            makeknown(WAN_CREATE_MONSTER);
        return 2;
    }
    case MUSE_SCR_CREATE_MONSTER: {
        const cc = { x: 0, y: 0 };
        let pm = null, fish = null;
        let cnt = 1;
        let mon;
        let known = false;

        if (!otmp)
            throw new Error(MissingDefensiveItem("scroll of create monster"));
        if (!rn2(73))
            cnt += rnd(4);
        if (mtmp.mconf || otmp.cursed)
            cnt += 12;
        if (mtmp.mconf)
            pm = fish = mons[M.PM_ACID_BLOB];
        else if (is_pool(mtmp.mx, mtmp.my))
            fish = mons[u.uinwater ? M.PM_GIANT_EEL : M.PM_CROCODILE];
        await mreadmsg(mtmp, otmp);
        while (cnt--) {
            /* `fish' potentially gives bias towards water locations;
               `pm' is what to actually create (0 => random) */
            if (!enexto(cc, mtmp.mx, mtmp.my, fish))
                break;
            game.makemon_want_msg = true; /* see makemon()'s Norep() comment */
            try {
                mon = makemon(pm, cc.x, cc.y, NO_MM_FLAGS);
            } finally {
                game.makemon_want_msg = false;
            }
            await makemon_flush_msg();
            if (mon && canspotmon(mon))
                known = true;
        }
        /* The only case where we don't use oseen.  For wands, you
         * have to be able to see the monster zap the wand to know
         * what type it is.  For teleport scrolls, you have to see
         * the monster to know it teleported.
         */
        if (known)
            makeknown(SCR_CREATE_MONSTER);
        else
            await trycall(otmp);
        m_useup(mtmp, otmp);
        return 2;
    }
    case MUSE_TRAPDOOR:
        /* trap doors on "bottom" levels of dungeons are rock-drop
         * trap doors, not holes in the floor.  We check here for
         * safety.
         */
        if (Is_botlevel(u.uz))
            return 0;
        await m_flee(mtmp);
        t = t_at(game.trapx, game.trapy);
        if (vis) {
            await pline_mon(mtmp, `${Monnam(mtmp)} ${
                vtense("mon" /* fakename[0] */, locomotion(mtmp.data, "jump"))} into a ${
                trapname(t.ttyp, false)}!`);
        }
        /* if trap was in a concealed niche, it's no longer concealed */
        reveal_trap(t, vis);

        /*  don't use rloc_to() because worm tails must "move" */
        remove_monster(mtmp);
        newsym(mtmp.mx, mtmp.my); /* update old location */
        place_monster(mtmp, game.trapx, game.trapy);
        if (mtmp.wormno)
            worm_move(mtmp);
        newsym(game.trapx, game.trapy);

        await migrate_to_level(mtmp, ledger_no(u.uz) + 1, MIGR_RANDOM, null);
        return 2;
    case MUSE_UPSTAIRS:
        await m_flee(mtmp);
        stway = stairway_at(mtmp.mx, mtmp.my);
        if (!stway)
            return 0;
        if (ledger_no(u.uz) === 1)
            /* impossible; level 1 upstairs are SSTAIRS */
            return await mon_escape(mtmp, vismon);
        if (In_hell(u.uz) && mon_has_amulet(mtmp) && !rn2(4)
            && (dunlev(u.uz) < dunlevs_in_dungeon(u.uz) - 3)) {
            if (vismon)
                await pline(`As ${mon_nam(mtmp)} climbs the stairs, a mysterious force momentarily surrounds ${mhim(mtmp)}...`);
            /* simpler than for the player; this will usually be
               the Wizard and he'll immediately go right to the
               upstairs, so there's not much point in having any
               chance for a random position on the current level */
            await migrate_to_level(mtmp, ledger_no(u.uz) + 1, MIGR_RANDOM, null);
        } else {
            if (vismon)
                await pline_mon(mtmp, `${Monnam(mtmp)} escapes upstairs!`);
            await migrate_to_level(mtmp, ledger_no(stway.tolev), MIGR_STAIRS_DOWN,
                             null);
        }
        return 2;
    case MUSE_DOWNSTAIRS:
        await m_flee(mtmp);
        stway = stairway_at(mtmp.mx, mtmp.my);
        if (!stway)
            return 0;
        if (vismon)
            await pline_mon(mtmp, `${Monnam(mtmp)} escapes downstairs!`);
        await migrate_to_level(mtmp, ledger_no(stway.tolev), MIGR_STAIRS_UP, null);
        return 2;
    case MUSE_UP_LADDER:
        await m_flee(mtmp);
        stway = stairway_at(mtmp.mx, mtmp.my);
        if (!stway)
            return 0;
        if (vismon)
            await pline_mon(mtmp, `${Monnam(mtmp)} escapes up the ladder!`);
        await migrate_to_level(mtmp, ledger_no(stway.tolev), MIGR_LADDER_DOWN,
                         null);
        return 2;
    case MUSE_DN_LADDER:
        await m_flee(mtmp);
        stway = stairway_at(mtmp.mx, mtmp.my);
        if (!stway)
            return 0;
        if (vismon)
            await pline_mon(mtmp, `${Monnam(mtmp)} escapes down the ladder!`);
        await migrate_to_level(mtmp, ledger_no(stway.tolev), MIGR_LADDER_UP, null);
        return 2;
    case MUSE_SSTAIRS:
        await m_flee(mtmp);
        stway = stairway_at(mtmp.mx, mtmp.my);
        if (!stway)
            return 0;
        if (ledger_no(u.uz) === 1) {
            return await mon_escape(mtmp, vismon);
        }
        if (vismon)
            await pline_mon(mtmp, `${Monnam(mtmp)} escapes ${stway.up ? "up" : "down"}stairs!`);
        /* going from the Valley to Castle (Stronghold) has no sstairs
           to target, but having gs.sstairs.<sx,sy> == <0,0> will work the
           same as specifying MIGR_RANDOM when mon_arrive() eventually
           places the monster, so we can use MIGR_SSTAIRS unconditionally */
        await migrate_to_level(mtmp, ledger_no(stway.tolev), MIGR_SSTAIRS, null);
        return 2;
    case MUSE_TELEPORT_TRAP:
        await m_flee(mtmp);
        t = t_at(game.trapx, game.trapy);
        if (vis) {
            await pline_mon(mtmp, `${Monnam(mtmp)} ${
                vtense("mon" /* fakename[0] */, locomotion(mtmp.data, "jump"))} onto a ${
                trapname(t.ttyp, false)}!`);
        }
        /* if trap was in a concealed niche, it's no longer concealed */
        reveal_trap(t, vis);
        /*  don't use rloc_to() because worm tails must "move" */
        remove_monster(mtmp);
        newsym(mtmp.mx, mtmp.my); /* update old location */
        place_monster(mtmp, game.trapx, game.trapy);
        if (mtmp.wormno)
            worm_move(mtmp);
        maybe_unhide_at(mtmp.mx, mtmp.my);
        newsym(game.trapx, game.trapy);
        /* 0: 'no object' rather than STRANGE_OBJECT; FALSE: obj not seen */
        await m_tele(mtmp, vismon, false, 0);
        return 2;
    case MUSE_POT_HEALING:
        if (!otmp)
            throw new Error(MissingDefensiveItem("potioh of healing"));
        await mquaffmsg(mtmp, otmp);
        i = d(6 + 2 * bcsign(otmp), 4);
        healmon(mtmp, i, 1);
        if (!otmp.cursed && !mtmp.mcansee)
            await mcureblindness(mtmp, vismon);
        if (vismon)
            await pline_mon(mtmp, `${Monnam(mtmp)} looks better.`);
        if (oseen)
            makeknown(POT_HEALING);
        m_useup(mtmp, otmp);
        return 2;
    case MUSE_POT_EXTRA_HEALING:
        if (!otmp)
            throw new Error(MissingDefensiveItem("potioh of extra healing"));
        await mquaffmsg(mtmp, otmp);
        i = d(6 + 2 * bcsign(otmp), 8);
        healmon(mtmp, i, otmp.blessed ? 5 : 2);
        if (!mtmp.mcansee)
            await mcureblindness(mtmp, vismon);
        if (vismon)
            await pline_mon(mtmp, `${Monnam(mtmp)} looks much better.`);
        if (oseen)
            makeknown(POT_EXTRA_HEALING);
        m_useup(mtmp, otmp);
        return 2;
    case MUSE_POT_FULL_HEALING:
        if (!otmp)
            throw new Error(MissingDefensiveItem("potioh of full healing"));
        await mquaffmsg(mtmp, otmp);
        if (otmp.otyp === POT_SICKNESS)
            unbless(otmp); /* Pestilence */
        healmon(mtmp, mtmp.mhpmax, otmp.blessed ? 8 : 4);
        if (!mtmp.mcansee && otmp.otyp !== POT_SICKNESS)
            await mcureblindness(mtmp, vismon);
        if (vismon)
            await pline_mon(mtmp, `${Monnam(mtmp)} looks completely healed.`);
        if (oseen)
            makeknown(otmp.otyp);
        m_useup(mtmp, otmp);
        return 2;
    case MUSE_LIZARD_CORPSE:
        if (!otmp)
            throw new Error(MissingDefensiveItem("lizard corpse"));
        /* not actually called for its unstoning effect */
        await mon_consume_unstone(mtmp, otmp, false, false);
        return 2;
    case 0:
        return 0; /* i.e. an exploded wand */
    default:
        /* impossible("%s wanted to perform action %d?") */
        break;
    }
    return 0;
}

/* sentinel for use_defensive()'s MUSE_SCR_TELEPORTATION: pline() resets
   iflags.last_msg to PLNMSG_UNKNOWN */
const PLNMSG_enum = -1;

/* C ref: display.h remove_monster() -- the monster list is keyed by mx/my */
export function remove_monster(mtmp) {
    const lst = game.level.monsters || [];
    const i = lst.indexOf(mtmp);
    if (i >= 0)
        lst.splice(i, 1);
}

// C ref: trap.c fill_pit()
export async function fill_pit(x, y) {
    let otmp;
    const t = t_at(x, y);

    if (t && (is_pit(t.ttyp) || is_hole(t.ttyp))
        && (otmp = sobj_at(BOULDER, x, y)) !== null) {
        obj_extract_self(otmp);
        await flooreffects(otmp, x, y, "settle");
    }
}


// C ref: muse.c linedup_chk_corpse()
function linedup_chk_corpse(x, y) {
    return (sobj_at(CORPSE, x, y) !== null);
}

// C ref: muse.c m_use_undead_turning()
function m_use_undead_turning(mtmp, obj) {
    const u = game.u;
    const ax = u.ux + sgn(mtmp.mux - mtmp.mx) * 3,
          ay = u.uy + sgn(mtmp.muy - mtmp.my) * 3;
    const bx = mtmp.mx, by = mtmp.my;

    if (!(obj.otyp === WAN_UNDEAD_TURNING && obj.spe > 0))
        return;

    /* not necrophiliac(); unlike deciding whether to pick this
       type of wand up, we aren't interested in corpses within
       carried containers until they're moved into open inventory;
       we don't check whether hero is poly'd into an undead--the
       wand's turning effect is too weak to be a useful direct
       attack--only whether hero is carrying at least one corpse */
    if (carrying(CORPSE)
        /*
         * If hero is carrying one or more corpses but isn't wielding
         * a cockatrice corpse (unless being hit by one won't do
         * the monster much harm); otherwise we'd be using this wand
         * as a defensive item with higher priority.
         */
        || linedup_callback(ax, ay, bx, by, linedup_chk_corpse)
        /* or there's a corpse on the ground in a direct line from the
           monster to the hero, and up to 3 steps beyond. */
        ) {
        game.m_offensive = obj;
        game.m_has_offense = MUSE_WAN_UNDEAD_TURNING;
    }
}

// C ref: muse.c hero_behind_chokepoint()
/* from monster's point of view, is hero behind a chokepoint? */
function hero_behind_chokepoint(mtmp) {
    const dx = sgn(mtmp.mx - mtmp.mux);
    const dy = sgn(mtmp.my - mtmp.muy);

    const x = mtmp.mux + dx;
    const y = mtmp.muy + dy;

    const dir = xytodir(dx, dy);
    const dir_l = (((dir + 6) % N_DIRS) + N_DIRS) % N_DIRS; /* DIR_CLAMP(DIR_LEFT2()) */
    const dir_r = (((dir + 2) % N_DIRS) + N_DIRS) % N_DIRS; /* DIR_CLAMP(DIR_RIGHT2()) */

    /* dirtocoord() */
    const c1 = { x: xdir[dir_l], y: ydir[dir_l] };
    const c2 = { x: xdir[dir_r], y: ydir[dir_r] };
    c1.x += x, c2.x += x;
    c1.y += y, c2.y += y;

    if ((!isok(c1.x, c1.y) || !accessible(c1.x, c1.y))
        && (!isok(c2.x, c2.y) || !accessible(c2.x, c2.y)))
        return true;
    return false;
}

// C ref: muse.c mon_has_friends()
/* hostile monster has another hostile next to it */
function mon_has_friends(mtmp) {
    let mon2;

    if (mtmp.mtame || mtmp.mpeaceful)
        return false;

    for (let dx = -1; dx <= 1; dx++)
        for (let dy = -1; dy <= 1; dy++) {
            const x = mtmp.mx + dx;
            const y = mtmp.my + dy;

            if (isok(x, y) && (mon2 = m_at(x, y)) !== null
                && mon2 !== mtmp
                && !mon2.mtame && !mon2.mpeaceful)
                return true;
        }

    return false;
}

// C ref: muse.c mon_likes_objpile_at()
/* does monster like object pile at x,y? */
function mon_likes_objpile_at(mtmp, x, y) {
    let i;

    if (!isok(x, y) || !OBJ_AT(x, y))
        return false;

    /* monster likes any of the top 3 items in the pile?
       (svl.level.objects[x][y] chain, top of the pile first) */
    const pile = level_objects_at(x, y);
    for (i = 0; i < pile.length && i < 3; i++) {
        if (mon_would_take_item(mtmp, pile[i]))
            return true;
    }

    /* pile is larger than 3 stacks? */
    if (i >= 3)
        return true;

    return false;
}

// C ref: muse.c find_offensive()
/* Select an offensive item/action for a monster.  Returns TRUE iff one is
 * found.
 */
export function find_offensive(mtmp) {
    const u = game.u;

    game.m_offensive = null;
    game.m_has_offense = 0;
    if (mtmp.mpeaceful || is_animal(mtmp.data) || mindless(mtmp.data)
        || nohands(mtmp.data))
        return false;
    if (u.uswallow)
        return false;
    if (in_your_sanctuary(mtmp, 0, 0))
        return false;
    if (dmgtype(mtmp.data, M.AD_HEAL)
        && !game.uwep && !game.uarmu && !game.uarm && !game.uarmh
        && !game.uarms && !game.uarmg && !game.uarmc && !game.uarmf)
        return false;
    /* all offensive items require orthogonal or diagonal targeting */
    if (!lined_up(mtmp))
        return false;

    const reflection_skip = (m_seenres(mtmp, M_SEEN_REFL) !== 0
                             || monnear(mtmp, mtmp.mux, mtmp.muy));
    const mtmp_helmet = which_armor(mtmp, W_ARMH);
    /* this picks the last viable item rather than prioritizing choices */
    for (const obj of minv(mtmp)) {
        if (!reflection_skip) {
            if (game.m_has_offense === MUSE_WAN_DEATH) continue;
            if (obj.otyp === WAN_DEATH && obj.spe > 0
                && !m_seenres(mtmp, M_SEEN_MAGR)) {
                game.m_offensive = obj;
                game.m_has_offense = MUSE_WAN_DEATH;
            }
            if (game.m_has_offense === MUSE_WAN_SLEEP) continue;
            if (obj.otyp === WAN_SLEEP && obj.spe > 0 && game.multi >= 0
                && !m_seenres(mtmp, M_SEEN_SLEEP)) {
                game.m_offensive = obj;
                game.m_has_offense = MUSE_WAN_SLEEP;
            }
            if (game.m_has_offense === MUSE_WAN_FIRE) continue;
            if (obj.otyp === WAN_FIRE && obj.spe > 0
                && !m_seenres(mtmp, M_SEEN_FIRE)) {
                game.m_offensive = obj;
                game.m_has_offense = MUSE_WAN_FIRE;
            }
            if (game.m_has_offense === MUSE_FIRE_HORN) continue;
            if (obj.otyp === FIRE_HORN && obj.spe > 0 && can_blow(mtmp)
                && !m_seenres(mtmp, M_SEEN_FIRE)) {
                game.m_offensive = obj;
                game.m_has_offense = MUSE_FIRE_HORN;
            }
            if (game.m_has_offense === MUSE_WAN_COLD) continue;
            if (obj.otyp === WAN_COLD && obj.spe > 0
                && !m_seenres(mtmp, M_SEEN_COLD)) {
                game.m_offensive = obj;
                game.m_has_offense = MUSE_WAN_COLD;
            }
            if (game.m_has_offense === MUSE_FROST_HORN) continue;
            if (obj.otyp === FROST_HORN && obj.spe > 0 && can_blow(mtmp)
                && !m_seenres(mtmp, M_SEEN_COLD)) {
                game.m_offensive = obj;
                game.m_has_offense = MUSE_FROST_HORN;
            }
            if (game.m_has_offense === MUSE_WAN_LIGHTNING) continue;
            if (obj.otyp === WAN_LIGHTNING && obj.spe > 0
                && !m_seenres(mtmp, M_SEEN_ELEC)) {
                game.m_offensive = obj;
                game.m_has_offense = MUSE_WAN_LIGHTNING;
            }
            if (game.m_has_offense === MUSE_WAN_MAGIC_MISSILE) continue;
            if (obj.otyp === WAN_MAGIC_MISSILE && obj.spe > 0
                && !m_seenres(mtmp, M_SEEN_MAGR)) {
                game.m_offensive = obj;
                game.m_has_offense = MUSE_WAN_MAGIC_MISSILE;
            }
        }
        if (game.m_has_offense === MUSE_WAN_UNDEAD_TURNING) continue;
        m_use_undead_turning(mtmp, obj);
        if (game.m_has_offense === MUSE_WAN_STRIKING) continue;
        if (obj.otyp === WAN_STRIKING && obj.spe > 0
            && !m_seenres(mtmp, M_SEEN_MAGR)) {
            game.m_offensive = obj;
            game.m_has_offense = MUSE_WAN_STRIKING;
        }
        if (game.m_has_offense === MUSE_WAN_TELEPORTATION) continue;
        if (obj.otyp === WAN_TELEPORTATION && obj.spe > 0
            /* don't give controlled hero a free teleport */
            && !Teleport_control()
            /* same hack as MUSE_WAN_TELEPORTATION_SELF */
            && (!noteleport_level(mtmp)
                || !mon_knows_traps(mtmp, TELEP_TRAP))
            /* do try to move hero to a more vulnerable spot */
            && (onscary(u.ux, u.uy, mtmp)
                || (hero_behind_chokepoint(mtmp) && mon_has_friends(mtmp))
                || mon_likes_objpile_at(mtmp, u.ux, u.uy)
                || stairway_at(u.ux, u.uy))) {
            game.m_offensive = obj;
            game.m_has_offense = MUSE_WAN_TELEPORTATION;
        }
        if (game.m_has_offense === MUSE_POT_PARALYSIS) continue;
        if (obj.otyp === POT_PARALYSIS && game.multi >= 0) {
            game.m_offensive = obj;
            game.m_has_offense = MUSE_POT_PARALYSIS;
        }
        if (game.m_has_offense === MUSE_POT_BLINDNESS) continue;
        if (obj.otyp === POT_BLINDNESS
            && !mtmp.data.mattk.some(a => a.aatyp === M.AT_GAZE)) {
            game.m_offensive = obj;
            game.m_has_offense = MUSE_POT_BLINDNESS;
        }
        if (game.m_has_offense === MUSE_POT_CONFUSION) continue;
        if (obj.otyp === POT_CONFUSION) {
            game.m_offensive = obj;
            game.m_has_offense = MUSE_POT_CONFUSION;
        }
        if (game.m_has_offense === MUSE_POT_SLEEPING) continue;
        if (obj.otyp === POT_SLEEPING
            && !m_seenres(mtmp, M_SEEN_SLEEP)) {
            game.m_offensive = obj;
            game.m_has_offense = MUSE_POT_SLEEPING;
        }
        if (game.m_has_offense === MUSE_POT_ACID) continue;
        if (obj.otyp === POT_ACID
            && !m_seenres(mtmp, M_SEEN_ACID)) {
            game.m_offensive = obj;
            game.m_has_offense = MUSE_POT_ACID;
        }
        /* we can safely put this scroll here since the locations that
         * are in a 1 square radius are a subset of the locations that
         * are in wand or throwing range (in other words, always lined_up())
         */
        if (game.m_has_offense === MUSE_SCR_EARTH) continue;
        if (obj.otyp === SCR_EARTH
            && (hard_helmet(mtmp_helmet) || mtmp.mconf
                || amorphous(mtmp.data) || passes_walls(mtmp.data)
                || noncorporeal(mtmp.data) || unsolid(mtmp.data)
                || !rn2(10))
            && dist2(mtmp.mx, mtmp.my, mtmp.mux, mtmp.muy) <= 2
            && mtmp.mcansee && haseyes(mtmp.data)
            && !Is_rogue_level(u.uz)
            && (!In_endgame(u.uz) || Is_earthlevel(u.uz))) {
            game.m_offensive = obj;
            game.m_has_offense = MUSE_SCR_EARTH;
        }
        if (game.m_has_offense === MUSE_CAMERA) continue;
        if (obj.otyp === EXPENSIVE_CAMERA
            && ((!Blind() && !resists_blnd(game.youmonst))
                || game.youmonst.data === mons[M.PM_GREMLIN] /* hates_light() */)
            && dist2(mtmp.mx, mtmp.my, mtmp.mux, mtmp.muy) <= 2
            && obj.spe > 0 && !rn2(6)) {
            game.m_offensive = obj;
            game.m_has_offense = MUSE_CAMERA;
        }
    }
    return !!game.m_has_offense;
}

/* C ref: muse.c MUSE_* (miscellaneous) */
const MUSE_POT_GAIN_LEVEL = 1;
const MUSE_WAN_MAKE_INVISIBLE = 2;
const MUSE_POT_INVISIBILITY = 3;
const MUSE_POLY_TRAP = 4;
const MUSE_WAN_POLYMORPH = 5;
const MUSE_POT_SPEED = 6;
const MUSE_WAN_SPEED_MONSTER = 7;
const MUSE_BULLWHIP = 8;
const MUSE_POT_POLYMORPH = 9;
const MUSE_BAG = 10;

// C ref: muse.c find_misc()
export async function find_misc(mtmp) {
    const u = game.u;
    const mdat = mtmp.data;
    const x = mtmp.mx, y = mtmp.my;
    let t;
    let pmidx = NON_PM;
    const immobile = (mdat.mmove === 0);
    const stuck = (mtmp === u.ustuck);

    game.m_misc = null;
    game.m_has_misc = 0;
    if (is_animal(mdat) || mindless(mdat))
        return false;
    if (u.uswallow && stuck)
        return false;

    /* We arbitrarily limit to times when a player is nearby for the
     * same reason as Junior Pac-Man doesn't have energizers eaten until
     * you can see them...
     */
    if (dist2(x, y, mtmp.mux, mtmp.muy) > 36)
        return false;

    if (!stuck && !immobile && !mtmp.mtrapped && (mtmp.cham === NON_PM)
        && mons[(pmidx = monsndx(mdat))].difficulty < 6) {
        const ignore_boulders = (verysmall(mdat) || throws_rocks(mdat)
                                 || passes_walls(mdat)),
            diag_ok = !NODIAG(pmidx);

        for (let xx = x - 1; xx <= x + 1; xx++)
            for (let yy = y - 1; yy <= y + 1; yy++)
                if (isok(xx, yy) && !u_at(xx, yy)
                    && (diag_ok || xx === x || yy === y)
                    && ((xx === x && yy === y) || !m_at(xx, yy)))
                    if ((t = t_at(xx, yy)) !== null
                        && (ignore_boulders || !sobj_at(BOULDER, xx, yy))
                        && !onscary(xx, yy, mtmp)) {
                        /* use trap if it's the correct type and will
                           polymorph the monster */
                        if (t.ttyp === POLY_TRAP
                            && !wearing_iron_shoes(mtmp)) {
                            game.trapx = xx;
                            game.trapy = yy;
                            game.m_has_misc = MUSE_POLY_TRAP;
                            return true;
                        }
                    }
    }
    if (nohands(mdat))
        return false;

    /* [bug?]  Choice of item is not prioritized; the last viable one
       in the monster's inventory will be chosen. */
    for (const obj of minv(mtmp)) {
        /* Monsters shouldn't recognize cursed items; this kludge is
           necessary to prevent serious problems though... */
        if (obj.otyp === POT_GAIN_LEVEL
            && (!obj.cursed
                || (!mtmp.isgd && !mtmp.isshk && !mtmp.ispriest))) {
            game.m_misc = obj;
            game.m_has_misc = MUSE_POT_GAIN_LEVEL;
        }
        if (game.m_has_misc === MUSE_BULLWHIP) continue;
        if (obj.otyp === BULLWHIP && !mtmp.mpeaceful
            /* the random test prevents whip-wielding
               monster from attempting disarm every turn */
            && game.uwep && !rn2(5) && obj === mtmp.mw /* MON_WEP() */
            /* hero's location must be known and adjacent */
            && u_at(mtmp.mux, mtmp.muy)
            && m_next2u(mtmp)
            /* don't bother if it can't work (this doesn't
               prevent cursed weapons from being targeted) */
            && !u.uswallow
            && ((await canletgo(game.uwep, ""))
                || (u.twoweap && (await canletgo(game.uswapwep, ""))))) {
            game.m_misc = obj;
            game.m_has_misc = MUSE_BULLWHIP;
        }
        /* Note: peaceful/tame monsters won't make themselves
         * invisible unless you can see them.  Not really right, but...
         */
        if (game.m_has_misc === MUSE_WAN_MAKE_INVISIBLE) continue;
        if (obj.otyp === WAN_MAKE_INVISIBLE && obj.spe > 0 && !mtmp.minvis
            && !mtmp.invis_blkd && (!mtmp.mpeaceful || See_invisible())
            && (!attacktype(mtmp.data, M.AT_GAZE) || mtmp.mcan)) {
            game.m_misc = obj;
            game.m_has_misc = MUSE_WAN_MAKE_INVISIBLE;
        }
        if (game.m_has_misc === MUSE_POT_INVISIBILITY) continue;
        if (obj.otyp === POT_INVISIBILITY && !mtmp.minvis
            && !mtmp.invis_blkd && (!mtmp.mpeaceful || See_invisible())
            && (!attacktype(mtmp.data, M.AT_GAZE) || mtmp.mcan)) {
            game.m_misc = obj;
            game.m_has_misc = MUSE_POT_INVISIBILITY;
        }
        if (game.m_has_misc === MUSE_WAN_SPEED_MONSTER) continue;
        if (obj.otyp === WAN_SPEED_MONSTER && obj.spe > 0
            && mtmp.mspeed !== MFAST && !mtmp.isgd) {
            game.m_misc = obj;
            game.m_has_misc = MUSE_WAN_SPEED_MONSTER;
        }
        if (game.m_has_misc === MUSE_POT_SPEED) continue;
        if (obj.otyp === POT_SPEED && mtmp.mspeed !== MFAST && !mtmp.isgd) {
            game.m_misc = obj;
            game.m_has_misc = MUSE_POT_SPEED;
        }
        if (game.m_has_misc === MUSE_WAN_POLYMORPH) continue;
        if (obj.otyp === WAN_POLYMORPH && obj.spe > 0
            && (mtmp.cham === NON_PM) && mons[monsndx(mdat)].difficulty < 6) {
            game.m_misc = obj;
            game.m_has_misc = MUSE_WAN_POLYMORPH;
        }
        if (game.m_has_misc === MUSE_POT_POLYMORPH) continue;
        if (obj.otyp === POT_POLYMORPH && (mtmp.cham === NON_PM)
            && mons[monsndx(mdat)].difficulty < 6) {
            game.m_misc = obj;
            game.m_has_misc = MUSE_POT_POLYMORPH;
        }
        if (game.m_has_misc === MUSE_BAG) continue;
        if (Is_container(obj) && obj.otyp !== BAG_OF_TRICKS && !rn2(5)
            && !(obj.otyp === LARGE_BOX && obj.spe === 1) /* SchroedingersBox() */
            && !game.m_has_misc && obj.cobj?.length /* Has_contents() */
            && !obj.olocked && !obj.otrapped) {
            game.m_misc = obj;
            game.m_has_misc = MUSE_BAG;
        }
    }
    return !!game.m_has_misc;
}

// C ref: muse.c muse_newcham_mon()
/* type of monster to polymorph into; defaults to one suitable for the
   current level rather than the totally arbitrary choice of newcham() */
function muse_newcham_mon(mon) {
    let m_armr;

    if ((m_armr = which_armor(mon, W_ARM)) !== null && m_armr !== undefined) {
        if (Is_dragon_scales(m_armr))
            return Dragon_scales_to_pm(m_armr);
        else if (Is_dragon_mail(m_armr))
            return Dragon_mail_to_pm(m_armr);
    }
    return rndmonst();
}

// C ref: muse.c mloot_container()
async function mloot_container(mon, container, vismon) {
    let contnr_nam = "", mpronounbuf = "";
    let takeout_indx, takeout_count, res = 0;

    if (!container || !Has_contents(container) || container.olocked)
        return res; /* 0 */
    /* FIXME: handle cursed bag of holding */
    if (Is_mbag(container) && container.cursed)
        return res; /* 0 */
    if (SchroedingersBox(container))
        return res;

    switch (rn2(10)) {
    default: /* case 0, 1, 2, 3: */
        takeout_count = 1;
        break;
    case 4: case 5: case 6:
        takeout_count = 2;
        break;
    case 7: case 8:
        takeout_count = 3;
        break;
    case 9:
        takeout_count = 4;
        break;
    }
    const howfar = mdistu(mon);
    const nearby = (howfar <= 7 * 7);
    if (vismon) {
        /* do this once so that when hallucinating it won't change
           from one item to the next */
        mpronounbuf = mhe(mon);
    }

    for (takeout_indx = 0; takeout_indx < takeout_count; ++takeout_indx) {
        let xobj;
        let nitems;

        if (!Has_contents(container)) /* might have removed all items */
            break;
        /* TODO?
         *  Monster ought to prioritize on something it wants to use.
         */
        /* container->cobj chain: mkobj.js keeps it as an array in C's
           chain order */
        nitems = container.cobj.length;
        /* nitems is always greater than 0 due to Has_contents() check;
           throttle item removal as the container becomes less filled */
        if (!rn2(nitems + 1))
            break;
        nitems = rn2(nitems);
        xobj = container.cobj[nitems];

        container.cknown = 0; /* hero no longer knows container's contents
                               * even if [attempted] removal is observed */
        if (!contnr_nam) {
            /* xname sets dknown, distant_name might depending on its own
               idea about nearness */
            contnr_nam = an(nearby ? xname(container)
                                   : distant_name(container, xname));
        }
        /* this was originally just 'can_carry(mon, xobj)' which
           covers objects a monster shouldn't pick up but also
           checks carrying capacity; for that, it ended up counting
           xobj's weight twice when container is carried; so take
           xobj out, check whether it can be carried, and then put
           it back (below) if it can't be */
        obj_extract_self(xobj); /* this reduces container's weight */
        /* check whether mon can handle xobj and whether weight of xobj plus
           minvent (including container, now without xobj) can be carried */
        if (can_carry(mon, xobj)) {
            if (vismon) {
                if (howfar > 2) /* not adjacent */
                    await Norep(`${Monnam(mon)} rummages through ${contnr_nam}.`);
                else if (takeout_indx === 0) /* adjacent, first item */
                    await pline_mon(mon, `${Monnam(mon)} removes ${doname(xobj)} from ${
                        contnr_nam}.`);
                else /* adjacent, additional items */
                    await pline(`${upstart(mpronounbuf)} removes ${doname(xobj)}.`);
            }
            if (container.otyp === ICE_BOX)
                removed_from_icebox(xobj); /* resume rotting for corpse */
            /* obj_extract_self(xobj); -- already done above */
            mpickobj(mon, xobj);
            res = 2;
        } else { /* couldn't carry xobj separately so put back inside */
            /* an achievement prize (castle's wand?) might already be
               marked nomerge (when it hasn't been in invent yet) */
            const already_nomerge = !!xobj.nomerge,
                  just_xobj = !Has_contents(container);

            /* this doesn't restore the original contents ordering
               [shouldn't be a problem; even though this item didn't
               give the rummage message, that's what mon was doing] */
            xobj.nomerge = 1;
            xobj = add_to_container(container, xobj);
            if (!already_nomerge)
                xobj.nomerge = 0;
            container.owt = weight(container);
            if (just_xobj)
                break; /* out of takeout_count loop */
        } /* can_carry */
    } /* takeout_count */
    return res;
}

// C ref: muse.c use_misc()
export async function use_misc(mtmp) {
    const u = game.u;
    const MissingMiscellaneousItem = (what) => `use_misc: no ${what}`;
    let i;
    let t;
    const otmp = game.m_misc;

    if ((i = await precheck(mtmp, otmp)) !== 0)
        return i;
    const vis = cansee(mtmp.mx, mtmp.my);
    const vismon = canseemon(mtmp);
    const oseen = !!otmp && vismon;

    switch (game.m_has_misc) {
    case MUSE_POT_GAIN_LEVEL:
        if (!otmp) /* panic() */
            throw new Error(MissingMiscellaneousItem("potion of gain level"));
        await mquaffmsg(mtmp, otmp);
        if (otmp.cursed) {
            let skipmsg = false;
            if (Can_rise_up(mtmp.mx, mtmp.my, u.uz)) {
                const tolev = depth(u.uz) - 1;
                const tolevel = { dnum: 0, dlevel: 0 };

                get_level(tolevel, tolev);
                /* insurance against future changes... */
                if (on_level(tolevel, u.uz)) {
                    skipmsg = true;
                } else {
                    if (vismon) {
                        await pline_mon(mtmp, `${Monnam(mtmp)} rises up, through the ${
                            ceiling(mtmp.mx, mtmp.my)}!`);
                        await trycall(otmp);
                    }
                    m_useup(mtmp, otmp);
                    await migrate_to_level(mtmp, ledger_no(tolevel), MIGR_RANDOM,
                                     null);
                    return 2;
                }
            } else {
                skipmsg = true;
            }
            if (skipmsg) {
                if (vismon) {

                    await pline_mon(mtmp, `${Monnam(mtmp)} looks uneasy.`);
                    await trycall(otmp);
                }
                m_useup(mtmp, otmp);
                return 2;
            }
        }
        if (vismon)
            await pline_mon(mtmp, `${Monnam(mtmp)} seems more experienced.`);
        if (oseen)
            makeknown(POT_GAIN_LEVEL);
        m_useup(mtmp, otmp);
        if (!(await grow_up(mtmp, null)))
            return 1;
        /* grew into genocided monster */
        return 2;
    case MUSE_WAN_MAKE_INVISIBLE:
    case MUSE_POT_INVISIBILITY: {
        if (!otmp)
            throw new Error(MissingMiscellaneousItem("potion of invisibility"));
        if (otmp.otyp === WAN_MAKE_INVISIBLE) {
            await mzapwand(mtmp, otmp, true);
        } else
            await mquaffmsg(mtmp, otmp);
        /* format monster's name before altering its visibility */
        const nambuf = mon_nam(mtmp);
        mon_set_minvis(mtmp, !otmp.cursed ? false : true);
        if (vismon && mtmp.minvis) { /* was seen, now invisible */
            if (canspotmon(mtmp)) {
                await pline(`${upstart(s_suffix(nambuf))} body takes on a ${
                    Hallucination() ? "normal" : "strange"} transparency.`);
            } else {
                await pline(`Suddenly you cannot see ${nambuf}.`);
                if (vis)
                    map_invisible(mtmp.mx, mtmp.my);
            }
            if (oseen)
                makeknown(otmp.otyp);
        } else if (vismon && !mtmp.minvis) {
            /* cursed potion; mon tried to make itself invisible but failed */
            await pline(`${Monnam(mtmp)} briefly seems to be transparent.`);
            /* we could call map_invisible() before the pline(), then
               newsym() after; unseen monster glyph would be visible during
               the pline, but hero would forget any remembered object under
               the monster */
        } else if (!vismon && canseemon(mtmp)) {
            /* cursed potion; this won't happen because a monster will only
               drink a potion of invisibility when not already invisible */
            await pline(`${Monnam(mtmp)} suddenly appears!`);
        }
        if (otmp.otyp === POT_INVISIBILITY) {
            if (otmp.cursed)
                await you_aggravate(mtmp);
            m_useup(mtmp, otmp);
        }
        return 2;
    }
    case MUSE_WAN_SPEED_MONSTER:
        if (!otmp)
            throw new Error(MissingMiscellaneousItem("wand of speed monster"));
        await mzapwand(mtmp, otmp, true);
        await mon_adjust_speed(mtmp, 1, otmp);
        return 2;
    case MUSE_POT_SPEED:
        if (!otmp)
            throw new Error(MissingMiscellaneousItem("potion of speed"));
        await mquaffmsg(mtmp, otmp);
        /* note difference in potion effect due to substantially
           different methods of maintaining speed ratings:
           player's character becomes "very fast" temporarily;
           monster becomes "one stage faster" permanently */
        await mon_adjust_speed(mtmp, 1, otmp);
        m_useup(mtmp, otmp);
        return 2;
    case MUSE_WAN_POLYMORPH:
        if (!otmp)
            throw new Error(MissingMiscellaneousItem("wand of polymorph"));
        await mzapwand(mtmp, otmp, true);
        await newcham(mtmp, muse_newcham_mon(mtmp),
                      NC_VIA_WAND_OR_SPELL | NC_SHOW_MSG);
        if (oseen)
            makeknown(WAN_POLYMORPH);
        return 2;
    case MUSE_POT_POLYMORPH:
        if (!otmp)
            throw new Error(MissingMiscellaneousItem("potion of polymorph"));
        await mquaffmsg(mtmp, otmp);
        m_useup(mtmp, otmp);
        if (vismon)
            await pline_mon(mtmp, `${Monnam(mtmp)} suddenly mutates!`);
        await newcham(mtmp, muse_newcham_mon(mtmp), NC_SHOW_MSG);
        if (oseen)
            makeknown(POT_POLYMORPH);
        return 2;
    case MUSE_POLY_TRAP: {
        t = t_at(game.trapx, game.trapy);
        const vistrapspot = cansee(t.tx, t.ty);
        if (vis || vistrapspot)
            seetrap(t);
        if (vismon || vistrapspot) {
            await pline_mon(mtmp, `${Some_Monnam(mtmp)} deliberately ${
                vtense("mon" /* fakename[0] */, locomotion(mtmp.data, "jump"))} onto a ${
                t.tseen ? trapname(t.ttyp, false) : "hidden trap"}!`);
            /* note: if mtmp is unseen because it is invisible, its new
               shape will also be invisible and could produce "Its armor
               falls off" messages during the transformation; those make
               more sense after we've given "Someone jumps onto a trap." */
        }

        /*  don't use rloc() due to worms */
        remove_monster(mtmp);
        newsym(mtmp.mx, mtmp.my);
        place_monster(mtmp, game.trapx, game.trapy);
        maybe_unhide_at(game.trapx, game.trapy);
        if (mtmp.wormno)
            worm_move(mtmp);
        newsym(game.trapx, game.trapy);

        await newcham(mtmp, null, NC_SHOW_MSG);
        return 2;
    }
    case MUSE_BAG:
        if (!otmp)
            throw new Error(MissingMiscellaneousItem("container"));
        return await mloot_container(mtmp, otmp, vismon);
    case MUSE_BULLWHIP:
        /* attempt to disarm hero */
        {
            const The_whip = vismon ? "The bullwhip" : "A whip";
            let where_to = rn2(4);
            let obj = game.uwep;
            let hand;

            if (!obj || !(await canletgo(obj, ""))
                || (u.twoweap && (await canletgo(game.uswapwep, "")) && rn2(2)))
                obj = game.uswapwep;
            if (!obj)
                break; /* shouldn't happen after find_misc() */

            const the_weapon = the(xname(obj));
            hand = body_part(HAND);
            if (bimanual(obj))
                hand = makeplural(hand);
            const hand_buf = hand;

            if (vismon)
                await pline_mon(mtmp, `${Monnam(mtmp)} flicks a bullwhip towards your ${
                    hand_buf}!`);
            if (obj.otyp === HEAVY_IRON_BALL) {
                await pline(`${The_whip} fails to wrap around ${the_weapon}.`);
                return 1;
            }
            await urgent_pline(`${The_whip} wraps around ${the_weapon} you're wielding!`);
            if (welded(obj)) {
                await pline(`${(obj.quan === 1) /* !is_plural(obj) */
                               ? "It is" : "They are"} welded to your ${hand_buf}${
                    !obj.bknown ? '!' : '.'}`);
                /* obj->bknown = 1; */ /* welded() takes care of this */
                where_to = 0;
            }
            if (!where_to) {
                await pline_The("whip slips free."); /* not `The_whip' */
                return 1;
            } else if (where_to === 3 && mon_hates_silver(mtmp)
                       && objects[obj.otyp].oc_material === SILVER) {
                /* this monster won't want to catch a silver
                   weapon; drop it at hero's feet instead */
                where_to = 2;
            }
            await remove_worn_item(obj, false);
            freeinv(obj);
            switch (where_to) {
            case 1: /* onto floor beneath mon */
                await pline_mon(mtmp, `${Monnam(mtmp)} yanks ${the_weapon} from your ${
                    hand_buf}!`);
                place_object(obj, mtmp.mx, mtmp.my);
                break;
            case 2: /* onto floor beneath you */
                await pline_mon(mtmp, `${Monnam(mtmp)} yanks ${the_weapon} to the ${
                    surface(u.ux, u.uy)}!`);
                await dropy(obj);
                break;
            case 3: /* into mon's inventory */

                await pline_mon(mtmp, `${Monnam(mtmp)} snatches ${the_weapon}!`);
                mpickobj(mtmp, obj);
                break;
            }
            return 1;
        }
        /*NOTREACHED*/
        return 0;
    case 0:
        return 0; /* i.e. an exploded wand */
    default:
        /* impossible("%s wanted to perform action %d?") */
        break;
    }
    return 0;
}

// C ref: muse.c you_aggravate()
async function you_aggravate(mtmp) {
    await pline(`For some reason, ${s_suffix(noit_mon_nam(mtmp))} presence is known to you.`);
    await cls_mu();
    /* cliparound(mtmp->mx, mtmp->my): CLIPPING isn't needed at 80x24 */
    show_glyph_mu(mtmp.mx, mtmp.my, mon_to_glyph_mu(mtmp, rn2_on_display_rng_mu));
    display_self_mu();
    await You_feel_mu(`aggravated at ${noit_mon_nam(mtmp)}.`);
    await tty_display_map_nhwindow_mu(true); /* display_nhwindow(WIN_MAP, TRUE) */
    await docrt_mu();
    if (unconscious_mu()) {
        game.multi = -1;
        game.nomovemsg = "Aggravated, you are jolted into full consciousness.";
    }
    newsym_mu(mtmp.mx, mtmp.my);
    if (!canspotmon_mu(mtmp))
        map_invisible_mu(mtmp.mx, mtmp.my);
}


// C ref: muse.c precheck()
/* Any preliminary checks which may result in the monster being unable to use
 * the item.  Returns 0 if nothing happened, 2 if the monster can't do
 * anything (i.e. it teleported) and 1 if it's dead.
 */
async function precheck(mon, obj) {
    if (!obj)
        return 0;
    const vis = cansee(mon.mx, mon.my);

    if (obj.oclass === POTION_CLASS) {
        const cc = { x: 0, y: 0 };
        const empty = "The potion turns out to be empty.";
        let mtmp;
        const mvitals = game.mvitals || [];
        /* C ref: hack.h POTION_OCCUPANT_CHANCE() */
        const POTION_OCCUPANT_CHANCE = (n) => 13 + 2 * n;

        if (objdescr_is(obj, "milky")) {
            if (!((mvitals[M.PM_GHOST]?.mvflags || 0) & G_GONE)
                && !rn2(POTION_OCCUPANT_CHANCE(mvitals[M.PM_GHOST]?.born || 0))) {
                if (!enexto(cc, mon.mx, mon.my, mons[M.PM_GHOST]))
                    return 0;
                await mquaffmsg(mon, obj);
                m_useup(mon, obj);
                mtmp = makemon(mons[M.PM_GHOST], cc.x, cc.y, MM_NOMSG);
                if (!mtmp) {
                    if (vis)
                        await pline(empty);
                } else {
                    if (vis) {
                        await pline(`As ${mon_nam(mon)} opens the bottle, an enormous ${
                            Hallucination() ? rndmonnam(null) : "ghost"} emerges!`);
                        await pline(`${Monnam(mon)} is frightened to death, and unable to move.`);
                    }
                    paralyze_monst(mon, 3);
                }
                return 2;
            }
        }
        if (objdescr_is(obj, "smoky")
            && !((mvitals[M.PM_DJINNI]?.mvflags || 0) & G_GONE)
            && !rn2(POTION_OCCUPANT_CHANCE(mvitals[M.PM_DJINNI]?.born || 0))) {
            if (!enexto(cc, mon.mx, mon.my, mons[M.PM_DJINNI]))
                return 0;
            await mquaffmsg(mon, obj);
            m_useup(mon, obj);
            mtmp = makemon(mons[M.PM_DJINNI], cc.x, cc.y, MM_NOMSG);
            if (!mtmp) {
                if (vis)
                    await pline(empty);
            } else {
                if (vis)
                    await pline_mon(mtmp, `In a cloud of smoke, ${a_monnam(mtmp)} emerges!`);
                await pline(`${vis ? Monnam(mtmp) : "Something"} speaks.`);
                /* I suspect few players will be upset that monsters */
                /* can't wish for wands of death here.... */
                /* SetVoice(mtmp, 0, 80, 0): speech output only */
                if (rn2(2)) {
                    await verbalize("You freed me!");
                    mtmp.mpeaceful = 1;
                    set_malign(mtmp);
                } else {
                    await verbalize("It is about time.");
                    if (vis)
                        await pline(`${Monnam(mtmp)} vanishes.`);
                    mongone(mtmp);
                }
            }
            return 2;
        }
    }
    if (obj.oclass === WAND_CLASS && obj.cursed
        && !rn2(WAND_BACKFIRE_CHANCE)) {
        const dam = d(obj.spe + 2, 6);

        /* 3.6.1: no Deaf filter; 'if' message doesn't warrant it, 'else'
           message doesn't need it since You_hear() has one of its own */
        if (vis) {

            await pline_mon(mon, `${Monnam(mon)} zaps ${an(xname(obj))}, which suddenly explodes!`);
        } else {
            /* same near/far threshold as mzapwand() */
            const range = couldsee(mon.mx, mon.my) /* 9 or 5 */
                          ? (BOLT_LIM + 1) : (BOLT_LIM - 3);

            /* Soundeffect(se_zap_then_explosion, 100) */
            await You_hear(`a zap and an explosion ${
                (mdistu(mon) <= range * range) ? "nearby" : "in the distance"}.`);
        }
        m_useup(mon, obj);
        mon.mhp -= dam;
        if (DEADMONSTER(mon)) {
            await monkilled(mon, "", M.AD_RBRE);
            return 1;
        }
        game.m_has_defense = game.m_has_offense = game.m_has_misc = 0;
        /* Only one needed to be set to 0 but the others are harmless */
    }
    return 0;
}


// C ref: muse.c mzapwand()
/* when a monster zaps a wand give a message, deduct a charge, and if it
   isn't directly seen, remove hero's memory of the number of charges */
async function mzapwand(mtmp, otmp, self) {
    if (otmp.spe < 1) {
        /* impossible("Mon zapping wand with %d charges?", otmp->spe) */
        return;
    }
    if (!canseemon(mtmp)) {
        const range = couldsee(mtmp.mx, mtmp.my) /* 9 or 5 */
                      ? (BOLT_LIM + 1) : (BOLT_LIM - 3);

        /* Soundeffect(se_zap, 100) */
        await You_hear(`a ${(mdistu(mtmp) <= range * range)
                            ? "nearby" : "distant"} zap.`);
        unknow_object(otmp); /* hero loses info when unseen obj is used */
    } else if (self) {
        await pline(`${monverbself(mtmp, Monnam(mtmp), "zap", null)} with ${
            doname(otmp)}!`);
    } else {
        await pline_mon(mtmp, `${Monnam(mtmp)} zaps ${an(xname(otmp))}!`);
        await stop_occupation();
    }
    otmp.spe -= 1;
}

// C ref: muse.c mplayhorn()
/* similar to mzapwand() but for magical horns (only instrument mons play) */
async function mplayhorn(mtmp, otmp, self) {
    let objnamp;

    if (!canseemon(mtmp)) {
        const range = couldsee(mtmp.mx, mtmp.my) /* 9 or 5 */
                      ? (BOLT_LIM + 1) : (BOLT_LIM - 3);

        /* Soundeffect(se_horn_being_played, 50) */
        await You_hear(`a horn being played ${(mdistu(mtmp) <= range * range)
                                              ? "nearby" : "in the distance"}.`);
        unknow_object(otmp); /* hero loses info when unseen obj is used */
    } else if (self) {
        observe_object(otmp, Hallucination());
        objnamp = xname(otmp);
        if (objnamp.length >= QBUFSZ)
            objnamp = simpleonames(otmp);
        const objbuf = `a ${objnamp} directed at`;
        /* "<mon> plays a <horn> directed at himself!" */
        await pline(`${monverbself(mtmp, Monnam(mtmp), "play", objbuf)}!`);
        makeknown(otmp.otyp); /* (wands handle this slightly differently) */
    } else {
        observe_object(otmp, Hallucination());
        objnamp = xname(otmp);
        if (objnamp.length >= QBUFSZ)
            objnamp = simpleonames(otmp);
        await pline(`${Monnam(mtmp)} plays ${an(objnamp)} directed at you!`);
        makeknown(otmp.otyp);
        await stop_occupation();
    }
    otmp.spe -= 1; /* use a charge */
}

// C ref: muse.c mreadmsg()
/* see or hear a monster reading a scroll;
   when scroll hasn't been seen, its label is revealed unless hero is deaf */
async function mreadmsg(mtmp, otmp) {
    const vismon = canseemon(mtmp);
    let tpindicator = (!vismon && sensemon(mtmp));

    if (!vismon && Deaf())
        return; /* no feedback */

    observe_object(otmp, Hallucination()); /* seeing/hearing scroll read
                                               reveals its label */
    const onambuf = singular(otmp, vismon ? doname : ansimpleoname);

    if (vismon) {
        /* directly see the monster reading the scroll */
        await pline_mon(mtmp, `${Monnam(mtmp)} reads ${onambuf}!`);
    } else { /* !Deaf, otherwise we wouldn't reach here */
        const similar = same_race(game.youmonst.data, mtmp.data),
            uniqmon = ((mtmp.data.geno & G_UNIQ) !== 0
                       /* shopkeepers aren't unique monsters but since
                          they have distinct names, treat them as such */
                       || !!mtmp.isshk),
            recognize = (!Hallucination()
                         && (mtmp.meverseen || (similar && !uniqmon)));
        /* describe unseen monster accurately when not hallucinating if it
           has ever been seen or is the same race as the hero (not yet seen
           unique monsters excepted) */
        const mflags = (SUPPRESS_INVISIBLE | SUPPRESS_SADDLE
                        | (recognize ? SUPPRESS_IT : AUGMENT_IT));

        if (sensemon(mtmp)) {
            tpindicator = true;
        } else if (couldsee(mtmp.mx, mtmp.my) && mdistu(mtmp) <= 10 * 10) {
            /* monster can't be seen or sensed; hero might be blind or monster
               might be at a spot that isn't in view or might be invisible;
               remember it if the spot is within line of sight and relatively
               close */
            map_invisible(mtmp.mx, mtmp.my);
        }

        let blindbuf = `reading ${onambuf}`;
        blindbuf = strsubst(blindbuf, "reading a scroll labeled",
                            mtmp.mconf ? "attempting to incant" : "incant");
        await You_hear(`${x_monnam(mtmp, ARTICLE_A, null, mflags, false)} ${
            blindbuf}.`);
        if (tpindicator) {
            /* flash_mon(mtmp): transient display only (the monster's glyph
               blinks and is restored) */
        }
    }
    if (mtmp.mconf) /* (note: won't get if not seen and hero can't hear) */
        await pline(`Being confused, ${vismon ? mon_nam(mtmp) : mhe(mtmp)
                    } mispronounces the magic words...`);
}

// C ref: muse.c mquaffmsg()
async function mquaffmsg(mtmp, otmp) {
    if (canseemon(mtmp)) {
        observe_object(otmp, Hallucination());

        await pline_mon(mtmp, `${Monnam(mtmp)} drinks ${singular(otmp, doname)}!`);
    } else if (!Deaf()) {
        /* Soundeffect(se_mon_chugging_potion, 25) */
        await You_hear("a chugging sound.");
    }
}

// C ref: muse.c m_tele()
async function m_tele(
    mtmp,   /* monst that might be teleported */
    vismon, /* can see it */
    oseen,  /* have seen the object that triggered this */
    how)    /* type of that object */
{
    if (await tele_restrict(mtmp)) { /* mysterious force... */
        if (vismon && how)     /* mentions 'teleport' */
            makeknown(how);
        /* monster learns that teleportation isn't useful here */
        if (noteleport_level(mtmp))
            mon_learns_traps(mtmp, TELEP_TRAP);
    } else if ((mon_has_amulet(mtmp) || On_W_tower_level(game.u.uz))
               && !rn2(3)) {
        if (vismon)
            await pline_mon(mtmp, `${Monnam(mtmp)} seems disoriented for a moment.`);
    } else {
        /* teleport monster 'mtmp' */
        if (how) {
            /* teleporation has been triggered by an object */
            if (oseen)
                makeknown(how);
            await rloc(mtmp, RLOC_MSG);
        } else {
            /* monster is voluntarily entering a teleporation trap; use the
               trap instead of rloc() in case it sends 'victim' to a vault */
            mtmp.mx = game.trapx, mtmp.my = game.trapy;
            await mintrap(mtmp, FORCETRAP);
        }
    }
}

// C ref: muse.c m_next2m()
/* return TRUE if monster mtmp has another monster next to it.
 * Called from find_defensive() where it is limited to Is_knox()
 * only, otherwise you could trap two monsters next to each other
 * in a boulder fort, and they would be happy to stay in there. */
function m_next2m(mtmp) {
    let m2;

    if (DEADMONSTER(mtmp) || mtmp.mstate) /* mon_offmap() */
        return false;

    for (let x = mtmp.mx - 1; x <= mtmp.mx + 1; x++)
        for (let y = mtmp.my - 1; y <= mtmp.my + 1; y++) {
            if (!isok(x, y))
                continue;
            if ((m2 = m_at(x, y)) && m2 !== mtmp)
                return true;
        }
    return false;
}

// C ref: muse.c reveal_trap()
/* when a monster deliberately enters a trap, make sure the spot becomes
   accessible (trap doors and teleporters inside niches are located at
   secret corridor locations; convert such into normal corridor even if
   hero doesn't see it happen) */
function reveal_trap(t, seeit) {
    const lev = game.level.at(t.tx, t.ty);

    if (lev.typ === SCORR) {
        lev.typ = CORR, lev.flags = 0; /* set_levltyp(,,CORR) */
        unblock_point(t.tx, t.ty);
    }
    if (seeit)
        seetrap(t);
}

// C ref: muse.c mon_escape()
/* Monsters without the Amulet escape the dungeon and
 * are gone for good when they leave up the up stairs.
 * A monster with the Amulet would leave it behind
 * (mongone -> mdrop_special_objs) but we force any
 * monster who manages to acquire it or the invocation
 * tools to stick around instead of letting it escape.
 * Don't let the Wizard escape even when not carrying
 * anything of interest unless there are more than 1
 * of him.
 */
async function mon_escape(mtmp, vismon) {
    if (mon_has_special(mtmp)
        || (mtmp.iswiz && (game.context.no_of_wizards || 0) < 2))
        return 0;
    if (vismon)
        await pline_mon(mtmp, `${Monnam(mtmp)} escapes the dungeon!`);
    mongone(mtmp);
    return 2;
}

// C ref: muse.c mbhitm()
/* Perform an offensive action for a monster.  Must be called immediately
 * after find_offensive().  Return values are same as use_defensive().
 */
async function mbhitm(mtmp, otmp) {
    const u = game.u;
    let tmp;
    let reveal_invis = false, learnit = false;
    const hits_you = (mtmp === game.youmonst);

    if (!hits_you && otmp.otyp !== WAN_UNDEAD_TURNING) {
        mtmp.msleeping = 0;
        if (mtmp.m_ap_type)
            seemimic(mtmp);
    }
    switch (otmp.otyp) {
    case WAN_STRIKING:
        reveal_invis = true;
        if (hits_you) {
            if (Antimagic()) {
                monstseesu(M_SEEN_MAGR); /* monsters notice hero resisting */
                await shieldeff(game.u.ux, game.u.uy);
                /* Soundeffect(se_boing, 40) */
                await pline("Boing!");
                learnit = true;
            } else if (rnd(20) < 10 + u.uac
                       && !(game.buzzer && !game.buzzer.mwandexp)) {
                monstunseesu(M_SEEN_MAGR); /* mons see hero not resisting */
                await pline_The("wand hits you!");
                tmp = d(2, 12);
                if (Half_spell_damage())
                    tmp = Math.trunc((tmp + 1) / 2);
                await losehp(tmp, "wand", KILLED_BY_AN);
                learnit = true;
            } else {
                await pline_The("wand misses you.");
            }
            await stop_occupation();
            nomul(0);
        } else if (resists_magm(mtmp)) {
            await shieldeff(mtmp.mx, mtmp.my);
            /* Soundeffect(se_boing, 40) */
            await pline("Boing!");
            learnit = true;
        } else if (rnd(20) < 10 + find_mac(mtmp)) {
            tmp = d(2, 12);
            await hit("wand", mtmp, exclam(tmp));
            await resist_async(mtmp, otmp.oclass, tmp, TELL);
            learnit = true;
        } else {
            await miss("wand", mtmp);
        }
        /* need to see the wand being zapped and also the spot where the
           target is hit; don't have to see the target itself though */
        if (learnit && game.zap_oseen && (hits_you
                                          || cansee(mtmp.mx, mtmp.my)))
            makeknown(WAN_STRIKING);
        break;
    case WAN_TELEPORTATION:
        if (hits_you) {
            await tele();
            if (game.zap_oseen)
                makeknown(WAN_TELEPORTATION);
        } else {
            /* for consistency with zap.c, don't identify */
            if (mtmp.ispriest && in_rooms(mtmp.mx, mtmp.my, TEMPLE).length) {
                if (cansee(mtmp.mx, mtmp.my))
                    await pline_mon(mtmp, `${Monnam(mtmp)} resists the magic!`);
            } else if (!(await tele_restrict(mtmp)))
                await rloc(mtmp, RLOC_MSG);
        }
        break;
    case WAN_CANCELLATION:
    case SPE_CANCELLATION:
        await cancel_monst(mtmp, otmp, false, true, false);
        break;
    case WAN_UNDEAD_TURNING:
        if (hits_you)
            throw new Error('mbhitm(): unturn_you() not ported yet');
        else
            throw new Error('mbhitm(): unturn_dead() not ported yet');
    default:
        break;
    }
    if (reveal_invis && !(mtmp.mhp < 1)
        && cansee(game.bhitpos.x, game.bhitpos.y) && !canspotmon(mtmp))
        map_invisible(game.bhitpos.x, game.bhitpos.y);

    return 0;
}

// C ref: muse.c fhito_loc()
/* hit all objects at x,y with fhito function */
async function fhito_loc(obj, tx, ty, fhito) {
    let hitanything = 0;
    /* svl.level.objects[tx][ty] chain, top of the pile first */
    const pile = level_objects_at(tx, ty);

    if (!fhito || !pile.length)
        return false;

    /* next_obj = otmp->nexthere is taken before each call, so iterate
       over a snapshot of the pile */
    for (const otmp of pile) {
        if (otmp.where !== 'OBJ_FLOOR' || otmp.ox !== tx || otmp.oy !== ty)
            continue;
        hitanything += await fhito(otmp, obj);
    }

    return hitanything ? true : false;
}

// C ref: muse.c mbhit()
/* A modified bhit() for monsters.  Based on bhit() in zap.c.  Unlike
 * buzz(), bhit() doesn't take into account the possibility of a monster
 * zapping you, so we need a special function for it.
 */
async function mbhit(
    mon,      /* monster shooting the wand */
    range,    /* direction and range */
    fhitm,    /* must be non-Null */
    fhito,    /* fns called when mon/obj hit */
    obj) {    /* 2nd arg to fhitm/fhito */
    let mtmp;
    let ltyp;
    let db; /* <dbx,dby>, from find_drawbridge() */
    const otyp = obj.otyp;

    game.bhitpos = { x: mon.mx, y: mon.my };
    const ddx = sgn(mon.mux - mon.mx);
    const ddy = sgn(mon.muy - mon.my);

    while (range-- > 0) {
        game.bhitpos.x += ddx;
        game.bhitpos.y += ddy;
        const x = game.bhitpos.x;
        const y = game.bhitpos.y;

        if (!isok(x, y)) {
            game.bhitpos.x -= ddx;
            game.bhitpos.y -= ddy;
            break;
        }
        if (u_at(game.bhitpos.x, game.bhitpos.y)) {
            await fhitm(game.youmonst, obj);
            range -= 3;
        } else if ((mtmp = m_at(game.bhitpos.x, game.bhitpos.y)) != null) {
            if (cansee(game.bhitpos.x, game.bhitpos.y) && !canspotmon(mtmp))
                map_invisible(game.bhitpos.x, game.bhitpos.y);
            await fhitm(mtmp, obj);
            range -= 3;
        }
        if (await fhito_loc(obj, game.bhitpos.x, game.bhitpos.y, fhito))
            range--;
        ltyp = game.level.at(game.bhitpos.x, game.bhitpos.y).typ;
        if (otyp === WAN_STRIKING
            /* if levl[x][y].typ is DRAWBRIDGE_UP then the zap is passing
               over the moat in front of a closed drawbridge and doesn't
               hit any part of the bridge's mechanism (yet; it might be
               about to hit the closed portcullis on the next iteration) */
            && ltyp !== DRAWBRIDGE_UP && (db = find_drawbridge(x, y))) {
            /* this might kill mon and destroy obj but they'll remain
               accessible; (*fhitm)() and (*fhito)() use obj for zap type */
            await destroy_drawbridge(db.x, db.y);
        } else if (IS_DOOR(ltyp) || ltyp === SDOOR) {
            switch (otyp) {
            /* note: monsters don't use opening or locking magic
               at present, but keep these as placeholders */
            case WAN_OPENING:
            case WAN_LOCKING:
            case WAN_STRIKING:
                if (await doorlock(obj, game.bhitpos.x, game.bhitpos.y)) {
                    if (game.zap_oseen)
                        makeknown(otyp);
                    /* if a shop door gets broken, add it to
                       the shk's fix list (no cost to player) */
                    if (game.level.at(game.bhitpos.x, game.bhitpos.y).doormask
                            === D_BROKEN
                        && in_rooms(game.bhitpos.x, game.bhitpos.y,
                                    SHOPBASE).length)
                        add_damage(game.bhitpos.x, game.bhitpos.y, 0);
                }
                break;
            }
        }
        if (!ZAP_POS(ltyp)
            || (IS_DOOR(ltyp)
                && ((game.level.at(game.bhitpos.x, game.bhitpos.y).doormask || 0)
                    & (D_LOCKED | D_CLOSED)))) {
            game.bhitpos.x -= ddx;
            game.bhitpos.y -= ddy;
            break;
        }
    }
}

// C ref: muse.c buzz_force_miss()
async function buzz_force_miss(type, nd, sx, sy, dx, dy) {
    await dobuzz(type, nd, sx, sy, dx, dy, true, false, true);
}

// C ref: muse.c use_offensive()
/* Perform an offensive action for a monster.  Must be called immediately
 * after find_offensive().  Return values are same as use_defensive().
 */
export async function use_offensive(mtmp) {
    let i;
    const otmp = game.m_offensive;

    /* if a monster has never used an attack wand before, it takes them some
       time to get used to holding that much power, so the first shot always
       misses */
    const buzzfn = mtmp.mwandexp ? buzz : buzz_force_miss;

    /* offensive potions are not drunk, they're thrown */
    if (otmp.oclass !== POTION_CLASS && (i = await precheck(mtmp, otmp)) !== 0)
        return i;
    const oseen = canseemon(mtmp);

    switch (game.m_has_offense) {
    case MUSE_WAN_DEATH:
    case MUSE_WAN_SLEEP:
    case MUSE_WAN_FIRE:
    case MUSE_WAN_COLD:
    case MUSE_WAN_LIGHTNING:
    case MUSE_WAN_MAGIC_MISSILE:
        await mzapwand(mtmp, otmp, false);
        if (oseen)
            makeknown(otmp.otyp);
        game.m_using = true;
        game.current_wand = otmp;
        game.buzzer = mtmp;
        /* BZ_M_WAND(BZ_OFS_WAN(otmp->otyp)) */
        await buzzfn(-30 - (Math.abs(otmp.otyp - WAN_MAGIC_MISSILE) % 10),
                     (otmp.otyp === WAN_MAGIC_MISSILE) ? 2 : 6, mtmp.mx, mtmp.my,
                     sgn(mtmp.mux - mtmp.mx), sgn(mtmp.muy - mtmp.my));
        game.buzzer = null;
        game.current_wand = null;
        game.m_using = false;
        mtmp.mwandexp = true;
        return (mtmp.mhp < 1) ? 1 : 2;
    case MUSE_FIRE_HORN:
    case MUSE_FROST_HORN:
        await mplayhorn(mtmp, otmp, false);
        game.m_using = true;
        game.buzzer = mtmp;
        game.current_wand = otmp; /* needed by zhitu() */
        /* BZ_M_WAND(BZ_OFS_AD(AD_COLD or AD_FIRE)) */
        await buzzfn(-30 - (Math.abs(((otmp.otyp === FROST_HORN) ? M.AD_COLD
                                                                 : M.AD_FIRE)
                                     - M.AD_MAGM) % 10),
                     rn1(6, 6), mtmp.mx, mtmp.my, sgn(mtmp.mux - mtmp.mx),
                     sgn(mtmp.muy - mtmp.my));
        game.buzzer = null;
        game.current_wand = null;
        game.m_using = false;
        mtmp.mwandexp = true;
        return (mtmp.mhp < 1) ? 1 : 2;
    case MUSE_WAN_TELEPORTATION:
    case MUSE_WAN_UNDEAD_TURNING:
    case MUSE_WAN_STRIKING:
        game.zap_oseen = oseen;
        await mzapwand(mtmp, otmp, false);
        game.m_using = true;
        game.buzzer = mtmp;
        await mbhit(mtmp, rn1(8, 6), mbhitm, bhito, otmp);
        game.buzzer = null;
        /* note: 'otmp' might have been destroyed (drawbridge destruction) */
        game.m_using = false;
        if (game.m_has_offense === MUSE_WAN_STRIKING)
            mtmp.mwandexp = true;
        return 2;
    case MUSE_SCR_EARTH:
        throw new Error('use_offensive(): scroll of earth not ported yet');
    case MUSE_CAMERA:
        throw new Error('use_offensive(): expensive camera not ported yet');
    case MUSE_POT_PARALYSIS:
    case MUSE_POT_BLINDNESS:
    case MUSE_POT_CONFUSION:
    case MUSE_POT_SLEEPING:
    case MUSE_POT_ACID:
        /* Note: this setting of dknown doesn't suffice.  A monster
         * which is out of sight might throw and it hits something _in_
         * sight, a problem not existing with wands because wand rays
         * are not objects.  Also set dknown in mthrowu.c.
         */
        if (cansee(mtmp.mx, mtmp.my)) {
            observe_object(otmp, Hallucination());
            await pline_mon(mtmp, `${Monnam(mtmp)} hurls ${singular(otmp, doname)}!`);
        }
        await m_throw(mtmp, mtmp.mx, mtmp.my, sgn(mtmp.mux - mtmp.mx),
                      sgn(mtmp.muy - mtmp.my),
                      distmin(mtmp.mx, mtmp.my, mtmp.mux, mtmp.muy), otmp);
        return 2;
    case 0:
        return 0; /* i.e. an exploded wand */
    default:
        /* impossible("%s wanted to perform action %d?") */
        break;
    }
    return 0;
}

void m_next2u; void mon_knows_traps;

// C ref: muse.c mcureblindness() -- cure mon's blindness (use_defensive,
// dog_eat, meatobj)
export async function mcureblindness(mon, verbos) {
    if (!mon.mcansee) {
        mon.mcansee = 1;
        mon.mblinded = 0;
        if (verbos && haseyes(mon.data))
            await pline_mon(mon, `${Monnam(mon)} can see again.`);
    }
}
