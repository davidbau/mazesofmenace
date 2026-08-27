// polyself.js: the hero's polymorphed form.
// C ref: src/polyself.c
//
// poly_gender() arrived because could_seduce() needs it, and mbodypart()
// because every "your <hand>" message goes through it. Controlled wizard
// polymorph and return to the hero's race are also implemented here.

import { game } from './gstate.js';
import { is_neuter, humanoid, slithy, attacktype, name_to_monplus,
         strongmonst, sliparm, nohands, verysmall, is_whirly } from './mondata.js';
import { mons, PMNAMES, MONSYMS, ATTKS, MFLAGS } from './monst_data.js';
import { NO_PART, ARM, FINGER, FINGERTIP, FOOT, HAND, HANDED,
         HEAD, LEG, TOE, HAIR, EYE, NOSE, A_STR, A_WIS, A_CON,
         ECMD_OK, ECMD_TIME, KILLED_BY_AN, Upolyd, FROMFORM } from './const.js';
import { rn2, rn1, d, rnd } from './rng.js';
import { OCLASSES } from './objects_data.js';

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

const clone_attr = (attr) => attr ? { ...attr, a: [...attr.a] } : attr;
const indefinite = (name) => `${/^[aeiou]/i.test(name) ? 'an' : 'a'} ${name}`;
const placeholder_forms = new Set([
    PMNAMES.PM_ORC, PMNAMES.PM_GIANT, PMNAMES.PM_ELF, PMNAMES.PM_HUMAN,
]);

const polyok = (mdat) => !!mdat && !(mdat.mflags2 & MFLAGS.M2_NOPOLY);
const your_race = (mdat) =>
    !!mdat && !!(mdat.mflags2 & (game.urace?.selfmask || 0));

// src/polyself.c:35 set_uasmon(), the form-derived stunned property.
// Bats and stalkers are intrinsically stunned while the form lasts.
function set_form_stun(mdat, mntmp) {
    const intr = (game.u.intrinsic ||= {});
    intr.HStun = (intr.HStun || 0) & ~FROMFORM;
    if (mntmp === PMNAMES.PM_STALKER || mdat?.mlet === MONSYMS.S_BAT)
        intr.HStun |= FROMFORM;
}

// src/polyself.c:332 newman() and :200 polyman(), the controlled return to
// the hero's race. This rebuilds level, attributes, HP and energy before
// restoring the saved human state.
async function newman() {
    const u = game.u;
    const oldlvl = u.ulevel;
    let newlvl = oldlvl + rn1(5, -2);
    const MAXULEV = 30;

    if (newlvl < 1 || newlvl > 127) {
        (game.unported ||= new Set()).add('newman:unsuccessful_polymorph');
        return 0;
    }
    newlvl = Math.min(newlvl, MAXULEV);
    if (newlvl < oldlvl)
        u.ulevelmax -= oldlvl - newlvl;
    if (u.ulevelmax < newlvl)
        u.ulevelmax = newlvl;
    u.ulevel = newlvl;

    if (!rn2(10)) {
        game.flags.female = !game.flags.female;
        u.mfemale = !u.mfemale;
    }

    const { adjabil, redist_attr, encumber_msg } = await import('./attrib.js');
    await adjabil(oldlvl, newlvl);
    const { rndexp, newhp, newpw, setuhpmax } = await import('./exper.js');
    u.uexp = rndexp(false);
    redist_attr();

    const { rounddiv } = await import('./hack.js');
    let hpmax = u.uhpmax;
    for (let i = 0; i < oldlvl; i++)
        hpmax -= u.uhpinc?.[i] || 0;
    hpmax = rounddiv(hpmax * rn1(4, 8), 10);
    for (let i = 0; i < newlvl; i++) {
        u.ulevel = i;
        hpmax += newhp();
    }
    u.ulevel = newlvl;
    if (hpmax < u.ulevel)
        hpmax = u.ulevel;
    u.uhp = rounddiv(u.uhp * hpmax, u.uhpmax);
    setuhpmax(hpmax, true);

    let enmax = u.uenmax;
    for (let i = 0; i < oldlvl; i++)
        enmax -= u.ueninc?.[i] || 0;
    enmax = rounddiv(enmax * rn1(4, 8), 10);
    for (let i = 0; i < newlvl; i++) {
        u.ulevel = i;
        enmax += newpw();
    }
    u.ulevel = newlvl;
    if (enmax < u.ulevel)
        enmax = u.ulevel;
    u.uen = rounddiv(u.uen * enmax, Math.max(u.uenmax, 1));
    u.uenmax = enmax;

    u.uhunger = rn1(500, 500);
    const { newuhs } = await import('./eat.js');
    await newuhs(false);

    u.acurr = clone_attr(u.macurr);
    u.amax = clone_attr(u.mamax);
    u.umonnum = u.umonster;
    game.flags.female = !!u.mfemale;
    game.youmonst.data = game.mons?.[u.umonster] || mons[u.umonster];
    game.youmonst.mnum = u.umonster;
    set_form_stun(game.youmonst.data, u.umonster);
    u.mh = u.mhmax = 0;
    u.mtimedone = 0;
    u.uundetected = 0;

    const { find_ac } = await import('./do_wear.js');
    find_ac();
    const { newsym, see_monsters } = await import('./display.js');
    newsym(u.ux, u.uy);
    game.vision_full_recalc = 1;
    see_monsters();
    (game.disp ||= {}).botl = true;

    const form = game.flags.female
        ? (game.urace.individual?.f || game.urace.noun)
        : (game.urace.individual?.m || game.urace.noun);
    const { pline } = await import('./display.js');
    await pline(`You feel like a new ${form}!`);
    await encumber_msg();
    return 1;
}

