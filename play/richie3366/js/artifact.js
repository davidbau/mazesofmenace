// artifact.js — Artifact table accessors and touch rules (partial).
// C ref: artifact.c / artilist.h
// defends / defends_when_carried + defn/cary extract (D-1453).

import { game } from './gstate.js';
import {
    NROFARTIFACTS,
    artilistRaw,
} from './generated/artifacts_data.js';
import { objectNames, NUM_OBJECTS, objectDescrs } from './objects.js';
import { obj_shuffle_range } from './o_init.js';
import { monsterNames, NON_PM, M2_UNDEAD, is_demon, is_dprince, is_dlord } from './monsters.js';
import {
    A_NONE,
    ONAME_WISH,
    ONAME_VIA_NAMING,
    ONAME_GIFT,
    ONAME_VIA_DIP,
    ONAME_LEVEL_DEF,
    ONAME_BONES,
    ONAME_RANDOM,
    ONAME_KNOW_ARTI,
    W_ARM,
    W_ARMC,
    W_ARMH,
    W_ARMS,
    W_ARMG,
    W_ARMF,
    W_ARMU,
    W_AMUL,
    W_RINGL,
    W_RINGR,
    W_TOOL,
    W_ART,
    W_ARTI,
    W_SWAPWEP,
    W_WEP,
    HALLUC_RES,
    REFLECTING,
    WARNING,
    WARN_OF_MON,
    TELEPAT,
    STEALTH,
    TELEPORT_CONTROL,
    SEARCHING,
    REGENERATION,
    ENERGY_REGENERATION,
    HALF_SPDAM,
    HALF_PHDAM,
    ECMD_OK,
    ECMD_TIME,
    ECMD_CANCEL,
    GETOBJ_EXCLUDE,
    GETOBJ_SUGGEST,
    GETOBJ_PROMPT,
    LAST_PROP,
    HALLUC,
    TIMEOUT,
    I_SPECIAL,
    SICK_ALL,
    INVIS,
    CONFLICT,
    LEVITATION,
    MAGICENLIGHTENMENT,
    ENL_GAMEINPROGRESS,
    P_EXPERT,
    Upolyd,
    nothing_happens,
    nothing_seems_to_happen,
    Never_mind,
    In_quest,
    In_endgame,
    MIGR_RANDOM,
    isok,
} from './const.js';
import { rn2, rnd, d, rnz } from './rng.js';
import { nhgetch } from './input.js';
import {
    flush_screen, flush_topl_more, pline, You_feel, newsym, see_monsters,
    set_sting_effects,
} from './display.js';
import { compactify_invlets, update_inventory, getobj_take_count, getobj_apply_count, getobj_from_cmdq, getobj_display_pickinv, getobj } from './invent.js';
import { xname, the, vtense, cxname, otense, set_undiscovered_artifact } from './objnam.js';
import { recalc_telepat_range } from './do_wear.js';

const CRYSTAL_BALL = objectNames.indexOf('CRYSTAL_BALL');
const FAKE_AMULET_OF_YENDOR = objectNames.indexOf('FAKE_AMULET_OF_YENDOR');
const ARROW = objectNames.indexOf('ARROW');
const BLINDING_VENOM = objectNames.indexOf('BLINDING_VENOM');
const ACID_VENOM = objectNames.indexOf('ACID_VENOM');
const SPE_FIREBALL = objectNames.indexOf('SPE_FIREBALL');
const SPE_CONE_OF_COLD = objectNames.indexOf('SPE_CONE_OF_COLD');
const SCR_TAMING = objectNames.indexOf('SCR_TAMING');
/** C monflag.h MS_NEMESIS */
const MS_NEMESIS = 37;

export { NROFARTIFACTS };
import {
    ART_NONARTIFACT,
    ART_EXCALIBUR,
    ART_GRIMTOOTH,
    ART_ORCRIST,
    ART_STING,
    ART_GRAYSWANDIR,
    ART_MASTER_KEY_OF_THIEVERY,
} from './generated/artifacts_data.js';
import { PM_KNIGHT, PM_ROGUE } from './generated/monsters_data.js';
import { aligns } from './roles.js';
export { ART_NONARTIFACT, ART_EXCALIBUR, ART_GRIMTOOTH, ART_ORCRIST, ART_STING, ART_GRAYSWANDIR };

// C ref: include/artifact.h — subset used by touch/wish / spec_applies
export const SPFX_NOGEN = 0x00000001;
export const SPFX_RESTR = 0x00000002;
export const SPFX_INTEL = 0x00000004;
export const SPFX_WARN = 0x00000020;
export const SPFX_ATTK = 0x00000040;
export const SPFX_SEARCH = 0x00000200;
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
const SILVER = 14; /* objclass.h */

// C artifact.h enum invoke_prop_types — TAMING = LAST_PROP+1 … BLINDING_RAY
export const TAMING = LAST_PROP + 1;
export const HEALING = LAST_PROP + 2;
export const ENERGY_BOOST = LAST_PROP + 3;
export const UNTRAP = LAST_PROP + 4;
export const CHARGE_OBJ = LAST_PROP + 5;
export const LEV_TELE = LAST_PROP + 6;
export const CREATE_PORTAL = LAST_PROP + 7;
export const ENLIGHTENING = LAST_PROP + 8;
export const CREATE_AMMO = LAST_PROP + 9;
export const BANISH = LAST_PROP + 10;
export const FLING_POISON = LAST_PROP + 11;
export const FIRESTORM = LAST_PROP + 12;
export const SNOWSTORM = LAST_PROP + 13;
export const BLINDING_RAY = LAST_PROP + 14;
/** C spell.h SPELL_LEV_PW — invoke cost pretends a level-5 spell. */
function SPELL_LEV_PW(lvl) {
    return (lvl | 0) * 5;
}

const PM_GREMLIN = monsterNames.indexOf('PM_GREMLIN');

// C ref: monattk.h — used by spec_applies ATTK arms
const AD_PHYS = 0;
const AD_MAGM = 1;
const AD_FIRE = 2;
const AD_COLD = 3;
const AD_SLEE = 4;
const AD_DISN = 5;
const AD_ELEC = 6;
const AD_DRST = 7;
const AD_ACID = 8;
const AD_BLND = 11;
const AD_STUN = 12;
const AD_SLOW = 13;
const AD_PLYS = 14;
const AD_DRLI = 15;
const AD_STON = 18;
const AD_DISE = 33;
const AD_HALU = 36;

const GRAY_DRAGON_SCALES = objectNames.indexOf('GRAY_DRAGON_SCALES');
const GOLD_DRAGON_SCALES = objectNames.indexOf('GOLD_DRAGON_SCALES');
const RED_DRAGON_SCALES = objectNames.indexOf('RED_DRAGON_SCALES');
const WHITE_DRAGON_SCALES = objectNames.indexOf('WHITE_DRAGON_SCALES');
const GREEN_DRAGON_SCALES = objectNames.indexOf('GREEN_DRAGON_SCALES');
const ORANGE_DRAGON_SCALES = objectNames.indexOf('ORANGE_DRAGON_SCALES');
const BLACK_DRAGON_SCALES = objectNames.indexOf('BLACK_DRAGON_SCALES');
const BLUE_DRAGON_SCALES = objectNames.indexOf('BLUE_DRAGON_SCALES');
const YELLOW_DRAGON_SCALES = objectNames.indexOf('YELLOW_DRAGON_SCALES');
const GRAY_DRAGON_SCALE_MAIL = objectNames.indexOf('GRAY_DRAGON_SCALE_MAIL');
const YELLOW_DRAGON_SCALE_MAIL = objectNames.indexOf('YELLOW_DRAGON_SCALE_MAIL');

// C: gy.youmonst — sentinel for hero touch_artifact / spec_applies path
export const youmonst = { _youmonst: true };

let _artilist = null;

function resolvePm(name) {
    if (!name || name === 'NON_PM') return NON_PM;
    const i = monsterNames.indexOf(name);
    return i >= 0 ? i : NON_PM;
}

function resolveMtype(raw) {
    const kind = raw.mtypeKind || 'num';
    if (kind === 'm2' || kind === 'num') return raw.mtypeVal | 0;
    if (kind === 's') return raw.mtypeTok; // compare to ptr.mlet string
    if (kind === 'pm') return resolvePm(raw.mtypeTok);
    return 0;
}

function sgn(n) {
    const x = n | 0;
    return (x > 0) - (x < 0);
}

/** Build resolved artilist once objects[] names are available. */
export function artifacts_globals_init() {
    _artilist = artilistRaw.map((raw) => ({
        name: raw.name,
        otyp: objectNames.indexOf(raw.otypName),
        spfx: raw.spfx | 0,
        // C artilist.h A() s2 — carry-only (D-1539)
        cspfx: raw.cspfx | 0,
        mtype: resolveMtype(raw),
        attk: {
            adtyp: raw.attkAdtyp | 0,
            damn: raw.attkDamn | 0,
            damd: raw.attkDamd | 0,
        },
        defn: {
            adtyp: raw.defnAdtyp | 0,
            damn: raw.defnDamn | 0,
            damd: raw.defnDamd | 0,
        },
        cary: {
            adtyp: raw.caryAdtyp | 0,
            damn: raw.caryDamn | 0,
            damd: raw.caryDamd | 0,
        },
        alignment: raw.alignment | 0,
        role: resolvePm(raw.roleName),
        race: resolvePm(raw.raceName),
        // C artilist.h A() inv — property or invoke_prop_types (D-1377)
        inv_prop: raw.inv_prop | 0,
        // C artilist.h A() acolor — glow, not the item's tint (D-1347)
        acolor: raw.acolor | 0,
    }));
    // C: artiexist[NROFARTIFACTS+1]
    game.artiexist = Array.from({ length: NROFARTIFACTS + 1 }, () => ({
        exists: 0,
        found: 0,
        wish: 0,
        gift: 0,
        viadip: 0,
        named: 0,
        lvldef: 0,
        bones: 0,
        rnd: 0,
    }));
    // C: xint16 artidisco[NROFARTIFACTS] — JSON rest is D-1698.
    game.artidisco = Array(NROFARTIFACTS).fill(0);
}

