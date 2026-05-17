// ini_inv_stub.js — Stand-in for u_init.c ini_inv() until objects/invent.c are ported.
// One structured list drives #inventory painting and #discoveries (per-class lines).

import { game } from './gstate.js';
import { NO_COLOR, ATR_INVERSE } from './terminal.js';
import { applyRogueHumanLinkedInventAndWieldLikeC } from './u_init_link_rogue_invent.js';
import { applySamuraiHumanLinkedInventAndWieldLikeC } from './u_init_link_samurai_invent.js';
import { applyValkyrieHumanLinkedInventAndWieldLikeC } from './u_init_link_valkyrie_invent.js';
import { applyKnightHumanLinkedInventAndWieldLikeC } from './u_init_link_knight_invent.js';
import { applyMonkHumanLinkedInventAndWearLikeC } from './u_init_link_monk_invent.js';
import { applyWizardHumanLinkedInventAndWearLikeC } from './u_init_link_wizard_invent.js';
import { applyArcheologistHumanLinkedInventAndWearLikeC } from './u_init_link_archeologist_invent.js';
import { applyHealerHumanLinkedInventAndWearLikeC } from './u_init_link_healer_invent.js';
import { applyBarbarianHumanLinkedInventAndWearLikeC } from './u_init_link_barbarian_invent.js';
import { applyCaveDwellerHumanLinkedInventAndWearLikeC } from './u_init_link_cave_dweller_invent.js';
import { applyRangerHumanLinkedInventAndWearLikeC } from './u_init_link_ranger_invent.js';
import { applyPriestHumanLinkedInventAndWearLikeC } from './u_init_link_priest_invent.js';
import { applyTouristHumanLinkedInventAndWearLikeC } from './u_init_link_tourist_invent.js';

const INV_COL = 32;

/** @type {Array<{ type: 'cat', name: string } | { type: 'item', text: string | ((g: object) => string), oclass?: string, discoveryLine?: string }>} */
const TOURIST_INI_INV = [
    { type: 'cat', name: 'Coins' },
    { type: 'item', text: (g) => `$ - ${g._goldCount ?? 0} gold pieces` },
    { type: 'cat', name: 'Weapons' },
    { type: 'item', text: 'a - 27 +2 darts (at the ready)' },
    { type: 'cat', name: 'Armor' },
    { type: 'item', text: 'j - an uncursed +0 Hawaiian shirt (being worn)' },
    { type: 'cat', name: 'Comestibles' },
    { type: 'item', text: 'b - 6 uncursed food rations' },
    { type: 'item', text: 'c - an uncursed apple' },
    { type: 'item', text: 'd - 2 uncursed fortune cookies' },
    { type: 'item', text: 'e - an uncursed clove of garlic' },
    { type: 'item', text: 'f - an uncursed slime mold' },
    { type: 'item', text: 'g - 2 uncursed tins of lichen' },
    { type: 'cat', name: 'Scrolls' },
    {
        type: 'item',
        text: 'i - 4 uncursed scrolls of magic mapping',
        oclass: 'Scrolls',
        discoveryLine: '  scroll of magic mapping (ANDOVA BEGARIN)',
    },
    { type: 'cat', name: 'Potions' },
    {
        type: 'item',
        text: 'h - 2 uncursed potions of extra healing',
        oclass: 'Potions',
        discoveryLine: '  potion of extra healing (murky)',
    },
    { type: 'cat', name: 'Tools' },
    { type: 'item', text: 'k - an expensive camera (0:34)' },
    { type: 'item', text: 'l - an uncursed credit card' },
    { type: 'item', text: '(end)' },
];

