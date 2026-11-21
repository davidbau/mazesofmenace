// spell.js — spellcasting.
// C ref: spell.c
//
// Ported so far: age_spells(), initialspell(), num_spells(),
// skill_based_spellbook_id(), spell_skilltype(), and the spell menus:
// dovspell() (#showspells), docast()/getspell() (#cast) up to
// spelleffects(), dospellmenu(), spellsortmenu(), sortspells(),
// percent_success() and spellretention().

import { game } from './gstate.js';
import {
    NO_SPELL, STUNNED, STRANGLED, MENU_TRADITIONAL,
    MENU_ITEMFLAGS_NONE, MENU_ITEMFLAGS_SELECTED, MENU_BEHAVE_STANDARD,
    PICK_ONE, PICK_NONE, NHW_MENU, ECMD_OK, ECMD_FAIL,
    P_NONE, P_UNSKILLED, P_BASIC, P_SKILLED, P_EXPERT, P_MASTER,
    P_GRAND_MASTER, P_ATTACK_SPELL, P_HEALING_SPELL, P_DIVINATION_SPELL,
    P_ENCHANTMENT_SPELL, P_CLERIC_SPELL, P_ESCAPE_SPELL, P_MATTER_SPELL,
} from './const.js';
import {
    MAXSPELL, objects, OBJ_NAME, SPBOOK_CLASS, ROBE, QUARTERSTAFF,
    SMALL_SHIELD, SPE_HEALING, SPE_EXTRA_HEALING, SPE_CURE_BLINDNESS,
    SPE_CURE_SICKNESS, SPE_RESTORE_ABILITY, SPE_REMOVE_CURSE, is_metallic,
} from './objects.js';
import { NO_COLOR, ATR_NONE } from './terminal.js';
import { PM_KNIGHT, PM_WIZARD, MS_SILENT, MS_BUZZ, MS_BURBLE,
         M1_NOHEAD } from './monsters.js';
import { pline } from './display.js';
import { tty_create_nhwindow, tty_start_menu, tty_add_menu, tty_end_menu,
         tty_select_menu, tty_destroy_nhwindow } from './wintty.js';
import { add_menu_heading } from './invent.js';
import { ACURR } from './attrib.js';
import { weight } from './mkobj.js';
import { strcmpi, isqrt } from './hacklib.js';
import { P_SKILL } from './weapon.js';
import { discover_object } from './o_init.js';
import { freehand } from './wield.js';

function impossible(msg) { console.error(`impossible: ${msg}`); }

const KEEN = 20000; /* C ref: spell.c */

/* C ref: spell.h spellid(), spellknow(), decrnknow() */
function spellid(spell) { return game.spl_book[spell].sp_id; }
function spellknow(spell) { return game.spl_book[spell].sp_know; }
function decrnknow(spell) { game.spl_book[spell].sp_know--; }
/* C ref: spell.c incrnknow() */
function incrnknow(spell, x) { game.spl_book[spell].sp_know = KEEN + (x); }
/* C ref: spell.c spellev(), spellname(), spellet() */
function spellev(spell) { return game.spl_book[spell].sp_lev; }
function spellname(spell) { return OBJ_NAME(objects[spellid(spell)]); }
function spellet(spell) {
    return String.fromCharCode((spell < 26) ? (97 + spell) : (65 + spell - 26));
}

/* C ref: spell.c SPELLMENU_* */
const SPELLMENU_DUMP = -3;
const SPELLMENU_CAST = -2;
const SPELLMENU_VIEW = -1;
const SPELLMENU_SORT = MAXSPELL; /* special menu entry */

/* C ref: spell.c uarmhbon, uarmgbon, uarmfbon */
const uarmhbon = 4; /* Metal helmets interfere with the mind */
const uarmgbon = 6; /* Casting channels through the hands */
const uarmfbon = 2; /*  All metal interferes to some degree */

/* C ref: you.h Role_if() */
function Role_if(pm) { return game.urole?.mnum === pm; }
/* C ref: youprop.h Stunned, Strangled */
function u_have_prop(p) {
    const up = game.u.uprops?.[p];
    return !!(up && (up.intrinsic || up.extrinsic));
}