function artilist() {
    if (!_artilist) artifacts_globals_init();
    return _artilist;
}

/** C ref: you.h Role_if / Role_switch — urole.mnum. */
function Role_if(pm) {
    return (game.urole?.mnum | 0) === (pm | 0);
}

function Role_switch() {
    return game.urole?.mnum | 0;
}

/**
 * C ref: artifact.c hack_artifacts — gift align, Excalibur role, questarti.
 * Called from init_artifacts after role_init (C allmain.c:785–793), not
 * after u_init despite the C comment.
 */
function hack_artifacts() {
    const list = artilist();
    const alignIdx = game.flags?.initalign | 0;
    const alignmnt = aligns[alignIdx]?.value | 0;

    // C: for (art = artilist + 1; art->otyp; art++)
    for (let i = 1; i < list.length; i++) {
        const art = list[i];
        if (!art || !art.otyp) break;
        if (art.role === Role_switch() && art.alignment !== A_NONE) {
            art.alignment = alignmnt;
        }
    }

    // C: Excalibur can be used by any lawful character, not just knights
    if (!Role_if(PM_KNIGHT)) {
        list[ART_EXCALIBUR].role = NON_PM;
    }

    const questarti = game.urole?.questarti | 0;
    if (questarti) {
        const qa = list[questarti];
        if (qa) {
            qa.alignment = alignmnt;
            qa.role = Role_switch();
        }
    }
}

/**
 * C ref: artifact.c init_artifacts — zero artiexist/artidisco then
 * hack_artifacts. Caller allmain.c newgame after init_dungeons, before
 * u_init_misc (WIZKIT may name artifacts). Rebuild artilist from generated
 * raw so JS process-reuse matches C's compile-time table.
 */
export function init_artifacts() {
    artifacts_globals_init();
    hack_artifacts();
    set_sting_effects(Sting_effects);
}

/**
 * C ref: artifact.c restore_artifacts — artiexist is already on the JSON
 * payload; copy artidisco then hack_artifacts for unsaved special cases.
 * @param {number[]|null|undefined} artidisco
 */
export function restore_artifacts(artidisco) {
    if (Array.isArray(artidisco)) {
        game.artidisco = artidisco.map((n) => n | 0);
    }
    hack_artifacts();
}

/**
 * C ref: artifact.c artiname
 * @param {number} artinum
 * @returns {string}
 */
export function artiname(artinum) {
    if (artinum <= 0 || artinum > NROFARTIFACTS) return '';
    const list = artilist();
    return list[artinum]?.name || '';
}

/**
 * C ref: artifact.c discover_artifact — insert m into artidisco[].
 * Full-table `impossible` named omit (NROFARTIFACTS slots).
 * @param {number} m
 */
export function discover_artifact(m) {
    if (!game.artidisco) {
        game.artidisco = Array(NROFARTIFACTS).fill(0);
    }
    const artidisco = game.artidisco;
    for (let i = 0; i < NROFARTIFACTS; i++) {
        if (artidisco[i] === 0 || artidisco[i] === m) {
            artidisco[i] = m;
            return;
        }
    }
}

/**
 * C ref: artifact.c undiscovered_artifact `:1130–1143` — artidisco[] scan;
 * empty slot means not yet discovered. Callee of obj.h is_plural (Eyes)
 * and objnam.c not_fully_identified.
 * @param {number} m
 * @returns {boolean}
 */
export function undiscovered_artifact(m) {
    const id = m | 0;
    const artidisco = game.artidisco;
    if (!artidisco) return true;
    for (let i = 0; i < NROFARTIFACTS; i++) {
        if (artidisco[i] === id) return false;
        if (artidisco[i] === 0) break;
    }
    return true;
}
set_undiscovered_artifact(undiscovered_artifact);

/** C ref: artifact.c get_artifact */
export function get_artifact(obj) {
    const list = artilist();
    if (!obj?.oartifact) return list[0];
    const a = obj.oartifact | 0;
    if (a <= 0 || a > NROFARTIFACTS) return list[0];
    return list[a];
}

/**
 * C ref: artifact.c spec_m2 `:1065–1072` — artifact->mtype, else 0.
 * Extracted m2/num is a bit mask (Sting/Orcrist M2_ORC, Grimtooth M2_ELF).
 * Class-letter mtype (DCLAS S_*) is not a long in JS; those arts have no
 * SPFX_WARN so conferral never ORs them into warntype.obj.
 */
export function spec_m2(otmp) {
    const artifact = get_artifact(otmp);
    const list = artilist();
    if (artifact === list[0]) return 0;
    const mt = artifact.mtype;
    return typeof mt === 'number' ? (mt | 0) : 0;
}

const LUCKSTONE_OTYP = objectNames.indexOf('LUCKSTONE');

/**
 * C ref: artifact.c confers_luck — LUCKSTONE or artifact SPFX_LUCK.
 * @param {object} obj
 * @returns {boolean}
 */
export function confers_luck(obj) {
    if (!obj) return false;
    if ((obj.otyp | 0) === LUCKSTONE_OTYP) return true;
    if (!obj.oartifact) return false;
    const arti = get_artifact(obj);
    const list = artilist();
    if (arti === list[0]) return false;
    return ((arti.spfx | 0) & SPFX_LUCK) !== 0;
}

/**
 * C ref: artifact.c arti_reflects :537–550 — worn SPFX_REFLECT, else
 * carried cspfx. Callers: muse.c mon_reflects MON_WEP (:2807).
 * Hero W_WEP identity is set_artifact_intrinsic EReflecting (:867–872)
 * then ureflects (EReflecting & W_WEP).
 * Named omit: no artilist row has cspfx&SPFX_REFLECT (extract is D-1539).
 * @param {object|null} obj
 * @returns {boolean}
 */
export function arti_reflects(obj) {
    const list = artilist();
    const arti = get_artifact(obj);
    if (arti !== list[0]) {
        if (((obj.owornmask | 0) & ~W_ART) && ((arti.spfx | 0) & SPFX_REFLECT)) {
            return true;
        }
        if ((arti.cspfx | 0) & SPFX_REFLECT) return true;
    }
    return false;
}

/**
 * C ref: artifact.c shade_glare :555–571 — silver, or non-silver
 * artifact with SPFX_DFLAG2 vs M2_UNDEAD. Does not consider blessed
 * vs undead (that bonus is dmgval after the shade zero).
 * Caller: weapon.c dmgval (D-1354). hmon ranged shade_glare named.
 */
export function shade_glare(obj) {
    if ((game.objects?.[obj.otyp]?.oc_material | 0) === SILVER) {
        return true;
    }
    const list = artilist();
    const arti = get_artifact(obj);
    if (arti !== list[ART_NONARTIFACT]
            && ((arti.spfx | 0) & SPFX_DFLAG2)
            && (arti.mtype | 0) === M2_UNDEAD) {
        return true;
    }
    return false;
}

/**
 * C ref: objnam.c bare_artifactname — artiname with leading "The "→"the ".
 * Non-artifact falls back to xname-like minimal name via artilist miss.
 */
export function bare_artifactname(obj) {
    if (!obj?.oartifact) return 'something';
    const art = get_artifact(obj);
    let name = art?.name || 'something';
    if (name.length >= 4 && name.slice(0, 4) === 'The ') {
        name = `the ${name.slice(4)}`;
    }
    return name;
}

// C coloratt.c colornames[] first match (aliases after the NULL sentinel
// are skipped). Index == CLR_* / NO_COLOR from color.h.
const CLR2COLORNAME = [
    'black', 'red', 'green', 'brown', 'blue', 'magenta', 'cyan', 'gray',
    'no color', 'orange', 'light green', 'yellow', 'light blue',
    'light magenta', 'light cyan', 'white',
];

/** C ref: coloratt.c clr2colorname — first matching colornames[].color. */
export function clr2colorname(clr) {
    const i = clr | 0;
    if (i < 0 || i >= CLR2COLORNAME.length) return '';
    return CLR2COLORNAME[i];
}

/**
 * C ref: artifact.c glow_color `:2427–2433` — artilist[arti].acolor then
 * clr2colorname then hcolor. Hallu hcolor display-rng named omit (identity).
 * doname inlines the same C functions (objnam cannot import this module:
 * artifact→invent→shk calls set_doname_shop_suffix during objnam init).
 */
export function glow_color(arti_indx) {
    const list = artilist();
    const colornum = list[arti_indx | 0]?.acolor | 0;
    return clr2colorname(colornum);
}

// C artifact.c glow_verbs[] — [0] is the blind / no-creatures verb.
const GLOW_VERBS = ['quiver', 'flicker', 'glimmer', 'gleam'];

/**
 * C ref: artifact.c glow_strength `:2442–2448` — 0..3 from warn_obj_cnt.
 */
export function glow_strength(count) {
    const n = count | 0;
    return (n > 12) ? 3 : (n > 4) ? 2 : (n > 0 ? 1 : 0);
}

/**
 * C ref: artifact.c glow_verb `:2451–2462` — verb then optional "ing".
 * Bypasses ing_suffix (would double the last consonant).
 * @param {number} count 0 means blind rather than no applicable creatures
 * @param {boolean} ingsfx
 */
export function glow_verb(count, ingsfx) {
    let resbuf = GLOW_VERBS[glow_strength(count)];
    if (ingsfx) resbuf += 'ing';
    return resbuf;
}

