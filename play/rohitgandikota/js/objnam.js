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

import { carried, is_poisonable, Has_contents, OBJ_FLOOR, OBJ_MINVENT } from './obj.js';
import { game } from './gstate.js';
import { vegetarian, name_to_monplus, type_is_pname, verysmall,
         is_neuter, is_human } from './mondata.js';
import { MFLAGS, MSOUND, MONSYMS } from './monst_data.js';
import { pmname, oname, y_monnam } from './do_name.js';
import { rn2, rnd, rn1 } from './rng.js';
import { mksobj, mkobj, rnd_class, curse, set_corpsenm, zombie_form,
         set_tin_variety,
         dead_species, can_be_hatched, erosion_matters } from './mkobj.js';
import { Is_candle, Is_container } from './obj.js';
import { is_ammo, is_missile } from './wield.js';
import { is_weptool, is_rustprone, is_corrodeable, is_flammable,
         is_crackable, is_rottable } from './mkobj.js';
import { is_damageable } from './trap.js';
import { bimanual } from './obj.js';
import { W_ARMOR, W_TOOL, W_RINGR, W_RINGL, W_AMUL, W_QUIVER, W_WEP,
         W_BALL, W_CHAIN, plur, P_BOW, W_SWAPWEP,
         MALE, FEMALE, NEUTER, NEUTRAL, CORPSTAT_MALE, CORPSTAT_FEMALE,
         CORPSTAT_RANDOM, CORPSTAT_NEUTER, CORPSTAT_HISTORIC, NON_PM, LOW_PM,
         ismnum, SPE_LIM, RANDOM_TIN, GOLD_SYM, WT_IRON_BALL_INCR,
         P_POLEARMS, P_HAMMER, ONAME_WISH, ONAME_NO_FLAGS,
         HAND, ROOMOFFSET, NO_TRAP, TRAPNUM, ROCKTRAP, MAGIC_PORTAL,
         BURN_OBJECT,
         is_hole, DOOR, SDOOR, IRONBARS, HWALL, VWALL, IS_WALL,
         D_NODOOR, D_BROKEN, D_ISOPEN, D_CLOSED, D_LOCKED,
         D_TRAPPED, ALTAR, Align2amask, A_NONE, A_CHAOTIC, A_NEUTRAL,
         A_LAWFUL, SINK, S_LPUDDING, S_LDWASHER, S_LRING, POOL, MOAT, WATER,
         LAVAPOOL, LAVAWALL, ROOM, ICE, ICED_POOL, ICED_MOAT,
         DRAWBRIDGE_DOWN, DRAWBRIDGE_UP, DB_UNDER, DB_ICE,
         DB_MOAT } from './const.js';
import { mons, PMNAMES } from './monst_data.js';
import { observe_object } from './o_init.js';
import { ordin, distu, s_suffix } from './hacklib.js';
import { cansee as cansee_o } from './vision.js';
import { ART_ORB_OF_DETECTION, ART_EYES_OF_THE_OVERWORLD } from './artilist_data.js';
const mons_PM_SAMURAI = PMNAMES.PM_SAMURAI;
import { OCLASSES, ONAMES, MATERIALS, obj_descr,
         NUM_OBJECTS } from './objects_data.js';
import { strstri, strsubst, fuzzymatch, mungspaces } from './hacklib.js';
import { currency, hands_obj, weight } from './invent.js';
import { tin_variety_txt, tintxts, obj_nutrition,
         consume_oeaten } from './eat.js';
import { is_were, counter_were } from './were.js';
import { is_male, is_female } from './makemon.js';
import { def_char_to_objclass } from './sp_lev.js';
import { artifact_name, artifact_exists, nartifact_exist,
         permapoisoned } from './artifact.js';
import { is_quest_artifact } from './questpgr.js';
import { body_part } from './polyself.js';
import { pline } from './display.js';
import { tty_yn_function } from './tty/topl.js';
import { Blind, Flying, Glib, Levitation } from './youprop.js';

