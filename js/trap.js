// trap.js -- Trap mechanics
// C ref: trap.c — m_harmless_trap(), floor_trigger(), mintrap(), check_in_air()
//
// INCOMPLETE / MISSING vs C trap.c:
// - mintrap: only PIT/SPIKED_PIT, TELEP_TRAP, MAGIC_TRAP handled
// - Missing: ARROW_TRAP, DART_TRAP, ROCKTRAP, SQKY_BOARD, LANDMINE, ROLLING_BOULDER
// - Missing: LEVEL_TELEP, POLY_TRAP, VIBRATING_SQUARE effects
// - No dotrap (player trap handling)
// - No launch_obj (launched object mechanics)
// - m_harmless_trap: no resists_magm check for ANTI_MAGIC

import { COLNO, ROWNO, ACCESSIBLE, isok } from './config.js';
import { rn2, rnd } from './rng.js';
import { is_mindless, touch_petrifies, resists_ston } from './mondata.js';
import { mon_knows_traps, mon_learns_traps } from './mondata.js';
import { mondead } from './monutil.js';
import { mons,
         PM_IRON_GOLEM,
         M1_FLY, M1_AMORPHOUS, M1_CLING,
         MR_FIRE, MR_SLEEP,
         MZ_SMALL,
         S_EYE, S_LIGHT, S_PIERCER } from './monsters.js';
import { STATUE_TRAP, MAGIC_TRAP, VIBRATING_SQUARE, RUST_TRAP, FIRE_TRAP,
         SLP_GAS_TRAP, BEAR_TRAP, PIT, SPIKED_PIT, HOLE, TRAPDOOR,
         TELEP_TRAP, WEB, ANTI_MAGIC } from './symbols.js';
import { is_flammable, is_rustprone, is_rottable, is_corrodeable,
         is_crackable, erosion_matters } from './mkobj.js';
import { CORPSE, WEAPON_CLASS, ARMOR_CLASS } from './objects.js';

// Trap result constants
const Trap_Effect_Finished = 0;
const Trap_Caught_Mon = 1;
const Trap_Killed_Mon = 2;
const Trap_Moved_Mon = 3;

// C ref: trap.c m_harmless_trap()
// Returns true if the trap is harmless to this monster (no avoidance needed).
export function m_harmless_trap(mon, trap) {
    const mdat = mons[mon.mndx] || {};
    const flags1 = mdat.flags1 || 0;
    const mr1 = mdat.mr1 || 0;
    const msize = mdat.size || 0;

    // C ref: floor_trigger + check_in_air — flyers avoid floor traps
    const isFloor = trap.ttyp >= 1 && trap.ttyp <= TRAPDOOR; // ARROW..TRAPDOOR
    if (isFloor && (flags1 & M1_FLY)) return true;

    switch (trap.ttyp) {
    case STATUE_TRAP:
    case MAGIC_TRAP:
    case VIBRATING_SQUARE:
        return true;
    case RUST_TRAP:
        return mon.mndx !== PM_IRON_GOLEM;
    case FIRE_TRAP:
        return !!(mr1 & MR_FIRE);
    case SLP_GAS_TRAP:
        return !!(mr1 & MR_SLEEP);
    case BEAR_TRAP:
        return msize <= MZ_SMALL || !!(flags1 & M1_AMORPHOUS);
    case PIT: case SPIKED_PIT: case HOLE: case TRAPDOOR:
        return !!(flags1 & M1_CLING);
    case WEB:
        return !!(flags1 & M1_AMORPHOUS);
    case ANTI_MAGIC:
        return false;
    default:
        return false;
    }
}

// C ref: trap.c floor_trigger() — traps triggered by touching floor.
export function floor_trigger(ttyp) {
    return ttyp >= 1 && ttyp <= TRAPDOOR;
}

// C ref: trap.c check_in_air() subset for monsters.
function mon_check_in_air(mon) {
    const mdat = mon?.type || {};
    const mlet = mdat.symbol ?? -1;
    const flags1 = mdat.flags1 || 0;
    const isFloater = (mlet === S_EYE || mlet === S_LIGHT);
    const isFlyer = !!(flags1 & M1_FLY);
    return isFloater || isFlyer;
}

export function mintrap_postmove(mon, map, player) {
    const trap = map.trapAt(mon.mx, mon.my);
    if (!trap) {
        mon.mtrapped = 0;
        return Trap_Effect_Finished;
    }

    if (mon.mtrapped) {
        if (!rn2(40)) {
            mon.mtrapped = 0;
            return Trap_Effect_Finished;
        }
        return Trap_Caught_Mon;
    }

    const tt = trap.ttyp;
    const already_seen = mon_knows_traps(mon, tt)
        || (tt === HOLE && !is_mindless(mon.type || {}));

    if (floor_trigger(tt) && mon_check_in_air(mon)) {
        return Trap_Effect_Finished;
    }
    if (already_seen && rn2(4)) {
        return Trap_Effect_Finished;
    }

    mon_learns_traps(mon, tt);

    if (m_harmless_trap(mon, trap)) {
        return Trap_Effect_Finished;
    }

    switch (trap.ttyp) {
    case PIT:
    case SPIKED_PIT: {
        mon.mtrapped = 1;
        const dmg = rnd(trap.ttyp === PIT ? 6 : 10);
        mon.mhp -= Math.max(0, dmg);
        if (mon.mhp <= 0) {
            mondead(mon, map);
            map.removeMonster(mon);
            return Trap_Killed_Mon;
        }
        return Trap_Caught_Mon;
    }
    case TELEP_TRAP: {
        if (map.flags && map.flags.noteleport) return Trap_Effect_Finished;
        for (let tries = 0; tries < 50; tries++) {
            const nx = rnd(COLNO - 1);
            const ny = rn2(ROWNO);
            const loc = map.at(nx, ny);
            if (!loc || !ACCESSIBLE(loc.typ)) continue;
            if (map.monsterAt(nx, ny)) continue;
            if (player && nx === player.x && ny === player.y) continue;
            if (nx === mon.mx && ny === mon.my) continue;
            mon.mx = nx;
            mon.my = ny;
            return Trap_Moved_Mon;
        }
        return Trap_Moved_Mon;
    }
    case MAGIC_TRAP:
        rn2(21);
        return Trap_Effect_Finished;
    default:
        return Trap_Effect_Finished;
    }
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
