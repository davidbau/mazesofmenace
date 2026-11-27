// objnam.js — object naming helpers and the wishing parser.
// C ref: objnam.c
//
// Ported so far: just_an(), an(), makesingular() (with singplur_lookup(),
// singplur_compound(), badman()), wishymatch(), rnd_otyp_by_namedesc(),
// and readobjnam() with its helpers readobjnam_init(),
// readobjnam_preparse(), readobjnam_parse_charges(),
// readobjnam_postparse1/2/3().
//
// C's readobjnam() edits its input buffer in place through several
// pointers (bp, origbp, actualn, dn, un).  JS strings are immutable, so
// each pointer is a string here; an in-place edit at bp is mirrored into
// origbp by setbp() (bp always points into the tail of origbp's buffer,
// except for the separate globbuf).  Branches whose C helpers are not
// ported yet (wizard-mode terrain wishes, artifacts by name, fruit names,
// tins of a monster, lit light sources, novels, ...) raise not_ported().

import { shk_your } from './shk.js';
import { letter, strsubst } from './hacklib.js';
import { wizard } from './dungeon.js';
import { game } from './gstate.js';
import { ART_ORB_OF_DETECTION as ART_ORB_OF_DETECTION_ON } from './artilist.js';
import { rn2, rnd, rn1 } from './rng.js';
import {
    lowc, highc, strncmpi, strcmpi, mungspaces, strstri, fuzzymatch, dist2, s_suffix,
} from './hacklib.js';
import { cansee } from './vision.js';
import * as O from './objects.js';
import { objects, OBJ_NAME, OBJ_DESCR, Is_box, is_missile, is_ammo, is_weptool,
         Is_container, is_rustprone, is_crackable,
         is_corrodeable } from './objects.js';
import {
    NON_PM, MALE, FEMALE, NEUTRAL, P_BOW, P_CROSSBOW, P_DART, P_BOOMERANG, BLINDED, HALLUC,
    Has_contents, has_oname, ONAME, W_ARMOR, W_AMUL, W_WEP, W_SWAPWEP, W_QUIVER, W_RINGL,
    W_RINGR, ONAME_WISH, GLIB, W_BALL, W_CHAIN, COST_CONTENTS, Role_if
} from './const.js';
import * as M from './monsters.js';
import { observe_object } from './o_init.js';
import { oname } from './do_name.js';
import { mons, LOW_PM, S_PUDDING, PM_GRAY_OOZE, PM_BLACK_PUDDING,
         PM_GRAY_DRAGON, PM_YELLOW_DRAGON } from './monsters.js';
import { name_to_mon, name_to_monplus, is_male, is_female, is_neuter, is_were,
         is_human, is_elf, is_dwarf, is_gnome, is_orc,
         verysmall } from './mondata.js';
import { ismnum } from './const.js';
import { dead_species, set_corpsenm, can_be_hatched } from './mkobj.js';
import { zombie_form } from './mon.js';
import { def_char_to_objclass } from './drawing.js';
import { genders } from './role.js';
import {
    artifact_name, find_artifact, undiscovered_artifact, exist_artifact,
    artifact_exists, nartifact_exist,
} from './artifact.js';
import { tin_details } from './eat.js';
import { donning, doffing, hard_helmet } from './do_wear.js';
import { the as the_article } from './iactions.js';
import { is_unpaid, unpaid_cost, get_cost_of_shop_item,
         record_price_quote, append_price_quote } from './shk.js';
import { currency, body_part } from './insight.js';
import { candy_wrapper_text, tshirt_text, apron_text, hawaiian_motif } from './read.js';
import { mksobj, mkobj, curse, weight, erosion_matters, is_flammable,
         is_rottable, is_damageable, is_poisonable, permapoisoned, Is_candle,
         rnd_class } from './mkobj.js';
import { delete_contents } from './invent.js';
import { Luck, HAND } from './const.js';
import { W_TOOL as W_TOOL_XN, W_SADDLE as W_SADDLE_XN } from './const.js';
import { is_plural } from './wield.js';
import { peek_timer, obj_to_any } from './timeout.js';
import { BURN_OBJECT } from './const.js';
import { is_quest_artifact } from './questpgr.js';
import {
    NO_TRAP, TRAPNUM, ROCKTRAP, MAGIC_PORTAL, is_hole, DRAWBRIDGE_DOWN, DRAWBRIDGE_UP,
    FOUNTAIN, F_LOOTED, THRONE, T_LOOTED, SINK, S_LPUDDING, S_LDWASHER, S_LRING, POOL,
    MOAT, WATER, DB_UNDER, DB_MOAT, DB_LAVA, DB_FLOOR, HALLUC_RES, LAVAWALL, LAVAPOOL,
    ALTAR, A_CHAOTIC, A_NEUTRAL, A_LAWFUL, A_NONE, Align2amask, IS_GRAVE, TREE,
    TREE_LOOTED, TREE_SWARM, IRONBARS, CLOUD, DOOR, SDOOR, IS_WALL, DBWALL,
    Is_rogue_level, D_LOCKED, D_NODOOR, D_ISOPEN, D_BROKEN, D_CLOSED, D_TRAPPED, WM_MASK,
    HWALL, VWALL, isok, COLNO, ROWNO, CORR, SCORR, ROOM, IS_FURNITURE, ICE, TT_LAVA,
    IS_FOUNTAIN, IS_SINK, MELT_ICE_AWAY, IS_DOOR, W_NONDIGGABLE, W_NONPASSWALL, LADDER,
    STAIRS,
} from './const.js';
import { trapname, maketrap, t_at, deltrap, water_damage_chain, fire_damage_chain,
         set_uinwater, reset_utrap } from './trap.js';
import { Can_fall_thru, fix_wall_spines, count_level_features } from './mklev.js';
import { waterbody_name, ice_descr } from './pager.js';
import { start_melt_ice_timeout } from './zap.js';
import { ICED_POOL, ICED_MOAT, DB_ICE } from './const.js';
import { del_engr_at, make_grave } from './engrave.js';
import { pooleffects, is_pool_or_lava, switch_terrain } from './hack.js';
import { align_str } from './insight.js';
import { feel_newsym, docrt, pline } from './display.js';
import { is_pool, is_lava } from './makemon.js';
import { is_ice } from './dig.js';
import { recalc_block_point } from './vision.js';
import { spot_stop_timers } from './timeout.js';
import { Levitation, Flying } from './youprop.js';
import { str_start_is, upstart } from './hacklib.js';
import { find_mid as find_mid_xn } from './light.js';
import { FM_FMON as FM_FMON_XN } from './const.js';
import { noit_mon_nam as noit_mon_nam_xn, mon_pmname as mon_pmname_xn } from './do_name.js';
import { impossible as impossible_xn } from './hack.js';

// C ref: decl.c vowels[]
const vowels = "aeiouAEIOU";

function not_ported(what) {
    throw new Error(`readobjnam: ${what} is not ported yet`);
}

// C ref: were.c counter_were()
function counter_were(pm) {
    switch (pm) {
    case M.PM_WEREWOLF:
        return M.PM_HUMAN_WEREWOLF;
    case M.PM_HUMAN_WEREWOLF:
        return M.PM_WEREWOLF;
    case M.PM_WEREJACKAL:
        return M.PM_HUMAN_WEREJACKAL;
    case M.PM_HUMAN_WEREJACKAL:
        return M.PM_WEREJACKAL;
    case M.PM_WERERAT:
        return M.PM_HUMAN_WERERAT;
    case M.PM_HUMAN_WERERAT:
        return M.PM_WERERAT;
    default:
        return NON_PM;
    }
}

// C ref: mon.c genus()
/*
 * Return associated character class monster, rather than species
 * if mode is 1.
 */
function genus(mndx, mode) {
    switch (mndx) {
    /* Quest guardians */
    case M.PM_STUDENT:
        mndx = mode ? M.PM_ARCHEOLOGIST : M.PM_HUMAN;
        break;
    case M.PM_CHIEFTAIN:
        mndx = mode ? M.PM_BARBARIAN : M.PM_HUMAN;
        break;
    case M.PM_NEANDERTHAL:
        mndx = mode ? M.PM_CAVE_DWELLER : M.PM_HUMAN;
        break;
    case M.PM_ATTENDANT:
        mndx = mode ? M.PM_HEALER : M.PM_HUMAN;
        break;
    case M.PM_PAGE:
        mndx = mode ? M.PM_KNIGHT : M.PM_HUMAN;
        break;
    case M.PM_ABBOT:
        mndx = mode ? M.PM_MONK : M.PM_HUMAN;
        break;
    case M.PM_ACOLYTE:
        mndx = mode ? M.PM_CLERIC : M.PM_HUMAN;
        break;
    case M.PM_HUNTER:
        mndx = mode ? M.PM_RANGER : M.PM_HUMAN;
        break;
    case M.PM_THUG:
        mndx = mode ? M.PM_ROGUE : M.PM_HUMAN;
        break;
    case M.PM_ROSHI:
        mndx = mode ? M.PM_SAMURAI : M.PM_HUMAN;
        break;
    case M.PM_GUIDE:
        mndx = mode ? M.PM_TOURIST : M.PM_HUMAN;
        break;
    case M.PM_APPRENTICE:
        mndx = mode ? M.PM_WIZARD : M.PM_HUMAN;
        break;
    case M.PM_WARRIOR:
        mndx = mode ? M.PM_VALKYRIE : M.PM_HUMAN;
        break;
    default:
        if (ismnum(mndx)) {
            const ptr = mons[mndx];

            if (is_human(ptr))
                mndx = M.PM_HUMAN;
            else if (is_elf(ptr))
                mndx = M.PM_ELF;
            else if (is_dwarf(ptr))
                mndx = M.PM_DWARF;
            else if (is_gnome(ptr))
                mndx = M.PM_GNOME;
            else if (is_orc(ptr))
                mndx = M.PM_ORC;
        }
        break;
    }
    return mndx;
}

// C ref: objnam.c just_an()
export function just_an(str) {
    let outbuf = '';
    const c0 = lowc(str[0]);

    if (!str[1] || str[1] === ' ') {
        /* single letter; might be used for named fruit or a musical note */
        outbuf = "aefhilmnosx".includes(c0) ? "an " : "a ";
    } else if (!strncmpi(str, "the ", 4)
               /* these probably shouldn't be handled here because doing so
                  impacts inventory when using them for named fruit */
               || !strcmpi(str, "molten lava")
               || !strcmpi(str, "iron bars")
               || !strcmpi(str, "ice")
               ) {
        ; /* no article */
    } else {
        /* normal case is "an <vowel>" or "a <consonant>" */
        if ((vowels.includes(c0) /* some exceptions warranting "a <vowel>" */
             /* 'wun' initial sound */
             && (strncmpi(str, "one", 3) || (str[3] && !"-_ ".includes(str[3])))
             /* long 'u' initial sound */
             && strncmpi(str, "eu", 2) /* "eucalyptus leaf" */
             && strncmpi(str, "uke", 3) && strncmpi(str, "ukulele", 7)
             && strncmpi(str, "unicorn", 7) && strncmpi(str, "uranium", 7)
             && strncmpi(str, "useful", 6)) /* "useful tool" */
            || (c0 === 'x' && !vowels.includes(lowc(str[1]))))
            outbuf = "an ";
        else
            outbuf = "a ";
    }
    return outbuf;
}

// C ref: objnam.c an()
export function an(str) {
    if (!str || !str[0]) {
        /* impossible("Alphabet soup: 'an(%s)'.", ...) */
        return "an []";
    }
    return just_an(str) + str;
}

// C ref: objnam.c An()
export function An(str) {
    const tmp = an(str);
    return highc(tmp[0]) + tmp.slice(1);
}

// C ref: objnam.c BSTRCMPI(), BSTRNCMPI() — 'off' is the offset of C's
// 'ptr' within 'base' (negative when ptr would precede base)
function BSTRCMPI(base, off, str) {
    return off < 0 || strcmpi(base.slice(off), str);
}
function BSTRNCMPI(base, off, str, num) {
    return off < 0 || strncmpi(base.slice(off), str, num);
}

// C ref: objnam.c Strcasecpy() — copy 'src' over the tail of 'dst' that
// starts at 'off', matching the case of the character being replaced
function Strcasecpy(dst, off, src) {
    let out = dst.slice(0, off);
    let dst_exhausted = false;

    for (let i = 0; i < src.length; i++) {
        const di = off + i;
        let c = src[i];
        if (!dst_exhausted && di >= dst.length)
            dst_exhausted = true;
        if (!dst_exhausted && dst[di] === highc(dst[di]) && dst[di] !== lowc(dst[di]))
            c = highc(c);
        out += c;
    }
    return out;
}

// C ref: objnam.c special_subjs[]
/* various singular words that vtense would otherwise categorize as plural;
   also used by makesingular() to catch some special cases */
const special_subjs = [
    "erinys",  "manes", /* this one is ambiguous */
    "Cyclops", "Hippocrates",     "Pelias",    "aklys",
    "amnesia", "detect monsters", "paralysis", "shape changers",
    "nemesis",
];

// C ref: objnam.c one_off[]
/* word pairs that don't fit into formula-based transformations;
   also some suffices which have very few--often one--matches or
   which aren't systematically reversible (knives, staves) */
const one_off = [
    ["child", "children"], /* (for wise guys who give their food funny names) */
    ["cubus", "cubi"], /* in-/suc-cubus */
    ["culus", "culi"], /* homunculus */
    ["Cyclops", "Cyclopes"],
    ["djinni", "djinn"],
    ["erinys", "erinyes"],
    ["foot", "feet"],
    ["fungus", "fungi"],
    ["goose", "geese"],
    ["knife", "knives"],
    ["labrum", "labra"], /* candelabrum */
    ["louse", "lice"],
    ["mouse", "mice"],
    ["mumak", "mumakil"],
    ["nemesis", "nemeses"],
    ["ovum", "ova"],
    ["ox", "oxen"],
    ["passerby", "passersby"],
    ["rtex", "rtices"], /* vortex */
    ["serum", "sera"],
    ["staff", "staves"],
    ["tooth", "teeth"],
];

// C ref: objnam.c as_is[]
const as_is = [
    /* makesingular() leaves these plural due to how they're used */
    "boots",   "shoes",     "gloves",    "lenses",   "scales",
    "eyes",    "gauntlets", "iron bars",
    /* both singular and plural are spelled the same */
    "bison",   "deer",      "elk",       "fish",      "fowl",
    "tuna",    "yaki",      "-hai",      "krill",     "manes",
    "moose",   "ninja",     "sheep",     "ronin",     "roshi",
    "shito",   "tengu",     "ki-rin",    "Nazgul",    "gunyoki",
    "piranha", "samurai",   "shuriken",  "haggis",    "Bordeaux",
];

// C ref: objnam.c singplur_lookup()
/* singularize/pluralize decisions common to both makesingular & makeplural;
   'r.s' is the string being examined (C: basestr, edited in place) */
function singplur_lookup(r, to_plural, alt_as_is) {
    const basestr = r.s;
    const baselen = basestr.length;
    const endstring = baselen; /* offset of eos(basestr) */
    let al;

    for (const as of as_is) {
        al = as.length;
        if (!BSTRCMPI(basestr, endstring - al, as))
            return true;
    }
    if (alt_as_is) {
        for (const as of alt_as_is) {
            al = as.length;
            if (!BSTRCMPI(basestr, endstring - al, as))
                return true;
        }
    }

    /* Leave "craft" as a suffix as-is (aircraft, hovercraft);
       "craft" itself is (arguably) not included in our likely context */
    if ((baselen > 5) && (!BSTRCMPI(basestr, endstring - 5, "craft")))
        return true;
    /* avoid false hit on one_off[].plur == "lice" or .sing == "goose" */
    if (!strcmpi(basestr, "slice")
        || !strcmpi(basestr, "mongoose")) {
        if (to_plural)
            r.s = Strcasecpy(basestr, endstring, "s");
        return true;
    }
    /* skip "ox" -> "oxen" entry when pluralizing "<something>ox"
       unless it is muskox */
    if (to_plural && baselen > 2 && !strcmpi(basestr.slice(endstring - 2), "ox")
        && !(baselen > 5 && !strcmpi(basestr.slice(endstring - 6), "muskox"))) {
        /* "fox" -> "foxes" */
        r.s = Strcasecpy(basestr, endstring, "es");
        return true;
    }
    if (to_plural) {
        if (baselen > 2 && !strcmpi(basestr.slice(endstring - 3), "man")
            && badman(basestr, to_plural)) {
            r.s = Strcasecpy(basestr, endstring, "s");
            return true;
        }
    } else {
        if (baselen > 2 && !strcmpi(basestr.slice(endstring - 3), "men")
            && badman(basestr, to_plural))
            return true;
    }
    for (const sp of one_off) {
        const [sing, plur] = sp; /* sp->sing, sp->plur */
        /* check whether endstring already matches */
        const same = to_plural ? plur : sing;
        al = same.length;
        if (!BSTRCMPI(basestr, endstring - al, same))
            return true; /* use as-is */
        /* check whether it matches the inverse; if so, transform it */
        const other = to_plural ? sing : plur;
        al = other.length;
        if (!BSTRCMPI(basestr, endstring - al, other)) {
            r.s = Strcasecpy(basestr, endstring - al, same);
            return true; /* one_off[] transformation */
        }
    }
    return false;
}

// C ref: objnam.c singplur_compound()
/* searches for common compounds, ex. lump of royal jelly; returns the
   offset of the compound (C: pointer) or -1 */
function singplur_compound(str) {
    /* if new entries are added, be sure to keep compound_start[] in sync */
    const compounds = [
        " of ",     " labeled ", " called ",
        " named ",  " above", /* lurkers above */
        " versus ", " from ",    " in ",
        " on ",     " a la ",    " with", /* " with "? */
        " de ",     " d'",       " du ",
        " au ",     "-in-",      "-at-",
    ]; /* list of first characters for all compounds[] entries */
    const compound_start = " -";

    for (let p = 0; p < str.length; ++p) {
        /* substring starting at p can only match if *p is found
           within compound_start[] */
        if (!compound_start.includes(str[p]))
            continue;

        /* check current substring against all words in the compound[] list */
        for (const cmpd of compounds)
            if (!strncmpi(str.slice(p), cmpd, cmpd.length))
                return p;
    }
    /* wasn't recognized as a compound phrase */
    return -1;
}

// C ref: objnam.c badman()
function badman(basestr, to_plural) {
    /* these are all the prefixes for *man that don't have a *men plural */
    const no_men = [
        "albu", "antihu", "anti", "ata", "auto", "bildungsro", "cai", "cay",
        "ceru", "corner", "decu", "des", "dura", "fir", "hanu", "het",
        "infrahu", "inhu", "nonhu", "otto", "out", "prehu", "protohu",
        "subhu", "superhu", "talis", "unhu", "sha",
        "hu", "un", "le", "re", "so", "to", "at", "a",
    ];
    /* these are all the prefixes for *men that don't have a *man singular */
    const no_man = [
        "abdo", "acu", "agno", "ceru", "cogno", "cycla", "fleh", "grava",
        "hegu", "preno", "sonar", "speci", "dai", "exa", "fla", "sta", "teg",
        "tegu", "vela", "da", "hy", "lu", "no", "nu", "ra", "ru", "se", "vi",
        "ya", "o", "a",
    ];

    if (!basestr || basestr.length < 4)
        return false;

    const endstr = basestr.length;
    const lst = to_plural ? no_men : no_man;

    for (const w of lst) {
        const al = w.length;
        const spot = endstr - (al + 3);
        if (!BSTRNCMPI(basestr, spot, w, al)
            && (spot === 0 || basestr[spot - 1] === ' '))
            return true;
    }
    return false;
}

// C ref: objnam.c fruit_from_indx()
export function fruit_from_indx(indx) {
    let f;

    for (f = game.ffruit; f; f = f.nextf)
        if (f.fid === indx)
            break;
    return f || null;
}

// C ref: objnam.c fruit_from_name()
/* look up a named fruit by name; 'highest_fid' is an optional output
   holder ({ v }), only valid if 'fname' isn't found */
export function fruit_from_name(fname, exact, highest_fid) {
    let f, tentativef;
    let altfname;
    let k;
    /*
     * note: named fruits are case-sensitive...
     */

    if (highest_fid)
        highest_fid.v = 0;
    /* first try for an exact match */
    for (f = game.ffruit; f; f = f.nextf)
        if (f.fname === fname)
            return f;
        else if (highest_fid && f.fid > highest_fid.v)
            highest_fid.v = f.fid;

    /* didn't match as-is; if caller is willing to accept a prefix
       match, try to find one; we want to find the longest prefix that
       matches, not the first */
    if (!exact) {
        tentativef = null;
        for (f = game.ffruit; f; f = f.nextf) {
            k = f.fname.length;
            if (fname.slice(0, k) === f.fname
                && (k >= fname.length || fname[k] === ' ')
                && (!tentativef || k > tentativef.fname.length))
                tentativef = f;
        }
        f = tentativef;
    }
    /* if we still don't have a match, try singularizing the target;
       for exact match, that's trivial, but for prefix, it's hard */
    if (!f) {
        altfname = makesingular(fname);
        for (f = game.ffruit; f; f = f.nextf) {
            if (f.fname === altfname)
                break;
        }
        /* releaseobuf(altfname) */
    }
    if (!f && !exact) {
        let fnamebuf, p;
        const fname_k = fname.length; /* length of assumed plural fname */

        tentativef = null;
        for (f = game.ffruit; f; f = f.nextf) {
            k = f.fname.length;
            /* reload fnamebuf[] each iteration in case it gets modified;
               there's no need to recalculate fname_k */
            fnamebuf = fname;
            /* bug? if singular of fname is longer than plural,
               failing the 'fname_k > k' test could skip a viable
               candidate; unfortunately, we can't singularize until
               after stripping off trailing stuff and we can't get
               accurate fname_k until fname has been singularized;
               compromise and use 'fname_k >= k' instead of '>',
               accepting 1 char length discrepancy without risking
               false match (I hope...) */
            if (fname_k >= k && (p = fnamebuf.indexOf(' ', k)) >= 0) {
                /* truncate at 1st space past length of f->fname */
                fnamebuf = fnamebuf.slice(0, p);
                altfname = makesingular(fnamebuf);
                k = altfname.length; /* actually revised 'fname_k' */
                if (f.fname === altfname
                    && (!tentativef || k > tentativef.fname.length))
                    tentativef = f;
                /* releaseobuf(altfname): avoid churning through all obufs */
            }
        }
        f = tentativef;
    }
    return f || null;
}

