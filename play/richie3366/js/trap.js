// trap.js — Trap creation + monster-step subset.
// C ref: trap.c — maketrap/choose_trapnote/hole_destination/trapnote,
// t_at, t_missile, thitm, mintrap, trapeffect_dart_trap / trapeffect_pit /
// trapeffect_rocktrap / trapeffect_sqky_board (monster), make_corpse
// ordinary path via thitm death.

import { game } from './gstate.js';
import { rn2, rnd, d } from './rng.js';
import {
    mksobj, place_object, weight, stackobj, mkcorpstat, relobj_on_death,
} from './mkobj.js';
import { find_mac } from './mhitm.js';
import { newsym, pline, mon_visible, see_with_infrared } from './display.js';
import { doname, an } from './objnam.js';
import { Monnam, x_monnam_tame } from './do_name.js';
import { dist2 } from './mon.js';
import { cansee, couldsee } from './vision.js';
import {
    G_NOCORPSE, G_FREQ, G_UNIQ, verysmall, grounded, passes_walls, is_neuter,
    is_flyer, is_floater, is_clinger,
    mon_knows_traps, mon_learns_traps,
} from './monsters.js';
import {
    DART_TRAP, ROCKTRAP, FORCETRAP, FORCEBUNGLE,
    SQKY_BOARD, HOLE, TRAPDOOR, TRAPPED_DOOR, TRAPPED_CHEST,
    PIT, SPIKED_PIT, STATUE_TRAP, MAGIC_TRAP, is_hole, In_quest,
    CORPSTAT_INIT, CORPSTAT_FEMALE, CORPSTAT_MALE, CORPSTAT_NONE,
    ER_NOTHING, ER_DAMAGED, ER_DESTROYED,
    LOW_PM, BOLT_LIM, STRAT_WAITMASK,
} from './const.js';
import { objectNames, POTION_CLASS, SCROLL_CLASS, SPBOOK_CLASS } from './objects.js';

const DART = objectNames.indexOf('DART');
const ROCK = objectNames.indexOf('ROCK');
const CORPSE = objectNames.indexOf('CORPSE');
const AD_PHYS = 0;

// C ref: trap.h enum trap_result
export const Trap_Effect_Finished = 0;
export const Trap_Is_Gone = 1;
export const Trap_Killed_Mon = 2;
export const Trap_Caught_Mon = 3;
export const Trap_Moved_Mon = 4;

export const NO_TRAP_FLAGS = 0;

/**
 * C ref: trap.c m_harmless_trap — whether mfndpos may ignore this trap.
 * Envelope: SQKY/PIT/DART/… harmful (false); STATUE/MAGIC usually true.
 * Named omission: flyer/Sokoban/bear-size/resist per-type immunities.
 */
export function m_harmless_trap(_mtmp, ttmp) {
    if (!ttmp) return true;
    if (ttmp.ttyp === STATUE_TRAP || ttmp.ttyp === MAGIC_TRAP) return true;
    return false;
}

// C ref: dungeon.c dunlev / dunlevs_in_dungeon / In_hell
function dunlev(lev) {
    return lev?.dlevel ?? 1;
}
function dunlevs_in_dungeon(lev) {
    return game.dungeons?.[lev?.dnum]?.num_dunlevs ?? 1;
}
function dunlev_reached(lev) {
    return game.dungeons?.[lev?.dnum]?.dunlev_ureached ?? 0;
}
function In_hell(lev) {
    return !!(game.dungeons?.[lev?.dnum]?.flags?.hellish);
}

// C ref: trap.c dng_bottom — quest locate / Gehennom invocation cutoffs
function dng_bottom(lev) {
    let bottom = dunlevs_in_dungeon(lev);
    if (In_quest(lev)) {
        const qlocate_depth = game.qlocate_level?.dlevel;
        if (qlocate_depth != null && dunlev_reached(lev) < qlocate_depth) {
            bottom = qlocate_depth;
        }
    } else if (In_hell(lev)) {
        if (!game.u?.uevent?.invoked) bottom -= 1;
    }
    return bottom;
}

// C ref: trap.c hole_destination
export function hole_destination(dst) {
    const uz = game.u?.uz ?? { dnum: 0, dlevel: 1 };
    const bottom = dng_bottom(uz);
    dst.dnum = uz.dnum;
    dst.dlevel = dunlev(uz);
    while (dst.dlevel < bottom) {
        dst.dlevel++;
        if (rn2(4)) break;
    }
}

