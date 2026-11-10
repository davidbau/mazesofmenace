/* NetHack 5.0	o_init.c	$NHDT-Date: 1771216675 2026/02/15 20:37:55 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.101 $ */
/* Copyright (c) Stichting Mathematisch Centrum, Amsterdam, 1985. */
/*-Copyright (c) Robert Patrick Rankin, 2011. */
/* NetHack may be freely redistributed.  See license for details. */

import { C } from './c-runtime.js';













/* Shuffle tile assignments to match descriptions, so a red potion isn't
 * displayed with a blue tile and so on.
 *
 * Tile assignments are not saved, and shouldn't be so that a game can
 * be resumed on an otherwise identical non-tile-using binary, so we have
 * to reshuffle the assignments from oc_descr_idx information when a game
 * is restored.  So might as well do that the first time instead of writing
 * another routine.
 */
/* TILES_IN_GLYPHMAP */

export function setgemprobs(dlev)
{
    let j, first, lev, sum = 0;

    if (dlev)
        lev = (C.ledger_no(dlev) > C.maxledgerno()) ? C.maxledgerno()
                                                : C.ledger_no(dlev);
    else
        lev = 0;
    first = C.svb.bases[C.GEM_CLASS];

    for (j = 0; j < 9 - Math.trunc(lev / 3); j++)
        C.objects[first + j].oc_prob = 0;
    first += j;
    if (first > C.LAST_REAL_GEM || C.objects[first].oc_class != C.GEM_CLASS
        || C.OBJ_NAME(C.objects[first]) == 0) {
        C.raw_printf("Not enough gems? - first=%d j=%d LAST_GEM=%d", first, j,
                   C.LAST_REAL_GEM);
        C.wait_synch();
    }
    for (j = first; j <= C.LAST_REAL_GEM; j++)
        C.objects[j].oc_prob = Math.trunc(C.int(171 + j - first) / C.int(C.LAST_REAL_GEM + 1 - first));

    /* recompute GEM_CLASS total oc_prob - including rocks/stones */
    for (j = C.svb.bases[C.GEM_CLASS]; j < C.svb.bases[C.GEM_CLASS + 1]; j++)
        sum += C.objects[j].oc_prob;
    C.go.oclass_prob_totals[C.GEM_CLASS] = sum;
}

/* some gems can have different colors */
export function randomize_gem_colors()
{
    if (C.rn2(2, 89, "randomize_gem_colors")) { /* change turquoise from green to blue? */
        C.objects[C.TURQUOISE].oc_descr_idx = C.objects[C.SAPPHIRE].oc_descr_idx, C.objects[C.TURQUOISE].oc_color = C.objects[C.SAPPHIRE].oc_color;
    }
    if (C.rn2(2, 92, "randomize_gem_colors")) { /* change aquamarine from green to blue? */
        C.objects[C.AQUAMARINE].oc_descr_idx = C.objects[C.SAPPHIRE].oc_descr_idx, C.objects[C.AQUAMARINE].oc_color = C.objects[C.SAPPHIRE].oc_color;
    }
    switch (C.rn2(4, 95, "randomize_gem_colors")) { /* change fluorite from violet? */
    case 0:
        break;
    case 1: /* blue */
        C.objects[C.FLUORITE].oc_descr_idx = C.objects[C.SAPPHIRE].oc_descr_idx, C.objects[C.FLUORITE].oc_color = C.objects[C.SAPPHIRE].oc_color;
        break;
    case 2: /* white */
        C.objects[C.FLUORITE].oc_descr_idx = C.objects[C.DIAMOND].oc_descr_idx, C.objects[C.FLUORITE].oc_color = C.objects[C.DIAMOND].oc_color;
        break;
    case 3: /* green */
        C.objects[C.FLUORITE].oc_descr_idx = C.objects[C.EMERALD].oc_descr_idx, C.objects[C.FLUORITE].oc_color = C.objects[C.EMERALD].oc_color;
        break;
    }
}

/* shuffle descriptions on objects o_low to o_high */
export function shuffle(o_low, o_high, domaterial)
{
    domaterial = C.boolean(domaterial);
    o_high = C.int(o_high);
    o_low = C.int(o_low);
    let i, j, num_to_shuffle;
    let sw;
    let color;

    for (num_to_shuffle = 0, j = o_low; j <= o_high; j++)
        if (!C.objects[j].oc_name_known)
            num_to_shuffle++;
    if (num_to_shuffle < 2)
        return;

    for (j = o_low; j <= o_high; j++) {
        if (C.objects[j].oc_name_known)
            continue;
        do
            i = j + C.rn2(o_high - j + 1, 129, "shuffle");
        while (C.objects[i].oc_name_known);
        sw = C.objects[j].oc_descr_idx;
        C.objects[j].oc_descr_idx = C.objects[i].oc_descr_idx;
        C.objects[i].oc_descr_idx = sw;
        sw = C.objects[j].oc_tough;
        C.objects[j].oc_tough = C.objects[i].oc_tough;
        C.objects[i].oc_tough = sw;
        color = C.objects[j].oc_color;
        C.objects[j].oc_color = C.objects[i].oc_color;
        C.objects[i].oc_color = color;

        /* shuffle material */
        if (domaterial) {
            sw = C.objects[j].oc_material;
            C.objects[j].oc_material = C.objects[i].oc_material;
            C.objects[i].oc_material = sw;
        }
    }
}

