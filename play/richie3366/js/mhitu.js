// mhitu.js — Monster attacks hero (partial).
// C ref: mhitu.c mattacku / hitmu / hitmsg / missmu / mdamageu;
//         uhitm.c mhitm_ad_phys (mhitu bare / weapon subset).

import { game } from './gstate.js';
import { monnear, mnexto, mtrapped_in_pit, wake_nearto } from './mon.js';
import {
    Is_rogue_level, NEED_WEAPON, NEED_HTH_WEAPON, NATTK,
    M_ATTK_MISS, M_ATTK_HIT, M_ATTK_AGR_DIED, M_ATTK_AGR_DONE,
    M_ATTK_DEF_DIED,
    Upolyd, DIED, P_WHIP, NON_PM, XKILL_NOMSG, NEW_MOON,
    DISPLACED, CONFLICT, IS_WATERWALL, RLOC_MSG, RLOC_NOMSG, TIMEOUT, ARTICLE_A,
    LEFT_SIDE, RIGHT_SIDE, LEG, POOL, DROWNING, KILLED_BY_AN,
    MAGICAL_BREATHING, SWIMMING, Is_medusa_level, Is_waterlevel,
    W_ARMS, W_WEP, W_AMUL, W_ARM, BOLT_LIM, STONING, KILLED_BY, M_SEEN_FIRE,
    REFLECTING,
} from './const.js';
import { thrwmu, spitmu, breamu } from './mthrowu.js';
import { find_offensive, use_offensive } from './muse.js';
import { destroy_items } from './zap.js';
import { nomul, stop_occupation, maybe_half_phys, is_pool } from './hack.js';
import { rnd, d, rn2, rn1 } from './rng.js';
import {
    pline, pline_mon, set_msg_xy, mon_visible, canspotmon, map_invisible,
    canseemon, newsym, docrt, swallowed, flush_topl_more, tp_sensemon,
    shieldeff, urgent_pline,
} from './display.js';
import { cansee, couldsee, vision_recalc, vision_off_newsym_gbuf } from './vision.js';
import { Monnam, mon_nam, pmname, hliquid, x_monnam, Hallucination } from './do_name.js';
import { MON_WEP, mon_wield_item, dmgval, hitval, drain_weapon_skill } from './weapon.js';
import { arti_reflects } from './artifact.js';
import { is_pole } from './wield.js';
import { xname, doname, an } from './objnam.js';
import { objectNames, ARMOR_CLASS } from './objects.js';
import { objects_at, is_metallic, is_crackable } from './mkobj.js';
import { steal } from './steal.js';
import { rloc, tele_restrict } from './teleport.js';
import { monflee } from './monmove.js';
import {
    is_orc, is_demon, is_were, is_animal, is_whirly, amorphous, unsolid,
    MZ_HUGE, M1_SEE_INVIS, MALE, FEMALE, haseyes, resists_ston,
    hides_under, is_flyer, thick_skinned, nolimbs, touch_petrifies,
    poly_when_stoned, has_head, slithy, amphibious, breathless, is_swimmer,
    MR_FIRE, MR_COLD, MR_ELEC, MR_ACID,
} from './monsters.js';
import { done_in_by, done } from './end.js';
import { msummon, Inhell } from './minion.js';
import { monsterNames } from './generated/monsters_data.js';
import { A_STR, A_INT, A_DEX, A_CON, acurr, adjattrib, exercise, poisoned } from './attrib.js';
import { xkilled, killed } from './uhitm.js';
import {
    m_seenres, cvt_adtyp_to_mseenres, monstseesu, monstunseesu, m_canseeu,
} from './mondata.js';
import { which_armor } from './worn.js';
import { makeknown } from './invent.js';
import { burn_away_slime } from './timeout.js';
import {
    get_mattk, mhitm_knockback, mhitm_mgc_atk_negated, mattackm,
    could_seduce, mon_poly, mondead,
    AT_NONE, AT_CLAW, AT_KICK, AT_BITE, AT_STNG, AT_TUCH, AT_BUTT, AT_WEAP,
    AT_ENGL, AT_GAZE, AT_SPIT, AT_BREA, AT_EXPL, AT_BOOM, AT_TENT, AT_MAGC,
    AT_HUGS,
    AD_PHYS, AD_FIRE, AD_COLD, AD_ELEC, AD_DRST, AD_DRDX, AD_DRCO, AD_ACID,
    AD_SITM, AD_SEDU, AD_SSEX, AD_POLY, AD_DRIN,
} from './mhitm.js';
import { castmu, buzzmu } from './mcastu.js';
import { rehumanize, polymon } from './polyself.js';
import { set_wounded_legs, burnarmor, ignite_items } from './trap.js';
import { mon_explodes } from './explode.js';
import { make_hallucinated, make_confused, make_stunned } from './potion.js';

/** C ref: monattk.h — passiveum damage types beyond mhitm export set. */
const AD_STUN = 12;
const AD_PLYS = 14;
const AD_LEGS = 17; /* damages legs (xan) — monattk.h */
const AD_STON = 18;
const AD_ENCH = 41;

const LOW_BOOTS = objectNames.indexOf('LOW_BOOTS');
const IRON_SHOES = objectNames.indexOf('IRON_SHOES');

const PM_FLOATING_EYE = monsterNames.indexOf('PM_FLOATING_EYE');
const PM_BLACK_LIGHT = monsterNames.indexOf('PM_BLACK_LIGHT');
const PM_VIOLET_FUNGUS = monsterNames.indexOf('PM_VIOLET_FUNGUS');
const PM_FLESH_GOLEM = monsterNames.indexOf('PM_FLESH_GOLEM');
const PM_IRON_GOLEM = monsterNames.indexOf('PM_IRON_GOLEM');
const PM_ROPE_GOLEM = monsterNames.indexOf('PM_ROPE_GOLEM');
const PM_MEDUSA = monsterNames.indexOf('PM_MEDUSA');
const PM_ARCHON = monsterNames.indexOf('PM_ARCHON');
const PM_SILVER_DRAGON = monsterNames.indexOf('PM_SILVER_DRAGON');
const PM_CHROMATIC_DRAGON = monsterNames.indexOf('PM_CHROMATIC_DRAGON');
const PM_STONE_GOLEM = monsterNames.indexOf('PM_STONE_GOLEM');
const DUNCE_CAP = objectNames.indexOf('DUNCE_CAP');
const OILSKIN_CLOAK = objectNames.indexOf('OILSKIN_CLOAK');
/** C objclass.h ARM_HELM — helm_simple_name via oc_skill. */
const ARM_HELM = 2;
const SHIELD_OF_REFLECTION = objectNames.indexOf('SHIELD_OF_REFLECTION');
const AMULET_OF_REFLECTION = objectNames.indexOf('AMULET_OF_REFLECTION');
const SILVER_DRAGON_SCALES = objectNames.indexOf('SILVER_DRAGON_SCALES');
const SILVER_DRAGON_SCALE_MAIL = objectNames.indexOf('SILVER_DRAGON_SCALE_MAIL');
const ROBE = objectNames.indexOf('ROBE');
const MUMMY_WRAPPING = objectNames.indexOf('MUMMY_WRAPPING');
const ALCHEMY_SMOCK = objectNames.indexOf('ALCHEMY_SMOCK');

/** C ref: monst.h resists_* — mresists|mextrinsics|mintrinsics bit. */
function resists_mr(mon, mrBit) {
    if (!mon) return false;
    const bits = (mon.data?.mresists | 0)
        | (mon.mextrinsics | 0)
        | (mon.mintrinsics | 0);
    return !!(bits & mrBit);
}

const PM_BALROG = monsterNames.indexOf('PM_BALROG');
const PM_AMOROUS_DEMON = monsterNames.indexOf('PM_AMOROUS_DEMON');
const PM_FOG_CLOUD = monsterNames.indexOf('PM_FOG_CLOUD');
const PM_FIRE_VORTEX = monsterNames.indexOf('PM_FIRE_VORTEX');
const PM_FLAMING_SPHERE = monsterNames.indexOf('PM_FLAMING_SPHERE');
const PM_FIRE_ELEMENTAL = monsterNames.indexOf('PM_FIRE_ELEMENTAL');
const PM_SALAMANDER = monsterNames.indexOf('PM_SALAMANDER');
const CLOAK_OF_DISPLACEMENT = objectNames.indexOf('CLOAK_OF_DISPLACEMENT');

/** C ref: monattk.h — engulf damage types used by gulpmu. */
const AD_BLND = 11;
const AD_CONF = 25; /* umber hulk gaze — monattk.h */
const AD_HALU = 36; /* monattk.h — black-light AT_EXPL */
const AD_DREN = 16;
const AD_STCK = 19; /* stick-to (mimic, lichen) — monattk.h */
const AD_DGST = 26;
const AD_WRAP = 28;
const AD_DISE = 33;

/** C ref: objclass.h — weapon strike modes overload oc_dir. */
const PIERCE = 1;

/** C ref: mondata.h perceives — M1_SEE_INVIS. */
function perceives(ptr) {
    return !!((ptr?.mflags1 ?? 0) & M1_SEE_INVIS);
}

/**
 * C ref: youprop.h Conflict — HConflict || EConflict.
 * Worn RIN_CONFLICT EConflict via setworn oc_oprop still named.
 */
function Conflict() {
    const u = game.u || {};
    if (u.HConflict || u.EConflict) return true;
    const prop = u.uprops?.[CONFLICT];
    return !!(prop?.intrinsic || prop?.extrinsic);
}

/**
 * C ref: youprop.h Displaced — HDisplaced || EDisplaced.
 * Cloak-of-displacement extrinsic via uprops or worn cloak otyp.
 */
function Displaced() {
    const u = game.u || {};
    if (u.HDisplaced || u.uprops?.[DISPLACED]?.intrinsic) return true;
    if (u.uprops?.[DISPLACED]?.extrinsic) return true;
    const cloak = u.uarmc;
    return !!(cloak && cloak.otyp === CLOAK_OF_DISPLACEMENT);
}

/** C ref: youprop.h Invis — match monmove: u.Invis flag. */
function Invis() {
    return !!(game.u?.Invis);
}

/** C ref: you.h m_next2u — squared dist to hero ≤ 2. */
function m_next2u(mtmp) {
    const u = game.u || {};
    const dx = (mtmp.mx | 0) - (u.ux | 0);
    const dy = (mtmp.my | 0) - (u.uy | 0);
    return dx * dx + dy * dy <= 2;
}

/**
 * C ref: hack.h AC_VALUE — positive AC as-is; negative rolls -rnd(-AC).
 */
function AC_VALUE(ac) {
    const a = ac | 0;
    if (a >= 0) return a;
    return -rnd(-a);
}

/**
 * C ref: mhitu.c calc_mattacku_vars — range2 = !monnear(mux,muy);
 * youseeit = canseemon(mtmp).
 */
function calc_mattacku_vars(mtmp) {
    const u = game.u || {};
    const mux = mtmp.mux ?? u.ux;
    const muy = mtmp.muy ?? u.uy;
    const ranged = dist2u(mtmp) > 3;
    const range2 = !monnear(mtmp, mux, muy);
    const foundyou = (u.ux === mux && u.uy === muy);
    const youseeit = canseemon(mtmp);
    return { ranged, range2, foundyou, youseeit };
}

function dist2u(mtmp) {
    const u = game.u || {};
    const dx = mtmp.mx - u.ux;
    const dy = mtmp.my - u.uy;
    return dx * dx + dy * dy;
}

/**
 * C ref: you.h mhis → genders[pronoun_gender(mtmp, PRONOUN_HALLU)].his.
 * Hallucination rn2(4) wired; canspotmon→its / is_neuter / non-humanoid→its
 * deferred (mswings already requires mon_visible).
 */
function mhis(mtmp) {
    if (game.u?.Hallucination) {
        return ['his', 'her', 'its', 'their'][rn2(4)];
    }
    if (mtmp?.female) return 'her';
    return 'his';
}

/**
 * C ref: mhitu.c mswings_verb — thrust/swing/lash/bash; mixed-dir rn2(2).
 * is_wet_towel (TOWEL+spe>0) treated as lash like C.
 */
export function mswings_verb(mwep, bash) {
    if (!mwep) return 'swings';
    const o = game.objects?.[mwep.otyp];
    const otyp = mwep.otyp | 0;
    const skill = o?.oc_skill | 0;
    const oc_dir = o?.oc_dir | 0;
    const lash = skill === P_WHIP
        || (objectNames[otyp] === 'TOWEL' && (mwep.spe | 0) > 0);
    const thrust = (oc_dir & PIERCE) !== 0
        && ((oc_dir & ~PIERCE) === 0 || !rn2(2));
    if (bash) return 'bashes with';
    if (lash) return 'lashes';
    if (thrust) return 'thrusts';
    return 'swings';
}

/**
 * C ref: mhitu.c mswings :128–141 — verbose visible weapon swing
 * pline_mon before hit/miss (D-1305). is_art(Snickersnee) bash
 * exemption deferred (caller still omits !is_art).
 */
