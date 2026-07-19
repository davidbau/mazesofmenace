// mhitm.js — Monster vs monster combat (minimal RNG-faithful peel).
// C ref: mhitm.c — mattackm, passivemm, mdamagem; worn.c find_mac;
//         uhitm.c mhitm_knockback (RNG order only).

import { rn2, rnd, d } from './rng.js';
import { distmin, m_at, record_mvitals_died, undead_to_corpse, monnear } from './mon.js';
import { game } from './gstate.js';
import { pline, newsym, canspotmon, map_invisible, unmap_object, glyph_is_invisible } from './display.js';
import { cansee } from './vision.js';
import { dist2 } from './hacklib.js';
import { resist_conflict } from './mondata.js';
import {
    M_ATTK_MISS,
    M_ATTK_HIT,
    M_ATTK_DEF_DIED,
    M_ATTK_AGR_DIED,
    CORPSTAT_INIT,
    CORPSTAT_FEMALE,
    CORPSTAT_MALE,
    CORPSTAT_NONE,
    W_ARMOR,
    TAINT_AGE,
    NORMAL_SPEED,
    engulfing_u,
} from './const.js';
import {
    verysmall, G_FREQ, G_NOCORPSE, is_neuter, nonliving,
    bigmonst, is_golem, is_mplayer, is_rider, monsterNames,
} from './monsters.js';
import { objectNames } from './objects.js';
import { relobj_on_death, mkcorpstat, stackobj } from './mkobj.js';
import { Monnam, mon_nam } from './do_name.js';
import { mon_explodes } from './explode.js';

const CORPSE = objectNames.indexOf('CORPSE');
const PM_LIZARD = monsterNames.indexOf('PM_LIZARD');

const NATTK = 6;
// C ref: monattk.h — AT_SPIT is 10; AT_WEAP/AT_MAGC are 254/255 (not 10).
const AT_NONE = 0;
const AT_CLAW = 1;
const AT_BITE = 2;
const AT_KICK = 3;
const AT_BUTT = 4;
const AT_TUCH = 5;
const AT_STNG = 6;
const AT_HUGS = 7;
const AT_SPIT = 10;
const AT_ENGL = 11;
const AT_BREA = 12;
const AT_EXPL = 13;
const AT_BOOM = 14;
const AT_GAZE = 15;
const AT_TENT = 16;
const AT_WEAP = 254;
const AT_MAGC = 255;
const AD_PHYS = 0;
const AD_ELEC = 6;
const AD_DRST = 7; /* drains str (poison) — monattk.h */
const AD_DRDX = 8;
const AD_DRCO = 9;
const AD_STCK = 19;
const AD_SITM = 21; /* steals item (nymphs) — monattk.h */
const AD_SEDU = 22; /* seduces & steals multiple items */
const AD_SSEX = 35; /* Succubus seduction (extended) */
const AC_MAX = 99;

const NO_ATTK = { aatyp: AT_NONE, adtyp: AD_PHYS, damn: 0, damd: 0 };

/** Per-attack visibility; set in mattackm like C gv.vis. */
let _mm_vis = false;

/** C ref: monmove.c / muse.c mdistu — squared distance to hero. */
function mdistu(mtmp) {
    const u = game.u;
    if (!u || mtmp?.mx == null) return 0;
    return dist2(mtmp.mx, mtmp.my, u.ux, u.uy);
}

/**
 * C ref: pline.c You_hear — acoustics/Deaf gate; Unaware/Underwater deferred.
 * Local copy for mhitm; trap.js has its own until shared export.
 */
async function You_hear(line) {
    const u = game.u || {};
    if (u.Deaf || game.flags?.acoustics === false) return;
    await pline(`You hear ${line}`);
}

/**
 * C ref: mhitm.c noises — out-of-sight m-vs-m combat feedback.
 * Rate-limited via gf.far_noise / gn.noisetime (stored on game).
 * Named omission: explmm AT_EXPL path shares this helper when wired.
 */
async function noises(magr, mattk) {
    const farq = mdistu(magr) > 15;
    const far_noise = !!game.far_noise;
    const noisetime = game.noisetime | 0;
    const moves = game.moves | 0;
    if (!game.u?.Deaf && (farq !== far_noise || moves - noisetime > 10)) {
        game.far_noise = farq;
        game.noisetime = moves;
        const what = (mattk?.aatyp | 0) === AT_EXPL ? 'an explosion' : 'some noises';
        await You_hear(`${what}${farq ? ' in the distance' : ''}.`);
    }
}

