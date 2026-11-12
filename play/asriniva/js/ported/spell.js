/* NetHack 5.0	spell.c	$NHDT-Date: 1769498874 2026/01/26 23:27:54 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.185 $ */
/*      Copyright (c) M. Stephenson 1988                          */
/* NetHack may be freely redistributed.  See license for details. */

import { C } from '../c-runtime/context.js';

/* spellmenu arguments; 0..n-1 used as svs.spl_book[] index when swapping */
const SPELLMENU_DUMP = (-3);
const SPELLMENU_CAST = (-2);
const SPELLMENU_VIEW = (-1);
// SPELLMENU_SORT expands the configured MAXSPELL at each use. /* special menu entry */

/* spell retention period, in turns; at 10% of this value, player becomes
   eligible to reread the spellbook and regain 100% retention (the threshold
   used to be 1000 turns, which was 10% of the original 10000 turn retention
   period but didn't get adjusted when that period got doubled to 20000) */
const KEEN = 20000;
/* x: need to add 1 when used for reading a spellbook rather than for hero
   initialization; spell memory is decremented at the end of each turn,
   including the turn on which the spellbook is read; without the extra
   increment, the hero used to get cheated out of 1 turn of retention */
// Original spell field/letter macros expand inline at each use.






/* The roles[] table lists the role-specific values for tuning
 * percent_success().
 *
 * Reasoning:
 *   spelbase, spelheal:
 *      Arc are aware of magic through historical research
 *      Bar abhor magic (Conan finds it "interferes with his animal instincts")
 *      Cav are ignorant to magic
 *      Hea are very aware of healing magic through medical research
 *      Kni are moderately aware of healing from Paladin training
 *      Mon use magic to attack and defend in lieu of weapons and armor
 *      Pri are very aware of healing magic through theological research
 *      Ran avoid magic, preferring to fight unseen and unheard
 *      Rog are moderately aware of magic through trickery
 *      Sam have limited magical awareness, preferring meditation to conjuring
 *      Tou are aware of magic from all the great films they have seen
 *      Val have limited magical awareness, preferring fighting
 *      Wiz are trained mages
 *
 *      The arms penalty is lessened for trained fighters Bar, Kni, Ran,
 *      Sam, Val -- the penalty is its metal interference, not encumbrance.
 *      The `spelspec' is a single spell which is fundamentally easier
 *      for that role to cast.
 *
 *  spelspec, spelsbon:
 *      Arc map masters (SPE_MAGIC_MAPPING)
 *      Bar fugue/berserker (SPE_HASTE_SELF)
 *      Cav born to dig (SPE_DIG)
 *      Hea to heal (SPE_CURE_SICKNESS)
 *      Kni to turn back evil (SPE_TURN_UNDEAD)
 *      Mon to preserve their abilities (SPE_RESTORE_ABILITY)
 *      Pri to bless (SPE_REMOVE_CURSE)
 *      Ran to hide (SPE_INVISIBILITY)
 *      Rog to find loot (SPE_DETECT_TREASURE)
 *      Sam to be At One (SPE_CLAIRVOYANCE)
 *      Tou to smile (SPE_CHARM_MONSTER)
 *      Val control the cold (SPE_CONE_OF_COLD)
 *      Wiz all really, but SPE_MAGIC_MISSILE is their party trick
 *
 *      See percent_success() below for more comments.
 *
 *  uarmbon, uarmsbon, uarmhbon, uarmgbon, uarmfbon:
 *      Fighters find body armour & shield a little less limiting.
 *      Headgear, Gauntlets and Footwear are not role-specific (but
 *      still have an effect, except helm of brilliance, which is designed
 *      to permit magic use).
 */

const uarmhbon = 4; /* Metal helmets interfere with the mind */
const uarmgbon = 6; /* Casting channels through the hands */
const uarmfbon = 2; /* All metal interferes to some degree */

/* since the spellbook itself doesn't blow up, don't say just "explodes" */
export const explodes = "radiates explosive energy";

/* convert a letter into a number in the range 0..51, or -1 if not a letter */
export function spell_let_to_idx(ilet)
{
    ilet = C.char(ilet);
    let indx;

    indx = ilet - 97;
    if (indx >= 0 && indx < 26)
        return indx;
    indx = ilet - 65;
    if (indx >= 0 && indx < 26)
        return indx + 26;
    return -1;
}

/* TRUE: book should be destroyed by caller */
export function cursed_book(bp)
{
    let was_in_use;
    let lev = C.objects[bp.otyp].oc_level;
    let dmg = 0;

    switch (C.rn2(lev, 136, 'cursed_book')) {
    case 0:
        C.You_feel("a wrenching sensation.");
        C.tele(); /* teleport him */
        break;
    case 1:
        C.You_feel("threatened.");
        C.aggravate();
        break;
    case 2:
        C.make_blinded(C.BlindedTimeout + BigInt(C.rn1(100, 250, 146, 'cursed_book')), 1);
        break;
    case 3:
        C.take_gold();
        break;
    case 4:
        C.pline("These runes were just too much to comprehend.");
        C.make_confused(C.HConfusion + BigInt(C.rn1(7, 16, 153, 'cursed_book')), 0);
        break;
    case 5:
        C.pline_The("book was coated with contact poison!");
        if (C.uarmg) {
            C.erode_obj(C.uarmg, "gloves", C.ERODE_CORRODE, C.EF_GREASE | C.EF_VERBOSE);
            break;
        }
        /* temp disable in_use; death should not destroy the book */
        was_in_use = bp.in_use;
        bp.in_use = 0;
        C.poison_strdmg(C.Poison_resistance ? C.rn1(2, 1, 164, 'cursed_book') : C.rn1(4, 3, 164, 'cursed_book'),
                      C.rnd(C.Poison_resistance ? 6 : 10, 165, 'cursed_book'),
                      "contact-poisoned spellbook", C.KILLED_BY_AN);
        bp.in_use = was_in_use;
        break;
    case 6:
        if (C.Antimagic) {
            C.shieldeff(C.u.ux, C.u.uy);
            C.pline_The("book %s, but you are unharmed!", explodes);
        } else {
            C.pline("As you read the book, it %s in your %s!", explodes,
                  C.body_part(C.FACE));
            dmg = 2 * C.rnd(10, 176, 'cursed_book') + 5;
            C.losehp((C.Half_physical_damage ? Math.trunc((dmg + 1) / 2) : dmg), "exploding rune", C.KILLED_BY_AN);
        }
        return 1;
    default:
        C.rndcurse();
        break;
    }
    return 0;
}

/* study while confused: returns TRUE if the book is destroyed */
export function confused_book(spellbook)
{
    let gone = 0;

    if (!C.rn2(3, 193, 'confused_book') && spellbook.otyp != C.SPE_BOOK_OF_THE_DEAD) {
        spellbook.in_use = 1; /* in case called from learn() */
        C.pline(
         "Being confused you have difficulties in controlling your actions.");
        C.display_nhwindow(C.WIN_MESSAGE, 0);
        C.You("accidentally tear the spellbook to pieces.");
        C.trycall(spellbook);
        C.useup(spellbook);
        gone = 1;
    } else {
        C.You("find yourself reading the %s line over and over again.",
            C.samePtr(spellbook, C.svc.context.spbook.book) ? "next" : "first");
    }
    return gone;
}

/* pacify or tame an undead monster */
export function deadbook_pacify_undead(mtmp)
{
    if ((C.is_undead(mtmp.data) || C.is_vampshifter(mtmp))
        && C.cansee(mtmp.mx, mtmp.my)) {
        mtmp.mpeaceful = 1;
        if (C.sgn(mtmp.data.maligntyp) == C.sgn(C.u.ualign.type)
            && C.mdistu(mtmp) < 4)
            if (mtmp.mtame) {
                if (mtmp.mtame < 20)
                    mtmp.mtame++;
            } else
                C.tamedog(mtmp, 0, 1);
        else
            C.monflee(mtmp, 0, 0, 1);
    }
}

/* special effects for the Book of the Dead; reading it while blind is
   allowed so that needs to be taken into account too */
export function deadbook(book2)
{
    let mtmp;
    const mm = C.coordLocal();

    C.You("turn the pages of the Book of the Dead...");
    C.makeknown(C.SPE_BOOK_OF_THE_DEAD);
    C.observe_object(book2); /* in case blind now and hasn't been seen yet */
    /* KMH -- Need ->known to avoid "_a_ Book of the Dead" */
    book2.known = 1;
    let raise_dead = 0;
    raise_dead: {
    if (C.invocation_pos(C.u.ux, C.u.uy) && !C.On_stairs(C.u.ux, C.u.uy)) {
        let otmp;
        let arti1_primed = 0, arti2_primed = 0,
                         arti_cursed = 0;

        if (book2.cursed) {
            C.pline_The("%s!",
                      C.Blind ? "Book seems to be ignoring you"
                            : "runes appear scrambled.  You can't read them");
            return;
        }

        if (!C.u.uhave.bell || !C.u.uhave.menorah) {
            C.pline("A chill runs down your %s.", C.body_part(C.SPINE));
            if (!C.u.uhave.bell) {
                // Soundeffect(se_faint_chime, 30); inactive: no argument evaluation
                C.You_hear("a faint chime...");
            }
            if (!C.u.uhave.menorah)
                C.pline("Vlad's doppelganger is amused.");
            return;
        }

        for (otmp = C.gi.invent; otmp; otmp = otmp.nobj) {
            if (otmp.otyp == C.CANDELABRUM_OF_INVOCATION && otmp.spe == 7
                && otmp.lamplit) {
                if (!otmp.cursed)
                    arti1_primed = 1;
                else
                    arti_cursed = 1;
            }
            if (otmp.otyp == C.BELL_OF_OPENING
                && (C.svm.moves - otmp.age) < 5n) { /* you rang it recently */
                if (!otmp.cursed)
                    arti2_primed = 1;
                else
                    arti_cursed = 1;
            }
        }

        if (arti_cursed) {
            C.pline_The("invocation fails!");
            /* this used to say "your artifacts" but the invocation tools
               are not artifacts */
            C.pline("At least one of your relics is cursed...");
        } else if (arti1_primed && arti2_primed) {
            let soon = C.uint(C.d(2, 6, 287, 'deadbook')); /* time til next intervene() */

            /* successful invocation */
            C.mkinvokearea();
            C.u.uevent.invoked = 1;
            C.record_achievement(C.ACH_INVK);
            /* in case you haven't killed the Wizard yet, behave as if
               you just did */
            C.u.uevent.udemigod = 1; /* wizdeadorgone() */
            if (!C.u.udg_cnt || C.u.udg_cnt > soon)
                C.u.udg_cnt = soon;
        } else { /* at least one relic not prepared properly */
            C.You("have a feeling that %s is amiss...", C.something);
            raise_dead = 1; break raise_dead;
        }
        return;
    }

    }
    /* when not an invocation situation */
    if (book2.cursed || raise_dead) {

        C.You("raised the dead!");
        /* first maybe place a dangerous adversary */
        if (!C.rn2(3, 311, 'deadbook') && ((mtmp = C.makemon(C.mons[C.PM_MASTER_LICH], C.u.ux, C.u.uy,
                                        C.NO_MINVENT)) != 0
                        || (mtmp = C.makemon(C.mons[C.PM_NALFESHNEE], C.u.ux, C.u.uy,
                                           C.NO_MINVENT)) != 0)) {
            mtmp.mpeaceful = 0;
            C.set_malign(mtmp);
        }
        /* next handle the affect on things you're carrying */
        C.unturn_dead(C.gy.youmonst);
        /* last place some monsters around you */
        mm.x = C.u.ux;
        mm.y = C.u.uy;
        C.mkundead(mm, 1, C.NO_MINVENT);
    } else if (book2.blessed) {
        C.iter_mons(deadbook_pacify_undead);
    } else {
        switch (C.rn2(3, 327, 'deadbook')) {
        case 0:
            C.Your("ancestors are annoyed with you!");
            break;
        case 1:
            C.pline_The("headstones in the cemetery begin to move!");
            break;
        default:
            C.pline("Oh my!  Your name appears in the book!");
        }
    }
    return;
}