/** C obj.h u_wield_art — is_art(uwep, art). */
function u_wield_art(art) {
    return is_art(game.u?.uwep, art);
}

/**
 * C ref: do.c maybe_lvltport_feedback `:2032–2039` — deliver pending
 * "You materialize…" before Sting start-glow (goto_level → docrt →
 * see_monsters). Other dfr_post_msg stay for goto_level.
 */
function maybe_lvltport_feedback() {
    const msg = game.dfr_post_msg;
    if (!msg) return Promise.resolve();
    if (String(msg).slice(0, 15).toLowerCase() !== 'you materialize') {
        return Promise.resolve();
    }
    game.dfr_post_msg = null;
    return pline(msg);
}

/**
 * C ref: artifact.c Sting_effects `:2466–2501` — glow messages for
 * Sting / Orcrist / Grimtooth when warn_obj_cnt strength changes.
 * orc_count -1 is blindness toggle (make_blinded caller named omit).
 * Hallu hcolor inside glow_color named omit.
 */
export async function Sting_effects(orc_count) {
    if (!u_wield_art(ART_STING)
        && !u_wield_art(ART_ORCRIST)
        && !u_wield_art(ART_GRIMTOOTH)) {
        return;
    }
    const uwep = game.u.uwep;
    const oldstr = glow_strength(game.warn_obj_cnt | 0);
    const newstr = glow_strength(orc_count);
    if (orc_count === -1 && (game.warn_obj_cnt | 0) > 0) {
        await pline(`${bare_artifactname(uwep)} is ${glow_verb(Blind() ? 0 : (game.warn_obj_cnt | 0), true)}.`);
    } else if (newstr > 0 && newstr !== oldstr) {
        await maybe_lvltport_feedback();
        if (!Blind()) {
            await pline(`${bare_artifactname(uwep)} ${otense(uwep, glow_verb(orc_count, false))} ${glow_color(uwep.oartifact)}${newstr > oldstr ? '!' : '.'}`);
        } else if (oldstr === 0) {
            await pline(`${bare_artifactname(uwep)} ${otense(uwep, glow_verb(0, false))} slightly.`);
        }
    } else if (orc_count === 0 && (game.warn_obj_cnt | 0) > 0) {
        await pline(`${bare_artifactname(uwep)} stops ${glow_verb(Blind() ? 0 : (game.warn_obj_cnt | 0), true)}.`);
    }
}

/**
 * C youprop.h E* ≡ uprops[].extrinsic — write both flat and table.
 * Artifact spfx, not objects[].oc_oprop.
 */
function set_spfx_extrinsic(propIdx, flatField, wp_mask, on) {
    const u = game.u || (game.u = {});
    if (!u.uprops) u.uprops = {};
    if (!u.uprops[propIdx]) {
        u.uprops[propIdx] = { intrinsic: 0, extrinsic: 0, blocked: 0 };
    }
    if (on) {
        u.uprops[propIdx].extrinsic =
            (u.uprops[propIdx].extrinsic | 0) | (wp_mask | 0);
        u[flatField] = (u[flatField] | 0) | (wp_mask | 0);
    } else {
        u.uprops[propIdx].extrinsic =
            (u.uprops[propIdx].extrinsic | 0) & ~(wp_mask | 0);
        u[flatField] = (u[flatField] | 0) & ~(wp_mask | 0);
    }
}

/** C context.h warntype_info — obj/polyd M2 bits + poly species. */
function warntype_info() {
    const ctx = game.context || (game.context = {});
    if (!ctx.warntype) {
        ctx.warntype = { obj: 0, polyd: 0, species: null, speciesidx: NON_PM };
    }
    return ctx.warntype;
}

/**
 * C ref: artifact.c set_artifact_intrinsic `:715–893`.
 * Carry path `:770` `spfx = (wp_mask != W_ART) ? oart->spfx : oart->cspfx`
 * (MKoT WARN|TCTRL|HPHDAM; Orb of Fate WARN|HSPDAM|HPHDAM). Drop W_ART
 * strips bits still conferred by other invent artifacts (`:771–778`).
 * Callers: invent.c addinv_core1 `:991` / freeinv_core `:1383` W_ART;
 * worn.c setworn/setnotworn weapon/armor masks.
 * C uses make_hallucinated(xtime=!on, talk, wp_mask) which sets
 * EHalluc_resistance |= mask when conferring (xtime==0).
 * SPFX_WARN `:824–839`: spec_m2 → EWarn_of_mon + warntype.obj + see_monsters;
 * else EWarning. MATCH_WARN overlay is display.c (D-1514).
 * SPFX_SEARCH `:781–786` ESearching (Excalibur wield); SPFX_REGEN
 * `:812–817` ERegeneration (Trollsbane / Staff of Aesculapius wield);
 * SPFX_XRAY `:859–866` u.xray_range 3/-1 + vision_full_recalc (Eyes
 * W_TOOL via setworn). vision_recalc IN_SIGHT xray circle named.
 * Named omissions: defn/cary resist masks; SPFX_PROTECT; inv_prop
 * arti_invoke on W_ART drop; Sunsword EBlnd_resist; message paths.
 * SPFX_REFLECT && W_WEP is D-1342 (not other wp_mask).
 * @param {object} otmp
 * @param {boolean} on
 * @param {number} wp_mask
 */
export function set_artifact_intrinsic(otmp, on, wp_mask) {
    if (!otmp?.oartifact) return;
    const list = artilist();
    const oart = get_artifact(otmp);
    if (oart === list[0]) return;
    // C: spfx = (wp_mask != W_ART) ? oart->spfx : oart->cspfx
    let spfx = (wp_mask !== W_ART) ? (oart.spfx | 0) : (oart.cspfx | 0);
    if (spfx && wp_mask === W_ART && !on) {
        // C: don't change any spfx also conferred by other artifacts
        for (const obj of game.invent || []) {
            if (!obj || obj === otmp || !obj.oartifact) continue;
            const art = get_artifact(obj);
            if (art === list[0]) continue;
            spfx &= ~(art.cspfx | 0);
        }
    }
    // C artifact.c:781–786 — SPFX_SEARCH ESearching (Excalibur)
    if (spfx & SPFX_SEARCH) {
        set_spfx_extrinsic(SEARCHING, 'ESearching', wp_mask, on);
    }
    if (spfx & SPFX_HALRES) {
        // C potion.c make_hallucinated mask arm: !xtime → |= ; xtime → &=~
        set_spfx_extrinsic(HALLUC_RES, 'EHalluc_resistance', wp_mask, on);
    }
    // C artifact.c:798–805 — SPFX_ESP ETelepat + recalc + see_monsters
    if (spfx & SPFX_ESP) {
        set_spfx_extrinsic(TELEPAT, 'ETelepat', wp_mask, on);
        recalc_telepat_range();
        see_monsters();
    }
    // C artifact.c:806–811 — SPFX_STLTH (Heart of Ahriman cspfx)
    if (spfx & SPFX_STLTH) {
        set_spfx_extrinsic(STEALTH, 'EStealth', wp_mask, on);
    }
    // C artifact.c:812–817 — SPFX_REGEN (Trollsbane / Staff of Aesculapius)
    if (spfx & SPFX_REGEN) {
        set_spfx_extrinsic(REGENERATION, 'ERegeneration', wp_mask, on);
    }
    // C artifact.c:818–823 — SPFX_TCTRL (MKoT cspfx)
    if (spfx & SPFX_TCTRL) {
        set_spfx_extrinsic(TELEPORT_CONTROL, 'ETeleport_control', wp_mask, on);
    }
    // C artifact.c:824–839 — Sting/Orcrist/Grimtooth spec_m2, else EWarning
    if (spfx & SPFX_WARN) {
        const m2 = spec_m2(otmp);
        if (m2) {
            set_spfx_extrinsic(WARN_OF_MON, 'EWarn_of_mon', wp_mask, on);
            const wt = warntype_info();
            if (on) wt.obj = (wt.obj | 0) | m2;
            else wt.obj = (wt.obj | 0) & ~m2;
            see_monsters();
        } else {
            set_spfx_extrinsic(WARNING, 'EWarning', wp_mask, on);
        }
    }
    // C artifact.c:841–846 — SPFX_EREGEN (Eye of the Aethiopica cspfx)
    if (spfx & SPFX_EREGEN) {
        set_spfx_extrinsic(ENERGY_REGENERATION, 'EEnergy_regeneration', wp_mask, on);
    }
    // C artifact.c:847–852 — SPFX_HSPDAM (Orb of Fate / Detection / PYEC / Eye)
    if (spfx & SPFX_HSPDAM) {
        set_spfx_extrinsic(HALF_SPDAM, 'EHalf_spell_damage', wp_mask, on);
    }
    // C artifact.c:853–858 — SPFX_HPHDAM (MKoT / Orb of Fate cspfx)
    if (spfx & SPFX_HPHDAM) {
        set_spfx_extrinsic(HALF_PHDAM, 'EHalf_physical_damage', wp_mask, on);
    }
    // C artifact.c:859–866 — Eyes; assumes no other xray_range user
    if (spfx & SPFX_XRAY) {
        const u = game.u || (game.u = {});
        u.xray_range = on ? 3 : -1;
        game.vision_full_recalc = 1;
    }
    // C artifact.c:867–872 — only the wielded-weapon slot sets EReflecting
    if ((spfx & SPFX_REFLECT) && (wp_mask & W_WEP)) {
        set_spfx_extrinsic(REFLECTING, 'EReflecting', wp_mask, on);
    }
}

/**
 * C ref: artifact.c artifact_name
 * Returns canonical artifact name or null; optionally sets otyp via out.
 */