/** C: u_init.c Wizard[] — static labels for overlay until mkobj/ini_inv port. */
const WIZARD_INI_INV = [
    { type: 'cat', name: 'Weapons' },
    { type: 'item', text: 'a - a blessed +1 quarterstaff (weapon in hands)' },
    { type: 'cat', name: 'Armor' },
    { type: 'item', text: 'b - an uncursed +0 cloak of magic resistance (being worn)' },
    { type: 'cat', name: 'Wands' },
    {
        type: 'item',
        text: 'c - a wand of fire (0:5)',
        oclass: 'Wands',
        discoveryLine: '  wand of fire',
    },
    { type: 'cat', name: 'Rings' },
    {
        type: 'item',
        text: 'd - an uncursed ring of see invisible',
        oclass: 'Rings',
        discoveryLine: '  ring of see invisible',
    },
    {
        type: 'item',
        text: 'e - an uncursed ring of adornment',
        oclass: 'Rings',
        discoveryLine: '  ring of adornment',
    },
    { type: 'cat', name: 'Potions' },
    {
        type: 'item',
        text: 'f - 3 uncursed potions of booze',
        oclass: 'Potions',
        discoveryLine: '  potion of booze',
    },
    { type: 'cat', name: 'Scrolls' },
    {
        type: 'item',
        text: 'g - 3 uncursed scrolls of identify',
        oclass: 'Scrolls',
        discoveryLine: '  scroll of identify',
    },
    { type: 'cat', name: 'Spellbooks' },
    {
        type: 'item',
        text: 'h - a blessed spellbook of force bolt',
        oclass: 'Spellbooks',
        discoveryLine: '  spellbook of force bolt',
    },
    {
        type: 'item',
        text: 'i - an uncursed spellbook of detect monsters',
        oclass: 'Spellbooks',
        discoveryLine: '  spellbook of detect monsters',
    },
    { type: 'cat', name: 'Tools' },
    {
        type: 'item',
        text: 'j - a magic marker (19:0)',
        oclass: 'Tools',
        discoveryLine: '  magic marker',
    },
    { type: 'item', text: '(end)' },
];

/** C: u_init.c Valkyrie[] — static overlay until ini_inv/mkobj. */
const VALKYRIE_INI_INV = [
    { type: 'cat', name: 'Coins' },
    { type: 'item', text: (g) => `$ - ${g._goldCount ?? 0} gold pieces` },
    { type: 'cat', name: 'Weapons' },
    { type: 'item', text: 'a - a blessed +1 spear (weapon in hands)' },
    { type: 'item', text: 'b - an uncursed +0 dagger (alternate weapon; not wielded)' },
    { type: 'cat', name: 'Armor' },
    { type: 'item', text: 'c - an uncursed +3 small shield (being worn)' },
    { type: 'cat', name: 'Comestibles' },
    { type: 'item', text: 'd - an uncursed food ration' },
    { type: 'item', text: '(end)' },
];

/** C: u_init.c Barbarian_0[] (C randomly uses Barbarian_0 vs Barbarian_1). */
const BARBARIAN_INI_INV = [
    { type: 'cat', name: 'Coins' },
    { type: 'item', text: (g) => `$ - ${g._goldCount ?? 0} gold pieces` },
    { type: 'cat', name: 'Weapons' },
    { type: 'item', text: 'a - an uncursed +0 two-handed sword (weapon in hands)' },
    { type: 'item', text: 'b - an uncursed +0 axe' },
    { type: 'cat', name: 'Armor' },
    { type: 'item', text: 'c - an uncursed +0 ring mail (being worn)' },
    { type: 'cat', name: 'Comestibles' },
    { type: 'item', text: 'd - an uncursed food ration' },
    { type: 'item', text: '(end)' },
];

/** C: u_init.c Archeologist[] */
const ARCHEOLOGIST_INI_INV = [
    { type: 'cat', name: 'Coins' },
    { type: 'item', text: (g) => `$ - ${g._goldCount ?? 0} gold pieces` },
    { type: 'cat', name: 'Weapons' },
    {
        type: 'item',
        text: 'a - a blessed +2 bullwhip (weapon in hands)',
        oclass: 'Weapons',
        discoveryLine: '  bullwhip',
    },
    { type: 'cat', name: 'Armor' },
    {
        type: 'item',
        text: 'b - an uncursed +0 leather jacket (being worn)',
        oclass: 'Armor',
        discoveryLine: '  leather jacket',
    },
    {
        type: 'item',
        text: 'c - an uncursed +0 fedora',
        oclass: 'Armor',
        discoveryLine: '  fedora',
    },
    { type: 'cat', name: 'Comestibles' },
    { type: 'item', text: 'd - 3 uncursed food rations' },
    { type: 'cat', name: 'Tools' },
    {
        type: 'item',
        text: 'e - an uncursed pick-axe',
        oclass: 'Tools',
        discoveryLine: '  pick-axe',
    },
    {
        type: 'item',
        text: 'f - an uncursed tinning kit (0:0)',
        oclass: 'Tools',
        discoveryLine: '  tinning kit',
    },
    { type: 'item', text: 'g - an empty uncursed sack' },
    { type: 'cat', name: 'Gems' },
    {
        type: 'item',
        text: 'h - an uncursed touchstone',
        oclass: 'Gems',
        discoveryLine: '  touchstone',
    },
    { type: 'item', text: '(end)' },
];

