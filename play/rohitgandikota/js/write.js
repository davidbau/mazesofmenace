// write.js — src/write.c: writing scrolls and spellbooks with a magic marker.

import { game } from './gstate.js';
import { Hallucination } from './youprop.js';
import { Blind } from './youprop.js';
import { Glib } from './youprop.js';
import { OCLASSES } from './objects_data.js';
import { ONAMES } from './objects_data.js';
import { GETOBJ_EXCLUDE } from './const.js';
import { GETOBJ_SUGGEST } from './const.js';
import { GETOBJ_DOWNPLAY } from './const.js';
import { GETOBJ_NOFLAGS } from './const.js';
import { ECMD_OK } from './const.js';
import { ECMD_TIME } from './const.js';
import { ECMD_CANCEL } from './const.js';
import { A_WIS } from './const.js';
import { MAXULEV } from './const.js';
import { rn2 } from './rng.js';
import { rn1 } from './rng.js';
import { rnl } from './rng.js';
import { You } from './pline.js';
import { You_cant } from './pline.js';
import { Your } from './pline.js';
import { pline } from './display.js';
import { pline_The } from './pline.js';
import { There } from './pline.js';
import { getobj } from './invent.js';
import { useup } from './invent.js';
import { hold_another_object } from './invent.js';
import { obfree } from './invent.js';
import { update_inventory } from './invent.js';
import { OBJ_NAME } from './objnam.js';
import { OBJ_DESCR } from './objnam.js';
import { aobjnam } from './objnam.js';
import { The } from './objnam.js';
import { ysimple_name } from './objnam.js';
import { Tobjnam } from './objnam.js';
import { observe_object } from './o_init.js';
import { makeknown } from './o_init.js';
import { exercise } from './attrib.js';
import { Role_if } from './attrib.js';
import { mksobj } from './mkobj.js';
import { bcsign } from './mkobj.js';
import { getlin } from './cmd.js';
import { mungspaces } from './hacklib.js';
import { upstart } from './do_name.js';
import { known_spell } from './spell.js';
import { spe_Fresh } from './spell.js';
import { spe_GoingStale } from './spell.js';
import { spe_Unknown } from './spell.js';
import { check_unpaid } from './shk.js';
import { wipeout_text } from './engrave.js';
import { nohands } from './mondata.js';
import { dropx } from './do.js';
import { fingers_or_gloves } from './do_wear.js';
import { PMNAMES } from './monst_data.js';
import { livelog_printf } from './pline.js';
import { LL_CONDUCT } from './const.js';
import { an } from './objnam.js';

























































// src/write.c:14 cost(); ink needed to write otmp
function cost(otmp) {
    if (otmp.oclass === OCLASSES.SPBOOK_CLASS)
        return (10 * game.objects[otmp.otyp].oc_level);

    switch (otmp.otyp) {
    case ONAMES.SCR_LIGHT:
    case ONAMES.SCR_GOLD_DETECTION:
    case ONAMES.SCR_FOOD_DETECTION:
    case ONAMES.SCR_MAGIC_MAPPING:
    case ONAMES.SCR_AMNESIA:
    case ONAMES.SCR_FIRE:
    case ONAMES.SCR_EARTH:
        return 8;
    case ONAMES.SCR_DESTROY_ARMOR:
    case ONAMES.SCR_CREATE_MONSTER:
    case ONAMES.SCR_PUNISHMENT:
        return 10;
    case ONAMES.SCR_CONFUSE_MONSTER:
        return 12;
    case ONAMES.SCR_IDENTIFY:
        return 14;
    case ONAMES.SCR_ENCHANT_ARMOR:
    case ONAMES.SCR_REMOVE_CURSE:
    case ONAMES.SCR_ENCHANT_WEAPON:
    case ONAMES.SCR_CHARGING:
        return 16;
    case ONAMES.SCR_SCARE_MONSTER:
    case ONAMES.SCR_STINKING_CLOUD:
    case ONAMES.SCR_TAMING:
    case ONAMES.SCR_TELEPORTATION:
        return 20;
    case ONAMES.SCR_GENOCIDE:
        return 30;
    case ONAMES.SCR_BLANK_PAPER:
    default:
        /* impossible("You can't write such a weird scroll!") */
        break;
    }
    return 1000;
}

// src/write.c:61 write_ok(); getobj callback for object to write on
export function write_ok(obj) {
    if (!obj || (obj.oclass !== OCLASSES.SCROLL_CLASS && obj.oclass !== OCLASSES.SPBOOK_CLASS))
        return GETOBJ_EXCLUDE;

    if (obj.otyp === ONAMES.SCR_BLANK_PAPER || obj.otyp === ONAMES.SPE_BLANK_PAPER)
        return GETOBJ_SUGGEST;

    return GETOBJ_DOWNPLAY;
}

