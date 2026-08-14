// shk.js — shop PRICING and the price strings doname() shows.
//
// C ref: src/shk.c.  This is the quoted-price core only: get_cost()/
// get_cost_of_shop_item() (what "(for sale, N zorkmids)" prints), set_cost()
// (what the shk pays when buying), unpaid_cost() ("(unpaid, N zorkmids)"),
// billable(), shk_names_obj(), inhishop() and costly_spot().
//
// NONE of these functions draws RNG.  Every rn2() on a shop path lives
// elsewhere — append_honorific() in addtobill(), the Kop spawn in
// hot_pursuit() — so a price that comes out wrong shifts screens without
// shifting the PRNG stream, which is exactly how a shop session can match 95%
// of C's RNG and 30% of its screens.
//
// The prices themselves come from js/objcost_data.js (objects[].oc_cost,
// dumped from the recorder's own objects.o) via mkobj.js base_oc_cost().

import { game } from './gstate.js';
import { objects, base_oc_cost, base_oc_weight, weight, next_ident } from './mkobj.js';
import { acurr_eff, adjalign } from './attrib.js';
import { monster_by_pmidx } from './makemon.js';
import { rn2 } from './rng.js';
import { update_topl } from './display.js';
import { MFLAGS1, M1_TPORT, M1_TPORT_CNTRL, msound_of } from './monflags_data.js';
import { in_rooms, shop_keeper, shkname } from './shkroom.js';
import { shtypes, VEGETARIAN_CLASS } from './shtypes.js';
import { observe_object, discover_object } from './o_init.js';
// currency() is NOT re-implemented here: C's currency() rolls
// ROLL_FROM(currencies) while hallucinating, so a local copy would silently
// drop an rn2() draw from every "(unpaid, N ...)" render.
import { currency } from './invent.js';
import { A_CHA, HUNGRY, SHOPBASE, ROOMOFFSET, NO_ROOM } from './const.js';

// ── constants ────────────────────────────────────────────────────────────────
// objclass.h object classes.
const RANDOM_CLASS = 0, WEAPON_CLASS = 2, ARMOR_CLASS = 3, TOOL_CLASS = 6,
      FOOD_CLASS = 7, POTION_CLASS = 8, SCROLL_CLASS = 9, SPBOOK_CLASS = 10,
      WAND_CLASS = 11, COIN_CLASS = 12, GEM_CLASS = 13, BALL_CLASS = 15;
// Verified against js/mkobj.js objects[].oclass (11 = generic wand,
// 15 = generic iron ball).  shkroom.js's private copy says WAND_CLASS = 10,
// which is SPBOOK_CLASS — see the deferred note.

// objects.h otyps referenced by name in shk.c.
const DUNCE_CAP = 94, MIRROR = 218, TALLOW_CANDLE = 224, WAX_CANDLE = 225,
      CORPSE = 265, EGG = 266, TIN = 296, POT_WATER = 322;
const FIRST_REAL_GEM = 439;         // objects.h MARKER(FIRST_REAL_GEM, DILITHIUM_CRYSTAL)
const FIRST_GLASS_GEM = 461;        // objects.h MARKER(FIRST_GLASS_GEM, WORTHLESS_WHITE_GLASS)
// objclass.h materials.
const VEGGY = 3, GLASS = 19, GEMSTONE = 20;
const STRANGE_OBJECT = 0;
const NON_PM = -1;                  // monsters.h

// defsym.h MONSYM() indices (makemon.js MONS[].mcls carries the same number).
const S_BLOB = 2, S_JELLY = 10, S_VORTEX = 22, S_LIGHT = 25,
      S_ELEMENTAL = 31, S_FUNGUS = 32, S_PUDDING = 42, S_GHOST = 54,
      S_GOLEM = 55;
// pmidx of the species vegan()/vegetarian() carve out by identity.
const PM_STALKER = 153, PM_BLACK_PUDDING = 209, PM_LEATHER_GOLEM = 253,
      PM_FLESH_GOLEM = 255;

const PM_TOURIST = 10;              // roles[].mnum
const MAXULEV = 30;                 // you.h
const G_UNIQ = 0x1000;              // monflag.h
const NUMMONS = 383;                // mons[] size in the recorder build
const BILLSZ = 200;                 // shk.h

// hack.h — unpaid_cost()'s cost_type.
export const COST_NOCONTENTS = 0, COST_CONTENTS = 1, COST_SINGLEOBJ = 2;

// obj.h obj->where.  This port stores `where` as a STRING (mkobj.js/invent.js),
// not the C small-int, so compare against these spellings.
const OBJ_FREE = 'free', OBJ_FLOOR = 'floor', OBJ_CONTAINED = 'contained',
      OBJ_INVENT = 'invent', OBJ_MINVENT = 'minvent';

const carried = (o) => o.where === OBJ_INVENT;
// obj.h Has_contents(o) — the Is_container()/STATUE test is commented out in C,
// so it really is just "has a contents chain".
const Has_contents = (o) => !!(o && o.cobj && o.cobj.length);
const Is_candle = (o) => o.otyp === TALLOW_CANDLE || o.otyp === WAX_CANDLE;

// ── mons[].mconveys ──────────────────────────────────────────────────────────
// permonst.mconveys — the SECOND MR_* argument of each MON() entry (the first
// is mresists, which makemon.js already carries as MONS[].mresists; they differ
// for e.g. a wraith, which resists nothing it conveys).  corpsenm_price_adj()
// is the only caller here, and without this column every tin/egg/corpse in a
// delicatessen prices as 0 -> get_cost()'s `if (!tmp) tmp = 5` floor.
//
// Extracted from nethack-c/recorder/include/monsters.h with the same
// preprocessor-guard handling swarm/bin/gen-monflags.mjs uses (MAIL_STRUCTURES
// defined, CHARON not, `#if 0` beholder excluded) and verified index-aligned
// BY NAME against js/makemon.js for all 383 entries.
// monflag.h: MR_FIRE 0x01 MR_COLD 0x02 MR_SLEEP 0x04 MR_DISINT 0x08
//            MR_ELEC 0x10 MR_POISON 0x20 MR_ACID 0x40 MR_STONE 0x80
const MR_FIRE = 0x01, MR_COLD = 0x02, MR_SLEEP = 0x04, MR_DISINT = 0x08,
      MR_ELEC = 0x10, MR_POISON = 0x20, MR_ACID = 0x40, MR_STONE = 0x80;

const MCONVEYS = [
    0x0, 0x20, 0x20, 0x1, 0x20, 0x20, 0xc0, 0x20, 0x17, 0xa0, 0xa0, 0x21,
    0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x2, 0x0,
    0x2, 0x1, 0x1, 0x0, 0x0, 0x2, 0x1, 0x10, 0x0, 0x0, 0x0, 0x0,
    0x0, 0x0, 0x0, 0x0, 0x20, 0x80, 0x80, 0x0, 0x0, 0x0, 0x0, 0x0,
    0x0, 0x0, 0x0, 0x24, 0x0, 0x4, 0x20, 0x20, 0x22, 0xc0, 0xc0, 0x0,
    0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0,
    0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0,
    0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x20, 0x20,
    0x20, 0x20, 0x0, 0x0, 0x0, 0x20, 0x20, 0x20, 0x0, 0x0, 0x0, 0x0,
    0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x20, 0x0, 0x0,
    0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0,
    0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0,
    0x0, 0x0, 0x1, 0x2, 0x4, 0x8, 0x10, 0x20, 0xc0, 0x0, 0x0, 0x0,
    0x0, 0x0, 0x0, 0x22, 0x20, 0xc0, 0x21, 0x20, 0x20, 0x0, 0x0, 0x0,
    0x0, 0x0, 0x0, 0x0, 0x1, 0x2, 0x0, 0x10, 0x0, 0x0, 0x0, 0x0,
    0x0, 0x0, 0x0, 0x2, 0x2, 0x3, 0x3, 0x0, 0x0, 0x0, 0x0, 0x0,
    0x0, 0x0, 0x0, 0x20, 0x20, 0x20, 0x20, 0x21, 0xe0, 0x20, 0x20, 0x0,
    0x0, 0x0, 0x23, 0x32, 0xc0, 0x32, 0x0, 0x0, 0x0, 0x0, 0x0, 0x20,
    0x20, 0x0, 0x20, 0x20, 0x0, 0x2, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0,
    0x0, 0x0, 0x0, 0x0, 0x80, 0x0, 0x0, 0x0, 0x2, 0x0, 0x0, 0x0,
    0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0,
    0x0, 0x0, 0x0, 0x37, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0,
    0x4, 0x4, 0x4, 0x4, 0x4, 0x4, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0,
    0x0, 0x0, 0x0, 0x20, 0x0, 0x0, 0x0, 0x0, 0xa0, 0x21, 0x0, 0x0,
    0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0,
    0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0,
    0x0, 0x0, 0x0, 0x0, 0x20, 0x0, 0x0, 0x0, 0x10, 0x0, 0x0, 0x0,
    0x0, 0x0, 0x80, 0x0, 0x0, 0x1, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0,
    0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0,
    0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0xff,
    0x0, 0x1, 0x20, 0x0, 0x20, 0x0, 0x0, 0x1, 0x0, 0x0, 0x0, 0x0,
    0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0,
];

