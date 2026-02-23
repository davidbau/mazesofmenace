// mhitm.js -- Monster-vs-monster combat: attacks, damage, special effects
// cf. mhitm.c — fightm, mdisplacem, mattackm, failed_grab,
//               hitmm, gazemm, engulf_target, gulpmm, explmm, mdamagem,
//               mon_poly, paralyze_monst, sleep_monst, slept_monst, rustm,
//               mswingsm, passivemm, xdrainenergym, attk_protection,
//               and static helpers noises, pre_mm_attack, missmm
//
// mhitm.c handles all monster-vs-monster combat resolution:
//   fightm(mtmp): find adjacent enemies and call mattackm().
//   mattackm(magr, mdef): full attack sequence for magr against mdef.
//     Returns bitmask: MM_MISS/MM_HIT/MM_DEF_DIED/MM_AGR_DIED/MM_EXPELLED.
//   mattackm dispatches per attack: hitmm (physical), gazemm (gaze),
//     gulpmm (engulf), explmm (explosion).
//   mdamagem(): apply actual damage and special effects (AT_CLNC, AT_STNG, etc.)
//
// Shared mattackm/mdamagem used by all m-vs-m combat paths including
// pet combat (dogmove.js) and conflict (fightm).

import { rn2, rnd, d, c_d } from './rng.js';
import { distmin } from './hacklib.js';
import { monnear, mondead, monAttackName, map_invisible } from './monutil.js';
import { cansee } from './vision.js';
import {
    monNam, monDisplayName, touch_petrifies, unsolid, resists_fire, resists_cold,
    resists_elec, resists_acid, resists_sleep, resists_ston,
    nonliving, sticks, attacktype,
} from './mondata.js';
import {
    AT_NONE, AT_CLAW, AT_KICK, AT_BITE, AT_TUCH, AT_BUTT, AT_STNG,
    AT_HUGS, AT_TENT, AT_WEAP, AT_GAZE, AT_ENGL, AT_EXPL, AT_BREA,
    AT_SPIT, AT_BOOM, G_NOCORPSE,
    AD_PHYS, AD_ACID, AD_BLND, AD_STUN, AD_PLYS, AD_COLD, AD_FIRE,
    AD_ELEC, AD_WRAP, AD_STCK, AD_DGST,
} from './monsters.js';
import { corpse_chance } from './mon.js';
import { mkcorpstat, xname } from './mkobj.js';
import { CORPSE, WEAPON_CLASS, objectData } from './objects.js';
import {
    M_ATTK_MISS, M_ATTK_HIT, M_ATTK_DEF_DIED,
    M_ATTK_AGR_DIED, M_ATTK_AGR_DONE,
    mhitm_adtyping,
} from './uhitm.js';
import { monsterWeaponSwingVerb, monsterPossessive } from './mhitu.js';
import { find_mac, W_ARMG, W_ARMF, W_ARMH } from './worn.js';

// Re-export M_ATTK_* for convenience
export { M_ATTK_MISS, M_ATTK_HIT, M_ATTK_DEF_DIED, M_ATTK_AGR_DIED, M_ATTK_AGR_DONE };

const NATTK = 6; // C ref: monattk.h — max number of monster attacks


// ============================================================================
// Helper predicates
// ============================================================================

function DEADMONSTER(mon) {
    return !mon || mon.dead || (mon.mhp != null && mon.mhp <= 0);
}

function helpless(mon) {
    if (!mon) return true;
    if (mon.mcanmove === false) return true;
    if (mon.msleeping) return true;
    return false;
}

// cf. worn.c:707 — find_mac(mon): accounts for worn armor via m_dowear.


// ============================================================================
// noises, pre_mm_attack, missmm — display helpers
// ============================================================================

// cf. mhitm.c:26 — noises(magr, mattk): combat noise output
// Simplified: we don't have the distant sound system yet
function noises(magr, mattk) {
    // TODO: implement distant combat noises
}

