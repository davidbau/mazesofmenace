// explode.js — Explosion effects (partial) + scatter (thin).
// C ref: explode.c mon_explodes / explode / explosionmask / scatter;
//        zap.c destroy_items / resist / zap_over_floor
//        (D-0949 shopdamage → pay_for_damage; D-0968 AD_FIRE;
//         D-0971 AD_COLD/ELEC; D-0973 AD_MAGM/DISN/DRST/ACID;
//         D-0986 scatter MAY_HIT for tree kick;
//         D-1760 3x3 map_invisible !canspotmon + You_hear vs Boom!
//         + engulfer_explosion_msg).
//
// Branch envelope: AT_BOOM AD_PHYS / AD_MAGM..AD_SPC2 → MON_EXPLODE;
// WAND_CLASS / BURNING_OIL / SCROLL / TRAP_EXPLODE olet preamble;
// adtyp from type; explosionmask Antimagic/Fire/Cold/Disint/
// Shock/Poison/Acid + resists_* (DISN WAND nonliving/demon/
// vampshifter); 3x3 zap_over_floor + shop pay; PHYS + MAGM/FIRE/
// COLD/DISN/ELEC/DRST/ACID mon/hero damage (destroy_items,
// burnarmor FIRE, resist, cold×2↔fire, Half_phys PHYS/ACID,
// exercise A_STR, xkilled/monkilled); wake_nearto;
// scatter individual/pile + MAY_HIT flight (tree/kick);
// 3x3 map_invisible when cansee && !canspotmon; !visible
// You_hear("a blast.") / generic "explosion" / Boom!;
// engulfing_u → engulfer_explosion_msg; seemimic before caught-in.
// Named omissions: hallu rndmonnam; You_hear Underwater/Unaware
// prefixes; ugolemeffects/golemeffects; Invulnerable;
// grabbing/engulf double-damage; wake_nearto
// beyond msleeping; Role_switch damu only for known role pm;
// resists_magm worn/artifact ANTIMAGIC scan; TRAP_EXPLODE killer
// uhim/uhis; explode_show_visible already owns explosion_to_glyph;
// scatter MAY_FRACTURE/MAY_DESTROY/shop bill/flooreffects/VIS_EFFECTS/
// uball chain shatter/hideunder.

import { game } from './gstate.js';
import { d, rn2, rnd } from './rng.js';
import {
    pline, newsym, explode_show_visible, unmap_invisible, map_invisible,
    canspotmon,
} from './display.js';
import { cansee } from './vision.js';
import { m_at, setmangry, seemimic } from './mon.js';
import { Monnam } from './do_name.js';
import { Soundeffect, se_blast } from './sndprocs.js';
import { digests } from './mhitu.js';
import {
    maybe_half_phys, nomul, stop_occupation,
} from './hack.js';
import { exercise, A_STR } from './attrib.js';
import {
    isok, u_at, PHYS_EXPL_TYPE, MON_EXPLODE, EXPL_NOXIOUS, EXPL_FIERY,
    EXPL_FROSTY, EXPL_MAGICAL,
    STRAT_WAITMASK, KILLED_BY_AN, KILLED_BY, NO_KILLER_PREFIX,
    BURNING_OIL, TRAP_EXPLODE, XKILL_GIVEMSG, XKILL_NOCORPSE, BURNING, DIED,
    engulfing_u,
    N_DIRS, xdir, ydir, ZAP_POS, IS_DOOR, IS_SINK, STONE,
    LARGEST_INT, MAY_HITMON, MAY_HITYOU,
    D_ISOPEN, D_NODOOR, D_BROKEN,
} from './const.js';
import {
    pmnames, G_UNIQ, MR_FIRE, MR_COLD, MR_ELEC, MR_DISINT, MR_POISON,
    MR_ACID, nonliving, is_demon, is_vampshifter, bigmonst,
} from './monsters.js';
import {
    PM_CLERIC, PM_MONK, PM_WIZARD, PM_HEALER, PM_KNIGHT, monsterNames,
} from './generated/monsters_data.js';
import { WAND_CLASS, SCROLL_CLASS, objectNames, RAY } from './objects.js';
import {
    objects_at, obj_extract_self, splitobj, place_object, stackobj,
} from './mkobj.js';
import { ohitmon, thitu } from './mthrowu.js';
import { dmgval } from './weapon.js';

