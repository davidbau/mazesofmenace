// worn.js — Monster armor don/doff helpers.
// C ref: worn.c — which_armor, wearmask_to_obj, wearslot, mon_set_minvis,
//   m_dowear, m_dowear_type, update_mon_extrinsics, extra_pref,
//   racial_exception; mon.c check_gear_next_turn.
// Named omissions: wear plines when !creation (freeze still applied);
//   artifact_light begin_burn/end_burn; full w_blocks Clairvoyance/Eyes;
//   dragon-scale altprop beyond alchemy smock;
//   extract_from_minvent artifact_light/obj_no_longer_held;
//   youmonst which_armor slot table (hero uses uarm*).
// D-0855: nambuf Monnam/mon_nam at m_dowear_type entry (Hallu display RNG).

import { game } from './gstate.js';
import {
    W_ARM, W_ARMC, W_ARMH, W_ARMS, W_ARMG, W_ARMF, W_ARMU, W_AMUL, W_WEP,
    W_RINGL, W_RINGR, W_SWAPWEP, W_QUIVER, W_TOOL, W_BALL, W_CHAIN, W_SADDLE,
    I_SPECIAL, AC_MAX, OBJ_MINVENT, NEED_WEAPON, P_NONE,
    INVIS, FAST, ANTIMAGIC, REFLECTING, PROTECTION, CLAIRVOYANT, STEALTH,
    TELEPAT, LEVITATION, FLYING, WWALKING, DISPLACED, FUMBLING, JUMPING,
    FIRE_RES, COLD_RES, SLEEP_RES, DISINT_RES, SHOCK_RES, POISON_RES,
    ACID_RES, STONE_RES, MFAST,
} from './const.js';
import {
    verysmall, nohands, is_animal, mindless, humanoid, noncorporeal,
    bigmonst, is_whirly, M1_SLITHY, MZ_SMALL, MZ_HUGE,
    monsterNames,
} from './monsters.js';
import {
    ARMOR_CLASS, AMULET_CLASS, WEAPON_CLASS, TOOL_CLASS,
    RING_CLASS, FOOD_CLASS, GEM_CLASS, BALL_CLASS, CHAIN_CLASS,
    objectNames,
} from './objects.js';
import { curse, obj_extract_self, oc_merge_of } from './mkobj.js';
import { canseemon, newsym } from './display.js';
import { see_wsegs } from './worm.js';
import { dist2 } from './hacklib.js';
import { Monnam, mon_nam } from './do_name.js';

const ARM_SUIT = 0;
const ARM_SHIELD = 1;
const ARM_HELM = 2;
const ARM_GLOVES = 3;
const ARM_BOOTS = 4;
const ARM_CLOAK = 5;
const ARM_SHIRT = 6;

const BLINDFOLD = objectNames.indexOf('BLINDFOLD');
const TOWEL = objectNames.indexOf('TOWEL');
const LENSES = objectNames.indexOf('LENSES');
const TIN_OPENER = objectNames.indexOf('TIN_OPENER');
const SADDLE = objectNames.indexOf('SADDLE');
const MEAT_RING = objectNames.indexOf('MEAT_RING');

const LEATHER = 7;
const RUBBER_HOSE = objectNames.indexOf('RUBBER_HOSE');

const AMULET_OF_LIFE_SAVING = objectNames.indexOf('AMULET_OF_LIFE_SAVING');
const AMULET_OF_REFLECTION = objectNames.indexOf('AMULET_OF_REFLECTION');
const AMULET_OF_GUARDING = objectNames.indexOf('AMULET_OF_GUARDING');
const MUMMY_WRAPPING = objectNames.indexOf('MUMMY_WRAPPING');
const HELM_OF_OPPOSITE_ALIGNMENT = objectNames.indexOf('HELM_OF_OPPOSITE_ALIGNMENT');
const DUNCE_CAP = objectNames.indexOf('DUNCE_CAP');
const SPEED_BOOTS = objectNames.indexOf('SPEED_BOOTS');
const ALCHEMY_SMOCK = objectNames.indexOf('ALCHEMY_SMOCK');
const ELVEN_LEATHER_HELM = objectNames.indexOf('ELVEN_LEATHER_HELM');
const ELVEN_MITHRIL_COAT = objectNames.indexOf('ELVEN_MITHRIL_COAT');
const ELVEN_CLOAK = objectNames.indexOf('ELVEN_CLOAK');
const ELVEN_SHIELD = objectNames.indexOf('ELVEN_SHIELD');
const ELVEN_BOOTS = objectNames.indexOf('ELVEN_BOOTS');