/** C: u_init.c Healer[] */
const HEALER_INI_INV = [
    { type: 'cat', name: 'Coins' },
    { type: 'item', text: (g) => `$ - ${g._goldCount ?? 0} gold pieces` },
    { type: 'cat', name: 'Weapons' },
    {
        type: 'item',
        text: 'a - an uncursed +0 scalpel (weapon in hand)',
        oclass: 'Weapons',
        discoveryLine: '  scalpel',
    },
    { type: 'cat', name: 'Armor' },
    {
        type: 'item',
        text: 'b - an uncursed +1 pair of leather gloves (being worn)',
        oclass: 'Armor',
        discoveryLine: '  leather gloves',
    },
    { type: 'cat', name: 'Tools' },
    {
        type: 'item',
        text: 'c - a stethoscope',
        oclass: 'Tools',
        discoveryLine: '  stethoscope',
    },
    { type: 'cat', name: 'Potions' },
    {
        type: 'item',
        text: 'd - 4 uncursed potions of healing',
        oclass: 'Potions',
        discoveryLine: '  potion of healing',
    },
    {
        type: 'item',
        text: 'e - 4 uncursed potions of extra healing',
        oclass: 'Potions',
        discoveryLine: '  potion of extra healing',
    },
    { type: 'cat', name: 'Wands' },
    {
        type: 'item',
        text: 'f - an uncursed wand of sleep (0:5)',
        oclass: 'Wands',
        discoveryLine: '  wand of sleep',
    },
    { type: 'cat', name: 'Spellbooks' },
    {
        type: 'item',
        text: 'g - a blessed spellbook of healing',
        oclass: 'Spellbooks',
        discoveryLine: '  spellbook of healing',
    },
    {
        type: 'item',
        text: 'h - a blessed spellbook of extra healing',
        oclass: 'Spellbooks',
        discoveryLine: '  spellbook of extra healing',
    },
    {
        type: 'item',
        text: 'i - a blessed spellbook of stone to flesh',
        oclass: 'Spellbooks',
        discoveryLine: '  spellbook of stone to flesh',
    },
    { type: 'cat', name: 'Comestibles' },
    { type: 'item', text: 'j - 5 uncursed apples' },
    { type: 'item', text: '(end)' },
];

/** C: u_init.c Knight[] */
const KNIGHT_INI_INV = [
    { type: 'cat', name: 'Coins' },
    { type: 'item', text: (g) => `$ - ${g._goldCount ?? 0} gold pieces` },
    { type: 'cat', name: 'Weapons' },
    {
        type: 'item',
        text: 'a - an uncursed +1 long sword (weapon in hands)',
        oclass: 'Weapons',
        discoveryLine: '  long sword',
    },
    { type: 'item', text: 'b - an uncursed +1 lance' },
    { type: 'cat', name: 'Armor' },
    {
        type: 'item',
        text: 'c - an uncursed +1 ring mail (being worn)',
        oclass: 'Armor',
        discoveryLine: '  ring mail',
    },
    {
        type: 'item',
        text: 'd - an uncursed +0 helmet',
        oclass: 'Armor',
        discoveryLine: '  helmet',
    },
    {
        type: 'item',
        text: 'e - an uncursed +0 small shield',
        oclass: 'Armor',
        discoveryLine: '  small shield',
    },
    {
        type: 'item',
        text: 'f - an uncursed +0 pair of leather gloves',
        oclass: 'Armor',
        discoveryLine: '  leather gloves',
    },
    { type: 'cat', name: 'Comestibles' },
    { type: 'item', text: 'g - 10 uncursed apples' },
    { type: 'item', text: 'h - 10 uncursed carrots' },
    { type: 'item', text: '(end)' },
];