export function artifact_name(name, out, fuzzy = false) {
    if (!name) return null;
    let n = name;
    if (n.length >= 4 && n.slice(0, 4).toLowerCase() === 'the ') n = n.slice(4);
    const list = artilist();
    for (let i = 1; i < list.length; i++) {
        const a = list[i];
        if (a.otyp < 0) continue;
        let aname = a.name;
        if (aname.length >= 4 && aname.slice(0, 4).toLowerCase() === 'the ') {
            aname = aname.slice(4);
        }
        const match = fuzzy
            ? fuzzymatch(n, aname)
            : n.toLowerCase() === aname.toLowerCase();
        if (match) {
            if (out) out.otyp = a.otyp;
            return a.name;
        }
    }
    return null;
}

/** Spaces/hyphens/case ignored — C fuzzymatch(u, o, " -", TRUE) subset. */
function fuzzymatch(u, t) {
    const norm = (s) => String(s).toLowerCase().replace(/[- ]+/g, '');
    return norm(u) === norm(t);
}

/** C ref: artifact.c nartifact_exist */
export function nartifact_exist() {
    const ax = game.artiexist || [];
    let a = 0;
    for (let i = 1; i <= NROFARTIFACTS; i++) {
        if (ax[i]?.exists) a++;
    }
    return a;
}

/**
 * C ref: artifact.c mk_artifact — A_NONE converts otmp to matching artifact.
 * Named omissions: by_align gift path (mksobj + role/skill checks);
 * gift_value / gen_spe (extractor lacks gv/gs; max_giftvalue=99 covers
 * normal arts; gen_spe defaults 0 → spe adjust no-op); permapoisoned.
 */
export function mk_artifact(otmp, alignment = A_NONE, max_giftvalue = 99,
    adjust_spe = true) {
    const list = artilist();
    const by_align = alignment !== A_NONE;
    if (by_align) {
        // Gift / altar path deferred — return otmp unchanged
        return otmp;
    }
    if (!otmp) return otmp;
    const objects = game.objects;
    const o_typ = otmp.otyp | 0;
    const unique = !!(objects?.[o_typ]?.oc_unique);
    const ax = game.artiexist || [];
    const eligible = [];
    for (let m = 1; m < list.length; m++) {
        const a = list[m];
        if (!a || !a.otyp) break;
        if (ax[m]?.exists) continue;
        if ((a.spfx & SPFX_NOGEN) || unique) continue;
        // gift_value deferred (max_giftvalue=99 always passes for known arts)
        void max_giftvalue;
        if (a.otyp === o_typ) eligible.push(m);
    }
    if (eligible.length) {
        const m = eligible[rn2(eligible.length)];
        const a = list[m];
        if (!otmp.oextra) otmp.oextra = {};
        otmp.oextra.oname = a.name;
        artifact_exists(otmp, a.name, true, 0);
        otmp.oartifact = m;
        artifact_origin(otmp, ONAME_RANDOM);
        otmp.oeroded = 0;
        otmp.oeroded2 = 0;
        if (adjust_spe) {
            const genSpe = a.gen_spe | 0;
            const newSpe = (otmp.spe | 0) + genSpe;
            if (newSpe >= -10 && newSpe < 10) otmp.spe = newSpe;
        }
    }
    return otmp;
}

/** C ref: artifact.c exist_artifact */
export function exist_artifact(otyp, name) {
    const list = artilist();
    const ax = game.artiexist || [];
    for (let i = 1; i < list.length; i++) {
        const a = list[i];
        if (a.otyp === otyp && a.name === name) return !!ax[i]?.exists;
    }
    return false;
}

/**
 * C ref: artifact.c restrict_name `:574–623`.
 * OBJ_DESCR + shuffle pool for undiscovered same-class; then artilist
 * strcmp after stripping "the ". SPFX_NOGEN|SPFX_RESTR or quan>1.
 * Callers: do_oname slip (D-1670); wield.c chwepon (D-1692).
 */
export function restrict_name(otmp, name) {
    if (!name) return false;
    let n = name;
    if (n.length >= 4 && n.slice(0, 4).toLowerCase() === 'the ') n = n.slice(4);

    const objects = game.objects;
    const otyp = otmp.otyp | 0;
    const ocls = objects[otyp].oc_class;
    const sametype = new Array(NUM_OBJECTS).fill(false);
    sametype[otyp] = true;
    const odesc = objectDescrs[objects[otyp].oc_descr_idx ?? otyp];
    if (!objects[otyp].oc_name_known && odesc) {
        const [lo, hi] = obj_shuffle_range(otyp);
        const b = game.bases || [];
        for (let i = b[ocls] | 0; i < NUM_OBJECTS; i++) {
            if (objects[i].oc_class !== ocls) break;
            const other = objectDescrs[objects[i].oc_descr_idx ?? i];
            if (!objects[i].oc_name_known && other
                && (odesc === other || (i >= lo && i <= hi))) {
                sametype[i] = true;
            }
        }
    }

    const list = artilist();
    for (let i = 1; i < list.length; i++) {
        const a = list[i];
        if (!a || !sametype[a.otyp]) continue;
        let aname = a.name;
        if (aname.length >= 4 && aname.slice(0, 4).toLowerCase() === 'the ') {
            aname = aname.slice(4);
        }
        if (aname === n) {
            return ((a.spfx & (SPFX_NOGEN | SPFX_RESTR)) !== 0)
                || ((otmp.quan | 0) > 1);
        }
    }
    return false;
}

/** C ref: artifact.c artifact_origin */
export function artifact_origin(arti, aflags) {
    const a = arti?.oartifact | 0;
    if (!a) return;
    if (!game.artiexist) artifacts_globals_init();
    const slot = {
        exists: 1,
        found: (aflags & ONAME_KNOW_ARTI) ? 1 : 0,
        wish: (aflags & ONAME_WISH) ? 1 : 0,
        gift: (aflags & ONAME_GIFT) ? 1 : 0,
        viadip: (aflags & ONAME_VIA_DIP) ? 1 : 0,
        named: (aflags & ONAME_VIA_NAMING) ? 1 : 0,
        lvldef: (aflags & ONAME_LEVEL_DEF) ? 1 : 0,
        bones: (aflags & ONAME_BONES) ? 1 : 0,
        rnd: (aflags & ONAME_RANDOM) ? 1 : 0,
    };
    // Ensure exactly one origin bit when none given — C defaults RANDOM
    const originBits = ONAME_VIA_NAMING | ONAME_WISH | ONAME_GIFT
        | ONAME_VIA_DIP | ONAME_LEVEL_DEF | ONAME_BONES | ONAME_RANDOM;
    if ((aflags & originBits) === 0) slot.rnd = 1;
    game.artiexist[a] = slot;
}

/**
 * C ref: artifact.c artifact_exists
 * mod true → create; false → un-create (deferred body).
 */
export function artifact_exists(otmp, name, mod, flgs) {
    if (!otmp || !name) return;
    const list = artilist();
    for (let i = 1; i < list.length; i++) {
        const a = list[i];
        if (a.otyp === otmp.otyp && a.name === name) {
            otmp.oartifact = mod ? i : 0;
            otmp.age = 0;
            if (mod) {
                let f = flgs | 0;
                const originBits = ONAME_VIA_NAMING | ONAME_WISH | ONAME_GIFT
                    | ONAME_VIA_DIP | ONAME_LEVEL_DEF | ONAME_BONES | ONAME_RANDOM;
                if ((f & originBits) === 0) f |= ONAME_RANDOM;
                artifact_origin(otmp, f);
            }
            return;
        }
    }
}

/**
 * C ref: artifact.c touch_artifact — hero path subset.
 * Returns 1 if held, 0 if refused. Blast `d()`/`losehp` deferred when
 * the rn2(4) gate fires; gate itself matches C (short-circuit order).
 */
export function touch_artifact(obj, mon) {
    const oart = get_artifact(obj);
    const list = artilist();
    if (oart === list[0]) return 1;

    const yours = mon === youmonst || mon == null;
    const self_willed = (oart.spfx & SPFX_INTEL) !== 0;
    let badclass = false;
    let badalign = false;

    if (yours) {
        const u = game.u || {};
        const rolePm = u.umonster ?? u.role_mnum ?? NON_PM;
        const racePm = u.urace?.mnum ?? NON_PM;
        badclass = self_willed
            && ((oart.role !== NON_PM && oart.role !== rolePm)
                || (oart.race !== NON_PM && oart.race !== racePm));
        const atype = u.ualign?.type;
        const arec = u.ualign?.record ?? 0;
        badalign = ((oart.spfx & SPFX_RESTR) !== 0
            && oart.alignment !== A_NONE
            && (oart.alignment !== atype || arec < 0));
    }
    // bane_applies deferred → leave badalign as-is for non-bane arts

    if (((badclass || badalign) && self_willed)
        || (badalign && (!yours || !rn2(4)))) {
        if (!yours) return 0;
        // C: You("are blasted…"); d(Antimagic?2:4, self_willed?10:4); losehp;
        // exercise(A_WIS,FALSE); touch_blasted=TRUE. Deferred when rn2(4)==0.
    }

    if (badclass && badalign && self_willed) {
        return 0;
    }
    return 1;
}

/**
 * C ref: artifact.c retouch_object — hero wield/wear touch gate.
 * Silver-hate / bane damage and drop paths deferred. Blast `d()`/`losehp`
 * deferred inside touch_artifact when rn2(4)==0.
 * @returns {number} 1 ok, 0 refused
 */
export function retouch_object(obj, _loseit) {
    if (!obj) return 1;
    if (touch_artifact(obj, youmonst)) {
        // ag (Hate_silver) / bane_applies damage deferred → allow when clear
        return 1;
    }
    // remove_worn_item / dropx deferred
    return 0;
}

/**
 * C ref: artifact.c invoke_ok — getobj callback for #invoke.
 */
