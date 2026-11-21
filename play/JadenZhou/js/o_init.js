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
    POT_WATER, WAN_NOTHING, FIRST_OBJECT,
    AMULET_OF_YENDOR, BELL_OF_OPENING, SPE_BOOK_OF_THE_DEAD,
    CANDELABRUM_OF_INVOCATION, MAGIC_HARP, WOODEN_HARP,
} from './objects.js';
import { NHW_MENU, NHW_TEXT, PICK_ONE, MENU_BEHAVE_STANDARD,
         MENU_ITEMFLAGS_NONE, MENU_ITEMFLAGS_SELECTED, ECMD_OK } from './const.js';
import { NO_COLOR, ATR_NONE, ATR_INVERSE } from './terminal.js';
import { PM_SAMURAI } from './monsters.js';
import { strcmpi, strstri } from './hacklib.js';
import { pline } from './display.js';
import { tty_create_nhwindow, tty_start_menu, tty_add_menu, add_menu_str,
         tty_end_menu, tty_select_menu, tty_destroy_nhwindow, tty_putstr,
         tty_display_nhwindow } from './wintty.js';
import { let_to_name, def_inv_order } from './invent.js';
import { obj_typename, Japanese_item_name } from './objnam.js';

const BUFSZ = 256;

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

// C ref: o_init.c observe_object() -- make the object dknown and mark it as
// encountered
export function observe_object(obj, Hallucination) {
    const oindx = obj.otyp;

    /* skip for generic objects and for STRANGE_OBJECT */
    if (oindx >= FIRST_OBJECT && !Hallucination) {
        obj.dknown = 1;
        discover_object(oindx, FALSE, TRUE, FALSE);
    }
}

/* svd.disco[NUM_OBJECTS] (decl.h): the discoveries list, by class */
function disco() {
    if (!game.disco)
        game.disco = new Array(NUM_OBJECTS).fill(0);
    return game.disco;
}

// C ref: o_init.c discover_object()
export function discover_object(oindx, mark_as_known, mark_as_encountered,
                                credit_hero) {
    if (oindx < FIRST_OBJECT) /* don't discover generic objects */
        return;

    if ((!objects[oindx].oc_name_known && mark_as_known)
        || (!objects[oindx].oc_encountered && mark_as_encountered)
        || (Role_if_samurai()
            && Japanese_item_name(oindx, null))) {
        let dindx;
        const acls = objects[oindx].oc_class;
        const d = disco();

        /* Loop thru disco[] 'til we find the target (which may have been
           uname'd) or the next open slot; one or the other will be found
           before we reach the next class... */
        for (dindx = game.bases[acls]; d[dindx] !== 0; dindx++)
            if (d[dindx] === oindx)
                break;
        d[dindx] = oindx;

        if (mark_as_encountered)
            objects[oindx].oc_encountered = 1;

        if (!objects[oindx].oc_name_known && mark_as_known) {
            objects[oindx].oc_name_known = 1;
            if (credit_hero)
                throw new Error('discover_object(): exercise(A_WIS) credit not ported yet');

            /* !in_moveloop => initial inventory,
               gameover => final disclosure; gem_learned() (shop bills) and
               update_inventory() (perm_invent) have nothing to update */
        }
    }
}

// C ref: o_init.c interesting_to_discover()
function interesting_to_discover(i) {
    /* most players who don't speak Japanese manage to figure out what
       gunyoki, osaku, and so forth mean, but treat them as pre-discovered
       to be disclosed by '\' */
    if (Role_if_samurai() && Japanese_item_name(i, null))
        return true;

    /* Objects that were discovered without encountering them are now printed
       with a '*' */
    return (objects[i].oc_uname != null
            || ((objects[i].oc_name_known
                 || objects[i].oc_encountered)
                && OBJ_DESCR(objects[i]) != null));
}

/* items that should stand out once they're known */
const uniq_objs = [
    AMULET_OF_YENDOR,
    /* same order as major oracularity; alphabetical when fully IDed */
    BELL_OF_OPENING,
    SPE_BOOK_OF_THE_DEAD,
    CANDELABRUM_OF_INVOCATION,
];

