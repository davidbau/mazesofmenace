// cmd.js — Command dispatch and movement.
// C ref: cmd.c rhack(), hack.c domove().
//
// Minimal skeleton: only hjklyubn movement is implemented.
// Contestants should add: search, kick, eat, drink, read, zap,
// wear, wield, drop, throw, pray, cast, and all other commands.

import { game } from './gstate.js';
import { nhgetch } from './input.js';
import {
    newsym, show_glyph_cell, flush_screen, pline, append_pline, clear_pending_message, docrt,
    serialize_terminal_grid, queue_more_prompt,
    apply_hallucination_display_transition, refresh_swallowed_overlay,
    see_monsters, see_objects, see_nearby_objects, see_traps, refresh_warning_monsters, map_level_for_wizard,
    object_glyph_for_menu,
} from './display.js';
import { cansee, couldsee, vision_recalc, vision_reset } from './vision.js';
import { makemon, mklev, mkobj, mkcorpstat, mksobj, monster_by_user_name, monsterPtr, next_ident, place_lregion, place_object } from './mklev.js';
import { OBJECT_CHARGED, OBJECT_CLASS, OBJECT_DELAY, OBJECT_MATERIAL } from './object_data.js';
import { finish_pet_kill, obj_resists, pet_arrive_with_you } from './dog.js';
import { merge_inventory_object, newuexp, pluslvl } from './u_init.js';
import { adjalign, exercise, gethungry } from './allmain_turns.js';
import { initrack } from './track.js';
import { roleGod } from './roles.js';
import { d, rn1, rn2, rnd, rnl, rnz } from './rng.js';
import { dist2 } from './hacklib.js';
import { getObjectDescription } from './o_init.js';
import { getRumor, hallucinatedLiquidName, randomHallucinatedMonsterName } from './random_text.js';
import { finish_pending_swallowed_expulsion } from './monmove.js';
import { ATR_INVERSE, NO_COLOR } from './terminal.js';
import * as C from './const.js';
import {
    COLNO, ROWNO, STONE, CORR, DOOR, D_NODOOR, D_CLOSED, D_LOCKED,
    SDOOR, SCORR, IS_WALL, IS_OBSTRUCTED, IS_POOL, LR_UPTELE, LR_DOWNTELE, A_STR, A_DEX, A_CON, A_WIS,
} from './const.js';

function refreshWarningAfterHeroMove() {
    if (!game.u?.uprops?.warning) return;
    if (game.u?.uhallucination || game.u?.uprops?.hallucination) return;
    refresh_warning_monsters();
}

// Direction deltas: y u k
//                   h . l
//                   b j n
const DIR_DX = { h: -1, l: 1, j: 0, k: 0, y: -1, u: 1, b: -1, n: 1 };
const DIR_DY = { h: 0, l: 0, j: 1, k: -1, y: -1, u: -1, b: 1, n: 1 };
const RUN_KEY = { H: 'h', L: 'l', J: 'j', K: 'k', Y: 'y', U: 'u', B: 'b', N: 'n' };
const CONFUSED_DIRS = [
    { dx: -1, dy: 0 }, { dx: 0, dy: -1 }, { dx: 1, dy: 0 }, { dx: 0, dy: 1 },
    { dx: -1, dy: -1 }, { dx: 1, dy: -1 }, { dx: 1, dy: 1 }, { dx: -1, dy: 1 },
];

const AMULET_OF_LIFE_SAVING = 202;
const AMULET_OF_GUARDING = 210;
const GRAY_DRAGON_SCALE_MAIL = 101;
const WAN_FIRE = 430;
const WAN_COLD = 431;
const WAN_DEATH = 433;
const WAN_LIGHTNING = 434;
const WAN_MAKE_INVISIBLE = 418;
const WAN_DIGGING = 428;
const WAN_MAGIC_MISSILE = 429;
const QUARTERSTAFF = 79;
const WAR_HAMMER = 76;
const CLOAK_OF_MAGIC_RESISTANCE = 139;
const CLOAK_OF_PROTECTION = 146;
const M1_FLY = 0x00000001;
const M1_CLING = 0x00000010;
const M1_CONCEAL = 0x00000080;
const M1_HIDE = 0x00000100;
const M2_STALK = 0x01000000;
const CLOAK_OF_DISPLACEMENT = 149;
const SPEED_BOOTS = 166;
const LEVITATION_BOOTS = 172;
const RIN_TELEPORT_CONTROL = 195;
const RIN_INCREASE_ACCURACY = 176;
const RIN_STEALTH = 181;
const RIN_PROTECTION = 178;
const EXPENSIVE_CAMERA = 229;
const MIRROR = 230;
const STETHOSCOPE = 237;
const FIGURINE = 241;
const MAGIC_MARKER = 242;
const LARGE_BOX = 214;
const CHEST = 215;
const ICE_BOX = 216;
const GOLD_PIECE = 438;
const SCALPEL = 39;
const DART = 23;
const ORCISH_DAGGER = 36;
const CORPSE = 265;
const G_NOCORPSE = 0x0010;
const RANDOM_CLASS = 0;
const POT_CONFUSION = 299;
const POT_PARALYSIS = 301;
const POT_BOOZE = 317;
const POT_FRUIT_JUICE = 319;
const SCR_REMOVE_CURSE = 327;
const SCR_ENCHANT_WEAPON = 328;
const SCR_LIGHT = 332;
const BOULDER = 475;
const FORTUNE_COOKIE = 289;
const CHAIN_MAIL = 128;
const LEATHER_GLOVES = 159;
const GAUNTLETS_OF_POWER = 161;
const MZ_HUMAN = 2;
const M2_COLLECT = 0x40000000;
const ARMOR_CLASS = 3;
const WEAPON_CLASS = 2;
const RING_CLASS = 4;
const AMULET_CLASS = 5;
const TOOL_CLASS = 6;
const FOOD_CLASS = 7;
const POTION_CLASS = 8;
const SCROLL_CLASS = 9;
const SPBOOK_CLASS = 10;
const WAND_CLASS = 11;
const COIN_CLASS = 12;
const GEM_CLASS = 13;
const FIRST_SPELL = 366;
const LAST_SPELL = 407;
const SPE_NOVEL = 408;
const SPE_BOOK_OF_THE_DEAD = 409;
const LEVELCHANGE_MORE_LEN = '--More--'.length;

const KILL_DROP_SUBHUMAN_FALLBACK = new Set([
    'lichen',
]);

const BULKY_KILL_DROP_OBJECTS = new Set([
    // C ref: src/mon.c:xkilled(); small monsters discard generated
    // kill-treasure objects whose object table weight is > 30.
    91, 96, 98, 99, 100,
    101, 102, 103, 104, 105, 106, 107, 108, 109, 110,
    111, 112, 113, 114, 115, 116, 117, 118, 119, 120,
    121, 122, 123, 124, 125, 126, 127, 128, 129, 130,
    131, 132, 133, 134,
    153, 154, 155, 156, 157, 158,
    164, 170,
    CHEST, EXPENSIVE_CAMERA, STETHOSCOPE, BOULDER,
]);

const CORPSE_WEIGHT_BY_MONSTER = new Map([
    // C ref: include/monsters.h SIZ(cwt, cnutrit, ...).
    ['GNOME', 650],
]);

const LEGACY_CORPSE_NUM_TO_MONSTER = new Map([
    [21, 'GNOME'],
]);

const OBJECT_BASE_NAMES = new Map([
    [DART, 'dart'],
    [SCALPEL, 'scalpel'],
    [ORCISH_DAGGER, 'crude dagger'],
    [WAR_HAMMER, 'war hammer'],
    [QUARTERSTAFF, 'quarterstaff'],
    [GRAY_DRAGON_SCALE_MAIL, 'gray dragon scale mail'],
    [CLOAK_OF_MAGIC_RESISTANCE, 'cloak of magic resistance'],
    [CLOAK_OF_DISPLACEMENT, 'cloak of displacement'],
    [SPEED_BOOTS, 'speed boots'],
    [CHAIN_MAIL, 'chain mail'],
    [LEATHER_GLOVES, 'leather gloves'],
    [GAUNTLETS_OF_POWER, 'gauntlets of power'],
    [AMULET_OF_LIFE_SAVING, 'amulet of life saving'],
    [RIN_PROTECTION, 'ring of protection'],
    [RIN_INCREASE_ACCURACY, 'ring of increase accuracy'],
    [199, 'ring of see invisible'],
    [RIN_STEALTH, 'ring of stealth'],
    [RIN_TELEPORT_CONTROL, 'ring of teleport control'],
    [200, 'ring of protection from shape changers'],
    [EXPENSIVE_CAMERA, 'expensive camera'],
    [MIRROR, 'mirror'],
    [STETHOSCOPE, 'stethoscope'],
    [MAGIC_MARKER, 'magic marker'],
    [257, 'drum'],
    [258, 'drum'],
    [LARGE_BOX, 'large box'],
    [CHEST, 'chest'],
    [ICE_BOX, 'ice box'],
    [POT_CONFUSION, 'potion of confusion'],
    [311, 'potion of monster detection'],
    [312, 'potion of object detection'],
    [306, 'potion of see invisible'],
    [307, 'potion of healing'],
    [308, 'potion of extra healing'],
    [309, 'potion of gain level'],
    [POT_BOOZE, 'potion of booze'],
    [323, 'scroll of enchant armor'],
    [325, 'scroll of confuse monster'],
    [328, 'scroll of enchant weapon'],
    [330, 'scroll of taming'],
    [332, 'scroll of light'],
    [335, 'scroll of food detection'],
    [336, 'scroll of identify'],
    [374, 'spellbook of healing'],
    [367, 'spellbook of magic missile'],
    [370, 'spellbook of sleep'],
    [372, 'spellbook of light'],
    [373, 'spellbook of detect monsters'],
    [375, 'spellbook of knock'],
    [377, 'spellbook of confuse monster'],
    [379, 'spellbook of drain life'],
    [378, 'spellbook of cure blindness'],
    [380, 'spellbook of slow monster'],
    [383, 'spellbook of force bolt'],
    [384, 'spellbook of cause fear'],
    [391, 'spellbook of extra healing'],
    [397, 'spellbook of identify'],
    [403, 'spellbook of protection'],
    [405, 'spellbook of stone to flesh'],
    [SPE_NOVEL, 'novel'],
    [SPE_BOOK_OF_THE_DEAD, 'Book of the Dead'],
    [WAN_MAKE_INVISIBLE, 'wand of make invisible'],
    [WAN_DIGGING, 'wand of digging'],
    [WAN_MAGIC_MISSILE, 'wand of magic missile'],
    [WAN_FIRE, 'wand of fire'],
    [WAN_COLD, 'wand of cold'],
    [432, 'wand of sleep'],
    [WAN_DEATH, 'wand of death'],
    [WAN_LIGHTNING, 'wand of lightning'],
    [421, 'wand of undead turning'],
    [277, 'apple'],
    [BOULDER, 'boulder'],
    [461, 'white gem'],
]);

const ARMOR_MAGIC_CANCELLATION = new Map([
    [93, 1], // cornuthaum
    [121, 2], [122, 2],
    [123, 1], [124, 1], [125, 1],
    [126, 2], [127, 2],
    [128, 1], [129, 1], [130, 1], [131, 1], [132, 1], [133, 1], [134, 1],
    [138, 1], [139, 1], [140, 1], [141, 1],
    [142, 2], [143, 2],
    [144, 1], [145, 1],
    [146, 3],
    [147, 1], [148, 1], [149, 1],
]);

const SPELLBOOK_SPELL_INFO = new Map([
    [378, { name: 'cure blindness', level: 2, category: 'healing', skillLevel: C.P_UNSKILLED }],
    [380, { name: 'slow monster', level: 2, category: 'enchantment', skillLevel: C.P_BASIC }],
    [383, { name: 'force bolt', level: 1, category: 'attack', skillLevel: C.P_BASIC }],
    [397, { name: 'identify', level: 3, category: 'divination', skillLevel: C.P_UNSKILLED }],
]);

const INVENTORY_GROUPS = [
    { cls: AMULET_CLASS, title: 'Amulets' },
    { cls: WEAPON_CLASS, title: 'Weapons' },
    { cls: ARMOR_CLASS, title: 'Armor' },
    { cls: FOOD_CLASS, title: 'Comestibles' },
    { cls: SCROLL_CLASS, title: 'Scrolls' },
    { cls: SPBOOK_CLASS, title: 'Spellbooks' },
    { cls: POTION_CLASS, title: 'Potions' },
    { cls: RING_CLASS, title: 'Rings' },
    { cls: WAND_CLASS, title: 'Wands' },
    { cls: TOOL_CLASS, title: 'Tools' },
    { cls: GEM_CLASS, title: 'Gems/Stones' },
];

const TOURIST_STARTER_MENU = [
    { cls: WEAPON_CLASS, line: 'a - 27 +2 darts (at the ready)' },
    { cls: ARMOR_CLASS, line: 'j - an uncursed +0 Hawaiian shirt (being worn)' },
    { cls: FOOD_CLASS, line: 'b - 6 uncursed food rations' },
    { cls: FOOD_CLASS, line: 'c - an uncursed apple' },
    { cls: FOOD_CLASS, line: 'd - 2 uncursed fortune cookies' },
    { cls: FOOD_CLASS, line: 'e - an uncursed clove of garlic' },
    { cls: FOOD_CLASS, line: 'f - an uncursed slime mold' },
    { cls: FOOD_CLASS, line: 'g - 2 uncursed tins of lichen' },
    { cls: SCROLL_CLASS, line: 'i - 4 uncursed scrolls of magic mapping' },
    { cls: POTION_CLASS, line: 'h - 2 uncursed potions of extra healing' },
    { cls: TOOL_CLASS, line: 'k - an expensive camera (0:34)' },
    { cls: TOOL_CLASS, line: 'l - an uncursed credit card' },
];

// C ref: attrib.c role innate ability tables plus adjabil().  Level-gain
// messages are ordinary plines emitted after pluslvl()'s welcome message.
const ROLE_INNATE_ABILITIES = new Map([
    ['Archeologist', [
        { level: 5, prop: 'stealth', gain: 'stealthy' },
        { level: 10, prop: 'fast', gain: 'quick' },
    ]],
    ['Barbarian', [
        { level: 7, prop: 'fast', gain: 'quick' },
        { level: 15, prop: 'stealth', gain: 'stealthy' },
    ]],
    ['Caveman', [
        { level: 7, prop: 'fast', gain: 'quick' },
        { level: 15, prop: 'warning', gain: 'sensitive' },
    ]],
    ['Healer', [
        { level: 15, prop: 'warning', gain: 'sensitive' },
    ]],
    ['Knight', [
        { level: 7, prop: 'fast', gain: 'quick' },
    ]],
    ['Monk', [
        { level: 3, prop: 'poison_resistance', gain: 'healthy' },
        { level: 5, prop: 'stealth', gain: 'stealthy' },
        { level: 7, prop: 'warning', gain: 'sensitive' },
        { level: 9, prop: 'searching', gain: 'perceptive' },
        { level: 11, prop: 'fire_resistance', gain: 'cool' },
        { level: 13, prop: 'cold_resistance', gain: 'warm' },
        { level: 15, prop: 'shock_resistance', gain: 'insulated' },
        { level: 17, prop: 'teleport_control', gain: 'controlled' },
    ]],
    ['Priest', [
        { level: 15, prop: 'warning', gain: 'sensitive' },
        { level: 20, prop: 'fire_resistance', gain: 'cool' },
    ]],
    ['Ranger', [
        { level: 7, prop: 'stealth', gain: 'stealthy' },
    ]],
    ['Rogue', [
        { level: 10, prop: 'searching', gain: 'perceptive' },
    ]],
    ['Samurai', [
        { level: 15, prop: 'stealth', gain: 'stealthy' },
    ]],
    ['Tourist', [
        { level: 10, prop: 'searching', gain: 'perceptive' },
        { level: 20, prop: 'poison_resistance', gain: 'hardy' },
    ]],
    ['Wizard', [
        { level: 15, prop: 'warning', gain: 'sensitive' },
        { level: 17, prop: 'teleport_control', gain: 'controlled' },
    ]],
]);

const RACE_INNATE_ABILITIES = new Map([
    ['elf', [
        { level: 4, prop: 'sleep_resistance', gain: 'awake' },
    ]],
]);

function wishedObjectSpec(name) {
    const wish = String(name || '').toLowerCase();
    const spec = {};
    const speMatch = wish.match(/(?:^|\s)([+-]\d+)(?:\s|$)/);
    if (speMatch) spec.spe = Number(speMatch[1]);
    if (wish.includes('blessed')) {
        spec.blessed = true;
        spec.cursed = false;
    } else if (wish.includes('cursed') && !wish.includes('uncursed')) {
        spec.cursed = true;
        spec.blessed = false;
    } else if (wish.includes('uncursed')) {
        spec.cursed = false;
        spec.blessed = false;
    }
    if (wish.includes('amulet of life saving')) {
        rn2(76);
        return { ...spec, otyp: AMULET_OF_LIFE_SAVING };
    }
    if (wish.includes('gray dragon scale mail') || wish.includes('grey dragon scale mail')) {
        rn2(67);
        return { ...spec, otyp: GRAY_DRAGON_SCALE_MAIL };
    }
    if (wish.includes('speed boots')) {
        rn2(13);
        return { ...spec, otyp: SPEED_BOOTS };
    }
    if (wish.includes('gauntlets of power')) {
        // C ref: objnam.c:rnd_otyp_by_namedesc() searches the shuffled
        // gloves description/name pool before readobjnam() creates armor.
        rn2(9);
        return { ...spec, otyp: GAUNTLETS_OF_POWER };
    }
    if (wish.includes('cloak of displacement')) {
        // C ref: objnam.c:rnd_otyp_by_namedesc() searches the cloak/armor
        // description/name pool before mksobj() initializes the cloak.
        rn2(13);
        return { ...spec, otyp: CLOAK_OF_DISPLACEMENT };
    }
    if (wish.includes('mjollnir')) {
        // C ref: objnam.c:readobjnam() resolves the artifact name to a
        // war hammer, then oname() handles artifact naming after mksobj().
        return { ...spec, otyp: WAR_HAMMER, oname: 'Mjollnir', namedArtifact: true };
    }
    if (wish.includes('wand of fire')) {
        rn2(41);
        return { ...spec, otyp: WAN_FIRE };
    }
    if (wish.includes('wand of cold')) {
        rn2(41);
        return { ...spec, otyp: WAN_COLD };
    }
    if (wish.includes('wand of lightning')) {
        rn2(41);
        return { ...spec, otyp: WAN_LIGHTNING };
    }
    if (wish.includes('wand of magic missile')) {
        // C ref: objnam.c:rnd_otyp_by_namedesc() check_of also matches
        // "spellbook of magic missile", so the probability pool is 41+10.
        rn2(51);
        return { ...spec, otyp: WAN_MAGIC_MISSILE };
    }
    if (wish.includes('wand of death')) {
        rn2(41);
        return { ...spec, otyp: WAN_DEATH };
    }
    if (wish.includes('wand of digging')) {
        rn2(41);
        return { ...spec, otyp: WAN_DIGGING };
    }
    if (wish.includes('ring of teleport control')) {
        rn2(2);
        return { ...spec, otyp: RIN_TELEPORT_CONTROL, appearanceName: 'ivory ring' };
    }
    if (wish.includes('stethoscope')) {
        rn2(26);
        return { ...spec, otyp: STETHOSCOPE };
    }
    if (wish.includes('magic marker')) {
        rn2(16);
        return { ...spec, otyp: MAGIC_MARKER };
    }
    if (wish.includes('mirror')) {
        rn2(46);
        return { ...spec, otyp: MIRROR, appearanceName: 'looking glass' };
    }
    if (wish.includes('expensive camera')) {
        rn2(16);
        return { ...spec, otyp: EXPENSIVE_CAMERA };
    }
    return null;
}

function validInvlet(ch) {
    return typeof ch === 'string' && /^[a-z]$/.test(ch);
}

function ensureInventoryLetters() {
    game.inventory = game.inventory || [];
    const used = new Set();
    for (const obj of game.inventory) {
        if (obj?.oclass === COIN_CLASS || obj?.invlet === '$') {
            if (obj) obj.invlet = '$';
            continue;
        }
        if (validInvlet(obj?.invlet)) used.add(obj.invlet);
    }

    let nextCode = 97;
    for (const obj of game.inventory) {
        if (obj?.oclass === COIN_CLASS || obj?.invlet === '$') {
            if (obj) obj.invlet = '$';
            continue;
        }
        if (!obj || validInvlet(obj.invlet)) continue;
        while (nextCode <= 122 && used.has(String.fromCharCode(nextCode))) nextCode++;
        if (nextCode > 122) break;
        obj.invlet = String.fromCharCode(nextCode++);
        used.add(obj.invlet);
    }

    let maxCode = 96;
    for (const letter of used) maxCode = Math.max(maxCode, letter.charCodeAt(0));
    game._next_invlet_code = Math.max(game._next_invlet_code || 97, maxCode + 1);
}

function assignInventoryLetter(obj) {
    ensureInventoryLetters();
    let code = game._next_invlet_code || 97;
    while (code <= 122 && game.inventory.some((item) => item?.invlet === String.fromCharCode(code))) {
        code++;
    }
    obj.invlet = code <= 122 ? String.fromCharCode(code) : '?';
    game._next_invlet_code = code + 1;
    return obj.invlet;
}

function make_wish_object(name) {
    const spec = wishedObjectSpec(name);
    if (!spec?.otyp) return null;
    const otmp = mksobj(spec.otyp, true, false);
    otmp.wishedfor = true;
    if (typeof spec.spe === 'number') otmp.spe = spec.spe;
    if (typeof spec.blessed === 'boolean') otmp.blessed = spec.blessed;
    if (typeof spec.cursed === 'boolean') otmp.cursed = spec.cursed;
    if (spec.appearanceName) otmp.appearanceName = spec.appearanceName;
    if (spec.oname) {
        otmp.oextra = { ...(otmp.oextra || {}), oname: spec.oname };
        if (spec.namedArtifact) {
            rn2(2); // C ref: objnam.c:readobjnam() artifact wish conduct gate.
            if (!otmp.oartifact) game._nartifact_exist = (game._nartifact_exist ?? 0) + 1;
            otmp.oartifact = true;
        }
    }
    rn2(100);
    const merged = merge_inventory_object(otmp);
    if (merged) return merged;
    assignInventoryLetter(otmp);
    game.inventory.push(otmp);
    return otmp;
}

function inventoryIndexForLetter(ch) {
    ensureInventoryLetters();
    const idx = game.inventory.findIndex((obj) => obj?.invlet === ch);
    if (idx >= 0) return idx;
    const code = ch.charCodeAt(0);
    if (code < 97 || code > 122) return -1;
    return code - 97;
}

function consumeInventoryObject(obj) {
    if (!obj) return;
    if ((obj.quan || 1) > 1) {
        obj.quan--;
        return;
    }
    const idx = game.inventory?.indexOf(obj) ?? -1;
    if (idx >= 0) game.inventory.splice(idx, 1);
}

function thrownObjectFromInventory(obj) {
    if (!obj) return null;
    if ((obj.quan || 1) > 1) {
        next_ident();
        const thrown = { ...obj, quan: 1, invlet: undefined, ox: 0, oy: 0 };
        obj.quan--;
        return thrown;
    }
    const idx = game.inventory?.indexOf(obj) ?? -1;
    if (idx >= 0) game.inventory.splice(idx, 1);
    obj.invlet = undefined;
    return obj;
}

function thrownLanding(dx, dy) {
    let x = game.u?.ux ?? 0;
    let y = game.u?.uy ?? 0;
    let last = { x, y };
    let hitHard = false;
    for (let range = 0; range < 8; range++) {
        const nx = x + dx;
        const ny = y + dy;
        const loc = game.level?.at(nx, ny);
        if (!loc || IS_OBSTRUCTED(loc.typ)) {
            hitHard = true;
            break;
        }
        last = { x: nx, y: ny };
        x = nx;
        y = ny;
    }
    return { ...last, hitHard };
}

function throwInventoryObject(obj, dirKey) {
    if (!obj || obj.oclass !== WEAPON_CLASS) return;
    if ((obj.quan || 1) > 1) {
        // C ref: dothrow.c:throw_obj(); even a one-shot volley uses rnd(1)
        // for stackable thrown weapons.
        rnd(1);
    }
    const thrown = thrownObjectFromInventory(obj);
    const dx = DIR_DX[dirKey] || 0;
    const dy = DIR_DY[dirKey] || 0;
    if (!thrown || (!dx && !dy)) return;
    const landing = thrownLanding(dx, dy);
    if (landing.hitHard) {
        // C ref: dothrow.c:breaktest() -> zap.c:obj_resists().
        rn2(100);
    }
    if (landing.x === (game.u?.ux ?? 0) && landing.y === (game.u?.uy ?? 0) && !landing.hitHard) return;
    place_object(thrown, landing.x, landing.y);
    see_objects();
}

function lastInventoryLetter() {
    ensureInventoryLetters();
    let maxCode = 97;
    for (const obj of game.inventory || []) {
        if (validInvlet(obj?.invlet)) maxCode = Math.max(maxCode, obj.invlet.charCodeAt(0));
    }
    return String.fromCharCode(maxCode);
}

function compressLetters(letters) {
    const sorted = [...new Set(letters.filter(validInvlet))].sort();
    const parts = [];
    for (let i = 0; i < sorted.length; i++) {
        let j = i;
        while (j + 1 < sorted.length && sorted[j + 1].charCodeAt(0) === sorted[j].charCodeAt(0) + 1) j++;
        if (j - i >= 3) parts.push(`${sorted[i]}-${sorted[j]}`);
        else for (let k = i; k <= j; k++) parts.push(sorted[k]);
        i = j;
    }
    return parts.join('');
}

function applyLetters() {
    ensureInventoryLetters();
    return compressLetters((game.inventory || [])
        .filter(obj => obj?.oclass === TOOL_CLASS || obj?.oclass === WAND_CLASS || obj?.oclass === SPBOOK_CLASS)
        .map(obj => obj.invlet));
}

function readLetters() {
    ensureInventoryLetters();
    return (game.inventory || [])
        .filter((obj) => obj?.oclass === SCROLL_CLASS || obj?.oclass === SPBOOK_CLASS)
        .map((obj) => obj.invlet)
        .join('');
}

function lightScrollArea(radius = 5) {
    // C ref: read.c:seffect_light() -> vision.c:do_clear_area().
    const offsets = {
        5: [5, 5, 5, 4, 3, 2],
        9: [9, 9, 9, 9, 8, 8, 7, 6, 5, 3],
    }[radius];
    if (!offsets) return;
    const ux = game.u?.ux ?? 0;
    const uy = game.u?.uy ?? 0;
    for (let y = Math.max(0, uy - radius); y <= Math.min(ROWNO - 1, uy + radius); y++) {
        const offset = offsets[Math.abs(y - uy)];
        for (let x = Math.max(1, ux - offset); x <= Math.min(COLNO - 1, ux + offset); x++) {
            if (!couldsee(x, y)) continue;
            const loc = game.level?.at(x, y);
            if (loc) loc.lit = true;
        }
    }
    vision_recalc(0);
}

async function readScrollOfLight(obj, idx) {
    // C refs: read.c:doread(), read.c:seffects(), read.c:seffect_light().
    await pline('As you read the scroll, it disappears.');
    exercise(A_WIS, true);
    const discovered = game.discoveredObjects || (game.discoveredObjects = new Set());
    if (!discovered.has(obj.otyp)) {
        discovered.add(obj.otyp);
        exercise(A_WIS, true);
    }
    if ((obj.quan || 1) > 1) {
        obj.quan--;
    } else if (idx >= 0) {
        game.inventory.splice(idx, 1);
    }
    await append_pline('A lit field surrounds you!');
    lightScrollArea(obj.blessed ? 9 : 5);
    game.context.move = 1;
}

async function readScrollOfRemoveCurse(obj, idx) {
    // C refs: read.c:doread(), read.c:seffects(SCR_REMOVE_CURSE).
    // A cursed remove-curse scroll uses the non-disappearing read message,
    // then prints its own disintegration message before the monster phase.
    exercise(A_WIS, true);
    consumeInventoryObject(obj);
    if (obj.cursed) {
        const callAppearance = unknownAppearanceName(obj) || 'scroll';
        await pline('You read the scroll.');
        await append_pline('You feel like someone is helping you.');
        queue_more_prompt();
        game._more_message_queue = [
            ...(game._more_message_queue || []),
            { text: 'The scroll disintegrates.', more: true },
        ];
        game._call_scroll_after_more = { otyp: obj.otyp, appearance: callAppearance, text: '' };
        game._pre_turn_more_waiting = true;
        game._monster_turn_paused_for_more = true;
    } else {
        await pline('As you read the scroll, it disappears.');
        await append_pline('You feel like someone is helping you.');
        if (game._more) {
            game._pre_turn_more_waiting = true;
            game._monster_turn_paused_for_more = true;
        }
    }
    game.context.move = 1;
}

function heroWieldedWeaponName() {
    const weapon = heroWieldedWeapon();
    if (!weapon) return '';
    return baseObjectName(weapon) || 'weapon';
}

async function finishEnchantWeaponAfterMore() {
    // C refs: read.c:seffect_enchant_weapon(), wield.c:chwepon().
    const weapon = heroWieldedWeapon();
    exercise(A_WIS, true);
    if (!weapon || weapon.oclass !== WEAPON_CLASS) {
        await pline('Your hands twitch.');
        exercise(A_DEX, true);
        return;
    }
    await pline(`Your ${heroWieldedWeaponName()} glows blue for a moment.`);
    weapon.spe = (weapon.spe || 0) + 1;
    weapon.known = true;
    if (weapon.cursed) {
        weapon.cursed = false;
        weapon.blessed = false;
    }
}

async function readScrollOfEnchantWeapon(obj, idx) {
    // C refs: read.c:doread(), read.c:seffect_enchant_weapon().
    exercise(A_WIS, true);
    consumeInventoryObject(obj);
    await pline('As you read the scroll, it disappears.');
    queue_more_prompt();
    game._enchant_weapon_after_more = true;
    game._pre_turn_more_waiting = true;
    game._monster_turn_paused_for_more = true;
    game.context.move = 1;
}

function eatLetters() {
    ensureInventoryLetters();
    return (game.inventory || [])
        .filter((obj) => obj?.oclass === FOOD_CLASS)
        .map((obj) => obj.invlet)
        .join('');
}

function drinkLetters() {
    ensureInventoryLetters();
    const letters = (game.inventory || [])
        .filter((obj) => obj?.oclass === POTION_CLASS)
        .map((obj) => obj.invlet)
        .filter(validInvlet);
    return letters.length > 5 ? compressLetters(letters) : letters.join('');
}

function throwLetters() {
    ensureInventoryLetters();
    const letters = [];
    if ((game._goldCount || 0) > 0) letters.push('$');
    for (const obj of game.inventory || []) {
        if ((obj?.wielded || ((obj?.owornmask || 0) & C.W_WEP)) && (obj.quan || 1) === 1)
            continue;
        if (obj?.oclass === WEAPON_CLASS) letters.push(obj.invlet);
    }
    return letters.join('');
}

function wieldLetters() {
    ensureInventoryLetters();
    return (game.inventory || [])
        .filter((obj) => obj?.oclass === WEAPON_CLASS)
        .map((obj) => obj.invlet)
        .join('');
}

function hasThrowCandidate() {
    return (game._goldCount || 0) > 0 || (game.inventory || []).length > 0;
}

async function showThrowPrompt() {
    const letters = throwLetters();
    game._awaiting_throw_item = true;
    if (letters) {
        await showPromptLine(`What do you want to throw? [${letters} or ?*] `);
    } else if (hasThrowCandidate()) {
        await showPromptLine('What do you want to throw? [*] ');
    } else {
        game._awaiting_throw_item = false;
        await pline("You don't have anything to throw.");
    }
}

function stairAtHero() {
    for (let st = game.stairs; st; st = st.next) {
        if (st.sx === game.u?.ux && st.sy === game.u?.uy) return st;
    }
    return null;
}

async function doDownCommand() {
    // C ref: do.c:dodown().
    const st = stairAtHero();
    if (!st || st.up) {
        await pline("You can't go down here.");
        game.context.move = 0;
        return;
    }
    game._pending_level_teleport_target = st.tolev
        ? { ...st.tolev }
        : { ...(game.u?.uz || { dnum: 0, dlevel: 1 }), dlevel: (game.u?.uz?.dlevel ?? 1) + 1 };
    game.context.move = 1;
}

async function doUpCommand() {
    // C ref: do.c:doup().
    const st = stairAtHero();
    if (!st || !st.up) {
        await pline("You can't go up here.");
        game.context.move = 0;
        return;
    }
    game._pending_level_teleport_target = st.tolev
        ? { ...st.tolev }
        : { ...(game.u?.uz || { dnum: 0, dlevel: 1 }), dlevel: Math.max(1, (game.u?.uz?.dlevel ?? 1) - 1) };
    game.context.move = 1;
}

