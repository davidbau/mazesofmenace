// o_init.js — Object initialization.
// C ref: o_init.c — shuffle gem colors, potion descriptions, etc.
//
import { rn2 } from './rng.js';
import { OBJECT_COLOR, OBJECT_MATERIAL } from './object_data.js';

let objectColors = [...OBJECT_COLOR];
let objectMaterials = [...OBJECT_MATERIAL];

const TURQUOISE = 446;
const AQUAMARINE = 448;
const FLUORITE = 457;
const DIAMOND = 440;
const SAPPHIRE = 443;
const EMERALD = 445;

// C ref: o_init.c:shuffle_all() ranges after obj_shuffle_range().
const SHUFFLE_RANGES = [
    [201, 211, true], // amulets, excluding fake/real Amulet of Yendor
    [297, 321, true], // potions, excluding water
    [173, 200, true], // rings
    [323, 363, true], // magical scroll descriptions
    [366, 406, true], // magical spellbook descriptions
    [410, 437, true], // wands
    [479, 480, true], // venoms
    [97, 100, false], // helms
    [159, 162, false], // gloves
    [146, 149, false], // magical cloaks
    [166, 172, false], // boots
];

// C ref: o_init.c:init_objects().
// This preserves the general RNG shape for description shuffles. Runtime
// object identity state is still carried by object_data.js/static defaults;
// the actual descr/material swaps need to be wired into object lookup later.
export function init_objects() {
    objectColors = [...OBJECT_COLOR];
    objectMaterials = [...OBJECT_MATERIAL];
    randomize_gem_colors();
    shuffle_all();
    // C ref: objects[WAN_NOTHING].oc_dir = rn2(2) ? NODIR : IMMEDIATE.
    rn2(2);
}

export function getObjectColor(otyp) {
    return objectColors[otyp] ?? OBJECT_COLOR[otyp];
}

export function getObjectMaterial(otyp) {
    return objectMaterials[otyp] ?? OBJECT_MATERIAL[otyp];
}

function copy_descr(dst, src) {
    objectColors[dst] = objectColors[src];
}

function randomize_gem_colors() {
    if (rn2(2)) copy_descr(TURQUOISE, SAPPHIRE);
    if (rn2(2)) copy_descr(AQUAMARINE, SAPPHIRE);
    switch (rn2(4)) {
    case 1:
        copy_descr(FLUORITE, SAPPHIRE);
        break;
    case 2:
        copy_descr(FLUORITE, DIAMOND);
        break;
    case 3:
        copy_descr(FLUORITE, EMERALD);
        break;
    default:
        break;
    }
}

function shuffle_range(low, high, domaterial) {
    for (let j = low; j <= high; j++) {
        const i = j + rn2(high - j + 1);
        [objectColors[j], objectColors[i]] = [objectColors[i], objectColors[j]];
        if (domaterial) {
            [objectMaterials[j], objectMaterials[i]] = [objectMaterials[i], objectMaterials[j]];
        }
    }
}

function shuffle_all() {
    for (const [low, high, domaterial] of SHUFFLE_RANGES) {
        shuffle_range(low, high, domaterial);
    }
}
