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
import { vegetarian } from './mondata.js';
import { rn2, rnd } from './rng.js';
import { mksobj, rnd_class, curse } from './mkobj.js';
import { Is_candle, Is_container } from './obj.js';
import { is_ammo, is_missile } from './wield.js';
import { is_weptool, is_rustprone, is_corrodeable, is_flammable,
         is_crackable, is_rottable } from './mkobj.js';
import { bimanual } from './obj.js';
import { W_ARMOR, W_QUIVER, W_WEP, plur, P_BOW, W_SWAPWEP } from './const.js';
import { mons, PMNAMES } from './monst_data.js';
import { observe_object } from './o_init.js';
const mons_PM_SAMURAI = PMNAMES.PM_SAMURAI;
import { OCLASSES, ONAMES, MATERIALS, obj_descr } from './objects_data.js';

const {
    COIN_CLASS, POTION_CLASS, SCROLL_CLASS, WAND_CLASS, SPBOOK_CLASS,
    RING_CLASS, AMULET_CLASS, ARMOR_CLASS, GEM_CLASS, WEAPON_CLASS,
    TOOL_CLASS, FOOD_CLASS, VENOM_CLASS, CHAIN_CLASS, ROCK_CLASS,
} = OCLASSES;

// include/objclass.h:190-191
/* The generated obj_descr table stores 0 (a NUMBER) for absent strings, and
   `?? null` passes 0 through — which made "has a description" tests true for
   every descriptionless item the moment one entered the discoveries list. */
export const OBJ_NAME = (ocl) => obj_descr[ocl.oc_name_idx]?.oc_name || null;
export const OBJ_DESCR = (ocl) => obj_descr[ocl.oc_descr_idx]?.oc_descr || null;

// include/objclass.h:38-44 — armour category, stored in oc_subtyp.
export const ARM_SUIT = 0, ARM_SHIELD = 1, ARM_HELM = 2, ARM_GLOVES = 3,
             ARM_BOOTS = 4, ARM_CLOAK = 5, ARM_SHIRT = 6;

// src/objnam.c:98 GemStone() — gems whose identified name takes " stone".
// The old form tested oc_material === 8 with a MINERAL comment; 8 is WOOD
// (MINERAL is 21), and C's macro keys on GEMSTONE anyway, minus the seven
// jewels whose names stand alone.
const GemStone = (typ) =>
    typ === ONAMES.FLINT
    || (game.objects[typ].oc_material === MATERIALS.GEMSTONE
        && typ !== ONAMES.DILITHIUM_CRYSTAL && typ !== ONAMES.RUBY
        && typ !== ONAMES.DIAMOND && typ !== ONAMES.SAPPHIRE
        && typ !== ONAMES.BLACK_OPAL && typ !== ONAMES.EMERALD
        && typ !== ONAMES.OPAL);

