// uhitm.js — Hero hitting monsters (partial).
// C ref: uhitm.c — do_attack / attack_checks mimic / stumble_onto_mimic / hitum / known_hitum / find_roll_to_hit / hmon / hmonas / explum / gulpum / damageum;
//         do_attack u_wipe_engr(3) D-1373; do_attack leprechaun evade D-1381;
//         hmon shade_miss D-1384;
//         hack.c overexertion; mon.c killed / xkilled / corpse_chance.

import { game } from './gstate.js';
import { rn2, rnd, d, rn1 } from './rng.js';
import {
    IS_OBSTRUCTED, IS_TREE, IS_DOOR, IRONBARS, D_CLOSED, D_LOCKED,
    HMON_MELEE, HMON_THROWN, HMON_KICKED, HMON_APPLIED, STRAT_WAITMASK,
    STRAT_WAITFORU, AD_SPEL,
    XKILL_GIVEMSG, XKILL_NOMSG, XKILL_NOCORPSE, XKILL_NOCONDUCT,
    LL_CONDUCT, Upolyd, P_BARE_HANDED_COMBAT, P_TWO_WEAPON_COMBAT, P_BASIC, P_WHIP,
    P_DAGGER, P_AXE, P_SABER,
    M_ATTK_MISS, M_ATTK_HIT, M_ATTK_DEF_DIED, NATTK,
    M_AP_OBJECT, M_AP_FURNITURE, M_AP_MONSTER, M_AP_TYPE, M_AP_NOTHING,
    M_AP_TYPMASK, MHID_ALTMON,
    MIM_REVEAL, MIM_OMIT_WAIT, engulfing_u, OBJ_FREE, MON_DETACH,
    has_mgivenname, ARTICLE_NONE, ARTICLE_THE, ARTICLE_A, ARTICLE_YOUR, SUPPRESS_SADDLE,
    SUPPRESS_NAME, SUPPRESS_IT, SUPPRESS_INVISIBLE, EXACT_NAME,
    HAND, LEG, A_LAWFUL, Is_airlevel, Is_waterlevel, PARANOID_HIT, LOW_PM,
    W_ARM, W_ARMC, W_ARMH, W_ARMU, W_ARMG, W_RINGL, W_RINGR, W_AMUL,
    MON_EXPLODE, NO_MM_FLAGS, DISP_ALWAYS, DISP_END, STOMACH, DIED, NO_KILLER_PREFIX,
    KILLED_BY_AN, PASSES_WALLS, SLOW_DIGESTION, MALE, FEMALE, MMOVE_DIED,
} from './const.js';
import {
    WEAPON_CLASS, ARMOR_CLASS, TOOL_CLASS, FOOD_CLASS, RANDOM_CLASS,
    objectNameStrs, objectNames,
} from './objects.js';
import { exercise, A_STR, A_DEX, A_WIS, A_CON, acurr, adjalign, change_luck } from './attrib.js';
import { overexertion, nomul, losehp, is_pool, maybe_half_phys } from './hack.js';
import { ing_suffix } from './hacklib.js';
import { pline, pline_mon, newsym, canseemon, canspotmon, map_invisible, unmap_object, glyph_is_invisible, flush_topl_more, You_feel, tmp_at, map_location, nh_delay_output, mon_glyph } from './display.js';
import { cansee } from './vision.js';
import {
    dmgval, hitval, P_SKILL, weapon_hit_bonus, martial_bonus,
    dbon, weapon_dam_bonus, use_skill, weapon_type,
    special_dmgval, silver_sears,
} from './weapon.js';
import {
    ammo_and_launcher, is_weptool, is_launcher, is_ammo, is_missile,
    drop_uswapwep,
} from './wield.js';
import { PM_BARBARIAN, PM_MONK, PM_KNIGHT, PM_SAMURAI } from './generated/monsters_data.js';
import {
    find_mac, get_mattk, make_corpse, monstone, mhitm_knockback, monkilled,
    troll_baned, mhitm_ad_poly, could_seduce, shade_miss,
    AT_NONE, AT_WEAP, AT_KICK, AT_CLAW, AT_SPIT, AT_HUGS,
    AT_TUCH, AT_BITE, AT_BUTT, AT_STNG, AT_MAGC, AT_TENT,
    AT_EXPL, AT_ENGL, AT_BREA, AT_GAZE, AD_PHYS, AD_POLY, AD_DRIN,
} from './mhitm.js';
import {
    verysmall, nohands, G_FREQ, G_NOCORPSE, M2_COLLECT, MZ_MEDIUM, MZ_HUGE,
    bigmonst, thick_skinned, monsterNames, nonliving, haseyes,
    is_golem, is_mplayer, is_rider, is_undead, is_flyer, is_floater,
    is_demon, NON_PM, NUMMONS, has_head, mindless, unsolid, breathless, mons,
    flaming, touch_petrifies, is_vampshifter, is_animal, amphibious,
    is_swimmer, slithy,
    is_whirly, passes_walls, hates_silver, humanoid, is_neuter, G_UNIQ,
    MR_FIRE, MR_COLD, MR_ELEC, MR_ACID,
} from './monsters.js';
import {
    mkobj, place_object, stackobj, delobj, relobj_on_death,
    is_metallic, is_crackable,
} from './mkobj.js';
import {
    monnear, record_mvitals_died, seemimic, wakeup, setmangry, dist2,
    wake_nearto, m_carrying, healmon, zombie_maker, zombie_form,
    mtrapped_in_pit,
} from './mon.js';
import { monflee, m_move } from './monmove.js';
import { livelog_printf } from './pline.js';
import { experience, more_experienced, newexplevel } from './exper.js';
import { explode, mon_explodes, adtyp_to_expltype } from './explode.js';
import { rehumanize, body_part, mbodypart } from './polyself.js';
import { mon_nam, Monnam, x_monnam, x_monnam_tame, Hallucination, type_is_pname, pmname, a_monnam } from './do_name.js';
import { artifact_hit, youmonst, is_art } from './artifact.js';
import { xname, vtense, The, An, an, singular, makeplural, cxname, simpleonames, otense } from './objnam.js';
import { abuse_dog, tamedog } from './dog.js';
import { makemon, makemon_appear_msg, newcham } from './makemon.js';
import { ndemon } from './minion.js';
import { ART_GIANTSLAYER, ART_STORMBRINGER } from './generated/artifacts_data.js';
import { paranoid_query } from './getline.js';
import { which_armor } from './worn.js';
import { u_wipe_engr } from './engrave.js';
import { cutworm } from './worm.js';
import { m_unleash } from './apply.js';

/** Live pager.c object_from_map / mhidden_description; bound on first use
 * (pager.js imports mon_at from this file — static import cycles). */
let _object_from_map = null;
let _mhidden_description = null;

async function pager_bind() {
    if (_object_from_map && _mhidden_description) return;
    const pager = await import('./pager.js');
    _object_from_map = pager.object_from_map;
    _mhidden_description = pager.mhidden_description;
}

// C monflag.h — MZ_HUMAN is MZ_MEDIUM
const MZ_HUMAN = MZ_MEDIUM;
const AT_BOOM = 14; // monattk.h — explode on death
const NATTK_CC = 6;
const FIGURINE = objectNames.indexOf('FIGURINE');
const PM_LIZARD = monsterNames.indexOf('PM_LIZARD');
const PM_ORACLE = monsterNames.indexOf('PM_ORACLE');

// C ref: monattk.h damage types used by passive / passive_obj
const AD_MAGM = 1;
const AD_FIRE = 2;
const AD_COLD = 3;
const AD_ELEC = 6;
const AD_BLND = 11; // monattk.h — yellow-light AT_EXPL
const AD_HALU = 36; // monattk.h — black-light AT_EXPL
const AD_ACID = 8;
const AD_STUN = 12;
const AD_PLYS = 14;
const AD_DREN = 16;
const AD_STON = 18;
const AD_STCK = 19;
const AD_RUST = 24;
const AD_DGST = 26;
const AD_WRAP = 28;
const AD_ENCH = 41;
const AD_CORR = 42;

const PM_FLOATING_EYE = monsterNames.indexOf('PM_FLOATING_EYE');
const PM_STEAM_VORTEX = monsterNames.indexOf('PM_STEAM_VORTEX');
const PM_SHADE = monsterNames.indexOf('PM_SHADE');
const PM_FOG_CLOUD = monsterNames.indexOf('PM_FOG_CLOUD');
const PM_MEDUSA = monsterNames.indexOf('PM_MEDUSA');
const PM_GREEN_SLIME = monsterNames.indexOf('PM_GREEN_SLIME');
const PM_FLESH_GOLEM = monsterNames.indexOf('PM_FLESH_GOLEM');
const PM_IRON_GOLEM = monsterNames.indexOf('PM_IRON_GOLEM');
const AMULET_OF_LIFE_SAVING = objectNames.indexOf('AMULET_OF_LIFE_SAVING');
const OILSKIN_CLOAK = objectNames.indexOf('OILSKIN_CLOAK');
const ROBE = objectNames.indexOf('ROBE');
const MUMMY_WRAPPING = objectNames.indexOf('MUMMY_WRAPPING');
const ALCHEMY_SMOCK = objectNames.indexOf('ALCHEMY_SMOCK');
// C objclass.h oc_armcat — helm slot (objects table stores it as oc_skill)
const ARM_HELM = 2;
const PM_AMOROUS_DEMON = monsterNames.indexOf('PM_AMOROUS_DEMON');
const PM_BALROG = monsterNames.indexOf('PM_BALROG');
const PM_GREMLIN = monsterNames.indexOf('PM_GREMLIN');
const PM_ROPE_GOLEM = monsterNames.indexOf('PM_ROPE_GOLEM');
const AMULET_OF_MAGICAL_BREATHING = objectNames.indexOf('AMULET_OF_MAGICAL_BREATHING');
const SILVER = 14; // objclass.h enum obj_material_types
const HEAVY_IRON_BALL = objectNames.indexOf('HEAVY_IRON_BALL');
const TOWEL = objectNames.indexOf('TOWEL');
const CREAM_PIE = objectNames.indexOf('CREAM_PIE');
const BLINDING_VENOM = objectNames.indexOf('BLINDING_VENOM');
const WAN_LIGHT = objectNames.indexOf('WAN_LIGHT');
const LOADSTONE = objectNames.indexOf('LOADSTONE');
// C objclass.h ARM_SHIELD — armor oc_skill / oc_armcat
const ARM_SHIELD = 1;

/** C youprop.h Levitation for m_is_steadfast. */
function Levitation_steadfast() {
    const u = game.u || {};
    if (u.Levitation) return true;
    return !!(((u.HLevitation | 0) || (u.ELevitation | 0))
        && !(u.BLevitation | 0));
}

/** C youprop.h Flying for m_is_steadfast. */
function Flying_steadfast() {
    const u = game.u || {};
    if (u.Flying) return true;
    const steedFly = !!(u.usteed && is_flyer(u.usteed.data));
    return !!(((u.HFlying | 0) || (u.EFlying | 0) || steedFly)
        && !(u.BFlying | 0));
}

/** C invent.c carrying — first matching otyp in hero invent array. */
function carrying_otyp(otyp) {
    if (otyp < 0) return null;
    for (const o of game.invent || []) {
        if ((o.otyp | 0) === (otyp | 0)) return o;
    }
    return null;
}

/**
 * C ref: uhitm.c m_is_steadfast — equipment protects against knockback.
 * Named omit: MON_WEP vs uwep for non-you when worn differently.
 */
export function m_is_steadfast(mtmp) {
    if (!mtmp) return false;
    const is_u = mtmp === game.youmonst || !!mtmp._youmonst;
    const otmp = is_u ? game.u?.uwep : null;
    // MON_WEP: first W_WEP in minvent
    let monWep = otmp;
    if (!is_u) {
        for (let o = mtmp.minvent; o; o = o.nobj) {
            if ((o.owornmask || 0) & 0x00000001 /* W_WEP */) {
                monWep = o;
                break;
            }
        }
    }

    if ((is_u ? (Flying_steadfast() || Levitation_steadfast())
        : (is_flyer(mtmp.data) || is_floater(mtmp.data)))
        || Is_airlevel(game.u?.uz)
        || (Is_waterlevel(game.u?.uz)
            && !is_pool(game.u?.ux | 0, game.u?.uy | 0))) {
        return false;
    }

    if (is_art(monWep, ART_GIANTSLAYER)) return true;
    if (LOADSTONE >= 0) {
        if (is_u) {
            if (carrying_otyp(LOADSTONE)) return true;
        } else if (m_carrying(mtmp, LOADSTONE)) {
            return true;
        }
        if (game.u?.usteed && mtmp === game.u.usteed
            && carrying_otyp(LOADSTONE)) {
            return true;
        }
    }
    return false;
}

/** C ref: hacklib.c s_suffix — local for cream-pie splash whom. */
function s_suffix(s) {
    if (!s) return s;
    if (s === 'it' || s === 'It') return 'its';
    if (s === 'you' || s === 'You') return 'your';
    if (s.endsWith('s') || s.endsWith('z') || s.endsWith('x')
        || s.endsWith('ch') || s.endsWith('sh')) {
        return `${s}'`;
    }
    return `${s}'s`;
}

/**
 * C ref: mondata.c can_blnd — cream pie / blinding venom AT_WEAP|AT_SPIT subset
 * plus AT_ENGL sleep gate for gulpum (D-1264).
 * Named omissions: mon_perma_blind; raven-vs-raven; Blindfolded/ublindf you
 * arms; visored helmet scan; other aatyp (gaze/claw).
 */
function can_blnd(magr, mdef, aatyp, obj) {
    if (!haseyes(mdef?.data)) return false;
    const is_you = mdef === game.youmonst;
    if (aatyp === AT_WEAP || aatyp === AT_SPIT || aatyp === AT_NONE) {
        const otyp = obj?.otyp | 0;
        if (otyp === CREAM_PIE) {
            // Blindfolded you-defense deferred
            void is_you;
        } else if (otyp === BLINDING_VENOM) {
            // ublindf / ucreamed / visor deferred
            void is_you;
        } else {
            return false;
        }
        if (magr === game.youmonst && game.u?.uswallow) return false;
        return true;
    }
    if (aatyp === AT_ENGL) return !(!is_you && mdef.msleeping);
    return true;
}

/** C ref: zap.c exclam — punctuation by damage force. */
function exclam(force) {
    if (force < 0) return '?';
    if (force <= 4) return '.';
    return '!';
}

/**
 * C ref: uhitm.c hmon_hitmon_msg_hit verb — bash/lash/smite/hit.
 * is_shield via ARMOR + oc_skill==ARM_SHIELD; wet towel = TOWEL+spe>0.
 */
function hmon_hit_verb(obj) {
    if (obj) {
        const skill = game.objects?.[obj.otyp]?.oc_skill ?? -1;
        if ((obj.oclass === ARMOR_CLASS && skill === ARM_SHIELD)
            || obj.otyp === HEAVY_IRON_BALL) {
            return 'bash';
        }
        if (skill === P_WHIP
            || (obj.otyp === TOWEL && (obj.spe | 0) > 0)) {
            return 'lash';
        }
    }
    if (game.urole?.mnum === PM_BARBARIAN) return 'smite';
    return 'hit';
}

// C ref: display.h _is_safemon — peaceful + canspotmon + !conf/hallu/stun
export function is_safemon(mon) {
    if (!mon) return false;
    // flags.safe_dog defaults true
    if (game.flags?.safe_dog === false) return false;
    if (!mon.mpeaceful) return false;
    if (!canspotmon(mon)) return false;
    if (game.u?.Confusion || game.u?.Hallucination || game.u?.Stunned) return false;
    return true;
}

/**
 * C ref: monst.h mundisplaceable — priests/shks/guards/Oracle/quest leader
 * refuse peaceful place-swaps.
 */
export function mundisplaceable(mon) {
    if (!mon) return false;
    if (mon.ispriest || mon.isshk || mon.isgd) return true;
    const mndx = mon.mnum ?? mon.data?.mndx;
    if (PM_ORACLE >= 0 && mndx === PM_ORACLE) return true;
    const lid = game.quest_status?.leader_m_id;
    if (lid != null && (mon.m_id | 0) === (lid | 0)) return true;
    return false;
}

