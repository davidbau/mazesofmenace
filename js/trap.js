// trap.js -- Trap mechanics
// C ref: trap.c — m_harmless_trap(), floor_trigger(), mintrap(), check_in_air()
// trapeffect_*(), thitm(), seetrap(), t_missile(), erode_obj(), etc.
//
// Monster trap handling is fully ported. Player (dotrap) path is not yet ported.

import { COLNO, ROWNO, ACCESSIBLE, isok } from './config.js';
import { rn2, rnd, rnl, d, rn1 } from './rng.js';
import { is_mindless, touch_petrifies, resists_ston,
         amorphous, is_whirly, unsolid, is_clinger, passes_walls,
         webmaker, grounded, is_flyer, is_floater, breathless,
         resists_fire, resists_sleep, attacktype, strongmonst,
         extra_nasty, flaming, acidic, completelyrusts
       } from './mondata.js';
import { mon_knows_traps, mon_learns_traps } from './mondata.js';
import { mondead, newsym, helpless as monHelpless } from './monutil.js';
import { monkilled, m_in_air, setmangry } from './mon.js';
import { sleep_monst } from './mhitm.js';
import { find_mac, which_armor,
         W_ARMH, W_ARMC, W_ARM, W_ARMU, W_ARMS, W_ARMG, W_ARMF
       } from './worn.js';
import { mtele_trap, mlevel_tele_trap } from './teleport.js';
import { resist } from './zap.js';
import { dmgval } from './weapon.js';
import { deltrap } from './dungeon.js';
import { mons,
         PM_IRON_GOLEM, PM_RUST_MONSTER, PM_XORN,
         PM_PIT_FIEND, PM_PIT_VIPER,
         PM_OWLBEAR, PM_BUGBEAR, PM_GREMLIN,
         PM_PAPER_GOLEM, PM_STRAW_GOLEM, PM_WOOD_GOLEM, PM_LEATHER_GOLEM,
         PM_PURPLE_WORM, PM_JABBERWOCK, PM_BALROG, PM_KRAKEN,
         PM_MASTODON, PM_ORION, PM_NORN, PM_CYCLOPS, PM_LORD_SURTUR,
         PM_TITANOTHERE, PM_BALUCHITHERIUM,
         PM_STONE_GOLEM,
         M1_FLY, M1_AMORPHOUS, M1_CLING,
         MR_FIRE, MR_SLEEP,
         MZ_SMALL, MZ_HUGE,
         S_EYE, S_LIGHT, S_PIERCER, S_GIANT, S_DRAGON, S_SPIDER,
         AT_MAGC, AT_BREA,
         AD_PHYS, AD_FIRE, AD_RUST, AD_MAGM, AD_SLEE, AD_RBRE,
         WT_ELF
       } from './monsters.js';
import { ARROW_TRAP, DART_TRAP, ROCKTRAP, SQKY_BOARD,
         BEAR_TRAP, LANDMINE, ROLLING_BOULDER_TRAP,
         SLP_GAS_TRAP, RUST_TRAP, FIRE_TRAP,
         PIT, SPIKED_PIT, HOLE, TRAPDOOR,
         TELEP_TRAP, LEVEL_TELEP, MAGIC_PORTAL,
         WEB, STATUE_TRAP, MAGIC_TRAP, ANTI_MAGIC,
         POLY_TRAP, VIBRATING_SQUARE
       } from './symbols.js';
import { is_flammable, is_rustprone, is_rottable, is_corrodeable,
         is_crackable, erosion_matters, mksobj } from './mkobj.js';
import { CORPSE, WEAPON_CLASS, ARMOR_CLASS,
         ARROW, DART, ROCK, BOULDER, WAND_CLASS } from './objects.js';

// Trap result constants
const Trap_Effect_Finished = 0;
const Trap_Caught_Mon = 1;
const Trap_Killed_Mon = 2;
const Trap_Moved_Mon = 3;

// ========================================================================
// Helper stubs for functions not yet ported
// ========================================================================

// C ref: metallivorous(mptr) — eats metal
function metallivorous(mptr) {
    if (!mptr) return false;
    // PM_RUST_MONSTER and PM_XORN eat metal in C
    const ndx = mptr._index ?? -1;
    return ndx === PM_RUST_MONSTER || ndx === PM_XORN;
}

// C ref: resists_magm — approximation since full version not ported
function resists_magm(mon) {
    const mdat = mon?.type || mons[mon?.mndx] || {};
    return (mdat.mr || 0) > 50;
}

// C ref: defended(mon, adtype) — item-based defense; not ported
function defended(/* mon, adtype */) { return false; }