// src/objnam.c:220 obj_typename()
export function obj_typename(otyp) {
    const ocl = game.objects[otyp];
    let actualn = OBJ_NAME(ocl) ?? 'object?';
    let dn = OBJ_DESCR(ocl);
    /* src/objnam.c:211 — the Samurai substitution applies here too */
    if (game.urole?.mnum === 'PM_SAMURAI'
        || game.urole?.mnum === PMNAMES.PM_SAMURAI) {
        actualn = Japanese_item_name(otyp, actualn);
        if (otyp === ONAMES.WOODEN_HARP || otyp === ONAMES.MAGIC_HARP)
            dn = 'koto';
    }
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
/* src/objnam.c:2689 as_is[] — words whose plural is spelled the same.
   Only the tail word is tested, matching singplur_lookup's endstring. */
const as_is = [
    'boots', 'shoes', 'gloves', 'lenses', 'scales',
    'eyes', 'gauntlets', 'iron bars',
    'bison', 'deer', 'elk', 'fish', 'fowl',
    'tuna', 'yaki', '-hai', 'krill', 'manes',
    'moose', 'ninja', 'sheep', 'ronin', 'roshi',
    'shito', 'tengu', 'ki-rin', 'Nazgul', 'gunyoki',
    'piranha', 'samurai', 'shuriken', 'haggis', 'Bordeaux',
];

export function makeplural(s) {
    const of = s.indexOf(' of ');
    if (of > 0)
        return makeplural(s.slice(0, of)) + s.slice(of);

    /* src/objnam.c:2911 singplur_lookup + :2916 — "ya" (alone or as the
       last word) stays "ya"; the as_is[] words are already plural-shaped */
    const low = s.toLowerCase();
    for (const w of as_is)
        if (low.endsWith(w.toLowerCase()))
            return s;
    if (low === 'ya' || low.endsWith(' ya'))
        return s;

    const sp = s.lastIndexOf(' ');
    const head = sp >= 0 ? s.slice(0, sp + 1) : '';
    let w = sp >= 0 ? s.slice(sp + 1) : s;

    if (/(s|x|z|ch|sh)$/i.test(w)) w += 'es';
    else if (/[^aeiou]y$/i.test(w)) w = w.slice(0, -1) + 'ies';
    else if (/(f)$/i.test(w)) w = w.slice(0, -1) + 'ves';
    else w += 's';
    return head + w;
}

/* src/objnam.c:105 Japanese_items[] — a Samurai sees these names. */
const Japanese_items = {
    SHORT_SWORD: 'wakizashi', BROADSWORD: 'ninja-to', FLAIL: 'nunchaku',
    GLAIVE: 'naginata', LOCK_PICK: 'osaku', WOODEN_HARP: 'koto',
    MAGIC_HARP: 'magic koto', KNIFE: 'shito', PLATE_MAIL: 'tanko',
    HELMET: 'kabuto', LEATHER_GLOVES: 'yugake', FOOD_RATION: 'gunyoki',
    POT_BOOZE: 'sake',
};

// src/objnam.c:5422 Japanese_item_name()
export function Japanese_item_name(otyp, ordinaryname) {
    for (const [key, jname] of Object.entries(Japanese_items))
        if (ONAMES[key] === otyp)
            return jname;
    return ordinaryname;
}

// src/objnam.c:820 xname() — the object's name without quantity or BUC.
export function xname(obj) {
    const ocl = game.objects[obj.otyp];
    const nn = ocl.oc_name_known;
    let actualn = OBJ_NAME(ocl) ?? 'object?';
    let dn = OBJ_DESCR(ocl) ?? actualn;
    /* src/objnam.c:605 — a Samurai reads these items in Japanese */
    if (game.urole?.mnum === 'PM_SAMURAI'
        || game.urole?.mnum === mons_PM_SAMURAI) {
        actualn = Japanese_item_name(obj.otyp, actualn);
        if (obj.otyp === ONAMES.WOODEN_HARP || obj.otyp === ONAMES.MAGIC_HARP)
            dn = 'koto';
    }
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
    case AMULET_CLASS:
        if (!dknown)
            buf = 'amulet';
        else if (obj.otyp === ONAMES.AMULET_OF_YENDOR
                 || obj.otyp === ONAMES.FAKE_AMULET_OF_YENDOR)
            /* each must be identified individually */
            buf = obj.known ? actualn : dn;
        else if (nn)
            buf = actualn;
        else if (un)
            buf = `amulet called ${un}`;
        else
            buf = `${dn} amulet`;
        break;
    case WAND_CLASS:
        if (!dknown)
            buf = 'wand';
        else if (nn)
            buf = `wand of ${actualn}`;
        else if (un)
            buf = `wand called ${un}`;
        else
            buf = `${dn} wand`;
        break;
    case SPBOOK_CLASS:
        if (obj.otyp === ONAMES.SPE_NOVEL) { /* 3.6 tribute */
            if (!dknown)
                buf = 'book';
            else if (nn)
                buf = actualn;
            else if (un)
                buf = `novel called ${un}`;
            else
                buf = `${dn} book`;
        } else if (!dknown) {
            buf = 'spellbook';
        } else if (nn) {
            buf = (obj.otyp !== ONAMES.SPE_BOOK_OF_THE_DEAD
                   ? 'spellbook of ' : '') + actualn;
        } else if (un) {
            buf = `spellbook called ${un}`;
        } else
            buf = `${dn} spellbook`;
        break;
    case RING_CLASS:
        if (!dknown)
            buf = 'ring';
        else if (nn)
            buf = `ring of ${actualn}`;
        else if (un)
            buf = `ring called ${un}`;
        else
            buf = `${dn} ring`;
        break;
    case GEM_CLASS: {
        const rock = (ocl.oc_material === MATERIALS.MINERAL) ? 'stone' : 'gem';

        if (!dknown) {
            buf = rock;
        } else if (!nn) {
            if (un)
                buf = `${rock} called ${un}`;
            else
                buf = `${dn} ${rock}`;
        } else {
            buf = actualn;
            if (GemStone(obj.otyp))
                buf += ' stone';
        }
        break;
    } /* gem */
    case ROCK_CLASS:
    default:
        buf = obj_typename(obj.otyp);
        break;
    }

    return pluralize ? makeplural(buf) : buf;
}

