// muse.js — monsters using items.
// C ref: src/muse.c
//
// This includes offensive and miscellaneous item use plus the healing-potion
// subset of defensive item use. The remaining defensive actions are still
// absent.
//
// gm.m (the muse selection struct) is game.m here; find_offensive() resets
// the offensive slice at its head exactly as C does.

import { doorlock } from './lock.js';
import { unturn_dead } from './zap.js';
import { is_bat } from './makemon.js';
import { mon_learns_traps, fill_pit, mintrap, seetrap, Trap_Killed_Mon } from './trap.js';
import { upstart } from './do_name.js';
import { slimeproof } from './dog.js';
import { mhe } from './do_name.js';
import { MM_NOMSG, NO_MM_FLAGS, BOLT_LIM, QBUFSZ, FIRE_TRAP, PIT, HOLE, WEB, BEAR_TRAP, STAIRS, LADDER, SCORR, CORR, SDOOR, DRAWBRIDGE_UP, IS_FURNITURE, IS_DRAWBRIDGE, IS_OBSTRUCTED, IS_AIR, D_BROKEN, SHOPBASE, TEMPLE, W_NONDIGGABLE, FORCETRAP, FORCEBUNGLE, RLOC_MSG, TIMEOUT, TELL, NOTELL, EXPL_FIERY, OBJ_FLOOR, OBJ_AT, is_hole, is_pit, Is_knox_level, Is_botlevel, In_V_tower, NH_GREEN, BZ_OFS_AD } from './const.js';
import { MFLAGS } from './monst_data.js';
import { CLR_GREEN, CLR_BRIGHT_GREEN } from './terminal.js';
import { dog_nutrition } from './dog.js';
import { Inhell } from './makemon.js';
import { closed_door } from './cmd.js';
import { drop_boulder_on_monster, drop_boulder_on_player } from './read.js';
import { begin_burn } from './timeout.js';
import { explode } from './explode.js';
import { awaken_soldiers } from './music.js';
import { unblock_point, recalc_block_point } from './vision.js';
import { maketrap } from './mklev.js';
import { is_drawbridge_wall, is_ice } from './dbridge.js';
import { inhishop } from './monmove.js';
import { migrate_to_level } from './dog.js';
import { On_W_tower_level, depth, get_level, ledger_no, Can_dig_down, Can_fall_thru, surface, ceiling, dunlev, dunlevs_in_dungeon } from './dungeon.js';
import { any_quest_artifact } from './questpgr.js';
import { mon_has_amulet } from './wizard.js';
import { trapname } from './detect.js';
import { trycall } from './do_name.js';
import { obfree } from './invent.js';
import { unknow_object, splitobj, bcsign, unbless } from './mkobj.js';
import { add_damage } from './shk.js';
import { find_mac, extract_from_minvent } from './worn.js';
import { Antimagic, Hallucination, Deaf, Blind, Unaware } from './youprop.js';
import { losehp, nomul, in_rooms, NODIAG } from './hack.js';
import { stop_occupation } from './allmain.js';
import { monstseesu, monstunseesu, resists_magm, is_undead, nonliving, is_flyer, poly_when_stoned, touch_petrifies, attacktype_fordmg, is_unicorn, mhim } from './mondata.js';
import { mon_offmap, is_vampshifter } from './monst.js';
import { mongone, monkilled, healmon, mcureblindness, m_next2u, m_carrying, seemimic, wakeup, is_pool, is_lava, maybe_unhide_at } from './mon.js';
import { paralyze_monst, make_blinded } from './potion.js';
import { m_useup, unturn_you, bhito, dobuzz, buzz, cancel_monst, lightdamage, resist, exclam, hit, miss, zhitm } from './zap.js';
import { makemon, is_mercenary, place_monster, remove_monster, set_malign } from './makemon.js';
import { enexto, tele_restrict, random_teleport_level, rloc, tele } from './teleport.js';
import { objdescr_is, observe_object, makeknown } from './o_init.js';
import { xname, an, doname, simpleonames, ansimpleoname, singular, distant_name, vtense } from './objnam.js';
import { Monnam, mon_nam, a_monnam, rndmonnam, monverbself, hcolor } from './do_name.js';
import { pline_mon, pline_The, You, You_hear, verbalize } from './pline.js';
import { canseemon, canspotmon, pline, newsym, shieldeff, map_invisible } from './display.js';
import { cansee, couldsee } from './vision.js';
import { game } from './gstate.js';
import { rn2, rn1, rnd, d, rn2_on_display_rng } from './rng.js';
import { sgn, dist2, distmin, s_suffix } from './hacklib.js';
import { OCLASSES, ONAMES, MATERIALS } from './objects_data.js';
import { ATTKS, MONSYMS, PMNAMES, NUMMONS } from './monst_data.js';
import { is_animal, mindless, nohands, dmgtype, can_blow, amorphous,
         passes_walls, noncorporeal, unsolid, haseyes, hates_light,
         resists_blnd, attacktype, verysmall, throws_rocks,
         is_floater, locomotion, pronoun_gender, acidic, flaming,
         resists_acid, resists_ston } from './mondata.js';
import { in_your_sanctuary, lined_up, monnear, onscary, mon_knows_traps,
         mon_would_take_item, accessible, monflee, mdistu } from './monmove.js';
import { which_armor, mon_adjust_speed } from './worn.js';
import { hard_helmet } from './do_wear.js';
import { noteleport_level } from './teleport.js';
import { stairway_at } from './stairs.js';
import { carrying, sobj_at, obj_extract_self, weight } from './invent.js';
import { m_at, t_at, can_carry, mondead, xkilled } from './mon.js';
import { linedup_callback, m_throw } from './mthrowu.js';
import { Teleport_control, See_invisible } from './youprop.js';
import { xytodir, dirtocoord } from './cmd.js';
import { isok, W_ARMH, M_SEEN_REFL, M_SEEN_MAGR, M_SEEN_SLEEP, M_SEEN_FIRE,
         M_SEEN_COLD, M_SEEN_ELEC, M_SEEN_ACID, TELEP_TRAP, N_DIRS,
         Is_rogue_level, In_endgame, Is_earthlevel, W_ARM, W_ARMS, W_ARMF,
         W_AMUL, W_WEP, MSLOW, MFAST, NON_PM, NORMAL_SPEED, FAST,
         P_DAGGER, P_KNIFE, XKILL_NOMSG, XKILL_NOCONDUCT,
         POLY_TRAP, u_at, KILLED_BY_AN, ZAP_POS, IS_DOOR, D_LOCKED,
         D_CLOSED, G_GONE, ARTICLE_A, SUPPRESS_INVISIBLE,
         SUPPRESS_SADDLE, SUPPRESS_IT, AUGMENT_IT, G_UNIQ,
         NC_SHOW_MSG, NC_VIA_WAND_OR_SPELL, PRONOUN_HALLU,
         STRAT_WAITFORU,
         MIGR_STAIRS_UP, MIGR_STAIRS_DOWN, MIGR_LADDER_UP,
         MIGR_LADDER_DOWN, MIGR_SSTAIRS, MIGR_RANDOM } from './const.js';
import { Is_container, Has_contents, bimanual, is_plural } from './obj.js';
import { DEADMONSTER, helpless, MON_WEP } from './monst.js';
import { canletgo } from './do.js';
import { def_monsyms } from './drawing_data.js';
import { genders as genders_tbl } from './role_data.js';

// src/muse.c:1272 — the offensive MUSE_* selection codes.
const MUSE_WAN_DEATH = 1;
const MUSE_WAN_SLEEP = 2;
const MUSE_WAN_FIRE = 3;
const MUSE_WAN_COLD = 4;
const MUSE_WAN_LIGHTNING = 5;
const MUSE_WAN_MAGIC_MISSILE = 6;
const MUSE_WAN_STRIKING = 7;
const MUSE_POT_PARALYSIS = 9;
const MUSE_POT_BLINDNESS = 10;
const MUSE_POT_CONFUSION = 11;
const MUSE_FROST_HORN = 12;
const MUSE_FIRE_HORN = 13;
const MUSE_POT_ACID = 14;
const MUSE_WAN_TELEPORTATION = 15;
const MUSE_POT_SLEEPING = 16;
const MUSE_SCR_EARTH = 17;
const MUSE_CAMERA = 18;
const MUSE_WAN_UNDEAD_TURNING = 20; /* shared with the defensive list */

// src/muse.c:310 defensive item selection codes used below.
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
const MUSE_BUGLE = 16;
const MUSE_UNICORN_HORN = 17;
const MUSE_POT_FULL_HEALING = 18;
const MUSE_LIZARD_CORPSE = 19;

// src/muse.c:2084 miscellaneous item selection codes.
export const MUSE_POT_GAIN_LEVEL = 1;
export const MUSE_WAN_MAKE_INVISIBLE = 2;
export const MUSE_POT_INVISIBILITY = 3;
export const MUSE_POLY_TRAP = 4;
export const MUSE_WAN_POLYMORPH = 5;
export const MUSE_POT_SPEED = 6;
export const MUSE_WAN_SPEED_MONSTER = 7;
export const MUSE_BULLWHIP = 8;
export const MUSE_POT_POLYMORPH = 9;
export const MUSE_BAG = 10;

// include/monst.h:89 m_seenres()
const m_seenres = (mon, mask) => ((mon.seen_resistance ?? 0) & mask);

// src/muse.c:2797 mon_reflects(), monster equipment and innate reflection.
export async function mon_reflects(mon, fmt = null) {
    let source = null;
    let identify = 0;
    let orefl = which_armor(mon, W_ARMS);

    if (orefl?.otyp === ONAMES.SHIELD_OF_REFLECTION) {
        source = 'shield';
        identify = ONAMES.SHIELD_OF_REFLECTION;
    } else {
        const weapon = MON_WEP(mon);
        if (weapon) {
            const { get_artifact } = await import('./artifact.js');
            if (((get_artifact(weapon)?.spfx ?? 0) & 0x04000000) !== 0)
                source = 'weapon';
        }
    }
    if (!source) {
        orefl = which_armor(mon, W_AMUL);
        if (orefl?.otyp === ONAMES.AMULET_OF_REFLECTION) {
            source = 'amulet';
            identify = ONAMES.AMULET_OF_REFLECTION;
        }
    }
    if (!source) {
        orefl = which_armor(mon, W_ARM);
        if (orefl?.otyp === ONAMES.SILVER_DRAGON_SCALES
            || orefl?.otyp === ONAMES.SILVER_DRAGON_SCALE_MAIL)
            source = 'armor';
    }
    if (!source && (mon.mnum === PMNAMES.PM_SILVER_DRAGON
                    || mon.mnum === PMNAMES.PM_CHROMATIC_DRAGON))
        source = 'scales';
    if (!source)
        return false;

    if (fmt !== null) {
        const [{ pline }, { mon_nam }, { makeknown }] = await Promise.all([
            import('./display.js'), import('./do_name.js'),
            import('./o_init.js'),
        ]);
        const message = fmt.replace('%s', s_suffix(mon_nam(mon)))
                           .replace('%s', source);
        await pline(message);
        if (identify)
            makeknown(identify);
    }
    return true;
}

// src/muse.c:2985 cures_stoning(), the inventory predicate shared by
// munstone() and monster item selection. A green slime glob only helps a
// creature that cannot itself be slimed; tins additionally need an opener.
export function cures_stoning(mon, obj, tinok) {
    if (obj.otyp === ONAMES.POT_ACID)
        return true;
    if (obj.otyp === ONAMES.GLOB_OF_GREEN_SLIME) {
        const ptr = game.mons[mon.mnum];
        return ptr.pmidx === PMNAMES.PM_GREEN_SLIME
            || flaming(ptr) || noncorporeal(ptr);
    }
    if (obj.otyp !== ONAMES.CORPSE
        && (obj.otyp !== ONAMES.TIN || !tinok))
        return false;
    if (obj.corpsenm === NON_PM)
        return false;
    return obj.corpsenm === PMNAMES.PM_LIZARD
        || acidic(game.mons[obj.corpsenm]);
}

// src/muse.c:3001 mcould_eat_tin(). Unlike the hero, a monster may use an
// unwielded opener, dagger, or knife. A cursed wielded weapon blocks access to
// every other tool in its inventory.
export function mcould_eat_tin(mon) {
    if (is_animal(game.mons[mon.mnum]))
        return false;

    const mwep = MON_WEP(mon);
    const welded = !!(mwep && mwep.cursed && (mwep.owornmask & W_WEP));
    for (const obj of mon.minvent || []) {
        if (welded && obj !== mwep)
            continue;
        if (obj.otyp === ONAMES.TIN_OPENER
            || (obj.oclass === OCLASSES.WEAPON_CLASS
                && (game.objects[obj.otyp]?.oc_skill === P_DAGGER
                    || game.objects[obj.otyp]?.oc_skill === P_KNIFE)))
            return true;
    }
    return false;
}

function m_useup_unstone(mon, obj) {
    if ((obj.quan ?? 1) > 1) {
        obj.quan--;
        obj.owt = weight(obj);
    } else {
        obj_extract_self(obj);
    }
}

// src/muse.c:2884 munstone() and mon_consume_unstone(). Returns true once a
// cure was consumed, even when its acid damage kills the monster.
export async function munstone(mon, by_you) {
    let obj;
    const tinok = mcould_eat_tin(mon);

    if (resists_ston(mon) || mon.meating || helpless(mon))
        return false;
    mon.mstrategy = (mon.mstrategy | 0) & ~STRAT_WAITFORU;

    for (obj of (mon.minvent || [])) {
        if (cures_stoning(mon, obj, tinok)) {
            await mon_consume_unstone(mon, obj, by_you, true);
            return true;
        }
    }
    return false;
}

// src/muse.c:2906 mon_consume_unstone(), a monster eats or quaffs the
// cure (stoning: stop petrification; else cure stun and confusion).
async function mon_consume_unstone(mon, obj, by_you, stoning) {
    const vis = canseemon(mon), tinned = obj.otyp === ONAMES.TIN,
          food = obj.otyp === ONAMES.CORPSE || tinned,
          acid = obj.otyp === ONAMES.POT_ACID
                 || (food && acidic(game.mons[obj.corpsenm])),
          lizard = food && obj.corpsenm === PMNAMES.PM_LIZARD;
    const nutrit = food ? dog_nutrition(mon, obj) : 0; /* also sets meating */

    /* give a "<mon> is slowing down" message and also remove
       intrinsic speed (comparable to similar effect on the hero) */
    if (stoning)
        await mon_adjust_speed(mon, -3, null);

    if (vis) {
        const save_quan = obj.quan;

        obj.quan = 1;
        await pline_mon(mon, `${Monnam(mon)} ${
                        ((obj.oclass === OCLASSES.POTION_CLASS) ? 'quaffs'
                         : (obj.otyp === ONAMES.TIN) ? 'opens and eats the contents of'
                           : 'eats')} ${distant_name(obj, doname)}.`);
        obj.quan = save_quan;
    } else if (!Deaf())
        await You_hear(`${(obj.oclass === OCLASSES.POTION_CLASS) ? 'drinking' : 'chewing'}.`);

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
        if (vis && !is_bat(mon.data) && mon.data.pmidx !== PMNAMES.PM_STALKER)
            await pline_mon(mon, `${Monnam(mon)} seems steadier now.`);
    }
    if (mon.mtame && !mon.isminion && nutrit > 0) {
        const edog = (mon.edog ||= {});

        if ((edog.hungrytime | 0) < game.moves)
            edog.hungrytime = game.moves;
        edog.hungrytime = (edog.hungrytime | 0) + nutrit;
        mon.mconf = 0;
    }
    /* use up monster's next move */
    mon.movement = (mon.movement | 0) - NORMAL_SPEED;
    mon.mlstmv = game.moves;
}

