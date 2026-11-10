import {C} from './c-runtime.js';
/* NetHack 5.0	read.c	$NHDT-Date: 1762577372 2025/11/07 20:49:32 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.323 $ */
/* Copyright (c) Stichting Mathematisch Centrum, Amsterdam, 1985. */
/*-Copyright (c) Robert Patrick Rankin, 2012. */
/* NetHack may be freely redistributed.  See license for details. */





































/* MAIL_STRUCTURES */







export function learnscrolltyp(scrolltyp)
{
    if (!C.objects[scrolltyp].oc_name_known) {
        C.makeknown(scrolltyp);
        C.more_experienced(0, 10);
        return 1;
    } else
        return 0;
}

/* also called from teleport.c for scroll of teleportation */

export function learnscroll(sobj)
{
    /* it's implied that sobj->dknown is set;
       we couldn't be reading this scroll otherwise */
    if (sobj.oclass != C.SPBOOK_CLASS)
        C.callLocal(learnscrolltyp, sobj.otyp);
}

/* max spe is +99, min is -99 */

export function cap_spe(obj)
{
    if (obj) {
        if (C.abs(obj.spe) > C.SPE_LIM)
            obj.spe = C.sgn(obj.spe) * C.SPE_LIM;
    }
}


export function erode_obj_text(otmp, buf)
{
    let erosion = C.greatest_erosion(otmp);

    if (erosion)
        C.wipeout_text(buf, C.int((C.strlen(buf) * BigInt(erosion) / (2n * BigInt(C.MAX_ERODE)))),
                     otmp.o_id ^ C.uint(C.ubirthday));
    return buf;
}


export function tshirt_text(tshirt, buf)
{
    const shirt_msgs = [
        /* Scott Bigham */
      "I explored the Dungeons of Doom and all I got was this lousy T-shirt!",
        "Is that Mjollnir in your pocket or are you just happy to see me?",
      "It's not the size of your sword, it's how #enhance'd you are with it.",
        "Madame Elvira's House O' Succubi Lifetime Customer",
        "Madame Elvira's House O' Succubi Employee of the Month",
        "Ludios Vault Guards Do It In Small, Dark Rooms",
        "Yendor Military Soldiers Do It In Large Groups",
        "I survived Yendor Military Boot Camp",
        "Ludios Accounting School Intra-Mural Lacrosse Team",
        "Oracle(TM) Fountains 10th Annual Wet T-Shirt Contest",
        "Hey, black dragon!  Disintegrate THIS!",
        "I'm With Stupid -->",
        "Don't blame me, I voted for Izchak!",
        "Don't Panic", /* HHGTTG */
        "Furinkan High School Athletic Dept.",                /* Ranma 1/2 */
        "Hel-LOOO, Nurse!",                                   /* Animaniacs */
        "=^.^=",
        "100% goblin hair - do not wash",
        "Aberzombie and Fitch",
        "cK -- Cockatrice touches the Kop",
        "Don't ask me, I only adventure here",
        "Down with pants!",
        "d, your dog or a killer?",
        "FREE PUG AND NEWT!",
        "Go team ant!",
        "Got newt?",
        "Hello, my darlings!", /* Charlie Drake */
        "Hey!  Nymphs!  Steal This T-Shirt!",
        "I <3 Dungeon of Doom",
        "I <3 Maud",
        /* note: there is a similarly worded apron (alchemy smock) slogan */
        "I am a Valkyrie.  If you see me running, try to keep up.",
        "I am not a pack rat - I am a collector",
        "I bounced off a rubber tree",         /* Monkey Island */
        "Plunder Island Brimstone Beach Club", /* Monkey Island */
        "If you can read this, I can hit you with my polearm",
        "I'm confused!",
        "I scored with the princess",
        "I want to live forever or die in the attempt.",
        "Lichen Park",
        "LOST IN THOUGHT - please send search party",
        "Meat is Mordor",
        "Minetown Better Business Bureau",
        "Minetown Watch",
        /* Discworld riff; unfortunately long */
        ("Ms. Palm's House of Negotiable Affection--A Very Reputable" +
            " House Of Disrepute"),
        "Protection Racketeer",
        "Real men love Crom",
        "Somebody stole my Mojo!",
        "The Hellhound Gang",
        "The Werewolves",
        "They Might Be Storm Giants",
        "Weapons don't kill people, I kill people",
        "White Zombie",
        "You're killing me!",
        "Anhur State University - Home of the Fighting Fire Ants!",
        "FREE HUGS",
        "Serial Ascender",
        "Real men are valkyries",
        "Young Men's Cavedigging Association",
        "Occupy Fort Ludios",
        "I couldn't afford this T-shirt so I stole it!",
        "Mind flayers suck",
        "I'm not wearing any pants",
        "Down with the living!",
        "Pudding farmer",
        "Vegetarian",
        "Hello, I'm War!",
        "It is better to light a candle than to curse the darkness",
        "It is easier to curse the darkness than to light a candle",
        /* expanded "rock--paper--scissors" featured in TV show "Big Bang
           Theory" although they didn't create it (and an actual T-shirt
           with pentagonal diagram showing which choices defeat which) */
        "rock--paper--scissors--lizard--Spock!",
        /* "All men must die -- all men must serve" challenge and response
           from book series _A_Song_of_Ice_and_Fire_ by George R.R. Martin,
           TV show "Game of Thrones" (probably an actual T-shirt too...) */
        "/Valar morghulis/ -- /Valar dohaeris/",
    ];

    C.Strcpy(buf, shirt_msgs[tshirt.o_id % C.SIZE(shirt_msgs)]);
    return C.callLocal(erode_obj_text, tshirt, buf);
}


export function hawaiian_motif(shirt, buf)
{
    const hawaiian_motifs = [
        /* birds */
        "flamingo",
        "parrot",
        "toucan",
        "bird of paradise", /* could be a bird or a flower */
        /* sea creatures */
        "sea turtle",
        "tropical fish",
        "jellyfish",
        "giant eel",
        "water nymph",
        /* plants */
        "plumeria",
        "orchid",
        "hibiscus flower",
        "palm tree",
        /* other */
        "hula dancer",
        "sailboat",
        "ukulele",
    ];

    /* a tourist's starting shirt always has the same o_id; we need some
       additional randomness or else its design will never differ */
    let motif = C.uint(shirt.o_id ^ C.uint(C.ubirthday));

    C.Strcpy(buf, hawaiian_motifs[motif % C.SIZE(hawaiian_motifs)]);
    return buf;
}


export function hawaiian_design(shirt, buf)
{
    const hawaiian_bgs = [
        /* solid colors */
        "purple",
        "yellow",
        "red",
        "blue",
        "orange",
        "black",
        "green",
        /* adjectives */
        "abstract",
        "geometric",
        "patterned",
        "naturalistic",
    ];

    /* This hash method is slightly different than the one in hawaiian_motif;
       using the same formula in both cases may lead to some shirt combos
       never appearing, if the sizes of the two lists have common factors. */
    let bg = C.uint(shirt.o_id ^ C.uint(~C.ubirthday));

    C.Sprintf(buf, "%s on %s background",
            C.makeplural(C.callLocal(hawaiian_motif, shirt, buf)),
            C.an(hawaiian_bgs[bg % C.SIZE(hawaiian_bgs)]));
    return buf;
}


export function apron_text(apron, buf)
{
    const apron_msgs = [
        "Kiss the cook",
        "I'm making SCIENCE!",
        "Don't mess with the chef",
        "Don't make me poison you",
        "Gehennom's Kitchen",
        "Rat: The other white meat",
        "If you can't stand the heat, get out of Gehennom!",
        "If we weren't meant to eat animals, why are they made out of meat?",
        "If you don't like the food, I'll stab you",
        /* In the movie "The Sum of All Fears", a Russian worker in a weapons
           facility wears a T-shirt that a translator says reads, "I am a
           bomb technician, if you see me running ... try to catch up."
           In nethack, the quote is far more suitable to an alchemy smock
           (particularly since so many of these others are about cooking)
           than a T-shirt and is paraphrased to simplify/shorten it.
           [later... turns out that this is already a T-shirt message:
            "I am a Valkyrie.  If you see me running, try to keep up."
           so this one has been revised a little:  added alchemist prefix,
           changed "keep up" to original source's "catch up"] */
        "I am an alchemist; if you see me running, try to catch up...",
    ];

    C.Strcpy(buf, apron_msgs[apron.o_id % C.SIZE(apron_msgs)]);
    return C.callLocal(erode_obj_text, apron, buf);
}

const candy_wrappers = [
    "",                         /* (none -- should never happen) */
    "Apollo",                   /* Lost */
    "Moon Crunchy",             /* South Park */
    "Snacky Cake",    "Chocolate Nuggie", "The Small Bar",
    "Crispy Yum Yum", "Nilla Crunchie",   "Berry Bar",
    "Choco Nummer",   "Om-nom", /* Cat Macro */
    "Fruity Oaty",              /* Serenity */
    "Wonka Bar",                /* Charlie and the Chocolate Factory */
];

/* return the text of a candy bar's wrapper */

export function candy_wrapper_text(obj)
{
    /* modulo operation is just bullet proofing; 'spe' is already in range */
    return candy_wrappers[obj.spe % C.SIZE(candy_wrappers)];
}

/* assign a wrapper to a candy bar stack */

export function assign_candy_wrapper(obj)
{
    if (obj.otyp == C.CANDY_BAR) {
        /* skips candy_wrappers[0] */
        obj.spe = 1 + (C.rngSource(308, "assign_candy_wrapper"), C.rn2(C.SIZE(candy_wrappers) - 1));
    }
    return;
}

/* getobj callback for object to read */

export function read_ok(obj)
{
    if (!obj)
        return C.GETOBJ_EXCLUDE;

    if (obj.oclass == C.SCROLL_CLASS || obj.oclass == C.SPBOOK_CLASS)
        return C.GETOBJ_SUGGEST;

    return C.GETOBJ_DOWNPLAY;
}



/* the #read command; read a scroll or spell book or various other things */

