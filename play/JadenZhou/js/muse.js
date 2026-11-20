// muse.js — monsters using items: find_defensive(), find_offensive().
// C ref: muse.c.  The use_*() halves and paths that aren't ported yet
// throw a 'not ported yet' error instead of skipping their rolls.

import { game } from './gstate.js';
import { rn2 } from './rng.js';
import { dist2, isok } from './hacklib.js';
import { m_at, sobj_at, u_at } from './makemon.js';
import { t_at } from './trap.js';
import { monsndx, is_floater, passes_walls, dmgtype, haseyes,
         mon_knows_traps } from './mondata.js';
import { monnear } from './mon.js';
import { onscary, lined_up, in_your_sanctuary } from './monmove.js';
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
import { Is_container } from './mkobj.js';
import { STAIRS, LADDER, TELEP_TRAP, WEB, BEAR_TRAP, is_hole, is_pit,
         M_SEEN_REFL, M_SEEN_MAGR, M_SEEN_SLEEP, M_SEEN_FIRE, M_SEEN_COLD,
         M_SEEN_ELEC, M_SEEN_ACID, POLY_TRAP, MFAST, NON_PM,
         SEE_INVIS } from './const.js';

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

/* monster inventory: makemon.js keeps mon->minvent as an array in pickup
   order; C prepends, so walk it newest first */
function minv(mon) { return (mon.minvent || []).slice().reverse(); }

/* mondata.h */
function is_animal(ptr) { return (ptr.mflags1 & M.M1_ANIMAL) !== 0; }
function mindless(ptr) { return (ptr.mflags1 & M.M1_MINDLESS) !== 0; }
function nohands(ptr) { return (ptr.mflags1 & M.M1_NOHANDS) !== 0; }
function verysmall(ptr) { return ptr.msize < M.MZ_SMALL; }
function throws_rocks(ptr) { return (ptr.mflags2 & M.M2_ROCKTHROW) !== 0; }
function is_mercenary(ptr) { return (ptr.mflags2 & M.M2_MERC) !== 0; }
function likes_gems(ptr) { return (ptr.mflags2 & M.M2_JEWELS) !== 0; }
function is_unicorn(ptr) { return ptr.mlet === M.S_UNICORN && likes_gems(ptr); }
function touch_petrifies(ptr) {
    return ptr === mons[M.PM_COCKATRICE] || ptr === mons[M.PM_CHICKATRICE];
}
/* C ref: mondata.h NODIAG() */
function NODIAG(monnum) { return monnum === M.PM_GRID_BUG; }
/* C ref: monst.h helpless() */
function helpless(mon) { return !!(mon.msleeping || !mon.mcanmove); }
/* C ref: youprop.h See_invisible -- (HSee_invisible || ESee_invisible) */
function See_invisible() {
    const p = game.u.uprops[SEE_INVIS];
    return !!(p.intrinsic || p.extrinsic);
}
/* C ref: mondata.c attacktype() */
function attacktype(ptr, atyp) {
    return ptr.mattk.some(a => a.aatyp === atyp);
}
/* C ref: monst.h m_seenres() */
function m_seenres(mon, mask) { return (mon.seen_resistance || 0) & mask; }
/* C ref: hack.h m_next2u() */
function m_next2u(mon) {
    return Math.abs(mon.mx - game.u.ux) <= 1 && Math.abs(mon.my - game.u.uy) <= 1;
}

// C ref: mthrowu.c m_carrying()
function m_carrying(mtmp, type) {
    for (const otmp of minv(mtmp))
        if (otmp.otyp === type) return otmp;
    return null;
}