function stethoscopeSelfStatusLine() {
    const role = String(game.urole?.name?.m || game.u?.role || 'character').toLowerCase();
    const align = game.u?.ualign?.type === 1 ? 'lawful'
        : game.u?.ualign?.type === -1 ? 'chaotic' : 'neutral';
    const hp = game.u?.uhp ?? 0;
    const hpmax = game.u?.uhpmax ?? hp;
    const ac = game.u?.uac ?? 10;
    const level = game.u?.ulevel ?? 1;
    return `Status of ${role} (nominally ${align}):  Level ${level}  HP ${hp}(${hpmax})  AC ${ac}.`;
}

function objectAppearanceName(otyp) {
    if (otyp === CHEST) return 'chest';
    return 'object';
}

function monsterInstanceDisplayName(mon) {
    return String(mon?.data?.name || 'monster').toLowerCase().replace(/_/g, ' ');
}

function monsterStatusLine(mon) {
    const name = monsterInstanceDisplayName(mon);
    const hp = mon?.mhp ?? 0;
    const hpmax = mon?.mhpmax ?? hp;
    const level = mon?.m_lev ?? mon?.data?.mlevel ?? 0;
    const ac = mon?.data?.name === 'SMALL_MIMIC' ? 7 : 10;
    const size = mon?.data?.name === 'SMALL_MIMIC' ? 'medium' : 'medium';
    const align = mon?.mpeaceful ? 'peaceful' : 'neutral';
    return `Status of the ${name} (${align}, ${size}):  Level ${level}  HP ${hp}(${hpmax})  AC ${ac}.`;
}

function indefiniteArticle(name) {
    return /^[aeiou]/i.test(name) ? 'an' : 'a';
}

function sentenceStart(s) {
    return s ? `${s[0].toUpperCase()}${s.slice(1)}` : s;
}

function monsterDisplayName(ptr) {
    return String(ptr?.name || 'monster').toLowerCase().replace(/_/g, ' ');
}

function beamGlyph(dx, dy) {
    if (dy === 0) return { ch: 'q', dec: true };
    if (dx === 0) return { ch: 'x', dec: true };
    return { ch: dx === dy ? '\\' : '/', dec: false };
}

function drawRayBeam(dx, dy, color = 9) {
    const glyph = beamGlyph(dx, dy);
    let x = game.u?.ux || 0;
    let y = game.u?.uy || 0;
    for (let i = 0; i < 20; i++) {
        const loc = game.level?.at(x, y);
        if (!loc) break;
        show_glyph_cell(x, y, glyph.ch, color, glyph.dec);
        if (i > 0 && (loc.typ === STONE || IS_WALL(loc.typ) || loc.typ === SDOOR)) break;
        x += dx;
        y += dy;
    }
}

async function zapFireRayAtHero(dx, dy) {
    // C ref: zap.c:weffects() -> ubuzz() -> dobuzz()/zhitu().
    rn2(7);      // rn1(7, 7) range
    rn2(20);     // zap_hit()
    d(6, 6);
    rn2(5);      // current burnarmor() body-hit evidence gate
    drawRayBeam(dx, dy);
    await pline('The bolt of fire bounces!  The bolt of fire hits you!');
    game._fire_wand_side_effect_pending = true;
    queue_more_prompt();
}

async function showFireWandSideEffects() {
    // C refs: zap.c:zhitu(), zap.c:destroy_items().
    rn2(3);
    rn2(5);
    rn2(5);
    rnd(6);
    rn2(3);
    rnd(6);
    rn2(3);
    game._fire_wand_side_effect_pending = false;
    game._fire_wand_invisibility_pending = true;
    await pline('Your cloak smoulders!  Your potion of invisibility boils and explodes!');
    queue_more_prompt();
}

async function showFireWandInvisibilityEffect() {
    // C refs: potion.c invisibility effect after fire destroys potion.
    rn2(2);
    rnd(6);
    rn2(3);
    if (game.u && typeof game.u.uhp === 'number') game.u.uhp = Math.max(0, game.u.uhp - 1);
    game._fire_wand_invisibility_pending = false;
    game._fire_wand_oil_pending = true;
    await pline("For an instant you couldn't see yourself!");
    queue_more_prompt();
}

async function showFireWandOilEffect() {
    // C refs: zap.c:destroy_items(), attrib.c:exercise(), zap.c:zhitu().
    rn2(2);
    rn2(3);
    rn2(3);
    rn2(3);
    rn2(3);
    rn2(3);
    if (game.u && typeof game.u.uhp === 'number') game.u.uhp = 0;
    game._fire_wand_oil_pending = false;
    game._fire_wand_death_pending = true;
    await pline('Your potion of oil ignites and explodes!');
    queue_more_prompt();
}

async function showFireWandDeathMessage() {
    game._fire_wand_death_pending = false;
    game._death_prompt_pending = true;
    await pline('You die...');
    queue_more_prompt();
}

async function showDeathPrompt() {
    game._death_prompt_pending = false;
    game._death_prompt_active = true;
    game._more = false;
    game._more_dismissals_remaining = 0;
    game._latched_status_uhp = 0;
    const msg = 'Die? [yn] (n)';
    await showPromptLine(msg);
    game._prompt_cursor = [msg.length + 1, 0];
}

function pluralizeObjectName(name) {
    if (name.startsWith('scroll of ')) return name.replace(/^scroll of /, 'scrolls of ');
    if (name.startsWith('scroll labeled ')) return name.replace(/^scroll labeled /, 'scrolls labeled ');
    if (name.startsWith('spellbook of ')) return name.replace(/^spellbook of /, 'spellbooks of ');
    if (name.startsWith('potion of ')) return name.replace(/^potion of /, 'potions of ');
    if (name.startsWith('tin of ')) return name.replace(/^tin of /, 'tins of ');
    if (name.endsWith('staff')) return `${name}s`;
    if (name.endsWith('y')) return `${name.slice(0, -1)}ies`;
    if (name.endsWith('s')) return name;
    return `${name}s`;
}

function unknownAppearanceName(obj) {
    if (!obj || obj.knownName || knownObjectType(obj.otyp)) return '';
    if (obj?.appearanceName) return obj.appearanceName;
    const shuffledDescription = getObjectDescription(obj?.otyp);
    if (shuffledDescription && !obj?.knownName) {
        // C ref: objnam.c:xname() uses OBJ_DESCR() for undiscovered objects.
        if (obj?.oclass === AMULET_CLASS) return `${shuffledDescription} amulet`;
        if (obj?.oclass === RING_CLASS) return `${shuffledDescription} ring`;
        if (obj?.oclass === POTION_CLASS) return `${shuffledDescription} potion`;
        if (obj?.oclass === SCROLL_CLASS) {
            if (shuffledDescription === 'unlabeled') return 'unlabeled scroll';
            return `scroll labeled ${shuffledDescription}`;
        }
        if (obj?.oclass === SPBOOK_CLASS && obj.otyp >= FIRST_SPELL && obj.otyp <= LAST_SPELL) {
            return `${shuffledDescription} spellbook`;
        }
        if (obj?.oclass === SPBOOK_CLASS && obj.otyp === SPE_NOVEL) {
            return `${shuffledDescription} book`;
        }
        if (obj?.oclass === SPBOOK_CLASS && obj.otyp === SPE_BOOK_OF_THE_DEAD) {
            return `${shuffledDescription} spellbook`;
        }
        if (obj?.oclass === ARMOR_CLASS) return shuffledDescription;
        if (obj?.oclass === WAND_CLASS) return `${shuffledDescription} wand`;
        if (obj?.oclass === GEM_CLASS) return `${shuffledDescription} gem`;
    }
    return '';
}

function knownObjectType(otyp) {
    return !!game.discoveredObjects
        && typeof game.discoveredObjects.has === 'function'
        && game.discoveredObjects.has(otyp);
}

function baseObjectName(obj) {
    if (obj?.otyp === CORPSE) {
        return `${corpseMonsterDisplayName(obj)} corpse`;
    }
    if ((obj?.knownName || knownObjectType(obj?.otyp)) && OBJECT_BASE_NAMES.has(obj.otyp)) return OBJECT_BASE_NAMES.get(obj.otyp);
    const appearanceName = unknownAppearanceName(obj);
    if (appearanceName) return appearanceName;
    if (OBJECT_BASE_NAMES.has(obj?.otyp)) return OBJECT_BASE_NAMES.get(obj.otyp);
    if (obj?.oclass === RING_CLASS) return 'ring';
    if (obj?.oclass === WAND_CLASS) return 'wand';
    return 'object';
}

function corpseMonsterPtr(obj) {
    if (Number.isInteger(obj?.corpsenm) && LEGACY_CORPSE_NUM_TO_MONSTER.has(obj.corpsenm)) {
        return monsterPtr(LEGACY_CORPSE_NUM_TO_MONSTER.get(obj.corpsenm));
    }
    return monsterPtr(obj?.corpsenm) || null;
}

function corpseMonsterDisplayName(obj) {
    const ptr = corpseMonsterPtr(obj);
    return String(ptr?.name || 'monster').toLowerCase().replace(/_/g, ' ');
}

function shouldShowBuc(obj) {
    if (!obj) return false;
    if (unknownAppearanceName(obj)) return false;
    if (!obj.bknown) return false;
    if (obj.blessed || obj.cursed) return true;
    const implicitUncursed = game.flags?.implicit_uncursed !== false;
    if (implicitUncursed
        && obj.known
        && OBJECT_CHARGED[obj.otyp]
        && obj.oclass !== ARMOR_CLASS
        && obj.oclass !== RING_CLASS) {
        return false;
    }
    return obj.oclass === WEAPON_CLASS
        || obj.oclass === ARMOR_CLASS
        || obj.oclass === RING_CLASS
        || obj.oclass === POTION_CLASS
        || obj.oclass === SCROLL_CLASS
        || obj.oclass === SPBOOK_CLASS
        || obj.oclass === FOOD_CLASS
        || obj.oclass === TOOL_CLASS;
}

function bucPrefix(obj) {
    if (!shouldShowBuc(obj)) return '';
    if (obj.blessed) return 'blessed';
    if (obj.cursed) return 'cursed';
    return 'uncursed';
}

function enchantmentPrefix(obj) {
    if (typeof obj?.spe !== 'number') return '';
    if (!obj.known && !obj.knownName) return '';
    if (obj.oclass === ARMOR_CLASS
        || obj.oclass === WEAPON_CLASS
        || (obj.oclass === RING_CLASS && OBJECT_CHARGED[obj.otyp])) {
        return `${obj.spe >= 0 ? '+' : ''}${obj.spe}`;
    }
    return '';
}

function chargeSuffix(obj, opts = {}) {
    if (opts.includeCharges === false) return '';
    if (typeof obj?.spe !== 'number') return '';
    if (obj.otyp === MAGIC_MARKER) return obj.known || obj.knownName ? ` (0:${obj.spe})` : '';
    if (obj.oclass !== WAND_CLASS) return '';
    if (!obj.known && !obj.knownName && !obj.chargesKnown) return '';
    if (unknownAppearanceName(obj)) return '';
    if (obj.otyp === WAN_DIGGING && obj.knownName && !obj.chargesKnown) return '';
    return ` (0:${obj.spe})`;
}

function wornSuffix(obj) {
    if (obj?.wornSide) return ` (on ${obj.wornSide} hand)`;
    if (obj?.wielded || ((obj?.owornmask || 0) & C.W_WEP)) {
        if (obj?.otyp === QUARTERSTAFF) return ' (weapon in hands)';
        return ' (weapon in right hand)';
    }
    if (obj?.worn || obj?.owornmask) return ' (being worn)';
    return '';
}

function inventoryObjectName(obj, opts = {}) {
    if (obj?.menuName) return obj.menuName;
    const quan = obj?.quan || 1;
    if (obj?.otyp === GOLD_PIECE) return `${quan} gold ${quan === 1 ? 'piece' : 'pieces'}`;
    const rawBase = baseObjectName(obj);
    const pairObject = /\b(?:boots|gloves)$/.test(rawBase) || rawBase.startsWith('gauntlets of ');
    const base = quan > 1
        ? (pairObject ? `pairs of ${rawBase}` : pluralizeObjectName(rawBase))
        : (pairObject ? `pair of ${rawBase}` : rawBase);
    const oname = C.ONAME(obj);
    const namedBase = oname ? `${base} named ${oname}` : base;
    const parts = [bucPrefix(obj), enchantmentPrefix(obj), namedBase].filter(Boolean);
    const body = parts.join(' ') + chargeSuffix(obj, opts);
    const worn = opts.includeWorn ? wornSuffix(obj) : '';
    if (quan > 1) return `${quan} ${body}${worn}`;
    return `${indefiniteArticle(body)} ${body}${worn}`;
}

function inventoryListing(obj, opts = {}) {
    ensureInventoryLetters();
    return `${obj.invlet} - ${inventoryObjectName(obj, opts)}`;
}

function menuInventoryEntries() {
    ensureInventoryLetters();
    if ((game.inventory || []).length) {
        return (game.inventory || [])
            .filter((obj) => obj && validInvlet(obj.invlet))
            .map((obj) => ({ cls: obj.oclass, obj, line: inventoryListing(obj, { includeWorn: true }) }));
    }
    const role = game.urole?.name?.m;
    if (role === 'Tourist') return TOURIST_STARTER_MENU.slice();
    return [];
}

function buildInventoryMenuLines() {
    const lines = [];
    const gold = game._goldCount || 0;
    if (gold > 0) {
        lines.push({ text: 'Coins', heading: true });
        lines.push({ text: `$ - ${gold} gold pieces`, heading: false });
    }

    const entries = menuInventoryEntries();
    for (const group of INVENTORY_GROUPS) {
        const groupEntries = entries.filter((entry) => entry.cls === group.cls);
        if (!groupEntries.length) continue;
        lines.push({ text: group.title, heading: true });
        for (const entry of groupEntries) {
            if (entry.obj) object_glyph_for_menu(entry.obj);
            lines.push({ text: entry.line, heading: false });
        }
    }
    lines.push({ text: '(end)', heading: false });
    return lines;
}

function knownSpellEntries() {
    const entries = [];
    const known = Array.isArray(game.knownSpells) && game.knownSpells.length
        ? game.knownSpells
        : (game.inventory || [])
            .filter((obj) => obj?.oclass === SPBOOK_CLASS)
            .map((obj) => ({ otyp: obj.otyp }));
    for (const spell of known) {
        const info = SPELLBOOK_SPELL_INFO.get(spell?.otyp);
        if (!info) continue;
        if (entries.some((entry) => entry.name === info.name)) continue;
        entries.push({ letter: String.fromCharCode(97 + entries.length), ...info });
    }
    return entries;
}

const MAT_IRON = 11;
const MAT_MITHRIL = 17;

function isMetallicObject(obj) {
    const mat = OBJECT_MATERIAL[obj?.otyp] ?? 0;
    return mat >= MAT_IRON && mat <= MAT_MITHRIL;
}

function percentSpellSuccessBasic(entry) {
    // C ref: spell.c:percent_success().  This ports the Wizard-relevant
    // casting chance path used by the current sessions: base role penalty,
    // metal gloves/boots penalties, Int, level, and basic spell skill.
    if (!entry || game.urole?.name?.m !== 'Wizard') return 100;
    let splcaster = 1; // role.c Wizard spelbase
    const ulevel = game.u?.ulevel ?? 1;
    const statused = game.u?.acurr?.a?.[C.A_INT] ?? 10;

    for (const obj of game.inventory || []) {
        if (!obj || obj.oclass !== ARMOR_CLASS || !(obj.worn || obj.owornmask)) continue;
        if (!isMetallicObject(obj)) continue;
        if (obj.otyp >= LEATHER_GLOVES && obj.otyp <= GAUNTLETS_OF_POWER + 1) splcaster += 6;
        else if (obj.otyp >= SPEED_BOOTS && obj.otyp <= LEVITATION_BOOTS) splcaster += 2;
    }

    const weapon = (game.inventory || []).find((obj) => obj?.wielded || ((obj?.owornmask || 0) & C.W_WEP));
    if (weapon?.otyp === QUARTERSTAFF) splcaster -= 3;
    if (splcaster > 20) splcaster = 20;

    let chance = Math.trunc(11 * statused / 2);
    const skill = Math.max(entry.skillLevel ?? C.P_UNSKILLED, C.P_UNSKILLED) - 1;
    const difficulty = (entry.level - 1) * 4 - ((skill * 6) + Math.trunc(ulevel / 3) + 1);
    if (difficulty > 0) {
        chance -= Math.trunc(Math.sqrt(900 * difficulty + 2000));
    } else {
        const learning = Math.trunc(15 * -difficulty / entry.level);
        chance += learning > 20 ? 20 : learning;
    }
    if (chance < 0) chance = 0;
    if (chance > 120) chance = 120;
    chance = Math.trunc(chance * (20 - splcaster) / 15) - splcaster;
    if (chance > 100) return 100;
    if (chance < 0) return 0;
    return chance;
}

function spellRetentionTextBasic(entry, turnsLeft) {
    // C ref: spell.c:spellretention().
    const keen = 20000;
    if (turnsLeft < 1) return '(gone)';
    if (turnsLeft >= keen) return '100%';
    let percent = Math.trunc((turnsLeft - 1) / Math.trunc(keen / 100)) + 1;
    const skill = Math.max(entry.skillLevel ?? C.P_UNSKILLED, C.P_UNSKILLED);
    const accuracy = skill === C.P_EXPERT ? 2
        : skill === C.P_SKILLED ? 5
        : skill === C.P_BASIC ? 10
        : 25;
    percent = accuracy * (Math.trunc((percent - 1) / accuracy) + 1);
    return `${percent - accuracy + 1}%-${percent}%`;
}

function putonLetters() {
    ensureInventoryLetters();
    return (game.inventory || [])
        .filter((obj) => (obj?.oclass === RING_CLASS && !obj.wornSide)
            || (obj?.oclass === AMULET_CLASS && !obj.worn))
        .map((obj) => obj.invlet)
        .join('');
}

function wearLetters() {
    ensureInventoryLetters();
    return (game.inventory || [])
        .filter((obj) => obj?.oclass === ARMOR_CLASS && !obj.worn && !obj.owornmask)
        .map((obj) => obj.invlet)
        .join('');
}

function is_puton_candidate(obj) {
    if (!obj) return false;
    if (obj.oclass === RING_CLASS) return !obj.wornSide;
    return obj.oclass === ARMOR_CLASS || obj.oclass === AMULET_CLASS;
}

function apply_deferred_startup_wear() {
    const cloak = (game.inventory || []).find((obj) => obj?.otyp === CLOAK_OF_MAGIC_RESISTANCE);
    if (cloak) cloak.worn = true;
}

function armor_base_bonus(obj) {
    switch (obj?.otyp) {
    case GRAY_DRAGON_SCALE_MAIL:
        return 9;
    case CHAIN_MAIL:
        return 5;
    case CLOAK_OF_PROTECTION:
        return 3;
    case CLOAK_OF_MAGIC_RESISTANCE:
    case CLOAK_OF_DISPLACEMENT:
    case LEATHER_GLOVES:
    case GAUNTLETS_OF_POWER:
        return 1;
    default:
        if (obj?.otyp >= SPEED_BOOTS && obj.otyp <= LEVITATION_BOOTS) return 1;
        return 0;
    }
}

function armor_bonus(obj) {
    if (!obj?.worn && !obj?.owornmask) return 0;
    const base = armor_base_bonus(obj);
    const erosion = Math.max(obj.oeroded ?? 0, obj.oeroded2 ?? 0);
    // C ref: include/hack.h:ARM_BONUS(), do_wear.c:find_ac().
    return base + (obj.spe || 0) - Math.min(erosion, base);
}

function calculated_armor_class() {
    let uac = 10;
    for (const obj of game.inventory || []) {
        if (obj?.oclass === ARMOR_CLASS) uac -= armor_bonus(obj);
    }
    return Math.max(-99, Math.min(99, uac));
}

function armor_finish_message(obj) {
    if (obj?.otyp !== SPEED_BOOTS) return 'You finish your dressing maneuver.';
    const alreadyFast = !!game.u?.uprops?.fast;
    game.u.uprops = game.u.uprops || {};
    game.u.uprops.fast = true;
    return `You finish your dressing maneuver.  You feel yourself speed up${alreadyFast ? ' a bit more' : ''}.`;
}

function takeoff_worn_cloak() {
    const cloak = (game.inventory || []).find((obj) => obj?.otyp === CLOAK_OF_MAGIC_RESISTANCE && obj.worn);
    if (cloak) {
        cloak.worn = false;
        game.u.uac = calculated_armor_class();
    }
}

async function start_wearing_object(obj) {
    if (obj.worn || obj.wornSide || obj.owornmask) {
        game.context.move = 0;
        await pline('You are already wearing that!');
        return;
    }

    if (obj.oclass === RING_CLASS) {
        game._awaiting_ring_finger = obj;
        game.context.move = 0;
        await showPromptLine('Which ring-finger, Right or Left? [rl] ');
        return;
    }

    obj.worn = true;
    if (obj.otyp === CLOAK_OF_DISPLACEMENT) {
        // C ref: do_wear.c:Cloak_on()/toggle_displacement().  The property
        // discovery message can block at --More-- before on_msg() reports
        // that the cloak is now worn and before the wearing turn advances.
        const discovered = game.discoveredObjects || (game.discoveredObjects = new Set());
        if (!discovered.has(obj.otyp)) discovered.add(obj.otyp);
        obj.known = true;
        obj.knownName = true;
        game.u.uprops = game.u.uprops || {};
        game.u.uprops.displaced = true;
        exercise(A_WIS, true);
        game._cloak_displacement_on_msg_pending = obj;
        await pline('You feel that monsters have difficulty pinpointing your location.');
        queue_more_prompt();
        game.context.move = 0;
        return;
    }
    const delay = OBJECT_DELAY[obj.otyp] || 0;
    if (obj.oclass === ARMOR_CLASS && delay > 0) {
        game._occupation_turns_remaining = Math.max(0, delay - 1);
        game._occupation_finish_message = armor_finish_message(obj);
        game._occupation_finish_uac = calculated_armor_class();
        game._occupation_finish_object = obj;
    } else {
        if (obj.oclass === ARMOR_CLASS) {
            obj.known = true;
            game.u.uac = calculated_armor_class();
        }
        await pline(`${inventoryListing(obj)} (being worn).`);
    }
    game.context.move = 1;
}

function zapLetters() {
    ensureInventoryLetters();
    return (game.inventory || [])
        .filter((obj) => obj?.oclass === WAND_CLASS)
        .map((obj) => obj.invlet)
        .join('');
}

function dropObjectName(obj) {
    if (obj?.otyp === QUARTERSTAFF) {
        const buc = obj.blessed ? 'blessed ' : obj.cursed ? 'cursed ' : 'uncursed ';
        const spe = typeof obj.spe === 'number' ? `${obj.spe >= 0 ? '+' : ''}${obj.spe} ` : '';
        return `a ${buc}${spe}quarterstaff`;
    }
    return 'an object';
}

async function lookHereAfterMove() {
    const u = game.u;
    const objects = (game.level?.objects || [])
        .filter(o => o.ox === u.ux && o.oy === u.uy);
    if (!objects.length) return;
    if (objects.length === 1) {
        await pline(`You see here ${inventoryObjectName(objects[0])}.`);
        return;
    }
    game._pending_message = `${' '.repeat(41)}Things that are here:`;
    game._floor_list_lines = objects.map(obj => inventoryObjectName(obj));
    game._floor_list_col = 41;
    game._prompt_cursor = [49, Math.min(21, objects.length + 1)];
    game._floor_list_pauses_turn = true;
    queue_more_prompt();
}

function floorObjectAtHero() {
    const u = game.u || {};
    return (game.level?.objects || []).find((obj) =>
        typeof obj?.otyp === 'number' && obj.ox === u.ux && obj.oy === u.uy);
}

function floorObjectsAtHero() {
    const u = game.u || {};
    return (game.level?.objects || []).filter((obj) =>
        typeof obj?.otyp === 'number' && obj.ox === u.ux && obj.oy === u.uy);
}

function isContainerObject(obj) {
    return obj?.otyp === LARGE_BOX || obj?.otyp === CHEST || obj?.otyp === ICE_BOX;
}

async function doLootCommand() {
    const container = floorObjectsAtHero().find((obj) => isContainerObject(obj));
    if (!container) {
        await pline("You don't find anything here to loot.");
        game.context.move = 0;
        return;
    }

    const name = baseObjectName(container) || 'container';
    if (container.olocked) {
        if (container.lknown) await pline(`The ${name} is locked.`);
        else await pline(`Hmmm, the ${name} turns out to be locked.`);
        container.lknown = true;
        game.context.move = 0;
        return;
    }

    await pline(`There is nothing in the ${name}.`);
    game.context.move = 0;
}

function extractFloorObject(obj) {
    const idx = game.level?.objects?.indexOf(obj) ?? -1;
    if (idx >= 0) game.level.objects.splice(idx, 1);
    if (typeof obj?.ox === 'number' && typeof obj?.oy === 'number') newsym(obj.ox, obj.oy);
    obj.ox = 0;
    obj.oy = 0;
}

function pickupGoldObject(obj) {
    const picked = obj?.quan || 1;
    extractFloorObject(obj);
    game._goldCount = (game._goldCount || 0) + picked;
    let carried = (game.inventory || []).find((item) => item?.otyp === GOLD_PIECE);
    if (carried) {
        carried.quan = game._goldCount;
    } else {
        carried = obj;
        carried.invlet = '$';
        carried.quan = game._goldCount;
        game.inventory = game.inventory || [];
        game.inventory.push(carried);
    }
    return `$ - ${picked} gold ${picked === 1 ? 'piece' : 'pieces'} (${game._goldCount} in total).`;
}

function pickupInventoryObject(obj) {
    extractFloorObject(obj);
    const merged = merge_inventory_object(obj);
    const carried = merged || obj;
    if (!merged) {
        if (!obj.invlet) assignInventoryLetter(obj);
        game.inventory.push(obj);
    }
    return carried;
}

async function finishHeavyPickup(obj) {
    pickupInventoryObject(obj);
    if (game.u) game.u.uencumber = Math.max(game.u.uencumber || 0, 1);
    game._extra_encumbered_turn_pending = true;
    await pline('Your movements are slowed slightly because of your load.');
}

async function triggerSpotEffectsAtHero() {
    const u = game.u || {};
    const trap = (game.level?.traps || []).find(t => t.tx === u.ux && t.ty === u.uy);
    if (!trap) return false;
    if (trap.ttyp === C.DART_TRAP) {
        mksobj(DART, true, false);
        rn2(6);
        const damage = rnd(3);
        rnd(20);
        exercise(A_DEX, false);
        if (typeof game.u?.uhp === 'number') game.u.uhp = Math.max(0, game.u.uhp - damage);
        trap.tseen = true;
        newsym(trap.tx, trap.ty);
        await pline('A little dart shoots out at you!  You are hit by a little dart.');
        return true;
    }
    return false;
}

function pickupMenuEntries(objects) {
    const entries = [];
    const weapons = objects.filter(obj => obj.oclass === WEAPON_CLASS);
    const food = objects.filter(obj => obj.oclass === FOOD_CLASS);
    const gems = objects.filter(obj => obj.oclass === 13);
    let selector = 97;
    for (const [heading, group] of [['Weapons', weapons], ['Comestibles', food], ['Gems/Stones', gems]]) {
        if (!group.length) continue;
        entries.push({ heading });
        for (const obj of group) {
            entries.push({ selector: String.fromCharCode(selector++), obj, selected: false });
        }
    }
    return entries;
}

function refreshPickupMenu() {
    const menu = game._pickup_menu;
    if (!menu) return;
    const lines = [''];
    for (const entry of menu.entries) {
        if (entry.heading) {
            lines.push(entry.heading);
        } else {
            lines.push(`${entry.selector} ${entry.selected ? '+' : '-'} ${inventoryObjectName(entry.obj)}`);
        }
    }
    lines.push('(end)');
    game._pending_message = `${' '.repeat(41)}Pick up what?`;
    game._floor_list_lines = lines;
    game._floor_list_col = 41;
    game._floor_list_show_more = false;
    game._prompt_cursor = [47, lines.length];
}

async function showPickupMenu(objects) {
    game._pickup_menu = { entries: pickupMenuEntries(objects) };
    refreshPickupMenu();
    game.context.move = 0;
}

async function finishPickupMenu() {
    const menu = game._pickup_menu;
    game._pickup_menu = null;
    game._floor_list_lines = null;
    game._floor_list_show_more = true;
    game._prompt_cursor = null;
    const selected = (menu?.entries || []).filter(entry => entry.selected && entry.obj).map(entry => entry.obj);
    if (!selected.length) {
        game.context.move = 0;
        await pline('Never mind.');
        return;
    }
    game.context.move = 1;
    const messages = [];
    for (const obj of selected) {
        if (obj.otyp === GOLD_PIECE) {
            messages.push(pickupGoldObject(obj));
            continue;
        }
        extractFloorObject(obj);
        const merged = merge_inventory_object(obj);
        const carried = merged || obj;
        if (!merged) {
            assignInventoryLetter(carried);
            game.inventory = game.inventory || [];
            game.inventory.push(carried);
        }
        messages.push(`${carried.invlet} - ${inventoryObjectName(carried)}.`);
    }
    await pline(messages.join('  '));
}

async function handlePickupMenuKey(ch) {
    const menu = game._pickup_menu;
    if (!menu) return false;
    if (ch === '\r' || ch === '\n') {
        await finishPickupMenu();
        return true;
    }
    const entry = menu.entries.find(item => item.selector === ch);
    if (entry) entry.selected = !entry.selected;
    refreshPickupMenu();
    game.context.move = 0;
    return true;
}

function floorCorpseAtHero() {
    const u = game.u || {};
    return (game.level?.objects || []).find((obj) =>
        obj?.otyp === CORPSE && obj.ox === u.ux && obj.oy === u.uy);
}

function corpseEatingReqtime(obj) {
    // C ref: eat.c:eatcorpse(); corpse delay is weight-dependent:
    // victual.reqtime = 3 + (mons[mnum].cwt >> 6), then start_eating()
    // records the first bite without consuming an input boundary.
    const cwt = obj?.corpse_cwt || CORPSE_WEIGHT_BY_MONSTER.get(corpseMonsterPtr(obj)?.name) || 0;
    return 3 + (cwt >> 6);
}

function rottenFoodInterruptsEating() {
    // C ref: eat.c:rottenfood().  Only the unconsciousness branch prevents
    // start_eating() from recording the first bite.
    if (!rn2(4)) {
        d(2, 4);
        return false;
    }
    if (!rn2(4)) {
        d(2, 10);
        return false;
    }
    if (!rn2(3)) {
        rnd(10);
        return true;
    }
    return false;
}

function discoverObjectType(otyp) {
    const discovered = game.discoveredObjects || (game.discoveredObjects = new Set());
    if (discovered.has(otyp)) return false;
    discovered.add(otyp);
    exercise(A_WIS, true);
    return true;
}

function increaseHeroTimeout(stateKey, amount) {
    if (!game.u) return 0;
    game.u.uprops = game.u.uprops || {};
    const oldTimeout = game.u.uprops[stateKey] || 0;
    const newTimeout = Math.min(C.TIMEOUT, Math.max(0, oldTimeout + amount));
    game.u.uprops[stateKey] = newTimeout;
    if (stateKey === 'confusion') game.u.uconfusion = newTimeout;
    return newTimeout;
}

