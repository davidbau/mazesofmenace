// spell.js — spellcasting.
// C ref: src/spell.c

import { game } from './gstate.js';
import { pline } from './display.js';
import { ECMD_OK, weight } from './invent.js';
import { worn } from './do_wear.js';
import { ACURR } from './attrib.js';
import { isqrt } from './hacklib.js';
import { is_metallic } from './obj.js';
import { ONAMES, OCLASSES, SKILLS } from './objects_data.js';
import { PMNAMES } from './monst_data.js';
import { rnd, rn2, rn1, d } from './rng.js';
import { tty_yn_function } from './tty/topl.js';
import { tty_create_nhwindow, tty_start_menu, tty_add_menu, tty_end_menu,
         tty_select_menu, tty_destroy_nhwindow, ATR_NONE,
         ATR_INVERSE } from './tty/wintty.js';
import { NO_COLOR } from './terminal.js';
import { NHW_MENU, MENU_BEHAVE_STANDARD, PICK_ONE, PICK_NONE,
         MENU_ITEMFLAGS_NONE, MENU_ITEMFLAGS_SELECTED } from './const.js';
import { OBJ_NAME, OBJ_DESCR } from './objnam.js';
import { ECMD_FAIL } from './const.js';
import { You, Your, You_feel, You_hear, pline_The } from './pline.js';
import { acurr, exercise } from './attrib.js';
import { mksobj } from './mkobj.js';
import { zapyourself } from './zap.js';
import { fall_asleep } from './timeout.js';
import { makeknown, observe_object } from './o_init.js';
import { getdir } from './cmd.js';
import { update_inventory } from './invent.js';
import { NODIR } from './const.js';
import { A_WIS, KILLED_BY_AN } from './const.js';
import { morehungry } from './eat.js';
import { ECMD_TIME } from './const.js';
import { A_STR, A_INT } from './const.js';
import { W_ARM, W_ARMC, W_ARMS, W_ARMH, W_ARMG, W_ARMF, W_WEP,
         P_CLERIC_SPELL, P_UNSKILLED, P_ISRESTRICTED } from './const.js';

// src/spell.c — NO_SPELL sentinel and the spell list accessor.
const NO_SPELL = 0;

// src/spell.c spellid() — the spell in slot `spidx`, or NO_SPELL.
export function spellid(spidx) {
    const sp = game.spl_book?.[spidx];
    return sp ? sp.sp_id : NO_SPELL;
}

// src/spell.c:24 spellev() — the spell's level.
export function spellev(spidx) {
    return game.spl_book?.[spidx]?.sp_lev ?? 0;
}

// src/spell.c:856 spell_skilltype() — oc_skill is #defined to oc_subtyp.
export function spell_skilltype(booktype) {
    return game.objects[booktype].oc_subtyp;
}

// src/spell.c:22 incrnknow()
const incrnknow = (spell, x) => { game.spl_book[spell].sp_know = KEEN + x; };

// src/spell.c initialspell() — memorise a starting spellbook.
//
// u_init calls it for every SPBOOK_CLASS item in the starting inventory that
// is not blank paper. Without it game.spl_book stays empty, num_spells()
// returns 0, and getspell() answers "You don't know any spells right now."
// for a hero who plainly does.
export function initialspell(obj) {
    const otyp = obj.otyp;
    let i;

    for (i = 0; i < MAXSPELL; i++)
        if (spellid(i) === NO_SPELL || spellid(i) === otyp)
            break;

    if (i === MAXSPELL) {
        note_unported_spell('initialspell:too many spells');
    } else if (spellid(i) !== NO_SPELL) {
        /* initial inventory should not contain duplicate spellbooks */
        note_unported_spell('initialspell:duplicate');
    } else {
        (game.spl_book ||= [])[i] = {
            sp_id: otyp,
            sp_lev: game.objects[otyp].oc_level,
            sp_know: 0,
        };
        incrnknow(i, 0);
    }
}