const PM_PAPER_GOLEM = monsterNames.indexOf('PM_PAPER_GOLEM');
const PM_STRAW_GOLEM = monsterNames.indexOf('PM_STRAW_GOLEM');
const PM_BABY_GRAY_DRAGON = monsterNames.indexOf('PM_BABY_GRAY_DRAGON');

const AD_PHYS = 0;
const AD_MAGM = 1;
const AD_FIRE = 2;
const AD_COLD = 3;
const AD_DISN = 5;
const AD_ELEC = 6;
const AD_DRST = 7;
const AD_ACID = 8;
/** C ref: monattk.h AD_SPC2 — upper bound for mon_explodes breath-style. */
const AD_SPC2 = 10;
const AD_RBRE = 242;

/** C ref: explode.c enum explode_action */
const EXPL_NONE = 0;
const EXPL_MON = 1;
const EXPL_HERO = 2;
const EXPL_SKIP = 4;

const WAN_MAGIC_MISSILE = objectNames.indexOf('WAN_MAGIC_MISSILE');
const WAN_DIGGING = objectNames.indexOf('WAN_DIGGING');
const WAN_SLEEP = objectNames.indexOf('WAN_SLEEP');
const POT_OIL = objectNames.indexOf('POT_OIL');
const SCR_FIRE = objectNames.indexOf('SCR_FIRE');

/** C ref: hacklib.c s_suffix */
function s_suffix(s) {
    const buf = String(s ?? '');
    const low = buf.toLowerCase();
    if (low === 'it') return `${buf}s`;
    if (low === 'you') return `${buf}r`;
    if (buf.endsWith('s') || buf.endsWith('S')) return `${buf}'`;
    return `${buf}'s`;
}

/** C ref: permonst pmname — neutral slot for ordinary monsters. */
function pmname_mon(mon) {
    const mndx = mon?.mnum ?? mon?.data?.mndx;
    if (mndx != null && pmnames[mndx]) {
        const pn = pmnames[mndx];
        return pn[2] || pn[0] || pn[1] || 'monster';
    }
    const raw = mon?.data?.name || 'monster';
    return String(raw).replace(/^PM_/, '').replace(/_/g, ' ').toLowerCase();
}

/** C ref: youprop.h Fire/Cold/Shock/Antimagic/Disint/Poison/Acid_resistance */
function Fire_resistance() {
    const u = game.u || {};
    return !!(u.Fire_resistance || u.HFire_resistance || u.EFire_resistance);
}
function Cold_resistance() {
    const u = game.u || {};
    return !!(u.Cold_resistance || u.HCold_resistance || u.ECold_resistance);
}
function Shock_resistance() {
    const u = game.u || {};
    return !!(u.Shock_resistance || u.HShock_resistance || u.EShock_resistance);
}
function Antimagic() {
    const u = game.u || {};
    return !!(u.Antimagic || u.HAntimagic || u.EAntimagic);
}
function Disint_resistance() {
    const u = game.u || {};
    return !!(u.Disint_resistance || u.HDisint_resistance
        || u.EDisint_resistance);
}
function Poison_resistance() {
    const u = game.u || {};
    return !!(u.Poison_resistance || u.HPoison_resistance
        || u.EPoison_resistance);
}
function Acid_resistance() {
    const u = game.u || {};
    return !!(u.Acid_resistance || u.HAcid_resistance || u.EAcid_resistance);
}

/** C ref: monst.h resists_fire / cold / elec / disint / poison / acid */
function mon_resists_bit(mon, mrBit) {
    if (!mon) return false;
    const bits = (mon.data?.mresists | 0)
        | (mon.mextrinsics | 0)
        | (mon.mintrinsics | 0);
    return !!(bits & mrBit);
}
function resists_fire(mon) { return mon_resists_bit(mon, MR_FIRE); }
function resists_cold(mon) { return mon_resists_bit(mon, MR_COLD); }
function resists_elec(mon) { return mon_resists_bit(mon, MR_ELEC); }
function resists_disint(mon) { return mon_resists_bit(mon, MR_DISINT); }
function resists_poison(mon) { return mon_resists_bit(mon, MR_POISON); }
function resists_acid(mon) { return mon_resists_bit(mon, MR_ACID); }