// src/eat.c tin_details() — " of <monster>" or " of spinach".
// src/objnam.c singular() — name one item of a stack.
// The CORPSE arm redirects xname to cxname for the monster type; corpses on
// this tree go through the same xname, so the redirect has nothing to change.
export function singular(otmp, func) {
    const savequan = otmp.quan;
    otmp.quan = 1;
    const nam = func(otmp);
    otmp.quan = savequan;
    return nam;
}

function tin_details(obj) {
    if (obj.spe === 1) return ' of spinach';
    if (obj.corpsenm !== undefined && obj.corpsenm >= 0) {
        const m = game.mons[obj.corpsenm];
        const nm = m && (m.pmnames[2] ?? m.pmnames[0] ?? m.pmnames[1]);
        /* src/eat.c:1453 — "%s meat" unless the creature is vegetarian */
        if (nm) return vegetarian(m) ? ` of ${nm}` : ` of ${nm} meat`;
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

    /* src/objnam.c:1300 — "empty" goes at the beginning: a container known
       to have no contents (bag of tricks and horn of plenty key on charges
       instead and are recorded with the charge subsystem) */
    if (obj.cknown
        && ((obj.otyp === ONAMES.BAG_OF_TRICKS
             || obj.otyp === ONAMES.HORN_OF_PLENTY)
            ? (obj.spe === 0 && !known)
            : ((Is_container(obj) || obj.otyp === ONAMES.STATUE)
               && !(obj.cobj && obj.cobj.length))))
        prefix += 'empty ';

    if (bknown && obj.oclass !== COIN_CLASS) {
        if (obj.cursed) prefix += 'cursed ';
        else if (obj.blessed) prefix += 'blessed ';
        else if (!game.flags.implicit_uncursed
                 || ((!known || !ocl.oc_charged
                      || obj.oclass === ARMOR_CLASS
                      || obj.oclass === RING_CLASS)))
            prefix += 'uncursed ';
    }

    /* src/objnam.c:1183 add_erosion_words — erodeproofing shows once rknown.
       The eroded (rusty/burnt) words precede this in C; no session carries
       an eroded item yet. */
    if (obj.rknown && obj.oerodeproof)
        prefix += is_rustprone(obj, game.objects) ? 'rustproof '
                  : is_corrodeable(obj, game.objects) ? 'corrodeproof '
                    : is_flammable(obj, game.objects) ? 'fireproof '
                      : is_crackable(obj, game.objects) ? 'tempered '
                        : is_rottable(obj, game.objects) ? 'rotproof '
                          : '';

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
    case WAND_CLASS:
        /* src/objnam.c:1483 — a wand always shows its charges once known;
           unlike tools there is no oc_charged gate. */
        if (known)
            bp += ` (${obj.recharged || 0}:${obj.spe})`;
        break;
    default:
        break;
    }

    /* src/objnam.c:1560-1646 — the wield/swap/quiver suffixes. twoweap and
       the tether/Sting-glow/artifact-light decorations need state this tree
       does not track; u.twoweap stays falsy throughout. body_part(HAND) is
       "hand" for every un-polymorphed form and polyself is not ported. */
    if (obj.owornmask & W_WEP) {
        /* use alternate phrasing for non-weapons and for wielded ammo
           (arrows, bolts), or missiles (darts, shuriken, boomerangs) */
        if (obj.quan !== 1
            || ((obj.oclass === OCLASSES.WEAPON_CLASS)
                ? (is_ammo(obj) || is_missile(obj))
                : !is_weptool(obj, game.objects))) {
            bp += ' (wielded)';
        } else {
            const hand_s = bimanual(obj) ? 'hands'
                : `${((game.u.uhandedness ?? 0) === 0) ? 'right' : 'left'} hand`; /* URIGHTY; RIGHT_HANDED == 0 */
            bp += ` (weapon in ${hand_s})`;
        }
    }
    if (obj.owornmask & W_SWAPWEP) {
        bp += ` (alternate weapon${plur(obj.quan)}; not wielded)`;
    }
    if (obj.owornmask & W_QUIVER) {
        let Qtyp;
        switch (obj.oclass) {
        case OCLASSES.WEAPON_CLASS:
            Qtyp = !is_ammo(obj) ? 3 /* not ammo: "at the ready" */
                   : (game.objects[obj.otyp].oc_skill !== -P_BOW) ? 2 /* non-bow */
                     : 1; /* ammo for a bow: "in quiver" */
            break;
        case OCLASSES.RING_CLASS:
        case OCLASSES.AMULET_CLASS:
        case OCLASSES.WAND_CLASS:
        case OCLASSES.COIN_CLASS:
        case OCLASSES.GEM_CLASS:
            Qtyp = 2; /* small, non-bow: "in quiver pouch" */
            break;
        default: /* odd things */
            Qtyp = 3; /* "at the ready" */
            break;
        }
        bp += ` (${(Qtyp === 1) ? 'in quiver'
                 : (Qtyp === 2) ? 'in quiver pouch'
                   : 'at the ready'})`;
    }

    /* src/objnam.c:1527 — recompute the article now that the prefix is
       complete, so "a uncursed" becomes "an uncursed". */
    if (prefix.startsWith('a ')) {
        const rest = prefix.slice(2);
        prefix = just_an(rest || bp) + rest;
    }
    return prefix + bp;
}