// C ref: trap.c choose_trapnote — unused squeaky-board note, else rn2(12)
export function choose_trapnote(ttmp) {
    const tavail = new Array(12).fill(0);
    const tpick = new Array(12).fill(0);
    let tcnt = 0;
    const traps = game.level?.traps;
    if (traps) {
        for (const t of traps) {
            if (t && t.ttyp === SQKY_BOARD && t !== ttmp) {
                tavail[t.tnote | 0] = 1;
            }
        }
    }
    for (let k = 0; k < 12; ++k) {
        if (tavail[k] === 0) tpick[tcnt++] = k;
    }
    return tcnt > 0 ? tpick[rn2(tcnt)] : rn2(12);
}

// C ref: trap.c maketrap — creation + SQKY_BOARD / HOLE|TRAPDOOR RNG path.
// Named omissions: overwrite/furniture/terrain gates, statue/boulder launch,
// pit conjoined/shop damage/terrain morph, Sokoban finish.
// TELEP teledest may be set by caller after create (themerms make_a_trap).
export function maketrap(x, y, typ) {
    if (typ === TRAPPED_DOOR || typ === TRAPPED_CHEST) return null;

    let ttmp = t_at(x, y);
    let oldplace = false;
    if (ttmp) {
        oldplace = true;
    } else {
        ttmp = {
            ttyp: typ,
            tx: x,
            ty: y,
            tseen: false,
            once: false,
            madeby_u: 0,
            tnote: 0,
            conjoined: 0,
            launch: { x: -1, y: -1 },
            teledest: { x: -1, y: -1 },
            dst: { dnum: -1, dlevel: -1 },
            ntrap: null,
        };
    }
    ttmp.launch = { x: -1, y: -1 };
    ttmp.teledest = { x: -1, y: -1 };
    ttmp.dst = { dnum: -1, dlevel: -1 };
    ttmp.madeby_u = 0;
    ttmp.once = 0;
    ttmp.tseen = false;
    ttmp.ttyp = typ;

    switch (typ) {
    case SQKY_BOARD:
        ttmp.tnote = choose_trapnote(ttmp);
        break;
    case HOLE:
    case TRAPDOOR:
        if (is_hole(typ)) hole_destination(ttmp.dst);
        break;
    default:
        break;
    }

    if (!oldplace) {
        if (!game.level) return ttmp;
        if (!game.level.traps) game.level.traps = [];
        game.level.traps.push(ttmp);
    }
    return ttmp;
}

// C ref: trap.c t_at()
export function t_at(x, y) {
    const traps = game.level?.traps;
    if (!traps) return null;
    for (const t of traps) {
        if (t && t.tx === x && t.ty === y) return t;
    }
    return null;
}

// C ref: trap.c t_missile() — single arrow/dart/rock for a trap
function t_missile(otyp, trap) {
    const otmp = mksobj(otyp, true, false);
    otmp.quan = 1;
    otmp.owt = weight(otmp);
    otmp.opoisoned = 0;
    otmp.ox = trap.tx;
    otmp.oy = trap.ty;
    return otmp;
}

// C ref: display.h _canseemon — real vision (was always-true stub).
function canseemon(mtmp) {
    if (!mtmp) return false;
    if (!(cansee(mtmp.mx, mtmp.my) || see_with_infrared(mtmp))) return false;
    return mon_visible(mtmp);
}

// C ref: mon.c m_in_air — flyer/floater; cling+ceiling mundetected deferred
function m_in_air(mtmp) {
    const ptr = mtmp?.data;
    if (!ptr) return false;
    if (is_flyer(ptr) || is_floater(ptr)) return true;
    return !!(is_clinger(ptr) && mtmp.mundetected);
}

// C ref: trap.c trapnote — "an F note" / "a C note" (+ noprefix bare name)
const TN_NAMES = [
    'C note', 'D flat', 'D note', 'E flat',
    'E note', 'F note', 'F sharp', 'G note',
    'G sharp', 'A note', 'B flat', 'B note',
];
function trapnote(trap, noprefix) {
    const tn = TN_NAMES[trap?.tnote | 0] || 'C note';
    return noprefix ? tn : an(tn);
}

