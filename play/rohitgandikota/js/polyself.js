// polyself.js — the hero's polymorphed form.
// C ref: src/polyself.c
//
// poly_gender() arrived because could_seduce() needs it, and mbodypart()
// because every "your <hand>" message goes through it. Polymorph itself is not
// ported: the hero is never polymorphed yet, so both read the ordinary
// starting form and give the ordinary answer.

import { game } from './gstate.js';
import { is_neuter, humanoid, slithy, attacktype } from './mondata.js';
import { mons, PMNAMES, MONSYMS, ATTKS } from './monst_data.js';
import { NO_PART, ARM, FINGER, FINGERTIP, FOOT, HAND, HANDED,
         HEAD, LEG, TOE, HAIR, EYE, NOSE } from './const.js';

/* src/polyself.c:1975 — the per-shape body-part tables, in C's order:
   ARM, EYE, FACE, FINGER, FINGERTIP, FOOT, HAND, HANDED, HEAD, LEG,
   LIGHT_HEADED, NECK, SPINE, TOE, HAIR, BLOOD, LUNG, NOSE, STOMACH. */
const humanoid_parts = [ 'arm', 'eye', 'face', 'finger',
                         'fingertip', 'foot', 'hand', 'handed',
                         'head', 'leg', 'light headed', 'neck',
                         'spine', 'toe', 'hair', 'blood',
                         'lung', 'nose', 'stomach' ];
const jelly_parts = [ 'pseudopod', 'dark spot', 'front',
                      'pseudopod extension', 'pseudopod extremity',
                      'pseudopod root', 'grasp', 'grasped',
                      'cerebral area', 'lower pseudopod', 'viscous',
                      'middle', 'surface', 'pseudopod extremity',
                      'ripples', 'juices', 'surface', 'sensor',
                      'stomach' ];
const animal_parts = [ 'forelimb', 'eye', 'face',
                       'foreclaw', 'claw tip', 'rear claw',
                       'foreclaw', 'clawed', 'head',
                       'rear limb', 'light headed', 'neck',
                       'spine', 'rear claw tip', 'fur',
                       'blood', 'lung', 'nose',
                       'stomach' ];
const bird_parts = [ 'wing', 'eye', 'face', 'wing',
                     'wing tip', 'foot', 'wing', 'winged',
                     'head', 'leg', 'light headed', 'neck',
                     'spine', 'toe', 'feathers', 'blood',
                     'lung', 'bill', 'stomach' ];
const horse_parts = [ 'foreleg', 'eye', 'face',
                      'forehoof', 'hoof tip', 'rear hoof',
                      'forehoof', 'hooved', 'head',
                      'rear leg', 'light headed', 'neck',
                      'backbone', 'rear hoof tip', 'mane',
                      'blood', 'lung', 'nose',
                      'stomach' ];
const sphere_parts = [ 'appendage', 'optic nerve', 'body', 'tentacle',
                       'tentacle tip', 'lower appendage', 'tentacle',
                       'tentacled', 'body', 'lower tentacle',
                       'rotational', 'equator', 'body',
                       'lower tentacle tip', 'cilia', 'life force',
                       'retina', 'olfactory nerve', 'interior' ];
const fungus_parts = [ 'mycelium', 'visual area', 'front',
                       'hypha', 'hypha', 'root',
                       'strand', 'stranded', 'cap area',
                       'rhizome', 'sporulated', 'stalk',
                       'root', 'rhizome tip', 'spores',
                       'juices', 'gill', 'gill',
                       'interior' ];
const vortex_parts = [ 'region', 'eye', 'front',
                       'minor current', 'minor current', 'lower current',
                       'swirl', 'swirled', 'central core',
                       'lower current', 'addled', 'center',
                       'currents', 'edge', 'currents',
                       'life force', 'center', 'leading edge',
                       'interior' ];
const snake_parts = [ 'vestigial limb', 'eye', 'face', 'large scale',
                      'large scale tip', 'rear region', 'scale gap',
                      'scale gapped', 'head', 'rear region',
                      'light headed', 'neck', 'length', 'rear scale',
                      'scales', 'blood', 'lung', 'forked tongue',
                      'stomach' ];
const worm_parts = [ 'anterior segment', 'light sensitive cell',
                     'clitellum', 'setae', 'setae', 'posterior segment',
                     'segment', 'segmented', 'anterior segment',
                     'posterior', 'over stretched', 'clitellum',
                     'length', 'posterior setae', 'setae', 'blood',
                     'skin', 'prostomium', 'stomach' ];
const spider_parts = [ 'pedipalp', 'eye', 'face', 'pedipalp', 'tarsus',
                       'claw', 'pedipalp', 'palped', 'cephalothorax',
                       'leg', 'spun out', 'cephalothorax', 'abdomen',
                       'claw', 'hair', 'hemolymph', 'book lung',
                       'labrum', 'digestive tract' ];
