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
    see_monsters, see_objects, see_traps,
} from './display.js';
import { cansee, vision_recalc, vision_reset } from './vision.js';
import { makemon, mklev, mksobj, monster_by_user_name, next_ident, place_lregion, place_object } from './mklev.js';
import { OBJECT_DELAY } from './object_data.js';
import { finish_pet_kill, pet_arrive_with_you } from './dog.js';
import { merge_inventory_object, pluslvl } from './u_init.js';
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

// Direction deltas: y u k
//                   h . l
//                   b j n
const DIR_DX = { h: -1, l: 1, j: 0, k: 0, y: -1, u: 1, b: -1, n: 1 };
const DIR_DY = { h: 0, l: 0, j: 1, k: -1, y: -1, u: -1, b: 1, n: 1 };
const RUN_KEY = { H: 'h', L: 'l', J: 'j', K: 'k', Y: 'y', U: 'u', B: 'b', N: 'n' };

const AMULET_OF_LIFE_SAVING = 202;
const GRAY_DRAGON_SCALE_MAIL = 101;
const WAN_FIRE = 430;
const WAN_COLD = 431;
const WAN_DEATH = 433;
const WAN_LIGHTNING = 434;
const WAN_MAKE_INVISIBLE = 418;
const WAN_DIGGING = 428;
const WAN_MAGIC_MISSILE = 429;
const QUARTERSTAFF = 79;
const CLOAK_OF_MAGIC_RESISTANCE = 139;
const SPEED_BOOTS = 166;
const LEVITATION_BOOTS = 172;
const RIN_TELEPORT_CONTROL = 195;
const RIN_INCREASE_ACCURACY = 176;
const RIN_STEALTH = 181;
const EXPENSIVE_CAMERA = 229;
const MIRROR = 230;
const STETHOSCOPE = 237;
const MAGIC_MARKER = 242;
const CHEST = 215;
const GOLD_PIECE = 438;
const SCALPEL = 39;
const DART = 23;
const CORPSE = 265;
const BOULDER = 475;
const FORTUNE_COOKIE = 289;
const LEATHER_GLOVES = 159;
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
const FIRST_SPELL = 366;
const LAST_SPELL = 407;
const SPE_NOVEL = 408;
const SPE_BOOK_OF_THE_DEAD = 409;
const LEVELCHANGE_MORE_LEN = '--More--'.length;

const OBJECT_BASE_NAMES = new Map([
    [DART, 'dart'],
    [SCALPEL, 'scalpel'],
    [QUARTERSTAFF, 'quarterstaff'],
    [GRAY_DRAGON_SCALE_MAIL, 'gray dragon scale mail'],
    [CLOAK_OF_MAGIC_RESISTANCE, 'cloak of magic resistance'],
    [SPEED_BOOTS, 'speed boots'],
    [LEATHER_GLOVES, 'leather gloves'],
    [AMULET_OF_LIFE_SAVING, 'amulet of life saving'],
    [178, 'ring of protection'],
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
    [306, 'potion of see invisible'],
    [307, 'potion of healing'],
    [308, 'potion of extra healing'],
    [309, 'potion of gain level'],
    [317, 'potion of booze'],
    [323, 'scroll of enchant armor'],
    [325, 'scroll of confuse monster'],
    [328, 'scroll of enchant weapon'],
    [332, 'scroll of light'],
    [335, 'scroll of food detection'],
    [336, 'scroll of identify'],
    [374, 'spellbook of healing'],
    [380, 'spellbook of slow monster'],
    [383, 'spellbook of force bolt'],
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
    [461, 'white gem'],
]);