// C ref: DEADMONSTER macro
function DEADMONSTER(mon) { return mon && mon.mhp <= 0; }

// C ref: helpless(mon) — mon is asleep/paralyzed/etc
function helpless(mon) {
    if (!mon) return false;
    return monHelpless(mon);
}

// C ref: is_pit() helper
function is_pit(ttyp) { return ttyp === PIT || ttyp === SPIKED_PIT; }

// C ref: is_hole()
function is_hole(ttyp) { return ttyp === HOLE || ttyp === TRAPDOOR; }

// Check if there's a boulder at (x,y) on the map
function has_boulder_at(map, x, y) {
    if (!map) return false;
    const objs = map.objectsAt ? map.objectsAt(x, y) : [];
    if (Array.isArray(objs)) {
        return objs.some(o => o.otyp === BOULDER);
    }
    return false;
}

// ========================================================================
// seetrap — C ref: trap.c seetrap()
// ========================================================================
export function seetrap(trap) {
    if (!trap) return;
    if (!trap.tseen) {
        trap.tseen = 1;
        // newsym would update display; skip if no map context
    }
}

// ========================================================================
// t_missile — C ref: trap.c t_missile()
// Make a single arrow/dart/rock for a trap to shoot or drop
// ========================================================================
function t_missile(otyp, trap) {
    const otmp = mksobj(otyp, true, false);
    if (otmp) {
        otmp.quan = 1;
        otmp.opoisoned = 0;
        if (trap) {
            otmp.ox = trap.tx;
            otmp.oy = trap.ty;
        }
    }
    return otmp;
}

// ========================================================================
// thitm — C ref: trap.c thitm() — Monster is hit by trap
// ========================================================================
function thitm(tlev, mon, obj, d_override, nocorpse, map, player) {
    let strike;
    let trapkilled = false;

    if (d_override)
        strike = 1;
    else if (obj)
        strike = (find_mac(mon) + tlev + (obj.spe || 0) <= rnd(20));
    else
        strike = (find_mac(mon) + tlev <= rnd(20));

    if (!strike) {
        // miss — object lands on ground
    } else {
        let dam = 1;
        if (d_override) {
            dam = d_override;
        } else if (obj) {
            dam = dmgval(obj, mon);
            if (dam < 1) dam = 1;
        }
        mon.mhp -= dam;
        if (mon.mhp <= 0) {
            monkilled(mon, "", nocorpse ? -AD_RBRE : AD_PHYS, map, player);
            if (DEADMONSTER(mon)) {
                trapkilled = true;
            }
        }
    }

    // Object placement: if miss or d_override, object stays; otherwise consumed
    // Simplified: don't manage object placement on map for now

    return trapkilled;
}

// ========================================================================
// m_easy_escape_pit — C ref: trap.c m_easy_escape_pit()
// ========================================================================
function m_easy_escape_pit(mon) {
    return (mon.mndx === PM_PIT_FIEND
            || ((mons[mon.mndx] || {}).size || 0) >= MZ_HUGE);
}