/**
 * C ref: mhitu.c getmattk — base mptr->mattk[indx] (substitutions deferred).
 * Uses extracted monsters_data mattks (mons().mattk), not a hand table.
 */
export function get_mattk(magr, i) {
    if (i < 0 || i >= NATTK) return { ...NO_ATTK };
    const slots = magr?.data?.mattk;
    if (!slots || !slots[i]) return { ...NO_ATTK };
    const a = slots[i];
    return {
        aatyp: a.aatyp | 0,
        adtyp: a.adtyp | 0,
        damn: a.damn | 0,
        damd: a.damd | 0,
    };
}

export {
    AT_NONE, AT_CLAW, AT_BITE, AT_KICK, AT_BUTT, AT_TUCH, AT_STNG, AT_HUGS,
    AT_SPIT, AT_ENGL, AT_BREA, AT_EXPL, AT_BOOM, AT_GAZE, AT_TENT,
    AT_WEAP, AT_MAGC, AD_PHYS, AD_ELEC, AD_DRST, AD_DRDX, AD_DRCO,
    AD_SITM, AD_SEDU, AD_SSEX,
};

function deadmonster(m) {
    return !m || (m.mhp != null && m.mhp < 1);
}

function helpless(m) {
    return !!(m.msleeping || !m.mcanmove);
}

// C ref: worn.c find_mac() — base AC, no worn armor peel yet
export function find_mac(mon) {
    let base = mon.data?.ac ?? 10;
    if (Math.abs(base) > AC_MAX) base = Math.sign(base) * AC_MAX;
    return base;
}

// C ref: mondata.c max_passive_dmg() — AT_NONE AD_PHYS/elemental only
function max_passive_dmg(mdef, magr) {
    const md = mdef.data;
    if (!md) return 0;
    let multi2 = 0;
    for (let i = 0; i < NATTK; i++) {
        const a = get_mattk(magr, i).aatyp;
        if (a === AT_CLAW || a === AT_BITE || a === AT_KICK || a === AT_BUTT
            || a === AT_TUCH || a === AT_STNG || a === AT_WEAP) multi2++;
    }
    // Defender passives: AT_NONE slots; NO_ATTK is AT_NONE 0,0 → dmg 0.
    for (let i = 0; i < NATTK; i++) {
        const at = get_mattk(mdef, i);
        if (at.aatyp !== AT_NONE) continue;
        if (at.adtyp === AD_PHYS) {
            let dmg = at.damn;
            if (!dmg) dmg = (md.mlevel ?? 0) + 1;
            dmg *= at.damd;
            return dmg * multi2;
        }
        break;
    }
    return 0;
}

export { max_passive_dmg };

// C ref: mhitm.c passivemm() — always burns rn2(3) when defender alive
function passivemm(magr, mdef, mhitb, mdead) {
    const mhit = mhitb ? M_ATTK_HIT : M_ATTK_MISS;
    // Find AT_NONE slot (NO_ATTK for jackal/lichen at i>=1)
    let i = 0;
    for (;; i++) {
        if (i >= NATTK) return mdead | mhit;
        const mattk = get_mattk(mdef, i);
        if (mattk.aatyp === AT_NONE) break;
    }
    const mattk = get_mattk(mdef, i);
    void mattk;
    if (mdead || deadmonster(mdef)) return mdead | mhit;
    // C always rolls rn2(3) for passives even when AT_NONE does nothing
    rn2(3);
    return mdead | mhit;
}

/**
 * C ref: mhitu.c magic_negation — worn armor a_can max for hero.
 * Amulet/extrinsic Protection bumps deferred (same as invent subset).
 */
function magic_negation_you() {
    let mc = 0;
    for (const o of game.invent || []) {
        if (((o.owornmask || 0) & W_ARMOR) !== 0) {
            const armpro = game.objects?.[o.otyp]?.oc_level ?? 0;
            if (armpro > mc) mc = armpro;
        }
    }
    return mc;
}

/**
 * C ref: uhitm.c mhitm_mgc_atk_negated — cancellation / MC gate.
 * Always burns rn2(10) unless attacker is cancelled (mcan → TRUE, no roll).
 * mdef null = hero (&gy.youmonst). Verbose pline only when thwarted.
 */
export async function mhitm_mgc_atk_negated(magr, mdef, verbosely) {
    // C: magr != &youmonst && magr->mcan → TRUE (no message)
    if (magr != null && magr.mcan) return true;

    const armpro = (mdef == null) ? magic_negation_you() : 0;
    // Named omission: monster-defender magic_negation (minvent a_can) —
    // not needed until m-vs-m elemental peels call this with mdef set.
    const negated = !(rn2(10) >= 3 * armpro);
    if (negated) {
        if (verbosely) {
            if (mdef == null) await pline('You avoid harm.');
            // mon-visible "avoids harm" deferred
        }
        return true;
    }
    return false;
}

