// polyself.js — the hero's polymorphed form.
// C ref: src/polyself.c
//
// Only poly_gender() so far. It arrived because could_seduce() needs it, not
// because polymorph is ported: the hero is never polymorphed yet, so this
// reads the ordinary starting form and gives the ordinary answer.

import { game } from './gstate.js';
import { Flying, Levitation } from './youprop.js';
import { mons, MONSYMS, PMNAMES, ATTKS } from './monst_data.js';
import { NO_PART, ARM, EYE, FINGER, FINGERTIP, FOOT, HAND, HANDED,
         HEAD, LEG, TOE, HAIR, NOSE, I_SPECIAL, TT_PIT, LEVITATION, FLYING, STEALTH, FROMOUTSIDE } from './const.js';
import { is_neuter, humanoid, attacktype, slithy } from './mondata.js';

// src/polyself.c:2149 poly_gender() — the polymorphed hero's gender.
// 0 and 1 mean what flags.female means; 2 is none.
//
// Note the !humanoid() term, which gender() does NOT have: a hero polymorphed
// into a non-humanoid reads as genderless even when the underlying form has a
// gender.
export function poly_gender() {
    const data = game.youmonst?.data;
    if (!data)
        return game.flags?.female ? 1 : 0;
    if (is_neuter(data) || !humanoid(data))
        return 2;
    return game.flags?.female ? 1 : 0;
}

