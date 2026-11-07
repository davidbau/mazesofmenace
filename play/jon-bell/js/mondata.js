// mondata.js — C ref: mondata.c.
import { acurr, arti_defn_adtyp } from './attrib.js';
import { Breathless } from './cmd.js';
import { ACID_RES, ANTIMAGIC, A_CHA, BLND_RES, COLD_RES, DISINT_RES, DRAIN_RES, FAINTED, FEMALE, FIRE_RES, LOW_PM, MALE, M_SEEN_ACID, M_SEEN_COLD, M_SEEN_DISINT, M_SEEN_ELEC, M_SEEN_FIRE, M_SEEN_MAGR, M_SEEN_NOTHING, M_SEEN_POISON, M_SEEN_REFL, M_SEEN_SLEEP, NATTK, NEUTRAL, PRONOUN_HALLU, PRONOUN_NO_IT, W_AMUL, W_ARM, POISON_RES, REFLECTING, SHOCK_RES, SLEEP_RES, STONE_RES, STRANGLED, Upolyd, W_ACCESSORY, W_ARMC, W_ARMH, W_ARMOR, W_SWAPWEP, W_WEP } from './const.js';
import { canspotmon, impossible_sync } from './display.js';
import { dmgtype as dmgtype_real } from './dogmove.js';
import { game } from './gstate.js';
import { dist2 } from './hacklib.js';
import { attacktype_fordmg, dmgtype_fromattack, hates_silver, humanoid, is_demon, monPmname, permonstTemplate, sliparm } from './makemon.js';
import { which_armor } from './worn.js';
import monsPack from './makemon_mons.json' with { type: 'json' };
import { AD_ACID, AD_COLD, AD_ELEC, AD_FIRE, AD_RUST, ARMOR_CLASS, AT_BITE, AT_BOOM, AT_BREA, AT_BUTT, AT_CLAW, AT_ENGL, AT_EXPL, AT_GAZE, AT_HUGS, AT_KICK, AT_MAGC, AT_NONE, AT_SPIT, AT_STNG, AT_TUCH, AT_WEAP, CREAM_PIE, M1_ANIMAL, M1_MINDLESS, NON_PM, PM_ALIGNED_CLERIC, PM_HIGH_CLERIC, PM_WATCHMAN, haseyes, is_undead, is_weptool, is_youmonst, mindless, xm_Blind, xm_Hallucination } from './mhitm.js';
import { title_to_mon } from './botl.js';
import { mon_has_amulet } from './wizard.js';
import { is_fshk } from './shk.js';
import { defends_when_carried } from './artifact.js';
import { MKOBJ_OC_OPROP } from './mkobj_erosion_meta.js';
import { objdescr_is } from './o_init.js';
import { PM_AIR_ELEMENTAL, PM_BABY_GRAY_DRAGON, PM_CLAY_GOLEM, PM_DEATH, PM_DUST_VORTEX, PM_EARTH_ELEMENTAL, PM_ENERGY_VORTEX, PM_FIRE_ELEMENTAL, PM_FIRE_VORTEX, PM_FLAMING_SPHERE, PM_FOG_CLOUD, PM_GLASS_GOLEM, PM_GOLD_GOLEM, PM_ICE_VORTEX, PM_MARILITH, PM_SALAMANDER, PM_STEAM_VORTEX, PM_STONE_GOLEM, PM_VAMPIRE, PM_VAMPIRE_LORD, PM_VLAD_THE_IMPALER, PM_WATER_ELEMENTAL, PM_WINGED_GARGOYLE } from './pm.generated.js';
import { rn2, rnd } from './rng.js';
import './trap.js';
import { is_were } from './were.js';
import { clear_path } from './vision.js';
import { monstseesu as monstseesu_real } from './mcastu.js'; // relocate-fns
import { PM_YELLOW_DRAGON } from './pm.generated.js';
import { PM_HORSE, PM_PONY, PM_ROCK_MOLE, PM_WARHORSE, PM_WOODCHUCK } from './pm.generated.js'; // relocate-fns
import { ALL_TRAPS, NO_TRAP } from './const.js'; // relocate-fns
import { mon_knows_traps as mon_knows_traps_real } from './makemon.js'; // relocate-fns
import { sticks as sticks_real } from './dog.js'; // relocate-fns

/* ---------------------------------------------------------------------------
 * MONSYM class ordinals (permonst.mlet) — C ref: nethack-c/include/defsym.h
 * MONSYM(idx, ch, basename, sym, desc) => `sym = idx`, so S_* is the ORDINAL,
 * not the display character. Listed with their defsym.h line numbers.
 * ---------------------------------------------------------------------------
 */
const S_EYE = 5;        /* defsym.h:299 */

const S_IMP = 9;        /* defsym.h:305 */

const S_KOBOLD = 11;    /* defsym.h:307 */

const S_NYMPH = 14;     /* defsym.h:310 */

const S_UNICORN = 21;   /* defsym.h:319 */

const S_LIGHT = 25;     /* defsym.h:324 */

const S_CENTAUR = 29;   /* defsym.h:328 */

const S_DRAGON = 30;    /* defsym.h:329 */

const S_LICH = 38;      /* defsym.h:338 */

const S_MUMMY = 39;     /* defsym.h:339 */

const S_NAGA = 40;      /* defsym.h:341 */

const S_OGRE = 41;      /* defsym.h:342 */

const S_VAMPIRE = 48;   /* defsym.h:350 */

const S_WRAITH = 49;    /* defsym.h:351 */

const S_ZOMBIE = 52;    /* defsym.h:355 */

const S_GHOST = 54;     /* defsym.h:358 */

const S_GOLEM = 55;     /* defsym.h:359 */

const AD_DRLI = 15; /* monattk.h:57 */

/* C ref: nethack-c/src/mondata.c:79-85 poly_when_stoned()
 * is_golem(ptr) == ptr->mlet == S_GOLEM (nethack-c/include/mondata.h:108) */
export function poly_when_stoned(ptr) {
    const S_GOLEM = 55;
    const G_GENOD = 0x02;
    const mv = (game.mvitals && game.mvitals[PM_STONE_GOLEM])
        ? (game.mvitals[PM_STONE_GOLEM].mvflags | 0) : 0;
    return !!(ptr.mlet === S_GOLEM && (ptr.pmidx | 0) !== PM_STONE_GOLEM
              && !(mv & G_GENOD));
}

/* ---------------------------------------------------------------------------
 * num_horns — C ref: nethack-c/src/mondata.c:677-695
 * Returns the number of horns for a given monster, by pmidx.
 * No RNG.
 * ---------------------------------------------------------------------------
 */
export function num_horns(ptr) {
    /* C: switch (monsndx(ptr)) — the permonst index. A `struct permonst *`
       arrives here as the reconstructed object carrying .pmidx (the idiom used
       by breakarm/poly_when_stoned/haseyes elsewhere in this file); js/polyself.js
       _has_horns passes the bare index instead, so accept both forms. */
    const ptr_pmidx = (ptr && typeof ptr === 'object')
        ? (ptr.pmidx !== undefined ? (ptr.pmidx | 0) : -1)
        : (ptr | 0);
    const PM_HORNED_DEVIL = 291;
    const PM_MINOTAUR = 177;
    const PM_ASMODEUS = 309;
    const PM_BALROG = 302;
    const PM_WHITE_UNICORN = 101;
    const PM_GRAY_UNICORN = 102;
    const PM_BLACK_UNICORN = 103;
    const PM_KI_RIN = 124;

    switch (ptr_pmidx) {
    case PM_HORNED_DEVIL:
    case PM_MINOTAUR:
    case PM_ASMODEUS:
    case PM_BALROG:
        return 2;
    case PM_WHITE_UNICORN:
    case PM_GRAY_UNICORN:
    case PM_BLACK_UNICORN:
    case PM_KI_RIN:
        return 1;
    default:
        break;
    }
    return 0;
}

const GROWNUPS = [
    [9, 10],     /* chickatrice -> cockatrice */
    [16, 18],    /* little dog -> dog */
    [18, 19],    /* dog -> large dog */
    [25, 26],    /* hell hound pup -> hell hound */
    [22, 24],    /* winter wolf cub -> winter wolf */
    [32, 33],    /* kitten -> housecat */
    [33, 37],    /* housecat -> large cat */
    [100, 104],  /* pony -> horse */
    [104, 105],  /* horse -> warhorse */
    [59, 60],    /* kobold -> large kobold */
    [60, 61],    /* large kobold -> kobold leader */
    [165, 166],  /* gnome -> gnome leader */
    [166, 168],  /* gnome leader -> gnome ruler */
    [44, 46],    /* dwarf -> dwarf leader */
    [46, 47],    /* dwarf leader -> dwarf ruler */
    [48, 49],    /* mind flayer -> master mind flayer */
    [72, 77],    /* orc -> orc captain */
    [73, 77],    /* hill orc -> orc captain */
    [74, 77],    /* Mordor orc -> orc captain */
    [75, 77],    /* Uruk-hai -> orc captain */
    [88, 89],    /* sewer rat -> giant rat */
    [94, 96],    /* cave spider -> giant spider */
    [203, 204],  /* ogre -> ogre leader */
    [204, 205],  /* ogre leader -> ogre tyrant */
    [264, 268],  /* elf -> elf-noble */
    [265, 268],  /* Woodland-elf -> elf-noble */
    [266, 268],  /* Green-elf -> elf-noble */
    [267, 268],  /* Grey-elf -> elf-noble */
    [268, 269],  /* elf-noble -> elven monarch */
    [183, 184],  /* lich -> demilich */
    [184, 185],  /* demilich -> master lich */
    [185, 186],  /* master lich -> arch-lich */
    [226, 227],  /* vampire -> vampire leader */
    [126, 127],  /* bat -> giant bat */
    [133, 143],  /* baby gray dragon -> gray dragon */
    [134, 144],  /* baby gold dragon -> gold dragon */
    [135, 145],  /* baby silver dragon -> silver dragon */
    /* C mondata.c:1266-1268 has baby shimmering -> shimmering inside #if 0 */
    [136, 146],  /* baby red dragon -> red dragon */
    [137, 147],  /* baby white dragon -> white dragon */
    [138, 148],  /* baby orange dragon -> orange dragon */
    [139, 149],  /* baby black dragon -> black dragon */
    [140, 150],  /* baby blue dragon -> blue dragon */
    [141, 151],  /* baby green dragon -> green dragon */
    [142, 152],  /* baby yellow dragon -> yellow dragon */
    [195, 199],  /* red naga hatchling -> red naga */
    [196, 200],  /* black naga hatchling -> black naga */
    [197, 201],  /* golden naga hatchling -> golden naga */
    [198, 202],  /* guardian naga hatchling -> guardian naga */
    [64, 65],    /* small mimic -> large mimic */
    [65, 66],    /* large mimic -> giant mimic */
    [112, 114],  /* baby long worm -> long worm */
    [113, 115],  /* baby purple worm -> purple worm */
    [325, 328],  /* baby crocodile -> crocodile */
    [277, 278],  /* soldier -> sergeant */
    [278, 280],  /* sergeant -> lieutenant */
    [280, 281],  /* lieutenant -> captain */
    [282, 283],  /* watchman -> watch captain */
    [275, 276],  /* aligned cleric -> high cleric */
    [369, 331],  /* student -> archeologist */
    [372, 334],  /* attendant -> healer */
    [373, 335],  /* page -> knight */
    [375, 337],  /* acolyte -> cleric */
    [382, 343],  /* apprentice -> wizard */
    [50, 53],    /* manes -> lemure */
    [179, 180],  /* Keystone Kop -> Kop Sergeant */
    [180, 181],  /* Kop Sergeant -> Kop Lieutenant */
    [181, 182],  /* Kop Lieutenant -> Kop Kaptain */
    [-1, -1],    /* sentinel: NON_PM */
];

