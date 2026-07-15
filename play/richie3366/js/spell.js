// spell.js — Known spells / + menu / cast / initial inventory learning.
// C ref: spell.c initialspell, study_book, dovspell, dospellmenu,
//        percent_success, spellretention, spelltypemnemonic,
//        spell_skilltype, skill_based_spellbook_id, docast, getspell,
//        rejectcasting, spelleffects_check, spelleffects.
//
// Branch envelope: spl_book init; initialspell from ini_inv_use_obj;
// study_book blank + already-known refresh yn + delay/too_hard gate +
// begin-memorize; dovspell VIEW menu; Wizard skill_based_spellbook_id;
// Z/#cast → getspell CAST → spelleffects_check + SPE_HEALING self-zap.
// Named omissions: study occupation/learn; novel/tribute; dull sleep;
// cursed_book/confused_book bodies; swap/sort; other spelleffects otyps;
// directional weffects; spell_backfire; amulet drain; CQ_REPEAT.

import { game } from './gstate.js';
import { nhgetch } from './input.js';
import { flush_screen, pline, docrt } from './display.js';
import { paint_corner_nhw_menu, discover_object } from './invent.js';
import { yn_function } from './getline.js';
import { ATR_INVERSE, NO_COLOR } from './terminal.js';
import { weight, mksobj } from './mkobj.js';
import { acurr, A_WIS, A_STR, A_INT, exercise } from './attrib.js';
import { SPBOOK_CLASS } from './objects.js';
import { rnd } from './rng.js';
import { morehungry } from './eat.js';
import { zapyourself } from './zap.js';
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
    ECMD_OK,
    ECMD_TIME,
    ECMD_FAIL,
} from './const.js';
import { objectNames, objectNameStrs } from './generated/objects_data.js';
import { PM_KNIGHT, PM_WIZARD } from './generated/monsters_data.js';

/** C ref: spell.h NO_SPELL / UNKNOWN_SPELL / SPELL_LEV_PW */
export const NO_SPELL = 0;
const UNKNOWN_SPELL = -1;
export function SPELL_LEV_PW(lvl) {
    return (lvl | 0) * 5;
}

/** C ref: objclass.h MAXSPELL = LAST_SPELL - FIRST_SPELL + 1 */
const FIRST_SPELL_OTYP = objectNames.indexOf('SPE_DIG');
const LAST_SPELL_OTYP = objectNames.indexOf('SPE_BLANK_PAPER');
export const MAXSPELL = LAST_SPELL_OTYP - FIRST_SPELL_OTYP + 1;

/** C ref: spell.c KEEN */
const KEEN = 20000;

/** C ref: spell.c SPELLMENU_* */
const SPELLMENU_CAST = -2;
const SPELLMENU_VIEW = -1;
const SPELLMENU_SORT = MAXSPELL;

const SPE_HEALING = objectNames.indexOf('SPE_HEALING');
const SPE_EXTRA_HEALING = objectNames.indexOf('SPE_EXTRA_HEALING');
const SPE_DETECT_FOOD = objectNames.indexOf('SPE_DETECT_FOOD');
const SPE_RESTORE_ABILITY = objectNames.indexOf('SPE_RESTORE_ABILITY');
const SPE_BLANK_PAPER = objectNames.indexOf('SPE_BLANK_PAPER');
const SPE_NOVEL = objectNames.indexOf('SPE_NOVEL');
const SPE_BOOK_OF_THE_DEAD = objectNames.indexOf('SPE_BOOK_OF_THE_DEAD');
const QUARTERSTAFF = objectNames.indexOf('QUARTERSTAFF');
const LENSES = objectNames.indexOf('LENSES');

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
 * C ref: spell.c study_book()
 * Branch envelope: blank paper; already-known refresh yn (KEEN/10);
 * delay by oc_level; uncursed rnd(20) fail gate; begin-memorize return.
 * Named omissions: dull-book sleep; interrupted continue; novel/tribute;
 * cursed_book / confused_book bodies; set_occupation(learn) multi-turn
 * study (refresh/accept and first learn return TIME without occupation).
 * @returns {Promise<number>} 1 = took time, 0 = cancel / no time
 */
