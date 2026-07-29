// o_init.js — Object initialization.
// C ref: o_init.c — init_objects(), randomize_gem_colors(), shuffle(),
// shuffle_all().  Assigns per-appearance object descriptions, colors,
// toughness and material via the real Fisher-Yates-style shuffle.
//
// This is a faithful port of the RNG call sequence emitted by the C
// init_objects() path that runs during new-game startup, immediately before
// dungeon init.  The exact left-to-right rn2()/rnd() order must match C so
// that everything downstream stays in sync.  Verified against the previously
// hardcoded fastforward_pre_mklev() replay for seed8000 (and every other
// public session whose first divergence is downstream of o_init).
//
// The shuffle results (oc_descr_idx / oc_color / oc_tough / oc_material) are
// written back onto the shared objects[] array so a renderer can later read
// the per-appearance description / color.  Rendering itself lives in
// display.js / invent.js and is out of scope for this file.

import { rn2 } from './rng.js';
import {
    objects, MAXOCLASSES, WEAPON_CLASS, ARMOR_CLASS, COIN_CLASS, GEM_CLASS,
    AMULET_CLASS, POTION_CLASS, RING_CLASS, SCROLL_CLASS,
    SPBOOK_CLASS, WAND_CLASS, VENOM_CLASS,
} from './mkobj.js';
import { DESCR_BY_OTYP } from './o_descr_data.js';
import { game } from './gstate.js';
import { exercise } from './attrib.js';
import { A_WIS } from './const.js';

// ── Color constants (C ref: include/color.h) ──
const CLR_BLACK = 0, CLR_RED = 1, CLR_GREEN = 2, CLR_BROWN = 3, CLR_BLUE = 4;
const CLR_MAGENTA = 5, CLR_CYAN = 6, CLR_GRAY = 7;
const CLR_ORANGE = 9, CLR_BRIGHT_GREEN = 10, CLR_YELLOW = 11;
const CLR_BRIGHT_BLUE = 12, CLR_BRIGHT_MAGENTA = 13, CLR_BRIGHT_CYAN = 14;
const CLR_WHITE = 15;
// HI_* aliases (color.h)
const HI_METAL = CLR_CYAN, HI_COPPER = CLR_YELLOW, HI_SILVER = CLR_GRAY;
const HI_GOLD = CLR_YELLOW, HI_LEATHER = CLR_BROWN, HI_CLOTH = CLR_BROWN;
const HI_ORGANIC = CLR_BROWN, HI_WOOD = CLR_BROWN, HI_PAPER = CLR_WHITE;
const HI_GLASS = CLR_BRIGHT_CYAN, HI_MINERAL = CLR_GRAY;

// ── object type indices used by obj_shuffle_range (C ref: onames.h) ──
const POT_WATER = 322;
const HELMET = 97, HELM_OF_TELEPATHY = 100;
const LEATHER_GLOVES = 159, GAUNTLETS_OF_DEXTERITY = 162;
const CLOAK_OF_PROTECTION = 146, CLOAK_OF_DISPLACEMENT = 149;
const SPEED_BOOTS = 166, LEVITATION_BOOTS = 172;
const WAN_NOTHING = 415;
// objclass.h: NODIR=1, IMMEDIATE=2, RAY=3.  These were 0/1, which wrote oc_dir
// values that zap.js (which uses the correct 1/2) then misread.
const NODIR = 1, IMMEDIATE = 2;

// Keep the immutable object-table colors so init_objects() can restore them
// before each new game.  The shared objects[] entries are mutated by shuffling.
const DECLARED_COLOR = objects.map((o) => o?.oc_color ?? CLR_GRAY);
const DECLARED_TOUGH = objects.map((o) => o?.oc_tough ?? 0);

