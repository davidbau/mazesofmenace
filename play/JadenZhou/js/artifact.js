// artifact.js -- artifact table and existence tracking.
// C ref: artifact.c (artilist[] from include/artilist.h, artiexist[]).
//
// Ported so far: the artilist[] table, init_artifacts()/hack_artifacts(),
// artifact_name(), exist_artifact(), artifact_exists(), artifact_origin(),
// found_artifact(), nartifact_exist().  Artifact powers (spec_abon,
// spec_dbon, touch_artifact, invoke, ...), mk_artifact() and artidisco[]
// are not ported yet.

import { game } from './gstate.js';
import { strncmpi, strcmpi, fuzzymatch } from './hacklib.js';
import * as O from './objects.js';
import * as M from './monsters.js';
import {
    A_NONE, A_LAWFUL, A_NEUTRAL, A_CHAOTIC, NON_PM,
    INVIS, LEVITATION, CONFLICT, LAST_PROP,
    ONAME_VIA_NAMING, ONAME_WISH, ONAME_GIFT, ONAME_VIA_DIP,
    ONAME_LEVEL_DEF, ONAME_BONES, ONAME_RANDOM, ONAME_KNOW_ARTI,
} from './const.js';
import { aligns } from './role.js';
import { NROFARTIFACTS, ART_EXCALIBUR, ART_NONARTIFACT,
         AFTER_LAST_ARTIFACT } from './artilist.js';
import { rn2 } from './rng.js';

// C ref: artifact.h SPFX_*
export const SPFX_NONE = 0x00000000;
export const SPFX_NOGEN = 0x00000001;
export const SPFX_RESTR = 0x00000002;
export const SPFX_INTEL = 0x00000004;
export const SPFX_SPEAK = 0x00000008;
export const SPFX_SEEK = 0x00000010;
export const SPFX_WARN = 0x00000020;
export const SPFX_ATTK = 0x00000040;
export const SPFX_DEFN = 0x00000080;
export const SPFX_DRLI = 0x00000100;
export const SPFX_SEARCH = 0x00000200;
export const SPFX_BEHEAD = 0x00000400;
export const SPFX_HALRES = 0x00000800;
export const SPFX_ESP = 0x00001000;
export const SPFX_STLTH = 0x00002000;
export const SPFX_REGEN = 0x00004000;
export const SPFX_EREGEN = 0x00008000;
export const SPFX_HSPDAM = 0x00010000;
export const SPFX_HPHDAM = 0x00020000;
export const SPFX_TCTRL = 0x00040000;
export const SPFX_LUCK = 0x00080000;
export const SPFX_DMONS = 0x00100000;
export const SPFX_DCLAS = 0x00200000;
export const SPFX_DFLAG1 = 0x00400000;
export const SPFX_DFLAG2 = 0x00800000;
export const SPFX_DALIGN = 0x01000000;
export const SPFX_DBONUS = 0x01F00000;
export const SPFX_XRAY = 0x02000000;
export const SPFX_REFLECT = 0x04000000;
export const SPFX_PROTECT = 0x08000000;

// C ref: artifact.h enum invoke_prop_types
export const TAMING = (LAST_PROP + 1);
export const HEALING = TAMING + 1;
export const ENERGY_BOOST = TAMING + 2;
export const UNTRAP = TAMING + 3;
export const CHARGE_OBJ = TAMING + 4;
export const LEV_TELE = TAMING + 5;
export const CREATE_PORTAL = TAMING + 6;
export const ENLIGHTENING = TAMING + 7;
export const CREATE_AMMO = TAMING + 8;
export const BANISH = TAMING + 9;
export const FLING_POISON = TAMING + 10;
export const FIRESTORM = TAMING + 11;
export const SNOWSTORM = TAMING + 12;
export const BLINDING_RAY = TAMING + 13;

// color.h (terminal.js is frozen and not imported here)
const NO_COLOR = 8, CLR_RED = 1, CLR_BRIGHT_BLUE = 12;

