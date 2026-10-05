import { game } from './gstate.js';
import { MONS, S_HUMAN } from './permonst.js';
import { armorBonus, armorSlot } from './armor.js';
import { ringDefinition } from './ring.js';
import { IDENTIFIED_AMULET_NAMES } from './o_init.js';
import { rnd } from './rng.js';
import { AC_MAX, W_ARM, W_ARMC, W_ARMH, W_ARMF, W_ARMS, W_ARMG, W_ARMU,
    W_RINGL, W_RINGR, W_AMUL, PROTECTION, INTRINSIC, FUMBLING, TIMEOUT,
    A_INT, A_WIS, A_DEX, A_CHA } from './const.js';

const ARMOR_SLOTS = [
    ['uarm', W_ARM, 'body'], ['uarmc', W_ARMC, 'cloak'], ['uarmh', W_ARMH, 'helm'],
    ['uarmf', W_ARMF, 'boots'], ['uarms', W_ARMS, 'shield'],
    ['uarmg', W_ARMG, 'gloves'], ['uarmu', W_ARMU, 'shirt'],
];
const SPECIES_BY_NAME = new Map(MONS.flatMap(mon => [[mon.name.toLowerCase(), mon],
    [`${mon.mlet === S_HUMAN ? 'human' : 'beast'} ${mon.name.toLowerCase()}`, mon]]));

export function adjustArmorAttributeBonuses(item, delta, g = game, discoverType = null) {
    const kind = String(item?.actualKind || item?.kind || '').toLowerCase();
    const attrs = kind === 'helm of brilliance' ? [A_INT, A_WIS]
        : kind === 'gauntlets of dexterity' ? [A_DEX] : [];
    if (!attrs.length) return '';
    if (delta) discoverType?.(kind);
    const u = g.u;
    u.abon ??= { a: [0, 0, 0, 0, 0, 0] };
    for (const attr of attrs) u.abon.a[attr] = (u.abon.a[attr] || 0) + delta;
    (g.disp ??= {}).botl = true;
    return delta ? kind : '';
}

// Helmet/Gloves_on/off and adj_abon keep equipment bonuses separate from
// base attributes. Clamping belongs to acurr, so removing saturated bonuses
// restores the original value. Discovery exercises Wisdom before adj_abon.
export function changeArmorBonuses(item, on, g = game, discoverType = null) {
    const u = g.u;
    const kind = String(item?.actualKind || item?.kind || '').toLowerCase();
    const cancelled = !on && (item._armorDonPending || item.donning || item._donning);
    let discover = '';
    if (!cancelled) discover = adjustArmorAttributeBonuses(item, (on ? 1 : -1) * (item.spe || 0), g, discoverType);
    if (kind === 'gauntlets of power') { discover = kind; discoverType?.(kind); }
    if (kind === 'cornuthaum' && !cancelled) {
        u.abon ??= { a: [0, 0, 0, 0, 0, 0] };
        const role = g.urole?.name?.m || g._startup_role;
        const bonus = role === 'Wizard' ? 1 : -1;
        u.abon.a[A_CHA] = (u.abon.a[A_CHA] || 0) + (on ? bonus : -bonus);
        (g.disp ??= {}).botl = true;
        if (on) { discover = kind; discoverType?.(kind); }
    }
    if (kind === 'fumble boots' || kind === 'gauntlets of fumbling') {
        u.uprops ??= [];
        const prop = u.uprops[FUMBLING] ??= { intrinsic: u._fumblingTimeout || 0, extrinsic: 0 };
        const mask = kind === 'fumble boots' ? W_ARMF : W_ARMG;
        if (!((prop.extrinsic || 0) & ~mask) && !((prop.intrinsic || 0) & ~TIMEOUT)) {
            prop.intrinsic = on ? Math.min(TIMEOUT, ((prop.intrinsic || 0) & TIMEOUT) + rnd(20)) : 0;
            if (!on) prop.extrinsic = 0;
        }
        if (!on) prop.extrinsic &= ~mask;
        u._fumblingTimeout = (prop.intrinsic || 0) & TIMEOUT;
        u.fumbling = !!(prop.intrinsic || prop.extrinsic);
    }
    item._armorDonPending = false;
    if (on) item.known = item.chargeKnown = true;
    return discover;
}