/* ---------------------------------------------------------------------------
 * little_to_big — C ref: nethack-c/src/mondata.c:1302-1313
 * Returns the large (adult) form of a monster, or montype unchanged.
 * No RNG.
 * ---------------------------------------------------------------------------
 */
export function little_to_big(montype) {
    for (let i = 0; GROWNUPS[i][0] >= LOW_PM; i++) {
        if (montype === GROWNUPS[i][0]) {
            montype = GROWNUPS[i][1];
            break;
        }
    }
    return montype;
}

/* ---------------------------------------------------------------------------
 * big_to_little — C ref: nethack-c/src/mondata.c:1315-1326
 * Returns the small (baby) form of a monster, or montype unchanged.
 * No RNG.
 * ---------------------------------------------------------------------------
 */
export function big_to_little(montype) {
    for (let i = 0; GROWNUPS[i][0] >= LOW_PM; i++) {
        if (montype === GROWNUPS[i][1]) {
            montype = GROWNUPS[i][0];
            break;
        }
    }
    return montype;
}

/* ---------------------------------------------------------------------------
 * same_race — C ref: nethack-c/src/mondata.c:770-879
 * Returns true if two permonst types are considered the same race.
 * No RNG.
 * ---------------------------------------------------------------------------
 */
export function same_race(pm1, pm2) {
    /* mflags2 bits for race checks */
    const M2_HUMAN = 0x00000008;
    const M2_ELF = 0x00000010;
    const M2_DWARF = 0x00000020;
    const M2_GNOME = 0x00000040;
    const M2_ORC = 0x00000080;
    const M2_MINION = 0x00001000;  /* monflag.h:135 */
    const M2_GIANT = 0x00002000;   /* monflag.h:136 */
    const M2_JEWELS = 0x20000000;  /* monflag.h:151 */
    const M2_DEMON = 0x00000100;
    const M2_UNDEAD = 0x00000002;

    /* monster class symbols: the defsym.h MONSYM ordinals, module-level above. */

    /* pmidx values for specific monsters (js/pm.generated.js) */
    const PM_KOBOLD_ZOMBIE = 239;
    const PM_KOBOLD_MUMMY = 187;
    const PM_TENGU = 55;
    const PM_GARGOYLE = 41;
    const PM_WINGED_GARGOYLE = 42;
    const PM_KILLER_BEE = 1;
    const PM_QUEEN_BEE = 5;
    const PM_MIND_FLAYER = 48;
    const PM_MASTER_MIND_FLAYER = 49;
    const PM_DEATH = 311;
    const PM_PESTILENCE = 312;
    const PM_FAMINE = 313;
    const PM_BABY_LONG_WORM = 112;
    const PM_LONG_WORM = 114;
    const PM_LONG_WORM_TAIL = 330;

    function is_human(ptr) {
        return ptr && ((ptr.mflags2 | 0) & M2_HUMAN) !== 0;
    }
    function is_elf(ptr) {
        return ptr && ((ptr.mflags2 | 0) & M2_ELF) !== 0;
    }
    function is_dwarf(ptr) {
        return ptr && ((ptr.mflags2 | 0) & M2_DWARF) !== 0;
    }
    function is_gnome(ptr) {
        return ptr && ((ptr.mflags2 | 0) & M2_GNOME) !== 0;
    }
    function is_orc(ptr) {
        return ptr && ((ptr.mflags2 | 0) & M2_ORC) !== 0;
    }
    function is_giant(ptr) {
        return ptr && ((ptr.mflags2 | 0) & M2_GIANT) !== 0;
    }
    /* C mondata.h:108 — is_golem(ptr) == ((ptr)->mlet == S_GOLEM) */
    function is_golem(ptr) {
        if (!ptr) return false;
        return (ptr.mlet | 0) === S_GOLEM;
    }
    /* C mondata.h:210-211 */
    function is_mind_flayer(ptr) {
        if (!ptr) return false;
        const pmidx = ptr.pmidx | 0;
        return pmidx === PM_MIND_FLAYER || pmidx === PM_MASTER_MIND_FLAYER;
    }
    /* C mondata.h:149 — mlet == S_UNICORN && likes_gems(ptr) (mondata.h:144) */
    function is_unicorn(ptr) {
        if (!ptr) return false;
        return (ptr.mlet | 0) === S_UNICORN
            && ((ptr.mflags2 | 0) & M2_JEWELS) !== 0;
    }
    /* C mondata.h:161-163 */
    function is_rider(ptr) {
        if (!ptr) return false;
        const pmidx = ptr.pmidx | 0;
        return pmidx === PM_DEATH || pmidx === PM_FAMINE
            || pmidx === PM_PESTILENCE;
    }
    /* C mondata.h:142 */
    function is_minion(ptr) {
        return ptr && ((ptr.mflags2 | 0) & M2_MINION) !== 0;
    }
    function is_demon(ptr) {
        return ptr && ((ptr.mflags2 | 0) & M2_DEMON) !== 0;
    }
    /* is_undead lives at module scope (C mondata.h:95, mflags2 & M2_UNDEAD);
       the identical local copy that used to sit here was a shadow. */
    /* C mondata.h:150-152 */
    function is_longworm(ptr) {
        if (!ptr) return false;
        const pmidx = ptr.pmidx | 0;
        return pmidx === PM_BABY_LONG_WORM || pmidx === PM_LONG_WORM
            || pmidx === PM_LONG_WORM_TAIL;
    }

    const let1 = pm1.mlet | 0;
    const let2 = pm2.mlet | 0;

    /* C mondata.c:775 `if (pm1 == pm2) return TRUE; exact match`.
       In C this compares two `struct permonst *` into the mons[] table.
       In JS, identical references match immediately; for distinct permonstTemplate()
       objects, we compare pmidx to mirror C's mons[] pointer equality.
       Guarded on Number.isInteger rather than `|0`: a permonst-shaped object
       without pmidx cannot establish identity, and `undefined|0 === undefined|0`
       would claim every such pair is the same monster. Falling through to the
       mlet/mflags arms is what the (broken) `===` already did, so an
       unidentifiable pair keeps its old answer instead of a new wrong one. */
    if (pm1 === pm2)
        return true;
    const ndx1 = pm1.pmidx, ndx2 = pm2.pmidx;
    if (Number.isInteger(ndx1) && ndx1 === ndx2)
        return true; /* exact match */
    /* player races have their own predicates */
    if (is_human(pm1))
        return is_human(pm2);
    if (is_elf(pm1))
        return is_elf(pm2);
    if (is_dwarf(pm1))
        return is_dwarf(pm2);
    if (is_gnome(pm1))
        return is_gnome(pm2);
    if (is_orc(pm1))
        return is_orc(pm2);
    /* other creatures are less precise */
    if (is_giant(pm1))
        return is_giant(pm2);
    if (is_golem(pm1))
        return is_golem(pm2);
    if (is_mind_flayer(pm1))
        return is_mind_flayer(pm2);
    if (let1 === S_KOBOLD || (pm1.pmidx | 0) === PM_KOBOLD_ZOMBIE
        || (pm1.pmidx | 0) === PM_KOBOLD_MUMMY)
        return (let2 === S_KOBOLD || (pm2.pmidx | 0) === PM_KOBOLD_ZOMBIE
                || (pm2.pmidx | 0) === PM_KOBOLD_MUMMY);
    if (let1 === S_OGRE)
        return (let2 === S_OGRE);
    if (let1 === S_NYMPH)
        return (let2 === S_NYMPH);
    if (let1 === S_CENTAUR)
        return (let2 === S_CENTAUR);
    if (is_unicorn(pm1))
        return is_unicorn(pm2);
    if (let1 === S_DRAGON)
        return (let2 === S_DRAGON);
    if (let1 === S_NAGA)
        return (let2 === S_NAGA);
    /* other critters get steadily messier */
    if (is_rider(pm1))
        return is_rider(pm2);
    if (is_minion(pm1))
        return is_minion(pm2);
    /* tengu don't match imps (first test handled case of both being tengu) */
    if ((pm1.pmidx | 0) === PM_TENGU || (pm2.pmidx | 0) === PM_TENGU)
        return false;
    if (let1 === S_IMP)
        return (let2 === S_IMP);
    /* and minor demons (imps) don't match major demons */
    else if (let2 === S_IMP)
        return false;
    if (is_demon(pm1))
        return is_demon(pm2);
    if (is_undead(pm1)) {
        if (let1 === S_ZOMBIE)
            return (let2 === S_ZOMBIE);
        if (let1 === S_MUMMY)
            return (let2 === S_MUMMY);
        if (let1 === S_VAMPIRE)
            return (let2 === S_VAMPIRE);
        if (let1 === S_LICH)
            return (let2 === S_LICH);
        if (let1 === S_WRAITH)
            return (let2 === S_WRAITH);
        if (let1 === S_GHOST)
            return (let2 === S_GHOST);
    } else if (is_undead(pm2))
        return false;

    /* check for monsters which grow into more mature forms */
    if (let1 === let2) {
        const m1 = pm1.pmidx | 0;
        const m2 = pm2.pmidx | 0;
        let prv, nxt;

        for (prv = m1, nxt = big_to_little(m1); nxt !== prv;
             prv = nxt, nxt = big_to_little(nxt))
            if (nxt === m2)
                return true;
        for (prv = m1, nxt = little_to_big(m1); nxt !== prv;
             prv = nxt, nxt = little_to_big(nxt))
            if (nxt === m2)
                return true;
    }
    /* not caught by little/big handling */
    if ((pm1.pmidx | 0) === PM_GARGOYLE || (pm1.pmidx | 0) === PM_WINGED_GARGOYLE)
        return ((pm2.pmidx | 0) === PM_GARGOYLE
                || (pm2.pmidx | 0) === PM_WINGED_GARGOYLE);
    if ((pm1.pmidx | 0) === PM_KILLER_BEE || (pm1.pmidx | 0) === PM_QUEEN_BEE)
        return ((pm2.pmidx | 0) === PM_KILLER_BEE || (pm2.pmidx | 0) === PM_QUEEN_BEE);

    if (is_longworm(pm1))
        return is_longworm(pm2);
    return false;
}

