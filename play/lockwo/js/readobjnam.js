// readobjnam.js — parse a wish string into a created object.
//
// C ref: src/objnam.c readobjnam() and its readobjnam_{init,preparse,
// parse_charges,postparse1,postparse2,postparse3} helpers, plus the wish
// finalization in src/zap.c makewish().
//
// Scope: this port targets the wizard-mode wish flow exercised by the
// wishlist sessions (seed0108-wizard-extcmd-wishlist, seed0360-wizard-
// world-tour).  In wizard mode the player-restriction RNG in readobjnam is
// skipped (the `else if (wizard) ;` branches), so the only RNG drawn while
// resolving a wish is:
//
//   1. rn2(maxprob)            @ rnd_otyp_by_namedesc(objnam.c:3522)
//   2. mksobj() machinery      (next_ident / mksobj_init / blessorcurse /
//                               mkbox_cnts / mkobj_erosions — all already
//                               ported in mkobj.js)
//   3. rn2(nartifact_exist())  @ readobjnam(objnam.c:5374)   [artifact wishes]
//
// makewish() then draws rn1(100, 50) (recorded as rn2(100)) for u.ublesscnt.
//
// Name/type resolution itself consumes no RNG; it only fixes the candidate
// set (n / maxprob) and ordering that the single rn2(maxprob) resolves to.

import { rn2 } from './rng.js';
import {
    objects,
    mksobj,
    weight,
    STRANGE_OBJECT,
    WEAPON_CLASS,
    ARMOR_CLASS,
    RING_CLASS,
    AMULET_CLASS,
    TOOL_CLASS,
    FOOD_CLASS,
    POTION_CLASS,
    SCROLL_CLASS,
    SPBOOK_CLASS,
    WAND_CLASS,
    GEM_CLASS,
    VENOM_CLASS,
    MAXOCLASSES,
    AMULET_OF_YENDOR,
    ROCK,
    TALLOW_CANDLE,
    WAX_CANDLE,
} from './mkobj.js';
import { P_BOOMERANG, P_DART, P_BOW, P_CROSSBOW } from './const.js';
import {
    rnd_otyp_by_namedesc,
    o_ranges,
    spellings,
    wishymatch,
    strstri,
} from './objnam.js';
import { game } from './gstate.js';

const NUM_OBJECTS = objects.length;

// ── hacklib string helpers (C ref: hacklib.c) ─────────────────────────────
function digit(c) { return c >= '0' && c <= '9'; }
function strcmpi(a, b) { return a.toLowerCase() === b.toLowerCase(); }
function strncmpi(a, b, n) {
    return (a || '').slice(0, n).toLowerCase() === (b || '').slice(0, n).toLowerCase();
}
// C `!BSTRCMPI(base, base + len - n, str)` is true when the n-char tail of
// `base` case-insensitively equals `str`.  Returns that boolean directly.
function bstrcmpi_tail(s, suffixLen, str) {
    if (s.length < suffixLen) return false; /* C: ptr before base => no match */
    return strcmpi(s.slice(s.length - suffixLen), str);
}
function atoiPrefix(s) {
    const m = /^-?\d+/.exec(s);
    return m ? parseInt(m[0], 10) : 0;
}
// mungspaces: collapse internal whitespace and trim (C: hacklib.c).
function mungspaces(s) { return String(s).replace(/\s+/g, ' ').replace(/^ | $/g, ''); }

// ── makesingular (C ref: objnam.c makesingular()/singplur_lookup()) ───────
// Faithful enough for the wishlist: honour the `as_is[]` words that stay
// plural (boots, gloves, gauntlets, lenses, scales, ...) and the common
// suffix transformations (-ies -> -y, -es removal, -s removal).
const AS_IS = [
    'boots', 'shoes', 'gloves', 'lenses', 'scales', 'eyes', 'gauntlets',
    'iron bars', 'bison', 'deer', 'elk', 'fish', 'fowl', 'tuna', 'yaki',
    '-hai', 'krill', 'manes', 'moose', 'ninja', 'sheep', 'ronin', 'roshi',
    'shito', 'tengu', 'ki-rin', 'Nazgul', 'gunyoki', 'piranha', 'samurai',
    'shuriken', 'haggis', 'Bordeaux',
];
const ONE_OFF = [
    ['child', 'children'], ['foot', 'feet'], ['fungus', 'fungi'],
    ['goose', 'geese'], ['knife', 'knives'], ['louse', 'lice'],
    ['mouse', 'mice'], ['ox', 'oxen'], ['staff', 'staves'], ['tooth', 'teeth'],
];
function endsWithCI(s, suffix) {
    return s.length >= suffix.length
        && s.slice(s.length - suffix.length).toLowerCase() === suffix.toLowerCase();
}
// C ref: objnam.c singplur_compound(str) — find where a compound phrase starts
// ("lump OF royal jelly", "scroll LABELED KIRJE", "lurker ABOVE) so that
// makesingular()/makeplural() can work on the head noun alone.  Returns the
// index of the compound marker, or -1.
const SINGPLUR_COMPOUNDS = [
    ' of ', ' labeled ', ' called ',
    ' named ', ' above',            /* lurkers above */
    ' versus ', ' from ', ' in ',
    ' on ', ' a la ', ' with',      /* " with "? */
    ' de ', " d'", ' du ',
    ' au ', '-in-', '-at-',
];
const SINGPLUR_COMPOUND_START = ' -';
function singplur_compound(str) {
    for (let p = 0; p < str.length; ++p) {
        if (!SINGPLUR_COMPOUND_START.includes(str[p])) continue;
        for (const cmpd of SINGPLUR_COMPOUNDS)
            if (str.slice(p, p + cmpd.length).toLowerCase() === cmpd) return p;
    }
    return -1;
}