/** C ref: mondata.h dmgtype — any mattk slot has adtyp. */
function dmgtype(ptr, adtyp) {
    const slots = ptr?.mattk;
    if (!slots) return false;
    for (let i = 0; i < slots.length; i++) {
        if ((slots[i]?.adtyp | 0) === (adtyp | 0)) return true;
    }
    return false;
}

/**
 * C ref: mondata.c resists_magm — dmgtype AD_MAGM / baby gray / AD_RBRE.
 * Named omit: wielded/worn/carried ANTIMAGIC artifact scan.
 */
function resists_magm(mon) {
    if (!mon) return false;
    const ptr = mon.data;
    if (!ptr) return false;
    if (dmgtype(ptr, AD_MAGM)) return true;
    const mndx = ptr.mndx ?? ptr.mnum;
    if (mndx === PM_BABY_GRAY_DRAGON) return true;
    if (dmgtype(ptr, AD_RBRE)) return true;
    return false;
}

/** C ref: mondata.c completelyburns — paper/straw golem. */
function completelyburns(data) {
    const mndx = data?.mndx ?? data?.mnum;
    return mndx === PM_PAPER_GOLEM || mndx === PM_STRAW_GOLEM;
}

/**
 * C ref: zap.c resist — burn rn2; MON_EXPLODE oclass uses default alev=ulevel.
 * tell/shield and HP application deferred (caller applies damage; C passes 0).
 */
function resist(mtmp, oclass, damage, tell) {
    void damage;
    void tell;
    void oclass;
    const alev = game.u?.ulevel | 0;
    let dlev = mtmp.m_lev | 0;
    if (dlev > 50) dlev = 50;
    else if (dlev < 1) dlev = 1;
    const mr = mtmp.data?.mr | 0;
    return rn2(100 + alev - dlev) < mr;
}

/**
 * C ref: explode.c explosionmask — PHYS none; MAGM/FIRE/COLD/DISN/ELEC/
 * DRST/ACID hero + mon resist shields (D-0968/D-0971/D-0973).
 */
function explosionmask(m, adtyp, olet) {
    const isHero = !m || m === game.youmonst || m._youmonst;
    if (isHero) {
        switch (adtyp) {
        case AD_PHYS:
            return EXPL_NONE;
        case AD_MAGM:
            return Antimagic() ? EXPL_HERO : EXPL_NONE;
        case AD_FIRE:
            return Fire_resistance() ? EXPL_HERO : EXPL_NONE;
        case AD_COLD:
            return Cold_resistance() ? EXPL_HERO : EXPL_NONE;
        case AD_DISN: {
            if (olet === WAND_CLASS) {
                const data = (m === game.youmonst ? m.data : null)
                    || game.youmonst?.data;
                return (nonliving(data) || is_demon(data))
                    ? EXPL_HERO : EXPL_NONE;
            }
            return Disint_resistance() ? EXPL_HERO : EXPL_NONE;
        }
        case AD_ELEC:
            return Shock_resistance() ? EXPL_HERO : EXPL_NONE;
        case AD_DRST:
            return Poison_resistance() ? EXPL_HERO : EXPL_NONE;
        case AD_ACID:
            return Acid_resistance() ? EXPL_HERO : EXPL_NONE;
        default:
            return EXPL_NONE;
        }
    }
    switch (adtyp) {
    case AD_PHYS:
        return EXPL_NONE;
    case AD_MAGM:
        return resists_magm(m) ? EXPL_MON : EXPL_NONE;
    case AD_FIRE:
        return resists_fire(m) ? EXPL_MON : EXPL_NONE;
    case AD_COLD:
        return resists_cold(m) ? EXPL_MON : EXPL_NONE;
    case AD_DISN: {
        if (olet === WAND_CLASS) {
            return (nonliving(m.data) || is_demon(m.data)
                || is_vampshifter(m))
                ? EXPL_MON : EXPL_NONE;
        }
        return resists_disint(m) ? EXPL_MON : EXPL_NONE;
    }
    case AD_ELEC:
        return resists_elec(m) ? EXPL_MON : EXPL_NONE;
    case AD_DRST:
        return resists_poison(m) ? EXPL_MON : EXPL_NONE;
    case AD_ACID:
        return resists_acid(m) ? EXPL_MON : EXPL_NONE;
    default:
        return EXPL_NONE;
    }
}