function invoke_ok(obj) {
    if (!obj) return GETOBJ_EXCLUDE;
    const ocl = game.objects?.[obj.otyp];
    if (obj.oartifact || ocl?.oc_unique
        || (obj.otyp === FAKE_AMULET_OF_YENDOR && !obj.known)) {
        return GETOBJ_SUGGEST;
    }
    if (obj.otyp === CRYSTAL_BALL) return GETOBJ_SUGGEST;
    return GETOBJ_EXCLUDE;
}

/** C invent.c getobj("charge", charge_ok, GETOBJ_PROMPT|GETOBJ_ALLOWCNT).
 * SUGGEST in the prompt; DOWNPLAY/EXCLUDE_SELECTABLE selectable.
 * Count prefix + split_otmp live. Canned CMDQ_INT/KEY live.
 * `?`/`*` → display_pickinv `&ctmp` (D-1559). */
async function getobj_charge() {
    const { charge_ok } = await import('./read.js');
    const cq = getobj_from_cmdq(charge_ok, true);
    if (!cq.skip) return cq.otmp;
    const selectable = (o) => charge_ok(o) !== GETOBJ_EXCLUDE;
    const suggest = [];
    let anySel = false;
    for (const o of game.invent || []) {
        if (!o?.invlet || !selectable(o)) continue;
        anySel = true;
        if (charge_ok(o) === GETOBJ_SUGGEST) suggest.push(o.invlet);
    }
    if (!anySel) {
        await pline("You don't have anything to charge.");
        return null;
    }
    suggest.sort((a, b) => a.charCodeAt(0) - b.charCodeAt(0));
    const raw = suggest.join('');
    for (;;) {
        await flush_topl_more();
        const lets = raw.length > 5 ? compactify_invlets(raw) : raw;
        const query = raw
            ? `What do you want to charge? [${lets} or ?*]`
            : 'What do you want to charge? [*]';
        const prompt = `${query} `;
        game._pending_message = prompt;
        await flush_screen(1);
        game.nhDisplay?.setCursor?.(prompt.length, 0);
        const key = await nhgetch();
        let ch = String.fromCharCode(key);
        const counted = await getobj_take_count(ch, true);
        if (counted.retry) continue;
        ch = counted.ch;
        if (ch.charCodeAt(0) === 27) return null;
        if (ch === '?' || ch === '*') {
            const ilet = await getobj_display_pickinv(
                ch, raw || '*', true, counted,
            );
            if (ilet === '\x1b') return null;
            if (!ilet) continue;
            const picked = (game.invent || []).find((o) => o.invlet === ilet);
            if (!picked || !selectable(picked)) {
                await pline("You don't have that object.");
                continue;
            }
            const got = await getobj_apply_count(
                picked, 'charge', counted.cntgiven, counted.cnt,
            );
            if (!got) return null;
            if (got.retry) continue;
            game._pending_message = '';
            return got;
        }
        if (ch === ' ' || ch === '\n' || ch === '\r') return null;
        const otmp = (game.invent || []).find((o) => o.invlet === ch);
        if (!otmp || !selectable(otmp)) {
            await pline("You don't have that object.");
            continue;
        }
        const got = await getobj_apply_count(
            otmp, 'charge', counted.cntgiven, counted.cnt,
        );
        if (!got) return null;
        if (got.retry) continue;
        game._pending_message = '';
        return got;
    }
}

/**
 * C youprop.h Blind ≡ (HBlinded || EBlinded) && !BBlinded (+ roleplay).
 * Do not trust sticky u.Blind (D-0716).
 */
function Blind() {
    const u = game.u || {};
    if (u.uroleplay?.blind) return true;
    return !!(((u.HBlinded | 0) || (u.EBlinded | 0)) && !(u.BBlinded | 0));
}

/**
 * C youprop.h :92 Blinded — (HBlinded && !BBlinded) as 0/1.
 * C `&&` yields 1 or 0; invoke_healing compares that to ucreamed (`:1787`).
 * Do not return the HBlinded word (D-1494).
 */
function Blinded() {
    const u = game.u || {};
    return ((u.HBlinded | 0) && !(u.BBlinded | 0)) ? 1 : 0;
}

/** C youprop.h BlindedTimeout — HBlinded & TIMEOUT. */
function BlindedTimeout() {
    return (game.u?.HBlinded | 0) & TIMEOUT;
}

/** C youprop.h Hallucination — HHallucination && !Halluc_resistance. */
function Hallucination() {
    const u = game.u || {};
    const h = (u.HHallucination | 0) || (u.uprops?.[HALLUC]?.intrinsic | 0);
    if (!h) return false;
    return !(u.Halluc_resistance || u.HHalluc_resistance || u.EHalluc_resistance);
}

/** C youprop.h BInvis — uprops[INVIS].blocked. */
function BInvis() {
    const u = game.u || {};
    return !!((u.BInvis | 0) || (u.uprops?.[INVIS]?.blocked | 0));
}

/** C pline.c Your. */
async function Your(rest) {
    await pline(`Your ${rest}`);
}

/** C invent.c carried — object is in invent[]. */
function carried(obj) {
    return !!(obj && (game.invent || []).includes(obj));
}

/** C objnam.c aobjnam — quan prefix + cxname + optional otense. */
function aobjnam(otmp, verb) {
    let bp = cxname(otmp) || '';
    if ((otmp?.quan | 0) !== 1) bp = `${otmp.quan | 0} ${bp}`;
    if (verb) bp += ` ${otense(otmp, verb)}`;
    return bp;
}

function uprop_slot(prop) {
    const u = game.u || (game.u = {});
    if (!u.uprops) u.uprops = {};
    if (!u.uprops[prop]) {
        u.uprops[prop] = { intrinsic: 0, extrinsic: 0, blocked: 0 };
    }
    return u.uprops[prop];
}

/**
 * C artifact.c arti_invoke `:2179` — extrinsic ^= W_ARTI.
 * Mirror W_ARTI onto the matching E* flat (JS gates read flats).
 */
function xor_w_arti(prop) {
    const u = game.u || (game.u = {});
    const slot = uprop_slot(prop);
    slot.extrinsic = (slot.extrinsic | 0) ^ W_ARTI;
    if (prop === INVIS) u.EInvis = (u.EInvis | 0) ^ W_ARTI;
    else if (prop === LEVITATION) u.ELevitation = (u.ELevitation | 0) ^ W_ARTI;
    else if (prop === CONFLICT) u.EConflict = (u.EConflict | 0) ^ W_ARTI;
    return slot.extrinsic | 0;
}

function prop_intrinsic(prop) {
    const u = game.u || {};
    const slot = u.uprops?.[prop];
    let h = slot?.intrinsic | 0;
    if (prop === INVIS) h |= u.HInvis | 0;
    else if (prop === LEVITATION) h |= u.HLevitation | 0;
    else if (prop === CONFLICT) h |= u.HConflict | 0;
    return h;
}

/**
 * C ref: artifact.c arti_invoke_cost_pw :2088–2101 — Pw for invoke while
 * tired. Negative means the invoke cannot be paid with Pw.
 */
function arti_invoke_cost_pw(obj) {
    const oart = get_artifact(obj);
    const inv = oart?.inv_prop | 0;
    if (inv === FLING_POISON || inv === BLINDING_RAY) {
        return SPELL_LEV_PW(5);
    }
    return -1;
}

/**
 * C ref: artifact.c arti_invoke_cost :2104–2128 — cooldown or Pw.
 * age > moves: pay SPELL_LEV_PW(5) or "ignoring you" + d(3,10).
 * else age = moves + rnz(100).
 */
async function arti_invoke_cost(obj) {
    const moves = game.moves | 0;
    if ((obj.age | 0) > moves) {
        const pw_cost = arti_invoke_cost_pw(obj);
        if (pw_cost < 0 || (game.u?.uen | 0) < pw_cost) {
            await You_feel(`that ${the(xname(obj))} ${otense(obj, 'are')} ignoring you.`);
            obj.age = (obj.age | 0) + d(3, 10);
            return false;
        }
        await You_feel('drained...');
        game.u.uen = (game.u.uen | 0) - pw_cost;
        if (game.disp) game.disp.botl = true;
        if (game.flags) game.flags.botl = true;
    } else {
        obj.age = moves + rnz(100);
    }
    return true;
}

/**
 * C ref: artifact.c invoke_blinding_ray :2054–2086 — Sunsword #invoke.
 * getdir: dx||dy → apply.c do_blinding_ray; dz → litroom(TRUE,obj) then
 * "It is lit here now." vs nothing_seems_to_happen; else self
 * lightdamage (gremlin) + flashburn(damg+rnd(damg), FALSE).
 * Cancel: Never_mind, age=moves, ECMD_CANCEL.
 */
async function invoke_blinding_ray(obj) {
    const { getdir } = await import('./lock.js');
    if (await getdir(null)) {
        const u = game.u || {};
        if ((u.dx | 0) || (u.dy | 0)) {
            const { do_blinding_ray } = await import('./apply.js');
            await do_blinding_ray(obj);
        } else if (u.dz) {
            const { litroom } = await import('./read.js');
            await litroom(true, obj);
            const loc = game.level?.at(u.ux | 0, u.uy | 0);
            await pline((!Blind() && loc?.lit && !loc?.waslit)
                ? 'It is lit here now.'
                : nothing_seems_to_happen);
        } else {
            const vulnerable = (u.umonnum | 0) === PM_GREMLIN;
            const damg = obj.blessed ? 15 : !obj.cursed ? 10 : 5;
            const { lightdamage, flashburn } = await import('./zap.js');
            if (vulnerable) {
                await lightdamage(obj, true, 2 * damg);
            }
            if (!(await flashburn(damg + rnd(damg), false)) && !vulnerable) {
                await pline(nothing_seems_to_happen);
            }
        }
    } else {
        await pline(Never_mind);
        obj.age = game.moves | 0;
        return ECMD_CANCEL;
    }
    return ECMD_TIME;
}

