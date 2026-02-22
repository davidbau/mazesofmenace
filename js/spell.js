// spell.js -- Spell knowledge, casting, and retention
// cf. spell.c — spelleffects, learn, docast, spelltypemnemonic,
//               spell_skilltype, age_spells, study_book, check_unpaid,
//               spell_skilltype, getspell, dospellmenu
//
// spell.c handles spell learning, retention, and casting:
//   docast(): #cast command — select and cast a known spell.
//   learn(): learn a spell from a spellbook.
//   age_spells(): decrement spell retention each turn.
//   getspell(): prompt user to select a spell.
//   dospellmenu(): display spell menu UI.

import { A_INT, A_WIS } from './config.js';
import { objectData, ROBE, QUARTERSTAFF, SMALL_SHIELD } from './objects.js';
import { is_metallic } from './objdata.js';
import { nhgetch } from './input.js';
import { create_nhwindow, destroy_nhwindow, NHW_MENU } from './windows.js';

// C ref: spell.c KEEN — spell retention threshold
const SPELL_KEEN_TURNS = 20000;
const SPELL_SKILL_UNSKILLED = 1;
const SPELL_SKILL_BASIC = 2;
const SPELL_CATEGORY_ATTACK = 'attack';
const SPELL_CATEGORY_HEALING = 'healing';
const SPELL_CATEGORY_DIVINATION = 'divination';
const SPELL_CATEGORY_ENCHANTMENT = 'enchantment';
const SPELL_CATEGORY_CLERICAL = 'clerical';
const SPELL_CATEGORY_ESCAPE = 'escape';
const SPELL_CATEGORY_MATTER = 'matter';

// C refs: src/spell.c spell_skilltype()/spelltypemnemonic(), include/objects.h SPELL().
const SPELL_CATEGORY_BY_NAME = new Map([
    ['dig', SPELL_CATEGORY_MATTER],
    ['magic missile', SPELL_CATEGORY_ATTACK],
    ['fireball', SPELL_CATEGORY_ATTACK],
    ['cone of cold', SPELL_CATEGORY_ATTACK],
    ['sleep', SPELL_CATEGORY_ENCHANTMENT],
    ['finger of death', SPELL_CATEGORY_ATTACK],
    ['light', SPELL_CATEGORY_DIVINATION],
    ['detect monsters', SPELL_CATEGORY_DIVINATION],
    ['healing', SPELL_CATEGORY_HEALING],
    ['knock', SPELL_CATEGORY_MATTER],
    ['force bolt', SPELL_CATEGORY_ATTACK],
    ['confuse monster', SPELL_CATEGORY_ENCHANTMENT],
    ['cure blindness', SPELL_CATEGORY_HEALING],
    ['drain life', SPELL_CATEGORY_ATTACK],
    ['slow monster', SPELL_CATEGORY_ENCHANTMENT],
    ['wizard lock', SPELL_CATEGORY_MATTER],
    ['create monster', SPELL_CATEGORY_CLERICAL],
    ['detect food', SPELL_CATEGORY_DIVINATION],
    ['cause fear', SPELL_CATEGORY_ENCHANTMENT],
    ['clairvoyance', SPELL_CATEGORY_DIVINATION],
    ['cure sickness', SPELL_CATEGORY_HEALING],
    ['charm monster', SPELL_CATEGORY_ENCHANTMENT],
    ['haste self', SPELL_CATEGORY_ESCAPE],
    ['detect unseen', SPELL_CATEGORY_DIVINATION],
    ['levitation', SPELL_CATEGORY_ESCAPE],
    ['extra healing', SPELL_CATEGORY_HEALING],
    ['restore ability', SPELL_CATEGORY_HEALING],
    ['invisibility', SPELL_CATEGORY_ESCAPE],
    ['detect treasure', SPELL_CATEGORY_DIVINATION],
    ['remove curse', SPELL_CATEGORY_CLERICAL],
    ['magic mapping', SPELL_CATEGORY_DIVINATION],
    ['identify', SPELL_CATEGORY_DIVINATION],
    ['turn undead', SPELL_CATEGORY_CLERICAL],
    ['polymorph', SPELL_CATEGORY_MATTER],
    ['teleport away', SPELL_CATEGORY_ESCAPE],
    ['create familiar', SPELL_CATEGORY_CLERICAL],
    ['cancellation', SPELL_CATEGORY_MATTER],
    ['protection', SPELL_CATEGORY_CLERICAL],
    ['jumping', SPELL_CATEGORY_ESCAPE],
    ['stone to flesh', SPELL_CATEGORY_HEALING],
    ['chain lightning', SPELL_CATEGORY_ATTACK],
]);

