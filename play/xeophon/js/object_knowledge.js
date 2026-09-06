// C objnam.c:not_fully_identified and the object knowledge used by xname.
import { game } from './gstate.js';
import { A_WIS } from './const.js';
import { OBJECT_DATA } from './object_data.js';
import { JAPANESE_ITEM_ALIASES } from './o_init.js';

const CLASSES = { weapon: 2, armor: 3, ring: 4, amulet: 5, tool: 6, food: 7,
    potion: 8, scroll: 9, spellbook: 10, wand: 11, coin: 12, gem: 13, rock: 14,
    ball: 15, chain: 16, venom: 17 };
const CLASS_NAMES = Object.fromEntries(Object.entries(CLASSES).map(([name, id]) => [id, name]));
const SYMBOLS = new Map(OBJECT_DATA.map(type => [type.symbol, type]));
const CLASS_TYPES = Array.from({ length: 18 }, (_, cls) => OBJECT_DATA.filter(type => type.class === cls && type.id >= 18));
const SECTIONS = ['', '', 'Weapons', 'Armor', 'Rings', 'Amulets', 'Tools', 'Comestibles',
    'Potions', 'Scrolls', 'Spellbooks', 'Wands', 'Coins', 'Gems/Stones', 'Boulders/Statues',
    'Iron balls', 'Chains', 'Venoms'];

// Numeric legacy JS otyp values overlap native C IDs. Only an explicitly
// tagged native ID can index the canonical table; named/indexed JS objects
// resolve within their own class until their producers carry that tag.
export function objectTypeData(item) {
    if (item._c_otyp != null) return OBJECT_DATA[item._c_otyp];
    const cls = CLASSES[item.cls] || ({ ')': 2, '[': 3, '=': 4, '"': 5, '(': 6,
        '%': 7, '!': 8, '?': 9, '+': 10, '/': 11, '$': 12, '*': 13, '`': 14 }[item.glyph])
        || ({ 1: 2, 2: 3, 3: 4, 7: 7, 8: 9, 9: 8, 10: 11, 11: 10, 12: 6, 14: 13, 15: 5, 466: 12 }[item.otyp]);
    const candidates = cls ? CLASS_TYPES[cls] : OBJECT_DATA;
    for (const name of [item.actualKind, item.kind, item.spellName, item.spell?.name, item.wand,
        typeof item.otyp === 'string' ? item.otyp : '', item.gemDescription]) {
        if (!name) continue;
        let normalized = String(name).toLowerCase().replace(/ named .+$/, '');
        normalized = (JAPANESE_ITEM_ALIASES.get(normalized) || normalized)
            .replace(/^(?:potion|scroll|spellbook|ring|wand)(?::| of )/, '').replace(/^pair of /, '');
        if (cls === 13) normalized = normalized.replace(/ stone$/, '');
        if (normalized === 'tripe') normalized = 'tripe ration';
        const type = candidates.find(type => type.name?.toLowerCase() === normalized);
        if (type) return type;
        if (/^tin:/.test(normalized)) return SYMBOLS.get('TIN');
        if (normalized === 'holy water' || normalized === 'unholy water') return SYMBOLS.get('POT_WATER');
        if (normalized === 'flint stone') return SYMBOLS.get('FLINT');
    }
    const index = ({ 4: item.ringRoll != null ? item.ringRoll - 1 : undefined,
        5: item.amuletIndex, 8: item.potionIndex, 9: item.scrollIndex,
        10: item.spellbookIndex, 11: item.wandIndex })[cls];
    if (index != null) return candidates[index];
    if (cls === 12) return SYMBOLS.get('GOLD_PIECE');
    return null;
}

export function objectTypeIsKnown(item, type = objectTypeData(item)) {
    if (!type) return false;
    if (type.nameKnown || game._known_object_types?.includes(type.id)) return true;
    return (game._discoveries || []).some(entry => {
        if (entry.section !== SECTIONS[type.class] || entry.known === false) return false;
        const discovered = objectTypeData({ cls: CLASS_NAMES[type.class],
            kind: entry.name, _c_otyp: entry.typeId });
        return discovered?.id === type.id;
    });
}

