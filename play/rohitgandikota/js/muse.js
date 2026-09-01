// muse.js — monsters using items.
// C ref: src/muse.c
//
// This includes offensive and miscellaneous item use plus the healing-potion
// subset of defensive item use. The remaining defensive actions are still
// absent.
//
// gm.m (the muse selection struct) is game.m here; find_offensive() resets
// the offensive slice at its head exactly as C does.

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
import { which_armor } from './worn.js';
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
const MUSE_POT_HEALING = 3;
const MUSE_POT_EXTRA_HEALING = 4;
const MUSE_UPSTAIRS = 8;
const MUSE_DOWNSTAIRS = 9;
const MUSE_SCR_CREATE_MONSTER = 11;
const MUSE_UP_LADDER = 12;
const MUSE_DN_LADDER = 13;
const MUSE_SSTAIRS = 14;
const MUSE_POT_FULL_HEALING = 18;

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

async function mon_adjust_speed_for_stoning(mon) {
    if ((mon.permspeed | 0) === MFAST)
        mon.permspeed = 0;
    const speedBoots = (mon.minvent || []).some(obj =>
        obj.owornmask && game.objects[obj.otyp]?.oc_oprop === FAST);
    mon.mspeed = speedBoots ? MFAST : (mon.permspeed | 0);

    if ((mon.data || game.mons[mon.mnum]).mmove
        && !mon.mfrozen && !mon.msleeping) {
        const { canseemon, pline } = await import('./display.js');
        if (canseemon(mon) && game.flags?.verbose !== false) {
            const { Monnam } = await import('./do_name.js');
            await pline(`${Monnam(mon)} is slowing down.`);
        }
    }
}

