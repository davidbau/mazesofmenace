// spell.js — Known spells / + menu / initial inventory learning.
// C ref: spell.c initialspell, dovspell, dospellmenu, percent_success,
//        spellretention, spelltypemnemonic, spell_skilltype,
//        skill_based_spellbook_id.
//
// Branch envelope: spl_book init; initialspell from ini_inv_use_obj;
// dovspell VIEW menu; Wizard skill_based_spellbook_id from skill_init /
// spell-skill advance; Esc cancel; swap/sort bodies deferred; cast/docast
// deferred.

import { game } from './gstate.js';
import { nhgetch } from './input.js';
import { flush_screen, pline, docrt } from './display.js';
import { paint_corner_nhw_menu, discover_object } from './invent.js';
import { ATR_INVERSE, NO_COLOR } from './terminal.js';
import { weight } from './mkobj.js';
import { acurr, A_WIS } from './attrib.js';
import { SPBOOK_CLASS } from './objects.js';
import {
    P_NONE,
    P_ATTACK_SPELL,
    P_HEALING_SPELL,
    P_DIVINATION_SPELL,
    P_ENCHANTMENT_SPELL,
    P_CLERIC_SPELL,
    P_ESCAPE_SPELL,
    P_MATTER_SPELL,
    P_UNSKILLED,
    P_BASIC,
    P_SKILLED,
    P_EXPERT,
    P_MASTER,
    P_GRAND_MASTER,
    P_ISRESTRICTED,
} from './const.js';
import { objectNames, objectNameStrs } from './generated/objects_data.js';
import { PM_KNIGHT, PM_WIZARD } from './generated/monsters_data.js';

/** C ref: spell.h NO_SPELL */
export const NO_SPELL = 0;

/** C ref: objclass.h MAXSPELL = LAST_SPELL - FIRST_SPELL + 1 */
const FIRST_SPELL_OTYP = objectNames.indexOf('SPE_DIG');
const LAST_SPELL_OTYP = objectNames.indexOf('SPE_BLANK_PAPER');
export const MAXSPELL = LAST_SPELL_OTYP - FIRST_SPELL_OTYP + 1;

/** C ref: spell.c KEEN */
const KEEN = 20000;

/** C ref: spell.c SPELLMENU_* */
const SPELLMENU_VIEW = -1;
const SPELLMENU_SORT = MAXSPELL;

const IRON = 11;
const MITHRIL = 17;
const uarmhbon = 4;
const uarmgbon = 6;
const uarmfbon = 2;

function otypByName(name) {
    const i = objectNames.indexOf(name);
    return i >= 0 ? i : 0;
}

/** C ref: hacklib.c isqrt */
function isqrt(val) {
    let rt = 0;
    let odd = 1;
    let v = val | 0;
    while (v >= odd) {
        v -= odd;
        odd += 2;
        rt++;
    }
    return rt;
}

function padR(width, s) {
    s = String(s);
    return s.length >= width ? s : s + ' '.repeat(width - s.length);
}
function padL(width, s) {
    s = String(s);
    return s.length >= width ? s : ' '.repeat(width - s.length) + s;
}

/** C ref: spell.h spellid / spellknow; spell.c spellev / spellname / spellet */
export function spellid(i) {
    return game.spl_book?.[i]?.sp_id ?? NO_SPELL;
}
function spellknow(i) {
    return game.spl_book?.[i]?.sp_know ?? 0;
}
function spellev(i) {
    return game.spl_book?.[i]?.sp_lev ?? 0;
}
function spellname(i) {
    const otyp = spellid(i);
    return objectNameStrs[otyp] || '';
}
function spellet(i) {
    return i < 26
        ? String.fromCharCode('a'.charCodeAt(0) + i)
        : String.fromCharCode('A'.charCodeAt(0) + i - 26);
}

function P_SKILL(type) {
    return game.u?.weapon_skills?.[type]?.skill ?? P_ISRESTRICTED;
}

/** C ref: spell.c spell_skilltype */
export function spell_skilltype(booktype) {
    return game.objects?.[booktype]?.oc_skill ?? 0;
}