function m_at(x, y) {
    for (const m of game.fmon || []) {
        if (m.mx === x && m.my === y) return m;
    }
    return null;
}

/**
 * C ref: weapon.c abon — strength/dexterity to-hit bonus (non-poly).
 */
function abon() {
    const str = acurr(A_STR);
    const dex = acurr(A_DEX);
    const STR18_50 = 18 + 50; // STR18(50) encoding stub: treat encoded >18 as high
    let sbon;
    // Full 18/xx encoding deferred; early heroes use raw acurr ≤18
    if (str < 6) sbon = -2;
    else if (str < 8) sbon = -1;
    else if (str < 17) sbon = 0;
    else if (str <= 18) sbon = 1; // up to 18 (incl. unencoded)
    else if (str < STR18_50) sbon = 1;
    else sbon = 2;
    if ((game.u?.ulevel | 0) < 3) sbon += 1;
    if (dex < 4) return sbon - 3;
    if (dex < 6) return sbon - 2;
    if (dex < 8) return sbon - 1;
    if (dex < 14) return sbon;
    return sbon + dex - 14;
}

/** C ref: you.h Luck — u.uluck + u.moreluck */
function Luck() {
    const u = game.u || {};
    return (u.uluck | 0) + (u.moreluck | 0);
}

/** C ref: you.h helpless — msleeping || !mcanmove */
function helpless(mtmp) {
    return !!(mtmp?.msleeping || mtmp?.mcanmove === 0);
}

/**
 * C ref: uhitm.c check_caitiff — knight chivalry / samurai giri.
 * Called once per multi-attack from find_roll_to_hit (!attk_count++).
 * Named omissions: apply callers (wired separately when needed).
 * dokick poly AT_KICK uses this via find_roll_to_hit (D-1310);
 * kickdmg still calls check_caitiff itself.
 */
export function check_caitiff(mtmp) {
    if (!mtmp) return;
    const u = game.u || {};
    if ((u.ualign?.record | 0) <= -10) return;
    if (Role_if(PM_KNIGHT) && (u.ualign?.type | 0) === A_LAWFUL
        && !is_undead(mtmp.data)
        && (helpless(mtmp) || (mtmp.mflee && !mtmp.mavenge))) {
        pline('You caitiff!');
        adjalign(-1);
    } else if (Role_if(PM_SAMURAI) && mtmp.mpeaceful) {
        pline('You dishonorably attack the innocent!');
        adjalign(-1);
    }
}

/**
 * C ref: uhitm.c find_roll_to_hit — to-hit threshold before rnd(20).
 * dokick poly AT_KICK loop is a caller (D-1310).
 * monk armor / encumbrance / trap / maybe_polyd(mlevel) deferred when
 * they do not change RNG order for ordinary L1 melee.
 * weapon_hit_bonus from weapon.c (bare-hand unskilled = +1; AT_KICK
 * martial_bonus uses NULL weapon like C).
 */
export function find_roll_to_hit(mtmp, aatyp, weapon, attk_count, role_roll_penalty) {
    role_roll_penalty.v = 0;
    const u = game.u || {};
    const luck = Luck();
    // C: sgn(Luck) * ((abs(Luck) + 2) / 3) — trunc toward 0
    const luckbon = (luck < 0 ? -1 : luck > 0 ? 1 : 0)
        * Math.trunc((Math.abs(luck) + 2) / 3);
    let tmp = 1 + abon() + find_mac(mtmp) + (u.uhitinc | 0)
        + luckbon
        + (u.ulevel | 0); // maybe_polyd → ulevel when not poly
    if (!attk_count.v++) {
        // C: knight's chivalry or samurai's giri — once per multi-attack
        check_caitiff(mtmp);
    }
    if (mtmp.mstun) tmp += 2;
    if (mtmp.mflee) tmp += 2;
    if (mtmp.msleeping) tmp += 2;
    if (!mtmp.mcanmove) tmp += 4;
    if (aatyp === AT_WEAP || aatyp === AT_CLAW) {
        if (weapon) tmp += hitval(weapon, mtmp);
        tmp += weapon_hit_bonus(weapon);
    } else if (aatyp === AT_KICK && martial_bonus()) {
        tmp += weapon_hit_bonus(null);
    }
    return tmp;
}

/**
 * C ref: mondata.c attacktype_fordmg — first mattk with aatyp and adtyp
 * (AD_ANY==-1 wildcard). fight_empty explum caller (D-1265).
 */
export function attacktype_fordmg(ptr, atyp, dtyp) {
    const slots = ptr?.mattk;
    if (!slots) return null;
    for (let i = 0; i < slots.length; i++) {
        const a = slots[i];
        if ((a?.aatyp | 0) === (atyp | 0)
            && (dtyp === -1 || (a?.adtyp | 0) === (dtyp | 0))) {
            return a;
        }
    }
    return null;
}

/** C ref: mondata.h attacktype — any mattk slot matches aatyp. */
function attacktype_aatyp(ptr, aatyp) {
    return !!attacktype_fordmg(ptr, aatyp, -1);
}

/**
 * C ref: mon.c corpse_chance — AT_BOOM then always-TRUE arms then !rn2(tmp).
 * magr + was_swallowed: contained boom inside an engulfer (gulpum D-1264).
 * Named omissions: Vlad/lich dust; gulpmu you-as-mdef boom; LEVEL_SPECIFIC_NOCORPSE.
 */
async function corpse_chance(mon, magr = null, was_swallowed = false) {
    const mdat = mon.data;
    if (!mdat) return false;
    if (!magr && game.mswallower
        && attacktype_aatyp(game.mswallower.data, AT_ENGL)) {
        magr = game.mswallower;
        was_swallowed = true;
    }
    // Gas spores always explode upon death
    const slots = mdat.mattk;
    if (slots) {
        for (let i = 0; i < NATTK_CC; i++) {
            const at = slots[i];
            if (!at || (at.aatyp | 0) !== AT_BOOM) continue;
            let tmp = 0;
            if (at.damn) tmp = d(at.damn | 0, at.damd | 0);
            else if (at.damd) tmp = d((mdat.mlevel | 0) + 1, at.damd | 0);
            if (was_swallowed && magr) {
                if (magr === game.youmonst || magr._youmonst) {
                    await pline(`There is an explosion in your ${body_part(STOMACH)}!`);
                    losehp(maybe_half_phys(tmp),
                        `${s_suffix(pmname(mdat, mon.female ? FEMALE : MALE))} explosion`,
                        KILLED_BY_AN);
                }
                return false;
            }
            await mon_explodes(mon, at);
            return false;
        }
    }
    // C: LEVEL_SPECIFIC_NOCORPSE deferred
    // C: ((bigmonst||lizard) && !mcloned) || golem || mplayer || rider || isshk
    if ((((bigmonst(mdat) || (mdat.mndx ?? -1) === PM_LIZARD) && !mon.mcloned)
        || is_golem(mdat) || is_mplayer(mdat) || is_rider(mdat) || mon.isshk)) {
        return true;
    }
    let tmp = 2 + (((mdat.geno ?? 0) & G_FREQ) < 2 ? 1 : 0)
        + (verysmall(mdat) ? 1 : 0);
    return !rn2(tmp);
}

// C ref: mon.c mondead → m_detach(due_to_death) → relobj(mtmp, 1, FALSE)
// Dead mons stay on fmon until dmonsfree (mon.c) — do not splice here.
function mondead(mtmp) {
    mtmp.mhp = 0;
    const mx = mtmp.mx, my = mtmp.my;
    // C m_detach `:2741–2742` — m_unleash(mtmp, FALSE)
    if (mtmp.mleashed) m_unleash(mtmp, false);
    // C: after cham/were restore — mvitals[monsndx].died++
    record_mvitals_died(mtmp.mnum ?? mtmp.data?.mndx);
    mtmp.mstate = (mtmp.mstate | 0) | MON_DETACH;
    // Keep mx/my for drop coords (C mon_leaving_level).
    relobj_on_death(mtmp);
    // C mon.c mondead: glyph_is_invisible → unmap_object
    if (mx > 0 && glyph_is_invisible(game.level?.at?.(mx, my))) {
        unmap_object(mx, my);
    }
    if (mx > 0) newsym(mx, my);
}

/**
 * C ref: uhitm.c first_weapon_hit — livelog before kill so order is hit then kill.
 * Artifact / cursed-bknown / ONAME paths deferred (simpleonames only).
 */
function first_weapon_hit(weapon) {
    let buf = '';
    if (weapon.cursed && weapon.bknown) buf += 'cursed ';
    buf += objectNameStrs[weapon.otyp] || 'weapon';
    livelog_printf(
        LL_CONDUCT,
        'hit with a wielded weapon (%s) for the first time',
        buf,
    );
}

/**
 * C ref: mon.c xkilled treasure drop — mkobj(RANDOM_CLASS) then food/size
 * filters and place. flooreffects pool/lava/hot-potion/boulder omitted
 * (ordinary floor → place). Artifact un-create before oversized delobj
 * deferred.
 */
function xkilled_treasure_drop(mtmp, mdat, mndx, x, y) {
    const mv = game.mvitals?.[mndx]?.mvflags ?? 0;
    if (mv & G_NOCORPSE) return;
    // no extra item from swallower or steed
    if (x === (game.u?.ux | 0) && y === (game.u?.uy | 0)) return;
    if (mdat?.mlet === 'S_KOP') return;
    if (mtmp.mcloned) return;
    const otmp = mkobj(RANDOM_CLASS, true);
    if (!otmp) return;
    const otyp = otmp.otyp | 0;
    if (otmp.oclass === FOOD_CLASS
        && !((mdat?.mflags2 ?? 0) & M2_COLLECT)
        && !otmp.oartifact) {
        delobj(otmp);
    } else if ((mdat?.msize ?? 0) < MZ_HUMAN && otyp !== FIGURINE
        && ((otmp.owt | 0) > 30 || !!(game.objects?.[otyp]?.oc_big))) {
        // C: artifact_exists un-create deferred — ordinary RANDOM_CLASS
        delobj(otmp);
    } else {
        // C: !flooreffects(...) → place_object + stackobj
        place_object(otmp, x, y);
        stackobj(otmp);
    }
}

/**
 * C ref: mon.c xkilled — hero kill; treasure !rn2(6) then corpse_chance
 * → make_corpse; cleanup luck/align before experience.
 * Named omissions: LEVEL_SPECIFIC_NOCORPSE, accessible||is_pool gate,
 * flooreffects non-floor arms, wasinside/burycorpse,
 * human-murder Telepat/luck-2 arm, unicorn coaligned luck-5,
 * quest leader/nemesis/guardian/priest special adjalign arms,
 * artifact un-create on oversized; tame You_hear Soundeffect.
 */
export async function xkilled(mtmp, xkill_flags = XKILL_GIVEMSG) {
    const nomsg = (xkill_flags & XKILL_NOMSG) !== 0;
    const nocorpse = (xkill_flags & XKILL_NOCORPSE) !== 0;
    const noconduct = (xkill_flags & XKILL_NOCONDUCT) !== 0;
    const x = mtmp.mx, y = mtmp.my;
    mtmp.mhp = 0;
    if (!noconduct) {
        if (!game.u.uconduct) game.u.uconduct = {};
        // C: if (!u.uconduct.killer++) livelog...
        if (!(game.u.uconduct.killer | 0)) {
            game.u.uconduct.killer = 1;
            livelog_printf(LL_CONDUCT, 'killed for the first time');
        } else {
            game.u.uconduct.killer = (game.u.uconduct.killer | 0) + 1;
        }
    }
    if (!nomsg) {
        // C mon.c xkilled: nonliving ? "destroy" : "kill";
        // !(wasinside || canspotmon) → "it"; !mtame → mon_nam;
        // mtame → x_monnam(..., "poor", ...).
        const verb = nonliving(mtmp.data) ? 'destroy' : 'kill';
        const wasinside = engulfing_u(mtmp);
        let whom;
        if (!(wasinside || canspotmon(mtmp))) {
            whom = 'it';
        } else if (!mtmp.mtame) {
            whom = mon_nam(mtmp);
        } else {
            // C: namedpet = has_mgivenname(mtmp) && !Hallucination
            const namedpet = has_mgivenname(mtmp) && !Hallucination();
            whom = x_monnam(
                mtmp,
                namedpet ? ARTICLE_NONE : ARTICLE_THE,
                'poor',
                namedpet ? SUPPRESS_SADDLE : 0,
                false,
            );
        }
        await pline(`You ${verb} ${whom}!`);
    }
    // C: if (gs.stoned) monstone(mtmp); else mondead(mtmp);
    const was_stoned = !!(game.context?.stoned);
    if (was_stoned) {
        await monstone(mtmp);
    } else {
        mondead(mtmp);
    }
    if ((mtmp.mhp | 0) >= 1) {
        if (game.context) game.context.stoned = false;
        return; // lifesaved
    }
    const mdat = mtmp.data;
    const mndx = mtmp.mnum ?? mdat?.mndx;
    // C: if (gs.stoned) { gs.stoned = FALSE; goto cleanup; }
    if (was_stoned) {
        if (game.context) game.context.stoned = false;
    } else if (!nocorpse) {
        // accessible/pool gate deferred — always attempt RNG like floor tile
        if (!rn2(6)) xkilled_treasure_drop(mtmp, mdat, mndx, x, y);
        // C: if (!wasinside && corpse_chance(...)) { gz.zombify=...; make_corpse; reset }
        // wasinside skip still named. mhitm mdamagem monkilled zombify is D-1211.
        if (await corpse_chance(mtmp)) {
            game.zombify = (!game.thrownobj && !game.context?.stoned
                && !game.u?.uwep
                && zombie_maker(game.youmonst)
                && zombie_form(mtmp.data) !== NON_PM);
            make_corpse(mtmp);
            game.zombify = false;
        }
    }
    // C mon.c xkilled: newsym after treasure/corpse — mondead's early
    // newsym runs before drops, so treasure-only kills need this paint.
    if (x > 0) newsym(x, y);

    // C cleanup: punish bad behavior — before experience
    // (peaceful && !rn2(2)) || mtame → short-circuit burns rn2 when peaceful
    if ((mtmp.mpeaceful && !rn2(2)) || mtmp.mtame) {
        change_luck(-1);
    }
    // human-murder / unicorn arms deferred (no RNG when gates fail)

    const died = game.mvitals?.[mndx]?.died | 0;
    const tmp = experience(mtmp, died);
    more_experienced(tmp, 0);
    await newexplevel();

    // C: special adjalign arms — tame before peaceful; then malign
    if (mtmp.mtame) {
        adjalign(-15);
        // You_hear thunder/applause — no RNG; pline-only for Hallu/Deaf
        const Deaf = !!(game.u?.Deaf || game.u?.HDeaf || game.u?.EDeaf);
        if (!Deaf) {
            if (game.u?.Hallucination) {
                await pline('You hear the studio audience applaud!');
            } else {
                await pline('You hear the rumble of distant thunder...');
            }
        }
    } else if (mtmp.mpeaceful && !mtmp.ispriest) {
        adjalign(-5);
    }
    // quest/nemesis/guardian/priest arms deferred
    adjalign(mtmp.malign | 0);
}

export async function killed(mtmp) {
    await xkilled(mtmp, XKILL_GIVEMSG);
}

/**
 * C ref: uhitm.c hmon_hitmon_stagger — unarmed stun chance before damage.
 * Always burns rnd(100); stun pline + mhurtle_to_doom deferred when the
 * skill/size/hide gate would succeed and pending dmg < mhp.
 */
function hmon_hitmon_stagger(mon, dmg) {
    const mdat = mon?.data;
    if (rnd(100) < P_SKILL(P_BARE_HANDED_COMBAT)
        && !bigmonst(mdat)
        && !thick_skinned(mdat)) {
        // canspotmon stagger pline + mhurtle_to_doom deferred
        void dmg;
        return true; // hittxt
    }
    return false;
}

/**
 * C ref: obj.h bimanual — WEAPON/TOOL with oc_bimanual (oc_big).
 */
function bimanual(obj) {
    if (!obj) return false;
    if (obj.oclass !== WEAPON_CLASS && obj.oclass !== TOOL_CLASS) return false;
    return !!(game.objects?.[obj.otyp]?.oc_big);
}

/**
 * C ref: youprop.h Hate_silver — lycanthrope or poly form hates_silver.
 */