// C ref: pline.c You_hear — acoustics/Deaf gate; Unaware/Underwater deferred
async function You_hear(line) {
    const u = game.u || {};
    const Unaware = (u.multi | 0) < 0 && !!u.usleep;
    if ((u.Deaf && !Unaware) || game.flags?.acoustics === false) return;
    if (u.Underwater) await pline(`You barely hear ${line}`);
    else if (Unaware) await pline(`You dream that you hear ${line}`);
    else await pline(`You hear ${line}`);
}

// C ref: mon.c wake_nearto — clear sleep/wait within dist2; zombies deferred
function wake_nearto(x, y, distance) {
    for (const mtmp of game.fmon || []) {
        if (!mtmp || mtmp.mx == null) continue;
        if (distance === 0 || dist2(mtmp.mx, mtmp.my, x, y) < distance) {
            mtmp.msleeping = 0;
            const geno = mtmp.data?.geno | 0;
            if (!(geno & G_UNIQ) && mtmp.mstrategy != null) {
                mtmp.mstrategy &= ~STRAT_WAITMASK;
            }
        }
    }
}

// C ref: mon.c corpse_chance — ordinary non-unique path
function corpse_chance(mon) {
    const mdat = mon.data;
    if (!mdat) return false;
    const tmp = 2 + (((mdat.geno ?? 0) & G_FREQ) < 2 ? 1 : 0)
        + (verysmall(mdat) ? 1 : 0);
    return !rn2(tmp);
}

// C ref: mon.c make_corpse default_1 — ordinary corpse via mkcorpstat
function make_corpse(mtmp) {
    const mdat = mtmp.data;
    const mndx = mtmp.mnum ?? mdat?.mndx;
    const x = mtmp.mx, y = mtmp.my;
    if (mndx == null || mndx < 0) return null;
    if ((game.mvitals?.[mndx]?.mvflags ?? 0) & G_NOCORPSE) return null;

    let corpstatflags = CORPSTAT_INIT | CORPSTAT_NONE;
    if (mtmp.female) corpstatflags |= CORPSTAT_FEMALE;
    else if (!is_neuter(mdat)) corpstatflags |= CORPSTAT_MALE;

    // C KEEPTRAITS: pets/shk/unique keep mtmp for traits — save_mtraits deferred
    const keep = !!(mtmp.mtame || mtmp.isshk);
    const obj = mkcorpstat(CORPSE, keep ? mtmp : null, mdat, x, y, corpstatflags);
    if (obj) {
        stackobj(obj);
        newsym(x, y);
    }
    return obj;
}

// C ref: mon.c mondead → m_detach(due_to_death) → relobj
function mondead(mtmp) {
    mtmp.mhp = 0;
    const mx = mtmp.mx, my = mtmp.my;
    const mndx = mtmp.mnum ?? mtmp.data?.mndx;
    if (mndx != null && mndx >= LOW_PM) {
        if (!game.mvitals) game.mvitals = [];
        const slot = game.mvitals[mndx] || (game.mvitals[mndx] = {
            mvflags: 0, born: 0, died: 0,
        });
        if ((slot.died | 0) < 255) slot.died = (slot.died | 0) + 1;
    }
    if (game.fmon) {
        const i = game.fmon.indexOf(mtmp);
        if (i >= 0) game.fmon.splice(i, 1);
    }
    relobj_on_death(mtmp);
    if (mx > 0) newsym(mx, my);
}

// C ref: mon.c mondied → mondead + maybe make_corpse
function mondied(mdef) {
    mondead(mdef);
    if ((mdef.mhp | 0) > 0) return; /* lifesaved */
    if (corpse_chance(mdef)) make_corpse(mdef);
}

// C ref: mon.c monkilled — trap fltxt path
async function monkilled(mdef, fltxt, _how) {
    const mptr = mdef.data;
    const txt = fltxt || '';
    if (cansee(mdef.mx, mdef.my)) {
        const verb = 'killed'; /* nonliving → destroyed deferred */
        void mptr;
        await pline(`${Monnam(mdef)} is ${verb}${txt ? ' by the ' : ''}${txt}!`);
    } else if (mdef.mtame) {
        game.iflags = game.iflags || {};
        game.iflags.sad_feeling = true;
    }
    mondied(mdef);
}

// C ref: trap.c mselftouch — petrify-wield only; no-op for ordinary pets
function mselftouch(_mon, _arg, _byplayer) {
    /* MON_WEP CORPSE + touch_petrifies deferred — no RNG when unbound */
}

// C ref: trap.c wearing_iron_shoes
function wearing_iron_shoes(_mtmp) {
    return false; /* which_armor W_ARMF deferred */
}

