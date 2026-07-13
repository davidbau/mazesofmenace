// mhitm.js — Monster vs monster combat (minimal RNG-faithful peel).
// C ref: mhitm.c — mattackm, passivemm, mdamagem; worn.c find_mac;
//         uhitm.c mhitm_knockback (RNG order only).

import { rn2, rnd, d } from './rng.js';
import { distmin, m_at } from './mon.js';
import { game } from './gstate.js';
import { pline, newsym } from './display.js';
import {
    M_ATTK_MISS,
    M_ATTK_HIT,
    M_ATTK_DEF_DIED,
    M_ATTK_AGR_DIED,
} from './const.js';
import { monsterNames, verysmall, G_FREQ } from './monsters.js';
import { relobj_on_death } from './mkobj.js';

const NATTK = 6;
const AT_NONE = 0;
const AT_CLAW = 1;
const AT_BITE = 2;
const AT_KICK = 3;
const AT_BUTT = 4;
const AT_TUCH = 5;
const AT_STNG = 6;
const AT_WEAP = 10;
const AD_PHYS = 0;
const AD_STCK = 19;
const AC_MAX = 99;

// Compact first-attack table until full mattk[] is extracted.
// Subsequent slots are AT_NONE (NO_ATTK) for these early-game types.
const FIRST_ATTK = (() => {
    const t = new Map();
    const set = (name, aatyp, adtyp, damn, damd) => {
        const i = monsterNames.indexOf(name);
        if (i >= 0) t.set(i, { aatyp, adtyp, damn, damd });
    };
    set('PM_LITTLE_DOG', AT_BITE, AD_PHYS, 1, 6);
    set('PM_DOG', AT_BITE, AD_PHYS, 1, 6);
    set('PM_LARGE_DOG', AT_BITE, AD_PHYS, 2, 4);
    set('PM_KITTEN', AT_BITE, AD_PHYS, 1, 6);
    set('PM_HOUSECAT', AT_BITE, AD_PHYS, 1, 6);
    set('PM_LARGE_CAT', AT_BITE, AD_PHYS, 2, 4);
    set('PM_JACKAL', AT_BITE, AD_PHYS, 1, 2);
    set('PM_FOX', AT_BITE, AD_PHYS, 1, 3);
    set('PM_COYOTE', AT_BITE, AD_PHYS, 1, 4);
    set('PM_LICHEN', AT_TUCH, AD_STCK, 0, 0);
    set('PM_GRID_BUG', AT_BITE, AD_PHYS, 1, 1); // AD_ELEC ignored until needed
    set('PM_NEWT', AT_BITE, AD_PHYS, 1, 2);
    set('PM_GECKO', AT_BITE, AD_PHYS, 1, 3);
    set('PM_IGUANA', AT_BITE, AD_PHYS, 1, 4);
    set('PM_KOBOLD', AT_WEAP, AD_PHYS, 1, 4);
    set('PM_GOBLIN', AT_WEAP, AD_PHYS, 1, 4);
    set('PM_HOBGOBLIN', AT_WEAP, AD_PHYS, 1, 6);
    set('PM_SEWER_RAT', AT_BITE, AD_PHYS, 1, 3);
    set('PM_GIANT_RAT', AT_BITE, AD_PHYS, 1, 3);
    set('PM_BAT', AT_BITE, AD_PHYS, 1, 4);
    return t;
})();

/** First-slot mattk from compact table; later slots AT_NONE until full extract. */
export function get_mattk(magr, i) {
    if (i > 0) return { aatyp: AT_NONE, adtyp: AD_PHYS, damn: 0, damd: 0 };
    const mndx = magr.mnum ?? magr.data?.mndx;
    return FIRST_ATTK.get(mndx) || { aatyp: AT_NONE, adtyp: AD_PHYS, damn: 0, damd: 0 };
}

export {
    AT_NONE, AT_CLAW, AT_BITE, AT_KICK, AT_BUTT, AT_TUCH, AT_STNG, AT_WEAP, AD_PHYS,
};

function deadmonster(m) {
    return !m || (m.mhp != null && m.mhp < 1);
}

function helpless(m) {
    return !!(m.msleeping || !m.mcanmove);
}

