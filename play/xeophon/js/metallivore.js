import { game } from './gstate.js';
import { rn2 } from './rng.js';

const WEAPON_CLASS = 1;
const ARMOR_CLASS = 2;
const RING_CLASS = 3;
const FOOD_CLASS = 7;
const SCROLL_CLASS = 8;
const POTION_CLASS = 9;
const WAND_CLASS = 10;
const SPBOOK_CLASS = 10003;
const TOOL_CLASS = 12;
const GEM_CLASS = 14;
const AMULET_CLASS = 15;
const GOLD_PIECE = 466;
const KELP_FROND = 172;
const DART = 353;
const ORCISH_DAGGER = 10020;

const METALLIVORE_MONSTERS = new Set(['rock mole', 'rust monster', 'xorn']);
export const METALLIC_MATERIALS = new Set(['iron', 'metal', 'copper', 'silver', 'gold', 'platinum', 'mithril']);

const RING_APPEARANCE_MATERIALS = new Map([
    ['wooden', 'wood'], ['granite', 'mineral'], ['opal', 'mineral'], ['clay', 'mineral'],
    ['coral', 'mineral'], ['black onyx', 'mineral'], ['moonstone', 'mineral'],
    ['tiger eye', 'gemstone'], ['jade', 'gemstone'], ['bronze', 'copper'],
    ['agate', 'gemstone'], ['topaz', 'gemstone'], ['sapphire', 'gemstone'],
    ['ruby', 'gemstone'], ['diamond', 'gemstone'], ['pearl', 'bone'],
    ['iron', 'iron'], ['brass', 'copper'], ['copper', 'copper'], ['twisted', 'iron'],
    ['steel', 'iron'], ['silver', 'silver'], ['gold', 'gold'], ['ivory', 'bone'],
    ['emerald', 'gemstone'], ['wire', 'iron'], ['engagement', 'iron'], ['shiny', 'iron'],
]);

const RING_KIND_MATERIALS = new Map([
    ['ring of adornment', 'wood'], ['ring of gain strength', 'mineral'],
    ['ring of gain constitution', 'mineral'], ['ring of increase accuracy', 'mineral'],
    ['ring of increase damage', 'mineral'], ['ring of protection', 'mineral'],
    ['ring of regeneration', 'mineral'], ['ring of searching', 'gemstone'],
    ['ring of stealth', 'gemstone'], ['ring of sustain ability', 'copper'],
    ['ring of levitation', 'gemstone'], ['ring of hunger', 'gemstone'],
    ['ring of aggravate monster', 'gemstone'], ['ring of conflict', 'gemstone'],
    ['ring of warning', 'gemstone'], ['ring of poison resistance', 'bone'],
    ['ring of fire resistance', 'iron'], ['ring of cold resistance', 'copper'],
    ['ring of shock resistance', 'copper'], ['ring of free action', 'iron'],
    ['ring of slow digestion', 'iron'], ['ring of teleportation', 'silver'],
    ['ring of teleport control', 'gold'], ['ring of polymorph', 'bone'],
    ['ring of polymorph control', 'gemstone'], ['ring of invisibility', 'iron'],
    ['ring of see invisible', 'iron'], ['ring of protection from shape changers', 'iron'],
]);

const WAND_APPEARANCE_MATERIALS = new Map([
    ['glass', 'glass'], ['balsa', 'wood'], ['crystal', 'glass'], ['maple', 'wood'],
    ['pine', 'wood'], ['redwood', 'wood'], ['oak', 'wood'], ['ebony', 'wood'],
    ['marble', 'mineral'], ['tin', 'metal'], ['brass', 'copper'], ['copper', 'copper'],
    ['silver', 'silver'], ['platinum', 'platinum'], ['iridium', 'metal'], ['zinc', 'metal'],
    ['aluminum', 'metal'], ['uranium', 'metal'], ['iron', 'iron'], ['steel', 'iron'],
    ['hexagonal', 'iron'], ['short', 'iron'], ['runed', 'iron'], ['long', 'iron'],
    ['curved', 'iron'], ['forked', 'wood'], ['spiked', 'iron'], ['jeweled', 'iron'],
]);

