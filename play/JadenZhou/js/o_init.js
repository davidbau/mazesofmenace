// o_init.js — object initialization: description shuffles, gem probabilities.
// C ref: o_init.c — setgemprobs, randomize_gem_colors, shuffle, init_objects,
// init_oclass_probs, obj_shuffle_range, shuffle_all, objdescr_is, oinit.
//
// The discoveries code in o_init.c (discover_object, dodiscovered, ...) and
// savenames()/restnames() are not ported yet. TILES_IN_GLYPHMAP's
// shuffle_tiles() is left out because the JS display has no tiles.
//
// svb.bases[] and go.oclass_prob_totals[] (decl.h) live on the game object
// as game.bases and game.oclass_prob_totals.

import { game } from './gstate.js';
import { rn2 } from './rng.js';
import { SIZE, TRUE, FALSE } from './const.js';
import { ledger_no, maxledgerno } from './dungeon.js';
import {
    objects, OBJ_NAME, OBJ_DESCR, NUM_OBJECTS, MAXOCLASSES, NODIR, IMMEDIATE,
    ILLOBJ_CLASS, ARMOR_CLASS, RING_CLASS, AMULET_CLASS, POTION_CLASS,
    SCROLL_CLASS, SPBOOK_CLASS, WAND_CLASS, GEM_CLASS, VENOM_CLASS,
    LAST_REAL_GEM, TURQUOISE, AQUAMARINE, FLUORITE, SAPPHIRE, DIAMOND, EMERALD,
    HELMET, HELM_OF_TELEPATHY, LEATHER_GLOVES, GAUNTLETS_OF_DEXTERITY,
    CLOAK_OF_PROTECTION, CLOAK_OF_DISPLACEMENT, SPEED_BOOTS, LEVITATION_BOOTS,
    POT_WATER, WAN_NOTHING,
} from './objects.js';

// C's panic() (end.c), impossible() and raw_printf() (pline.c) are not
// ported yet. None of the checks below can fail with the stock objects[].
function panic(msg) { throw new Error(`panic: ${msg}`); }
function impossible(msg) { console.error(`impossible: ${msg}`); }
function raw_printf(msg) { console.error(msg); }

// C ref: o_init.c setgemprobs()
function setgemprobs(dlev) {
    let j, first, lev, sum = 0;

    if (dlev)
        lev = (ledger_no(dlev) > maxledgerno()) ? maxledgerno()
                                                : ledger_no(dlev);
    else
        lev = 0;
    first = game.bases[GEM_CLASS];

    for (j = 0; j < 9 - Math.trunc(lev / 3); j++)
        objects[first + j].oc_prob = 0;
    first += j;
    if (first > LAST_REAL_GEM || objects[first].oc_class !== GEM_CLASS
        || OBJ_NAME(objects[first]) === null) {
        raw_printf(`Not enough gems? - first=${first} j=${j} LAST_GEM=${LAST_REAL_GEM}`);
        /* wait_synch(); */
    }
    for (j = first; j <= LAST_REAL_GEM; j++)
        objects[j].oc_prob = Math.trunc((171 + j - first) / (LAST_REAL_GEM + 1 - first));

    /* recompute GEM_CLASS total oc_prob - including rocks/stones */
    for (j = game.bases[GEM_CLASS]; j < game.bases[GEM_CLASS + 1]; j++)
        sum += objects[j].oc_prob;
    game.oclass_prob_totals[GEM_CLASS] = sum;
}

// C ref: o_init.c COPY_OBJ_DESCR() macro (local to randomize_gem_colors)
function COPY_OBJ_DESCR(o_dst, o_src) {
    o_dst.oc_descr_idx = o_src.oc_descr_idx;
    o_dst.oc_color = o_src.oc_color;
}

// C ref: o_init.c randomize_gem_colors() — some gems can have different colors
function randomize_gem_colors() {
    if (rn2(2)) { /* change turquoise from green to blue? */
        COPY_OBJ_DESCR(objects[TURQUOISE], objects[SAPPHIRE]);
    }
    if (rn2(2)) { /* change aquamarine from green to blue? */
        COPY_OBJ_DESCR(objects[AQUAMARINE], objects[SAPPHIRE]);
    }
    switch (rn2(4)) { /* change fluorite from violet? */
    case 0:
        break;
    case 1: /* blue */
        COPY_OBJ_DESCR(objects[FLUORITE], objects[SAPPHIRE]);
        break;
    case 2: /* white */
        COPY_OBJ_DESCR(objects[FLUORITE], objects[DIAMOND]);
        break;
    case 3: /* green */
        COPY_OBJ_DESCR(objects[FLUORITE], objects[EMERALD]);
        break;
    }
}