// cf. mhitm.c:40-72 — pre_mm_attack(): unhide/unmimic, newsym/map_invisible
function pre_mm_attack(magr, mdef, vis, map, ctx) {
    if (mdef.mundetected) mdef.mundetected = 0;
    if (magr.mundetected) magr.mundetected = 0;
    // C ref: mhitm.c:62-71 — mark invisible monsters on map
    if (vis && map) {
        if (!ctx?.agrVisible) {
            map_invisible(map, magr.mx, magr.my, ctx?.player);
        }
        if (!ctx?.defVisible) {
            map_invisible(map, mdef.mx, mdef.my, ctx?.player);
        }
    }
}

// cf. do_name.c:863 x_monnam() — returns "it" when player can't spot the monster.
// In C, canspotmon() is checked per-monster even within visible combat messages.
function monCombatName(mon, visible, { capitalize = false, article = 'the' } = {}) {
    if (visible === false) return capitalize ? 'It' : 'it';
    return monNam(mon, { capitalize, article });
}

// cf. mhitm.c:75 — missmm(magr, mdef, mattk): miss message
function missmm(magr, mdef, mattk, display, vis, map, ctx) {
    pre_mm_attack(magr, mdef, vis, map, ctx);
    if (vis && display) {
        display.putstr_message(
            `${monCombatName(magr, ctx?.agrVisible, { capitalize: true })} misses ${monCombatName(mdef, ctx?.defVisible)}.`
        );
    }
}


// ============================================================================
// failed_grab — grab feasibility check
// ============================================================================

// cf. mhitm.c:596 — failed_grab(magr, mdef, mattk)
export function failed_grab(magr, mdef, mattk) {
    const pd = mdef.type || {};
    if (unsolid(pd)
        && (mattk.type === AT_HUGS || mattk.damage === AD_WRAP
            || mattk.damage === AD_STCK || mattk.damage === AD_DGST)) {
        return true;
    }
    return false;
}


// ============================================================================
// attk_protection — armor slot for attack type
// ============================================================================

// cf. mhitm.c:1474 — attk_protection(aatyp)
export function attk_protection(aatyp) {
    switch (aatyp) {
    case AT_NONE: case AT_SPIT: case AT_EXPL: case AT_BOOM:
    case AT_GAZE: case AT_BREA:
        return ~0; // no defense needed
    case AT_CLAW: case AT_TUCH: case AT_WEAP:
        return W_ARMG; // gloves
    case AT_KICK:
        return W_ARMF; // boots
    case AT_BUTT:
        return W_ARMH; // helm
    case AT_BITE: case AT_STNG: case AT_HUGS: case AT_ENGL:
    default:
        return 0;
    }
}


// ============================================================================
// paralyze_monst, sleep_monst — status effect helpers
// ============================================================================

// cf. mhitm.c:1209 — paralyze_monst(mon, amt)
export function paralyze_monst(mon, amt) {
    if (amt > 127) amt = 127;
    mon.mcanmove = false;
    mon.mfrozen = amt;
}

// cf. mhitm.c:1222 — sleep_monst(mon, amt, how)
export function sleep_monst(mon, amt, how) {
    if (resists_sleep(mon)) return 0;
    if (mon.mcanmove !== false) {
        amt += (mon.mfrozen || 0);
        if (amt > 0) {
            mon.mcanmove = false;
            mon.mfrozen = Math.min(amt, 127);
        } else {
            mon.msleeping = 1;
        }
        return 1;
    }
    return 0;
}

// cf. mhitm.c:1249 — slept_monst(mon)
export function slept_monst(mon) {
    // TODO: release grab on hero if grabbing while asleep
}

// cf. mhitm.c:1259 — rustm(mdef, obj)
export function rustm(mdef, obj) {
    // TODO: implement weapon erosion
}


// ============================================================================
// xdrainenergym — monster energy drain
// ============================================================================

// cf. mhitm.c:1460 — xdrainenergym(mon, vis)
export function xdrainenergym(mon, vis) {
    if ((mon.mspec_used || 0) < 20) {
        mon.mspec_used = (mon.mspec_used || 0) + d(2, 2);
    }
}


// ============================================================================
// passivemm — passive counterattack (defender retaliates)
// ============================================================================