// C refs: src/role.c roles[] spell stats (spelbase/spelheal/spelshld/spelarmr/spelstat/spelspec/spelsbon).
const ROLE_SPELLCAST = new Map([
    [0, { spelbase: 5, spelheal: 0, spelshld: 2, spelarmr: 10, spelstat: A_INT, spelspec: 'magic mapping', spelsbon: -4 }],
    [1, { spelbase: 14, spelheal: 0, spelshld: 0, spelarmr: 8, spelstat: A_INT, spelspec: 'haste self', spelsbon: -4 }],
    [2, { spelbase: 12, spelheal: 0, spelshld: 1, spelarmr: 8, spelstat: A_INT, spelspec: 'dig', spelsbon: -4 }],
    [3, { spelbase: 3, spelheal: -3, spelshld: 2, spelarmr: 10, spelstat: A_WIS, spelspec: 'cure sickness', spelsbon: -4 }],
    [4, { spelbase: 8, spelheal: -2, spelshld: 0, spelarmr: 9, spelstat: A_WIS, spelspec: 'turn undead', spelsbon: -4 }],
    [5, { spelbase: 8, spelheal: -2, spelshld: 2, spelarmr: 20, spelstat: A_WIS, spelspec: 'restore ability', spelsbon: -4 }],
    [6, { spelbase: 3, spelheal: -2, spelshld: 2, spelarmr: 10, spelstat: A_WIS, spelspec: 'remove curse', spelsbon: -4 }],
    [7, { spelbase: 8, spelheal: 0, spelshld: 1, spelarmr: 9, spelstat: A_INT, spelspec: 'detect treasure', spelsbon: -4 }],
    [8, { spelbase: 9, spelheal: 2, spelshld: 1, spelarmr: 10, spelstat: A_INT, spelspec: 'invisibility', spelsbon: -4 }],
    [9, { spelbase: 10, spelheal: 0, spelshld: 0, spelarmr: 8, spelstat: A_INT, spelspec: 'clairvoyance', spelsbon: -4 }],
    [10, { spelbase: 5, spelheal: 1, spelshld: 2, spelarmr: 10, spelstat: A_INT, spelspec: 'charm monster', spelsbon: -4 }],
    [11, { spelbase: 10, spelheal: -2, spelshld: 0, spelarmr: 9, spelstat: A_WIS, spelspec: 'cone of cold', spelsbon: -4 }],
    [12, { spelbase: 1, spelheal: 0, spelshld: 3, spelarmr: 10, spelstat: A_INT, spelspec: 'magic missile', spelsbon: -4 }],
]);

