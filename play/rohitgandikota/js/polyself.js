// polyself.js: the hero's polymorphed form.
// C ref: src/polyself.c
//
// The hero's monster form: set_uasmon(), polyself()/polymon()/newman(),
// rehumanize(), and the #monster abilities.

import { game } from './gstate.js';
import { is_neuter, humanoid, slithy, attacktype,
         strongmonst, sliparm, breakarm, nohands, verysmall,
         is_whirly, num_horns, has_head, hides_under, webmaker,
         is_hider, lays_eggs, is_swimmer, is_unicorn,
         regenerates, resists_drli, dmgtype, dmgtype_fromattack,
         perceives, telepathic, infravision, pm_invisible,
         can_teleport, control_teleport, is_floater, is_flyer,
         passes_walls, haseyes, is_dwarf, is_elf, is_giant, is_gnome,
         is_orc, is_undead, set_mon_data, is_vampire, is_mind_flayer,
         can_breathe, can_be_strangled, name_to_mon, attacktype_fordmg,
         emits_light, amorphous, unsolid, sticks, flaming, likes_lava,
         poly_when_stoned, touch_petrifies, mindless, nonliving,
         weirdnonliving, type_is_pname, could_twoweap, cantwield, digests,
         is_clinger, is_animal, resists_fire, has_horns, Is_dragon_armor,
         Is_dragon_scales, eggs_in_water } from './mondata.js';
import { mons, PMNAMES, MONSYMS, ATTKS, MFLAGS, MSOUND } from './monst_data.js';
import { genders } from './role_data.js';
import { character_race } from './role.js';
import { is_vampshifter, helpless, DEADMONSTER } from './monst.js';
import { NO_PART, ARM, FINGER, FINGERTIP, FOOT, HAND, HANDED,
         HEAD, LEG, TOE, HAIR, EYE, NOSE, NECK, A_STR, A_WIS, A_CON, A_DEX,
         ECMD_OK, ECMD_TIME, ECMD_CANCEL, KILLED_BY_AN, KILLED_BY,
         NO_KILLER_PREFIX, Upolyd, FROMFORM, FROMRACE,
         I_SPECIAL, FROMOUTSIDE, TT_PIT, TT_WEB, TT_BEARTRAP, TT_LAVA,
         TT_INFLOOR, TT_BURIEDBALL, NON_PM, LOW_PM, NATTK, G_GENOD, G_UNIQ,
         MAXULEV, LL_CONDUCT, LL_MINORAC, SICK_ALL, POLY_NOFLAGS,
         POLY_CONTROLLED, POLY_LOW_CTRL, POLY_MONSTER, POLY_REVERT,
         DISMOUNT_POLY, M_AP_TYPE, M_AP_NOTHING, M_AP_OBJECT, M_AP_FURNITURE,
         DIED, GENOCIDED, STONING, POLYMORPH, ismnum, Mgender, In_endgame,
         Is_airlevel, Is_waterlevel, IS_AIR, IS_FOUNTAIN, MALE, FEMALE,
         NEUTRAL, Never_mind, thats_enough_tries, plur, BZ_OFS_AD,
         BZ_U_BREATH, BOLT_LIM, SHOPBASE, SHOP_WEB_COST, NO_TRAP_FLAGS,
         W_ARMU, PIT, SPIKED_PIT, SQKY_BOARD, TELEP_TRAP, LEVEL_TELEP,
         MAGIC_PORTAL, VIBRATING_SQUARE, WEB, HOLE, TRAPDOOR,
         ROLLING_BOULDER_TRAP, ARROW_TRAP, DART_TRAP, BEAR_TRAP, ROCKTRAP,
         FIRE_TRAP, LANDMINE, SLP_GAS_TRAP, RUST_TRAP, MAGIC_TRAP,
         ANTI_MAGIC, POLY_TRAP, STAIRS, STR18, STR19 } from './const.js';
import { Flying, Levitation, Blind, See_invisible, Stone_resistance,
         Sick_resistance, Swimming, Passes_walls, Underwater, Free_action,
         Hallucination, Invis, Protection_from_shape_changers, Unaware,
         Unchanging, Polymorph_control } from './youprop.js';
import { arti_light_radius, del_light_source, new_light_source,
         LS_MONSTER } from './light.js';
import { maybe_adjust_light, mksobj } from './mkobj.js';
import { artifact_light, retouch_equipment } from './artifact.js';
import { Your, You, You_cant, You_feel, pline_The, There,
         livelog_printf } from './pline.js';
import { newsym, see_monsters, urgent_pline, pline, canspotmon, canseemon,
         set_mimic_blocking } from './display.js';
import { rn2, rn1, d, rnd, rnl } from './rng.js';
import { OCLASSES, ONAMES } from './objects_data.js';
import { WrappingAllowed, is_flimsy } from './obj.js';
import { simpleonames, vtense, yname, makeplural, the, an, the_unique_pm,
         cxname, otense } from './objnam.js';
import { exercise, ACURR, encumber_msg, adjabil, redist_attr } from './attrib.js';
import { rndexp, newhp, newpw, setuhpmax } from './exper.js';
import { rounddiv, losehp, unmul, nomul, spoteffects, in_rooms } from './hack.js';
import { newuhs } from './eat.js';
import { find_ac, donning, cancel_don, Armor_gone, Cloak_off, Helmet_off,
         Gloves_off, Shield_off, Boots_off, Blindf_off, cloak_simple_name,
         helm_simple_name } from './do_wear.js';
import { useup, update_inventory } from './invent.js';
import { setworn, racial_exception } from './worn.js';
import { end_burn, learn_egg_type } from './timeout.js';
import { dropx, canletgo } from './do.js';
import { uwepgone, uswapwepgone, untwoweapon, is_sword } from './wield.js';
import { weapon_descr } from './weapon.js';
import { pmname, Monnam, mon_nam, Some_Monnam, l_monnam, y_monnam,
         hliquid } from './do_name.js';
import { mungspaces, strstri, strsubst, s_suffix } from './hacklib.js';
import { name_to_monclass, unpunish } from './read.js';
import { observe_object, makeknown } from './o_init.js';
import { done, find_delayed_killer, dealloc_killer } from './end.js';
import { set_utrap, reset_utrap, selftouch, instapetrify, deltrap, feeltrap,
         dotrap, ignite_items } from './trap.js';
import { maketrap, bury_objs } from './mklev.js';
import { set_ustuck, t_at, is_pool, setmangry, killed, wakeup,
         egg_type_from_parent, valid_vampshiftform } from './mon.js';
import { expels } from './mhitu.js';
import { can_ride, dismount_steed } from './steed.js';
import { buried_ball_to_freedom } from './dig.js';
import { is_pool_or_lava } from './dbridge.js';
import { rank_of, max_rank_sz } from './botl.js';
import { ubreatheu, ubuzz, destroy_items } from './zap.js';
import { throwit } from './dothrow.js';
import { add_damage } from './shk.js';
import { On_stairs } from './stairs.js';
import { mdistu } from './monmove.js';
import { couldsee } from './vision.js';
import { surface, has_ceiling } from './dungeon.js';
import { getlin, getdir } from './cmd.js';
import { tty_yn_function } from './tty/topl.js';
import { youhiding } from './insight.js';
import { make_stoned, make_sick, make_slimed, make_blinded,
         make_glib } from './potion.js';
import { is_placeholder, is_golem, is_bat, is_male, is_female, golemhp,
         is_home_elemental, hideunder, mkclass_poly } from './makemon.js';
import { were_beastie, counter_were, is_were, were_summon } from './were.js';

// src/polyself.c:131 float_vs_flight() — levitation overrides flight, and
// being stuck in the floor (lava, solidified lava, tethered ball, bear trap,
// web) overrides both: the floor is reachable then.
export function float_vs_flight() {
    const u = game.u;
    const intr = (u.intrinsic ||= {});
    const props = (u.uprops ||= {});
    const blocked = (u.blocked ||= {});
    const stuck_in_floor = !!(u.utrap && u.utraptype !== TT_PIT);

    if ((intr.HLevitation || props.LEVITATION)
        || ((intr.HFlying || props.FLYING) && stuck_in_floor))
        blocked.FLYING = (blocked.FLYING | 0) | I_SPECIAL;
    else
        blocked.FLYING = (blocked.FLYING | 0) & ~I_SPECIAL;
    if ((intr.HLevitation || props.LEVITATION) && stuck_in_floor)
        blocked.LEVITATION = (blocked.LEVITATION | 0) | I_SPECIAL;
    else
        blocked.LEVITATION = (blocked.LEVITATION | 0) & ~I_SPECIAL;
    /* riding blocks stealth unless hero is flying or levitating */
    steed_vs_stealth();
    (game.disp ||= {}).botl = true;
}

// src/polyself.c:163 steed_vs_stealth()
export function steed_vs_stealth() {
    const blocked = (game.u.blocked ||= {});
    if (game.u.usteed && !Flying() && !Levitation())
        blocked.STEALTH = (blocked.STEALTH | 0) | FROMOUTSIDE;
    else
        blocked.STEALTH = (blocked.STEALTH | 0) & ~FROMOUTSIDE;
}

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