// src/write.c:74 dowrite(); write -- applying a magic marker
export async function dowrite(pen) {
    let paper;
    let namebuf = '', nm, bp;
    let new_obj;
    let basecost, actualcost;
    let curseval;
    let qbuf;
    let first, last, i, deferred, deferralchance, real;
    let by_descr = false;
    let typeword;
    let spell_knowledge;
    let found = false;

    if (nohands(game.youmonst.data)) {
        await You('need hands to be able to write!');
        return ECMD_OK;
    } else if (Glib()) {
        await pline(`${Tobjnam(pen, 'slip')} from your ${fingers_or_gloves(false)}.`);
        await dropx(pen);
        return ECMD_TIME;
    }

    /* get paper to write on */
    paper = await getobj('write on', write_ok, GETOBJ_NOFLAGS);
    if (!paper)
        return ECMD_CANCEL;
    /* can't write on a novel (unless/until it's been converted into a blank
       spellbook), but we want messages saying so to avoid "spellbook" */
    typeword = (paper.otyp === ONAMES.SPE_NOVEL) ? 'book'
               : (paper.oclass === OCLASSES.SPBOOK_CLASS) ? 'spellbook'
                 : 'scroll';
    if (Blind()) {
        if (!paper.dknown) {
            await You(`don't know whether that ${typeword} is blank or not.`);
            return ECMD_OK;
        } else if (paper.oclass === OCLASSES.SPBOOK_CLASS) {
            /* can't write a magic book while blind */
            await pline(`${upstart(ysimple_name(pen))} can't create braille text.`);
            return ECMD_OK;
        }
    }
    observe_object(paper);
    if (paper.otyp !== ONAMES.SCR_BLANK_PAPER && paper.otyp !== ONAMES.SPE_BLANK_PAPER) {
        await pline(`That ${typeword} is not blank!`);
        exercise(A_WIS, false);
        return ECMD_TIME;
    }
    makeknown(ONAMES.SCR_BLANK_PAPER);

    /* what to write */
    qbuf = `What type of ${typeword} do you want to write?`;
    namebuf = await getlin(qbuf);
    namebuf = mungspaces(namebuf); /* remove any excess whitespace */
    if (namebuf[0] === '\x1b' || !namebuf)
        return ECMD_TIME;
    nm = namebuf;
    if (nm.slice(0, 7).toLowerCase() === 'scroll ')
        nm = nm.slice(7);
    else if (nm.slice(0, 10).toLowerCase() === 'spellbook ')
        nm = nm.slice(10);
    if (nm.slice(0, 3).toLowerCase() === 'of ')
        nm = nm.slice(3);

    if ((bp = nm.toLowerCase().indexOf(' armour')) >= 0) {
        nm = nm.slice(0, bp) + ' armor ' + nm.slice(bp + 7);
        nm = nm.slice(0, bp + 1) + mungspaces(nm.slice(bp + 1)); /* remove the extra space */
    }

    deferred = real = 0; /* not any scroll or book */
    deferralchance = 0;  /* incremented for each oc_uname match */
    first = game.bases[paper.oclass];
    last = game.bases[paper.oclass + 1] - 1;
    /* first loop: look for match with name/description */
    for (i = first; i <= last; i++) {
        /* extra shufflable descr not representing a real object */
        if (!OBJ_NAME(game.objects[i]))
            continue;

        if (OBJ_NAME(game.objects[i]).toLowerCase() === nm.toLowerCase()) {
            if (game.objects[i].oc_name_known
                /* spellbooks can only be written by_name, so no need to
                   hold out for a 'better' by_descr match */
                || paper.oclass === OCLASSES.SPBOOK_CLASS) {
                found = true;
                break;
            } else {
                /* save item in case there are no better by_descr matches */
                real = deferred = i;
                break;
            }
        }

        if ((OBJ_DESCR(game.objects[i]) || '').toLowerCase() === nm.toLowerCase()) {
            by_descr = true;
            found = true;
            break;
        }
    }
    if (!found) {
        /* second loop: look for match with user-assigned name */
        /* we will get here if 'nm' isn't a real scroll name/descr, or is the
         * name of a real scroll that hasn't been formally IDed. */
        for (i = first; i <= last; i++) {
            /* player might assign same name multiple times and if so,
               we choose one of those matches randomly */
            if (game.objects[i].oc_uname && game.objects[i].oc_uname.toLowerCase() === nm.toLowerCase()
                /* prefer attempting to write the real scroll type if
                   the typename clobbers a real scroll and is known to
                   be incorrect */
                && !(real && game.objects[i].oc_name_known)
                /*
                 * First match: chance incremented to 1,
                 *   !rn2(1) is 1, we remember i;
                 * second match: chance incremented to 2,
                 *   !rn2(2) has 1/2 chance to replace i;
                 * third match: chance incremented to 3,
                 *   !rn2(3) has 1/3 chance to replace i
                 *   and 2/3 chance to keep previous 50:50
                 *   choice; so on for higher match counts.
                 */
                && !rn2(++deferralchance)) {
                deferred = i;
                /* writing by user-assigned name is same as by description:
                   fails for books, works for scrolls (having an assigned
                   type name guarantees presence on discoveries list) */
                by_descr = true;
            }
        }

        if (deferred) {
            i = deferred;
            found = true;
        }
    }

    if (!found) {
        await There(`is no such ${typeword}!`);
        return ECMD_TIME;
    }
 /* found: */

    if (i === ONAMES.SCR_BLANK_PAPER || i === ONAMES.SPE_BLANK_PAPER) {
        await You_cant('write that!');
        await pline("It's obscene!");
        return ECMD_TIME;
    } else if (i === ONAMES.SPE_NOVEL) {
        const fanfic = !rn2(3), tearup = !rn2(3);

        if (!fanfic) {
            await You(`${!tearup ? 'prepare' : 'try'} to write the Great Yendorian Novel, but ${
                !Hallucination() ? 'lack' : 'have too much'} inspiration.`);
        } else {
            await You(`${!tearup ? 'start to ' : ''}produce really ${
                !Hallucination() ? 'lame' : 'awesome'} fan-fiction.`);
        }
        if (!tearup) {
            await You('give up on the idea.');
        } else {
            await You('tear it up.');
            useup(paper);
        }
        return ECMD_TIME;
    } else if (i === ONAMES.SPE_BOOK_OF_THE_DEAD) {
        await pline('No mere dungeon adventurer could write that.');
        return ECMD_TIME;
    } else if (by_descr && paper.oclass === OCLASSES.SPBOOK_CLASS
               && !game.objects[i].oc_name_known) {
        /* can't write unknown spellbooks by description */
        await pline("Unfortunately you don't have enough information to go on.");
        return ECMD_TIME;
    }

    /* KMH, conduct */
    game.u.uconduct ||= {};
    /* if (!u.uconduct.literate++): an unset counter is 0 here, not NaN */
    game.u.uconduct.literate = (game.u.uconduct.literate | 0) + 1;
    if (game.u.uconduct.literate === 1)
        livelog_printf(LL_CONDUCT, `became literate by writing ${an(typeword)}`);

    new_obj = mksobj(i, false, false);
    new_obj.bknown = !!(paper.bknown && pen.bknown);

    /* shk imposes a flat rate per use, not based on actual charges used */
    await check_unpaid(pen);

    /* see if there's enough ink */
    basecost = cost(new_obj);
    if (pen.spe < Math.trunc(basecost / 2)) {
        await Your('marker is too dry to write that!');
        obfree(new_obj, null);
        return ECMD_TIME;
    }

    /* we're really going to write now, so calculate cost
     */
    actualcost = rn1(Math.trunc(basecost / 2), Math.trunc(basecost / 2));
    curseval = bcsign(pen) + bcsign(paper);
    exercise(A_WIS, true);
    /* dry out marker */
    if (pen.spe < actualcost) {
        pen.spe = 0;
        await Your('marker dries out!');
        /* scrolls disappear, spellbooks don't */
        if (paper.oclass === OCLASSES.SPBOOK_CLASS) {
            await pline_The('spellbook is left unfinished and your writing fades.');
            update_inventory(); /* pen charges */
        } else {
            await pline_The('scroll is now useless and disappears!');
            useup(paper);
        }
        obfree(new_obj, null);
        return ECMD_TIME;
    }
    pen.spe -= actualcost;

    /*
     * Writing by name requires that the hero knows the scroll or
     * book type.  One has previously been read (and its effect
     * was evident) or been ID'd via scroll/spell/throne (or skill
     * for Wizards) and it will be on the discoveries list.
     * Unknown spellbooks can also be written by name if the hero
     * has fresh knowledge of the spell, or if the spell is almost
     * forgotten and the hero is Lucky (with a greater chance than
     * if the spell is unknown or forgotten).
     * (Previous versions allowed scrolls and books to be written
     * by type name if they were on the discoveries list via being
     * given a user-assigned name, even though doing the latter
     * doesn't--and shouldn't--make the actual type become known.)
     *
     * Writing by description requires that the hero knows the
     * description (a scroll's label, that is, since books by_descr
     * are rejected above).  This is done by checking to see if a
     * scroll with the same description has been encountered.
     *
     * Normal requirements can be overridden if hero is Lucky.
     */

    if (paper.oclass === OCLASSES.SPBOOK_CLASS) {
        spell_knowledge = known_spell(new_obj.otyp);
    } else {
        spell_knowledge = spe_Unknown;
    }
    /* if known, then either by-name or by-descr works */
    if (!game.objects[new_obj.otyp].oc_name_known
        /* else if named, then only by-descr works */
        && !(by_descr && game.objects[new_obj.otyp].oc_encountered)
        /* else fresh knowledge of the spell works */
        && spell_knowledge !== spe_Fresh
        /* and Luck might override after previous checks have failed */
        && rnl(((Role_if(PMNAMES.PM_WIZARD) && paper.oclass !== OCLASSES.SPBOOK_CLASS)
                || spell_knowledge === spe_GoingStale)
               ? 5 : 15)) {
        await You(`${by_descr ? 'fail' : "don't know how"} to write that.`);
        /* scrolls disappear, spellbooks don't */
        if (paper.oclass === OCLASSES.SPBOOK_CLASS) {
            await You(
      'write in your best handwriting:  "My Diary", but it quickly fades.');
            update_inventory(); /* pen charges */
        } else {
            if (by_descr) {
                namebuf = OBJ_DESCR(game.objects[new_obj.otyp]);
                namebuf = wipeout_text(namebuf, Math.trunc((6 + MAXULEV - game.u.ulevel) / 6), 0);
            } else
                namebuf = `${game.plname} was here!`;
            await You(`write "${namebuf}" and the scroll disappears.`);
            useup(paper);
        }
        obfree(new_obj, null);
        return ECMD_TIME;
    }
    /* can write scrolls when blind, but requires luck too;
       attempts to write books when blind are caught above */
    if (Blind() && rnl(3)) {
        /* writing while blind usually fails regardless of
           whether the target scroll is known; even if we
           have passed the write-an-unknown scroll test
           above we can still fail this one, so it's doubly
           hard to write an unknown scroll while blind */
        await You('fail to write the scroll correctly and it disappears.');
        useup(paper);
        obfree(new_obj, null);
        return ECMD_TIME;
    }

    /* use up old scroll / spellbook */
    useup(paper);

    /* success */
    if (new_obj.oclass === OCLASSES.SPBOOK_CLASS) {
        /* acknowledge the change in the object's description... */
        await pline_The(`spellbook warps strangely, then turns ${
                  new_book_description(new_obj.otyp)}.`);
    }
    new_obj.blessed = (curseval > 0);
    new_obj.cursed = (curseval < 0);
    /* MAIL_STRUCTURES */
    if (new_obj.otyp === ONAMES.SCR_MAIL)
        /* 0: delivered in-game via external event (or randomly for fake mail);
           1: from bones or wishing; 2: written with marker */
        new_obj.spe = 2;
    /* unlike alchemy, for example, a successful result yields the
       specifically chosen item so hero recognizes it even if blind;
       the exception is for being lucky writing an undiscovered scroll,
       where the label associated with the type-name isn't known yet;
       but if writing by description, the description is always known */
    new_obj.dknown = false;
    if (game.objects[new_obj.otyp].oc_name_known || by_descr)
        observe_object(new_obj);

    new_obj = await hold_another_object(new_obj, 'Oops!  %s out of your grasp!',
                                        The(aobjnam(new_obj, 'slip')), null);
    return ECMD_TIME;
}

// src/write.c:395 new_book_description(); most book descriptions refer to
// cover appearance, so we can issue a message for converting a plain book
// into one of those with something like "the spellbook turns red" or "the
// spellbook turns ragged"; but some descriptions refer to composition and
// "the book turns vellum" looks funny, so we want to insert "into " prior to
// such descriptions
function new_book_description(booktype) {
    /* subset of description strings from objects.c; if it grows
       much, we may need to add a new flag field to objects[] instead */
    const compositions = [
        'parchment',
        'vellum',
        'cloth',
    ];
    let descr, comp;

    descr = OBJ_DESCR(game.objects[booktype]);
    comp = compositions.find((c) => c.toLowerCase() === (descr || '').toLowerCase());

    return `${comp ? 'into ' : ''}${descr}`;
}