// src/spell.c:130 cursed_book()
async function cursed_book(book) {
    const lev = game.objects[book.otyp].oc_level;

    switch (rn2(lev)) {
    case 0: {
        await You_feel('a wrenching sensation.');
        const { tele } = await import('./teleport.js');
        await tele();
        break;
    }
    case 1: {
        await You_feel('threatened.');
        const { aggravate } = await import('./wizard.js');
        aggravate();
        break;
    }
    case 2: {
        const intr = (game.u.intrinsic ||= {});
        const was_blind = !!game.u.ublind;
        intr.HBlinded = (intr.HBlinded | 0) + rn1(100, 250);
        game.u.ublind = 1;
        (game.disp ||= {}).botl = true;
        game.vision_full_recalc = 1;
        if (!was_blind)
            await pline('A cloud of darkness falls upon you.');
        break;
    }
    case 3: {
        const coins = (game.invent || [])
            .filter((obj) => obj.oclass === OCLASSES.COIN_CLASS);
        if (!coins.length) {
            await You_feel('a strange sensation.');
        } else {
            const { useupall } = await import('./invent.js');
            for (const coin of coins)
                useupall(coin);
            await You('notice you have no gold!');
            (game.disp ||= {}).botl = true;
        }
        break;
    }
    case 4: {
        await pline('These runes were just too much to comprehend.');
        const { make_confused } = await import('./potion.js');
        await make_confused((game.u.intrinsic?.HConfusion | 0) + rn1(7, 16),
                            false);
        break;
    }
    case 5: {
        await pline_The('book was coated with contact poison!');
        if (game.u.uarmg) {
            note_unported_spell('cursed_book:corrode_gloves');
            break;
        }
        const poison_resistant = !!(game.u.intrinsic?.HPoison_resistance
                                    || game.u.uprops?.POISON_RES);
        const strloss = poison_resistant ? rn1(2, 1) : rn1(4, 3);
        const damage = rnd(poison_resistant ? 6 : 10);
        const { adjattrib } = await import('./attrib.js');
        const { losehp } = await import('./hack.js');
        const was_in_use = book.in_use;
        book.in_use = false;
        await adjattrib(A_STR, -strloss, 1);
        note_unported_spell('cursed_book:losestr_killer');
        await losehp(damage, 'contact-poisoned spellbook', KILLED_BY_AN);
        book.in_use = was_in_use;
        break;
    }
    case 6: {
        if (game.u.uprops?.ANTIMAGIC || game.u.uprops?.MAGIC_RES) {
            await pline_The('book radiates explosive energy, but you are unharmed!');
        } else {
            await pline('As you read the book, it radiates explosive energy in your face!');
            let damage = 2 * rnd(10) + 5;
            if (game.u.uprops?.HALF_PHDAM)
                damage = Math.ceil(damage / 2);
            const { losehp } = await import('./hack.js');
            await losehp(damage, 'exploding rune', KILLED_BY_AN);
        }
        return true;
    }
    }
    return false;
}

// src/spell.c:189 confused_book()
async function confused_book(spellbook) {
    if (!rn2(3) && spellbook.otyp !== ONAMES.SPE_BOOK_OF_THE_DEAD) {
        spellbook.in_use = true;
        await pline('Being confused you have difficulties in controlling your actions.');
        await You('accidentally tear the spellbook to pieces.');
        const { trycall } = await import('./do_name.js');
        const { useup } = await import('./invent.js');
        await trycall(spellbook);
        useup(spellbook);
        return true;
    }
    await You(`find yourself reading the ${
        spellbook === game.context.spbook?.book ? 'next' : 'first'
    } line over and over again.`);
    return false;
}

// include/spell.h:12
const MAX_SPELL_STUDY = 3;

function on_stairs_at_u() {
    for (let stway = game.stairs; stway; stway = stway.next)
        if (stway.sx === game.u.ux && stway.sy === game.u.uy)
            return true;
    return false;
}

// src/spell.c:231 deadbook(). The successful invocation path is complete.
// Raising or pacifying undead away from a prepared ritual remains recorded
// until those monster effects are ported.
async function deadbook(book) {
    await You('turn the pages of the Book of the Dead...');
    makeknown(ONAMES.SPE_BOOK_OF_THE_DEAD);
    observe_object(book);
    book.known = 1;

    const { invocation_pos } = await import('./hack.js');
    if (invocation_pos(game.u.ux, game.u.uy) && !on_stairs_at_u()) {
        if (book.cursed) {
            await pline_The(game.u.ublind
                ? 'Book seems to be ignoring you!'
                : "runes appear scrambled.  You can't read them!");
            return;
        }

        if (!game.u.uhave?.bell || !game.u.uhave?.menorah) {
            await pline('A chill runs down your spine.');
            if (!game.u.uhave?.bell)
                await You_hear('a faint chime...');
            if (!game.u.uhave?.menorah)
                await pline("Vlad's doppelganger is amused.");
            return;
        }

        let candelabrumPrimed = false;
        let bellPrimed = false;
        let relicCursed = false;
        for (const obj of game.invent || []) {
            if (obj.otyp === ONAMES.CANDELABRUM_OF_INVOCATION
                && obj.spe === 7 && obj.lamplit) {
                if (obj.cursed) relicCursed = true;
                else candelabrumPrimed = true;
            }
            if (obj.otyp === ONAMES.BELL_OF_OPENING
                && game.moves - (obj.age || 0) < 5) {
                if (obj.cursed) relicCursed = true;
                else bellPrimed = true;
            }
        }

        if (relicCursed) {
            await pline_The('invocation fails!');
            await pline('At least one of your relics is cursed...');
        } else if (candelabrumPrimed && bellPrimed) {
            const soon = d(2, 6);
            const { mkinvokearea } = await import('./mklev.js');
            await mkinvokearea();
            (game.u.uevent ||= {}).invoked = 1;
            game.u.uevent.udemigod = 1;
            const { ACH_INVK, record_achievement } = await import('./insight.js');
            record_achievement(ACH_INVK);
            if (!game.u.udg_cnt || game.u.udg_cnt > soon)
                game.u.udg_cnt = soon;
        } else {
            await You('have a feeling that something is amiss...');
            note_unported_spell('deadbook:raise_dead');
        }
        return;
    }

    if (book.cursed) {
        note_unported_spell('deadbook:raise_dead');
    } else if (book.blessed) {
        note_unported_spell('deadbook:pacify_undead');
    } else {
        switch (rn2(3)) {
        case 0:
            await Your('ancestors are annoyed with you!');
            break;
        case 1:
            await pline_The('headstones in the cemetery begin to move!');
            break;
        default:
            await pline('Oh my!  Your name appears in the book!');
            break;
        }
    }
}

