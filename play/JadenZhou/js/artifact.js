// artifact.js -- artifact table and existence tracking.
// C ref: artifact.c (artilist[] from include/artilist.h, artiexist[]).
//
// Ported so far: the artilist[] table, init_artifacts()/hack_artifacts(),
// artifact_name(), exist_artifact(), artifact_exists(), artifact_origin(),
// found_artifact(), nartifact_exist(), artiname(), what_gives(),
// mk_artifact(). Artifact powers (spec_abon, spec_dbon, touch_artifact,
// invoke, ...) and artidisco[] are not ported yet.

import { On_stairs } from './dogmove.js';
import { game } from './gstate.js';
import { livelog_printf } from './display.js';
import { LL_ARTIFACT, NO_ROOM } from './const.js';
import { inside_shop } from './shk.js';
import { bare_artifactname } from './iactions.js';
import { strncmpi, strcmpi, fuzzymatch } from './hacklib.js';
import * as O from './objects.js';
import * as M from './monsters.js';
import {
    A_NONE, A_LAWFUL, A_NEUTRAL, A_CHAOTIC, NON_PM,
    INVIS, LEVITATION, CONFLICT, LAST_PROP, FIRE_RES, COLD_RES, SHOCK_RES,
    ANTIMAGIC, DISINT_RES, POISON_RES, DRAIN_RES, SEARCHING, HALLUC_RES,
    TELEPAT, STEALTH, REGENERATION, TELEPORT_CONTROL, WARN_OF_MON, WARNING,
    ENERGY_REGENERATION, HALF_SPDAM, HALF_PHDAM, REFLECTING, BLND_RES,
    W_ARM, W_ARMC, W_ARMH, W_ARMS, W_ARMG, W_ARMF, W_ARMU, W_AMUL, W_RINGL,
    W_RINGR, W_TOOL, W_ART, W_ARTI, W_SWAPWEP, W_WEP, W_QUIVER, W_BALL, W_SADDLE,
    ONAME_VIA_NAMING, ONAME_WISH, ONAME_GIFT, ONAME_VIA_DIP,
    ONAME_LEVEL_DEF, ONAME_BONES, ONAME_RANDOM, ONAME_KNOW_ARTI,
} from './const.js';
import { aligns } from './role.js';
import { NROFARTIFACTS, ART_EXCALIBUR, ART_NONARTIFACT,
         AFTER_LAST_ARTIFACT } from './artilist.js';
import { rn2 } from './rng.js';
import { P_MAX_SKILL } from './weapon.js';
import { P_SKILLED, P_BASIC, ONAME_NO_FLAGS, GETOBJ_EXCLUDE, GETOBJ_SUGGEST,
         GETOBJ_PROMPT, ECMD_CANCEL } from './const.js';
import { getobj, nxtobj } from './invent.js';
import { mksobj, permapoisoned, Is_container } from './mkobj.js';
import { oname } from './do_name.js';
import { obj_shuffle_range } from './o_init.js';
import { ART_SUNSWORD, ART_MASTER_KEY_OF_THIEVERY } from './artilist.js';
import { HALLUC, PROTECTION } from './const.js';
import { see_monsters } from './display.js';
import { recalc_telepat_range, clear_bypasses, bypass_obj, nxt_unbypassed_obj,
         which_armor } from './worn.js';
import { make_hallucinated } from './potion.js';
import { invocation_pos } from './mklev.js';
import { You_cant } from './display.js';
import { yname } from './objnam.js';
import { killer_xname } from './mthrowu.js';
import { Maybe_Half_Phys, losehp, selftouch } from './trap.js';
import { exercise } from './attrib.js';
import { rnd, d } from './rng.js';
import { You } from './display.js';
import { s_suffix } from './hacklib.js';
import { the } from './iactions.js';
import { xname } from './objnam.js';
import { mon_aligntyp } from './priest.js';
import { A_WIS } from './const.js';
import { KILLED_BY, A_CON, ECMD_OK, ECMD_TIME, nothing_happens } from './const.js';
import { getrumor } from './rumors.js';
import { bcsign, obj_extract_self } from './mkobj.js';
import { pline } from './display.js';
import { cansee as cansee_art } from './vision.js';
import { mon_nam as mon_nam_art } from './do_name.js';
import { destroy_items as destroy_items_art } from './zap.js';
import { ignite_items as ignite_items_art } from './trap.js';
import { wake_nearto as wake_nearto_art } from './mon.js';
import { ART_TSURUGI_OF_MURAMASA, ART_VORPAL_BLADE } from './artilist.js';
import { SLIMED as SLIMED_ART } from './const.js';
import { defended, resists_fire, resists_cold, resists_elec, resists_poison,
         resists_drli, Resists_Elem, is_mplayer,
         resists_ston } from './mondata.js';
import { STONE_RES } from './const.js';
import { ART_GRIMTOOTH } from './artilist.js';
import { Tobjnam } from './objnam.js';
import { remove_worn_item } from './steal.js';
import { freeinv, obfree } from './invent.js';
import { hitfloor } from './dothrow.js';
import { dropx } from './do.js';
import { surface } from './iactions.js';
import { Levitation } from './youprop.js';
import { IS_ALTAR } from './const.js';
import { Antimagic, Hate_silver, Blind as Blind_art } from './youprop.js';
import { objects as objects_ac } from './objects.js';

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

// C ref: artifact.c dispose_of_orig_obj()
/* discard an object passed to mk_artifact() along with an alignment */
function dispose_of_orig_obj(obj) {
    if (!obj)
        return;

    obj_extract_self(obj);
    obfree(obj, null);
}

// C ref: artifact.c mk_artifact()
/*
 * Make an artifact.  If a specific alignment is specified, then an object of
 * the appropriate alignment is created from scratch, or 0 is returned if
 * none is available.  (If at least one aligned artifact has already been
 * given, then unaligned ones also become eligible for this.)
 * If no alignment is given, then 'otmp' is converted
 * into an artifact of matching type, or returned as-is if that's not
 * possible.
 * For the 2nd case, caller should use ``obj = mk_artifact(obj, A_NONE);''
 * for the 1st, ``obj = mk_artifact((struct obj *)0, some_alignment);''.
 * max_giftvalue is the maximum gift_value of an artifact that is allowed
 * to be generated. Normally set to 6 for a sacrifice gift, or 99 otherwise.
 */
