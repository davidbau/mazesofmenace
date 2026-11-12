/* NetHack 5.0	insight.c	$NHDT-Date: 1777004419 2026/04/23 20:20:19 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.134 $ */
/* Copyright (c) Stichting Mathematisch Centrum, Amsterdam, 1985. */
/* NetHack may be freely redistributed.  See license for details. */

/*
 * Enlightenment and Conduct+Achievements and Vanquished+Extinct+Geno'd
 * and stethoscope/probing feedback.
 *
 * Most code used to reside in cmd.c, presumably because ^X was originally
 * a wizard mode command and the majority of those are in that file.
 * Some came from end.c where it is used during end of game disclosure.
 * And some came from priest.c that had once been in pline.c.
 */

import { C } from '../c-runtime/context.js';


  /* hunger status from eat.c */
 /* encumbrance status from botl.c */

export const You_ = "You ", are = "are ", were = "were ",
                  have = "have ", had = "had ", can = "can ",
                  could = "could ";
export const have_been = "have been ", have_never = "have never ",
                  never = "never ";

/* for livelogging: */

/* ordered per 'enum achievements' in you.h */
/* take care to keep them in sync! */
export const achieve_msg = [
    {llflag: [], msg: ""}, /* actual achievements are numbered from 1 */
    {llflag: ["LL_ACHIEVE"], msg: "acquired the Bell of Opening"},
    {llflag: ["LL_ACHIEVE"], msg: "entered Gehennom"},
    {llflag: ["LL_ACHIEVE"], msg: "acquired the Candelabrum of Invocation"},
    {llflag: ["LL_ACHIEVE"], msg: "acquired the Book of the Dead"},
    {llflag: ["LL_ACHIEVE"], msg: "performed the invocation"},
    {llflag: ["LL_ACHIEVE"], msg: "acquired The Amulet of Yendor"},
    {llflag: ["LL_ACHIEVE"], msg: "entered the Elemental Planes"},
    {llflag: ["LL_ACHIEVE"], msg: "entered the Astral Plane"},
    {llflag: ["LL_ACHIEVE"], msg: "ascended"},
    /* if the type of item isn't discovered yet, disclosing the event
       via #chronicle would be a spoiler (particularly for gray stone);
       the ID'd name for the type of item will be appended to the next
       two messages, for display via livelog and/or dumplog */
    {llflag: ["LL_ACHIEVE", "LL_SPOILER"], msg: "acquired the Mines' End"}, /* " luckstone" */
    {llflag: ["LL_ACHIEVE", "LL_SPOILER"], msg: "acquired the Sokoban"}, /* " <item>" */
    {llflag: ["LL_ACHIEVE", "LL_UMONST"], msg: "killed Medusa"},
     /* these two are not logged */
    {llflag: [], msg: "hero was always blond, no, blind"},
    {llflag: [], msg: "hero never wore armor"},
     /* */
    {llflag: ["LL_MINORAC", "LL_DUMP"], msg: "entered the Gnomish Mines"},
    {llflag: ["LL_ACHIEVE"], msg: "reached Mine Town"}, /* probably minor, but dnh logs it */
    {llflag: ["LL_MINORAC"], msg: "entered a shop"},
    {llflag: ["LL_MINORAC"], msg: "entered a temple"},
    {llflag: ["LL_ACHIEVE"], msg: "consulted the Oracle"}, /* minor, but rare enough */
    {llflag: ["LL_MINORAC", "LL_DUMP"], msg: "read a Discworld novel"}, /* even more so */
    {llflag: ["LL_ACHIEVE"], msg: "entered Sokoban"}, /* keep as major for turn comparison
                                        * with completed sokoban */
    {llflag: ["LL_ACHIEVE"], msg: "entered the Bigroom"},
    /* The following 8 are for advancing through the ranks
       and messages differ by role so are created on the fly;
       rank 0 (Xp 1 and 2) isn't an achievement */
    {llflag: ["LL_MINORAC", "LL_DUMP"], msg: ""}, /* Xp 3 */
    {llflag: ["LL_MINORAC", "LL_DUMP"], msg: ""}, /* Xp 6 */
    {llflag: ["LL_MINORAC", "LL_DUMP"], msg: ""}, /* Xp 10 */
    {llflag: ["LL_ACHIEVE"], msg: ""}, /* Xp 14, so able to attempt the quest */
    {llflag: ["LL_ACHIEVE"], msg: ""}, /* Xp 18 */
    {llflag: ["LL_ACHIEVE"], msg: ""}, /* Xp 22 */
    {llflag: ["LL_ACHIEVE"], msg: ""}, /* Xp 26 */
    {llflag: ["LL_ACHIEVE"], msg: ""}, /* Xp 30 */
    {llflag: ["LL_MINORAC"], msg: "learned castle drawbridge's tune"}, /* achievement #31 */
    {llflag: [], msg: ""} /* keep this one at the end */
];

/* macros to simplify output of enlightenment messages; also used by
   conduct and achievements */
// Source output convenience macros expand inline at their original uses.


export function enlght_out(buf)
{
    if (C.ge.en_via_menu) {
        C.add_menu_str(C.ge.en_win, buf);
    } else
        C.putstr(C.ge.en_win, 0, buf);
}

export function enlght_line(start, middle, end, ps)
{
// #ifndef NO_ENLGHT_CONTRACTIONS
    const contra = [

        {twowords: " are not ", contrctn: " aren't "},
        {twowords: " were not ", contrctn: " weren't "},
        {twowords: " have not ", contrctn: " haven't "},
        {twowords: " had not ", contrctn: " hadn't "},
        {twowords: " can not ", contrctn: " can't "},
        {twowords: " could not ", contrctn: " couldn't "},
    ];
    let i;
// #endif
    const buf = C.stackAlloc(C.BUFSZ);

    C.Sprintf(buf, " %s%s%s%s.", start, middle, end, ps);
// #ifndef NO_ENLGHT_CONTRACTIONS
    if (C.strstri(buf, " not ")) { /* TODO: switch to libc strstr() */
        for (i = C.int(0); i < contra.length; ++i)
            C.strsubst(buf, contra[i].twowords, contra[i].contrctn);
    }
// #endif
    C.callLocal(enlght_out, buf);
}

/* format increased chance to hit or damage or defense (Protection) */
export function enlght_combatinc(inctyp, incamt, final, outbuf) /* "to hit" or "damage" or "defense" */ /* amount of increment (negative if decrement) */ /* ENL_{GAMEINPROGRESS,GAMEOVERALIVE,GAMEOVERDEAD} */
{
    incamt=C.int(incamt);final=C.int(final);
    let modif, bonus;
    let invrt;
    let absamt;

    absamt = C.int(C.abs(incamt));
    /* Protection amount is typically larger than damage or to-hit;
       reduce magnitude by a third in order to stretch modifier ranges
       (small:1..5, moderate:6..10, large:11..19, huge:20+) */
    if (!C.strcmp(inctyp, "defense"))
        absamt = C.int((absamt * 2) / 3);

    if (absamt <= 3)
        modif = "small";
    else if (absamt <= 6)
        modif = "moderate";
    else if (absamt <= 12)
        modif = "large";
    else
        modif = "huge";

    modif = !incamt ? "no" : C.an(modif); /* ("no" case shouldn't happen) */
    bonus = (incamt >= 0) ? "bonus" : "penalty";
    /* "bonus <foo>" (to hit) vs "<bar> bonus" (damage, defense) */
    invrt = C.schar(C.strcmp(inctyp, "to hit") ? 1 : 0);

    C.Sprintf(outbuf, "%s %s %s", modif, invrt ? inctyp : bonus,
            invrt ? bonus : inctyp);
    if (final || C.wizard)
        C.Sprintf(C.eos(outbuf), " (%s%d)", (incamt > 0) ? "+" : "", incamt);

    return outbuf;
}

/* report half physical or half spell damage */
export function enlght_halfdmg(category, final)
{
    category=C.int(category);final=C.int(final);
    let category_name;
    const buf = C.stackAlloc(C.BUFSZ);

    switch (category) {
    case C.HALF_PHDAM:
        category_name = "physical";
        break;
    case C.HALF_SPDAM:
        category_name = "spell";
        break;
    default:
        category_name = "unknown";
        break;
    }
    C.Sprintf(buf, " %s %s damage", (final || C.wizard) ? "half" : "reduced",
            category_name);
    C.callLocal(enlght_line, You_, final ? "took" : "take", buf, C.from_what(category));
}

/* is hero actively using water walking capability on water (or lava)? */
export function walking_on_water()
{
    if (C.u.uinwater || C.Levitation || C.Flying)
        return 0;
    return C.boolean((Number(Boolean(C.Wwalking && C.is_pool_or_lava(C.u.ux, C.u.uy)))));
}

/* describe u.utraptype; used by status_enlightenment() and self_lookat() */
export function trap_predicament(outbuf, final, wizxtra)
{
    final=C.int(final);wizxtra=C.schar(wizxtra);
    let t;

    /* caller has verified u.utrap */
    C.storeChar(outbuf, 0);
    switch (C.u.utraptype) {
    case C.TT_BURIEDBALL:
        C.Strcpy(outbuf, "tethered to something buried");
        break;
    case C.TT_LAVA:
        C.Sprintf(outbuf, "sinking into %s", final ? "lava" : C.hliquid("lava"));
        break;
    case C.TT_INFLOOR:
        C.Sprintf(outbuf, "stuck in %s", C.the(C.surface(C.u.ux, C.u.uy)));
        break;
    default: /* TT_BEARTRAP, TT_PIT, or TT_WEB */
        C.Strcpy(outbuf, "trapped");
        if ((t = C.t_at(C.u.ux, C.u.uy)) != 0) /* should never be null */
            C.Sprintf(C.eos(outbuf), " in %s", C.an(C.trapname(t.ttyp, 0)));
        break;
    }
    if (wizxtra) { /* give extra information for wizard mode enlightenment */
        /* curly braces: u.utrap is an escape attempt counter rather than a
           turn timer so use different ornamentation than usual parentheses */
        C.Sprintf(C.eos(outbuf), " {%u}", C.u.utrap);
    }
    return outbuf;
}

/* check whether hero is wearing something that player definitely knows
   confers the target property; item must have been seen and its type
   discovered but it doesn't necessarily have to be fully identified */
export function cause_known(propindx) /* index of a property which can be conveyed by worn item */
{
    propindx=C.int(propindx);
    let o;
    let mask = C.long(C.W_ARMOR | C.W_AMUL | C.W_RING | C.W_TOOL);

    /* simpler than from_what()/what_gives(); we don't attempt to
       handle artifacts and we deliberately ignore wielded items */
    for (o = C.gi.invent; o; o = o.nobj) {
        if (!(o.owornmask & mask))
            continue;
        if (C.int(C.objects[o.otyp].oc_oprop) == propindx
            && C.objects[o.otyp].oc_name_known && o.dknown)
            return 1;
    }
    return 0;
}

/* format a characteristic value, accommodating Strength's strangeness */
export function attrval(attrindx, attrvalue, resultbuf) /* should be at least [7] to hold "18/100\0" */
{
    attrindx=C.int(attrindx);attrvalue=C.int(attrvalue);
    if (attrindx != C.A_STR || attrvalue <= 18)
        C.Sprintf(resultbuf, "%d", attrvalue);
    else if (attrvalue > C.STR18(100)) /* 19 to 25 */
        C.Sprintf(resultbuf, "%d", attrvalue - 100);
    else /* simplify "18/\**" to be "18/100" */
        C.Sprintf(resultbuf, "18/%02d", attrvalue - 18);
    return resultbuf;
}

/* format urealtime.realtime as
      " D days, H hours, M minutes and S seconds"
   with any fields having a value of 0 omitted:
      0-00:00:20 => " 20 seconds"
      0-00:15:05 => " 15 minutes and 5 seconds"
      0-00:16:00 => " 16 minutes"
      0-01:15:10 => " 1 hour, 15 minutes and 10 seconds"
      0-02:00:01 => " 2 hours and 1 second"
      3-00:25:40 => " 3 days, 25 minutes and 40 seconds"
   (note: for a list of more than two entries, nethack usually includes the
   [style-wise] optional comma before "and" but in this instance it does not)
 */
export function fmt_elapsed_time(outbuf, final)
{
    final=C.int(final);
    let fieldcnt;
    let edays, ehours, eminutes, eseconds;
    /* for a game that's over, reallydone() has updated urealtime.realtime
       to its final value before calling us during end of game disclosure;
       for a game that's still in progress, it holds the amount of elapsed
       game time from previous sessions up through most recent save/restore
       (or up through latest level change when 'checkpoint' is On);
       '.start_timing' has a non-zero value even if '.realtime' is 0 */
    let etim = C.long(C.urealtime.realtime);

    if (!final)
        etim += C.timet_delta(C.getnow(), C.urealtime.start_timing);
    /* we could use localtime() to convert the value into a 'struct tm'
       to get date and time fields but this is simple and straightforward */
    eseconds = C.long(etim % 60n), etim /= 60n;
    eminutes = C.long(etim % 60n), etim /= 60n;
    ehours = C.long(etim % 24n);
    edays = C.long(etim / 24n);
    fieldcnt = C.int(!!edays + !!ehours + !!eminutes + !!eseconds);

    C.Strcpy(outbuf, fieldcnt ? "" : " none"); /* 'none' should never happen */
    if (edays) {
        C.Sprintf(C.eos(outbuf), " %ld day%s", edays, C.plur(edays));
        if (fieldcnt > 1) /* hours and/or minutes and/or seconds to follow */
            C.Strcat(outbuf, (fieldcnt == 2) ? " and" : ",");
        --fieldcnt; /* edays has been processed */
    }
    if (ehours) {
        C.Sprintf(C.eos(outbuf), " %ld hour%s", ehours, C.plur(ehours));
        if (fieldcnt > 1) /* minutes and/or seconds to follow */
            C.Strcat(outbuf, (fieldcnt == 2) ? " and" : ",");
        --fieldcnt; /* ehours has been processed */
    }
    if (eminutes) {
        C.Sprintf(C.eos(outbuf), " %ld minute%s", eminutes, C.plur(eminutes));
        if (fieldcnt > 1) /* seconds to follow */
            C.Strcat(outbuf, " and");
        /* eminutes has been processed but no need to decrement fieldcnt */
    }
    if (eseconds)
        C.Sprintf(C.eos(outbuf), " %ld second%s", eseconds, C.plur(eseconds));
    return outbuf;
}

/* "once" vs "twice" vs "17 times", used in several places */
export function N_times(n, outbuf)
{
    n=C.long(n);
    switch (n) {
    case 0n:
    default:
        C.Sprintf(outbuf, "%ld times", n);
        break;
    case 1n:
        C.Strcpy(outbuf, "once");
        break;
    case 2n:
        C.Strcpy(outbuf, "twice");
        break;
    case 3n:
        C.Strcpy(outbuf, "thrice");
        break;
    }
    return outbuf;
}

export function enlightenment(mode, final) /* BASICENLIGHTENMENT | MAGICENLIGHTENMENT (| both) */ /* ENL_GAMEINPROGRESS:0, ENL_GAMEOVERALIVE, ENL_GAMEOVERDEAD */
{
    mode=C.int(mode);final=C.int(final);
    const buf = C.stackAlloc(C.BUFSZ);
    const tmpbuf = C.stackAlloc(C.BUFSZ);

    C.ge.en_win = C.int(C.create_nhwindow(C.NHW_MENU));
    C.ge.en_via_menu = C.schar(!final);
    if (C.ge.en_via_menu)
        C.start_menu(C.ge.en_win, C.MENU_BEHAVE_STANDARD);

    C.Strcpy(tmpbuf, C.svp.plname);
    C.storeChar(tmpbuf, C.highc(C.loadChar(tmpbuf))); /* same adjustment as bottom line */
    /* as in background_enlightenment, when poly'd we need to use the saved
       gender in u.mfemale rather than the current you-as-monster gender */
    C.Snprintf(buf, C.bufferSize(buf), "%s the %s's attributes:", tmpbuf,
             ((C.Upolyd ? C.u.mfemale : C.flags.female) && C.gu.urole.name.f)
                ? C.gu.urole.name.f
                : C.gu.urole.name.m, 0);

    /* title */
    C.callLocal(enlght_out, buf); /* "Conan the Archeologist's attributes:" */
    /* background and characteristics; ^X or end-of-game disclosure */
    if (mode & C.BASICENLIGHTENMENT) {
        /* role, race, alignment, deities, dungeon level, time, experience */
        C.callLocal(background_enlightenment, mode, final);
        /* hit points, energy points, armor class, gold */
        C.callLocal(basics_enlightenment, mode, final);
        /* strength, dexterity, &c */
        C.callLocal(characteristics_enlightenment, mode, final);
    }
    /* expanded status line information, including things which aren't
       included there due to space considerations;
       shown for both basic and magic enlightenment */
    C.callLocal(status_enlightenment, mode, final);
    /* remaining attributes; shown for potion,&c or wizard mode and
       explore mode ^X or end of game disclosure */
    if (mode & C.MAGICENLIGHTENMENT) {
        /* intrinsics and other traditional enlightenment feedback */
        C.callLocal(attributes_enlightenment, mode, final);
    }

    C.callLocal(enlght_out, ""); /* separator */
    C.callLocal(enlght_out, "Miscellaneous:");
    /* reminder to player and/or information for dumplog */
    if ((mode & C.BASICENLIGHTENMENT) != 0 && (C.wizard || C.discover || final)) {
        if (C.wizard || C.discover) {
            C.Sprintf(buf, "running in %s mode", C.wizard ? "debug" : "explore");
            C.callLocal(enlght_line, You_, final ? were : are, buf, "");
        }

        if (!C.flags.bones) {
            /* mention not saving bones iff hero just died */
            C.Sprintf(buf, "disabled loading%s of bones levels",
                    (final == C.ENL_GAMEOVERDEAD) ? " and storing" : "");
            C.callLocal(enlght_line, You_, final ? "" : have, buf, "");
        } else if (!C.u.uroleplay.numbones) {
            C.callLocal(enlght_line, You_, final ? "didn't encounter" : "haven't encountered", " any bones levels", "");
        } else {
            C.Sprintf(buf, "encountered %ld bones level%s",
                    C.u.uroleplay.numbones, C.plur(C.u.uroleplay.numbones));
            C.callLocal(enlght_line, You_, final ? "" : have, buf, "");
        }
    }
    C.callLocal(fmt_elapsed_time, buf, final);
    C.callLocal(enlght_line, "Total elapsed playing time ", final ? "was" : "is", buf, "");

    if (!C.ge.en_via_menu) {
        C.display_nhwindow(C.ge.en_win, 1);
    } else {
        const selected = C.menuPointerLocal(0);

        C.end_menu(C.ge.en_win, 0);
        if (C.select_menu(C.ge.en_win, C.PICK_NONE, selected) > 0)
            C.free(selected.value);
        C.ge.en_via_menu = C.schar(0);
    }
    C.destroy_nhwindow(C.ge.en_win);
    C.ge.en_win = C.int(C.WIN_ERR);
}

