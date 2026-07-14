// explode.js — Monster death explosions (partial).
// C ref: explode.c mon_explodes / explode; zap.c destroy_items / resist
//        (AD_PHYS / MON_EXPLODE gas-spore path).
//
// Branch envelope: AT_BOOM AD_PHYS → PHYS_EXPL_TYPE + MON_EXPLODE;
// 3x3 blast, destroy_items limit rn2(5) (no AD_PHYS destroyables),
// resist vs adjacent mons, hero Half_phys + exercise(A_STR).
// Named omissions: fire/cold/elec/acid/disn/wand explosions; hallu
// rndmonnam; sparkle/shield glyphs; zap_over_floor non-PHYS; shop
// damage; ugolemeffects; Invulnerable; grabbing/engulf double-damage;
// blast-kill → xkilled/monkilled (HP applied; death path deferred);
// wake_nearto side effects beyond msleeping clear; mr table (use 0).

import { game } from './gstate.js';
import { d, rn2 } from './rng.js';
import { pline } from './display.js';
import { cansee } from './vision.js';
import { m_at, setmangry } from './mon.js';
import { Monnam } from './do_name.js';
import { maybe_half_phys } from './hack.js';
import { exercise, A_STR } from './attrib.js';
import { isok, u_at, PHYS_EXPL_TYPE, MON_EXPLODE, EXPL_NOXIOUS, STRAT_WAITMASK, KILLED_BY_AN } from './const.js';
import { pmnames, G_UNIQ } from './monsters.js';

const AD_PHYS = 0; // monattk.h
const DMG_DESTROY_SCALE = 5;
const MAX_ITEMS_DESTROYED = 20;

/** C ref: hacklib.c s_suffix */
function s_suffix(s) {
    const buf = String(s ?? '');
    const low = buf.toLowerCase();
    if (low === 'it') return `${buf}s`;
    if (low === 'you') return `${buf}r`;
    if (buf.endsWith('s') || buf.endsWith('S')) return `${buf}'`;
    return `${buf}'s`;
}

/** C ref: permonst pmname — neutral slot for ordinary monsters. */
function pmname_mon(mon) {
    const mndx = mon?.mnum ?? mon?.data?.mndx;
    if (mndx != null && pmnames[mndx]) {
        const pn = pmnames[mndx];
        return pn[2] || pn[0] || pn[1] || 'monster';
    }
    const raw = mon?.data?.name || 'monster';
    return String(raw).replace(/^PM_/, '').replace(/_/g, ' ').toLowerCase();
}

/**
 * C ref: zap.c destroy_items — AD_PHYS never destroys gear; still burns
 * the dmg/5 limit rn2(DMG_DESTROY_SCALE). Other adtyps deferred.
 */
function destroy_items(_mon, dmgtyp, dmg_in) {
    void dmgtyp; // AD_PHYS: destroyable() always false
    let limit = Math.trunc(dmg_in / DMG_DESTROY_SCALE);
    if ((dmg_in % DMG_DESTROY_SCALE) > rn2(DMG_DESTROY_SCALE)) limit++;
    if (limit > MAX_ITEMS_DESTROYED) limit = MAX_ITEMS_DESTROYED;
    if (limit < 1) return 0;
    return 0;
}

/**
 * C ref: zap.c resist — burn rn2; MON_EXPLODE oclass uses default alev=ulevel.
 * tell/shield and HP application deferred (caller applies damage).
 */
function resist(mtmp, oclass, damage, tell) {
    void damage;
    void tell;
    // oclass classes other than default deferred — MON_EXPLODE → ulevel
    const alev = game.u?.ulevel | 0;
    let dlev = mtmp.m_lev | 0;
    if (dlev > 50) dlev = 50;
    else if (dlev < 1) dlev = 1;
    const mr = mtmp.data?.mr | 0;
    return rn2(100 + alev - dlev) < mr;
}

/** C ref: explode.c adtyp_to_expltype — AD_PHYS → EXPL_NOXIOUS */
function adtyp_to_expltype(adtyp) {
    void adtyp;
    return EXPL_NOXIOUS; // AD_PHYS / gas spore
}

/** C ref: mon.c wake_nearto — clear sleep in radius (no RNG). */
function wake_nearto(x, y, distance) {
    for (const mtmp of game.fmon || []) {
        if (!mtmp || mtmp.mx == null) continue;
        const dx = (mtmp.mx | 0) - (x | 0);
        const dy = (mtmp.my | 0) - (y | 0);
        if (distance === 0 || dx * dx + dy * dy < distance) {
            mtmp.msleeping = 0;
            const geno = mtmp.data?.geno | 0;
            if (!(geno & G_UNIQ) && mtmp.mstrategy != null) {
                mtmp.mstrategy &= ~STRAT_WAITMASK;
            }
        }
    }
}