function Hate_silver() {
    const u = game.u || {};
    return ((u.ulycn ?? NON_PM) | 0) >= LOW_PM
        || hates_silver(game.youmonst?.data);
}

/**
 * C ref: uhitm.c hmonas :5494–5513 — toggle altwep so the next AT_WEAP
 * uses uswapwep (approximate two-weapon). Gates match C: one-handed
 * primary weapon/weptool, no shield, secondary not artifact / launcher /
 * ammo / missile / bimanual / silver-while-Hate_silver.
 */
function hmonas_toggle_altwep(u) {
    const uwep = u?.uwep;
    const uswapwep = u?.uswapwep;
    if (!uswapwep) return false;
    if (!uwep || !(uwep.oclass === WEAPON_CLASS || is_weptool(uwep))) {
        return false;
    }
    if (bimanual(uwep)) return false;
    if (u.uarms || uswapwep.oartifact) return false;
    if (!(uswapwep.oclass === WEAPON_CLASS || is_weptool(uswapwep))) {
        return false;
    }
    if (is_launcher(uswapwep) || is_ammo(uswapwep) || is_missile(uswapwep)) {
        return false;
    }
    if (bimanual(uswapwep)) return false;
    if ((game.objects?.[uswapwep.otyp]?.oc_material | 0) === SILVER
        && Hate_silver()) {
        return false;
    }
    return true;
}

/**
 * C ref: uhitm.c hmon_hitmon_dmg_recalc — udaminc + dbon + weapon_dam_bonus.
 * Named omissions: PROJECTILE→launcher
 * skillwep swap (ammo uses weapon_type(obj) until shot path ports).
 */
function hmon_hitmon_dmg_recalc(dmg, obj, thrown, twohits, use_weapon_skill,
    train_weapon_skill) {
    let dmgbonus = game.u?.udaminc | 0;
    const u = game.u || {};
    // thrown launcher ammo: udaminc yes, dbon no
    if (thrown !== HMON_THROWN
        || !obj || !u.uwep || !ammo_and_launcher(obj, u.uwep)) {
        let strbonus = dbon();
        const absbonus = Math.abs(strbonus);
        const sgn = strbonus < 0 ? -1 : (strbonus > 0 ? 1 : 0);
        if (twohits) {
            strbonus = Math.trunc((3 * absbonus + 2) / 4) * sgn;
        } else if (thrown === HMON_MELEE && u.uwep && bimanual(u.uwep)) {
            strbonus = Math.trunc((3 * absbonus + 1) / 2) * sgn;
        }
        dmgbonus += strbonus;
    }
    if (use_weapon_skill) {
        let skillwep = obj;
        // C: PROJECTILE(obj) && ammo_and_launcher → skillwep = uwep deferred
        dmgbonus += weapon_dam_bonus(skillwep);
        if (train_weapon_skill) {
            // C: thrown ? weapon_type(skillwep) : uwep_skill_type()
            const wtype = thrown
                ? weapon_type(skillwep)
                : (u.twoweap ? P_TWO_WEAPON_COMBAT : weapon_type(u.uwep));
            use_skill(wtype, 1);
        }
    }
    dmg += dmgbonus;
    if (dmg < 1) dmg = 1;
    return dmg;
}

/**
 * C ref: uhitm.c hmon → hmon_hitmon.
 * Thrown cream pie / blinding venom misc_obj arm (D-0693); melee weapon path.
 * troll_baned around killed (D-1232): set TRUE only, always reset after.
 * shade_miss melee/applied D-1384 (`:1812–1822`); thrown/kicked are D-1383.
 * Poison / joust / hurtle / pudding split / poiskilled skip still named.
 * Unarmed special_dmgval gloves/rings + non-shade get_dmg_bonus min-1 named.
 */
async function hmon(mon, obj, thrown, _dieroll) {
    // C hmon_hitmon_misc_obj CREAM_PIE / BLINDING_VENOM before weapon dmg
    if (obj && (obj.otyp === CREAM_PIE || obj.otyp === BLINDING_VENOM)) {
        mon.msleeping = 0;
        const aatyp = obj.otyp === BLINDING_VENOM ? AT_SPIT : AT_WEAP;
        if (can_blnd(game.youmonst || youmonst, mon, aatyp, obj)) {
            const Blind = !!(game.Blind || game.u?.Blind);
            if (Blind) {
                await pline(obj.otyp === CREAM_PIE ? 'Splat!' : 'Splash!');
            } else if (obj.otyp === BLINDING_VENOM) {
                await pline(
                    `The venom blinds ${mon_nam(mon)}${mon.mcansee ? '' : ' further'}!`,
                );
            } else {
                // C ref: uhitm.c hmon_hitmon_misc_obj CREAM_PIE — The(xname);
                // !thrown && quan>1 → An(singular). FACE via mbodypart deferred
                // (hardcoded "face" matches ordinary mbodypart FACE).
                let whom = mon_nam(mon);
                let what = The(xname(obj));
                if (!thrown && (obj.quan | 0) > 1) {
                    what = An(singular(obj, xname));
                }
                if (haseyes(mon.data) && (mon.mnum | 0) !== PM_FLOATING_EYE) {
                    whom = `${s_suffix(whom)} face`;
                }
                await pline(`${what} ${vtense(what, 'splash')} over ${whom}!`);
            }
            setmangry(mon, true);
            mon.mcansee = 0;
            const blind_dmg = rn1(25, 21);
            const sum = (mon.mblinded | 0) + blind_dmg;
            mon.mblinded = sum > 127 ? 127 : sum;
        } else {
            await pline(obj.otyp === CREAM_PIE ? 'Splat!' : 'Splash!');
            setmangry(mon, true);
        }
        // C: thrown → obfree (no obj_resists); melee useup deferred
        if (thrown) {
            obj.quan = 0;
            obj.where = OBJ_FREE;
        }
        await wakeup(mon, true);
        return true; // mon alive (dmg forced 0)
    }

    // C: hmd.twohits = thrown ? 0 : gt.twohits
    const twohits = thrown ? 0 : gt_twohits;
    let dmg = 0;
    let use_weapon_skill = false;
    let train_weapon_skill = false;
    let hittxt = false;
    if (!obj) {
        // C hmon_hitmon_barehands :842–850 — shade dmg 0 then special_dmgval
        // (gloves/silver rings named). Else rnd(!martial_bonus() ? 2 : 4).
        if ((mon.data?.mndx | 0) === PM_SHADE) {
            dmg = 0;
        } else {
            dmg = rnd(martial_bonus() ? 4 : 2);
            use_weapon_skill = true;
            train_weapon_skill = dmg > 1;
        }
    } else if (obj.oclass === WEAPON_CLASS
        || game.objects?.[obj.otyp]?.oc_skill != null) {
        dmg = dmgval(obj, mon);
        use_weapon_skill = true;
        train_weapon_skill = dmg > 1;
        // C hmon_hitmon_weapon_melee: artifact_hit after dmgval, before
        // hmon_hitmon_dmg_recalc (Grayswandir spec_dbon max(tmp,1)).
        if (obj.oartifact) {
            const dmgBox = { dmg };
            if (artifact_hit(youmonst, mon, obj, dmgBox, _dieroll | 0)) {
                hittxt = true;
            }
            dmg = dmgBox.dmg | 0;
        }
    } else {
        dmg = dmgval(obj, mon);
    }
    // C: if (hmd.dmg > 0) hmon_hitmon_dmg_recalc — before stagger
    if (dmg > 0) {
        dmg = hmon_hitmon_dmg_recalc(dmg, obj, thrown, twohits,
            use_weapon_skill, train_weapon_skill);
    }

    // C uhitm.c hmon_hitmon :1812–1822 — dmg<1 shade melee/applied
    // shade_miss(&youmonst,mon,obj,FALSE,TRUE). Thrown/kicked skip here
    // (zap.c bhit D-1383). Non-shade get_dmg_bonus bump-to-1 named.
    if (dmg < 1) {
        const mon_is_shade = (mon.data?.mndx | 0) === PM_SHADE;
        dmg = 0;
        if (mon_is_shade && !hittxt
            && thrown !== HMON_THROWN && thrown !== HMON_KICKED) {
            hittxt = await shade_miss(game.youmonst, mon, obj, false, true);
        }
    }

    // C: unarmed = !uwep && !uarm && !uarms; stagger before mhp -= dmg
    const unarmed = !game.u?.uwep && !game.u?.uarm && !game.u?.uarms;
    // C: weapon melee with dmg>1 may knock back (RNG always burned if set)
    let maybe_knockback = false;
    if (unarmed && dmg > 1 && !thrown && !obj && !Upolyd(game.u)) {
        hittxt = hmon_hitmon_stagger(mon, dmg);
    } else if (!unarmed && dmg > 1 && !thrown && !Upolyd(game.u)
            && !game.u?.twoweap && game.u?.uwep) {
        maybe_knockback = true;
    }

    // C hmon_hitmon: first_weapon_hit before damage when weaphit just broke
    if (obj
        && (obj === game.u?.uwep || (obj === game.u?.uswapwep && game.u?.twoweap))
        && (obj.oclass === WEAPON_CLASS
            || game.objects?.[obj.otyp]?.oc_skill != null)
        && (thrown === HMON_MELEE || thrown === HMON_APPLIED)
        && dmg > 0
        && (game.u?.uconduct?.weaphit | 0) <= 1) {
        first_weapon_hit(obj);
    }

    mon.mhp = (mon.mhp | 0) - dmg;
    const destroyed = (mon.mhp | 0) < 1;
    if (destroyed) mon.mhp = 0;

    // C: hmon_hitmon_pet — after mhp damage, before msg_hit / killed
    // (abuse_dog even when pet is dying; monflee only if still alive+tame)
    if (mon.mtame && dmg > 0) {
        await abuse_dog(mon);
        if (mon.mtame && !destroyed) {
            await monflee(mon, 10 * rnd(dmg), false, false);
        }
    }

    // C: hmon_hitmon_msg_hit — !hittxt && (!destroyed || thrown-multishot)
    if (!hittxt && !destroyed) {
        if (thrown === HMON_MELEE) {
            if (game.flags?.verbose !== false) {
                const punct = canseemon(mon) ? exclam(dmg) : '.';
                await pline(`You ${hmon_hit_verb(obj)} ${mon_nam(mon)}${punct}`);
            } else {
                await pline('You hit it.');
            }
        } else if (thrown) {
            // C: thrown/kicked/applied → hit(mshot_xname); mshot deferred
            const missile = xname(obj);
            const bx = game.bhitpos?.x ?? mon.mx;
            const by = game.bhitpos?.y ?? mon.my;
            const whom = ((cansee(bx, by) || canspotmon(mon))
                && game.flags?.verbose !== false)
                ? mon_nam(mon) : 'it';
            await pline(
                `${The(missile)} ${vtense(missile, 'hit')} ${whom}${exclam(dmg)}`,
            );
        }
    }

    if (destroyed) {
        // C uhitm.c hmon_hitmon :1906–1909 — TRUE only (not mhitm/hmonas
        // ternary); always reset after killed. poiskilled/already_killed
        // skip named. hmonas damageum ternary/uwep is D-1233.
        if (troll_baned(mon, obj))
            game.mkcorpstat_norevive = true;
        await killed(mon);
        game.mkcorpstat_norevive = false;
        return false; // died
    }
    // C: !destroyed → wakeup; maybe_knockback → mhitm_knockback
    // (rn2(3)+rn2(chance) before gates; hurtle body still stubbed)
    await wakeup(mon, true);
    if (maybe_knockback) {
        let mattk = get_mattk(game.youmonst, 0, mon);
        // set_uasmon deferred — non-poly hero form is AT_WEAP AD_PHYS
        if (mattk.aatyp === AT_NONE) {
            mattk = { aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 0, damd: 0 };
        }
        mhitm_knockback(game.youmonst, mon, mattk, M_ATTK_HIT, true);
    }
    return true;
}

export { hmon, passive_obj };

/**
 * C ref: uhitm.c missum — near-miss armor pline, seduce pretend, miss/wakeup.
 * dokick poly AT_KICK miss arm (D-1310).
 */
export async function missum(mdef, mattk, wouldhavehit) {
    if (wouldhavehit) await pline('Your armor is rather cumbersome...');
    if (could_seduce(game.youmonst, mdef, mattk)) {
        await pline(`You pretend to be friendly to ${mon_nam(mdef)}.`);
    } else if (canspotmon(mdef) && game.flags?.verbose !== false) {
        await pline(`You miss ${mon_nam(mdef)}.`);
    } else {
        await pline('You miss it.');
    }
    if (!helpless(mdef)) await wakeup(mdef, true);
}

/**
 * C ref: uhitm.c mhitm_ad_phys youmonst (hero→mon) arm used by damageum.
 * AT_WEAP zeros extra phys (known_hitum already dealt it). mhitu/mhitm arms named.
 */
function damageum_ad_phys(mdef, mattk, mhm) {
    const pd = mdef?.data;
    if ((mdef.mnum ?? pd?.mndx) === PM_SHADE) mhm.damage = 0;
    mhm.damage += mhm.specialdmg | 0;
    const aatyp = mattk.aatyp | 0;
    if (aatyp === AT_WEAP) {
        mhm.damage = 0;
    } else if (aatyp === AT_KICK || aatyp === AT_CLAW
        || aatyp === AT_TUCH || aatyp === AT_HUGS) {
        if (thick_skinned(pd)) {
            mhm.damage = (aatyp === AT_KICK) ? 0
                : Math.trunc((mhm.damage + 1) / 2);
        }
        const udaminc = game.u?.udaminc | 0;
        if (udaminc > 0) {
            mhm.damage += udaminc;
        } else if (mhm.damage > 0) {
            mhm.damage += udaminc;
            if (mhm.damage < 1) mhm.damage = 1;
        }
    }
}

/** C ref: obj.h is_helmet — ARMOR + oc_armcat ARM_HELM. */
function is_helmet_uhitm(obj) {
    return obj?.oclass === ARMOR_CLASS
        && (game.objects?.[obj.otyp]?.oc_skill ?? -1) === ARM_HELM;
}

/**
 * C ref: do_wear.c hard_helmet `:567–573` — metallic or glass helm.
 */
function hard_helmet(obj) {
    if (!obj || !is_helmet_uhitm(obj)) return false;
    return is_metallic(obj) || is_crackable(obj);
}

/** C ref: objnam.c helm_simple_name `:5513–5528` — hat vs helm. */
function helm_simple_name(helmet) {
    return !hard_helmet(helmet) ? 'hat' : 'helm';
}

/**
 * C ref: objnam.c cloak_simple_name `:5492–5509`.
 * Used by m_slips_free when the grab target is undiscovered oilskin.
 */
function cloak_simple_name(cloak) {
    if (cloak) {
        const t = cloak.otyp | 0;
        if (t === ROBE) return 'robe';
        if (t === MUMMY_WRAPPING) return 'wrapping';
        if (t === ALCHEMY_SMOCK) {
            const ocl = game.objects?.[t];
            return (ocl?.oc_name_known && cloak.dknown) ? 'smock' : 'apron';
        }
    }
    return 'cloak';
}

/**
 * C ref: you.h mhis → genders[pronoun_gender(mtmp, PRONOUN_HALLU)].his.
 * Hallu rn2(4) live; canspotmon→its named on the C macro.
 */
function mhis(mtmp) {
    if (game.u?.Hallucination) {
        return ['his', 'her', 'its', 'their'][rn2(4)];
    }
    const ptr = mtmp?.data;
    if (is_neuter(ptr)) return 'its';
    if (humanoid(ptr) || ((ptr?.geno | 0) & G_UNIQ)) {
        return mtmp?.female ? 'her' : 'his';
    }
    return 'its';
}

/**
 * C ref: uhitm.c m_slips_free `:2053–2093` — greased/oilskin clothing
 * slips a hug or drain. AD_DRIN looks at W_ARMH; other attacks walk
 * cloak then suit then shirt. Assumes the hero is the attacker.
 * AD_WRAP caller is mhitm_ad_wrap (D-1348).
 */