// Per-object appearance data (oc_color / oc_tough / oc_material) for the
// objects that participate in shuffling.  Only the shuffle ranges need this:
// objects outside a range keep their declared values and are never swapped.
// C ref: include/objects.h (POTION/SCROLL/SPELL/WAND/RING/AMULET/HELM/CLOAK/
// GLOVES/BOOTS macro expansions).
//
// Keyed by otyp.  color = oc_color, tough = oc_tough (HARDGEM for rings),
// material = oc_material.  oc_descr_idx starts equal to the otyp.

// Potions 297..321 (POT_GAIN_ABILITY..POT_OIL), all GLASS, tough 0.
const POTION_COLOR = [
    CLR_RED, CLR_BRIGHT_MAGENTA, CLR_ORANGE, CLR_YELLOW, CLR_BRIGHT_GREEN,
    CLR_GREEN, CLR_CYAN, CLR_CYAN, CLR_BRIGHT_BLUE, CLR_MAGENTA,
    CLR_MAGENTA, CLR_RED, CLR_WHITE, CLR_BROWN, CLR_WHITE,
    CLR_GRAY, CLR_WHITE, CLR_GRAY, CLR_BLACK, CLR_YELLOW,
    CLR_BROWN, CLR_CYAN, CLR_BLACK, CLR_WHITE, CLR_BROWN,
];
// Rings 173..200, color + Mohs hardness (HARDGEM = mohs >= 8 -> oc_tough).
const RING_DATA = [
    [HI_WOOD, 2], [HI_MINERAL, 7], [HI_MINERAL, 7], [CLR_RED, 4],
    [CLR_ORANGE, 4], [CLR_BLACK, 7], [HI_MINERAL, 6], [CLR_BROWN, 6],
    [CLR_GREEN, 6], [HI_COPPER, 4], [CLR_RED, 7], [CLR_CYAN, 8],
    [CLR_BLUE, 9], [CLR_RED, 9], [CLR_WHITE, 10], [CLR_WHITE, 4],
    [HI_METAL, 5], [HI_COPPER, 4], [HI_COPPER, 3], [HI_METAL, 6],
    [HI_METAL, 8], [HI_SILVER, 3], [HI_GOLD, 3], [CLR_WHITE, 4],
    [CLR_BRIGHT_GREEN, 8], [HI_METAL, 5], [HI_METAL, 5], [CLR_BRIGHT_CYAN, 5],
];
// Scrolls 323..363 (real + extra labels), all PAPER -> HI_PAPER, tough 0.
// Spellbooks 365..405, colors below; all LEATHER/PAPER, tough 0.
const SPBOOK_COLOR = [
    HI_LEATHER, HI_LEATHER, HI_PAPER, HI_PAPER, HI_PAPER, HI_PAPER, HI_CLOTH,
    HI_LEATHER, CLR_WHITE, CLR_BRIGHT_MAGENTA, CLR_RED, CLR_ORANGE, CLR_YELLOW,
    CLR_MAGENTA, CLR_BRIGHT_GREEN, CLR_GREEN, CLR_BRIGHT_CYAN, CLR_CYAN,
    CLR_BRIGHT_BLUE, CLR_BLUE, CLR_BLUE, CLR_MAGENTA, CLR_MAGENTA, CLR_MAGENTA,
    CLR_BROWN, CLR_GREEN, CLR_BROWN, CLR_BROWN, CLR_GRAY, HI_PAPER, HI_PAPER,
    HI_COPPER, HI_COPPER, HI_SILVER, HI_GOLD, CLR_WHITE, CLR_WHITE, HI_PAPER,
    HI_PAPER, HI_PAPER, CLR_GRAY,
];
// Wands 409..436 (full class), colors below; tough 0.
const WAND_COLOR = [
    HI_GLASS, HI_WOOD, HI_GLASS, HI_WOOD, HI_WOOD, CLR_RED, HI_WOOD, HI_WOOD,
    HI_MINERAL, HI_METAL, HI_COPPER, HI_COPPER, HI_SILVER, CLR_WHITE,
    CLR_BRIGHT_CYAN, HI_METAL, HI_METAL, HI_METAL, HI_METAL, HI_METAL,
    HI_METAL, HI_METAL, HI_METAL, HI_METAL, HI_METAL, HI_WOOD, HI_METAL,
    HI_MINERAL,
];
// Helmet sub-range 97..100: helmet, helm of caution, helm of opposite
// alignment, helm of telepathy (all IRON).
const HELMET_COLOR = [HI_METAL, CLR_GREEN, HI_METAL, HI_METAL];
// Gloves sub-range 159..162: leather gloves, gauntlets of fumbling/power/
// dexterity (CLR_BROWN throughout per objects.h note).
const GLOVES_COLOR = [HI_LEATHER, HI_LEATHER, CLR_BROWN, HI_LEATHER];
// Cloak sub-range 146..149: cloak of protection/invisibility/magic
// resistance/displacement (all CLOTH).
const CLOAK_COLOR = [HI_CLOTH, CLR_BRIGHT_MAGENTA, CLR_WHITE, HI_CLOTH];
// Boots sub-range 166..172: speed/water walking/jumping/elven/kicking/fumble/
// levitation boots.
const BOOTS_COLOR = [
    HI_LEATHER, HI_LEATHER, HI_LEATHER, HI_LEATHER, CLR_BROWN, HI_LEATHER,
    HI_LEATHER,
];
// Venom 478..479: blinding / acid venom, HI_ORGANIC.
const VENOM_COLOR = [HI_ORGANIC, HI_ORGANIC];

