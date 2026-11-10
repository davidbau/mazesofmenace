/* NetHack 5.0	write.c	$NHDT-Date: 1702023275 2023/12/08 08:14:35 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.41 $ */
/* NetHack may be freely redistributed.  See license for details. */

import { C } from './c-runtime.js';

/* C pointers remain numeric byte addresses, with live structure views.
 * The forward goto becomes a labelled block; comp_p is an index into the
 * unchanged composition strings. The zero-filled DUMMY buffer, C integer
 * division and signed long conduct counter retain their original widths.
 * The native getobj trampoline calls this TU's original write_ok function. */


/*
 * returns base cost of a scroll or a spellbook
 */
export function cost(otmp)
{
    if (otmp.oclass == C.SPBOOK_CLASS)
        return (10 * C.objects[otmp.otyp].oc_level);

    switch (otmp.otyp) {
// #ifdef MAIL_STRUCTURES
    case C.SCR_MAIL:
        return 2;
// #endif
    case C.SCR_LIGHT:
    case C.SCR_GOLD_DETECTION:
    case C.SCR_FOOD_DETECTION:
    case C.SCR_MAGIC_MAPPING:
    case C.SCR_AMNESIA:
    case C.SCR_FIRE:
    case C.SCR_EARTH:
        return 8;
    case C.SCR_DESTROY_ARMOR:
    case C.SCR_CREATE_MONSTER:
    case C.SCR_PUNISHMENT:
        return 10;
    case C.SCR_CONFUSE_MONSTER:
        return 12;
    case C.SCR_IDENTIFY:
        return 14;
    case C.SCR_ENCHANT_ARMOR:
    case C.SCR_REMOVE_CURSE:
    case C.SCR_ENCHANT_WEAPON:
    case C.SCR_CHARGING:
        return 16;
    case C.SCR_SCARE_MONSTER:
    case C.SCR_STINKING_CLOUD:
    case C.SCR_TAMING:
    case C.SCR_TELEPORTATION:
        return 20;
    case C.SCR_GENOCIDE:
        return 30;
    case C.SCR_BLANK_PAPER:
    default:
        C.impossible("You can't write such a weird scroll!");
    }
    return 1000;
}

/* getobj callback for object to write on */
export function write_ok(obj)
{
    if (!obj || (obj.oclass != C.SCROLL_CLASS && obj.oclass != C.SPBOOK_CLASS))
        return C.GETOBJ_EXCLUDE;

    if (obj.otyp == C.SCR_BLANK_PAPER || obj.otyp == C.SPE_BLANK_PAPER)
        return C.GETOBJ_SUGGEST;

    return C.GETOBJ_DOWNPLAY;
}

