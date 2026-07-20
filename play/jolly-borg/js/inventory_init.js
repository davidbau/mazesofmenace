// inventory_init.js — RNG-only simulation of starting inventory.
// C ref: u_init.c (trobj tables + u_init_role) and mkobj.c (weapon init RNG).

import { rn2, rnd, rne } from './rng.js';
import { game } from './gstate.js';

function consume_next_ident() {
    rnd(2);
}

function consume_weapon_init({ multigen, poisonable }) {
    if (multigen) {
        rn2(6); // rn1(6,6)
    }
    if (!rn2(11)) {
        rne(3);
        rn2(2);
    } else if (!rn2(10)) {
        rne(3);
    } else {
        rn2(10); // blessorcurse
    }
    if (poisonable) rn2(100);
}

const OCLASS_PROB_TOTALS = {
    armor: 1000,
    food: 1000,
    gem: 1000,
    potion: 1000,
    ring: 28,
    scroll: 1000,
    spellbook: 1000,
    tool: 1000,
    wand: 1000,
    weapon: 1002,
};

const FOOD_PROBS = [
    { sn: 'TRIPE_RATION', prob: 140 },
    { sn: 'CORPSE', prob: 0 },
    { sn: 'EGG', prob: 85 },
    { sn: 'MEATBALL', prob: 0 },
    { sn: 'MEAT_STICK', prob: 0 },
    { sn: 'ENORMOUS_MEATBALL', prob: 0 },
    { sn: 'GLOB_OF_GRAY_OOZE', prob: 0 },
    { sn: 'GLOB_OF_BROWN_PUDDING', prob: 0 },
    { sn: 'GLOB_OF_GREEN_SLIME', prob: 0 },
    { sn: 'GLOB_OF_BLACK_PUDDING', prob: 0 },
    { sn: 'KELP_FROND', prob: 0 },
    { sn: 'EUCALYPTUS_LEAF', prob: 3 },
    { sn: 'APPLE', prob: 15 },
    { sn: 'ORANGE', prob: 10 },
    { sn: 'PEAR', prob: 10 },
    { sn: 'MELON', prob: 10 },
    { sn: 'BANANA', prob: 10 },
    { sn: 'CARROT', prob: 15 },
    { sn: 'SPRIG_OF_WOLFSBANE', prob: 7 },
    { sn: 'CLOVE_OF_GARLIC', prob: 7 },
    { sn: 'SLIME_MOLD', prob: 75 },
    { sn: 'CREAM_PIE', prob: 25 },
    { sn: 'CANDY_BAR', prob: 13 },
    { sn: 'FORTUNE_COOKIE', prob: 55 },
    { sn: 'PANCAKE', prob: 25 },
    { sn: 'LEMBAS_WAFER', prob: 20 },
    { sn: 'CRAM_RATION', prob: 20 },
    { sn: 'FOOD_RATION', prob: 380 },
    { sn: 'TIN', prob: 75 },
    { sn: 'K_RATION', prob: 0 },
    { sn: 'C_RATION', prob: 0 },
];

function pick_from_probs(list, roll) {
    let cursor = roll;
    for (const entry of list) {
        cursor -= entry.prob;
        if (cursor <= 0) return entry.sn;
    }
    return list[list.length - 1].sn;
}

function consume_food_init(otyp) {
    let skipGeneric = false;
    switch (otyp) {
    case 'KELP_FROND':
        rnd(2);
        skipGeneric = true;
        break;
    case 'EGG':
        if (!rn2(3)) {
            consume_rndmonnum_stub();
        }
        break;
    case 'TIN':
        if (rn2(6) !== 0) {
            consume_rndmonnum_stub();
            rn2(15);
        }
        rn2(10);
        break;
    case 'CORPSE':
    case 'MEAT_RING':
        skipGeneric = true;
        break;
    default:
        break;
    }
    if (!skipGeneric) rn2(6);
}

function consume_tool_init(otyp) {
    switch (otyp) {
    case 'EXPENSIVE_CAMERA':
    case 'TINNING_KIT':
    case 'MAGIC_MARKER':
        rn2(70);
        break;
    case 'SACK':
        rn2(1);
        break;
    default:
        break;
    }
}

function consume_gem_init(otyp) {
    switch (otyp) {
    case 'ROCK':
        rn2(6);
        break;
    case 'FLINT':
        rn2(6);
        break;
    case 'TOUCHSTONE':
        rn2(6);
        break;
    default:
        rn2(6);
        break;
    }
}

function consume_bless_or_curse(chance) {
    if (!rn2(chance)) rn2(2);
}

