// explode.js — Explosion effects (partial).
// C ref: explode.c mon_explodes / explode; zap.c destroy_items / resist /
//        zap_over_floor (D-0949 shopdamage → pay_for_damage).
//
// Branch envelope: AT_BOOM AD_PHYS → PHYS_EXPL_TYPE + MON_EXPLODE;
// WAND_CLASS / BURNING_OIL / SCROLL / TRAP_EXPLODE olet preamble;
// adtyp from type; 3x3 zap_over_floor + shop pay; PHYS mon/hero damage
// (destroy_items limit rn2(5), resist, Half_phys, exercise A_STR);
// wake_nearto.
// Named omissions: non-PHYS mon/hero damage / destroy_items bodies;
// hallu rndmonnam; sparkle/shield glyphs; ugolemeffects; Invulnerable;
// grabbing/engulf double-damage; blast-kill → xkilled/monkilled
// (PHYS HP applied; death path deferred); wake_nearto beyond msleeping;
// mr table (use 0); Role_switch damu only for known role pm.

import { game } from './gstate.js';
import { d, rn2 } from './rng.js';
import { pline } from './display.js';
import { cansee } from './vision.js';
import { m_at, setmangry } from './mon.js';
import { Monnam } from './do_name.js';
import { maybe_half_phys } from './hack.js';
import { exercise, A_STR } from './attrib.js';
import {
    isok, u_at, PHYS_EXPL_TYPE, MON_EXPLODE, EXPL_NOXIOUS,
    STRAT_WAITMASK, KILLED_BY_AN, BURNING_OIL, TRAP_EXPLODE,
} from './const.js';
import { pmnames, G_UNIQ } from './monsters.js';
import {
    PM_CLERIC, PM_MONK, PM_WIZARD, PM_HEALER, PM_KNIGHT,
} from './generated/monsters_data.js';
import { WAND_CLASS, SCROLL_CLASS, objectNames, RAY } from './objects.js';

const AD_PHYS = 0;
const AD_MAGM = 1;
const AD_FIRE = 2;
const AD_COLD = 3;
const AD_DISN = 5;
const AD_ELEC = 6;
const AD_DRST = 7;
const AD_ACID = 8;
const DMG_DESTROY_SCALE = 5;
const MAX_ITEMS_DESTROYED = 20;

const WAN_MAGIC_MISSILE = objectNames.indexOf('WAN_MAGIC_MISSILE');
const WAN_DIGGING = objectNames.indexOf('WAN_DIGGING');
const WAN_SLEEP = objectNames.indexOf('WAN_SLEEP');
const POT_OIL = objectNames.indexOf('POT_OIL');
const SCR_FIRE = objectNames.indexOf('SCR_FIRE');

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

function Role_if(pm) {
    return game.urole?.mnum === pm;
}

/**
 * C ref: explode.c explode — PHYS_EXPL_TYPE / MON_EXPLODE subset +
 * WAND/SCROLL/OIL/TRAP olet → zap_over_floor + pay_for_damage (D-0949).
 * Visual beam / shield sparkle deferred; non-PHYS mon/hero damage deferred.
 */