// C ref: spell.c age_spells()
export function age_spells() {
    let i;
    /*
     * The time relative to the hero (a pass through move
     * loop) causes all spell knowledge to be decremented.
     * The hero's speed, rest status, conscious status etc.
     * does not alter the loss of memory.
     */
    for (i = 0; i < MAXSPELL && spellid(i) !== NO_SPELL; i++)
        if (spellknow(i))
            decrnknow(i);
    return;
}

// C ref: spell.c rejectcasting()
/* return True if spellcasting is inhibited;
   only covers a small subset of reasons why casting won't work */
async function rejectcasting() {
    /* rejections which take place before selecting a particular spell */
    if (u_have_prop(STUNNED)) {
        await pline("You are too impaired to cast a spell.");
        return true;
    } else if (!can_chant(game.youmonst)) {
        await pline("You are unable to chant the incantation.");
        return true;
    } else if (!freehand() && !(game.uwep && game.uwep.otyp === QUARTERSTAFF)) {
        /* Note: !freehand() occurs when weapon and shield (or two-handed
         * weapon) are welded to hands, so "arms" probably doesn't need
         * to be makeplural(bodypart(ARM)).
         *
         * But why isn't lack of free arms (for gesturing) an issue when
         * poly'd hero has no limbs?
         */
        await pline("Your arms are not free to cast!");
        return true;
    }
    return false;
}

// C ref: mondata.c can_chant()
function can_chant(mtmp) {
    const ptr = mtmp.data;
    if ((mtmp === game.youmonst && u_have_prop(STRANGLED))
        || ptr.msound === MS_SILENT /* is_silent() */
        || (ptr.mflags1 & M1_NOHEAD) /* !has_head() */
        || ptr.msound === MS_BUZZ || ptr.msound === MS_BURBLE)
        return false;
    return true;
}

// C ref: spell.c getspell()
/*
 * Return TRUE if a spell was picked, with the spell index in the return
 * parameter.  Otherwise return FALSE.  (JS returns the index, or -1.)
 */
async function getspell() {
    let nspells;

    nspells = num_spells();
    if (!nspells) {
        await pline("You don't know any spells right now.");
        return -1;
    }
    if (await rejectcasting())
        return -1; /* no spell chosen */

    if (game.cmdq?.length)
        throw new Error('getspell(): a queued command (cmdq_pop()) is not ported yet');

    if (game.flags?.menu_style === MENU_TRADITIONAL)
        throw new Error('getspell(): menu_style:traditional is not ported yet');
    const r = await dospellmenu("Choose which spell to cast", SPELLMENU_CAST);
    return r.ok ? r.spell_no : -1;
}

// C ref: spell.c docast() -- the #cast command -- cast a spell
export async function docast() {
    const spell_no = await getspell();

    if (spell_no >= 0) {
        /* cmdq_add_key(CQ_REPEAT, spellet(spell_no)): the ^A repeat
           queue is not ported */
        return await spelleffects(game.spl_book[spell_no].sp_id, false, false);
    }
    return ECMD_FAIL;
}

// C ref: spell.c spelltypemnemonic()
function spelltypemnemonic(skill) {
    switch (skill) {
    case P_ATTACK_SPELL:
        return "attack";
    case P_HEALING_SPELL:
        return "healing";
    case P_DIVINATION_SPELL:
        return "divination";
    case P_ENCHANTMENT_SPELL:
        return "enchantment";
    case P_CLERIC_SPELL:
        return "clerical";
    case P_ESCAPE_SPELL:
        return "escape";
    case P_MATTER_SPELL:
        return "matter";
    default:
        impossible(`Unknown spell skill, ${skill};`);
        return "";
    }
}

// C ref: spell.c spell_skilltype()
export function spell_skilltype(booktype) {
    return objects[booktype].oc_skill;
}