// src/spell.c:356 learn(), the per-turn spellbook study occupation.
async function learn() {
    const spbook = (game.context.spbook ||= {});
    const book = spbook.book;

    if (!book)
        return 0;
    if (spbook.delay && game.u.ublindf?.otyp === ONAMES.LENSES && rn2(2))
        spbook.delay++;
    if (game.u.uprops?.CONFUSION) {
        await confused_book(book);
        spbook.book = null;
        spbook.o_id = 0;
        const { nomul } = await import('./hack.js');
        nomul(spbook.delay);
        game.multi_reason = 'reading a book';
        game.nomovemsg = null;
        spbook.delay = 0;
        return 0;
    }
    if (spbook.delay) {
        spbook.delay++;
        return 1;
    }

    exercise(A_WIS, true);
    let booktype = book.otyp;
    if (booktype === ONAMES.SPE_BOOK_OF_THE_DEAD) {
        await deadbook(book);
        return 0;
    }

    const name = OBJ_NAME(game.objects[booktype]);
    const splname = game.objects[booktype].oc_name_known
        ? `"${name}"` : `the "${name}" spell`;
    let i;
    for (i = 0; i < MAXSPELL; i++)
        if (spellid(i) === booktype || spellid(i) === NO_SPELL)
            break;

    let faded_to_blank = false;
    if (i === MAXSPELL) {
        note_unported_spell('learn:too_many_spells');
    } else if (spellid(i) === booktype) {
        if ((book.spestudied | 0) > MAX_SPELL_STUDY) {
            await pline('This spellbook is too faint to be read any more.');
            book.otyp = booktype = ONAMES.SPE_BLANK_PAPER;
            faded_to_blank = true;
            book.spestudied = rn2(book.spestudied);
        } else {
            await Your(`knowledge of ${splname} is ${
                spellknow(i) ? 'keener' : 'restored'}.`);
            incrnknow(i, 1);
            book.spestudied = (book.spestudied | 0) + 1;
            exercise(A_WIS, true);
        }
    } else if ((book.spestudied | 0) >= MAX_SPELL_STUDY) {
        await pline('This spellbook is too faint to read even once.');
        book.otyp = booktype = ONAMES.SPE_BLANK_PAPER;
        faded_to_blank = true;
        book.spestudied = rn2(book.spestudied);
    } else {
        (game.spl_book ||= [])[i] = {
            sp_id: booktype,
            sp_lev: game.objects[booktype].oc_level,
            sp_know: 0,
        };
        incrnknow(i, 1);
        book.spestudied = (book.spestudied | 0) + 1;
        if (!i)
            await You(`learn ${splname}.`);
        else
            await You(`add ${splname} to your repertoire, as '${spellet(i)}'.`);
    }
    if (i < MAXSPELL) {
        makeknown(booktype);
        if (faded_to_blank)
            update_inventory();
    }

    if (book.cursed && await cursed_book(book)) {
        const { useup } = await import('./invent.js');
        useup(book);
        spbook.book = null;
        spbook.o_id = 0;
        return 0;
    }
    if (book.unpaid)
        note_unported_spell('learn:check_unpaid');
    spbook.book = null;
    spbook.o_id = 0;
    return 0;
}