async function m_slips_free(mdef, mattk) {
    let obj;
    if ((mattk?.adtyp | 0) === AD_DRIN) {
        obj = which_armor(mdef, W_ARMH);
    } else {
        obj = which_armor(mdef, W_ARMC);
        if (!obj) obj = which_armor(mdef, W_ARM);
        if (!obj) obj = which_armor(mdef, W_ARMU);
    }
    const otyp = obj?.otyp | 0;
    if (obj && (obj.greased || otyp === OILSKIN_CLOAK)
        && (!obj.cursed || rn2(3))) {
        const verb = (mattk?.adtyp | 0) === AD_WRAP
            ? 'slip off of'
            : 'grab, but cannot hold onto';
        const greasy = obj.greased ? 'greased' : 'slippery';
        const ocl = game.objects?.[otyp];
        const what = (obj.greased || ocl?.oc_name_known)
            ? xname(obj)
            : cloak_simple_name(obj);
        await pline(
            `You ${verb} ${s_suffix(mon_nam(mdef))} ${greasy} ${what}!`,
        );
        if (obj.greased && !rn2(2)) {
            await pline('The grease wears off.');
            obj.greased = 0;
        }
        return true;
    }
    return false;
}

/**
 * C ref: uhitm.c mhitm_ad_drin `:3167–3303` — uhitm (hero→mon).
 * Headless / notonhead wastes the tentacle, zeros damage, skipdrin
 * (D-1298). Headed: m_slips_free then helmet which_armor(W_ARMH)&&rn2(8)
 * then eat_brains (D-1306) then lifsav skipdrin if the amulet vanished.
 * Helmet/slip return without zeroing dice and without skipdrin.
 * mhitu u_slip_free/uarmh D-1329; mhitm arm D-1330 in mhitm.js.
 */
async function mhitm_ad_drin(magr, mattk, mdef, mhm) {
    const pd = mdef?.data;
    if (magr !== game.youmonst) return;
    if (game.notonhead || !has_head(pd)) {
        await pline(`${Monnam(mdef)} doesn't seem harmed.`);
        game.skipdrin = true;
        mhm.damage = 0;
        const pdn = pd?.mndx ?? mdef.mnum;
        if (!he_prop('Unchanging', 'HUnchanging', 'EUnchanging')
            && pdn === PM_GREEN_SLIME) {
            const u = game.u || {};
            if (!(u.Slimed | 0)) {
                await pline("You suck in some slime and don't feel very well.");
                await (await import('./potion.js')).make_slimed(10, null);
            }
        }
        return; // C `:3202` — helmet / eat_brains must not run headless
    }
    if (await m_slips_free(mdef, mattk)) return;

    const helmet = which_armor(mdef, W_ARMH);
    if (helmet && rn2(8)) {
        await pline(
            `${s_suffix(Monnam(mdef))} ${helm_simple_name(helmet)} blocks your attack to ${mhis(mdef)} head.`,
        );
        return;
    }
    const amu = which_armor(mdef, W_AMUL);
    const lifsav = !!(amu && (amu.otyp | 0) === AMULET_OF_LIFE_SAVING);

    const { eat_brains } = await import('./eat.js');
    await eat_brains(game.youmonst, mdef, true, mhm);

    if (lifsav && !which_armor(mdef, W_AMUL)) game.skipdrin = true;
}

/** C ref: mondata.h cant_drown — swimmer || amphibious || breathless. */
function cant_drown(ptr) {
    return is_swimmer(ptr) || amphibious(ptr) || breathless(ptr);
}

/**
 * C ref: uhitm.c mhitm_ad_wrap `:3344–3375` — uhitm (hero→mon).
 * !sticks(pd): tailmiss = !gn.notonhead (C as written). Grab only when
 * !ustuck && !tailmiss && !rn2(10), then m_slips_free else coil/swing
 * set_ustuck. Already-held && !tailmiss: pool && !cant_drown drown to
 * mhp, else AT_HUGS crush (dice kept). Else zero dice + verbose brush
 * (coil&&!tailmiss whole vs s_suffix tail/LEG). sticks zeros leftover.
 * mhitu arm is mhitm_ad_wrap_u (D-1331). mhitm brush is D-1406.
 */
export async function mhitm_ad_wrap(magr, mattk, mdef, mhm) {
    if (magr !== game.youmonst) return;
    const pd = mdef?.data;
    const pa = magr?.data;
    const coil = slithy(pa)
        && (pa?.mlet === 'S_SNAKE' || pa?.mlet === 'S_NAGA');
    if (!sticks(pd)) {
        const tailmiss = !game.notonhead;
        const u = game.u || {};
        if (!u.ustuck && !tailmiss && !rn2(10)) {
            if (await m_slips_free(mdef, mattk)) {
                mhm.damage = 0;
            } else {
                await pline(
                    `You ${coil ? 'coil' : 'swing'} yourself around ${mon_nam(mdef)}!`,
                );
                set_ustuck(mdef);
            }
        } else if (u.ustuck === mdef && !tailmiss) {
            if (is_pool(u.ux, u.uy) && !cant_drown(pd)) {
                await pline(`You drown ${mon_nam(mdef)}...`);
                mhm.damage = mdef.mhp;
            } else if ((mattk.aatyp | 0) === AT_HUGS) {
                await pline(`${Monnam(mdef)} is being crushed.`);
            }
        } else {
            mhm.damage = 0;
            if (game.flags?.verbose !== false) {
                if (coil && !tailmiss) {
                    await pline(`You brush against ${mon_nam(mdef)}.`);
                } else {
                    await pline(
                        `You brush against ${s_suffix(mon_nam(mdef))} ${
                            tailmiss ? 'tail' : mbodypart(mdef, LEG)
                        }.`,
                    );
                }
            }
        }
    } else {
        mhm.damage = 0;
    }
}

/**
 * C ref: uhitm.c mhitm_adtyping youmonst subset for damageum.
 * AD_PHYS + AD_POLY + AD_DRIN skipdrin + AD_WRAP (D-1348) live;
 * remaining mhitm_ad_* named. mhitm wrap brush is D-1406.
 */
async function damageum_adtyping(mattk, mdef, mhm) {
    const adtyp = mattk.adtyp | 0;
    if (adtyp === AD_PHYS) damageum_ad_phys(mdef, mattk, mhm);
    else if (adtyp === AD_POLY) {
        await mhitm_ad_poly(game.youmonst, mattk, mdef, mhm);
    } else if (adtyp === AD_DRIN) {
        await mhitm_ad_drin(game.youmonst, mattk, mdef, mhm);
    } else if (adtyp === AD_WRAP) {
        await mhitm_ad_wrap(game.youmonst, mattk, mdef, mhm);
    }
}

/**
 * C ref: uhitm.c demonpet `:2133–2145` — send in a demon pet; exercise WIS.
 * 1/6 ndemon(u.ualign.type); else hero's current form. makemon(pm, ux, uy,
 * NO_MM_FLAGS) then tamedog(null, FALSE). Appear Norep is JS's split
 * makemon_appear_msg (C in-body; D-0928 #1164).
 */
export async function demonpet() {
    const u = game.u || {};
    await pline('Some hell-p has arrived!');
    const i = !rn2(6) ? ndemon(u.ualign?.type | 0) : NON_PM;
    const pm = i !== NON_PM ? mons(i) : game.youmonst?.data;
    const dtmp = pm ? makemon(pm, u.ux | 0, u.uy | 0, NO_MM_FLAGS) : null;
    if (dtmp) {
        await makemon_appear_msg(dtmp, u.ux | 0, u.uy | 0, NO_MM_FLAGS);
        await tamedog(dtmp, null, false);
    }
    exercise(A_WIS, true);
}

/**
 * C ref: uhitm.c damageum — dice + adtyping then DEADMONSTER wrap.
 * troll_baned ternary on AT_WEAP||AT_CLAW uses uwep (not hitting obj;
 * C FIXME vs two-weapon secondary). Always reset after killed/xkilled.
 * Unarmed demon poly (not succubus/balrog) 1/13 → demonpet then MISS.
 */
export async function damageum(mdef, mattk, specialdmg) {
    const mhm = {
        damage: d(mattk.damn | 0, mattk.damd | 0),
        hitflags: M_ATTK_MISS,
        permdmg: 0,
        specialdmg: specialdmg | 0,
        done: false,
    };
    const u = game.u || {};
    const umon = u.umonnum | 0;
    if (is_demon(game.youmonst?.data) && !rn2(13) && !u.uwep
        && umon !== PM_AMOROUS_DEMON && umon !== PM_BALROG) {
        await demonpet();
        return M_ATTK_MISS;
    }
    await damageum_adtyping(mattk, mdef, mhm);
    if (mhm.done) return mhm.hitflags | 0;
    mdef.mstrategy = (mdef.mstrategy | 0) & ~STRAT_WAITFORU;
    mdef.mhp = (mdef.mhp | 0) - (mhm.damage | 0);
    if ((mdef.mhp | 0) < 1) {
        mdef.mhp = 0;
        const aatyp = mattk.aatyp | 0;
        // C uhitm.c damageum :4866–4880 — ternary uwep (not hmon_hitmon TRUE-only)
        if (aatyp === AT_WEAP || aatyp === AT_CLAW) {
            game.mkcorpstat_norevive = troll_baned(mdef, u.uwep) ? true : false;
        }
        if (mdef.mtame && !cansee(mdef.mx, mdef.my)) {
            await You_feel('embarrassed for a moment.');
            if (mhm.damage) await xkilled(mdef, XKILL_NOMSG);
        } else if (game.flags?.verbose === false) {
            await pline('You destroy it!');
            if (mhm.damage) await xkilled(mdef, XKILL_NOMSG);
        } else if (mhm.damage) {
            await killed(mdef);
        }
        game.mkcorpstat_norevive = false;
        return M_ATTK_DEF_DIED;
    }
    return M_ATTK_HIT;
}

/**
 * C ref: uhitm.c known_hitum — missum or hmon; flee rn2(25) if survives low.
 * cutworm when wormno && *mhit after Vorpal-converted-miss (oldhp).
 * slice_or_chop is obj.h is_blade||is_axe remembered before hmon.
 */
async function known_hitum(mon, weapon, mhit, rollneeded, armorpenalty, uattk, dieroll) {
    let malive = true;
    /* hmon() might destroy weapon; remember aspect for cutworm */
    const sk = weapon ? (game.objects?.[weapon.otyp]?.oc_skill | 0) : 0;
    const slice_or_chop = !!(weapon && (
        (weapon.oclass === WEAPON_CLASS && sk >= P_DAGGER && sk <= P_SABER)
        || ((weapon.oclass === WEAPON_CLASS || weapon.oclass === TOOL_CLASS)
            && sk === P_AXE)
    ));
    if (!mhit.v) {
        // missum — near-miss flavor when rollneeded+penalty > dieroll
        void (rollneeded + armorpenalty > dieroll);
        await pline(`You miss ${mon_nam(mon)}.`);
        // C missum: if (!helpless(mdef)) wakeup(mdef, TRUE)
        if (!mon.msleeping && mon.mcanmove !== 0) {
            await wakeup(mon, true);
        }
    } else {
        const oldhp = mon.mhp | 0;
        if (!game.u.uconduct) game.u.uconduct = {};
        const oldweaphit = game.u.uconduct.weaphit | 0;
        if (weapon && (weapon.oclass === WEAPON_CLASS
            || game.objects?.[weapon.otyp]?.oc_skill != null)) {
            game.u.uconduct.weaphit = oldweaphit + 1;
        }
        /* C: gn.notonhead = (mx,my) != gb.bhitpos before hmon */
        const bp = game.bhitpos || {};
        game.notonhead = ((mon.mx | 0) !== (bp.x | 0)
            || (mon.my | 0) !== (bp.y | 0));
        malive = await hmon(mon, weapon, HMON_MELEE, dieroll);
        if (malive) {
            // C: !rn2(25) && mhp < mhpmax/2 && !engulfing_u — integer /
            if (!rn2(25)
                && (mon.mhp | 0) < Math.trunc((mon.mhpmax | 0) / 2)
                && !engulfing_u(mon)) {
                // C: monflee(mon, !rn2(3) ? rnd(100) : 0, FALSE, TRUE)
                await monflee(mon, !rn2(3) ? rnd(100) : 0, false, true);
                // C: ustuck release when !uswallow && !sticks — deferred
            }
            /* Vorpal Blade hit converted to miss — could be headless or tail */
            if ((mon.mhp | 0) === oldhp) {
                mhit.v = 0;
                game.u.uconduct.weaphit = oldweaphit;
            }
            if (mon.wormno && mhit.v) {
                await cutworm(mon, bp.x | 0, bp.y | 0, slice_or_chop);
            }
        }
    }
    void uattk;
    return malive;
}

/**
 * C ref: uhitm.c passive_obj — erosion/drain on the hitting object.
 * erode_obj / drain_item bodies deferred; RNG order preserved.
 */
function passive_obj(mon, obj, mattk) {
    const u = game.u || {};
    let weapon = obj;
    let atk = mattk;
    if (!weapon) {
        weapon = (u.twoweap && u.uswapwep && !rn2(2)) ? u.uswapwep : u.uwep;
        if (!weapon && atk?.adtyp === AD_ENCH) weapon = u.uarmg;
        if (!weapon) return;
    }
    if (!atk) {
        let i = 0;
        for (;; i++) {
            if (i >= NATTK) return;
            if (get_mattk(mon, i).aatyp === AT_NONE) break;
        }
        atk = get_mattk(mon, i);
    }
    switch (atk.adtyp | 0) {
    case AD_FIRE:
        if (!rn2(6) && !mon.mcan
            && (mon.mnum ?? mon.data?.mndx ?? -1) !== PM_STEAM_VORTEX) {
            // erode_obj ERODE_BURN deferred
        }
        break;
    case AD_ACID:
        if (!rn2(6)) {
            // erode_obj ERODE_CORRODE deferred
        }
        break;
    case AD_RUST:
    case AD_CORR:
        if (!mon.mcan) {
            // erode_obj deferred
        }
        break;
    case AD_ENCH:
        if (!mon.mcan) {
            // drain_item / Yobjnam2 deferred
        }
        break;
    default:
        break;
    }
}

/**
 * C ref: uhitm.c passive — defender AT_NONE after hero melee.
 * Finds first AT_NONE (incl. NO_ATTK fillers), rolls damage dice, applies
 * even-if-dead effects, then live gate `malive && !mcan && rn2(3)`.
 * Named omissions: full AD_PLYS gaze/cube / ugolemeffects /
 * erode_armor / done_in_by stone / attk_protection detail; dokick callers.
 * D-1095: AD_COLD healmon + split_mon (potion.c via sit.js).
 */