// src/muse.c:1293 linedup_chk_corpse()
function linedup_chk_corpse(x, y) {
    return sobj_at(ONAMES.CORPSE, x, y) != null;
}

// src/muse.c:1300 m_use_undead_turning()
function m_use_undead_turning(mtmp, obj) {
    const ax = game.u.ux + sgn(mtmp.mux - mtmp.mx) * 3,
          ay = game.u.uy + sgn(mtmp.muy - mtmp.my) * 3;
    const bx = mtmp.mx, by = mtmp.my;

    if (!(obj.otyp === ONAMES.WAN_UNDEAD_TURNING && obj.spe > 0))
        return;

    /* hero carrying at least one corpse, or a corpse on the ground in a
       direct line from the monster to the hero and up to 3 steps beyond */
    if (carrying(ONAMES.CORPSE)
        || linedup_callback(ax, ay, bx, by, linedup_chk_corpse)) {
        game.m.offensive = obj;
        game.m.has_offense = MUSE_WAN_UNDEAD_TURNING;
    }
}

// src/muse.c:1344 hero_behind_chokepoint() — the two spots flanking the
// square just past the hero (from the monster's viewpoint) are both
// unreachable, so the hero stands in a corridor chokepoint.
function hero_behind_chokepoint(mtmp) {
    const dx = sgn(mtmp.mx - mtmp.mux);
    const dy = sgn(mtmp.my - mtmp.muy);

    const x = mtmp.mux + dx;
    const y = mtmp.muy + dy;

    const dir = xytodir(dx, dy);
    /* include/hack.h:660 DIR_LEFT2/DIR_RIGHT2/DIR_CLAMP */
    const dir_l = (((dir + 6) % N_DIRS) + N_DIRS) % N_DIRS;
    const dir_r = (((dir + 2) % N_DIRS) + N_DIRS) % N_DIRS;

    const c1 = {}, c2 = {};
    dirtocoord(c1, dir_l);
    dirtocoord(c2, dir_r);
    c1.x += x, c2.x += x;
    c1.y += y, c2.y += y;

    if ((!isok(c1.x, c1.y) || !accessible(c1.x, c1.y))
        && (!isok(c2.x, c2.y) || !accessible(c2.x, c2.y)))
        return true;
    return false;
}

// src/muse.c:1371 mon_has_friends() — hostile monster has another hostile
// next to it.
function mon_has_friends(mtmp) {
    if (mtmp.mtame || mtmp.mpeaceful)
        return false;

    for (let dx = -1; dx <= 1; dx++)
        for (let dy = -1; dy <= 1; dy++) {
            const x = mtmp.mx + dx;
            const y = mtmp.my + dy;
            let mon2;

            if (isok(x, y) && (mon2 = m_at(x, y)) != null
                && mon2 !== mtmp
                && !mon2.mtame && !mon2.mpeaceful)
                return true;
        }

    return false;
}

// src/muse.c:1395 mon_likes_objpile_at()
function mon_likes_objpile_at(mtmp, x, y) {
    if (!isok(x, y))
        return false;
    /* C walks svl.level.objects[x][y] through nexthere; the port keeps one
       flat list, filtered here in the same front-first order */
    const pile = (game.level?.objects || []).filter((o) => o.ox === x
                                                        && o.oy === y);
    if (!pile.length)
        return false;

    /* monster likes any of the top 3 items in the pile? */
    let i = 0;
    for (; i < pile.length && i < 3; i++)
        if (mon_would_take_item(mtmp, pile[i]))
            return true;

    /* pile is larger than 3 stacks? */
    if (i >= 3)
        return true;

    return false;
}

// src/muse.c:1421 find_offensive() — select an offensive item for a monster;
// true iff one is found. The chosen item lands in game.m.offensive with its
// MUSE_* code in game.m.has_offense, for use_offensive() to consume.
export function find_offensive(mtmp) {
    const mdat = mtmp.data ?? game.mons[mtmp.mnum];
    const u = game.u;

    if (!game.m)
        game.m = {};
    game.m.offensive = null;
    game.m.has_offense = 0;
    if (mtmp.mpeaceful || is_animal(mdat) || mindless(mdat)
        || nohands(mdat))
        return false;
    if (u.uswallow)
        return false;
    if (in_your_sanctuary(mtmp, 0, 0))
        return false;
    if (dmgtype(mdat, ATTKS.AD_HEAL)
        && !u.uwep && !u.uarmu && !u.uarm && !u.uarmh
        && !u.uarms && !u.uarmg && !u.uarmc && !u.uarmf)
        return false;
    /* all offensive items require orthogonal or diagonal targeting */
    if (!lined_up(mtmp))
        return false;

    const nomore = (x) => game.m.has_offense === x;
    const reflection_skip = (m_seenres(mtmp, M_SEEN_REFL) !== 0
                             || monnear(mtmp, mtmp.mux, mtmp.muy));
    const mtmp_helmet = which_armor(mtmp, W_ARMH);
    /* this picks the last viable item rather than prioritizing choices */
    for (const obj of (mtmp.minvent || [])) {
        if (!reflection_skip) {
            if (nomore(MUSE_WAN_DEATH))
                continue;
            if (obj.otyp === ONAMES.WAN_DEATH && obj.spe > 0
                && !m_seenres(mtmp, M_SEEN_MAGR)) {
                game.m.offensive = obj;
                game.m.has_offense = MUSE_WAN_DEATH;
            }
            if (nomore(MUSE_WAN_SLEEP))
                continue;
            if (obj.otyp === ONAMES.WAN_SLEEP && obj.spe > 0
                && game.multi >= 0
                && !m_seenres(mtmp, M_SEEN_SLEEP)) {
                game.m.offensive = obj;
                game.m.has_offense = MUSE_WAN_SLEEP;
            }
            if (nomore(MUSE_WAN_FIRE))
                continue;
            if (obj.otyp === ONAMES.WAN_FIRE && obj.spe > 0
                && !m_seenres(mtmp, M_SEEN_FIRE)) {
                game.m.offensive = obj;
                game.m.has_offense = MUSE_WAN_FIRE;
            }
            if (nomore(MUSE_FIRE_HORN))
                continue;
            if (obj.otyp === ONAMES.FIRE_HORN && obj.spe > 0
                && can_blow(mtmp)
                && !m_seenres(mtmp, M_SEEN_FIRE)) {
                game.m.offensive = obj;
                game.m.has_offense = MUSE_FIRE_HORN;
            }
            if (nomore(MUSE_WAN_COLD))
                continue;
            if (obj.otyp === ONAMES.WAN_COLD && obj.spe > 0
                && !m_seenres(mtmp, M_SEEN_COLD)) {
                game.m.offensive = obj;
                game.m.has_offense = MUSE_WAN_COLD;
            }
            if (nomore(MUSE_FROST_HORN))
                continue;
            if (obj.otyp === ONAMES.FROST_HORN && obj.spe > 0
                && can_blow(mtmp)
                && !m_seenres(mtmp, M_SEEN_COLD)) {
                game.m.offensive = obj;
                game.m.has_offense = MUSE_FROST_HORN;
            }
            if (nomore(MUSE_WAN_LIGHTNING))
                continue;
            if (obj.otyp === ONAMES.WAN_LIGHTNING && obj.spe > 0
                && !m_seenres(mtmp, M_SEEN_ELEC)) {
                game.m.offensive = obj;
                game.m.has_offense = MUSE_WAN_LIGHTNING;
            }
            if (nomore(MUSE_WAN_MAGIC_MISSILE))
                continue;
            if (obj.otyp === ONAMES.WAN_MAGIC_MISSILE && obj.spe > 0
                && !m_seenres(mtmp, M_SEEN_MAGR)) {
                game.m.offensive = obj;
                game.m.has_offense = MUSE_WAN_MAGIC_MISSILE;
            }
        }
        if (nomore(MUSE_WAN_UNDEAD_TURNING))
            continue;
        m_use_undead_turning(mtmp, obj);
        if (nomore(MUSE_WAN_STRIKING))
            continue;
        if (obj.otyp === ONAMES.WAN_STRIKING && obj.spe > 0
            && !m_seenres(mtmp, M_SEEN_MAGR)) {
            game.m.offensive = obj;
            game.m.has_offense = MUSE_WAN_STRIKING;
        }
        if (nomore(MUSE_WAN_TELEPORTATION))
            continue;
        if (obj.otyp === ONAMES.WAN_TELEPORTATION && obj.spe > 0
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
            game.m.offensive = obj;
            game.m.has_offense = MUSE_WAN_TELEPORTATION;
        }
        if (nomore(MUSE_POT_PARALYSIS))
            continue;
        if (obj.otyp === ONAMES.POT_PARALYSIS && game.multi >= 0) {
            game.m.offensive = obj;
            game.m.has_offense = MUSE_POT_PARALYSIS;
        }
        if (nomore(MUSE_POT_BLINDNESS))
            continue;
        if (obj.otyp === ONAMES.POT_BLINDNESS
            && !attacktype(mdat, ATTKS.AT_GAZE)) {
            game.m.offensive = obj;
            game.m.has_offense = MUSE_POT_BLINDNESS;
        }
        if (nomore(MUSE_POT_CONFUSION))
            continue;
        if (obj.otyp === ONAMES.POT_CONFUSION) {
            game.m.offensive = obj;
            game.m.has_offense = MUSE_POT_CONFUSION;
        }
        if (nomore(MUSE_POT_SLEEPING))
            continue;
        if (obj.otyp === ONAMES.POT_SLEEPING
            && !m_seenres(mtmp, M_SEEN_SLEEP)) {
            game.m.offensive = obj;
            game.m.has_offense = MUSE_POT_SLEEPING;
        }
        if (nomore(MUSE_POT_ACID))
            continue;
        if (obj.otyp === ONAMES.POT_ACID
            && !m_seenres(mtmp, M_SEEN_ACID)) {
            game.m.offensive = obj;
            game.m.has_offense = MUSE_POT_ACID;
        }
        /* we can safely put this scroll here since the locations that
         * are in a 1 square radius are a subset of the locations that
         * are in wand or throwing range (in other words, always lined_up())
         */
        if (nomore(MUSE_SCR_EARTH))
            continue;
        if (obj.otyp === ONAMES.SCR_EARTH
            && (hard_helmet(mtmp_helmet) || mtmp.mconf
                || amorphous(mdat) || passes_walls(mdat)
                || noncorporeal(mdat) || unsolid(mdat)
                || !rn2(10))
            && dist2(mtmp.mx, mtmp.my, mtmp.mux, mtmp.muy) <= 2
            && mtmp.mcansee && haseyes(mdat)
            && !Is_rogue_level(game.u.uz)
            && (!In_endgame(game.u.uz) || Is_earthlevel(game.u.uz))) {
            game.m.offensive = obj;
            game.m.has_offense = MUSE_SCR_EARTH;
        }
        if (nomore(MUSE_CAMERA))
            continue;
        if (obj.otyp === ONAMES.EXPENSIVE_CAMERA
            && ((!game.u.ublind && !resists_blnd(null))
                || hates_light(game.mons[game.u.umonnum]))
            && dist2(mtmp.mx, mtmp.my, mtmp.mux, mtmp.muy) <= 2
            && obj.spe > 0 && !rn2(6)) {
            game.m.offensive = obj;
            game.m.has_offense = MUSE_CAMERA;
        }
    }
    return !!game.m.has_offense;
}