const PM_HOBBIT = monsterNames.indexOf('PM_HOBBIT');
const PM_SKELETON = monsterNames.indexOf('PM_SKELETON');
const PM_MARILITH = monsterNames.indexOf('PM_MARILITH');
const PM_WINGED_GARGOYLE = monsterNames.indexOf('PM_WINGED_GARGOYLE');
const PM_HORNED_DEVIL = monsterNames.indexOf('PM_HORNED_DEVIL');
const PM_MINOTAUR = monsterNames.indexOf('PM_MINOTAUR');
const PM_ASMODEUS = monsterNames.indexOf('PM_ASMODEUS');
const PM_BALROG = monsterNames.indexOf('PM_BALROG');
const PM_WHITE_UNICORN = monsterNames.indexOf('PM_WHITE_UNICORN');
const PM_GRAY_UNICORN = monsterNames.indexOf('PM_GRAY_UNICORN');
const PM_BLACK_UNICORN = monsterNames.indexOf('PM_BLACK_UNICORN');
const PM_KI_RIN = monsterNames.indexOf('PM_KI_RIN');

const MZ_HUMAN = 2; // monflag.h — MZ_HUMAN ≡ MZ_MEDIUM

function armcat(obj) {
    return game.objects?.[obj?.otyp]?.oc_skill ?? -1;
}

function is_shirt(obj) {
    return obj?.oclass === ARMOR_CLASS && armcat(obj) === ARM_SHIRT;
}
function is_suit(obj) {
    return obj?.oclass === ARMOR_CLASS && armcat(obj) === ARM_SUIT;
}
function is_cloak(obj) {
    return obj?.oclass === ARMOR_CLASS && armcat(obj) === ARM_CLOAK;
}
function is_shield(obj) {
    return obj?.oclass === ARMOR_CLASS && armcat(obj) === ARM_SHIELD;
}
function is_helmet(obj) {
    return obj?.oclass === ARMOR_CLASS && armcat(obj) === ARM_HELM;
}
function is_gloves(obj) {
    return obj?.oclass === ARMOR_CLASS && armcat(obj) === ARM_GLOVES;
}
function is_boots(obj) {
    return obj?.oclass === ARMOR_CLASS && armcat(obj) === ARM_BOOTS;
}

/** C ref: obj.h is_flimsy */
function is_flimsy(otmp) {
    const mat = game.objects?.[otmp?.otyp]?.oc_material ?? 99;
    return mat <= LEATHER || (otmp?.otyp | 0) === RUBBER_HOSE;
}

/** C ref: obj.h is_elven_armor */
function is_elven_armor(otmp) {
    const t = otmp?.otyp | 0;
    return t === ELVEN_LEATHER_HELM || t === ELVEN_MITHRIL_COAT
        || t === ELVEN_CLOAK || t === ELVEN_SHIELD || t === ELVEN_BOOTS;
}

/** C ref: mondata.h slithy */
function slithy(ptr) {
    return !!((ptr?.mflags1 ?? 0) & M1_SLITHY);
}

/** C ref: mondata.c sliparm / breakarm / cantweararm */
function sliparm(ptr) {
    return !!(is_whirly(ptr) || (ptr?.msize ?? 99) <= MZ_SMALL || noncorporeal(ptr));
}
function breakarm(ptr) {
    if (sliparm(ptr)) return false;
    const mndx = ptr?.mndx ?? -1;
    return !!(bigmonst(ptr)
        || ((ptr?.msize ?? 0) > MZ_SMALL && !humanoid(ptr))
        || mndx === PM_MARILITH
        || mndx === PM_WINGED_GARGOYLE);
}
function cantweararm(ptr) {
    return breakarm(ptr) || sliparm(ptr);
}

/** C ref: obj.h WrappingAllowed */
function WrappingAllowed(mptr) {
    const mndx = mptr?.mndx ?? -1;
    return !!(humanoid(mptr)
        && (mptr.msize ?? 0) >= MZ_SMALL && (mptr.msize ?? 0) <= MZ_HUGE
        && !noncorporeal(mptr)
        && mptr.mlet !== 'S_CENTAUR'
        && mndx !== PM_WINGED_GARGOYLE && mndx !== PM_MARILITH);
}