// mondata.h telepathic(ptr) — an explicit three-species test in C, NOT a flag.
const PM_FLOATING_EYE = 28, PM_MIND_FLAYER = 48, PM_MASTER_MIND_FLAYER = 49;

// monst.h ismnum(x) = (x >= LOW_PM && x < NUMMONS); LOW_PM is 0.
const ismnum = (x) => Number.isInteger(x) && x >= 0 && x < NUMMONS;
// mondata.h unique_corpstat(ptr) = (ptr->geno & G_UNIQ) != 0
const unique_corpstat = (ptr) => ((ptr?.geno ?? 0) & G_UNIQ) !== 0;

// C ref: eat.c intrinsic_possible(type, ptr).  prop.h numbers are irrelevant
// here — shk.c's icost[] names the properties, so key on those names directly.
function intrinsic_possible(trinsic, ptr) {
    const idx = ptr?.pmidx;
    const conv = idx != null ? (MCONVEYS[idx] || 0) : 0;
    const f1 = idx != null ? (MFLAGS1[idx] || 0) : 0;
    switch (trinsic) {
    case 'FIRE_RES':   return (conv & MR_FIRE) !== 0;
    case 'SLEEP_RES':  return (conv & MR_SLEEP) !== 0;
    case 'COLD_RES':   return (conv & MR_COLD) !== 0;
    case 'DISINT_RES': return (conv & MR_DISINT) !== 0;
    case 'SHOCK_RES':  return (conv & MR_ELEC) !== 0;
    case 'POISON_RES': return (conv & MR_POISON) !== 0;
    case 'ACID_RES':   return (conv & MR_ACID) !== 0;
    case 'STONE_RES':  return (conv & MR_STONE) !== 0;
    case 'TELEPORT':   return (f1 & M1_TPORT) !== 0;
    case 'TELEPORT_CONTROL': return (f1 & M1_TPORT_CNTRL) !== 0;
    case 'TELEPAT':
        return idx === PM_FLOATING_EYE || idx === PM_MIND_FLAYER
            || idx === PM_MASTER_MIND_FLAYER;
    default: return false;
    }
}

// C ref: shk.c corpsenm_price_adj(obj):4275 — a tin/egg/corpse costs more the
// more intrinsics it can grant and the tougher the beast was.
const ICOST = [
    ['FIRE_RES', 2], ['SLEEP_RES', 3], ['COLD_RES', 2], ['DISINT_RES', 5],
    ['SHOCK_RES', 4], ['POISON_RES', 2], ['ACID_RES', 1], ['STONE_RES', 3],
    ['TELEPORT', 2], ['TELEPORT_CONTROL', 3], ['TELEPAT', 5],
];

export function corpsenm_price_adj(obj) {
    let val = 0;
    if ((obj.otyp === TIN || obj.otyp === EGG || obj.otyp === CORPSE)
        && ismnum(obj.corpsenm)) {
        const ptr = monster_by_pmidx(obj.corpsenm);
        if (!ptr) return 0;
        let tmp = 1;
        for (const [trinsic, cost] of ICOST)
            if (intrinsic_possible(trinsic, ptr)) tmp += cost;
        if (unique_corpstat(ptr)) tmp += 50;

        val = Math.max(1, (ptr.mlevel - 1) * 2);
        if (obj.otyp === CORPSE)
            val += Math.max(1, Math.trunc((ptr.cnutrit ?? 0) / 30));
        val = val * tmp;
    }
    return val;
}

// ── price helpers ────────────────────────────────────────────────────────────

// C ref: shk.c get_pricing_units(obj) — quan, except globs sell by weight.
// C falls back to weight(obj) when owt is 0; using 0 there rounds units to 0
// and prices the whole glob at nothing.
export function get_pricing_units(obj) {
    let units = obj.quan ?? 1;
    if (obj.globby) {
        const unit_weight = base_oc_weight(obj) || 0;
        const wt = (obj.owt > 0) ? obj.owt : weight(obj);
        if (unit_weight) units = Math.trunc((wt + unit_weight - 1) / unit_weight);
    }
    return units;
}

// C ref: shk.c oid_price_adjustment(obj, oid):2860 — one unidentified item in
// four (by o_id, so it is stable within a game) carries a surcharge.
export function oid_price_adjustment(obj, oid) {
    const o = objects[obj.otyp];
    if (!(obj.dknown && o?.oc_name_known)
        && (obj.oclass !== GEM_CLASS || o?.material !== GLASS))
        return (oid % 4) === 0 ? 1 : 0;
    return 0;
}

// C ref: artifact.c arti_cost(otmp).  artilist[] is not ported, so an artifact
// with no listed cost is the only branch we can evaluate; see the deferred note.
function arti_cost(obj) {
    if (!obj.oartifact) return base_oc_cost(obj.otyp);
    return 100 * base_oc_cost(obj.otyp);
}

// C ref: shk.c getprice(obj, shk_buying):4318 — list price before the shk's
// charisma / dunce-cap / unidentified multipliers.
export function getprice(obj, shk_buying) {
    let tmp = base_oc_cost(obj.otyp);

    if (obj.oartifact) {
        tmp = arti_cost(obj);
        if (shk_buying) tmp = Math.trunc(tmp / 4);
    }
    switch (obj.oclass) {
    case FOOD_CLASS:
        tmp += corpsenm_price_adj(obj);
        // C: a HUNGRY-or-worse hero is charged u.uhs (2..4)x for food.
        if ((game.u?.uhs || 0) >= HUNGRY && !shk_buying) tmp *= game.u.uhs;
        if (obj.oeaten) tmp = 0;
        break;
    case WAND_CLASS:
        if (obj.spe === -1) tmp = 0;
        break;
    case POTION_CLASS:
        if (obj.otyp === POT_WATER && !obj.blessed && !obj.cursed) tmp = 0;
        break;
    case ARMOR_CLASS:
    case WEAPON_CLASS:
        if ((obj.spe || 0) > 0) tmp += 10 * obj.spe;
        break;
    case TOOL_CLASS:
        if (Is_candle(obj) && (obj.age || 0) < 20 * base_oc_cost(obj.otyp))
            tmp = Math.trunc(tmp / 2);
        break;
    default: break;
    }
    return tmp;
}