// C ref: o_init.c discovered_cmp() -- discoveries qsort comparison function
function discovered_cmp(s1, s2) {
    /* each element starts with "* " or "  " but we don't sort by those */
    return strcmpi(s1.slice(2), s2.slice(2));
}

const disco_order_let = "osca";
const disco_orders_descr = [
    "by order of discovery within each class",
    "sortloot order (by class with some sub-class groupings)",
    "alphabetical within each class",
    "alphabetical across all classes",
];

// C ref: o_init.c choose_disco_sort()
async function choose_disco_sort(
    mode) { /* 0 => 'O' cmd, 1 => full discoveries; 2 => class disco */
    let i, n, choice;
    const clr = NO_COLOR;

    const tmpwin = tty_create_nhwindow(NHW_MENU);
    tty_start_menu(tmpwin, MENU_BEHAVE_STANDARD);
    for (i = 0; i < disco_orders_descr.length; ++i) {
        const a_int = disco_order_let[i];
        tty_add_menu(tmpwin, null, a_int, a_int, '', ATR_NONE, clr,
                     disco_orders_descr[i],
                     (disco_order_let[i] === game.flags.discosort)
                        ? MENU_ITEMFLAGS_SELECTED
                        : MENU_ITEMFLAGS_NONE);
    }
    if (mode === 2) {
        /* called via 'm `' where full alphabetize doesn't make sense
           (only showing one class so can't span all classes) but the
           chosen sort will stick and also apply to '\' usage */
        add_menu_str(tmpwin, "");
        add_menu_str(tmpwin,
                     "Note: full alphabetical and alphabetical within class");
        add_menu_str(tmpwin,
                     "      are equivalent for single class discovery, but");
        add_menu_str(tmpwin,
                     "      will matter for future use of total discoveries.");
    }
    tty_end_menu(tmpwin, "Ordering of discoveries");

    const res = await tty_select_menu(tmpwin, PICK_ONE);
    n = res.n;
    await tty_destroy_nhwindow(tmpwin);
    if (n > 0) {
        choice = res.selected[0].item;
        /* skip preselected entry if we have more than one item chosen */
        if (n > 1 && choice === game.flags.discosort)
            choice = res.selected[1].item;
        game.flags.discosort = choice;
    }
    return n;
}

// C ref: o_init.c disco_typename() -- augment obj_typename() with
// explanation of Japanese item names
function disco_typename(otyp) {
    let result = obj_typename(otyp);

    if (Role_if_samurai() && Japanese_item_name(otyp, null)) {
        let buf;
        const actualn = (((otyp !== MAGIC_HARP && otyp !== WOODEN_HARP)
                          || objects[otyp].oc_name_known)
                         ? OBJ_NAME(objects[otyp])
                         /* undiscovered harp (since wooden harp is
                            non-magic so pre-discovered, only applies
                            to magic harp and will only be seen if
                            magic harp has been 'called' something) */
                         : "harp");

        if (!actualn) { /* won't happen; used to pacify static analyzer */
            ;
        } else if (strstri(result, " called") >= 0) {
            buf = ` [${actualn}] called`;
            result = strsubst(result, " called", buf);
        } else if (strstri(result, " (") >= 0) {
            buf = ` [${actualn}] (`;
            result = strsubst(result, " (", buf);
        } else {
            result += ` [${actualn}]`;
        }
    }
    return result;
}

/* C ref: hacklib.c strsubst() -- replace the first occurrence */
function strsubst(bp, orig, replacement) {
    const at = bp.indexOf(orig);
    return (at < 0) ? bp : bp.slice(0, at) + replacement + bp.slice(at + orig.length);
}