// src/muse.c:1824 use_offensive(), offensive potion arm. Potions bypass the
// wand precheck and are thrown directly along the line selected above.
export async function use_offensive(mtmp) {
    let i;
    const otmp = game.m?.offensive || null;
    let oseen;
    /* if we're using a wand, and a monster has never used a wand, it takes
       time to get used to holding that much power, so the first shot always
       misses */
    const buzzfn = mtmp.mwandexp ? buzz : buzz_force_miss;

    if (!otmp)
        return 0;
    /* offensive potions are not drunk, they're thrown */
    if (otmp.oclass !== OCLASSES.POTION_CLASS && (i = await precheck(mtmp, otmp)) !== 0)
        return i;
    oseen = canseemon(mtmp);

    switch (game.m?.has_offense || 0) {
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
        await buzzfn(BZ_M_WAND(BZ_OFS_WAN(otmp.otyp)),
                     (otmp.otyp === ONAMES.WAN_MAGIC_MISSILE) ? 2 : 6, mtmp.mx, mtmp.my,
                     sgn(mtmp.mux - mtmp.mx), sgn(mtmp.muy - mtmp.my));
        game.buzzer = null;
        game.current_wand = null;
        game.m_using = false;
        mtmp.mwandexp = true;
        return (DEADMONSTER(mtmp)) ? 1 : 2;
    case MUSE_FIRE_HORN:
    case MUSE_FROST_HORN:
        await mplayhorn(mtmp, otmp, false);
        game.m_using = true;
        game.buzzer = mtmp;
        game.current_wand = otmp; /* needed by zhitu() */
        await buzzfn(BZ_M_WAND(BZ_OFS_AD(
                         (otmp.otyp === ONAMES.FROST_HORN) ? ATTKS.AD_COLD : ATTKS.AD_FIRE)),
                     rn1(6, 6), mtmp.mx, mtmp.my, sgn(mtmp.mux - mtmp.mx),
                     sgn(mtmp.muy - mtmp.my));
        game.buzzer = null;
        game.current_wand = null;
        game.m_using = false;
        mtmp.mwandexp = true;
        return (DEADMONSTER(mtmp)) ? 1 : 2;
    case MUSE_WAN_TELEPORTATION:
    case MUSE_WAN_UNDEAD_TURNING:
    case MUSE_WAN_STRIKING:
        game.zap_oseen = oseen;
        await mzapwand(mtmp, otmp, false);
        game.m_using = true;
        game.buzzer = mtmp;
        await mbhit(mtmp, rn1(8, 6), mbhitm, bhito, otmp);
        game.buzzer = null;
        game.m_using = false;
        if (game.m.has_offense === MUSE_WAN_STRIKING)
            mtmp.mwandexp = true;
        return 2;
    case MUSE_SCR_EARTH: {
        /* TODO: handle steeds */
        let x, y;
        /* don't use monster fields after killing it */
        const confused = (mtmp.mconf ? true : false);
        const mmx = mtmp.mx, mmy = mtmp.my;
        const is_cursed = otmp.cursed, is_blessed = otmp.blessed;

        await mreadmsg(mtmp, otmp);
        /* Identify the scroll */
        if (canspotmon(mtmp)) {
            await pline_The(`${ceiling(mtmp.mx, mtmp.my)} rumbles ${
                            otmp.blessed ? 'around' : 'above'} ${mon_nam(mtmp)}!`);
            if (oseen)
                makeknown(otmp.otyp);
        } else if (cansee(mtmp.mx, mtmp.my)) {
            await pline_The(`${ceiling(mtmp.mx, mtmp.my)} rumbles in the middle of nowhere!`);
            if (mtmp.minvis)
                map_invisible(mtmp.mx, mtmp.my);
            if (oseen)
                makeknown(otmp.otyp);
        }

        /* Loop through the surrounding squares */
        /* [do this before the scroll is used up, since if the monster is
           killed by a boulder landing on its own head, m_useup() might
           destroy the scroll while it is still being processed] */
        m_useup(mtmp, otmp);
        for (x = mmx - 1; x <= mmx + 1; x++) {
            for (y = mmy - 1; y <= mmy + 1; y++) {
                /* Is this a suitable spot? */
                if (isok(x, y) && !closed_door(x, y)
                    && !IS_OBSTRUCTED(game.level.at(x, y).typ) && !IS_AIR(game.level.at(x, y).typ)
                    && (((x === mmx) && (y === mmy)) ? !is_blessed : !is_cursed)
                    && (x !== game.u.ux || y !== game.u.uy)) {
                    await drop_boulder_on_monster(x, y, confused, false);
                }
            }
        }
        /* Attack the player */
        if (distmin(mmx, mmy, game.u.ux, game.u.uy) === 1 && !is_cursed) {
            await drop_boulder_on_player(confused, !is_cursed, false, true);
        }

        return (DEADMONSTER(mtmp)) ? 1 : 2;
    } /* case MUSE_SCR_EARTH */
    case MUSE_CAMERA: {
        if (Hallucination()) {
            await verbalize('Say cheese!');
        } else if (!Blind()) {
            await pline(`${Monnam(mtmp)} takes a picture of you with ${an(xname(otmp))}!`);
        }
        game.m_using = true;
        if (!Blind() && !resists_blnd(game.youmonst)) {
            await You('are blinded by the flash of light!');
            await make_blinded(((game.u.intrinsic?.HBlinded || 0) & TIMEOUT) + rnd(1 + 50), false);
        }
        await lightdamage(otmp, true, 5);
        game.m_using = false;
        otmp.spe--;
        return 1;
    } /* case MUSE_CAMERA */
    case MUSE_POT_PARALYSIS:
    case MUSE_POT_BLINDNESS:
    case MUSE_POT_CONFUSION:
    case MUSE_POT_SLEEPING:
    case MUSE_POT_ACID:
        /* Note: this only creates a possible potion, not a real one.
         * The potion is always thrown, and the monster does not
         * know that it is throwing; hence it is not affected.
         */
        if (cansee(mtmp.mx, mtmp.my)) {
            observe_object(otmp);
            await pline_mon(mtmp, `${Monnam(mtmp)} hurls ${singular(otmp, doname)}!`);
        }
        await m_throw(mtmp, mtmp.mx, mtmp.my, sgn(mtmp.mux - mtmp.mx),
                      sgn(mtmp.muy - mtmp.my),
                      distmin(mtmp.mx, mtmp.my, mtmp.mux, mtmp.muy), otmp);
        return 2;
    case 0:
        return 0; /* i.e. an exploded wand */
    default:
        /* impossible("%s wanted to perform action %d?", ...) */
        break;
    }
    return 0;
}
/* include/hack.h:1477,1490 BZ_OFS_WAN(), BZ_M_WAND() */
const BZ_OFS_WAN = (otyp) => Math.abs(otyp - ONAMES.WAN_MAGIC_MISSILE) % 10;
const BZ_M_WAND = (bztyp) => (-30 - bztyp);

// src/muse.c:2095 find_misc() selects the last viable utility item in a
// monster's inventory. The condition order matters because carried containers
// spend rn2(5) even when another item has already been selected.
export function find_misc(mtmp) {
    const mdat = mtmp.data ?? game.mons[mtmp.mnum];
    const x = mtmp.mx, y = mtmp.my;
    const immobile = mdat.mmove === 0;
    const stuck = mtmp === game.u.ustuck;

    if (!game.m)
        game.m = {};
    game.m.misc = null;
    game.m.has_misc = 0;

    if (is_animal(mdat) || mindless(mdat))
        return false;
    if (game.u.uswallow && stuck)
        return false;
    if (dist2(x, y, mtmp.mux, mtmp.muy) > 36)
        return false;

    if (!stuck && !immobile && !mtmp.mtrapped
        && (mtmp.cham ?? NON_PM) === NON_PM && mdat.difficulty < 6) {
        const ignore_boulders = verysmall(mdat) || throws_rocks(mdat)
                                || passes_walls(mdat);
        const diag_ok = mdat.pmidx !== PMNAMES.PM_GRID_BUG;

        for (let xx = x - 1; xx <= x + 1; xx++)
            for (let yy = y - 1; yy <= y + 1; yy++) {
                if (!isok(xx, yy) || u_at(xx, yy)
                    || (!diag_ok && xx !== x && yy !== y)
                    || ((xx !== x || yy !== y) && m_at(xx, yy)))
                    continue;
                const trap = t_at(xx, yy);
                if (!trap || (!ignore_boulders
                              && sobj_at(ONAMES.BOULDER, xx, yy))
                    || onscary(xx, yy, mtmp))
                    continue;
                const shoes = which_armor(mtmp, W_ARMF);
                const iron_shoes = shoes
                    && game.objects[shoes.otyp].oc_material === MATERIALS.IRON;
                if (trap.ttyp === POLY_TRAP && !iron_shoes) {
                    game.trapx = xx;
                    game.trapy = yy;
                    game.m.has_misc = MUSE_POLY_TRAP;
                    return true;
                }
            }
    }
    if (nohands(mdat))
        return false;

    for (const obj of (mtmp.minvent || [])) {
        if (obj.otyp === ONAMES.POT_GAIN_LEVEL
            && (!obj.cursed
                || (!mtmp.isgd && !mtmp.isshk && !mtmp.ispriest))) {
            game.m.misc = obj;
            game.m.has_misc = MUSE_POT_GAIN_LEVEL;
        }

        if (game.m.has_misc === MUSE_BULLWHIP)
            continue;
        if (obj.otyp === ONAMES.BULLWHIP && !mtmp.mpeaceful
            && game.u.uwep && !rn2(5) && obj === MON_WEP(mtmp)
            && u_at(mtmp.mux, mtmp.muy)
            && dist2(mtmp.mx, mtmp.my, game.u.ux, game.u.uy) <= 2
            && !game.u.uswallow
            && (canletgo(game.u.uwep, '')
                || (game.u.twoweap && canletgo(game.u.uswapwep, '')))) {
            game.m.misc = obj;
            game.m.has_misc = MUSE_BULLWHIP;
        }

        if (game.m.has_misc === MUSE_WAN_MAKE_INVISIBLE)
            continue;
        if (obj.otyp === ONAMES.WAN_MAKE_INVISIBLE && obj.spe > 0
            && !mtmp.minvis && !mtmp.invis_blkd
            && (!mtmp.mpeaceful || See_invisible())
            && (!attacktype(mdat, ATTKS.AT_GAZE) || mtmp.mcan)) {
            game.m.misc = obj;
            game.m.has_misc = MUSE_WAN_MAKE_INVISIBLE;
        }

        if (game.m.has_misc === MUSE_POT_INVISIBILITY)
            continue;
        if (obj.otyp === ONAMES.POT_INVISIBILITY && !mtmp.minvis
            && !mtmp.invis_blkd && (!mtmp.mpeaceful || See_invisible())
            && (!attacktype(mdat, ATTKS.AT_GAZE) || mtmp.mcan)) {
            game.m.misc = obj;
            game.m.has_misc = MUSE_POT_INVISIBILITY;
        }

        if (game.m.has_misc === MUSE_WAN_SPEED_MONSTER)
            continue;
        if (obj.otyp === ONAMES.WAN_SPEED_MONSTER && obj.spe > 0
            && mtmp.mspeed !== MFAST && !mtmp.isgd) {
            game.m.misc = obj;
            game.m.has_misc = MUSE_WAN_SPEED_MONSTER;
        }

        if (game.m.has_misc === MUSE_POT_SPEED)
            continue;
        if (obj.otyp === ONAMES.POT_SPEED && mtmp.mspeed !== MFAST
            && !mtmp.isgd) {
            game.m.misc = obj;
            game.m.has_misc = MUSE_POT_SPEED;
        }

        if (game.m.has_misc === MUSE_WAN_POLYMORPH)
            continue;
        if (obj.otyp === ONAMES.WAN_POLYMORPH && obj.spe > 0
            && (mtmp.cham ?? NON_PM) === NON_PM && mdat.difficulty < 6) {
            game.m.misc = obj;
            game.m.has_misc = MUSE_WAN_POLYMORPH;
        }

        if (game.m.has_misc === MUSE_POT_POLYMORPH)
            continue;
        if (obj.otyp === ONAMES.POT_POLYMORPH
            && (mtmp.cham ?? NON_PM) === NON_PM && mdat.difficulty < 6) {
            game.m.misc = obj;
            game.m.has_misc = MUSE_POT_POLYMORPH;
        }

        if (game.m.has_misc === MUSE_BAG)
            continue;
        if (Is_container(obj) && obj.otyp !== ONAMES.BAG_OF_TRICKS
            && !rn2(5)
            && !(obj.otyp === ONAMES.LARGE_BOX && obj.spe === 1)
            && !game.m.has_misc && Has_contents(obj)
            && !obj.olocked && !obj.otrapped) {
            game.m.misc = obj;
            game.m.has_misc = MUSE_BAG;
        }
    }
    return !!game.m.has_misc;
}

function m_useup_misc(mtmp, obj) {
    if ((obj.quan ?? 1) > 1) {
        obj.quan--;
        return;
    }
    const at = (mtmp.minvent || []).indexOf(obj);
    if (at >= 0)
        mtmp.minvent.splice(at, 1);
}

// src/muse.c:2250 muse_newcham_mon(). Polymorph items normally choose a
// level-suitable monster. Worn dragon body armor instead forces the matching
// dragon, preserving the C ordering before newcham() changes equipment.
async function muse_newcham_mon(mtmp) {
    const armor = which_armor(mtmp, W_ARM);
    if (armor) {
        if (armor.otyp >= ONAMES.GRAY_DRAGON_SCALES
            && armor.otyp <= ONAMES.YELLOW_DRAGON_SCALES) {
            return game.mons[PMNAMES.PM_GRAY_DRAGON
                + armor.otyp - ONAMES.GRAY_DRAGON_SCALES];
        }
        if (armor.otyp >= ONAMES.GRAY_DRAGON_SCALE_MAIL
            && armor.otyp <= ONAMES.YELLOW_DRAGON_SCALE_MAIL) {
            return game.mons[PMNAMES.PM_GRAY_DRAGON
                + armor.otyp - ONAMES.GRAY_DRAGON_SCALE_MAIL];
        }
    }
    const { rndmonst } = await import('./makemon.js');
    return rndmonst();
}

// src/muse.c:2265 mloot_container(). A monster occasionally removes up to
// four random objects from an unlocked carried container. The container is
// lightened before can_carry() so its contents are not counted twice.
export async function mloot_container(mon, container, vismon) {
    const [{ Is_mbag, add_to_container }, { mpickobj },
           { removed_from_icebox },
           { xname, distant_name, doname, an },
           { Monnam, upstart }, { Norep }, { pline }]
        = await Promise.all([
            import('./mkobj.js'), import('./steal.js'), import('./pickup.js'),
            import('./objnam.js'), import('./do_name.js'),
            import('./pline.js'), import('./display.js'),
        ]);

    if (!container || !Has_contents(container) || container.olocked)
        return 0;
    if ((Is_mbag(container) && container.cursed)
        || (container.otyp === ONAMES.LARGE_BOX && container.spe === 1)) {
        return 0;
    }

    const roll = rn2(10);
    const takeoutCount = roll < 4 ? 1 : roll < 7 ? 2 : roll < 9 ? 3 : 4;
    const howfar = mdistu(mon);
    const nearby = howfar <= 7 * 7;
    let containerName = '';
    const pronoun = vismon
        ? genders_tbl[pronoun_gender(mon, PRONOUN_HALLU)].he : '';
    let result = 0;

    for (let takeoutIndex = 0;
         takeoutIndex < takeoutCount; ++takeoutIndex) {
        if (!Has_contents(container))
            break;

        const nitems = container.cobj.length;
        if (!rn2(nitems + 1))
            break;
        const xobj = container.cobj[rn2(nitems)];

        container.cknown = 0;
        if (!containerName) {
            const name = nearby ? xname(container)
                         : distant_name(container, xname);
            containerName = an(name);
        }

        obj_extract_self(xobj);
        if (can_carry(mon, xobj)) {
            if (vismon) {
                if (howfar > 2) {
                    await Norep(`${Monnam(mon)} rummages through ${
                        containerName}.`);
                } else if (takeoutIndex === 0) {
                    await pline(`${Monnam(mon)} removes ${doname(xobj)} from ${
                        containerName}.`);
                } else {
                    await pline(`${upstart(pronoun)} removes ${doname(xobj)}.`);
                }
            }
            if (container.otyp === ONAMES.ICE_BOX)
                await removed_from_icebox(xobj);
            mpickobj(mon, xobj);
            result = 2;
        } else {
            const alreadyNomerge = !!xobj.nomerge;
            const justXobj = !Has_contents(container);
            xobj.nomerge = 1;
            const restored = add_to_container(container, xobj);
            if (!alreadyNomerge)
                restored.nomerge = 0;
            container.owt = weight(container);
            if (justXobj)
                break;
        }
    }
    return result;
}

// src/muse.c:441 find_defensive(), healing, stairs, and create-monster-scroll
// actions. Monsters use healing while badly hurt, and can escape by a
// staircase or ladder when movement has no legal square.
function m_use_healing(mtmp) {
    for (const [otyp, action] of [
        [ONAMES.POT_FULL_HEALING, MUSE_POT_FULL_HEALING],
        [ONAMES.POT_EXTRA_HEALING, MUSE_POT_EXTRA_HEALING],
        [ONAMES.POT_HEALING, MUSE_POT_HEALING],
    ]) {
        const obj = (mtmp.minvent || []).find(item => item.otyp === otyp);
        if (obj) {
            game.m.defensive = obj;
            game.m.has_defense = action;
            return true;
        }
    }
    return false;
}

