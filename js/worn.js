// worn.js -- Equipment slot management and monster armor mechanics
// cf. worn.c — setworn/setnotworn, monster armor AI, bypass bits, extrinsics
//
// Data model: The `worn[]` table maps wornmask bits to hero slot pointers
// (uarm, uarmc, uarmh, uarms, uarmg, uarmf, uarmu, uleft, uright, uwep,
//  uswapwep, uquiver, uamul, ublindf, uball, uchain). Each item has an
// `owornmask` field recording which slots it occupies. Monsters use
// `misc_worn_check` (bitmask) + `obj.owornmask` on minvent items instead.
// Wornmask constants: W_ARM=suit, W_ARMC=cloak, W_ARMH=helm, W_ARMS=shield,
//   W_ARMG=gloves, W_ARMF=boots, W_ARMU=shirt, W_AMUL=amulet,
//   W_RINGL/W_RINGR=rings, W_WEP=weapon, W_SWAPWEP=alt-weapon,
//   W_QUIVER=quiver, W_TOOL=blindfold/towel/lenses, W_SADDLE=saddle,
//   W_BALL=ball, W_CHAIN=chain.
// Partial JS implementation: owornmask/misc_worn_check used in u_init.js:299,339
//   for Knight's pony saddle. No worn.c functions exist in JS yet.
// bypass bits (obj.bypass + context.bypasses): used for object iteration
//   control during multiple-drop and polymorph. Not implemented in JS.

// cf. worn.c:50 — recalc_telepat_range(): recompute hero's unblind telepathy radius
// Counts worn items with oc_oprop==TELEPAT; sets u.unblind_telepat_range.
// range = (BOLT_LIM^2) * count; -1 if no telepathy items worn.
// TODO: worn.c:50 — recalc_telepat_range(): telepathy range from worn items

// cf. worn.c:73 — setworn(obj, mask): equip obj into slot(s) indicated by mask
// Unequips previous item in each slot (clears extrinsics, artifact intrinsics,
//   cancel_doff); sets new item (sets owornmask, grants extrinsics/artifact bonuses).
// Special case: W_ARM|I_SPECIAL = embedded dragon scales (uskin).
// Calls update_inventory() and recalc_telepat_range() at end.
// Also clears nudist roleplay flag and updates tux_penalty.
// TODO: worn.c:73 — setworn(): equip item into hero's slot

// cf. worn.c:147 — setnotworn(obj): force-remove obj from being worn
// Clears owornmask bits, updates u.uprops extrinsics, artifact intrinsics,
//   blocked properties. Calls cancel_doff, update_inventory, recalc_telepat_range.
// Used when object is destroyed while worn.
// TODO: worn.c:147 — setnotworn(): force-unwear item (e.g. item destroyed)

// cf. worn.c:180 — allunworn(): clear all hero worn-slot pointers
// Clears uarm/uarmc/... etc. without updating extrinsics (called after
//   inventory is freed during game save). Sets u.twoweap=0.
// TODO: worn.c:180 — allunworn(): clear all worn pointers (save cleanup)

// cf. worn.c:198 — wearmask_to_obj(wornmask): return item worn in given slot
// Scans worn[] table for matching mask, returns *wp->w_obj (may be null).
// Used by poly_obj() to find items being worn.
// TODO: worn.c:198 — wearmask_to_obj(): look up hero's worn item by mask

// cf. worn.c:210 — wornmask_to_armcat(mask): convert wornmask bit to ARM_* category
// Returns one of ARM_SUIT, ARM_CLOAK, ARM_HELM, ARM_SHIELD, ARM_GLOVES,
//   ARM_BOOTS, ARM_SHIRT; returns 0 if not an armor slot.
// TODO: worn.c:210 — wornmask_to_armcat(): wornmask → armor category

// cf. worn.c:242 — armcat_to_wornmask(cat): convert ARM_* category to wornmask bit
// Inverse of wornmask_to_armcat(). Returns the W_ARM* constant for the category.
// TODO: worn.c:242 — armcat_to_wornmask(): armor category → wornmask