export function init_objects()
{
    let i, first, last, prevoclass;
    let oclass;

    for (i = 0; i <= C.MAXOCLASSES; i++) {
        C.svb.bases[i] = 0;
        if (i > 0 && i < C.MAXOCLASSES && C.objects[i].oc_class != i)
            C.panic(
              "init_objects: class for generic object #%d doesn't match (%d)",
                  i, C.objects[i].oc_class);
    }
    /* initialize object descriptions */
    for (i = 0; i < C.NUM_OBJECTS; i++)
        C.objects[i].oc_name_idx = C.objects[i].oc_descr_idx = i;
    /* init base; if probs given check that they add up to 1000,
       otherwise compute probs */
    first = C.MAXOCLASSES;
    prevoclass = -1;
    while (first < C.NUM_OBJECTS) {
        oclass = C.objects[first].oc_class;
        /*
         * objects[] sanity check:  must be in ascending oc_class order to
         * be able to use bases[class+1]-1 for the end of a class's range.
         * Also catches a non-contiguous class because reverting to any
         * earlier class would involve switching back to a lower class
         * number after having moved on to one or more other classes.
         */
        if (C.int(oclass) < prevoclass)
            C.panic("objects[%d] class #%d not in order!", first, oclass);

        last = first + 1;
        while (last < C.NUM_OBJECTS && C.objects[last].oc_class == oclass)
            last++;
        C.svb.bases[C.int(oclass)] = first;

        if (oclass == C.GEM_CLASS) {
            setgemprobs(0);
            randomize_gem_colors();
        }
        first = last;
        prevoclass = C.int(oclass);
    }
    /* extra entry allows deriving the range of a class via
       bases[class] through bases[class+1]-1 for all classes
       (except for ILLOBJ_CLASS which is separated from WEAPON_CLASS
       by generic objects); second extra entry is to prevent an
       unexplained crash in doclassdisco(), where the code ended up
       attempting to process non-existent class MAXOCLASSES; the
       [MAXOCLASSES+1] element gives that non-class 0 objects
       when traversing objects[] from bases[X] through bases[X+1]-1 */
    C.svb.bases[C.MAXOCLASSES] = C.svb.bases[C.MAXOCLASSES + 1] = C.NUM_OBJECTS;
    /* hypothetically someone might remove all objects of some class,
       or be adding a new class and not populated it yet, leaving gaps
       in bases[]; guarantee that there are no such gaps */
    for (last = C.MAXOCLASSES - 1; last >= 0; --last)
        if (!C.svb.bases[last])
            C.svb.bases[last] = C.svb.bases[last + 1];

    /* check objects[].oc_name_known */
    for (i = C.MAXOCLASSES; i < C.NUM_OBJECTS; ++i) {
        let nmkn = C.objects[i].oc_name_known != 0;

        if (!C.OBJ_DESCR(C.objects[i]) ^ nmkn) {
            if (C.iflags.sanity_check) {
                C.impossible(
                    "obj #%d (%s) name is %s despite%s alternate description",
                           i, C.OBJ_NAME(C.objects[i]),
                           nmkn ? "pre-known" : "not known",
                           nmkn ? "" : " no");
            }
            /* repair the mistake and keep going */
            C.objects[i].oc_name_known = nmkn ? 0 : 1;
        }
    }
    /* compute oclass_prob_totals */
    init_oclass_probs();

    /* shuffle descriptions */
    C.callLocal(shuffle_all);
    C.objects[C.WAN_NOTHING].oc_dir = C.rn2(2, 234, "init_objects") ? C.NODIR : C.IMMEDIATE;
}

/* Compute the total probability of each object class.
 * Assumes svb.bases[] has already been set. */
export function init_oclass_probs()
{
    let i;
    let sum;
    let oclass;
    for (oclass = 0; oclass < C.MAXOCLASSES; ++oclass) {
        sum = 0;
        /* note: for ILLOBJ_CLASS, bases[oclass+1]-1 isn't the last item
           in the class; but all the generic items have probability 0 so
           adding them to 'sum' has no impact */
        for (i = C.svb.bases[oclass]; i < C.svb.bases[oclass + 1]; ++i) {
            sum = C.short(sum + C.objects[i].oc_prob);
        }
        if (sum <= 0 && oclass != C.ILLOBJ_CLASS
            && C.svb.bases[oclass] != C.svb.bases[oclass + 1]) {
            C.impossible("%s (%d) probability total for oclass %d",
                       !sum ? "zero" : "negative", sum, oclass);
            /* gracefully fail by setting all members of this class to 1 */
            for (i = C.svb.bases[oclass]; i < C.svb.bases[oclass + 1]; ++i) {
                C.objects[i].oc_prob = 1;
                sum = C.short(sum + 1);
            }
        }
        C.go.oclass_prob_totals[oclass] = sum;
    }
}

/* retrieve the range of objects that otyp shares descriptions with */
export function obj_shuffle_range(otyp, lo_p, hi_p)
/* input: representative item */
/* output: range that item belongs among */
{
    otyp = C.int(otyp);
    let i, ocls = C.objects[otyp].oc_class;

    /* default is just the object itself */
    lo_p.value = hi_p.value = otyp;

    switch (ocls) {
    case C.ARMOR_CLASS:
        if (otyp >= C.HELMET && otyp <= C.HELM_OF_TELEPATHY)
            lo_p.value = C.HELMET, hi_p.value = C.HELM_OF_TELEPATHY;
        else if (otyp >= C.LEATHER_GLOVES && otyp <= C.GAUNTLETS_OF_DEXTERITY)
            lo_p.value = C.LEATHER_GLOVES, hi_p.value = C.GAUNTLETS_OF_DEXTERITY;
        else if (otyp >= C.CLOAK_OF_PROTECTION && otyp <= C.CLOAK_OF_DISPLACEMENT)
            lo_p.value = C.CLOAK_OF_PROTECTION, hi_p.value = C.CLOAK_OF_DISPLACEMENT;
        else if (otyp >= C.SPEED_BOOTS && otyp <= C.LEVITATION_BOOTS)
            lo_p.value = C.SPEED_BOOTS, hi_p.value = C.LEVITATION_BOOTS;
        break;
    case C.POTION_CLASS:
        /* potion of water has the only fixed description */
        lo_p.value = C.svb.bases[C.POTION_CLASS];
        hi_p.value = C.POT_WATER - 1;
        break;
    case C.AMULET_CLASS:
    case C.SCROLL_CLASS:
    case C.SPBOOK_CLASS:
        /* exclude non-magic types and also unique ones */
        lo_p.value = C.svb.bases[ocls];
        for (i = lo_p.value; C.objects[i].oc_class == ocls; i++)
            if (C.objects[i].oc_unique || !C.objects[i].oc_magic)
                break;
        hi_p.value = i - 1;
        break;
    case C.RING_CLASS:
    case C.WAND_CLASS:
    case C.VENOM_CLASS:
        /* entire class */
        lo_p.value = C.svb.bases[ocls];
        hi_p.value = C.svb.bases[ocls + 1] - 1;
        break;
    }

    /* artifact checking might ask about item which isn't part of any range
       but fell within the classes that do have ranges specified above */
    if (otyp < lo_p.value || otyp > hi_p.value)
        lo_p.value = hi_p.value = otyp;
    return;
}