export function find_defensive(mtmp, tryescape) {
    let obj;
    let t;
    let fraction;
    const x = mtmp.mx, y = mtmp.my;
    const stuck = (mtmp === game.u.ustuck),
          immobile = (mtmp.data.mmove === 0);
    let stway;

    if (!game.m)
        game.m = {};
    game.m.defensive = null;
    game.m.has_defense = 0;

    /* since unicorn horns don't get used up, the monster would look
     * silly trying to use the same cursed horn round after round
     */
    if (is_animal(mtmp.data) || mindless(mtmp.data))
        return false;
    if (!tryescape && dist2(x, y, mtmp.mux, mtmp.muy) > 25)
        return false;
    if (tryescape && Is_knox_level(game.u.uz)
        && !m_next2u(mtmp) && m_next2m(mtmp))
        return false;
    if (game.u.uswallow && stuck)
        return false;

    if (mtmp.mconf || mtmp.mstun || !mtmp.mcansee) {
        obj = null;
        if (!nohands(mtmp.data)) {
            obj = (mtmp.minvent || []).find(o => o.otyp === ONAMES.UNICORN_HORN && !o.cursed) || null;
        }
        if (obj || is_unicorn(mtmp.data) || mtmp.data.pmidx === PMNAMES.PM_KI_RIN) {
            game.m.defensive = obj;
            game.m.has_defense = MUSE_UNICORN_HORN;
            return true;
        }
    }

    if (mtmp.mconf || mtmp.mstun) {
        let liztin = null;

        for (obj of (mtmp.minvent || [])) {
            if (obj.otyp === ONAMES.CORPSE && obj.corpsenm === PMNAMES.PM_LIZARD) {
                game.m.defensive = obj;
                game.m.has_defense = MUSE_LIZARD_CORPSE;
                return true;
            } else if (obj.otyp === ONAMES.TIN && obj.corpsenm === PMNAMES.PM_LIZARD) {
                liztin = obj;
            }
        }
        /* confused or stunned monster might not be able to open tin */
        if (liztin && mcould_eat_tin(mtmp) && rn2(3)) {
            game.m.defensive = liztin;
            game.m.has_defense = MUSE_LIZARD_CORPSE;
            return true;
        }
    }

    /* It so happens there are two unrelated cases when we might want to
     * check specifically for healing alone.  The first is when the monster
     * is blind (healing cures blindness).  The second is when the monster
     * is peaceful; then we don't want to flee the player, and by
     * coincidence healing is all there is that doesn't involve fleeing.
     * These could get implemented as any-item-that-cures-blindness or
     * any-item-that-doesn't-flee, but that's not currently necessary.
     */
    if (!mtmp.mcansee && !nohands(mtmp.data)
        && mtmp.data.pmidx !== PMNAMES.PM_PESTILENCE) {
        if (m_use_healing(mtmp))
            return true;
    }

    /* monsters aren't given wands of undead turning but if they
       happen to have picked one up, use it against corpse wielder;
       when applicable, use it now even if 'mtmp' isn't wounded */
    if (!mtmp.mpeaceful && !nohands(mtmp.data)
        && game.u.uwep && game.u.uwep.otyp === ONAMES.CORPSE
        && touch_petrifies(game.mons[game.u.uwep.corpsenm])
        && !poly_when_stoned(mtmp.data) && !resists_ston(mtmp)
        && lined_up(mtmp)) { /* only lines up if distu range is within 5*5 */
        /* could use m_carrying(), then nxtobj() when matching wand
           is empty, but direct traversal is actually simpler here */
        for (obj of (mtmp.minvent || []))
            if (obj.otyp === ONAMES.WAN_UNDEAD_TURNING && obj.spe > 0) {
                game.m.defensive = obj;
                game.m.has_defense = MUSE_WAN_UNDEAD_TURNING;
                return true;
            }
    }

    if (!tryescape) {
        fraction = game.u.ulevel < 10 ? 5 : game.u.ulevel < 14 ? 4 : 3;
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

    if (stuck || immobile || mtmp.mtrapped) {
        ; /* fleeing by stairs or traps is not possible */
    } else if (game.level.at(x, y).typ === STAIRS) {
        stway = stairway_at(x, y);
        if (stway && !stway.up && stway.tolev.dnum === game.u.uz.dnum) {
            if (!is_floater(mtmp.data))
                game.m.has_defense = MUSE_DOWNSTAIRS;
        } else if (stway && stway.up && stway.tolev.dnum === game.u.uz.dnum) {
            game.m.has_defense = MUSE_UPSTAIRS;
        } else if (stway && stway.tolev.dnum !== game.u.uz.dnum) {
            if (stway.up || !is_floater(mtmp.data))
                game.m.has_defense = MUSE_SSTAIRS;
        }
    } else if (game.level.at(x, y).typ === LADDER) {
        stway = stairway_at(x, y);
        if (stway && stway.up && stway.tolev.dnum === game.u.uz.dnum) {
            game.m.has_defense = MUSE_UP_LADDER;
        } else if (stway && !stway.up && stway.tolev.dnum === game.u.uz.dnum) {
            if (!is_floater(mtmp.data))
                game.m.has_defense = MUSE_DN_LADDER;
        } else if (stway && stway.tolev.dnum !== game.u.uz.dnum) {
            if (stway.up || !is_floater(mtmp.data))
                game.m.has_defense = MUSE_SSTAIRS;
        }
    } else {
        let xx, yy, i;
        const locs = [];
        const ignore_boulders = (verysmall(mtmp.data)
                                 || throws_rocks(mtmp.data)
                                 || passes_walls(mtmp.data)),
              diag_ok = !NODIAG(mtmp.data.pmidx);

        /* note: hero's location is used as-is even if she is currently
           embedded in a wall, so hero must be in line-of-sight */
        for (i = 0; i < 10; ++i) /* 10: 9 spots plus sentinel */
            locs[i] = [0, 0];
        /* collect viable spots; monster's own spot comes first */
        locs[0] = [x, y];
        i = 1;
        for (xx = x - 1; xx <= x + 1; xx++)
            for (yy = y - 1; yy <= y + 1; yy++)
                if (isok(xx, yy) && (xx !== x || yy !== y)) {
                    locs[i] = [xx, yy];
                    ++i;
                }
        /* look for a trap door or a teleport trap */
        for (i = 0; i < 10; ++i) {
            xx = locs[i][0], yy = locs[i][1];
            if (!xx)
                break; /* we've run out of spots */
            /* skip if it's hero's spot
               or a diagonal spot and monster can't move diagonally
               or some other monster is there */
            if (u_at(xx, yy)
                || (xx !== x && yy !== y && !diag_ok)
                || (m_at(xx, yy) && !(xx === x && yy === y)))
                continue;
            /* skip if there's no trap or can't/won't move onto trap */
            if ((t = t_at(xx, yy)) == null
                || (!ignore_boulders && sobj_at(ONAMES.BOULDER, xx, yy))
                || onscary(xx, yy, mtmp))
                continue;
            /* use trap if it's the correct type */
            if (is_hole(t.ttyp)
                && !is_floater(mtmp.data)
                && !mtmp.isshk && !mtmp.isgd && !mtmp.ispriest
                && Can_fall_thru(game.u.uz)) {
                game.trapx = xx;
                game.trapy = yy;
                game.m.has_defense = MUSE_TRAPDOOR;
                break; /* no need to look at any other spots */
            } else if (t.ttyp === TELEP_TRAP) {
                game.trapx = xx;
                game.trapy = yy;
                game.m.has_defense = MUSE_TELEPORT_TRAP;
            }
        }
    }

    if (nohands(mtmp.data)) /* can't use objects */
        return !!game.m.has_defense; /* botm: */

    if (is_mercenary(mtmp.data) && (obj = m_carrying(mtmp, ONAMES.BUGLE)) != null
        && m_sees_sleepy_soldier(mtmp)) {
        game.m.defensive = obj;
        game.m.has_defense = MUSE_BUGLE;
    }
    if (game.m.has_defense) /* stairs, trap door or tele-trap, bugle alert */
        return !!game.m.has_defense; /* botm: */

    /* kludge to cut down on trap destruction (particularly portals) */
    t = t_at(x, y);
    if (t && (is_pit(t.ttyp) || t.ttyp === WEB
              || t.ttyp === BEAR_TRAP))
        t = null; /* ok for monster to dig here */

    /* selection could be improved by collecting all possibilities
       into an array and then picking one at random */
    for (obj of (mtmp.minvent || [])) {
        /* don't always use the same selection pattern */
        if (game.m.has_defense && !rn2(3))
            break;

        /* nomore(MUSE_WAN_DIGGING); */
        if (game.m.has_defense === MUSE_WAN_DIGGING)
            break;
        if (obj.otyp === ONAMES.WAN_DIGGING && obj.spe > 0 && !stuck && !t
            && !mtmp.isshk && !mtmp.isgd && !mtmp.ispriest
            && !is_floater(mtmp.data)
            /* monsters digging in Sokoban can ruin things */
            && !Sokoban()
            /* digging wouldn't be effective; assume they know that */
            && !(game.level.at(x, y).wall_info & W_NONDIGGABLE)
            && !(Is_botlevel(game.u.uz) || In_endgame(game.u.uz))
            && !(is_ice(x, y) || is_pool(x, y) || is_lava(x, y))
            && !(is_Vlad(mtmp) && In_V_tower(game.u.uz))) {
            game.m.defensive = obj;
            game.m.has_defense = MUSE_WAN_DIGGING;
        }
        if (game.m.has_defense === MUSE_WAN_TELEPORTATION_SELF) continue;
        if (game.m.has_defense === MUSE_WAN_TELEPORTATION) continue;
        if (obj.otyp === ONAMES.WAN_TELEPORTATION && obj.spe > 0) {
            /* use the TELEP_TRAP bit to determine if they know
             * about noteleport on this level or not.  Avoids
             * ineffective re-use of teleportation.  This does
             * mean if the monster leaves the level, they'll know
             * about teleport traps.
             */
            if (!noteleport_level(mtmp)
                || !mon_knows_traps(mtmp, TELEP_TRAP)) {
                game.m.defensive = obj;
                game.m.has_defense = (mon_has_amulet(mtmp))
                                     ? MUSE_WAN_TELEPORTATION
                                     : MUSE_WAN_TELEPORTATION_SELF;
            }
        }
        if (game.m.has_defense === MUSE_SCR_TELEPORTATION) continue;
        if (obj.otyp === ONAMES.SCR_TELEPORTATION && mtmp.mcansee
            && haseyes(mtmp.data)
            && (!obj.cursed || (!(mtmp.isshk && inhishop(mtmp))
                                && !mtmp.isgd && !mtmp.ispriest))) {
            /* see WAN_TELEPORTATION case above */
            if (!noteleport_level(mtmp)
                || !mon_knows_traps(mtmp, TELEP_TRAP)) {
                game.m.defensive = obj;
                game.m.has_defense = MUSE_SCR_TELEPORTATION;
            }
        }

        if (mtmp.data.pmidx !== PMNAMES.PM_PESTILENCE) {
            if (game.m.has_defense === MUSE_POT_FULL_HEALING) continue;
            if (obj.otyp === ONAMES.POT_FULL_HEALING) {
                game.m.defensive = obj;
                game.m.has_defense = MUSE_POT_FULL_HEALING;
            }
            if (game.m.has_defense === MUSE_POT_EXTRA_HEALING) continue;
            if (obj.otyp === ONAMES.POT_EXTRA_HEALING) {
                game.m.defensive = obj;
                game.m.has_defense = MUSE_POT_EXTRA_HEALING;
            }
            if (game.m.has_defense === MUSE_WAN_CREATE_MONSTER) continue;
            if (obj.otyp === ONAMES.WAN_CREATE_MONSTER && obj.spe > 0) {
                game.m.defensive = obj;
                game.m.has_defense = MUSE_WAN_CREATE_MONSTER;
            }
            if (game.m.has_defense === MUSE_POT_HEALING) continue;
            if (obj.otyp === ONAMES.POT_HEALING) {
                game.m.defensive = obj;
                game.m.has_defense = MUSE_POT_HEALING;
            }
        } else { /* Pestilence */
            if (game.m.has_defense === MUSE_POT_FULL_HEALING) continue;
            if (obj.otyp === ONAMES.POT_SICKNESS) {
                game.m.defensive = obj;
                game.m.has_defense = MUSE_POT_FULL_HEALING;
            }
            if (game.m.has_defense === MUSE_WAN_CREATE_MONSTER) continue;
            if (obj.otyp === ONAMES.WAN_CREATE_MONSTER && obj.spe > 0) {
                game.m.defensive = obj;
                game.m.has_defense = MUSE_WAN_CREATE_MONSTER;
            }
        }
        if (game.m.has_defense === MUSE_SCR_CREATE_MONSTER) continue;
        if (obj.otyp === ONAMES.SCR_CREATE_MONSTER) {
            game.m.defensive = obj;
            game.m.has_defense = MUSE_SCR_CREATE_MONSTER;
        }
    }
 /* botm: */
    return !!game.m.has_defense;
}

// src/muse.c:59 precheck(), things that can happen before a monster uses
// an item: a milky/smoky potion's occupant, a cursed wand's backfire.
// Returns 0 to go on, 1 if the monster died, 2 if it used its turn.
async function precheck(mon, obj) {
    let vis;

    if (!obj)
        return 0;
    vis = cansee(mon.mx, mon.my);

    if (obj.oclass === OCLASSES.POTION_CLASS) {
        const cc = { x: 0, y: 0 };
        const empty = 'The potion turns out to be empty.';
        let mtmp;

        if (objdescr_is(obj, 'milky')) {
            if (!(game.mvitals?.[PMNAMES.PM_GHOST]?.mvflags & G_GONE)
                && !rn2(POTION_OCCUPANT_CHANCE(game.mvitals?.[PMNAMES.PM_GHOST]?.born | 0))) {
                if (!enexto(cc, mon.mx, mon.my, game.mons[PMNAMES.PM_GHOST]))
                    return 0;
                await mquaffmsg(mon, obj);
                m_useup(mon, obj);
                mtmp = makemon(game.mons[PMNAMES.PM_GHOST], cc.x, cc.y, MM_NOMSG);
                if (!mtmp) {
                    if (vis)
                        await pline(empty);
                } else {
                    if (vis) {
                        await pline(`As ${mon_nam(mon)} opens the bottle, an enormous ${
                                    Hallucination() ? rndmonnam() : 'ghost'} emerges!`);
                        await pline(`${Monnam(mon)} is frightened to death, and unable to move.`);
                    }
                    paralyze_monst(mon, 3);
                }
                return 2;
            }
        }
        if (objdescr_is(obj, 'smoky')
            && !(game.mvitals?.[PMNAMES.PM_DJINNI]?.mvflags & G_GONE)
            && !rn2(POTION_OCCUPANT_CHANCE(game.mvitals?.[PMNAMES.PM_DJINNI]?.born | 0))) {
            if (!enexto(cc, mon.mx, mon.my, game.mons[PMNAMES.PM_DJINNI]))
                return 0;
            await mquaffmsg(mon, obj);
            m_useup(mon, obj);
            mtmp = makemon(game.mons[PMNAMES.PM_DJINNI], cc.x, cc.y, MM_NOMSG);
            if (!mtmp) {
                if (vis)
                    await pline(empty);
            } else {
                if (vis)
                    await pline_mon(mtmp, `In a cloud of smoke, ${a_monnam(mtmp)} emerges!`);
                await pline(`${vis ? Monnam(mtmp) : 'Something'} speaks.`);
                /* I suspect few players will be upset that monsters */
                /* can't wish for wands of death here.... */
                if (rn2(2)) {
                    await verbalize('You freed me!');
                    mtmp.mpeaceful = 1;
                    set_malign(mtmp);
                } else {
                    await verbalize('It is about time.');
                    if (vis)
                        await pline(`${Monnam(mtmp)} vanishes.`);
                    mongone(mtmp);
                }
            }
            return 2;
        }
    }
    if (obj.oclass === OCLASSES.WAND_CLASS && obj.cursed
        && !rn2(WAND_BACKFIRE_CHANCE)) {
        const dam = d(obj.spe + 2, 6);

        /* 3.6.1: no Deaf filter; 'if' message doesn't mention noise and
           'else' message doesn't need it since You_hear() has one of its own */
        if (vis) {
            await pline_mon(mon, `${Monnam(mon)} zaps ${an(xname(obj))}, which suddenly explodes!`);
        } else {
            const range = couldsee(mon.mx, mon.my) /* 9 or 5 */
                          ? (BOLT_LIM + 1) : (BOLT_LIM - 3);

            await You_hear(`a zap and an explosion ${
                           (mdistu(mon) <= range * range) ? 'nearby' : 'in the distance'}.`);
        }
        m_useup(mon, obj);
        mon.mhp -= dam;
        if (DEADMONSTER(mon)) {
            await monkilled(mon, '', ATTKS.AD_RBRE);
            return 1;
        }
        game.m.has_defense = game.m.has_offense = game.m.has_misc = 0;
        /* Only one needed to be set to 0 but the others are harmless */
    }
    return 0;
}

async function mquaffmsg(mtmp, obj) {
    const [{ canseemon, pline }, { Deaf }, { You_hear }, { Monnam },
           { singular, doname }, { observe_object }]
        = await Promise.all([
            import('./display.js'), import('./youprop.js'),
            import('./pline.js'), import('./do_name.js'),
            import('./objnam.js'), import('./o_init.js'),
        ]);
    if (canseemon(mtmp)) {
        observe_object(obj);
        await pline(`${Monnam(mtmp)} drinks ${singular(obj, doname)}!`);
    } else if (!Deaf()) {
        await You_hear('a chugging sound.');
    }
}

// src/muse.c:165 mzapwand(), self-targeting arm used by miscellaneous
// invisibility wands. It reports a seen zap, reports only its distance when
// unseen, forgets unseen charge knowledge, and spends exactly one charge.
// src/muse.c:165 mzapwand(), a monster zaps a wand (at itself when self);
// when the monster isn't directly seen, the hero's memory of the number of
// charges is removed.
async function mzapwand(mtmp, otmp, self) {
    if (otmp.spe < 1) {
        /* impossible("Mon zapping wand with %d charges?", otmp->spe); */
        return;
    }
    if (!canseemon(mtmp)) {
        const range = couldsee(mtmp.mx, mtmp.my) /* 9 or 5 */
                      ? (BOLT_LIM + 1) : (BOLT_LIM - 3);

        await You_hear(`a ${(mdistu(mtmp) <= range * range) ? 'nearby' : 'distant'} zap.`);
        unknow_object(otmp); /* hero loses info when unseen obj is used */
    } else if (self) {
        await pline(`${monverbself(mtmp, Monnam(mtmp), 'zap', null)} with ${doname(otmp)}!`);
    } else {
        await pline_mon(mtmp, `${Monnam(mtmp)} zaps ${an(xname(otmp))}!`);
        await stop_occupation();
    }
    otmp.spe -= 1;
}

// src/muse.c:195 mplayhorn(), a monster plays a frost or fire horn (at
// itself when self); when unseen, the hero loses the object's details.
async function mplayhorn(mtmp, otmp, self) {
    let objnamp, objbuf;

    if (!canseemon(mtmp)) {
        const range = couldsee(mtmp.mx, mtmp.my) /* 9 or 5 */
                      ? (BOLT_LIM + 1) : (BOLT_LIM - 3);

        await You_hear(`a horn being played ${
                       (mdistu(mtmp) <= range * range) ? 'nearby' : 'in the distance'}.`);
        unknow_object(otmp); /* hero loses info when unseen obj is used */
    } else if (self) {
        observe_object(otmp);
        objnamp = xname(otmp);
        if (objnamp.length >= QBUFSZ)
            objnamp = simpleonames(otmp);
        objbuf = `a ${objnamp} directed at`;
        await pline(`${monverbself(mtmp, Monnam(mtmp), 'play', objbuf)}!`);
        makeknown(otmp.otyp); /* (wands handle this slightly differently) */
    } else {
        observe_object(otmp);
        objnamp = xname(otmp);
        if (objnamp.length >= QBUFSZ)
            objnamp = simpleonames(otmp);
        await pline(`${Monnam(mtmp)} plays ${an(objnamp)} directed at you!`);
        makeknown(otmp.otyp);
        await stop_occupation();
    }
    otmp.spe -= 1; /* use a charge */
}

// src/muse.c:361 m_sees_sleepy_soldier(), a helpless mercenary within 3.
function m_sees_sleepy_soldier(mtmp) {
    const x = mtmp.mx, y = mtmp.my;
    let xx, yy;
    let mon;

    /* Distance is arbitrary */
    for (xx = x - 3; xx <= x + 3; xx++)
        for (yy = y - 3; yy <= y + 3; yy++) {
            if (!isok(xx, yy) || (xx === x && yy === y))
                continue;
            if ((mon = m_at(xx, yy)) != null && is_mercenary(mon.data)
                && mon.data.pmidx !== PMNAMES.PM_GUARD
                && helpless(mon))
                return true;
        }
    return false;
}

// src/muse.c:384 m_tele(), a monster teleports itself (or, with how == 0,
// through a teleport trap it stepped onto).
async function m_tele(mtmp, vismon, oseen, how) {
    if (await tele_restrict(mtmp)) { /* mysterious force... */
        if (vismon && how)     /* mentions 'teleport' */
            makeknown(how);
        /* monster learns that teleportation isn't useful here */
        if (noteleport_level(mtmp))
            mon_learns_traps(mtmp, TELEP_TRAP);
    } else if ((mon_has_amulet(mtmp) || On_W_tower_level(game.u.uz)) && !rn2(3)) {
        if (vismon)
            await pline_mon(mtmp, `${Monnam(mtmp)} seems disoriented for a moment.`);
    } else {
        if (how) {
            if (oseen)
                makeknown(how);
            await rloc(mtmp, RLOC_MSG);
        } else {
            /* monster stepped onto a teleporter; use the trap's destination
               trap instead of rloc() in case it sends 'victim' to a vault */
            mtmp.mx = game.trapx, mtmp.my = game.trapy;
            await mintrap(mtmp, FORCETRAP);
        }
    }
}

// src/muse.c:435 m_next2m(), is another monster adjacent to mtmp?
function m_next2m(mtmp) {
    let x, y;
    let m2;

    if (DEADMONSTER(mtmp) || mon_offmap(mtmp))
        return false;
    for (x = mtmp.mx - 1; x <= mtmp.mx + 1; x++)
        for (y = mtmp.my - 1; y <= mtmp.my + 1; y++) {
            if (!isok(x, y))
                continue;
            if ((m2 = m_at(x, y)) && m2 !== mtmp)
                return true;
        }
    return false;
}

// src/muse.c:757 reveal_trap(), a trap door or teleporter a monster uses
// while hiding in a niche becomes accessible (secret corridor becomes
// corridor); optionally shown to the hero.
export function reveal_trap(t, seeit) {
    const lev = game.level.at(t.tx, t.ty);

    if (lev.typ === SCORR) {
        lev.typ = CORR, lev.flags = 0; /* set_levltyp(,,CORR) */
        unblock_point(t.tx, t.ty);
    }
    if (seeit)
        seetrap(t);
}

// src/muse.c:780 mon_escape(), a monster on the level's top stairs leaves
// the dungeon for good (unless it carries something special).
async function mon_escape(mtmp, vismon) {
    if (mon_has_special(mtmp)
        || (mtmp.iswiz && (game.context?.no_of_wizards ?? 0) < 2))
        return 0;
    if (vismon)
        await pline_mon(mtmp, `${Monnam(mtmp)} escapes the dungeon!`);
    mongone(mtmp);
    return 2;
}
/* src/wizard.c:117 mon_has_special() */
function mon_has_special(mtmp) {
    for (const otmp of (mtmp.minvent || []))
        if (otmp.otyp === ONAMES.AMULET_OF_YENDOR
            || any_quest_artifact(otmp)
            || otmp.otyp === ONAMES.BELL_OF_OPENING
            || otmp.otyp === ONAMES.CANDELABRUM_OF_INVOCATION
            || otmp.otyp === ONAMES.SPE_BOOK_OF_THE_DEAD)
            return 1;
    return 0;
}
/* include/hack.h Sokoban: In_sokoban(&u.uz) */
const Sokoban = () => !!game.level?.flags?.sokoban_rules;
/* include/monst.h:222 is_Vlad(); include/hack.h:1409-1410 */
const is_Vlad = (m) => (m.data.pmidx === PMNAMES.PM_VLAD_THE_IMPALER
                        || m.cham === PMNAMES.PM_VLAD_THE_IMPALER);
const POTION_OCCUPANT_CHANCE = (n) => (13 + 2 * n);
const WAND_BACKFIRE_CHANCE = 100;
/* include/youprop.h:295 Half_spell_damage */
const Half_spell_damage = () => !!(game.u.intrinsic?.HHalf_spell_damage
                                   || game.u.uprops?.HALF_SPDAM);

// src/muse.c:2631 you_aggravate(). A cursed invisibility potion briefly
// clears the map and exposes only the monster and hero before restoring the
// ordinary view. The forced monster glyph is intentional even while blind.
async function you_aggravate(mtmp) {
    const [{ cls, docrt, show_glyph_cell, newsym, canspotmon,
             map_invisible, more, pline },
           { noit_mon_nam }, { Hallucination }, { You_feel },
           { unconscious }] = await Promise.all([
        import('./display.js'), import('./do_name.js'),
        import('./youprop.js'), import('./pline.js'), import('./trap.js'),
    ]);

    const name = noit_mon_nam(mtmp);
    await pline(`For some reason, ${s_suffix(name)} presence is known to you.`);
    await cls();

    const shown = game.mons[Hallucination()
        ? rn2_on_display_rng(NUMMONS) : mtmp.mnum];
    show_glyph_cell(mtmp.mx, mtmp.my, def_monsyms[shown.mlet] || '?',
                    shown.mcolor, false, 0, { kind: 'mon', mon: mtmp });
    newsym(game.u.ux, game.u.uy);
    await You_feel(`aggravated at ${noit_mon_nam(mtmp)}.`);
    await more();
    await docrt();

    if (unconscious()) {
        game.multi = -1;
        game.nomovemsg = 'Aggravated, you are jolted into full consciousness.';
    }
    newsym(mtmp.mx, mtmp.my);
    if (!canspotmon(mtmp))
        map_invisible(mtmp.mx, mtmp.my);
}

// src/muse.c:238 mreadmsg(). Seeing or hearing a monster read reveals the
// scroll label. The unseen path names a previously seen monster, or a
// non-unique human to a human hero, instead of reducing it to "someone".
async function mreadmsg(mtmp, obj) {
    const [{ canseemon, sensemon, map_invisible, pline }, { couldsee },
           { Deaf, Hallucination }, { observe_object },
           { singular, doname, ansimpleoname },
           { Monnam, mon_nam, x_monnam }, { You_hear },
           { is_human }] = await Promise.all([
        import('./display.js'), import('./vision.js'), import('./youprop.js'),
        import('./o_init.js'), import('./objnam.js'), import('./do_name.js'),
        import('./pline.js'), import('./mondata.js'),
    ]);
    const vismon = canseemon(mtmp);
    if (!vismon && Deaf())
        return false;

    observe_object(obj);
    const onambuf = singular(obj, vismon ? doname : ansimpleoname);
    if (vismon) {
        await pline(`${Monnam(mtmp)} reads ${onambuf}!`);
    } else {
        const mdat = mtmp.data ?? game.mons[mtmp.mnum];
        const ydat = game.youmonst?.data ?? game.mons[game.u.umonnum];
        const similar = is_human(ydat) && is_human(mdat);
        const unique = !!(mdat.geno & G_UNIQ) || !!mtmp.isshk;
        const recognize = !Hallucination()
            && (mtmp.meverseen || (similar && !unique));
        const suppress = SUPPRESS_INVISIBLE | SUPPRESS_SADDLE
            | (recognize ? SUPPRESS_IT : AUGMENT_IT);
        const who = x_monnam(mtmp, ARTICLE_A, null, suppress, false);
        let action = `reading ${onambuf}`;
        action = action.replace('reading a scroll labeled',
            mtmp.mconf ? 'attempting to incant' : 'incant');

        if (!sensemon(mtmp) && couldsee(mtmp.mx, mtmp.my)
            && dist2(mtmp.mx, mtmp.my, game.u.ux, game.u.uy) <= 100)
            map_invisible(mtmp.mx, mtmp.my);
        await You_hear(`${who} ${action}.`);
    }
    if (mtmp.mconf) {
        const who = vismon ? mon_nam(mtmp) : 'it';
        await pline(`Being confused, ${who} mispronounces the magic words...`);
    }
    return true;
}

// src/muse.c:796 use_defensive(), physical escape, healing potion, and
// create-monster-scroll actions.
export async function use_defensive(mtmp) {
    let i, fleetim;
    let otmp = game.m?.defensive || null;
    let vis, vismon, oseen;
    let t;
    let stway;

    if ((i = await precheck(mtmp, otmp)) !== 0)
        return i;
    vis = cansee(mtmp.mx, mtmp.my);
    vismon = canseemon(mtmp);
    oseen = otmp && vismon;

    /* when using defensive choice to run away, we want monster to avoid
       rushing right straight back; don't override if already scared */
    fleetim = !mtmp.mflee ? (33 - Math.trunc(30 * mtmp.mhp / mtmp.mhpmax)) : 0;
    const m_flee = async (m) => {
        if (fleetim && !m.iswiz) {
            await monflee(m, fleetim, false, false);
        }
    };

    switch (game.m?.has_defense || 0) {
    case MUSE_UNICORN_HORN:
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
            /* impossible("No need for unicorn horn?"); */
        }
        return 2;
    case MUSE_BUGLE:
        if (vismon) {
            await pline_mon(mtmp, `${Monnam(mtmp)} plays ${doname(otmp)}!`);
        } else if (!Deaf()) {
            await You_hear('a bugle playing reveille!');
        }
        await awaken_soldiers(mtmp);
        return 2;
    case MUSE_WAN_TELEPORTATION_SELF:
        if ((mtmp.isshk && inhishop(mtmp)) || mtmp.isgd || mtmp.ispriest)
            return 2;
        await m_flee(mtmp);
        await mzapwand(mtmp, otmp, true);
        await m_tele(mtmp, vismon, oseen, ONAMES.WAN_TELEPORTATION);
        return 2;
    case MUSE_WAN_TELEPORTATION:
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
        let obj_is_cursed;

        obj_is_cursed = otmp.cursed;
        if (mtmp.isshk || mtmp.isgd || mtmp.ispriest)
            return 2;
        await m_flee(mtmp);
        /* scroll of teleportation is being used up; if mtmp survives,
           might get destroyed if still in mtmp's inventory (maybe mtmp
           lands in lava or on a fire trap) so take it out in advance */
        if (otmp.quan > 1)
            otmp = splitobj(otmp, 1);
        extract_from_minvent(mtmp, otmp, false, false);
        /* set last_msg to something other than PLNMSG_UNKNOWN; messages
           are issued by mreadmsg(), 'if (vismon) pline()', or m_tele() */
        (game.iflags ||= {}).last_msg = PLNMSG_enum;
        await mreadmsg(mtmp, otmp); /* sets otmp->dknown if !Blind or !Deaf */
        if (obj_is_cursed || mtmp.mconf) {
            let nlev;
            const flev = { dnum: 0, dlevel: 0 };

            nlev = random_teleport_level();
            if (mon_has_amulet(mtmp) || In_endgame(game.u.uz)) {
                if (vismon)
                    await pline_mon(mtmp, `${Monnam(mtmp)} seems very disoriented for a moment.`);
            } else if (nlev === depth(game.u.uz)) {
                if (vismon)
                    await pline_mon(mtmp, `${Monnam(mtmp)} shudders for a moment.`);
            } else {
                get_level(flev, nlev);
                await migrate_to_level(mtmp, ledger_no(flev), MIGR_RANDOM, null);
            }
        } else {
            await m_tele(mtmp, vismon, oseen, ONAMES.SCR_TELEPORTATION);
        }
        /* trycall() is a no-op if some message was issued and mtmp's
           otmp->otyp is already discovered */
        if (otmp.dknown && game.iflags.last_msg !== PLNMSG_enum)
            await trycall(otmp);
        obfree(otmp, null);
        return 2;
    }
    case MUSE_WAN_DIGGING:
        await m_flee(mtmp);
        await mzapwand(mtmp, otmp, false);
        if (oseen)
            makeknown(ONAMES.WAN_DIGGING);
        if (IS_FURNITURE(game.level.at(mtmp.mx, mtmp.my).typ)
            || IS_DRAWBRIDGE(game.level.at(mtmp.mx, mtmp.my).typ)
            || (is_drawbridge_wall(mtmp.mx, mtmp.my) >= 0)
            || stairway_at(mtmp.mx, mtmp.my)) {
            await pline_The('digging ray is ineffective.');
            return 2;
        }
        if (!Can_dig_down(game.u.uz) && !game.level.at(mtmp.mx, mtmp.my).candig) {
            /* can't dig a hole; digging a pit fails if already one is
               here, or if pit creation fails for some reason */
            if (t_at(mtmp.mx, mtmp.my)
                || !(t = maketrap(mtmp.mx, mtmp.my, PIT))) {
                if (vismon) {
                    await pline_The(`${surface(mtmp.mx, mtmp.my)} here is too hard to dig in.`);
                }
                return 2;
            }
            if (vis) {
                seetrap(t);
                await pline_mon(mtmp, `${Monnam(mtmp)} has made a pit in the ${
                                surface(mtmp.mx, mtmp.my)}.`);
            }
            await fill_pit(mtmp.mx, mtmp.my);
            recalc_block_point(mtmp.mx, mtmp.my);
            return ((await mintrap(mtmp, FORCEBUNGLE)) === Trap_Killed_Mon) ? 1 : 2;
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
                            is_flyer(mtmp.data) ? 'dives' : 'falls'} through...`);
        } else if (!Deaf()) {
            await You_hear(`something crash through the ${surface(mtmp.mx, mtmp.my)}.`);
        }
        /* we made sure that there is a level for mtmp to go to */
        await fill_pit(mtmp.mx, mtmp.my);
        await migrate_to_level(mtmp, ledger_no(game.u.uz) + 1, MIGR_RANDOM, null);
        return 2;
    case MUSE_WAN_UNDEAD_TURNING:
        game.zap_oseen = oseen;
        await mzapwand(mtmp, otmp, false);
        game.m_using = true;
        await mbhit(mtmp, rn1(8, 6), mbhitm, bhito, otmp);
        game.m_using = false;
        return 2;
    case MUSE_WAN_CREATE_MONSTER: {
        const cc = { x: 0, y: 0 };
        let mon;
        /* pm: 0 => random, eel => aquatic, croc => amphibious */
        const pm = !is_pool(mtmp.mx, mtmp.my) ? null
                   : game.mons[game.u.uinwater ? PMNAMES.PM_GIANT_EEL : PMNAMES.PM_CROCODILE];

        if (!enexto(cc, mtmp.mx, mtmp.my, pm))
            return 0;
        await mzapwand(mtmp, otmp, false);
        mon = makemon(null, cc.x, cc.y, NO_MM_FLAGS);
        if (mon && canspotmon(mon) && oseen)
            makeknown(ONAMES.WAN_CREATE_MONSTER);
        return 2;
    }
    case MUSE_SCR_CREATE_MONSTER: {
        const cc = { x: 0, y: 0 };
        let pm = null, fish = null;
        let cnt = 1;
        let mon;
        let known = false;

        if (!rn2(73))
            cnt += rnd(4);
        if (mtmp.mconf || otmp.cursed)
            cnt += 12;
        if (mtmp.mconf)
            pm = fish = game.mons[PMNAMES.PM_ACID_BLOB];
        else if (is_pool(mtmp.mx, mtmp.my))
            fish = game.mons[game.u.uinwater ? PMNAMES.PM_GIANT_EEL : PMNAMES.PM_CROCODILE];
        await mreadmsg(mtmp, otmp);
        while (cnt--) {
            /* `fish' potentially gives bias towards water locations;
               `pm' is what to actually create (0 => random) */
            if (!enexto(cc, mtmp.mx, mtmp.my, fish))
                break;
            mon = makemon(pm, cc.x, cc.y, NO_MM_FLAGS);
            if (mon && canspotmon(mon))
                known = true;
        }
        /* The only case where we don't use oseen.  For wands, you
         * have to be able to see the monster zap the wand to know
         * what type it is.  For teleport scrolls, you have to see
         * the monster to know it teleported.
         */
        if (known)
            makeknown(ONAMES.SCR_CREATE_MONSTER);
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
        if (Is_botlevel(game.u.uz))
            return 0;
        await m_flee(mtmp);
        t = t_at(game.trapx, game.trapy);
        if (vis) {
            await pline_mon(mtmp, `${Monnam(mtmp)} ${
                            vtense(fakename[0], locomotion(mtmp.data, 'jump'))} into a ${
                            trapname(t.ttyp, false)}!`);
        }
        reveal_trap(t, vis);
        /* don't use rloc_to() because worm tails must "move" */
        remove_monster(mtmp.mx, mtmp.my);
        newsym(mtmp.mx, mtmp.my); /* update old location */
        place_monster(mtmp, game.trapx, game.trapy);
        if (mtmp.wormno)
            note_unported_muse('use_defensive:worm_move'); /* worm.c worm_move() */
        newsym(game.trapx, game.trapy);

        await migrate_to_level(mtmp, ledger_no(game.u.uz) + 1, MIGR_RANDOM, null);
        return 2;
    case MUSE_UPSTAIRS:
        await m_flee(mtmp);
        stway = stairway_at(mtmp.mx, mtmp.my);
        if (!stway)
            return 0;
        if (ledger_no(game.u.uz) === 1)
            return await mon_escape(mtmp, vismon);
        /* Monsters without amulets escape the dungeon and are
         * gone for good when they leave up the up stairs.
         * Monsters with amulets would reach the endlevel,
         * which we cannot allow since that would leave the
         * player stranded.
         */
        if (Inhell() && mon_has_amulet(mtmp) && !rn2(4)
            && (dunlev(game.u.uz) < dunlevs_in_dungeon(game.u.uz) - 3)) {
            if (vismon)
                await pline(`As ${mon_nam(mtmp)} climbs the stairs, a mysterious force momentarily surrounds ${mhim(mtmp)}...`);
            /* simpler than for the player; this will usually be
               the Wizard and he'll immediately go right to the
               upstairs, so there's not much point in having any
               chance for a random position on the current level */
            await migrate_to_level(mtmp, ledger_no(game.u.uz) + 1, MIGR_RANDOM, null);
        } else {
            if (vismon)
                await pline_mon(mtmp, `${Monnam(mtmp)} escapes upstairs!`);
            await migrate_to_level(mtmp, ledger_no(stway.tolev), MIGR_STAIRS_DOWN, null);
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
        await migrate_to_level(mtmp, ledger_no(stway.tolev), MIGR_LADDER_DOWN, null);
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
        if (ledger_no(game.u.uz) === 1) {
            return await mon_escape(mtmp, vismon);
        }
        if (vismon)
            await pline_mon(mtmp, `${Monnam(mtmp)} escapes ${stway.up ? 'up' : 'down'}stairs!`);
        /* going from branch to main dungeon doesn't have a specific
           target for arrival, but having gs.sstairs.<sx,sy> == <0,0> will work the
           same as specifying MIGR_RANDOM when mon_arrive() eventually
           places the monster, so we can use MIGR_SSTAIRS unconditionally */
        await migrate_to_level(mtmp, ledger_no(stway.tolev), MIGR_SSTAIRS, null);
        return 2;
    case MUSE_TELEPORT_TRAP:
        await m_flee(mtmp);
        t = t_at(game.trapx, game.trapy);
        if (vis) {
            await pline_mon(mtmp, `${Monnam(mtmp)} ${
                            vtense(fakename[0], locomotion(mtmp.data, 'jump'))} onto a ${
                            trapname(t.ttyp, false)}!`);
        }
        reveal_trap(t, vis);
        /* don't use rloc_to() because worm tails must "move" */
        remove_monster(mtmp.mx, mtmp.my);
        newsym(mtmp.mx, mtmp.my); /* update old location */
        place_monster(mtmp, game.trapx, game.trapy);
        if (mtmp.wormno)
            note_unported_muse('use_defensive:worm_move'); /* worm.c worm_move() */
        maybe_unhide_at(mtmp.mx, mtmp.my);
        newsym(game.trapx, game.trapy);

        await m_tele(mtmp, vismon, false, 0);
        return 2;
    case MUSE_POT_HEALING:
        await mquaffmsg(mtmp, otmp);
        i = d(6 + 2 * bcsign(otmp), 4);
        healmon(mtmp, i, 1);
        if (!otmp.cursed && !mtmp.mcansee)
            await mcureblindness(mtmp, vismon);
        if (vismon)
            await pline_mon(mtmp, `${Monnam(mtmp)} looks better.`);
        if (oseen)
            makeknown(ONAMES.POT_HEALING);
        m_useup(mtmp, otmp);
        return 2;
    case MUSE_POT_EXTRA_HEALING:
        await mquaffmsg(mtmp, otmp);
        i = d(6 + 2 * bcsign(otmp), 8);
        healmon(mtmp, i, otmp.blessed ? 5 : 2);
        if (!mtmp.mcansee)
            await mcureblindness(mtmp, vismon);
        if (vismon)
            await pline_mon(mtmp, `${Monnam(mtmp)} looks much better.`);
        if (oseen)
            makeknown(ONAMES.POT_EXTRA_HEALING);
        m_useup(mtmp, otmp);
        return 2;
    case MUSE_POT_FULL_HEALING:
        await mquaffmsg(mtmp, otmp);
        if (otmp.otyp === ONAMES.POT_SICKNESS)
            unbless(otmp); /* Pestilence */
        healmon(mtmp, mtmp.mhpmax, otmp.blessed ? 8 : 4);
        if (!mtmp.mcansee && otmp.otyp !== ONAMES.POT_SICKNESS)
            await mcureblindness(mtmp, vismon);
        if (vismon)
            await pline_mon(mtmp, `${Monnam(mtmp)} looks completely healed.`);
        if (oseen)
            makeknown(otmp.otyp);
        m_useup(mtmp, otmp);
        return 2;
    case MUSE_LIZARD_CORPSE:
        /* not actually called for its unstoning effect */
        await mon_consume_unstone(mtmp, otmp, false, false);
        return 2;
    case 0:
        return 0; /* i.e. an exploded wand */
    default:
        /* impossible("%s wanted to perform action %d?", ...) */
        break;
    }
    return 0;
}
/* src/decl.c c_fakename[] */
const fakename = ['\\#\\_bogus', "\\#\\_flunk"];
/* enum plnmsg PLNMSG_enum: the last regular message id (src/muse.c uses
   it as "some message other than PLNMSG_UNKNOWN was issued") */
const PLNMSG_enum = -2;

// src/muse.c:2383 use_misc(). The invisibility potion is the first common
// utility action reached by the public trace. It changes visibility without
// drawing, consumes one potion, and spends the monster's action.
export async function use_misc(mtmp) {
    const obj = game.m?.misc || null;

    switch (game.m?.has_misc || 0) {
    case MUSE_POT_GAIN_LEVEL: {
        if (!obj)
            return 0;
        await mquaffmsg(mtmp, obj);
        if (obj.cursed) {
            const [{ Can_rise_up, ceiling, depth, get_level },
                   { canseemon, pline }, { Monnam, trycall }]
                = await Promise.all([
                    import('./dungeon.js'), import('./display.js'),
                    import('./do_name.js'),
                ]);
            const vismon = canseemon(mtmp);
            if (Can_rise_up(mtmp.mx, mtmp.my, game.u.uz)) {
                const tolevel = {};
                get_level(tolevel, depth(game.u.uz) - 1);
                if (tolevel.dnum !== game.u.uz.dnum
                    || tolevel.dlevel !== game.u.uz.dlevel) {
                    if (vismon) {
                        await pline(`${Monnam(mtmp)} rises up, through the ${
                            ceiling(mtmp.mx, mtmp.my)}!`);
                        await trycall(obj);
                    }
                    m_useup_misc(mtmp, obj);
                    const { migrate_monster } = await import('./trap.js');
                    migrate_monster(mtmp, tolevel, MIGR_RANDOM);
                    return 2;
                }
            }
            if (vismon) {
                await pline(`${Monnam(mtmp)} looks uneasy.`);
                await trycall(obj);
            }
            m_useup_misc(mtmp, obj);
            return 2;
        }
        const { canseemon, pline } = await import('./display.js');
        const { Monnam } = await import('./do_name.js');
        const vismon = canseemon(mtmp);
        if (vismon)
            await pline(`${Monnam(mtmp)} seems more experienced.`);
        if (vismon) {
            const { makeknown } = await import('./o_init.js');
            makeknown(ONAMES.POT_GAIN_LEVEL);
        }
        m_useup_misc(mtmp, obj);
        const { grow_up } = await import('./makemon.js');
        return grow_up(mtmp, null) ? 2 : 1;
    }
    case MUSE_WAN_SPEED_MONSTER: {
        if (!obj || obj.spe < 1)
            return 0;
        const [{ canseemon, pline }, { couldsee }, { You_hear },
               { Monnam }, { doname }, { unknow_object }, { learnwand }]
            = await Promise.all([
                import('./display.js'), import('./vision.js'),
                import('./pline.js'), import('./do_name.js'),
                import('./objnam.js'), import('./mkobj.js'),
                import('./zap.js'),
            ]);
        const seen = canseemon(mtmp);

        if (!seen) {
            const range = couldsee(mtmp.mx, mtmp.my) ? 9 : 5;
            const nearby = dist2(mtmp.mx, mtmp.my, game.u.ux, game.u.uy)
                           <= range * range;
            await You_hear(`a ${nearby ? 'nearby' : 'distant'} zap.`);
            unknow_object(obj);
        } else {
            const self = mtmp.female ? 'herself' : 'himself';
            await pline(`${Monnam(mtmp)} zaps ${self} with ${doname(obj)}!`);
        }
        obj.spe--;

        const oldspeed = mtmp.mspeed ?? 0;
        mtmp.permspeed = (mtmp.permspeed === MSLOW) ? 0 : MFAST;
        mtmp.mspeed = mtmp.permspeed;
        if (seen && mtmp.mspeed !== oldspeed && mtmp.data.mmove
            && !mtmp.mfrozen && !mtmp.msleeping) {
            const howmuch = (mtmp.mspeed + oldspeed === MFAST + MSLOW)
                            ? 'much ' : '';
            await pline(`${Monnam(mtmp)} is suddenly moving ${howmuch}faster.`);
            learnwand(obj);
        }
        return 2;
    }
    case MUSE_POT_SPEED: {
        if (!obj)
            return 0;
        const [{ canseemon, pline }, { You_hear }, { Deaf }, { Monnam },
               { singular, doname }, { observe_object }, { learnwand }]
            = await Promise.all([
                import('./display.js'), import('./pline.js'),
                import('./youprop.js'), import('./do_name.js'),
                import('./objnam.js'), import('./o_init.js'),
                import('./zap.js'),
            ]);
        const seen = canseemon(mtmp);

        if (seen) {
            observe_object(obj);
            await pline(`${Monnam(mtmp)} drinks ${singular(obj, doname)}!`);
        } else if (!Deaf()) {
            await You_hear('a chugging sound.');
        }

        const oldspeed = mtmp.mspeed ?? 0;
        mtmp.permspeed = (mtmp.permspeed === MSLOW) ? 0 : MFAST;
        const speedBoots = (mtmp.minvent || []).some((item) =>
            item.otyp === ONAMES.SPEED_BOOTS && item.owornmask);
        mtmp.mspeed = speedBoots ? MFAST : mtmp.permspeed;
        if (seen && mtmp.mspeed !== oldspeed && mtmp.data.mmove
            && !mtmp.mfrozen && !mtmp.msleeping) {
            const howmuch = (mtmp.mspeed + oldspeed === MFAST + MSLOW)
                            ? 'much ' : '';
            await pline(`${Monnam(mtmp)} is suddenly moving ${howmuch}faster.`);
            learnwand(obj);
        }

        m_useup_misc(mtmp, obj);
        return 2;
    }
    case MUSE_WAN_MAKE_INVISIBLE:
    case MUSE_POT_INVISIBILITY: {
        if (!obj)
            return 0;
        if (obj.otyp === ONAMES.WAN_MAKE_INVISIBLE && obj.spe < 1)
            return 0;
        const [{ cansee },
               { canseemon, canspotmon, pline, newsym, map_invisible },
               { Hallucination }, { Monnam, mon_nam, upstart },
               { makeknown }] = await Promise.all([
            import('./vision.js'), import('./display.js'),
            import('./youprop.js'), import('./do_name.js'),
            import('./o_init.js'),
        ]);
        const vis = cansee(mtmp.mx, mtmp.my);
        const vismon = canseemon(mtmp);
        const oseen = vismon;

        if (obj.otyp === ONAMES.WAN_MAKE_INVISIBLE)
            await mzapwand(mtmp, obj, true);
        else
            await mquaffmsg(mtmp, obj);

        const oldname = mon_nam(mtmp);

        mtmp.perminvis = obj.cursed ? 0 : 1;
        if (!mtmp.invis_blkd) {
            mtmp.minvis = mtmp.perminvis;
            newsym(mtmp.mx, mtmp.my);
        }
        if (vismon && mtmp.minvis) {
            if (canspotmon(mtmp))
                await pline(`${upstart(s_suffix(oldname))} body takes on a ${
                    Hallucination() ? 'normal' : 'strange'} transparency.`);
            else {
                await pline(`Suddenly you cannot see ${oldname}.`);
                if (vis)
                    map_invisible(mtmp.mx, mtmp.my);
            }
            if (oseen)
                makeknown(obj.otyp);
        } else if (vismon && !mtmp.minvis) {
            await pline(`${Monnam(mtmp)} briefly seems to be transparent.`);
        } else if (!vismon && canseemon(mtmp)) {
            await pline(`${Monnam(mtmp)} suddenly appears!`);
        }

        if (obj.otyp === ONAMES.POT_INVISIBILITY) {
            if (obj.cursed)
                await you_aggravate(mtmp);
            m_useup_misc(mtmp, obj);
        }
        return 2;
    }
    case MUSE_WAN_POLYMORPH: {
        if (!obj || obj.spe < 1)
            return 0;
        const [{ canseemon }, { newcham }, { makeknown }]
            = await Promise.all([
                import('./display.js'), import('./mon.js'),
                import('./o_init.js'),
            ]);
        const oseen = canseemon(mtmp);

        await mzapwand(mtmp, obj, true);
        await newcham(mtmp, await muse_newcham_mon(mtmp),
                      NC_VIA_WAND_OR_SPELL | NC_SHOW_MSG);
        if (oseen)
            makeknown(ONAMES.WAN_POLYMORPH);
        return 2;
    }
    case MUSE_POT_POLYMORPH: {
        if (!obj)
            return 0;
        const [{ canseemon, pline }, { Monnam }, { newcham }, { makeknown }]
            = await Promise.all([
                import('./display.js'), import('./do_name.js'),
                import('./mon.js'), import('./o_init.js'),
            ]);
        const vismon = canseemon(mtmp);
        const oseen = vismon;

        await mquaffmsg(mtmp, obj);
        m_useup_misc(mtmp, obj);
        if (vismon)
            await pline(`${Monnam(mtmp)} suddenly mutates!`);
        await newcham(mtmp, await muse_newcham_mon(mtmp), NC_SHOW_MSG);
        if (oseen)
            makeknown(ONAMES.POT_POLYMORPH);
        return 2;
    }
    case MUSE_POLY_TRAP: {
        const trap = t_at(game.trapx, game.trapy);
        if (!trap)
            return 0;
        const [{ cansee },
               { canseemon, newsym, pline },
               { Some_Monnam }, { vtense },
               { seetrap, trapname },
               { remove_monster, place_monster },
               { newcham }, { maybe_unhide_at_mon }]
            = await Promise.all([
                import('./vision.js'), import('./display.js'),
                import('./do_name.js'), import('./objnam.js'),
                import('./trap.js'), import('./makemon.js'),
                import('./mon.js'), import('./monmove.js'),
            ]);
        const vis = cansee(mtmp.mx, mtmp.my);
        const vismon = canseemon(mtmp);
        const vistrapspot = cansee(trap.tx, trap.ty);

        if (vis || vistrapspot)
            seetrap(trap);
        if (vismon || vistrapspot) {
            const movement = vtense('mon', locomotion(mtmp.data, 'jump'));
            await pline(`${Some_Monnam(mtmp)} deliberately ${movement} onto a ${
                trap.tseen ? trapname(trap.ttyp, false) : 'hidden trap'}!`);
        }

        const oldx = mtmp.mx, oldy = mtmp.my;
        remove_monster(oldx, oldy);
        newsym(oldx, oldy);
        place_monster(mtmp, game.trapx, game.trapy);
        maybe_unhide_at_mon(mtmp);
        newsym(game.trapx, game.trapy);

        await newcham(mtmp, null, NC_SHOW_MSG);
        return 2;
    }
    case MUSE_BAG: {
        if (!obj)
            return 0;
        const { canseemon } = await import('./display.js');
        return mloot_container(mtmp, obj, canseemon(mtmp));
    }
    case MUSE_BULLWHIP: {
        let where_to = rn2(4);
        let target = game.u.uwep;
        if (!target || !canletgo(target, '')
            || (game.u.twoweap && canletgo(game.u.uswapwep, '') && rn2(2)))
            target = game.u.uswapwep;
        if (!target)
            return 0;

        const [{ canseemon, pline, newsym }, { Monnam },
               { xname, the, makeplural }, { body_part },
               { welded, setuwep_with_feedback, setuswapwep, setuqwep },
               { freeinv }, { place_object }, { dropy },
               { mpickobj }, { mon_hates_silver }, { surface },
               { HAND }] = await Promise.all([
            import('./display.js'), import('./do_name.js'),
            import('./objnam.js'), import('./polyself.js'),
            import('./wield.js'), import('./invent.js'), import('./mkobj.js'),
            import('./do.js'), import('./steal.js'), import('./dog.js'),
            import('./dungeon.js'), import('./const.js'),
        ]);
        const vismon = canseemon(mtmp);
        const the_whip = vismon ? 'The bullwhip' : 'A whip';
        const the_weapon = the(xname(target));
        let hand = body_part(HAND);
        if (bimanual(target))
            hand = makeplural(hand);

        if (vismon)
            await pline(`${Monnam(mtmp)} flicks a bullwhip towards your ${hand}!`);
        if (target.otyp === ONAMES.HEAVY_IRON_BALL) {
            await pline(`${the_whip} fails to wrap around ${the_weapon}.`);
            return 1;
        }
        await pline(`${the_whip} wraps around ${the_weapon} you're wielding!`);
        if (welded(target)) {
            await pline(`${is_plural(target) ? 'They are' : 'It is'} welded to your ${hand}.`);
            where_to = 0;
        }
        if (!where_to) {
            await pline('The whip slips free.');
            return 1;
        }
        if (where_to === 3 && mon_hates_silver(mtmp)
            && game.objects[target.otyp].oc_material === MATERIALS.SILVER)
            where_to = 2;

        if (target === game.u.uwep)
            await setuwep_with_feedback(null);
        if (target === game.u.uswapwep)
            setuswapwep(null);
        if (target === game.u.uquiver)
            setuqwep(null);
        freeinv(target);

        switch (where_to) {
        case 1:
            await pline(`${Monnam(mtmp)} yanks ${the_weapon} from your ${hand}!`);
            place_object(target, mtmp.mx, mtmp.my);
            newsym(mtmp.mx, mtmp.my);
            break;
        case 2:
            await pline(`${Monnam(mtmp)} yanks ${the_weapon} to the ${
                surface(game.u.ux, game.u.uy)}!`);
            await dropy(target);
            break;
        case 3:
            await pline(`${Monnam(mtmp)} snatches ${the_weapon}!`);
            mpickobj(mtmp, target);
            break;
        default:
            break;
        }
        return 1;
    }
    default:
        (game.unported ||= new Set()).add(`use_misc:${game.m?.has_misc || 0}`);
        return game.m?.has_misc ? 2 : 0;
    }
}