// src/spell.c:468 study_book()
export async function study_book(spellbook) {
    const booktype = spellbook.otyp;
    const confused = !!game.u.uprops?.CONFUSION;

    /* attempting to read dull book may make hero fall asleep */
    if (!confused
        && !(game.u.intrinsic?.HSleep_resistance || game.u.uprops?.SLEEP_RES)
        && OBJ_DESCR(game.objects[booktype]) === 'dull') {
        let dullbook = rnd(25) - ACURR(A_WIS);
        if (game.context.spbook?.delay
            && spellbook === game.context.spbook?.book)
            dullbook -= rnd(game.objects[booktype].oc_level);
        if (dullbook > 0) {
            /* body_part(EYE) pluralized — "eyes" for every current form */
            await pline("This book is so dull that you can't keep your eyes open.");
            dullbook += rnd(2 * game.objects[booktype].oc_level);
            await fall_asleep(-dullbook, true);
            return 1;
        }
    }

    const continuing = game.context.spbook?.delay && !confused
        && spellbook === game.context.spbook?.book
        && booktype !== ONAMES.SPE_BLANK_PAPER;

    if (continuing) {
        await You(`continue your efforts to ${
            booktype === ONAMES.SPE_NOVEL ? 'read the novel'
                                          : 'memorize the spell'}.`);
    } else {
        if (booktype === ONAMES.SPE_BLANK_PAPER) {
            await pline('This spellbook is all blank.');
            makeknown(booktype);
            return 1;
        }
        if (booktype === ONAMES.SPE_NOVEL) {
            note_unported_spell('study_book:novel');
            return 1;
        }

        const lvl = game.objects[booktype].oc_level;
        const delayTbl = {
            1: 1, 2: 1, 3: lvl - 1, 4: lvl - 1,
            5: lvl, 6: lvl, 7: 8,
        };
        (game.context.spbook ||= {}).delay =
            -(delayTbl[lvl] ?? 1) * game.objects[booktype].oc_delay;

        let i;
        for (i = 0; i < MAXSPELL; i++)
            if (spellid(i) === booktype || spellid(i) === NO_SPELL)
                break;
        if (spellid(i) === booktype && spellknow(i) > KEEN / 10) {
            await You(`know "${OBJ_NAME(game.objects[booktype])}" quite well already.`);
            makeknown(booktype);
            if ((await tty_yn_function('Refresh your memory anyway?', 'yn', 'n'))
                === 'n')
                return 0;
        }

        spellbook.in_use = true;
        let too_hard = false;
        if (!spellbook.blessed && booktype !== ONAMES.SPE_BOOK_OF_THE_DEAD) {
            if (spellbook.cursed) {
                too_hard = true;
            } else {
                const read_ability = ACURR(A_INT) + 4
                    + Math.trunc(game.u.ulevel / 2) - 2 * lvl
                    + (game.u.ublindf?.otyp === ONAMES.LENSES ? 2 : 0);
                if (Role_if(PMNAMES.PM_WIZARD) && read_ability < 20
                    && !confused) {
                    const very = read_ability < 12 ? 'very ' : '';
                    if ((await tty_yn_function(
                        `This spellbook is ${very}difficult to comprehend.  Continue?`,
                        'yn', 'n')) !== 'y') {
                        spellbook.in_use = false;
                        return 1;
                    }
                }
                if (rnd(20) > read_ability)
                    too_hard = true;
            }
        }

        if (too_hard) {
            const gone = await cursed_book(spellbook);
            const { nomul } = await import('./hack.js');
            nomul(game.context.spbook.delay);
            game.multi_reason = 'reading a book';
            game.nomovemsg = null;
            game.context.spbook.delay = 0;
            if (gone || !rn2(3)) {
                if (!gone)
                    await pline_The('spellbook crumbles to dust!');
                const { trycall } = await import('./do_name.js');
                const { useup } = await import('./invent.js');
                await trycall(spellbook);
                useup(spellbook);
            } else {
                spellbook.in_use = false;
            }
            return 1;
        }
        if (confused) {
            if (!await confused_book(spellbook))
                spellbook.in_use = false;
            const { nomul } = await import('./hack.js');
            nomul(game.context.spbook.delay);
            game.multi_reason = 'reading a book';
            game.nomovemsg = null;
            game.context.spbook.delay = 0;
            return 1;
        }
        spellbook.in_use = false;
        await You(`begin to ${
            booktype === ONAMES.SPE_BOOK_OF_THE_DEAD ? 'recite' : 'memorize'
        } the runes.`);
    }

    game.context.spbook.book = spellbook;
    game.context.spbook.o_id = spellbook.o_id;
    const { set_occupation } = await import('./allmain.js');
    set_occupation(learn, 'studying', 0);
    return 1;
}

// src/spell.c:115 spell_let_to_idx() — 'a'-'z' then 'A'-'Z'.
function spell_let_to_idx(ilet) {
    let indx = ilet.charCodeAt(0) - 'a'.charCodeAt(0);
    if (indx >= 0 && indx < 26)
        return indx;
    indx = ilet.charCodeAt(0) - 'A'.charCodeAt(0);
    if (indx >= 0 && indx < 26)
        return indx + 26;
    return -1;
}

// src/spell.c num_spells() — spells are contiguous from slot 0.
export function num_spells() {
    for (let i = 0; i < MAXSPELL; i++)
        if (spellid(i) === NO_SPELL)
            return i;
    return MAXSPELL;
}

// src/spell.c:715 getspell() — choose a spell to cast.
//
// Only the MENU_TRADITIONAL arm is ported, which is the one the recorded
// sessions take: seed0501 sends 'Z' then 'a'. It builds the letter range into
// the prompt, so a hero with three spells is asked "[a-c *?]" and one with a
// single spell "[a *?]" -- the text differs per hero and is on screen.
//
// The retry_limit of 10 is C's, and "That's enough tries." is a real message
// that ends the loop; '*' or '?' would break out to the menu, which is not
// ported.
export async function getspell(spell_noRef) {
    const nspells = num_spells();

    if (!nspells) {
        await You("don't know any spells right now.");
        return false;
    }
    if (rejectcasting())
        return false;

    /* src/spell.c:744 — MENU_TRADITIONAL asks on the topline; every other
       menustyle (the default is MENU_FULL) opens the cast menu. */
    if ((game.rc?.opts?.menustyle || '').toLowerCase().startsWith('t')) {
        let lets;
        if (nspells === 1) lets = 'a';
        else if (nspells < 27) lets = 'a-' + String.fromCharCode(96 + nspells);
        else if (nspells === 27) lets = 'a-zA';
        else lets = 'a-zA-' + String.fromCharCode(64 + nspells - 26);

        const qbuf = `Cast which spell? [${lets} *?]`;

        for (let retry_limit = 0; ; ++retry_limit) {
            if (retry_limit === 10) {
                await pline("That's enough tries.");
                return false;
            }
            const ilet = await tty_yn_function(qbuf, null, '\0');
            if (ilet === '*' || ilet === '?')
                break;                  /* use menu mode */
            if (quitchars.includes(ilet)) {
                await pline('Never mind.');
                return false;
            }
            const idx = spell_let_to_idx(ilet);
            if (idx < 0 || idx >= nspells) {
                await You("don't know that spell.");
                continue;               /* ask again */
            }
            spell_noRef.v = idx;
            return true;
        }
    }

    const r = await dospellmenu('Choose which spell to cast', SPELLMENU_CAST);
    if (r.chosen) {
        spell_noRef.v = r.spell_no;
        return true;
    }
    return false;
}

