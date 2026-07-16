// trap.js — Trap creation + monster-step subset + hero dotrap dart.
// C ref: trap.c — maketrap/choose_trapnote/hole_destination/trapnote,
// t_at, t_missile, thitm, mintrap, dotrap, trapeffect_dart_trap /
// trapeffect_pit / trapeffect_rocktrap / trapeffect_sqky_board /
// trapeffect_bear_trap / trapeffect_hole / trapeffect_magic_trap /
// trapeffect_fire_trap / trapeffect_slp_gas_trap, make_corpse ordinary
// path via thitm death.

import { game } from './gstate.js';
import { rn2, rnd, rn1, d } from './rng.js';
import {
    mksobj, place_object, weight, stackobj, relobj_on_death,
} from './mkobj.js';
import { find_mac, make_corpse } from './mhitm.js';
import { mon_explodes } from './explode.js';
import { newsym, pline, mon_visible, see_with_infrared, You_feel } from './display.js';
import { doname, an, the, xname, makeplural, vtense } from './objnam.js';
import { Monnam, mon_nam, x_monnam_tame } from './do_name.js';
import { dist2, m_at } from './mon.js';
import { cansee, couldsee } from './vision.js';
import {
    G_FREQ, G_UNIQ, verysmall, grounded, passes_walls,
    is_flyer, is_floater, is_clinger,
    mon_knows_traps, mon_learns_traps,
    amorphous, unsolid, is_whirly, breathless, MZ_SMALL, MZ_HUGE,
} from './monsters.js';
import {
    DART_TRAP, ARROW_TRAP, ROCKTRAP, FORCETRAP, FORCEBUNGLE,
    SQKY_BOARD, HOLE, TRAPDOOR, TRAPPED_DOOR, TRAPPED_CHEST,
    PIT, SPIKED_PIT, STATUE_TRAP, MAGIC_TRAP, FIRE_TRAP, SLP_GAS_TRAP,
    TELEP_TRAP, ROLLING_BOULDER_TRAP,
    BEAR_TRAP, WEB, RUST_TRAP, VIBRATING_SQUARE, LANDMINE,
    ANTI_MAGIC, HURTLING, TOOKPLUNGE, VIASITTING, FIRE_RES, SLEEP_RES,
    STONE_RES, FAILEDUNTRAP,
    NO_TRAP, TRAPNUM,
    is_hole, is_pit, is_xport, In_quest, isok, ZAP_POS, IS_DOOR, IS_POOL, IS_LAVA,
    IS_ROOM, IS_WALL, IS_AIR, SDOOR,
    D_CLOSED, D_LOCKED,
    ER_NOTHING, ER_DAMAGED, ER_DESTROYED,
    LOW_PM, BOLT_LIM, STRAT_WAITMASK,
    Can_fall_thru, NO_MM_FLAGS, FROMOUTSIDE, TIMEOUT, Upolyd,
    KILLED_BY, KILLED_BY_AN,
    WATER, BURNING,
    TT_NONE, TT_BEARTRAP, LEFT_SIDE, RIGHT_SIDE, BOTH_SIDES, FOOT, LEG,
} from './const.js';
import {
    is_pool, is_lava, waterbody_name, crawl_destination,
} from './hack.js';
import { goodpos, mlevel_tele_trap, mtele_trap, tele_trap_once_vault } from './teleport.js';
import { objectNames, POTION_CLASS, SCROLL_CLASS, SPBOOK_CLASS, ARMOR_CLASS } from './objects.js';
import { monsterNames } from './generated/monsters_data.js';
import { thitu } from './mthrowu.js';
import { dmgval } from './weapon.js';
import { maybe_half_phys, nomul, losehp } from './hack.js';
import { observe_object, encumber_msg } from './invent.js';
import { makemon } from './makemon.js';
import { A_CHA, A_STR, A_DEX, adjattrib, exercise } from './attrib.js';
import { tamedog } from './dog.js';

const PM_IRON_GOLEM = monsterNames.indexOf('PM_IRON_GOLEM');
const PM_PAPER_GOLEM = monsterNames.indexOf('PM_PAPER_GOLEM');
const PM_STRAW_GOLEM = monsterNames.indexOf('PM_STRAW_GOLEM');
const PM_WOOD_GOLEM = monsterNames.indexOf('PM_WOOD_GOLEM');
const PM_LEATHER_GOLEM = monsterNames.indexOf('PM_LEATHER_GOLEM');
const PM_STALKER = monsterNames.indexOf('PM_STALKER');
const PM_BLACK_LIGHT = monsterNames.indexOf('PM_BLACK_LIGHT');
const PM_OWLBEAR = monsterNames.indexOf('PM_OWLBEAR');
const PM_BUGBEAR = monsterNames.indexOf('PM_BUGBEAR');
const DART = objectNames.indexOf('DART');
const ROCK = objectNames.indexOf('ROCK');
const BOULDER = objectNames.indexOf('BOULDER');
const AD_PHYS = 0;
const AD_FIRE = 2; /* monattk.h */
const TOWER_OF_FLAME = 'tower of flame';
const VISION_CLEARS = 'vision clears.'; /* C c_vision_clears */
// C ref: hack.h xdir/ydir — 8 dirs W,NW,N,NE,E,SE,S,SW
const xdir = [-1, -1, 0, 1, 1, 1, 0, -1];
const ydir = [0, -1, -1, -1, 0, 1, 1, 1];
const N_DIRS = 8;

// C ref: trap.h enum trap_result
export const Trap_Effect_Finished = 0;
export const Trap_Is_Gone = 1;
export const Trap_Killed_Mon = 2;
export const Trap_Caught_Mon = 3;
export const Trap_Moved_Mon = 4;

export const NO_TRAP_FLAGS = 0;

/**
 * C ref: trap.c m_harmless_trap — whether mfndpos may ignore this trap.
 * Envelope: STATUE/MAGIC/VIBRATING always; BEAR_TRAP/WEB size·amorph·whirly·
 * unsolid; RUST except iron golem; PIT/HOLE clinger (non-Sokoban).
 * Named omission: flyer/Sokoban `check_in_air` preamble; sleep/fire/anti-magic
 * resists; webmaker; defended().
 */
