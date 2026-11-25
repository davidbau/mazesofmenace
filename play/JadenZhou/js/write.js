// write.js — writing scrolls and spellbooks with a magic marker.
// C ref: write.c — cost(), write_ok(), dowrite(), new_book_description().

import { impossible } from './hack.js';
import { game } from './gstate.js';
import { rn2, rn1, rnl } from './rng.js';
import * as O from './objects.js';
import { objects, OBJ_NAME, OBJ_DESCR } from './objects.js';
import {
    pline, You, Your, You_cant, There, pline_The, livelog_printf
} from './display.js';
import { GETOBJ_EXCLUDE, GETOBJ_SUGGEST, GETOBJ_DOWNPLAY, GETOBJ_NOFLAGS,
         ECMD_OK, ECMD_TIME, ECMD_CANCEL, GLIB, A_WIS, MAXULEV,
         LL_CONDUCT } from './const.js';
import { M1_NOHANDS, PM_WIZARD } from './monsters.js';
import { getobj, useup, obfree } from './invent.js';
import { tty_getlin } from './wintty.js';
import { mungspaces, strstri } from './hacklib.js';
import { an, The, Tobjnam, aobjnam } from './objnam.js';
import { ysimple_name } from './iactions.js';
import { fingers_or_gloves } from './do_wear.js';
import { dropx } from './do.js';
import { exercise } from './attrib.js';
import { mksobj, bcsign } from './mkobj.js';
import { check_unpaid } from './zap.js';
import { known_spell, spe_Unknown, spe_Fresh, spe_GoingStale } from './spell.js';
import { wipeout_text } from './engrave.js';
import { hold_another_object } from './wizcmds.js';
import { observe_object, discover_object } from './o_init.js';
import { Glib, Blind, Hallucination } from './youprop.js';

/* C ref: mondata.h nohands() */
function nohands(ptr) { return (ptr.mflags1 & M1_NOHANDS) !== 0; }
/* C ref: hack.h makeknown() */
function makeknown(otyp) { discover_object(otyp, true, true, true); }
/* C ref: hacklib.c upstart() */
function upstart(s) { return s ? s[0].toUpperCase() + s.slice(1) : s; }
/* C ref: hacklib.c strcmpi() == 0 */
function strcmpi_eq(s1, s2) {
    return s1 != null && s2 != null && s1.toLowerCase() === s2.toLowerCase();
}
/* C ref: hacklib.c strncmpi() == 0 */
function strncmpi_eq(s1, s2, n) {
    return s1.slice(0, n).toLowerCase() === s2.slice(0, n).toLowerCase();
}

// C ref: write.c cost()
/*
 * returns base cost of a scroll or a spellbook
 */
function cost(otmp) {
    if (otmp.oclass === O.SPBOOK_CLASS)
        return (10 * objects[otmp.otyp].oc_level);

    switch (otmp.otyp) {
    /* (MAIL_STRUCTURES) */
    case O.SCR_MAIL:
        return 2;
    case O.SCR_LIGHT:
    case O.SCR_GOLD_DETECTION:
    case O.SCR_FOOD_DETECTION:
    case O.SCR_MAGIC_MAPPING:
    case O.SCR_AMNESIA:
    case O.SCR_FIRE:
    case O.SCR_EARTH:
        return 8;
    case O.SCR_DESTROY_ARMOR:
    case O.SCR_CREATE_MONSTER:
    case O.SCR_PUNISHMENT:
        return 10;
    case O.SCR_CONFUSE_MONSTER:
        return 12;
    case O.SCR_IDENTIFY:
        return 14;
    case O.SCR_ENCHANT_ARMOR:
    case O.SCR_REMOVE_CURSE:
    case O.SCR_ENCHANT_WEAPON:
    case O.SCR_CHARGING:
        return 16;
    case O.SCR_SCARE_MONSTER:
    case O.SCR_STINKING_CLOUD:
    case O.SCR_TAMING:
    case O.SCR_TELEPORTATION:
        return 20;
    case O.SCR_GENOCIDE:
        return 30;
    case O.SCR_BLANK_PAPER:
    default:
        impossible("You can't write such a weird scroll!");
    }
    return 1000;
}

// C ref: write.c write_ok()
/* getobj callback for object to write on */
function write_ok(obj) {
    if (!obj || (obj.oclass !== O.SCROLL_CLASS && obj.oclass !== O.SPBOOK_CLASS))
        return GETOBJ_EXCLUDE;

    if (obj.otyp === O.SCR_BLANK_PAPER || obj.otyp === O.SPE_BLANK_PAPER)
        return GETOBJ_SUGGEST;

    return GETOBJ_DOWNPLAY;
}