// C ref: shk.c append_price_quote() -- the price range seen in shops
function append_price_quote(buf, otyp) {
    let buf2 = '';
    let sep = "";
    const o = objects[otyp];

    if (o.oc_sell_minseen > o.oc_sell_maxseen
        && o.oc_buy_minseen > o.oc_buy_maxseen)
        return buf;

    buf2 += " {";

    if (o.oc_buy_minseen < o.oc_buy_maxseen) {
        buf2 += `buy ${o.oc_buy_minseen}-${o.oc_buy_maxseen}`;
        sep = " ";
    } else if (o.oc_buy_minseen === o.oc_buy_maxseen) {
        buf2 += `buy ${o.oc_buy_minseen}`;
        sep = " ";
    }

    if (o.oc_sell_minseen < o.oc_sell_maxseen) {
        buf2 += `${sep}sell ${o.oc_sell_minseen}-${o.oc_sell_maxseen}`;
    } else if (o.oc_sell_minseen === o.oc_sell_maxseen) {
        buf2 += `${sep}sell ${o.oc_sell_minseen}`;
    }

    buf2 += "}";
    if (buf2.length < BUFSZ - buf.length - 1)
        buf += buf2;
    return buf;
}

// C ref: o_init.c disco_append_typename() -- append typename(dis) to buf,
// possibly truncating in the process; also append price quote information
// if it fits (JS returns the new string)
function disco_append_typename(buf, dis) {
    const len = buf.length;
    const typnm = disco_typename(dis);
    const typnm_len = typnm.length;
    let p;

    if (len + typnm_len < BUFSZ) {
        /* ordinary */
        buf += typnm;
    } else if ((p = typnm.lastIndexOf('(')) > 0
               && typnm[p - 1] === ' ' && typnm.indexOf(')', p) >= 0) {
        /* typename() returned "really long user-applied name (actual type)"
           and we want to truncate from "really long user-applied name" while
           keeping " (actual type)" intact */
        --p; /* back up to space in front of open paren */
        buf += typnm.slice(0, BUFSZ - 1 - (len + (typnm.length - p)));
        buf += typnm.slice(p);
    } else {
        /* unexpected; just truncate from end of typename */
        buf += typnm.slice(0, BUFSZ - 1 - len);
    }

    return append_price_quote(buf, dis);
}

// C ref: o_init.c disco_fmt_uniq() -- minor fixup for Book of the Dead
function disco_fmt_uniq(uidx) {
    let outbuf = `  ${objects[uidx].oc_name_known ? OBJ_NAME(objects[uidx])
                                                   : OBJ_DESCR(objects[uidx])}`;
    /* in the spellbooks section of main discoveries list, encountered
       but not fully discovered Book of the Dead is shown as
       "spellbook (papyrus)" like other encountered but not discovered books;
       in the unique/relics section we want "papyrus spellbook" instead */
    if (!objects[uidx].oc_name_known
        && objects[uidx].oc_class === SPBOOK_CLASS)
        outbuf += " spellbook";
    return outbuf;
}

// C ref: o_init.c disco_output_sorted() -- sort and output sorted_lines
// to window
async function disco_output_sorted(tmpwin, sorted_lines, lootsort) {
    sorted_lines.sort(discovered_cmp);
    for (let p of sorted_lines) {
        if (lootsort)
            p = p[0] + p.slice(7); /* p[6] = p[0]; p += 6 */
        await tty_putstr(tmpwin, 0, p);
    }
    sorted_lines.length = 0;
}

// C ref: artifact.c disp_artifact_discoveries() -- artidisco[] (filled
// by discover_artifact()) is not ported yet, so the list is empty
async function disp_artifact_discoveries(tmpwin) {
    const artidisco = game.artidisco || [];
    let i;

    for (i = 0; i < artidisco.length; i++) {
        if (artidisco[i] === 0)
            break; /* empty slot implies end of list */
        throw new Error('disp_artifact_discoveries(): artifacts not ported yet');
    }
    void tmpwin;
    return i;
}