// Build per-object initial appearance attributes onto objects[].
// C ref: init_objects() pre-shuffle state (oc_descr_idx = oc_name_idx = i;
// oc_color / oc_tough / oc_material come from the OBJECT() macro init).
function seedAppearance() {
    for (let i = 0; i < objects.length; i++) {
        const o = objects[i];
        if (!o) continue;
        o.oc_descr_idx = o.oc_name_idx = i;
        o.oc_color = DECLARED_COLOR[i];
        o.oc_tough = DECLARED_TOUGH[i];
        o.oc_material = o.material ?? 0;
        // C's object table pre-marks types without alternate descriptions and
        // leaves description-bearing types unidentified.
        o.oc_name_known = DESCR_BY_OTYP[i] == null ? 1 : 0;
        o.oc_encountered = 0;
        o.oc_uname = null;
    }
    // Apply the per-appearance color/tough overrides for shuffle ranges.
    const apply = (base, table) => {
        for (let k = 0; k < table.length; k++) {
            const o = objects[base + k];
            if (!o) continue;
            const cell = table[k];
            if (Array.isArray(cell)) {
                o.oc_color = cell[0];
                o.oc_tough = cell[1] >= 8 ? 1 : 0;
            } else {
                o.oc_color = cell;
            }
        }
    };
    apply(297, POTION_COLOR);
    apply(173, RING_DATA);
    for (let i = 323; i <= 363; i++)
        if (objects[i]) objects[i].oc_color = HI_PAPER;
    apply(365, SPBOOK_COLOR);
    apply(409, WAND_COLOR);
    apply(HELMET, HELMET_COLOR);
    apply(LEATHER_GLOVES, GLOVES_COLOR);
    apply(CLOAK_OF_PROTECTION, CLOAK_COLOR);
    apply(SPEED_BOOTS, BOOTS_COLOR);
    apply(478, VENOM_COLOR);

    // oc_magic / oc_unique flags needed by obj_shuffle_range() to find the
    // hi boundary for AMULET / SCROLL / SPBOOK classes.  The loop walks from
    // bases[class] and stops at the first object that is unique or non-magic.
    // C ref: include/objects.h BITS() mgc / uniq fields.
    //
    //  Amulets 201..211 are magic; FAKE_AMULET_OF_YENDOR (212) is non-magic
    //  (deliberately placed before the real, unique Amulet at 213 so the
    //  shuffle stops there) -> amulet shuffle range = 201..211 (11).
    //  Scrolls 323..363 (real + extra labels) are magic; blank paper (364)
    //  is non-magic -> scroll shuffle range = 323..363 (41).
    //  Spellbooks 365..405 are magic; blank paper (406) is non-magic ->
    //  spellbook shuffle range = 365..405 (41).  novel (407) is non-magic
    //  and Book of the Dead (408) is unique+magic, both after the boundary.
    const setMagic = (loInclusive, hiInclusive) => {
        for (let i = loInclusive; i <= hiInclusive; i++)
            if (objects[i]) objects[i].oc_magic = 1;
    };
    setMagic(201, 211);   // magic amulets (FAKE_YENDOR 212 stays non-magic)
    if (objects[213]) objects[213].oc_unique = 1; // Amulet of Yendor
    setMagic(323, 363);   // magic scrolls + extra labels
    setMagic(365, 405);   // magic spellbooks
    if (objects[408]) { objects[408].oc_magic = 1; objects[408].oc_unique = 1; } // Book of the Dead
}