// cf. worn.c:274 — wearslot(obj): return bitmask of slots this item can occupy
// Handles AMULET_CLASS, RING_CLASS, ARMOR_CLASS (by armcat), WEAPON_CLASS,
//   TOOL_CLASS (blindfold/towel/lenses → W_TOOL; weptools → W_WEP|W_SWAPWEP;
//   saddle → W_SADDLE), FOOD_CLASS (meat_ring → ring slots),
//   GEM_CLASS (quiver), BALL_CLASS, CHAIN_CLASS.
// TODO: worn.c:274 — wearslot(): determine valid wear slots for an object

// cf. worn.c:347 — check_wornmask_slots(): sanity check hero's worn slots
// Verifies each worn slot: item in inventory, owornmask bit set correctly,
//   no other inventory item claims same slot. EXTRA_SANITY_CHECKS adds
//   uskin/dragon-scales and u.twoweap consistency checks.
// Not needed for JS gameplay; debug only.
// TODO: worn.c:347 — check_wornmask_slots(): worn slot sanity check (debug)

// cf. worn.c:466 — mon_set_minvis(mon): set monster to permanently invisible
// Sets mon->perminvis=1 and mon->minvis=1 (if not invis_blkd);
//   calls newsym() and see_wsegs() for worms.
// TODO: worn.c:466 — mon_set_minvis(): make monster permanently invisible

// cf. worn.c:478 — mon_adjust_speed(mon, adjust, obj): change monster's speed
// adjust: +2=set MFAST (silent), +1=increase, 0=recheck boots, -1=decrease,
//   -2=set MSLOW (silent), -3=petrify (reduce fast), -4=green slime (reduce fast, silent).
// Checks minvent for speed boots to override permspeed; prints message if visible.
// Referenced in mon.js comments (line 8).
// TODO: worn.c:478 — mon_adjust_speed(): monster speed adjustment

// cf. worn.c:569 — update_mon_extrinsics(mon, obj, on, silently): update monster's
// resistances/properties when armor is worn or removed.
// Handles INVIS (minvis), FAST (calls mon_adjust_speed), ANTIMAGIC/REFLECTING/
//   PROTECTION (handled elsewhere), others via mextrinsics bitmask.
// On removal: checks remaining worn gear for redundant property sources.
// Also handles w_blocks() for INVIS-blocking (mummy wrapping).
// Referenced in steal.js for put_saddle_on_mon context.
// TODO: worn.c:569 — update_mon_extrinsics(): monster property update on equip

// cf. worn.c:707 — find_mac(mon): calculate monster's effective armor class
// Starts from mon->data->ac; subtracts ARM_BONUS for each worn item
//   (including amulet of guarding at -2 fixed); caps at ±AC_MAX.
// Referenced in combat.js:267 as needed for hit calculations.
// TODO: worn.c:707 — find_mac(): monster armor class calculation

// cf. worn.c:747 — m_dowear(mon, creation): monster equips best available armor
// Skips verysmall/nohands/animal/mindless monsters (with mummy/skeleton exception).
// Calls m_dowear_type() for each slot in order: amulet, shirt, cloak, helm,
//   shield, gloves, boots, suit. Skips shield if wielding two-handed weapon.
// TODO: worn.c:747 — m_dowear(): monster armor-equipping AI

// cf. worn.c:789 [static] — m_dowear_type(mon, flag, creation, racialexception):
// Find and equip the best item for one armor slot.
// Compares ARM_BONUS + extra_pref for all candidates; handles autocurse
//   (dunce cap/opposite alignment helm), delays, cloak-under-suit timing.
// Calls update_mon_extrinsics() for old and new item.
// TODO: worn.c:789 — m_dowear_type(): monster equips one armor slot