/* ---------------------------------------------------------------------------
 * get_atkdam_type — C ref: nethack-c/src/mondata.c:1659-1670
 * Returns a random breath weapon type (if AD_RBRE) or adtyp unchanged.
 * RNG: rn2(SIZE(rnd_breath_typ)) = rn2(8) when adtyp == AD_RBRE.
 * ---------------------------------------------------------------------------
 */
export function get_atkdam_type(adtyp) {
    const AD_RBRE = 242;
    const AD_MAGM = 1;
    const AD_FIRE = 2;
    const AD_COLD = 3;
    const AD_SLEE = 4;
    const AD_DISN = 5;
    const AD_ELEC = 6;
    const AD_DRST = 7;
    const AD_ACID = 8;

    if (adtyp === AD_RBRE) {
        const rnd_breath_typ = [
            AD_MAGM, AD_FIRE, AD_COLD, AD_SLEE,
            AD_DISN, AD_ELEC, AD_DRST, AD_ACID
        ];
        return rnd_breath_typ[rn2(rnd_breath_typ.length)];
    }
    return adtyp;
}

/* ---------------------------------------------------------------------------
 * cvt_prop_to_mseenres — C ref: nethack-c/src/mondata.c:1539-1555
 * Converts a property resistance to a monster-seen-flag bitmask.
 * No RNG.
 * ---------------------------------------------------------------------------
 */
export function cvt_prop_to_mseenres(prop) {
    switch (prop) {
    case ANTIMAGIC: return M_SEEN_MAGR;
    case FIRE_RES: return M_SEEN_FIRE;
    case COLD_RES: return M_SEEN_COLD;
    case SLEEP_RES: return M_SEEN_SLEEP;
    case DISINT_RES: return M_SEEN_DISINT;
    case POISON_RES: return M_SEEN_POISON;
    case SHOCK_RES: return M_SEEN_ELEC;
    case ACID_RES: return M_SEEN_ACID;
    case REFLECTING: return M_SEEN_REFL;
    default: return M_SEEN_NOTHING;
    }
}

const MONS_CT = /** @type {number[][]} */ (monsPack.mons);

/* ---------------------------------------------------------------------------
 * can_track — C ref: nethack-c/src/mondata.c:622-629
 * Returns true if monster can be tracked well.
 * Returns: TRUE if hero wields Excalibur, else TRUE if monster has eyes.
 * No RNG, no state changes.
 * Argument: ptr is a permonst * (marshalled as {pmidx}, the monster index)
 * ---------------------------------------------------------------------------
 */
export function can_track(ptr) {
    /* Returns true if monster can track well.
     * If wielding Excalibur: always true.
     * Otherwise: true if the monster has eyes (no M1_NOEYES flag).
     */
    if (u_wield_art(ART_EXCALIBUR))
        return true;
    /* ptr is {pmidx: mndx}; extract the monster index */
    const mndx = (ptr && typeof ptr === 'object' && ptr.pmidx !== undefined)
        ? (ptr.pmidx | 0)
        : -1;
    return haseyes_idx(mndx);
}

/* Macro: haseyes — C ref: nethack-c/include/mondata.h:46
 * Returns true if monster data does NOT have M1_NOEYES flag set.
 * Expands to: (ptr->mflags1 & M1_NOEYES) == 0
 * Implementation for index-based access to MONS array.
 */
function haseyes_idx(mndx) {
    const M1_NOEYES = 0x00001000; /* monflag.h */
    if ((mndx | 0) < 0 || (mndx | 0) >= MONS_CT.length)
        return true; /* out of bounds: assume has eyes */
    const mflags1 = (MONS_CT[mndx | 0][6] | 0);
    return (mflags1 & M1_NOEYES) === 0;
}

/* Macro: u_wield_art — C ref: nethack-c/include/obj.h:441
 * Returns true if the wielded weapon is the specified artifact.
 * Expands to: is_art(uwep, art) → uwep && uwep->oartifact == art
 */
function u_wield_art(art) {
    const uwep = (game.u && game.u.uwep) || null;
    if (!uwep) return false;
    return ((uwep.oartifact | 0) === art);
}

/* Artifact constant: Excalibur (C ref: nethack-c/include/artilist.h)
 * artilist[0] is a dummy element, artilist[1] is Excalibur */
const ART_EXCALIBUR = 1;

/* monflag.h M1_* bits, defsym.h S_RODENT, and objects.h otyps (rows of
 * js/oc_name_data.js) that this file's mondata.c ports name. */
const M1_BREATHLESS = 0x00000400, M1_NOHEAD = 0x00008000, M1_HUMANOID = 0x00020000;
const M2_NEUTER = 0x00040000, M2_PNAME = 0x00080000, G_UNIQ = 0x1000;
const is_neuter = (ptr) => ((ptr?.mflags2 | 0) & M2_NEUTER) !== 0;
const type_is_pname = (ptr) => ((ptr?.mflags2 | 0) & M2_PNAME) !== 0;
const S_RODENT = 18;
const GRAY_DRAGON_SCALE_MAIL = 101, GRAY_DRAGON_SCALES = 111, YELLOW_DRAGON_SCALES = 120;
const AMULET_OF_MAGICAL_BREATHING = 209;

/* C mondata.c:590-619: strangulation stops blood flow, not just breathing. */
export function can_be_strangled(mon) {
    const flags = mon.data.mflags1 | 0;
    if (flags & M1_NOHEAD) return false; /* !has_head(mon->data) */
    const nobrainer = !!(flags & M1_MINDLESS);
    let nonbreathing;
    if (is_youmonst(mon)) {
        nonbreathing = Breathless();
    } else {
        nonbreathing = !!(flags & M1_BREATHLESS) /* breathless(mon->data) */
            || which_armor(mon, W_AMUL)?.otyp === AMULET_OF_MAGICAL_BREATHING;
    }
    return !nobrainer || !nonbreathing;
}

/* ---------------------------------------------------------------------------
 * can_blow — C ref: nethack-c/src/mondata.c:566-576
 * Returns true if a monster can blow (whistle, etc).
 * No RNG, no state changes.
 * ---------------------------------------------------------------------------
 */
export function can_blow(mtmp) {
    const MS_SILENT = 0;
    const MS_BUZZ = 10;
    const M1_BREATHLESS = 0x00000400;
    const M1_NOHEAD = 0x00008000;
    const MZ_SMALL = 1;
    const S_EEL = 57;

    /* Get the monster's data template (permonst). mon.data is materialized
       by the replay reconstructor from data_mndx. */
    const data = mtmp.data;
    if (!data) return true; /* fallback: allow blowing if data missing */

    /* C: if ((is_silent(mtmp->data) || mtmp->data->msound == MS_BUZZ)
            && (breathless(mtmp->data) || verysmall(mtmp->data)
                || !has_head(mtmp->data) || mtmp->data->mlet == S_EEL))
            return FALSE; */
    const is_silent = (data.msound | 0) === MS_SILENT;
    const msound_is_buzz = (data.msound | 0) === MS_BUZZ;
    const breathless = ((data.mflags1 | 0) & M1_BREATHLESS) !== 0;
    const verysmall = (data.msize | 0) < MZ_SMALL;
    const has_head = ((data.mflags1 | 0) & M1_NOHEAD) === 0;
    const is_eel = (data.mlet | 0) === S_EEL;

    if ((is_silent || msound_is_buzz) &&
        (breathless || verysmall || !has_head || is_eel)) {
        return false;
    }

    /* C: if ((mtmp == &gy.youmonst) && Strangled)
            return FALSE; */
    const is_you = is_youmonst(mtmp); /* C: mtmp == &gy.youmonst */
    if (is_you) {
        const u = game.u;
        const strangled = u && u.uprops && u.uprops[STRANGLED]
            && u.uprops[STRANGLED].intrinsic;
        if (strangled) {
            return false;
        }
    }

    return true;
}

/* ---------------------------------------------------------------------------
 * max_passive_dmg — C ref: nethack-c/src/mondata.c:720-767
 * Returns the maximum damage a defender can do to the attacker via
 * a passive defense.
 * No RNG, no state changes.
 * ---------------------------------------------------------------------------
 */