/**
 * C ref: explode.c explode — PHYS_EXPL_TYPE / MON_EXPLODE subset.
 * Visual beam / shield sparkle deferred; messages + damage/RNG live.
 */
export async function explode(x, y, type, dam, olet, _expltype) {
    void _expltype;
    let damu = dam;
    let uhurt = 0; // 0=unhurt, 1=items only, 2=you+items
    let str = '';
    const adtyp = AD_PHYS; // PHYS_EXPL_TYPE only in this subset
    const you_exploding = olet === MON_EXPLODE && type >= 0;

    if (olet === MON_EXPLODE && !you_exploding) {
        str = game.killer?.name || 'explosion';
    }

    const explmask = [];
    for (let i = 0; i < 3; i++) {
        explmask[i] = [];
        for (let j = 0; j < 3; j++) {
            const xx = x + i - 1;
            const yy = y + j - 1;
            if (!isok(xx, yy)) {
                explmask[i][j] = 4; // EXPL_SKIP
                continue;
            }
            // AD_PHYS: explosionmask leaves EXPL_NONE for hero and mons
            explmask[i][j] = 0;
        }
    }

    // Visible blast glyphs / delay deferred
    if (!game.u?.Deaf) {
        await pline('Boom!');
    }

    if (dam) {
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                if (explmask[i][j] === 4) continue;
                const xx = x + i - 1;
                const yy = y + j - 1;
                if (u_at(xx, yy)) {
                    // AD_PHYS: no shield → uhurt=2
                    uhurt = 2;
                    if (!game.context?.mon_moving && you_exploding) uhurt = 0;
                }

                // zap_over_floor(PHYS_EXPL_TYPE) is a no-op (no RNG)

                let mtmp = m_at(xx, yy);
                if (!mtmp && u_at(xx, yy)) mtmp = game.u?.usteed;
                if (!mtmp) continue;
                if ((mtmp.mhp | 0) < 1) continue;

                if (cansee(xx, yy)) {
                    await pline(`${Monnam(mtmp)} is caught in the ${str}!`);
                }

                const itemdmg = destroy_items(mtmp, adtyp, dam);
                // AD_PHYS: no EXPL_MON shield → resist path
                let mdam = dam;
                if (resist(mtmp, olet, 0, false)) {
                    if (cansee(xx, yy)) {
                        await pline(`${Monnam(mtmp)} resists the ${str}!`);
                    }
                    mdam = Math.trunc((dam + 1) / 2);
                }
                mtmp.mhp = (mtmp.mhp | 0) - (mdam + itemdmg);
                if ((mtmp.mhp | 0) < 1) {
                    // Blast-kill → xkilled/monkilled deferred (named omission)
                    mtmp.mhp = 0;
                } else if (!game.context?.mon_moving) {
                    setmangry(mtmp, true);
                }
            }
        }
    }

    if (uhurt) {
        // C: flags.verbose && (type < 0 || olet != SCROLL_CLASS)
        if (game.flags?.verbose !== false && type < 0) {
            await pline(`You are caught in the ${str}!`);
        }
        damu = maybe_half_phys(damu);
        destroy_items({ /* youmonst */ }, adtyp, dam);

        const u = game.u;
        if (uhurt === 2 && u) {
            if (u.Upolyd) u.mh = (u.mh | 0) - damu;
            else u.uhp = (u.uhp | 0) - damu;
            if (game.flags) game.flags.botl = true;
        }
        // Fatal done()/rehumanize deferred when HP stays positive
        exercise(A_STR, false);
    }

    let i = dam * dam;
    if (i < 50) i = 50;
    wake_nearto(x, y, i);
}

/**
 * C ref: explode.c mon_explodes — roll boom damage, mondead if live, explode.
 */
export async function mon_explodes(mon, mattk) {
    let dmg;
    if (mattk.damn) {
        dmg = d(mattk.damn | 0, mattk.damd | 0);
    } else if (mattk.damd) {
        dmg = d(((mon.data?.mlevel | 0) + 1), mattk.damd | 0);
    } else {
        dmg = 0;
    }

    let type;
    if ((mattk.adtyp | 0) === AD_PHYS) {
        type = PHYS_EXPL_TYPE;
    } else {
        // Non-PHYS AT_BOOM deferred
        return;
    }

    // Already dead from xkilled/mondied — skip second mondead
    if ((mon.mhp | 0) >= 1) {
        mon.mhp = 0;
        // Full mondead deferred when called from living AT_EXPL; corpse_chance
        // path already ran mondead.
    }

    if (!game.killer) game.killer = {};
    game.killer.name = `${s_suffix(pmname_mon(mon))} explosion`;
    game.killer.format = KILLED_BY_AN;

    await explode(
        mon.mx | 0,
        mon.my | 0,
        type,
        dmg,
        MON_EXPLODE,
        adtyp_to_expltype(mattk.adtyp | 0),
    );

    game.killer.name = '';
}