/* 'book' has just become cursed; if we're reading it, interrupt */
export function book_cursed(book)
{
    if (book.cursed && C.gm.multi >= 0
        && C.sameFunction(C.go.occupation, learn) && C.samePtr(C.svc.context.spbook.book, book)) {
        C.pline("%s shut!", C.Tobjnam(book, "slam"));
        C.set_bknown(book, 1);
        C.stop_occupation();
    }
}



export function learn()
{
    let i;
    let booktype;
    const splname = C.stackAlloc(C.BUFSZ);
    let costly = 1, faded_to_blank = 0;
    let book = C.svc.context.spbook.book;

    /* JDS: lenses give 50% faster reading; 33% smaller read time */
    if (C.svc.context.spbook.delay && C.ublindf
        && C.ublindf.otyp == C.LENSES && C.rn2(2, 366, 'learn'))
        C.svc.context.spbook.delay++;
    if (C.Confusion) { /* became confused while learning */
        confused_book(book);
        C.svc.context.spbook.book = 0; /* no longer studying */
        C.svc.context.spbook.o_id = 0;
        C.nomul(C.svc.context.spbook.delay); /* remaining delay is uninterrupted */
        C.gm.multi_reason = "reading a book";
        C.gn.nomovemsg = 0;
        C.svc.context.spbook.delay = 0;
        return 0;
    }
    if (C.svc.context.spbook.delay) {
        /* not if (svc.context.spbook.delay++), so at end delay == 0 */
        C.svc.context.spbook.delay++;
        return 1; /* still busy */
    }
    C.exercise(C.A_WIS, 1); /* you're studying. */
    booktype = book.otyp;
    if (booktype == C.SPE_BOOK_OF_THE_DEAD) {
        C.callLocal(deadbook, book);
        return 0;
    }

    C.Sprintf(splname,
            C.objects[booktype].oc_name_known ? "\"%s\"" : "the \"%s\" spell",
            C.OBJ_NAME(C.objects[booktype]));
    for (i = 0; i < C.MAXSPELL; i++)
        if (C.svs.spl_book[i].sp_id == booktype || C.svs.spl_book[i].sp_id == C.NO_SPELL)
            break;

    if (i == C.MAXSPELL) {
        C.impossible("Too many spells memorized!");
    } else if (C.svs.spl_book[i].sp_id == booktype) {
        /* normal book can be read and re-read a total of 4 times */
        if (book.spestudied > C.MAX_SPELL_STUDY) {
            C.pline("This spellbook is too faint to be read any more.");
            book.otyp = booktype = C.SPE_BLANK_PAPER;
            faded_to_blank = 1;
            /* reset spestudied as if polymorph had taken place */
            book.spestudied = C.rn2(book.spestudied, 406, 'learn');
        } else {
            C.Your("knowledge of %s is %s.", splname,
                 C.svs.spl_book[i].sp_know ? "keener" : "restored");
            (C.svs.spl_book[i].sp_know = KEEN + (1));
            book.spestudied++;
            C.exercise(C.A_WIS, 1); /* extra study */
        }
    } else { /* (spellid(i) == NO_SPELL) */
        /* for a normal book, spestudied will be zero, but for
           a polymorphed one, spestudied will be non-zero and
           one less reading is available than when re-learning */
        if (book.spestudied >= C.MAX_SPELL_STUDY) {
            /* pre-used due to being the product of polymorph */
            C.pline("This spellbook is too faint to read even once.");
            book.otyp = booktype = C.SPE_BLANK_PAPER;
            faded_to_blank = 1;
            /* reset spestudied as if polymorph had taken place */
            book.spestudied = C.rn2(book.spestudied, 424, 'learn');
        } else {
            C.svs.spl_book[i].sp_id = booktype;
            C.svs.spl_book[i].sp_lev = C.objects[booktype].oc_level;
            (C.svs.spl_book[i].sp_know = KEEN + (1));
            book.spestudied++;
            if (!i)
                /* first is always 'a', so no need to mention the letter */
                C.You("learn %s.", splname);
            else
                C.You("add %s to your repertoire, as '%c'.",
                    splname, C.char((i < 26) ? (97 + i) : (65 + i - 26)));
        }
    }
    if (i < C.MAXSPELL) {
        /* might be learning a new spellbook type or spellbook of blank paper;
           if so, persistent inventory will get updated */
        C.makeknown(C.int(booktype));
        /* makeknown() calls update_inventory() when discovering something
           new but is a no-op for something that's already known so wouldn't
           update persistent inventory to reflect faded book if spellbook of
           blank paper happens to already be discovered */
        if (faded_to_blank)
            C.update_inventory();
    }

    if (book.cursed) { /* maybe a demon cursed it */
        if (C.callLocal(cursed_book, book)) {
            C.useup(book);
            C.svc.context.spbook.book = 0;
            C.svc.context.spbook.o_id = 0;
            return 0;
        }
    }
    if (costly)
        C.check_unpaid(book);
    C.svc.context.spbook.book = 0;
    C.svc.context.spbook.o_id = 0;
    return 0;
}



export function study_book(spellbook)
{
    let booktype = spellbook.otyp, i;
    let confused = (C.Confusion != 0);
    let too_hard = 0;

    /* attempting to read dull book may make hero fall asleep */
    if (!confused && !C.Sleep_resistance
        && C.objdescr_is(spellbook, "dull")) {
        let eyes;
        let dullbook = C.rnd(25, 478, 'study_book') - C.ACURR(C.A_WIS);

        /* adjust chance if hero stayed awake, got interrupted, retries */
        if (C.svc.context.spbook.delay && C.samePtr(spellbook, C.svc.context.spbook.book))
            dullbook -= C.rnd(C.objects[booktype].oc_level, 482, 'study_book');

        if (dullbook > 0) {
            eyes = C.body_part(C.EYE);
            if (C.eyecount(C.gy.youmonst.data) > 1)
                eyes = C.makeplural(eyes);
            C.pline("This book is so dull that you can't keep your %s open.",
                  eyes);
            dullbook += C.rnd(2 * C.objects[booktype].oc_level, 490, 'study_book');
            C.fall_asleep(-dullbook, 1);
            return 1;
        }
    }

    if (C.svc.context.spbook.delay && !confused
        && C.samePtr(spellbook, C.svc.context.spbook.book)
        /* handle the sequence: start reading, get interrupted, have
           svc.context.spbook.book become erased somehow, resume reading it */
        && booktype != C.SPE_BLANK_PAPER) {
        C.You("continue your efforts to %s.",
            (booktype == C.SPE_NOVEL) ? "read the novel"
                                    : "memorize the spell");
    } else {
        /* KMH -- Simplified this code */
        if (booktype == C.SPE_BLANK_PAPER) {
            C.pline("This spellbook is all blank.");
            C.makeknown(booktype);
            return 1;
        }

        /* 3.6 tribute */
        if (booktype == C.SPE_NOVEL) {
            /* Obtain current Terry Pratchett book title */
            let tribtitle = C.noveltitle(C.intField(spellbook, 'novelidx'));

            if (C.read_tribute("books", tribtitle, 0, 0, 0,
                             spellbook.o_id)) {
                if (!C.u.uconduct.literate++)
                    C.livelog_printf(C.LL_CONDUCT,
                                   "became literate by reading %s",
                                   tribtitle);

                C.check_unpaid(spellbook);
                C.makeknown(booktype);
                if (!C.u.uevent.read_tribute) {
                    C.record_achievement(C.ACH_NOVL);
                    /* give bonus of 20 xp and 4*20+0 pts */
                    C.more_experienced(20, 0);
                    C.newexplevel();
                    C.u.uevent.read_tribute = 1; /* only once */
                }
            }
            return 1;
        }

        switch (C.objects[booktype].oc_level) {
        case 1:
        case 2:
            C.svc.context.spbook.delay = -C.objects[booktype].oc_delay;
            break;
        case 3:
        case 4:
            C.svc.context.spbook.delay = -(C.objects[booktype].oc_level - 1)
                                   * C.objects[booktype].oc_delay;
            break;
        case 5:
        case 6:
            C.svc.context.spbook.delay =
                -C.objects[booktype].oc_level * C.objects[booktype].oc_delay;
            break;
        case 7:
            C.svc.context.spbook.delay = -8 * C.objects[booktype].oc_delay;
            break;
        default:
            C.impossible("Unknown spellbook level %d, book %d;",
                       C.objects[booktype].oc_level, booktype);
            return 0;
        }

        /* check to see if we already know it and want to refresh our memory */
        for (i = 0; i < C.MAXSPELL; i++)
            if (C.svs.spl_book[i].sp_id == booktype || C.svs.spl_book[i].sp_id == C.NO_SPELL)
                break;
        if (C.svs.spl_book[i].sp_id == booktype && C.svs.spl_book[i].sp_know > KEEN / 10) {
            C.You("know \"%s\" quite well already.",
                C.OBJ_NAME(C.objects[booktype]));
            /* hero has just been told what spell this book is for; it may
               have been undiscovered if spell was learned via divine gift */
            C.makeknown(booktype);
            if (C.y_n("Refresh your memory anyway?") == 110)
                return 0;
        }

        /* Books are often wiser than their readers (Rus.) */
        spellbook.in_use = 1;
        if (!spellbook.blessed && spellbook.otyp != C.SPE_BOOK_OF_THE_DEAD) {
            if (spellbook.cursed) {
                too_hard = 1;
            } else {
                /* uncursed - chance to fail */
                let read_ability = C.ACURR(C.A_INT) + 4 + Math.trunc(C.u.ulevel / 2)
                                   - 2 * C.objects[booktype].oc_level
                             + ((C.ublindf && C.ublindf.otyp == C.LENSES) ? 2 : 0);

                /* only wizards know if a spell is too difficult */
                if (C.Role_if(C.PM_WIZARD) && read_ability < 20 && !confused) {
                    const qbuf = C.stackAlloc(C.QBUFSZ);

                    C.Sprintf(qbuf,
                    "This spellbook is %sdifficult to comprehend.  Continue?",
                            (read_ability < 12 ? "very " : ""));
                    if (C.y_n(qbuf) != 121) {
                        spellbook.in_use = 0;
                        return 1;
                    }
                }
                /* its up to random luck now */
                if (C.rnd(20, 599, 'study_book') > read_ability) {
                    too_hard = 1;
                }
            }
        }

        if (too_hard) {
            let gone = C.callLocal(cursed_book, spellbook);

            C.nomul(C.svc.context.spbook.delay); /* study time */
            C.gm.multi_reason = "reading a book";
            C.gn.nomovemsg = 0;
            C.svc.context.spbook.delay = 0;
            if (gone || !C.rn2(3, 612, 'study_book')) {
                if (!gone)
                    C.pline_The("spellbook crumbles to dust!");
                C.trycall(spellbook);
                C.useup(spellbook);
            } else
                spellbook.in_use = 0;
            return 1;
        } else if (confused) {
            if (!confused_book(spellbook)) {
                spellbook.in_use = 0;
            }
            C.nomul(C.svc.context.spbook.delay);
            C.gm.multi_reason = "reading a book";
            C.gn.nomovemsg = 0;
            C.svc.context.spbook.delay = 0;
            return 1;
        }
        spellbook.in_use = 0;

        C.You("begin to %s the runes.",
            spellbook.otyp == C.SPE_BOOK_OF_THE_DEAD ? "recite" : "memorize");
    }

    C.svc.context.spbook.book = spellbook;
    if (C.svc.context.spbook.book)
        C.svc.context.spbook.o_id = C.svc.context.spbook.book.o_id;
    C.set_occupation(learn, "studying", 0);
    return 1;
}