const {
    COIN_CLASS, POTION_CLASS, SCROLL_CLASS, WAND_CLASS, SPBOOK_CLASS,
    RING_CLASS, AMULET_CLASS, ARMOR_CLASS, GEM_CLASS, WEAPON_CLASS,
    TOOL_CLASS, FOOD_CLASS, VENOM_CLASS, BALL_CLASS, CHAIN_CLASS, ROCK_CLASS,
    ILLOBJ_CLASS, MAXOCLASSES,
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
        else if (otyp >= ONAMES.GRAY_DRAGON_SCALES
                 && otyp <= ONAMES.YELLOW_DRAGON_SCALES)
            buf = 'set of ';
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

// src/objnam.c makeplural(), compound suffixes stay singular while the head
// noun changes: "scrolls labeled KIRJE", not "scroll labeled KIRJEs".
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
    const compound = singplur_compound(s);
    if (compound > 0)
        return makeplural(s.slice(0, compound)) + s.slice(compound);

    /* src/objnam.c:2911 singplur_lookup + :2916 — "ya" (alone or as the
       last word) stays "ya"; the as_is[] words are already plural-shaped */
    const low = s.toLowerCase();
    for (const w of as_is)
        if (low.endsWith(w.toLowerCase()))
            return s;
    if (low === 'ya' || low.endsWith(' ya'))
        return s;
    for (const [singular, plural] of one_off) {
        if (low.endsWith(singular.toLowerCase())) {
            const start = s.length - singular.length;
            const replacement = /^[A-Z]/.test(s.slice(start))
                ? plural.charAt(0).toUpperCase() + plural.slice(1) : plural;
            return s.slice(0, start) + replacement;
        }
    }

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
    /* src/objnam.c:627 — naming an object the hero can see observes it:
           if (!Blind && !gd.distantname) observe_object(obj);
       This is where a wished amulet's dknown comes from ("a cubical
       amulet", not "an amulet"). */
    if (!Blind() && !game.distantname)
        observe_object(obj);
    /* src/objnam.c:629. Priests know an object's beatitude on sight. */
    if (game.urole?.mnum === 'PM_CLERIC'
        || game.urole?.mnum === PMNAMES.PM_CLERIC)
        obj.bknown = 1;
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
    let pluralize = obj.quan !== 1;
    const dknown = obj.dknown;
    let buf = '';

    /* src/objnam.c:663, jump directly to the personal name once an artifact
       is fully known. The ordinary object type must not prefix it. */
    if (obj_is_pname(obj)) {
        buf = obj.oname;
        if (obj.oartifact && buf.startsWith('The '))
            buf = 'the ' + buf.slice(4);
        return /^the /i.test(buf) ? buf.slice(4) : buf;
    }

    switch (obj.oclass) {
    case COIN_CLASS:
    case CHAIN_CLASS:
        buf = actualn;
        break;
    case BALL_CLASS:
        buf = `${obj.owt > ocl.oc_weight ? 'very ' : ''}heavy iron ball`;
        break;
    case WEAPON_CLASS:
        if (obj.opoisoned) buf = 'poisoned ';
        /* FALLTHRU */
    case VENOM_CLASS:
    case TOOL_CLASS:
        if (obj.otyp === ONAMES.LENSES)
            buf = 'pair of ';
        else if (obj.otyp === ONAMES.TOWEL && obj.spe > 0)
            buf += obj.spe < 3 ? 'moist ' : 'wet ';
        buf += !dknown ? dn : nn ? actualn : un ? `${dn} called ${un}` : dn;
        if (obj.otyp === ONAMES.FIGURINE && ismnum(obj.corpsenm)) {
            const cgend = (obj.spe | 0) & (CORPSTAT_MALE | CORPSTAT_FEMALE);
            const mgend = cgend === CORPSTAT_MALE ? MALE
                         : cgend === CORPSTAT_FEMALE ? FEMALE : NEUTER;
            const mnam = pmname(game.mons[obj.corpsenm], mgend);
            buf += ` of ${just_an(mnam)}${mnam}`;
        } else if (obj.otyp === ONAMES.TOWEL && obj.spe > 0 && game.wizard)
            buf += ` (${obj.spe})`;
        break;
    case ARMOR_CLASS:
        if (ocl.oc_subtyp === ARM_BOOTS || ocl.oc_subtyp === ARM_GLOVES)
            buf = 'pair of ';
        else if (obj.otyp >= ONAMES.GRAY_DRAGON_SCALES
                 && obj.otyp <= ONAMES.YELLOW_DRAGON_SCALES)
            buf = 'set of ';
        buf += nn ? actualn : un ? `${dn} called ${un}` : dn;
        break;
    case POTION_CLASS:
        /* NOT obj_typename(): xname() omits the parenthesised appearance once
           the type is known, so it is "potion of extra healing", not
           "potion of extra healing (murky)". */
        if (obj.odiluted && dknown) buf = 'diluted ';
        buf += 'potion';
        if (dknown) {
            if (nn) {
                /* src/objnam.c:841 — known blessed/cursed water reads
                   "potion of holy/unholy water" */
                const holy = (obj.otyp === ONAMES.POT_WATER && obj.bknown
                              && (obj.blessed || obj.cursed))
                    ? (obj.blessed ? 'holy ' : 'unholy ') : '';
                buf += ` of ${holy}${actualn}`;
            } else if (un) buf += ` called ${un}`;
            else buf = `${obj.odiluted ? 'diluted ' : ''}${dn} potion`;
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
    case FOOD_CLASS: {
        if (obj.globby) {
            const size = obj.owt <= 100 ? 'small'
                       : obj.owt <= 300 ? 'medium'
                         : obj.owt <= 500 ? 'large' : 'very large';
            buf = `${size} ${actualn}`;
            break;
        }
        if (obj.otyp === ONAMES.SLIME_MOLD) {
            let fruit = game.ffruit;
            while (fruit && fruit.fid !== obj.spe)
                fruit = fruit.nextf;
            buf = fruit?.fname || 'fruit';
            if (pluralize) {
                buf = makeplural(makesingular(buf));
                pluralize = false;
            }
            break;
        }
        buf = actualn;
        /* src/objnam.c tin_details(): a tin names its contents once known */
        if (obj.otyp === ONAMES.TIN && obj.known)
            buf = tin_details(obj);
        break;
    }
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
        /* src/objnam.c:844 — a statue names the monster it depicts:
           "statue of a grid bug". The historic prefix needs an
           Archeologist; the unique/pname article refinements need those
           monsters to be turned to stone. next_boulder needs pushing. */
        if (obj.otyp === ONAMES.STATUE && obj.corpsenm >= 0) {
            const statue_pmname = game.mons?.[obj.corpsenm]?.pmnames?.[2]
                ?? game.mons?.[obj.corpsenm]?.pmnames?.[0] ?? 'monster';
            buf = `${actualn} of ${just_an(statue_pmname)}${statue_pmname}`;
        } else {
            buf = actualn; /* "boulder" or "statue" */
        }
        break;
    default:
        buf = obj_typename(obj.otyp);
        break;
    }

    if (pluralize)
        buf = makeplural(buf);

    /* src/objnam.c:998: a per-object name follows the ordinary type name.
       Artifact names use the same storage; undiscovered artifacts therefore
       read "a war hammer named Mjollnir", not "the Mjollnir". */
    if (has_oname(obj) && dknown) {
        let oname = obj.oname;
        if (obj.oartifact && oname.startsWith('The '))
            oname = 'the ' + oname.slice(4);
        buf += ` named ${oname}`;
    }
    if (/^the /i.test(buf))
        buf = buf.slice(4);
    return buf;
}

// src/eat.c tin_details() — " of <monster>" or " of spinach".
// src/objnam.c singular() — name one item of a stack.
/* include/obj.h — corpse_xname() flags */
export const CXN_NORMAL = 0, CXN_NOCORPSE = 1, CXN_PFX_THE = 2,
             CXN_ARTICLE = 4, CXN_NOARTICLE = 8, CXN_SINGULAR = 16;

// src/objnam.c:1121 the_unique_pm() — a unique monster that wants "the";
// one with a personal name wants neither article.
function the_unique_pm(ptr) {
    if (type_is_pname(ptr))
        return false;
    return (ptr.geno & MFLAGS.G_UNIQ) !== 0;
}

// src/objnam.c:1824 corpse_xname() — "<species> corpse", with the article and
// "the" handling C spells out for unique and personal-name monsters.
//
export function corpse_xname(otmp, adjective, cxn_flags) {
    const omndx = otmp.corpsenm;
    const the_prefix0 = (cxn_flags & CXN_PFX_THE) !== 0;
    const article = (cxn_flags & CXN_ARTICLE) !== 0;
    const omit_corpse = (cxn_flags & CXN_NOCORPSE) !== 0;
    const ignore_quan = (cxn_flags & CXN_SINGULAR) !== 0;
    let no_prefix = (cxn_flags & CXN_NOARTICLE) !== 0;
    let any_prefix = !no_prefix && article;
    let the_prefix = the_prefix0;

    const mdat = game.mons[omndx];
    /* src/do_name.c:1321 obj_pmname() — the corpse's own recorded gender
       picks the pmnames[] slot; CORPSTAT_GENDER lives in obj->spe. */
    const cgend = (otmp.spe | 0) & (CORPSTAT_MALE | CORPSTAT_FEMALE);
    const mgend = (cgend === CORPSTAT_MALE) ? MALE
                : (cgend === CORPSTAT_FEMALE) ? FEMALE
                : NEUTER;
    let mnam = mdat ? pmname(mdat, mgend) : 'thing';
    let possessive = false;

    if (mdat && (the_unique_pm(mdat) || type_is_pname(mdat))) {
        mnam = s_suffix(mnam);
        possessive = true;
        if (type_is_pname(mdat))
            no_prefix = true;
        else if (!no_prefix)
            the_prefix = true;
    }
    if (no_prefix)
        the_prefix = any_prefix = false;
    else if (the_prefix)
        any_prefix = false;             /* mutually exclusive */

    let nambuf = the_prefix ? 'the ' : '';

    if (!adjective || !adjective.trim()) {
        nambuf += mnam;                 /* normal case: newt corpse */
    } else {
        nambuf += possessive ? `${mnam} ${adjective.trim()}`
                             : `${adjective.trim()} ${mnam}`;
        /* doname() may pass a count as the adjective; then no article */
        if (/^\d/.test(adjective.trim()))
            any_prefix = false;
    }

    if (!omit_corpse) {
        nambuf += ' corpse';
        if (otmp.quan > 1 && !ignore_quan)
            nambuf += 's';
    }

    return any_prefix ? an(nambuf) : nambuf;
}

// src/objnam.c:1038 minimal_xname() — the object's plain type name, with the
// hero's own naming, discovery state and per-object details suppressed.
//
// C temporarily zeroes objects[otyp].oc_uname / oc_name_known, builds a bare
// obj on the stack and runs xname() over it; both the override and the restore
// are ported literally because xname() reads the shared objects[] entry.
export function minimal_xname(obj) {
    const otyp = obj.otyp;
    const ocl = game.objects[otyp];

    /* suppress user-supplied name */
    const save_uname = ocl.oc_uname;
    ocl.oc_uname = 0;
    /* suppress actual name if object's description is unknown */
    const save_name_known = ocl.oc_name_known;
    if (!obj.dknown)
        ocl.oc_name_known = 0;

    /* caveat: this makes a lot of assumptions about which fields are
       required in order for xname() to yield a sensible result */
    const bareobj = {
        otyp: otyp,
        oclass: obj.oclass,
        dknown: obj.dknown ? 1 : 0,
        /* suppress known except for amulets (needed for fakes and real
           A-of-Y); default is "on" for types which don't use it */
        known: (obj.oclass === OCLASSES.AMULET_CLASS)
            ? obj.known : !ocl.oc_uses_known,
        quan: 1,                        /* don't want plural */
        /* for a boulder, leave corpsenm as 0; non-zero produces
           "next boulder" */
        corpsenm: (otyp !== ONAMES.BOULDER) ? NON_PM : 0,
        spe: (obj.otyp === ONAMES.SLIME_MOLD) ? obj.spe : 0,
    };

    let bufp = xname(bareobj);
    /* undo forced setting of bareobj.blessed for cleric (priest[ess]) */
    if (bufp.startsWith('uncursed '))
        bufp = bufp.slice(9);

    ocl.oc_uname = save_uname;
    ocl.oc_name_known = save_name_known;
    return bufp;
}

// src/objnam.c simpleonames() — minimal_xname(), pluralised for a stack.
export function simpleonames(obj) {
    let simpleoname = minimal_xname(obj);

    if (obj.quan !== 1)
        simpleoname = makeplural(simpleoname);
    return simpleoname;
}

// src/objnam.c:2446 ansimpleoname(), minimal name with its article.
export function ansimpleoname(obj) {
    const simpleoname = simpleonames(obj);
    let otyp = obj.otyp;

    if (otyp === ONAMES.FAKE_AMULET_OF_YENDOR)
        otyp = ONAMES.AMULET_OF_YENDOR;
    const ocl = game.objects[otyp];
    if (ocl.oc_unique && OBJ_NAME(ocl) && simpleoname === OBJ_NAME(ocl))
        return the(simpleoname);
    return obj.quan === 1 ? an(simpleoname) : simpleoname;
}

// src/objnam.c:2474 thesimpleoname(): the shortest form used when a query
// cannot fit the normal object description.
export function thesimpleoname(obj) {
    return the(simpleonames(obj));
}

// src/objnam.c:2009 short_oname(): progressively shorten an object name to
// fit a query. User-supplied names are clipped first. If that is not enough,
// hide BUC, erosion-proofing, grease, and erosion details, then fall back to
// the caller's minimal formatter.
export function short_oname(obj, func, altfunc, lenlimit) {
    let out = func(obj);
    if (out.length <= lenlimit)
        return out;

    const ocl = game.objects[obj.otyp];
    const savedUname = ocl.oc_uname;
    const savedOname = obj.oname;
    const shortUname = (typeof savedUname === 'string'
                        && savedUname.length >= 12)
                       ? savedUname.slice(0, 8) + '...' : savedUname;
    const shortOname = (typeof savedOname === 'string'
                        && savedOname.length >= 12)
                       ? savedOname.slice(0, 8) + '...' : savedOname;

    if (shortUname !== savedUname) {
        ocl.oc_uname = shortUname;
        out = func(obj);
        ocl.oc_uname = savedUname;
        if (out.length <= lenlimit)
            return out;
    }
    if (shortOname !== savedOname) {
        obj.oname = shortOname;
        out = func(obj);
        obj.oname = savedOname;
        if (out.length <= lenlimit)
            return out;
    }
    if (shortUname !== savedUname && shortOname !== savedOname) {
        ocl.oc_uname = shortUname;
        obj.oname = shortOname;
        out = func(obj);
        ocl.oc_uname = savedUname;
        obj.oname = savedOname;
        if (out.length <= lenlimit)
            return out;
    }

    const saved = {
        bknown: obj.bknown, rknown: obj.rknown, greased: obj.greased,
        oeroded: obj.oeroded, oeroded2: obj.oeroded2,
    };
    ocl.oc_uname = shortUname;
    if (shortOname !== undefined)
        obj.oname = shortOname;
    obj.bknown = obj.rknown = obj.greased = 0;
    obj.oeroded = obj.oeroded2 = 0;
    out = func(obj);
    if (altfunc && out.length > lenlimit)
        out = altfunc(obj);
    Object.assign(obj, saved);
    ocl.oc_uname = savedUname;
    if (savedOname === undefined)
        delete obj.oname;
    else
        obj.oname = savedOname;
    return out;
}

// src/objnam.c:1924 cxname() — xname(), except a corpse names its monster.
export function cxname(obj) {
    if (obj.otyp === ONAMES.CORPSE)
        return corpse_xname(obj, null, CXN_NORMAL);
    return xname(obj);
}

// src/objnam.c:2244 aobjnam() — "<count> <cxname> <verb>", count omitted at 1.
export function aobjnam(otmp, verb) {
    let bp = cxname(otmp);

    if (otmp.quan !== 1)
        bp = `${otmp.quan} ` + bp;
    if (verb)
        bp += ' ' + otense(otmp, verb);
    return bp;
}

// src/objnam.c:2262 yobjnam() — yname + aobjnam, "your <count> <name> <verb>".
//
// C routes the prefix through shk_your(), whose shop-ownership, monster-
// ownership and unique-corpse arms are not reached by anything ported; the
// remaining arm is the_your[carried(obj)], which is what yname() already uses.
export function yobjnam(obj, verb) {
    const s = aobjnam(obj, verb);

    /* leave off "your" for most of your artifacts, but prepend "your" for
       unique objects and "foo of bar" quest artifacts */
    if (!carried(obj) || !obj_is_pname(obj)
        || obj.oartifact >= ART_ORB_OF_DETECTION)
        return `${carried(obj) ? 'your' : 'the'} ` + s;
    return s;
}

// src/objnam.c:2280 Yobjnam2() — yobjnam with the first letter capitalised.
export function Yobjnam2(obj, verb) {
    const s = yobjnam(obj, verb);
    return highc(s.charAt(0)) + s.slice(1);
}

// src/objnam.c:2290 Tobjnam() — like aobjnam, but "The" instead of a count.
export function Tobjnam(otmp, verb) {
    let bp = The(xname(otmp));

    if (verb)
        bp += ' ' + otense(otmp, verb);
    return bp;
}

// The CORPSE arm redirects xname to cxname for the monster type; corpses on
// this tree go through the same xname, so the redirect has nothing to change.
/* src/objnam.c yname() and src/shk.c shk_your(). */
// src/objnam.c:2378 Yname2() — capitalized variant of yname().
export function Yname2(obj) {
    const s = yname(obj);
    return s ? s[0].toUpperCase() + s.slice(1) : s;   /* *s = highc(*s) */
}

function shop_owner_prefix(obj) {
    const floorStock = obj.where === OBJ_FLOOR && !obj.no_charge;
    if (!obj.unpaid && !floorStock)
        return null;

    let x, y;
    if (obj.where === OBJ_FLOOR) {
        x = obj.ox;
        y = obj.oy;
    } else if (carried(obj)) {
        x = game.u.ux;
        y = game.u.uy;
    } else {
        return null;
    }

    const loc = game.level?.at(x, y);
    const roomno = loc?.roomno ?? 0;
    if (!loc || loc.edge || roomno < ROOMOFFSET)
        return null;
    const roomidx = roomno - ROOMOFFSET;
    const room = game.level?.rooms?.[roomidx]
        || (game.level?.subrooms || []).find(candidate =>
            candidate.roomnoidx === roomidx);
    const shkp = room?.resident;
    const eshk = shkp?.eshk || shkp?.mextra?.eshk;
    if (!shkp?.isshk || !eshk)
        return null;
    if (floorStock && eshk.shk?.x === x && eshk.shk?.y === y)
        return null;

    const raw = shkp.shknam || eshk.shknam;
    if (!raw)
        return null;
    const name = /^[-+_|=]/.test(raw) ? raw.slice(1) : raw;
    return s_suffix(name);
}

export function yname(obj) {
    const shopOwner = shop_owner_prefix(obj);
    if (shopOwner)
        return `${shopOwner} ${xname(obj)}`;
    if (obj.where === OBJ_MINVENT && obj.ocarry)
        return `${s_suffix(y_monnam(obj.ocarry))} ${xname(obj)}`;
    return `${carried(obj) ? 'your' : 'the'} ${xname(obj)}`;
}

/* src/objnam.c fruitname() — the hero's fruit, optionally as juice. */
export function fruitname(juice) {
    const pl_fruit = game.svp?.pl_fruit || 'slime mold';
    const i = pl_fruit.indexOf(' of ');
    const fruit_nam = (i >= 0) ? pl_fruit.slice(i + 4) : pl_fruit;
    return makesingular(fruit_nam) + (juice ? ' juice' : '');
}

/* src/decl.c:111 vowels[] */
const vowels = 'aeiouAEIOU';

/* include/hack.h highc() — uppercase a single character, unlike insight.js's
   string-level helper of the same name. */
const highc = (c) => (c >= 'a' && c <= 'z') ? c.toUpperCase() : c;

/* include/obj.h has_oname() */
const has_oname = (obj) => obj.oname != null;

// src/objnam.c:331 obj_is_pname() — is the object's name a proper name?
//
// Only the artifact arm can return TRUE. The complete identification check is
// important because it decides whether callers may reveal the proper name.
export function obj_is_pname(obj) {
    if (!obj.oartifact || !has_oname(obj))
        return false;
    if (!game.program_state_gameover && !game.iflags?.override_ID) {
        const ocl = game.objects[obj.otyp];
        if (!obj.known || !obj.dknown || !obj.bknown || !ocl.oc_name_known
            || (obj.oartifact && undiscovered_artifact(obj.oartifact)))
            return false;
        if ((!obj.cknown && (Is_container(obj) || obj.otyp === ONAMES.STATUE))
            || (!obj.lknown && Is_box(obj)))
            return false;
        if (!obj.rknown
            && (obj.oclass === ARMOR_CLASS || obj.oclass === WEAPON_CLASS
                || is_weptool(obj, game.objects))
            && is_damageable(obj))
            return false;
    }
    return true;
}

// src/objnam.c:1106 the_unique_obj() — is this THE Amulet (or another
// unique object the hero has identified)? The fake amulet lies while
// unknown.
function the_unique_obj(obj) {
    const known = obj.known;

    if (!obj.dknown)
        return false;
    else if (obj.otyp === ONAMES.FAKE_AMULET_OF_YENDOR && !known)
        return true; /* lie */
    else
        return !!(game.objects[obj.otyp].oc_unique
                  && (known || obj.otyp === ONAMES.AMULET_OF_YENDOR));
}

// src/artifact.c undiscovered_artifact(), C scans artidisco[].
function undiscovered_artifact(m) {
    return !(game.artidisco || []).includes(m);
}

// include/obj.h:421 is_plural()
//
// The artifact arm is C's: "the Eyes of the Overworld" are plural, but "a pair
// of lenses named the Eyes of the Overworld" is not.
function is_plural(o) {
    return o.quan !== 1
        || (o.oartifact === ART_EYES_OF_THE_OVERWORLD
            && !undiscovered_artifact(ART_EYES_OF_THE_OVERWORLD));
}

/* special_subjs[] is C's single table, shared by vtense() and makesingular();
   it is declared further down, next to makesingular's other word lists. */

// src/objnam.c:2531 otense() — the verb form to use if xname(otmp) were the
// subject. `verb` comes in plural (no trailing s), and is returned unchanged
// when xname(otmp) would itself be plural.
export function otense(otmp, verb) {
    if (!is_plural(otmp))
        return vtense(null, verb);
    return verb;
}

// src/objnam.c:2563 vtense() — present-tense 3rd person form of `verb` for
// `subj`. A null subj asks for the singular form directly, which is how
// otense() uses it.
export function vtense(subj, verb) {
    let sing = false;

    if (subj) {
        if (/^an? /i.test(subj)) {
            sing = true;
        } else {
            let spot = -1;
            for (let sp = subj.indexOf(' '); sp >= 0;
                 sp = subj.indexOf(' ', sp + 1)) {
                const rest = subj.slice(sp);
                if (/^ (?:of|from|called|named|labeled) /i.test(rest)) {
                    if (sp !== 0)
                        spot = sp - 1;
                    break;
                }
            }
            if (spot < 0)
                spot = subj.length - 1;

            /* plural: anything ending in 's', but not '*us' or '*ss', plus a
               few shapes makeplural() creates */
            const at = (i) => (i >= 0 && i < subj.length)
                ? subj.charAt(i).toLowerCase() : '';
            const tail = (from, n) =>
                (spot - from >= 0) ? subj.substr(spot - from, n).toLowerCase()
                                   : '';
            if ((at(spot) === 's' && spot !== 0 && !'us'.includes(at(spot - 1)))
                || tail(3, 4) === 'eeth' || tail(3, 4) === 'feet'
                || tail(1, 2) === 'ia' || tail(1, 2) === 'ae') {
                const len = spot + 1;
                for (const spec of special_subjs) {
                    const ltmp = spec.length;
                    if (len === ltmp
                        && spec.toLowerCase() === subj.slice(0, len).toLowerCase()) {
                        sing = true;
                        break;
                    }
                    /* also <prefix><space><special_subj>, to catch things
                       like "the invisible erinys" */
                    if (len > ltmp && subj.charAt(spot - ltmp) === ' '
                        && spec.toLowerCase()
                           === subj.substr(spot - ltmp + 1, ltmp).toLowerCase()) {
                        sing = true;
                        break;
                    }
                }
                if (!sing)
                    return verb;
            } else if (/^(?:they|you)$/i.test(subj)) {
                /* 3rd person plural lacks the telltale 's'; 2nd person
                   singular behaves as if plural */
                return verb;
            }
        }
    }

    /* sing: */
    const buf = verb;
    const len = buf.length;
    const last = buf.charAt(len - 1).toLowerCase();
    const prev = len >= 2 ? buf.charAt(len - 2).toLowerCase() : '';

    if (buf.toLowerCase() === 'are')
        return Strcasecpy(buf, 0, 'is');
    if (buf.toLowerCase() === 'have')
        return Strcasecpy(buf, len - 2, 's');
    if ('zxs'.includes(last)
        || (len >= 2 && last === 'h' && 'cs'.includes(prev))
        || (len === 2 && last === 'o'))
        /* ends in z, x, s, ch, sh; add an "es" */
        return Strcasecpy(buf, len, 'es');
    if (last === 'y' && !vowels.includes(prev))
        /* like the "y" case in makeplural */
        return Strcasecpy(buf, len - 1, 'ies');
    return Strcasecpy(buf, len, 's');
}

/* src/hacklib.c Strcasecpy() — overwrite buf from `at` with `repl`, matching
   the case of the character being replaced. C works on a char* in place; the
   JS equivalent rebuilds the string, and the case is taken from the character
   at `at` (or the one before it when appending past the end, which is what
   C's *bspot+1 writes look at). */
function Strcasecpy(buf, at, repl) {
    const model = buf.charAt(at < buf.length ? at : buf.length - 1);
    const upper = model >= 'A' && model <= 'Z';
    return buf.slice(0, at) + (upper ? repl.toUpperCase() : repl);
}

export function singular(otmp, func) {
    if (otmp.otyp === ONAMES.CORPSE && func === xname)
        func = cxname;
    const savequan = otmp.quan;
    otmp.quan = 1;
    const nam = func(otmp);
    otmp.quan = savequan;
    return nam;
}

function tin_details(obj) {
    if (obj.spe === 1)
        return 'tin of spinach';
    if (obj.corpsenm === undefined || obj.corpsenm < 0)
        return 'empty tin';

    let variety = obj.cursed ? 0
                : obj.spe < 0 ? -obj.spe - 1
                : rn2(tintxts.length - 1);
    const m = game.mons[obj.corpsenm];
    if (variety === 0
        && (obj.corpsenm === PMNAMES.PM_LIZARD
            || obj.corpsenm === PMNAMES.PM_LICHEN))
        variety = 1;

    const nm = m && (m.pmnames[2] ?? m.pmnames[0] ?? m.pmnames[1]);
    const contents = vegetarian(m) ? nm : `${nm} meat`;
    if ((obj.cknown || game.iflags?.override_ID) && obj.spe < 0) {
        if (variety === 0 || variety === 1)
            return `${tintxts[variety].txt} tin of ${contents}`;
        return `tin of ${tintxts[variety].txt} ${contents}`;
    }
    return `tin of ${contents}`;
}

// src/objnam.c:1063 doname_base()
//
// Builds a prefix (quantity or article, BUC, enchantment) and appends the
// worn/wielded suffixes. The BUC rule is the subtle one: with
// flags.implicit_uncursed on, "uncursed " is omitted for an item whose charge
// or enchantment is KNOWN and which is oc_charged — unless it is armour or a
// ring. That is why a +2 dart and an expensive camera show no BUC while a
// credit card and a food ration do.
/* include/obj.h:338 Is_box() */
const Is_box = (o) => o.otyp === ONAMES.LARGE_BOX || o.otyp === ONAMES.CHEST;

// src/objnam.c is_unpaid() plus unpaid_cost(..., COST_CONTENTS). A carried
// container's price suffix includes every billed object nested inside it.
function billed_cost(obj) {
    let price = 0;
    let found = false;
    for (const room of game.u.ushops || '') {
        const roomidx = room.charCodeAt(0) - ROOMOFFSET;
        const shoproom = game.level?.rooms?.[roomidx]
            || (game.level?.subrooms || [])
                .find(candidate => candidate.roomnoidx === roomidx);
        const shkp = shoproom?.resident;
        const bill = shkp?.eshk?.bill_p;
        const entry = Array.isArray(bill)
            ? bill.find(bp => bp.bo_id === obj.o_id) : null;
        if (entry) {
            price += entry.price * (obj.quan || 1);
            found = true;
            break;
        }
    }
    for (const contained of obj.cobj || []) {
        const nested = billed_cost(contained);
        price += nested.price;
        found ||= nested.found;
    }
    return { price, found };
}

export function doname(obj) {
    const ocl = game.objects[obj.otyp];
    let bp = xname(obj);
    /* xname() can update the object's observed and Priest-known flags. */
    const known = obj.known, bknown = obj.bknown, dknown = obj.dknown;
    let prefix = '';

    if (obj.quan !== 1)
        prefix = `${obj.quan} `;
    else if (obj.otyp === ONAMES.CORPSE)
        ;                              /* corpse_xname supplies the article */
    else if (obj_is_pname(obj) || the_unique_obj(obj))
        prefix = 'the ';               /* src/objnam.c:1292 */
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

    if (bknown && obj.oclass !== COIN_CLASS
        /* src/objnam.c:1319 — known holy/unholy water carries the state in
           its NAME, so the blessed/cursed prefix is suppressed */
        && (obj.otyp !== ONAMES.POT_WATER
            || !game.objects[ONAMES.POT_WATER].oc_name_known
            || (!obj.cursed && !obj.blessed))) {
        if (obj.cursed) prefix += 'cursed ';
        else if (obj.blessed) prefix += 'blessed ';
        else if (!game.flags.implicit_uncursed
                 /* src/objnam.c:1339 — the trailing terms of C's condition.
                    A Priest senses BUC innately, so "uncursed" is never
                    printed for one; the two Amulet types are also excluded.
                    Role_if(PM_CLERIC) is the role whose name is "Priest". */
                 || ((!known || !ocl.oc_charged
                      || obj.oclass === ARMOR_CLASS
                      || obj.oclass === RING_CLASS)
                     && obj.otyp !== ONAMES.FAKE_AMULET_OF_YENDOR
                     && obj.otyp !== ONAMES.AMULET_OF_YENDOR
                     && game.urole?.name?.m !== 'Priest'))
            prefix += 'uncursed ';
    }

    /* src/objnam.c:1358 — a box whose lock state is known says so. This
       runs after the BUC words and before greased, which is where C has it. */
    if (obj.lknown && Is_box(obj)) {
        if (obj.obroken)
            /* 3.6.0 used "unlockable" here but that could be misunderstood
               to mean "capable of being unlocked" rather than the intended
               "not capable of being locked" */
            prefix += 'broken ';
        else if (obj.olocked)
            prefix += 'locked ';
        else
            prefix += 'unlocked ';
    }

    if (obj.greased)
        prefix += 'greased ';

    /* src/objnam.c:1150 add_erosion_words — the eroded words come first:
       "very burnt", "thoroughly rusty", &c. (is_damageable gate: every
       reachable eroded item passes it, and !is_damageable items never
       gain oeroded bits in this port) */
    if (obj.oeroded) {
        prefix += (obj.oeroded === 2) ? 'very '
                  : (obj.oeroded === 3) ? 'thoroughly ' : '';
        prefix += is_rustprone(obj, game.objects) ? 'rusty '
                  : is_crackable(obj, game.objects) ? 'cracked '
                    : 'burnt ';
    }
    if (obj.oeroded2) {
        prefix += (obj.oeroded2 === 2) ? 'very '
                  : (obj.oeroded2 === 3) ? 'thoroughly ' : '';
        prefix += is_corrodeable(obj, game.objects) ? 'corroded '
                  : 'rotted ';
    }
    if (obj.rknown && obj.oerodeproof)
        prefix += is_rustprone(obj, game.objects) ? 'rustproof '
                  : is_corrodeable(obj, game.objects) ? 'corrodeproof '
                    : is_flammable(obj, game.objects) ? 'fireproof '
                      : is_crackable(obj, game.objects) ? 'tempered '
                        : is_rottable(obj, game.objects) ? 'rotproof '
                          : '';

    /* src/objnam.c:1373 -- once a container's contents are known, doname()
       reports the number of separate stacks it holds. */
    if (obj.cknown && obj.cobj?.length)
        bp += ` containing ${obj.cobj.length} item${plur(obj.cobj.length)}`;

    switch (is_weptool(obj, game.objects) ? WEAPON_CLASS : obj.oclass) {
    case AMULET_CLASS:
        if (obj.owornmask & W_AMUL)
            bp += ' (being worn)';
        break;
    case ARMOR_CLASS:
        if (obj.owornmask & W_ARMOR) {
            bp += ' (being worn)';
            /* src/objnam.c:1400. Slipperiness belongs to the hero, but C
               annotates the worn gloves so inventory and selection menus
               expose the condition. */
            if (obj === game.u?.uarmg && Glib())
                bp += '; slippery)';
        }
        /* FALLTHRU */
    case WEAPON_CLASS:
        if (known) prefix += `${obj.spe >= 0 ? '+' : ''}${obj.spe} `;
        break;
    case TOOL_CLASS:
        /* src/objnam.c:1486 — a worn tool (blindfold, lenses, towel) */
        if (obj.owornmask & W_TOOL)
            bp += ' (being worn)';
        if (obj.otyp === ONAMES.CANDELABRUM_OF_INVOCATION) {
            const suffix = `${plur(obj.spe)}${obj.lamplit ? ', lit' : ' attached'}`;
            bp += ` (${obj.spe} of 7 candle${suffix})`;
            break;
        }
        if (obj.otyp === ONAMES.OIL_LAMP || obj.otyp === ONAMES.MAGIC_LAMP
            || obj.otyp === ONAMES.BRASS_LANTERN || Is_candle(obj)) {
            if (Is_candle(obj)) {
                const fullBurnTime = 20 * game.objects[obj.otyp].oc_cost;
                let turnsLeft = obj.age || 0;
                if (obj.lamplit) {
                    const timer = (game.timer_base || []).find((candidate) =>
                        candidate.func_index === BURN_OBJECT
                        && candidate.arg === obj);
                    turnsLeft += Math.max(0, (timer?.timeout || game.moves)
                                             - (game.moves || 0));
                }
                if (turnsLeft < fullBurnTime)
                    prefix += 'partly used ';
            }
            if (obj.lamplit)
                bp += ' (lit)';
            break;
        }
        /* charged tools show "(0:n)" once the count is known */
        if (ocl.oc_charged && known)
            bp += ` (${obj.recharged || 0}:${obj.spe})`;
        break;
    case POTION_CLASS:
        if (obj.otyp === ONAMES.POT_OIL && obj.lamplit)
            bp += ' (lit)';
        break;
    case RING_CLASS:
        /* src/objnam.c:1494, use the current form's hand equivalent. */
        if (obj.owornmask & W_RINGR)
            bp += ` (on right ${body_part(HAND)})`;
        if (obj.owornmask & W_RINGL)
            bp += ` (on left ${body_part(HAND)})`;
        if (known && ocl.oc_charged)
            prefix += `${obj.spe >= 0 ? '+' : ''}${obj.spe} `;
        break;
    case WAND_CLASS:
        /* src/objnam.c:1483 — a wand always shows its charges once known;
           unlike tools there is no oc_charged gate. */
        if (known)
            bp += ` (${obj.recharged || 0}:${obj.spe})`;
        break;
    case FOOD_CLASS:
        if (obj.oeaten)
            prefix += 'partly eaten ';
        if (obj.otyp === ONAMES.CORPSE)
            prefix = corpse_xname(obj, prefix,
                                  (obj.quan !== 1 ? 0 : CXN_ARTICLE)
                                  | CXN_NOCORPSE) + ' ';
        break;
    case BALL_CLASS:
    case CHAIN_CLASS:
        if (obj.owornmask & (W_BALL | W_CHAIN))
            bp += ` (${obj.owornmask & W_BALL ? 'chained' : 'attached'} to you)`;
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
            /* src/objnam.c:1593 — while twoweaponing the primary reads
               "wielded in", matching the secondary's phrasing */
            const twoweap_primary = !!game.u.twoweap;
            bp += ` (${twoweap_primary ? 'wielded in' : 'weapon in'} ${hand_s})`;
        }
    }
    if (obj.owornmask & W_SWAPWEP) {
        /* src/objnam.c:1615 — the off hand while twoweaponing */
        if (game.u.twoweap)
            bp += ` (wielded in ${
                ((game.u.uhandedness ?? 0) === 0) ? 'left' : 'right'} hand)`;
        else
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

    /* src/objnam.c:1654: carried shop stock shows the price stored when it
       was added to the current shopkeeper's bill. */
    const billed = obj.unpaid || Has_contents(obj)
        ? billed_cost(obj) : { price: 0, found: false };
    if (!game.iflags?.suppress_price && (obj.unpaid || billed.found)) {
        bp += ` (${obj.unpaid ? 'unpaid' : 'contents'}, ${billed.price} ${currency(billed.price)})`;
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

/* C string helpers used throughout the wish parser. strncmpi/strcmpi
   return 0 on a match the way the C library calls do, so conditions keep
   the C's `!strncmpi(...)` shape. BSTRCMPI/BSTRNCMPI are the bounds-safe
   tail-compare macros from include/global.h; `ptr` is an index into base
   and may be negative. */
const strncmpi = (s, t, n) =>
    (s.slice(0, n).toLowerCase() === t.slice(0, n).toLowerCase()) ? 0 : 1;
const strcmpi = (s, t) => (s.toLowerCase() === t.toLowerCase()) ? 0 : 1;
const BSTRCMPI = (base, ptr, str) =>
    strcmpi(base.slice(Math.max(ptr, 0)), str);
const BSTRNCMPI = (base, ptr, str, num) =>
    strncmpi(base.slice(Math.max(ptr, 0)), str, num);
const digit = (c) => c >= '0' && c <= '9';
/* C atoi(): optional sign then digits; anything else scores 0 */
const atoi = (s) => {
    const m = /^[+-]?\d+/.exec(s);
    return m ? parseInt(m[0], 10) : 0;
};

// src/objnam.c:3243 wishymatch() — to a wishing player, "@$%^&*" is the same
// as a dagger, so long as it's the right length.
function wishymatch(u_str, o_str, retry_inverted) {
    const detect_SP = 'detect ', SP_detection = ' detection';
    let p, buf;

    /* ignore spaces & hyphens and upper/lower case when comparing */
    if (fuzzymatch(u_str, o_str, ' -', true))
        return true;

    if (retry_inverted) {
        /* when just one of the strings is in the form "foo of bar",
           convert it into "bar foo" and perform another comparison */
        const u_of = strstri(u_str, ' of ');
        const o_of = strstri(o_str, ' of ');
        if (u_of >= 0 && o_of < 0) {
            buf = u_str.slice(u_of + 4) + ' ' + u_str.slice(0, u_of);
            if (fuzzymatch(buf, o_str, ' -', true))
                return true;
        } else if (o_of >= 0 && u_of < 0) {
            buf = o_str.slice(o_of + 4) + ' ' + o_str.slice(0, o_of);
            if (fuzzymatch(u_str, buf, ' -', true))
                return true;
        }
    }

    /* [note: if something like "elven speed boots" ever gets added, these
       special cases should be changed to call wishymatch() recursively in
       order to get the "of" inversion handling] */
    if (o_str.startsWith('dwarvish ')) {
        if (!strncmpi(u_str, 'dwarven ', 8))
            return fuzzymatch(u_str.slice(8), o_str.slice(9), ' -', true);
    } else if (o_str.startsWith('elven ')) {
        if (!strncmpi(u_str, 'elvish ', 7))
            return fuzzymatch(u_str.slice(7), o_str.slice(6), ' -', true);
        else if (!strncmpi(u_str, 'elfin ', 6))
            return fuzzymatch(u_str.slice(6), o_str.slice(6), ' -', true);
    } else if (strstri(o_str, 'helm') >= 0 && strstri(u_str, 'helmet') >= 0) {
        buf = strsubst(u_str, 'helmet', 'helm');
        return wishymatch(buf, o_str, true);
    } else if (strstri(o_str, 'gauntlets') >= 0
               && strstri(u_str, 'gloves') >= 0) {
        buf = strsubst(u_str, 'gloves', 'gauntlets');
        return wishymatch(buf, o_str, true);
    } else if (o_str.startsWith(detect_SP)) {
        /* check for "detect <foo>" vs "<foo> detection" */
        if ((p = strstri(u_str, SP_detection)) >= 0
            && !u_str[p + SP_detection.length]) {
            /* convert "<foo> detection" into "detect <foo>" */
            buf = detect_SP + u_str.slice(0, p);
            /* "detect monster" -> "detect monsters" */
            if (!strcmpi(u_str.slice(0, p), 'monster'))
                buf += 's';
            return fuzzymatch(buf, o_str, ' -', true);
        }
    } else if (strstri(o_str, SP_detection) >= 0) {
        /* and the inverse, "<foo> detection" vs "detect <foo>" */
        if (!strncmpi(u_str, detect_SP, detect_SP.length)) {
            /* convert "detect <foo>s" into "<foo> detection" */
            buf = makesingular(u_str.slice(detect_SP.length)) + SP_detection;
            return fuzzymatch(buf, o_str, ' -', true);
        }
    } else if (strstri(o_str, 'ability') >= 0) {
        /* catch "{potion(s),ring} of {gain,restore,sustain} abilities" */
        if ((p = strstri(u_str, 'abilities')) >= 0
            && !u_str[p + 'abilities'.length]) {
            buf = u_str.slice(0, p) + 'ability';
            return fuzzymatch(buf, o_str, ' -', true);
        }
    } else if (o_str === 'aluminum') {
        /* this special case doesn't really fit anywhere else... */
        /* (note that " wand" will have been stripped off by now) */
        if (!strcmpi(u_str, 'aluminium'))
            return fuzzymatch(u_str.slice(9), o_str.slice(8), ' -', true);
    }

    return false;
}

/* src/objnam.c:3344 o_ranges[] — wishable subranges of objects */
const o_ranges = () => [
    { name: 'bag', oclass: TOOL_CLASS,
      f_o_range: ONAMES.SACK, l_o_range: ONAMES.BAG_OF_TRICKS },
    { name: 'lamp', oclass: TOOL_CLASS,
      f_o_range: ONAMES.OIL_LAMP, l_o_range: ONAMES.MAGIC_LAMP },
    { name: 'candle', oclass: TOOL_CLASS,
      f_o_range: ONAMES.TALLOW_CANDLE, l_o_range: ONAMES.WAX_CANDLE },
    { name: 'horn', oclass: TOOL_CLASS,
      f_o_range: ONAMES.TOOLED_HORN, l_o_range: ONAMES.HORN_OF_PLENTY },
    { name: 'shield', oclass: ARMOR_CLASS,
      f_o_range: ONAMES.SMALL_SHIELD,
      l_o_range: ONAMES.SHIELD_OF_REFLECTION },
    { name: 'hat', oclass: ARMOR_CLASS,
      f_o_range: ONAMES.FEDORA, l_o_range: ONAMES.DUNCE_CAP },
    { name: 'helm', oclass: ARMOR_CLASS,
      f_o_range: ONAMES.ELVEN_LEATHER_HELM,
      l_o_range: ONAMES.HELM_OF_TELEPATHY },
    { name: 'gloves', oclass: ARMOR_CLASS,
      f_o_range: ONAMES.LEATHER_GLOVES,
      l_o_range: ONAMES.GAUNTLETS_OF_DEXTERITY },
    { name: 'gauntlets', oclass: ARMOR_CLASS,
      f_o_range: ONAMES.LEATHER_GLOVES,
      l_o_range: ONAMES.GAUNTLETS_OF_DEXTERITY },
    { name: 'boots', oclass: ARMOR_CLASS,
      f_o_range: ONAMES.LOW_BOOTS, l_o_range: ONAMES.LEVITATION_BOOTS },
    { name: 'shoes', oclass: ARMOR_CLASS,
      f_o_range: ONAMES.LOW_BOOTS, l_o_range: ONAMES.IRON_SHOES },
    { name: 'cloak', oclass: ARMOR_CLASS,
      f_o_range: ONAMES.MUMMY_WRAPPING,
      l_o_range: ONAMES.CLOAK_OF_DISPLACEMENT },
    { name: 'shirt', oclass: ARMOR_CLASS,
      f_o_range: ONAMES.HAWAIIAN_SHIRT, l_o_range: ONAMES.T_SHIRT },
    { name: 'dragon scales', oclass: ARMOR_CLASS,
      f_o_range: ONAMES.GRAY_DRAGON_SCALES,
      l_o_range: ONAMES.YELLOW_DRAGON_SCALES },
    { name: 'dragon scale mail', oclass: ARMOR_CLASS,
      f_o_range: ONAMES.GRAY_DRAGON_SCALE_MAIL,
      l_o_range: ONAMES.YELLOW_DRAGON_SCALE_MAIL },
    { name: 'sword', oclass: WEAPON_CLASS,
      f_o_range: ONAMES.SHORT_SWORD, l_o_range: ONAMES.KATANA },
    { name: 'venom', oclass: VENOM_CLASS,
      f_o_range: ONAMES.BLINDING_VENOM, l_o_range: ONAMES.ACID_VENOM },
    { name: 'gray stone', oclass: GEM_CLASS,
      f_o_range: ONAMES.LUCKSTONE, l_o_range: ONAMES.FLINT },
    { name: 'grey stone', oclass: GEM_CLASS,
      f_o_range: ONAMES.LUCKSTONE, l_o_range: ONAMES.FLINT },
];

// src/objnam.c:3437 rnd_otyp_by_wpnskill()
function rnd_otyp_by_wpnskill(skill) {
    const objects = game.objects;
    let i, n = 0;
    let otyp = ONAMES.STRANGE_OBJECT;

    for (i = game.bases[WEAPON_CLASS];
         i < NUM_OBJECTS && objects[i].oc_class === WEAPON_CLASS; i++)
        if (objects[i].oc_skill === skill) {
            n++;
            otyp = i;
        }
    if (n > 0) {
        n = rn2(n);
        for (i = game.bases[WEAPON_CLASS];
             i < NUM_OBJECTS && objects[i].oc_class === WEAPON_CLASS; i++)
            if (objects[i].oc_skill === skill)
                if (--n < 0)
                    return i;
    }
    return otyp;
}

// src/objnam.c:3455 rnd_otyp_by_namedesc()
export function rnd_otyp_by_namedesc(name, oclass, xtra_prob) {
    if (!name)
        return ONAMES.STRANGE_OBJECT;

    const objects = game.objects;
    const validobjs = [];
    let zn, of;
    let lo, hi, prob, maxprob = 0;

    /* only skip "foo of" for "foo of bar" if target doesn't contain " of " */
    const check_of = (strstri(name, ' of ') < 0);
    const minglob = ONAMES.GLOB_OF_GRAY_OOZE;
    const maxglob = ONAMES.GLOB_OF_BLACK_PUDDING;

    if (oclass) {
        lo = game.bases[oclass];
        hi = game.bases[oclass + 1] - 1;
    } else {
        lo = MAXOCLASSES; /* STRANGE_OBJECT + 1; */
        hi = NUM_OBJECTS - 1;
    }
    for (let i = lo; i <= hi; ++i) {
        /* don't match extra descriptions (w/o real name) */
        if ((zn = OBJ_NAME(objects[i])) == null)
            continue;
        if (wishymatch(name, zn, true) /* objects[] name */
            /* let "<bar>" match "<foo> of <bar>" (already does if foo is
               an object class, but this is for lump of royal jelly,
               clove of garlic, bag of tricks, &c) with a few exceptions:
               for "opening", don't match "bell of opening"; for monster
               type ooze/pudding/slime don't match glob of same since that
               ought to match "corpse/egg/figurine of type" too but won't */
            || (check_of
                && i !== ONAMES.BELL_OF_OPENING
                && (i < minglob || i > maxglob)
                && (of = strstri(zn, ' of ')) >= 0
                && wishymatch(name, zn.slice(of + 4), false)) /* partial name */
            || ((zn = OBJ_DESCR(objects[i])) != null
                && wishymatch(name, zn, false)) /* objects[] description */
            /* "cloth" should match "piece of cloth"; there's only one
               description containing " of " so no special case handling */
            || (zn && check_of && (of = strstri(zn, ' of ')) >= 0
                && wishymatch(name, zn.slice(of + 4), false))
            /* the generated table stores 0, not NULL, for an absent uname */
            || ((zn = objects[i].oc_uname || null) != null
                && wishymatch(name, zn, false)) /* user-called name */
            ) {
            validobjs.push(i);
            maxprob += ((objects[i].oc_prob || 0) + xtra_prob);
        }
    }

    if (validobjs.length > 0 && maxprob) {
        prob = rn2(maxprob);
        let i;
        for (i = 0; i < validobjs.length - 1; i++)
            if ((prob -= ((objects[validobjs[i]].oc_prob || 0) + xtra_prob))
                < 0)
                break;
        return validobjs[i];
    }
    return ONAMES.STRANGE_OBJECT;
}

/* src/objnam.c:3376 spellings[] — alternate spellings; if the difference is
   only the presence or absence of spaces and/or hyphens (such as "pickaxe"
   vs "pick axe" vs "pick-axe") then there is no need for inclusion in this
   list; likewise for ``"of" inversions'' ("boots of speed" vs "speed boots") */
const spellings = [
    ['pickax', 'PICK_AXE'],
    ['whip', 'BULLWHIP'],
    ['saber', 'SILVER_SABER'],
    ['silver sabre', 'SILVER_SABER'],
    ['smooth shield', 'SHIELD_OF_REFLECTION'],
    ['grey dragon scale mail', 'GRAY_DRAGON_SCALE_MAIL'],
    ['grey dragon scales', 'GRAY_DRAGON_SCALES'],
    ['iron ball', 'HEAVY_IRON_BALL'],
    ['lantern', 'BRASS_LANTERN'],
    ['mattock', 'DWARVISH_MATTOCK'],
    ['amulet of poison resistance', 'AMULET_VERSUS_POISON'],
    ['amulet of protection', 'AMULET_OF_GUARDING'],
    ['amulet of telepathy', 'AMULET_OF_ESP'],
    ['helm of esp', 'HELM_OF_TELEPATHY'],
    ['gauntlets of ogre power', 'GAUNTLETS_OF_POWER'],
    ['gauntlets of giant strength', 'GAUNTLETS_OF_POWER'],
    ['elven chain mail', 'ELVEN_MITHRIL_COAT'],
    ['silver shield', 'SHIELD_OF_REFLECTION'],
    ['potion of sleep', 'POT_SLEEPING'],
    ['scroll of recharging', 'SCR_CHARGING'],
    ['recharging', 'SCR_CHARGING'],
    ['stone', 'ROCK'],
    ['camera', 'EXPENSIVE_CAMERA'],
    ['tee shirt', 'T_SHIRT'],
    ['can', 'TIN'],
    ['can opener', 'TIN_OPENER'],
    ['kelp', 'KELP_FROND'],
    ['eucalyptus', 'EUCALYPTUS_LEAF'],
    ['lembas', 'LEMBAS_WAFER'],
    ['tripe', 'TRIPE_RATION'],
    ['cookie', 'FORTUNE_COOKIE'],
    ['pie', 'CREAM_PIE'],
    ['huge meatball', 'ENORMOUS_MEATBALL'], /* likely conflated name */
    ['huge chunk of meat', 'ENORMOUS_MEATBALL'], /* original name */
    ['marker', 'MAGIC_MARKER'],
    ['hook', 'GRAPPLING_HOOK'],
    ['grappling iron', 'GRAPPLING_HOOK'],
    ['grapnel', 'GRAPPLING_HOOK'],
    ['grapple', 'GRAPPLING_HOOK'],
    ['protection from shape shifters', 'RIN_PROTECTION_FROM_SHAPE_CHAN'],
    ['accuracy', 'RIN_INCREASE_ACCURACY'],
    /* if we ever add other sizes, move this to o_ranges[] with "bag" */
    ['box', 'LARGE_BOX'],
    /* normally we wouldn't have to worry about unnecessary <space>, but
       " stone" will get stripped off, preventing a wishymatch; that actually
       lets "flint stone" be a match, so we also accept bogus "flintstone" */
    ['luck stone', 'LUCKSTONE'],
    ['load stone', 'LOADSTONE'],
    ['touch stone', 'TOUCHSTONE'],
    ['flintstone', 'FLINT'],
];

/* src/objnam.c:2517 wrp[]/wrpsym[] — the wishable class words */
const wrp = ['wand', 'ring', 'potion', 'scroll', 'gem',
             'amulet', 'spellbook', 'spell book',
             /* for non-specific wishes */
             'weapon', 'armor', 'tool', 'food', 'comestible'];
const wrpsym = () => [OCLASSES.WAND_CLASS, OCLASSES.RING_CLASS,
    OCLASSES.POTION_CLASS, OCLASSES.SCROLL_CLASS, OCLASSES.GEM_CLASS,
    OCLASSES.AMULET_CLASS, OCLASSES.SPBOOK_CLASS, OCLASSES.SPBOOK_CLASS,
    OCLASSES.WEAPON_CLASS, OCLASSES.ARMOR_CLASS, OCLASSES.TOOL_CLASS,
    OCLASSES.FOOD_CLASS, OCLASSES.FOOD_CLASS];

/* src/objnam.c:3928 — tin contents states local to readobjnam */
const TIN_UNDEFINED = 0, TIN_EMPTY = 1, TIN_SPINACH = 2;
/* include/onames.h NUM_GLASS_GEMS */
const NUM_GLASS_GEMS =
    ONAMES.LAST_GLASS_GEM - ONAMES.FIRST_GLASS_GEM + 1;

// src/objnam.c:3933 readobjnam_init()
//
// C keeps bp and origbp as pointers into one mutable char buffer. The port
// keeps d.bp as the text from the bp pointer to the terminator and d.pfx as
// the characters bp has advanced past, so origbp's view of the buffer is
// d.pfx + d.bp for as long as bp stays inside it; when the glob arm repoints
// bp at globbuf the origbp view is frozen. The postparse3 pointer-equality
// guards (`d->dn != d->actualn`, `d->origbp != d->actualn`) are carried by
// the d.dn_is_actualn / d.actualn_is_bp aliasing flags set exactly where the
// C assigns the pointers to one another.
function readobjnam_init(bp, d) {
    d.otmp = null;
    d.cnt = d.spe = d.spesgn = d.typ = 0;
    d.very = d.rechrg = d.blessed = d.uncursed = d.iscursed
        = d.ispoisoned = d.isgreased = d.eroded = d.eroded2
        = d.erodeproof = d.halfeaten = d.islit = d.unlabeled
        = d.ishistoric = d.isdiluted /* statues, potions */
          /* box/chest and wizard mode door */
        = d.trapped = d.locked = d.unlocked = d.broken
        = d.open = d.closed = d.doorless /* wizard mode door */
        = d.looted /* wizard mode fountain/sink/throne/tree and grave */
        = d.real = d.fake = 0; /* Amulet */
    d.tvariety = RANDOM_TIN;
    d.mgend = -1; /* not specified, aka random */
    d.mntmp = NON_PM;
    d.contents = TIN_UNDEFINED;
    d.oclass = 0;
    d.actualn = d.dn = d.un = null;
    d.wetness = 0;
    d.gsize = 0;
    d.zombify = false;
    d.bp = bp;
    d.p = 0;
    d.name = null;
    d.ftype = game.context.current_fruit ?? 1;
    d.globbuf = '';
    d.fruitbuf = '';
    d.tmp = 0;
    d.tinv = 0;
    /* pointer-emulation state (see the function comment) */
    d.pfx = '';
    d.bp_in_orig = true;
    d.origbp_frozen = null;
    d.dn_is_actualn = false;
    d.actualn_is_bp = false;
}

/* d->origbp's current view of the wish buffer */
function origbp_str(d) {
    return d.bp_in_orig ? d.pfx + d.bp : d.origbp_frozen;
}

/* return 1 if d->bp is empty or contains only various qualifiers like
   "blessed", "rustproof", and so on, or 0 if anything else is present */
// src/objnam.c:3966 readobjnam_preparse()
function readobjnam_preparse(d) {
    let save_bp = false, save_pfx = '', save_consumed = '';
    let more_l = 0, res = 1;
    let l;

    /* d->bp += n, with the origbp/save_bp pointer bookkeeping */
    const advance = (n) => {
        if (n > 0) {
            const eaten = d.bp.slice(0, n);
            d.pfx += eaten;
            if (save_bp)
                save_consumed += eaten;
            d.bp = d.bp.slice(n);
        }
    };

    for (;;) {
        if (!d.bp)
            break;
        res = 0;

        if (!strncmpi(d.bp, 'an ', l = 3) || !strncmpi(d.bp, 'a ', l = 2)) {
            d.cnt = 1;
        } else if (!strncmpi(d.bp, 'the ', l = 4)) {
            ; /* just increment `bp' by `l' below */
        } else if (!d.cnt && digit(d.bp[0]) && d.bp !== '0') {
            d.cnt = atoi(d.bp);
            while (digit(d.bp[0]))
                advance(1);
            while (d.bp[0] === ' ')
                advance(1);
            l = 0;
        } else if (d.bp[0] === '+' || d.bp[0] === '-') {
            d.spesgn = (d.bp[0] === '+') ? 1 : -1;
            advance(1);
            d.spe = atoi(d.bp);
            while (digit(d.bp[0]))
                advance(1);
            while (d.bp[0] === ' ')
                advance(1);
            l = 0;
        } else if (!strncmpi(d.bp, 'blessed ', l = 8)
                   || !strncmpi(d.bp, 'holy ', l = 5)) {
            d.blessed = 1, d.uncursed = d.iscursed = 0;
        } else if (!strncmpi(d.bp, 'cursed ', l = 7)
                   || !strncmpi(d.bp, 'unholy ', l = 7)) {
            d.iscursed = 1, d.blessed = d.uncursed = 0;
        } else if (!strncmpi(d.bp, 'uncursed ', l = 9)) {
            d.uncursed = 1, d.blessed = d.iscursed = 0;
        } else if (!strncmpi(d.bp, 'rustproof ', l = 10)
                   || !strncmpi(d.bp, 'erodeproof ', l = 11)
                   || !strncmpi(d.bp, 'corrodeproof ', l = 13)
                   || !strncmpi(d.bp, 'fixed ', l = 6)
                   || !strncmpi(d.bp, 'fireproof ', l = 10)
                   || !strncmpi(d.bp, 'rotproof ', l = 9)
                   || !strncmpi(d.bp, 'tempered ', l = 9)
                   || !strncmpi(d.bp, 'crackproof ', l = 11)) {
            d.erodeproof = 1;
        } else if (!strncmpi(d.bp, 'lit ', l = 4)
                   || !strncmpi(d.bp, 'burning ', l = 8)) {
            d.islit = 1;
        } else if (!strncmpi(d.bp, 'unlit ', l = 6)
                   || !strncmpi(d.bp, 'extinguished ', l = 13)) {
            d.islit = 0;

        /* "wet" and "moist" are only applicable for towels */
        } else if (!strncmpi(d.bp, 'moist ', l = 6)
                   || !strncmpi(d.bp, 'wet ', l = 4)) {
            if (!strncmpi(d.bp, 'wet ', 4))
                d.wetness = 3 + rn2(3); /* 3..5 */
            else
                d.wetness = rnd(2); /* 1..2 */

        /* "unlabeled" and "blank" are synonymous */
        } else if (!strncmpi(d.bp, 'unlabeled ', l = 10)
                   || !strncmpi(d.bp, 'unlabelled ', l = 11)
                   || !strncmpi(d.bp, 'blank ', l = 6)) {
            d.unlabeled = 1;
        } else if (!strncmpi(d.bp, 'poisoned ', l = 9)) {
            d.ispoisoned = 1;

        /* "trapped" recognized but not honored outside wizard mode */
        } else if (!strncmpi(d.bp, 'trapped ', l = 8)) {
            d.trapped = 0; /* undo any previous "untrapped" */
            if (game.wizard)
                d.trapped = 1;
        } else if (!strncmpi(d.bp, 'untrapped ', l = 10)) {
            d.trapped = 2; /* not trapped */

        /* locked, unlocked, broken: box/chest lock states, also door states;
           open, closed, doorless: additional door states */
        } else if (!strncmpi(d.bp, 'locked ', l = 7)) {
            d.locked = d.closed = 1,
                d.unlocked = d.broken = d.open = d.doorless = 0;
        } else if (!strncmpi(d.bp, 'unlocked ', l = 9)) {
            d.unlocked = d.closed = 1,
                d.locked = d.broken = d.open = d.doorless = 0;
        } else if (!strncmpi(d.bp, 'broken ', l = 7)) {
            d.broken = 1,
                d.locked = d.unlocked = d.open = d.closed
                = d.doorless = 0;
        } else if (!strncmpi(d.bp, 'open ', l = 5)) {
            d.open = 1,
                d.closed = d.locked = d.broken = d.doorless = 0;
        } else if (!strncmpi(d.bp, 'closed ', l = 7)) {
            d.closed = 1,
                d.open = d.locked = d.broken = d.doorless = 0;
        } else if (!strncmpi(d.bp, 'doorless ', l = 9)) {
            d.doorless = 1,
                d.open = d.closed = d.locked = d.unlocked = d.broken = 0;
        /* looted: fountain/sink/throne/tree; disturbed: grave */
        } else if (!strncmpi(d.bp, 'looted ', l = 7)
                   /* overload disturbed grave with looted fountain here
                      even though they're separate in struct rm */
                   || !strncmpi(d.bp, 'disturbed ', l = 10)) {
            d.looted = 1;
        } else if (!strncmpi(d.bp, 'greased ', l = 8)) {
            d.isgreased = 1;
        } else if (!strncmpi(d.bp, 'zombifying ', l = 11)) {
            d.zombify = true;
        } else if (!strncmpi(d.bp, 'very ', l = 5)) {
            /* very rusted very heavy iron ball */
            d.very = 1;
        } else if (!strncmpi(d.bp, 'thoroughly ', l = 11)) {
            d.very = 2;
        } else if (!strncmpi(d.bp, 'rusty ', l = 6)
                   || !strncmpi(d.bp, 'rusted ', l = 7)
                   || !strncmpi(d.bp, 'burnt ', l = 6)
                   || !strncmpi(d.bp, 'burned ', l = 7)
                   || !strncmpi(d.bp, 'cracked ', l = 8)) {
            d.eroded = 1 + d.very;
            d.very = 0;
        } else if (!strncmpi(d.bp, 'corroded ', l = 9)
                   || !strncmpi(d.bp, 'rotted ', l = 7)) {
            d.eroded2 = 1 + d.very;
            d.very = 0;
        } else if (!strncmpi(d.bp, 'partly eaten ', l = 13)
                   || !strncmpi(d.bp, 'partially eaten ', l = 16)) {
            d.halfeaten = 1;
        } else if (!strncmpi(d.bp, 'historic ', l = 9)) {
            d.ishistoric = 1;
        } else if (!strncmpi(d.bp, 'diluted ', l = 8)) {
            d.isdiluted = 1;
        } else if (!strncmpi(d.bp, 'empty ', l = 6)) {
            d.contents = TIN_EMPTY;
        } else if (!strncmpi(d.bp, 'small ', l = 6)) { /* glob sizes */
            /* "small" might be part of monster name (mimic, if wishing
               for its corpse) rather than prefix for glob size; when
               used for globs, it might be either "small glob of <foo>" or
               "small <foo> glob" and user might add 's' even though plural
               doesn't accomplish anything because globs don't stack */
            if (strncmpi(d.bp.slice(l), 'glob', 4)
                && strstri(d.bp.slice(l), ' glob') < 0)
                break;
            d.gsize = 1;
        } else if (!strncmpi(d.bp, 'medium ', l = 7)) {
            /* 5.0: "medium" is an explicit part of the name for combined
               globs of at least 5 individual ones */
            d.gsize = 2;
        } else if (!strncmpi(d.bp, 'large ', l = 6)) {
            /* "large" might be part of monster name (dog, cat, kobold,
               mimic) or object name (box, round shield) rather than
               prefix for glob size */
            if (strncmpi(d.bp.slice(l), 'glob', 4)
                && strstri(d.bp.slice(l), ' glob') < 0)
                break;
            /* "very large " had "very " peeled off on previous iteration */
            d.gsize = (d.very !== 1) ? 3 : 4;
        } else if (!strncmpi(d.bp, 'real ', l = 5)) {
            /* accept "real Amulet of Yendor" with "blessed" or "cursed"
               or useless "erodeproof" before or after "real" ... */
            d.real = 1; /* don't negate 'fake' here */
        } else if (!strncmpi(d.bp, 'fake ', l = 5)) {
            /* ... and "fake Amulet of Yendor" likewise */
            d.fake = 1, d.real = 0;
        } else if (!strncmpi(d.bp, 'female ', l = 7)) {
            d.mgend = FEMALE;
            /* if after "corpse/statue/figurine of", remove from string */
            if (save_bp)
                d.bp = strsubst(d.bp, 'female ', ''), l = 0;
        } else if (!strncmpi(d.bp, 'male ', l = 5)) {
            d.mgend = MALE;
            if (save_bp)
                d.bp = strsubst(d.bp, 'male ', ''), l = 0;
        } else if (!strncmpi(d.bp, 'neuter ', l = 7)) {
            d.mgend = NEUTRAL;
            if (save_bp)
                d.bp = strsubst(d.bp, 'neuter ', ''), l = 0;

        /*
         * Corpse/statue/figurine gender hack:  in order to accept
         * "statue of a female gnome ruler" for gnome queen we need
         * to recognize and skip over "statue of [a ]".
         */
        } else if ((!strncmpi(d.bp, 'corpse ', l = 7)
                    || !strncmpi(d.bp, 'statue ', l = 7)
                    || !strncmpi(d.bp, 'figurine ', l = 9))
                   && !strncmpi(d.bp.slice(l), 'of ', more_l = 3)) {
            /* save_bp = d->bp — we'll backtrack to here later */
            save_bp = true, save_pfx = d.pfx, save_consumed = '';
            l += more_l, more_l = 0;
            if (!strncmpi(d.bp.slice(l), 'a ', more_l = 2)
                || !strncmpi(d.bp.slice(l), 'an ', more_l = 3)
                || !strncmpi(d.bp.slice(l), 'the ', more_l = 4))
                l += more_l;
        } else {
            break;
        }
        advance(l);
    }
    if (save_bp) {
        /* d->bp = save_bp */
        d.bp = save_consumed + d.bp;
        d.pfx = save_pfx;
    }
    return res;
}

// src/objnam.c:4176 readobjnam_parse_charges()
function readobjnam_parse_charges(d) {
    let par;

    if (d.bp.length > 1 && (par = d.bp.lastIndexOf('(')) >= 0) {
        let keeptrailingchars = true;
        let idx = 0;

        if (par > 0 && d.bp[par - 1] === ' ')
            idx = -1;
        const s = d.bp;
        let head = s.slice(0, par + idx); /* terminate bp */
        let p = par + 1; /* advance past '(' */
        if (!strncmpi(s.slice(p), 'lit)', 4)) {
            d.islit = 1;
            p += 4 - 1; /* point at ')' */
        } else {
            d.spe = atoi(s.slice(p));
            while (digit(s[p]))
                p++;
            if (s[p] === ':') {
                p++;
                d.rechrg = d.spe;
                d.spe = atoi(s.slice(p));
                while (digit(s[p]))
                    p++;
            }
            if (s[p] !== ')') {
                d.spe = d.rechrg = 0;
                /* mis-matched parentheses; rest of string will be ignored */
                keeptrailingchars = false;
            } else {
                d.spesgn = 1;
            }
        }
        if (keeptrailingchars) {
            /* 'p' points at ')'; copy what follows onto the end of bp */
            head += s.slice(p + 1);
        }
        d.bp = head;
    }
    /*
     * otmp->spe is type schar, so we don't want spe to be any bigger or
     * smaller.  Also, spe should always be positive --some cheaters may
     * try to confuse atoi().
     */
    if (d.spe < 0) {
        d.spesgn = -1; /* cheaters get what they deserve */
        d.spe = Math.abs(d.spe);
    }
    /* cap on obj->spe is independent of (and less than) SCHAR_LIM */
    if (d.spe > SPE_LIM)
        d.spe = SPE_LIM; /* slime mold uses d.ftype, so not affected */
    if (d.rechrg < 0 || d.rechrg > 7)
        d.rechrg = 7; /* recharge_limit */
}

// src/objnam.c:4240 readobjnam_postparse1()
function readobjnam_postparse1(d) {
    let i, p;

    /* now we have the actual name, as delivered by xname, say
     *  green potions called whisky
     *  scrolls labeled "QWERTY"
     *  egg
     *  fortune cookies
     *  very heavy iron ball named hoei
     *  wand of wishing
     *  elven cloak
     */
    if ((p = strstri(d.bp, ' named ')) >= 0) {
        /* note: if 'name' is too long, oname() will truncate it */
        d.name = d.bp.slice(p + 7);
        d.bp = d.bp.slice(0, p); /* *d->p = 0 */
    }
    if ((p = strstri(d.bp, ' called ')) >= 0) {
        /* note: if 'un' is too long, obj lookup just won't match anything */
        d.un = d.bp.slice(p + 8);
        d.bp = d.bp.slice(0, p);
        /* "helmet called telepathy" is not "helmet" (a specific type)
         * "shield called reflection" is not "shield" (a general type)
         */
        const ranges = o_ranges();
        for (i = 0; i < ranges.length; i++)
            if (!strcmpi(d.bp, ranges[i].name)) {
                d.oclass = ranges[i].oclass;
                return 1; /*goto srch;*/
            }
    }
    if ((p = strstri(d.bp, ' labeled ')) >= 0) {
        d.dn = d.bp.slice(p + 9);
        d.bp = d.bp.slice(0, p);
    } else if ((p = strstri(d.bp, ' labelled ')) >= 0) {
        d.dn = d.bp.slice(p + 10);
        d.bp = d.bp.slice(0, p);
    }
    if ((p = strstri(d.bp, ' of spinach')) >= 0) {
        d.bp = d.bp.slice(0, p);
        d.contents = TIN_SPINACH;
    }
    /* real vs fake is only useful for wizard mode but we'll accept its
       parsing in normal play (result is never real Amulet for that case) */
    if ((p = strstri(d.bp, OBJ_DESCR(game.objects[ONAMES.AMULET_OF_YENDOR])))
            >= 0
        && (p === 0 || d.bp[p - 1] === ' ')) {
        let s = 0;

        /* "Amulet of Yendor" matches two items, name of real Amulet
           and description of fake one; "real" and "fake" are parsed
           above with other prefixes; also accept partial specification
           of the full name of the fake; unlike the prefix recognition
           loop above, these have to be in the right order when more
           than one is present (similar to worthless glass gems below) */
        if (!strncmpi(d.bp, 'cheap ', 6))
            d.fake = 1, s += 6;
        if (!strncmpi(d.bp.slice(s), 'plastic ', 8))
            d.fake = 1, s += 8;
        if (!strncmpi(d.bp.slice(s), 'imitation ', 10))
            d.fake = 1, s += 10;
        /* when 'fake' is True, it overrides 'real' if both were given;
           when it is False, force 'real' whether that was specified or not */
        d.real = !d.fake ? 1 : 0;
        d.typ = d.real ? ONAMES.AMULET_OF_YENDOR
                       : ONAMES.FAKE_AMULET_OF_YENDOR;
        return 2; /*goto typfnd;*/
    }

    /*
     * Skip over "pair of ", "pairs of", "set of" and "sets of".
     */
    if (!strncmpi(d.bp, 'pair of ', 8)) {
        d.pfx += d.bp.slice(0, 8), d.bp = d.bp.slice(8); /* d->bp += 8 */
        d.cnt *= 2;
    } else if (!strncmpi(d.bp, 'pairs of ', 9)) {
        d.pfx += d.bp.slice(0, 9), d.bp = d.bp.slice(9);
        if (d.cnt > 1)
            d.cnt *= 2;
    } else if (!strncmpi(d.bp, 'set of ', 7)) {
        d.pfx += d.bp.slice(0, 7), d.bp = d.bp.slice(7);
    } else if (!strncmpi(d.bp, 'sets of ', 8)) {
        d.pfx += d.bp.slice(0, 8), d.bp = d.bp.slice(8);
    }

    /* Intercept pudding globs here; they're a valid wish target,
     * but we need them to not get treated like a corpse.
     * If a count is specified, it will be used to magnify weight
     * rather than to specify quantity (which is always 1 for globs).
     */
    i = d.bp.length;
    d.p = -1; /* d->p = (char *) 0; */
    let pg = -1;
    /* check for "glob", "<foo> glob", and "glob of <foo>" */
    if (!strcmpi(d.bp, 'glob') || !BSTRCMPI(d.bp, i - 5, ' glob')
        || !strcmpi(d.bp, 'globs')
        || !BSTRCMPI(d.bp, i - 6, ' globs')
        || (pg = strstri(d.bp, 'glob of ')) >= 0
        || (pg = strstri(d.bp, 'globs of ')) >= 0) {
        /* name_to_mon(mondata.c) is name_to_monplus with no remainder */
        d.mntmp = name_to_monplus(
            pg < 0 ? d.bp
                   : d.bp.slice(pg + strstri(d.bp.slice(pg), ' of ') + 4),
            null, null);
        /* if we didn't recognize monster type, pick a valid one at random */
        if (d.mntmp === NON_PM)
            d.mntmp = rn1(PMNAMES.PM_BLACK_PUDDING - PMNAMES.PM_GRAY_OOZE,
                          PMNAMES.PM_GRAY_OOZE);
        /* normally this would be done when makesingular() changes the value
           but canonical form here is already singular so that won't happen */
        if (d.cnt < 2 && strstri(d.bp, 'globs') >= 0)
            d.cnt = 2; /* affects otmp->owt but not otmp->quan for globs */
        d.globbuf = 'glob of ' + game.mons[d.mntmp].pmnames[NEUTRAL];
        /* d->bp = d->globbuf — bp leaves the original buffer */
        d.origbp_frozen = origbp_str(d);
        d.bp_in_orig = false;
        d.bp = d.globbuf;
        d.mntmp = NON_PM; /* not useful for "glob of <foo>" object lookup */
        d.oclass = FOOD_CLASS;
        d.actualn = d.bp, d.dn = null;
        d.actualn_is_bp = true;
        d.dn_is_actualn = false;
        return 1; /*goto srch;*/
    } else {
        /*
         * Find corpse type using "of" (figurine of an orc, tin of orc meat)
         * Don't check if it's a wand or spellbook.
         * (avoid "wand/finger of death" confusion).
         * Don't match "ogre" or "giant" monster name inside alternate item
         * names "gauntlets of ogre power" and "gauntlets of giant strength"
         * (or the alternate spelling of those, "gloves of ...").
         */
        if (strstri(d.bp, 'wand ') < 0 && strstri(d.bp, 'spellbook ') < 0
            && strstri(d.bp, 'gauntlets ') < 0 && strstri(d.bp, 'gloves ') < 0
            && strstri(d.bp, 'finger ') < 0) {
            if ((p = strstri(d.bp, 'tin of ')) >= 0) {
                if (!strcmpi(d.bp.slice(p + 7), 'spinach')) {
                    d.contents = TIN_SPINACH;
                    d.mntmp = NON_PM;
                } else {
                    const tinv = { v: d.tinv };
                    d.tmp = tin_variety_txt(d.bp.slice(p + 7), tinv);
                    d.tinv = tinv.v;
                    d.tvariety = d.tinv;
                    const mg = { v: d.mgend };
                    d.mntmp = name_to_monplus(d.bp.slice(p + 7 + d.tmp),
                                              null, mg);
                    d.mgend = mg.v;
                }
                d.typ = ONAMES.TIN;
                return 2; /*goto typfnd;*/
            } else if ((p = strstri(d.bp, ' of ')) >= 0) {
                const mg = { v: d.mgend };
                d.mntmp = name_to_monplus(d.bp.slice(p + 4), null, mg);
                d.mgend = mg.v;
                if (d.mntmp >= LOW_PM)
                    d.bp = d.bp.slice(0, p); /* *d->p = 0 */
            }
        }
    }
    /* Find corpse type w/o "of" (red dragon scale mail, yeti corpse) */
    if (strncmpi(d.bp, 'samurai sword', 13)  /* not the "samurai" monster! */
        && strncmpi(d.bp, 'wizard lock', 11) /* not the "wizard" monster! */
        && strncmpi(d.bp, 'death wand', 10)  /* 'of inversion', not Rider */
        && strncmpi(d.bp, 'master key', 10)  /* not the "master" rank */
        && strncmpi(d.bp, 'ninja-to', 8)     /* not the "ninja" rank */
        && strncmpi(d.bp, 'magenta', 7)) {   /* not the "mage" rank */
        if (d.mntmp < LOW_PM && d.bp.length > 2) {
            const rest_box = {}, mg = { v: d.mgend };
            const m = name_to_monplus(d.bp, rest_box, mg);
            d.mgend = mg.v;
            if ((d.mntmp = m) >= LOW_PM) {
                const obp = d.bp;
                let rest_at = rest_box.at;

                /* 'rest' is a pointer past the matching portion */
                d.bp = obp.slice(rest_at); /* d->bp = (char *) rest */

                if (d.bp[0] === ' ') {
                    d.bp = d.bp.slice(1);
                } else if (!strncmpi(d.bp, 's ', 2)
                           /* d->bp > d->origbp is satisfied whenever a
                              monster name matched (rest_at > 0) */
                           || !strncmpi(obp.slice(rest_at - 1), "s' ", 3)) {
                    d.bp = d.bp.slice(2);
                } else if (!strncmpi(d.bp, 'es ', 3)
                           || !strncmpi(d.bp, "'s ", 3)) {
                    d.bp = d.bp.slice(3);
                } else if (!d.bp && !d.actualn && !d.dn && !d.un
                           && !d.oclass) {
                    /* no referent; they don't really mean a monster type */
                    d.bp = obp;
                    d.mntmp = NON_PM;
                }
                /* record whatever bp advanced past into the origbp view */
                if (obp.length > d.bp.length)
                    d.pfx += obp.slice(0, obp.length - d.bp.length);
            }
        }
    }

    /* first change to singular if necessary */
    if (d.bp
        /* we want "tricks" to match "bag of tricks" [rnd_otyp_by_namedesc()]
           but that wouldn't work if it gets singularized to "trick" */
        && strcmpi(d.bp, 'tricks')
        /* an odd potential wish; fail rather than get a false match with
           "cloth" because it might yield a "cloth spellbook" rather than
           a "piece of cloth" cloak [maybe we should give random armor?] */
        && strcmpi(d.bp, 'clothes')
        ) {
        const sng = makesingular(d.bp);

        if (d.bp !== sng) {          /* strcmp() */
            if (d.cnt === 1)
                d.cnt = 2;
            d.bp = sng;              /* Strcpy(d->bp, sng) — in place */
        }
    }

    /* Alternate spellings (pick-ax, silver sabre, &c) */
    {
        for (const [sp, ob] of spellings) {
            if (wishymatch(d.bp, sp, true)) {
                d.typ = ONAMES[ob];
                return 2; /*goto typfnd;*/
            }
        }
        /* can't use spellings list for this one due to shuffling */
        if (!strncmpi(d.bp, 'grey spell', 10))
            d.bp = d.bp.slice(0, 2) + 'a' + d.bp.slice(3);

        if ((p = strstri(d.bp, 'armour')) >= 0) {
            /* skip past "armo", then copy remainder beyond "u" */
            d.bp = d.bp.slice(0, p + 4) + d.bp.slice(p + 5);
        }
    }

    /* dragon scales - assumes order of dragons */
    if (!strcmpi(d.bp, 'scales') && d.mntmp >= PMNAMES.PM_GRAY_DRAGON
        && d.mntmp <= PMNAMES.PM_YELLOW_DRAGON) {
        d.typ = ONAMES.GRAY_DRAGON_SCALES + d.mntmp - PMNAMES.PM_GRAY_DRAGON;
        d.mntmp = NON_PM; /* no monster */
        return 2; /*goto typfnd;*/
    }

    d.p = d.bp.length; /* d->p = eos(d->bp); */
    if (!BSTRCMPI(d.bp, d.p - 10, 'holy water')) {
        /* this isn't needed for "[un]holy water" because adjective parsing
           handles holy==blessed and unholy==cursed and leaves "water" for
           the object type, but it is needed for "potion of [un]holy water"
           since that parsing stops when it reaches "potion" */
        if (!BSTRNCMPI(d.bp, d.p - 10 - 2, 'un', 2))
            d.iscursed = 1, d.blessed = d.uncursed = 0; /* unholy water */
        else
            d.blessed = 1, d.iscursed = d.uncursed = 0; /* holy water */
        d.typ = ONAMES.POT_WATER;
        return 2; /*goto typfnd;*/
    }
    /* accept "paperback" or "paperback book", reject "paperback spellbook" */
    if (!strncmpi(d.bp, 'paperback', 9)) {
        const dbp = d.bp.slice(9); /* just past "paperback" */

        if (!dbp || !strncmpi(dbp, ' book', 5)) {
            d.typ = ONAMES.SPE_NOVEL;
            return 2; /*goto typfnd;*/
        } else {
            d.otmp = null;
            return 3;
        }
    }
    if (d.unlabeled && !BSTRCMPI(d.bp, d.p - 6, 'scroll')) {
        d.typ = ONAMES.SCR_BLANK_PAPER;
        return 2; /*goto typfnd;*/
    }
    if (d.unlabeled && !BSTRCMPI(d.bp, d.p - 9, 'spellbook')) {
        d.typ = ONAMES.SPE_BLANK_PAPER;
        return 2; /*goto typfnd;*/
    }
    /* specific food rather than color of gem/potion/spellbook[/scales] */
    if (!BSTRCMPI(d.bp, d.p - 6, 'orange') && d.mntmp === NON_PM) {
        d.typ = ONAMES.ORANGE;
        return 2; /*goto typfnd;*/
    }
    /*
     * NOTE: Gold pieces are handled as objects nowadays ...
     */
    if (!BSTRCMPI(d.bp, d.p - 10, 'gold piece')
        || !BSTRCMPI(d.bp, d.p - 7, 'zorkmid')
        || !strcmpi(d.bp, 'gold') || !strcmpi(d.bp, 'money')
        || !strcmpi(d.bp, 'coin') || d.bp[0] === GOLD_SYM) {
        if (d.cnt > 5000 && !game.wizard)
            d.cnt = 5000;
        else if (d.cnt < 1)
            d.cnt = 1;
        d.otmp = mksobj(ONAMES.GOLD_PIECE, false, false);
        d.otmp.quan = d.cnt;
        d.otmp.owt = weight(d.otmp);
        (game.disp ||= {}).botl = true;
        return 3; /*return otmp;*/
    }

    /* check for single character object class code ("/" for wand, &c) */
    if (d.bp.length === 1
        && (i = def_char_to_objclass(d.bp[0])) < MAXOCLASSES
        && i > ILLOBJ_CLASS && (i !== VENOM_CLASS || game.wizard)) {
        d.oclass = i;
        return 4; /*goto any;*/
    }

    /* Search for class names: XXXXX potion, scroll of XXXXX.
       Avoid false hits on, e.g., rings for "ring mail". */
    if (strncmpi(d.bp, 'enchant ', 8)
        && strncmpi(d.bp, 'destroy ', 8)
        && strncmpi(d.bp, 'detect food', 11)
        && strncmpi(d.bp, 'food detection', 14)
        && strncmpi(d.bp, 'ring mail', 9)
        && strncmpi(d.bp, 'studded leather armor', 21)
        && strncmpi(d.bp, 'leather armor', 13)
        && strncmpi(d.bp, 'tooled horn', 11)
        && strncmpi(d.bp, 'food ration', 11)
        && strncmpi(d.bp, 'meat ring', 9)) {
        const syms = wrpsym();
        for (i = 0; i < syms.length; i++) {
            const j = wrp[i].length;

            /* check for "<class> [ of ] something" */
            if (!strncmpi(d.bp, wrp[i], j)) {
                d.oclass = syms[i];
                if (d.oclass !== AMULET_CLASS) {
                    d.pfx += d.bp.slice(0, j); /* d->bp += j */
                    d.bp = d.bp.slice(j);
                    if (!strncmpi(d.bp, ' of ', 4))
                        d.actualn = d.bp.slice(4);
                    /* else if(*bp) ?? */
                } else {
                    d.actualn = d.bp;
                    d.actualn_is_bp = true;
                }
                return 1; /*goto srch;*/
            }
            /* check for "something <class>" */
            if (!BSTRCMPI(d.bp, d.p - j, wrp[i])) {
                d.oclass = syms[i];
                /* for "foo amulet", leave the class name so that
                   wishymatch() can do "of inversion" to try matching
                   "amulet of foo"; other classes don't include their
                   class name in their full object names */
                if (d.oclass !== AMULET_CLASS) {
                    d.p -= j;
                    d.bp = d.bp.slice(0, d.p); /* *d->p = '\0' */
                    if (d.p > 0 && d.bp[d.p - 1] === ' ')
                        d.bp = d.bp.slice(0, d.p - 1);
                } else {
                    let k, l;
                    let amubuf;

                    /* amulet without "of"; convoluted wording but better a
                       special case that's handled than one that's missing */
                    if (!strncmpi(d.bp, 'versus poison ', 14)) {
                        d.typ = ONAMES.AMULET_VERSUS_POISON;
                        return 2; /*goto typfnd;*/
                    }
                    /* check for "<shape> amulet"; strip off trailing
                       " amulet" for that w/o changing contents of d->bp */
                    l = d.bp.length - j;
                    if (l > 0 && d.bp[l - 1] === ' ')
                        l -= 1;
                    amubuf = d.bp.slice(0, Math.max(l, 0));
                    k = rnd_otyp_by_namedesc(amubuf, AMULET_CLASS, 0);
                    if (k !== ONAMES.STRANGE_OBJECT) {
                        d.typ = k;
                        return 2; /*goto typfnd;*/
                    }
                }
                d.actualn = d.dn = d.bp;
                d.actualn_is_bp = true;
                d.dn_is_actualn = true;
                return 1; /*goto srch;*/
            }
        }
    }

    /* Wishing in wizard mode can create traps and furniture.
     * Part I:  distinguish between trap and object for the two
     * types of traps which have corresponding objects:  bear trap
     * and land mine.  To get an armed trap instead of a disarmed object,
     * the player can prefix either the object name or the trap
     * name with "trapped ", or append something--anything at all except
     * for " object", but " trap" is suggested--to either the trap
     * name or the object name.
     */
    if (game.wizard && (!strncmpi(d.bp, 'bear', 4)
                        || !strncmpi(d.bp, 'land', 4))) {
        const beartrap = (d.bp[0].toLowerCase() === 'b');
        let zp = 4; /* skip "bear"/"land" */

        if (d.bp[zp] === ' ')
            ++zp; /* embedded space is optional */
        if (!strncmpi(d.bp.slice(zp), beartrap ? 'trap' : 'mine', 4)) {
            zp += 4;
            if (d.trapped === 2 || !strcmpi(d.bp.slice(zp), ' object')) {
                /* "untrapped <foo>" or "<foo> object" */
                d.typ = beartrap ? ONAMES.BEARTRAP : ONAMES.LAND_MINE;
                return 2; /*goto typfnd;*/
            } else if (d.trapped === 1 || d.bp[zp] !== undefined) {
                /* "trapped <foo>" or "<foo> trap" (actually "<foo>*");
                   Strcpy(d->bp, trapname(...)) feeds wizterrainwish, which
                   is not ported (see readobjnam) */
                return 5; /*goto wiztrap;*/
            }
            /* [no prefix or suffix; we're going to end up matching
               the object name and getting a disarmed trap object] */
        }
    }

    return 0;
}

// src/objnam.c:4666 readobjnam_postparse2()
function readobjnam_postparse2(d) {
    let i;

    /* "grey stone" check must be before general "stone" */
    const ranges = o_ranges();
    for (i = 0; i < ranges.length; i++)
        if (!strcmpi(d.bp, ranges[i].name)) {
            d.typ = rnd_class(ranges[i].f_o_range, ranges[i].l_o_range);
            return 2; /*goto typfnd;*/
        }

    if (!BSTRCMPI(d.bp, d.p - 6, ' stone')
        || !BSTRCMPI(d.bp, d.p - 4, ' gem')) {
        /* d->p[!strcmpi(d->p - 4, " gem") ? -4 : -6] = '\0' */
        d.bp = d.bp.slice(0,
                          d.p - (!strcmpi(d.bp.slice(Math.max(d.p - 4, 0)),
                                          ' gem') ? 4 : 6));
        d.oclass = GEM_CLASS;
        d.dn = d.actualn = d.bp;
        d.actualn_is_bp = true;
        d.dn_is_actualn = true;
        return 1; /*goto srch;*/
    } else if (!strcmpi(d.bp, 'looking glass')) {
        ; /* avoid false hit on "* glass" */
    } else if (!BSTRCMPI(d.bp, d.p - 6, ' glass')
               || !strcmpi(d.bp, 'glass')) {
        let s = 0; /* char *s = d->bp */

        /* treat "broken glass" as a non-existent item; since "broken" is
           also a chest/box prefix it might have been stripped off above */
        if (d.broken || strstri(d.bp, 'broken') >= 0) {
            d.otmp = null;
            return 3; /* return otmp */
        }
        if (!strncmpi(d.bp, 'worthless ', 10))
            s += 10;
        if (!strncmpi(d.bp.slice(s), 'piece of ', 9))
            s += 9;
        if (!strncmpi(d.bp.slice(s), 'colored ', 8))
            s += 8;
        else if (!strncmpi(d.bp.slice(s), 'coloured ', 9))
            s += 9;
        if (!strcmpi(d.bp.slice(s), 'glass')) { /* choose random color */
            /* 9 different kinds */
            d.typ = ONAMES.FIRST_GLASS_GEM + rn2(NUM_GLASS_GEMS);
            if (game.objects[d.typ].oc_class === GEM_CLASS)
                return 2; /*goto typfnd;*/
            else
                d.typ = 0; /* somebody changed objects[]? punt */
        } else { /* try to construct canonical form */
            d.bp = 'worthless piece of ' + d.bp.slice(s);
        }
    }

    d.actualn = d.bp;
    d.actualn_is_bp = true;
    if (!d.dn) {
        d.dn = d.actualn; /* ex. "skull cap" */
        d.dn_is_actualn = true;
    }

    return 0;
}

// src/objnam.c:4727 readobjnam_postparse3()
function readobjnam_postparse3(d) {
    let i, zn;

    /* check real names of gems first */
    if (!d.oclass && d.actualn) {
        for (i = game.bases[GEM_CLASS]; i <= ONAMES.LAST_REAL_GEM; i++) {
            if ((zn = OBJ_NAME(game.objects[i])) != null
                && !strcmpi(d.actualn, zn)) {
                d.typ = i;
                return 2; /*goto typfnd;*/
            }
        }
        /* "tin of foo" would be caught above, but plain "tin" has
           a random chance of yielding "tin wand" unless we do this */
        if (!strcmpi(d.actualn, 'tin')) {
            d.typ = ONAMES.TIN;
            return 2; /*goto typfnd;*/
        }
    }

    if (((d.typ = rnd_otyp_by_namedesc(d.actualn, d.oclass, 1))
         !== ONAMES.STRANGE_OBJECT)
        || (!d.dn_is_actualn /* d->dn != d->actualn */
            && ((d.typ = rnd_otyp_by_namedesc(d.dn, d.oclass, 1))
                !== ONAMES.STRANGE_OBJECT))
        || ((d.typ = rnd_otyp_by_namedesc(d.un, d.oclass, 1))
            !== ONAMES.STRANGE_OBJECT)
        || (!(d.actualn_is_bp && d.bp_in_orig && d.pfx === '')
            /* d->origbp != d->actualn */
            && ((d.typ = rnd_otyp_by_namedesc(origbp_str(d), d.oclass, 1))
                !== ONAMES.STRANGE_OBJECT)))
        return 2; /*goto typfnd;*/
    d.typ = 0;

    if (d.actualn) {
        for (const [key, jname] of Object.entries(Japanese_items)) {
            if (!strcmpi(d.actualn, jname)) {
                d.typ = ONAMES[key];
                return 2; /*goto typfnd;*/
            }
        }
    }
    /* if we've stripped off "armor" and failed to match anything
       in objects[], append "mail" and try again to catch misnamed
       requests like "plate armor" and "yellow dragon scale armor" */
    if (d.oclass === ARMOR_CLASS && strstri(d.bp, 'mail') < 0) {
        /* modifying bp's string is ok; we're about to resort
           to random armor if this also fails to match anything.
           [in C the Strcat also grows what actualn/origbp see through the
           shared buffer; postparse2 reassigns them from bp before any
           further read, so separate strings match its behavior] */
        d.bp = d.bp + ' mail';
        return 6; /*goto retry;*/
    }
    if (!strcmpi(d.bp, 'spinach')) {
        d.contents = TIN_SPINACH;
        d.typ = ONAMES.TIN;
        return 2; /*goto typfnd;*/
    }
    /* Fruits must not mess up the ability to wish for real objects (since
     * you can leave a fruit in a bones file and it will be added to
     * another person's game), so they must be checked for last, after
     * stripping all the possible prefixes and seeing if there's a real
     * name in there.  So we have to save the full original name.
     */
    /* Note: not strcmpi.  2 fruits, one capital, one not, are possible.
       Also not strncmp. */
    {
        let fp = d.fruitbuf;
        let l, cntf;
        let blessedf, iscursedf, uncursedf, halfeatenf;

        blessedf = iscursedf = uncursedf = halfeatenf = 0;
        cntf = 0;

        for (;;) {
            if (!fp)
                break;
            if (!strncmpi(fp, 'an ', l = 3) || !strncmpi(fp, 'a ', l = 2)) {
                cntf = 1;
            } else if (!cntf && digit(fp[0])) {
                cntf = atoi(fp);
                while (digit(fp[0]))
                    fp = fp.slice(1);
                while (fp[0] === ' ')
                    fp = fp.slice(1);
                l = 0;
            } else if (!strncmpi(fp, 'blessed ', l = 8)) {
                blessedf = 1;
            } else if (!strncmpi(fp, 'cursed ', l = 7)) {
                iscursedf = 1;
            } else if (!strncmpi(fp, 'uncursed ', l = 9)) {
                uncursedf = 1;
            } else if (!strncmpi(fp, 'partly eaten ', l = 13)
                       || !strncmpi(fp, 'partially eaten ', l = 16)) {
                halfeatenf = 1;
            } else
                break;
            fp = fp.slice(l);
        }

        for (let f = game.ffruit; f; f = f.nextf) {
            /* match type: 0=none, 1=exact, 2=singular, 3=plural */
            let ftyp = 0;

            if (fp === f.fname)
                ftyp = 1;
            else if (fp === makesingular(f.fname))
                ftyp = 2;
            else if (fp === makeplural(f.fname))
                ftyp = 3;
            if (ftyp) {
                d.typ = ONAMES.SLIME_MOLD;
                d.blessed = blessedf;
                d.iscursed = iscursedf;
                d.uncursed = uncursedf;
                d.halfeaten = halfeatenf;
                /* adjust count if user explicitly asked for
                   singular amount or for plural amount */
                if (ftyp === 2 && !cntf)
                    cntf = 1;
                else if (ftyp === 3 && !cntf)
                    cntf = 2;
                d.cnt = cntf;
                d.ftype = f.fid;
                return 2; /*goto typfnd;*/
            }
        }
    }

    if (!d.oclass && d.actualn) {
        /* Perhaps it's an artifact specified by name, not type */
        const objtyp = { v: 0 };
        d.name = artifact_name(d.actualn, objtyp, true);
        if (d.name) {
            d.typ = objtyp.v;
            return 2; /*goto typfnd;*/
        }
    }

    /* got a class, but not specific type;
       check alternate spellings of items with matching classes */
    if (d.oclass && !d.typ) {
        for (const [sp, ob] of spellings) {
            if (game.objects[ONAMES[ob]].oc_class === d.oclass
                && wishymatch(d.bp, sp, true)) {
                d.typ = ONAMES[ob];
                return 2; /*goto typfnd;*/
            }
        }
    }

    return 0;
}

// src/objnam.c:3554 wizterrainwish(), debug wishes for named traps.
// Furniture and direct terrain replacement remain separate unported paths.
async function wiztrapwish(d) {
    const { trapname } = await import('./trap.js');
    const { maketrap } = await import('./mklev.js');
    const { Can_fall_thru } = await import('./dungeon.js');
    const wanted = d.bp.toLowerCase();

    for (let typ = NO_TRAP + 1; typ < TRAPNUM; ++typ) {
        let actual = typ;
        let name = trapname(typ, true);
        if (!wanted.startsWith(name.toLowerCase()))
            continue;
        if (is_hole(actual) && !Can_fall_thru(game.u.uz))
            actual = ROCKTRAP;
        const trap = maketrap(game.u.ux, game.u.uy, actual);
        if (trap) {
            name = trapname(trap.ttyp, true);
            await pline(`${An(name)}${trap.ttyp === MAGIC_PORTAL
                ? ' to nowhere' : ''}.`);
        } else {
            await pline(`Creation of ${an(name)} failed.`);
        }
        return hands_obj;
    }
    return null;
}

// src/objnam.c:3554 wizterrainwish(), sink, altar, wall, and regular-door arms.
async function wizterrainwish(d) {
    const x = game.u.ux, y = game.u.uy;
    const lev = game.level?.at(x, y);
    const wanted = d.bp.toLowerCase();
    if (!lev)
        return null;
    const oldtyp = lev.typ;
    const isDrawbridge = oldtyp === DRAWBRIDGE_DOWN
        || oldtyp === DRAWBRIDGE_UP;

    if (wanted.endsWith('sink')) {
        lev.typ = SINK;
        if (oldtyp !== SINK)
            game.level.flags.nsinks = (game.level.flags.nsinks || 0) + 1;
        lev.looted = d.looted ? S_LPUDDING | S_LDWASHER | S_LRING : 0;
        await pline('A sink.');
    } else if (wanted.endsWith('pool') || wanted.endsWith('moat')
               || wanted.endsWith('wall of water')) {
        const waterType = wanted.endsWith('pool') ? POOL
            : wanted.endsWith('moat') ? MOAT : WATER;
        if (!isDrawbridge) {
            lev.typ = waterType;
            lev.flags = 0;
        } else {
            lev.drawbridgemask = ((lev.drawbridgemask ?? 0) & ~DB_UNDER)
                | DB_MOAT;
        }
        const { del_engr_at } = await import('./engrave.js');
        del_engr_at(x, y);
        if (isDrawbridge) {
            await pline(`Moat ${oldtyp === DRAWBRIDGE_UP
                ? 'in front of' : 'under'} the drawbridge.`);
        } else {
            const { waterbody_name } = await import('./pager.js');
            await pline(`${An(waterbody_name(x, y))}.`);
        }
        const { water_damage_chain } = await import('./trap.js');
        const floorObjects = (game.level.objects || [])
            .filter(obj => obj.ox === x && obj.oy === y);
        await water_damage_chain(floorObjects, true);
    } else if (wanted.endsWith('lava')) {
        const wall = wanted.endsWith('wall of lava');
        lev.typ = wall ? LAVAWALL : LAVAPOOL;
        lev.flags = 0;
        const { del_engr_at } = await import('./engrave.js');
        del_engr_at(x, y);
        await pline(`A ${wall ? 'wall' : 'pool'} of molten lava.`);
        if ((!Levitation() && !Flying()) || wall) {
            const { pooleffects } = await import('./hack.js');
            await pooleffects(false);
        }
        const floorObjects = (game.level.objects || [])
            .filter(obj => obj.ox === x && obj.oy === y);
        const { fire_damage_chain } = await import('./trap.js');
        await fire_damage_chain(floorObjects, true, true, x, y);
    } else if (wanted.endsWith('ice')) {
        if (!isDrawbridge) {
            lev.typ = ICE;
            lev.icedpool = oldtyp === ROOM ? ICED_POOL : ICED_MOAT;
        } else {
            lev.drawbridgemask = ((lev.drawbridgemask ?? 0) & ~DB_UNDER)
                | DB_ICE;
        }
        const { del_engr_at } = await import('./engrave.js');
        del_engr_at(x, y);
        if (wanted.startsWith('melting '))
            note_unported_objnam('wizterrainwish:melting-ice-timer');
        await pline(isDrawbridge
            ? `Ice ${oldtyp === DRAWBRIDGE_UP ? 'in front of' : 'under'} the drawbridge.`
            : 'Solid ice.');
    } else if (wanted.endsWith('altar')) {
        const alignment = wanted.startsWith('chaotic ') ? A_CHAOTIC
                        : wanted.startsWith('neutral ') ? A_NEUTRAL
                          : wanted.startsWith('lawful ') ? A_LAWFUL
                            : wanted.startsWith('unaligned ') ? A_NONE
                              : !rn2(6) ? A_NONE : rn2(A_LAWFUL + 2) - 1;
        const label = alignment === A_CHAOTIC ? 'chaotic'
                    : alignment === A_NEUTRAL ? 'neutral'
                      : alignment === A_LAWFUL ? 'lawful' : 'unaligned';
        lev.typ = ALTAR;
        lev.altarmask = Align2amask(alignment);
        await pline(`${An(label)} altar.`);
    } else if (wanted === 'wall') {
        const north = game.level.at(x, y - 1);
        const south = game.level.at(x, y + 1);
        lev.typ = ((north && IS_WALL(north.typ))
                   || (south && IS_WALL(south.typ))) ? VWALL : HWALL;
        lev.flags = 0;
        lev.horizontal = lev.typ === HWALL;
        const { fix_wall_spines } = await import('./mklev.js');
        fix_wall_spines(Math.max(0, x - 1), Math.max(0, y - 1),
                        Math.min(79, x + 1), Math.min(20, y + 1));
        lev.horizontal = lev.typ === HWALL;
        await pline('A wall.');
    } else if (wanted === 'door' || wanted.endsWith('secret door')) {
        const secret = wanted.endsWith('secret door');
        if (!(lev.typ === DOOR || lev.typ === SDOOR || IS_WALL(lev.typ)
              || lev.typ === IRONBARS)) {
            await pline(`${secret ? 'Secret door' : 'Door'} requires door or wall location.`);
            return hands_obj;
        }
        lev.typ = secret ? SDOOR : DOOR;
        let mask = d.locked ? D_LOCKED
                   : (d.doorless || secret) ? D_NODOOR
                     : d.open ? D_ISOPEN
                       : d.broken ? D_BROKEN : D_CLOSED;
        if (d.trapped === 1
            && (secret || (mask & (D_LOCKED | D_CLOSED))))
            mask |= D_TRAPPED;
        lev.doormask = mask;
        const words = [];
        if (mask & D_TRAPPED) words.push('trapped');
        if (mask & D_LOCKED) words.push('locked');
        if (secret) {
            words.push('secret door');
        } else {
            if (mask & D_CLOSED) words.push('closed');
            else if (mask & D_ISOPEN) words.push('open');
            else if (mask & D_BROKEN) words.push('broken');
            else words.push('doorless');
            words.push(mask === D_NODOOR ? 'doorway' : 'door');
        }
        await pline(`${An(words.join(' '))}.`);
    } else {
        return null;
    }

    const { newsym } = await import('./display.js');
    const { recalc_block_point } = await import('./vision.js');
    newsym(x, y);
    recalc_block_point(x, y);
    return hands_obj;
}

/*
 * Return something wished for.  Specifying a null pointer for
 * the user request string results in a random object.  Otherwise,
 * if asking explicitly for "nothing" (or "nil") return no_wish;
 * if not an object return hands_obj; if an error (no matching object),
 * return null.
 */
// src/objnam.c:4910 readobjnam()
export async function readobjnam(bp, no_wish) {
    const d = {};

    readobjnam_init(bp, d);
    let flow = '';

    if (bp == null) {
        flow = 'any';
    } else {
        /* first, remove extra whitespace they may have typed */
        d.bp = mungspaces(d.bp);
        /* allow wishing for "nothing" to preserve wishless conduct...
           [now requires "wand of nothing" if that's what was really
           wanted] */
        if (!strcmpi(d.bp, 'nothing') || !strcmpi(d.bp, 'nil')
            || !strcmpi(d.bp, 'none'))
            return no_wish;
        /* save the [nearly] unmodified choice string */
        d.fruitbuf = d.bp;

        if (readobjnam_preparse(d)) {
            flow = 'any';
        } else {
            if (!d.cnt)
                d.cnt = 1; /* will be changed to 2 if makesingular()
                              changes string */

            readobjnam_parse_charges(d);

            switch (readobjnam_postparse1(d)) {
            default:
            case 0: flow = 'retry'; break;
            case 1: flow = 'srch'; break;
            case 2: flow = 'typfnd'; break;
            case 3: return d.otmp;
            case 4: flow = 'any'; break;
            case 5: flow = 'wiztrap'; break;
            }

            /* retry: / srch: */
            while (flow === 'retry' || flow === 'srch') {
                if (flow === 'retry') {
                    switch (readobjnam_postparse2(d)) {
                    default:
                    case 0: flow = 'srch'; break; /* falls through to srch */
                    case 1: flow = 'srch'; break;
                    case 2: flow = 'typfnd'; break;
                    case 3: return d.otmp;
                    case 4: flow = 'any'; break;
                    case 5: flow = 'wiztrap'; break;
                    }
                }
                if (flow === 'srch') {
                    switch (readobjnam_postparse3(d)) {
                    default:
                    case 0: flow = 'wiztrap'; break; /* falls through */
                    case 1: flow = 'srch'; continue;
                    case 2: flow = 'typfnd'; break;
                    case 3: return d.otmp;
                    case 4: flow = 'any'; break;
                    case 5: flow = 'wiztrap'; break;
                    case 6: flow = 'retry'; continue;
                    }
                }
            }
        }
    }

    if (flow === 'wiztrap') {
        /*
         * Let wizards wish for traps and furniture.
         * Must come after objects check so wizards can still wish for
         * trap objects like beartraps.
         * Disallow such topology tweaks for WIZKIT startup wishes.
         */
        if (game.wizard && !game.program_state?.wizkit_wishing
            && !d.oclass) {
            const wishedTrap = await wiztrapwish(d);
            if (wishedTrap)
                return wishedTrap;
            const wishedTerrain = await wizterrainwish(d);
            if (wishedTerrain)
                return wishedTerrain;
            /* The remaining wizterrainwish paths replace other terrain. */
            note_unported_objnam('readobjnam:wizterrainwish');
        }

        if (!d.oclass && !d.typ) {
            if (!strncmpi(d.bp, 'polearm', 7)) {
                d.typ = rnd_otyp_by_wpnskill(P_POLEARMS);
                flow = 'typfnd';
            } else if (!strncmpi(d.bp, 'hammer', 6)) {
                d.typ = rnd_otyp_by_wpnskill(P_HAMMER);
                flow = 'typfnd';
            }
        }

        if (flow !== 'typfnd' && !d.oclass)
            return null;
    }
    if (flow !== 'typfnd') {
        /* any: */
        if (!d.oclass) {
            const syms = wrpsym();
            d.oclass = syms[rn2(syms.length)]; /* rn2(sizeof wrpsym) */
        }
    }
    /* typfnd: */
    if (d.typ)
        d.oclass = game.objects[d.typ].oc_class;

    /* handle some objects that are only allowed in wizard mode */
    if (d.typ && !game.wizard) {
        switch (d.typ) {
        case ONAMES.AMULET_OF_YENDOR:
            d.typ = ONAMES.FAKE_AMULET_OF_YENDOR;
            break;
        case ONAMES.CANDELABRUM_OF_INVOCATION:
            d.typ = rnd_class(ONAMES.TALLOW_CANDLE, ONAMES.WAX_CANDLE);
            break;
        case ONAMES.BELL_OF_OPENING:
            d.typ = ONAMES.BELL;
            break;
        case ONAMES.SPE_BOOK_OF_THE_DEAD:
            d.typ = ONAMES.SPE_BLANK_PAPER;
            break;
        case ONAMES.MAGIC_LAMP:
            d.typ = ONAMES.OIL_LAMP;
            break;
        default:
            /* catch any other non-wishable objects (venom) */
            if (game.objects[d.typ].oc_nowish)
                return null;
            break;
        }
    }

    /* if asking for corpse of a monster which leaves behind a glob, give
       glob instead of rejecting the monster type to create random corpse */
    if (d.typ === ONAMES.CORPSE && d.mntmp >= LOW_PM
        && game.mons[d.mntmp].mlet === MONSYMS.S_PUDDING) {
        d.typ = ONAMES.GLOB_OF_GRAY_OOZE
                + (d.mntmp - PMNAMES.PM_GRAY_OOZE);
        d.mntmp = NON_PM; /* not used for globs */
    }
    /*
     * Create the object, then fine-tune it.
     */
    d.otmp = d.typ ? mksobj(d.typ, true, false) : mkobj(d.oclass, false);
    d.typ = d.otmp.otyp, d.oclass = d.otmp.oclass; /* what we actually got */

    /* if player specified a reasonable count, maybe honor it;
       quantity for gold is handled elsewhere and d.cnt is 0 for it here */
    if (d.otmp.globby) {
        /* for globs, calculate weight based on gsize, then multiply by
           cnt */
        d.otmp.quan = 1; /* always 1 for globs */
        d.otmp.owt = weight(d.otmp);
        /* gsize 0: unspecified => small;
           1: small (1..5) => keep default owt for 1, yielding 20;
           2: medium (6..15) => use weight for 6, yielding 120;
           3: large (16..25) => 320; 4: very large (26+) => 520 */
        if (d.gsize > 1)
            d.otmp.owt += (5 + (d.gsize - 2) * 10)
                          * d.otmp.owt; /* 20 + {5|15|25} times 20 */
        /* limit overall weight which limits shrink-away time */
        if (d.cnt > 1) {
            let rn1cnt = rn1(5, 2); /* 2..6 */

            if (rn1cnt > 6 - d.gsize)
                rn1cnt = 6 - d.gsize;
            if (d.cnt > rn1cnt
                && (!game.wizard || game.program_state?.wizkit_wishing
                    /* y_n() — include/hack.h:1329 */
                    || (await tty_yn_function('Override glob weight limit?',
                                              'yn', 'n')) !== 'y'))
                d.cnt = rn1cnt;
            d.otmp.owt *= d.cnt;
        }
        /* note: the owt assignment below will not change glob's weight */
        d.cnt = 0;
    } else if (d.cnt > 0) {
        if (game.objects[d.typ].oc_merge
            && (game.wizard /* quantity isn't restricted when debugging */
                /* note: in normal play, explicitly asking for 1 might
                   fail the 'cnt < rnd(6)' test and could produce more
                   than 1 if mksobj() creates the item that way */
                || d.cnt < rnd(6)
                || (d.cnt <= 7 && Is_candle(d.otmp))
                || (d.cnt <= 20
                    && (d.typ === ONAMES.ROCK || d.typ === ONAMES.FLINT
                        || is_missile(d.otmp)
                        /* WEAPON_CLASS test excludes gems, gray stones */
                        || (d.oclass === WEAPON_CLASS
                            && is_ammo(d.otmp))))))
            d.otmp.quan = d.cnt;
    }

    if (d.islit && (d.typ === ONAMES.OIL_LAMP || d.typ === ONAMES.MAGIC_LAMP
                    || d.typ === ONAMES.BRASS_LANTERN
                    || Is_candle(d.otmp) || d.typ === ONAMES.POT_OIL)) {
        /* place_object + begin_burn + obj_extract_self make it a viable
           light source; burn timers are not ported yet */
        note_unported_objnam('readobjnam:begin_burn');
    }

    if (d.spesgn === 0) {
        /* spe not specified; retain the randomly assigned value */
        d.spe = d.otmp.spe;
    } else if (game.wizard) {
        ; /* no restrictions except SPE_LIM */
    } else if (d.oclass === ARMOR_CLASS || d.oclass === WEAPON_CLASS
               || is_weptool(d.otmp, game.objects)
               || (d.oclass === RING_CLASS
                   && game.objects[d.typ].oc_charged)) {
        if (d.spe > rnd(5) && d.spe > d.otmp.spe)
            d.spe = 0;
        if (d.spe > 2 && ((game.u.uluck || 0) + (game.u.moreluck || 0)) < 0)
            d.spesgn = -1;
    } else {
        /* crystal ball cancels like a wand, to (n:-1) */
        if (d.oclass === WAND_CLASS || d.typ === ONAMES.CRYSTAL_BALL) {
            if (d.spe > 1 && d.spesgn === -1)
                d.spe = 1;
        } else {
            if (d.spe > 0 && d.spesgn === -1)
                d.spe = 0;
        }
        if (d.spe > d.otmp.spe)
            d.spe = d.otmp.spe;
    }

    if (d.spesgn === -1)
        d.spe = -d.spe;

    /* set otmp->spe.  This may, or may not, use d.spe... */
    switch (d.typ) {
    case ONAMES.TIN:
        d.otmp.spe = 0; /* default: not spinach */
        if (d.contents === TIN_EMPTY) {
            d.otmp.corpsenm = NON_PM;
        } else if (d.contents === TIN_SPINACH) {
            d.otmp.corpsenm = NON_PM;
            d.otmp.spe = 1; /* spinach after all */
        }
        break;
    case ONAMES.TOWEL:
        if (d.wetness)
            d.otmp.spe = d.wetness;
        break;
    case ONAMES.SLIME_MOLD:
        d.otmp.spe = d.ftype;
        /* FALLTHRU */
    case ONAMES.SKELETON_KEY:
    case ONAMES.CHEST:
    case ONAMES.LARGE_BOX:
    case ONAMES.HEAVY_IRON_BALL:
    case ONAMES.IRON_CHAIN:
        break;
    case ONAMES.STATUE: /* otmp->cobj already done in mksobj() */
    case ONAMES.FIGURINE:
    case ONAMES.CORPSE: {
        const P = ismnum(d.mntmp) ? game.mons[d.mntmp] : null;

        d.otmp.spe = !P ? CORPSTAT_RANDOM
                     /* if neuter, force neuter regardless of wish
                        request */
                     : is_neuter(P) ? CORPSTAT_NEUTER
                       /* not neuter, honor wish unless it conflicts */
                       : (d.mgend === FEMALE && !is_male(P))
                           ? CORPSTAT_FEMALE
                         : (d.mgend === MALE && !is_female(P))
                             ? CORPSTAT_MALE
                           /* unspecified or wish conflicts */
                           : CORPSTAT_RANDOM;
        if (P && d.otmp.spe === CORPSTAT_RANDOM)
            d.otmp.spe = is_male(P) ? CORPSTAT_MALE
                         : is_female(P) ? CORPSTAT_FEMALE
                           : rn2(2) ? CORPSTAT_MALE : CORPSTAT_FEMALE;
        if (d.ishistoric && d.typ === ONAMES.STATUE)
            d.otmp.spe |= CORPSTAT_HISTORIC;
        break;
    }
    /* scroll of mail:  0: delivered in-game via external event (or randomly
       for fake mail); 1: from bones or wishing; 2: written with marker */
    case ONAMES.SCR_MAIL:
        d.otmp.spe = 1;
        break;
    /* splash of venom:  0: normal, and transitory; 1: wishing */
    case ONAMES.ACID_VENOM:
    case ONAMES.BLINDING_VENOM:
        d.otmp.spe = 1;
        break;
    case ONAMES.WAN_WISHING:
        if (!game.wizard) {
            d.otmp.spe = (rn2(10) ? -1 : 0);
            break;
        }
        /* FALLTHRU */
    default:
        d.otmp.spe = d.spe;
    }

    /* set otmp->corpsenm or dragon scale [mail] */
    if (ismnum(d.mntmp)) {
        let humanwere;

        if (d.mntmp === PMNAMES.PM_LONG_WORM_TAIL)
            d.mntmp = PMNAMES.PM_LONG_WORM;
        /* werecreatures in beast form are all flagged no-corpse so for
           corpses and tins, switch to their corresponding human form;
           for figurines, override the can't-be-human restriction instead */
        if (d.typ !== ONAMES.FIGURINE && is_were(game.mons[d.mntmp])
            && (game.mvitals[d.mntmp].mvflags & MFLAGS.G_NOCORPSE) !== 0
            && (humanwere = counter_were(d.mntmp)) !== NON_PM)
            d.mntmp = humanwere;

        switch (d.typ) {
        case ONAMES.TIN:
            if (dead_species(d.mntmp, false)) {
                d.otmp.corpsenm = NON_PM; /* it's empty */
            } else if ((!(game.mons[d.mntmp].geno & MFLAGS.G_UNIQ)
                        || game.wizard)
                       && !(game.mvitals[d.mntmp].mvflags
                            & MFLAGS.G_NOCORPSE)
                       && game.mons[d.mntmp].cnutrit !== 0) {
                d.otmp.corpsenm = d.mntmp;
            }
            break;
        case ONAMES.CORPSE:
            if ((!(game.mons[d.mntmp].geno & MFLAGS.G_UNIQ) || game.wizard)
                && !(game.mvitals[d.mntmp].mvflags & MFLAGS.G_NOCORPSE)) {
                if (game.mons[d.mntmp].msound === MSOUND.MS_GUARDIAN) {
                    /* d.mntmp = genus(d.mntmp, 1) — quest guardian corpses
                       become the role's genus; genus() is not ported */
                    note_unported_objnam('readobjnam:genus');
                }
                set_corpsenm(d.otmp, d.mntmp);
            }
            if (d.zombify) {
                /* Keep C's integer truth test. NON_PM is -1, so even a
                   species without a zombie form receives a callback which
                   later rots it. */
                if (zombie_form(game.mons[d.mntmp])) {
                    const { start_timer, TIMER_OBJECT, ZOMBIFY_MON }
                        = await import('./timeout.js');
                    start_timer(rn1(5, 10), TIMER_OBJECT, ZOMBIFY_MON,
                                d.otmp);
                }
            }
            break;
        case ONAMES.EGG:
            d.mntmp = can_be_hatched(d.mntmp);
            /* this also sets hatch timer if appropriate */
            set_corpsenm(d.otmp, d.mntmp);
            break;
        case ONAMES.FIGURINE:
            if (!(game.mons[d.mntmp].geno & MFLAGS.G_UNIQ)
                && (!is_human(game.mons[d.mntmp])
                    || is_were(game.mons[d.mntmp]))
                && d.mntmp !== PMNAMES.PM_MAIL_DAEMON)
                d.otmp.corpsenm = d.mntmp;
            break;
        case ONAMES.STATUE:
            d.otmp.corpsenm = d.mntmp;
            if (Has_contents(d.otmp) && verysmall(game.mons[d.mntmp]))
                d.otmp.cobj = []; /* delete_contents() — no spellbook */
            break;
        case ONAMES.SCALE_MAIL:
            /* Dragon mail - depends on the order of objects & dragons. */
            if (d.mntmp >= PMNAMES.PM_GRAY_DRAGON
                && d.mntmp <= PMNAMES.PM_YELLOW_DRAGON)
                d.otmp.otyp = ONAMES.GRAY_DRAGON_SCALE_MAIL
                              + d.mntmp - PMNAMES.PM_GRAY_DRAGON;
            break;
        }
    }

    /* set blessed/cursed -- setting the fields directly is safe
     * since weight() is called below and addinv() will take care
     * of luck */
    if (d.iscursed) {
        curse(d.otmp);
    } else if (d.uncursed) {
        d.otmp.blessed = 0;
        d.otmp.cursed = (((game.u.uluck || 0) + (game.u.moreluck || 0)) < 0
                         && !game.wizard) ? 1 : 0;
    } else if (d.blessed) {
        d.otmp.blessed = (((game.u.uluck || 0) + (game.u.moreluck || 0)) >= 0
                          || game.wizard) ? 1 : 0;
        d.otmp.cursed = (((game.u.uluck || 0) + (game.u.moreluck || 0)) < 0
                         && !game.wizard) ? 1 : 0;
    } else if (d.spesgn < 0) {
        curse(d.otmp);
    }

    /* set eroded and erodeproof */
    if (erosion_matters(d.otmp, game.objects)) {
        /* wished-for item shouldn't be eroded unless specified */
        d.otmp.oeroded = d.otmp.oeroded2 = 0;
        if (d.eroded && (is_flammable(d.otmp, game.objects)
                         || is_rustprone(d.otmp, game.objects)
                         || is_crackable(d.otmp, game.objects)))
            d.otmp.oeroded = d.eroded;
        if (d.eroded2 && (is_corrodeable(d.otmp, game.objects)
                          || is_rottable(d.otmp, game.objects)))
            d.otmp.oeroded2 = d.eroded2;
        /*
         * 3.6.1: earlier versions included `&& !eroded && !eroded2' here,
         * but damageproof combined with damaged is feasible (eroded
         * armor modified by confused reading of cursed destroy armor)
         * so don't prevent player from wishing for such a combination.
         */
        if (d.erodeproof
            && (is_damageable(d.otmp) || d.otmp.otyp === ONAMES.CRYSKNIFE))
            d.otmp.oerodeproof = (((game.u.uluck || 0)
                                   + (game.u.moreluck || 0)) >= 0
                                  || game.wizard) ? 1 : 0;
    }

    /* set otmp->recharged */
    if (d.oclass === WAND_CLASS) {
        /* prevent wishing abuse */
        if (d.otmp.otyp === ONAMES.WAN_WISHING && !game.wizard)
            d.rechrg = 1;
        d.otmp.recharged = d.rechrg;
    }

    /* set poisoned */
    if (d.ispoisoned) {
        if (is_poisonable(d.otmp))
            d.otmp.opoisoned = (((game.u.uluck || 0)
                                 + (game.u.moreluck || 0)) >= 0) ? 1 : 0;
        else if (d.oclass === FOOD_CLASS)
            /* try to taint by making it as old as possible */
            d.otmp.age = 1;
    }
    /* and [un]trapped */
    if (d.trapped) {
        if (Is_box(d.otmp) || d.typ === ONAMES.TIN)
            d.otmp.otrapped = (d.trapped === 1) ? 1 : 0;
    }
    /* empty for containers rather than for tins */
    if (d.contents === TIN_EMPTY) {
        if (d.otmp.otyp === ONAMES.BAG_OF_TRICKS
            || d.otmp.otyp === ONAMES.HORN_OF_PLENTY) {
            if (d.otmp.spe > 0)
                d.otmp.spe = 0;
        } else if (Has_contents(d.otmp)) {
            /* this assumes that artifacts can't be randomly generated
               inside containers */
            d.otmp.cobj = []; /* delete_contents() */
            d.otmp.owt = weight(d.otmp);
        }
    }
    /* set locked/unlocked/broken */
    if (Is_box(d.otmp)) {
        if (d.locked) {
            d.otmp.olocked = 1, d.otmp.obroken = 0;
        } else if (d.unlocked) {
            d.otmp.olocked = 0, d.otmp.obroken = 0;
        } else if (d.broken) {
            d.otmp.olocked = 0, d.otmp.obroken = 1;
        }
        if (d.otmp.obroken)
            d.otmp.otrapped = 0;
    }

    if (d.isgreased)
        d.otmp.greased = 1;

    if (d.isdiluted && d.otmp.oclass === POTION_CLASS)
        d.otmp.odiluted = (d.otmp.otyp !== ONAMES.POT_WATER) ? 1 : 0;

    /* set tin variety */
    if (d.otmp.otyp === ONAMES.TIN && d.tvariety >= 0
        && (rn2(4) || game.wizard))
        set_tin_variety(d.otmp, d.tvariety);

    if (d.name) {
        let aname;
        const objtyp = { v: 0 };

        /* an artifact name might need capitalization fixing */
        aname = artifact_name(d.name, objtyp, true);
        if (aname && objtyp.v === d.otmp.otyp)
            d.name = aname;

        /* 3.6 tribute - fix up novel */
        if (d.otmp.otyp === ONAMES.SPE_NOVEL) {
            /* lookup_novel() and sv.novels are not ported; the name is
               kept as given */
            note_unported_objnam('readobjnam:lookup_novel');
        }

        d.otmp = oname(d.otmp, d.name, ONAME_WISH);
        /* name==aname => wished for artifact (otmp->oartifact => got it) */
        if (d.otmp.oartifact || d.name === aname) {
            d.otmp.quan = 1;
            game.u.uconduct ||= {};
            game.u.uconduct.wisharti
                = (game.u.uconduct.wisharti || 0) + 1; /* KMH, conduct */
        }
    }

    if (permapoisoned(d.otmp))
        d.otmp.opoisoned = 1;

    /* more wishing abuse: don't allow wishing for certain artifacts */
    /* and make them pay; charge them for the wish anyway! */
    if ((is_quest_artifact(d.otmp)
         || (d.otmp.oartifact && rn2(nartifact_exist()) > 1))
        && !game.wizard) {
        artifact_exists(d.otmp, safe_oname(d.otmp), false, ONAME_NO_FLAGS);
        /* obfree(d.otmp, NULL) — no other reference remains */
        d.otmp = hands_obj;
        await pline(`For a moment, you feel something in your ${
            makeplural(body_part(HAND))}, but it disappears!`);
        return d.otmp;
    }

    if (d.halfeaten && d.otmp.oclass === FOOD_CLASS) {
        const nut = obj_nutrition(d.otmp);

        /* do this adjustment before setting up object's weight; skip
           "partly eaten" for food with 0 nutrition (wraith corpse) or for
           anything that couldn't take more than one bite */
        if (nut > 1) {
            d.otmp.oeaten = nut;
            consume_oeaten(d.otmp, 1);
        }
    }
    d.otmp.owt = weight(d.otmp);
    if (d.very && d.otmp.otyp === ONAMES.HEAVY_IRON_BALL)
        d.otmp.owt += WT_IRON_BALL_INCR;

    return d.otmp;
}

/* include/obj.h safe_oname() */
function safe_oname(obj) {
    return obj.oname != null ? obj.oname : '';
}

/* src/objnam.c:2662 one_off[] — irregular singular/plural pairs. */
const one_off = [
    ['child', 'children'], ['cubus', 'cubi'], ['culus', 'culi'],
    ['Cyclops', 'Cyclopes'], ['djinni', 'djinn'], ['erinys', 'erinyes'],
    ['foot', 'feet'], ['fungus', 'fungi'], ['goose', 'geese'],
    ['knife', 'knives'], ['labrum', 'labra'], ['louse', 'lice'],
    ['mouse', 'mice'], ['mumak', 'mumakil'], ['nemesis', 'nemeses'],
    ['ovum', 'ova'], ['ox', 'oxen'], ['passerby', 'passersby'],
    ['rtex', 'rtices'], ['serum', 'sera'], ['staff', 'staves'],
    ['tooth', 'teeth'],
];

/* src/objnam.c:2550 special_subjs[] — vtense() subjects, and an extra as_is
   set for makesingular during wishing */
const special_subjs = [
    'erinys', 'manes', 'Cyclops', 'Hippocrates', 'Pelias', 'aklys',
    'amnesia', 'detect monsters', 'paralysis', 'shape changers', 'nemesis',
];

/* src/objnam.c:3194 badman() — *man/*men words that are not man/men pairs;
   only the makesingular direction's table is needed */
const no_man = [
    'abdo', 'acu', 'agno', 'ceru', 'cogno', 'cycla', 'fleh', 'grava',
    'hegu', 'preno', 'sonar', 'speci', 'dai', 'exa', 'fla', 'sta', 'teg',
    'tegu', 'vela', 'da', 'hy', 'lu', 'no', 'nu', 'ra', 'ru', 'se', 'vi',
    'ya', 'o', 'a',
];
function badman(basestr, to_plural) {
    if (!basestr || basestr.length < 4) return false;
    const low = basestr.toLowerCase();
    for (const pre of no_man) {
        const spot = low.length - (pre.length + 3);
        if (spot < 0) continue;
        if (low.slice(spot, spot + pre.length) === pre
            && (spot === 0 || low[spot - 1] === ' '))
            return true;
    }
    return false;
}

/* src/objnam.c:2783 singplur_compound() — find " of ", " named " &c so the
   head noun is what gets singularized */
const sp_compounds = [
    ' of ', ' labeled ', ' called ', ' named ', ' above',
    ' versus ', ' from ', ' in ', ' on ', ' a la ', ' with',
    ' de ', " d'", ' du ', ' au ', '-in-', '-at-',
];
function singplur_compound(str) {
    for (let p = 0; p < str.length; p++) {
        if (str[p] !== ' ' && str[p] !== '-') continue;
        for (const cmpd of sp_compounds)
            if (str.slice(p, p + cmpd.length).toLowerCase()
                === cmpd.toLowerCase())
                return p;
    }
    return -1;
}

/* BSTRCMPI(base, ptr, str): true when the tail of base at endlen equals str,
   guarding against the pointer running off the front */
function tail_is(base, endlen, str) {
    const at = endlen - str.length;
    if (at < 0) return false;
    return base.slice(at, endlen).toLowerCase() === str.toLowerCase();
}

/* src/objnam.c:2632 singplur_lookup() — makesingular's half only. Returns
   the transformed base or null when no as-is/one_off rule applied. */
function singplur_lookup_sing(base, alt_as_is) {
    for (const w of as_is)
        if (tail_is(base, base.length, w)) return base;
    if (alt_as_is)
        for (const w of alt_as_is)
            if (tail_is(base, base.length, w)) return base;
    if (base.length > 5 && tail_is(base, base.length, 'craft')) return base;
    if (/^slice$/i.test(base) || /^mongoose$/i.test(base)) return base;
    if (base.length > 2 && tail_is(base, base.length, 'men')
        && badman(base, false)) return base;
    for (const [sing, plur] of one_off) {
        if (tail_is(base, base.length, sing)) return base;
        if (tail_is(base, base.length, plur))
            return base.slice(0, base.length - plur.length) + sing;
    }
    return null;
}

// src/objnam.c:3037 makesingular()
export function makesingular(oldstr) {
    let str = String(oldstr ?? '').replace(/^ +/, '');
    if (!str) return '';

    /* pronouns: "they"/"them" -> "it", "their" -> "its" */
    const pron = { they: 'it', them: 'it', their: 'its' }[str.toLowerCase()];
    if (pron)
        return (str[0] === str[0].toUpperCase())
            ? pron[0].toUpperCase() + pron.slice(1) : pron;

    /* focus on "foo" of "foo of bar" */
    const cut = singplur_compound(str);
    let bp = cut >= 0 ? str.slice(0, cut) : str;
    const excess = cut >= 0 ? str.slice(cut) : '';

    const looked = singplur_lookup_sing(bp, special_subjs);
    if (looked !== null)
        return looked + excess;

    const L = bp.length;
    const low = bp.toLowerCase();
    if (L >= 1 && low[L - 1] === 's') {
        if (L >= 2 && low[L - 2] === 'e') {
            if (L >= 3 && low[L - 3] === 'i') {          /* "ies" */
                if (tail_is(bp, L, 'cookies')
                    || (tail_is(bp, L, 'pies')
                        && (L === 4 || low[L - 5] === ' '))
                    || (tail_is(bp, L, 'genies')
                        && (L === 6 || low[L - 7] === ' '))
                    || tail_is(bp, L, 'mbies')
                    || tail_is(bp, L, 'yries'))
                    return bp.slice(0, L - 1) + excess;  /* just drop s */
                return bp.slice(0, L - 3) + 'y' + excess; /* ies -> y */
            }
            /* wolves &c: [lr or vowel] + "ves" -> f */
            if (L >= 4 && ('lr'.includes(low[L - 4])
                           || 'aeiou'.includes(low[L - 4]))
                && tail_is(bp, L, 'ves')) {
                if (tail_is(bp, L, 'cloves') || tail_is(bp, L, 'nerves'))
                    return bp.slice(0, L - 1) + excess;
                return bp.slice(0, L - 3) + 'f' + excess; /* ves -> f */
            }
            if (tail_is(bp, L, 'eses') || tail_is(bp, L, 'oxes')
                || tail_is(bp, L, 'nxes') || tail_is(bp, L, 'ches')
                || tail_is(bp, L, 'uses') || tail_is(bp, L, 'shes')
                || tail_is(bp, L, 'sses') || tail_is(bp, L, 'atoes')
                || tail_is(bp, L, 'dingoes') || tail_is(bp, L, 'Aleaxes'))
                return bp.slice(0, L - 2) + excess;       /* drop es */
            return bp.slice(0, L - 1) + excess;           /* drop s */
        } else if (tail_is(bp, L, 'us')) {                /* lotus, fungus */
            if (!tail_is(bp, L, 'tengus') && !tail_is(bp, L, 'hezrous'))
                return bp + excess;
            return bp.slice(0, L - 1) + excess;
        } else if (tail_is(bp, L, 'ss') || tail_is(bp, L, ' lens')
                   || (L === 4 && low === 'lens')) {
            return bp + excess;
        }
        return bp.slice(0, L - 1) + excess;               /* drop s */
    }

    /* input doesn't end in 's' */
    if (tail_is(bp, L, 'men') && !badman(bp, false))
        return bp.slice(0, L - 2) + 'an' + excess;
    if (tail_is(bp, L, 'matzot') || tail_is(bp, L, 'ae')
        || tail_is(bp, L, 'eaux'))
        return bp.slice(0, L - 1) + excess;               /* drop t/e/x */
    if (L >= 4 && tail_is(bp, L, 'ia') && 'lr'.includes(low[L - 3])
        && low[L - 4] === 'e')
        return bp.slice(0, L - 1) + 'um' + excess;        /* a -> um */

    return bp + excess;
}

// src/objnam.c the() — prepend "the" unless the name is a proper noun.
// CapitalMon() and the artifact/fruit refinements need name tables no
// current caller can reach (farlook passes lowercased or generated names);
// the capitalized-adjective and "of" branches are the live ones.
export function the(str) {
    if (!str) return 'the []';
    if (/^the /i.test(str))
        return str[0].toLowerCase() + str.slice(1);
    if (str[0] < 'A' || str[0] > 'Z')
        return 'the ' + str;
    /* probably a proper name; the capitalized-adjective test */
    const sp = Math.max(str.lastIndexOf(' '), str.lastIndexOf('-'));
    if (sp >= 0 && (str[sp + 1] < 'A' || str[sp + 1] > 'Z'))
        return str.includes("'") ? str : 'the ' + str;
    if (sp >= 0 && str.indexOf(' ') < sp) {
        const ofi = str.indexOf(' of ');
        let named = str.indexOf(' named ');
        const called = str.indexOf(' called ');
        if (called >= 0 && (named < 0 || called < named)) named = called;
        if (ofi >= 0 && (named < 0 || ofi < named))
            return 'the ' + str;
    }
    return str;
}

// src/objnam.c The() — the() with the first letter capitalised.
export function The(str) {
    const tmp = the(str);
    return highc(tmp.charAt(0)) + tmp.slice(1);
}

// src/objnam.c:5471 suit_simple_name() — "mail"/"jacket"/"suit"; dragon
// src/objnam.c suit_simple_name(), collapse dragon armor to its generic name.
export function suit_simple_name(suit) {
    if (suit) {
        if (suit.otyp >= ONAMES.GRAY_DRAGON_SCALE_MAIL
            && suit.otyp <= ONAMES.YELLOW_DRAGON_SCALE_MAIL)
            return 'dragon mail';
        if (suit.otyp >= ONAMES.GRAY_DRAGON_SCALES
            && suit.otyp <= ONAMES.YELLOW_DRAGON_SCALES)
            return 'dragon scales';
        const suitnm = OBJ_NAME(game.objects[suit.otyp]) || '';
        if (suitnm.length > 5 && suitnm.endsWith(' mail'))
            return 'mail';
        if (suitnm.length > 7 && suitnm.endsWith(' jacket'))
            return 'jacket';
    }
    return 'suit';
}

// src/objnam.c:5532 gloves_simple_name() — gloves vs gauntlets; depends upon
// discovery state.
export function gloves_simple_name(gloves) {
    if (gloves && gloves.dknown) {
        const ocl = game.objects[gloves.otyp];
        const actualn = OBJ_NAME(ocl), descrpn = OBJ_DESCR(ocl);
        const shown = ocl.oc_name_known ? actualn : descrpn;
        if (shown && shown.toLowerCase().includes('gauntlets'))
            return 'gauntlets';
    }
    return 'gloves';
}

// src/objnam.c:5551 boots_simple_name(), shoes vs boots based on discovery.
export function boots_simple_name(boots) {
    if (boots && boots.dknown) {
        const ocl = game.objects[boots.otyp];
        const actualn = OBJ_NAME(ocl), descrpn = OBJ_DESCR(ocl);
        if ((descrpn && descrpn.toLowerCase().includes('shoes'))
            || (ocl.oc_name_known && actualn
                && actualn.toLowerCase().includes('shoes')))
            return 'shoes';
    }
    return 'boots';
}

// src/objnam.c:1090 mshot_xname() — "the Nth arrow" during a volley.
export function mshot_xname(obj) {
    let onm = xname(obj);

    if ((game.m_shot?.n ?? 0) > 1 && game.m_shot.o === obj.otyp)
        onm = `the ${game.m_shot.i}${ordin(game.m_shot.i)} ` + onm;
    return onm;
}

// src/objnam.c distant_name() — format an object the hero may only see from
// afar. Within touch range (xray-adjusted knight's-move ring) the normal
// name; beyond it the C sets gd.distantname so xname skips the dknown
// side-effects. This port's xname does not set dknown (observe_object does,
// separately), so the flag is carried for fidelity and future readers.
export function distant_name(obj, func) {
    const r = ((game.u.xray_range ?? 0) > 2) ? game.u.xray_range : 2;
    const neardist = (r * r) * 2 - r;
    const ox = obj.ox ?? 0, oy = obj.oy ?? 0;
    let str;

    if (ox && cansee_o(ox, oy)
        && (obj.oartifact || distu(ox, oy) <= neardist)) {
        str = func(obj);
    } else {
        game.distantname = (game.distantname ?? 0) + 1;
        str = func(obj);
        game.distantname--;
    }
    return str;
}