export async function study_book(spellbook) {
    if (!spellbook) return 0;
    const booktype = spellbook.otyp | 0;
    const confused = !!(game.u?.Confusion);

    // dull descr sleep deferred (objdescr_is "dull")
    // interrupted continue deferred

    if (booktype === SPE_BLANK_PAPER) {
        await pline('This spellbook is all blank.');
        discover_object(booktype, true, true);
        return 1;
    }
    if (booktype === SPE_NOVEL) {
        // read_tribute deferred
        await pline('That novel is not implemented yet.');
        return 0;
    }

    const oc = game.objects?.[booktype];
    const oc_level = oc?.oc_level | 0;
    const oc_delay = oc?.oc_delay | 0;
    let delay;
    switch (oc_level) {
    case 1:
    case 2:
        delay = -oc_delay;
        break;
    case 3:
    case 4:
        delay = -(oc_level - 1) * oc_delay;
        break;
    case 5:
    case 6:
        delay = -oc_level * oc_delay;
        break;
    case 7:
        delay = -8 * oc_delay;
        break;
    default:
        return 0;
    }
    if (!game.context) game.context = {};
    if (!game.context.spbook) game.context.spbook = {};
    game.context.spbook.delay = delay;

    let i;
    for (i = 0; i < MAXSPELL; i++) {
        if (spellid(i) === booktype || spellid(i) === NO_SPELL) break;
    }
    if (spellid(i) === booktype && spellknow(i) > Math.trunc(KEEN / 10)) {
        const name = objectNameStrs[booktype] || 'spell';
        await pline(`You know "${name}" quite well already.`);
        // C: makeknown(booktype)
        discover_object(booktype, true, true);
        if ((await yn_function('Refresh your memory anyway?', 'yn', 'n')) === 'n') {
            return 0;
        }
    }

    spellbook.in_use = true;
    let too_hard = false;
    if (!spellbook.blessed && booktype !== SPE_BOOK_OF_THE_DEAD) {
        if (spellbook.cursed) {
            too_hard = true;
        } else {
            const ublindf = game.u?.ublindf;
            let read_ability = acurr(A_INT) + 4
                + Math.trunc((game.u?.ulevel || 1) / 2)
                - 2 * oc_level
                + ((ublindf && ublindf.otyp === LENSES) ? 2 : 0);
            if (game.urole?.mnum === PM_WIZARD && read_ability < 20 && !confused) {
                const qbuf = `This spellbook is ${
                    read_ability < 12 ? 'very ' : ''
                }difficult to comprehend.  Continue?`;
                if ((await yn_function(qbuf, 'yn', 'n')) !== 'y') {
                    spellbook.in_use = false;
                    return 1;
                }
            }
            if (rnd(20) > read_ability) too_hard = true;
        }
    }

    if (too_hard) {
        // cursed_book / useup / nomul deferred
        spellbook.in_use = false;
        game.context.spbook.delay = 0;
        return 1;
    }
    if (confused) {
        // confused_book deferred
        spellbook.in_use = false;
        game.context.spbook.delay = 0;
        return 1;
    }
    spellbook.in_use = false;

    await pline(`You begin to ${
        booktype === SPE_BOOK_OF_THE_DEAD ? 'recite' : 'memorize'
    } the runes.`);
    game.context.spbook.book = spellbook;
    game.context.spbook.o_id = spellbook.o_id ?? 0;
    // set_occupation(learn) deferred — still ECMD_TIME
    return 1;
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

/** C ref: invent.c freehand — either hand free. */
function freehand() {
    const u = game.u || {};
    if (!u.uwep) return true;
    const big = !!(game.objects?.[u.uwep.otyp]?.oc_big);
    if (!big) return true;
    return !u.uswapwep;
}

/** C ref: mondata.c can_chant — hero subset (Strangled / silent / head). */
function can_chant() {
    if (game.u?.Strangled) return false;
    // Poly silent/headless deferred — starting human/priest always ok
    return true;
}

/** C ref: spell.c rejectcasting */
function rejectcasting() {
    if (game.u?.Stunned) return true;
    if (!can_chant()) return true;
    if (!freehand() && !(game.u?.uwep && game.u.uwep.otyp === QUARTERSTAFF)) {
        return true;
    }
    return false;
}

/** C ref: spell.c num_spells */
export function num_spells() {
    let i;
    for (i = 0; i < MAXSPELL; i++) {
        if (spellid(i) === NO_SPELL) break;
    }
    return i;
}

/** C ref: spell.c spell_idx */
function spell_idx(otyp) {
    for (let i = 0; i < MAXSPELL && spellid(i) !== NO_SPELL; i++) {
        if (spellid(i) === otyp) return i;
    }
    return UNKNOWN_SPELL;
}

/**
 * C ref: weapon.c use_skill — advance practice; may-advance msg deferred.
 * Local copy avoids weapon.js ↔ spell.js import cycle.
 */
function use_skill(skill, degree) {
    if (skill === P_NONE) return;
    const ws = game.u?.weapon_skills?.[skill];
    if (!ws || ws.skill === P_ISRESTRICTED) return;
    ws.advance = (ws.advance || 0) + (degree | 0);
}

/**
 * C ref: cmd.c getdir for spell cast — '.' is self (success), not cancel.
 * Esc/space/return cancel with dx=dy=dz=0 (C then releases energy at self).
 */
async function getdir_spell() {
    const msg = 'In what direction?';
    game._pending_message = `${msg} `;
    await flush_screen(1);
    const disp = game.nhDisplay;
    if (disp?.setCursor) disp.setCursor(game._pending_message.length, 0);
    const key = await nhgetch();
    const ch = String.fromCharCode(key);
    game._pending_message = '';
    if (!game.u) game.u = {};
    if (ch === '.') {
        game.u.dx = game.u.dy = game.u.dz = 0;
        return true;
    }
    if (key === 27 || ch === ' ' || ch === '\n' || ch === '\r') {
        game.u.dx = game.u.dy = game.u.dz = 0;
        return false;
    }
    const DIR_DX = { h: -1, l: 1, j: 0, k: 0, y: -1, u: 1, b: -1, n: 1 };
    const DIR_DY = { h: 0, l: 0, j: 1, k: -1, y: -1, u: -1, b: 1, n: 1 };
    if (!(ch in DIR_DX)) {
        game.u.dx = game.u.dy = game.u.dz = 0;
        return false;
    }
    game.u.dx = DIR_DX[ch];
    game.u.dy = DIR_DY[ch];
    game.u.dz = 0;
    return true;
}

/**
 * C ref: spell.c dospellmenu — VIEW / CAST (PICK_NONE / PICK_ONE + sort).
 * Returns { ok, splnum }; ok false = cancel.
 * VIEW: swap/sort deferred — letter/`+` treated as cancel.
 * CAST: letter returns ok:true with splnum.
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
            if (splaction === SPELLMENU_CAST) {
                return { ok: true, splnum: hit.splnum };
            }
            // VIEW swap/sort bodies deferred — treat as cancel (Esc path)
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

/**
 * C ref: spell.c getspell — pick spell index; menu_style non-traditional → CAST menu.
 * @returns {Promise<number|null>} spell book index or null
 */
async function getspell() {
    const nspells = num_spells();
    if (!nspells) {
        await pline("You don't know any spells right now.");
        return null;
    }
    if (rejectcasting()) {
        if (game.u?.Stunned) {
            await pline('You are too impaired to cast a spell.');
        } else if (!can_chant()) {
            await pline('You are unable to chant the incantation.');
        } else {
            await pline('Your arms are not free to cast!');
        }
        return null;
    }
    // Traditional yn-path deferred; contest default uses menu
    const picked = await dospellmenu('Choose which spell to cast', SPELLMENU_CAST);
    if (!picked.ok) return null;
    return picked.splnum;
}

/**
 * C ref: spell.c spelleffects_check
 * @returns {Promise<{abort: boolean, res: number, energy: number}>}
 */
async function spelleffects_check(spell) {
    const confused = !!(game.u?.Confusion);
    let energy = 0;
    let res = ECMD_OK;

    if (spell === UNKNOWN_SPELL || rejectcasting()) {
        return { abort: true, res: ECMD_OK, energy: 0 };
    }

    energy = SPELL_LEV_PW(spellev(spell));

    if (spellknow(spell) <= 0) {
        // spell_backfire deferred — still burn some energy like C
        await pline('Your knowledge of this spell is twisted.');
        await pline('It invokes nightmarish images in your mind...');
        game.u.uen = Math.max(0, (game.u.uen ?? 0) - rnd(energy));
        if (game.flags) game.flags.botl = true;
        return { abort: true, res: ECMD_TIME, energy };
    } else if (spellknow(spell) <= Math.trunc(KEEN / 200)) {
        await pline('You strain to recall the spell.');
    } else if (spellknow(spell) <= Math.trunc(KEEN / 40)) {
        await pline('You have difficulty remembering the spell.');
    } else if (spellknow(spell) <= Math.trunc(KEEN / 20)) {
        await pline('Your knowledge of this spell is growing faint.');
    } else if (spellknow(spell) <= Math.trunc(KEEN / 10)) {
        await pline('Your recall of this spell is gradually fading.');
    }

    if ((game.u.uhunger ?? 900) <= 10 && spellid(spell) !== SPE_DETECT_FOOD) {
        await pline('You are too hungry to cast that spell.');
        return { abort: true, res: ECMD_OK, energy };
    }
    if (acurr(A_STR) < 4 && spellid(spell) !== SPE_RESTORE_ABILITY) {
        await pline('You lack the strength to cast spells.');
        return { abort: true, res: ECMD_OK, energy };
    }
    // check_capacity deferred

    // Amulet of Yendor drain deferred

    if (energy > (game.u.uen ?? 0)) {
        await pline("You don't have enough energy to cast that spell.");
        return { abort: true, res, energy };
    }

    if (spellid(spell) !== SPE_DETECT_FOOD) {
        let hungr = energy * 2;
        let intell = acurr(A_INT);
        if (game.urole?.mnum !== PM_WIZARD) intell = 10;
        switch (intell) {
        case 25: case 24: case 23: case 22: case 21:
        case 20: case 19: case 18: case 17:
            hungr = 0;
            break;
        case 16:
            hungr = Math.trunc(hungr / 4);
            break;
        case 15:
            hungr = Math.trunc(hungr / 2);
            break;
        default:
            break;
        }
        if (hungr > (game.u.uhunger ?? 900) - 3) {
            hungr = (game.u.uhunger ?? 900) - 3;
        }
        morehungry(hungr);
    }

    const chance = percent_success(spell);
    if (confused || (rnd(100) > chance)) {
        await pline('You fail to cast the spell correctly.');
        game.u.uen = (game.u.uen ?? 0) - Math.trunc(energy / 2);
        if (game.flags) game.flags.botl = true;
        return { abort: true, res: ECMD_TIME, energy };
    }
    return { abort: false, res: ECMD_OK, energy };
}

/**
 * C ref: spell.c spelleffects
 * Branch envelope: SPE_HEALING / SPE_EXTRA_HEALING directional self-zap.
 * Other otyps named omission (return TIME after energy spent + exercise).
 */
async function spelleffects(spell_otyp, atme, force) {
    const spell = force ? spell_otyp : spell_idx(spell_otyp);
    let energy = 0;

    if (!force) {
        const chk = await spelleffects_check(spell);
        energy = chk.energy;
        if (chk.abort) return chk.res;
    }

    game.u.uen = (game.u.uen ?? 0) - energy;
    if (game.flags) game.flags.botl = true;
    exercise(A_WIS, true);

    // C: mksobj(force ? spell : spellid(spell), FALSE, FALSE)
    const otyp = force ? spell : spellid(spell);
    const pseudo = mksobj(otyp, false, false);
    pseudo.blessed = false;
    pseudo.cursed = false;
    pseudo.quan = 20;

    const skill = spell_skilltype(otyp);
    const role_skill = P_SKILL(skill);

    if (otyp === SPE_HEALING || otyp === SPE_EXTRA_HEALING) {
        if (role_skill >= P_SKILLED) pseudo.blessed = true;
        if (atme) {
            game.u.dx = game.u.dy = game.u.dz = 0;
        } else if (!(await getdir_spell())) {
            await pline('The magical energy is released!');
        }
        if (!game.u.dx && !game.u.dy && !game.u.dz) {
            await zapyourself(pseudo, true);
        }
        // else weffects deferred — directional heal on monster
    } else {
        // Other spell otyps deferred after energy/exercise/mksobj RNG
        await pline('Nothing happens.');
    }

    if (!force) use_skill(skill, spellev(spell));
    return ECMD_TIME;
}

/**
 * C ref: spell.c docast / #cast ('Z')
 * @returns {Promise<number>} ECMD_*
 */
export async function docast() {
    const spell_no = await getspell();
    if (spell_no == null) return ECMD_FAIL;
    // CQ_REPEAT spellet deferred
    return spelleffects(spellid(spell_no), false, false);
}