// src/spell.c docast() — the 'Z' command.
export async function docast() {
    const ref = { v: 0 };
    if (await getspell(ref)) {
        /* cmdq_add_key(CQ_REPEAT, spellet(spell_no)) is the repeat queue */
        return await spelleffects(game.spl_book[ref.v].sp_id, false, false);
    }
    return ECMD_FAIL;
}

// src/spell.c spelleffects() — cast it. Only the pre-flight check is ported;
// the effects themselves are a per-spell dispatch that needs zap/potion/etc.
export async function spelleffects(spell_otyp, atme, force) {
    const spell = spell_idx(spell_otyp);
    const energy = { v: 0 };

    if (!force) {
        const r = await spelleffects_check(spell, energy);
        if (r.rejected)
            return r.res;
    }

    game.u.uen -= energy.v;
    exercise(A_WIS, true);

    /* pseudo = mksobj(spellid(spell), FALSE, FALSE) — a throwaway object
       carrying the spell's stats, which the per-spell dispatch below reads.
       mksobj DRAWS, so it is made here rather than skipped with the switch. */
    const pseudo = mksobj(force ? spell : spellid(spell), false, false);
    pseudo.blessed = pseudo.cursed = 0;
    pseudo.quan = 20;                   /* do not let useup get it */
    const otyp = pseudo.otyp;
    const role_skill = P_SKILL(spell_skilltype(otyp));

    switch (otyp) {
    case ONAMES.SPE_HEALING:
    case ONAMES.SPE_EXTRA_HEALING:
    case ONAMES.SPE_DRAIN_LIFE:
    case ONAMES.SPE_STONE_TO_FLESH:
        if (game.objects[otyp].oc_dir !== NODIR) {
            if (otyp === ONAMES.SPE_HEALING
                || otyp === ONAMES.SPE_EXTRA_HEALING) {
                /* healing and extra healing are actually potion effects,
                   but they've been extended to take a direction */
                if (role_skill >= SKILLS.P_SKILLED)
                    pseudo.blessed = 1;
            }
            if (atme) {
                game.u.dx = game.u.dy = game.u.dz = 0;
            } else if (!(await getdir(null))) {
                /* getdir cancelled, re-use previous direction */
                await pline_The('magical energy is released!');
            }
            if (!game.u.dx && !game.u.dy && !game.u.dz) {
                const dmg = await zapyourself(pseudo, true);
                if (dmg) {
                    /* losehp("zapped himself with a spell") */
                    note_unported_spell('spelleffects:losehp');
                }
            } else {
                /* weffects — the beam engine */
                note_unported_spell('spelleffects:weffects');
            }
        } else {
            note_unported_spell('spelleffects:weffects');
        }
        update_inventory();     /* spell may modify inventory */
        break;
    default:
        /* the remaining arms need seffects/peffects/the beam engine */
        note_unported_spell('spelleffects:per-spell dispatch');
        break;
    }
    return ECMD_TIME;
}

// src/spell.c spell_idx() — the slot holding this spell type.
function spell_idx(spell_otyp) {
    for (let i = 0; i < MAXSPELL; i++) {
        if (spellid(i) === spell_otyp)
            return i;
        if (spellid(i) === NO_SPELL)
            break;
    }
    return -1;
}

// include/spell.h MAXSPELL, src/decl.c quitchars
const MAXSPELL = 52;   /* include/decl.h spl_book[MAXSPELL + 1] */
const quitchars = ' \r\n\x1b';

// src/spell.c:17 KEEN, include/spell.h:36 SPELL_LEV_PW
const KEEN = 20000;
export const SPELL_LEV_PW = (lvl) => lvl * 5;

export const spe_Forgotten = -1;
export const spe_Unknown = 0;
export const spe_Fresh = 1;
export const spe_GoingStale = 2;

// src/spell.c known_spell(). Classify retained knowledge for a book type.
export function known_spell(otyp) {
    for (let i = 0; i < MAXSPELL && spellid(i) !== NO_SPELL; i++) {
        if (spellid(i) === otyp) {
            const knowledge = spellknow(i);
            return knowledge > KEEN / 10 ? spe_Fresh
                 : knowledge > 0 ? spe_GoingStale : spe_Forgotten;
        }
    }
    return spe_Unknown;
}

// src/spell.c force_learn_spell(). Add or refresh a spell and return its key.
export function force_learn_spell(otyp) {
    if (otyp === ONAMES.SPE_BLANK_PAPER
        || otyp === ONAMES.SPE_BOOK_OF_THE_DEAD
        || known_spell(otyp) === spe_Fresh)
        return '';

    let i;
    for (i = 0; i < MAXSPELL; i++)
        if (spellid(i) === NO_SPELL || spellid(i) === otyp)
            break;
    if (i === MAXSPELL)
        return '';

    (game.spl_book ||= [])[i] = {
        sp_id: otyp,
        sp_lev: game.objects[otyp].oc_level,
        sp_know: KEEN,
    };
    return String.fromCharCode(i < 26 ? 97 + i : 65 + i - 26);
}