// C ref: spell.c skill_based_spellbook_id()
export function skill_based_spellbook_id() {
    if (!Role_if(PM_WIZARD))
        return;

    let booktype;
    const spbook_class = SPBOOK_CLASS;

    for (booktype = game.bases[spbook_class];
         booktype < game.bases[spbook_class + 1];
         booktype++) {
        let known_up_to_level;
        const skill = spell_skilltype(booktype);

        if (skill === P_NONE)
            continue;

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
            /* paupers need more skill than this to ID books, but most wizards
               know the basics */
            known_up_to_level = game.u.uroleplay?.pauper ? 0 : 1;
            break;
        }

        if (objects[booktype].oc_level <= known_up_to_level)
            /* makeknown(booktype) but don't exercise Wisdom or mark as
               encountered */
            discover_object(booktype, true, false, false);
    }
}

// C ref: spell.c spelleffects() -- not ported yet
async function spelleffects(spell_otyp, atme, force) {
    void spell_otyp, atme, force;
    throw new Error('spelleffects() not ported yet');
}

/* C ref: spell.c enum spl_sort_types */
const SORTBY_LETTER = 0;
const SORTBY_ALPHA = 1;
const SORTBY_LVL_LO = 2;
const SORTBY_LVL_HI = 3;
const SORTBY_SKL_AL = 4;
const SORTBY_SKL_LO = 5;
const SORTBY_SKL_HI = 6;
const SORTBY_CURRENT = 7;
const SORTRETAINORDER = 8;

const spl_sortchoices = [
    "by casting letter",
    "alphabetically",
    "by level, low to high",
    "by level, high to low",
    "by skill group, alphabetized within each group",
    "by skill group, low to high level within group",
    "by skill group, high to low level within group",
    "maintain current ordering",
    /* a menu choice rather than a sort choice */
    "reassign casting letters to retain current order",
];

// C ref: spell.c spell_cmp() -- qsort callback routine; p1, p2 are the
// positions in spl_orderindx[] (C compares the element pointers)
function spell_cmp(indx1, indx2, p1, p2) {
    const otyp1 = game.spl_book[indx1].sp_id, otyp2 = game.spl_book[indx2].sp_id,
        levl1 = objects[otyp1].oc_level, levl2 = objects[otyp2].oc_level,
        skil1 = objects[otyp1].oc_skill, skil2 = objects[otyp2].oc_skill;

    switch (game.spl_sortmode || 0) {
    case SORTBY_LETTER:
        return indx1 - indx2;
    case SORTBY_ALPHA:
        break;
    case SORTBY_LVL_LO:
        if (levl1 !== levl2)
            return levl1 - levl2;
        break;
    case SORTBY_LVL_HI:
        if (levl1 !== levl2)
            return levl2 - levl1;
        break;
    case SORTBY_SKL_AL:
        if (skil1 !== skil2)
            return skil1 - skil2;
        break;
    case SORTBY_SKL_LO:
        if (skil1 !== skil2)
            return skil1 - skil2;
        if (levl1 !== levl2)
            return levl1 - levl2;
        break;
    case SORTBY_SKL_HI:
        if (skil1 !== skil2)
            return skil1 - skil2;
        if (levl1 !== levl2)
            return levl2 - levl1;
        break;
    case SORTBY_CURRENT:
    default:
        return (p1 < p2) ? -1 : (p1 > p2) ? 1 : 0; /* keep current order */
    }
    /* tie-breaker for most sorts--alphabetical by spell name */
    return strcmpi(OBJ_NAME(objects[otyp1]), OBJ_NAME(objects[otyp2]));
}

// C ref: spell.c sortspells()
/* sort the index used for display order of the "view known spells"
   list (sortmode == SORTBY_xxx), or sort the spellbook itself to make
   the current display order stick (sortmode == SORTRETAINORDER) */