export function doread()
{
    const find_any_braille = "feel any Braille writing.";
    let scroll;
    let confused, nodisappear;
    let otyp;

    /*
     * Reading while blind is allowed in most cases, including the
     * Book of the Dead but not regular spellbooks.  For scrolls, the
     * description has to have been seen or magically learned (so only
     * when scroll->dknown is true):  hero recites the label while
     * holding the unfurled scroll.  We deliberately don't require
     * free hands because that would cripple scroll of remove curse,
     * but we ought to be requiring hands or at least limbs.  The
     * recitation could be sub-vocal; actual speech isn't required.
     *
     * Reading while confused is allowed and can produce alternate
     * outcome.
     *
     * Reading while stunned is currently allowed but probably should
     * be prevented....
     */

    C.gk.known = 0;
    if (C.check_capacity(0))
        return C.ECMD_OK;

    scroll = C.getobj("read", read_ok, C.GETOBJ_PROMPT);
    if (!scroll)
        return C.ECMD_CANCEL;
    otyp = scroll.otyp;
    scroll.pickup_prev = 0; /* no longer 'just picked up' */

    /* outrumor has its own blindness check */
    if (otyp == C.FORTUNE_COOKIE) {
        if (C.flags.verbose)
            C.You("break up the cookie and throw away the pieces.");
        C.outrumor(C.bcsign(scroll), C.BY_COOKIE);
        if (!C.Blind)
            if (!C.u.uconduct.literate++)
                C.livelog_printf(C.LL_CONDUCT,
                               "became literate by reading a fortune cookie");
        C.useup(scroll);
        return C.ECMD_TIME;
    } else if (otyp == C.T_SHIRT || otyp == C.ALCHEMY_SMOCK
               || otyp == C.HAWAIIAN_SHIRT) {
        let buf = C.stackAlloc(C.BUFSZ), mesg;
        let endpunct;

        if (C.Blind) {
            C.You_cant(find_any_braille);
            return C.ECMD_OK;
        }
        /* can't read shirt worn under suit (under cloak is ok though) */
        if ((otyp == C.T_SHIRT || otyp == C.HAWAIIAN_SHIRT) && C.uarm
            && scroll == C.uarmu) {
            C.pline("%s shirt is obscured by %s%s.",
                  scroll.unpaid ? "That" : "Your", C.shk_your(buf, C.uarm),
                  C.suit_simple_name(C.uarm));
            return C.ECMD_OK;
        }
        if (otyp == C.HAWAIIAN_SHIRT) {
            C.pline("%s features %s.", C.flags.verbose ? "The design" : "It",
                  C.callLocal(hawaiian_design, scroll, buf));
            return C.ECMD_TIME;
        }
        if (!C.u.uconduct.literate++)
            C.livelog_printf(C.LL_CONDUCT, "became literate by reading %s",
                           (scroll.otyp == C.T_SHIRT) ? "a T-shirt"
                           : "an apron");

        /* populate 'buf[]' */
        mesg = (otyp == C.T_SHIRT) ? C.callLocal(tshirt_text, scroll, buf)
                                 : C.callLocal(apron_text, scroll, buf);
        endpunct = "";
        if (C.flags.verbose) {
            let ln = C.int(C.strlen(mesg));

            /* we will be displaying a sentence; need ending punctuation */
            if (ln > 0 && !C.strchr(".!?", C.byte(mesg + (ln - 1)).value))
                endpunct = ".";
            C.pline("It reads:");
        }
        C.pline("\"%s\"%s", mesg, endpunct);
        return C.ECMD_TIME;
    } else if ((otyp == C.DUNCE_CAP || otyp == C.CORNUTHAUM)
        /* note: "DUNCE" isn't directly connected to tourists but
           if everyone could read it, they would always be able to
           trivially distinguish between the two types of conical hat;
           limiting this to tourists is better than rejecting it */
               && C.Role_if(C.PM_TOURIST)) {
        /* another note: the misspelling, "wizzard", is correct;
           that's what is written on Rincewind's pointy hat from
           Pratchett's Discworld series, along with a lot of stars;
           rather than inked on or painted on, treat them as stitched
           or even separate pieces of fabric which have been attached
           (don't recall whether the books mention anything like that...) */
        let cap_text = (otyp == C.DUNCE_CAP) ? "DUNCE" : "WIZZARD";

        if (scroll.o_id % 3) {
            /* no need to vary this when blind; "on this ___" is important
               because it suggests that there might be something on others */
            C.You_cant("find anything to read on this %s.",
                     C.simpleonames(scroll));
            return C.ECMD_OK;
        }
        C.pline("%s on the %s.  It reads:  %s.",
              !C.Blind ? "There is writing" : "You feel lettering",
              C.simpleonames(scroll), cap_text);
        if (!C.u.uconduct.literate++)
            C.livelog_printf(C.LL_CONDUCT, "became literate by reading %s",
                           (otyp == C.DUNCE_CAP) ? "a dunce cap"
                                               : "a cornuthaum");

        /* yet another note: despite the fact that player will recognize
           the object type, don't make it become a discovery for hero */
        C.trycall(scroll);
        return C.ECMD_TIME;
    } else if (otyp == C.CREDIT_CARD) {
        const card_msgs = [
            "Leprechaun Gold Tru$t - Shamrock Card",
            "Magic Memory Vault Charge Card",
            "Larn National Bank",                /* Larn */
            "First Bank of Omega",               /* Omega */
            "Bank of Zork - Frobozz Magic Card", /* Zork */
            "Ankh-Morpork Merchant's Guild Barter Card",
            "Ankh-Morpork Thieves' Guild Unlimited Transaction Card",
            "Ransmannsby Moneylenders Association",
            "Bank of Gehennom - 99% Interest Card",
            "Yendorian Express - Copper Card",
            "Yendorian Express - Silver Card",
            "Yendorian Express - Gold Card",
            "Yendorian Express - Mithril Card",
            "Yendorian Express - Platinum Card", /* must be last */
        ];

        if (C.Blind) {
            C.You("feel the embossed numbers:");
        } else {
            if (C.flags.verbose)
                C.pline("It reads:");
            C.pline("\"%s\"",
                  scroll.oartifact
                      ? card_msgs[C.SIZE(card_msgs) - 1]
                      : card_msgs[scroll.o_id % (C.SIZE(card_msgs) - 1)]);
        }
        /* Make a credit card number */
        C.pline("\"%d0%d %ld%d1 0%d%d0\"%s",
              ((C.int(scroll.o_id) % 89) + 10),
              (C.int(scroll.o_id) % 4),
              (((C.long(scroll.o_id) * 499n) % 899999n) + 100000n),
              (C.int(scroll.o_id) % 10),
              (!(C.int(scroll.o_id) % 3)),
              (C.int(C.int(scroll.o_id) * 7) % 10),
              (C.flags.verbose || C.Blind) ? "." : "");
        if (!C.u.uconduct.literate++)
            C.livelog_printf(C.LL_CONDUCT,
                           "became literate by reading a credit card");

        return C.ECMD_TIME;
    } else if (otyp == C.CAN_OF_GREASE) {
        C.pline("This %s has no label.", C.singular(scroll, C.xname));
        return C.ECMD_OK;
    } else if (otyp == C.MAGIC_MARKER) {
        const red_mons = [
            C.PM_FIRE_ANT, C.PM_PYROLISK, C.PM_HELL_HOUND, C.PM_IMP,
            C.PM_LARGE_MIMIC, C.PM_LEOCROTTA, C.PM_SCORPION, C.PM_XAN,
            C.PM_GIANT_BAT, C.PM_WATER_MOCCASIN, C.PM_FLESH_GOLEM,
            C.PM_BARBED_DEVIL, C.PM_MARILITH, C.PM_PIRANHA
        ];
        let buf = C.stackAlloc(C.BUFSZ);
        let pm = C.mons[red_mons[scroll.o_id % C.SIZE(red_mons)]];

        if (C.Blind) {
            C.You_cant(find_any_braille);
            return C.ECMD_OK;
        }
        if (C.flags.verbose)
            C.pline("It reads:");
        C.Sprintf(buf, "%s", C.pmname(pm, C.NEUTRAL));
        C.pline("\"Magic Marker(TM) %s Red Ink Marker Pen.  Water Soluble.\"",
              C.upwords(buf));
        if (!C.u.uconduct.literate++)
            C.livelog_printf(C.LL_CONDUCT,
                           "became literate by reading a magic marker");

        return C.ECMD_TIME;
    } else if (scroll.oclass == C.COIN_CLASS) {
        if (C.Blind)
            C.You("feel the embossed words:");
        else if (C.flags.verbose)
            C.You("read:");
        C.pline("\"1 Zorkmid.  857 GUE.  In Frobs We Trust.\"");
        if (!C.u.uconduct.literate++)
            C.livelog_printf(C.LL_CONDUCT,
                           "became literate by reading a coin's engravings");

        return C.ECMD_TIME;
    } else if (C.is_art(scroll, C.ART_ORB_OF_FATE)) {
        if (C.Blind)
            C.You("feel the engraved signature:");
        else
            C.pline("It is signed:");
        C.pline("\"Odin.\"");
        if (!C.u.uconduct.literate++)
            C.livelog_printf(C.LL_CONDUCT,
                   "became literate by reading the divine signature of Odin");

        return C.ECMD_TIME;
    } else if (otyp == C.CANDY_BAR) {
        let wrapper = C.callLocal(candy_wrapper_text, scroll);

        if (C.Blind) {
            C.You_cant(find_any_braille);
            return C.ECMD_OK;
        }
        if (!C.byte(wrapper).value) {
            C.pline("The candy bar's wrapper is blank.");
            return C.ECMD_OK;
        }
        C.pline("The wrapper reads: \"%s\".", wrapper);
        if (!C.u.uconduct.literate++)
            C.livelog_printf(C.LL_CONDUCT,
                           "became literate by reading a candy bar wrapper");

        return C.ECMD_TIME;
    } else if (scroll.oclass != C.SCROLL_CLASS
               && scroll.oclass != C.SPBOOK_CLASS) {
        C.pline(C.silly_thing_to, "read");
        return C.ECMD_OK;
    } else if (C.Blind && otyp != C.SPE_BOOK_OF_THE_DEAD) {
        let what = 0;

        if (otyp == C.SPE_NOVEL)
            /* unseen novels are already distinguishable from unseen
               spellbooks so this isn't revealing any extra information */
            what = "words";
        else if (scroll.oclass == C.SPBOOK_CLASS)
            what = "mystic runes";
        else if (!scroll.dknown)
            what = "formula on the scroll";
        if (what) {
            C.pline("Being blind, you cannot read the %s.", what);
            return C.ECMD_OK;
        }
    }

    confused = (C.Confusion != 0);
    if (otyp == C.SCR_MAIL) {
        confused = 0; /* override */
        /* reading mail is a convenience for the player and takes
           place outside the game, so shouldn't affect gameplay;
           on the other hand, it starts by explicitly making the
           hero actively read something, which is pretty hard
           to simply ignore; as a compromise, if the player has
           maintained illiterate conduct so far, and this mail
           scroll didn't come from bones, ask for confirmation */
        if (!C.u.uconduct.literate) {
            if (!scroll.spe && C.y_n(
             "Reading mail will violate \"illiterate\" conduct.  Read anyway?"
                                   ) != 121)
                return C.ECMD_OK;
        }
    }

    /* Actions required to win the game aren't counted towards conduct */
    /* Novel conduct is handled in read_tribute so exclude it too */
    if (otyp != C.SPE_BOOK_OF_THE_DEAD && otyp != C.SPE_NOVEL
        && otyp != C.SPE_BLANK_PAPER && otyp != C.SCR_BLANK_PAPER)
        if (!C.u.uconduct.literate++)
            C.livelog_printf(C.LL_CONDUCT, "became literate by reading %s",
                           (scroll.oclass == C.SPBOOK_CLASS) ? "a book"
                           : (scroll.oclass == C.SCROLL_CLASS) ? "a scroll"
                             : C.something);

    if (scroll.oclass == C.SPBOOK_CLASS) {
        return C.study_book(scroll) ? C.ECMD_TIME : C.ECMD_OK;
    }
    scroll.in_use = 1; /* scroll, not spellbook, now being read */
    if (otyp != C.SCR_BLANK_PAPER) {
        let silently = !C.can_chant(C.gy.youmonst);

        /* a few scroll feedback messages describe something happening
           to the scroll itself, so avoid "it disappears" for those */
        nodisappear = (Number(Boolean(otyp == C.SCR_FIRE
                       || (otyp == C.SCR_REMOVE_CURSE && scroll.cursed))));
        if (C.Blind)
            C.pline(nodisappear
                      ? "You %s the formula on the scroll."
                      : "As you %s the formula on it, the scroll disappears.",
                  silently ? "cogitate" : "pronounce");
        else
            C.pline(nodisappear ? "You read the scroll."
                              : "As you read the scroll, it disappears.");
        if (confused) {
            if (C.Hallucination)
                C.pline("Being so trippy, you screw up...");
            else
                C.pline("Being confused, you %s the magic words...",
                      silently ? "misunderstand" : "mispronounce");
        }
    }
    if (!C.callLocal(seffects, scroll)) {
        if (!C.objects[otyp].oc_name_known) {
            if (C.gk.known)
                C.callLocal(learnscroll, scroll);
            else
                C.trycall(scroll);
        }
        scroll.in_use = 0;
        if (otyp != C.SCR_BLANK_PAPER)
            C.useup(scroll);
    }
    return C.ECMD_TIME;
}




export function stripspe(obj)
{
    if (obj.blessed || obj.spe <= 0) {
        C.pline1(C.nothing_happens);
    } else {
        /* order matters: message, shop handling, actual transformation */
        C.pline("%s briefly.", C.Yobjnam2(obj, "vibrate"));
        C.costly_alteration(obj, C.COST_UNCHRG);
        obj.spe = 0;
        if (obj.otyp == C.OIL_LAMP || obj.otyp == C.BRASS_LANTERN)
            obj.age = 0;
    }
}


export function p_glow1(otmp)
{
    C.pline("%s briefly.", C.Yobjnam2(otmp, C.Blind ? "vibrate" : "glow"));
}


export function p_glow2(otmp, color)
{
    C.pline("%s%s%s for a moment.", C.Yobjnam2(otmp, C.Blind ? "vibrate" : "glow"),
          C.Blind ? "" : " ", C.Blind ? "" : C.hcolor(color));
}


export function p_glow3(otmp, color)
{
    C.pline("%s feebly%s%s for a moment.",
          C.Yobjnam2(otmp, C.Blind ? "vibrate" : "glow"),
          C.Blind ? "" : " ", C.Blind ? "" : C.hcolor(color));
}

/* getobj callback for object to charge */

export function charge_ok(obj)
{
    if (!obj)
        return C.GETOBJ_EXCLUDE;

    if (obj.oclass == C.WAND_CLASS)
        return C.GETOBJ_SUGGEST;

    if (obj.oclass == C.RING_CLASS && C.objects[obj.otyp].oc_charged
        && obj.dknown && C.objects[obj.otyp].oc_name_known)
        return C.GETOBJ_SUGGEST;

    if (C.is_weptool(obj)) /* specific check before general tools */
        return C.GETOBJ_EXCLUDE;

    if (obj.oclass == C.TOOL_CLASS) {
        /* suggest tools that aren't oc_charged but can still be recharged */
        if (obj.otyp == C.BRASS_LANTERN
            || (obj.otyp == C.OIL_LAMP)
            /* only list magic lamps if they are not identified yet */
            || (obj.otyp == C.MAGIC_LAMP
                && !C.objects[C.MAGIC_LAMP].oc_name_known)) {
            return C.GETOBJ_SUGGEST;
        }
        /* suggest chargeable tools only if discovered, to prevent leaking
           info (e.g. revealing if an unidentified 'flute' is magic or not) */
        if (C.objects[obj.otyp].oc_charged) {
            return (obj.dknown && C.objects[obj.otyp].oc_name_known)
                     ? C.GETOBJ_SUGGEST : C.GETOBJ_DOWNPLAY;
        }
        return C.GETOBJ_EXCLUDE;
    }
    /* why are weapons/armor considered charged anyway?
     * make them selectable even so for "feeling of loss" message */
    return C.GETOBJ_EXCLUDE_SELECTABLE;
}

/* recharge an object; curse_bless is -1 if the recharging implement
   was cursed, +1 if blessed, 0 otherwise. */

export function recharge(obj, curse_bless)
{
    let n;
    let is_cursed, is_blessed;

    is_cursed = curse_bless < 0;
    is_blessed = curse_bless > 0;

    charged: {
    not_chargable: {
    if (obj.oclass == C.WAND_CLASS) {
        let lim = (obj.otyp == C.WAN_WISHING)
                      ? 1
                      : (C.objects[obj.otyp].oc_dir != C.NODIR) ? 8 : 15;

        /* undo any prior cancellation, even when is_cursed */
        if (obj.spe == -1)
            obj.spe = 0;

        /*
         * Recharging might cause wands to explode.
         *      v = number of previous recharges
         *            v = percentage chance to explode on this attempt
         *                    v = cumulative odds for exploding
         *      0 :   0       0
         *      1 :   0.29    0.29
         *      2 :   2.33    2.62
         *      3 :   7.87   10.28
         *      4 :  18.66   27.02
         *      5 :  36.44   53.62
         *      6 :  62.97   82.83
         *      7 : 100     100
         */
        n = C.int(obj.recharged);
        if (n > 0 && (obj.otyp == C.WAN_WISHING
                      || (n * n * n > (C.rngSource(762, "recharge"), C.rn2(7 * 7 * 7))))) { /* recharge_limit */
            C.callLocal(wand_explode, obj, (C.rngSource(763, "recharge"), C.rnd(lim)));
            return;
        }
        /* didn't explode, so increment the recharge count */
        obj.recharged = C.uint((n + 1));

        /* now handle the actual recharging */
        if (is_cursed) {
            C.callLocal(stripspe, obj);
        } else {
            n = (lim == 1) ? 1 : (C.rngSource(773, "recharge"), C.rn1(5, lim + 1 - 5));
            if (!is_blessed)
                n = (C.rngSource(775, "recharge"), C.rnd(n));

            if (obj.spe < n)
                obj.spe = n;
            else
                obj.spe++;
            if (obj.otyp == C.WAN_WISHING && obj.spe > 3) {
                /* wands can't give more than three wishes; this code is
                   currently unreachable but left in case the rules for
                   wands of wishing change in future */
                C.callLocal(wand_explode, obj, 1);
                return;
            }
            if (lim == 1)
                C.callLocal(p_glow3, obj, C.NH_BLUE);
            else if (obj.spe >= lim)
                C.callLocal(p_glow2, obj, C.NH_BLUE);
            else
                C.callLocal(p_glow1, obj);
/*[shop price doesn't vary by charge count]*/
/* update shop bill to reflect new higher price */
        }

    } else if (obj.oclass == C.RING_CLASS && C.objects[obj.otyp].oc_charged) {
        /* charging does not affect ring's curse/bless status */
        let s = is_blessed ? (C.rngSource(803, "recharge"), C.rnd(3)) : is_cursed ? -(C.rngSource(803, "recharge"), C.rnd(2)) : 1;
        let is_on = (Number(Boolean(obj == C.uleft || obj == C.uright)));

        /* destruction depends on current state, not adjustment */
        if (obj.spe > (C.rngSource(807, "recharge"), C.rn2(7)) || obj.spe <= -5) {
            C.pline("%s momentarily, then %s!", C.Yobjnam2(obj, "pulsate"),
                  C.otense(obj, "explode"));
            if (is_on)
                C.Ring_gone(obj);
            s = (C.rngSource(812, "recharge"), C.rnd(3 * C.abs(obj.spe))); /* amount of damage */
            C.useup(obj), obj = 0;
            C.losehp(C.Maybe_Half_Phys(s), "exploding ring", C.KILLED_BY_AN);
        } else {
            let mask = is_on ? (obj == C.uleft ? C.LEFT_RING : C.RIGHT_RING) : 0n;

            C.pline("%s spins %sclockwise for a moment.", C.Yname2(obj),
                  s < 0 ? "counter" : "");
            if (s < 0)
                C.costly_alteration(obj, C.COST_DECHNT);
            /* cause attributes and/or properties to be updated */
            if (is_on)
                C.Ring_off(obj);
            obj.spe += s; /* update the ring while it's off */
            if (is_on)
                C.setworn(obj, mask), C.Ring_on(obj);
            /* oartifact: if a touch-sensitive artifact ring is
               ever created the above will need to be revised  */
            /* update shop bill to reflect new higher price */
            if (s > 0 && obj.unpaid)
                C.alter_cost(obj, 0n);
        }

    } else if (obj.oclass == C.TOOL_CLASS) {
        let rechrg = C.int(obj.recharged);

        if (C.objects[obj.otyp].oc_charged) {
            /* tools don't have a limit, but the counter used does */
            if (rechrg < 7) /* recharge_limit */
                obj.recharged++;
        }
        switch (obj.otyp) {
        case C.BELL_OF_OPENING:
            if (is_cursed)
                C.callLocal(stripspe, obj);
            else if (is_blessed)
                obj.spe += (C.rngSource(848, "recharge"), C.rnd(3));
            else
                obj.spe += 1;
            if (obj.spe > 5)
                obj.spe = 5;
            break;
        case C.MAGIC_MARKER:
        case C.TINNING_KIT:
        case C.EXPENSIVE_CAMERA:
            if (is_cursed) {
                C.callLocal(stripspe, obj);
            } else if (rechrg && obj.otyp == C.MAGIC_MARKER) {
                /* previously recharged */
                obj.recharged = 1; /* override increment done above */
                if (obj.spe < 3)
                    C.Your("marker seems permanently dried out.");
                else
                    C.pline1(C.nothing_happens);
            } else if (is_blessed) {
                n = (C.rngSource(867, "recharge"), C.rn1(16, 15)); /* 15..30 */
                if (obj.spe + n <= 50)
                    obj.spe = 50;
                else if (obj.spe + n <= 75)
                    obj.spe = 75;
                else {
                    let chrg = C.int(obj.spe);
                    if ((chrg + n) > 127)
                        obj.spe = 127;
                    else
                        obj.spe += n;
                }
                C.callLocal(p_glow2, obj, C.NH_BLUE);
            } else {
                n = (C.rngSource(881, "recharge"), C.rn1(11, 10)); /* 10..20 */
                if (obj.spe + n <= 50)
                    obj.spe = 50;
                else {
                    let chrg = C.int(obj.spe);

                    if (chrg + n > C.SPE_LIM)
                        obj.spe = C.SPE_LIM;
                    else
                        obj.spe += n;
                }
                C.callLocal(p_glow2, obj, C.NH_WHITE);
            }
            break;
        case C.OIL_LAMP:
        case C.BRASS_LANTERN:
            if (is_cursed) {
                C.callLocal(stripspe, obj);
                if (obj.lamplit) {
                    if (!C.Blind)
                        C.pline("%s out!", C.Tobjnam(obj, "go"));
                    C.end_burn(obj, 1);
                }
            } else if (is_blessed) {
                obj.spe = 1;
                obj.age = 1500;
                C.callLocal(p_glow2, obj, C.NH_BLUE);
            } else {
                obj.spe = 1;
                obj.age += 750n;
                if (obj.age > 1500)
                    obj.age = 1500;
                C.callLocal(p_glow1, obj);
            }
            break;
        case C.CRYSTAL_BALL:
            if (obj.spe == -1) /* like wands, first uncancel */
                obj.spe = 0;

            if (is_cursed) {
                /* cursed scroll removes charges and curses ball */
                /*stripspe(obj); -- doesn't do quite what we want...*/
                if (!obj.cursed) {
                    C.callLocal(p_glow2, obj, C.NH_BLACK);
                    C.curse(obj);
                } else {
                    C.pline("%s briefly.", C.Yobjnam2(obj, "vibrate"));
                }
                if (obj.spe > 0)
                    C.costly_alteration(obj, C.COST_UNCHRG);
                obj.spe = 0;
            } else if (is_blessed) {
                /* blessed scroll sets charges to max and blesses ball */
                obj.spe = 7;
                C.callLocal(p_glow2, obj, !obj.blessed ? C.NH_LIGHT_BLUE : C.NH_BLUE);
                if (!obj.blessed)
                    C.bless(obj);
                /* [shop price stays the same regardless of charges or BUC] */
            } else {
                /* uncursed scroll increments charges and uncurses ball */
                if (obj.spe < 7 || obj.cursed) {
                    n = (C.rngSource(942, "recharge"), C.rnd(2));
                    obj.spe = C.min(obj.spe + n, 7);
                    if (!obj.cursed) {
                        C.callLocal(p_glow1, obj);
                    } else {
                        C.callLocal(p_glow2, obj, C.NH_AMBER);
                        C.uncurse(obj);
                    }
                } else {
                    /* charges at max and ball not being uncursed */
                    C.pline1(C.nothing_happens);
                }
            }
            break;
        case C.HORN_OF_PLENTY:
        case C.BAG_OF_TRICKS:
        case C.CAN_OF_GREASE:
            if (is_cursed) {
                C.callLocal(stripspe, obj);
            } else if (is_blessed) {
                if (obj.spe <= 10)
                    obj.spe += (C.rngSource(963, "recharge"), C.rn1(10, 6));
                else
                    obj.spe += (C.rngSource(965, "recharge"), C.rn1(5, 6));
                if (obj.spe > 50)
                    obj.spe = 50;
                C.callLocal(p_glow2, obj, C.NH_BLUE);
            } else {
                obj.spe += (C.rngSource(970, "recharge"), C.rn1(5, 2));
                if (obj.spe > 50)
                    obj.spe = 50;
                C.callLocal(p_glow1, obj);
            }
            break;
        case C.MAGIC_FLUTE:
        case C.MAGIC_HARP:
        case C.FROST_HORN:
        case C.FIRE_HORN:
        case C.DRUM_OF_EARTHQUAKE:
            if (is_cursed) {
                C.callLocal(stripspe, obj);
            } else if (is_blessed) {
                obj.spe += (C.rngSource(984, "recharge"), C.d(2, 4));
                if (obj.spe > 20)
                    obj.spe = 20;
                C.callLocal(p_glow2, obj, C.NH_BLUE);
            } else {
                obj.spe += (C.rngSource(989, "recharge"), C.rnd(4));
                if (obj.spe > 20)
                    obj.spe = 20;
                C.callLocal(p_glow1, obj);
            }
            break;
        default:
            break not_chargable;
            /*NOTREACHED*/
            break;
        } /* switch */

    } else {
        break not_chargable;
    }
    break charged;
    }

        C.You("have a feeling of loss.");
    }

    /* prevent enchantment from getting out of range */
    C.callLocal(cap_spe, obj);
}