export function mk_artifact(
    otmp,          /* existing object; ignored and disposed of
                    * if alignment specified */
    alignment,     /* target alignment, or A_NONE */
    max_giftvalue, /* cap on generated giftvalue */
    adjust_spe)    /* whether to add spe to situational artifacts */
{
    const arts = artilist();
    const arex = artiexist();
    let a;
    let m, n, altn;
    const by_align = (alignment !== A_NONE);
    const o_typ = (by_align || !otmp) ? 0 : otmp.otyp;
    const unique = !by_align && otmp && O.objects[o_typ].oc_unique;
    const eligible = new Array(NROFARTIFACTS).fill(0);
    let skill_compatibility;

    n = altn = 0;    /* no candidates found yet */
    eligible[0] = 0; /* lint suppression */
    /* gather eligible artifacts */
    for (m = 1, a = arts[m]; a.otyp; a = arts[++m]) {
        if (arex[m].exists)
            continue;
        if ((a.spfx & SPFX_NOGEN) || unique)
            continue;
        if (a.gift_value > max_giftvalue && !(game.urole.mnum === a.role))
            continue;

        if (!by_align) {
            /* looking for a particular type of item; not producing a
               divine gift so we don't care about role's first choice */
            if (a.otyp === o_typ)
                eligible[n++] = m;
            continue; /* move on to next possibility */
        }

        /* we're looking for an alignment-specific item
           suitable for hero's role+race */
        if ((a.alignment === alignment || a.alignment === A_NONE)
            /* avoid enemies' equipment */
            && (a.race === NON_PM
                || !((M.mons[a.race].mflags2 & game.urace.hatemask) !== 0))) {
            /* when a role-specific first choice is available, use it */
            if (game.urole.mnum === a.role) {
                /* make this be the only possibility in the list */
                eligible[0] = m;
                n = 1;
                break; /* skip all other candidates */
            }

            /* check if this is skill-compatible */
            skill_compatibility = P_SKILLED;
            if (O.objects[a.otyp].oc_class === O.WEAPON_CLASS) {
                const skill = O.objects[a.otyp].oc_skill;
                if (skill < 0)
                    skill_compatibility = P_MAX_SKILL(-skill);
                else
                    skill_compatibility = P_MAX_SKILL(skill);
            }

            /* found something to consider for random selection */
            if ((a.alignment !== A_NONE || game.u.ugifts > 0 || !rn2(3))
                && (!rn2(4) || skill_compatibility >= P_SKILLED
                    || (skill_compatibility >= P_BASIC && rn2(2)))) {
                /* right alignment, or non-aligned with at least 1
                   previous gift bestowed, makes this one viable;
                   unaligned artifacts are possible even as the first
                   gift, but less likely; if it's a bad weapon type
                   for the role that also makes it less likely */
                eligible[n++] = m;
            } else {
                /* if no candidates have been found yet, record
                   this one as a[nother] fallback possibility in
                   case all aligned candidates have been used up
                   (via wishing, naming, bones, random generation)
                   or failed the randomized compatibility checks */
                if (!n)
                    eligible[altn++] = m;
                /* [once a regular candidate is found, the list
                   is overwritten and `altn' becomes irrelevant] */
            }
        }
    }

    /* resort to fallback list if main list was empty */
    if (!n)
        n = altn;

    if (n) {
        /* found at least one candidate; pick one at random */
        m = eligible[rn2(n)]; /* [0..n-1] */
        a = arts[m];

        /* make an appropriate object if necessary, then christen it */
        if (by_align) {
            /* 'by_align' indicates that an alignment was passed as
             * an argument, but also that the 'otmp' argument is not
             * relevant */
            const artiobj = mksobj(a.otyp, true, false);

            /* nonnull value of 'otmp' is unexpected. Cope. */
            if (otmp) /* just in case; avoid orphaning */
                dispose_of_orig_obj(otmp);
            otmp = artiobj;
        }
        /*
         * otmp should be nonnull at this point:
         * either the passed argument (if !by_align == A_NONE), or
         * the result of mksobj() just above if by_align is an alignment. */
        /* prevent erosion from generating */
        otmp.oeroded = otmp.oeroded2 = 0;
        otmp = oname(otmp, a.name, ONAME_NO_FLAGS);
        otmp.oartifact = m;  /* probably already set by this point, but */
        /* set existence and reason for creation bits */
        artifact_origin(otmp, ONAME_RANDOM); /* 'random' is default */
        if (adjust_spe) {
            /* Adjust artiobj->spe by a->gen_spe. (This is a no-op for
               non-weapons, which always have a gen_spe of 0, and for many
               weapons, too.) The result is clamped into the "normal" range to
               prevent an outside chance of +12 artifacts generating. */
            const new_spe = otmp.spe + a.gen_spe;
            if (new_spe >= -10 && new_spe < 10)
                otmp.spe = new_spe;
        }
    } else {
        /* nothing appropriate could be found; return original object */
        if (by_align && otmp) {
            /* (there shouldn't have been an original object). Deal with it.
             * The callers that passed an alignment and a NULL otmp are
             * prepared to get a potential NULL return value, so this is okay */
            dispose_of_orig_obj(otmp);
            otmp = null;
        } /* otherwise, otmp has not changed; just fallthrough to return it */
    }
    if (otmp && permapoisoned(otmp))
        otmp.otrapped /* opoisoned */ = 1;
    return otmp;
}