function sortspells() {
    let i, n;
    const sortmode = game.spl_sortmode || 0;

    if (sortmode === SORTBY_CURRENT)
        return;
    for (n = 0; n < MAXSPELL && spellid(n) !== NO_SPELL; ++n)
        continue;
    if (n < 2)
        return; /* not enough entries to need sorting */

    if (!game.spl_orderindx) {
        /* we haven't done any sorting yet; list is in casting order */
        if (sortmode === SORTBY_LETTER /* default */
            || sortmode === SORTRETAINORDER)
            return;
        /* allocate enough for full spellbook rather than just N spells */
        game.spl_orderindx = [];
        for (i = 0; i < MAXSPELL; i++)
            game.spl_orderindx[i] = i;
    }

    if (sortmode === SORTRETAINORDER) {
        const tmp_book = [];

        /* sort svs.spl_book[] rather than spl_orderindx[];
           this also updates the index to reflect the new ordering (we
           could just free it since that ordering becomes the default) */
        for (i = 0; i < MAXSPELL; i++)
            tmp_book[i] = game.spl_book[game.spl_orderindx[i]];
        for (i = 0; i < MAXSPELL; i++)
            game.spl_book[i] = tmp_book[i], game.spl_orderindx[i] = i;
        game.spl_sortmode = SORTBY_LETTER; /* reset */
        return;
    }

    /* usual case, sort the index rather than the spells themselves */
    const head = game.spl_orderindx.slice(0, n).map((v, p) => ({ v, p }));
    head.sort((a, b) => spell_cmp(a.v, b.v, a.p, b.p));
    for (i = 0; i < n; i++)
        game.spl_orderindx[i] = head[i].v;
    return;
}

// C ref: spell.c spellsortmenu()
/* called if the [sort spells] entry in the view spells menu gets chosen */
async function spellsortmenu() {
    let let_;
    let i, n, choice;
    const clr = NO_COLOR;
    const sortmode = game.spl_sortmode || 0;

    const tmpwin = tty_create_nhwindow(NHW_MENU);
    tty_start_menu(tmpwin, MENU_BEHAVE_STANDARD);

    for (i = 0; i < spl_sortchoices.length; i++) {
        if (i === SORTRETAINORDER) {
            let_ = 'z'; /* assumes fewer than 26 sort choices... */
            /* separate final choice from others with a blank line */
            tty_add_menu(tmpwin, null, 0, '', '', ATR_NONE, NO_COLOR, "", 0);
        } else {
            let_ = String.fromCharCode(97 + i);
        }
        tty_add_menu(tmpwin, null, i + 1, let_, '', ATR_NONE, clr,
                     spl_sortchoices[i],
                     (i === sortmode) ? MENU_ITEMFLAGS_SELECTED
                                      : MENU_ITEMFLAGS_NONE);
    }
    tty_end_menu(tmpwin, "View known spells list sorted");

    const res = await tty_select_menu(tmpwin, PICK_ONE);
    n = res.n;
    await tty_destroy_nhwindow(tmpwin);
    if (n > 0) {
        choice = res.selected[0].item - 1;
        /* skip preselected entry if we have more than one item chosen */
        if (n > 1 && choice === sortmode)
            choice = res.selected[1].item - 1;
        game.spl_sortmode = choice;
        return true;
    }
    return false;
}

// C ref: spell.c dovspell() -- the #showspells command -- view known spells
export async function dovspell() {
    let qbuf;
    let splnum, othnum;
    let spl_tmp;

    if (spellid(0) === NO_SPELL) {
        await pline("You don't know any spells right now.");
    } else {
        let r;
        while ((r = await dospellmenu("Currently known spells",
                                      SPELLMENU_VIEW)).ok) {
            splnum = r.spell_no;
            if (splnum === SPELLMENU_SORT) {
                if (await spellsortmenu())
                    sortspells();
            } else {
                qbuf = `Reordering spells; swap '${spellet(splnum)}' with`;
                const r2 = await dospellmenu(qbuf, splnum);
                if (!r2.ok)
                    break;
                othnum = r2.spell_no;

                spl_tmp = game.spl_book[splnum];
                game.spl_book[splnum] = game.spl_book[othnum];
                game.spl_book[othnum] = spl_tmp;
            }
        }
    }
    if (game.spl_orderindx)
        game.spl_orderindx = null;
    game.spl_sortmode = SORTBY_LETTER; /* 0 */
    return ECMD_OK;
}

/* Sprintf() helpers for dospellmenu()'s column formats */
function lpad(s, w) { s = String(s); return s.length >= w ? s : ' '.repeat(w - s.length) + s; }
function rpad(s, w) { s = String(s); return s.length >= w ? s : s + ' '.repeat(w - s.length); }