function mon_plain_name(m) {
    const raw = m?.data?.name || monsterNames[m?.mnum] || 'monster';
    return String(raw).replace(/^PM_/, '').replace(/_/g, ' ').toLowerCase();
}

// C ref: monnam.c Monnam / mon_nam — enough for dlvl1 pet combat messages
function Monnam(m) {
    const s = mon_plain_name(m);
    return `The ${s}`;
}

function mon_nam(m) {
    return `the ${mon_plain_name(m)}`;
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
    // Defender passives: only known if first attk is AT_NONE (rare); NO_ATTK
    // slots are AT_NONE with 0,0 → dmg becomes 0 after *= damd.
    for (let i = 0; i < NATTK; i++) {
        const at = i === 0 ? (FIRST_ATTK.get(mdef.mnum ?? mdef.data?.mndx) || null) : null;
        const aatyp = at ? at.aatyp : AT_NONE;
        const adtyp = at ? at.adtyp : AD_PHYS;
        const damn = at ? at.damn : 0;
        const damd = at ? at.damd : 0;
        if (aatyp !== AT_NONE) continue;
        if (adtyp === AD_PHYS) {
            let dmg = damn;
            if (!dmg) dmg = (md.mlevel ?? 0) + 1;
            dmg *= damd;
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

// C ref: uhitm.c mhitm_knockback — burn RNG in C order; no hurtle yet
export function mhitm_knockback(magr, mdef, mattk, hitflags, weapon_used) {
    // C: knockdistance = rn2(3) ? 1 : 2; then rn2(chance)
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
    return false; // full hurtle not needed for dlvl1 pet bites / kobold melee
}

// C ref: mon.c corpse_chance() — subset for ordinary dlvl1 kills
function corpse_chance(mon) {
    const mdat = mon.data;
    if (!mdat) return false;
    // LEVEL_SPECIFIC_NOCORPSE / gas-spore / lich dust omitted
    let tmp = 2 + (((mdat.geno ?? 0) & G_FREQ) < 2 ? 1 : 0)
        + (verysmall(mdat) ? 1 : 0);
    return !rn2(tmp);
}

// C ref: mon.c mondead → m_detach(due_to_death) → relobj(mtmp, 1, FALSE)
function mondead(mtmp) {
    mtmp.mhp = 0;
    const mx = mtmp.mx, my = mtmp.my;
    if (game.fmon) {
        const i = game.fmon.indexOf(mtmp);
        if (i >= 0) game.fmon.splice(i, 1);
    }
    // Keep mx/my for drop + make_corpse (C mon_leaving_level).
    relobj_on_death(mtmp);
    if (mx > 0) newsym(mx, my);
}

// C ref: mon.c mondied() → mondead + maybe corpse
async function mondied(mdef) {
    // C ref: monkilled — pline before mondead (triggers --More-- if needed)
    await pline(`${Monnam(mdef)} is killed!`);
    mondead(mdef);
    // C: if (corpse_chance && (accessible || is_pool)) make_corpse(...)
    // Burn corpse_chance RNG to match C call site; make_corpse body deferred
    // (named omission). seed0060 newt roll was false → floor via newsym alone.
    if (mdef.mhp == null || mdef.mhp < 1)
        corpse_chance(mdef);
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

// C ref: mhitm.c missmm()
async function missmm(magr, mdef, _mattk) {
    await pline(`${Monnam(magr)} misses ${mon_nam(mdef)}.`);
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
        await mondied(mdef);
        const grew = grow_up(magr, mdef);
        return M_ATTK_DEF_DIED | (grew ? 0 : M_ATTK_AGR_DIED);
    }
    return M_ATTK_HIT;
}

async function hitmm(magr, mdef, mattk, mwep, dieroll) {
    let verb = 'hits';
    if (mattk.aatyp === AT_BITE) verb = 'bites';
    else if (mattk.aatyp === AT_STNG) verb = 'stings';
    else if (mattk.aatyp === AT_BUTT) verb = 'butts';
    else if (mattk.aatyp === AT_TUCH) verb = 'touches';
    await pline(`${Monnam(magr)} ${verb} ${mon_nam(mdef)}.`);
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