/** C ref: explode.c adtyp_to_expltype — explum / mon_explodes callee. */
export function adtyp_to_expltype(adtyp) {
    if (adtyp === AD_FIRE) return EXPL_FIERY;
    if (adtyp === AD_COLD) return EXPL_FROSTY;
    if (adtyp === AD_ELEC) return EXPL_MAGICAL;
    // C: AD_DRST (+ DRDX/DRCO/DISE/PEST) and AD_PHYS → NOXIOUS
    if (adtyp === AD_DRST || adtyp === AD_PHYS) return EXPL_NOXIOUS;
    // C default (MAGM/DISN/ACID/…) → EXPL_FIERY after impossible()
    return EXPL_FIERY;
}

/** C ref: mon.c wake_nearto — clear sleep in radius (no RNG). */
function wake_nearto(x, y, distance) {
    for (const mtmp of game.fmon || []) {
        if (!mtmp || mtmp.mx == null) continue;
        const dx = (mtmp.mx | 0) - (x | 0);
        const dy = (mtmp.my | 0) - (y | 0);
        if (distance === 0 || dx * dx + dy * dy < distance) {
            mtmp.msleeping = 0;
            const geno = mtmp.data?.geno | 0;
            if (!(geno & G_UNIQ) && mtmp.mstrategy != null) {
                mtmp.mstrategy &= ~STRAT_WAITMASK;
            }
        }
    }
}

function Role_if(pm) {
    return game.urole?.mnum === pm;
}

/**
 * C ref: explode.c engulfer_explosion_msg `:117–179` — swallowed
 * digest vs enfold adjectives. Caller: explode when engulfing_u.
 */
async function engulfer_explosion_msg(adtyp, olet) {
    const ustuck = game.u?.ustuck;
    if (!ustuck) return;
    let adj;
    if (digests(ustuck.data)) {
        switch (adtyp) {
        case AD_FIRE: adj = 'heartburn'; break;
        case AD_COLD: adj = 'chilly'; break;
        case AD_DISN:
            adj = olet === WAND_CLASS
                ? 'irradiated by pure energy' : 'perforated';
            break;
        case AD_ELEC: adj = 'shocked'; break;
        case AD_DRST: adj = 'poisoned'; break;
        case AD_ACID: adj = 'an upset stomach'; break;
        default: adj = 'fried'; break;
        }
        await pline(`${Monnam(ustuck)} gets ${adj}!`);
    } else {
        switch (adtyp) {
        case AD_FIRE: adj = 'toasted'; break;
        case AD_COLD: adj = 'chilly'; break;
        case AD_DISN:
            adj = olet === WAND_CLASS
                ? 'overwhelmed by pure energy' : 'perforated';
            break;
        case AD_ELEC: adj = 'shocked'; break;
        case AD_DRST: adj = 'intoxicated'; break;
        case AD_ACID: adj = 'burned'; break;
        default: adj = 'fried'; break;
        }
        await pline(`${Monnam(ustuck)} gets slightly ${adj}!`);
    }
}

/**
 * C ref: explode.c explode — PHYS + AD_FIRE (D-0968) + AD_COLD/ELEC
 * (D-0971) + AD_MAGM/DISN/DRST/ACID (D-0973) mon/hero combat +
 * WAND/SCROLL/OIL/TRAP olet → zap_over_floor + pay_for_damage
 * (D-0949). Visible blast via explosion_to_glyph / cmap shield
 * (display.js explode_show_visible; D-1738). D-1760: 3x3
 * map_invisible !canspotmon, You_hear vs Boom!, engulfer msg.
 */