// C ref: shk.c get_cost():2877 glass-gem branch — `(int) ubirthday % otyp`.
// ubirthday is the game-start wall clock in SECONDS; shknam.c's nameshk() seed
// derives it the same way (see js/shknam.js ubirthdaySeconds(), which measured
// the recordings' fixed UTC-4 offset against four recorded shopkeeper names).
// game.ubirthday is never assigned anywhere in this port, so reading it
// directly makes the expression 0 and the pseudorandom bit constantly false.
const UBIRTHDAY_UTC_OFFSET = -4 * 3600;
function ubirthday() {
    if (typeof game.ubirthday === 'number' && game.ubirthday) return game.ubirthday;
    const dt = String(game.datetime || '');
    if (!/^\d{14}$/.test(dt)) return 0;
    const y = +dt.slice(0, 4), mo = +dt.slice(4, 6), d = +dt.slice(6, 8);
    const h = +dt.slice(8, 10), mi = +dt.slice(10, 12), s = +dt.slice(12, 14);
    // C truncates to `int`; a 2026 epoch-second count fits in int32 unchanged.
    return (Math.trunc(Date.UTC(y, mo - 1, d, h, mi, s) / 1000)
            - UBIRTHDAY_UTC_OFFSET) | 0;
}

// C ref: shk.c get_cost() — each worthless glass gem is priced as one of two
// real gems, picked by a per-game pseudorandom bit.  Indexed from
// FIRST_GLASS_GEM; [pseudorand ? a : b].
const GLASS_GEM_PRICED_AS = [
    [440, 452],  // white:  diamond / opal
    [443, 448],  // blue:   sapphire / aquamarine
    [441, 456],  // red:    ruby / jasper
    [449, 450],  // yellowish brown: amber / topaz
    [442, 459],  // orange: jacinth / agate
    [447, 453],  // yellow: citrine / chrysoberyl
    [444, 451],  // black:  black opal / jet
    [445, 460],  // green:  emerald / jade
    [455, 457],  // violet: amethyst / fluorite
];

// C ref: shk.c get_cost(obj, shkp):2877 — what the shk CHARGES for one of obj.
// No RNG.
export function get_cost(obj, shkp) {
    let tmp = getprice(obj, false);
    let multiplier = 1, divisor = 1;

    if (!tmp) tmp = 5;
    if (!obj.dknown || !objects[obj.otyp]?.oc_name_known) {
        if (obj.oclass === GEM_CLASS && objects[obj.otyp]?.material === GLASS) {
            const pseudorand =
                (ubirthday() % obj.otyp) >= Math.trunc(obj.otyp / 2);
            const pair = GLASS_GEM_PRICED_AS[obj.otyp - FIRST_GLASS_GEM];
            // C impossible()s on an out-of-range glass gem and uses
            // objects[STRANGE_OBJECT].oc_cost (0).
            tmp = pair ? base_oc_cost(pseudorand ? pair[0] : pair[1])
                       : base_oc_cost(STRANGE_OBJECT);
        } else if (oid_price_adjustment(obj, obj.o_id) > 0) {
            multiplier *= 4; divisor *= 3;
        }
    }
    if (game.uarmh && game.uarmh.otyp === DUNCE_CAP) {
        multiplier *= 4; divisor *= 3;
    } else if ((game.urole?.mnum === PM_TOURIST
                && (game.u?.ulevel || 1) < Math.trunc(MAXULEV / 2))
               || (game.uarmu && !game.uarm && !game.uarmc)) {
        multiplier *= 4; divisor *= 3;
    }

    const cha = acurr_eff(A_CHA);
    if (cha > 18) divisor *= 2;
    else if (cha === 18) { multiplier *= 2; divisor *= 3; }
    else if (cha >= 16) { multiplier *= 3; divisor *= 4; }
    else if (cha <= 5) multiplier *= 2;
    else if (cha <= 7) { multiplier *= 3; divisor *= 2; }
    else if (cha <= 10) { multiplier *= 4; divisor *= 3; }

    tmp *= multiplier;
    if (divisor > 1) {
        // C: tmp = (((tmp * 10) / divisor) + 5) / 10 — integer round-half-up.
        tmp = Math.trunc((Math.trunc((tmp * 10) / divisor) + 5) / 10);
    }
    if (tmp <= 0) tmp = 1;
    if (obj.oartifact) tmp *= 4;
    // C applies the anger surcharge separately from multiplier/divisor so it
    // matches rile_shk()'s.
    if (shkp?.eshk?.surcharge) tmp += Math.trunc((tmp + 2) / 3);
    return tmp;
}

// C ref: shk.c set_cost(obj, shkp):3148 — what the shk PAYS for all of obj.
// Note this one is for the whole stack (it multiplies by get_pricing_units
// itself), unlike get_cost() which is per unit.  No RNG.
export function set_cost(obj, shkp) {
    const unit_price = getprice(obj, true);
    let tmp = get_pricing_units(obj) * unit_price;
    let multiplier = 1, divisor = 1;

    if (game.uarmh && game.uarmh.otyp === DUNCE_CAP) divisor *= 3;
    else if ((game.urole?.mnum === PM_TOURIST
              && (game.u?.ulevel || 1) < Math.trunc(MAXULEV / 2))
             || (game.uarmu && !game.uarm && !game.uarmc)) divisor *= 3;
    else divisor *= 2;

    if (!obj.dknown || !objects[obj.otyp]?.oc_name_known) {
        if (obj.oclass === GEM_CLASS) {
            const mat = objects[obj.otyp]?.material;
            if (mat === GEMSTONE || mat === GLASS) {
                // C: different shopkeepers give different prices; m_id keys it.
                tmp = (obj.otyp - FIRST_REAL_GEM) % (6 - (shkp.m_id % 3));
                tmp = (tmp + 3) * (obj.quan ?? 1);
                divisor = 1;
            }
        } else if (tmp > 1 && !(shkp.m_id % 4)) {
            multiplier *= 3; divisor *= 4;
        }
    }

    if (tmp >= 1) {
        tmp *= multiplier;
        if (divisor > 1) {
            tmp = Math.trunc((Math.trunc((tmp * 10) / divisor) + 5) / 10);
        }
        if (tmp < 1) tmp = 1;   /* avoid adjusting nonzero to zero */
    }
    /* (no adjustment for angry shk here) */
    return tmp;
}

// ── shop geometry ────────────────────────────────────────────────────────────

// C ref: shk.c inhishop(shkp):1039 — is the shk inside her shop OR ON ITS
// BOUNDARY?  C asks in_rooms(mx, my, SHOPBASE) and searches the result for
// shoproom; reading levl[mx][my].roomno directly answers NO_ROOM/SHARED for a
// shk standing in her own doorway, which is where shopkeepers usually stand.
export function inhishop(shkp) {
    const eshk = shkp?.eshk;
    if (!eshk) return false;
    // C also requires on_level(&eshkp->shoplevel, &u.uz); eshk.shoplevel is
    // never populated by this port's shkinit, and shop_keeper() only ever
    // resolves residents of the current level's rooms, so it is implied.
    if (eshk.shoplevel && game.u?.uz
        && (eshk.shoplevel.dnum !== game.u.uz.dnum
            || eshk.shoplevel.dlevel !== game.u.uz.dlevel)) return false;
    return in_rooms(shkp.mx, shkp.my, SHOPBASE).includes(eshk.shoproom);
}

// C ref: shk.c inside_shop(x, y) — the shop's room number, 0 if not inside.
// levl[x][y].edge marks the wall ring, which is NOT "inside".
export function inside_shop(x, y) {
    const loc = game.level?.at(x, y);
    if (!loc) return 0;
    const rno = loc.roomno ?? NO_ROOM;
    if (rno < ROOMOFFSET || loc.edge) return 0;
    const rtype = game.level?.rooms?.[rno - ROOMOFFSET]?.rtype ?? 0;
    return rtype >= SHOPBASE ? rno : 0;
}