/*ARGSUSED*/
/* display role, race, alignment and such to en_win */
export function background_enlightenment(unused_mode, final)
{
    unused_mode=C.int(unused_mode);final=C.int(final);
    let role_titl, rank_titl;
    let innategend, difgend, difalgn;
    const buf = C.stackAlloc(C.BUFSZ);
    const tmpbuf = C.stackAlloc(C.BUFSZ);

    /* note that if poly'd, we need to use u.mfemale instead of flags.female
       to access hero's saved gender-as-human/elf/&c rather than current */
    innategend = C.int((C.Upolyd ? C.u.mfemale : C.flags.female) ? 1 : 0);
    role_titl = (innategend && C.gu.urole.name.f) ? C.gu.urole.name.f
                                                : C.gu.urole.name.m;
    rank_titl = C.rank_of(C.u.ulevel, C.Role_switch, innategend);

    C.callLocal(enlght_out, ""); /* separator after title */
    C.callLocal(enlght_out, "Background:");

    /* if polymorphed, report current shape before underlying role;
       will be repeated as first status: "you are transformed" and also
       among various attributes: "you are in beast form" (after being
       told about lycanthropy) or "you are polymorphed into <a foo>"
       (with countdown timer appended for wizard mode); we really want
       the player to know he's not a samurai at the moment... */
    if (C.Upolyd) {
        const anbuf = C.stackAlloc(20); /* includes trailing space; [4] suffices */
        let uasmon = C.gy.youmonst.data;
        let altphrasing = C.schar(C.vampshifted(C.gy.youmonst));

        C.storeChar(C.ptrAdd(tmpbuf, 0), 0);
        /* here we always use current gender, not saved role gender */
        if (!C.is_male(uasmon) && !C.is_female(uasmon) && !C.is_neuter(uasmon))
            C.Sprintf(tmpbuf, "%s ", C.genders[C.flags.female ? 1 : 0].adj);
        if (altphrasing)
            C.Sprintf(C.eos(tmpbuf), "%s in ",
                    C.pmname(C.mons[C.gy.youmonst.cham],
                           C.flags.female ? C.FEMALE : C.MALE));
        C.Snprintf(buf, C.bufferSize(buf), "%s%s%s%s form",
                 !final ? "currently " : "",
                 altphrasing ? C.just_an(anbuf, tmpbuf) : "in ",
                 tmpbuf, C.pmname(uasmon, C.flags.female ? C.FEMALE : C.MALE), 1);
        C.callLocal(enlght_line, You_, final ? were : are, buf, "");
    }

    /* report role; omit gender if it's redundant (eg, "female priestess") */
    C.storeChar(C.ptrAdd(tmpbuf, 0), 0);
    if (!C.gu.urole.name.f
        && ((C.gu.urole.allow & C.ROLE_GENDMASK) == (C.ROLE_MALE | C.ROLE_FEMALE)
            || innategend != C.flags.initgend))
        C.Sprintf(tmpbuf, "%s ", C.genders[innategend].adj);
    C.storeChar(C.ptrAdd(buf, 0), 0);
    if (C.Upolyd)
        C.Strcpy(buf, "actually "); /* "You are actually a ..." */
    if (!C.strcmpi(rank_titl, role_titl)) {
        /* omit role when rank title matches it */
        C.Sprintf(C.eos(buf), "%s, level %d %s%s", C.an(rank_titl), C.u.ulevel,
                tmpbuf, C.gu.urace.noun);
    } else {
        C.Sprintf(C.eos(buf), "%s, a level %d %s%s %s", C.an(rank_titl), C.u.ulevel,
                tmpbuf, C.gu.urace.adj, role_titl);
    }
    C.callLocal(enlght_line, You_, final ? were : are, buf, "");

    /* report alignment (bypass you_are() in order to omit ending period);
       adverb is used to distinguish between temporary change (helm of opp.
       alignment), permanent change (one-time conversion), and original */
    C.Sprintf(buf, " %s%s%s, %son a mission for %s",
            You_, !final ? are : were,
            C.callLocal(align_str, C.u.ualign.type),
            /* helm of opposite alignment (might hide conversion) */
            (C.u.ualign.type != C.u.ualignbase[C.A_CURRENT])
               /* what's the past tense of "currently"? if we used "formerly"
                  it would sound like a reference to the original alignment */
               ? (!final ? "currently " : "temporarily ")
               /* permanent conversion */
               : (C.u.ualign.type != C.u.ualignbase[C.A_ORIGINAL])
                  /* and what's the past tense of "now"? certainly not "then"
                     in a context like this...; "belatedly" == weren't that
                     way sooner (in other words, didn't start that way) */
                  ? (!final ? "now " : "belatedly ")
                  /* atheist (ignored in very early game) */
                  : (!C.u.uconduct.gnostic && C.svm.moves > 1000n)
                     ? "nominally "
                     /* lastly, normal case */
                     : "",
            C.u_gname());
    C.callLocal(enlght_out, buf);
    /* show the rest of this game's pantheon (finishes previous sentence)
       [appending "also Moloch" at the end would allow for straightforward
       trailing "and" on all three aligned entries but looks too verbose] */
    C.Sprintf(buf, " who %s opposed by", !final ? "is" : "was");
    if (C.u.ualign.type != C.A_LAWFUL)
        C.Sprintf(C.eos(buf), " %s (%s) and", C.align_gname(C.A_LAWFUL),
                C.callLocal(align_str, C.A_LAWFUL));
    if (C.u.ualign.type != C.A_NEUTRAL)
        C.Sprintf(C.eos(buf), " %s (%s)%s", C.align_gname(C.A_NEUTRAL),
                C.callLocal(align_str, C.A_NEUTRAL),
                (C.u.ualign.type != C.A_CHAOTIC) ? " and" : "");
    if (C.u.ualign.type != C.A_CHAOTIC)
        C.Sprintf(C.eos(buf), " %s (%s)", C.align_gname(C.A_CHAOTIC),
                C.callLocal(align_str, C.A_CHAOTIC));
    C.Strcat(buf, "."); /* terminate sentence */
    C.callLocal(enlght_out, buf);

    /* show original alignment,gender,race,role if any have been changed;
       giving separate message for temporary alignment change bypasses need
       for tricky phrasing otherwise necessitated by possibility of having
       helm of opposite alignment mask a permanent alignment conversion */
    difgend = (C.int(innategend != C.flags.initgend));
    difalgn = (C.int(((C.u.ualign.type != C.u.ualignbase[C.A_CURRENT]) ? 1 : 0)
               + ((C.u.ualignbase[C.A_CURRENT] != C.u.ualignbase[C.A_ORIGINAL])
                  ? 2 : 0)));
    if (difalgn & 1) { /* have temporary alignment so report permanent one */
        C.Sprintf(buf, "actually %s", C.callLocal(align_str, C.u.ualignbase[C.A_CURRENT]));
        C.callLocal(enlght_line, You_, final ? were : are, buf, "");
        difalgn &= ~1; /* suppress helm from "started out <foo>" message */
    }
    if (difgend || difalgn) { /* sex change or perm align change or both */
        C.Sprintf(buf, " You started out %s%s%s.",
                difgend ? C.genders[C.flags.initgend].adj : "",
                (difgend && difalgn) ? " and " : "",
                difalgn ? C.callLocal(align_str, C.u.ualignbase[C.A_ORIGINAL]) : "");
        C.callLocal(enlght_out, buf);
    }

    /* "You are left-handed." won't work well if polymorphed into something
       without hands; use "You are normally left-handed." in that situation */
    C.Sprintf(buf, "%s%s-handed",
            !C.strcmp(C.body_part(C.HANDED), "handed") ? "" : "normally ",
            C.URIGHTY ? "right" : "left");
    C.callLocal(enlght_line, You_, final ? were : are, buf, "");

    /* As of 3.6.2: dungeon level, so that ^X really has all status info as
       claimed by the comment below; this reveals more information than
       the basic status display, but that's one of the purposes of ^X;
       similar information is revealed by #overview; the "You died in
       <location>" given by really_done() is more rudimentary than this */
    C.storeChar(buf, C.storeChar(tmpbuf, 0));
    if (C.In_endgame(C.u.uz)) {
        let egdepth = C.int(C.observable_depth(C.u.uz));

        C.endgamelevelname(tmpbuf, egdepth);
        C.Snprintf(buf, C.bufferSize(buf), "in the endgame, on the %s%s",
                 !C.strncmp(tmpbuf, "Plane", 5) ? "Elemental " : "", tmpbuf, 2);
    } else if (C.Is_knox(C.u.uz)) {
        /* this gives away the fact that the knox branch is only 1 level */
        C.Sprintf(buf, "on the %s level", C.svd.dungeons[C.u.uz.dnum].dname);
        /* TODO? maybe phrase it differently when actually inside the fort,
           if we're able to determine that (not trivial) */
    } else {
        const dgnbuf = C.stackAlloc(C.QBUFSZ);

        C.Strcpy(dgnbuf, C.svd.dungeons[C.u.uz.dnum].dname);
        if (!C.strncmpi(dgnbuf, "The ", 4))
            C.storeChar(dgnbuf, C.lowc(C.loadChar(dgnbuf)));
        C.Sprintf(tmpbuf, "level %d",
                C.In_quest(C.u.uz) ? C.dunlev(C.u.uz) : C.depth(C.u.uz));
        /* TODO? maybe extend this bit to include various other automatic
           annotations from the dungeon overview code */
        if (C.Is_rogue_level(C.u.uz))
            C.Strcat(tmpbuf, ", a primitive area");
        else if (C.Is_bigroom(C.u.uz) && !C.Blind)
            C.Strcat(tmpbuf, ", a very big room");
        C.Snprintf(buf, C.bufferSize(buf), "in %s, on %s", dgnbuf, tmpbuf, 3);
    }
    C.callLocal(enlght_line, You_, final ? were : are, buf, "");

    /* this is shown even if the 'time' option is off */
    if (C.svm.moves == 1n) {
        C.callLocal(enlght_line, You_, final ? had : have, "just started your adventure", "");
    } else {
        /* 'turns' grates on the nerves in this context... */
        C.Sprintf(buf, "the dungeon %ld turn%s ago",
                C.svm.moves, C.plur(C.svm.moves));
        /* same phrasing for current and final: "entered" is unconditional */
        C.callLocal(enlght_line, You_, "entered ", buf, "");
    }

    /* for gameover, these have been obtained in really_done() so that they
       won't vary if user leaves a disclosure prompt or --More-- unanswered
       long enough for the dynamic value to change between then and now */
    if (final ? C.iflags.at_midnight : C.midnight()) {
        C.callLocal(enlght_line, "It ", final ? "was " : "is ", "the midnight hour", "");
    } else if (final ? C.iflags.at_night : C.night()) {
        C.callLocal(enlght_line, "It ", final ? "was " : "is ", "nighttime", "");
    }
    /* other environmental factors */
    if (C.flags.moonphase == C.FULL_MOON || C.flags.moonphase == C.NEW_MOON) {
        /* [This had "tonight" but has been changed to "in effect".
           There is a similar issue to Friday the 13th--it's the value
           at the start of the current session but that session might
           have dragged on for an arbitrary amount of time.  We want to
           report the values that currently affect play--or affected
           play when game ended--rather than actual outside situation.] */
        C.Sprintf(buf, "a %s moon in effect%s",
                (C.flags.moonphase == C.FULL_MOON) ? "full"
                : (C.flags.moonphase == C.NEW_MOON) ? "new"
                  /* showing these would probably just lead to confusion
                     since they have no effect on game play... */
                  : (C.flags.moonphase < C.FULL_MOON) ? "first quarter"
                    : "last quarter",
                /* we don't have access to 'how' here--aside from survived
                   vs died--so settle for general platitude */
                final ? " when your adventure ended" : "");
        C.callLocal(enlght_line, "There ", final ? "was " : "is ", buf, "");
    }
    if (C.flags.friday13) {
        /* let player know that friday13 penalty is/was in effect;
           we don't say "it is/was Friday the 13th" because that was at
           the start of the session and it might be past midnight (or
           days later if the game has been paused without save/restore),
           so phrase this similar to the start up message */
        C.Sprintf(buf, " Bad things %s on Friday the 13th.",
                !final ? "can happen"
                : (final == C.ENL_GAMEOVERALIVE) ? "could have happened"
                  /* there's no may to tell whether -1 Luck made a
                     difference but hero has died... */
                  : "happened");
        C.callLocal(enlght_out, buf);
    }

    if (!C.Upolyd) {
        let ulvl = C.int(C.int(C.u.ulevel));
        /* [flags.showexp currently does not matter; should it?] */

        /* experience level is already shown above */
        C.Sprintf(buf, "%-1ld experience point%s", C.u.uexp, C.plur(C.u.uexp));
        /* TODO?
         *  Remove wizard-mode restriction since patient players can
         *  determine the numbers needed without resorting to spoilers
         *  (even before this started being disclosed for 'final';
         *  just enable 'showexp' and look at normal status lines
         *  after drinking gain level potions or eating wraith corpses
         *  or being level-drained by vampires).
         */
        if (ulvl < 30 && (final || C.wizard)) {
            let nxtlvl = C.long(C.newuexp(ulvl)), delta = C.long(nxtlvl - C.u.uexp);

            C.Sprintf(C.eos(buf), ", %ld %s%sneeded %s level %d",
                    delta, (C.u.uexp > 0) ? "more " : "",
                    /* present tense=="needed", past tense=="were needed" */
                    !final ? "" : (delta == 1n) ? "was " : "were ",
                    /* "for": grammatically iffy but less likely to wrap */
                    (ulvl < 18) ? "to attain" : "for", (ulvl + 1));
        }
        C.callLocal(enlght_line, You_, final ? had : have, buf, "");
    }
// #ifdef SCORE_ON_BOTL
//     if (flags.showscore) {
        /* describes what's shown on status line, which is an approximation;
           only show it here if player has the 'showscore' option enabled */
//         Sprintf(buf, "%ld%s", botl_score(),
//                 !final ? "" : " before end-of-game adjustments");
//         enl_msg("Your score ", "is ", "was ", buf, "");
//     }
// #endif
}

/* hit points, energy points, armor class -- essential information which
   doesn't fit very well in other categories */
/*ARGSUSED*/
export function basics_enlightenment(mode, final)
{
    mode=C.int(mode);final=C.int(final);
    const Power = "energy points (spell power)";
    const buf = C.stackAlloc(C.BUFSZ);
    let pw = C.int(C.u.uen), hp = (C.int(C.Upolyd ? C.u.mh : C.u.uhp)),
        pwmax = C.int(C.u.uenmax), hpmax = (C.int(C.Upolyd ? C.u.mhmax : C.u.uhpmax));

    C.callLocal(enlght_out, ""); /* separator after background */
    C.callLocal(enlght_out, "Basics:");

    if (hp < 0)
        hp = C.int(0);
    /* "1 out of 1" rather than "all" if max is only 1; should never happen */
    if (hp == hpmax && hpmax > 1)
        C.Sprintf(buf, "all %d hit points", hpmax);
    else
        C.Sprintf(buf, "%d out of %d hit point%s", hp, hpmax, C.plur(hpmax));
    C.callLocal(enlght_line, You_, final ? had : have, buf, "");

    /* low max energy is feasible, so handle couple of extra special cases */
    if (pwmax == 0 || (pw == pwmax && pwmax == 2)) /* both: not "all 2" */
        C.Sprintf(buf, "%s %s", !pwmax ? "no" : "both", Power);
    else if (pw == pwmax && pwmax > 2)
        C.Sprintf(buf, "all %d %s", pwmax, Power);
    else
        C.Sprintf(buf, "%d out of %d %s", pw, pwmax, Power);
    C.callLocal(enlght_line, You_, final ? had : have, buf, "");

    if (C.Upolyd) {
        switch (C.mons[C.u.umonnum].mlevel) {
        case 0:
            /* status line currently being explained shows "HD:0" */
            C.Strcpy(buf, "0 hit dice (actually 1/2)");
            break;
        case 1:
            C.Strcpy(buf, "1 hit die");
            break;
        default:
            C.Sprintf(buf, "%d hit dice", C.mons[C.u.umonnum].mlevel);
            break;
        }
        C.callLocal(enlght_line, You_, final ? had : have, buf, "");
    }

    C.find_ac(); /* enforces AC_MAX cap */
    C.Sprintf(buf, "%d", C.u.uac);
    if (C.abs(C.u.uac) == C.AC_MAX)
        C.Sprintf(C.eos(buf), ", the %s possible",
                (C.u.uac < 0) ? "best" : "worst");
    C.callLocal(enlght_line, "Your armor class ", final ? "was " : "is ", buf, "");

    /* gold; similar to doprgold (#showgold) but without shop billing info;
       includes container contents, unlike status line but like doprgold */
    {
        let umoney = C.long(C.money_cnt(C.gi.invent)), hmoney = C.long(C.hidden_gold(final));

        if (!umoney) {
            C.Sprintf(buf, " Your wallet %s empty", !final ? "is" : "was");
        } else {
            C.Sprintf(buf, " Your wallet contain%s %ld %s", !final ? "s" : "ed",
                    umoney, C.currency(umoney));
        }
        /* terminate the wallet line if appropriate, otherwise add an
           introduction to subsequent continuation; output now either way */
        C.Strcat(buf, !hmoney ? "." : !umoney ? ", but" : ", and");
        C.callLocal(enlght_out, buf);

        /* put contained gold on its own line to avoid excessive width; it's
           phrased as a continuation of the wallet line so not capitalized */
        if (hmoney) {
            C.Sprintf(buf, "%ld %s stashed away in your pack",
                    hmoney, umoney ? "more" : C.currency(hmoney));
            C.callLocal(enlght_line, "you ", final ? "had " : "have ", buf, "");
        }
    }

    if (C.flags.pickup) {
        const ocl = C.stackAlloc(C.MAXOCLASSES + 1);

        C.Strcpy(buf, "on");
        if (C.costly_spot(C.u.ux, C.u.uy)) {
            /* being in a shop inhibits autopickup, even 'pickup_thrown' */
            C.Strcat(buf, ", but temporarily disabled while inside the shop");
        } else {
            C.oc_to_str(C.flags.pickup_types, ocl);
            C.Sprintf(C.eos(buf), " for %s%s%s", ocl ? "'" : "", ocl ? ocl : "all types", ocl ? "'" : "");
            if (C.flags.pickup_thrown && C.loadChar(ocl))
                C.Strcat(buf, " plus thrown"); /* show when not 'all types' */
            if (C.ga.apelist)
                C.Strcat(buf, ", with exceptions");
        }
    } else
        C.Strcpy(buf, "off");
    C.callLocal(enlght_line, "Autopickup ", final ? "was " : "is ", buf, "");
}

/* characteristics: expanded version of bottom line strength, dexterity, &c */
export function characteristics_enlightenment(mode, final)
{
    mode=C.int(mode);final=C.int(final);
    const buf = C.stackAlloc(C.BUFSZ);

    C.callLocal(enlght_out, "");
    C.Sprintf(buf, "%sCharacteristics:", !final ? "" : "Final ");
    C.callLocal(enlght_out, buf);

    /* bottom line order */
    C.callLocal(one_characteristic, mode, final, C.A_STR); /* strength */
    C.callLocal(one_characteristic, mode, final, C.A_DEX); /* dexterity */
    C.callLocal(one_characteristic, mode, final, C.A_CON); /* constitution */
    C.callLocal(one_characteristic, mode, final, C.A_INT); /* intelligence */
    C.callLocal(one_characteristic, mode, final, C.A_WIS); /* wisdom */
    C.callLocal(one_characteristic, mode, final, C.A_CHA); /* charisma */
}