/* randomize object descriptions */
export function shuffle_all()
{
    /* entire classes; obj_shuffle_range() handles their exceptions */
    const shuffle_classes = [
        C.AMULET_CLASS, C.POTION_CLASS, C.RING_CLASS,  C.SCROLL_CLASS,
        C.SPBOOK_CLASS, C.WAND_CLASS,   C.VENOM_CLASS,
    ];
    /* sub-class type ranges (one item from each group) */
    const shuffle_types = [
        C.HELMET, C.LEATHER_GLOVES, C.CLOAK_OF_PROTECTION, C.SPEED_BOOTS,
    ];
    let first = C.intLocal(), last = C.intLocal(), idx;

    /* do whole classes (amulets, &c) */
    for (idx = 0; idx < shuffle_classes.length; idx++) {
        obj_shuffle_range(C.svb.bases[C.int(shuffle_classes[idx])],
                          first, last);
        shuffle(first.value, last.value, 1);
    }
    /* do type ranges (helms, &c) */
    for (idx = 0; idx < shuffle_types.length; idx++) {
        obj_shuffle_range(shuffle_types[idx], first, last);
        shuffle(first.value, last.value, 0);
    }
    return;
}

/* Return TRUE if the provided string matches the unidentified description of
 * the provided object. */
export function objdescr_is(obj, descr)
{
    let objdescr;

    if (!obj) {
        C.impossible("objdescr_is: null obj");
        return 0;
    }

    objdescr = C.OBJ_DESCR(C.objects[obj.otyp]);
    if (!objdescr)
        return 0; /* no obj description, no match */
    return !C.strcmp(objdescr, descr);
}

/* level dependent initialization */
export function oinit()
{
    setgemprobs(C.u.uz);
}

export function savenames(nhfp)
{
    let i;
    let len = C.uintLocal();

    if (C.update_file(nhfp)) {
        for (i = 0; i < (C.MAXOCLASSES + 2); ++i) {
            C.Sfo_int(nhfp, C.intRef(C.svb.bases, i), "names-bases");
        }
        for (i = 0; i < C.NUM_OBJECTS; ++i) {
            C.Sfo_short(nhfp, C.shortRef(C.svd.disco, i), "names-disco");
        }
        for (i = 0; i < C.NUM_OBJECTS; ++i) {
            C.Sfo_objclass(nhfp, C.objects[i], "names-objclass");
        }
    }
    /* as long as we use only one version of Hack we
       need not save oc_name and oc_descr, but we must save
       oc_uname for all objects */
    for (i = 0; i < C.NUM_OBJECTS; i++)
        if (C.objects[i].oc_uname) {
            if (C.update_file(nhfp)) {
                len.value = C.Strlen(C.objects[i].oc_uname) + 1;
                C.Sfo_unsigned(nhfp, len, "names-len");
                C.Sfo_char(nhfp, C.objects[i].oc_uname, "names-oc_uname",
                             C.int(len.value));
            }
            if (C.release_data(nhfp)) {
                C.free(C.objects[i].oc_uname);
                C.objects[i].oc_uname = 0;
            }
        }
}
/* !SFCTOOL */

export function restnames(nhfp)
{
    let i;
    let len = C.uintLocal();
    len.value = 0;

    for (i = 0; i < (C.MAXOCLASSES + 2); ++i) {
        C.Sfi_int(nhfp, C.intRef(C.svb.bases, i), "names-bases");
    }
    for (i = 0; i < C.NUM_OBJECTS; ++i) {
        C.Sfi_short(nhfp, C.shortRef(C.svd.disco, i), "names-disco");
    }
    for (i = 0; i < C.NUM_OBJECTS; ++i) {
        C.Sfi_objclass(nhfp, C.objects[i], "names-objclass");
    }
    for (i = 0; i < C.NUM_OBJECTS; i++) {
        if (C.objects[i].oc_uname) {
            C.Sfi_unsigned(nhfp, len, "names-len");
            C.objects[i].oc_uname = C.alloc(len.value);
            C.Sfi_char(nhfp, C.objects[i].oc_uname, "names-oc_uname", C.int(len.value));
        }
    }
}

/* make the object dknown and mark it as encountered */
export function observe_object(obj)
{
    let oindx = obj.otyp;

    /* skip for generic objects and for STRANGE_OBJECT */
    if (oindx >= C.FIRST_OBJECT && !C.Hallucination) {
        obj.dknown = 1;
        discover_object(oindx, 0, 1, 0);
    }
}

export function discover_object(oindx, mark_as_known, mark_as_encountered, credit_hero)
/* type of object */
/* discover the type */
/* mark the type as having been seen/felt */
/* exercise wisdom */
{
    credit_hero = C.boolean(credit_hero);
    mark_as_encountered = C.boolean(mark_as_encountered);
    mark_as_known = C.boolean(mark_as_known);
    oindx = C.int(oindx);
    if (oindx < C.FIRST_OBJECT) /* don't discover generic objects */
        return;

    if ((!C.objects[oindx].oc_name_known && mark_as_known)
        || (!C.objects[oindx].oc_encountered && mark_as_encountered)
        || (C.Role_if(C.PM_SAMURAI)
            && C.Japanese_item_name(oindx, 0))) {
        let dindx, acls = C.objects[oindx].oc_class;

        /* Loop thru disco[] 'til we find the target (which may have been
           uname'd) or the next open slot; one or the other will be found
           before we reach the next class... */
        for (dindx = C.svb.bases[acls]; C.svd.disco[dindx] != 0; dindx++)
            if (C.svd.disco[dindx] == oindx)
                break;
        C.svd.disco[dindx] = oindx;

        if (mark_as_encountered)
            C.objects[oindx].oc_encountered = 1;

        if (!C.objects[oindx].oc_name_known && mark_as_known) {
            C.objects[oindx].oc_name_known = 1;
            if (credit_hero)
                C.exercise(C.A_WIS, 1);

            /* !in_moveloop => initial inventory,
               gameover => final disclosure */
            if (C.program_state.in_moveloop && !C.program_state.gameover) {
                if (C.objects[oindx].oc_class == C.GEM_CLASS)
                    C.gem_learned(oindx); /* could affect price of unpaid gems */
                C.update_inventory();
            }
        }
    }
}