/**
 * C ref: artifact.c nothing_special :1761–1766.
 */
async function nothing_special(obj) {
    if (carried(obj)) {
        await You_feel('a surge of power, but nothing seems to happen.');
    }
}

/** C artifact.c invoke_taming :1768–1777 — Palantir #if 0; zeroobj pseudo. */
async function invoke_taming(_obj) {
    const { seffects } = await import('./read.js');
    await seffects({ otyp: SCR_TAMING });
    return ECMD_TIME;
}

/**
 * C ref: artifact.c invoke_healing :1779–1815 — Staff of Aesculapius.
 * Half missing HP; cure Sick/Slimed; wipe BlindedTimeout down to ucreamed.
 * First You_feel uses Blinded 0/1 vs ucreamed (`youprop.h:92`, `:1787`);
 * second uses BlindedTimeout (`:1789`). Both fire when creamed==0.
 */
async function invoke_healing(obj) {
    const u = game.u || (game.u = {});
    let healamt = Math.trunc(((u.uhpmax | 0) + 1 - (u.uhp | 0)) / 2);
    const creamed = u.ucreamed | 0;
    if (Upolyd(u)) {
        healamt = Math.trunc(((u.mhmax | 0) + 1 - (u.mh | 0)) / 2);
    }
    const sick = !!(u.Sick | 0);
    const slimed = !!(u.Slimed | 0);
    if (healamt || sick || slimed || Blinded() > creamed) {
        await You_feel('better.');
    }
    if (healamt || sick || slimed || BlindedTimeout() > creamed) {
        const slightly = (!healamt && !sick && !slimed
            && ((u.HBlinded | 0) & ~TIMEOUT) !== 0) ? 'slightly ' : '';
        await You_feel(`${slightly}better.`);
    } else {
        await nothing_special(obj);
        return ECMD_TIME;
    }
    if (healamt > 0) {
        if (Upolyd(u)) u.mh = (u.mh | 0) + healamt;
        else u.uhp = (u.uhp | 0) + healamt;
    }
    if (sick) {
        const { make_sick } = await import('./potion.js');
        await make_sick(0, null, false, SICK_ALL);
    }
    if (slimed) {
        const { make_slimed } = await import('./potion.js');
        await make_slimed(0, null);
    }
    if (BlindedTimeout() > creamed) {
        const { make_blinded } = await import('./do.js');
        await make_blinded(creamed, false);
    }
    if (game.disp) game.disp.botl = true;
    if (game.flags) game.flags.botl = true;
    return ECMD_TIME;
}

/**
 * C ref: artifact.c invoke_energy_boost :1818–1835 — Mitre of Holiness.
 */
async function invoke_energy_boost(obj) {
    const u = game.u || (game.u = {});
    let epboost = Math.trunc(((u.uenmax | 0) + 1 - (u.uen | 0)) / 2);
    if (epboost > 120) epboost = 120;
    else if (epboost < 12) epboost = (u.uenmax | 0) - (u.uen | 0);
    if (epboost) {
        u.uen = (u.uen | 0) + epboost;
        if (game.disp) game.disp.botl = true;
        if (game.flags) game.flags.botl = true;
        await You_feel('re-energized.');
    } else {
        await nothing_special(obj);
        return ECMD_TIME;
    }
    return ECMD_TIME;
}

/**
 * C ref: artifact.c invoke_untrap :1838–1845 — Master Key of Thievery.
 * Callee trap.c untrap(TRUE,0,0,NULL); door force luck-skip is D-1495.
 */
async function invoke_untrap(obj) {
    const { untrap } = await import('./trap.js');
    if (!(await untrap(true, 0, 0, null))) {
        obj.age = 0;
        return ECMD_CANCEL;
    }
    return ECMD_TIME;
}

/** C artifact.c invoke_charge_obj :1847–1864 — cancel refunds age. */
async function invoke_charge_obj(obj) {
    const oart = get_artifact(obj);
    const otmp = await getobj_charge();
    if (!otmp) {
        obj.age = 0;
        return ECMD_CANCEL;
    }
    const b_effect = !!(obj.blessed && ((oart?.role | 0) === Role_switch()
        || (oart?.role | 0) === NON_PM));
    const { recharge } = await import('./read.js');
    await recharge(otmp, b_effect ? 1 : obj.cursed ? -1 : 0);
    update_inventory();
    return ECMD_TIME;
}

/** C artifact.c invoke_create_portal :1866–1931 — Eye of the Aethiopica. */
async function invoke_create_portal(obj) {
    const { ATR_INVERSE } = await import('./terminal.js');
    const { select_menu_pick_one } = await import('./options.js');
    const tutorial = game.tutorial_dnum;
    const items = [
        { text: 'Open a portal to which dungeon?', attr: ATR_INVERSE, selectable: false },
        { text: '', attr: 0, selectable: false },
    ];
    let num_ok_dungeons = 0, last_ok_dungeon = 0;
    for (let i = 0; i < (game.n_dgns | 0); i++) {
        const dun = game.dungeons?.[i];
        if (!dun?.dunlev_ureached) continue;
        if (tutorial != null && i === (tutorial | 0)) continue;
        items.push({ text: dun.dname || '?', selectable: true, a_int: i + 1 });
        num_ok_dungeons++;
        last_ok_dungeon = i;
    }
    let i = last_ok_dungeon;
    if (num_ok_dungeons > 1) {
        const n = await select_menu_pick_one(items);
        if (n?.kind !== 'pick' || !n.item) {
            await nothing_special(obj);
            return ECMD_TIME;
        }
        i = (n.item.a_int | 0) - 1;
    }
    const dun = game.dungeons?.[i];
    const u = game.u || {};
    const { depth } = await import('./hacklib.js');
    const newlev = { dnum: i, dlevel: 1 };
    newlev.dlevel = ((dun?.depth_start | 0) >= depth(u.uz))
        ? (dun?.entry_lev | 0) : (dun?.dunlev_ureached | 0);
    const { next_to_u } = await import('./apply.js');
    if ((u.uhave?.amulet || u.uhave_amulet)
        || In_endgame(u.uz) || In_endgame(newlev)
        || (newlev.dnum | 0) === (u.uz?.dnum | 0)
        || !(await next_to_u())) {
        await You_feel('very disoriented for a moment.');
    } else {
        if (!Blind()) await pline('You are surrounded by a shimmering sphere!');
        else await You_feel('weightless for a moment.');
        const { goto_level } = await import('./do.js');
        await goto_level(newlev, false, false, false);
    }
    return ECMD_TIME;
}
async function invoke_create_ammo(obj) {
    const { mksobj, weight } = await import('./mkobj.js');
    const otmp = mksobj(ARROW, true, false);
    if (!otmp) {
        await nothing_special(obj);
        return ECMD_TIME;
    }
    otmp.blessed = obj.blessed;
    otmp.cursed = obj.cursed;
    otmp.bknown = obj.bknown;
    otmp.oeroded = 0;
    otmp.oeroded2 = 0;
    if (obj.blessed) {
        if ((otmp.spe | 0) < 0) otmp.spe = 0;
        otmp.quan = (otmp.quan | 0) + rnd(10);
    } else if (obj.cursed) {
        if ((otmp.spe | 0) > 0) otmp.spe = 0;
    } else {
        otmp.quan = (otmp.quan | 0) + rnd(5);
    }
    otmp.owt = weight(otmp);
    const { hold_another_object } = await import('./invent.js');
    await hold_another_object(otmp, 'Suddenly %s out.',
        aobjnam(otmp, 'fall'), null);
    return ECMD_TIME;
}

/** C artifact.c invoke_banish :1962–2019 — Demonbane. */
async function invoke_banish(_obj) {
    let nvanished = 0, nstayed = 0;
    const dest = { dnum: 0, dlevel: 1 };
    const { find_hell, dunlevs_in_dungeon, ledger_no } = await import('./dungeon.js');
    find_hell(dest);
    const { Inhell } = await import('./minion.js');
    const { couldsee } = await import('./vision.js');
    const { migrate_mon } = await import('./mon.js');
    const u = game.u || {};
    for (const mtmp of [...(game.fmon || [])]) {
        if ((mtmp.mhp | 0) <= 0 || !isok(mtmp.mx | 0, mtmp.my | 0)) continue;
        const data = mtmp.data;
        if (!is_demon(data) && data?.mlet !== 'S_IMP') continue;
        if (!couldsee(mtmp.mx | 0, mtmp.my | 0)) continue;
        if ((data?.msound | 0) === MS_NEMESIS) continue;
        let chance = 1;
        if (In_quest(u.uz) && !game.quest_status?.killed_nemesis) chance += 10;
        if (is_dprince(data)) chance += 2;
        if (is_dlord(data)) chance++;
        mtmp.msleeping = 0;
        mtmp.mtame = 0;
        mtmp.mpeaceful = 0;
        if (chance <= 1 || !rn2(chance)) {
            if (!Inhell()) {
                nvanished++;
                dest.dlevel = rn2(dunlevs_in_dungeon(dest));
                await migrate_mon(mtmp, ledger_no(dest), MIGR_RANDOM);
            } else {
                const { u_teleport_mon } = await import('./teleport.js');
                await u_teleport_mon(mtmp, false);
            }
        } else nstayed++;
    }
    if (nvanished) {
        const subject = nvanished === 1 ? 'demon' : 'demons';
        const who = nstayed
            ? ((nvanished > nstayed) ? 'Most of the' : 'Some of the') : 'The';
        await pline(
            `${who} ${subject} ${vtense(subject, 'disappear')} in a cloud of brimstone!`,
        );
    }
    return ECMD_TIME;
}

/**
 * C ref: artifact.c invoke_fling_poison :2022–2037 — Grimtooth.
 */