// src/polyself.c:1367 rehumanize() and :200 polyman(). Restore the saved
// attributes and base form when a polymorphed body runs out of hit points.
export async function rehumanize() {
    const u = game.u;
    if (!Upolyd(u))
        return;

    if (u.uprops?.UNCHANGING) {
        (game.unported ||= new Set()).add('rehumanize:unchanging');
        return;
    }

    const { Blind } = await import('./youprop.js');
    const was_blind = Blind();

    u.acurr = clone_attr(u.macurr);
    u.amax = clone_attr(u.mamax);
    u.umonnum = u.umonster;
    game.flags.female = !!u.mfemale;
    game.youmonst.data = game.mons?.[u.umonster] || mons[u.umonster];
    game.youmonst.mnum = u.umonster;
    set_form_stun(game.youmonst.data, u.umonster);
    u.mh = u.mhmax = 0;
    u.mtimedone = 0;
    u.uundetected = 0;

    const { find_ac } = await import('./do_wear.js');
    find_ac();
    const { newsym, see_monsters, urgent_pline } = await import('./display.js');
    newsym(u.ux, u.uy);
    await urgent_pline(`You return to ${game.urace.adj} form!`);

    if (was_blind && !Blind()) {
        (u.intrinsic ||= {}).HBlinded = 1;
        u.ublind = 1;
        const { make_blinded } = await import('./potion.js');
        await make_blinded(0, true);
    }

    const { nomul } = await import('./hack.js');
    nomul(0);
    (game.disp ||= {}).botl = true;
    game.vision_full_recalc = 1;
    see_monsters();
    const { encumber_msg } = await import('./attrib.js');
    await encumber_msg();
}