// include/prop.h

// ---------------------------------------------------------------------------
// The wish parser. C ref: src/objnam.c readobjnam() and helpers.
// Ported spine: counts and articles, the BUC and erodeproof words, the
// "(N:M)"/"(lit)" charge suffix, the wrp[] class-word forms, and the
// rnd_otyp_by_namedesc resolution with its probability-weighted rn2. Wish
// constructs beyond that (monsters, corpses, fruits, terrain) record and
// return null so the caller can say nothing fitting exists.
// ---------------------------------------------------------------------------

function note_unported_objnam(what) {
    (game.unported ||= new Set()).add('objnam:' + what);
}

/* src/hacklib.c fuzzymatch() — compare ignoring the given characters */
function fuzzymatch(s1, s2, ignore_chars, caseblind) {
    const strip = (s) => {
        let out = '';
        for (const ch of s)
            if (!ignore_chars.includes(ch)) out += ch;
        return caseblind ? out.toLowerCase() : out;
    };
    return strip(s1) === strip(s2);
}

// src/objnam.c:3243 wishymatch()
function wishymatch(u_str, o_str, retry_inverted) {
    if (fuzzymatch(u_str, o_str, ' -', true))
        return true;

    if (retry_inverted) {
        const u_of = u_str.indexOf(' of ');
        const o_of = o_str.indexOf(' of ');
        if (u_of >= 0 && o_of < 0) {
            const buf = u_str.slice(u_of + 4) + ' ' + u_str.slice(0, u_of);
            if (fuzzymatch(buf, o_str, ' -', true))
                return true;
        } else if (o_of >= 0 && u_of < 0) {
            const buf = o_str.slice(o_of + 4) + ' ' + o_str.slice(0, o_of);
            if (fuzzymatch(u_str, buf, ' -', true))
                return true;
        }
    }

    /* dwarven/elvish/helm/gauntlets/detect variants */
    if (o_str.startsWith('dwarvish ') && u_str.toLowerCase().startsWith('dwarven '))
        return fuzzymatch(u_str.slice(8), o_str.slice(9), ' -', true);
    if (o_str.startsWith('elven ')) {
        if (u_str.toLowerCase().startsWith('elvish '))
            return fuzzymatch(u_str.slice(7), o_str.slice(6), ' -', true);
        if (u_str.toLowerCase().startsWith('elfin '))
            return fuzzymatch(u_str.slice(6), o_str.slice(6), ' -', true);
    }
    if (o_str.includes('helm') && u_str.includes('helmet'))
        return wishymatch(u_str.replace('helmet', 'helm'), o_str, true);
    if (o_str.includes('gauntlets') && u_str.includes('gloves'))
        return wishymatch(u_str.replace('gloves', 'gauntlets'), o_str, true);
    if (o_str.startsWith('detect ')) {
        const p = u_str.indexOf(' detection');
        if (p >= 0)
            return fuzzymatch('detect ' + u_str.slice(0, p), o_str, ' -', true);
    } else if (o_str.endsWith(' detection')) {
        if (u_str.toLowerCase().startsWith('detect '))
            return fuzzymatch(u_str.slice(7),
                              o_str.slice(0, -' detection'.length), ' -', true);
    }
    return false;
}