// C ref: artifact.c artiname()
export function artiname(artinum) {
    if (artinum <= 0 || artinum > NROFARTIFACTS)
        return "";
    return artilist()[artinum].name;
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

// C ref: artifact.c discover_artifact() -- add identified artifact to
// discoveries list
export function discover_artifact(m) {
    const artidisco = game.artidisco;
    let i;

    /* look for this artifact in the discoveries list;
       if we hit an empty slot then it's not present, so add it */
    for (i = 0; i < NROFARTIFACTS; i++)
        if (artidisco[i] === 0 || artidisco[i] === m) {
            artidisco[i] = m;
            return;
        }
    /* there is one slot per artifact, so we should never reach the
       end without either finding the artifact or an empty slot... */
    throw new Error(`impossible: couldn't discover artifact (${m})`);
}

// C ref: artifact.c restrict_name()
/* is 'name' a restricted artifact name for objects of otmp's type? */
export function restrict_name(otmp, name) {
    const arts = artilist();
    let aname, odesc, other;
    const sametype = new Array(O.objects.length).fill(false);
    let i, lo, hi;
    const otyp = otmp.otyp, ocls = O.objects[otyp].oc_class;

    if (!name)
        return false;
    if (!strncmpi(name, "the ", 4))
        name = name.slice(4);

    /* decide what types of objects are the same as otyp;
       if it's been discovered, then only itself matches;
       otherwise, include all other undiscovered objects
       of the same class which have the same description
       or share the same pool of shuffled descriptions */
    sametype[otyp] = true;
    if (!O.objects[otyp].oc_name_known
        && (odesc = O.OBJ_DESCR(O.objects[otyp])) != null) {
        ({ lo, hi } = obj_shuffle_range(otyp));
        for (i = game.bases[ocls]; i < O.objects.length; i++) {
            if (O.objects[i].oc_class !== ocls)
                break;
            if (!O.objects[i].oc_name_known
                && (other = O.OBJ_DESCR(O.objects[i])) != null
                && (odesc === other || (i >= lo && i <= hi)))
                sametype[i] = true;
        }
    }

    /* Since almost every artifact is SPFX_RESTR, it doesn't cost
       us much to do the string comparison before the spfx check.
       Bug fix:  don't name multiple elven daggers "Sting".
     */
    for (let a = 1; arts[a].otyp; a++) {
        if (!sametype[arts[a].otyp])
            continue;
        aname = arts[a].name;
        if (!strncmpi(aname, "the ", 4))
            aname = aname.slice(4);
        if (aname === name)
            return ((arts[a].spfx & (SPFX_NOGEN | SPFX_RESTR)) !== 0
                    || otmp.quan > 1);
    }

    return false;
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
        /*
         * Note: this is also called when an artifact is created ...;
         * the location tells how the hero came across it.
         */
        const where = ((otmp.where === 'OBJ_FLOOR')
                       ? ((inside_shop(otmp.ox, otmp.oy) !== NO_ROOM)
                          ? " in a shop"
                          : " on the floor")
                       /* artifacts aren't created in containers but could be
                          inside one if it comes from a bones level */
                       : (otmp.where === 'OBJ_CONTAINED') ? " in a container"
                         /* perhaps probing, or seeing monster wield artifact */
                         : (otmp.where === 'OBJ_MINVENT') ? " carried by a monster"
                           /* catchall: probably in inventory, picked up while
                              blind but now seen; there's no previous_where to
                              figure out how it got here */
                           : "");
        livelog_printf(LL_ARTIFACT, `found ${bare_artifactname(otmp)}${where}`);
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

// C ref: artifact.c protects()
/* used to check whether an object grants Protection (in some cases,
   only when worn or wielded) */
export function protects(otmp, being_worn) {
    if (being_worn && O.objects[otmp.otyp].oc_oprop === PROTECTION)
        return true;
    const arti = get_artifact(otmp);
    if (arti === artilist()[ART_NONARTIFACT])
        return false;
    return ((arti.cspfx & SPFX_PROTECT) !== 0
            || (being_worn && (arti.spfx & SPFX_PROTECT) !== 0));
}

// C ref: artifact.c shade_glare()
/* used for hero's attack against a shade */
export function shade_glare(obj) {
    /* any silver object is effective */
    if (objects_ac[obj.otyp].oc_material === O.SILVER)
        return true;
    /* non-silver artifacts with bonus against undead also are effective */
    const arti = get_artifact(obj);
    if (arti !== artilist()[ART_NONARTIFACT] && (arti.spfx & SPFX_DFLAG2)
        && arti.mtype === M.M2_UNDEAD)
        return true;
    /* [if there was anything with special bonus against noncorporeals,
       it would be effective too] */
    /* otherwise, harmless to shades */
    return false;
}

// C ref: artifact.c defends()
/* used to check whether a monster is getting reflection/magic resistance
   from its wielded weapon or worn dragon scales */
export function defends(adtyp, otmp) {
    let weap;

    if (!otmp)
        return false;
    if ((weap = get_artifact(otmp)) !== artilist()[ART_NONARTIFACT])
        return weap.defn.adtyp === adtyp;
    if ((otmp.otyp >= O.GRAY_DRAGON_SCALES && otmp.otyp <= O.YELLOW_DRAGON_SCALES)
        || (otmp.otyp >= O.GRAY_DRAGON_SCALE_MAIL
            && otmp.otyp <= O.YELLOW_DRAGON_SCALE_MAIL)) { /* Is_dragon_armor() */
        let otyp = otmp.otyp;

        /* convert mail to scales to simplify testing */
        if (otyp >= O.GRAY_DRAGON_SCALE_MAIL && otyp <= O.YELLOW_DRAGON_SCALE_MAIL)
            otyp += O.GRAY_DRAGON_SCALES - O.GRAY_DRAGON_SCALE_MAIL;

        switch (adtyp) {
        case M.AD_MAGM: /* magic missiles => general magic resistance */
            return (otyp === O.GRAY_DRAGON_SCALES);
        case M.AD_HALU: /* confers hallucination resistance */
            return (otyp === O.GOLD_DRAGON_SCALES);
        case M.AD_FIRE:
      /*case AD_BLND: -- gives infravision but does not prevent blindness */
            return (otyp === O.RED_DRAGON_SCALES); /* red but not gold */
        case M.AD_COLD:
      /*case AD_FAMN: -- slows digestion but does not override Famine */
            return (otyp === O.WHITE_DRAGON_SCALES); /* white but not silver */
        case M.AD_DRST: /* drain strength => poison */
        case M.AD_DISE: /* blocks disease but not slime */
            return (otyp === O.GREEN_DRAGON_SCALES);
        case M.AD_SLEE: /* sleep */
        case M.AD_PLYS: /* paralysis => free action */
            return (otyp === O.ORANGE_DRAGON_SCALES);
        case M.AD_DISN: /* disintegration */
        case M.AD_DRLI: /* level drain resistance */
            return (otyp === O.BLACK_DRAGON_SCALES);
        case M.AD_ELEC: /* electricity == lightning */
        case M.AD_SLOW: /* confers speed so blocks speed removal */
            return (otyp === O.BLUE_DRAGON_SCALES);
        case M.AD_ACID:
        case M.AD_STON: /* petrification resistance */
            return (otyp === O.YELLOW_DRAGON_SCALES);
        default:
            /* SILVER_DRAGON_SCALES don't resist any particular attack type */
            break;
        }
    }
    return false;
}

// C ref: artifact.c defends_when_carried()
/* used for monsters */
export function defends_when_carried(adtyp, otmp) {
    let weap;

    if ((weap = get_artifact(otmp)) !== artilist()[ART_NONARTIFACT])
        return (weap.cary.adtyp === adtyp);
    return false;
}

// C ref: artifact.c spec_m2()
/* return the M2 flags of monster that an artifact's special attacks apply
 * against */
export function spec_m2(otmp) {
    const artifact = get_artifact(otmp);

    if (artifact !== artilist()[ART_NONARTIFACT])
        return artifact.mtype;
    return 0;
}

// C ref: artifact.c set_artifact_intrinsic() -- the body; it yields where
// C calls make_hallucinated() (which can redraw and print) or arti_invoke(),
// so that set_artifact_intrinsic() can await those and the synchronous
// set_artifact_intrinsic_sync() can stop when it would have to.
/* 'mask' here is the property index whose extrinsic C's 'long *mask'
   points at */
function* set_artifact_intrinsic_core(otmp, on, wp_mask) {
    const u = game.u;
    const arts = artilist();
    let mask = 0;
    const oart = get_artifact(otmp);
    let art, obj;
    let dtyp, spfx;
    const E = (p) => u.uprops[p];

    if (oart === arts[ART_NONARTIFACT])
        return;

    /* effects from the defn field */
    dtyp = (wp_mask !== W_ART) ? oart.defn.adtyp : oart.cary.adtyp;

    if (dtyp === M.AD_FIRE)
        mask = FIRE_RES;        /* &EFire_resistance */
    else if (dtyp === M.AD_COLD)
        mask = COLD_RES;        /* &ECold_resistance */
    else if (dtyp === M.AD_ELEC)
        mask = SHOCK_RES;       /* &EShock_resistance */
    else if (dtyp === M.AD_MAGM)
        mask = ANTIMAGIC;       /* &EAntimagic */
    else if (dtyp === M.AD_DISN)
        mask = DISINT_RES;      /* &EDisint_resistance */
    else if (dtyp === M.AD_DRST)
        mask = POISON_RES;      /* &EPoison_resistance */
    else if (dtyp === M.AD_DRLI)
        mask = DRAIN_RES;       /* &EDrain_resistance */

    if (mask && wp_mask === W_ART && !on) {
        /* find out if some other artifact also confers this intrinsic;
           if so, leave the mask alone */
        for (obj = game.invent; obj; obj = obj.nobj) {
            if (obj !== otmp && obj.oartifact) {
                art = get_artifact(obj);
                if (art !== arts[ART_NONARTIFACT]
                    && art.cary.adtyp === dtyp) {
                    mask = 0;
                    break;
                }
            }
        }
    }
    if (mask) {
        if (on)
            E(mask).extrinsic |= wp_mask;
        else
            E(mask).extrinsic &= ~wp_mask;
    }

    /* intrinsics from the spfx field; there could be more than one */
    spfx = (wp_mask !== W_ART) ? oart.spfx : oart.cspfx;
    if (spfx && wp_mask === W_ART && !on) {
        /* don't change any spfx also conferred by other artifacts */
        for (obj = game.invent; obj; obj = obj.nobj)
            if (obj !== otmp && obj.oartifact) {
                art = get_artifact(obj);
                if (art !== arts[ART_NONARTIFACT])
                    spfx &= ~art.cspfx;
            }
    }

    if (spfx & SPFX_SEARCH) {
        if (on)
            E(SEARCHING).extrinsic |= wp_mask;
        else
            E(SEARCHING).extrinsic &= ~wp_mask;
    }
    if (spfx & SPFX_HALRES) {
        /* make_hallucinated must (re)set the mask itself to get
         * the display right */
        /* restoring needed because this is the only artifact intrinsic
         * that can print a message--need to guard against being printed
         * when restoring a game
         */
        yield { what: 'make_hallucinated',
                args: [on ? 0 : 1,
                       game.program_state?.restoring ? false : true,
                       wp_mask] };
    }
    if (spfx & SPFX_ESP) {
        if (on)
            E(TELEPAT).extrinsic |= wp_mask;
        else
            E(TELEPAT).extrinsic &= ~wp_mask;
        recalc_telepat_range();
        see_monsters();
    }
    if (spfx & SPFX_STLTH) {
        if (on)
            E(STEALTH).extrinsic |= wp_mask;
        else
            E(STEALTH).extrinsic &= ~wp_mask;
    }
    if (spfx & SPFX_REGEN) {
        if (on)
            E(REGENERATION).extrinsic |= wp_mask;
        else
            E(REGENERATION).extrinsic &= ~wp_mask;
    }
    if (spfx & SPFX_TCTRL) {
        if (on)
            E(TELEPORT_CONTROL).extrinsic |= wp_mask;
        else
            E(TELEPORT_CONTROL).extrinsic &= ~wp_mask;
    }
    if (spfx & SPFX_WARN) {
        if (spec_m2(otmp)) {
            const warntype = game.context.warntype = game.context.warntype || {};
            if (on) {
                E(WARN_OF_MON).extrinsic |= wp_mask;
                warntype.obj = (warntype.obj || 0) | spec_m2(otmp);
            } else {
                E(WARN_OF_MON).extrinsic &= ~wp_mask;
                warntype.obj = (warntype.obj || 0) & ~spec_m2(otmp);
            }
            see_monsters();
        } else {
            if (on)
                E(WARNING).extrinsic |= wp_mask;
            else
                E(WARNING).extrinsic &= ~wp_mask;
        }
    }
    if (spfx & SPFX_EREGEN) {
        if (on)
            E(ENERGY_REGENERATION).extrinsic |= wp_mask;
        else
            E(ENERGY_REGENERATION).extrinsic &= ~wp_mask;
    }
    if (spfx & SPFX_HSPDAM) {
        if (on)
            E(HALF_SPDAM).extrinsic |= wp_mask;
        else
            E(HALF_SPDAM).extrinsic &= ~wp_mask;
    }
    if (spfx & SPFX_HPHDAM) {
        if (on)
            E(HALF_PHDAM).extrinsic |= wp_mask;
        else
            E(HALF_PHDAM).extrinsic &= ~wp_mask;
    }
    if (spfx & SPFX_XRAY) {
        /* this assumes that no one else is using xray_range */
        if (on)
            u.xray_range = 3;
        else
            u.xray_range = -1;
        game.vision_full_recalc = 1;
    }
    if ((spfx & SPFX_REFLECT) && (wp_mask & W_WEP)) {
        if (on)
            E(REFLECTING).extrinsic |= wp_mask;
        else
            E(REFLECTING).extrinsic &= ~wp_mask;
    }
    if (spfx & SPFX_PROTECT) {
        if (on)
            E(PROTECTION).extrinsic |= wp_mask;
        else
            E(PROTECTION).extrinsic &= ~wp_mask;
    }

    if (wp_mask === W_ART && !on && oart.inv_prop) {
        /* might have to turn off invoked power too */
        if (oart.inv_prop <= LAST_PROP
            && (u.uprops[oart.inv_prop].extrinsic & W_ARTI))
            yield { what: 'arti_invoke', args: [otmp] };
    }

    if (wp_mask === W_WEP && otmp.oartifact === ART_SUNSWORD) { /* is_art() */
        if (on)
            E(BLND_RES).extrinsic |= wp_mask;
        else
            E(BLND_RES).extrinsic &= ~wp_mask;
    }
}

// C ref: artifact.c set_artifact_intrinsic()
/* used to make the hero feel the effects of an artifact */
export async function set_artifact_intrinsic(otmp, on, wp_mask) {
    const gen = set_artifact_intrinsic_core(otmp, on, wp_mask);
    let r = gen.next();
    while (!r.done) {
        const req = r.value;
        let val;
        if (req.what === 'make_hallucinated')
            val = await make_hallucinated(...req.args);
        else /* arti_invoke(otmp): turning off an invoked power */
            throw new Error('set_artifact_intrinsic(): arti_invoke() not ported yet');
        r = gen.next(val);
    }
}

// C ref: artifact.c set_artifact_intrinsic() -- for synchronous callers
// (setworn(), setnotworn(), freeinv_core()); stops where C would print
export function set_artifact_intrinsic_sync(otmp, on, wp_mask) {
    const gen = set_artifact_intrinsic_core(otmp, on, wp_mask);
    let r = gen.next();
    while (!r.done) {
        const req = r.value;
        if (req.what === 'make_hallucinated') {
            const [xtime, , mask] = req.args;
            /* potion.c make_hallucinated() with a mask: when the hero isn't
               hallucinating only the resistance mask changes; otherwise
               the display is redone and a message given */
            if (game.u.uprops[HALLUC].intrinsic)
                throw new Error('set_artifact_intrinsic(): make_hallucinated() in a synchronous caller not ported yet');
            if (!xtime)
                game.u.uprops[HALLUC_RES].extrinsic |= mask;
            else
                game.u.uprops[HALLUC_RES].extrinsic &= ~mask;
        } else { /* arti_invoke(otmp): turning off an invoked power */
            throw new Error('set_artifact_intrinsic(): arti_invoke() not ported yet');
        }
        r = gen.next(false);
    }
}

// C ref: artifact.c arti_reflects()
export function arti_reflects(obj) {
    const arti = get_artifact(obj);

    if (arti !== artilist()[ART_NONARTIFACT]) {
        /* while being worn */
        if (((obj.owornmask || 0) & ~W_ART) && (arti.spfx & SPFX_REFLECT))
            return true;
        /* just being carried */
        if (arti.cspfx & SPFX_REFLECT)
            return true;
    }
    return false;
}

// C ref: artifact.c spec_ability()
export function spec_ability(otmp, abil) {
    const arti = get_artifact(otmp);

    return (arti !== artilist()[ART_NONARTIFACT] && (arti.spfx & abil) !== 0);
}

// C ref: artifact.c spec_applies()
/* decide whether an artifact's special attacks apply against mtmp */
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
        if (defended(mtmp, weap.attk.adtyp))
            return false;

        switch (weap.attk.adtyp) {
        case M.AD_FIRE:
            return !(yours ? uhave_res(FIRE_RES) : resists_fire(mtmp));
        case M.AD_COLD:
            return !(yours ? uhave_res(COLD_RES) : resists_cold(mtmp));
        case M.AD_ELEC:
            return !(yours ? uhave_res(SHOCK_RES) : resists_elec(mtmp));
        case M.AD_MAGM:
        case M.AD_STUN:
            return !(yours ? Antimagic() : (rn2(100) < ptr.mr));
        case M.AD_DRST:
            return !(yours ? uhave_res(POISON_RES) : resists_poison(mtmp));
        case M.AD_DRLI:
            return !(yours ? uhave_res(DRAIN_RES) : resists_drli(mtmp));
        case M.AD_STON:
            return !(yours ? uhave_res(STONE_RES) : resists_ston(mtmp));
        default:
            /* impossible("Weird weapon special attack.") */
            break;
        }
    }
    return false;
}