/**
 * C ref: spell.c skill_based_spellbook_id — Wizards ID spellbooks by school
 * skill without marking them encountered (disco shows '* ').
 * Called from skill_init and after advancing a spell skill.
 */
export function skill_based_spellbook_id() {
    if (game.urole?.mnum !== PM_WIZARD) return;

    const bases = game.bases || [];
    const start = bases[SPBOOK_CLASS] || 0;
    const end = bases[SPBOOK_CLASS + 1] || (game.objects?.length ?? 0);
    const pauper = !!game.u?.uroleplay?.pauper;

    for (let booktype = start; booktype < end; booktype++) {
        const skill = spell_skilltype(booktype);
        if (skill === P_NONE) continue;

        let known_up_to_level;
        switch (P_SKILL(skill)) {
        case P_BASIC:
            known_up_to_level = 3;
            break;
        case P_SKILLED:
            known_up_to_level = 5;
            break;
        case P_EXPERT:
        case P_MASTER:
        case P_GRAND_MASTER:
            known_up_to_level = 7;
            break;
        case P_UNSKILLED:
        default:
            // C: paupers need more skill; most wizards know the basics
            known_up_to_level = pauper ? 0 : 1;
            break;
        }

        const oc_level = game.objects?.[booktype]?.oc_level ?? 0;
        if (oc_level <= known_up_to_level) {
            // C: discover_object(booktype, TRUE, FALSE, FALSE)
            discover_object(booktype, true, false);
        }
    }
}

/** C ref: objclass.h is_metallic */
function is_metallic(obj) {
    if (!obj) return false;
    const mat = game.objects?.[obj.otyp]?.oc_material ?? 0;
    return mat >= IRON && mat <= MITHRIL;
}

/** C ref: spell.c spelltypemnemonic */
function spelltypemnemonic(skill) {
    switch (skill) {
    case P_ATTACK_SPELL: return 'attack';
    case P_HEALING_SPELL: return 'healing';
    case P_DIVINATION_SPELL: return 'divination';
    case P_ENCHANTMENT_SPELL: return 'enchantment';
    case P_CLERIC_SPELL: return 'clerical';
    case P_ESCAPE_SPELL: return 'escape';
    case P_MATTER_SPELL: return 'matter';
    default: return '';
    }
}

/**
 * C ref: u_init.c / spell.c — zero svs.spl_book[].sp_id to NO_SPELL.
 * Call once per new game before ini_inv_use_obj.
 */
export function init_spl_book() {
    game.spl_book = Array.from({ length: MAXSPELL + 1 }, () => ({
        sp_id: NO_SPELL,
        sp_lev: 0,
        sp_know: 0,
    }));
    game.spl_orderindx = null;
    game.spl_sortmode = 0; // SORTBY_LETTER
}

/**
 * C ref: spell.c initialspell — learn spellbook otyp during ini_inv_use_obj.
 */
export function initialspell(obj) {
    if (!obj) return;
    const otyp = obj.otyp;
    if (!game.spl_book) init_spl_book();

    let i;
    for (i = 0; i < MAXSPELL; i++) {
        if (spellid(i) === NO_SPELL || spellid(i) === otyp) break;
    }
    if (i === MAXSPELL) {
        // C: impossible("Too many spells memorized!");
        return;
    }
    if (spellid(i) !== NO_SPELL) {
        // C: impossible duplicate in initial inventory
        return;
    }
    game.spl_book[i].sp_id = otyp;
    game.spl_book[i].sp_lev = game.objects?.[otyp]?.oc_level ?? 0;
    // C: incrnknow(i, 0) → KEEN + 0
    game.spl_book[i].sp_know = KEEN;
}

/**
 * C ref: spell.c percent_success — cast chance for Fail% column.
 * Branch envelope: robe/shield/metal/spelspec/healing bonuses; no
 * oversized-shield awkwardness when weight ≤ SMALL_SHIELD.
 */