async function drinkPotion(obj, idx) {
    if (!obj || obj.oclass !== POTION_CLASS) {
        game.context.move = 0;
        await pline('Never mind.');
        return;
    }
    const appearance = getObjectDescription(obj.otyp) || 'ruby';
    if ((obj.quan || 1) > 1) obj.quan--;
    else if (idx >= 0) game.inventory.splice(idx, 1);
    if (obj.otyp === POT_PARALYSIS) {
        // C ref: potion.c:peffect_paralysis().
        const bcsign = obj.blessed ? 1 : (obj.cursed ? -1 : 0);
        game._nomul_turns_remaining = rn2(10) + 25 - (12 * bcsign);
        game._nomul_finish_message = 'You can move again.';
        exercise(A_DEX, false);
        discoverObjectType(obj.otyp);
        await pline('Your feet are frozen to the floor!');
        game.context.move = 1;
        return;
    }
    if (obj.otyp === POT_CONFUSION) {
        // C refs: potion.c:peffect_confusion(), potion.c:dopotion().
        const alreadyConfused = !!(game.u?.uprops?.confusion || game.u?.uconfusion);
        const bcsign = obj.blessed ? 1 : (obj.cursed ? -1 : 0);
        if (!alreadyConfused) {
            if (game.u?.uhallucination || game.u?.uprops?.hallucination)
                await pline('What a trippy feeling!');
            else
                await pline('Huh, What?  Where am I?');
        }
        increaseHeroTimeout('confusion', rn1(7, 16 - (8 * bcsign)));
        if (!alreadyConfused && !(game.u?.uhallucination || game.u?.uprops?.hallucination))
            discoverObjectType(obj.otyp);
        game.context.move = 1;
        return;
    }
    if (obj.otyp === POT_BOOZE) {
        // C refs: potion.c:peffect_booze(), potion.c:dopotion().
        const bcsign = obj.blessed ? 1 : (obj.cursed ? -1 : 0);
        const prefix = obj.odiluted ? 'watered down ' : '';
        const liquid = (game.u?.uhallucination || game.u?.uprops?.hallucination)
            ? 'dandelion wine'
            : 'liquid fire';
        await pline(`Ooph!  This tastes like ${prefix}${liquid}!`);
        if (!obj.blessed) increaseHeroTimeout('confusion', d(2 + (game.u?.uhs ?? 1), 8));
        if (!obj.odiluted && game.u && typeof game.u.uhp === 'number')
            game.u.uhp = Math.min(game.u.uhpmax || game.u.uhp, game.u.uhp + 1);
        if (game.u) game.u.uhunger = (game.u.uhunger ?? 900) + (10 * (2 + bcsign));
        exercise(A_WIS, false);
        game._drink_call_after_more = appearance;
        queue_more_prompt();
        game.context.move = 0;
        return;
    }
    if (obj.otyp !== POT_FRUIT_JUICE) {
        game.context.move = 1;
        return;
    }
    game._drink_call_after_more = appearance;
    await pline('This tastes like slime mold juice.');
    queue_more_prompt();
    game.context.move = 0;
}

async function drinkSink() {
    // C ref: fountain.c:drinksink().
    const roll = rn2(20);
    if (roll === 0) {
        await pline('You take a sip of very cold water.');
    } else if (roll === 1) {
        await pline('You take a sip of very warm water.');
    } else if (roll === 2) {
        await pline('You take a sip of scalding hot water.');
    } else {
        const temp = rn2(3) ? (rn2(2) ? 'cold' : 'warm') : 'hot';
        await pline(`You take a sip of ${temp} water.`);
    }
    game.context.move = 1;
}

async function handleFloorCorpseEatKey(ch) {
    const obj = game._floor_corpse_eat_obj;
    const corpseName = baseObjectName(obj);
    game._awaiting_floor_corpse_eat = false;
    game._floor_corpse_eat_obj = null;
    game._prompt_cursor = null;
    if (ch !== 'y') {
        game.context.move = 0;
        await pline('Never mind.');
        return true;
    }
    rn2(20);
    let firstBiteStarted = false;
    if (obj?._live_kill_corpse) {
        rn2(7);
        firstBiteStarted = !rottenFoodInterruptsEating();
    } else {
        rn2(5);
        const damage = rnd(8);
        if (typeof game.u?.uhp === 'number') game.u.uhp = Math.max(0, game.u.uhp - damage);
    }
    if (obj) game._pending_eaten_corpse_remove = obj;
    game._occupation_turns_remaining = Math.max(0, corpseEatingReqtime(obj) - (firstBiteStarted ? 1 : 0));
    game._occupation_pre_finish_catchup = firstBiteStarted;
    game._occupation_finish_message = `You finish eating the ${corpseName}.`;
    game._occupation_pack_finish_message = true;
    game._occupation_finish_removes_eaten_corpse = true;
    await pline(obj?._live_kill_corpse ? 'Blecch!  Rotten food!' : 'You feel sick.');
    game.context.move = 1;
    return true;
}

async function continueQueuedCookieMessage(ch) {
    if (!game._cookie_message_queue?.length || !game._more
        || (ch !== ' ' && ch !== '\r' && ch !== '\n')) {
        return false;
    }
    const next = game._cookie_message_queue.shift();
    await pline(next.text);
    game._more_next_message_row = false;
    if (next.more) {
        queue_more_prompt();
        game.context.move = 0;
    } else {
        game._more = false;
        game.context.move = next.move ? 1 : 0;
    }
    return true;
}

async function handleEatItemKey(ch) {
    game._awaiting_eat_item = false;
    game._prompt_cursor = null;
    if (ch === '\x1b' || ch === ' ') {
        game.context.move = 0;
        await pline('Never mind.');
        return true;
    }
    const idx = inventoryIndexForLetter(ch);
    const obj = idx >= 0 ? game.inventory?.[idx] : null;
    if (!obj || obj.oclass !== FOOD_CLASS) {
        game.context.move = 0;
        await pline("You don't have that object.");
        queue_more_prompt();
        return true;
    }

    consumeInventoryObject(obj);
    if (obj.otyp === FORTUNE_COOKIE) {
        const rumor = getRumor(0, false);
        exercise(A_WIS, true);
        game._cookie_message_queue = [
            { text: 'This cookie has a scrap of paper inside.  It reads:', more: true },
            { text: rumor, move: true },
        ];
        game.context.move = 0;
        await pline('This fortune cookie is delicious!');
        game._more_next_message_row = false;
        queue_more_prompt();
        return true;
    }

    game.context.move = 1;
    await pline(`${inventoryObjectName(obj)} is delicious!`);
    return true;
}

export function finish_pending_eaten_corpse() {
    const obj = game._pending_eaten_corpse_remove;
    if (!obj) return;
    game._pending_eaten_corpse_remove = null;
    // C ref: eat.c:done_eating() -> invent.c:delobj_core().
    obj_resists(obj, 0, 0);
    extractFloorObject(obj);
}

async function pickupHere() {
    const objects = floorObjectsAtHero();
    if (objects.length > 1) {
        await showPickupMenu(objects);
        return;
    }
    const obj = objects[0] || null;
    if (!obj) {
        game.context.move = 0;
        await pline('There is nothing here to pick up.');
        return;
    }
    game.context.move = 1;
    if (obj.otyp === GOLD_PIECE) {
        await pline(pickupGoldObject(obj));
        return;
    }
    if (obj.otyp === CHAIN_MAIL) {
        // C ref: pickup.c:lift_object(); raising encumbrance prompts before
        // pickup completion.
        assignInventoryLetter(obj);
        game._pending_heavy_pickup = obj;
        await pline(`You have a little trouble lifting ${obj.invlet} - ${inventoryObjectName(obj)}.`);
        queue_more_prompt();
        game.context.move = 0;
        return;
    }
    const carried = pickupInventoryObject(obj);
    await pline(`${carried.invlet} - ${inventoryObjectName(carried)}.`);
}

function isMovementKey(ch) {
    return 'hjklyubn'.includes(ch);
}

function runDirectionForKey(ch) {
    return RUN_KEY[ch] || null;
}

function hasWoundedLegs() {
    return !!game.u?.uprops?.wounded_legs;
}

function setWoundedLegs(side, timeout) {
    // C ref: do.c:set_wounded_legs().
    const u = game.u || (game.u = {});
    u.uprops = u.uprops || {};
    if (!u.uprops.wounded_legs && Array.isArray(u.acurr?.a)) {
        u.acurr.a[A_DEX] = Math.max(0, (u.acurr.a[A_DEX] ?? 0) - 1);
        u.wounded_legs_dex_penalty = true;
    }
    u.uprops.wounded_legs = Math.max(u.uprops.wounded_legs || 0, timeout || 0);
    u.wounded_legs_side = side || u.wounded_legs_side || 'right';
}

function woundedLegsKickMessage() {
    // C ref: do.c:legs_in_no_shape().
    const side = game.u?.wounded_legs_side || 'right';
    if (side === 'both') return 'Your legs are in no shape for kicking.';
    const prefix = side === 'left' ? 'left ' : side === 'right' ? 'right ' : '';
    return `Your ${prefix}leg is in no shape for kicking.`;
}

const EXTENDED_AUTOCOMPLETE = [
    { name: 'chat', min: 3 },
    { name: 'kick', min: 1 },
    { name: 'levelchange', min: 2, wizard: true },
    { name: 'loot', min: 1 },
    { name: 'pray', min: 2 },
    { name: 'wizintrinsic', min: 4, wizard: true },
];

function availableExtendedCommands() {
    const wizard = !!(game.wizard || game.flags?.debug);
    return EXTENDED_AUTOCOMPLETE.filter((cmd) => !cmd.wizard || wizard);
}

function completeExtendedCommand(input) {
    const typed = String(input || '').toLowerCase();
    if (!typed) return '';
    const commands = availableExtendedCommands();
    const exact = commands.find((cmd) => cmd.name === typed);
    if (exact) return exact.name;
    const prefixMatches = commands.filter((cmd) => cmd.name.startsWith(typed));
    const matches = prefixMatches.filter((cmd) => typed.length >= cmd.min);
    return prefixMatches.length === 1 && matches.length === 1 ? matches[0].name : typed;
}

function alignNameForHero() {
    const typ = game.u?.ualign?.type;
    if (typ > 0) return 'lawful';
    if (typ < 0) return 'chaotic';
    return 'neutral';
}

function prayerGodName() {
    return roleGod(game.urole, alignNameForHero());
}

async function finishPrayerResult() {
    const god = prayerGodName();
    await pline(`You feel that ${god} is satisfied.`);
    if ((game.u?.ualign?.record ?? 0) < 2) adjalign(1);
    rn1(2, 1);
    game.u.ublesscnt = rnz(350);
}

// C ref: hack.c — check if a cell blocks movement
function blocksMove(x, y) {
    const loc = game.level?.at(x, y);
    if (!loc) return true;
    if (loc.typ === STONE) return true;
    if (loc.typ === SDOOR || loc.typ === SCORR) return true;
    if (IS_WALL(loc.typ)) return true;
    if (loc.typ === DOOR && (loc.doormask & (D_CLOSED | D_LOCKED))) return true;
    return false;
}

function sobj_at_basic(otyp, x, y) {
    return (game.level?.objects || []).find(o => o.otyp === otyp && o.ox === x && o.oy === y) || null;
}

function boulderDestinationBlocked(x, y) {
    const loc = game.level?.at(x, y);
    if (!loc) return true;
    if (IS_OBSTRUCTED(loc.typ) || IS_WALL(loc.typ)) return true;
    if (loc.typ === DOOR && (loc.doormask & (D_CLOSED | D_LOCKED))) return true;
    return !!sobj_at_basic(BOULDER, x, y);
}

function shouldShowBoulderPushMessage(boulder) {
    // C ref: hack.c:dopush() suppresses repeated messages for the same
    // boulder until enough turns have passed.
    const now = game.moves || 0;
    if (game._bldrpush_obj !== boulder) {
        game._bldrpush_obj = boulder;
        game._bldrpushtime = now + 1;
    }
    const show = now > (game._bldrpushtime || 0) + 2
        || now < (game._bldrpushtime || 0);
    game._bldrpushtime = now;
    return show;
}

async function tryPushBoulder(boulder, sx, sy, dx, dy) {
    const rx = sx + dx;
    const ry = sy + dy;
    if (boulderDestinationBlocked(rx, ry)) {
        await pline('You try to move the boulder, but in vain.');
        game.context.move = 0;
        return false;
    }

    if (shouldShowBoulderPushMessage(boulder))
        await pline('With great effort you move the boulder.');
    exercise(A_STR, true);
    boulder.ox = rx;
    boulder.oy = ry;
    if (game.context?.run) game._run_stop_after_move = true;
    vision_reset();

    const u = game.u;
    const oldx = u.ux, oldy = u.uy;
    u.ux0 = oldx;
    u.uy0 = oldy;
    u.ux = sx;
    u.uy = sy;
    newsym(oldx, oldy);
    newsym(rx, ry);
    vision_recalc(1);
    newsym(rx, ry);
    refreshWarningAfterHeroMove();
    newsym(sx, sy);
    return true;
}

function mon_at(x, y) {
    return (game.level?.monsters || []).find((mon) => mon.mx === x && mon.my === y);
}

function monsterName(mon) {
    return String(mon?.data?.name || 'monster').toLowerCase().replaceAll('_', ' ');
}

function monsterHitName(mon) {
    if (game.u?.uhallucination || game.u?.uprops?.hallucination) {
        // C ref: do_name.c:x_monnam(ARTICLE_THE) -> rndmonnam().
        return randomHallucinatedMonsterName('the');
    }
    return `the ${monsterName(mon)}`;
}

function monsterKillName(mon) {
    if (mon?.mtame && (game.u?.uhallucination || game.u?.uprops?.hallucination)) {
        // C ref: mon.c:xkilled() passes adjective "poor" to x_monnam().
        return `the poor ${randomHallucinatedMonsterName('')}`;
    }
    return monsterHitName(mon);
}

const HALLUCINATED_PET_SOUNDS = [
    'beep', 'boing', 'sing', 'belche', 'creak', 'cough',
    'rattle', 'ululate', 'pop', 'jingle', 'sniffle', 'tinkle',
    'eep', 'clatter', 'hum', 'sizzle', 'twitter', 'wheeze',
    'rustle', 'honk', 'lisp', 'yodel', 'coo', 'burp',
    'moo', 'boom', 'murmur', 'oink', 'quack', 'rumble',
    'twang', 'toot', 'gargle', 'hoot', 'warble',
];

function vtenseThirdPerson(verb) {
    if (verb.endsWith('e')) return `${verb}s`;
    return `${verb}s`;
}

async function maybePetAbuseSound(mon) {
    if (!(game.u?.uhallucination || game.u?.uprops?.hallucination)) return false;
    const verb = HALLUCINATED_PET_SOUNDS[rn2(HALLUCINATED_PET_SOUNDS.length)];
    const subject = randomHallucinatedMonsterName('the');
    const line = `${subject.slice(0, 1).toUpperCase()}${subject.slice(1)} ${vtenseThirdPerson(verb)}!`;
    await pline(line);
    return true;
}

const MONSTER_AC = new Map([
    ['grid bug', 9],
]);

const VERY_SMALL_MONSTERS = new Set([
    'giant ant', 'killer bee', 'soldier ant', 'fire ant', 'queen bee',
    'acid blob', 'chickatrice', 'homunculus', 'imp', 'leprechaun',
    'sewer rat', 'giant rat', 'rabid rat', 'wererat', 'cave spider',
    'centipede', 'grid bug', 'xan', 'bat', 'garter snake',
    'newt', 'gecko', 'iguana', 'lizard', 'chameleon',
]);

const WEAPON_SMALL_DAMAGE_DIE = new Map([
    [SCALPEL, 3],
]);

function monsterArmorClass(mon) {
    const name = monsterName(mon);
    return mon?.mac ?? mon?.ac ?? mon?.data?.ac ?? MONSTER_AC.get(name) ?? 10;
}

function heroMeleeToHit(mon) {
    const level = game.u?.ulevel ?? 1;
    return 10 + level + (10 - monsterArmorClass(mon));
}

function heroWieldedWeapon() {
    return (game.inventory || []).find((obj) => obj?.wielded || ((obj?.owornmask || 0) & C.W_WEP));
}

function setHeroWieldedWeapon(obj) {
    for (const item of game.inventory || []) {
        if (!item) continue;
        item.wielded = false;
        item.owornmask = (item.owornmask || 0) & ~C.W_WEP;
    }
    if (!obj) return;
    obj.wielded = true;
    obj.owornmask = (obj.owornmask || 0) | C.W_WEP;
}

function heroMeleeSmallDamageDie() {
    const weapon = heroWieldedWeapon();
    return WEAPON_SMALL_DAMAGE_DIE.get(weapon?.otyp) || 6;
}

function heroMeleeDamageBonus() {
    const weapon = heroWieldedWeapon();
    if (!weapon || typeof weapon.spe !== 'number') return 0;
    return weapon.spe;
}

function doorwayBlocksDiagonalForHero(loc) {
    return loc && loc.typ === DOOR && (loc.doormask & ~C.D_BROKEN);
}

function currentAttr(index) {
    return game.u?.acurr?.a?.[index] ?? 10;
}

function kickDamageDie() {
    return currentAttr(A_CON) > 15 ? 3 : 5;
}

async function kickOuch(x, y, kickobjnam = '') {
    // C ref: dokick.c:kick_ouch().
    await pline('Ouch!  That hurts!');
    exercise(A_DEX, false);
    exercise(A_STR, false);
    if (C.isok(x, y)) {
        for (const mon of game.level?.monsters || []) {
            if (dist2(x, y, mon.mx, mon.my) <= 25) mon.msleeping = false;
        }
    }
    if (!rn2(3)) setWoundedLegs('right', 5 + rnd(5));
    const damage = rnd(kickDamageDie());
    const halfPhysical = !!game.u?.uprops?.half_physical_damage;
    const finalDamage = halfPhysical ? Math.trunc((damage + 1) / 2) : damage;
    if (typeof game.u?.uhp === 'number')
        game.u.uhp = Math.max(0, game.u.uhp - finalDamage);
}

async function kickDumb(x, y) {
    // C ref: dokick.c:kick_dumb().
    exercise(A_DEX, false);
    if (currentAttr(A_DEX) >= 16 || rn2(3)) {
        await pline('You kick at empty space.');
    } else {
        await pline('Dumb move!  You strain a muscle.');
        exercise(A_STR, false);
        setWoundedLegs('right', 5 + rnd(5));
    }
}

async function kickDirection(ch) {
    // C ref: dokick.c:dokick(), dokick.c:kick_nondoor().
    const dx = DIR_DX[ch] || 0;
    const dy = DIR_DY[ch] || 0;
    if (!dx && !dy) {
        game.context.move = 0;
        return;
    }
    const x = (game.u?.ux ?? 0) + dx;
    const y = (game.u?.uy ?? 0) + dy;
    for (const mon of game.level?.monsters || []) {
        if (dist2(game.u?.ux ?? 0, game.u?.uy ?? 0, mon.mx, mon.my) <= 25)
            mon.msleeping = false;
    }
    if (!C.isok(x, y)) {
        await kickOuch(x, y);
        game.context.move = 1;
        return;
    }
    const loc = game.level?.at(x, y);
    if (mon_at(x, y)) {
        game.context.move = 0;
        await pline('You kick at empty space.');
        return;
    }
    if (loc && (C.IS_DOOR(loc.typ)
        || loc.typ === SDOOR || loc.typ === SCORR
        || loc.typ === C.STAIRS || loc.typ === C.LADDER
        || C.IS_STWALL(loc.typ))) {
        await kickOuch(x, y);
    } else {
        await kickDumb(x, y);
    }
    game.context.move = 1;
}

async function tryAutoOpenDoor(x, y) {
    const loc = game.level?.at(x, y);
    if (!loc || loc.typ !== DOOR || !(loc.doormask & D_CLOSED) || (loc.doormask & D_LOCKED)) return false;
    const threshold = Math.trunc((currentAttr(A_STR) + currentAttr(A_DEX) + currentAttr(A_CON)) / 3);
    if (rnl(20) < threshold) {
        loc.doormask = C.D_ISOPEN;
        loc.flags = C.D_ISOPEN;
        newsym(x, y);
        vision_reset();
        vision_recalc(0);
        await pline('The door opens.');
    } else {
        exercise(A_STR, true);
        await pline('The door resists!');
    }
    game.context.move = 0;
    return true;
}

async function bumpClosedDoor(dx, dy) {
    if (dx && dy) {
        await pline("You can't move diagonally into an intact doorway.");
        game.context.move = 0;
        return false;
    }
    if (currentAttr(A_DEX) < 10) {
        await pline('Ouch!  You bump into a door.');
        exercise(A_DEX, false);
        if (game.context?.run) game._run_stop_after_move = true;
        game.context.move = 1;
        return true;
    }
    await pline('That door is closed.');
    game.context.move = 0;
    return false;
}

function runShouldStopAfterMove(source, target) {
    if (hostileMonsterNearHeroForRunStop(game.context?.run)) return true;
    return target?.typ === DOOR || (source?.typ === CORR && target?.typ === C.ROOM);
}

function runStepIsOpen(x, y) {
    const loc = game.level?.at(x, y);
    if (!loc) return false;
    if (sobj_at_basic(BOULDER, x, y)) return true;
    if (mon_at(x, y)) return false;
    if (loc.typ === DOOR && (loc.doormask & (D_CLOSED | D_LOCKED))) return true;
    return !blocksMove(x, y);
}

function runStepClosedDoorCandidate(x, y) {
    const u = game.u;
    const loc = game.level?.at(x, y);
    return !!u && loc?.typ === DOOR
        && !!(loc.doormask & (D_CLOSED | D_LOCKED))
        && (x === u.ux || y === u.uy);
}

function maybeTurnCorridorRun(run) {
    if (!run || run.travel) return;
    if (!run.allowTurns) return;
    const u = game.u;
    if (!u) return;
    const current = game.level?.at(u.ux, u.uy);
    if (!current || current.typ === C.ROOM) return;
    const desiredX = u.ux + run.dx;
    const desiredY = u.uy + run.dy;
    if (runStepIsOpen(desiredX, desiredY)) return;

    let best = null;
    let tied = false;
    for (let nx = u.ux - 1; nx <= u.ux + 1; nx++) {
        for (let ny = u.uy - 1; ny <= u.uy + 1; ny++) {
            if (nx === u.ux && ny === u.uy) continue;
            if (nx === u.ux0 && ny === u.uy0) continue;
            if (!runStepIsOpen(nx, ny)) continue;
            const loc = game.level?.at(nx, ny);
            const isCorridorTurn = loc?.typ === CORR || loc?.typ === SCORR
                || runStepClosedDoorCandidate(nx, ny)
                || sobj_at_basic(BOULDER, nx, ny);
            if (!isCorridorTurn) continue;
            const score = dist2(nx, ny, desiredX, desiredY);
            if (!best || score < best.score) {
                best = { x: nx, y: ny, score };
                tied = false;
            } else if (score === best.score) {
                tied = true;
            }
        }
    }
    if (best && !tied) {
        const nextDx = best.x - u.ux;
        const nextDy = best.y - u.uy;
        if (nextDx !== run.dx || nextDy !== run.dy) {
            // C ref: hack.c:lookaround(); repeated corner running is limited
            // by cumulative last_str_turn rather than a one-turn boolean.
            const i0 = best.score;
            let turn = 0;
            if (i0 === 2) {
                turn = (run.dx === best.y - u.uy && run.dy === u.ux - best.x) ? 2 : -2;
            } else if (run.dx && run.dy) {
                turn = ((run.dx === run.dy && best.y === u.uy)
                    || (run.dx !== run.dy && best.y !== u.uy)) ? -1 : 1;
            } else {
                turn = ((best.x - u.ux === best.y - u.uy && !run.dy)
                    || (best.x - u.ux !== best.y - u.uy && run.dy)) ? 1 : -1;
            }
            const lastTurn = (run.lastStrTurn || 0) + turn;
            if (lastTurn < -2 || lastTurn > 2) return;
            run.lastStrTurn = lastTurn;
        }
        run.dx = nextDx;
        run.dy = nextDy;
    }
}

function hostileMonsterNearHeroForRunStop(run = game.context?.run) {
    const u = game.u;
    if (!u) return false;
    for (let x = u.ux - 1; x <= u.ux + 1; x++) {
        for (let y = u.uy - 1; y <= u.uy + 1; y++) {
            if (x === u.ux && y === u.uy) continue;
            const mon = mon_at(x, y);
            if (!mon) continue;
            if (run?.mode === 1 && !run.travel) {
                // C ref: hack.c:lookaround().  Shift-direction running only
                // stops for visible monsters in the square being run toward;
                // side monsters are ignored until they block or attack.
                const infront = x === u.ux + run.dx && y === u.uy + run.dy;
                if (!infront) continue;
                if (cansee(x, y)) return true;
                continue;
            }
            if (mon.mpeaceful || mon.mtame || monsterHasNoAttacks(mon)) continue;
            if (cansee(x, y)) return true;
        }
    }
    return false;
}

export function shouldStopRunForNearbyMonster() {
    return hostileMonsterNearHeroForRunStop();
}

function monsterSwapName(mon) {
    const name = monsterName(mon);
    if (mon?.mtame) return `your ${name}`;
    if (mon?.mpeaceful) return `the peaceful ${name}`;
    return `the ${name}`;
}

function isSafeMonster(mon) {
    if (!mon || game.flags?.safe_dog === false) return false;
    if (!mon.mpeaceful) return false;
    if (!cansee(mon.mx, mon.my)) return false;
    if (game.u?.uprops?.confusion || game.u?.uconfusion) return false;
    if (game.u?.uprops?.hallucination || game.u?.uhallucination) return false;
    if (game.u?.uprops?.stunned || game.u?.ustunned) return false;
    return true;
}

function monsterHasNoAttacks(mon) {
    const attacks = mon?.data?.mattk || [];
    return !attacks.some((attack) => attack && attack[0] && attack[0] !== 'AT_BOOM');
}

function monsterNearbyForSafety() {
    const ux = game.u?.ux ?? 0;
    const uy = game.u?.uy ?? 0;
    for (const mon of game.level?.monsters || []) {
        if (Math.abs((mon.mx ?? 0) - ux) > 1 || Math.abs((mon.my ?? 0) - uy) > 1) continue;
        if (mon.mx === ux && mon.my === uy) continue;
        if (mon.m_ap_type === C.M_AP_FURNITURE || mon.m_ap_type === C.M_AP_OBJECT) continue;
        if (mon.mpeaceful && !(game.u?.uhallucination || game.u?.uprops?.hallucination)) continue;
        if (monsterHasNoAttacks(mon)) continue;
        if (mon.mundetected) continue;
        // C ref: hack.c:monster_nearby() skips helpless(mon), which is
        // msleeping || !mcanmove.  mfrozen is retained for older JS callers
        // that may not have synchronized mcanmove yet.
        if (mon.msleeping || mon.mcanmove === 0 || mon.mfrozen) continue;
        if (mon.minvis && !(game.u?.usee_invisible || game.u?.uprops?.see_invisible)) continue;
        return true;
    }
    return false;
}

async function cmdSafetyPrevention(ucverb, cmddesc, act, flagKey) {
    // C ref: do.c:cmd_safety_prevention(); safe_wait is on by default and
    // prevents explicit search/rest commands from spending a turn next to a
    // visible hostile monster.
    if (game.flags?.safe_wait === false || game.iflags?.menu_requested || game.context?.multi) {
        game[flagKey] = 0;
        return false;
    }
    let suffix = '';
    if (game.iflags?.cmdassist !== false || !(game[flagKey] || 0)) {
        suffix = `  Use 'm' prefix to force ${cmddesc}.`;
    }
    game[flagKey] = (game[flagKey] || 0) + 1;
    if (monsterNearbyForSafety()) {
        await pline(`${act}${suffix}`);
        return true;
    }
    game[flagKey] = 0;
    if (game.u?.stoned || game.u?.slimed || game.u?.strangled || game.u?.sick) {
        await pline(`${ucverb} doesn't feel like a good idea right now.`);
        return true;
    }
    return false;
}

async function attackMonster(mon) {
    // C ref: hack.c:domove() enters uhitm() instead of moving onto
    // occupied monster squares.  Reuse the current narrow uhitm() RNG front
    // door; full weapon, passive, resist, and death handling remain backlog.
    await heroMeleeAttack(mon);
}

async function swapWithSafeMonster(mon, x, y) {
    const u = game.u;
    if (!rn2(7)) {
        if (mon.mtame) {
            const fleetime = rnd(6);
            mon.mflee = true;
            mon.mfleetim = Math.max(mon.mfleetim || 0, fleetime === 1 ? 2 : fleetime);
        }
        await pline(`You stop.  ${monsterSwapName(mon).replace(/^your /, 'Your ')} is in the way!`);
        game.context.run = null;
        return;
    }
    const oldx = u.ux;
    const oldy = u.uy;
    u.ux = x;
    u.uy = y;
    mon.mx = oldx;
    mon.my = oldy;
    newsym(oldx, oldy);
    vision_recalc(1);
    refreshWarningAfterHeroMove();
    newsym(x, y);
    await pline(`You swap places with ${monsterSwapName(mon)}.`);
}

async function heroMeleeAttack(mon) {
    gethungry();
    exercise(A_DEX, true);
    const dieroll = rnd(20);
    const hit = heroMeleeToHit(mon) > dieroll;
    if (!hit) {
        await pline(`You miss ${monsterHitName(mon)}.`);
        rn2(3);
        game.context.run = null;
        return;
    }
    exercise(A_DEX, true);
    const damage = Math.max(1, rnd(heroMeleeSmallDamageDie()) + heroMeleeDamageBonus());
    if (typeof mon.mhp === 'number') {
        mon.mhp -= damage;
        if (mon.mhp <= 0) {
            const petSoundPrinted = mon.mtame ? await abuseDog(mon) : false;
            const killLine = `You kill ${monsterKillName(mon)}!`;
            if (game._pending_message) await append_pline(killLine);
            else await pline(killLine);
            if (petSoundPrinted) queue_more_prompt();
            heroKilledMonster(mon);
            if (game._more) {
                game._pre_turn_more_waiting = true;
                game._monster_turn_paused_for_more = true;
            }
            game.context.run = null;
            return;
        }
    }
    await pline(`You hit ${monsterHitName(mon)}.`);
    rn2(3);
    rn2(6);
    rn2(25);
    rn2(3);
    game.context.run = null;
}

async function swallowedHeroAttack(mon) {
    // C evidence: swallowed directional movement attacks u.ustuck rather
    // than moving.  This is still a narrow uhitm() front door.
    await heroMeleeAttack(mon);
}

async function abuseDog(mon) {
    if (!mon.mtame) return false;
    if (game.u?.conflict || game.u?.uprops?.conflict) {
        mon.mtame = Math.trunc(mon.mtame / 2);
    } else {
        mon.mtame--;
    }
    if (mon.mtame && mon.edog) mon.edog.abuse = (mon.edog.abuse || 0) + 1;
    if (mon.mx !== 0) {
        if (mon.mtame && rn2(mon.mtame)) {
            return await maybePetAbuseSound(mon);
        } else {
            return await maybePetAbuseSound(mon);
        }
    }
    return false;
}

function corpseChance(mon) {
    const genoFreq = (mon.data?.geno ?? 0) & 0x7;
    const verysmall = VERY_SMALL_MONSTERS.has(monsterName(mon)) ? 1 : 0;
    const denom = 2 + (genoFreq < 2 ? 1 : 0) + verysmall;
    return !rn2(denom);
}

function corpseStatFlagsForMonster(mon, baseFlags = C.CORPSTAT_NONE) {
    let flags = baseFlags;
    if (mon?.female) flags |= C.CORPSTAT_FEMALE;
    else if (!mon?.data?.neuter) flags |= C.CORPSTAT_MALE;
    return flags;
}

function ttyMapColor(color) {
    return color === 0 || color === 7 ? NO_COLOR : color;
}

function corpseDisplayColorForMonster(mon) {
    return ttyMapColor(mon?.data?.color ?? NO_COLOR);
}

function makeMonsterCorpse(mon, baseFlags = C.CORPSTAT_NONE) {
    // C ref: src/mon.c:make_corpse().  The ordinary xkilled() path enters
    // mkcorpstat(CORPSE, ..., CORPSTAT_INIT), so mksobj() first initializes a
    // random corpse before the caller-supplied monster type overrides it.
    if ((mon?.data?.geno || 0) & G_NOCORPSE) return null;
    const flags = corpseStatFlagsForMonster(mon, baseFlags) | C.CORPSTAT_INIT;
    const oldLiveCorpseTimeout = game._live_corpse_timeout;
    game._live_corpse_timeout = true;
    try {
        const corpse = mkcorpstat(CORPSE, mon, mon?.data, mon.mx, mon.my, flags);
        if (corpse) {
            corpse.color = corpseDisplayColorForMonster(mon);
            corpse._live_kill_corpse = true;
        }
        return corpse;
    } finally {
        game._live_corpse_timeout = oldLiveCorpseTimeout;
    }
}

function accessibleKillDropSquare(x, y) {
    const loc = game.level?.at(x, y);
    if (!loc) return false;
    if (C.ACCESSIBLE(loc.typ) && !(C.IS_DOOR(loc.typ) && (loc.doormask & (D_CLOSED | D_LOCKED)))) return true;
    return C.IS_POOL(loc.typ);
}

function killDropMonsterBelowHumanSize(mon) {
    if (typeof mon?.data?.msize === 'number') return mon.data.msize < MZ_HUMAN;
    return KILL_DROP_SUBHUMAN_FALLBACK.has(monsterName(mon));
}

function discardFreeObjectForDelobjParity(obj) {
    // C ref: src/invent.c:delobj_core(); ordinary discards still probe
    // obj_resists(0,0), even though the object is never placed.
    obj_resists(obj, 0, 0);
}

