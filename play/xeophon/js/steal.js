// steal.js — Port of NetHack 5.0 src/steal.c (monster theft from the hero).
//
// C references use paths under nethack-c/upstream:
//   src/steal.c, src/uhitm.c (mhitm_ad_sedu/ssex/samu/sgld callers),
//   src/mhitu.c (doseduce/unresponsive context), src/monmove.c (monflee),
//   src/teleport.c (rloc), src/mon.c (thiefdead at mondead/mon.c:2783),
//   src/mksobj.c/mkobj.c (add_to_minv), include/monattk.h (AD_* codes),
//   include/monsters.h (SITM/SSED: wood/water/mountain nymph 702-723,
//   monkey 2372-2379).
//
// Data-model adapters (JS has no linked obj chains / owornmask bitmask):
//   * hero inventory is `game.inventory` (array in letter order); item
//     presentation fields (`line`, `worn`, `wielded`, `alternate`, `cls`,
//     `kind`/`actualKind`, `otyp`, `quan`) stand in for owornmask tests.
//     Slot regexes mirror the long-standing JS classifiers used by cmd.js
//     (armorSlot)/allmain.js, which in turn model C's do_wear.c slots.
//   * gs.stealoid/gs.stealmid/ga.afternmv map to game._stealoid /
//     game._stealmid / game._steal_after_mv (no JS gm.multi scheduler yet;
//     the seduction armor-strip multi-turn flow is exported but unwired —
//     see docs/c-parity-audit/950-steal-theft-2026-07-31.md).
//
// RNG-parity notes:
//   * rn2/rnd/rn1/d each consume exactly one ISAAC64 draw per call
//     (src/rnd.c), so call *arity and order* here must match C exactly.
//   * steal() on the covered non-monkey, non-adornment path consumes
//     exactly one draw: the weighted-slot pick rn2(tmp) at steal.c:421.
//     Verified against recorded RNG traces
//     ("rn2(21) @ steal(steal.c:421)", "rn2(23) @ steal(steal.c:421)").
//   * The not-exercised branches reproduce C's extra draws in-order:
//     Punished rn2(4) (steal.c:347), buried-ball !rn2(4) (steal.c:355),
//     monkey/boulder cant_take: rn2(4) verb ROLL_FROM (steal.c:434) then
//     flee check rn2(inv_cnt/5+2) (steal.c:441), boulder retry re-roll
//     (steal.c:402-405). rloc/teleport draws after a successful theft are
//     the caller's (mhitm_ad_sedu uhitm.c:4673-4700 -> teleport.c:1850).

import { game } from './gstate.js';
import { rn2, rnd, rn1 } from './rng.js';
import { add_to_minv } from './mklev.js';

// C ref: include/objects.h enum + objects.c rocks section: BOULDER otyp.
export const BOULDER_OTYP = 465;

// C ref: include/global.h / config.h LARGEST_INT == 0x7fffffff.
const LARGEST_INT = 2147483647;
// C ref: steal.c:401/427/438 — worn armor/accessory theft weight.
export const STEAL_WORN_WEIGHT = 5;
// Monkey "tries to <verb>" word list (steal.c:432-433, ROLL_FROM(how)).
export const CANT_TAKE_VERBS = ['steal', 'snatch', 'grab', 'take'];

// ---------------------------------------------------------------------------
// somegold() — proportional subset of gold (steal.c:12-41)
// ---------------------------------------------------------------------------
export function somegold(lmoney) {
    let igold = lmoney >= LARGEST_INT ? LARGEST_INT : Math.trunc(lmoney);
    if (igold < 50) {
        ; // all gold
    } else if (igold < 100) {
        igold = rn1(igold - 25 + 1, 25);
    } else if (igold < 500) {
        igold = rn1(igold - 50 + 1, 50);
    } else if (igold < 1000) {
        igold = rn1(igold - 100 + 1, 100);
    } else if (igold < 5000) {
        igold = rn1(igold - 500 + 1, 500);
    } else if (igold < 10000) {
        igold = rn1(igold - 1000 + 1, 1000);
    } else {
        igold = rn1(igold - 5000 + 1, 5000);
    }
    return igold;
}

