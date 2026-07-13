// mthrowu.js — Monster ranged throw/shoot (partial).
// C ref: mthrowu.c thrwmu / monshoot / m_throw / thitu / lined_up /
//         u_catch_thrown_obj / drop_throw.

import { game } from './gstate.js';
import { rn2, rnd } from './rng.js';
import {
    distmin, m_at,
} from './mon.js';
import {
    COLNO, ROWNO, BOLT_LIM, IS_OBSTRUCTED, IS_DOOR, D_CLOSED, D_LOCKED,
    NEED_WEAPON, NEED_RANGED_WEAPON, SLT_ENCUMBER, Is_rogue_level, W_WEP,
} from './const.js';
import { couldsee } from './vision.js';
import {
    place_object, splitobj, stackobj, obj_extract_self, delobj,
} from './mkobj.js';
import {
    MON_WEP, select_rwep, mon_wield_item, monmulti, dmgval,
    should_mulch_missile,
} from './weapon.js';
import { ammo_and_launcher } from './wield.js';
import { acurr, A_DEX, A_STR, exercise } from './attrib.js';
import { calc_capacity } from './invent.js';
import { losehp, nomul, maybe_half_phys } from './hack.js';
import { pline } from './display.js';
import { Monnam } from './do_name.js';
import { nohands, mons } from './monsters.js';
import { xname, singular } from './objnam.js';
import { VENOM_CLASS, objectNames } from './objects.js';
import {
    PM_MONK, PM_ROGUE, PM_HUMAN,
} from './generated/monsters_data.js';

function sgn(n) {
    return n < 0 ? -1 : n > 0 ? 1 : 0;
}

function isok(x, y) {
    return x >= 1 && x < COLNO && y >= 0 && y < ROWNO;
}

function closed_door(x, y) {
    const loc = game.level?.at?.(x, y);
    if (!loc || !IS_DOOR(loc.typ)) return false;
    return !!((loc.doormask || 0) & (D_CLOSED | D_LOCKED));
}

function blocking_terrain(x, y) {
    if (!isok(x, y)) return true;
    const loc = game.level?.at?.(x, y);
    const typ = loc?.typ ?? 0;
    if (IS_OBSTRUCTED(typ) || closed_door(x, y)) return true;
    return false;
}

function canseemon(mtmp) {
    // Visible-when-couldsee stand-in (full canspotmon deferred)
    return couldsee(mtmp.mx, mtmp.my) && !mtmp.minvis;
}

/** C invent.c freehand — either hand free (uwep not bimanual / uswap empty). */
function freehand() {
    const u = game.u || {};
    if (!u.uwep) return true;
    const big = !!(game.objects?.[u.uwep.otyp]?.oc_big);
    if (!big) return true;
    return !u.uswapwep;
}

function Role_if(pm) {
    return game.urole?.mnum === pm;
}

/**
 * C ref: mthrowu.c linedup — straight line + couldsee/clear_path.
 * Sets game._tbx/_tby like gt.tbx/gt.tby.
 */
export function linedup(ax, ay, bx, by, _boulderhandling = 0) {
    game._tbx = ax - bx;
    game._tby = ay - by;
    if (!game._tbx && !game._tby) return false;
    if ((!game._tbx || !game._tby || Math.abs(game._tbx) === Math.abs(game._tby))
        && distmin(game._tbx, game._tby, 0, 0) < BOLT_LIM) {
        // Hero target: couldsee from hero to monster; else clear_path stub→couldsee
        const u = game.u || {};
        if (u.ux === ax && u.uy === ay) return !!couldsee(bx, by);
        return !!couldsee(bx, by);
    }
    return false;
}

/** C ref: mthrowu.c m_lined_up / lined_up — vs hero. */
export function lined_up(mtmp) {
    const u = game.u || {};
    return linedup(u.ux, u.uy, mtmp.mx, mtmp.my, 2);
}

/**
 * C ref: mthrowu.c thitu — hit/miss vs hero AC.
 */
export function thitu(tlev, dam, objp, _name) {
    const obj = objp ? objp.obj : null;
    const u = game.u || {};
    const uac = u.uac ?? 10;
    const dieroll = rnd(20);
    if (uac + tlev <= dieroll) {
        game._mesg_given = (game._mesg_given || 0) + 1;
        // miss messages deferred
        return 0;
    }
    // Hit
    const onm = obj ? (singular(obj, xname) || 'missile') : 'it';
    pline(`You are hit by ${onm}!`);
    losehp(dam, onm, /* KILLED_BY */ 1);
    exercise(A_STR, false);
    return 1;
}

/**
 * C ref: mthrowu.c u_catch_thrown_obj.
 */
function u_catch_thrown_obj(otmp) {
    let catch_chance = 100 - acurr(A_DEX);
    if (Role_if(PM_MONK) || Role_if(PM_ROGUE)) catch_chance -= 20;
    const u = game.u || {};
    if (!u.Blind && !u.Confusion && !u.Stunned && !u.Fumbling
        && otmp.oclass !== VENOM_CLASS
        && !nohands(mons(PM_HUMAN))
        && freehand()
        && calc_capacity(otmp.owt || 0) <= SLT_ENCUMBER
        && !rn2(catch_chance)) {
        // hold_another_object deferred — object leaves flight path
        return true;
    }
    return false;
}

/**
 * C ref: mthrowu.c drop_throw — mulch or place+stack.
 */
function drop_throw(obj, ohit, x, y) {
    let broken = false;
    const n = objectNames[obj.otyp];
    if (n === 'CREAM_PIE' || obj.oclass === VENOM_CLASS
        || (ohit && n === 'EGG')) {
        broken = true;
    } else {
        broken = !!(ohit && should_mulch_missile(obj));
    }
    if (broken) {
        delobj(obj);
    } else {
        // flooreffects / ship_object deferred
        place_object(obj, x, y);
        stackobj(obj);
    }
    game._thrownobj = null;
    return broken;
}

