// spell.js — spellcasting.
// C ref: src/spell.c

import { HEAD } from './const.js';
import { body_part } from './polyself.js';
import { helm_simple_name } from './do_wear.js';
import { do_vicinity_map } from './detect.js';
import { game } from './gstate.js';
import { pline } from './display.js';
import { ECMD_OK, weight } from './invent.js';
import { worn } from './do_wear.js';
import { ACURR } from './attrib.js';
import { isqrt } from './hacklib.js';
import { is_metallic } from './obj.js';
import { ONAMES, OCLASSES, SKILLS } from './objects_data.js';
import { PMNAMES } from './monst_data.js';
import { rnd, rn2, rn1, d, rnl } from './rng.js';
import { tty_yn_function } from './tty/topl.js';
import { tty_create_nhwindow, tty_start_menu, tty_add_menu, tty_end_menu,
         tty_select_menu, tty_destroy_nhwindow, ATR_NONE,
         ATR_INVERSE } from './tty/wintty.js';
import { NO_COLOR } from './terminal.js';
import { NHW_MENU, MENU_BEHAVE_STANDARD, PICK_ONE, PICK_NONE,
         MENU_ITEMFLAGS_NONE, MENU_ITEMFLAGS_SELECTED } from './const.js';
import { OBJ_NAME, OBJ_DESCR, Tobjnam } from './objnam.js';
import { ECMD_FAIL } from './const.js';
import { You, Your, You_feel, You_hear, pline_The } from './pline.js';
import { acurr, exercise } from './attrib.js';
import { mksobj, set_bknown } from './mkobj.js';
import { stop_occupation } from './allmain.js';
import { weffects, zapyourself } from './zap.js';
import { fall_asleep } from './timeout.js';
import { makeknown, observe_object } from './o_init.js';
import { getdir, cmdq_pop, cmdq_add_key } from './cmd.js';
import { update_inventory } from './invent.js';
import { obfree } from './invent.js';
import { use_skill } from './weapon.js';
import { seffects } from './read.js';
import { peffects } from './potion.js';
import { NODIR, NO_KILLER_PREFIX } from './const.js';
import { A_WIS, KILLED_BY_AN } from './const.js';
import { morehungry } from './eat.js';
import { ECMD_TIME } from './const.js';
import { A_STR, A_INT } from './const.js';
import { W_ARM, W_ARMC, W_ARMS, W_ARMH, W_ARMG, W_ARMF, W_WEP,
         P_CLERIC_SPELL, P_UNSKILLED, P_ISRESTRICTED } from './const.js';
import { CMDQ_KEY, CQ_REPEAT, MENU_TRADITIONAL, TIMEOUT } from './const.js';
import { Stunned, Confusion } from './youprop.js';
import { can_chant } from './mondata.js';
import { freehand } from './engrave.js';
import { check_capacity } from './hack.js';
import { make_confused, make_stunned } from './potion.js';
import { jump } from './apply.js';
import { healup, make_slimed } from './potion.js';
import { make_familiar } from './dog.js';
import { hcolor, hliquid, Monnam, mon_nam } from './do_name.js';
import { is_whirly, enfolds, is_animal, resists_elec, defended } from './mondata.js';
import { find_ac } from './do_wear.js';
import { Blind, Hallucination } from './youprop.js';
import { an } from './objnam.js';
import { NH_GOLDEN, CLOUD, IS_TREE, IS_STWALL, P_EXPERT, xdir, ydir, N_DIRS, DIR_LEFT, DIR_RIGHT2, D_CLOSED, D_LOCKED, D_ISOPEN, POOL, MOAT, DRAWBRIDGE_UP, LAVAPOOL, SPACE_POS, IS_DOOR, ZAP_POS, isok, DISP_BEAM, DISP_CHANGE, DISP_END, XKILL_GIVEMSG, EXPL_FROSTY, EXPL_FIERY, Is_waterlevel, u_at } from './const.js';
import { tmp_at, zapdir_to_glyph, map_invisible, canseemon, canspotmon, tty_clear_nhwindow_message } from './display.js';
import { m_at, wakeup, xkilled } from './mon.js';
import { DEADMONSTER } from './monst.js';
import { zhitm, exclam, spell_damage_bonus, BZ_U_SPELL } from './zap.js';
import { explode } from './explode.js';
import { rn2_on_display_rng } from './rng.js';
import { ATTKS } from './monst_data.js';
import { uhim } from './mhitu.js';
import { distmin } from './hacklib.js';
import { cansee } from './vision.js';
import { getpos, getpos_sethilite } from './getpos.js';
import { walk_path } from './dothrow.js';
import { showsym } from './symbols.js';
import { defsyms, cmap_names } from './drawing_data.js';
import { make_blinded } from './potion.js';
import { take_gold, rndcurse } from './sit.js';
import { erode_obj } from './trap.js';
import { poison_strdmg } from './attrib.js';
import { Antimagic, Poison_resistance } from './youprop.js';
import { shieldeff } from './display.js';
import { set_malign, makemon } from './makemon.js';
import { mkundead } from './mkroom.js';
import { tamedog } from './dog.js';
import { monflee, mdistu } from './monmove.js';
import { is_undead } from './mondata.js';
import { is_vampshifter, mon_offmap } from './monst.js';
import { NO_MINVENT, EF_GREASE, EF_VERBOSE, ERODE_CORRODE, FACE, something } from './const.js';
import { sgn } from './hacklib.js';
import { unturn_dead } from './zap.js';
import { Maybe_Half_Phys } from './do.js';
import { tele } from './teleport.js';
import { aggravate } from './wizard.js';

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