export async function passive(mon, weapon, mhitb, maliveb, aatyp, wep_was_destroyed) {
    if (!mon) return (maliveb ? M_ATTK_HIT : M_ATTK_MISS)
        | (mhitb ? M_ATTK_HIT : M_ATTK_MISS);
    const mhit = mhitb ? M_ATTK_HIT : M_ATTK_MISS;
    let malive = maliveb ? M_ATTK_HIT : M_ATTK_MISS;
    let i = 0;
    for (;; i++) {
        if (i >= NATTK) return malive | mhit;
        if (get_mattk(mon, i).aatyp === AT_NONE) break;
    }
    const mattk = get_mattk(mon, i);
    let tmp;
    if (mattk.damn) tmp = d(mattk.damn | 0, mattk.damd | 0);
    else if (mattk.damd) {
        const mlev = mon.m_lev ?? mon.data?.mlevel ?? 0;
        tmp = d((mlev | 0) + 1, mattk.damd | 0);
    } else tmp = 0;

    const u = game.u || {};
    const Free_action = !!(u.Free_action || u.HFree_action || u.EFree_action);
    const Cold_resistance = !!(u.Cold_resistance || u.HCold_resistance
        || u.ECold_resistance);
    const Fire_resistance = !!(u.Fire_resistance || u.HFire_resistance
        || u.EFire_resistance);
    const Shock_resistance = !!(u.Shock_resistance || u.HShock_resistance
        || u.EShock_resistance);
    const Acid_resistance = !!(u.Acid_resistance || u.HAcid_resistance
        || u.EAcid_resistance);
    const Antimagic = !!(u.Antimagic || u.HAntimagic || u.EAntimagic);
    const Stone_resistance = !!(u.Stone_resistance || u.HStone_resistance
        || u.EStone_resistance);

    switch (mattk.adtyp | 0) {
    case AD_FIRE:
        if (mhitb && !mon.mcan && weapon) {
            if (aatyp === AT_KICK) {
                if (u.uarmf && !rn2(6)) {
                    // erode_obj uarmf burn deferred
                }
            } else if (aatyp === AT_WEAP || aatyp === AT_CLAW
                || aatyp === AT_MAGC || aatyp === AT_TUCH) {
                passive_obj(mon, weapon, mattk);
            }
        }
        break;
    case AD_ACID:
        if (mhitb && rn2(2)) {
            if (game.u?.Blind || !game.flags?.verbose) {
                await pline('You are splashed!');
            } else {
                await pline(`You are splashed by ${mon_nam(mon)}'s acid!`);
            }
            if (!Acid_resistance) {
                losehp(tmp, mon_nam(mon), 2);
            }
            if (!rn2(30)) {
                // erode_armor ERODE_CORRODE deferred
            }
        }
        if (mhitb && weapon) {
            if (aatyp === AT_KICK) {
                if (u.uarmf && !rn2(6)) {
                    // erode_obj uarmf corrode deferred
                }
            } else if (aatyp === AT_WEAP || aatyp === AT_CLAW
                || aatyp === AT_MAGC || aatyp === AT_TUCH) {
                passive_obj(mon, weapon, mattk);
            }
        }
        exercise(A_STR, false);
        break;
    case AD_STON:
        if (mhitb) {
            // attk_protection / done_in_by STONING deferred; no RNG here
            void Stone_resistance;
            void wep_was_destroyed;
        }
        break;
    case AD_RUST:
    case AD_CORR:
        if (mhitb && !mon.mcan && weapon) {
            if (aatyp === AT_KICK) {
                if (u.uarmf) {
                    // erode_obj uarmf deferred
                }
            } else if (aatyp === AT_WEAP || aatyp === AT_CLAW
                || aatyp === AT_MAGC || aatyp === AT_TUCH) {
                passive_obj(mon, weapon, mattk);
            }
        }
        break;
    case AD_MAGM:
        if (Antimagic) {
            await pline('A hail of magic missiles narrowly misses you!');
        } else {
            await pline('You are hit by magic missiles appearing from thin air!');
            losehp(tmp, mon_nam(mon), 2);
        }
        break;
    case AD_ENCH:
        if (mhitb) {
            if (aatyp === AT_KICK) {
                if (!weapon) break;
            } else if (aatyp === AT_BITE || aatyp === AT_BUTT
                || (aatyp >= AT_STNG && aatyp < AT_WEAP)) {
                break;
            }
            passive_obj(mon, weapon, mattk);
        }
        break;
    default:
        break;
    }

    // Live-only passives — C always burns rn2(3) even for NO_ATTK AD_PHYS
    if (maliveb && !mon.mcan && rn2(3)) {
        switch (mattk.adtyp | 0) {
        case AD_PLYS: {
            const mndx = mon.mnum ?? mon.data?.mndx ?? -1;
            if (mndx === PM_FLOATING_EYE) {
                // canseemon stub: present on map (full canspotmon deferred)
                const see = !!(mon.mx != null);
                if (!see) break;
                if (mon.mcansee) {
                    if (u.Hallucination && rn2(4)) {
                        await pline(`${mon_nam(mon)} looks ${!rn2(2) ? '' : 'rather '}${!rn2(2) ? 'numb' : 'stupefied'}.`);
                    } else if (Free_action) {
                        await pline(`You momentarily stiffen under ${mon_nam(mon)}'s gaze!`);
                    } else {
                        await pline(`You are frozen by ${mon_nam(mon)}'s gaze!`);
                        nomul((acurr(A_WIS) > 12 || rn2(4)) ? -tmp : -127);
                    }
                } else {
                    await pline(`${mon_nam(mon)} cannot defend itself.`);
                    if (!rn2(500)) {
                        // change_luck(-1) deferred
                    }
                }
            } else if (Free_action) {
                await pline('You momentarily stiffen.');
            } else {
                await pline(`You are frozen by ${mon_nam(mon)}!`);
                nomul(-tmp);
                exercise(A_DEX, false);
            }
            break;
        }
        case AD_COLD:
            if (monnear(mon, u.ux, u.uy)) {
                if (Cold_resistance) {
                    await pline('You feel a mild chill.');
                    break;
                }
                await pline('You are suddenly very cold!');
                losehp(tmp, mon_nam(mon), 2);
                // C uhitm.c:6078–6082 healmon then split_mon on mhpmax gate
                healmon(mon, Math.trunc((tmp + rn2(2)) / 2),
                    Math.trunc((tmp + 1) / 2));
                if ((mon.mhpmax | 0) > (((mon.m_lev | 0) + 1) * 8)) {
                    const { split_mon } = await import('./sit.js');
                    await split_mon(mon, game.youmonst);
                }
            }
            break;
        case AD_STUN:
            if (!u.Stunned) {
                // make_stunned(tmp, TRUE) deferred
                u.Stunned = tmp | 0;
            }
            break;
        case AD_FIRE:
            if (monnear(mon, u.ux, u.uy)) {
                if (Fire_resistance) {
                    await pline('You feel mildly warm.');
                    break;
                }
                await pline('You are suddenly very hot!');
                losehp(tmp, mon_nam(mon), 2);
            }
            break;
        case AD_ELEC:
            if (Shock_resistance) {
                await pline('You feel a mild tingle.');
                break;
            }
            await pline('You are jolted with electricity!');
            losehp(tmp, mon_nam(mon), 2);
            break;
        default:
            break;
        }
    }
    void AD_PHYS;
    void M_ATTK_DEF_DIED;
    return malive | mhit;
}

/**
 * C ref: uhitm.c mon_maybe_unparalyze — rn2(10) thaw when !mcanmove.
 * dokick poly AT_KICK loop calls this once before the NATTK walk (D-1310).
 */
export function mon_maybe_unparalyze(mtmp) {
    if (!mtmp?.mcanmove) {
        if (!rn2(10)) {
            mtmp.mcanmove = 1;
            mtmp.mfrozen = 0;
        }
    }
}

/**
 * C ref: uhitm.c double_punch — second bare-hand hit when skill > P_BASIC.
 */
function double_punch() {
    const skl_lvl = P_SKILL(P_BARE_HANDED_COMBAT);
    const u = game.u || {};
    if (!u.uwep && !u.uarms && skl_lvl > P_BASIC) {
        return (skl_lvl - P_BASIC) > rn2(5);
    }
    return false;
}

/** C gt.twohits — copied into hmon strength/silver arms when those land. */
let gt_twohits = 0;

/**
 * C ref: uhitm.c hitum — find_roll_to_hit, rnd(20), known_hitum, passive;
 *         twoweapon / double_punch second swing. Cleaver hitum_cleave deferred.
 */
async function hitum(mon, uattk) {
    const u = game.u || {};
    const uwep = u.uwep || null;
    const wepbefore = uwep;
    const secondwep = u.twoweap ? (u.uswapwep || null) : null;
    const attk_count = { v: 0 };
    const role_roll_penalty = { v: 0 };
    const x = (u.ux | 0) + (u.dx | 0);
    const y = (u.uy | 0) + (u.dy | 0);
    const oldumort = u.umortality | 0;

    // Cleaver: u_wield_art(ART_CLEAVER) && !twoweap → hitum_cleave deferred

    // 0: single; 1: first of two — hmon copies into hmd.twohits
    gt_twohits = (uwep ? !!u.twoweap : double_punch()) ? 1 : 0;

    let tmp = find_roll_to_hit(mon, uattk.aatyp, uwep, attk_count, role_roll_penalty);
    mon_maybe_unparalyze(mon);
    let dieroll = rnd(20);
    let mhit = { v: (tmp > dieroll || !!u.uswallow) ? 1 : 0 };
    if (tmp > dieroll) exercise(A_DEX, true);

    let malive = await known_hitum(
        mon, uwep, mhit, tmp, role_roll_penalty.v, uattk, dieroll,
    );
    const wep_was_destroyed = !!(wepbefore && !u.uwep);
    await passive(mon, u.uwep || null, !!mhit.v, !!malive, AT_WEAP,
        wep_was_destroyed);

    // Second swing: twoweapon or skilled bare-hand; skip if Stormbringer
    // override, paralyzed, life-saved, or target dead/moved.
    if (gt_twohits && !(game.override_confirmation
        || (game.multi | 0) < 0
        || (u.umortality | 0) > oldumort
        || !malive
        || m_at(x, y) !== mon)) {
        gt_twohits = 2;
        tmp = find_roll_to_hit(
            mon, uattk.aatyp, u.uswapwep || null, attk_count, role_roll_penalty,
        );
        mon_maybe_unparalyze(mon);
        dieroll = rnd(20);
        mhit = { v: (tmp > dieroll || !!u.uswallow) ? 1 : 0 };
        malive = await known_hitum(
            mon, secondwep, mhit, tmp, role_roll_penalty.v, uattk, dieroll,
        );
        if (mhit.v) {
            await passive(mon, secondwep, !!mhit.v, !!malive, AT_WEAP,
                !!(secondwep && !u.uswapwep));
        }
    }
    gt_twohits = 0;
    return malive;
}

/**
 * C ref: mondata.h hug_throttles — rope golem form uses hands to choke.
 * C: (ptr) == &mons[PM_ROPE_GOLEM] via &mons[u.umonnum].
 */
function hug_throttles_umon() {
    return (game.u?.umonnum | 0) === PM_ROPE_GOLEM;
}

/**
 * C ref: mondata.c can_be_strangled — headless immune; mindless+breathless
 * immune. AT_HUGS mdef is never youmonst; hero arm kept for C shape.
 */
function can_be_strangled(mon) {
    if (!has_head(mon?.data)) return false;
    let nobrainer;
    let nonbreathing;
    if (mon === game.youmonst) {
        nobrainer = mindless(game.youmonst?.data);
        const u = game.u || {};
        nonbreathing = !!(u.Breathless || u.HBreathless || u.EBreathless
            || u.HMagical_breathing || u.EMagical_breathing
            || breathless(game.youmonst?.data));
    } else {
        nobrainer = mindless(mon.data);
        const mamul = which_armor(mon, W_AMUL);
        nonbreathing = !!(breathless(mon.data)
            || (mamul && (mamul.otyp | 0) === AMULET_OF_MAGICAL_BREATHING));
    }
    return !nobrainer || !nonbreathing;
}

/**
 * C ref: mondata.c sticks — AD_STCK, non-engulf AD_WRAP, or AT_HUGS.
 * Local clone (C AT_HUGS=7 / AT_ENGL=11). Do not import monmove.js sticks.
 */
function sticks(ptr) {
    const slots = ptr?.mattk || [];
    let hasStck = false;
    let hasWrap = false;
    let hasEngl = false;
    let hasHugs = false;
    for (const a of slots) {
        const ad = a?.adtyp | 0;
        const aa = a?.aatyp | 0;
        if (ad === AD_STCK) hasStck = true;
        if (ad === AD_WRAP) hasWrap = true;
        if (aa === AT_ENGL) hasEngl = true;
        if (aa === AT_HUGS) hasHugs = true;
    }
    return !!(hasStck || (hasWrap && !hasEngl) || hasHugs);
}

/**
 * C ref: mon.c set_ustuck — bind / clear hero grab; clear swallow on null.
 * Local clone (mhitu.js export; avoid uhitm↔mhitu cycle).
 */
function set_ustuck(mtmp) {
    const u = game.u || (game.u = {});
    if (!game.flags) game.flags = {};
    game.flags.botl = true;
    u.ustuck = mtmp || null;
    if (!u.ustuck) {
        u.uswallow = 0;
        u.uswldtim = 0;
    }
}

/**
 * C ref: polyself.c uunstick — release u.ustuck then pline.
 */
async function uunstick() {
    const mtmp = game.u?.ustuck;
    if (!mtmp) return;
    set_ustuck(null);
    await pline(`${Monnam(mtmp)} is no longer in your clutches.`);
}

/**
 * C ref: mhitm.c failed_grab — unsolid / notonhead grab miss (no RNG).
 * hmonas magr is always youmonst so the vis||youmonst arm always plines.
 * Named omit: some_mon_nam tail (s_suffix(mon_nam)+" tail" like mhitm).
 */
async function failed_grab_you(mdef, mattk) {
    if (!(unsolid(mdef?.data) || game.notonhead)
        || !((mattk.aatyp | 0) === AT_HUGS
            || (mattk.adtyp | 0) === AD_WRAP
            || (mattk.adtyp | 0) === AD_STCK
            || (mattk.adtyp | 0) === AD_DGST)) {
        return false;
    }
    const verb = (mattk.adtyp | 0) === AD_DGST ? 'gulp'
        : (mattk.adtyp | 0) === AD_STCK ? 'adhere' : 'grab';
    let mdefnam;
    if (!game.notonhead) {
        mdefnam = mon_nam(mdef);
    } else {
        const n = mon_nam(mdef);
        mdefnam = `${/s$/i.test(n) ? `${n}'` : `${n}'s`} tail`;
    }
    await pline(
        `Your ${verb} attempt ${
            game.notonhead ? 'fails to hold' : 'passes right through'
        } ${mdefnam}!`,
    );
    return true;
}

/**
 * C ref: uhitm.c hmonas AT_HUGS :5671–5759.
 * Returns true when C `continue`s (bypass passive). Mutates sum[i].
 */
async function hmonas_hugs(mon, mattk, i, sum) {
    const u = game.u || {};
    const byhand = hug_throttles_umon();
    let unconcerned = byhand && !can_be_strangled(mon);

    if (sticks(mon.data) || u.uswallow || game.notonhead
        || (byhand && (u.uwep || !has_head(mon.data)))) {
        if (byhand && u.uwep && u.ustuck
            && !(sticks(u.ustuck.data) || u.uswallow)) {
            await uunstick();
        }
        return true;
    }
    await wakeup(mon, true);
    const silverhit = { v: 0 };
    const armask = byhand
        ? (W_ARMG | W_RINGL | W_RINGR)
        : (W_ARMC | W_ARM | W_ARMU);
    const specialdmg = special_dmgval(game.youmonst, mon, armask, silverhit);
    if (unconcerned) {
        // C copies onto alt_attk; JS get_mattk already returns a copy
        mattk.damn = 1;
        mattk.damd = 1;
        if (specialdmg || mindless(mon.data)
            || (mon.mhp | 0) <= 1 + Math.max(u.udaminc | 0, 1)) {
            unconcerned = false;
        }
    }
    if ((mon.mnum ?? mon.data?.mndx) === PM_SHADE) {
        const verb = byhand ? 'grasp' : 'hug';
        if (specialdmg) {
            await pline(`You ${verb} ${mon_nam(mon)}${exclam(specialdmg)}`);
            if (silverhit.v && game.flags?.verbose !== false) {
                await silver_sears(game.youmonst, mon, silverhit.v);
            }
            sum[i] = await damageum(mon, mattk, specialdmg);
        } else {
            await pline(
                `Your ${verb} passes harmlessly through ${mon_nam(mon)}.`,
            );
        }
        return false;
    }
    if (await failed_grab_you(mon, mattk)) return false;
    if (mon === u.ustuck) {
        await pline(`${Monnam(mon)} is being ${
            byhand ? 'throttled' : 'crushed'
        }${unconcerned ? " but doesn't seem concerned" : ''}.`);
        if (silverhit.v && game.flags?.verbose !== false) {
            await silver_sears(game.youmonst, mon, silverhit.v);
        }
        sum[i] = await damageum(mon, mattk, specialdmg);
    } else if (i >= 2 && (sum[i - 1] > M_ATTK_MISS)
        && (sum[i - 2] > M_ATTK_MISS)) {
        if (u.ustuck && u.ustuck !== mon) await uunstick();
        await pline(`You grab ${mon_nam(mon)}!`);
        set_ustuck(mon);
        if (silverhit.v && game.flags?.verbose !== false) {
            await silver_sears(game.youmonst, mon, silverhit.v);
        }
        sum[i] = await damageum(mon, mattk, specialdmg);
    }
    return false;
}

/**
 * C ref: uhitm.c explum :4891–4928.
 * Hero exploding at mdef, or at nothing (forcefight) when mdef is null.
 * Always rolls d(damn,damd) then wake_nearto(7*7). fight_empty null-mdef
 * caller is D-1265. Named omit: explmm.
 */