/*
 * Forget some things (e.g. after reading a scroll of amnesia).  When called,
 * the following are always forgotten:
 *      - felt ball & chain
 *      - skill training
 *
 * Other things are subject to flags:
 *      howmuch & ALL_SPELLS    = forget all spells
 */

export function forget(howmuch)
{
    let mtmp;

    if (C.Punished)
        C.u.bc_felt = 0; /* forget felt ball&chain */

    if (howmuch & C.ALL_SPELLS)
        C.losespells();

    /* Forget some skills. */
    C.drain_weapon_skill((C.rngSource(1031, "forget"), C.rnd(howmuch ? 5 : 3)));

    /* forget having seen monsts (affects recognizing unseen ones by sound) */
    for (mtmp = C.fmon; mtmp; mtmp = mtmp.nmon)
        if (mtmp != C.u.usteed && mtmp != C.u.ustuck)
            mtmp.meverseen = 0;
    /* [perhaps ought to forget having seen every monster on every level] */
    for (mtmp = C.gm.migrating_mons; mtmp; mtmp = mtmp.nmon)
        mtmp.meverseen = 0;
}

/* monster is hit by scroll of taming's effect */

export function maybe_tame(mtmp, sobj)
{
    let was_tame = mtmp.mtame;
    let was_peaceful = mtmp.mpeaceful;

    if (sobj.cursed) {
        C.setmangry(mtmp, 0);
        if (was_peaceful && !mtmp.mpeaceful)
            return -1;
    } else {
        /* for a shopkeeper, tamedog() will call make_happy_shk() but
           not tame the target, so call it even if taming gets resisted */
        if (!C.resist(mtmp, sobj.oclass, 0, C.NOTELL) || mtmp.isshk)
            C.tamedog(mtmp, sobj, 0);

        if ((!was_peaceful && mtmp.mpeaceful) || was_tame != mtmp.mtame)
            return 1;
    }
    return 0;
}

/* Can a stinking cloud physically exist at a certain position?
 * NOT the same thing as can_center_cloud.
 */

export function valid_cloud_pos(x, y)
{
    if (!C.isok(x,y))
        return 0;
    return Number(Boolean(C.ACCESSIBLE(C.levl[x][y].typ) || C.is_pool(x, y) || C.is_lava(x, y)));
}

/* Callback for getpos_sethilite, also used in determining whether a scroll
 * should have its regular effects, or not because it was out of range.
 */

export function can_center_cloud(x, y)
{
    if (!C.callLocal(valid_cloud_pos, x, y))
        return 0;
    return (Number(Boolean(C.cansee(x, y) && C.distu(x, y) < 32)));
}


export function display_stinking_cloud_positions(on_off)
{
    let x, y, dx, dy;
    let dist = 6;

    if (on_off) {
        /* on */
        C.tmp_at(C.DISP_BEAM, C.cmap_to_glyph(C.S_goodpos));
        for (dx = -dist; dx <= dist; dx++)
            for (dy = -dist; dy <= dist; dy++) {
                x = C.u.ux + dx;
                y = C.u.uy + dy;
                /* hero's location is allowed but highlighting the hero's
                   spot makes map harder to read (if using '$' rather than
                   by changing background color) */
                if (C.u_at(x, y))
                    continue;
                if (C.callLocal(can_center_cloud, x, y))
                    C.tmp_at(x, y);
            }
    } else {
        /* off */
        C.tmp_at(C.DISP_END, 0);
    }
}


export function seffect_enchant_armor(sobjp)
{
    let sobj = sobjp.value;
    let s;
    let special_armor;
    let same_color;
    let otmp = C.some_armor(C.gy.youmonst);
    let sblessed = sobj.blessed;
    let scursed = sobj.cursed;
    let confused = (C.Confusion != 0);
    let old_erodeproof, new_erodeproof;

    if (!otmp) {
        C.strange_feeling(sobj, !C.Blind
                        ? "Your skin glows then fades."
                        : "Your skin feels warm for a moment.");
        sobjp.value = 0; /* useup() in strange_feeling() */
        C.exercise(C.A_CON, !scursed);
        C.exercise(C.A_STR, !scursed);
        return;
    }
    if (confused) {
        old_erodeproof = (otmp.oerodeproof != 0);
        new_erodeproof = !scursed;
        otmp.oerodeproof = 0; /* for messages */
        if (C.Blind) {
            otmp.rknown = 0;
            C.pline("%s warm for a moment.", C.Yobjnam2(otmp, "feel"));
        } else {
            otmp.rknown = 1;
            C.pline("%s covered by a %s %s %s!", C.Yobjnam2(otmp, "are"),
                  scursed ? "mottled" : "shimmering",
                  C.hcolor(scursed ? C.NH_BLACK : C.NH_GOLDEN),
                  scursed ? "glow"
                  : (C.is_shield(otmp) ? "layer" : "shield"));
        }
        if (new_erodeproof && (otmp.oeroded || otmp.oeroded2)) {
            otmp.oeroded = otmp.oeroded2 = 0;
            C.pline("%s as good as new!",
                  C.Yobjnam2(otmp, C.Blind ? "feel" : "look"));
        }
        if (old_erodeproof && !new_erodeproof) {
            /* restore old_erodeproof before shop charges */
            otmp.oerodeproof = 1;
            C.costly_alteration(otmp, C.COST_DEGRD);
        }
        otmp.oerodeproof = new_erodeproof ? 1 : 0;
        return;
    }
    /* elven armor vibrates warningly when enchanted beyond a limit */
    special_armor = Number(Boolean(C.is_elven_armor(otmp)
        || (C.Role_if(C.PM_WIZARD) && otmp.otyp == C.CORNUTHAUM)));
    if (scursed)
        same_color = (Number(Boolean(otmp.otyp == C.BLACK_DRAGON_SCALE_MAIL
                      || otmp.otyp == C.BLACK_DRAGON_SCALES)));
    else
        same_color = (Number(Boolean(otmp.otyp == C.SILVER_DRAGON_SCALE_MAIL
                      || otmp.otyp == C.SILVER_DRAGON_SCALES
                      || otmp.otyp == C.SHIELD_OF_REFLECTION)));
    if (C.Blind)
        same_color = 0;

    /* KMH -- catch underflow */
    s = C.char(scursed ? -otmp.spe : otmp.spe);
    if (s > (special_armor ? 5 : 3) && (C.rngSource(1179, "seffect_enchant_armor"), C.rn2(s))) {
        otmp.in_use = 1;
        C.pline("%s violently %s%s%s for a while, then %s.", C.Yname2(otmp),
              C.otense(otmp, C.Blind ? "vibrate" : "glow"),
              (!C.Blind && !same_color) ? " " : "",
              (C.Blind || same_color) ? "" : C.hcolor(scursed ? C.NH_BLACK
                                                  : C.NH_SILVER),
              C.otense(otmp, "evaporate"));
        C.remove_worn_item(otmp, 0);
        C.useup(otmp);
        return;
    }
    if (s < -100)
        s = C.char(-100); /* avoid integer overflow with very negative armor */

    /* Base power of the enchantment:

       2 for -1 to +0 armor;
       1 for +1 to +2 armor;
       0 for +3 to +4 armor, etc.

       When disenchanting, everything is done with reversed signs. */
    s = C.char(Math.trunc((4 - s) / 2));

    /* Elven/artifact and nonmagical armor is easier to enchant;
       blessed scrolls are more effective. */
    if (special_armor)
        s = C.char(s + 1);
    if (!C.objects[otmp.otyp].oc_magic)
        s = C.char(s + 1);
    if (sblessed)
        s = C.char(s + 1);

    if (s <= 0) {
        s = C.char(0);
        if (otmp.spe > 0 && !(C.rngSource(1214, "seffect_enchant_armor"), C.rn2(otmp.spe)))
            s = C.char(1);
    } else {
        s = C.char((C.rngSource(1217, "seffect_enchant_armor"), C.rnd(s)));
    }
    if (s > 11)
        s = C.char(11);    /* unlikely but possible: avoids an overflow later */

    if (scursed)
        s = C.char(-s);

    if (s >= 0 && C.Is_dragon_scales(otmp)) {
        let was_lit = otmp.lamplit;
        let old_light = C.artifact_light(otmp) ? C.arti_light_radius(otmp) : 0;

        /* dragon scales get turned into dragon scale mail */
        C.pline("%s merges and hardens!", C.Yname2(otmp));
        C.setworn(0, C.W_ARM);
        /* assumes same order */
        otmp.otyp += C.GRAY_DRAGON_SCALE_MAIL - C.GRAY_DRAGON_SCALES;
        otmp.lamplit = 0; /* don't want bless() or uncurse() to adjust
                            * light radius because scales -> scale_mail will
                            * result in a second increase with own message */
        if (sblessed) {
            otmp.spe++;
            C.callLocal(cap_spe, otmp);
            if (!otmp.blessed)
                C.bless(otmp);
        } else if (otmp.cursed)
            C.uncurse(otmp);
        otmp.known = 1;
        C.setworn(otmp, C.W_ARM);
        if (otmp.unpaid)
            C.alter_cost(otmp, 0n); /* shop bill */
        otmp.lamplit = was_lit;
        if (old_light)
            C.maybe_adjust_light(otmp, old_light);
        return;
    }
    C.pline("%s %s%s%s%s for a %s.", C.Yname2(otmp),
          (s == 0) ? "violently " : "",
          C.otense(otmp, C.Blind ? "vibrate" : "glow"),
          (!C.Blind && !same_color) ? " " : "",
          (C.Blind || same_color)
          ? "" : C.hcolor(scursed ? C.NH_BLACK : C.NH_SILVER),
          (s * s > 1) ? "while" : "moment");
    /* [this cost handling will need updating if shop pricing is
       ever changed to care about curse/bless status of armor] */
    if (s < 0)
        C.costly_alteration(otmp, C.COST_DECHNT);
    if (scursed && !otmp.cursed)
        C.curse(otmp);
    else if (sblessed && !otmp.blessed)
        C.bless(otmp);
    else if (!scursed && otmp.cursed)
        C.uncurse(otmp);
    if (s) {
        let oldspe = otmp.spe;
        /* despite being schar, it shouldn't be possible for spe to wrap
           here because it has been capped at 99 and s is quite small;
           however, might need to change s if it takes spe past 99 */
        otmp.spe += s;
        C.callLocal(cap_spe, otmp); /* make sure that it doesn't exceed SPE_LIM */
        s = C.char(otmp.spe - oldspe); /* cap_spe() might have throttled 's' */
        if (s) /* skip if it got changed to 0 */
            C.adj_abon(otmp, s); /* adjust armor bonus for Dex or Int+Wis */
        C.gk.known = otmp.known;
        /* update shop bill to reflect new higher price */
        if (s > 0 && otmp.unpaid)
            C.alter_cost(otmp, 0n);
    }

    if ((otmp.spe > (special_armor ? 5 : 3))
        && (special_armor || !(C.rngSource(1287, "seffect_enchant_armor"), C.rn2(7))))
        C.pline("%s %s.", C.Yobjnam2(otmp, "suddenly vibrate"),
              C.Blind ? "again" : "unexpectedly");
}

/* destroy a random cursed armor worn by hero */