/**
 * C ref: mthrowu.c m_throw — flight loop; hero hit / forcehit rn2(5).
 */
export function m_throw(mon, x, y, dx, dy, range, obj) {
    let singleobj;
    if ((obj.quan || 1) === 1) {
        if (MON_WEP(mon) === obj) {
            mon.mw = null;
            obj.owornmask = (obj.owornmask || 0) & ~W_WEP;
        }
        obj_extract_self(obj);
        singleobj = obj;
        obj = null;
    } else {
        singleobj = splitobj(obj, 1);
        obj_extract_self(singleobj);
    }
    game._thrownobj = singleobj;
    singleobj.owornmask = 0;

    // cursed slip rn2(7) deferred unless cursed
    if ((singleobj.cursed || singleobj.greased) && (dx || dy) && !rn2(7)) {
        dx = rn2(3) - 1;
        dy = rn2(3) - 1;
        if (!dx && !dy) {
            drop_throw(singleobj, false, x, y);
            return;
        }
    }

    // Pre-flight wall check (no RNG)
    if (!isok(x + dx, y + dy)
        || IS_OBSTRUCTED(game.level?.at?.(x + dx, y + dy)?.typ ?? 0)
        || closed_door(x + dx, y + dy)) {
        drop_throw(singleobj, false, x, y);
        return;
    }

    let bx = x;
    let by = y;
    game._mesg_given = 0;

    while (range-- > 0) {
        bx += dx;
        by += dy;
        singleobj.ox = bx;
        singleobj.oy = by;

        const mtmp = m_at(bx, by);
        if (mtmp) {
            // ohitmon deferred — stop and drop
            drop_throw(singleobj, false, bx, by);
            return;
        }
        const u = game.u || {};
        if (u.ux === bx && u.uy === by) {
            if (game.multi) nomul(0);
            if (!u_catch_thrown_obj(singleobj)) {
                let dam = dmgval(singleobj, null);
                let hitv = 3 - distmin(u.ux, u.uy, mon.mx, mon.my);
                if (hitv < -4) hitv = -4;
                hitv += 8 + (singleobj.spe | 0);
                if (dam < 1) dam = 1;
                dam = maybe_half_phys(dam);
                const box = { obj: singleobj };
                const hitu = thitu(hitv, dam, box, null);
                if (hitu) {
                    drop_throw(singleobj, true, u.ux, u.uy);
                    return;
                }
            } else {
                return; // caught
            }
        }

        const forcehit = !rn2(5);
        void forcehit;
        const nextBlocked = !isok(bx + dx, by + dy)
            || IS_OBSTRUCTED(game.level?.at?.(bx + dx, by + dy)?.typ ?? 0)
            || closed_door(bx + dx, by + dy);
        if (!range || nextBlocked) {
            drop_throw(singleobj, false, bx, by);
            return;
        }
    }
}

/**
 * C ref: mthrowu.c monshoot — multishot + pline + m_throw loop.
 */
function monshoot(mtmp, otmp, mwep) {
    const u = game.u || {};
    const dm = distmin(mtmp.mx, mtmp.my, mtmp.mux ?? u.ux, mtmp.muy ?? u.uy);
    const multishot = monmulti(mtmp, otmp, mwep);

    if (canseemon(mtmp)) {
        const shooting = ammo_and_launcher(otmp, mwep);
        let onm;
        if (multishot > 1) {
            onm = `${multishot} ${xname(otmp)}`;
        } else {
            onm = singular(otmp, xname);
        }
        pline(`${Monnam(mtmp)} ${shooting ? 'shoots' : 'throws'} ${onm}!`);
    }

    for (let i = 1; i <= multishot; i++) {
        m_throw(
            mtmp, mtmp.mx, mtmp.my,
            sgn(game._tbx || 0), sgn(game._tby || 0),
            dm, otmp,
        );
        if ((mtmp.mhp | 0) < 1) break;
        // After first shot, otmp may be depleted; stop if stack gone
        if (!otmp.where && !otmp.nobj && (otmp.quan | 0) < 1 && i < multishot) {
            // stack consumed
        }
    }
}

/**
 * C ref: mthrowu.c thrwmu — select missile, line up, monshoot.
 * Polearm / autoreturn deferred.
 */
export function thrwmu(mtmp) {
    if (Is_rogue_level(game.u?.uz)) return;

    if (!game.context) game.context = {};
    game.context.mon_moving = true;
    try {
        thrwmu_body(mtmp);
    } finally {
        game.context.mon_moving = false;
    }
}

function thrwmu_body(mtmp) {
    if (mtmp.weapon_check === NEED_WEAPON || !MON_WEP(mtmp)) {
        mtmp.weapon_check = NEED_RANGED_WEAPON;
        if (mon_wield_item(mtmp) !== 0) return;
    }

    const otmp = select_rwep(mtmp);
    if (!otmp) return;

    const x = mtmp.mx;
    const y = mtmp.my;
    const u = game.u || {};
    const uretreating = distmin(u.ux, u.uy, x, y)
        > distmin(u.ux0 ?? u.ux, u.uy0 ?? u.uy, x, y);

    if (!lined_up(mtmp)
        || (uretreating
            && rn2(BOLT_LIM - distmin(x, y, mtmp.mux ?? u.ux, mtmp.muy ?? u.uy)))) {
        return;
    }

    const mwep = MON_WEP(mtmp);
    monshoot(mtmp, otmp, mwep);
    nomul(0);
}