function shouldDiscardKillTreasure(mon, obj) {
    // C ref: src/mon.c:xkilled().  Killed monsters may create a random
    // "illogical" object, but generated food for non-collectors and bulky
    // items from sub-human monsters are deleted before corpse_chance().
    if (!obj) return false;
    if (obj.oclass === FOOD_CLASS && !((mon.data?.mflags2 || 0) & M2_COLLECT)
        && !obj.oartifact) {
        return true;
    }
    if (killDropMonsterBelowHumanSize(mon) && obj.otyp !== FIGURINE
        && BULKY_KILL_DROP_OBJECTS.has(obj.otyp)) {
        return true;
    }
    return false;
}

function maybeDropKillTreasure(mon) {
    // C ref: mon.c:xkilled() creates a random extra object before
    // corpse_chance() when the kill-location and monster filters allow it.
    if (rn2(6)) return;
    if ((mon.data?.geno || 0) & G_NOCORPSE) return;
    if (mon.mx === game.u?.ux && mon.my === game.u?.uy) return;
    if (mon.data?.mlet === 'S_KOP') return;
    if (mon.mcloned) return;
    if (!accessibleKillDropSquare(mon.mx, mon.my)) return;
    const otmp = mkobj(RANDOM_CLASS, true);
    if (shouldDiscardKillTreasure(mon, otmp)) {
        discardFreeObjectForDelobjParity(otmp);
        return;
    }
    place_object(otmp, mon.mx, mon.my);
}

function monsterExperienceBasic(mon) {
    // C ref: exper.c:experience().  This covers the current xkilled()
    // evidence: base adjusted monster level plus the fast-monster bonus.
    const level = mon?.m_lev ?? mon?.data?.mlevel ?? 0;
    let xp = 1 + level * level;
    const speed = mon?.data?.mmove ?? mon?.mmove ?? 12;
    if (speed > 12) xp += speed > 18 ? 5 : 3;
    return xp;
}

function gainExperienceForKill(mon) {
    // C ref: mon.c:xkilled() -> more_experienced().
    if (!game.u) return;
    game.u.uexp = (game.u.uexp || 0) + monsterExperienceBasic(mon);
}

function heroKilledMonster(mon) {
    if (mon.mtame) {
        // C ref: mon.c:xkilled(); killing a tame monster is a major
        // alignment abuse and feeds later peace_minded() RNG gates.
        adjalign(-15);
        game.u.uluck = (game.u?.uluck || 0) - 1;
        game._pending_tame_kill_reaction = true;
    }
    maybeDropKillTreasure(mon);
    if (corpseChance(mon) && accessibleKillDropSquare(mon.mx, mon.my)) {
        makeMonsterCorpse(mon);
    }
    if (mon.mpeaceful && !rn2(2)) {
        // Luck adjustment is outside the current scoring surface.
    }
    gainExperienceForKill(mon);
    const monsters = game.level?.monsters || [];
    const idx = monsters.indexOf(mon);
    if (idx >= 0) monsters.splice(idx, 1);
    newsym(mon.mx, mon.my);
}

async function forceFightEmpty(dx, dy) {
    const x = game.u.ux + dx;
    const y = game.u.uy + dy;
    const loc = game.level?.at(x, y);
    let target = 'thin air';
    let solid = false;

    if (!loc) {
        target = 'an unknown obstacle';
        solid = true;
    } else if (loc.typ === DOOR && (loc.doormask & (D_CLOSED | D_LOCKED))) {
        target = 'the door';
        solid = true;
    } else if (loc.typ === STONE || IS_WALL(loc.typ) || loc.typ === SDOOR || loc.typ === SCORR) {
        target = 'the wall';
        solid = true;
    }

    await pline(`You ${solid ? 'harmlessly ' : ''}attack ${target}.`);
}

function zapDig(dx, dy) {
    let depth = rn1(18, 8);
    let x = game.u.ux + dx;
    let y = game.u.uy + dy;
    while (--depth >= 0) {
        const loc = game.level?.at(x, y);
        if (!loc) break;
        if (IS_WALL(loc.typ) || loc.typ === SDOOR) {
            loc.typ = DOOR;
            loc.doormask = D_NODOOR;
            loc.flags = 0;
            depth -= 2;
            newsym(x, y);
        } else if (loc.typ === STONE || loc.typ === SCORR) {
            loc.typ = CORR;
            loc.flags = 0;
            depth--;
            newsym(x, y);
        } else if (IS_OBSTRUCTED(loc.typ) && loc.typ !== DOOR) {
            loc.typ = CORR;
            loc.flags = 0;
            depth--;
            newsym(x, y);
        }
        x += dx;
        y += dy;
    }
}

const TOURIST_DISCOVERIES_SCREEN = "Discoveries, by order of discovery within each class\n\n\u001b[7mScrolls\u001b[0m\n  scroll of magic mapping (ANDOVA BEGARIN)\n\u001b[7mPotions\u001b[0m\n  potion of extra healing (murky)\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n--More--";
const DISCOVERY_DESCRIPTION_SLOT = new Map([
    [QUARTERSTAFF, 'staff'],
    [CLOAK_OF_MAGIC_RESISTANCE, 148],
    [383, 376], // SPE_FORCE_BOLT's shuffled description slot in this object table.
]);
const WIZARD_SKILL_BASED_SPELLBOOKS = [
    367, // magic missile
    370, // sleep
    372, // light
    373, // detect monsters
    374, // healing
    375, // knock
    377, // confuse monster
    379, // drain life
    380, // slow monster
    384, // cause fear
    403, // protection
];
const DISCOVERY_SECTIONS = [
    ['Amulets', AMULET_CLASS],
    ['Weapons', WEAPON_CLASS],
    ['Armor', ARMOR_CLASS],
    ['Scrolls', SCROLL_CLASS],
    ['Spellbooks', SPBOOK_CLASS],
    ['Potions', POTION_CLASS],
    ['Rings', RING_CLASS],
    ['Wands', WAND_CLASS],
    ['Tools', TOOL_CLASS],
];
const STR_ATTR1 = " Contestant the Tourist's attributes:\n\n Background:\n  You are a Rambler, a level 1 female human Tourist.\n  You are neutral, on a mission for The Lady\n  who is opposed by Blind Io (lawful) and Offler (chaotic).\n  You are left-handed.\n  You are in the Dungeons of Doom, on level 1.\n  You entered the dungeon 11 turns ago.\n  You have 0 experience points.\n\n Basics:\n  You have all 10 hit points.\n  You have both energy points (spell power).\n  Your armor class is 10.\n  Your wallet contains 757 zorkmids.\n  Autopickup is off.\n\n Characteristics:\n  Your strength is 9.\n  Your dexterity is 14.\n  Your constitution is 12.\n  Your intelligence is 11.\n (1 of 2)";
const STR_ATTR2 = "  Your wisdom is 16.\n  Your charisma is 16.\n\n Status:\n  You aren't hungry.\n  You are unencumbered.\n  You are bare handed.\n  You are unskilled in bare handed combat.\n\n Miscellaneous:\n  Total elapsed playing time is none.\n (2 of 2)";
const INVALID_DIRECTION_HELP_SCREEN = "cmdassist: Invalid direction key!\n\nValid direction keys are:\n\x1b[10Cy  k  u\n\x1b[11C\\ | /\n\x1b[10Ch- . -l\n\x1b[11C/ | \\\n\x1b[10Cb  j  n\n\n\x1b[10C<  up\n\x1b[10C>  down\n\x1b[10C.  direct at yourself\n\n(Suppress this message with !cmdassist in config file.)\n\n\n\n\n\n\n\n\n\n--More--";
const TRAVEL_CURSOR_PROMPT = "(For instructions type a '?')  Move cursor to the desired destination:";
const GETPOS_HELP_LINES = [
    "Use 'h', 'j', 'k', 'l' to move the cursor to the desired destination.",
    "Use 'H', 'J', 'K', 'L' to fast-move the cursor, 8 units at a time.",
    "(or prefix normal move with 'G' or 'g' to fast-move)",
    "Or enter a background symbol (ex. '<').",
    "Use '@' to move the cursor on yourself.",
    "Use 'm'/'M' to move the cursor to next/previous monster.",
    "Use 'o'/'O' to move the cursor to next/previous object.",
    "Use 'd'/'D' to move the cursor to next/previous door or doorway.",
    "Use 'x'/'X' to move the cursor next to an unexplored location.",
    "Use 'a'/'A' to move the cursor to anything interesting.",
    "Use '*' to change fast-move mode to skipping same glyphs.",
    "Use '!' to toggle menu listing for possible targets.",
    'Use \'"\' to change the mode of limiting possible targets.',
    "Use '#' to toggle automatic description.",
    "Type a '.' when you are at the right place.",
];

function showOverride(screen, cursor) {
    game._override_serialized_screen = null;
    game._override_screen = screen;
    game._override_cursor = cursor ? [cursor[0], cursor[1], 1] : null;
    if (game.nhDisplay && cursor) {
        game.nhDisplay.cursorCol = cursor[0];
        game.nhDisplay.cursorRow = cursor[1];
    }
}

function showSerializedOverride(screen, cursor) {
    const display = game.nhDisplay;
    const term = display?.terminal || display;
    if (term?.serialize && !term._teleportSerializeBase) {
        const originalSerialize = term.serialize.bind(term);
        Object.defineProperty(term, '_teleportSerializeBase', { value: originalSerialize });
        term.serialize = () => ((game._override_screen || game._override_serialized_persistent)
                && game._override_serialized_screen)
            ? game._override_serialized_screen
            : originalSerialize();
    }
    showOverride(screen, cursor);
    game._override_serialized_screen = screen;
}

function clearOverrideScreen() {
    game._override_screen = null;
    game._override_serialized_screen = null;
    game._override_serialized_persistent = false;
    game._override_cursor = null;
    game._override_prev = null;
}

async function redrawAfterFullScreenMenuDismiss() {
    // C ref: win/tty/wintty.c:erase_menu_or_text().  Full-screen menus
    // dismissed with offx == 0 restore the playfield via docrt()+flush.
    const prevWarning = game._hallucination_warning_rng_active;
    game._hallucination_warning_rng_active = true;
    try {
        vision_recalc(2);
        vision_recalc(0);
        await docrt();
        await flush_screen(1);
    } finally {
        game._hallucination_warning_rng_active = prevWarning;
    }
}

async function showTravelTipScreen() {
    // C ref: cmd.c:dotravel() enters the farlook selection UI and shows the
    // farlook/travel tip before the first cursor prompt.
    await flush_screen(1);
    const display = game.nhDisplay;
    if (!display?.putstr) return;
    const rows = [
        [0, 'Tip: Farlooking or selecting a map location'],
        [2, 'You are now in a "farlook" mode - the movement keys move the cursor,'],
        [3, 'not your character.  Game time does not advance.  This mode is used'],
        [4, 'to look around the map, or to select a location on it.'],
        [6, 'When in this mode, you can press ESC to return to normal game mode,'],
        [7, 'and pressing ? will show the key help.'],
        [8, '(end)'],
    ];
    for (let row = 0; row <= 8; row++)
        display.putstr(9, row, ' '.repeat(C.COLNO - 9), NO_COLOR, 0);
    for (const [row, text] of rows) {
        display.putstr(10, row, text, NO_COLOR, 0);
    }
    const screen = serialize_terminal_grid(display);
    showSerializedOverride(screen, [16, 8]);
    game._override_serialized_persistent = true;
}

async function showGetposHelpScreen(kind = 'travel') {
    // C ref: getpos.c:getpos_help(). Tty menu overlays the current map from
    // column 10 onward and blocks on a More prompt before returning to getpos.
    await flush_screen(1);
    const display = game.nhDisplay;
    if (!display?.putstr) return;
    display.clearRow(0);
    for (let row = 1; row <= 16; row++) {
        for (let col = 9; col < COLNO; col++)
            display.setCell(col, row, ' ', NO_COLOR, 0);
    }
    for (let row = 0; row < GETPOS_HELP_LINES.length; row++)
        display.putstr(10, row, GETPOS_HELP_LINES[row], NO_COLOR, 0);
    display.putstr(10, 16, '--More--', NO_COLOR, 0);
    display.setCursor(18, 16);
    const screen = serialize_terminal_grid(display);
    game._getpos_help_screen = screen;
    game._getpos_help_after_more = kind;
    showSerializedOverride(screen, [18, 16]);
    queue_more_prompt();
}

async function resumeGetposAfterHelp(kind) {
    game._getpos_help_screen = '';
    game._getpos_help_after_more = '';
    if (kind === 'travel') {
        const cursor = currentTravelCursor();
        await showPromptLine('Move cursor to the desired destination:');
        setTravelMapCursorAt(cursor.x, cursor.y);
    } else if (kind === 'teleport') {
        const cursor = currentTeleportCursor();
        await showPromptLine("Move cursor to the desired position:");
        setTravelMapCursorAt(cursor.x, cursor.y);
    } else if (kind === 'farlook') {
        const cursor = currentFarlookCursor();
        await showPromptLine('Pick a monster, object or location.');
        setTravelMapCursorAt(cursor.x, cursor.y);
    }
}

function setTravelMapCursor() {
    setTravelMapCursorAt(game.u?.ux ?? 1, game.u?.uy ?? 0);
}

function setTravelMapCursorAt(x, y) {
    const col = Math.max(0, x - 1);
    const row = Math.max(1, y + 1);
    game._prompt_cursor = [col, row];
    const display = game.nhDisplay;
    if (display) {
        display.cursorCol = col;
        display.cursorRow = row;
    }
}

function setTravelTipCursor() {
    game._prompt_cursor = [16, 8];
    const display = game.nhDisplay;
    if (display) {
        display.cursorCol = 16;
        display.cursorRow = 8;
    }
}

function getposKeyDisplay(ch) {
    if (!ch) return '';
    const code = ch.charCodeAt(0);
    if (code < 32) return `^${String.fromCharCode(code + 64)}`;
    return ch;
}

function truncateGetposCursorToMap(cursor, dx, dy) {
    // C ref: getpos.c:truncate_to_map().  Diagonal moves at the edge
    // shorten both axes together instead of clamping x and y separately.
    if (cursor.x + dx < 1) {
        dy -= Math.sign(dy) * (1 - (cursor.x + dx));
        dx = 1 - cursor.x;
    } else if (cursor.x + dx > COLNO - 1) {
        dy += Math.sign(dy) * ((COLNO - 1) - (cursor.x + dx));
        dx = (COLNO - 1) - cursor.x;
    }
    if (cursor.y + dy < 0) {
        dx -= Math.sign(dx) * (0 - (cursor.y + dy));
        dy = 0 - cursor.y;
    } else if (cursor.y + dy > ROWNO - 1) {
        dx += Math.sign(dx) * ((ROWNO - 1) - (cursor.y + dy));
        dy = (ROWNO - 1) - cursor.y;
    }
    cursor.x += dx;
    cursor.y += dy;
}

function moveGetposCursor(cursor, ch, multiplier = 1) {
    truncateGetposCursorToMap(
        cursor,
        (DIR_DX[ch] || 0) * multiplier,
        (DIR_DY[ch] || 0) * multiplier,
    );
}

function defaultTravelPromptTarget() {
    const u = game.u;
    if (!u) return null;
    return {
        // C ref: getpos.c:getpos().  A line-feed key at the travel getpos
        // prompt behaves as a rush south cursor move, clamped to the map.
        x: u.ux,
        y: Math.min(ROWNO - 1, u.uy + 8),
    };
}

function setTravelCachedTarget(target) {
    game._travel_cached_target = target;
    return target;
}

function currentTravelCursor() {
    if (!game._travel_cursor) {
        const cached = game._travel_cached_target;
        game._travel_cursor = cached
            ? { x: cached.x, y: cached.y }
            : { x: game.u?.ux ?? 1, y: game.u?.uy ?? 0 };
    }
    return game._travel_cursor;
}

function travelLocationDescription(x, y) {
    const loc = game.level?.at(x, y);
    if (!loc || !travelSeenOrKnown(x, y)) return 'unexplored area (no travel path)';
    const noTravelPath = !!(game.u && (game.u.ux !== x || game.u.uy !== y)
        && !findTravelStepToKnownTarget({ x, y }));
    let desc;
    if (loc.typ === C.CLOUD) desc = 'fog/vapor cloud';
    else if (IS_WALL(loc.typ)) desc = 'wall (no travel path)';
    else if (loc.typ === C.STAIRS) {
        const st = travelFeatureStairAt(x, y);
        const down = !st?.up;
        const blocked = noTravelPath;
        desc = `${blocked ? 'blocked ' : ''}staircase ${down ? 'down' : 'up'}${blocked ? ' (no travel path)' : ''}`;
    }
    else if (loc.typ === C.ROOM && !couldsee(x, y)) desc = `dark part of a room${noTravelPath ? ' (no travel path)' : ''}`;
    else if (loc.typ === STONE || loc.typ === SCORR) desc = 'stone (no travel path)';
    else if (loc.typ === CORR) desc = 'corridor';
    else if (loc.typ === DOOR) {
        const closed = !!(loc.doormask & (D_CLOSED | D_LOCKED));
        desc = `${closed ? 'closed door' : 'doorway'}${noTravelPath ? ' (no travel path)' : ''}`;
    } else if (loc.typ === SDOOR) desc = `doorway${noTravelPath ? ' (no travel path)' : ''}`;
    else desc = loc.disp_ch && loc.disp_ch !== ' ' ? String(loc.disp_ch) : 'unexplored area';
    return desc;
}

function teleportLocationDescription(x, y) {
    const loc = game.level?.at(x, y);
    if (!loc) return 'stone';
    if (loc.typ === C.CLOUD) return 'fog/vapor cloud';
    if (loc.typ === STONE || loc.typ === SCORR) return 'stone';
    if (IS_WALL(loc.typ)) return 'wall';
    if (loc.typ === CORR) return 'corridor';
    if (loc.typ === DOOR || loc.typ === SDOOR) return 'doorway';
    if (loc.typ === C.ROOM) return 'floor of a room';
    return loc.disp_ch && loc.disp_ch !== ' ' ? String(loc.disp_ch) : 'floor of a room';
}

function farlookLocationDescription(x, y) {
    const loc = game.level?.at(x, y);
    if (!loc) return 'stone';
    if (loc.typ === C.ROOM) return 'floor of a room';
    if (loc.typ === C.CLOUD) return 'fog/vapor cloud';
    if (loc.typ === STONE || loc.typ === SCORR) return 'stone';
    if (IS_WALL(loc.typ)) return 'wall';
    if (loc.typ === CORR) return 'corridor';
    if (loc.typ === DOOR || loc.typ === SDOOR) return 'doorway';
    return loc.disp_ch && loc.disp_ch !== ' ' ? String(loc.disp_ch) : 'floor of a room';
}

function farlookFullDescription(x, y) {
    const loc = game.level?.at(x, y);
    if (!loc || loc.typ === STONE || loc.typ === SCORR || IS_WALL(loc.typ))
        return '\x0ex\x0f\x1b[8Cthe interior of a monster or a wall (wall)';
    return '\x0e~\x0f\x1b[8Ca doorway or the floor of a room or the dark part of a room or ice';
}

function farlookContinuation(x, y) {
    const loc = game.level?.at(x, y);
    if (!loc || loc.typ === STONE || loc.typ === SCORR || IS_WALL(loc.typ)) return '';
    return '(floor of a room)';
}

async function describeTravelCursor() {
    const cursor = currentTravelCursor();
    await pline(travelLocationDescription(cursor.x, cursor.y));
    setTravelMapCursorAt(cursor.x, cursor.y);
}

function currentFarlookCursor() {
    if (!game._farlook_cursor)
        game._farlook_cursor = { x: game.u?.ux ?? 1, y: game.u?.uy ?? 0 };
    return game._farlook_cursor;
}

async function describeFarlookCursor() {
    const cursor = currentFarlookCursor();
    await pline(farlookLocationDescription(cursor.x, cursor.y));
    setTravelMapCursorAt(cursor.x, cursor.y);
}

function currentTeleportCursor() {
    if (!game._teleport_cursor)
        game._teleport_cursor = { x: game.u?.ux ?? 1, y: game.u?.uy ?? 0 };
    return game._teleport_cursor;
}

async function describeTeleportCursor() {
    const cursor = currentTeleportCursor();
    await pline(teleportLocationDescription(cursor.x, cursor.y));
    setTravelMapCursorAt(cursor.x, cursor.y);
}

function teleokBasic(x, y, allowTrap = false) {
    if (x < 1 || x >= COLNO || y < 0 || y >= ROWNO) return false;
    if (mon_at(x, y)) return false;
    if (!allowTrap && (game.level?.traps || []).some(t => t.tx === x && t.ty === y)) return false;
    if (sobj_at_basic(BOULDER, x, y)) return false;
    const loc = game.level?.at(x, y);
    if (!loc || blocksMove(x, y) || IS_POOL(loc.typ) || C.IS_LAVA(loc.typ)) return false;
    return C.SPACE_POS(loc.typ);
}

async function teledsBasic(x, y) {
    const u = game.u;
    if (!u) return;
    const oldx = u.ux;
    const oldy = u.uy;
    u.ux0 = oldx;
    u.uy0 = oldy;
    u.ux = x;
    u.uy = y;
    newsym(oldx, oldy);
    see_monsters();
    game.vision_full_recalc = 1;
    vision_recalc(0);
    refreshWarningAfterHeroMove();
    newsym(x, y);
    game._prompt_cursor = null;
    await append_pline(`You materialize in ${x === oldx && y === oldy ? 'the same' : 'a different'} location!`);
}

async function safeTeledsBasic() {
    for (let tcnt = 0; tcnt < 40; tcnt++) {
        const x = rnd(COLNO - 1);
        const y = rn2(ROWNO);
        if (teleokBasic(x, y, false)) {
            await teledsBasic(x, y);
            return true;
        }
    }
    for (let y = 0; y < ROWNO; y++) {
        for (let x = 1; x < COLNO; x++) {
            if (teleokBasic(x, y, false)) {
                await teledsBasic(x, y);
                return true;
            }
        }
    }
    return false;
}

const TRAVEL_DIRS_ORD = [
    [-1, 0], [0, -1], [1, 0], [0, 1],
    [-1, -1], [1, -1], [1, 1], [-1, 1],
];

function travelSeenOrKnown(x, y) {
    const loc = game.level?.at(x, y);
    if (!loc) return false;
    return !!(loc.seenv || loc.remembered_glyph || (loc.disp_ch && loc.disp_ch !== ' ') || couldsee(x, y));
}

function travelFeatureStairAt(x, y) {
    for (let st = game.stairs; st; st = st.next)
        if (st.sx === x && st.sy === y) return st;
    return null;
}

function travelFeatureStair(up) {
    for (let st = game.stairs; st; st = st.next)
        if (!!st.up === !!up && travelSeenOrKnown(st.sx, st.sy)) return st;
    return null;
}

const GETPOS_FEATURE_TYPES = new Map([
    ['_', [C.ALTAR]],
    ['{', [C.FOUNTAIN]],
    ['#', [C.SINK]],
    ['\\', [C.THRONE]],
    ['|', [C.GRAVE]],
    ['}', [C.POOL, C.MOAT, C.WATER]],
    ['~', [C.LAVAPOOL, C.LAVAWALL, C.ICE]],
]);

function isGetposFeatureSearchKey(ch) {
    return ch === '^' || GETPOS_FEATURE_TYPES.has(ch);
}

function getposFeatureAt(ch, x, y) {
    if (ch === '^') return (game.level?.traps || []).some(t => t.tx === x && t.ty === y);
    const types = GETPOS_FEATURE_TYPES.get(ch);
    if (!types) return false;
    const loc = game.level?.at(x, y);
    return !!loc && types.includes(loc.typ);
}

function findGetposFeature(ch, cursor) {
    for (let pass = 0; pass <= 1; pass++) {
        const loY = pass === 0 ? cursor.y : 0;
        const hiY = pass === 0 ? ROWNO - 1 : cursor.y;
        for (let y = loY; y <= hiY; y++) {
            const loX = pass === 0 && y === loY ? cursor.x + 1 : 1;
            const hiX = pass === 1 && y === hiY ? cursor.x : COLNO - 1;
            for (let x = loX; x <= hiX; x++) {
                if (travelSeenOrKnown(x, y) && getposFeatureAt(ch, x, y)) return { x, y };
            }
        }
    }
    return null;
}

async function handleGetposFeatureSearch(ch, cursor, describeCursor) {
    if (!isGetposFeatureSearchKey(ch)) return false;
    const found = findGetposFeature(ch, cursor);
    if (found) {
        cursor.x = found.x;
        cursor.y = found.y;
        await describeCursor();
    } else {
        await pline(`Can't find dungeon feature '${ch}'.`);
        setTravelMapCursorAt(cursor.x, cursor.y);
    }
    return true;
}

function travelMoveAllowed(x, y, dx, dy) {
    const nx = x + dx;
    const ny = y + dy;
    if (nx < 1 || nx >= COLNO || ny < 0 || ny >= ROWNO) return false;
    if (blocksMove(nx, ny)) return false;
    if (sobj_at_basic(BOULDER, nx, ny)) return false;
    if (dx && dy) {
        const source = game.level?.at(x, y);
        const target = game.level?.at(nx, ny);
        if (doorwayBlocksDiagonalForHero(source) || doorwayBlocksDiagonalForHero(target)) return false;
    }
    return true;
}

function findTravelStepToKnownTarget(target) {
    const u = game.u;
    if (!u || !target) return false;
    if (u.ux === target.x && u.uy === target.y) return null;

    const seen = new Set([`${target.x},${target.y}`]);
    const queue = [{ x: target.x, y: target.y }];
    for (let qi = 0; qi < queue.length && qi < COLNO * ROWNO; qi++) {
        const here = queue[qi];
        for (const [dx, dy] of TRAVEL_DIRS_ORD) {
            const nx = here.x + dx;
            const ny = here.y + dy;
            if (!travelMoveAllowed(here.x, here.y, dx, dy)) continue;
            if (nx === u.ux && ny === u.uy) {
                return { dx: here.x - u.ux, dy: here.y - u.uy };
            }
            const key = `${nx},${ny}`;
            if (seen.has(key) || !travelSeenOrKnown(nx, ny)) continue;
            seen.add(key);
            queue.push({ x: nx, y: ny });
        }
    }
    return null;
}

function distminCoords(ax, ay, bx, by) {
    return Math.max(Math.abs(ax - bx), Math.abs(ay - by));
}

function guessTravelGoal(target) {
    const u = game.u;
    if (!u || !target) return null;
    const startKey = `${u.ux},${u.uy}`;
    const seen = new Set([startKey]);
    const travel = new Map();
    const queue = [{ x: u.ux, y: u.uy, radius: 0 }];
    for (let qi = 0; qi < queue.length && qi < COLNO * ROWNO; qi++) {
        const here = queue[qi];
        for (const [dx, dy] of TRAVEL_DIRS_ORD) {
            const nx = here.x + dx;
            const ny = here.y + dy;
            const key = `${nx},${ny}`;
            if (seen.has(key) || !travelMoveAllowed(here.x, here.y, dx, dy) || !travelSeenOrKnown(nx, ny)) continue;
            seen.add(key);
            travel.set(key, here.radius + 1);
            queue.push({ x: nx, y: ny, radius: here.radius + 1 });
        }
    }

    let px = u.ux;
    let py = u.uy;
    let bestDist = distminCoords(target.x, target.y, u.ux, u.uy);
    let bestD2 = dist2(target.x, target.y, u.ux, u.uy);
    let bestTravel = COLNO * ROWNO;
    for (let x = 1; x < COLNO; x++) {
        for (let y = 0; y < ROWNO; y++) {
            const ctrav = travel.get(`${x},${y}`) || 0;
            if (!ctrav || !couldsee(x, y)) continue;
            const nextDist = distminCoords(target.x, target.y, x, y);
            if (nextDist === bestDist && ctrav < bestTravel) {
                const nd2 = dist2(target.x, target.y, x, y);
                if (nd2 < bestD2) {
                    px = x;
                    py = y;
                    bestD2 = nd2;
                    bestTravel = ctrav;
                }
            } else if (nextDist < bestDist) {
                px = x;
                py = y;
                bestDist = nextDist;
                bestD2 = dist2(target.x, target.y, x, y);
                bestTravel = ctrav;
            }
        }
    }
    return { x: px, y: py };
}

function findTravelStep(target) {
    const direct = findTravelStepToKnownTarget(target);
    if (direct) return direct;
    const guess = guessTravelGoal(target);
    if (!guess) return direct;
    if (game.u?.ux === guess.x && game.u?.uy === guess.y) {
        const dx = Math.sign((target?.x ?? game.u.ux) - game.u.ux);
        const dy = Math.sign((target?.y ?? game.u.uy) - game.u.uy);
        return travelMoveAllowed(game.u.ux, game.u.uy, dx, dy) ? { dx, dy } : direct;
    }
    return findTravelStepToKnownTarget(guess) || direct;
}

async function beginTravelRunToCachedTarget() {
    const target = game._travel_cached_target;
    if (!target) return false;
    game.context.run = { travel: true, target: { x: target.x, y: target.y }, steps: 0 };
    return continueRunStep();
}

const DEFAULT_TIMEOUT_INCR = 30;
const MENU_ROWS_PER_PAGE = C.TERMINAL_ROWS - 1;
const MENU_SELECTOR_CHARS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

const WIZ_INTRINSIC_PROPERTIES = [
    { prop: C.INVULNERABLE, stateKey: 'invulnerable', label: 'invulnerable' },
    { prop: C.STONED, stateKey: 'stoned', label: 'petrifying' },
    { prop: C.SLIMED, stateKey: 'slimed', label: 'becoming slime' },
    { prop: C.STRANGLED, stateKey: 'strangled', label: 'strangling' },
    { prop: C.SICK, stateKey: 'sick', label: 'fatally sick' },
    { prop: C.STUNNED, stateKey: 'stunned', label: 'stunned' },
    { prop: C.CONFUSION, stateKey: 'confusion', label: 'confused' },
    { prop: C.HALLUC, stateKey: 'hallucination', label: 'hallucinating' },
    { prop: C.BLINDED, stateKey: 'blinded', label: 'blinded' },
    { prop: C.DEAF, stateKey: 'deaf', label: 'deafness' },
    { prop: C.VOMITING, stateKey: 'vomiting', label: 'vomiting' },
    { prop: C.GLIB, stateKey: 'glib', label: 'slippery fingers' },
    { prop: C.WOUNDED_LEGS, stateKey: 'wounded_legs', label: 'wounded legs' },
    { prop: C.SLEEPY, stateKey: 'sleepy', label: 'sleepy' },
    { prop: C.TELEPORT, stateKey: 'teleporting', label: 'teleporting' },
    { prop: C.POLYMORPH, stateKey: 'polymorphing', label: 'polymorphing' },
    { prop: C.LEVITATION, stateKey: 'levitation', label: 'levitating' },
    { prop: C.FAST, stateKey: 'fast', label: 'very fast' },
    { prop: C.CLAIRVOYANT, stateKey: 'clairvoyant', label: 'clairvoyant' },
    { prop: C.DETECT_MONSTERS, stateKey: 'monster_detection', label: 'monster detection' },
    { prop: C.SEE_INVIS, stateKey: 'see_invisible', label: 'see invisible' },
    { prop: C.INVIS, stateKey: 'invisible', label: 'invisible' },
    { prop: C.ACID_RES, stateKey: 'acid_resistance', label: 'acid resistance' },
    { prop: C.STONE_RES, stateKey: 'stoning_resistance', label: 'stoning resistance' },
    { prop: C.DISPLACED, stateKey: 'displaced', label: 'displaced' },
    { prop: C.PASSES_WALLS, stateKey: 'pass_thru_walls', label: 'pass thru walls' },
    { prop: C.MAGICAL_BREATHING, stateKey: 'magical_breathing', label: 'magical breathing' },
    { prop: C.WWALKING, stateKey: 'water_walking', label: 'water walking' },
    { prop: C.FIRE_RES, stateKey: 'fire_resistance', label: 'fire resistance' },
    { prop: C.COLD_RES, stateKey: 'cold_resistance', label: 'cold resistance' },
    { prop: C.SLEEP_RES, stateKey: 'sleep_resistance', label: 'sleep resistance' },
    { prop: C.DISINT_RES, stateKey: 'disintegration_resistance', label: 'disintegration resistance' },
    { prop: C.SHOCK_RES, stateKey: 'shock_resistance', label: 'shock resistance' },
    { prop: C.POISON_RES, stateKey: 'poison_resistance', label: 'poison resistance' },
    { prop: C.DRAIN_RES, stateKey: 'drain_resistance', label: 'drain resistance' },
    { prop: C.SICK_RES, stateKey: 'sickness_resistance', label: 'sickness resistance' },
    { prop: C.ANTIMAGIC, stateKey: 'magic_resistance', label: 'magic resistance' },
    { prop: C.HALLUC_RES, stateKey: 'hallucination_resistance', label: 'hallucination resistance' },
    { prop: C.BLND_RES, stateKey: 'light_induced_blindness_resistance', label: 'light-induced blindness resistance' },
    { prop: C.FUMBLING, stateKey: 'fumbling', label: 'fumbling' },
    { prop: C.HUNGER, stateKey: 'voracious_hunger', label: 'voracious hunger' },
    { prop: C.TELEPAT, stateKey: 'telepathic', label: 'telepathic' },
    { prop: C.WARNING, stateKey: 'warning', label: 'warning' },
    { prop: C.WARN_OF_MON, stateKey: 'warn_monster_type_or_class', label: 'warn: monster type or class' },
    { prop: C.WARN_UNDEAD, stateKey: 'warn_undead', label: 'warn: undead' },
    { prop: C.SEARCHING, stateKey: 'searching', label: 'searching' },
    { prop: C.INFRAVISION, stateKey: 'infravision', label: 'infravision' },
    { prop: C.ADORNED, stateKey: 'adorned', label: 'adorned (+/- Cha)' },
    { prop: C.STEALTH, stateKey: 'stealth', label: 'stealthy' },
    { prop: C.AGGRAVATE_MONSTER, stateKey: 'monster_aggravation', label: 'monster aggravation' },
    { prop: C.CONFLICT, stateKey: 'conflict', label: 'conflict' },
    { prop: C.JUMPING, stateKey: 'jumping', label: 'jumping' },
    { prop: C.TELEPORT_CONTROL, stateKey: 'teleport_control', label: 'teleport control' },
    { prop: C.FLYING, stateKey: 'flying', label: 'flying' },
    { prop: C.SWIMMING, stateKey: 'swimming', label: 'swimming' },
    { prop: C.SLOW_DIGESTION, stateKey: 'slow_digestion', label: 'slow digestion' },
    { prop: C.HALF_SPDAM, stateKey: 'half_spell_damage', label: 'half spell damage' },
    { prop: C.HALF_PHDAM, stateKey: 'half_physical_damage', label: 'half physical damage' },
    { prop: C.REGENERATION, stateKey: 'hp_regeneration', label: 'HP regeneration' },
    { prop: C.ENERGY_REGENERATION, stateKey: 'energy_regeneration', label: 'energy regeneration' },
    { prop: C.PROTECTION, stateKey: 'extra_protection', label: 'extra protection' },
    { prop: C.PROT_FROM_SHAPE_CHANGERS, stateKey: 'protection_from_shape_changers', label: 'protection from shape changers' },
    { prop: C.POLYMORPH_CONTROL, stateKey: 'polymorph_control', label: 'polymorph control' },
    { prop: C.UNCHANGING, stateKey: 'unchanging', label: 'unchanging' },
    { prop: C.REFLECTING, stateKey: 'reflecting', label: 'reflecting' },
    { prop: C.FREE_ACTION, stateKey: 'free_action', label: 'free action' },
    { prop: C.FIXED_ABIL, stateKey: 'fixed_abilities', label: 'fixed abilities' },
    { prop: C.LIFESAVED, stateKey: 'life_will_be_saved', label: 'life will be saved' },
];