export function disintegrate_cursed_armor()
{
    let armors = C.localArray("struct obj *", 10);
    let idx = 0;

    armors[0] = 0;
    if (C.uarm && C.uarm.cursed)
        armors[idx++] = C.uarm;
    if (C.uarmc && C.uarmc.cursed)
        armors[idx++] = C.uarmc;
    if (C.uarmh && C.uarmh.cursed)
        armors[idx++] = C.uarmh;
    if (C.uarms && C.uarms.cursed)
        armors[idx++] = C.uarms;
    if (C.uarmg && C.uarmg.cursed)
        armors[idx++] = C.uarmg;
    if (C.uarmf && C.uarmf.cursed)
        armors[idx++] = C.uarmf;
    if (C.uarmu && C.uarmu.cursed)
        armors[idx++] = C.uarmu;
    if (!idx)
        return 0;

    if (C.disintegrate_arm(armors[(C.rngSource(1317, "disintegrate_cursed_armor"), C.rn2(idx))]))
        return 1;

    return 0;
}


export function seffect_destroy_armor(sobjp)
{
    let sobj = sobjp.value;
    let otmp = C.some_armor(C.gy.youmonst);
    let scursed = sobj.cursed;
    let confused = (C.Confusion != 0);
    let old_erodeproof, new_erodeproof;

    if (confused) {
        if (!otmp) {
            C.strange_feeling(sobj, "Your bones itch.");
            sobjp.value = 0; /* useup() in strange_feeling() */
            C.exercise(C.A_STR, 0);
            C.exercise(C.A_CON, 0);
            return;
        }
        old_erodeproof = (otmp.oerodeproof != 0);
        new_erodeproof = scursed;
        otmp.oerodeproof = 0; /* for messages */
        C.callLocal(p_glow2, otmp, C.NH_PURPLE);
        if (old_erodeproof && !new_erodeproof) {
            /* restore old_erodeproof before shop charges */
            otmp.oerodeproof = 1;
            C.costly_alteration(otmp, C.COST_DEGRD);
        }
        otmp.oerodeproof = new_erodeproof ? 1 : 0;
        return;
    }

    if (scursed) {
        if (otmp && otmp.cursed) {
            /* armor and scroll both cursed */
            C.pline("%s.", C.Yobjnam2(otmp, "vibrate"));
            if (otmp.spe >= -6) {
                otmp.spe += -1;
                C.adj_abon(otmp, -1);
            }
            C.make_stunned((C.HStun & C.TIMEOUT) + C.long((C.rngSource(1361, "seffect_destroy_armor"), C.rn1(10, 10))), 1);
        } else if (C.disintegrate_arm(otmp)) {
            C.gk.known = 1;
            return;
        }
    } else {
        let gets_choice = (Number(Boolean(otmp && sobj && sobj.blessed
                               && C.count_worn_armor() > 1)));

        if (gets_choice) {
            let atmp;

            if (!C.objects[sobj.otyp].oc_name_known)
                C.pline("This is %s!", C.an(C.actualoname(sobj)));
            C.gk.known = 1;
            atmp = C.getobj("destroy", C.any_worn_armor_ok, C.GETOBJ_PROMPT);
            /* check the return value, if user picked non-valid obj */
            if (C.any_worn_armor_ok(atmp) == C.GETOBJ_SUGGEST)
                otmp = atmp;
            if (C.disintegrate_arm(otmp)) {
                C.gk.known = 1;
                return;
            }
        } else if (sobj.blessed && C.callLocal(disintegrate_cursed_armor)) {
            C.gk.known = 1;
            return;
        } else if (!C.destroy_arm()) {
            C.strange_feeling(sobj, "Your skin itches.");
            sobjp.value = 0; /* useup() in strange_feeling() */
            C.exercise(C.A_STR, 0);
            C.exercise(C.A_CON, 0);
            return;
        } else
            C.gk.known = 1;
    }
}


export function seffect_confuse_monster(sobjp)
{
    let sobj = sobjp.value;
    let sblessed = sobj.blessed,
            scursed = sobj.cursed,
            confused = (C.Confusion != 0),
            altfeedback = (Number(Boolean(C.Blind || C.Invisible)));
    let hands = C.makeplural(C.body_part(C.HAND));

    if (C.gy.youmonst.data.mlet != C.S_HUMAN || scursed) {
        if (!C.HConfusion)
            C.You_feel("confused.");
        C.make_confused(C.HConfusion + C.long((C.rngSource(1411, "seffect_confuse_monster"), C.rnd(100))), 0);
    } else if (confused) {
        if (!sblessed) {
            C.Your("%s begin to %s%s.", hands,
                 altfeedback ? "tingle" : "glow ",
                 altfeedback ? "" : C.hcolor(C.NH_PURPLE));
            C.make_confused(C.HConfusion + C.long((C.rngSource(1417, "seffect_confuse_monster"), C.rnd(100))), 0);
        } else {
            C.pline("A %s%s surrounds your %s.",
                  altfeedback ? "" : C.hcolor(C.NH_RED),
                  altfeedback ? "faint buzz" : " glow", C.body_part(C.HEAD));
            C.make_confused(0n, 1);
        }
    } else {
        /* scroll vs spell */
        let incr = (sobj.oclass == C.SCROLL_CLASS) ? 3 : 0;

        if (!sblessed) {
            if (altfeedback)
                C.Your("%s tingle%s.", hands, C.u.umconf ? " even more" : "");
            else if (!C.u.umconf)
                C.Your("%s begin to glow %s.", hands, C.hcolor(C.NH_RED));
            else
                C.pline_The("%s glow of your %s intensifies.", C.hcolor(C.NH_RED),
                          hands);
            incr += (C.rngSource(1436, "seffect_confuse_monster"), C.rnd(2));
        } else {
            if (altfeedback)
                C.Your("%s tingle %s sharply.", hands,
                     C.u.umconf ? "even more" : "very");
            else
                C.Your("%s glow %s brilliant %s.", hands,
                     C.u.umconf ? "an even more" : "a", C.hcolor(C.NH_RED));
            incr += (C.rngSource(1444, "seffect_confuse_monster"), C.rn1(8, 2));
        }
        /* after a while, repeated uses become less effective */
        if (C.u.umconf >= 40)
            incr = 1;
        C.u.umconf += C.uint(incr);
    }
}


export function seffect_scare_monster(sobjp)
{
    let sobj = sobjp.value;
    let otyp = sobj.otyp;
    let scursed = sobj.cursed;
    let confused = (C.Confusion != 0);
    let ct = 0;
    let mtmp;

    for (mtmp = C.fmon; mtmp; mtmp = mtmp.nmon) {
        if (C.DEADMONSTER(mtmp))
            continue;
        if (C.cansee(mtmp.mx, mtmp.my)) {
            if (confused || scursed) {
                mtmp.mflee = mtmp.mfrozen = mtmp.msleeping = 0;
                mtmp.mcanmove = 1;
            } else if (!C.resist(mtmp, sobj.oclass, 0, C.NOTELL))
                C.monflee(mtmp, 0, 0, 0);
            if (!mtmp.mtame)
                ct++; /* pets don't laugh at you */
        }
    }
    if (otyp == C.SCR_SCARE_MONSTER || !ct) {
        if (confused || scursed) {
            ;
        } else {
            ;
        }
        C.You_hear("%s %s.", (confused || scursed) ? "sad wailing"
                 : "maniacal laughter",
                 !ct ? "in the distance" : "close by");
    }
}


export function seffect_remove_curse(sobjp)
{
    let sobj = sobjp.value; /* scroll or fake spellbook */
    let otyp = sobj.otyp;
    let sblessed = sobj.blessed;
    let scursed = sobj.cursed;
    let confused = (C.Confusion != 0);
    let obj, nxto;
    let wornmask;

    C.You_feel(!C.Hallucination
             ? (!confused ? "like someone is helping you."
                : "like you need some help.")
             : (!confused ? "in touch with the Universal Oneness."
                : "the power of the Force against you!"));

    if (scursed) {
        C.pline_The("scroll disintegrates.");
    } else {
        /* 5.0: this used to use a straight
               for (obj = invent; obj; obj = obj->nobj) {}
           traversal, but for the confused case, secondary weapon might
           become cursed and be dropped, moving it from the invent chain
           to the floor chain at hero's spot, so we have to remember the
           next object prior to processing the current one */
        for (obj = C.gi.invent; obj; obj = nxto) {
            nxto = obj.nobj;
            /* gold isn't subject to cursing and blessing */
            if (obj.oclass == C.COIN_CLASS)
                continue;
            /* hide current scroll from itself so that perm_invent won't
               show known blessed scroll losing bknown when confused */
            if (obj == sobj && obj.quan == 1n)
                continue;
            wornmask = (obj.owornmask & ~(C.W_BALL | C.W_ART | C.W_ARTI));
            if (wornmask && !sblessed) {
                /* handle a couple of special cases; we don't
                   allow auxiliary weapon slots to be used to
                   artificially increase number of worn items */
                if (obj == C.uswapwep) {
                    if (!C.u.twoweap)
                        wornmask = 0n;
                } else if (obj == C.uquiver) {
                    if (obj.oclass == C.WEAPON_CLASS) {
                        /* mergeable weapon test covers ammo,
                           missiles, spears, daggers & knives */
                        if (!C.objects[obj.otyp].oc_merge)
                            wornmask = 0n;
                    } else if (obj.oclass == C.GEM_CLASS) {
                        /* possibly ought to check whether
                           alternate weapon is a sling... */
                        if (!C.uslinging())
                            wornmask = 0n;
                    } else {
                        /* weptools don't merge and aren't
                           reasonable quivered weapons */
                        wornmask = 0n;
                    }
                }
            }
            if (sblessed || wornmask || obj.otyp == C.LOADSTONE
                /* this treats an in-use leash as a worn item but does not
                   do the same for lit lamp/candle [seems inconsistent] */
                || (obj.otyp == C.LEASH && obj.leashmon)) {
                /* water price varies by curse/bless status */
                let shop_h2o = (Number(Boolean(obj.unpaid && obj.otyp == C.POT_WATER)));

                if (confused) {
                    C.blessorcurse(obj, 2);
                    /* lose knowledge of this object's curse/bless
                       state (even if it didn't actually change) */
                    obj.bknown = 0;
                    /* blessorcurse() only affects uncursed items
                       so no need to worry about price of water
                       going down (hence no costly_alteration) */
                    if (shop_h2o && (obj.cursed || obj.blessed))
                        C.alter_cost(obj, 0n); /* price goes up */
                } else if (obj.cursed) {
                    if (shop_h2o)
                        C.costly_alteration(obj, C.COST_UNCURS);
                    C.uncurse(obj);
                    /* if the object was known to be cursed and is now
                       known not to be, make the scroll known; it's
                       trivial to identify anyway by comparing inventory
                       before and after */
                    if (obj.bknown && otyp == C.SCR_REMOVE_CURSE)
                        C.callLocal(learnscrolltyp, C.SCR_REMOVE_CURSE);
                }
            }
        }
        /* if riding, treat steed's saddle as if part of hero's invent */
        if (C.u.usteed && (obj = C.which_armor(C.u.usteed, C.W_SADDLE)) != 0) {
            if (confused) {
                C.blessorcurse(obj, 2);
                obj.bknown = 0; /* skip set_bknown() */
            } else if (obj.cursed) {
                C.uncurse(obj);
                /* like rndcurse(sit.c), effect on regular inventory
                   doesn't show things glowing but saddle does */
                if (!C.Blind) {
                    C.pline("%s %s.", C.Yobjnam2(obj, "glow"),
                              C.hcolor("amber"));
                    obj.bknown = C.Hallucination ? 0 : 1;
                } else {
                    obj.bknown = 0; /* skip set_bknown() */
                }
            }
        }
    }
    if (C.Punished && !confused)
        C.callLocal(unpunish);
    if (C.u.utrap && C.u.utraptype == C.TT_BURIEDBALL) {
        C.buried_ball_to_freedom();
        C.pline_The("clasp on your %s vanishes.", C.body_part(C.LEG));
    }
    C.update_inventory();
}


export function seffect_create_monster(sobjp)
{
    let sobj = sobjp.value;
    let sblessed = sobj.blessed;
    let scursed = sobj.cursed;
    let confused = (C.Confusion != 0);

    if (C.create_critters(1 + ((confused || scursed) ? 12 : 0)
                        + ((sblessed || (C.rngSource(1616, "seffect_create_monster"), C.rn2(73))) ? 0 : (C.rngSource(1616, "seffect_create_monster"), C.rnd(4))),
                        confused ? C.mons[C.PM_ACID_BLOB]
                        : 0,
                        0))
        C.gk.known = 1;
    /* no need to flush monsters; we ask for identification only if the
     * monsters are not visible
     */
}


export function seffect_enchant_weapon(sobjp)
{
    let sobj = sobjp.value;
    let sblessed = sobj.blessed;
    let scursed = sobj.cursed;
    let confused = (C.Confusion != 0);
    let old_erodeproof, new_erodeproof;
    let s;

    /* [What about twoweapon mode?  Proofing/repairing/enchanting both
       would be too powerful, but shouldn't we choose randomly between
       primary and secondary instead of always acting on primary?] */
    if (confused && C.uwep
        && C.erosion_matters(C.uwep) && C.uwep.oclass != C.ARMOR_CLASS) {
        old_erodeproof = (C.uwep.oerodeproof != 0);
        new_erodeproof = !scursed;
        C.uwep.oerodeproof = 0; /* for messages */
        if (C.Blind) {
            C.uwep.rknown = 0;
            C.Your("weapon feels warm for a moment.");
        } else {
            C.uwep.rknown = 1;
            C.pline("%s covered by a %s %s %s!", C.Yobjnam2(C.uwep, "are"),
                  scursed ? "mottled" : "shimmering",
                  C.hcolor(scursed ? C.NH_PURPLE : C.NH_GOLDEN),
                  scursed ? "glow" : "shield");
        }
        if (new_erodeproof && (C.uwep.oeroded || C.uwep.oeroded2)) {
            C.uwep.oeroded = C.uwep.oeroded2 = 0;
            C.pline("%s as good as new!",
                  C.Yobjnam2(C.uwep, C.Blind ? "feel" : "look"));
        }
        if (old_erodeproof && !new_erodeproof) {
            /* restore old_erodeproof before shop charges */
            C.uwep.oerodeproof = 1;
            C.costly_alteration(C.uwep, C.COST_DEGRD);
        }
        C.uwep.oerodeproof = new_erodeproof ? 1 : 0;
        return;
    }
    s = scursed ? -1
        : !C.uwep ? 1 /* guard further tests against null pointer */
          : (C.uwep.spe >= 9) ? ((C.rngSource(1669, "seffect_enchant_weapon"), C.rn2(C.uwep.spe)) == 0) /* usually 0, maybe  1 */
            : sblessed ? (C.rngSource(1670, "seffect_enchant_weapon"), C.rnd(3 - Math.trunc(C.uwep.spe / 3))) /* >= 9 case prevents rnd(0) */
              : 1; /* uncursed */
    if (!C.chwepon(sobj, s))
        sobjp.value = 0; /* nothing enchanted: strange_feeling -> useup */
    if (C.uwep)
        C.callLocal(cap_spe, C.uwep);
}


export function seffect_taming(sobjp)
{
    let sobj = sobjp.value;
    let confused = (C.Confusion != 0);
    let candidates, res, results, vis_results;

    if (C.u.uswallow) {
        candidates = 1;
        results = vis_results = C.callLocal(maybe_tame, C.u.ustuck, sobj);
    } else {
        let i, j, bd = confused ? 5 : 1;
        let mtmp;

        /* note: maybe_tame() can return either positive or
           negative values, but not both for the same scroll */
        candidates = results = vis_results = 0;
        for (i = -bd; i <= bd; i++)
            for (j = -bd; j <= bd; j++) {
                if (!C.isok(C.u.ux + i, C.u.uy + j))
                    continue;
                if ((mtmp = C.m_at(C.u.ux + i, C.u.uy + j)) != 0
                    || (!i && !j && (mtmp = C.u.usteed) != 0)) {
                    ++candidates;
                    res = C.callLocal(maybe_tame, mtmp, sobj);
                    results += res;
                    if (C.canspotmon(mtmp))
                        vis_results += res;
                }
            }
    }
    if (!results) {
        C.pline("Nothing interesting %s.",
              !candidates ? "happens" : "seems to happen");
    } else {
        C.pline_The("neighborhood %s %sfriendlier.",
                  vis_results ? "is" : "seems",
                  (results < 0) ? "un" : "");
        if (vis_results > 0)
            C.gk.known = 1;
    }
}