const METAL_OBJECT_MATERIALS = new Map([
    ['gold piece', 'gold'], ['gold pieces', 'gold'], ['arrow', 'iron'], ['arrows', 'iron'],
    ['orcish arrow', 'iron'], ['crude arrow', 'iron'], ['silver arrow', 'silver'],
    ['ya', 'metal'], ['crossbow bolt', 'iron'], ['crossbow bolts', 'iron'],
    ['dart', 'iron'], ['darts', 'iron'], ['shuriken', 'iron'], ['throwing star', 'iron'],
    ['spear', 'iron'], ['orcish spear', 'iron'], ['crude spear', 'iron'],
    ['dwarvish spear', 'iron'], ['silver spear', 'silver'], ['javelin', 'iron'],
    ['throwing spear', 'iron'], ['trident', 'iron'], ['dagger', 'iron'],
    ['orcish dagger', 'iron'], ['crude dagger', 'iron'], ['silver dagger', 'silver'],
    ['athame', 'iron'], ['scalpel', 'metal'], ['knife', 'iron'], ['stiletto', 'iron'],
    ['axe', 'iron'], ['battle-axe', 'iron'], ['short sword', 'iron'],
    ['orcish short sword', 'iron'], ['crude short sword', 'iron'],
    ['dwarvish short sword', 'iron'], ['scimitar', 'iron'], ['silver saber', 'silver'],
    ['broadsword', 'iron'], ['long sword', 'iron'], ['two-handed sword', 'iron'],
    ['katana', 'iron'], ['samurai sword', 'iron'], ['tsurugi', 'metal'],
    ['runesword', 'iron'], ['partisan', 'iron'], ['ranseur', 'iron'], ['spetum', 'iron'],
    ['glaive', 'iron'], ['halberd', 'iron'], ['bardiche', 'iron'], ['voulge', 'iron'],
    ['fauchard', 'iron'], ['guisarme', 'iron'], ['bill-guisarme', 'iron'],
    ['lucern hammer', 'iron'], ['bec de corbin', 'iron'], ['dwarvish mattock', 'iron'],
    ['lance', 'iron'], ['mace', 'iron'], ['silver mace', 'silver'],
    ['morning star', 'iron'], ['war hammer', 'iron'], ['aklys', 'iron'], ['flail', 'iron'],
    ['orcish helm', 'iron'], ['dwarvish iron helm', 'iron'], ['dented pot', 'iron'],
    ['helmet', 'iron'], ['helm of caution', 'iron'], ['helm of opposite alignment', 'iron'],
    ['helm of telepathy', 'iron'], ['plate mail', 'iron'], ['bronze plate mail', 'copper'],
    ['splint mail', 'iron'], ['banded mail', 'iron'], ['dwarvish mithril-coat', 'mithril'],
    ['elven mithril-coat', 'mithril'], ['chain mail', 'iron'], ['orcish chain mail', 'iron'],
    ['crude chain mail', 'iron'], ['scale mail', 'iron'], ['ring mail', 'iron'],
    ['orcish ring mail', 'iron'], ['crude ring mail', 'iron'], ['uruk-hai shield', 'iron'],
    ['orcish shield', 'iron'], ['large shield', 'iron'], ['dwarvish roundshield', 'iron'],
    ['shield of reflection', 'silver'], ['gauntlets of power', 'iron'],
    ['iron shoes', 'iron'], ['kicking boots', 'iron'], ['hard shoes', 'iron'],
    ['heavy iron ball', 'iron'], ['iron chain', 'iron'], ['skeleton key', 'iron'],
    ['lock pick', 'iron'], ['brass lantern', 'copper'], ['oil lamp', 'copper'],
    ['magic lamp', 'copper'], ['stethoscope', 'iron'], ['tinning kit', 'iron'],
    ['tin opener', 'iron'], ['can of grease', 'iron'], ['land mine', 'iron'],
    ['beartrap', 'iron'], ['tin whistle', 'metal'], ['magic whistle', 'metal'],
    ['bell', 'copper'], ['bugle', 'copper'], ['pick-axe', 'iron'],
    ['grappling hook', 'iron'], ['candelabrum of invocation', 'gold'],
    ['bell of opening', 'silver'], ['amulet of yendor', 'mithril'],
]);