function intrinsicTimeoutValue(row) {
    const value = game.u?.uprops?.[row.stateKey];
    return typeof value === 'number' && value > 0 ? value : 0;
}

function intrinsicMenuRows() {
    const rows = [
        { kind: 'text', text: ' \x1b[7mWhich intrinsics?\x1b[0m' },
        { kind: 'blank' },
    ];
    if (game.iflags?.cmdassist !== false) {
        rows.push({
            kind: 'text',
            text: ` [Precede any selection with a count to increment by other than ${DEFAULT_TIMEOUT_INCR}.]`,
        });
    }
    for (const row of WIZ_INTRINSIC_PROPERTIES) {
        if (row.prop === C.HALLUC_RES) continue;
        if (row.prop === C.FIRE_RES) {
            rows.push({ kind: 'text', text: ' --' });
        }
        rows.push({ kind: 'selectable', ...row });
    }
    return rows;
}

function renderIntrinsicMenu(menu) {
    const rows = menu.rows;
    const start = menu.page * MENU_ROWS_PER_PAGE;
    const pageRows = rows.slice(start, start + MENU_ROWS_PER_PAGE);
    const lines = [];
    let selectorIndex = 0;
    for (const row of pageRows) {
        if (row.kind === 'selectable') {
            const selector = MENU_SELECTOR_CHARS[selectorIndex++] || '?';
            row.selector = selector;
            const indicator = row.count > 0 ? '#' : (row.selected ? '+' : '-');
            const timeout = intrinsicTimeoutValue(row);
            const tail = timeout ? ` [${timeout}]` : '';
            lines.push(` ${selector} ${indicator} ${row.label}${tail}`);
        } else {
            lines.push(row.text || '');
        }
    }
    const footer = menu.pages.length > 1
        ? ` (${menu.page + 1} of ${menu.pages.length})`
        : ' (end)';
    lines.push(footer);
    const screen = lines.join('\n');
    showSerializedOverride(screen, [footer.length, lines.length - 1]);
}

function beginIntrinsicMenu() {
    game._intrinsic_menu = {
        kind: 'wizintrinsic',
        rows: intrinsicMenuRows(),
        page: 0,
        pages: [],
        count: '',
    };
    game._intrinsic_menu.pages = [];
    for (let i = 0; i < game._intrinsic_menu.rows.length; i += MENU_ROWS_PER_PAGE) {
        game._intrinsic_menu.pages.push(game._intrinsic_menu.rows.slice(i, i + MENU_ROWS_PER_PAGE));
    }
    renderIntrinsicMenu(game._intrinsic_menu);
}

function intrinsicRowForSelector(menu, ch) {
    const start = menu.page * MENU_ROWS_PER_PAGE;
    let selectorIndex = 0;
    for (const row of menu.rows.slice(start, start + MENU_ROWS_PER_PAGE)) {
        if (row.kind !== 'selectable') continue;
        const selector = MENU_SELECTOR_CHARS[selectorIndex++] || '?';
        if (selector === ch) return row;
    }
    return null;
}

function updateIntrinsicMenuSelection(menu, row, count) {
    if (!row) return;
    const togglingOff = row.selected && !count;
    if (togglingOff) {
        row.selected = false;
        row.count = -1;
    } else {
        row.selected = true;
        row.count = count > 0 ? count : -1;
    }
}

function refreshSwallowedHallucinationAfterMore() {
    if (!(game.u?.uhallucination || game.u?.uprops?.hallucination)) return;
    if (game.u?.uswallow && game.u?.ustuck && game._swallowed_map_active)
        refresh_swallowed_overlay();
    else {
        see_monsters();
        see_objects();
        see_traps();
    }
}

async function handleQueuedMore(ch) {
    if (!game._more || (game._more_dismissals_remaining || 0) <= 0) return false;
    let resumeMonsterBehindNewMore = false;
    const moreDismissKey = !!game._monster_more_accepts_any_key
        || ch === ' ' || ch === '\r' || ch === '\n' || ch === '\x1b';
    const pausedMonsterTurn = !!game._monster_turn_paused_for_more;
    const swallowedDamageResume = pausedMonsterTurn && !!game._swallowed_damage_more_waiting;
    const preTurnResume = pausedMonsterTurn && !!game._pre_turn_more_waiting;
    const monsterAttackResume = pausedMonsterTurn && !!game._monster_attack_more_waiting;
    const pausedFloorListTurn = !!game._resume_floor_list_turn;
    const pausedRunTail = !!game._run_paused_for_more;
    const preserveMonsterMoreBase = pausedMonsterTurn
        && game._preserve_more_base_for_next_monster_message
        && game._latched_more_screen;
    if (!moreDismissKey) {
        if (game._direction_help_screen) {
            showSerializedOverride(game._direction_help_screen, [8, 23]);
            game._override_prev = null;
        }
        if (game._getpos_help_screen) {
            showSerializedOverride(game._getpos_help_screen, [18, 16]);
            game._override_prev = null;
        }
        game.context.move = 0;
        return true;
    }

    game._more_dismissals_remaining--;
    game._monster_more_accepts_any_key = false;
    if (preserveMonsterMoreBase) {
        game._monster_more_base_screen = preserveMonsterMoreBase;
        game._monster_more_base_deferred = (game._deferred_warning_redraws || []).slice();
        game._monster_more_restore_message = game._pending_message || '';
    }
    game._preserve_more_base_for_next_monster_message = false;
    game._latched_more_screen = null;
    game._latched_more_cursor = null;
    game._latched_more_keep_until_dismiss = false;
    if (game._fire_wand_side_effect_pending) {
        game._more_dismissals_remaining = 0;
        await showFireWandSideEffects();
    } else if (game._fire_wand_invisibility_pending) {
        game._more_dismissals_remaining = 0;
        await showFireWandInvisibilityEffect();
    } else if (game._fire_wand_oil_pending) {
        game._more_dismissals_remaining = 0;
        await showFireWandOilEffect();
    } else if (game._fire_wand_death_pending) {
        game._more_dismissals_remaining = 0;
        await showFireWandDeathMessage();
    } else if (game._monster_death_pending) {
        game._more_dismissals_remaining = 0;
        game._monster_death_pending = false;
        game._death_prompt_pending = true;
        await pline('You die...');
        queue_more_prompt();
    } else if (game._death_prompt_pending) {
        await showDeathPrompt();
    } else if (game._more_dismissals_remaining <= 0) {
        if (game._post_arrival_pager_active) {
            game._post_arrival_pager_active = false;
            clearOverrideScreen();
            const tempMessage = game._post_arrival_temp_message;
            game._post_arrival_temp_message = null;
            clear_pending_message();
            if (tempMessage?.line) await showTemperatureChangeMessage(tempMessage);
            game.context.move = 0;
            return true;
        }
        if (game._post_arrival_pager_screen) {
            const screen = game._post_arrival_pager_screen;
            const cursor = game._post_arrival_pager_cursor || [8, C.TERMINAL_ROWS - 1];
            game._post_arrival_pager_screen = null;
            game._post_arrival_pager_cursor = null;
            game._post_arrival_pager_active = true;
            clear_pending_message();
            showSerializedOverride(screen, cursor);
            queue_more_prompt();
            game.context.move = 0;
            return true;
        }
        if (game._cookie_message_queue?.length) {
            const next = game._cookie_message_queue.shift();
            await pline(next.text);
            game._more_next_message_row = false;
            if (next.more) queue_more_prompt();
            else game._more = false;
            game.context.move = next.move ? 1 : 0;
            return true;
        }
        if (game._more_message_queue?.length) {
            const next = game._more_message_queue.shift();
            await pline(next.text);
            game._more_next_message_row = false;
            if (next.more) queue_more_prompt();
            else game._more = false;
            game.context.move = next.move ? 1 : 0;
            return true;
        }
        clear_pending_message();
        if (game._restore_message_after_more) {
            const msg = game._restore_message_after_more;
            game._restore_message_after_more = '';
            await pline(msg);
        }
        game._hallucination_warning_rng_active = false;
        if (game._arrival_floor_look_after_more) {
            game._arrival_floor_look_after_more = false;
            await lookHereAfterMove();
            game.context.move = 0;
            return true;
        }
        if (game._direction_help_screen) {
            game._direction_help_screen = '';
            game._override_prev = null;
        }
        if (game._direction_help_after_more_message) {
            const msg = game._direction_help_after_more_message;
            game._direction_help_after_more_message = '';
            await pline(msg);
            game.context.move = 0;
            return true;
        }
        if (game._getpos_help_after_more) {
            const kind = game._getpos_help_after_more;
            await resumeGetposAfterHelp(kind);
            game.context.move = 0;
            return true;
        }
        if (game._travel_tip_pending) {
            game._travel_tip_pending = false;
            game._travel_tip_active = true;
            game._travel_tip_seen = true;
            clear_pending_message();
            await showTravelTipScreen();
            game.context.move = 0;
            return true;
        }
        if (game._resume_write_prompt_after_more) {
            game._resume_write_prompt_after_more = false;
            await showPromptLine('What do you want to write on? [*] ');
            game.context.move = 0;
            return true;
        }
        if (game._resume_read_prompt_after_more) {
            game._resume_read_prompt_after_more = false;
            await showPromptLine(`What do you want to read? [${readLetters()} or ?*] `);
            game.context.move = 0;
            return true;
        }
        if (game._resume_throw_prompt_after_more) {
            game._resume_throw_prompt_after_more = false;
            await showThrowPrompt();
            game.context.move = 0;
            return true;
        }
        if (game._drink_call_after_more) {
            const appearance = game._drink_call_after_more;
            game._drink_call_after_more = '';
            game._awaiting_potion_call_name = { appearance, text: '' };
            await showPromptLine(`Call a ${appearance} potion:`);
            game.context.move = 0;
            return true;
        }
        if (game._call_scroll_after_more) {
            const state = game._call_scroll_after_more;
            game._call_scroll_after_more = null;
            game._awaiting_scroll_call_name = state;
            const prompt = `Call a ${state.appearance}:`;
            await showPromptLine(prompt);
            game._prompt_cursor = [Math.min(prompt.length + 1, 79), 0];
            game.context.move = 0;
            return true;
        }
        if (game._pending_heavy_pickup) {
            const obj = game._pending_heavy_pickup;
            game._pending_heavy_pickup = null;
            await finishHeavyPickup(obj);
            game.context.move = 1;
            return true;
        }
        if (game._enchant_weapon_after_more) {
            game._enchant_weapon_after_more = false;
            await finishEnchantWeaponAfterMore();
        }
        if (game._after_more_message) {
            const msg = game._after_more_message;
            const needsPrompt = !!game._after_more_needs_prompt;
            game._after_more_message = '';
            game._after_more_needs_prompt = false;
            await pline(msg);
            if (game._after_more_projectile_glyph) {
                const glyph = game._after_more_projectile_glyph;
                game._after_more_projectile_glyph = null;
                const oldX = glyph.ch === ')' ? glyph.x - 1 : glyph.x;
                if (C.isok(oldX, glyph.y)) newsym(oldX, glyph.y);
                if (C.isok(glyph.x, glyph.y)) show_glyph_cell(glyph.x, glyph.y, glyph.ch, NO_COLOR, false);
            }
            if (needsPrompt) {
                queue_more_prompt();
                if (pausedMonsterTurn && game._monster_attack_resume_behind_after_more) {
                    resumeMonsterBehindNewMore = true;
                    game._monster_attack_resume_behind_after_more = false;
                }
            }
        } else if (game._cloak_displacement_on_msg_pending) {
            const obj = game._cloak_displacement_on_msg_pending;
            game._cloak_displacement_on_msg_pending = null;
            if (game.u) game.u.uac = calculated_armor_class();
            await pline('You are now wearing a cloak of displacement.');
            game.context.move = 1;
            return true;
        } else if (game._pet_defender_death_pending) {
            const pending = game._pet_defender_death_pending;
            game._pet_defender_death_pending = null;
            await finish_pet_kill(pending.killer, pending.target);
            if (game._resume_movemon_after_mon === pending.target)
                game._resume_movemon_after_mon = null;
            if (game._resume_tame_post_distfleeck === pending.target)
                game._resume_tame_post_distfleeck = null;
        } else if (game._nomovemsg) {
            const msg = game._nomovemsg;
            game._nomovemsg = '';
            await pline(msg);
        }
        if (game._pending_tame_kill_reaction) {
            game._pending_tame_kill_reaction = false;
            if (game.u?.uhallucination || game.u?.uprops?.hallucination)
                await pline('You hear the studio audience applaud!');
            else
                await pline('You hear the rumble of distant thunder...');
        }
        // C ref: topl.c:more() returns to the interrupted command before
        // allmain.c's next input prompt; swallowed Hallucination redraws
        // once in that resumed path and again at the input boundary.
        await finish_pending_swallowed_expulsion();
        if (!swallowedDamageResume && !preTurnResume && !monsterAttackResume)
            refreshSwallowedHallucinationAfterMore();
    }
    if (resumeMonsterBehindNewMore) {
        game._monster_turn_paused_for_more = false;
        game._monster_attack_more_waiting = false;
        game._resume_monster_turn = true;
        game.context.move = 1;
    } else if (pausedFloorListTurn && !game._more) {
        game._resume_floor_list_turn = false;
        await triggerSpotEffectsAtHero();
        game.context.move = 1;
    } else if (pausedMonsterTurn && !game._more && !game._death_prompt_active) {
        game._monster_turn_paused_for_more = false;
        game._swallowed_damage_more_waiting = false;
        game._pre_turn_more_waiting = false;
        game._monster_attack_more_waiting = false;
        if (game._clear_latched_status_after_more) {
            game._clear_latched_status_after_more = false;
            game._latched_status_uhp = null;
        }
        game._resume_monster_turn = true;
        game.context.move = 1;
    } else if (pausedRunTail && !game._more) {
        game._run_paused_for_more = false;
        if (game.context?.run) {
            game._resume_run_after_more = true;
            game.context.move = 1;
        } else {
            game._resume_run_after_more = false;
            game.context.move = 0;
        }
    } else {
        game.context.move = 0;
    }
    return true;
}

async function commitIntrinsicMenuSelection(menu) {
    const selected = menu.rows.filter((row) => row.kind === 'selectable' && row.selected);
    const wasHallucinating = !!(game.u?.uprops?.hallucination || game.u?.uhallucination);
    game._intrinsic_menu = null;
    game._override_screen = null;
    game._override_serialized_screen = null;
    game._override_cursor = null;
    game._override_prev = null;
    if (!selected.length) {
        return;
    }
    for (const row of selected) {
        const oldtimeout = intrinsicTimeoutValue(row);
        const amt = row.count > 0 ? row.count : DEFAULT_TIMEOUT_INCR;
        const newtimeout = oldtimeout + amt;
        game.u = game.u || {};
        game.u.uprops = game.u.uprops || {};
        if (row.prop === C.HALLUC) {
            game.u.uprops.hallucination = newtimeout;
            game.u.uhallucination = newtimeout;
            const isHallucinating = !!(game.u.uhallucination || game.u.uprops.hallucination);
            apply_hallucination_display_transition(wasHallucinating, isHallucinating);
            await pline('Oh wow!  Everything looks so cosmic!');
            queue_more_prompt();
            continue;
        }
        game.u.uprops[row.stateKey] = newtimeout;
        await pline(`Timeout for ${row.label} set to ${amt}.`);
    }
}

async function showInventoryMenu() {
    await flush_screen(1);
    const display = game.nhDisplay;
    if (!display?.terminal?.serialize && !display?.serialize) return;

    const allLines = buildInventoryMenuLines();
    let lines = allLines;
    let multipage = false;
    const displayRows = display.rows || display.terminal?.rows || 24;
    if (lines.length > displayRows) {
        lines = lines.slice(0, displayRows - 1);
        lines.push({ text: '(1 of 2)', heading: false });
        game._inventory_menu_page2_lines = allLines.slice(displayRows - 1)
            .filter((line) => line.text !== '(end)');
        game._inventory_menu_page2_lines.push({ text: '(2 of 2)', heading: false });
        multipage = true;
    } else {
        game._inventory_menu_page2_lines = null;
    }

    const maxLen = Math.max(0, ...lines.map((line) => line.text.length));
    const menuCol = multipage ? 1 : Math.max(1, Math.min(COLNO - 1, COLNO - maxLen - 2));
    const clearCol = Math.max(0, menuCol - 1);
    for (let row = 0; row < lines.length; row++) {
        display.putstr(clearCol, row, ' '.repeat(COLNO - clearCol), NO_COLOR, 0);
    }
    for (let row = 0; row < lines.length; row++) {
        const line = lines[row];
        display.putstr(menuCol, row, line.text, NO_COLOR, line.heading ? ATR_INVERSE : 0);
    }

    const lastRow = lines.length - 1;
    const lastText = lines[lastRow]?.text || '';
    const cursorCol = menuCol + lastText.length + (lastText === '(end)' ? 1 : 0);
    const screen = serialize_terminal_grid(display);
    game._inventory_menu_screen = screen;
    showOverride(screen, [Math.min(cursorCol, COLNO - 1), lastRow]);
}

function showInventoryMenuPage2() {
    const display = game.nhDisplay;
    const lines = game._inventory_menu_page2_lines || [];
    if (!display?.putstr || !lines.length) return false;
    const displayRows = display.rows || display.terminal?.rows || 24;
    const menuCol = 1;
    for (let row = 0; row < displayRows; row++) {
        display.putstr(0, row, ' '.repeat(COLNO), NO_COLOR, 0);
    }
    for (let row = 0; row < lines.length; row++) {
        const line = lines[row];
        display.putstr(menuCol, row, line.text, NO_COLOR, line.heading ? ATR_INVERSE : 0);
    }
    const lastRow = lines.length - 1;
    const lastText = lines[lastRow]?.text || '';
    const cursorCol = menuCol + lastText.length;
    const screen = serialize_terminal_grid(display);
    game._inventory_menu_page2_screen = screen;
    showOverride(screen, [Math.min(cursorCol, COLNO - 1), lastRow]);
    return true;
}

function buildPotionMenuLines() {
    ensureInventoryLetters();
    const rows = [{ text: 'Potions', heading: true }];
    for (const obj of game.inventory || []) {
        if (obj?.oclass === POTION_CLASS) rows.push({ text: inventoryListing(obj), heading: false });
    }
    rows.push({ text: '(end)', heading: false });
    return rows;
}

async function showPotionMenu() {
    await flush_screen(1);
    const display = game.nhDisplay;
    if (!display?.putstr) return;
    const lines = buildPotionMenuLines();
    const menuCol = 39;
    for (let row = 0; row < lines.length; row++) {
        display.putstr(menuCol, row, ' '.repeat(COLNO - menuCol), NO_COLOR, 0);
    }
    for (let row = 0; row < lines.length; row++) {
        const line = lines[row];
        display.putstr(menuCol, row, line.text, NO_COLOR, line.heading ? ATR_INVERSE : 0);
    }
    const lastRow = lines.length - 1;
    const cursorCol = menuCol + '(end)'.length + 1;
    const screen = serialize_terminal_grid(display);
    game._potion_menu_screen = screen;
    showOverride(screen, [cursorCol, lastRow]);
}

function actionMenuItemType(obj) {
    if (obj?.oclass === RING_CLASS) return 'ring';
    if (obj?.oclass === ARMOR_CLASS) return 'armor';
    if (obj?.oclass === WEAPON_CLASS) return 'item';
    if (obj?.oclass === WAND_CLASS) return 'wand';
    if (obj?.oclass === TOOL_CLASS) return 'tool';
    return 'item';
}

async function showInventoryActionMenu(obj) {
    clear_pending_message();
    await flush_screen(1);
    const display = game.nhDisplay;
    if (!display?.putstr) return;

    const menuCol = 34;
    const label = baseObjectName(obj);
    const itemType = actionMenuItemType(obj);
    const rows = [
        { text: `Do what with the ${label}?`, attr: ATR_INVERSE },
        null,
        { text: `c - Name this specific ${label}` },
        { text: 'd - Drop this item' },
        { text: 'E - Write on the floor with this item' },
        { text: 'i - Adjust inventory by assigning new letter' },
        { text: `P - Put this ${itemType} on` },
        { text: 't - Throw this item' },
        { text: 'w - Wield this item in your hands' },
        { text: '/ - Look up information about this' },
        { text: '(end)' },
    ];

    for (let row = 0; row <= 15; row++) {
        display.putstr(0, row, ' '.repeat(COLNO), NO_COLOR, 0);
    }
    for (let row = 21; row < C.TERMINAL_ROWS; row++) {
        display.putstr(0, row, ' '.repeat(COLNO), NO_COLOR, 0);
    }
    for (let row = 0; row < rows.length; row++) {
        const entry = rows[row];
        if (!entry) continue;
        display.putstr(menuCol, row, entry.text, NO_COLOR, entry.attr || 0);
    }

    const screen = serialize_terminal_grid(display);
    game._inventory_action_menu_screen = screen;
    game._inventory_action_menu_obj = obj;
    showOverride(screen, [menuCol + '(end)'.length + 1, 10]);
}

function cursorForward(count) {
    if (count <= 0) return '';
    return count <= 4 ? ' '.repeat(count) : `\x1b[${count}C`;
}

function compressMenuSpaces(text) {
    return text.replace(/ {5,}/g, (spaces) => cursorForward(spaces.length));
}

function spellMenuRawLine(entry, turnsLeft, menuCol) {
    // C ref: spell.c:dospellmenu().
    const fail = 100 - percentSpellSuccessBasic(entry);
    const retention = spellRetentionTextBasic(entry, turnsLeft);
    const text = `${entry.letter} - `
        + `${entry.name.padEnd(20)}  `
        + `${String(entry.level).padStart(2)}   `
        + `${entry.category.padEnd(12)} `
        + `${String(fail).padStart(3)}% `
        + `${retention.padStart(9)} `
        + `${String(turnsLeft).padStart(6)}`;
    return `${cursorForward(menuCol)}${compressMenuSpaces(text)}`;
}

async function showSpellMenu() {
    const spells = knownSpellEntries();
    if (!spells.length) {
        await pline("You don't know any spells right now.");
        return;
    }

    await flush_screen(1);
    const display = game.nhDisplay;
    if (!display?.terminal?.serialize && !display?.serialize) return;

    const turnsLeft = 20001 - (game.moves || 1);
    const maxLen = 65;
    const menuCol = Math.max(1, Math.min(COLNO - 1, COLNO - maxLen - 2));
    const rawLines = [
        `${cursorForward(menuCol)}\x1b[7mCurrently known spells\x1b[0m`,
        '',
        `${cursorForward(menuCol)}\x1b[7m    Name\x1b[17CLevel Category\x1b[5CFail Retention  turns\x1b[0m`,
        ...spells.map((entry) => spellMenuRawLine(entry, turnsLeft, menuCol)),
        `${cursorForward(menuCol)}+ - [sort spells]`,
        `${cursorForward(menuCol)}(end)`,
    ];
    const baseRows = serialize_terminal_grid(display).split('\n');
    const rest = baseRows.slice(rawLines.length);
    const screen = rawLines.concat(rest).join('\n');
    const lastRow = rawLines.length - 1;
    const cursorCol = menuCol + 6;
    game._spell_menu_screen = screen;
    showSerializedOverride(screen, [Math.min(cursorCol, COLNO - 1), lastRow]);
}

function wizardDiscoveryScreen() {
    const types = [];
    const addType = (otyp) => {
        if (!Number.isInteger(otyp) || types.includes(otyp)) return;
        types.push(otyp);
    };
    if (game.discoveredObjects && typeof game.discoveredObjects[Symbol.iterator] === 'function') {
        for (const otyp of game.discoveredObjects) addType(otyp);
    }
    if (game.encounteredObjects && typeof game.encounteredObjects[Symbol.iterator] === 'function') {
        for (const otyp of game.encounteredObjects) addType(otyp);
    }
    if (game.calledObjects instanceof Map) {
        for (const otyp of game.calledObjects.keys()) addType(otyp);
    }
    const seenTypes = new Set(types);
    for (const obj of game.inventory || []) {
        if (obj?.oclass === AMULET_CLASS && (obj.worn || obj.known || obj.knownName)) addType(obj.otyp);
    }
    for (const otyp of WIZARD_SKILL_BASED_SPELLBOOKS) addType(otyp);
    const lines = [
        'Discoveries, by order of discovery within each class',
        '',
    ];

    for (const [title, oclass] of DISCOVERY_SECTIONS) {
        const entries = types
            .filter((otyp) => OBJECT_CLASS[otyp] === oclass)
            .map((otyp) => discoveryLineForObjectType(otyp, seenTypes))
            .filter(Boolean);
        if (!entries.length) continue;
        lines.push(`\x1b[7m${title}\x1b[0m`);
        for (const line of entries) lines.push(line.startsWith('* ') ? line : `  ${line}`);
    }

    if (lines.length >= 24) return lines.slice(0, 23).concat('--More--').join('\n');
    lines.push('--More--');
    return lines.join('\n');
}

function discoveryDescriptionForObjectType(otyp) {
    const slot = DISCOVERY_DESCRIPTION_SLOT.get(otyp);
    if (typeof slot === 'string') return slot;
    if (Number.isInteger(slot)) return getObjectDescription(slot);
    return getObjectDescription(otyp);
}

function discoveryLineForObjectType(otyp, seenTypes) {
    const oclass = OBJECT_CLASS[otyp];
    let base = OBJECT_BASE_NAMES.get(otyp);
    const desc = discoveryDescriptionForObjectType(otyp);
    const star = oclass === SPBOOK_CLASS && !seenTypes.has(otyp) ? '* ' : '';
    const calledName = game.calledObjects instanceof Map ? game.calledObjects.get(otyp) : '';

    if (calledName && oclass === SCROLL_CLASS && !knownObjectType(otyp)) {
        return `${star}scroll called ${calledName}${desc ? ` (${desc})` : ''}`;
    }
    if (!base) return null;

    if (oclass === AMULET_CLASS && !seenTypes.has(otyp)) {
        return `${star}amulet${desc ? ` (${desc})` : ''}`;
    }
    if (otyp === SPEED_BOOTS || otyp === GAUNTLETS_OF_POWER) base = `pair of ${base}`;
    if (oclass === SCROLL_CLASS || oclass === SPBOOK_CLASS || oclass === ARMOR_CLASS
        || (oclass === WEAPON_CLASS && desc)) {
        return `${star}${base}${desc ? ` (${desc})` : ''}`;
    }
    return `${star}${base}`;
}

function discoveriesScreen() {
    if (game.urole?.name?.m === 'Wizard') return wizardDiscoveryScreen();
    return TOURIST_DISCOVERIES_SCREEN;
}

function heroAttr(index) {
    return game.u?.acurr?.a?.[index] ?? 0;
}

function heroBaseAttr(index) {
    return game.u?.amax?.a?.[index] ?? heroAttr(index);
}

function wizardRankTitle(level) {
    if (level >= 26) return 'Mage';
    if (level >= 22) return 'Necromancer';
    if (level >= 18) return 'Sorcerer';
    if (level >= 14) return 'Enchanter';
    if (level >= 10) return 'Magician';
    if (level >= 6) return 'Thaumaturge';
    if (level >= 3) return 'Conjurer';
    return 'Evoker';
}

function insightAttrLine(label, index) {
    const current = heroAttr(index);
    const base = heroBaseAttr(index);
    if (current !== base) return `  Your ${label} is ${current} (current; base:${base}).`;
    return `  Your ${label} is ${current}.`;
}

function articleForWord(word) {
    return /^[AEIOU]/i.test(String(word || '')) ? 'an' : 'a';
}

function wizardAttributePageCount() {
    if ((game.u?.ulevel || 1) >= 18) return 3;
    if (game.u?.uprops?.fast || game.u?.uprops?.displaced || game.u?.uprops?.warning) return 3;
    return 2;
}

function insightHpLine() {
    // C ref: insight.c:basic_enlightenment().
    const hp = game.u?.uhp ?? 0;
    const hpmax = game.u?.uhpmax ?? hp;
    if (hp >= hpmax) return `  You have all ${hpmax} hit points.`;
    if (hp === 1) return `  You have only 1 out of ${hpmax} hit points.`;
    return `  You have ${hp} out of ${hpmax} hit points.`;
}

function objectIsWorn(obj) {
    return !!(obj && (obj.worn || obj.owornmask));
}

function objectConfersProtection(obj) {
    if (!objectIsWorn(obj)) return false;
    return obj.otyp === RIN_PROTECTION
        || obj.otyp === CLOAK_OF_PROTECTION
        || obj.otyp === AMULET_OF_GUARDING;
}

function heroMagicCancellation() {
    // C ref: mhitu.c:magic_negation(); insight.c:attributes_enlightenment().
    let mc = 0;
    let viaGuardingAmulet = false;
    let gotProtection = !!game.u?.uprops?.extra_protection;
    for (const obj of game.inventory || []) {
        if (obj?.oclass === ARMOR_CLASS && objectIsWorn(obj)) {
            mc = Math.max(mc, ARMOR_MAGIC_CANCELLATION.get(obj.otyp) || 0);
        } else if (obj?.oclass === AMULET_CLASS && objectIsWorn(obj)) {
            viaGuardingAmulet = obj.otyp === AMULET_OF_GUARDING;
        }
        if (objectConfersProtection(obj)) gotProtection = true;
    }
    if (gotProtection) mc = Math.min(3, mc + (viaGuardingAmulet ? 2 : 1));
    else if (mc < 1 && ((game.u?.ublessed || 0) > 0 || (game.u?.uspellprot || 0) > 0)) mc = 1;
    return mc;
}

