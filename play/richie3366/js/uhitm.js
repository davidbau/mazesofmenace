// uhitm.js — Hero hitting monsters (partial).
// C ref: uhitm.c — do_attack / hitum / known_hitum / find_roll_to_hit / hmon;
//         hack.c overexertion; mon.c killed / xkilled / corpse_chance.

import { game } from './gstate.js';
import { rn2, rnd } from './rng.js';
import {
    IS_OBSTRUCTED, HMON_MELEE, STRAT_WAITMASK,
    XKILL_GIVEMSG, XKILL_NOMSG, XKILL_NOCORPSE, XKILL_NOCONDUCT,
    LL_CONDUCT,
} from './const.js';
import { WEAPON_CLASS, objectNameStrs } from './objects.js';
import { exercise, A_STR, A_DEX, acurr } from './attrib.js';
import { overexertion } from './hack.js';
import { pline, newsym } from './display.js';
import { dmgval } from './weapon.js';
import { find_mac, AT_WEAP, AD_PHYS } from './mhitm.js';
import { verysmall, G_FREQ } from './monsters.js';
import { relobj_on_death } from './mkobj.js';
import { record_mvitals_died } from './mon.js';
import { livelog_printf } from './pline.js';
import { experience, more_experienced, newexplevel } from './exper.js';

function mon_nam(mtmp) {
    // C mon_nam — ARTICLE_THE lowercase; named → bare
    if (!mtmp) return 'it';
    if (mtmp.mextra?.mgivenname) return mtmp.mextra.mgivenname;
    const raw = mtmp?.data?.name || 'monster';
    const plain = String(raw).replace(/^PM_/, '').replace(/_/g, ' ').toLowerCase();
    return `the ${plain}`;
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

/**
 * C ref: weapon.c weapon_hit_bonus — skill bonus; skills stubbed → 0
 * (named omission: P_SKILL / restricted −4). Enough for L1 hit vs dieroll.
 */
function weapon_hit_bonus(_weapon) {
    return 0;
}

/**
 * C ref: weapon.c hitval — spe + type vs mon; silver/artifact deferred.
 */
function hitval(otmp, _mon) {
    if (!otmp) return 0;
    return otmp.spe | 0;
}

/**
 * C ref: uhitm.c find_roll_to_hit — to-hit threshold before rnd(20).
 * check_caitiff / monk armor / encumbrance / trap penalties deferred when
 * they do not change RNG order for ordinary L1 melee.
 */
function find_roll_to_hit(mtmp, aatyp, weapon, attk_count, role_roll_penalty) {
    role_roll_penalty.v = 0;
    const u = game.u || {};
    let tmp = 1 + abon() + find_mac(mtmp) + (u.uhitinc | 0)
        + (u.ulevel | 0); // maybe_polyd → ulevel when not poly
    // Luck sgn*(abs+2)/3 deferred (Luck 0 early)
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

// C ref: mon.c corpse_chance — ordinary dlvl1
function corpse_chance(mon) {
    const mdat = mon.data;
    if (!mdat) return false;
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
 * C ref: mon.c xkilled — hero kill; treasure !rn2(6) then corpse_chance.
 * make_corpse / mkobj body deferred (RNG burned).
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
        const verb = 'kill'; // nonliving → destroy deferred
        await pline(`You ${verb} ${mon_nam(mtmp)}!`);
    }
    mondead(mtmp);
    if ((mtmp.mhp | 0) >= 1) return; // lifesaved
    const mdat = mtmp.data;
    const mndx = mtmp.mnum ?? mdat?.mndx;
    if (!nocorpse) {
        // accessible/pool gate deferred — always attempt RNG like floor tile
        if (!rn2(6)) {
            // mkobj(RANDOM_CLASS) treasure drop deferred
        }
        corpse_chance(mtmp);
    }
    // C ref: mon.c xkilled cleanup — experience after corpse; murder/luck/
    // alignment adjust deferred when they would burn RNG (peaceful rn2)
    const died = game.mvitals?.[mndx]?.died | 0;
    const tmp = experience(mtmp, died);
    more_experienced(tmp, 0);
    await newexplevel();
    void x;
    void y;
}

async function killed(mtmp) {
    await xkilled(mtmp, XKILL_GIVEMSG);
}

/**
 * C ref: uhitm.c hmon / hmon_hitmon — melee weapon or bare-hand physical.
 * Poison / joust / stagger / live knockback / pudding split deferred.
 * Hit pline: hmon_hitmon_msg_hit skips when destroyed (melee); thrown
 * multishot exception deferred.
 */
async function hmon(mon, obj, thrown, _dieroll) {
    let dmg = 0;
    if (!obj) {
        // bare hands: rnd(2) or martial rnd(4)
        dmg = rnd(2);
    } else if (obj.oclass === WEAPON_CLASS
        || game.objects?.[obj.otyp]?.oc_skill != null) {
        dmg = dmgval(obj, mon);
    } else {
        dmg = dmgval(obj, mon);
    }
    // dmg_recalc: udaminc + dbon + skill — dbon/skill 0 for early STR/skills
    dmg += (game.u?.udaminc | 0);
    if (dmg < 1) dmg = 1;

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

    // C: msg_hit only if !hittxt && (!destroyed || thrown-multishot)
    if (thrown === HMON_MELEE && !destroyed) {
        if (game.flags?.verbose !== false) {
            // canseemon ? exclam(dmg) : "." — period stand-in; full exclam later
            await pline(`You hit ${mon_nam(mon)}.`);
        } else {
            await pline('You hit it.');
        }
    }

    if (destroyed) {
        await killed(mon);
        return false; // died
    }
    // live knockback deferred (would burn rn2 after damage)
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
    } else {
        if (weapon && (weapon.oclass === WEAPON_CLASS
            || game.objects?.[weapon.otyp]?.oc_skill != null)) {
            if (!game.u.uconduct) game.u.uconduct = {};
            game.u.uconduct.weaphit = (game.u.uconduct.weaphit | 0) + 1;
        }
        malive = await hmon(mon, weapon, HMON_MELEE, dieroll);
        if (malive) {
            if (!rn2(25) && (mon.mhp | 0) < (mon.mhpmax | 0) / 2) {
                // monflee — duration !rn2(3)?rnd(100):0 deferred body
                if (!rn2(3)) rnd(100);
            }
        }
    }
    void uattk;
    return malive;
}