/* if a class name has been cleared, we may need to purge it from disco[] */
export function undiscover_object(oindx)
{
    oindx = C.int(oindx);
    if (!C.objects[oindx].oc_name_known && !C.objects[oindx].oc_encountered) {
        let dindx, acls = C.objects[oindx].oc_class;
        let found = 0;

        /* find the object; shift those behind it forward one slot */
        for (dindx = C.svb.bases[acls];
             dindx < C.NUM_OBJECTS && C.svd.disco[dindx] != 0
                 && C.objects[dindx].oc_class == acls;
             dindx++)
            if (found)
                C.svd.disco[dindx - 1] = C.svd.disco[dindx];
            else if (C.svd.disco[dindx] == oindx)
                found = 1;

        /* clear last slot */
        if (found)
            C.svd.disco[dindx - 1] = 0;
        else
            C.impossible("named object not in disco");

        if (C.objects[oindx].oc_class == C.GEM_CLASS)
            C.gem_learned(oindx); /* ok, it's actually been unlearned */
    }
}

export function interesting_to_discover(i)
{
    i = C.int(i);
    /* most players who don't speak Japanese manage to figure out what
       gunyoki, osaku, and so forth mean, but treat them as pre-discovered
       to be disclosed by '\' */
    if (C.Role_if(C.PM_SAMURAI) && C.Japanese_item_name(i, 0))
        return 1;

    /* Objects that were discovered without encountering them are now printed
       with a '*' */
    return C.bool(C.objects[i].oc_uname != 0
                      || ((C.objects[i].oc_name_known
                           || C.objects[i].oc_encountered)
                          && C.OBJ_DESCR(C.objects[i]) != 0));
}

/* items that should stand out once they're known */
export const uniq_objs = [
    'AMULET_OF_YENDOR',
    /* same order as major oracularity; alphabetical when fully IDed */
    'BELL_OF_OPENING',
    'SPE_BOOK_OF_THE_DEAD',
    'CANDELABRUM_OF_INVOCATION',
];

/* discoveries qsort comparison function */
export function discovered_cmp(v1, v2)
{
    let s1 = C.loadPointer(v1);
    let s2 = C.loadPointer(v2);
    /* each element starts with "* " or "  " but we don't sort by those */
    let res = C.strcmpi(s1 + 2, s2 + 2);

    if (res == 0) {
        ; /* no tie-breaker needed */
    }
    return res;
}

export function sortloot_descr(otyp, outbuf)
{
    otyp = C.int(otyp);
    let sl_cookie = C.lootLocal();
    let o = C.objectLocal();

    C.copyObject(o, C.cg.zeroobj);
    o.otyp = otyp;
    o.oclass = C.objects[otyp].oc_class;
    o.dknown = 1; /* not observe_object, this isn't a real object */
    o.known = (C.objects[otyp].oc_name_known || !C.objects[otyp].oc_uses_known)
              ? 1 : 0;
    o.corpsenm = C.NON_PM; /* suppress statue and figurine details */
    /* but suppressing fruit details leads to "bad fruit #0" */
    if (otyp == C.SLIME_MOLD)
        o.spe = C.svc.context.current_fruit;

    C.memset(sl_cookie, 0, C.lootSize);
    sl_cookie.obj = 0;
    sl_cookie.str = 0;

    C.loot_classify(sl_cookie, o);
    C.Sprintf(outbuf, "%02d%02d%1d ",
            sl_cookie.orderclass, sl_cookie.subclass, sl_cookie.disco);
    return outbuf;
}
/* !SFCTOOL */

export const DISCO_BYCLASS = 0; /* by discovery order within each class */
/* by discovery order within each class */
export const DISCO_SORTLOOT = 1; /* by discovery order within each subclass */
/* by discovery order within each subclass */
export const DISCO_ALPHABYCLASS = 2; /* alphabetized within each class */
/* alphabetized within each class */
export const DISCO_ALPHABETIZED = 3; /* alphabetized across all classes */
/* alphabetized across all classes */
/* also used in options.c (optfn_sortdiscoveries) */
export const disco_order_let = "osca";
export const disco_orders_descr = [
    "by order of discovery within each class",
    "sortloot order (by class with some sub-class groupings)",
    "alphabetical within each class",
    "alphabetical across all classes",
    0
];


export function choose_disco_sort(mode)
/* 0 => 'O' cmd, 1 => full discoveries; 2 => class disco */
{
    mode = C.int(mode);
    let tmpwin;
    let selected = C.menuPointerLocal();
    let any = C.anyLocal();
    let i, n, choice;
    let clr = C.NO_COLOR;

    tmpwin = C.create_nhwindow(C.NHW_MENU);
    C.start_menu(tmpwin, C.MENU_BEHAVE_STANDARD);
    C.copyAny(any, C.cg.zeroany); /* zero out all bits */
    for (i = 0; C.disco_orders_descr[i]; ++i) {
        any.a_int = C.loadChar(C.disco_order_let + i);
        C.add_menu(tmpwin, C.nul_glyphinfo, any, C.char(any.a_int),
                 0, C.ATR_NONE, clr,
                 C.disco_orders_descr[i],
                 (C.loadChar(C.disco_order_let + i) == C.flags.discosort)
                    ? C.MENU_ITEMFLAGS_SELECTED
                    : C.MENU_ITEMFLAGS_NONE);
    }
    if (mode == 2) {
        /* called via 'm `' where full alphabetize doesn't make sense
           (only showing one class so can't span all classes) but the
           chosen sort will stick and also apply to '\' usage */
        C.add_menu_str(tmpwin, "");
        C.add_menu_str(tmpwin,
                     "Note: full alphabetical and alphabetical within class");
        C.add_menu_str(tmpwin,
                     "      are equivalent for single class discovery, but");
        C.add_menu_str(tmpwin,
                    "      will matter for future use of total discoveries.");
    }
    C.end_menu(tmpwin, "Ordering of discoveries");

    n = C.select_menu(tmpwin, C.PICK_ONE, selected);
    C.destroy_nhwindow(tmpwin);
    if (n > 0) {
        choice = selected.value[0].item.a_int;
        /* skip preselected entry if we have more than one item chosen */
        if (n > 1 && choice == C.int(C.flags.discosort))
            choice = selected.value[1].item.a_int;
        C.free(selected.value);
        C.flags.discosort = choice;
    }
    return n;
}