/* display one attribute value for characteristics_enlightenment() */
export function one_characteristic(mode, final, attrindx)
{
    mode=C.int(mode);final=C.int(final);attrindx=C.int(attrindx);
     /* attrib.c */
    let hide_innate_value = C.schar(0), interesting_alimit;
    let acurrent, abase, apeak, alimit;
    let paren_pfx;
    const subjbuf = C.stackAlloc(C.BUFSZ);
    const valubuf = C.stackAlloc(C.BUFSZ);
    const valstring = C.stackAlloc(32);

    /* being polymorphed or wearing certain cursed items prevents
       hero from reliably tracking changes to characteristics so
       we don't show base & peak values then; when the items aren't
       cursed, hero could take them off to check underlying values
       and we show those in such case so that player doesn't need
       to actually resort to doing that */
    if (C.Upolyd) {
        hide_innate_value = C.schar(1);
    } else if (C.Fixed_abil) {
        if (C.stuck_ring(C.uleft, C.RIN_SUSTAIN_ABILITY)
            || C.stuck_ring(C.uright, C.RIN_SUSTAIN_ABILITY))
            hide_innate_value = C.schar(1);
    }
    switch (attrindx) {
    case C.A_STR:
        if (C.uarmg && C.uarmg.otyp == C.GAUNTLETS_OF_POWER && C.uarmg.cursed)
            hide_innate_value = C.schar(1);
        break;
    case C.A_DEX:
        break;
    case C.A_CON:
        if (C.u_wield_art(C.ART_OGRESMASHER) && C.uwep.cursed)
            hide_innate_value = C.schar(1);
        break;
    case C.A_INT:
        if (C.uarmh && C.uarmh.otyp == C.DUNCE_CAP && C.uarmh.cursed)
            hide_innate_value = C.schar(1);
        break;
    case C.A_WIS:
        if (C.uarmh && C.uarmh.otyp == C.DUNCE_CAP && C.uarmh.cursed)
            hide_innate_value = C.schar(1);
        break;
    case C.A_CHA:
        break;
    default:
        return; /* impossible */
    };
    /* note: final disclosure includes MAGICENLIGHTENTMENT */
    if ((mode & C.MAGICENLIGHTENMENT) && !C.Upolyd)
        hide_innate_value = C.schar(0);

    acurrent = C.int(C.ACURR(attrindx));
    C.callLocal(attrval, attrindx, acurrent, valubuf); /* Sprintf(valubuf,"%d",) */
    C.Sprintf(subjbuf, "Your %s ", C.attrname[attrindx]);

    if (!hide_innate_value) {
        /* show abase, amax, and/or attrmax if acurr doesn't match abase
           (a magic bonus or penalty is in effect) or abase doesn't match
           amax (some points have been lost to poison or exercise abuse
           and are restorable) or attrmax is different from normal human
           (while game is in progress; trying to reduce dependency on
           spoilers to keep track of such stuff) or attrmax was different
           from abase (at end of game; this attribute wasn't maxed out) */
        abase = C.int(C.ABASE(attrindx));
        apeak = C.int(C.AMAX(attrindx));
        alimit = C.int(C.ATTRMAX(attrindx));
        /* criterium for whether the limit is interesting varies */
        interesting_alimit =
            C.schar(final ? 1 /* was originally `(abase != alimit)' */
                  : (alimit != (attrindx != C.A_STR ? 18 : C.STR18(100))));
        paren_pfx = final ? " (" : " (current; ";
        if (acurrent != abase) {
            C.Sprintf(C.eos(valubuf), "%sbase:%s", paren_pfx,
                    C.callLocal(attrval, attrindx, abase, valstring));
            paren_pfx = ", ";
        }
        if (abase != apeak) {
            C.Sprintf(C.eos(valubuf), "%speak:%s", paren_pfx,
                    C.callLocal(attrval, attrindx, apeak, valstring));
            paren_pfx = ", ";
        }
        if (interesting_alimit) {
            C.Sprintf(C.eos(valubuf), "%s%slimit:%s", paren_pfx,
                    /* more verbose if exceeding 'limit' due to magic bonus */
                    (acurrent > alimit) ? "innate " : "",
                    C.callLocal(attrval, attrindx, alimit, valstring));
            /* paren_pfx = ", "; */
        }
        if (acurrent != abase || abase != apeak || interesting_alimit)
            C.Strcat(valubuf, ")");
    }
    C.callLocal(enlght_line, subjbuf, final ? "was " : "is ", valubuf, "");
}

/* status: selected obvious capabilities, assorted troubles */
export function status_enlightenment(mode, final)
{
    mode=C.int(mode);final=C.int(final);
    let magic = C.schar((mode & C.MAGICENLIGHTENMENT) ? 1 : 0);
    let cap;
    const buf = C.stackAlloc(C.BUFSZ);
    const youtoo = C.stackAlloc(C.BUFSZ);
    const heldmon = C.stackAlloc(C.BUFSZ);
    let Riding = (C.schar(Number(Boolean(C.u.usteed
                      /* if hero dies while dismounting, u.usteed will still
                         be set; we want to ignore steed in that situation */
                      && !(final == C.ENL_GAMEOVERDEAD
                           && !C.strcmp(C.svk.killer.name, "riding accident"))))));
    let steedname = (!Riding ? 0
                      : C.x_monnam(C.u.usteed,
                                 C.u.usteed.mtame ? C.ARTICLE_YOUR : C.ARTICLE_THE,
                                 0,
                                 (C.SUPPRESS_SADDLE | C.SUPPRESS_HALLUCINATION),
                                 0));

    /*\
     * Status (many are abbreviated on bottom line; others are or
     *     should be discernible to the hero hence to the player)
    \*/
    C.callLocal(enlght_out, ""); /* separator after title or characteristics */
    C.callLocal(enlght_out, final ? "Final Status:" : "Status:");

    C.Strcpy(youtoo, You_);
    /* not a traditional status but inherently obvious to player; more
       detail given below (attributes section) for magic enlightenment */
    if (C.Upolyd) {
        C.Strcpy(buf, "transformed");
        if (C.ugenocided())
            C.Sprintf(C.eos(buf), " and %s %s inside",
                    final ? "felt" : "feel", C.udeadinside());
        C.callLocal(enlght_line, You_, final ? were : are, buf, "");
    }
    /* not a trouble, but we want to display riding status before maybe
       reporting steed as trapped or hero stuck to cursed saddle */
    if (Riding) {
        C.Sprintf(buf, "riding %s", steedname);
        C.callLocal(enlght_line, You_, final ? were : are, buf, "");
        C.Sprintf(C.eos(youtoo), "and %s ", steedname);
    }
    /* other movement situations that hero should always know */
    if (C.Levitation) {
        if (C.Lev_at_will && magic)
            C.callLocal(enlght_line, You_, final ? were : are, "levitating, at will", "");
        else
            C.callLocal(enlght_line, youtoo, final ? were : are, "levitating", C.from_what(C.LEVITATION));
    } else if (C.Flying) { /* can only fly when not levitating */
        C.callLocal(enlght_line, youtoo, final ? were : are, "flying", C.from_what(C.FLYING));
    }
    if (C.Underwater) {
        C.callLocal(enlght_line, You_, final ? were : are, "underwater", "");
    } else if (C.u.uinwater) {
        C.callLocal(enlght_line, You_, final ? were : are, C.Swimming ? "swimming" : "in water", C.from_what(C.SWIMMING));
    } else if (C.callLocal(walking_on_water)) {
        /* show active Wwalking here, potential Wwalking elsewhere */
        C.Sprintf(buf, "walking on %s",
                C.is_pool(C.u.ux, C.u.uy) ? "water"
                : C.is_lava(C.u.ux, C.u.uy) ? "lava"
                  : C.surface(C.u.ux, C.u.uy)); /* catchall; shouldn't happen */
        C.callLocal(enlght_line, You_, final ? were : are, buf, C.from_what(C.WWALKING));
    }
    if (C.Upolyd && (C.u.uundetected || C.U_AP_TYPE != C.M_AP_NOTHING))
        C.callLocal(youhiding, 1, final);

    /* internal troubles, mostly in the order that prayer ranks them */
    if (C.Stoned) {
        if (final && (C.Stoned & C.I_SPECIAL))
            C.callLocal(enlght_out, " You turned into stone.");
        else
            C.callLocal(enlght_line, You_, final ? were : are, "turning to stone", "");
    }
    if (C.Slimed) {
        if (final && (C.Slimed & C.I_SPECIAL))
            C.callLocal(enlght_out, " You turned into slime.");
        else
            C.callLocal(enlght_line, You_, final ? were : are, "turning into slime", "");
    }
    if (C.Strangled) {
        if (C.u.uburied) {
            C.callLocal(enlght_line, You_, final ? were : are, "buried", "");
        } else {
            if (final && (C.Strangled & C.I_SPECIAL)) {
                C.callLocal(enlght_out, " You died from strangulation.");
            } else {
                C.Strcpy(buf, "being strangled");
                if (C.wizard)
                    C.Sprintf(C.eos(buf), " (%ld)", (C.Strangled & C.TIMEOUT));
                C.callLocal(enlght_line, You_, final ? were : are, buf, C.from_what(C.STRANGLED));
            }
        }
    }
    if (C.Sick) {
        /* the two types of sickness are lumped together; hero can be
           afflicted by both but there is only one timeout; botl status
           puts TermIll before FoodPois and death due to timeout reports
           terminal illness if both are in effect, so do the same here */
        if (final && (C.Sick & C.I_SPECIAL)) {
            C.Sprintf(buf, " %sdied from %s.", You_, /* has trailing space */
                    (C.u.usick_type & C.SICK_NONVOMITABLE)
                    ? "terminal illness" : "food poisoning");
            C.callLocal(enlght_out, buf);
        } else {
            /* unlike death due to sickness, report the two cases separately
               because it is possible to cure one without curing the other */
            if (C.u.usick_type & C.SICK_NONVOMITABLE)
                C.callLocal(enlght_line, You_, final ? were : are, "terminally sick from illness", "");
            if (C.u.usick_type & C.SICK_VOMITABLE)
                C.callLocal(enlght_line, You_, final ? were : are, "terminally sick from food poisoning", "");
        }
    }
    if (C.Vomiting)
        C.callLocal(enlght_line, You_, final ? were : are, "nauseated", "");
    if (C.Stunned)
        C.callLocal(enlght_line, You_, final ? were : are, "stunned", "");
    if (C.Confusion)
        C.callLocal(enlght_line, You_, final ? were : are, "confused", "");
    if (C.Hallucination)
        C.callLocal(enlght_line, You_, final ? were : are, "hallucinating", "");
    if (C.Blind) {
        /* check the reasons in same order as from_what() */
        C.Sprintf(buf, "%s blind",
                (C.HBlinded & C.FROMOUTSIDE) != 0n ? "permanently"
                : (C.HBlinded & C.FROMFORM) ? "innately"
                  /* better phrasing desperately wanted... */
                  : C.Blindfolded_only ? "deliberately"
                    /* timed, possibly combined with blindfold */
                    : "temporarily");
        if (C.wizard && (C.HBlinded == C.BlindedTimeout && !C.Blindfolded))
            C.Sprintf(C.eos(buf), " (%ld)", C.BlindedTimeout);
        /* !haseyes: avoid "you are innately blind innately" */
        C.callLocal(enlght_line, You_, final ? were : are, buf, !C.haseyes(C.gy.youmonst.data) ? "" : C.from_what(C.BLINDED));
    }
    if (C.Deaf)
        C.callLocal(enlght_line, You_, final ? were : are, "deaf", C.from_what(C.DEAF));

    /* external troubles, more or less */
    if (C.Punished) {
        if (C.uball) {
            C.Sprintf(buf, "chained to %s", C.ansimpleoname(C.uball));
        } else {
            C.impossible("Punished without uball?");
            C.Strcpy(buf, "punished");
        }
        C.callLocal(enlght_line, You_, final ? were : are, buf, "");
    }
    if (C.u.utrap) {
        const predicament = C.stackAlloc(C.BUFSZ);
        let anchored = (C.schar(C.u.utraptype == C.TT_BURIEDBALL));

        C.callLocal(trap_predicament, predicament, final, C.wizard);
        if (C.u.usteed) { /* not `Riding' here */
            C.Sprintf(buf, "%s%s ", anchored ? "you and " : "", steedname);
            C.storeChar(buf, C.highc(C.loadChar(buf)));
            C.callLocal(enlght_line, buf, final ? (anchored ? "were " : "was ") : (anchored ? "are " : "is "), predicament, "");
        } else
            C.callLocal(enlght_line, You_, final ? were : are, predicament, "");
    } /* (u.utrap) */
    C.storeChar(C.ptrAdd(heldmon, 0), 0); /* lint suppression */
    if (C.u.ustuck) { /* includes u.uswallow */
        C.Strcpy(heldmon, C.a_monnam(C.u.ustuck));
        if (!C.strcmp(heldmon, "it")
            && (!C.has_mgivenname(C.u.ustuck)
                || C.strcmp(C.MGIVENNAME(C.u.ustuck), "it") != 0))
            C.Strcpy(heldmon, "an unseen creature");
    }
    if (C.u.uswallow) {
        C.assert(C.u.ustuck != 0, 0); /* implied by u.uswallow */
        C.Snprintf(buf, C.bufferSize(buf), "%s by %s",
                C.digests(C.u.ustuck.data) ? "swallowed" : "engulfed",
                heldmon, 4);
        if (C.dmgtype(C.u.ustuck.data, C.AD_DGST)) {
            /* if final, death via digestion can be deduced by u.uswallow
               still being True and u.uswldtim having been decremented to 0 */
            if (final && !C.u.uswldtim)
                C.Strcat(buf, " and got totally digested");
            else
                C.Sprintf(C.eos(buf), " and %s being digested",
                        final ? "were" : "are");
        }
        if (C.wizard)
            C.Sprintf(C.eos(buf), " (%u)", C.u.uswldtim);
        C.callLocal(enlght_line, You_, final ? were : are, buf, "");
    } else if (C.u.ustuck) {
        let ustick = (C.schar(Number(Boolean(C.Upolyd && C.sticks(C.gy.youmonst.data)))));
        let dx = C.int(C.u.ustuck.mx - C.u.ux), dy = C.int(C.u.ustuck.my - C.u.uy);

        C.Snprintf(buf, C.bufferSize(buf), "%s %s (%s)",
                 ustick ? "holding" : "held by",
                 heldmon, C.dxdy_to_dist_descr(dx, dy, 1), 5);
        C.callLocal(enlght_line, You_, final ? were : are, buf, "");
    }
    if (Riding) {
        let saddle = C.which_armor(C.u.usteed, C.W_SADDLE);

        if (saddle && saddle.cursed) {
            C.Sprintf(buf, "stuck to %s %s", C.s_suffix(steedname),
                    C.simpleonames(saddle));
            C.callLocal(enlght_line, You_, final ? were : are, buf, "");
        }
    }
    if (C.Wounded_legs) {
        /* EWounded_legs is used to track left/right/both rather than some
           form of extrinsic impairment; HWounded_legs is used for timeout;
           both apply to steed instead of hero when mounted */
        let whichleg = (C.long(C.EWounded_legs & C.long(C.BOTH_SIDES)));
        let bp = C.u.usteed ? C.mbodypart(C.u.usteed, C.LEG) : C.body_part(C.LEG), article = "a ", /* precedes "wounded", so never "an " */
            leftright = "";

        if (whichleg == C.BOTH_SIDES)
            bp = C.makeplural(bp), article = "";
        else
            leftright = (whichleg == C.LEFT_SIDE) ? "left " : "right ";
        C.Sprintf(buf, "%swounded %s%s", article, leftright, bp);

        /* when mounted, Wounded_legs applies to steed rather than to
           hero; we only report steed's wounded legs in wizard mode */
        if (C.u.usteed) { /* not `Riding' here */
            if (C.wizard && steedname) {
                const steednambuf = C.stackAlloc(C.BUFSZ);

                C.Strcpy(steednambuf, steedname);
                C.storeChar(steednambuf, C.highc(C.loadChar(steednambuf)));
                C.callLocal(enlght_line, steednambuf, final ? " had " : " has ", buf, "");
            }
        } else {
            C.callLocal(enlght_line, You_, final ? had : have, buf, "");
        }
    }
    if (C.Glib) {
        C.Sprintf(buf, "slippery %s", C.fingers_or_gloves(1));
        if (C.wizard)
            C.Sprintf(C.eos(buf), " (%ld)", (C.Glib & C.TIMEOUT));
        C.callLocal(enlght_line, You_, final ? had : have, buf, "");
    }
    if (C.Fumbling) {
        if (magic || C.callLocal(cause_known, C.FUMBLING))
            C.callLocal(enlght_line, You_, final ? "fumbled" : "fumble", "", C.from_what(C.FUMBLING));
    }
    if (C.Sleepy) {
        if (magic || C.callLocal(cause_known, C.SLEEPY)) {
            C.Strcpy(buf, C.from_what(C.SLEEPY));
            if (C.wizard)
                C.Sprintf(C.eos(buf), " (%ld)", (C.HSleepy & C.TIMEOUT));
            C.callLocal(enlght_line, "You ", final ? "fell" : "fall", " asleep uncontrollably", buf);
        }
    }
    /* hunger/nutrition */
    if (C.Hunger) {
        if (magic || C.callLocal(cause_known, C.HUNGER))
            C.callLocal(enlght_line, You_, final ? "hungered" : "hunger", " rapidly", C.from_what(C.HUNGER));
    }
    C.Strcpy(buf, C.hu_stat[C.u.uhs]); /* hunger status; omitted if "normal" */
    C.mungspaces(buf);             /* strip trailing spaces */
    /* status line doesn't show hunger when state is "not hungry", we do;
       needed for wizard mode's reveal of u.uhunger but add it for everyone */
    if (!C.loadChar(buf))
        C.Strcpy(buf, "not hungry");
    if (C.loadChar(buf)) { /* (since "not hungry" was added, this will always be True) */
        C.storeChar(buf, C.lowc(C.loadChar(buf))); /* override capitalization */
        if (!C.strcmp(buf, "weak"))
            C.Strcat(buf, " from severe hunger");
        else if (!C.strncmp(buf, "faint", 5)) /* fainting, fainted */
            C.Strcat(buf, " due to starvation");
        if (C.wizard)
            C.Sprintf(C.eos(buf), " <%d>", C.u.uhunger);
        C.callLocal(enlght_line, You_, final ? were : are, buf, "");
    }
    /* encumbrance */
    if ((cap = C.int(C.near_capacity())) > C.UNENCUMBERED) {
        let adj = "?_?"; /* (should always get overridden) */

        C.Strcpy(buf, C.enc_stat[cap]);
        C.storeChar(buf, C.lowc(C.loadChar(buf)));
        switch (cap) {
        case C.SLT_ENCUMBER:
            adj = "slightly";
            break; /* burdened */
        case C.MOD_ENCUMBER:
            adj = "moderately";
            break; /* stressed */
        case C.HVY_ENCUMBER:
            adj = "very";
            break; /* strained */
        case C.EXT_ENCUMBER:
            adj = "extremely";
            break; /* overtaxed */
        case C.OVERLOADED:
            adj = "not possible";
            break;
        }
        if (C.wizard)
            C.Sprintf(C.eos(buf), " <%d>", C.inv_weight());
        C.Sprintf(C.eos(buf), "; movement %s %s%s", !final ? "is" : "was", adj,
                (cap < C.OVERLOADED) ? " slowed" : "");
        C.callLocal(enlght_line, You_, final ? were : are, buf, "");
    } else {
        /* last resort entry, guarantees Status section is non-empty
           (no longer needed for that purpose since weapon status added;
           still useful though) */
        C.Strcpy(buf, "unencumbered");
        if (C.wizard)
            C.Sprintf(C.eos(buf), " <%d>", C.inv_weight());
        C.callLocal(enlght_line, You_, final ? were : are, buf, "");
    }
    /* current weapon(s) and corresponding skill level(s) */
    C.callLocal(weapon_insight, final);
    /* unlike ring of increase accuracy's effect, the monk's suit penalty
       is too blatant to be restricted to magical enlightenment */
    if (C.iflags.tux_penalty && !C.Upolyd) {
        C.callLocal(enlght_combatinc, "to hit", -C.gu.urole.spelarmr, final, buf);
        /* if from_what() ever gets extended from wizard mode to normal
           play, it could be adapted to handle this */
        C.Sprintf(C.eos(buf), " due to your %s", C.suit_simple_name(C.uarm));
        C.callLocal(enlght_line, You_, final ? had : have, buf, "");
    }
    /* report 'nudity' */
    if (!C.uarm && !C.uarmu && !C.uarmc && !C.uarms && !C.uarmg && !C.uarmf && !C.uarmh) {
        if (C.u.uroleplay.nudist)
            C.callLocal(enlght_line, You_, final ? "did" : "do", " not wear any armor", "");
        else
            C.callLocal(enlght_line, You_, final ? were : are, "not wearing any armor", "");
    }
}