export async function explum(mdef, mattk) {
    const tmp = d(mattk.damn | 0, mattk.damd | 0);
    const ad = mattk.adtyp | 0;
    const u = game.u || {};

    switch (ad) {
    case AD_BLND:
        if (mdef && !resists_blnd_mon(mdef)) {
            await pline(`${Monnam(mdef)} is blinded by your flash of light!`);
            mdef.mblinded = Math.min((mdef.mblinded | 0) + tmp, 127);
            mdef.mcansee = 0;
        }
        break;
    case AD_HALU:
        if (mdef && haseyes(mdef.data) && mdef.mcansee) {
            await pline(`${Monnam(mdef)} is affected by your flash of light!`);
            mdef.mconf = 1;
        }
        break;
    case AD_COLD:
    case AD_FIRE:
    case AD_ELEC:
        /* C: player-caused blast is +20..+29 so you_exploding (type >= 0). */
        await explode(
            u.ux | 0,
            u.uy | 0,
            (ad - 1) + 20,
            tmp,
            MON_EXPLODE,
            adtyp_to_expltype(ad),
        );
        if (mdef && (mdef.mhp | 0) < 1) {
            return M_ATTK_DEF_DIED;
        }
        break;
    default:
        break;
    }
    await wake_nearto(u.ux | 0, u.uy | 0, 7 * 7);
    return M_ATTK_HIT;
}

/** C mondata.h digests/enfolds — AT_ENGL + AD_DGST/AD_WRAP. Local: mhitu cycles. */
function engl_ad(ptr, ad) {
    return !!(ptr?.mattk || []).some((a) => (a.aatyp | 0) === AT_ENGL
        && (a.adtyp | 0) === ad);
}
function he_prop(flat, H, E, uprop) {
    const u = game.u || {};
    if (u[flat] || u[H] || u[E]) return true;
    const p = uprop != null ? u.uprops?.[uprop] : null;
    return !!(p?.intrinsic || p?.extrinsic);
}
function Invisible_you() {
    const u = game.u || {};
    const invis = !!(u.Invis
        || (((u.HInvis | 0) || (u.EInvis | 0)) && !(u.BInvis | 0)));
    return invis && !((u.HSee_invisible | 0) || (u.ESee_invisible | 0)
        || u.See_invisible);
}

/** C mondata.c resists_* — mresists|mextrinsics|mintrinsics. */
function resists_elem_mon(mon, bit) {
    const bits = (mon?.data?.mresists | 0) | (mon?.mextrinsics | 0)
        | (mon?.mintrinsics | 0);
    return !!(bits & bit);
}

/** C mon.c mlifesaver + mthrowu.c m_useup. */
function mlifesaver_you(mon) {
    if (!mon?.data) return null;
    if (!nonliving(mon.data) || is_vampshifter(mon)) {
        const otmp = which_armor(mon, W_AMUL);
        if (otmp && (otmp.otyp | 0) === AMULET_OF_LIFE_SAVING) return otmp;
    }
    return null;
}
function m_useup_you(mon, obj) {
    if (!mon || !obj) return;
    if ((obj.quan | 0) > 1) { obj.quan = (obj.quan | 0) - 1; return; }
    if (mon.minvent === obj) { mon.minvent = obj.nobj || null; return; }
    for (let p = mon.minvent; p; p = p.nobj) {
        if (p.nobj === obj) { p.nobj = obj.nobj || null; break; }
    }
}

/** C mhitm.c xdrainenergym; mon.c golemeffects flesh/iron heal (MSLOW named). */
async function xdrainenergym(mon, givemsg) {
    if ((mon.mspec_used | 0) < 20
        && (attacktype_aatyp(mon.data, AT_MAGC)
            || attacktype_aatyp(mon.data, AT_BREA))) {
        mon.mspec_used = (mon.mspec_used | 0) + d(2, 2);
        if (givemsg) await pline_mon(mon, `${Monnam(mon)} seems lethargic.`);
    }
}
async function golemeffects_you(mon, damtype, dam) {
    const mndx = mon?.data?.mndx ?? mon?.mnum ?? -1;
    let heal = 0;
    if (mndx === PM_FLESH_GOLEM && (damtype | 0) === AD_ELEC) {
        heal = Math.trunc(((dam | 0) + 5) / 6);
    } else if (mndx === PM_IRON_GOLEM && (damtype | 0) === AD_FIRE) {
        heal = dam | 0;
    } else return;
    if (heal && healmon(mon, heal, 0) && cansee(mon.mx, mon.my)) {
        await pline_mon(mon, `${Monnam(mon)} seems healthier.`);
    }
}

/** C mhitm.c engulf_target — youmonst magr (uatk / !udef). */
function engulf_blocked_you(x, y, whirlyPtr) {
    const lev = game.level?.at?.(x, y);
    if (!lev) return true;
    const typ = lev.typ | 0;
    const door = !!(IS_DOOR(typ) && ((lev.doormask || 0) & (D_CLOSED | D_LOCKED)));
    return !!(IS_OBSTRUCTED(typ) || door || IS_TREE(typ)
        || (typ === IRONBARS && !is_whirly(whirlyPtr)));
}
function engulf_target_you(mdef) {
    const magr = game.youmonst;
    const u = game.u || {};
    if (!magr?.data || !mdef?.data) return false;
    if ((mdef.data.msize | 0) >= MZ_HUGE
        || ((magr.data.msize | 0) < (mdef.data.msize | 0)
            && !is_whirly(magr.data))) return false;
    if (mdef.mtrapped || magr.mtrapped) return false;
    if (!passes_walls(mdef.data)
        && engulf_blocked_you(mdef.mx | 0, mdef.my | 0, magr.data)) return false;
    if (!he_prop('Passes_walls', 'HPasses_walls', 'EPasses_walls', PASSES_WALLS)
        && engulf_blocked_you(u.ux | 0, u.uy | 0, mdef.data)) return false;
    return true;
}

/** C uhitm.c start_engulf :4931 / end_engulf :4949. */
async function start_engulf(mdef) {
    const u = game.u || {};
    const ym = game.youmonst || {};
    const u_digest = engl_ad(ym.data, AD_DGST);
    if (!Invisible_you()) {
        map_location(u.ux | 0, u.uy | 0, true);
        tmp_at(DISP_ALWAYS, mon_glyph(ym));
        tmp_at(mdef.mx | 0, mdef.my | 0);
    }
    const how = u_digest ? 'swallow' : engl_ad(ym.data, AD_WRAP) ? 'enclose' : 'engulf';
    await pline(`You ${how} ${mon_nam(mdef)}${u_digest ? ' whole' : ''}!`);
    await nh_delay_output();
    await nh_delay_output();
}
function end_engulf() {
    if (!Invisible_you()) {
        tmp_at(DISP_END, 0);
        newsym(game.u?.ux | 0, game.u?.uy | 0);
    }
}

/**
 * C ref: uhitm.c gulpum :4958–5194 — poly'd hero engulfs a monster.
 * Instant (not multi-move). d() then engulf_target then stuffed/uswallow
 * gate. Await vampshifter `newcham(..., NO_NC_FLAGS)` so unleash /
 * Elbereth finish before the expel pline (D-1648; C `:4992`).
 * Named omit: visor can_blnd; gulpmu invent snuff.
 */
export async function gulpum(mdef, mattk) {
    const u = game.u || {};
    const ym = game.youmonst || {};
    let dam = d(mattk.damn | 0, mattk.damd | 0);
    const u_digest = engl_ad(ym.data, AD_DGST);
    const u_enfold = engl_ad(ym.data, AD_WRAP);
    const pd = mdef.data;
    const pdn = pd?.mndx ?? mdef.mnum ?? -1;
    const expel_verb = u_digest ? 'regurgitate' : u_enfold ? 'release' : 'expel';
    const engl_verb = u_digest ? 'swallow' : u_enfold ? 'enclose' : 'engulf';

    if (!engulf_target_you(mdef)) return M_ATTK_MISS;

    if (!(u_digest && (u.uhunger | 0) >= 1500) && !u.uswallow) {
        if (!flaming(ym.data)) {
            const { snuff_lit } = await import('./apply.js');
            for (let otmp = mdef.minvent; otmp; otmp = otmp.nobj) {
                await snuff_lit(otmp);
            }
        }

        if (is_vampshifter(mdef) && await newcham(mdef, mons(mdef.cham), 0)) {
            await pline(`You ${engl_verb} it, then ${expel_verb} it.`);
            if (canspotmon(mdef)) {
                await pline(`It turns into ${x_monnam(mdef, ARTICLE_A, null,
                    (SUPPRESS_NAME | SUPPRESS_IT | SUPPRESS_INVISIBLE), false)}.`);
            } else {
                map_invisible(mdef.mx, mdef.my);
            }
            return M_ATTK_HIT;
        }

        const fatal_gulp = (touch_petrifies(pd)
            && !he_prop('Stone_resistance', 'HStone_resistance', 'EStone_resistance'))
            || ((mattk.adtyp | 0) === AD_DGST
                && (is_rider(pd) || (pdn === PM_MEDUSA
                    && !he_prop('Stone_resistance', 'HStone_resistance', 'EStone_resistance'))));

        if ((mattk.adtyp | 0) === AD_DGST
            && (!he_prop('Slow_digestion', 'HSlow_digestion', 'ESlow_digestion', SLOW_DIGESTION)
                || fatal_gulp)) {
            const { eating_conducts } = await import('./eat.js');
            eating_conducts(pd);
        }

        if (fatal_gulp && !is_rider(pd)) {
            let mnam = pmname(pd, mdef.female ? FEMALE : MALE);
            if (!type_is_pname(pd)) mnam = an(mnam);
            await pline(`You ${u_digest ? 'englut' : 'engulf'} ${mon_nam(mdef)}.`);
            const kbuf = `${u_digest ? 'swallowing' : u_enfold ? 'enclosing' : 'engulfing'} ${mnam}${u_digest ? ' whole' : ''}`;
            const { instapetrify } = await import('./trap.js');
            await instapetrify(kbuf);
        } else {
            await start_engulf(mdef);
            switch (mattk.adtyp | 0) {
            case AD_DGST: {
                if (is_rider(pd)) {
                    await pline('Unfortunately, digesting any of it is fatal.');
                    end_engulf();
                    if (!game.killer) game.killer = { name: '', format: 0 };
                    game.killer.name = `unwisely tried to eat ${pmname(pd, mdef.female ? FEMALE : MALE)}`;
                    game.killer.format = NO_KILLER_PREFIX;
                    const { done } = await import('./end.js');
                    await done(DIED);
                    return M_ATTK_MISS; /* lifesaved */
                }
                if (he_prop('Slow_digestion', 'HSlow_digestion', 'ESlow_digestion', SLOW_DIGESTION)) {
                    dam = 0;
                    break;
                }
                const saver = mlifesaver_you(mdef);
                if (saver) m_useup_you(mdef, saver);
                const { newuhs } = await import('./eat.js');
                newuhs(false);
                game.mswallower = ym;
                await xkilled(mdef, XKILL_GIVEMSG | XKILL_NOCORPSE);
                if ((mdef.mhp | 0) >= 1) {
                    await pline(`You hurriedly regurgitate the sizzling in your ${body_part(STOMACH)}.`);
                } else {
                    let tmp = 1 + ((pd.cwt | 0) >> 8);
                    const mv = game.mvitals?.[pdn]?.mvflags ?? 0;
                    if (await corpse_chance(mdef, ym, true) && !(mv & G_NOCORPSE)) {
                        u.uhunger = (u.uhunger | 0) + Math.trunc(((pd.cnutrit | 0) + 1) / 2);
                    } else tmp = 0;
                    let digest_msg = `You totally digest ${mon_nam(mdef)}.`;
                    if (tmp !== 0) {
                        await pline(`You digest ${mon_nam(mdef)}.`);
                        if (he_prop('Slow_digestion', 'HSlow_digestion', 'ESlow_digestion', SLOW_DIGESTION)) tmp *= 2;
                        nomul(-tmp);
                        game.multi_reason = 'digesting something';
                        game.nomovemsg = digest_msg;
                        game.corpsenm_digested = pdn;
                        game.afternmv = (await import('./eat.js')).Finish_digestion;
                    } else await pline(digest_msg);
                    if (pdn === PM_GREEN_SLIME) {
                        digest_msg = `${The(pmname(pd, mdef.female ? FEMALE : MALE))} isn't sitting well with you.`;
                        if (tmp !== 0) game.nomovemsg = digest_msg;
                        if (!he_prop('Unchanging', 'HUnchanging', 'EUnchanging')) {
                            await (await import('./potion.js')).make_slimed(5, null);
                        }
                    } else exercise(A_CON, true);
                }
                game.mswallower = null;
                end_engulf();
                return M_ATTK_DEF_DIED;
            }
            case AD_PHYS:
                if ((ym.data?.mndx ?? ym.mnum) === PM_FOG_CLOUD) {
                    await pline(`${Monnam(mdef)} is laden with your moisture.`);
                    if ((breathless(pd) || amphibious(pd)) && !flaming(pd)) {
                        dam = 0;
                        await pline(`${Monnam(mdef)} seems unharmed.`);
                    }
                } else {
                    await pline(`${Monnam(mdef)} is ${engl_ad(ym.data, AD_WRAP) ? 'being squashed' : 'pummeled with your debris'}!`);
                }
                break;
            case AD_ACID:
                await pline(`${Monnam(mdef)} is covered with your goo!`);
                if (resists_elem_mon(mdef, MR_ACID)) {
                    await pline(`It seems harmless to ${mon_nam(mdef)}.`);
                    dam = 0;
                }
                break;
            case AD_BLND:
                if (can_blnd(ym, mdef, mattk.aatyp | 0, null)) {
                    if (mdef.mcansee) await pline(`${Monnam(mdef)} can't see in there!`);
                    mdef.mcansee = 0;
                    dam += mdef.mblinded | 0;
                    if (dam > 127) dam = 127;
                    mdef.mblinded = dam;
                }
                dam = 0;
                break;
            case AD_ELEC:
            case AD_COLD:
            case AD_FIRE: {
                const ad = mattk.adtyp | 0;
                const bit = ad === AD_ELEC ? MR_ELEC : ad === AD_COLD ? MR_COLD : MR_FIRE;
                if (!rn2(2)) { dam = 0; break; }
                if (ad === AD_ELEC) {
                    await pline(`The air around ${mon_nam(mdef)} crackles with electricity.`);
                }
                if (resists_elem_mon(mdef, bit)) {
                    await pline(`${Monnam(mdef)} ${
                        ad === AD_ELEC ? 'seems unhurt.'
                            : ad === AD_COLD ? 'seems mildly chilly.'
                                : 'seems mildly hot.'
                    }`);
                    dam = 0;
                } else if (ad !== AD_ELEC) {
                    await pline(`${Monnam(mdef)} ${
                        ad === AD_COLD ? 'is freezing to death!' : 'is burning to a crisp!'
                    }`);
                }
                await golemeffects_you(mdef, ad, dam);
                break;
            }
            case AD_DREN:
                if (!rn2(4)) await xdrainenergym(mdef, true);
                dam = 0;
                break;
            default:
                break;
            }
            end_engulf();
            mdef.mhp = (mdef.mhp | 0) - dam;
            if ((mdef.mhp | 0) < 1) {
                await killed(mdef);
                if ((mdef.mhp | 0) < 1) return M_ATTK_DEF_DIED;
            }
            await pline(`You ${expel_verb} ${mon_nam(mdef)}!`);
            if ((he_prop('Slow_digestion', 'HSlow_digestion', 'ESlow_digestion', SLOW_DIGESTION)
                || is_animal(ym.data)) && u_digest) {
                await pline(
                    `Obviously, you didn't like ${s_suffix(mon_nam(mdef))} taste.`,
                );
            }
        }
    }
    return M_ATTK_MISS;
}