/* src/spell.c:111 */
const explodes = 'radiates explosive energy';

// src/spell.c:130 cursed_book()
async function cursed_book(bp) {
    const lev = game.objects[bp.otyp].oc_level;
    let dmg = 0;

    switch (rn2(lev)) {
    case 0:
        await You_feel('a wrenching sensation.');
        await tele(); /* teleport him */
        break;
    case 1:
        await You_feel('threatened.');
        aggravate();
        break;
    case 2:
        await make_blinded(((game.u.intrinsic?.HBlinded | 0) & TIMEOUT)
                           + rn1(100, 250), true);
        break;
    case 3:
        await take_gold();
        break;
    case 4:
        await pline('These runes were just too much to comprehend.');
        await make_confused((game.u.intrinsic?.HConfusion | 0) + rn1(7, 16),
                            false);
        break;
    case 5:
        await pline_The('book was coated with contact poison!');
        if (game.u.uarmg) {
            await erode_obj(game.u.uarmg, 'gloves', ERODE_CORRODE,
                            EF_GREASE | EF_VERBOSE);
            break;
        }
        {
            /* temp disable in_use; death should not destroy the book */
            const was_in_use = bp.in_use;
            bp.in_use = false;
            await poison_strdmg(Poison_resistance() ? rn1(2, 1) : rn1(4, 3),
                                rnd(Poison_resistance() ? 6 : 10),
                                'contact-poisoned spellbook', KILLED_BY_AN);
            bp.in_use = was_in_use;
        }
        break;
    case 6:
        if (Antimagic()) {
            await shieldeff(game.u.ux, game.u.uy);
            await pline_The(`book ${explodes}, but you are unharmed!`);
        } else {
            await pline(`As you read the book, it ${explodes} in your ${
                body_part(FACE)}!`);
            dmg = 2 * rnd(10) + 5;
            const { losehp } = await import('./hack.js');
            await losehp(Maybe_Half_Phys(dmg), 'exploding rune', KILLED_BY_AN);
        }
        return true;
    default:
        await rndcurse();
        break;
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

// src/spell.c:210 deadbook_pacify_undead() — pacify or tame an undead
// monster
async function deadbook_pacify_undead(mtmp) {
    if ((is_undead(mtmp.data) || is_vampshifter(mtmp))
        && cansee(mtmp.mx, mtmp.my)) {
        mtmp.mpeaceful = 1;
        if (sgn(mtmp.data.maligntyp) === sgn(game.u.ualign.type)
            && mdistu(mtmp) < 4) {
            if (mtmp.mtame) {
                if (mtmp.mtame < 20)
                    mtmp.mtame++;
            } else
                await tamedog(mtmp, null, true);
        } else
            await monflee(mtmp, 0, false, true);
    }
}

// src/spell.c:231 deadbook(). The successful invocation path is complete.
// Raising or pacifying undead away from a prepared ritual remains recorded
// until those monster effects are ported.
async function deadbook(book) {
    /* the raise_dead: label of the cursed arm below; the invocation arm
       jumps there when a relic is not prepared properly */
    const raise_dead = async () => {
        let mtmp;

        await You('raised the dead!');
        /* first maybe place a dangerous adversary */
        if (!rn2(3) && ((mtmp = await makemon(game.mons[PMNAMES.PM_MASTER_LICH],
                                              game.u.ux, game.u.uy,
                                              NO_MINVENT)) != null
                        || (mtmp = await makemon(game.mons[PMNAMES.PM_NALFESHNEE],
                                                 game.u.ux, game.u.uy,
                                                 NO_MINVENT)) != null)) {
            mtmp.mpeaceful = 0;
            set_malign(mtmp);
        }
        /* next handle the affect on things you're carrying */
        await unturn_dead(game.youmonst);
        /* last place some monsters around you */
        const mm = { x: game.u.ux, y: game.u.uy };
        await mkundead(mm, true, NO_MINVENT);
    };

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
        } else { /* at least one relic not prepared properly */
            await You(`have a feeling that ${something} is amiss...`);
            await raise_dead();
        }
        return;
    }

    /* when not an invocation situation */
    if (book.cursed) {
        await raise_dead();
    } else if (book.blessed) {
        /* iter_mons(deadbook_pacify_undead), awaiting each visit */
        for (const mtmp of [...(game.level.monsters || [])]) {
            if (DEADMONSTER(mtmp) || mon_offmap(mtmp))
                continue;
            await deadbook_pacify_undead(mtmp);
        }
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

// src/spell.c:344 book_cursed(). Only active study returns a message promise.
export function book_cursed(book) {
    if (book.cursed && game.multi >= 0 && game.occupation === learn
        && game.context.spbook?.book === book) {
        return pline(`${Tobjnam(book, 'slam')} shut!`).then(async () => {
            set_bknown(book, 1);
            await stop_occupation();
        });
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
    if (book.unpaid) {
        const { check_unpaid } = await import('./shk.js');
        await check_unpaid(book);
    }
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

// src/spell.c:687 rejectcasting()
async function rejectcasting() {
    if (Stunned()) {
        await You('are too impaired to cast a spell.');
        return true;
    } else if (!can_chant(game.youmonst)) {
        await You('are unable to chant the incantation.');
        return true;
    } else if (!freehand()
               && !(game.u.uwep && game.u.uwep.otyp === ONAMES.QUARTERSTAFF)) {
        await Your('arms are not free to cast!');
        return true;
    }
    return false;
}

// src/spell.c:715 getspell() — choose a spell to cast.
export async function getspell(spell_noRef) {
    const nspells = num_spells();

    if (!nspells) {
        await You("don't know any spells right now.");
        return false;
    }
    if (await rejectcasting())
        return false;

    const cmdq = cmdq_pop();
    if (cmdq) {
        if (cmdq.typ === CMDQ_KEY) {
            const idx = spell_let_to_idx(cmdq.key);
            if (idx < 0 || idx >= nspells)
                return false;
            spell_noRef.v = idx;
            return true;
        } else {
            return false;
        }
    }

    if (game.flags.menu_style === MENU_TRADITIONAL) {
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
            const ilet = await tty_yn_function(qbuf, null, '\0', true);
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

// src/spell.c:820 docast() — the 'Z' command.
export async function docast() {
    const ref = { v: 0 };
    if (await getspell(ref)) {
        cmdq_add_key(CQ_REPEAT, spellet(ref.v));
        return await spelleffects(game.spl_book[ref.v].sp_id, false, false);
    }
    return ECMD_FAIL;
}

/* win/tty: nh_delay_output() — the frame delay between animation steps */
async function nh_delay_output() {
    if (game.animationFrame)
        await game.animationFrame();
}

/* src/spell.c:911 CHAIN_LIGHTNING_LIMIT — the total area chain lightning can
   cover; smaller than TMP_AT_MAX_GLYPHS so it displays properly */
const CHAIN_LIGHTNING_LIMIT = 100;

// src/spell.c:916 CHAIN_LIGHTNING_TYP() — open space only: it can't hit
// solid terrain (not WATER, not LAVAWALL)
function CHAIN_LIGHTNING_TYP(typ) {
    return SPACE_POS(typ) || typ === POOL || typ === MOAT
           || typ === DRAWBRIDGE_UP || typ === LAVAPOOL;
}

// src/spell.c:920 CHAIN_LIGHTNING_POS()
function CHAIN_LIGHTNING_POS(x, y) {
    if (!isok(x, y))
        return false;
    const loc = game.level.at(x, y);
    return CHAIN_LIGHTNING_TYP(loc.typ)
           || (IS_DOOR(loc.typ) && !(loc.doormask & (D_CLOSED | D_LOCKED)));
}

// src/spell.c:951 propagate_chain_lightning() — move a zap one square
// forward and queue it unless it hits an invalid square or is out of power;
// zap is passed by value
async function propagate_chain_lightning(clq, zap) {
    zap = { ...zap };
    zap.x += xdir[zap.dir];
    zap.y += ydir[zap.dir];

    if (clq.tail >= CHAIN_LIGHTNING_LIMIT)
        return;    /* zap has covered too many squares */
    if (!CHAIN_LIGHTNING_POS(zap.x, zap.y))
        return;    /* zap can't go to this square */

    const mon = m_at(zap.x, zap.y);
    if (mon && mon.mpeaceful)
        return;    /* chain lightning avoids peaceful and tame monsters */

    /* When hitting a monster that isn't electricity-resistant, a
       particular chain lightning zap regains all its power, allowing it to
       chain to other monsters; upon hitting a shock-resistant monster it
       can't continue any further, but we let it hit the monster to show
       the shield effect */
    if (mon && !resists_elec(mon) && !defended(mon, ATTKS.AD_ELEC))
        zap.strength = 3;
    else if (mon)
        zap.strength = 0;

    /* Unless it hits a monster, the last square of a zap isn't drawn on
       screen and can't propagate further, so it may as well be discarded
       now */
    if (!mon && !zap.strength)
        return;

    /* The same square can't be chained to twice. */
    for (let i = 0; i < clq.tail; i++) {
        if (clq.q[i].x === zap.x && clq.q[i].y === zap.y)
            return;
    }

    clq.q[clq.tail++] = zap;

    /* Draw it. */
    await tmp_at(DISP_CHANGE, await zapdir_to_glyph(xdir[zap.dir], ydir[zap.dir],
                                                    clq.displayed_beam));
    await tmp_at(zap.x, zap.y);
}

// src/spell.c:1003 cast_chain_lightning()
async function cast_chain_lightning() {
    const clq = { q: [], head: 0, tail: 0,
                  displayed_beam: Hallucination() ? rn2_on_display_rng(6)
                                                  : (ATTKS.AD_ELEC - 1) };

    if (game.u.uswallow) {
        // TODO: damage the engulfer
        return;
    }

    /* set the type of beam we're using; the direction here is arbitrary
       because we change the beam direction just before drawing the beam
       anyway */
    await tmp_at(DISP_BEAM, await zapdir_to_glyph(0, 1, clq.displayed_beam));

    /* start by propagating in all directions from the caster */
    for (let dir = 0; dir < N_DIRS; dir++) {
        const zap = { dir, x: game.u.ux, y: game.u.uy, strength: 2 };

        await propagate_chain_lightning(clq, zap);
    }
    await nh_delay_output();

    while (clq.head < clq.tail) {
        const delay_tail = clq.tail;

        while (clq.head < delay_tail) {
            const zap = { ...clq.q[clq.head++] };
            /* damage any monster that was hit */
            const mon = m_at(zap.x, zap.y);

            if (mon) {
                const unused = { v: null }; /* AD_ELEC can't destroy armor */

                game.notonhead = (mon.mx !== game.bhitpos.x
                                  || mon.my !== game.bhitpos.y);
                const dmg = await zhitm(mon, BZ_U_SPELL(ATTKS.AD_ELEC - 1), 2, unused);

                if (dmg) {
                    /* mon has been damaged, but we haven't yet printed the
                       messages or given kill credit; assume the hero can
                       sense their spell hitting monsters, because they can
                       steer it away from peacefuls */
                    if (DEADMONSTER(mon)) {
                        await xkilled(mon, XKILL_GIVEMSG);
                    } else {
                        await pline(`You shock ${mon_nam(mon)}${exclam(dmg)}`);
                        /* if a long worm, only map 'I' for its head */
                        if (!canseemon(mon) && !game.notonhead)
                            /* FIXME: this doesn't work, possibly because
                               cleaning up tmp_at() restores old glyph? */
                            map_invisible(zap.x, zap.y);
                    }
                } else if (canseemon(mon)) {
                    await pline(`${Monnam(mon)} resists.`);
                }
                if (!DEADMONSTER(mon)) {
                    /* wakeup is via attack, but since mon is already
                       hostile we pass via_attack==False rather than True,
                       otherwise other monsters witnessing this would treat
                       it as seeing hero attack a peaceful; mimic will be
                       exposed; forcefight makes hider unhide */
                    game.context.forcefight = (game.context.forcefight | 0) + 1;
                    await wakeup(mon, false);
                    game.context.forcefight = (game.context.forcefight | 0) - 1;
                }
            }

            /* each zap propagates forwards with 1 less strength, and
               diagonally with 0 strength (thus the diagonal zaps aren't
               drawn and don't spread unless they hit a monster);
               exception: if the zap just hit a monster, the diagonals have
               as much strength as the forwards zap */
            if (!zap.strength)
                continue; /* happens upon hitting a shock-resistant monster */
            zap.strength--;

            await propagate_chain_lightning(clq, zap);

            if (zap.strength < 2)
                zap.strength = 0;
            else if (game.u.uen > 0)
                game.u.uen--; /* propagating past mons increases Pw cost a bit */
            zap.dir = DIR_LEFT(zap.dir);
            await propagate_chain_lightning(clq, zap);

            zap.dir = DIR_RIGHT2(zap.dir);
            await propagate_chain_lightning(clq, zap);
        }
        await nh_delay_output();
    }
    await nh_delay_output();
    await nh_delay_output();

    await tmp_at(DISP_END, 0);
}

// src/spell.c:1104 cast_protection()
async function cast_protection() {
    const u = game.u;
    let l = u.ulevel, loglev = 0;
    let natac = u.uac + (u.uspellprot || 0);
    /* note: u.uspellprot is subtracted when find_ac() factors it into u.uac,
       so adding here factors it back out
       (versions prior to 3.6 had this backwards) */

    /* loglev=log2(u.ulevel)+1 (1..5) */
    while (l) {
        loglev++;
        l = Math.trunc(l / 2);
    }

    /* The more u.uspellprot you already have, the less you get,
     * and the better your natural ac, the less you get.
     * (table in src/spell.c:1120)
     */
    natac = Math.trunc((10 - natac) / 10); /* convert to positive and scale down */
    const gain = loglev - Math.trunc((u.uspellprot || 0) / (4 - Math.min(3, natac)));

    if (gain > 0) {
        if (!Blind()) {
            const hgolden = hcolor(NH_GOLDEN);

            if (u.uspellprot) {
                await pline_The(`${hgolden} haze around you becomes more dense.`);
            } else {
                const pm = u.ustuck ? u.ustuck.data : null;

                const rmtyp = game.level.at(u.ux, u.uy).typ;
                const atmosphere = (pm && u.uswallow)
                                ? ((pm === game.mons[PMNAMES.PM_FOG_CLOUD]) ? 'mist'
                                   : is_whirly(pm) ? 'maelstrom'
                                     : enfolds(pm) ? 'folds'
                                       : is_animal(pm) ? 'maw'
                                         : 'ooze')
                                : (u.uinwater ? hliquid('water')
                                   : (rmtyp === CLOUD) ? 'cloud'
                                     : IS_TREE(rmtyp) ? 'vegetation'
                                       : IS_STWALL(rmtyp) ? 'stone'
                                         : 'air');
                await pline_The(`${atmosphere} around you begins to shimmer with ${
                    an(hgolden)} haze.`);
            }
        }
        u.uspellprot = (u.uspellprot || 0) + gain;
        u.uspmtime = (P_SKILL(spell_skilltype(ONAMES.SPE_PROTECTION)) === P_EXPERT)
                        ? 20 : 10;
        if (!u.usptime)
            u.usptime = u.uspmtime;
        find_ac();
    } else {
        await Your('skin feels warm for a moment.');
    }
}

// src/spell.c spelleffects(), cast the selected spell.
export async function spelleffects(spell_otyp, atme, force) {
    const spell = spell_idx(spell_otyp);
    const energy = { v: 0 };

    if (!force) {
        const r = await spelleffects_check(spell, energy);
        if (r.rejected)
            return r.res;
    }

    game.u.uen -= energy.v;
    (game.disp ||= {}).botl = true;
    exercise(A_WIS, true);

    /* pseudo = mksobj(spellid(spell), FALSE, FALSE) — a throwaway object
       carrying the spell's stats, which the per-spell dispatch below reads.
       mksobj DRAWS, so it is made here rather than skipped with the switch. */
    const pseudo = mksobj(force ? spell : spellid(spell), false, false);
    pseudo.blessed = pseudo.cursed = 0;
    pseudo.quan = 20;                   /* do not let useup get it */
    const otyp = pseudo.otyp;
    const skill = spell_skilltype(otyp);
    const role_skill = P_SKILL(skill);
    let physical_damage = false;

    switch (otyp) {
    /*
     * At first spells act as expected.  As the hero increases in skill
     * with the appropriate spell type, some spells increase in their
     * effects, e.g. more damage, further distance, and so on, without
     * additional cost to the spellcaster.
     */
    case ONAMES.SPE_FIREBALL:
    case ONAMES.SPE_CONE_OF_COLD:
        if (role_skill >= SKILLS.P_SKILLED) {
            if (await throwspell()) {
                const cc = { x: game.u.dx, y: game.u.dy };
                let n = rnd(8) + 1;
                while (n--) {
                    if (!game.u.dx && !game.u.dy && !game.u.dz) {
                        const damage = await zapyourself(pseudo, true);
                        if (damage) {
                            const { losehp } = await import('./hack.js');
                            await losehp(damage, `zapped ${uhim()}self with a spell`,
                                         NO_KILLER_PREFIX);
                        }
                    } else {
                        await explode(game.u.dx, game.u.dy,
                                      otyp - ONAMES.SPE_MAGIC_MISSILE + 10,
                                      spell_damage_bonus(Math.trunc(game.u.ulevel / 2) + 1), 0,
                                      (otyp === ONAMES.SPE_CONE_OF_COLD)
                                         ? EXPL_FROSTY
                                         : EXPL_FIERY);
                    }
                    game.u.dx = cc.x + rnd(3) - 2;
                    game.u.dy = cc.y + rnd(3) - 2;
                    if (!isok(game.u.dx, game.u.dy) || !cansee(game.u.dx, game.u.dy)
                        || IS_STWALL(game.level.at(game.u.dx, game.u.dy).typ)
                        || game.u.uswallow) {
                        /* Spell is reflected back to center */
                        game.u.dx = cc.x;
                        game.u.dy = cc.y;
                    }
                }
            }
            break;
        } /* else */
        /* FALLTHRU */

    /* these spells are all duplicates of wand effects */
    case ONAMES.SPE_FORCE_BOLT:
        physical_damage = true;
        /* FALLTHRU */
    case ONAMES.SPE_SLEEP:
    case ONAMES.SPE_MAGIC_MISSILE:
    case ONAMES.SPE_KNOCK:
    case ONAMES.SPE_SLOW_MONSTER:
    case ONAMES.SPE_WIZARD_LOCK:
    case ONAMES.SPE_DIG:
    case ONAMES.SPE_TURN_UNDEAD:
    case ONAMES.SPE_POLYMORPH:
    case ONAMES.SPE_TELEPORT_AWAY:
    case ONAMES.SPE_CANCELLATION:
    case ONAMES.SPE_FINGER_OF_DEATH:
    case ONAMES.SPE_LIGHT:
    case ONAMES.SPE_DETECT_UNSEEN:
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
                let damage = await zapyourself(pseudo, true);
                if (damage) {
                    const self = game.flags?.female ? 'herself' : 'himself';
                    /* Maybe_Half_Phys(damage) — halved with the intrinsic */
                    if (physical_damage && game.u.uprops?.HALF_PHDAM)
                        damage = Math.trunc((damage + 1) / 2);
                    const { losehp } = await import('./hack.js');
                    await losehp(damage, `zapped ${self} with a spell`,
                                 NO_KILLER_PREFIX);
                }
            } else {
                await weffects(pseudo);
            }
        } else {
            await weffects(pseudo);
        }
        update_inventory();     /* spell may modify inventory */
        break;

    /* these are all duplicates of scroll effects (seffects); not ported */
    case ONAMES.SPE_REMOVE_CURSE:
    case ONAMES.SPE_CONFUSE_MONSTER:
    case ONAMES.SPE_DETECT_FOOD:
    case ONAMES.SPE_CAUSE_FEAR:
    case ONAMES.SPE_IDENTIFY:
    case ONAMES.SPE_CHARM_MONSTER:
        if (role_skill >= SKILLS.P_SKILLED)
            pseudo.blessed = 1;
        /* FALLTHRU */
    case ONAMES.SPE_MAGIC_MAPPING:
    case ONAMES.SPE_CREATE_MONSTER:
        await seffects(pseudo);
        break;

    /* these are all duplicates of potion effects */
    case ONAMES.SPE_HASTE_SELF:
    case ONAMES.SPE_DETECT_TREASURE:
    case ONAMES.SPE_DETECT_MONSTERS:
    case ONAMES.SPE_LEVITATION:
    case ONAMES.SPE_RESTORE_ABILITY:
        if (role_skill >= SKILLS.P_SKILLED)
            pseudo.blessed = 1;
        /* FALLTHRU */
    case ONAMES.SPE_INVISIBILITY:
        await peffects(pseudo);
        break;

    case ONAMES.SPE_CURE_BLINDNESS:
        await healup(0, 0, false, true);
        break;
    case ONAMES.SPE_CURE_SICKNESS: {
        const was_sick = !!game.u.uprops?.SICK, was_slimed = !!game.u.uprops?.SLIMED;

        /* cure conditions (which updates status) before feedback */
        await healup(0, 0, true, false);
        /*
         *  Sick + !Slimed -- You are no longer ill.
         * !Sick + !Slimed -- You are not ill.
         * !Sick +  Slimed -- The slime disappears.
         *  Sick +  Slimed -- You are no longer ill.  The slime disappears.
         */
        if (was_sick || !was_slimed)
            await You(`are ${was_sick ? 'no longer' : 'not'} ill.`);
        if (was_slimed)
            await make_slimed(0, 'The slime disappears!');
        break;
    }
    case ONAMES.SPE_CREATE_FAMILIAR:
        await make_familiar(null, game.u.ux, game.u.uy, false);
        break;
    case ONAMES.SPE_CLAIRVOYANCE:
        if (!game.u.blocked?.CLAIRVOYANT) {
            if (role_skill >= SKILLS.P_SKILLED)
                pseudo.blessed = 1; /* detect monsters as well as map */
            await do_vicinity_map(pseudo);
        /* at present, only one thing blocks clairvoyance */
        } else if (game.u.uarmh && game.u.uarmh.otyp === ONAMES.CORNUTHAUM)
            await You(`sense a pointy hat on top of your ${body_part(HEAD)}.`);
        break;
    case ONAMES.SPE_PROTECTION:
        await cast_protection();
        break;
    case ONAMES.SPE_JUMPING:
        if (!((await jump(Math.max(role_skill, 1))) & ECMD_TIME))
            await pline('Nothing happens.'); /* pline1(nothing_happens) */
        break;
    case ONAMES.SPE_CHAIN_LIGHTNING:
        await cast_chain_lightning();
        break;
    default:
        /* impossible("Unknown spell %d attempted.") */
        note_unported_spell('spelleffects:unknown');
        obfree(pseudo);
        return ECMD_OK;
    }

    /* gain skill for successful cast */
    if (!force)
        use_skill(skill, spellev(spell));

    obfree(pseudo);             /* now, get rid of it */
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

// src/spell.c:1707 tport_spell(). Wizard-mode m-^T temporarily hides or
// supplies teleport away, then uses the returned operation to restore the
// exact prior spell-list slot.
export const NOOP_SPELL = 0, HIDE_SPELL = 1, ADD_SPELL = 2,
             UNHIDESPELL = 3, REMOVESPELL = 4;

let savedTeleportSpell = null;

export function tport_spell(what) {
    const book = (game.spl_book ||= []);
    let i;
    for (i = 0; i < MAXSPELL; i++) {
        const id = spellid(i);
        if (id === ONAMES.SPE_TELEPORT_AWAY || id === NO_SPELL)
            break;
    }
    if (i === MAXSPELL) {
        note_unported_spell('tport_spell:spellbook full');
    } else if (spellid(i) === NO_SPELL) {
        if (what === HIDE_SPELL || what === REMOVESPELL) {
            savedTeleportSpell = null;
        } else if (what === UNHIDESPELL) {
            if (savedTeleportSpell) {
                book[savedTeleportSpell.index] = savedTeleportSpell.slot;
                savedTeleportSpell = null;
            }
        } else if (what === ADD_SPELL) {
            savedTeleportSpell = {
                index: i,
                slot: book[i],
                hadSlot: Object.hasOwn(book, i),
                length: book.length,
            };
            book[i] = {
                sp_id: ONAMES.SPE_TELEPORT_AWAY,
                sp_lev: game.objects[ONAMES.SPE_TELEPORT_AWAY].oc_level,
                sp_know: KEEN,
            };
            return REMOVESPELL;
        }
    } else {
        if (what === ADD_SPELL || what === UNHIDESPELL) {
            savedTeleportSpell = null;
        } else if (what === REMOVESPELL) {
            if (savedTeleportSpell) {
                const saved = savedTeleportSpell;
                if (saved.hadSlot)
                    book[i] = saved.slot;
                else
                    delete book[i];
                book.length = saved.length;
                savedTeleportSpell = null;
            }
        } else if (what === HIDE_SPELL) {
            savedTeleportSpell = {
                index: i,
                slot: book[i],
                hadSlot: true,
                length: book.length,
            };
            book[i] = { ...book[i], sp_id: NO_SPELL };
            return UNHIDESPELL;
        }
    }
    return NOOP_SPELL;
}

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

// src/spell.c:1605 spell_aim_step()
function spell_aim_step(arg, x, y) {
    if (!isok(x, y))
        return false;
    const loc = game.level.at(x, y);
    if (!ZAP_POS(loc.typ)
        && !(IS_DOOR(loc.typ) && (loc.doormask & D_ISOPEN)))
        return false;
    return true;
}

// src/spell.c:1617 can_center_spell_location() — not quite the same as
// throwspell limits, but close enough
function can_center_spell_location(x, y) {
    if (distmin(game.u.ux, game.u.uy, x, y) > 10)
        return false;
    return (isok(x, y) && cansee(x, y) && !IS_STWALL(game.level.at(x, y).typ));
}

// src/spell.c:1626 display_spell_target_positions()
async function display_spell_target_positions(on_off) {
    const dist = 10;

    if (on_off) {
        /* on */
        const sym = showsym(cmap_names.S_goodpos) || defsyms[cmap_names.S_goodpos];
        await tmp_at(DISP_BEAM, { ch: sym.ch, color: defsyms[cmap_names.S_goodpos].color,
                                  decgfx: !!sym.dec,
                                  glyph: { kind: 'cmap', cmap: cmap_names.S_goodpos } });
        for (let dx = -dist; dx <= dist; dx++)
            for (let dy = -dist; dy <= dist; dy++) {
                const x = game.u.ux + dx;
                const y = game.u.uy + dy;
                /* hero's location is allowed but highlighting the hero's
                   spot makes map harder to read (if using '$' rather than
                   by changing background color) */
                if (u_at(x, y))
                    continue;
                if (can_center_spell_location(x, y))
                    await tmp_at(x, y);
            }
    } else {
        /* off */
        await tmp_at(DISP_END, 0);
    }
}

// src/spell.c:1655 throwspell() — choose location where spell takes effect
async function throwspell() {
    let mtmp;

    if (game.u.uinwater) {
        await pline("You're joking!  In this weather?");
        return 0;
    } else if (Is_waterlevel(game.u.uz)) {
        await You('had better wait for the sun to come out.');
        return 0;
    }

    await pline('Where do you want to cast the spell?');
    const cc = { x: game.u.ux, y: game.u.uy };
    await getpos_sethilite(display_spell_target_positions,
                           can_center_spell_location);
    if (await getpos(cc, true, 'the desired position') < 0)
        return 0; /* user pressed ESC */
    /* clear_nhwindow(WIN_MESSAGE) — discard any autodescribe feedback */
    tty_clear_nhwindow_message(game._topl_cury || 0);

    /* The number of moves from hero to where the spell drops.*/
    if (distmin(game.u.ux, game.u.uy, cc.x, cc.y) > 10) {
        await pline_The('spell dissipates over the distance!');
        return 0;
    } else if (game.u.uswallow) {
        await pline_The('spell is cut short!');
        exercise(A_WIS, false); /* What were you THINKING! */
        game.u.dx = 0;
        game.u.dy = 0;
        return 1;
    } else if (((cc.x !== game.u.ux || cc.y !== game.u.uy) && !cansee(cc.x, cc.y)
                && (!(mtmp = m_at(cc.x, cc.y)) || !canspotmon(mtmp)))
               || IS_STWALL(game.level.at(cc.x, cc.y).typ)) {
        await Your('mind fails to lock onto that location!');
        return 0;
    }

    const uc = { x: game.u.ux, y: game.u.uy };

    await walk_path(uc, cc, spell_aim_step, null);

    game.u.dx = cc.x;
    game.u.dy = cc.y;
    return 1;
}

// src/spell.c:1181 spell_backfire()
async function spell_backfire(spell) {
    const duration = (spellev(spell) + 1) * 3;
    const old_stun = (game.u.intrinsic?.HStun || 0) & TIMEOUT;
    const old_conf = (game.u.intrinsic?.HConfusion || 0) & TIMEOUT;

    switch (rn2(10)) {
    case 0:
    case 1:
    case 2:
    case 3:
        await make_confused(old_conf + duration, false);
        break;
    case 4:
    case 5:
    case 6:
        await make_confused(old_conf + Math.trunc(2 * duration / 3), false);
        await make_stunned(old_stun + Math.trunc(duration / 3), false);
        break;
    case 7:
    case 8:
        await make_stunned(old_stun + Math.trunc(2 * duration / 3), false);
        await make_confused(old_conf + Math.trunc(duration / 3), false);
        break;
    case 9:
        await make_stunned(old_stun + duration, false);
        break;
    }
}

// src/spell.c:1220 spelleffects_check()
export async function spelleffects_check(spell, energyRef) {
    let res = ECMD_OK;
    const confused = Confusion();

    energyRef.v = 0;

    if (spell === UNKNOWN_SPELL || await rejectcasting()) {
        return { rejected: true, res: ECMD_OK };
    }

    energyRef.v = SPELL_LEV_PW(spellev(spell));   /* 5 <= energy <= 35 */

    if (spellknow(spell) <= 0) {
        await Your('knowledge of this spell is twisted.');
        await pline('It invokes nightmarish images in your mind...');
        await spell_backfire(spell);
        game.u.uen -= rnd(energyRef.v);
        if (game.u.uen < 0) game.u.uen = 0;
        (game.disp ||= {}).botl = true;
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
    } else if (await check_capacity(
                   'Your concentration falters while carrying so much stuff.')) {
        return { rejected: true, res: ECMD_TIME };
    }

    if (game.u.uhave?.amulet && game.u.uen >= energyRef.v) {
        await You_feel('the amulet draining your energy away.');
        game.u.uen -= rnd(2 * energyRef.v);
        if (game.u.uen < 0) game.u.uen = 0;
        (game.disp ||= {}).botl = true;
        res = ECMD_TIME;                /* time is used even if the cast fails */
    }

    if (energyRef.v > game.u.uen) {
        await You("don't have enough energy to cast that spell"
                  + ((game.u.uen < game.u.uenmax) ? ''
                     : (energyRef.v > (game.u.uenpeak ?? 0)) ? ' yet'
                     : ' anymore') + '.');
        return { rejected: true, res };
    } else {
        if (spellid(spell) !== ONAMES.SPE_DETECT_FOOD) {
            let hungr = energyRef.v * 2;

            /* a Wizard's Intelligence reduces the hunger cost */
            let intell = acurr(A_INT);
            if (!Role_if(PMNAMES.PM_WIZARD))
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

            /* do not put the hero quite into fainting */
            if (hungr > game.u.uhunger - 3)
                hungr = game.u.uhunger - 3;
            await morehungry(hungr);
        }
    }

    const chance = percent_success(spell);
    if (confused || (rnd(100) > chance)) {
        await You('fail to cast the spell correctly.');
        game.u.uen -= Math.trunc(energyRef.v / 2);
        (game.disp ||= {}).botl = true;
        return { rejected: true, res: ECMD_TIME };
    }
    return { rejected: false, res };
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

// src/spell.c:1763 losespells() — amnesia: forget some of the known spells.
export function losespells() {
    let n, nzap, i;

    /* in case reading has been interrupted earlier, discard context */
    (game.context ||= {}).spbook ||= {};
    game.context.spbook.book = null;
    game.context.spbook.o_id = 0;
    /* count the number of known spells */
    for (n = 0; n < MAXSPELL; ++n)
        if (spellid(n) === NO_SPELL)
            break;

    /* lose anywhere from zero to all known spells;
       if confused, use the worse of two die rolls */
    nzap = rn2(n + 1);
    if (Confusion()) {
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
     *
     * Perhaps we should forget the corresponding book too?
     *
     * (3.4.3 removed spells entirely from the list, but that was
     * unfair to the player.)
     */
    for (i = 0; nzap > 0; ++i) {
        /* when nzap is small relative to the number of spells left,
           the chance to lose spell [i] is small; as the number of
           remaining candidates shrinks, the chance per candidate
           gets bigger; overall, exactly nzap entries are affected */
        if (rn2(n - i) < nzap) {
            game.spl_book[i].sp_know = 0;   /* spellknow(i) = 0 */
            exercise(A_WIS, false);
            --nzap;
        }
    }
}