// C ref: o_init.c dodiscovered() -- the #known command - show discovered
// object types
export async function dodiscovered() { /* free after Robert Viduya */
    let oclass, prev_class;
    let buf;
    let i, dis, ct, uniq_ct, arti_ct, uidx;
    let sortindx;
    let alphabetized, alphabyclass, lootsort;
    const sorted_lines = [];
    const headings_attr = game.iflags?.menu_headings?.attr ?? ATR_INVERSE;

    if (!game.flags)
        game.flags = {};
    if (!game.flags.discosort || !disco_order_let.includes(game.flags.discosort))
        game.flags.discosort = 'o';

    if (game.iflags?.menu_requested) {
        if (await choose_disco_sort(1) < 0)
            return ECMD_OK;
    }
    alphabyclass = (game.flags.discosort === 'c');
    alphabetized = (game.flags.discosort === 'a' || alphabyclass);
    lootsort = (game.flags.discosort === 's');
    sortindx = disco_order_let.indexOf(game.flags.discosort);
    if (lootsort)
        throw new Error('dodiscovered(): sortloot_descr() is not ported yet');

    const tmpwin = tty_create_nhwindow(NHW_TEXT);
    buf = `Discoveries, ${disco_orders_descr[sortindx]}`;
    await tty_putstr(tmpwin, 0, buf);
    await tty_putstr(tmpwin, 0, "");

    /*
     * FIXME?
     *  relics and artifacts don't obey player's sort order even though
     *  the header line states that they're shown in such-and-such order.
     */

    /* gather "unique objects", also called "relics", into a pseudo-class;
       they'll also be displayed individually within their regular class */
    uniq_ct = 0;
    for (i = dis = 0; i < uniq_objs.length; i++) {
        uidx = uniq_objs[i];
        if (objects[uidx].oc_name_known
            || (objects[uidx].oc_encountered && uidx !== AMULET_OF_YENDOR)) {
            if (!dis++)
                await tty_putstr(tmpwin, headings_attr, "Unique items or Relics");
            ++uniq_ct;
            buf = disco_fmt_uniq(uidx);
            await tty_putstr(tmpwin, 0, buf);
        }
    }
    /* display any known artifacts as another pseudo-class */
    arti_ct = await disp_artifact_discoveries(tmpwin);

    /* several classes are omitted from packorder; one is of interest here */
    const classes = def_inv_order.slice();
    if (!classes.includes(VENOM_CLASS))
        classes.push(VENOM_CLASS); /* append char to string */

    ct = uniq_ct + arti_ct;
    const d = disco();
    for (const s of classes) {
        oclass = s;
        prev_class = oclass + 1; /* forced different from oclass */
        for (i = game.bases[oclass];
             i < NUM_OBJECTS && objects[i].oc_class === oclass; i++) {
            if ((dis = d[i]) !== 0 && interesting_to_discover(dis)) {
                ct++;
                if (oclass !== prev_class) {
                    if ((alphabyclass || lootsort) && sorted_lines.length) {
                        /* output previous class */
                        await disco_output_sorted(tmpwin, sorted_lines, lootsort);
                    }
                    if (!alphabetized || alphabyclass) {
                        /* header for new class */
                        await tty_putstr(tmpwin, headings_attr,
                                         let_to_name(oclass, false, false));
                        prev_class = oclass;
                    }
                }
                buf = objects[dis].oc_encountered ? "  " : "* ";
                buf = disco_append_typename(buf, dis);

                if (!alphabetized && !lootsort)
                    await tty_putstr(tmpwin, 0, buf);
                else
                    sorted_lines.push(buf);
            }
        }
    }
    if (ct === 0) {
        await pline("You haven't discovered anything yet...");
    } else {
        if (sorted_lines.length) {
            /* if we're alphabetizing by class, we've already shown the
               relevant header above; if we're alphabetizing across all
               classes, we normally don't need a header; but it we showed
               any unique items or any artifacts then we do need one */
            if ((uniq_ct || arti_ct) && alphabetized && !alphabyclass)
                await tty_putstr(tmpwin, headings_attr, "Discovered items");
            await disco_output_sorted(tmpwin, sorted_lines, lootsort);
        }
        await tty_display_nhwindow(tmpwin, true);
    }
    await tty_destroy_nhwindow(tmpwin);

    return ECMD_OK;
}

/* C ref: you.h Role_if(PM_SAMURAI) */
function Role_if_samurai() { return game.urole?.mnum === PM_SAMURAI; }