export function max_passive_dmg(mdef, magr) {
    /* NATTK (import, permonst.h:48 == 6) and AT_NONE/AT_CLAW/AT_BITE/AT_KICK/
       AT_BUTT/AT_TUCH/AT_STNG/AT_HUGS/AT_WEAP + AD_FIRE/AD_RUST/AD_ACID/
       AD_COLD/AD_ELEC all come from module scope.  The local copies that used
       to be here silently overrode them, and AT_HUGS was 12 (that is AT_BREA,
       monattk.h:22) instead of monattk.h:19's 7 — so the AT_HUGS arm of the
       multi2 loop below matched breath attackers and missed huggers.
       Only the constants with no module-scope declaration stay local: */
    const AT_ENGL = 11;  /* C monattk.h:21 (was 13, which is AT_EXPL) */
    const AT_TENT = 16;  /* C monattk.h:26 (was 15, which is AT_GAZE) */
    const AT_BOOM = 14;  /* C monattk.h:24 */
    const AD_DCAY = 34;  /* C monattk.h:76 (was 5, which is AD_DISN) */
    const AD_PHYS = 0;   /* C monattk.h:42 */

    /* C mondata.h:223-227 — three mons[] IDENTITY tests (js/makemon_pmnames.json
     * confirms 249 straw, 250 paper, 253 leather, 254 wood, 259 iron golem). */
    const PM_STRAW_GOLEM_ = 249, PM_PAPER_GOLEM_ = 250;
    const PM_LEATHER_GOLEM_ = 253, PM_WOOD_GOLEM_ = 254, PM_IRON_GOLEM_ = 259;
    const pmidx_of = (ptr) => (ptr ? ((ptr.pmidx ?? ptr.mnum ?? -1) | 0) : -1);
    function completelyburns(ptr) {
        const i = pmidx_of(ptr);
        return i === PM_PAPER_GOLEM_ || i === PM_STRAW_GOLEM_;
    }
    function completelyrots(ptr) {
        const i = pmidx_of(ptr);
        return i === PM_WOOD_GOLEM_ || i === PM_LEATHER_GOLEM_;
    }
    function completelyrusts(ptr) {
        return pmidx_of(ptr) === PM_IRON_GOLEM_;
    }
    /* C monst.h:270-279 resists_*(mon) == Resists_Elem(mon, X_RES): includes
     * wielded-artifact and worn/carried-item protection, not just mresists. */
    const resists_acid = (mtmp) => Resists_Elem(mtmp, ACID_RES);
    const resists_cold = (mtmp) => Resists_Elem(mtmp, COLD_RES);
    const resists_fire = (mtmp) => Resists_Elem(mtmp, FIRE_RES);
    const resists_elec = (mtmp) => Resists_Elem(mtmp, SHOCK_RES);

    let multi2 = 0;
    let i;

    /* C: for (i = 0; i < NATTK; i++)
            switch (magr->data->mattk[i].aatyp) {
            case AT_CLAW: ... case AT_WEAP: multi2++; break; } */
    const magr_data = magr.data;
    if (magr_data && magr_data.mattk) {
        for (i = 0; i < NATTK; i++) {
            const aatyp = magr_data.mattk[i].aatyp | 0;
            switch (aatyp) {
                case AT_CLAW:
                case AT_BITE:
                case AT_KICK:
                case AT_BUTT:
                case AT_TUCH:
                case AT_STNG:
                case AT_HUGS:
                case AT_ENGL:
                case AT_TENT:
                case AT_WEAP:
                    multi2++;
                    break;
                default:
                    break;
            }
        }
    }

    let dmg = 0;
    const mdef_data = mdef.data;
    if (mdef_data && mdef_data.mattk) {
        /* C: for (i = 0; i < NATTK; i++)
                if (mdef->data->mattk[i].aatyp == AT_NONE
                    || mdef->data->mattk[i].aatyp == AT_BOOM) { ... } */
        for (i = 0; i < NATTK; i++) {
            const aatyp = mdef_data.mattk[i].aatyp | 0;
            if (aatyp === AT_NONE || aatyp === AT_BOOM) {
                const adtyp = mdef_data.mattk[i].adtyp | 0;
                /* C: if ((adtyp == AD_FIRE && completelyburns(magr->data))
                        || (adtyp == AD_DCAY && completelyrots(magr->data))
                        || (adtyp == AD_RUST && completelyrusts(magr->data))) {
                        dmg = magr->mhp;
                    } else if ((adtyp == AD_ACID && !resists_acid(magr))
                               || (adtyp == AD_COLD && !resists_cold(magr))
                               || (adtyp == AD_FIRE && !resists_fire(magr))
                               || (adtyp == AD_ELEC && !resists_elec(magr))
                               || adtyp == AD_PHYS) {
                        dmg = mdef->data->mattk[i].damn;
                        if (!dmg)
                            dmg = mdef->data->mlevel + 1;
                        dmg *= mdef->data->mattk[i].damd;
                    } */
                if ((adtyp === AD_FIRE && completelyburns(magr_data))
                    || (adtyp === AD_DCAY && completelyrots(magr_data))
                    || (adtyp === AD_RUST && completelyrusts(magr_data))) {
                    dmg = magr.mhp | 0;
                } else if ((adtyp === AD_ACID && !resists_acid(magr))
                           || (adtyp === AD_COLD && !resists_cold(magr))
                           || (adtyp === AD_FIRE && !resists_fire(magr))
                           || (adtyp === AD_ELEC && !resists_elec(magr))
                           || adtyp === AD_PHYS) {
                    dmg = mdef_data.mattk[i].damn | 0;
                    if (!dmg) {
                        dmg = (mdef_data.mlevel | 0) + 1;
                    }
                    dmg = Math.imul(dmg, mdef_data.mattk[i].damd | 0);
                }
                /* C: dmg *= multi2; break; */
                dmg = Math.imul(dmg, multi2);
                break;
            }
        }
    }

    return dmg | 0;
}

/* ---------------------------------------------------------------------------
 * on_fire — C ref: nethack-c/src/mondata.c:1410-1446
 * No RNG, no state changes.
 * ---------------------------------------------------------------------------
 */
export function on_fire(mptr, mattk) {
    let what;
    switch (mptr.pmidx | 0) {
    case PM_FLAMING_SPHERE:
    case PM_FIRE_VORTEX:
    case PM_FIRE_ELEMENTAL:
    case PM_SALAMANDER:
        what = "already on fire";
        break;
    case PM_WATER_ELEMENTAL:
    case PM_FOG_CLOUD:
    case PM_STEAM_VORTEX:
        what = "boiling";
        break;
    case PM_ICE_VORTEX:
    case PM_GLASS_GOLEM:
        what = "melting";
        break;
    case PM_STONE_GOLEM:
    case PM_CLAY_GOLEM:
    case PM_GOLD_GOLEM:
    case PM_AIR_ELEMENTAL:
    case PM_EARTH_ELEMENTAL:
    case PM_DUST_VORTEX:
    case PM_ENERGY_VORTEX:
        what = "heating up";
        break;
    default:
        what = ((mattk.aatyp | 0) === AT_HUGS) ? "being roasted" : "on fire";
        break;
    }
    return what;
}

/* C ref: mondata.c:1191-1209 pronoun_gender(struct monst *mtmp, unsigned pg_flags)
 * flags&PRONOUN_NO_IT: suppress visibility check; flags&PRONOUN_HALLU: random if hallucinating.
 * Macros (mondata.h): is_neuter=M2_NEUTER, humanoid=M1_HUMANOID, type_is_pname=M2_PNAME, G_UNIQ=0x1000. */
export function pronoun_gender(mtmp, pg_flags) {
    const override_vis = (pg_flags & PRONOUN_NO_IT) ? true : false;
    const hallu_rand = (pg_flags & PRONOUN_HALLU) ? true : false;
    if (hallu_rand && xm_Hallucination())
        return rn2(4);
    if (!override_vis && !canspotmon(mtmp))
        return 2;
    if (is_neuter(mtmp.data))
        return 2;
    return (humanoid(mtmp.data) || (mtmp.data.geno & G_UNIQ)
            || type_is_pname(mtmp.data)) ? (mtmp.female | 0) : 2;
}

/* C ref: monst.h:215 is_vampshifter(mon) — cham is one of the vampire-shifter forms.
 * (PM_VAMPIRE_LEADER ≡ index 227 ≡ JS PM_VAMPIRE_LORD; version naming, same mons[] idx.) */
function is_vampshifter(mon) {
    return mon.cham === PM_VAMPIRE || mon.cham === PM_VAMPIRE_LORD || mon.cham === PM_VLAD_THE_IMPALER;
}

/* C ref: mondata.c mon_hates_silver(struct monst *mon) —
 *   return is_vampshifter(mon) || hates_silver(mon->data); */
export function mon_hates_silver(mon) {
    return !!(is_vampshifter(mon) || hates_silver(mon.data));
}

/* ---------------------------------------------------------------------------
 * hates_blessings — C ref: nethack-c/src/mondata.c:539-543
 * Returns true if monster-type is especially affected by blessed objects.
 * No RNG.
 * ---------------------------------------------------------------------------
 */
function hates_blessings(ptr) {
    const M2_DEMON = 0x00000100; /* C monflag.h:131 */
    /* C mondata.c:541: return (is_undead(ptr) || is_demon(ptr));
       is_undead is the module-scope predicate (mflags2 & M2_UNDEAD); a local
       `const is_undead` used to shadow it here with the same value. */
    const is_demon = (ptr.mflags2 & M2_DEMON) !== 0;
    return is_undead(ptr) || is_demon;
}

/* ---------------------------------------------------------------------------
 * mon_hates_blessings — C ref: nethack-c/src/mondata.c:532-537
 * Returns true if the monster hates blessed objects (either vampshifter or
 * if the monster type is undead or demon).
 * No RNG.
 * ---------------------------------------------------------------------------
 */
export function mon_hates_blessings(mon) {
    return !!(is_vampshifter(mon) || hates_blessings(mon.data));
}

/* ---------------------------------------------------------------------------
 * raceptr — C ref: mondata.c:1359-1365
 * Returns correct pointer for non-polymorphed and polymorphed player.
 * It does not return a pointer to player role character.
 * No RNG, no state changes.
 * ---------------------------------------------------------------------------
 */
export function raceptr(mtmp) {
    if (is_youmonst(mtmp) && !Upolyd(game.u)) {
        return permonstTemplate(game.urace.mnum);
    }
    return mtmp?.data;
}

/* ---------------------------------------------------------------------------
 * resist_conflict — C ref: nethack-c/src/mondata.c:1606-1613
 * Can monster resist conflict caused by hero?
 * High-CHA heroes will be able to 'convince' monsters (through the magic of
 * the ring, of course) to fight for them much more easily than low-CHA ones.
 * RNG: one rnd(20) call.
 * ---------------------------------------------------------------------------
 */
export function resist_conflict(mtmp) {
    const u = game.u;
    /* always a small chance at 19 */
    const resist_chance = Math.min(19, (acurr(u, A_CHA) - mtmp.m_lev + u.ulevel));
    return (rnd(20) > resist_chance);
}

/* ---------------------------------------------------------------------------
 * levl_follower — C ref: nethack-c/src/mondata.c:1210-1226
 * Determines if a monster will follow you to another level. No RNG.
 * --------------------------------------------------------------------------- */
export function levl_follower(mtmp) {
    /* your steed always follows */
    if (mtmp === game.u.usteed)
        return true;
    /* Wizard with Amulet won't bother trying to follow across levels */
    if (mtmp.iswiz && mon_has_amulet(mtmp))
        return false;
    /* some monsters will follow even while intending to flee from you */
    if (mtmp.mtame || mtmp.iswiz || is_fshk(mtmp))
        return true;
    /* stalking types follow, but won't when fleeing unless you hold the Amulet */
    const M2_STALK = 0x01000000; /* follows you to other levels */
    return ((mtmp.data.mflags2 & M2_STALK)
            && (!mtmp.mflee || game.u.uhave.amulet)) ? true : false;
}

/* Helper: is_animal — C mondata.h:66 is_animal(ptr) = (mflags1 & M1_ANIMAL) != 0.
 * M1_ANIMAL is monflag.h:103 == 0x00040000; uses the file-level constant
 * declared above (there must be exactly one copy per file). */
function is_animal(mdata) {
    if (!mdata) return false;
    const mflags1 = (mdata.mflags1 | 0);
    return (mflags1 & M1_ANIMAL) !== 0;
}

/* C vision.h:42 — #define m_cansee(mtmp, x2, y2)
 *                      clear_path((mtmp)->mx, (mtmp)->my, (x2), (y2))
 * The macro, verbatim.  It stood here as a `throw`, which made the whole of
 * mons_see_trap() below unreachable in practice; clear_path() is the real
 * Algorithm-C line-of-sight walk and has been in js/vision.js all along. */
function m_cansee(mtmp, x, y) {
    return clear_path(mtmp.mx | 0, mtmp.my | 0, x | 0, y | 0);
}

