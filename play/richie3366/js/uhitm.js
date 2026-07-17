// uhitm.js — Hero hitting monsters (partial).
// C ref: uhitm.c — do_attack / attack_checks mimic / stumble_onto_mimic / hitum / known_hitum / find_roll_to_hit / hmon;
//         hack.c overexertion; mon.c killed / xkilled / corpse_chance.

import { game } from './gstate.js';
import { rn2, rnd, d } from './rng.js';
import {
    IS_OBSTRUCTED, HMON_MELEE, HMON_THROWN, STRAT_WAITMASK,
    XKILL_GIVEMSG, XKILL_NOMSG, XKILL_NOCORPSE, XKILL_NOCONDUCT,
    LL_CONDUCT, Upolyd, P_BARE_HANDED_COMBAT, P_TWO_WEAPON_COMBAT, P_BASIC, P_WHIP,
    M_ATTK_MISS, M_ATTK_HIT, M_ATTK_DEF_DIED, NATTK,
    M_AP_OBJECT, M_AP_FURNITURE, M_AP_MONSTER, M_AP_TYPE,
    MIM_REVEAL, engulfing_u,
} from './const.js';
import {
    WEAPON_CLASS, ARMOR_CLASS, TOOL_CLASS, FOOD_CLASS, RANDOM_CLASS,
    objectNameStrs, objectNames,
} from './objects.js';
import { exercise, A_STR, A_DEX, A_WIS, acurr, adjalign } from './attrib.js';
import { overexertion, nomul, losehp } from './hack.js';
import { pline, newsym, canseemon, unmap_object, glyph_is_invisible } from './display.js';
import {
    dmgval, hitval, P_SKILL, weapon_hit_bonus, martial_bonus,
    dbon, weapon_dam_bonus, use_skill, weapon_type,
} from './weapon.js';
import { ammo_and_launcher } from './wield.js';
import { PM_BARBARIAN } from './generated/monsters_data.js';
import {
    find_mac, get_mattk, make_corpse, mhitm_knockback,
    AT_NONE, AT_WEAP, AT_KICK, AT_CLAW,
    AT_TUCH, AT_BITE, AT_BUTT, AT_STNG, AT_MAGC, AD_PHYS,
} from './mhitm.js';
import {
    verysmall, G_FREQ, G_NOCORPSE, M2_COLLECT, MZ_MEDIUM,
    bigmonst, thick_skinned, monsterNames, nonliving,
} from './monsters.js';
import {
    mksobj, mkobj, place_object, stackobj, delobj, relobj_on_death,
} from './mkobj.js';
import { monnear, record_mvitals_died, seemimic, wakeup } from './mon.js';
import { monflee } from './monmove.js';
import { livelog_printf } from './pline.js';
import { experience, more_experienced, newexplevel } from './exper.js';
import { mon_explodes } from './explode.js';
import { mon_nam, x_monnam_tame } from './do_name.js';
import { artifact_hit, youmonst } from './artifact.js';

// C monflag.h — MZ_HUMAN is MZ_MEDIUM
const MZ_HUMAN = MZ_MEDIUM;
const AT_BOOM = 14; // monattk.h — explode on death
const NATTK_CC = 6;
const FIGURINE = objectNames.indexOf('FIGURINE');

// C ref: monattk.h damage types used by passive / passive_obj
const AD_MAGM = 1;
const AD_FIRE = 2;
const AD_COLD = 3;
const AD_ELEC = 6;
const AD_ACID = 8;
const AD_STUN = 12;
const AD_PLYS = 14;
const AD_STON = 18;
const AD_RUST = 24;
const AD_ENCH = 41;
const AD_CORR = 42;

const PM_FLOATING_EYE = monsterNames.indexOf('PM_FLOATING_EYE');
const PM_STEAM_VORTEX = monsterNames.indexOf('PM_STEAM_VORTEX');
const HEAVY_IRON_BALL = objectNames.indexOf('HEAVY_IRON_BALL');
const TOWEL = objectNames.indexOf('TOWEL');
// C objclass.h ARM_SHIELD — armor oc_skill / oc_armcat
const ARM_SHIELD = 1;

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

