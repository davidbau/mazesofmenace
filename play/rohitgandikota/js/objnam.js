// objnam.js — object naming.
// C ref: src/objnam.c
//
// Only obj_typename() so far, which is what the discoveries window needs. It
// composes the class word, the actual name (once discovered) and the shuffled
// appearance in parentheses:
//
//   "scroll" + " of magic mapping" + " (ANDOVA BEGARIN)"
//
// The appearance comes from obj_descr[oc_descr_idx], and oc_descr_idx is what
// js/o_init.js shuffles at game start — so a correct label here is also a
// direct check that the o_init port is right.

import { game } from './gstate.js';
import { strstri } from './hacklib.js';
import { hard_helmet } from './do_wear.js';
import { W_ARMOR, W_QUIVER, W_WEP } from './const.js';
import { mons } from './monst_data.js';
import { OCLASSES, ONAMES, obj_descr } from './objects_data.js';

const {
    COIN_CLASS, POTION_CLASS, SCROLL_CLASS, WAND_CLASS, SPBOOK_CLASS,
    RING_CLASS, AMULET_CLASS, ARMOR_CLASS, GEM_CLASS, WEAPON_CLASS,
    TOOL_CLASS, FOOD_CLASS, VENOM_CLASS, CHAIN_CLASS, ROCK_CLASS,
} = OCLASSES;

// include/objclass.h:190-191
export const OBJ_NAME = (ocl) => obj_descr[ocl.oc_name_idx]?.oc_name ?? null;
export const OBJ_DESCR = (ocl) => obj_descr[ocl.oc_descr_idx]?.oc_descr ?? null;

// include/objclass.h:38-44 — armour category, stored in oc_subtyp.
export const ARM_SUIT = 0, ARM_SHIELD = 1, ARM_HELM = 2, ARM_GLOVES = 3,
             ARM_BOOTS = 4, ARM_CLOAK = 5, ARM_SHIRT = 6;

const GemStone = (otyp) =>
    game.objects[otyp].oc_class === GEM_CLASS
    && game.objects[otyp].oc_material === 8 /* MINERAL */;

// src/objnam.c:220 obj_typename()
export function obj_typename(otyp) {
    const ocl = game.objects[otyp];
    const actualn = OBJ_NAME(ocl) ?? 'object?';
    const dn = OBJ_DESCR(ocl);
    const un = ocl.oc_uname || null;
    const nn = ocl.oc_name_known;
    let buf = '';

    switch (ocl.oc_class) {
    case COIN_CLASS:
        return actualn;
    case POTION_CLASS: buf = 'potion'; break;
    case SCROLL_CLASS: buf = 'scroll'; break;
    case WAND_CLASS:   buf = 'wand'; break;
    case SPBOOK_CLASS: buf = 'spellbook'; break;
    case RING_CLASS:   buf = 'ring'; break;
    case AMULET_CLASS:
        buf = nn ? actualn : 'amulet';
        if (un) buf += ` called ${un}`;
        if (dn) buf += ` (${dn})`;
        return buf;
    case ARMOR_CLASS:
        if (ocl.oc_subtyp === ARM_GLOVES || ocl.oc_subtyp === ARM_BOOTS)
            buf = 'pair of ';
        /* FALLTHRU */
    default:
        if (nn) {
            buf += actualn;
            if (GemStone(otyp)) buf += ' stone';
            if (un) buf += ` called ${un}`;
            if (dn) buf += ` (${dn})`;
        } else {
            buf += (dn || actualn);
            if (ocl.oc_class === GEM_CLASS)
                buf += (ocl.oc_material === 8) ? ' stone' : ' gem';
            if (un) buf += ` called ${un}`;
        }
        return buf;
    }

    /* ring / scroll / potion / wand / spellbook */
    if (nn) {
        if (ocl.oc_unique)
            buf = actualn;
        else
            buf += ` of ${actualn}`;
    }
    if (un) buf += ` called ${un}`;
    if (dn) buf += ` (${dn})`;
    return buf;
}

// ---------------------------------------------------------------------------
// xname / doname
// ---------------------------------------------------------------------------

// src/objnam.c:437 just_an() — "", "a " or "an ".
//
// Chosen from the string that FOLLOWS it, which is why doname_base() sets
// prefix to "a " early and then recomputes it at the end once "uncursed ",
// "+0 " and friends have been prepended: "a uncursed" would be wrong but
// "an uncursed" is right, and only the final string knows.
const VOWELS = 'aeiou';
export function just_an(str) {
    if (!str) return '';
    const c0 = str[0].toLowerCase();
    if (!str[1] || str[1] === ' ')
        return 'aefhilmnosx'.includes(c0) ? 'an ' : 'a ';
    if (/^the /i.test(str) || /^molten lava$/i.test(str)
        || /^iron bars$/i.test(str) || /^ice$/i.test(str))
        return '';
    const exception = /^one/i.test(str) && (!str[3] || '-_ '.includes(str[3]));
    if ((VOWELS.includes(c0) && !exception
         && !/^eu/i.test(str) && !/^uke/i.test(str) && !/^ukulele/i.test(str)
         && !/^unicorn/i.test(str) && !/^uranium/i.test(str)
         && !/^useful/i.test(str))
        || (c0 === 'x' && !VOWELS.includes((str[1] || '').toLowerCase())))
        return 'an ';
    return 'a ';
}