/* a spellbook has been destroyed or the character has changed levels;
   the stored address for the current book is no longer valid */
export function book_disappears(obj)
{
    if (C.samePtr(obj, C.svc.context.spbook.book)) {
        C.svc.context.spbook.book = 0;
        C.svc.context.spbook.o_id = 0;
    }
}

/* renaming an object usually results in it having a different address;
   so the sequence start reading, get interrupted, name the book, resume
   reading would read the "new" book from scratch */
export function book_substitution(old_obj, new_obj)
{
    if (C.samePtr(old_obj, C.svc.context.spbook.book)) {
        C.svc.context.spbook.book = new_obj;
        if (C.svc.context.spbook.book)
            C.svc.context.spbook.o_id = C.svc.context.spbook.book.o_id;
    }
}

/* called from moveloop() */
export function age_spells()
{
    let i;
    /*
     * The time relative to the hero (a pass through move
     * loop) causes all spell knowledge to be decremented.
     * The hero's speed, rest status, conscious status etc.
     * does not alter the loss of memory.
     */
    for (i = 0; i < C.MAXSPELL && C.svs.spl_book[i].sp_id != C.NO_SPELL; i++)
        if (C.svs.spl_book[i].sp_know)
            C.svs.spl_book[i].sp_know--;
    return;
}

/* return True if spellcasting is inhibited;
   only covers a small subset of reasons why casting won't work */
export function rejectcasting()
{
    /* rejections which take place before selecting a particular spell */
    if (C.Stunned) {
        C.You("are too impaired to cast a spell.");
        return 1;
    } else if (!C.can_chant(C.gy.youmonst)) {
        C.You("are unable to chant the incantation.");
        return 1;
    } else if (!C.freehand() && !(C.uwep && C.uwep.otyp == C.QUARTERSTAFF)) {
        /* Note: !freehand() occurs when weapon and shield (or two-handed
         * weapon) are welded to hands, so "arms" probably doesn't need
         * to be makeplural(bodypart(ARM)).
         *
         * But why isn't lack of free arms (for gesturing) an issue when
         * poly'd hero has no limbs?
         */
        C.Your("arms are not free to cast!");
        return 1;
    }
    return 0;
}

/*
 * Return TRUE if a spell was picked, with the spell index in the return
 * parameter.  Otherwise return FALSE.
 */
export function getspell(spell_no)
{
    let nspells, idx, retry_limit;
    let ilet; const lets = C.stackAlloc(C.BUFSZ), qbuf = C.stackAlloc(C.QBUFSZ);
    let cq, cmdq;

    nspells = num_spells();
    if (!nspells) {
        C.You("don't know any spells right now.");
        return 0;
    }
    if (rejectcasting())
        return 0; /* no spell chosen */

    if ((cmdq = C.cmdq_pop()) != 0) {
        cq = C.commandCopy(cmdq);
        C.free(cmdq);
        if (cq.typ == C.CMDQ_KEY) {
            idx = spell_let_to_idx(cq.key);
            if (idx < 0 || idx >= nspells)
                return 0;
            spell_no.value = idx;
            return 1;
        } else {
            return 0;
        }
    }

    if (C.flags.menu_style == C.MENU_TRADITIONAL) {
        /* if we get here, we know there is at least 1 known spell */
        if (nspells == 1)
            C.Strcpy(lets, "a");
        else if (nspells < 27)
            C.Sprintf(lets, "a-%c", 97 + nspells - 1);
        else if (nspells == 27)
            C.Strcpy(lets, "a-zA");
        /* this assumes that there are at most 52 spells... */
        else
            C.Sprintf(lets, "a-zA-%c", 65 + nspells - 27);

        C.Snprintf(qbuf, C.QBUFSZ, "Cast which spell? [%s *?]", lets, 755, "getspell");
        for (retry_limit = 0; ; ++retry_limit) {
            if (retry_limit == 10) {
                /* limit is mainly to prevent the fuzzer from getting stuck
                   since hangup should hit the 'quitchars' case; fuzzer
                   would too, but after an arbitrary number of attempts */
                C.pline("That's enough tries.");
                return 0;
            }
            ilet = C.yn_function(qbuf, 0, 0, 1);
            if (ilet == 42 || ilet == 63)
                break; /* use menu mode */
            if (C.strchr(C.quitchars, ilet)) {
                C.pline1(C.Never_mind);
                return 0;
            }

            idx = spell_let_to_idx(ilet);
            if (idx < 0 || idx >= nspells) {
                C.You("don't know that spell.");
                continue; /* ask again */
            }
            spell_no.value = idx;
            return 1;
        }
    }
    return C.callLocal(dospellmenu, "Choose which spell to cast", SPELLMENU_CAST,
                       spell_no);
}

/* #wizcast - cast any spell even without knowing it */
export function dowizcast()
{
    let win;
    const selected = C.menuPointerLocal();
    const any = C.anyLocal();
    let i, n;

    win = C.create_nhwindow(C.NHW_MENU);
    C.start_menu(win, C.MENU_BEHAVE_STANDARD);
    C.copyAnything(any, C.cg.zeroany);

    for (i = 0; i < C.MAXSPELL; i++) {
        n = (C.SPE_DIG + i);
        if (n >= C.SPE_BLANK_PAPER)
            break;
        any.a_int = n;
        C.add_menu(win, C.nul_glyphinfo, any, 0, 0, C.ATR_NONE, C.NO_COLOR,
                 C.OBJ_NAME(C.objects[n]), C.MENU_ITEMFLAGS_NONE);
    }
    C.end_menu(win, "Cast which spell?");
    n = C.select_menu(win, C.PICK_ONE, selected);
    C.destroy_nhwindow(win);
    if (n > 0) {
        i = selected.value[0].item.a_int;
        C.free(selected.value);
        return C.callLocal(spelleffects, i, 0, 1);
    }
    return C.ECMD_OK;
}


/* the #cast command -- cast a spell */
export function docast()
{
    const spell_no = C.intLocal();

    if (C.callLocal(getspell, spell_no)) {
        C.cmdq_add_key(C.CQ_REPEAT, C.char((spell_no.value < 26) ? (97 + spell_no.value) : (65 + spell_no.value - 26)));
        return C.callLocal(spelleffects, C.svs.spl_book[spell_no.value].sp_id, 0, 0);
    }
    return C.ECMD_FAIL;
}

export function spelltypemnemonic(skill)
{
    skill = C.int(skill);
    switch (skill) {
    case C.P_ATTACK_SPELL:
        return "attack";
    case C.P_HEALING_SPELL:
        return "healing";
    case C.P_DIVINATION_SPELL:
        return "divination";
    case C.P_ENCHANTMENT_SPELL:
        return "enchantment";
    case C.P_CLERIC_SPELL:
        return "clerical";
    case C.P_ESCAPE_SPELL:
        return "escape";
    case C.P_MATTER_SPELL:
        return "matter";
    default:
        C.impossible("Unknown spell skill, %d;", skill);
        return "";
    }
}

export function spell_skilltype(booktype)
{
    booktype = C.int(booktype);
    return C.objects[booktype].oc_skill;
}

/* Wizards learn what spellbooks look like based on their skill in the
   spell's school */
export function skill_based_spellbook_id()
{
    if (!C.Role_if(C.PM_WIZARD))
        return;

    let booktype;
    let spbook_class = C.uchar(C.SPBOOK_CLASS);

    for (booktype = C.svb.bases[spbook_class];
         booktype < C.svb.bases[spbook_class + 1];
         booktype++) {
        let known_up_to_level;
        let skill = spell_skilltype(booktype);

        if (skill == C.P_NONE)
            continue;

        switch (C.P_SKILL(skill)) {
        case C.P_BASIC:
            known_up_to_level = 3;
            break;
        case C.P_SKILLED:
            known_up_to_level = 5;
            break;
        case C.P_EXPERT:
        case C.P_MASTER:
        case C.P_GRAND_MASTER:
            known_up_to_level = 7;
            break;
        case C.P_UNSKILLED:
        default:
            /* paupers need more skill than this to ID books, but most wizards
               know the basics */
            known_up_to_level = C.u.uroleplay.pauper ? 0 : 1;
            break;
        }

        if (C.objects[booktype].oc_level <= known_up_to_level)
            /* makeknown(booktype) but don't exercise Wisdom or mark as
               encountered */
            C.discover_object(booktype, 1, 0, 0);
    }
}


/* Limit the total area chain lightning can cover; this is both for
   technical reasons (making it possible to limit the size of arrays
   here and in the display code) and for gameplay balance reasons;
   this value should be smaller than TMP_AT_MAX_GLYPHS (display.c) in
   order for chain lightning to display properly */
const CHAIN_LIGHTNING_LIMIT = 100;
/* Unlike most zaps, chain lightning can't hit solid terrain (it
   doesn't have enough power), it only covers open space; this also
   means that it can't hit monsters inside walls, which makes sense as
   they would be earthed */