// C ref: display.h _is_safemon — tame/peaceful, spotted, not conf/hallu/stun
export function is_safemon(mon) {
    if (!mon) return false;
    // flags.safe_dog defaults true
    if (game.flags?.safe_dog === false) return false;
    if (!mon.mpeaceful && !mon.mtame) return false;
    // canspotmon stub: adjacent pets are spotable
    if (game.u?.Confusion || game.u?.Hallucination || game.u?.Stunned) return false;
    return true;
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

/**
 * C ref: uhitm.c find_roll_to_hit — to-hit threshold before rnd(20).
 * check_caitiff / monk armor / encumbrance / trap penalties deferred when
 * they do not change RNG order for ordinary L1 melee.
 * weapon_hit_bonus from weapon.c (bare-hand unskilled = +1).
 */
function find_roll_to_hit(mtmp, aatyp, weapon, attk_count, role_roll_penalty) {
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
        // check_caitiff deferred — no RNG for hostile kobold
    }
    if (mtmp.mstun) tmp += 2;
    if (mtmp.mflee) tmp += 2;
    if (mtmp.msleeping) tmp += 2;
    if (!mtmp.mcanmove) tmp += 4;
    if (aatyp === AT_WEAP || aatyp === /* AT_CLAW */ 1) {
        if (weapon) tmp += hitval(weapon, mtmp);
        tmp += weapon_hit_bonus(weapon);
    }
    return tmp;
}

/**
 * C ref: mon.c corpse_chance — AT_BOOM then ordinary !rn2(tmp).
 * Named omissions: Vlad/lich dust; swallowed boom; LEVEL_SPECIFIC_NOCORPSE;
 * bigmonst/lizard/golem/mplayer/rider/isshk always-TRUE arms.
 */
async function corpse_chance(mon) {
    const mdat = mon.data;
    if (!mdat) return false;
    // Gas spores always explode upon death
    const slots = mdat.mattk;
    if (slots) {
        for (let i = 0; i < NATTK_CC; i++) {
            const at = slots[i];
            if (!at || (at.aatyp | 0) !== AT_BOOM) continue;
            // C burns d(damn,damd) even when not swallowed (tmp unused outdoors)
            if (at.damn) d(at.damn | 0, at.damd | 0);
            else if (at.damd) d((mdat.mlevel | 0) + 1, at.damd | 0);
            // swallowed boom deferred
            await mon_explodes(mon, at);
            return false;
        }
    }
    let tmp = 2 + (((mdat.geno ?? 0) & G_FREQ) < 2 ? 1 : 0)
        + (verysmall(mdat) ? 1 : 0);
    return !rn2(tmp);
}

// C ref: mon.c mondead → m_detach(due_to_death) → relobj(mtmp, 1, FALSE)
function mondead(mtmp) {
    mtmp.mhp = 0;
    const mx = mtmp.mx, my = mtmp.my;
    // C: after cham/were restore — mvitals[monsndx].died++
    record_mvitals_died(mtmp.mnum ?? mtmp.data?.mndx);
    if (game.fmon) {
        const i = game.fmon.indexOf(mtmp);
        if (i >= 0) game.fmon.splice(i, 1);
    }
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
 * → make_corpse. Named omissions: LEVEL_SPECIFIC_NOCORPSE,
 * accessible||is_pool gate, flooreffects non-floor arms, wasinside/
 * burycorpse/zombify, murder/luck rn2 (peaceful/tame change_luck),
 * quest leader/nemesis/guardian/priest/tame special adjalign arms,
 * artifact un-create on oversized.
 */
async function xkilled(mtmp, xkill_flags = XKILL_GIVEMSG) {
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
        // C mon.c xkilled: nonliving(mtmp->data) ? "destroy" : "kill"
        // Named omissions: wasinside/canspotmon "it"; tame poor/named pet
        // x_monnam ARTICLE arms (still mon_nam for all seen kills).
        const verb = nonliving(mtmp.data) ? 'destroy' : 'kill';
        await pline(`You ${verb} ${mon_nam(mtmp)}!`);
    }
    mondead(mtmp);
    if ((mtmp.mhp | 0) >= 1) return; // lifesaved
    const mdat = mtmp.data;
    const mndx = mtmp.mnum ?? mdat?.mndx;
    if (!nocorpse) {
        // accessible/pool gate deferred — always attempt RNG like floor tile
        if (!rn2(6)) xkilled_treasure_drop(mtmp, mdat, mndx, x, y);
        // C: if (!wasinside && corpse_chance(...)) make_corpse(...)
        if (await corpse_chance(mtmp)) make_corpse(mtmp);
    }
    // C mon.c xkilled: newsym after treasure/corpse — mondead's early
    // newsym runs before drops, so treasure-only kills need this paint.
    if (x > 0) newsym(x, y);
    // C ref: mon.c xkilled cleanup — experience after corpse; murder/
    // peaceful luck rn2 deferred (would burn RNG on peaceful/tame)
    const died = game.mvitals?.[mndx]?.died | 0;
    const tmp = experience(mtmp, died);
    more_experienced(tmp, 0);
    await newexplevel();
    // C: special adjalign arms (quest/nemesis/guardian/priest/tame) deferred;
    // peaceful-only -5 then always adjalign(mtmp->malign)
    if (mtmp.mpeaceful && !mtmp.mtame && !mtmp.ispriest) adjalign(-5);
    adjalign(mtmp.malign | 0);
}