// C ref: write.c dowrite()
/* write -- applying a magic marker */
export async function dowrite(pen) {
    const u = game.u;
    let paper;
    let namebuf, nm, bp;
    let new_obj;
    let basecost, actualcost;
    let curseval;
    let qbuf;
    let first, last, i, deferred, deferralchance, real;
    let by_descr = false;
    let typeword;
    let spell_knowledge;

    if (nohands(game.youmonst.data)) {
        await You("need hands to be able to write!");
        return ECMD_OK;
    } else if (Glib()) {
        await pline(`${Tobjnam(pen, "slip")} from your ${
            fingers_or_gloves(false)}.`);
        await dropx(pen);
        return ECMD_TIME;
    }

    /* get paper to write on */
    paper = await getobj("write on", write_ok, GETOBJ_NOFLAGS);
    if (!paper)
        return ECMD_CANCEL;
    /* can't write on a novel (unless/until it's been converted into a blank
       spellbook), but we want messages saying so to avoid "spellbook" */
    typeword = (paper.otyp === O.SPE_NOVEL) ? "book"
               : (paper.oclass === O.SPBOOK_CLASS) ? "spellbook"
                 : "scroll";
    if (Blind()) {
        if (!paper.dknown) {
            await You(`don't know whether that ${typeword} is blank or not.`);
            return ECMD_OK;
        } else if (paper.oclass === O.SPBOOK_CLASS) {
            /* can't write a magic book while blind */
            await pline(`${upstart(ysimple_name(pen))} can't create braille text.`);
            return ECMD_OK;
        }
    }
    observe_object(paper, Hallucination());
    if (paper.otyp !== O.SCR_BLANK_PAPER && paper.otyp !== O.SPE_BLANK_PAPER) {
        await pline(`That ${typeword} is not blank!`);
        exercise(A_WIS, false);
        return ECMD_TIME;
    }
    makeknown(O.SCR_BLANK_PAPER);

    /* what to write */
    qbuf = `What type of ${typeword} do you want to write?`;
    namebuf = (await tty_getlin(qbuf)) || '';
    namebuf = mungspaces(namebuf); /* remove any excess whitespace */
    if (namebuf[0] === '\x1b' || !namebuf[0])
        return ECMD_TIME;
    nm = namebuf;
    if (strncmpi_eq(nm, "scroll ", 7))
        nm = nm.slice(7);
    else if (strncmpi_eq(nm, "spellbook ", 10))
        nm = nm.slice(10);
    if (strncmpi_eq(nm, "of ", 3))
        nm = nm.slice(3);

    if ((bp = strstri(nm, " armour")) >= 0) {
        nm = nm.slice(0, bp) + " armor " + nm.slice(bp + 7);
        nm = nm.slice(0, bp + 1) + mungspaces(nm.slice(bp + 1)); /* remove the extra space */
    }

    deferred = real = 0; /* not any scroll or book */
    deferralchance = 0;  /* incremented for each oc_uname match */
    first = game.bases[paper.oclass];
    last = game.bases[paper.oclass + 1] - 1;
    found: {
        /* first loop: look for match with name/description */
        for (i = first; i <= last; i++) {
            /* extra shufflable descr not representing a real object */
            if (!OBJ_NAME(objects[i]))
                continue;

            if (strcmpi_eq(OBJ_NAME(objects[i]), nm)) {
                if (objects[i].oc_name_known
                    /* spellbooks can only be written by_name, so no need to
                       hold out for a 'better' by_descr match */
                    || paper.oclass === O.SPBOOK_CLASS) {
                    break found;
                } else {
                    /* save item in case there are no better by_descr matches */
                    real = deferred = i;
                    break;
                }
            }

            if (strcmpi_eq(OBJ_DESCR(objects[i]), nm)) {
                by_descr = true;
                break found;
            }
        }
        /* second loop: look for match with user-assigned name */
        /* we will get here if 'nm' isn't a real scroll name/descr, or is the
         * name of a real scroll that hasn't been formally IDed. */
        for (i = first; i <= last; i++) {
            /* player might assign same name multiple times and if so,
               we choose one of those matches randomly */
            if (objects[i].oc_uname && strcmpi_eq(objects[i].oc_uname, nm)
                /* prefer attempting to write the real scroll type if
                   the typename clobbers a real scroll and is known to
                   be incorrect */
                && !(real && objects[i].oc_name_known)
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
            break found;
        }

        await There(`is no such ${typeword}!`);
        return ECMD_TIME;
    }
    /* found: */

    if (i === O.SCR_BLANK_PAPER || i === O.SPE_BLANK_PAPER) {
        await You_cant("write that!");
        await pline("It's obscene!");
        return ECMD_TIME;
    } else if (i === O.SPE_NOVEL) {
        const fanfic = !rn2(3), tearup = !rn2(3);

        if (!fanfic) {
            await You(`${!tearup ? "prepare" : "try"} to write the Great Yendorian Novel, but ${
                !Hallucination() ? "lack" : "have too much"} inspiration.`);
        } else {
            await You(`${!tearup ? "start to " : ""}produce really ${
                !Hallucination() ? "lame" : "awesome"} fan-fiction.`);
        }
        if (!tearup) {
            await You("give up on the idea.");
        } else {
            await You("tear it up.");
            useup(paper);
        }
        return ECMD_TIME;
    } else if (i === O.SPE_BOOK_OF_THE_DEAD) {
        await pline("No mere dungeon adventurer could write that.");
        return ECMD_TIME;
    } else if (by_descr && paper.oclass === O.SPBOOK_CLASS
               && !objects[i].oc_name_known) {
        /* can't write unknown spellbooks by description */
        await pline("Unfortunately you don't have enough information to go on.");
        return ECMD_TIME;
    }

    /* KMH, conduct */
    if (!u.uconduct.literate++)
        livelog_printf(LL_CONDUCT, `became literate by writing ${an(typeword)}`);

    new_obj = mksobj(i, false, false);
    new_obj.bknown = (paper.bknown && pen.bknown);

    /* shk imposes a flat rate per use, not based on actual charges used */
    check_unpaid(pen);

    /* see if there's enough ink */
    basecost = cost(new_obj);
    if (pen.spe < Math.trunc(basecost / 2)) {
        await Your("marker is too dry to write that!");
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
        await Your("marker dries out!");
        /* scrolls disappear, spellbooks don't */
        if (paper.oclass === O.SPBOOK_CLASS) {
            await pline_The("spellbook is left unfinished and your writing fades.");
            /* update_inventory(): no perm_invent */
        } else {
            await pline_The("scroll is now useless and disappears!");
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
     *
     * Writing by description requires that the hero knows the
     * description (a scroll's label, that is, since books by_descr
     * are rejected above).  This is done by checking to see if a
     * scroll with the same description has been encountered.
     *
     * Normal requirements can be overridden if hero is Lucky.
     */

    if (paper.oclass === O.SPBOOK_CLASS) {
        spell_knowledge = known_spell(new_obj.otyp);
    } else {
        spell_knowledge = spe_Unknown;
    }
    /* if known, then either by-name or by-descr works */
    if (!objects[new_obj.otyp].oc_name_known
        /* else if named, then only by-descr works */
        && !(by_descr && objects[new_obj.otyp].oc_encountered)
        /* else fresh knowledge of the spell works */
        && spell_knowledge !== spe_Fresh
        /* and Luck might override after previous checks have failed */
        && rnl(((game.urole.mnum === PM_WIZARD /* Role_if(PM_WIZARD) */
                 && paper.oclass !== O.SPBOOK_CLASS)
                || spell_knowledge === spe_GoingStale)
               ? 5 : 15)) {
        await You(`${by_descr ? "fail" : "don't know how"} to write that.`);
        /* scrolls disappear, spellbooks don't */
        if (paper.oclass === O.SPBOOK_CLASS) {
            await You(
      "write in your best handwriting:  \"My Diary\", but it quickly fades.");
            /* update_inventory(): no perm_invent */
        } else {
            if (by_descr) {
                namebuf = OBJ_DESCR(objects[new_obj.otyp]);
                namebuf = wipeout_text(namebuf,
                                       Math.trunc((6 + MAXULEV - u.ulevel) / 6), 0);
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
        await You("fail to write the scroll correctly and it disappears.");
        useup(paper);
        obfree(new_obj, null);
        return ECMD_TIME;
    }

    /* use up old scroll / spellbook */
    useup(paper);

    /* success */
    if (new_obj.oclass === O.SPBOOK_CLASS) {
        /* acknowledge the change in the object's description... */
        await pline_The(`spellbook warps strangely, then turns ${
            new_book_description(new_obj.otyp)}.`);
    }
    new_obj.blessed = (curseval > 0) ? 1 : 0;
    new_obj.cursed = (curseval < 0) ? 1 : 0;
    /* (MAIL_STRUCTURES) */
    if (new_obj.otyp === O.SCR_MAIL)
        /* 0: delivered in-game via external event (or randomly for fake mail);
           1: from bones or wishing; 2: written with marker */
        new_obj.spe = 2;
    /* unlike alchemy, for example, a successful result yields the
       specifically chosen item so hero recognizes it even if blind;
       the exception is for being lucky writing an undiscovered scroll,
       where the label associated with the type-name isn't known yet;
       but if writing by description, the description is always known */
    new_obj.dknown = 0;
    if (objects[new_obj.otyp].oc_name_known || by_descr)
        observe_object(new_obj, Hallucination());

    new_obj = await hold_another_object(new_obj, "Oops!  %s out of your grasp!",
                                        The(aobjnam(new_obj, "slip")), null);
    return ECMD_TIME;
}

// C ref: write.c new_book_description()
/* most book descriptions refer to cover appearance, so we can issue a
   message for converting a plain book into one of those with something
   like "the spellbook turns red" or "the spellbook turns ragged";
   but some descriptions refer to composition and "the book turns vellum"
   looks funny, so we want to insert "into " prior to such descriptions;
   even that's rather iffy, indicating that such descriptions probably
   ought to be eliminated (especially "cloth"!) */
function new_book_description(booktype) {
    /* subset of description strings from objects.c; if it grows
       much, we may need to add a new flag field to objects[] instead */
    const compositions = [
        "parchment",
        "vellum",
        "cloth",
        /* "canvas", "hardcover", -- not used */
        /* "papyrus", -- not applicable--can't be produced via writing */
    ];

    const descr = OBJ_DESCR(objects[booktype]);
    const comp = compositions.some(c => strcmpi_eq(descr, c));

    return `${comp ? "into " : ""}${descr}`;
}