// cf. mhitm.c:1303 — passivemm(magr, mdef, mhitb, mdead, mwep)
export function passivemm(magr, mdef, mhitb, mdead, mwep, map) {
    const mddat = mdef.type || {};
    const attacks = mddat.attacks || [];
    let mhit = mhitb ? M_ATTK_HIT : M_ATTK_MISS;

    // Find the AT_NONE (passive) attack
    // C ref: in C, unused attack slots are NO_ATTK = {AT_NONE, AD_NONE, 0, 0}.
    // JS attacks arrays are compact (no NO_ATTK padding), so if no explicit
    // AT_NONE passive is found but attacks.length < NATTK, synthesize a NO_ATTK
    // entry to match C's behavior (which still consumes rn2(3) for the no-op).
    let passiveAttk = null;
    for (let i = 0; i < attacks.length; i++) {
        if (attacks[i].type === AT_NONE) {
            passiveAttk = attacks[i];
            break;
        }
        if (i >= NATTK) return (mdead | mhit);
    }
    if (!passiveAttk) {
        if (attacks.length >= NATTK) return (mdead | mhit);
        // Synthesize NO_ATTK: C would find AT_NONE/AD_PHYS(=AD_NONE)/0/0
        passiveAttk = { type: AT_NONE, damage: AD_PHYS, dice: 0, sides: 0 };
    }

    // Roll damage
    let tmp;
    if (passiveAttk.dice) {
        tmp = d(passiveAttk.dice, passiveAttk.sides || 0);
    } else if (passiveAttk.sides) {
        const mlev = mdef.m_lev ?? mdef.mlevel ?? (mddat.level || 0);
        tmp = d(mlev + 1, passiveAttk.sides);
    } else {
        tmp = 0;
    }

    const adtyp = passiveAttk.damage;

    // Effects that work even if defender died
    if (adtyp === AD_ACID) {
        if (mhitb && !rn2(2)) {
            if (resists_acid(magr)) {
                tmp = 0;
            }
        } else {
            tmp = 0;
        }
        rn2(30); // erode_armor chance
        rn2(6);  // acid_damage chance
        // Apply acid damage and return
        if (tmp > 0) {
            magr.mhp -= tmp;
            if (magr.mhp <= 0) {
                mondead(magr, map);
                return (mdead | mhit | M_ATTK_AGR_DIED);
            }
        }
        return (mdead | mhit);
    }

    // AD_ENCH: drain weapon enchantment
    // TODO: implement drain_item for mwep

    if (mdead || mdef.mcan) return (mdead | mhit);

    // Effects only if defender alive and rn2(3) passes
    if (rn2(3)) {
        switch (adtyp) {
        case AD_PLYS: {
            // Floating eye / gelatinous cube
            if (tmp > 127) tmp = 127;
            if (!rn2(4)) tmp = 127;
            paralyze_monst(magr, tmp);
            return (mdead | mhit);
        }
        case AD_COLD:
            if (resists_cold(magr)) {
                tmp = 0;
            }
            break;
        case AD_STUN:
            if (!magr.mstun) {
                magr.mstun = 1;
            }
            tmp = 0;
            break;
        case AD_FIRE:
            if (resists_fire(magr)) {
                tmp = 0;
            }
            break;
        case AD_ELEC:
            if (resists_elec(magr)) {
                tmp = 0;
            }
            break;
        default:
            tmp = 0;
            break;
        }
    } else {
        tmp = 0;
    }

    // Apply passive damage
    if (tmp > 0) {
        magr.mhp -= tmp;
        if (magr.mhp <= 0) {
            mondead(magr, map);
            return (mdead | mhit | M_ATTK_AGR_DIED);
        }
    }
    return (mdead | mhit);
}


// ============================================================================
// hitmm — process a successful physical hit
// ============================================================================

// cf. mhitm.c:643 — hitmm(magr, mdef, mattk, mwep, dieroll)
function hitmm(magr, mdef, mattk, mwep, dieroll, display, vis, map, ctx) {
    pre_mm_attack(magr, mdef, vis, map, ctx);

    // Display hit message
    if (vis && display) {
        let verb = 'hits';
        switch (mattk.type) {
        case AT_BITE: verb = 'bites'; break;
        case AT_STNG: verb = 'stings'; break;
        case AT_BUTT: verb = 'butts'; break;
        case AT_TUCH: verb = 'touches'; break;
        case AT_TENT: verb = 'sucks'; break;
        case AT_HUGS: verb = 'squeezes'; break;
        default: verb = 'hits'; break;
        }
        display.putstr_message(
            `${monCombatName(magr, ctx?.agrVisible, { capitalize: true })} ${verb} ${monCombatName(mdef, ctx?.defVisible)}.`
        );
    }

    return mdamagem(magr, mdef, mattk, mwep, dieroll, display, vis, map, ctx);
}