// ---------------------------------------------------------------------------
// findgold() — first gold object in a chain (steal.c:48-56)
// JS chain: an array of items; gold has cls 'coin' / glyph '$'.
// ---------------------------------------------------------------------------
export function findgold(items) {
    return (items || []).find(item =>
        item.cls === 'coin' || item.glyph === '$' || item.otyp === 'GOLD_PIECE') || null;
}

// ---------------------------------------------------------------------------
// unresponsive() — hero can't react to seduction (steal.c:118-126)
// C: gm.multi >= 0 → responsive; else unconscious||fainted||frozen||paralyzed.
// JS has no gm.multi; game.u carries status flags set by the slices that own
// paralysis/unconsciousness.  Treated as responsive unless a tracker exists.
// ---------------------------------------------------------------------------
export function unresponsive(g = game) {
    const u = g.u || {};
    const gmMulti = g.multi ?? u.multi; // gm.multi, C steal.c:121
    if (gmMulti == null || gmMulti >= 0) return false;
    const multiReason = String(g.multi_reason || u.multi_reason || '');
    return !!(u.unconscious || g.unconscious || u.fainted || g.fainted || u.sleeping /* fainted via sleep */
        || /^frozen/.test(multiReason) || /^paralyzed/.test(multiReason));
}

// ---------------------------------------------------------------------------
// invCnt — inv_cnt(include_gold) port (steal.c:338/374-375; invent.c)
// ---------------------------------------------------------------------------
export function invCnt(items = game.inventory || [], includeGold = false) {
    return (items || []).filter(item => item.cls !== 'coin').length
        + (includeGold ? (items || []).filter(item => item.cls === 'coin').length : 0);
}

// money_cnt(invent) — invent.c money_cnt() analogue for stealgold.
export function moneyCnt(items = game.inventory || []) {
    return (items || []).reduce((sum, item) =>
        item.cls === 'coin' ? sum + (item.quan || 1) : sum, 0);
}

// ---------------------------------------------------------------------------
// Worn-slot classification adapters (JS presentation fields <-> C owornmask).
// Regexes mirror the classifiers that cmd.js (armorSlot/wornGlovesItem) and
// allmain.js have used since the armor slices; C refs: do_wear.c slot model
// (W_ARMC/W_ARM/W_ARMU/W_ARMG/W_ARMH/W_ARMF/W_ARMS) and steal.c:427-466.
// ---------------------------------------------------------------------------
export function wornEntryTest(item) {
    return !!(item.worn || (typeof item.line === 'string' && item.line.includes('being worn')));
}

export function wornGlovesIn(items) {
    return (items || []).find(item =>
        item.cls === 'armor' && wornEntryTest(item)
        && /gloves|gauntlets/i.test(itemDisplayName(item))) || null;
}

export function wornCloakIn(items) {
    return (items || []).find(item =>
        item.cls === 'armor' && wornEntryTest(item)
        && /cloak|robe|wrapping|smock|apron/i.test(itemDisplayName(item))) || null;
}

export function wornSuitIn(items) {
    return (items || []).find(item =>
        item.cls === 'armor' && wornEntryTest(item)
        && /mail|armor|dragon scales|plate|shirt/i.test(itemDisplayName(item))
        && !/cloak|robe|wrapping|smock|apron/i.test(itemDisplayName(item))) || null;
}

export function wornShirtIn(items) {
    return (items || []).find(item =>
        item.cls === 'armor' && wornEntryTest(item)
        && /shirt/i.test(itemDisplayName(item))) || null;
}

export function wieldedWeaponIn(items) {
    return (items || []).find(item =>
        item.wielded || item.line?.includes('weapon in') || item.line?.includes('wielded in')) || null;
}

export function wornRingIn(items, side = null) {
    return (items || []).find(item =>
        (item.cls === 'ring' || item.glyph === '=')
        && (item.worn || /\(on (?:left|right) hand\)/.test(String(item.line || '')))
        && (!side || item.worn === side
            || String(item.line || '').includes(`(on ${side} hand)`))) || null;
}