/** C: u_init.c Monk[] (UNDEF_TYP scroll → stub as random scroll). */
const MONK_INI_INV = [
    { type: 'cat', name: 'Coins' },
    { type: 'item', text: (g) => `$ - ${g._goldCount ?? 0} gold pieces` },
    { type: 'cat', name: 'Armor' },
    {
        type: 'item',
        text: 'a - an uncursed +2 pair of leather gloves (being worn)',
        oclass: 'Armor',
        discoveryLine: '  leather gloves',
    },
    {
        type: 'item',
        text: 'b - an uncursed +1 robe',
        oclass: 'Armor',
        discoveryLine: '  robe',
    },
    { type: 'cat', name: 'Scrolls' },
    {
        type: 'item',
        text: 'c - an uncursed scroll (random appearance)',
        oclass: 'Scrolls',
        discoveryLine: '  scroll (type from game start)',
    },
    { type: 'cat', name: 'Potions' },
    {
        type: 'item',
        text: 'd - 3 uncursed potions of healing',
        oclass: 'Potions',
        discoveryLine: '  potion of healing',
    },
    { type: 'cat', name: 'Comestibles' },
    { type: 'item', text: 'e - 3 uncursed food rations' },
    { type: 'item', text: 'f - 5 uncursed apples' },
    { type: 'item', text: 'g - 5 uncursed oranges' },
    { type: 'item', text: 'h - 3 uncursed fortune cookies' },
    { type: 'item', text: '(end)' },
];

/** C: u_init.c Priest[] (holy water blessed; two random spellbooks). */
const PRIEST_INI_INV = [
    { type: 'cat', name: 'Coins' },
    { type: 'item', text: (g) => `$ - ${g._goldCount ?? 0} gold pieces` },
    { type: 'cat', name: 'Weapons' },
    {
        type: 'item',
        text: 'a - a blessed +1 mace (weapon in hand)',
        oclass: 'Weapons',
        discoveryLine: '  mace',
    },
    { type: 'cat', name: 'Armor' },
    {
        type: 'item',
        text: 'b - an uncursed +0 robe (being worn)',
        oclass: 'Armor',
        discoveryLine: '  robe',
    },
    {
        type: 'item',
        text: 'c - an uncursed +0 small shield',
        oclass: 'Armor',
        discoveryLine: '  small shield',
    },
    { type: 'cat', name: 'Potions' },
    {
        type: 'item',
        text: 'd - 4 potions of holy water (blessed clear)',
        oclass: 'Potions',
        discoveryLine: '  potion of water (blessed)',
    },
    { type: 'cat', name: 'Comestibles' },
    { type: 'item', text: 'e - an uncursed clove of garlic' },
    { type: 'item', text: 'f - an uncursed sprig of wolfsbane' },
    { type: 'cat', name: 'Spellbooks' },
    {
        type: 'item',
        text: 'g - 2 uncursed spellbooks (random types)',
        oclass: 'Spellbooks',
        discoveryLine: '  spellbooks (types from game start)',
    },
    { type: 'item', text: '(end)' },
];