// C ref: uhitm.c mhitm_knockback — burn RNG in C order; hurtle body deferred.
// Called from mhitu hitmu, mhitm mdamagem, and uhitm hmon (maybe_knockback).
export function mhitm_knockback(magr, mdef, mattk, hitflags, weapon_used) {
    // C: knockdistance = rn2(3) ? 1 : 2; then if (rn2(chance)) return
    // (chance=6 unless ART_OGRESMASHER; artifact arm deferred)
    rn2(3);
    rn2(6);
    if (!(mattk.aatyp === AT_CLAW || mattk.aatyp === AT_KICK
            || mattk.aatyp === AT_BUTT || mattk.aatyp === AT_WEAP)) {
        return false;
    }
    void magr;
    void mdef;
    void weapon_used;
    void hitflags;
    // Named omission: size/weapon/steadfast gates + hurtle/mhurtle body
    return false;
}

/**
 * C ref: mon.c corpse_chance() — AT_BOOM then always-TRUE arms then !rn2(tmp).
 * Named omissions: Vlad/lich dust; swallowed boom; LEVEL_SPECIFIC_NOCORPSE.
 */
async function corpse_chance(mon) {
    const mdat = mon.data;
    if (!mdat) return false;
    const slots = mdat.mattk;
    if (slots) {
        for (let i = 0; i < NATTK; i++) {
            const at = slots[i];
            if (!at || (at.aatyp | 0) !== AT_BOOM) continue;
            if (at.damn) d(at.damn | 0, at.damd | 0);
            else if (at.damd) d((mdat.mlevel | 0) + 1, at.damd | 0);
            await mon_explodes(mon, at);
            return false;
        }
    }
    if ((((bigmonst(mdat) || (mdat.mndx ?? -1) === PM_LIZARD) && !mon.mcloned)
        || is_golem(mdat) || is_mplayer(mdat) || is_rider(mdat) || mon.isshk)) {
        return true;
    }
    let tmp = 2 + (((mdat.geno ?? 0) & G_FREQ) < 2 ? 1 : 0)
        + (verysmall(mdat) ? 1 : 0);
    return !rn2(tmp);
}

// C ref: mon.c make_corpse — undead specials before G_NOCORPSE; else default_1.
// Named omission: dragon scales, unicorn horn, worm tooth, golem drops,
// lich dust, and other pre-G_NOCORPSE switch arms (D-0271 undead only).
export function make_corpse(mtmp) {
    const mdat = mtmp.data;
    const mndx = mtmp.mnum ?? mdat?.mndx;
    const x = mtmp.mx, y = mtmp.my;
    if (mndx == null || mndx < 0) return null;

    let corpstatflags = CORPSTAT_NONE;
    if (mtmp.female) corpstatflags |= CORPSTAT_FEMALE;
    else if (!is_neuter(mdat)) corpstatflags |= CORPSTAT_MALE;

    // C: zombie/mummy/vampire arms precede G_NOCORPSE (geno has G_NOCORPSE
    // so wishes cannot create those corpses, but kills still leave a mapped
    // living-species corpse via undead_to_corpse).
    const living = undead_to_corpse(mndx);
    if (living !== mndx) {
        corpstatflags |= CORPSTAT_INIT;
        // C: always pass mtmp for undead (not KEEPTRAITS)
        const obj = mkcorpstat(CORPSE, mtmp, living, x, y, corpstatflags);
        if (obj) {
            obj.age = (obj.age | 0) - (TAINT_AGE + 1);
            stackobj(obj);
            newsym(x, y);
        }
        return obj;
    }

    if ((game.mvitals?.[mndx]?.mvflags ?? 0) & G_NOCORPSE) return null;

    corpstatflags |= CORPSTAT_INIT;
    const keep = !!(mtmp.mtame || mtmp.isshk);
    const obj = mkcorpstat(CORPSE, keep ? mtmp : null, mdat, x, y, corpstatflags);
    if (obj) {
        stackobj(obj);
        newsym(x, y);
    }
    return obj;
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
    // Keep mx/my for drop + make_corpse (C mon_leaving_level).
    relobj_on_death(mtmp);
    // C mon.c mondead: glyph_is_invisible → unmap_object before detach display
    if (mx > 0 && glyph_is_invisible(game.level?.at?.(mx, my))) {
        unmap_object(mx, my);
    }
    if (mx > 0) newsym(mx, my);
}