// src/objnam.c an() / An() — just_an() picks the article, the name follows.
export function an(str) { return just_an(str) + str; }
export function An(str) {
    const t = an(str);
    return t.charAt(0).toUpperCase() + t.slice(1);
}

// src/objnam.c makeplural() — only the regular rules plus the "X of Y" case,
// which is the one that matters for object names: "scroll of magic mapping"
// pluralises the HEAD noun, giving "scrolls of magic mapping", not
// "scroll of magic mappings".
export function makeplural(s) {
    const of = s.indexOf(' of ');
    if (of > 0)
        return makeplural(s.slice(0, of)) + s.slice(of);

    const sp = s.lastIndexOf(' ');
    const head = sp >= 0 ? s.slice(0, sp + 1) : '';
    let w = sp >= 0 ? s.slice(sp + 1) : s;

    if (/(s|x|z|ch|sh)$/i.test(w)) w += 'es';
    else if (/[^aeiou]y$/i.test(w)) w = w.slice(0, -1) + 'ies';
    else if (/(f)$/i.test(w)) w = w.slice(0, -1) + 'ves';
    else w += 's';
    return head + w;
}

// src/objnam.c:820 xname() — the object's name without quantity or BUC.
export function xname(obj) {
    const ocl = game.objects[obj.otyp];
    const nn = ocl.oc_name_known;
    const actualn = OBJ_NAME(ocl) ?? 'object?';
    const dn = OBJ_DESCR(ocl) ?? actualn;
    const un = ocl.oc_uname || null;
    const pluralize = obj.quan !== 1;
    const dknown = obj.dknown;
    let buf = '';

    switch (obj.oclass) {
    case COIN_CLASS:
    case CHAIN_CLASS:
        buf = actualn;
        break;
    case WEAPON_CLASS:
        if (obj.opoisoned) buf = 'poisoned ';
        /* FALLTHRU */
    case VENOM_CLASS:
    case TOOL_CLASS:
        buf += !dknown ? dn : nn ? actualn : un ? `${dn} called ${un}` : dn;
        break;
    case ARMOR_CLASS:
        if (ocl.oc_subtyp === ARM_BOOTS || ocl.oc_subtyp === ARM_GLOVES)
            buf = 'pair of ';
        buf += nn ? actualn : un ? `${dn} called ${un}` : dn;
        break;
    case POTION_CLASS:
        /* NOT obj_typename(): xname() omits the parenthesised appearance once
           the type is known, so it is "potion of extra healing", not
           "potion of extra healing (murky)". */
        if (obj.odiluted && dknown) buf = 'diluted ';
        buf += 'potion';
        if (dknown) {
            if (nn) buf += ` of ${actualn}`;
            else if (un) buf += ` called ${un}`;
            else buf = `${dn} potion`;
        }
        break;
    case SCROLL_CLASS:
        buf = 'scroll';
        if (dknown) {
            if (nn) buf += ` of ${actualn}`;
            else if (un) buf += ` called ${un}`;
            else if (ocl.oc_magic) buf += ` labeled ${dn}`;
            else buf = `${dn} scroll`;
        }
        break;
    case FOOD_CLASS:
        buf = actualn;
        /* src/objnam.c tin_details(): a tin names its contents once known */
        if (obj.otyp === ONAMES.TIN && obj.known)
            buf += tin_details(obj);
        break;
    case SPBOOK_CLASS:
    case RING_CLASS:
    case WAND_CLASS:
    case AMULET_CLASS:
    case GEM_CLASS:
    case ROCK_CLASS:
    default:
        buf = obj_typename(obj.otyp);
        break;
    }

    return pluralize ? makeplural(buf) : buf;
}

// src/eat.c tin_details() — " of <monster>" or " of spinach".
function tin_details(obj) {
    if (obj.spe === 1) return ' of spinach';
    if (obj.corpsenm !== undefined && obj.corpsenm >= 0) {
        const m = game.mons[obj.corpsenm];
        const nm = m && (m.pmnames[2] ?? m.pmnames[0] ?? m.pmnames[1]);
        if (nm) return ` of ${nm}`;
    }
    return '';
}