// C ref: trap.c thitm() — monster hit by trap missile / pit fall damage
async function thitm(tlev, mon, obj, d_override, nocorpse) {
    let strike;
    if (d_override) {
        strike = 1;
    } else if (obj) {
        strike = (find_mac(mon) + tlev + (obj.spe | 0) <= rnd(20)) ? 1 : 0;
    } else {
        strike = (find_mac(mon) + tlev <= rnd(20)) ? 1 : 0;
    }

    let trapkilled = false;
    if (!strike) {
        // C: pline before place_object — triggers --More-- after prior cursemsg
        if (obj && cansee(mon.mx, mon.my)) {
            await pline(`${Monnam(mon)} is almost hit by ${doname(obj)}!`);
        }
    } else {
        if (obj && cansee(mon.mx, mon.my)) {
            await pline(`${Monnam(mon)} is hit by ${doname(obj)}!`);
        }
        let dam = 1;
        if (d_override) {
            dam = d_override;
        } else if (obj) {
            // C: dam = dmgval(obj, mon); clamp to >= 1 — stub 1 until dmgval ported
            dam = 1;
        }
        mon.mhp = (mon.mhp || 0) - dam;
        if (mon.mhp <= 0) {
            const xx = mon.mx, yy = mon.my;
            await monkilled(mon, '', nocorpse ? -AD_PHYS /* -AD_RBRE */ : AD_PHYS);
            if ((mon.mhp | 0) <= 0) {
                newsym(xx, yy);
                trapkilled = true;
            }
            if (obj) { /* dealloc_obj stub */ }
            // place_object only when !strike || d_override — see below
        } else if (obj) {
            /* dealloc_obj stub — missile used up on hit */
        }
    }

    // C: place missile on miss (or d_override path)
    if (obj && (!strike || d_override)) {
        place_object(obj, mon.mx, mon.my);
        stackobj(obj);
    }
    return trapkilled;
}

// C ref: trap.c seetrap()
export function seetrap(trap) {
    if (trap && !trap.tseen) {
        trap.tseen = true;
        newsym(trap.tx, trap.ty);
    }
}

/**
 * C ref: trap.c trapeffect_pit — monster branch (hero dotrap path deferred).
 * Envelope: grounded pets/monsters on PIT/SPIKED_PIT; Sokoban drag omitted;
 * flyer avoid; iron shoes clear spikes; thitm(rnd(6|10)) fall damage.
 */
async function trapeffect_pit(mtmp, trap, trflags) {
    const ttype = trap.ttyp;
    let relevant_spikes = ttype === SPIKED_PIT;
    const a_your = ['a', 'your'];

    // Hero youmonst branch (dotrap) named omission — mintrap is monster-only

    const in_sight = canseemon(mtmp) || (mtmp === game.u?.usteed);
    let trapkilled = false;
    const forcetrap = (trflags & FORCETRAP) !== 0;
    const Sokoban = !!(game.level?.flags?.sokoban || game.Sokoban);
    const inescapable = forcetrap || (Sokoban && !trap.madeby_u);
    const mptr = mtmp.data;
    let fallverb = 'falls';

    if (!grounded(mptr) || (mtmp.wormno && (mtmp.wormno | 0) > 5)) {
        if (forcetrap && !Sokoban) {
            if (in_sight) {
                seetrap(trap);
                await pline(`${Monnam(mtmp)} doesn't fall into the pit.`);
            }
            return Trap_Effect_Finished;
        }
        if (!inescapable) return Trap_Effect_Finished;
        fallverb = 'is dragged';
    }
    if (!passes_walls(mptr)) mtmp.mtrapped = 1;
    if (in_sight) {
        await pline(
            `${Monnam(mtmp)} ${fallverb} into ${a_your[trap.madeby_u ? 1 : 0]} pit!`,
        );
        seetrap(trap);
    }
    mselftouch(mtmp, 'Falling, ', false);
    if (wearing_iron_shoes(mtmp)) relevant_spikes = false;
    if ((mtmp.mhp | 0) <= 0
        || await thitm(0, mtmp, null, rnd(relevant_spikes ? 10 : 6), false)) {
        trapkilled = true;
    }
    return trapkilled ? Trap_Killed_Mon
        : (mtmp.mtrapped ? Trap_Caught_Mon : Trap_Effect_Finished);
}