/* extracted from status_enlightenment() to reduce clutter there */
export function weapon_insight(final)
{
    final=C.int(final);
    const buf = C.stackAlloc(C.BUFSZ);
    let wtype;

    /* report being weaponless; distinguish whether gloves are worn
       [perhaps mention silver ring(s) when not wearing gloves?] */
    if (!C.uwep) {
        C.callLocal(enlght_line, You_, final ? were : are, C.empty_handed(), "");

    /* two-weaponing implies hands and
       a weapon or wep-tool (not other odd stuff) in each hand */
    } else if (C.u.twoweap) {
        C.callLocal(enlght_line, You_, final ? were : are, "wielding two weapons at once", "");

    /* report most weapons by their skill class (so a katana will be
       described as a long sword, for instance; mattock, hook, and aklys
       are exceptions), or wielded non-weapon item by its object class */
    } else {
        let what = C.weapon_descr(C.uwep);

        /* [what about other silver items?] */
        if (C.uwep.otyp == C.SHIELD_OF_REFLECTION)
            what = C.shield_simple_name(C.uwep); /* silver|smooth shield */
        else if (C.is_wet_towel(C.uwep))
            what = /* (uwep->spe < 3) ? "moist towel" : */ "wet towel";

        if (!C.strcmpi(what, "armor") || !C.strcmpi(what, "food")
            || !C.strcmpi(what, "venom"))
            C.Sprintf(buf, "wielding some %s", what);
        else
            /* [maybe include known blessed?] */
            C.Sprintf(buf, "wielding %s",
                    (C.uwep.quan == 1n) ? C.an(what) : C.makeplural(what));
        C.callLocal(enlght_line, You_, final ? were : are, buf, "");
    }

    /*
     * Skill with current weapon.  Might help players who've never
     * noticed #enhance or decided that it was pointless.
     */
    if ((wtype = C.int(C.weapon_type(C.uwep))) != C.P_NONE && (!C.uwep || !C.is_ammo(C.uwep))) {
        const sklvlbuf = C.stackAlloc(20);
        let sklvl = C.int(C.P_SKILL(wtype));
        let hav = (C.schar(Number(Boolean(sklvl != C.P_UNSKILLED && sklvl != C.P_SKILLED))));

        if (sklvl == C.P_ISRESTRICTED)
            C.Strcpy(sklvlbuf, "no");
        else
            C.lcase(C.skill_level_name(wtype, sklvlbuf));
        /* "you have no/basic/expert/master/grand-master skill with <skill>"
           or "you are unskilled/skilled in <skill>" */
        C.Sprintf(buf, "%s %s %s", sklvlbuf,
                hav ? "skill with" : "in", C.skill_name(wtype));

        if (!C.u.twoweap) {
            if (C.can_advance(wtype, 0))
                C.Sprintf(C.eos(buf), " and %s that",
                        !final ? "can enhance" : "could have enhanced");
            if (hav)
                C.callLocal(enlght_line, You_, final ? had : have, buf, "");
            else
                C.callLocal(enlght_line, You_, final ? were : are, buf, "");

        } else { /* two-weapon */
            const also_ = "also ";
            const pfx = C.stackAlloc(C.QBUFSZ);
    const sfx = C.stackAlloc(C.QBUFSZ);
    const sknambuf2 = C.stackAlloc(20);
    const sklvlbuf2 = C.stackAlloc(20);
    const twobuf = C.stackAlloc(20);
            let also = "", also2 = "", also3 = 0, verb_present, verb_past;
            let wtype2 = C.int(C.weapon_type(C.uswapwep)),
                sklvl2 = C.int(C.P_SKILL(wtype2)),
                twoskl = C.int(C.P_SKILL(C.P_TWO_WEAPON_COMBAT));
            let a1, a2, ab,
                    hav2 = (C.schar(Number(Boolean(sklvl2 != C.P_UNSKILLED && sklvl2 != C.P_SKILLED))));

            /* normally hero must have access to two-weapon skill in
               order to initiate u.twoweap, but not if polymorphed into
               a form which has multiple weapon attacks, so we need to
               avoid getting bitten by unexpected skill value */
            if (twoskl == C.P_ISRESTRICTED) {
                twoskl = C.int(C.P_UNSKILLED);
                /* restricted is the same as unskilled as far as bonus
                   or penalty goes, and it isn't ordinarily seen so
                   skill_level_name() returns "Unknown" for it */
                C.Strcpy(twobuf, "restricted");
            } else {
                C.lcase(C.skill_level_name(C.P_TWO_WEAPON_COMBAT, twobuf));
            }

            /* keep buf[] from above in case skill levels match */
            C.storeChar(C.ptrAdd(pfx, 0), C.storeChar(C.ptrAdd(sfx, 0), 0));
            if (twoskl < sklvl) {
                /* twoskil won't be restricted so sklvl is at least basic */
                C.Sprintf(pfx, "Your skill in %s ", C.skill_name(wtype));
                C.Sprintf(sfx, " limited by being %s with two weapons", twobuf);
                also = also_;
            } else if (twoskl > sklvl) {
                /* sklvl might be restricted */
                C.Strcpy(pfx, "Your two weapon skill ");
                C.Strcpy(sfx, " limited by ");
                if (sklvl > C.P_ISRESTRICTED)
                    C.Sprintf(C.eos(sfx), "being %s", sklvlbuf);
                else
                    C.Sprintf(C.eos(sfx), "having no skill");
                C.Sprintf(C.eos(sfx), " with %s", C.skill_name(wtype));
                also2 = also_;
            } else {
                C.Strcat(buf, " and two weapons");
                also3 = also_;
            }
            if (C.loadChar(pfx))
                C.callLocal(enlght_line, pfx, final ? "was" : "is", sfx, "");
            else if (hav)
                C.callLocal(enlght_line, You_, final ? had : have, buf, "");
            else
                C.callLocal(enlght_line, You_, final ? were : are, buf, "");

            /* skip comparison between secondary and two-weapons if it is
               identical to the comparison between primary and twoweap */
            if (wtype2 != wtype) {
                C.Strcpy(sknambuf2, C.skill_name(wtype2));
                C.lcase(C.skill_level_name(wtype2, sklvlbuf2));
                verb_present = "is", verb_past = "was";
                C.storeChar(C.ptrAdd(pfx, 0), C.storeChar(C.ptrAdd(sfx, 0), C.storeChar(C.ptrAdd(buf, 0), 0)));
                if (twoskl < sklvl2) {
                    /* twoskil is at least unskilled, sklvl2 at least basic */
                    C.Sprintf(pfx, "Your skill in %s ", sknambuf2);
                    C.Sprintf(sfx, " %slimited by being %s with two weapons",
                            also, twobuf);
                } else if (twoskl > sklvl2) {
                    /* sklvl2 might be restricted */
                    C.Strcpy(pfx, "Your two weapon skill ");
                    C.Sprintf(sfx, " %slimited by ", also2);
                    if (sklvl2 > C.P_ISRESTRICTED)
                        C.Sprintf(C.eos(sfx), "being %s", sklvlbuf2);
                    else
                        C.Strcat(C.eos(sfx), "having no skill");
                    C.Sprintf(C.eos(sfx), " with %s", sknambuf2);
                } else {
                    /* equal; two-weapon is at least unskilled, so sklvl2 is
                       too; "you [also] have basic/expert/master/grand-master
                       skill with <skill>" or "you [also] are unskilled/
                       skilled in <skill> */
                    C.Sprintf(buf, "%s %s %s", sklvlbuf2,
                            hav2 ? "skill with" : "in", sknambuf2);
                    C.Strcat(buf, " and two weapons");
                    if (also3) {
                        C.Strcpy(pfx, "You also ");
                        C.Snprintf(sfx, C.bufferSize(sfx), " %s", buf, 6), C.storeChar(C.ptrAdd(buf, 0), 0);
                        verb_present = hav2 ? "have" : "are";
                        verb_past = hav2 ? "had" : "were";
                    }
                }
                if (C.loadChar(pfx))
                    C.callLocal(enlght_line, pfx, final ? verb_past : verb_present, sfx, "");
                else if (hav2)
                    C.callLocal(enlght_line, You_, final ? had : have, buf, "");
                else
                    C.callLocal(enlght_line, You_, final ? were : are, buf, "");
            } /* wtype2 != wtype */

            /* if training and available skill credits already allow
               #enhance for any of primary, secondary, or two-weapon,
               tell the player; avoid attempting figure out whether
               spending skill credits enhancing one might make either
               or both of the others become ineligible for enhancement */
            a1 = C.schar(C.can_advance(wtype, 0));
            a2 = C.schar((wtype2 != wtype) ? C.can_advance(wtype2, 0) : 0);
            ab = C.schar(C.can_advance(C.P_TWO_WEAPON_COMBAT, 0));
            if (a1 || a2 || ab) {
                const also_wik_ = " and also with ";

                /* for just one, the conditionals yield
                   1) "skill with <that one>"; for more than one:
                   2) "skills with <primary> and also with <secondary>" or
                   3) "skills with <primary> and also with two-weapons" or
                   4) "skills with <secondary> and also with two-weapons" or
                   5) "skills with <primary>, <secondary>, and two-weapons"
                   (no 'also's or extra 'with's for case 5); when primary
                   and secondary use the same skill, only cases 1 and 3 are
                   possible because 'a2' gets forced to False above */
                C.Sprintf(sfx, " skill%s with %s%s%s%s%s",
                        (C.int(a1) + C.int(a2) + C.int(ab) > 1) ? "s" : "",
                        a1 ? C.skill_name(wtype) : "",
                        ((a1 && a2 && ab) ? ", "
                         : (a1 && (a2 || ab)) ? also_wik_ : ""),
                        a2 ? C.skill_name(wtype2) : "",
                        ((a1 && a2 && ab) ? ", and "
                         : (a2 && ab) ? also_wik_ : ""),
                        ab ? "two weapons" : "");
                C.callLocal(enlght_line, You_, final ? "could have enhanced" : "can enhance", sfx, "");
            }
        } /* two-weapon */
    } /* skill applies */
}

export function item_resistance_message(adtyp, prot_message, final)
{
    adtyp=C.int(adtyp);final=C.int(final);
    let protection = C.int(C.u_adtyp_resistance_obj(adtyp));

    if (protection) {
        let somewhat = C.schar(protection < 99);

        C.callLocal(enlght_line, "Your items ", final ? somewhat ? "were somewhat" : "were" : somewhat ? "are somewhat" : "are", prot_message, C.item_what(adtyp));
    }
}