// C ref: artilist.h attack macros -- struct attack {aatyp, adtyp, damn, damd}
const att = (adtyp, damn, damd) => ({ aatyp: 0, adtyp, damn, damd });
const NO_ATTK = () => att(0, 0, 0);
const NO_DFNS = () => att(0, 0, 0);
const NO_CARY = () => att(0, 0, 0);
const DFNS = (c) => att(c, 0, 0);
const CARY = (c) => att(c, 0, 0);
const PHYS = (a, b) => att(M.AD_PHYS, a, b);
const DRLI = (a, b) => att(M.AD_DRLI, a, b);
const COLD = (a, b) => att(M.AD_COLD, a, b);
const FIRE = (a, b) => att(M.AD_FIRE, a, b);
const ELEC = (a, b) => att(M.AD_ELEC, a, b);
const STUN = (a, b) => att(M.AD_STUN, a, b);
const POIS = (a, b) => att(M.AD_DRST, a, b);

// C ref: artilist.h A(nam, typ, s1, s2, mt, atk, dfn, cry, inv, al, cl,
//                     rac, gs, gv, cost, clr, bn)
function A(name, otyp, spfx, cspfx, mtype, attk, defn, cary, inv_prop,
           alignment, role, race, gen_spe, gift_value, cost, acolor) {
    return { name, otyp, spfx, cspfx, mtype, attk, defn, cary, inv_prop,
             alignment, role, race, gen_spe, gift_value, cost, acolor };
}