// Class bases: bases[oclass] = otyp of first object of that class.
// C ref: init_objects() bases[] computation.
function computeBases() {
    const bases = new Array(MAXOCLASSES + 2).fill(0);
    let first = MAXOCLASSES;
    while (first < objects.length) {
        const oclass = objects[first]?.oclass;
        let last = first + 1;
        while (last < objects.length && objects[last]?.oclass === oclass) last++;
        if (oclass != null) bases[oclass] = first;
        first = last;
    }
    bases[MAXOCLASSES] = bases[MAXOCLASSES + 1] = objects.length;
    for (let last = MAXOCLASSES - 1; last >= 0; --last)
        if (!bases[last]) bases[last] = bases[last + 1];
    return bases;
}

// some gems can have different colors.  C ref: o_init.c randomize_gem_colors().
// Emits rn2(2), rn2(2), rn2(4) in that order and copies both description and
// color from the selected source gem.
function randomize_gem_colors() {
    const TURQUOISE = 445, AQUAMARINE = 447, FLUORITE = 456;
    const SAPPHIRE = 442, DIAMOND = 439, EMERALD = 444;
    const copyDescr = (dst, src) => {
        objects[dst].oc_descr_idx = objects[src].oc_descr_idx;
        objects[dst].oc_color = objects[src].oc_color;
    };
    if (rn2(2)) copyDescr(TURQUOISE, SAPPHIRE);
    if (rn2(2)) copyDescr(AQUAMARINE, SAPPHIRE);
    switch (rn2(4)) {
    case 1: copyDescr(FLUORITE, SAPPHIRE); break;
    case 2: copyDescr(FLUORITE, DIAMOND); break;
    case 3: copyDescr(FLUORITE, EMERALD); break;
    default: break;
    }
}

// shuffle descriptions on objects o_low..o_high.  C ref: o_init.c shuffle().
function shuffle(bases, o_low, o_high, domaterial) {
    let num_to_shuffle = 0;
    for (let j = o_low; j <= o_high; j++)
        if (!objects[j].oc_name_known) num_to_shuffle++;
    if (num_to_shuffle < 2) return;

    for (let j = o_low; j <= o_high; j++) {
        if (objects[j].oc_name_known) continue;
        let i;
        do {
            i = j + rn2(o_high - j + 1);
        } while (objects[i].oc_name_known);
        let sw = objects[j].oc_descr_idx;
        objects[j].oc_descr_idx = objects[i].oc_descr_idx;
        objects[i].oc_descr_idx = sw;
        sw = objects[j].oc_tough;
        objects[j].oc_tough = objects[i].oc_tough;
        objects[i].oc_tough = sw;
        const color = objects[j].oc_color;
        objects[j].oc_color = objects[i].oc_color;
        objects[i].oc_color = color;
        if (domaterial) {
            sw = objects[j].oc_material;
            objects[j].oc_material = objects[i].oc_material;
            objects[i].oc_material = sw;
        }
    }
}