// C ref: shk.c costly_spot(x, y):5350 — shop floor whose contents the shk owns.
// The shk's own square (eshk->shk, the "free spot" just inside the door) is
// excluded: goods dropped there are not charged for.
export function costly_spot(x, y) {
    if (!game.level?.flags?.has_shop) return false;
    const shkp = shop_keeper(in_rooms(x, y, SHOPBASE)[0]);
    if (!shkp || !inhishop(shkp)) return false;
    const eshk = shkp.eshk;
    return !!inside_shop(x, y)
        && !(x === eshk.shk?.x && y === eshk.shk?.y);
}

// C ref: shk.c onbill(obj, shkp, silent) — obj's bill entry, if any.
function onbill(obj, shkp) {
    const eshk = shkp?.eshk;
    if (!eshk?.bill) return null;
    for (let ct = 0; ct < (eshk.billct || 0); ct++)
        if (eshk.bill[ct]?.bo_id === obj.o_id) return eshk.bill[ct];
    return null;
}

// C ref: obj.c get_obj_location(obj, &x, &y, CONTAINED_TOO) — an OBJ_CONTAINED
// object reports its outermost container's spot.  add_to_container() (mkobj.js)
// does not set ocontainer, so the walk falls back to a contents search.
function outermost(obj) {
    let top = obj, guard = 0;
    while (top.where === OBJ_CONTAINED && guard++ < 32) {
        const next = top.ocontainer || find_container_of(top);
        if (!next) break;
        top = next;
    }
    return top;
}

function find_container_of(obj) {
    const scan = (list, depth) => {
        if (depth > 8) return null;
        for (const o of list || []) {
            if (!o || !o.cobj) continue;
            if (o.cobj.includes(obj)) return o;
            const r = scan(o.cobj, depth + 1);
            if (r) return r;
        }
        return null;
    };
    return scan(game.level?.objects, 0) || scan(game.invent, 0) || null;
}

// C ref: zap.c get_obj_location(obj, &x, &y, CONTAINED_TOO).  OBJ_FREE,
// OBJ_ONBILL, OBJ_MIGRATING and (without BURIED_TOO) OBJ_BURIED all return
// FALSE with x=y=0, which is what makes get_cost_of_shop_item() quote nothing
// for an object that is between owners.
function obj_location(obj) {
    const top = outermost(obj);
    switch (top.where) {
    case OBJ_INVENT: return { x: game.u?.ux, y: game.u?.uy, ok: true };
    case OBJ_FLOOR:  return { x: top.ox, y: top.oy, ok: true };
    case OBJ_MINVENT:
        if (top.ocarry?.mx) return { x: top.ocarry.mx, y: top.ocarry.my, ok: true };
        break;
    default: break;
    }
    return { x: 0, y: 0, ok: false };
}

// ── the price strings ────────────────────────────────────────────────────────

// C ref: shk.c contained_cost(obj, shkp, price, usell, unpaid_only):2994 —
// the price of a container's CONTENTS ("the top container is added in the
// calling functions").
export function contained_cost(obj, shkp, price, usell, unpaid_only) {
    const top = outermost(obj);
    // pick_obj() removes the item from the floor, bills it, then puts it in
    // inventory; treat OBJ_FREE as still-on-floor for that window.
    const on_floor = (top.where === OBJ_FLOOR || top.where === OBJ_FREE);
    let x, y;
    const loc = obj_location(top);
    if (top.where === OBJ_FREE || !loc.ok) { x = game.u?.ux; y = game.u?.uy; }
    else { x = loc.x; y = loc.y; }
    const eshk = shkp?.eshk;
    const freespot = on_floor && x === eshk?.shk?.x && y === eshk?.shk?.y;

    for (const otmp of (obj.cobj || [])) {
        if (otmp.oclass === COIN_CLASS) continue;

        if (usell) {
            if (saleable(shkp, otmp) && !otmp.unpaid
                && otmp.oclass !== BALL_CLASS
                && !(otmp.oclass === FOOD_CLASS && otmp.oeaten)
                && !(Is_candle(otmp)
                     && (otmp.age || 0) < 20 * base_oc_cost(otmp.otyp)))
                price += set_cost(otmp, shkp);
        } else if (on_floor ? (!otmp.no_charge && !freespot)
                            : (otmp.unpaid || !unpaid_only)) {
            price += get_cost(otmp, shkp) * get_pricing_units(otmp);
        }

        if (Has_contents(otmp))
            price = contained_cost(otmp, shkp, price, usell, unpaid_only);
    }
    return price;
}

// C ref: shk.c contained_gold(obj, even_if_unknown):3044
export function contained_gold(obj, even_if_unknown) {
    let value = 0;
    for (const otmp of (obj.cobj || [])) {
        if (otmp.oclass === COIN_CLASS) value += (otmp.quan ?? 1);
        else if (Has_contents(otmp) && (otmp.cknown || even_if_unknown))
            value += contained_gold(otmp, even_if_unknown);
    }
    return value;
}

// C ref: shk.c get_cost_of_shop_item(obj, &nochrg):2809 — the "(for sale, N
// zorkmids)" price of something the hero is looking at on shop floor.
// nochrg: 1 = no charge, 0 = shop owned, -1 = not applicable (don't format).
export function get_cost_of_shop_item(obj) {
    const u = game.u;
    const res = { cost: 0, nochrg: -1 };
    if (!u?.ushops?.length || obj.oclass === COIN_CLASS
        || obj === u.uball || obj === u.uchain) return res;

    const loc = obj_location(obj);
    if (!loc.ok) return res;
    const { x, y } = loc;
    if (in_rooms(x, y, SHOPBASE)[0] !== u.ushops[0]) return res;
    const shkp = shop_keeper(inside_shop(x, y));
    if (!shkp || !inhishop(shkp)) return res;

    const top = outermost(obj);
    const eshk = shkp.eshk;
    const freespot = (top.where === OBJ_FLOOR
                      && x === eshk.shk?.x && y === eshk.shk?.y);
    // no_charge is only set for floor items inside the shop proper; items on
    // the free spot are implicitly 'no charge'.
    res.nochrg = (top.where === OBJ_FLOOR && (obj.no_charge || freespot)) ? 1 : 0;

    if (carried(top) ? !!obj.unpaid : !res.nochrg)
        res.cost = get_pricing_units(obj) * get_cost(obj, shkp);
    if (Has_contents(obj) && !freespot)
        res.cost += contained_cost(obj, shkp, 0, false, true);
    return res;
}

// C ref: shk.c unpaid_cost(unp_obj, cost_type):3260 — what doname() quotes for
// an unpaid inventory item.  doname() passes COST_CONTENTS, so a bag of unpaid
// goods must add its contents; quan (not get_pricing_units) is deliberate,
// because a glob's weight is already folded into bp->price.
export function unpaid_cost(unp_obj, cost_type = COST_CONTENTS) {
    let amt = 0, bp = null, shkp = null;
    for (const rno of (game.u?.ushops || [])) {
        shkp = shop_keeper(rno);
        if (!shkp) continue;
        bp = onbill(unp_obj, shkp);
        if (bp) {
            amt = bp.price;
            if (cost_type !== COST_SINGLEOBJ) amt *= (unp_obj.quan ?? 1);
        }
        if (cost_type === COST_CONTENTS && Has_contents(unp_obj))
            amt = contained_cost(unp_obj, shkp, amt, false, true);
        if (bp || (!unp_obj.unpaid && amt)) break;
    }
    return amt;
}

// C ref: shk.c is_unpaid(obj):1167 — obj itself, or anything inside it, is
// on a shop bill.
export function is_unpaid(obj) {
    if (obj.unpaid) return true;
    for (const o of (obj.cobj || [])) {
        if (o.unpaid) return true;
        if (Has_contents(o) && is_unpaid(o)) return true;
    }
    return false;
}

// C ref: shk.c picked_container(obj) — clear no_charge through every nesting
// level, not just the top one.
function picked_container(obj) {
    for (const otmp of (obj.cobj || [])) {
        if (otmp.no_charge) otmp.no_charge = 0;
        if (Has_contents(otmp)) picked_container(otmp);
    }
}