// cancel_don suppresses the on callback when its object vanishes. Retain
// the pending marker until the matching off callback can skip its bonus.
export function cancelArmorDressing(item, g = game) {
    const occupation = g._armor_wear_occupation;
    const active = !!occupation && occupation.itemLetter === item?.letter;
    const pending = g._armor_don_knowledge_after_more === item || g._armor_don_after_turn_tail === item;
    if (!active && !pending) return;
    if (pending || occupation.action !== 'takeoff') item._armorDonPending = true;
    if (active) g._armor_wear_occupation = null;
    if (g._armor_don_knowledge_after_more === item) g._armor_don_knowledge_after_more = null;
    if (g._armor_don_after_turn_tail === item) g._armor_don_after_turn_tail = null;
    g.multi = 0;
    g.multi_reason = null;
}

// do_wear.c:find_ac recomputes from sources before clamping. A previous
// clamped value cannot be adjusted when equipment is removed or recharged.
export function findAc(g = game) {
    const u = g.u, inventory = g.inventory || [];
    const form = u._polyself_form;
    const species = form ? SPECIES_BY_NAME.get(`${form.wereBeast ? 'beast ' : form.wereHuman ? 'human ' : ''}${String(form.name || '').toLowerCase()}`) : MONS[u.umonnum];
    let ac = species?.ac ?? form?.ac ?? form?.mac ?? 10;
    for (const [slot, mask, name] of ARMOR_SLOTS) {
        const item = (inventory.includes(u[slot]) ? u[slot] : null) || inventory.find(obj => obj.owornmask & mask
            || (!obj.owornmask && (obj.worn || obj.line?.includes('being worn')) && armorSlot(obj) === name));
        if (item) ac -= armorBonus(item);
    }
    for (const [slot, mask, hand] of [['uleft', W_RINGL, 'left'], ['uright', W_RINGR, 'right']]) {
        const item = (inventory.includes(u[slot]) ? u[slot] : null) || inventory.find(obj => obj.owornmask & mask
            || (!obj.owornmask && (obj.worn === hand || obj.line?.includes(`on ${hand} hand`))));
        if (ringDefinition(item)?.name === 'protection') ac -= item.spe || 0;
    }
    const amulet = (inventory.includes(u.uamul) ? u.uamul : null) || inventory.find(obj => obj.owornmask & W_AMUL
        || (!obj.owornmask && obj.cls === 'amulet' && (obj.worn || obj.line?.includes('being worn'))));
    if (amulet && (IDENTIFIED_AMULET_NAMES[amulet.amuletIndex]
        || String(amulet.actualKind || amulet.kind || '').toLowerCase()) === 'amulet of guarding') ac -= 2;
    if ((u.uprops?.[PROTECTION]?.intrinsic || 0) & INTRINSIC) ac -= u.ublessed || 0;
    ac -= u.uspellprot || 0;
    ac = Math.max(-AC_MAX, Math.min(AC_MAX, ac));
    if (u.uac !== ac) { u.uac = ac; (g.disp ??= {}).botl = true; }
    return ac;
}

// Keep the canonical slot and the runtime inventory representation paired.
// Callers own dressing delay, property effects and the later find_ac boundary.
export function setArmorWorn(item, on, g = game) {
    const slot = ARMOR_SLOTS.find(([, , name]) => name === armorSlot(item));
    if (slot) {
        if (on) g.u[slot[0]] = item;
        else if (g.u[slot[0]] === item) g.u[slot[0]] = null;
        item.owornmask = on ? slot[1] : 0;
    }
    item.worn = on;
    const kind = String(item?.actualKind || item?.kind || '').toLowerCase();
    if (kind === 'fumble boots' || kind === 'gauntlets of fumbling') {
        g.u.uprops ??= [];
        const prop = g.u.uprops[FUMBLING] ??= { intrinsic: g.u._fumblingTimeout || 0, extrinsic: 0 };
        const mask = kind === 'fumble boots' ? W_ARMF : W_ARMG;
        prop.extrinsic = on ? (prop.extrinsic || 0) | mask : (prop.extrinsic || 0) & ~mask;
        g.u._fumblingTimeout = (prop.intrinsic || 0) & TIMEOUT;
        g.u.fumbling = !!(prop.intrinsic || prop.extrinsic);
    }
    if (!on) item.line = String(item.line || '').replace(/ \(being worn\)/g, '');
}