/* augment obj_typename() with explanation of Japanese item names */
export function disco_typename(otyp)
{
    otyp = C.int(otyp);
    let result = C.obj_typename(otyp);

    if (C.Role_if(C.PM_SAMURAI) && C.Japanese_item_name(otyp, 0)) {
        let buf = C.stackAlloc(C.BUFSZ);
        let actualn = (((otyp != C.MAGIC_HARP && otyp != C.WOODEN_HARP)
                                || C.objects[otyp].oc_name_known)
                               ? C.OBJ_NAME(C.objects[otyp])
                               /* undiscovered harp (since wooden harp is
                                  non-magic so pre-discovered, only applies
                                  to magic harp and will only be seen if
                                  magic harp has been 'called' something) */
                               : "harp");

        if (!actualn) { /* won't happen; used to pacify static analyzer */
            ;
        } else if (C.strstri(result, " called")) {
            C.Sprintf(buf, " [%s] called", actualn);
            C.strsubst(result, " called", buf);
        } else if (C.strstri(result, " (")) {
            C.Sprintf(buf, " [%s] (", actualn);
            C.strsubst(result, " (", buf);
        } else {
            C.Sprintf(C.eos(result), " [%s]", actualn);
        }
    }
    return result;
}

/* append typename(dis) to buf[], possibly truncating in the process;
   also append price quote information if it fits */
export function disco_append_typename(buf, dis)
{
    dis = C.int(dis);
    let len = C.size_t(C.strlen(buf));
    let p, typnm = C.callLocal(disco_typename, dis);
    let typnm_len = C.size_t(C.strlen(typnm));
    let eos = C.charPointerLocal();

    if (C.size_t(len + typnm_len) < C.BUFSZ) {
        /* ordinary */
        C.Strcat(buf, typnm);
        eos.value = C.ptrAdd(buf, C.size_t(len + typnm_len));
    } else if ((p = C.strrchr(typnm, '('.charCodeAt(0))) != 0
               && p > typnm && C.loadChar(p - 1) == ' '.charCodeAt(0) && C.strchr(p, ')'.charCodeAt(0)) != 0) {
        /* typename() returned "really long user-applied name (actual type)"
           and we want to truncate from "really long user-applied name" while
           keeping " (actual type)" intact */
        --p; /* back up to space in front of open paren */
        C.strncat(buf, typnm, C.size_t(C.size_t(C.BUFSZ - 1) - C.size_t(len + C.size_t(C.uint(C.strlen(p))))));
        C.Strcat(buf, p);
        eos.value = C.ptrAdd(buf, C.strlen(buf));
    } else {
        /* unexpected; just truncate from end of typename */
        C.strncat(buf, typnm, C.size_t(C.size_t(C.BUFSZ - 1) - len));
        eos.value = C.ptrAdd(buf, C.strlen(buf));
    }

    C.append_price_quote(buf, eos, dis);
}

/* minor fixup for Book of the Dead needed in more than one place */
export function disco_fmt_uniq(uidx, outbuf)
{
    uidx = C.int(uidx);
    C.Sprintf(outbuf, "  %s", C.objects[uidx].oc_name_known
                              ? C.OBJ_NAME(C.objects[uidx])
                              : C.OBJ_DESCR(C.objects[uidx]));
    /* in the spellbooks section of main discoveries list, encountered
       but not fully discovered Book of the Dead is shown as
       "spellbook (papyrus)" like other encountered but not discovered books;
       in the unique/relics section we want "papyrus spellbook" instead */
    if (!C.objects[uidx].oc_name_known
        && C.objects[uidx].oc_class == C.SPBOOK_CLASS)
        C.Strcat(outbuf, " spellbook");
}

/* sort and output sorted_lines to window and free the lines */
export function disco_output_sorted(tmpwin, sorted_lines, sorted_ct, lootsort)
{
    lootsort = C.boolean(lootsort);
    sorted_ct = C.int(sorted_ct);
    tmpwin = C.int(tmpwin);
    let p;
    let j;

    C.qsort(sorted_lines, C.size_t(sorted_ct), C.size_t(C.pointerSize), discovered_cmp);
    for (j = 0; j < sorted_ct; ++j) {
        p = sorted_lines[j];
        C.assert(p != 0); /* pacify static analyzer */
        if (lootsort) {
            C.storeChar(p + 6, C.loadChar(p)); /* '*' or ' ' */
            p += 6;
        }
        C.putstr(tmpwin, 0, p);
        C.free(sorted_lines[j]), sorted_lines[j] = 0;
    }
}