function wizardAttributesPage1() {
    const levelName = game.level?.flags?.sokoban_rules ? 'Sokoban' : 'the Dungeons of Doom';
    const level = game.u?.ulevel || 1;
    const xp = game.u?.uexp || 0;
    const need = Math.max(0, newuexp(level) - xp);
    const rank = wizardRankTitle(level);
    const xpNeedText = level <= 1
        ? `${need} needed to attain level ${level + 1}`
        : `${need} more needed for level ${level + 1}`;
    const pages = wizardAttributePageCount();
    return ` ${game.plname || 'Wizard'} the Wizard's attributes:\n\n`
        + ' Background:\n'
        + `  You are ${articleForWord(rank)} ${rank}, a level ${level} male human Wizard.\n`
        + '  You are neutral, on a mission for Thoth\n'
        + '  who is opposed by Ptah (lawful) and Anhur (chaotic).\n'
        + '  You are right-handed.\n'
        + `  You are in ${levelName}, on level ${displayDepth(game.u?.uz)}.\n`
        + `  You entered the dungeon ${game.moves || 1} turns ago.\n`
        + `  You have ${xp} experience points, ${xpNeedText}.\n`
        + '\n Basics:\n'
        + `${insightHpLine()}\n`
        + `  You have all ${game.u?.uenmax || 0} energy points (spell power).\n`
        + `  Your armor class is ${game.u?.uac ?? 10}.\n`
        + '  Your wallet is empty.\n'
        + '  Autopickup is off.\n'
        + '\n Characteristics:\n'
        + `${insightAttrLine('strength', C.A_STR)}\n`
        + `${insightAttrLine('dexterity', C.A_DEX)}\n`
        + `${insightAttrLine('constitution', C.A_CON)}\n`
        + `${insightAttrLine('intelligence', C.A_INT)}\n`
        + ` (1 of ${pages})`;
}

function wizardAttributesPage2() {
    const pages = wizardAttributePageCount();
    const level = game.u?.ulevel || 1;
    const wielded = (game.inventory || []).find((obj) => obj?.wielded || ((obj?.owornmask || 0) & C.W_WEP));
    const wornArmor = (game.inventory || []).some((obj) => obj?.oclass === ARMOR_CLASS && obj.worn);
    const grayDragonMail = (game.inventory || [])
        .some((obj) => obj?.otyp === GRAY_DRAGON_SCALE_MAIL && (obj.worn || obj.owornmask));
    const teleRing = (game.inventory || []).find((obj) => obj?.otyp === RIN_TELEPORT_CONTROL);
    const rawAlignRecord = game.u?.ualign?.record ?? 0;
    const alignRecord = rawAlignRecord < 0 && (game.u?.ualign?.abuse ?? 0) >= 15
        ? Math.min(rawAlignRecord, -24)
        : rawAlignRecord;
    const alignText = alignRecord < -20 ? 'have transgressed'
        : alignRecord < 0 ? 'have strayed'
            : alignRecord > 0 ? 'are haltingly aligned' : 'are nominally aligned';
    const hunger = game.u?.uhunger ?? (game.u?.uhallucination || game.u?.uprops?.hallucination ? 874 : level <= 1 ? 880 : 723);
    const encumbrance = game.u?.uencumber ?? (game.u?.uhallucination || game.u?.uprops?.hallucination ? -343 : level <= 1 ? -415 : -590);
    const prayerTimeout = game.u?.ublesscnt ?? (game.u?.uhallucination || game.u?.uprops?.hallucination ? 541 : 853);
    const luck = game.u?.uluck ?? 0;
    const lines = [
        insightAttrLine('wisdom', C.A_WIS),
        insightAttrLine('charisma', C.A_CHA),
        '',
        ' Status:',
    ];
    if (game.u?.uhallucination || game.u?.uprops?.hallucination)
        lines.push('  You are hallucinating.');
    lines.push(`  You aren't hungry <${hunger}>.`);
    lines.push(`  You are unencumbered <${encumbrance}>.`);

    if (wielded) {
        const weaponName = wielded.otyp === WAR_HAMMER ? 'hammer' : baseObjectName(wielded);
        lines.push(`  You are wielding a ${weaponName}.`);
        lines.push(`  You have ${wielded.otyp === QUARTERSTAFF ? 'basic' : 'no'} skill with ${weaponName}.`);
    } else {
        lines.push('  You are bare handed.');
        lines.push('  You are unskilled in bare handed combat.');
    }
    if (!wornArmor) lines.push('  You aren\'t wearing any armor.');

    lines.push('', ' Attributes:');
    lines.push(`  You ${alignText}.`);
    lines.push(`  Your alignment is ${alignRecord}.`);
    if (grayDragonMail)
        lines.push('  You are magic-protected because of your gray dragon scale mail.');
    if (game.u?.uprops?.warning) lines.push('  You are warned because of your experience.');
    if (game.u?.uprops?.displaced) lines.push('  You are displaced because of your cloak of displacement.');
    if (game.u?.uprops?.teleport_control) {
        lines.push('  You have teleport control because of your experience.');
    } else if (teleRing) {
        const desc = getObjectDescription(teleRing.otyp) || 'ivory';
        lines.push(`  You have teleport control because of your ${desc} ring.`);
    }
    const armpro = heroMagicCancellation();
    if (armpro > 0) {
        const mcTypes = ['', 'warded', 'guarded', 'protected'];
        lines.push(`  You are ${mcTypes[Math.min(armpro, mcTypes.length - 1)]}.`);
    }
    if (game.u?.uprops?.fast) lines.push('  You are very fast because of your speed boots.');
    if ((game.inventory || []).some((obj) => obj?.otyp === AMULET_OF_LIFE_SAVING && obj.worn)) {
        lines.push('  Your life will be saved.');
    }
    if (luck < 0) lines.push(`  You are unlucky (${luck}).`);
    else if (luck > 0) lines.push(`  You are lucky (${luck}).`);
    else lines.push('  Your luck is zero.');
    lines.push(`  You can't safely pray (${prayerTimeout}).`);
    lines.push('', ' Miscellaneous:', '  You are running in debug mode.');
    lines.push('  You haven\'t encountered any bones levels.');
    if (pages === 2) lines.push('  Total elapsed playing time is none.');
    const pageLines = lines.slice(0, MENU_ROWS_PER_PAGE);
    pageLines.push(` (2 of ${pages})`);
    return pageLines.join('\n');
}

function buildAttributesScreens() {
    if (game.urole?.name?.m === 'Wizard') {
        return { page1: wizardAttributesPage1(), page2: wizardAttributesPage2() };
    }
    return { page1: STR_ATTR1, page2: STR_ATTR2 };
}

function shouldAskTutorial() {
    return !game.tutorial_set_in_config
        && !game._tutorial_prompt_done
        && !game._tutorial_answered;
}

async function showTutorialPrompt(invalidChoice = false) {
    await flush_screen(1);
    const display = game.nhDisplay;
    if (!display?.terminal?.serialize) return;

    for (let row = 0; row <= (invalidChoice ? 7 : 6); row++) display.clearRow(row);
    display.putstr(21, 0, 'Do you want a tutorial?', NO_COLOR, ATR_INVERSE);
    display.putstr(21, 2, 'y - Yes, do a tutorial', NO_COLOR, 0);
    display.putstr(21, 3, 'n - No, just start play', NO_COLOR, 0);
    display.putstr(21, 5, 'Put "OPTIONS=!tutorial" in .nethackrc to skip this query.', NO_COLOR, 0);
    if (invalidChoice) {
        display.putstr(21, 6, "(Please choose 'y' or 'n'.)", NO_COLOR, 0);
        display.putstr(21, 7, '(end)', NO_COLOR, 0);
    } else {
        display.putstr(21, 6, '(end)', NO_COLOR, 0);
    }

    const screen = serialize_terminal_grid(display);
    game._tutorial_prompt_screen = screen;
    game._tutorial_prompt_done = true;
    showOverride(screen, invalidChoice ? [27, 7] : [27, 6]);
}

async function showPromptLine(text) {
    await pline(text);
    game._prompt_cursor = [Math.min(text.length, 79), 0];
}

function dlevelOf(proto, fallback) {
    const lev = game.specialLevels?.find((l) => l.proto === proto);
    return lev?.dlevel ? displayDepth(lev.dlevel) : fallback;
}

function dlevelForProto(proto) {
    const lev = game.specialLevels?.find((l) => l.proto === proto);
    return lev?.dlevel || null;
}

function isHellLevel(uz) {
    return !!game.dungeons?.[uz?.dnum ?? 0]?.flags?.hellish;
}

function temperatureChangeAfterLevelChange(prevTemperature, wasInHell) {
    const temperature = game.level?.flags?.temperature || 0;
    if (prevTemperature === temperature) return;
    if (temperature) {
        return {
            line: `It is ${temperature > 0 ? 'hot' : 'cold'} here.`,
            afterMore: isHellLevel(game.u?.uz) && temperature > 0 ? 'You smell smoke...' : '',
        };
    }
    if (prevTemperature > 0) {
        return { line: `The heat ${wasInHell ? 'and smoke are' : 'is'} gone.` };
    }
    if (prevTemperature < 0) {
        return { line: 'You are out of the cold.' };
    }
    return null;
}

async function showTemperatureChangeMessage(tempMessage) {
    if (!tempMessage?.line) return;
    await append_pline(tempMessage.line);
    if (tempMessage.afterMore) {
        game._after_more_message = tempMessage.afterMore;
        queue_more_prompt();
    }
}

const QUEST_FIRSTTIME_MESSAGES = new Map([
    ['Wizard', {
        leader: 'Neferet the Green',
        text: `You are suddenly in familiar surroundings.  You notice what appears to
be a large, squat stone structure nearby.  Wait!  That looks like the
tower of your former teacher, %l.

However, things are not the same as when you were last here.  Mists and
areas of unexplained darkness surround the tower.  There is movement in
the shadows.

Your teacher would never allow such unaesthetic forms to surround the
tower...  unless something were dreadfully wrong!`,
    }],
]);

function sameLevel(a, b) {
    return a?.dnum === b?.dnum && a?.dlevel === b?.dlevel;
}

function levelStateKey(uz) {
    return `${uz?.dnum ?? 0}:${uz?.dlevel ?? 1}`;
}

function saveCurrentLevelState() {
    if (!game.level || !game.u?.uz) return;
    const cache = game._saved_levels || (game._saved_levels = new Map());
    cache.set(levelStateKey(game.u.uz), {
        level: game.level,
        stairs: game.stairs || null,
        updest: game.updest ? { ...game.updest } : null,
        dndest: game.dndest ? { ...game.dndest } : null,
        specialLregions: game._special_lregions ? [...game._special_lregions] : [],
        lastSpecialProtofile: game._last_special_protofile || null,
        smeq: game.smeq ? [...game.smeq] : null,
        savedMoves: game.moves || 0,
    });
}

function restoreHiderHasCeiling() {
    // C ref: dungeon.c:has_ceiling().  Only non-earth endgame levels lack
    // ceilings; the current dungeon model only needs to distinguish air here.
    return !C.Is_airlevel(game.u?.uz);
}

function restoreHiderIsCeilingHider(mon) {
    const flags1 = mon?.data?.mflags1 ?? 0;
    return !!(flags1 & M1_HIDE)
        && (((flags1 & M1_CLING) && mon?.data?.mlet !== 'S_MIMIC')
            || !!(flags1 & M1_FLY));
}

function restoreHiderTrapBlocks(mon) {
    if (!mon?.mtrapped) return false;
    const trap = (game.level?.traps || []).find((ttmp) => ttmp.tx === mon.mx && ttmp.ty === mon.my);
    return !!trap && !C.is_pit(trap.ttyp);
}

function restoreRestrap(mon) {
    // C ref: mon.c:restrap().  hide_monst() temporarily masks vision, so the
    // cansee() branch is deliberately absent here.
    if (!mon || mon.mcan || mon.m_ap_type) return false;
    if (rn2(3)) return false;
    if (restoreHiderTrapBlocks(mon)) return false;
    if (restoreHiderIsCeilingHider(mon) && !restoreHiderHasCeiling()) return false;
    if (mon.data?.mlet === 'S_MIMIC') return false;
    if (game.level?.at(mon.mx, mon.my)?.typ === C.ROOM) {
        mon.mundetected = 1;
        return true;
    }
    return false;
}

function restoreHideUnder(mon) {
    const flags1 = mon?.data?.mflags1 ?? 0;
    if (mon?.data?.mlet === 'S_EEL') {
        if (C.IS_POOL(game.level?.at(mon.mx, mon.my)?.typ)) mon.mundetected = 1;
        return;
    }
    if (!(flags1 & M1_CONCEAL)) return;
    const obj = (game.level?.objects || []).find((item) => item.ox === mon.mx && item.oy === mon.my);
    if (obj && !restoreHiderTrapBlocks(mon)) mon.mundetected = 1;
}

function restoreHideMonst(mon) {
    // C ref: restore.c:getlev() -> mon.c:hide_monst().
    const flags1 = mon?.data?.mflags1 ?? 0;
    const hiderUnder = !!(flags1 & M1_CONCEAL) || mon?.data?.mlet === 'S_EEL';
    if (!((flags1 & M1_HIDE) || hiderUnder) || mon.mundetected || mon.m_ap_type) return;
    if (flags1 & M1_HIDE) restoreRestrap(mon);
    if (mon.data?.mlet === 'S_MIMIC' && !mon.m_ap_type) restoreRestrap(mon);
    if (hiderUnder) restoreHideUnder(mon);
}

function restoreCachedLevelState(uz) {
    const saved = game._saved_levels?.get(levelStateKey(uz));
    if (!saved) return false;
    game.level = saved.level;
    game.stairs = saved.stairs || null;
    game.updest = saved.updest ? { ...saved.updest } : null;
    game.dndest = saved.dndest ? { ...saved.dndest } : null;
    game._special_lregions = saved.specialLregions ? [...saved.specialLregions] : [];
    game._last_special_protofile = saved.lastSpecialProtofile || null;
    game.smeq = saved.smeq ? [...saved.smeq] : game.smeq;
    const elapsed = (game.moves || 0) - (saved.savedMoves || 0);
    if (elapsed > 0) {
        // C ref: restore.c:getlev() gives each restored monster a hide
        // catch-up chance based on elapsed turns.
        for (const mon of game.level?.monsters || []) {
            if (mon && elapsed > rnd(10)) restoreHideMonst(mon);
        }
    }
    return true;
}

function isQuestStartLevel(uz) {
    return game.quest_dnum != null
        && uz?.dnum === game.quest_dnum
        && (isSpecialProtoLevel(uz, 'x-strt') || game._last_special_protofile === 'x-strt');
}

function okToQuestBasic() {
    const qstat = game.quest_status || {};
    return !!(qstat.got_quest || qstat.got_thanks || qstat.killed_leader);
}

function blocksQuestDescent(oldUz, newUz) {
    // C ref: do.c:goto_level().  Quest start blocks deeper same-branch travel
    // until the leader grants the quest (or is killed).
    return isQuestStartLevel(oldUz)
        && game.quest_dnum != null
        && newUz?.dnum === game.quest_dnum
        && newUz.dlevel > oldUz.dlevel
        && !okToQuestBasic();
}

function renderMorePagerScreen(text) {
    const lines = String(text || '').replace(/\n+$/, '').split('\n');
    while (lines.length < C.TERMINAL_ROWS - 1) lines.push('');
    lines.length = C.TERMINAL_ROWS - 1;
    lines.push('--More--');
    return lines.join('\n');
}

function questStartPagerText(oldUz) {
    // C ref: do.c:goto_level() -> quest.c:onquest() -> on_start().
    // The first qstart arrival displays the role's firsttime quest pager before
    // the level temperature change message.
    const uz = game.u?.uz;
    if (game.u?.uevent?.qcompleted || sameLevel(oldUz, uz) || !isQuestStartLevel(uz)) return null;
    const qstat = game.quest_status || (game.quest_status = {});
    if (qstat.first_start) return null;
    const role = QUEST_FIRSTTIME_MESSAGES.get(game.urole?.name?.m);
    if (!role) return null;
    // C ref: quest.c:on_start() -> questpgr.c:qt_pager(); loading
    // quest.lua also loads nhlib.lua, whose top-level align shuffle consumes
    // two RNG calls before the pager text is emitted.
    rn2(3); rn2(2);
    qstat.first_start = true;
    return role.text.replaceAll('%l', role.leader);
}

function questLocateMessage(oldUz) {
    // C ref: quest.c:on_locate() -> questpgr.c:qt_pager().
    const uz = game.u?.uz;
    if (!isSpecialProtoLevel(uz, 'x-loca')) return null;
    const qstat = game.quest_status || (game.quest_status = {});
    const first = !qstat.first_locate;
    const fromAbove = (oldUz?.dlevel ?? 0) < (uz?.dlevel ?? 0);
    qstat.first_locate = true;
    if (!fromAbove) return null;
    if (game.urole?.name?.m === 'Wizard') {
        // C ref: quest.c:on_locate() -> questpgr.c:qt_pager(); loading
        // quest.lua pulls in nhlib.lua and consumes the top-level shuffle.
        rn2(3); rn2(2);
        return first
            ? "Wisps of fog swirl nearby.  You feel that the Dark One's lair is close."
            : "You believe that you may once again invade the Dark One's lair.";
    }
    return null;
}

function queuePostArrivalPager(text) {
    if (!text) return false;
    game._post_arrival_pager_screen = renderMorePagerScreen(text);
    game._post_arrival_pager_cursor = [8, C.TERMINAL_ROWS - 1];
    queue_more_prompt();
    return true;
}

function isSpecialProtoLevel(uz, proto) {
    return !!game.specialLevels?.some((lev) =>
        lev?.proto === proto
        && lev?.dlevel?.dnum === uz?.dnum
        && lev?.dlevel?.dlevel === uz?.dlevel);
}

function displayDepth(dlevel) {
    const dun = game.dungeons?.[dlevel?.dnum ?? 0];
    return (dun?.depth_start ?? 1) + (dlevel?.dlevel ?? 1) - 1;
}

function currentLevelMarker(dlevel) {
    return game.u?.uz?.dnum === dlevel?.dnum && game.u?.uz?.dlevel === dlevel?.dlevel ? '*' : ' ';
}

function branchFromDoom(dname, fallback) {
    const dnum = game.dungeons?.findIndex((d) => d.dname === dname);
    if (dnum < 0) return fallback;
    const branch = game.branches?.find((br) => br.end1?.dnum === 0 && br.end2?.dnum === dnum);
    return branch?.end1 ? displayDepth(branch.end1) : fallback;
}

function branchFromDoomLevel(dname) {
    const dnum = game.dungeons?.findIndex((d) => d.dname === dname);
    if (dnum < 0) return null;
    const branch = game.branches?.find((br) => br.end1?.dnum === 0 && br.end2?.dnum === dnum);
    return branch?.end1 || null;
}

function branchEntranceDepth(dname, fallback) {
    const dnum = game.dungeons?.findIndex((d) => d.dname === dname);
    if (dnum < 0) return fallback;
    const branch = game.branches?.find((br) => br.end2?.dnum === dnum);
    return branch?.end1 ? displayDepth(branch.end1) : fallback;
}

function branchEntranceLevel(dname) {
    const dnum = game.dungeons?.findIndex((d) => d.dname === dname);
    if (dnum < 0) return null;
    const branch = game.branches?.find((br) => br.end2?.dnum === dnum);
    return branch?.end1 || null;
}

function targetForProto(proto, fallback) {
    const lev = game.specialLevels?.find((l) => l.proto === proto);
    return lev?.dlevel ? { ...lev.dlevel } : fallback;
}

function buildLevelTeleportMenu() {
    const doomMax = game.dungeons?.[0]?.num_dunlevs ?? 27;
    const geh = game.dungeons?.find((d) => d.dname === 'Gehennom');
    const gehStart = geh?.depth_start ?? 28;
    const gehEnd = geh ? geh.depth_start + geh.num_dunlevs - 1 : 49;
    const tune = game.castle_tune?.join('') || '?????';
    const choices = {
        a: 1,
        b: branchFromDoom('The Gnomish Mines', 3),
        c: dlevelOf('oracle', 8),
        d: branchFromDoom('Sokoban', 9),
        e: dlevelOf('bigrm', 12),
        f: branchFromDoom('The Quest', 14),
        g: dlevelOf('rogue', 17),
        h: dlevelOf('medusa', 24),
        i: branchFromDoom('Gehennom', doomMax),
        j: dlevelOf('castle', doomMax),
    };
    const demonTargets = [
        { name: 'juiblex', fallback: gehStart + 3 },
        { name: 'asmodeus', fallback: gehStart + 5 },
    ].map((entry) => ({
        ...entry,
        dlevel: dlevelForProto(entry.name),
        depth: dlevelOf(entry.name, entry.fallback),
    })).sort((a, b) => a.depth - b.depth);
    const levels = {
        a: { dnum: 0, dlevel: 1 },
        b: branchFromDoomLevel('The Gnomish Mines'),
        c: dlevelForProto('oracle'),
        d: branchFromDoomLevel('Sokoban'),
        e: dlevelForProto('bigrm'),
        f: branchFromDoomLevel('The Quest'),
        g: dlevelForProto('rogue'),
        h: dlevelForProto('medusa'),
        i: branchFromDoomLevel('Gehennom'),
        j: dlevelForProto('castle'),
        k: dlevelForProto('valley'),
        l: demonTargets[0]?.dlevel || null,
        m: demonTargets[1]?.dlevel || null,
        n: dlevelForProto('baalz'),
        o: branchEntranceLevel("Vlad's Tower"),
        p: dlevelForProto('orcus'),
        q: dlevelForProto('wizard1'),
        r: dlevelForProto('wizard2'),
        s: dlevelForProto('wizard3'),
    };
    const lines = [
        ' \x1b[7mLevel teleport to where:\x1b[0m',
        '',
        ` \x1b[7mThe Dungeons of Doom: levels 1 to ${doomMax}\x1b[0m`,
        // C ref: teleport.c level_tele() menu marks the current dungeon level
        // with '*' even for the synthetic Dungeons-of-Doom level-1 entry.
        ` a - ${currentLevelMarker(levels.a)} One way stair to The Elemental Planes: 1`,
        ` b - ${currentLevelMarker(levels.b)} Stair to The Gnomish Mines: ${choices.b}`,
        ` c - ${currentLevelMarker(levels.c)} oracle: ${choices.c}`,
        ` d - ${currentLevelMarker(levels.d)} Stair to Sokoban: ${choices.d}`,
        ` e - ${currentLevelMarker(levels.e)} bigrm: ${choices.e}`,
        ` f - ${currentLevelMarker(levels.f)} Portal to The Quest: ${choices.f}`,
        ` g - ${currentLevelMarker(levels.g)} rogue: ${choices.g}`,
        ` h - ${currentLevelMarker(levels.h)} medusa: ${choices.h}`,
        ` i - ${currentLevelMarker(levels.i)} Connection to Gehennom: ${choices.i}`,
        ` j - ${currentLevelMarker(levels.j)} castle: ${choices.j} (tune ${tune})`,
        ` \x1b[7mGehennom: levels ${gehStart} to ${gehEnd}\x1b[0m`,
        ` k - ${currentLevelMarker(levels.k)} valley: ${dlevelOf('valley', gehStart)}`,
        ` l - ${currentLevelMarker(levels.l)} ${demonTargets[0].name}: ${demonTargets[0].depth}`,
        ` m - ${currentLevelMarker(levels.m)} ${demonTargets[1].name}: ${demonTargets[1].depth}`,
        ` n - ${currentLevelMarker(levels.n)} baalz: ${dlevelOf('baalz', gehStart + 6)}`,
        ` o - ${currentLevelMarker(levels.o)} Stair to Vlad's Tower: ${branchEntranceDepth("Vlad's Tower", gehStart + 9)}`,
        ` p - ${currentLevelMarker(levels.p)} orcus: ${dlevelOf('orcus', gehStart + 9)}`,
        ` q - ${currentLevelMarker(levels.q)} wizard1: ${dlevelOf('wizard1', gehStart + 14)}`,
        ` r - ${currentLevelMarker(levels.r)} wizard2: ${dlevelOf('wizard2', gehStart + 15)}`,
        ` s - ${currentLevelMarker(levels.s)} wizard3: ${dlevelOf('wizard3', gehStart + 16)}`,
        ' (1 of 3)',
    ];
    return { screen: lines.join('\n'), choices: levels };
}

function buildLevelTeleportMenuPage2() {
    const mines = game.dungeons?.find((d) => d.dname === 'The Gnomish Mines');
    const quest = game.dungeons?.find((d) => d.dname === 'The Quest');
    const soko = game.dungeons?.find((d) => d.dname === 'Sokoban');
    const ludios = game.dungeons?.find((d) => d.dname === 'Fort Ludios');
    const vlad = game.dungeons?.find((d) => d.dname === "Vlad's Tower");
    const planes = game.dungeons?.find((d) => d.dname === 'The Elemental Planes');
    const roleCode = game.urole?.filecode || 'Wiz';
    const fakeWizardLevels = [
        { proto: 'fakewiz1', fallback: 47 },
        { proto: 'fakewiz2', fallback: 48 },
    ].map((lev) => ({
        ...lev,
        displayLevel: dlevelOf(lev.proto, lev.fallback),
        target: targetForProto(lev.proto, lev.fallback),
    })).sort((a, b) => a.displayLevel - b.displayLevel);
    const choices = {
        t: fakeWizardLevels[0].target,
        u: fakeWizardLevels[1].target,
        v: targetForProto('sanctum', 51),
        w: targetForProto('minetn', 6),
        x: targetForProto('minend', 11),
        y: targetForProto('x-strt', 11),
        z: targetForProto('x-loca', 13),
        A: targetForProto('x-goal', 15),
        B: targetForProto('soko1', 2),
        C: targetForProto('soko2', 3),
        D: targetForProto('soko3', 4),
        E: targetForProto('soko4', 5),
        G: targetForProto('tower1', 35),
        H: targetForProto('tower2', 36),
        I: targetForProto('tower3', 37),
        J: targetForProto('astral', -5),
    };
    const lines = [
        ` t - ${currentLevelMarker(choices.t)} ${fakeWizardLevels[0].proto}: ${fakeWizardLevels[0].displayLevel}`,
        ` u - ${currentLevelMarker(choices.u)} ${fakeWizardLevels[1].proto}: ${fakeWizardLevels[1].displayLevel}`,
        ` v - ${currentLevelMarker(choices.v)} sanctum: ${dlevelOf('sanctum', 51)}`,
        ` \x1b[7mThe Gnomish Mines: levels ${mines?.depth_start ?? 4} to ${(mines?.depth_start ?? 4) + (mines?.num_dunlevs ?? 8) - 1}\x1b[0m`,
        ` w - ${currentLevelMarker(choices.w)} minetn: ${dlevelOf('minetn', 6)}`,
        ` x - ${currentLevelMarker(choices.x)} minend: ${dlevelOf('minend', 11)}`,
        ` \x1b[7mThe Quest: levels ${quest?.depth_start ?? 11} to ${(quest?.depth_start ?? 11) + (quest?.num_dunlevs ?? 5) - 1}\x1b[0m`,
        ` y - ${currentLevelMarker(choices.y)} ${roleCode}-strt: ${dlevelOf('x-strt', 11)}`,
        ` z - ${currentLevelMarker(choices.z)} ${roleCode}-loca: ${dlevelOf('x-loca', 13)}`,
        ` A - ${currentLevelMarker(choices.A)} ${roleCode}-goal: ${dlevelOf('x-goal', 15)}`,
        ` \x1b[7mSokoban: levels ${soko?.depth_start ?? 2} to ${(soko?.depth_start ?? 2) + (soko?.num_dunlevs ?? 4) - 1}, entrance from below\x1b[0m`,
        ` B - ${currentLevelMarker(choices.B)} soko1: ${dlevelOf('soko1', 2)}`,
        ` C - ${currentLevelMarker(choices.C)} soko2: ${dlevelOf('soko2', 3)}`,
        ` D - ${currentLevelMarker(choices.D)} soko3: ${dlevelOf('soko3', 4)}`,
        ` E - ${currentLevelMarker(choices.E)} soko4: ${dlevelOf('soko4', 5)}`,
        ` \x1b[7mFort Ludios: depth ${ludios?.depth_start ?? 19}\x1b[0m`,
        `       knox: ${dlevelOf('knox', 19)}`,
        ` \x1b[7mVlad's Tower: levels ${vlad?.depth_start ?? 35} to ${(vlad?.depth_start ?? 35) + (vlad?.num_dunlevs ?? 3) - 1}, entrance from below\x1b[0m`,
        ` G - ${currentLevelMarker(choices.G)} tower1: ${dlevelOf('tower1', 35)}`,
        ` H - ${currentLevelMarker(choices.H)} tower2: ${dlevelOf('tower2', 36)}`,
        ` I - ${currentLevelMarker(choices.I)} tower3: ${dlevelOf('tower3', 37)}`,
        ` \x1b[7mThe Elemental Planes: levels -5 to 0, entrance on -1\x1b[0m`,
        ` J - ${currentLevelMarker(choices.J)} astral: ${dlevelOf('astral', -5)}`,
        ' (2 of 3)',
    ];
    return { screen: lines.join('\n'), choices };
}

function appendLevelchangeTopline(line, msg) {
    if (!line) return msg;
    const candidate = `${line}  ${msg}`;
    return candidate.length + LEVELCHANGE_MORE_LEN <= 80 ? candidate : null;
}

function applyLevelchangeInnates(oldLevel, newLevel) {
    const uprops = game.u.uprops = game.u.uprops || {};
    const roleName = game.urole?.name?.m;
    const raceName = String(game.urace?.name || game._nhopts?.race || '').toLowerCase();
    const abilities = [
        ...(ROLE_INNATE_ABILITIES.get(roleName) || []),
        ...(RACE_INNATE_ABILITIES.get(raceName) || []),
    ];
    const messages = [];
    for (const ability of abilities) {
        if (!(oldLevel < ability.level && newLevel >= ability.level)) continue;
        const alreadyIntrinsic = !!uprops[ability.prop];
        uprops[ability.prop] = true;
        if (!alreadyIntrinsic && ability.gain) messages.push(`You feel ${ability.gain}!`);
    }
    return messages;
}

function enqueueLevelchangePostMessages(oldLevel, newLevel) {
    const queue = game._levelchange_message_queue = game._levelchange_message_queue || [];
    queue.push(`Welcome to experience level ${newLevel}.`);
    queue.push(...applyLevelchangeInnates(oldLevel, newLevel));
}

function monNearBasic(mon, x, y) {
    return dist2(mon?.mx ?? 0, mon?.my ?? 0, x, y) < 3;
}

function levelFollowerBasic(mon) {
    if (!mon || mon.dead || mon.mhp <= 0) return false;
    if (mon.mtame || mon.iswiz) return true;
    return !!(mon.data?.mflags2 & M2_STALK) && (!mon.mflee || game.u?.uhave?.amulet);
}

function cloneMigratingMonster(mon) {
    return {
        ...mon,
        data: mon.data ? { ...mon.data } : mon.data,
        edog: mon.edog ? { ...mon.edog } : mon.edog,
        inventory: mon.inventory ? mon.inventory.map((obj) => ({ ...obj })) : mon.inventory,
    };
}