// C ref: spell.c dospellmenu()
/* shows menu of known spells, with options to sort them.
   return FALSE on cancel, TRUE otherwise.
   spell_no is set to the internal spl_book index, if any selected
   (JS returns { ok, spell_no }) */
async function dospellmenu(prompt,
                           splaction /* SPELLMENU_CAST, SPELLMENU_VIEW,
                                      * SPELLMENU_DUMP or spl_book[] index */) {
    let i, n, how, splnum;
    let buf, sep;
    let fmt;
    const clr = NO_COLOR;
    const wizard = !!game.flags?.debug;
    let spell_no;

    const tmpwin = tty_create_nhwindow(NHW_MENU);
    tty_start_menu(tmpwin, MENU_BEHAVE_STANDARD);

    /*
     * The correct spacing of the columns when not using
     * tab separation depends on the following:
     * (1) that the font is monospaced, and
     * (2) that selection letters are prepended to the
     *     given string and are of the form "a - ".
     * For SPELLMENU_DUMP, (2) is untrue, so four spaces
     * need to be subtracted.
     */
    if (!game.iflags?.menu_tab_sep) {
        /* "%s%-20s Level %-12s Fail Retention" */
        buf = `${splaction === SPELLMENU_DUMP ? "" : "    "}${rpad("Name", 20)}`
              + ` Level ${rpad("Category", 12)} Fail Retention`;
        /* "%-20s  %2d   %-12s %3d%% %9s" */
        fmt = (nm, lv, cat, fail, ret) =>
            `${rpad(nm, 20)}  ${lpad(lv, 2)}   ${rpad(cat, 12)} ${lpad(fail, 3)}% ${lpad(ret, 9)}`;
        sep = ' ';
    } else {
        buf = "Name\tLevel\tCategory\tFail\tRetention";
        /* "%s\t%-d\t%s\t%-d%%\t%s" */
        fmt = (nm, lv, cat, fail, ret) => `${nm}\t${lv}\t${cat}\t${fail}%\t${ret}`;
        sep = '\t';
    }
    if (wizard)
        buf += `${sep}${lpad("turns", 6)}`;

    add_menu_heading(tmpwin, buf);
    for (i = 0; i < MAXSPELL && spellid(i) !== NO_SPELL; i++) {
        splnum = !game.spl_orderindx ? i : game.spl_orderindx[i];
        buf = fmt(spellname(splnum), spellev(splnum),
                  spelltypemnemonic(spell_skilltype(spellid(splnum))),
                  100 - percent_success(splnum),
                  spellretention(splnum));
        if (wizard)
            buf += `${sep}${lpad(spellknow(i), 6)}`;

        tty_add_menu(tmpwin, null, splnum + 1 /* must be non-zero */,
                     spellet(splnum), '', ATR_NONE, clr, buf,
                     (splnum === splaction)
                        ? MENU_ITEMFLAGS_SELECTED : MENU_ITEMFLAGS_NONE);
    }
    how = PICK_ONE;
    if (splaction === SPELLMENU_VIEW) {
        if (spellid(1) === NO_SPELL) {
            /* only one spell => nothing to swap with */
            how = PICK_NONE;
        } else {
            /* more than 1 spell, add an extra menu entry */
            tty_add_menu(tmpwin, null, SPELLMENU_SORT + 1, '+', '',
                         ATR_NONE, clr, "[sort spells]", MENU_ITEMFLAGS_NONE);
        }
    }
    tty_end_menu(tmpwin, prompt);

    const res = await tty_select_menu(tmpwin, how);
    n = res.n;
    await tty_destroy_nhwindow(tmpwin);
    if (n > 0) {
        spell_no = res.selected[0].item - 1;
        /* menu selection for `PICK_ONE' does not
           de-select any preselected entry */
        if (n > 1 && spell_no === splaction)
            spell_no = res.selected[1].item - 1;
        /* default selection of preselected spell means that
           user chose not to swap it with anything */
        if (spell_no === splaction)
            return { ok: false, spell_no };
        return { ok: true, spell_no };
    } else if (splaction >= 0) {
        /* explicit de-selection of preselected spell means that
           user is still swapping but not for the current spell */
        spell_no = splaction;
        return { ok: true, spell_no };
    }
    return { ok: false, spell_no };
}