// ============================================================================
// gazemm — gaze attack on monster
// ============================================================================

// cf. mhitm.c:735 — gazemm(magr, mdef, mattk)
function gazemm(magr, mdef, mattk, display, vis, map, ctx) {
    // Simplified: gaze attacks between monsters
    if (magr.mcan || !mdef.mcansee) {
        return M_ATTK_MISS;
    }
    // For blinding gaze (Archon), delegate to adtyping
    return mdamagem(magr, mdef, mattk, null, 0, display, vis, map, ctx);
}


// ============================================================================
// explmm — explosion attack (e.g., gas spore)
// ============================================================================

// cf. mhitm.c:969 — explmm(magr, mdef, mattk)
function explmm(magr, mdef, mattk, display, vis, map, ctx) {
    if (magr.mcan) return M_ATTK_MISS;

    let result = mdamagem(magr, mdef, mattk, null, 0, display, vis, map, ctx);

    // Kill off aggressor (self-destruct)
    if (!(result & M_ATTK_AGR_DIED)) {
        mondead(magr, map, ctx?.player);
        if (!DEADMONSTER(magr)) {
            return result; // lifesaved
        }
        result |= M_ATTK_AGR_DIED;
    }
    return result;
}


// ============================================================================
// mhitm_knockback — mon-vs-mon knockback eligibility (RNG faithful)
// ============================================================================

// cf. uhitm.c:5225 mhitm_knockback() — mon-vs-mon path.
// Always consumes rn2(3) for distance and rn2(chance) for trigger.
// If triggered and eligible: rn2(2)+rn2(2) for message, rn2(4) for stun.
// Returns true if knockback would fire.
function mhitm_knockback_mm(magr, mdef, mattk, mwep, vis, display, ctx) {
    rn2(3); // knockback distance (always consumed)
    const chance = 6; // default; Ogresmasher would use 2
    if (rn2(chance)) return false; // didn't trigger

    // Eligibility: only AD_PHYS + specific melee attack types
    if (!(mattk.damage === AD_PHYS
          && (mattk.type === AT_CLAW || mattk.type === AT_KICK
              || mattk.type === AT_BUTT || mattk.type === AT_WEAP))) {
        return false;
    }

    // C ref: uhitm.c:5288 — attacker engulfs/hugs → no knockback
    const pa = magr.type || {};
    if (attacktype(pa, AT_ENGL) || attacktype(pa, AT_HUGS) || sticks(pa)) {
        return false;
    }

    // C ref: uhitm.c:5298 — size check: agr must be much larger
    const agrSize = pa.size ?? 0;
    const defSize = (mdef.type || {}).size ?? 0;
    if (!(agrSize > defSize + 1)) return false;

    // C ref: uhitm.c:5303 — unsolid attacker can't knockback
    if (unsolid(pa)) return false;

    // C ref: uhitm.c:5326 — m_is_steadfast (Woodchuck / Gauntlets of Power)
    // Stub: always false for now (very rare)

    // C ref: uhitm.c:5338 — movement validation (isok + door diagonal)
    // Stub: skip movement validation (we don't implement actual mhurtle)

    // C ref: uhitm.c:5350-5352 — knockback message
    const adj = rn2(2) ? 'forceful' : 'powerful';
    const noun = rn2(2) ? 'blow' : 'strike';
    if (vis && display) {
        const agrName = monCombatName(magr, ctx?.agrVisible, { capitalize: true });
        const defName = monCombatName(mdef, ctx?.defVisible);
        display.putstr_message(
            `${agrName} knocks ${defName} back with a ${adj} ${noun}!`
        );
    }

    // C ref: uhitm.c:5383-5398 — stun chance
    if (!rn2(4)) {
        mdef.mstun = 1;
    }

    // C ref: actual mhurtle movement skipped (complex displacement)
    return true;
}