// C ref: shk.c billable(&shkpp, obj, roomno, reset_nocharge):3451 — decide
// whether a shopkeeper thinks the item belongs to her.  Returns the shk (C's
// out-parameter) or null.
export function billable(shkp, obj, roomno, reset_nocharge) {
    if (!shkp) {
        if (!roomno) return null;
        shkp = shop_keeper(roomno);
        if (!shkp || !inhishop(shkp)) return null;
    }
    /* perhaps we threw it away earlier */
    if (onbill(obj, shkp) || (obj.oclass === FOOD_CLASS && obj.oeaten))
        return null;
    // An outer container marked no_charge can still hold chargeable contents;
    // only then does picking it up clear the flag.
    if (obj.no_charge) {
        if (!Has_contents(obj)
            || (contained_gold(obj, true) === 0
                && contained_cost(obj, shkp, 0, false, !reset_nocharge) === 0))
            shkp = null;
        if (reset_nocharge && !shkp && obj.oclass !== COIN_CLASS) {
            obj.no_charge = 0;
            if (Has_contents(obj)) picked_container(obj);
        }
    }
    return shkp || null;
}

// C ref: shknam.c saleable(shkp, obj) — does this shop deal in obj's class?
// A RANDOM_CLASS shop (the general store) takes everything.
export function saleable(shkp, obj) {
    const shp_indx = (shkp?.eshk?.shoptype ?? 0) - SHOPBASE;
    const shp = shtypes[shp_indx];
    if (!shp) return false;
    if (shp.symb === RANDOM_CLASS) return true;
    for (const ip of (shp.iprobs || [])) {
        if (!ip.iprob) break;
        if (ip.itype === VEGETARIAN_CLASS) {
            if (veggy_item(obj)) return true;
        } else if (ip.itype < 0 ? ip.itype === -obj.otyp
                                : ip.itype === obj.oclass) return true;
    }
    return false;
}

// C ref: mondata.h vegan(ptr) / vegetarian(ptr).
function vegan(ptr) {
    const c = ptr?.mcls, i = ptr?.pmidx;
    return c === S_BLOB || c === S_JELLY || c === S_FUNGUS || c === S_VORTEX
        || c === S_LIGHT
        || (c === S_ELEMENTAL && i !== PM_STALKER)
        || (c === S_GOLEM && i !== PM_FLESH_GOLEM && i !== PM_LEATHER_GOLEM)
        || c === S_GHOST; /* noncorporeal() */
}
function vegetarian(ptr) {
    return vegan(ptr) || (ptr?.mcls === S_PUDDING && ptr?.pmidx !== PM_BLACK_PUDDING);
}

// C ref: shknam.c veggy_item(obj, 0) — the object-mode call (shknam.js has a
// private type-only port, which stands PM_LICHEN in for tin/corpse contents;
// the object mode asks the real corpsenm instead).
function veggy_item(obj) {
    if (obj.oclass !== FOOD_CLASS) return false;
    if (objects[obj.otyp]?.material === VEGGY || obj.otyp === EGG) return true;
    if (obj.otyp === TIN && obj.corpsenm === NON_PM)
        return obj.spe === 1;   /* 0 = empty, 1 = spinach */
    if (obj.otyp === TIN || obj.otyp === CORPSE)
        return ismnum(obj.corpsenm) && vegetarian(monster_by_pmidx(obj.corpsenm));
    return false;
}

// C ref: objnam.c paydoname(obj) — the billing-style name: doname_base() with
// iflags.suppress_price set (the caller adds the billing price itself), plus
// the container wording.  suppress_price is honoured by shop_price_suffix()
// below, so this is only correct once doname() routes through that hook.
export async function paydoname(obj) {
    const { doname_invent } = await import('./invent.js');
    game.iflags = game.iflags || {};
    const save_cknown = obj.cknown, save_wizweight = game.iflags.wizweight;
    if (Has_contents(obj)) obj.cknown = 0;
    game.iflags.wizweight = false;
    game.iflags.suppress_price = (game.iflags.suppress_price || 0) + 1;
    let p = doname_invent(obj);
    game.iflags.suppress_price--;
    game.iflags.wizweight = save_wizweight;

    if (Has_contents(obj)) {
        // buy_container() sets no_charge on a just-purchased container so this
        // reads "a <container>" rather than "your <container>".
        if (!obj.no_charge) {
            if (p.startsWith('a ')) p = p.slice(2);
            else if (p.startsWith('an ')) p = p.slice(3);
            p = (obj.unpaid ? 'an unpaid ' : 'your ') + p;
        }
        if (!obj.cknown)
            p = obj.unpaid ? `${p} and its contents` : `the contents of ${p}`;
    }
    obj.cknown = save_cknown;
    return p;
}

// C ref: shk.c shk_names_obj(shkp, obj, fmt, amt, arg):3413 — "You bought a
// polished silver shield for 50 gold pieces."  The makeknown() here is a real
// state change: buying an ordinary weapon/armour/blank scroll from a shop that
// deals in it IDENTIFIES the type for the rest of the game.
export async function shk_names_obj(shkp, obj, fmt, amt, arg) {
    // update_topl(), not pline(): C's pline() ends in update_topl(), and the
    // NEED_MORE state it leaves is what puts the "--More--" between "You
    // bought ..." and the shk's "Thank you for shopping ..." verbalize.
    let was_unknown = !obj.dknown;

    observe_object(obj);
    // Real name for ordinary weapons/armour and spell-less scrolls/books
    // (blank and mail), but only within the shk's area of expertise.
    if (!objects[obj.otyp]?.oc_magic && saleable(shkp, obj)
        && (obj.oclass === WEAPON_CLASS || obj.oclass === ARMOR_CLASS
            || obj.oclass === SCROLL_CLASS || obj.oclass === SPBOOK_CLASS
            || obj.otyp === MIRROR)) {
        was_unknown = was_unknown || !objects[obj.otyp]?.oc_name_known;
        discover_object(obj.otyp, true, true, true); /* hack.h makeknown() */
    }
    let obj_name = await paydoname(obj);
    const plur = (n) => (n === 1 ? '' : 's');
    if (was_unknown) {
        // C: Sprintf(fmtbuf, "%%s; you %s", fmt) — the alternate phrasing used
        // when the transaction just revealed something.
        obj_name = obj_name.charAt(0).toUpperCase() + obj_name.slice(1);
        const body = fmt.replace('%s', (obj.quan ?? 1) > 1 ? 'them' : 'it')
            .replace('%ld', String(amt)).replace('%s', plur(amt))
            .replace('%s', arg);
        await update_topl(`${obj_name}; you ${body}`);
    } else {
        const body = fmt.replace('%s', obj_name)
            .replace('%ld', String(amt)).replace('%s', plur(amt))
            .replace('%s', arg);
        await update_topl(`You ${body}`);
    }
}

// ── the doname() suffix ──────────────────────────────────────────────────────

// C ref: objnam.c doname_base():1648-1682 — the shop-price suffix.  This is the
// whole point of the module: it is what the recorded screens actually SHOW.
//
//   is_unpaid(obj)          -> " (unpaid, N zorkmids)" / " (contents, N ...)"
//   with_price && price > 0 -> " (for sale, N zorkmids)" / " (contents, N ...)"
//   with_price && nochrg>0  -> " (no charge)"
//
// iflags.pricequotes (append_price_quote) is not modelled — see the deferred
// note; it is off by default and no recorded nethackrc turns it on.
export function shop_price_suffix(obj, with_price) {
    // C also skips while program_state.restoring; this port has no equivalent
    // flag and does not format objects during restore.
    if (!obj || game.iflags?.suppress_price) return '';
    if (is_unpaid(obj)) {
        const quoted = unpaid_cost(obj, COST_CONTENTS);
        return ` (${obj.unpaid ? 'unpaid' : 'contents'}, ${quoted} ${currency(quoted)})`;
    }
    if (with_price) {
        const { cost, nochrg } = get_cost_of_shop_item(obj);
        if (cost > 0) return ` (${nochrg ? 'contents' : 'for sale'}, ${cost} ${currency(cost)})`;
        if (nochrg > 0) return ' (no charge)';
    }
    return '';
}