// Original chain-lightning terrain macros expand inline.
/* not WATER */
/* not LAVAWALL */

/* direction in which this zap is currently moving; this is an
       enum movementdirs, clamped to the range 0 inclusive to N_DIRS
       exclusive */
/* current location of the zap */
/* distance this zap can cover without chaining */



/* Given a potential chain lightning zap, moves it one square forward in
   the given direction, then adds it to the queue unless it would hit an
   invalid square or is out of power.

   zap is passed by value, so the move-forward doesn't change the passed
   argument. */
export function propagate_chain_lightning(clq, zap)
{
    zap = C.chainZapCopy(zap); // Original C by-value parameter.
    let mon;

    zap.x += C.xdir[zap.dir];
    zap.y += C.ydir[zap.dir];

    if (clq.tail >= CHAIN_LIGHTNING_LIMIT)
        return;    /* zap has covered too many squares */
    if (!(C.isok(zap.x, zap.y) && ((C.SPACE_POS(C.levl[zap.x][zap.y].typ) || C.levl[zap.x][zap.y].typ == C.POOL || C.levl[zap.x][zap.y].typ == C.MOAT || C.levl[zap.x][zap.y].typ == C.DRAWBRIDGE_UP || C.levl[zap.x][zap.y].typ == C.LAVAPOOL) || (C.IS_DOOR(C.levl[zap.x][zap.y].typ) && !(C.levl[zap.x][zap.y].doormask & (C.D_CLOSED | C.D_LOCKED))))))
        return;    /* zap can't go to this square */

    mon = C.m_at(zap.x, zap.y);
    if (mon && mon.mpeaceful)
        return;    /* chain lightning avoids peaceful and tame monsters */

    /* When hitting a monster that isn't electricity-resistant, a
       particular chain lightning zap regains all its power, allowing it to
       chain to other monsters; upon hitting a shock-resistant monster it
       can't continue any further, but we let it hit the monster to show
       the shield effect */
    if (mon && !C.resists_elec(mon) && !C.defended(mon, C.AD_ELEC))
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
        if (clq.q[i].x == zap.x && clq.q[i].y == zap.y)
            return;
    }

    /* This array access must be inbounds due to the CHAIN_LIGHTNING_LIMIT
       check earlier. */
    clq.q[clq.tail++] = zap;

    /* Draw it. */
    C.tmp_at(C.DISP_CHANGE, C.zapdir_to_glyph(C.xdir[zap.dir], C.ydir[zap.dir],
                                        clq.displayed_beam));
    C.tmp_at(zap.x, zap.y);
}