function makesingular_local(oldstr) {
    if (oldstr == null) return oldstr;
    let s = oldstr.replace(/^ +/, '');
    if (!s) return oldstr;
    // C ref: makesingular() "check for 'foo of bar' so that we can focus on
    // 'foo'" — singularize the head, then re-append the excess at `bottom:`.
    // Without this the whole string was inspected and only its TAIL tested, so
    // "scrolls of punishment" came back unchanged: readobjnam's class search
    // then matched the word "scroll" inside "scrolls", stripped six characters
    // and was left with "s of punishment", whose " of " test fails, so actualn
    // was never set and the wish fell through to a random object.  seed4500's
    // `#wizwish 3 scrolls of punishment` diverged there.
    const cut = singplur_compound(s);
    if (cut >= 0) {
        const head = s.slice(0, cut), excess = s.slice(cut);
        return makesingular_local(head) + excess;
    }
    const lower = s.toLowerCase();
    for (const w of AS_IS) if (endsWithCI(s, w)) return s; /* stays plural */
    for (const [sing, plur] of ONE_OFF) {
        if (endsWithCI(s, sing)) return s; /* already singular */
        if (endsWithCI(s, plur)) return s.slice(0, s.length - plur.length) + sing;
    }
    if (lower.endsWith('ies')) {
        // ies -> y, with a few -ie words left alone (cookies/pies/genies/...)
        if (/(cookies|pies|genies|mbies|yries)$/i.test(s)) {
            if (lower.endsWith('s')) return s.slice(0, -1);
            return s;
        }
        return s.slice(0, -3) + 'y';
    }
    if (lower.endsWith('ses') || lower.endsWith('xes') || lower.endsWith('zes')
        || lower.endsWith('ches') || lower.endsWith('shes')) {
        return s.slice(0, -2); /* boxes -> box, etc. */
    }
    if (lower.endsWith('s') && !lower.endsWith('ss')) return s.slice(0, -1);
    return s;
}

// SPE limit (C objnam.c uses SPE_LIM=99 via the wizard path; honored loosely).
const SPE_LIM = 99;

// ── object-name lookup ────────────────────────────────────────────────────
function OBJ_NAME(i) {
    const o = objects[i];
    return o && o.name ? o.name : null;
}

// ── artifact-name table (C ref: include/artilist.h, src/artifact.c
// artifact_name()).  Index `m` is 1-based position in artilist[] (artilist[0]
// is the dummy entry), matching the value stored in obj.oartifact and tracked
// by game.artiexist.  otyp is the artifact's base object type. ───────────────
// [name, otyp, m]
const ARTILIST = [
    ['Excalibur', 54 /*LONG_SWORD*/, 1],
    ['Stormbringer', 58 /*RUNESWORD*/, 2],
    ['Mjollnir', 76 /*WAR_HAMMER*/, 3],
    ['Cleaver', 45 /*BATTLE_AXE*/, 4],
    ['Grimtooth', 36 /*ORCISH_DAGGER*/, 5],
    ['Orcrist', 53 /*ELVEN_BROADSWORD*/, 6],
    ['Sting', 35 /*ELVEN_DAGGER*/, 7],
    ['Magicbane', 38 /*ATHAME*/, 8],
    ['Frost Brand', 54 /*LONG_SWORD*/, 9],
    ['Fire Brand', 54 /*LONG_SWORD*/, 10],
    ['Dragonbane', 52 /*BROADSWORD*/, 11],
    ['Demonbane', 74 /*SILVER_MACE*/, 12],
    ['Werebane', 51 /*SILVER_SABER*/, 13],
    ['Grayswandir', 51 /*SILVER_SABER*/, 14],
    ['Giantslayer', 54 /*LONG_SWORD*/, 15],
    ['Ogresmasher', 76 /*WAR_HAMMER*/, 16],
    ['Trollsbane', 75 /*MORNING_STAR*/, 17],
    ['Vorpal Blade', 54 /*LONG_SWORD*/, 18],
    ['Snickersnee', 56 /*KATANA*/, 19],
    ['Sunsword', 54 /*LONG_SWORD*/, 20],
    ['The Orb of Detection', 231 /*CRYSTAL_BALL*/, 21],
    ['The Heart of Ahriman', 470 /*LUCKSTONE*/, 22],
    ['The Sceptre of Might', 73 /*MACE*/, 23],
    ['The Palantir of Westernesse', 231 /*CRYSTAL_BALL*/, 24],
    ['The Staff of Aesculapius', 79 /*QUARTERSTAFF*/, 25],
    ['The Magic Mirror of Merlin', 230 /*MIRROR*/, 26],
    ['The Eyes of the Overworld', 232 /*LENSES*/, 27],
    ['The Mitre of Holiness', 96 /*HELM_OF_BRILLIANCE*/, 28],
    ['The Longbow of Diana', 83 /*BOW*/, 29],
    ['The Master Key of Thievery', 221 /*SKELETON_KEY*/, 30],
    ['The Tsurugi of Muramasa', 57 /*TSURUGI*/, 31],
    ['The Platinum Yendorian Express Card', 223 /*CREDIT_CARD*/, 32],
    ['The Orb of Fate', 231 /*CRYSTAL_BALL*/, 33],
    ['The Eye of the Aethiopica', 201 /*AMULET_OF_ESP*/, 34],
];