// cf. worn.c:996 — which_armor(mon, flag): return item in a monster's armor slot
// For hero (&youmonst): returns uarm/uarmc/etc. by switch.
// For monsters: scans minvent for obj->owornmask & flag.
// TODO: worn.c:996 — which_armor(): get worn item for given slot/monster

// cf. worn.c:1029 [static] — m_lose_armor(mon, obj, polyspot): drop monster's armor
// Calls extract_from_minvent(), place_object(), optionally bypass_obj(),
//   and newsym().
// TODO: worn.c:1029 — m_lose_armor(): remove armor from monster and drop on floor

// cf. worn.c:1044 [static] — clear_bypass(objchn): recursively clear bypass bits
// Clears obj->bypass=0 on entire chain; recurses into container contents.
// TODO: worn.c:1044 — clear_bypass(): recursive bypass-bit clear on object chain

// cf. worn.c:1060 — clear_bypasses(): clear bypass bits on all object chains
// Clears fobj, invent, migrating_objs, buriedobjlist, billobjs, objs_deleted,
//   all monster minvents (and resets MCORPSENM for polymorph-worm tracking),
//   migrating_mons, mydogs, uball, uchain. Also called for worm polymorph bypass.
// TODO: worn.c:1060 — clear_bypasses(): global bypass-bit reset

// cf. worn.c:1109 — bypass_obj(obj): set bypass bit on one object
// Sets obj->bypass=1 and context.bypasses=TRUE.
// TODO: worn.c:1109 — bypass_obj(): mark single object as bypassed

// cf. worn.c:1117 — bypass_objlist(objchain, on): set/clear bypass bits on chain
// Sets or clears bypass bit for every object in the chain.
// TODO: worn.c:1117 — bypass_objlist(): bulk bypass-bit operation on chain

// cf. worn.c:1132 — nxt_unbypassed_obj(objchain): iterate objects skipping bypassed ones
// Returns first non-bypassed object; sets its bypass bit before returning
//   so successive calls advance through the list.
// TODO: worn.c:1132 — nxt_unbypassed_obj(): bypass-aware object iteration

// cf. worn.c:1149 — nxt_unbypassed_loot(lootarray, listhead): same for sortloot arrays
// Like nxt_unbypassed_obj() but for Loot arrays (which may have stale pointers).
// Validates that obj still exists in listhead before returning it.
// TODO: worn.c:1149 — nxt_unbypassed_loot(): bypass-aware loot array iteration

// cf. worn.c:1167 — mon_break_armor(mon, polyspot): remove/destroy armor on polymorph
// If breakarm (too big): destroys suit, cloak, shirt with cracking/ripping sounds.
// If sliparm (too small/whirly): drops suit, cloak, shirt.
// If handless_or_tiny: drops gloves, shield.
// If has_horns: drops non-flimsy helm.
// If slithy/centaur/tiny: drops boots.
// If can_saddle fails: drops saddle; may call dismount_steed(DISMOUNT_FELL).
// TODO: worn.c:1167 — mon_break_armor(): armor removal/destruction on polymorph

// cf. worn.c:1328 [static] — extra_pref(mon, obj): monster's preference bonus for armor
// Currently only: SPEED_BOOTS when mon->permspeed != MFAST → return 20.
// Used by m_dowear_type() to bias monster selection toward special armor.
// TODO: worn.c:1328 — extra_pref(): armor preference bonus for monster AI

// cf. worn.c:1350 — racial_exception(mon, obj): race-based armor exceptions
// Returns 1 (acceptable) if hobbit + elven armor (LoTR exception).
// Returns -1 (unacceptable) for future race+object bans; 0 for no exception.
// TODO: worn.c:1350 — racial_exception(): race-specific armor compatibility

// cf. worn.c:1367 — extract_from_minvent(mon, obj, do_extrinsics, silently):
// Remove an object from monster's inventory with full cleanup.
// Handles artifact_light (end_burn if W_ARM lit item), obj_extract_self(),
//   update_mon_extrinsics (if worn and do_extrinsics), misc_worn_check update,
//   check_gear_next_turn(), obj_no_longer_held(), mwepgone() if weapon.
// TODO: worn.c:1367 — extract_from_minvent(): remove object from monster inventory