// src/polyself.c:2160 ugolemeffects(). Flesh golems convert electrical
// damage into a small heal, and iron golems convert fire damage into a heal.
// The caller has already established resistance, so this function only
// handles the form-specific recovery.
export async function ugolemeffects(damtype, dam) {
    const u = game.u;
    let heal = 0;

    if (u.umonnum !== PMNAMES.PM_FLESH_GOLEM
        && u.umonnum !== PMNAMES.PM_IRON_GOLEM)
        return;
    if (damtype === ATTKS.AD_ELEC
        && u.umonnum === PMNAMES.PM_FLESH_GOLEM)
        heal = Math.trunc((dam + 5) / 6);
    else if (damtype === ATTKS.AD_FIRE
             && u.umonnum === PMNAMES.PM_IRON_GOLEM)
        heal = dam;

    if (heal && u.mh < u.mhmax) {
        u.mh = Math.min(u.mh + heal, u.mhmax);
        (game.disp ||= {}).botl = true;
        const { pline } = await import('./display.js');
        await pline('Strangely, you feel better than before.');
        const { exercise } = await import('./attrib.js');
        exercise(A_STR, true);
    }
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

/* src/decl.c:44 c_common_strings.c_shudder_for_moment */
const shudder_for_moment = 'shudder for a moment.';
/* src/polyself.c:33 */
const no_longer_petrify_resistant = 'No longer petrify-resistant, you';

/* include/youprop.h:368 Polymorph_control, :372 Unchanging, and the
   stun/confusion/strangulation properties as this port stores them. */
const Stunned = () => !!(game.u.intrinsic?.HStun || game.u.uprops?.STUNNED);
const Confusion = () => !!(game.u.intrinsic?.HConfusion
                           || game.u.uprops?.CONFUSION);
const Strangled = () => (game.u.uprops?.STRANGLED | 0);
/* include/you.h Punished */
const Punished = () => !!game.u.uball;
/* include/you.h:555 Ugender */
const Ugender = () => ((Upolyd(game.u) ? game.u.mfemale
                                       : game.flags.female) ? 1 : 0);
/* include/mondata.h polyok(), include/you.h your_race() */
const polyok = (mdat) => (mdat.mflags2 & MFLAGS.M2_NOPOLY) === 0;
export const your_race = (mdat) =>
    (mdat.mflags2 & (game.urace?.selfmask || 0)) !== 0;
/* src/decl.c c_common_strings.c_the_your[] */
const the_your = ['the', 'your'];
/* include/decl.h hidespinchars[] */
const hidespinchars = 'hsq';

/* C copies the attribute structs by value; the port must clone them. */
const clone_attr = (attr) => attr ? { ...attr, a: [...attr.a] } : attr;

// src/polyself.c:38 set_uasmon()
export function set_uasmon() {
    const u = game.u;
    const youmonst = game.youmonst;
    const mdat = mons[u.umonnum];
    const was_vampshifter = valid_vampshiftform(youmonst.cham ?? NON_PM,
                                                u.umonnum);

    set_mon_data(youmonst, mdat);
    youmonst.m_id = 1; /* youmonst.m_id is 1, monsters start at 2 */

    if (Protection_from_shape_changers())
        youmonst.cham = NON_PM;
    else if (is_vampire(youmonst.data))
        youmonst.cham = youmonst.mnum;
    else if (!was_vampshifter)
        youmonst.cham = NON_PM;
    u.mcham = youmonst.cham; /* for save/restore since youmonst isn't */

    const intr = (u.intrinsic ||= {});
    const PROPSET = (key, on) => {
        if (on)
            intr[key] = (intr[key] || 0) | FROMFORM;
        else
            intr[key] = (intr[key] || 0) & ~FROMFORM;
    };
    const resist_from_form = (MRtyp) => (youmonst.data.mresists & MRtyp) !== 0;

    PROPSET('HFire_resistance', resist_from_form(MFLAGS.MR_FIRE));
    PROPSET('HCold_resistance', resist_from_form(MFLAGS.MR_COLD));
    PROPSET('HSleep_resistance', resist_from_form(MFLAGS.MR_SLEEP));
    PROPSET('HDisint_resistance', resist_from_form(MFLAGS.MR_DISINT));
    PROPSET('HShock_resistance', resist_from_form(MFLAGS.MR_ELEC));
    PROPSET('HPoison_resistance', resist_from_form(MFLAGS.MR_POISON));
    PROPSET('HAcid_resistance', resist_from_form(MFLAGS.MR_ACID));
    PROPSET('HStone_resistance', resist_from_form(MFLAGS.MR_STONE));
    {
        /* resists_drli() takes wielded weapon into account; suppress it */
        const save_uwep = u.uwep;
        u.uwep = null;
        PROPSET('HDrain_resistance', resists_drli(youmonst));
        u.uwep = save_uwep;
    }
    /* Resists_magm() takes wielded, worn, and carried equipment into
       into account; cheat and duplicate its monster-specific part */
    PROPSET('HAntimagic', (dmgtype(mdat, ATTKS.AD_MAGM)
                           || mdat === mons[PMNAMES.PM_BABY_GRAY_DRAGON]
                           || dmgtype(mdat, ATTKS.AD_RBRE)));
    PROPSET('HSick_resistance', (mdat.mlet === MONSYMS.S_FUNGUS
                                 || mdat === mons[PMNAMES.PM_GHOUL]));
    PROPSET('HStun', (mdat === mons[PMNAMES.PM_STALKER] || is_bat(mdat)));
    PROPSET('HHalluc_resistance', dmgtype(mdat, ATTKS.AD_HALU));
    PROPSET('HSee_invisible', perceives(mdat));
    PROPSET('HTelepat', telepathic(mdat));
    /* note that Infravision uses mons[race] rather than usual mons[role] */
    PROPSET('HInfravision', infravision(Upolyd(u) ? mdat
                                                  : mons[game.urace.mnum]));
    PROPSET('HInvis', pm_invisible(mdat));
    PROPSET('HTeleportation', can_teleport(mdat));
    PROPSET('HTeleport_control', control_teleport(mdat));
    PROPSET('HLevitation', is_floater(mdat));
    /* floating eye is the only 'floater'; it is also flagged as a 'flyer';
       suppress flying for it so that enlightenment doesn't confusingly
       show latent flight capability always blocked by levitation */
    PROPSET('HFlying', (is_flyer(mdat) && !is_floater(mdat)));
    PROPSET('HSwimming', is_swimmer(mdat));
    /* [Amphibious and Breathless aren't actually implemented as properties;
       key off of it but include different monster forms...] */
    PROPSET('HPasses_walls', passes_walls(mdat));
    PROPSET('HRegeneration', regenerates(mdat));
    PROPSET('HReflecting', (mdat === mons[PMNAMES.PM_SILVER_DRAGON]));
    PROPSET('HBlinded', !haseyes(mdat));
    PROPSET('HBlnd_resistance', (dmgtype_fromattack(mdat, ATTKS.AD_BLND,
                                                    ATTKS.AT_EXPL)
                                 || dmgtype_fromattack(mdat, ATTKS.AD_BLND,
                                                       ATTKS.AT_GAZE)));

    /* This port keeps the derived u.ublind flag that youprop.js Blind()
       reads; C evaluates the Blind macro from the properties each time. */
    const facewearBlinds = u.ublindf
        && (u.ublindf.otyp === ONAMES.BLINDFOLD
            || u.ublindf.otyp === ONAMES.TOWEL);
    u.ublind = !u.blocked?.BLINDED && (!!intr.HBlinded || facewearBlinds)
               ? 1 : 0;

    /* whether the player is flying depends on Levitation (which may be
       from the form) and on being trapped in the floor; during restore
       the trap state won't be known yet */
    if (!game.program_state?.restoring)
        float_vs_flight(); /* maybe toggle (BFlying & I_SPECIAL) */
    polysense();

    /* [STATUS_HILITES: status_initialize(REASSESS_ONLY) reassesses the
       status fields; the tty port here rebuilds the whole bottom line on
       every bot() so there is nothing to re-initialize.] */
    game.were_changes = 0;
}

// src/polyself.c:168 check_strangling()
export async function check_strangling(on) {
    const u = game.u;
    const props = (u.uprops ||= {});
    if (on) {
        const was_strangled = (Strangled() !== 0);

        /* when Strangled is already set, polymorphing from one
           vulnerable form into another causes the counter to be reset */
        if (u.uamul && u.uamul.otyp === ONAMES.AMULET_OF_STRANGULATION
            && can_be_strangled(game.youmonst)) {
            props.STRANGLED = 6;
            (game.disp ||= {}).botl = true;
            await Your(`${simpleonames(u.uamul)} ${
                was_strangled ? 'still constricts' : 'begins constricting'
            } your ${body_part(NECK)}!`); /* "throat" */
            makeknown(ONAMES.AMULET_OF_STRANGULATION);
        }
    } else {
        if (Strangled() && !can_be_strangled(game.youmonst)) {
            props.STRANGLED = 0;
            (game.disp ||= {}).botl = true;
            await You('are no longer being strangled.');
        }
    }
}

// src/polyself.c:200 polyman(); make a (new) human out of the player
async function polyman(fmt, arg) {
    const u = game.u;
    const youmonst = game.youmonst;
    const sticking = (sticks(youmonst.data) && u.ustuck && !u.uswallow),
          was_mimicking = (M_AP_TYPE(youmonst) !== M_AP_NOTHING);
    const was_blind = !!Blind(),
          had_see_invis = !!See_invisible();

    if (Upolyd(u)) {
        u.acurr = clone_attr(u.macurr); /* restore old attribs */
        u.amax = clone_attr(u.mamax);
        u.umonnum = u.umonster;
        game.flags.female = !!u.mfemale;
    }
    set_uasmon();

    u.mh = u.mhmax = 0;
    u.mtimedone = 0;
    await skinback(false);
    u.uundetected = 0;

    if (sticking)
        await uunstick();
    find_ac();
    if (was_mimicking) {
        if (game.multi < 0)
            await unmul('');
        youmonst.m_ap_type = M_AP_NOTHING;
        youmonst.mappearance = 0;
    }
    newsym(u.ux, u.uy);

    await urgent_pline(fmt.replace('%s', arg));
    /* check whether player foolishly genocided self while poly'd */
    if (ugenocided()) {
        /* intervening activity might have clobbered genocide info */
        const kptr = find_delayed_killer(POLYMORPH);

        if (kptr && kptr.name) {
            game.killer.format = kptr.format;
            game.killer.name = kptr.name;
        } else {
            game.killer.format = KILLED_BY;
            game.killer.name = 'self-genocide';
        }
        dealloc_killer(kptr);
        await done(GENOCIDED);
    }

    if (!!See_invisible() ^ had_see_invis)
        set_mimic_blocking(); /* See_invisible just toggled */
    if (u.twoweap && !could_twoweap(youmonst.data))
        untwoweapon();

    if (u.utrap && u.utraptype === TT_PIT) {
        set_utrap(rn1(6, 2), TT_PIT); /* time to escape resets */
    }
    if (was_blind && !Blind()) { /* reverting from eyeless */
        (u.intrinsic ||= {}).HBlinded = 1; /* set_itimeout(&HBlinded, 1L) */
        u.ublind = 1;
        await make_blinded(0, true); /* remove blindness */
    }
    await check_strangling(true);

    if (!Levitation() && !u.ustuck && is_pool_or_lava(u.ux, u.uy))
        await spoteffects(true);

    see_monsters();
}

// src/polyself.c:273 change_sex()
export function change_sex() {
    const u = game.u;
    const youmonst = game.youmonst;
    /* setting u.umonster for caveman/cavewoman or priest/priestess
       swap unintentionally makes `Upolyd' appear to be true */
    if (!Upolyd(u)
        || (!is_male(youmonst.data) && !is_female(youmonst.data)
            && !is_neuter(youmonst.data)))
        game.flags.female = !game.flags.female;
    if (Upolyd(u)) /* poly'd: also change saved sex */
        u.mfemale = !u.mfemale;
    max_rank_sz(); /* [this appears to be superfluous] */
    if ((Upolyd(u) ? u.mfemale : game.flags.female) && game.urole.name.f)
        game.pl_character = game.urole.name.f;
    else
        game.pl_character = game.urole.name.m;
    if (!Upolyd(u)) {
        u.umonnum = u.umonster;
    } else if (u.umonnum === PMNAMES.PM_AMOROUS_DEMON) {
        game.flags.female = !game.flags.female;
        set_uasmon();
    }
}

// src/polyself.c:307 livelog_newform()
export function livelog_newform(viapoly, oldgend, newgend) {
    const u = game.u;
    if (!Upolyd(u)) {
        if (newgend !== oldgend) {
            const oldrole = (oldgend && game.urole.name.f)
                            ? game.urole.name.f : game.urole.name.m;
            const newrole = (newgend && game.urole.name.f)
                            ? game.urole.name.f : game.urole.name.m;
            const oldrank = rank_of(u.ulevel, game.urole, !!oldgend);
            const newrank = rank_of(u.ulevel, game.urole, !!newgend);
            const buf = `${genders[game.flags.female ? 1 : 0].adj.slice(0, 10)} ${
                newrank.slice(0, 30)}`;
            livelog_printf(LL_MINORAC, `${viapoly ? 'polymorphed' : 'transformed'} into ${
                an(newrole !== oldrole ? newrole
                   : newrank !== oldrank ? newrank : buf)}`);
        }
    }
}

// src/polyself.c:336 newman()
async function newman() {
    let oldgend;
    const u = game.u;
    const oldlvl = u.ulevel;
    let newlvl = oldlvl + rn1(5, -2);     /* new = old + {-2,-1,0,+1,+2} */
    let dead = false;

    if (newlvl > 127 || newlvl < 1) { /* level went below 0? */
        dead = true; /* old level is still intact (in case of lifesaving) */
    } else {
        if (newlvl > MAXULEV)
            newlvl = MAXULEV;
        /* If your level goes down, your peak level goes down by
           the same amount so that you can't simply use blessed
           full healing to undo the decrease.  But if your level
           goes up, your peak level does *not* undergo the same
           adjustment; you might end up losing out on the chance
           to regain some levels previously lost to other causes. */
        if (newlvl < oldlvl)
            u.ulevelmax -= (oldlvl - newlvl);
        if (u.ulevelmax < newlvl)
            u.ulevelmax = newlvl;
        u.ulevel = newlvl;

        oldgend = poly_gender();
        if (game.sex_change_ok && !rn2(10))
            change_sex();

        await adjabil(oldlvl, u.ulevel);
        u.uexp = rndexp(false);
        redist_attr();

        /* random experience points for the new experience level */
        let hpmax = u.uhpmax;
        for (let i = 0; i < oldlvl; i++)
            hpmax -= (u.uhpinc?.[i] | 0);
        /* hpmax * rn1(4,8) / 10; 0.8 <= f <= 1.1 */
        hpmax = rounddiv(hpmax * rn1(4, 8), 10);
        for (let i = 0; (u.ulevel = i) < newlvl; i++)
            hpmax += newhp();
        if (hpmax < u.ulevel)
            hpmax = u.ulevel; /* min of 1 HP per level */
        /* retain same proportion for current HP; u.uhp * hpmax / u.uhpmax */
        u.uhp = rounddiv(u.uhp * hpmax, u.uhpmax);
        setuhpmax(hpmax, true); /* might reduce u.uhp */

        let enmax = u.uenmax;
        for (let i = 0; i < oldlvl; i++)
            enmax -= (u.ueninc?.[i] | 0);
        enmax = rounddiv(enmax * rn1(4, 8), 10);
        for (let i = 0; (u.ulevel = i) < newlvl; i++)
            enmax += newpw();
        if (enmax < u.ulevel)
            enmax = u.ulevel;
        u.uen = rounddiv(u.uen * enmax, ((u.uenmax < 1) ? 1 : u.uenmax));
        u.uenmax = enmax;

        /* [note: this 'roll' is the same one used by mhitu's AD_DRIN
           after "You feel a strange kind of tingling" ] */
        u.uhunger = rn1(500, 500);
        if (u.uprops?.SICK)
            await make_sick(0, null, false, SICK_ALL);
        if (u.uprops?.STONED)
            await make_stoned(0, null, 0, null);
        if (u.uhp <= 0) {
            if (Polymorph_control()) { /* even when Stunned || Unaware */
                if (u.uhp <= 0)
                    u.uhp = 1;
            } else {
                dead = true;
            }
        }
    }
    if (dead) { /* we come directly here if experience level went to 0 or less */
        await urgent_pline("Your new form doesn't seem healthy enough to survive.");
        game.killer.format = KILLED_BY_AN;
        game.killer.name = 'unsuccessful polymorph';
        await done(DIED);
        await newuhs(false);
        await encumber_msg(); /* used to be done by redist_attr() */
        return; /* lifesaved */
    }
    await newuhs(false);
    const newform = ((Upolyd(u) ? u.mfemale : game.flags.female)
                     && game.urace.individual?.f)
                    ? game.urace.individual.f
                    : (game.urace.individual?.m)
                       ? game.urace.individual.m
                       : game.urace.noun;
    await polyman('You feel like a new %s!', newform);
    const newgend = poly_gender();
    /* note: newman() bypasses achievements for new ranks attained and
       doesn't log "new <form>" when that isn't accompanied by level change */
    if (newlvl !== oldlvl)
        livelog_printf(LL_MINORAC, `became experience level ${newlvl} as a new ${newform}`);
    else
        livelog_newform(true, oldgend, newgend);

    if (u.uprops?.SLIMED) {
        await Your('body transforms, but there is still slime on you.');
        await make_slimed(10, null);
    }

    (game.disp ||= {}).botl = true;
    see_monsters();
    await encumber_msg();

    await retouch_equipment(2);
    if (!u.uarmg)
        await selftouch(no_longer_petrify_resistant);
}

// src/polyself.c:469 polyself()
export async function polyself(psflags = POLY_NOFLAGS) {
    const u = game.u;
    const youmonst = game.youmonst;
    let buf = '';
    let old_light, new_light, mntmp, klass = 0, tryct = 0;
    const gvariant = { v: NEUTRAL };
    let forcecontrol = ((psflags & POLY_CONTROLLED) !== 0);
    const low_control = ((psflags & POLY_LOW_CTRL) !== 0);
    let monsterpoly = ((psflags & POLY_MONSTER) !== 0);
    const formrevert = ((psflags & POLY_REVERT) !== 0);
    const draconian = !!(u.uarm && Is_dragon_armor(u.uarm));
    const iswere = ismnum(u.ulycn);
    const isvamp = (is_vampire(youmonst.data) || is_vampshifter(youmonst));
    let controllable_poly = Polymorph_control() && !(Stunned() || Unaware());

    if (Unchanging()) {
        await You('fail to transform!');
        return;
    }
    /* being Stunned|Unaware doesn't negate this aspect of Poly_control */
    if (!Polymorph_control() && !forcecontrol && !draconian && !iswere
        && !isvamp) {
        if (rn2(20) > ACURR(A_CON)) {
            await You(shudder_for_moment);
            await losehp(rnd(30), 'system shock', KILLED_BY_AN);
            exercise(A_CON, false);
            return;
        }
    }
    old_light = emits_light(youmonst.data);
    mntmp = NON_PM;

    if (formrevert) {
        mntmp = youmonst.cham;
        monsterpoly = true;
        controllable_poly = false;
    }

    if (forcecontrol && low_control
        && (draconian || monsterpoly || isvamp || iswere))
        forcecontrol = false;

    /* the label targets of C's gotos, in loop-free form */
    let target = null; /* 'do_merge' | 'do_shift' | 'do_vampyr' | 'made_change' */

    if (monsterpoly && isvamp)
        target = 'do_vampyr';
    if (!target && (controllable_poly || forcecontrol)) {
        buf = '';
        tryct = 5;
        do {
            mntmp = NON_PM;
            buf = mungspaces(await getlin('Become what kind of monster? [type the name]'));
            if (buf[0] === '\x1b') {
                /* user is cancelling controlled poly */
                if (forcecontrol) { /* wizard mode #polyself */
                    await pline(Never_mind);
                    return;
                }
                buf = '*'; /* resort to random */
            }
            if (buf === '*' || buf === 'random') {
                /* explicitly requesting random result */
                tryct = 0; /* will skip thats_enough_tries */
                continue;  /* end do-while(--tryct > 0) loop */
            }
            klass = 0;
            mntmp = name_to_mon(buf, gvariant);
            let by_class = (mntmp < LOW_PM);
            let by_class_again = false;
            do {
                by_class_again = false;
                if (by_class) {
                    const r = name_to_monclass(buf);
                    klass = r.monclass;
                    mntmp = r.which;
                    if (klass && mntmp === NON_PM)
                        mntmp = (draconian && klass === MONSYMS.S_DRAGON)
                                ? armor_to_dragon(u.uarm.otyp)
                                : mkclass_poly(klass);
                    /* placeholder monsters are flagged as M2_NOPOLY
                       but they are reasonable polymorph targets;
                       pick a suitable substitute (which might be geno'd) */
                } else if (is_placeholder(mons[mntmp])
                           && !your_race(mons[mntmp])
                           && mntmp !== PMNAMES.PM_HUMAN) {
                    if (mntmp === PMNAMES.PM_ORC)
                        mntmp = rn2(3) ? PMNAMES.PM_HILL_ORC
                                       : PMNAMES.PM_MORDOR_ORC;
                    else if (mntmp === PMNAMES.PM_ELF)
                        mntmp = rn2(3) ? PMNAMES.PM_GREEN_ELF
                                       : PMNAMES.PM_GREY_ELF;
                    else if (mntmp === PMNAMES.PM_GIANT)
                        mntmp = rn2(3) ? PMNAMES.PM_STONE_GIANT
                                       : PMNAMES.PM_HILL_GIANT;
                    /* [PM_DWARF and PM_GNOME used to be here but they are
                       no longer flagged no-poly so have no need for placeholder
                       handling; PM_HUMAN is a placeholder without a suitable
                       substitute so gets handled differently below] */
                }
                if (mntmp < LOW_PM) {
                    if (!klass)
                        await pline("I've never heard of such monsters.");
                    else
                        await You_cant('polymorph into any of those.');
                } else if (game.wizard && Upolyd(u)
                           && (mntmp === u.umonster
                               /* "priest" and "priestess" match the monster
                                  rather than the role; override that unless
                                  the text explicitly contains "aligned" */
                               || (u.umonster === PMNAMES.PM_CLERIC
                                   && mntmp === PMNAMES.PM_ALIGNED_CLERIC
                                   && strstri(buf, 'aligned') < 0))) {
                    /* in wizard mode, picking own role while poly'd reverts to
                       normal without newman()'s chance of level or sex change */
                    await rehumanize();
                    old_light = 0; /* rehumanize() extinguishes u-as-mon light */
                    target = 'made_change';
                } else if (iswere && (were_beastie(mntmp) === u.ulycn
                                      || mntmp === counter_were(u.ulycn)
                                      || (Upolyd(u) && mntmp === PMNAMES.PM_HUMAN))) {
                    target = 'do_shift';
                } else if (!polyok(mons[mntmp])
                           /* Note:  humans are illegal as monsters, but an
                              illegal monster forces newman(), which is what
                              we want if they specified a human.... (unless
                              they specified a unique monster) */
                           && !(mntmp === PMNAMES.PM_HUMAN
                                || (your_race(mons[mntmp])
                                    && (mons[mntmp].geno & G_UNIQ) === 0)
                                || mntmp === game.urole.mnum)) {
                    /* class prefix (or whole name) matched a non-polyable
                       candidate; if so, usually try again */
                    if (klass) {
                        if (rn2(3) || --tryct > 0) {
                            by_class = true;
                            by_class_again = true;
                            continue;
                        }
                        /* the tryct was decremented to 0 above;
                           so that end of loop decrement will yield
                           0 and trigger thats_enough_tries message */
                        ++tryct;
                    }
                    let pm_name = pmname(mons[mntmp],
                                         game.flags.female ? FEMALE : MALE);
                    if (the_unique_pm(mons[mntmp]))
                        pm_name = the(pm_name);
                    else if (!type_is_pname(mons[mntmp]))
                        pm_name = an(pm_name);
                    await You_cant(`polymorph into ${pm_name}.`);
                } else {
                    target = 'chosen';
                }
            } while (by_class_again);
            if (target)
                break;
        } while (--tryct > 0);
        if (target === 'chosen')
            target = null;
        if (target !== 'made_change' && target !== 'do_shift') {
            if (!tryct)
                await pline(thats_enough_tries);
            /* allow skin merging, even when polymorph is controlled */
            if (draconian && (tryct <= 0 || mntmp === armor_to_dragon(u.uarm.otyp)))
                target = 'do_merge';
            else if (isvamp && (tryct <= 0 || mntmp === PMNAMES.PM_WOLF
                                || mntmp === PMNAMES.PM_FOG_CLOUD
                                || is_bat(mons[mntmp])))
                target = 'do_vampyr';
        }
    } else if (!target && (draconian || iswere || isvamp)) {
        target = draconian ? 'do_merge' : iswere ? 'do_shift' : 'do_vampyr';
    }

    if (target === 'do_merge' || target === 'do_shift' || target === 'do_vampyr') {
        if (target === 'do_merge') {
            mntmp = armor_to_dragon(u.uarm.otyp);
            if (!(game.mvitals[mntmp].mvflags & G_GENOD)) {
                const was_lit = u.uarm.lamplit;
                const arm_light = artifact_light(u.uarm)
                                  ? arti_light_radius(u.uarm) : 0;

                /* allow G_EXTINCT */
                if (Is_dragon_scales(u.uarm)) {
                    await You('merge with your scaly armor.');
                } else { /* dragon scale mail reverts to scales */
                    /* fake a "usual" name for (dragon scale mail);
                       shorten to "<color> scale mail" */
                    buf = strsubst(simpleonames(u.uarm), ' dragon ', ' ');
                    /* tricky phrasing; dragon scale mail
                       is singular, dragon scales are plural (note: we don't use
                       "set of scales", which usually overrides the distinction,
                       here) */
                    await Your(`${buf} reverts to scales as you merge with them.`);
                    /* uarm->spe enchantment remains unchanged;
                       re-converting scales to mail poses risk
                       of evaporation due to over enchanting */
                    u.uarm.otyp += ONAMES.GRAY_DRAGON_SCALES
                                   - ONAMES.GRAY_DRAGON_SCALE_MAIL;
                    observe_object(u.uarm);
                    (game.disp ||= {}).botl = true; /* AC is changing */
                }
                u.uskin = u.uarm;
                u.uarm = null;
                /* save/restore hack */
                u.uskin.owornmask |= I_SPECIAL;
                if (was_lit)
                    await maybe_adjust_light(u.uskin, arm_light);
                update_inventory();
            }
        } else if (target === 'do_shift') {
            if (Upolyd(u) && were_beastie(mntmp) !== u.ulycn)
                mntmp = PMNAMES.PM_HUMAN; /* Illegal; force newman() */
            else
                mntmp = u.ulycn;
        } else if (target === 'do_vampyr') {
            if (mntmp < LOW_PM || (mons[mntmp].geno & G_UNIQ)) {
                mntmp = (youmonst.data === mons[PMNAMES.PM_VAMPIRE_LEADER]
                         && !rn2(10)) ? PMNAMES.PM_WOLF
                                      : !rn2(4) ? PMNAMES.PM_FOG_CLOUD
                                                : PMNAMES.PM_VAMPIRE_BAT;
                if (ismnum(youmonst.cham)
                    && !is_vampire(youmonst.data) && !rn2(2))
                    mntmp = youmonst.cham;
            }
            if (controllable_poly) {
                buf = `Become ${an(pmname(mons[mntmp], gvariant.v))}?`;
                if (await tty_yn_function(buf, 'yn', 'n', true) !== 'y')
                    return;
            }
        }
        /* if polymon fails, "you feel" message has been given
           so don't follow up with another polymon or newman;
           sex_change_ok left disabled here */
        if (mntmp === PMNAMES.PM_HUMAN)
            await newman(); /* werecritter */
        else
            await polymon(mntmp);
        target = 'made_change'; /* maybe not, but this is right anyway */
    }

    if (target !== 'made_change') {
        if (mntmp < LOW_PM) {
            tryct = 200;
            do {
                /* randomly pick an "ordinary" monster */
                mntmp = rn1(PMNAMES.SPECIAL_PM - LOW_PM, LOW_PM);
                if (polyok(mons[mntmp]) && !is_placeholder(mons[mntmp]))
                    break;
            } while (--tryct > 0);
        }

        /* The below polyok() fails either if everything is genocided, or if
         * we deliberately chose something illegal to force newman().
         */
        game.sex_change_ok = (game.sex_change_ok | 0) + 1;
        if (!polyok(mons[mntmp]) || (!forcecontrol && !rn2(5))
            || your_race(mons[mntmp])) {
            await newman();
        } else {
            await polymon(mntmp);
        }
        game.sex_change_ok--; /* reset */
    }

    /* made_change: */
    new_light = emits_light(youmonst.data);
    if (old_light !== new_light) {
        if (old_light)
            del_light_source(LS_MONSTER, youmonst.m_id);
        if (new_light === 1)
            ++new_light; /* otherwise it's undetectable */
        if (new_light)
            new_light_source(u.ux, u.uy, new_light, LS_MONSTER, youmonst.m_id);
    }
}

// src/polyself.c:735 polymon(); returns 1 if polymorph successful
export async function polymon(mntmp) {
    const u = game.u;
    const youmonst = game.youmonst;
    let buf, ustuckNam;
    const sticking = sticks(youmonst.data) && u.ustuck && !u.uswallow,
          was_blind = !!Blind();
    let dochange = false, was_expelled = false;
    const was_hiding_under = u.uundetected && hides_under(youmonst.data);
    let mlvl, newMaxStr;

    if (game.mvitals[mntmp].mvflags & G_GENOD) { /* allow G_EXTINCT */
        await You_feel(`rather ${
            pmname(mons[mntmp], game.flags.female ? FEMALE : MALE)}-ish.`);
        exercise(A_WIS, true);
        return 0;
    }

    /* KMH, conduct */
    (u.uconduct ||= {});
    u.uconduct.polyselfs = (u.uconduct.polyselfs | 0) + 1;
    if (u.uconduct.polyselfs === 1) /* if (!u.uconduct.polyselfs++) */
        livelog_printf(LL_CONDUCT, `changed form for the first time, becoming ${
            an(pmname(mons[mntmp], game.flags.female ? FEMALE : MALE))}`);

    /* exercise used to be at the very end but only Wis was affected
       there since the polymorph was always in effect by then */
    exercise(A_CON, false);
    exercise(A_WIS, true);

    if (!Upolyd(u)) {
        /* Human to monster; save human stats */
        u.macurr = clone_attr(u.acurr);
        u.mamax = clone_attr(u.amax);
        u.mfemale = !!game.flags.female;
    } else {
        /* Monster to monster; restore human stats, to be
         * immediately changed to provide stats for the new monster
         */
        u.acurr = clone_attr(u.macurr);
        u.amax = clone_attr(u.mamax);
        game.flags.female = !!u.mfemale;
    }

    /* if stuck mimicking gold, stop immediately */
    if (game.multi < 0 && M_AP_TYPE(youmonst) === M_AP_OBJECT
        && youmonst.data.mlet !== MONSYMS.S_MIMIC)
        await unmul('');
    /* if becoming a non-mimic, stop mimicking anything */
    if (mons[mntmp].mlet !== MONSYMS.S_MIMIC) {
        /* as in uunstick, don't run unmul() since it would fail */
        youmonst.m_ap_type = M_AP_NOTHING;
        youmonst.mappearance = 0;
    }
    if (is_male(mons[mntmp])) {
        if (game.flags.female)
            dochange = true;
    } else if (is_female(mons[mntmp])) {
        if (!game.flags.female)
            dochange = true;
    } else if (!is_neuter(mons[mntmp]) && mntmp !== u.ulycn) {
        if (game.sex_change_ok && !rn2(10))
            dochange = true;
    }

    ustuckNam = u.ustuck ? Some_Monnam(u.ustuck) : '';
    buf = (u.umonnum !== mntmp) ? '' : 'new ';
    if (dochange) {
        game.flags.female = !game.flags.female;
        buf += (is_male(mons[mntmp]) || is_female(mons[mntmp]))
               ? '' : game.flags.female ? 'female ' : 'male ';
    }
    buf += pmname(mons[mntmp], game.flags.female ? FEMALE : MALE);
    await You(`${(u.umonnum !== mntmp) ? 'turn into' : 'feel like'} ${an(buf)}!`);

    if (u.uprops?.STONED && poly_when_stoned(mons[mntmp])) {
        /* poly_when_stoned already checked stone golem genocide */
        mntmp = PMNAMES.PM_STONE_GOLEM;
        await make_stoned(0, 'You turn to stone!', 0, null);
    }

    u.mtimedone = rn1(500, 500);
    u.umonnum = mntmp;
    set_uasmon();

    /* New stats for monster, to last only as long as polymorphed.
     * Currently only strength gets changed.
     */
    newMaxStr = uasmon_maxStr();
    if (strongmonst(mons[mntmp])) {
        u.acurr.a[A_STR] = u.amax.a[A_STR] = newMaxStr;
    } else {
        /* if hero is very strong, reduce maximum strength to new limit
           (note: removal is temporary until returning to original form);
           we don't attempt to enforce lower maximum for wimpy forms;
           unlike for strongmonst, current strength does not get set to max */
        u.amax.a[A_STR] = newMaxStr;
        if (u.acurr.a[A_STR] > u.amax.a[A_STR])
            u.acurr.a[A_STR] = u.amax.a[A_STR];
    }

    if (Stone_resistance() && u.uprops?.STONED) { /* parnes@eniac.seas.upenn.edu */
        await make_stoned(0, 'You no longer seem to be petrifying.', 0, null);
    }
    if (Sick_resistance() && u.uprops?.SICK) {
        await make_sick(0, null, false, SICK_ALL);
        await You('no longer feel sick.');
    }
    if (u.uprops?.SLIMED) {
        if (flaming(youmonst.data)) {
            await make_slimed(0, 'The slime burns away!');
        } else if (mntmp === PMNAMES.PM_GREEN_SLIME) {
            /* do it silently */
            await make_slimed(0, null);
        }
    }
    await check_strangling(false); /* maybe stop strangling */
    if (nohands(youmonst.data))
        make_glib(0);

    /*
    mlvl = adj_lev(&mons[mntmp]);
     * We can't do the above, since there's no such thing as an
     * "experience level of you as a monster" for a polymorphed character.
     */
    mlvl = mons[mntmp].mlevel;
    if (youmonst.data.mlet === MONSYMS.S_DRAGON
        && mntmp >= PMNAMES.PM_GRAY_DRAGON) {
        u.mhmax = In_endgame(u.uz) ? (8 * mlvl) : (4 * mlvl + d(mlvl, 4));
    } else if (is_golem(youmonst.data)) {
        u.mhmax = golemhp(mntmp);
    } else {
        if (!mlvl)
            u.mhmax = rnd(4);
        else
            u.mhmax = d(mlvl, 8);
        if (is_home_elemental(mons[mntmp]))
            u.mhmax *= 3;
    }
    u.mh = u.mhmax;

    if (u.ulevel < mlvl) {
        /* Low level characters can't become high level monsters for long */
        u.mtimedone = Math.trunc(u.mtimedone * u.ulevel / mlvl);
    }

    if (u.uskin && mntmp !== armor_to_dragon(u.uskin.otyp))
        await skinback(false);
    await break_armor();
    await drop_weapon(1);
    find_ac(); /* (repeated below) */
    /* hero might have been hiding under an object before polymorphing;
       polymon() has updated the form so hideunder() gets a fresh look,
       but don't auto-hide when not already hiding-under */
    if (was_hiding_under)
        hideunder(youmonst);
    if (u.utrap && u.utraptype === TT_PIT) {
        set_utrap(rn1(6, 2), TT_PIT); /* time to escape resets */
    }
    if (was_blind && !Blind()) { /* previous form was eyeless */
        (u.intrinsic ||= {}).HBlinded = 1; /* set_itimeout(&HBlinded, 1L) */
        u.ublind = 1;
        await make_blinded(0, true); /* remove blindness */
    }
    newsym(u.ux, u.uy); /* Change symbol */

    /* [note:  this 'sticky' handling is only sufficient for changing from
       grabber to engulfer or vice versa because engulfing by poly'd hero
       always ends immediately so won't be in effect during a polymorph;
       the egg type learning is done here rather than at the end so that
       if expels() -> spoteffects() drops hero onto any eggs they'll be
       recognized] */
    if (lays_eggs(youmonst.data)) {
        learn_egg_type(u.umonnum);
        learn_egg_type(egg_type_from_parent(u.umonnum, true));
    }

    if (u.uswallow) {
        let usiz;
        /* engulfer might not be able to keep hero inside */
        if (unsolid(youmonst.data)
            || (usiz = youmonst.data.msize) >= MFLAGS.MZ_HUGE
            || (u.ustuck.data.msize < usiz && !is_whirly(u.ustuck.data))) {
            let expels_mesg = true;

            /* ustuckNam was set with Some_Monnam() which might yield "it"
               even when the engulfer is known; expels() uses Monnam() and
               will say "It" only when hero can't see the engulfer */
            if (unsolid(youmonst.data)) {
                if (canspotmon(u.ustuck)) /* [see below for explanation] */
                    ustuckNam = Monnam(u.ustuck);
                await pline(`${ustuckNam} can no longer contain you.`);
                expels_mesg = false;
            }
            await expels(u.ustuck, u.ustuck.data, expels_mesg);
            was_expelled = true;
            /* [spoteffects() from expels() might kill hero; we should
               return early] */
        }
    } else if (u.ustuck && !sticking /* && !u.uswallow */
               /* if hero was being held and becomes a grabber, or was a
                  grabber and becomes unsolid, hero's hold is lost so
                  release so that hero doesn't automagically start holding
                  it; or, release if no longer capable of being held */
               && (sticks(youmonst.data) || unsolid(youmonst.data))) {
        /* ustuckNam was set with Some_Monnam() which might yield "it"
           when hero can see the holder; override here if hero knows who
           u.ustuck is */
        if (canspotmon(u.ustuck))
            ustuckNam = Monnam(u.ustuck);
        set_ustuck(null);
        await pline(`${ustuckNam} loses its grip on you.`);
    } else if (sticking && !sticks(youmonst.data)) {
        await uunstick();
    }

    if (u.usteed) {
        if (touch_petrifies(u.usteed.data) && !Stone_resistance() && rnl(3)) {
            await pline(`${no_longer_petrify_resistant} touch ${mon_nam(u.usteed)}.`);
            buf = `riding ${an(pmname(u.usteed.data, Mgender(u.usteed)))}`;
            await instapetrify(buf);
        }
        if (!can_ride(u.usteed))
            await dismount_steed(DISMOUNT_POLY);
    }

    find_ac();
    if (((!Levitation() && !u.ustuck && !Flying() && is_pool_or_lava(u.ux, u.uy))
         || (Underwater() && !Swimming()))
        && !was_expelled) {
        await spoteffects(true);
        /* [spoteffects() might kill hero due to drowning; we should
           return early] */
    }
    if (Passes_walls() && u.utrap
        && (u.utraptype === TT_INFLOOR || u.utraptype === TT_BURIEDBALL)) {
        if (u.utraptype === TT_INFLOOR) {
            await pline_The('rock seems to no longer trap you.');
        } else {
            await pline_The('buried ball is no longer bound to you.');
            await buried_ball_to_freedom();
        }
        await reset_utrap(true);
    } else if (likes_lava(youmonst.data) && u.utrap
               && u.utraptype === TT_LAVA) {
        await pline_The(`${hliquid('lava')} now feels soothing.`);
        await reset_utrap(true);
    }
    if (amorphous(youmonst.data) || is_whirly(youmonst.data)
        || unsolid(youmonst.data)) {
        if (Punished()) {
            await You('slip out of the iron chain.');
            unpunish();
        } else if (u.utrap && u.utraptype === TT_BURIEDBALL) {
            await You('slip free of the buried ball and chain.');
            await buried_ball_to_freedom();
        }
    }
    if (u.utrap && (u.utraptype === TT_WEB || u.utraptype === TT_BEARTRAP)
        && (amorphous(youmonst.data) || is_whirly(youmonst.data)
            || unsolid(youmonst.data)
            || (youmonst.data.msize <= MFLAGS.MZ_SMALL
                && u.utraptype === TT_BEARTRAP))) {
        await You(`are no longer stuck in the ${
            u.utraptype === TT_WEB ? 'web' : 'bear trap'}.`);
        /* probably should burn webs too if PM_FIRE_ELEMENTAL */
        await reset_utrap(true);
    }
    if (webmaker(youmonst.data) && u.utrap && u.utraptype === TT_WEB) {
        await You('orient yourself on the web.');
        await reset_utrap(true);
    }
    await check_strangling(true); /* maybe start strangling */

    (game.disp ||= {}).botl = true;
    game.vision_full_recalc = 1;
    see_monsters();
    await encumber_msg();

    await retouch_equipment(2);
    /* this might trigger a recursive call to polymon() [stone golem
       wielding cockatrice corpse and hit by stone-to-flesh, becomes
       flesh golem above, now gets transformed back into stone golem;
       fortunately neither form uses #monster] */
    if (!u.uarmg)
        await selftouch(no_longer_petrify_resistant);

    /* this is a bit of a hack; it comes last because it involves
       possible fatalities above and it isn't useful unless hero survives */
    if (game.flags.verbose) {
        const use_thec = (cmd, what) => pline(`Use the command #${cmd} to ${what}.`);
        const monsterc = 'monster';
        const uptr = youmonst.data;
        const might_hide = (is_hider(uptr) || hides_under(uptr));

        if (can_breathe(uptr))
            await use_thec(monsterc, 'use your breath weapon');
        if (attacktype(uptr, ATTKS.AT_SPIT))
            await use_thec(monsterc, 'spit venom');
        if (uptr.mlet === MONSYMS.S_NYMPH)
            await use_thec(monsterc, 'remove an iron ball');
        if (attacktype(uptr, ATTKS.AT_GAZE))
            await use_thec(monsterc, 'gaze at monsters');
        if (might_hide && webmaker(uptr))
            await use_thec(monsterc, 'hide or to spin a web');
        else if (might_hide)
            await use_thec(monsterc, 'hide');
        else if (webmaker(uptr))
            await use_thec(monsterc, 'spin a web');
        if (is_were(uptr))
            await use_thec(monsterc, 'summon help');
        if (u.umonnum === PMNAMES.PM_GREMLIN)
            await use_thec(monsterc, 'multiply in a fountain');
        if (is_unicorn(uptr))
            await use_thec(monsterc, 'use your horn');
        if (is_mind_flayer(uptr))
            await use_thec(monsterc, 'emit a mental blast');
        if (uptr.msound === MSOUND.MS_SHRIEK) /* worthless, actually */
            await use_thec(monsterc, 'shriek');
        if (is_vampire(uptr) || is_vampshifter(youmonst))
            await use_thec(monsterc, 'change shape');

        if (lays_eggs(uptr) && game.flags.female
            && !(uptr === mons[PMNAMES.PM_GIANT_EEL]
                 || uptr === mons[PMNAMES.PM_ELECTRIC_EEL]))
            await use_thec('sit',
                           eggs_in_water(uptr) ? 'spawn in the water' : 'lay an egg');
    }
    return 1;
}

// src/polyself.c:1077 uasmon_maxStr(); hero poly'd into M2_STRONG monster
// usually gets 18/100 strength but there are exceptions; non-M2_STRONG get
// maximum strength set to 18
export function uasmon_maxStr() {
    let newMaxStr;
    let mndx = game.u.umonnum;
    const ptr = mons[mndx];

    if (is_orc(ptr)) {
        if (mndx !== PMNAMES.PM_URUK_HAI && mndx !== PMNAMES.PM_ORC_CAPTAIN)
            mndx = PMNAMES.PM_ORC;
    } else if (is_elf(ptr)) {
        mndx = PMNAMES.PM_ELF;
    } else if (is_dwarf(ptr)) {
        mndx = PMNAMES.PM_DWARF;
    } else if (is_gnome(ptr)) {
        mndx = PMNAMES.PM_GNOME;
    }
    const R = character_race(mndx);

    if (strongmonst(ptr)) {
        /* ettins, titans and minotaurs don't have MZ_HUMAN, so don't
           use the giant limit for them; giant mummies and giant zombies
           do but we throttle those */
        const live_H = is_giant(ptr) && !is_undead(ptr);

        /* hero orcs are limited to 18/50 for maximum strength, so treat
           hero poly'd into an orc the same; goblins, orc shamans, and orc
           zombies don't have strongmonst() attribute so won't get here;
           hobgoblins and orc mummies do get here and are limited to 18/50
           like normal orcs; however, orc captains and Uruk-hai retain 18/100
           strength; hero gnomes are also limited to 18/50; hero elves are
           limited to 18/00 regardless of whether they're strongmonst, but
           the two strongmonst types (monarchs and nobles) have current
           strength set to 18 [by polymon()], the others don't */
        newMaxStr = R ? R.attrmax[A_STR] : live_H ? STR19(19) : STR18(100);
    } else {
        newMaxStr = R ? R.attrmax[A_STR] : 18; /* 18 is same as STR18(0) */
    }
    return newMaxStr;
}

// src/polyself.c:1123 dropp(); dropx() jacket for break_armor()
async function dropp(obj) {
    /*
     * Dropping worn armor while polymorphing might put hero into water
     * (loss of levitation boots or water walking boots that the new
     * form can't wear), where emergency_disrobe() could remove it from
     * inventory.  Without this, dropx() could trigger an 'object lost'
     * panic.  Right now, boots are the only armor which might encounter
     * this situation, but handle it for all armor.
     *
     * Hypothetically, 'obj' could have merged with something (not
     * applicable for armor) and no longer be a valid pointer, so scan
     * inventory for it instead of trusting obj->where.
     */
    for (const otmp of (game.invent || [])) {
        if (otmp === obj) {
            await dropx(obj);
            break;
        }
    }
}

// src/polyself.c:1157 break_armor()
async function break_armor() {
    const u = game.u;
    const youmonst = game.youmonst;
    let otmp;
    const uptr = youmonst.data;

    if (breakarm(uptr)) {
        if ((otmp = u.uarm) != null) {
            if (donning(otmp))
                cancel_don();
            /* for gold DSM, we don't want Armor_gone() to report that it
               stops shining _after_ we've been told that it is destroyed */
            if (otmp.lamplit)
                await end_burn(otmp, false);
            await You('break out of your armor!');
            exercise(A_STR, false);
            await Armor_gone();
            useup(otmp);
        }
        if ((otmp = u.uarmc) != null
            && (otmp.otyp !== ONAMES.MUMMY_WRAPPING || !WrappingAllowed(uptr))) {
            if (otmp.otyp === ONAMES.MUMMY_WRAPPING) {
                await Your(`${cloak_simple_name(otmp)} tears apart!`);
                await Cloak_off(otmp);
                useup(otmp);
            } else if (otmp.otyp === ONAMES.ALCHEMY_SMOCK) {
                await pline_The(`knot on your ${cloak_simple_name(otmp)} is pulled apart!`);
                await Cloak_off(otmp);
                await dropp(otmp);
            } else {
                await pline_The(`clasp on your ${cloak_simple_name(otmp)} breaks open!`);
                await Cloak_off(otmp);
                await dropp(otmp);
            }
        }
        if (u.uarmu) {
            await Your('shirt rips to shreds!');
            useup(u.uarmu);
        }
    } else if (sliparm(uptr)) {
        if ((otmp = u.uarm) != null && racial_exception(youmonst, otmp) < 1) {
            if (donning(otmp))
                cancel_don();
            await Your('armor falls around you!');
            /* [this used to be dropx(otmp) in polymon() which
               could force fire resisting armor back on if hero burned in
               hell (3.0, predating Gehennom); the armor isn't actually
               gone here but also isn't available to be put back on] */
            await Armor_gone();
            await dropp(otmp);
        }
        if ((otmp = u.uarmc) != null
            && (otmp.otyp !== ONAMES.MUMMY_WRAPPING || !WrappingAllowed(uptr))) {
            if (is_whirly(uptr))
                await Your(`${cloak_simple_name(otmp)} falls, unsupported!`);
            else
                await You(`shrink out of your ${cloak_simple_name(otmp)}!`);
            await Cloak_off(otmp);
            await dropp(otmp);
        }
        if ((otmp = u.uarmu) != null) {
            if (is_whirly(uptr))
                await You('seep right through your shirt!');
            else
                await You('become much too small for your shirt!');
            setworn(null, otmp.owornmask & W_ARMU);
            await dropp(otmp);
        }
    }
    if (has_horns(uptr)) {
        if ((otmp = u.uarmh) != null) {
            if (is_flimsy(otmp) && !donning(otmp)) {
                /* Future possibilities: This could damage/destroy helmet */
                const hornbuf = `horn${plur(num_horns(uptr))}`;
                await Your(`${hornbuf} ${vtense(hornbuf, 'pierce')} through ${yname(otmp)}.`);
            } else {
                if (donning(otmp))
                    cancel_don();
                await Your(`${helm_simple_name(otmp)} falls to the ${surface(u.ux, u.uy)}!`);
                await Helmet_off(otmp);
                await dropp(otmp);
            }
        }
    }
    if (nohands(uptr) || verysmall(uptr)) {
        if ((otmp = u.uarmg) != null) {
            if (donning(otmp))
                cancel_don();
            /* Drop weapon along with gloves */
            await You(`drop your gloves${u.uwep ? ' and weapon' : ''}!`);
            await drop_weapon(0);
            await Gloves_off(otmp);
            await dropp(otmp);
        }
        if ((otmp = u.uarms) != null) {
            await You('can no longer hold your shield!');
            await Shield_off();
            await dropp(otmp);
        }
        if ((otmp = u.uarmh) != null) {
            if (donning(otmp))
                cancel_don();
            await Your(`${helm_simple_name(otmp)} falls to the ${surface(u.ux, u.uy)}!`);
            await Helmet_off(otmp);
            await dropp(otmp);
        }
    }
    if (nohands(uptr) || verysmall(uptr)
        || slithy(uptr) || uptr.mlet === MONSYMS.S_CENTAUR) {
        if ((otmp = u.uarmf) != null) {
            if (donning(otmp))
                cancel_don();
            if (is_whirly(uptr))
                await Your('boots fall away!');
            else
                await Your(`boots ${verysmall(uptr) ? 'slide' : 'are pushed'} off your feet!`);
            await Boots_off(otmp);
            await dropp(otmp);
        }
    }
    /* not armor, but eyewear shouldn't stay worn without a head to wear
       it/them on (should also come off if head is too tiny or too huge,
       but putting accessories on doesn't reject those cases [yet?]);
       amulet stays worn */
    if ((otmp = u.ublindf) != null && !has_head(uptr)) {
        let eyewear = simpleonames(otmp); /* blindfold|towel|lenses */

        if (eyewear.startsWith('pair of ')) /* lenses */
            eyewear = eyewear.slice(8);
        await Your(`${eyewear} ${vtense(eyewear, 'fall')} off!`);
        await Blindf_off(null); /* Null: skip usual off mesg */
        await dropp(otmp);
    }
}

// src/polyself.c:1305 drop_weapon()
async function drop_weapon(alone) {
    const u = game.u;
    let otmp;
    let what, which, whichtoo;
    let candropwep, candropswapwep, updateinv = true;

    if (u.uwep) {
        /* !alone check below is currently redundant but be paranoid */
        if (!alone || cantwield(game.youmonst.data)) {
            candropwep = canletgo(u.uwep, '');
            candropswapwep = !u.twoweap || canletgo(u.uswapwep, '');
            if (alone) {
                what = (candropwep && candropswapwep) ? 'drop' : 'release';
                which = is_sword(u.uwep) ? 'sword' : weapon_descr(u.uwep);
                if (u.twoweap) {
                    whichtoo =
                        is_sword(u.uswapwep) ? 'sword' : weapon_descr(u.uswapwep);
                    if (which !== whichtoo)
                        which = 'weapon';
                }
                if (u.uwep.quan !== 1 || u.twoweap)
                    which = makeplural(which);

                await You(`find you must ${what} ${
                    the_your[which.startsWith('corpse') ? 0 : 1]} ${which}!`);
            }
            /* if either uwep or wielded uswapwep is flagged as 'in_use'
               then don't drop it or explicitly update inventory; leave
               those actions to caller (or caller's caller, &c) */
            if (u.twoweap) {
                otmp = u.uswapwep;
                uswapwepgone();
                if (otmp.in_use)
                    updateinv = false;
                else if (candropswapwep)
                    await dropx(otmp);
            }
            otmp = u.uwep;
            await uwepgone();
            if (otmp.in_use)
                updateinv = false;
            else if (candropwep)
                await dropx(otmp);
            /* [note: dropp vs dropx -- if heart of ahriman is wielded, we
               might be losing levitation by dropping it; but that won't
               happen until the drop, unlike Boots_off() dumping hero into
               water and triggering emergency_disrobe() before dropx()] */

            if (updateinv)
                update_inventory();
        } else if (!could_twoweap(game.youmonst.data)) {
            untwoweapon();
        }
    }
}

// src/polyself.c:1367 rehumanize(); return to original form, either
// because of a polymorph timeout or dying from loss of hit points while
// being polymorphed
export async function rehumanize() {
    const u = game.u;
    const youmonst = game.youmonst;
    const was_flying = (Flying() !== false);

    /*
     * You can't revert back while unchanging.
     * This may prevent the player from opting to submit to
     * being petrified, drowned, &c, which would be far less
     * lethal than dying while stuck in creature form.
     */
    if (Unchanging()) {
        if (u.mh < 1) {
            game.killer.format = NO_KILLER_PREFIX;
            game.killer.name = 'killed while stuck in creature form';
            await done(DIED);
            /* the death will have been handled as a lifesave in wizard
               mode; since we're wearing an amulet of unchanging we can't
               be wearing an amulet of life-saving */
            return; /* don't rehumanize after all */
        } else if (u.uamul && u.uamul.otyp === ONAMES.AMULET_OF_UNCHANGING) {
            await Your(`${simpleonames(u.uamul)} ${otense(u.uamul, 'fail')}!`);
            observe_object(u.uamul);
            makeknown(ONAMES.AMULET_OF_UNCHANGING);
        }
    }

    if (emits_light(youmonst.data))
        del_light_source(LS_MONSTER, youmonst.m_id);
    await polyman('You return to %s form!', game.urace.adj);

    if (u.uhp < 1) {
        /* can only happen if some bit of code reduces u.uhp
           instead of u.mh while poly'd */
        await Your('old form was not healthy enough to survive.');
        game.killer.name = `reverting to unhealthy ${game.urace.adj} form`;
        game.killer.format = KILLED_BY;
        await done(DIED);
    }
    nomul(0);

    (game.disp ||= {}).botl = true;
    game.vision_full_recalc = 1;
    await encumber_msg();
    update_inventory();
    if (was_flying && !Flying() && u.usteed)
        await You(`and ${mon_nam(u.usteed)} return gently to the ${
            surface(u.ux, u.uy)}.`);
    await retouch_equipment(2);
    if (!u.uarmg)
        await selftouch(no_longer_petrify_resistant);
}

// src/polyself.c:1421 dobreathe()
export async function dobreathe() {
    const u = game.u;
    let mattk;

    if (Strangled()) {
        await You_cant('breathe.  Sorry.');
        return ECMD_OK;
    }
    if (u.uen < 15) {
        await You("don't have enough energy to breathe!");
        return ECMD_OK;
    }
    u.uen -= 15;
    (game.disp ||= {}).botl = true;

    if (!await getdir(null))
        return ECMD_CANCEL;

    mattk = attacktype_fordmg(game.youmonst.data, ATTKS.AT_BREA, ATTKS.AD_ANY);
    if (!mattk)
        throw new Error('bad breath attack?'); /* impossible(): mouthwash needed... */
    else if (!u.dx && !u.dy && !u.dz)
        await ubreatheu(mattk);
    else
        await ubuzz(BZ_U_BREATH(BZ_OFS_AD(mattk[1])), mattk[2]);
    return ECMD_TIME;
}

// src/polyself.c:1450 dospit()
export async function dospit() {
    let otmp;
    let mattk;

    if (!await getdir(null))
        return ECMD_CANCEL;
    mattk = attacktype_fordmg(game.youmonst.data, ATTKS.AT_SPIT, ATTKS.AD_ANY);
    if (!mattk) {
        throw new Error('bad spit attack?'); /* impossible() */
    } else {
        switch (mattk[1]) {
        case ATTKS.AD_BLND:
        case ATTKS.AD_DRST:
            otmp = mksobj(ONAMES.BLINDING_VENOM, true, false);
            break;
        default:
            throw new Error('bad attack type in dospit'); /* impossible() */
            /* FALLTHROUGH */
        case ATTKS.AD_ACID:
            otmp = mksobj(ONAMES.ACID_VENOM, true, false);
            break;
        }
        otmp.spe = 1; /* to indicate it's yours */
        await throwit(otmp, 0);
    }
    return ECMD_TIME;
}

// src/polyself.c:1481 doremove()
export async function doremove() {
    const u = game.u;
    if (!Punished()) {
        if (u.utrap && u.utraptype === TT_BURIEDBALL) {
            await pline_The(`ball and chain are buried firmly in the ${
                surface(u.ux, u.uy)}.`);
            return ECMD_OK;
        }
        await You('are not chained to anything!');
        return ECMD_OK;
    }
    unpunish();
    return ECMD_TIME;
}

// src/polyself.c:1497 dospinweb()
export async function dospinweb() {
    const u = game.u;
    const x = u.ux, y = u.uy;
    let ttmp = t_at(x, y);
    const reject_terrain = is_pool_or_lava(x, y) || IS_AIR(game.level.at(x, y).typ);

    /* [at the time this was written, it was not possible to be both a
       webmaker and a flyer, but with the advent of amulet of flying that
       became a possibility; at present hero can spin a web while flying] */
    if (Levitation() || reject_terrain) {
        You(`must be on ${reject_terrain ? 'solid' : 'the'} ground to spin a web.`);
        return ECMD_OK;
    }
    if (u.uswallow) {
        await You(`release web fluid inside ${mon_nam(u.ustuck)}.`);
        if (is_animal(u.ustuck.data)) {
            await expels(u.ustuck, u.ustuck.data, true);
            return ECMD_OK;
        }
        if (is_whirly(u.ustuck.data)) {
            let i;

            for (i = 0; i < NATTK; i++)
                if (u.ustuck.data.mattk[i][0] === ATTKS.AT_ENGL)
                    break;
            if (i === NATTK)
                throw new Error('Swallower has no engulfing attack?'); /* impossible() */
            else {
                let sweep = '';

                switch (u.ustuck.data.mattk[i][1]) {
                case ATTKS.AD_FIRE:
                    sweep = 'ignites and ';
                    break;
                case ATTKS.AD_ELEC:
                    sweep = 'fries and ';
                    break;
                case ATTKS.AD_COLD:
                    sweep = 'freezes, shatters and ';
                    break;
                }
                await pline_The(`web ${sweep}is swept away!`);
            }
            return ECMD_OK;
        } /* default: a nasty jelly-like creature */
        await pline_The(`web dissolves into ${mon_nam(u.ustuck)}.`);
        return ECMD_OK;
    }
    if (u.utrap) {
        await You('cannot spin webs while stuck in a trap.');
        return ECMD_OK;
    }
    exercise(A_DEX, true);
    if (ttmp) {
        switch (ttmp.ttyp) {
        case PIT:
        case SPIKED_PIT:
            await You('spin a web, covering up the pit.');
            deltrap(ttmp);
            await bury_objs(x, y);
            newsym(x, y);
            return ECMD_TIME;
        case SQKY_BOARD:
            await pline_The('squeaky board is muffled.');
            deltrap(ttmp);
            newsym(x, y);
            return ECMD_TIME;
        case TELEP_TRAP:
        case LEVEL_TELEP:
        case MAGIC_PORTAL:
        case VIBRATING_SQUARE:
            await Your('webbing vanishes!');
            return ECMD_OK;
        case WEB:
            await You('make the web thicker.');
            return ECMD_TIME;
        case HOLE:
        case TRAPDOOR:
            await You(`web over the ${(ttmp.ttyp === TRAPDOOR) ? 'trap door' : 'hole'}.`);
            deltrap(ttmp);
            newsym(x, y);
            return ECMD_TIME;
        case ROLLING_BOULDER_TRAP:
            await You('spin a web, jamming the trigger.');
            deltrap(ttmp);
            newsym(x, y);
            return ECMD_TIME;
        case ARROW_TRAP:
        case DART_TRAP:
        case BEAR_TRAP:
        case ROCKTRAP:
        case FIRE_TRAP:
        case LANDMINE:
        case SLP_GAS_TRAP:
        case RUST_TRAP:
        case MAGIC_TRAP:
        case ANTI_MAGIC:
        case POLY_TRAP:
            await You('have triggered a trap!');
            await dotrap(ttmp, NO_TRAP_FLAGS);
            return ECMD_TIME;
        default:
            throw new Error(`Webbing over trap type ${ttmp.ttyp}?`); /* impossible() */
        }
    } else if (On_stairs(x, y)) {
        /* cop out: don't let them hide the stairs */
        await Your(`web fails to impede access to the ${
            (game.level.at(x, y).typ === STAIRS) ? 'stairs' : 'ladder'}.`);
        return ECMD_TIME;
    }
    ttmp = maketrap(x, y, WEB);
    if (ttmp) {
        await You('spin a web.');
        ttmp.madeby_u = 1;
        feeltrap(ttmp);
        if (in_rooms(x, y, SHOPBASE))
            add_damage(x, y, SHOP_WEB_COST);
    }
    return ECMD_TIME;
}

// src/polyself.c:1624 dosummon()
export async function dosummon() {
    const u = game.u;
    if (u.uen < 10) {
        await You('lack the energy to send forth a call for help!');
        return ECMD_OK;
    }
    u.uen -= 10;
    (game.disp ||= {}).botl = true;

    await You('call upon your brethren for help!');
    exercise(A_WIS, true);
    if (!(await were_summon(game.youmonst.data, true)).total)
        await pline('But none arrive.');
    return ECMD_TIME;
}

// src/polyself.c:1642 dogaze()
export async function dogaze() {
    const u = game.u;
    let looked = 0;
    let qbuf;
    let i;
    let adtyp = 0;

    for (i = 0; i < NATTK; i++) {
        if (game.youmonst.data.mattk[i][0] === ATTKS.AT_GAZE) {
            adtyp = game.youmonst.data.mattk[i][1];
            break;
        }
    }
    if (adtyp !== ATTKS.AD_CONF && adtyp !== ATTKS.AD_FIRE) {
        /* impossible("gaze attack %d?", adtyp) */
        return ECMD_OK;
    }

    if (Blind()) {
        await You_cant('see anything to gaze at.');
        return ECMD_OK;
    } else if (Hallucination()) {
        await You_cant('gaze at anything you can see.');
        return ECMD_OK;
    }
    if (u.uen < 15) {
        await You('lack the energy to use your special gaze!');
        return ECMD_OK;
    }
    u.uen -= 15;
    (game.disp ||= {}).botl = true;

    for (const mtmp of [...(game.level.monsters || [])]) {
        if (DEADMONSTER(mtmp))
            continue;
        if (canseemon(mtmp) && couldsee(mtmp.mx, mtmp.my)) {
            looked++;
            if (Invis() && !perceives(mtmp.data)) {
                await pline(`${Monnam(mtmp)} seems not to notice your gaze.`);
            } else if (mtmp.minvis && !See_invisible()) {
                await You_cant(`see where to gaze at ${Monnam(mtmp)}.`);
            } else if (M_AP_TYPE(mtmp) === M_AP_FURNITURE
                       || M_AP_TYPE(mtmp) === M_AP_OBJECT) {
                looked--;
                continue;
            } else if (game.flags.safe_dog !== false && mtmp.mtame && !Confusion()) {
                await You(`avoid gazing at ${y_monnam(mtmp)}.`);
            } else {
                if (game.flags.confirm !== false && mtmp.mpeaceful && !Confusion()) {
                    qbuf = `Really ${(adtyp === ATTKS.AD_CONF) ? 'confuse' : 'attack'} ${
                        mon_nam(mtmp)}?`;
                    if (await tty_yn_function(qbuf, 'yn', 'n', true) !== 'y')
                        continue;
                }
                await setmangry(mtmp, true);
                if (helpless(mtmp) || mtmp.mstun
                    || !mtmp.mcansee || !haseyes(mtmp.data)) {
                    looked--;
                    continue;
                }
                /* No reflection check for consistency with when a monster
                 * gazes at *you*--only medusa gaze gets reflected then.
                 */
                if (adtyp === ATTKS.AD_CONF) {
                    if (!mtmp.mconf)
                        await Your(`gaze confuses ${mon_nam(mtmp)}!`);
                    else
                        await pline(`${Monnam(mtmp)} is getting more and more confused.`);
                    mtmp.mconf = 1;
                } else if (adtyp === ATTKS.AD_FIRE) {
                    let dmg = d(2, 6);
                    const orig_dmg = dmg, lev = u.ulevel;

                    await You(`attack ${mon_nam(mtmp)} with a fiery gaze!`);
                    if (resists_fire(mtmp)) {
                        await pline_The(`fire doesn't burn ${mon_nam(mtmp)}!`);
                        dmg = 0;
                    }
                    if (lev > rn2(20)) {
                        dmg += await destroy_items(mtmp, ATTKS.AD_FIRE, orig_dmg);
                        await ignite_items(mtmp.minvent);
                    }
                    if (dmg)
                        mtmp.mhp -= dmg;
                    if (DEADMONSTER(mtmp))
                        await killed(mtmp);
                }
                /* For consistency with passive() in uhitm.c, this only
                 * affects you if the monster is still alive.
                 */
                if (DEADMONSTER(mtmp))
                    continue;

                if (mtmp.data === mons[PMNAMES.PM_FLOATING_EYE] && !mtmp.mcan) {
                    if (!Free_action()) {
                        await You(`are frozen by ${s_suffix(mon_nam(mtmp))} gaze!`);
                        nomul((u.ulevel > 6 || rn2(4))
                                  ? -d(mtmp.m_lev + 1, mtmp.data.mattk[0][3])
                                  : -200);
                        game.multi_reason = "frozen by a monster's gaze";
                        game.nomovemsg = null;
                        return ECMD_TIME;
                    } else
                        await You(`stiffen momentarily under ${s_suffix(mon_nam(mtmp))} gaze.`);
                }
                /* Technically this one shouldn't affect you at all because
                 * the Medusa gaze is an active monster attack that only
                 * works on the monster's turn, but for it to *not* have an
                 * effect would be too weird.
                 */
                if (mtmp.data === mons[PMNAMES.PM_MEDUSA] && !mtmp.mcan) {
                    await pline(`Gazing at the awake ${l_monnam(mtmp)} is not a very good idea.`);
                    /* as if gazing at a sleeping anything is fruitful... */
                    await urgent_pline('You turn to stone...');
                    game.killer.format = KILLED_BY;
                    game.killer.name = "deliberately meeting Medusa's gaze";
                    await done(STONING);
                }
            }
        }
    }
    if (!looked)
        await You('gaze at no place in particular.');
    return ECMD_TIME;
}

// src/polyself.c:1777 dohide()
export async function dohide() {
    const u = game.u;
    const youmonst = game.youmonst;
    const ismimic = youmonst.data.mlet === MONSYMS.S_MIMIC,
          on_ceiling = is_clinger(youmonst.data) || Flying();

    /* can't hide while being held (or holding) or while trapped
       (except for floor hiders [trapper or mimic] in pits) */
    if (u.ustuck || (u.utrap && (u.utraptype !== TT_PIT || on_ceiling))) {
        await You_cant(`hide while you're ${
            !u.ustuck ? 'trapped'
              : u.uswallow ? (digests(u.ustuck.data) ? 'swallowed' : 'engulfed')
                : !sticks(youmonst.data) ? 'being held'
                  : (humanoid(u.ustuck.data) ? 'holding someone'
                                             : 'holding that creature')}.`);
        if (u.uundetected || (ismimic && M_AP_TYPE(youmonst) !== M_AP_NOTHING)) {
            u.uundetected = 0;
            youmonst.m_ap_type = M_AP_NOTHING;
            newsym(u.ux, u.uy);
        }
        return ECMD_OK;
    }
    /* note: the eel and hides_under cases are hypothetical;
       such critters aren't offered the option of hiding via #monster */
    if (youmonst.data.mlet === MONSYMS.S_EEL && !is_pool(u.ux, u.uy)) {
        if (IS_FOUNTAIN(game.level.at(u.ux, u.uy).typ))
            await pline_The('fountain is not deep enough to hide in.');
        else
            await There(`is no ${hliquid('water')} to hide in here.`);
        u.uundetected = 0;
        return ECMD_OK;
    }
    if (hides_under(youmonst.data)) {
        let ct = 0;
        const pile = (game.level.objects || []).filter(
            (o) => o.ox === u.ux && o.oy === u.uy);
        const otop = pile[0] || null;
        let otmp = null;

        if (!otop) {
            await There('is nothing to hide under here.');
            u.uundetected = 0;
            return ECMD_OK;
        }
        let k;
        for (k = 0; k < pile.length; k++) {
            otmp = pile[k];
            if (!(otmp.otyp === ONAMES.CORPSE
                  && touch_petrifies(mons[otmp.corpsenm])))
                break;
            ct += otmp.quan;
        }
        if (k >= pile.length)
            otmp = null;
        if (!otmp && !Stone_resistance()) {
            let corpse_name = cxname(otop);

            /* pile is entirely composed of petrifying corpses; the
               message and death reason say "cockatrice corpses" or
               "chickatrice corpses" depending on the top of the pile
               even if both types are present */
            if (ct === 1)
                corpse_name = an(corpse_name);
            /* [note: stone golems and hero poly'd into a golem
               turn into stone golems instead of becoming petrified] */
            await pline(`Hiding under ${corpse_name}${plur(ct)} is a fatal mistake...`);
            const kbuf = `hiding under ${corpse_name}${plur(ct)}`;
            await instapetrify(kbuf);
            u.uundetected = 0;
            return ECMD_TIME;
        }
    }
    if (on_ceiling && !has_ceiling(u.uz)) {
        await There('is nowhere to hide above you.');
        u.uundetected = 0;
        return ECMD_OK;
    }
    if ((is_hider(youmonst.data) && !Flying()) /* floor hider */
        && (Is_airlevel(u.uz) || Is_waterlevel(u.uz))) {
        await There('is nowhere to hide beneath you.');
        u.uundetected = 0;
        return ECMD_OK;
    }
    /* Planes of Air and Water */
    if (u.uundetected || (ismimic && M_AP_TYPE(youmonst) !== M_AP_NOTHING)) {
        await youhiding(false, 1); /* "you are already hiding" */
        return ECMD_OK;
    }
    if (ismimic) {
        youmonst.m_ap_type = M_AP_OBJECT;
        youmonst.mappearance = ONAMES.STRANGE_OBJECT;
    } else
        u.uundetected = 1;
    newsym(u.ux, u.uy);
    await youhiding(false, 0); /* "you are now hiding" */
    return ECMD_TIME;
}

// src/polyself.c:1877 dopoly()
export async function dopoly() {
    const youmonst = game.youmonst;
    const savedat = youmonst.data;

    if (is_vampire(youmonst.data) || is_vampshifter(youmonst)) {
        await polyself(POLY_MONSTER);
        if (savedat !== youmonst.data) {
            await You(`transform into ${an(pmname(youmonst.data, Ugender()))}.`);
            newsym(game.u.ux, game.u.uy);
        }
    }
    return ECMD_TIME;
}

// src/polyself.c:1894 domindblast()
export async function domindblast() {
    const u = game.u;
    let dmg;

    if (u.uen < 10) {
        await You('concentrate but lack the energy to maintain doing so.');
        return ECMD_OK;
    }
    u.uen -= 10;
    (game.disp ||= {}).botl = true;

    await You('concentrate.');
    await pline('A wave of psychic energy pours out.');
    for (const mtmp of [...(game.level.monsters || [])]) {
        let u_sen;

        if (DEADMONSTER(mtmp))
            continue;
        if (mdistu(mtmp) > BOLT_LIM * BOLT_LIM)
            continue;
        if (mtmp.mpeaceful)
            continue;
        if (mindless(mtmp.data))
            continue;
        u_sen = telepathic(mtmp.data) && !mtmp.mcansee;
        if (u_sen || (telepathic(mtmp.data) && rn2(2)) || !rn2(10)) {
            dmg = rnd(15);
            /* wake it up first, to bring hidden monster out of hiding;
               but in case it is currently peaceful, don't make it hostile
               unless it will survive the psychic blast, otherwise hero
               would avoid the penalty for killing it while peaceful */
            await wakeup(mtmp, (dmg > mtmp.mhp) ? true : false);
            await You(`lock in on ${s_suffix(mon_nam(mtmp))} ${
                u_sen ? 'telepathy'
                : telepathic(mtmp.data) ? 'latent telepathy'
                  : 'mind'}.`);
            mtmp.mhp -= dmg;
            if (DEADMONSTER(mtmp))
                await killed(mtmp);
        }
    }
    return ECMD_TIME;
}

// src/polyself.c:1941 uunstick()
export async function uunstick() {
    const mtmp = game.u.ustuck;

    if (!mtmp) {
        /* impossible("uunstick: no ustuck?") */
        return;
    }
    set_ustuck(null); /* before pline() */
    await pline(`${Monnam(mtmp)} is no longer in your clutches.`);
}

// src/polyself.c:1954 skinback()
export async function skinback(silently) {
    const u = game.u;
    if (u.uskin) {
        const old_light = arti_light_radius(u.uskin);

        if (!silently)
            await Your('skin returns to its original form.');
        u.uarm = u.uskin;
        u.uskin = null;
        /* undo save/restore hack */
        u.uarm.owornmask &= ~I_SPECIAL;
        if (artifact_light(u.uarm))
            await maybe_adjust_light(u.uarm, old_light);
    }
}

// src/polyself.c:2191 armor_to_dragon()
export function armor_to_dragon(atyp) {
    switch (atyp) {
    case ONAMES.GRAY_DRAGON_SCALE_MAIL:
    case ONAMES.GRAY_DRAGON_SCALES:
        return PMNAMES.PM_GRAY_DRAGON;
    case ONAMES.SILVER_DRAGON_SCALE_MAIL:
    case ONAMES.SILVER_DRAGON_SCALES:
        return PMNAMES.PM_SILVER_DRAGON;
    case ONAMES.GOLD_DRAGON_SCALE_MAIL:
    case ONAMES.GOLD_DRAGON_SCALES:
        return PMNAMES.PM_GOLD_DRAGON;
    /* [SHIMMERING_DRAGON is deferred in the C too] */
    case ONAMES.RED_DRAGON_SCALE_MAIL:
    case ONAMES.RED_DRAGON_SCALES:
        return PMNAMES.PM_RED_DRAGON;
    case ONAMES.ORANGE_DRAGON_SCALE_MAIL:
    case ONAMES.ORANGE_DRAGON_SCALES:
        return PMNAMES.PM_ORANGE_DRAGON;
    case ONAMES.WHITE_DRAGON_SCALE_MAIL:
    case ONAMES.WHITE_DRAGON_SCALES:
        return PMNAMES.PM_WHITE_DRAGON;
    case ONAMES.BLACK_DRAGON_SCALE_MAIL:
    case ONAMES.BLACK_DRAGON_SCALES:
        return PMNAMES.PM_BLACK_DRAGON;
    case ONAMES.BLUE_DRAGON_SCALE_MAIL:
    case ONAMES.BLUE_DRAGON_SCALES:
        return PMNAMES.PM_BLUE_DRAGON;
    case ONAMES.GREEN_DRAGON_SCALE_MAIL:
    case ONAMES.GREEN_DRAGON_SCALES:
        return PMNAMES.PM_GREEN_DRAGON;
    case ONAMES.YELLOW_DRAGON_SCALE_MAIL:
    case ONAMES.YELLOW_DRAGON_SCALES:
        return PMNAMES.PM_YELLOW_DRAGON;
    default:
        return NON_PM;
    }
}

// src/polyself.c:2236 polysense(); some species have awareness of other
// species
function polysense() {
    const u = game.u;
    let warnidx = NON_PM;
    const warntype = ((game.context ||= {}).warntype ||= {});
    const intr = (u.intrinsic ||= {});

    warntype.speciesidx = NON_PM;
    warntype.species = null;
    warntype.polyd = 0;
    intr.HWarn_of_mon = (intr.HWarn_of_mon || 0) & ~FROMRACE;

    switch (u.umonnum) {
    case PMNAMES.PM_PURPLE_WORM:
    case PMNAMES.PM_BABY_PURPLE_WORM:
        warnidx = PMNAMES.PM_SHRIEKER;
        break;
    case PMNAMES.PM_VAMPIRE:
    case PMNAMES.PM_VAMPIRE_LEADER:
        warntype.polyd = MFLAGS.M2_HUMAN | MFLAGS.M2_ELF;
        intr.HWarn_of_mon |= FROMRACE;
        return;
    }
    if (ismnum(warnidx)) {
        warntype.speciesidx = warnidx;
        warntype.species = mons[warnidx];
        intr.HWarn_of_mon |= FROMRACE;
    }
}

// src/polyself.c:2265 ugenocided(); hero has attempted to self-genocide?
export function ugenocided() {
    return ((game.mvitals[game.urole.mnum].mvflags & G_GENOD)
            || (game.mvitals[game.urace.mnum].mvflags & G_GENOD)) !== 0;
}

// src/polyself.c:2273 udeadinside(); how hero feels "inside" after self-
// genocide
export function udeadinside() {
    /* self-genocide used to always say "you feel dead inside" but that
       seems silly when you're polymorphed into something undead;
       monkilled() distinguishes between living (killed) and non (destroyed)
       for monster death message; we refine the nonliving aspect a bit */
    return !nonliving(game.youmonst.data)
             ? 'dead'          /* living, including demons */
             : !weirdnonliving(game.youmonst.data)
                 ? 'condemned' /* undead plus manes */
                 : 'empty';    /* golems plus vortices */
}