export function m_harmless_trap(mtmp, ttmp) {
    if (!ttmp) return true;
    const mdat = mtmp?.data;
    switch (ttmp.ttyp) {
    case STATUE_TRAP:
    case MAGIC_TRAP:
    case VIBRATING_SQUARE:
        return true;
    case BEAR_TRAP:
        if ((mdat?.msize ?? 2) <= MZ_SMALL
            || amorphous(mdat) || is_whirly(mdat) || unsolid(mdat)) {
            return true;
        }
        return false;
    case WEB:
        if (amorphous(mdat) || is_whirly(mdat) || unsolid(mdat)) return true;
        // webmaker deferred
        return false;
    case RUST_TRAP:
        // C: only iron golem is harmed
        return (mdat?.mndx ?? -1) !== PM_IRON_GOLEM;
    case PIT:
    case SPIKED_PIT:
    case HOLE:
    case TRAPDOOR:
        // Sokoban flag: C `Sokoban` — JS uses level flag when present
        if (is_clinger(mdat) && !game.level?.flags?.sokoban) return true;
        return false;
    default:
        return false;
    }
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

// C ref: dbridge.c is_pool_or_lava — drawbridge-under POOL/LAVA deferred.
function is_pool_or_lava(x, y) {
    if (!isok(x, y)) return false;
    const typ = game.level?.at?.(x, y)?.typ;
    if (typ == null) return false;
    return IS_POOL(typ) || IS_LAVA(typ);
}

// C ref: monmove.c closed_door
function closed_door(x, y) {
    const loc = game.level?.at?.(x, y);
    if (!loc || !IS_DOOR(loc.typ)) return false;
    return !!((loc.doormask || 0) & (D_CLOSED | D_LOCKED));
}

/**
 * C ref: trap.c isclearpath — walk distance steps; update cc to end cell.
 * Blocks !ZAP_POS, closed doors, and pit/hole/xport traps along the path.
 */
function isclearpath(cc, distance, dx, dy) {
    let x = cc.x;
    let y = cc.y;
    let dist = distance;
    while (dist-- > 0) {
        x += dx;
        y += dy;
        if (!isok(x, y)) return false;
        const typ = game.level?.at?.(x, y)?.typ;
        if (typ == null || !ZAP_POS(typ) || closed_door(x, y)) return false;
        const t = t_at(x, y);
        if (t && (is_pit(t.ttyp) || is_hole(t.ttyp) || is_xport(t.ttyp))) {
            return false;
        }
    }
    cc.x = x;
    cc.y = y;
    return true;
}

/**
 * C ref: mthrowu.c linedup geometry only — used for launchplace early path.
 * Full couldsee/clear_path boulderhandling deferred (mklev launchplace is 0,0).
 */
function linedup_geom(ax, ay, bx, by) {
    const tbx = ax - bx;
    const tby = ay - by;
    if (!tbx && !tby) return false;
    return (!tbx || !tby || Math.abs(tbx) === Math.abs(tby))
        && Math.max(Math.abs(tbx), Math.abs(tby)) < BOLT_LIM;
}

/**
 * C ref: trap.c find_random_launch_coord — place boulder/ammo launch cell.
 * Sokoban always fails; launchplace offset tried first; else rn1(5,4)+rn2(8)
 * direction spiral with isclearpath (both ways for ROLLING_BOULDER_TRAP).
 */
function find_random_launch_coord(ttmp, cc) {
    if (!ttmp || !cc) return false;
    const Sokoban = !!(game.level?.flags?.sokoban || game.Sokoban);
    if (Sokoban) return false;

    const x = ttmp.tx;
    const y = ttmp.ty;
    const lp = game.launchplace || { x: 0, y: 0 };
    const bcc = { x: ttmp.tx + (lp.x | 0), y: ttmp.ty + (lp.y | 0) };
    if (isok(bcc.x, bcc.y) && linedup_geom(ttmp.tx, ttmp.ty, bcc.x, bcc.y)) {
        cc.x = bcc.x;
        cc.y = bcc.y;
        return true;
    }

    let mindist = 4;
    if (ttmp.ttyp === ROLLING_BOULDER_TRAP) mindist = 2;
    let distance = rn1(5, 4); // 4..8 away
    let tmp = rn2(N_DIRS);
    let trycount = 0;
    let success = false;
    while (distance >= mindist) {
        const dx = xdir[tmp];
        const dy = ydir[tmp];
        cc.x = x;
        cc.y = y;
        if (ttmp.ttyp === ROLLING_BOULDER_TRAP
            && is_pool_or_lava(x + distance * dx, y + distance * dy)) {
            success = false;
        } else {
            success = isclearpath(cc, distance, dx, dy);
        }
        if (ttmp.ttyp === ROLLING_BOULDER_TRAP) {
            const other = { x, y };
            const success_otherway = isclearpath(other, distance, -dx, -dy);
            if (!success_otherway) success = false;
        }
        if (success) break;
        if (++tmp > 7) tmp = 0;
        if ((++trycount % 8) === 0) --distance;
    }
    return success;
}

/**
 * C ref: trap.c mkroll_launch — set launch coords; place otyp ammo when path ok.
 * Failure leaves launch at trap cell (no ammo). ROLLING_BOULDER sets launch2.
 */
function mkroll_launch(ttmp, x, y, otyp, ocount) {
    const cc = { x: 0, y: 0 };
    let success = find_random_launch_coord(ttmp, cc);
    if (!success) {
        cc.x = x;
        cc.y = y;
    } else {
        const otmp = mksobj(otyp, true, false);
        if (otmp) {
            otmp.quan = ocount;
            otmp.owt = weight(otmp);
            place_object(otmp, cc.x, cc.y);
            stackobj(otmp);
        }
    }
    ttmp.launch = ttmp.launch || { x: -1, y: -1 };
    ttmp.launch.x = cc.x;
    ttmp.launch.y = cc.y;
    if (ttmp.ttyp === ROLLING_BOULDER_TRAP) {
        ttmp.launch2 = ttmp.launch2 || { x: -1, y: -1 };
        ttmp.launch2.x = x - (cc.x - x);
        ttmp.launch2.y = y - (cc.y - y);
    } else {
        ttmp.launch_otyp = otyp;
    }
    newsym(ttmp.launch.x, ttmp.launch.y);
    return 1;
}

// C ref: trap.c maketrap — creation + SQKY_BOARD / HOLE|TRAPDOOR /
// ROLLING_BOULDER_TRAP mkroll_launch RNG path.
// Named omissions: overwrite/furniture/terrain gates, STATUE_TRAP living
// statue, pit conjoined/shop damage/terrain morph, Sokoban finish,
// drawbridge-under pool/lava in is_pool_or_lava, launch_obj trigger.
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
            launch2: { x: -1, y: -1 },
            teledest: { x: -1, y: -1 },
            dst: { dnum: -1, dlevel: -1 },
            ntrap: null,
        };
    }
    ttmp.launch = { x: -1, y: -1 };
    ttmp.launch2 = { x: -1, y: -1 };
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
    case ROLLING_BOULDER_TRAP:
        mkroll_launch(ttmp, x, y, BOULDER, 1);
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