// ============================================================================
// Wornmask constants — cf. prop.h
// ============================================================================
export const W_ARM  = 0x00000001;  // Body armor (suit)
export const W_ARMC = 0x00000002;  // Cloak
export const W_ARMH = 0x00000004;  // Helmet/hat
export const W_ARMS = 0x00000008;  // Shield
export const W_ARMG = 0x00000010;  // Gloves/gauntlets
export const W_ARMF = 0x00000020;  // Footwear (boots)
export const W_ARMU = 0x00000040;  // Undershirt
export const W_WEP  = 0x00000100;  // Wielded weapon
export const W_AMUL = 0x00010000;  // Amulet
export const W_SADDLE = 0x00100000; // Saddle (riding)

// Armor category constants — cf. objclass.h
const ARM_SUIT   = 0;
const ARM_SHIELD = 1;
const ARM_HELM   = 2;
const ARM_GLOVES = 3;
const ARM_BOOTS  = 4;
const ARM_CLOAK  = 5;
const ARM_SHIRT  = 6;

// armcat → wornmask mapping
const ARMCAT_TO_MASK = {
    [ARM_SUIT]:   W_ARM,
    [ARM_SHIELD]: W_ARMS,
    [ARM_HELM]:   W_ARMH,
    [ARM_GLOVES]: W_ARMG,
    [ARM_BOOTS]:  W_ARMF,
    [ARM_CLOAK]:  W_ARMC,
    [ARM_SHIRT]:  W_ARMU,
};

import { objectData, ARMOR_CLASS, AMULET_CLASS } from './objects.js';
import { nohands, is_animal, is_mindless, cantweararm, slithy, has_horns, is_humanoid } from './mondata.js';
import { S_MUMMY, S_CENTAUR } from './symbols.js';
import { PM_SKELETON, MZ_SMALL, MZ_HUMAN } from './monsters.js';

// ============================================================================
// ARM_BONUS — cf. hack.h:1531
// ============================================================================
function arm_bonus(obj) {
    if (!obj) return 0;
    const od = objectData[obj.otyp];
    if (!od) return 0;
    const baseAc = Number(od.oc1 || 0);  // a_ac
    const spe = Number(obj.spe || 0);
    const erosion = Math.max(Number(obj.oeroded || 0), Number(obj.oeroded2 || 0));
    return baseAc + spe - Math.min(erosion, baseAc);
}

// ============================================================================
// find_mac — cf. worn.c:707
// ============================================================================
// Calculate monster's effective armor class accounting for worn armor.
export function find_mac(mon) {
    const ptr = mon.type || {};
    let base = ptr.ac ?? 10;
    const mwflags = mon.misc_worn_check || 0;

    if (mwflags) {
        for (const obj of (mon.minvent || [])) {
            if ((obj.owornmask || 0) & mwflags) {
                if (obj.otyp !== undefined) {
                    const od = objectData[obj.otyp];
                    // AMULET_OF_GUARDING gives fixed -2
                    if (od && od.name === 'amulet of guarding') {
                        base -= 2;
                    } else {
                        base -= arm_bonus(obj);
                    }
                }
            }
        }
    }

    // Cap at ±AC_MAX (same as hero, AC_MAX = 127 in C)
    if (Math.abs(base) > 127) base = Math.sign(base) * 127;
    return base;
}

// ============================================================================
// which_armor — cf. worn.c:996
// ============================================================================
// Return the item a monster is wearing in a given slot (wornmask flag).
export function which_armor(mon, flag) {
    for (const obj of (mon.minvent || [])) {
        if ((obj.owornmask || 0) & flag) return obj;
    }
    return null;
}