// ── the shop bill: paying for it ─────────────────────────────────────────────
// C ref: shk.c:17-29.  The itemized-bill machinery dopay() runs on; the command
// itself and its "Pay for which items?" menu live in invent.js (they need the
// tty menu renderer).

export const PAY_BUY = 1, PAY_CANT = 0, PAY_SKIP = -1, PAY_BROKE = -2;

// C ref: shk.c enum billitem_status:22.  The ORDER is load-bearing:
// sortbill_cmp() splits the bill on `usedup <= PartlyUsedUp`.
export const FullyUsedUp = 1, PartlyUsedUp = 2, PartlyIntact = 3,
             FullyIntact = 4, KnownContainer = 5, UndisclosedContainer = 6;

const OBJ_ONBILL = 'onbill';
const PM_ROGUE = 8;                 // roles[].mnum

// C ref: shk.c:57 NOTANGRY(mon)/ANGRY(mon).
export const NOTANGRY = (mon) => !!mon.mpeaceful;
export const ANGRY = (mon) => !mon.mpeaceful;
// C ref: monst.h helpless(mon).
const helpless = (mon) => !!(mon.msleeping || !mon.mcanmove);
// C ref: shk.c:60 muteshk(shkp).  sounds.h MS_ANIMAL == 17.
const MS_ANIMAL = 17;
const muteshk = (shkp) => helpless(shkp) || (msound_of(shkp.data) ?? 99) <= MS_ANIMAL;
// C ref: youprop.h Deaf.
const Deaf = () => ((game.u?.uprops?.Deaf || 0) > 0)
                   || ((game.u?.uprops?.HDeaf || 0) > 0);
// C ref: shk.c Shknam(shkp) — shkname() with the first letter capitalised.
export function Shknam(shkp) {
    const s = shkname(shkp);
    return s.charAt(0).toUpperCase() + s.slice(1);
}
const s_suffix = (s) => (/s$/.test(s) ? `${s}'` : `${s}'s`);
const plur = (n) => (n === 1 ? '' : 's');
// C ref: pline.c verbalize() — the line wrapped in double quotes.
const verbalize = (line) => update_topl(`"${line}"`);
// C ref: monst.h DEADMONSTER(mon).
const DEADMONSTER = (mon) => !mon || (mon.mhp != null && mon.mhp < 1);
// C ref: pronoun.c noit_mhe/noit_mhim/noit_mhis — never "it" for a shopkeeper.
const noit_mhe = (m) => (m?.female ? 'she' : 'he');
const noit_mhim = (m) => (m?.female ? 'her' : 'him');
const noit_mhis = (m) => (m?.female ? 'her' : 'his');

// C ref: hack.c money_cnt(otmp) — the quan of the FIRST coin stack on the
// chain.  It stops there and does NOT descend into containers (that is
// hidden_gold()'s job); invent.js's private money_cnt() does both, so dopay()
// uses this one.
export function money_cnt_invent() {
    for (const o of (game.invent || []))
        if (o.oclass === COIN_CLASS) return o.quan || 0;
    return 0;
}

// C ref: invent.c hidden_gold(even_if_unknown) — gold inside carried containers.
export function hidden_gold(even_if_unknown) {
    let value = 0;
    for (const obj of (game.invent || []))
        if (Has_contents(obj) && (obj.cknown || even_if_unknown))
            value += contained_gold(obj, even_if_unknown);
    return value;
}

// C ref: shk.c bp_to_obj(bp) -> o_on(id, gb.billobjs) / find_oid(id).
// gb.billobjs (the chain holding FULLY used up billed items) is not modelled by
// this port, so a useup entry whose object is already gone resolves to null and
// make_itemized_bill() drops it rather than listing a phantom line.
function oid_scan(list, id, depth) {
    for (const o of (list || [])) {
        if (!o) continue;
        if (o.o_id === id) return o;
        if (depth < 8 && o.cobj?.length) {
            const r = oid_scan(o.cobj, id, depth + 1);
            if (r) return r;
        }
    }
    return null;
}
export function bp_to_obj(bp) {
    const id = bp?.bo_id;
    if (id == null) return null;
    let r = oid_scan(game.invent, id, 0);
    if (r) return r;
    for (const mon of (game.level?.monsters || [])) {
        r = oid_scan(mon.minvent, id, 0);
        if (r) return r;
    }
    return oid_scan(game.level?.objects, id, 0);
}

// C ref: shk.c next_shkp(shkp, withbill):215 — the shopkeeper scan, INCLUDING
// its side effect: an angry shk whose surcharge has not been applied yet is
// riled (which rewrites every bill price) merely by being enumerated.
export function shk_scan(withbill) {
    const out = [];
    for (const mon of (game.level?.monsters || [])) {
        if (DEADMONSTER(mon)) continue;
        if (!mon.isshk || !mon.eshk) continue;
        if (withbill && !mon.eshk.billct) continue;
        if (ANGRY(mon) && !mon.eshk.surcharge) rile_shk(mon);
        out.push(mon);
    }
    return out;
}

// C ref: shk.c rile_shk(shkp):1360 — anger + a 4/3 surcharge on every entry.
export function rile_shk(shkp) {
    shkp.mpeaceful = 0;
    const eshk = shkp.eshk;
    if (!eshk || eshk.surcharge) return;
    eshk.surcharge = 1;
    for (let ct = 0; ct < (eshk.billct || 0); ct++)
        eshk.bill[ct].price += Math.trunc((eshk.bill[ct].price + 2) / 3);
}

// C ref: shk.c pacify_shk(shkp, clear_surcharge):1344 — undo the 33% increase.
export function pacify_shk(shkp, clear_surcharge) {
    shkp.mpeaceful = 1;
    const eshk = shkp.eshk;
    if (!clear_surcharge || !eshk?.surcharge) return;
    eshk.surcharge = 0;
    for (let ct = 0; ct < (eshk.billct || 0); ct++)
        eshk.bill[ct].price -= Math.trunc((eshk.bill[ct].price + 3) / 4);
}

// C ref: shk.c rouse_shk(shkp, verbosely):1381 — greed-induced recovery.
export async function rouse_shk(shkp, verbosely) {
    if (!helpless(shkp)) return;
    const { canspotmon } = await import('./uhitm.js');
    if (verbosely && canspotmon(shkp))
        await update_topl(`${Shknam(shkp)} ${
            shkp.msleeping ? 'wakes up' : 'can move again'}.`);
    shkp.msleeping = 0;
    shkp.mfrozen = 0;
    shkp.mcanmove = 1;
}

// C ref: shk.c make_happy_shk(shkp, silentkops):1395.  The home_shk()/
// migrate_to_level() arms (a shk that has chased the hero off its own level)
// are NOT ported — relocating a drawn monster from here would move it on the
// map with no newsym; no covered session settles a bill with an absent shk.
// make_happy_shoppers()'s kops_gone()/pacify_guards() have no port either
// (the Keystone Kops are never spawned).
export async function make_happy_shk(shkp, _silentkops) {
    const wasmad = ANGRY(shkp);
    const eshkp = shkp.eshk;

    pacify_shk(shkp, false);
    if (eshkp) { eshkp.following = 0; eshkp.robbed = 0; }
    if ((game.urole?.mnum ?? -1) !== PM_ROGUE)
        adjalign(Math.sign(game.u?.ualign?.type || 0));
    if (inhishop(shkp) && wasmad)
        await update_topl(`${Shknam(shkp)} calms down.`);
}