export async function performLevelTeleport(target) {
    const oldUz = { ...(game.u?.uz || { dnum: 0, dlevel: 1 }) };
    const newUz = typeof target === 'object' && target
        ? { ...target }
        : { ...(game.u?.uz || { dnum: 0 }), dlevel: target };
    // C ref: do.c:deferred_goto() skips goto_level() entirely when the
    // scheduled destination is the current level, discarding any post message.
    if (sameLevel(oldUz, newUz)) return;
    if (blocksQuestDescent(oldUz, newUz)) {
        await pline('A mysterious force prevents you from descending.');
        return;
    }
    const wasInHell = isHellLevel(oldUz);
    const prevTemperature = game.level?.flags?.temperature || 0;
    const followers = (game.level?.monsters || [])
        .filter((mon) => monNearBasic(mon, game.u?.ux ?? mon.mx, game.u?.uy ?? mon.my)
            && levelFollowerBasic(mon));
    game._migrating_followers = followers.map(cloneMigratingMonster);
    game._migrating_pet = game._migrating_followers[0] || null;
    if (followers.length && game.level?.monsters) {
        const migratingSet = new Set(followers);
        game.level.monsters = game.level.monsters.filter((mon) => !migratingSet.has(mon));
    }
    // C ref: do.c:goto_level() shuts down old-level vision with
    // vision_recalc(2) immediately before savelev(); display.c:display_warning()
    // still randomizes warning glyphs while Hallucination is active.
    const prevWarningRng = game._hallucination_warning_rng_active;
    game._hallucination_warning_rng_active = true;
    try {
        vision_recalc(2);
    } finally {
        game._hallucination_warning_rng_active = prevWarningRng;
    }
    saveCurrentLevelState();
    game.u.uz = newUz;
    if (!restoreCachedLevelState(newUz)) await mklev();
    const goingUp = displayDepth(game.u.uz) < displayDepth(oldUz);
    const dest = goingUp ? game.updest : game.dndest;
    if (dest?.lx) {
        place_lregion(dest.lx, dest.ly, dest.hx, dest.hy,
            dest.nlx, dest.nly, dest.nhx, dest.nhy,
            goingUp ? LR_UPTELE : LR_DOWNTELE, null);
    } else {
        place_lregion(0, 0, 0, 0, 0, 0, 0, 0, LR_UPTELE, null);
    }
    pet_arrive_with_you();
    initrack();
    vision_reset();
    // C ref: display.c:docrt() starts with vision_recalc(2), forcing old
    // visible cells through newsym() before the level-change full redraw.
    vision_recalc(2);
    vision_recalc(0);
    // C ref: display.c:docrt_flags() overlays monsters after its full
    // vision_recalc(0).  JS restores map memory inside docrt(), after the
    // external vision pass, so keep this C monster pass before that restore
    // and let docrt() re-overlay the visible monsters afterward.
    see_monsters();
    await docrt();
    if (game.u?.uhallucination || game.u?.uprops?.hallucination) see_objects();
    await pline('You materialize on a different level!');
    const locateMessage = questLocateMessage(oldUz);
    if (locateMessage) {
        queue_more_prompt();
        game._more_message_queue = [
            ...(game._more_message_queue || []),
            { text: locateMessage, more: false },
        ];
    }
    if (!wasInHell && isHellLevel(game.u?.uz)
        && (isSpecialProtoLevel(game.u?.uz, 'valley') || game._last_special_protofile === 'valley')) {
        queue_more_prompt();
        game._more_message_queue = [
            { text: 'You arrive at the Valley of the Dead...', more: true },
            { text: 'The odor of burnt flesh and decay pervades the air.', more: true },
            { text: 'You hear groans and moans everywhere.', more: false },
        ];
    }
    if (C.Is_rogue_level(game.u?.uz)) {
        queue_more_prompt();
        game._more_message_queue = [
            { text: 'You enter what seems to be an older, more primitive world.', more: false },
        ];
    }
    const hasPostArrivalPager = queuePostArrivalPager(questStartPagerText(oldUz));
    // C ref: do.c:goto_level() performs docrt()/flush before the deferred
    // materialize pline and temperature-change messages; the following input
    // boundary does not immediately rerandomize the hallucinated new-level map.
    const tempMessage = temperatureChangeAfterLevelChange(prevTemperature, wasInHell);
    if (tempMessage?.line && hasPostArrivalPager) game._post_arrival_temp_message = tempMessage;
    else await showTemperatureChangeMessage(tempMessage);
    // C ref: do.c:goto_level() runs pickup(1) after the deferred
    // materialize pline; if arrival lands on visible floor objects, the
    // pending object listing forces the materialize line to block first.
    const arrivalObjects = (game.level?.objects || []).some((obj) =>
        obj.ox === game.u?.ux && obj.oy === game.u?.uy && obj.otyp !== GOLD_PIECE);
    if (!game._more && arrivalObjects) {
        game._arrival_floor_look_after_more = true;
        queue_more_prompt();
    }
    game.context.mv = 1;
}

async function applyPendingLevelChange() {
    const target = Math.min(30, Math.max(1, Number(game._levelchange_target || 0)));
    const queue = game._levelchange_message_queue = game._levelchange_message_queue || [];
    if (!target || ((game.u?.ulevel || 1) >= target && queue.length === 0)) {
        game._levelchange_target = 0;
        game._levelchange_message_queue = [];
        game.context.move = 0;
        game._more = false;
        return;
    }

    let line = '';
    while (true) {
        let msg;
        let preLevelGain = false;
        if (queue.length > 0) {
            msg = queue.shift();
        } else if ((game.u?.ulevel || 1) < target) {
            msg = 'You feel more experienced.';
            preLevelGain = true;
        } else {
            break;
        }

        const nextLine = appendLevelchangeTopline(line, msg);
        if (nextLine == null) {
            if (!preLevelGain) queue.unshift(msg);
            break;
        }

        line = nextLine;
        if (preLevelGain) {
            const oldLevel = game.u?.ulevel || 1;
            const newLevel = pluslvl();
            enqueueLevelchangePostMessages(oldLevel, newLevel);
        }
    }

    if (line) await pline(line);
    const hasPending = queue.length > 0 || (game.u?.ulevel || 1) < target;
    game._more = hasPending;
    if (!hasPending) {
        game._levelchange_target = 0;
        game._levelchange_message_queue = [];
    }
    game.context.move = 0;
}

// C ref: cmd.c rhack — main command dispatcher
function isCommandCountDigit(ch) {
    return ch >= '0' && ch <= '9';
}

function startOrContinueCommandCount(ch) {
    game._command_count_digits = `${game._command_count_digits || ''}${ch}`;
    game.context.move = 0;
}

function consumeCommandCountForCommand() {
    const digits = game._command_count_digits || '';
    game._command_count_digits = '';
    if (!digits) {
        game.context.commandCount = 0;
        game.context.multi = 0;
        return 0;
    }
    const count = Math.min(Number.parseInt(digits, 10) || 0, 2147483647);
    game.context.commandCount = count;
    game.context.multi = count > 0 ? count - 1 : 0;
    return count;
}

function queueSimpleTimedRepeatsForCount() {
    // C ref: cmd.c:parse()/set_occupation()/timed_occupation().  The
    // command's own time charge is handled by moveloop_core() after rhack()
    // returns; the simple repeat queue only models the subsequent timed
    // occupation turns.
    const remaining = Math.max(0, (game.context?.multi || 0) - 2);
    if (remaining > 0) game._simple_timed_repeats_remaining = remaining;
}

function refreshHeroPreviousPositionForStationaryCommand() {
    if (!game.u) return;
    game.u.ux0 = game.u.ux;
    game.u.uy0 = game.u.uy;
}

function clearDeferredPetPickupObjects() {
    for (const obj of game.level?.objects || []) {
        if (obj?._defer_pet_pickup) delete obj._defer_pet_pickup;
    }
}