// C ref: objnam.c ch_ksound()
function ch_ksound(basestr) {
    /* these are some *ch words/suffixes that make a k-sound. They pluralize by
       adding 's' rather than 'es' */
    const ch_k = [
        "monarch",     "poch",    "tech",     "mech",      "stomach", "psych",
        "amphibrach",  "anarch",  "atriarch", "azedarach", "broch",
        "gastrotrich", "isopach", "loch",     "oligarch",  "peritrich",
        "sandarach",   "sumach",  "symposiarch",
    ];

    if (!basestr || basestr.length < 4)
        return false;

    const endstr = basestr.length;
    for (const k of ch_k) {
        if (!BSTRCMPI(basestr, endstr - k.length, k))
            return true;
    }
    return false;
}

// C ref: objnam.c obj_typename()
export function obj_typename(otyp) {
    let buf;
    const ocl = objects[otyp];
    let actualn = OBJ_NAME(ocl);
    let dn = OBJ_DESCR(ocl);
    const un = ocl.oc_uname;
    let nn = ocl.oc_name_known;

    if (Role_if(M.PM_SAMURAI)) {
        actualn = Japanese_item_name(otyp, actualn);
        if (otyp === O.WOODEN_HARP || otyp === O.MAGIC_HARP)
            dn = "koto";
    }
    /* generic items don't have an actual-name; we shouldn't ever be called
       for those; pacify static analyzer without resorting to impossible() */
    if (!actualn)
        actualn = (otyp > 0 && otyp < O.MAXOCLASSES) ? "generic" : "object?";

    buf = ''; /* redundant */
    switch (ocl.oc_class) {
    case O.COIN_CLASS:
        return actualn; /* "gold piece" */
    case O.POTION_CLASS:
        buf = "potion";
        break;
    case O.SCROLL_CLASS:
        buf = "scroll";
        break;
    case O.WAND_CLASS:
        buf = "wand";
        break;
    case O.SPBOOK_CLASS:
        if (otyp !== O.SPE_NOVEL) {
            buf = "spellbook";
        } else {
            buf = !nn ? "book" : "novel";
            nn = 0;
        }
        break;
    case O.RING_CLASS:
        buf = "ring";
        break;
    case O.AMULET_CLASS:
        if (nn)
            buf = actualn;
        else
            buf = "amulet";
        if (un)
            buf += ` called ${un}`; /* xcalled(buf, ..., "", un) */
        if (dn)
            buf += ` (${dn})`;
        return buf;
    case O.ARMOR_CLASS:
        if (ocl.oc_subtyp === O.ARM_GLOVES || ocl.oc_subtyp === O.ARM_BOOTS)
            buf = "pair of ";
        else if (otyp >= O.GRAY_DRAGON_SCALES && otyp <= O.YELLOW_DRAGON_SCALES)
            buf = "set of ";
        /*FALLTHRU*/
    default:
        if (nn) {
            buf += actualn;
            if (GemStone_x(otyp))
                buf += " stone";
            if (un) /* 3: length of " (" + ")" which will enclose 'dn' */
                buf += ` called ${un}`; /* xcalled() */
            if (dn)
                buf += ` (${dn})`;
        } else {
            buf += dn ? dn : actualn;
            if (ocl.oc_class === O.GEM_CLASS)
                buf += (ocl.oc_material === O.MINERAL) ? " stone" : " gem";
            if (un)
                buf += ` called ${un}`; /* xcalled() */
        }
        return buf;
    }
    /* here for ring/scroll/potion/wand */
    if (nn) {
        if (ocl.oc_unique)
            buf = actualn; /* avoid spellbook of Book of the Dead */
        else
            buf += ` of ${actualn}`;
    }
    if (un) /* 3: length of " (" + ")" which will enclose 'dn' */
        buf += ` called ${un}`; /* xcalled() */
    if (dn)
        buf += ` (${dn})`;
    return buf;
}

// C ref: objnam.c otense()
export function otense(otmp, verb) {
    /*
     * verb is given in plural (without trailing s).  Return as input
     * if the result of xname(otmp) would be plural.  Don't bother
     * recomputing xname(otmp) at this time.
     */
    if (!is_plural(otmp))
        return vtense(null, verb);

    return verb;
}

// C ref: objnam.c vtense()
/* return form of the verb (input plural) for present tense 3rd person subj */
export function vtense(subj, verb) {
    let buf, bspot;
    let len, ltmp;
    let spot;

    /*
     * verb is given in plural (without trailing s).  Return as input
     * if subj appears to be plural.  Add special cases as necessary.
     * Many hard cases can already be handled by using otense() instead.
     * If this gets much bigger, consider decomposing makeplural.
     * Note: monster names are not expected here (except before corpse).
     *
     * Special case: allow null sobj to get the singular 3rd person
     * present tense form so we don't duplicate this code elsewhere.
     */
    let sing = !subj;
    if (subj) {
        if (!strncmpi(subj, "a ", 2) || !strncmpi(subj, "an ", 3)) {
            sing = true;
        } else {
            spot = -1;
            for (let sp = subj.indexOf(' '); sp >= 0; sp = subj.indexOf(' ', sp + 1)) {
                const t = subj.slice(sp);
                if (!strncmpi(t, " of ", 4) || !strncmpi(t, " from ", 6)
                    || !strncmpi(t, " called ", 8) || !strncmpi(t, " named ", 7)
                    || !strncmpi(t, " labeled ", 9)) {
                    if (sp !== 0)
                        spot = sp - 1;
                    break;
                }
            }
            len = subj.length;
            if (spot < 0)
                spot = len - 1;

            /*
             * plural: anything that ends in 's', but not '*us' or '*ss'.
             * Guess at a few other special cases that makeplural creates.
             */
            if ((lowc(subj[spot]) === 's' && spot !== 0
                 && !"us".includes(lowc(subj[spot - 1])))
                || !BSTRNCMPI(subj, spot - 3, "eeth", 4)
                || !BSTRNCMPI(subj, spot - 3, "feet", 4)
                || !BSTRNCMPI(subj, spot - 1, "ia", 2)
                || !BSTRNCMPI(subj, spot - 1, "ae", 2)) {
                /* check for special cases to avoid false matches */
                len = spot + 1;
                for (const spec of special_subjs) {
                    ltmp = spec.length;
                    if (len === ltmp && !strncmpi(spec, subj, len)) {
                        sing = true;
                        break;
                    }
                    /* also check for <prefix><space><special_subj>
                       to catch things like "the invisible erinys" */
                    if (len > ltmp && subj[spot - ltmp] === ' '
                        && !strncmpi(spec, subj.slice(spot - ltmp + 1), ltmp)) {
                        sing = true;
                        break;
                    }
                }
                if (!sing)
                    return verb;
            }
            /*
             * 3rd person plural doesn't end in telltale 's';
             * 2nd person singular behaves as if plural.
             */
            if (!sing && (!strcmpi(subj, "they") || !strcmpi(subj, "you")))
                return verb;
        }
    }

    /* sing: */
    buf = verb;
    len = buf.length;
    bspot = len - 1;

    if (!strcmpi(buf, "are")) {
        buf = Strcasecpy(buf, 0, "is");
    } else if (!strcmpi(buf, "have")) {
        buf = Strcasecpy(buf, bspot - 1, "s");
    } else if ("zxs".includes(lowc(buf[bspot]))
               || (len >= 2 && lowc(buf[bspot]) === 'h'
                   && "cs".includes(lowc(buf[bspot - 1])))
               || (len === 2 && lowc(buf[bspot]) === 'o')) {
        /* Ends in z, x, s, ch, sh; add an "es" */
        buf = Strcasecpy(buf, bspot + 1, "es");
    } else if (lowc(buf[bspot]) === 'y' && !vowels.includes(lowc(buf[bspot - 1]))) {
        /* like "y" case in makeplural */
        buf = Strcasecpy(buf, bspot, "ies");
    } else {
        buf = Strcasecpy(buf, bspot + 1, "s");
    }

    return buf;
}

// C ref: objnam.c makeplural()
export function makeplural(oldstr) {
    let excess = null;
    let str;

    if (oldstr)
        oldstr = oldstr.replace(/^ +/, '');
    if (!oldstr) {
        /* impossible("plural of null?") */
        return "s";
    }
    /* makeplural() is sometimes used on monsters rather than objects
       and sometimes pronouns are used for monsters, so check those */
    str = '';
    for (let i = 0; i <= 2; ++i) {
        if (!strcmpi(genders[i].he, oldstr))
            str = genders[3].he; /* "they" */
        else if (!strcmpi(genders[i].him, oldstr))
            str = genders[3].him; /* "them" */
        else if (!strcmpi(genders[i].his, oldstr))
            str = genders[3].his; /* "their" */
        if (str) {
            if (oldstr[0] === highc(oldstr[0]))
                str = highc(str[0]) + str.slice(1);
            return str;
        }
    }

    str = oldstr;

    bottom: {
        /* Skip changing "pair of" to "pairs of". */
        if (!strncmpi(str, "pair of ", 8))
            break bottom;

        /* look for "foo of bar" so that we can focus on "foo" */
        const p = singplur_compound(str);
        if (p >= 0) {
            excess = oldstr.slice(p);
            str = str.slice(0, p);
        }
        /* Strip blanks from end (C keeps at least the first char) */
        let spot = str.length - 1;
        while (spot > 0 && str[spot] === ' ')
            spot--;
        str = str.slice(0, spot + 1);
        /* Now spot is the last character of the string */

        const len = str.length;
        /* !strcmpi(spot - k, s) */
        const tailis = (k, s) => (spot - k >= 0) && !strcmpi(str.slice(spot - k), s);

        /* Single letters */
        if (len === 1 || !letter(str[spot])) {
            str += "'s";
            break bottom;
        }

        /* dispense with some words which don't need pluralization */
        {
            const already_plural = [
                "ae",  /* algae, larvae, &c */
                "eaux", /* chateaux, gateaux */
                "matzot",
            ];
            const r = { s: str };
            if (singplur_lookup(r, true, already_plural)) {
                str = r.s;
                break bottom;
            }
            /* more of same, but not suitable for blanket loop checking */
            if ((len === 2 && !strcmpi(str, "ya"))
                || (len >= 3 && tailis(2, " ya")))
                break bottom;
        }

        /* man/men ("Wiped out all cavemen.") */
        if (len >= 3 && tailis(2, "man")
            /* exclude shamans and humans etc */
            && !badman(str, true)) {
            str = Strcasecpy(str, spot - 1, "en");
            break bottom;
        }
        if (lowc(str[spot]) === 'f') { /* (staff handled via one_off[]) */
            const lo_c = lowc(str[spot - 1]);
            if (len >= 3 && tailis(2, "erf")) {
                /* avoid "nerf" -> "nerves", "serf" -> "serves" */
                ; /* fall through to default (append 's') */
            } else if ("lr".includes(lo_c) || vowels.includes(lo_c)) {
                /* [aeioulr]f to [aeioulr]ves */
                str = Strcasecpy(str, spot, "ves");
                break bottom;
            }
        }
        /* ium/ia (mycelia, baluchitheria) */
        if (len >= 3 && tailis(2, "ium")) {
            str = Strcasecpy(str, spot - 2, "ia");
            break bottom;
        }
        /* algae, larvae, hyphae (another fungus part) */
        if ((len >= 4 && tailis(3, "alga"))
            || (len >= 5 && (tailis(4, "hypha") || tailis(4, "larva")))
            || (len >= 6 && tailis(5, "amoeba"))
            || (len >= 8 && tailis(7, "vertebra"))) {
            /* a to ae */
            str = Strcasecpy(str, spot + 1, "e");
            break bottom;
        }
        /* fungus/fungi, homunculus/homunculi, but buses, lotuses, wumpuses */
        if (len > 3 && tailis(1, "us")
            && !((len >= 5 && tailis(4, "lotus"))
                 || (len >= 6 && tailis(5, "wumpus")))) {
            str = Strcasecpy(str, spot - 1, "i");
            break bottom;
        }
        /* sis/ses (nemesis) */
        if (len >= 3 && tailis(2, "sis")) {
            str = Strcasecpy(str, spot - 1, "es");
            break bottom;
        }
        /* -eau/-eaux (gateau, chapeau...) */
        if (len >= 3 && tailis(2, "eau")
            /* 'bureaus' is the more common plural of 'bureau' */
            && BSTRCMPI(str, spot - 5, "bureau")) {
            str = Strcasecpy(str, spot + 1, "x");
            break bottom;
        }
        /* matzoh/matzot, possible food name */
        if (len >= 6 && (tailis(5, "matzoh") || tailis(5, "matzah"))) {
            str = Strcasecpy(str, spot - 1, "ot"); /* oh/ah -> ot */
            break bottom;
        }
        if (len >= 5 && (tailis(4, "matzo") || tailis(4, "matza"))) {
            str = Strcasecpy(str, spot, "ot"); /* o/a -> ot */
            break bottom;
        }

        /* note: ox/oxen, VAX/VAXen, goose/geese */

        const lo_c = lowc(str[spot]);

        /* codex/spadix/neocortex and the like */
        if (len >= 5
            && (tailis(2, "dex") || tailis(2, "dix") || tailis(2, "tex"))
            /* indices would have been ok too, but stick with indexes */
            && !tailis(4, "index")) {
            str = Strcasecpy(str, spot - 1, "ices"); /* ex|ix -> ices */
            break bottom;
        }
        /* Ends in z, x, s, ch, sh; add an "es" */
        if ("zxs".includes(lo_c)
            || (len >= 2 && lo_c === 'h' && "cs".includes(lowc(str[spot - 1]))
                /* 21st century k-sound */
                && !(len >= 4 && lowc(str[spot - 1]) === 'c' && ch_ksound(str)))
            /* Kludge to get "tomatoes" and "potatoes" right */
            || (len >= 4 && tailis(2, "ato"))
            || (len >= 5 && tailis(4, "dingo"))) {
            str = Strcasecpy(str, spot + 1, "es"); /* append es */
            break bottom;
        }
        /* Ends in y preceded by consonant (note: also "qu") change to "ies" */
        if (lo_c === 'y' && !vowels.includes(lowc(str[spot - 1]))) {
            str = Strcasecpy(str, spot, "ies"); /* y -> ies */
            break bottom;
        }
        /* Default: append an 's' */
        str = Strcasecpy(str, spot + 1, "s");
    }
    if (excess)
        str += excess;
    return str;
}

// C ref: objnam.c makesingular()
export function makesingular(oldstr) {
    let p, bp;
    let excess = null;

    if (oldstr)
        oldstr = oldstr.replace(/^ +/, '');
    if (!oldstr) {
        /* impossible("singular of null?") */
        return '';
    }
    /* makeplural() of pronouns isn't reversible but at least we can
       force a singular value */
    let str = '';
    if (!strcmpi("they", oldstr)) /* genders[3].he */
        str = "it"; /* genders[2].he */
    else if (!strcmpi("them", oldstr)) /* genders[3].him */
        str = "it"; /* genders[2].him */
    else if (!strcmpi("their", oldstr)) /* genders[3].his */
        str = "its"; /* genders[2].his */
    if (str) {
        if (oldstr[0] === highc(oldstr[0]))
            str = highc(str[0]) + str.slice(1);
        return str;
    }

    bp = oldstr;

    /* check for "foo of bar" so that we can focus on "foo" */
    if ((p = singplur_compound(bp)) >= 0) {
        excess = oldstr.slice(p);
        bp = bp.slice(0, p);
    }
    p = bp.length; /* eos(bp) */

    bottom: {
        /* dispense with some words which don't need singularization */
        const r = { s: bp };
        if (singplur_lookup(r, false, special_subjs)) {
            bp = r.s;
            break bottom;
        }

        /* remove -s or -es (boxes) or -ies (rubies) */
        if (p >= 1 && lowc(bp[p - 1]) === 's') {
            mins: {
                if (p >= 2 && lowc(bp[p - 2]) === 'e') {
                    if (p >= 3 && lowc(bp[p - 3]) === 'i') { /* "ies" */
                        if (!BSTRCMPI(bp, p - 7, "cookies")
                            || (!BSTRCMPI(bp, p - 4, "pies")
                                /* avoid false match for "harpies" */
                                && (p - 4 === 0 || bp[p - 5] === ' '))
                            /* alternate djinni/djinn spelling */
                            || (!BSTRCMPI(bp, p - 6, "genies")
                                /* avoid false match for "progenies" */
                                && (p - 6 === 0 || bp[p - 7] === ' '))
                            || !BSTRCMPI(bp, p - 5, "mbies") /* zombie */
                            || !BSTRCMPI(bp, p - 5, "yries")) /* valkyrie */
                            break mins;
                        bp = Strcasecpy(bp, p - 3, "y"); /* ies -> y */
                        break bottom;
                    }
                    /* wolves, but f to ves isn't fully reversible */
                    if (p - 4 >= 0 && ("lr".includes(lowc(bp[p - 4]))
                                       || vowels.includes(lowc(bp[p - 4])))
                        && !BSTRCMPI(bp, p - 3, "ves")) {
                        if (!BSTRCMPI(bp, p - 6, "cloves")
                            || !BSTRCMPI(bp, p - 6, "nerves"))
                            break mins;
                        bp = Strcasecpy(bp, p - 3, "f"); /* ves -> f */
                        break bottom;
                    }
                    /* note: nurses, axes but boxes, wumpuses */
                    if (!BSTRCMPI(bp, p - 4, "eses")
                        || !BSTRCMPI(bp, p - 4, "oxes") /* boxes, foxes */
                        || !BSTRCMPI(bp, p - 4, "nxes") /* lynxes */
                        || !BSTRCMPI(bp, p - 4, "ches")
                        || !BSTRCMPI(bp, p - 4, "uses") /* lotuses */
                        || !BSTRCMPI(bp, p - 4, "shes") /* splashes [of venom] */
                        || !BSTRCMPI(bp, p - 4, "sses") /* priestesses */
                        || !BSTRCMPI(bp, p - 5, "atoes") /* tomatoes */
                        || !BSTRCMPI(bp, p - 7, "dingoes")
                        || !BSTRCMPI(bp, p - 7, "Aleaxes")) {
                        bp = bp.slice(0, p - 2); /* drop es */
                        break bottom;
                    } /* else fall through to mins */

                    /* ends in 's' but not 'es' */
                } else if (!BSTRCMPI(bp, p - 2, "us")) { /* lotus, fungus... */
                    if (BSTRCMPI(bp, p - 6, "tengus") /* but not these... */
                        && BSTRCMPI(bp, p - 7, "hezrous"))
                        break bottom;
                } else if (!BSTRCMPI(bp, p - 2, "ss")
                           || !BSTRCMPI(bp, p - 5, " lens")
                           || (p - 4 === 0 && !strcmpi(bp.slice(p - 4), "lens"))) {
                    break bottom;
                }
            }
            /* mins: */
            bp = bp.slice(0, p - 1); /* drop s */

        } else { /* input doesn't end in 's' */

            if (!BSTRCMPI(bp, p - 3, "men")
                && !badman(bp, false)) {
                bp = Strcasecpy(bp, p - 2, "an");
                break bottom;
            }
            /* matzot -> matzo, algae -> alga */
            if (!BSTRCMPI(bp, p - 6, "matzot") || !BSTRCMPI(bp, p - 2, "ae")
                || !BSTRCMPI(bp, p - 4, "eaux")) {
                bp = bp.slice(0, p - 1); /* drop t/e/x */
                break bottom;
            }
            /* balactheria -> balactherium */
            if (p - 4 >= 0 && !strcmpi(bp.slice(p - 2), "ia")
                && "lr".includes(lowc(bp[p - 3])) && lowc(bp[p - 4]) === 'e') {
                bp = Strcasecpy(bp, p - 1, "um"); /* a -> um */
            }

            /* here we cannot find the plural suffix */
        }
    }

    /* bottom: */
    /* if we stripped off a suffix (" of bar" from "foo of bar"),
       put it back now */
    if (excess)
        bp += excess;

    return bp;
}