const ROLE_BASIC_SPELL_CATEGORIES = new Map([
    [0, new Set([SPELL_CATEGORY_ATTACK, SPELL_CATEGORY_HEALING, SPELL_CATEGORY_DIVINATION, SPELL_CATEGORY_MATTER])],
    [1, new Set([SPELL_CATEGORY_ATTACK, SPELL_CATEGORY_ESCAPE])],
    [2, new Set([SPELL_CATEGORY_ATTACK, SPELL_CATEGORY_MATTER])],
    [3, new Set([SPELL_CATEGORY_HEALING])],
    [4, new Set([SPELL_CATEGORY_ATTACK, SPELL_CATEGORY_HEALING, SPELL_CATEGORY_CLERICAL])],
    [5, new Set([SPELL_CATEGORY_ATTACK, SPELL_CATEGORY_HEALING, SPELL_CATEGORY_DIVINATION, SPELL_CATEGORY_ENCHANTMENT, SPELL_CATEGORY_CLERICAL, SPELL_CATEGORY_ESCAPE, SPELL_CATEGORY_MATTER])],
    [6, new Set([SPELL_CATEGORY_HEALING, SPELL_CATEGORY_DIVINATION, SPELL_CATEGORY_CLERICAL])],
    [7, new Set([SPELL_CATEGORY_DIVINATION, SPELL_CATEGORY_ESCAPE, SPELL_CATEGORY_MATTER])],
    [8, new Set([SPELL_CATEGORY_HEALING, SPELL_CATEGORY_DIVINATION, SPELL_CATEGORY_ESCAPE])],
    [9, new Set([SPELL_CATEGORY_ATTACK, SPELL_CATEGORY_DIVINATION, SPELL_CATEGORY_CLERICAL])],
    [10, new Set([SPELL_CATEGORY_DIVINATION, SPELL_CATEGORY_ENCHANTMENT, SPELL_CATEGORY_ESCAPE])],
    [11, new Set([SPELL_CATEGORY_ATTACK, SPELL_CATEGORY_ESCAPE])],
    [12, new Set([SPELL_CATEGORY_ATTACK, SPELL_CATEGORY_HEALING, SPELL_CATEGORY_DIVINATION, SPELL_CATEGORY_ENCHANTMENT, SPELL_CATEGORY_CLERICAL, SPELL_CATEGORY_ESCAPE, SPELL_CATEGORY_MATTER])],
]);

const HEALING_BONUS_SPELLS = new Set([
    'healing',
    'extra healing',
    'cure blindness',
    'cure sickness',
    'restore ability',
    'remove curse',
]);

function spellCategoryForName(name) {
    return SPELL_CATEGORY_BY_NAME.get(String(name || '').toLowerCase()) || SPELL_CATEGORY_MATTER;
}

function spellSkillRank(player, category) {
    const basic = ROLE_BASIC_SPELL_CATEGORIES.get(player.roleIndex);
    return basic?.has(category) ? SPELL_SKILL_BASIC : SPELL_SKILL_UNSKILLED;
}

function spellRetentionText(turnsLeft, skillRank) {
    if (turnsLeft < 1) return '(gone)';
    if (turnsLeft >= SPELL_KEEN_TURNS) return '100%';
    const percent = Math.floor((turnsLeft - 1) / (SPELL_KEEN_TURNS / 100)) + 1;
    const accuracy = skillRank >= SPELL_SKILL_BASIC ? 10 : 25;
    const hi = Math.min(100, accuracy * Math.floor((percent + accuracy - 1) / accuracy));
    const lo = Math.max(1, hi - accuracy + 1);
    return `${lo}%-${hi}%`;
}

function estimateSpellFailPercent(player, spellName, spellLevel, category) {
    const role = ROLE_SPELLCAST.get(player.roleIndex)
        || { spelbase: 10, spelheal: 0, spelshld: 2, spelarmr: 10, spelstat: A_INT, spelspec: '', spelsbon: 0 };
    const statValue = Math.max(3, Math.min(25, Number(player.attributes?.[role.spelstat] || 10)));
    const spellSkill = spellSkillRank(player, category);
    const heroLevel = Math.max(1, Number(player.level || 1));
    const spellLvl = Math.max(1, Number(spellLevel || 1));

    const paladinBonus = player.roleIndex === 4 && category === SPELL_CATEGORY_CLERICAL;
    const armor = player.armor || null;
    const cloak = player.cloak || null;
    const shield = player.shield || null;
    const helmet = player.helmet || null;
    const gloves = player.gloves || null;
    const boots = player.boots || null;
    const weapon = player.weapon || null;

    let splcaster = role.spelbase;
    if (armor && is_metallic(armor) && !paladinBonus) {
        splcaster += (cloak?.otyp === ROBE) ? Math.floor(role.spelarmr / 2) : role.spelarmr;
    } else if (cloak?.otyp === ROBE) {
        splcaster -= role.spelarmr;
    }
    if (shield) splcaster += role.spelshld;
    if (weapon?.otyp === QUARTERSTAFF) splcaster -= 3;
    if (!paladinBonus) {
        if (helmet && is_metallic(helmet)) splcaster += 4;
        if (gloves && is_metallic(gloves)) splcaster += 6;
        if (boots && is_metallic(boots)) splcaster += 2;
    }
    if (String(spellName || '').toLowerCase() === role.spelspec) splcaster += role.spelsbon;
    if (HEALING_BONUS_SPELLS.has(String(spellName || '').toLowerCase())) splcaster += role.spelheal;
    splcaster = Math.min(20, splcaster);

    let chance = Math.floor((11 * statValue) / 2);
    const skill = Math.max(spellSkill, SPELL_SKILL_UNSKILLED) - 1;
    const difficulty = ((spellLvl - 1) * 4) - ((skill * 6) + Math.floor(heroLevel / 3) + 1);
    if (difficulty > 0) {
        chance -= Math.floor(Math.sqrt((900 * difficulty) + 2000));
    } else {
        chance += Math.min(20, Math.floor((15 * -difficulty) / spellLvl));
    }
    chance = Math.max(0, Math.min(120, chance));

    const shieldWeight = Number(objectData[shield?.otyp]?.weight || 0);
    const smallShieldWeight = Number(objectData[SMALL_SHIELD]?.weight || 40);
    if (shield && shieldWeight > smallShieldWeight) {
        chance = (String(spellName || '').toLowerCase() === role.spelspec)
            ? Math.floor(chance / 2)
            : Math.floor(chance / 4);
    }

    chance = Math.floor((chance * (20 - splcaster)) / 15) - splcaster;
    chance = Math.max(0, Math.min(100, chance));
    return Math.max(0, Math.min(99, 100 - chance));
}