// ============================================================================
// mdamagem — apply damage and special effects
// ============================================================================

// cf. mhitm.c:1015 — mdamagem(magr, mdef, mattk, mwep, dieroll)
// ctx: optional { player, turnCount } for corpse creation and XP
function mdamagem(magr, mdef, mattk, mwep, dieroll, display, vis, map, ctx) {
    const mhm = {
        damage: c_d(mattk.dice || 0, mattk.sides || 0),
        hitflags: M_ATTK_MISS,
        permdmg: 0,
        specialdmg: 0,
        dieroll: dieroll,
        done: false,
    };

    // C ref: mhitm.c:1032-1057 — petrification check for touching cockatrice
    const pd = mdef.type || {};
    if (touch_petrifies(pd) && !resists_ston(magr)) {
        // Simplified: no glove/weapon check; just die
        // C ref: if attacker has no protective gear, turns to stone
        // For now, skip petrification (complex mechanic)
    }

    // Dispatch to AD_* handler
    mhitm_adtyping(magr, mattk, mdef, mhm);

    // C ref: mhitm.c:1061-1065 — mhitm_knockback
    mhitm_knockback_mm(magr, mdef, mattk, mwep, vis, display, ctx);

    if (mhm.done) return mhm.hitflags;
    if (!mhm.damage) return mhm.hitflags;

    // Apply damage
    mdef.mhp -= mhm.damage;
    if (mdef.mhp <= 0) {
        // C ref: mon.c:3384-3388 monkilled() — kill message gated on
        // cansee(mdef->mx, mdef->my), i.e. location in FOV, not monster
        // visibility.  An invisible monster dying at a visible location
        // still produces "It is killed!".
        if (cansee(map, ctx?.player, ctx?.fov, mdef.mx, mdef.my) && display) {
            const killVerb = nonliving(pd) ? 'destroyed' : 'killed';
            display.putstr_message(
                `${monCombatName(mdef, ctx?.defVisible, { article: 'the', capitalize: true })} is ${killVerb}!`
            );
        }
        mondead(mdef, map, ctx?.player);
        if (!DEADMONSTER(mdef)) {
            return mhm.hitflags; // lifesaved
        }

        // C ref: mon.c xkilled() → corpse_chance + mkcorpstat
        if (corpse_chance(mdef)
            && !(((pd.geno || 0) & G_NOCORPSE) !== 0)) {
            const corpse = mkcorpstat(CORPSE, mdef.mndx || 0, true,
                mdef.mx, mdef.my, map);
            corpse.age = ctx?.turnCount || 1;
        }

        if (mhm.hitflags === M_ATTK_AGR_DIED) {
            return (M_ATTK_DEF_DIED | M_ATTK_AGR_DIED);
        }

        // cf. mhitm.c:1115 — grow_up(magr, mdef)
        const victimLevel = mdef.m_lev ?? mdef.mlevel ?? (pd.level || 0);
        const agrLevel = magr.m_lev ?? magr.mlevel ?? ((magr.type || {}).level || 0);
        const hp_threshold = agrLevel > 0 ? agrLevel * 8 : 4;
        let max_increase = rnd(Math.max(1, victimLevel + 1));
        if ((magr.mhpmax || 0) + max_increase > hp_threshold + 1) {
            max_increase = Math.max(0, (hp_threshold + 1) - (magr.mhpmax || 0));
        }
        const cur_increase = (max_increase > 1) ? rn2(max_increase) : 0;
        magr.mhpmax = (magr.mhpmax || 0) + max_increase;
        magr.mhp = (magr.mhp || 0) + cur_increase;

        return (M_ATTK_DEF_DIED | (DEADMONSTER(magr) ? M_ATTK_AGR_DIED : 0));
    }
    return (mhm.hitflags === M_ATTK_AGR_DIED) ? M_ATTK_AGR_DIED : M_ATTK_HIT;
}


// ============================================================================
// mattackm — main monster-vs-monster attack sequence
// ============================================================================

