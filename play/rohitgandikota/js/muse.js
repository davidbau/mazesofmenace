// muse.js — monsters using items.
// C ref: src/muse.c
//
// Only the offensive-item selector lives here so far. find_offensive() is
// what dochug()'s post-move gate and mattacku()'s pre-attack check call; the
// far larger find_defensive()/use_*() machinery is still absent and its
// absence is recorded at the call sites that would need it.
//
// gm.m (the muse selection struct) is game.m here; find_offensive() resets
// the offensive slice at its head exactly as C does.

import { game } from './gstate.js';
import { rn2 } from './rng.js';
import { sgn, dist2 } from './hacklib.js';
import { ONAMES } from './objects_data.js';
import { ATTKS } from './monst_data.js';
import { is_animal, mindless, nohands, dmgtype, can_blow, amorphous,
         passes_walls, noncorporeal, unsolid, haseyes, hates_light,
         resists_blnd, attacktype } from './mondata.js';
import { in_your_sanctuary, lined_up, monnear, onscary, mon_knows_traps,
         mon_would_take_item, accessible } from './monmove.js';
import { which_armor } from './worn.js';
import { hard_helmet } from './do_wear.js';
import { noteleport_level } from './teleport.js';
import { stairway_at } from './stairs.js';
import { carrying, sobj_at } from './invent.js';
import { m_at } from './mon.js';
import { linedup_callback } from './mthrowu.js';
import { Teleport_control } from './youprop.js';
import { xytodir, dirtocoord } from './cmd.js';
import { isok, W_ARMH, M_SEEN_REFL, M_SEEN_MAGR, M_SEEN_SLEEP, M_SEEN_FIRE,
         M_SEEN_COLD, M_SEEN_ELEC, M_SEEN_ACID, TELEP_TRAP, N_DIRS,
         Is_rogue_level, In_endgame, Is_earthlevel } from './const.js';

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

// include/monst.h:89 m_seenres()
const m_seenres = (mon, mask) => ((mon.seen_resistance ?? 0) & mask);

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
            if (!nomore(MUSE_WAN_DEATH)
                && obj.otyp === ONAMES.WAN_DEATH && obj.spe > 0
                && !m_seenres(mtmp, M_SEEN_MAGR)) {
                game.m.offensive = obj;
                game.m.has_offense = MUSE_WAN_DEATH;
            }
            if (!nomore(MUSE_WAN_SLEEP)
                && obj.otyp === ONAMES.WAN_SLEEP && obj.spe > 0
                && game.multi >= 0
                && !m_seenres(mtmp, M_SEEN_SLEEP)) {
                game.m.offensive = obj;
                game.m.has_offense = MUSE_WAN_SLEEP;
            }
            if (!nomore(MUSE_WAN_FIRE)
                && obj.otyp === ONAMES.WAN_FIRE && obj.spe > 0
                && !m_seenres(mtmp, M_SEEN_FIRE)) {
                game.m.offensive = obj;
                game.m.has_offense = MUSE_WAN_FIRE;
            }
            if (!nomore(MUSE_FIRE_HORN)
                && obj.otyp === ONAMES.FIRE_HORN && obj.spe > 0
                && can_blow(mtmp)
                && !m_seenres(mtmp, M_SEEN_FIRE)) {
                game.m.offensive = obj;
                game.m.has_offense = MUSE_FIRE_HORN;
            }
            if (!nomore(MUSE_WAN_COLD)
                && obj.otyp === ONAMES.WAN_COLD && obj.spe > 0
                && !m_seenres(mtmp, M_SEEN_COLD)) {
                game.m.offensive = obj;
                game.m.has_offense = MUSE_WAN_COLD;
            }
            if (!nomore(MUSE_FROST_HORN)
                && obj.otyp === ONAMES.FROST_HORN && obj.spe > 0
                && can_blow(mtmp)
                && !m_seenres(mtmp, M_SEEN_COLD)) {
                game.m.offensive = obj;
                game.m.has_offense = MUSE_FROST_HORN;
            }
            if (!nomore(MUSE_WAN_LIGHTNING)
                && obj.otyp === ONAMES.WAN_LIGHTNING && obj.spe > 0
                && !m_seenres(mtmp, M_SEEN_ELEC)) {
                game.m.offensive = obj;
                game.m.has_offense = MUSE_WAN_LIGHTNING;
            }
            if (!nomore(MUSE_WAN_MAGIC_MISSILE)
                && obj.otyp === ONAMES.WAN_MAGIC_MISSILE && obj.spe > 0
                && !m_seenres(mtmp, M_SEEN_MAGR)) {
                game.m.offensive = obj;
                game.m.has_offense = MUSE_WAN_MAGIC_MISSILE;
            }
        }
        if (!nomore(MUSE_WAN_UNDEAD_TURNING))
            m_use_undead_turning(mtmp, obj);
        if (!nomore(MUSE_WAN_STRIKING)
            && obj.otyp === ONAMES.WAN_STRIKING && obj.spe > 0
            && !m_seenres(mtmp, M_SEEN_MAGR)) {
            game.m.offensive = obj;
            game.m.has_offense = MUSE_WAN_STRIKING;
        }
        if (!nomore(MUSE_WAN_TELEPORTATION)
            && obj.otyp === ONAMES.WAN_TELEPORTATION && obj.spe > 0
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
        if (!nomore(MUSE_POT_PARALYSIS)
            && obj.otyp === ONAMES.POT_PARALYSIS && game.multi >= 0) {
            game.m.offensive = obj;
            game.m.has_offense = MUSE_POT_PARALYSIS;
        }
        if (!nomore(MUSE_POT_BLINDNESS)
            && obj.otyp === ONAMES.POT_BLINDNESS
            && !attacktype(mdat, ATTKS.AT_GAZE)) {
            game.m.offensive = obj;
            game.m.has_offense = MUSE_POT_BLINDNESS;
        }
        if (!nomore(MUSE_POT_CONFUSION)
            && obj.otyp === ONAMES.POT_CONFUSION) {
            game.m.offensive = obj;
            game.m.has_offense = MUSE_POT_CONFUSION;
        }
        if (!nomore(MUSE_POT_SLEEPING)
            && obj.otyp === ONAMES.POT_SLEEPING
            && !m_seenres(mtmp, M_SEEN_SLEEP)) {
            game.m.offensive = obj;
            game.m.has_offense = MUSE_POT_SLEEPING;
        }
        if (!nomore(MUSE_POT_ACID)
            && obj.otyp === ONAMES.POT_ACID
            && !m_seenres(mtmp, M_SEEN_ACID)) {
            game.m.offensive = obj;
            game.m.has_offense = MUSE_POT_ACID;
        }
        /* we can safely put this scroll here since the locations that
         * are in a 1 square radius are a subset of the locations that
         * are in wand or throwing range (in other words, always lined_up())
         */
        if (!nomore(MUSE_SCR_EARTH)
            && obj.otyp === ONAMES.SCR_EARTH
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
        if (!nomore(MUSE_CAMERA)
            && obj.otyp === ONAMES.EXPENSIVE_CAMERA
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