async function invoke_fling_poison(obj) {
    const { getdir } = await import('./lock.js');
    if (await getdir(null)) {
        const venom = rn2(2) ? BLINDING_VENOM : ACID_VENOM;
        const { mksobj } = await import('./mkobj.js');
        const otmp = mksobj(venom, true, false);
        otmp.spe = 1;
        const { throwit } = await import('./dothrow.js');
        await throwit(otmp, 0, false, null);
    } else {
        await pline(Never_mind);
        obj.age = game.moves | 0;
        return ECMD_CANCEL;
    }
    return ECMD_TIME;
}

/**
 * C ref: artifact.c invoke_storm_spell :2040–2051 — Fire Brand / Frost Brand.
 * Temporarily P_EXPERT then restore; spelleffects(storm, FALSE, TRUE).
 */
async function invoke_storm_spell(obj) {
    const oart = get_artifact(obj);
    const storm = (oart?.inv_prop | 0) === SNOWSTORM
        ? SPE_CONE_OF_COLD : SPE_FIREBALL;
    const { spelleffects, spell_skilltype } = await import('./spell.js');
    const skill = spell_skilltype(storm);
    const u = game.u || (game.u = {});
    if (!u.weapon_skills) u.weapon_skills = [];
    if (!u.weapon_skills[skill]) {
        u.weapon_skills[skill] = { skill: 0, max_skill: 0, advance: 0 };
    }
    const expertise = u.weapon_skills[skill].skill;
    u.weapon_skills[skill].skill = P_EXPERT;
    await spelleffects(storm, false, true);
    u.weapon_skills[skill].skill = expertise;
    return ECMD_TIME;
}

/**
 * C ref: artifact.c arti_invoke else :2178–2229 — INVIS / LEVITATION / CONFLICT.
 * xor W_ARTI; tired only when turning on; cooldown rnz(100) when turning off.
 */
async function arti_invoke_property(obj, invProp) {
    const eprop = xor_w_arti(invProp);
    const iprop = prop_intrinsic(invProp);
    const on = (eprop & W_ARTI) !== 0;
    if (on && (obj.age | 0) > (game.moves | 0)) {
        xor_w_arti(invProp);
        await You_feel(`that ${the(xname(obj))} ${otense(obj, 'are')} ignoring you.`);
        obj.age = (obj.age | 0) + d(3, 10);
        return ECMD_TIME;
    } else if (!on) {
        obj.age = (game.moves | 0) + rnz(100);
    }
    if ((eprop & ~W_ARTI) || iprop) {
        await nothing_special(obj);
        return ECMD_TIME;
    }
    switch (invProp) {
    case CONFLICT:
        if (on) await You_feel('like a rabble-rouser.');
        else await You_feel('the tension decrease around you.');
        break;
    case LEVITATION:
        if (on) {
            const { float_up } = await import('./trap.js');
            await float_up();
            const { spoteffects } = await import('./pickup.js');
            await spoteffects(false);
        } else {
            const { float_down } = await import('./trap.js');
            await float_down(I_SPECIAL | TIMEOUT, W_ARTI);
        }
        break;
    case INVIS: {
        const u = game.u || {};
        if (BInvis() || Blind()) {
            await nothing_special(obj);
            return ECMD_TIME;
        }
        newsym(u.ux | 0, u.uy | 0);
        if (on) {
            await Your(`body takes on a ${Hallucination() ? 'normal' : 'strange'} transparency...`);
        } else {
            await Your('body seems to unfade...');
        }
        break;
    }
    default:
        break;
    }
    return ECMD_TIME;
}

/**
 * C ref: artifact.c arti_invoke — special powers / property toggle.
 * Envelope: !inv_prop → crystal ball or nothing_happens + ECMD_TIME.
 * inv_prop > LAST_PROP: arti_invoke_cost then switch (D-1377 BLINDING_RAY;
 * D-1488 HEALING/ENERGY/UNTRAP/LEV_TELE/ENLIGHTENING/CREATE_AMMO/FLING/
 * FIRESTORM/SNOWSTORM; D-1502 TAMING/CHARGE_OBJ/CREATE_PORTAL/BANISH).
 * Property toggle INVIS/LEVITATION/CONFLICT (D-1488).
 * @returns {number} ECMD_*
 */
export async function arti_invoke(obj) {
    if (!obj) {
        // C: impossible("arti_invoke without obj")
        return ECMD_OK;
    }
    const list = artilist();
    const oart = get_artifact(obj);
    const invProp = oart?.inv_prop | 0;
    if (oart === list[ART_NONARTIFACT] || !invProp) {
        if (obj.otyp === CRYSTAL_BALL) {
            // C artifact.c arti_invoke → use_crystal_ball (D-1010)
            const { use_crystal_ball } = await import('./detect.js');
            await use_crystal_ball(obj);
        } else {
            await pline(nothing_happens);
        }
        return ECMD_TIME;
    }
    if (invProp > LAST_PROP) {
        if (!(await arti_invoke_cost(obj))) return ECMD_TIME;
        switch (invProp) {
        case TAMING:
            return invoke_taming(obj);
        case HEALING:
            return invoke_healing(obj);
        case ENERGY_BOOST:
            return invoke_energy_boost(obj);
        case UNTRAP:
            return invoke_untrap(obj);
        case CHARGE_OBJ:
            return invoke_charge_obj(obj);
        case LEV_TELE: {
            const { level_tele } = await import('./teleport.js');
            await level_tele();
            return ECMD_TIME;
        }
        case CREATE_PORTAL:
            return invoke_create_portal(obj);
        case ENLIGHTENING: {
            const { enlightenment } = await import('./invent.js');
            await enlightenment(MAGICENLIGHTENMENT, ENL_GAMEINPROGRESS);
            return ECMD_TIME;
        }
        case CREATE_AMMO:
            return invoke_create_ammo(obj);
        case BANISH:
            return invoke_banish(obj);
        case FLING_POISON:
            return invoke_fling_poison(obj);
        case SNOWSTORM:
            /* FALLTHRU */
        case FIRESTORM:
            return invoke_storm_spell(obj);
        case BLINDING_RAY:
            return invoke_blinding_ray(obj);
        default:
            await pline(nothing_happens);
            return ECMD_TIME;
        }
    }
    return arti_invoke_property(obj, invProp);
}

/**
 * C ref: artifact.c doinvoke — #invoke command.
 * getobj("invoke", invoke_ok, GETOBJ_PROMPT) is D-1665 (canned invlet).
 * @returns {number} ECMD_*
 */
export async function doinvoke() {
    const obj = await getobj('invoke', invoke_ok, GETOBJ_PROMPT);
    if (!obj) return ECMD_CANCEL;
    if (!retouch_object(obj, false)) return ECMD_TIME;
    return arti_invoke(obj);
}

/**
 * C ref: artifact.c spec_applies — whether artifact special attacks apply.
 * Branch envelope: PHYS early-return (no DBONUS|ATTK); DMONS/DCLAS/DFLAG2/
 * DALIGN; ATTK Magm/Stun rn2(100)<mr. Named omissions: defended();
 * DFLAG1; hero Fire/Cold/Shock/Poison/Drain/Stone/Antimagic props;
 * mon resists_* via mresists (intrinsic bits only when set elsewhere);
 * DFLAG2 yours/Upolyd/ulycn arms (hero as target).
 */
function spec_applies(weap, mtmp) {
    if (!weap) return 0;
    if (!((weap.spfx | 0) & (SPFX_DBONUS | SPFX_ATTK))) {
        return (weap.attk?.adtyp | 0) === AD_PHYS ? 1 : 0;
    }
    if (!mtmp) return 0;
    const yours = mtmp === youmonst || mtmp._youmonst;
    const ptr = mtmp.data;
    const spfx = weap.spfx | 0;

    if (spfx & SPFX_DMONS) {
        return ptr && game.mons && ptr === game.mons[weap.mtype | 0] ? 1 : 0;
    }
    if (spfx & SPFX_DCLAS) {
        return ptr && weap.mtype === ptr.mlet ? 1 : 0;
    }
    if (spfx & SPFX_DFLAG1) {
        // DFLAG1 mflags1 arms deferred
        return 0;
    }
    if (spfx & SPFX_DFLAG2) {
        const m2 = (ptr?.mflags2 | 0) & (weap.mtype | 0);
        // yours / urace.selfmask / ulycn were-arms deferred
        return m2 ? 1 : 0;
    }
    if (spfx & SPFX_DALIGN) {
        if (yours) {
            return ((game.u?.ualign?.type | 0) !== (weap.alignment | 0)) ? 1 : 0;
        }
        const mal = ptr?.maligntyp | 0;
        return (mal === A_NONE || sgn(mal) !== (weap.alignment | 0)) ? 1 : 0;
    }
    if (spfx & SPFX_ATTK) {
        // defended(mtmp, adtyp) deferred → treat as undefended
        const ad = weap.attk?.adtyp | 0;
        switch (ad) {
        case AD_FIRE:
        case AD_COLD:
        case AD_ELEC:
        case AD_DRST:
        case AD_DRLI:
        case AD_STON:
            // hero *Resistance + mon resists_* deferred → bonus applies
            return 1;
        case AD_MAGM:
        case AD_STUN:
            if (yours) {
                const u = game.u || {};
                const am = !!(u.Antimagic || u.HAntimagic || u.EAntimagic);
                return am ? 0 : 1;
            }
            return rn2(100) < (ptr?.mr | 0) ? 0 : 1;
        default:
            return 0;
        }
    }
    return 0;
}

/**
 * C ref: artifact.c spec_abon — special attack (to-hit) bonus.
 * Returns rnd(attk.damn) when artifact applies; else 0.
 */