// retrieve the range of objects that otyp shares descriptions with.
// C ref: o_init.c obj_shuffle_range().
function obj_shuffle_range(bases, otyp) {
    const ocls = objects[otyp].oclass;
    let lo = otyp, hi = otyp;

    switch (ocls) {
    case ARMOR_CLASS:
        if (otyp >= HELMET && otyp <= HELM_OF_TELEPATHY) { lo = HELMET; hi = HELM_OF_TELEPATHY; }
        else if (otyp >= LEATHER_GLOVES && otyp <= GAUNTLETS_OF_DEXTERITY) { lo = LEATHER_GLOVES; hi = GAUNTLETS_OF_DEXTERITY; }
        else if (otyp >= CLOAK_OF_PROTECTION && otyp <= CLOAK_OF_DISPLACEMENT) { lo = CLOAK_OF_PROTECTION; hi = CLOAK_OF_DISPLACEMENT; }
        else if (otyp >= SPEED_BOOTS && otyp <= LEVITATION_BOOTS) { lo = SPEED_BOOTS; hi = LEVITATION_BOOTS; }
        break;
    case POTION_CLASS:
        /* potion of water has the only fixed description */
        lo = bases[POTION_CLASS];
        hi = POT_WATER - 1;
        break;
    case AMULET_CLASS:
    case SCROLL_CLASS:
    case SPBOOK_CLASS: {
        /* exclude non-magic types and also unique ones */
        lo = bases[ocls];
        let i = lo;
        for (; objects[i] && objects[i].oclass === ocls; i++)
            if (objects[i].oc_unique || !objects[i].oc_magic) break;
        hi = i - 1;
        break;
    }
    case RING_CLASS:
    case WAND_CLASS:
    case VENOM_CLASS:
        /* entire class */
        lo = bases[ocls];
        hi = bases[ocls + 1] - 1;
        break;
    }
    if (otyp < lo || otyp > hi) { lo = hi = otyp; }
    return [lo, hi];
}

// randomize object descriptions.  C ref: o_init.c shuffle_all().
function shuffle_all(bases) {
    const shuffle_classes = [
        AMULET_CLASS, POTION_CLASS, RING_CLASS, SCROLL_CLASS,
        SPBOOK_CLASS, WAND_CLASS, VENOM_CLASS,
    ];
    const shuffle_types = [
        HELMET, LEATHER_GLOVES, CLOAK_OF_PROTECTION, SPEED_BOOTS,
    ];
    for (let idx = 0; idx < shuffle_classes.length; idx++) {
        const [first, last] = obj_shuffle_range(bases, bases[shuffle_classes[idx]]);
        shuffle(bases, first, last, true);
    }
    for (let idx = 0; idx < shuffle_types.length; idx++) {
        const [first, last] = obj_shuffle_range(bases, shuffle_types[idx]);
        shuffle(bases, first, last, false);
    }
}

// init_objects().  C ref: o_init.c init_objects().
//
// RNG order (left-to-right):
//   - during the class loop, when GEM_CLASS is reached:
//       setgemprobs(0)  [no RNG]
//       randomize_gem_colors()  -> rn2(2); rn2(2); rn2(4)
//   - after the loop: shuffle_all()  -> the 11 shuffle() runs
//   - finally: objects[WAN_NOTHING].oc_dir = rn2(2) ? NODIR : IMMEDIATE
export function init_objects() {
    seedAppearance();
    const bases = computeBases();
    discoBases = bases;
    discoveryOrder.clear();

    // The class loop: only the GEM_CLASS branch consumes RNG (via
    // randomize_gem_colors), and it runs exactly once at the gem class.
    // setgemprobs() consumes no RNG.  C ref: init_objects() while-loop.
    randomize_gem_colors();

    // shuffle descriptions
    shuffle_all(bases);

    // WAN_NOTHING direction roll.  C ref: init_objects() last line.
    if (objects[WAN_NOTHING])
        objects[WAN_NOTHING].oc_dir = rn2(2) ? NODIR : IMMEDIATE;
    else
        rn2(2);
}