function percent_success(spell) {
    const urole = game.urole || {};
    const skilltype = spell_skilltype(spellid(spell));
    const paladin_bonus = (urole.mnum === PM_KNIGHT
        && skilltype === P_CLERIC_SPELL);

    let splcaster = urole.spelbase ?? 0;
    const special = urole.spelheal ?? 0;
    const statused = acurr(urole.spelstat ?? A_WIS);

    const uarm = game.u?.uarm;
    const uarmc = game.u?.uarmc;
    const uarms = game.u?.uarms;
    const uarmh = game.u?.uarmh;
    const uarmg = game.u?.uarmg;
    const uarmf = game.u?.uarmf;
    const uwep = game.u?.uwep;
    const spelarmr = urole.spelarmr ?? 0;

    if (uarm && is_metallic(uarm) && !paladin_bonus) {
        splcaster += (uarmc && objectNames[uarmc.otyp] === 'ROBE')
            ? Math.trunc(spelarmr / 2)
            : spelarmr;
    } else if (uarmc && objectNames[uarmc.otyp] === 'ROBE') {
        splcaster -= spelarmr;
    }
    if (uarms) splcaster += urole.spelshld ?? 0;

    if (uwep && objectNames[uwep.otyp] === 'QUARTERSTAFF') splcaster -= 3;

    if (!paladin_bonus) {
        if (uarmh && is_metallic(uarmh)) splcaster += uarmhbon;
        if (uarmg && is_metallic(uarmg)) splcaster += uarmgbon;
        if (uarmf && is_metallic(uarmf)) splcaster += uarmfbon;
    }

    if (spellid(spell) === (urole.spelspec | 0)) {
        splcaster += urole.spelsbon ?? 0;
    }

    const sid = spellid(spell);
    if (sid === otypByName('SPE_HEALING')
        || sid === otypByName('SPE_EXTRA_HEALING')
        || sid === otypByName('SPE_CURE_BLINDNESS')
        || sid === otypByName('SPE_CURE_SICKNESS')
        || sid === otypByName('SPE_RESTORE_ABILITY')
        || sid === otypByName('SPE_REMOVE_CURSE')) {
        splcaster += special;
    }

    if (splcaster > 20) splcaster = 20;

    let chance = Math.trunc((11 * statused) / 2);
    let skill = P_SKILL(skilltype);
    skill = Math.max(skill, P_UNSKILLED) - 1;
    const difficulty = (spellev(spell) - 1) * 4
        - ((skill * 6) + Math.trunc((game.u?.ulevel ?? 1) / 3) + 1);

    if (difficulty > 0) {
        chance -= isqrt(900 * difficulty + 2000);
    } else {
        let learning = Math.trunc((15 * -difficulty) / spellev(spell));
        chance += learning > 20 ? 20 : learning;
    }

    if (chance < 0) chance = 0;
    if (chance > 120) chance = 120;

    const smallShield = otypByName('SMALL_SHIELD');
    const smallWt = game.objects?.[smallShield]?.oc_weight ?? 0;
    if (uarms && weight(uarms) > smallWt) {
        if (spellid(spell) === (urole.spelspec | 0)) chance = Math.trunc(chance / 2);
        else chance = Math.trunc(chance / 4);
    }

    chance = Math.trunc((chance * (20 - splcaster)) / 15) - splcaster;
    if (chance > 100) chance = 100;
    if (chance < 0) chance = 0;
    return chance;
}

/** C ref: spell.c spellretention */
function spellretention(idx) {
    let skill = P_SKILL(spell_skilltype(spellid(idx)));
    skill = Math.max(skill, P_UNSKILLED);
    const turnsleft = spellknow(idx) | 0;

    if (turnsleft < 1) return '(gone)';
    if (turnsleft >= KEEN) return '100%';

    let percent = Math.trunc((turnsleft - 1) / Math.trunc(KEEN / 100)) + 1;
    const accuracy = skill === P_EXPERT ? 2
        : skill === P_SKILLED ? 5
            : skill === P_BASIC ? 10
                : 25;
    percent = accuracy * (Math.trunc((percent - 1) / accuracy) + 1);
    return `${percent - accuracy + 1}%-${percent}%`;
}

/**
 * C ref: spell.c dospellmenu — VIEW path (PICK_NONE / PICK_ONE + sort).
 * Returns { ok, splnum }; ok false = cancel.
 * Swap/sort deferred: selecting a spell or '+' exits like Esc for now
 * after one confirm would be needed — letter/`+` treated as cancel so
 * Esc-only sessions stay faithful; named omission in C-JS-MAP.
 */