/**
 * C ref: mon.c mondied() — mondead + maybe make_corpse (no kill pline).
 * Named omission: accessible||is_pool gate (floor tiles always attempt).
 */
export async function mondied(mdef) {
    mondead(mdef);
    if ((mdef.mhp | 0) > 0) return; /* lifesaved */
    if (await corpse_chance(mdef)) make_corpse(mdef);
}

/**
 * C ref: mon.c monkilled — pline then mondied (or mondead if disintegested).
 * Named omissions: worm_known; AD_DGST/RBRE/FIRE disintegested; pet roast.
 */
async function monkilled(mdef, fltxt, _how) {
    const txt = fltxt || '';
    if (cansee(mdef.mx, mdef.my)) {
        const verb = nonliving(mdef.data) ? 'destroyed' : 'killed';
        await pline(
            `${Monnam(mdef)} is ${verb}${txt ? ' by the ' : ''}${txt}!`,
        );
    } else if (mdef.mtame) {
        game.iflags = game.iflags || {};
        game.iflags.sad_feeling = true;
    }
    // disintegested → mondead-only deferred; ordinary path uses mondied
    await mondied(mdef);
}

// C ref: makemon.c grow_up() — HP gain from kill; transform later
function grow_up(mtmp, victim) {
    if (deadmonster(mtmp)) return null;
    if (!victim) {
        const gain = rnd(8);
        mtmp.mhpmax += gain;
        mtmp.mhp += gain;
        return mtmp.data;
    }
    let hp_threshold = (mtmp.m_lev || 0) * 8;
    if (!mtmp.m_lev) hp_threshold = 4;
    let max_increase = rnd((victim.m_lev || 0) + 1);
    if (mtmp.mhpmax + max_increase > hp_threshold + 1) {
        max_increase = Math.max((hp_threshold + 1) - mtmp.mhpmax, 0);
    }
    const cur_increase = max_increase > 1 ? rn2(max_increase) : 0;
    mtmp.mhpmax += max_increase;
    mtmp.mhp += cur_increase;
    if (mtmp.mhpmax <= hp_threshold) return mtmp.data;
    mtmp.m_lev = (mtmp.m_lev || 0) + 1;
    return mtmp.data;
}

// C ref: mhitm.c pre_mm_attack — reveal + map_invisible when gv.vis
// Named omission: seemimic / mundetected clear + showit newsym arms
function pre_mm_attack(magr, mdef) {
    if (!_mm_vis) return;
    if (!canspotmon(magr)) map_invisible(magr.mx, magr.my);
    if (!canspotmon(mdef)) map_invisible(mdef.mx, mdef.my);
}

// C ref: mhitm.c missmm() — pline when gv.vis; else noises()
async function missmm(magr, mdef, mattk) {
    pre_mm_attack(magr, mdef);
    if (_mm_vis) {
        await pline(`${Monnam(magr)} misses ${mon_nam(mdef)}.`);
    } else {
        await noises(magr, mattk);
    }
}

// C ref: mhitm.c mdamagem() — physical bite damage + knockback RNG
async function mdamagem(magr, mdef, mattk, mwep, dieroll) {
    let damage = d(mattk.damn || 0, mattk.damd || 0);
    let hitflags = M_ATTK_MISS;
    void dieroll;

    if (mattk.adtyp === AD_STCK) {
        damage = 0;
    }

    mhitm_knockback(magr, mdef, mattk, hitflags, !!mwep);

    if (!damage) return hitflags === M_ATTK_AGR_DIED ? M_ATTK_AGR_DIED : M_ATTK_HIT;

    mdef.mhp -= damage;
    if (mdef.mhp < 1) {
        mdef.mhp = 0;
        // C: mdamagem → monkilled(mdef, "", mattk->adtyp)
        await monkilled(mdef, '', mattk.adtyp | 0);
        const grew = grow_up(magr, mdef);
        return M_ATTK_DEF_DIED | (grew ? 0 : M_ATTK_AGR_DIED);
    }
    return M_ATTK_HIT;
}