// src/muse.c:2884 munstone() and mon_consume_unstone(). Returns true once a
// cure was consumed, even when its acid damage kills the monster.
export async function munstone(mon, by_you) {
    if (resists_ston(mon) || mon.meating || helpless(mon))
        return false;
    mon.mstrategy = (mon.mstrategy | 0) & ~STRAT_WAITFORU;

    const tinok = mcould_eat_tin(mon);
    const obj = (mon.minvent || []).find(item =>
        cures_stoning(mon, item, tinok));
    if (!obj)
        return false;

    const [{ canseemon, pline }, { Deaf, Hallucination },
           { Monnam, mon_nam }, { distant_name, doname },
           { dog_nutrition }] = await Promise.all([
        import('./display.js'), import('./youprop.js'),
        import('./do_name.js'), import('./objnam.js'), import('./dog.js'),
    ]);
    const visible = canseemon(mon);
    const tinned = obj.otyp === ONAMES.TIN;
    const food = obj.otyp === ONAMES.CORPSE || tinned;
    const acid = obj.otyp === ONAMES.POT_ACID
        || (food && acidic(game.mons[obj.corpsenm]));
    const lizard = food && obj.corpsenm === PMNAMES.PM_LIZARD;
    const nutrit = food ? dog_nutrition(mon, obj) : 0;

    await mon_adjust_speed_for_stoning(mon);
    if (visible) {
        const saveQuan = obj.quan;
        obj.quan = 1;
        const verb = obj.oclass === OCLASSES.POTION_CLASS
            ? 'quaffs'
            : tinned ? 'opens and eats the contents of' : 'eats';
        await pline(`${Monnam(mon)} ${verb} ${distant_name(obj, doname)}.`);
        obj.quan = saveQuan;
    } else if (!Deaf()) {
        const { You_hear } = await import('./pline.js');
        await You_hear(`${obj.oclass === OCLASSES.POTION_CLASS
            ? 'drinking' : 'chewing'}.`);
    }

    m_useup_unstone(mon, obj);
    if (acid && !tinned && !resists_acid(mon)) {
        mon.mhp -= rnd(15);
        if (visible)
            await pline(`${Monnam(mon)} has a very bad case of stomach acid.`);
        if (DEADMONSTER(mon)) {
            await pline(`${Monnam(mon)} dies!`);
            if (by_you)
                await xkilled(mon, XKILL_NOMSG | XKILL_NOCONDUCT);
            else
                await mondead(mon);
            return true;
        }
    }

    if (visible) {
        if (Hallucination()) {
            await pline(`What a pity - ${mon_nam(mon)} just ruined a future piece of art!`);
        } else {
            await pline(`${Monnam(mon)} seems limber!`);
        }
    }
    if (lizard && (mon.mconf || mon.mstun)) {
        mon.mconf = 0;
        mon.mstun = 0;
        if (visible && game.mons[mon.mnum].mlet !== MONSYMS.S_BAT
            && mon.mnum !== PMNAMES.PM_STALKER)
            await pline(`${Monnam(mon)} seems steadier now.`);
    }
    if (mon.mtame && !mon.isminion && nutrit > 0) {
        const edog = (mon.edog ||= {});
        if ((edog.hungrytime | 0) < game.moves)
            edog.hungrytime = game.moves;
        edog.hungrytime = (edog.hungrytime | 0) + nutrit;
        mon.mconf = 0;
    }
    mon.movement = (mon.movement | 0) - NORMAL_SPEED;
    mon.mlstmv = game.moves;
    return true;
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
    const obj = game.m?.offensive || null;

    if (!obj)
        return 0;
    switch (game.m?.has_offense || 0) {
    case MUSE_WAN_STRIKING: {
        const [{ canseemon, pline }, { couldsee }, { You_hear },
               { Monnam }, { an, xname }, { unknow_object }, { makeknown },
               { stop_occupation }, { nomul, losehp }, { pline_The },
               { bhitpile, bhito }]
            = await Promise.all([
                import('./display.js'), import('./vision.js'),
                import('./pline.js'), import('./do_name.js'),
                import('./objnam.js'), import('./mkobj.js'),
                import('./o_init.js'), import('./allmain.js'),
                import('./hack.js'), import('./pline.js'), import('./zap.js'),
            ]);
        const seen = canseemon(mtmp);

        if (!seen) {
            const range = couldsee(mtmp.mx, mtmp.my) ? 9 : 5;
            const nearby = dist2(mtmp.mx, mtmp.my, game.u.ux, game.u.uy)
                           <= range * range;
            await You_hear(`a ${nearby ? 'nearby' : 'distant'} zap.`);
            unknow_object(obj);
        } else {
            await pline(`${Monnam(mtmp)} zaps ${an(xname(obj))}!`);
            await stop_occupation();
        }
        obj.spe--;

        /* src/muse.c:1734 mbhit(). Unlike the hero's bhit(), this starts at
           the monster, crosses the hero square, then keeps going so every
           floor pile on the remaining line receives bhito(). */
        let range = rn1(8, 6);
        const ddx = sgn(mtmp.mux - mtmp.mx);
        const ddy = sgn(mtmp.muy - mtmp.my);
        game.bhitpos = { x: mtmp.mx, y: mtmp.my };

        while (range-- > 0) {
            game.bhitpos.x += ddx;
            game.bhitpos.y += ddy;
            const x = game.bhitpos.x, y = game.bhitpos.y;

            if (!isok(x, y)) {
                game.bhitpos.x -= ddx;
                game.bhitpos.y -= ddy;
                break;
            }

        if (u_at(x, y)) {
                if (game.u.uprops?.ANTIMAGIC || game.u.uprops?.MAGIC_RES) {
                    mtmp.seen_resistance = (mtmp.seen_resistance ?? 0)
                                               | M_SEEN_MAGR;
                    const { shieldeff } = await import('./display.js');
                    await shieldeff(game.u.ux, game.u.uy);
                    await pline('Boing!');
                    if (seen)
                        makeknown(obj.otyp);
                } else {
                    const hit = rnd(20) < 10 + (game.u.uac ?? 0)
                                && !!mtmp.mwandexp;
                    if (hit) {
                        mtmp.seen_resistance = (mtmp.seen_resistance ?? 0)
                                               & ~M_SEEN_MAGR;
                        await pline_The('wand hits you!');
                        let damage = d(2, 12);
                        if (game.u.uprops?.HALF_SPDAM)
                            damage = Math.trunc((damage + 1) / 2);
                        await losehp(damage, 'wand', KILLED_BY_AN);
                        if (seen)
                            makeknown(obj.otyp);
                    } else {
                        await pline_The('wand misses you.');
                    }
                }
                await stop_occupation();
                nomul(0);
                range -= 3;
            } else if (m_at(x, y)) {
                /* mbhitm() for intervening monsters has resistance, damage,
                   death, and visibility consequences not reached here yet. */
                (game.unported ||= new Set()).add(
                    'use_offensive:striking_intervening_monster');
                range -= 3;
            }

            if (await bhitpile(obj, bhito, x, y, 0))
                range--;

            const loc = game.level.at(x, y);
            if (loc && IS_DOOR(loc.typ))
                (game.unported ||= new Set()).add(
                    'use_offensive:striking_door');
            if (!loc || !ZAP_POS(loc.typ)
                || (IS_DOOR(loc.typ)
                    && (loc.doormask & (D_LOCKED | D_CLOSED)))) {
                game.bhitpos.x -= ddx;
                game.bhitpos.y -= ddy;
                break;
            }
        }
        mtmp.mwandexp = true;
        return 2;
    }
    case MUSE_POT_PARALYSIS:
    case MUSE_POT_BLINDNESS:
    case MUSE_POT_CONFUSION:
    case MUSE_POT_SLEEPING:
    case MUSE_POT_ACID: {
        const [{ cansee }, { observe_object }, { pline }, { Monnam },
               { singular, doname }] = await Promise.all([
            import('./vision.js'), import('./o_init.js'),
            import('./display.js'), import('./do_name.js'),
            import('./objnam.js'),
        ]);

        if (cansee(mtmp.mx, mtmp.my)) {
            observe_object(obj);
            await pline(`${Monnam(mtmp)} hurls ${singular(obj, doname)}!`);
        }
        await m_throw(mtmp, mtmp.mx, mtmp.my,
                      sgn(mtmp.mux - mtmp.mx), sgn(mtmp.muy - mtmp.my),
                      distmin(mtmp.mx, mtmp.my, mtmp.mux, mtmp.muy), obj);
        return 2;
    }
    default:
        (game.unported ||= new Set()).add(
            `use_offensive:action=${game.m?.has_offense || 0}`);
        return 0;
    }
}

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
    const mdat = mtmp.data ?? game.mons[mtmp.mnum];
    const stuck = mtmp === game.u.ustuck;
    const immobile = mdat.mmove === 0;

    if (!game.m)
        game.m = {};
    game.m.defensive = null;
    game.m.has_defense = 0;

    if (is_animal(mdat) || mindless(mdat))
        return false;
    if (!tryescape && dist2(mtmp.mx, mtmp.my, mtmp.mux, mtmp.muy) > 25)
        return false;
    if (game.u.uswallow && stuck)
        return false;

    if (!tryescape) {
        const fraction = game.u.ulevel < 10 ? 5
                       : game.u.ulevel < 14 ? 4 : 3;
        if (mtmp.mhp >= mtmp.mhpmax
            || (mtmp.mhp >= 10 && mtmp.mhp * fraction >= mtmp.mhpmax))
            return false;
        if (mtmp.mpeaceful) {
            if (!nohands(mdat) && m_use_healing(mtmp))
                return true;
            return false;
        }
    }

    if (!stuck && !immobile && !mtmp.mtrapped) {
        const stway = stairway_at(mtmp.mx, mtmp.my);
        if (stway) {
            const sameDungeon = stway.tolev.dnum === game.u.uz.dnum;
            if (!sameDungeon) {
                if (stway.up || !is_floater(mdat))
                    game.m.has_defense = MUSE_SSTAIRS;
            } else if (stway.up) {
                game.m.has_defense = stway.isladder
                    ? MUSE_UP_LADDER : MUSE_UPSTAIRS;
            } else if (!is_floater(mdat)) {
                game.m.has_defense = stway.isladder
                    ? MUSE_DN_LADDER : MUSE_DOWNSTAIRS;
            }
            if (game.m.has_defense)
                return true;
        }
    }

    if (nohands(mdat))
        return false;

    for (const obj of (mtmp.minvent || [])) {
        if (game.m.has_defense && !rn2(3))
            break;
        if (game.m.has_defense === MUSE_POT_FULL_HEALING)
            continue;
        if (obj.otyp === ONAMES.POT_FULL_HEALING) {
            game.m.defensive = obj;
            game.m.has_defense = MUSE_POT_FULL_HEALING;
        }
        if (game.m.has_defense === MUSE_POT_EXTRA_HEALING)
            continue;
        if (obj.otyp === ONAMES.POT_EXTRA_HEALING) {
            game.m.defensive = obj;
            game.m.has_defense = MUSE_POT_EXTRA_HEALING;
        }
        if (game.m.has_defense === MUSE_POT_HEALING)
            continue;
        if (obj.otyp === ONAMES.POT_HEALING) {
            game.m.defensive = obj;
            game.m.has_defense = MUSE_POT_HEALING;
        }
        if (game.m.has_defense === MUSE_SCR_CREATE_MONSTER)
            continue;
        if (obj.otyp === ONAMES.SCR_CREATE_MONSTER) {
            game.m.defensive = obj;
            game.m.has_defense = MUSE_SCR_CREATE_MONSTER;
        }
    }
    return !!game.m.has_defense;
}