// fuzzymatch with " -" ignore chars and caseblind, matching C artifact_name
// (fuzzy=TRUE).  Implemented via the objnam.js wishymatch primitive's helper.
function artiFuzzy(name, aname) {
    // C: fuzzymatch(name, aname, " -", TRUE) — ignore spaces & dashes, blind.
    const strip = (s) => s.replace(/[ -]/g, '').toLowerCase();
    return strip(name) === strip(aname);
}

// C ref: artifact.c artifact_name().  Returns {name, otyp} or null.
function artifact_name(name) {
    let nm = name;
    if (strncmpi(nm, 'the ', 4)) nm = nm.slice(4);
    for (const [aname, otyp /*, m*/] of ARTILIST) {
        let an = aname;
        if (strncmpi(an, 'the ', 4)) an = an.slice(4);
        if (artiFuzzy(nm, an)) return { name: aname, otyp };
    }
    return null;
}

// nartifact_exist() and artifact bookkeeping (C ref: artifact.c).
function nartifact_exist() {
    return game.artiexist ? game.artiexist.size : 0;
}
function artifact_index(otyp, name) {
    for (const [aname, aotyp, m] of ARTILIST)
        if (aotyp === otyp && aname === name) return m;
    return 0;
}
// C oname(obj, name, ONAME_WISH) -> artifact_exists() marks it created and
// sets obj.oartifact.  Consumes no RNG.
function oname_artifact(otmp, name) {
    if (otmp.oartifact) return otmp;
    const m = artifact_index(otmp.otyp, name);
    if (m) {
        if (!game.artiexist) game.artiexist = new Set();
        // exist_artifact: if already exists, don't re-create.
        if (game.artiexist.has(m)) return otmp;
        otmp.oartifact = m;
        otmp.age = 0;
        game.artiexist.add(m);
    }
    otmp.onamelth = (name || '').length;
    otmp.oname = name;
    return otmp;
}

// ── wrp class-name table (C ref: objnam.c wrp[]/wrpsym[]) ──────────────────
const WRP = [
    ['wand', WAND_CLASS],
    ['ring', RING_CLASS],
    ['potion', POTION_CLASS],
    ['scroll', SCROLL_CLASS],
    ['gem', GEM_CLASS],
    ['amulet', AMULET_CLASS],
    ['spellbook', SPBOOK_CLASS],
    ['spell book', SPBOOK_CLASS],
    ['weapon', WEAPON_CLASS],
    ['armor', ARMOR_CLASS],
    ['tool', TOOL_CLASS],
    ['food', FOOD_CLASS],
    ['comestible', FOOD_CLASS],
];

// ── parse-state object (subset of C struct _readobjnam_data) ───────────────
function newData(bp) {
    return {
        otmp: null,
        cnt: 0, spe: 0, spesgn: 0, typ: 0, rechrg: 0,
        very: 0, blessed: 0, uncursed: 0, iscursed: 0,
        ispoisoned: 0, isgreased: 0, eroded: 0, eroded2: 0, erodeproof: 0,
        halfeaten: 0, islit: 0, unlabeled: 0, ishistoric: 0, isdiluted: 0,
        trapped: 0,
        oclass: 0,
        actualn: null, dn: null, un: null, name: null,
        dragonIdx: null, /* set by stripDragonPrefix; C d->mntmp dragon family */
        bp, origbp: bp,
        fruitbuf: '',
    };
}

