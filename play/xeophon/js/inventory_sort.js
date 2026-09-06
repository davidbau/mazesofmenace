// invent.c:sortloot, loot_classify, loot_xname and inuse_classify.
import { game } from './gstate.js';
import { objectTypeData, objectTypeIsKnown } from './object_knowledge.js';
import { P_BOW, P_CROSSBOW, P_DAGGER, P_KNIFE, P_SPEAR, P_POLEARMS, P_LANCE,
    W_ACCESSORY, W_WEAPONS, W_ARMOR, W_ARMU, W_ARMF, W_ARMG, W_ARMH,
    W_ARMS, W_ARMC, W_ARM, W_QUIVER, W_SWAPWEP, W_WEP, W_TOOL,
    W_RINGL, W_RINGR, W_AMUL } from './const.js';

export const SORTLOOT_PACK = 1, SORTLOOT_INVLET = 2, SORTLOOT_LOOT = 4,
    SORTLOOT_INUSE = 8, SORTLOOT_PETRIFY = 32;
export const DEFAULT_PACK_ORDER = '$")[%?+!=/(*`0_';
const PICKUP_ORDER = '$"=/!?+*%()[`0_';
const CLASS_SYMBOLS = ['', '', ')', '[', '=', '"', '(', '%', '!', '?', '+', '/', '$', '*', '`', '0', '_', '.'];
const LETTERS = '$abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ#';
const CONTAINERS = new Set(['LARGE_BOX', 'CHEST', 'ICE_BOX', 'SACK', 'OILSKIN_SACK', 'BAG_OF_HOLDING', 'BAG_OF_TRICKS']);
const INSTRUMENTS = new Set(['WOODEN_FLUTE', 'MAGIC_FLUTE', 'TOOLED_HORN', 'FROST_HORN', 'FIRE_HORN',
    'WOODEN_HARP', 'MAGIC_HARP', 'BUGLE', 'LEATHER_DRUM', 'DRUM_OF_EARTHQUAKE', 'HORN_OF_PLENTY']);

export function classifyLoot(item, D) {
    const type = objectTypeData(item);
    if (!D.blind) D.observe(item);
    const seen = !!item.dknown, discovered = objectTypeIsKnown(item, type);
    const order = game.flags?.sortpack !== false ? game.flags?.packorder || DEFAULT_PACK_ORDER : PICKUP_ORDER;
    const index = order.indexOf(CLASS_SYMBOLS[type?.class] || '\0');
    const orderclass = index >= 0 ? index + 1 : order.length + 1 + (type?.class !== 17);
    let subclass = 1;
    switch (type?.class) {
    case 3:
        subclass = [7, 4, 1, 2, 3, 5, 6][type.subtype] || 8;
        break;
    case 2: {
        const skill = type.subtype;
        subclass = skill < 0 ? (skill >= -P_CROSSBOW && skill <= -P_BOW ? 1 : 3)
            : skill >= P_BOW && skill <= P_CROSSBOW ? 2
                : [P_SPEAR, P_DAGGER, P_KNIFE].includes(skill) ? 4
                    : [P_POLEARMS, P_LANCE].includes(skill) || item.artifact === 'Snickersnee' ? 6 : 5;
        break;
    }
    case 6:
        subclass = seen && discovered && ['BAG_OF_TRICKS', 'HORN_OF_PLENTY'].includes(type.symbol) ? 2
            : CONTAINERS.has(type.symbol) ? 1 : INSTRUMENTS.has(type.symbol) ? 3 : 4;
        break;
    case 7:
        subclass = ({ SLIME_MOLD: 1, TIN: 3, EGG: 4, CORPSE: 5 })[type.symbol] || (item.globby ? 6 : 2);
        break;
    case 13:
        subclass = type.material === 20 ? (!seen ? 1 : !discovered ? 2 : 3)
            : type.material === 19 ? (!seen ? 1 : !discovered ? 2 : 4)
                : !seen ? 5 : type.symbol === 'ROCK' ? 8 : !discovered ? 6 : 7;
        break;
    }
    return { orderclass, subclass, disco: !seen ? 1 : discovered || !type?.description ? 4 : D.called(item) ? 3 : 2 };
}