async function defensive_precheck(mtmp, obj) {
    if (!obj)
        return 0;
    const descr = game.obj_descr?.[game.objects[obj.otyp].oc_descr_idx]
        ?.oc_descr;
    const occupant = descr === 'milky' ? PMNAMES.PM_GHOST
                   : descr === 'smoky' ? PMNAMES.PM_DJINNI : NON_PM;
    if (occupant !== NON_PM) {
        const vital = game.mvitals?.[occupant] || {};
        if (!(vital.mvflags & G_GONE)
            && !rn2(13 + 2 * (vital.born ?? 0))) {
            (game.unported ||= new Set()).add(
                'muse:defensive_precheck:potion_occupant');
            m_useup_misc(mtmp, obj);
            return 2;
        }
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
async function mzapwand_self(mtmp, obj) {
    if (!obj || obj.spe < 1)
        return false;
    const [{ canseemon, pline }, { couldsee }, { You_hear },
           { Monnam, mon_nam_too }, { doname, makeplural, vtense },
           { unknow_object }] = await Promise.all([
        import('./display.js'), import('./vision.js'), import('./pline.js'),
        import('./do_name.js'), import('./objnam.js'), import('./mkobj.js'),
    ]);

    if (!canseemon(mtmp)) {
        const range = couldsee(mtmp.mx, mtmp.my) ? 9 : 5;
        const nearby = dist2(mtmp.mx, mtmp.my, game.u.ux, game.u.uy)
                       <= range * range;
        await You_hear(`a ${nearby ? 'nearby' : 'distant'} zap.`);
        unknow_object(obj);
    } else {
        let who = Monnam(mtmp);
        const self = mon_nam_too(mtmp, mtmp);
        const verb = vtense(self, 'zap');
        if (verb === 'zap')
            who = who === 'It' ? 'They' : makeplural(who);
        await pline(`${who} ${verb} ${self} with ${doname(obj)}!`);
    }
    obj.spe--;
    return true;
}

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
    const obj = game.m?.defensive || null;
    const action = game.m?.has_defense || 0;
    const checked = await defensive_precheck(mtmp, obj);
    if (checked)
        return checked;

    if (action === MUSE_UPSTAIRS || action === MUSE_DOWNSTAIRS
        || action === MUSE_UP_LADDER || action === MUSE_DN_LADDER
        || action === MUSE_SSTAIRS) {
        const stway = stairway_at(mtmp.mx, mtmp.my);
        if (!stway)
            return 0;

        if (!mtmp.mflee && !mtmp.iswiz) {
            const fleetim = 33
                - Math.trunc(30 * mtmp.mhp / Math.max(1, mtmp.mhpmax));
            if (fleetim)
                monflee(mtmp, fleetim, false, false);
        }

        const [{ canseemon, pline }, { Monnam }, { migrate_monster }]
            = await Promise.all([
                import('./display.js'), import('./do_name.js'),
                import('./trap.js'),
            ]);
        const dgn = game.dungeons?.[game.u.uz.dnum];
        const ledger = (dgn?.ledger_start ?? 0) + game.u.uz.dlevel;
        if (action === MUSE_SSTAIRS && ledger === 1) {
            const special = (mtmp.minvent || []).some(item =>
                item.otyp === ONAMES.AMULET_OF_YENDOR
                || item.otyp === ONAMES.BELL_OF_OPENING
                || item.otyp === ONAMES.CANDELABRUM_OF_INVOCATION
                || item.otyp === ONAMES.SPE_BOOK_OF_THE_DEAD);
            if (special
                || (mtmp.iswiz
                    && (game.context?.no_of_wizards ?? 0) < 2))
                return 0;
            if (canseemon(mtmp))
                await pline(`${Monnam(mtmp)} escapes the dungeon!`);
            const { mongone } = await import('./mon.js');
            mongone(mtmp);
            return 2;
        }
        if (canseemon(mtmp)) {
            let route;
            if (action === MUSE_SSTAIRS)
                route = `${stway.up ? 'up' : 'down'}stairs`;
            else if (stway.isladder)
                route = `${stway.up ? 'up' : 'down'} the ladder`;
            else
                route = `${stway.up ? 'up' : 'down'}stairs`;
            await pline(`${Monnam(mtmp)} escapes ${route}!`);
        }

        const arrival = action === MUSE_SSTAIRS ? MIGR_SSTAIRS
            : action === MUSE_UPSTAIRS ? MIGR_STAIRS_DOWN
            : action === MUSE_DOWNSTAIRS ? MIGR_STAIRS_UP
            : action === MUSE_UP_LADDER ? MIGR_LADDER_DOWN
            : MIGR_LADDER_UP;
        migrate_monster(mtmp, stway.tolev, arrival);
        return 2;
    }

    if (action === MUSE_SCR_CREATE_MONSTER) {
        if (!obj)
            return 0;
        let count = 1;
        if (!rn2(73))
            count += rnd(4);
        if (mtmp.mconf || obj.cursed)
            count += 12;

        const { is_pool } = await import('./mon.js');
        let monsterType = null;
        let locationType = null;
        if (mtmp.mconf) {
            monsterType = locationType = game.mons[PMNAMES.PM_ACID_BLOB];
        } else if (is_pool(mtmp.mx, mtmp.my)) {
            locationType = game.mons[game.u.uinwater
                ? PMNAMES.PM_GIANT_EEL : PMNAMES.PM_CROCODILE];
        }

        const messaged = await mreadmsg(mtmp, obj);
        const { enexto } = await import('./teleport.js');
        const { makemon } = await import('./makemon.js');
        const { canspotmon } = await import('./display.js');
        let known = false;
        while (count-- > 0) {
            const cc = { x: 0, y: 0 };
            if (!enexto(cc, mtmp.mx, mtmp.my, locationType))
                break;
            const mon = makemon(monsterType, cc.x, cc.y, 0);
            if (mon && canspotmon(mon))
                known = true;
        }

        if (known) {
            const { makeknown } = await import('./o_init.js');
            makeknown(obj.otyp);
        } else if (messaged) {
            const { trycall } = await import('./do_name.js');
            await trycall(obj);
        }
        m_useup_misc(mtmp, obj);
        return 2;
    }
    if (action !== MUSE_POT_HEALING
        && action !== MUSE_POT_EXTRA_HEALING
        && action !== MUSE_POT_FULL_HEALING)
        return 0;

    const [{ bcsign }, { healmon }, { canseemon, pline }, { Monnam }]
        = await Promise.all([
            import('./mkobj.js'), import('./mon.js'),
            import('./display.js'), import('./do_name.js'),
        ]);
    const vismon = canseemon(mtmp);
    await mquaffmsg(mtmp, obj);

    if (action === MUSE_POT_HEALING) {
        healmon(mtmp, d(6 + 2 * bcsign(obj), 4), 1);
        if (vismon)
            await pline(`${Monnam(mtmp)} looks better.`);
    } else if (action === MUSE_POT_EXTRA_HEALING) {
        healmon(mtmp, d(6 + 2 * bcsign(obj), 8), obj.blessed ? 5 : 2);
        if (vismon)
            await pline(`${Monnam(mtmp)} looks much better.`);
    } else {
        healmon(mtmp, mtmp.mhpmax, obj.blessed ? 8 : 4);
        if (vismon)
            await pline(`${Monnam(mtmp)} looks completely healed.`);
    }
    m_useup_misc(mtmp, obj);
    return 2;
}

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
            await mzapwand_self(mtmp, obj);
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

        await mzapwand_self(mtmp, obj);
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