const fish_parts = [ 'fin', 'eye', 'premaxillary', 'pelvic axillary',
                     'pelvic fin', 'anal fin', 'pectoral fin', 'finned',
                     'head', 'peduncle', 'played out', 'gills',
                     'dorsal fin', 'caudal fin', 'scales', 'blood',
                     'gill', 'nostril', 'stomach' ];

/* src/polyself.c:2049 not_claws[] — claw attacks are overloaded in mons[];
   most humanoids with such attacks should still say "hand", not "claw". */
const not_claws = [
    'S_HUMAN', 'S_MUMMY', 'S_ZOMBIE', 'S_ANGEL', 'S_NYMPH', 'S_LEPRECHAUN',
    'S_QUANTMECH', 'S_VAMPIRE', 'S_ORC', 'S_GIANT', /* quest nemeses */
].map((s) => MONSYMS[s]);

const is_pm = (mptr, name) => mptr === mons[PMNAMES[name]];

// src/polyself.c:1972 mbodypart() — the name of `part` on `mon`'s shape.
export function mbodypart(mon, part) {
    const mptr = mon.data;

    if (part <= NO_PART)
        return 'mystery part';      /* impossible("mbodypart: bad part %d") */

    /* some special cases */
    if (mptr.mlet === MONSYMS.S_DOG || mptr.mlet === MONSYMS.S_FELINE
        || mptr.mlet === MONSYMS.S_RODENT || is_pm(mptr, 'PM_OWLBEAR')) {
        switch (part) {
        case HAND:
            return 'paw';
        case HANDED:
            return 'pawed';
        case FOOT:
            return 'rear paw';
        case ARM:
        case LEG:
            return horse_parts[part];   /* "foreleg", "rear leg" */
        default:
            break;                  /* other parts use animal_parts[] below */
        }
    } else if (mptr.mlet === MONSYMS.S_YETI) {
        /* excl. owlbear due to the 'if' above; opposable thumbs, hence
           "hands", "arms", "legs", &c — yeti/sasquatch, monkey/ape */
        return humanoid_parts[part];
    }
    if ((part === HAND || part === HANDED)
        && (humanoid(mptr) && attacktype(mptr, ATTKS.AT_CLAW)
            && !not_claws.includes(mptr.mlet) && !is_pm(mptr, 'PM_STONE_GOLEM')
            && !is_pm(mptr, 'PM_AMOROUS_DEMON')))
        return (part === HAND) ? 'claw' : 'clawed';
    if ((is_pm(mptr, 'PM_MUMAK') || is_pm(mptr, 'PM_MASTODON'))
        && part === NOSE)
        return 'trunk';
    if (is_pm(mptr, 'PM_SHARK') && part === HAIR)
        return 'skin';                  /* sharks don't have scales */
    if ((is_pm(mptr, 'PM_JELLYFISH') || is_pm(mptr, 'PM_KRAKEN'))
        && (part === ARM || part === FINGER || part === HAND || part === FOOT
            || part === TOE))
        return 'tentacle';
    if (is_pm(mptr, 'PM_FLOATING_EYE') && part === EYE)
        return 'cornea';
    if (humanoid(mptr) && (part === ARM || part === FINGER
                           || part === FINGERTIP || part === HAND
                           || part === HANDED))
        return humanoid_parts[part];
    if (mptr.mlet === MONSYMS.S_COCKATRICE)
        return (part === HAIR) ? snake_parts[part] : bird_parts[part];
    if (is_pm(mptr, 'PM_RAVEN'))
        return bird_parts[part];
    if (mptr.mlet === MONSYMS.S_CENTAUR || mptr.mlet === MONSYMS.S_UNICORN
        || is_pm(mptr, 'PM_KI_RIN')
        || (is_pm(mptr, 'PM_ROTHE') && part !== HAIR))
        return horse_parts[part];
    if (mptr.mlet === MONSYMS.S_LIGHT) {
        if (part === HANDED)
            return 'rayed';
        else if (part === ARM || part === FINGER || part === FINGERTIP
                 || part === HAND)
            return 'ray';
        else
            return 'beam';
    }
    if (is_pm(mptr, 'PM_STALKER') && part === HEAD)
        return 'head';
    if (mptr.mlet === MONSYMS.S_EEL && !is_pm(mptr, 'PM_JELLYFISH'))
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
        || mptr.mlet === MONSYMS.S_BLOB || is_pm(mptr, 'PM_JELLYFISH'))
        return jelly_parts[part];
    if (mptr.mlet === MONSYMS.S_VORTEX || mptr.mlet === MONSYMS.S_ELEMENTAL)
        return vortex_parts[part];
    if (mptr.mlet === MONSYMS.S_FUNGUS)
        return fungus_parts[part];
    if (humanoid(mptr))
        return humanoid_parts[part];
    return animal_parts[part];
}

// src/polyself.c:2142 body_part() — mbodypart() for the hero.
export function body_part(part) {
    return mbodypart(game.youmonst, part);
}

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