export async function mswings(mtmp, otemp, bash) {
    const u = game.u || {};
    const Blind = !!(u.Blind || u.ublind);
    const verbose = game.flags?.verbose !== false;
    if (verbose && !Blind && mon_visible(mtmp)) {
        await pline_mon(
            mtmp,
            `${Monnam(mtmp)} ${mswings_verb(otemp, bash)} `
            + `${(otemp.quan | 0) > 1 ? 'one of ' : ''}`
            + `${mhis(mtmp)} ${xname(otemp)}.`,
        );
    }
}

/**
 * C ref: hacklib.c s_suffix — it→its, you→your, *s→*', else *'s.
 * C compares only the last char to 's' (not 'S'). Distinct from
 * s_suffix_poison (extra z/x/sh/ch).
 */
function s_suffix_hitmsg(s) {
    const buf = String(s ?? '');
    if (buf.toLowerCase() === 'it') return `${buf}s`;
    if (buf.toLowerCase() === 'you') return `${buf}r`;
    if (buf.endsWith('s')) return `${buf}'`;
    return `${buf}'s`;
}

/**
 * C ref: mhitu.c hitmsg :29–81 — could_seduce smile/talk/touch pline_mon;
 * else aatyp verb + consecutive-same-aatyp " again" + punct.
 * AT_TENT s_suffix(Monnam)+" tentacles suck your brain"; AT_EXPL/BOOM
 * "explodes"; AT_KICK thick_skinned(youmonst.data) punct ".".
 * mattacku AT_TENT melee is D-1309. explmu is D-1326. AT_HUGS
 * grab/crush is D-1327 (hitmsg has no AT_HUGS verb; C default "hits").
 * Named omit: remaining unported mhitm_ad_*. missmu pline_mon is D-1286.
 * wildmiss set_msg_xy then pline is D-1291. mswings pline_mon
 * is D-1305.
 */
export async function hitmsg(mtmp, mattk) {
    const youmonst = game.youmonst;
    const compat = could_seduce(mtmp, youmonst, mattk);
    let Monst_name = Monnam(mtmp);
    if (compat && !mtmp.mcan && !mtmp.mspec_used) {
        const Blind = !!(game.u?.Blind || game.u?.ublind
            || (((game.u?.HBlinded | 0) || (game.u?.EBlinded | 0))
                && !(game.u?.BBlinded | 0)));
        const Deaf = !!(game.u?.Deaf || game.u?.HDeaf);
        const how = Blind ? (Deaf ? 'touches' : 'talks to') : 'smiles at';
        const adv = (compat === 2) ? 'engagingly' : 'seductively';
        await pline_mon(mtmp, `${Monst_name} ${how} you ${adv}.`);
    } else {
        let verb = 'hits';
        let punct = '!';
        switch (mattk.aatyp) {
        case AT_BITE:
            verb = 'bites';
            break;
        case AT_KICK:
            if (thick_skinned(youmonst?.data)) punct = '.';
            verb = 'kicks';
            break;
        case AT_STNG:
            verb = 'stings';
            break;
        case AT_BUTT:
            verb = 'butts';
            break;
        case AT_TUCH:
            verb = 'touches you';
            break;
        case AT_TENT:
            verb = 'tentacles suck your brain';
            Monst_name = s_suffix_hitmsg(Monst_name);
            break;
        case AT_EXPL:
        case AT_BOOM:
            verb = 'explodes';
            break;
        default:
            verb = 'hits';
            break;
        }
        // C: mattk == gh.hitmsg_prev + 1 && same aatyp → " again"
        const prev = game.hitmsg_prev;
        const again = (
            (mtmp.m_id | 0) === (game.hitmsg_mid | 0)
            && prev
            && mattk._slot
            && prev._slot
            && (mattk._indx | 0) === ((prev._indx | 0) + 1)
            && (mattk.aatyp | 0) === (prev.aatyp | 0)
        ) ? ' again' : '';
        await pline_mon(mtmp, `${Monst_name} ${verb}${again}${punct}`);
    }
    game.hitmsg_mid = mtmp.m_id | 0;
    game.hitmsg_prev = mattk;
}

/**
 * C ref: mhitu.c missmu :83–99 — clear hitmsg_mid/prev; map_invisible
 * when unseen; seduce pretend-friendly or "just " near-miss when
 * flags.verbose; both arms pline_mon (D-1286). stop_occupation after
 * the line like C. mattacku AT_TENT melee is D-1309. Named omit:
 * mattacku AT_ENGL gulps/lunges pline_mon. wildmiss set_msg_xy
 * then pline is D-1291. mswings pline_mon is D-1305.
 */
export async function missmu(mtmp, nearmiss, mattk) {
    game.hitmsg_mid = 0;
    game.hitmsg_prev = null;
    if (!canspotmon(mtmp)) map_invisible(mtmp.mx, mtmp.my);
    if (could_seduce(mtmp, game.youmonst, mattk) && !mtmp.mcan) {
        await pline_mon(mtmp, `${Monnam(mtmp)} pretends to be friendly.`);
    } else {
        const just = nearmiss && game.flags?.verbose !== false ? 'just ' : '';
        await pline_mon(mtmp, `${Monnam(mtmp)} ${just}misses!`);
    }
    await stop_occupation();
}

/**
 * C ref: mhitu.c wildmiss :176–261 — attack at wrong spot (Invis /
 * Displaced / Underwater). After verbose/cansee early returns:
 * Monnam, then set_msg_xy(mx,my), then pline (not pline_mon;
 * D-1291). nolimbs uses "lunges" like C :210–213.
 * Named omit: Some_Monnam impossible; mattacku AT_ENGL gulps/lunges
 * pline_mon. mattacku AT_TENT melee is D-1309. explmu is D-1326.
 * AT_HUGS grab/crush is D-1327.
 * mswings pline_mon is D-1305.
 */
export async function wildmiss(mtmp, mattk) {
    const unotseen = !mtmp.mcansee || (Invis() && !perceives(mtmp.data));
    const unotthere = Displaced();
    const usubmerged = !!(game.u?.Underwater);

    if (!unotseen && !unotthere && !usubmerged) {
        // C: impossible("%s attacks you without knowing your location?",
        // Some_Monnam(mtmp)); Some_Monnam still named.
        return;
    }
    if (game.flags?.verbose === false) return;
    if (!cansee(mtmp.mx, mtmp.my)) return;

    const compat = ((mattk?.adtyp | 0) === AD_SEDU || (mattk?.adtyp | 0) === AD_SSEX)
        ? could_seduce(mtmp, game.youmonst, mattk)
        : 0;
    const Monst_name = Monnam(mtmp);
    const inv = Invis() ? 'invisible ' : '';

    set_msg_xy(mtmp.mx, mtmp.my);
    if (unotseen) {
        const aatyp = mattk?.aatyp | 0;
        let swings = 'swings';
        if (aatyp === AT_BITE) swings = 'snaps';
        else if (aatyp === AT_KICK) swings = 'kicks';
        else if (aatyp === AT_STNG || aatyp === AT_BUTT || nolimbs(mtmp.data)) {
            swings = 'lunges';
        }
        if (compat) {
            await pline(`${Monst_name} tries to touch you and misses!`);
        } else {
            switch (rn2(3)) {
            case 0:
                await pline(`${Monst_name} ${swings} wildly and misses!`);
                break;
            case 1:
                await pline(`${Monst_name} attacks a spot beside you.`);
                break;
            case 2: {
                const mux = mtmp.mux | 0;
                const muy = mtmp.muy | 0;
                const wall = IS_WATERWALL(game.level?.at?.(mux, muy)?.typ);
                await pline(
                    `${Monst_name} strikes at ${wall ? 'empty water' : 'thin air'}!`,
                );
                break;
            }
            default:
                await pline(`${Monst_name} ${swings} wildly!`);
                break;
            }
        }
    } else if (unotthere) {
        if (compat) {
            const how = (compat === 2) ? 'engagingly' : 'seductively';
            await pline(
                `${Monst_name} smiles ${how} at your ${inv}displaced image...`,
            );
        } else {
            await pline(
                `${Monst_name} strikes at your ${inv}displaced image and misses you!`,
            );
        }
    } else if (usubmerged) {
        if (compat) {
            await pline(`${Monst_name} reaches towards your distorted image.`);
        } else {
            await pline(
                `${Monst_name} is fooled by water reflections and misses!`,
            );
        }
    }
}

/**
 * C ref: mhitu.c mdamageu — subtract HP; Upolyd mh<1 → rehumanize;
 * else uhp<1 → done_in_by. showdamage deferred.
 */
export async function mdamageu(mtmp, n) {
    let dmg = n | 0;
    if (dmg < 0) dmg = 0;
    if (!game.flags) game.flags = {};
    game.flags.botl = true;
    const u = game.u || (game.u = {});
    if (Upolyd(u)) {
        u.mh = (u.mh || 0) - dmg;
        if ((u.mh || 0) > (u.mhmax || 0)) u.mh = u.mhmax;
        if ((u.mh || 0) < 1) {
            u.mh = 0;
            await rehumanize();
        }
        return;
    }
    u.uhp = (u.uhp || 0) - dmg;
    if ((u.uhp || 0) > (u.uhpmax || 0)) u.uhp = u.uhpmax;
    if ((u.uhp || 0) < 1) {
        await done_in_by(mtmp, DIED);
    }
}

/** C ref: youprop.h BlindedTimeout — HBlinded & TIMEOUT. */
function BlindedTimeout() {
    return (game.u?.HBlinded | 0) & TIMEOUT;
}

/** C ref: youprop.h Blind — (HBlinded||EBlinded) && !BBlinded. */
function Blind() {
    const u = game.u || {};
    if (u.uroleplay?.blind) return true;
    if (u.ublind) return true;
    return !!(((u.HBlinded | 0) || (u.EBlinded | 0)) && !(u.BBlinded | 0));
}

/**
 * C ref: youprop.h Unaware — multi < 0 && (unconscious || fainted).
 * Full unconscious prefixes / is_fainted named omit.
 */
function Unaware() {
    if ((game.multi | 0) >= 0) return false;
    const u = game.u || {};
    return !!(u.usleep || u.Unaware);
}

/**
 * C ref: mondata.c dmgtype_fromattack — mattk slot matches adtyp+aatyp.
 */
function dmgtype_fromattack(ptr, adtyp, aatyp) {
    const slots = ptr?.mattk;
    if (!slots) return false;
    const ad = adtyp | 0;
    const at = aatyp | 0;
    for (const a of slots) {
        if ((a.adtyp | 0) === ad && (a.aatyp | 0) === at) return true;
    }
    return false;
}

/**
 * C ref: mondata.c resists_blnd youmonst arm :248–272.
 * Named omit: resists_blnd_by_arti (Sunsword).
 */
function resists_blnd_you() {
    if (Blind() || Unaware()) return true;
    const ptr = game.youmonst?.data;
    return dmgtype_fromattack(ptr, AD_BLND, AT_EXPL)
        || dmgtype_fromattack(ptr, AD_BLND, AT_GAZE);
}

/**
 * C ref: polyself.c ugolemeffects :2160–2187 — flesh golem elec /
 * iron golem fire heal when not_affected.
 */
async function ugolemeffects(damtype, dam) {
    const u = game.u || {};
    const umon = u.umonnum | 0;
    if (umon !== PM_FLESH_GOLEM && umon !== PM_IRON_GOLEM) return;
    let heal = 0;
    if ((damtype | 0) === AD_ELEC && umon === PM_FLESH_GOLEM) {
        heal = Math.trunc(((dam | 0) + 5) / 6);
    } else if ((damtype | 0) === AD_FIRE && umon === PM_IRON_GOLEM) {
        heal = dam | 0;
    }
    if (heal && (u.mh | 0) < (u.mhmax | 0)) {
        u.mh = (u.mh | 0) + heal;
        if (u.mh > u.mhmax) u.mh = u.mhmax;
        if (game.disp) game.disp.botl = true;
        if (game.flags) game.flags.botl = true;
        await pline('Strangely, you feel better than before.');
        exercise(A_STR, true);
    }
}

/** C ref: youprop.h Levitation — (H||E) && !B. */
function Levitation() {
    const u = game.u || {};
    if (u.Levitation) return true;
    return !!(((u.HLevitation | 0) || (u.ELevitation | 0))
        && !(u.BLevitation | 0));
}

/** C ref: youprop.h Flying — (H||E||steed flyer) && !B; Lev overrides elsewhere. */
function Flying() {
    const u = game.u || {};
    if (u.Flying) return true;
    const steedFly = !!(u.usteed && is_flyer(u.usteed.data));
    return !!(((u.HFlying | 0) || (u.EFlying | 0) || steedFly)
        && !(u.BFlying | 0));
}

/** C ref: mondata.c body_part — LEG → "leg"; full poly deferred. */
function body_part(part) {
    if (part === LEG) return 'leg';
    return 'body';
}

/**
 * C ref: potion.c make_blinded — TIMEOUT set + Blind mirror + vision_recalc.
 * Eyes override / Punished set_bc / talk messages deferred (talk unused).
 */