export async function explode(x, y, typeIn, dam, olet, expltype) {
    let type = typeIn | 0;
    let damu = dam | 0;
    let uhurt = 0; // 0=unhurt, 1=items only, 2=you+items
    let str = '';
    let exploding_wand_typ = 0;
    let generic = false;
    let didmsg = false;
    const you_exploding = olet === MON_EXPLODE && type >= 0;
    const shopdamage = { v: false };

    // C: olet preamble before adtyp
    if (olet === WAND_CLASS) {
        if (type < 0) {
            type = -type;
            exploding_wand_typ = type | 0;
            const oc = game.objects?.[type];
            if ((oc?.oc_dir | 0) === RAY
                && type !== WAN_DIGGING && type !== WAN_SLEEP) {
                type -= WAN_MAGIC_MISSILE;
                if (type < 0 || type > 9) type = 0;
            } else {
                type = 0;
            }
        }
        if (Role_if(PM_CLERIC) || Role_if(PM_MONK) || Role_if(PM_WIZARD)) {
            damu = Math.trunc(damu / 5);
        } else if (Role_if(PM_HEALER) || Role_if(PM_KNIGHT)) {
            damu = Math.trunc(damu / 2);
        }
    } else if (olet === BURNING_OIL) {
        exploding_wand_typ = POT_OIL;
    } else if (olet === SCROLL_CLASS) {
        exploding_wand_typ = SCR_FIRE;
    } else if (olet === TRAP_EXPLODE) {
        type = 0;
    }

    let adtyp = AD_PHYS;
    if (type === PHYS_EXPL_TYPE) {
        adtyp = AD_PHYS;
    } else {
        switch (Math.abs(type) % 10) {
        case 0: adtyp = AD_MAGM; str = 'magical blast'; break;
        case 1:
            adtyp = AD_FIRE;
            str = olet === BURNING_OIL ? 'burning oil'
                : olet === SCROLL_CLASS ? 'tower of flame'
                    : 'fireball';
            break;
        case 2: adtyp = AD_COLD; str = 'ball of cold'; break;
        case 4:
            adtyp = AD_DISN;
            str = olet === WAND_CLASS ? 'death field' : 'disintegration field';
            break;
        case 5: adtyp = AD_ELEC; str = 'ball of lightning'; break;
        case 6: adtyp = AD_DRST; str = 'poison gas cloud'; break;
        case 7: adtyp = AD_ACID; str = 'splash of acid'; break;
        default:
            adtyp = AD_MAGM;
            str = 'magical blast';
            break;
        }
    }

    if (olet === MON_EXPLODE && !you_exploding) {
        str = game.killer?.name || 'explosion';
    }

    const you = game.youmonst || { _youmonst: true };
    const explmask = [];
    let visible = false;
    for (let i = 0; i < 3; i++) {
        explmask[i] = [];
        for (let j = 0; j < 3; j++) {
            const xx = x + i - 1;
            const yy = y + j - 1;
            if (!isok(xx, yy)) {
                explmask[i][j] = EXPL_SKIP;
                continue;
            }
            explmask[i][j] = EXPL_NONE;
            if (u_at(xx, yy)) {
                explmask[i][j] = explosionmask(you, adtyp, olet);
            }
            let mtmp = m_at(xx, yy);
            if (!mtmp && u_at(xx, yy)) mtmp = game.u?.usteed;
            if (mtmp && (mtmp.mhp | 0) < 1) mtmp = null;
            if (mtmp) {
                explmask[i][j] |= explosionmask(mtmp, adtyp, olet);
            }
            // C explode.c :378–381 — I-glyph when in view but not spottable
            if (mtmp && cansee(xx, yy) && !canspotmon(mtmp)) {
                map_invisible(xx, yy);
            } else if (!mtmp) {
                unmap_invisible(xx, yy);
            }
            if (cansee(xx, yy)) visible = true;
        }
    }

    // C youprop.h:125 Deaf — inline (do not add hero_Deaf clone #4)
    const uDeaf = game.u || {};
    const expl_deaf = !!((uDeaf.HDeaf | 0) || (uDeaf.EDeaf | 0)
        || uDeaf.uroleplay?.deaf || uDeaf.Deaf);
    if (visible) {
        await explode_show_visible(x, y, expltype, explmask);
    } else {
        // C :439–448 — unseen MON/TRAP blast is generic "explosion"
        if (olet === MON_EXPLODE || olet === TRAP_EXPLODE) {
            str = 'explosion';
            generic = true;
        }
        if (!expl_deaf && olet !== SCROLL_CLASS) {
            Soundeffect(se_blast, 75);
            // C You_hear: skip when !flags.acoustics; Unaware/Underwater named
            if (game.flags?.acoustics !== false) {
                await pline('You hear a blast.');
            }
            didmsg = true;
        }
    }
    if (!expl_deaf && !didmsg) {
        await pline('Boom!');
    }

    const inside_engulfer = !!(game.u?.uswallow && type >= 0);
    const { zap_over_floor, destroy_items } = await import('./zap.js');
    // C applies combat for all known adtyps in explosionmask
    const combat_ok = adtyp === AD_PHYS
        || (adtyp >= AD_MAGM && adtyp <= AD_ACID);

    if (dam) {
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                if (explmask[i][j] === EXPL_SKIP) continue;
                const xx = x + i - 1;
                const yy = y + j - 1;
                if (u_at(xx, yy)) {
                    uhurt = ((explmask[i][j] & EXPL_HERO) !== 0) ? 1 : 2;
                    if (!game.context?.mon_moving && you_exploding) uhurt = 0;
                } else if (inside_engulfer) {
                    continue;
                }

                // C: zap_over_floor unless swallowed hero-caused blast
                if (!(game.u?.uswallow && !game.context?.mon_moving)) {
                    await zap_over_floor(
                        xx, yy, type, shopdamage, false, exploding_wand_typ,
                    );
                }

                if (!combat_ok) continue;

                let mtmp = m_at(xx, yy);
                if (!mtmp && u_at(xx, yy)) mtmp = game.u?.usteed;
                if (!mtmp) continue;
                if ((mtmp.mhp | 0) < 1) continue;

                // C explode.c :503–509
                if (engulfing_u(mtmp)) {
                    await engulfer_explosion_msg(adtyp, olet);
                } else if (cansee(xx, yy)) {
                    if (mtmp.m_ap_type) seemimic(mtmp);
                    await pline(`${Monnam(mtmp)} is caught in the ${str}!`);
                }

                const itemdmg = await destroy_items(mtmp, adtyp, dam);
                if (adtyp === AD_FIRE) {
                    const { burnarmor, ignite_items } = await import('./trap.js');
                    await burnarmor(mtmp);
                    await ignite_items(mtmp.minvent);
                }

                if ((explmask[i][j] & EXPL_MON) !== 0) {
                    // golemeffects deferred — shield: item destruction only
                    mtmp.mhp = (mtmp.mhp | 0) - itemdmg;
                } else {
                    let mdam = dam;
                    if (resist(mtmp, olet, 0, false)) {
                        if (cansee(xx, yy) || inside_engulfer) {
                            await pline(
                                `${Monnam(mtmp)} resists the ${str}!`,
                            );
                        }
                        mdam = Math.trunc((dam + 1) / 2);
                    }
                    // grabbed double-damage deferred
                    if (resists_cold(mtmp) && adtyp === AD_FIRE) mdam *= 2;
                    else if (resists_fire(mtmp) && adtyp === AD_COLD) {
                        mdam *= 2;
                    }
                    mtmp.mhp = (mtmp.mhp | 0) - (mdam + itemdmg);
                }

                if ((mtmp.mhp | 0) < 1) {
                    mtmp.mhp = 0;
                    const xkflg = (adtyp === AD_FIRE
                        && completelyburns(mtmp.data))
                        ? XKILL_NOCORPSE
                        : 0;
                    if (!game.context?.mon_moving) {
                        const { xkilled } = await import('./uhitm.js');
                        await xkilled(mtmp, XKILL_GIVEMSG | xkflg);
                    } else {
                        const { monkilled } = await import('./mhitm.js');
                        let how = adtyp;
                        if (xkflg) how = 242; // AD_RBRE — no corpse
                        await monkilled(mtmp, '', how);
                    }
                } else if (!game.context?.mon_moving) {
                    setmangry(mtmp, true);
                }
            }
        }
    }

    if (uhurt && combat_ok) {
        // C: verbose && (type < 0 || olet != SCROLL_CLASS)
        if (game.flags?.verbose !== false
            && (type < 0 || olet !== SCROLL_CLASS)) {
            await pline(`You are caught in the ${str}!`);
        }
        // Invulnerable deferred
        if (adtyp === AD_FIRE) {
            const { burn_away_slime } = await import('./timeout.js');
            await burn_away_slime();
        }
        if (adtyp === AD_PHYS || adtyp === AD_ACID) {
            damu = maybe_half_phys(damu);
        }
        if (adtyp === AD_FIRE) {
            const { burnarmor, ignite_items } = await import('./trap.js');
            await burnarmor(you);
            await ignite_items(game.invent);
        }
        await destroy_items(you, adtyp, dam);
        // ugolemeffects deferred

        const u = game.u;
        if (uhurt === 2 && u) {
            if (u.Upolyd) u.mh = (u.mh | 0) - damu;
            else u.uhp = (u.uhp | 0) - damu;
            if (game.flags) game.flags.botl = true;
            if (game.disp) game.disp.botl = true;
        }

        if (u && ((u.uhp | 0) <= 0 || (u.Upolyd && (u.mh | 0) <= 0))) {
            // Upolyd rehumanize deferred — fatal path as non-poly
            if (!game.killer) game.killer = { name: '', format: 0 };
            if (olet === MON_EXPLODE) {
                // C :646–650 — unseen blast keeps killer.name (generic)
                if (!generic && str && str !== game.killer.name) {
                    game.killer.name = str;
                }
                game.killer.format = KILLED_BY_AN;
            } else if (type >= 0 && olet !== SCROLL_CLASS) {
                game.killer.format = NO_KILLER_PREFIX;
                game.killer.name =
                    `caught himself in his own ${str}`;
            } else {
                const towerOrBall = str === 'tower of flame'
                    || str === 'fireball';
                game.killer.format = towerOrBall ? KILLED_BY_AN : KILLED_BY;
                game.killer.name = str;
            }
            await pline(`The ${str} is fatal.`);
            const { done } = await import('./end.js');
            await done(adtyp === AD_FIRE ? BURNING : DIED);
        }
        exercise(A_STR, false);
    }

    if (shopdamage.v) {
        const { pay_for_damage } = await import('./shk.js');
        const dmgstr = adtyp === AD_FIRE ? 'burn away'
            : adtyp === AD_COLD ? 'shatter'
                : adtyp === AD_DISN ? 'disintegrate'
                    : 'destroy';
        await pay_for_damage(dmgstr, false);
    }

    let i = dam * dam;
    if (i < 50) i = 50;
    if (inside_engulfer) i = Math.trunc((i + 3) / 4);
    wake_nearto(x, y, i);
}