/** C ref: mondata.c num_horns / mondata.h has_horns */
function num_horns(ptr) {
    const mndx = ptr?.mndx ?? -1;
    if (mndx === PM_HORNED_DEVIL || mndx === PM_MINOTAUR
        || mndx === PM_ASMODEUS || mndx === PM_BALROG) return 2;
    if (mndx === PM_WHITE_UNICORN || mndx === PM_GRAY_UNICORN
        || mndx === PM_BLACK_UNICORN || mndx === PM_KI_RIN) return 1;
    return 0;
}
function has_horns(ptr) {
    return num_horns(ptr) > 0;
}

/** C ref: hack.h ARM_BONUS */
function ARM_BONUS(obj) {
    const a_ac = game.objects?.[obj.otyp]?.a_ac | 0;
    const spe = obj.spe | 0;
    const a = obj.oeroded | 0;
    const b = obj.oeroded2 | 0;
    const erode = Math.min(a > b ? a : b, a_ac);
    return a_ac + spe - erode;
}

/**
 * C ref: worn.c find_mac — start at mon->data->ac, walk minvent where
 * owornmask & misc_worn_check, subtract ARM_BONUS (or a flat 2 for
 * AMULET_OF_GUARDING), then cap abs() at AC_MAX like find_ac.
 */
export function find_mac(mon) {
    let base = (mon?.data?.ac ?? 10) | 0;
    const mwflags = mon?.misc_worn_check | 0;
    for (let obj = mon?.minvent; obj; obj = obj.nobj) {
        if ((obj.owornmask | 0) & mwflags) {
            if ((obj.otyp | 0) === AMULET_OF_GUARDING) {
                base -= 2; /* fixed amount, not impacted by erosion */
            } else {
                base -= ARM_BONUS(obj);
            }
        }
    }
    if (Math.abs(base) > AC_MAX) {
        const s = base < 0 ? -1 : base !== 0 ? 1 : 0;
        base = s * AC_MAX;
    }
    return base | 0;
}

/** C ref: prop.h res_to_mr */
function res_to_mr(r) {
    if (r >= FIRE_RES && r <= STONE_RES) return 1 << (r - 1);
    return 0;
}

/** C ref: worn.c altprop */
function altprop(o) {
    if ((o?.otyp | 0) === ALCHEMY_SMOCK) {
        const oprop = game.objects?.[o.otyp]?.oc_oprop | 0;
        return POISON_RES + ACID_RES - oprop;
    }
    return 0;
}

/** C ref: worn.c w_blocks — mummy wrapping blocks INVIS */
function w_blocks(o, m) {
    if ((o?.otyp | 0) === MUMMY_WRAPPING && (m & W_ARMC) !== 0) return INVIS;
    return 0;
}

/** C ref: obj.h bimanual — WEAPON/TOOL with oc_big (oc_bimanual). */
function bimanual(obj) {
    if (!obj) return false;
    if (obj.oclass !== WEAPON_CLASS && obj.oclass !== TOOL_CLASS) return false;
    return !!(game.objects?.[obj.otyp]?.oc_big);
}

/** C ref: obj.h is_weptool — TOOL with oc_skill != P_NONE. */
function is_weptool(obj) {
    if (!obj || obj.oclass !== TOOL_CLASS) return false;
    const sk = game.objects?.[obj.otyp]?.oc_skill;
    return sk != null && sk !== P_NONE;
}

/**
 * C ref: worn.c wearmask_to_obj — first worn[] slot whose mask bit is
 * set. Caller zap.c poly_obj after set_wear (D-1510; amulet of change
 * may have destroyed otmp).
 */
export function wearmask_to_obj(wornmask) {
    const u = game.u || {};
    const slots = [
        [W_ARM, u.uarm],
        [W_ARMC, u.uarmc],
        [W_ARMH, u.uarmh],
        [W_ARMS, u.uarms],
        [W_ARMG, u.uarmg],
        [W_ARMF, u.uarmf],
        [W_ARMU, u.uarmu],
        [W_RINGL, u.uleft],
        [W_RINGR, u.uright],
        [W_WEP, u.uwep],
        [W_SWAPWEP, u.uswapwep],
        [W_QUIVER, u.uquiver],
        [W_AMUL, u.uamul],
        [W_TOOL, u.ublindf],
        [W_BALL, u.uball],
        [W_CHAIN, u.uchain],
    ];
    for (const [mask, obj] of slots) {
        if (mask & wornmask) return obj || null;
    }
    return null;
}