function make_blinded(xtime, _talk) {
    const u = game.u || (game.u = {});
    const wasBlind = Blind();
    u.HBlinded = ((u.HBlinded | 0) & ~TIMEOUT)
        | (xtime ? ((xtime | 0) & TIMEOUT) : 0);
    const nowBlind = Blind();
    u.Blind = nowBlind;
    u.ublind = false;
    if (wasBlind !== nowBlind) {
        if (game.flags) game.flags.botl = true;
        game.vision_full_recalc = 1;
        vision_recalc(0);
    }
}

/**
 * C ref: mondata.c can_blnd — mhitu AD_BLND subset (AT_CLAW raven).
 * Named omissions: cream-pie/venom obj arms; Blindfolded ublindf; visor;
 * raven-vs-raven; resists_blnd light aatyps; mon_perma_blind.
 */
function can_blnd_u(magr, aatyp) {
    const you = game.youmonst;
    if (!haseyes(you?.data)) return false;
    if (aatyp === AT_CLAW) {
        // C: ublindf (incl. lenses) protects
        if (game.u?.ublindf) return false;
        return true;
    }
    if (aatyp === AT_WEAP || aatyp === AT_SPIT || aatyp === AT_NONE) {
        return false; // needs obj — deferred
    }
    // AT_TUCH/STNG: cancelled blocks
    if ((aatyp === AT_TUCH || aatyp === AT_STNG) && (magr?.mcan | 0)) {
        return false;
    }
    return true;
}

/**
 * C ref: uhitm.c mhitm_ad_blnd mhitu branch (mdef == youmonst).
 * "%s blinds you!" then make_blinded(BlindedTimeout+damage); damage→0.
 * Named omission: Eyes of the Overworld vision_clears; uhitm/mhitm arms.
 */
async function mhitm_ad_blnd_u(mtmp, mattk, mhm) {
    if (can_blnd_u(mtmp, mattk.aatyp | 0)) {
        if (!Blind()) {
            await pline(`${Monnam(mtmp)} blinds you!`);
        }
        make_blinded(BlindedTimeout() + (mhm.damage | 0), false);
        if (!Blind()) {
            // Eyes of the Overworld — vision_clears deferred
        }
    }
    mhm.damage = 0;
    mhm.hitflags |= M_ATTK_HIT;
}

/**
 * C ref: uhitm.c mhitm_ad_phys mhitu branch (mdef == youmonst).
 * AT_HUGS + !sticks(youmonst): rn2(2) grab / already-ustuck crush
 * (D-1327). Weapon / non-hug hitmsg path otherwise.
 * Corpse / silver / poison / pudding clone deferred.
 */
async function mhitm_ad_phys_u(mtmp, mattk, mhm) {
    const pd = game.youmonst?.data;
    // C uhitm.c mhitm_ad_phys `:4023–4037` — hug grab/crush before wep.
    if ((mattk.aatyp | 0) === AT_HUGS && !sticks(pd)) {
        const u = game.u || {};
        if (!u.ustuck && rn2(2)) {
            if (await u_slip_free(mtmp, mattk)) {
                mhm.damage = 0;
                mhm.hitflags |= M_ATTK_MISS;
            } else {
                set_ustuck(mtmp);
                await pline_mon(mtmp, `${Monnam(mtmp)} grabs you!`);
                mhm.hitflags |= M_ATTK_HIT;
            }
        } else if (u.ustuck === mtmp) {
            exercise(A_STR, false);
            const n = mtmp.data?.mndx ?? mtmp.mnum;
            const how = n === PM_ROPE_GOLEM ? 'choked' : 'crushed';
            await pline(`You are being ${how}.`);
        }
        return;
    }
    const otmp = MON_WEP(mtmp);
    if (mattk.aatyp === AT_WEAP && otmp) {
        mhm.damage += dmgval(otmp, null);
        if (mhm.damage <= 0) mhm.damage = 1;
        // artifact_hit deferred
        await hitmsg(mtmp, mattk);
        mhm.hitflags |= M_ATTK_HIT;
    } else if (mattk.aatyp !== AT_TUCH || mhm.damage !== 0) {
        await hitmsg(mtmp, mattk);
        mhm.hitflags |= M_ATTK_HIT;
    }
}

/**
 * C ref: uhitm.c mhitm_ad_elec mhitu branch (mdef == youmonst).
 * destroy_items body deferred when m_lev > rn2(20); gate always burns.
 * monstseesu / monstunseesu deferred.
 */
async function mhitm_ad_elec_u(mtmp, mattk, mhm) {
    const orig_dmg = mhm.damage;
    await hitmsg(mtmp, mattk);
    if (!(await mhitm_mgc_atk_negated(mtmp, null, true))) {
        await pline('You get zapped!');
        const u = game.u || {};
        const Shock_resistance = !!(u.Shock_resistance || u.HShock_resistance
            || u.EShock_resistance);
        if (Shock_resistance) {
            await pline("The zap doesn't shock you!");
            mhm.damage = 0;
        }
        // C: if ((int) magr->m_lev > rn2(20)) destroy_items(...)
        if ((mtmp.m_lev | 0) > rn2(20)) {
            // destroy_items(&youmonst, AD_ELEC, orig_dmg) body deferred
            void orig_dmg;
        }
    } else {
        mhm.damage = 0;
    }
}

/**
 * C ref: uhitm.c mhitm_ad_cold mhitu branch (mdef == youmonst).
 * destroy_items when m_lev > rn2(20); monstseesu / monstunseesu deferred.
 */
async function mhitm_ad_cold_u(mtmp, mattk, mhm) {
    const orig_dmg = mhm.damage;
    await hitmsg(mtmp, mattk);
    if (!(await mhitm_mgc_atk_negated(mtmp, null, true))) {
        await pline("You're covered in frost!");
        const u = game.u || {};
        const Cold_resistance = !!(u.Cold_resistance || u.HCold_resistance
            || u.ECold_resistance);
        if (Cold_resistance) {
            await pline("The frost doesn't seem cold!");
            mhm.damage = 0;
        }
        // C: if ((int) magr->m_lev > rn2(20)) destroy_items(&youmonst, AD_COLD, …)
        if ((mtmp.m_lev | 0) > rn2(20)) {
            const you = game.youmonst || { _youmonst: true };
            mhm.damage += await destroy_items(you, AD_COLD, orig_dmg);
        }
    } else {
        mhm.damage = 0;
    }
}

/**
 * C ref: mhitu.c mpoisons_subj — subject noun for poison pline.
 */
function mpoisons_subj(mtmp, mattk) {
    const aatyp = mattk?.aatyp | 0;
    if (aatyp === AT_WEAP) {
        const mwep = MON_WEP(mtmp);
        return (!mwep || !mwep.opoisoned) ? 'attack' : 'weapon';
    }
    if (aatyp === AT_TUCH) return 'contact';
    if (aatyp === AT_GAZE) return 'gaze';
    if (aatyp === AT_BITE) return 'bite';
    return 'sting';
}

/** C hacklib.c s_suffix — possessive for poison reason. */
function s_suffix_poison(s) {
    if (!s) return 'the';
    if (s === 'it') return 'its';
    if (s === 'you') return 'your';
    if (s.endsWith('s') || s.endsWith('z') || s.endsWith('x')
        || s.endsWith('sh') || s.endsWith('ch')) {
        return `${s}'`;
    }
    return `${s}'s`;
}

/**
 * C ref: uhitm.c mhitm_ad_drst mhitu branch (AD_DRST/DRDX/DRCO).
 * Always rolls mhitm_mgc_atk_negated(FALSE) before hitmsg; poison via
 * poisoned() when !negated && !rn2(8).
 */
async function mhitm_ad_drst_u(mtmp, mattk, mhm) {
    const negated = await mhitm_mgc_atk_negated(mtmp, null, false);
    let ptmp = A_STR;
    switch (mattk.adtyp | 0) {
    case AD_DRST: ptmp = A_STR; break;
    case AD_DRDX: ptmp = A_DEX; break;
    case AD_DRCO: ptmp = A_CON; break;
    }
    await hitmsg(mtmp, mattk);
    if (!negated && !rn2(8)) {
        // C: Sprintf(buf, "%s %s", s_suffix(Monnam(magr)), mpoisons_subj(...));
        //    poisoned(buf, ptmp, pmname(pa, Mgender(magr)), 30, FALSE);
        const reason = `${s_suffix_poison(Monnam(mtmp))} ${mpoisons_subj(mtmp, mattk)}`;
        const g = mtmp?.female ? FEMALE : MALE;
        const killer = pmname(mtmp?.data || mtmp?.mnum, g);
        await poisoned(reason, ptmp, killer, 30, false);
    }
    void mhm;
}

/**
 * C ref: mondata.h dmgtype — any mattk slot matches adtyp.
 */
function dmgtype(ptr, adtyp) {
    const slots = ptr?.mattk;
    if (!slots) return false;
    for (const a of slots) {
        if ((a.adtyp | 0) === (adtyp | 0)) return true;
    }
    return false;
}


/**
 * C ref: mondata.h digests — AT_ENGL + AD_DGST (purple worm / trapper).
 */
export function digests(ptr) {
    const slots = ptr?.mattk;
    if (!slots) return false;
    for (const a of slots) {
        if ((a.aatyp | 0) === AT_ENGL && (a.adtyp | 0) === AD_DGST) return true;
    }
    return false;
}

/**
 * C ref: mondata.h enfolds — AT_ENGL + AD_WRAP (trapper / lurker).
 */
function enfolds(ptr) {
    const slots = ptr?.mattk;
    if (!slots) return false;
    for (const a of slots) {
        if ((a.aatyp | 0) === AT_ENGL && (a.adtyp | 0) === AD_WRAP) return true;
    }
    return false;
}

/** C ref: mondata.h flaming — fire vortex / sphere / elemental / salamander. */
function flaming(ptr) {
    if (!ptr) return false;
    const n = ptr.mndx ?? -1;
    return n === PM_FIRE_VORTEX || n === PM_FLAMING_SPHERE
        || n === PM_FIRE_ELEMENTAL || n === PM_SALAMANDER;
}

/**
 * C ref: mhitm.c engulf_target — size + whirly + trap gates (hero as mdef).
 * Named omissions: rock/door/tree/ironbars Passes_walls placement checks.
 */
function engulf_target(magr, mdefIsHero) {
    const u = game.u || {};
    const magrDat = magr?.data;
    const mdefDat = mdefIsHero ? (game.youmonst?.data) : null;
    const mdefSize = mdefDat?.msize | 0;
    if (mdefSize >= MZ_HUGE) return false;
    if ((magrDat?.msize | 0) < mdefSize && !is_whirly(magrDat)) return false;
    if (magr?.mtrapped) return false;
    if (mdefIsHero && (u.utrap | 0)) return false;
    return true;
}

/**
 * C ref: mondata.c sticks — AD_STCK, non-engulf AD_WRAP, or AT_HUGS.
 * Local clone (C AT_HUGS=7 / AT_ENGL=11). Do not import monmove.js sticks.
 */
function attacktype_aatyp(ptr, aatyp) {
    const at = aatyp | 0;
    return !!(ptr?.mattk || []).some((a) => (a.aatyp | 0) === at);
}
function sticks(ptr) {
    return dmgtype(ptr, AD_STCK)
        || (dmgtype(ptr, AD_WRAP) && !attacktype_aatyp(ptr, AT_ENGL))
        || attacktype_aatyp(ptr, AT_HUGS);
}

/**
 * C ref: objnam.c cloak_simple_name `:5492–5509`.
 * u_slip_free uses this for undiscovered oilskin (not "slippery cloak").
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
 * C ref: obj.h is_helmet — ARMOR + oc_armcat ARM_HELM (JS oc_skill stand-in).
 */
function is_helmet_mhitu(obj) {
    return obj?.oclass === ARMOR_CLASS
        && (game.objects?.[obj.otyp]?.oc_skill ?? -1) === ARM_HELM;
}

/** C ref: do_wear.c hard_helmet `:567–573` — metallic or glass helm. */
function hard_helmet(obj) {
    if (!obj || !is_helmet_mhitu(obj)) return false;
    return is_metallic(obj) || is_crackable(obj);
}

/** C ref: objnam.c helm_simple_name `:5513–5528` — hat vs helm. */
function helm_simple_name(helmet) {
    return !hard_helmet(helmet) ? 'hat' : 'helm';
}

/**
 * C ref: artifact.c defends(AD_DRIN, uwep) `:636–683`.
 * No artifact DFNS(AD_DRIN); dragon-armor switch has no AD_DRIN case
 * (falls through to FALSE). Full defends() still named.
 */
function defends_ad_drin(_otmp) {
    return false;
}

/**
 * C ref: mhitu.c u_slip_free `:1045–1085` — greased/oilskin clothing
 * slips a hug or wrap. AT_ENGL never slips. AD_DRIN looks at uarmh
 * (mhitu mhitm_ad_drin D-1329); other attacks walk cloak then suit
 * then shirt. mhitu AD_WRAP caller is mhitm_ad_wrap_u (D-1331);
 * uhitm arm is mhitm_ad_wrap (D-1348). mhitm brush still named.
 */