/* mons_see_trap — C ref: nethack-c/src/mondata.c:1640-1658 */
export function mons_see_trap(ttmp) {
    const tx = ttmp.tx | 0, ty = ttmp.ty | 0;
    const loc = game.level.at(tx, ty);
    const maxdist = loc.lit ? 7 * 7 : 2;

    for (let mtmp = game.fmon; mtmp; mtmp = mtmp.nmon) {
        if (is_animal(mtmp.data) || mindless(mtmp.data)
            || !haseyes(mtmp.data) || !mtmp.mcansee)
            continue;
        if (dist2(mtmp.mx, mtmp.my, tx, ty) > maxdist)
            continue;
        if (!m_cansee(mtmp, tx, ty))
            continue;
        mon_learns_traps(mtmp, ttmp.ttyp);
    }
}

function dmgtype(mon_data, ad_type) { return dmgtype_real(mon_data, ad_type); }

const AD_ANY = -1; /* monattk.h */

/* C mondata.c:53 attacktype */
export function attacktype(ptr, atyp) { return attacktype_fordmg(ptr, atyp, AD_ANY) ? true : false; }

export function passes_bars(mptr) {
    if (!mptr || mptr.pmidx === undefined)
        return false;

    /* If mptr is partial (only pmidx), reconstruct the full template */
    const ptr = (mptr.mlet !== undefined) ? mptr : permonstTemplate(mptr.pmidx | 0);
    if (!ptr)
        return false;

    const pmidx = (ptr.pmidx | 0);
    const mflags1 = (ptr.mflags1 | 0);
    const msize = (ptr.msize | 0);
    const mlet = (ptr.mlet | 0);

    /* Flags and sizes */
    const M1_WALLWALK = 0x00000008;
    const M1_AMORPHOUS = 0x00000004;
    const M1_UNSOLID = 0x00100000;
    const M1_SLITHY = 0x00080000;
    const M1_METALLIVORE = 0x80000000;
    const MZ_SMALL = 1;
    const MZ_LARGE = 3;
    const S_VORTEX = 22;
    const PM_AIR_ELEMENTAL = 154;

    /* C: passes_walls(ptr) */
    if ((mflags1 & M1_WALLWALK) !== 0)
        return true;
    /* C: amorphous(ptr) */
    if ((mflags1 & M1_AMORPHOUS) !== 0)
        return true;
    /* C: unsolid(ptr) */
    if ((mflags1 & M1_UNSOLID) !== 0)
        return true;
    /* C: is_whirly(ptr) — mlet == S_VORTEX || ptr == &mons[PM_AIR_ELEMENTAL] */
    if ((mlet | 0) === S_VORTEX || (pmidx | 0) === PM_AIR_ELEMENTAL)
        return true;
    /* C: verysmall(ptr) — msize < MZ_SMALL */
    if ((msize | 0) < MZ_SMALL)
        return true;
    /* C: dmgtype(ptr, AD_RUST) and dmgtype(ptr, AD_CORR) */
    const AD_RUST = 24;
    const AD_CORR = 42;
    if (dmgtype(ptr, AD_RUST) || dmgtype(ptr, AD_CORR))
        return true;
    /* C: metallivorous(ptr) */
    if ((mflags1 & M1_METALLIVORE) !== 0)
        return true;
    /* C: slithy(ptr) && !bigmonst(ptr) */
    if ((mflags1 & M1_SLITHY) !== 0 && (msize | 0) < MZ_LARGE)
        return true;
    return false;
}

/** C ref: nethack-c/src/mondata.c:639-650 breakarm(ptr)
 *  Creature will break out of armor.
 *  Returns true if the monster type can break/slip out of armor.
 *  Called with a permonst struct (may be partial with just pmidx).
 */
export function breakarm(ptr) {
    // Handle partial struct (just pmidx) by reconstructing full template
    const fullPtr = (ptr && ptr.mlet !== undefined) ? ptr : (ptr ? permonstTemplate(ptr.pmidx | 0) : null);

    if (!fullPtr) {
        return false;
    }

    // C: if (sliparm(ptr)) return FALSE;
    if (sliparm(fullPtr)) {
        return false;
    }

    // Local constants for size checks
    const MZ_SMALL = 1;
    const MZ_LARGE = 3;

    // C: return (boolean) (bigmonst(ptr)
    //                      || (ptr->msize > MZ_SMALL && !humanoid(ptr))
    //                      || ptr == &mons[PM_MARILITH]
    //                      || ptr == &mons[PM_WINGED_GARGOYLE]);

    // C: bigmonst(ptr) = (ptr->msize >= MZ_LARGE)
    const bigmonst = (fullPtr.msize | 0) >= MZ_LARGE;

    // C: humanoid(ptr) = (((ptr)->mflags1 & M1_HUMANOID) != 0L)
    const humanoid = ((fullPtr.mflags1 | 0) & M1_HUMANOID) !== 0;

    const pmidx = fullPtr.pmidx | 0;

    return bigmonst
        || ((fullPtr.msize | 0) > MZ_SMALL && !humanoid)
        || pmidx === PM_MARILITH
        || pmidx === PM_WINGED_GARGOYLE;
}

/* ---------------------------------------------------------------------------
 * locomotion — C ref: nethack-c/src/mondata.c:1379-1391
 * Returns the locomotion verb for a monster type.
 * No RNG, no state changes.
 * ---------------------------------------------------------------------------
 */
export function locomotion(ptr, def) {
    /* C: int locoindx = (*def != highc(*def)) ? 0 : 1; */
    const firstChar = def.length ? def.charCodeAt(0) : 0; /* *def of "" is '\0' */
    let upperChar = firstChar;
    if (0x61 <= firstChar && firstChar <= 0x7a) upperChar &= ~0x20;
    const locoindx = (firstChar !== upperChar) ? 0 : 1;

    /* locoverbs arrays (C: mondata.c:1367-1376) */
    const levitate = ["float", "Float", "wobble", "Wobble"];
    const flys = ["fly", "Fly", "flutter", "Flutter"];
    const flyl = ["fly", "Fly", "stagger", "Stagger"];
    const slither = ["slither", "Slither", "falter", "Falter"];
    const ooze = ["ooze", "Ooze", "tremble", "Tremble"];
    const immobile = ["wiggle", "Wiggle", "pulsate", "Pulsate"];
    const crawl = ["crawl", "Crawl", "falter", "Falter"];

    /* permonst fields */
    const mflags1 = ptr.mflags1 | 0;
    const msize = ptr.msize | 0;
    const mmove = ptr.mmove | 0;
    const mlet = ptr.mlet | 0;

    /* M1 flags (mondata.h) */
    const M1_FLY = 0x00000001;
    /* monflag.h:99 — M1_NOLIMBS is a TWO-BIT composite (M1_NOHANDS 0x2000
     * included); mondata.h:53 nolimbs(ptr) requires BOTH bits, not just one. */
    const M1_NOLIMBS = 0x00006000;
    const M1_SLITHY = 0x00080000;
    const M1_AMORPHOUS = 0x00000004;
    const MZ_SMALL = 1;

    /* C macros inlined */
    /* C mondata.h:20 — is_floater(ptr) == (mlet == S_EYE || mlet == S_LIGHT) */
    const is_floater = (mlet === S_EYE || mlet === S_LIGHT);
    /* C mondata.h:19 */
    const is_flyer = (mflags1 & M1_FLY) !== 0;
    const slithy = (mflags1 & M1_SLITHY) !== 0;
    const amorphous = (mflags1 & M1_AMORPHOUS) !== 0;
    /* C mondata.h:53 — ((mflags1 & M1_NOLIMBS) == M1_NOLIMBS), all bits set. */
    const nolimbs = (mflags1 & M1_NOLIMBS) === M1_NOLIMBS;

    /* C: return (is_floater(ptr) ? levitate[locoindx]
            : (is_flyer(ptr) && ptr->msize <= MZ_SMALL) ? flys[locoindx]
              : (is_flyer(ptr) && ptr->msize > MZ_SMALL) ? flyl[locoindx]
                : slithy(ptr) ? slither[locoindx]
                  : amorphous(ptr) ? ooze[locoindx]
                    : !ptr->mmove ? immobile[locoindx]
                      : nolimbs(ptr) ? crawl[locoindx]
                        : def); */
    if (is_floater) return levitate[locoindx];
    if (is_flyer && msize <= MZ_SMALL) return flys[locoindx];
    if (is_flyer && msize > MZ_SMALL) return flyl[locoindx];
    if (slithy) return slither[locoindx];
    if (amorphous) return ooze[locoindx];
    if (!mmove) return immobile[locoindx];
    if (nolimbs) return crawl[locoindx];
    return def;
}

/* ---------------------------------------------------------------------------
 * stagger — C ref: nethack-c/src/mondata.c:1394-1408
 * Returns the stagger verb for a monster type (indices 2/3 of locoverbs).
 * No RNG, no state changes.
 * ---------------------------------------------------------------------------
 */
export function stagger(ptr, def) {
    /* C: int locoindx = (*def != highc(*def)) ? 2 : 3; */
    const firstChar = def.length ? def.charCodeAt(0) : 0; /* *def of "" is '\0' */
    let upperChar = firstChar;
    if (0x61 <= firstChar && firstChar <= 0x7a) upperChar &= ~0x20;
    const locoindx = (firstChar !== upperChar) ? 2 : 3;

    /* locoverbs arrays (C: mondata.c:1367-1376) */
    const levitate = ["float", "Float", "wobble", "Wobble"];
    const flys = ["fly", "Fly", "flutter", "Flutter"];
    const flyl = ["fly", "Fly", "stagger", "Stagger"];
    const slither = ["slither", "Slither", "falter", "Falter"];
    const ooze = ["ooze", "Ooze", "tremble", "Tremble"];
    const immobile = ["wiggle", "Wiggle", "pulsate", "Pulsate"];
    const crawl = ["crawl", "Crawl", "falter", "Falter"];

    /* permonst fields */
    const mflags1 = ptr.mflags1 | 0;
    const msize = ptr.msize | 0;
    const mmove = ptr.mmove | 0;
    const mlet = ptr.mlet | 0;

    /* M1 flags (mondata.h) */
    const M1_FLY = 0x00000001;
    /* monflag.h:99 — M1_NOLIMBS is a TWO-BIT composite (M1_NOHANDS 0x2000
     * included); mondata.h:53 nolimbs(ptr) requires BOTH bits, not just one. */
    const M1_NOLIMBS = 0x00006000;
    const M1_SLITHY = 0x00080000;
    const M1_AMORPHOUS = 0x00000004;
    const MZ_SMALL = 1;

    /* C macros inlined */
    /* C mondata.h:20 — is_floater(ptr) == (mlet == S_EYE || mlet == S_LIGHT) */
    const is_floater = (mlet === S_EYE || mlet === S_LIGHT);
    /* C mondata.h:19 */
    const is_flyer = (mflags1 & M1_FLY) !== 0;
    const slithy = (mflags1 & M1_SLITHY) !== 0;
    const amorphous = (mflags1 & M1_AMORPHOUS) !== 0;
    /* C mondata.h:53 — ((mflags1 & M1_NOLIMBS) == M1_NOLIMBS), all bits set. */
    const nolimbs = (mflags1 & M1_NOLIMBS) === M1_NOLIMBS;

    /* C: return (is_floater(ptr) ? levitate[locoindx]
            : (is_flyer(ptr) && ptr->msize <= MZ_SMALL) ? flys[locoindx]
              : (is_flyer(ptr) && ptr->msize > MZ_SMALL) ? flyl[locoindx]
                : slithy(ptr) ? slither[locoindx]
                  : amorphous(ptr) ? ooze[locoindx]
                    : !ptr->mmove ? immobile[locoindx]
                      : nolimbs(ptr) ? crawl[locoindx]
                        : def); */
    if (is_floater) return levitate[locoindx];
    if (is_flyer && msize <= MZ_SMALL) return flys[locoindx];
    if (is_flyer && msize > MZ_SMALL) return flyl[locoindx];
    if (slithy) return slither[locoindx];
    if (amorphous) return ooze[locoindx];
    if (!mmove) return immobile[locoindx];
    if (nolimbs) return crawl[locoindx];
    return def;
}