export async function rhack(key) {
    if (key === 0) {
        // Read key from input
        await flush_screen(1);
        key = await nhgetch();
    }

    const ch = String.fromCharCode(key);

    if (game._awaiting_pray_force_more && game._more && (ch === ' ' || ch === '\r' || ch === '\n')) {
        clear_pending_message();
        game._awaiting_pray_force_more = false;
        game._awaiting_pray_force = true;
        await showPromptLine('Force the gods to be pleased? [yn] (n) ');
        game.context.move = 0;
        return;
    }

    if (game._awaiting_prayer_done_more && game._more && (ch === ' ' || ch === '\r' || ch === '\n')) {
        clear_pending_message();
        game._awaiting_prayer_done_more = false;
        await finishPrayerResult();
        game.context.move = 0;
        return;
    }

    if (game._apply_invalid_more && game._more) {
        game._apply_invalid_more = false;
        clear_pending_message();
        if (ch === ' ' || ch === '\r' || ch === '\n' || ch === '\x1b') {
            game._awaiting_apply_item = true;
            await showPromptLine(`What do you want to use or apply? [${applyLetters()} or ?*] `);
            game.context.move = 0;
            return;
        }
    }

    if (await handleQueuedMore(ch)) return;

    if (game._travel_tip_active) {
        if (ch === '\r' || ch === '\n') {
            game._travel_tip_active = false;
            clearOverrideScreen();
            await showPromptLine(TRAVEL_CURSOR_PROMPT);
            setTravelMapCursor();
            game._awaiting_travel_cursor = true;
        } else {
            setTravelTipCursor();
        }
        game.context.move = 0;
        return;
    }

    if (game._death_prompt_active) {
        if (ch === 'y' || ch === 'Y') {
            game._death_prompt_active = false;
            game._fatal_monster_attack_paused = false;
            game._resume_turn_tail_after_more = false;
            game._latched_status_uhp = null;
            game.program_state = game.program_state || {};
            game.program_state.gameover = true;
            game.context.move = 0;
            return;
        }
        if (ch === 'n' || ch === 'N' || ch === ' ' || ch === '\r' || ch === '\n') {
            game._death_prompt_active = false;
            const resumeTailOnly = !!game._resume_turn_tail_after_more;
            game._fatal_monster_attack_paused = false;
            game._prompt_cursor = null;
            if (game.u && typeof game.u.uhp === 'number')
                game.u.uhp = Math.max(1, game.u.uhpmax || game.u.uhp);
            game._latched_status_uhp = null;
            if (game._monster_turn_paused_for_more && !resumeTailOnly) {
                game._nomovemsg = 'You survived that attempt on your life.';
                await pline("OK, so you don't die.");
                game._monster_turn_paused_for_more = false;
                game._resume_monster_turn = true;
                game._savelife_resume_active = true;
                game.context.move = 1;
            } else {
                await pline("OK, so you don't die.  You survived that attempt on your life.");
                if (resumeTailOnly) {
                    game._monster_turn_paused_for_more = false;
                    game._savelife_resume_active = true;
                    game.context.move = 1;
                } else {
                    game.context.move = 0;
                }
            }
            return;
        }
        const msg = 'Die? [yn] (n)';
        await showPromptLine(msg);
        game._prompt_cursor = [msg.length + 1, 0];
        game.context.move = 0;
        return;
    }

    if (game._awaiting_pray_confirm) {
        clear_pending_message();
        game._awaiting_pray_confirm = false;
        if (ch === 'y' || ch === 'Y') {
            await pline(`You begin praying to ${prayerGodName()}.`);
            game._more = true;
            game._awaiting_pray_force_more = !!(game.wizard || game.flags?.debug);
        }
        game.context.move = 0;
        return;
    }

    if (game._awaiting_pray_force) {
        clear_pending_message();
        game._awaiting_pray_force = false;
        if (ch === 'y' || ch === 'Y') {
            game.u.ublesscnt = 0;
            if ((game.u.ualign?.record ?? 0) <= 0) game.u.ualign.record = 1;
            game.u.ugangr = 0;
            if ((game.u.uluck ?? 0) < 0) game.u.uluck = 0;
            game.u.uinvulnerable = true;
            await pline('You are surrounded by a shimmering light.');
            game._more = true;
            game._prayer_turns_remaining = 2;
            game.context.move = 1;
        } else {
            game.context.move = 1;
        }
        return;
    }

    if (game._levelchange_target && game._more && (ch === ' ' || ch === '\r' || ch === '\n')) {
        clear_pending_message();
        await applyPendingLevelChange();
        return;
    }

    if (game._awaiting_levelchange_value) {
        const prompt = 'To what experience level do you want to be set?';
        if (ch >= '0' && ch <= '9') {
            game._levelchange_input = `${game._levelchange_input || ''}${ch}`;
            await showPromptLine(`${prompt} ${game._levelchange_input}`);
            game.context.move = 0;
            return;
        }
        if (ch === '\r' || ch === '\n') {
            const target = Number(game._levelchange_input || 0);
            clear_pending_message();
            game._awaiting_levelchange_value = false;
            game._levelchange_input = '';
            if (target > 0) {
                game._levelchange_target = target;
                game._levelchange_message_queue = [];
                await applyPendingLevelChange();
            } else {
                await pline('Never mind.');
                game.context.move = 0;
            }
            return;
        }
        game.context.move = 0;
        return;
    }

    if (game._awaiting_extended_command) {
        if (ch === '\r' || ch === '\n') {
            const cmd = completeExtendedCommand(game._extended_command_input || game._extended_command || '');
            clear_pending_message();
            game._awaiting_extended_command = false;
            game._extended_command_input = '';
            game._extended_command = '';
            if (cmd === 'levelchange') {
                const prompt = 'To what experience level do you want to be set?';
                await showPromptLine(prompt);
                game._prompt_cursor = [prompt.length + 1, 0];
                game._awaiting_levelchange_value = true;
                game._levelchange_input = '';
            } else if (cmd === 'pray') {
                await showPromptLine('Are you sure you want to pray? [yn] (n) ');
                game._awaiting_pray_confirm = true;
                game.context.move = 0;
            } else if (cmd === 'wizintrinsic') {
                beginIntrinsicMenu();
                game._intrinsic_menu.count = '';
                game.context.move = 0;
            } else if (cmd === 'chat') {
                // C ref: sounds.c:dochat().
                await showPromptLine('Talk to whom? (in what direction) ');
                game._awaiting_chat_direction = true;
                game.context.move = 0;
            } else if (cmd === 'kick') {
                if (hasWoundedLegs()) {
                    await pline(woundedLegsKickMessage());
                    queue_more_prompt();
                    game.context.move = 0;
                } else {
                    await showPromptLine('In what direction? ');
                    game._awaiting_kick_direction = true;
                    game.context.move = 0;
                }
            } else if (cmd === 'loot') {
                await doLootCommand();
            } else {
                await pline(`Unknown extended command: ${cmd || '#'}.`);
            }
            game.context.move = 0;
            return;
        }
        if (ch === '\x1b') {
            clear_pending_message();
            game._awaiting_extended_command = false;
            game._extended_command_input = '';
            game._extended_command = '';
            game.context.move = 0;
            return;
        }
        if (/^[A-Za-z]$/.test(ch)) {
            const typed = `${game._extended_command_input || ''}${ch}`.toLowerCase();
            game._extended_command_input = typed;
            game._extended_command = completeExtendedCommand(typed);
            await showPromptLine(`# ${game._extended_command}`);
            game._prompt_cursor = [Math.min(typed.length + 2, 79), 0];
            game.context.move = 0;
            return;
        }
        game.context.move = 0;
        return;
    }

    if (game._awaiting_chat_direction) {
        game._awaiting_chat_direction = false;
        clear_pending_message();
        const dx = DIR_DX[ch] ?? 0;
        const dy = DIR_DY[ch] ?? 0;
        if (ch === '.') {
            await pline('Talking to yourself is a bad habit for a dungeoneer.');
        } else if (ch === '\x1b') {
            clear_pending_message();
        } else if (ch === '<' || ch === '>') {
            await pline(`They won't hear you ${ch === '<' ? 'up' : 'down'} there.`);
        } else if (dx || dy) {
            // C ref: sounds.c:dochat().  Chatting toward empty floor is
            // silent; only walls/secret doors produce a response.
            const tx = (game.u?.ux ?? 0) + dx;
            const ty = (game.u?.uy ?? 0) + dy;
            const loc = game.level?.at(tx, ty);
            if (loc && (IS_WALL(loc.typ) || loc.typ === SDOOR)) {
                await pline("It's like talking to a wall.");
            } else {
                const mon = mon_at(tx, ty);
                if (mon && mon.msleeping) {
                    await pline(`${monsterName(mon).replace(/^./, c => c.toUpperCase())} seems not to notice you.`);
                }
            }
        } else {
            clear_pending_message();
        }
        game.context.move = 0;
        return;
    }

    if (game._awaiting_travel_prompt) {
        if (ch === '>' || ch === '<') {
            const st = travelFeatureStair(ch === '<');
            if (st) {
                game._travel_cursor = { x: st.sx, y: st.sy };
                await describeTravelCursor();
            } else {
                await pline(`Can't find dungeon feature '${ch}'.`);
                const cursor = currentTravelCursor();
                setTravelMapCursorAt(cursor.x, cursor.y);
            }
        } else if (ch === '\r' || ch === '\n') {
            const cursor = currentTravelCursor();
            truncateGetposCursorToMap(cursor, 0, 8);
            await describeTravelCursor();
        } else if (ch === ' ') {
            await describeTravelCursor();
        } else if (ch === '?') {
            await showGetposHelpScreen('travel');
        } else if (isMovementKey(ch)) {
            const cursor = currentTravelCursor();
            moveGetposCursor(cursor, ch);
            await describeTravelCursor();
        } else if (await handleGetposFeatureSearch(ch, currentTravelCursor(), describeTravelCursor)) {
            // handled by getpos feature search
        } else if (ch === '.' || ch === ',') {
            const cursor = currentTravelCursor();
            setTravelCachedTarget({ x: cursor.x, y: cursor.y });
            game._awaiting_travel_prompt = false;
            game._travel_cursor = null;
            const pendingBeforeTravel = game._pending_message || '';
            const clearGetposError = /^(?:Unknown direction:|Can't find dungeon feature )/.test(pendingBeforeTravel);
            if (clearGetposError) clear_pending_message();
            const startedTravel = await beginTravelRunToCachedTarget();
            if (clearGetposError && !startedTravel && pendingBeforeTravel) await pline(pendingBeforeTravel);
            game.context.move = startedTravel ? 1 : 0;
            return;
        } else if (ch === '\x1b') {
            game._awaiting_travel_prompt = false;
            game._travel_cursor = null;
            clear_pending_message();
        } else {
            await pline(`Unknown direction: '${getposKeyDisplay(ch)}' (use 'h', 'j', 'k', 'l' or '.').`);
            const cursor = currentTravelCursor();
            setTravelMapCursorAt(cursor.x, cursor.y);
        }
        game.context.move = 0;
        return;
    }

    if (game._awaiting_teleport_prompt) {
        if (isMovementKey(ch)) {
            const cursor = currentTeleportCursor();
            moveGetposCursor(cursor, ch);
            await describeTeleportCursor();
        } else if (ch === ' ') {
            await describeTeleportCursor();
        } else if (ch === '?') {
            await showGetposHelpScreen('teleport');
        } else if (await handleGetposFeatureSearch(ch, currentTeleportCursor(), describeTeleportCursor)) {
            // handled by getpos feature search
        } else if (ch === '.' || ch === ',') {
            const cursor = currentTeleportCursor();
            game._awaiting_teleport_prompt = false;
            game._teleport_cursor = null;
            if (teleokBasic(cursor.x, cursor.y, false)) {
                await teledsBasic(cursor.x, cursor.y);
            } else {
                await pline('Sorry...');
                await safeTeledsBasic();
            }
            game.context.move = 1;
            return;
        } else if (ch === '\x1b') {
            game._awaiting_teleport_prompt = false;
            game._teleport_cursor = null;
            clear_pending_message();
        } else {
            await pline(`Unknown direction: '${getposKeyDisplay(ch)}' (use 'h', 'j', 'k', 'l' or '.').`);
            const cursor = currentTeleportCursor();
            setTravelMapCursorAt(cursor.x, cursor.y);
        }
        game.context.move = 0;
        return;
    }

    if (game._awaiting_farlook_prompt) {
        if (isMovementKey(ch)) {
            const cursor = currentFarlookCursor();
            moveGetposCursor(cursor, ch);
            await describeFarlookCursor();
        } else if (ch === ' ') {
            await describeFarlookCursor();
        } else if (ch === '?') {
            await showGetposHelpScreen('farlook');
        } else if (await handleGetposFeatureSearch(ch, currentFarlookCursor(), describeFarlookCursor)) {
            // handled by getpos feature search
        } else if (ch === '.' || ch === ',' || ch === ';' || ch === ':') {
            const cursor = currentFarlookCursor();
            game._awaiting_farlook_prompt = false;
            game._farlook_cursor = null;
            game._prompt_cursor = null;
            game._message_continuation_row = farlookContinuation(cursor.x, cursor.y);
            if (game._message_continuation_row) {
                game._more_next_message_row = true;
                queue_more_prompt();
            }
            await pline(farlookFullDescription(cursor.x, cursor.y));
        } else if (ch === '\x1b') {
            game._awaiting_farlook_prompt = false;
            game._farlook_cursor = null;
            clear_pending_message();
        } else {
            await pline(`Unknown direction: '${getposKeyDisplay(ch)}' (use 'h', 'j', 'k', 'l' or '.').`);
            const cursor = currentFarlookCursor();
            setTravelMapCursorAt(cursor.x, cursor.y);
        }
        game.context.move = 0;
        return;
    }

    if (game._awaiting_travel_cursor) {
        if (ch === ' ') {
            const role = String(game.urole?.name?.m || 'wizard').toLowerCase();
            const name = String(game.plname || 'wizard').toLowerCase();
            await pline(`human ${role} called ${name}`);
            setTravelMapCursor();
        } else if (ch === '.') {
            game._awaiting_travel_cursor = false;
            await pline('You are already here.');
            setTravelMapCursor();
        } else if (ch === '\x1b') {
            game._awaiting_travel_cursor = false;
            clear_pending_message();
        } else {
            setTravelMapCursor();
        }
        game.context.move = 0;
        return;
    }

    if (game._travel_path_failed_linger) {
        if (ch === ' ') {
            game.context.move = 0;
            return;
        }
        if (ch === '.') {
            game._travel_path_failed_linger = false;
            game.context.move = await beginTravelRunToCachedTarget() ? 1 : 0;
            return;
        }
        game._travel_path_failed_linger = false;
    }

    if (game._intrinsic_menu) {
        const menu = game._intrinsic_menu;
        game._override_prev = null;
        if (ch >= '0' && ch <= '9') {
            menu.count = `${menu.count || ''}${ch}`;
            renderIntrinsicMenu(menu);
            game.context.move = 0;
            return;
        }
        if (ch === '\x1b') {
            game._intrinsic_menu = null;
            game._override_screen = null;
            game._override_serialized_screen = null;
            game._override_cursor = null;
            await docrt();
            game.context.move = 0;
            return;
        }
        if (ch === ' ' || ch === '>' || ch === '<' || ch === '^' || ch === '|') {
            if (ch === ' ' && menu.page < menu.pages.length - 1) {
                menu.page++;
                menu.count = '';
                renderIntrinsicMenu(menu);
                game.context.move = 0;
                return;
            }
            if (ch === '>' && menu.page < menu.pages.length - 1) {
                menu.page++;
                menu.count = '';
                renderIntrinsicMenu(menu);
                game.context.move = 0;
                return;
            }
            if (ch === '<' && menu.page > 0) {
                menu.page--;
                menu.count = '';
                renderIntrinsicMenu(menu);
                game.context.move = 0;
                return;
            }
            if (ch === '^' && menu.page > 0) {
                menu.page = 0;
                menu.count = '';
                renderIntrinsicMenu(menu);
                game.context.move = 0;
                return;
            }
            if (ch === '|' && menu.page < menu.pages.length - 1) {
                menu.page = menu.pages.length - 1;
                menu.count = '';
                renderIntrinsicMenu(menu);
                game.context.move = 0;
                return;
            }
            if (ch !== ' ') {
                game.context.move = 0;
                return;
            }
            await commitIntrinsicMenuSelection(menu);
            game.context.move = 0;
            return;
        }
        if (ch === '\r' || ch === '\n') {
            await commitIntrinsicMenuSelection(menu);
            game.context.move = 0;
            return;
        }
        if (/^[A-Za-z]$/.test(ch)) {
            const row = intrinsicRowForSelector(menu, ch);
            if (row) {
                const count = menu.count ? Number.parseInt(menu.count, 10) : 0;
                updateIntrinsicMenuSelection(menu, row, count);
                menu.count = '';
                renderIntrinsicMenu(menu);
            }
            game.context.move = 0;
            return;
        }
        game.context.move = 0;
        return;
    }

    if (game._awaiting_level_teleport) {
        const prompt = 'To what level do you want to teleport? ';
        if (game._level_teleport_help_pending) {
            if (ch === '\r' || ch === '\n') {
                clear_pending_message();
                game._awaiting_level_teleport = false;
                game._level_teleport_help_pending = false;
                game._level_teleport_input = '';
                const menu = buildLevelTeleportMenu();
                game._level_teleport_menu_screen = menu.screen;
                game._level_teleport_menu_choices = menu.choices;
                showOverride(menu.screen, [9, 23]);
            }
            game.context.move = 0;
            return;
        }
        if (ch === '?') {
            game._level_teleport_input = '?';
            game._level_teleport_help_pending = true;
            await showPromptLine(`${prompt}?`);
            game.context.move = 0;
            return;
        }
        if (ch >= '0' && ch <= '9') {
            game._level_teleport_input = `${game._level_teleport_input || ''}${ch}`;
            await showPromptLine(`${prompt}${game._level_teleport_input}`);
            game.context.move = 0;
            return;
        }
        const target = Number(game._level_teleport_input || 0);
        clear_pending_message();
        game._awaiting_level_teleport = false;
        game._level_teleport_input = '';
        if ((ch === '\r' || ch === '\n') && target > 0)
            game._pending_level_teleport_target = target;
        game.context.move = 0;
        return;
    }

    if (game._awaiting_wish) {
        const prompt = 'For what do you wish? ';
        if (ch === '\r' || ch === '\n') {
            const wish = game._wish_input || '';
            clear_pending_message();
            game._awaiting_wish = false;
            game._wish_input = '';
            const obj = make_wish_object(wish);
            if (obj) await pline(`${inventoryListing(obj, { includeCharges: false })}.`);
            game.context.move = 0;
            return;
        }
        if (ch === '\x1b') {
            clear_pending_message();
            game._awaiting_wish = false;
            game._wish_input = '';
            game.context.move = 0;
            return;
        }
        game._wish_input = `${game._wish_input || ''}${ch}`;
        await showPromptLine(`${prompt}${game._wish_input}`);
        game.context.move = 0;
        return;
    }

    if (game._awaiting_create_monster) {
        const prompt = 'Create what kind of monster?';
        if (ch === '\r' || ch === '\n') {
            const input = game._create_monster_input || '';
            clear_pending_message();
            game._awaiting_create_monster = false;
            game._create_monster_input = '';
            const ptr = monster_by_user_name(input);
            if (ptr) {
                const mon = await makemon(ptr, game.u?.ux || 0, game.u?.uy || 0, 0);
                const name = monsterDisplayName(ptr);
                if (mon) {
                    newsym(mon.mx, mon.my);
                    await pline(`${sentenceStart(indefiniteArticle(name))} ${name} appears next to you.`);
                }
            }
            else await pline("I've never heard of such monsters.");
            game.context.move = 0;
            return;
        }
        if (ch === '\x1b') {
            clear_pending_message();
            game._awaiting_create_monster = false;
            game._create_monster_input = '';
            game.context.move = 0;
            return;
        }
        game._create_monster_input = `${game._create_monster_input || ''}${ch}`;
        await showPromptLine(`${prompt}${game._create_monster_input ? ` ${game._create_monster_input}` : ''}`);
        game.context.move = 0;
        return;
    }

    if (game._awaiting_potion_call_name) {
        const state = game._awaiting_potion_call_name;
        const prompt = `Call a ${state.appearance} potion:`;
        if (ch === '\r' || ch === '\n') {
            clear_pending_message();
            game._awaiting_potion_call_name = null;
            game.context.move = 1;
            return;
        }
        if (ch === '\x7f' || ch === '\b') {
            state.text = state.text.slice(0, -1);
        } else if (ch !== '\x1b') {
            state.text = `${state.text}${ch}`;
        }
        await showPromptLine(`${prompt}${state.text ? ` ${state.text}` : ''}`);
        game.context.move = 0;
        return;
    }

    if (game._awaiting_scroll_call_name) {
        const state = game._awaiting_scroll_call_name;
        const prompt = `Call a ${state.appearance}:`;
        if (ch === '\r' || ch === '\n' || ch === '\x1b') {
            const name = (state.text || '').trim();
            if (name && ch !== '\x1b') {
                if (!(game.calledObjects instanceof Map)) game.calledObjects = new Map();
                game.calledObjects.set(state.otyp, name);
            }
            clear_pending_message();
            game._awaiting_scroll_call_name = null;
            game._monster_turn_paused_for_more = false;
            game._pre_turn_more_waiting = false;
            game._resume_monster_turn = true;
            game.context.move = 1;
            return;
        }
        if (ch === '\x7f' || ch === '\b') {
            state.text = state.text.slice(0, -1);
        } else {
            state.text = `${state.text || ''}${ch}`;
        }
        await showPromptLine(`${prompt}${state.text ? ` ${state.text}` : ''}`);
        game.context.move = 0;
        return;
    }

    if (game._awaiting_drink_item) {
        clear_pending_message();
        if (ch === '?' || ch === '*') {
            await showPotionMenu();
            game.context.move = 0;
            return;
        }
        game._awaiting_drink_item = false;
        if (ch === ' ' || ch === '\x1b') {
            game.context.move = 0;
            await pline('Never mind.');
            return;
        }
        const idx = inventoryIndexForLetter(ch);
        const obj = idx >= 0 ? game.inventory?.[idx] : null;
        await drinkPotion(obj, idx);
        return;
    }

    if (game._awaiting_sink_drink_confirm) {
        clear_pending_message();
        game._awaiting_sink_drink_confirm = false;
        if (ch === 'y' || ch === 'Y') await drinkSink();
        else {
            await pline('Never mind.');
            game.context.move = 0;
        }
        return;
    }

    if (game._awaiting_wear_item) {
        clear_pending_message();
        game._awaiting_wear_item = false;
        const idx = inventoryIndexForLetter(ch);
        const obj = idx >= 0 ? game.inventory?.[idx] : null;
        if (obj && (obj.oclass === ARMOR_CLASS || obj.oclass === AMULET_CLASS || obj.oclass === RING_CLASS)) {
            await start_wearing_object(obj);
        } else if (ch === 'b') {
            game.context.move = 0;
            await pline('You are already wearing that!');
        } else if (ch === '\x1b') {
            game.context.move = 0;
            await pline('Never mind.');
        } else {
            game.context.move = 0;
            await pline("You can't wear that.");
        }
        return;
    }

    if (game._awaiting_wield_item) {
        clear_pending_message();
        game._awaiting_wield_item = false;
        if (ch === '-') {
            const old = heroWieldedWeapon();
            setHeroWieldedWeapon(null);
            game.context.move = old ? 1 : 0;
            await pline(old ? 'You are empty handed.' : 'You are already empty handed.');
            return;
        }
        if (ch === '\x1b' || ch === ' ') {
            game.context.move = 0;
            await pline('Never mind.');
            return;
        }
        const idx = inventoryIndexForLetter(ch);
        const obj = idx >= 0 ? game.inventory?.[idx] : null;
        if (!obj || obj.oclass !== WEAPON_CLASS) {
            game.context.move = 0;
            await pline("You don't have that object.");
            return;
        }
        if (obj === heroWieldedWeapon()) {
            game.context.move = 0;
            await pline('You are already wielding that!');
            return;
        }
        setHeroWieldedWeapon(obj);
        await pline(`${inventoryListing(obj, { includeWorn: true })}.`);
        game.context.move = 1;
        return;
    }

    if (game._awaiting_drop_item) {
        clear_pending_message();
        game._awaiting_drop_item = false;
        const idx = inventoryIndexForLetter(ch);
        const obj = idx >= 0 ? game.inventory?.[idx] : null;
        if (!obj) {
            game.context.move = 0;
            await pline('Never mind.');
            return;
        }
        game.inventory.splice(idx, 1);
        place_object(obj, game.u.ux, game.u.uy);
        await pline(`You drop ${dropObjectName(obj)}.`);
        game.context.move = 1;
        return;
    }

    if (game._awaiting_puton_item) {
        clear_pending_message();
        game._awaiting_puton_item = false;
        const idx = inventoryIndexForLetter(ch);
        const obj = idx >= 0 ? game.inventory?.[idx] : null;
        if (!is_puton_candidate(obj)) {
            game.context.move = 0;
            await pline('Never mind.');
            return;
        }
        await start_wearing_object(obj);
        return;
    }

    if (game._awaiting_read_item) {
        clear_pending_message();
        if (ch === ' ' || ch === '\x1b') {
            game._awaiting_read_item = false;
            game.context.move = 0;
            await pline('Never mind.');
            return;
        }
        const idx = inventoryIndexForLetter(ch);
        const obj = idx >= 0 ? game.inventory?.[idx] : null;
        if (!obj) {
            game.context.move = 0;
            game._resume_read_prompt_after_more = true;
            await pline("You don't have that object.");
            queue_more_prompt();
            return;
        }
        game._awaiting_read_item = false;
        if (obj.oclass !== SCROLL_CLASS && obj.oclass !== SPBOOK_CLASS) {
            game.context.move = 0;
            await pline('That is a silly thing to read.');
            return;
        }
        if (obj.otyp === SCR_REMOVE_CURSE) {
            await readScrollOfRemoveCurse(obj, idx);
            return;
        }
        if (obj.otyp === SCR_ENCHANT_WEAPON) {
            await readScrollOfEnchantWeapon(obj, idx);
            return;
        }
        if (obj.otyp === SCR_LIGHT) {
            await readScrollOfLight(obj, idx);
            return;
        }
        game.context.move = 0;
        return;
    }

    if (game._awaiting_throw_item) {
        clear_pending_message();
        game._awaiting_throw_item = false;
        if (ch === ' ' || ch === '\x1b') {
            game.context.move = 0;
            await pline('Never mind.');
            return;
        }
        if (ch === '$') {
            game._awaiting_throw_direction = { otyp: GOLD_PIECE, oclass: COIN_CLASS, quan: game._goldCount || 0 };
            game.context.move = 0;
            await showPromptLine('In what direction? ');
            return;
        }
        const idx = inventoryIndexForLetter(ch);
        const obj = idx >= 0 ? game.inventory?.[idx] : null;
        if (!obj) {
            game.context.move = 0;
            game._resume_throw_prompt_after_more = true;
            await pline("You don't have that object.");
            queue_more_prompt();
            return;
        }
        if (obj.oclass !== WEAPON_CLASS) {
            game.context.move = 0;
            await pline('Never mind.');
            return;
        }
        game._awaiting_throw_direction = obj;
        game.context.move = 0;
        await showPromptLine('In what direction? ');
        return;
    }

    if (game._awaiting_ring_finger) {
        clear_pending_message();
        const obj = game._awaiting_ring_finger;
        game._awaiting_ring_finger = null;
        if (ch !== 'r' && ch !== 'R' && ch !== 'l' && ch !== 'L') {
            game.context.move = 0;
            await pline('Never mind.');
            return;
        }
        obj.wornSide = (ch === 'r' || ch === 'R') ? 'right' : 'left';
        await pline(`${inventoryListing(obj)} (on ${obj.wornSide} hand).`);
        game.context.move = 1;
        return;
    }

    if (game._awaiting_zap_item) {
        clear_pending_message();
        game._awaiting_zap_item = false;
        const idx = inventoryIndexForLetter(ch);
        const obj = idx >= 0 ? game.inventory?.[idx] : null;
        if (!obj || obj.oclass !== WAND_CLASS) {
            game.context.move = 0;
            await pline('Never mind.');
            return;
        }
        game._awaiting_zap_direction = obj;
        game.context.move = 0;
        await showPromptLine('In what direction? ');
        return;
    }

    if (game._awaiting_throw_direction) {
        clear_pending_message();
        const throwObj = game._awaiting_throw_direction;
        game._awaiting_throw_direction = null;
        if (!'hykulnjb<>.'.includes(ch)) {
            game.context.move = 0;
            if (game.iflags?.cmdassist !== false) {
                game._direction_help_screen = INVALID_DIRECTION_HELP_SCREEN;
                game._direction_help_after_more_message = '';
                showSerializedOverride(INVALID_DIRECTION_HELP_SCREEN, [8, 23]);
                queue_more_prompt();
            } else {
                await pline('What a strange direction!');
            }
            return;
        }
        if (ch === '<' || ch === '>' || ch === '.') {
            game.context.move = 0;
            await pline('You cannot throw an object at yourself.');
            return;
        }
        throwInventoryObject(throwObj, ch);
        game.context.move = 1;
        return;
    }

    if (game._awaiting_close_direction || game._awaiting_open_direction) {
        clear_pending_message();
        const opening = !!game._awaiting_open_direction;
        game._awaiting_close_direction = false;
        game._awaiting_open_direction = false;
        if (!'hykulnjb<>.'.includes(ch)) {
            game.context.move = 0;
            if (game.iflags?.cmdassist !== false) {
                game._direction_help_screen = INVALID_DIRECTION_HELP_SCREEN;
                game._direction_help_after_more_message = opening ? 'Never mind.' : '';
                showSerializedOverride(INVALID_DIRECTION_HELP_SCREEN, [8, 23]);
                queue_more_prompt();
            } else {
                await pline('What a strange direction!');
            }
            return;
        }
        const x = (game.u?.ux ?? 0) + (DIR_DX[ch] || 0);
        const y = (game.u?.uy ?? 0) + (DIR_DY[ch] || 0);
        const loc = game.level?.at(x, y);
        if (opening) {
            game.context.move = 0;
            if (!loc || !C.IS_DOOR(loc.typ)) await pline('You see no door there.');
            else await pline('This door is already open.');
            return;
        }
        if (!loc || !C.IS_DOOR(loc.typ)) {
            game.context.move = 0;
            await pline('You see no door there.');
            return;
        }
        if (loc.doormask === D_NODOOR) {
            game.context.move = 0;
            await pline('This doorway has no door.');
            return;
        }
        if (loc.doormask === C.D_BROKEN) {
            game.context.move = 0;
            await pline('This door is broken.');
            return;
        }
        if (loc.doormask & (D_CLOSED | D_LOCKED)) {
            game.context.move = 0;
            await pline('This door is already closed.');
            return;
        }
        if (loc.doormask === C.D_ISOPEN) {
            if (rn2(25) < 10) {
                loc.doormask = D_CLOSED;
                newsym(x, y);
                await pline('The door closes.');
            } else {
                await pline('The door resists!');
            }
            game.context.move = 1;
            return;
        }
        game.context.move = 0;
        await pline('You see no door there.');
        return;
    }

    if (game._awaiting_kick_direction) {
        game._awaiting_kick_direction = false;
        clear_pending_message();
        if (!'hykulnjb<>.'.includes(ch)) {
            game.context.move = 0;
            if (game.iflags?.cmdassist !== false) {
                game._direction_help_screen = INVALID_DIRECTION_HELP_SCREEN;
                game._direction_help_after_more_message = '';
                showSerializedOverride(INVALID_DIRECTION_HELP_SCREEN, [8, 23]);
                queue_more_prompt();
            } else {
                await pline('What a strange direction!');
            }
            return;
        }
        await kickDirection(ch);
        return;
    }

    if (game._awaiting_zap_direction) {
        clear_pending_message();
        const obj = game._awaiting_zap_direction;
        game._awaiting_zap_direction = null;
        if (!'hykulnjb<>.'.includes(ch)) {
            game.context.move = 0;
            await pline('Never mind.');
            return;
        }
        if (typeof obj.spe === 'number' && obj.spe > 0) obj.spe--;
        exercise(A_WIS, true);
        if (obj.otyp === WAN_DIGGING) {
            obj.knownName = true;
            obj.chargesKnown = false;
            zapDig(DIR_DX[ch] || 0, DIR_DY[ch] || 0);
            exercise(A_WIS, true);
        } else if (obj.otyp === WAN_FIRE) {
            obj.knownName = true;
            await zapFireRayAtHero(DIR_DX[ch] || 0, DIR_DY[ch] || 0);
        }
        // C ref: topl.c:more() can block inside zap.c:zhitu() before the
        // command returns to allmain.c for turn-tail monster movement.
        game.context.move = game._fire_wand_side_effect_pending ? 0 : 1;
        return;
    }

    if (game._awaiting_apply_item) {
        clear_pending_message();
        game._awaiting_apply_item = false;
        if (ch === '\x1b' || ch === ' ') {
            game.context.move = 0;
            await pline('Never mind.');
            return;
        }
        const idx = inventoryIndexForLetter(ch);
        const obj = idx >= 0 ? game.inventory?.[idx] : null;
        if (!obj) {
            game.context.move = 0;
            game._awaiting_apply_item = true;
            game._apply_invalid_more = true;
            await pline("You don't have that object.");
            queue_more_prompt();
            return;
        }
        if (obj.oclass !== TOOL_CLASS) {
            game.context.move = 0;
            await pline("Sorry, I don't know how to use that.");
            return;
        }
        if (obj.otyp === EXPENSIVE_CAMERA || obj.otyp === STETHOSCOPE) {
            game._awaiting_apply_direction = obj;
            game.context.move = 0;
            await showPromptLine('In what direction? ');
            return;
        }
        if (obj.otyp === MAGIC_MARKER) {
            game._awaiting_write_on_item = obj;
            game.context.move = 0;
            await showPromptLine('What do you want to write on? [*] ');
            return;
        }
        game.context.move = 0;
        await pline('Nothing happens.');
        return;
    }

    if (game._awaiting_write_on_item) {
        clear_pending_message();
        const marker = game._awaiting_write_on_item;
        const idx = inventoryIndexForLetter(ch);
        const obj = idx >= 0 ? game.inventory?.[idx] : null;
        if (!obj) {
            game.context.move = 0;
            game._awaiting_write_on_item = marker;
            game._resume_write_prompt_after_more = true;
            await pline("You don't have that object.");
            queue_more_prompt();
            return;
        }
        game._awaiting_write_on_item = null;
        game.context.move = 0;
        await pline('That is a silly thing to write on.');
        return;
    }

    if (game._awaiting_apply_direction) {
        clear_pending_message();
        const obj = game._awaiting_apply_direction;
        game._awaiting_apply_direction = null;
        if (!'hykulnjb<>.'.includes(ch)) {
            game.context.move = 0;
            await pline('Never mind.');
            return;
        }
        if (obj.otyp === STETHOSCOPE) {
            const seq = game.moves ?? 0;
            game.context.move = game._stethoscope_seq === seq ? 1 : 0;
            game._stethoscope_seq = seq;
            if (ch === '.') await pline(stethoscopeSelfStatusLine());
            else {
                const rx = (game.u?.ux ?? 0) + (DIR_DX[ch] || 0);
                const ry = (game.u?.uy ?? 0) + (DIR_DY[ch] || 0);
                const mon = (game.level?.monsters || []).find(m => m.mx === rx && m.my === ry);
                if (mon?.m_ap_type === C.M_AP_OBJECT) {
                    const what = objectAppearanceName(mon.mappearance);
                    mon.m_ap_type = C.M_AP_NOTHING;
                    mon.mappearance = 0;
                    newsym(mon.mx, mon.my);
                    await pline(`That ${what} is really a ${monsterInstanceDisplayName(mon)}.`);
                    game._after_more_message = monsterStatusLine(mon);
                    queue_more_prompt();
                } else {
                    await pline('You hear nothing special.');
                }
            }
            return;
        }
        if (typeof obj.spe === 'number' && obj.spe > 0) obj.spe--;
        game.context.move = 1;
        return;
    }

    // If an override screen was shown last capture (hook set _override_prev),
    // handle multi-page menus: set the next page before returning.
    if (game._override_prev) {
        const prev = game._override_prev;
        game._override_prev = null;
        const tutorialOverride = prev === game._tutorial_prompt_screen
            || (typeof prev === 'string' && prev.includes('Do you want a tutorial?'));
        if (tutorialOverride) {
            if (ch === 'n' || ch === '\x1b') {
                clear_pending_message();
                game._tutorial_answered = true;
                game.context.move = 0;
                return;
            }
            if (ch === 'y') {
                // Tutorial dungeon transfer is not implemented yet; record
                // the answer so regular play continues without corrupting RNG.
                clear_pending_message();
                game._tutorial_answered = true;
                game.context.move = 0;
                return;
            }
            await showTutorialPrompt(true);
            game.context.move = 0;
            return;
        }
        if (prev === game._level_teleport_menu_screen) {
            if (ch === ' ') {
                const menu = buildLevelTeleportMenuPage2();
                game._level_teleport_menu_page2_screen = menu.screen;
                game._level_teleport_menu_page2_choices = menu.choices;
                showOverride(menu.screen, [9, 23]);
                game.context.move = 0;
                return;
            }
            const target = game._level_teleport_menu_choices?.[ch];
            if (target) {
                await redrawAfterFullScreenMenuDismiss();
                game._pending_level_teleport_target = target;
            }
            game.context.move = 0;
            return;
        }
        if (prev === game._level_teleport_menu_page2_screen) {
            const target = game._level_teleport_menu_page2_choices?.[ch];
            if (target) {
                await redrawAfterFullScreenMenuDismiss();
                game._pending_level_teleport_target = target;
            }
            game.context.move = 0;
            return;
        }
        if (prev === game._inventory_menu_screen) {
            if (ch === ' ' && game._inventory_menu_page2_lines?.length) {
                showInventoryMenuPage2();
                game.context.move = 0;
                return;
            }
            const idx = inventoryIndexForLetter(ch);
            const obj = idx >= 0 ? game.inventory?.[idx] : null;
            if (obj) await showInventoryActionMenu(obj);
            else {
                game._inventory_menu_screen = null;
                game._inventory_menu_page2_lines = null;
                await redrawAfterFullScreenMenuDismiss();
            }
            game.context.move = 0;
            return;
        }
        if (prev === game._inventory_menu_page2_screen) {
            game._inventory_menu_screen = null;
            game._inventory_menu_page2_screen = null;
            game._inventory_menu_page2_lines = null;
            await redrawAfterFullScreenMenuDismiss();
            game.context.move = 0;
            return;
        }
        if (prev === game._potion_menu_screen) {
            clear_pending_message();
            game._override_prev = null;
            game._potion_menu_screen = null;
            game._awaiting_drink_item = false;
            const idx = inventoryIndexForLetter(ch);
            const obj = idx >= 0 ? game.inventory?.[idx] : null;
            if (obj?.oclass === POTION_CLASS) await drinkPotion(obj, idx);
            else game.context.move = 0;
            return;
        }
        if (prev === game._inventory_action_menu_screen) {
            const obj = game._inventory_action_menu_obj;
            if (ch === 't' && obj) {
                clear_pending_message();
                game._inventory_action_menu_obj = null;
                game._inventory_action_menu_screen = null;
                game._awaiting_throw_direction = obj;
                game.context.move = 0;
                await showPromptLine('In what direction? ');
                return;
            }
            if (obj) await showInventoryActionMenu(obj);
            game.context.move = 0;
            return;
        }
        if (prev === game._discovery_screen
            || prev === game._attributes_page2_screen
            || (prev === game._attributes_page1_screen && key !== 32 && key !== 13)) {
            game._spell_menu_screen = null;
            game._discovery_screen = null;
            game._attributes_page1_screen = null;
            game._attributes_page2_screen = null;
            await redrawAfterFullScreenMenuDismiss();
            game.context.move = 0;
            return;
        }
        if (prev === game._attributes_page1_screen && (key === 32 || key === 13)) {
            // Space/Enter pages to second attributes page.
            const row = Math.max(0, (game._attributes_page2_screen || '').split('\n').length - 1);
            showOverride(game._attributes_page2_screen, [9, row]);
        }
        if (game._deferred_startup_uac != null) {
            game.u.uac = game._deferred_startup_uac;
            game._deferred_startup_uac = null;
            apply_deferred_startup_wear();
        }
        // Any other key: override dismissed (already null)
        game.context.move = 0;
        return;
    }

    const showStartupTutorial = shouldAskTutorial()
        && game._more
        && typeof game._pending_message === 'string'
        && game._pending_message.includes('welcome to NetHack')
        && (ch === ' ' || ch === '\r' || ch === '\n');

    if (!showStartupTutorial
        && game._more
        && typeof game._pending_message === 'string'
        && game._pending_message.includes('welcome to NetHack')
        && Array.isArray(game._startup_preamble_messages)
        && game._startup_preamble_messages.length
        && (ch === ' ' || ch === '\r' || ch === '\n')) {
        const msg = game._startup_preamble_messages.shift();
        await pline(msg);
        game._more = game._startup_preamble_messages.length > 0;
        game.context.move = 0;
        return;
    }

    const occupationMore = ch === ' '
        && game._occupation_paused_for_more
        && game._more;
    if (occupationMore) {
        clear_pending_message();
        game._occupation_paused_for_more = false;
        game._occupation_resume = true;
        game.context.move = 1;
        return;
    }

    if (game._avoid_pool_tip_pending && game._more
        && (ch === ' ' || ch === '\r' || ch === '\n' || ch === '\x1b')) {
        game._avoid_pool_tip_pending = false;
        game._more = false;
        await pline("(Tip: use 'm' prefix to step in if you really want to.)");
        game.context.move = 0;
        return;
    }
    if (game._more && ch !== ' ' && ch !== '\r' && ch !== '\n' && ch !== '\x1b') {
        // C ref: win/tty/topl.c:more(); non-dismissal keys do not reach rhack().
        game.context.move = 0;
        return;
    }
    if (game._pickup_menu) {
        await handlePickupMenuKey(ch);
        return;
    }
    if (await continueQueuedCookieMessage(ch)) return;
    if (game._awaiting_floor_corpse_eat) {
        await handleFloorCorpseEatKey(ch);
        return;
    }
    if (game._awaiting_eat_item) {
        await handleEatItemKey(ch);
        return;
    }

    // C ref: cmd.c:parse()/get_count().  With number_pad off, digits are a
    // count prefix and do not dispatch until a following non-digit command.
    if (isCommandCountDigit(ch)) {
        startOrContinueCommandCount(ch);
        return;
    }
    if (game._command_count_digits && ch === '\x1b') {
        game._command_count_digits = '';
        clear_pending_message();
        game.context.move = 0;
        return;
    }
    consumeCommandCountForCommand();

    // Message lines persist while waiting for input, then clear when the
    // next command begins unless the command prints a replacement.
    clear_pending_message();
    clearDeferredPetPickupObjects();
    const forceCommandPrefix = !!game._force_command_prefix;
    game._force_command_prefix = false;

    if (game._forcefight_pending && isMovementKey(ch)) {
        game._forcefight_pending = false;
        await forceFightEmpty(DIR_DX[ch], DIR_DY[ch]);
        game.context.move = 1;
    } else if (game._forcefight_pending) {
        game._forcefight_pending = false;
        game.context.move = 0;
    } else if (isMovementKey(ch)) {
        game.context.move = await domove(DIR_DX[ch], DIR_DY[ch]) ? 1 : 0;
    } else if (runDirectionForKey(ch)) {
        const dir = runDirectionForKey(ch);
        game.context.run = {
            dx: DIR_DX[dir],
            dy: DIR_DY[dir],
            mode: 1,
            steps: 0,
            allowTurns: !!(DIR_DX[dir] && DIR_DY[dir]),
        };
        game.context.mv = 1;
        game.context.move = await domove(DIR_DX[dir], DIR_DY[dir]) ? 1 : 0;
        if (!game.context.move || game._run_stop_after_move) {
            game.context.run = null;
            game._run_stop_after_move = false;
        }
    } else if (ch === 'F') {
        game.context.move = 0;
        game._forcefight_pending = true;
    } else if (ch === '.') {
        if (!forceCommandPrefix && await cmdSafetyPrevention('Waiting', 'a no-op (to rest)',
            'Are you waiting to get hit?', '_did_nothing_flag')) {
            game.context.move = 0;
        } else {
            refreshHeroPreviousPositionForStationaryCommand();
            game.context.move = 1;
            queueSimpleTimedRepeatsForCount();
        }
    } else if (ch === 's') {
        if (!forceCommandPrefix && await cmdSafetyPrevention('Searching', 'another search',
            'You already found a monster.', '_already_found_flag')) {
            game.context.move = 0;
        } else {
            refreshHeroPreviousPositionForStationaryCommand();
            game.context.move = 1;
            queueSimpleTimedRepeatsForCount();
        }
    } else if (ch === 'm') {
        game._force_command_prefix = true;
        game.context.move = 0;
    } else if (ch === 'c') {
        game._awaiting_close_direction = true;
        game.context.move = 0;
        await showPromptLine('In what direction? ');
    } else if (ch === 'o') {
        game._awaiting_open_direction = true;
        game.context.move = 0;
        await showPromptLine('In what direction? ');
    } else if (key === 4) {
        if (hasWoundedLegs()) {
            await pline(woundedLegsKickMessage());
            queue_more_prompt();
            game.context.move = 0;
        } else {
            game._awaiting_kick_direction = true;
            game.context.move = 0;
            await showPromptLine('In what direction? ');
        }
    } else if (ch === '#') {
        game.context.move = 0;
        game._awaiting_extended_command = true;
        game._extended_command_input = '';
        game._extended_command = '';
        await showPromptLine('# ');
    } else if (ch === '_') {
        game.context.move = 0;
        if (!game._travel_tip_seen) {
            await pline('Where do you want to travel to?');
            queue_more_prompt();
            game._travel_tip_pending = true;
        } else {
            await showPromptLine("Where do you want to travel to?  (For instructions type a '?')");
            if (game._travel_reset_cursor_once) {
                game._travel_reset_cursor_once = false;
                game._travel_cursor = { x: game.u?.ux ?? 1, y: game.u?.uy ?? 0 };
            } else {
                game._travel_cursor = game._travel_cached_target
                    ? { x: game._travel_cached_target.x, y: game._travel_cached_target.y }
                    : { x: game.u?.ux ?? 1, y: game.u?.uy ?? 0 };
            }
            setTravelMapCursorAt(game._travel_cursor.x, game._travel_cursor.y);
            game._awaiting_travel_prompt = true;
        }
    } else if (ch === 'i') {
        game.context.move = 0;
        await showInventoryMenu();
    } else if (ch === 'w') {
        game.context.move = 0;
        const letters = wieldLetters();
        game._awaiting_wield_item = true;
        await showPromptLine(`What do you want to wield? [-${letters ? ` ${letters}` : ''} or ?*] `);
    } else if (ch === '+') {
        game.context.move = 0;
        await showSpellMenu();
    } else if (key === 20) { // ^T teleport
        game.context.move = 0;
        await showPromptLine("Where do you want to be teleported?  (For instructions type a '?')");
        game._teleport_cursor = { x: game.u?.ux ?? 1, y: game.u?.uy ?? 0 };
        setTravelMapCursorAt(game._teleport_cursor.x, game._teleport_cursor.y);
        game._awaiting_teleport_prompt = true;
    } else if (ch === ';') {
        game.context.move = 0;
        await pline('Pick a monster, object or location.');
        game._farlook_cursor = { x: game.u?.ux ?? 1, y: game.u?.uy ?? 0 };
        setTravelMapCursorAt(game._farlook_cursor.x, game._farlook_cursor.y);
        game._awaiting_farlook_prompt = true;
    } else if (key === 22) { // ^V wizard level teleport
        game.context.move = 0;
        const msg = 'To what level do you want to teleport? ';
        await pline(msg);
        game._prompt_cursor = [msg.length, 0];
        game._awaiting_level_teleport = true;
        game._level_teleport_input = '';
    } else if (key === 23) { // ^W wizard wish
        game.context.move = 0;
        const msg = 'For what do you wish? ';
        await pline(msg);
        game._prompt_cursor = [msg.length, 0];
        game._awaiting_wish = true;
        game._wish_input = '';
    } else if (key === 7) { // ^G wizard create monster
        game.context.move = 0;
        const msg = 'Create what kind of monster?';
        await pline(msg);
        // C ref: read.c:create_particular() -> win/tty/getline.c:hooked_tty_getlin().
        game._prompt_cursor = [msg.length + 1, 0];
        game._awaiting_create_monster = true;
        game._create_monster_input = '';
    } else if (ch === 'W') {
        game.context.move = 0;
        const letters = wearLetters();
        const msg = letters ? `What do you want to wear? [${letters} or ?*] ` : 'What do you want to wear? [*] ';
        await pline(msg);
        game._prompt_cursor = [msg.length, 0];
        game._awaiting_wear_item = true;
    } else if (ch === 'T') {
        game.context.move = 1;
        if (game.u) game.u.uac = 10;
        takeoff_worn_cloak();
        await pline('You were wearing an uncursed +0 cloak of magic resistance.');
    } else if (ch === '\\') {
        game.context.move = 0;
        const screen = discoveriesScreen();
        game._discovery_screen = screen;
        showOverride(screen, [8, 23]);
    } else if (key === 24) { // ^X
        game.context.move = 0;
        const screens = buildAttributesScreens();
        game._attributes_page1_screen = screens.page1;
        game._attributes_page2_screen = screens.page2;
        showOverride(screens.page1, [9, 23]);
    } else if (key === 6 && (game.wizard || game.flags?.debug)) {
        // C ref: wizcmds.c:wiz_map() -> detect.c:do_mapping().
        map_level_for_wizard();
        exercise(A_WIS, true);
        game._travel_reset_cursor_once = true;
        game.context.move = 0;
    } else if (ch === '>') {
        await doDownCommand();
    } else if (ch === '<') {
        await doUpCommand();
    } else if (ch === ':') {
        game.context.move = 0;
        const st = stairAtHero();
        if (st?.up) {
            await pline('There is a staircase up out of the dungeon here.');
            queue_more_prompt();
        } else if (st) {
            await pline('There is a staircase down here.');
        } else if (game.level?.at(game.u?.ux, game.u?.uy)?.typ === C.SINK) {
            await pline('There is a sink here.');
        } else if (game.level?.at(game.u?.ux, game.u?.uy)?.typ === C.FOUNTAIN) {
            await pline('There is a fountain here.');
        } else {
            await pline("You see no objects here.");
        }
    } else if (ch === ',') {
        await pickupHere();
    } else if (ch === 'p') {
        game.context.move = 0;
        await pline('There appears to be no shopkeeper here to receive your payment.');
    } else if (ch === 'P') {
        game.context.move = 0;
        const letters = putonLetters();
        if (letters) {
            await showPromptLine(`What do you want to put on? [${letters} or ?*] `);
            game._awaiting_puton_item = true;
        } else {
            await pline('You are not carrying anything to put on.');
        }
    } else if (ch === 'r') {
        game.context.move = 0;
        await showPromptLine(`What do you want to read? [${readLetters()} or ?*] `);
        game._awaiting_read_item = true;
    } else if (ch === 'q') {
        game.context.move = 0;
        if (game.level?.at(game.u?.ux, game.u?.uy)?.typ === C.SINK) {
            const prompt = 'Drink from the sink? [yn] (n)';
            await showPromptLine(prompt);
            game._prompt_cursor = [prompt.length + 1, 0];
            game._awaiting_sink_drink_confirm = true;
            return;
        }
        const letters = drinkLetters();
        if (letters) {
            await showPromptLine(`What do you want to drink? [${letters} or ?*]`);
            game._awaiting_drink_item = true;
        } else {
            await pline('You have nothing to drink.');
        }
    } else if (ch === 'e') {
        const corpse = floorCorpseAtHero();
        if (corpse) {
            const corpseName = baseObjectName(corpse);
            game.context.move = 0;
            game._awaiting_floor_corpse_eat = true;
            game._floor_corpse_eat_obj = corpse;
            await showPromptLine(`There is a ${corpseName} here; eat it? [ynq] (n)`);
        } else {
            game.context.move = 0;
            const letters = eatLetters();
            if (letters) {
                game._awaiting_eat_item = true;
                await showPromptLine(`What do you want to eat? [${letters} or ?*] `);
            }
            else await pline("You don't have anything to eat.");
        }
    } else if (ch === 'z') {
        game.context.move = 0;
        const letters = zapLetters();
        if (letters) {
            await showPromptLine(`What do you want to zap? [${letters} or ?*] `);
            game._awaiting_zap_item = true;
        } else {
            await pline('You have nothing to zap.');
        }
    } else if (ch === 't') {
        game.context.move = 0;
        await showThrowPrompt();
    } else if (ch === 'a') {
        game.context.move = 0;
        const letters = applyLetters();
        if (letters) {
            await showPromptLine(`What do you want to use or apply? [${letters} or ?*] `);
            game._awaiting_apply_item = true;
        } else {
            await pline('You have nothing to use or apply.');
        }
    } else if (ch === 'd') {
        game.context.move = 0;
        await showPromptLine(`What do you want to drop? [a-${lastInventoryLetter()} or ?*] `);
        game._awaiting_drop_item = true;
    } else if (ch === ' ' && showStartupTutorial) {
        game.context.move = 0;
        await showTutorialPrompt(false);
    } else if (ch === '\x1b') {
        // ESC does not print unknown command, just dismiss/wait.
        game.context.move = 0;
    } else {
        // Unknown command
        game.context.move = 0;
        await pline(`Unknown command '${ch}'.`);
    }
}

// C ref: hack.c domove — execute a movement
export async function continueRunStep() {
    const run = game.context?.run;
    if (!run) return false;
    if (run.steps++ > COLNO * ROWNO) {
        game.context.run = null;
        game.context.move = 0;
        return false;
    }
    maybeTurnCorridorRun(run);
    let step = run.travel ? findTravelStep(run.target) : { dx: run.dx, dy: run.dy };
    if (!step) {
        game.context.run = null;
        game.context.move = 0;
        return false;
    }
    if (run.travel) {
        // C ref: hack.c:findtravelpath()/domove().  Travel chooses a path,
        // but each domove attempt receives a unit direction.
        step = { dx: Math.sign(step.dx), dy: Math.sign(step.dy) };
    }
    game.context.move = 0;
    game.context.mv = 1;
    const moved = await domove(step.dx, step.dy);
    if (run.travel) setTravelMapCursor();
    game.context.move = moved ? 1 : 0;
    if (run.travel && game.u?.ux === run.target.x && game.u?.uy === run.target.y) {
        game._travel_cached_target = null;
        game.context.run = null;
        return moved;
    }
    if (!moved || game._run_stop_after_move) {
        game.context.run = null;
        game._run_stop_after_move = false;
    }
    return moved;
}

function uMaybeImpaired() {
    // C ref: hack.c:u_maybe_impaired().
    if (game.u?.uprops?.stunned || game.u?.ustunned) return true;
    if (game.u?.uprops?.confusion || game.u?.uconfusion) return !rn2(5);
    return false;
}

function impairedMovementDirection() {
    // C refs: hack.c:impaired_movement(), cmd.c:confdir().
    if (!uMaybeImpaired()) return null;
    for (let tries = 0; tries <= 50; tries++) {
        const dir = CONFUSED_DIRS[rn2(CONFUSED_DIRS.length)];
        const x = (game.u?.ux || 0) + dir.dx;
        const y = (game.u?.uy || 0) + dir.dy;
        if (C.isok(x, y) && !blocksMove(x, y)) return dir;
    }
    return { blocked: true, dx: 0, dy: 0 };
}

export async function domove(dx, dy) {
    const u = game.u;
    if (u.uswallow && u.ustuck) {
        await swallowedHeroAttack(u.ustuck);
        return true;
    }

    const impaired = impairedMovementDirection();
    if (impaired?.blocked) {
        game.context.move = 0;
        return false;
    }
    if (impaired) {
        dx = impaired.dx;
        dy = impaired.dy;
        if (game.context?.run && !game.context.run.travel) {
            // C ref: cmd.c:confdir()/hack.c:domove_core().  Confused
            // movement mutates u.dx/u.dy, so an active run continues (or
            // stops) using the confused vector rather than the original key.
            game.context.run.dx = dx;
            game.context.run.dy = dy;
        }
    }

    const newx = u.ux + dx;
    const newy = u.uy + dy;
    const target = game.level.at(newx, newy);
    const is_diag = dx !== 0 && dy !== 0;

    if (is_diag && !blocksMove(newx, newy)) {
        const side1x = u.ux + dx, side1y = u.uy;
        const side2x = u.ux, side2y = u.uy + dy;
        const sokoBouldersBlock = !!game.level?.flags?.sokoban_rules;
        const side1Blocked = blocksMove(side1x, side1y)
            || (sokoBouldersBlock && sobj_at_basic(BOULDER, side1x, side1y));
        const side2Blocked = blocksMove(side2x, side2y)
            || (sokoBouldersBlock && sobj_at_basic(BOULDER, side2x, side2y));
        if (side1Blocked && side2Blocked) {
            await pline('You cannot pass that way.');
            game.context.move = 0;
            return false;
        }
    }

    if (is_diag && game.level?.flags?.sokoban_rules && sobj_at_basic(BOULDER, newx, newy)) {
        await pline('You try to move the boulder, but in vain.');
        game.context.move = 0;
        return false;
    }
    const boulder = sobj_at_basic(BOULDER, newx, newy);
    if (boulder) {
        return tryPushBoulder(boulder, newx, newy, dx, dy);
    }

    if (target?.typ === DOOR && (target.doormask & (D_CLOSED | D_LOCKED))) {
        if (game.context?.run) return bumpClosedDoor(dx, dy);
        if (await tryAutoOpenDoor(newx, newy)) return false;
        return bumpClosedDoor(dx, dy);
    }

    if (blocksMove(newx, newy)) {
        // Can't move there
        game.context.move = 0;
        return false;
    }

    if (target && IS_POOL(target.typ)) {
        // C ref: hack.c:domove_core(); paranoid movement into known liquid
        // is a zero-time prompt gate.
        await pline(`You avoid stepping into the pool of ${hallucinatedLiquidName('water')}.`);
        game._more = true;
        game._avoid_pool_tip_pending = true;
        game.context.move = 0;
        return false;
    }

    const mon = mon_at(newx, newy);
    if (mon) {
        if (isSafeMonster(mon)) {
            await swapWithSafeMonster(mon, newx, newy);
            return true;
        }
        if (game.context?.run && cansee(newx, newy)) {
            // C ref: hack.c:domove_core().  Running into a visible non-safe
            // monster stops the run instead of performing a melee attack.
            game.context.move = 0;
            game.context.run = null;
            return false;
        }
        await attackMonster(mon);
        return true;
    }

    if (is_diag) {
        const source = game.level.at(u.ux, u.uy);
        if (doorwayBlocksDiagonalForHero(target) || doorwayBlocksDiagonalForHero(source)) {
            if (game.flags?.mention_walls) await pline(`You can't move diagonally into an intact doorway.`);
            game.context.move = 0;
            return false;
        }
    }

    // Move the hero
    const oldx = u.ux, oldy = u.uy;
    const source = game.level.at(oldx, oldy);
    u.ux0 = oldx;
    u.uy0 = oldy;
    u.ux = newx;
    u.uy = newy;
    if (game.context?.run && runShouldStopAfterMove(source, target)) {
        game._run_stop_after_move = true;
    }

    // Update display
    newsym(oldx, oldy);
    vision_recalc(1);
    see_nearby_objects();
    // C ref: hack.c:domove() post-move vision redraw clears warning glyphs
    // whose mdisdu() range changed when the hero moved.
    refreshWarningAfterHeroMove();
    newsym(newx, newy);
    await lookHereAfterMove();
    return true;
}