// C ref: trap.c trapeffect_dart_trap — monster branch only
async function trapeffect_dart_trap(mtmp, trap) {
    // Hero branch omitted (named omission)
    if (trap.once && trap.tseen && !rn2(15)) {
        // deltrap omitted visually; remove from list
        const traps = game.level?.traps;
        if (traps) {
            const i = traps.indexOf(trap);
            if (i >= 0) traps.splice(i, 1);
        }
        newsym(mtmp.mx, mtmp.my);
        return Trap_Is_Gone;
    }
    trap.once = true;
    const otmp = t_missile(DART, trap);
    if (!rn2(6)) otmp.opoisoned = 1;
    // C: if (in_sight) seetrap(trap);
    seetrap(trap);
    const trapkilled = await thitm(7, mtmp, otmp, 0, false);
    return trapkilled ? Trap_Killed_Mon
        : (mtmp.mtrapped ? Trap_Caught_Mon : Trap_Effect_Finished);
}

/**
 * C ref: trap.c trapeffect_rocktrap — monster branch (hero dotrap deferred).
 * Envelope: once+tseen empty-door rn2(15)/deltrap; else t_missile(ROCK) +
 * thitm(..., d(2,6)); seetrap only when canseemon. Named omissions: hero
 * helmet/passes_rocks path; empty-door pline_mon text; stone_missile
 * harmless arm in thitm.
 */
async function trapeffect_rocktrap(mtmp, trap, _trflags) {
    const in_sight = canseemon(mtmp) || (mtmp === game.u?.usteed);

    if (trap.once && trap.tseen && !rn2(15)) {
        // C: pline_mon when in_sight && cansee — display only; omit body
        const traps = game.level?.traps;
        if (traps) {
            const i = traps.indexOf(trap);
            if (i >= 0) traps.splice(i, 1);
        }
        newsym(mtmp.mx, mtmp.my);
        return Trap_Is_Gone;
    }
    trap.once = true;
    const otmp = t_missile(ROCK, trap);
    if (in_sight) seetrap(trap);
    const trapkilled = await thitm(0, mtmp, otmp, d(2, 6), false);
    return trapkilled ? Trap_Killed_Mon
        : (mtmp.mtrapped ? Trap_Caught_Mon : Trap_Effect_Finished);
}

/**
 * C ref: trap.c trapeffect_sqky_board — monster branch (hero dotrap deferred).
 * Envelope: in-sight pline+seetrap; out-of-sight You_hear nearby|distance;
 * m_in_air skip; wake_nearto(40). Soundeffect no-op (no RNG).
 * Deaf+mindless silent cringe and hero Levitation/Flying named omissions.
 */
async function trapeffect_sqky_board(mtmp, trap, _trflags) {
    const in_sight = canseemon(mtmp) || (mtmp === game.u?.usteed);
    if (m_in_air(mtmp)) return Trap_Effect_Finished;

    if (in_sight) {
        if (!game.u?.Deaf) {
            await pline(
                `A board beneath ${x_monnam_tame(mtmp)} squeaks ${trapnote(trap, false)} loudly.`,
            );
            seetrap(trap);
        } else {
            await pline(
                `${Monnam(mtmp)} stops momentarily and appears to cringe.`,
            );
        }
    } else {
        // same near/far threshold as mzapmsg()
        const range = couldsee(mtmp.mx, mtmp.my)
            ? (BOLT_LIM + 1) : (BOLT_LIM - 3);
        const near = dist2(mtmp.mx, mtmp.my, game.u.ux, game.u.uy)
            <= range * range;
        await You_hear(
            `${trapnote(trap, false)} squeak ${near ? 'nearby' : 'in the distance'}.`,
        );
    }
    wake_nearto(mtmp.mx, mtmp.my, 40);
    return Trap_Effect_Finished;
}

// C ref: trap.c trapeffect_selector — dart/rock/pit/sqky; other types no-op
async function trapeffect_selector(mtmp, trap, trflags) {
    switch (trap.ttyp) {
    case DART_TRAP:
        return trapeffect_dart_trap(mtmp, trap);
    case ROCKTRAP:
        return trapeffect_rocktrap(mtmp, trap, trflags);
    case PIT:
    case SPIKED_PIT:
        return trapeffect_pit(mtmp, trap, trflags);
    case SQKY_BOARD:
        return trapeffect_sqky_board(mtmp, trap, trflags);
    default:
        // Named omission: arrow/bear/hole/… trap effects
        return Trap_Effect_Finished;
    }
}