/** C: u_init.c Ranger[] */
const RANGER_INI_INV = [
    { type: 'cat', name: 'Coins' },
    { type: 'item', text: (g) => `$ - ${g._goldCount ?? 0} gold pieces` },
    { type: 'cat', name: 'Weapons' },
    {
        type: 'item',
        text: 'a - an uncursed +1 dagger (weapon in hand)',
        oclass: 'Weapons',
        discoveryLine: '  dagger',
    },
    {
        type: 'item',
        text: 'b - an uncursed +1 bow',
        oclass: 'Weapons',
        discoveryLine: '  bow',
    },
    {
        type: 'item',
        text: (g) =>
            `c - ${g._rangerIniArrow1Quan ?? 54} uncursed +2 arrows (in quiver)`,
    },
    {
        type: 'item',
        text: (g) => `d - ${g._rangerIniArrow2Quan ?? 34} uncursed +0 arrows`,
    },
    { type: 'cat', name: 'Armor' },
    {
        type: 'item',
        text: 'e - an uncursed +2 cloak of displacement (being worn)',
        oclass: 'Armor',
        discoveryLine: '  cloak of displacement',
    },
    { type: 'cat', name: 'Comestibles' },
    {
        type: 'item',
        text: (g) => {
            const qs = g._rangerIniCramQuans;
            if (!Array.isArray(qs) || !qs.length) return 'f - 4 uncursed cram rations';
            const t = qs.reduce((a, b) => (a | 0) + (b | 0), 0);
            return `f - ${t} uncursed cram ration${t === 1 ? '' : 's'}`;
        },
    },
    { type: 'item', text: '(end)' },
];

/** C: u_init.c Rogue[] */
const ROGUE_INI_INV = [
    { type: 'cat', name: 'Coins' },
    { type: 'item', text: (g) => `$ - ${g._goldCount ?? 0} gold pieces` },
    { type: 'cat', name: 'Weapons' },
    {
        type: 'item',
        text: 'a - an uncursed +0 short sword (weapon in hand)',
        oclass: 'Weapons',
        discoveryLine: '  short sword',
    },
    { type: 'item', text: 'b - 10 uncursed +0 daggers' },
    { type: 'cat', name: 'Armor' },
    {
        type: 'item',
        text: 'c - an uncursed +1 leather armor (being worn)',
        oclass: 'Armor',
        discoveryLine: '  leather armor',
    },
    { type: 'cat', name: 'Potions' },
    {
        type: 'item',
        text: 'd - an uncursed potion of sickness',
        oclass: 'Potions',
        discoveryLine: '  potion of sickness',
    },
    { type: 'cat', name: 'Tools' },
    {
        type: 'item',
        text: 'e - an uncursed lock pick',
        oclass: 'Tools',
        discoveryLine: '  lock pick',
    },
    { type: 'item', text: 'f - an empty uncursed sack' },
    { type: 'item', text: '(end)' },
];

/** C: u_init.c Samurai[] */
const SAMURAI_INI_INV = [
    { type: 'cat', name: 'Coins' },
    { type: 'item', text: (g) => `$ - ${g._goldCount ?? 0} gold pieces` },
    { type: 'cat', name: 'Weapons' },
    {
        type: 'item',
        text: 'a - an uncursed +0 katana (weapon in hands)',
        oclass: 'Weapons',
        discoveryLine: '  katana',
    },
    {
        type: 'item',
        text: 'b - an uncursed +0 short sword (wakizashi)',
        oclass: 'Weapons',
        discoveryLine: '  short sword',
    },
    {
        type: 'item',
        text: 'c - an uncursed +0 yumi',
        oclass: 'Weapons',
        discoveryLine: '  yumi',
    },
    { type: 'item', text: 'd - 35 uncursed +0 ya (in quiver)' },
    { type: 'cat', name: 'Armor' },
    {
        type: 'item',
        text: 'e - an uncursed +0 splint mail (being worn)',
        oclass: 'Armor',
        discoveryLine: '  splint mail',
    },
    { type: 'item', text: '(end)' },
];

/** C: u_init.c Cave_man[] (flint/rn2 ranges shown as mid stub). */
const CAVE_MAN_INI_INV = [
    { type: 'cat', name: 'Coins' },
    { type: 'item', text: (g) => `$ - ${g._goldCount ?? 0} gold pieces` },
    { type: 'cat', name: 'Weapons' },
    {
        type: 'item',
        text: 'a - an uncursed +1 club (weapon in hands)',
        oclass: 'Weapons',
        discoveryLine: '  club',
    },
    {
        type: 'item',
        text: 'b - an uncursed +2 sling',
        oclass: 'Weapons',
        discoveryLine: '  sling',
    },
    { type: 'cat', name: 'Gems' },
    {
        type: 'item',
        text: 'c - 15 uncursed flint stones',
        oclass: 'Gems',
        discoveryLine: '  flint',
    },
    { type: 'item', text: 'd - 3 uncursed rocks' },
    { type: 'cat', name: 'Armor' },
    {
        type: 'item',
        text: 'e - an uncursed +0 leather armor (being worn)',
        oclass: 'Armor',
        discoveryLine: '  leather armor',
    },
    { type: 'item', text: '(end)' },
];