/* C ref: youprop.h Fire_resistance etc. (Hxxx || Exxx) */
function uhave_res(p) {
    const r = game.u.uprops[p];
    return !!(r.intrinsic || r.extrinsic);
}

// C ref: artifact.c spec_abon()
/* special attack bonus */
export function spec_abon(otmp, mon) {
    const weap = get_artifact(otmp);

    /* no need for an extra check for `NO_ATTK' because this will
       always return 0 for any artifact which has that attribute */

    if (weap !== artilist()[ART_NONARTIFACT]
        && weap.attk.damn && spec_applies(weap, mon))
        return rnd(weap.attk.damn);
    return 0;
}

// C ref: artifact.c attacks()
/* used to check whether a monster is getting reflected/resisting an
   artifact's special attack type */
export function attacks(adtyp, otmp) {
    const weap = get_artifact(otmp);

    if (weap !== artilist()[ART_NONARTIFACT])
        return (weap.attk.adtyp === adtyp);
    return false;
}

const MB_MAX_DIEROLL = 8; /* rolls above this aren't magical */

// C ref: artifact.c artifact_hit()
/* Function used when someone attacks someone else with an artifact
 * weapon.  Only adds the special (artifact) damage, and returns a 1 if it
 * did something special (in which case the caller won't print the normal
 * hit message).  This should be called once upon every artifact attack;
 * dmgval() no longer takes artifact bonuses into account.  Possible
 * extension: change the killer so that when an orc kills you with
 * Stormbringer it's "killed by Stormbringer" instead of "killed by an orc".
 * C passes the damage by pointer; here dmgp.val is read and updated.
 */