/* C ref: nethack-c/src/mondata.c:214-244 resists_magm(struct monst *mon)
 * Check if a monster has magic resistance.
 * Returns boolean: TRUE if magic resistance granted by dmgtype, special form,
 * wielded weapon, worn armor, or carried items.
 * No RNG calls (rng_calls_count: 0).
 * Args: mon (struct monst *)
 * Return: boolean (JS: true/false; C: TRUE/FALSE)
 */
export function resists_magm(mon) {
    const AD_MAGM = 1;
    const AD_RBRE = 242;  /* random breath weapon */
    const WEAPON_CLASS = 2;

    if (!mon) return false;

    const ptr = mon.data;
    /* C: `mon == &gy.youmonst` (mondata.c resists_magm/Resists_Elem).  Pointer
     * equality alone misses the replay-reconstructed hero; see xm_same_monst(). */
    const is_you = is_youmonst(mon);

    if (dmgtype(ptr, AD_MAGM)
        || (ptr && (ptr.pmidx | 0) === PM_BABY_GRAY_DRAGON)
        || dmgtype(ptr, AD_RBRE)) {
        return true;
    }

    /* check for magic resistance granted by wielded weapon */
    let o = is_you ? (game?.u?.uwep ?? null) : MON_WEP(mon);
    if (o && (o.oartifact | 0) && defends(AD_MAGM, o)) {
        return true;
    }

    /* check for magic resistance granted by worn or carried items */
    o = is_you ? (game.invent ?? null) : (mon.minvent ?? null);

    let slotmask = W_ARMOR | W_ACCESSORY;

    if (!is_you || (game?.u?.uwep && ((game.u.uwep.oclass | 0) === WEAPON_CLASS || is_weptool(game.u.uwep)))) {
        slotmask |= W_WEP;
    }

    if (is_you && (game?.u?.twoweap | 0)) {
        slotmask |= W_SWAPWEP;
    }

    for (; o; o = o.nobj) {
        if (((o.owornmask | 0) & slotmask) !== 0
             && (MKOBJ_OC_OPROP[o.otyp | 0] | 0) === ANTIMAGIC) {
            return true;
        }
        if ((o.oartifact | 0) && defends_when_carried(AD_MAGM, o)) {
            return true;
        }
    }

    return false;
}

export function Resists_Elem(mon, propindx) {
    const ALCHEMY_SMOCK = 144; /* objclass.h enum value (matches objnam.js) */
    const WEAPON_CLASS = 2;

    if (!mon) return false;
    /* C: `mon == &gy.youmonst` (mondata.c resists_magm/Resists_Elem).  Pointer
     * equality alone misses the replay-reconstructed hero; see xm_same_monst(). */
    const is_you = is_youmonst(mon);
    let u_resist = 0, damgtype = 0, rsstmask = 0;

    switch (propindx) {
    case FIRE_RES:   /* 1 */
    case COLD_RES:   /* 2 */
    case SLEEP_RES:  /* 3 */
    case DISINT_RES: /* 4 */
    case SHOCK_RES:  /* 5 */
    case POISON_RES: /* 6 */
    case ACID_RES:   /* 7 */
    case STONE_RES:  /* 8 */
        damgtype = propindx + 1;        /* damgtype 2..9 */
        rsstmask = 1 << (propindx - 1); /* 1,2,4,...,128 */
        u_resist = (game?.u?.uprops?.[propindx]?.intrinsic
                    || game?.u?.uprops?.[propindx]?.extrinsic) ? 1 : 0;
        break;
    /* accept these, but callers are expected to use their routines directly */
    case ANTIMAGIC:
        return resists_magm(mon);
    case DRAIN_RES:
        return resists_drli(mon);
    case BLND_RES:
        return resists_blnd(mon);
    default:
        impossible_sync("Resists_Elem(%d), unexpected property type", propindx);
        return false;
    }

    const ptr = mon.data;
    const rbits = ((ptr ? (ptr.mresists | 0) : 0)
                   | (mon.mextrinsics | 0) | (mon.mintrinsics | 0));
    if (is_you ? u_resist : ((rbits & rsstmask) !== 0))
        return true;

    /* resistance granted by wielded artifact weapon */
    let o = is_you ? (game?.u?.uwep ?? null) : MON_WEP(mon);
    if (o && (o.oartifact | 0) && defends(damgtype, o))
        return true;

    /* resistance granted by worn or carried items */
    o = is_you ? (game.invent ?? null) : (mon.minvent ?? null);
    let slotmask = W_ARMOR | W_ACCESSORY;
    if (!is_you
        || (game?.u?.uwep && ((game.u.uwep.oclass | 0) === WEAPON_CLASS || is_weptool(game.u.uwep))))
        slotmask |= W_WEP;
    if (is_you && (game?.u?.twoweap | 0))
        slotmask |= W_SWAPWEP;

    for (; o; o = o.nobj)
        if ((((o.owornmask | 0) & slotmask) !== 0
             && (MKOBJ_OC_OPROP[o.otyp | 0] | 0) === propindx)
            || (((o.owornmask | 0) & W_ARMC) === W_ARMC
                && (o.otyp | 0) === ALCHEMY_SMOCK
                && (propindx === POISON_RES || propindx === ACID_RES))
            || ((o.oartifact | 0) && defends_when_carried(damgtype, o)))
            return true;
    return false;
}

/* C mondata.c:200-211 resists_drli(mon). */
export function resists_drli(mon) {
    const ptr = mon?.data || mon;
    const pmidx = (ptr?.pmidx ?? mon?.mndx ?? mon?.mnum ?? -1) | 0;
    if (is_undead(ptr) || is_demon(ptr) || is_were(ptr)) return true;
    if ((is_youmonst(mon) && ((game.u?.ulycn ?? -1) | 0) >= LOW_PM)
        || pmidx === PM_DEATH || (mon && is_vampshifter(mon)))
        return true;
    return defended(mon, AD_DRLI);
}

export function resists_blnd(mon) {
    const ptr = mon ? mon.data : null;
    const is_you = is_youmonst(mon);

    if (is_you ? (xm_Blind() || Unaware())
               : ((mon.mblinded | 0) || !(mon.mcansee | 0) || !haseyes(ptr)
                  /* C's own BUG note: temporary sleep sets mfrozen, but so does
                     paralysis, so mfrozen cannot be checked here. */
                  || (mon.msleeping | 0)))
        return true;
    /* yellow light, Archon; !dust vortex, !cobra, !raven */
    if (dmgtype_fromattack(ptr, AD_BLND, AT_EXPL)
        || dmgtype_fromattack(ptr, AD_BLND, AT_GAZE))
        return true;
    /* Sunsword */
    if (resists_blnd_by_arti(mon))
        return true;
    /* catchall */
    if (is_you && _Blnd_resist()) {
        impossible_sync("'Blnd_resist' but not resists_blnd()?");
        return true;
    }
    return false;
}

/* C youprop.h Blnd_resist == (HBlnd_resist || EBlnd_resist), including the
 * extrinsic resistance from wielding Sunsword. */
function _Blnd_resist() {
    const pr = game?.u?.uprops?.[BLND_RES];
    return !!(pr && ((pr.intrinsic | 0) || (pr.extrinsic | 0)));
}

/* C ref: mondata.c:278 resists_blnd_by_arti(mon). */
export function resists_blnd_by_arti(mon) {
    const is_you = is_youmonst(mon);
    let o = is_you ? (game?.u?.uwep ?? null) : MON_WEP(mon);
    if (o && o.oartifact && defends(AD_BLND, o))
        return true;
    o = is_you ? (game.invent ?? null) : (mon.minvent ?? null);
    for (; o; o = o.nobj)
        if (defends_when_carried(AD_BLND, o))
            return true;
    return false;
}

/* monattk.h:53 AD_BLND. */
const AD_BLND = 11;

function MON_WEP(mon) {
    if (!mon) return null;
    return mon.mw ?? null;
}

/* C ref: artifact.c defends(adtyp, otmp) / defends_when_carried(adtyp, otmp).
 * Both are one line over get_artifact(otmp), which is
 *   ((obj && obj->oartifact) ? &artilist[(int) obj->oartifact] : 0)
 * so a non-artifact answers FALSE without consulting any table.  The two adtyp
 * columns come from js/attrib.js, which parsed them out of
 * nethack-c-v5/upstream/include/artilist.h's A() X-macro and validated the
 * parse against the compiled spfx column — see the provenance note there.
 *
 * These were throw-stubs; resists_prop() below calls BOTH of them, guarded only
 * by obj->oartifact, so a hero wielding or carrying ANY artifact and asked for
 * a resistance halted the run.  No RNG on either side. */
function defends(adtyp, obj) {
    const a = obj ? (obj.oartifact | 0) : 0;
    if (a)
        return arti_defn_adtyp(a) === (adtyp | 0);
    /* C artifact.c:644-681 if (Is_dragon_armor(otmp)): Is_dragon_mail
     * (GRAY_DRAGON_SCALE_MAIL 101..YELLOW 110) converts to scales
     * (GRAY_DRAGON_SCALES 111..YELLOW 120; shimmering is #if 0 in v5
     * objects.h).  AD_MAGM 1 -> gray, AD_HALU 36 -> GOLD_DRAGON_SCALES,
     * AD_FIRE 2 -> RED_DRAGON_SCALES, ... per monattk.h. */
    let otyp = obj ? (obj.otyp | 0) : 0;
    if (otyp >= 101 && otyp <= 110)
        otyp += 10;
    else if (otyp < 111 || otyp > 120)
        return false;
    switch (adtyp | 0) {
    case 1:  return otyp === 111;
    case 36: return otyp === 112;
    case 2:  return otyp === 114;
    case 3:  return otyp === 115;
    case 7:
    case 33: return otyp === 119;
    case 4:
    case 14: return otyp === 116;
    case 5:
    case 15: return otyp === 117;
    case 6:
    case 13: return otyp === 118;
    case 8:
    case 18: return otyp === 120;
    default: return false;
    }
}