// src/polyself.c:1972 mbodypart() — the anatomy word for a monster's body part.
//
// Nineteen entries per table, indexed by the include/hack.h bodypart_types
// enum (ARM=0 .. STOMACH=18). Order matters absolutely: these are indexed by
// the raw enum value, so a single misplaced string silently renames a body part
// in every message that asks for it.
export function mbodypart(mon, part) {
    const humanoid_parts = [ "arm",       "eye",  "face",         "finger",
                             "fingertip", "foot", "hand",         "handed",
                             "head",      "leg",  "light headed", "neck",
                             "spine",     "toe",  "hair",         "blood",
                             "lung",      "nose", "stomach" ],
        jelly_parts = [ "pseudopod", "dark spot", "front",
                        "pseudopod extension", "pseudopod extremity",
                        "pseudopod root", "grasp", "grasped",
                        "cerebral area", "lower pseudopod", "viscous",
                        "middle", "surface", "pseudopod extremity",
                        "ripples", "juices", "surface", "sensor",
                        "stomach" ],
        animal_parts = [ "forelimb",  "eye",           "face",
                         "foreclaw",  "claw tip",      "rear claw",
                         "foreclaw",  "clawed",        "head",
                         "rear limb", "light headed",  "neck",
                         "spine",     "rear claw tip", "fur",
                         "blood",     "lung",          "nose",
                         "stomach" ],
        bird_parts = [ "wing",     "eye",  "face",         "wing",
                       "wing tip", "foot", "wing",         "winged",
                       "head",     "leg",  "light headed", "neck",
                       "spine",    "toe",  "feathers",     "blood",
                       "lung",     "bill", "stomach" ],
        horse_parts = [ "foreleg",  "eye",           "face",
                        "forehoof", "hoof tip",      "rear hoof",
                        "forehoof", "hooved",        "head",
                        "rear leg", "light headed",  "neck",
                        "backbone", "rear hoof tip", "mane",
                        "blood",    "lung",          "nose",
                        "stomach" ],
        sphere_parts = [ "appendage", "optic nerve", "body", "tentacle",
                         "tentacle tip", "lower appendage", "tentacle",
                         "tentacled", "body", "lower tentacle",
                         "rotational", "equator", "body",
                         "lower tentacle tip", "cilia", "life force",
                         "retina", "olfactory nerve", "interior" ],
        fungus_parts = [ "mycelium", "visual area", "front",
                         "hypha",    "hypha",       "root",
                         "strand",   "stranded",    "cap area",
                         "rhizome",  "sporulated",  "stalk",
                         "root",     "rhizome tip", "spores",
                         "juices",   "gill",        "gill",
                         "interior" ],
        vortex_parts = [ "region",        "eye",           "front",
                         "minor current", "minor current", "lower current",
                         "swirl",         "swirled",       "central core",
                         "lower current", "addled",        "center",
                         "currents",      "edge",          "currents",
                         "life force",    "center",        "leading edge",
                         "interior" ],
        snake_parts = [ "vestigial limb", "eye", "face", "large scale",
                        "large scale tip", "rear region", "scale gap",
                        "scale gapped", "head", "rear region",
                        "light headed", "neck", "length", "rear scale",
                        "scales", "blood", "lung", "forked tongue",
                        "stomach" ],
        worm_parts = [ "anterior segment", "light sensitive cell",
                       "clitellum", "setae", "setae", "posterior segment",
                       "segment", "segmented", "anterior segment",
                       "posterior", "over stretched", "clitellum",
                       "length", "posterior setae", "setae", "blood",
                       "skin", "prostomium", "stomach" ],
        spider_parts = [ "pedipalp", "eye", "face", "pedipalp", "tarsus",
                         "claw", "pedipalp", "palped", "cephalothorax",
                         "leg", "spun out", "cephalothorax", "abdomen",
                         "claw", "hair", "hemolymph", "book lung",
                         "labrum", "digestive tract" ],
        fish_parts = [ "fin", "eye", "premaxillary", "pelvic axillary",
                       "pelvic fin", "anal fin", "pectoral fin", "finned",
                       "head", "peduncle", "played out", "gills",
                       "dorsal fin", "caudal fin", "scales", "blood",
                       "gill", "nostril", "stomach" ];
    /* claw attacks are overloaded in mons[]; most humanoids with
       such attacks should still reference hands rather than claws */
    const not_claws = [
        MONSYMS.S_HUMAN,     MONSYMS.S_MUMMY,   MONSYMS.S_ZOMBIE,
        MONSYMS.S_ANGEL,     MONSYMS.S_NYMPH,   MONSYMS.S_LEPRECHAUN,
        MONSYMS.S_QUANTMECH, MONSYMS.S_VAMPIRE, MONSYMS.S_ORC,
        MONSYMS.S_GIANT, /* quest nemeses */
    ];
    const mptr = mon.data;

    if (part <= NO_PART) {
        /* C calls impossible() here, which is not ported; the return value is
           what reaches the screen either way. */
        return "mystery part";
    }

    /* some special cases */
    if (mptr.mlet === MONSYMS.S_DOG || mptr.mlet === MONSYMS.S_FELINE
        || mptr.mlet === MONSYMS.S_RODENT || mptr === mons[PMNAMES.PM_OWLBEAR]) {
        switch (part) {
        case HAND:
            return "paw";
        case HANDED:
            return "pawed";
        case FOOT:
            return "rear paw";
        case ARM:
        case LEG:
            return horse_parts[part]; /* "foreleg", "rear leg" */
        default:
            break; /* for other parts, use animal_parts[] below */
        }
    } else if (mptr.mlet === MONSYMS.S_YETI) { /* excl. owlbear due to 'if' above */
        /* opposable thumbs, hence "hands", "arms", "legs", &c */
        return humanoid_parts[part]; /* yeti/sasquatch, monkey/ape */
    }
    if ((part === HAND || part === HANDED)
        && (humanoid(mptr) && attacktype(mptr, ATTKS.AT_CLAW)
            && !not_claws.includes(mptr.mlet) && mptr !== mons[PMNAMES.PM_STONE_GOLEM]
            && mptr !== mons[PMNAMES.PM_AMOROUS_DEMON]))
        return (part === HAND) ? "claw" : "clawed";
    if ((mptr === mons[PMNAMES.PM_MUMAK] || mptr === mons[PMNAMES.PM_MASTODON])
        && part === NOSE)
        return "trunk";
    if (mptr === mons[PMNAMES.PM_SHARK] && part === HAIR)
        return "skin"; /* sharks don't have scales */
    if ((mptr === mons[PMNAMES.PM_JELLYFISH] || mptr === mons[PMNAMES.PM_KRAKEN])
        && (part === ARM || part === FINGER || part === HAND || part === FOOT
            || part === TOE))
        return "tentacle";
    if (mptr === mons[PMNAMES.PM_FLOATING_EYE] && part === EYE)
        return "cornea";
    if (humanoid(mptr) && (part === ARM || part === FINGER || part === FINGERTIP
                           || part === HAND || part === HANDED))
        return humanoid_parts[part];
    if (mptr.mlet === MONSYMS.S_COCKATRICE)
        return (part === HAIR) ? snake_parts[part] : bird_parts[part];
    if (mptr === mons[PMNAMES.PM_RAVEN])
        return bird_parts[part];
    if (mptr.mlet === MONSYMS.S_CENTAUR || mptr.mlet === MONSYMS.S_UNICORN
        || mptr === mons[PMNAMES.PM_KI_RIN]
        || (mptr === mons[PMNAMES.PM_ROTHE] && part !== HAIR))
        return horse_parts[part];
    if (mptr.mlet === MONSYMS.S_LIGHT) {
        if (part === HANDED)
            return "rayed";
        else if (part === ARM || part === FINGER || part === FINGERTIP
                 || part === HAND)
            return "ray";
        else
            return "beam";
    }
    if (mptr === mons[PMNAMES.PM_STALKER] && part === HEAD)
        return "head";
    if (mptr.mlet === MONSYMS.S_EEL && mptr !== mons[PMNAMES.PM_JELLYFISH])
        return fish_parts[part];
    if (mptr.mlet === MONSYMS.S_WORM)
        return worm_parts[part];
    if (mptr.mlet === MONSYMS.S_SPIDER)
        return spider_parts[part];
    if (slithy(mptr) || (mptr.mlet === MONSYMS.S_DRAGON && part === HAIR))
        return snake_parts[part];
    if (mptr.mlet === MONSYMS.S_EYE)
        return sphere_parts[part];
    if (mptr.mlet === MONSYMS.S_JELLY || mptr.mlet === MONSYMS.S_PUDDING
        || mptr.mlet === MONSYMS.S_BLOB || mptr === mons[PMNAMES.PM_JELLYFISH])
        return jelly_parts[part];
    if (mptr.mlet === MONSYMS.S_VORTEX || mptr.mlet === MONSYMS.S_ELEMENTAL)
        return vortex_parts[part];
    if (mptr.mlet === MONSYMS.S_FUNGUS)
        return fungus_parts[part];
    if (humanoid(mptr))
        return humanoid_parts[part];
    return animal_parts[part];
}