// cf. mhitm.c:292 — mattackm(magr, mdef)
// Shared m-vs-m attack used by pet combat (dogmove.js) and conflict (fightm).
// ctx: optional { player, turnCount } for corpse creation.
export function mattackm(magr, mdef, display, vis, map, ctx) {
    if (!magr || !mdef) return M_ATTK_MISS;
    if (helpless(magr)) return M_ATTK_MISS;

    const pa = magr.type || {};
    const pd = mdef.type || {};
    const attacks = pa.attacks || [];


    // C ref: mhitm.c:316 — grid bugs can't attack diagonally
    // (Skipped for simplicity — rare edge case)

    // Calculate armor class differential
    let tmp = find_mac(mdef) + (magr.m_lev ?? magr.mlevel ?? (pa.level || 0));
    if (mdef.mconf || helpless(mdef)) {
        tmp += 4;
        if (mdef.msleeping) mdef.msleeping = 0;
    }

    // C ref: mhitm.c:354 — elf vs orc bonus
    // TODO: implement elf/orc racial bonus

    // C ref: mhitm.c:366 — set mlstmv
    if (ctx?.turnCount) magr.mlstmv = ctx.turnCount;

    const res = new Array(NATTK).fill(M_ATTK_MISS);
    let struck = 0;
    let dieroll = 0;

    for (let i = 0; i < Math.min(attacks.length, NATTK); i++) {
        res[i] = M_ATTK_MISS;
        const mattk = attacks[i];
        if (!mattk || mattk.type === AT_NONE) continue;

        // C ref: check if target still valid after previous attacks
        if (i > 0 && (DEADMONSTER(magr) || DEADMONSTER(mdef))) continue;

        let mwep = null;
        let attk = 1;
        let strike = 0;

        switch (mattk.type) {
        case AT_WEAP:
            // C ref: mhitm.c:393-416 — weapon attack
            if (distmin(magr.mx, magr.my, mdef.mx, mdef.my) > 1) {
                // Ranged attack — simplified: skip
                strike = 0;
                attk = 0;
                break;
            }
            // C ref: mhitm.c:406-416 — find wielded weapon
            // In C, mon_wield_item(magr) selects best weapon from inventory.
            // Simplified: find first weapon-class item in minvent.
            if (!magr.mw && Array.isArray(magr.minvent)) {
                for (const obj of magr.minvent) {
                    if (obj.oclass === WEAPON_CLASS) {
                        magr.mw = obj;
                        break;
                    }
                }
            }
            mwep = magr.mw || null;
            if (mwep) {
                mswingsm(magr, mdef, mwep, display, vis, ctx);
            }
            // Fall through to melee
            // FALLTHROUGH
        case AT_CLAW:
        case AT_KICK:
        case AT_BITE:
        case AT_STNG:
        case AT_TUCH:
        case AT_BUTT:
        case AT_TENT:
            if (mattk.type === AT_KICK && /* mtrapped_in_pit */ false) {
                continue;
            }
            if (distmin(magr.mx, magr.my, mdef.mx, mdef.my) > 1) {
                continue;
            }
            // C ref: cockatrice avoidance when has weapon
            // TODO: implement cockatrice touch avoidance

            dieroll = rnd(20 + i);
            strike = (tmp > dieroll) ? 1 : 0;
            if (strike) {
                // Check for grab failure on unsolid targets
                if (unsolid(pd) && failed_grab(magr, mdef, mattk)) {
                    strike = 0;
                    break;
                }
                res[i] = hitmm(magr, mdef, mattk, mwep, dieroll, display, vis, map, ctx);
            } else {
                missmm(magr, mdef, mattk, display, vis, map, ctx);
            }
            break;

        case AT_HUGS:
            // C ref: mhitm.c:476 — automatic if prev two succeed
            strike = (i >= 2 && res[i - 1] === M_ATTK_HIT
                      && res[i - 2] === M_ATTK_HIT) ? 1 : 0;
            if (strike) {
                if (failed_grab(magr, mdef, mattk)) {
                    strike = 0;
                } else {
                    res[i] = hitmm(magr, mdef, mattk, null, 0, display, vis, map, ctx);
                }
            }
            break;

        case AT_GAZE:
            strike = 0;
            res[i] = gazemm(magr, mdef, mattk, display, vis, map, ctx);
            break;

        case AT_EXPL:
            if (distmin(magr.mx, magr.my, mdef.mx, mdef.my) > 1) continue;
            res[i] = explmm(magr, mdef, mattk, display, vis, map, ctx);
            if (res[i] === M_ATTK_MISS) {
                strike = 0;
                attk = 0;
            } else {
                strike = 1;
            }
            break;

        case AT_ENGL:
            // C ref: mhitm.c:510-536 — engulf attack
            if (distmin(magr.mx, magr.my, mdef.mx, mdef.my) > 1) continue;
            // Simplified: treat as hit attempt
            strike = (tmp > rnd(20 + i)) ? 1 : 0;
            if (strike) {
                if (failed_grab(magr, mdef, mattk)) {
                    strike = 0;
                } else {
                    // Simplified: just do damage, no actual engulfing
                    res[i] = mdamagem(magr, mdef, mattk, null, 0, display, vis, map, ctx);
                }
            } else {
                missmm(magr, mdef, mattk, display, vis, map, ctx);
            }
            break;

        case AT_BREA:
        case AT_SPIT:
            // C ref: mhitm.c:538-564 — ranged attacks not at point blank
            // Simplified: skip ranged m-vs-m for now
            strike = 0;
            attk = 0;
            break;

        default:
            strike = 0;
            attk = 0;
            break;
        }

        // Passive counterattack
        if (attk && !(res[i] & M_ATTK_AGR_DIED)
            && distmin(magr.mx, magr.my, mdef.mx, mdef.my) <= 1) {
            res[i] = passivemm(magr, mdef, !!strike,
                               (res[i] & M_ATTK_DEF_DIED), mwep, map);
        }

        if (res[i] & M_ATTK_DEF_DIED) return res[i];
        if (res[i] & M_ATTK_AGR_DIED) return res[i];
        if ((res[i] & M_ATTK_AGR_DONE) || helpless(magr)) return res[i];
        if (res[i] & M_ATTK_HIT) struck = 1;
    }

    return struck ? M_ATTK_HIT : M_ATTK_MISS;
}