function consume_mkobj_erosions_stub() {
    if ((game?.moves ?? 0) <= 1 && !game?.in_mklev) return;
    if (rn2(100) !== 0) {
        if (rn2(80) === 0) {
            let eroded = 0;
            do {
                eroded++;
            } while (eroded < 3 && rn2(9) === 0);
        }
        if (rn2(80) === 0) {
            let eroded2 = 0;
            do {
                eroded2++;
            } while (eroded2 < 3 && rn2(9) === 0);
        }
    }
    rn2(1000);
}

function consume_potion_scroll_init() {
    consume_bless_or_curse(4);
}

function consume_spellbook_init() {
    consume_bless_or_curse(17);
}

function consume_armor_init() {
    if (rn2(10) !== 0) {
        if (!rn2(11)) {
            rne(3);
            return;
        }
    }
    if (!rn2(10)) {
        rn2(2);
        rne(3);
        return;
    }
    consume_bless_or_curse(10);
}

function consume_rndmonnum_stub() {
    // rndmonst_adj() weighted reservoir sampling; early-game stub.
    // TODO: replace with real rndmonst_adj implementation.
    rn2(3);
    rn2(4);
    rn2(5);
    rn2(7);
    rn2(8);
    rn2(11);
    rn2(15);
    rn2(16);
    rn2(21);
}

function consume_random_obj(oclass) {
    // mkobj() for a class uses rnd(go.oclass_prob_totals[oclass]).
    // Totals extracted from upstream objects.h via preprocessing.
    const total = OCLASS_PROB_TOTALS[oclass] || 1000;
    const roll = rnd(total);
    if (oclass === 'food') return pick_from_probs(FOOD_PROBS, roll);
    return null;
}

function consume_trquan(item) {
    if (!item.qty) return 1;
    if (!item.qty.min) return 1;
    const range = item.qty.max - item.qty.min + 1;
    return item.qty.min + rn2(range);
}

