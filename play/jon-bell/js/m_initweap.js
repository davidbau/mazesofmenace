// @ts-nocheck
// makemon.c m_initweap + muse.c rnd_offensive_item (RNG parity for mklev makemon).
// C ref: makemon.c m_initweap (~163–574), muse.c rnd_offensive_item (~2035–2080).
// Object numbers are the objects.h row indices (nethack-c/include/objects.h
// OBJECT/ARMOR/... rows in order, == js/oc_name_data.js OC_NAME index).
// @ts-nocheck
import monsPack from './makemon_mons.json' with { type: 'json' };
import monMsoundPack from './makemon_msound.json' with { type: 'json' };
import { rn2, rnd, rn1 } from './rng.js';
import { game } from './gstate.js';
import { Is_rogue_level, Is_earthlevel, A_LAWFUL, OBJ_MINVENT, ONAME_RANDOM } from './const.js';
import { oname } from './objnam.js';
import { hard_helmet } from './do_wear.js';
import { curse } from './mkobj.js';
import { mpickobj } from './mklev.js';
import { MKOBJ_OC_SKILL } from './mkobj_erosion_meta.js';
import { PM_ABBOT, PM_ACOLYTE, PM_APPRENTICE, PM_ATTENDANT, PM_BALROG, PM_CAPTAIN, PM_CHIEFTAIN, PM_DISPATER, PM_DWARF, PM_ETTIN, PM_ELVENKING, PM_FOREST_CENTAUR, PM_GUIDE, PM_HIGH_PRIEST, PM_HOBBIT, PM_HORNED_DEVIL, PM_HUNTER, PM_LIEUTENANT, PM_NEANDERTHAL, PM_NINJA, PM_ORCUS, PM_OGRE_KING, PM_OGRE_LORD, PM_PAGE, PM_PRIEST, PM_ROSHI, PM_SALAMANDER, PM_SERGEANT, PM_SOLDIER, PM_STUDENT, PM_THUG, PM_WATCHMAN, PM_WATCH_CAPTAIN, PM_WARRIOR, PM_YEENOGHU, PM_GOBLIN, PM_MORDOR_ORC, PM_URUK_HAI, PM_ORC_SHAMAN, PM_ORC_CAPTAIN, } from './pm.generated.js';
/** @typedef {[number, number, number, number, number, number, number, number, number]} MonRow */
const MONS = /** @type {MonRow[]} */ (monsPack.mons);
const MONS_MSOUND = /** @type {number[]} */ (monMsoundPack.msound);
/* C monflag.h:51-56 enum mon_sounds. */
const MS_LEADER = 36;
const MS_NEMESIS = 37;
const MS_GUARDIAN = 38;
const MS_PRIEST = 41;
/* C role.c roles[] index of the Priest role — this port's Role_if(PM_CLERIC).
 * (roles[] order in 5.0 role.c: Archeologist, Barbarian, Caveman, Healer,
 * Knight, Monk, Priest, Rogue, Ranger, Samurai, Tourist, Valkyrie, Wizard.) */