// C ref: artilist.h -- built per game because hack_artifacts() modifies
// the alignment/role fields (C's artilist[] is a modifiable static array)
function artilist_init() {
    return [
    /*  dummy element #0, so that all interesting indices are non-zero */
    A("", O.STRANGE_OBJECT, 0, 0, 0, NO_ATTK(), NO_DFNS(), NO_CARY(), 0, A_NONE,
      NON_PM, NON_PM,
      0, 0, 0, NO_COLOR),
    A("Excalibur", O.LONG_SWORD, (SPFX_NOGEN | SPFX_RESTR | SPFX_SEEK
                                  | SPFX_DEFN | SPFX_INTEL | SPFX_SEARCH),
      0, 0, PHYS(5, 10), DRLI(0, 0), NO_CARY(), 0, A_LAWFUL, M.PM_KNIGHT, NON_PM,
      0, 10, 4000, NO_COLOR),
    A("Stormbringer", O.RUNESWORD,
      (SPFX_RESTR | SPFX_ATTK | SPFX_DEFN | SPFX_INTEL | SPFX_DRLI), 0, 0,
      DRLI(5, 2), DRLI(0, 0), NO_CARY(), 0, A_CHAOTIC, NON_PM, NON_PM,
      0, 9, 8000, NO_COLOR),
    A("Mjollnir", O.WAR_HAMMER, /* Mjo:llnir */
      (SPFX_RESTR | SPFX_ATTK), 0, 0, ELEC(5, 24), NO_DFNS(), NO_CARY(), 0,
      A_NEUTRAL, M.PM_VALKYRIE, NON_PM,
      0, 8, 4000, NO_COLOR),
    A("Cleaver", O.BATTLE_AXE, SPFX_RESTR, 0, 0, PHYS(3, 6), NO_DFNS(), NO_CARY(),
      0, A_NEUTRAL, M.PM_BARBARIAN, NON_PM,
      0, 8, 1500, NO_COLOR),
    A("Grimtooth", O.ORCISH_DAGGER, (SPFX_RESTR | SPFX_WARN | SPFX_DFLAG2),
      0, M.M2_ELF, PHYS(2, 6), POIS(0, 0),
      NO_CARY(), FLING_POISON, A_CHAOTIC, NON_PM, M.PM_ORC,
      0, 5, 1200, CLR_RED),
    A("Orcrist", O.ELVEN_BROADSWORD, (SPFX_WARN | SPFX_DFLAG2), 0, M.M2_ORC,
      PHYS(5, 0), NO_DFNS(), NO_CARY(), 0, A_CHAOTIC, NON_PM, M.PM_ELF,
      3, 4, 2000, CLR_BRIGHT_BLUE), /* actually light blue */
    A("Sting", O.ELVEN_DAGGER, (SPFX_WARN | SPFX_DFLAG2), 0, M.M2_ORC,
      PHYS(5, 0), NO_DFNS(), NO_CARY(), 0, A_CHAOTIC, NON_PM, M.PM_ELF,
      3, 1, 800, CLR_BRIGHT_BLUE),
    A("Magicbane", O.ATHAME, (SPFX_RESTR | SPFX_ATTK | SPFX_DEFN), 0, 0,
      STUN(3, 4), DFNS(M.AD_MAGM), NO_CARY(), 0, A_NEUTRAL, M.PM_WIZARD, NON_PM,
      0, 7, 3500, NO_COLOR),
    A("Frost Brand", O.LONG_SWORD, (SPFX_RESTR | SPFX_ATTK | SPFX_DEFN), 0, 0,
      COLD(5, 0), COLD(0, 0), NO_CARY(), SNOWSTORM, A_NONE, NON_PM, NON_PM,
      0, 9, 3000, NO_COLOR),
    A("Fire Brand", O.LONG_SWORD, (SPFX_RESTR | SPFX_ATTK | SPFX_DEFN), 0, 0,
      FIRE(5, 0), FIRE(0, 0), NO_CARY(), FIRESTORM, A_NONE, NON_PM, NON_PM,
      0, 5, 3000, NO_COLOR),
    A("Dragonbane", O.BROADSWORD,
      (SPFX_RESTR | SPFX_DCLAS | SPFX_REFLECT), 0, M.S_DRAGON,
      PHYS(5, 0), NO_DFNS(), NO_CARY(), 0, A_NONE, NON_PM, NON_PM,
      2, 5, 500, NO_COLOR),
    A("Demonbane", O.SILVER_MACE, (SPFX_RESTR | SPFX_DFLAG2), 0, M.M2_DEMON,
      PHYS(5, 0), NO_DFNS(), NO_CARY(), BANISH, A_LAWFUL, M.PM_CLERIC, NON_PM,
      1, 3, 2500, NO_COLOR),
    A("Werebane", O.SILVER_SABER, (SPFX_RESTR | SPFX_DFLAG2), 0, M.M2_WERE,
      PHYS(5, 0), DFNS(M.AD_WERE), NO_CARY(), 0, A_NONE, NON_PM, NON_PM,
      1, 4, 1500, NO_COLOR),
    A("Grayswandir", O.SILVER_SABER, (SPFX_RESTR | SPFX_HALRES), 0, 0,
      PHYS(5, 0), NO_DFNS(), NO_CARY(), 0, A_LAWFUL, NON_PM, NON_PM,
      0, 10, 8000, NO_COLOR),
    A("Giantslayer", O.LONG_SWORD, (SPFX_RESTR | SPFX_DFLAG2), 0, M.M2_GIANT,
      PHYS(5, 0), NO_DFNS(), NO_CARY(), 0, A_NEUTRAL, NON_PM, NON_PM,
      2, 4, 200, NO_COLOR),
    A("Ogresmasher", O.WAR_HAMMER, (SPFX_RESTR | SPFX_DCLAS), 0, M.S_OGRE,
      PHYS(5, 0), NO_DFNS(), NO_CARY(), 0, A_NONE, NON_PM, NON_PM,
      2, 1, 200, NO_COLOR),
    A("Trollsbane", O.MORNING_STAR, (SPFX_RESTR | SPFX_DCLAS | SPFX_REGEN), 0,
      M.S_TROLL, PHYS(5, 0), NO_DFNS(), NO_CARY(), 0, A_NONE, NON_PM, NON_PM,
      2, 1, 200, NO_COLOR),
    A("Vorpal Blade", O.LONG_SWORD, (SPFX_RESTR | SPFX_BEHEAD), 0, 0,
      PHYS(5, 1), NO_DFNS(), NO_CARY(), 0, A_NEUTRAL, NON_PM, NON_PM,
      1, 5, 4000, NO_COLOR),
    A("Snickersnee", O.KATANA, SPFX_RESTR, 0, 0, PHYS(0, 8), NO_DFNS(), NO_CARY(),
      0, A_LAWFUL, M.PM_SAMURAI, NON_PM,
      0, 8, 1200, NO_COLOR),
    A("Sunsword", O.LONG_SWORD, (SPFX_RESTR | SPFX_DFLAG2), 0, M.M2_UNDEAD,
      PHYS(5, 0), DFNS(M.AD_BLND), NO_CARY(), BLINDING_RAY, A_LAWFUL, NON_PM,
      NON_PM,
      0, 6, 1500, NO_COLOR),
    /*
     *      The artifacts for the quest dungeon, all self-willed.
     */
    A("The Orb of Detection", O.CRYSTAL_BALL,
      (SPFX_NOGEN | SPFX_RESTR | SPFX_INTEL), (SPFX_ESP | SPFX_HSPDAM), 0,
      NO_ATTK(), NO_DFNS(), CARY(M.AD_MAGM), INVIS, A_LAWFUL, M.PM_ARCHEOLOGIST,
      NON_PM,
      0, 12, 2500, NO_COLOR),
    A("The Heart of Ahriman", O.LUCKSTONE,
      (SPFX_NOGEN | SPFX_RESTR | SPFX_INTEL), SPFX_STLTH, 0,
      /* this stone does double damage if used as a projectile weapon */
      PHYS(5, 0), NO_DFNS(), NO_CARY(), LEVITATION, A_NEUTRAL, M.PM_BARBARIAN,
      NON_PM,
      0, 12, 2500, NO_COLOR),
    A("The Sceptre of Might", O.MACE,
      (SPFX_NOGEN | SPFX_RESTR | SPFX_INTEL | SPFX_DALIGN), 0, 0, PHYS(5, 0),
      DFNS(M.AD_MAGM), NO_CARY(), CONFLICT, A_LAWFUL, M.PM_CAVE_DWELLER, NON_PM,
      0, 12, 2500, NO_COLOR),
    /* "The Palantir of Westernesse" is #if 0 in artilist.h */
    A("The Staff of Aesculapius", O.QUARTERSTAFF,
      (SPFX_NOGEN | SPFX_RESTR | SPFX_ATTK | SPFX_INTEL | SPFX_DRLI
       | SPFX_REGEN),
      0, 0, DRLI(0, 0), DRLI(0, 0), NO_CARY(), HEALING, A_NEUTRAL, M.PM_HEALER,
      NON_PM,
      0, 12, 5000, NO_COLOR),
    A("The Magic Mirror of Merlin", O.MIRROR,
      (SPFX_NOGEN | SPFX_RESTR | SPFX_INTEL | SPFX_SPEAK), SPFX_ESP, 0,
      NO_ATTK(), NO_DFNS(), CARY(M.AD_MAGM), 0, A_LAWFUL, M.PM_KNIGHT, NON_PM,
      0, 12, 1500, NO_COLOR),
    A("The Eyes of the Overworld", O.LENSES,
      (SPFX_NOGEN | SPFX_RESTR | SPFX_INTEL | SPFX_XRAY), 0, 0, NO_ATTK(),
      DFNS(M.AD_MAGM), NO_CARY(), ENLIGHTENING, A_NEUTRAL, M.PM_MONK, NON_PM,
      0, 12, 2500, NO_COLOR),
    A("The Mitre of Holiness", O.HELM_OF_BRILLIANCE,
      (SPFX_NOGEN | SPFX_RESTR | SPFX_DFLAG2 | SPFX_INTEL | SPFX_PROTECT), 0,
      M.M2_UNDEAD, NO_ATTK(), NO_DFNS(), CARY(M.AD_FIRE), ENERGY_BOOST, A_LAWFUL,
      M.PM_CLERIC, NON_PM,
      0, 12, 2000, NO_COLOR),
    A("The Longbow of Diana", O.BOW,
      (SPFX_NOGEN | SPFX_RESTR | SPFX_INTEL | SPFX_REFLECT), SPFX_ESP, 0,
      PHYS(5, 0), NO_DFNS(), NO_CARY(), CREATE_AMMO, A_CHAOTIC, M.PM_RANGER,
      NON_PM,
      0, 12, 4000, NO_COLOR),
    A("The Master Key of Thievery", O.SKELETON_KEY,
      (SPFX_NOGEN | SPFX_RESTR | SPFX_INTEL | SPFX_SPEAK),
      (SPFX_WARN | SPFX_TCTRL | SPFX_HPHDAM), 0, NO_ATTK(), NO_DFNS(), NO_CARY(),
      UNTRAP, A_CHAOTIC, M.PM_ROGUE, NON_PM,
      0, 12, 3500, NO_COLOR),
    A("The Tsurugi of Muramasa", O.TSURUGI,
      (SPFX_NOGEN | SPFX_RESTR | SPFX_INTEL | SPFX_BEHEAD | SPFX_LUCK
       | SPFX_PROTECT),
      0, 0, PHYS(0, 8), NO_DFNS(), NO_CARY(), 0, A_LAWFUL, M.PM_SAMURAI, NON_PM,
      0, 12, 4500, NO_COLOR),
    A("The Platinum Yendorian Express Card", O.CREDIT_CARD,
      (SPFX_NOGEN | SPFX_RESTR | SPFX_INTEL | SPFX_DEFN),
      (SPFX_ESP | SPFX_HSPDAM), 0, NO_ATTK(), NO_DFNS(), CARY(M.AD_MAGM),
      CHARGE_OBJ, A_NEUTRAL, M.PM_TOURIST, NON_PM,
      0, 12, 7000, NO_COLOR),
    A("The Orb of Fate", O.CRYSTAL_BALL,
      (SPFX_NOGEN | SPFX_RESTR | SPFX_INTEL | SPFX_LUCK),
      (SPFX_WARN | SPFX_HSPDAM | SPFX_HPHDAM), 0, NO_ATTK(), NO_DFNS(), NO_CARY(),
      LEV_TELE, A_NEUTRAL, M.PM_VALKYRIE, NON_PM,
      0, 12, 3500, NO_COLOR),
    A("The Eye of the Aethiopica", O.AMULET_OF_ESP,
      (SPFX_NOGEN | SPFX_RESTR | SPFX_INTEL), (SPFX_EREGEN | SPFX_HSPDAM), 0,
      NO_ATTK(), DFNS(M.AD_MAGM), NO_CARY(), CREATE_PORTAL, A_NEUTRAL,
      M.PM_WIZARD, NON_PM,
      0, 12, 4000, NO_COLOR),
    /*
     *  terminator; otyp must be zero
     */
    A(null, 0, 0, 0, 0, NO_ATTK(), NO_DFNS(), NO_CARY(), 0, A_NONE, NON_PM,
      NON_PM, 0, 0, 0, 0),
    ];
}