const ROLE_INVENTORY = {
    Archeologist: [
        { class: 'weapon', multigen: false, poisonable: false, qty: { min: 1, max: 1 } }, // bullwhip
        { class: 'armor', qty: { min: 1, max: 1 } }, // leather jacket
        { class: 'armor', qty: { min: 1, max: 1 } }, // fedora
        { class: 'food', otype: 'FOOD_RATION', qty: { min: 3, max: 3 } },
        { class: 'tool', otype: 'PICK_AXE', qty: { min: 1, max: 1 } },
        { class: 'tool', otype: 'TINNING_KIT', qty: { min: 1, max: 1 }, toolInit: true },
        { class: 'gem', otype: 'TOUCHSTONE', qty: { min: 1, max: 1 } },
        { class: 'tool', otype: 'SACK', qty: { min: 1, max: 1 }, toolInit: true },
    ],
    Barbarian_0: [
        { class: 'weapon', multigen: false, poisonable: false, qty: { min: 1, max: 1 } }, // two-handed sword
        { class: 'weapon', multigen: false, poisonable: false, qty: { min: 1, max: 1 } }, // axe
        { class: 'armor', qty: { min: 1, max: 1 } }, // ring mail
        { class: 'food', otype: 'FOOD_RATION', qty: { min: 1, max: 1 } },
    ],
    Barbarian_1: [
        { class: 'weapon', multigen: false, poisonable: false, qty: { min: 1, max: 1 } }, // battle axe
        { class: 'weapon', multigen: false, poisonable: false, qty: { min: 1, max: 1 } }, // short sword
        { class: 'armor', qty: { min: 1, max: 1 } }, // ring mail
        { class: 'food', otype: 'FOOD_RATION', qty: { min: 1, max: 1 } },
    ],
    Caveman: [
        { class: 'weapon', multigen: false, poisonable: false, qty: { min: 1, max: 1 } }, // club
        { class: 'weapon', multigen: false, poisonable: false, qty: { min: 1, max: 1 } }, // sling
        { class: 'gem', otype: 'FLINT', qty: { min: 10, max: 20 } },
        { class: 'gem', otype: 'ROCK', qty: { min: 3, max: 3 } },
        { class: 'armor', qty: { min: 1, max: 1 } }, // leather armor
    ],
    Healer: [
        { class: 'weapon', multigen: false, poisonable: false, qty: { min: 1, max: 1 } }, // scalpel
        { class: 'armor', qty: { min: 1, max: 1 } }, // leather gloves
        { class: 'tool', otype: 'STETHOSCOPE', qty: { min: 1, max: 1 } },
        { class: 'potion', qty: { min: 4, max: 4 } }, // pot healing
        { class: 'potion', qty: { min: 4, max: 4 } }, // pot extra healing
        { class: 'wand', qty: { min: 1, max: 1 } }, // wand sleep
        { class: 'spellbook', qty: { min: 1, max: 1 } },
        { class: 'spellbook', qty: { min: 1, max: 1 } },
        { class: 'spellbook', qty: { min: 1, max: 1 } },
        { class: 'food', otype: 'APPLE', qty: { min: 5, max: 5 } },
    ],
    Knight: [
        { class: 'weapon', multigen: false, poisonable: false, qty: { min: 1, max: 1 } }, // long sword
        { class: 'weapon', multigen: false, poisonable: false, qty: { min: 1, max: 1 } }, // lance
        { class: 'armor', qty: { min: 1, max: 1 } }, // ring mail
        { class: 'armor', qty: { min: 1, max: 1 } }, // helmet
        { class: 'armor', qty: { min: 1, max: 1 } }, // small shield
        { class: 'armor', qty: { min: 1, max: 1 } }, // leather gloves
        { class: 'food', otype: 'APPLE', qty: { min: 10, max: 10 } },
        { class: 'food', otype: 'CARROT', qty: { min: 10, max: 10 } },
    ],
    Monk: [
        { class: 'armor', qty: { min: 1, max: 1 } }, // leather gloves
        { class: 'armor', qty: { min: 1, max: 1 } }, // robe
        { class: 'random', oclass: 'scroll', qty: { min: 1, max: 1 } },
        { class: 'potion', qty: { min: 3, max: 3 } }, // pot healing
        { class: 'food', otype: 'FOOD_RATION', qty: { min: 3, max: 3 } },
        { class: 'food', otype: 'APPLE', qty: { min: 5, max: 5 } },
        { class: 'food', otype: 'ORANGE', qty: { min: 5, max: 5 } },
        { class: 'food', otype: 'FORTUNE_COOKIE', qty: { min: 3, max: 3 } },
    ],
    Priest: [
        { class: 'weapon', multigen: false, poisonable: false, qty: { min: 1, max: 1 } }, // mace
        { class: 'armor', qty: { min: 1, max: 1 } }, // robe
        { class: 'armor', qty: { min: 1, max: 1 } }, // small shield
        { class: 'potion', qty: { min: 4, max: 4 } }, // holy water
        { class: 'food', otype: 'CLOVE_OF_GARLIC', qty: { min: 1, max: 1 } },
        { class: 'food', otype: 'SPRIG_OF_WOLFSBANE', qty: { min: 1, max: 1 } },
        { class: 'random', oclass: 'spellbook', qty: { min: 2, max: 2 } },
    ],
    Ranger: [
        { class: 'weapon', multigen: false, poisonable: false, qty: { min: 1, max: 1 } }, // dagger
        { class: 'weapon', multigen: false, poisonable: false, qty: { min: 1, max: 1 } }, // bow
        { class: 'weapon', multigen: true, poisonable: true, qty: { min: 50, max: 59 } }, // arrows
        { class: 'weapon', multigen: true, poisonable: true, qty: { min: 30, max: 39 } }, // arrows
        { class: 'armor', qty: { min: 1, max: 1 } }, // cloak of displacement
        { class: 'food', otype: 'CRAM_RATION', qty: { min: 4, max: 4 } },
    ],
    Rogue: [
        { class: 'weapon', multigen: false, poisonable: false, qty: { min: 1, max: 1 } }, // short sword
        { class: 'weapon', multigen: false, poisonable: false, qty: { min: 6, max: 15 } }, // dagger
        { class: 'armor', qty: { min: 1, max: 1 } }, // leather armor
        { class: 'potion', qty: { min: 1, max: 1 } }, // pot sickness
        { class: 'tool', otype: 'LOCK_PICK', qty: { min: 1, max: 1 } },
        { class: 'tool', otype: 'SACK', qty: { min: 1, max: 1 }, toolInit: true },
    ],
    Samurai: [
        { class: 'weapon', multigen: false, poisonable: false, qty: { min: 1, max: 1 } }, // katana
        { class: 'weapon', multigen: false, poisonable: false, qty: { min: 1, max: 1 } }, // wakizashi
        { class: 'weapon', multigen: false, poisonable: false, qty: { min: 1, max: 1 } }, // yumi
        { class: 'weapon', multigen: true, poisonable: true, qty: { min: 26, max: 45 } }, // ya
        { class: 'armor', qty: { min: 1, max: 1 } }, // splint mail
    ],
    Tourist: [
        { class: 'weapon', multigen: true, poisonable: true, qty: { min: 21, max: 40 } }, // dart
        { class: 'random', oclass: 'food', qty: { min: 10, max: 10 } },
        { class: 'potion', qty: { min: 2, max: 2 } }, // extra healing
        { class: 'scroll', qty: { min: 4, max: 4 } }, // magic mapping
        { class: 'armor', qty: { min: 1, max: 1 } }, // hawaiian shirt
        { class: 'tool', otype: 'EXPENSIVE_CAMERA', qty: { min: 1, max: 1 }, toolInit: true },
        { class: 'tool', otype: 'CREDIT_CARD', qty: { min: 1, max: 1 } },
    ],
    Valkyrie: [
        { class: 'weapon', multigen: false, poisonable: false, qty: { min: 1, max: 1 } }, // spear
        { class: 'weapon', multigen: false, poisonable: false, qty: { min: 1, max: 1 } }, // dagger
        { class: 'armor', qty: { min: 1, max: 1 } }, // small shield
        { class: 'food', otype: 'FOOD_RATION', qty: { min: 1, max: 1 } },
    ],
    Wizard: [
        { class: 'weapon', multigen: false, poisonable: false, qty: { min: 1, max: 1 } }, // quarterstaff
        { class: 'armor', qty: { min: 1, max: 1 } }, // cloak of magic resistance
        { class: 'random', oclass: 'wand', qty: { min: 1, max: 1 } },
        { class: 'random', oclass: 'ring', qty: { min: 2, max: 2 } },
        { class: 'random', oclass: 'potion', qty: { min: 3, max: 3 } },
        { class: 'random', oclass: 'scroll', qty: { min: 3, max: 3 } },
        { class: 'spellbook', qty: { min: 1, max: 1 } }, // force bolt
        { class: 'random', oclass: 'spellbook', qty: { min: 1, max: 1 } },
        { class: 'tool', otype: 'MAGIC_MARKER', qty: { min: 1, max: 1 }, toolInit: true, speRand: 4 },
    ],
};