// C ref: o_init.c shuffle() — shuffle descriptions on objects o_low to o_high
function shuffle(o_low, o_high, domaterial) {
    let i, j, num_to_shuffle;
    let sw;
    let color;

    for (num_to_shuffle = 0, j = o_low; j <= o_high; j++)
        if (!objects[j].oc_name_known)
            num_to_shuffle++;
    if (num_to_shuffle < 2)
        return;

    for (j = o_low; j <= o_high; j++) {
        if (objects[j].oc_name_known)
            continue;
        do
            i = j + rn2(o_high - j + 1);
        while (objects[i].oc_name_known);
        sw = objects[j].oc_descr_idx;
        objects[j].oc_descr_idx = objects[i].oc_descr_idx;
        objects[i].oc_descr_idx = sw;
        sw = objects[j].oc_tough;
        objects[j].oc_tough = objects[i].oc_tough;
        objects[i].oc_tough = sw;
        color = objects[j].oc_color;
        objects[j].oc_color = objects[i].oc_color;
        objects[i].oc_color = color;

        /* shuffle material */
        if (domaterial) {
            sw = objects[j].oc_material;
            objects[j].oc_material = objects[i].oc_material;
            objects[i].oc_material = sw;
        }
    }
}

// C ref: o_init.c init_objects()
export function init_objects() {
    let i, first, last, prevoclass;
    let oclass;

    /* svb.bases[MAXOCLASSES + 2] and go.oclass_prob_totals[MAXOCLASSES] */
    if (!game.bases) game.bases = new Array(MAXOCLASSES + 2).fill(0);
    if (!game.oclass_prob_totals) game.oclass_prob_totals = new Array(MAXOCLASSES).fill(0);
    const bases = game.bases;

    for (i = 0; i <= MAXOCLASSES; i++) {
        bases[i] = 0;
        if (i > 0 && i < MAXOCLASSES && objects[i].oc_class !== i)
            panic(`init_objects: class for generic object #${i} doesn't match (${objects[i].oc_class})`);
    }
    /* initialize object descriptions */
    for (i = 0; i < NUM_OBJECTS; i++)
        objects[i].oc_name_idx = objects[i].oc_descr_idx = i;
    /* init base; if probs given check that they add up to 1000,
       otherwise compute probs */
    first = MAXOCLASSES;
    prevoclass = -1;
    while (first < NUM_OBJECTS) {
        oclass = objects[first].oc_class;
        /*
         * objects[] sanity check:  must be in ascending oc_class order to
         * be able to use bases[class+1]-1 for the end of a class's range.
         * Also catches a non-contiguous class because reverting to any
         * earlier class would involve switching back to a lower class
         * number after having moved on to one or more other classes.
         */
        if (oclass < prevoclass)
            panic(`objects[${first}] class #${oclass} not in order!`);

        last = first + 1;
        while (last < NUM_OBJECTS && objects[last].oc_class === oclass)
            last++;
        bases[oclass] = first;

        if (oclass === GEM_CLASS) {
            setgemprobs(null);
            randomize_gem_colors();
        }
        first = last;
        prevoclass = oclass;
    }
    /* extra entry allows deriving the range of a class via
       bases[class] through bases[class+1]-1 for all classes
       (except for ILLOBJ_CLASS which is separated from WEAPON_CLASS
       by generic objects); second extra entry is to prevent an
       unexplained crash in doclassdisco(), where the code ended up
       attempting to process non-existent class MAXOCLASSES; the
       [MAXOCLASSES+1] element gives that non-class 0 objects
       when traversing objects[] from bases[X] through bases[X+1]-1 */
    bases[MAXOCLASSES] = bases[MAXOCLASSES + 1] = NUM_OBJECTS;
    /* hypothetically someone might remove all objects of some class,
       or be adding a new class and not populated it yet, leaving gaps
       in bases[]; guarantee that there are no such gaps */
    for (last = MAXOCLASSES - 1; last >= 0; --last)
        if (!bases[last])
            bases[last] = bases[last + 1];

    /* check objects[].oc_name_known */
    for (i = MAXOCLASSES; i < NUM_OBJECTS; ++i) {
        const nmkn = objects[i].oc_name_known !== 0 ? 1 : 0;

        if ((!OBJ_DESCR(objects[i]) ? 1 : 0) ^ nmkn) {
            if (game.iflags?.sanity_check) {
                impossible(`obj #${i} (${OBJ_NAME(objects[i])}) name is ${nmkn ? "pre-known" : "not known"} despite${nmkn ? "" : " no"} alternate description`);
            }
            /* repair the mistake and keep going */
            objects[i].oc_name_known = nmkn ? 0 : 1;
        }
    }
    /* compute oclass_prob_totals */
    init_oclass_probs();

    /* shuffle descriptions */
    shuffle_all();
    objects[WAN_NOTHING].oc_dir = rn2(2) ? NODIR : IMMEDIATE;
}

// C ref: o_init.c init_oclass_probs()
/* Compute the total probability of each object class.
 * Assumes svb.bases[] has already been set. */