export function seffect_genocide(sobjp)
{
    let sobj = sobjp.value;
    let otyp = sobj.otyp;
    let sblessed = sobj.blessed;
    let scursed = sobj.cursed;
    let already_known = (Number(Boolean(sobj.oclass == C.SPBOOK_CLASS /* spell */
                             || C.objects[otyp].oc_name_known)));

    if (!already_known)
        C.You("have found a scroll of genocide!");
    C.gk.known = 1;
    if (sblessed)
        C.callLocal(do_class_genocide);
    else
        C.callLocal(do_genocide, (!scursed) | (2 * !!C.Confusion));
}


export function seffect_light(sobjp)
{
    let sobj = sobjp.value;
    let sblessed = sobj.blessed;
    let scursed = sobj.cursed;
    let confused = (C.Confusion != 0);

    if (!confused) {
        if (!C.Blind)
            C.gk.known = 1;
        C.callLocal(litroom, !scursed, sobj);
        if (!scursed) {
            if (C.lightdamage(sobj, 1, 5))
                C.gk.known = 1;
        }
    } else {
        let pm = scursed ? C.PM_BLACK_LIGHT : C.PM_YELLOW_LIGHT;

        if ((C.svm.mvitals[pm].mvflags & C.G_GONE)) {
            C.pline("Tiny lights sparkle in the air momentarily.");
        } else {
            /* surround with cancelled tame lights which won't explode */
            let mon;
            let sawlights = 0;
            let i, numlights = (C.rngSource(1765, "seffect_light"), C.rn1(2, 3)) + (sblessed * 2);

            for (i = 0; i < numlights; ++i) {
                mon = C.makemon(C.mons[pm], C.u.ux, C.u.uy,
                              C.MM_EDOG | C.NO_MINVENT | C.MM_NOMSG);
                if (mon) {
                    C.initedog(mon, 1);
                    mon.msleeping = 0;
                    mon.mcan = 1;
                    if (C.canspotmon(mon))
                        sawlights = 1;
                    C.newsym(mon.mx, mon.my);
                }
            }
            if (sawlights) {
                C.pline("Lights appear all around you!");
                C.gk.known = 1;
            }
        }
    }
}


export function seffect_charging(sobjp)
{
    let sobj = sobjp.value;
    let otyp = sobj.otyp;
    let sblessed = sobj.blessed;
    let scursed = sobj.cursed;
    let confused = (C.Confusion != 0);
    let already_known = (Number(Boolean(sobj.oclass == C.SPBOOK_CLASS /* spell */
                             || C.objects[otyp].oc_name_known)));
    let otmp;

    if (confused) {
        if (scursed) {
            C.You_feel("discharged.");
            C.u.uen = 0;
        } else {
            C.You_feel("charged up!");
            C.u.uen += (C.rngSource(1805, "seffect_charging"), C.d(sblessed ? 6 : 4, 4));
            if (C.u.uen > C.u.uenmax) /* if current energy is already at   */
                C.u.uenmax = C.u.uen; /* or near maximum, increase maximum */
            else
                C.u.uen = C.u.uenmax; /* otherwise restore current to max  */
        }
        C.disp.botl = 1;
        return;
    }
    /* known = TRUE; -- handled inline here */
    if (!already_known) {
        C.pline("This is a charging scroll.");
        C.callLocal(learnscroll, sobj);
    }
    /* use it up now to prevent it from showing in the
       getobj picklist because the "disappears" message
       was already delivered */
    C.useup(sobj);
    sobjp.value = 0; /* it's gone */
    otmp = C.getobj("charge", charge_ok, C.GETOBJ_PROMPT | C.GETOBJ_ALLOWCNT);
    if (otmp)
        C.callLocal(recharge, otmp, scursed ? -1 : sblessed ? 1 : 0);
}


export function seffect_amnesia(sobjp)
{
    let sobj = sobjp.value;
    let sblessed = sobj.blessed;

    C.gk.known = 1;
    C.callLocal(forget, (!sblessed ? C.ALL_SPELLS : 0));
    if (C.Hallucination) /* Ommmmmm! */
        C.Your("mind releases itself from mundane concerns.");
    else if (!C.strncmpi(C.svp.plname, "Maud", 4))
        C.pline("As your mind turns inward on itself," +
              " you forget everything else.");
    else if ((C.rngSource(1842, "seffect_amnesia"), C.rn2(2)))
        C.pline("Who was that Maud person anyway?");
    else
        C.pline("Thinking of Maud you forget everything else.");
    C.exercise(C.A_WIS, 0);
}


export function seffect_fire(sobjp)
{
    let sobj = sobjp.value;
    let otyp = sobj.otyp;
    let sblessed = sobj.blessed;
    let confused = (C.Confusion != 0);
    let already_known = (Number(Boolean(sobj.oclass == C.SPBOOK_CLASS /* spell */
                             || C.objects[otyp].oc_name_known)));
    const cc = C.localRecord("struct nhcoord");
    let dam, cval;

    cc.x = C.u.ux;
    cc.y = C.u.uy;
    cval = C.bcsign(sobj);
    dam = Math.trunc((2 * ((C.rngSource(1864, "seffect_fire"), C.rn1(3, 3)) + 2 * cval) + 1) / 3);
    C.useup(sobj);
    sobjp.value = 0; /* it's gone */
    if (!already_known)
        C.callLocal(learnscrolltyp, C.SCR_FIRE);
    if (confused) {
        if (C.Underwater) {
            C.pline("A little %s around you vaporizes.", C.hliquid("water"));
        }
        else if (C.Fire_resistance) {
            C.shieldeff(C.u.ux, C.u.uy);
            C.monstseesu(C.M_SEEN_FIRE);
            if (!C.Blind)
                C.pline("Oh, look, what a pretty fire in your %s.",
                      C.makeplural(C.body_part(C.HAND)));
            else
                C.You_feel("a pleasant warmth in your %s.",
                         C.makeplural(C.body_part(C.HAND)));
        } else {
            C.monstunseesu(C.M_SEEN_FIRE);
            C.pline_The("scroll catches fire and you burn your %s.",
                      C.makeplural(C.body_part(C.HAND)));
            C.losehp(1, "scroll of fire", C.KILLED_BY_AN);
        }
        return;
    }
    if (C.Underwater) {
        C.pline_The("%s around you vaporizes violently!", C.hliquid("water"));
    } else {
        if (sblessed) {
            if (!already_known)
                C.pline("This is a scroll of fire!");
            dam *= 5;
            C.pline("Where do you want to center the explosion?");
            C.getpos_sethilite(display_stinking_cloud_positions,
                             can_center_cloud);
            C.getpos(cc, 1, "the desired position");
            if (!C.callLocal(can_center_cloud, cc.x, cc.y)) {
                /* try to reach too far, get burned */
                cc.x = C.u.ux;
                cc.y = C.u.uy;
            }
        }
        if (C.u_at(cc.x, cc.y)) {
            C.pline_The("scroll erupts in a tower of flame!");
            C.iflags.last_msg = C.PLNMSG_TOWER_OF_FLAME; /* for explode() */
            C.burn_away_slime();
        }
    }
/* explained in splatter_burning_oil(explode.c) */
    C.explode(cc.x, cc.y, C.ZT_SPELL_O_FIRE, dam, C.SCROLL_CLASS, C.EXPL_FIERY);
}


export function seffect_earth(sobjp)
{
    let sobj = sobjp.value;
    let sblessed = sobj.blessed;
    let scursed = sobj.cursed;
    let confused = (C.Confusion != 0);

    /* TODO: handle steeds */
    if (!C.Is_rogue_level(C.u.uz) && C.has_ceiling(C.u.uz)
        && (!C.In_endgame(C.u.uz) || C.Is_earthlevel(C.u.uz))) {
        let x, y;
        let nboulders = 0;

        /* Identify the scroll */
        if (C.u.uswallow) {
            C.You_hear("rumbling.");
        } else {
            if (!C.avoid_ceiling(C.u.uz)) {
                C.pline_The("%s rumbles %s you!", C.ceiling(C.u.ux, C.u.uy),
                          sblessed ? "around" : "above");
            } else {
                let matbuf = C.stackAlloc(C.BUFSZ);
                let avalanche = "avalanche";

                C.Sprintf(matbuf, "%s",
                        sblessed ? C.makeplural(avalanche) : C.an(avalanche));
                C.pline("%s of boulders %s %s you!",
                      C.upstart(matbuf), C.vtense(matbuf, "materialize"),
                      sblessed ? "around" : "above");
            }
        }
        C.gk.known = 1;
        C.sokoban_guilt();

        /* Loop through the surrounding squares */
        if (!scursed)
            for (x = C.u.ux - 1; x <= C.u.ux + 1; x++) {
                for (y = C.u.uy - 1; y <= C.u.uy + 1; y++) {
                    /* Is this a suitable spot? */
                    if (C.isok(x, y) && !C.closed_door(x, y)
                        && !C.IS_OBSTRUCTED(C.levl[x][y].typ)
                        && !C.IS_AIR(C.levl[x][y].typ)
                        && (x != C.u.ux || y != C.u.uy)) {
                        nboulders +=
                            C.callLocal(drop_boulder_on_monster, x, y, confused, 1);
                    }
                }
            }
        /* Attack the player */
        if (!sblessed) {
            C.callLocal(drop_boulder_on_player, confused, !scursed, 1, 0);
        } else if (!nboulders)
            C.pline("But nothing else happens.");
    }
}


export function seffect_punishment(sobjp)
{
    let sobj = sobjp.value;
    let sblessed = sobj.blessed;
    let confused = (C.Confusion != 0);

    C.gk.known = 1;
    if (confused || sblessed) {
        C.You_feel("guilty.");
        return;
    }
    C.callLocal(punish, sobj);
}


export function seffect_stinking_cloud(sobjp)
{
    let sobj = sobjp.value;
    let otyp = sobj.otyp;
    let already_known = (Number(Boolean(sobj.oclass == C.SPBOOK_CLASS /* spell */
                             || C.objects[otyp].oc_name_known)));

    if (!already_known)
        C.You("have found a scroll of stinking cloud!");
    C.gk.known = 1;
    C.callLocal(do_stinking_cloud, sobj, already_known);
}


export function seffect_blank_paper(sobjp)
{
    if (C.Blind)
        C.You("don't remember there being any magic words on this scroll.");
    else
        C.pline("This scroll seems to be blank.");
    C.gk.known = 1;
}


export function seffect_teleportation(sobjp)
{
    let sobj = sobjp.value;
    let scursed = sobj.cursed;
    let confused = (C.Confusion != 0);

    if (confused || scursed) {
        C.level_tele();
        /* gives "materialize on different/same level!" message, must
           be a teleport scroll */
        C.gk.known = 1;
    } else {
        C.scrolltele(sobj);
        /* this will call learnscroll() as appropriate, and has results
           which maybe shouldn't result in the scroll becoming known;
           either way, no need to set gk.known here */
    }
}


export function seffect_gold_detection(sobjp)
{
    let sobj = sobjp.value;
    let scursed = sobj.cursed;
    let confused = (C.Confusion != 0);

    if ((confused || scursed) ? C.trap_detect(sobj) : C.gold_detect(sobj))
        sobjp.value = 0; /* failure: strange_feeling() -> useup() */
}


export function seffect_food_detection(sobjp)
{
    let sobj = sobjp.value;

    if (C.food_detect(sobj))
        sobjp.value = 0; /* nothing detected: strange_feeling -> useup */
}


export function seffect_identify(sobjp)
{
    let sobj = sobjp.value;
    let otyp = sobj.otyp;
    let is_scroll = (sobj.oclass == C.SCROLL_CLASS);
    let sblessed = sobj.blessed;
    let scursed = sobj.cursed;
    let confused = (C.Confusion != 0);
    let already_known = (Number(Boolean(sobj.oclass == C.SPBOOK_CLASS /* spell */
                             || C.objects[otyp].oc_name_known)));

    if (is_scroll) { /* scroll of identify */
        /* known = TRUE; -- handled inline here */
        /* use up the scroll first, before learnscrolltyp() -> makeknown()
           performs perm_invent update; also simplifies empty invent check */
        C.useup(sobj);
        sobjp.value = 0; /* it's gone */
        /* scroll just identifies itself for any scroll read while confused
           or for cursed scroll read without knowing identify yet */
        if (confused || (scursed && !already_known))
            C.You("identify this as an identify scroll.");
        else if (!already_known)
            C.pline("This is an identify scroll.");
        if (!already_known)
            C.callLocal(learnscrolltyp, C.SCR_IDENTIFY);
        if (confused || (scursed && !already_known))
            return;
    }

    if (C.gi.invent) {
        let cval = 1;
        if (sblessed || (!scursed && !(C.rngSource(2086, "seffect_identify"), C.rn2(5)))) {
            cval = (C.rngSource(2087, "seffect_identify"), C.rn2(5));
            /* note: if cval==0, identify all items */
            if (cval == 1 && sblessed && C.Luck > 0)
                ++cval;
        }
        C.identify_pack(cval, !already_known);
    } else {
        /* spell cast with inventory empty or scroll read when it's
           the only item leaving empty inventory after being used up */
        C.pline("You're not carrying anything%s to be identified.",
              (is_scroll) ? " else" : "");
    }
}


export function seffect_magic_mapping(sobjp)
{
    let sobj = sobjp.value;
    let is_scroll = (sobj.oclass == C.SCROLL_CLASS);
    let sblessed = sobj.blessed;
    let scursed = sobj.cursed;
    let confused = (C.Confusion != 0);
    let cval;

    if (is_scroll) {
        if (C.svl.level.flags.nommap) {
            C.Your("mind is filled with crazy lines!");
            if (C.Hallucination)
                C.pline("Wow!  Modern art.");
            else
                C.Your("%s spins in bewilderment.", C.body_part(C.HEAD));
            C.make_confused(C.HConfusion + C.long((C.rngSource(2118, "seffect_magic_mapping"), C.rnd(30))), 0);
            return;
        }
        if (sblessed) {
            let x, y;

            for (x = 1; x < C.COLNO; x++)
                for (y = 0; y < C.ROWNO; y++)
                    if (C.levl[x][y].typ == C.SDOOR) {
                        C.cvt_sdoor_to_door(C.levl[x][y]);
                        if (C.Is_rogue_level(C.u.uz))
                            C.unblock_point(x, y);
                    }
            /* do_mapping() already reveals secret passages */
        }
        C.gk.known = 1;
    }

    if (C.svl.level.flags.nommap) {
        C.Your("%s spins as %s blocks the spell!", C.body_part(C.HEAD),
             C.something);
        C.make_confused(C.HConfusion + C.long((C.rngSource(2139, "seffect_magic_mapping"), C.rnd(30))), 0);
        return;
    }
    C.pline("A map coalesces in your mind!");
    cval = (Number(Boolean(scursed && !confused)));
    if (cval)
        C.HConfusion = 1; /* to screw up map */
    C.notice_mon_off();
    C.do_mapping();
    C.notice_mon_on();
    if (cval) {
        C.HConfusion = 0; /* restore */
        C.pline("Unfortunately, you can't grasp the details.");
    }
}


export function seffect_mail(sobjp)
{
    let sobj = sobjp.value;
    let odd = (sobj.o_id % 2) == 1;

    C.gk.known = 1;
    switch (sobj.spe) {
    case 2:
        /* "stamped scroll" created via magic marker--without a stamp */
        C.pline("This scroll is marked \"%s\".",
              odd ? "Postage Due" : "Return to Sender");
        break;
    case 1:
        /* scroll of mail obtained from bones file or from wishing;
           note to the puzzled: the game Larn actually sends you junk
           mail if you win! */
        C.pline("This seems to be %s.",
              odd ? "a chain letter threatening your luck"
              : "junk mail addressed to the finder of the Eye of Larn");
        break;
    default:
        C.readmail(sobj);
/* unreachable since with MAIL undefined, sobj->spe won't be 0;
           as a precaution, be prepared to give arbitrary feedback;
           caller has already reported that it disappears upon reading */
        break;
    }
}
/* MAIL_STRUCTURES */