const ROLE_IDX_CLERIC = 6;
const P_POLEARMS = 16;
const S_GIANT = 34;
const S_HUMAN = 53;
const S_ANGEL = 27;
const S_HUMANOID = 8;
const S_KOP = 37;
const S_ORC = 15;
const S_OGRE = 41;
const S_TROLL = 46;
const S_KOBOLD = 11;
const S_CENTAUR = 29;
const S_WRAITH = 49;
const S_ZOMBIE = 52;
const S_LIZARD = 58;
const S_DEMON = 56;
const M1_ANIMAL = 0x00040000;
const M1_MINDLESS = 0x00010000;
const M1_HUMANOID = 0x00020000;
const M1_AMORPHOUS = 0x00000004;
const M1_WALLWALK = 0x00000008;
const M1_UNSOLID = 0x00100000;
const S_GHOST = 54;
const M2_ELF = 0x00000010;
const M2_DWARF = 0x00000020;
const M2_DEMON = 0x00000100;
const M2_MERC = 0x00000200;
const M2_LORD = 0x00000400;
const M2_PRINCE = 0x00000800;
const M2_NASTY = 0x02000000;
const M2_STRONG = 0x04000000;
const WEAPON_CLASS = 2; /* objclass.h */
const ARMOR_CLASS = 4;  /* objclass.h */
/* weapons (WEAPON_CLASS otyp — order matches js/mkobj_data.js OBJECTS_INIT) */
const ARROW = 18;
const ELVEN_ARROW = 19;
const ORCISH_ARROW = 20;
const SILVER_ARROW = 21;
const YA = 22;
const CROSSBOW_BOLT = 23;
const DART = 24;
const SHURIKEN = 25;
const BOOMERANG = 26;
const SPEAR = 27;
const ELVEN_SPEAR = 28;
const ORCISH_SPEAR = 29;
const DWARVISH_SPEAR = 30;
const SILVER_SPEAR = 31;
const JAVELIN = 32;
const TRIDENT = 33;
const DAGGER = 34;
const ELVEN_DAGGER = 35;
const ORCISH_DAGGER = 36;
const SILVER_DAGGER = 37;
const ATHAME = 38;
const SCALPEL = 39;
const KNIFE = 40;
const STILETTO = 41;
const WORM_TOOTH = 42;
const CRYSKNIFE = 43;
const AXE = 44;
const BATTLE_AXE = 45;
const SHORT_SWORD = 46;
const ELVEN_SHORT_SWORD = 47;
const ORCISH_SHORT_SWORD = 48;
const DW_SHORT_SWORD = 49;
const SCIMITAR = 50;
const SILVER_SABER = 51;
const BROADSWORD = 52;
const ELVEN_BROADSWORD = 53;
const LONG_SWORD = 54;
const TWO_HANDED_SWORD = 55;
const KATANA = 56;
const TSURUGI = 57;
const RUNESWORD = 58;
const PARTISAN = 59;
const RANSEUR = 60;
const SPETUM = 61;
const GLAIVE = 62;
const HALBERD = 63;
const BARDICHE = 64;
const VOULGE = 65;
const FAUCHARD = 66;
const GUISARME = 67;
const BILL_GUISARME = 68;
const LUCERN_HAMMER = 69;
const BEC_DE_CORBIN = 70;
const DWARVISH_MATTOCK = 71;
const LANCE = 72;
const MACE = 73;
const SILVER_MACE = 74;
const MORNING_STAR = 75;
const WAR_HAMMER = 76;
const CLUB = 77;
const RUBBER_HOSE = 78;
const QUARTERSTAFF = 79;
const AKLYS = 80;
const FLAIL = 81;
const BULLWHIP = 82;
const BOW = 83;
const ELVEN_BOW = 84;
const ORCISH_BOW = 85;
const YUMI = 86;
const SLING = 87;
const CROSSBOW = 88;
/* armor */
const ELVEN_LEATHER_HELM = 89;
const ELVEN_MITHRIL_COAT = 127;
const CHAIN_MAIL = 128;
const ORCISH_CHAIN_MAIL = 129;
const LEATHER_ARMOR = 134;
const LEATHER_JACKET = 135;
const ELVEN_CLOAK = 139;
const ORCISH_CLOAK = 140;
const DWARVISH_CLOAK = 141;
const LEATHER_CLOAK = 145;
const ORCISH_HELM = 90;
const SMALL_SHIELD = 150;
const ELVEN_SHIELD = 153;
const URUK_HAI_SHIELD = 154;
const ORCISH_SHIELD = 155;
const LARGE_SHIELD = 156;
const DWARVISH_ROUNDSHIELD = 157;
const SHIELD_OF_REFLECTION = 158;
const LEATHER_GLOVES = 159;
const LOW_BOOTS = 163;
const IRON_SHOES = 164;
const HIGH_BOOTS = 165;
const ELVEN_BOOTS = 169;
const DWARVISH_IRON_HELM = 91;
const DWARVISH_MITHRIL_COAT = 126;
const BOULDER = 475;
const PICK_AXE = 259;
const CRYSTAL_BALL = 231;
const CREAM_PIE = 287;
const FLINT = 473;
const ROCK = 474;
const WAN_DEATH = 433;
const WAN_STRIKING = 417;
const WAN_MAGIC_MISSILE = 429;
const WAN_SLEEP = 432;
const WAN_FIRE = 430;
const WAN_COLD = 431;
const WAN_LIGHTNING = 434;
const POT_HEALING = 307;
const POT_ACID = 320;
const POT_CONFUSION = 299;
const POT_BLINDNESS = 300;
const POT_PARALYSIS = 301;
const POT_SLEEPING = 314;
const SCR_EARTH = 340;
/** @param {{ mndx?: number, mnum?: number }} mtmp */
function monsndx(mtmp) {
    return (mtmp.mndx ?? mtmp.mnum) | 0;
}
function monMlet(mndx) {
    return MONS[mndx][0] | 0;
}
function monDifficulty(mndx) {
    return MONS[mndx][2] | 0;
}
function monMflags1(mndx) {
    /* C permonst: row[5]=mr1 (resistance bitfield), row[6]=mflags1.
     * mflags1 carries M1_ANIMAL, M1_MINDLESS, M1_FLY, M1_SWIM etc.
     * (see js/makemon.js monMflags1, same convention). */
    return MONS[mndx][6] | 0;
}
function monMflags2(mndx) {
    return MONS[mndx][7] | 0;
}
function monAlign(mndx) {
    return MONS[mndx][4] | 0;
}
function isMercenary(mndx) {
    return (monMflags2(mndx) & M2_MERC) !== 0;
}
function isElfMndx(mndx) {
    return (monMflags2(mndx) & M2_ELF) !== 0;
}
function isDwarfMndx(mndx) {
    return (monMflags2(mndx) & M2_DWARF) !== 0;
}
function humanoidMndx(mndx) {
    return (monMflags1(mndx) & M1_HUMANOID) !== 0;
}
function isStrong(mndx) {
    return (monMflags2(mndx) & M2_STRONG) !== 0;
}
function isLordMndx(mndx) {
    return (monMflags2(mndx) & M2_LORD) !== 0;
}
function isPrinceMndx(mndx) {
    return (monMflags2(mndx) & M2_PRINCE) !== 0;
}
function extraNastyMndx(mndx) {
    return (monMflags2(mndx) & M2_NASTY) !== 0;
}
function isDemonMndx(mndx) {
    return (monMflags2(mndx) & M2_DEMON) !== 0;
}
/** C permonst.msound (MS_*) per MON() row — js/makemon_msound.json, the same
 * pack js/makemon.js MONS_MSOUND reads (gen-mons-msound.mjs). */