// ============================================================================
// m_dowear — cf. worn.c:747
// ============================================================================
// Monster equips best available armor. During creation (creation=TRUE),
// this is instant with no messages or delays.
export function m_dowear(mon, creation) {
    const ptr = mon.type || {};
    // Guards: verysmall, nohands, animal skip entirely
    if ((ptr.size || 0) < MZ_SMALL || nohands(ptr) || is_animal(ptr))
        return;
    // Mindless skip unless mummy or skeleton at creation
    if (is_mindless(ptr)
        && (!creation || (ptr.symbol !== S_MUMMY
                          && mon.mndx !== PM_SKELETON)))
        return;

    m_dowear_type(mon, W_AMUL, creation);
    const can_wear_armor = !cantweararm(ptr);
    // Can't put on shirt if already wearing suit
    if (can_wear_armor && !(mon.misc_worn_check & W_ARM))
        m_dowear_type(mon, W_ARMU, creation);
    // C ref: can_wear_armor || WrappingAllowed(mon->data)
    // WrappingAllowed: humanoid, MZ_SMALL..MZ_HUGE, not centaur, corporeal
    if (can_wear_armor || is_humanoid(ptr))
        m_dowear_type(mon, W_ARMC, creation);
    m_dowear_type(mon, W_ARMH, creation);
    // Skip shield if wielding two-handed weapon (simplified: always allow)
    m_dowear_type(mon, W_ARMS, creation);
    m_dowear_type(mon, W_ARMG, creation);
    if (!slithy(ptr) && ptr.symbol !== S_CENTAUR)
        m_dowear_type(mon, W_ARMF, creation);
    if (can_wear_armor)
        m_dowear_type(mon, W_ARM, creation);
}

// ============================================================================
// m_dowear_type — cf. worn.c:789 (simplified for creation=TRUE)
// ============================================================================
function m_dowear_type(mon, flag, creation) {
    if (mon.mfrozen) return;

    const old = which_armor(mon, flag);
    if (old && old.cursed) return;
    let best = old;

    for (const obj of (mon.minvent || [])) {
        const od = objectData[obj.otyp];
        if (!od) continue;

        // Check if this item fits the slot
        if (flag === W_AMUL) {
            if (od.oc_class !== AMULET_CLASS) continue;
            // Only life-saving, reflection, and guarding
            if (od.name !== 'amulet of life saving'
                && od.name !== 'amulet of reflection'
                && od.name !== 'amulet of guarding') continue;
            if (!best || od.name !== 'amulet of guarding') {
                best = obj;
                if (od.name !== 'amulet of guarding') break; // life-saving/reflection: use immediately
            }
            continue;
        }

        if (od.oc_class !== ARMOR_CLASS) continue;
        const armcat = od.sub;

        switch (flag) {
        case W_ARMU: if (armcat !== ARM_SHIRT) continue; break;
        case W_ARMC: if (armcat !== ARM_CLOAK) continue; break;
        case W_ARMH:
            if (armcat !== ARM_HELM) continue;
            // Horned monsters can only wear flimsy helms (material <= LEATHER=7)
            if (has_horns(mon.type) && (od.material || 0) > 7)
                continue;
            break;
        case W_ARMS: if (armcat !== ARM_SHIELD) continue; break;
        case W_ARMG: if (armcat !== ARM_GLOVES) continue; break;
        case W_ARMF: if (armcat !== ARM_BOOTS) continue; break;
        case W_ARM:  if (armcat !== ARM_SUIT) continue; break;
        default: continue;
        }

        if (obj.owornmask) continue; // already worn in another slot

        if (best && arm_bonus(best) >= arm_bonus(obj)) continue;
        best = obj;
    }

    if (!best || best === old) return;

    // Equip the item
    if (old) {
        old.owornmask &= ~flag;
        mon.misc_worn_check &= ~flag;
    }
    mon.misc_worn_check |= flag;
    best.owornmask = (best.owornmask || 0) | flag;
}