/* scroll effects; return 1 if we use up the scroll and possibly make it
   become discovered, 0 if caller should take care of those side-effects */

export function seffects(sobj)
/* sobj - scroll or fake spellbook for spell */
{
    sobj = C.localScalar("struct obj *", sobj);
    let otyp = sobj.value.otyp;

    if (C.objects[otyp].oc_magic)
        C.exercise(C.A_WIS, 1);                       /* just for trying */

    switch (otyp) {
    case C.SCR_MAIL:
        C.callLocal(seffect_mail, sobj);
        break;
    case C.SCR_ENCHANT_ARMOR:
        C.callLocal(seffect_enchant_armor, sobj);
        break;
    case C.SCR_DESTROY_ARMOR:
        C.callLocal(seffect_destroy_armor, sobj);
        break;
    case C.SCR_CONFUSE_MONSTER:
    case C.SPE_CONFUSE_MONSTER:
        C.callLocal(seffect_confuse_monster, sobj);
        break;
    case C.SCR_SCARE_MONSTER:
    case C.SPE_CAUSE_FEAR:
        C.callLocal(seffect_scare_monster, sobj);
        break;
    case C.SCR_BLANK_PAPER:
        C.callLocal(seffect_blank_paper, sobj);
        break;
    case C.SCR_REMOVE_CURSE:
    case C.SPE_REMOVE_CURSE:
        C.callLocal(seffect_remove_curse, sobj);
        break;
    case C.SCR_CREATE_MONSTER:
    case C.SPE_CREATE_MONSTER:
        C.callLocal(seffect_create_monster, sobj);
        break;
    case C.SCR_ENCHANT_WEAPON:
        C.callLocal(seffect_enchant_weapon, sobj);
        break;
    case C.SCR_TAMING:
    case C.SPE_CHARM_MONSTER:
        C.callLocal(seffect_taming, sobj);
        break;
    case C.SCR_GENOCIDE:
        C.callLocal(seffect_genocide, sobj);
        break;
    case C.SCR_LIGHT:
        C.callLocal(seffect_light, sobj);
        break;
    case C.SCR_TELEPORTATION:
        C.callLocal(seffect_teleportation, sobj);
        break;
    case C.SCR_GOLD_DETECTION:
        C.callLocal(seffect_gold_detection, sobj);
        break;
    case C.SCR_FOOD_DETECTION:
    case C.SPE_DETECT_FOOD:
        C.callLocal(seffect_food_detection, sobj);
        break;
    case C.SCR_IDENTIFY:
    case C.SPE_IDENTIFY:
        C.callLocal(seffect_identify, sobj);
        break;
    case C.SCR_CHARGING:
        C.callLocal(seffect_charging, sobj);
        break;
    case C.SCR_MAGIC_MAPPING:
    case C.SPE_MAGIC_MAPPING:
        C.callLocal(seffect_magic_mapping, sobj);
        break;
    case C.SCR_AMNESIA:
        C.callLocal(seffect_amnesia, sobj);
        break;
    case C.SCR_FIRE:
        C.callLocal(seffect_fire, sobj);
        break;
    case C.SCR_EARTH:
        C.callLocal(seffect_earth, sobj);
        break;
    case C.SCR_PUNISHMENT:
        C.callLocal(seffect_punishment, sobj);
        break;
    case C.SCR_STINKING_CLOUD:
        C.callLocal(seffect_stinking_cloud, sobj);
        break;
    default:
        C.impossible("What weird effect is this? (%u)", otyp);
    }
    /* if sobj is gone, we've already called useup() above and the
       update_inventory() that it performs might have come too soon
       (before charging an item, for instance) */
    if (!sobj.value)
        C.update_inventory();
    return sobj.value ? 0 : 1;
}


export function drop_boulder_on_player(confused, helmet_protects, byu, skip_uswallow)
{
    let dmg;
    let otmp2;

    /* hit monster if swallowed */
    if (C.u.uswallow && !skip_uswallow) {
        C.callLocal(drop_boulder_on_monster, C.u.ux, C.u.uy, confused, byu);
        return;
    }

    otmp2 = C.mksobj(confused ? C.ROCK : C.BOULDER, 0, 0);
    if (!otmp2)
        return;
    otmp2.quan = confused ? (C.rngSource(2312, "drop_boulder_on_player"), C.rn1(5, 2)) : 1;
    otmp2.owt = C.weight(otmp2);
    if (!C.amorphous(C.gy.youmonst.data) && !C.Passes_walls
        && !C.noncorporeal(C.gy.youmonst.data) && !C.unsolid(C.gy.youmonst.data)) {
        C.You("are hit by %s!", C.doname(otmp2));
        dmg = C.int((C.long(C.dmgval(otmp2, C.gy.youmonst)) * otmp2.quan));
        if (C.uarmh && helmet_protects) {
            if (C.hard_helmet(C.uarmh)) {
                C.pline("Fortunately, you are wearing a hard helmet.");
                if (dmg > 2)
                    dmg = 2;
            } else if (C.flags.verbose) {
                C.pline("%s does not protect you.", C.Yname2(C.uarmh));
            }
        }
    } else
        dmg = 0;
    C.wake_nearto(C.u.ux, C.u.uy, 4 * 4);
    /* Must be before the losehp(), for bones files */
    if (!C.flooreffects(otmp2, C.u.ux, C.u.uy, "fall")) {
        C.place_object(otmp2, C.u.ux, C.u.uy);
        C.stackobj(otmp2);
        C.newsym(C.u.ux, C.u.uy);
    }
    if (dmg)
        C.losehp(C.Maybe_Half_Phys(dmg), "scroll of earth", C.KILLED_BY_AN);
}


export function drop_boulder_on_monster(x, y, confused, byu)
{
    let otmp2;
    let mtmp;

    /* Make the object(s) */
    otmp2 = C.mksobj(confused ? C.ROCK : C.BOULDER, 0, 0);
    if (!otmp2)
        return 0; /* Shouldn't happen */
    otmp2.quan = confused ? (C.rngSource(2350, "drop_boulder_on_monster"), C.rn1(5, 2)) : 1;
    otmp2.owt = C.weight(otmp2);

    /* Find the monster here (won't be player) */
    mtmp = C.m_at(x, y);
    if (mtmp && !C.amorphous(mtmp.data) && !C.passes_walls(mtmp.data)
        && !C.noncorporeal(mtmp.data) && !C.unsolid(mtmp.data)) {
        let helmet = C.which_armor(mtmp, C.W_ARMH);
        let mdmg;

        if (C.cansee(mtmp.mx, mtmp.my)) {
            C.pline("%s is hit by %s!", C.Monnam(mtmp), C.doname(otmp2));
            if (mtmp.minvis && !C.canspotmon(mtmp))
                C.map_invisible(mtmp.mx, mtmp.my);
        } else if (C.engulfing_u(mtmp))
            C.You_hear("something hit %s %s over your %s!",
                     C.s_suffix(C.mon_nam(mtmp)), C.mbodypart(mtmp, C.STOMACH),
                     C.body_part(C.HEAD));

        mdmg = C.long(C.dmgval(otmp2, mtmp)) * otmp2.quan;
        if (helmet) {
            if (C.hard_helmet(helmet)) {
                if (C.canspotmon(mtmp))
                    C.pline("Fortunately, %s is wearing a hard helmet.",
                          C.mon_nam(mtmp));
                else if (!C.Deaf)
                    C.You_hear("a clanging sound.");
                if (mdmg > 2)
                    mdmg = 2n;
            } else {
                if (C.canspotmon(mtmp))
                    C.pline("%s's %s does not protect %s.", C.Monnam(mtmp),
                          C.xname(helmet), C.mhim(mtmp));
            }
        }
        mtmp.mhp = C.int(C.long(mtmp.mhp) - mdmg);
        if (C.DEADMONSTER(mtmp)) {
            if (byu) {
                C.killed(mtmp);
            } else {
                C.pline("%s is killed.", C.Monnam(mtmp));
                C.mondied(mtmp);
            }
        } else {
            C.wakeup(mtmp, byu);
        }
        C.wake_nearto(x, y, 4 * 4);
    } else if (C.engulfing_u(mtmp)) {
        C.obfree(otmp2, 0);
        /* fall through to player */
        C.callLocal(drop_boulder_on_player, confused, 1, 0, 1);
        return 1;
    }
    /* Drop the rock/boulder to the floor */
    if (!C.flooreffects(otmp2, x, y, "fall")) {
        C.place_object(otmp2, x, y);
        C.stackobj(otmp2);
        C.newsym(x, y); /* map the rock */
    }
    return 1;
}

/* overcharging any wand or zapping/engraving cursed wand */
/* recharging */
export function wand_explode(obj, chg)
{
    let expl = !chg ? "suddenly" : "vibrates violently and";
    let dmg, n, k;

    /* number of damage dice */
    if (!chg)
        chg = 2; /* zap/engrave adjustment */
    n = obj.spe + chg;
    if (n < 2)
        n = 2; /* arbitrary minimum */
    /* size of damage dice */
    switch (obj.otyp) {
    case C.WAN_WISHING:
        k = 12;
        break;
    case C.WAN_CANCELLATION:
    case C.WAN_DEATH:
    case C.WAN_POLYMORPH:
    case C.WAN_UNDEAD_TURNING:
        k = 10;
        break;
    case C.WAN_COLD:
    case C.WAN_FIRE:
    case C.WAN_LIGHTNING:
    case C.WAN_MAGIC_MISSILE:
        k = 8;
        break;
    case C.WAN_NOTHING:
        k = 4;
        break;
    default:
        k = 6;
        break;
    }
    /* inflict damage and destroy the wand */
    dmg = (C.rngSource(2450, "wand_explode"), C.d(n, k));
    obj.in_use = 1; /* in case losehp() is fatal (or --More--^C) */
    C.pline("%s %s explodes!", C.Yname2(obj), expl);
    C.losehp(C.Maybe_Half_Phys(dmg), "exploding wand", C.KILLED_BY_AN);
    C.useup(obj);
    /* obscure side-effect */
    C.exercise(C.A_STR, 0);
}

/* used to collect gremlins being hit by light so that they can be processed
   after vision for the entire lit area has been brought up to date */



/*
 * Low-level lit-field update routine.
 */

export function set_lit(x, y, val)
{
    let mtmp;
    let gremlin;

    if (val) {
        C.levl[x][y].lit = 1;
        if ((mtmp = C.m_at(x, y)) != 0 && mtmp.data == C.mons[C.PM_GREMLIN]) {
            gremlin = C.record("struct litmon", C.alloc(C.litmonSize));
            gremlin.mon = mtmp;
            gremlin.nxt = C.gremlins;
            C.gremlins = gremlin;
        }
    } else {
        C.levl[x][y].lit = 0;
        C.snuff_light_source(x, y);
    }
}

/* True: make nearby area lit; False: cursed scroll */
export function litroom(on, obj)
/* scroll, spellbook (for spell), or wand of light */
{
    let otmp, nextobj;
    let blessed_effect = (Number(Boolean(obj && obj.oclass == C.SCROLL_CLASS
                              && obj.blessed)));
    let no_op = (Number(Boolean(C.u.uswallow || C.Underwater || C.Is_waterlevel(C.u.uz))));
    const is_lit = C.localScalar("char", 0); /* value is irrelevant but assign something anyway; its
                      * address is used as a 'not null' flag for set_lit() */

    /* update object lights and produce message (provided you're not blind) */
    if (!on) {
        let still_lit = 0;

        /*
         * The magic douses lamps,&c too and might curse artifact lights.
         *
         * FIXME?
         *  Shouldn't this affect all lit objects in the area of effect
         *  rather than just those carried by the hero?
         */
        for (otmp = C.gi.invent; otmp; otmp = nextobj) {
            nextobj = otmp.nobj;
            if (otmp.lamplit) {
                if (!C.artifact_light(otmp))
                    C.snuff_lit(otmp);
                else
                    /* wielded Sunsword or worn gold dragon scales/mail;
                       maybe lower its BUC state if not already cursed */
                    C.impact_arti_light(otmp, 1, C.boolean(!C.Blind));

                if (otmp.lamplit)
                    ++still_lit;
            }
        }
        /* scroll of light becomes discovered when not blind, so some
           message to justify that is needed */
        if (!C.Blind) {
            /* for the still_lit case, we don't know at this point whether
               anything currently visibly lit is going to go dark; if this
               message came after the darkening, we could count visibly
               lit squares before and after to know; we do know that being
               swallowed won't be affected--the interior is still lit */
            if (still_lit)
                C.pline_The("ambient light seems dimmer.");
            else if (C.u.uswallow)
                C.pline("It seems even darker in here than before.");
            else
                C.You("are surrounded by darkness!");
        }
    } else { /* on */
        if (blessed_effect) {
            /* might bless artifact lights; no effect on ordinary lights */
            for (otmp = C.gi.invent; otmp; otmp = nextobj) {
                nextobj = otmp.nobj;
                if (otmp.lamplit && C.artifact_light(otmp))
                    /* wielded Sunsword or worn gold dragon scales/mail;
                       maybe raise its BUC state if not already blessed */
                    C.impact_arti_light(otmp, 0, C.boolean(!C.Blind));
            }
        }
        if (C.u.uswallow) {
            if (C.Blind)
                ; /* no feedback */
            else if (C.digests(C.u.ustuck.data))
                C.pline("%s %s is lit.", C.s_suffix(C.Monnam(C.u.ustuck)),
                      C.mbodypart(C.u.ustuck, C.STOMACH));
            else if (C.is_whirly(C.u.ustuck.data))
                C.pline("%s shines briefly.", C.Monnam(C.u.ustuck));
            else
                C.pline("%s glistens.", C.Monnam(C.u.ustuck));
        } else if (!C.Blind && (!C.Is_rogue_level(C.u.uz)
                              || C.levl[C.u.ux][C.u.uy].typ != C.CORR)) {
            C.pline("A lit field %ssurrounds you!", no_op ? "briefly " : "");
        }
    }

    /* No-op when swallowed or in water */
    if (no_op)
        return;
    /*
     *  If we are darkening the room and the hero is punished but not
     *  blind, then we have to pick up and replace the ball and chain so
     *  that we don't remember them if they are out of sight.
     */
    if (C.Punished && !on && !C.Blind)
        C.move_bc(1, 0, C.uball.ox, C.uball.oy, C.uchain.ox, C.uchain.oy);

    if (C.Is_rogue_level(C.u.uz)) {
        /* Can't use do_clear_area because MAX_RADIUS is too small */
        /* rogue lighting must light the entire room */
        let rnum = C.levl[C.u.ux][C.u.uy].roomno - C.ROOMOFFSET;
        let rx, ry;

        if (rnum >= 0) {
            for (rx = C.svr.rooms[rnum].lx - 1; rx <= C.svr.rooms[rnum].hx + 1;
                 rx++)
                for (ry = C.svr.rooms[rnum].ly - 1;
                     ry <= C.svr.rooms[rnum].hy + 1; ry++)
                    C.callLocal(set_lit, rx, ry,
                            (on ? is_lit : 0));
            C.svr.rooms[rnum].rlit = on;
        }
        /* hallways remain dark on the rogue level */
    } else if (C.is_art(obj, C.ART_SUNSWORD)) {
        /* Sunsword's #invoke power directed up or down lights hero's spot
           (do_clear_area() rejects radius 0 so call set_lit() directly) */
        C.callLocal(set_lit, C.u.ux, C.u.uy, is_lit);
    } else {
        C.do_clear_area(C.u.ux, C.u.uy, blessed_effect ? 9 : 5,
                      set_lit, (on ? is_lit : 0));
    }

    /*
     *  If we are not blind, then force a redraw on all positions in sight
     *  by temporarily blinding the hero.  The vision recalculation will
     *  correctly update all previously seen positions *and* correctly
     *  set the waslit bit [could be messed up from above].
     */
    if (!C.Blind) {
        C.vision_recalc(2);

        /* replace ball&chain */
        if (C.Punished && !on)
            C.move_bc(0, 0, C.uball.ox, C.uball.oy, C.uchain.ox, C.uchain.oy);
    }

    C.gv.vision_full_recalc = 1; /* delayed vision recalculation */
    if (C.gremlins) {
        let gremlin;

        /* can't delay vision recalc after all */
        C.vision_recalc(0);
        /* after vision has been updated, monsters who are affected
           when hit by light can now be hit by it */
        do {
            gremlin = C.gremlins;
            C.gremlins = gremlin.nxt;
            C.light_hits_gremlin(gremlin.mon, (C.rngSource(2630, "litroom"), C.rnd(5)));
            C.free(gremlin);
        } while (C.gremlins);
    }
    return;
}