function monMsound(mndx) {
    return MONS_MSOUND[mndx | 0] | 0;
}
/**
 * C you.h:247 Role_if(X) — gu.urole.mnum == X.  This port carries the hero's
 * role as an INDEX into role.c roles[] (game.flags.initrole), not as a
 * permonst number, so the comparison is against the role index; same encoding
 * js/objnam.js:3199 _Role_if and js/do_wear.js:2475 _Role_if_cleric use.
 * @param {number} role_idx
 */
function Role_if(role_idx) {
    const g = game;
    const ir = (g.flags && g.flags.initrole != null) ? (g.flags.initrole | 0) : -1;
    if (ir >= 0)
        return ir === (role_idx | 0);
    return ((g.urole && g.urole.mnum != null) ? (g.urole.mnum | 0) : -1) === (role_idx | 0);
}
/**
 * C makemon.c:11-13
 *   #define quest_mon_represents_role(mptr, role_pm) \
 *       (mptr->mlet == S_HUMAN && Role_if(role_pm)   \
 *        && (mptr->msound == MS_LEADER || mptr->msound == MS_NEMESIS))
 * @param {number} mndx
 * @param {number} rolePm  roles[] index (this port's Role_if encoding)
 */
function questMonRepresentsRole(mndx, rolePm) {
    return monMlet(mndx) === S_HUMAN
        && Role_if(rolePm)
        && (monMsound(mndx) === MS_LEADER || monMsound(mndx) === MS_NEMESIS);
}
/** C makemon.c:263 `ptr->msound == MS_PRIEST`.  (The old hand-rolled PM index
 * set {PM_PRIEST, PM_HIGH_PRIEST} is exactly the MS_PRIEST set — 275 "aligned
 * cleric" and 276 "high cleric" — so this is the same predicate read from the
 * generated table instead of by hand.) */
function isPriestMndx(mndx) {
    return monMsound(mndx) === MS_PRIEST;
}
/** C makemon.c:272 `ptr->msound == MS_GUARDIAN`.  (Same set as the old
 * hand-rolled PM index list — the 13 quest guardians — read from the generated
 * msound table instead.) */
function isGuardianMndx(mndx) {
    return monMsound(mndx) === MS_GUARDIAN;
}
function sgn(x) {
    return (x > 0) - (x < 0);
}
function blessObj(o) {
    if (!o)
        return;
    o.blessed = true;
    o.cursed = false;
}
function curseObj(o) {
    if (!o)
        return;
    o.cursed = true;
}
function hardHelmet(mtmp) {
    /* C muse.c asks hard_helmet(which_armor(mtmp, W_ARMH)). */
    for (let obj = mtmp?.minvent; obj; obj = obj.nobj) {
        if ((obj.owornmask | 0) & 0x0004)
            return hard_helmet(obj);
    }
    return false;
}
function amorphousMndx(mndx) {
    return (monMflags1(mndx) & M1_AMORPHOUS) !== 0;
}
function passesWallsMndx(mndx) {
    return (monMflags1(mndx) & M1_WALLWALK) !== 0;
}
function noncorporealMndx(mndx) {
    return monMlet(mndx) === S_GHOST;
}
function unsolidMndx(mndx) {
    return (monMflags1(mndx) & M1_UNSOLID) !== 0;
}
/** C mondata.h:64 mindless(ptr) — (mflags1 & M1_MINDLESS) != 0 */
function mindlessMon(mndx) {
    return (monMflags1(mndx) & M1_MINDLESS) !== 0;
}
/** C muse.c attacktype(pm, AT_EXPL) — monsters with the AT_EXPL proximity-explode
 * attack. C ref: monattk.h:23 AT_EXPL=13; mondata.c:54 attacktype scans pm->mattk[].
 * monsters.h: freezing sphere (29), flaming sphere (30), shocking sphere (31),
 * yellow light (118), black light (119). permonst.mattk[] is not packed into
 * makemon_mons.json, so this is checked by PM index set (mirrors js/makemon.js
 * MON_HAS_EXPL_ATK / attacktypeExpl). */