/* the #known command - show discovered object types */
export function dodiscovered()
/* free after Robert Viduya */
{
    let tmpwin;
    let s, oclass, prev_class,
         classes = C.stackAlloc(C.MAXOCLASSES), buf = C.stackAlloc(C.BUFSZ),
         sorted_lines = C.pointerArrayLocal(C.NUM_OBJECTS); /* overkill */
    let p;
    let i, dis, ct, uniq_ct, arti_ct, sorted_ct, uidx;
    let sortindx;  // should be ptrdiff_t, but we don't require that exists
    let alphabetized, alphabyclass, lootsort;

    if (!C.flags.discosort || !(p = C.strchr(C.disco_order_let, C.flags.discosort)))
        C.flags.discosort = 'o'.charCodeAt(0);

    if (C.iflags.menu_requested) {
        if (C.callLocal(choose_disco_sort, 1) < 0)
            return C.ECMD_OK;
    }
    alphabyclass = (C.flags.discosort == 'c'.charCodeAt(0));
    alphabetized = (C.flags.discosort == 'a'.charCodeAt(0) || alphabyclass);
    lootsort = (C.flags.discosort == 's'.charCodeAt(0));
    sortindx = C.ptrDiff(C.strchr(C.disco_order_let, C.flags.discosort), C.disco_order_let);

    tmpwin = C.create_nhwindow(C.NHW_TEXT);
    C.Sprintf(buf, "Discoveries, %s", C.disco_orders_descr[sortindx]);
    C.putstr(tmpwin, 0, buf);
    C.putstr(tmpwin, 0, "");

    /*
     * FIXME?
     *  relics and artifacts don't obey player's sort order even though
     *  the header line states that they're shown in such-and-such order.
     */

    /* gather "unique objects", also called "relics", into a pseudo-class;
       they'll also be displayed individually within their regular class */
    uniq_ct = 0;
    for (i = dis = 0; i < C.uniq_objs.length; i++) {
        uidx = C.uniq_objs[i];
        if (C.objects[uidx].oc_name_known
            || (C.objects[uidx].oc_encountered && uidx != C.AMULET_OF_YENDOR)) {
            if (!dis++)
                C.putstr(tmpwin, C.iflags.menu_headings.attr,
                       "Unique items or Relics");
            ++uniq_ct;
            C.callLocal(disco_fmt_uniq, uidx, buf);
            C.putstr(tmpwin, 0, buf);
        }
    }
    /* display any known artifacts as another pseudo-class */
    arti_ct = C.disp_artifact_discoveries(tmpwin);

    /* several classes are omitted from packorder; one is of interest here */
    C.Strcpy(classes, C.flags.inv_order);
    if (!C.strchr(classes, C.VENOM_CLASS))
        C.strkitten(classes, C.VENOM_CLASS); /* append char to string */

    ct = uniq_ct + arti_ct;
    sorted_ct = 0;
    for (s = classes; C.loadChar(s); s++) {
        oclass = C.loadChar(s);
        prev_class = oclass + 1; /* forced different from oclass */
        for (i = C.svb.bases[C.int(oclass)];
             i < C.NUM_OBJECTS && C.objects[i].oc_class == oclass; i++) {
            if ((dis = C.svd.disco[i]) != 0 && interesting_to_discover(dis)) {
                ct++;
                if (oclass != prev_class) {
                    if ((alphabyclass || lootsort) && sorted_ct) {
                        /* output previous class */
                        C.callLocal(disco_output_sorted, tmpwin, sorted_lines, sorted_ct,
                                            lootsort);
                        sorted_ct = 0;
                    }
                    if (!alphabetized || alphabyclass) {
                        /* header for new class */
                        C.putstr(tmpwin, C.iflags.menu_headings.attr,
                               C.let_to_name(oclass, 0, 0));
                        prev_class = oclass;
                    }
                }
                C.Strcpy(buf, C.objects[dis].oc_encountered ? "  " : "* ");
                if (lootsort)
                    C.callLocal(sortloot_descr, dis, buf + 2);
                C.callLocal(disco_append_typename, buf, dis);

                if (!alphabetized && !lootsort)
                    C.putstr(tmpwin, 0, buf);
                else
                    sorted_lines[sorted_ct++] = C.dupstr(buf);
            }
        }
    }
    if (ct == 0) {
        C.You("haven't discovered anything yet...");
    } else {
        if (sorted_ct) {
            /* if we're alphabetizing by class, we've already shown the
               relevant header above; if we're alphabetizing across all
               classes, we normally don't need a header; but it we showed
               any unique items or any artifacts then we do need one */
            if ((uniq_ct || arti_ct) && alphabetized && !alphabyclass)
                C.putstr(tmpwin, C.iflags.menu_headings.attr, "Discovered items");
            C.callLocal(disco_output_sorted, tmpwin, sorted_lines, sorted_ct, lootsort);
        }
        C.display_nhwindow(tmpwin, 1);
    }
    C.destroy_nhwindow(tmpwin);

    return C.ECMD_OK;
}

/* lower case let_to_name() output, which differs from def_oc_syms[].name */
export function oclass_to_name(oclass, buf)
{
    oclass = C.char(oclass);
    let s;

    C.Strcpy(buf, C.let_to_name(oclass, 0, 0));
    for (s = buf; C.loadChar(s); ++s)
        C.storeChar(s, C.lowc(C.loadChar(s)));
    return buf;
}

/* the #knownclass command - show discovered object types for one class;
   in addition to actual object classes, supports pseudo-class 'a' for
   discovered artifacts and 'u' (or 'r', for "relics") for unique items */