// src/objnam.c:3455 rnd_otyp_by_namedesc()
export function rnd_otyp_by_namedesc(name, oclass, xtra_prob) {
    if (!name)
        return 0;                      /* STRANGE_OBJECT */

    const objects = game.objects;
    const check_of = !name.includes(' of ');
    const validobjs = [];
    let maxprob = 0;

    let lo, hi;
    if (oclass) {
        lo = game.bases[oclass];
        hi = game.bases[oclass + 1] - 1;
    } else {
        lo = OCLASSES.MAXOCLASSES ?? 18;
        hi = objects.length - 1;
    }
    for (let i = lo; i <= hi; ++i) {
        if (!objects[i] || objects[i].oc_class !== (oclass || objects[i].oc_class))
            continue;
        let zn = OBJ_NAME(objects[i]);
        if (!zn)
            continue;
        let hit = wishymatch(name, zn, true);
        if (!hit && check_of && i !== ONAMES.BELL_OF_OPENING
            && !(i >= ONAMES.GLOB_OF_GRAY_OOZE
                 && i <= ONAMES.GLOB_OF_BLACK_PUDDING)) {
            const of = zn.indexOf(' of ');
            if (of >= 0 && wishymatch(name, zn.slice(of + 4), false))
                hit = true;
        }
        if (!hit) {
            zn = OBJ_DESCR(objects[i]);
            if (zn && wishymatch(name, zn, false))
                hit = true;
            if (!hit && zn && check_of) {
                const of = zn.indexOf(' of ');
                if (of >= 0 && wishymatch(name, zn.slice(of + 4), false))
                    hit = true;
            }
        }
        if (!hit && objects[i].oc_uname
            && wishymatch(name, objects[i].oc_uname, false))
            hit = true;
        if (hit) {
            validobjs.push(i);
            maxprob += (objects[i].oc_prob || 0) + xtra_prob;
        }
    }

    if (validobjs.length > 0 && maxprob) {
        let prob = rn2(maxprob);
        let i;
        for (i = 0; i < validobjs.length - 1; i++)
            if ((prob -= (objects[validobjs[i]].oc_prob || 0) + xtra_prob) < 0)
                break;
        return validobjs[i];
    }
    return 0;
}

/* src/objnam.c:2517 wrp[]/wrpsym[] — the wishable class words */
const wrp = ['wand', 'ring', 'potion', 'scroll', 'gem',
             'amulet', 'spellbook', 'spell book',
             'weapon', 'armor', 'tool', 'food', 'comestible'];
const wrpsym = () => [OCLASSES.WAND_CLASS, OCLASSES.RING_CLASS,
    OCLASSES.POTION_CLASS, OCLASSES.SCROLL_CLASS, OCLASSES.GEM_CLASS,
    OCLASSES.AMULET_CLASS, OCLASSES.SPBOOK_CLASS, OCLASSES.SPBOOK_CLASS,
    OCLASSES.WEAPON_CLASS, OCLASSES.ARMOR_CLASS, OCLASSES.TOOL_CLASS,
    OCLASSES.FOOD_CLASS, OCLASSES.FOOD_CLASS];