export function do_class_genocide()
{
    let i, j, immunecnt, gonecnt, goodcnt, class_, feel_dead = 0;
    let ll_done = 0;
    let buf = C.stackAlloc(C.BUFSZ), promptbuf = C.stackAlloc(C.QBUFSZ);
    let gameover = 0; /* true iff killed self */

    C.byte(buf + (0)).value = 0; /* for EDIT_GETLIN */
    for (j = 0; ; j++) {
        if (j >= 5) {
            C.pline1(C.thats_enough_tries);
            return;
        }
        C.Strcpy(promptbuf, "What class of monsters do you want to genocide?");
        if (j > 0)
            C.Snprintf("do_class_genocide", 2657, C.eos(promptbuf), BigInt(C.QBUFSZ) - C.strlen(promptbuf),
                     " [enter %s]",
                     C.iflags.cmdassist
                       ? "the symbol or name representing a class, or '?'"
                       : "'?' to see previous genocides");
        C.getlin(promptbuf, buf);
        C.mungspaces(buf);
        /* avoid 'that does not represent any monster' for empty input */
        if (!C.byte(buf).value) {
            C.pline("%s.", (j + 1 < 5)
                         ? "Type letter (or punctuation)" +
                           " or name used for a class of monsters or 'none'"
                         /* next iteration gives "that's enough tries"
                            so don't suggest typing anything this time */
                         : "No class of monsters specified");
            continue; /* try again */
        }
        /* choosing "none" preserves genocideless conduct */
        if (C.byte(buf).value == 27 || !C.strcmpi(buf, "none")
            || !C.strcmpi(buf, "'none'") || !C.strcmpi(buf, "nothing")) {
            C.livelog_printf(C.LL_GENOCIDE,
                           "declined to perform class genocide");
            return;
        }
        /* "?" runs #genocided to show existing genocides, then re-prompts;
           accept "'?'" too because the prompt's hint shows it that way */
        if (!C.strcmp(buf, "?") || !C.strcmp(buf, "'?'")) {
            C.list_genocided(103, 0);
            --j; /* don't count this iteration as one of the tries */
            continue;
        }

        class_ = C.name_to_monclass(buf, 0);
        if (class_ == 0 && (i = C.name_to_mon(buf, 0)) != C.NON_PM)
            class_ = C.mons[i].mlet;
        immunecnt = gonecnt = goodcnt = 0;
        for (i = C.LOW_PM; i < C.NUMMONS; i++) {
            if (C.mons[i].mlet == class_) {
                if (!(C.mons[i].geno & C.G_GENO))
                    immunecnt++;
                else if (C.svm.mvitals[i].mvflags & C.G_GENOD)
                    gonecnt++;
                else
                    goodcnt++;
            }
        }
        if (!goodcnt && class_ != C.mons[C.gu.urole.mnum].mlet
            && class_ != C.mons[C.gu.urace.mnum].mlet) {
            if (gonecnt)
                C.pline("All such monsters are already nonexistent.");
            else if (immunecnt || class_ == C.S_invisible)
                C.You("aren't permitted to genocide such monsters.");
            else if (C.wizard && C.byte(buf + (0)).value == 42) {
                let mtmp, mtmp2;

                gonecnt = 0;
                for (mtmp = C.fmon; mtmp; mtmp = mtmp2) {
                    mtmp2 = mtmp.nmon;
                    if (C.DEADMONSTER(mtmp))
                        continue;
                    C.mongone(mtmp);
                    gonecnt++;
                }
                C.pline("Eliminated %d monster%s.", gonecnt, C.plur(gonecnt));
                return;
            } else
                C.pline("That %s does not represent any monster.",
                      C.strlen(buf) == 1 ? "symbol" : "response");
            continue;
        }

        for (i = C.LOW_PM; i < C.NUMMONS; i++) {
            if (C.mons[i].mlet == class_) {
                let nam = C.stackAlloc(C.BUFSZ);

                C.Strcpy(nam, C.makeplural(C.mons[i].pmnames[C.NEUTRAL]));
                /* Although "genus" is Latin for race, the hero benefits
                 * from both race and role; thus genocide affects either.
                 */
                if (C.Your_Own_Role(i) || C.Your_Own_Race(i)
                    || ((C.mons[i].geno & C.G_GENO)
                        && !(C.svm.mvitals[i].mvflags & C.G_GENOD))) {
                    /* This check must be first since player monsters might
                     * have G_GENOD or !G_GENO.
                     */
                    if (!ll_done++) {
                        if (!C.num_genocides())
                            C.livelog_printf(C.LL_CONDUCT | C.LL_GENOCIDE,
                                     "performed %s first genocide (class %c)",
                                           C.uhis(), C.def_monsyms[class_].sym);
                        else
                            C.livelog_printf(C.LL_GENOCIDE, "genocided class %c",
                                           C.def_monsyms[class_].sym);
                    }

                    C.svm.mvitals[i].mvflags |= (C.G_GENOD | C.G_NOCORPSE);
                    C.kill_genocided_monsters();
                    C.update_inventory(); /* eggs & tins */
                    C.pline("Wiped out all %s.", nam);
                    if (C.Upolyd && C.vampshifted(C.gy.youmonst)
                        /* current shifted form or base vampire form */
                        && (i == C.u.umonnum || i == C.gy.youmonst.cham))
                        C.polyself(C.POLY_REVERT); /* vampshifter to vampire */
                    if (C.Upolyd && i == C.u.umonnum) {
                        C.u.mh = -1;
                        if (C.Unchanging) {
                            if (!feel_dead++)
                                C.urgent_pline("You die.");
                            /* finish genociding this class of
                               monsters before ultimately dying */
                            gameover = 1;
                        } else
                            C.rehumanize();
                    }
                    /* Self-genocide if it matches either your race
                       or role.  Assumption:  male and female forms
                       share same monster class. */
                    if (i == C.gu.urole.mnum || i == C.gu.urace.mnum) {
                        C.u.uhp = -1;
                        if (C.Upolyd) {
                            if (!feel_dead++)
                                C.You_feel("%s inside.", C.udeadinside());
                        } else {
                            if (!feel_dead++)
                                C.urgent_pline("You die.");
                            gameover = 1;
                        }
                    }
                } else if (C.svm.mvitals[i].mvflags & C.G_GENOD) {
                    if (!gameover)
                        C.pline("%s are already nonexistent.", C.upstart(nam));
                } else if (!gameover) {
                    /* suppress feedback about quest beings except
                       for those applicable to our own role */
                    if ((C.mons[i].msound != C.MS_LEADER
                         || C.quest_info(C.MS_LEADER) == i)
                        && (C.mons[i].msound != C.MS_NEMESIS
                            || C.quest_info(C.MS_NEMESIS) == i)
                        && (C.mons[i].msound != C.MS_GUARDIAN
                            || C.quest_info(C.MS_GUARDIAN) == i)
                        /* non-leader/nemesis/guardian role-specific monster
                           */
                        && (i != C.PM_NINJA /* nuisance */
                            || C.Role_if(C.PM_SAMURAI))) {
                        let named, uniq;

                        named = C.type_is_pname(C.mons[i]) ? 1 : 0;
                        uniq = (C.mons[i].geno & C.G_UNIQ) ? 1 : 0;
                        /* one special case */
                        if (i == C.PM_HIGH_CLERIC)
                            uniq = 0;

                        C.You("aren't permitted to genocide %s%s.",
                            (uniq && !named) ? "the " : "",
                            (uniq || named) ? C.mons[i].pmnames[C.NEUTRAL] : nam);
                    }
                }
            }
        }
        if (gameover || C.u.uhp == -1) {
            C.svk.killer.format = C.KILLED_BY_AN;
            C.Strcpy(C.svk.killer.name, "scroll of genocide");
            if (gameover)
                C.done(C.GENOCIDED);
        }
        return;
    }
}


export function do_genocide(how)
/* 0 = no genocide; create monsters (cursed scroll)
              * 1 = normal genocide
              * 3 = forced genocide of player
              * 5 (4 | 1) = normal genocide from throne */
{
    let buf = C.stackAlloc(C.BUFSZ), realbuf = C.stackAlloc(C.BUFSZ), promptbuf = C.stackAlloc(C.QBUFSZ);
    let i, killplayer = 0;
    let mndx;
    let ptr;
    let which;

    if (how & C.PLAYER) {
        mndx = C.u.umonster; /* non-polymorphed mon num */
        ptr = C.mons[mndx];
        C.Strcpy(buf, C.pmname(ptr, C.Ugender));
        killplayer++;
    } else {
        C.byte(buf + (0)).value = 0; /* init for EDIT_GETLIN */
        for (i = 0; ; i++) {
            if (i >= 5) {
                /* cursed effect => no free pass (unless rndmonst() fails) */
                if (!(how & C.REALLY) && (ptr = C.rndmonst()) != 0)
                    break;

                C.pline1(C.thats_enough_tries);
                return;
            }
            C.Strcpy(promptbuf,
                   "What type of monster do you want to genocide?");
            if (i > 0)
                C.Snprintf("do_genocide", 2861, C.eos(promptbuf), BigInt(C.QBUFSZ) - C.strlen(promptbuf),
                         " [enter %s]",
                         C.iflags.cmdassist
                           ? "the name of a type of monster, or '?'"
                           : "'?' to see previous genocides");
            C.getlin(promptbuf, buf);
            C.mungspaces(buf);
            /* avoid 'such creatures do not exist' for empty input */
            if (!C.byte(buf).value) {
                C.pline("%s.", (i + 1 < 5)
                             ? "Type the name of a type of monster or 'none'"
                             /* next iteration gives "that's enough tries"
                                so don't suggest typing anything this time */
                             : "No type of monster specified");
                continue; /* try again */
            }
            /* choosing "none" preserves genocideless conduct */
            if (C.byte(buf).value == 27 || !C.strcmpi(buf, "none")
                || !C.strcmpi(buf, "'none'") || !C.strcmpi(buf, "nothing")) {
                /* ... but no free pass if cursed */
                if (!(how & C.REALLY) && (ptr = C.rndmonst()) != 0)
                    break; /* remaining checks don't apply */

                C.livelog_printf(C.LL_GENOCIDE, "declined to perform genocide");
                return;
            }
            /* "?" or "'?'" runs #genocided to show existing genocides */
            if (!C.strcmp(buf, "?") || !C.strcmp(buf, "'?'")) {
                C.list_genocided(103, 0);
                --i; /* don't count this iteration as one of the tries */
                continue;
            }

            mndx = C.name_to_mon(buf, 0);
            if (mndx == C.NON_PM || (C.svm.mvitals[mndx].mvflags & C.G_GENOD)) {
                C.pline("Such creatures %s exist in this world.",
                      (mndx == C.NON_PM) ? "do not" : "no longer");
                continue;
            }
            ptr = C.mons[mndx];
            /* first revert if current shifted form or base vampire form */
            if (C.Upolyd && C.vampshifted(C.gy.youmonst)
                && (mndx == C.u.umonnum || mndx == C.gy.youmonst.cham))
                C.polyself(C.POLY_REVERT); /* vampshifter (bat, &c) to vampire */
            /* Although "genus" is Latin for race, the hero benefits
             * from both race and role; thus genocide affects either.
             */
            if (C.Your_Own_Role(mndx) || C.Your_Own_Race(mndx)) {
                killplayer++;
                break;
            }
            if (C.is_human(ptr))
                C.adjalign(-C.sgn(C.u.ualign.type));
            if (C.is_demon(ptr))
                C.adjalign(C.sgn(C.u.ualign.type));

            if (!(ptr.geno & C.G_GENO)) {
                if (!C.Deaf) {
                    /* FIXME: unconditional "caverns" will be silly in some
                     * circumstances.  Who's speaking?  Divine pronouncements
                     * aren't supposed to be hampered by deafness....
                     */
                    if (C.flags.verbose)
                        C.pline("A thunderous voice booms" +
                              " through the caverns:");
                    ;
                    /* FIXME? shouldn't this override deafness? */
                    C.verbalize("No, mortal!  That will not be done.");
                }
                continue;
            }
            /* KMH -- Unchanging prevents rehumanization */
            if (C.Unchanging && ptr == C.gy.youmonst.data)
                killplayer++;
            break;
        }
        mndx = C.monsndx(ptr); /* needed for the 'no free pass' cases */
    }

    which = "all ";
    C.Strcpy(realbuf, ptr.pmnames[C.NEUTRAL]); /* standard singular */
    if (C.Hallucination) {
        /* hallucinate hero's type */
        if (C.Upolyd) {
            C.Strcpy(buf, C.pmname(C.gy.youmonst.data,
                               C.flags.female ? C.FEMALE : C.MALE));
        } else {
            C.Strcpy(buf, (C.flags.female && C.gu.urole.name.f) ? C.gu.urole.name.f
                                                          : C.gu.urole.name.m);
            C.byte(buf + (0)).value = C.lowc(C.byte(buf + (0)).value);
        }
    } else {
        /* use actual type */
        C.Strcpy(buf, realbuf);
        if ((ptr.geno & C.G_UNIQ) && ptr != C.mons[C.PM_HIGH_CLERIC])
            which = !C.type_is_pname(ptr) ? "the " : "";
    }

    if (how & C.REALLY) {
        if (!C.num_genocides())
            C.livelog_printf(C.LL_CONDUCT | C.LL_GENOCIDE,
                           "performed %s first genocide (%s)",
                           C.uhis(), C.makeplural(realbuf));
        else
            C.livelog_printf(C.LL_GENOCIDE, "genocided %s", C.makeplural(realbuf));

        /* setting no-corpse affects wishing and random tin generation */
        C.svm.mvitals[mndx].mvflags |= (C.G_GENOD | C.G_NOCORPSE);
        C.pline("Wiped out %s%s.", which,
              (C.byte(which).value != 97) ? buf : C.makeplural(buf));

        if (killplayer) {
            C.u.uhp = -1;
            if (how & C.PLAYER) {
                C.svk.killer.format = C.KILLED_BY;
                C.Strcpy(C.svk.killer.name, "genocidal confusion");
            } else if (how & C.ONTHRONE) {
                /* player selected while on a throne */
                C.svk.killer.format = C.KILLED_BY_AN;
                C.Strcpy(C.svk.killer.name, "imperious order");
            } else { /* selected player deliberately, not confused */
                C.svk.killer.format = C.KILLED_BY_AN;
                C.Strcpy(C.svk.killer.name, "scroll of genocide");
            }

            /* Polymorphed characters will die as soon as they're rehumanized.
               KMH -- Unchanging prevents rehumanization. */
            if (C.Upolyd && ptr != C.gy.youmonst.data) {
                C.delayed_killer(C.POLYMORPH, C.svk.killer.format, C.svk.killer.name);
                C.You_feel("%s inside.", C.udeadinside());
            } else {
                C.done(C.GENOCIDED);
            }
        } else if (ptr == C.gy.youmonst.data) {
            C.rehumanize();
        }
        C.kill_genocided_monsters();
        C.update_inventory(); /* in case identified eggs were affected */
    } else {
        let cnt = 0, census = C.monster_census(0);

        if (!(C.mons[mndx].geno & C.G_UNIQ)
            && !(C.svm.mvitals[mndx].mvflags & (C.G_GENOD | C.G_EXTINCT)))
            for (i = (C.rngSource(3000, "do_genocide"), C.rn1(3, 4)); i > 0; i--) {
                if (!C.makemon(ptr, C.u.ux, C.u.uy, C.NO_MINVENT | C.MM_NOMSG))
                    break; /* couldn't make one */
                ++cnt;
                if (C.svm.mvitals[mndx].mvflags & C.G_EXTINCT)
                    break; /* just made last one */
            }
        if (cnt) {
            /* accumulated 'cnt' doesn't take groups into account;
               assume bringing in new mon(s) didn't remove any old ones */
            cnt = C.monster_census(0) - census;
            C.pline("Sent in %s%s.", (cnt > 1) ? "some " : "",
                  (cnt > 1) ? C.makeplural(buf) : C.an(buf));
        } else
            C.pline1(C.nothing_happens);
    }
}