// ─────────────────────────────────────────────────────────────────────────
// Object-discovery state and the '\' (discoveries) list.
//
// C ref: o_init.c discover_object()/interesting_to_discover()/dodiscovered()
// and src/objnam.c obj_typename()/disco_typename().  The discovery state lives
// on objects[i].oc_name_known (type identified) and objects[i].oc_encountered
// (appearance seen).  None of this consumes RNG.
// ─────────────────────────────────────────────────────────────────────────

let discoBases = null;
const discoveryOrder = new Map();
function getBases() {
    if (!discoBases) discoBases = computeBases();
    return discoBases;
}

const FIRST_OBJECT = MAXOCLASSES; // generic objects sit below this index

// OBJ_DESCR(obj): the unidentified appearance string for this object's current
// appearance.  C: obj_descr[objects[i].oc_descr_idx].oc_descr.  After shuffling
// oc_descr_idx points at the appearance now bound to this slot.
function OBJ_DESCR(otyp) {
    const o = objects[otyp];
    if (!o) return null;
    const idx = o.oc_descr_idx != null ? o.oc_descr_idx : otyp;
    const d = DESCR_BY_OTYP[idx];
    return d != null ? d : null;
}

// C ref: objnam.c Japanese_items[] — keyed by the canonical otyp.
const JAPANESE_ITEMS = new Map([
    [46, 'wakizashi'],    // SHORT_SWORD
    [52, 'ninja-to'],     // BROADSWORD
    [81, 'nunchaku'],     // FLAIL
    [62, 'naginata'],     // GLAIVE
    [222, 'osaku'],       // LOCK_PICK
    [253, 'koto'],        // WOODEN_HARP
    [254, 'magic koto'],  // MAGIC_HARP
    [40, 'shito'],        // KNIFE
    [121, 'tanko'],       // PLATE_MAIL
    [97, 'kabuto'],       // HELMET
    [159, 'yugake'],      // LEATHER_GLOVES
    [293, 'gunyoki'],     // FOOD_RATION
    [317, 'sake'],        // POT_BOOZE
]);
function disco_is_samurai() {
    return game.u?.umonnum === 9 || game.urole?.mnum === 9
        || (game.urole?.name?.m === 'Samurai');
}
function disco_japanese_name(otyp) {
    return (disco_is_samurai() && JAPANESE_ITEMS.has(otyp))
        ? JAPANESE_ITEMS.get(otyp) : null;
}

// C ref: o_init.c discover_object(oindx, mark_as_known, mark_as_encountered,
// credit_hero).  When a type first becomes name-known and credit_hero is set
// (the makeknown() macro passes TRUE), the hero is credited with a Wisdom
// exercise — exercise(A_WIS, TRUE) rolls rn2(19).  knows_object/observe_object
// (initial inventory, autodiscovery) pass credit_hero FALSE, so they roll no
// RNG, matching C.
export function discover_object(oindx, markKnown, markEncountered, creditHero) {
    if (oindx < FIRST_OBJECT) return;
    const o = objects[oindx];
    if (!o) return;
    if ((!o.oc_name_known && markKnown)
        || (!o.oc_encountered && markEncountered)
        || disco_japanese_name(oindx)) {
        const order = discoveryOrder.get(o.oclass) || [];
        if (!order.includes(oindx)) {
            order.push(oindx);
            discoveryOrder.set(o.oclass, order);
        }
        if (markEncountered) o.oc_encountered = 1;
        if (!o.oc_name_known && markKnown) {
            o.oc_name_known = 1;
            if (creditHero) exercise(A_WIS, true);
        }
    }
}

// C ref: o_init.c observe_object() — mark the type as encountered (seen).
export function observe_object(obj) {
    if (!obj) return;
    const oindx = obj.otyp;
    if (oindx >= FIRST_OBJECT) discover_object(oindx, false, true);
}