/**
 * C ref: uhitm.c hmonas — poly'd hero attacks as monster.
 * AT_WEAP / weapon-using claw/touch/magc → known_hitum; natural hits → damageum
 * (troll_baned ternary/uwep D-1233). AT_HUGS grab/crush/throttle D-1250
 * (special_dmgval callee; mon_hates_silver = C hates_silver D-1254).
 * AT_EXPL explum + dhit==-1 rehumanize D-1251.
 * AT_ENGL gulpum D-1264 (rnd(20+i); shade surround; zombie/mummy Sick).
 * fight_empty explum(null) D-1265. altwep / uswapwep D-1266 (toggle +
 * originalweapon re-read + passivedone drop_uswapwep). skipdrin AT_TENT
 * AD_DRIN + pit AT_KICK D-1298 (`gs.skipdrin`; `mtrapped_in_pit`).
 * eat_brains D-1306 (uhitm headed). Helmet / m_slips_free / lifsav
 * skipdrin D-1307 (uhitm arm). mattacku AT_TENT melee D-1309.
 * mhitu AD_DRIN D-1329. mhitm AD_DRIN D-1330. mhitu AD_WRAP D-1331.
 * uhitm AD_WRAP m_slips_free D-1348. mhitm wrap brush D-1406.
 * Named: remaining mhitm_ad_*.
 */
export async function hmonas(mon) {
    const u = game.u || {};
    const ym = game.youmonst || {};
    const sum = new Array(NATTK).fill(M_ATTK_MISS);
    let weapon = null;
    let weapon_used = false;
    let altwep = false;
    let multi_weap = 0;
    let dhit = 0;
    const attk_count = { v: 0 };
    const role_roll_penalty = { v: 0 };

    for (let i = 0; i < NATTK; i++) {
        const pre = get_mattk(ym, i, mon);
        if (pre.aatyp === AT_WEAP) multi_weap++;
    }
    gt_twohits = 0;

    // C uhitm.c hmonas `:5451` — [see mattackm]
    game.skipdrin = false;

    for (let i = 0; i < NATTK; i++) {
        if (i > 0) {
            const bp = game.bhitpos || {};
            if (m_at(bp.x, bp.y) !== mon || (mon.mhp | 0) < 1) continue;
        }
        const mattk = get_mattk(ym, i, mon);
        // C `:5464` — skip remaining tentacle-DRIN after skipdrin
        if (game.skipdrin && (mattk.aatyp | 0) === AT_TENT
            && (mattk.adtyp | 0) === AD_DRIN) {
            continue;
        }
        weapon = null;
        let skip_passive = false;
        const aatyp = mattk.aatyp | 0;
        const mlet = ym.data?.mlet;
        const use_wep = aatyp === AT_WEAP
            || (aatyp === AT_CLAW && u.uwep && !cantwield(ym.data) && !weapon_used)
            || (aatyp === AT_TUCH && u.uwep && mlet === 'S_LICH' && !weapon_used)
            || (aatyp === AT_MAGC && !weapon_used
                && (mlet === 'S_KOBOLD' || mlet === 'S_ORC' || mlet === 'S_GNOME'));

        if (use_wep) {
            if (weapon_used && (sum[i - 1] > M_ATTK_MISS)
                && u.uwep && bimanual(u.uwep)) {
                continue;
            }
            weapon_used = true;
            // C: originalweapon = (altwep && uswapwep) ? &uswapwep : &uwep
            let origSlot = (altwep && u.uswapwep) ? 'uswapwep' : 'uwep';
            if (hmonas_toggle_altwep(u)) altwep = !altwep;
            weapon = u[origSlot] || null;
            if (!weapon) origSlot = 'uarmg';
            const tmp = find_roll_to_hit(mon, AT_WEAP, weapon, attk_count,
                role_roll_penalty);
            mon_maybe_unparalyze(mon);
            const dieroll = rnd(20);
            const wep_dhit = (tmp > dieroll || !!u.uswallow) ? 1 : 0;
            if (multi_weap > 1) gt_twohits++;
            const survived = await known_hitum(mon, weapon, { v: wep_dhit }, tmp,
                role_roll_penalty.v, mattk, dieroll);
            // C: weapon = *originalweapon after known_hitum (destroyed → null)
            weapon = u[origSlot] || null;
            if (!survived) {
                sum[i] = M_ATTK_DEF_DIED;
            } else {
                sum[i] = wep_dhit ? M_ATTK_HIT : M_ATTK_MISS;
                // C: worm cut in half → i=NATTK; goto passivedone
                if (m_at((u.ux | 0) + (u.dx | 0), (u.uy | 0) + (u.dy | 0))
                    !== mon) {
                    skip_passive = true;
                } else if (wep_dhit && mattk.adtyp !== AD_SPEL
                    && mattk.adtyp !== AD_PHYS) {
                    sum[i] = await damageum(mon, mattk, 0);
                }
            }
        } else if (aatyp === AT_CLAW || aatyp === AT_TUCH || aatyp === AT_KICK
            || aatyp === AT_BITE || aatyp === AT_STNG || aatyp === AT_BUTT
            || aatyp === AT_TENT) {
            // C `:5558–5560` — pit-trapped poly kick cannot reach
            if (aatyp === AT_KICK && mtrapped_in_pit(game.youmonst)) {
                continue;
            }
            const tmp = find_roll_to_hit(mon, aatyp, null, attk_count,
                role_roll_penalty);
            mon_maybe_unparalyze(mon);
            const dieroll = rnd(20);
            const dhit = (tmp > dieroll || !!u.uswallow) ? 1 : 0;
            if (dhit) {
                if (!u.uswallow) {
                    const compat = could_seduce(ym, mon, mattk);
                    if (compat) {
                        const see = mon.mcansee && haseyes(mon.data);
                        await pline(
                            `You ${see ? 'smile at' : 'talk to'} ${mon_nam(mon)} ${compat === 2 ? 'engagingly' : 'seductively'}.`,
                        );
                        sum[i] = await damageum(mon, mattk, 0);
                    } else if ((mon.mnum ?? mon.data?.mndx) === PM_SHADE) {
                        await wakeup(mon, true);
                        await pline(
                            `Your hit passes harmlessly through ${mon_nam(mon)}.`,
                        );
                        sum[i] = M_ATTK_MISS;
                    } else {
                        await wakeup(mon, true);
                        if (aatyp === AT_TENT) {
                            await pline(`Your tentacles suck ${mon_nam(mon)}.`);
                        } else {
                            let verb = 'hit';
                            if (aatyp === AT_TUCH) verb = 'touch';
                            else if (aatyp === AT_KICK) verb = 'kick';
                            else if (aatyp === AT_BITE) verb = 'bite';
                            else if (aatyp === AT_STNG) verb = 'sting';
                            else if (aatyp === AT_BUTT) verb = 'head butt';
                            await pline(`You ${verb} ${mon_nam(mon)}.`);
                        }
                        sum[i] = await damageum(mon, mattk, 0);
                    }
                } else {
                    await wakeup(mon, true);
                    sum[i] = await damageum(mon, mattk, 0);
                }
            } else {
                await missum(mon, mattk, (tmp + role_roll_penalty.v > dieroll));
                sum[i] = M_ATTK_MISS;
            }
        } else if (aatyp === AT_HUGS) {
            if (await hmonas_hugs(mon, mattk, i, sum)) continue;
        } else if (aatyp === AT_EXPL) {
            // C uhitm.c hmonas AT_EXPL :5762–5767 — automatic hit; dhit=-1
            // then rehumanize after the switch (not continue; passive runs).
            dhit = -1;
            await wakeup(mon, true);
            await pline('You explode!');
            sum[i] = await explum(mon, mattk);
        } else if (aatyp === AT_ENGL) {
            // C uhitm.c hmonas AT_ENGL :5769–5794 — rnd(20+i); gulpum.
            const tmp = find_roll_to_hit(mon, aatyp, null, attk_count,
                role_roll_penalty);
            mon_maybe_unparalyze(mon);
            dhit = (tmp > rnd(20 + i)) ? 1 : 0;
            if (dhit) {
                await wakeup(mon, true);
                if ((mon.mnum ?? mon.data?.mndx) === PM_SHADE) {
                    await pline(`Your attempt to surround ${mon_nam(mon)} is harmless.`);
                } else if (!(await failed_grab_you(mon, mattk))) {
                    sum[i] = await gulpum(mon, mattk);
                    if (sum[i] === M_ATTK_DEF_DIED
                        && (mon.data?.mlet === 'S_ZOMBIE' || mon.data?.mlet === 'S_MUMMY')
                        && rn2(5)
                        && !he_prop('Sick_resistance', 'HSick_resistance', 'ESick_resistance')) {
                        await You_feel(`${(u.Sick | 0) ? 'very ' : ''}sick.`);
                        const { mdamageu } = await import('./mhitu.js');
                        await mdamageu(mon, rnd(8));
                    }
                }
            } else {
                await missum(mon, mattk, false);
            }
        } else if (aatyp === AT_NONE || aatyp === AT_BOOM
            || aatyp === AT_MAGC) {
            continue;
        } else if (aatyp === AT_BREA || aatyp === AT_SPIT || aatyp === AT_GAZE) {
            sum[i] = M_ATTK_MISS;
        } else {
            continue;
        }

        if (!skip_passive) {
            if (dhit === -1) {
                u.mh = -1; /* dead in the current form */
                await rehumanize();
            }
            const died = sum[i] === M_ATTK_DEF_DIED || (mon.mhp | 0) < 1;
            await passive(mon, weapon, sum[i] !== M_ATTK_MISS, !died, aatyp,
                false);
            mhitm_knockback(ym, mon, mattk, sum[i], weapon_used);
        }
        // C passivedone: cursed uswapwep drops instead of welding; then
        // DEADMONSTER (deferred until after the drop).
        if (u.uswapwep && weapon === u.uswapwep && weapon.cursed) {
            await drop_uswapwep();
            break;
        }
        if ((mon.mhp | 0) < 1) break;
        if (!Upolyd(u)) break;
        if ((game.multi | 0) < 0) break;
        if (skip_passive) break;
    }
    gt_twohits = 0;
    return (mon.mhp | 0) >= 1;
}

/**
 * C monst.h M_AP_TYPE — mask F_DKNOWN so object_from_map dknown does not
 * skip the sleeping-mimic x_monnam arm.
 */
function that_map_type(mtmp) {
    return (mtmp?.m_ap_type | 0) & M_AP_TYPMASK;
}

/** C youprop.h Blind — (HBlinded||EBlinded)&&!BBlinded. PermaBlind OPTIONS. */
function Blind_that() {
    const u = game.u || {};
    if (u.uroleplay?.blind) return true;
    return !!(((u.HBlinded | 0) || (u.EBlinded | 0)) && !(u.BBlinded | 0));
}

/** C youprop.h Blind_telepat — HTelepat||ETelepat. */
function Blind_telepat_that() {
    const u = game.u || {};
    return !!((u.HTelepat | 0) || (u.ETelepat | 0) || u.Blind_telepat);
}

/** C youprop.h See_invisible — HSee_invisible||ESee_invisible. */
function See_invisible_that() {
    const u = game.u || {};
    return !!(u.See_invisible
        || (u.HSee_invisible | 0)
        || (u.ESee_invisible | 0));
}

/**
 * C obj.h is_plural — quan!=1. Eyes of the Overworld artifact named omit
 * (undiscovered_artifact not live here).
 */
function is_plural_that(otmp) {
    return (otmp?.quan | 0) !== 1;
}

/**
 * C drawing.c defsyms[].explanation — PCHAR desc, not PCHAR2 tilenm
 * (defsym.h PCHAR_DRAWING). Furniture mimics use 1–2/15–16/25–26/33–37
 * (DELPHI S_fountain is D-1556). Ice/pool/trap cmap except
 * S_trapped_chest named.
 */
const DEFSYM_EXPLANATION = [
    'stone', 'wall', 'wall', 'wall', 'wall', 'wall', 'wall', 'wall',
    'wall', 'wall', 'wall', 'wall', 'doorway', 'open door', 'open door',
    'closed door', 'closed door', 'iron bars', 'tree', 'floor of a room',
    'dark part of a room', 'engraving', 'corridor', 'lit corridor',
    'engraving', 'staircase up', 'staircase down', 'ladder up',
    'ladder down', 'branch staircase up', 'branch staircase down',
    'branch ladder up', 'branch ladder down', 'altar', 'grave',
    'opulent throne', 'sink', 'fountain',
];
const S_TRAPPED_CHEST = 73; // defsym.h PCHAR S_trapped_chest

export function defsym_explanation(sym) {
    const s = sym | 0;
    if (s === S_TRAPPED_CHEST) return 'trapped chest';
    return DEFSYM_EXPLANATION[s] || 'furniture';
}

const STRANGE_OBJECT_THAT = objectNames.indexOf('STRANGE_OBJECT');

/**
 * C ref: uhitm.c that_is_a_mimic `:6201–6276`.
 * Fake object names via pager object_from_map (not local mksobj).
 * JS has no integer glyph_at; M_AP_TYPE is the cmap/object/monster
 * discriminator. Named: hallu glyphs; trapped-chest cmap on object
 * mimics (needs glyph_is_cmap); Eyes is_plural; Blind_telepat hallu.
 */
export async function that_is_a_mimic(mtmp, mimic_flags) {
    const generic = 'a monster';
    let fmtbuf = "Wait!  That's %s!";
    let what = null;
    const reveal_it = (mimic_flags & MIM_REVEAL) !== 0;
    const omit_wait = (mimic_flags & MIM_OMIT_WAIT) !== 0;
    const ap = that_map_type(mtmp);

    if (Blind_that()) {
        if (!Blind_telepat_that()) {
            what = generic;
        } else if (ap === M_AP_MONSTER) {
            what = a_monnam(mtmp);
        }
    } else {
        const x = mtmp.mx | 0;
        const y = mtmp.my | 0;
        if (ap === M_AP_FURNITURE) {
            // C: glyph_is_cmap && (M_AP_FURNITURE || trapped-chest object).
            // JS: furniture mappearance is the cmap id (D-1543 S_*).
            // Trapped-chest cmap on M_AP_OBJECT named (needs glyph_is_cmap).
            const expl = defsym_explanation(mtmp.mappearance | 0);
            fmtbuf = `That ${expl} actually is %s!`;
        } else if (ap === M_AP_OBJECT) {
            let fakeobj = false;
            let otmp = null;
            await pager_bind();
            if (_object_from_map) {
                const got = _object_from_map(mtmp.mappearance | 0, x, y);
                fakeobj = !!got?.fakeobj;
                otmp = got?.otmp || null;
            }
            const otmp_name = (otmp && (otmp.otyp | 0) !== STRANGE_OBJECT_THAT)
                ? (is_plural_that(otmp)
                    ? makeplural(simpleonames(otmp))
                    : simpleonames(otmp))
                : 'strange object';
            const those = (otmp && is_plural_that(otmp)) ? 'Those' : 'That';
            const are = otmp ? otense(otmp, 'are') : 'is';
            fmtbuf = `${those} ${otmp_name} ${are} %s!`;
            if (fakeobj && otmp) {
                otmp.where = OBJ_FREE;
            }
        } else if (ap === M_AP_MONSTER) {
            const mndx = mtmp.mappearance | 0;
            if (mndx >= LOW_PM && mndx < NUMMONS) {
                const g = mtmp.female ? FEMALE : MALE;
                const mtmp_name = pmname(mndx, g);
                fmtbuf = `Wait!  That ${mtmp_name} is really %s!`;
            }
        }

        if (mtmp.minvis && !See_invisible_that()) {
            what = generic;
        } else if (that_map_type(mtmp) === M_AP_MONSTER) {
            what = x_monnam(mtmp, ARTICLE_A, null, EXACT_NAME, true);
        } else if (mtmp.data?.mlet === 'S_MIMIC'
            && (that_map_type(mtmp) === M_AP_OBJECT
                || that_map_type(mtmp) === M_AP_FURNITURE)
            && (mtmp.msleeping || mtmp.mfrozen)) {
            what = x_monnam(mtmp, ARTICLE_A, 'sleeping', 0, false);
        } else {
            what = a_monnam(mtmp);
        }
    }

    if (what) {
        const i = (omit_wait && fmtbuf.startsWith('Wait!  ')) ? 7 : 0;
        const rest = fmtbuf.slice(i);
        const pct = rest.indexOf('%s');
        const msg = pct < 0
            ? rest
            : rest.slice(0, pct) + what + rest.slice(pct + 2);
        await pline(msg);
    }
    if (reveal_it) seemimic(mtmp);
}