/**
 * C ref: explode.c mon_explodes — roll boom damage, kill if live, explode.
 * Branch envelope: AD_PHYS + AD_MAGM..AD_SPC2 (D-0968/D-0971/D-0973).
 */
export async function mon_explodes(mon, mattk) {
    let dmg;
    if (mattk.damn) {
        dmg = d(mattk.damn | 0, mattk.damd | 0);
    } else if (mattk.damd) {
        dmg = d(((mon.data?.mlevel | 0) + 1), mattk.damd | 0);
    } else {
        dmg = 0;
    }

    let type;
    const ad = mattk.adtyp | 0;
    if (ad === AD_PHYS) {
        type = PHYS_EXPL_TYPE;
    } else if (ad >= AD_MAGM && ad <= AD_SPC2) {
        // C: type = -((adtyp - 1) + 20) for AD_MAGM..AD_SPC2
        type = -((ad - 1) + 20);
    } else {
        // Unknown AT_BOOM adtyp — C impossible()
        return;
    }

    if ((mon.mhp | 0) >= 1) {
        mon.mhp = 0;
    }

    if (!game.killer) game.killer = {};
    game.killer.name = `${s_suffix(pmname_mon(mon))} explosion`;
    game.killer.format = KILLED_BY_AN;

    await explode(
        mon.mx | 0,
        mon.my | 0,
        type,
        dmg,
        MON_EXPLODE,
        adtyp_to_expltype(ad),
    );

    game.killer.name = '';
}

