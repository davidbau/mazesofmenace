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
export function can_chant(mtmp) {
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

// C ref: spell.c cursed_book()
/* TRUE: book should be destroyed by caller */
async function cursed_book(bp) {
    const u = game.u;
    let was_in_use;
    const lev = objects[bp.otyp].oc_level;
    let dmg = 0;

    switch (rn2(lev)) {
    case 0:
        await You_feel("a wrenching sensation.");
        await tele(); /* teleport him */
        break;
    case 1:
        await You_feel("threatened.");
        aggravate();
        break;
    case 2:
        await make_blinded((u.uprops[BLINDED].intrinsic & TIMEOUT) /* BlindedTimeout */
                           + rn1(100, 250), true);
        break;
    case 3:
        throw new Error('cursed_book(): take_gold() not ported yet');
    case 4:
        await pline("These runes were just too much to comprehend.");
        await make_confused(u.uprops[CONFUSION].intrinsic + rn1(7, 16), false);
        break;
    case 5:
        await pline_The("book was coated with contact poison!");
        if (game.uarmg) {
            await erode_obj(game.uarmg, "gloves", ERODE_CORRODE, EF_GREASE | EF_VERBOSE);
            break;
        }
        /* temp disable in_use; death should not destroy the book */
        was_in_use = bp.in_use;
        bp.in_use = 0;
        {
            const pres = u_have_prop(POISON_RES);
            const strloss = pres ? rn1(2, 1) : rn1(4, 3);
            await poison_strdmg(strloss, rnd(pres ? 6 : 10),
                                "contact-poisoned spellbook", KILLED_BY_AN);
        }
        bp.in_use = was_in_use;
        break;
    case 6:
        if (u_have_prop(ANTIMAGIC)) {
            /* shieldeff(u.ux, u.uy): transient display only */
            await pline_The("book explodes, but you are unharmed!");
        } else {
            await pline(`As you read the book, it explodes in your ${body_part(FACE)}!`);
            dmg = 2 * rnd(10) + 5;
            await losehp(Maybe_Half_Phys(dmg), "exploding rune", KILLED_BY_AN);
        }
        return true;
    default:
        throw new Error('cursed_book(): rndcurse() not ported yet');
    }
    return false;
}

// C ref: spell.c confused_book()
/* study while confused: returns TRUE if the book is destroyed */
async function confused_book(spellbook) {
    let gone = false;

    if (!rn2(3) && spellbook.otyp !== SPE_BOOK_OF_THE_DEAD) {
        spellbook.in_use = 1; /* in case called from learn() */
        await pline("Being confused you have difficulties in controlling your actions.");
        await tty_display_nhwindow(game.WIN_MESSAGE, false);
        await You("accidentally tear the spellbook to pieces.");
        await trycall(spellbook);
        useup(spellbook);
        gone = true;
    } else {
        await You(`find yourself reading the ${
            spellbook === spbook().book ? "next" : "first"} line over and over again.`);
    }
    return gone;
}

/* C ref: context.h svc.context.spbook */
function spbook() {
    const ctx = game.context;
    if (!ctx.spbook)
        ctx.spbook = { book: null, o_id: 0, delay: 0 };
    return ctx.spbook;
}

// C ref: spell.c book_cursed()
/* 'book' has just become cursed; if we're reading it, interrupt */
export async function book_cursed(book) {
    if (book.cursed && game.multi >= 0
        && game.occupation === learn && spbook().book === book) {
        await pline(`${Tobjnam(book, "slam")} shut!`);
        book.bknown = 1; /* set_bknown(book, 1) */
        await stop_occupation();
    }
}

// C ref: spell.c book_cursed() -- synchronous variant for synchronous C
// callers (curse()); the interruption message needs pline(), so that case
// stops here
export function book_cursed_sync(book) {
    if (book.cursed && game.multi >= 0
        && game.occupation === learn && spbook().book === book)
        throw new Error('book_cursed(): interrupting the read from a synchronous caller not ported yet');
}

// C ref: spell.c learn() -- occupation callback for studying a spellbook
async function learn() {
    const g = game;
    const sb = spbook();
    let i;
    let booktype;
    let splname;
    const costly = true;
    let faded_to_blank = false;
    const book = sb.book;

    /* JDS: lenses give 50% faster reading; 33% smaller read time */
    if (sb.delay && g.ublindf
        && g.ublindf.otyp === LENSES && rn2(2))
        sb.delay++;
    if (u_have_prop(CONFUSION)) { /* became confused while learning */
        await confused_book(book);
        sb.book = null; /* no longer studying */
        sb.o_id = 0;
        nomul(sb.delay); /* remaining delay is uninterrupted */
        g.multi_reason = "reading a book";
        g.nomovemsg = 0;
        sb.delay = 0;
        return 0;
    }
    if (sb.delay) {
        /* not if (svc.context.spbook.delay++), so at end delay == 0 */
        sb.delay++;
        return 1; /* still busy */
    }
    exercise(A_WIS, true); /* you're studying. */
    booktype = book.otyp;
    if (booktype === SPE_BOOK_OF_THE_DEAD)
        throw new Error('learn(): deadbook() not ported yet');

    splname = objects[booktype].oc_name_known
              ? `"${OBJ_NAME(objects[booktype])}"`
              : `the "${OBJ_NAME(objects[booktype])}" spell`;
    for (i = 0; i < MAXSPELL; i++)
        if (spellid(i) === booktype || spellid(i) === NO_SPELL)
            break;

    if (i === MAXSPELL) {
        impossible("Too many spells memorized!");
    } else if (spellid(i) === booktype) {
        /* normal book can be read and re-read a total of 4 times */
        if (book.spestudied > MAX_SPELL_STUDY) {
            await pline("This spellbook is too faint to be read any more.");
            book.otyp = booktype = SPE_BLANK_PAPER;
            faded_to_blank = true;
            /* reset spestudied as if polymorph had taken place */
            book.spestudied = rn2(book.spestudied);
        } else {
            await Your(`knowledge of ${splname} is ${spellknow(i) ? "keener" : "restored"}.`);
            incrnknow(i, 1);
            book.spestudied++;
            exercise(A_WIS, true); /* extra study */
        }
    } else { /* (spellid(i) == NO_SPELL) */
        /* for a normal book, spestudied will be zero, but for
           a polymorphed one, spestudied will be non-zero and
           one less reading is available than when re-learning */
        if (book.spestudied >= MAX_SPELL_STUDY) {
            /* pre-used due to being the product of polymorph */
            await pline("This spellbook is too faint to read even once.");
            book.otyp = booktype = SPE_BLANK_PAPER;
            faded_to_blank = true;
            /* reset spestudied as if polymorph had taken place */
            book.spestudied = rn2(book.spestudied);
        } else {
            game.spl_book[i].sp_id = booktype;
            game.spl_book[i].sp_lev = objects[booktype].oc_level;
            incrnknow(i, 1);
            book.spestudied = (book.spestudied || 0) + 1;
            if (!i)
                /* first is always 'a', so no need to mention the letter */
                await You(`learn ${splname}.`);
            else
                await You(`add ${splname} to your repertoire, as '${spellet(i)}'.`);
        }
    }
    if (i < MAXSPELL) {
        /* might be learning a new spellbook type or spellbook of blank paper;
           if so, persistent inventory will get updated */
        discover_object(booktype, true, true, true); /* makeknown() */
        /* makeknown() calls update_inventory() when discovering something
           new but is a no-op for something that's already known so wouldn't
           update persistent inventory to reflect faded book if spellbook of
           blank paper happens to already be discovered */
        void faded_to_blank; /* update_inventory(): no perm_invent */
    }

    if (book.cursed) { /* maybe a demon cursed it */
        if (await cursed_book(book)) {
            useup(book);
            sb.book = null;
            sb.o_id = 0;
            return 0;
        }
    }
    if (costly)
        check_unpaid(book);
    sb.book = null;
    sb.o_id = 0;
    return 0;
}

/* C ref: shk.c check_unpaid() -> check_unpaid_usage(otmp, FALSE) */
function check_unpaid(otmp) {
    if (!otmp.unpaid || !game.u.ushops || !game.u.ushops[0]
        || (otmp.spe <= 0 && objects[otmp.otyp].oc_charged))
        return;
    throw new Error('check_unpaid(): usage fee for unpaid item not ported yet');
}

// C ref: spell.c study_book()
export async function study_book(spellbook) {
    const g = game, u = g.u;
    const sb = spbook();
    const booktype = spellbook.otyp;
    let i;
    const confused = u_have_prop(CONFUSION);
    let too_hard = false;

    /* attempting to read dull book may make hero fall asleep */
    if (!confused && !u_have_prop(SLEEP_RES)
        && objdescr_is(spellbook, "dull")) {
        let eyes;
        let dullbook = rnd(25) - ACURR(A_WIS);

        /* adjust chance if hero stayed awake, got interrupted, retries */
        if (sb.delay && spellbook === sb.book)
            dullbook -= rnd(objects[booktype].oc_level);

        if (dullbook > 0) {
            eyes = body_part(EYE);
            if (eyecount(g.youmonst.data) > 1)
                eyes = makeplural(eyes);
            await pline(`This book is so dull that you can't keep your ${eyes} open.`);
            dullbook += rnd(2 * objects[booktype].oc_level);
            await fall_asleep(-dullbook, true);
            return 1;
        }
    }

    if (sb.delay && !confused
        && spellbook === sb.book
        /* handle the sequence: start reading, get interrupted, have
           svc.context.spbook.book become erased somehow, resume reading it */
        && booktype !== SPE_BLANK_PAPER) {
        await You(`continue your efforts to ${
            (booktype === SPE_NOVEL) ? "read the novel" : "memorize the spell"}.`);
    } else {
        /* KMH -- Simplified this code */
        if (booktype === SPE_BLANK_PAPER) {
            await pline("This spellbook is all blank.");
            discover_object(booktype, true, true, true); /* makeknown() */
            return 1;
        }

        /* 3.6 tribute */
        if (booktype === SPE_NOVEL)
            throw new Error('study_book(): read_tribute() for a novel not ported yet');

        switch (objects[booktype].oc_level) {
        case 1:
        case 2:
            sb.delay = -objects[booktype].oc_delay;
            break;
        case 3:
        case 4:
            sb.delay = -(objects[booktype].oc_level - 1)
                       * objects[booktype].oc_delay;
            break;
        case 5:
        case 6:
            sb.delay = -objects[booktype].oc_level * objects[booktype].oc_delay;
            break;
        case 7:
            sb.delay = -8 * objects[booktype].oc_delay;
            break;
        default:
            impossible(`Unknown spellbook level ${objects[booktype].oc_level}, book ${booktype};`);
            return 0;
        }

        /* check to see if we already know it and want to refresh our memory */
        for (i = 0; i < MAXSPELL; i++)
            if (spellid(i) === booktype || spellid(i) === NO_SPELL)
                break;
        if (spellid(i) === booktype && spellknow(i) > Math.trunc(KEEN / 10)) {
            await You(`know "${OBJ_NAME(objects[booktype])}" quite well already.`);
            /* hero has just been told what spell this book is for; it may
               have been undiscovered if spell was learned via divine gift */
            discover_object(booktype, true, true, true); /* makeknown() */
            if ((await tty_yn_function("Refresh your memory anyway?", "yn", 'n')) === 'n')
                return 0;
        }

        /* Books are often wiser than their readers (Rus.) */
        spellbook.in_use = 1;
        if (!spellbook.blessed && spellbook.otyp !== SPE_BOOK_OF_THE_DEAD) {
            if (spellbook.cursed) {
                too_hard = true;
            } else {
                /* uncursed - chance to fail */
                const read_ability = ACURR(A_INT) + 4 + Math.trunc(u.ulevel / 2)
                    - 2 * objects[booktype].oc_level
                    + ((g.ublindf && g.ublindf.otyp === LENSES) ? 2 : 0);

                /* only wizards know if a spell is too difficult */
                if (Role_if(PM_WIZARD) && read_ability < 20 && !confused) {
                    const qbuf = `This spellbook is ${
                        (read_ability < 12 ? "very " : "")}difficult to comprehend.  Continue?`;
                    if ((await tty_yn_function(qbuf, "yn", 'n')) !== 'y') {
                        spellbook.in_use = 0;
                        return 1;
                    }
                }
                /* its up to random luck now */
                if (rnd(20) > read_ability) {
                    too_hard = true;
                }
            }
        }

        if (too_hard) {
            const gone = await cursed_book(spellbook);

            nomul(sb.delay); /* study time */
            g.multi_reason = "reading a book";
            g.nomovemsg = 0;
            sb.delay = 0;
            if (gone || !rn2(3)) {
                if (!gone)
                    await pline_The("spellbook crumbles to dust!");
                await trycall(spellbook);
                useup(spellbook);
            } else
                spellbook.in_use = 0;
            return 1;
        } else if (confused) {
            if (!(await confused_book(spellbook))) {
                spellbook.in_use = 0;
            }
            nomul(sb.delay);
            g.multi_reason = "reading a book";
            g.nomovemsg = 0;
            sb.delay = 0;
            return 1;
        }
        spellbook.in_use = 0;

        await You(`begin to ${
            spellbook.otyp === SPE_BOOK_OF_THE_DEAD ? "recite" : "memorize"} the runes.`);
    }

    sb.book = spellbook;
    if (sb.book)
        sb.o_id = sb.book.o_id;
    set_occupation(learn, "studying", 0);
    return 1;
}

// C ref: spell.c book_disappears()
/* a spellbook has been destroyed or the character has changed levels;
   the stored address for the current book is no longer valid */
export function book_disappears(obj) {
    const sb = spbook();
    if (obj === sb.book) {
        sb.book = null;
        sb.o_id = 0;
    }
}

// C ref: spell.c book_substitution()
/* renaming an object usually results in it having a different address;
   so the sequence start reading, get interrupted, name the book, resume
   reading would read the "new" book from scratch */
export function book_substitution(old_obj, new_obj) {
    const sb = spbook();
    if (old_obj === sb.book) {
        sb.book = new_obj;
        if (sb.book)
            sb.o_id = sb.book.o_id;
    }
}

// C ref: spell.c spell_backfire()
async function spell_backfire(spell) {
    const u = game.u;
    const duration = (spellev(spell) + 1) * 3; /* 6..24 */
    const old_stun = (u.uprops[STUNNED].intrinsic & TIMEOUT),
          old_conf = (u.uprops[CONFUSION].intrinsic & TIMEOUT);

    /* Prior to 3.4.1, only effect was confusion; it still predominates.
     *
     * 3.6.0: this used to override pre-existing confusion duration
     * (cases 0..8) and pre-existing stun duration (cases 4..9);
     * increase them instead.   (Hero can no longer cast spells while
     * Stunned, so the potential increment to stun duration here is
     * just hypothetical.)
     */
    switch (rn2(10)) {
    case 0:
    case 1:
    case 2:
    case 3:
        await make_confused(old_conf + duration, false); /* 40% */
        break;
    case 4:
    case 5:
    case 6:
        await make_confused(old_conf + Math.trunc(2 * duration / 3), false); /* 30% */
        await make_stunned(old_stun + Math.trunc(duration / 3), false);
        break;
    case 7:
    case 8:
        await make_stunned(old_stun + Math.trunc(2 * duration / 3), false); /* 20% */
        await make_confused(old_conf + Math.trunc(duration / 3), false);
        break;
    case 9:
        await make_stunned(old_stun + duration, false); /* 10% */
        break;
    }
    return;
}

// C ref: spell.c spelleffects_check() -- returns { done, res, energy }
async function spelleffects_check(spell) {
    const g = game, u = g.u;
    let chance;
    const confused = u_have_prop(CONFUSION);
    const r = { done: false, res: ECMD_OK, energy: 0 };

    /*
     * Reject attempting to cast while stunned or with no free hands.
     * Already done in getspell() to stop casting before choosing
     * which spell, but duplicated here for cases where spelleffects()
     * gets called directly for ^T without intrinsic teleport capability
     * or #turn for non-priest/non-knight.
     * (There's no duplication of messages; when the rejection takes
     * place in getspell(), we don't get called.)
     */
    if ((spell === UNKNOWN_SPELL) || (await rejectcasting())) {
        r.res = ECMD_OK; /* no time elapses */
        r.done = true;
        return r;
    }

    /*
     *  Note: dotele() also calculates energy use and checks nutrition
     *  and strength requirements; if any of these change, update it too.
     */
    r.energy = spellev(spell) * 5; /* SPELL_LEV_PW(): 5 <= energy <= 35 */

    /*
     * Spell casting no longer affects knowledge of the spell. A
     * decrement of spell knowledge is done every turn.
     */
    if (spellknow(spell) <= 0) {
        await Your("knowledge of this spell is twisted.");
        await pline("It invokes nightmarish images in your mind...");
        await spell_backfire(spell);
        u.uen -= rnd(r.energy);
        if (u.uen < 0)
            u.uen = 0;
        g.disp_botl = true;
        r.res = ECMD_TIME;
        r.done = true;
        return r;
    } else if (spellknow(spell) <= Math.trunc(KEEN / 200)) { /* 100 turns left */
        await You("strain to recall the spell.");
    } else if (spellknow(spell) <= Math.trunc(KEEN / 40)) { /* 500 turns left */
        await You("have difficulty remembering the spell.");
    } else if (spellknow(spell) <= Math.trunc(KEEN / 20)) { /* 1000 turns left */
        await Your("knowledge of this spell is growing faint.");
    } else if (spellknow(spell) <= Math.trunc(KEEN / 10)) { /* 2000 turns left */
        await Your("recall of this spell is gradually fading.");
    }

    if (u.uhunger <= 10 && spellid(spell) !== SPE_DETECT_FOOD) {
        await You("are too hungry to cast that spell.");
        r.res = ECMD_OK;
        r.done = true;
        return r;
    } else if (ACURR(A_STR) < 4 && spellid(spell) !== SPE_RESTORE_ABILITY) {
        await You("lack the strength to cast spells.");
        r.res = ECMD_OK;
        r.done = true;
        return r;
    } else if (await check_capacity(
                "Your concentration falters while carrying so much stuff.")) {
        r.res = ECMD_TIME;
        r.done = true;
        return r;
    }

    /* if the cast attempt is already going to fail due to insufficient
       energy (ie, u.uen < energy), the Amulet's drain effect won't kick
       in and no turn will be consumed; however, when it does kick in,
       the attempt may fail due to lack of energy after the draining, in
       which case a turn will be used up in addition to the energy loss */
    if (u.uhave?.amulet && u.uen >= r.energy) {
        await You_feel("the amulet draining your energy away.");
        /* this used to be 'energy += rnd(2 * energy)' (without 'res'),
           so if amulet-induced cost was more than u.uen, nothing
           (except the "don't have enough energy" message) happened
           and player could just try again (and again and again...);
           now we drain some energy immediately, which has a
           side-effect of not increasing the hunger aspect of casting */
        u.uen -= rnd(2 * r.energy);
        if (u.uen < 0)
            u.uen = 0;
        g.disp_botl = true;
        r.res = ECMD_TIME; /* time is used even if spell doesn't get cast */
    }

    if (r.energy > u.uen) {
        /*
         * Hero has insufficient energy/power to cast the spell.
         * Augment the message when current energy is at maximum.
         * "yet": mainly for level 1 characters who already know a spell
         * but don't start with enough energy to cast it.
         * "anymore": maximum energy was high enough at some point but
         * isn't now (lost energy when losing levels or polymorphing into
         * new person or had some stripped away by traps or monsters).
         */
        await You(`don't have enough energy to cast that spell${
            (u.uen < u.uenmax) ? "" /* not at full energy => normal message */
            : (r.energy > u.uenpeak) ? " yet" /* haven't ever had enough */
              : " anymore"}.`); /* once had enough but have lost some since */
        r.done = true;
        return r;
    } else {
        if (spellid(spell) !== SPE_DETECT_FOOD) {
            let hungr = r.energy * 2;

            /* If hero is a wizard, their current intelligence
             * (bonuses + temporary + current)
             * affects hunger reduction in casting a spell.
             * 1. int = 17-18 no reduction
             * 2. int = 16    1/4 hungr
             * 3. int = 15    1/2 hungr
             * 4. int = 1-14  normal reduction
             * The reason for this is:
             * a) Intelligence affects the amount of exertion
             * in thinking.
             * b) Wizards have spent their life at magic and
             * understand quite well how to cast spells.
             */
            let intell = ACURR(A_INT); /* acurr(A_INT) */
            if (!Role_if(PM_WIZARD))
                intell = 10;
            switch (intell) {
            case 25:
            case 24:
            case 23:
            case 22:
            case 21:
            case 20:
            case 19:
            case 18:
            case 17:
                hungr = 0;
                break;
            case 16:
                hungr = Math.trunc(hungr / 4);
                break;
            case 15:
                hungr = Math.trunc(hungr / 2);
                break;
            }
            /* don't put player (quite) into fainting from
             * casting a spell, particularly since they might
             * not even be hungry at the beginning; however,
             * this is low enough that they must eat before
             * casting anything else except detect food
             */
            if (hungr > u.uhunger - 3)
                hungr = u.uhunger - 3;
            await morehungry(hungr);
        }
    }

    chance = percent_success(spell);
    if (confused || (rnd(100) > chance)) {
        await You("fail to cast the spell correctly.");
        u.uen -= Math.trunc(r.energy / 2);
        g.disp_botl = true;
        r.res = ECMD_TIME;
        r.done = true;
        return r;
    }
    return r;
}

// C ref: spell.c spelleffects()
/* hero casts a spell of type spell_otyp, eg. SPE_SLEEP.
   hero must know the spell (unless force is TRUE). */
export async function spelleffects(spell_otyp, atme, force) {
    const g = game, u = g.u;
    const spell = force ? spell_otyp : spell_idx(spell_otyp);
    let energy = 0, damage;
    let res = ECMD_OK;
    let physical_damage = false;

    if (!force) {
        const r = await spelleffects_check(spell);
        energy = r.energy;
        res = r.res;
        if (r.done)
            return res;
    }

    u.uen -= energy;
    g.disp_botl = true;
    exercise(A_WIS, true);
    /* pseudo is a temporary "false" object containing the spell stats */
    const pseudo = mksobj(force ? spell : spellid(spell), false, false);
    pseudo.blessed = pseudo.cursed = 0;
    pseudo.quan = 20; /* do not let useup get it */
    /*
     * Find the skill the hero has in a spell type category.
     * See spell_skilltype for categories.
     */
    const otyp = pseudo.otyp;
    const skill = spell_skilltype(otyp);
    const role_skill = P_SKILL(skill);

    switch (otyp) {
    /*
     * At first spells act as expected.  As the hero increases in skill
     * with the appropriate spell type, some spells increase in their
     * effects, e.g. more damage, further distance, and so on, without
     * additional cost to the spellcaster.
     */
    case O.SPE_FIREBALL:
    case O.SPE_CONE_OF_COLD:
        if (role_skill >= P_SKILLED)
            throw new Error('spelleffects(): skilled fireball/cone of cold (throwspell()) not ported yet');
        /* FALLTHROUGH */
    /* these spells are all duplicates of wand effects */
    // eslint-disable-next-line no-fallthrough
    case O.SPE_FORCE_BOLT:
    case O.SPE_SLEEP:
    case O.SPE_MAGIC_MISSILE:
    case O.SPE_KNOCK:
    case O.SPE_SLOW_MONSTER:
    case O.SPE_WIZARD_LOCK:
    case O.SPE_DIG:
    case O.SPE_TURN_UNDEAD:
    case O.SPE_POLYMORPH:
    case O.SPE_TELEPORT_AWAY:
    case O.SPE_CANCELLATION:
    case O.SPE_FINGER_OF_DEATH:
    case O.SPE_LIGHT:
    case O.SPE_DETECT_UNSEEN:
    case O.SPE_HEALING:
    case O.SPE_EXTRA_HEALING:
    case O.SPE_DRAIN_LIFE:
    case O.SPE_STONE_TO_FLESH:
        if (otyp === O.SPE_FORCE_BOLT || otyp === O.SPE_FIREBALL
            || otyp === O.SPE_CONE_OF_COLD) /* FIREBALL/CONE_OF_COLD fall through */
            physical_damage = true;
        if (objects[otyp].oc_dir !== NODIR) {
            if (otyp === SPE_HEALING || otyp === SPE_EXTRA_HEALING) {
                /* healing and extra healing are actually potion effects,
                   but they've been extended to take a direction like wands */
                if (role_skill >= P_SKILLED)
                    pseudo.blessed = 1;
            }
            if (atme) {
                u.dx = u.dy = u.dz = 0;
            } else if (!(await getdir(null))) {
                /* getdir cancelled, re-use previous direction */
                /*
                 * FIXME:  reusing previous direction only makes sense
                 * if there is an actual previous direction.  When there
                 * isn't one, the spell gets cast at self which is rarely
                 * what the player intended.  Unfortunately, the way
                 * spelleffects() is organized means that aborting with
                 * "nevermind" is not an option.
                 */
                await pline_The("magical energy is released!");
            }
            if (!u.dx && !u.dy && !u.dz) {
                if ((damage = await zapyourself(pseudo, true)) !== 0) {
                    const buf = `zapped ${uhim()}self with a spell`;
                    if (physical_damage)
                        damage = Maybe_Half_Phys(damage);
                    await losehp(damage, buf, NO_KILLER_PREFIX);
                }
            } else
                await weffects(pseudo);
        } else
            await weffects(pseudo);
        /* update_inventory(): no perm_invent */
        break;

    /* these are all duplicates of scroll effects */
    case O.SPE_REMOVE_CURSE:
    case O.SPE_CONFUSE_MONSTER:
    case O.SPE_DETECT_FOOD:
    case O.SPE_CAUSE_FEAR:
    case O.SPE_IDENTIFY:
    case O.SPE_CHARM_MONSTER:
    case O.SPE_MAGIC_MAPPING:
    case O.SPE_CREATE_MONSTER:
        /* high skill yields effect equivalent to blessed scroll */
        if (otyp !== O.SPE_MAGIC_MAPPING && otyp !== O.SPE_CREATE_MONSTER
            && role_skill >= P_SKILLED)
            pseudo.blessed = 1;
        await seffects(pseudo);
        break;

    /* these are all duplicates of potion effects */
    case O.SPE_HASTE_SELF:
    case O.SPE_DETECT_TREASURE:
    case O.SPE_DETECT_MONSTERS:
    case O.SPE_LEVITATION:
    case O.SPE_RESTORE_ABILITY:
    case O.SPE_INVISIBILITY:
        /* high skill yields effect equivalent to blessed potion */
        if (otyp !== O.SPE_INVISIBILITY && role_skill >= P_SKILLED)
            pseudo.blessed = 1;
        await peffects(pseudo);
        break;
    /* end of potion-like spells */

    case O.SPE_CURE_BLINDNESS:
        await healup(0, 0, false, true);
        break;
    case O.SPE_CURE_SICKNESS: {
        const was_sick = !!u.uprops[SICK].intrinsic,
              was_slimed = !!u.uprops[SLIMED].intrinsic;

        /* cure conditions (which updates status) before feedback */
        await healup(0, 0, true, false);
        /*
         *  Sick + !Slimed -- You are no longer ill.
         * !Sick + !Slimed -- You are not ill.
         * !Sick +  Slimed -- The slime disappears.
         *  Sick +  Slimed -- You are no longer ill.  The slime disappears.
         */
        if (was_sick || !was_slimed)
            await You(`are ${was_sick ? "no longer" : "not"} ill.`);
        if (was_slimed)
            await make_slimed(0, "The slime disappears!");
        break;
    }
    case O.SPE_CREATE_FAMILIAR:
        throw new Error('spelleffects(): make_familiar() not ported yet');
    case O.SPE_CLAIRVOYANCE:
        throw new Error('spelleffects(): do_vicinity_map() not ported yet');
    case O.SPE_PROTECTION:
        throw new Error('spelleffects(): cast_protection() not ported yet');
    case O.SPE_JUMPING:
        if (!((await jump(Math.max(role_skill, 1))) & ECMD_TIME))
            await pline(nothing_happens);
        break;
    case O.SPE_CHAIN_LIGHTNING:
        throw new Error('spelleffects(): cast_chain_lightning() not ported yet');
    default:
        impossible(`Unknown spell ${spell} attempted.`);
        obfree(pseudo, null);
        return ECMD_OK;
    }

    /* gain skill for successful cast */
    if (!force)
        await use_skill(skill, spellev(spell));

    obfree(pseudo, null); /* now, get rid of it */
    return ECMD_TIME;
}

/* C ref: you.h uhim() -- genders[flags.female ? 1 : 0].him */
function uhim() {
    return game.flags.female ? "her" : "him";
}

// C ref: spell.c losespells()
export function losespells() {
    const sb = spbook();
    let n, nzap, i;

    /* in case reading has been interrupted earlier, discard context */
    sb.book = null;
    sb.o_id = 0;
    /* count the number of known spells */
    for (n = 0; n < MAXSPELL; ++n)
        if (spellid(n) === NO_SPELL)
            break;

    /* lose anywhere from zero to all known spells;
       if confused, use the worse of two die rolls */
    nzap = rn2(n + 1);
    if (u_have_prop(CONFUSION)) {
        i = rn2(n + 1);
        if (i > nzap)
            nzap = i;
    }
    /* good Luck might ameliorate spell loss */
    if (nzap > 1 && !rnl(7))
        nzap = rnd(nzap);

    /*
     * Forget 'nzap' out of 'n' known spells by setting their memory
     * retention to zero.  Every spell has the same probability to be
     * forgotten, even if its retention is already zero.
     */
    for (i = 0; nzap > 0; ++i) {
        /* when nzap is small relative to the number of spells left,
           the chance to lose spell [i] is small; as the number of
           remaining candidates shrinks, the chance per candidate
           gets bigger; overall, exactly nzap entries are affected */
        if (rn2(n - i) < nzap) {
            /* lose access to spell [i] */
            game.spl_book[i].sp_know = 0;
            /* and abuse wisdom */
            exercise(A_WIS, false);
            /* there's now one less spell slated to be forgotten */
            --nzap;
        }
    }
}

// C ref: spell.c spell_idx()
export function spell_idx(otyp) {
    let i;

    for (i = 0; (i < MAXSPELL) && (spellid(i) !== NO_SPELL); i++)
        if (spellid(i) === otyp)
            return i;
    return UNKNOWN_SPELL;
}

// C ref: spell.c force_learn_spell()
/* learn or refresh spell otyp, if feasible; return casting letter or '\0' */
export function force_learn_spell(otyp) {
    let i;

    if (otyp === SPE_BLANK_PAPER || otyp === SPE_BOOK_OF_THE_DEAD
        || known_spell(otyp) === spe_Fresh)
        return '\0';

    for (i = 0; i < MAXSPELL; i++)
        if (spellid(i) === NO_SPELL || spellid(i) === otyp)
            break;
    if (i === MAXSPELL) {
        impossible("Too many spells memorized");
        return '\0';
    }
    /* for a going-stale or forgotten spell the sp_id and sp_lev assignments
       are redundant but harmless; for an unknown spell, they're essential */
    game.spl_book[i].sp_id = otyp;
    game.spl_book[i].sp_lev = objects[otyp].oc_level;
    incrnknow(i, 0); /* set spl_book[i].sp_know to KEEN; unlike when learning
                      * a spell by reading its book, we don't need to add 1 */
    return spellet(i);
}

import { rn2, rnd, rn1, rnl } from './rng.js';
import * as O from './objects.js';
import { SPE_BOOK_OF_THE_DEAD, SPE_BLANK_PAPER, SPE_NOVEL, SPE_DETECT_FOOD,
         LENSES, NODIR } from './objects.js';
import { You, Your, You_feel, pline_The } from './display.js';
import { tele } from './teleport.js';
import { aggravate, make_blinded, make_confused, make_stunned, trycall,
         peffects, healup, make_slimed } from './potion.js';
import { erode_obj, losehp, Maybe_Half_Phys } from './trap.js';
import { poison_strdmg, exercise as exercise_sp } from './attrib.js';
import { body_part } from './insight.js';
import { tty_display_nhwindow, tty_yn_function } from './wintty.js';
import { useup, obfree } from './invent.js';
import { Tobjnam, makeplural } from './objnam.js';
import { set_occupation, stop_occupation } from './allmain.js';
import { nomul, check_capacity } from './hack.js';
import { objdescr_is } from './o_init.js';
import { fall_asleep } from './timeout.js';
import { haseyes } from './mondata.js';
import { mons as mons_sp, PM_CYCLOPS, PM_FLOATING_EYE } from './monsters.js';
import { morehungry } from './eat.js';
import { mksobj } from './mkobj.js';
import { use_skill } from './weapon.js';
import { getdir } from './cmd.js';
import { zapyourself, weffects } from './zap.js';
import { seffects } from './read.js';
import { jump } from './apply.js';
import { BLINDED, CONFUSION, TIMEOUT, POISON_RES, ANTIMAGIC, SLEEP_RES,
         SICK, SLIMED, ERODE_CORRODE, EF_GREASE, EF_VERBOSE, KILLED_BY_AN,
         NO_KILLER_PREFIX, FACE, EYE, A_WIS, A_INT, A_STR, MAX_SPELL_STUDY,
         UNKNOWN_SPELL, ECMD_TIME } from './const.js';
function exercise(i, inc) { exercise_sp(i, inc); }
/* C ref: mondata.h eyecount() */
function eyecount(ptr) {
    return !haseyes(ptr) ? 0
           : (ptr === mons_sp[PM_CYCLOPS] || ptr === mons_sp[PM_FLOATING_EYE]) ? 1
             : 2;
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