/**
 * C ref: worn.c wearslot — bitmask of slots obj might occupy. Caller
 * zap.c poly_obj worn remap (D-1510). Wield/quiver of non-weapons is
 * the caller's job (poly_obj keeps old W_WEAPONS bits).
 */
export function wearslot(obj) {
    if (!obj) return 0;
    const otyp = obj.otyp | 0;
    switch (obj.oclass) {
    case AMULET_CLASS:
        return W_AMUL;
    case RING_CLASS:
        return W_RINGL | W_RINGR;
    case ARMOR_CLASS:
        switch (game.objects?.[otyp]?.oc_skill) {
        case ARM_SUIT: return W_ARM;
        case ARM_SHIELD: return W_ARMS;
        case ARM_HELM: return W_ARMH;
        case ARM_GLOVES: return W_ARMG;
        case ARM_BOOTS: return W_ARMF;
        case ARM_CLOAK: return W_ARMC;
        case ARM_SHIRT: return W_ARMU;
        default: return 0;
        }
    case WEAPON_CLASS: {
        let res = W_WEP | W_SWAPWEP;
        if (oc_merge_of(otyp)) res |= W_QUIVER;
        return res;
    }
    case TOOL_CLASS:
        if (otyp === BLINDFOLD || otyp === TOWEL || otyp === LENSES) {
            return W_TOOL;
        }
        if (is_weptool(obj) || otyp === TIN_OPENER) {
            return W_WEP | W_SWAPWEP;
        }
        if (otyp === SADDLE) return W_SADDLE;
        return 0;
    case FOOD_CLASS:
        return otyp === MEAT_RING ? (W_RINGL | W_RINGR) : 0;
    case GEM_CLASS:
        return W_QUIVER;
    case BALL_CLASS:
        return W_BALL;
    case CHAIN_CLASS:
        return W_CHAIN;
    default:
        return 0;
    }
}

/**
 * C ref: worn.c which_armor — first minvent obj with owornmask bit.
 * Hero youmonst path deferred (callers use u.uarm*).
 */
export function which_armor(mon, flag) {
    if (!mon) return null;
    for (let obj = mon.minvent; obj; obj = obj.nobj) {
        if ((obj.owornmask || 0) & flag) return obj;
    }
    return null;
}

/**
 * C ref: worn.c mon_set_minvis :474–484 — permanent invis from
 * potion/wand. FALSE = not a cursed potion → perminvis 1.
 * Caller zap.c bhitm WAN_MAKE_INVISIBLE (D-1414). see_wsegs when
 * wormno (D-1529). muse.c / mon.c local clones still named.
 */
export function mon_set_minvis(mon, cursed_potion) {
    if (!mon) return;
    mon.perminvis = cursed_potion ? 0 : 1;
    if (!mon.invis_blkd) {
        mon.minvis = mon.perminvis;
        newsym(mon.mx | 0, mon.my | 0);
        if (mon.wormno) see_wsegs(mon);
    }
}

/**
 * C ref: mon.c check_gear_next_turn — flag reassess gear next move.
 */
export function check_gear_next_turn(mon) {
    if (!mon) return;
    mon.misc_worn_check = (mon.misc_worn_check || 0) | I_SPECIAL;
}

/**
 * C ref: worn.c extract_from_minvent — unlink minvent obj; worn extras
 * when owornmask. Named omit: artifact_light end_burn; obj_no_longer_held
 * (crysknife); setmnotwielded light polish (mwepgone core inlined to
 * avoid worn↔weapon).
 */
export function extract_from_minvent(mon, obj, do_extrinsics, silently) {
    if (!mon || !obj) return;
    if (obj.where !== OBJ_MINVENT && obj.where !== 'MINVENT') return;
    const unwornmask = obj.owornmask | 0;
    obj_extract_self(obj);
    obj.owornmask = 0;
    if (unwornmask) {
        if ((mon.mhp | 0) >= 1 && do_extrinsics) {
            update_mon_extrinsics(mon, obj, false, silently);
        }
        mon.misc_worn_check = (mon.misc_worn_check || 0) & ~unwornmask;
        check_gear_next_turn(mon);
    }
    if (unwornmask & W_WEP) {
        mon.mw = null;
        mon.weapon_check = NEED_WEAPON;
    }
}