// C ref: objnam.c wishymatch()
/* compare user string against object name string using fuzzy matching */
function wishymatch(u_str, o_str, retry_inverted) {
    const detect_SP = "detect ", SP_detection = " detection";
    let p, buf;

    /* ignore spaces & hyphens and upper/lower case when comparing */
    if (fuzzymatch(u_str, o_str, " -", true))
        return true;

    if (retry_inverted) {
        /* when just one of the strings is in the form "foo of bar",
           convert it into "bar foo" and perform another comparison */
        const u_of = strstri(u_str, " of ");
        const o_of = strstri(o_str, " of ");
        if (u_of >= 0 && o_of < 0) {
            buf = u_str.slice(u_of + 4) + " " + u_str.slice(0, u_of);
            if (fuzzymatch(buf, o_str, " -", true))
                return true;
        } else if (o_of >= 0 && u_of < 0) {
            buf = o_str.slice(o_of + 4) + " " + o_str.slice(0, o_of);
            if (fuzzymatch(u_str, buf, " -", true))
                return true;
        }
    }

    /* [note: if something like "elven speed boots" ever gets added, these
       special cases should be changed to call wishymatch() recursively in
       order to get the "of" inversion handling] */
    if (o_str.startsWith("dwarvish ")) {
        if (!strncmpi(u_str, "dwarven ", 8))
            return fuzzymatch(u_str.slice(8), o_str.slice(9), " -", true);
    } else if (o_str.startsWith("elven ")) {
        if (!strncmpi(u_str, "elvish ", 7))
            return fuzzymatch(u_str.slice(7), o_str.slice(6), " -", true);
        else if (!strncmpi(u_str, "elfin ", 6))
            return fuzzymatch(u_str.slice(6), o_str.slice(6), " -", true);
    } else if (strstri(o_str, "helm") >= 0 && strstri(u_str, "helmet") >= 0) {
        buf = strsubst(u_str, "helmet", "helm");
        return wishymatch(buf, o_str, true);
    } else if (strstri(o_str, "gauntlets") >= 0 && strstri(u_str, "gloves") >= 0) {
        buf = strsubst(u_str, "gloves", "gauntlets");
        return wishymatch(buf, o_str, true);
    } else if (o_str.startsWith(detect_SP)) {
        /* check for "detect <foo>" vs "<foo> detection" */
        if ((p = strstri(u_str, SP_detection)) >= 0
            && p + SP_detection.length === u_str.length) {
            /* convert "<foo> detection" into "detect <foo>" */
            const head = u_str.slice(0, p);
            buf = detect_SP + head;
            /* "detect monster" -> "detect monsters" */
            if (!strcmpi(head, "monster"))
                buf += "s";
            return fuzzymatch(buf, o_str, " -", true);
        }
    } else if (strstri(o_str, SP_detection) >= 0) {
        /* and the inverse, "<foo> detection" vs "detect <foo>" */
        if (!strncmpi(u_str, detect_SP, detect_SP.length)) {
            /* convert "detect <foo>s" into "<foo> detection" */
            p = makesingular(u_str.slice(detect_SP.length));
            buf = p + SP_detection;
            return fuzzymatch(buf, o_str, " -", true);
        }
    } else if (strstri(o_str, "ability") >= 0) {
        /* catch "{potion(s),ring} of {gain,restore,sustain} abilities" */
        if ((p = strstri(u_str, "abilities")) >= 0
            && p + "abilities".length === u_str.length) {
            buf = u_str.slice(0, p) + "ability";
            return fuzzymatch(buf, o_str, " -", true);
        }
    } else if (o_str === "aluminum") {
        /* this special case doesn't really fit anywhere else... */
        if (!strcmpi(u_str, "aluminium"))
            return fuzzymatch(u_str.slice(9), o_str.slice(8), " -", true);
    }

    return false;
}

// C ref: objnam.c o_ranges[]
/* wishable subranges of objects */
const o_ranges = [
    { name: "bag", oclass: O.TOOL_CLASS, f_o_range: O.SACK, l_o_range: O.BAG_OF_TRICKS },
    { name: "lamp", oclass: O.TOOL_CLASS, f_o_range: O.OIL_LAMP, l_o_range: O.MAGIC_LAMP },
    { name: "candle", oclass: O.TOOL_CLASS, f_o_range: O.TALLOW_CANDLE, l_o_range: O.WAX_CANDLE },
    { name: "horn", oclass: O.TOOL_CLASS, f_o_range: O.TOOLED_HORN, l_o_range: O.HORN_OF_PLENTY },
    { name: "shield", oclass: O.ARMOR_CLASS, f_o_range: O.SMALL_SHIELD, l_o_range: O.SHIELD_OF_REFLECTION },
    { name: "hat", oclass: O.ARMOR_CLASS, f_o_range: O.FEDORA, l_o_range: O.DUNCE_CAP },
    { name: "helm", oclass: O.ARMOR_CLASS, f_o_range: O.ELVEN_LEATHER_HELM, l_o_range: O.HELM_OF_TELEPATHY },
    { name: "gloves", oclass: O.ARMOR_CLASS, f_o_range: O.LEATHER_GLOVES, l_o_range: O.GAUNTLETS_OF_DEXTERITY },
    { name: "gauntlets", oclass: O.ARMOR_CLASS, f_o_range: O.LEATHER_GLOVES, l_o_range: O.GAUNTLETS_OF_DEXTERITY },
    { name: "boots", oclass: O.ARMOR_CLASS, f_o_range: O.LOW_BOOTS, l_o_range: O.LEVITATION_BOOTS },
    { name: "shoes", oclass: O.ARMOR_CLASS, f_o_range: O.LOW_BOOTS, l_o_range: O.IRON_SHOES },
    { name: "cloak", oclass: O.ARMOR_CLASS, f_o_range: O.MUMMY_WRAPPING, l_o_range: O.CLOAK_OF_DISPLACEMENT },
    { name: "shirt", oclass: O.ARMOR_CLASS, f_o_range: O.HAWAIIAN_SHIRT, l_o_range: O.T_SHIRT },
    { name: "dragon scales", oclass: O.ARMOR_CLASS, f_o_range: O.GRAY_DRAGON_SCALES,
      l_o_range: O.YELLOW_DRAGON_SCALES },
    { name: "dragon scale mail", oclass: O.ARMOR_CLASS, f_o_range: O.GRAY_DRAGON_SCALE_MAIL,
      l_o_range: O.YELLOW_DRAGON_SCALE_MAIL },
    { name: "sword", oclass: O.WEAPON_CLASS, f_o_range: O.SHORT_SWORD, l_o_range: O.KATANA },
    { name: "venom", oclass: O.VENOM_CLASS, f_o_range: O.BLINDING_VENOM, l_o_range: O.ACID_VENOM },
    { name: "gray stone", oclass: O.GEM_CLASS, f_o_range: O.LUCKSTONE, l_o_range: O.FLINT },
    { name: "grey stone", oclass: O.GEM_CLASS, f_o_range: O.LUCKSTONE, l_o_range: O.FLINT },
];

// C ref: objnam.c spellings[]
/* alternate spellings; if the difference is only the presence or
   absence of spaces and/or hyphens (such as "pickaxe" vs "pick axe"
   vs "pick-axe") then there is no need for inclusion in this list;
   likewise for ``"of" inversions'' ("boots of speed" vs "speed boots") */
const spellings = [
    ["pickax", O.PICK_AXE],
    ["whip", O.BULLWHIP],
    ["saber", O.SILVER_SABER],
    ["silver sabre", O.SILVER_SABER],
    ["smooth shield", O.SHIELD_OF_REFLECTION],
    ["grey dragon scale mail", O.GRAY_DRAGON_SCALE_MAIL],
    ["grey dragon scales", O.GRAY_DRAGON_SCALES],
    ["iron ball", O.HEAVY_IRON_BALL],
    ["lantern", O.BRASS_LANTERN],
    ["mattock", O.DWARVISH_MATTOCK],
    ["amulet of poison resistance", O.AMULET_VERSUS_POISON],
    ["amulet of protection", O.AMULET_OF_GUARDING],
    ["amulet of telepathy", O.AMULET_OF_ESP],
    ["helm of esp", O.HELM_OF_TELEPATHY],
    ["gauntlets of ogre power", O.GAUNTLETS_OF_POWER],
    ["gauntlets of giant strength", O.GAUNTLETS_OF_POWER],
    ["elven chain mail", O.ELVEN_MITHRIL_COAT],
    ["silver shield", O.SHIELD_OF_REFLECTION],
    ["potion of sleep", O.POT_SLEEPING],
    ["scroll of recharging", O.SCR_CHARGING],
    ["recharging", O.SCR_CHARGING],
    ["stone", O.ROCK],
    ["camera", O.EXPENSIVE_CAMERA],
    ["tee shirt", O.T_SHIRT],
    ["can", O.TIN],
    ["can opener", O.TIN_OPENER],
    ["kelp", O.KELP_FROND],
    ["eucalyptus", O.EUCALYPTUS_LEAF],
    ["lembas", O.LEMBAS_WAFER],
    ["tripe", O.TRIPE_RATION],
    ["cookie", O.FORTUNE_COOKIE],
    ["pie", O.CREAM_PIE],
    ["huge meatball", O.ENORMOUS_MEATBALL], /* likely conflated name */
    ["huge chunk of meat", O.ENORMOUS_MEATBALL], /* original name */
    ["marker", O.MAGIC_MARKER],
    ["hook", O.GRAPPLING_HOOK],
    ["grappling iron", O.GRAPPLING_HOOK],
    ["grapnel", O.GRAPPLING_HOOK],
    ["grapple", O.GRAPPLING_HOOK],
    ["protection from shape shifters", O.RIN_PROTECTION_FROM_SHAPE_CHAN],
    ["accuracy", O.RIN_INCREASE_ACCURACY],
    /* if we ever add other sizes, move this to o_ranges[] with "bag" */
    ["box", O.LARGE_BOX],
    /* " stone" will get stripped off, preventing a wishymatch; that actually
       lets "flint stone" be a match, so we also accept bogus "flintstone" */
    ["luck stone", O.LUCKSTONE],
    ["load stone", O.LOADSTONE],
    ["touch stone", O.TOUCHSTONE],
    ["flintstone", O.FLINT],
];

// C ref: objnam.c Japanese_items[]
const Japanese_items = [
    [O.SHORT_SWORD, "wakizashi"],
    [O.BROADSWORD, "ninja-to"],
    [O.FLAIL, "nunchaku"],
    [O.GLAIVE, "naginata"],
    [O.LOCK_PICK, "osaku"],
    [O.WOODEN_HARP, "koto"],
    [O.MAGIC_HARP, "magic koto"],
    [O.KNIFE, "shito"],
    [O.PLATE_MAIL, "tanko"],
    [O.HELMET, "kabuto"],
    [O.LEATHER_GLOVES, "yugake"],
    [O.FOOD_RATION, "gunyoki"],
    [O.POT_BOOZE, "sake"],
];

// C ref: objnam.c Japanese_item_name()
export function Japanese_item_name(i, ordinaryname) {
    for (const [item, name] of Japanese_items) {
        if (i === item)
            return name;
    }
    return ordinaryname;
}

// C ref: objnam.c wrp[], wrpsym[]
const wrp = [
    "wand",   "ring",      "potion",     "scroll", "gem",
    "amulet", "spellbook", "spell book",
    /* for non-specific wishes */
    "weapon", "armor",     "tool",       "food",   "comestible",
];
const wrpsym = [ O.WAND_CLASS,   O.RING_CLASS,   O.POTION_CLASS,
                 O.SCROLL_CLASS, O.GEM_CLASS,    O.AMULET_CLASS,
                 O.SPBOOK_CLASS, O.SPBOOK_CLASS, O.WEAPON_CLASS,
                 O.ARMOR_CLASS,  O.TOOL_CLASS,   O.FOOD_CLASS,
                 O.FOOD_CLASS ];

// C ref: objnam.c rnd_otyp_by_namedesc()
export function rnd_otyp_by_namedesc(
    name,
    oclass,
    xtra_prob) /* add to item's chance of being chosen; non-zero causes
                * 0% random generation items to also be considered */
{
    let i, n = 0;
    const validobjs = [];
    let zn, of;
    let lo, hi, prob, maxprob = 0;

    if (!name)
        return O.STRANGE_OBJECT;

    /* only skip "foo of" for "foo of bar" if target doesn't contain " of " */
    const check_of = (strstri(name, " of ") < 0);
    const minglob = O.GLOB_OF_GRAY_OOZE;
    const maxglob = O.GLOB_OF_BLACK_PUDDING;

    if (oclass) {
        lo = game.bases[oclass];
        hi = game.bases[oclass + 1] - 1;
    } else {
        lo = O.MAXOCLASSES; /* STRANGE_OBJECT + 1; */
        hi = O.NUM_OBJECTS - 1;
    }
    for (i = lo; i <= hi; ++i) {
        /* don't match extra descriptions (w/o real name) */
        if ((zn = OBJ_NAME(objects[i])) == null)
            continue;
        if (wishymatch(name, zn, true) /* objects[] name */
            /* let "<bar>" match "<foo> of <bar>" with a few exceptions */
            || (check_of
                && i !== O.BELL_OF_OPENING
                && (i < minglob || i > maxglob)
                && (of = strstri(zn, " of ")) >= 0
                && wishymatch(name, zn.slice(of + 4), false)) /* partial name */
            || ((zn = OBJ_DESCR(objects[i])) != null
                && wishymatch(name, zn, false)) /* objects[] description */
            /* "cloth" should match "piece of cloth" */
            || (zn && check_of && (of = strstri(zn, " of ")) >= 0
                && wishymatch(name, zn.slice(of + 4), false)) /* partial description */
            || ((zn = objects[i].oc_uname) != null
                && wishymatch(name, zn, false)) /* user-called name */
            ) {
            validobjs[n++] = i;
            maxprob += (objects[i].oc_prob + xtra_prob);
        }
    }

    if (n > 0 && maxprob) {
        prob = rn2(maxprob);
        for (i = 0; i < n - 1; i++)
            if ((prob -= (objects[validobjs[i]].oc_prob + xtra_prob)) < 0)
                break;
        return validobjs[i];
    }
    return O.STRANGE_OBJECT;
}

// C ref: objnam.c shiny_obj()
export function shiny_obj(oclass) {
    return rnd_otyp_by_namedesc("shiny", oclass, 0);
}

// C ref: rm.h CAN_OVERWRITE_TERRAIN()
function CAN_OVERWRITE_TERRAIN(ttyp) {
    return !!game.iflags?.debug_overwrite_stairs
        || !(ttyp === LADDER || ttyp === STAIRS);
}

// the floor objects at <x,y> in svl.level.objects[x][y] order (top first)
function level_objects_at_wt(x, y) {
    return (game.level.objects || []).filter(o => o.ox === x && o.oy === y
                                             && o.where === 'OBJ_FLOOR');
}

// C ref: objnam.c set_wallprop_from_str()
/* set wall under hero undiggable/unphaseable from string */
function set_wallprop_from_str(bp) {
    let wall_prop = 0;

    if (bp.includes("undiggable ") || bp.includes("nondiggable "))
        wall_prop |= W_NONDIGGABLE;
    if (bp.includes("unphaseable ") || bp.includes("nonpasswall "))
        wall_prop |= W_NONPASSWALL;
    /* |= because wall_info (aka flags) is overloaded with other stuff */
    if (wall_prop) {
        const lev = game.level.at(game.u.ux, game.u.uy);
        lev.wall_info = (lev.wall_info || 0) | wall_prop;
    }
}

// C ref: objnam.c wizterrainwish()
/* in wizard mode, readobjnam() can accept wishes for traps and terrain;
   a generator: it yields a thunk for each message or other async step,
   which readobjnam()'s async driver awaits in order */