// C ref: artifact.c artilist[] -- the per-game table (see artilist_init())
export function artilist() {
    if (!game.artilist)
        game.artilist = artilist_init();
    return game.artilist;
}

// C ref: artifact.h struct arti_info; artifact.c zero_artiexist
function zero_artiexist() {
    return { exists: 0, found: 0, gift: 0, wish: 0, named: 0, viadip: 0,
             lvldef: 0, bones: 0, rndm: 0 };
}

// C ref: artifact.c artiexist[] (indexed by ART_xx; [0] isn't used)
function artiexist() {
    if (!game.artiexist)
        game.artiexist = Array.from({ length: 1 + NROFARTIFACTS },
                                    zero_artiexist);
    return game.artiexist;
}

// C ref: artifact.c hack_artifacts()
/* handle some special cases; must be called after u_init() */
function hack_artifacts() {
    const arts = artilist();
    const alignmnt = aligns[game.flags.initalign].value;
    const Role_switch = game.urole.mnum;

    /* Fix up the alignments of "gift" artifacts */
    for (let i = 1; arts[i].otyp; i++) {
        const art = arts[i];
        if (art.role === Role_switch && art.alignment !== A_NONE)
            art.alignment = alignmnt;
    }

    /* Excalibur can be used by any lawful character, not just knights */
    if (Role_switch !== M.PM_KNIGHT)
        arts[ART_EXCALIBUR].role = NON_PM;

    /* Fix up the quest artifact */
    if (game.urole.questarti) {
        arts[game.urole.questarti].alignment = alignmnt;
        arts[game.urole.questarti].role = Role_switch;
    }
    return;
}