export async function artifact_hit(
    magr,   /* attacker; might be Null if 'mdef' is youmonst */
    mdef,   /* defender */
    otmp,   /* artifact weapon */
    dmgp,   /* { val } -- output */
    dieroll) { /* needed for Magicbane and vorpal blades */
    const u = game.u;
    const youattack = (magr === game.youmonst);
    const youdefend = (mdef === game.youmonst);
    const vis = (!youattack && magr && cansee_art(magr.mx, magr.my))
                || (!youdefend && cansee_art(mdef.mx, mdef.my))
                || (youattack && u.uswallow && u.ustuck === mdef
                    && !Blind_art());
    const hittee = youdefend ? "you" : mon_nam_art(mdef);

    /* The following takes care of most of the damage, but not all--
     * the exception being for level draining, which is specially
     * handled.  Messages are done in this function, however.
     */
    dmgp.val += spec_dbon(otmp, mdef, dmgp.val);

    if (youattack && youdefend) {
        /* impossible("attacking yourself with weapon?") */
        return false;
    }

    const realizes_damage = (youdefend || vis
                             /* feel the effect even if not seen */
                             || (youattack && mdef === u.ustuck));

    /* the four basic attacks: fire, cold, shock and missiles */
    if (attacks(M.AD_FIRE, otmp)) {
        if (realizes_damage)
            await pline(`The fiery blade ${
                !game.spec_dbon_applies
                    ? "hits"
                    : (mdef.data === M.mons[M.PM_WATER_ELEMENTAL])
                          ? "vaporizes part of"
                          : "burns"} ${hittee}${
                !game.spec_dbon_applies ? '.' : '!'}`);
        if (!rn2(4)) {
            const itemdmg = await destroy_items_art(mdef, M.AD_FIRE, dmgp.val);
            if (!youdefend)
                dmgp.val += itemdmg; /* item destruction dmg */
            await ignite_items_art(mdef.minvent);
        }
        if (youdefend && game.u.uprops[SLIMED_ART].intrinsic)
            throw new Error('artifact_hit(): burn_away_slime() not ported yet');
        return realizes_damage;
    }
    if (attacks(M.AD_COLD, otmp)) {
        if (realizes_damage)
            await pline(`The ice-cold blade ${
                !game.spec_dbon_applies ? "hits" : "freezes"} ${hittee}${
                !game.spec_dbon_applies ? '.' : '!'}`);
        if (!rn2(4)) {
            const itemdmg = await destroy_items_art(mdef, M.AD_COLD, dmgp.val);
            if (!youdefend)
                dmgp.val += itemdmg; /* item destruction dmg */
        }
        return realizes_damage;
    }
    if (attacks(M.AD_ELEC, otmp)) {
        if (realizes_damage)
            await pline(`The massive hammer hits${
                !game.spec_dbon_applies ? "" : "!  Lightning strikes"} ${
                hittee}${!game.spec_dbon_applies ? '.' : '!'}`);
        if (game.spec_dbon_applies)
            await wake_nearto_art(mdef.mx, mdef.my, 4 * 4);
        if (!rn2(5)) {
            const itemdmg = await destroy_items_art(mdef, M.AD_ELEC, dmgp.val);
            if (!youdefend)
                dmgp.val += itemdmg; /* item destruction dmg */
        }
        return realizes_damage;
    }
    if (attacks(M.AD_MAGM, otmp)) {
        if (realizes_damage)
            await pline(`The imaginary widget hits${
                !game.spec_dbon_applies
                    ? ""
                    : "!  A hail of magic missiles strikes"} ${
                hittee}${!game.spec_dbon_applies ? '.' : '!'}`);
        return realizes_damage;
    }

    if (attacks(M.AD_STUN, otmp) && dieroll <= MB_MAX_DIEROLL) {
        /* Magicbane's special attacks (possibly modifies hittee[]) */
        throw new Error('artifact_hit(): Mb_hit() not ported yet');
    }

    if (!game.spec_dbon_applies) {
        /* since damage bonus didn't apply, nothing more to do;
           no further attacks have side-effects on inventory */
        return false;
    }

    /* We really want "on a natural 20" but Nethack does it in */
    /* reverse from AD&D. */
    if (spec_ability(otmp, SPFX_BEHEAD)) {
        if ((otmp.oartifact === ART_TSURUGI_OF_MURAMASA && dieroll === 1)
            || (otmp.oartifact === ART_VORPAL_BLADE
                && (dieroll === 1 || mdef.data === M.mons[M.PM_JABBERWOCK])))
            throw new Error('artifact_hit(): beheading/bisecting not ported yet');
    }
    if (spec_ability(otmp, SPFX_DRLI))
        throw new Error('artifact_hit(): level-draining artifact hit not ported yet');
    return false;
}