const SPELLBOOK_SPELL_INFO = new Map([
    [380, { name: 'slow monster', level: 2, category: 'enchantment', fail: '0%' }],
    [383, { name: 'force bolt', level: 1, category: 'attack', fail: '0%' }],
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

function eatLetters() {
    ensureInventoryLetters();
    return (game.inventory || [])
        .filter((obj) => obj?.oclass === FOOD_CLASS)
        .map((obj) => obj.invlet)
        .join('');
}

function drinkLetters() {
    ensureInventoryLetters();
    return compressLetters((game.inventory || [])
        .filter((obj) => obj?.oclass === POTION_CLASS)
        .map((obj) => obj.invlet));
}

function throwLetters() {
    ensureInventoryLetters();
    const letters = [];
    if ((game._goldCount || 0) > 0) letters.push('$');
    for (const obj of game.inventory || []) {
        if (obj?.oclass === WEAPON_CLASS) letters.push(obj.invlet);
    }
    return letters.join('');
}

function stairAtHero() {
    for (let st = game.stairs; st; st = st.next) {
        if (st.sx === game.u?.ux && st.sy === game.u?.uy) return st;
    }
    return null;
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
        if (obj.corpsenm === 21) return 'gnome corpse';
        return 'corpse';
    }
    if ((obj?.knownName || knownObjectType(obj?.otyp)) && OBJECT_BASE_NAMES.has(obj.otyp)) return OBJECT_BASE_NAMES.get(obj.otyp);
    const appearanceName = unknownAppearanceName(obj);
    if (appearanceName) return appearanceName;
    if (OBJECT_BASE_NAMES.has(obj?.otyp)) return OBJECT_BASE_NAMES.get(obj.otyp);
    if (obj?.oclass === RING_CLASS) return 'ring';
    if (obj?.oclass === WAND_CLASS) return 'wand';
    return 'object';
}

function shouldShowBuc(obj) {
    if (!obj) return false;
    if (unknownAppearanceName(obj)) return false;
    if (!obj.bknown) return false;
    return obj.oclass === WEAPON_CLASS
        || obj.oclass === ARMOR_CLASS
        || obj.oclass === RING_CLASS
        || obj.oclass === POTION_CLASS
        || obj.oclass === SCROLL_CLASS
        || obj.oclass === SPBOOK_CLASS
        || obj.oclass === FOOD_CLASS;
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
    if (obj.oclass === ARMOR_CLASS || obj.oclass === WEAPON_CLASS || obj.otyp === RIN_INCREASE_ACCURACY) {
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
    if (obj?.wielded || ((obj?.owornmask || 0) & C.W_WEP)) return ' (weapon in hands)';
    if (obj?.worn || obj?.owornmask) return ' (being worn)';
    return '';
}

function inventoryObjectName(obj, opts = {}) {
    if (obj?.menuName) return obj.menuName;
    const quan = obj?.quan || 1;
    const rawBase = baseObjectName(obj);
    const pairObject = /\b(?:boots|gloves)$/.test(rawBase);
    const base = quan > 1
        ? (pairObject ? `pairs of ${rawBase}` : pluralizeObjectName(rawBase))
        : (pairObject ? `pair of ${rawBase}` : rawBase);
    const parts = [bucPrefix(obj), enchantmentPrefix(obj), base].filter(Boolean);
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
            .map((obj) => ({ cls: obj.oclass, line: inventoryListing(obj, { includeWorn: true }) }));
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
        for (const entry of groupEntries) lines.push({ text: entry.line, heading: false });
    }
    lines.push({ text: '(end)', heading: false });
    return lines;
}

function knownSpellEntries() {
    ensureInventoryLetters();
    const entries = [];
    for (const obj of game.inventory || []) {
        const info = SPELLBOOK_SPELL_INFO.get(obj?.otyp);
        if (!info) continue;
        if (entries.some((entry) => entry.name === info.name)) continue;
        entries.push({ letter: String.fromCharCode(97 + entries.length), ...info });
    }
    return entries;
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
    case CLOAK_OF_MAGIC_RESISTANCE:
        return 1;
    default:
        if (obj?.otyp >= SPEED_BOOTS && obj.otyp <= LEVITATION_BOOTS) return 1;
        return 0;
    }
}