/* C mondata.c:91-125 defended(mon, adtyp): wielded defensive artifact,
 * worn dragon armor, or an adult dragon's own scales. */
export function defended(mon, adtyp) {
    if (!mon)
        return false;
    const is_you = is_youmonst(mon);
    let o = is_you ? (game?.u?.uwep ?? null) : MON_WEP(mon);
    if (o && (o.oartifact | 0) && defends(adtyp, o))
        return true;

    const mndx = (mon.data?.pmidx ?? mon.mnum ?? mon.mndx ?? -1) | 0;
    if (mndx >= PM_GRAY_DRAGON && mndx <= PM_YELLOW_DRAGON)
        o = { oclass: ARMOR_CLASS,
              otyp: GRAY_DRAGON_SCALES + (mndx - PM_GRAY_DRAGON) };
    else
        o = is_you ? (game?.u?.uarm ?? null) : which_armor(mon, W_ARM);
    /* objects.h Is_dragon_armor: GRAY_DRAGON_SCALE_MAIL..YELLOW_DRAGON_SCALES */
    return !!(o && (o.otyp | 0) >= GRAY_DRAGON_SCALE_MAIL
              && (o.otyp | 0) <= YELLOW_DRAGON_SCALES
              && defends(adtyp, o));
}

/* ---------------------------------------------------------------------------
 * can_blnd — C ref: nethack-c/src/mondata.c:304-399
 * Returns TRUE if mdef can be blinded by the given attack.
 * No RNG, no state changes.
 * ---------------------------------------------------------------------------
 */
export function can_blnd(magr, mdef, aatyp, obj) {
    const is_you = is_youmonst(mdef);
    let check_visor = false;
    let o;

    /* no eyes protect against all attacks for now */
    if (!haseyes(mdef.data))
        return false;

    /* if monster has been permanently blinded, the deed is already done */
    if (!is_you && mon_perma_blind(mdef))
        return false;

    /* ravens don't blind each other */
    if (magr && magr.data.pmidx === PM_RAVEN && mdef.data.pmidx === PM_RAVEN)
        return false;

    switch (aatyp) {
    case AT_EXPL: /* 13 */
    case AT_BOOM: /* 14 */
    case AT_GAZE: /* 15 */
    case AT_MAGC: /* 255 */
    case AT_BREA: /* 12 — assumed to be lightning */
        /* light-based attacks may be cancelled or resisted */
        if (magr && magr.mcan)
            return false;
        return !resists_blnd(mdef);

    case AT_WEAP: /* 254 */
    case AT_SPIT: /* 10 */
    case AT_NONE: /* 0 */
        if (obj && obj.otyp === CREAM_PIE) {
            if (is_you && Blindfolded())
                return false;
        } else if (obj && obj.otyp === BLINDING_VENOM) {
            if (is_you && (ublindf_p() || game.u.ucreamed))
                return false;
            check_visor = true;
        } else if (obj && obj.otyp === POT_BLINDNESS) {
            return true; /* no defense */
        } else
            return false; /* other objects cannot cause blindness yet */
        if ((magr !== null && is_youmonst(magr)) && game.u.uswallow)
            return false;
        break;

    case AT_ENGL: /* 11 */
        if (is_you && (Blindfolded() || Unaware() || game.u.ucreamed))
            return false;
        if (!is_you && mdef.msleeping)
            return false;
        break;

    case AT_CLAW: /* 1 */
        if (is_you && ublindf_p())
            return false;
        if ((magr !== null && is_youmonst(magr)) && game.u.uswallow)
            return false;
        check_visor = true;
        break;

    case AT_TUCH: /* 5 */
    case AT_STNG: /* 6 */
        if (magr && magr.mcan)
            return false;
        break;

    default:
        break;
    }

    /* check if wearing a visor (only checked if visor might help) */
    if (check_visor) {
        o = is_youmonst(mdef) ? game.invent : mdef.minvent;
        for (; o; o = o.nobj)
            if (((o.owornmask | 0) & W_ARMH)
                && objdescr_is(o, "visored helmet"))
                return false;
    }

    return true;
}

/* Helper stubs and local constants for can_blnd */
const PM_RAVEN = 128;

const BLINDING_VENOM = 479; /* objects.h VENOM() BLINDING_VENOM; was 250 = FROST_HORN */

const POT_BLINDNESS = 300; /* objects.h POTION() BLINDNESS; was 246 = MAGIC_WHISTLE */

/* objects.h LENSES otyp is 232 (the TOOL_CLASS run; js/u_init.js:962 and
 * js/objnam.js agree).  This said 373, a spellbook slot, which made
 * Blindfolded() below report TRUE for a hero wearing lenses — C's
 * youprop.h Blindfolded is `(ublindf && ublindf->otyp != LENSES)`. */
const LENSES = 232;

function Blindfolded() {
    const u = game.u;
    return !!(u && u.ublindf && u.ublindf.otyp !== LENSES);
}

function ublindf_p() {
    const u = game.u;
    return !!(u && u.ublindf);
}

function Unaware() {
    const u = game.u;
    /* C youprop.h:399: gm.multi < 0 && (unconscious() || is_fainted()). */
    if (!u || (game.multi | 0) >= 0)
        return false;
    const nmm = game.nomovemsg;
    const unconscious = !!(u.usleep || (nmm && (nmm.startsWith('You awake')
        || nmm.startsWith('You regain con') || nmm.startsWith('You are consci'))));
    return unconscious || ((u.uhs | 0) === FAINTED);
}

function mon_perma_blind(mdef) {
    return !!(mdef && !(mdef.mcansee | 0) && !(mdef.mblinded | 0)); /* monst.h:253 */
}


// ── Helpers for name_to_monplus ─────────────────────────────────────────────
function lowc(c) {
    const cc = typeof c === 'string' ? c.charCodeAt(0) : c;
    return (cc >= 65 && cc <= 90) ? cc + 32 : cc;
}

function strcmpi(s1, s2) {
    const n = Math.max(s1.length, s2.length);
    for (let i = 0; i < n; i++) {
        if (!s2[i]) return (s1[i] !== undefined) ? 1 : 0;
        if (!s1[i]) return -1;
        const c1 = lowc(s1[i]);
        const c2 = lowc(s2[i]);
        if (c1 !== c2) return (c1 > c2) ? 1 : -1;
    }
    return 0;
}

function strncmp(a, b, n) {
    if (!a || !b) return a === b ? 0 : (a ? 1 : -1);
    for (let i = 0; i < n; i++) {
        if (i >= a.length && i >= b.length) return 0;
        if (i >= a.length) return -1;
        if (i >= b.length) return 1;
        if (a.charCodeAt(i) !== b.charCodeAt(i))
            return a.charCodeAt(i) - b.charCodeAt(i);
    }
    return 0;
}

function strncmpi(s1, s2, n) {
    for (let i = 0; i < n; i++) {
        if (i >= s1.length && i >= s2.length) return 0;
        if (i >= s1.length) return -1;
        if (i >= s2.length) return 1;
        const c1 = lowc(s1[i]);
        const c2 = lowc(s2[i]);
        if (c1 !== c2) return (c1 > c2) ? 1 : -1;
    }
    return 0;
}

function strstri(haystack, needle) {
    const nlen = needle.length;
    if (nlen === 0) return -1;
    for (let i = 0; i <= haystack.length - nlen; i++) {
        if (strncmpi(haystack.substring(i), needle, nlen) === 0)
            return i;
    }
    return -1;
}

// ── PM constants needed by alt_spl table ────────────────────────────────────
// Every value below is the mons[] index of the named monster, i.e. exactly what
// mondata.c:946 `static const struct alt_spl names[]` returns from
// name_to_monplus(). The names here already matched C one-for-one; 31 of the 37
// VALUES did not — they were resolved against a stale index space, so e.g.
// "grey dragon" answered PM_GIANT_SPIDER (96) and "watchmen" answered PM_YETI
// (236). Nothing downstream can depend on the old values: namep[1] is returned
// straight to the caller as "the monster this spelling names", so a wrong index
// is a wrong monster, never a compensating one.
// row-for-row against js/makemon_pmnames.json); re-check with
const PM_GRAY_DRAGON = 143;              /* was 96  = giant spider */

// PM_BABY_GRAY_DRAGON already imported from pm.generated.js
const PM_GRAY_UNICORN = 102;

const PM_GRAY_OOZE = 206;                /* was 210 = quantum mechanic */

const PM_GREY_ELF = 267;                 /* was 68  = water nymph */

const PM_MIND_FLAYER = 48;

const PM_MASTER_MIND_FLAYER = 49;

// PM_ALIGNED_CLERIC, PM_HIGH_CLERIC already defined in this module
const PM_MASTER_OF_THIEVES = 352;        /* was 199 = red naga */

const PM_MASTER_ASSASSIN = 365;          /* was 200 = black naga */

const PM_MASTER_LICH = 185;              /* was 226 = vampire */

const PM_STALKER = 153;                  /* was 134 = baby gold dragon */

const PM_ELVEN_MONARCH = 269;            /* was 70  = goblin */

const PM_WOODLAND_ELF = 265;             /* was 66  = giant mimic */

const PM_WOOD_NYMPH = 67;                /* was 56  = blue jelly */

const PM_HOBBIT = 43;                    /* was 5   = queen bee */

const PM_DJINNI = 315;                   /* was 142 = baby yellow dragon */

const PM_HUMAN_WERERAT = 261;            /* was 88  = sewer rat */

const PM_HUMAN_WEREJACKAL = 262;         /* was 89  = giant rat */

const PM_HUMAN_WEREWOLF = 263;           /* was 90  = rabid rat */

const PM_WERERAT = 91;

const PM_WEREJACKAL = 15;                /* was 92  = rock mole */

const PM_WEREWOLF = 21;                  /* was 93  = woodchuck */

const PM_KI_RIN = 124;

const PM_URUK_HAI = 75;                  /* was 74  = Mordor orc */

const PM_ORC_CAPTAIN = 77;               /* was 73  = hill orc */

const PM_GREEN_ELF = 266;                /* was 65  = large mimic */

const PM_ELF_NOBLE = 268;                /* was 69  = mountain nymph */

const PM_OLOG_HAI = 224;                 /* was 76  = orc shaman */

const PM_ARCH_LICH = 186;                /* was 228 = Vlad the Impaler */

const PM_AMOROUS_DEMON = 290;

const PM_VIOLET_FUNGUS = 164;            /* was 212 = rust monster */