export async function explode(x, y, typeIn, dam, olet, _expltype) {
    void _expltype;
    let type = typeIn | 0;
    let damu = dam | 0;
    let uhurt = 0; // 0=unhurt, 1=items only, 2=you+items
    let str = '';
    let exploding_wand_typ = 0;
    const you_exploding = olet === MON_EXPLODE && type >= 0;
    const shopdamage = { v: false };

    // C: olet preamble before adtyp
    if (olet === WAND_CLASS) {
        if (type < 0) {
            type = -type;
            exploding_wand_typ = type | 0;
            const oc = game.objects?.[type];
            if ((oc?.oc_dir | 0) === RAY
                && type !== WAN_DIGGING && type !== WAN_SLEEP) {
                type -= WAN_MAGIC_MISSILE;
                if (type < 0 || type > 9) type = 0;
            } else {
                type = 0;
            }
        }
        if (Role_if(PM_CLERIC) || Role_if(PM_MONK) || Role_if(PM_WIZARD)) {
            damu = Math.trunc(damu / 5);
        } else if (Role_if(PM_HEALER) || Role_if(PM_KNIGHT)) {
            damu = Math.trunc(damu / 2);
        }
    } else if (olet === BURNING_OIL) {
        exploding_wand_typ = POT_OIL;
    } else if (olet === SCROLL_CLASS) {
        exploding_wand_typ = SCR_FIRE;
    } else if (olet === TRAP_EXPLODE) {
        type = 0;
    }

    let adtyp = AD_PHYS;
    if (type === PHYS_EXPL_TYPE) {
        adtyp = AD_PHYS;
    } else {
        switch (Math.abs(type) % 10) {
        case 0: adtyp = AD_MAGM; str = 'magical blast'; break;
        case 1:
            adtyp = AD_FIRE;
            str = olet === BURNING_OIL ? 'burning oil'
                : olet === SCROLL_CLASS ? 'tower of flame'
                    : 'fireball';
            break;
        case 2: adtyp = AD_COLD; str = 'ball of cold'; break;
        case 4:
            adtyp = AD_DISN;
            str = olet === WAND_CLASS ? 'death field' : 'disintegration field';
            break;
        case 5: adtyp = AD_ELEC; str = 'ball of lightning'; break;
        case 6: adtyp = AD_DRST; str = 'poison gas cloud'; break;
        case 7: adtyp = AD_ACID; str = 'splash of acid'; break;
        default:
            // unknown base — treat as magical blast
            adtyp = AD_MAGM;
            str = 'magical blast';
            break;
        }
    }

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
            // AD_PHYS: explosionmask leaves EXPL_NONE; non-PHYS shield deferred
            explmask[i][j] = 0;
        }
    }

    // Visible blast glyphs / delay deferred
    if (!game.u?.Deaf) {
        await pline('Boom!');
    }

    const inside_engulfer = !!(game.u?.uswallow && type >= 0);
    const { zap_over_floor } = await import('./zap.js');

    if (dam) {
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                if (explmask[i][j] === 4) continue;
                const xx = x + i - 1;
                const yy = y + j - 1;
                if (u_at(xx, yy)) {
                    uhurt = 2;
                    if (!game.context?.mon_moving && you_exploding) uhurt = 0;
                } else if (inside_engulfer) {
                    continue;
                }

                // C: zap_over_floor unless swallowed hero-caused blast
                if (!(game.u?.uswallow && !game.context?.mon_moving)) {
                    await zap_over_floor(
                        xx, yy, type, shopdamage, false, exploding_wand_typ,
                    );
                }

                // Non-PHYS mon/hero combat deferred — PHYS path below
                if (adtyp !== AD_PHYS) continue;

                let mtmp = m_at(xx, yy);
                if (!mtmp && u_at(xx, yy)) mtmp = game.u?.usteed;
                if (!mtmp) continue;
                if ((mtmp.mhp | 0) < 1) continue;

                if (cansee(xx, yy)) {
                    await pline(`${Monnam(mtmp)} is caught in the ${str}!`);
                }

                const itemdmg = destroy_items(mtmp, adtyp, dam);
                let mdam = dam;
                if (resist(mtmp, olet, 0, false)) {
                    if (cansee(xx, yy)) {
                        await pline(`${Monnam(mtmp)} resists the ${str}!`);
                    }
                    mdam = Math.trunc((dam + 1) / 2);
                }
                mtmp.mhp = (mtmp.mhp | 0) - (mdam + itemdmg);
                if ((mtmp.mhp | 0) < 1) {
                    mtmp.mhp = 0;
                } else if (!game.context?.mon_moving) {
                    setmangry(mtmp, true);
                }
            }
        }
    }

    if (uhurt && adtyp === AD_PHYS) {
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
        exercise(A_STR, false);
    }

    if (shopdamage.v) {
        const { pay_for_damage } = await import('./shk.js');
        const dmgstr = adtyp === AD_FIRE ? 'burn away'
            : adtyp === AD_COLD ? 'shatter'
                : adtyp === AD_DISN ? 'disintegrate'
                    : 'destroy';
        await pay_for_damage(dmgstr, false);
    }

    let i = dam * dam;
    if (i < 50) i = 50;
    if (inside_engulfer) i = Math.trunc((i + 3) / 4);
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

    if ((mon.mhp | 0) >= 1) {
        mon.mhp = 0;
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