// src/polyself.c:735 polymon(): install a monster form. The shared state,
// hit-dice, armor-fit and wielded-object paths are live for every form; rare
// form-specific effects remain recorded at their trigger.
export async function polymon(mntmp) {
    const u = game.u;
    const mdat = game.mons?.[mntmp] || mons[mntmp];
    if (!mdat)
        return 0;
    const oldAc = u.uac;
    let droppedCloak = false;
    let droppedWeaponMessage = null;

    (u.uconduct ||= {}).polyselfs = (u.uconduct.polyselfs | 0) + 1;

    const { exercise, encumber_msg } = await import('./attrib.js');
    exercise(A_CON, false);
    exercise(A_WIS, true);

    if (!Upolyd(u)) {
        u.macurr = clone_attr(u.acurr);
        u.mamax = clone_attr(u.amax);
        u.mfemale = !!game.flags.female;
    } else {
        u.acurr = clone_attr(u.macurr);
        u.amax = clone_attr(u.mamax);
        game.flags.female = !!u.mfemale;
    }

    const fixed_male = !!(mdat.mflags2 & 0x00010000);
    const fixed_female = !!(mdat.mflags2 & 0x00020000);
    if (fixed_male && game.flags.female)
        game.flags.female = false;
    else if (fixed_female && !game.flags.female)
        game.flags.female = true;
    else if (!fixed_male && !fixed_female && !is_neuter(mdat) && !rn2(10))
        game.flags.female = !game.flags.female;

    const monname = mdat.pmnames[game.flags.female ? 1 : 0]
                    || mdat.pmnames[2] || mdat.pmnames[0];
    const { You } = await import('./pline.js');
    await You(`${u.umonnum !== mntmp ? 'turn into' : 'feel like'} `
              + `${indefinite(u.umonnum !== mntmp ? monname : `new ${monname}`)}!`);

    u.mtimedone = rn1(500, 500);
    /* src/mondata.c:11 set_mon_data() prorates banked movement when the
       new form is slower. A faster form keeps the old amount rather than
       receiving free movement. */
    const oldspeed = game.youmonst.data?.mmove || 0;
    if (u.umovement && mdat.mmove < oldspeed && oldspeed > 0)
        u.umovement = Math.trunc(u.umovement * mdat.mmove / oldspeed);
    u.umonnum = mntmp;
    game.youmonst.data = mdat;
    game.youmonst.mnum = mntmp;
    set_form_stun(mdat, mntmp);

    if (strongmonst(mdat)) {
        u.acurr.a[A_STR] = 118;
        u.amax.a[A_STR] = 118;
    } else {
        u.amax.a[A_STR] = Math.min(u.amax.a[A_STR], 18);
        u.acurr.a[A_STR] = Math.min(u.acurr.a[A_STR], u.amax.a[A_STR]);
    }

    const mlvl = mdat.mlevel;
    if (mdat.mlet === MONSYMS.S_DRAGON
        && mntmp >= PMNAMES.PM_GRAY_DRAGON) {
        u.mhmax = 4 * mlvl + d(mlvl, 4);
    } else {
        u.mhmax = mlvl ? d(mlvl, 8) : rnd(4);
    }
    u.mh = u.mhmax;
    if (u.ulevel < mlvl)
        u.mtimedone = Math.trunc(u.mtimedone * u.ulevel / mlvl);

    if (sliparm(mdat) && u.uarm) {
        const armor = u.uarm;
        const { Your } = await import('./pline.js');
        await Your('armor falls around you!');
        const { setnotworn } = await import('./worn.js');
        setnotworn(armor);
        const { dropx } = await import('./do.js');
        await dropx(armor);
    }

    if (sliparm(mdat) && u.uarmc) {
        const cloak = u.uarmc;
        const { cloak_simple_name } = await import('./do_wear.js');
        await You(`shrink out of your ${cloak_simple_name(cloak)}!`);
        const { setnotworn } = await import('./worn.js');
        setnotworn(cloak);
        const { dropx } = await import('./do.js');
        await dropx(cloak);
        droppedCloak = true;
    }

    if ((nohands(mdat) || verysmall(mdat)) && u.uarmg) {
        const gloves = u.uarmg;
        const weapon = u.uwep;
        const { You } = await import('./pline.js');
        await You(`drop your gloves${weapon ? ' and weapon' : ''}!`);
        if (weapon) {
            const { uwepgone } = await import('./wield.js');
            uwepgone();
            const { dropx } = await import('./do.js');
            await dropx(weapon);
        }
        const { setnotworn } = await import('./worn.js');
        setnotworn(gloves);
        const { dropx } = await import('./do.js');
        await dropx(gloves);
    }

    if ((nohands(mdat) || verysmall(mdat)) && u.uarms) {
        const shield = u.uarms;
        const { You } = await import('./pline.js');
        await You('can no longer hold your shield!');
        const { setnotworn } = await import('./worn.js');
        setnotworn(shield);
        const { dropx } = await import('./do.js');
        await dropx(shield);
    }

    if ((nohands(mdat) || verysmall(mdat)) && u.uarmh) {
        const helm = u.uarmh;
        const { helm_simple_name } = await import('./do_wear.js');
        const { surface } = await import('./dungeon.js');
        const { Your } = await import('./pline.js');
        await Your(`${helm_simple_name(helm)} falls to the ${
            surface(u.ux, u.uy)}!`);
        const { setnotworn } = await import('./worn.js');
        setnotworn(helm);
        const { dropx } = await import('./do.js');
        await dropx(helm);
    }

    if ((nohands(mdat) || verysmall(mdat) || slithy(mdat)
         || mdat.mlet === MONSYMS.S_CENTAUR) && u.uarmf) {
        const boots = u.uarmf;
        const { Your } = await import('./pline.js');
        if (is_whirly(mdat))
            await Your('boots fall away!');
        else
            await Your(`boots ${verysmall(mdat) ? 'slide' : 'are pushed'} off your feet!`);
        const { setnotworn } = await import('./worn.js');
        setnotworn(boots);
        const { dropx } = await import('./do.js');
        await dropx(boots);
    }

    if (nohands(mdat) && u.uwep) {
        const weapon = u.uwep;
        const { weapon_descr } = await import('./weapon.js');
        const which = weapon_descr(weapon);
        const message = `find you must drop ${
            which.startsWith('corpse') ? 'the' : 'your'} ${which}!`;
        if (droppedCloak)
            droppedWeaponMessage = message;
        else
            await You(message);
        const { uwepgone } = await import('./wield.js');
        uwepgone();
        const { dropx } = await import('./do.js');
        await dropx(weapon);
    }

    if (droppedWeaponMessage) {
        game._deferred_status_ac_until_more = oldAc;
        game._deferred_status_ac_more_count = 2;
    }
    const { find_ac } = await import('./do_wear.js');
    find_ac();
    const { newsym, see_monsters } = await import('./display.js');
    newsym(u.ux, u.uy);
    game.vision_full_recalc = 1;
    see_monsters();
    (game.disp ||= {}).botl = true;
    await encumber_msg();

    if (droppedWeaponMessage) {
        await You(droppedWeaponMessage);
        delete game._deferred_status_ac_until_more;
        delete game._deferred_status_ac_more_count;
    }

    if (game.flags.verbose && attacktype(mdat, ATTKS.AT_BREA)) {
        const { pline } = await import('./display.js');
        await pline('Use the command #monster to use your breath weapon.');
    }
    return 1;
}