// C ref: artifact.c spec_dbon()
/* special damage bonus */
export function spec_dbon(otmp, mon, tmp) {
    const weap = get_artifact(otmp);

    if ((weap === artilist()[ART_NONARTIFACT])
        || (weap.attk.adtyp === M.AD_PHYS /* check for `NO_ATTK' */
            && weap.attk.damn === 0 && weap.attk.damd === 0))
        game.spec_dbon_applies = false;
    else if (otmp.oartifact === ART_GRIMTOOTH)
        /* Grimtooth has SPFX settings to warn against elves but we want its
           damage bonus to apply to all targets, so bypass spec_applies() */
        game.spec_dbon_applies = true;
    else
        game.spec_dbon_applies = !!spec_applies(weap, mon);

    if (game.spec_dbon_applies)
        return weap.attk.damd ? rnd(weap.attk.damd) : Math.max(tmp, 1);
    return 0;
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

// C ref: artifact.c touch_artifact() -- the badclass/badalign tests,
// shared by touch_artifact() and touch_artifact_mon(); no dice
function touch_artifact_tests(oart, mon) {
    let badclass, badalign;
    const u = game.u;
    const yours = (mon === game.youmonst);
    /* all quest artifacts are self-willed; if this ever changes, `badclass'
       will have to be extended to explicitly include quest artifacts */
    const self_willed = ((oart.spfx & SPFX_INTEL) !== 0);

    if (yours) {
        badclass = self_willed
                   && ((oart.role !== NON_PM && game.urole.mnum !== oart.role) /* !Role_if() */
                       || (oart.race !== NON_PM
                           && game.urace.mnum !== oart.race)); /* !Race_if() */
        badalign = ((oart.spfx & SPFX_RESTR) !== 0
                    && oart.alignment !== A_NONE
                    && (oart.alignment !== u.ualign.type
                        || u.ualign.record < 0));
    } else if (!(mon.data.mflags3 & M.M3_COVETOUS) /* !is_covetous() */
               && !is_mplayer(mon.data)) {
        badclass = self_willed && oart.role !== NON_PM
                   && oart !== artilist()[ART_EXCALIBUR];
        badalign = !!(oart.spfx & SPFX_RESTR) && oart.alignment !== A_NONE
                   && (oart.alignment !== mon_aligntyp(mon));
    } else { /* an M3_WANTSxxx monster or a fake player */
        /* special monsters trying to take the Amulet, invocation tools or
           quest item can touch anything except `spec_applies' artifacts */
        badclass = badalign = false;
    }
    /* weapons which attack specific categories of monsters are
       bad for them even if their alignments happen to match */
    if (!badalign)
        badalign = bane_applies(oart, mon);
    return { yours, self_willed, badclass, badalign };
}

// C ref: artifact.c touch_artifact()
/*
 * creature (usually hero) tries to touch (pick up or wield) an artifact obj.
 * Returns 0 if the object refuses to be touched.
 * This routine does not change any object chains.
 * Ignores such things as gauntlets, assuming the artifact is not
 * fooled by such trappings.
 */
export async function touch_artifact(obj, mon) {
    const oart = get_artifact(obj);

    game.touch_blasted = false;
    if (oart === artilist()[ART_NONARTIFACT])
        return 1;

    const { yours, self_willed, badclass, badalign } = touch_artifact_tests(oart, mon);

    if (((badclass || badalign) && self_willed)
        || (badalign && (!yours || !rn2(4)))) {
        let dmg, tmp;

        if (!yours)
            return 0;
        await You(`are blasted by ${s_suffix(the(xname(obj)))} power!`);
        game.touch_blasted = true;
        dmg = d((Antimagic() ? 2 : 4), (self_willed ? 10 : 4));
        /* add half (maybe quarter) of the usual silver damage bonus */
        if (O.objects[obj.otyp].oc_material === O.SILVER && Hate_silver()) {
            tmp = rnd(10);
            dmg += Maybe_Half_Phys(tmp);
        }
        await losehp(dmg, `touching ${oart.name}`, KILLED_BY); /* magic damage, not physical */
        exercise(A_WIS, false);
    }

    /* can pick it up unless you're totally non-synch'd with the artifact */
    if (badclass && badalign && self_willed) {
        if (yours) {
            if (obj.where !== 'OBJ_INVENT') /* !carried(obj) */
                await pline(`${Tobjnam(obj, "evade")} your grasp!`);
            else
                await pline(`${Tobjnam(obj, "are")} beyond your control!`);
        }
        return 0;
    }

    return 1;
}

// C ref: artifact.c touch_artifact() -- for synchronous monster callers;
// a monster touching an artifact rolls no dice and gets no messages
export function touch_artifact_mon(obj, mon) {
    const oart = get_artifact(obj);

    if (mon === game.youmonst)
        throw new Error('touch_artifact_mon(): the hero needs touch_artifact()');
    game.touch_blasted = false;
    if (oart === artilist()[ART_NONARTIFACT])
        return 1;

    const { self_willed, badclass, badalign } = touch_artifact_tests(oart, mon);

    if (((badclass || badalign) && self_willed) || badalign)
        return 0; /* (!yours) */

    /* can pick it up unless you're totally non-synch'd with the artifact */
    if (badclass && badalign && self_willed)
        return 0;

    return 1;
}


// C ref: artifact.c retouch_object()
/* decide whether a particular item can be used by the hero; returns 1 if
   it can, 0 if it can't (and may have been dropped).  C passes the object
   by reference so that it can be cleared; the callers here only use the
   return value. */
export async function retouch_object(obj,
                                     loseit) /* whether to drop it if hero can longer touch it */ {
    const u = game.u;

    /* allow hero in silver-hating form to try to perform invocation ritual */
    if (obj.otyp === O.BELL_OF_OPENING
        && invocation_pos(u.ux, u.uy) && !On_stairs(u.ux, u.uy)) {
        return 1;
    }

    if (await touch_artifact(obj, game.youmonst)) {
        let dmg = 0, tmp;
        const ag = (O.objects[obj.otyp].oc_material === O.SILVER && Hate_silver()),
              bane = bane_applies(get_artifact(obj), game.youmonst);

        /* nothing else to do if hero can successfully handle this object */
        if (!ag && !bane)
            return 1;

        /* hero can't handle this object, but didn't get touch_artifact()'s
           "<obj> evades your grasp|control" message; give an alternate one */
        await You_cant(`handle ${yname(obj)}${obj.owornmask ? " anymore" : ""}!`);
        /* also inflict damage unless touch_artifact() already did so */
        if (!game.touch_blasted) {
            let what = killer_xname(obj);

            if (ag && !obj.oartifact && !bane) {
                /* 'obj' is silver; for rings and wands it ended up that
                   way due to randomization at start of game; showing this
                   game's silver item without stating that it is silver
                   potentially leads to confusion about cause of death */
                if (obj.oclass === O.RING_CLASS)
                    what = "a silver ring";
                else if (obj.oclass === O.WAND_CLASS)
                    what = "a silver wand";
                /* for anything else, stick with killer_xname() */
            }
            /* damage is somewhat arbitrary; half the usual 1d20 physical
               for silver, 1d10 magical for <foo>bane, potentially both */
            if (ag) {
                tmp = rnd(10);
                dmg += Maybe_Half_Phys(tmp);
            }
            if (bane)
                dmg += rnd(10);
            await losehp(dmg, `handling ${what}`, KILLED_BY);
            exercise(A_CON, false);
        }
    }

    /* removing a worn item might result in loss of levitation,
       dropping the hero onto a polymorph trap or into water or
       lava and potentially dropping or destroying the item */
    if (obj.owornmask) {
        let otmp;

        await remove_worn_item(obj, false);
        for (otmp = game.invent; otmp; otmp = otmp.nobj)
            if (otmp === obj)
                break;
        if (!otmp)
            obj = null; /* *objp = obj = 0 */
    }

    /* if we still have it and caller wants us to drop it, do so now */
    if (loseit && obj) {
        if (Levitation()) {
            freeinv(obj);
            await hitfloor(obj, true);
        } else {
            /* dropx gives a message if a dropped item lands on an altar;
               we provide one for other terrain */
            if (!IS_ALTAR(game.level.at(u.ux, u.uy).typ))
                await pline(`${Tobjnam(obj, "fall")} to the ${surface(u.ux, u.uy)}.`);
            await dropx(obj);
        }
        obj = null; /* no longer in inventory */
    }
    return 0;
}

// C ref: artifact.c untouchable()
/* an item is "untouchable" if it can't be handled by the hero; returns
   True if the hero loses it (or its use) */
async function untouchable(
    obj, /* object to test; in invent or is steed's saddle */
    drop_untouchable) /* whether to drop it if it can't be touched */ {
    const u = game.u;
    let art;
    let carryeffect, invoked;
    const wearmask = ~(W_QUIVER | (u.twoweap ? 0 : W_SWAPWEP) | W_BALL);

    const beingworn = (obj /* never Null; this pacifies static analysis when
                            * the get_artifact() macro tests 'obj' for Null */
                       && ((obj.owornmask & wearmask) !== 0
                           /* some items in use don't have any wornmask setting */
                           || (obj.oclass === O.TOOL_CLASS
                               && (obj.lamplit
                                   || (obj.otyp === O.LEASH && obj.leashmon)
                                   || (Is_container(obj)
                                       && obj.cobj && obj.cobj.length)))));

    if ((art = get_artifact(obj)) !== artilist()[ART_NONARTIFACT]) {
        carryeffect = !!(art.cary.adtyp || art.cspfx);
        invoked = (art.inv_prop > 0 && art.inv_prop <= LAST_PROP
                   && (u.uprops[art.inv_prop].extrinsic & W_ARTI) !== 0);
    } else {
        carryeffect = invoked = false;
    }

    if (beingworn || carryeffect || invoked) {
        if (!await retouch_object(obj, drop_untouchable)) {
            /* "<artifact> is beyond your control" or "you can't handle
               <object>" has been given and it is now unworn/unwielded
               and possibly dropped (depending upon caller); if dropped,
               carried effect was turned off, else we leave that alone;
               we turn off invocation property here if still carried */
            if (invoked && obj)
                throw new Error('untouchable(): arti_invoke() not ported yet');
            return true;
        }
    }
    return false;
}

// C ref: artifact.c retouch_equipment()
/* check all items currently in use (mostly worn) for touchability */
let retouch_nesting = 0; /* recursion control */
export async function retouch_equipment(
    dropflag) /* 0==don't drop, 1==drop all, 2==drop weapon */ {
    const g = game;
    const u = g.u;
    let obj;
    let dropit;
    const had_gloves = (g.uarmg != null);
    const had_rings = ((g.uleft ? 1 : 0) + (g.uright ? 1 : 0));

    /*
     * We can potentially be called recursively if losing/unwearing
     * an item causes worn helm of opposite alignment to come off or
     * be destroyed.
     */
    if (!retouch_nesting++)
        clear_bypasses(); /* init upon initial entry */

    dropit = (dropflag > 0); /* drop all or drop weapon */
    /* check secondary weapon first, before possibly unwielding primary */
    if (u.twoweap) {
        bypass_obj(g.uswapwep); /* so loop below won't process it again */
        await untouchable(g.uswapwep, dropit);
    }
    /* check primary weapon next so that they're handled together */
    if (g.uwep) {
        bypass_obj(g.uwep); /* so loop below won't process it again */
        await untouchable(g.uwep, dropit);
    }

    /* in case someone is daft enough to add artifact or silver saddle */
    if (u.usteed && (obj = which_armor(u.usteed, W_SADDLE)) != null) {
        /* untouchable() calls retouch_object() which expects an object in
           hero's inventory, but remove_worn_item() will be harmless for
           saddle and we're suppressing drop, so this works as intended */
        if (await untouchable(obj, false))
            throw new Error('retouch_equipment(): dismount_steed(DISMOUNT_THROWN) not ported yet');
    }

    dropit = (dropflag === 1); /* all untouchable items */
    /* loss of levitation (silver ring, or Heart of Ahriman invocation)
       might cause hero to lose inventory items (by dropping into lava,
       for instance), so inventory traversal needs to rescan the whole
       inventory chain each time it moves on to another object; we use
       bypass handling to keep track of which items have been processed */
    while ((obj = nxt_unbypassed_obj(g.invent)) != null)
        await untouchable(obj, dropit);

    if (had_rings !== ((g.uleft ? 1 : 0) + (g.uright ? 1 : 0))
        && g.uarmg && g.uarmg.cursed)
        throw new Error('retouch_equipment(): uncurse(uarmg) not ported yet');
    if (had_gloves && !g.uarmg)
        await selftouch("After losing your gloves, you");

    if (!--retouch_nesting)
        clear_bypasses(); /* reset upon final exit */
}

// C ref: artifact.c arti_speak()
/* Artifacts that are speaking */
export async function arti_speak(obj) {
    const oart = get_artifact(obj);
    let line;

    /* Is this a speaking artifact? */
    if (oart === artilist()[ART_NONARTIFACT] || !(oart.spfx & SPFX_SPEAK))
        return ECMD_OK; /* nothing happened */

    const buf = { s: '' };

    line = getrumor(bcsign(obj), buf, true);
    if (!line)
        line = "NetHack rumors file closed for renovation.";
    await pline(`${Tobjnam(obj, "whisper")}:`);
    /* SetVoice(): no voice interface */
    await pline(`"${line}"`); /* verbalize1() */
    return ECMD_TIME;
}

// C ref: artifact.c abil_to_adtyp() -- 'abil' is the property index
// standing in for C's &u.uprops[propidx].extrinsic
function abil_to_adtyp(abil) {
    const abil2adtyp = [
        { abil: FIRE_RES, adtyp: M.AD_FIRE },      /* &EFire_resistance */
        { abil: COLD_RES, adtyp: M.AD_COLD },      /* &ECold_resistance */
        { abil: SHOCK_RES, adtyp: M.AD_ELEC },     /* &EShock_resistance */
        { abil: ANTIMAGIC, adtyp: M.AD_MAGM },     /* &EAntimagic */
        { abil: DISINT_RES, adtyp: M.AD_DISN },    /* &EDisint_resistance */
        { abil: POISON_RES, adtyp: M.AD_DRST },    /* &EPoison_resistance */
        { abil: DRAIN_RES, adtyp: M.AD_DRLI },     /* &EDrain_resistance */
    ];

    for (let k = 0; k < abil2adtyp.length; k++) {
        if (abil2adtyp[k].abil === abil)
            return abil2adtyp[k].adtyp;
    }
    return 0;
}

// C ref: artifact.c abil_to_spfx() -- 'abil' is the property index
function abil_to_spfx(abil) {
    const abil2spfx = [
        { abil: SEARCHING, spfx: SPFX_SEARCH },
        { abil: HALLUC_RES, spfx: SPFX_HALRES },
        { abil: TELEPAT, spfx: SPFX_ESP },
        { abil: STEALTH, spfx: SPFX_STLTH },
        { abil: REGENERATION, spfx: SPFX_REGEN },
        { abil: TELEPORT_CONTROL, spfx: SPFX_TCTRL },
        { abil: WARN_OF_MON, spfx: SPFX_WARN },
        { abil: WARNING, spfx: SPFX_WARN },
        { abil: ENERGY_REGENERATION, spfx: SPFX_EREGEN },
        { abil: HALF_SPDAM, spfx: SPFX_HSPDAM },
        { abil: HALF_PHDAM, spfx: SPFX_HPHDAM },
        { abil: REFLECTING, spfx: SPFX_REFLECT },
    ];

    for (let k = 0; k < abil2spfx.length; k++) {
        if (abil2spfx[k].abil === abil)
            return abil2spfx[k].spfx;
    }
    return 0;
}

// C ref: artifact.c what_gives() -- 'abil' is the property index
// standing in for C's &u.uprops[propidx].extrinsic
/*
 * Return the first item that is conveying a particular intrinsic.
 */
export function what_gives(abil) {
    const u = game.u;
    let dtyp;
    let spfx;
    let wornbits;
    let wornmask = (W_ARM | W_ARMC | W_ARMH | W_ARMS
                    | W_ARMG | W_ARMF | W_ARMU
                    | W_AMUL | W_RINGL | W_RINGR | W_TOOL
                    | W_ART | W_ARTI);

    if (u.twoweap)
        wornmask |= W_SWAPWEP;
    dtyp = abil_to_adtyp(abil);
    spfx = abil_to_spfx(abil);
    wornbits = (wornmask & u.uprops[abil].extrinsic);

    for (let obj = game.invent; obj; obj = obj.nobj) {
        if (obj.oartifact
            && (abil !== WARN_OF_MON || game.context.warntype?.obj)) {
            const art = get_artifact(obj);

            if (art !== artilist()[ART_NONARTIFACT]) {
                if (dtyp) {
                    if (art.cary.adtyp === dtyp /* carried */
                        || (art.defn.adtyp === dtyp /* defends while worn */
                            && (obj.owornmask & ~(W_ART | W_ARTI))))
                        return obj;
                }
                if (spfx) {
                    /* property conferred when carried */
                    if ((art.cspfx & spfx) === spfx)
                        return obj;
                    /* property conferred when wielded or worn */
                    if ((art.spfx & spfx) === spfx && obj.owornmask)
                        return obj;
                }
                if (obj === game.uwep && abil === BLND_RES
                    && (u.uprops[abil].extrinsic & W_WEP) !== 0) {
                    return obj; /* Sunsword */
                }
            }
        } else {
            if (wornbits && wornbits === (wornmask & obj.owornmask))
                return obj;
        }
    }
    return null;
}

// C ref: artifact.c invoke_ok() -- getobj callback for #invoke
function invoke_ok(obj) {
    if (!obj)
        return GETOBJ_EXCLUDE;

    /* artifacts and other special items */
    if (obj.oartifact || O.objects[obj.otyp].oc_unique
        || (obj.otyp === O.FAKE_AMULET_OF_YENDOR && !obj.known))
        return GETOBJ_SUGGEST;

    /* synonym for apply, though actually invoking it will do different things
     * depending if it's a regular crystal ball, an artifact one that has an
     * invoke power, and a (theoretical) artifact one that doesn't have an
     * invoke power */
    if (obj.otyp === O.CRYSTAL_BALL)
        return GETOBJ_SUGGEST;

    return GETOBJ_EXCLUDE;
}

// C ref: artifact.c doinvoke() -- the #invoke command (M-i)
export async function doinvoke() {
    const obj = await getobj("invoke", invoke_ok, GETOBJ_PROMPT);
    if (!obj)
        return ECMD_CANCEL;
    if (!await retouch_object(obj, false))
        return ECMD_TIME;
    return await arti_invoke(obj);
}

// C ref: artifact.c arti_invoke() -- objects without an invoke power;
// the invoke powers themselves aren't ported yet
async function arti_invoke(obj) {
    if (!obj)
        throw new Error('arti_invoke without obj'); /* impossible() */
    const oart = get_artifact(obj);
    if (oart === artilist()[ART_NONARTIFACT] || !oart.inv_prop) {
        if (obj.otyp === O.CRYSTAL_BALL)
            throw new Error('arti_invoke(): use_crystal_ball() not ported yet');
        else
            await pline(nothing_happens);
        return ECMD_TIME;
    }

    /* It's a special power, not "just" a property */
    throw new Error('arti_invoke(): artifact invoke powers (arti_invoke_cost(), invoke_*()) not ported yet');
}

// C ref: artifact.c is_magic_key()
export function is_magic_key(mon, /* if null, non-rogue is assumed */
                             obj) {
    if (obj && obj.oartifact === ART_MASTER_KEY_OF_THIEVERY) { /* is_art() */
        if ((mon === game.youmonst) ? game.urole.mnum === M.PM_ROGUE /* Role_if() */
                                    : (mon && mon.data === M.mons[M.PM_ROGUE]))
            return !obj.cursed; /* a rogue; non-cursed suffices for magic */
        /* not a rogue; key must be blessed to behave as a magic one */
        return !!obj.blessed;
    }
    return false;
}

// C ref: artifact.c has_magic_key()
/* figure out whether 'mon' (usually youmonst) is carrying the magic key */
export function has_magic_key(mon) { /* if null, hero assumed */
    const key = artilist()[ART_MASTER_KEY_OF_THIEVERY].otyp;

    if (!mon)
        mon = game.youmonst;
    for (let o = (mon === game.youmonst) ? game.invent : mon.minvent; o;
         o = nxtobj(o, key, false)) {
        if (is_magic_key(mon, o))
            return o;
    }
    return null;
}

// C ref: artifact.c arti_cost()
/* the zorkmid value of an object, artifact or not */
export function arti_cost(otmp) {
    if (!otmp.oartifact)
        return objects_ac[otmp.otyp].oc_cost;
    else if (artilist()[otmp.oartifact].cost)
        return artilist()[otmp.oartifact].cost;
    else
        return (100 * objects_ac[otmp.otyp].oc_cost);
}

// C ref: artifact.c is_art()
export function is_art(o, art) { return !!(o && o.oartifact === art); }