// src/objnam.c:1063 doname_base()
//
// Builds a prefix (quantity or article, BUC, enchantment) and appends the
// worn/wielded suffixes. The BUC rule is the subtle one: with
// flags.implicit_uncursed on, "uncursed " is omitted for an item whose charge
// or enchantment is KNOWN and which is oc_charged — unless it is armour or a
// ring. That is why a +2 dart and an expensive camera show no BUC while a
// credit card and a food ration do.
export function doname(obj) {
    const ocl = game.objects[obj.otyp];
    const known = obj.known, bknown = obj.bknown, dknown = obj.dknown;
    let bp = xname(obj);
    let prefix = '';

    if (obj.quan !== 1)
        prefix = `${obj.quan} `;
    else if (obj.otyp === ONAMES.CORPSE)
        ;                              /* no article */
    else
        prefix = 'a ';                 /* recomputed at the end */

    if (bknown && obj.oclass !== COIN_CLASS) {
        if (obj.cursed) prefix += 'cursed ';
        else if (obj.blessed) prefix += 'blessed ';
        else if (!game.flags.implicit_uncursed
                 || ((!known || !ocl.oc_charged
                      || obj.oclass === ARMOR_CLASS
                      || obj.oclass === RING_CLASS)))
            prefix += 'uncursed ';
    }

    switch (obj.oclass) {
    case ARMOR_CLASS:
        if (obj.owornmask & W_ARMOR) bp += ' (being worn)';
        /* FALLTHRU */
    case WEAPON_CLASS:
        if (known) prefix += `${obj.spe >= 0 ? '+' : ''}${obj.spe} `;
        break;
    case TOOL_CLASS:
        /* charged tools show "(0:n)" once the count is known */
        if (ocl.oc_charged && known)
            bp += ` (${obj.recharged || 0}:${obj.spe})`;
        break;
    default:
        break;
    }

    if (obj.owornmask & W_QUIVER) bp += ' (at the ready)';
    if (obj.owornmask & W_WEP) bp += ' (weapon in hand)';

    /* src/objnam.c:1527 — recompute the article now that the prefix is
       complete, so "a uncursed" becomes "an uncursed". */
    if (prefix.startsWith('a ')) {
        const rest = prefix.slice(2);
        prefix = just_an(rest || bp) + rest;
    }
    return prefix + bp;
}

// include/prop.h

// src/objnam.c:5492 cloak_simple_name() — "robe"/"wrapping"/"smock"/"apron",
// else "cloak". The smock answer depends on discovery: an identified alchemy
// smock is a "smock", an unidentified one is an "apron".
export function cloak_simple_name(cloak) {
    if (cloak) {
        switch (cloak.otyp) {
        case ONAMES.ROBE:
            return "robe";
        case ONAMES.MUMMY_WRAPPING:
            return "wrapping";
        case ONAMES.ALCHEMY_SMOCK:
            return (game.objects[cloak.otyp].oc_name_known && cloak.dknown)
                       ? "smock"
                       : "apron";
        default:
            break;
        }
    }
    return "cloak";
}

// src/objnam.c:5513 helm_simple_name() — helm vs hat for messages.
//
// Chosen to agree with the "protected by hard helmet" bonk messages: headgear
// that protects is a "helm", headgear that does not is a "hat". So elven
// leather helm and leather hat are both hats, dwarvish iron helm and hard hat
// are both helms.
export function helm_simple_name(helmet) {
    return !hard_helmet(helmet) ? "hat" : "helm";
}

// src/objnam.c:5532 gloves_simple_name() — gloves vs gauntlets, by discovery.
//
// One strstri, against the actual name when the type is known and against the
// description when it is not. Note this differs from boots_simple_name below,
// which tests both strings; the asymmetry is in the C.
export function gloves_simple_name(gloves) {
    const gauntlets = "gauntlets";

    if (gloves && gloves.dknown) {
        const otyp = gloves.otyp;
        const ocl = game.objects[otyp];
        const actualn = OBJ_NAME(ocl), descrpn = OBJ_DESCR(ocl);

        if (strstri(game.objects[otyp].oc_name_known ? actualn : descrpn,
                    gauntlets) >= 0)
            return gauntlets;
    }
    return "gloves";
}

// src/objnam.c:5550 boots_simple_name() — boots vs shoes, by discovery.
//
// Unlike gloves above, this checks the DESCRIPTION unconditionally and the
// actual name only when the type is known, so it can answer "shoes" for an
// unidentified pair whose description says shoes.
export function boots_simple_name(boots) {
    const shoes = "shoes";

    if (boots && boots.dknown) {
        const otyp = boots.otyp;
        const ocl = game.objects[otyp];
        const actualn = OBJ_NAME(ocl), descrpn = OBJ_DESCR(ocl);

        if (strstri(descrpn, shoes) >= 0
            || (game.objects[otyp].oc_name_known && strstri(actualn, shoes) >= 0))
            return shoes;
    }
    return "boots";
}