// C ref: spell.c percent_success()
function percent_success(spell) {
    /* Intrinsic and learned ability are combined to calculate
     * the probability of player's success at casting a given spell.
     */
    let chance, splcaster, special, statused;
    let difficulty;
    let skill;
    const skilltype = spell_skilltype(spellid(spell));
    const urole = game.urole;
    const uarm = game.uarm, uarmc = game.uarmc, uarms = game.uarms,
        uarmh = game.uarmh, uarmg = game.uarmg, uarmf = game.uarmf,
        uwep = game.uwep;
    /* Knights don't get metal armor penalty for clerical spells */
    const paladin_bonus = (Role_if(PM_KNIGHT)
                           && skilltype === P_CLERIC_SPELL);

    /* Calculate intrinsic ability (splcaster) */

    splcaster = urole.spelbase;
    special = urole.spelheal;
    statused = ACURR(urole.spelstat);

    if (uarm && is_metallic(uarm) && !paladin_bonus)
        splcaster += (uarmc && uarmc.otyp === ROBE) ? Math.trunc(urole.spelarmr / 2)
                                                    : urole.spelarmr;
    else if (uarmc && uarmc.otyp === ROBE)
        splcaster -= urole.spelarmr;
    if (uarms)
        splcaster += urole.spelshld;

    if (uwep && uwep.otyp === QUARTERSTAFF)
        splcaster -= 3; /* Small bonus */

    if (!paladin_bonus) {
        if (uarmh && is_metallic(uarmh)) /* && otyp != HELM_OF_BRILLIANCE */
            splcaster += uarmhbon;
        if (uarmg && is_metallic(uarmg))
            splcaster += uarmgbon;
        if (uarmf && is_metallic(uarmf))
            splcaster += uarmfbon;
    }

    if (spellid(spell) === urole.spelspec)
        splcaster += urole.spelsbon;

    /* `healing spell' bonus */
    if (spellid(spell) === SPE_HEALING || spellid(spell) === SPE_EXTRA_HEALING
        || spellid(spell) === SPE_CURE_BLINDNESS
        || spellid(spell) === SPE_CURE_SICKNESS
        || spellid(spell) === SPE_RESTORE_ABILITY
        || spellid(spell) === SPE_REMOVE_CURSE)
        splcaster += special;

    if (splcaster > 20)
        splcaster = 20;

    /* Calculate learned ability */

    /* The player's basic likelihood of being able to cast any spell
     * is based of their `magic' statistic. (Int or Wis)
     */
    chance = Math.trunc(11 * statused / 2);

    /*
     * High-level spells are harder.  Easier for higher-level casters.
     * The difficulty is based on the hero's level and their skill level
     * in that spell type.
     */
    skill = P_SKILL(skilltype);
    skill = Math.max(skill, P_UNSKILLED) - 1; /* unskilled => 0 */
    difficulty = (spellev(spell) - 1) * 4
                 - ((skill * 6) + Math.trunc(game.u.ulevel / 3) + 1);

    if (difficulty > 0) {
        /* Player is too low level or unskilled. */
        chance -= isqrt(900 * difficulty + 2000);
    } else {
        /* Player is above level.  Learning continues, but the
         * law of diminishing returns sets in quickly for
         * low-level spells.  That is, a player quickly gains
         * no advantage for raising level.
         */
        const learning = Math.trunc(15 * -difficulty / spellev(spell));
        chance += learning > 20 ? 20 : learning;
    }

    /* Clamp the chance: >18 stat and advanced learning only help
     * to a limit, while chances below "hopeless" only raise the
     * specter of overflowing 16-bit ints (and permit wearing a
     * shield to raise the chances :-).
     */
    if (chance < 0)
        chance = 0;
    if (chance > 120)
        chance = 120;

    /* Wearing anything but a light shield makes it very awkward
     * to cast a spell.  The penalty is not quite so bad for the
     * player's role-specific spell.
     */
    if (uarms && weight(uarms) > objects[SMALL_SHIELD].oc_weight) {
        if (spellid(spell) === urole.spelspec) {
            chance = Math.trunc(chance / 2);
        } else {
            chance = Math.trunc(chance / 4);
        }
    }

    /* Finally, chance (based on player intell/wisdom and level) is
     * combined with ability (based on player intrinsics and
     * encumbrances).  No matter how intelligent/wise and advanced
     * a player is, intrinsics and encumbrance can prevent casting;
     * and no matter how able, learning is always required.
     */
    chance = Math.trunc(chance * (20 - splcaster) / 15) - splcaster;

    /* Clamp to percentile */
    if (chance > 100)
        chance = 100;
    if (chance < 0)
        chance = 0;

    return chance;
}