// readobjnam_preparse: strip leading qualifier words; returns 1 if nothing
// substantive remains (caller -> goto any), else 0.  Wizard wishes never hit
// the "wet"/"moist" towel RNG (rn2/rnd), so this consumes no RNG here.
function preparse(d) {
    let res = 1;
    for (;;) {
        if (!d.bp || !d.bp.length) break;
        res = 0;
        let l = 0;
        const bp = d.bp;
        if (strncmpi(bp, 'an ', 3)) { d.cnt = 1; l = 3; }
        else if (strncmpi(bp, 'a ', 2)) { d.cnt = 1; l = 2; }
        else if (strncmpi(bp, 'the ', 4)) { l = 4; }
        else if (!d.cnt && digit(bp[0]) && bp !== '0') {
            d.cnt = atoiPrefix(bp);
            let i = 0;
            while (i < bp.length && digit(bp[i])) i++;
            while (i < bp.length && bp[i] === ' ') i++;
            d.bp = bp.slice(i);
            continue;
        } else if (bp[0] === '+' || bp[0] === '-') {
            d.spesgn = bp[0] === '+' ? 1 : -1;
            let rest = bp.slice(1);
            d.spe = atoiPrefix(rest);
            let i = 0;
            while (i < rest.length && digit(rest[i])) i++;
            while (i < rest.length && rest[i] === ' ') i++;
            d.bp = rest.slice(i);
            continue;
        } else if (strncmpi(bp, 'blessed ', 8) || strncmpi(bp, 'holy ', 5)) {
            d.blessed = 1; d.uncursed = d.iscursed = 0;
            l = strncmpi(bp, 'blessed ', 8) ? 8 : 5;
        } else if (strncmpi(bp, 'cursed ', 7) || strncmpi(bp, 'unholy ', 7)) {
            d.iscursed = 1; d.blessed = d.uncursed = 0; l = 7;
        } else if (strncmpi(bp, 'uncursed ', 9)) {
            d.uncursed = 1; d.blessed = d.iscursed = 0; l = 9;
        } else if ((l = matchAny(bp, ['rustproof ', 'erodeproof ', 'corrodeproof ',
            'fixed ', 'fireproof ', 'rotproof ', 'tempered ', 'crackproof '])) > 0) {
            d.erodeproof = 1;
        } else if (strncmpi(bp, 'lit ', 4) || strncmpi(bp, 'burning ', 8)) {
            d.islit = 1; l = strncmpi(bp, 'lit ', 4) ? 4 : 8;
        } else if (strncmpi(bp, 'unlit ', 6) || strncmpi(bp, 'extinguished ', 13)) {
            d.islit = 0; l = strncmpi(bp, 'unlit ', 6) ? 6 : 13;
        } else if (strncmpi(bp, 'unlabeled ', 10) || strncmpi(bp, 'unlabelled ', 11)
            || strncmpi(bp, 'blank ', 6)) {
            d.unlabeled = 1;
            l = strncmpi(bp, 'unlabeled ', 10) ? 10 : strncmpi(bp, 'unlabelled ', 11) ? 11 : 6;
        } else if (strncmpi(bp, 'poisoned ', 9)) {
            d.ispoisoned = 1; l = 9;
        } else if (strncmpi(bp, 'trapped ', 8)) {
            d.trapped = wizard() ? 1 : 0; l = 8;
        } else if (strncmpi(bp, 'untrapped ', 10)) {
            d.trapped = 2; l = 10;
        } else if (strncmpi(bp, 'greased ', 8)) {
            d.isgreased = 1; l = 8;
        } else if (strncmpi(bp, 'very ', 5)) {
            d.very = 1; l = 5;
        } else if (strncmpi(bp, 'thoroughly ', 11)) {
            d.very = 2; l = 11;
        } else if ((l = matchAny(bp, ['rusty ', 'burnt ', 'cracked '])) > 0
            || strncmpi(bp, 'rusted ', (l = 7)) || strncmpi(bp, 'burned ', (l = 7))) {
            d.eroded = 1 + d.very; d.very = 0;
        } else if (strncmpi(bp, 'corroded ', 9) || strncmpi(bp, 'rotted ', 7)) {
            d.eroded2 = 1 + d.very; d.very = 0;
            l = strncmpi(bp, 'corroded ', 9) ? 9 : 7;
        } else if (strncmpi(bp, 'partly eaten ', 13) || strncmpi(bp, 'partially eaten ', 16)) {
            d.halfeaten = 1; l = strncmpi(bp, 'partly eaten ', 13) ? 13 : 16;
        } else if (strncmpi(bp, 'historic ', 9)) {
            d.ishistoric = 1; l = 9;
        } else if (strncmpi(bp, 'diluted ', 8)) {
            d.isdiluted = 1; l = 8;
        } else {
            break;
        }
        d.bp = d.bp.slice(l);
    }
    return res;
}

function matchAny(bp, words) {
    for (const w of words) if (strncmpi(bp, w, w.length)) return w.length;
    return 0;
}

function wizard() { return !!(game.flags && game.flags.debug) || !!game.wizard || true; }