// objclass.h and mkobj.c: a material can have both primary and secondary
// erosion. Candles and fire-resistant types have separate flammability rules.
export function objectDamageTraits(item, type = objectTypeData(item)) {
    const material = item.material ?? type.material;
    const organic = material <= 8 && material !== 1;
    const rusty = material === 11, corroded = rusty || material === 13;
    const cracked = material === 19 && type.class === 3;
    const rotted = organic || material === 10;
    const burnt = !['TALLOW_CANDLE', 'WAX_CANDLE', 'WAN_FIRE'].includes(type.symbol)
        && type.property !== 1 && (organic || material === 18);
    return { rusty, corroded, cracked, rotted, burnt,
        damageable: rusty || corroded || cracked || rotted || burnt };
}

export function objectIsFullyIdentified(item) {
    const type = objectTypeData(item);
    if (!type) return false;
    if (type.class === 12) return true;
    if (!(item.known ?? !type.usesKnown) || !item.dknown
        || !item.bknown && type.symbol !== 'SCR_MAIL' || !objectTypeIsKnown(item, type)) return false;
    const container = type.id >= SYMBOLS.get('LARGE_BOX').id && type.id <= SYMBOLS.get('BAG_OF_TRICKS').id;
    if (!item.cknown && (container || type.symbol === 'STATUE')) return false;
    if (!item.lknown && (type.symbol === 'LARGE_BOX' || type.symbol === 'CHEST')) return false;
    if ((item.artifact || item.oartifact) && !(game._identified_artifacts || []).includes(item.artifact || item.oartifact)) return false;
    // rknown matters only for vulnerable weapons, armor, weapon-tools and balls.
    if (item.rknown || !([2, 3, 15].includes(type.class) || type.class === 6 && type.subtype !== 0)) return true;
    return !objectDamageTraits(item, type).damageable;
}

// invent.c:fully_identify_obj. This mutates one object, including a container
// itself; it never identifies that container's contents recursively.
export function fullyIdentifyObject(item, D) {
    const type = objectTypeData(item);
    if (!type) return false;
    const wasKnown = objectTypeIsKnown(item, type);
    game._known_object_types ??= [];
    if (!game._known_object_types.includes(type.id)) game._known_object_types.push(type.id);
    if (!wasKnown) D.exercise(A_WIS, true);
    D.discover(item, type);
    const artifact = item.artifact || item.oartifact;
    if (artifact) {
        game._identified_artifacts ??= [];
        if (!game._identified_artifacts.includes(artifact)) game._identified_artifacts.push(artifact);
    }
    if (!D.hallucinating) item.dknown = true;
    item.known = item.bknown = item.rknown = true;
    const container = type.id >= SYMBOLS.get('LARGE_BOX').id && type.id <= SYMBOLS.get('BAG_OF_TRICKS').id;
    if (container || type.symbol === 'STATUE') item.cknown = item.lknown = true;
    else if (type.symbol === 'TIN') item.cknown = true;
    if (type.symbol === 'EGG' && item.corpsenm != null && item.corpsenm !== -1) D.learnEgg(item);
    return true;
}

// zap.c:learnwand observes an already discovered wand even while blind. An
// unknown type can be learned only after its appearance has been observed.
export function learnWandType(item, D) {
    const type = objectTypeData(item);
    if (!type || type.class === 10) return;
    const known = objectTypeIsKnown(item, type);
    if ((known || !D.blind) && !D.hallucinating && type.id >= 18) {
        item.dknown = true;
        D.observe(item, type);
    }
    if (!known && item.dknown && type.id >= 18) {
        game._known_object_types ??= [];
        game._known_object_types.push(type.id);
        D.exercise(A_WIS, true);
        D.discover(item, type);
    }
    D.update(item);
}