export async function u_slip_free(mtmp, mattk) {
    if ((mattk?.aatyp | 0) === AT_ENGL) return false;
    const u = game.u || {};
    let obj = u.uarmc ? u.uarmc : u.uarm;
    if (!obj) obj = u.uarmu;
    if ((mattk?.adtyp | 0) === AD_DRIN) obj = u.uarmh;
    if (obj && (obj.greased || (obj.otyp | 0) === OILSKIN_CLOAK)
        && (!obj.cursed || rn2(3))) {
        const verb = (mattk.adtyp | 0) === AD_WRAP
            ? 'slips off of'
            : 'grabs you, but cannot hold onto';
        const greasy = obj.greased ? 'greased' : 'slippery';
        const ocl = game.objects?.[obj.otyp | 0];
        const what = (obj.greased || ocl?.oc_name_known)
            ? xname(obj)
            : cloak_simple_name(obj);
        await pline_mon(mtmp, `${Monnam(mtmp)} ${verb} your ${greasy} ${what}!`);
        if (obj.greased && !rn2(2)) {
            await pline('The grease wears off.');
            obj.greased = 0;
            const { update_inventory } = await import('./invent.js');
            update_inventory();
        }
        return true;
    }
    return false;
}

/**
 * C ref: mhitm.c failed_grab — unsolid / notonhead grab miss (no RNG).
 * mhitu mdef is always youmonst; magr is the monster.
 */
async function failed_grab(magr, mattk) {
    const youdat = game.youmonst?.data;
    if (!(unsolid(youdat) || game.notonhead)
        || !((mattk.aatyp | 0) === AT_HUGS
            || (mattk.adtyp | 0) === AD_WRAP
            || (mattk.adtyp | 0) === AD_STCK
            || (mattk.adtyp | 0) === AD_DGST)) {
        return false;
    }
    const verb = (mattk.adtyp | 0) === AD_DGST ? 'gulp'
        : (mattk.adtyp | 0) === AD_STCK ? 'adhere' : 'grab';
    const magrnam = s_suffix_hitmsg(Monnam(magr));
    let mdefnam;
    if (!game.notonhead) {
        mdefnam = 'you';
    } else {
        /* C some_mon_nam(mdef); named omit — s_suffix(mon_nam) stand-in. */
        mdefnam = `${s_suffix_hitmsg(mon_nam(game.youmonst))} tail`;
    }
    await pline(
        `${magrnam} ${verb} attempt ${
            game.notonhead ? 'fails to hold' : 'passes right through'
        } ${mdefnam}!`,
    );
    return true;
}

/**
 * C ref: mon.c set_ustuck — bind / clear hero grabber; clears swallow on null.
 */