// src/muse.c:1597 mbhitm(), a monster's wand hits a monster (or the hero).
export async function mbhitm(mtmp, otmp) {
    let tmp;
    let reveal_invis = false, learnit = false;
    const hits_you = (mtmp === game.youmonst);

    if (!hits_you && otmp.otyp !== ONAMES.WAN_UNDEAD_TURNING) {
        mtmp.msleeping = 0;
        if (mtmp.m_ap_type)
            seemimic(mtmp);
    }
    switch (otmp.otyp) {
    case ONAMES.WAN_STRIKING:
        reveal_invis = true;
        if (hits_you) {
            if (Antimagic()) {
                monstseesu(M_SEEN_MAGR); /* monsters notice hero resisting */
                await shieldeff(game.u.ux, game.u.uy);
                await pline('Boing!');
                learnit = true;
            } else if (rnd(20) < 10 + game.u.uac
                       && !(game.buzzer && !game.buzzer.mwandexp)) {
                monstunseesu(M_SEEN_MAGR); /* mons see hero not resisting */
                await pline_The('wand hits you!');
                tmp = d(2, 12);
                if (Half_spell_damage())
                    tmp = Math.trunc((tmp + 1) / 2);
                await losehp(tmp, 'wand', KILLED_BY_AN);
                learnit = true;
            } else {
                await pline_The('wand misses you.');
            }
            await stop_occupation();
            nomul(0);
        } else if (resists_magm(mtmp)) {
            await shieldeff(mtmp.mx, mtmp.my);
            await pline('Boing!');
            learnit = true;
        } else if (rnd(20) < 10 + find_mac(mtmp)) {
            tmp = d(2, 12);
            await hit('wand', mtmp, exclam(tmp));
            await resist(mtmp, otmp.oclass, tmp, TELL);
            learnit = true;
        } else {
            await miss('wand', mtmp);
        }
        /* since 'learnit' is only set when the zap's effect on the
           target is hit; don't have to see the target itself though */
        if (learnit && game.zap_oseen && (hits_you
                                          || cansee(mtmp.mx, mtmp.my)))
            makeknown(ONAMES.WAN_STRIKING);
        break;
    case ONAMES.WAN_TELEPORTATION:
        if (hits_you) {
            await tele();
            if (game.zap_oseen)
                makeknown(ONAMES.WAN_TELEPORTATION);
        } else {
            /* for consistency with zap.c, don't identify */
            if (mtmp.ispriest && in_rooms(mtmp.mx, mtmp.my, TEMPLE)) {
                if (cansee(mtmp.mx, mtmp.my))
                    await pline_mon(mtmp, `${Monnam(mtmp)} resists the magic!`);
            } else if (!(await tele_restrict(mtmp)))
                await rloc(mtmp, RLOC_MSG);
        }
        break;
    case ONAMES.WAN_CANCELLATION:
    case ONAMES.SPE_CANCELLATION:
        await cancel_monst(mtmp, otmp, false, true, false);
        break;
    case ONAMES.WAN_UNDEAD_TURNING:
        if (hits_you) {
            await unturn_you();
            learnit = game.zap_oseen;
        } else {
            let wake = false;

            if (await unturn_dead(mtmp)) /* affects mtmp's invent, not mtmp */
                wake = true;
            if (is_undead(mtmp.data) || is_vampshifter(mtmp)) {
                wake = reveal_invis = true;
                /* the target is an undead creature; wand's zap will
                   make_corpse() will set obj->bypass on the new corpse
                   so that mbhito() will skip it instead of reviving it */
                (game.context ||= {}).bypasses = true; /* for make_corpse() */
                await resist(mtmp, OCLASSES.WAND_CLASS, rnd(8), NOTELL);
            }
            if (wake) {
                if (!DEADMONSTER(mtmp))
                    await wakeup(mtmp, false);
                learnit = game.zap_oseen;
            }
        }
        if (learnit)
            makeknown(ONAMES.WAN_UNDEAD_TURNING);
        break;
    default:
        break;
    }
    if (reveal_invis && !DEADMONSTER(mtmp)
        && cansee(game.bhitpos.x, game.bhitpos.y) && !canspotmon(mtmp))
        map_invisible(game.bhitpos.x, game.bhitpos.y);
    return 0;
}