/* write -- applying a magic marker */
export function dowrite(pen)
{
    let paper;
    const namebuf = C.zeroBuffer(C.BUFSZ);
    let nm, bp;
    let new_obj;
    let basecost, actualcost;
    let curseval;
    const qbuf = C.stackAlloc(C.QBUFSZ);
    let first, last, i, deferred, deferralchance, real;
    let by_descr = 0;
    let typeword;
    let spell_knowledge;

    if (C.nohands(C.gy.youmonst.data)) {
        C.You("need hands to be able to write!");
        return C.ECMD_OK;
    } else if (C.Glib) {
        C.pline("%s from your %s.", C.Tobjnam(pen, "slip"),
              C.fingers_or_gloves(0));
        C.dropx(pen);
        return C.ECMD_TIME;
    }

    /* get paper to write on */
    paper = C.getobj("write on", write_ok, C.GETOBJ_NOFLAGS);
    if (!paper)
        return C.ECMD_CANCEL;
    /* can't write on a novel (unless/until it's been converted into a blank
       spellbook), but we want messages saying so to avoid "spellbook" */
    typeword = (paper.otyp == C.SPE_NOVEL) ? "book"
               : (paper.oclass == C.SPBOOK_CLASS) ? "spellbook"
                 : "scroll";
    if (C.Blind) {
        if (!paper.dknown) {
            C.You("don't know whether that %s is blank or not.", typeword);
            return C.ECMD_OK;
        } else if (paper.oclass == C.SPBOOK_CLASS) {
            /* can't write a magic book while blind */
            C.pline("%s can't create braille text.",
                  C.upstart(C.ysimple_name(pen)));
            return C.ECMD_OK;
        }
    }
    C.observe_object(paper);
    if (paper.otyp != C.SCR_BLANK_PAPER && paper.otyp != C.SPE_BLANK_PAPER) {
        C.pline("That %s is not blank!", typeword);
        C.exercise(C.A_WIS, 0);
        return C.ECMD_TIME;
    }
    C.makeknown(C.SCR_BLANK_PAPER);

    /* what to write */
    C.Sprintf(qbuf, "What type of %s do you want to write?", typeword);
    C.getlin(qbuf, namebuf);
    C.mungspaces(namebuf); /* remove any excess whitespace */
    if (C.HEAP8[namebuf] == 27 || !C.HEAP8[namebuf])
        return C.ECMD_TIME;
    nm = namebuf;
    if (!C.strncmpi(nm, "scroll ", 7))
        nm += 7;
    else if (!C.strncmpi(nm, "spellbook ", 10))
        nm += 10;
    if (!C.strncmpi(nm, "of ", 3))
        nm += 3;

    if ((bp = C.strstri(nm, " armour")) != 0) {
        C.memcpy(bp, " armor ", 7);
        C.mungspaces(bp + 1);        /* remove the extra space */
    }

    found: {
    deferred = real = 0; /* not any scroll or book */
    deferralchance = 0;  /* incremented for each oc_uname match */
    first = C.svb.bases[paper.oclass];
    last = C.svb.bases[paper.oclass + 1] - 1;
    /* first loop: look for match with name/description */
    for (i = first; i <= last; i++) {
        /* extra shufflable descr not representing a real object */
        if (!C.OBJ_NAME(C.objects[i]))
            continue;

        if (!C.strcmpi(C.OBJ_NAME(C.objects[i]), nm)) {
            if (C.objects[i].oc_name_known
                /* spellbooks can only be written by_name, so no need to
                   hold out for a 'better' by_descr match */
                || paper.oclass == C.SPBOOK_CLASS) {
                break found;
            } else {
                /* save item in case there are no better by_descr matches */
                real = deferred = i;
                break;
            }
        }

        if (!C.strcmpi(C.OBJ_DESCR(C.objects[i]), nm)) {
            by_descr = 1;
            break found;
        }
    }
    /* second loop: look for match with user-assigned name */
    /* we will get here if 'nm' isn't a real scroll name/descr, or is the name
     * of a real scroll that hasn't been formally IDed. */
    for (i = first; i <= last; i++) {
        /* player might assign same name multiple times and if so,
           we choose one of those matches randomly */
        if (C.objects[i].oc_uname && !C.strcmpi(C.objects[i].oc_uname, nm)
            /* prefer attempting to write the real scroll type if
               the typename clobbers a real scroll and is known to
               be incorrect */
            && !(real && C.objects[i].oc_name_known)
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
            && !C.rn2(++deferralchance, 193, 'dowrite')) {
            deferred = i;
            /* writing by user-assigned name is same as by description:
               fails for books, works for scrolls (having an assigned
               type name guarantees presence on discoveries list) */
            by_descr = 1;
        }
    }

    if (deferred) {
        i = deferred;
        break found;
    }

    C.There("is no such %s!", typeword);
    return C.ECMD_TIME;
    }

    if (i == C.SCR_BLANK_PAPER || i == C.SPE_BLANK_PAPER) {
        C.You_cant("write that!");
        C.pline("It's obscene!");
        return C.ECMD_TIME;
    } else if (i == C.SPE_NOVEL) {
        let fanfic = !C.rn2(3, 216, 'dowrite'), tearup = !C.rn2(3, 216, 'dowrite');

        if (!fanfic) {
            C.You("%s to write the Great Yendorian Novel, but %s inspiration.",
                !tearup ? "prepare" : "try",
                !C.Hallucination ? "lack" : "have too much");
        } else {
            C.You("%sproduce really %s fan-fiction.",
                !tearup ? "start to " : "",
                !C.Hallucination ? "lame" : "awesome");
        }
        if (!tearup) {
            C.You("give up on the idea.");
        } else {
            C.You("tear it up.");
            C.useup(paper);
        }
        return C.ECMD_TIME;
    } else if (i == C.SPE_BOOK_OF_THE_DEAD) {
        C.pline("No mere dungeon adventurer could write that.");
        return C.ECMD_TIME;
    } else if (by_descr && paper.oclass == C.SPBOOK_CLASS
               && !C.objects[i].oc_name_known) {
        /* can't write unknown spellbooks by description */
        C.pline("Unfortunately you don't have enough information to go on.");
        return C.ECMD_TIME;
    }

    /* KMH, conduct */
    if (!C.u.uconduct.literate++)
        C.livelog_printf(C.LL_CONDUCT,
                       "became literate by writing %s", C.an(typeword));

    new_obj = C.mksobj(i, 0, 0);
    new_obj.bknown = (paper.bknown && pen.bknown);

    /* shk imposes a flat rate per use, not based on actual charges used */
    C.check_unpaid(pen);

    /* see if there's enough ink */
    basecost = cost(new_obj);
    if (pen.spe < Math.trunc(basecost / 2)) {
        C.Your("marker is too dry to write that!");
        C.obfree(new_obj, 0);
        return C.ECMD_TIME;
    }

    /* we're really going to write now, so calculate cost
     */
    actualcost = C.rn1(Math.trunc(basecost / 2), Math.trunc(basecost / 2), 265, 'dowrite');
    curseval = C.bcsign(pen) + C.bcsign(paper);
    C.exercise(C.A_WIS, 1);
    /* dry out marker */
    if (pen.spe < actualcost) {
        pen.spe = 0;
        C.Your("marker dries out!");
        /* scrolls disappear, spellbooks don't */
        if (paper.oclass == C.SPBOOK_CLASS) {
            C.pline_The("spellbook is left unfinished and your writing fades.");
            C.update_inventory(); /* pen charges */
        } else {
            C.pline_The("scroll is now useless and disappears!");
            C.useup(paper);
        }
        C.obfree(new_obj, 0);
        return C.ECMD_TIME;
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

    if (paper.oclass == C.SPBOOK_CLASS) {
        spell_knowledge = C.known_spell(new_obj.otyp);
    } else {
        spell_knowledge = C.spe_Unknown;
    }
    /* if known, then either by-name or by-descr works */
    if (!C.objects[new_obj.otyp].oc_name_known
        /* else if named, then only by-descr works */
        && !(by_descr && C.objects[new_obj.otyp].oc_encountered)
        /* else fresh knowledge of the spell works */
        && spell_knowledge != C.spe_Fresh
        /* and Luck might override after previous checks have failed */
        && C.rnl(((C.Role_if(C.PM_WIZARD) && paper.oclass != C.SPBOOK_CLASS)
                || spell_knowledge == C.spe_GoingStale)
               ? 5 : 15, 321, 'dowrite')) {
        C.You("%s to write that.", by_descr ? "fail" : "don't know how");
        /* scrolls disappear, spellbooks don't */
        if (paper.oclass == C.SPBOOK_CLASS) {
            C.You(
      "write in your best handwriting:  \"My Diary\", but it quickly fades.");
            C.update_inventory(); /* pen charges */
        } else {
            if (by_descr) {
                C.Strcpy(namebuf, C.OBJ_DESCR(C.objects[new_obj.otyp]));
                C.wipeout_text(namebuf, Math.trunc(C.int(6 + C.MAXULEV - C.u.ulevel) / 6), 0);
            } else
                C.Sprintf(namebuf, "%s was here!", C.svp.plname);
            C.You("write \"%s\" and the scroll disappears.", namebuf);
            C.useup(paper);
        }
        C.obfree(new_obj, 0);
        return C.ECMD_TIME;
    }
    /* can write scrolls when blind, but requires luck too;
       attempts to write books when blind are caught above */
    if (C.Blind && C.rnl(3, 342, 'dowrite')) {
        /* writing while blind usually fails regardless of
           whether the target scroll is known; even if we
           have passed the write-an-unknown scroll test
           above we can still fail this one, so it's doubly
           hard to write an unknown scroll while blind */
        C.You("fail to write the scroll correctly and it disappears.");
        C.useup(paper);
        C.obfree(new_obj, 0);
        return C.ECMD_TIME;
    }

    /* use up old scroll / spellbook */
    C.useup(paper);

    /* success */
    if (new_obj.oclass == C.SPBOOK_CLASS) {
        /* acknowledge the change in the object's description... */
        C.pline_The("spellbook warps strangely, then turns %s.",
                  new_book_description(new_obj.otyp, namebuf));
    }
    new_obj.blessed = (curseval > 0);
    new_obj.cursed = (curseval < 0);
// #ifdef MAIL_STRUCTURES
    if (new_obj.otyp == C.SCR_MAIL)
        /* 0: delivered in-game via external event (or randomly for fake mail);
           1: from bones or wishing; 2: written with marker */
        new_obj.spe = 2;
// #endif
    /* unlike alchemy, for example, a successful result yields the
       specifically chosen item so hero recognizes it even if blind;
       the exception is for being lucky writing an undiscovered scroll,
       where the label associated with the type-name isn't known yet;
       but if writing by description, the description is always known */
    new_obj.dknown = 0;
    if (C.objects[new_obj.otyp].oc_name_known || by_descr)
        C.observe_object(new_obj);

    new_obj = C.hold_another_object(new_obj, "Oops!  %s out of your grasp!",
                                  C.The(C.aobjnam(new_obj, "slip")),
                                  0);
    // nhUse(new_obj); /* try to avoid complaint about dead assignment */
    return C.ECMD_TIME;
}

/* most book descriptions refer to cover appearance, so we can issue a
   message for converting a plain book into one of those with something
   like "the spellbook turns red" or "the spellbook turns ragged";
   but some descriptions refer to composition and "the book turns vellum"
   looks funny, so we want to insert "into " prior to such descriptions;
   even that's rather iffy, indicating that such descriptions probably
   ought to be eliminated (especially "cloth"!) */
export function new_book_description(booktype, outbuf)
{
    /* subset of description strings from objects.c; if it grows
       much, we may need to add a new flag field to objects[] instead */
    const compositions = [
        "parchment",
        "vellum",
        "cloth",
// #if 0
//        "canvas", "hardcover", /* not used */
//        "papyrus", /* not applicable--can't be produced via writing */
// #endif /*0*/
        0
    ];
    let descr, comp_p;

    descr = C.OBJ_DESCR(C.objects[booktype]);
    for (comp_p = 0; compositions[comp_p]; ++comp_p)
        if (!C.strcmpi(descr, compositions[comp_p]))
            break;

    C.Sprintf(outbuf, "%s%s", compositions[comp_p] ? "into " : "", descr);
    return outbuf;
}

/*write.c*/