export function doclassdisco()
{
    const prompt = "View discoveries for which sort of objects?",
        havent_discovered_any = "haven't discovered any %s yet.",
        unique_items = "unique items or relics",
        artifact_items = "artifacts";
    let tmpwin = C.WIN_ERR;
    let pick_list = C.menuPointerLocal();
    pick_list.value = 0;
    let any = C.anyLocal();
    let s, c, oclass, menulet, allclasses = C.stackAlloc(C.MAXOCLASSES),
         discosyms = C.stackAlloc(3 + C.MAXOCLASSES + 1), buf = C.stackAlloc(C.BUFSZ),
         sorted_lines = C.pointerArrayLocal(C.NUM_OBJECTS); /* overkill */
    let p;
    let i, ct, dis, xtras, sorted_ct, uidx;
    let traditional, alphabetized, lootsort;
    let clr = C.NO_COLOR;

    if (!C.flags.discosort || !(p = C.strchr(C.disco_order_let, C.flags.discosort)))
        C.flags.discosort = 'o'.charCodeAt(0);

    if (C.iflags.menu_requested) {
        if (C.callLocal(choose_disco_sort, 2) < 0)
            return C.ECMD_OK;
    }
    alphabetized = (C.flags.discosort == 'a'.charCodeAt(0) || C.flags.discosort == 'c'.charCodeAt(0));
    lootsort = (C.flags.discosort == 's'.charCodeAt(0));

    C.storeChar(discosyms, 0);
    traditional = (C.flags.menu_style == C.MENU_TRADITIONAL
                   || C.flags.menu_style == C.MENU_COMBINATION);
    if (!traditional) {
        tmpwin = C.create_nhwindow(C.NHW_MENU);
        C.start_menu(tmpwin, C.MENU_BEHAVE_STANDARD);
    }
    C.copyAny(any, C.cg.zeroany);
    menulet = 'a'.charCodeAt(0);

    /*
     * FIXME?
     *  relics and artifacts don't obey player's sort order even though
     *  the header line states that they're shown in such-and-such order.
     */

    /* check whether we've discovered any unique objects (primarily the
       invocation items; the Guidebook calls unique items "relics" but the
       Amulet of Yendor is unique too so we haven't made a blanket change
       from 'u' to 'r') */
    for (i = 0; i < C.uniq_objs.length; i++) {
        uidx = C.uniq_objs[i];
        if (C.objects[uidx].oc_name_known
            || (C.objects[uidx].oc_encountered && uidx != C.AMULET_OF_YENDOR)) {
            C.Strcat(discosyms, "u");
            if (!traditional) {
                any.a_int = 'u'.charCodeAt(0);
                /* FIXME: having 'r' as an accelerator to provide an unseen
                   synonym works but doesn't make much sense since the main
                   selector is 'a' (implicit lootabc) rather than 'u' */
                C.add_menu(tmpwin, C.nul_glyphinfo, any, menulet++, 'r'.charCodeAt(0),
                         C.ATR_NONE, clr, unique_items, C.MENU_ITEMFLAGS_NONE);
            }
            break;
        }
    }

    /* check whether we've discovered any artifacts */
    if (C.disp_artifact_discoveries(C.WIN_ERR) > 0) {
        C.Strcat(discosyms, "a");
        if (!traditional) {
            any.a_int = 'a'.charCodeAt(0);
            C.add_menu(tmpwin, C.nul_glyphinfo, any, menulet++, 0,
                     C.ATR_NONE, clr, artifact_items, C.MENU_ITEMFLAGS_NONE);
        }
    }

    /* collect classes with discoveries, in packorder ordering; several
       classes are omitted from packorder and one is of interest here */
    C.Strcpy(allclasses, C.flags.inv_order);
    if (!C.strchr(allclasses, C.VENOM_CLASS))
        C.strkitten(allclasses, C.VENOM_CLASS); /* append char to string */
    /* construct discosyms[] */
    for (s = allclasses; C.loadChar(s); ++s) {
        oclass = C.loadChar(s);
        c = C.def_oc_syms[C.int(oclass)].sym;
        for (i = C.svb.bases[C.int(oclass)];
             i < C.NUM_OBJECTS && C.objects[i].oc_class == oclass; ++i)
            if ((dis = C.svd.disco[i]) != 0 && interesting_to_discover(dis)) {
                if (!C.strchr(discosyms, c)) {
                    C.strkitten(discosyms, c);
                    if (!traditional) {
                        any.a_int = c;
                        C.add_menu(tmpwin, C.nul_glyphinfo, any,
                                 menulet++, c, C.ATR_NONE, clr,
                                 C.callLocal(oclass_to_name, oclass, buf),
                                 C.MENU_ITEMFLAGS_NONE);
                    }
                }
            }
    }

    /* there might not be anything for us to do... */
    if (!C.loadChar(discosyms)) {
        C.You(havent_discovered_any, "items");
        if (tmpwin != C.WIN_ERR)
            C.destroy_nhwindow(tmpwin);
        return C.ECMD_OK;
    }

    /* have player choose a class */
    c = '\0'.charCodeAt(0); /* class not chosen yet */
    if (traditional) {
        let allclasses_plustwo = C.stackAlloc(C.MAXOCLASSES + 3);

        /* we'll prompt even if there's only one viable class; we add all
           nonviable classes as unseen acceptable choices so player can ask
           for discoveries of any class whether it has discoveries or not */
        C.Sprintf(allclasses_plustwo, "%s%c%c%c", allclasses, 'a'.charCodeAt(0), 'u'.charCodeAt(0), 'r'.charCodeAt(0));
        for (s = allclasses_plustwo, xtras = 0; C.loadChar(s); ++s) {
            c = C.strchr("aur", C.loadChar(s)) ? C.loadChar(s) : C.def_oc_syms[C.int(C.loadChar(s))].sym;
            if (!C.strchr(discosyms, c)) {
                if (!xtras++)
                    C.strkitten(discosyms, '\x1b'.charCodeAt(0));
                C.strkitten(discosyms, c);
            }
        }
        /* get the class (via its symbol character) */
        c = C.char(C.yn_function(prompt, discosyms, '\0'.charCodeAt(0), 1));
        if (!c)
            C.clear_nhwindow(C.WIN_MESSAGE);
    } else {
        /* menustyle:full or menustyle:partial */
        if (!C.loadChar(discosyms + 1) && C.flags.menu_style == C.MENU_PARTIAL) {
            /* only one class; menustyle:partial normally jumps past class
               filtering straight to final menu so skip class filter here */
            c = C.loadChar(discosyms);
        } else {
            /* more than one choice, or menustyle:full which normally has
               an intermediate class selection menu before the final menu */
            C.end_menu(tmpwin, prompt);
            i = C.select_menu(tmpwin, C.PICK_ONE, pick_list);
            if (i > 0) {
                c = C.char(pick_list.value[0].item.a_int);
                C.free(pick_list.value);
            } /* else c stays 0 */
        }
        C.destroy_nhwindow(tmpwin);
    }
    if (!c)
        return C.ECMD_OK; /* player declined to make a selection */

    /*
     * show discoveries for object class c
     */
    tmpwin = C.create_nhwindow(C.NHW_TEXT);
    ct = 0;
    switch (c) {
    case 'u'.charCodeAt(0):
    case 'r'.charCodeAt(0):
        C.putstr(tmpwin, C.iflags.menu_headings.attr,
               C.upstart(C.strcpy(buf, unique_items)));
        for (i = 0; i < C.uniq_objs.length; i++) {
            uidx = C.uniq_objs[i];
            if (C.objects[uidx].oc_name_known
                || (C.objects[uidx].oc_encountered
                    && uidx != C.AMULET_OF_YENDOR)) {
                ++ct;
                C.callLocal(disco_fmt_uniq, uidx, buf);
                C.putstr(tmpwin, 0, buf);
            }
        }
        if (!ct)
            C.You(havent_discovered_any, unique_items);
        break;
    case 'a'.charCodeAt(0):
        /* note: this will work all the time for menustyle traditional
           but requires at least one artifact discovery for other styles
           [could fix that by forcing the 'a' choice into the pick-class
           menu when running in wizard mode] */
        if (C.wizard && C.y_n("Dump information about all artifacts?") == 'y'.charCodeAt(0)) {
            C.dump_artifact_info(tmpwin);
            ct = C.NROFARTIFACTS; /* non-zero vs zero is what matters below */
            break;
        }
        /* disp_artifact_discoveries() includes a header */
        ct = C.disp_artifact_discoveries(tmpwin);
        if (!ct)
            C.You(havent_discovered_any, artifact_items);
        break;
    default:
        oclass = C.def_char_to_objclass(c);
        /* this should never happen but has been observed via the fuzzer */
        if (oclass == C.MAXOCLASSES)
            C.impossible("doclassdisco: invalid object class '%s'", C.visctrl(c));
        C.Sprintf(buf, "Discovered %s in %s", C.let_to_name(oclass, 0, 0),
                (C.flags.discosort == 'o'.charCodeAt(0)) ? "order of discovery"
                : (C.flags.discosort == 's'.charCodeAt(0)) ? "'sortloot' order"
                  : "alphabetical order");
        C.putstr(tmpwin, 0, buf); /* skip iflags.menu_headings */
        sorted_ct = 0;
        for (i = C.svb.bases[C.int(oclass)]; i <= C.svb.bases[oclass + 1] - 1;
             ++i) {
            if ((dis = C.svd.disco[i]) != 0 && interesting_to_discover(dis)) {
                ++ct;
                C.Strcpy(buf, C.objects[dis].oc_encountered ? "  " : "* ");
                if (lootsort)
                    C.callLocal(sortloot_descr, dis, buf + 2);
                C.callLocal(disco_append_typename, buf, dis);

                if (!alphabetized && !lootsort)
                    C.putstr(tmpwin, 0, buf);
                else
                    sorted_lines[sorted_ct++] = C.dupstr(buf);
            }
        }
        if (!ct) {
            C.You(havent_discovered_any, C.callLocal(oclass_to_name, oclass, buf));
        } else if (sorted_ct) {
            C.qsort(sorted_lines, C.size_t(sorted_ct), C.size_t(C.pointerSize), discovered_cmp);
            for (i = 0; i < sorted_ct; ++i) {
                let sl;

                sl = sorted_lines[i];
                if (lootsort) {
                    C.storeChar(sl + 6, C.loadChar(sl)); /* '*' or ' ' */
                    sl += 6;
                }
                C.putstr(tmpwin, 0, sl);
                C.free(sorted_lines[i]), sorted_lines[i] = 0;
            }
        }
        break;
    }
    if (ct)
        C.display_nhwindow(tmpwin, 1);
    C.destroy_nhwindow(tmpwin);
    return C.ECMD_OK;
}