async function dospellmenu(prompt, splaction) {
    // C tty menu_headings: ATR_INVERSE on label words; padding between
    // %-20 / %-12 columns stays normal (observed seed0106 recording).
    const headingParts = [
        { text: '    Name', attr: ATR_INVERSE },
        { text: '                 ', attr: 0 }, // rest of %-20s + ' ' before Level
        { text: 'Level Category', attr: ATR_INVERSE },
        { text: '     ', attr: 0 }, // Category pad + ' ' before Fail
        { text: 'Fail Retention', attr: ATR_INVERSE },
    ];
    const heading = headingParts.map((p) => p.text).join('');
    const entries = [
        { text: prompt, attr: ATR_INVERSE },
        { text: '', attr: 0 },
        { text: heading, attr: 0 },
    ];
    const choices = [];

    for (let i = 0; i < MAXSPELL && spellid(i) !== NO_SPELL; i++) {
        const splnum = i; // no spl_orderindx yet
        const fail = 100 - percent_success(splnum);
        const line = `${padR(20, spellname(splnum))}  ${padL(2, spellev(splnum))}   `
            + `${padR(12, spelltypemnemonic(spell_skilltype(spellid(splnum))))} `
            + `${padL(3, fail)}% ${padL(9, spellretention(splnum))}`;
        const letter = spellet(splnum);
        entries.push({ text: `${letter} - ${line}`, attr: 0 });
        choices.push({ key: letter, splnum });
    }

    let howPickNone = false;
    if (splaction === SPELLMENU_VIEW) {
        if (spellid(1) === NO_SPELL) {
            howPickNone = true;
        } else {
            entries.push({ text: '+ - [sort spells]', attr: 0 });
            choices.push({ key: '+', splnum: SPELLMENU_SORT });
        }
    }

    for (;;) {
        const geom = await paint_corner_nhw_menu(entries, '(end) ');
        // Re-paint heading with C menu_headings word/pad attr splits
        const disp = game.nhDisplay;
        if (disp?.setCell && geom && geom.offx != null) {
            let col = geom.offx + 1;
            const row = 2; // prompt, blank, heading
            for (const part of headingParts) {
                for (let i = 0; i < part.text.length; i++) {
                    disp.setCell(col++, row, part.text[i], NO_COLOR, part.attr);
                }
            }
        }
        await flush_screen(1);
        const key = await nhgetch();
        game._menu_overlay = false;
        await docrt();
        await flush_screen(1);

        if (key === 27) return { ok: false, splnum: -1 };
        if (howPickNone) {
            // PICK_NONE: Esc/Return/Space dismiss
            if (key === 13 || key === 10 || key === 32) {
                return { ok: false, splnum: -1 };
            }
            continue;
        }
        // PICK_ONE: space/return with nothing preselected → cancel
        if (key === 13 || key === 10 || key === 32) {
            return { ok: false, splnum: -1 };
        }
        const ch = String.fromCharCode(key);
        const hit = choices.find((c) => c.key === ch);
        if (hit) {
            // Swap/sort bodies deferred — treat as cancel (Esc path)
            return { ok: false, splnum: hit.splnum };
        }
        // invalid → re-prompt
    }
}

/**
 * C ref: spell.c age_spells — once per hero turn, decrement spell memory.
 * Called from allmain.c moveloop after gethungry().
 */
export function age_spells() {
    if (!game.spl_book) return;
    for (let i = 0; i < MAXSPELL && spellid(i) !== NO_SPELL; i++) {
        if (spellknow(i)) game.spl_book[i].sp_know--;
    }
}

/**
 * C ref: spell.c dovspell — Currently known spells menu.
 */
export async function dovspell() {
    if (spellid(0) === NO_SPELL) {
        await pline("You don't know any spells right now.");
        return;
    }
    // VIEW loop; swap/sort deferred — first cancel exits
    await dospellmenu('Currently known spells', SPELLMENU_VIEW);
    game.spl_orderindx = null;
    game.spl_sortmode = 0;
}
