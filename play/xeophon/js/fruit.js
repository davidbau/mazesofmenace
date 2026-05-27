import { game } from './gstate.js';

export const SLIME_MOLD_OTYP = 11009;
export const DEFAULT_FRUIT_NAME = 'slime mold';
const DEFAULT_FRUIT_ID = 1;
const FRUIT_NAME_LIMIT = 31;

function compactFruitName(name) {
    return String(name || '').replace(/\s+/g, ' ').trim() || DEFAULT_FRUIT_NAME;
}

export function singularFruitName(name) {
    const text = compactFruitName(name);
    if (/\bies$/i.test(text)) return text.replace(/ies$/i, 'y');
    if (/\b(?:sses|xes|zes|ches|shes)$/i.test(text)) return text.replace(/es$/i, '');
    if (/\bs$/i.test(text) && !/\bss$/i.test(text)) return text.slice(0, -1);
    return text;
}

export function pluralFruitName(name) {
    const text = singularFruitName(name);
    if (/[^aeiou]y$/i.test(text)) return `${text.slice(0, -1)}ies`;
    if (/(?:s|x|z|ch|sh)$/i.test(text)) return `${text}es`;
    return `${text}s`;
}

function fruitRegistry() {
    if (!Array.isArray(game._fruit_registry) || !game._fruit_registry.length) {
        const initial = singularFruitName(game._fruit || game.flags?.fruit || DEFAULT_FRUIT_NAME).slice(0, FRUIT_NAME_LIMIT);
        game._fruit_registry = [{ fid: DEFAULT_FRUIT_ID, fname: initial }];
        game._current_fruit_id = DEFAULT_FRUIT_ID;
        game._fruit = initial;
        game.flags ??= {};
        game.flags.fruit = initial;
    }
    return game._fruit_registry;
}

function fruitRecordById(fid) {
    return fruitRegistry().find(fruit => fruit.fid === fid) || null;
}

function findFruitRecord(name) {
    const target = compactFruitName(name);
    return fruitRegistry().find(fruit => fruit.fname === target)
        || fruitRegistry().find(fruit => fruit.fname.toLowerCase() === target.toLowerCase())
        || null;
}

function addFruitRecord(name) {
    const fname = singularFruitName(name).slice(0, FRUIT_NAME_LIMIT);
    const existing = findFruitRecord(fname);
    if (existing) return existing;
    const used = fruitRegistry().map(fruit => fruit.fid);
    const fid = Math.max(DEFAULT_FRUIT_ID, ...used) + 1;
    const record = { fid, fname };
    game._fruit_registry.unshift(record);
    return record;
}

export function setCurrentFruitName(name) {
    const record = addFruitRecord(name || DEFAULT_FRUIT_NAME);
    game._current_fruit_id = record.fid;
    game._fruit = record.fname;
    game.flags ??= {};
    game.flags.fruit = record.fname;
    game.flags.made_fruit = false;
    return record;
}

export function currentFruitRecord() {
    const wanted = singularFruitName(game._fruit || game.flags?.fruit || DEFAULT_FRUIT_NAME);
    const current = fruitRecordById(game._current_fruit_id);
    if (current && current.fname === wanted) return current;
    return setCurrentFruitName(wanted);
}

export function currentFruitId() {
    return currentFruitRecord().fid;
}

export function currentFruitName() {
    return currentFruitRecord().fname;
}

export function fruitNameForId(fid) {
    return fruitRecordById(fid)?.fname || 'fruit';
}

export function fruitPluralForId(fid) {
    return pluralFruitName(fruitNameForId(fid));
}

export function applySlimeMoldFruitFields(obj, fid = currentFruitId()) {
    if (!obj) return obj;
    const name = fruitNameForId(fid);
    obj.otyp = SLIME_MOLD_OTYP;
    obj.cls = 'food';
    obj.glyph = '%';
    obj.kind = name;
    obj.actualKind = DEFAULT_FRUIT_NAME;
    obj.singular = name;
    obj.plural = pluralFruitName(name);
    obj.spe = fid;
    obj.nutrition = 250;
    obj.owt = 5;
    game.flags ??= {};
    game.flags.made_fruit = true;
    return obj;
}

export function slimeMoldNameForObject(obj, plural = false) {
    const fid = obj?.spe || currentFruitId();
    return plural ? fruitPluralForId(fid) : fruitNameForId(fid);
}

export function fruitWishMatch(name) {
    const target = compactFruitName(name);
    if (target.toLowerCase() === 'fruit') {
        const current = currentFruitRecord();
        return { fid: current.fid, fname: current.fname, plural: false };
    }
    if (target.toLowerCase() === 'fruits') {
        const current = currentFruitRecord();
        return { fid: current.fid, fname: current.fname, plural: true };
    }
    for (const fruit of fruitRegistry()) {
        const singular = singularFruitName(fruit.fname);
        const plural = pluralFruitName(fruit.fname);
        if (target === fruit.fname || target === singular
            || target.toLowerCase() === fruit.fname.toLowerCase()
            || target.toLowerCase() === singular.toLowerCase())
            return { fid: fruit.fid, fname: fruit.fname, plural: false };
        if (target === plural || target.toLowerCase() === plural.toLowerCase())
            return { fid: fruit.fid, fname: fruit.fname, plural: true };
    }
    return null;
}

export function currentFruitJuiceName() {
    const name = currentFruitName();
    const match = name.match(/\bof\s+(.+)$/i);
    const base = match ? match[1] : name;
    return `${singularFruitName(base)} juice`;
}