/* put up nameable subset of discoveries list as a menu */
export function rename_disco()
{
    let i, dis;
    let ct = 0, mn = 0, sl;
    let s, oclass, prev_class;
    let tmpwin;
    let any = C.anyLocal();
    let selected = C.menuPointerLocal();
    selected.value = 0;
    let clr = C.NO_COLOR;
    let buf = C.stackAlloc(C.BUFSZ);

    C.copyAny(any, C.cg.zeroany);
    tmpwin = C.create_nhwindow(C.NHW_MENU);
    C.start_menu(tmpwin, C.MENU_BEHAVE_STANDARD);

    /*
     * Skip the "unique objects" section (each will appear within its
     * regular class if it is nameable) and the artifacts section.
     * We assume that classes omitted from packorder aren't nameable
     * so we skip venom too.
     */

    /* for each class, show discoveries in that class */
    for (s = C.flags.inv_order; C.loadChar(s); s++) {
        oclass = C.loadChar(s);
        prev_class = oclass + 1; /* forced different from oclass */
        for (i = C.svb.bases[C.int(oclass)];
             i < C.NUM_OBJECTS && C.objects[i].oc_class == oclass; i++) {
            dis = C.svd.disco[i];
            if (!dis || !interesting_to_discover(dis))
                continue;
            ct++;
            if (!C.objtyp_is_callable(dis))
                continue;
            mn++;

            if (oclass != prev_class) {
                any.a_int = 0;
                C.add_menu_heading(tmpwin,
                                 C.let_to_name(oclass, 0, 0));
                prev_class = oclass;
            }
            any.a_int = dis;
            C.storeChar(buf, 0);
            C.callLocal(disco_append_typename, buf, dis);
            C.add_menu(tmpwin, C.nul_glyphinfo, any, 0, 0,
                     C.ATR_NONE, clr, buf, C.MENU_ITEMFLAGS_NONE);
        }
    }
    if (ct == 0) {
        C.You("haven't discovered anything yet...");
    } else if (mn == 0) {
        C.pline("None of your discoveries can be assigned names...");
    } else {
        C.end_menu(tmpwin, "Pick an object type to name");
        dis = C.STRANGE_OBJECT;
        sl = C.select_menu(tmpwin, C.PICK_ONE, selected);
        if (sl > 0) {
            dis = selected.value[0].item.a_int;
            C.free(selected.value);
        }
        if (dis != C.STRANGE_OBJECT) {
            let odummy = C.objectLocal();

            C.copyObject(odummy, C.cg.zeroobj);
            odummy.otyp = dis;
            odummy.oclass = C.objects[dis].oc_class;
            odummy.quan = 1n;
            odummy.known = !C.objects[dis].oc_uses_known;
            odummy.dknown = 1; /* not observe_object: it isn't real */
            C.docall(odummy);
        }
    }
    C.destroy_nhwindow(tmpwin);
    return;
}
/* !SFCTOOL */

export function get_sortdisco(opts, cnf)
{
    cnf = C.boolean(cnf);
    let p = C.strchr(C.disco_order_let, C.flags.discosort);

    if (!p)
        C.flags.discosort = 'o'.charCodeAt(0), p = C.disco_order_let;
    if (cnf)
        C.Sprintf(opts, "%c", C.flags.discosort);
    else
        C.Strcpy(opts, C.disco_orders_descr[C.ptrDiff(p, C.disco_order_let)]);
}
/*o_init.c*/