const MON_HAS_EXPL_ATK = new Set([
    29, /* PM_FREEZING_SPHERE — AT_EXPL AD_COLD */
    30, /* PM_FLAMING_SPHERE  — AT_EXPL AD_FIRE */
    31, /* PM_SHOCKING_SPHERE — AT_EXPL AD_ELEC */
    118, /* PM_YELLOW_LIGHT   — AT_EXPL AD_BLND */
    119, /* PM_BLACK_LIGHT    — AT_EXPL AD_HALU */
]);
function attacktypeExpl(mndx) {
    return MON_HAS_EXPL_ATK.has(mndx | 0);
}
/**
 * C muse.c rnd_offensive_item
 * @param {{ mndx?: number, mnum?: number }} mtmp
 */
export function rndOffensiveItem(mtmp) {
    const pmIdx = monsndx(mtmp);
    const difficulty = monDifficulty(pmIdx);
    const mlet = monMlet(pmIdx);
    /* C muse.c:2039 — is_animal(pm) || attacktype(pm, AT_EXPL) || mindless(pm)
     *                 || pm->mlet == S_GHOST || pm->mlet == S_KOP */
    if ((monMflags1(pmIdx) & M1_ANIMAL) !== 0 ||
        attacktypeExpl(pmIdx) ||
        mindlessMon(pmIdx) ||
        mlet === S_GHOST ||
        mlet === S_KOP) {
        return 0;
    }
    if (difficulty > 7 && !rn2(35))
        return WAN_DEATH;
    const span = 9 - (difficulty < 4 ? 1 : 0) + 4 * (difficulty > 6 ? 1 : 0);
    switch (rn2(span)) {
        case 0: {
            /* C muse.c:2046 — hard_helmet(which_armor(mtmp, W_ARMH))
             * || amorphous(pm) || passes_walls(pm) || noncorporeal(pm)
             * || unsolid(pm) ? return SCR_EARTH : FALLTHRU to case 1. */
            if (hardHelmet(mtmp)
                || amorphousMndx(pmIdx)
                || passesWallsMndx(pmIdx)
                || noncorporealMndx(pmIdx)
                || unsolidMndx(pmIdx)) {
                return SCR_EARTH;
            }
        }
        /* FALLTHRU */
        case 1:
            return WAN_STRIKING;
        case 2:
            return POT_ACID;
        case 3:
            return POT_CONFUSION;
        case 4:
            return POT_BLINDNESS;
        case 5:
            return POT_SLEEPING;
        case 6:
            return POT_PARALYSIS;
        case 7:
        case 8:
            return WAN_MAGIC_MISSILE;
        case 9:
            return WAN_SLEEP;
        case 10:
            return WAN_FIRE;
        case 11:
            return WAN_COLD;
        case 12:
            return WAN_LIGHTNING;
        default:
            return 0;
    }
}
/**
 * C makemon.c:2180–2228 mongets — mksobj then mpickobj (add_to_minv) onto mtmp.
 * C returns otmp (NULL when otyp is 0, mksobj failed, or mpickobj merged it
 * away); m_initinv's mercenary block reads that return through add_ac(), so
 * the value is load-bearing there and must not be dropped.
 * @param {{ minvent?: any }} mtmp
 * @param {number} otyp
 * @param {(otyp: number, init: boolean, artif: boolean) => any} mksobjFn
 * @returns {any} the created object, or null
 */
function _add_to_minv(mtmp, obj) {
    obj.where = OBJ_MINVENT;
    obj.ocarry = mtmp;
    obj.nobj = mtmp.minvent ?? null;
    mtmp.minvent = obj;
}
/* C monst.h is_lminion(mon): is_minion(mon->data) && mon_aligntyp(mon) ==
 * A_LAWFUL && mon->data->mlet != S_HUMAN (mon_aligntyp is priest.c:
 * a minion's own emin alignment, else sgn(maligntyp)). */
function _is_lminion(mtmp) {
    const mndx = monsndx(mtmp);
    if ((monMflags2(mndx) & 0x00001000) === 0) /* M2_MINION */
        return false;
    const algn = (mtmp.isminion && mtmp.mextra?.emin)
        ? mtmp.mextra.emin.min_align : (MONS[mndx][4] | 0);
    return algn > 0 && algn !== -128 && monMlet(mndx) !== S_HUMAN;
}
export async function mongets(mtmp, otyp, mksobjFn) {
    if (!otyp)
        return null;
    const otmp = await mksobjFn(otyp, true, false);
    /* C makemon.c:2204-2207 — demons never get blessed objects.  Without it a
     * demon's blessed misc potion of invisibility skips you_aggravate()
     * (muse.c:2477-2479, cursed only). */
    if (otmp && monMlet(monsndx(mtmp)) === S_DEMON) {
        if (otmp.blessed)
            curse(otmp);
    } else if (otmp && _is_lminion(mtmp)) {
        /* C makemon.c:2193-2199 — lawful minions don't get cursed, bad, or
         * rusting objects. */
        otmp.cursed = false;
        if ((otmp.spe | 0) < 0)
            otmp.spe = 0;
        otmp.oerodeproof = 1;
        otmp.oeroded = otmp.oeroded2 = 0;
    }
    /* C makemon.c:2218-2223 — princes do not tolerate inferior gear.
     * This adjustment is after the demon/minion/mplayer special cases in C
     * and before mpickobj; it is stateful because weapon damage reads spe. */
    if (otmp && isPrinceMndx(monsndx(mtmp))) {
        if ((otmp.oclass | 0) === WEAPON_CLASS && (otmp.spe | 0) < 1)
            otmp.spe = 1;
        else if ((otmp.oclass | 0) === ARMOR_CLASS && (otmp.spe | 0) < 0)
            otmp.spe = 0;
    }
    /* C makemon.c:2223 — mpickobj → add_to_minv */
    /* C makemon.c:2224-2227 — mpickobj() merges into an existing stack
     * (add_to_minv, mkobj.c:2655) and returns nonzero when otmp was freed. */
    if (otmp && await mpickobj(mtmp, otmp))
        return null;
    return otmp || null;
}
/**
 * C makemon.c:150–160 m_initthrow — mksobj + quan + mpickobj (add_to_minv).
 * @param {{ minvent?: any }} mtmp
 * @param {number} otyp
 * @param {number} oquan
 * @param {(otyp: number, init: boolean, artif: boolean) => any} mksobjFn
 */