// C ref: artifact.c init_artifacts()
/* zero out the artifact existence list */
export function init_artifacts() {
    game.artilist = artilist_init();
    game.artiexist = Array.from({ length: 1 + NROFARTIFACTS }, zero_artiexist);
    game.artidisco = new Array(NROFARTIFACTS).fill(0);
    hack_artifacts();
}

// C ref: artifact.c artifact_name()
/*
 * Returns the full name (with articles and correct capitalization) of an
 * artifact named "name" if one exists, or NULL, it not.
 * The object type of the artifact is returned in otyp_p.otyp if the return
 * value is non-NULL.
 */
export function artifact_name(
    name,   /* string from player that might be an artifact name */
    otyp_p, /* secondary output: { otyp } or null */
    fuzzy)  /* whether to allow extra or omitted spaces or dashes */
{
    const arts = artilist();
    let aname;

    if (!strncmpi(name, "the ", 4))
        name = name.slice(4);

    for (let a = 1; arts[a].otyp; a++) {
        aname = arts[a].name;
        if (!strncmpi(aname, "the ", 4))
            aname = aname.slice(4);
        if (!fuzzy ? !strcmpi(name, aname)
                   : fuzzymatch(name, aname, " -", true)) {
            if (otyp_p)
                otyp_p.otyp = arts[a].otyp;
            return arts[a].name;
        }
    }

    return null;
}