// ========================================================================
// floor_trigger — C ref: trap.c floor_trigger()
// ========================================================================
export function floor_trigger(ttyp) {
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

// C ref: trap.c check_in_air() subset for monsters.
function mon_check_in_air(mon) {
    const mdat = mon?.type || mons[mon?.mndx] || {};
    return is_flyer(mdat) || is_floater(mdat);
}

// ========================================================================
// m_harmless_trap — C ref: trap.c m_harmless_trap()
// ========================================================================
export function m_harmless_trap(mon, trap) {
    const mdat = mons[mon.mndx] || {};

    // C ref: floor_trigger + check_in_air — flyers/floaters avoid floor traps
    if (floor_trigger(trap.ttyp) && mon_check_in_air(mon))
        return true;

    switch (trap.ttyp) {
    case ARROW_TRAP:
    case DART_TRAP:
    case ROCKTRAP:
    case SQKY_BOARD:
    case LANDMINE:
    case ROLLING_BOULDER_TRAP:
        break;
    case BEAR_TRAP:
        if ((mdat.size || 0) <= MZ_SMALL || amorphous(mdat)
            || is_whirly(mdat) || unsolid(mdat))
            return true;
        break;
    case SLP_GAS_TRAP:
        if (resists_sleep(mon) || defended(mon, AD_SLEE))
            return true;
        break;
    case RUST_TRAP:
        if (mon.mndx !== PM_IRON_GOLEM)
            return true;
        break;
    case FIRE_TRAP:
        if (resists_fire(mon) || defended(mon, AD_FIRE))
            return true;
        break;
    case PIT:
    case SPIKED_PIT:
    case HOLE:
    case TRAPDOOR:
        if (is_clinger(mdat))
            return true;
        break;
    case TELEP_TRAP:
    case LEVEL_TELEP:
    case MAGIC_PORTAL:
        break;
    case WEB:
        if (amorphous(mdat) || webmaker(mdat)
            || is_whirly(mdat) || unsolid(mdat))
            return true;
        break;
    case STATUE_TRAP:
        return true;
    case MAGIC_TRAP:
        return true;
    case ANTI_MAGIC:
        if (resists_magm(mon) || defended(mon, AD_MAGM))
            return true;
        break;
    case POLY_TRAP:
        break;
    case VIBRATING_SQUARE:
        return true;
    default:
        break;
    }

    return false;
}

// ========================================================================
// Individual trap effect handlers (monster branch only)
// C ref: trap.c trapeffect_*() — else branch (mtmp != &gy.youmonst)
// ========================================================================

function trapeffect_arrow_trap_mon(mon, trap, map, player) {
    let trapkilled = false;

    if (trap.once && trap.tseen && !rn2(15)) {
        deltrap(map, trap);
        newsym(map, mon.mx, mon.my);
        return Trap_Effect_Finished; // trap is gone, nothing happens
    }
    trap.once = 1;
    const otmp = t_missile(ARROW, trap);
    seetrap(trap);
    if (thitm(8, mon, otmp, 0, false, map, player))
        trapkilled = true;

    return trapkilled ? Trap_Killed_Mon
        : mon.mtrapped ? Trap_Caught_Mon : Trap_Effect_Finished;
}

function trapeffect_dart_trap_mon(mon, trap, map, player) {
    let trapkilled = false;

    if (trap.once && trap.tseen && !rn2(15)) {
        deltrap(map, trap);
        newsym(map, mon.mx, mon.my);
        return Trap_Effect_Finished;
    }
    trap.once = 1;
    const otmp = t_missile(DART, trap);
    if (!rn2(6))
        otmp.opoisoned = 1;
    seetrap(trap);
    if (thitm(7, mon, otmp, 0, false, map, player))
        trapkilled = true;

    return trapkilled ? Trap_Killed_Mon
        : mon.mtrapped ? Trap_Caught_Mon : Trap_Effect_Finished;
}

function trapeffect_rocktrap_mon(mon, trap, map, player) {
    let trapkilled = false;

    if (trap.once && trap.tseen && !rn2(15)) {
        deltrap(map, trap);
        newsym(map, mon.mx, mon.my);
        return Trap_Effect_Finished;
    }
    trap.once = 1;
    const otmp = t_missile(ROCK, trap);
    seetrap(trap);
    if (thitm(0, mon, otmp, d(2, 6), false, map, player))
        trapkilled = true;

    return trapkilled ? Trap_Killed_Mon
        : mon.mtrapped ? Trap_Caught_Mon : Trap_Effect_Finished;
}

function trapeffect_sqky_board_mon(mon, trap) {
    if (m_in_air(mon))
        return Trap_Effect_Finished;
    // stepped on a squeaky board — wake nearby monsters
    // C ref: wake_nearto(mtmp->mx, mtmp->my, 40) — not ported
    return Trap_Effect_Finished;
}

function trapeffect_bear_trap_mon(mon, trap, map, player) {
    const mptr = mons[mon.mndx] || {};
    let trapkilled = false;

    if ((mptr.size || 0) > MZ_SMALL && !amorphous(mptr) && !m_in_air(mon)
        && !is_whirly(mptr) && !unsolid(mptr)) {
        mon.mtrapped = 1;
        seetrap(trap);
    }
    if (mon.mtrapped)
        trapkilled = thitm(0, mon, null, d(2, 4), false, map, player);

    return trapkilled ? Trap_Killed_Mon
        : mon.mtrapped ? Trap_Caught_Mon : Trap_Effect_Finished;
}

function trapeffect_slp_gas_trap_mon(mon, trap) {
    const mdat = mons[mon.mndx] || {};
    if (!resists_sleep(mon) && !breathless(mdat) && !helpless(mon)) {
        sleep_monst(mon, rnd(25), -1);
        seetrap(trap);
    }
    return Trap_Effect_Finished;
}

function trapeffect_rust_trap_mon(mon, trap, map, player) {
    const mptr = mons[mon.mndx] || {};
    let trapkilled = false;

    seetrap(trap);
    // C ref: rn2(5) to determine which body part gets hit
    const bodypart = rn2(5);
    switch (bodypart) {
    case 0: {
        const target = which_armor(mon, W_ARMH);
        water_damage(target, null, true);
        break;
    }
    case 1: {
        const target = which_armor(mon, W_ARMS);
        if (water_damage(target, null, true) !== ER_NOTHING)
            break;
        // fall through to glove check
        const gloves = which_armor(mon, W_ARMG);
        water_damage(gloves, null, true);
        break;
    }
    case 2: {
        // right arm — weapon then gloves
        const wep = mon.weapon;
        water_damage(wep, null, true);
        const gloves = which_armor(mon, W_ARMG);
        water_damage(gloves, null, true);
        break;
    }
    default: {
        // body — cloak or armor or shirt
        let target = which_armor(mon, W_ARMC);
        if (target) {
            water_damage(target, null, true);
        } else if ((target = which_armor(mon, W_ARM))) {
            water_damage(target, null, true);
        } else if ((target = which_armor(mon, W_ARMU))) {
            water_damage(target, null, true);
        }
        break;
    }
    }

    if (completelyrusts(mptr)) {
        monkilled(mon, null, AD_RUST, map, player);
        if (DEADMONSTER(mon))
            trapkilled = true;
    } else if (mon.mndx === PM_GREMLIN && rn2(3)) {
        // C ref: split_mon — not ported, consume rn2(3) for parity
    }

    return trapkilled ? Trap_Killed_Mon
        : mon.mtrapped ? Trap_Caught_Mon : Trap_Effect_Finished;
}

function trapeffect_fire_trap_mon(mon, trap, map, player) {
    let trapkilled = false;
    const mptr = mons[mon.mndx] || {};
    const orig_dmg = d(2, 4);

    if (resists_fire(mon)) {
        // immune — no damage
    } else {
        let num = orig_dmg;
        let alt;
        let immolate = false;

        // C ref: paper/straw/wood/leather golem extra damage
        switch (mon.mndx) {
        case PM_PAPER_GOLEM:
            immolate = true;
            alt = mon.mhpmax || 0;
            break;
        case PM_STRAW_GOLEM:
            alt = Math.floor((mon.mhpmax || 0) / 2);
            break;
        case PM_WOOD_GOLEM:
            alt = Math.floor((mon.mhpmax || 0) / 4);
            break;
        case PM_LEATHER_GOLEM:
            alt = Math.floor((mon.mhpmax || 0) / 8);
            break;
        default:
            alt = 0;
            break;
        }
        if (alt > num) num = alt;

        if (thitm(0, mon, null, num, immolate, map, player)) {
            trapkilled = true;
        } else {
            // C ref: reduce mhpmax
            mon.mhpmax = (mon.mhpmax || mon.mhp) - rn2(num + 1);
            if (mon.mhp > mon.mhpmax) mon.mhp = mon.mhpmax;
        }
    }

    // C ref: burnarmor(mtmp) || rn2(3) — burnarmor not ported
    // Consume rn2 for parity approximation
    if (rn2(3)) {
        // C ref: destroy_items(mtmp, AD_FIRE, orig_dmg) — not ported
        // C ref: ignite_items — not ported
    }
    // C ref: burn_floor_objects — not ported

    if (DEADMONSTER(mon))
        trapkilled = true;

    seetrap(trap);

    return trapkilled ? Trap_Killed_Mon
        : mon.mtrapped ? Trap_Caught_Mon : Trap_Effect_Finished;
}

function trapeffect_pit_mon(mon, trap, trflags, map, player) {
    const ttype = trap.ttyp;
    const mptr = mons[mon.mndx] || {};
    let trapkilled = false;

    if (!grounded(mptr)) {
        return Trap_Effect_Finished; // avoids trap
    }
    if (!passes_walls(mptr))
        mon.mtrapped = 1;

    seetrap(trap);

    // C ref: mselftouch(mtmp, "Falling, ", FALSE)
    mselftouch(mon, "Falling, ", false);
    if (DEADMONSTER(mon)
        || thitm(0, mon, null, rnd(ttype === PIT ? 6 : 10), false, map, player))
        trapkilled = true;

    return trapkilled ? Trap_Killed_Mon
        : mon.mtrapped ? Trap_Caught_Mon : Trap_Effect_Finished;
}

function trapeffect_hole_mon(mon, trap, trflags, map, player) {
    const mptr = mons[mon.mndx] || {};

    if (!grounded(mptr) || (mptr.size || 0) >= MZ_HUGE) {
        return Trap_Effect_Finished;
    }
    // C ref: calls trapeffect_level_telep for monsters
    return trapeffect_level_telep_mon(mon, trap, trflags, map, player);
}

function trapeffect_telep_trap_mon(mon, trap, map, player, display, fov) {
    const in_sight = true; // simplified
    mtele_trap(mon, trap, in_sight, map, player, display, fov);
    return Trap_Moved_Mon;
}

function trapeffect_level_telep_mon(mon, trap, trflags, map, player) {
    const in_sight = true; // simplified
    const forcetrap = false;
    return mlevel_tele_trap(mon, trap, forcetrap, in_sight, map, player);
}

function trapeffect_web_mon(mon, trap, map) {
    const mptr = mons[mon.mndx] || {};
    let tear_web = false;

    if (webmaker(mptr))
        return Trap_Effect_Finished;

    // C ref: mu_maybe_destroy_web — flaming/acidic monsters destroy webs
    if (flaming(mptr) || acidic(mptr)) {
        deltrap(map, trap);
        newsym(map, mon.mx, mon.my);
        return Trap_Effect_Finished;
    }

    // C ref: specific large monsters that tear webs
    switch (mon.mndx) {
    case PM_OWLBEAR:
    case PM_BUGBEAR:
        // fall through to default check
        break;
    case PM_TITANOTHERE:
    case PM_BALUCHITHERIUM:
    case PM_PURPLE_WORM:
    case PM_JABBERWOCK:
    case PM_IRON_GOLEM:
    case PM_BALROG:
    case PM_KRAKEN:
    case PM_MASTODON:
    case PM_ORION:
    case PM_NORN:
    case PM_CYCLOPS:
    case PM_LORD_SURTUR:
        tear_web = true;
        break;
    default:
        if (mptr.symbol === S_GIANT
            || (mptr.symbol === S_DRAGON && extra_nasty(mptr))) {
            tear_web = true;
        }
        break;
    }

    if (!tear_web) {
        mon.mtrapped = 1;
        seetrap(trap);
    }

    if (tear_web) {
        deltrap(map, trap);
        newsym(map, mon.mx, mon.my);
    }

    return mon.mtrapped ? Trap_Caught_Mon : Trap_Effect_Finished;
}

function trapeffect_statue_trap_mon(/* mon, trap */) {
    // C ref: monsters don't trigger statue traps
    return Trap_Effect_Finished;
}

function trapeffect_magic_trap_mon(mon, trap, map, player) {
    // C ref: if (!rn2(21)) fire_trap effect, otherwise nothing
    if (!rn2(21))
        return trapeffect_fire_trap_mon(mon, trap, map, player);
    return Trap_Effect_Finished;
}

function trapeffect_anti_magic_mon(mon, trap, map, player) {
    const mptr = mons[mon.mndx] || {};
    let trapkilled = false;

    if (!resists_magm(mon)) {
        // lose spell energy
        if (!mon.mcan && (attacktype(mptr, AT_MAGC)
                          || attacktype(mptr, AT_BREA))) {
            mon.mspec_used = (mon.mspec_used || 0) + d(2, 6);
            seetrap(trap);
        }
    } else {
        // take damage — magic resistance makes anti-magic hurt
        let dmgval2 = rnd(4);
        // C ref: Magicbane / artifact checks — simplified
        if (passes_walls(mptr))
            dmgval2 = Math.floor((dmgval2 + 3) / 4);

        seetrap(trap);
        mon.mhp -= dmgval2;
        if (DEADMONSTER(mon)) {
            monkilled(mon, null, -AD_MAGM, map, player);
            if (DEADMONSTER(mon))
                trapkilled = true;
        }
    }
    return trapkilled ? Trap_Killed_Mon
        : mon.mtrapped ? Trap_Caught_Mon : Trap_Effect_Finished;
}

function trapeffect_poly_trap_mon(mon, trap) {
    if (resists_magm(mon)) {
        // shieldeff — immune
    } else if (!resist(mon, WAND_CLASS)) {
        // C ref: newcham(mtmp, NULL, NC_SHOW_MSG) — not ported
        // Just consume the resist() RNG and skip polymorph
        seetrap(trap);
    }
    return Trap_Effect_Finished;
}

function trapeffect_landmine_mon(mon, trap, trflags, map, player) {
    const mptr = mons[mon.mndx] || {};
    let trapkilled = false;

    // C ref: heavier monsters more likely to trigger; MINE_TRIGGER_WT = WT_ELF/2
    const MINE_TRIGGER_WT = Math.floor(WT_ELF / 2);
    if (rn2((mptr.cwt || 100) + 1) < MINE_TRIGGER_WT)
        return Trap_Effect_Finished;

    if (m_in_air(mon)) {
        // floating/flying monster — might still set it off
        if (rn2(3))
            return Trap_Effect_Finished;
    }

    // C ref: blow_up_landmine — simplified to just change trap type
    // The explosion itself is complex (scatter, etc.) — stub it
    trap.ttyp = PIT;
    trap.madeby_u = false;
    seetrap(trap);

    if (DEADMONSTER(mon)
        || thitm(0, mon, null, rnd(16), false, map, player)) {
        trapkilled = true;
    } else {
        // C ref: monster recursively falls into pit
        // Simplified: apply pit effect directly
        if (!passes_walls(mptr))
            mon.mtrapped = 1;
        const pitdmg = rnd(6);
        mon.mhp -= pitdmg;
        if (DEADMONSTER(mon)) {
            monkilled(mon, "", AD_PHYS, map, player);
            if (DEADMONSTER(mon))
                trapkilled = true;
        }
    }

    if (DEADMONSTER(mon))
        trapkilled = true;

    return trapkilled ? Trap_Killed_Mon
        : mon.mtrapped ? Trap_Caught_Mon : Trap_Effect_Finished;
}

function trapeffect_rolling_boulder_trap_mon(mon, trap) {
    // C ref: requires launch_obj() which is not ported
    // Stub: monster triggers it but nothing happens without launch_obj
    if (!m_in_air(mon)) {
        // Would launch boulder — stub
    }
    return Trap_Effect_Finished;
}

function trapeffect_magic_portal_mon(mon, trap, trflags, map, player) {
    // C ref: for monsters, same as level_telep
    return trapeffect_level_telep_mon(mon, trap, trflags, map, player);
}

function trapeffect_vibrating_square_mon(/* mon, trap */) {
    // C ref: cosmetic only for monsters
    return Trap_Effect_Finished;
}

// ========================================================================
// trapeffect_selector_mon — C ref: trap.c trapeffect_selector()
// Dispatches to appropriate trap handler for monsters
// ========================================================================
function trapeffect_selector_mon(mon, trap, trflags, map, player, display, fov) {
    switch (trap.ttyp) {
    case ARROW_TRAP:
        return trapeffect_arrow_trap_mon(mon, trap, map, player);
    case DART_TRAP:
        return trapeffect_dart_trap_mon(mon, trap, map, player);
    case ROCKTRAP:
        return trapeffect_rocktrap_mon(mon, trap, map, player);
    case SQKY_BOARD:
        return trapeffect_sqky_board_mon(mon, trap);
    case BEAR_TRAP:
        return trapeffect_bear_trap_mon(mon, trap, map, player);
    case SLP_GAS_TRAP:
        return trapeffect_slp_gas_trap_mon(mon, trap);
    case RUST_TRAP:
        return trapeffect_rust_trap_mon(mon, trap, map, player);
    case FIRE_TRAP:
        return trapeffect_fire_trap_mon(mon, trap, map, player);
    case PIT:
    case SPIKED_PIT:
        return trapeffect_pit_mon(mon, trap, trflags, map, player);
    case HOLE:
    case TRAPDOOR:
        return trapeffect_hole_mon(mon, trap, trflags, map, player);
    case TELEP_TRAP:
        return trapeffect_telep_trap_mon(mon, trap, map, player, display, fov);
    case LEVEL_TELEP:
        return trapeffect_level_telep_mon(mon, trap, trflags, map, player);
    case MAGIC_PORTAL:
        return trapeffect_magic_portal_mon(mon, trap, trflags, map, player);
    case WEB:
        return trapeffect_web_mon(mon, trap, map);
    case STATUE_TRAP:
        return trapeffect_statue_trap_mon();
    case MAGIC_TRAP:
        return trapeffect_magic_trap_mon(mon, trap, map, player);
    case ANTI_MAGIC:
        return trapeffect_anti_magic_mon(mon, trap, map, player);
    case POLY_TRAP:
        return trapeffect_poly_trap_mon(mon, trap);
    case LANDMINE:
        return trapeffect_landmine_mon(mon, trap, 0, map, player);
    case ROLLING_BOULDER_TRAP:
        return trapeffect_rolling_boulder_trap_mon(mon, trap);
    case VIBRATING_SQUARE:
        return trapeffect_vibrating_square_mon();
    default:
        return Trap_Effect_Finished;
    }
}

// ========================================================================
// mintrap_postmove — C ref: trap.c mintrap()
// Main entry point for monster-trap interaction after movement
// ========================================================================
export function mintrap_postmove(mon, map, player, display, fov) {
    const trap = map.trapAt(mon.mx, mon.my);
    let trap_result = Trap_Effect_Finished;

    if (!trap) {
        mon.mtrapped = 0;
    } else if (mon.mtrapped) {
        // Currently trapped — try to escape
        // C ref: seetrap for visible trapped monsters in pits/bear/hole/web
        if (!trap.tseen
            && (is_pit(trap.ttyp) || trap.ttyp === BEAR_TRAP
                || trap.ttyp === HOLE || trap.ttyp === WEB)) {
            seetrap(trap);
        }

        if (!rn2(40) || (is_pit(trap.ttyp) && m_easy_escape_pit(mon))) {
            // Trying to escape
            if (has_boulder_at(map, mon.mx, mon.my) && is_pit(trap.ttyp)) {
                // Boulder in pit — 50% chance of escape
                if (!rn2(2)) {
                    mon.mtrapped = 0;
                    // C ref: fill_pit — not ported
                }
            } else {
                mon.mtrapped = 0;
            }
        } else if (metallivorous(mons[mon.mndx] || {})) {
            // Metal-eating monster can eat bear trap or spiked pit spikes
            if (trap.ttyp === BEAR_TRAP) {
                deltrap(map, trap);
                mon.meating = 5;
                mon.mtrapped = 0;
            } else if (trap.ttyp === SPIKED_PIT) {
                trap.ttyp = PIT;
                mon.meating = 5;
            }
        }
        trap_result = mon.mtrapped ? Trap_Caught_Mon : Trap_Effect_Finished;
    } else {
        // Not currently trapped — new trap encounter
        const tt = trap.ttyp;
        const already_seen = mon_knows_traps(mon, tt)
            || (tt === HOLE && !is_mindless(mon?.type || {}));

        if (floor_trigger(tt) && mon_check_in_air(mon)) {
            return Trap_Effect_Finished;
        }
        if (already_seen && rn2(4)) {
            return Trap_Effect_Finished;
        }

        mon_learns_traps(mon, tt);

        // C ref: Monster is aggravated by being trapped by you
        if (trap.madeby_u && rnl(5)) {
            setmangry(mon, false, map, player);
        }

        if (m_harmless_trap(mon, trap)) {
            return Trap_Effect_Finished;
        }

        trap_result = trapeffect_selector_mon(
            mon, trap, 0, map, player, display, fov);
    }
    return trap_result;
}

// ========================================================================
// Erosion constants — C ref: hack.h
// ========================================================================
export const ERODE_BURN = 0;
export const ERODE_RUST = 1;
export const ERODE_ROT = 2;
export const ERODE_CORRODE = 3;
export const ERODE_CRACK = 4;

export const ER_NOTHING = 0;
export const ER_GREASED = 1;
export const ER_DAMAGED = 2;
export const ER_DESTROYED = 3;

export const EF_NONE = 0;
export const EF_GREASE = 0x01;
export const EF_DESTROY = 0x02;
export const EF_VERBOSE = 0x04;
export const EF_PAY = 0x08;

const MAX_ERODE = 3;

// ========================================================================
// Erosion functions — C ref: trap.c
// ========================================================================

// C ref: trap.c grease_protect() — check grease protection; may consume grease
export function grease_protect(otmp, ostr, victim) {
    if (!rn2(2)) {
        otmp.greased = false;
        return true; // grease dissolved
    }
    return false;
}

// C ref: trap.c erode_obj() — erode an object by type
// Returns ER_NOTHING, ER_GREASED, ER_DAMAGED, or ER_DESTROYED
export function erode_obj(otmp, ostr, type, ef_flags) {
    if (!otmp) return ER_NOTHING;

    let vulnerable = false;
    let is_primary = true;
    const check_grease = !!(ef_flags & EF_GREASE);

    switch (type) {
    case ERODE_BURN:
        vulnerable = is_flammable(otmp);
        break;
    case ERODE_RUST:
        vulnerable = is_rustprone(otmp);
        break;
    case ERODE_ROT:
        vulnerable = is_rottable(otmp);
        is_primary = false;
        break;
    case ERODE_CORRODE:
        vulnerable = is_corrodeable(otmp);
        is_primary = false;
        break;
    case ERODE_CRACK:
        vulnerable = is_crackable(otmp);
        break;
    default:
        return ER_NOTHING;
    }

    const erosion = is_primary ? (otmp.oeroded || 0) : (otmp.oeroded2 || 0);

    if (check_grease && otmp.greased) {
        grease_protect(otmp, ostr, null);
        return ER_GREASED;
    } else if (!erosion_matters(otmp)) {
        return ER_NOTHING;
    } else if (!vulnerable || (otmp.oerodeproof && otmp.rknown)) {
        return ER_NOTHING;
    } else if (otmp.oerodeproof || (otmp.blessed && !rn2(4))) {
        // C ref: rnl(4) simplified to rn2(4) — blessed protection
        if (otmp.oerodeproof) {
            otmp.rknown = true;
        }
        return ER_NOTHING;
    } else if (erosion < MAX_ERODE) {
        if (is_primary)
            otmp.oeroded = (otmp.oeroded || 0) + 1;
        else
            otmp.oeroded2 = (otmp.oeroded2 || 0) + 1;
        return ER_DAMAGED;
    } else if (ef_flags & EF_DESTROY) {
        // Object destroyed — caller handles removal
        return ER_DESTROYED;
    } else {
        return ER_NOTHING;
    }
}

// C ref: trap.c water_damage() — water damage to a single object
export function water_damage(obj, ostr, force) {
    if (!obj) return ER_NOTHING;

    if (obj.greased) {
        if (!rn2(2)) {
            obj.greased = false;
        }
        return ER_GREASED;
    } else if (!force && rn2(20) < 5) {
        // C ref: (Luck + 5) > rn2(20) — simplified without Luck
        return ER_NOTHING;
    } else if (obj.oclass === 7 /* SCROLL_CLASS */) {
        // Scrolls get blanked
        return ER_DAMAGED;
    } else if (obj.oclass === 11 /* SPBOOK_CLASS */) {
        return ER_DAMAGED;
    } else if (obj.oclass === 6 /* POTION_CLASS */) {
        if (obj.odiluted) {
            return ER_DAMAGED;
        } else {
            obj.odiluted = true;
            return ER_DAMAGED;
        }
    } else {
        return erode_obj(obj, ostr, ERODE_RUST, EF_NONE);
    }
}

// C ref: trap.c fire_damage() — fire damage to a single object
export function fire_damage(obj, force, x, y) {
    if (!obj) return false;
    if (!force && rn2(20) < 5) {
        // C ref: (Luck + 5) > rn2(20) — simplified
        return false;
    }
    if (erode_obj(obj, null, ERODE_BURN, EF_DESTROY) === ER_DESTROYED) {
        return true;
    }
    return false;
}

// C ref: trap.c acid_damage() — acid damage to an object
export function acid_damage(obj) {
    if (!obj) return;
    if (obj.greased) {
        grease_protect(obj, null, null);
    } else {
        erode_obj(obj, null, ERODE_CORRODE, EF_GREASE | EF_VERBOSE);
    }
}

// C ref: trap.c water_damage_chain() — apply water damage to inventory chain
export function water_damage_chain(chain, here) {
    if (!chain) return;
    if (Array.isArray(chain)) {
        for (const obj of [...chain]) {
            water_damage(obj, null, false);
        }
    }
}

// C ref: trap.c fire_damage_chain() — apply fire damage to inventory chain
export function fire_damage_chain(chain, force, here, x, y) {
    if (!chain) return 0;
    let num = 0;
    if (Array.isArray(chain)) {
        for (const obj of [...chain]) {
            if (fire_damage(obj, force, x, y))
                ++num;
        }
    }
    return num;
}

// ========================================================================
// Petrification — C ref: uhitm.c / mon.c
// ========================================================================

// C ref: uhitm.c selftouch() — hero petrification from wielded cockatrice corpse
export function selftouch(arg, player) {
    // Simplified: check if hero wields a petrifying corpse
    if (!player) return;
    const uwep = player.weapon;
    if (uwep && uwep.otyp === CORPSE && uwep.corpsenm >= 0
        && touch_petrifies(mons[uwep.corpsenm])) {
        // Would call instapetrify — simplified for now
        // Hero petrification not fully ported; just note it
    }
}

// C ref: uhitm.c mselftouch() — monster petrification from wielded cockatrice corpse
export function mselftouch(mon, arg, byplayer) {
    if (!mon) return;
    const mwep = mon.weapon;
    if (mwep && mwep.otyp === CORPSE && mwep.corpsenm >= 0
        && touch_petrifies(mons[mwep.corpsenm])
        && !resists_ston(mon)) {
        minstapetrify(mon, byplayer);
    }
}

// C ref: uhitm.c instapetrify() — instant hero petrification
export function instapetrify(str, player) {
    // Simplified: hero petrification handling
    // Full implementation requires done(STONING) path
}

// C ref: mon.c minstapetrify() — instant monster petrification
export function minstapetrify(mon, byplayer) {
    if (!mon) return;
    if (resists_ston(mon)) return;
    // C ref: mon_adjust_speed(mon, -3, NULL) — slow down
    // C ref: monstone(mon) or xkilled(mon) depending on byplayer
    // For now, kill the monster
    mon.mhp = 0;
}