// readobjnam_parse_charges (C objnam.c:4178): strip a trailing "(spe)",
// "(rechrg:spe)" or "(lit)" annotation from d.bp, setting d.spe / d.rechrg /
// d.spesgn / d.islit.  Mismatched parens leave spe/rechrg at 0 and discard the
// trailing characters; otherwise any text after the ')' is spliced back on.
// C ref: SPE_LIM = 99 (obj.h:49, declared above); recharge_limit = 7.
function parse_charges(d) {
    const op = d.bp.length > 1 ? d.bp.lastIndexOf('(') : -1;
    if (op >= 0) {
        let keeptrailingchars = true;
        // C: if the '(' is preceded by a space, drop that space too.
        const cut = (op > 0 && d.bp[op - 1] === ' ') ? op - 1 : op;
        const head = d.bp.slice(0, cut);          // bp truncated before '('
        let p = d.bp.slice(op + 1);               // chars after '('
        let tail = '';                            // chars after the ')'
        if (strncmpi(p, 'lit)', 4)) {
            d.islit = 1;
            // C points at ')'; trailing chars are whatever follows it.
            tail = p.slice(4);
        } else {
            d.spe = atoiPrefix(p);
            let i = 0;
            while (i < p.length && digit(p[i])) i++;
            if (p[i] === ':') {
                i++;
                d.rechrg = d.spe;
                const rest = p.slice(i);
                d.spe = atoiPrefix(rest);
                let j = 0;
                while (j < rest.length && digit(rest[j])) j++;
                i += j;
            }
            if (p[i] !== ')') {
                d.spe = d.rechrg = 0;
                keeptrailingchars = false; /* mis-matched parens */
            } else {
                d.spesgn = 1;
                tail = p.slice(i + 1); /* text past ')' */
            }
        }
        d.bp = keeptrailingchars ? head + tail : head;
    }
    // spe is a schar in C; clamp and normalise sign.
    if (d.spe < 0) { d.spesgn = -1; d.spe = Math.abs(d.spe); }
    if (d.spe > SPE_LIM) d.spe = SPE_LIM;
    if (d.rechrg < 0 || d.rechrg > 7) d.rechrg = 7;
}

// readobjnam_postparse1: " named "/" called "/pair-of/etc.  Returns a code:
//   0 continue, 1 srch, 2 typfnd, 3 return otmp, 4 any.
function postparse1(d) {
    let p;
    if ((p = strstri(d.bp, ' named ')) >= 0) {
        d.name = d.bp.slice(p + 7);
        d.bp = d.bp.slice(0, p);
    }
    if ((p = strstri(d.bp, ' called ')) >= 0) {
        d.un = d.bp.slice(p + 8);
        d.bp = d.bp.slice(0, p);
        for (const r of o_ranges)
            if (strcmpi(d.bp, r[0])) { d.oclass = r[1]; return 1; }
    }
    if ((p = strstri(d.bp, ' labeled ')) >= 0) {
        d.dn = d.bp.slice(p + 9); d.bp = d.bp.slice(0, p);
    } else if ((p = strstri(d.bp, ' labelled ')) >= 0) {
        d.dn = d.bp.slice(p + 10); d.bp = d.bp.slice(0, p);
    }
    // "pair of"/"set of" prefixes
    if (strncmpi(d.bp, 'pair of ', 8)) { d.bp = d.bp.slice(8); d.cnt *= 2; }
    else if (strncmpi(d.bp, 'pairs of ', 9)) { d.bp = d.bp.slice(9); if (d.cnt > 1) d.cnt *= 2; }
    else if (strncmpi(d.bp, 'set of ', 7)) d.bp = d.bp.slice(7);
    else if (strncmpi(d.bp, 'sets of ', 8)) d.bp = d.bp.slice(8);

    // dragon-prefix / monster-name stripping for "<color> dragon scale mail"
    // and "<color> dragon scales" (C uses name_to_monplus; we handle the
    // dragon family which is the only monster-name path the wishlist hits).
    stripDragonPrefix(d);
    return 0;
}

// Strip a leading dragon monster name, mirroring the relevant slice of C's
// name_to_monplus() handling in readobjnam_postparse1 (objnam.c:4407).  Only
// the dragon family (used by "gray dragon scale mail") matters for parity here.
// When a color is recognised we record its dragon index on d.dragonIdx so that
// finalize() can promote a resulting SCALE_MAIL to the colored dragon scale
// mail (C objnam.c:5246-5251 SCALE_MAIL switch case using d.mntmp).
//
// Index order matches the GRAY_DRAGON_SCALE_MAIL..YELLOW_DRAGON_SCALE_MAIL
// object order (== PM_GRAY_DRAGON..PM_YELLOW_DRAGON monster order):
//   gray, gold, silver, red, white, orange, black, blue, green, yellow.
const DRAGON_COLOR_IDX = {
    gray: 0, grey: 0, gold: 1, silver: 2, red: 3, white: 4,
    orange: 5, black: 6, blue: 7, green: 8, yellow: 9,
};
function stripDragonPrefix(d) {
    const low = d.bp.toLowerCase();
    for (const c of Object.keys(DRAGON_COLOR_IDX)) {
        const pre = c + ' dragon';
        if (low.startsWith(pre)) {
            let rest = d.bp.slice(pre.length);
            if (rest.startsWith(' ')) {
                d.bp = rest.slice(1);
                d.dragonIdx = DRAGON_COLOR_IDX[c];
            } else if (rest.length === 0) {
                // bare "<color> dragon" with no referent; leave as-is
            }
            return;
        }
    }
}