async function killed(mtmp) {
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
 * C ref: uhitm.c hmon_hitmon_dmg_recalc — udaminc + dbon + weapon_dam_bonus.
 * Named omissions: special_dmgval gloves/silver; PROJECTILE→launcher
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
 * C ref: uhitm.c hmon / hmon_hitmon — melee weapon or bare-hand physical.
 * Poison / joust / hurtle body / pudding split deferred.
 * Hit pline: hmon_hitmon_msg_hit skips when destroyed (melee); thrown
 * multishot exception deferred.
 */
async function hmon(mon, obj, thrown, _dieroll) {
    // C: hmd.twohits = thrown ? 0 : gt.twohits
    const twohits = thrown ? 0 : gt_twohits;
    let dmg = 0;
    let use_weapon_skill = false;
    let train_weapon_skill = false;
    let hittxt = false;
    if (!obj) {
        // C hmon_hitmon_barehands: rnd(!martial_bonus() ? 2 : 4)
        dmg = rnd(martial_bonus() ? 4 : 2);
        use_weapon_skill = true;
        train_weapon_skill = dmg > 1;
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
        && thrown === HMON_MELEE
        && dmg > 0
        && (game.u?.uconduct?.weaphit | 0) <= 1) {
        first_weapon_hit(obj);
    }

    mon.mhp = (mon.mhp | 0) - dmg;
    const destroyed = (mon.mhp | 0) < 1;
    if (destroyed) mon.mhp = 0;

    // C: hmon_hitmon_msg_hit — !hittxt && (!destroyed || thrown-multishot)
    if (thrown === HMON_MELEE && !destroyed && !hittxt) {
        if (game.flags?.verbose !== false) {
            // C: You("%s %s%s", verb, mon_nam, canseemon ? exclam(dmg) : ".")
            const punct = canseemon(mon) ? exclam(dmg) : '.';
            await pline(`You ${hmon_hit_verb(obj)} ${mon_nam(mon)}${punct}`);
        } else {
            await pline('You hit it.');
        }
    }

    if (destroyed) {
        await killed(mon);
        return false; // died
    }
    // C: !destroyed → wakeup; maybe_knockback → mhitm_knockback
    // (rn2(3)+rn2(chance) before gates; hurtle body still stubbed)
    wakeup(mon, true);
    if (maybe_knockback) {
        let mattk = get_mattk(game.youmonst, 0);
        // set_uasmon deferred — non-poly hero form is AT_WEAP AD_PHYS
        if (mattk.aatyp === AT_NONE) {
            mattk = { aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 0, damd: 0 };
        }
        mhitm_knockback(game.youmonst, mon, mattk, M_ATTK_HIT, true);
    }
    return true;
}

/**
 * C ref: uhitm.c known_hitum — missum or hmon; flee rn2(25) if survives low.
 */
async function known_hitum(mon, weapon, mhit, rollneeded, armorpenalty, uattk, dieroll) {
    let malive = true;
    if (!mhit.v) {
        // missum — near-miss flavor when rollneeded+penalty > dieroll
        void (rollneeded + armorpenalty > dieroll);
        await pline(`You miss ${mon_nam(mon)}.`);
        // C missum: if (!helpless(mdef)) wakeup(mdef, TRUE)
        if (!mon.msleeping && mon.mcanmove !== 0) {
            wakeup(mon, true);
        }
    } else {
        if (weapon && (weapon.oclass === WEAPON_CLASS
            || game.objects?.[weapon.otyp]?.oc_skill != null)) {
            if (!game.u.uconduct) game.u.uconduct = {};
            game.u.uconduct.weaphit = (game.u.uconduct.weaphit | 0) + 1;
        }
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
 * Named omissions: full AD_PLYS gaze/cube / ugolemeffects / split_mon /
 * erode_armor / done_in_by stone / attk_protection detail; dokick callers.
 */
async function passive(mon, weapon, mhitb, maliveb, aatyp, wep_was_destroyed) {
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
                // healmon / split_mon deferred — still burn healmon rn2(2)
                void ((tmp + rn2(2)) / 2);
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
 */
function mon_maybe_unparalyze(mtmp) {
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
 * C ref: do_name.c a_monnam — ARTICLE_A lowercase (hallu/invis deferred).
 */
function a_monnam(mtmp) {
    if (!mtmp) return 'a monster';
    if (mtmp.mextra?.mgivenname) return mtmp.mextra.mgivenname;
    const raw = mtmp?.data?.name || 'monster';
    const plain = String(raw).replace(/^PM_/, '').replace(/_/g, ' ').toLowerCase();
    const an = /^[aeiou]/i.test(plain) ? 'an' : 'a';
    return `${an} ${plain}`;
}

/**
 * C ref: uhitm.c that_is_a_mimic — name fake object via object_from_map/mksobj.
 * Blind / hallu / invis / cmap-furniture defsyms / trapped-chest glyph deferred.
 */
async function that_is_a_mimic(mtmp, mimic_flags) {
    const reveal_it = (mimic_flags & MIM_REVEAL) !== 0;
    let msg = null;

    const ap = M_AP_TYPE(mtmp);
    if (ap === M_AP_OBJECT && mtmp.mappearance) {
        // C: object_from_map → mksobj(glyphotyp, FALSE, FALSE) → next_ident
        const otmp = mksobj(mtmp.mappearance, false, false);
        const otmp_name = objectNameStrs[otmp?.otyp] || 'strange object';
        // is_plural deferred → singular That/is
        let what;
        if (mtmp.data?.mlet === 'S_MIMIC'
            && (mtmp.msleeping || mtmp.mfrozen)) {
            // C: x_monnam(..., "sleeping", ...)
            const raw = mtmp?.data?.name || 'monster';
            const plain = String(raw).replace(/^PM_/, '').replace(/_/g, ' ').toLowerCase();
            what = `a sleeping ${plain}`;
        } else {
            what = a_monnam(mtmp);
        }
        msg = `That ${otmp_name} is ${what}!`;
        // dealloc fakeobj — no floor link
    } else if (ap === M_AP_FURNITURE) {
        // defsyms explanation deferred — generic Wait message
        msg = `Wait!  That's ${a_monnam(mtmp)}!`;
    } else if (ap === M_AP_MONSTER) {
        msg = `Wait!  That's ${a_monnam(mtmp)}!`;
    } else {
        msg = `Wait!  That's ${a_monnam(mtmp)}!`;
    }

    if (msg) await pline(msg);
    if (reveal_it) seemimic(mtmp);
}

/**
 * C ref: uhitm.c stumble_onto_mimic — reveal + wakeup(FALSE).
 * AD_STCK set_ustuck / map_invisible deferred.
 */
async function stumble_onto_mimic(mtmp) {
    await that_is_a_mimic(mtmp, MIM_REVEAL);
    wakeup(mtmp, false);
}

/**
 * C ref: uhitm.c attack_checks — disguised-mimic arm only.
 * Returns true when the attack attempt is consumed (stumble).
 * Invis-marker / peaceful-confirm / Elbereth arms deferred.
 */
async function attack_checks_mimic(mtmp) {
    // C: forcefight → return FALSE (allow real attack)
    if (game.context?.forcefight) return false;
    // Protection_from_shape_changers / sensemon deferred
    if (!M_AP_TYPE(mtmp)) return false;
    // glyph_is_invisible → seemimic + return FALSE deferred
    await stumble_onto_mimic(mtmp);
    return true;
}

/**
 * C ref: uhitm.c do_attack — safemon displace, else attack → hitum.
 * attack_checks: disguised mimic stumble before overexertion; other arms
 * (invis Wait, peaceful yn) still deferred for visible hostiles.
 */
export async function do_attack(mtmp) {
    if (!mtmp) return false;

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
                let fleetime = rnd(6);
                if (!fleetime) {
                    mtmp.mfleetim = 0;
                } else if (!mtmp.mflee || mtmp.mfleetim) {
                    fleetime += (mtmp.mfleetim | 0);
                    if (fleetime === 1) fleetime++;
                    mtmp.mfleetim = Math.min(fleetime, 127);
                }
                mtmp.mflee = 1;
                // mon_track_clear / fleemsg / Vrock gas deferred
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

    // C: attack_checks mimic stumble before overexertion / hitum
    if (await attack_checks_mimic(mtmp)) {
        return true;
    }

    // check_capacity / overexertion
    if (overexertion()) {
        return true; // fainted
    }

    exercise(A_STR, true); // you're exercising muscles
    // u_wipe_engr(3) — no RNG when no engraving

    // Leprechaun evade !rn2(7) deferred (not kobold)

    // Human form → hitum with youmonst first mattk (AT_WEAP)
    const uattk = { aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 1, damd: 6 };
    await hitum(mtmp, uattk);
    if (mtmp.mstrategy != null) mtmp.mstrategy &= ~STRAT_WAITMASK;
    return true;
}

export function mon_at(x, y) {
    return m_at(x, y);
}