/** C ref: worn.c extra_pref — speed boots bias */
function extra_pref(mon, obj) {
    if (obj && (obj.otyp | 0) === SPEED_BOOTS && (mon.permspeed | 0) !== MFAST) {
        return 20;
    }
    return 0;
}

/**
 * C ref: worn.c racial_exception — hobbit+elven armor ok.
 */
export function racial_exception(mon, obj) {
    const ptr = mon?.data;
    if ((ptr?.mndx ?? -1) === PM_HOBBIT && is_elven_armor(obj)) return 1;
    return 0;
}

/**
 * Local FAST boots speed sync — avoids worn↔muse↔makemon cycle.
 * Mirrors muse.js mon_adjust_speed adjust==0 boots arm.
 */
function sync_mon_speed_from_boots(mon) {
    let boots = null;
    for (let otmp = mon.minvent; otmp; otmp = otmp.nobj) {
        if (otmp.owornmask && (otmp.otyp | 0) === SPEED_BOOTS) {
            boots = otmp;
            break;
        }
    }
    mon.mspeed = boots ? MFAST : (mon.permspeed | 0);
}

/**
 * C ref: worn.c update_mon_extrinsics — on/off armor properties for mon.
 * Named omissions: artifact_light vision; steed saddle dismount; silent
 * newsym polish when invis toggles mid-message path; full mon_adjust_speed
 * adjust≠0 arms (SPEED_BOOTS wear uses local boots sync).
 */
export function update_mon_extrinsics(mon, obj, on, silently) {
    if (!mon || !obj) return;
    let which = game.objects?.[obj.otyp]?.oc_oprop | 0;
    let altwhich = altprop(obj);
    const unseen = !canseemon(mon);

    if (!which && !altwhich) {
        maybe_blocks(mon, obj, on, silently, unseen);
        return;
    }

    while (true) {
        if (on) {
            switch (which) {
            case INVIS:
                mon.minvis = mon.invis_blkd ? 0 : 1;
                break;
            case FAST: {
                const save = game.in_mklev;
                if (silently) game.in_mklev = true;
                sync_mon_speed_from_boots(mon);
                game.in_mklev = save;
                break;
            }
            case ANTIMAGIC:
            case REFLECTING:
            case PROTECTION:
            case CLAIRVOYANT:
            case STEALTH:
            case TELEPAT:
            case LEVITATION:
            case FLYING:
            case WWALKING:
            case DISPLACED:
            case FUMBLING:
            case JUMPING:
                break;
            default:
                mon.mextrinsics = (mon.mextrinsics | 0) | res_to_mr(which);
                break;
            }
        } else {
            switch (which) {
            case INVIS:
                mon.minvis = mon.perminvis ? 1 : 0;
                break;
            case FAST: {
                const save = game.in_mklev;
                if (silently) game.in_mklev = true;
                sync_mon_speed_from_boots(mon);
                game.in_mklev = save;
                break;
            }
            case FIRE_RES:
            case COLD_RES:
            case SLEEP_RES:
            case DISINT_RES:
            case SHOCK_RES:
            case POISON_RES:
            case ACID_RES:
            case STONE_RES: {
                const mask = res_to_mr(which);
                let otmp;
                for (otmp = mon.minvent; otmp; otmp = otmp.nobj) {
                    if (otmp === obj || !otmp.owornmask) continue;
                    if ((game.objects?.[otmp.otyp]?.oc_oprop | 0) === which) break;
                    if (altprop(otmp) === which) break;
                }
                if (!otmp) mon.mextrinsics = (mon.mextrinsics | 0) & ~mask;
                break;
            }
            default:
                break;
            }
        }
        if (altwhich && which !== altwhich) {
            which = altwhich;
            continue;
        }
        break;
    }

    maybe_blocks(mon, obj, on, silently, unseen);
}

function maybe_blocks(mon, obj, on, silently, unseen) {
    switch (w_blocks(obj, ~0)) {
    case INVIS:
        mon.invis_blkd = on ? 1 : 0;
        mon.minvis = on ? 0 : (mon.perminvis ? 1 : 0);
        break;
    default:
        break;
    }
    if (!silently && (unseen !== !canseemon(mon))) {
        newsym(mon.mx, mon.my);
    }
}