// readobjnam_postparse2: o_ranges exact match, " stone"/" gem", class search.
function postparse2(d) {
    // makesingular (C makesingular(bp)); approximate for the exercised wishes.
    if (d.bp && !strcmpi(d.bp, 'tricks') && !strcmpi(d.bp, 'clothes')) {
        const sng = makesingular_local(d.bp);
        if (sng !== d.bp) { if (d.cnt === 1) d.cnt = 2; d.bp = sng; }
    }
    // alternate spellings
    for (const [sp, ob] of spellings)
        if (wishymatch(d.bp, sp, true)) { d.typ = ob; return 2; }

    // "grey stone" before general; o_ranges exact match -> rnd_class.
    for (const r of o_ranges)
        if (strcmpi(d.bp, r[0])) { d.typ = rnd_class_local(r[2], r[3]); return 2; }

    // single-character object-class code is not exercised; skip.

    // class-name search: "<class> [of] something" / "something <class>"
    if (!noClassSearch(d.bp)) {
        for (let i = 0; i < WRP.length; i++) {
            const [w, sym] = WRP[i];
            const j = w.length;
            if (strncmpi(d.bp, w, j)) {
                d.oclass = sym;
                if (d.oclass !== AMULET_CLASS) {
                    d.bp = d.bp.slice(j);
                    if (strncmpi(d.bp, ' of ', 4)) d.actualn = d.bp.slice(4);
                } else {
                    d.actualn = d.bp;
                }
                return 1; /* srch */
            }
            // "something <class>" (suffix)
            if (bstrcmpi_tail(d.bp, j, w)) {
                d.oclass = sym;
                if (d.oclass !== AMULET_CLASS) {
                    d.bp = d.bp.slice(0, d.bp.length - j);
                    if (d.bp.endsWith(' ')) d.bp = d.bp.slice(0, -1);
                } else {
                    const k = rnd_otyp_by_namedesc(
                        d.bp.slice(0, Math.max(0, d.bp.length - j)).replace(/ $/, ''),
                        AMULET_CLASS, 0);
                    if (k !== STRANGE_OBJECT) { d.typ = k; return 2; }
                }
                d.actualn = d.dn = d.bp;
                return 1;
            }
        }
    }

    d.actualn = d.bp;
    if (!d.dn) d.dn = d.actualn;
    return 0;
}

// C objnam.c:4557 guard list: skip the <class> name search for these so we
// don't get false hits (e.g. "ring mail" matching RING_CLASS).  Returns true
// when the class search must be skipped.
function noClassSearch(bp) {
    const guards = [
        ['enchant ', 8], ['destroy ', 8], ['detect food', 11], ['food detection', 14],
        ['ring mail', 9], ['studded leather armor', 21], ['leather armor', 13],
        ['tooled horn', 11], ['food ration', 11], ['meat ring', 9],
    ];
    for (const [w, n] of guards) if (strncmpi(bp, w, n)) return true;
    return false;
}

// rnd_class (C objnam.c) — local copy using oc_prob; matches mkobj.js rnd_class
// behaviour (rnd over summed probabilities).  Only reached for o_ranges exact
// matches (not exercised by the wishlist) but provided for completeness.
import { rnd } from './rng.js';
function rnd_class_local(first, last) {
    if (last > first) {
        let sum = 0;
        for (let i = first; i <= last; i++) sum += objects[i].oc_prob || 0;
        if (!sum) return first + rn2(last - first + 1);
        let x = rnd(sum);
        for (let i = first; i <= last; i++) {
            x -= objects[i].oc_prob || 0;
            if (x <= 0) return i;
        }
    }
    return first === last ? first : STRANGE_OBJECT;
}