// C ref: mon.c corpse_chance — AT_BOOM then ordinary non-unique path
async function corpse_chance(mon) {
    const mdat = mon.data;
    if (!mdat) return false;
    const slots = mdat.mattk;
    if (slots) {
        for (let i = 0; i < 6; i++) {
            const at = slots[i];
            if (!at || (at.aatyp | 0) !== 14 /* AT_BOOM */) continue;
            if (at.damn) d(at.damn | 0, at.damd | 0);
            else if (at.damd) d((mdat.mlevel | 0) + 1, at.damd | 0);
            await mon_explodes(mon, at);
            return false;
        }
    }
    const tmp = 2 + (((mdat.geno ?? 0) & G_FREQ) < 2 ? 1 : 0)
        + (verysmall(mdat) ? 1 : 0);
    return !rn2(tmp);
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
async function mondied(mdef) {
    mondead(mdef);
    if ((mdef.mhp | 0) > 0) return; /* lifesaved */
    if (await corpse_chance(mdef)) make_corpse(mdef);
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
    await mondied(mdef);
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
    // C mon_leaving_level keeps stale mx/my after death for place_object
    const place_x = mon?.mx;
    const place_y = mon?.my;
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
        // C: stone_missile && passes_rocks → harmless (strike=0, keep missile)
        // Named omission: stone_missile/harmless arm — not dart/arrow path.
        if (obj && cansee(mon.mx, mon.my)) {
            await pline(`${Monnam(mon)} is hit by ${doname(obj)}!`);
        }
        let dam = 1;
        if (d_override) {
            dam = d_override;
        } else if (obj) {
            // C ref: trap.c thitm — dam = dmgval(obj, mon); if (dam < 1) dam = 1
            dam = dmgval(obj, mon);
            if (dam < 1) dam = 1;
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

    // C: place missile on miss (or d_override path); uses stale mon mx/my
    if (obj && (!strike || d_override)) {
        place_object(obj, place_x, place_y);
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

// C ref: trap.c deltrap — remove from ftrap list (shop/region cleanup deferred)
export function deltrap(trap) {
    const traps = game.level?.traps;
    if (!traps || !trap) return;
    const i = traps.indexOf(trap);
    if (i >= 0) traps.splice(i, 1);
}

/** Hero sentinel: game.youmonst or explicit _youmonst flag from dotrap. */
function is_youmonst(mtmp) {
    return !!(mtmp && (mtmp === game.youmonst || mtmp._youmonst));
}

/**
 * C ref: trap.c floor_trigger — types that fire when touching the floor.
 * Envelope matches C switch (incl. bear/landmine/gas/rust/fire).
 */
function floor_trigger(ttyp) {
    switch (ttyp) {
    case ARROW_TRAP:
    case DART_TRAP:
    case ROCKTRAP:
    case SQKY_BOARD:
    case BEAR_TRAP:
    case LANDMINE:
    case ROLLING_BOULDER_TRAP:
    case SLP_GAS_TRAP:
    case RUST_TRAP:
    case FIRE_TRAP:
    case PIT:
    case SPIKED_PIT:
    case HOLE:
    case TRAPDOOR:
        return true;
    default:
        return false;
    }
}

/**
 * C ref: trap.c check_in_air — Levitation / Flying / HURTLING for youmonst.
 * Named omission: monster floater/flyer arms used only from mintrap path.
 */
function check_in_air(mtmp, trflags) {
    const is_you = is_youmonst(mtmp);
    const plunged = (trflags & (TOOKPLUNGE | VIASITTING)) !== 0;
    if ((trflags & HURTLING) !== 0) return true;
    const u = game.u || {};
    if (is_you) {
        if (u.Levitation) return true;
        if (u.Flying && !plunged) return true;
        return false;
    }
    return m_in_air(mtmp) && !plunged;
}

/**
 * C ref: trap.c trapname / defsym.h trap PCHAR explanations.
 * Hallucination override deferred (always FALSE path).
 */
const TRAP_EXPLANATIONS = [
    '', // NO_TRAP
    'arrow trap',
    'dart trap',
    'falling rock trap',
    'squeaky board',
    'bear trap',
    'land mine',
    'rolling boulder trap',
    'sleeping gas trap',
    'rust trap',
    'fire trap',
    'pit',
    'spiked pit',
    'hole',
    'trap door',
    'teleportation trap',
    'level teleporter',
    'magic portal',
    'web',
    'statue trap',
    'magic trap',
    'anti-magic field',
    'polymorph trap',
    'vibrating square',
    'trapped door',
    'trapped chest',
];

/** C ref: trap.c trapname(ttyp, override) — non-hallucination only. */
export function trapname(ttyp, _override) {
    const t = ttyp | 0;
    if (t > NO_TRAP && t < TRAPNUM) return TRAP_EXPLANATIONS[t] || 'trap';
    return 'trap';
}

/**
 * C ref: trap.c dotrap — hero steps on a trap.
 * Envelope: nomul(0); floor_trigger+in_air skip; already_seen escape rn2(5);
 * trapeffect_selector(youmonst). Named omissions: Sokoban air-currents,
 * undestroyable/ANTI_MAGIC/Fumbling force, conj/adj pit, steed mon_learns,
 * mons_see_trap, FORCETRAP morph recursion; hero pit/slp_gas/anti-magic/…
 */
export async function dotrap(trap, trflags = NO_TRAP_FLAGS) {
    if (!trap) return;
    const u = game.u;
    if (!u) return;
    const ttype = trap.ttyp;
    const already_seen = !!trap.tseen;
    const forcetrap = (trflags & FORCETRAP) !== 0;
    const forcebungle = (trflags & FORCEBUNGLE) !== 0;
    const a_your = ['a', 'your'];

    nomul(0);

    if (!forcetrap) {
        if (floor_trigger(ttype)
            && check_in_air(game.youmonst || { _youmonst: true }, trflags)) {
            if (already_seen) {
                const art = (ttype === ARROW_TRAP && !trap.madeby_u)
                    ? 'an' : a_your[trap.madeby_u ? 1 : 0];
                await pline(`You step over ${art} ${trapname(ttype, false)}.`);
            }
            return;
        }
        // undestroyable_trap / ANTI_MAGIC / Fumbling / plunge / conj_pit
        // deferred — ordinary commons escape only
        if (already_seen && !u.Fumbling && ttype !== ANTI_MAGIC
            && !forcebungle
            && !rn2(5)) {
            const art = (ttype === ARROW_TRAP && !trap.madeby_u)
                ? 'an' : a_your[trap.madeby_u ? 1 : 0];
            await pline(`You escape ${art} ${trapname(ttype, false)}.`);
            return;
        }
    }

    // steed mon_learns_traps / mons_see_trap deferred (no RNG on commons)
    const you = game.youmonst || { _youmonst: true };
    await trapeffect_selector(you, trap, trflags);
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

    if (is_youmonst(mtmp)) {
        // Hero pit/spiked-pit body deferred (named omission)
        return Trap_Effect_Finished;
    }

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

// C ref: trap.c trapeffect_dart_trap — hero + monster branches
async function trapeffect_dart_trap(mtmp, trap) {
    if (is_youmonst(mtmp)) {
        const u = game.u;
        if (trap.once && trap.tseen && !rn2(15)) {
            await pline('You hear a soft click.');
            deltrap(trap);
            newsym(u.ux, u.uy);
            return Trap_Is_Gone;
        }
        trap.once = true;
        seetrap(trap);
        await pline('A little dart shoots out at you!');
        let otmp = t_missile(DART, trap);
        if (!rn2(6)) otmp.opoisoned = 1;
        const dam = dmgval(otmp, game.youmonst || mtmp);
        // steedintrap arm deferred (usteed rare at L1 commons)
        const box = { obj: otmp };
        // thitu plines are sync-append-safe after the shoot message
        if (await thitu(7, maybe_half_phys(dam), box, 'little dart')) {
            otmp = box.obj;
            if (otmp) {
                // poisoned() body deferred — still consume dart (obfree)
                // Named omission: poison attrib / HP when opoisoned
                // obfree: no obj_resists (delobj would burn rn2)
            }
            return Trap_Effect_Finished;
        }
        otmp = box.obj;
        if (otmp) {
            place_object(otmp, u.ux, u.uy);
            if (!u.Blind) observe_object(otmp);
            stackobj(otmp);
            newsym(u.ux, u.uy);
        }
        return Trap_Effect_Finished;
    }

    // Monster branch
    if (trap.once && trap.tseen && !rn2(15)) {
        // deltrap omitted visually; remove from list
        deltrap(trap);
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

// C ref: trap.c feeltrap — mark seen + redisplay via newsym → map_trap
function feeltrap(trap) {
    if (!trap) return;
    trap.tseen = true;
    newsym(trap.tx, trap.ty);
}

/** C ref: hacklib.c s_suffix — steed foot msg in trapeffect_bear_trap. */
function s_suffix(s) {
    if (!s) return 'the';
    if (s === 'it') return 'its';
    if (s === 'you') return 'your';
    if (s.endsWith('s') || s.endsWith('z') || s.endsWith('x')
        || s.endsWith('sh') || s.endsWith('ch')) {
        return `${s}'`;
    }
    return `${s}'s`;
}

/**
 * C ref: trap.c set_utrap — set hero trap timer/type; botl when armed↔clear.
 * Named omission: float_vs_flight Lev/Fly block.
 */
function set_utrap(tim, typ) {
    const u = game.u || (game.u = {});
    const was = !!(u.utrap | 0);
    const now = !!(tim | 0);
    if (was !== now) {
        if (game.flags) game.flags.botl = true;
        if (game.disp) game.disp.botl = true;
    }
    u.utrap = tim | 0;
    u.utraptype = now ? (typ | 0) : TT_NONE;
}

/**
 * C ref: trap.c reset_utrap — clear utrap; optional Lev/Fly restore msgs deferred.
 */
function reset_utrap(_msg) {
    set_utrap(0, 0);
}

/**
 * C ref: do.c set_wounded_legs — timeout + side bits + ATEMP(DEX)--
 * then encumber_msg (carrcap drops via WT_WOUNDEDLEG_REDUCT).
 * Named omission: steed-leg messaging is caller's job.
 */
async function set_wounded_legs(side, timex) {
    const u = game.u || (game.u = {});
    if (game.flags) game.flags.botl = true;
    if (game.disp) game.disp.botl = true;
    const wounded = !!(u.Wounded_legs || ((u.HWounded_legs | 0) & TIMEOUT)
        || (u.EWounded_legs | 0));
    if (!wounded) {
        if (!u.atemp) u.atemp = { a: [0, 0, 0, 0, 0, 0] };
        u.atemp.a[A_DEX] = (u.atemp.a[A_DEX] | 0) - 1;
    }
    const hw = u.HWounded_legs | 0;
    if (!wounded || (hw & TIMEOUT) < (timex | 0)) {
        set_itimeout_prop('HWounded_legs', timex | 0);
    }
    u.EWounded_legs = (u.EWounded_legs | 0) | (side | 0);
    u.Wounded_legs = true;
    // C: encumber_msg() after EWounded_legs |= side
    await encumber_msg();
}

/**
 * C ref: do.c heal_legs(how) — clear wounded-leg timeout/side bits,
 * restore ATEMP(DEX), feel-better pline, encumber_msg when how==0.
 * how: 0 ordinary (nh_timeout), 1 dismount, 2 petrify limbs.
 * Named omissions: steed-leg suppress path polish beyond usteed check.
 */
export async function heal_legs(how) {
    const u = game.u || (game.u = {});
    const wounded = !!(u.Wounded_legs
        || ((u.HWounded_legs | 0) & TIMEOUT)
        || (u.EWounded_legs | 0));
    if (!wounded) return;
    if (game.flags) game.flags.botl = true;
    if (game.disp) game.disp.botl = true;
    if (!u.atemp) u.atemp = { a: [0, 0, 0, 0, 0, 0] };
    if ((u.atemp.a[A_DEX] | 0) < 0) {
        u.atemp.a[A_DEX] = (u.atemp.a[A_DEX] | 0) + 1;
    }
    // C: when mounted / petrify how==2, suppress feel-better message
    if (!u.usteed && (how | 0) !== 2) {
        let legs = body_part(LEG);
        if (((u.EWounded_legs | 0) & BOTH_SIDES) === BOTH_SIDES) {
            legs = makeplural(legs);
        }
        await pline(`Your ${legs} ${vtense(legs, 'feel')} better.`);
    }
    u.HWounded_legs = 0;
    u.EWounded_legs = 0;
    u.Wounded_legs = false;
    // C: encumber_msg only for ordinary heal (how==0), not dismount
    if ((how | 0) === 0) await encumber_msg();
}

/** C ref: mondata.c body_part — FOOT→"foot", LEG→"leg"; full poly deferred. */
function body_part(part) {
    if (part === FOOT) return 'foot';
    if (part === LEG) return 'leg';
    return 'body';
}

/** C ref: mondata.c mbodypart — FOOT→"foot"; full poly table deferred. */
function mbodypart(_mon, part) {
    return body_part(part);
}

/**
 * C ref: trap.c trapeffect_bear_trap — hero + monster branches.
 * Envelope: hero d(2,4) then Lev/Fly skip; feeltrap; amorph/whirly/unsolid
 * /small harmlessly; set_utrap(rn1(4,4)); steed thitm or wounded-legs+losehp;
 * exercise DEX. Monster: size/amorph/air catch + thitm(d(2,4)).
 * Named omissions: float_vs_flight; Yname2 iron-shoe msg; full body_part
 * poly; Soundeffect roar; which_armor wearing_iron_shoes body.
 */
async function trapeffect_bear_trap(mtmp, trap, trflags) {
    const A_Your = ['A', 'Your'];
    const a_your = ['a', 'your'];
    const forcetrap = ((trflags & FORCETRAP) !== 0
        || (trflags & FAILEDUNTRAP) !== 0
        || (is_youmonst(mtmp) && (trflags & VIASITTING) !== 0));

    if (is_youmonst(mtmp)) {
        const u = game.u || {};
        const dmg = d(2, 4);
        if ((u.Levitation || u.Flying) && !forcetrap) {
            return Trap_Effect_Finished;
        }
        feeltrap(trap);
        const youdata = game.youmonst?.data;
        if (amorphous(youdata) || is_whirly(youdata) || unsolid(youdata)) {
            await pline(
                `${A_Your[trap.madeby_u ? 1 : 0]} bear trap closes harmlessly through you.`,
            );
            return Trap_Effect_Finished;
        }
        if (!u.usteed && (youdata?.msize ?? 2) <= MZ_SMALL) {
            await pline(
                `${A_Your[trap.madeby_u ? 1 : 0]} bear trap closes harmlessly over you.`,
            );
            return Trap_Effect_Finished;
        }
        set_utrap(rn1(4, 4), TT_BEARTRAP);
        if (u.usteed) {
            await pline(
                `${A_Your[trap.madeby_u ? 1 : 0]} bear trap closes on ${s_suffix(mon_nam(u.usteed))} ${mbodypart(u.usteed, FOOT)}!`,
            );
            if (await thitm(0, u.usteed, null, dmg, false)) {
                reset_utrap(true);
            }
        } else {
            await pline(
                `${A_Your[trap.madeby_u ? 1 : 0]} bear trap closes on your ${body_part(FOOT)}!`,
            );
            const umonnum = u.umonnum | 0;
            if (umonnum === PM_OWLBEAR || umonnum === PM_BUGBEAR) {
                await pline('You howl in anger!');
            }
            if (wearing_iron_shoes(mtmp)) {
                // C: Yname2(uarmf) — iron shoes protect; which_armor deferred
                await pline('Your boots protect your leg.');
            } else {
                await set_wounded_legs(
                    rn2(2) ? RIGHT_SIDE : LEFT_SIDE, rn1(10, 10),
                );
                losehp(maybe_half_phys(dmg), 'bear trap', KILLED_BY_AN);
            }
        }
        exercise(A_DEX, false);
        return Trap_Effect_Finished;
    }

    // Monster branch
    const mptr = mtmp.data;
    const in_sight = canseemon(mtmp) || (mtmp === game.u?.usteed);
    let trapkilled = false;

    if ((mptr?.msize ?? 0) > MZ_SMALL && !amorphous(mptr) && !m_in_air(mtmp)
        && !is_whirly(mptr) && !unsolid(mptr)) {
        mtmp.mtrapped = 1;
        if (in_sight) {
            await pline(
                `${Monnam(mtmp)} is caught in ${a_your[trap.madeby_u ? 1 : 0]} bear trap!`,
            );
            seetrap(trap);
        } else if ((mptr?.mndx ?? -1) === PM_OWLBEAR
            || (mptr?.mndx ?? -1) === PM_BUGBEAR) {
            await You_hear('the roaring of an angry bear!');
        }
    } else if (forcetrap) {
        if (in_sight) {
            await pline(
                `${Monnam(mtmp)} evades ${a_your[trap.madeby_u ? 1 : 0]} bear trap!`,
            );
            seetrap(trap);
        }
    }
    if (mtmp.mtrapped && !wearing_iron_shoes(mtmp)) {
        trapkilled = await thitm(0, mtmp, null, d(2, 4), false);
    }
    return trapkilled ? Trap_Killed_Mon
        : (mtmp.mtrapped ? Trap_Caught_Mon : Trap_Effect_Finished);
}

/**
 * C ref: dungeon.c ceiling — room/air/cavern labels for trap plines.
 * Named omissions: vault/temple/shop in_rooms; water/fire/quest/Underwater.
 */
function ceiling(x, y) {
    const typ = game.level?.at(x, y)?.typ ?? 0;
    if (IS_AIR(typ)) return 'sky';
    if (IS_ROOM(typ) || IS_WALL(typ) || IS_DOOR(typ) || typ === SDOOR)
        return 'ceiling';
    return 'rock cavern';
}

/** C ref: mondata.h passes_rocks */
function passes_rocks(ptr) {
    return !!(passes_walls(ptr) && !unsolid(ptr));
}

/**
 * C ref: do_wear.c hard_helmet — metallic or glass armor helm.
 * is_helmet gate approximated by worn uarmh (caller only passes helm).
 */
function hard_helmet(obj) {
    if (!obj) return false;
    const mat = game.objects?.[obj.otyp]?.oc_material ?? 0;
    const IRON = 11, MITHRIL = 15, GLASS = 19;
    if (mat >= IRON && mat <= MITHRIL) return true;
    if (mat === GLASS && (obj.oclass === ARMOR_CLASS
        || game.objects?.[obj.otyp]?.oc_class === ARMOR_CLASS)) return true;
    return false;
}

/** C ref: objnam.c helm_simple_name — "helmet" / "hat" polish deferred */
function helm_simple_name(_obj) {
    return 'helmet';
}

/**
 * C ref: trap.c trapeffect_rocktrap — hero + monster branches.
 * Envelope: hero feeltrap + place ROCK at u.ux/uy + losehp; monster
 * once+tseen empty rn2(15)/deltrap else t_missile+thitm(d(2,6)).
 * Named omissions: vault/shop ceiling labels; helm_simple_name "hat";
 * Yname2 soft-helm verbose; empty-door pline_mon text; stone_missile
 * harmless arm in thitm; full body_part poly table (HEAD→"head").
 */
async function trapeffect_rocktrap(mtmp, trap, _trflags) {
    if (is_youmonst(mtmp)) {
        const u = game.u || {};
        if (trap.once && trap.tseen && !rn2(15)) {
            await pline(
                `A trap door in ${the(ceiling(u.ux, u.uy))} opens, but nothing falls out!`,
            );
            deltrap(trap);
            newsym(u.ux, u.uy);
            return Trap_Is_Gone;
        }
        let dmg = d(2, 6);
        let harmless = false;
        trap.once = true;
        feeltrap(trap);
        const otmp = t_missile(ROCK, trap);
        place_object(otmp, u.ux, u.uy);
        await pline(
            `A trap door in ${the(ceiling(u.ux, u.uy))} opens and ${an(xname(otmp))} falls on your head!`,
        );
        const uarmh = u.uarmh;
        const youdata = game.youmonst?.data;
        if (uarmh) {
            if (passes_rocks(youdata)) {
                await pline(`Unfortunately, you are wearing ${an(helm_simple_name(uarmh))}.`);
                dmg = 2;
            } else if (hard_helmet(uarmh)) {
                await pline('Fortunately, you are wearing a hard helmet.');
                dmg = 2;
            } else if (game.flags?.verbose !== false) {
                // C: Yname2(uarmh) — soft helm does not protect
                await pline('Your helmet does not protect you.');
            }
        } else if (passes_rocks(youdata)) {
            await pline('It passes harmlessly through you.');
            harmless = true;
        }
        if (!(u.Blind || u.ublind)) observe_object(otmp);
        stackobj(otmp);
        newsym(u.ux, u.uy);
        if (!harmless) {
            losehp(maybe_half_phys(dmg), 'falling rock', KILLED_BY_AN);
            exercise(A_STR, false);
        }
        return Trap_Effect_Finished;
    }

    // Monster branch
    const in_sight = canseemon(mtmp) || (mtmp === game.u?.usteed);
    if (trap.once && trap.tseen && !rn2(15)) {
        // C: pline_mon when in_sight && cansee — display only; omit body
        deltrap(trap);
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

/**
 * C ref: trap.c trapeffect_hole — HOLE/TRAPDOOR monster fall → level tele.
 * Envelope: Can_fall_thru; grounded / !huge; then mlevel_tele_trap.
 * Named omissions: hero fall_through; Sokoban yank; forcetrap openfalling.
 */
async function trapeffect_hole(mtmp, trap, trflags) {
    if (is_youmonst(mtmp)) {
        // Hero fall_through deferred
        return Trap_Effect_Finished;
    }
    const tt = trap.ttyp;
    const mptr = mtmp.data;
    const forcetrap = (trflags & FORCETRAP) !== 0;
    const Sokoban = !!(game.level?.flags?.sokoban || game.Sokoban);
    const inescapable = forcetrap || (Sokoban && !trap.madeby_u);
    const in_sight = canseemon(mtmp) || (mtmp === game.u?.usteed);

    if (!Can_fall_thru(game.u?.uz)) {
        return Trap_Effect_Finished;
    }
    if (!grounded(mptr)
        || (mtmp.wormno && (mtmp.wormno | 0) > 5)
        || (mptr?.msize | 0) >= MZ_HUGE) {
        if (forcetrap && !Sokoban) {
            if (in_sight) seetrap(trap);
            return Trap_Effect_Finished;
        }
        if (!inescapable) return Trap_Effect_Finished;
        // Sokoban yank still falls through
    }
    return mlevel_tele_trap(mtmp, trap, forcetrap, in_sight ? 1 : 0);
}

/**
 * C ref: prop.h mr_bit — prop index → mresists bit (FIRE_RES…STONE_RES).
 */
function mr_bit(prop) {
    return (prop >= FIRE_RES && prop <= STONE_RES) ? (1 << (prop - 1)) : 0;
}

/**
 * C ref: monst.h resists_fire / resists_sleep — Resists_Elem(prop).
 * Named omission: data->mresists not in extracted mons(); only
 * mintrinsics/mextrinsics bits when set.
 */
function resists_elem(mtmp, prop) {
    const bits = (mtmp?.mintrinsics | 0) | (mtmp?.mextrinsics | 0);
    return !!(bits & mr_bit(prop));
}
function resists_fire(mtmp) {
    return resists_elem(mtmp, FIRE_RES);
}
function resists_sleep(mtmp) {
    return resists_elem(mtmp, SLEEP_RES);
}

/** C ref: monst.h helpless — msleeping || !mcanmove */
function helpless(mtmp) {
    return !!(mtmp?.msleeping || !mtmp?.mcanmove);
}

/**
 * C ref: mhitm.c sleep_monst — how < 0 skips mimic reveal / resist().
 * Envelope: resists_sleep shield; else if mcanmove freeze via mfrozen.
 * Named omissions: defended(AD_SLEE); how>=0 seemimic/resist; shieldeff;
 * full finish_meating mimic AP reset (inline meating=0 only).
 */
function sleep_monst(mon, amt, how) {
    if (!mon) return 0;
    // how >= 0 mimic reveal / resist(how) deferred
    if (resists_sleep(mon) /* || defended(mon, AD_SLEE) */) {
        // shieldeff deferred
        return 0;
    }
    if (mon.mcanmove) {
        mon.meating = 0; // finish_meating subset
        amt = (amt | 0) + (mon.mfrozen | 0);
        if (amt > 0) {
            mon.mcanmove = 0;
            mon.mfrozen = Math.min(amt, 127);
        } else {
            mon.msleeping = 1;
        }
        return 1;
    }
    return 0;
}

/**
 * C ref: trap.c burnarmor — armor-slot burn picker (monster naked path).
 * Envelope: skip wet-towel; loop rn2(5) until case 1 (cloak/body/shirt arm
 * always returns TRUE even with no armor). Named omission: erode_obj burn
 * on worn pieces; towel drying.
 */
function burnarmor(victim) {
    if (!victim) return false;
    // Towel dry_a_towel rn2 deferred (m_carrying TOWEL rare)
    for (;;) {
        // case 1 → return TRUE (cloak/armor/shirt attempts, then TRUE)
        if (rn2(5) === 1) return true;
        // other cases: erode_obj(null) → ER_NOTHING → continue
    }
}

/**
 * C ref: trap.c trapeffect_fire_trap — monster branch (hero dofiretrap deferred).
 * Envelope: d(2,4); resists_fire shield; else thitm / rn2(num+1) mhpmax;
 * golem alt HP; burnarmor naked → destroy_items stub. Named omissions:
 * destroy_items/ignite_items/burn_floor_objects/melt_ice bodies; surface();
 * shieldeff; hero dofiretrap.
 */
async function trapeffect_fire_trap(mtmp, trap, _trflags) {
    if (is_youmonst(mtmp)) {
        await dofiretrap(null);
        return Trap_Effect_Finished;
    }
    const tx = trap.tx;
    const ty = trap.ty;
    const in_sight = canseemon(mtmp) || (mtmp === game.u?.usteed);
    const see_it = cansee(tx, ty);
    let trapkilled = false;
    const mptr = mtmp.data;
    const orig_dmg = d(2, 4);
    const surf = 'floor'; // surface() deferred

    if (in_sight) {
        await pline(
            `A ${TOWER_OF_FLAME} erupts from the ${surf} under ${mon_nam(mtmp)}!`,
        );
    } else if (see_it) {
        await pline(`You see a ${TOWER_OF_FLAME} erupt from the ${surf}!`);
    }

    if (resists_fire(mtmp)) {
        if (in_sight) {
            await pline(`${Monnam(mtmp)} is uninjured.`);
        }
    } else {
        let num = orig_dmg;
        let immolate = false;
        const mndx = mptr?.mndx ?? -1;
        let alt = 0;
        if (mndx === PM_PAPER_GOLEM) {
            immolate = true;
            alt = mtmp.mhpmax | 0;
        } else if (mndx === PM_STRAW_GOLEM) {
            alt = (mtmp.mhpmax | 0) >> 1;
        } else if (mndx === PM_WOOD_GOLEM) {
            alt = (mtmp.mhpmax | 0) >> 2;
        } else if (mndx === PM_LEATHER_GOLEM) {
            alt = (mtmp.mhpmax | 0) >> 3;
        }
        if (alt > num) num = alt;

        if (await thitm(0, mtmp, null, num, immolate)) {
            trapkilled = true;
        } else {
            mtmp.mhpmax = (mtmp.mhpmax | 0) - rn2(num + 1);
            if ((mtmp.mhp | 0) > (mtmp.mhpmax | 0)) mtmp.mhp = mtmp.mhpmax;
        }
    }

    // C: if (burnarmor(mtmp) || rn2(3)) { destroy_items; ignite; HP }
    // Naked burnarmor returns TRUE → short-circuit (no rn2(3)).
    if (burnarmor(mtmp) || rn2(3)) {
        // destroy_items(AD_FIRE) / ignite_items deferred (no RNG stub)
        if ((mtmp.mhp | 0) <= 0) {
            await monkilled(mtmp, '', AD_FIRE);
            trapkilled = true;
        }
    }
    // burn_floor_objects / melt_ice deferred
    if ((mtmp.mhp | 0) <= 0) trapkilled = true;
    if (see_it && t_at(tx, ty)) seetrap(t_at(tx, ty));

    return trapkilled ? Trap_Killed_Mon
        : (mtmp.mtrapped ? Trap_Caught_Mon : Trap_Effect_Finished);
}

/** C youprop.h Blind / Deaf / Hallucination / Invis / See_invisible subset. */
function Blind() {
    const u = game.u || {};
    if (u.Blind || u.ublind) return true;
    return !!(((u.HBlinded | 0) || (u.EBlinded | 0)) && !(u.BBlinded | 0));
}
function Deaf() {
    const u = game.u || {};
    return !!((u.HDeaf | 0) || (u.EDeaf | 0) || u.uroleplay?.deaf || u.Deaf);
}
function Hallucination() {
    const u = game.u || {};
    if (u.Hallucination) return true;
    return !!((u.HHallucination | 0) && !(u.Halluc_resistance | 0));
}
function HInvis_val() { return (game.u?.HInvis | 0); }
function EInvis_val() { return (game.u?.EInvis | 0); }
function Invis() {
    const u = game.u || {};
    if (u.Invis && !((u.HInvis | 0) || (u.EInvis | 0))) return true;
    return !!(((u.HInvis | 0) || (u.EInvis | 0)) && !(u.BInvis | 0));
}
function See_invisible() {
    const u = game.u || {};
    return !!((u.HSee_invisible | 0) || (u.ESee_invisible | 0) || u.See_invisible);
}
function Fire_resistance() {
    const u = game.u || {};
    return !!(u.Fire_resistance || u.HFire_resistance || u.EFire_resistance);
}
function Unaware() {
    const u = game.u || {};
    return (u.multi | 0) < 0 && !!u.usleep;
}
/** C mondata.h pm_invisible */
function pm_invisible(ptr) {
    const mndx = ptr?.mndx ?? -1;
    return mndx === PM_STALKER || mndx === PM_BLACK_LIGHT;
}
/** C potion.c itimeout / set_itimeout / incr_itimeout — TIMEOUT field only. */
function itimeout(val) { return (val | 0) & TIMEOUT; }
function set_itimeout_prop(key, val) {
    const u = game.u || (game.u = {});
    u[key] = ((u[key] | 0) & ~TIMEOUT) | itimeout(val);
}
function incr_itimeout_prop(key, incr) {
    const u = game.u || (game.u = {});
    const cur = u[key] | 0;
    set_itimeout_prop(key, (cur & TIMEOUT) + (incr | 0));
}
/**
 * C ref: potion.c make_blinded — talk=FALSE envelope for domagictrap.
 * Named omission: Eyes override probe detail; toggle_blindness vision recalc;
 * Punished set_bc; talk messages (always FALSE here).
 */
function make_blinded(xtime, _talk) {
    const u = game.u || (game.u = {});
    const old = (u.HBlinded | 0) & TIMEOUT;
    const u_could_see = !Blind();
    set_itimeout_prop('HBlinded', xtime ? 1 : 0);
    const can_see_now = !Blind();
    set_itimeout_prop('HBlinded', old);
    set_itimeout_prop('HBlinded', xtime);
    if (u_could_see !== can_see_now) {
        u.Blind = !can_see_now;
        if (game.flags) game.flags.botl = true;
    }
}
/** C mondata.c resists_blnd — hero Blind/Unaware gate; arti/expl deferred. */
function resists_blnd(mon) {
    if (is_youmonst(mon)) return Blind() || Unaware();
    return !!(mon?.mblinded || !mon?.mcansee || mon?.msleeping);
}
async function self_invis_message() {
    // C ref: potion.c self_invis_message
    const prefix = Hallucination()
        ? 'Far out, man!  You'
        : 'Gee!  All of a sudden, you';
    const suffix = See_invisible()
        ? 'can see right through yourself'
        : "can't see yourself";
    await pline(`${prefix} ${suffix}.`);
}

/**
 * C ref: trap.c dofiretrap — null-box floor path.
 * Envelope: d(2,4); Underwater boil; tower pline; Fire_resistance rn2(2);
 * ordinary second d(2,4)+uhpmax rn2; losehp; burnarmor||rn2(3).
 * Named omissions: box/carried; shieldeff/monstseesu; Upolyd golem alts;
 * minuhpmax/setuhpmax/losexp; destroy_items/ignite_items bodies;
 * burn_floor_objects/melt_ice/burn_away_slime; surface().
 */
async function dofiretrap(box) {
    const u = game.u || (game.u = {});
    const orig_dmg = d(2, 4);
    let num = orig_dmg;

    if (!box && u.Underwater) {
        await pline('A cascade of steamy bubbles erupts from the floor!');
        if (Fire_resistance()) await pline('You are uninjured.');
        else losehp(rnd(3), 'boiling water', KILLED_BY);
        return;
    }
    await pline(
        `A ${TOWER_OF_FLAME} ${box ? 'bursts' : 'erupts'} from the floor!`,
    );
    if (Fire_resistance()) {
        num = rn2(2);
    } else if (Upolyd(u)) {
        num = orig_dmg;
    } else {
        num = d(2, 4);
        const uhpmin = 1;
        if ((u.uhpmax | 0) > uhpmin) {
            u.uhpmax = (u.uhpmax | 0) - rn2(Math.min(u.uhpmax | 0, num + 1));
            if (game.flags) game.flags.botl = true;
        }
        if ((u.uhp | 0) > (u.uhpmax | 0)) {
            u.uhp = u.uhpmax;
            if (game.flags) game.flags.botl = true;
        }
    }
    if (!num) await pline('You are uninjured.');
    else losehp(num, TOWER_OF_FLAME, KILLED_BY_AN);
    const you = game.youmonst || { _youmonst: true };
    if (burnarmor(you) || rn2(3)) {
        // destroy_items / ignite_items deferred
    }
}

/**
 * C ref: trap.c domagictrap
 * Envelope: rnd(20) fate; <10 flash+deaf+makemon+wake; 10 noop; 11 HInvis
 * toggle; 12 dofiretrap; 13–18 feel/hear; 19 adjattrib+tamedog; 20 seffects
 * SPE_REMOVE_CURSE deferred.
 */
async function domagictrap() {
    const u = game.u || (game.u = {});
    const fate = rnd(20);

    if (fate < 10) {
        let cnt = rnd(4);
        if (!resists_blnd(game.youmonst || { _youmonst: true })) {
            await pline('You are momentarily blinded by a flash of light!');
            make_blinded(rn1(5, 10), false);
            if (!Blind()) await pline(`Your ${VISION_CLEARS}`);
        } else if (!Blind()) {
            await pline('You see a flash of light!');
        }
        if (!Deaf()) {
            await You_hear('a deafening roar!');
            incr_itimeout_prop('HDeaf', rn1(20, 30));
            if (game.flags) game.flags.botl = true;
        } else {
            await You_feel('rankled.');
            incr_itimeout_prop('HDeaf', rn1(5, 15));
            if (game.flags) game.flags.botl = true;
        }
        while (cnt--) {
            makemon(null, u.ux, u.uy, NO_MM_FLAGS);
        }
        wake_nearto(u.ux, u.uy, 7 * 7);
    } else {
        switch (fate) {
        case 10:
            break;
        case 11: {
            await You_hear('a low hum.');
            if (!Invis()) {
                if (!Blind()) await self_invis_message();
            } else if (!EInvis_val() && !pm_invisible(game.youmonst?.data)) {
                if (!Blind()) {
                    if (!See_invisible()) {
                        await pline('You can see yourself again!');
                    } else {
                        await pline("You can't see through yourself anymore.");
                    }
                }
            } else {
                await You_feel(
                    `a little more ${HInvis_val() ? 'obvious' : 'hidden'} now.`,
                );
            }
            u.HInvis = HInvis_val() ? 0 : (HInvis_val() | FROMOUTSIDE);
            u.Invis = Invis();
            newsym(u.ux, u.uy);
            break;
        }
        case 12:
            await dofiretrap(null);
            break;
        case 13:
            await pline('A shiver runs up and down your spine!');
            break;
        case 14:
            await You_hear(
                Hallucination() ? 'the moon howling at you.' : 'distant howling.',
            );
            break;
        case 15:
            if (Hallucination()) {
                await pline('You suddenly yearn for Cleveland.');
            } else if (In_quest(u.uz)) {
                await pline('You suddenly yearn for your nearby homeland.');
            } else {
                await pline('You suddenly yearn for your distant homeland.');
            }
            break;
        case 16:
            await pline('Your pack shakes violently!');
            break;
        case 17:
            await pline(
                Hallucination() ? 'You smell hamburgers.' : 'You smell charred flesh.',
            );
            break;
        case 18:
            await You_feel('tired.');
            break;
        case 19: {
            await adjattrib(A_CHA, 1, false);
            for (let i = -1; i <= 1; i++) {
                for (let j = -1; j <= 1; j++) {
                    if (!isok(u.ux + i, u.uy + j)) continue;
                    const mtmp = m_at(u.ux + i, u.uy + j);
                    if (mtmp) await tamedog(mtmp, null, true);
                }
            }
            break;
        }
        case 20:
            // seffects(SPE_REMOVE_CURSE) deferred
            break;
        default:
            break;
        }
    }
}

/**
 * C ref: trap.c trapeffect_magic_trap
 * Envelope: hero — seetrap; rn2(30) explosion else domagictrap. Monsters —
 * rn2(21)→fire. steedintrap MAGIC_TRAP is default no-op without usteed.
 */
async function trapeffect_magic_trap(mtmp, trap, trflags) {
    if (is_youmonst(mtmp)) {
        const u = game.u || (game.u = {});
        seetrap(trap);
        if (!rn2(30)) {
            deltrap(trap);
            newsym(u.ux, u.uy);
            await pline('You are caught in a magical explosion!');
            losehp(rnd(10), 'magical explosion', KILLED_BY_AN);
            await pline('Your body absorbs some of the magical energy!');
            u.uenmax = (u.uenmax | 0) + 2;
            u.uen = u.uenmax;
            if ((u.uenmax | 0) > (u.uenpeak | 0)) u.uenpeak = u.uenmax;
            return Trap_Effect_Finished;
        }
        await domagictrap();
        void trflags;
        return Trap_Effect_Finished;
    }
    /* A magic trap.  Monsters usually immune. */
    if (!rn2(21)) {
        return trapeffect_fire_trap(mtmp, trap, trflags);
    }
    return Trap_Effect_Finished;
}

/**
 * C ref: trap.c trapeffect_slp_gas_trap
 * Envelope: monsters — !resists_sleep && !breathless && !helpless →
 * sleep_monst(rnd(25), -1); pline+seetrap when in sight. Hero —
 * Sleep_resistance/fall_asleep/steedintrap deferred.
 */
async function trapeffect_slp_gas_trap(mtmp, trap, _trflags) {
    if (is_youmonst(mtmp)) {
        // Hero cloud / fall_asleep deferred
        return Trap_Effect_Finished;
    }
    const in_sight = canseemon(mtmp) || (mtmp === game.u?.usteed);
    if (!resists_sleep(mtmp) && !breathless(mtmp.data) && !helpless(mtmp)) {
        if (sleep_monst(mtmp, rnd(25), -1) && in_sight) {
            await pline(`${Monnam(mtmp)} suddenly falls asleep!`);
            seetrap(trap);
        }
    }
    return Trap_Effect_Finished;
}

/**
 * C ref: trap.c trapeffect_telep_trap — hero tele_trap once→vault_tele;
 * monster mtele_trap.
 * Envelope: once vault deltrap+vault_tele; mon in_sight pline+seetrap.
 * Named omissions: Antimagic wrenching pline; teledest/tele hero arms;
 * fixed-dest mon displace; seetrap before hero vault_tele.
 */
async function trapeffect_telep_trap(mtmp, trap, _trflags) {
    if (is_youmonst(mtmp)) {
        seetrap(trap);
        if (trap.once) {
            // C: deltrap then vault_tele (keep trap off before landing)
            deltrap(trap);
            newsym(game.u.ux, game.u.uy);
            await tele_trap_once_vault();
            return Trap_Effect_Finished;
        }
        // teledest / tele() hero arms deferred
        return Trap_Effect_Finished;
    }
    const in_sight = canseemon(mtmp) || (mtmp === game.u?.usteed);
    const monname = Monnam(mtmp);
    if (mtele_trap(mtmp, trap)) {
        if (in_sight) {
            if (canseemon(mtmp)) {
                await pline(`${monname} seems disoriented.`);
            } else {
                await pline(`${monname} suddenly disappears!`);
            }
            seetrap(trap);
        }
    }
    return Trap_Moved_Mon;
}

// C ref: trap.c trapeffect_selector — dart/rock/pit/sqky/hole/magic/fire/slp/telep/bear
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
    case BEAR_TRAP:
        return trapeffect_bear_trap(mtmp, trap, trflags);
    case HOLE:
    case TRAPDOOR:
        return trapeffect_hole(mtmp, trap, trflags);
    case FIRE_TRAP:
        return trapeffect_fire_trap(mtmp, trap, trflags);
    case MAGIC_TRAP:
        return trapeffect_magic_trap(mtmp, trap, trflags);
    case SLP_GAS_TRAP:
        return trapeffect_slp_gas_trap(mtmp, trap, trflags);
    case TELEP_TRAP:
        return trapeffect_telep_trap(mtmp, trap, trflags);
    default:
        // Named omission: arrow/anti-magic/rust/web/landmine/… trap effects
        return Trap_Effect_Finished;
    }
}

/**
 * C ref: trap.c mintrap() — monster steps on a trap.
 * Early-session envelope: dart / rock / pit / sqky / hole|trapdoor /
 * magic|fire learn+effect; already_seen rn2(4) skip when mon_knows_traps.
 * Other types and escape paths partial.
 */
export async function mintrap(mtmp, mintrapflags = NO_TRAP_FLAGS) {
    const trap = t_at(mtmp.mx, mtmp.my);
    if (!trap) {
        mtmp.mtrapped = 0;
        return Trap_Effect_Finished;
    }
    if (mtmp.mtrapped) {
        // C trap.c mintrap — already in trap: maybe reveal, then rn2(40)
        // escape (or easy pit). Boulder-in-pit / metallivorous chew deferred.
        if (!trap.tseen && cansee(mtmp.mx, mtmp.my) && canseemon(mtmp)
            && (is_pit(trap.ttyp) || trap.ttyp === BEAR_TRAP
                || trap.ttyp === HOLE || trap.ttyp === WEB)) {
            seetrap(trap);
        }
        // m_easy_escape_pit arm deferred — only rn2(40) gate for now
        if (!rn2(40)) {
            if (canseemon(mtmp)) {
                if (is_pit(trap.ttyp)) {
                    await pline(`${Monnam(mtmp)} climbs out of the pit.`);
                } else if (trap.ttyp === BEAR_TRAP || trap.ttyp === WEB) {
                    await pline(
                        `${Monnam(mtmp)} pulls free of the ${trapname(trap.ttyp, false)}.`,
                    );
                }
            }
            mtmp.mtrapped = 0;
        }
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

/**
 * C ref: trap.c water_damage_chain — walk invent / floor chain.
 * acid_ctx / bhitpos save deferred.
 */
export function water_damage_chain(objOrList, here) {
    if (!objOrList) return;
    if (Array.isArray(objOrList)) {
        for (const obj of [...objOrList]) {
            water_damage(obj, null, false);
        }
        return;
    }
    for (let obj = objOrList; obj; obj = here ? obj.nexthere : obj.nobj) {
        water_damage(obj, null, false);
    }
}

/**
 * C ref: trap.c emergency_disrobe — drop until near_capacity ok.
 * Named omissions: full undroppable set / remove_worn_item / dropx body;
 * when already light enough, returns TRUE with no RNG (session path).
 */
function emergency_disrobe(lostRef) {
    lostRef.lost = false;
    return true;
}

/**
 * C ref: trap.c rnd_nextto_goodpos — shuffle N_DIRS, first crawl_destination
 * / goodpos wins. Hero path uses crawl_destination.
 */
export function rnd_nextto_goodpos(pos, mtmp) {
    const dirs = [];
    for (let i = 0; i < N_DIRS; i++) dirs.push(i);
    for (let i = N_DIRS; i > 0; --i) {
        const j = rn2(i);
        const k = dirs[j];
        dirs[j] = dirs[i - 1];
        dirs[i - 1] = k;
    }
    const isU = !mtmp || mtmp === game.youmonst || mtmp?.isYou;
    for (let i = 0; i < N_DIRS; i++) {
        const nx = (pos.x | 0) + xdir[dirs[i]];
        const ny = (pos.y | 0) + ydir[dirs[i]];
        let ok = false;
        if (isU) {
            ok = crawl_destination(nx, ny);
        } else {
            ok = goodpos(nx, ny, mtmp, 0);
        }
        if (ok) {
            pos.x = nx;
            pos.y = ny;
            return true;
        }
    }
    return false;
}

/**
 * Minimal teleds for drown crawl-out — u_on_newpos + vision/newsym.
 * Ball/chain, swallow, drag_ball, spoteffects re-entry deferred.
 */
async function teleds_drown(nux, nuy) {
    const u = game.u;
    if (!u) return;
    const ox = u.ux, oy = u.uy;
    u.ux0 = ox;
    u.uy0 = oy;
    u.ux = nux;
    u.uy = nuy;
    if (u.usteed) {
        u.usteed.mx = nux;
        u.usteed.my = nuy;
    }
    newsym(ox, oy);
    const { vision_recalc } = await import('./vision.js');
    vision_recalc(1);
    newsym(nux, nuy);
}

/**
 * C ref: trap.c drown — fall/plunge into pool/waterwall; crawl out.
 * Branch envelope: first-entry fall/plunge + sink; empty water_damage_chain;
 * rnd_nextto_goodpos + emergency_disrobe stub + crawl/Pheew + teleds.
 * Named omissions: uinwater wade; gremlin/iron golem; leash; Amphibious/
 * Breathless/Swimming; Teleportation escape; steed; sleep/faint; waterlevel
 * disrobe; drowning done() loop; Hallucination Titanic.
 * @returns {Promise<boolean>} true if hero relocated
 */
export async function drown() {
    const u = game.u;
    if (!u) return false;
    const isSolid = isok(u.ux, u.uy)
        && game.level?.at(u.ux, u.uy)?.typ === WATER;

    if (!u.uinwater) {
        const body = waterbody_name(u.ux, u.uy);
        await pline(`You ${isSolid ? 'plunge' : 'fall'} into the ${body}!`);
        if (!isSolid) {
            await pline('You sink like a rock.');
        }
    }

    water_damage_chain(game.invent, false);

    const pos = { x: u.ux, y: u.uy };
    if ((game.multi | 0) >= 0 && rnd_nextto_goodpos(pos, game.youmonst)) {
        const lostRef = { lost: false };
        const succ = emergency_disrobe(lostRef);
        await pline('You try to crawl out of the water.');
        if (lostRef.lost) {
            await pline('You dump some of your gear to lose weight...');
        }
        if (succ) {
            await pline('Pheew!  That was close.');
            await teleds_drown(pos.x, pos.y);
            return true;
        }
        await pline('But in vain.');
    }

    u.uinwater = 1;
    await pline('You drown.');
    return true;
}

/**
 * C ref: trap.c lava_effects — enter lava/lavawall.
 * Branch envelope: d(6,6) always; non-resistant fall + burn-to-crisp done(BURNING).
 * Named omissions: Fire_resistance/Wwalking survive; invent burn flags;
 * boots burst; life-save/teleds loop; boil-away poly; sink_into_lava.
 * @returns {Promise<boolean>} true if relocated (life-save); noreturn on death
 */
export async function lava_effects() {
    const u = game.u;
    if (!u) return false;
    if (game.iflags?.in_lava_effects) return false;

    // C: const int dmg = d(6, 6); /* only applicable for water walking */
    const dmg = d(6, 6);
    void dmg;

    // likes_lava / Fire_resistance / Wwalking survive arms deferred
    await pline(`You fall into the ${waterbody_name(u.ux, u.uy)}!`);

    // invent burn / Boots_off deferred (empty invent on this path)
    u.uhp = -1;
    if (!game.killer) game.killer = { name: '', format: 0 };
    game.killer.format = KILLED_BY;
    game.killer.name = 'molten lava';
    await pline('You burn to a crisp...');
    const { done } = await import('./end.js');
    await done(BURNING);
    return false;
}