// src/muse.c:1707 fhito_loc(), call fhito for every object at <tx,ty>.
async function fhito_loc(obj, tx, ty, fhito) {
    let hitanything = 0;

    if (!fhito || !OBJ_AT(tx, ty))
        return false;
    for (const otmp of [...(game.level.objects || [])]) {
        /* this used to just take objects at the location, but
           bhito() (via poly_obj()) can move objects [into containers]
           and the 'nexthere' chain could be broken */
        if (otmp.where !== OBJ_FLOOR || otmp.ox !== tx || otmp.oy !== ty)
            continue;
        hitanything += await fhito(otmp, obj);
    }
    return hitanything ? true : false;
}

// src/muse.c:1734 mbhit(), a monster's wand beam: the mon/obj callbacks
// along the line from the monster toward where it thinks the hero is.
export async function mbhit(mon, range, fhitm, fhito, obj) {
    let mtmp;
    let ltyp;
    let ddx, ddy;
    const otyp = obj.otyp;

    game.bhitpos = { x: mon.mx, y: mon.my };
    ddx = sgn(mon.mux - mon.mx);
    ddy = sgn(mon.muy - mon.my);

    while (range-- > 0) {
        let x, y;

        game.bhitpos.x += ddx;
        game.bhitpos.y += ddy;
        x = game.bhitpos.x;
        y = game.bhitpos.y;

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
        /* modified by GAN to hit all objects */
        if (await fhito_loc(obj, game.bhitpos.x, game.bhitpos.y, fhito))
            range--;
        ltyp = game.level.at(game.bhitpos.x, game.bhitpos.y).typ;
        if (otyp === ONAMES.WAN_STRIKING
            /* dbridge.c's find_drawbridge()/destroy_drawbridge() are not
               ported; a wand of striking beam does not smash drawbridges */
            && (ltyp === DRAWBRIDGE_UP || is_drawbridge_wall(x, y) >= 0)) {
            note_unported_muse('mbhit:destroy_drawbridge');
        } else if (IS_DOOR(ltyp) || ltyp === SDOOR) {
            switch (otyp) {
            /* note: monsters don't use opening or locking magic
               at present, but keep these as placeholders */
            case ONAMES.WAN_OPENING:
            case ONAMES.WAN_LOCKING:
            case ONAMES.WAN_STRIKING:
                if (await doorlock(obj, game.bhitpos.x, game.bhitpos.y)) {
                    if (game.zap_oseen)
                        makeknown(otyp);
                    /* if a shop door gets broken, add it to
                       the shk's fix list (no cost to player) */
                    if (game.level.at(game.bhitpos.x, game.bhitpos.y).doormask === D_BROKEN
                        && in_rooms(game.bhitpos.x, game.bhitpos.y, SHOPBASE))
                        add_damage(game.bhitpos.x, game.bhitpos.y, 0);
                }
                break;
            }
        }
        if (!ZAP_POS(ltyp)
            || (IS_DOOR(ltyp) && (game.level.at(game.bhitpos.x, game.bhitpos.y).doormask
                                  & (D_LOCKED | D_CLOSED)))) {
            game.bhitpos.x -= ddx;
            game.bhitpos.y -= ddy;
            break;
        }
    }
}