function armor_bonus(obj) {
    if (!obj?.worn && !obj?.owornmask) return 0;
    return armor_base_bonus(obj) + (obj.spe || 0);
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
    const delay = OBJECT_DELAY[obj.otyp] || 0;
    if (obj.oclass === ARMOR_CLASS && delay > 1) {
        game._occupation_turns_remaining = Math.max(0, delay - 1);
        game._occupation_finish_message = armor_finish_message(obj);
        game._occupation_finish_uac = calculated_armor_class();
        game._occupation_finish_object = obj;
        await pline(`You start putting on ${inventoryObjectName(obj)}.`);
    } else {
        if (obj.oclass === ARMOR_CLASS) game.u.uac = calculated_armor_class();
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
        .filter(o => o.ox === u.ux && o.oy === u.uy && o.otyp !== GOLD_PIECE);
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

function extractFloorObject(obj) {
    const idx = game.level?.objects?.indexOf(obj) ?? -1;
    if (idx >= 0) game.level.objects.splice(idx, 1);
    if (typeof obj?.ox === 'number' && typeof obj?.oy === 'number') newsym(obj.ox, obj.oy);
    obj.ox = 0;
    obj.oy = 0;
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
    const cwt = obj?.corpse_cwt || (obj?.corpsenm === 21 ? 650 : 0);
    return 3 + (cwt >> 6);
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
    game._drink_call_after_more = appearance;
    await pline('This tastes like slime mold juice.');
    queue_more_prompt();
    game.context.move = 0;
}

async function handleFloorCorpseEatKey(ch) {
    const obj = game._floor_corpse_eat_obj;
    game._awaiting_floor_corpse_eat = false;
    game._floor_corpse_eat_obj = null;
    game._prompt_cursor = null;
    if (ch !== 'y') {
        game.context.move = 0;
        await pline('Never mind.');
        return true;
    }
    rn2(20);
    rn2(5);
    const damage = rnd(8);
    if (typeof game.u?.uhp === 'number') game.u.uhp = Math.max(0, game.u.uhp - damage);
    if (obj) game._pending_eaten_corpse_remove = obj;
    game._occupation_turns_remaining = corpseEatingReqtime(obj);
    game._occupation_finish_message = 'You finish eating the gnome corpse.';
    game._occupation_pack_finish_message = true;
    game._occupation_finish_removes_eaten_corpse = true;
    await pline('You feel sick.');
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
    extractFloorObject(obj);
    const merged = merge_inventory_object(obj);
    const carried = merged || obj;
    if (!merged) {
        assignInventoryLetter(obj);
        game.inventory.push(obj);
    }
    await pline(`${carried.invlet} - ${inventoryObjectName(carried)}.`);
}

function isMovementKey(ch) {
    return 'hjklyubn'.includes(ch);
}

function runDirectionForKey(ch) {
    return RUN_KEY[ch] || null;
}

const EXTENDED_AUTOCOMPLETE = [
    { name: 'levelchange', min: 2 },
    { name: 'pray', min: 2 },
    { name: 'wizintrinsic', min: 4 },
];

function completeExtendedCommand(input) {
    const typed = String(input || '').toLowerCase();
    if (!typed) return '';
    const exact = EXTENDED_AUTOCOMPLETE.find((cmd) => cmd.name === typed);
    if (exact) return exact.name;
    const matches = EXTENDED_AUTOCOMPLETE
        .filter((cmd) => typed.length >= cmd.min && cmd.name.startsWith(typed));
    return matches.length === 1 ? matches[0].name : typed;
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

async function tryPushBoulder(boulder, sx, sy, dx, dy) {
    const rx = sx + dx;
    const ry = sy + dy;
    if (boulderDestinationBlocked(rx, ry)) {
        await pline('You try to move the boulder, but in vain.');
        game.context.move = 0;
        return false;
    }

    await pline('With great effort you move the boulder.');
    exercise(A_STR, true);
    boulder.ox = rx;
    boulder.oy = ry;
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
    'grid bug',
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

function heroMeleeSmallDamageDie() {
    const weapon = heroWieldedWeapon();
    return WEAPON_SMALL_DAMAGE_DIE.get(weapon?.otyp) || 6;
}

function doorwayBlocksDiagonalForHero(loc) {
    return loc && loc.typ === DOOR && (loc.doormask & ~C.D_BROKEN);
}

function currentAttr(index) {
    return game.u?.acurr?.a?.[index] ?? 10;
}

async function tryAutoOpenDoor(x, y) {
    const loc = game.level?.at(x, y);
    if (!loc || loc.typ !== DOOR || !(loc.doormask & D_CLOSED) || (loc.doormask & D_LOCKED)) return false;
    const threshold = Math.trunc((currentAttr(A_STR) + currentAttr(A_DEX) + currentAttr(A_CON)) / 3);
    if (rnl(20) < threshold) {
        loc.doormask = C.D_ISOPEN;
        loc.flags = C.D_ISOPEN;
        newsym(x, y);
        await pline('The door opens.');
    } else {
        await pline('The door resists!');
    }
    game.context.move = 0;
    return true;
}

function runShouldStopAfterMove(source, target) {
    return target?.typ === DOOR || (source?.typ === CORR && target?.typ === C.ROOM);
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
        if (mon.mtame) rnd(6);
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
    const damage = rnd(heroMeleeSmallDamageDie());
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

function heroKilledMonster(mon) {
    if (mon.mtame) {
        // C ref: mon.c:xkilled(); killing a tame monster is a major
        // alignment abuse and feeds later peace_minded() RNG gates.
        adjalign(-15);
        game._pending_tame_kill_reaction = true;
    }
    if (!rn2(6)) {
        // Treasure-drop object creation is still future work; current
        // evidence only needs the C front-door gate.
    }
    corpseChance(mon);
    if (mon.mpeaceful && !rn2(2)) {
        // Luck adjustment is outside the current scoring surface.
    }
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
const WIZARD_DISCOVERY_DESCRIPTIONS = new Map([
    [QUARTERSTAFF, 'quarterstaff (staff)'],
    [CLOAK_OF_MAGIC_RESISTANCE, 'cloak of magic resistance (piece of cloth)'],
    [325, 'scroll of confuse monster (VERR YED HORRE)'],
    [332, 'scroll of light (ELAM EBOW)'],
    [335, 'scroll of food detection (XIXAXA XOXAXA XUXAXA)'],
    [383, 'spellbook of force bolt (light blue)'],
    [380, 'spellbook of slow monster (white)'],
]);
const WIZARD_UNKNOWN_SPELL_DISCOVERIES = [
    '* spellbook of magic missile (indigo)',
    '* spellbook of sleep (magenta)',
    '* spellbook of light (light brown)',
    '* spellbook of detect monsters (cloth)',
    '* spellbook of healing (leathery)',
    '* spellbook of knock (thick)',
    '* spellbook of confuse monster (thin)',
    '* spellbook of drain life (checkered)',
    '* spellbook of cause fear (yellow)',
    '* spellbook of protection (plaid)',
];
const STR_ATTR1 = " Contestant the Tourist's attributes:\n\n Background:\n  You are a Rambler, a level 1 female human Tourist.\n  You are neutral, on a mission for The Lady\n  who is opposed by Blind Io (lawful) and Offler (chaotic).\n  You are left-handed.\n  You are in the Dungeons of Doom, on level 1.\n  You entered the dungeon 11 turns ago.\n  You have 0 experience points.\n\n Basics:\n  You have all 10 hit points.\n  You have both energy points (spell power).\n  Your armor class is 10.\n  Your wallet contains 757 zorkmids.\n  Autopickup is off.\n\n Characteristics:\n  Your strength is 9.\n  Your dexterity is 14.\n  Your constitution is 12.\n  Your intelligence is 11.\n (1 of 2)";
const STR_ATTR2 = "  Your wisdom is 16.\n  Your charisma is 16.\n\n Status:\n  You aren't hungry.\n  You are unencumbered.\n  You are bare handed.\n  You are unskilled in bare handed combat.\n\n Miscellaneous:\n  Total elapsed playing time is none.\n (2 of 2)";
const INVALID_DIRECTION_HELP_SCREEN = "cmdassist: Invalid direction key!\n\nValid direction keys are:\n\x1b[10Cy  k  u\n\x1b[11C\\ | /\n\x1b[10Ch- . -l\n\x1b[11C/ | \\\n\x1b[10Cb  j  n\n\n\x1b[10C<  up\n\x1b[10C>  down\n\x1b[10C.  direct at yourself\n\n(Suppress this message with !cmdassist in config file.)\n\n\n\n\n\n\n\n\n\n--More--";

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
        term.serialize = () => (game._override_screen && game._override_serialized_screen)
            ? game._override_serialized_screen
            : originalSerialize();
    }
    showOverride(screen, cursor);
    game._override_serialized_screen = screen;
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
    const moreDismissKey = !!game._monster_more_accepts_any_key
        || ch === ' ' || ch === '\r' || ch === '\n' || ch === '\x1b';
    const pausedMonsterTurn = !!game._monster_turn_paused_for_more;
    const swallowedDamageResume = pausedMonsterTurn && !!game._swallowed_damage_more_waiting;
    const preTurnResume = pausedMonsterTurn && !!game._pre_turn_more_waiting;
    const monsterAttackResume = pausedMonsterTurn && !!game._monster_attack_more_waiting;
    const pausedFloorListTurn = !!game._resume_floor_list_turn;
    if (!moreDismissKey) {
        if (game._direction_help_screen) {
            showSerializedOverride(game._direction_help_screen, [8, 23]);
            game._override_prev = null;
        }
        game.context.move = 0;
        return true;
    }

    game._more_dismissals_remaining--;
    game._monster_more_accepts_any_key = false;
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
        game._hallucination_warning_rng_active = false;
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
        if (game._drink_call_after_more) {
            const appearance = game._drink_call_after_more;
            game._drink_call_after_more = '';
            game._awaiting_potion_call_name = { appearance, text: '' };
            await showPromptLine(`Call a ${appearance} potion:`);
            game.context.move = 0;
            return true;
        }
        if (game._after_more_message) {
            const msg = game._after_more_message;
            const needsPrompt = !!game._after_more_needs_prompt;
            game._after_more_message = '';
            game._after_more_needs_prompt = false;
            await pline(msg);
            if (needsPrompt) queue_more_prompt();
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
    if (pausedFloorListTurn && !game._more) {
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

    let lines = buildInventoryMenuLines();
    let multipage = false;
    const displayRows = display.rows || display.terminal?.rows || 24;
    if (lines.length > displayRows) {
        lines = lines.slice(0, displayRows - 1);
        lines.push({ text: '(1 of 2)', heading: false });
        multipage = true;
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

function spellMenuRawLine(entry, turnsText, menuCol) {
    const name = `${entry.letter} - ${entry.name}`;
    const levelCol = 40;
    const failCol = 59;
    const beforeLevel = cursorForward(levelCol - (menuCol + name.length));
    const levelCategory = `${entry.level}   ${entry.category}`;
    const beforeFail = cursorForward(failCol - (levelCol + levelCategory.length));
    return `${cursorForward(menuCol)}${name}${beforeLevel}${levelCategory}${beforeFail}${entry.fail}  91%-100%  ${turnsText}`;
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

    const turnsText = String(20001 - (game.moves || 1));
    const maxLen = 65;
    const menuCol = Math.max(1, Math.min(COLNO - 1, COLNO - maxLen - 2));
    const rawLines = [
        `${cursorForward(menuCol)}\x1b[7mCurrently known spells\x1b[0m`,
        '',
        `${cursorForward(menuCol)}\x1b[7m    Name\x1b[17CLevel Category\x1b[5CFail Retention  turns\x1b[0m`,
        ...spells.map((entry) => spellMenuRawLine(entry, turnsText, menuCol)),
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
    const inventoryTypes = new Set((game.inventory || []).map((obj) => obj?.otyp));
    const lines = [
        'Discoveries, by order of discovery within each class',
        '',
        '\x1b[7mWeapons\x1b[0m',
        `  ${WIZARD_DISCOVERY_DESCRIPTIONS.get(QUARTERSTAFF)}`,
        '\x1b[7mArmor\x1b[0m',
        `  ${WIZARD_DISCOVERY_DESCRIPTIONS.get(CLOAK_OF_MAGIC_RESISTANCE)}`,
    ];

    const scrolls = [325, 332, 335]
        .filter((otyp) => inventoryTypes.has(otyp))
        .map((otyp) => WIZARD_DISCOVERY_DESCRIPTIONS.get(otyp));
    if (scrolls.length) {
        lines.push('\x1b[7mScrolls\x1b[0m');
        for (const line of scrolls) lines.push(`  ${line}`);
    }

    const spellbooks = [383, 380]
        .filter((otyp) => inventoryTypes.has(otyp))
        .map((otyp) => WIZARD_DISCOVERY_DESCRIPTIONS.get(otyp));
    if (spellbooks.length) {
        lines.push('\x1b[7mSpellbooks\x1b[0m');
        for (const line of spellbooks) lines.push(`  ${line}`);
        lines.push(...WIZARD_UNKNOWN_SPELL_DISCOVERIES);
    }

    lines.push('--More--');
    return lines.slice(0, 24).join('\n');
}

function discoveriesScreen() {
    if (game.urole?.name?.m === 'Wizard') return wizardDiscoveryScreen();
    return TOURIST_DISCOVERIES_SCREEN;
}

function heroAttr(index) {
    return game.u?.acurr?.a?.[index] ?? 0;
}

function wizardAttributesPage1() {
    const levelName = game.level?.flags?.sokoban_rules ? 'Sokoban' : 'the Dungeons of Doom';
    return ` ${game.plname || 'Wizard'} the Wizard's attributes:\n\n`
        + ' Background:\n'
        + `  You are an Evoker, a level ${game.u?.ulevel || 1} male human Wizard.\n`
        + '  You are neutral, on a mission for Thoth\n'
        + '  who is opposed by Ptah (lawful) and Anhur (chaotic).\n'
        + '  You are right-handed.\n'
        + `  You are in ${levelName}, on level ${displayDepth(game.u?.uz)}.\n`
        + `  You entered the dungeon ${game.moves || 1} turns ago.\n`
        + `  You have ${game.u?.uexp || 0} experience points, 20 needed to attain level 2.\n`
        + '\n Basics:\n'
        + `  You have all ${game.u?.uhpmax || 0} hit points.\n`
        + `  You have all ${game.u?.uenmax || 0} energy points (spell power).\n`
        + `  Your armor class is ${game.u?.uac ?? 10}.\n`
        + '  Your wallet is empty.\n'
        + '  Autopickup is off.\n'
        + '\n Characteristics:\n'
        + `  Your strength is ${heroAttr(0)}.\n`
        + `  Your dexterity is ${heroAttr(3)}.\n`
        + `  Your constitution is ${heroAttr(4)}.\n`
        + `  Your intelligence is ${heroAttr(1)}.\n`
        + ' (1 of 2)';
}

function wizardAttributesPage2() {
    const ring = (game.inventory || []).find((obj) => obj?.otyp === RIN_TELEPORT_CONTROL && obj.wornSide);
    const ringLine = ring?.appearanceName
        ? `  You have teleport control because of your ${ring.appearanceName}.`
        : '  You have teleport control.';
    return `  Your wisdom is ${heroAttr(2)}.\n`
        + `  Your charisma is ${heroAttr(5)}.\n`
        + '\n Status:\n'
        + '  You aren\'t hungry <880>.\n'
        + '  You are unencumbered <-415>.\n'
        + '  You are bare handed.\n'
        + '  You are unskilled in bare handed combat.\n'
        + '  You aren\'t wearing any armor.\n'
        + '\n Attributes:\n'
        + '  You are haltingly aligned.\n'
        + '  Your alignment is 2.\n'
        + `${ringLine}\n`
        + '  Your luck is zero.\n'
        + '  You can\'t safely pray (176).\n'
        + '\n Miscellaneous:\n'
        + '  You are running in debug mode.\n'
        + '  You haven\'t encountered any bones levels.\n'
        + '  Total elapsed playing time is none.\n'
        + ' (2 of 2)';
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

export async function performLevelTeleport(target) {
    const oldUz = { ...(game.u?.uz || { dnum: 0, dlevel: 1 }) };
    const wasInHell = isHellLevel(oldUz);
    const prevTemperature = game.level?.flags?.temperature || 0;
    const migratingPet = (game.level?.monsters || []).find(m =>
        m.mtame && dist2(m.mx, m.my, game.u?.ux ?? m.mx, game.u?.uy ?? m.my) < 3);
    game._migrating_pet = migratingPet ? {
        ...migratingPet,
        data: migratingPet.data ? { ...migratingPet.data } : migratingPet.data,
        edog: migratingPet.edog ? { ...migratingPet.edog } : migratingPet.edog,
    } : null;
    game.u.uz = typeof target === 'object' && target
        ? { ...target }
        : { ...(game.u.uz || { dnum: 0 }), dlevel: target };
    await mklev();
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
    vision_recalc(0);
    await docrt();
    if (game.u?.uhallucination || game.u?.uprops?.hallucination) see_objects();
    await pline('You materialize on a different level!');
    if (!wasInHell && isHellLevel(game.u?.uz)
        && (isSpecialProtoLevel(game.u?.uz, 'valley') || game._last_special_protofile === 'valley')) {
        queue_more_prompt();
        game._more_message_queue = [
            { text: 'You arrive at the Valley of the Dead...', more: true },
            { text: 'The odor of burnt flesh and decay pervades the air.', more: true },
            { text: 'You hear groans and moans everywhere.', more: false },
        ];
    }
    // C ref: do.c:goto_level() performs docrt()/flush before the deferred
    // materialize pline and temperature-change messages; the following input
    // boundary does not immediately rerandomize the hallucinated new-level map.
    const tempMessage = temperatureChangeAfterLevelChange(prevTemperature, wasInHell);
    if (tempMessage?.line) {
        await append_pline(tempMessage.line);
        if (tempMessage.afterMore) {
            game._after_more_message = tempMessage.afterMore;
            queue_more_prompt();
        }
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
            game.context.move = 0;
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
        game.context.move = 0;
        return;
    }

    if (game._awaiting_throw_item) {
        clear_pending_message();
        game._awaiting_throw_item = false;
        if (ch === '$') {
            game._awaiting_throw_direction = { otyp: GOLD_PIECE, oclass: COIN_CLASS, quan: game._goldCount || 0 };
            game.context.move = 0;
            await showPromptLine('In what direction? ');
            return;
        }
        const idx = inventoryIndexForLetter(ch);
        const obj = idx >= 0 ? game.inventory?.[idx] : null;
        if (!obj || obj.oclass !== WEAPON_CLASS) {
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
            if (target) game._pending_level_teleport_target = target;
            game.context.move = 0;
            return;
        }
        if (prev === game._level_teleport_menu_page2_screen) {
            const target = game._level_teleport_menu_page2_choices?.[ch];
            if (target) game._pending_level_teleport_target = target;
            game.context.move = 0;
            return;
        }
        if (prev === game._inventory_menu_screen) {
            const idx = inventoryIndexForLetter(ch);
            const obj = idx >= 0 ? game.inventory?.[idx] : null;
            if (obj) await showInventoryActionMenu(obj);
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

    // Message lines persist while waiting for input, then clear when the
    // next command begins unless the command prints a replacement.
    clear_pending_message();
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
        game.context.run = { dx: DIR_DX[dir], dy: DIR_DY[dir], mode: 1, steps: 0 };
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
            game.context.move = 1;
        }
    } else if (ch === 's') {
        if (!forceCommandPrefix && await cmdSafetyPrevention('Searching', 'another search',
            'You already found a monster.', '_already_found_flag')) {
            game.context.move = 0;
        } else {
            game.context.move = 1;
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
    } else if (ch === '#') {
        game.context.move = 0;
        game._awaiting_extended_command = true;
        game._extended_command_input = '';
        game._extended_command = '';
        await showPromptLine('# ');
    } else if (ch === 'i') {
        game.context.move = 0;
        await showInventoryMenu();
    } else if (ch === '+') {
        game.context.move = 0;
        await showSpellMenu();
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
        game._prompt_cursor = [msg.length, 0];
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
        showOverride(discoveriesScreen(), [8, 23]);
    } else if (key === 24) { // ^X
        game.context.move = 0;
        const screens = buildAttributesScreens();
        game._attributes_page1_screen = screens.page1;
        game._attributes_page2_screen = screens.page2;
        showOverride(screens.page1, [9, 23]);
    } else if (ch === ':') {
        game.context.move = 0;
        const st = stairAtHero();
        if (st?.up) {
            await pline('There is a staircase up out of the dungeon here.');
            queue_more_prompt();
        } else if (st) {
            await pline('There is a staircase down here.');
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
            game.context.move = 0;
            game._awaiting_floor_corpse_eat = true;
            game._floor_corpse_eat_obj = corpse;
            await showPromptLine('There is a gnome corpse here; eat it? [ynq] (n)');
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
        const letters = throwLetters();
        if (letters) {
            game._awaiting_throw_item = true;
            await showPromptLine(`What do you want to throw? [${letters} or ?*] `);
        } else {
            await pline("You don't have anything to throw.");
        }
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
    game.context.move = 0;
    game.context.mv = 1;
    const moved = await domove(run.dx, run.dy);
    game.context.move = moved ? 1 : 0;
    if (!moved || game._run_stop_after_move) {
        game.context.run = null;
        game._run_stop_after_move = false;
    }
    return moved;
}

export async function domove(dx, dy) {
    const u = game.u;
    if (u.uswallow && u.ustuck) {
        await swallowedHeroAttack(u.ustuck);
        return true;
    }

    const newx = u.ux + dx;
    const newy = u.uy + dy;
    const target = game.level.at(newx, newy);
    const is_diag = dx !== 0 && dy !== 0;

    if (is_diag && !blocksMove(newx, newy)) {
        const side1x = u.ux + dx, side1y = u.uy;
        const side2x = u.ux, side2y = u.uy + dy;
        const side1Blocked = blocksMove(side1x, side1y) || sobj_at_basic(BOULDER, side1x, side1y);
        const side2Blocked = blocksMove(side2x, side2y) || sobj_at_basic(BOULDER, side2x, side2y);
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
    if (boulder && !is_diag) {
        return tryPushBoulder(boulder, newx, newy, dx, dy);
    }

    if (target?.typ === DOOR && (target.doormask & (D_CLOSED | D_LOCKED))) {
        if (await tryAutoOpenDoor(newx, newy)) return false;
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
    newsym(newx, newy);
    await lookHereAfterMove();
    return true;
}