export function consume_role_inventory_rng(roleName) {
    let list = ROLE_INVENTORY[roleName] || [];
    if (roleName === 'Barbarian') {
        list = rn2(100) >= 50 ? ROLE_INVENTORY.Barbarian_0 : ROLE_INVENTORY.Barbarian_1;
    }
    for (const item of list) {
        const outerQuan = consume_trquan(item);
        const repeatCount = (item.class === 'weapon' || item.class === 'tool') ? 1 : outerQuan;
        for (let i = 0; i < repeatCount; i++) {
            let selected = null;
            if (item.class === 'random') {
                selected = consume_random_obj(item.oclass || 'random');
            }
            consume_next_ident();
            if (item.class === 'weapon') {
                consume_weapon_init(item);
            }
            if (item.class === 'food') {
                consume_food_init(item.otype || 'FOOD_RATION');
            } else if (item.class === 'gem') {
                consume_gem_init(item.otype || 'GEM');
            } else if (item.class === 'tool' && item.toolInit) {
                consume_tool_init(item.otype || 'TOOL');
            } else if (item.class === 'potion' || item.class === 'scroll') {
                consume_potion_scroll_init();
            } else if (item.class === 'spellbook') {
                consume_spellbook_init();
            } else if (item.class === 'armor') {
                consume_armor_init();
            }
            if (item.class === 'random' && item.oclass === 'food' && selected) {
                consume_food_init(selected);
            } else if (item.class === 'random' && (item.oclass === 'potion' || item.oclass === 'scroll')) {
                consume_potion_scroll_init();
            } else if (item.class === 'random' && item.oclass === 'spellbook') {
                consume_spellbook_init();
            }
            consume_mkobj_erosions_stub();
        }
        if (item.class === 'weapon' || item.class === 'tool') {
            consume_trquan(item);
            if (item.speRand) rn2(item.speRand);
        }
    }
}

export function consume_role_extras_rng(roleName) {
    switch (roleName) {
    case 'Archeologist':
        if (rn2(10) !== 0) {
            if (rn2(4) !== 0) rn2(5);
        }
        break;
    case 'Barbarian':
        rn2(6);
        break;
    case 'Healer':
        rn2(25);
        break;
    case 'Monk':
        rn2(90);
        if (rn2(4) !== 0) rn2(10);
        break;
    case 'Priest':
        if (rn2(5) !== 0) rn2(10);
        break;
    case 'Rogue':
        rn2(5);
        break;
    case 'Samurai':
        rn2(5);
        break;
    case 'Tourist':
        if (rn2(25) !== 0) {
            if (rn2(25) !== 0) {
                if (rn2(25) !== 0) rn2(20);
            }
        }
        break;
    case 'Valkyrie':
        rn2(6);
        break;
    case 'Wizard':
        rn2(5);
        break;
    default:
        break;
    }
}

export function consume_money_rng() {
    consume_trquan({ qty: { min: 1, max: 1 } });
    consume_next_ident();
    consume_mkobj_erosions_stub();
}