// C ref: mkobj.c nextoid(oldobj, newobj):536 — pick the split stack's o_id so
// that it keeps the parent's price adjustment, then advance context.ident.
// The `(void) next_ident()` at the end is the rnd(2) that splitobj() spends.
function nextoid(oldobj, newobj) {
    let trylimit = 256;
    let oid = (game.context_ident ?? 2) - 1; /* loop increment reverses the -1 */
    const olddif = oid_price_adjustment(oldobj, oldobj.o_id);
    let newdif;
    do {
        ++oid;
        if (!oid) ++oid;
        newdif = oid_price_adjustment(newobj, oid);
    } while (newdif !== olddif && --trylimit >= 0);
    game.context_ident = oid;
    next_ident(); /* rnd(2) */
    return oid;
}

// C ref: shk.c money2mon(mon, amount):157 — hand `amount` gold to the monster.
// The splitobj() when the hero carries more than the price is the ONLY RNG the
// whole payment path spends (mkobj.c:521 next_ident's rnd(2), recorded at
// seed0002 step 359).
export async function money2mon(mon, amount) {
    const { freeinv } = await import('./invent.js');
    const { findgold } = await import('./steal.js');
    const ygold = findgold(game.invent);
    if (amount <= 0) return 0;
    if (!ygold || (ygold.quan || 0) < amount) return 0; /* C: impossible() */

    let give = ygold;
    if ((ygold.quan || 0) > amount) {
        // mkobj.c splitobj(): the new stack carries the split-off quantity and
        // leaves invent; the original keeps the remainder.
        give = { ...ygold, quan: amount, owornmask: 0, nobj: null,
                 cobj: undefined, oextra: undefined, timed: 0, lamplit: 0,
                 pickup_prev: 0 };
        give.o_id = nextoid(ygold, give);
        ygold.quan -= amount;
        ygold.owt = weight(ygold);
        give.owt = weight(give);
        game._goldCount = Math.max(0, (game._goldCount || 0) - amount);
    } else {
        if (ygold.owornmask) ygold.owornmask = 0; /* remove_worn_item: quiver */
        freeinv(ygold);
    }
    if (!mon.minvent) mon.minvent = [];
    mon.minvent.push(give);
    give.where = OBJ_MINVENT;
    give.ocarry = mon;
    return amount;
}

// C ref: shk.c money2u(mon, amount):185 — the shk hands gold back.  Only
// reachable from pay() with a negative balance (a credit refund).
async function money2u(mon, amount) {
    const { addinv } = await import('./invent.js');
    const { findgold } = await import('./steal.js');
    const mongold = findgold(mon.minvent);
    if (amount <= 0 || !mongold || (mongold.quan || 0) < amount) return;
    let give = mongold;
    if ((mongold.quan || 0) > amount) {
        give = { ...mongold, quan: amount, owornmask: 0, nobj: null };
        give.o_id = nextoid(mongold, give);
        mongold.quan -= amount;
    } else {
        mon.minvent.splice(mon.minvent.indexOf(mongold), 1);
    }
    give.where = OBJ_FREE;
    give.ocarry = null;
    addinv(give);
}

// C ref: shk.c check_credit(tmp, shkp):1276.
async function check_credit(tmp, shkp) {
    const credit = shkp.eshk.credit || 0;
    if (credit === 0) return tmp;
    if (credit >= tmp) {
        await update_topl('The price is deducted from your credit.');
        shkp.eshk.credit -= tmp;
        return 0;
    }
    await update_topl('The price is partially covered by your credit.');
    shkp.eshk.credit = 0;
    return tmp - credit;
}

// C ref: shk.c pay(tmp, shkp):1296.
export async function pay(tmp, shkp) {
    const robbed = shkp.eshk.robbed || 0;
    const balance = (tmp <= 0) ? tmp : await check_credit(tmp, shkp);
    if (balance > 0) await money2mon(shkp, balance);
    else if (balance < 0) await money2u(shkp, -balance);
    if (robbed) shkp.eshk.robbed = Math.max(0, robbed - tmp);
}

// C ref: shk.c insufficient_funds(shkp, item, cost):2454.  cost 0 asks "any
// gold at all?", cost > 0 asks "enough for this?"; the two give different
// feedback, which is why dopayobj() calls it twice.
export async function insufficient_funds(shkp, item, cost) {
    const umoney = money_cnt_invent(), ecredit = shkp.eshk.credit || 0;
    if (!cost && umoney + ecredit === 0) {
        const stashed = hidden_gold(true);
        await update_topl(`You ${stashed > 0 ? 'seem to ' : ''}have no gold or credit left.`);
        return true;
    }
    if (cost && umoney + ecredit < cost) {
        const stashed = hidden_gold(true);
        await update_topl(`You don't${stashed > 0 ? ' seem to' : ''} have gold${
            ecredit > 0 ? ' or credit' : ''} enough to pay for ${await paydoname(item)}.`);
        return true;
    }
    return false;
}

// C ref: shk.c reject_purchase(shkp, obj, intact_quan):2418 — the shk refuses
// to sell the intact half of a partly used stack.  C names the used-up half
// with simpleonames(); this port has no simpleonames(), so xname() stands in
// (it differs only for an artifact/named/charged item, which a partly used
// stack can't be).
async function reject_purchase(shkp, obj, intact_quan) {
    const { xname } = await import('./invent.js');
    const save_quan = obj.quan;
    obj.quan = intact_quan - save_quan;
    const which = save_quan > 1 ? 'these' : 'this one';
    const other = xname(obj);
    obj.quan = save_quan;
    if (!Deaf() && !muteshk(shkp)) {
        await verbalize(`${ANGRY(shkp) ? 'Pay' : 'Please pay'} for the other ${
            other} before buying ${which}.`);
    } else {
        await update_topl(`${Shknam(shkp)} ${ANGRY(shkp) ? 'angrily ' : ''}${
            'points out'} your bill for the other ${other} first.`);
    }
}

// C ref: shk.c sortbill_cmp(vptr1, vptr2):1497 — used-up entries first, then
// dearest first, then bill index as a stable tie-break.
function sortbill_cmp(sbi1, sbi2) {
    const used1 = sbi1.usedup <= PartlyUsedUp ? 1 : 0;
    const used2 = sbi2.usedup <= PartlyUsedUp ? 1 : 0;
    if (used1 !== used2) return used2 - used1;
    if (sbi1.cost !== sbi2.cost) return sbi2.cost - sbi1.cost;
    return sbi1.bidx - sbi2.bidx;
}

// C ref: shk.c cheapest_item(ibillct, ibill):1521.
export function cheapest_item(ibillct, ibill) {
    let gmin = ibill[0].cost;
    for (let i = 1; i < ibillct; ++i) if (ibill[i].cost < gmin) gmin = ibill[i].cost;
    return gmin;
}