// C ref: mhitm.c hitmm() — hit pline when gv.vis; else noises()
// Named omission: full hit verb/silver/seduce arms
async function hitmm(magr, mdef, mattk, mwep, dieroll) {
    pre_mm_attack(magr, mdef);
    if (_mm_vis) {
        let verb = 'hits';
        if (mattk.aatyp === AT_BITE) verb = 'bites';
        else if (mattk.aatyp === AT_STNG) verb = 'stings';
        else if (mattk.aatyp === AT_BUTT) verb = 'butts';
        else if (mattk.aatyp === AT_TUCH) verb = 'touches';
        await pline(`${Monnam(magr)} ${verb} ${mon_nam(mdef)}.`);
    } else {
        await noises(magr, mattk);
    }
    return mdamagem(magr, mdef, mattk, mwep, dieroll);
}

/**
 * C ref: mhitm.c mattackm()
 * Returns M_ATTK_* bitmask. Async: combat pline may await --More--.
 */
export async function mattackm(magr, mdef) {
    if (!magr || !mdef) return M_ATTK_MISS;
    if (helpless(magr)) return M_ATTK_MISS;

    let tmp = find_mac(mdef) + (magr.m_lev || 0);
    if (mdef.mconf || helpless(mdef)) {
        tmp += 4;
        mdef.msleeping = 0;
    }

    // C: gv.vis — see attacker or defender (canspotmon)
    _mm_vis = ((cansee(magr.mx, magr.my) && canspotmon(magr))
        || (cansee(mdef.mx, mdef.my) && canspotmon(mdef)));

    let struck = 0;
    const res = new Array(NATTK).fill(M_ATTK_MISS);

    for (let i = 0; i < NATTK; i++) {
        res[i] = M_ATTK_MISS;
        if (i > 0 && (m_at(mdef.mx, mdef.my) !== mdef
            || deadmonster(magr) || deadmonster(mdef))) {
            continue;
        }

        const mattk = get_mattk(magr, i);
        let mwep = null;
        let attk = 1;
        let strike = 0;

        switch (mattk.aatyp) {
            case AT_WEAP:
            case AT_CLAW:
            case AT_KICK:
            case AT_BITE:
            case AT_STNG:
            case AT_TUCH:
            case AT_BUTT: {
                if (distmin(magr.mx, magr.my, mdef.mx, mdef.my) > 1) continue;
                const dieroll = rnd(20 + i);
                strike = tmp > dieroll ? 1 : 0;
                if (strike) {
                    res[i] = await hitmm(magr, mdef, mattk, mwep, dieroll);
                } else {
                    await missmm(magr, mdef, mattk);
                }
                break;
            }
            default:
                strike = 0;
                attk = 0;
                break;
        }

        if (attk && !(res[i] & M_ATTK_AGR_DIED)
            && distmin(magr.mx, magr.my, mdef.mx, mdef.my) <= 1) {
            res[i] = passivemm(magr, mdef, strike,
                (res[i] & M_ATTK_DEF_DIED), mwep);
        }

        if (res[i] & M_ATTK_DEF_DIED) return res[i];
        if (res[i] & M_ATTK_AGR_DIED) return res[i];
        if (res[i] & M_ATTK_HIT) struck = 1;
    }

    return struck ? M_ATTK_HIT : M_ATTK_MISS;
}

/**
 * C ref: mhitm.c fightm — Conflict-induced mon-vs-mon.
 * Always rolls resist_conflict first. ustuck/itsstuck release deferred.
 * Returns 1 if mtmp made an attack (movemon skips dochug); 0 otherwise.
 */
export async function fightm(mtmp) {
    if (resist_conflict(mtmp)) return 0;

    // C: u.ustuck == mtmp → itsstuck / maybe release — deferred
    const has_u_swallowed = engulfing_u(mtmp);
    const fmon = game.fmon || [];

    for (let i = 0; i < fmon.length; i++) {
        const mon = fmon[i];
        if (!mon || mon === mtmp || (mon.mhp | 0) < 1) continue;
        if (!monnear(mtmp, mon.mx, mon.my)) continue;

        // C: grabber release rn2(4) when mtmp == ustuck && !uswallow — deferred
        const result = await mattackm(mtmp, mon);
        if (result & M_ATTK_AGR_DIED) return 1;
        if (has_u_swallowed) return 0;

        // allow attacked monsters a chance to hit back
        if ((result & (M_ATTK_HIT | M_ATTK_DEF_DIED)) === M_ATTK_HIT
            && rn2(4)
            && (mon.movement | 0) > rn2(NORMAL_SPEED)) {
            if ((mon.movement | 0) > NORMAL_SPEED) mon.movement -= NORMAL_SPEED;
            else mon.movement = 0;
            await mattackm(mon, mtmp);
        }
        return (result & M_ATTK_HIT) ? 1 : 0;
    }
    return 0;
}