/* attributes: intrinsics and the like, other non-obvious capabilities */
export function attributes_enlightenment(unused_mode, final)
{
    unused_mode=C.int(unused_mode);final=C.int(final);
    const if_surroundings_permitted = " if surroundings permitted";
    let ltmp, armpro, warnspecies;
    const buf = C.stackAlloc(C.BUFSZ);

    /*\
     *  Attributes
    \*/
    C.callLocal(enlght_out, "");
    C.callLocal(enlght_out, final ? "Final Attributes:" : "Attributes:");

    if (C.u.uevent.uhand_of_elbereth) {
        const hofe_titles = [ "the Hand of Elbereth",
                                                    "the Envoy of Balance",
                                                    "the Glory of Arioch" ];
        C.callLocal(enlght_line, You_, final ? were : are, hofe_titles[C.u.uevent.uhand_of_elbereth - 1], "");
    }

    C.Sprintf(buf, "%s", C.callLocal(piousness, 1, "aligned"));
    if (C.u.ualign.record >= 0)
        C.callLocal(enlght_line, You_, final ? were : are, buf, "");
    else
        C.callLocal(enlght_line, You_, final ? had : have, buf, "");

    if (C.wizard) {
        C.Sprintf(buf, " %d", C.u.ualign.record);
        C.callLocal(enlght_line, "Your alignment ", final ? "was" : "is", buf, "");
    }

    /*** Resistances to troubles ***/
    if (C.Invulnerable)
        C.callLocal(enlght_line, You_, final ? were : are, "invulnerable", C.from_what(C.INVULNERABLE));
    if (C.Antimagic)
        C.callLocal(enlght_line, You_, final ? were : are, "magic-protected", C.from_what(C.ANTIMAGIC));
    if (C.Fire_resistance)
        C.callLocal(enlght_line, You_, final ? were : are, "fire resistant", C.from_what(C.FIRE_RES));
    C.callLocal(item_resistance_message, C.AD_FIRE, " protected from fire", final);
    if (C.Cold_resistance)
        C.callLocal(enlght_line, You_, final ? were : are, "cold resistant", C.from_what(C.COLD_RES));
    C.callLocal(item_resistance_message, C.AD_COLD, " protected from cold", final);
    if (C.Sleep_resistance)
        C.callLocal(enlght_line, You_, final ? were : are, "sleep resistant", C.from_what(C.SLEEP_RES));
    if (C.Disint_resistance)
        C.callLocal(enlght_line, You_, final ? were : are, "disintegration resistant", C.from_what(C.DISINT_RES));
    C.callLocal(item_resistance_message, C.AD_DISN, " protected from disintegration", final);
    if (C.Shock_resistance)
        C.callLocal(enlght_line, You_, final ? were : are, "shock resistant", C.from_what(C.SHOCK_RES));
    C.callLocal(item_resistance_message, C.AD_ELEC, " protected from electric shocks",
                            final);
    if (C.Poison_resistance)
        C.callLocal(enlght_line, You_, final ? were : are, "poison resistant", C.from_what(C.POISON_RES));
    if (C.Acid_resistance) {
        C.Sprintf(buf, "%.20s%.30s",
                C.temp_resist(C.ACID_RES) ? "temporarily " : "",
                "acid resistant");
        C.callLocal(enlght_line, You_, final ? were : are, buf, C.from_what(C.ACID_RES));
    }
    C.callLocal(item_resistance_message, C.AD_ACID, " protected from acid", final);
    if (C.Drain_resistance)
        C.callLocal(enlght_line, You_, final ? were : are, "level-drain resistant", C.from_what(C.DRAIN_RES));
    if (C.Sick_resistance)
        C.callLocal(enlght_line, You_, final ? were : are, "immune to sickness", C.from_what(C.SICK_RES));
    if (C.Stone_resistance) {
        C.Sprintf(buf, "%.20s%.30s",
                C.temp_resist(C.STONE_RES) ? "temporarily " : "",
                "petrification resistant");
        C.callLocal(enlght_line, You_, final ? were : are, buf, C.from_what(C.STONE_RES));
    }
    if (C.Halluc_resistance)
        C.callLocal(enlght_line, You_, final ? "resisted" : "resist", " hallucinations", C.from_what(C.HALLUC_RES));
    if (C.u.uedibility)
        C.callLocal(enlght_line, You_, final ? could : can, "recognize detrimental food", "");

    /*** Vision and senses ***/
    if ((C.HBlinded || C.EBlinded) && C.BBlinded) /* blind w/ blindness blocked */
        C.callLocal(enlght_line, You_, final ? could : can, "see", C.from_what(-C.BLINDED)); /* Eyes of the Overworld */
    if (C.Blnd_resist && !C.Blind) /* skip if no eyes or blindfolded */
        C.callLocal(enlght_line, You_, final ? were : are, "not subject to light-induced blindness", C.from_what(C.BLND_RES));
    if (C.See_invisible) {
        if (!C.Blind)
            C.callLocal(enlght_line, You_, final ? "saw" : "see", " invisible", C.from_what(C.SEE_INVIS));
        else if (!C.PermaBlind)
            C.callLocal(enlght_line, You_, final ? "would have seen" : "will see", " invisible when not blind", "");
        else
            C.callLocal(enlght_line, You_, final ? "would have seen" : "would see", " invisible if not blind", "");
    }
    if (C.Blind_telepat)
        C.callLocal(enlght_line, You_, final ? were : are, "telepathic", C.from_what(C.TELEPAT));
    if (C.Warning)
        C.callLocal(enlght_line, You_, final ? were : are, "warned", C.from_what(C.WARNING));
    if (C.Warn_of_mon && C.svc.context.warntype.obj) {
        C.Sprintf(buf, "aware of the presence of %s",
                (C.svc.context.warntype.obj & C.M2_ORC) ? "orcs"
                : (C.svc.context.warntype.obj & C.M2_ELF) ? "elves"
                  : (C.svc.context.warntype.obj & C.M2_DEMON) ? "demons"
                    : C.something);
        C.callLocal(enlght_line, You_, final ? were : are, buf, C.from_what(C.WARN_OF_MON));
    }
    if (C.Warn_of_mon && C.svc.context.warntype.polyd) {
        C.Sprintf(buf, "aware of the presence of %s",
                ((C.svc.context.warntype.polyd & (C.M2_HUMAN | C.M2_ELF))
                 == (C.M2_HUMAN | C.M2_ELF)) ? "humans and elves"
                    : (C.svc.context.warntype.polyd & C.M2_HUMAN) ? "humans"
                      : (C.svc.context.warntype.polyd & C.M2_ELF) ? "elves"
                        : (C.svc.context.warntype.polyd & C.M2_ORC) ? "orcs"
                          : (C.svc.context.warntype.polyd & C.M2_DEMON) ? "demons"
                            : "certain monsters");
        C.callLocal(enlght_line, You_, final ? were : are, buf, "");
    }
    warnspecies =  C.int(C.svc.context.warntype.speciesidx);
    if (C.Warn_of_mon && C.ismnum(warnspecies)) {
        C.Sprintf(buf, "aware of the presence of %s",
                C.makeplural(C.mons[warnspecies].pmnames[C.NEUTRAL]));
        C.callLocal(enlght_line, You_, final ? were : are, buf, C.from_what(C.WARN_OF_MON));
    }
    if (C.Undead_warning)
        C.callLocal(enlght_line, You_, final ? were : are, "warned of undead", C.from_what(C.WARN_UNDEAD));
    if (C.Searching)
        C.callLocal(enlght_line, You_, final ? had : have, "automatic searching", C.from_what(C.SEARCHING));
    if (C.Clairvoyant) {
        C.callLocal(enlght_line, You_, final ? were : are, "clairvoyant", C.from_what(C.CLAIRVOYANT));
    } else if ((C.HClairvoyant || C.EClairvoyant) && C.BClairvoyant) {
        C.Strcpy(buf, C.from_what(-C.CLAIRVOYANT));
        C.strsubst(buf, " because of ", " if not for ");
        C.callLocal(enlght_line, You_, final ? "could have been" : "could be", " clairvoyant", buf);
    }
    if (C.Infravision)
        C.callLocal(enlght_line, You_, final ? had : have, "infravision", C.from_what(C.INFRAVISION));
    if (C.Detect_monsters) {
        C.Strcpy(buf, "sensing the presence of monsters");
        if (C.wizard) {
            let detectmon_timeout = (C.long(C.HDetect_monsters & C.TIMEOUT));

            if (detectmon_timeout)
                C.Sprintf(C.eos(buf), " (%ld)", detectmon_timeout);
        }
        C.callLocal(enlght_line, You_, final ? were : are, buf, "");
    }
    if (C.u.umconf) { /* 'u.umconf' is a counter rather than a timeout */
        C.Strcpy(buf, " monsters when hitting them");
        if (C.wizard && !final) {
            if (C.u.umconf == 1)
                C.Strcat(buf, " (next hit only)");
            else /* u.umconf > 1 */
                C.Sprintf(C.eos(buf), " (next %u hits)", C.u.umconf);
        }
        C.callLocal(enlght_line, You_, final ? "would have confused" : "will confuse", buf, "");
    }

    /*** Appearance and behavior ***/
    if (C.Adornment) {
        let adorn = C.int(0);

        if (C.uleft && C.uleft.otyp == C.RIN_ADORNMENT)
            adorn += C.uleft.spe;
        if (C.uright && C.uright.otyp == C.RIN_ADORNMENT)
            adorn += C.uright.spe;
        /* the sum might be 0 (+0 ring or two which negate each other);
           that yields "you are charismatic" (which isn't pointless
           because it potentially impacts seduction attacks) */
        C.Sprintf(buf, "%scharismatic",
                (adorn > 0) ? "more " : (adorn < 0) ? "less " : "");
        C.callLocal(enlght_line, You_, final ? were : are, buf, C.from_what(C.ADORNED));
    }
    if (C.Invisible)
        C.callLocal(enlght_line, You_, final ? were : are, "invisible", C.from_what(C.INVIS));
    else if (C.Invis)
        C.callLocal(enlght_line, You_, final ? were : are, "invisible to others", C.from_what(C.INVIS));
    /* ordinarily "visible" is redundant; this is a special case for
       the situation when invisibility would be an expected attribute */
    else if ((C.HInvis || C.EInvis) && C.BInvis)
        C.callLocal(enlght_line, You_, final ? were : are, "visible", C.from_what(-C.INVIS));
    if (C.Displaced)
        C.callLocal(enlght_line, You_, final ? were : are, "displaced", C.from_what(C.DISPLACED));
    if (C.Stealth) {
        C.callLocal(enlght_line, You_, final ? were : are, "stealthy", C.from_what(C.STEALTH));
    } else if (C.BStealth && (C.HStealth || C.EStealth)) {
        C.Sprintf(buf, " stealthy%s",
                (C.BStealth == C.FROMOUTSIDE) ? " if not mounted" : "");
        C.callLocal(enlght_line, You_, final ? "would have been" : "would be", buf, "");
    }
    if (C.Aggravate_monster)
        C.callLocal(enlght_line, "You aggravate", final ? "d" : "", " monsters", C.from_what(C.AGGRAVATE_MONSTER));
    if (C.Conflict)
        C.callLocal(enlght_line, "You cause", final ? "d" : "", " conflict", C.from_what(C.CONFLICT));

    /*** Transportation ***/
    if (C.Jumping)
        C.callLocal(enlght_line, You_, final ? could : can, "jump", C.from_what(C.JUMPING));
    if (C.Teleportation)
        C.callLocal(enlght_line, You_, final ? could : can, "teleport", C.from_what(C.TELEPORT));
    if (C.Teleport_control)
        C.callLocal(enlght_line, You_, final ? had : have, "teleport control", C.from_what(C.TELEPORT_CONTROL));
    /* actively levitating handled earlier as a status condition */
    if (C.BLevitation) { /* levitation is blocked */
        let save_BLev = C.long(C.BLevitation);

        C.BLevitation = C.long(0n);
        if (C.Levitation) {
            /* either trapped in the floor or inside solid rock
               (or both if chained to buried iron ball and have
               moved one step into solid rock somehow) */
            let trapped = C.schar((save_BLev & C.I_SPECIAL) != 0n),
                    terrain = C.schar((save_BLev & C.FROMOUTSIDE) != 0n);

            C.Sprintf(buf, "%s%s%s",
                    trapped ? " if not trapped" : "",
                    (trapped && terrain) ? " and" : "",
                    terrain ? if_surroundings_permitted : "");
            C.callLocal(enlght_line, You_, final ? "would have levitated" : "would levitate", buf, "");
        }
        C.BLevitation = C.long(save_BLev);
    }
    /* actively flying handled earlier as a status condition */
    if (C.BFlying) { /* flight is blocked */
        let save_BFly = C.long(C.BFlying);

        C.BFlying = C.long(0n);
        if (C.Flying) {
            C.callLocal(enlght_line, You_, final ? "would have flown" : "would fly", /* wording quibble: for past tense, "hadn't been"
                       would sound better than "weren't" (and
                       "had permitted" better than "permitted"), but
                       "weren't" and "permitted" are adequate so the
                       extra complexity to handle that isn't worth it */
                    C.Levitation
                       ? " if you weren't levitating"
                       : (save_BFly == C.I_SPECIAL)
                          /* this is an oversimplification; being trapped
                             might also be blocking levitation so flight
                             would still be blocked after escaping trap */
                          ? " if you weren't trapped"
                          : (save_BFly == C.FROMOUTSIDE)
                             ? if_surroundings_permitted
                             /* two or more of levitation, surroundings,
                                and being trapped in the floor */
                             : " if circumstances permitted", "");
        }
        C.BFlying = C.long(save_BFly);
    }
    /* including this might bring attention to the fact that ceiling
       clinging has inconsistencies... */
    if (C.is_clinger(C.gy.youmonst.data)) {
        let has_lid = C.schar(C.has_ceiling(C.u.uz));

        if (has_lid && !C.u.uinwater) {
            C.callLocal(enlght_line, You_, final ? could : can, "cling to the ceiling", "");
        } else {
            C.Sprintf(buf, " to the ceiling if %s%s%s",
                    !has_lid ? "there was one" : "",
                    (!has_lid && C.u.uinwater) ? " and " : "",
                    C.u.uinwater ? (C.Underwater ? "you weren't underwater"
                                  : "you weren't in the water") : "");
            /* past tense is applicable for death while Unchanging */
            C.callLocal(enlght_line, You_, final ? "could have clung" : "could cling", buf, "");
        }
    }
    /* actively walking on water handled earlier as a status condition */
    if (C.Wwalking && !C.callLocal(walking_on_water))
        C.callLocal(enlght_line, You_, final ? could : can, "walk on water", C.from_what(C.WWALKING));
    /* actively swimming (in water but not under it) handled earlier */
    if (C.Swimming && (C.Underwater || !C.u.uinwater))
        C.callLocal(enlght_line, You_, final ? could : can, "swim", C.from_what(C.SWIMMING));
    if (C.Breathless)
        C.callLocal(enlght_line, You_, final ? could : can, "survive without air", C.from_what(C.MAGICAL_BREATHING));
    else if (C.Amphibious)
        C.callLocal(enlght_line, You_, final ? could : can, "breathe water", C.from_what(C.MAGICAL_BREATHING));
    if (C.Passes_walls)
        C.callLocal(enlght_line, You_, final ? could : can, "walk through walls", C.from_what(C.PASSES_WALLS));

    /*** Physical attributes ***/
    if (C.Regeneration)
        C.callLocal(enlght_line, "You regenerate", final ? "d" : "", "", C.from_what(C.REGENERATION));
    if (C.Slow_digestion)
        C.callLocal(enlght_line, You_, final ? had : have, "slower digestion", C.from_what(C.SLOW_DIGESTION));
    if (C.u.uhitinc) {
        C.callLocal(enlght_combatinc, "to hit", C.u.uhitinc, final, buf);
        if (C.iflags.tux_penalty && !C.Upolyd)
            C.Sprintf(C.eos(buf), " %s your suit's penalty",
                    (C.u.uhitinc < 0) ? "increasing"
                    : (C.u.uhitinc < Math.trunc(4 * C.gu.urole.spelarmr / 5))
                      ? "partly offsetting"
                      : (C.u.uhitinc < C.gu.urole.spelarmr) ? "nearly offsetting"
                        : "overcoming");
        C.callLocal(enlght_line, You_, final ? had : have, buf, "");
    }
    if (C.u.udaminc)
        C.callLocal(enlght_line, You_, final ? had : have, C.callLocal(enlght_combatinc, "damage", C.u.udaminc, final, buf), "");
    if (C.u.uspellprot || C.Protection) {
        let prot = C.int(0);

        if (C.uleft && C.uleft.otyp == C.RIN_PROTECTION)
            prot += C.uleft.spe;
        if (C.uright && C.uright.otyp == C.RIN_PROTECTION)
            prot += C.uright.spe;
        if (C.uamul && C.uamul.otyp == C.AMULET_OF_GUARDING)
            prot += 2;
        if (C.HProtection & C.INTRINSIC)
            prot += C.u.ublessed;
        prot += C.u.uspellprot;
        if (prot)
            C.callLocal(enlght_line, You_, final ? had : have, C.callLocal(enlght_combatinc, "defense", prot, final, buf), "");
    }
    if ((armpro = C.int(C.magic_negation(C.gy.youmonst))) > 0) {
        /* magic cancellation factor, conferred by worn armor */
        const mc_types = [
            "" /*ordinary*/, "warded", "guarded", "protected",
        ];
        /* sanity check */
        if (armpro >= mc_types.length)
            armpro = C.int(mc_types.length - 1);
        C.callLocal(enlght_line, You_, final ? were : are, mc_types[armpro], "");
    }
    if (C.Half_physical_damage)
        C.callLocal(enlght_halfdmg, C.HALF_PHDAM, final);
    if (C.Half_spell_damage)
        C.callLocal(enlght_halfdmg, C.HALF_SPDAM, final);
    if (C.Half_gas_damage)
        C.callLocal(enlght_line, You_, final ? "took" : "take", " reduced poison gas damage", "");
    if (C.spellid(0) > C.NO_SPELL) { /* skip if no spells are known yet */
        /* greatly simplified edition of percent_success(spell.c)--may need
           to be suppressed if oversimplification leads to player confusion */
        const cast_adj = C.stackAlloc(C.QBUFSZ);
        let suit = C.schar(Number(Boolean(C.uarm && C.is_metallic(C.uarm)))),
                robe = C.schar(Number(Boolean(C.uarmc && C.uarmc.otyp == C.ROBE)));

        C.storeChar(cast_adj, 0);
        if (suit) /* omit "wearing" to shorten the text */
            C.Sprintf(cast_adj, " impaired by metallic armor%s",
                    robe ? ", mitigated by your robe" : "");
        else if (robe)
            C.Strcpy(cast_adj, " enhanced by wearing a robe");

        if (C.loadChar(cast_adj))
            C.callLocal(enlght_line, "Your spell casting ", final ? "was" : "is", cast_adj, "");
    }
    /* polymorph and other shape change */
    if (C.Protection_from_shape_changers)
        C.callLocal(enlght_line, You_, final ? were : are, "protected from shape changers", C.from_what(C.PROT_FROM_SHAPE_CHANGERS));
    if (C.Unchanging) {
        let what = 0;

        if (!C.Upolyd) /* Upolyd handled below after current form */
            C.callLocal(enlght_line, You_, final ? could : can, "not change from your current form", C.from_what(C.UNCHANGING));
        /* blocked shape changes */
        if (C.Polymorph)
            what = !final ? "polymorph" : "have polymorphed";
        else if (C.ismnum(C.u.ulycn))
            what = !final ? "change shape" : "have changed shape";
        if (what) {
            C.Sprintf(buf, "would %s periodically", what);
            /* omit from_what(UNCHANGING); too verbose */
            C.callLocal(enlght_line, You_, final ? buf : buf, " if not locked into your current form", "");
        }
    } else if (C.Polymorph) {
        C.callLocal(enlght_line, You_, final ? were : are, "polymorphing periodically", C.from_what(C.POLYMORPH));
    }
    if (C.Polymorph_control)
        C.callLocal(enlght_line, You_, final ? had : have, "polymorph control", C.from_what(C.POLYMORPH_CONTROL));
    if (C.Upolyd && C.u.umonnum != C.u.ulycn
        /* if we've died from turning into slime, we're polymorphed
           right now but don't want to list it as a temporary attribute
           [we need a more reliable way to detect this situation] */
        && !(final == C.ENL_GAMEOVERDEAD
             && C.u.umonnum == C.PM_GREEN_SLIME && !C.Unchanging)) {
        /* foreign shape (except were-form which is handled below) */
        if (!C.vampshifted(C.gy.youmonst))
            C.Sprintf(buf, "polymorphed into %s",
                    C.an(C.pmname(C.gy.youmonst.data,
                              C.flags.female ? C.FEMALE : C.MALE)));
        else
            C.Sprintf(buf, "polymorphed into %s in %s form",
                    C.an(C.pmname(C.mons[C.gy.youmonst.cham],
                              C.flags.female ? C.FEMALE : C.MALE)),
                    C.pmname(C.gy.youmonst.data, C.flags.female ? C.FEMALE : C.MALE));
        if (C.wizard)
            C.Sprintf(C.eos(buf), " (%d)", C.u.mtimedone);
        C.callLocal(enlght_line, You_, final ? were : are, buf, "");
    }
    if (C.lays_eggs(C.gy.youmonst.data) && C.flags.female) /* Upolyd */
        C.callLocal(enlght_line, You_, final ? could : can, "lay eggs", "");
    if (C.ismnum(C.u.ulycn)) {
        /* "you are a werecreature [in beast form]" */
        C.Strcpy(buf, C.an(C.pmname(C.mons[C.u.ulycn],
               C.flags.female ? C.FEMALE : C.MALE)));
        if (C.u.umonnum == C.u.ulycn) {
            C.Strcat(buf, " in beast form");
            if (C.wizard)
                C.Sprintf(C.eos(buf), " (%d)", C.u.mtimedone);
        }
        C.callLocal(enlght_line, You_, final ? were : are, buf, "");
    }
    if (C.Unchanging && C.Upolyd) /* !Upolyd handled above */
        C.callLocal(enlght_line, You_, final ? could : can, "not change from your current form", C.from_what(C.UNCHANGING));
    if (C.Hate_silver)
        C.callLocal(enlght_line, You_, final ? were : are, "harmed by silver", "");
    /* movement and non-armor-based protection */
    if (C.Fast)
        C.callLocal(enlght_line, You_, final ? were : are, C.Very_fast ? "very fast" : "fast", C.from_what(C.FAST));
    if (C.Reflecting)
        C.callLocal(enlght_line, You_, final ? had : have, "reflection", C.from_what(C.REFLECTING));
    if (C.Free_action)
        C.callLocal(enlght_line, You_, final ? had : have, "free action", C.from_what(C.FREE_ACTION));
    if (C.Fixed_abil)
        C.callLocal(enlght_line, You_, final ? had : have, "fixed abilities", C.from_what(C.FIXED_ABIL));
    if (C.Lifesaved)
        C.callLocal(enlght_line, "Your life ", final ? "would have been" : "will be", " saved", "");

    /*** Miscellany ***/
    if (C.Luck) {
        ltmp = C.int(C.abs(C.int(C.Luck)));
        C.Sprintf(buf, "%s%slucky",
                ltmp >= 10 ? "extremely " : ltmp >= 5 ? "very " : "",
                C.Luck < 0 ? "un" : "");
        if (C.wizard)
            C.Sprintf(C.eos(buf), " (%d)", C.Luck);
        C.callLocal(enlght_line, You_, final ? were : are, buf, "");
    } else if (C.wizard)
        C.callLocal(enlght_line, "Your luck ", final ? "was" : "is", " zero", "");
    if (C.u.moreluck > 0)
        C.callLocal(enlght_line, You_, final ? had : have, "extra luck", "");
    else if (C.u.moreluck < 0)
        C.callLocal(enlght_line, You_, final ? had : have, "reduced luck", "");
    if (C.carrying(C.LUCKSTONE) || C.stone_luck(1)) {
        ltmp = C.int(C.stone_luck(0));
        if (ltmp <= 0)
            C.callLocal(enlght_line, "Bad luck ", final ? "did" : "does", " not time out for you", "");
        if (ltmp >= 0)
            C.callLocal(enlght_line, "Good luck ", final ? "did" : "does", " not time out for you", "");
    }

    if (C.u.ugangr) {
        C.Sprintf(buf, " %sangry with you",
                C.u.ugangr > 6 ? "extremely " : C.u.ugangr > 3 ? "very " : "");
        if (C.wizard)
            C.Sprintf(C.eos(buf), " (%d)", C.u.ugangr);
        C.callLocal(enlght_line, C.u_gname(), final ? " was" : " is", buf, "");
    } else {
        /*
         * We need to suppress this when the game is over, because death
         * can change the value calculated by can_pray(), potentially
         * resulting in a false claim that you could have prayed safely.
         */
        if (!final) {
// #if 0
            
/* "can [not] safely pray" vs "could [not] have safely prayed" */
//             Sprintf(buf, "%s%ssafely pray%s", can_pray(FALSE) ? "" : "not ",
//                     final ? "have " : "", final ? "ed" : "");
// #else
            C.Sprintf(buf, "%ssafely pray", C.can_pray(0) ? "" : "not ");
// #endif
            if (C.wizard)
                C.Sprintf(C.eos(buf), " (%d)", C.u.ublesscnt);
            C.callLocal(enlght_line, You_, final ? could : can, buf, "");
        }
    }

// #ifdef DEBUG
    /* named fruit debugging (doesn't really belong here...); to enable,
       include 'fruit' in DEBUGFILES list (even though it isn't a file...) */
    if (C.wizard && C.explicitdebug("fruit")) {
        let f;

        C.reorder_fruit(1); /* sort by fruit index, from low to high;
                              * this modifies the gf.ffruit chain, so could
                              * possibly mask or even introduce a problem,
                              * but it does useful sanity checking */
        for (f = C.gf.ffruit; f; f = f.nextf) {
            C.Sprintf(buf, "Fruit #%d ", f.fid);
            C.callLocal(enlght_line, buf, final ? "was " : "is ", f.fname, "");
        }
        C.callLocal(enlght_line, "The current fruit ", final ? "was " : "is ", C.svp.pl_fruit, "");
        C.Sprintf(buf, "%d", C.flags.made_fruit);
        C.callLocal(enlght_line, "The made fruit flag ", final ? "was " : "is ", buf, "");
    }
// #endif

    {
        let p;

        C.storeChar(C.ptrAdd(buf, 0), 0);
        if (final < 2) { /* still in progress, or quit/escaped/ascended */
            p = "survived after being killed ";
            if (!C.u.umortality)
                p = !final ? 0 : "survived";
            else
                C.callLocal(N_times, C.long(C.u.umortality), buf);
        } else { /* game ended in character's death */
            p = "are dead";
            switch (C.u.umortality) {
            case 0:
                C.impossible("dead without dying?");
                
                /* FALLTHRU */
            case 1:
                break; /* just "are dead" */
            default:
                C.Sprintf(buf, " (%d%s time!)", C.u.umortality,
                        C.ordin(C.u.umortality));
                break;
            }
        }
        if (p)
            C.callLocal(enlght_line, You_, final ? p : "have been killed ", buf, "");
    }
}

/* ^X command */
export function doattributes()
{
    let mode = C.int(C.BASICENLIGHTENMENT);

    /* show more--as if final disclosure--for wizard and explore modes */
    if (C.wizard || C.discover)
        mode |= C.MAGICENLIGHTENMENT;

    C.callLocal(enlightenment, mode, C.ENL_GAMEINPROGRESS);
    return C.ECMD_OK;
}

export function youhiding(via_enlghtmt, msgflag) /* enlightenment line vs topl message */          /* for variant message phrasing */
{
    via_enlghtmt=C.schar(via_enlghtmt);msgflag=C.int(msgflag);
    let bp;
    const buf = C.stackAlloc(C.BUFSZ);

    C.Strcpy(buf, "hiding");
    if (C.U_AP_TYPE != C.M_AP_NOTHING) {
        /* mimic; hero is only able to mimic a strange object or gold
           or hallucinatory alternative to gold, so we skip the details
           for the hypothetical furniture and monster cases */
        bp = C.eos(C.strcpy(buf, "mimicking"));
        if (C.U_AP_TYPE == C.M_AP_OBJECT) {
            C.Sprintf(bp, " %s", C.an(C.simple_typename(C.gy.youmonst.mappearance)));
        } else if (C.U_AP_TYPE == C.M_AP_FURNITURE) {
            C.Strcpy(bp, " something");
        } else if (C.U_AP_TYPE == C.M_AP_MONSTER) {
            C.Strcpy(bp, " someone");
        } else {
            ; /* something unexpected; leave 'buf' as-is */
        }
    } else if (C.u.uundetected) {
        bp = C.eos(buf); /* points past "hiding" */
        if (C.gy.youmonst.data.mlet == C.S_EEL) {
            if (C.is_pool(C.u.ux, C.u.uy))
                C.Sprintf(bp, " in the %s", C.waterbody_name(C.u.ux, C.u.uy));
        } else if (C.hides_under(C.gy.youmonst.data)) {
            let o = C.svl.level.objects[C.u.ux][C.u.uy];

            if (o)
                C.Sprintf(bp, " underneath %s", C.ansimpleoname(o));
        } else if (C.is_clinger(C.gy.youmonst.data) || C.Flying) {
            /* Flying: 'lurker above' hides on ceiling but doesn't cling */
            C.Sprintf(bp, " on the %s", C.ceiling(C.u.ux, C.u.uy));
        } else {
            /* on floor; is_hider() but otherwise not special: 'trapper' */
            if (C.u.utrap && C.u.utraptype == C.TT_PIT) {
                let t = C.t_at(C.u.ux, C.u.uy);

                C.Sprintf(bp, " in a %spit",
                        (t && t.ttyp == C.SPIKED_PIT) ? "spiked " : "");
            } else
                C.Sprintf(bp, " on the %s", C.surface(C.u.ux, C.u.uy));
        }
    } else {
        ; /* shouldn't happen; will result in generic "you are hiding" */
    }

    if (via_enlghtmt) {
        let final = C.int(msgflag); /* 'final' is used by you_are() macro */

        C.callLocal(enlght_line, You_, final ? were : are, buf, "");
    } else {
        /* for dohide(), when player uses '#monster' command */
        C.You("are %s %s.", msgflag ? "already" : "now", buf);
    }
}