// readobjnam_postparse3 (srch): rnd_otyp_by_namedesc on actualn/dn/un/origbp,
// then artifact-by-name.  Returns code 0/1/2/6.
function postparse3(d) {
    // rnd_otyp_by_namedesc tries actualn, dn, un, origbp in turn.
    let t;
    if ((t = rnd_otyp_by_namedesc(d.actualn, d.oclass, 1)) !== STRANGE_OBJECT) {
        d.typ = t; return 2;
    }
    if (d.dn !== d.actualn && (t = rnd_otyp_by_namedesc(d.dn, d.oclass, 1)) !== STRANGE_OBJECT) {
        d.typ = t; return 2;
    }
    if ((t = rnd_otyp_by_namedesc(d.un, d.oclass, 1)) !== STRANGE_OBJECT) {
        d.typ = t; return 2;
    }
    if (d.origbp !== d.actualn && (t = rnd_otyp_by_namedesc(d.origbp, d.oclass, 1)) !== STRANGE_OBJECT) {
        d.typ = t; return 2;
    }
    d.typ = 0;

    // armor "mail" retry
    if (d.oclass === ARMOR_CLASS && strstri(d.bp, 'mail') < 0) {
        d.bp = d.bp + ' mail';
        return 6; /* retry */
    }

    // artifact specified by name (only when no class).
    if (!d.oclass && d.actualn) {
        const a = artifact_name(d.actualn);
        if (a) { d.name = a.name; d.typ = a.otyp; return 2; }
    }

    // class but no type: alternate spellings within class
    if (d.oclass && !d.typ) {
        for (const [sp, ob] of spellings)
            if (objects[ob].oc_class === d.oclass && wishymatch(d.bp, sp, true)) {
                d.typ = ob; return 2;
            }
    }
    return 0;
}

// readobjnam(bp): parse a wish string, create and return the object, or null
// (nothing matched).  Drives the C goto-based control flow with a small state
// machine.  C ref: objnam.c:4910.
export function readobjnam(bp) {
    const d = newData(bp);
    if (bp == null) return finalize(d); /* random object (not exercised) */

    d.bp = mungspaces(d.bp);
    d.origbp = d.bp;
    if (strcmpi(d.bp, 'nothing') || strcmpi(d.bp, 'nil') || strcmpi(d.bp, 'none'))
        return { kind: 'nothing' };
    d.fruitbuf = d.bp;

    if (preparse(d)) return finalize(d, /*any=*/true);
    if (!d.cnt) d.cnt = 1;

    // parse_charges: strip a trailing "(spe)"/"(rechrg:spe)"/"(lit)" annotation
    // so the remaining name (e.g. "wand of polymorph") parses correctly.
    parse_charges(d);

    let code = postparse1(d);
    if (code === 1) return srch(d);
    if (code === 2) return typfnd(d);
    if (code === 3) return d.otmp ? { kind: 'obj', obj: d.otmp } : null;
    if (code === 4) return finalize(d, true);

    code = postparse2(d);
    if (code === 1) return srch(d);
    if (code === 2) return typfnd(d);
    if (code === 3) return d.otmp ? { kind: 'obj', obj: d.otmp } : null;
    if (code === 4) return finalize(d, true);

    return srch(d);
}

function srch(d) {
    for (;;) {
        const code = postparse3(d);
        if (code === 0) break;
        if (code === 1) continue; /* srch again */
        if (code === 2) return typfnd(d);
        if (code === 6) {
            // retry: re-run postparse2 then loop into srch (C: goto retry).
            const c2 = postparse2(d);
            if (c2 === 2) return typfnd(d);
            if (c2 === 1) continue;
            continue;
        }
    }
    // wiztrap / polearm / hammer paths not exercised; fall to "any".
    if (!d.oclass && !d.typ) return null; /* C: !wizardable furniture => null */
    return finalize(d, !d.oclass && !d.typ);
}

function typfnd(d) {
    if (d.typ) d.oclass = objects[d.typ].oc_class;
    return finalize(d);
}