// C ref: spell.c age_spells() — decrement spell retention each turn
export function ageSpells(player) {
    const spells = player.spells;
    if (!spells) return;
    for (const s of spells) {
        if (s.sp_know > 0) s.sp_know--;
    }
}

// C ref: spell.c dospellmenu() — display known spells
export async function handleKnownSpells(player, display) {
    const knownSpells = (player.spells || []).filter(s => s.sp_know > 0);
    if (knownSpells.length === 0) {
        display.putstr_message("You don't know any spells right now.");
        return { moved: false, tookTime: false };
    }

    const win = create_nhwindow(NHW_MENU);
    try {
    const rows = ['Currently known spells', ''];
    const showTurns = !!player.wizard;
    rows.push(showTurns
        ? '    Name                 Level Category     Fail Retention  turns'
        : '    Name                 Level Category     Fail Retention');

    for (let i = 0; i < knownSpells.length && i < 52; i++) {
        const sp = knownSpells[i];
        const od = objectData[sp.otyp] || null;
        const spellName = String(od?.name || 'unknown spell').toLowerCase();
        const spellLevel = Math.max(1, Number(od?.oc2 || sp.sp_lev || 1));
        const category = spellCategoryForName(spellName);
        const skillRank = spellSkillRank(player, category);
        const turnsLeft = Math.max(0, sp.sp_know);
        const fail = estimateSpellFailPercent(player, spellName, spellLevel, category);
        const retention = spellRetentionText(turnsLeft, skillRank);
        const menuLet = i < 26 ? String.fromCharCode('a'.charCodeAt(0) + i) : String.fromCharCode('A'.charCodeAt(0) + i - 26);
        const base = `${menuLet} - ${spellName.padEnd(20)}  ${String(spellLevel).padStart(2)}   ${category.padEnd(12)} ${String(fail).padStart(3)}% ${retention.padStart(9)}`;
        rows.push(showTurns ? `${base}  ${String(turnsLeft).padStart(5)}` : base);
    }
    rows.push('+ - [sort spells]');
    rows.push('(end)');

    if (typeof display.renderOverlayMenu === 'function') {
        display.renderOverlayMenu(rows);
    } else {
        display.renderChargenMenu(rows, false);
    }

    while (true) {
        const ch = await nhgetch();
        if (ch === 32 || ch === 27 || ch === 10 || ch === 13) break;
    }
    if (typeof display.clearRow === 'function') display.clearRow(0);
    display.topMessage = null;
    display.messageNeedsMore = false;
    return { moved: false, tookTime: false };
    } finally {
        destroy_nhwindow(win);
    }
}