function* wizterrainwish(d) {
    const u = game.u;
    let lev;
    let madeterrain = false, badterrain = false;
    let trap, oldtyp, ltyp;
    const x = u.ux, y = u.uy;
    const bp = d.bp, p = bp.length; /* p = eos(bp) */

    for (trap = NO_TRAP + 1; trap < TRAPNUM; trap++) {
        let t;
        let tname;

        tname = trapname(trap, true);
        if (!str_start_is(bp, tname, true))
            continue;
        /* found it; avoid stupid mistakes */
        if (is_hole(trap) && !Can_fall_thru(u.uz))
            trap = ROCKTRAP;
        if ((t = maketrap(x, y, trap)) != null) {
            trap = t.ttyp;
            tname = trapname(trap, true);
            const msg = `${An(tname)}${(trap !== MAGIC_PORTAL) ? "" : " to nowhere"}.`;
            yield () => pline(msg);
        } else {
            const msg = `Creation of ${an(tname)} failed.`;
            yield () => pline(msg);
        }
        return 'hands_obj';
    }

    /* furniture and terrain (use at your own risk; can clobber stairs
       or place furniture on existing traps which shouldn't be allowed) */
    lev = game.level.at(x, y);
    oldtyp = lev.typ;
    const is_dbridge = (oldtyp === DRAWBRIDGE_DOWN || oldtyp === DRAWBRIDGE_UP);
    if (!BSTRCMPI(bp, p - 8, "fountain")) {
        lev.typ = FOUNTAIN;
        if (oldtyp !== FOUNTAIN)
            game.level.flags.nfountains++;
        lev.flags = d.looted ? F_LOOTED : 0; /* looted overlays 'flags' */
        lev.blessedftn = (d.blessed || !strncmpi(bp, "magic ", 6)) ? 1 : 0;
        const msg = `A ${lev.blessedftn ? "magic " : ""}fountain.`;
        yield () => pline(msg);
        madeterrain = true;
    } else if (!BSTRCMPI(bp, p - 6, "throne")) {
        lev.typ = THRONE;
        lev.flags = d.looted ? T_LOOTED : 0; /* looted overlays 'flags' */
        yield () => pline("A throne.");
        madeterrain = true;
    } else if (!BSTRCMPI(bp, p - 4, "sink")) {
        lev.typ = SINK;
        if (oldtyp !== SINK)
            game.level.flags.nsinks++;
        lev.flags = d.looted ? (S_LPUDDING | S_LDWASHER | S_LRING) : 0;
        yield () => pline("A sink.");
        madeterrain = true;

    /* ("water" matches "potion of water" rather than terrain) */
    } else if (!BSTRCMPI(bp, p - 4, "pool")
               || !BSTRCMPI(bp, p - 4, "moat")
               || !BSTRCMPI(bp, p - 13, "wall of water")) {
        ltyp = !BSTRCMPI(bp, p - 4, "pool") ? POOL
               : !BSTRCMPI(bp, p - 4, "moat") ? MOAT
                 : WATER;
        if (!is_dbridge) {
            lev.typ = ltyp;
            lev.flags = 0;
        } else {
            /* drawbridgemask overloads flags */
            lev.drawbridgemask &= ~DB_UNDER;
            lev.drawbridgemask |= DB_MOAT;
        }
        del_engr_at(x, y);
        if (!is_dbridge) {
            const hres = u.uprops[HALLUC_RES];
            const save_prop = hres.extrinsic; /* EHalluc_resistance */
            hres.extrinsic = 1;
            const new_water = waterbody_name(x, y);
            hres.extrinsic = save_prop;
            const msg = `${An(new_water)}.`;
            yield () => pline(msg);
            /* Must manually make kelp! */
        } else {
            yield* dbterrainmesg("Moat", x, y);
        }
        const chain = level_objects_at_wt(x, y);
        yield () => water_damage_chain(chain, true);
        madeterrain = true;

    /* also matches "molten lava" */
    } else if (!BSTRCMPI(bp, p - 4, "lava")
               || !BSTRCMPI(bp, p - 12, "wall of lava")) {
        ltyp = !BSTRCMPI(bp, p - 12, "wall of lava") ? LAVAWALL : LAVAPOOL;
        if (!is_dbridge) {
            lev.typ = ltyp;
            lev.flags = 0;
        } else {
            /* drawbridgemask overloads flags */
            lev.drawbridgemask &= ~DB_UNDER;
            lev.drawbridgemask |= DB_LAVA;
        }
        del_engr_at(x, y);
        if (!is_dbridge) {
            const msg = `A ${(lev.typ === LAVAPOOL) ? "pool" : "wall"} of molten lava.`;
            yield () => pline(msg);
            if (!(Levitation() || Flying()) || lev.typ === LAVAWALL)
                yield () => pooleffects(false);
        } else {
            yield* dbterrainmesg("Lava", x, y);
        }
        const chain = level_objects_at_wt(x, y);
        yield () => fire_damage_chain(chain, true, true, x, y);
        madeterrain = true;
    } else if (!BSTRCMPI(bp, p - 3, "ice")) {
        if (!is_dbridge) {
            lev.typ = ICE;
            /* icedpool overloads flags; specifies what ice will melt into */
            lev.icedpool = (oldtyp === ROOM) ? ICED_POOL : ICED_MOAT;
            lev.flags = lev.icedpool;
        } else {
            /* drawbridgemask overloads flags */
            lev.drawbridgemask &= ~DB_UNDER;
            lev.drawbridgemask |= DB_ICE;
        }
        del_engr_at(x, y);

        if (!strncmpi(bp, "melting ", 8))
            start_melt_ice_timeout(x, y, 0);

        if (!is_dbridge) {
            const msg = `${upstart(ice_descr(x, y))}.`;
            yield () => pline(msg);
        } else {
            yield* dbterrainmesg("Ice", x, y);
        }
        madeterrain = true;
    } else if (!BSTRCMPI(bp, p - 5, "altar")) {
        let al;

        lev.typ = ALTAR;
        if (!strncmpi(bp, "chaotic ", 8))
            al = A_CHAOTIC;
        else if (!strncmpi(bp, "neutral ", 8))
            al = A_NEUTRAL;
        else if (!strncmpi(bp, "lawful ", 7))
            al = A_LAWFUL;
        else if (!strncmpi(bp, "unaligned ", 10))
            al = A_NONE;
        else /* -1 - A_CHAOTIC, 0 - A_NEUTRAL, 1 - A_LAWFUL */
            al = !rn2(6) ? A_NONE : (rn2(A_LAWFUL + 2) - 1);
        lev.altarmask = Align2amask(al); /* overlays 'flags' */
        const msg = `${An(align_str(al))} altar.`;
        yield () => pline(msg);
        madeterrain = true;
    } else if (!BSTRCMPI(bp, p - 5, "grave")
               || !BSTRCMPI(bp, p - 9, "headstone")) {
        make_grave(x, y, null);
        if (IS_GRAVE(lev.typ)) {
            lev.flags = 0; /* looted overlays 'flags' */
            lev.disturbed = d.looted ? 1 : 0;
            const msg = `A ${lev.disturbed ? "disturbed " : ""}grave.`;
            yield () => pline(msg);
            madeterrain = true;
        } else {
            yield () => pline("Can't place a grave here.");
            badterrain = true;
        }
    } else if (!BSTRCMPI(bp, p - 4, "tree")) {
        lev.typ = TREE;
        lev.flags = d.looted ? (TREE_LOOTED | TREE_SWARM) : 0;
        set_wallprop_from_str(bp);
        yield () => pline("A tree.");
        madeterrain = true;
    } else if (!BSTRCMPI(bp, p - 4, "bars")) {
        lev.typ = IRONBARS;
        lev.flags = 0;
        set_wallprop_from_str(bp);
        /* [FIXME: if this isn't a wall or door location where 'horizontal'
            is already set up, that should be calculated for this spot.] */
        yield () => pline("Iron bars.");
        madeterrain = true;
    } else if (!BSTRCMPI(bp, p - 5, "cloud")) {
        lev.typ = CLOUD;
        lev.flags = 0;
        yield () => pline("A cloud.");
        del_engr_at(x, y);
        madeterrain = true;
    } else if (!BSTRCMPI(bp, p - 4, "door")
               || (d.doorless && !BSTRCMPI(bp, p - 7, "doorway"))) {
        let dbuf;
        let old_wall_info;
        const secret = !BSTRCMPI(bp, p - 11, "secret door");

        /* require door or wall so that the 'horizontal' flag will
           already have the correct value; iron bars are surrogate walls;
           a previously dug wall looks like corridor but is actually a
           doorless doorway so will be acceptable here */
        if (lev.typ === DOOR || lev.typ === SDOOR
            || (IS_WALL(lev.typ) && lev.typ !== DBWALL)
            || lev.typ === IRONBARS) {
            /* remember previous wall info [is this right for iron bars?] */
            old_wall_info = (lev.typ !== DOOR) ? (lev.wall_info || 0) : 0;
            /* set the new terrain type */
            lev.typ = secret ? SDOOR : DOOR;
            lev.wall_info = 0; /* overlays 'flags' */
            lev.flags = 0;
            /* lev->horizontal stays as-is */
            if (Is_rogue_level(u.uz)) {
                /* all doors on the rogue level are doorless; locking magic
                   there converts them into walls rather than closed doors */
                d.doorless = 1;
                d.locked = d.closed = d.open = d.broken = 0;
            }
            /* if not locked, secret doors are implicitly closed but
               mustn't be set that way explicitly; conversion from SDOOR
               to DOOR changes NODOOR to CLOSED */
            lev.doormask = d.locked ? D_LOCKED
                           : (d.doorless || secret) ? D_NODOOR
                             : d.open ? D_ISOPEN
                               : d.broken ? D_BROKEN
                                 : D_CLOSED;
            /* SDOOR uses wall_info, restore relevant bits. */
            if (secret)
                lev.wall_info |= (old_wall_info & WM_MASK);
            /* set up trapped flag; open door states aren't eligible */
            if (d.trapped === 2 /* 2: wish includes explicit "untrapped" */
                || ((lev.doormask & (D_LOCKED | D_CLOSED)) === 0
                    /* D_CLOSED is implicit for secret doors */
                    && !secret))
                d.trapped = 0;
            if (d.trapped)
                lev.doormask |= D_TRAPPED;
            /* feedback */
            dbuf = '';
            if (lev.doormask & D_TRAPPED)
                dbuf += "trapped ";
            if (lev.doormask & D_LOCKED)
                dbuf += "locked ";
            if (lev.typ === SDOOR) {
                dbuf += "secret door";
            } else {
                /* these should be mutually exclusive but we describe them
                   as if they're independent to maybe catch future bugs... */
                if (lev.doormask & D_CLOSED)
                    dbuf += "closed ";
                if (lev.doormask & D_ISOPEN)
                    dbuf += "open ";
                if (lev.doormask & D_BROKEN)
                    dbuf += "broken ";
                if ((lev.doormask & ~D_TRAPPED) === D_NODOOR)
                    dbuf += "doorless doorway";
                else
                    dbuf += "door";
            }
            const msg = `${upstart(an(dbuf))}.`;
            yield () => pline(msg);
            madeterrain = true;
        } else {
            dbuf = secret ? "secret door" : "door";
            const msg = `${upstart(dbuf)} requires door or wall location.`;
            yield () => pline(msg);
            badterrain = true;
        }
    } else if (!BSTRCMPI(bp, p - 4, "wall")
               && (p === 4 || bp[p - 5] === ' ')) {
        let wall = HWALL;

        if ((isok(u.ux, u.uy - 1) && IS_WALL(game.level.at(u.ux, u.uy - 1).typ))
            || (isok(u.ux, u.uy + 1) && IS_WALL(game.level.at(u.ux, u.uy + 1).typ)))
            wall = VWALL;
        madeterrain = true;
        lev.typ = wall;
        lev.flags = 0;
        set_wallprop_from_str(bp);
        fix_wall_spines(Math.max(0, u.ux - 1), Math.max(0, u.uy - 1),
                        Math.min(COLNO, u.ux + 1), Math.min(ROWNO, u.uy + 1));
        yield () => pline("A wall.");
    } else if (!BSTRCMPI(bp, p - 15, "secret corridor")) {
        if (lev.typ === CORR) {
            lev.typ = SCORR;
            /* neither CORR nor SCORR uses 'flags' or 'horizontal' */
            yield () => pline("Secret corridor.");
            madeterrain = true;
        } else {
            yield () => pline("Secret corridor requires corridor location.");
            badterrain = true;
        }
    } else if (!BSTRCMPI(bp, p - 4, "room")
               || !BSTRCMPI(bp, p - 5, "floor")
               || !BSTRCMPI(bp, p - 6, "ground")) {
        if (oldtyp === ROOM
            || (IS_FURNITURE(oldtyp) && CAN_OVERWRITE_TERRAIN(oldtyp))
            || oldtyp === ICE || is_pool_or_lava(x, y)) {
            let t;

            lev.typ = ROOM;
            yield () => pline("Room floor.");
            if (IS_FURNITURE(oldtyp))
                count_level_features();
            if ((t = t_at(x, y)) != null && t.ttyp !== MAGIC_PORTAL)
                deltrap(t);
            madeterrain = true;
        } else if (is_dbridge) {
            lev.drawbridgemask &= ~DB_UNDER;
            lev.drawbridgemask |= DB_FLOOR;
            yield* dbterrainmesg("Floor", x, y);
            madeterrain = true;
        } else {
            yield () => pline("Room|floor|ground not allowed here.");
            badterrain = true;
        }
    }

    if (madeterrain) {
        feel_newsym(x, y); /* map the spot where the wish occurred */

        /* hero started at <x,y> but might not be there anymore (create
           lava, decline to die, and get teleported away to safety) */
        if (u.uinwater && !is_pool(u.ux, u.uy)) {
            yield () => set_uinwater(0); /* u.uinwater = 0; leave the water */
            yield () => docrt();
            /* [block/unblock_point handled by docrt -> vision_recalc] */
        } else {
            if (u.utrap && u.utraptype === TT_LAVA && !is_lava(u.ux, u.uy))
                yield () => reset_utrap(false);
            recalc_block_point(x, y);
        }

        /* fixups for replaced terrain that aren't handled above */
        if (IS_FOUNTAIN(oldtyp) || IS_SINK(oldtyp))
            count_level_features(); /* update level.flags.nfountains,nsinks */
        if (!is_ice(x, y))
            spot_stop_timers(x, y, MELT_ICE_AWAY);
        /* horizontal is overlaid by fountain->blessedftn, grave->disturbed */
        if (IS_FOUNTAIN(oldtyp) || IS_GRAVE(oldtyp)
            || IS_WALL(oldtyp) || oldtyp === IRONBARS
            || IS_DOOR(oldtyp) || oldtyp === SDOOR) {
            /* when new terrain is a fountain, 'blessedftn' was explicitly
               set above; likewise for grave and 'disturbed'; when it's a
               door, the old type was a wall or a door and we retain the
               'horizontal' value from those */
            if (!IS_FOUNTAIN(lev.typ) && !IS_GRAVE(lev.typ)
                && !IS_DOOR(lev.typ) && lev.typ !== SDOOR) {
                lev.horizontal = false; /* also clears blessedftn, disturbed */
                lev.blessedftn = 0;
                lev.disturbed = 0;
            }
        }
        /* note: lev->lit and lev->nondiggable retain their values even
           though those might not make sense with the new terrain */

        /* might have changed terrain from something that blocked
           levitation and flying to something that doesn't */
        yield () => switch_terrain();
    }
    if (madeterrain || badterrain)
        return 'hands_obj';

    return null;
}

// C ref: objnam.c dbterrainmesg()
/* message common to several wizterrainwish() results */
function* dbterrainmesg(newtype, x, y) {
    const msg = `${newtype} ${(game.level.at(x, y).typ === DRAWBRIDGE_UP)
        ? "in front of" : "under"} the drawbridge.`;
    yield () => pline(msg);
}

// hack.h tin varieties; objnam.c readobjnam contents codes
const RANDOM_TIN = -2;
const TIN_UNDEFINED = 0;
const TIN_EMPTY = 1;
const TIN_SPINACH = 2;
const SPE_LIM = 99; /* obj.h */
// hack.h CORPSTAT_*
const CORPSTAT_RANDOM = 0;
const CORPSTAT_FEMALE = 1;
const CORPSTAT_MALE = 2;
const CORPSTAT_NEUTER = 3;
const CORPSTAT_HISTORIC = 0x04;


// C ref: objnam.c setbp() has no C counterpart: it stands for an in-place
// edit of the buffer at d->bp, which origbp (the buffer's start) also sees
function setbp(d, newbp) {
    if (d.bp_in_origbuf)
        d.origbp = d.origbp.slice(0, d.origbp.length - d.bp.length) + newbp;
    d.bp = newbp;
}

// C ref: objnam.c readobjnam_init()
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
    d.bp = d.origbp = bp;
    d.bp_in_origbuf = true;
    d.name = null;
    d.ftype = game.context?.current_fruit || 0;
    d.globbuf = '';
    d.fruitbuf = '';
}

// C ref: objnam.c readobjnam_preparse()
/* return 1 if d->bp is empty or contains only various qualifiers like
   "blessed", "rustproof", and so on, or 0 if anything else is present */
function readobjnam_preparse(d) {
    let save_bp = null;
    let more_l = 0, res = 1;

    for (;;) {
        let l;
        const bp = d.bp;
        const at = (s) => !strncmpi(bp, s, (l = s.length));

        if (!d.bp)
            break;
        res = 0;

        if (at("an ") || at("a ")) {
            d.cnt = 1;
        } else if (at("the ")) {
            ; /* just increment `bp' by `l' below */
        } else if (!d.cnt && /^[0-9]/.test(bp) && bp !== "0") {
            d.cnt = parseInt(bp, 10);
            l = bp.match(/^[0-9]* */)[0].length;
        } else if (bp[0] === '+' || bp[0] === '-') {
            d.spesgn = (bp[0] === '+') ? 1 : -1;
            const m = bp.slice(1).match(/^([0-9]*) */);
            d.spe = parseInt(bp.slice(1), 10) || 0; /* atoi() */
            l = 1 + m[0].length;
        } else if (at("blessed ") || at("holy ")) {
            d.blessed = 1, d.uncursed = d.iscursed = 0;
        } else if (at("cursed ") || at("unholy ")) {
            d.iscursed = 1, d.blessed = d.uncursed = 0;
        } else if (at("uncursed ")) {
            d.uncursed = 1, d.blessed = d.iscursed = 0;
        } else if (at("rustproof ") || at("erodeproof ")
                   || at("corrodeproof ") || at("fixed ")
                   || at("fireproof ") || at("rotproof ")
                   || at("tempered ") || at("crackproof ")) {
            d.erodeproof = 1;
        } else if (at("lit ") || at("burning ")) {
            d.islit = 1;
        } else if (at("unlit ") || at("extinguished ")) {
            d.islit = 0;

        /* "wet" and "moist" are only applicable for towels */
        } else if (at("moist ") || at("wet ")) {
            if (!strncmpi(bp, "wet ", 4))
                d.wetness = 3 + rn2(3); /* 3..5 */
            else
                d.wetness = rnd(2); /* 1..2 */

        /* "unlabeled" and "blank" are synonymous */
        } else if (at("unlabeled ") || at("unlabelled ") || at("blank ")) {
            d.unlabeled = 1;
        } else if (at("poisoned ")) {
            d.ispoisoned = 1;

        /* "trapped" recognized but not honored outside wizard mode */
        } else if (at("trapped ")) {
            d.trapped = 0; /* undo any previous "untrapped" */
            if (wizard())
                d.trapped = 1;
        } else if (at("untrapped ")) {
            d.trapped = 2; /* not trapped */

        /* locked, unlocked, broken: box/chest lock states, also door states;
           open, closed, doorless: additional door states */
        } else if (at("locked ")) {
            d.locked = d.closed = 1,
                d.unlocked = d.broken = d.open = d.doorless = 0;
        } else if (at("unlocked ")) {
            d.unlocked = d.closed = 1,
                d.locked = d.broken = d.open = d.doorless = 0;
        } else if (at("broken ")) {
            d.broken = 1,
                d.locked = d.unlocked = d.open = d.closed
                = d.doorless = 0;
        } else if (at("open ")) {
            d.open = 1,
                d.closed = d.locked = d.broken = d.doorless = 0;
        } else if (at("closed ")) {
            d.closed = 1,
                d.open = d.locked = d.broken = d.doorless = 0;
        } else if (at("doorless ")) {
            d.doorless = 1,
                d.open = d.closed = d.locked = d.unlocked = d.broken = 0;
        /* looted: fountain/sink/throne/tree; disturbed: grave */
        } else if (at("looted ") || at("disturbed ")) {
            d.looted = 1;
        } else if (at("greased ")) {
            d.isgreased = 1;
        } else if (at("zombifying ")) {
            d.zombify = true;
        } else if (at("very ")) {
            /* very rusted very heavy iron ball */
            d.very = 1;
        } else if (at("thoroughly ")) {
            d.very = 2;
        } else if (at("rusty ") || at("rusted ") || at("burnt ")
                   || at("burned ") || at("cracked ")) {
            d.eroded = 1 + d.very;
            d.very = 0;
        } else if (at("corroded ") || at("rotted ")) {
            d.eroded2 = 1 + d.very;
            d.very = 0;
        } else if (at("partly eaten ") || at("partially eaten ")) {
            d.halfeaten = 1;
        } else if (at("historic ")) {
            d.ishistoric = 1;
        } else if (at("diluted ")) {
            d.isdiluted = 1;
        } else if (at("empty ")) {
            d.contents = TIN_EMPTY;
        } else if (at("small ")) { /* glob sizes */
            if (strncmpi(bp.slice(l), "glob", 4) && strstri(bp.slice(l), " glob") < 0)
                break;
            d.gsize = 1;
        } else if (at("medium ")) {
            d.gsize = 2;
        } else if (at("large ")) {
            if (strncmpi(bp.slice(l), "glob", 4) && strstri(bp.slice(l), " glob") < 0)
                break;
            /* "very large " had "very " peeled off on previous iteration */
            d.gsize = (d.very !== 1) ? 3 : 4;
        } else if (at("real ")) {
            d.real = 1;
        } else if (at("fake ")) {
            d.fake = 1, d.real = 0;
        } else if (at("female ") || at("male ") || at("neuter ")) {
            const gword = bp.slice(0, l);
            d.mgend = (gword === "female " || lowc(bp[0]) === 'f') ? FEMALE
                      : lowc(bp[0]) === 'm' ? MALE : NEUTRAL;
            /* if after "corpse/statue/figurine of", remove from string */
            if (save_bp) {
                const newbp = strsubst(bp, gword.toLowerCase(), "");
                save_bp = save_bp.slice(0, save_bp.length - bp.length) + newbp;
                setbp(d, newbp);
                l = 0;
            }

        /*
         * Corpse/statue/figurine gender hack:  in order to accept
         * "statue of a female gnome ruler" for gnome queen we need
         * to recognize and skip over "statue of [a ]".
         */
        } else if ((at("corpse ") || at("statue ") || at("figurine "))
                   && !strncmpi(bp.slice(l), "of ", more_l = 3)) {
            save_bp = bp; /* we'll backtrack to here later */
            l += more_l, more_l = 0;
            const r = bp.slice(l);
            if (!strncmpi(r, "a ", more_l = 2)
                || !strncmpi(r, "an ", more_l = 3)
                || !strncmpi(r, "the ", more_l = 4))
                l += more_l;
        } else {
            break;
        }
        d.bp = d.bp.slice(l);
    }
    if (save_bp)
        d.bp = save_bp;
    return res;
}