export function spec_abon(otmp, mon) {
    const list = artilist();
    const weap = get_artifact(otmp);
    if (weap === list[0]) return 0;
    if ((weap.attk?.damn | 0) && spec_applies(weap, mon)) {
        return rnd(weap.attk.damn | 0);
    }
    return 0;
}

/** C gs.spec_dbon_applies — set by spec_dbon; read by artifact_hit. */
let spec_dbon_applies = false;

/** C ref: artifact.c is_art — otmp->oartifact == art index. */
export function is_art(otmp, art) {
    return !!(otmp && (otmp.oartifact | 0) === (art | 0));
}

/**
 * C ref: artifact.c is_magic_key :2774–2786 — Master Key bless/curse.
 * Rogue: non-cursed. Non-rogue: must be blessed. Other objects false.
 * @param {object|null} mon
 * @param {object|null} obj
 * @returns {boolean}
 */
export function is_magic_key(mon, obj) {
    if (!is_art(obj, ART_MASTER_KEY_OF_THIEVERY)) return false;
    const you = game.youmonst;
    const isHero = !mon || mon === you || !!mon._youmonst;
    if (isHero ? Role_if(PM_ROGUE) : ((mon?.data?.mndx | 0) === PM_ROGUE)) {
        return !obj.cursed;
    }
    return !!obj.blessed;
}

/**
 * C ref: artifact.c has_magic_key :2789–2803 — carrying a magic Master Key.
 * Hero walks JS invent[]; monster walks minvent nobj. Null mon → youmonst.
 * @param {object|null} [mon]
 * @returns {object|null} the key, else null (C struct obj *)
 */
export function has_magic_key(mon) {
    if (!mon) mon = game.youmonst;
    const you = game.youmonst;
    const isHero = mon === you || !!mon?._youmonst;
    if (isHero) {
        for (const o of game.invent || []) {
            if (is_magic_key(mon, o)) return o;
        }
        return null;
    }
    for (let o = mon.minvent; o; o = o.nobj) {
        if (is_magic_key(mon, o)) return o;
    }
    return null;
}

/**
 * C ref: artifact.c attacks — artifact attk.adtyp matches adtyp.
 */
export function attacks(adtyp, otmp) {
    const list = artilist();
    const weap = get_artifact(otmp);
    return weap !== list[ART_NONARTIFACT] && (weap.attk?.adtyp | 0) === (adtyp | 0);
}

/** C ref: obj.h Is_dragon_mail / Is_dragon_armor. */
function Is_dragon_mail(obj) {
    const t = obj?.otyp | 0;
    return t >= GRAY_DRAGON_SCALE_MAIL && t <= YELLOW_DRAGON_SCALE_MAIL;
}

function Is_dragon_armor(obj) {
    if (!obj) return false;
    const t = obj.otyp | 0;
    return (t >= GRAY_DRAGON_SCALES && t <= YELLOW_DRAGON_SCALES)
        || Is_dragon_mail(obj);
}

/**
 * C ref: artifact.c defends :636–683 — artifact defn.adtyp, else
 * dragon armor converted mail→scales. Caller: zap.c drain_item
 * (D-1453). Named omit: defended() worn walk (mondata).
 */
export function defends(adtyp, otmp) {
    if (!otmp) return false;
    const list = artilist();
    const weap = get_artifact(otmp);
    if (weap !== list[ART_NONARTIFACT]) {
        return (weap.defn?.adtyp | 0) === (adtyp | 0);
    }
    if (Is_dragon_armor(otmp)) {
        let otyp = otmp.otyp | 0;
        if (Is_dragon_mail(otmp)) {
            otyp += GRAY_DRAGON_SCALES - GRAY_DRAGON_SCALE_MAIL;
        }
        switch (adtyp | 0) {
        case AD_MAGM:
            return otyp === GRAY_DRAGON_SCALES;
        case AD_HALU:
            return otyp === GOLD_DRAGON_SCALES;
        case AD_FIRE:
            return otyp === RED_DRAGON_SCALES;
        case AD_COLD:
            return otyp === WHITE_DRAGON_SCALES;
        case AD_DRST:
        case AD_DISE:
            return otyp === GREEN_DRAGON_SCALES;
        case AD_SLEE:
        case AD_PLYS:
            return otyp === ORANGE_DRAGON_SCALES;
        case AD_DISN:
        case AD_DRLI:
            return otyp === BLACK_DRAGON_SCALES;
        case AD_ELEC:
        case AD_SLOW:
            return otyp === BLUE_DRAGON_SCALES;
        case AD_ACID:
        case AD_STON:
            return otyp === YELLOW_DRAGON_SCALES;
        default:
            break;
        }
    }
    return false;
}

/**
 * C ref: artifact.c defends_when_carried :687–694 — artifact
 * cary.adtyp. No dragon-armor walk. Caller: zap.c drain_item
 * (D-1453). No current artilist row has CARY(AD_DRLI).
 */
export function defends_when_carried(adtyp, otmp) {
    const list = artilist();
    const weap = get_artifact(otmp);
    if (weap !== list[ART_NONARTIFACT]) {
        return (weap.cary?.adtyp | 0) === (adtyp | 0);
    }
    return false;
}

/**
 * C ref: artifact.c spec_dbon — special damage bonus.
 * Grimtooth always applies; else spec_applies. When applies: rnd(damd) or
 * max(tmp,1) when damd==0 (Grayswandir / Orcrist double). Sets
 * spec_dbon_applies for artifact_hit side-effect gates.
 */
export function spec_dbon(otmp, mon, tmp) {
    const list = artilist();
    const weap = get_artifact(otmp);
    if (weap === list[ART_NONARTIFACT]
        || ((weap.attk?.adtyp | 0) === AD_PHYS
            && (weap.attk?.damn | 0) === 0
            && (weap.attk?.damd | 0) === 0)) {
        spec_dbon_applies = false;
    } else if (is_art(otmp, ART_GRIMTOOTH)) {
        spec_dbon_applies = true;
    } else {
        spec_dbon_applies = !!spec_applies(weap, mon);
    }
    if (spec_dbon_applies) {
        const damd = weap.attk?.damd | 0;
        return damd ? rnd(damd) : Math.max(tmp | 0, 1);
    }
    return 0;
}

/**
 * C ref: artifact.c artifact_hit — add spec_dbon then elemental/special arms.
 * Ported: damage add via spec_dbon (Grayswandir max(tmp,1) double).
 * Named omissions: realizes_damage plines; destroy_items/ignite on
 * FIRE/COLD/ELEC (still burn their rn2 gates); Mb_hit; SPFX_BEHEAD;
 * SPFX_DRLI; wake_nearto; Slimed burn_away.
 * @param {object} dmgBox mutable `{ dmg }` (C int *dmgptr)
 * @returns {boolean} whether caller should suppress ordinary hit pline
 */
export function artifact_hit(magr, mdef, otmp, dmgBox, dieroll) {
    void magr;
    if (!otmp?.oartifact || !dmgBox) return false;
    dmgBox.dmg = (dmgBox.dmg | 0) + spec_dbon(otmp, mdef, dmgBox.dmg | 0);

    // Elemental / Magicbane gates — burn C RNG order; bodies deferred.
    if (attacks(AD_FIRE, otmp)) {
        if (!rn2(4)) {
            // destroy_items AD_FIRE + ignite_items deferred
        }
        return true;
    }
    if (attacks(AD_COLD, otmp)) {
        if (!rn2(4)) {
            // destroy_items AD_COLD deferred
        }
        return true;
    }
    if (attacks(AD_ELEC, otmp)) {
        // wake_nearto when spec_dbon_applies deferred
        if (!rn2(5)) {
            // destroy_items AD_ELEC deferred
        }
        return true;
    }
    if (attacks(AD_MAGM, otmp)) {
        return true;
    }
    // C: MB_MAX_DIEROLL 8 — rolls above this aren't magical
    if (attacks(AD_STUN, otmp) && (dieroll | 0) <= 8) {
        // Mb_hit deferred — Magicbane specials
        return false;
    }
    if (!spec_dbon_applies) return false;
    // SPFX_BEHEAD / SPFX_DRLI deferred
    return false;
}

/**
 * C ref: artifact.c what_gives — first invent item conveying extrinsic.
 * Ported: artifact SPFX_HALRES when wielded/worn; non-artifact wornmask
 * match (rings/armor/amulet/tool).
 * Named omissions: other abil_to_spfx / abil_to_adtyp arms; Sunsword EBlnd;
 * cary/defn; what_gives cspfx match (conferral is D-1539).
 * @param {number} extrinsicBits u.uprops[prop].extrinsic
 * @returns {object|null}
 */
export function what_gives(extrinsicBits) {
    const bits = extrinsicBits | 0;
    if (!bits) return null;
    let wornmask = W_ARM | W_ARMC | W_ARMH | W_ARMS
        | W_ARMG | W_ARMF | W_ARMU
        | W_AMUL | W_RINGL | W_RINGR | W_TOOL
        | W_ART | W_ARTI;
    if (game.u?.twoweap) wornmask |= W_SWAPWEP;
    const wornbits = wornmask & bits;
    // C: abil_to_spfx(&EHalluc_resistance) → SPFX_HALRES; other props 0 here
    const needSpfx = (bits & (W_WEP | W_SWAPWEP | W_ART | W_ARTI))
        ? SPFX_HALRES
        : 0;
    const list = artilist();
    for (const obj of game.invent || []) {
        if (!obj) continue;
        if (obj.oartifact) {
            const art = get_artifact(obj);
            if (art === list[0]) continue;
            // C: (art->spfx & spfx) == spfx && obj->owornmask
            if (needSpfx && ((art.spfx | 0) & needSpfx) === needSpfx
                && (obj.owornmask | 0)) {
                return obj;
            }
            continue;
        }
        if (wornbits && wornbits === (wornmask & (obj.owornmask | 0))) {
            return obj;
        }
    }
    return null;
}