export function punish(sobj)
{
    /* angrygods() calls this with NULL sobj arg */
    let reuse_ball = (sobj && sobj.otyp == C.HEAVY_IRON_BALL)
                                ? sobj : 0;
    /* analyzer doesn't know that the one caller that passes a NULL
     * sobj (angrygods) checks !Punished first, so add a guard */
    let cursed_levy = (sobj && sobj.cursed) ? 1 : 0;

    /* KMH -- Punishment is still okay when you are riding */
    if (!reuse_ball)
        C.You("are being punished for your misbehavior!");
    if (C.Punished) {
        C.Your("iron ball gets heavier.");
        C.uball.owt += C.WT_IRON_BALL_INCR * (1 + cursed_levy);
        return;
    }
    if (C.amorphous(C.gy.youmonst.data) || C.is_whirly(C.gy.youmonst.data)
        || C.unsolid(C.gy.youmonst.data)) {
        if (!reuse_ball) {
            C.pline("A ball and chain appears, then falls away.");
            C.dropy(C.mkobj(C.BALL_CLASS, 1));
        } else {
            C.dropy(reuse_ball);
        }
        return;
    }
    C.setworn(C.mkobj(C.CHAIN_CLASS, 1), C.W_CHAIN);
    if (!reuse_ball)
        C.setworn(C.mkobj(C.BALL_CLASS, 1), C.W_BALL);
    else
        C.setworn(reuse_ball, C.W_BALL);

    /*
     *  Place ball & chain if not swallowed.  If swallowed, the ball & chain
     *  variables will be set at the next call to placebc().
     */
    if (!C.u.uswallow) {
        C.placebc();
        if (C.Blind)
            C.set_bc(1);      /* set up ball and chain variables */
        C.newsym(C.u.ux, C.u.uy); /* see ball&chain if can't see self */
    }
}

/* remove the ball and chain */

export function unpunish()
{
    let savechain = C.uchain;

    /* chain goes away */
    C.setworn(0, C.W_CHAIN); /* sets 'uchain' to Null */
    /* for floor, unhides monster hidden under chain, calls newsym() */
    C.delobj(savechain);

    /* the chain is gone but the no longer attached ball persists */
    C.setworn(0, C.W_BALL); /* sets 'uball' to Null */
}

/* prompt the player to create a stinking cloud and then create it if they
   give a location */

export function do_stinking_cloud(sobj, mention_stinking)
{
    const cc = C.localRecord("struct nhcoord");

    C.pline("Where do you want to center the %scloud?",
          mention_stinking ? "stinking " : "");
    cc.x = C.u.ux;
    cc.y = C.u.uy;
    C.getpos_sethilite(display_stinking_cloud_positions, can_center_cloud);
    if (C.getpos(cc, 1, "the desired position") < 0) {
        C.pline1(C.Never_mind);
        return;
    } else if (!C.callLocal(can_center_cloud, cc.x, cc.y)) {
        if (C.Hallucination)
            C.pline("Ugh... someone cut the cheese.");
        else
            C.pline("%s a whiff of rotten eggs.",
                  sobj.oclass == C.SCROLL_CLASS ? "The scroll crumbles with"
                                               : "You smell");
        return;
    }
    C.create_gas_cloud(cc.x, cc.y, 15 + 10 * C.bcsign(sobj),
                            8 + 4 * C.bcsign(sobj));
}

/* some creatures have special data structures that only make sense in their
 * normal locations -- if the player tries to create one elsewhere, or to
 * revive one, the disoriented creature becomes a zombie
 */

export function cant_revive(mtype, revival, from_obj)
{
    /* SHOPKEEPERS can be revived now */
    if (mtype.value == C.PM_GUARD || (mtype.value == C.PM_SHOPKEEPER && !revival)
        || mtype.value == C.PM_HIGH_CLERIC || mtype.value == C.PM_ALIGNED_CLERIC
        || mtype.value == C.PM_ANGEL) {
        mtype.value = C.PM_HUMAN_ZOMBIE;
        return 1;
    } else if (mtype.value == C.PM_LONG_WORM_TAIL) { /* for create_particular() */
        mtype.value = C.PM_LONG_WORM;
        return 1;
    } else if (C.unique_corpstat(C.mons[mtype.value])
               && (!from_obj || !C.has_omonst(from_obj))) {
        /* unique corpses (from bones or wizard mode wish) or
           statues (bones or any wish) end up as shapechangers */
        mtype.value = C.PM_DOPPELGANGER;
        return 1;
    }
    return 0;
}


export function create_particular_parse(str, d)
{
    const gender_name_var = C.localScalar("int", C.NEUTRAL);
    let bufp = str;
    let tmpp;

    d.quan = 1 + ((C.gm.multi > 0) ? C.int(C.gm.multi) : 0);
    d.monclass = C.MAXMCLASSES;
    d.which = C.gu.urole.mnum; /* an arbitrary index into mons[] */
    d.fem = -1;     /* gender not specified */
    d.genderconf = -1;  /* no confusion on which gender to assign */
    d.randmonst = 0;
    d.maketame = d.makepeaceful = d.makehostile = 0;
    d.sleeping = d.saddled = d.invisible = d.hidden = 0;

    /* quantity */
    if (C.digit(C.byte(bufp).value)) {
        d.quan = C.atoi(bufp);
        while (C.digit(C.byte(bufp).value))
            bufp++;
        while (C.byte(bufp).value == 32)
            bufp++;
    }
    /* maximum possible quantity is one per cell: (0..ROWNO-1) x (1..COLNO-1)
       [21*79==1659 for default map size; could subtract 1 for hero's spot] */
    if (d.quan < 1 || d.quan > C.QUAN_LIMIT)
        d.quan = C.QUAN_LIMIT - C.monster_census(0);
    /* gear -- extremely limited number of possibilities supported */
    if ((tmpp = C.strstri(bufp, "saddled ")) != 0) {
        d.saddled = 1;
        C.memset(tmpp, 32, 9 - 1);
    }
    /* state -- limited number of possibilities supported */
    if ((tmpp = C.strstri(bufp, "sleeping ")) != 0) {
        d.sleeping = 1;
        C.memset(tmpp, 32, 10 - 1);
    }
    if ((tmpp = C.strstri(bufp, "invisible ")) != 0) {
        d.invisible = 1;
        C.memset(tmpp, 32, 11 - 1);
    }
    if ((tmpp = C.strstri(bufp, "hidden ")) != 0) {
        d.hidden = 1;
        C.memset(tmpp, 32, 8 - 1);
    }
    /* check "female" before "male" to avoid false hit mid-word */
    if ((tmpp = C.strstri(bufp, "female ")) != 0) {
        d.fem = 1;
        C.memset(tmpp, 32, 8 - 1);
    }
    if ((tmpp = C.strstri(bufp, "male ")) != 0) {
        d.fem = 0;
        C.memset(tmpp, 32, 6 - 1);
    }
    bufp = C.mungspaces(bufp); /* after potential memset(' ') */
    /* allow the initial disposition to be specified */
    if (!C.strncmpi(bufp, "tame ", 5)) {
        bufp += 5;
        d.maketame = 1;
    } else if (!C.strncmpi(bufp, "peaceful ", 9)) {
        bufp += 9;
        d.makepeaceful = 1;
    } else if (!C.strncmpi(bufp, "hostile ", 8)) {
        bufp += 8;
        d.makehostile = 1;
    }
    /* decide whether a valid monster was chosen */
    if (C.wizard && (!C.strcmp(bufp, "*") || !C.strcmp(bufp, "random"))) {
        d.randmonst = 1;
        return 1;
    }
    d.which = C.name_to_mon(bufp, gender_name_var);
    /*
     * With the introduction of male and female monster names
     * in 5.0, preserve that detail.
     *
     * If d->fem is already set to MALE or FEMALE at this juncture, it means
     * one of those terms was explicitly specified.
     */
    if (d.fem == C.MALE || d.fem == C.FEMALE) {     /* explicitly expressed */
        if ((gender_name_var.value != C.NEUTRAL) && (d.fem != gender_name_var)) {
            /* apparent selection incompatibility */
            d.genderconf = gender_name_var.value;        /* resolve later */
        }
        /* otherwise keep the value of d->fem, as it's okay */
    } else {  /* no explicit gender term was specified */
        d.fem = gender_name_var.value;
    }
    if (C.ismnum(d.which))
        return 1; /* got one */
    d.monclass = C.name_to_monclass(bufp, C.fieldRef(d, "which"));

    if (C.ismnum(d.which)) {
        d.monclass = C.MAXMCLASSES; /* matters below */
        return 1;
    } else if (d.monclass == C.S_invisible) { /* not an actual monster class */
        d.which = C.PM_STALKER;
        d.monclass = C.MAXMCLASSES;
        return 1;
    } else if (d.monclass == C.S_WORM_TAIL) { /* empty monster class */
        d.which = C.PM_LONG_WORM;
        d.monclass = C.MAXMCLASSES;
        return 1;
    } else if (d.monclass > 0) {
        d.which = C.gu.urole.mnum; /* reset from NON_PM */
        return 1;
    }
    return 0;
}


export function create_particular_creation(d)
{
    let whichpm = 0;
    let i, mx, my, firstchoice = C.NON_PM;
    let mtmp;
    let madeany = 0;

    if (!d.randmonst) {
        firstchoice = d.which;
        if (C.callLocal(cant_revive, C.fieldRef(d, "which"), 0, 0)
            && firstchoice != C.PM_LONG_WORM_TAIL) {
            /* wizard mode can override handling of special monsters */
            let buf = C.stackAlloc(C.BUFSZ);

            C.Sprintf(buf, "Creating %s instead; force %s?",
                    C.mons[d.which].pmnames[C.NEUTRAL],
                    C.mons[firstchoice].pmnames[C.NEUTRAL]);
            if (C.y_n(buf) == 121)
                d.which = firstchoice;
        }
        whichpm = C.mons[d.which];
    }
    for (i = 0; i < d.quan; i++) {
        let mmflags = C.NO_MM_FLAGS;

        if (d.monclass != C.MAXMCLASSES)
            whichpm = C.mkclass(d.monclass, 0);
        else if (d.randmonst)
            whichpm = C.rndmonst();
        if (d.genderconf == -1) {
            /* no conflict exists between explicit gender term and
               the specified monster name */
            if (d.fem != -1 && (!whichpm || (!C.is_male(whichpm)
                                              && !C.is_female(whichpm))))
                mmflags |= (d.fem == C.FEMALE) ? C.MM_FEMALE
                               : (d.fem == C.MALE) ? C.MM_MALE : 0;
            /* no surprise; "<mon> appears." rather than "<mon> appears!" */
            mmflags |= C.MM_NOEXCLAM;
        } else {
            /* conundrum alert: an explicit gender term conflicts with an
               explicit gender-tied naming term (i.e. male cavewoman) */

            /* option not gone with: name overrides the explicit gender as
               commented out here */
            /*  d->fem = d->genderconf; */

            /* option chosen: let the explicit gender term (male or female)
               override the gender-tied naming term, so leave d->fem as-is */

            mmflags |= (d.fem == C.FEMALE) ? C.MM_FEMALE
                           : (d.fem == C.MALE) ? C.MM_MALE : 0;

            /* another option would be to consider it a faulty specification
               and reject the request completely and produce a random monster
               with a gender matching that specified instead (i.e. there is
               no such thing as a male cavewoman) */
            /* whichpm = rndmonst(); */
            /* mmflags |= (d->fem == FEMALE) ? MM_FEMALE : MM_MALE; */
        }
        if (d.invisible)
            mmflags |= C.MM_MINVIS;

        mtmp = C.makemon(whichpm, C.u.ux, C.u.uy, mmflags);
        if (!mtmp) {
            /* quit trying if creation failed and is going to repeat */
            if (d.monclass == C.MAXMCLASSES && !d.randmonst)
                break;
            /* otherwise try again */
            continue;
        }
        mx = mtmp.mx, my = mtmp.my;
        if (d.maketame) {
            C.tamedog(mtmp, 0, 0);
        } else if (d.makepeaceful || d.makehostile) {
            mtmp.mtame = 0; /* sanity precaution */
            mtmp.mpeaceful = d.makepeaceful ? 1 : 0;
            C.set_malign(mtmp);
        }
        if (d.saddled && C.can_saddle(mtmp) && !C.which_armor(mtmp, C.W_SADDLE)) {
            /* NULL obj arg means put_saddle_on_mon()
             * will create the saddle itself */
            C.put_saddle_on_mon(0, mtmp);
        }
        if (d.hidden
           && ((C.is_hider(mtmp.data) && mtmp.data.mlet != C.S_MIMIC)
               || (C.hides_under(mtmp.data) && C.OBJ_AT(mx, my))
               || (mtmp.data.mlet == C.S_EEL && C.is_pool(mx, my))))
            mtmp.mundetected = 1;
        if (d.sleeping)
            mtmp.msleeping = 1;
        /* if asking for 'hidden', show location of every created monster
           that can't be seen--whether that's due to successfully hiding
           or vision issues (line-of-sight, invisibility, blindness) */
        if ((d.hidden || d.invisible) && !C.canspotmon(mtmp))
            C.flash_mon(mtmp);

        madeany = 1;
        /* in case we got a doppelganger instead of what was asked
           for, make it start out looking like what was asked for */
        if (mtmp.cham != C.NON_PM && firstchoice != C.NON_PM
            && mtmp.cham != firstchoice)
            C.newcham(mtmp, C.mons[firstchoice], C.NO_NC_FLAGS);
    }
    return madeany;
}

/*
 * Make a new monster with the type controlled by the user.
 *
 * Note:  when creating a monster by class letter, specifying the
 * "strange object" (']') symbol produces a random monster rather
 * than a mimic.  This behavior quirk is useful so don't "fix" it
 * (use 'm'--or "mimic"--to create a random mimic).
 *
 * Used in wizard mode only (for ^G command and for scroll or spell
 * of create monster).  Once upon a time, an earlier incarnation of
 * this code was also used for the scroll/spell in explore mode.
 */

export function create_particular()
{
    const d = C.localRecord("struct _create_particular_data");
    let bufp, buf = C.stackAlloc(C.BUFSZ), prompt = C.stackAlloc(C.QBUFSZ);
    let tryct = C.CP_TRYLIM, altmsg = 0;

    C.byte(buf + (0)).value = 0; /* for EDIT_GETLIN */
    C.Strcpy(prompt, "Create what kind of monster?");
    do {
        C.getlin(prompt, buf);
        bufp = C.mungspaces(buf);
        if (C.byte(bufp).value == 27)
            return 0;

        if (C.callLocal(create_particular_parse, bufp, d))
            break;

        /* no good; try again... */
        if (C.byte(bufp).value || altmsg || tryct < 2) {
            C.pline("I've never heard of such monsters.");
        } else {
            C.pline("Try again (type * for random, ESC to cancel).");
            ++altmsg;
        }
        /* when a second try is needed, expand the prompt */
        if (tryct == C.CP_TRYLIM)
            C.Strcat(prompt, " [type name or symbol]");
    } while (--tryct > 0);

    if (!tryct)
        C.pline1(C.thats_enough_tries);
    else
        return C.callLocal(create_particular_creation, d);

    return 0;
}

/*read.c*/