// src/muse.c:1815 buzz_force_miss(), a monster's first zap with an
// attack wand always misses.
async function buzz_force_miss(type, nd, sx, sy, dx, dy) {
    await dobuzz(type, nd, sx, sy, dx, dy, true, false, true);
}

// src/muse.c:3031 munslime(), a monster tries to cure its own sliming.
export async function munslime(mon, by_you) {
    let obj;
    const mptr = mon.data;

    /*
     * muse_unslime() gives "mon starts turning green", "mon zaps
     * itself with a wand of fire", and "mon's slime is burned away"
     * messages.  Monsters who don't get any chance at that just have
     * (via our caller) newcham()'s "mon turns into slime" feedback.
     */
    if (slimeproof(mptr))
        return false;
    if (mon.meating || helpless(mon))
        return false;
    mon.mstrategy = (mon.mstrategy | 0) & ~STRAT_WAITFORU;

    /* if monster can breathe fire, do so upon self; a monster who deals
       fire damage by biting, clawing, gazing, and especially exploding
       isn't able to cure itself of green slime with its own attack
       [possible extension: monst capable of casting high level clerical
       spells could toss pillar of fire at self--probably too suicidal] */
    if (!mon.mcan && !mon.mspec_used
        && attacktype_fordmg(mptr, ATTKS.AT_BREA, ATTKS.AD_FIRE)) {
        const odummy = { otyp: ONAMES.STRANGE_OBJECT }; /* otyp == STRANGE_OBJECT */

        return await muse_unslime(mon, odummy, null, by_you);
    }

    if (!is_animal(mptr) && !mindless(mptr)) {
        let t = null;

        for (obj of (mon.minvent || []))
            if (cures_sliming(mon, obj))
                return await muse_unslime(mon, obj, null, by_you);

        if (((t = t_at(mon.mx, mon.my)) == null || t.ttyp !== FIRE_TRAP)
            && mptr.mmove && !mon.mtrapped) {
            const xy = [[], []];
            let x, y, idx, ridx, nxy = 0;

            for (x = mon.mx - 1; x <= mon.mx + 1; ++x)
                for (y = mon.my - 1; y <= mon.my + 1; ++y)
                    if (isok(x, y) && accessible(x, y)
                        && !m_at(x, y) && (x !== game.u.ux || y !== game.u.uy)) {
                        xy[0][nxy] = x, xy[1][nxy] = y;
                        ++nxy;
                    }
            for (idx = 0; idx < nxy; ++idx) {
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
                    && t.ttyp === FIRE_TRAP)
                    break;
            }
        }
        if (t && t.ttyp === FIRE_TRAP)
            return await muse_unslime(mon, hands_obj_m, t, by_you);

    } /* MUSE */

    return false;
}
/* a stand-in for C's hands_obj (an object with STRANGE_OBJECT type) */
const hands_obj_m = { otyp: 0, oclass: 0, quan: 1 };