export function init_oclass_probs() {
    let i;
    let sum;
    let oclass;
    for (oclass = 0; oclass < MAXOCLASSES; ++oclass) {
        sum = 0;
        /* note: for ILLOBJ_CLASS, bases[oclass+1]-1 isn't the last item
           in the class; but all the generic items have probability 0 so
           adding them to 'sum' has no impact */
        for (i = game.bases[oclass]; i < game.bases[oclass + 1]; ++i) {
            sum += objects[i].oc_prob;
        }
        if (sum <= 0 && oclass !== ILLOBJ_CLASS
            && game.bases[oclass] !== game.bases[oclass + 1]) {
            impossible(`${!sum ? "zero" : "negative"} (${sum}) probability total for oclass ${oclass}`);
            /* gracefully fail by setting all members of this class to 1 */
            for (i = game.bases[oclass]; i < game.bases[oclass + 1]; ++i) {
                objects[i].oc_prob = 1;
                sum++;
            }
        }
        game.oclass_prob_totals[oclass] = sum;
    }
}

// C ref: o_init.c obj_shuffle_range()
/* retrieve the range of objects that otyp shares descriptions with;
   C returns the range through int *lo_p, *hi_p, JS returns { lo, hi } */
export function obj_shuffle_range(otyp) {
    let i, ocls = objects[otyp].oc_class;
    let lo, hi;

    /* default is just the object itself */
    lo = hi = otyp;

    switch (ocls) {
    case ARMOR_CLASS:
        if (otyp >= HELMET && otyp <= HELM_OF_TELEPATHY)
            lo = HELMET, hi = HELM_OF_TELEPATHY;
        else if (otyp >= LEATHER_GLOVES && otyp <= GAUNTLETS_OF_DEXTERITY)
            lo = LEATHER_GLOVES, hi = GAUNTLETS_OF_DEXTERITY;
        else if (otyp >= CLOAK_OF_PROTECTION && otyp <= CLOAK_OF_DISPLACEMENT)
            lo = CLOAK_OF_PROTECTION, hi = CLOAK_OF_DISPLACEMENT;
        else if (otyp >= SPEED_BOOTS && otyp <= LEVITATION_BOOTS)
            lo = SPEED_BOOTS, hi = LEVITATION_BOOTS;
        break;
    case POTION_CLASS:
        /* potion of water has the only fixed description */
        lo = game.bases[POTION_CLASS];
        hi = POT_WATER - 1;
        break;
    case AMULET_CLASS:
    case SCROLL_CLASS:
    case SPBOOK_CLASS:
        /* exclude non-magic types and also unique ones */
        lo = game.bases[ocls];
        for (i = lo; objects[i].oc_class === ocls; i++)
            if (objects[i].oc_unique || !objects[i].oc_magic)
                break;
        hi = i - 1;
        break;
    case RING_CLASS:
    case WAND_CLASS:
    case VENOM_CLASS:
        /* entire class */
        lo = game.bases[ocls];
        hi = game.bases[ocls + 1] - 1;
        break;
    }

    /* artifact checking might ask about item which isn't part of any range
       but fell within the classes that do have ranges specified above */
    if (otyp < lo || otyp > hi)
        lo = hi = otyp;
    return { lo, hi };
}

/* entire classes; obj_shuffle_range() handles their exceptions */
const shuffle_classes = [
    AMULET_CLASS, POTION_CLASS, RING_CLASS,  SCROLL_CLASS,
    SPBOOK_CLASS, WAND_CLASS,   VENOM_CLASS,
];
/* sub-class type ranges (one item from each group) */
const shuffle_types = [
    HELMET, LEATHER_GLOVES, CLOAK_OF_PROTECTION, SPEED_BOOTS,
];

// C ref: o_init.c shuffle_all() — randomize object descriptions
function shuffle_all() {
    let first, last, idx;

    /* do whole classes (amulets, &c) */
    for (idx = 0; idx < SIZE(shuffle_classes); idx++) {
        ({ lo: first, hi: last } = obj_shuffle_range(game.bases[shuffle_classes[idx]]));
        shuffle(first, last, TRUE);
    }
    /* do type ranges (helms, &c) */
    for (idx = 0; idx < SIZE(shuffle_types); idx++) {
        ({ lo: first, hi: last } = obj_shuffle_range(shuffle_types[idx]));
        shuffle(first, last, FALSE);
    }
    return;
}

// C ref: o_init.c objdescr_is()
/* Return TRUE if the provided string matches the unidentified description of
 * the provided object. */
export function objdescr_is(obj, descr) {
    let objdescr;

    if (!obj) {
        impossible("objdescr_is: null obj");
        return FALSE;
    }

    objdescr = OBJ_DESCR(objects[obj.otyp]);
    if (!objdescr)
        return FALSE; /* no obj description, no match */
    return objdescr === descr ? TRUE : FALSE;
}

// C ref: o_init.c oinit() — level dependent initialization
// (mklev.js still calls its own no-op stub. setgemprobs() needs ledger_no(),
// whose game.dungeons init_dungeons() now fills in, so the mklev.c port can
// call this one.)
export function oinit() {
    setgemprobs(game.u.uz);
}