export function normalizeMetallivoreMaterial(material) {
    const text = String(material || '').toLowerCase().replace(/^hi_/, '');
    if (!text) return '';
    if (text === 'steel') return 'iron';
    if (text === 'brass' || text === 'bronze') return 'copper';
    if (['tin', 'zinc', 'aluminum', 'aluminium', 'iridium', 'uranium'].includes(text)) return 'metal';
    return text;
}

export function metallivoreObjectKind(obj) {
    return String(obj?.actualKind || obj?.kind || obj?.name || obj?.artifact || '')
        .toLowerCase()
        .replace(/ named .+$/i, '')
        .replace(/^(?:the |an? )/, '')
        .replace(/^pair of /, '');
}

export function objectIsRingLike(obj) {
    return obj?.otyp === RING_CLASS || obj?.cls === 'ring' || obj?.glyph === '=';
}

export function objectIsAmuletLike(obj) {
    return obj?.otyp === AMULET_CLASS || obj?.cls === 'amulet' || obj?.glyph === '"';
}

function objectIsWandLike(obj) {
    return obj?.otyp === WAND_CLASS || obj?.cls === 'wand' || obj?.glyph === '/';
}

function objectIsGenericRandomTool(obj) {
    return obj?.otyp === TOOL_CLASS && obj?.cls === 'tool';
}

function objectIsGenericRandomWand(obj) {
    return obj?.otyp === WAND_CLASS && (obj?.cls === 'wand' || obj?.glyph === '/' || obj?.wandIndex != null);
}

function metallivoreObjectClass(obj) {
    if (obj?.otyp === GOLD_PIECE || obj?.glyph === '$' || obj?.cls === 'coin') return GOLD_PIECE;
    if (obj?.otyp === WEAPON_CLASS || obj?.cls === 'weapon' || obj?.glyph === ')' || obj?.otyp === DART || obj?.otyp === ORCISH_DAGGER) return WEAPON_CLASS;
    if (obj?.otyp === ARMOR_CLASS || obj?.cls === 'armor' || obj?.glyph === '[') return ARMOR_CLASS;
    if (obj?.otyp === FOOD_CLASS || obj?.otyp === KELP_FROND || obj?.cls === 'food' || obj?.foodRoll) return FOOD_CLASS;
    if (obj?.otyp === GEM_CLASS || obj?.cls === 'gem' || obj?.glyph === '*') return GEM_CLASS;
    if (obj?.otyp === POTION_CLASS || obj?.cls === 'potion' || obj?.glyph === '!') return POTION_CLASS;
    if (obj?.otyp === SCROLL_CLASS || obj?.cls === 'scroll' || obj?.glyph === '?') return SCROLL_CLASS;
    if (obj?.otyp === WAND_CLASS || obj?.cls === 'wand' || obj?.glyph === '/') return WAND_CLASS;
    if (obj?.otyp === SPBOOK_CLASS || obj?.cls === 'spellbook') return SPBOOK_CLASS;
    if (obj?.otyp === TOOL_CLASS || obj?.cls === 'tool' || obj?.glyph === '(') return TOOL_CLASS;
    if (objectIsRingLike(obj)) return RING_CLASS;
    if (objectIsAmuletLike(obj)) return AMULET_CLASS;
    return obj?.otyp;
}

function ringMaterialForMetallivore(obj, kind) {
    const ringName = String(obj?.actualKind || kind || '').toLowerCase();
    const appearance = String(obj?.appearance || (
        typeof obj?.kind === 'string' && /\bring$/.test(obj.kind) && !/^ring of /.test(obj.kind)
            ? obj.kind.replace(/\s+ring$/, '')
            : ''
    ) || (obj?.ringRoll ? game._object_descriptions?.rings?.[obj.ringRoll - 1] : '') || '').toLowerCase();
    return normalizeMetallivoreMaterial(RING_APPEARANCE_MATERIALS.get(appearance)
        || RING_KIND_MATERIALS.get(ringName)
        || '');
}

function wandMaterialForMetallivore(obj) {
    const appearance = String(obj?.appearance
        || (obj?.wandIndex != null ? game._object_descriptions?.wands?.[obj.wandIndex]?.description : '')
        || (typeof obj?.kind === 'string' && /\bwand$/.test(obj.kind)
            ? obj.kind.replace(/\s+wand$/, '')
            : '')).toLowerCase();
    return normalizeMetallivoreMaterial(WAND_APPEARANCE_MATERIALS.get(appearance) || '');
}

