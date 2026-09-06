import { game } from './gstate.js';
import { MONS, S_HUMAN } from './permonst.js';
import { armorBonus, armorSlot } from './armor.js';
import { ringDefinition } from './ring.js';
import { IDENTIFIED_AMULET_NAMES } from './o_init.js';
import { AC_MAX, W_ARM, W_ARMC, W_ARMH, W_ARMF, W_ARMS, W_ARMG, W_ARMU,
    W_RINGL, W_RINGR, W_AMUL, PROTECTION, INTRINSIC } from './const.js';

const ARMOR_SLOTS = [
    ['uarm', W_ARM, 'body'], ['uarmc', W_ARMC, 'cloak'], ['uarmh', W_ARMH, 'helm'],
    ['uarmf', W_ARMF, 'boots'], ['uarms', W_ARMS, 'shield'],
    ['uarmg', W_ARMG, 'gloves'], ['uarmu', W_ARMU, 'shirt'],
];
const SPECIES_BY_NAME = new Map(MONS.flatMap(mon => [[mon.name.toLowerCase(), mon],
    [`${mon.mlet === S_HUMAN ? 'human' : 'beast'} ${mon.name.toLowerCase()}`, mon]]));

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
    if (!on) item.line = String(item.line || '').replace(/ \(being worn\)/g, '');
}