async function mInitthrow(mtmp, otyp, oquan, mksobjFn) {
    const otmp = await mksobjFn(otyp, true, false);
    if (otmp) {
        otmp.quan = rn1(oquan, 3) | 0;
        /* C makemon.c:155-156 */
        if (otyp === ORCISH_ARROW)
            otmp.opoisoned = 1;
        /* C makemon.c:159 — mpickobj → add_to_minv (merges) */
        await mpickobj(mtmp, otmp);
    }
}
/**
 * C makemon.c m_initweap(mtmp)
 * @param {{ mndx?: number, mnum?: number, m_lev?: number, minvent?: any }} mtmp
 * @param {(otyp: number, init: boolean, artif: boolean) => any} mksobjFn
 */
export async function mInitweap(mtmp, mksobjFn) {
    const uz = game.u?.uz;
    if (uz && Is_rogue_level(uz))
        return;
    const mndx = monsndx(mtmp);
    const mlet = monMlet(mndx);
    let w1;
    let w2;
    switch (mlet) {
        case S_GIANT: {
            if (rn2(2))
                await mongets(mtmp, mndx !== PM_ETTIN ? BOULDER : CLUB, mksobjFn);
            if (mndx !== PM_ETTIN && !rn2(5))
                await mongets(mtmp, rn2(2) ? TWO_HANDED_SWORD : BATTLE_AXE, mksobjFn);
            break;
        }
        case S_HUMAN: {
            if (isMercenary(mndx)) {
                w1 = 0;
                w2 = 0;
                switch (mndx) {
                    case PM_WATCHMAN:
                    case PM_SOLDIER:
                        if (!rn2(3)) {
                            do {
                                w1 = rn1(BEC_DE_CORBIN - PARTISAN + 1, PARTISAN);
                            } while ((MKOBJ_OC_SKILL[w1] | 0) !== P_POLEARMS);
                            w2 = rn2(2) ? DAGGER : KNIFE;
                        }
                        else
                            w1 = rn2(2) ? SPEAR : SHORT_SWORD;
                        break;
                    case PM_SERGEANT:
                        w1 = rn2(2) ? FLAIL : MACE;
                        break;
                    case PM_LIEUTENANT:
                        w1 = rn2(2) ? BROADSWORD : LONG_SWORD;
                        break;
                    case PM_CAPTAIN:
                    case PM_WATCH_CAPTAIN:
                        w1 = rn2(2) ? LONG_SWORD : SILVER_SABER;
                        break;
                    default:
                        if (!rn2(4))
                            w1 = DAGGER;
                        if (!rn2(7))
                            w2 = SPEAR;
                        break;
                }
                if (w1)
                    await mongets(mtmp, w1, mksobjFn);
                if (!w2 && w1 !== DAGGER && !rn2(4))
                    w2 = KNIFE;
                if (w2)
                    await mongets(mtmp, w2, mksobjFn);
            }
            else if (isElfMndx(mndx)) {
                if (rn2(2))
                    await mongets(mtmp, rn2(2) ? ELVEN_MITHRIL_COAT : ELVEN_CLOAK, mksobjFn);
                if (rn2(2))
                    await mongets(mtmp, ELVEN_LEATHER_HELM, mksobjFn);
                else if (!rn2(4))
                    await mongets(mtmp, ELVEN_BOOTS, mksobjFn);
                if (rn2(2))
                    await mongets(mtmp, ELVEN_DAGGER, mksobjFn);
                switch (rn2(3)) {
                    case 0:
                        if (!rn2(4))
                            await mongets(mtmp, ELVEN_SHIELD, mksobjFn);
                        if (rn2(3))
                            await mongets(mtmp, ELVEN_SHORT_SWORD, mksobjFn);
                        await mongets(mtmp, ELVEN_BOW, mksobjFn);
                        await mInitthrow(mtmp, ELVEN_ARROW, 12, mksobjFn);
                        break;
                    case 1:
                        await mongets(mtmp, ELVEN_BROADSWORD, mksobjFn);
                        if (rn2(2))
                            await mongets(mtmp, ELVEN_SHIELD, mksobjFn);
                        break;
                    case 2:
                        if (rn2(2)) {
                            await mongets(mtmp, ELVEN_SPEAR, mksobjFn);
                            await mongets(mtmp, ELVEN_SHIELD, mksobjFn);
                        }
                        break;
                }
                if (mndx === PM_ELVENKING) {
                    if (rn2(3) || !!(game.in_mklev && uz && Is_earthlevel(uz)))
                        await mongets(mtmp, PICK_AXE, mksobjFn);
                    if (!rn2(50))
                        await mongets(mtmp, CRYSTAL_BALL, mksobjFn);
                }
            }
            else if (isPriestMndx(mndx) || questMonRepresentsRole(mndx, ROLE_IDX_CLERIC)) {
                /* C makemon.c:265-269 —
                 *     otmp = mksobj(MACE, FALSE, FALSE);
                 *     otmp->spe = rnd(3);
                 *     if (!rn2(2)) curse(otmp);
                 *     (void) mpickobj(mtmp, otmp);            */
                const otmp = await mksobjFn(MACE, false, false);
                if (otmp) {
                    otmp.spe = rnd(3);
                    if (!rn2(2))
                        curseObj(otmp);
                    /* mpickobj → add_to_minv */
                    _add_to_minv(mtmp, otmp);
                }
            }
            else if (mndx === PM_NINJA) {
                await mongets(mtmp, rn2(4) ? SHURIKEN : DART, mksobjFn);
                await mongets(mtmp, rn2(4) ? SHORT_SWORD : AXE, mksobjFn);
            }
            else if (isGuardianMndx(mndx)) {
                switch (mndx) {
                    case PM_STUDENT:
                    case PM_ATTENDANT:
                    case PM_ABBOT:
                    case PM_ACOLYTE:
                    case PM_GUIDE:
                    case PM_APPRENTICE:
                        if (rn2(2))
                            await mongets(mtmp, rn2(3) ? DAGGER : KNIFE, mksobjFn);
                        if (rn2(5))
                            await mongets(mtmp, rn2(3) ? LEATHER_JACKET : LEATHER_CLOAK, mksobjFn);
                        if (rn2(3))
                            await mongets(mtmp, rn2(3) ? LOW_BOOTS : HIGH_BOOTS, mksobjFn);
                        if (rn2(3))
                            await mongets(mtmp, POT_HEALING, mksobjFn);
                        break;
                    case PM_CHIEFTAIN:
                    case PM_PAGE:
                    case PM_ROSHI:
                    case PM_WARRIOR:
                        await mongets(mtmp, rn2(3) ? LONG_SWORD : SHORT_SWORD, mksobjFn);
                        await mongets(mtmp, rn2(3) ? CHAIN_MAIL : LEATHER_ARMOR, mksobjFn);
                        if (rn2(2))
                            await mongets(mtmp, rn2(2) ? LOW_BOOTS : HIGH_BOOTS, mksobjFn);
                        if (!rn2(3))
                            await mongets(mtmp, LEATHER_CLOAK, mksobjFn);
                        if (!rn2(3)) {
                            await mongets(mtmp, BOW, mksobjFn);
                            await mInitthrow(mtmp, ARROW, 12, mksobjFn);
                        }
                        break;
                    case PM_HUNTER:
                        await mongets(mtmp, rn2(3) ? SHORT_SWORD : DAGGER, mksobjFn);
                        if (rn2(2))
                            await mongets(mtmp, rn2(2) ? LEATHER_JACKET : LEATHER_ARMOR, mksobjFn);
                        await mongets(mtmp, BOW, mksobjFn);
                        await mInitthrow(mtmp, ARROW, 12, mksobjFn);
                        break;
                    case PM_THUG:
                        await mongets(mtmp, CLUB, mksobjFn);
                        await mongets(mtmp, rn2(3) ? DAGGER : KNIFE, mksobjFn);
                        if (rn2(2))
                            await mongets(mtmp, LEATHER_GLOVES, mksobjFn);
                        await mongets(mtmp, rn2(2) ? LEATHER_JACKET : LEATHER_ARMOR, mksobjFn);
                        break;
                    case PM_NEANDERTHAL:
                        await mongets(mtmp, CLUB, mksobjFn);
                        await mongets(mtmp, LEATHER_ARMOR, mksobjFn);
                        break;
                    default:
                        break;
                }
            }
            break;
        }
        case S_ANGEL: {
            if (humanoidMndx(mndx)) {
                const typ = rn2(3) ? LONG_SWORD : SILVER_MACE;
                const nam = (typ === LONG_SWORD) ? 'Sunsword' : 'Demonbane';
                let otmpW = await mksobjFn(typ, false, false);
                /* C makemon.c:339-340 sgn(mtmp->isminion ? EMIN(mtmp)->min_align
                 *                                       : ptr->maligntyp) */
                const mal = (mtmp.isminion && mtmp.mextra?.emin)
                    ? (mtmp.mextra.emin.min_align | 0) : monAlign(mndx);
                if ((!rn2(20) || isLordMndx(mndx)) && sgn(mal) === A_LAWFUL) {
                    if (otmpW)
                        otmpW = oname(otmpW, nam, ONAME_RANDOM);
                }
                if (otmpW) {
                    blessObj(otmpW);
                    otmpW.oerodeproof = true;
                    otmpW.spe = rn2(4);
                    if (typ === SILVER_MACE)
                        otmpW.spe = (otmpW.spe | 0) + 3;
                    /* C makemon.c:350 — (void) mpickobj(mtmp, otmp) */
                    _add_to_minv(mtmp, otmpW);
                }
                const otmpS = await mksobjFn(!rn2(4) || isLordMndx(mndx)
                    ? SHIELD_OF_REFLECTION
                    : LARGE_SHIELD, false, false);
                if (otmpS) {
                    otmpS.oerodeproof = true;
                    otmpS.spe = 0;
                    blessObj(otmpS);
                    /* C makemon.c:358 — (void) mpickobj(mtmp, otmp) */
                    _add_to_minv(mtmp, otmpS);
                }
            }
            break;
        }
        case S_HUMANOID: {
            if (mndx === PM_HOBBIT) {
                switch (rn2(3)) {
                    case 0:
                        await mongets(mtmp, DAGGER, mksobjFn);
                        break;
                    case 1:
                        await mongets(mtmp, ELVEN_DAGGER, mksobjFn);
                        break;
                    case 2:
                        await mongets(mtmp, SLING, mksobjFn);
                        await mInitthrow(mtmp, !rn2(4) ? FLINT : ROCK, 6, mksobjFn);
                        break;
                }
                if (!rn2(10))
                    await mongets(mtmp, ELVEN_MITHRIL_COAT, mksobjFn);
                if (!rn2(10))
                    await mongets(mtmp, DWARVISH_CLOAK, mksobjFn);
            }
            else if (mndx === PM_DWARF || isDwarfMndx(mndx)) {
                if (rn2(7))
                    await mongets(mtmp, DWARVISH_CLOAK, mksobjFn);
                if (rn2(7))
                    await mongets(mtmp, IRON_SHOES, mksobjFn);
                if (!rn2(4)) {
                    await mongets(mtmp, DW_SHORT_SWORD, mksobjFn);
                    if (rn2(2))
                        await mongets(mtmp, DWARVISH_MATTOCK, mksobjFn);
                    else {
                        await mongets(mtmp, rn2(2) ? AXE : DWARVISH_SPEAR, mksobjFn);
                        await mongets(mtmp, DWARVISH_ROUNDSHIELD, mksobjFn);
                    }
                    await mongets(mtmp, DWARVISH_IRON_HELM, mksobjFn);
                    if (!rn2(3))
                        await mongets(mtmp, DWARVISH_MITHRIL_COAT, mksobjFn);
                }
                else {
                    await mongets(mtmp, !rn2(3) ? PICK_AXE : DAGGER, mksobjFn);
                }
            }
            break;
        }
        case S_KOP: {
            if (!rn2(4))
                await mInitthrow(mtmp, CREAM_PIE, 2, mksobjFn);
            if (!rn2(3))
                await mongets(mtmp, rn2(2) ? CLUB : RUBBER_HOSE, mksobjFn);
            break;
        }
        case S_ORC: {
            if (rn2(2))
                await mongets(mtmp, ORCISH_HELM, mksobjFn);
            switch (mndx !== PM_ORC_CAPTAIN ? mndx : rn2(2) ? PM_MORDOR_ORC : PM_URUK_HAI) {
                case PM_MORDOR_ORC:
                    if (!rn2(3))
                        await mongets(mtmp, SCIMITAR, mksobjFn);
                    if (!rn2(3))
                        await mongets(mtmp, ORCISH_SHIELD, mksobjFn);
                    if (!rn2(3))
                        await mongets(mtmp, KNIFE, mksobjFn);
                    if (!rn2(3))
                        await mongets(mtmp, ORCISH_CHAIN_MAIL, mksobjFn);
                    break;
                case PM_URUK_HAI:
                    if (!rn2(3))
                        await mongets(mtmp, ORCISH_CLOAK, mksobjFn);
                    if (!rn2(3))
                        await mongets(mtmp, ORCISH_SHORT_SWORD, mksobjFn);
                    if (!rn2(3))
                        await mongets(mtmp, IRON_SHOES, mksobjFn);
                    if (!rn2(3)) {
                        await mongets(mtmp, ORCISH_BOW, mksobjFn);
                        await mInitthrow(mtmp, ORCISH_ARROW, 12, mksobjFn);
                    }
                    if (!rn2(3))
                        await mongets(mtmp, URUK_HAI_SHIELD, mksobjFn);
                    break;
                default:
                    if (mndx !== PM_ORC_SHAMAN && rn2(2))
                        await mongets(mtmp, mndx === PM_GOBLIN || rn2(2) === 0 ? ORCISH_DAGGER : SCIMITAR, mksobjFn);
            }
            break;
        }
        case S_OGRE: {
            if (!rn2(mndx === PM_OGRE_KING ? 3 : mndx === PM_OGRE_LORD ? 6 : 12))
                await mongets(mtmp, BATTLE_AXE, mksobjFn);
            else
                await mongets(mtmp, CLUB, mksobjFn);
            break;
        }
        case S_TROLL: {
            if (!rn2(2)) {
                switch (rn2(4)) {
                    case 0:
                        await mongets(mtmp, RANSEUR, mksobjFn);
                        break;
                    case 1:
                        await mongets(mtmp, PARTISAN, mksobjFn);
                        break;
                    case 2:
                        await mongets(mtmp, GLAIVE, mksobjFn);
                        break;
                    case 3:
                        await mongets(mtmp, SPETUM, mksobjFn);
                        break;
                }
            }
            break;
        }
        case S_KOBOLD: {
            if (!rn2(4))
                await mInitthrow(mtmp, DART, 12, mksobjFn);
            break;
        }
        case S_CENTAUR: {
            if (rn2(2)) {
                if (mndx === PM_FOREST_CENTAUR) {
                    await mongets(mtmp, BOW, mksobjFn);
                    await mInitthrow(mtmp, ARROW, 12, mksobjFn);
                }
                else {
                    await mongets(mtmp, CROSSBOW, mksobjFn);
                    await mInitthrow(mtmp, CROSSBOW_BOLT, 12, mksobjFn);
                }
            }
            break;
        }
        case S_WRAITH: {
            await mongets(mtmp, KNIFE, mksobjFn);
            await mongets(mtmp, LONG_SWORD, mksobjFn);
            break;
        }
        case S_ZOMBIE: {
            if (!rn2(4))
                await mongets(mtmp, LEATHER_ARMOR, mksobjFn);
            if (!rn2(4))
                await mongets(mtmp, rn2(3) ? KNIFE : SHORT_SWORD, mksobjFn);
            break;
        }
        case S_LIZARD: {
            if (mndx === PM_SALAMANDER)
                await mongets(mtmp, rn2(7) ? SPEAR : rn2(3) ? TRIDENT : STILETTO, mksobjFn);
            break;
        }
        case S_DEMON: {
            switch (mndx) {
                case PM_BALROG:
                    await mongets(mtmp, BULLWHIP, mksobjFn);
                    await mongets(mtmp, BROADSWORD, mksobjFn);
                    break;
                case PM_ORCUS:
                    await mongets(mtmp, WAN_DEATH, mksobjFn);
                    break;
                case PM_HORNED_DEVIL:
                    await mongets(mtmp, rn2(4) ? TRIDENT : BULLWHIP, mksobjFn);
                    break;
                case PM_DISPATER:
                    await mongets(mtmp, WAN_STRIKING, mksobjFn);
                    break;
                case PM_YEENOGHU:
                    await mongets(mtmp, FLAIL, mksobjFn);
                    break;
            }
            if (!isDemonMndx(mndx))
                break;
        }
        /* FALLTHROUGH */
        default: {
            const bias = isLordMndx(mndx) + isPrinceMndx(mndx) * 2 + extraNastyMndx(mndx);
            switch (rnd(14 - 2 * bias)) {
                case 1:
                    if (isStrong(mndx))
                        await mongets(mtmp, BATTLE_AXE, mksobjFn);
                    else
                        await mInitthrow(mtmp, DART, 12, mksobjFn);
                    break;
                case 2:
                    if (isStrong(mndx))
                        await mongets(mtmp, TWO_HANDED_SWORD, mksobjFn);
                    else {
                        await mongets(mtmp, CROSSBOW, mksobjFn);
                        await mInitthrow(mtmp, CROSSBOW_BOLT, 12, mksobjFn);
                    }
                    break;
                case 3:
                    await mongets(mtmp, BOW, mksobjFn);
                    await mInitthrow(mtmp, ARROW, 12, mksobjFn);
                    break;
                case 4:
                    if (isStrong(mndx))
                        await mongets(mtmp, LONG_SWORD, mksobjFn);
                    else
                        await mInitthrow(mtmp, DAGGER, 3, mksobjFn);
                    break;
                case 5:
                    if (isStrong(mndx))
                        await mongets(mtmp, LUCERN_HAMMER, mksobjFn);
                    else
                        await mongets(mtmp, AKLYS, mksobjFn);
                    break;
                default:
                    break;
            }
        }
    }
    const mlev = mtmp.m_lev | 0;
    if (mlev > rn2(75))
        await mongets(mtmp, rndOffensiveItem(mtmp), mksobjFn);
}