// include/spell.h:33 spellknow()
function spellknow(spidx) {
    return game.spl_book?.[spidx]?.sp_know ?? 0;
}

// src/spell.c:1220 spelleffects_check() — everything that can stop a cast
// before it happens. Returns TRUE when the cast is rejected.
//
// The DRAW is the last line: `rnd(100) > percent_success(spell)`. Everything
// above it is a gate, and two of those gates draw too -- rnd(*energy) when the
// hero's knowledge of the spell has run out, and rnd(2 * *energy) when the
// Amulet drains them.
//
// Returns { rejected, res, energy } because C uses two out-parameters.
export async function spelleffects_check(spell, energyRef) {
    let res = ECMD_OK;
    const confused = !!game.u?.uprops?.CONFUSION;

    energyRef.v = 0;

    if (spell === UNKNOWN_SPELL) {
        return { rejected: true, res: ECMD_OK };
    }
    /* rejectcasting() covers Stunned and having no free hands */
    if (rejectcasting()) {
        return { rejected: true, res: ECMD_OK };
    }

    energyRef.v = SPELL_LEV_PW(spellev(spell));   /* 5 <= energy <= 35 */

    if (spellknow(spell) <= 0) {
        await Your('knowledge of this spell is twisted.');
        await pline('It invokes nightmarish images in your mind...');
        note_unported_spell('spell_backfire');
        game.u.uen -= rnd(energyRef.v);
        if (game.u.uen < 0) game.u.uen = 0;
        return { rejected: true, res: ECMD_TIME };
    } else if (spellknow(spell) <= KEEN / 200) {
        await You('strain to recall the spell.');
    } else if (spellknow(spell) <= KEEN / 40) {
        await You('have difficulty remembering the spell.');
    } else if (spellknow(spell) <= KEEN / 20) {
        await Your('knowledge of this spell is growing faint.');
    } else if (spellknow(spell) <= KEEN / 10) {
        await Your('recall of this spell is gradually fading.');
    }

    if (game.u.uhunger <= 10 && spellid(spell) !== ONAMES.SPE_DETECT_FOOD) {
        await You('are too hungry to cast that spell.');
        return { rejected: true, res: ECMD_OK };
    } else if (ACURR(A_STR) < 4 && spellid(spell) !== ONAMES.SPE_RESTORE_ABILITY) {
        await You('lack the strength to cast spells.');
        return { rejected: true, res: ECMD_OK };
    }
    /* check_capacity() needs the encumbrance message plumbing; it draws
       nothing and only fires when the hero is carrying near their limit. */

    if (game.u.uhave?.amulet && game.u.uen >= energyRef.v) {
        await You_feel('the amulet draining your energy away.');
        game.u.uen -= rnd(2 * energyRef.v);
        if (game.u.uen < 0) game.u.uen = 0;
        res = ECMD_TIME;                /* time is used even if the cast fails */
    }

    if (energyRef.v > game.u.uen) {
        await You("don't have enough energy to cast that spell"
                  + ((game.u.uen < game.u.uenmax) ? ''
                     : (energyRef.v > (game.u.uenpeak ?? 0)) ? ' yet'
                     : ' anymore') + '.');
        return { rejected: true, res };
    }

    if (spellid(spell) !== ONAMES.SPE_DETECT_FOOD) {
        let hungr = energyRef.v * 2;

        /* a Wizard's Intelligence reduces the hunger cost */
        let intell = acurr(A_INT);
        if (!Role_if(PMNAMES.PM_WIZARD))
            intell = 10;
        if (intell >= 17)
            hungr = 0;
        else if (intell === 16)
            hungr = Math.trunc(hungr / 4);
        else if (intell === 15)
            hungr = Math.trunc(hungr / 2);

        /* do not put the hero quite into fainting */
        if (hungr > game.u.uhunger - 3)
            hungr = game.u.uhunger - 3;
        await morehungry(hungr);
    }

    const chance = percent_success(spell);
    if (confused || (rnd(100) > chance)) {
        await You('fail to cast the spell correctly.');
        game.u.uen -= Math.trunc(energyRef.v / 2);
        return { rejected: true, res: ECMD_TIME };
    }
    return { rejected: false, res };
}

// src/spell.c rejectcasting() — Stunned, or no free hands.
function rejectcasting() {
    if (game.u?.uprops?.STUNNED) {
        note_unported_spell('rejectcasting:Stunned message');
        return true;
    }
    /* the no-free-hands arm needs cantwield/welded on the hero's weapon */
    return false;
}

// include/spell.h:9 UNKNOWN_SPELL — MINUS ONE. Written as 0 here first,
// which made spell index 0 (the first known spell) look unknown and made
// spelleffects_check reject every cast on its opening line.
const UNKNOWN_SPELL = -1;

function note_unported_spell(what) {
    (game.unported ||= new Set()).add(what);
}

// src/spell.c:106 — the metal-armour penalties. Not role-specific: headgear,
// gauntlets and footwear interfere with anyone.
const uarmhbon = 4;    /* metal helmets interfere with the mind */
const uarmgbon = 6;    /* casting channels through the hands */
const uarmfbon = 2;    /* all metal interferes to some degree */