// Names used only for sorting omit quantity and user names, and normalize
// potion dilution, holy water, towel moisture and glob size before comparison.
export function lootSortName(item, D) {
    const type = objectTypeData(item);
    const view = { ...item, quan: 1 };
    if (type?.class === 8) {
        view.odiluted = false;
        if (type.symbol === 'POT_WATER') view.blessed = view.cursed = false;
    }
    if (type?.symbol === 'TOWEL') view.spe = 0;
    if (item.globby) view.owt = 20;
    if (!item.artifact && !item.oartifact) {
        view.oname = view.o_name = view.userName = view._wish_object_name = null;
        if (typeof view.kind === 'string') view.kind = view.kind.replace(/ named .+$/, '');
    }
    let name = D.xname(view);
    if (type?.symbol === 'TOWEL') name += (item.spe || 0) > 0 ? item.spe >= 3 ? 'x' : 'y' : 'z';
    if (item.globby) name += item.owt <= 100 ? 'a' : item.owt <= 300 ? 'b' : item.owt <= 500 ? 'c' : 'd';
    return name.toLowerCase();
}

export function sortLoot(items, mode, D, filter = null) {
    const augmentFilter = !!(mode & SORTLOOT_PETRIFY);
    mode &= ~SORTLOOT_PETRIFY;
    const rows = items.filter(item => !filter || filter(item)
        || augmentFilter && objectTypeData(item)?.symbol === 'CORPSE' && D.petrifies(item))
        .map((item, index) => ({ item, index }));
    if (!mode || rows.length < 2) return rows.map(row => row.item);
    const classify = row => row.classification ??= classifyLoot(row.item, D);
    const name = row => row.name ??= lootSortName(row.item, D);
    const inuse = row => {
        if (row.inuse != null) return row.inuse;
        const item = row.item, type = objectTypeData(item);
        const worn = (item.owornmask || 0) & (W_ACCESSORY | W_WEAPONS | W_ARMOR);
        const uses = [!worn && type?.symbol === 'LEASH' && item.leashmon,
            !worn && type?.class === 6 && item.lamplit,
            ...[W_ARMU, W_ARMF, W_ARMG, W_ARMH, W_ARMS, W_ARMC, W_ARM,
                W_QUIVER, W_SWAPWEP, W_WEP, W_TOOL,
                D.leftHanded ? W_RINGR : W_RINGL, D.leftHanded ? W_RINGL : W_RINGR, W_AMUL].map(mask => worn & mask)];
        row.inuse = uses.findIndex(Boolean) + 1;
        return row.inuse;
    };
    rows.sort((one, two) => {
        const a = one.item, b = two.item;
        if (mode & SORTLOOT_INUSE) return inuse(two) - inuse(one) || one.index - two.index;
        if ((mode & (SORTLOOT_PACK | SORTLOOT_INVLET)) !== SORTLOOT_INVLET) {
            const c = classify(one), d = classify(two);
            const delta = c.orderclass - d.orderclass || (!(mode & SORTLOOT_INVLET)
                && (c.subclass - d.subclass || c.disco - d.disco));
            if (delta) return delta;
        }
        if (mode & SORTLOOT_INVLET) {
            const first = LETTERS.indexOf(a.letter), second = LETTERS.indexOf(b.letter);
            const delta = (first < 0 ? 54 : first) - (second < 0 ? 54 : second);
            if (delta) return delta;
        }
        if (mode & SORTLOOT_LOOT) {
            const first = name(one), second = name(two);
            if (first !== second) return first < second ? -1 : 1;
            const buc = item => item.bknown ? item.blessed ? 3 : !item.cursed ? 2 : 1 : 0;
            const delta = buc(b) - buc(a) || Number(!!b.greased) - Number(!!a.greased)
                || Math.max(a.oeroded || 0, a.oeroded2 || 0) - Math.max(b.oeroded || 0, b.oeroded2 || 0)
                || Number(!!(b.rknown && b.oerodeproof)) - Number(!!(a.rknown && a.oerodeproof));
            if (delta) return delta;
            const type = objectTypeData(a);
            if (type?.usesKnown && type.class !== 7) {
                const delta = (b.known ? b.spe || 0 : -1000) - (a.known ? a.spe || 0 : -1000);
                if (delta) return delta;
            }
        }
        return one.index - two.index;
    });
    return rows.map(row => row.item);
}