// C ref: spell.c spellretention() -- returns the text instead of
// filling outbuf
function spellretention(idx) {
    let turnsleft, percent, accuracy;
    let skill;
    let outbuf;

    skill = P_SKILL(spell_skilltype(spellid(idx)));
    skill = Math.max(skill, P_UNSKILLED); /* restricted same as unskilled */
    turnsleft = spellknow(idx);

    if (turnsleft < 1) {
        /* spell has expired; hero can't successfully cast it anymore */
        outbuf = "(gone)";
    } else if (turnsleft >= KEEN) {
        /* full retention, first turn or immediately after reading book */
        outbuf = "100%";
    } else {
        /*
         * Retention is displayed as a range of percentages of
         * amount of time left until memory of the spell expires;
         * the precision of the range depends upon hero's skill
         * in this spell.
         *    expert:  2% intervals; 1-2,   3-4,  ...,   99-100;
         *   skilled:  5% intervals; 1-5,   6-10, ...,   95-100;
         *     basic: 10% intervals; 1-10, 11-20, ...,   91-100;
         * unskilled: 25% intervals; 1-25, 26-50, 51-75, 76-100.
         *
         * At the low end of each range, a value of N% really means
         * (N-1)%+1 through N%; so 1% is "greater than 0, at most 200".
         * KEEN is a multiple of 100; KEEN/100 loses no precision.
         */
        percent = Math.trunc((turnsleft - 1) / (KEEN / 100)) + 1;
        accuracy = (skill === P_EXPERT) ? 2
                   : (skill === P_SKILLED) ? 5
                     : (skill === P_BASIC) ? 10
                       : 25;
        /* round up to the high end of this range */
        percent = accuracy * (Math.trunc((percent - 1) / accuracy) + 1);
        outbuf = `${percent - accuracy + 1}%-${percent}%`;
    }
    return outbuf;
}

// C ref: spell.c initialspell()
/* Learn a spell during creation of the initial inventory */
export function initialspell(obj) {
    let i;
    const otyp = obj.otyp;

    for (i = 0; i < MAXSPELL; i++)
        if (spellid(i) === NO_SPELL || spellid(i) === otyp)
            break;

    if (i === MAXSPELL) {
        impossible("Too many spells memorized!");
    } else if (spellid(i) !== NO_SPELL) {
        /* initial inventory shouldn't contain duplicate spellbooks */
        impossible(`Spell ${OBJ_NAME(objects[otyp])} already known.`);
    } else {
        game.spl_book[i].sp_id = otyp;
        game.spl_book[i].sp_lev = objects[otyp].oc_level;
        incrnknow(i, 0);
    }
    return;
}

// C ref: spell.c num_spells()
export function num_spells() {
    let i;

    for (i = 0; i < MAXSPELL; i++)
        if (spellid(i) === NO_SPELL)
            break;
    return i;
}

/* C ref: spell.h enum spellknowledge */
export const spe_Forgotten = -1, spe_Unknown = 0, spe_Fresh = 1,
    spe_GoingStale = 2;

// C ref: spell.c known_spell()
/* returns one of spe_Unknown, spe_Fresh, spe_GoingStale, spe_Forgotten */
export function known_spell(otyp) {
    let i, k;

    for (i = 0; (i < MAXSPELL) && (spellid(i) !== NO_SPELL); i++)
        if (spellid(i) === otyp) {
            k = spellknow(i);
            return (k > Math.trunc(KEEN / 10)) ? spe_Fresh
                   : (k > 0) ? spe_GoingStale
                     : spe_Forgotten;
        }
    return spe_Unknown;
}