// C ref: artifact.c exist_artifact()
export function exist_artifact(otyp, name) {
    const arts = artilist();
    const arex = artiexist();

    if (otyp && name)
        for (let a = 1; arts[a].otyp; a++)
            if (arts[a].otyp === otyp && arts[a].name === name)
                return arex[a].exists ? true : false;
    return false;
}

// C ref: artifact.c artifact_exists()
/* an artifact has just been created or is being "un-created" for a chance
   to be created again later */
export function artifact_exists(
    otmp,
    name,
    mod,   /* True: exists, False: being un-created */
    flgs)  /* ONAME_xyz flags; not relevant if !mod */
{
    const arts = artilist();

    if (otmp && name)
        for (let m = 1; arts[m].otyp; m++)
            if (arts[m].otyp === otmp.otyp && arts[m].name === name) {
                otmp.oartifact = (mod ? m : 0);
                otmp.age = 0;
                if (otmp.otyp === O.RIN_INCREASE_DAMAGE)
                    otmp.spe = 0;
                if (mod) { /* means being created rather than un-created */
                    /* one--and only one--of these should always be set */
                    if ((flgs & (ONAME_VIA_NAMING | ONAME_WISH | ONAME_GIFT
                                 | ONAME_VIA_DIP | ONAME_LEVEL_DEF
                                 | ONAME_BONES | ONAME_RANDOM)) === 0)
                        flgs |= ONAME_RANDOM; /* the default origin */
                    /* 'exists' bit will become set (in artifact_origin();
                       there's no ONAME_ flag) and flgs might also contain
                       the know_arti bit (hero knows that artifact exists) */
                    artifact_origin(otmp, flgs);
                } else { /* uncreate */
                    /* clear all the flag bits */
                    artiexist()[m] = zero_artiexist();
                }
                break;
            }
    return;
}