const PM_HOMUNCULUS = 51;                /* was 295 = vrock */

const PM_BALUCHITHERIUM = 86;            /* was 324 = iguana */

const PM_LURKER_ABOVE = 98;              /* was 158 = lichen */

const PM_CAVE_DWELLER = 333;             /* was 178 = jabberwock */

const PM_MUMAK = 82;                     /* was 329 = salamander */

const PM_ERINYS = 292;                   /* was 308 = Baalzebub */

const NUM_MGENDERS = 3;

export function name_to_monplus(in_str, remainder_p, gender_name_var) {
    let mntmp = NON_PM;
    let matchgend = -1;
    let exact_match = false;
    let len = 0;

    if (remainder_p !== null && remainder_p !== undefined)
        remainder_p.value = null;

    // Copy in_str and track offset from original
    let stripoff = 0;
    let str = in_str;

    if (strncmp(str, "a ", 2) === 0) {
        str = str.substring(2);
        stripoff += 2;
    } else if (strncmp(str, "an ", 3) === 0) {
        str = str.substring(3);
        stripoff += 3;
    } else if (strncmp(str, "the ", 4) === 0) {
        str = str.substring(4);
        stripoff += 4;
    }

    let slen = str.length;

    // Handle "vortices"
    let vortIdx = strstri(str, "vortices");
    if (vortIdx !== -1) {
        // C mondata.c:934: Strcpy(s + 4, "ex") also truncates the suffix.
        str = str.substring(0, vortIdx + 4) + "ex";
    } else if (slen > 3 && strcmpi(str.substring(slen - 3), "ies") === 0
               && (slen < 7 || strcmpi(str.substring(slen - 7), "zombies") !== 0)) {
        str = str.substring(0, slen - 3) + "y";
    } else if (slen > 3 && strcmpi(str.substring(slen - 3), "ves") === 0) {
        str = str.substring(0, slen - 3) + "f";
    }

    slen = str.length;

    // alt_spl table
    const names = [
        ["grey dragon", PM_GRAY_DRAGON, NEUTRAL],
        ["baby grey dragon", PM_BABY_GRAY_DRAGON, NEUTRAL],
        ["grey unicorn", PM_GRAY_UNICORN, NEUTRAL],
        ["grey ooze", PM_GRAY_OOZE, NEUTRAL],
        ["gray-elf", PM_GREY_ELF, NEUTRAL],
        ["mindflayer", PM_MIND_FLAYER, NEUTRAL],
        ["master mindflayer", PM_MASTER_MIND_FLAYER, NEUTRAL],
        ["aligned priest", PM_ALIGNED_CLERIC, MALE],
        ["aligned priestess", PM_ALIGNED_CLERIC, FEMALE],
        ["high priest", PM_HIGH_CLERIC, MALE],
        ["high priestess", PM_HIGH_CLERIC, FEMALE],
        ["master of thief", PM_MASTER_OF_THIEVES, NEUTRAL],
        ["master thief", PM_MASTER_OF_THIEVES, NEUTRAL],
        ["master of assassin", PM_MASTER_ASSASSIN, NEUTRAL],
        ["master-lich", PM_MASTER_LICH, NEUTRAL],
        ["masterlich", PM_MASTER_LICH, NEUTRAL],
        ["invisible stalker", PM_STALKER, NEUTRAL],
        ["high-elf", PM_ELVEN_MONARCH, NEUTRAL],
        ["wood-elf", PM_WOODLAND_ELF, NEUTRAL],
        ["wood elf", PM_WOODLAND_ELF, NEUTRAL],
        ["woodland nymph", PM_WOOD_NYMPH, NEUTRAL],
        ["halfling", PM_HOBBIT, NEUTRAL],
        ["genie", PM_DJINNI, NEUTRAL],
        ["human wererat", PM_HUMAN_WERERAT, NEUTRAL],
        ["human werejackal", PM_HUMAN_WEREJACKAL, NEUTRAL],
        ["human werewolf", PM_HUMAN_WEREWOLF, NEUTRAL],
        ["rat wererat", PM_WERERAT, NEUTRAL],
        ["jackal werejackal", PM_WEREJACKAL, NEUTRAL],
        ["wolf werewolf", PM_WEREWOLF, NEUTRAL],
        ["ki rin", PM_KI_RIN, NEUTRAL],
        ["kirin", PM_KI_RIN, NEUTRAL],
        ["uruk hai", PM_URUK_HAI, NEUTRAL],
        ["orc captain", PM_ORC_CAPTAIN, NEUTRAL],
        ["woodland elf", PM_WOODLAND_ELF, NEUTRAL],
        ["green elf", PM_GREEN_ELF, NEUTRAL],
        ["grey elf", PM_GREY_ELF, NEUTRAL],
        ["gray elf", PM_GREY_ELF, NEUTRAL],
        ["elf lady", PM_ELF_NOBLE, FEMALE],
        ["elf lord", PM_ELF_NOBLE, MALE],
        ["elf noble", PM_ELF_NOBLE, NEUTRAL],
        ["olog hai", PM_OLOG_HAI, NEUTRAL],
        ["arch lich", PM_ARCH_LICH, NEUTRAL],
        ["archlich", PM_ARCH_LICH, NEUTRAL],
        ["incubi", PM_AMOROUS_DEMON, MALE],
        ["succubi", PM_AMOROUS_DEMON, FEMALE],
        ["violet fungi", PM_VIOLET_FUNGUS, NEUTRAL],
        ["homunculi", PM_HOMUNCULUS, NEUTRAL],
        ["baluchitheria", PM_BALUCHITHERIUM, NEUTRAL],
        ["lurkers above", PM_LURKER_ABOVE, NEUTRAL],
        ["cavemen", PM_CAVE_DWELLER, MALE],
        ["cavewomen", PM_CAVE_DWELLER, FEMALE],
        ["watchmen", PM_WATCHMAN, NEUTRAL],
        ["djinn", PM_DJINNI, NEUTRAL],
        ["mumakil", PM_MUMAK, NEUTRAL],
        ["erinyes", PM_ERINYS, NEUTRAL],
        [null, NON_PM, NEUTRAL]
    ];

    for (const namep of names) {
        if (!namep[0]) break;
        const nlen = namep[0].length;
        if (strncmpi(str, namep[0], nlen) === 0
            && (nlen >= str.length || str[nlen] === ' ' || str[nlen] === "'")) {
            if (remainder_p !== null && remainder_p !== undefined)
                remainder_p.value = in_str.substring(stripoff + nlen);
            if (gender_name_var !== null && gender_name_var !== undefined)
                gender_name_var.value = namep[2];
            return namep[1];
        }
    }

    // Main loop through mons
    const NUMMONS = MONS_CT.length;
    for (let i = LOW_PM; i < NUMMONS; i++) {
        for (let mgend = MALE; mgend < NUM_MGENDERS; mgend++) {
            let mname;
            try {
                mname = monPmname(i, mgend);
            } catch (e) {
                continue;
            }
            if (!mname) continue;
            // If this is MALE or FEMALE and the name is identical to the
            // NEUTRAL name, skip — it's a fallback (C's pmnames[mgend] would
            // be NULL for this gender).
            if (mgend !== NEUTRAL) {
                let nname;
                try { nname = monPmname(i, NEUTRAL); } catch (e) { nname = null; }
                if (nname && nname === mname) continue;
            }

            const m_i_len = mname.length;
            if (m_i_len > len
                && strncmpi(mname, str, m_i_len) === 0) {
                if (m_i_len === slen) {
                    mntmp = i;
                    len = m_i_len;
                    matchgend = mgend;
                    exact_match = true;
                    break;
                } else if (slen > m_i_len
                           && (str[m_i_len] === ' '
                               || strcmpi(str.substring(m_i_len), "s") === 0
                               || strncmpi(str.substring(m_i_len), "s ", 2) === 0
                               || strcmpi(str.substring(m_i_len), "'") === 0
                               || strncmpi(str.substring(m_i_len), "' ", 2) === 0
                               || strcmpi(str.substring(m_i_len), "'s") === 0
                               || strncmpi(str.substring(m_i_len), "'s ", 3) === 0
                               || strcmpi(str.substring(m_i_len), "es") === 0
                               || strncmpi(str.substring(m_i_len), "es ", 3) === 0)) {
                    mntmp = i;
                    len = m_i_len;
                    matchgend = mgend;
                }
            }
        }
        if (exact_match)
            break;
    }

    if (mntmp === NON_PM) {
        const lenRef = { value: 0 };
        mntmp = title_to_mon(str, null, lenRef);
        len = lenRef.value;
    }

    if (len && remainder_p !== null && remainder_p !== undefined)
        remainder_p.value = in_str.substring(stripoff + len);
    if (gender_name_var !== null && gender_name_var !== undefined && matchgend !== -1) {
        if (gender_name_var.value === -1 || matchgend !== NEUTRAL)
            gender_name_var.value = matchgend;
    }
    return mntmp;
}

/* C mondata.c:663-674 cantvomit(). */
export function cantvomit(ptr) {
    const pmidx = ptr?.pmidx | 0;
    if ((ptr?.mlet | 0) === S_RODENT
        && pmidx !== PM_ROCK_MOLE && pmidx !== PM_WOODCHUCK)
        return true;
    return pmidx === PM_PONY || pmidx === PM_HORSE || pmidx === PM_WARHORSE;
}

/* C ref: mondata.c:1552-1568 monstseesu(seenres) — every monster that can see
 * the hero records that the hero RESISTED this damage type, so it stops
 * choosing that attack.  RNG-free; the mirror of js/mhitm.js's exported
 * monstunseesu(), which clears the same bit on the same monster set.  Was a
 * throwing stub here, shadowing nothing (C has one body; js/muse.js:441 carries
 * the same transcription file-locally) — drinksink's scalding-water arm
 * (fountain.c:617) is a live caller, so give it the real body. */
export function monstseesu(seenres) {
    return monstseesu_real(seenres);
}

/* C ref: mondata.c:1617 mon_knows_traps — has mtmp seen this trap type? */
export function mon_knows_traps(mtmp, ttyp) {
    return mon_knows_traps_real(mtmp, ttyp);
}

/* C ref: mondata.c:1628 mon_learns_traps */
export function mon_learns_traps(mtmp, ttyp) {
    if (ttyp === ALL_TRAPS)
        mtmp.mtrapseen = ~0;
    else if (ttyp === NO_TRAP)
        mtmp.mtrapseen = 0;
    else
        mtmp.mtrapseen = (mtmp.mtrapseen | 0) | (1 << (ttyp - 1));
}

/* C ref: mondata.h sticks(ptr) — the hero's form can hold a monster.  Read only
 * as the second half of `u.ustuck && !sticks(...)`, and u.ustuck is null for
 * every turn of the guard escort. */
export function sticks(ptr) { return sticks_real(ptr); }