export function set_ustuck(mtmp) {
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
 * C ref: mon.c unstuck — release grabber; set mspec_used rnd(2) for re-engulf.
 * Swallowed exit: vision_full_recalc + docrt (Hallu display RNG; D-0838).
 * Named omissions: Punished placebc.
 */
export async function unstuck(mtmp) {
    const u = game.u || {};
    if (u.ustuck !== mtmp) return;
    const ptr = mtmp.data;
    const was_swallowed = !!(u.uswallow | 0);
    set_ustuck(null);
    if (was_swallowed) {
        game.mswallower = null;
        u.ux = mtmp.mx;
        u.uy = mtmp.my;
        // C: gv.vision_full_recalc = 1; docrt();
        game.vision_full_recalc = 1;
        await docrt();
    }
    if (!(mtmp.mspec_used | 0)
        && (dmgtype(ptr, AD_STCK)
            || attacktype_aatyp(ptr, AT_ENGL)
            || attacktype_aatyp(ptr, AT_HUGS))) {
        mtmp.mspec_used = rnd(2);
    }
}

/**
 * C ref: mhitu.c expels — unstuck + mnexto; spoteffects / um_dist deferred.
 */
export async function expels(mtmp, mdat, message) {
    if (!game.flags) game.flags = {};
    game.flags.botl = true;
    if (message) {
        if (digests(mdat)) {
            await pline('You get regurgitated!');
        } else if (enfolds(mdat)) {
            await pline(`${Monnam(mtmp)} unfolds and you are released!`);
        } else {
            let blast = '';
            if (is_whirly(mdat)) {
                const attk = (mdat.mattk || []).find((a) => (a.aatyp | 0) === AT_ENGL);
                if ((attk?.adtyp | 0) === AD_ELEC) blast = ' in a shower of sparks';
                else if ((attk?.adtyp | 0) === AD_COLD) blast = ' in a blast of frost';
            } else {
                blast = ' with a squelch';
            }
            await pline(`You get expelled from ${mon_nam(mtmp)}${blast}!`);
        }
    }
    await unstuck(mtmp);
    // C: mnexto(mtmp, RLOC_NOMSG) — expel must not STRAT_APPEARMSG
    await mnexto(mtmp, RLOC_NOMSG);
    newsym(game.u.ux, game.u.uy);
}

/**
 * C ref: mhitu.c gulpmu — swallow hero or damage while swallowed.
 * Envelope: first swallow place+ustuck+uswldtim; AD_PHYS/COLD/FIRE/ELEC/DGST/
 * ACID arms; mdamageu; expel on timer.
 * Named omissions: Punished ball; steed DISMOUNT_ENGULFED; leashes; petrify;
 * snuff_lit invent; Slow_digestion; ugolemeffects/monstseesu; diseasemu;
 * drain_en; make_blinded; Half_physical polish;
 * display_nhwindow(WIN_MESSAGE) before vision_recalc (D-0852 #996);
 * swallowed cls/bot polish; u_on_newpos while digesting (D-0826 postmov).
 */
async function gulpmu(mtmp, mattk) {
    const u = game.u || (game.u = {});
    let tmp = d(mattk.damn | 0, mattk.damd | 0);
    let physical_damage = false;

    if (!(u.uswallow | 0)) {
        if (!engulf_target(mtmp, true)) return M_ATTK_MISS;
        if (await failed_grab(mtmp, mattk)) return M_ATTK_MISS;

        mtmp.mtrapped = 0;
        mtmp.mx = u.ux | 0;
        mtmp.my = u.uy | 0;
        set_ustuck(mtmp);
        newsym(mtmp.mx, mtmp.my);

        if (u.usteed) {
            const verb = is_animal(mtmp.data) ? 'lunges'
                : is_whirly(mtmp.data) ? 'whirls'
                    : unsolid(mtmp.data) ? 'flows'
                        : amorphous(mtmp.data) ? 'oozes' : 'surges';
            await pline(`${Monnam(mtmp)} ${verb} forward and plucks you off your steed!`);
            u.usteed = null;
        } else {
            const how = digests(mtmp.data) ? 'swallows you whole'
                : enfolds(mtmp.data) ? 'folds itself around you'
                    : 'engulfs you';
            await pline(`${Monnam(mtmp)} ${how}!`);
        }
        await stop_occupation();
        if (u.utrap) {
            await pline(`You are released from the ${(u.utraptype | 0) === 7 ? 'web' : 'trap'}!`);
            u.utrap = 0;
            u.utraptype = 0;
        }

        // C: display_nhwindow(WIN_MESSAGE,FALSE) then vision_recalc(2).
        // Flush alone (D-0841) or Hallu warn burns alone (#993/#994) each
        // desync display-rng by ±8; together they match C (D-0852 #996):
        // More consumes post-engulf keys so once-per-input swallowed(0)
        // does not double-fire, and vision_off restores the 8×~drn2(5).
        await flush_topl_more();
        {
            const Hallu = !!(u.Hallucination
                || ((u.HHallucination | 0) && !(u.Halluc_resistance | 0)));
            if (Hallu) vision_off_newsym_gbuf({ useLiveViz: true });
        }
        vision_recalc(2);
        u.uswallow = 1;
        let tim_tmp;
        if ((mattk.adtyp | 0) === AD_DGST) {
            tim_tmp = (acurr(A_CON) | 0) + 10 - (u.uac | 0) + rn2(20);
            if (tim_tmp < 0) tim_tmp = 0;
            tim_tmp = Math.trunc(tim_tmp / ((mtmp.m_lev | 0) || 1));
            tim_tmp += 3;
        } else {
            // C: rnd((int) mtmp->m_lev + 10 / 2) → rnd(m_lev + 5)
            tim_tmp = rnd((mtmp.m_lev | 0) + Math.trunc(10 / 2));
        }
        u.uswldtim = (tim_tmp < 2) ? 2 : tim_tmp;
        // C: swallowed(1) — stomach map; Hallu burns what_mon per cell
        // (C cls/bot inside swallowed; JS clears disp in swallowed(first))
        swallowed(1);
        if (!flaming(mtmp.data)) {
            /* snuff_lit invent deferred */
        }
    }

    if (mtmp !== u.ustuck) return M_ATTK_MISS;
    if ((u.uswldtim | 0) > 0) u.uswldtim = (u.uswldtim | 0) - 1;

    const Cold_resistance = !!(u.Cold_resistance || u.HCold_resistance
        || u.ECold_resistance);
    const Fire_resistance = !!(u.Fire_resistance || u.HFire_resistance
        || u.EFire_resistance);
    const Shock_resistance = !!(u.Shock_resistance || u.HShock_resistance
        || u.EShock_resistance);
    const Acid_resistance = !!(u.Acid_resistance || u.HAcid_resistance
        || u.EAcid_resistance);

    switch (mattk.adtyp | 0) {
    case AD_DGST:
        physical_damage = true;
        if (u.uswldtim === 0) {
            await pline(`${Monnam(mtmp)} totally digests you!`);
            tmp = u.uhp | 0;
        } else {
            const adv = (u.uswldtim === 2) ? ' thoroughly'
                : (u.uswldtim === 1) ? ' utterly' : '';
            await pline(`${Monnam(mtmp)}${adv} digests you!`);
        }
        break;
    case AD_PHYS:
        physical_damage = true;
        if ((mtmp.data?.mndx ?? -1) === PM_FOG_CLOUD) {
            await pline('You are laden with moisture and can barely breathe!');
        } else {
            await pline(`You are ${enfolds(mtmp.data) ? 'being squashed' : 'pummeled with debris'}!`);
        }
        break;
    case AD_ACID:
        if (Acid_resistance) {
            await pline('You are covered with a seemingly harmless goo.');
            tmp = 0;
        } else {
            await pline('You are covered in slime!  It burns!');
        }
        break;
    case AD_BLND:
        tmp = 0;
        break;
    case AD_ELEC:
        if (!(mtmp.mcan | 0) && rn2(2)) {
            await pline('The air around you crackles with electricity.');
            if (Shock_resistance) {
                await pline('You seem unhurt.');
                tmp = 0;
            }
        } else {
            tmp = 0;
        }
        break;
    case AD_COLD:
        if (!(mtmp.mcan | 0) && rn2(2)) {
            if (Cold_resistance) {
                await pline('You feel mildly chilly.');
                tmp = 0;
            } else {
                await pline('You are freezing to death!');
            }
        } else {
            tmp = 0;
        }
        break;
    case AD_FIRE:
        if (!(mtmp.mcan | 0) && rn2(2)) {
            if (Fire_resistance) {
                await pline('You feel mildly hot.');
                tmp = 0;
            } else {
                await pline('You are burning to a crisp!');
            }
        } else {
            tmp = 0;
        }
        break;
    case AD_DISE:
    case AD_DREN:
        tmp = 0;
        break;
    default:
        physical_damage = true;
        tmp = 0;
        break;
    }

    if (physical_damage) {
        if ((u.uac | 0) < 0) {
            tmp -= rnd(-(u.uac | 0));
            if (tmp < 0) tmp = 1;
        }
        tmp = maybe_half_phys(tmp);
    }

    game.mswallower = mtmp;
    await mdamageu(mtmp, tmp);
    game.mswallower = null;
    if (tmp) await stop_occupation();

    if (!(u.uswallow | 0)) {
        /* life-saving already expelled */
    } else if (!(u.uswldtim | 0)
        || ((game.youmonst?.data?.msize | 0) >= MZ_HUGE)) {
        const how = digests(mtmp.data) ? 'regurgitated'
            : enfolds(mtmp.data) ? 'released' : 'expelled';
        await pline(`You get ${how}!`);
        await expels(mtmp, mtmp.data, false);
    }
    return M_ATTK_HIT;
}


/**
 * C ref: uhitm.c mhitm_ad_sedu — mhitu (monster→you) arm only.
 * Brag/remarks is pline_mon (D-1240); charm-fail stays pline.
 * Named omissions: uhitm steal_it; mhitm minvent steal; SYSOPT_SEDUCE
 * doseduce; Adjmonnam charm polish; animal locomotion flee pline.
 */
async function mhitm_ad_sedu(mtmp, mattk, mhm) {
    if (is_animal(mtmp.data)) {
        await hitmsg(mtmp, mattk);
        if (mtmp.mcan) return;
        // Continue to steal below
    } else {
        const youdat = game.youmonst?.data;
        if (dmgtype(youdat, AD_SEDU) || dmgtype(youdat, AD_SSEX)) {
            const Deaf = !!(game.u?.Deaf || game.u?.HDeaf);
            // C uhitm.c mhitm_ad_sedu :4647 — pline_mon(magr); charm-fail stays pline
            await pline_mon(
                mtmp,
                `${Monnam(mtmp)} ${Deaf
                    ? "says something but you can't hear it"
                    : mtmp.minvent
                        ? 'brags about the goods some dungeon explorer provided'
                        : 'makes some remarks about how difficult theft is lately'}.`,
            );
            if (!(await tele_restrict(mtmp))) await rloc(mtmp, RLOC_MSG);
            mhm.hitflags = M_ATTK_AGR_DONE;
            mhm.done = true;
            return;
        }
        if (mtmp.mcan) {
            const Blind = !!(game.u?.Blind || game.u?.ublind);
            if (!Blind) {
                const female = !!(game.flags?.female);
                await pline(
                    `${Monnam(mtmp)} tries to ${female ? 'charm' : 'seduce'} you, `
                    + `but you seem ${female ? 'unaffected' : 'uninterested'}.`,
                );
            }
            if (rn2(3)) {
                if (!(await tele_restrict(mtmp))) await rloc(mtmp, RLOC_MSG);
                mhm.hitflags = M_ATTK_AGR_DONE;
                mhm.done = true;
            }
            return;
        }
    }

    const buf = { value: '' };
    switch (await steal(mtmp, buf)) {
    case -1:
        mhm.hitflags = M_ATTK_AGR_DIED;
        mhm.done = true;
        return;
    case 0:
        return;
    default:
        if (!is_animal(mtmp.data) && !(await tele_restrict(mtmp))) {
            await rloc(mtmp, RLOC_MSG);
        }
        // animal flee-with-buf pline deferred
        await monflee(mtmp, 0, false, false);
        mhm.hitflags = M_ATTK_AGR_DONE;
        mhm.done = true;
        return;
    }
}

/**
 * C ref: pline.c You_hear — acoustics/Deaf gate (local for mhitu).
 */
async function You_hear(line) {
    const u = game.u || {};
    if (u.Deaf || u.HDeaf || game.flags?.acoustics === false) return;
    await pline(`You hear ${line}`);
}

/**
 * C ref: uhitm.c do_stone_u — start delayed stoning unless resisted/poly.
 * Named omissions: make_stoned body / polymon stone-golem; sets Stoned stub.
 * Returns 1 if stoning started (caller may mark done).
 */
function do_stone_u(mtmp) {
    const u = game.u || {};
    const Stoned = !!(u.Stoned || u.HStoned);
    const Stone_resistance = !!(u.Stone_resistance || u.HStone_resistance
        || u.EStone_resistance);
    if (!Stoned && !Stone_resistance) {
        // poly_when_stoned → polymon(PM_STONE_GOLEM) deferred
        u.Stoned = 5;
        void mtmp;
        return 1;
    }
    return 0;
}

/**
 * C ref: uhitm.c mhitm_ad_ston — mhitu (monster→you) arm only.
 * hitmsg + !rn2(3) hiss/cough; !rn2(10)||NEW_MOON → do_stone_u.
 * Named omissions: Soundeffect; full make_stoned killer string.
 */
async function mhitm_ad_ston_u(mtmp, mattk, mhm) {
    await hitmsg(mtmp, mattk);
    if (!rn2(3)) {
        const Deaf = !!(game.u?.Deaf || game.u?.HDeaf);
        if (mtmp.mcan) {
            if (!Deaf) await You_hear(`a cough from ${mon_nam(mtmp)}!`);
        } else {
            const Hallu = !!(game.u?.Hallucination
                || ((game.u?.HHallucination | 0)
                    && !(game.u?.Halluc_resistance | 0)));
            if (Hallu && !Blind()) {
                await You_hear('hissing.');
                await pline(
                    `${Monnam(mtmp)} appears to be blowing you a kiss...`,
                );
            } else if (!Deaf) {
                await You_hear(`${s_suffix_poison(mon_nam(mtmp))} hissing!`);
            } else if (!Blind()) {
                await pline(`${Monnam(mtmp)} seems to grimace.`);
            }
            if (!rn2(10) || (game.flags?.moonphase | 0) === NEW_MOON) {
                if (do_stone_u(mtmp)) {
                    mhm.hitflags = M_ATTK_HIT;
                    mhm.done = true;
                    return;
                }
            }
        }
    }
    // C mhitu arm leaves mhm.damage from hitmu base d() (often 0d0)
    void mhm;
}

/**
 * C ref: uhitm.c mhitm_ad_legs — mhitu (mdef == youmonst) arm only.
 * Side rn2(2) always; steed/Lev/Fly vs non-flyer reach fail; mcan nuzzle
 * via pline_mon (D-1240; reach/prick/scratch stay pline like C);
 * boots may scratch (damage 0 return) or prick; else set_wounded_legs +
 * exercise STR/DEX. Named omissions: uhitm/mhitm arms; poly body_part.
 */
async function mhitm_ad_legs_u(mtmp, _mattk, mhm) {
    const u = game.u || {};
    // C: long side = rn2(2) ? RIGHT_SIDE : LEFT_SIDE; — always first
    const side = rn2(2) ? RIGHT_SIDE : LEFT_SIDE;
    const sidestr = side === RIGHT_SIDE ? 'right' : 'left';
    const Monst_name = Monnam(mtmp);
    const leg = body_part(LEG);

    if ((u.usteed || Levitation() || Flying()) && !is_flyer(mtmp.data)) {
        await pline(`${Monst_name} tries to reach your ${sidestr} ${leg}!`);
        mhm.damage = 0;
    } else if (mtmp.mcan) {
        await pline_mon(
            mtmp,
            `${Monnam(mtmp)} nuzzles against your ${sidestr} ${leg}!`,
        );
        mhm.damage = 0;
    } else {
        if (u.uarmf) {
            if (rn2(2) && ((u.uarmf.otyp | 0) === LOW_BOOTS
                    || (u.uarmf.otyp | 0) === IRON_SHOES)) {
                await pline(
                    `${Monst_name} pricks the exposed part of your ${sidestr} ${leg}!`,
                );
            } else if (!rn2(5)) {
                await pline(`${Monst_name} pricks through your ${sidestr} boot!`);
            } else {
                await pline(`${Monst_name} scratches your ${sidestr} boot!`);
                mhm.damage = 0;
                return;
            }
        } else {
            await pline(`${Monst_name} pricks your ${sidestr} ${leg}!`);
        }

        // C: set_wounded_legs(side, rnd(60 - ACURR(A_DEX)));
        await set_wounded_legs(side, rnd(60 - acurr(A_DEX)));
        exercise(A_STR, false);
        exercise(A_DEX, false);
    }
}

/**
 * C ref: uhitm.c mhitm_ad_poly — mhitu (mdef == youmonst) arm.
 * hitmsg; if Maybe_Half_Phys(dmg) < current HP → mon_poly or negated msg.
 * Named omissions: magr.mcan You aren't transformed polish.
 */
async function mhitm_ad_poly_u(mtmp, mattk, mhm) {
    await hitmsg(mtmp, mattk);
    const u = game.u || {};
    const curhp = Upolyd(u) ? (u.mh | 0) : (u.uhp | 0);
    if (maybe_half_phys(mhm.damage | 0) < curhp) {
        const negated = await mhitm_mgc_atk_negated(mtmp, null, false);
        if (negated) {
            if (mtmp.mcan) await pline("You aren't transformed.");
        } else {
            mhm.damage = await mon_poly(mtmp, game.youmonst, mhm.damage | 0);
            mhm.hitflags |= M_ATTK_HIT;
            mhm.done = true;
        }
    }
}

/**
 * C ref: uhitm.c mhitm_ad_drin `:3222–3271` — mhitu (monster→you).
 * hitmsg; defends(AD_DRIN,uwep) / headless skipdrin; u_slip_free;
 * uarmh && rn2(8) helm/hat block (no skipdrin); Half_physical then
 * mdamageu and zero leftover dice (AC does not reduce); eat_brains
 * unless dunce cap; adjattrib(A_INT,-rnd(2),FALSE); 1/5 losespells
 * and 1/5 drain_weapon_skill set skipdrin. mhitm arm D-1330.
 * mhitu AD_WRAP is D-1331.
 */
export async function mhitm_ad_drin_u(mtmp, mattk, mhm) {
    await hitmsg(mtmp, mattk);
    const pd = game.youmonst?.data;
    const u = game.u || {};
    if (defends_ad_drin(u.uwep) || !has_head(pd)) {
        await pline("You don't seem harmed.");
        game.skipdrin = true;
        return;
    }
    if (await u_slip_free(mtmp, mattk)) return;

    if (u.uarmh && rn2(8)) {
        /* C `:3236` — not body_part(HEAD) */
        await pline(
            `Your ${helm_simple_name(u.uarmh)} blocks the attack to your head.`,
        );
        return;
    }
    /* C `:3241–3244` — Half_physical_damage only (not Mitre); AC skipped */
    mhm.damage = maybe_half_phys(mhm.damage | 0);
    await mdamageu(mtmp, mhm.damage);
    mhm.damage = 0; /* don't inflict a second dose in hitmu */

    if (!u.uarmh || (u.uarmh.otyp | 0) !== DUNCE_CAP) {
        const oldmort = u.umortality | 0;
        const { eat_brains } = await import('./eat.js');
        const mhitu = await eat_brains(mtmp, game.youmonst, true, null);
        if ((u.umortality | 0) > oldmort) game.skipdrin = true;
        if (mhitu === M_ATTK_MISS) return;
    }
    /* adjattrib gives dunce cap message when appropriate */
    await adjattrib(A_INT, -rnd(2), false);
    if (!rn2(5)) {
        const { losespells } = await import('./spell.js');
        losespells();
        game.skipdrin = true;
    }
    if (!rn2(5)) {
        await drain_weapon_skill(rnd(2));
        game.skipdrin = true;
    }
}

/**
 * C ref: do_name.c Some_Monnam — highc(some_mon_nam).
 * Visible → Monnam; else Someone/Something. AUGMENT_IT in x_monnam
 * is still named (same stand-in as steal.js / dothrow.js).
 */
function Some_Monnam(mtmp) {
    if (canspotmon(mtmp)) return Monnam(mtmp);
    return is_animal(mtmp?.data) ? 'Something' : 'Someone';
}

/** C youprop.h H/E via flat + uprops[idx] (confer may not mirror E*). */
function _uprop_he_mhitu(u, flatH, flatE, idx) {
    const prop = u.uprops?.[idx];
    return ((u[flatH] | 0) || (u[flatE] | 0)
        || (prop?.intrinsic | 0) || (prop?.extrinsic | 0));
}

/** C youprop.h Swimming — H||E||steed is_swimmer. */
function Swimming() {
    const u = game.u || {};
    if (_uprop_he_mhitu(u, 'HSwimming', 'ESwimming', SWIMMING)) return true;
    return !!(u.usteed && is_swimmer(u.usteed.data));
}

/**
 * C youprop.h Amphibious — magical breathing || amphibious(form).
 * confer writes AMULET_OF_MAGICAL_BREATHING to uprops, not EMagical_breathing.
 */
function Amphibious() {
    const u = game.u || {};
    if (_uprop_he_mhitu(u, 'HMagical_breathing', 'EMagical_breathing',
        MAGICAL_BREATHING)) {
        return true;
    }
    return amphibious(game.youmonst?.data);
}

/** C youprop.h Breathless — magical breathing || breathless(form). */
function Breathless() {
    const u = game.u || {};
    if (_uprop_he_mhitu(u, 'HMagical_breathing', 'EMagical_breathing',
        MAGICAL_BREATHING)) {
        return true;
    }
    return breathless(game.youmonst?.data);
}

/**
 * C ref: uhitm.c mhitm_ad_wrap `:3376–3417` — mhitu (monster→you).
 * (!mcan || ustuck==magr) && !sticks(you): !ustuck && !rn2(10) grab
 * with u_slip_free, else already-held pool drown / AT_HUGS crush,
 * else verbose brush. Cancelled / sticks zeros leftover dice.
 * uhitm arm is mhitm_ad_wrap (D-1348). mhitm brush still named.
 */
export async function mhitm_ad_wrap_u(mtmp, mattk, mhm) {
    const pd = game.youmonst?.data;
    const pa = mtmp.data;
    const coil = slithy(pa) && (pa?.mlet === 'S_SNAKE' || pa?.mlet === 'S_NAGA');
    const u = game.u || {};

    if ((!mtmp.mcan || u.ustuck === mtmp) && !sticks(pd)) {
        if (!u.ustuck && !rn2(10)) {
            if (await u_slip_free(mtmp, mattk)) {
                mhm.damage = 0;
            } else {
                set_ustuck(mtmp); /* before message, for botl update */
                await urgent_pline(
                    `${Some_Monnam(mtmp)} ${coil ? 'coils' : 'swings'} itself around you!`,
                );
            }
        } else if (u.ustuck === mtmp) {
            if (is_pool(mtmp.mx, mtmp.my) && !Swimming() && !Amphibious()
                && !Breathless()) {
                const loc = game.level?.at?.(mtmp.mx, mtmp.my);
                const typ = loc?.typ | 0;
                const moat = typ !== POOL
                    && !IS_WATERWALL(typ)
                    && !Is_medusa_level(u.uz)
                    && !Is_waterlevel(u.uz);
                await urgent_pline(`${Monnam(mtmp)} drowns you...`);
                if (!game.killer) game.killer = { name: '', format: 0 };
                game.killer.format = KILLED_BY_AN;
                game.killer.name = `${moat ? 'moat' : 'pool of water'} by ${
                    an(pmname(mtmp.data, mtmp.female ? FEMALE : MALE))
                }`;
                await done(DROWNING);
            } else if ((mattk.aatyp | 0) === AT_HUGS) {
                await pline('You are being crushed.');
            }
        } else {
            mhm.damage = 0;
            if (game.flags?.verbose !== false) {
                if (coil) {
                    await pline_mon(
                        mtmp, `${Monnam(mtmp)} brushes against you.`,
                    );
                } else {
                    await pline_mon(
                        mtmp,
                        `${Monnam(mtmp)} brushes against your ${body_part(LEG)}.`,
                    );
                }
            }
        }
    } else {
        mhm.damage = 0;
    }
}

/**
 * C ref: uhitm.c mhitm_adtyping — mhitu (monster→you) subset.
 * PHYS + ELEC + COLD + DRST/DRDX/DRCO + SITM/SEDU + BLND + STON + LEGS
 * + POLY (D-1004) + DRIN (D-1329) + WRAP (D-1331); other adtyps zero damage.
 */
async function mhitm_adtyping_u(mtmp, mattk, mhm) {
    switch (mattk.adtyp | 0) {
    case AD_PHYS:
        await mhitm_ad_phys_u(mtmp, mattk, mhm);
        break;
    case AD_ELEC:
        await mhitm_ad_elec_u(mtmp, mattk, mhm);
        break;
    case AD_COLD:
        await mhitm_ad_cold_u(mtmp, mattk, mhm);
        break;
    case AD_DRST:
    case AD_DRDX:
    case AD_DRCO:
        await mhitm_ad_drst_u(mtmp, mattk, mhm);
        break;
    case AD_SITM:
    case AD_SEDU:
        await mhitm_ad_sedu(mtmp, mattk, mhm);
        break;
    case AD_BLND:
        await mhitm_ad_blnd_u(mtmp, mattk, mhm);
        break;
    case AD_STON:
        await mhitm_ad_ston_u(mtmp, mattk, mhm);
        break;
    case AD_LEGS:
        await mhitm_ad_legs_u(mtmp, mattk, mhm);
        break;
    case AD_POLY:
        await mhitm_ad_poly_u(mtmp, mattk, mhm);
        break;
    case AD_DRIN:
        await mhitm_ad_drin_u(mtmp, mattk, mhm);
        break;
    case AD_WRAP:
        await mhitm_ad_wrap_u(mtmp, mattk, mhm);
        break;
    default:
        mhm.damage = 0;
        break;
    }
}

/**
 * C ref: mhitu.c assess_dmg — subtract tmp from mtmp; lethal → xkilled NOMSG.
 */
async function assess_dmg(mtmp, tmp) {
    mtmp.mhp = (mtmp.mhp | 0) - (tmp | 0);
    if ((mtmp.mhp | 0) <= 0) {
        await pline(`${Monnam(mtmp)} dies!`);
        await xkilled(mtmp, XKILL_NOMSG);
        if ((mtmp.mhp | 0) > 0) return M_ATTK_HIT; // !DEADMONSTER
        return M_ATTK_AGR_DIED;
    }
    return M_ATTK_HIT;
}

/**
 * C ref: mhitu.c passiveum — hero AT_NONE/AT_BOOM counterattack after hitmu.
 * Uses olduasmon (form at hit start) even if rehumanized mid-hit.
 * Named omissions: attk_protection/poly_when_stoned detail; drain_item body;
 * erode_armor/acid_damage bodies; golemeffects; mon_reflects; paralyze_monst
 * full; rehumanize AT_BOOM; split_mon body (mh heal still applied).
 */
async function passiveum(olduasmon, mtmp, mattk) {
    if (!olduasmon || !mtmp) return M_ATTK_HIT;
    let oldu_mattk = null;
    for (let i = 0; !oldu_mattk; i++) {
        if (i >= NATTK) return M_ATTK_HIT;
        const slot = olduasmon.mattk?.[i];
        if (!slot) continue;
        if ((slot.aatyp | 0) === AT_NONE || (slot.aatyp | 0) === AT_BOOM) {
            oldu_mattk = slot;
        }
    }
    let tmp;
    if (oldu_mattk.damn) {
        tmp = d(oldu_mattk.damn | 0, oldu_mattk.damd | 0);
    } else if (oldu_mattk.damd) {
        tmp = d((olduasmon.mlevel | 0) + 1, oldu_mattk.damd | 0);
    } else {
        tmp = 0;
    }

    const u = game.u || {};
    // Even-if-rehumanized arms
    switch (oldu_mattk.adtyp | 0) {
    case AD_ACID:
        if (!rn2(2)) {
            const acid = hliquid('acid');
            await pline(
                `${Monnam(mtmp)} is splashed by ${!Upolyd(u) ? '' : 'your '}${acid}!`,
            );
            if (resists_mr(mtmp, MR_ACID)) {
                await pline(`${Monnam(mtmp)} is not affected.`);
                tmp = 0;
            }
        } else {
            tmp = 0;
        }
        if (!rn2(30)) {
            // erode_armor(mtmp, ERODE_CORRODE) deferred
        }
        if (!rn2(6)) {
            // acid_damage(MON_WEP(mtmp)) deferred
        }
        return assess_dmg(mtmp, tmp);
    case AD_STON: {
        // attk_protection / wornitems / poly_when_stoned deferred — resists only
        if (!resists_ston(mtmp)) {
            await pline(`${Monnam(mtmp)} turns to stone!`);
            if (!game.context) game.context = {};
            game.context.stoned = 1;
            await xkilled(mtmp, XKILL_NOMSG);
            if ((mtmp.mhp | 0) > 0) return M_ATTK_HIT;
            return M_ATTK_AGR_DIED;
        }
        return M_ATTK_HIT;
    }
    case AD_ENCH:
        // drain_item(mon_currwep, TRUE) deferred — no RNG in C when wep null
        void mattk;
        return M_ATTK_HIT;
    default:
        break;
    }
    if (!Upolyd(u)) return M_ATTK_HIT;

    // Live-only passives — C always burns rn2(3)
    if (rn2(3)) {
        switch (oldu_mattk.adtyp | 0) {
        case AD_PHYS:
            if ((oldu_mattk.aatyp | 0) === AT_BOOM) {
                await pline('You explode!');
                // rehumanize deferred
                return assess_dmg(mtmp, tmp);
            }
            break;
        case AD_PLYS:
            if (tmp > 127) tmp = 127;
            if ((u.umonnum | 0) === PM_FLOATING_EYE) {
                if (!rn2(4)) tmp = 127;
                if (mtmp.mcansee && haseyes(mtmp.data) && rn2(3)
                    && (perceives(mtmp.data) || !u.Invis)) {
                    if (Blind()) {
                        const sex = game.flags?.female ? FEMALE : MALE;
                        await pline(
                            `As a blind ${pmname(game.youmonst?.data, sex)}, you cannot defend yourself.`,
                        );
                    } else {
                        // mon_reflects deferred — treat as no reflect
                        await pline(`${Monnam(mtmp)} is frozen by your gaze!`);
                        // paralyze_monst deferred — still mark done
                        mtmp.mcanmove = 0;
                        mtmp.mfrozen = tmp | 0;
                        return M_ATTK_AGR_DONE;
                    }
                }
            } else {
                await pline(`${Monnam(mtmp)} is frozen by you.`);
                mtmp.mcanmove = 0;
                mtmp.mfrozen = tmp | 0;
                return M_ATTK_AGR_DONE;
            }
            return M_ATTK_HIT;
        case AD_COLD:
            if (resists_mr(mtmp, MR_COLD)) {
                // shieldeff / golemeffects deferred
                await pline(`${Monnam(mtmp)} is mildly chilly.`);
                tmp = 0;
                break;
            }
            await pline(`${Monnam(mtmp)} is suddenly very cold!`);
            u.mh = (u.mh | 0) + Math.trunc((tmp + rn2(2)) / 2);
            if ((u.mhmax | 0) < (u.mh | 0)) u.mhmax = u.mh | 0;
            if ((u.mhmax | 0) > (((game.youmonst?.data?.mlevel | 0) + 1) * 8)) {
                // split_mon(&youmonst, mtmp) deferred
            }
            break;
        case AD_STUN:
            if (!mtmp.mstun) {
                mtmp.mstun = 1;
                await pline(`${Monnam(mtmp)} staggers.`);
            }
            tmp = 0;
            break;
        case AD_FIRE:
            if (resists_mr(mtmp, MR_FIRE)) {
                await pline(`${Monnam(mtmp)} is mildly warm.`);
                tmp = 0;
                break;
            }
            await pline(`${Monnam(mtmp)} is suddenly very hot!`);
            break;
        case AD_ELEC:
            if (resists_mr(mtmp, MR_ELEC)) {
                await pline(`${Monnam(mtmp)} is slightly tingled.`);
                tmp = 0;
                break;
            }
            await pline(`${Monnam(mtmp)} is jolted with your electricity!`);
            break;
        default:
            tmp = 0;
            break;
        }
    } else {
        tmp = 0;
    }
    return assess_dmg(mtmp, tmp);
}

/**
 * C ref: mhitu.c hitmu — base d() + adtyping + knockback + AC/Half + mdamageu
 * + passiveum. Undead midnight extra, permdmg deferred.
 */
/** C ref: do_name.c Amonnam — highc(a_monnam). */
function Amonnam(mtmp) {
    const s = x_monnam(mtmp, ARTICLE_A, null, 0, false);
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : 'It';
}

/**
 * C ref: mhitu.c hitmu — base d() + adtyping + knockback + AC/Half + mdamageu
 * + passiveum. Undead midnight extra, permdmg deferred.
 */
async function hitmu(mtmp, mattk) {
    const mhm = {
        hitflags: M_ATTK_MISS,
        permdmg: 0,
        specialdmg: 0,
        done: false,
        damage: 0,
    };
    // C: olduasmon = youmonst.data before adtyping may rehumanize
    const olduasmon = game.youmonst?.data;
    const u = game.u || {};

    // C: if (!canspotmon(mtmp)) map_invisible — Blind / unseen attacker
    if (!canspotmon(mtmp)) map_invisible(mtmp.mx, mtmp.my);

    // C: mundetected hides_under / S_EEL — reveal under object before damage
    const mdat = mtmp.data;
    if (mtmp.mundetected && (hides_under(mdat) || mdat?.mlet === 'S_EEL')) {
        mtmp.mundetected = 0;
        const detect = !!(u.Detect_monsters
            || (u.HDetect_monsters | 0) || (u.EDetect_monsters | 0));
        if (!tp_sensemon(mtmp) && !detect) {
            const obj = objects_at(mtmp.mx | 0, mtmp.my | 0);
            if (obj) {
                let what;
                if (Blind() && !obj.dknown) what = 'something';
                else if (is_pool(mtmp.mx, mtmp.my) && !u.Underwater) {
                    what = 'the water';
                } else {
                    what = doname(obj);
                }
                let Amonbuf = Amonnam(mtmp);
                // C: if (!strcmp(Amonbuf, "It")) → Something
                if (Amonbuf === 'It') Amonbuf = 'Something';
                await pline(`${Amonbuf} was hidden under ${what}!`);
            }
            newsym(mtmp.mx, mtmp.my);
        }
    }

    mhm.damage = d(mattk.damn | 0, mattk.damd | 0);
    // midnight undead extra d() deferred

    await mhitm_adtyping_u(mtmp, mattk, mhm);
    mhitm_knockback(mtmp, null, mattk, mhm.hitflags, MON_WEP(mtmp) != null);

    if (mhm.done) return mhm.hitflags;

    // C: (Upolyd ? u.mh : u.uhp) < 1
    if ((Upolyd(u) ? (u.mh | 0) : (u.uhp | 0)) < 1) {
        await mdamageu(mtmp, 1);
        mhm.damage = 0;
    }

    if (mhm.damage && (u.uac | 0) < 0) {
        mhm.damage -= rnd(-(u.uac | 0));
        if (mhm.damage < 1) mhm.damage = 1;
    }

    if (mhm.damage > 0) {
        // Half_physical_damage / Mitre deferred (maybe_half_phys when wired)
        await mdamageu(mtmp, mhm.damage);
    }

    // C: if (mhm.damage) passiveum else M_ATTK_HIT; always stop_occupation
    let res = M_ATTK_HIT;
    if (mhm.damage) {
        res = await passiveum(olduasmon, mtmp, mattk);
    }
    await stop_occupation();
    return res;
}

/**
 * C ref: mhitu.c summonmu — demon help / were change+summon.
 * Caller verified !mcan, cham==NON_PM, !range2.
 * Named omissions: were new_were / were_summon / Protection_from_shape_changers /
 * night() / Deaf growl plines (demon arm returns first).
 */
async function summonmu(mtmp, youseeit) {
    let mdat = mtmp.data;
    if (is_demon(mdat)) {
        const mndx = mdat?.mndx ?? mtmp.mnum;
        if (mndx !== PM_BALROG && mndx !== PM_AMOROUS_DEMON) {
            if (!rn2(Inhell() ? 10 : 16)) await msummon(mtmp);
        }
        return; // no demon were
    }
    // is_were arm deferred
    void youseeit;
}

/**
 * C ref: youprop.h Reflecting — HReflecting || EReflecting
 * (uprops[REFLECTING] + W_WEP flat). Worn otyp / silver-dragon form
 * stand in while confer_oc_oprop does not mirror EReflecting.
 */
function Reflecting() {
    const u = game.u || {};
    if (u.HReflecting || u.EReflecting || u.Reflecting) return true;
    const e = u.uprops?.[REFLECTING];
    if ((e?.intrinsic | 0) || (e?.extrinsic | 0)) return true;
    if (u.uarms?.otyp === SHIELD_OF_REFLECTION) return true;
    if (u.uamul?.otyp === AMULET_OF_REFLECTION) return true;
    const arm = u.uarm?.otyp | 0;
    if (arm === SILVER_DRAGON_SCALES || arm === SILVER_DRAGON_SCALE_MAIL) {
        return true;
    }
    return (game.youmonst?.data?.mndx | 0) === PM_SILVER_DRAGON;
}

/** C ref: youprop.h Stone_resistance. */
function Stone_resistance() {
    const u = game.u || {};
    return !!(u.Stone_resistance || u.HStone_resistance || u.EStone_resistance);
}

/** C ref: youprop.h Fire_resistance. */
function Fire_resistance() {
    const u = game.u || {};
    return !!(u.Fire_resistance || u.HFire_resistance || u.EFire_resistance);
}

/** C printf %s %s for ureflects / mon_reflects. */
function sprintf2(fmt, a, b) {
    let n = 0;
    return String(fmt).replace(/%s/g, () => (n++ === 0 ? a : b));
}

/**
 * C ref: muse.c ureflects :2836–2866 — outermost to innermost.
 * EReflecting is youprop.h uprops[REFLECTING].extrinsic; JS ORs the
 * W_WEP artifact flat (D-1342) and worn otyp fallbacks while
 * confer_oc_oprop does not mirror EReflecting. Chromatic dragon is
 * mon_reflects only (C ureflects is silver). mcastu caller named.
 */
export async function ureflects(fmt, str) {
    const u = game.u || {};
    const er = (u.EReflecting | 0) | (u.uprops?.[REFLECTING]?.extrinsic | 0);
    let what = null;
    let known = -1;
    if ((er & W_ARMS) || u.uarms?.otyp === SHIELD_OF_REFLECTION) {
        what = 'shield';
        known = SHIELD_OF_REFLECTION;
    } else if (er & W_WEP) {
        what = 'weapon';
    } else if ((er & W_AMUL) || u.uamul?.otyp === AMULET_OF_REFLECTION) {
        what = 'medallion';
        known = AMULET_OF_REFLECTION;
    } else if ((er & W_ARM)
        || u.uarm?.otyp === SILVER_DRAGON_SCALES
        || u.uarm?.otyp === SILVER_DRAGON_SCALE_MAIL) {
        what = u.uskin ? 'luster' : 'armor';
    } else if ((game.youmonst?.data?.mndx | 0) === PM_SILVER_DRAGON) {
        what = 'scales';
    } else {
        return false;
    }
    if (fmt && str) {
        await pline(sprintf2(fmt, str, what));
        if (known >= 0) makeknown(known);
    }
    return true;
}

/**
 * C ref: muse.c mon_reflects :2797–2833.
 * arti_reflects(MON_WEP) is D-1342 (between shield and amulet).
 */
async function mon_reflects(mon, str) {
    let orefl = which_armor(mon, W_ARMS);
    if (orefl && (orefl.otyp | 0) === SHIELD_OF_REFLECTION) {
        if (str) {
            await pline(sprintf2(str, s_suffix_hitmsg(mon_nam(mon)), 'shield'));
            makeknown(SHIELD_OF_REFLECTION);
        }
        return true;
    }
    if (arti_reflects(MON_WEP(mon))) {
        if (str) {
            await pline(sprintf2(str, s_suffix_hitmsg(mon_nam(mon)), 'weapon'));
        }
        return true;
    }
    orefl = which_armor(mon, W_AMUL);
    if (orefl && (orefl.otyp | 0) === AMULET_OF_REFLECTION) {
        if (str) {
            await pline(sprintf2(str, s_suffix_hitmsg(mon_nam(mon)), 'amulet'));
            makeknown(AMULET_OF_REFLECTION);
        }
        return true;
    }
    orefl = which_armor(mon, W_ARM);
    if (orefl && ((orefl.otyp | 0) === SILVER_DRAGON_SCALES
            || (orefl.otyp | 0) === SILVER_DRAGON_SCALE_MAIL)) {
        if (str) {
            await pline(sprintf2(str, s_suffix_hitmsg(mon_nam(mon)), 'armor'));
        }
        return true;
    }
    const mndx = mon?.data?.mndx ?? mon?.mnum ?? -1;
    if (mndx === PM_SILVER_DRAGON || mndx === PM_CHROMATIC_DRAGON) {
        if (str) {
            await pline(sprintf2(str, s_suffix_hitmsg(mon_nam(mon)), 'scales'));
        }
        return true;
    }
    return false;
}

const GAZEMU_REACTIONS = [
    'confused', 'stunned', 'puzzled', 'dazzled',
    'irritated', 'inflamed', 'tired', 'dulled',
];

/**
 * C ref: mhitu.c gazemu :1668–1898 — monster gazes at the hero.
 * Callers: mattacku AT_GAZE when mdat is not Medusa (:832–837);
 * mon.c m_respond_medusa first AT_GAZE slot.
 * Named omit: #ifdef PM_BEHOLDER AD_SLEE/AD_SLOW (MON is #if 0);
 * impossible() default. gazemm is D-1338. arti_reflects W_WEP is D-1342.
 */
export async function gazemu(mtmp, mattk) {
    if (!mtmp || !mattk) return M_ATTK_MISS;
    if (m_seenres(mtmp, cvt_adtyp_to_mseenres(mattk.adtyp))) {
        return M_ATTK_MISS;
    }

    const is_medusa = (mtmp.data?.mndx | 0) === PM_MEDUSA;
    const reflectable = !!(Reflecting() && couldsee(mtmp.mx, mtmp.my)
        && is_medusa);
    let cancelled = !!(mtmp.mcan | 0);
    let already = false;
    let react = -1;
    const mcanseeu = !!(canseemon(mtmp) && couldsee(mtmp.mx, mtmp.my)
        && (mtmp.mcansee | 0));

    if ((Hallucination() && rn2(4)) || (Unaware() && !reflectable)) {
        cancelled = true;
    }

    switch (mattk.adtyp | 0) {
    case AD_STON:
        if (cancelled || !(mtmp.mcansee | 0)) {
            if (!canseemon(mtmp)) break;
            if (Unaware()) {
                react = is_medusa ? 4 : 2;
                break;
            }
            if (is_medusa && Hallucination() && !rn2(3)) {
                await pline('Someone seems overdue for a serpent cut.');
            } else {
                await pline_mon(mtmp, `${Monnam(mtmp)} ${
                    (is_medusa && mtmp.mcan && !react)
                        ? "doesn't look all that ugly"
                        : 'gazes ineffectually'
                }.`);
            }
            break;
        }
        if (reflectable) {
            const useeit = canseemon(mtmp);
            if (useeit) {
                await ureflects(
                    '%s gaze is reflected by your %s.',
                    s_suffix_hitmsg(Monnam(mtmp)),
                );
            }
            if (await mon_reflects(mtmp, useeit
                ? 'The gaze is reflected away by %s %s!'
                : null)) {
                break;
            }
            if (!m_canseeu(mtmp)) {
                if (useeit) {
                    await pline(
                        `${Monnam(mtmp)} doesn't seem to notice that `
                        + `${mhis(mtmp)} gaze was reflected.`,
                    );
                }
                break;
            }
            if (useeit) {
                await pline_mon(mtmp, `${Monnam(mtmp)} is turned to stone!`);
            }
            if (!game.context) game.context = {};
            game.context.stoned = true;
            await killed(mtmp);
            if ((mtmp.mhp | 0) >= 1) break;
            return M_ATTK_AGR_DIED;
        }
        if (canseemon(mtmp) && couldsee(mtmp.mx, mtmp.my)
            && !Stone_resistance() && !Unaware()) {
            await pline(`You meet ${s_suffix_hitmsg(mon_nam(mtmp))} gaze.`);
            await stop_occupation();
            if (poly_when_stoned(game.youmonst?.data, game.mvitals)
                && (await polymon(PM_STONE_GOLEM))) {
                break;
            }
            await urgent_pline('You turn to stone...');
            if (!game.killer) game.killer = { name: '', format: 0 };
            game.killer.format = KILLED_BY;
            game.killer.name = pmname(
                mtmp.data, mtmp.female ? FEMALE : MALE,
            );
            await done(STONING);
        }
        break;
    case AD_CONF:
        if (mcanseeu && !(mtmp.mspec_used | 0) && rn2(5)) {
            if (cancelled) {
                react = 0;
                already = !!(mtmp.mconf | 0);
            } else {
                const conf = d(3, 4);
                mtmp.mspec_used = (mtmp.mspec_used | 0) + (conf + rn2(6));
                if (!((game.u?.HConfusion | 0) || game.u?.Confusion)) {
                    await pline_mon(
                        mtmp, `${s_suffix_hitmsg(Monnam(mtmp))} gaze confuses you!`,
                    );
                } else {
                    await pline('You are getting more and more confused.');
                }
                await make_confused((game.u?.HConfusion | 0) + conf, false);
                await stop_occupation();
            }
        }
        break;
    case AD_STUN:
        if (mcanseeu && !(mtmp.mspec_used | 0) && rn2(5)) {
            if (cancelled) {
                react = 1;
                already = !!(mtmp.mstun | 0);
            } else {
                const stun = d(2, 6);
                mtmp.mspec_used = (mtmp.mspec_used | 0) + (stun + rn2(6));
                await pline_mon(
                    mtmp, `${Monnam(mtmp)} stares piercingly at you!`,
                );
                await make_stunned(
                    ((game.u?.HStun | 0) & TIMEOUT) + stun, true,
                );
                await stop_occupation();
            }
        }
        break;
    case AD_BLND:
        if (canseemon(mtmp) && !resists_blnd_you()
            && dist2u(mtmp) <= BOLT_LIM * BOLT_LIM) {
            if (cancelled) {
                react = rn1(2, 2);
                already = !(mtmp.mcansee | 0);
                if (mtmp.mcan && (mtmp.data?.mndx | 0) === PM_ARCHON
                    && rn2(5)) {
                    react = -1;
                }
            } else {
                const blnd = d(mattk.damn | 0, mattk.damd | 0);
                await pline(
                    `You are blinded by ${s_suffix_hitmsg(mon_nam(mtmp))} radiance!`,
                );
                make_blinded(blnd, false);
                await stop_occupation();
                if (!Blind()) {
                    await pline('Your vision clears.');
                } else {
                    const oldstun = (game.u?.HStun | 0) & TIMEOUT;
                    const newstun = rnd(3);
                    await make_stunned(Math.max(oldstun, newstun), true);
                }
            }
        }
        break;
    case AD_FIRE:
        if (mcanseeu && !(mtmp.mspec_used | 0) && rn2(5)) {
            if (cancelled) {
                react = rn1(2, 4);
            } else {
                let dmg = d(2, 6);
                const orig_dmg = dmg;
                const lev = mtmp.m_lev | 0;
                await pline_mon(
                    mtmp, `${Monnam(mtmp)} attacks you with a fiery gaze!`,
                );
                await stop_occupation();
                if (Fire_resistance()) {
                    await shieldeff(game.u?.ux | 0, game.u?.uy | 0);
                    await pline('The fire doesn\'t feel hot!');
                    monstseesu(M_SEEN_FIRE);
                    await ugolemeffects(AD_FIRE, d(12, 6));
                    dmg = 0;
                } else {
                    monstunseesu(M_SEEN_FIRE);
                }
                await burn_away_slime();
                if (lev > rn2(20)) {
                    await burnarmor(game.youmonst);
                }
                if (lev > rn2(20)) {
                    await destroy_items(game.youmonst, AD_FIRE, orig_dmg);
                    await ignite_items(game.invent);
                }
                if (dmg) await mdamageu(mtmp, dmg);
            }
        }
        break;
    default:
        break;
    }
    if (react >= 0) {
        if (Hallucination() && rn2(3)) {
            react = rn2(GAZEMU_REACTIONS.length);
        }
        let prefix = '';
        if (!rn2(3)) {
            prefix = '';
        } else if (already) {
            prefix = 'quite ';
        } else {
            prefix = !rn2(2) ? 'a bit ' : 'somewhat ';
        }
        await pline_mon(
            mtmp,
            `${Monnam(mtmp)} looks ${prefix}${GAZEMU_REACTIONS[react]}.`,
        );
    }
    return M_ATTK_MISS;
}

/**
 * C ref: mhitu.c explmu :1591–1664 — monster explodes in the hero's
 * face. Caller mattacku AT_EXPL when !range2 (:839–842).
 * Named omit: defended(mtmp, adtyp) exploder artifact/dragon scales
 * (no RNG; AT_EXPL spheres/lights never qualify);
 * resists_blnd_by_arti; mhitm explmm.
 */
export async function explmu(mtmp, mattk, ufound) {
    if (!mtmp) return M_ATTK_MISS;
    if (mtmp.mcan) return M_ATTK_MISS;

    let kill_agr = true;
    let tmp = d(mattk.damn | 0, mattk.damd | 0);
    // C: not_affected = defended(mtmp, adtyp) — the exploder, not hero.
    let not_affected = false;
    const ad = mattk.adtyp | 0;
    const u = game.u || {};

    if (!ufound) {
        const who = canseemon(mtmp) ? Monnam(mtmp) : 'It';
        const mux = mtmp.mux | 0;
        const muy = mtmp.muy | 0;
        const wall = IS_WATERWALL(game.level?.at?.(mux, muy)?.typ);
        await pline(
            `${who} explodes at a spot in ${wall ? 'empty water' : 'thin air'}!`,
        );
    } else {
        await hitmsg(mtmp, mattk);
    }

    switch (ad) {
    case AD_COLD:
    case AD_FIRE:
    case AD_ELEC:
        await mon_explodes(mtmp, mattk);
        if ((mtmp.mhp | 0) >= 1) kill_agr = false;
        break;
    case AD_BLND:
        not_affected = resists_blnd_you();
        if (ufound && !not_affected) {
            /* C: mon_visible || (rnd(tmp /= 2) > u.ulevel) — short-circuit
             * skips the halve+rnd when the exploder is visible. */
            if (mon_visible(mtmp)
                || (rnd(tmp = Math.trunc(tmp / 2)) > (u.ulevel | 0))) {
                await pline('You are blinded by a blast of light!');
                make_blinded(tmp, false);
                if (!Blind()) await pline('Your vision clears.');
            } else if (game.flags?.verbose !== false) {
                await pline(
                    'You get the impression it was not terribly bright.',
                );
            }
        }
        break;
    case AD_HALU: {
        const umon = u.umonnum | 0;
        not_affected = not_affected
            || Blind()
            || umon === PM_BLACK_LIGHT
            || umon === PM_VIOLET_FUNGUS
            || dmgtype(game.youmonst?.data, AD_STUN);
        if (ufound && !not_affected) {
            if (!Hallucination()) {
                await pline(
                    'You are caught in a blast of kaleidoscopic light!',
                );
            }
            mondead(mtmp);
            kill_agr = false;
            const chg = await make_hallucinated(
                (u.HHallucination | 0) + tmp,
                false,
                0,
            );
            await pline(
                `You ${chg ? 'are freaked out' : 'seem unaffected'}.`,
            );
        }
        break;
    }
    default:
        break;
    }
    if (not_affected) {
        await pline('You seem unaffected by it.');
        await ugolemeffects(ad, tmp);
    }
    if (kill_agr && (mtmp.mhp | 0) >= 1) mondead(mtmp);
    await wake_nearto(mtmp.mx | 0, mtmp.my | 0, 7 * 7);
    return (mtmp.mhp | 0) >= 1 ? M_ATTK_MISS : M_ATTK_AGR_DIED;
}

/**
 * C ref: mhitu.c mattacku — AT_WEAP ranged thrwmu + melee HTH / weapon hit
 * (AT_TENT with claw/kick/bite/sting/touch/butt, D-1309); AT_EXPL explmu
 * (D-1326); AT_HUGS grab/crush (D-1327); AT_GAZE gazemu (D-1328, skip
 * Medusa); AD_DRIN tentacle drain (D-1329); AT_ENGL gulpmu; AT_BREA/SPIT/MAGC.
 * Returns 1 if monster died.
 */
export async function mattacku(mtmp) {
    if (!mtmp || (mtmp.mhp | 0) < 1) return 1;

    let { ranged, range2, foundyou, youseeit } = calc_mattacku_vars(mtmp);
    if (!ranged) nomul(0);
    if ((mtmp.mhp | 0) < 1) return 1;

    const u = game.u || {};

    // C: mhitu.c — while swallowed, only u.ustuck may attack; pin mux/muy.
    // Underwater non-swimmer early-out deferred.
    if (u.uswallow | 0) {
        if (mtmp !== u.ustuck) return 0;
        mtmp.mux = u.ux;
        mtmp.muy = u.uy;
        if (u.uinvulnerable) return 0;
        range2 = false;
        foundyou = true;
    } else if (u.usteed) {
        // C: mhitu.c — while mounted, orcs (1/2) / others (1/4) may hit the steed
        // instead; steed never attacks the rider.
        if (mtmp === u.usteed) return 0;
        if (!rn2(is_orc(mtmp.data) ? 2 : 4) && m_next2u(mtmp)) {
            let i = await mattackm(mtmp, u.usteed);
            if ((i & M_ATTK_AGR_DIED) !== 0) return 1;
            if ((i & M_ATTK_DEF_DIED) !== 0 || !u.usteed || !m_next2u(mtmp)) {
                return 0;
            }
            // Steed retaliation — bhitpos/notonhead omitted (no worm steed)
            i = await mattackm(u.usteed, mtmp);
            return (i & M_ATTK_DEF_DIED) !== 0 ? 1 : 0;
        }
    }

    // AC_VALUE(u.uac) + 10 + m_lev (+ helpless / invis / trap deferred deltas)
    let tmp = AC_VALUE(u.uac ?? 10) + 10;
    tmp += mtmp.m_lev | 0;
    if ((game.multi | 0) < 0) tmp += 4;
    if (!mtmp.mcansee) tmp -= 2;
    if (mtmp.mtrapped) tmp -= 2;
    if (tmp <= 0) tmp = 1;

    // C: mhitu.c summonmu before find_offensive — demon/were help
    let mdat = mtmp.data;
    if ((mtmp.cham ?? NON_PM) === NON_PM && !mtmp.mcan && !range2
        && (is_demon(mdat) || is_were(mdat))) {
        const already_fleeing = !!(mtmp.mflee | 0);
        await summonmu(mtmp, youseeit);
        if ((mtmp.mflee | 0) && !already_fleeing) return 0;
        mdat = mtmp.data;
    }

    // C: find_offensive / use_offensive before attack loop — potion throw
    // spends the turn (return 2) without melee/ranged AT_WEAP.
    if (find_offensive(mtmp)) {
        const offended = await use_offensive(mtmp);
        if (offended !== 0) return offended === 1 ? 1 : 0;
    }

    const sum = new Array(NATTK).fill(M_ATTK_MISS);
    const firstfoundyou = foundyou;
    let skipnonmagc = false;
    // C mhitu.c mattacku `:765` — [see mattackm]
    game.skipdrin = false;

    for (let i = 0; i < NATTK; i++) {
        sum[i] = M_ATTK_MISS;
        if ((mtmp.mhp | 0) < 1) return 1;
        if (i > 0) {
            ({ ranged, range2, foundyou, youseeit } = calc_mattacku_vars(mtmp));
            void youseeit;
            if (firstfoundyou && !foundyou) continue;
        }

        const mattk = get_mattk(mtmp, i, null); // null = hero defender
        if (mattk.aatyp === AT_NONE) continue;
        // C: uswallow skips non-ENGL; skipnonmagc skips non-MAGC;
        // skipdrin skips remaining AT_TENT+AD_DRIN (`:787–790`)
        if ((u.uswallow | 0) && (mattk.aatyp | 0) !== AT_ENGL) continue;
        if (skipnonmagc && (mattk.aatyp | 0) !== AT_MAGC) continue;
        if (game.skipdrin && (mattk.aatyp | 0) === AT_TENT
            && (mattk.adtyp | 0) === AD_DRIN) continue;

        switch (mattk.aatyp) {
        case AT_CLAW: /* "hand to hand" attacks */
        case AT_KICK:
        case AT_BITE:
        case AT_STNG:
        case AT_TUCH:
        case AT_BUTT:
        case AT_TENT:
            // C mhitu.c mattacku `:801–821` — pit kick; melee iff unarmed
            // or confused or Conflict or hero !touch_petrifies.
            if ((mattk.aatyp | 0) === AT_KICK && mtrapped_in_pit(mtmp)) {
                continue;
            }
            if (!range2 && (!MON_WEP(mtmp) || mtmp.mconf || Conflict()
                || !touch_petrifies(game.youmonst?.data))) {
                if (foundyou) {
                    const j = rnd(20 + i);
                    if (tmp > j) {
                        if (unsolid(game.youmonst?.data)
                            && await failed_grab(mtmp, mattk)) {
                            continue;
                        }
                        if ((mattk.aatyp | 0) !== AT_KICK
                            || !thick_skinned(game.youmonst?.data)) {
                            sum[i] = await hitmu(mtmp, mattk);
                        }
                    } else {
                        await missmu(mtmp, tmp === j, mattk);
                    }
                } else {
                    await wildmiss(mtmp, mattk);
                    skipnonmagc = true;
                }
            }
            break;

        case AT_HUGS: /* automatic if prev two attacks succeed */
            /* C mhitu.c mattacku `:823–830` — displaced prev never
             * succeeded. Auto-hit when !range2 and both prior slots
             * hit, or already grabbing. */
            if ((!range2 && i >= 2 && sum[i - 1] && sum[i - 2])
                || mtmp === u.ustuck) {
                if (!(await failed_grab(mtmp, mattk))) {
                    sum[i] = await hitmu(mtmp, mattk);
                }
            }
            break;

        case AT_GAZE: /* can affect you either ranged or not */
            /* C mhitu.c mattacku `:832–837` — Medusa already gazed
             * through m_respond in dochug; don't gaze twice. Compare
             * mndx (D-0928). */
            if ((mdat?.mndx | 0) !== PM_MEDUSA) {
                sum[i] = await gazemu(mtmp, mattk);
            }
            break;

        case AT_EXPL: /* automatic hit if next to, and aimed at you */
            // C mhitu.c mattacku `:839–842` — explmu when !range2.
            if (!range2) sum[i] = await explmu(mtmp, mattk, foundyou);
            break;

        case AT_ENGL:
            // C: mhitu.c AT_ENGL — rnd(20+i) then gulpmu / missmu
            if (!range2) {
                if (foundyou) {
                    let j = 0;
                    if ((u.uswallow | 0)
                        || (!(mtmp.mspec_used | 0)
                            && tmp > (j = rnd(20 + i)))) {
                        sum[i] = await gulpmu(mtmp, mattk);
                    } else {
                        await missmu(mtmp, tmp === j, mattk);
                    }
                } else if (digests(mtmp.data)) {
                    await pline(`${Monnam(mtmp)} gulps some air!`);
                } else if (youseeit) {
                    await pline(`${Monnam(mtmp)} lunges forward and recoils!`);
                } else {
                    await pline(`You hear a ${is_whirly(mtmp.data) ? 'rushing noise' : 'splat'} nearby.`);
                }
            }
            break;

        case AT_WEAP:
            if (range2) {
                if (!Is_rogue_level(u.uz)) await thrwmu(mtmp);
            } else {
                if (mtmp.weapon_check === NEED_WEAPON || !MON_WEP(mtmp)) {
                    mtmp.weapon_check = NEED_HTH_WEAPON;
                    // C: mon_wield_item spends turn when it switches weapon
                    if ((await mon_wield_item(mtmp)) !== 0) break;
                }
                if (foundyou) {
                    const mon_currwep = MON_WEP(mtmp);
                    let hittmp = 0;
                    if (mon_currwep) {
                        // C: bash = is_pole && !Snickersnee && m_next2u
                        const bash = is_pole(mon_currwep) && m_next2u(mtmp);
                        hittmp = hitval(mon_currwep, null);
                        tmp += hittmp;
                        await mswings(mtmp, mon_currwep, bash);
                    }
                    const j = rnd(20 + i);
                    game._mhitu_dieroll = j;
                    if (tmp > j) sum[i] = await hitmu(mtmp, mattk);
                    else await missmu(mtmp, tmp === j, mattk);
                    if (mon_currwep) tmp -= hittmp;
                } else {
                    await wildmiss(mtmp, mattk);
                    skipnonmagc = true;
                }
            }
            break;

        case AT_BREA:
            // C ref: mhitu.c AT_BREA — breamu when range2 (takes care of
            // displacement via mux/muy lined_up).
            if (range2) sum[i] = await breamu(mtmp, mattk);
            break;

        case AT_SPIT:
            // C ref: mhitu.c AT_SPIT — spitmu when range2 (takes care of
            // displacement via mux/muy lined_up).
            if (range2) sum[i] = await spitmu(mtmp, mattk);
            break;

        case AT_MAGC:
            // C ref: mhitu.c AT_MAGC — buzzmu when range2 else castmu
            if (range2) sum[i] = await buzzmu(mtmp, mattk);
            else sum[i] = await castmu(mtmp, mattk, true, foundyou);
            break;

        default:
            break;
        }

        if (sum[i] & M_ATTK_AGR_DIED) return 1;
        if (sum[i] & M_ATTK_AGR_DONE) break;
        if (game.program_state?.gameover) return 1;
    }
    return (mtmp.mhp | 0) < 1 ? 1 : 0;
}