// src/muse.c:3104 muse_unslime(), burn the slime away with obj (or a
// fire trap); true when the sliming was cured.
async function muse_unslime(mon, obj, trap, by_you) {
    const otyp = obj.otyp;
    let dmg = 0;
    let vis = canseemon(mon), res = true;

    if (vis)
        await pline_mon(mon, `${Monnam(mon)} starts turning ${
                        green_mon(mon) ? 'into ooze' : hcolor(NH_GREEN)}.`);
    /* -4 => sliming, causes quiet loss of intrinsic speed */
    await mon_adjust_speed(mon, -4, null);
    if (trap) {
        const Mnam = vis ? Monnam(mon) : null;

        if (mon.mx === trap.tx && mon.my === trap.ty) {
            if (vis)
                await pline(`${Mnam} triggers ${trap.tseen ? 'the' : 'a'} fire trap!`);
        } else {
            remove_monster(mon.mx, mon.my);
            newsym(mon.mx, mon.my);
            place_monster(mon, trap.tx, trap.ty);
            if (mon.wormno) /* won't happen; worms don't MUSE to unslime */
                note_unported_muse('muse_unslime:worm_move');
            newsym(mon.mx, mon.my);
            if (vis)
                await pline(`${Mnam} ${vtense(fakename[0], locomotion(mon.data, 'move'))} ${
                            is_floater(mon.data) ? 'over' : 'onto'} ${
                            trap.tseen ? 'the' : 'a'} fire trap!`);
        }
        /* hero's actions might have triggered the fire trap; not
           mon's own action so by_you is not honored here */
        await mintrap(mon, FORCETRAP);
    } else if (otyp === ONAMES.STRANGE_OBJECT) {
        /* breathe fire */
        if (vis)
            await pline_mon(mon, `${monverbself(mon, Monnam(mon), 'breath', 'fire on')}.`);
        if (!rn2(3))
            mon.mspec_used = rn1(10, 5);
        /* -21 => monster's fire breath; 1 => # of damage dice */
        dmg = await zhitm(mon, by_you ? 21 : -21, 1);
    } else if (otyp === ONAMES.SCR_FIRE) {
        await mreadmsg(mon, obj);
        if (mon.mconf) {
            if (cansee(mon.mx, mon.my))
                await pline('Oh, what a pretty fire!');
            if (vis)
                await trycall(obj);
            m_useup(mon, obj); /* after trycall() */
            vis = false;       /* skip makeknown() below */
            res = false;       /* failed to cure sliming */
        } else {
            dmg = Math.trunc((2 * (rn1(3, 3) + 2 * bcsign(obj)) + 1) / 3);
            m_useup(mon, obj); /* before explode() */
            /* -11 => monster's fireball */
            await explode(mon.mx, mon.my, -11, dmg, OCLASSES.SCROLL_CLASS,
                          /* by_you: override -11 to get "caught in
                             your own fireball" if it kills mon */
                          by_you ? -EXPL_FIERY : EXPL_FIERY);
            dmg = 0; /* damage has been applied by explode() */
        }
    } else if (otyp === ONAMES.POT_OIL) {
        let Pronoun;
        const was_lit = obj.lamplit ? true : false;
        let saw_lit = false;

        /*
         * If not already lit, requires two actions.  We cheat and let
         * monster do both rather than render it useless if it hasn't
         * lit the potion in advance.  Also, we don't bother tracking
         * where the potion came from (mon's inventory, or floor).
         */
        if (obj.quan > 1)
            obj = splitobj(obj, 1);
        if (vis && !was_lit) {
            await pline_mon(mon, `${Monnam(mon)} ignites ${ansimpleoname(obj)}.`);
            saw_lit = true;
        }
        await begin_burn(obj, was_lit);
        vis = vis || canseemon(mon); /* burning potion may improve visibility */
        if (vis) {
            if (!Unaware())
                observe_object(obj); /* hero is watching mon drink obj */
            await pline(`${saw_lit ? (Pronoun = upstart(mhe(mon))) : Monnam(mon)} quaffs a burning ${
                        simpleonames(obj)}`);
            makeknown(ONAMES.POT_OIL);
        }
        dmg = d(3, 4); /* [**TEMP** (different from hero)] */
        m_useup(mon, obj);
    } else { /* wand/horn of fire w/ positive charge count */
        if (obj.otyp === ONAMES.FIRE_HORN)
            await mplayhorn(mon, obj, true);
        else
            await mzapwand(mon, obj, true);
        /* -1 => monster's wand of fire; 2 => # of damage dice */
        dmg = await zhitm(mon, by_you ? 1 : -1, 2);
    }

    if (dmg) {
        /* zhitm() applies damage but doesn't kill anything;
           for fire breath, dmg is going to be 0 (fire breathers are
           immune to fire damage) but for wand of fire or fire horn,
           'mon' could have taken damage so might die */
        if (DEADMONSTER(mon)) {
            if (by_you) {
                /* mon killed self but hero gets credit and blame (except
                   for pacifist conduct); xkilled()'s message would say
                   "You killed/destroyed <mon>" so give our own message */
                if (vis)
                    await pline_mon(mon, `${Monnam(mon)} is ${
                                    nonliving(mon.data) ? 'destroyed' : 'killed'} by the fire!`);
                await xkilled(mon, XKILL_NOMSG | XKILL_NOCONDUCT);
            } else
                await monkilled(mon, 'fire', ATTKS.AD_FIRE);
        } else {
            /* non-fatal damage occurred */
            if (vis)
                await pline_mon(mon, `${Monnam(mon)} is burned${exclam(dmg)}`);
        }
    }
    if (vis) {
        if (res && !DEADMONSTER(mon))
            await pline_mon(mon, `${s_suffix(Monnam(mon))} slime is burned away!`);
        if (otyp !== ONAMES.STRANGE_OBJECT)
            makeknown(otyp);
    }
    /* use up monster's next move */
    mon.movement = (mon.movement | 0) - NORMAL_SPEED;
    mon.mlstmv = game.moves;
    return res;
}

// src/muse.c:3246 cures_sliming(), would this object cure sliming?
function cures_sliming(mon, obj) {
    /* scroll of fire, non-empty wand or horn of fire */
    if (obj.otyp === ONAMES.SCR_FIRE)
        return (haseyes(mon.data) && mon.mcansee && !nohands(mon.data)) ? 1 : 0;
    /* hero doesn't need hands or even limbs to zap, so mon doesn't either */
    if (obj.otyp === ONAMES.POT_OIL)
        return !nohands(mon.data) ? 1 : 0;
    return ((obj.otyp === ONAMES.WAN_FIRE
             || (obj.otyp === ONAMES.FIRE_HORN && can_blow(mon)))
            && obj.spe > 0) ? 1 : 0;
}

// src/muse.c:3269 green_mon(), is the monster green (so that turning
// green would go unnoticed and it turns "into ooze" instead)?
function green_mon(mon) {
    const ptr = mon.data;

    if (Hallucination())
        return false;
    return (ptr.mcolor === CLR_GREEN || ptr.mcolor === CLR_BRIGHT_GREEN);
}

function note_unported_muse(what) {
    (game.unported ||= new Set()).add('muse:' + what);
}

// src/muse.c ureflects(); does the hero reflect, and which item does it
export async function ureflects(fmt, str) {
    const EReflecting = game.u.uprops?.REFLECTING | 0;
    const say = async (what) => { await pline(fmt.replace('%s', str).replace('%s', what)); };

    /* Check from outermost to innermost objects */
    if (EReflecting & W_ARMS) {
        if (fmt && str !== null && str !== undefined) {
            await say('shield');
            makeknown(ONAMES.SHIELD_OF_REFLECTION);
        }
        return true;
    } else if (EReflecting & W_WEP) {
        /* Due to wielded artifact weapon */
        if (fmt && str !== null && str !== undefined)
            await say('weapon');
        return true;
    } else if (EReflecting & W_AMUL) {
        if (fmt && str !== null && str !== undefined) {
            await say('medallion');
            makeknown(ONAMES.AMULET_OF_REFLECTION);
        }
        return true;
    } else if (EReflecting & W_ARM) {
        if (fmt && str !== null && str !== undefined)
            await say(game.u.uskin ? 'luster' : 'armor');
        return true;
    } else if (game.youmonst.data === game.mons[PMNAMES.PM_SILVER_DRAGON]) {
        if (fmt && str !== null && str !== undefined)
            await say('scales');
        return true;
    }
    return false;
}