// C ref: shk.c make_itemized_bill(shkp, &ibill):1545 — the augmented bill that
// hides container contents and splits a partly used stack into two entries.
export function make_itemized_bill(shkp) {
    const eshkp = shkp.eshk;
    const ebillct = eshkp.billct || 0;
    const ibill = [];

    for (let i = 0; i < ebillct; ++i) {
        const bp = eshkp.bill[i];
        let otmp = bp_to_obj(bp);
        if (!otmp) continue; /* C: impossible("Can't find shop bill entry") */
        let bidx = i;

        if ((otmp.quan || 0) === 0 || otmp.where === OBJ_ONBILL) {
            otmp.quan = bp.bquan;
            bp.useup = true;
        } else if ((otmp.quan || 0) < bp.bquan) {
            const upquan = bp.bquan - otmp.quan;
            ibill.push({ obj: otmp, quan: upquan, cost: bp.price * upquan,
                         bidx, usedup: PartlyUsedUp, queuedpay: false });
        }

        let quan, cost, used;
        if (otmp.where === OBJ_ONBILL) {
            quan = bp.bquan;
            cost = bp.price * quan;
            used = FullyUsedUp;
        } else if (otmp.where === OBJ_CONTAINED || Has_contents(otmp)) {
            const item = otmp;
            let cknown = true;
            for (let guard = 0; otmp.where === OBJ_CONTAINED && guard < 32; guard++) {
                const next = otmp.ocontainer || find_container_of(otmp);
                if (!next) break;
                otmp = next;
                if (!otmp.cknown) cknown = false;
            }
            let j = 0;
            for (; j < ibill.length; ++j) if (otmp === ibill[j].obj) break;
            if (j < ibill.length) {
                if (ibill[j].usedup === FullyIntact)
                    ibill[j].usedup = cknown ? KnownContainer : UndisclosedContainer;
                continue;
            }
            quan = 1;
            cost = unpaid_cost(otmp, COST_CONTENTS);
            if (!otmp.unpaid) bidx = -1;
            used = (otmp === item) ? FullyIntact
                   : cknown ? KnownContainer : UndisclosedContainer;
        } else {
            quan = otmp.quan;
            cost = bp.price * quan;
            used = (quan < bp.bquan) ? PartlyIntact : FullyIntact;
        }
        ibill.push({ obj: otmp, quan, cost, bidx, usedup: used, queuedpay: false });
    }

    // C qsorts; sortbill_cmp's bidx tie-break makes the order total, so the
    // JS sort's (unspecified) stability can't change the result.
    if (ibill.length > 1) ibill.sort(sortbill_cmp);
    return ibill;
}

// C ref: shk.c update_bill(indx, ibillct, ibill, eshkp, bp, paiditem):2168 —
// take a just-bought item off the shk's bill.
export function update_bill(indx, ibillct, ibill, eshkp, bp, paiditem) {
    if (indx >= 0 && ibill[indx].usedup === PartlyUsedUp) {
        /* only the used-up portion was paid for; the intact part stays billed */
        bp.bquan = paiditem.quan;
        for (let j = 0; j < ibillct; ++j)
            if (ibill[j].obj === paiditem && ibill[j].usedup === PartlyIntact) {
                ibill[j].usedup = FullyIntact;
                break;
            }
        return;
    }
    paiditem.unpaid = 0;
    if (paiditem.where === OBJ_ONBILL) paiditem.where = OBJ_FREE;
    const slot = eshkp.bill.indexOf(bp);
    const newebillct = (eshkp.billct || 0) - 1;
    eshkp.bill[slot] = eshkp.bill[newebillct];
    for (let j = 0; j < ibillct; ++j)
        if (ibill[j].bidx === newebillct) ibill[j].bidx = slot;
    eshkp.billct = newebillct;
}

// C ref: shk.c dopayobj(shkp, bp, obj, which, itemize, unseen):2220.
// which: 0 => used-up item, 1 => other (unpaid or lost).
export async function dopayobj(shkp, bp, obj, which, itemize, unseen) {
    const consumed = (which === 0);

    if (!obj.unpaid && !bp.useup
        && !(Has_contents(obj) && unpaid_cost(obj, COST_CONTENTS)))
        return PAY_BUY; /* C: impossible("Paid object on bill??") */
    if (itemize && await insufficient_funds(shkp, obj, 0)) return PAY_BROKE;

    const save_quan = obj.quan;
    let quan;
    if (consumed) {
        quan = bp.bquan;
        if (quan > obj.quan) quan -= obj.quan; /* difference is the used part */
    } else {
        quan = obj.quan;
    }
    const ltmp = bp.price * quan;

    obj.quan = quan;                    /* to be used by doname() */
    game.iflags = game.iflags || {};
    game.iflags.suppress_price = (game.iflags.suppress_price || 0) + 1;
    let buy = PAY_BUY;

    if (itemize) {
        // menustyle:traditional only.  C wraps the name in safe_qbuf(), whose
        // BUFSZ fallback ("that"/"those") this port does not reproduce.
        const { y_n } = await import('./display.js');
        const { doname_invent } = await import('./invent.js');
        const nm = doname_invent(obj);
        const qbuf = `${quan === 1 ? nm.charAt(0).toUpperCase() + nm.slice(1) : nm
            } for ${ltmp} ${currency(ltmp)}.  Pay?`;
        if (await y_n(qbuf) === 'n') buy = PAY_SKIP; /* don't want to buy */
    }

    if (quan < bp.bquan && !consumed) { /* partly used goods */
        await reject_purchase(shkp, obj, bp.bquan);
        buy = PAY_SKIP;
    }
    if (buy === PAY_BUY && await insufficient_funds(shkp, obj, ltmp))
        buy = itemize ? PAY_SKIP : PAY_CANT;

    if (buy === PAY_BUY) {
        await pay(ltmp, shkp);
        if (!unseen)
            await shk_names_obj(shkp, obj,
                consumed ? 'paid for %s at a cost of %ld gold piece%s.%s'
                         : 'bought %s for %ld gold piece%s.%s',
                ltmp, '');
    }

    obj.quan = save_quan;               /* restore original count */
    game.iflags.suppress_price--;
    return buy;
}

// C ref: shk.c dopay():1970 tail — the shk's thank-you after a paid bill.
export async function shk_thank_you(shkp) {
    const eshkp = shkp.eshk;
    const shopname = shtypes[(eshkp.shoptype || SHOPBASE) - SHOPBASE]?.name || 'store';
    const bang = !eshkp.surcharge ? '!' : '.';
    if (!Deaf() && !muteshk(shkp)) {
        await verbalize(`Thank you for shopping in ${s_suffix(shkname(shkp))} ${shopname}${bang}`);
    } else {
        await update_topl(`${Shknam(shkp)} nods${!eshkp.surcharge ? ' appreciatively' : ''
            } at you for shopping in ${noit_mhis(shkp)} ${shopname}${bang}`);
    }
}

// C ref: shk.c dopay():1858 — a shk still asleep/paralyzed after rouse_shk().
export async function shk_napping_msg(shkp) {
    await update_topl(`${Shknam(shkp)} ${
        rn2(2) ? 'seems to be napping' : "doesn't respond"}.`);
}

// C ref: shk.c dopay():1868-1893 — settling a robbery debt with a shk who is
// not the resident of the shop the hero is standing in.
export async function pay_robbed_debt(shkp, ltmp, stashed_gold) {
    const umoney = money_cnt_invent();
    if (!ltmp) {
        await update_topl(`You do not owe ${shkname(shkp)} anything.`);
    } else if (!umoney) {
        await update_topl(`You ${stashed_gold ? 'seem to ' : ''}have no gold.`);
        if (stashed_gold) await update_topl('But you have some gold stashed away.');
    } else {
        if (umoney > ltmp) {
            await update_topl(`You give ${shkname(shkp)} the ${ltmp} gold piece${
                plur(ltmp)} ${noit_mhe(shkp)} asked for.`);
            await pay(ltmp, shkp);
        } else {
            await update_topl(`You give ${shkname(shkp)} all your${
                stashed_gold ? ' openly kept' : ''} gold.`);
            await pay(umoney, shkp);
            if (stashed_gold) await update_topl('But you have hidden gold!');
        }
        if ((umoney < ltmp / 2) || (umoney < ltmp && stashed_gold))
            await update_topl(`Unfortunately, ${noit_mhe(shkp)} doesn't look satisfied.`);
        else
            await make_happy_shk(shkp, false);
    }
}

// C ref: shk.c:1489 no_money[] / not_enough_money[].
export const no_money = (stashed) => `Moreover, you${stashed ? ' seem to' : ''} have no gold.`;
export const not_enough_money = (shkp) =>
    `Besides, you don't have enough to interest ${noit_mhim(shkp)}.`;

export { helpless, muteshk, Deaf, verbalize, plur, noit_mhe, noit_mhim, noit_mhis };