// C ref: objnam.c readobjnam_parse_charges()
function readobjnam_parse_charges(d) {
    let p;

    if (d.bp.length > 1 && (p = d.bp.lastIndexOf('(')) >= 0) {
        let keeptrailingchars = true;
        let idx = 0;

        if (p > 0 && d.bp[p - 1] === ' ')
            idx = -1;
        const head = d.bp.slice(0, p + idx); /* terminate bp */
        let rest = d.bp.slice(p + 1); /* advance past '(' */
        let q = 0;
        if (!strncmpi(rest, "lit)", 4)) {
            d.islit = 1;
            q = 4 - 1; /* point at ')' */
        } else {
            d.spe = parseInt(rest, 10) || 0;
            while (/[0-9]/.test(rest[q] || ''))
                q++;
            if (rest[q] === ':') {
                q++;
                d.rechrg = d.spe;
                d.spe = parseInt(rest.slice(q), 10) || 0;
                while (/[0-9]/.test(rest[q] || ''))
                    q++;
            }
            if (rest[q] !== ')') {
                d.spe = d.rechrg = 0;
                /* mis-matched parentheses; rest of string will be ignored */
                keeptrailingchars = false;
            } else {
                d.spesgn = 1;
            }
        }
        setbp(d, keeptrailingchars ? head + rest.slice(q + 1) : head);
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

// C ref: objnam.c readobjnam_postparse1()
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
    if ((p = strstri(d.bp, " named ")) >= 0) {
        /* note: if 'name' is too long, oname() will truncate it */
        d.name = d.bp.slice(p + 7);
        setbp(d, d.bp.slice(0, p));
    }
    if ((p = strstri(d.bp, " called ")) >= 0) {
        /* note: if 'un' is too long, obj lookup just won't match anything */
        d.un = d.bp.slice(p + 8);
        setbp(d, d.bp.slice(0, p));
        /* "helmet called telepathy" is not "helmet" (a specific type)
         * "shield called reflection" is not "shield" (a general type)
         */
        for (i = 0; i < o_ranges.length; i++)
            if (!strcmpi(d.bp, o_ranges[i].name)) {
                d.oclass = o_ranges[i].oclass;
                return 1; /*goto srch;*/
            }
    }
    if ((p = strstri(d.bp, " labeled ")) >= 0) {
        d.dn = d.bp.slice(p + 9);
        setbp(d, d.bp.slice(0, p));
    } else if ((p = strstri(d.bp, " labelled ")) >= 0) {
        d.dn = d.bp.slice(p + 10);
        setbp(d, d.bp.slice(0, p));
    }
    if ((p = strstri(d.bp, " of spinach")) >= 0) {
        setbp(d, d.bp.slice(0, p));
        d.contents = TIN_SPINACH;
    }
    /* real vs fake is only useful for wizard mode but we'll accept its
       parsing in normal play (result is never real Amulet for that case) */
    if ((p = strstri(d.bp, OBJ_DESCR(objects[O.AMULET_OF_YENDOR]))) >= 0
        && (p === 0 || d.bp[p - 1] === ' ')) {
        let s = d.bp;

        if (!strncmpi(s, "cheap ", 6))
            d.fake = 1, s = s.slice(6);
        if (!strncmpi(s, "plastic ", 8))
            d.fake = 1, s = s.slice(8);
        if (!strncmpi(s, "imitation ", 10))
            d.fake = 1, s = s.slice(10);
        /* when 'fake' is True, it overrides 'real' if both were given;
           when it is False, force 'real' whether that was specified or not */
        d.real = !d.fake ? 1 : 0;
        d.typ = d.real ? O.AMULET_OF_YENDOR : O.FAKE_AMULET_OF_YENDOR;
        return 2; /*goto typfnd;*/
    }

    /*
     * Skip over "pair of ", "pairs of", "set of" and "sets of".
     */
    if (!strncmpi(d.bp, "pair of ", 8)) {
        d.bp = d.bp.slice(8);
        d.cnt *= 2;
    } else if (!strncmpi(d.bp, "pairs of ", 9)) {
        d.bp = d.bp.slice(9);
        if (d.cnt > 1)
            d.cnt *= 2;
    } else if (!strncmpi(d.bp, "set of ", 7)) {
        d.bp = d.bp.slice(7);
    } else if (!strncmpi(d.bp, "sets of ", 8)) {
        d.bp = d.bp.slice(8);
    }

    /* Intercept pudding globs here; they're a valid wish target,
     * but we need them to not get treated like a corpse.
     */
    i = d.bp.length;
    p = -1;
    /* check for "glob", "<foo> glob", and "glob of <foo>" */
    if (!strcmpi(d.bp, "glob") || !BSTRCMPI(d.bp, i - 5, " glob")
        || !strcmpi(d.bp, "globs")
        || !BSTRCMPI(d.bp, i - 6, " globs")
        || (p = strstri(d.bp, "glob of ")) >= 0
        || (p = strstri(d.bp, "globs of ")) >= 0) {
        d.mntmp = name_to_mon((p < 0) ? d.bp
                              : d.bp.slice(p + strstri(d.bp.slice(p), " of ") + 4),
                              null);
        /* if we didn't recognize monster type, pick a valid one at random */
        if (d.mntmp === NON_PM)
            d.mntmp = rn1(PM_BLACK_PUDDING - PM_GRAY_OOZE, PM_GRAY_OOZE);
        if (d.cnt < 2 && strstri(d.bp, "globs") >= 0)
            d.cnt = 2; /* affects otmp->owt but not otmp->quan for globs */
        /* construct canonical spelling */
        d.globbuf = `glob of ${mons[d.mntmp].pmnames[NEUTRAL]}`;
        d.bp = d.globbuf;
        d.bp_in_origbuf = false;
        d.mntmp = NON_PM; /* not useful for "glob of <foo>" object lookup */
        d.oclass = O.FOOD_CLASS;
        d.actualn = d.bp, d.dn = null;
        return 1; /*goto srch;*/
    } else {
        /*
         * Find corpse type using "of" (figurine of an orc, tin of orc meat)
         * Don't check if it's a wand or spellbook.
         * (avoid "wand/finger of death" confusion).
         */
        if (strstri(d.bp, "wand ") < 0 && strstri(d.bp, "spellbook ") < 0
            && strstri(d.bp, "gauntlets ") < 0 && strstri(d.bp, "gloves ") < 0
            && strstri(d.bp, "finger ") < 0) {
            if ((p = strstri(d.bp, "tin of ")) >= 0) {
                if (!strcmpi(d.bp.slice(p + 7), "spinach")) {
                    d.contents = TIN_SPINACH;
                    d.mntmp = NON_PM;
                } else {
                    not_ported('tin_variety_txt()');
                }
                d.typ = O.TIN;
                return 2; /*goto typfnd;*/
            } else if ((p = strstri(d.bp, " of ")) >= 0) {
                const g = { v: d.mgend };
                d.mntmp = name_to_mon(d.bp.slice(p + 4), g);
                d.mgend = g.v;
                if (d.mntmp >= LOW_PM)
                    setbp(d, d.bp.slice(0, p));
            }
        }
    }
    /* Find corpse type w/o "of" (red dragon scale mail, yeti corpse) */
    if (strncmpi(d.bp, "samurai sword", 13)  /* not the "samurai" monster! */
        && strncmpi(d.bp, "wizard lock", 11) /* not the "wizard" monster! */
        && strncmpi(d.bp, "death wand", 10)  /* 'of inversion', not Rider */
        && strncmpi(d.bp, "master key", 10)  /* not the "master" rank */
        && strncmpi(d.bp, "ninja-to", 8)     /* not the "ninja" rank */
        && strncmpi(d.bp, "magenta", 7)) {   /* not the "mage" rank */
        const rest = { p: null };
        let g;

        if (d.mntmp < LOW_PM && d.bp.length > 2
            && ((g = { v: d.mgend }),
                (d.mntmp = name_to_monplus(d.bp, rest, g)), (d.mgend = g.v),
                d.mntmp >= LOW_PM)) {
            const obp = d.bp;
            /* offset of 'rest' within obp (C: pointer difference) */
            const roff = obp.length - rest.p.length;

            /* 'rest' is a pointer past the matching portion */
            d.bp = rest.p;

            if (d.bp[0] === ' ') {
                d.bp = d.bp.slice(1);
            } else if (!strncmpi(d.bp, "s ", 2)
                       || (roff > 0
                           && !strncmpi(obp.slice(roff - 1), "s' ", 3))) {
                d.bp = d.bp.slice(2);
            } else if (!strncmpi(d.bp, "es ", 3)
                       || !strncmpi(d.bp, "'s ", 3)) {
                d.bp = d.bp.slice(3);
            } else if (!d.bp && !d.actualn && !d.dn && !d.un
                       && !d.oclass) {
                /* no referent; they don't really mean a monster type */
                d.bp = obp;
                d.mntmp = NON_PM;
            }
        }
    }

    /* first change to singular if necessary */
    if (d.bp
        /* we want "tricks" to match "bag of tricks" [rnd_otyp_by_namedesc()] */
        && strcmpi(d.bp, "tricks")
        /* an odd potential wish; fail rather than get a false match with
           "cloth" */
        && strcmpi(d.bp, "clothes")
        ) {
        const sng = makesingular(d.bp);

        if (d.bp !== sng) {
            if (d.cnt === 1)
                d.cnt = 2;
            setbp(d, sng);
        }
    }

    /* Alternate spellings (pick-ax, silver sabre, &c) */
    {
        for (const [sp, ob] of spellings) {
            if (wishymatch(d.bp, sp, true)) {
                d.typ = ob;
                return 2; /*goto typfnd;*/
            }
        }
        /* can't use spellings list for this one due to shuffling */
        if (!strncmpi(d.bp, "grey spell", 10))
            setbp(d, d.bp.slice(0, 2) + 'a' + d.bp.slice(3));

        if ((p = strstri(d.bp, "armour")) >= 0) {
            /* skip past "armo", then copy remainder beyond "u" */
            setbp(d, d.bp.slice(0, p + 4) + d.bp.slice(p + 5));
        }
    }

    /* dragon scales - assumes order of dragons */
    if (!strcmpi(d.bp, "scales") && d.mntmp >= PM_GRAY_DRAGON
        && d.mntmp <= PM_YELLOW_DRAGON) {
        d.typ = O.GRAY_DRAGON_SCALES + d.mntmp - PM_GRAY_DRAGON;
        d.mntmp = NON_PM; /* no monster */
        return 2; /*goto typfnd;*/
    }

    p = d.bp.length; /* d->p = eos(d->bp) */
    d.p = p;
    if (!BSTRCMPI(d.bp, p - 10, "holy water")) {
        if (!BSTRNCMPI(d.bp, p - 10 - 2, "un", 2))
            d.iscursed = 1, d.blessed = d.uncursed = 0; /* unholy water */
        else
            d.blessed = 1, d.iscursed = d.uncursed = 0; /* holy water */
        d.typ = O.POT_WATER;
        return 2; /*goto typfnd;*/
    }
    /* accept "paperback" or "paperback book", reject "paperback spellbook" */
    if (!strncmpi(d.bp, "paperback", 9)) {
        const dbp = d.bp.slice(9); /* just past "paperback" */

        if (!dbp || !strncmpi(dbp, " book", 5)) {
            d.typ = O.SPE_NOVEL;
            return 2; /*goto typfnd;*/
        } else {
            d.otmp = null;
            return 3;
        }
    }
    if (d.unlabeled && !BSTRCMPI(d.bp, p - 6, "scroll")) {
        d.typ = O.SCR_BLANK_PAPER;
        return 2; /*goto typfnd;*/
    }
    if (d.unlabeled && !BSTRCMPI(d.bp, p - 9, "spellbook")) {
        d.typ = O.SPE_BLANK_PAPER;
        return 2; /*goto typfnd;*/
    }
    /* specific food rather than color of gem/potion/spellbook[/scales] */
    if (!BSTRCMPI(d.bp, p - 6, "orange") && d.mntmp === NON_PM) {
        d.typ = O.ORANGE;
        return 2; /*goto typfnd;*/
    }
    /*
     * NOTE: Gold pieces are handled as objects nowadays.
     */
    if (!BSTRCMPI(d.bp, p - 10, "gold piece")
        || !BSTRCMPI(d.bp, p - 7, "zorkmid")
        || !strcmpi(d.bp, "gold") || !strcmpi(d.bp, "money")
        || !strcmpi(d.bp, "coin") || d.bp[0] === O.GOLD_SYM) {
        if (d.cnt > 5000 && !wizard())
            d.cnt = 5000;
        else if (d.cnt < 1)
            d.cnt = 1;
        d.otmp = mksobj(O.GOLD_PIECE, false, false);
        d.otmp.quan = d.cnt;
        d.otmp.owt = weight(d.otmp);
        /* disp.botl = TRUE: status line flags are not ported yet */
        return 3; /*return otmp;*/
    }

    /* check for single character object class code ("/" for wand, &c) */
    if (d.bp.length === 1 && (i = def_char_to_objclass(d.bp[0])) < O.MAXOCLASSES
        && i > O.ILLOBJ_CLASS && (i !== O.VENOM_CLASS || wizard())) {
        d.oclass = i;
        return 4; /*goto any;*/
    }

    /* Search for class names: XXXXX potion, scroll of XXXXX.
       Avoid false hits on, e.g., rings for "ring mail". */
    if (strncmpi(d.bp, "enchant ", 8)
        && strncmpi(d.bp, "destroy ", 8)
        && strncmpi(d.bp, "detect food", 11)
        && strncmpi(d.bp, "food detection", 14)
        && strncmpi(d.bp, "ring mail", 9)
        && strncmpi(d.bp, "studded leather armor", 21)
        && strncmpi(d.bp, "leather armor", 13)
        && strncmpi(d.bp, "tooled horn", 11)
        && strncmpi(d.bp, "food ration", 11)
        && strncmpi(d.bp, "meat ring", 9))
        for (i = 0; i < wrpsym.length; i++) {
            const j = wrp[i].length;

            /* check for "<class> [ of ] something" */
            if (!strncmpi(d.bp, wrp[i], j)) {
                d.oclass = wrpsym[i];
                if (d.oclass !== O.AMULET_CLASS) {
                    d.bp = d.bp.slice(j);
                    if (!strncmpi(d.bp, " of ", 4))
                        d.actualn = d.bp.slice(4);
                    /* else if(*bp) ?? */
                } else
                    d.actualn = d.bp;
                return 1; /*goto srch;*/
            }
            /* check for "something <class>" */
            if (!BSTRCMPI(d.bp, p - j, wrp[i])) {
                d.oclass = wrpsym[i];
                /* for "foo amulet", leave the class name so that
                   wishymatch() can do "of inversion" */
                if (d.oclass !== O.AMULET_CLASS) {
                    let e = p - j;
                    if (e > 0 && d.bp[e - 1] === ' ')
                        e -= 1;
                    setbp(d, d.bp.slice(0, e));
                } else {
                    /* amulet without "of"; convoluted wording but better a
                       special case that's handled than one that's missing */
                    if (!strncmpi(d.bp, "versus poison ", 14)) {
                        d.typ = O.AMULET_VERSUS_POISON;
                        return 2; /*goto typfnd;*/
                    }
                    /* check for "<shape> amulet"; strip off trailing
                       " amulet" for that w/o changing contents of d->bp */
                    let l = d.bp.length - j;
                    if (l > 0 && d.bp[l - 1] === ' ')
                        l -= 1;
                    const amubuf = d.bp.slice(0, Math.max(l, 0));
                    const k = rnd_otyp_by_namedesc(amubuf, O.AMULET_CLASS, 0);
                    if (k !== O.STRANGE_OBJECT) {
                        d.typ = k;
                        return 2; /*goto typfnd;*/
                    }
                }
                d.actualn = d.dn = d.bp;
                return 1; /*goto srch;*/
            }
        }

    /* Wishing in wizard mode can create traps and furniture.
     * Part I:  distinguish between trap and object for the two
     * types of traps which have corresponding objects:  bear trap
     * and land mine.
     */
    if (wizard() && (!strncmpi(d.bp, "bear", 4)
                     || !strncmpi(d.bp, "land", 4))) {
        not_ported('wizard-mode bear trap/land mine wishes');
    }

    return 0;
}

// C ref: objnam.c readobjnam_postparse2()
function readobjnam_postparse2(d) {
    let i;
    const p = d.bp.length; /* d->p still points at eos(bp) */

    /* "grey stone" check must be before general "stone" */
    for (i = 0; i < o_ranges.length; i++)
        if (!strcmpi(d.bp, o_ranges[i].name)) {
            d.typ = rnd_class(o_ranges[i].f_o_range, o_ranges[i].l_o_range);
            return 2; /*goto typfnd;*/
        }

    if (!BSTRCMPI(d.bp, p - 6, " stone")
        || !BSTRCMPI(d.bp, p - 4, " gem")) {
        setbp(d, d.bp.slice(0, p + (!strcmpi(d.bp.slice(p - 4), " gem") ? -4 : -6)));
        d.oclass = O.GEM_CLASS;
        d.dn = d.actualn = d.bp;
        return 1; /*goto srch;*/
    } else if (!strcmpi(d.bp, "looking glass")) {
        ; /* avoid false hit on "* glass" */
    } else if (!BSTRCMPI(d.bp, p - 6, " glass")
               || !strcmpi(d.bp, "glass")) {
        let s = d.bp;

        /* treat "broken glass" as a non-existent item */
        if (d.broken || strstri(s, "broken") >= 0) {
            d.otmp = null;
            return 3; /* return otmp */
        }
        if (!strncmpi(s, "worthless ", 10))
            s = s.slice(10);
        if (!strncmpi(s, "piece of ", 9))
            s = s.slice(9);
        if (!strncmpi(s, "colored ", 8))
            s = s.slice(8);
        else if (!strncmpi(s, "coloured ", 9))
            s = s.slice(9);
        if (!strcmpi(s, "glass")) { /* choose random color */
            /* 9 different kinds */
            d.typ = O.FIRST_GLASS_GEM + rn2(O.NUM_GLASS_GEMS);
            if (objects[d.typ].oc_class === O.GEM_CLASS)
                return 2; /*goto typfnd;*/
            else
                d.typ = 0; /* somebody changed objects[]? punt */
        } else { /* try to construct canonical form */
            setbp(d, "worthless piece of " + s); /* assume it starts with the color */
        }
    }

    d.actualn = d.bp;
    if (!d.dn)
        d.dn = d.actualn; /* ex. "skull cap" */

    return 0;
}

// C ref: objnam.c readobjnam_postparse3()
function readobjnam_postparse3(d) {
    let i;

    /* check real names of gems first */
    if (!d.oclass && d.actualn) {
        for (i = game.bases[O.GEM_CLASS]; i <= O.LAST_REAL_GEM; i++) {
            let zn;

            if ((zn = OBJ_NAME(objects[i])) != null && !strcmpi(d.actualn, zn)) {
                d.typ = i;
                return 2; /*goto typfnd;*/
            }
        }
        /* "tin of foo" would be caught above, but plain "tin" has
           a random chance of yielding "tin wand" unless we do this */
        if (!strcmpi(d.actualn, "tin")) {
            d.typ = O.TIN;
            return 2; /*goto typfnd;*/
        }
    }

    if (((d.typ = rnd_otyp_by_namedesc(d.actualn, d.oclass, 1))
         !== O.STRANGE_OBJECT)
        || (d.dn !== d.actualn
            && ((d.typ = rnd_otyp_by_namedesc(d.dn, d.oclass, 1))
                !== O.STRANGE_OBJECT))
        || ((d.typ = rnd_otyp_by_namedesc(d.un, d.oclass, 1))
             !== O.STRANGE_OBJECT)
        || (d.origbp !== d.actualn
            && ((d.typ = rnd_otyp_by_namedesc(d.origbp, d.oclass, 1))
                !== O.STRANGE_OBJECT)))
        return 2; /*goto typfnd;*/
    d.typ = 0;

    if (d.actualn) {
        for (const [item, name] of Japanese_items) {
            if (!strcmpi(d.actualn, name)) {
                d.typ = item;
                return 2; /*goto typfnd;*/
            }
        }
    }
    /* if we've stripped off "armor" and failed to match anything
       in objects[], append "mail" and try again */
    if (d.oclass === O.ARMOR_CLASS && strstri(d.bp, "mail") < 0) {
        const oldbp = d.bp;
        setbp(d, d.bp + " mail");
        if (d.dn === oldbp)
            d.dn = d.bp; /* d->dn aliases the same buffer */
        return 6; /*goto retry;*/
    }
    if (!strcmpi(d.bp, "spinach")) {
        d.contents = TIN_SPINACH;
        d.typ = O.TIN;
        return 2; /*goto typfnd;*/
    }
    /* Fruits must not mess up the ability to wish for real objects, so
     * they are checked for last, after stripping all the possible
     * prefixes and seeing if there's a real name in there.
     */
    /* Note: not strcmpi.  2 fruits, one capital, one not, are possible.
       Also not strncmp. */
    {
        let fp, l, cntf;
        let blessedf, iscursedf, uncursedf, halfeatenf;

        blessedf = iscursedf = uncursedf = halfeatenf = 0;
        cntf = 0;

        fp = d.fruitbuf;
        for (;;) {
            if (!fp)
                break;
            if (!strncmpi(fp, "an ", l = 3) || !strncmpi(fp, "a ", l = 2)) {
                cntf = 1;
            } else if (!cntf && fp[0] >= '0' && fp[0] <= '9') {
                cntf = parseInt(fp, 10);
                fp = fp.replace(/^[0-9]+/, '').replace(/^ +/, '');
                l = 0;
            } else if (!strncmpi(fp, "blessed ", l = 8)) {
                blessedf = 1;
            } else if (!strncmpi(fp, "cursed ", l = 7)) {
                iscursedf = 1;
            } else if (!strncmpi(fp, "uncursed ", l = 9)) {
                uncursedf = 1;
            } else if (!strncmpi(fp, "partly eaten ", l = 13)
                       || !strncmpi(fp, "partially eaten ", l = 16)) {
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
                d.typ = O.SLIME_MOLD;
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
        const objtyp = { otyp: 0 };

        /* Perhaps it's an artifact specified by name, not type */
        d.name = artifact_name(d.actualn, objtyp, true);
        if (d.name) {
            d.typ = objtyp.otyp;
            return 2; /*goto typfnd;*/
        }
    }

    /* got a class, but not specific type;
       check alternate spellings of items with matching classes */
    if (d.oclass && !d.typ) {
        for (const [sp, ob] of spellings) {
            if (objects[ob].oc_class === d.oclass
                && wishymatch(d.bp, sp, true)) {
                d.typ = ob;
                return 2; /*goto typfnd;*/
            }
        }
    }

    return 0;
}

// readobjnam() for an async caller (makewish()): awaits each async step
// readobjnam() yields
export async function readobjnam_async(bp, no_wish) {
    const it = readobjnam(bp, no_wish);
    for (let r = it.next(); ; r = it.next()) {
        if (r.done)
            return r.value;
        await r.value();
    }
}

// readobjnam() for a synchronous caller (Lua obj.new())
export function readobjnam_sync(bp, no_wish) {
    const r = readobjnam(bp, no_wish).next();
    if (!r.done)
        throw new Error('readobjnam(): wizterrainwish() message in a synchronous caller not ported yet');
    return r.value;
}

// C ref: objnam.c readobjnam()
/*
 * Return something wished for.  Specifying a null pointer for
 * the user request string results in a random object.  Otherwise,
 * if asking explicitly for "nothing" (or "nil") return no_wish;
 * if not an object return &hands_obj (here: the string 'hands_obj');
 * if an error (no matching object), return null.
 */
/* JS: a generator, so the async steps of wizterrainwish() (its messages)
   happen in order; callers use readobjnam_async() or readobjnam_sync() */
function* readobjnam(bp, no_wish) {
    const d = {};
    let label = null;

    readobjnam_init(bp, d);
    if (bp == null) {
        label = 'any';
    } else {
        /* first, remove extra whitespace they may have typed */
        bp = mungspaces(bp);
        d.bp = d.origbp = bp;
        /* allow wishing for "nothing" to preserve wishless conduct... */
        if (!strcmpi(bp, "nothing") || !strcmpi(bp, "nil")
            || !strcmpi(bp, "none"))
            return no_wish;
        /* save the [nearly] unmodified choice string */
        d.fruitbuf = bp;

        if (readobjnam_preparse(d))
            label = 'any';
    }

    if (!label) {
        if (!d.cnt)
            d.cnt = 1; /* will be changed to 2 if makesingular() changes string */

        readobjnam_parse_charges(d);

        const res1 = readobjnam_postparse1(d);
        label = res1 === 1 ? 'srch' : res1 === 2 ? 'typfnd'
                : res1 === 4 ? 'any' : res1 === 5 ? 'wiztrap' : 'retry';
        if (res1 === 3)
            return d.otmp;
    }

    /* the retry/srch loop (C: goto retry; goto srch) */
    while (label === 'retry' || label === 'srch') {
        if (label === 'retry') {
            const res2 = readobjnam_postparse2(d);
            if (res2 === 3)
                return d.otmp;
            label = res2 === 1 ? 'srch' : res2 === 2 ? 'typfnd'
                    : res2 === 4 ? 'any' : res2 === 5 ? 'wiztrap' : 'srch';
            continue;
        }
        /* srch: */
        const res3 = readobjnam_postparse3(d);
        if (res3 === 3)
            return d.otmp;
        label = res3 === 1 ? 'srch' : res3 === 2 ? 'typfnd'
                : res3 === 4 ? 'any' : res3 === 6 ? 'retry' : 'wiztrap';
    }

    if (label === 'wiztrap') {
        /*
         * Let wizards wish for traps and furniture.
         */
        if (wizard() && !game.program_state?.wizkit_wishing && !d.oclass) {
            /* [inline code moved to separate routine to unclutter readobjnam] */
            if ((d.otmp = yield* wizterrainwish(d)) != null)
                return d.otmp;
        }

        label = null;
        if (!d.oclass && !d.typ) {
            if (!strncmpi(d.bp, "polearm", 7)) {
                not_ported('rnd_otyp_by_wpnskill()');
            } else if (!strncmpi(d.bp, "hammer", 6)) {
                not_ported('rnd_otyp_by_wpnskill()');
            }
        }

        if (!d.oclass)
            return null;
        label = 'any';
    }
    if (label === 'any') {
        if (!d.oclass)
            d.oclass = wrpsym[rn2(wrpsym.length)];
    }
    /* typfnd: */
    if (d.typ)
        d.oclass = objects[d.typ].oc_class;

    /* handle some objects that are only allowed in wizard mode */
    if (d.typ && !wizard()) {
        switch (d.typ) {
        case O.AMULET_OF_YENDOR:
            d.typ = O.FAKE_AMULET_OF_YENDOR;
            break;
        case O.CANDELABRUM_OF_INVOCATION:
            d.typ = rnd_class(O.TALLOW_CANDLE, O.WAX_CANDLE);
            break;
        case O.BELL_OF_OPENING:
            d.typ = O.BELL;
            break;
        case O.SPE_BOOK_OF_THE_DEAD:
            d.typ = O.SPE_BLANK_PAPER;
            break;
        case O.MAGIC_LAMP:
            d.typ = O.OIL_LAMP;
            break;
        default:
            /* catch any other non-wishable objects (venom) */
            if (objects[d.typ].oc_nowish)
                return null;
            break;
        }
    }

    /* if asking for corpse of a monster which leaves behind a glob, give
       glob instead of rejecting the monster type to create random corpse */
    if (d.typ === O.CORPSE && d.mntmp >= LOW_PM
        && mons[d.mntmp].mlet === S_PUDDING) {
        d.typ = O.GLOB_OF_GRAY_OOZE + (d.mntmp - PM_GRAY_OOZE);
        d.mntmp = NON_PM; /* not used for globs */
    }
    /*
     * Create the object, then fine-tune it.
     */
    d.otmp = d.typ ? mksobj(d.typ, true, false) : mkobj(d.oclass, false);
    d.typ = d.otmp.otyp, d.oclass = d.otmp.oclass; /* what we actually got */

    /* if player specified a reasonable count, maybe honor it */
    if (d.otmp.globby) {
        d.otmp.quan = 1; /* always 1 for globs */
        d.otmp.owt = weight(d.otmp);
        if (d.gsize > 1)
            d.otmp.owt += ((5 + (d.gsize - 2) * 10) * d.otmp.owt);
        if (d.cnt > 1) {
            let rn1cnt = rn1(5, 2); /* 2..6 */

            if (rn1cnt > 6 - d.gsize)
                rn1cnt = 6 - d.gsize;
            if (d.cnt > rn1cnt
                && (!wizard() || game.program_state?.wizkit_wishing
                    || not_ported('y_n("Override glob weight limit?")')))
                d.cnt = rn1cnt;
            d.otmp.owt *= d.cnt;
        }
        /* note: the owt assignment below will not change glob's weight */
        d.cnt = 0;
    } else if (d.cnt > 0) {
        if (objects[d.typ].oc_merge
            && (wizard() /* quantity isn't restricted when debugging */
                || d.cnt < rnd(6)
                || (d.cnt <= 7 && Is_candle(d.otmp))
                || (d.cnt <= 20
                    && (d.typ === O.ROCK || d.typ === O.FLINT
                        || is_missile(d.otmp)
                        /* WEAPON_CLASS test excludes gems, gray stones */
                        || (d.oclass === O.WEAPON_CLASS && is_ammo(d.otmp))))))
            d.otmp.quan = d.cnt;
    }

    if (d.islit && (d.typ === O.OIL_LAMP || d.typ === O.MAGIC_LAMP
                    || d.typ === O.BRASS_LANTERN
                    || Is_candle(d.otmp) || d.typ === O.POT_OIL)) {
        not_ported('begin_burn() for a lit light source');
    }

    if (d.spesgn === 0) {
        /* spe not specified; retain the randomly assigned value */
        d.spe = d.otmp.spe;
    } else if (wizard()) {
        ; /* no restrictions except SPE_LIM */
    } else if (d.oclass === O.ARMOR_CLASS || d.oclass === O.WEAPON_CLASS
               || is_weptool(d.otmp)
               || (d.oclass === O.RING_CLASS && objects[d.typ].oc_charged)) {
        if (d.spe > rnd(5) && d.spe > d.otmp.spe)
            d.spe = 0;
        if (d.spe > 2 && Luck() < 0)
            d.spesgn = -1;
    } else {
        /* crystal ball cancels like a wand, to (n:-1) */
        if (d.oclass === O.WAND_CLASS || d.typ === O.CRYSTAL_BALL) {
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
    case O.TIN:
        d.otmp.spe = 0; /* default: not spinach */
        if (d.contents === TIN_EMPTY) {
            d.otmp.corpsenm = NON_PM;
        } else if (d.contents === TIN_SPINACH) {
            d.otmp.corpsenm = NON_PM;
            d.otmp.spe = 1; /* spinach after all */
        }
        break;
    case O.TOWEL:
        if (d.wetness)
            d.otmp.spe = d.wetness;
        break;
    case O.SLIME_MOLD:
        d.otmp.spe = d.ftype;
        /* FALLTHRU */
    case O.SKELETON_KEY:
    case O.CHEST:
    case O.LARGE_BOX:
    case O.HEAVY_IRON_BALL:
    case O.IRON_CHAIN:
        break;
    case O.STATUE: /* otmp->cobj already done in mksobj() */
    case O.FIGURINE:
    case O.CORPSE: {
        const P = (d.mntmp >= LOW_PM) ? mons[d.mntmp] : null;

        d.otmp.spe = !P ? CORPSTAT_RANDOM
                     /* if neuter, force neuter regardless of wish request */
                     : is_neuter(P) ? CORPSTAT_NEUTER
                       /* not neuter, honor wish unless it conflicts */
                       : (d.mgend === FEMALE && !is_male(P)) ? CORPSTAT_FEMALE
                         : (d.mgend === MALE && !is_female(P)) ? CORPSTAT_MALE
                           /* unspecified or wish conflicts */
                           : CORPSTAT_RANDOM;
        if (P && d.otmp.spe === CORPSTAT_RANDOM)
            d.otmp.spe = is_male(P) ? CORPSTAT_MALE
                         : is_female(P) ? CORPSTAT_FEMALE
                           : rn2(2) ? CORPSTAT_MALE : CORPSTAT_FEMALE;
        if (d.ishistoric && d.typ === O.STATUE)
            d.otmp.spe |= CORPSTAT_HISTORIC;
        break;
    }
    /* scroll of mail:  1: from bones or wishing */
    case O.SCR_MAIL:
        d.otmp.spe = 1;
        break;
    /* splash of venom:  0: normal, and transitory; 1: wishing */
    case O.ACID_VENOM:
    case O.BLINDING_VENOM:
        d.otmp.spe = 1;
        break;
    case O.WAN_WISHING:
        if (!wizard()) {
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

        if (d.mntmp === M.PM_LONG_WORM_TAIL)
            d.mntmp = M.PM_LONG_WORM;
        /* werecreatures in beast form are all flagged no-corpse so for
           corpses and tins, switch to their corresponding human form;
           for figurines, override the can't-be-human restriction instead */
        if (d.typ !== O.FIGURINE && is_were(mons[d.mntmp])
            && (game.mvitals[d.mntmp].mvflags & M.G_NOCORPSE) !== 0
            && (humanwere = counter_were(d.mntmp)) !== NON_PM)
            d.mntmp = humanwere;

        switch (d.typ) {
        case O.TIN:
            if (dead_species(d.mntmp, false)) {
                d.otmp.corpsenm = NON_PM; /* it's empty */
            } else if ((!(mons[d.mntmp].geno & M.G_UNIQ) || wizard())
                       && !(game.mvitals[d.mntmp].mvflags & M.G_NOCORPSE)
                       && mons[d.mntmp].cnutrit !== 0) {
                d.otmp.corpsenm = d.mntmp;
            }
            break;
        case O.CORPSE:
            if ((!(mons[d.mntmp].geno & M.G_UNIQ) || wizard())
                && !(game.mvitals[d.mntmp].mvflags & M.G_NOCORPSE)) {
                if (mons[d.mntmp].msound === M.MS_GUARDIAN)
                    d.mntmp = genus(d.mntmp, 1);
                set_corpsenm(d.otmp, d.mntmp);
            }
            if (d.zombify && zombie_form(mons[d.mntmp]))
                not_ported('readobjnam() zombifying corpse timer (start_timer())');
            break;
        case O.EGG:
            d.mntmp = can_be_hatched(d.mntmp);
            /* this also sets hatch timer if appropriate */
            set_corpsenm(d.otmp, d.mntmp);
            break;
        case O.FIGURINE:
            if (!(mons[d.mntmp].geno & M.G_UNIQ)
                && (!is_human(mons[d.mntmp]) || is_were(mons[d.mntmp]))
                && d.mntmp !== M.PM_MAIL_DAEMON) /* MAIL_STRUCTURES */
                d.otmp.corpsenm = d.mntmp;
            break;
        case O.STATUE:
            d.otmp.corpsenm = d.mntmp;
            if (Has_contents(d.otmp) && verysmall(mons[d.mntmp]))
                delete_contents(d.otmp); /* no spellbook */
            break;
        case O.SCALE_MAIL:
            /* Dragon mail - depends on the order of objects & dragons. */
            if (d.mntmp >= PM_GRAY_DRAGON && d.mntmp <= PM_YELLOW_DRAGON)
                d.otmp.otyp = O.GRAY_DRAGON_SCALE_MAIL
                              + d.mntmp - PM_GRAY_DRAGON;
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
        d.otmp.cursed = (Luck() < 0 && !wizard()) ? 1 : 0;
    } else if (d.blessed) {
        d.otmp.blessed = (Luck() >= 0 || wizard()) ? 1 : 0;
        d.otmp.cursed = (Luck() < 0 && !wizard()) ? 1 : 0;
    } else if (d.spesgn < 0) {
        curse(d.otmp);
    }

    /* set eroded and erodeproof */
    if (erosion_matters(d.otmp)) {
        /* wished-for item shouldn't be eroded unless specified */
        d.otmp.oeroded = d.otmp.oeroded2 = 0;
        if (d.eroded && (is_flammable(d.otmp) || is_rustprone(d.otmp)
                         || is_crackable(d.otmp)))
            d.otmp.oeroded = d.eroded;
        if (d.eroded2 && (is_corrodeable(d.otmp) || is_rottable(d.otmp)))
            d.otmp.oeroded2 = d.eroded2;
        if (d.erodeproof
            && (is_damageable(d.otmp) || d.otmp.otyp === O.CRYSKNIFE))
            d.otmp.oerodeproof = (Luck() >= 0 || wizard()) ? 1 : 0;
    }

    /* set otmp->recharged */
    if (d.oclass === O.WAND_CLASS) {
        /* prevent wishing abuse */
        if (d.otmp.otyp === O.WAN_WISHING && !wizard())
            d.rechrg = 1;
        d.otmp.recharged = d.rechrg;
    }

    /* set poisoned */
    if (d.ispoisoned) {
        if (is_poisonable(d.otmp))
            d.otmp.otrapped /* opoisoned */ = (Luck() >= 0) ? 1 : 0;
        else if (d.oclass === O.FOOD_CLASS)
            /* try to taint by making it as old as possible */
            d.otmp.age = 1;
    }
    /* and [un]trapped */
    if (d.trapped) {
        if (Is_box(d.otmp) || d.typ === O.TIN)
            d.otmp.otrapped = (d.trapped === 1) ? 1 : 0;
    }
    /* empty for containers rather than for tins */
    if (d.contents === TIN_EMPTY) {
        if (d.otmp.otyp === O.BAG_OF_TRICKS || d.otmp.otyp === O.HORN_OF_PLENTY) {
            if (d.otmp.spe > 0)
                d.otmp.spe = 0;
        } else if (d.otmp.cobj && d.otmp.cobj.length) { /* Has_contents() */
            delete_contents(d.otmp);
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

    if (d.isdiluted && d.otmp.oclass === O.POTION_CLASS)
        d.otmp.odiluted = (d.otmp.otyp !== O.POT_WATER) ? 1 : 0;

    /* set tin variety */
    if (d.otmp.otyp === O.TIN && d.tvariety >= 0 && (rn2(4) || wizard()))
        not_ported('set_tin_variety() for a wished-for tin');

    let aname = null;
    if (d.name) {
        const objtyp = { otyp: 0 };

        /* an artifact name might need capitalization fixing */
        aname = artifact_name(d.name, objtyp, true);
        if (aname && objtyp.otyp === d.otmp.otyp)
            d.name = aname;

        /* 3.6 tribute - fix up novel */
        if (d.otmp.otyp === O.SPE_NOVEL)
            not_ported('lookup_novel() for a wished-for novel');

        d.otmp = oname(d.otmp, d.name, ONAME_WISH);
        /* name==aname => wished for artifact (otmp->oartifact => got it) */
        if (d.otmp.oartifact || d.name === aname) {
            d.otmp.quan = 1;
            game.u.uconduct.wisharti = (game.u.uconduct.wisharti || 0) + 1; /* KMH, conduct */
        }
    }

    if (permapoisoned(d.otmp))
        d.otmp.otrapped /* opoisoned */ = 1;

    /* more wishing abuse: don't allow wishing for certain artifacts */
    /* and make them pay; charge them for the wish anyway! */
    if ((is_quest_artifact(d.otmp)
         || (d.otmp.oartifact && rn2(nartifact_exist()) > 1)) && !wizard())
        not_ported('refusing a wished-for artifact (artifact_exists(), "For a moment, you feel")');

    if (d.halfeaten && d.otmp.oclass === O.FOOD_CLASS)
        not_ported('partly eaten wished-for food (consume_oeaten())');
    d.otmp.owt = weight(d.otmp);
    if (d.very && d.otmp.otyp === O.HEAVY_IRON_BALL)
        d.otmp.owt += 160; /* WT_IRON_BALL_INCR */

    return d.otmp;
}

// ---------------------------------------------------------------------
// xname() / doname()
// C ref: objnam.c xname_flags(), doname_base()
// Branches that need code not ported yet throw (named objects and
// artifacts, Samurai item names, figurine/statue/tin/fruit details,
// makeplural(), erosion words, corpses, eggs, worn/wielded suffixes,
// shop prices).

function xn_not_ported(what) {
    throw new Error(`xname/doname: ${what} is not ported yet`);
}

/* C ref: objnam.c CXN_* flags */
export const CXN_NORMAL = 0, CXN_SINGULAR = 1, CXN_NO_PFX = 2,
             CXN_PFX_THE = 4, CXN_ARTICLE = 8, CXN_NOCORPSE = 16;

// C ref: objnam.c the_unique_pm()
export function the_unique_pm(ptr) {
    /* even though monsters with personal names are unique, we want to
       describe them as "Name" rather than "the Name" */
    if ((ptr.mflags2 & M.M2_PNAME) !== 0)
        return false;

    let uniq = (ptr.geno & M.G_UNIQ) ? true : false;
    /* high priest is unique if it includes "of <deity>", otherwise not
       (caller needs to handle the 1st possibility; we assume the 2nd);
       worm tail should be irrelevant but is included for completeness */
    if (ptr === mons[M.PM_HIGH_CLERIC] || ptr === mons[M.PM_LONG_WORM_TAIL])
        uniq = false;
    /* Wizard no longer needs this; he's flagged as unique these days */
    if (ptr === mons[M.PM_WIZARD_OF_YENDOR])
        uniq = true;
    return uniq;
}

// C ref: do_name.c obj_pmname()
export function obj_pmname(obj) {
    if ((obj.otyp === O.CORPSE || obj.otyp === O.STATUE || obj.otyp === O.FIGURINE)
        && obj.corpsenm >= LOW_PM && obj.corpsenm < mons.length) {
        const cgend = (obj.spe & 0x03 /* CORPSTAT_GENDER */),
              mgend = ((cgend === CORPSTAT_MALE) ? MALE
                       : (cgend === CORPSTAT_FEMALE) ? FEMALE
                         : NEUTRAL);
        let mndx = obj.corpsenm;

        /* mons[].pmnames[] for monster cleric uses "priest" or "priestess"
           or "aligned cleric"; we want to avoid "aligned cleric [corpse]"
           unless it has been explicitly flagged as neuter */
        if (mndx === M.PM_ALIGNED_CLERIC && cgend === 0 /* CORPSTAT_RANDOM */)
            mndx = M.PM_CLERIC;

        /* mondata.c pmname() */
        const pm = mons[mndx];
        if ((mgend >= MALE && mgend <= NEUTRAL) && pm.pmnames[mgend])
            return pm.pmnames[mgend];
        return pm.pmnames[NEUTRAL];
    }
    return "two-legged glorkum-seeker";
}

// C ref: objnam.c corpse_xname()
export function corpse_xname(otmp, adjective, cxn_flags) /* bitmask of CXN_xxx values */ {
    const omndx = otmp.corpsenm;
    const ignore_quan = (cxn_flags & CXN_SINGULAR) !== 0,
          omit_corpse = (cxn_flags & CXN_NOCORPSE) !== 0,
          glob = (otmp.otyp !== O.CORPSE && otmp.globby);
    /* suppress "the" from "the unique monster corpse" */
    let no_prefix = (cxn_flags & CXN_NO_PFX) !== 0,
        /* include "the" for "the woodchuck corpse */
        the_prefix = (cxn_flags & CXN_PFX_THE) !== 0,
        /* include "an" for "an ogre corpse */
        any_prefix = (cxn_flags & CXN_ARTICLE) !== 0,
        possessive = false;
    let mnam;

    if (glob) {
        mnam = OBJ_NAME(objects[otmp.otyp]); /* "glob of <monster>" */
    } else if (omndx === NON_PM) { /* paranoia */
        mnam = "thing";
    } else {
        mnam = obj_pmname(otmp);
        if (the_unique_pm(mons[omndx]) || (mons[omndx].mflags2 & M.M2_PNAME)) {
            mnam = s_suffix(mnam);
            possessive = true;
            /* don't precede personal name like "Medusa" with an article */
            if (mons[omndx].mflags2 & M.M2_PNAME)
                no_prefix = true;
            /* always precede non-personal unique monster name like
               "Oracle" with "the" unless explicitly overridden */
            else if (the_unique_pm(mons[omndx]) && !no_prefix)
                the_prefix = true;
        }
    }
    if (no_prefix)
        the_prefix = any_prefix = false;
    else if (the_prefix)
        any_prefix = false; /* mutually exclusive */

    let nambuf = '';
    if (the_prefix)
        nambuf += "the ";

    if (!adjective) {
        /* normal case:  newt corpse */
        nambuf += mnam;
    } else {
        /* adjective positioning depends upon format of monster name */
        if (possessive) /* Medusa's cursed partly eaten corpse */
            nambuf += `${mnam} ${adjective}`;
        else /* cursed partly eaten troll corpse */
            nambuf += `${adjective} ${mnam}`;
        /* in case adjective has a trailing space, squeeze it out */
        nambuf = mungspaces(nambuf);
        /* doname() might include a count in the adjective argument;
           if so, don't prepend an article */
        if (adjective[0] >= '0' && adjective[0] <= '9')
            any_prefix = false;
    }

    if (glob) {
        ; /* omit_corpse doesn't apply; quantity is always 1 */
    } else if (!omit_corpse) {
        nambuf += " corpse";
        /* makeplural(nambuf) => append "s" to "corpse" */
        if (otmp.quan > 1 && !ignore_quan) {
            nambuf += "s";
            any_prefix = false; /* avoid "a newt corpses" */
        }
    }

    if (any_prefix)
        nambuf = an(nambuf);
    return nambuf;
}

// C ref: you.h Blind
function xn_Blind() {
    const p = game.u?.uprops?.[BLINDED];
    return !!(p?.intrinsic || p?.extrinsic);
}
// C ref: you.h Hallucination
function xn_Hallucination() {
    const p = game.u?.uprops?.[HALLUC];
    return !!(p?.intrinsic || p?.extrinsic);
}

// C ref: objnam.c xcalled()
function xcalled(pfx, sfx) {
    return `${pfx}${pfx[0] ? " " : ""}called ${sfx}`;
}

// C ref: objnam.c armor_simple_name()
export function armor_simple_name(armor) {
    let result = null;
    const armcat = objects[armor.otyp].oc_armcat;

    switch (armcat) {
    case O.ARM_SUIT:
        result = suit_simple_name(armor);
        break;
    case O.ARM_CLOAK:
        result = cloak_simple_name(armor);
        break;
    case O.ARM_HELM:
        result = helm_simple_name(armor);
        break;
    case O.ARM_GLOVES:
        result = gloves_simple_name(armor);
        break;
    case O.ARM_BOOTS:
        result = boots_simple_name(armor);
        break;
    case O.ARM_SHIELD:
        result = shield_simple_name(armor);
        break;
    case O.ARM_SHIRT:
        result = shirt_simple_name(armor);
        break;
    default:
        throw new Error(`armor_simple_name(): unknown armor category ${armcat}`);
    }
    return result;
}

// C ref: objnam.c suit_simple_name()
export function suit_simple_name(suit) {
    let suitnm;

    if (suit) {
        if (suit.otyp >= O.GRAY_DRAGON_SCALE_MAIL
            && suit.otyp <= O.YELLOW_DRAGON_SCALE_MAIL) /* Is_dragon_mail() */
            return "dragon mail"; /* <color> dragon scale mail */
        else if (suit.otyp >= O.GRAY_DRAGON_SCALES
                 && suit.otyp <= O.YELLOW_DRAGON_SCALES) /* Is_dragon_scales() */
            return "dragon scales";
        suitnm = OBJ_NAME(objects[suit.otyp]);
        if (suitnm.length > 5 && suitnm.endsWith(" mail"))
            return "mail"; /* most suits fall into this category */
        else if (suitnm.length > 7 && suitnm.endsWith(" jacket"))
            return "jacket"; /* leather jacket */
    }
    /* "suit" is lame but "armor" is ambiguous and "body armor" is absurd */
    return "suit";
}

// C ref: objnam.c cloak_simple_name()
export function cloak_simple_name(cloak) {
    if (cloak) {
        switch (cloak.otyp) {
        case O.ROBE:
            return "robe";
        case O.MUMMY_WRAPPING:
            return "wrapping";
        case O.ALCHEMY_SMOCK:
            return (objects[cloak.otyp].oc_name_known && cloak.dknown)
                       ? "smock"
                       : "apron";
        default:
            break;
        }
    }
    return "cloak";
}

// C ref: objnam.c helm_simple_name()
/* helm vs hat for messages */
export function helm_simple_name(helmet) {
    return !hard_helmet(helmet) ? "hat" : "helm";
}

// C ref: objnam.c gloves_simple_name()
/* gloves vs gauntlets; depends upon discovery state */
export function gloves_simple_name(gloves) {
    const gauntlets = "gauntlets";

    if (gloves && gloves.dknown) {
        const otyp = gloves.otyp;
        const ocl = objects[otyp];
        const actualn = OBJ_NAME(ocl), descrpn = OBJ_DESCR(ocl);

        if (strstri(objects[otyp].oc_name_known ? actualn : descrpn,
                    gauntlets) >= 0)
            return gauntlets;
    }
    return "gloves";
}

// C ref: objnam.c boots_simple_name()
/* boots vs shoes; depends upon discovery state */
export function boots_simple_name(boots) {
    const shoes = "shoes";

    if (boots && boots.dknown) {
        const otyp = boots.otyp;
        const ocl = objects[otyp];
        const actualn = OBJ_NAME(ocl), descrpn = OBJ_DESCR(ocl);

        if (strstri(descrpn, shoes) >= 0
            || (objects[otyp].oc_name_known && strstri(actualn, shoes) >= 0))
            return shoes;
    }
    return "boots";
}

// C ref: objnam.c shield_simple_name()
/* simplified shield for messages */
export function shield_simple_name(shield) {
    if (shield) {
        /* xname() describes unknown (unseen) reflection as smooth */
        if (shield.otyp === O.SHIELD_OF_REFLECTION)
            return shield.dknown ? "silver shield" : "smooth shield";
    }
    return "shield";
}

// C ref: objnam.c shirt_simple_name()
/* for completeness */
export function shirt_simple_name(shirt) {
    void shirt;
    return "shirt";
}

/* C ref: decl.c gd.distantname -- set while distant_name() formats an
   object the hero only sees from afar */
let distantname = 0;

// C ref: mkobj.c get_obj_location() -- the locations distant_name() needs
function get_obj_location(obj) {
    switch (obj.where) {
    case 'OBJ_INVENT':
        return [game.u.ux, game.u.uy];
    case 'OBJ_FLOOR':
        return [obj.ox, obj.oy];
    case 'OBJ_MINVENT':
        if (obj.ocarry.mx)
            return [obj.ocarry.mx, obj.ocarry.my];
        break;
    default:
        break;
    }
    return null;
}

// C ref: objnam.c distant_name()
/* format the object's name, treating it as seen up close only when the
   hero can see its location from nearby */
export function distant_name(obj, func) {
    const u = game.u;
    const r = (u.xray_range > 2) ? u.xray_range : 2,
        neardist = (r * r) * 2 - r; /* same as r*r + r*(r-1) */
    let str;

    const save_oid = obj.o_id;
    if (game.program_state?.gameover)
        obj.o_id = 0;

    /* this maybe-nearby part used to be replicated in multiple callers */
    const loc = get_obj_location(obj);
    if (loc && cansee(loc[0], loc[1])
        && (obj.oartifact
            || dist2(loc[0], loc[1], u.ux, u.uy) <= neardist)) {
        /* side-effects:  treat as having been seen up close */
        str = func(obj);
    } else {
        ++distantname;
        try {
            str = func(obj);
        } finally {
            --distantname;
        }
    }

    obj.o_id = save_oid; /* reset to normal */

    return str;
}

// C ref: objnam.c xname()
export function xname(obj) {
    return xname_flags(obj, 0);
}

// C ref: objnam.c cxname()
/* xname doesn't include monster type for "corpse"; cxname does */
export function cxname(obj) {
    if (obj.otyp === O.CORPSE)
        return corpse_xname(obj, null, CXN_NORMAL);
    return xname(obj);
}

// C ref: objnam.c cxname_singular()
/* like cxname, but ignores quantity */
export function cxname_singular(obj) {
    if (obj.otyp === O.CORPSE)
        return corpse_xname(obj, null, CXN_SINGULAR);
    return xname_flags(obj, CXN_SINGULAR);
}

// C ref: objnam.c singular()
export function singular(otmp, func) {
    /* using xname for corpses does not give the monster type */
    if (otmp.otyp === O.CORPSE && func === xname)
        func = cxname;
    const savequan = otmp.quan;
    otmp.quan = 1;
    const nam = func(otmp);
    otmp.quan = savequan;
    return nam;
}

// C ref: objnam.c The()
/* capitalized variant of the() */
export function The(str) {
    const tmp = the_article(str);
    return tmp.charAt(0).toUpperCase() + tmp.slice(1);
}

// C ref: objnam.c Tobjnam()
/* return form of the verb (input plural) for present tense 3rd person
   subj; also uses The() */
export function Tobjnam(otmp, verb) {
    let bp = The(xname(otmp));

    if (verb)
        bp += ` ${otense(otmp, verb)}`;
    return bp;
}

// C ref: objnam.c yname() -- xname, with "your"/"the"/"Foobar's"
// (shk_your()) prepended
export function yname(obj) {
    const s = cxname(obj);

    /* leave off "your" for most of your artifacts, but prepend
     * "your" for unique objects and "foo of bar" quest artifacts */
    if (obj.where !== 'OBJ_INVENT' || !obj_is_pname(obj)
        || obj.oartifact >= ART_ORB_OF_DETECTION_ON)
        return shk_your(obj) + s;

    return s;
}

// C ref: objnam.c Yname2()
/* capitalized variant of yname() */
export function Yname2(obj) {
    const s = yname(obj);
    return s.charAt(0).toUpperCase() + s.slice(1);
}

// C ref: objnam.c aobjnam()
/* format the object name with a count (for plural) and a verb */
export function aobjnam(otmp, verb) {
    let bp = (otmp.otyp === O.CORPSE) ? corpse_xname(otmp, null, CXN_NORMAL)
                                      : xname(otmp); /* cxname() */
    if (otmp.quan !== 1)
        bp = `${otmp.quan} ${bp}`;
    if (verb)
        bp += ` ${otense(otmp, verb)}`;
    return bp;
}

// C ref: objnam.c yobjnam()
export function yobjnam(obj, verb) {
    let s = aobjnam(obj, verb);

    /* leave off "your" for most of your artifacts, but prepend
     * "your" for unique objects and "foo of bar" quest artifacts */
    if (obj.where !== 'OBJ_INVENT' || !obj_is_pname(obj)
        || obj.oartifact >= ART_ORB_OF_DETECTION_ON)
        s = shk_your(obj) + s;
    return s;
}

// C ref: objnam.c Yobjnam2()
/* capitalized variant of yobjnam() */
export function Yobjnam2(obj, verb) {
    const s = yobjnam(obj, verb);
    return s.charAt(0).toUpperCase() + s.slice(1);
}


// C ref: objnam.c xname_flags()
function xname_flags(obj, cxn_flags) {
    const typ = obj.otyp;
    const ocl = objects[typ];
    let nn = ocl.oc_name_known;
    const omndx = obj.corpsenm;
    let actualn = OBJ_NAME(ocl);
    let dn = OBJ_DESCR(ocl);
    const un = ocl.oc_uname;
    let pluralize = (obj.quan !== 1) && !(cxn_flags & 1 /* CXN_SINGULAR */);
    let buf = '';

    if (Role_if(M.PM_SAMURAI)) {
        actualn = Japanese_item_name(typ, actualn);
        if (typ === O.WOODEN_HARP || typ === O.MAGIC_HARP)
            dn = "koto";
    }
    /* generic items don't have an actual-name; we shouldn't ever be called
       for those; pacify static analyzer without resorting to impossible() */
    if (!actualn)
        actualn = (typ > 0 && typ < O.MAXOCLASSES) ? "generic" : "object?";
    if (!dn)
        dn = actualn;

    if (!nn && ocl.oc_uses_known && ocl.oc_unique)
        obj.known = 0;
    if (!xn_Blind() && !distantname)
        observe_object(obj, xn_Hallucination());
    if (Role_if(M.PM_CLERIC))
        obj.bknown = 1;

    let known, dknown, bknown;
    if (game.iflags?.override_ID) {
        known = dknown = bknown = true;
        nn = 1;
    } else {
        known = obj.known;
        dknown = obj.dknown;
        bknown = obj.bknown;
    }

    /*
     * Maybe find a previously unseen artifact.
     * (We use the real obj->dknown rather than the override_ID variant.)
     */
    if (obj.oartifact && obj.dknown)
        find_artifact(obj);

    /* if (obj_is_pname(obj)) goto nameit; */
    const nameit = obj_is_pname(obj);

    if (!nameit) switch (obj.oclass) {
    case O.AMULET_CLASS:
        if (!dknown)
            buf = "amulet";
        else if (typ === O.AMULET_OF_YENDOR || typ === O.FAKE_AMULET_OF_YENDOR)
            buf = known ? actualn : dn;
        else if (nn)
            buf = actualn;
        else if (un)
            buf = xcalled("amulet", un);
        else
            buf = `${dn} amulet`;
        break;
    case O.WEAPON_CLASS:
        if (is_poisonable(obj) && obj.otrapped /* opoisoned */)
            buf = "poisoned ";
        /* FALLTHROUGH */
    case O.VENOM_CLASS:
    case O.TOOL_CLASS:
        if (typ === O.LENSES)
            buf = "pair of ";
        else if (typ === O.TOWEL && obj.spe > 0) /* is_wet_towel() */
            buf = (obj.spe < 3) ? "moist " : "wet ";

        if (!dknown)
            buf += dn;
        else if (nn)
            buf += actualn;
        else if (un)
            buf = xcalled(buf + dn, un);
        else
            buf += dn;

        if (typ === O.FIGURINE && omndx_ok(omndx)) {
            const pm_name = obj_pmname(obj);

            buf += ` of ${just_an(pm_name)}${pm_name}`;
        } else if (typ === O.TOWEL && obj.spe > 0) {
            if (game.flags?.debug)
                buf += ` (${obj.spe})`;
        }
        break;
    case O.ARMOR_CLASS:
        if (typ >= O.GRAY_DRAGON_SCALES && typ <= O.YELLOW_DRAGON_SCALES) {
            buf = `set of ${actualn}`;
            break;
        } else if (ocl.oc_subtyp === O.ARM_BOOTS || ocl.oc_subtyp === O.ARM_GLOVES) {
            buf = "pair of ";
        } else if (ocl.oc_subtyp === O.ARM_SHIELD && !dknown) {
            if (obj.otyp >= O.ELVEN_SHIELD && obj.otyp <= O.ORCISH_SHIELD) {
                buf = "shield";
                break;
            } else if (obj.otyp === O.SHIELD_OF_REFLECTION) {
                buf = "smooth shield";
                break;
            }
        }
        if (nn)
            buf += actualn;
        else if (un)
            buf += xcalled(armor_simple_name(obj), un);
        else
            buf += dn;
        break;
    case O.FOOD_CLASS:
        /* we could include partly-eaten-hack on fruit but don't need to */
        if (typ === O.SLIME_MOLD) {
            const f = fruit_from_indx(obj.spe);

            if (!f) {
                /* impossible("Bad fruit #%d?", obj->spe) */
                buf = "fruit";
            } else {
                buf = f.fname;
                if (pluralize) {
                    /* already pluralized fruit names are allowed--we
                       want to try to avoid adding a redundant plural
                       suffix */
                    buf = makesingular(buf);
                    buf = makeplural(buf);
                    pluralize = false;
                }
            }
            break;
        }
        if (game.iflags?.partly_eaten_hack && obj.oeaten) {
            /* normally "partly eaten" is supplied by doname() when
               appropriate and omitted by xname(); shrink_glob() wants
               it but uses Yname2() -> yname() -> xname() rather than
               doname() so we've added an external flag to request it */
            buf += "partly eaten ";
        }
        if (obj.globby) { /* 5.0 added "medium" to replace no-prefix */
            buf += `${(obj.owt <= 100) ? "small"
                      : (obj.owt <= 300) ? "medium"
                        : (obj.owt <= 500) ? "large"
                          : "very large"} ${actualn}`;
            break;
        }
        buf += actualn;
        if (typ === O.TIN && known)
            buf = tin_details(obj, omndx, buf);
        break;
    case O.COIN_CLASS:
    case O.CHAIN_CLASS:
        buf = actualn;
        break;
    case O.ROCK_CLASS:
        if (typ === O.STATUE && omndx_ok(omndx)) {
            const statue_pmname = obj_pmname(obj);

            buf = `${(Role_if(M.PM_ARCHEOLOGIST)
                      && (obj.spe & CORPSTAT_HISTORIC) !== 0) ? "historic "
                     : ""}${actualn} of ${
                (mons[omndx].mflags2 & M.M2_PNAME) !== 0 /* type_is_pname() */ ? ""
                : the_unique_pm(mons[omndx]) ? "the "
                  : just_an(statue_pmname)}${statue_pmname}`;
        } else if (typ === O.BOULDER && obj.next_boulder === 1) {
            buf = "next " + actualn;
            obj.next_boulder = 0;
        } else
            buf = actualn;
        break;
    case O.BALL_CLASS:
        buf = `${(obj.owt > ocl.oc_weight) ? "very " : ""}heavy iron ball`;
        break;
    case O.POTION_CLASS:
        if (dknown && obj.odiluted)
            buf = "diluted ";
        if (nn || un || !dknown) {
            buf += "potion";
            if (!dknown)
                break;
            if (nn) {
                buf += " of ";
                if (typ === O.POT_WATER && bknown
                    && (obj.blessed || obj.cursed)) {
                    buf += obj.blessed ? "holy " : "unholy ";
                }
                buf += actualn;
            } else {
                buf = xcalled(buf, un);
            }
        } else {
            buf += dn;
            buf += " potion";
        }
        break;
    case O.SCROLL_CLASS:
        buf = "scroll";
        if (!dknown)
            break;
        if (nn) {
            buf += " of ";
            buf += actualn;
        } else if (un) {
            buf = xcalled(buf, un);
        } else if (ocl.oc_magic) {
            buf += " labeled ";
            buf += dn;
        } else {
            buf = dn;
            buf += " scroll";
        }
        break;
    case O.WAND_CLASS:
        if (!dknown)
            buf = "wand";
        else if (nn)
            buf = `wand of ${actualn}`;
        else if (un)
            buf = xcalled("wand", un);
        else
            buf = `${dn} wand`;
        break;
    case O.SPBOOK_CLASS:
        if (typ === O.SPE_NOVEL) { /* 3.6 tribute */
            if (!dknown)
                buf = "book";
            else if (nn)
                buf = actualn;
            else if (un)
                buf = xcalled("novel", un);
            else
                buf = `${dn} book`;
            break;
        } else if (!dknown) {
            buf = "spellbook";
        } else if (nn) {
            if (typ !== O.SPE_BOOK_OF_THE_DEAD)
                buf = "spellbook of ";
            buf += actualn;
        } else if (un) {
            buf = xcalled("spellbook", un);
        } else
            buf = `${dn} spellbook`;
        break;
    case O.RING_CLASS:
        if (!dknown)
            buf = "ring";
        else if (nn)
            buf = `ring of ${actualn}`;
        else if (un)
            buf = xcalled("ring", un);
        else
            buf = `${dn} ring`;
        break;
    case O.GEM_CLASS: {
        const rock = (ocl.oc_material === O.MINERAL) ? "stone" : "gem";

        if (!dknown) {
            buf = rock;
        } else if (!nn) {
            if (un)
                buf = xcalled(rock, un);
            else
                buf = `${dn} ${rock}`;
        } else {
            buf = actualn;
            if (GemStone_x(typ))
                buf += " stone";
        }
        break;
    } /* gem */
    default:
        buf = `glorkum ${obj.oclass} ${typ} ${obj.spe}`;
        break;
    } /* switch */

    if (!nameit) {
        /* if the name should be plural, do that now */
        if (pluralize)
            buf = makeplural(buf);
        /* end-of-game disclosure: readable text on worn/carried items */
        if (game.program_state?.gameover && obj.o_id) {
            switch (obj.otyp) {
            case O.T_SHIRT:
            case O.ALCHEMY_SMOCK:
                buf += ` with text "${(obj.otyp === O.T_SHIRT)
                                      ? tshirt_text(obj) : apron_text(obj)}"`;
                break;
            case O.HAWAIIAN_SHIRT:
                buf += ` with ${an(hawaiian_motif(obj))} motif`;
                break;
            case O.CANDY_BAR: {
                const lbl = candy_wrapper_text(obj);
                if (lbl)
                    buf += ` labeled "${lbl}"`;
                break;
            }
            default:
                break;
            }
        }
    }

    if (nameit || (has_oname(obj) && dknown)) {
        if (!nameit)
            buf += " named ";

        /* jump directly here if obj passes the has-personal-name test */
        /* nameit: */
        let oname_str = ONAME(obj);
        /* downcase "The" in "<quest-artifact-item> named The ..." */
        if (obj.oartifact && oname_str.startsWith("The "))
            oname_str = lowc(oname_str[0]) + oname_str.slice(1);
        buf += oname_str;
    }

    if (!strncmpi(buf, "the ", 4))
        buf = buf.slice(4);

    return buf;
}

// C ref: objnam.c obj_is_pname()
export function obj_is_pname(obj) {
    if (!obj.oartifact || !has_oname(obj))
        return false;
    if (!game.program_state?.gameover && !game.iflags?.override_ID) {
        if (not_fully_identified(obj))
            return false;
    }
    return true;
}

// C ref: objnam.c not_fully_identified()
export function not_fully_identified(otmp) {
    /* gold doesn't have any interesting attributes [yet?] */
    if (otmp.oclass === O.COIN_CLASS)
        return false; /* always fully ID'd */
    /* check fundamental ID hallmarks first */
    if (!otmp.known || !otmp.dknown
        || (!otmp.bknown && otmp.otyp !== O.SCR_MAIL)
        || !objects[otmp.otyp].oc_name_known)
        return true;
    if ((!otmp.cknown && (Is_container(otmp) || otmp.otyp === O.STATUE))
        || (!otmp.lknown && Is_box(otmp)))
        return true;
    if (otmp.oartifact && undiscovered_artifact(otmp.oartifact))
        return true;
    /* otmp->rknown is the only item of interest if we reach here */
    if (otmp.rknown
        || (otmp.oclass !== O.ARMOR_CLASS && otmp.oclass !== O.WEAPON_CLASS
            && !is_weptool(otmp)            /* (redundant) */
            && otmp.oclass !== O.BALL_CLASS)) /* (useless) */
        return false;
    else /* lack of `rknown' only matters for vulnerable objects */
        return is_damageable(otmp);
}

// C ref: objnam.c the_unique_obj()
/* used for naming "the unique_item" instead of "a unique_item" */
export function the_unique_obj(obj) {
    const known = (obj.known || game.iflags?.override_ID);

    if (!obj.dknown && !game.iflags?.override_ID)
        return false;
    else if (obj.otyp === O.FAKE_AMULET_OF_YENDOR && !known)
        return true; /* lie */
    else
        return !!(objects[obj.otyp].oc_unique
                  && (known || obj.otyp === O.AMULET_OF_YENDOR));
}

// C ref: objnam.c add_erosion_words() -- returns the extended prefix
// (C appends to its prefix buffer in place)
function add_erosion_words(obj, prefix) {
    const iscrys = (obj.otyp === O.CRYSKNIFE);
    const rknown = !game.iflags?.override_ID ? obj.rknown : true;

    if (!is_damageable(obj) && !iscrys)
        return prefix;

    /* The only cases where any of these bits do double duty are for
     * rotted food and diluted potions, which are all not is_damageable().
     */
    if (obj.oeroded && !iscrys) {
        switch (obj.oeroded) {
        case 2:
            prefix += "very ";
            break;
        case 3:
            prefix += "thoroughly ";
            break;
        }
        prefix += is_rustprone(obj) ? "rusty "
                  : is_crackable(obj) ? "cracked "
                    : "burnt ";
    }
    if (obj.oeroded2 && !iscrys) {
        switch (obj.oeroded2) {
        case 2:
            prefix += "very ";
            break;
        case 3:
            prefix += "thoroughly ";
            break;
        }
        prefix += is_corrodeable(obj) ? "corroded " : "rotted ";
    }
    /* note: it is possible for an item to be both eroded and erodeproof
       (cursed scroll of destroy armor read while confused erodeproofs an
       item of armor without repairing existing erosion) */
    if (rknown && obj.oerodeproof)
        prefix += iscrys ? "fixed "
                  : is_rustprone(obj) ? "rustproof "
                    : is_corrodeable(obj) ? "corrodeproof "
                      : is_flammable(obj) ? "fireproof "
                        : is_crackable(obj) ? "tempered " /* hardened */
                          : is_rottable(obj) ? "rotproof "
                            : "";
    return prefix;
}

// C ref: objnam.c doname()
export function doname(obj) {
    return doname_base(obj, 0);
}

// C ref: objnam.c paydoname()
/* doname() for itemized buying of 'obj' from a shop */
export function paydoname(obj) {
    const and_contents = " and its contents";
    let p;
    const save_cknown = obj.cknown;
    const iflags = game.iflags || (game.iflags = {});
    const save_wizweight = iflags.wizweight;
    const has_contents = !!(obj.cobj && obj.cobj.length); /* Has_contents() */

    if (has_contents)
        obj.cknown = 0;
    /* avoid showing item weights to unclutter billing's pay-menu a bit */
    iflags.wizweight = false;
    /* suppress invent-style price; caller will add billing-style price */
    iflags.suppress_price = (iflags.suppress_price || 0) + 1;
    p = doname_base(obj, 0);
    iflags.suppress_price--;
    iflags.wizweight = save_wizweight;

    if (has_contents) {
        /* buy_container() sets no_charge for a container that has just
           been purchased so that when paydoname() is called by
           shk_names_obj(), we'll provide "a/an <container>" instead of
           "your <container>" */
        if (!obj.no_charge) {
            if (p.startsWith("a "))
                p = p.slice(2);
            else if (p.startsWith("an "))
                p = p.slice(3);
            p = (obj.unpaid ? "an unpaid " : "your ") + p; /* strprepend() */
        }

        if (!obj.cknown) {
            if (obj.unpaid) {
                if (p.length + and_contents.length < 256 /* BUFSZ */ - 4 /* PREFIX */)
                    p += and_contents;
            } else {
                p = "the contents of " + p;
            }
        }
    }
    obj.cknown = save_cknown;
    return p;
}

// C ref: objnam.c doname_with_price()
/* Name of object including price. */
export function doname_with_price(obj) {
    return doname_base(obj, 1 /* DONAME_WITH_PRICE */);
}

// C ref: objnam.c doname_vague_quan()
export function doname_vague_quan(obj) {
    /* Used by farlook.
     * If it hasn't been seen up close and quantity is more than one,
     * use "some" instead of the quantity: "some gold pieces" rather
     * than "25 gold pieces". */
    return doname_base(obj, 2 /* DONAME_VAGUE_QUAN */);
}

// C ref: objnam.c doname_base()
function doname_base(obj, doname_flags) {
    let ispoisoned = false;
    const with_price = (doname_flags & 1 /* DONAME_WITH_PRICE */) !== 0;
    const vague_quan = (doname_flags & 2 /* DONAME_VAGUE_QUAN */) !== 0;
    let prefix = '';
    let bp = xname(obj);

    let known, dknown, cknown, bknown, lknown;
    if (game.iflags?.override_ID) {
        known = dknown = cknown = bknown = lknown = true;
    } else {
        known = obj.known;
        dknown = obj.dknown;
        cknown = obj.cknown;
        bknown = obj.bknown;
        lknown = obj.lknown;
    }

    if (bp.startsWith("poisoned ") && obj.otrapped /* opoisoned */) {
        bp = bp.slice(9);
        ispoisoned = true;
    }

    /* fruits are allowed to be given artifact names; when that happens,
       format the name like the corresponding artifact, which may or may not
       want "the" prefix and when it doesn't, avoid "a"/"an" prefix too */
    let aname = null;
    const fake_arti = (obj.otyp === O.SLIME_MOLD
                       && (aname = artifact_name(bp, null, false)) !== null);
    const force_the = (fake_arti && !strncmpi(aname, "the ", 4));

    if (obj.quan !== 1) {
        if (dknown || !vague_quan)
            prefix = `${obj.quan} `;
        else
            prefix = "some ";
    } else if (obj.otyp === O.CORPSE) {
        /* nothing */
    } else if (force_the || obj_is_pname(obj) || the_unique_obj(obj)) {
        if (!strncmpi(bp, "the ", 4))
            bp = bp.slice(4);
        prefix = "the ";
    } else if (!fake_arti) {
        /* default prefix */
        prefix = "a ";
    }

    if (cknown
        && ((obj.otyp === O.BAG_OF_TRICKS || obj.otyp === O.HORN_OF_PLENTY)
            ? (obj.spe === 0 && !known)
            : ((Is_container(obj) || obj.otyp === O.STATUE)
               && !Has_contents(obj))))
        prefix += "empty ";

    if (bknown && obj.oclass !== O.COIN_CLASS
        && (obj.otyp !== O.POT_WATER || !objects[O.POT_WATER].oc_name_known
            || (!obj.cursed && !obj.blessed))) {
        if (obj.cursed)
            prefix += "cursed ";
        else if (obj.blessed)
            prefix += "blessed ";
        else if (!(game.flags?.implicit_uncursed ?? true)
                 || ((!known || !objects[obj.otyp].oc_charged
                      || obj.oclass === O.ARMOR_CLASS
                      || obj.oclass === O.RING_CLASS)
                     && obj.otyp !== O.SCR_MAIL
                     && obj.otyp !== O.FAKE_AMULET_OF_YENDOR
                     && obj.otyp !== O.AMULET_OF_YENDOR
                     && !Role_if(M.PM_CLERIC)))
            prefix += "uncursed ";
    }

    if (Is_box(obj) && obj.otrapped && obj.tknown && obj.dknown)
        prefix += "trapped ";
    if (lknown && Is_box(obj)) {
        if (obj.obroken)
            prefix += "broken ";
        else if (obj.olocked)
            prefix += "locked ";
        else
            prefix += "unlocked ";
    }

    if (obj.greased)
        prefix += "greased ";

    if (cknown && Has_contents(obj) && obj.cobj.length /* cobj != NULL */) {
        /* we count the number of separate stacks, which corresponds
           to the number of inventory slots needed to be able to take
           everything out if no merges occur;
           count_contents(obj, FALSE, FALSE, TRUE, FALSE) */
        const itemcount = obj.cobj.length;

        bp += ` containing ${itemcount} item${(itemcount === 1) ? "" : "s"}`;
    }

    switch (is_weptool(obj) ? O.WEAPON_CLASS : obj.oclass) {
    case O.AMULET_CLASS:
        if (obj.owornmask & W_AMUL)
            bp += " (being worn)";
        break;
    case O.ARMOR_CLASS:
        if (obj.owornmask & W_ARMOR) {
            if (obj === game.uskin)
                xn_not_ported('uskin suffix');
            bp += /* in case of perm_invent update while Wear/Takeoff
                     is in progress; check doffing() before donning()
                     because donning() returns True for both cases */
                  doffing(obj) ? " (being doffed)"
                  : donning(obj) ? " (being donned)"
                    : " (being worn)";
            /* slippery fingers is an intrinsic condition of the hero
               rather than extrinsic condition of objects, but gloves
               are described as slippery when hero has slippery fingers */
            if (obj === game.uarmg && game.u.uprops[GLIB]?.intrinsic)
                bp = bp.slice(0, -1) + "; slippery)";
            /* !Blind && obj->lamplit && artifact_light(obj): lit gold
               dragon armor */
            if (obj.lamplit)
                xn_not_ported('lit armor suffix');
        }
        /* FALLTHROUGH */
    case O.WEAPON_CLASS:
        if (ispoisoned)
            prefix += "poisoned ";
        prefix = add_erosion_words(obj, prefix);
        if (known)
            prefix += `${obj.spe >= 0 ? "+" : ""}${obj.spe} `;
        break;
    case O.TOOL_CLASS:
        if (obj.owornmask & (W_TOOL_XN | W_SADDLE_XN)) { /* blindfold */
            bp += " (being worn)";
            break;
        }
        if (obj.otyp === O.LEASH && obj.leashmon) {
            const mlsh = find_mid_xn(obj.leashmon, FM_FMON_XN);

            if (mlsh && !(mlsh.mhp < 1) /* !DEADMONSTER(mlsh) */) {
                bp += ` (attached to ${noit_mon_nam_xn(mlsh)})`;
            } else {
                if (mlsh) /*&& DEADMONSTER(mlsh)*/
                    impossible_xn(`leashed ${mon_pmname_xn(mlsh)} #${obj.leashmon} is dead`);
                else
                    impossible_xn(`leashed monster #${obj.leashmon} not found`);
                obj.leashmon = 0;
            }
            break;
        }
        if (obj.otyp === O.CANDELABRUM_OF_INVOCATION) {
            xn_not_ported('candelabrum suffix');
        } else if (obj.otyp === O.OIL_LAMP || obj.otyp === O.MAGIC_LAMP
                   || obj.otyp === O.BRASS_LANTERN || Is_candle_x(obj)) {
            if (Is_candle_x(obj)) {
                let timer;
                const full_burn_time = 20 * objects[obj.otyp].oc_cost;
                let turns_left = obj.age;

                if (obj.lamplit) {
                    timer = obj_to_any(obj);
                    /* without this, wishing for "lit candle" yields
                       "partly used candle (lit)" because the time it can
                       burn gets adjusted when it becomes lit; matters for
                       the message as it gets added to invent and also if it
                       gets snuffed out immediately (where it will end up as
                       not partly used after all) */
                    turns_left += peek_timer(BURN_OBJECT, timer) - game.moves;
                }
                if (turns_left < full_burn_time)
                    prefix += "partly used ";
            }
            if (obj.lamplit)
                bp += " (lit)";
            break;
        }
        if (objects[obj.otyp].oc_charged && known)
            bp += ` (${obj.recharged | 0}:${obj.spe})`;
        break;
    case O.WAND_CLASS:
        if (known)
            bp += ` (${obj.recharged | 0}:${obj.spe})`;
        break;
    case O.POTION_CLASS:
        if (obj.otyp === O.POT_OIL && obj.lamplit)
            bp += " (lit)";
        break;
    case O.RING_CLASS:
        /* ring: normal rings reach here 'naturally' */
        if (obj.owornmask & W_RINGR)
            bp += " (on right ";
        if (obj.owornmask & W_RINGL)
            bp += " (on left ";
        if (obj.owornmask & (W_RINGL | W_RINGR)) /* either left or right */
            bp += `${body_part(HAND)})`;
        if (known && objects[obj.otyp].oc_charged)
            prefix += `${obj.spe >= 0 ? "+" : ""}${obj.spe} `;
        break;
    case O.FOOD_CLASS:
        if (obj.oeaten)
            prefix += "partly eaten ";
        if (obj.otyp === O.CORPSE) {
            /* (quan == 1) => want corpse_xname() to supply article,
               (quan != 1) => already have count or "some" as prefix;
               "corpse" is already in the buffer returned by xname() */
            const cxarg = (((obj.quan !== 1) ? 0 : CXN_ARTICLE)
                           | CXN_NOCORPSE);
            prefix = `${corpse_xname(obj, prefix, cxarg)} `;
        } else if (obj.otyp === O.EGG) {
            const omndx = obj.corpsenm;
            if (omndx_ok(omndx)
                && (known || (game.mvitals[omndx].mvflags & M.MV_KNOWS_EGG))) {
                prefix += mons[omndx].pmnames[NEUTRAL];
                prefix += " ";
                if (obj.spe === 1)
                    bp += " (laid by you)";
            }
        } else if (obj.otyp === O.MEAT_RING)
            xn_not_ported('meat ring');
        break;
    case O.BALL_CLASS:
    case O.CHAIN_CLASS:
        prefix = add_erosion_words(obj, prefix);
        if (obj.owornmask & (W_BALL | W_CHAIN))
            bp += ` (${(obj.owornmask & W_BALL) ? "chained" : "attached"} to you)`;
        break;
    }

    if ((obj.owornmask & W_WEP) && !game.mrg_to_wielded) {
        const twoweap_primary = (obj === game.uwep && game.u?.twoweap),
              tethered = (obj.otyp === O.AKLYS);

        /* use alternate phrasing for non-weapons and for wielded ammo
           (arrows, bolts), or missiles (darts, shuriken, boomerangs)
           except when those are being actively dual-wielded */
        if ((obj.quan !== 1
             || ((obj.oclass === O.WEAPON_CLASS)
                 ? (is_ammo(obj) || is_missile(obj))
                 : !is_weptool(obj)))
            && !twoweap_primary) {
            bp += " (wielded)";
        } else {
            let hand_s = body_part(HAND);
            if (objects[obj.otyp].oc_bimanual) /* bimanual(): "hands" */
                hand_s = makeplural(hand_s);
            else /* "right hand" or "left hand" */
                hand_s = `${(game.u?.uhandedness ?? 0) === 0 ? "right" : "left"} ${hand_s}`;
            bp += ` (${tethered ? "tethered to"
                      : twoweap_primary ? "wielded in"
                        : "weapon in"} ${hand_s})`;
            /* Sting's warning glow and artifact light are not ported */
        }
    }
    if (obj.owornmask & W_SWAPWEP) {
        if (game.u?.twoweap) /* URIGHTY */
            bp += ` (wielded in ${(game.u?.uhandedness ?? 0) === 0 ? "left" : "right"} ${body_part(HAND)})`;
        else
            bp += ` (alternate weapon${obj.quan === 1 ? "" : "s"}; not wielded)`;
    }
    if (obj.owornmask & W_QUIVER) {
        let Qtyp;

        switch (obj.oclass) {
        case O.WEAPON_CLASS:
            Qtyp = !is_ammo(obj) ? 3 /* not ammo: "at the ready" */
                : (objects[obj.otyp].oc_skill !== -P_BOW) ? 2 /* non-bow */
                    : 1; /* ammo for a bow: "in quiver" */
            break;
        case O.RING_CLASS:
        case O.AMULET_CLASS:
        case O.WAND_CLASS:
        case O.COIN_CLASS:
        case O.GEM_CLASS:
            Qtyp = 2; /* small, non-bow: "in quiver pouch" */
            break;
        default: /* odd things */
            Qtyp = 3; /* "at the ready" */
            break;
        }
        bp += ` (${(Qtyp === 1) ? "in quiver"
                  : (Qtyp === 2) ? "in quiver pouch"
                    : "at the ready"})`;
    }
    if ((obj.owornmask & ~(W_ARMOR | W_AMUL | W_WEP | W_SWAPWEP | W_QUIVER
                           | W_RINGL | W_RINGR | W_BALL | W_CHAIN
                           | ((obj.oclass === O.TOOL_CLASS && !is_weptool(obj))
                              ? (W_TOOL_XN | W_SADDLE_XN) : 0)))
        || ((obj.owornmask & (W_RINGL | W_RINGR)) && obj.oclass !== O.RING_CLASS))
        xn_not_ported('meat ring/tool/leash worn suffixes');

    /* treat 'restoring' like suppress_price because shopkeeper and
       bill might not be available yet while restore is in progress */
    if (game.iflags?.suppress_price || game.program_state?.restoring) {
        ; /* don't attempt to obtain any shop pricing, even if 'with_price' */
    } else if (is_unpaid(obj)) { /* in inventory or in container in invent */
        const quotedprice = unpaid_cost(obj, COST_CONTENTS);

        /* separately formatted suffix avoids need for ConcatF3() */
        const pricebuf = `${quotedprice} ${currency(quotedprice)}`;
        bp += ` (${obj.unpaid ? "unpaid" : "contents"}, ${pricebuf})`;

        record_price_quote(obj.otyp, Math.trunc(quotedprice / obj.quan), true);
    } else if (with_price) { /* on floor or in container on floor */
        const nochrg = { v: 0 };
        const price = get_cost_of_shop_item(obj, nochrg);

        if (price > 0) {
            const pricebuf = `${price} ${currency(price)}`;
            bp += ` (${nochrg.v ? "contents" : "for sale"}, ${pricebuf})`;
        } else if (nochrg.v > 0) {
            bp += " (no charge)";
        } else if (game.iflags?.pricequotes && !objects[obj.otyp].oc_name_known) {
            bp = append_price_quote(bp, obj.otyp);
        }

        if (price > 0)
            record_price_quote(obj.otyp, Math.trunc(price / obj.quan), true);
    } else if (game.iflags?.pricequotes && !objects[obj.otyp].oc_name_known) {
        bp = append_price_quote(bp, obj.otyp);
    }

    if (prefix.startsWith("a ")) {
        const tmpbuf = prefix.slice(2);
        prefix = just_an(tmpbuf ? tmpbuf : bp) + tmpbuf;
    }
    return prefix + bp; /* strprepend(bp, prefix) */
}

function omndx_ok(n) { return n != null && n >= 0; }
// C ref: role.h Role_if()
// C ref: obj.h Is_candle()
function Is_candle_x(otmp) {
    return otmp.otyp === O.TALLOW_CANDLE || otmp.otyp === O.WAX_CANDLE;
}
// C ref: objclass.h GemStone()
function GemStone_x(typ) {
    return typ === O.FLINT
        || (objects[typ].oc_material === O.GEMSTONE
            && typ !== O.DILITHIUM_CRYSTAL && typ !== O.RUBY
            && typ !== O.DIAMOND && typ !== O.SAPPHIRE
            && typ !== O.BLACK_OPAL && typ !== O.EMERALD
            && typ !== O.OPAL);
}

// C ref: objnam.c short_oname()
/* used by safe_qbuf() and dodip() to shorten an object's formatted name */
export function short_oname(obj,
                            func,     /* main formatting routine */
                            altfunc,  /* alternate for shortest result */
                            lenlimit) {
    const UNAMEBUFSZ = 12, ONAMEBUFSZ = 12; /* sizeof unamebuf, onamebuf */
    let unamebuf = null, onamebuf = null;

    let outbuf = func(obj);
    if (outbuf.length <= lenlimit)
        return outbuf;

    /* shorten called string to fairly small amount */
    const save_uname = objects[obj.otyp].oc_uname;
    if (save_uname && save_uname.length >= UNAMEBUFSZ) {
        unamebuf = save_uname.slice(0, UNAMEBUFSZ - 4) + "...";
        objects[obj.otyp].oc_uname = unamebuf;
        outbuf = func(obj);
        objects[obj.otyp].oc_uname = save_uname; /* restore called string */
        if (outbuf.length <= lenlimit)
            return outbuf;
    }

    /* shorten named string to fairly small amount */
    const save_oname = has_oname(obj) ? ONAME(obj) : null;
    if (save_oname && save_oname.length >= ONAMEBUFSZ) {
        onamebuf = save_oname.slice(0, ONAMEBUFSZ - 4) + "...";
        obj.oextra.oname = onamebuf;
        outbuf = func(obj);
        obj.oextra.oname = save_oname; /* restore named string */
        if (outbuf.length <= lenlimit)
            return outbuf;
    }

    /* shorten both called and named strings;
       unamebuf and onamebuf have both already been populated */
    if (save_uname && save_uname.length >= UNAMEBUFSZ && save_oname
        && save_oname.length >= ONAMEBUFSZ) {
        objects[obj.otyp].oc_uname = unamebuf;
        obj.oextra.oname = onamebuf;
        outbuf = func(obj);
        if (outbuf.length <= lenlimit) {
            objects[obj.otyp].oc_uname = save_uname;
            obj.oextra.oname = save_oname;
            return outbuf;
        }
    }

    /* still long; strip several name-lengthening attributes;
       called and named strings are still in truncated form */
    const save_obj = { ...obj };
    obj.bknown = obj.rknown = obj.greased = 0;
    obj.oeroded = obj.oeroded2 = 0;
    outbuf = func(obj);
    if (altfunc && outbuf.length > lenlimit) {
        /* still long; use the alternate function (usually one of
           the jackets around minimal_xname()) */
        outbuf = altfunc(obj);
    }
    /* restore the object */
    Object.assign(obj, save_obj);
    if (save_oname)
        obj.oextra.oname = save_oname;
    if (save_uname)
        objects[obj.otyp].oc_uname = save_uname;

    /* use whatever we've got, whether it's too long or not */
    return outbuf;
}