/**
 * C ref: trap.c mintrap() — monster steps on a trap.
 * Early-session envelope: dart / rock / pit / sqky learn+effect; already_seen
 * rn2(4) skip when mon_knows_traps. Other types and escape paths partial.
 */
export async function mintrap(mtmp, mintrapflags = NO_TRAP_FLAGS) {
    const trap = t_at(mtmp.mx, mtmp.my);
    if (!trap) {
        mtmp.mtrapped = 0;
        return Trap_Effect_Finished;
    }
    if (mtmp.mtrapped) {
        // Already trapped escape path: C burns rn2(40) / easy_escape;
        // omit body — stay caught (named omission).
        return mtmp.mtrapped ? Trap_Caught_Mon : Trap_Effect_Finished;
    }

    const forcetrap = (mintrapflags & FORCETRAP) !== 0;
    const forcebungle = (mintrapflags & FORCEBUNGLE) !== 0;
    const tt = trap.ttyp;
    // C also treats HOLE && !mindless as already_seen — mindless helper deferred
    const already_seen = mon_knows_traps(mtmp, tt);

    if (!forcetrap) {
        // floor_trigger + check_in_air omitted (mons on floor)
        if (already_seen && rn2(4) && !forcebungle) {
            return Trap_Effect_Finished;
        }
    }

    // C: mon_learns_traps then mons_see_trap then trapeffect_selector
    mon_learns_traps(mtmp, tt);
    // mons_see_trap / madeby_u rnl omitted (no RNG on ordinary commons path)
    return await trapeffect_selector(mtmp, trap, mintrapflags);
}

const POT_WATER = objectNames.indexOf('POT_WATER');
const POT_ACID = objectNames.indexOf('POT_ACID');
const SCR_BLANK_PAPER = objectNames.indexOf('SCR_BLANK_PAPER');
const SPE_BLANK_PAPER = objectNames.indexOf('SPE_BLANK_PAPER');
const SPE_BOOK_OF_THE_DEAD = objectNames.indexOf('SPE_BOOK_OF_THE_DEAD');
const SPE_NOVEL = objectNames.indexOf('SPE_NOVEL');

/**
 * C ref: trap.c water_damage
 * Branch envelope: null / POT_WATER → ER_NOTHING; force skips luck rn2(20);
 * potion dilute / scroll fade / spellbook fade; else ER_NOTHING (erode_obj
 * rust body deferred — non-rustprone returns ER_NOTHING with no RNG).
 * Grease / towel / container / acid explosion named omitted.
 */
export function water_damage(obj, _ostr, force) {
    if (!obj) return ER_NOTHING;
    // splash_lit / CAN_OF_GREASE / TOWEL / greased / container deferred

    if (!force && ((game.u?.Luck | 0) + 5) > rn2(20)) {
        return ER_NOTHING;
    }

    if (obj.oclass === SCROLL_CLASS) {
        if (obj.otyp === SCR_BLANK_PAPER) return ER_NOTHING;
        obj.otyp = SCR_BLANK_PAPER;
        obj.dknown = 0;
        obj.spe = 0;
        return ER_DAMAGED;
    }
    if (obj.oclass === SPBOOK_CLASS) {
        if (obj.otyp === SPE_BOOK_OF_THE_DEAD) return ER_NOTHING;
        if (obj.otyp === SPE_BLANK_PAPER) return ER_NOTHING;
        const otyp = obj.otyp;
        obj.otyp = SPE_BLANK_PAPER;
        if (obj.spestudied) obj.spestudied = rn2(obj.spestudied);
        obj.dknown = 0;
        void otyp; // SPE_NOVEL blank_novel deferred
        void SPE_NOVEL;
        return ER_DAMAGED;
    }
    if (obj.oclass === POTION_CLASS) {
        if (obj.otyp === POT_ACID) {
            // pot_acid_damage deferred
            return ER_DESTROYED;
        }
        if (obj.odiluted) {
            obj.otyp = POT_WATER;
            obj.dknown = 0;
            obj.blessed = obj.cursed = false;
            obj.odiluted = 0;
            return ER_DAMAGED;
        }
        if (obj.otyp !== POT_WATER) {
            obj.odiluted = (obj.odiluted | 0) + 1;
            return ER_DAMAGED;
        }
        return ER_NOTHING;
    }
    // erode_obj(ERODE_RUST) — non-rustprone / !erosion_matters → ER_NOTHING
    return ER_NOTHING;
}