// src/objnam.c:4910 readobjnam() — the reachable spine.
// Returns the created object, the string 'nothing' for a declined wish, or
// null when the request needs unported parsing.
export function readobjnam(bp) {
    if (bp == null) {
        note_unported_objnam('readobjnam:random');
        return null;
    }
    bp = bp.replace(/\s+/g, ' ').trim();
    if (/^(nothing|nil|none)$/i.test(bp))
        return 'nothing';

    const d = { cnt: 0, spe: 0, spesgn: 0, rechrg: 0, blessed: 0,
                iscursed: 0, uncursed: 0, islit: 0, erodeproof: 0,
                oclass: 0, typ: 0, actualn: null, dn: null, un: null };

    /* preparse: leading count, article and quality words */
    let loop = true;
    while (loop) {
        loop = false;
        const low = bp.toLowerCase();
        if (/^an? /.test(low)) {
            d.cnt = 1; bp = bp.replace(/^an? /i, ''); loop = true;
        } else if (/^the /.test(low)) {
            bp = bp.slice(4); loop = true;
        } else if (!d.cnt && /^\d+ /.test(bp)) {
            d.cnt = parseInt(bp, 10); bp = bp.replace(/^\d+ /, ''); loop = true;
        } else if (/^blessed |^holy /.test(low)) {
            d.blessed = 1; bp = bp.replace(/^(blessed|holy) /i, ''); loop = true;
        } else if (/^cursed |^unholy /.test(low)) {
            d.iscursed = 1; bp = bp.replace(/^(cursed|unholy) /i, ''); loop = true;
        } else if (/^uncursed /.test(low)) {
            d.uncursed = 1; bp = bp.slice(9); loop = true;
        } else if (/^(rustproof|erodeproof|corrodeproof|fixed|fireproof|rotproof|tempered) /.test(low)) {
            d.erodeproof = 1; bp = bp.replace(/^\S+ /, ''); loop = true;
        } else if (/^(greased|partly eaten|historic|diluted|empty) /.test(low)) {
            note_unported_objnam('readobjnam:prefix');
            bp = bp.replace(/^\S+ /, '');
            if (low.startsWith('partly eaten '))
                bp = bp.replace(/^eaten /, '');
            loop = true;
        }
    }
    if (!d.cnt)
        d.cnt = 1;

    /* src/objnam.c:4178 — the trailing "(...)": charges or lit */
    const par = bp.lastIndexOf('(');
    if (bp.length > 1 && par > 0) {
        const inner = bp.slice(par + 1);
        let head = bp.slice(0, par).trimEnd();
        if (/^lit\)/.test(inner)) {
            d.islit = 1;
            bp = head;
        } else {
            const m = inner.match(/^(-?\d+)(?::(-?\d+))?\)/);
            if (m) {
                if (m[2] !== undefined) {
                    d.rechrg = parseInt(m[1], 10);
                    d.spe = parseInt(m[2], 10);
                } else {
                    d.spe = parseInt(m[1], 10);
                }
                d.spesgn = 1;
                bp = head;
            }
        }
    }
    if (d.spe < 0) {
        d.spesgn = -1;
        d.spe = Math.abs(d.spe);
    }
    if (d.spe > 99)                     /* SPE_LIM */
        d.spe = 99;
    if (d.rechrg < 0 || d.rechrg > 7)
        d.rechrg = 7;

    /* "+N name" enchantment prefix */
    const pm = bp.match(/^([+-]\d+) /);
    if (pm) {
        d.spe = Math.abs(parseInt(pm[1], 10));
        d.spesgn = pm[1][0] === '-' ? -1 : 1;
        bp = bp.slice(pm[0].length);
    }

    /* the class-word forms: "<class> of X" and "X <class>" */
    const syms = wrpsym();
    const lowbp = bp.toLowerCase();
    for (let i = 0; i < wrp.length; i++) {
        const w = wrp[i];
        if (lowbp.startsWith(w) && (lowbp.length === w.length
                                    || lowbp[w.length] === ' ')) {
            d.oclass = syms[i];
            if (d.oclass !== OCLASSES.AMULET_CLASS) {
                bp = bp.slice(w.length);
                if (bp.toLowerCase().startsWith(' of '))
                    d.actualn = bp.slice(4);
                else
                    d.actualn = bp.trim() || null;
            } else {
                d.actualn = bp;
            }
            break;
        }
        if (lowbp.endsWith(' ' + w)) {
            d.oclass = syms[i];
            if (d.oclass !== OCLASSES.AMULET_CLASS)
                bp = bp.slice(0, -(w.length + 1));
            d.actualn = d.dn = bp;
            break;
        }
    }
    if (!d.oclass) {
        d.actualn = bp;
        d.dn = d.dn || bp;
    }

    /* srch — src/objnam.c:4748 */
    d.typ = rnd_otyp_by_namedesc(d.actualn, d.oclass, 1)
            || (d.dn !== d.actualn
                && rnd_otyp_by_namedesc(d.dn, d.oclass, 1))
            || rnd_otyp_by_namedesc(d.un, d.oclass, 1)
            || 0;
    if (!d.typ && d.actualn) {
        for (const [key, jname] of Object.entries(Japanese_items))
            if (jname.toLowerCase() === d.actualn.toLowerCase()) {
                d.typ = ONAMES[key];
                break;
            }
    }
    if (!d.typ && !d.oclass) {
        note_unported_objnam(`readobjnam:unparsed "${bp}"`);
        return null;
    }
    if (!d.typ && d.oclass) {
        note_unported_objnam('readobjnam:random_of_class');
        return null;
    }

    /* typfnd — non-wizard downgrades of unique/nowish items */
    if (d.typ && !game.wizard) {
        switch (d.typ) {
        case ONAMES.AMULET_OF_YENDOR: d.typ = ONAMES.FAKE_AMULET_OF_YENDOR; break;
        case ONAMES.CANDELABRUM_OF_INVOCATION:
            d.typ = rnd_class(ONAMES.TALLOW_CANDLE, ONAMES.WAX_CANDLE); break;
        case ONAMES.BELL_OF_OPENING: d.typ = ONAMES.BELL; break;
        case ONAMES.SPE_BOOK_OF_THE_DEAD: d.typ = ONAMES.SPE_BLANK_PAPER; break;
        case ONAMES.MAGIC_LAMP: d.typ = ONAMES.OIL_LAMP; break;
        default:
            if (game.objects[d.typ].oc_nowish)
                return null;
            break;
        }
    }

    /* create the object, then fine-tune it (src/objnam.c:5037) */
    const otmp = mksobj(d.typ, true, false);
    d.typ = otmp.otyp;
    d.oclass = otmp.oclass;

    if (d.cnt > 0 && d.cnt !== 1 && game.objects[d.typ].oc_merge
        && (game.wizard || d.cnt < rnd(6)
            || (d.cnt <= 7 && Is_candle(otmp))
            || (d.cnt <= 20 && (d.typ === ONAMES.ROCK
                                || d.typ === ONAMES.FLINT))))
        otmp.quan = d.cnt;

    /* src/objnam.c:5093 — the wished spe */
    if (d.spesgn === 0) {
        d.spe = otmp.spe;
    } else if (game.wizard) {
        ; /* no restrictions except SPE_LIM */
    } else if (d.oclass === OCLASSES.ARMOR_CLASS
               || d.oclass === OCLASSES.WEAPON_CLASS
               || is_weptool(otmp, game.objects)
               || (d.oclass === OCLASSES.RING_CLASS
                   && game.objects[d.typ].oc_charged)) {
        if (d.spe > rnd(5) && d.spe > otmp.spe)
            d.spe = 0;
        if (d.spe > 2 && (game.u.uluck || 0) < 0)
            d.spesgn = -1;
    } else {
        if (d.oclass === OCLASSES.WAND_CLASS
            || d.typ === ONAMES.CRYSTAL_BALL) {
            if (d.spe > 1 && d.spesgn === -1)
                d.spe = 1;
        } else {
            if (d.spe > 0 && d.spesgn === -1)
                d.spe = 0;
        }
        if (d.spe > otmp.spe)
            d.spe = otmp.spe;
    }
    if (d.spesgn === -1)
        d.spe = -d.spe;

    switch (d.typ) {
    case ONAMES.TIN:
        note_unported_objnam('readobjnam:tin_contents');
        break;
    default:
        otmp.spe = d.spe;
        break;
    }
    if (d.oclass === OCLASSES.WAND_CLASS && d.spesgn === 1)
        otmp.recharged = d.rechrg;

    if (d.iscursed)
        curse(otmp);
    else if (d.uncursed) {
        otmp.blessed = 0;
        otmp.cursed = ((game.u.uluck || 0) < 0 && !game.wizard) ? 1 : 0;
    } else if (d.blessed) {
        otmp.blessed = ((game.u.uluck || 0) < 0 && !game.wizard) ? 0 : 1;
        otmp.cursed = ((game.u.uluck || 0) < 0 && !game.wizard) ? 1 : 0;
    }
    if (d.erodeproof)
        otmp.oerodeproof = ((game.u.uluck || 0) < 0 && !game.wizard) ? 0 : 1;

    return otmp;
}