// src/polyself.c:469 polyself(), ordinary random polymorph. This preserves C's
// system-shock and candidate-selection draws. Controlled and form-specific
// selection remains tracked until those prompt paths are added here.
export async function polyself() {
    const u = game.u;

    if (u.uprops?.UNCHANGING) {
        const { You } = await import('./pline.js');
        await You('fail to transform!');
        return;
    }

    const controlled = !!u.uprops?.POLYMORPH_CONTROL;
    if (!controlled) {
        const { ACURR, exercise } = await import('./attrib.js');
        if (rn2(20) > ACURR(A_CON)) {
            const { You } = await import('./pline.js');
            const { losehp } = await import('./hack.js');
            await You('shudder for a moment.');
            await losehp(rnd(30), 'system shock', KILLED_BY_AN);
            exercise(A_CON, false);
            return;
        }
    } else {
        (game.unported ||= new Set()).add('polyself:controlled');
    }

    let mntmp = -1;
    let tryct = 200;
    do {
        mntmp = rn1(PMNAMES.SPECIAL_PM - PMNAMES.LOW_PM, PMNAMES.LOW_PM);
        const mdat = game.mons?.[mntmp] || mons[mntmp];
        if (polyok(mdat) && !placeholder_forms.has(mntmp))
            break;
    } while (--tryct > 0);

    const mdat = game.mons?.[mntmp] || mons[mntmp];
    if (!polyok(mdat) || (!controlled && !rn2(5)) || your_race(mdat))
        await newman();
    else
        await polymon(mntmp);
}

// src/wizcmds.c:568 wiz_polyself() and polyself(POLY_CONTROLLED).
export async function wiz_polyself() {
    const { getlin } = await import('./cmd.js');
    const name = await getlin('Become what kind of monster? [type the name]');
    if (name == null || name === '\x1b') {
        const { pline } = await import('./display.js');
        await pline('Never mind.');
        return ECMD_OK;
    }
    const mntmp = name_to_monplus(name.trim(), null, { v: -1 });
    if (mntmp < 0) {
        const { pline } = await import('./display.js');
        await pline("I've never heard of such monsters.");
        return ECMD_OK;
    }
    if (mntmp === game.urace.mnum)
        await newman();
    else
        await polymon(mntmp);
    return ECMD_OK;
}

// src/cmd.c:890 domonability(): use the current form's active ability.
export async function domonability() {
    const mdat = game.youmonst.data;
    const { You } = await import('./pline.js');
    if (attacktype(mdat, ATTKS.AT_BREA)) {
        if (game.u.uen < 15) {
            await You("don't have enough energy to breathe!");
            return ECMD_OK;
        }
        game.u.uen -= 15;
        (game.disp ||= {}).botl = true;
        const { getdir } = await import('./cmd.js');
        return await getdir(null) ? ECMD_TIME : ECMD_OK;
    }
    if (Upolyd(game.u)) {
        const { pline } = await import('./display.js');
        await pline('Any special ability you may have is purely reflexive.');
    } else {
        await You("don't have a special ability in your normal form!");
    }
    return ECMD_OK;
}