// C ref: u_init.c knows_object() — mark a type known (not encountered).
export function knows_object(otyp) {
    discover_object(otyp, true, false);
}

// C ref: u_init.c knows_class() — pre-discover every ordinary (non-magic)
// object of a class.  Consumes no RNG.
export function knows_class(oclass) {
    const bases = getBases();
    const samurai = disco_is_samurai();
    const roleMnum = game.urole?.mnum ?? game.u?.umonnum;
    const isKnight = roleMnum === 4;
    const isRanger = roleMnum === 7;
    const isRogue = roleMnum === 8;
    // is_pole(): polearm weapons (PARTISAN..DWARVISH_MATTOCK on the JS table).
    const isPole = (ct) => ct >= 59 && ct <= 71;
    // C ref: include/obj.h is_launcher/is_ammo (skill in [P_BOW,P_CROSSBOW] /
    // [-P_CROSSBOW,-P_BOW]) and is_spear (skill == P_SPEAR == 17).
    const sk = (ct) => objects[ct]?.oc_skill ?? 0;
    const isLauncher = (ct) => objects[ct]?.oc_class === WEAPON_CLASS && sk(ct) >= 20 && sk(ct) <= 22;
    const isAmmo = (ct) => objects[ct]?.oc_class === WEAPON_CLASS && sk(ct) >= -22 && sk(ct) <= -20;
    const isSpear = (ct) => objects[ct]?.oc_class === WEAPON_CLASS && sk(ct) === 17;
    const CORNUTHAUM = 100, DUNCE_CAP = 101, SMALL_SHIELD = 110;
    const P_DAGGER = 1;
    for (let ct = bases[oclass]; ct < bases[oclass + 1]; ct++) {
        const o = objects[ct];
        if (!o) continue;
        if (ct === CORNUTHAUM || ct === DUNCE_CAP || ct === SMALL_SHIELD) continue;
        if (oclass === WEAPON_CLASS) {
            // arbitrary: only knights and samurai recognize polearms
            if (!isKnight && !samurai && isPole(ct)) continue;
            // rangers know all launchers, ammo, and spears regardless of race,
            // but not other weapons.
            if (isRanger && !isLauncher(ct) && !isAmmo(ct) && !isSpear(ct)) continue;
            // rogues know daggers, regardless of racial variations.
            if (isRogue && sk(ct) !== P_DAGGER) continue;
        }
        if (o.oc_class === oclass && !o.oc_magic)
            knows_object(ct);
    }
}

// C ref: o_init.c interesting_to_discover().
function interesting_to_discover(i) {
    if (disco_japanese_name(i)) return true;
    const o = objects[i];
    if (!o) return false;
    return !!(o.oc_uname != null
              || ((o.oc_name_known || o.oc_encountered) && OBJ_DESCR(i) != null));
}