// src/polyself.c:2143 body_part() — mbodypart() for the hero.
export function body_part(part) {
    return mbodypart(game.youmonst, part);
}

/* u.uprops[p], created on demand. The C's H/E/B macros are lvalues -- BFlying
   |= I_SPECIAL assigns into the struct -- so these arms need the raw record,
   not js/youprop.js's boolean readers. */
function uprop(p) {
    const up = (game.u.uprops ||= {});
    return (up[p] ||= { intrinsic: 0, extrinsic: 0, blocked: 0 });
}

// src/polyself.c:158 steed_vs_stealth() — riding blocks stealth unless
// hero+steed fly.
export function steed_vs_stealth() {
    if (game.u.usteed && !Flying() && !Levitation())
        uprop(STEALTH).blocked |= FROMOUTSIDE;
    else
        uprop(STEALTH).blocked &= ~FROMOUTSIDE;
}

// src/polyself.c:131 float_vs_flight() — Levitation overrides Flying; set or
// clear BFlying|I_SPECIAL.
export function float_vs_flight() {
    const stuck_in_floor = (game.u.utrap && game.u.utraptype !== TT_PIT);

    /* floating overrides flight; so does being trapped in the floor */
    if ((uprop(LEVITATION).intrinsic || uprop(LEVITATION).extrinsic)
        || ((uprop(FLYING).intrinsic || uprop(FLYING).extrinsic) && stuck_in_floor))
        uprop(FLYING).blocked |= I_SPECIAL;
    else
        uprop(FLYING).blocked &= ~I_SPECIAL;
    /* being trapped on the ground (bear trap, web, molten lava survived
       with fire resistance, former lava solidified via cold, tethered
       to a buried iron ball) overrides floating--the floor is reachable */
    if ((uprop(LEVITATION).intrinsic || uprop(LEVITATION).extrinsic) && stuck_in_floor)
        uprop(LEVITATION).blocked |= I_SPECIAL;
    else
        uprop(LEVITATION).blocked &= ~I_SPECIAL;

    /* riding blocks stealth unless hero+steed fly, so a change in flying
       might cause a change in stealth */
    steed_vs_stealth();

    game.botl = true;
}