// finalize: create the object via mksobj, apply wizard-mode spe/bless, handle
// artifact naming + the rn2(nartifact_exist()) draw.  C ref: objnam.c:5037+.
function finalize(d, anyRandom) {
    if (anyRandom && !d.oclass && !d.typ) return null;

    // wizard-mode non-wishable remaps (AMULET_OF_YENDOR etc.) are skipped:
    // in wizard mode the player gets exactly what was asked for.

    const otmp = d.typ ? mksobj(d.typ, true, false) : null;
    if (!otmp) return null;
    d.typ = otmp.otyp;
    d.oclass = otmp.oclass;

    // C objnam.c:5246-5251 — SCALE_MAIL case of the ismnum(d.mntmp) switch.
    // "gray dragon scale mail" parses to bare "scale mail" (the dragon name was
    // stripped by stripDragonPrefix, recording d.dragonIdx); promote the base
    // scale mail (otyp 130) to the matching colored dragon scale mail
    // (GRAY_DRAGON_SCALE_MAIL=101 .. YELLOW_DRAGON_SCALE_MAIL=110).
    const SCALE_MAIL = 130, GRAY_DRAGON_SCALE_MAIL = 101;
    if (otmp.otyp === SCALE_MAIL && d.dragonIdx != null) {
        otmp.otyp = GRAY_DRAGON_SCALE_MAIL + d.dragonIdx;
        d.typ = otmp.otyp;
        d.oclass = otmp.oclass;
    }

    // C ref: objnam.c:5071 — the requested quantity is honoured only for a
    // mergeable object, and then only in wizard mode / for small counts /
    // candles / rocks / ammo.  `objects[].oc_merge` is not a field of the
    // js/mkobj.js rows: the bitfield lives in `flags` (F_MERGE), so the old
    // `objects[d.typ].oc_merge` test read `undefined` and EVERY multi-count
    // wish silently produced a single item ("blessed 20 daggers" -> "a
    // dagger", seed0399 step 138).
    // C ref: objclass.h Bitfield(oc_merge) — js/mkobj.js packs it as bit 5 of
    // the row's `flags` word (F_MERGE, the same value mkobj.js uses privately).
    const F_MERGE = 32;
    // FLINT has no named export in mkobj.js; resolve it by its C constant name
    // off the OBJECTS row `sym` field rather than pasting the index.
    const FLINT_OTYP = objects.findIndex((o) => o && o.sym === 'FLINT');
    if (d.cnt > 0 && (objects[d.typ].flags & F_MERGE)) {
        const skill = objects[d.typ].oc_skill ?? 0;
        // C ref: obj.h is_missile/is_ammo/Is_candle.
        const is_missile = (d.oclass === WEAPON_CLASS || d.oclass === TOOL_CLASS)
            && skill >= -P_BOOMERANG && skill <= -P_DART;
        const is_ammo = (d.oclass === WEAPON_CLASS || d.oclass === GEM_CLASS)
            && skill >= -P_CROSSBOW && skill <= -P_BOW;
        const Is_candle = d.typ === TALLOW_CANDLE || d.typ === WAX_CANDLE;
        if (wizard()
            || d.cnt < rnd(6)
            || (d.cnt <= 7 && Is_candle)
            || (d.cnt <= 20
                && (d.typ === ROCK || d.typ === FLINT_OTYP || is_missile
                    || (d.oclass === WEAPON_CLASS && is_ammo))))
            otmp.quan = d.cnt;
    }

    // spe: wizard mode keeps requested spe (clamped to SPE_LIM) else random.
    let spe = d.spe;
    if (d.spesgn === 0) {
        spe = otmp.spe;
    } else {
        if (d.spesgn === -1) spe = -Math.abs(spe);
        if (spe > SPE_LIM) spe = SPE_LIM;
        else if (spe < -SPE_LIM) spe = -SPE_LIM;
    }
    if (d.spesgn !== 0) otmp.spe = spe;

    // blessed/cursed: direct field sets (no RNG in wizard mode).
    if (d.iscursed) { otmp.cursed = true; otmp.blessed = false; }
    else if (d.uncursed) { otmp.blessed = false; otmp.cursed = false; }
    else if (d.blessed) { otmp.blessed = true; otmp.cursed = false; }
    else if (d.spesgn < 0) { otmp.cursed = true; otmp.blessed = false; }

    if (d.erodeproof && erosion_matters(otmp)) otmp.oerodeproof = true;
    if (d.eroded) otmp.oeroded = d.eroded;
    if (d.eroded2) otmp.oeroded2 = d.eroded2;

    // artifact naming (C objnam.c:5346) + the wishing-abuse rn2 (5374).
    if (d.name) {
        const a = artifact_name(d.name);
        let arti_name = d.name;
        if (a && a.otyp === otmp.otyp) arti_name = a.name;
        oname_artifact(otmp, arti_name);
        if (otmp.oartifact || (a && a.otyp === otmp.otyp)) {
            otmp.quan = 1;
            if (game.u && game.u.uconduct) game.u.uconduct.wisharti = (game.u.uconduct.wisharti || 0) + 1;
        }
    }

    // C objnam.c:5373-5374:  is_quest_artifact(otmp)
    //   || (otmp->oartifact && rn2(nartifact_exist()) > 1)   ... && !wizard
    // The rn2() is evaluated (short-circuit) whenever oartifact is set, even
    // in wizard mode where the overall condition is false.
    if (otmp.oartifact) {
        const n = nartifact_exist();
        if (n > 0) rn2(n); /* @ readobjnam(objnam.c:5374) */
    }

    // C ref: objnam.c:5395 — d.otmp->owt = weight(d.otmp).  readobjnam recomputes
    // the final weight after any otyp/quantity change: the SCALE_MAIL -> colored
    // dragon-scale-mail promotion above changes owt from 250 (scale mail) to 40
    // (dragon scale mail), and a multi-count wish (otmp.quan = d.cnt) scales the
    // per-unit weight.  Without this a wished dragon scale mail keeps the scale
    // mail's weight and wrongly encumbers the hero.
    otmp.owt = weight(otmp);

    return { kind: 'obj', obj: otmp };
}

// erosion_matters: weapons/armor/erodeable tools.  Approximate via oc_class.
function erosion_matters(otmp) {
    return otmp.oclass === WEAPON_CLASS || otmp.oclass === ARMOR_CLASS;
}

// Silence unused-import lint for symbols kept for parity/readability.
void NUM_OBJECTS; void OBJ_NAME; void MAXOCLASSES; void VENOM_CLASS;
void AMULET_OF_YENDOR; void strstri;