/**
 * C ref: mondata.c resists_blnd — mon already-blind / noeyes / sleeping;
 * AD_BLND expl/gaze and artifact arms deferred.
 */
function resists_blnd_mon(mtmp) {
    if (!mtmp) return true;
    if (!haseyes(mtmp.data)) return true;
    if (!mtmp.mcansee || (mtmp.mblinded | 0) || mtmp.msleeping) return true;
    return false;
}

/**
 * C ref: uhitm.c light_hits_gremlin — light damage + cry + wake_nearto.
 * Cry/recoil are pline_mon (D-1240); flash_hits_mon awaken/blind stay pline.
 * Named omissions: SetVoice; map_invisible when !canspotmon after hit.
 */
async function light_hits_gremlin(mon, dmg) {
    if (!mon) return;
    const mx = mon.mx | 0;
    const my = mon.my | 0;
    const u = game.u || {};
    const Deaf = !!((u.HDeaf | 0) || (u.EDeaf | 0) || u.uroleplay?.deaf || u.Deaf);
    const dx = (mx) - (u.ux | 0);
    const dy = (my) - (u.uy | 0);
    const dist = dx * dx + dy * dy;
    if (!Deaf && dist <= 90) {
        const half = ((mon.mhp | 0) / 2) | 0;
        await pline_mon(
            mon,
            `${Monnam(mon)} ${
                (dmg | 0) > half ? 'wails in agony' : 'cries out in pain'
            }!`,
        );
    } else if (canseemon(mon)) {
        await pline_mon(mon, `${Monnam(mon)} recoils from the light!`);
    }
    mon.mhp = (mon.mhp | 0) - (dmg | 0);
    await wake_nearto(mx, my, 30);
    if ((mon.mhp | 0) < 1) {
        if (game.context?.mon_moving) {
            await monkilled(mon, null, 10 /* AD_BLND */);
        } else {
            await killed(mon);
        }
    } else if (cansee(mx, my) && !canspotmon(mon)) {
        map_invisible(mx, my);
    }
}

/**
 * C ref: uhitm.c flash_hits_mon — flash/light effect on monster.
 * Envelope: disguised mimic wakeup/seemimic + mhidden_description
 * (D-1554); sleep awaken; blind + flee RNG; gremlin light_hits
 * (cry/recoil pline_mon D-1240); resists_blnd illuminate msgs; unlit
 * More. Awaken/blind/illuminate stay pline like C.
 * Named omit: shieldeff resists_blnd_by_arti. Camera caller wires
 * see_monster_closeup (D-0999).
 * @returns {Promise<number>} 1 if noticeable effect, else 0
 */
export async function flash_hits_mon(mtmp, otmp) {
    if (!mtmp || game.notonhead) return 0;
    const mx = mtmp.mx | 0;
    const my = mtmp.my | 0;
    const lev = game.level?.at(mx, my);
    const useeit = canseemon(mtmp);
    let res = 0;

    if (that_map_type(mtmp) !== M_AP_NOTHING) {
        let whatbuf = '';
        await pager_bind();
        if (_mhidden_description) {
            whatbuf = _mhidden_description(mtmp, MHID_ALTMON);
        }
        // C glyph_at before/after; JS has no integer glyphs — gbuf ch/kind
        const oldCh = lev?.disp_ch;
        const oldKind = lev?.disp_kind;
        await wakeup(mtmp, false); // → seemimic for non-M_AP_MONSTER
        if (lev && (lev.disp_ch !== oldCh || lev.disp_kind !== oldKind)) {
            await pline(`That ${whatbuf} is really ${
                x_monnam(mtmp, mtmp.mtame ? ARTICLE_YOUR : ARTICLE_A,
                    null, 0, false)
            }${mtmp.mtame ? '.' : '!'}`);
            res = 1;
        }
    }

    if (mtmp.msleeping && haseyes(mtmp.data)) {
        mtmp.msleeping = 0;
        if (useeit) {
            await pline(`The flash awakens ${mon_nam(mtmp)}.`);
            res = 1;
        }
    } else if (mtmp.data?.mlet !== 'S_LIGHT') {
        if (!resists_blnd_mon(mtmp)) {
            const tmp = dist2(otmp?.ox | 0, otmp?.oy | 0, mx, my);
            if (useeit) {
                await pline(`${Monnam(mtmp)} is blinded by the flash!`);
                res = 1;
            }
            const mndx = mtmp.data?.mndx ?? mtmp.mnum ?? -1;
            if ((mtmp.mnum | 0) === PM_GREMLIN || mndx === PM_GREMLIN) {
                const amt = (otmp?.otyp | 0) === WAN_LIGHT
                    ? d(1 + (otmp.spe | 0), 4)
                    : rnd(Math.min(mtmp.mhp | 0, 4));
                await light_hits_gremlin(mtmp, amt);
            }
            if ((mtmp.mhp | 0) > 0) {
                if (!game.context?.mon_moving) {
                    setmangry(mtmp, true);
                }
                if (tmp < 9 && !mtmp.isshk && rn2(4)) {
                    await monflee(mtmp, rn2(4) ? rnd(100) : 0, false, true);
                }
                mtmp.mcansee = 0;
                mtmp.mblinded = tmp < 3 ? 0 : rnd(1 + ((50 / tmp) | 0));
            }
        } else if (useeit) {
            // resists_blnd_by_arti shieldeff deferred
            if (game.flags?.verbose !== false) {
                if (lev?.lit) {
                    await pline(`The flash of light shines on ${mon_nam(mtmp)}.`);
                } else {
                    await pline(`${Monnam(mtmp)} is illuminated.`);
                }
                res = 2; // temporary 'message given'
            }
        }
    }
    if (res) {
        if (!lev?.lit) {
            await flush_topl_more(); // display_nhwindow(WIN_MESSAGE, TRUE)
        }
        res &= 1;
    }
    return res & 1;
}

/**
 * C ref: uhitm.c stumble_onto_mimic — reveal + wakeup(FALSE).
 * AD_STCK set_ustuck / map_invisible deferred.
 */
export async function stumble_onto_mimic(mtmp) {
    await that_is_a_mimic(mtmp, MIM_REVEAL);
    await wakeup(mtmp, false);
}

/**
 * C ref: uhitm.c force_attack — temporarily set forcefight then do_attack.
 * pets_too: also forcefight tame (whip uses FALSE).
 */
export async function force_attack(mtmp, pets_too) {
    if (!game.context) game.context = {};
    const save_Forcefight = !!game.context.forcefight;
    if (pets_too || !mtmp?.mtame) game.context.forcefight = true;
    const attacked = await do_attack(mtmp);
    game.context.forcefight = save_Forcefight;
    return attacked;
}

/**
 * C ref: uhitm.c attack_checks — invis Wait + disguised-mimic + peaceful
 * confirm (ParanoidHit). Returns true when the attack attempt is consumed
 * (no hitum). Elbereth / warning-glyph / mundetected hide arms deferred.
 * @param {object} mtmp
 * @param {object|null} [wep] uwep for do_attack; null for kick
 */
export async function attack_checks(mtmp, wep = null) {
    // C: if you're close enough to attack, alert any waiting monster
    // (clears STRAT_CLOSE|WAITFORU even when the attack is later aborted —
    // kick / cancelled peaceful confirm / Wait! all disturb meditation).
    if (mtmp.mstrategy != null) mtmp.mstrategy &= ~STRAT_WAITMASK;

    // C: engulfing_u(mtmp) → allow attack on engulfer (skip Wait!/mimic)
    if (engulfing_u(mtmp)) return false;

    // C: forcefight → return FALSE (allow real attack; skip Wait!)
    if (game.context?.forcefight) return false;

    // C: !canspotmon && !glyph_is_warning && !glyph_is_invisible
    //    && !(!Blind && mundetected && hides_under) → Wait! + map_invisible
    const loc = game.level?.at(mtmp.mx, mtmp.my);
    const Blind = !!(game.u?.Blind || game.u?.ublind
        || (((game.u?.HBlinded | 0) || (game.u?.EBlinded | 0))
            && !(game.u?.BBlinded | 0)));
    if (!canspotmon(mtmp)
        && !glyph_is_invisible(loc)
        && !( !Blind && mtmp.mundetected /* && hides_under deferred */)) {
        // C: "Wait!  There's %s there you can't see!" / something
        await pline("Wait!  There's something there you can't see!");
        map_invisible(mtmp.mx, mtmp.my);
        // mimic AD_STCK ustuck deferred
        await wakeup(mtmp, true);
        return true;
    }

    // Disguised mimic
    if (M_AP_TYPE(mtmp)) {
        // Protection_from_shape_changers / sensemon / glyph_is_invisible→seemimic deferred
        await stumble_onto_mimic(mtmp);
        return true;
    }

    // C: mundetected hide-under / eel reveal arms deferred

    // C: flags.confirm && mpeaceful && !Confusion && !Hallucination && !Stunned
    const u = game.u || {};
    const confirm = game.flags?.confirm !== false; // C opt_out default On
    if (confirm && mtmp.mpeaceful
        && !u.Confusion && !u.Hallucination && !u.Stunned
        && !(u.HStun | 0)) {
        // Intelligent chaotic weapons (Stormbringer) want blood
        if (is_art(wep, ART_STORMBRINGER)) {
            game.override_confirmation = true;
            return false;
        }
        if (canspotmon(mtmp)) {
            const qbuf = `Really attack ${mon_nam(mtmp)}?`;
            const bits = game.flags?.paranoia_bits | 0;
            const be_paranoid = (bits & PARANOID_HIT) !== 0;
            if (!(await paranoid_query(be_paranoid, qbuf))) {
                if (!game.context) game.context = {};
                game.context.move = 0;
                return true;
            }
        }
    }

    return false;
}

/**
 * C ref: mondata.h cantwield — nohands || verysmall.
 * @param {object|null|undefined} ptr
 */
function cantwield(ptr) {
    return nohands(ptr) || verysmall(ptr);
}

/** C ref: role.h Role_if — urole.mnum match. */
function Role_if(pm) {
    return (game.urole?.mnum ?? -1) === pm;
}

/** C ref: objnam.c yname — invent → "your ", else "the ". */
function yname(obj) {
    const carried = (game.invent || []).includes(obj);
    return `${carried ? 'your' : 'the'} ${cxname(obj)}`;
}

/**
 * C ref: uhitm.c do_attack — safemon displace, else attack → hitum.
 * attack_checks: invis Wait + mimic stumble before overexertion.
 * After STR exercise: u_wipe_engr(3) (D-1373; callee D-1051).
 * Leprechaun evade `!rn2(7)` then m_move (D-1381). check_capacity /
 * twoweapon still named.
 */
export async function do_attack(mtmp) {
    if (!mtmp) return false;
    /* C: struct permonst *mdat = mtmp->data; captured before attack_checks. */
    const mdat = mtmp.data;

    // C: is_safemon && !forcefight → try to avoid attacking pets/peacefuls
    if (is_safemon(mtmp) && !game.context?.forcefight) {
        // Stormbringer path omitted
        const loc = game.level?.at(game.u?.ux, game.u?.uy);
        const obstructed = loc && IS_OBSTRUCTED(loc.typ);
        // C: Punished || !rn2(7) || longworm || (obstructed && !passes_walls)
        const foo = !!(game.u?.Punished || !rn2(7)
            || (mtmp.wormno && /* longworm */ false)
            || (obstructed /* && !passes_walls(mtmp) */));
        // inshop check skipped when foo (no RNG); deferred when !foo
        if (foo) {
            // C: !travel && !run && canspotmon && isshk → dopay (deferred)
            // C: monflee(mtmp, rnd(6), FALSE, FALSE) when tame. Does NOT
            // clear context.move — turn still spends so moveloop runs
            // movemon/distfleeck (D-0442). Then stop pline + end_running.
            if (mtmp.mtame) {
                // C: monflee(mtmp, rnd(6), FALSE, FALSE) — includes mon_track_clear
                await monflee(mtmp, rnd(6), false, false);
            }
            // C: Strcpy(buf, y_monnam); buf[0]=highc; You("stop.  %s is in the way!", buf)
            let buf = x_monnam_tame(mtmp);
            if (buf.length) buf = buf.charAt(0).toUpperCase() + buf.slice(1);
            await pline(`You stop.  ${buf} is in the way!`);
            // C: end_running(TRUE) — clear run/travel/mv/multi
            if (!game.context) game.context = {};
            if (game.context.run) game.context.run = 0;
            game.context.travel = 0;
            game.context.travel1 = 0;
            game.context.mv = 0;
            if ((game.multi | 0) > 0) game.multi = 0;
            return true;
        }
        // Frozen / helpless / mmove==0 rn2(6) pline deferred
        // C: else return FALSE → allow swap
        return false;
    }

    // Hostile / forcefight path — C do_attack → attack_checks then hitum
    if (mtmp.mstrategy != null) mtmp.mstrategy &= ~STRAT_WAITMASK;

    // C: gb.bhitpos = u.ux+u.dx, u.uy+u.dy before attack_checks (hmonas contract)
    if (!game.bhitpos) game.bhitpos = {};
    game.bhitpos.x = (game.u?.ux | 0) + (game.u?.dx | 0);
    game.bhitpos.y = (game.u?.uy | 0) + (game.u?.dy | 0);
    // C: gn.notonhead = (bhitpos != mtmp mx/my) — hug/failed_grab (D-1250)
    game.notonhead = (game.bhitpos.x !== (mtmp.mx | 0)
        || game.bhitpos.y !== (mtmp.my | 0));

    // C: attack_checks before overexertion / hitum
    if (await attack_checks(mtmp, game.u?.uwep || null)) {
        return true;
    }

    // check_capacity / overexertion
    if (await overexertion()) {
        return true; // fainted
    }

    // C: u.twoweap && !can_twoweapon() → untwoweapon() deferred

    // C: gu.unweapon → first-melee "begin bashing" reminder (D-0892)
    if (game.gu?.unweapon) {
        game.gu.unweapon = false;
        if (game.flags?.verbose !== false) {
            const uwep = game.u?.uwep || null;
            if (uwep) {
                await pline(`You begin bashing monsters with ${yname(uwep)}.`);
            } else if (!cantwield(game.youmonst?.data)) {
                const verb = Role_if(PM_MONK) ? 'strike' : 'bash';
                const glove = game.u?.uarmg ? 'gloved' : 'bare';
                await pline(
                    `You begin ${ing_suffix(verb)} monsters with your ${glove} ${makeplural(body_part(HAND))}.`,
                );
            }
        }
    }

    exercise(A_STR, true); // you're exercising muscles
    /* C uhitm.c do_attack `:551–553` — after exercise, before leprechaun
       evade / hitum: u_wipe_engr(3) (andrew@orca: no unlimited pick-axe
       attacks). Callee D-1051; no extra RNG with no engraving /
       HEADSTONE / BURN-on-stone / Levitation. D-1373. */
    u_wipe_engr(3);

    /* C uhitm.c do_attack `:555–563` — after wipe, before hitum/hmonas.
       Short-circuit: S_LEPRECHAUN && !mfrozen && !helpless && !mconf
       && mcansee && !rn2(7) && (m_move(mtmp,0)==MMOVE_DIED || left
       u.ux+u.dx,u.uy+u.dy). Stay-put after m_move falls through to
       hitum. Evade returns FALSE so domove stumbles into the cell
       (skips atk_done map_invisible). D-1381. */
    if (mdat?.mlet === 'S_LEPRECHAUN' && !mtmp.mfrozen && !helpless(mtmp)
        && !mtmp.mconf && mtmp.mcansee && !rn2(7)
        && ((await m_move(mtmp, 0)) === MMOVE_DIED
            || mtmp.mx !== (game.u?.ux | 0) + (game.u?.dx | 0)
            || mtmp.my !== (game.u?.uy | 0) + (game.u?.dy | 0))) {
        await pline('You miss wildly and stumble forwards.');
        return false;
    }

    // C: if (Upolyd) hmonas; else hitum(youmonst.data->mattk)
    if (Upolyd(game.u)) {
        await hmonas(mtmp);
    } else {
        const uattk = { aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 1, damd: 6 };
        await hitum(mtmp, uattk);
    }
    if (mtmp.mstrategy != null) mtmp.mstrategy &= ~STRAT_WAITMASK;
    return true;
}

export function mon_at(x, y) {
    return m_at(x, y);
}