// C ref: objnam.c obj_typename().
function disco_obj_typename(otyp) {
    const o = objects[otyp];
    let actualn = disco_japanese_name(otyp) || o.name;
    let dn = OBJ_DESCR(otyp);
    if (disco_is_samurai() && (otyp === 253 || otyp === 254)) dn = 'koto';
    const nn = o.oc_name_known;
    const un = o.oc_uname != null ? o.oc_uname : null;
    let buf = '';

    switch (o.oclass) {
    case COIN_CLASS:
        return actualn;
    case POTION_CLASS:
        buf = 'potion';
        break;
    case SCROLL_CLASS:
        buf = 'scroll';
        break;
    case WAND_CLASS:
        buf = 'wand';
        break;
    case SPBOOK_CLASS:
        if (otyp === 407) {
            buf = nn ? 'novel' : 'book';
            if (un) buf += ` called ${un}`;
            if (dn) buf += ` (${dn})`;
            return buf;
        }
        buf = 'spellbook';
        break;
    case RING_CLASS:
        buf = 'ring';
        break;
    case AMULET_CLASS:
        buf = nn ? actualn : 'amulet';
        if (un) buf += ` called ${un}`;
        if (dn) buf += ` (${dn})`;
        return buf;
    case ARMOR_CLASS:
        if ((otyp >= LEATHER_GLOVES && otyp <= GAUNTLETS_OF_DEXTERITY)
            || (otyp >= 163 && otyp <= LEVITATION_BOOTS))
            buf = 'pair of ';
        else if (otyp >= 111 && otyp <= 120)
            buf = 'set of ';
        // fall through to the ordinary known/unknown formatting
        break;
    default:
        break;
    }

    if ([POTION_CLASS, SCROLL_CLASS, WAND_CLASS, SPBOOK_CLASS, RING_CLASS]
        .includes(o.oclass)) {
        if (nn) buf = o.oc_unique ? actualn : `${buf} of ${actualn}`;
        if (un) buf += ` called ${un}`;
        if (dn) buf += ` (${dn})`;
        return buf;
    }

    buf += nn ? actualn : (dn || actualn);
    if (nn && un) buf += ` called ${un}`;
    if (nn && dn) buf += ` (${dn})`;
    if (!nn && o.oclass === GEM_CLASS)
        buf += o.oc_material === 21 ? ' stone' : ' gem';
    if (!nn && un) buf += ` called ${un}`;
    return buf;
}

// C ref: o_init.c disco_typename() — augment with the Japanese [actual name].
function disco_typename(otyp) {
    let result = disco_obj_typename(otyp);
    if (disco_is_samurai() && disco_japanese_name(otyp)) {
        const actualn = (otyp !== 254 && otyp !== 253) || objects[otyp].oc_name_known
            ? objects[otyp].name : 'harp';
        if (result.includes(' called'))
            result = result.replace(' called', ` [${actualn}] called`);
        else if (result.includes(' ('))
            result = result.replace(' (', ` [${actualn}] (`);
        else
            result = `${result} [${actualn}]`;
    }
    return result;
}

// Default inv_order (options.c def_inv_order); VENOM_CLASS is appended so any
// pre-discovered venom shows.  C ref: o_init.c dodiscovered() class loop.
const DISCO_INV_ORDER = [
    COIN_CLASS, AMULET_CLASS, WEAPON_CLASS, ARMOR_CLASS, 7 /*FOOD*/,
    SCROLL_CLASS, SPBOOK_CLASS, POTION_CLASS, RING_CLASS, WAND_CLASS,
    6 /*TOOL*/, GEM_CLASS, 14 /*ROCK*/, 15 /*BALL*/, 16 /*CHAIN*/, VENOM_CLASS,
];

// Build the discoveries text rows (default 'o' sort: by order of discovery
// within each class — which for a fresh game equals object order).  Returns
// null when nothing is discovered (caller prints the "haven't discovered…"
// message).  C ref: o_init.c dodiscovered().
export function build_discoveries_rows() {
    getBases();
    const rows = [];
    let ct = 0;
    for (const oclass of DISCO_INV_ORDER) {
        let printedHeader = false;
        for (const i of discoveryOrder.get(oclass) || []) {
            if (!interesting_to_discover(i)) continue;
            ct++;
            if (!printedHeader) {
                rows.push({ text: className(oclass), header: true });
                printedHeader = true;
            }
            const prefix = objects[i].oc_encountered ? '  ' : '* ';
            rows.push({ text: prefix + disco_typename(i) });
        }
    }
    return ct ? rows : null;
}

const DISCO_CLASS_NAMES = [
    null, 'Illegal objects', 'Weapons', 'Armor', 'Rings', 'Amulets', 'Tools',
    'Comestibles', 'Potions', 'Scrolls', 'Spellbooks', 'Wands', 'Coins',
    'Gems/Stones', 'Boulders/Statues', 'Iron balls', 'Chains', 'Venoms',
];
function className(oclass) {
    return DISCO_CLASS_NAMES[oclass] || DISCO_CLASS_NAMES[1];
}