/* #conduct command [KMH]; shares enlightenment's tense handling */
export function doconduct()
{
    C.callLocal(show_conduct, C.ENL_GAMEINPROGRESS);
    return C.ECMD_OK;
}

/* display conducts; for doconduct(), also disclose() and dump_everything() */
export function show_conduct(final)
{
    final=C.int(final);
    const buf = C.stackAlloc(C.BUFSZ);
    const bufN = C.stackAlloc(40);
    let ngenocided;

    /* Create the conduct window */
    C.ge.en_win = C.int(C.create_nhwindow(C.NHW_MENU));
    C.putstr(C.ge.en_win, 0, "Voluntary challenges:");

    /* rerolling; "You <this or that>" is about the character, rerolling
       is about the player so phrase it differently;
       also, always use past tense since the chance to do something with it
       is gone by time player can issue #conduct command or see disclosure */
    if (!C.u.uroleplay.reroll)
        C.Strcpy(buf, " Character rerolling was not enabled.");
    else if (!C.u.uroleplay.numrerolls)
        C.Strcpy(buf, " Your character was not rerolled.");
    else
        C.Sprintf(buf, " Your character was rerolled %s.",
                C.callLocal(N_times, C.u.uroleplay.numrerolls, bufN));
    C.callLocal(enlght_out, buf);

    if (C.u.uroleplay.blind)
        C.callLocal(enlght_line, You_, final ? were : have_been, "blind from birth", "");
    if (C.u.uroleplay.deaf)
        C.callLocal(enlght_line, You_, final ? were : have_been, "deaf from birth", "");
    /* note: we don't report "you are without possessions" unless the
       game started with the pauper option set */
    if (C.u.uroleplay.pauper)
        C.callLocal(enlght_line, You_, final ? "started out" : C.gi.invent ? "started" : "are", " without possessions", "");
    /* nudist is far more than a subset of possessionless, and a much
       more impressive accomplishment, but showing "started out without
       possessions" before "faithfully nudist" looks more logical */
    if (C.u.uroleplay.nudist)
        C.callLocal(enlght_line, You_, final ? were : have_been, "faithfully nudist", "");

    if (!C.u.uconduct.food)
        C.callLocal(enlght_line, You_, final ? "went" : "have gone", " without food", "");
        /* but beverages are okay */
    else if (!C.u.uconduct.unvegan)
        C.callLocal(enlght_line, You_, final ? "" : have, "followed a strict vegan diet", "");
    else if (!C.u.uconduct.unvegetarian)
        C.callLocal(enlght_line, You_, final ? were : have_been, "vegetarian", "");

    if (!C.u.uconduct.gnostic)
        C.callLocal(enlght_line, You_, final ? were : have_been, "an atheist", "");

    if (!C.u.uconduct.weaphit) {
        C.callLocal(enlght_line, You_, final ? never : have_never, "hit with a wielded weapon", "");
    } else if (C.wizard) {
        C.Sprintf(buf, "hit with a wielded weapon %ld time%s",
                C.u.uconduct.weaphit, C.plur(C.u.uconduct.weaphit));
        C.callLocal(enlght_line, You_, final ? "" : have, buf, "");
    }
    if (!C.u.uconduct.killer)
        C.callLocal(enlght_line, You_, final ? were : have_been, "a pacifist", "");

    if (!C.u.uconduct.literate) {
        C.callLocal(enlght_line, You_, final ? were : have_been, "illiterate", "");
    } else if (C.wizard) {
        C.Sprintf(buf, "read items or engraved %ld time%s", C.u.uconduct.literate,
                C.plur(C.u.uconduct.literate));
        C.callLocal(enlght_line, You_, final ? "" : have, buf, "");
    }

    if (!C.u.uconduct.pets)
        C.callLocal(enlght_line, You_, final ? never : have_never, "had a pet", "");

    ngenocided = C.int(C.callLocal(num_genocides));
    if (ngenocided == 0) {
        C.callLocal(enlght_line, You_, final ? never : have_never, "genocided any monsters", "");
    } else {
        C.Sprintf(buf, "genocided %d type%s of monster%s", ngenocided,
                C.plur(ngenocided), C.plur(ngenocided));
        C.callLocal(enlght_line, You_, final ? "" : have, buf, "");
    }

    if (!C.u.uconduct.polypiles) {
        C.callLocal(enlght_line, You_, final ? never : have_never, "polymorphed an object", "");
    } else if (C.wizard) {
        C.Sprintf(buf, "polymorphed %ld item%s", C.u.uconduct.polypiles,
                C.plur(C.u.uconduct.polypiles));
        C.callLocal(enlght_line, You_, final ? "" : have, buf, "");
    }

    if (!C.u.uconduct.polyselfs) {
        C.callLocal(enlght_line, You_, final ? never : have_never, "changed form", "");
    } else if (C.wizard) {
        C.Sprintf(buf, "changed form %ld time%s", C.u.uconduct.polyselfs,
                C.plur(C.u.uconduct.polyselfs));
        C.callLocal(enlght_line, You_, final ? "" : have, buf, "");
    }

    if (!C.u.uconduct.wishes) {
        C.callLocal(enlght_line, You_, final ? "" : have, "used no wishes", "");
    } else {
        C.Sprintf(buf, "used %ld wish%s", C.u.uconduct.wishes,
                (C.u.uconduct.wishes > 1n) ? "es" : "");
        if (C.u.uconduct.wisharti) {
            /* if wisharti == wishes
             *  1 wish (for an artifact)
             *  2 wishes (both for artifacts)
             *  N wishes (all for artifacts)
             * else (N is at least 2 in order to get here; M < N)
             *  N wishes (1 for an artifact)
             *  N wishes (M for artifacts)
             */
            if (C.u.uconduct.wisharti == C.u.uconduct.wishes)
                C.Sprintf(C.eos(buf), " (%s",
                        (C.u.uconduct.wisharti > 2n) ? "all "
                          : (C.u.uconduct.wisharti == 2n) ? "both " : "");
            else
                C.Sprintf(C.eos(buf), " (%ld ", C.u.uconduct.wisharti);

            C.Sprintf(C.eos(buf), "for %s)",
                    (C.u.uconduct.wisharti == 1n) ? "an artifact"
                                                : "artifacts");
        }
        C.callLocal(enlght_line, You_, final ? "" : have, buf, "");

        if (!C.u.uconduct.wisharti)
            C.callLocal(enlght_line, You_, final ? "did not wish" : "have not wished", " for any artifacts", "");
    }

    /* only report Sokoban conduct if the Sokoban branch has been entered */
    if (C.callLocal(sokoban_in_play)) {
        let presentverb = "have violated", pastverb = "violated";

        if (!C.u.uconduct.sokocheat) {
            presentverb = "have not violated";
            pastverb = "did not violate";
            C.Strcpy(buf, " any of the special Sokoban rules");
        } else {
            C.Strcpy(buf, " the special Sokoban rules ");
            C.Strcat(buf, C.callLocal(N_times, C.u.uconduct.sokocheat, bufN));
        }
        C.callLocal(enlght_line, You_, final ? pastverb : presentverb, buf, "");
    }

    C.callLocal(show_achievements, final);

    /* Pop up the window and wait for a key */
    C.display_nhwindow(C.ge.en_win, 1);
    C.destroy_nhwindow(C.ge.en_win);
    C.ge.en_win = C.int(C.WIN_ERR);
}

/*
 *      Achievements (see 'enum achievements' in you.h).
 */

export function show_achievements(final) /* 'final' is used "behind the curtain" by enl_foo() macros */
{
    final=C.int(final);
    let i, achidx, absidx, acnt;
    const title = C.stackAlloc(C.QBUFSZ);
    const buf = C.stackAlloc(C.QBUFSZ);
    let awin = C.int(C.WIN_ERR);

    /* unfortunately we can't show the achievements (at least not all of
       them) while the game is in progress because it would give away the
       ID of luckstone (at Mine's End) and of real Amulet of Yendor */
    if (!final && !C.wizard)
        return;

    /* first, figure whether any achievements have been accomplished
       so that we don't show the header for them if the resulting list
       below it would be empty */
    if ((acnt = C.int(C.callLocal(count_achievements))) == 0)
        return;

    if (C.ge.en_win != C.WIN_ERR) {
        awin = C.int(C.ge.en_win); /* end of game disclosure window */
        C.putstr(awin, 0, "");
    } else {
        awin = C.int(C.create_nhwindow(C.NHW_MENU));
    }
    C.Sprintf(title, "Achievement%s:", C.plur(acnt));
    C.putstr(awin, 0, title);

    /* display achievements in the order in which they were recorded;
       lone exception is to defer the Amulet if we just ascended;
       it warrants alternate wording when given away during ascension,
       but the Amulet achievement is always attained before entering
       endgame and the alternate wording looks strange if shown before
       "reached endgame" and "reached Astral" */
    if (C.callLocal(remove_achievement, C.ACH_UWIN)) { /* UWIN == Ascended! */
        /* for ascension, force it to be last and Amulet next to last
           by taking them out and then adding them back */
        if (C.callLocal(remove_achievement, C.ACH_AMUL)) /* should always be True here */
            C.callLocal(record_achievement, C.ACH_AMUL);
        C.callLocal(record_achievement, C.ACH_UWIN);
    }
    for (i = C.int(0); i < acnt; ++i) {
        achidx = C.int(C.u.uachieved[i]);
        absidx = C.int(C.abs(achidx));

        switch (absidx) {
        case C.ACH_BLND:
            C.callLocal(enlght_line, You_, final ? "explored" : "are exploring", " without being able to see", "");
            break;
        case C.ACH_NUDE:
            C.callLocal(enlght_line, You_, final ? "went" : "have gone", " without any armor", "");
            break;
        case C.ACH_MINE:
            C.callLocal(enlght_line, You_, final ? "" : have, "entered the Gnomish Mines", "");
            break;
        case C.ACH_TOWN:
            C.callLocal(enlght_line, You_, final ? "" : have, "entered Minetown", "");
            break;
        case C.ACH_SHOP:
            C.callLocal(enlght_line, You_, final ? "" : have, "entered a shop", "");
            break;
        case C.ACH_TMPL:
            C.callLocal(enlght_line, You_, final ? "" : have, "entered a temple", "");
            break;
        case C.ACH_ORCL:
            C.callLocal(enlght_line, You_, final ? "" : have, "consulted the Oracle of Delphi", "");
            break;
        case C.ACH_NOVL:
            C.callLocal(enlght_line, You_, final ? "" : have, "read from a Discworld novel", "");
            break;
        case C.ACH_SOKO:
            C.callLocal(enlght_line, You_, final ? "" : have, "entered Sokoban", "");
            break;
        case C.ACH_SOKO_PRIZE: /* hard to reach guaranteed bag or amulet */
            C.callLocal(enlght_line, You_, final ? "" : have, "completed Sokoban", "");
            break;
        case C.ACH_MINE_PRIZE: /* hidden guaranteed luckstone */
            C.callLocal(enlght_line, You_, final ? "" : have, "completed the Gnomish Mines", "");
            break;
        case C.ACH_BGRM:
            C.callLocal(enlght_line, You_, final ? "" : have, "entered the Big Room", "");
            break;
        case C.ACH_MEDU:
            C.callLocal(enlght_line, You_, final ? "" : have, "defeated Medusa", "");
            break;
        case C.ACH_TUNE:
            C.callLocal(enlght_line, You_, final ? "" : have, "learned the tune to open and close the Castle's drawbridge", "");
            break;
        case C.ACH_BELL:
            /* alternate phrasing for present vs past and also for
               possessing the item vs once held it */
            C.callLocal(enlght_line, You_, final ? C.u.uhave.bell ? "had" : "handled" : C.u.uhave.bell ? "have" : "have handled", " the Bell of Opening", "");
            break;
        case C.ACH_HELL:
            C.callLocal(enlght_line, You_, final ? "" : "have ", "entered Gehennom", "");
            break;
        case C.ACH_CNDL:
            C.callLocal(enlght_line, You_, final ? C.u.uhave.menorah ? "had" : "handled" : C.u.uhave.menorah ? "have" : "have handled", " the Candelabrum of Invocation", "");
            break;
        case C.ACH_BOOK:
            C.callLocal(enlght_line, You_, final ? C.u.uhave.book ? "had" : "handled" : C.u.uhave.book ? "have" : "have handled", " the Book of the Dead", "");
            break;
        case C.ACH_INVK:
            C.callLocal(enlght_line, You_, final ? "" : have, "gained access to Moloch's Sanctum", "");
            break;
        case C.ACH_AMUL:
            /* alternate wording for ascended (always past tense) since
               hero had it until #offer forced it to be relinquished */
            C.callLocal(enlght_line, You_, final ? C.u.uevent.ascended ? "delivered"
                     : C.u.uhave.amulet ? "had" : "had obtained" : C.u.uhave.amulet ? "have" : "have obtained", " the Amulet of Yendor", "");
            break;

        /* reaching Astral makes feedback about reaching the Planes
           be redundant and ascending makes both be redundant, but
           we display all that apply */
        case C.ACH_ENDG:
            C.callLocal(enlght_line, You_, final ? "" : have, "reached the Elemental Planes", "");
            break;
        case C.ACH_ASTR:
            C.callLocal(enlght_line, You_, final ? "" : have, "reached the Astral Plane", "");
            break;
        case C.ACH_UWIN:
            /* the ultimate achievement... */
            C.callLocal(enlght_out, " You ascended!");
            break;

        /* rank 0 is the starting condition, not an achievement; 8 is Xp 30 */
        case C.ACH_RNK1: case C.ACH_RNK2: case C.ACH_RNK3: case C.ACH_RNK4:
        case C.ACH_RNK5: case C.ACH_RNK6: case C.ACH_RNK7: case C.ACH_RNK8:
            C.Sprintf(buf, "attained the rank of %s",
                    C.rank_of(C.rank_to_xlev(absidx - (C.ACH_RNK1 - 1)),
                            C.Role_switch, (achidx < 0) ? 1 : 0));
            C.callLocal(enlght_line, You_, final ? "" : have, buf, "");
            break;

        default:
            C.Sprintf(buf, " [Unexpected achievement #%d.]", achidx);
            C.callLocal(enlght_out, buf);
            break;
        } /* switch */
    } /* for */

    if (awin != C.ge.en_win) {
        C.display_nhwindow(awin, 1);
        C.destroy_nhwindow(awin);
    }
}

/* record an achievement (add at end of list unless already present) */
export function record_achievement(achidx)
{
    achidx=C.schar(achidx);
    let i, absidx;
    let repeat_achievement = C.int(0);

    absidx = C.int(C.abs(achidx));
    /* valid achievements range from 1 to N_ACH-1; however, ranks can be
       stored as the complement (ie, negative) to track gender */
    if ((achidx < 1 && (absidx < C.ACH_RNK1 || absidx > C.ACH_RNK8))
        || achidx >= C.N_ACH) {
        C.impossible("Achievement #%d is out of range.", achidx);
        return;
    }

    /* the list has an extra slot so there is always at least one 0 at
       its end (more than one unless all N_ACH-1 possible achievements
       have been recorded); find first empty slot or achievement #achidx;
       an attempt to duplicate an achievement can happen if any of Bell,
       Candelabrum, Book, or Amulet is dropped then picked up again */
    for (i = C.int(0); C.u.uachieved[i]; ++i)
        if (C.abs(C.u.uachieved[i]) == absidx) {
            repeat_achievement = C.int(1);
            break;
        }

    /*
     * We do the sound for an achievement, even if it has already been
     * achieved before. Some players might have set up level-based
     * theme music or something. We do let the sound interface know
     * that it's not the original achievement though.
     */
    // SoundAchievement(achidx, 0, repeat_achievement); /* configured inactive sound macro */

    if (repeat_achievement)
        return; /* already recorded, don't duplicate it */
    C.u.uachieved[i] = achidx;

    /* avoid livelog for achievements recorded during final disclosure:
       nudist and blind-from-birth; also ascension which is suppressed
       by this gets logged separately in really_done() */
    if (C.program_state.gameover)
        return;

    if (absidx >= C.ACH_RNK1 && absidx <= C.ACH_RNK8) {
        C.livelog_printf(C.achieve_msg[absidx].llflag,
                       "attained the rank of %s (level %d)",
                       C.rank_of(C.rank_to_xlev(absidx - (C.ACH_RNK1 - 1)),
                               C.Role_switch, (achidx < 0) ? 1 : 0),
                       C.u.ulevel);
    } else if (achidx == C.ACH_SOKO_PRIZE
               || achidx == C.ACH_MINE_PRIZE) {
        /* need to supply extra information for these two */
        let otyp = (C.short((achidx == C.ACH_SOKO_PRIZE)
                      ? C.svc.context.achieveo.soko_prize_otyp
                      : C.svc.context.achieveo.mines_prize_otyp));

        /* note: OBJ_NAME() works here because both "bag of holding" and
           "amulet of reflection" are fully named in their objects[] entry
           but that's not true in the general case */
        C.livelog_printf(C.achieve_msg[achidx].llflag, "%s %s",
                       C.achieve_msg[achidx].msg, C.OBJ_NAME(C.objects[otyp]));
    } else {
        C.livelog_printf(C.achieve_msg[absidx].llflag, "%s",
                       C.achieve_msg[absidx].msg);
    }
}

/* discard a recorded achievement; return True if removed, False otherwise */
export function remove_achievement(achidx)
{
    achidx=C.schar(achidx);
    let i;

    for (i = C.int(0); C.u.uachieved[i]; ++i)
        if (C.abs(C.u.uachieved[i]) == C.abs(achidx))
            break; /* stop when found */
    if (!C.u.uachieved[i]) /* not found */
        return 0;
    /* list is 0 terminated so any beyond the removed one move up a slot */
    do {
        C.u.uachieved[i] = C.u.uachieved[i + 1];
    } while (C.u.uachieved[++i]);
    return 1;
}

/* used to decide whether there are any achievements to display */
export function count_achievements()
{
    let i, acnt = C.int(0);

    for (i = C.int(0); C.u.uachieved[i]; ++i)
        ++acnt;
    return acnt;
}

/* convert a rank index to an achievement number; encode it when female
   in order to subsequently report gender-specific ranks accurately */
export function achieve_rank(rank) /* 1..8 */
{
    rank=C.int(rank);
    let achidx = C.schar(C.schar(((rank - 1) + C.ACH_RNK1)));

    if (C.flags.female)
        achidx = C.schar(-achidx);
    return achidx;
}

/* return True if sokoban branch has been entered, False otherwise */
export function sokoban_in_play()
{
    let achidx;

    /* TODO? move this to dungeon.c and test furthest level reached of the
       sokoban branch instead of relying on the entered-sokoban achievement */

    for (achidx = C.int(0); C.u.uachieved[achidx]; ++achidx)
        if (C.u.uachieved[achidx] == C.ACH_SOKO)
            return 1;
    return 0;
}