// src/spell.c:2173 percent_success() — the hero's chance of casting `spell`.
//
// Draws nothing, and every term matters because the single visible draw is
// `rnd(100) > percent_success(spell)` in spelleffects_check.
//
// Two halves: splcaster is intrinsic ability (role base plus armour
// penalties, capped at 20), and chance is learned ability (the casting stat,
// adjusted by how far the hero's level and skill are from the spell's). They
// are combined at the end, and a heavy shield divides the learned half.
export function percent_success(spell) {
    let chance, splcaster, special, statused, difficulty, skill;
    const skilltype = spell_skilltype(spellid(spell));
    /* Knights get no metal-armour penalty for clerical spells */
    const paladin_bonus = Role_if(PMNAMES.PM_KNIGHT)
                          && skilltype === P_CLERIC_SPELL;

    const uarm = worn(W_ARM), uarmc = worn(W_ARMC), uarms = worn(W_ARMS);
    const uarmh = worn(W_ARMH), uarmg = worn(W_ARMG), uarmf = worn(W_ARMF);
    const uwep = worn(W_WEP);

    splcaster = game.urole.spelbase;
    special = game.urole.spelheal;
    statused = ACURR(game.urole.spelstat);

    if (uarm && is_metallic(uarm) && !paladin_bonus)
        splcaster += (uarmc && uarmc.otyp === ONAMES.ROBE)
                     ? Math.trunc(game.urole.spelarmr / 2) : game.urole.spelarmr;
    else if (uarmc && uarmc.otyp === ONAMES.ROBE)
        splcaster -= game.urole.spelarmr;
    if (uarms)
        splcaster += game.urole.spelshld;

    if (uwep && uwep.otyp === ONAMES.QUARTERSTAFF)
        splcaster -= 3;                 /* small bonus */

    if (!paladin_bonus) {
        if (uarmh && is_metallic(uarmh)) splcaster += uarmhbon;
        if (uarmg && is_metallic(uarmg)) splcaster += uarmgbon;
        if (uarmf && is_metallic(uarmf)) splcaster += uarmfbon;
    }

    if (spellid(spell) === game.urole.spelspec)
        splcaster += game.urole.spelsbon;

    /* `healing spell' bonus */
    const sid = spellid(spell);
    if (sid === ONAMES.SPE_HEALING || sid === ONAMES.SPE_EXTRA_HEALING
        || sid === ONAMES.SPE_CURE_BLINDNESS || sid === ONAMES.SPE_CURE_SICKNESS
        || sid === ONAMES.SPE_RESTORE_ABILITY || sid === ONAMES.SPE_REMOVE_CURSE)
        splcaster += special;

    if (splcaster > 20)
        splcaster = 20;

    /* learned ability, from the casting stat */
    chance = Math.trunc(11 * statused / 2);

    skill = P_SKILL(skilltype);
    skill = Math.max(skill, P_UNSKILLED) - 1;   /* unskilled => 0 */
    difficulty = (spellev(spell) - 1) * 4
                 - ((skill * 6) + Math.trunc(game.u.ulevel / 3) + 1);

    if (difficulty > 0) {
        /* too low level or unskilled */
        chance -= isqrt(900 * difficulty + 2000);
    } else {
        /* above level; diminishing returns for low-level spells */
        const learning = Math.trunc(15 * -difficulty / spellev(spell));
        chance += learning > 20 ? 20 : learning;
    }

    if (chance < 0) chance = 0;
    if (chance > 120) chance = 120;

    /* anything but a light shield makes casting very awkward */
    if (uarms && weight(uarms) > game.objects[ONAMES.SMALL_SHIELD].oc_weight) {
        if (spellid(spell) === game.urole.spelspec)
            chance = Math.trunc(chance / 2);
        else
            chance = Math.trunc(chance / 4);
    }

    chance = Math.trunc(chance * (20 - splcaster) / 15) - splcaster;

    if (chance > 100) chance = 100;
    if (chance < 0) chance = 0;
    return chance;
}

// include/skills.h:115 P_SKILL()
const P_SKILL = (type) => game.u.weapon_skills?.[type]?.skill ?? P_ISRESTRICTED;

// src/role.c Role_if()
const Role_if = (pm) => game.urole?.malenum === pm || game.urole?.mnum === pm;

// src/spell.c:25 spellname(), :26 spellet()
const spellname = (spell) => {
    const ocl = game.objects[spellid(spell)];
    return OBJ_NAME(ocl) ?? '';
};
const spellet = (spell) =>
    String.fromCharCode(spell < 26 ? 97 + spell : 65 + spell - 26);

// src/spell.c:669 age_spells() — every pass through the move loop costs one
// turn of memory for every known spell, whatever the hero is doing.
export function age_spells() {
    for (let i = 0; i < MAXSPELL && spellid(i) !== NO_SPELL; i++)
        if (spellknow(i))
            game.spl_book[i].sp_know--;         /* decrnknow(i) */
}

// src/spell.c:832 spelltypemnemonic()
function spelltypemnemonic(skill) {
    switch (skill) {
    case SKILLS.P_ATTACK_SPELL:      return 'attack';
    case SKILLS.P_HEALING_SPELL:     return 'healing';
    case SKILLS.P_DIVINATION_SPELL:  return 'divination';
    case SKILLS.P_ENCHANTMENT_SPELL: return 'enchantment';
    case SKILLS.P_CLERIC_SPELL:      return 'clerical';
    case SKILLS.P_ESCAPE_SPELL:      return 'escape';
    case SKILLS.P_MATTER_SPELL:      return 'matter';
    default:                         return '';
    }
}