export function objectMaterialForMetallivore(obj) {
    const explicit = normalizeMetallivoreMaterial(obj?.material || obj?.oc_material);
    if (explicit) return explicit;
    const kind = metallivoreObjectKind(obj);
    if (obj?.otyp === GOLD_PIECE || obj?.cls === 'coin' || obj?.glyph === '$') return 'gold';
    if (obj?.fakeAmuletOfYendor || /cheap plastic imitation/.test(kind)) return 'plastic';
    if (obj?.realAmuletOfYendor || kind === 'amulet of yendor') return 'mithril';
    if (objectIsRingLike(obj)) return ringMaterialForMetallivore(obj, kind);
    if (objectIsAmuletLike(obj)) return 'iron';
    if (objectIsWandLike(obj)) return objectIsGenericRandomWand(obj) ? '' : wandMaterialForMetallivore(obj);
    if (!objectIsGenericRandomTool(obj) && METAL_OBJECT_MATERIALS.has(kind))
        return METAL_OBJECT_MATERIALS.get(kind);
    const cls = metallivoreObjectClass(obj);
    const materialNameClass = [WEAPON_CLASS, ARMOR_CLASS].includes(cls)
        || (cls === TOOL_CLASS && !objectIsGenericRandomTool(obj))
        || obj?.cls === 'ball' || obj?.cls === 'chain';
    if (!materialNameClass) return '';
    if (/\bdragon\b/.test(kind)) return '';
    if (/\b(?:iron|steel)\b/.test(kind)) return 'iron';
    if (/\b(?:copper|brass|bronze)\b/.test(kind)) return 'copper';
    if (/\bsilver\b/.test(kind)) return 'silver';
    if (/\bgold\b/.test(kind)) return 'gold';
    if (/\bplatinum\b/.test(kind)) return 'platinum';
    if (/\bmithril\b/.test(kind)) return 'mithril';
    if (/\b(?:tin|zinc|aluminum|aluminium|iridium|uranium)\b/.test(kind)) return 'metal';
    return '';
}

export function monsterIsMetallivore(mon) {
    return !!mon?.data?.metallivorous || METALLIVORE_MONSTERS.has(mon?.data?.name || '');
}

export function monsterIsRustMonster(mon) {
    return mon?.data?.name === 'rust monster';
}

export function objectIsSlowDigestionRing(obj) {
    if (!objectIsRingLike(obj)) return false;
    const kind = metallivoreObjectKind(obj);
    return obj?.ringRoll === 21 || kind === 'ring of slow digestion'
        || String(obj?.actualKind || '').toLowerCase() === 'ring of slow digestion';
}

export function objectIsStrangulationAmulet(obj) {
    if (!objectIsAmuletLike(obj)) return false;
    const kind = metallivoreObjectKind(obj);
    return obj?.amuletIndex === 2 || kind === 'amulet of strangulation'
        || String(obj?.actualKind || '').toLowerCase() === 'amulet of strangulation';
}

export function metallivoreObjectAlwaysResists(obj) {
    const kind = metallivoreObjectKind(obj);
    return !!(obj?.unique || obj?.oc_unique || obj?.realAmuletOfYendor || obj?.invocationItem
        || kind === 'amulet of yendor'
        || kind === 'candelabrum of invocation'
        || kind === 'bell of opening');
}

export function monsterCouldEatMetalItem(mon, obj, { poisonResistant = () => false } = {}) {
    if (!monsterIsMetallivore(mon) || mon?.pet || mon?.mtame || !obj || obj.transientProjectile) return false;
    if (objectIsStrangulationAmulet(obj) || objectIsSlowDigestionRing(obj)) return false;
    if (obj.opoisoned && !poisonResistant(mon)) return false;
    if (metallivoreObjectAlwaysResists(obj)) return false;
    const material = objectMaterialForMetallivore(obj);
    if (!METALLIC_MATERIALS.has(material)) return false;
    return !(monsterIsRustMonster(mon) && material !== 'iron');
}

export function metallivoreObjectResists(obj) {
    if (metallivoreObjectAlwaysResists(obj)) return true;
    return rn2(100) < (obj?.artifact || obj?.oartifact ? 95 : 5);
}