/* #chronicle command */
export function do_gamelog()
{
// #ifdef CHRONICLE
    if (C.gg.gamelog) {
        C.callLocal(show_gamelog, C.ENL_GAMEINPROGRESS);
    } else {
        C.pline("No chronicled events.");
    }
// #else
//     pline("Chronicle was turned off during compile-time.");
// #endif 
/* !CHRONICLE */
    return C.ECMD_OK;
}

/* 'major' events for dumplog; inclusion or exclusion here may need tuning */
/* explicitly for dumplog */


/* #chronicle details */
export function show_gamelog(final)
{
    final=C.int(final);
// #ifdef CHRONICLE
    let llmsg;
    let win;
    const buf = C.stackAlloc(C.BUFSZ);
    let eventcnt = C.int(0);

    win = C.int(C.create_nhwindow(C.NHW_TEXT));
    C.Sprintf(buf, "%s events:", final ? "Major" : "Logged");
    C.putstr(win, 0, buf);
    for (llmsg = C.gg.gamelog; llmsg; llmsg = llmsg.next) {
        if (final && !(((llmsg).flags & (0n | C.LL_WISH | C.LL_ACHIEVE | C.LL_UMONST | C.LL_DIVINEGIFT | C.LL_LIFESAVE | C.LL_ARTIFACT | C.LL_GENOCIDE | C.LL_DUMP)) != 0))
            continue;
        if (!final && !C.wizard && (((llmsg).flags & C.LL_SPOILER) != 0))
            continue;
        if (!eventcnt++)
            C.putstr(win, 0, " Turn");
        C.Snprintf(buf, C.bufferSize(buf), "%5ld: %s", llmsg.turn, llmsg.text, 7);
        C.putstr(win, 0, buf);
    }
    /* since start of game is logged as a major event, 'eventcnt' should
       never end up as 0; for 'final', end of game is a major event too */
    if (!eventcnt)
        C.putstr(win, 0, " none");

    C.display_nhwindow(win, 1);
    C.destroy_nhwindow(win);
// #else
//     nhUse(final);
// #endif 
/* !CHRONICLE */
    return;
}

/*
 *      Vanquished monsters.
 */

/* the two uppercase choices are implemented but suppressed from menu.
   also used in options.c */
export const vanqorders = [
    [ "t", "traditional: by monster level",
           "traditional: by monster level, by internal monster index" ],
    [ "d", "by monster difficulty rating",
           "by monster difficulty rating, by internal monster index" ],
    [ "a", "alphabetically, unique monsters separate",
           "alphabetically, first unique monsters, then others" ],
    [ "A", "alphabetically, unique monsters intermixed",
           "alphabetically, unique monsters and others intermixed" ],
    [ "C", "by monster class, high to low level in class",
           "by monster class, high to low level within class" ],
    [ "c", "by monster class, low to high level in class",
           "by monster class, low to high level within class" ],
    [ "n", "by count, high to low",
           "by count, high to low, by internal index within tied count" ],
    [ "z", "by count, low to high",
           "by count, low to high, by internal index within tied count" ],
];

export function vanqsort_cmp(vptr1, vptr2)
{
    let indx1 = C.int(C.loadShort(vptr1)), indx2 = C.int(C.loadShort(vptr2)),
        mlev1, mlev2, mstr1, mstr2, uniq1, uniq2, died1, died2, res;
    let name1, name2, punct;
    let mcls1, mcls2;

    switch (C.flags.vanq_sortmode) {
    default:
    case C.VANQ_MLVL_MNDX:
        /* sort by monster level */
        mlev1 = C.int(C.mons[indx1].mlevel);
        mlev2 = C.int(C.mons[indx2].mlevel);
        res = C.int(mlev2 - mlev1); /* mlevel high to low */
        break;
    case C.VANQ_MSTR_MNDX:
        /* sort by monster toughness */
        mstr1 = C.int(C.mons[indx1].difficulty);
        mstr2 = C.int(C.mons[indx2].difficulty);
        res = C.int(mstr2 - mstr1); /* monstr high to low */
        break;
    case C.VANQ_ALPHA_SEP:
        uniq1 = (C.int(Number(Boolean((C.mons[indx1].geno & C.G_UNIQ) && indx1 != C.PM_HIGH_CLERIC))));
        uniq2 = (C.int(Number(Boolean((C.mons[indx2].geno & C.G_UNIQ) && indx2 != C.PM_HIGH_CLERIC))));
        if (uniq1 ^ uniq2) { /* one or other uniq, but not both */
            res = C.int(uniq2 - uniq1);
            break;
        } /* else both unique or neither unique */
        
        /*FALLTHRU*/
    case C.VANQ_ALPHA_MIX:
        name1 = C.mons[indx1].pmnames[C.NEUTRAL];
        name2 = C.mons[indx2].pmnames[C.NEUTRAL];
        res = C.int(C.strcmpi(name1, name2)); /* caseblind alpha, low to high */
        break;
    case C.VANQ_MCLS_HTOL:
    case C.VANQ_MCLS_LTOH:
        /* mons[].mlet is a small integer, 1..N, of type plain char;
           if 'char' happens to be unsigned, (mlet1 - mlet2) would yield
           an inappropriate result when mlet2 is greater than mlet1,
           so force our copies (mcls1, mcls2) to be signed */
        mcls1 = C.schar(C.schar(C.mons[indx1].mlet));
        mcls2 = C.schar(C.schar(C.mons[indx2].mlet));
        /* S_ANT through S_ZRUTY correspond to lowercase monster classes,
           S_ANGEL through S_ZOMBIE correspond to uppercase, and various
           punctuation characters are used for classes beyond those */
        if (mcls1 > C.S_ZOMBIE && mcls2 > C.S_ZOMBIE) {
            /* force a specific order to the punctuation classes that's
               different from the internal order;
               internal order is ok if neither or just one is punctuation
               since letters have lower values so come out before punct */
            const punctclasses = C.punctclasses;

            if ((punct = C.strchr(punctclasses, mcls1)) != 0)
                mcls1 = C.schar(C.schar((C.S_ZOMBIE + 1 + C.int((punct - punctclasses)))));
            if ((punct = C.strchr(punctclasses, mcls2)) != 0)
                mcls2 = C.schar(C.schar((C.S_ZOMBIE + 1 + C.int((punct - punctclasses)))));
        }
        res = C.int(mcls1 - mcls2); /* class */
        if (res == 0) {
            /* Riders are in the same class as major demons, yielding res==0
               above when both mcls1 and mcls2 are either Riders or demons or
               one of each; force Riders to be sorted before demons */
            res = C.int(C.is_rider(C.mons[indx2]) - C.is_rider(C.mons[indx1]));
            /* res -1 => #1 is a Rider, #2 isn't;
                    0 => both Riders or neither;
                   +1 => #2 is a Rider, #1 isn't */
            if (res)
                break;
            mlev1 = C.int(C.mons[indx1].mlevel);
            mlev2 = C.int(C.mons[indx2].mlevel);
            res = C.int(mlev1 - mlev2); /* mlevel low to high */
            if (C.flags.vanq_sortmode == C.VANQ_MCLS_HTOL)
                res = C.int(-res); /* mlevel high to low */
        }
        break;
    case C.VANQ_COUNT_H_L:
    case C.VANQ_COUNT_L_H:
        died1 = C.int(C.svm.mvitals[indx1].died);
        died2 = C.int(C.svm.mvitals[indx2].died);
        res = C.int(died2 - died1); /* dead count high to low */
        if (C.flags.vanq_sortmode == C.VANQ_COUNT_L_H)
            res = C.int(-res); /* dead count low to high */
        break;
    }
    /* tiebreaker: internal mons[] index */
    if (res == 0)
        res = C.int(indx1 - indx2); /* mndx low to high */
    return res;
}

/* returns -1 if cancelled via ESC */
export function set_vanq_order(for_vanq)
{
    for_vanq=C.schar(for_vanq);
    let tmpwin;
    const selected = C.menuPointerLocal();
    const any = C.anyLocal();
    const buf = C.stackAlloc(C.BUFSZ);
    let desc;
    let i, n, choice,
        clr = C.int(C.NO_COLOR);

    tmpwin = C.int(C.create_nhwindow(C.NHW_MENU));
    C.start_menu(tmpwin, C.MENU_BEHAVE_STANDARD);
    C.copyAnything(any,C.cg.zeroany); /* zero out all bits */
    for (i = C.int(0); i < C.vanqorders.length; i++) {
        if (i == C.VANQ_ALPHA_MIX || i == C.VANQ_MCLS_HTOL) /* skip these */
            continue;
        /* suppress some orderings if this menu if for 'm #genocided' */
        if (!for_vanq && (i == C.VANQ_COUNT_H_L || i == C.VANQ_COUNT_L_H))
            continue;
        desc = C.vanqorders[i][2];
        /* unique monsters can't be genocided so "alpha, unique separate"
           and "alpha, unique intermixed" are confusing descriptions when
           this menu is for #genocided rather than for #vanquished */
        if (!for_vanq && i == C.VANQ_ALPHA_SEP)
            desc = "alphabetically";
        any.a_int = C.int(i + 1);
        C.add_menu(tmpwin, C.nul_glyphinfo, any, C.loadChar(C.vanqorders[i][0]), 0,
                 C.ATR_NONE, clr, desc,
                 (i == C.flags.vanq_sortmode) ? C.MENU_ITEMFLAGS_SELECTED
                                            : C.MENU_ITEMFLAGS_NONE);
    }
    C.Sprintf(buf, "Sort order for %s",
            for_vanq ? "vanquished monster counts (also genocided types)"
                     : "genocided monster types (also vanquished counts)");
    C.end_menu(tmpwin, buf);

    n = C.int(C.select_menu(tmpwin, C.PICK_ONE, selected));
    C.destroy_nhwindow(tmpwin);
    if (n > 0) {
        choice = C.int(selected.value[0].item.a_int - 1);
        /* skip preselected entry if we have more than one item chosen */
        if (n > 1 && choice == C.flags.vanq_sortmode)
            choice = C.int(selected.value[1].item.a_int - 1);
        C.free(selected.value);
        C.flags.vanq_sortmode = C.uchar(choice);
    }
    return (n < 0) ? -1 : C.flags.vanq_sortmode;
}

/* #vanquished command */
export function dovanquished()
{
    C.callLocal(list_vanquished, C.iflags.menu_requested ? 65 : 121, 0);
    C.iflags.menu_requested = C.schar(0);
    return C.ECMD_OK;
}

/* high priests aren't unique but are flagged as such to simplify something */
// Source unique-monster predicate expands inline.

// Source alias program_state.stopprint is the live program_state.stopprint field.

/* used for #vanquished and end of game disclosure and end of game dumplog */
export function list_vanquished(defquery, ask)
{
    defquery=C.char(defquery);ask=C.schar(ask);
    let i;
    let pfx, nkilled;
    let ntypes, ni;
    let total_killed = C.long(0n);
    let klwin;
    const mindx = C.shortArrayLocal(C.NUMMONS);
    let c;
    const buf = C.stackAlloc(C.BUFSZ);
    const buftoo = C.stackAlloc(C.BUFSZ);
    /* 'A' is only supplied by 'm #vanquished'; 'd' is only supplied by
       dump_everything() when writing dumplog, so won't happen if built
       without '#define DUMPLOG' but there's no need for conditionals here */
    let force_sort = (C.schar(defquery == 65)),
            dumping = (C.schar(defquery == 100));

    /* normally we don't ask about sort order for the vanquished list unless
       it contains at least two entries; however, if player has used explicit
       'm #vanquished', choose order no matter what it contains so far */
    if (force_sort) { /* iflags.menu_requested via dovanquished() */
        /* choose value for vanq_sortmode via menu; ESC cancels choosing
           sort order but continues with vanquishd monsters display */
        C.callLocal(set_vanq_order, 1);
    }
    if (dumping || force_sort) {
        /* switch from 'A' or 'd' to 'y'; 'ask' is already False for the
           cases that might supply 'A' or 'd' */
        defquery = C.char(121);
        ask = C.schar(0); /* redundant */
    }

    /* get totals first */
    ntypes = C.uint(0);
    for (i = C.int(C.LOW_PM); i < C.NUMMONS; i++) {
        if ((nkilled = C.int(C.int(C.svm.mvitals[i].died))) == 0)
            continue;
        mindx[ntypes++] = C.short(i);
        total_killed += C.long(nkilled);
    }

    /* vanquished creatures list;
     * includes all dead monsters, not just those killed by the player
     */
    if (ntypes != 0) {
        let mlet, prev_mlet = C.char(0); /* used as small integer, not character */
        let class_header, uniq_header, Rider,
                was_uniq = C.schar(0), special_hdr = C.schar(0);

        if (ask) {
            const allow_yn = C.stackAlloc(10);

            if (ntypes > 1) {
                C.Strcpy(allow_yn, C.ynaqchars);
            } else {
                C.Strcpy(allow_yn, C.ynqchars); /* don't include 'a', but */
                C.Strcat(allow_yn, "\x1ba");  /* allow user to answer 'a' */
                if (defquery == 97) /* potential default from 'disclose' */
                    defquery = C.char(121);
            }
            c = C.char(C.yn_function("Do you want an account of creatures vanquished?",
                            allow_yn, defquery, 1));
        } else {
            c = C.char(defquery);
        }

        if (c == 113)
            C.program_state.stopprint++;
        if (c == 121 || c == 97) {
            if (c == 97 && ntypes > 1) { /* ask user to choose sort order */
                /* choose value for vanq_sortmode via menu; ESC cancels list
                   of vanquished monsters but does not set 'done_stopprint' */
                if (C.callLocal(set_vanq_order, 1) < 0)
                    return;
            }
            uniq_header = (C.schar(C.flags.vanq_sortmode == C.VANQ_ALPHA_SEP));
            class_header = (C.schar(Number(Boolean((C.flags.vanq_sortmode == C.VANQ_MCLS_LTOH
                             || C.flags.vanq_sortmode == C.VANQ_MCLS_HTOL)
                            && ntypes > 1))));

            klwin = C.int(C.create_nhwindow(C.NHW_MENU));
            C.putstr(klwin, 0, "Vanquished creatures:");
            if (!dumping)
                C.putstr(klwin, 0, "");

            C.qsort(mindx, ntypes, 2, vanqsort_cmp);
            for (ni = C.uint(0); ni < ntypes; ni++) {
                i = C.int(mindx[ni]);
                nkilled = C.int(C.svm.mvitals[i].died);
                Rider = C.schar(C.is_rider(C.mons[i]));
                mlet = C.char(C.mons[i].mlet);
                if (class_header
                    && (mlet != prev_mlet || (special_hdr && !Rider))) {
                    if (!Rider) {
                        C.Strcpy(buf, C.def_monsyms[C.int(mlet)].explain);
                        special_hdr = C.schar(0);
                    } else {
                        C.Strcpy(buf, "Rider");
                        special_hdr = C.schar(1);
                    }
                    /* 'ask' implies final disclosure, where highlighting
                       of various header lines is suppressed */
                    C.putstr(klwin, ask ? C.ATR_NONE : C.iflags.menu_headings.attr,
                           C.upstart(buf));
                    prev_mlet = C.char(mlet);
                }
                if (((C.mons[i].geno & C.G_UNIQ) != 0 && i != C.PM_HIGH_CLERIC)) {
                    C.Sprintf(buf, "%s%s",
                            !C.type_is_pname(C.mons[i]) ? "the " : "",
                            C.mons[i].pmnames[C.NEUTRAL]);
                    if (nkilled > 1)
                        C.Sprintf(C.eos(buf), " (%s)",
                                C.callLocal(N_times, C.long(nkilled), buftoo));
                    was_uniq = C.schar(1);
                } else {
                    if (uniq_header && was_uniq) {
                        C.putstr(klwin, 0, "");
                        was_uniq = C.schar(0);
                    }
                    /* trolls or undead might have come back,
                       but we don't keep track of that */
                    if (nkilled == 1)
                        C.Strcpy(buf, C.an(C.mons[i].pmnames[C.NEUTRAL]));
                    else
                        C.Sprintf(buf, "%3d %s", nkilled,
                                C.makeplural(C.mons[i].pmnames[C.NEUTRAL]));
                }
                /* number of leading spaces to match 3 digit prefix */
                pfx = C.int(!C.strncmpi(buf, "the ", 4) ? 0
                      : !C.strncmpi(buf, "an ", 3) ? 1
                        : !C.strncmpi(buf, "a ", 2) ? 2
                          : !C.digit(C.loadChar(C.ptrAdd(buf, 2))) ? 4 : 0);
                if (class_header)
                    ++pfx;
                C.Snprintf(buftoo, C.bufferSize(buftoo), "%*s%s", pfx, "", buf, 8);
                C.putstr(klwin, 0, buftoo);
            }
            /*
             * if (Hallucination)
             *     putstr(klwin, 0, "and a partridge in a pear tree");
             */
            if (ntypes > 1) {
                if (!dumping)
                    C.putstr(klwin, 0, "");
                C.Sprintf(buf, "%ld creatures vanquished.", total_killed);
                C.putstr(klwin, 0, buf);
            }
            C.display_nhwindow(klwin, 1);
            C.destroy_nhwindow(klwin);
        }

    /*
     * For end-of-game disclosure, we're only called when some monsters
     * were vanquished and won't reach these 'else-if's.
     *
     * If no monsters have been vanquished, we're either called for game
     * still in progress, so use present tense via pline(), or for dumplog
     * which needs putstr() and past tense.
     */
    } else if (!C.program_state.gameover) {
        /* #vanquished rather than final disclosure, so pline() is ok */
        C.pline("No creatures have been vanquished.");
// #ifdef DUMPLOG
//     } else if (dumping) {
//         putstr(0, 0, "No creatures were vanquished."); 
/* not pline() */
// #endif
    }
}

/* number of monster species which have been genocided */
export function num_genocides()
{
    let i, n = C.int(0);

    for (i = C.int(C.LOW_PM); i < C.NUMMONS; ++i) {
        if (C.svm.mvitals[i].mvflags & C.G_GENOD) {
            ++n;
            if (((C.mons[i].geno & C.G_UNIQ) != 0 && i != C.PM_HIGH_CLERIC))
                C.impossible("unique creature '%d: %s' genocided?",
                           i, C.mons[i].pmnames[C.NEUTRAL]);
        }
    }
    return n;
}

/* return a count of the number of extinct species */
export function num_extinct()
{
    let i, n = C.int(0);

    for (i = C.int(C.LOW_PM); i < C.NUMMONS; ++i) {
        if (((C.mons[i].geno & C.G_UNIQ) != 0 && i != C.PM_HIGH_CLERIC))
            continue;
        if ((C.svm.mvitals[i].mvflags & C.G_GONE) == C.G_EXTINCT)
            ++n;
    }
    return n;
}

/* collect both genocides and extinctions, skipping uniques */
export function num_gone(mvflags, mindx)
{
    mvflags=C.int(mvflags);mindx=C.intArray(mindx);
    let mflg = C.uchar(C.uchar(mvflags));
    let i, n = C.int(0);

    C.memset(mindx, 0, C.NUMMONS * 4);

    for (i = C.int(C.LOW_PM); i < C.NUMMONS; ++i) {
        /* uniques can't be genocided but can become extinct;
           however, they're never reported as extinct, so skip them */
        if (((C.mons[i].geno & C.G_UNIQ) != 0 && i != C.PM_HIGH_CLERIC))
            continue;

        if ((C.svm.mvitals[i].mvflags & mflg) != 0)
            mindx[n++] = C.int(i);
    }
    return n;
}

/* show genocided and extinct monster types for final disclosure/dumplog
   or for the #genocided command */