// ============================================================================
// fightm — monster fights other monsters (conflict)
// ============================================================================

// cf. mhitm.c:105 — fightm(mtmp)
// Returns 1 if an attack was made, 0 otherwise.
export function fightm(mtmp, map, display, vis) {
    if (!map || !mtmp) return 0;

    // C ref: resist_conflict check — not implemented, proceed
    // C ref: itsstuck check — not implemented

    for (const mon of map.monsters) {
        if (mon === mtmp || DEADMONSTER(mon)) continue;
        if (monnear(mtmp, mon.mx, mon.my)) {
            const result = mattackm(mtmp, mon, display, vis, map);
            if (result & M_ATTK_AGR_DIED) return 1;
            return (result & M_ATTK_HIT) ? 1 : 0;
        }
    }
    return 0;
}


// ============================================================================
// mdisplacem — attacker displaces defender
// ============================================================================

// cf. mhitm.c:178 — mdisplacem(magr, mdef, vis)
// TODO: mhitm.c:178 — mdisplacem(): full implementation


// ============================================================================
// mon_poly — polymorph attack on monster
// ============================================================================

// cf. mhitm.c:1121 — mon_poly(magr, mdef, dmg)
// TODO: mhitm.c:1121 — mon_poly(): full implementation


// ============================================================================
// mswingsm — weapon swing message
// ============================================================================

// cf. mhitm.c:1282 — mswingsm(magr, mdef, obj)
function mswingsm(magr, mdef, otemp, display, vis, ctx) {
    if (!vis || !display) return;
    const bash = false; // is_pole check omitted; adjacent polearm bash not yet needed
    const verb = monsterWeaponSwingVerb(otemp, bash);
    const oneOf = ((otemp.quan || 1) > 1) ? 'one of ' : '';
    const agrName = monCombatName(magr, ctx?.agrVisible, { capitalize: true });
    const defName = monCombatName(mdef, ctx?.defVisible);
    display.putstr_message(
        `${agrName} ${verb} ${oneOf}${monsterPossessive(magr)} ${xname(otemp)} at ${defName}.`
    );
}