// src/spell.c:2295 spellretention() — the "91%-100%" column. The range width
// depends on the hero's skill in the spell's school.
function spellretention(idx) {
    let skill = P_SKILL(spell_skilltype(spellid(idx)));
    skill = Math.max(skill, P_UNSKILLED); /* restricted same as unskilled */
    const turnsleft = spellknow(idx);

    if (turnsleft < 1)
        return '(gone)';
    if (turnsleft >= KEEN)
        return '100%';
    let percent = Math.trunc((turnsleft - 1) / (KEEN / 100)) + 1;
    const accuracy = (skill === SKILLS.P_EXPERT) ? 2
                     : (skill === SKILLS.P_SKILLED) ? 5
                       : (skill === SKILLS.P_BASIC) ? 10
                         : 25;
    /* round up to the high end of this range */
    percent = accuracy * (Math.trunc((percent - 1) / accuracy) + 1);
    return `${percent - accuracy + 1}%-${percent}%`;
}

// src/spell.c:2058 SPELLMENU codes (include/spell.h)
const SPELLMENU_CAST = -2, SPELLMENU_VIEW = -1, SPELLMENU_SORT = -3;

// src/spell.c:2075 dospellmenu()
async function dospellmenu(prompt, splaction) {
    const win = tty_create_nhwindow(NHW_MENU);
    tty_start_menu(win, MENU_BEHAVE_STANDARD);

    /* iflags.menu_tab_sep is off on tty */
    let header = (splaction === SPELLMENU_DUMP ? '' : '    ')
        + 'Name'.padEnd(20) + ' Level ' + 'Category'.padEnd(12)
        + ' Fail Retention';
    /* src/spell.c:2115 — wizard mode appends the exact turn counts */
    if (game.wizard)
        header += ' ' + 'turns'.padStart(6);
    /* C add_menu_heading() stamps iflags.menu_headings — ATR_INVERSE with
       NO_COLOR (src/options.c:7188) — on the whole line. */
    tty_add_menu(win, null, 0, 0, 0, ATR_INVERSE, NO_COLOR, header,
                 MENU_ITEMFLAGS_NONE);
    for (let i = 0; i < MAXSPELL && spellid(i) !== NO_SPELL; i++) {
        let buf = spellname(i).padEnd(20)
            + '  ' + String(spellev(i)).padStart(2)
            + '   ' + spelltypemnemonic(spell_skilltype(spellid(i))).padEnd(12)
            + ' ' + String(100 - percent_success(i)).padStart(3) + '%'
            + ' ' + spellretention(i).padStart(9);
        if (game.wizard)
            buf += ' ' + String(spellknow(i)).padStart(6);
        tty_add_menu(win, null, i + 1, spellet(i), 0, ATR_NONE, NO_COLOR,
                     buf, (i === splaction) ? MENU_ITEMFLAGS_SELECTED
                                            : MENU_ITEMFLAGS_NONE);
    }
    let how = PICK_ONE;
    if (splaction === SPELLMENU_VIEW) {
        if (spellid(1) === NO_SPELL) {
            /* only one spell => nothing to swap with */
            how = PICK_NONE;
        } else {
            /* more than 1 spell, add an extra menu entry */
            tty_add_menu(win, null, SPELLMENU_SORT + 1, '+', 0, ATR_NONE,
                         NO_COLOR, '[sort spells]', MENU_ITEMFLAGS_NONE);
        }
    }
    tty_end_menu(win, prompt);

    const picks = await tty_select_menu(win, how);
    tty_destroy_nhwindow(win);
    if (picks.length > 0) {
        let spell_no = picks[0] - 1;
        if (picks.length > 1 && spell_no === splaction)
            spell_no = picks[1] - 1;
        if (spell_no === splaction)
            return { chosen: false, spell_no };
        return { chosen: true, spell_no };
    } else if (splaction >= 0) {
        /* explicit de-selection of preselected spell means that
           user is still swapping but not for the current spell */
        return { chosen: true, spell_no: splaction };
    }
    return { chosen: false, spell_no: -1 };
}
const SPELLMENU_DUMP = -4;

// src/spell.c:2024 dovspell() — '+', list known spells.
export async function dovspell() {
    if (spellid(0) === NO_SPELL) {
        await pline("You don't know any spells right now.");
    } else {
        for (;;) {
            const r = await dospellmenu('Currently known spells',
                                        SPELLMENU_VIEW);
            if (!r.chosen)
                break;
            if (r.spell_no === SPELLMENU_SORT) {
                /* spellsortmenu() offers the sort orders */
                note_unported_spell('dovspell:spellsortmenu');
            } else {
                const q = `Reordering spells; swap '${spellet(r.spell_no)}' with`;
                const r2 = await dospellmenu(q, r.spell_no);
                if (!r2.chosen)
                    break;
                const tmp = game.spl_book[r.spell_no];
                game.spl_book[r.spell_no] = game.spl_book[r2.spell_no];
                game.spl_book[r2.spell_no] = tmp;
            }
        }
    }
    return ECMD_OK;
}