/**
 * C ref: uhitm.c hitum — find_roll_to_hit, rnd(20), known_hitum, passive.
 * Cleaver / twoweapon / double_punch deferred.
 */
async function hitum(mon, uattk) {
    const uwep = game.u?.uwep || null;
    const attk_count = { v: 0 };
    const role_roll_penalty = { v: 0 };
    // twohits = 0 for single-weapon L1
    const tmp = find_roll_to_hit(mon, uattk.aatyp, uwep, attk_count, role_roll_penalty);
    // mon_maybe_unparalyze deferred
    const dieroll = rnd(20);
    const mhit = { v: (tmp > dieroll || !!game.u?.uswallow) ? 1 : 0 };
    if (tmp > dieroll) exercise(A_DEX, true);

    const malive = await known_hitum(
        mon, uwep, mhit, tmp, role_roll_penalty.v, uattk, dieroll,
    );
    // passive(mon, uwep, mhit, malive, AT_WEAP, …) — no RNG when dead / no passive
    void malive;
    return malive;
}

/**
 * C ref: uhitm.c do_attack — safemon displace, else attack → hitum.
 * attack_checks invis/mimic/peaceful-confirm omitted for visible hostiles.
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
        // inshop check skipped when foo (no RNG)
        if (foo) {
            // C: if tame → monflee(rnd(6)); stop
            if (mtmp.mtame) {
                rnd(6); // monflee duration — flee body stubbed
            }
            game.context.move = 0;
            return true;
        }
        // Frozen / helpless check — no RNG for normal pet
        // C: else return FALSE → allow swap
        return false;
    }

    // Hostile / forcefight path — C do_attack continues into attack body
    // attack_checks: clear WAITMASK; return FALSE for visible hostiles
    if (mtmp.mstrategy != null) mtmp.mstrategy &= ~STRAT_WAITMASK;

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