/**
 * C ref: worn.c m_dowear_type — pick best slot item and wear it.
 * Sync: wear/invis plines when !creation still deferred (named omission);
 * mfrozen set. Hallu: always take mon_nam/Monnam into nambuf before
 * visibility changes (D-0855) — even when nothing is worn.
 */
function m_dowear_type(mon, flag, creation, racialexception) {
    if (mon.mfrozen) return;

    // C: worn.c m_dowear_type — name before altering visibility
    // (See_invisible ? Monnam : mon_nam). Hallu burns rndmonnam here.
    const nambuf = game.u?.See_invisible ? Monnam(mon) : mon_nam(mon);
    void nambuf; // invis "cannot see" pline deferred

    let old = which_armor(mon, flag);
    if (old && old.cursed) return;
    if (old && flag === W_AMUL && (old.otyp | 0) !== AMULET_OF_GUARDING) return;

    let best = old;
    outer: for (let obj = mon.minvent; obj; obj = obj.nobj) {
        switch (flag) {
        case W_AMUL:
            if (obj.oclass !== AMULET_CLASS) continue;
            if ((obj.otyp | 0) !== AMULET_OF_LIFE_SAVING
                && (obj.otyp | 0) !== AMULET_OF_REFLECTION
                && (obj.otyp | 0) !== AMULET_OF_GUARDING) continue;
            if (!best || (obj.otyp | 0) !== AMULET_OF_GUARDING) {
                best = obj;
                if ((best.otyp | 0) !== AMULET_OF_GUARDING) {
                    break outer; // life-saving or reflection
                }
            }
            continue;
        case W_ARMU:
            if (!is_shirt(obj)) continue;
            break;
        case W_ARMC:
            if (!is_cloak(obj)) continue;
            if ((mon.data?.msize ?? 0) > MZ_HUMAN
                && (obj.otyp | 0) !== MUMMY_WRAPPING) continue;
            // See_invisible deferred — treat as !See_invisible
            if (mon.minvis && w_blocks(obj, W_ARMC) === INVIS && !creation) {
                continue;
            }
            break;
        case W_ARMH:
            if (!is_helmet(obj)) continue;
            if ((obj.otyp | 0) === HELM_OF_OPPOSITE_ALIGNMENT
                && (mon.ispriest || mon.isminion)) continue;
            if (has_horns(mon.data) && !is_flimsy(obj)) continue;
            break;
        case W_ARMS:
            if (!is_shield(obj)) continue;
            break;
        case W_ARMG:
            if (!is_gloves(obj)) continue;
            break;
        case W_ARMF:
            if (!is_boots(obj)) continue;
            break;
        case W_ARM:
            if (!is_suit(obj)) continue;
            if (racialexception && racial_exception(mon, obj) < 1) continue;
            break;
        default:
            continue;
        }
        if (obj.owornmask) continue;
        if (best && (ARM_BONUS(best) + extra_pref(mon, best)
            >= ARM_BONUS(obj) + extra_pref(mon, obj))) continue;
        best = obj;
    }

    if (!best || best === old) return;

    const autocurse = ((best.otyp | 0) === HELM_OF_OPPOSITE_ALIGNMENT
        || (best.otyp | 0) === DUNCE_CAP) && !best.cursed;
    let m_delay = 0;
    if ((flag === W_ARM || flag === W_ARMU)
        && ((mon.misc_worn_check || 0) & W_ARMC)) {
        m_delay += 2;
    }
    let oldmask = 0;
    if (old) {
        m_delay += game.objects?.[old.otyp]?.oc_delay | 0;
        oldmask = old.owornmask || 0;
        old.owornmask = 0;
    }

    if (!creation) {
        // wear plines deferred (named omission); delay still applied
        m_delay += game.objects?.[best.otyp]?.oc_delay | 0;
        mon.mfrozen = m_delay;
        if (mon.mfrozen) mon.mcanmove = 0;
    }

    if (old) {
        update_mon_extrinsics(mon, old, false, creation);
        old.owornmask = oldmask;
        // artifact_light end_burn deferred
        old.owornmask = 0;
    }
    mon.misc_worn_check = (mon.misc_worn_check || 0) | flag;
    best.owornmask = (best.owornmask || 0) | flag;
    if (autocurse) curse(best);
    // artifact_light begin_burn deferred
    update_mon_extrinsics(mon, best, true, creation);
}