// C ref: stairs.c stairway_at()
function stairway_at(x, y) {
    for (let s = game.stairs; s; s = s.next)
        if (s.sx === x && s.sy === y) return s;
    return null;
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
        throw new Error('cures_stoning(): slimeproof() not ported yet');
    if (obj.otyp !== CORPSE && (obj.otyp !== TIN || !tinok))
        return false;
    /* corpse, or tin that mon can open */
    if (obj.corpsenm === NON_PM) /* empty/special tin */
        return false;
    return (obj.corpsenm === M.PM_LIZARD
            || (mons[obj.corpsenm].mflags1 & M.M1_ACID) !== 0); /* acidic() */
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
    if (tryescape && game.level.flags?.is_knox /* Is_knox(&u.uz) */)
        throw new Error('find_defensive(): Fort Ludios m_next2m() not ported yet');
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
        if (liztin)
            throw new Error('find_defensive(): mcould_eat_tin() not ported yet');
    }

    /* check specifically for healing alone when blind (healing cures
       blindness); Pestilence won't use healing even when blind */
    if (!mtmp.mcansee && !nohands(mtmp.data)
        && mtmp.data !== mons[M.PM_PESTILENCE]) {
        if (m_use_healing(mtmp))
            return true;
    }

    /* use a wand of undead turning against a cockatrice-corpse wielder */
    if (!mtmp.mpeaceful && !nohands(mtmp.data)
        && game.uwep && game.uwep.otyp === CORPSE
        && touch_petrifies(mons[game.uwep.corpsenm]))
        throw new Error('find_defensive(): undead turning vs corpse wielder not ported yet');

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
                && !mtmp.isshk && !mtmp.isgd && !mtmp.ispriest)
                throw new Error('find_defensive(): trap door escape (Can_fall_thru()) not ported yet');
            else if (t.ttyp === TELEP_TRAP) {
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
            && !is_floater(mtmp.data))
            throw new Error('find_defensive(): wand of digging checks not ported yet');
        if (game.m_has_defense === MUSE_WAN_TELEPORTATION_SELF) continue;
        if (game.m_has_defense === MUSE_WAN_TELEPORTATION) continue;
        if (o.otyp === WAN_TELEPORTATION && o.spe > 0)
            throw new Error('find_defensive(): wand of teleportation (noteleport_level()) not ported yet');
        if (game.m_has_defense === MUSE_SCR_TELEPORTATION) continue;
        if (o.otyp === SCR_TELEPORTATION && mtmp.mcansee
            && haseyes(mtmp.data))
            throw new Error('find_defensive(): scroll of teleportation (noteleport_level()) not ported yet');

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
export async function use_defensive(mtmp) {
    void mtmp;
    throw new Error('use_defensive() not ported yet');
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
    /* mtmp_helmet = which_armor(mtmp, W_ARMH): only SCR_EARTH uses it */
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
            if (obj.otyp === FIRE_HORN && obj.spe > 0)
                throw new Error('find_offensive(): can_blow() not ported yet');
            if (game.m_has_offense === MUSE_WAN_COLD) continue;
            if (obj.otyp === WAN_COLD && obj.spe > 0
                && !m_seenres(mtmp, M_SEEN_COLD)) {
                game.m_offensive = obj;
                game.m_has_offense = MUSE_WAN_COLD;
            }
            if (game.m_has_offense === MUSE_FROST_HORN) continue;
            if (obj.otyp === FROST_HORN && obj.spe > 0)
                throw new Error('find_offensive(): can_blow() not ported yet');
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
        /* m_use_undead_turning(mtmp, obj) */
        if (obj.otyp === WAN_UNDEAD_TURNING)
            throw new Error('find_offensive(): m_use_undead_turning() not ported yet');
        if (game.m_has_offense === MUSE_WAN_STRIKING) continue;
        if (obj.otyp === WAN_STRIKING && obj.spe > 0
            && !m_seenres(mtmp, M_SEEN_MAGR)) {
            game.m_offensive = obj;
            game.m_has_offense = MUSE_WAN_STRIKING;
        }
        if (game.m_has_offense === MUSE_WAN_TELEPORTATION) continue;
        if (obj.otyp === WAN_TELEPORTATION && obj.spe > 0)
            throw new Error('find_offensive(): wand of teleportation checks not ported yet');
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
        if (game.m_has_offense === MUSE_SCR_EARTH) continue;
        if (obj.otyp === SCR_EARTH)
            throw new Error('find_offensive(): scroll of earth checks not ported yet');
        if (game.m_has_offense === MUSE_CAMERA) continue;
        if (obj.otyp === EXPENSIVE_CAMERA)
            throw new Error('find_offensive(): expensive camera checks not ported yet');
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
export function find_misc(mtmp) {
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
                        if (t.ttyp === POLY_TRAP)
                            throw new Error('find_misc(): polymorph trap (wearing_iron_shoes()) not ported yet');
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
            && !u.uswallow)
            throw new Error('find_misc(): canletgo() for MUSE_BULLWHIP not ported yet');
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

// C ref: muse.c use_misc()
export async function use_misc(mtmp) {
    void mtmp;
    throw new Error('use_misc() not ported yet');
}

// C ref: muse.c use_offensive()
export async function use_offensive(mtmp) {
    void mtmp;
    throw new Error('use_offensive() not ported yet');
}

void m_next2u; void mon_knows_traps;