/** Role name (male or female title) → inventory table. C: u_init.c trobj[] packs. */
const INI_INV_BY_ROLE_NAME = {
    Tourist: TOURIST_INI_INV,
    Wizard: WIZARD_INI_INV,
    Valkyrie: VALKYRIE_INI_INV,
    Barbarian: BARBARIAN_INI_INV,
    Archeologist: ARCHEOLOGIST_INI_INV,
    Healer: HEALER_INI_INV,
    Knight: KNIGHT_INI_INV,
    Monk: MONK_INI_INV,
    Priest: PRIEST_INI_INV,
    Priestess: PRIEST_INI_INV,
    Ranger: RANGER_INI_INV,
    Rogue: ROGUE_INI_INV,
    Samurai: SAMURAI_INI_INV,
    Caveman: CAVE_MAN_INI_INV,
    Cavewoman: CAVE_MAN_INI_INV,
};

/** @param {Array<{ type: 'cat', name: string } | { type: 'item', text: string | ((g: object) => string), oclass?: string, discoveryLine?: string }>} rows */
function discoveryGroupsFromIniInv(rows) {
    const groups = [];
    const indexByClass = new Map();
    for (const row of rows) {
        if (row.type !== 'item' || !row.oclass || !row.discoveryLine) continue;
        let ix = indexByClass.get(row.oclass);
        if (ix === undefined) {
            ix = groups.length;
            indexByClass.set(row.oclass, ix);
            groups.push({ title: row.oclass, lines: [] });
        }
        groups[ix].lines.push(row.discoveryLine);
    }
    return groups;
}

/** C ref: u_init.c — apply role starting pack (static labels until mkobj/ini_inv). */
export function initIniInvStub(/** @type {import('./gstate.js').game} */ g) {
    const female = g.flags?.female;
    const role = female ? (g.urole?.name?.f || g.urole?.name?.m || '')
        : (g.urole?.name?.m || g.urole?.name?.f || '');
    const rows = INI_INV_BY_ROLE_NAME[role];
    if (rows) {
        g._iniInvRows = rows;
        g.discoveryGroups = discoveryGroupsFromIniInv(rows);
    } else {
        g._iniInvRows = [];
        g.discoveryGroups = [];
    }
    applyRogueHumanLinkedInventAndWieldLikeC(g);
    applySamuraiHumanLinkedInventAndWieldLikeC(g);
    applyValkyrieHumanLinkedInventAndWieldLikeC(g);
    applyKnightHumanLinkedInventAndWieldLikeC(g);
    applyMonkHumanLinkedInventAndWearLikeC(g);
    applyWizardHumanLinkedInventAndWearLikeC(g);
    applyArcheologistHumanLinkedInventAndWearLikeC(g);
    applyHealerHumanLinkedInventAndWearLikeC(g);
    applyBarbarianHumanLinkedInventAndWearLikeC(g);
    applyCaveDwellerHumanLinkedInventAndWearLikeC(g);
    applyRangerHumanLinkedInventAndWearLikeC(g);
    applyPriestHumanLinkedInventAndWearLikeC(g);
    applyTouristHumanLinkedInventAndWearLikeC(g);
}

/** @param {import('./game_display.js').GameDisplay} display */
export function paintIniInvStubIntoDisplay(display) {
    const rows = game._iniInvRows || [];
    let i = 0;
    for (const row of rows) {
        if (row.type === 'cat') {
            display.putstr(INV_COL, i, row.name, NO_COLOR, ATR_INVERSE);
        } else {
            const t = typeof row.text === 'function' ? row.text(game) : row.text;
            display.putstr(INV_COL, i, t, NO_COLOR, 0);
        }
        i++;
    }
    display.clearRow(21);
}