/**
 * C ref: worn.c m_dowear — wear best of each armor type.
 * Sync (makemon creation path must not await).
 * @param {object} mon
 * @param {boolean} creation — true → no wear delay / messages
 */
export function m_dowear(mon, creation) {
    if (!mon?.data) return;
    const ptr = mon.data;
    if (verysmall(ptr) || nohands(ptr) || is_animal(ptr)) return;
    if (mindless(ptr)
        && (!creation || (ptr.mlet !== 'S_MUMMY'
            && (ptr.mndx ?? -1) !== PM_SKELETON))) {
        return;
    }

    m_dowear_type(mon, W_AMUL, creation, false);
    const can_wear_armor = !cantweararm(ptr);
    if (can_wear_armor && !((mon.misc_worn_check || 0) & W_ARM)) {
        m_dowear_type(mon, W_ARMU, creation, false);
    }
    if (can_wear_armor || WrappingAllowed(ptr)) {
        m_dowear_type(mon, W_ARMC, creation, false);
    }
    m_dowear_type(mon, W_ARMH, creation, false);
    // C: MON_WEP(mon) → mon->mw
    const mwep = mon.mw || null;
    if (!mwep || !bimanual(mwep)) {
        m_dowear_type(mon, W_ARMS, creation, false);
    }
    m_dowear_type(mon, W_ARMG, creation, false);
    if (!slithy(ptr) && ptr.mlet !== 'S_CENTAUR') {
        m_dowear_type(mon, W_ARMF, creation, false);
    }
    if (can_wear_armor) {
        m_dowear_type(mon, W_ARM, creation, false);
    } else {
        m_dowear_type(mon, W_ARM, creation, true); // RACE_EXCEPTION
    }
}

/**
 * C ref: mon.c movemon_singlemon I_SPECIAL arm — re-equip after gear loss /
 * pickup; spend turn if worn mask changes or mfrozen.
 * @returns {boolean} true if turn spent equipping (caller should return)
 */
export function maybe_m_dowear_special(mtmp) {
    if (!mtmp || !((mtmp.misc_worn_check || 0) & I_SPECIAL)) return false;
    if (mtmp.mpeaceful || mtmp.mtame
        || dist2(mtmp.mx, mtmp.my, mtmp.mux, mtmp.muy) > (3 * 3)) {
        mtmp.misc_worn_check = (mtmp.misc_worn_check || 0) & ~I_SPECIAL;
        const oldworn = mtmp.misc_worn_check || 0;
        m_dowear(mtmp, false);
        if ((mtmp.misc_worn_check || 0) !== oldworn || !mtmp.mcanmove) {
            return true;
        }
    }
    return false;
}

/**
 * C worn.c bypass_objlist `:1126–1137`.
 * JS invent is an Array; minvent stays nobj. `on` sets context.bypasses.
 * @param {object[]|object|null} objchain
 * @param {boolean} on
 */
export function bypass_objlist(objchain, on) {
    if (on && (Array.isArray(objchain) ? objchain.length : objchain)) {
        if (!game.context) game.context = {};
        game.context.bypasses = true;
    }
    if (Array.isArray(objchain)) {
        for (const o of objchain) {
            if (o) o.bypass = on ? 1 : 0;
        }
        return;
    }
    let o = objchain;
    while (o) {
        o.bypass = on ? 1 : 0;
        o = o.nobj;
    }
}

/**
 * C worn.c nxt_unbypassed_obj `:1140–1152`.
 * Marks the first unmarked object (C bypass_obj) so successive calls
 * walk the rest. Array invent or nobj chain.
 * @param {object[]|object|null} objchain
 * @returns {object|null}
 */
export function nxt_unbypassed_obj(objchain) {
    const mark = (obj) => {
        obj.bypass = 1;
        if (!game.context) game.context = {};
        game.context.bypasses = true;
        return obj;
    };
    if (Array.isArray(objchain)) {
        for (const o of objchain) {
            if (o && !o.bypass) return mark(o);
        }
        return null;
    }
    let o = objchain;
    while (o) {
        if (!o.bypass) return mark(o);
        o = o.nobj;
    }
    return null;
}