/** C closed_door — mask not open/broken/nodoor. */
function closed_door(x, y) {
    const loc = game.level?.at(x, y);
    if (!loc || !IS_DOOR(loc.typ)) return false;
    const mask = loc.doormask | 0;
    return mask !== D_NODOOR && mask !== D_ISOPEN && mask !== D_BROKEN;
}

/**
 * C ref: explode.c scatter — fling objects from (sx,sy) by blastforce.
 * Branch envelope (D-0986): individual_object or pile peel via splitobj;
 * random 8-dir flight; stop on !isok / !ZAP_POS / closed_door / sink;
 * MAY_HITMON → ohitmon; MAY_HITYOU → thitu; place_object+stackobj.
 * Live caller: trap.js launch_obj ROLL LANDMINE (D-1256) with C flags.
 * Named omit: MAY_FRACTURE/MAY_DESTROY; shop credit/stolen; flooreffects
 * (always place); VIS_EFFECTS; uball/uchain shatter; hideunder.
 * @returns {number} total quantity that left the origin square
 */
export async function scatter(sx, sy, blastforce, scflags, obj = null) {
    const flags = scflags | 0;
    let individual = !!obj;
    const schain = [];
    let farthest = 0;
    let total = 0;

    while (true) {
        let otmp = individual ? obj : objects_at(sx, sy);
        if (!otmp) break;

        // uball/uchain shatter deferred
        if ((otmp.quan | 0) > 1) {
            let qtmp = (otmp.quan | 0) - 1;
            if (qtmp > LARGEST_INT) qtmp = LARGEST_INT;
            qtmp = rnd(qtmp | 0);
            otmp = splitobj(otmp, qtmp);
        } else if (individual) {
            obj = null;
        }
        obj_extract_self(otmp);
        // MAY_FRACTURE / MAY_DESTROY deferred

        const dir = rn2(N_DIRS);
        let range = (blastforce | 0) - Math.trunc((otmp.owt | 0) / 40);
        if (range < 1) range = 1;
        range = rnd(range);
        if (range > farthest) farthest = range;
        schain.push({
            obj: otmp,
            ox: sx | 0,
            oy: sy | 0,
            dx: xdir[dir],
            dy: ydir[dir],
            range,
            stopped: false,
        });
        if (individual && !obj) break;
    }

    while (farthest-- > 0) {
        for (const stmp of schain) {
            if (!((stmp.range-- > 0) && !stmp.stopped)) continue;
            game.thrownobj = stmp.obj;
            let bx = stmp.ox + stmp.dx;
            let by = stmp.oy + stmp.dy;
            if (!game.bhitpos) game.bhitpos = { x: 0, y: 0 };
            game.bhitpos.x = bx;
            game.bhitpos.y = by;
            let typ = STONE;
            if (isok(bx, by)) typ = game.level?.at(bx, by)?.typ ?? STONE;
            if (!isok(bx, by)) {
                bx -= stmp.dx;
                by -= stmp.dy;
                stmp.stopped = true;
            } else if (!ZAP_POS(typ) || closed_door(bx, by)) {
                bx -= stmp.dx;
                by -= stmp.dy;
                stmp.stopped = true;
            } else {
                const mtmp = m_at(bx, by);
                if (mtmp) {
                    if (flags & MAY_HITMON) {
                        stmp.range--;
                        if (await ohitmon(mtmp, stmp.obj, 1, false)) {
                            stmp.obj = null;
                            stmp.stopped = true;
                        }
                    }
                } else if (u_at(bx, by)) {
                    if (flags & MAY_HITYOU) {
                        if (game.multi) nomul(0);
                        const dam = dmgval(stmp.obj, game.youmonst);
                        let hitvalu = 8 + (stmp.obj?.spe | 0);
                        if (bigmonst(game.youmonst?.data)) hitvalu++;
                        const objp = { obj: stmp.obj };
                        const hitu = await thitu(
                            hitvalu,
                            maybe_half_phys(dam),
                            objp,
                            null,
                        );
                        stmp.obj = objp.obj;
                        if (!stmp.obj) stmp.stopped = true;
                        if (hitu) {
                            stmp.range -= 3;
                            await stop_occupation();
                        }
                    }
                }
            }
            stmp.ox = bx;
            stmp.oy = by;
            if (IS_SINK(game.level?.at(stmp.ox, stmp.oy)?.typ)) {
                stmp.stopped = true;
            }
            game.thrownobj = null;
        }
    }

    for (const stmp of schain) {
        const x = stmp.ox | 0;
        const y = stmp.oy | 0;
        if (stmp.obj) {
            if (x !== (sx | 0) || y !== (sy | 0)) {
                total += stmp.obj.quan | 0;
            }
            // flooreffects deferred — always place
            place_object(stmp.obj, x, y);
            stackobj(stmp.obj);
        }
        newsym(x, y);
    }
    newsym(sx, sy);
    return total;
}