// C ref: artifact.c found_artifact()
/* mark an artifact as 'found' */
export function found_artifact(a) {
    const arex = artiexist();

    if (a < 1 || a > NROFARTIFACTS)
        console.error(`impossible: found_artifact: invalid artifact index! (${a})`);
    else if (!arex[a].exists)
        console.error(`impossible: found_artifact: artifact doesn't exist yet? (${a})`);
    else
        arex[a].found = 1;
}

// C ref: artifact.c find_artifact()
/* if an artifact hasn't already been designated 'found', do that now
   and generate a livelog event about finding it */
export function find_artifact(otmp) {
    const a = otmp.oartifact;

    if (a && !artiexist()[a].found) {
        found_artifact(a); /* artiexist[a].found = 1 */
        /* livelog_printf(LL_ARTIFACT, "found %s%s", ...): no livelog */
    }
}

// C ref: artifact.c undiscovered_artifact()
/* used to decide whether an artifact has been fully identified */
export function undiscovered_artifact(m) {
    if (!game.artidisco)
        game.artidisco = new Array(NROFARTIFACTS).fill(0);
    /* look for this artifact in the discoveries list;
       if we hit an empty slot then it's undiscovered */
    for (let i = 0; i < NROFARTIFACTS; i++)
        if (game.artidisco[i] === m)
            return false;
        else if (game.artidisco[i] === 0)
            break;
    return true;
}

// C ref: artifact.c nartifact_exist()
export function nartifact_exist() {
    const arex = artiexist();
    let a = 0;

    for (let i = 1; i <= NROFARTIFACTS; ++i)
        if (arex[i].exists)
            ++a;

    return a;
}

// C ref: artifact.c artifact_origin()
/* set artifact tracking flags;
   calling sequence: oname() -> artifact_exists() -> artifact_origin() or
   mksobj(),others -> mk_artifact() -> artifact_origin(random) possibly
   followed by mksobj(),others -> artifact_origin(non-random origin) */
export function artifact_origin(
    arti,   /* new artifact */
    aflags) /* ONAME_xxx flags, shared by artifact_exists() */
{
    const arex = artiexist();
    let ct;
    const a = arti.oartifact;

    if (a) {
        /* start by clearing all bits; most are mutually exclusive */
        arex[a] = zero_artiexist();
        /* set 'exists' bit back on; not specified via flag bit in aflags */
        arex[a].exists = 1;
        /* 'hero knows it exists' is expected for wish, gift, viadip, or
           named and could eventually become set for any of the others */
        if ((aflags & ONAME_KNOW_ARTI) !== 0)
            arex[a].found = 1;
        /* should be exactly one of wish, gift, via_dip, via_naming,
           level_def (quest), bones, and random (floor or monst's minvent) */
        ct = 0;
        if ((aflags & ONAME_WISH) !== 0)
            arex[a].wish = 1, ++ct;
        if ((aflags & ONAME_GIFT) !== 0)
            arex[a].gift = 1, ++ct;
        if ((aflags & ONAME_VIA_DIP) !== 0)
            arex[a].viadip = 1, ++ct;
        if ((aflags & ONAME_VIA_NAMING) !== 0)
            arex[a].named = 1, ++ct;
        if ((aflags & ONAME_LEVEL_DEF) !== 0)
            arex[a].lvldef = 1, ++ct;
        if ((aflags & ONAME_BONES) !== 0)
            arex[a].bones = 1, ++ct;
        if ((aflags & ONAME_RANDOM) !== 0)
            arex[a].rndm = 1, ++ct;
        if (ct !== 1)
            console.error(`impossible: invalid artifact origin: ${aflags.toString(8)}`);
    }
}

// C ref: artifact.c get_artifact()
export function get_artifact(obj) {
    const arts = artilist();
    if (obj) {
        const artidx = obj.oartifact | 0;

        /* skip 0, 1st artifact at 1 */
        if (artidx > 0 && artidx < AFTER_LAST_ARTIFACT)
            return arts[artidx];
    }
    return arts[ART_NONARTIFACT];
}