export function cast_chain_lightning()
{
    const clq = C.chainQueueLocal();
    clq.displayed_beam = C.Hallucination ? C.rn2_on_display_rng(6) : (C.AD_ELEC - 1);

    if (C.u.uswallow) {
        // TODO: damage the engulfer
        return;
    }

    /* set the type of beam we're using; the direction here is arbitrary
       because we change the beam direction just before drawing the beam
       anyway */
    C.tmp_at(C.DISP_BEAM, C.zapdir_to_glyph(0, 1, clq.displayed_beam));

    /* start by propagating in all directions from the caster */
    for (let dir = 0; dir < C.N_DIRS; dir++) {
        const zap = C.chainZapLocal(dir, C.u.ux, C.u.uy, 2);

        C.callLocal(propagate_chain_lightning, clq, zap);
    }
    C.nh_delay_output();

    while (clq.head < clq.tail) {
        let delay_tail = clq.tail;

        while (clq.head < delay_tail) {
            const zap = C.chainZapCopy(clq.q[clq.head++]);
            /* damage any monster that was hit */
            let mon = C.m_at(zap.x, zap.y);

            if (mon) {
                const unused = C.objectPointerLocal(0); /* AD_ELEC can't destroy armor */
                let dmg;

                C.gn.notonhead = (Number(Boolean(mon.mx != C.gb.bhitpos.x
                                || mon.my != C.gb.bhitpos.y)));
                dmg = C.zhitm(mon, C.BZ_U_SPELL(C.AD_ELEC - 1), 2, unused);

                if (dmg) {
                    /* mon has been damaged, but we haven't yet printed the
                       messages or given kill credit; assume the hero can
                       sense their spell hitting monsters, because they can
                       steer it away from peacefuls */
                    if (C.DEADMONSTER(mon)) {
                        C.xkilled(mon, C.XKILL_GIVEMSG);
                    } else {
                        C.pline("You shock %s%s", C.mon_nam(mon), C.exclam(dmg));
                        /* if a long worm, only map 'I' for its head */
                        if (!C.canseemon(mon) && !C.gn.notonhead)
                            /* FIXME: this doesn't work, possibly because
                               cleaning up tmp_at() restores old glyph? */
                            C.map_invisible(zap.x, zap.y);
                    }
                } else if (C.canseemon(mon)) {
                    C.pline("%s resists.", C.Monnam(mon));
                }
                if (!C.DEADMONSTER(mon)) {
                    /* wakeup is via attack, but since mon is already
                       hostile we pass via_attack==False rather than True,
                       otherwise other monsters witnessing this would treat
                       it as seeing hero attack a peaceful; mimic will be
                       exposed; forcefight makes hider unhide */
                    C.svc.context.forcefight++;
                    C.wakeup(mon, 0);
                    C.svc.context.forcefight--;
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

            C.callLocal(propagate_chain_lightning, clq, zap);

            if (zap.strength < 2)
                zap.strength = 0;
            else if (C.u.uen > 0)
                C.u.uen--; /* propagating past mons increases Pw cost a bit */
            zap.dir = C.DIR_LEFT(zap.dir);
            C.callLocal(propagate_chain_lightning, clq, zap);

            zap.dir = C.DIR_RIGHT2(zap.dir);
            C.callLocal(propagate_chain_lightning, clq, zap);
        }
        C.nh_delay_output();
    }
    C.nh_delay_output();
    C.nh_delay_output();

    C.tmp_at(C.DISP_END, 0);
}


export function cast_protection()
{
    let l = C.u.ulevel, loglev = 0,
        gain, natac = C.u.uac + C.u.uspellprot;
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
     *
     *  LEVEL AC    SPELLPROT from successive SPE_PROTECTION casts
     *      1     10    0,  1,  2,  3,  4
     *      1      0    0,  1,  2,  3
     *      1    -10    0,  1,  2
     *      2-3   10    0,  2,  4,  5,  6,  7,  8
     *      2-3    0    0,  2,  4,  5,  6
     *      2-3  -10    0,  2,  3,  4
     *      4-7   10    0,  3,  6,  8,  9, 10, 11, 12
     *      4-7    0    0,  3,  5,  7,  8,  9
     *      4-7  -10    0,  3,  5,  6
     *      7-15 -10    0,  3,  5,  6
     *      8-15  10    0,  4,  7, 10, 12, 13, 14, 15, 16
     *      8-15   0    0,  4,  7,  9, 10, 11, 12
     *      8-15 -10    0,  4,  6,  7,  8
     *     16-30  10    0,  5,  9, 12, 14, 16, 17, 18, 19, 20
     *     16-30   0    0,  5,  9, 11, 13, 14, 15
     *     16-30 -10    0,  5,  8,  9, 10
     */
    natac = Math.trunc((10 - natac) / 10); /* convert to positive and scale down */
    gain = loglev - Math.trunc(C.int(C.u.uspellprot) / (4 - (3 < natac ? 3 : natac)));

    if (gain > 0) {
        if (!C.Blind) {
            let rmtyp;
            let hgolden = C.hcolor(C.NH_GOLDEN), atmosphere;

            if (C.u.uspellprot) {
                C.pline_The("%s haze around you becomes more dense.", hgolden);
            } else {
                let pm = C.u.ustuck ? C.u.ustuck.data : 0;

                rmtyp = C.levl[C.u.ux][C.u.uy].typ;
                atmosphere = (pm && C.u.uswallow)
                                ? ((C.samePtr(pm, C.mons[C.PM_FOG_CLOUD])) ? "mist"
                                   : C.is_whirly(pm) ? "maelstrom"
                                     : C.enfolds(pm) ? "folds"
                                       : C.is_animal(pm) ? "maw"
                                         : "ooze")
                                : (C.u.uinwater ? C.hliquid("water")
                                   : (rmtyp == C.CLOUD) ? "cloud"
                                     : C.IS_TREE(rmtyp) ? "vegetation"
                                       : C.IS_STWALL(rmtyp) ? "stone"
                                         : "air");
                C.pline_The("%s around you begins to shimmer with %s haze.",
                          atmosphere, C.an(hgolden));
            }
        }
        C.u.uspellprot += gain;
        C.u.uspmtime = (C.P_SKILL(spell_skilltype(C.SPE_PROTECTION)) == C.P_EXPERT)
                        ? 20 : 10;
        if (!C.u.usptime)
            C.u.usptime = C.u.uspmtime;
        C.find_ac();
    } else {
        C.Your("skin feels warm for a moment.");
    }
}

/* attempting to cast a forgotten spell will cause disorientation */
export function spell_backfire(spell)
{
    spell = C.int(spell);
    let duration = C.long(((C.svs.spl_book[spell].sp_lev + 1) * 3)), /* 6..24 */
         old_stun = (C.HStun & C.TIMEOUT), old_conf = (C.HConfusion & C.TIMEOUT);

    /* Prior to 3.4.1, only effect was confusion; it still predominates.
     *
     * 3.6.0: this used to override pre-existing confusion duration
     * (cases 0..8) and pre-existing stun duration (cases 4..9);
     * increase them instead.   (Hero can no longer cast spells while
     * Stunned, so the potential increment to stun duration here is
     * just hypothetical.)
     */
    switch (C.rn2(10, 1194, 'spell_backfire')) {
    case 0:
    case 1:
    case 2:
    case 3:
        C.make_confused(old_conf + duration, 0); /* 40% */
        break;
    case 4:
    case 5:
    case 6:
        C.make_confused(old_conf + 2n * duration / 3n, 0); /* 30% */
        C.make_stunned(old_stun + duration / 3n, 0);
        break;
    case 7:
    case 8:
        C.make_stunned(old_stun + 2n * duration / 3n, 0); /* 20% */
        C.make_confused(old_conf + duration / 3n, 0);
        break;
    case 9:
        C.make_stunned(old_stun + duration, 0); /* 10% */
        break;
    }
    return;
}

export function spelleffects_check(spell, res, energy)
{
    spell = C.int(spell);
    let chance;
    let confused = (C.Confusion != 0);

    energy.value = 0;

    /*
     * Reject attempting to cast while stunned or with no free hands.
     * Already done in getspell() to stop casting before choosing
     * which spell, but duplicated here for cases where spelleffects()
     * gets called directly for ^T without intrinsic teleport capability
     * or #turn for non-priest/non-knight.
     * (There's no duplication of messages; when the rejection takes
     * place in getspell(), we don't get called.)
     */
    if ((spell == C.UNKNOWN_SPELL) || rejectcasting()) {
        res.value = C.ECMD_OK; /* no time elapses */
        return 1;
    }

    /*
     *  Note: dotele() also calculates energy use and checks nutrition
     *  and strength requirements; if any of these change, update it too.
     */
    energy.value = C.SPELL_LEV_PW(C.svs.spl_book[spell].sp_lev); /* 5 <= energy <= 35 */

    /*
     * Spell casting no longer affects knowledge of the spell. A
     * decrement of spell knowledge is done every turn.
     */
    if (C.svs.spl_book[spell].sp_know <= 0) {
        C.Your("knowledge of this spell is twisted.");
        C.pline("It invokes nightmarish images in your mind...");
        spell_backfire(spell);
        C.u.uen -= C.rnd(energy.value, 1255, 'spelleffects_check');
        if (C.u.uen < 0)
            C.u.uen = 0;
        C.disp.botl = 1;
        res.value = C.ECMD_TIME;
        return 1;
    } else if (C.svs.spl_book[spell].sp_know <= KEEN / 200) { /* 100 turns left */
        C.You("strain to recall the spell.");
    } else if (C.svs.spl_book[spell].sp_know <= KEEN / 40) { /* 500 turns left */
        C.You("have difficulty remembering the spell.");
    } else if (C.svs.spl_book[spell].sp_know <= KEEN / 20) { /* 1000 turns left */
        C.Your("knowledge of this spell is growing faint.");
    } else if (C.svs.spl_book[spell].sp_know <= KEEN / 10) { /* 2000 turns left */
        C.Your("recall of this spell is gradually fading.");
    }

    if (C.u.uhunger <= 10 && C.svs.spl_book[spell].sp_id != C.SPE_DETECT_FOOD) {
        C.You("are too hungry to cast that spell.");
        res.value = C.ECMD_OK;
        return 1;
    } else if (C.ACURR(C.A_STR) < 4 && C.svs.spl_book[spell].sp_id != C.SPE_RESTORE_ABILITY) {
        C.You("lack the strength to cast spells.");
        res.value = C.ECMD_OK;
        return 1;
    } else if (C.check_capacity(
                "Your concentration falters while carrying so much stuff.")) {
        res.value = C.ECMD_TIME;
        return 1;
    }

    /* if the cast attempt is already going to fail due to insufficient
       energy (ie, u.uen < energy), the Amulet's drain effect won't kick
       in and no turn will be consumed; however, when it does kick in,
       the attempt may fail due to lack of energy after the draining, in
       which case a turn will be used up in addition to the energy loss */
    if (C.u.uhave.amulet && C.u.uen >= energy.value) {
        C.You_feel("the amulet draining your energy away.");
        /* this used to be 'energy += rnd(2 * energy)' (without 'res'),
           so if amulet-induced cost was more than u.uen, nothing
           (except the "don't have enough energy" message) happened
           and player could just try again (and again and again...);
           now we drain some energy immediately, which has a
           side-effect of not increasing the hunger aspect of casting */
        C.u.uen -= C.rnd(2 * energy.value, 1298, 'spelleffects_check');
        if (C.u.uen < 0)
            C.u.uen = 0;
        C.disp.botl = 1;
        res.value = C.ECMD_TIME; /* time is used even if spell doesn't get cast */
    }

    if (energy.value > C.u.uen) {
        /*
         * Hero has insufficient energy/power to cast the spell.
         * Augment the message when current energy is at maximum.
         * "yet": mainly for level 1 characters who already know a spell
         * but don't start with enough energy to cast it.
         * "anymore": maximum energy was high enough at some point but
         * isn't now (lost energy when losing levels or polymorphing into
         * new person or had some stripped away by traps or monsters).
         */
        C.You("don't have enough energy to cast that spell%s.",
            (C.u.uen < C.u.uenmax) ? "" /* not at full energy => normal message */
            : (energy.value > C.u.uenpeak) ? " yet" /* haven't ever had enough */
              : " anymore"); /* once had enough but have lost some since */
        return 1;
    } else {
        if (C.svs.spl_book[spell].sp_id != C.SPE_DETECT_FOOD) {
            let hungr = energy.value * 2;

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
            let intell = C.acurr(C.A_INT);
            if (!C.Role_if(C.PM_WIZARD))
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
            if (hungr > C.u.uhunger - 3)
                hungr = C.u.uhunger - 3;
            C.morehungry(hungr);
        }
    }

    chance = percent_success(spell);
    if (confused || (C.rnd(100, 1372, 'spelleffects_check') > chance)) {
        C.You("fail to cast the spell correctly.");
        C.u.uen -= Math.trunc(energy.value / 2);
        C.disp.botl = 1;
        res.value = C.ECMD_TIME;
        return 1;
    }
    return 0;
}

/* hero casts a spell of type spell_otyp, eg. SPE_SLEEP.
   hero must know the spell (unless force is TRUE). */
export function spelleffects(spell_otyp, atme, force)
{
    spell_otyp = C.int(spell_otyp);atme = C.boolean(atme);force = C.boolean(force);
    let spell = force ? spell_otyp : spell_idx(spell_otyp);
    const energy = C.intLocal(0); let damage, n;
    let otyp, skill, role_skill; const res = C.intLocal(C.ECMD_OK);
    let physical_damage = 0;
    let pseudo;
    const cc = C.coordLocal();

    if (!force && spelleffects_check(spell, res, energy))
        return res.value;

    C.u.uen -= energy.value;
    C.disp.botl = 1;
    C.exercise(C.A_WIS, 1);
    /* pseudo is a temporary "false" object containing the spell stats */
    pseudo = C.mksobj(force ? spell : C.svs.spl_book[spell].sp_id, 0, 0);
    pseudo.blessed = pseudo.cursed = 0;
    pseudo.quan = 20n; /* do not let useup get it */
    /*
     * Find the skill the hero has in a spell type category.
     * See spell_skilltype for categories.
     */
    otyp = pseudo.otyp;
    skill = spell_skilltype(otyp);
    role_skill = C.P_SKILL(skill);

    switch (otyp) {
    /*
     * At first spells act as expected.  As the hero increases in skill
     * with the appropriate spell type, some spells increase in their
     * effects, e.g. more damage, further distance, and so on, without
     * additional cost to the spellcaster.
     */
    case C.SPE_FIREBALL:
    case C.SPE_CONE_OF_COLD:
        if (role_skill >= C.P_SKILLED) {
            if (C.callLocal(throwspell)) {
                cc.x = C.u.dx;
                cc.y = C.u.dy;
                n = C.rnd(8, 1425, 'spelleffects') + 1;
                while (n--) {
                    if (!C.u.dx && !C.u.dy && !C.u.dz) {
                        if ((damage = C.zapyourself(pseudo, 1)) != 0) {
                            const buf = C.stackAlloc(C.BUFSZ);
                            C.Sprintf(buf, "zapped %sself with a spell",
                                    C.uhim());
                            C.losehp(damage, buf, C.NO_KILLER_PREFIX);
                        }
                    } else {
                        C.explode(C.u.dx, C.u.dy,
                                otyp - C.SPE_MAGIC_MISSILE + 10,
                                C.spell_damage_bonus(Math.trunc(C.u.ulevel / 2) + 1), 0,
                                (otyp == C.SPE_CONE_OF_COLD)
                                   ? C.EXPL_FROSTY
                                   : C.EXPL_FIERY);
                    }
                    C.u.dx = cc.x + C.rnd(3, 1442, 'spelleffects') - 2;
                    C.u.dy = cc.y + C.rnd(3, 1443, 'spelleffects') - 2;
                    if (!C.isok(C.u.dx, C.u.dy) || !C.cansee(C.u.dx, C.u.dy)
                        || C.IS_STWALL(C.levl[C.u.dx][C.u.dy].typ) || C.u.uswallow) {
                        /* Spell is reflected back to center */
                        C.u.dx = cc.x;
                        C.u.dy = cc.y;
                    }
                }
            }
            break;
        } /* else */
        
        /*FALLTHRU*/

    /* these spells are all duplicates of wand effects */
    case C.SPE_FORCE_BOLT:
        physical_damage = 1;
        
    /*FALLTHRU*/
    case C.SPE_SLEEP:
    case C.SPE_MAGIC_MISSILE:
    case C.SPE_KNOCK:
    case C.SPE_SLOW_MONSTER:
    case C.SPE_WIZARD_LOCK:
    case C.SPE_DIG:
    case C.SPE_TURN_UNDEAD:
    case C.SPE_POLYMORPH:
    case C.SPE_TELEPORT_AWAY:
    case C.SPE_CANCELLATION:
    case C.SPE_FINGER_OF_DEATH:
    case C.SPE_LIGHT:
    case C.SPE_DETECT_UNSEEN:
    case C.SPE_HEALING:
    case C.SPE_EXTRA_HEALING:
    case C.SPE_DRAIN_LIFE:
    case C.SPE_STONE_TO_FLESH:
        if (C.objects[otyp].oc_dir != C.NODIR) {
            if (otyp == C.SPE_HEALING || otyp == C.SPE_EXTRA_HEALING) {
                /* healing and extra healing are actually potion effects,
                   but they've been extended to take a direction like wands */
                if (role_skill >= C.P_SKILLED)
                    pseudo.blessed = 1;
            }
            if (atme) {
                C.u.dx = C.u.dy = C.u.dz = 0;
            } else if (!C.getdir(0)) {
                /* getdir cancelled, re-use previous direction */
                /*
                 * FIXME:  reusing previous direction only makes sense
                 * if there is an actual previous direction.  When there
                 * isn't one, the spell gets cast at self which is rarely
                 * what the player intended.  Unfortunately, the way
                 * spelleffects() is organized means that aborting with
                 * "nevermind" is not an option.
                 */
                C.pline_The("magical energy is released!");
            }
            if (!C.u.dx && !C.u.dy && !C.u.dz) {
                if ((damage = C.zapyourself(pseudo, 1)) != 0) {
                    const buf = C.stackAlloc(C.BUFSZ);

                    C.Sprintf(buf, "zapped %sself with a spell", C.uhim());
                    if (physical_damage)
                        damage = (C.Half_physical_damage ? Math.trunc((damage + 1) / 2) : damage);
                    C.losehp(damage, buf, C.NO_KILLER_PREFIX);
                }
            } else
                C.weffects(pseudo);
        } else
            C.weffects(pseudo);
        C.update_inventory(); /* spell may modify inventory */
        break;

    /* these are all duplicates of scroll effects */
    case C.SPE_REMOVE_CURSE:
    case C.SPE_CONFUSE_MONSTER:
    case C.SPE_DETECT_FOOD:
    case C.SPE_CAUSE_FEAR:
    case C.SPE_IDENTIFY:
    case C.SPE_CHARM_MONSTER:
        /* high skill yields effect equivalent to blessed scroll */
        if (role_skill >= C.P_SKILLED)
            pseudo.blessed = 1;
        
    /*FALLTHRU*/
    case C.SPE_MAGIC_MAPPING:
    case C.SPE_CREATE_MONSTER:
        C.seffects(pseudo);
        break;

    /* these are all duplicates of potion effects */
    case C.SPE_HASTE_SELF:
    case C.SPE_DETECT_TREASURE:
    case C.SPE_DETECT_MONSTERS:
    case C.SPE_LEVITATION:
    case C.SPE_RESTORE_ABILITY:
        /* high skill yields effect equivalent to blessed potion */
        if (role_skill >= C.P_SKILLED)
            pseudo.blessed = 1;
        
    /*FALLTHRU*/
    case C.SPE_INVISIBILITY:
        C.peffects(pseudo);
        break;
    /* end of potion-like spells */

    case C.SPE_CURE_BLINDNESS:
        C.healup(0, 0, 0, 1);
        break;
    case C.SPE_CURE_SICKNESS: {
        let was_sick = !!C.Sick, was_slimed = !!C.Slimed;

        /* cure conditions (which updates status) before feedback */
        C.healup(0, 0, 1, 0);
        /*
         *  Sick + !Slimed -- You are no longer ill.
         * !Sick + !Slimed -- You are not ill.
         * !Sick +  Slimed -- The slime disappears.
         *  Sick +  Slimed -- You are no longer ill.  The slime disappears.
         */
        if (was_sick || !was_slimed)
            C.You("are %s ill.", was_sick ? "no longer" : "not");
        if (was_slimed)
            C.make_slimed(0n, "The slime disappears!");
        break;
    }
    case C.SPE_CREATE_FAMILIAR:
        C.make_familiar(0, C.u.ux, C.u.uy, 0);
        break;
    case C.SPE_CLAIRVOYANCE:
        if (!C.BClairvoyant) {
            if (role_skill >= C.P_SKILLED)
                pseudo.blessed = 1; /* detect monsters as well as map */
            C.do_vicinity_map(pseudo);
        /* at present, only one thing blocks clairvoyance */
        } else if (C.uarmh && C.uarmh.otyp == C.CORNUTHAUM)
            C.You("sense a pointy hat on top of your %s.", C.body_part(C.HEAD));
        break;
    case C.SPE_PROTECTION:
        C.callLocal(cast_protection);
        break;
    case C.SPE_JUMPING:
        if (!(C.jump(C.max(role_skill, 1)) & C.ECMD_TIME))
            C.pline1(C.nothing_happens);
        break;
    case C.SPE_CHAIN_LIGHTNING:
        C.callLocal(cast_chain_lightning);
        break;
    default:
        C.impossible("Unknown spell %d attempted.", spell);
        C.obfree(pseudo, 0);
        return C.ECMD_OK;
    }

    /* gain skill for successful cast */
    if (!force)
        C.use_skill(skill, C.svs.spl_book[spell].sp_lev);

    C.obfree(pseudo, 0); /* now, get rid of it */
    return C.ECMD_TIME;
}

/*ARGSUSED*/
export function spell_aim_step(arg, x, y)
{
    x = C.coordxy(x);y = C.coordxy(y);
    if (!C.isok(x,y))
        return 0;
    if (!C.ZAP_POS(C.levl[x][y].typ)
        && !(C.IS_DOOR(C.levl[x][y].typ) && (C.levl[x][y].doormask & C.D_ISOPEN)))
        return 0;
    return 1;
}

/* not quite the same as throwspell limits, but close enough */
export function can_center_spell_location(x, y)
{
    x = C.coordxy(x);y = C.coordxy(y);
    if (C.distmin(C.u.ux, C.u.uy, x, y) > 10)
        return 0;
    return (Number(Boolean(C.isok(x, y) && C.cansee(x, y) && !(C.IS_STWALL(C.levl[x][y].typ)))));
}

export function display_spell_target_positions(on_off)
{
    on_off = C.boolean(on_off);
    let x, y, dx, dy;
    let dist = 10;

    if (on_off) {
        /* on */
        C.tmp_at(C.DISP_BEAM, (C.S_goodpos - C.S_digbeam + C.GLYPH_CMAP_C_OFF));
        for (dx = -dist; dx <= dist; dx++)
            for (dy = -dist; dy <= dist; dy++) {
                x = C.u.ux + dx;
                y = C.u.uy + dy;
                /* hero's location is allowed but highlighting the hero's
                   spot makes map harder to read (if using '$' rather than
                   by changing background color) */
                if (C.u_at(x, y))
                    continue;
                if (can_center_spell_location(x, y))
                    C.tmp_at(x, y);
            }
    } else {
        /* off */
        C.tmp_at(C.DISP_END, 0);
    }
}

/* Choose location where spell takes effect. */
export function throwspell()
{
    const cc = C.coordLocal(), uc = C.coordLocal();
    let mtmp;

    if (C.u.uinwater) {
        C.pline("You're joking!  In this weather?");
        return 0;
    } else if (C.Is_waterlevel(C.u.uz)) {
        C.You("had better wait for the sun to come out.");
        return 0;
    }

    C.pline("Where do you want to cast the spell?");
    cc.x = C.u.ux;
    cc.y = C.u.uy;
    C.getpos_sethilite(display_spell_target_positions,
                     can_center_spell_location);
    if (C.getpos(cc, 1, "the desired position") < 0)
        return 0; /* user pressed ESC */
    C.clear_nhwindow(C.WIN_MESSAGE); /* discard any autodescribe feedback */

    /* The number of moves from hero to where the spell drops.*/
    if (C.distmin(C.u.ux, C.u.uy, cc.x, cc.y) > 10) {
        C.pline_The("spell dissipates over the distance!");
        return 0;
    } else if (C.u.uswallow) {
        C.pline_The("spell is cut short!");
        C.exercise(C.A_WIS, 0); /* What were you THINKING! */
        C.u.dx = 0;
        C.u.dy = 0;
        return 1;
    } else if (((cc.x != C.u.ux || cc.y != C.u.uy) && !C.cansee(cc.x, cc.y)
                && (!(mtmp = C.m_at(cc.x, cc.y)) || !C.canspotmon(mtmp)))
               || C.IS_STWALL(C.levl[cc.x][cc.y].typ)) {
        C.Your("mind fails to lock onto that location!");
        return 0;
    }

    uc.x = C.u.ux;
    uc.y = C.u.uy;

    C.walk_path(uc, cc, spell_aim_step, 0);

    C.u.dx = cc.x;
    C.u.dy = cc.y;
    return 1;
}

/* add/hide/remove/unhide teleport-away on behalf of dotelecmd() to give
   more control to behavior of ^T when used in wizard mode */
export function tport_spell(what)
{
    what = C.int(what);
    const save_tport = C.spellState.save_tport;
    let i;
/* also defined in teleport.c */
const NOOP_SPELL = 0;
const HIDE_SPELL = 1;
const ADD_SPELL = 2;
const UNHIDESPELL = 3;
const REMOVESPELL = 4;

    for (i = 0; i < C.MAXSPELL; i++)
        if (C.svs.spl_book[i].sp_id == C.SPE_TELEPORT_AWAY || C.svs.spl_book[i].sp_id == C.NO_SPELL)
            break;
    if (i == C.MAXSPELL) {
        C.impossible("tport_spell: spellbook full");
        /* wizard mode ^T is not able to honor player's menu choice */
    } else if (C.svs.spl_book[i].sp_id == C.NO_SPELL) {
        if (what == HIDE_SPELL || what == REMOVESPELL) {
            save_tport.tport_indx = C.MAXSPELL;
        } else if (what == UNHIDESPELL) {
            /*assert( save_tport.savespell.sp_id == SPE_TELEPORT_AWAY );*/
            C.svs.spl_book[save_tport.tport_indx] = save_tport.savespell;
            save_tport.tport_indx = C.MAXSPELL; /* burn bridge... */
        } else if (what == ADD_SPELL) {
            C.copySpell(save_tport.savespell, C.svs.spl_book[i]);
            save_tport.tport_indx = i;
            C.svs.spl_book[i].sp_id = C.SPE_TELEPORT_AWAY;
            C.svs.spl_book[i].sp_lev = C.objects[C.SPE_TELEPORT_AWAY].oc_level;
            C.svs.spl_book[i].sp_know = KEEN;
            return REMOVESPELL; /* operation needed to reverse */
        }
    } else { /* spellid(i) == SPE_TELEPORT_AWAY */
        if (what == ADD_SPELL || what == UNHIDESPELL) {
            save_tport.tport_indx = C.MAXSPELL;
        } else if (what == REMOVESPELL) {
            /*assert( i == save_tport.tport_indx );*/
            C.svs.spl_book[i] = save_tport.savespell;
            save_tport.tport_indx = C.MAXSPELL;
        } else if (what == HIDE_SPELL) {
            C.copySpell(save_tport.savespell, C.svs.spl_book[i]);
            save_tport.tport_indx = i;
            C.svs.spl_book[i].sp_id = C.NO_SPELL;
            return UNHIDESPELL; /* operation needed to reverse */
        }
    }
    return NOOP_SPELL;
}

/* forget a random selection of known spells due to amnesia;
   they used to be lost entirely, as if never learned, but now we
   just set the memory retention to zero so that they can't be cast */
export function losespells()
{
    let n, nzap, i;

    /* in case reading has been interrupted earlier, discard context */
    C.svc.context.spbook.book = 0;
    C.svc.context.spbook.o_id = 0;
    /* count the number of known spells */
    for (n = 0; n < C.MAXSPELL; ++n)
        if (C.svs.spl_book[n].sp_id == C.NO_SPELL)
            break;

    /* lose anywhere from zero to all known spells;
       if confused, use the worse of two die rolls */
    nzap = C.rn2(n + 1, 1777, 'losespells');
    if (C.Confusion) {
        i = C.rn2(n + 1, 1779, 'losespells');
        if (i > nzap)
            nzap = i;
    }
    /* good Luck might ameliorate spell loss */
    if (nzap > 1 && !C.rnl(7, 1784, 'losespells'))
        nzap = C.rnd(nzap, 1785, 'losespells');

    /*
     * Forget 'nzap' out of 'n' known spells by setting their memory
     * retention to zero.  Every spell has the same probability to be
     * forgotten, even if its retention is already zero.
     *
     * Perhaps we should forget the corresponding book too?
     *
     * (3.4.3 removed spells entirely from the list, but always did
     * so from its end, so the 'nzap' most recently learned spells
     * were the ones lost by default.  Player had sort control over
     * the list, so could move the most useful spells to front and
     * only lose them if 'nzap' turned out to be a large value.
     *
     * Discarding from the end of the list had the virtue of making
     * casting letters for lost spells become invalid and retaining
     * the original letter for the ones which weren't lost, so there
     * was no risk to the player of accidentally casting the wrong
     * spell when using a letter that was in use prior to amnesia.
     * That wouldn't be the case if we implemented spell loss spread
     * throughout the list of known spells; every spell located past
     * the first lost spell would end up with new letter assigned.)
     */
    for (i = 0; nzap > 0; ++i) {
        /* when nzap is small relative to the number of spells left,
           the chance to lose spell [i] is small; as the number of
           remaining candidates shrinks, the chance per candidate
           gets bigger; overall, exactly nzap entries are affected */
        if (C.rn2(n - i, 1814, 'losespells') < nzap) {
            /* lose access to spell [i] */
            C.svs.spl_book[i].sp_know = 0;
// #if 0
//             /* also forget its book */
//             forget_single_object(svs.spl_book[i].sp_id);
// #endif
            /* and abuse wisdom */
            C.exercise(C.A_WIS, 0);
            /* there's now one less spell slated to be forgotten */
            --nzap;
        }
    }
}

/*
 * Allow player to sort the list of known spells.  Manually swapping
 * pairs of them becomes very tedious once the list reaches two pages.
 *
 * Possible extensions:
 *      provide means for player to control ordering of skill classes;
 *      provide means to supply value N such that first N entries stick
 *      while rest of list is being sorted;
 *      make chosen sort order be persistent such that when new spells
 *      are learned, they get inserted into sorted order rather than be
 *      appended to the end of the list?
 */
const SORTBY_LETTER = 0;
const SORTBY_ALPHA = 1;
const SORTBY_LVL_LO = 2;
const SORTBY_LVL_HI = 3;
const SORTBY_SKL_AL = 4;
const SORTBY_SKL_LO = 5;
const SORTBY_SKL_HI = 6;
const SORTBY_CURRENT = 7;
const SORTRETAINORDER = 8;
const NUM_SPELL_SORTBY = 9;

export const spl_sortchoices = [
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

/* qsort callback routine */
export function spell_cmp(vptr1, vptr2)
{
    /*
     * gather up all of the possible parameters except spell name
     * in advance, even though some might not be needed:
     *  indx. = spl_orderindx[] index into svs.spl_book[];
     *  otyp. = svs.spl_book[] index into objects[];
     *  levl. = spell level;
     *  skil. = skill group aka spell class.
     */
    let indx1 = C.loadInt(vptr1), indx2 = C.loadInt(vptr2),
        otyp1 = C.svs.spl_book[indx1].sp_id, otyp2 = C.svs.spl_book[indx2].sp_id,
        levl1 = C.objects[otyp1].oc_level, levl2 = C.objects[otyp2].oc_level,
        skil1 = C.objects[otyp1].oc_skill, skil2 = C.objects[otyp2].oc_skill;

    switch (C.gs.spl_sortmode) {
    case SORTBY_LETTER:
        return indx1 - indx2;
    case SORTBY_ALPHA:
        break;
    case SORTBY_LVL_LO:
        if (levl1 != levl2)
            return levl1 - levl2;
        break;
    case SORTBY_LVL_HI:
        if (levl1 != levl2)
            return levl2 - levl1;
        break;
    case SORTBY_SKL_AL:
        if (skil1 != skil2)
            return skil1 - skil2;
        break;
    case SORTBY_SKL_LO:
        if (skil1 != skil2)
            return skil1 - skil2;
        if (levl1 != levl2)
            return levl1 - levl2;
        break;
    case SORTBY_SKL_HI:
        if (skil1 != skil2)
            return skil1 - skil2;
        if (levl1 != levl2)
            return levl2 - levl1;
        break;
    case SORTBY_CURRENT:
    default:
        return (C.ptrLess(vptr1, vptr2)) ? -1
                               : (C.ptrLess(vptr2, vptr1)); /* keep current order */
    }
    /* tie-breaker for most sorts--alphabetical by spell name */
    return C.strcmpi(C.OBJ_NAME(C.objects[otyp1]), C.OBJ_NAME(C.objects[otyp2]));
}

/* sort the index used for display order of the "view known spells"
   list (sortmode == SORTBY_xxx), or sort the spellbook itself to make
   the current display order stick (sortmode == SORTRETAINORDER) */
export function sortspells()
{
    let i;
    let n;


    if (C.gs.spl_sortmode == SORTBY_CURRENT)
        return;
    for (n = 0; n < C.MAXSPELL && C.svs.spl_book[n].sp_id != C.NO_SPELL; ++n)
        continue;
    if (n < 2)
        return; /* not enough entries to need sorting */

    if (!C.gs.spl_orderindx) {
        /* we haven't done any sorting yet; list is in casting order */
        if (C.gs.spl_sortmode == SORTBY_LETTER /* default */
            || C.gs.spl_sortmode == SORTRETAINORDER)
            return;
        /* allocate enough for full spellbook rather than just N spells */
        C.gs.spl_orderindx = C.alloc(C.MAXSPELL * C.intSize);
        for (i = 0; i < C.MAXSPELL; i++)
            C.gs.spl_orderindx[i] = i;
    }

    if (C.gs.spl_sortmode == SORTRETAINORDER) {
        const tmp_book = C.spellArrayLocal(C.MAXSPELL);

        /* sort svs.spl_book[] rather than spl_orderindx[];
           this also updates the index to reflect the new ordering (we
           could just free it since that ordering becomes the default) */
        for (i = 0; i < C.MAXSPELL; i++)
            tmp_book[i] = C.svs.spl_book[C.gs.spl_orderindx[i]];
        for (i = 0; i < C.MAXSPELL; i++)
            C.svs.spl_book[i] = tmp_book[i], C.gs.spl_orderindx[i] = i;
        C.gs.spl_sortmode = SORTBY_LETTER; /* reset */
        return;
    }

    /* usual case, sort the index rather than the spells themselves */
    C.qsort(C.gs.spl_orderindx, n,
          C.intSize, spell_cmp);
    return;
}

/* called if the [sort spells] entry in the view spells menu gets chosen */
export function spellsortmenu()
{
    let tmpwin;
    const selected = C.menuPointerLocal();
    const any = C.anyLocal();
    let let_;
    let i, n, choice;
    let clr = C.NO_COLOR;

    tmpwin = C.create_nhwindow(C.NHW_MENU);
    C.start_menu(tmpwin, C.MENU_BEHAVE_STANDARD);
    C.copyAnything(any, C.cg.zeroany); /* zero out all bits */

    for (i = 0; i < spl_sortchoices.length; i++) {
        if (i == SORTRETAINORDER) {
            let_ = 122; /* assumes fewer than 26 sort choices... */
            /* separate final choice from others with a blank line */
            C.add_menu_str(tmpwin, "");
        } else {
            let_ = 97 + i;
        }
        any.a_int = i + 1;
        C.add_menu(tmpwin, C.nul_glyphinfo, any, let_, 0,
                 C.ATR_NONE, clr, spl_sortchoices[i],
                 (i == C.gs.spl_sortmode) ? C.MENU_ITEMFLAGS_SELECTED
                                        : C.MENU_ITEMFLAGS_NONE);
    }
    C.end_menu(tmpwin, "View known spells list sorted");

    n = C.select_menu(tmpwin, C.PICK_ONE, selected);
    C.destroy_nhwindow(tmpwin);
    if (n > 0) {
        choice = selected.value[0].item.a_int - 1;
        /* skip preselected entry if we have more than one item chosen */
        if (n > 1 && choice == C.gs.spl_sortmode)
            choice = selected.value[1].item.a_int - 1;
        C.free(selected.value);
        C.gs.spl_sortmode = choice;
        return 1;
    }
    return 0;
}

/* the #showspells command -- view known spells */
export function dovspell()
{
    const qbuf = C.stackAlloc(C.QBUFSZ);
    const splnum = C.intLocal(), othnum = C.intLocal();
    const spl_tmp = C.spellLocal();

    if (C.svs.spl_book[0].sp_id == C.NO_SPELL) {
        C.You("don't know any spells right now.");
    } else {
        while (C.callLocal(dospellmenu, "Currently known spells",
                           SPELLMENU_VIEW, splnum)) {
            if (splnum.value == C.MAXSPELL) {
                if (C.callLocal(spellsortmenu))
                    C.callLocal(sortspells);
            } else {
                C.Sprintf(qbuf, "Reordering spells; swap '%c' with",
                        C.char((splnum.value < 26) ? (97 + splnum.value) : (65 + splnum.value - 26)));
                if (!C.callLocal(dospellmenu, qbuf, splnum.value, othnum))
                    break;

                C.copySpell(spl_tmp, C.svs.spl_book[splnum.value]);
                C.svs.spl_book[splnum.value] = C.svs.spl_book[othnum.value];
                C.svs.spl_book[othnum.value] = spl_tmp;
            }
        }
    }
    if (C.gs.spl_orderindx) {
        C.free(C.gs.spl_orderindx);
        C.gs.spl_orderindx = 0;
    }
    C.gs.spl_sortmode = SORTBY_LETTER; /* 0 */
    return C.ECMD_OK;
}



/* lists spells for endgame dumplog purposes */
export function show_spells()
{
    const unused = C.intLocal(SPELLMENU_DUMP);
    if (C.svs.spl_book[0].sp_id == C.NO_SPELL) {
        C.pline("You didn't know any spells.");
        C.pline("%s", "");
    } else {
        C.pline("Spells:");
        C.nhUse(C.callLocal(dospellmenu, "", SPELLMENU_DUMP, unused));
    }
}

/* shows menu of known spells, with options to sort them.
   return FALSE on cancel, TRUE otherwise.
   spell_no is set to the internal spl_book index, if any selected */
export function dospellmenu(prompt, splaction, spell_no) /* SPELLMENU_CAST, SPELLMENU_VIEW, SPELLMENU_DUMP or
                    * svs.spl_book[] index */
{
    splaction = C.int(splaction);
    let tmpwin;
    let i, n, how, splnum;
    const buf = C.stackAlloc(C.BUFSZ), retentionbuf = C.stackAlloc(24); let sep;
    let fmt;
    const selected = C.menuPointerLocal();
    const any = C.anyLocal();
    let clr = C.NO_COLOR;

    tmpwin = C.create_nhwindow(C.NHW_MENU);
    C.start_menu(tmpwin, C.MENU_BEHAVE_STANDARD);
    C.copyAnything(any, C.cg.zeroany); /* zero out all bits */

    /*
     * The correct spacing of the columns when not using
     * tab separation depends on the following:
     * (1) that the font is monospaced, and
     * (2) that selection letters are prepended to the
     *     given string and are of the form "a - ".
     * For SPELLMENU_DUMP, (2) is untrue, so four spaces
     * need to be subtracted.
     */
    if (!C.iflags.menu_tab_sep) {
        C.Sprintf(buf, "%s%-20s Level %-12s Fail Retention",
                splaction == SPELLMENU_DUMP ? "" : "    ",
                "Name",
                "Category");
        fmt = "%-20s  %2d   %-12s %3d%% %9s";
        sep = 32;
    } else {
        C.Sprintf(buf, "Name\tLevel\tCategory\tFail\tRetention");
        fmt = "%s\t%-d\t%s\t%-d%%\t%s";
        sep = 9;
    }
    if (C.wizard)
        C.Sprintf(C.eos(buf), "%c%6s", sep, "turns");

    C.add_menu_heading(tmpwin, buf);
    for (i = 0; i < C.MAXSPELL && C.svs.spl_book[i].sp_id != C.NO_SPELL; i++) {
        splnum = !C.gs.spl_orderindx ? i : C.gs.spl_orderindx[i];
        C.Sprintf(buf, fmt, C.OBJ_NAME(C.objects[C.svs.spl_book[splnum].sp_id]), C.svs.spl_book[splnum].sp_lev,
                spelltypemnemonic(spell_skilltype(C.svs.spl_book[splnum].sp_id)),
                100 - percent_success(splnum),
                C.callLocal(spellretention, splnum, retentionbuf));
        if (C.wizard)
            C.Sprintf(C.eos(buf), "%c%6d", sep, C.svs.spl_book[i].sp_know);

        any.a_int = splnum + 1; /* must be non-zero */
        C.add_menu(tmpwin, C.nul_glyphinfo, any, C.char((splnum < 26) ? (97 + splnum) : (65 + splnum - 26)), 0,
                 C.ATR_NONE, clr, buf,
                 (splnum == splaction)
                    ? C.MENU_ITEMFLAGS_SELECTED : C.MENU_ITEMFLAGS_NONE);
    }
    how = C.PICK_ONE;
    if (splaction == SPELLMENU_VIEW) {
        if (C.svs.spl_book[1].sp_id == C.NO_SPELL) {
            /* only one spell => nothing to swap with */
            how = C.PICK_NONE;
        } else {
            /* more than 1 spell, add an extra menu entry */
            any.a_int = C.MAXSPELL + 1;
            C.add_menu(tmpwin, C.nul_glyphinfo, any, 43, 0,
                     C.ATR_NONE, clr, "[sort spells]", C.MENU_ITEMFLAGS_NONE);
        }
    }
    C.end_menu(tmpwin, prompt);

    n = C.select_menu(tmpwin, how, selected);
    C.destroy_nhwindow(tmpwin);
    if (n > 0) {
        spell_no.value = selected.value[0].item.a_int - 1;
        /* menu selection for `PICK_ONE' does not
           de-select any preselected entry */
        if (n > 1 && spell_no.value == splaction)
            spell_no.value = selected.value[1].item.a_int - 1;
        C.free(selected.value);
        /* default selection of preselected spell means that
           user chose not to swap it with anything */
        if (spell_no.value == splaction)
            return 0;
        return 1;
    } else if (splaction >= 0) {
        /* explicit de-selection of preselected spell means that
           user is still swapping but not for the current spell */
        spell_no.value = splaction;
        return 1;
    }
    return 0;
}



export function percent_success(spell)
{
    spell = C.int(spell);
    /* Intrinsic and learned ability are combined to calculate
     * the probability of player's success at casting a given spell.
     */
    let chance, splcaster, special, statused;
    let difficulty;
    let skill, skilltype = spell_skilltype(C.svs.spl_book[spell].sp_id);
    /* Knights don't get metal armor penalty for clerical spells */
    let paladin_bonus = (Number(Boolean(C.Role_if(C.PM_KNIGHT)
                             && skilltype == C.P_CLERIC_SPELL)));

    /* Calculate intrinsic ability (splcaster) */

    splcaster = C.gu.urole.spelbase;
    special = C.gu.urole.spelheal;
    statused = C.ACURR(C.gu.urole.spelstat);

    if (C.uarm && C.is_metallic(C.uarm) && !paladin_bonus)
        splcaster += (C.uarmc && C.uarmc.otyp == C.ROBE) ? Math.trunc(C.gu.urole.spelarmr / 2)
                                                    : C.gu.urole.spelarmr;
    else if (C.uarmc && C.uarmc.otyp == C.ROBE)
        splcaster -= C.gu.urole.spelarmr;
    if (C.uarms)
        splcaster += C.gu.urole.spelshld;

    if (C.uwep && C.uwep.otyp == C.QUARTERSTAFF)
        splcaster -= 3; /* Small bonus */

    if (!paladin_bonus) {
        if (C.uarmh && C.is_metallic(C.uarmh)) /* && otyp != HELM_OF_BRILLIANCE */
            splcaster += uarmhbon;
        if (C.uarmg && C.is_metallic(C.uarmg))
            splcaster += uarmgbon;
        if (C.uarmf && C.is_metallic(C.uarmf))
            splcaster += uarmfbon;
    }

    if (C.svs.spl_book[spell].sp_id == C.gu.urole.spelspec)
        splcaster += C.gu.urole.spelsbon;

    /* `healing spell' bonus */
    if (C.svs.spl_book[spell].sp_id == C.SPE_HEALING || C.svs.spl_book[spell].sp_id == C.SPE_EXTRA_HEALING
        || C.svs.spl_book[spell].sp_id == C.SPE_CURE_BLINDNESS
        || C.svs.spl_book[spell].sp_id == C.SPE_CURE_SICKNESS
        || C.svs.spl_book[spell].sp_id == C.SPE_RESTORE_ABILITY
        || C.svs.spl_book[spell].sp_id == C.SPE_REMOVE_CURSE)
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
    skill = C.P_SKILL(skilltype);
    skill = C.max(skill, C.P_UNSKILLED) - 1; /* unskilled => 0 */
    difficulty =
        (C.svs.spl_book[spell].sp_lev - 1) * 4 - ((skill * 6) + (Math.trunc(C.u.ulevel / 3)) + 1);

    if (difficulty > 0) {
        /* Player is too low level or unskilled. */
        chance -= C.isqrt(900 * difficulty + 2000);
    } else {
        /* Player is above level.  Learning continues, but the
         * law of diminishing returns sets in quickly for
         * low-level spells.  That is, a player quickly gains
         * no advantage for raising level.
         */
        let learning = Math.trunc(15 * -difficulty / C.svs.spl_book[spell].sp_lev);
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
    if (C.uarms && C.weight(C.uarms) > C.int(C.objects[C.SMALL_SHIELD].oc_weight)) {
        if (C.svs.spl_book[spell].sp_id == C.gu.urole.spelspec) {
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

export function spellretention(idx, outbuf)
{
    idx = C.int(idx);
    let turnsleft, percent, accuracy;
    let skill;

    skill = C.P_SKILL(spell_skilltype(C.svs.spl_book[idx].sp_id));
    skill = C.max(skill, C.P_UNSKILLED); /* restricted same as unskilled */
    turnsleft = C.long(C.svs.spl_book[idx].sp_know);
    C.storeChar(outbuf, 0); /* lint suppression */

    if (turnsleft < 1n) {
        /* spell has expired; hero can't successfully cast it anymore */
        C.Strcpy(outbuf, "(gone)");
    } else if (turnsleft >= C.long(KEEN)) {
        /* full retention, first turn or immediately after reading book */
        C.Strcpy(outbuf, "100%");
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
        percent = (turnsleft - 1n) / (C.long(KEEN) / 100n) + 1n;
        accuracy = (skill == C.P_EXPERT) ? 2n
                   : (skill == C.P_SKILLED) ? 5n
                     : (skill == C.P_BASIC) ? 10n
                       : 25n;
        /* round up to the high end of this range */
        percent = accuracy * ((percent - 1n) / accuracy + 1n);
        C.Sprintf(outbuf, "%ld%%-%ld%%", percent - accuracy + 1n, percent);
    }
    return outbuf;
}

/* Learn a spell during creation of the initial inventory */
export function initialspell(obj)
{
    let i, otyp = obj.otyp;

    for (i = 0; i < C.MAXSPELL; i++)
        if (C.svs.spl_book[i].sp_id == C.NO_SPELL || C.svs.spl_book[i].sp_id == otyp)
            break;

    if (i == C.MAXSPELL) {
        C.impossible("Too many spells memorized!");
    } else if (C.svs.spl_book[i].sp_id != C.NO_SPELL) {
        /* initial inventory shouldn't contain duplicate spellbooks */
        C.impossible("Spell %s already known.", C.OBJ_NAME(C.objects[otyp]));
    } else {
        C.svs.spl_book[i].sp_id = otyp;
        C.svs.spl_book[i].sp_lev = C.objects[otyp].oc_level;
        (C.svs.spl_book[i].sp_know = KEEN + (0));
    }
    return;
}

/* returns one of spe_Unknown, spe_Fresh, spe_GoingStale, spe_Forgotten */
export function known_spell(otyp)
{
    otyp = C.short(otyp);
    let i, k;

    for (i = 0; (i < C.MAXSPELL) && (C.svs.spl_book[i].sp_id != C.NO_SPELL); i++)
        if (C.svs.spl_book[i].sp_id == otyp) {
            k = C.svs.spl_book[i].sp_know;
            return (k > KEEN / 10) ? C.spe_Fresh
                   : (k > 0) ? C.spe_GoingStale
                     : C.spe_Forgotten;
        }
    return C.spe_Unknown;
}

/* return index for spell otyp, or UNKNOWN_SPELL if not found */
export function spell_idx(otyp)
{
    otyp = C.short(otyp);
    let i;

    for (i = 0; (i < C.MAXSPELL) && (C.svs.spl_book[i].sp_id != C.NO_SPELL); i++)
        if (C.svs.spl_book[i].sp_id == otyp)
            return i;
    return C.UNKNOWN_SPELL;
}

/* learn or refresh spell otyp, if feasible; return casting letter or '\0' */
export function force_learn_spell(otyp)
{
    otyp = C.short(otyp);
    let i;

    if (otyp == C.SPE_BLANK_PAPER || otyp == C.SPE_BOOK_OF_THE_DEAD
        || known_spell(otyp) == C.spe_Fresh)
        return 0;

    for (i = 0; i < C.MAXSPELL; i++)
        if (C.svs.spl_book[i].sp_id == C.NO_SPELL || C.svs.spl_book[i].sp_id == otyp)
            break;
    if (i == C.MAXSPELL) {
        C.impossible("Too many spells memorized");
        return 0;
    }
    /* for a going-stale or forgotten spell the sp_id and sp_lev assignments
       are redundant but harmless; for an unknown spell, they're essential */
    C.svs.spl_book[i].sp_id = otyp;
    C.svs.spl_book[i].sp_lev = C.objects[otyp].oc_level;
    (C.svs.spl_book[i].sp_know = KEEN + (0)); /* set spl_book[i].sp_know to KEEN; unlike when learning
                      * a spell by reading its book, we don't need to add 1 */
    return C.char((i < 26) ? (97 + i) : (65 + i - 26));
}

/* number of spells hero knows */
export function num_spells()
{
    let i;

    for (i = 0; i < C.MAXSPELL; i++)
        if (C.svs.spl_book[i].sp_id == C.NO_SPELL)
            break;
    return i;
}

/*spell.c*/