export function list_genocided(defquery, ask)
{
    defquery=C.char(defquery);ask=C.schar(ask);
    let i, mndx;
    let ngenocided, nextinct, ngone, mvflags;
    const mindx = C.intArrayLocal(C.NUMMONS);
    let c;
    let klwin;
    const buf = C.stackAlloc(C.BUFSZ);
    let genoing, /* prompting for genocide or class genocide */
            dumping; /* for DUMPLOG; doesn't need to be conditional */
    let both = (C.schar(Number(Boolean(C.program_state.gameover || C.wizard || C.discover))));

    dumping = (C.schar(defquery == 100));
    genoing = (C.schar(defquery == 103));
    if (dumping || genoing)
        defquery = C.char(121);
    if (genoing)
        both = C.schar(0); /* genocides only, not extinctions */

    /* this goes through the whole monster list up to three times but will
       happen rarely and is simpler than a more general single pass check;
       extinctions are only revealed during end of game disclosure or when
       running in wizard or explore mode */
    ngenocided = C.int(C.callLocal(num_genocides));
    nextinct = C.int(both ? C.callLocal(num_extinct) : 0);
    mvflags = C.int(C.G_GENOD | (both ? C.G_EXTINCT : 0));
    ngone = C.int(C.callLocal(num_gone, mvflags, mindx));

    /* genocided or extinct species list */
    if (ngone > 0) {
        C.Sprintf(buf, "Do you want a list of %sspecies%s%s?",
                (nextinct && !ngenocided) ? "extinct " : "",
                (ngenocided) ? " genocided" : "",
                (nextinct && ngenocided) ? " and extinct" : "");
        c = C.char(ask ? C.yn_function(buf, (ngone > 1) ? "ynaq" : "ynq\x1ba",
                              defquery, 1)
                : defquery);
        if (c == 113)
            C.program_state.stopprint++;
        if (c == 121 || c == 97) {
            let save_sortmode;
            let mlet, prev_mlet = C.char(0);
            let class_header = C.schar(0);

            if (ngone > 1) {
                if (c == 97) { /* ask player to choose sort order */
                    /* #genocided shares #vanquished's sort order */
                    if (C.callLocal(set_vanq_order, 0) < 0)
                        return;
                }
                /* sort orderings count-high-to-low or count-low-to-high
                   don't make sense for genocides; if the preferred order
                   to set to either of those, use alphabetical instead;
                   note: the tie breaker for by-class is level-high-to-low
                   or level-low-to-high rather than count so is ok as-is */
                save_sortmode = C.int(C.flags.vanq_sortmode);
                if (C.flags.vanq_sortmode == C.VANQ_COUNT_H_L
                    || C.flags.vanq_sortmode == C.VANQ_COUNT_L_H)
                    C.flags.vanq_sortmode = C.uchar(C.VANQ_ALPHA_MIX);
                C.qsort(mindx, ngone,
                      4, vanqsort_cmp);
                class_header = (C.schar(Number(Boolean(C.flags.vanq_sortmode == C.VANQ_MCLS_LTOH
                                || C.flags.vanq_sortmode == C.VANQ_MCLS_HTOL))));
                C.flags.vanq_sortmode = C.uchar(save_sortmode);
            }

            klwin = C.int(C.create_nhwindow(C.NHW_MENU));
            C.Sprintf(buf, "%s%s species:",
                    (ngenocided) ? "Genocided" : "Extinct",
                    (nextinct && ngenocided) ? " or extinct" : "");
            C.putstr(klwin, 0, buf);
            if (!dumping)
                C.putstr(klwin, 0, "");

            for (i = C.int(0); i < ngone; ++i) {
                mndx = C.int(mindx[i]);
                mlet = C.char(C.mons[mndx].mlet);
                if (class_header && mlet != prev_mlet) {
                    C.Strcpy(buf, C.def_monsyms[C.int(mlet)].explain);
                    /* 'ask' implies final disclosure, where highlighting
                       of various header lines is suppressed */
                    C.putstr(klwin, ask ? C.ATR_NONE : C.iflags.menu_headings.attr,
                           C.upstart(buf));
                    prev_mlet = C.char(mlet);
                }
                C.Sprintf(buf, " %s", C.makeplural(C.mons[mndx].pmnames[C.NEUTRAL]));
                /*
                 * "Extinct" is unfortunate terminology.  A species
                 * is marked extinct when its birth limit is reached,
                 * but there might be members of the species still
                 * alive, contradicting the meaning of the word.
                 *
                 * We only append "(extinct)" if the G_GENOD bit is
                 * clear.  During normal play, 'mndx' won't be in the
                 * collected list unless that bit is set.
                 */
                if ((C.svm.mvitals[mndx].mvflags & C.G_GONE) == C.G_EXTINCT)
                    C.Strcat(buf, " (extinct)");
                C.putstr(klwin, 0, buf);
            }
            if (!dumping)
                C.putstr(klwin, 0, "");
            if (ngenocided > 0) {
                C.Sprintf(buf, "%d species genocided.", ngenocided);
                C.putstr(klwin, 0, buf);
            }
            if (nextinct > 0) {
                C.Sprintf(buf, "%d species extinct.", nextinct);
                C.putstr(klwin, 0, buf);
            }

            C.display_nhwindow(klwin, 1);
            C.destroy_nhwindow(klwin);
        }

    /* See the comment for similar code near the end of list_vanquished(). */
    } else if (!C.program_state.gameover) {
        /* #genocided rather than final disclosure, so pline() is ok and
           extinction has been ignored */
        C.pline("No creatures have been genocided%s.", genoing ? " yet" : "");
// #ifdef DUMPLOG
//     } else if (dumping) { 
/* 'gameover' is True if we make it here */
//         putstr(0, 0, "No species were genocided or became extinct.");
// #endif
    }
}

/* M-g - #genocided command */
export function dogenocided()
{
    C.callLocal(list_genocided, C.iflags.menu_requested ? 97 : 121, 0);
    return C.ECMD_OK;
}



/* #wizborn extended command */
export function doborn()
{
    const fmt = "%4i %4i %c %-30s";
    let i;
    let datawin = C.int(C.create_nhwindow(C.NHW_TEXT));
    const buf = C.stackAlloc(C.BUFSZ);
    let nborn = C.int(0), ndied = C.int(0);

    C.putstr(datawin, 0, "died born");
    for (i = C.int(C.LOW_PM); i < C.NUMMONS; i++)
        if (C.svm.mvitals[i].born || C.svm.mvitals[i].died
            || (C.svm.mvitals[i].mvflags & C.G_GONE) != 0) {
            C.Sprintf(buf, fmt,
                    C.svm.mvitals[i].died, C.svm.mvitals[i].born,
                    ((C.svm.mvitals[i].mvflags & C.G_GONE) == C.G_EXTINCT) ? 69
                    : ((C.svm.mvitals[i].mvflags & C.G_GONE) == C.G_GENOD) ? 71
                      : ((C.svm.mvitals[i].mvflags & C.G_GONE) != 0) ? 88
                        : 32,
                    C.mons[i].pmnames[C.NEUTRAL]);
            C.putstr(datawin, 0, buf);
            nborn += C.svm.mvitals[i].born;
            ndied += C.svm.mvitals[i].died;
        }

    C.putstr(datawin, 0, "");
    C.Sprintf(buf, fmt, ndied, nborn, 32, "");

    C.display_nhwindow(datawin, 0);
    C.destroy_nhwindow(datawin);

    return C.ECMD_OK;
}



/*
 * align_str(), piousness(), mstatusline() and ustatusline() once resided
 * in pline.c, then got moved to priest.c just to be out of there.  They
 * fit better here.
 */

export function align_str(alignment)
{
    alignment=C.schar(alignment);
    switch (C.int(alignment)) {
    case C.A_CHAOTIC:
        return "chaotic";
    case C.A_NEUTRAL:
        return "neutral";
    case C.A_LAWFUL:
        return "lawful";
    case C.A_NONE:
        return "unaligned";
    }
    return "unknown";
}

export function size_str(msize)
{
    msize=C.int(msize);
    const outbuf = C.storage(1);

    switch (msize) {
    case C.MZ_TINY:
        C.Strcpy(outbuf, "tiny");
        break;
    case C.MZ_SMALL:
        C.Strcpy(outbuf, "small");
        break;
    case C.MZ_MEDIUM:
        C.Strcpy(outbuf, "medium");
        break;
    case C.MZ_LARGE:
        C.Strcpy(outbuf, "large");
        break;
    case C.MZ_HUGE:
        C.Strcpy(outbuf, "huge");
        break;
    case C.MZ_GIGANTIC:
        C.Strcpy(outbuf, "gigantic");
        break;
    default:
        C.Sprintf(outbuf, "unknown size (%d)", msize);
        break;
    }
    return outbuf;
}

/* used for self-probing */
export function piousness(showneg, suffix)
{
    showneg=C.schar(showneg);
    const buf = C.storage(2); /* bigger than "insufficiently neutral" */
    let pio;

    /* note: piousness 20 matches MIN_QUEST_ALIGN (quest.h) */
    if (C.u.ualign.record >= 20)
        pio = "piously";
    else if (C.u.ualign.record > 13)
        pio = "devoutly";
    else if (C.u.ualign.record > 8)
        pio = "fervently";
    else if (C.u.ualign.record > 3)
        pio = "stridently";
    else if (C.u.ualign.record == 3)
        pio = "";
    else if (C.u.ualign.record > 0)
        pio = "haltingly";
    else if (C.u.ualign.record == 0)
        pio = "nominally";
    else if (!showneg)
        pio = "insufficiently";
    else if (C.u.ualign.record >= -3)
        pio = "strayed";
    else if (C.u.ualign.record >= -8)
        pio = "sinned";
    else
        pio = "transgressed";

    C.Sprintf(buf, "%s", pio);
    if (suffix && (!showneg || C.u.ualign.record >= 0)) {
        if (C.u.ualign.record != 3)
            C.Strcat(buf, " ");
        C.Strcat(buf, suffix);
    }
    return buf;
}

/* stethoscope or probing applied to monster -- one-line feedback */
export function mstatusline(mtmp)
{
    let alignment = C.schar(C.mon_aligntyp(mtmp));
    const info = C.stackAlloc(C.BUFSZ);
    const monnambuf = C.stackAlloc(C.BUFSZ);

    C.storeChar(C.ptrAdd(info, 0), 0);
    if (mtmp.mtame) {
        C.Strcat(info, ", tame");
        if (C.wizard) {
            C.Sprintf(C.eos(info), " (%d", mtmp.mtame);
            if (!mtmp.isminion)
                C.Sprintf(C.eos(info), "; hungry %ld; apport %d",
                        C.EDOG(mtmp).hungrytime, C.EDOG(mtmp).apport);
            C.Strcat(info, ")");
        }
    } else if (mtmp.mpeaceful)
        C.Strcat(info, ", peaceful");

    if (C.samePtr(mtmp.data, C.mons[C.PM_LONG_WORM])) {
        let segndx, nsegs = C.int(C.count_wsegs(mtmp));

        /* the worm code internals don't consider the head to be one of
           the worm's segments, but we count it as such when presenting
           worm feedback to the player */
        if (!nsegs) {
            C.Strcat(info, ", single segment");
        } else {
            ++nsegs; /* include head in the segment count */
            segndx = C.int(C.wseg_at(mtmp, C.gb.bhitpos.x, C.gb.bhitpos.y));
            C.Sprintf(C.eos(info), ", %d%s of %d segments",
                    segndx, C.ordin(segndx), nsegs);
        }
    }
    if (C.ismnum(mtmp.cham) && !C.samePtr(mtmp.data, C.mons[mtmp.cham]))
        /* don't reveal the innate form (chameleon, vampire, &c),
           just expose the fact that this current form isn't it */
        C.Strcat(info, ", shapechanger");
    /* pets eating mimic corpses mimic while eating, so this comes first */
    if (mtmp.meating)
        C.Strcat(info, ", eating");
    /* a stethoscope exposes mimic before getting here so this
       won't be relevant for it, but wand of probing doesn't */
    if (mtmp.mundetected || mtmp.m_ap_type
        || C.visible_region_at(C.gb.bhitpos.x, C.gb.bhitpos.y))
        C.mhidden_description(mtmp,
                       C.MHID_PREFIX | C.MHID_ARTICLE | C.MHID_ALTMON | C.MHID_REGION,
                            C.eos(info));
    if (mtmp.mcan)
        C.Strcat(info, ", cancelled");
    if (mtmp.mconf)
        C.Strcat(info, ", confused");
    if (mtmp.mblinded || !mtmp.mcansee)
        C.Strcat(info, ", blind");
    if (mtmp.mstun)
        C.Strcat(info, ", stunned");
    if (mtmp.msleeping)
        C.Strcat(info, ", asleep");
// #if 0 
/* unfortunately mfrozen covers temporary sleep and being busy
       * (donning armor, for instance) as well as paralysis */
//     else if (mtmp->mfrozen)
//         Strcat(info, ", paralyzed");
// #else
    else if (mtmp.mfrozen || !mtmp.mcanmove)
        C.Strcat(info, ", can't move");
// #endif
    /* [arbitrary reason why it isn't moving] */
    else if ((mtmp.mstrategy & C.STRAT_WAITMASK) != 0)
        C.Strcat(info, ", meditating");
    if (mtmp.mflee)
        C.Strcat(info, ", scared");
    if (mtmp.mtrapped)
        C.Strcat(info, ", trapped");
    if (mtmp.mspeed)
        C.Strcat(info, (mtmp.mspeed == C.MFAST) ? ", fast"
                      : (mtmp.mspeed == C.MSLOW) ? ", slow"
                         : ", [? speed]");
    if (mtmp.minvis)
        C.Strcat(info, ", invisible");
    if (C.samePtr(mtmp, C.u.ustuck)) {
        let pm = C.u.ustuck.data;

        /* being swallowed/engulfed takes priority over sticks(youmonst);
           this used to have that backwards and checked sticks() first */
        C.Strcat(info, C.u.uswallow ? (C.digests(pm)
                                   ? ", digesting you"
                                   /* note: the "swallowing you" case won't
                                      happen because all animal engulfers
                                      either digest their victims (purple
                                      worm) or enfold them (trappers and
                                      lurkers above) */
                                   : (C.is_animal(pm) && !C.enfolds(pm))
                                     ? ", swallowing you"
                                     : ", engulfing you")
                     /* !u.uswallow; if both youmonst and ustuck are holders,
                        youmonst wins */
                     : (!C.sticks(C.gy.youmonst.data) ? ", holding you"
                                                 : ", held by you"));
    }
    if (C.samePtr(mtmp, C.u.usteed)) {
        C.Strcat(info, ", carrying you");
        if (C.Wounded_legs) {
            /* EWounded_legs is used to track left/right/both rather than
               some form of extrinsic impairment; HWounded_legs is used for
               timeout; both apply to steed instead of hero when mounted */
            let legs = (C.long(C.EWounded_legs & C.long(C.BOTH_SIDES)));
            let what = C.mbodypart(mtmp, C.LEG);

            if (legs == C.BOTH_SIDES)
                what = C.makeplural(what);
            C.Sprintf(C.eos(info), ", injured %s", what);
        }
    }
    if (mtmp.mleashed)
        C.Strcat(info, ", leashed");

    /* avoid "Status of the invisible newt ..., invisible" */
    /* and unlike a normal mon_nam, use "saddled" even if it has a name */
    C.Strcpy(monnambuf, C.x_monnam(mtmp, C.ARTICLE_YOUR, 0,
                               (C.SUPPRESS_IT | C.SUPPRESS_INVISIBLE), 0));

    C.pline("Status of %s (%s, %s):  Level %d  HP %d(%d)  AC %d%s.",
          monnambuf, C.callLocal(align_str, alignment), C.callLocal(size_str, mtmp.data.msize),
          mtmp.m_lev, mtmp.mhp, mtmp.mhpmax, C.find_mac(mtmp), info);
}

/* stethoscope or probing applied to hero -- one-line feedback */
export function ustatusline()
{
    let reg;
    const info = C.stackAlloc(C.BUFSZ);
    let ln;

    C.storeChar(C.ptrAdd(info, 0), 0);
    if (C.Sick) {
        C.Strcat(info, ", dying from");
        if (C.u.usick_type & C.SICK_VOMITABLE)
            C.Strcat(info, " food poisoning");
        if (C.u.usick_type & C.SICK_NONVOMITABLE) {
            if (C.u.usick_type & C.SICK_VOMITABLE)
                C.Strcat(info, " and");
            C.Strcat(info, " illness");
        }
    }
    if (C.Stoned)
        C.Strcat(info, ", solidifying");
    if (C.Slimed)
        C.Strcat(info, ", becoming slimy");
    if (C.Strangled)
        C.Strcat(info, ", being strangled");
    if (C.Vomiting)
        C.Strcat(info, ", nauseated"); /* !"nauseous" */
    if (C.Confusion)
        C.Strcat(info, ", confused");
    if (C.Blind) {
        C.Strcat(info, ", blind");
        if (C.u.ucreamed) {
            if (C.long(C.u.ucreamed) < C.BlindedTimeout || C.Blindfolded
                || !C.haseyes(C.gy.youmonst.data))
                C.Strcat(info, ", cover");
            C.Strcat(info, "ed by sticky goop");
        } /* note: "goop" == "glop"; variation is intentional */
    }
    if (C.Stunned)
        C.Strcat(info, ", stunned");
    if (C.Wounded_legs && !C.u.usteed) {
        /* EWounded_legs is used to track left/right/both rather than some
           form of extrinsic impairment; HWounded_legs is used for timeout;
           both apply to steed instead of hero when mounted */
        let legs = (C.long(C.EWounded_legs & C.long(C.BOTH_SIDES)));
        let what = C.body_part(C.LEG);

        if (legs == C.BOTH_SIDES)
            what = C.makeplural(what);
        /* when it's just one leg, ^X reports which, left or right;
           ustatusline() doesn't, in order to keep the output a bit shorter */
        C.Sprintf(C.eos(info), ", injured %s", what);
    }
    if (C.Glib)
        C.Sprintf(C.eos(info), ", slippery %s", C.fingers_or_gloves(1));
    if (C.u.utrap)
        C.Strcat(info, ", trapped");
    if (C.Fast)
        C.Strcat(info, C.Very_fast ? ", very fast" : ", fast");
    if (C.u.uundetected)
        C.Strcat(info, ", concealed");
    else if (C.U_AP_TYPE != C.M_AP_NOTHING)
        C.Strcat(info, ", disguised");
    if (C.Invis)
        C.Strcat(info, ", invisible");
    if (C.u.ustuck) {
        if (C.u.uswallow)
            C.Strcat(info, C.digests(C.u.ustuck.data) ? ", being digested by "
                                                 : ", engulfed by ");
        else if (!C.sticks(C.gy.youmonst.data))
            C.Strcat(info, ", held by ");
        else
            C.Strcat(info, ", holding ");
        /* FIXME? a_monnam() uses x_monnam() which has a special case that
           forces "the" instead of "a" when formatting u.ustuck while hero
           is swallowed; we don't really want that here but it isn't worth
           fiddling with just for self-probing while engulfed */
        C.Strcat(info, C.a_monnam(C.u.ustuck));
    }
    if (!C.u.uswallow
        && (reg = C.visible_region_at(C.u.ux, C.u.uy)) != 0
        && (ln = C.ulong(C.strlen(info))) < C.bufferSize(info))
        C.Snprintf(C.eos(info), C.bufferSize(info) - ln, ", in a cloud of %s",
                 C.reg_damg(reg) ? "poison gas" : "vapor", 9);

    C.pline("Status of %s (%s):  Level %d  HP %d(%d)  AC %d%s.", C.svp.plname,
          C.callLocal(piousness, 0, C.callLocal(align_str, C.u.ualign.type)),
          C.Upolyd ? C.mons[C.u.umonnum].mlevel : C.u.ulevel, C.Upolyd ? C.u.mh : C.u.uhp,
          C.Upolyd ? C.u.mhmax : C.u.uhpmax, C.u.uac, info);
}

/* for 'onefile' processing where end of this file isn't necessarily the
   end of the source code seen by the compiler */
// #undef enl_msg
// #undef you_are
// #undef you_have
// #undef you_can
// #undef you_have_been
// #undef you_have_never
// #undef you_have_X
// #undef LL_majors
// #undef majorevent
// #undef spoilerevent
// #undef UniqCritterIndx
// #undef program_state.stopprint

/*insight.c*/