// C ref: artifact.c spec_applies() -- the SPFX_DBONUS cases (all that
// bane_applies() can reach); the SPFX_ATTK resistance checks are not
// ported yet
function spec_applies(weap, mtmp) {
    if (!(weap.spfx & (SPFX_DBONUS | SPFX_ATTK)))
        return (weap.attk.adtyp === M.AD_PHYS);

    const yours = (mtmp === game.youmonst);
    const ptr = mtmp.data;
    const u = game.u;

    if (weap.spfx & SPFX_DMONS) {
        return (ptr === M.mons[weap.mtype]);
    } else if (weap.spfx & SPFX_DCLAS) {
        return (weap.mtype === ptr.mlet);
    } else if (weap.spfx & SPFX_DFLAG1) {
        return ((ptr.mflags1 & weap.mtype) !== 0);
    } else if (weap.spfx & SPFX_DFLAG2) {
        return !!((ptr.mflags2 & weap.mtype)
                  || (yours
                      && ((!u.mtimedone /* !Upolyd */
                           && (game.urace.selfmask & weap.mtype))
                          || ((weap.mtype & M.M2_WERE)
                              && u.ulycn >= M.LOW_PM))));
    } else if (weap.spfx & SPFX_DALIGN) {
        return yours ? (u.ualign.type !== weap.alignment)
                     : (ptr.maligntyp === A_NONE
                        || Math.sign(ptr.maligntyp) !== weap.alignment);
    } else if (weap.spfx & SPFX_ATTK) {
        throw new Error('spec_applies(): SPFX_ATTK resistance checks are not ported yet');
    }
    return false;
}

// C ref: artifact.c bane_applies()
/* used for monsters (and hero) that can't touch an artifact */
function bane_applies(oart, mon) {
    if (oart && (oart.spfx & SPFX_DBONUS) !== 0) {
        const atmp = { ...oart };
        atmp.spfx &= SPFX_DBONUS; /* clear other spfx fields */
        if (spec_applies(atmp, mon))
            return true;
    }
    return false;
}

// C ref: artifact.c touch_artifact() -- the hero's case; monsters and
// the "blasted" damage are not ported yet
/* return 1 if the object can be picked up/wielded by mon, 0 if not */
export function touch_artifact(obj, mon) {
    const arts = artilist();
    const oart = get_artifact(obj);
    let badclass, badalign;
    const u = game.u;

    game.touch_blasted = false;
    if (oart === arts[ART_NONARTIFACT])
        return 1;

    const yours = (mon === game.youmonst);
    /* all quest artifacts are self-willed; if this ever changes, `badclass'
       will have to be extended to explicitly include quest artifacts */
    const self_willed = ((oart.spfx & SPFX_INTEL) !== 0);
    if (yours) {
        badclass = self_willed
                   && ((oart.role !== NON_PM && game.urole.mnum !== oart.role)
                       || (oart.race !== NON_PM
                           && game.urace.mnum !== oart.race));
        badalign = ((oart.spfx & SPFX_RESTR) !== 0
                    && oart.alignment !== A_NONE
                    && (oart.alignment !== u.ualign.type
                        || u.ualign.record < 0));
    } else {
        throw new Error('touch_artifact(): monsters touching artifacts are not ported yet');
    }
    /* weapons which attack specific categories of monsters are
       bad for them even if their alignments happen to match */
    if (!badalign)
        badalign = bane_applies(oart, mon);

    if (((badclass || badalign) && self_willed)
        || (badalign && (!yours || !rn2(4)))) {
        throw new Error('touch_artifact(): "You are blasted by its power" is not ported yet');
    }

    /* can pick it up unless you're totally non-synch'd with the artifact */
    if (badclass && badalign && self_willed) {
        throw new Error('touch_artifact(): an artifact evading your grasp is not ported yet');
    }

    return 1;
}