export function isWornArmorOrAccessory(item) {
    return (item.worn || item.line?.includes('being worn')
            || /\(on (?:left|right) hand\)/.test(item.line || ''))
        && !(item.wielded || item.alternate || item.cls === 'weapon');
}

// Display name without the "x - " letter prefix and wear/wield suffixes,
// matching inventoryItemName() in cmd.js (kept local to avoid a cycle).
export function itemDisplayName(item) {
    return String(item.line || item.name || item.kind || item.actualKind || '')
        .replace(/^[a-zA-Z$] - /, '')
        .replace(/ \((?:weapon|wielded|alternate weapon|being worn|at the ready|in quiver|on .* hand).*$/, '');
}

// ---------------------------------------------------------------------------
// selectStealTarget — port of the steal() item-selection core
// (steal.c:380-466).  Consumes RNG exactly as C does:
//   * Adornment ring fast path (steal.c:383-389): no draw.
//   * Weighted pick: one rn2(total) per retry round (steal.c:421);
//     boulder rejection retriggers the loop at most once (steal.c:402-405).
// Returns { target, totalWeight, weights, boulderReject } or
//   { nothing: true } when the hero has nothing worth stealing, or
//   { cantTake: item } when the (single) retry still hit a boulder.
// ---------------------------------------------------------------------------
export function selectStealTarget(items, {
    monkeyBusiness = false,
    throwsRocks = false,
    stealoid = 0,
    adornedLeft = null,
    adornedRight = null,
} = {}) {
    const inventory = [...(items || [])]
        .sort((a, b) => stealLetterRank(a) - stealLetterRank(b));
    const gloves = wornGlovesIn(inventory);
    const cloak = wornCloakIn(inventory);
    const suit = wornSuitIn(inventory);
    const shirt = wornShirtIn(inventory);
    const weapon = wieldedWeaponIn(inventory);

    // steal.c:382-389 — skipping ring special cases when monkey or gloves;
    // Adornment fast path targets the adornment ring directly (no RNG).
    if (!monkeyBusiness && !gloves) {
        if (adornedLeft) return { target: adornedLeft, viaAdornment: true };
        if (adornedRight) return { target: adornedRight, viaAdornment: true };
    }

    let target = null, totalWeight = 0, weights = null, boulderReject = false;
    for (let retry = 0; retry < 2; retry++) {
        // retry: steal.c:390-401
        totalWeight = 0;
        weights = [];
        for (const item of inventory) {
            if (suit && item === cloak) continue; // (!uarm || otmp != uarmc)
            if (item.cls === 'coin') continue;    // oclass != COIN_CLASS
            const weight = isWornArmorOrAccessory(item) ? STEAL_WORN_WEIGHT : 1;
            totalWeight += weight;
            weights.push({ item, weight });
        }
        if (!totalWeight) return { nothing: true };
        // steal.c:412-426 — weighted pick
        let pick = rn2(totalWeight);
        target = weights[weights.length - 1].item;
        for (const entry of weights) {
            pick -= entry.weight;
            if (pick < 0) { target = entry.item; break; }
        }
        // steal.c:427-430-valued target; stealoid check is the caller's.
        // steal.c:438-439 — can't steal ring(s) while wearing gloves
        if ((itemIsRing(target) || /\(on (?:left|right) hand\)/.test(target.line || '')) && gloves)
            target = gloves;
        // steal.c:441-442 — gloves under wielded weapon -> steal the weapon
        if (target === gloves && weapon) target = weapon;
        // steal.c:444-447 — suit under cloak / shirt under cloak or suit
        else if (target === suit && cloak) target = cloak;
        else if (target === shirt && (cloak || suit)) target = cloak || suit;

        // steal.c:401-405 — boulder retry (can't carry a boulder as a
        // non-rockthrower): one re-select, then cant_take.
        if (target.otyp === BOULDER_OTYP && !throwsRocks) {
            if (retry === 0) { boulderReject = true; continue; }
            return { cantTake: target, monkeyStyle: false };
        }
        break;
    }
    return { target, totalWeight, weights, boulderReject, gloves, cloak, suit, shirt, weapon };
}

function itemIsRing(item) {
    return item.cls === 'ring' || item.glyph === '=';
}

// inventoryLetterRank() equivalent (cmd.js:11744) — letter-order traversal
// models C's invent iteration (steal.c:392-400, :416-425).
function stealLetterRank(item) {
    const letter = typeof item === 'string' ? item : item?.letter || '';
    return letter ? letter.charCodeAt(0) ^ 0x20 : 200;
}

// ---------------------------------------------------------------------------
// worn_item_removal() message massage (steal.c:286-333)
// "a/an/the X" -> "your X", drop wear suffixes, "(on left hand)" ->
// "(from left hand)"; verb: disarms (weapon) / removes (accessory) /
// takes off (armor).
// ---------------------------------------------------------------------------
export function wornItemRemovalMessage(subject, item) {
    const itemName = itemDisplayName(item);
    const bareName = itemName.replace(/^(?:a|an|the) /i, '');
    const wornPlace = item.worn === 'right' ? ' (from right hand)'
        : item.worn === 'left' ? ' (from left hand)' : '';
    const weaponStolen = item.wielded || item.alternate
        || /(?:weapon|wielded) in /.test(item.line || '')
        || /alternate weapon/.test(item.line || '');
    const accessoryStolen = !!wornPlace || item.cls === 'ring' || item.cls === 'amulet';
    if (weaponStolen) return `${subject} disarms your ${bareName}.`;
    if (accessoryStolen) return `${subject} removes your ${bareName}${wornPlace}.`;
    if (wornEntryTest(item)) return `${subject} takes off your ${bareName}.`;
    return null; // not worn: no removal preface (steal.c:504-529 skipped)
}

// ---------------------------------------------------------------------------
// Final "stole" message (steal.c:538-560).  `named` is set for seduction
// armor strips and for nymphs whose removal preface immediately preceded.
// ---------------------------------------------------------------------------
export function stolenItemMessage({ monName, isNymph = false, female = false, removalShown = false }, itemName) {
    const named = removalShown && (isNymph || female);
    return `${named ? 'She' : monName} stole ${itemName}.`;
}

// ---------------------------------------------------------------------------
// monkeyBusiness / cant_take — steal.c:377-391 (is_animal checks),
// steal.c:432-442 (ROLL_FROM verb + flee decision).
// Consumes RNG in C order: rn2(4) verb pick, then !rn2(inv_cnt/5+2).
// ---------------------------------------------------------------------------
export function monkeyCantTake(monName, item) {
    const verb = CANT_TAKE_VERBS[rn2(CANT_TAKE_VERBS.length)]; // ROLL_FROM(how), steal.c:434
    const armor = item.cls === 'armor' && wornEntryTest(item);
    const what = armor ? `your ${itemDisplayName(item).replace(/^(?:an?|the) /i, '')}`
        : itemDisplayName(item); // yname() analogue
    const message = `${monName} tries to ${verb} ${what} but gives up.`;
    const flees = !rn2(Math.floor(invCnt(game.inventory || [], false) / 5) + 2); // steal.c:441
    return { message, flees };
}

// ---------------------------------------------------------------------------
// nothing_to_steal branch (steal.c:340-378)
// Consumes RNG exactly as C: Punished chain-yank rn2(4) (nymph only), else
// buried-ball !rn2(4).  Returns the message and a side-effect tag.
// ---------------------------------------------------------------------------
export function stealNothingToTake({
    monName, blind = false, items = game.inventory || [],
    punished = false, buriedBall = false, monkeyBusiness = false,
}) {
    if (punished && !monkeyBusiness && rn2(4)) { // steal.c:347
        return { message: `${monName} takes off your iron chain.`, action: 'unchain', flee: true };
    }
    if (buriedBall && !monkeyBusiness && !rn2(4)) { // steal.c:353-358
        return { message: `${monName} takes off your unseen chain.`, action: 'openholdingtrap', flee: true };
    }
    if (blind) // steal.c:362-363
        return { message: 'Somebody tries to rob you, but finds nothing to steal.', flee: true };
    if (invCnt(items, true) > invCnt(items, false)) // steal.c:364-366
        return { message: `${monName} tries to rob you, but isn't interested in gold.`, flee: true };
    return { message: `${monName} tries to rob you, but there is nothing to steal!`, flee: true }; // steal.c:367-369
}

// ---------------------------------------------------------------------------
// planMonsterSteal — full steal() decision wrapper used by the monster
// melee loop (mhitm_ad_sedu mhitu callers; attack.adtyp 'steal' slices).
// Returns the plan record that the allmain.js deferral plumbing consumes.
// ---------------------------------------------------------------------------
export function planMonsterSteal(mon, {
    subject,
    nameFor = itemDisplayName,
} = {}) {
    const items = game.inventory || [];
    const ptr = mon?.data || {};
    const monkeyBusiness = !!ptr.animal || !!mon?.animal; // is_animal, steal.c:349
    const presumedFemale = mon?.female ?? false;

    const selection = selectStealTarget(items, {
        monkeyBusiness,
        throwsRocks: !!ptr.throwsRocks,
        stealoid: game._stealoid || 0,
        adornedLeft: ringOfAdornmentOn(items, 'left'),
        adornedRight: ringOfAdornmentOn(items, 'right'),
    });

    if (selection.nothing) {
        return {
            kind: 'nothing',
            ...stealNothingToTake({
                monName: subject,
                blind: !!game.u?.blind,
                items,
                punished: !!(game.u?.uball || game.u?.upunished || game._punished),
                buriedBall: game.u?.utraptype === 'buriedball' || game.u?.utraptype === 'TT_BURIEDBALL'
                    || (game.u?.utrap && game.u?.utraptype === 'buriedBall'),
                monkeyBusiness,
            }),
            stolen: null,
        };
    }
    if (selection.cantTake) { // boulder rejected twice (steal.c:401-411 goto)
        const { message, flees } = monkeyCantTake(subject, selection.cantTake);
        return { kind: 'cantake', message, flees, stolen: null };
    }

    const stolen = selection.target;
    // steal.c:428 — avoid re-stealing the item whose multi-turn strip is active
    if (game._stealoid && stolen.id != null && stolen.id === game._stealoid)
        return { kind: 'busy', stolen: null };

    if (monkeyBusiness) {
        // steal.c:377-391: animals can't overcome curse stickiness or lift
        // what they can't carry; both force the cant_take verb+flee rolls.
        const stuck = (stolen.cursed && isWornArmorOrAccessory(stolen)) || stolen === game.u?.uball;
        if (stuck || monkeyCantCarry(mon, stolen)) {
            const { message, flees } = monkeyCantTake(subject, stolen);
            return { kind: 'cantake', message, flees, stolen: null };
        }
    }

    const removeMessage = wornItemRemovalMessage(subject, stolen);
    const stolenName = nameFor(stolen);
    const isNymph = ptr.mlet === 'n' || ptr.glyph === 'n';
    const stolenMessage = stolenItemMessage(
        { monName: subject, isNymph, female: presumedFemale, removalShown: !!removeMessage },
        stolenName);
    return { kind: 'steal', stolen, removeMessage, stolenMessage };
}

// ring of adornment worn left/right — gate for the Adornment fast path
// (steal.c:383-389 uses the Adornment *intrinsic*; in the JS model that
// intrinsic comes from a worn ring of adornment, do_wear.c property table).
export function ringOfAdornmentOn(items, side) {
    const ring = wornRingIn(items, side);
    if (!ring) return null;
    const id = String(ring.actualKind || (ring.known ? ring.kind : '') || ring.name || '');
    return /adornment/.test(id) ? ring : null;
}

// can_carry() availability check (mon.c can_carry) — animals refuse to
// carry heavy/cursed-sticky things; JS weight proxy below.
function monkeyCantCarry(mon, item) {
    // C can_carry() checks weight vs monster strength and loadstones.
    // Loadstones are unliftable for monsters; honoring that here.
    return /loadstone/i.test(String(item.kind || item.name || itemDisplayName(item)));
}

// ---------------------------------------------------------------------------
// thiefdead / stealarm / unstolenarm — multi-turn seduction armor-strip
// state (steal.c:129-187).  gs.stealoid/gs.stealmid/ga.afternmv map to
// game._stealoid / game._stealmid / game._steal_after_mv.
// stealarm() resolves once the hero's dressing maneuver would finish:
// returns the "steals" message and moves the item to the thief's minvent.
// ---------------------------------------------------------------------------
export function thiefdead(g = game) {
    // steal.c:129-137 — thief died mid-strip: stop the strip instead.
    g._stealmid = 0;
    if (g._steal_after_mv === 'stealarm') {
        g._steal_after_mv = 'unstolenarm';
        g._steal_nomovemsg = null;
    }
}

export function unstolenarm(g = game, inventoryOf = null) {
    // steal.c:143-155 — thief died; hero just finishes taking the item off.
    const items = inventoryOf || g.inventory || [];
    const oid = g._stealoid;
    g._stealoid = 0;
    const obj = items.find(item => item.id === oid) || null;
    if (obj) return `You finish taking off your ${itemDisplayName(obj).replace(/^(?:an?|the) /i, '')}.`;
    return null;
}

export function stealarm(g = game, { findMonsterById = null, nameFor = itemDisplayName } = {}) {
    // steal.c:160-191 — finish stealing a multi-turn doffed armor item.
    if (!g._stealoid || !g._stealmid) return clearStealState(g);
    const items = g.inventory || [];
    const otmp = items.find(item => item.id === g._stealoid);
    if (!otmp) return clearStealState(g);
    const mtmp = findMonsterById ? findMonsterById(g._stealmid)
        : (g.level?.monsters || []).find(m => m.m_id === g._stealmid);
    if (!mtmp || mtmp.dead || mtmp.mhp <= 0) return clearStealState(g);
    const dist = Math.max(Math.abs((mtmp.mx | 0) - (g.u?.ux | 0)),
                          Math.abs((mtmp.my | 0) - (g.u?.uy | 0)));
    const stillThief = (mtmp.data?.attacks || mtmp.data?.xpAttacks || [])
        .some(atk => atk.adtyp === 'steal' || atk.adtyp === 21 /* AD_SITM */);
    if (!stillThief || dist > 1) return clearStealState(g); // distu > 2, steal.c:176
    const name = nameFor(otmp);
    removeHeroInventoryItem(g, otmp);
    add_to_minv(mtmp, stripWornState(otmp));
    mtmp.mflee = 1; mtmp.mfleetim = 0; // monflee(0,FALSE,FALSE), monmove.c:462-533
    return { message: `${subjectName(mtmp)} steals ${name}!`, mon: mtmp, stolen: otmp };
}

function clearStealState(g) {
    g._stealoid = 0; g._stealmid = 0; g._steal_after_mv = null; // steal.c:189
    return null;
}

function subjectName(mon) { return `The ${mon?.data?.name || mon?.name || 'creature'}`; }

function stripWornState(obj) {
    const stolen = { ...obj };
    delete stolen.worn; delete stolen.wielded; delete stolen.alternate;
    stolen.wasStolen = true;
    return stolen;
}

function removeHeroInventoryItem(g, obj) {
    const idx = (g.inventory || []).indexOf(obj);
    if (idx >= 0) g.inventory.splice(idx, 1);
}

// ---------------------------------------------------------------------------
// stealgold() — leprechaun gold theft (steal.c:62-116; caller
// mhitm_ad_sgld uhitm.c:2787-2830).  World side effects minimized: the
// caller supplies movement/message hooks.  RNG order per C: somegold()'s
// rn1 chain only on the purse path, rn2(5) on the floor-vs-purse choice
// and on the floor-path flee check.
// ---------------------------------------------------------------------------
export function stealgold(mon, {
    floorGold = null,           // gold obj on hero's square (nexthere scan)
    items = game.inventory || [],
    heroHasSteed = false,
    slithy = false,
    steedName = '',
} = {}) {
    // steal.c:70-73 — skip lesser coins on the floor (JS: first coin obj)
    const fgold = floorGold;
    const ygold = findgold(items);
    if (fgold && (!ygold || (fgold.quan || 1) > (ygold.quan || 1) || !rn2(5))) {
        // steal.c:78-100 — snatch floor gold
        const foot = slithy ? 'coils' : heroHasSteed ? 'hooves' : 'feet';
        const level = (game.u && (game.u.levitating || game.u.flying)) ? 'beneath' : 'between';
        return {
            kind: 'floor', amount: fgold.quan || 1, taken: fgold,
            message: `The ${mon?.data?.name || 'leprechaun'} quickly snatches some gold from ${level} your ${foot}!`,
            // steal.c:97-99: !ygold || !rn2(5) -> rloc+monflee (caller applies)
            flees: !ygold || !rn2(5),
        };
    }
    if (ygold) {
        // steal.c:101-113 — proportional purse grab via somegold()
        const goldPrice = 1; // objects[GOLD_PIECE].oc_cost == 1 (objects.c)
        let amount = Math.ceil(somegold(moneyCnt(items)) / goldPrice);
        amount = Math.min(amount, ygold.quan || 1);
        return { kind: 'purse', amount, taken: ygold, amountIsFullStack: amount >= (ygold.quan || 1),
                 message: 'Your purse feels lighter.', flees: true };
    }
    return { kind: 'none' };
}

// ---------------------------------------------------------------------------
// stealamulet() — covetous quest-artifact / Amulet / invocation grab
// (steal.c:640-682; caller mhitm_ad_samu uhitm.c:4584-4591: 1/20 per hit).
// ---------------------------------------------------------------------------
export function stealamulet(mon, {
    items = game.inventory || [],
    isQuestArtifact = defaultQuestArtifactTest,
    uhave = game.u?.uhave || {},
} = {}) {
    // steal.c:646-657 — every quest artifact, random choice among them via rnd(n)
    let candidates = items.filter(isQuestArtifact);
    if (candidates.length > 1)
        candidates = [candidates[rnd(candidates.length) - 1]];
    let target = candidates[0] || null;
    if (!target) {
        // steal.c:659-677 — Amulet / Bell / Book / Candelabrum fallbacks.
        let real = null, fake = null;
        if (uhave.amulet) { real = 'amulet of Yendor'; fake = 'amulet of Yendor'; }
        else if (uhave.bell) { real = 'Bell of Opening'; fake = 'bell'; }
        else if (uhave.book) { real = 'Book of the Dead'; }
        else if (uhave.menorah) { real = 'Candelabrum of Invocation'; }
        else return { target: null };
        const matches = it => {
            const id = `${it.kind || ''} ${it.name || ''} ${it.actualKind || ''}`;
            if (real && new RegExp(real.replace(/ /g, '\\s'), 'i').test(id)) return true;
            return !!(fake && !mon?.iswiz && new RegExp(`^.*${fake}`, 'i').test(id));
        };
        candidates = items.filter(matches);
        if (candidates.length > 1)
            candidates = [candidates[rnd(candidates.length) - 1]];
        target = candidates[0] || null;
    }
    if (!target) return { target: null };
    return { target, stripOrder: stealamuletStripOrder(items, target) };
}

function defaultQuestArtifactTest(item) {
    return !!(item?.questArtifact || item?.artifact
        && /quest/i.test(String(item.artifactSource || item.artifactClass || '')));
}

// steal.c:667-676 — gear stripping order for a worn covetous target:
// cloak first (over suit/shirt), then suit (over shirt), then weapon(s)
// (blocking gloves), then gloves (blocking rings), then the target itself.
export function stealamuletStripOrder(items, target) {
    const gloves = wornGlovesIn(items), cloak = wornCloakIn(items),
        suit = wornSuitIn(items), weapon = wieldedWeaponIn(items);
    const isRingR = target === wornRingIn(items, 'right') || target === wornRingIn(items, 'left');
    const strips = [];
    if ((target === suit || target === wornShirtIn(items)) && cloak) strips.push(cloak);
    if (target === wornShirtIn(items) && suit) strips.push(suit);
    if ((target === gloves || (isRingR && gloves)) && weapon) strips.push(weapon);
    if (isRingR && gloves) strips.push(gloves);
    strips.push(target);
    return strips;
}

// ---------------------------------------------------------------------------
// mpickobj() — monster acquires an object (steal.c:588-635).  JS analogue
// of the slice: clears throw/kick tracking, hero-knowledge loss when the
// monster can't be felt/seen, then add_to_minv (mklev.js port of mkobj.c).
// ---------------------------------------------------------------------------
export function mpickobj(mon, obj, { seen = true, heroStuckTo = null } = {}) {
    if (!obj) return { freed: true }; // steal.c:594-598 impossible()
    if (game._thrownobj === obj) game._thrownobj = null; // gt.thrownobj, steal.c:605
    if (game._kickedobj === obj) game._kickedobj = null; // gk.kickedobj, steal.c:607
    obj.no_charge = 0;
    if (!mon?.mtame) { // steal.c:618-631 — unseen-pickup knowledge loss
        if (!seen && mon !== heroStuckTo) obj._hero_knowledge_lost = true;
        if (obj.how_lost === 'thrown') obj.how_lost = 'stolen';
        else if (obj.how_lost === 'dropped') delete obj.how_lost;
    }
    const before = (mon.minvent || []).length;
    add_to_minv(mon, obj);
    return { freed: false, merged: (mon.minvent || []).length === before };
}

// ---------------------------------------------------------------------------
// maybe_absorb_item() — mimic takes the item that poked it
// (steal.c:690-727; caller lock.c:575 finish_force_lock pole/pick poke).
// obj_resists(ochance,achance) modeled by the caller-supplied resists hook.
// ---------------------------------------------------------------------------
export function maybeAbsorbItem(mon, obj, { ochance, achance, resists = () => false, canCarry = true } = {}) {
    if (!obj) return null;
    const isBall = obj === game.u?.uball, isChain = obj === game.u?.uchain;
    if (isBall || isChain || obj.cls === 'rock' || resists(obj, ochance, achance))
        return null; // steal.c:695-698
    const carried = (game.inventory || []).includes(obj); // carried(), steal.c:703
    return {
        absorbed: obj, carried,
        message: (canspot => canspot
            ? `${subjectName(mon)} pulls ${itemDisplayName(obj)} away from you and absorbs ${(obj.quan || 1) > 1 ? 'them' : 'it'}!`
            : `${itemDisplayName(obj).replace(/^./, c => c.toUpperCase())} ${(obj.quan || 1) > 1 ? 'are' : 'is'} pulled from your hand!`)(canCarry),
    };
}

// ---------------------------------------------------------------------------
// mdrop_obj / mdrop_special_objs / relobj (steal.c:733-820).
// The live JS analogue on the monster-death path is dropMonsterInventory()
// in mklev.js; these ports model the steal.c-specific selection semantics
// (resisting special objects, pet droppables) for callers that need them.
// ---------------------------------------------------------------------------
export function mdropSpecialObjs(mon, { objResists = () => false, isQuestArtifact = defaultQuestArtifactTest } = {}) {
    // steal.c:770-790 — keep the Amulet/invocation/quest-artifact out of a
    // departing monster's inventory; returns the objects to rescue.
    return (mon?.minvent || []).filter(obj => objResists(obj) || isQuestArtifact(obj));
}

export function relobj(mon, { show = false, isPet = false, droppables = null } = {}) {
    // steal.c:798-820 — release carried objects; pets keep wielded/worn
    // gear, so callers pass a droppables() list (dog.c) for them.
    return isPet ? (droppables || []) : [...(mon?.minvent || [])];
}
