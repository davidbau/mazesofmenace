// steed.js — Saddle / riding.
// C ref: steed.c — rider_cant_reach, can_saddle, use_saddle,
// put_saddle_on_mon, can_ride, doride, mount_steed,
// landing_spot (KNOCKED preferred-dir + enexto D-1640),
// dismount_steed (BYCHOICE + DISMOUNT_THROWN/KNOCKED/FELL HP D-1627),
// kick_steed (D-1362), place_monster (D-1565; rm.h grid),
// exercise_steed (riding-skill training every 100 turns).

import { game } from './gstate.js';
import { mksobj, objects_at } from './mkobj.js';
import { makeknown, near_capacity, encumber_msg } from './invent.js';
import {
    humanoid, noncorporeal, verysmall, bigmonst, nohands,
    amorphous, is_whirly, unsolid, touch_petrifies,
    is_flyer, is_floater, throws_rocks, grounded, likes_lava, mons,
    M1_HUMANOID, MZ_MEDIUM,
} from './monsters.js';
import {
    W_SADDLE, W_WEP, W_SWAPWEP, W_QUIVER,
    ECMD_OK, ECMD_TIME, ECMD_CANCEL,
    MAXULEV, NO_KILLER_PREFIX, SLT_ENCUMBER,
    DISMOUNT_BYCHOICE, DISMOUNT_THROWN, DISMOUNT_KNOCKED,
    DISMOUNT_FELL, DISMOUNT_POLY, DISMOUNT_ENGULFED, DISMOUNT_BONES,
    DISMOUNT_GENERIC,
    BOTH_SIDES, KILLED_BY_AN, FLYING, LEVITATION,
    ACCESSIBLE, IS_DOOR, D_CLOSED, D_LOCKED, D_NODOOR, D_BROKEN,
    N_DIRS, FROMOUTSIDE,
    DIR_ERR, xytodir, dirtocoord, DIR_LEFT, DIR_RIGHT,
    M_AP_TYPE, M_AP_FURNITURE, M_AP_OBJECT,
    has_mgivenname, MGIVENNAME, TELEDS_ALLOW_DRAG,
    TT_BEARTRAP, TT_PIT, TT_WEB, RLOC_ERR, RLOC_NOMSG, NO_TRAP_FLAGS,
    VIBRATING_SQUARE, DIED, Never_mind, FEMALE, MALE,
    P_RIDING, P_ISRESTRICTED, P_UNSKILLED, P_BASIC, P_SKILLED, P_EXPERT,
    A_DEX, A_CHA, A_WIS,
    MON_FLOOR, MON_OFFMAP,
} from './const.js';
import { objectNames, objectDescrs } from './objects.js';
import { rnd, rn2, rn1 } from './rng.js';
import { pline, newsym, canspotmon, describe_level, impossible } from './display.js';
import { getdir } from './lock.js';
import { m_at, cant_drown } from './mon.js';
import { isok } from './hacklib.js';
import { Monnam, mon_nam, monverbself, pmname, y_monnam, Hallucination, hliquid } from './do_name.js';
import { losehp, maybe_half_phys, finish_maybe_wail, is_pool, is_lava } from './hack.js';
import { set_wounded_legs, heal_legs, sokoban_guilt, mintrap } from './trap.js';
import { finish_meating } from './dogmove.js';
import { an } from './objnam.js';
import { pmnames, PM_KNIGHT, PM_GRID_BUG, monsterNames } from './generated/monsters_data.js';
import { vision_recalc } from './vision.js';
import { enexto, rloc_to, rloc } from './teleport.js';
import { which_armor } from './worn.js';
import { acurr, exercise, Fumbling, adjalign } from './attrib.js';
import { surface } from './sit.js';
import { killed } from './uhitm.js';
import { monkilled } from './mhitm.js';
import { P_SKILL, use_skill } from './weapon.js';
import { welded, is_pole } from './wield.js';
import { level_mon_at } from './worm.js';
import { mhe } from './mondata.js';

const SADDLE = objectNames.indexOf('SADDLE');
const BOULDER = objectNames.indexOf('BOULDER');
const PM_AMOROUS_DEMON = monsterNames.indexOf('PM_AMOROUS_DEMON');
const PM_BAT = monsterNames.indexOf('PM_BAT');
const PM_GHOST = monsterNames.indexOf('PM_GHOST');

/** C steed.c steeds[] — mlets that may wear a saddle. */
const STEED_MLETS = new Set([
    'S_QUADRUPED', 'S_UNICORN', 'S_ANGEL', 'S_CENTAUR', 'S_DRAGON', 'S_JABBERWOCK',
]);

/**
 * C ref: steed.c rider_cant_reach — unskilled mount cannot reach floor
 * water (potion.c dodip pool yn).
 */
export async function rider_cant_reach() {
    const u = game.u || {};
    await pline(
        `You aren't skilled enough to reach from ${y_monnam(u.usteed)}.`,
    );
}

/** C monflag.h M1_SWIM */
const M1_SWIM = 0x00000002;

function Role_if(pm) {
    return game.urole?.mnum === pm;
}

function mon_plain(mtmp) {
    const mndx = mtmp?.mnum ?? mtmp?.data?.mndx;
    if (mndx != null && pmnames[mndx]) {
        return pmnames[mndx][2] || pmnames[mndx][0] || 'creature';
    }
    const raw = mtmp?.data?.name || 'monster';
    return String(raw).replace(/^PM_/, '').replace(/_/g, ' ').toLowerCase();
}

function you_data() {
    // Missing youmonst.data (set_uasmon deferred) → humanoid start form.
    return game.youmonst?.data || { mflags1: M1_HUMANOID, msize: MZ_MEDIUM };
}

function is_swimmer(ptr) {
    return !!((ptr?.mflags1 ?? 0) & M1_SWIM);
}

/** C ref: monmove.c accessible — ACCESSIBLE && !closed_door (subset). */
function accessible_cell(x, y) {
    const loc = game.level?.at?.(x, y);
    if (!loc) return false;
    if (!ACCESSIBLE(loc.typ)) return false;
    if (IS_DOOR(loc.typ) && ((loc.doormask || 0) & (D_CLOSED | D_LOCKED))) {
        return false;
    }
    return true;
}

/**
 * C ref: hack.c test_move(TEST_MOVE) — terrain/doorway subset for ride.
 * Includes diagonal-into/out-of intact doorway ban (testdiag).
 * NODIAG poly / boulder push / shop block_door deferred.
 */
export function doorless_door(x, y) {
    const loc = game.level?.at?.(x, y);
    if (!loc || !IS_DOOR(loc.typ)) return false;
    return !((loc.doormask || 0) & ~(D_NODOOR | D_BROKEN));
}

export function test_move_ok(x, y, dx, dy) {
    const nx = x + dx;
    const ny = y + dy;
    if (!isok(nx, ny)) return false;
    if (!accessible_cell(nx, ny)) return false;
    if (dx && dy) {
        const dest = game.level?.at?.(nx, ny);
        if (dest && IS_DOOR(dest.typ) && !doorless_door(nx, ny)) return false;
        const here = game.level?.at?.(x, y);
        if (here && IS_DOOR(here.typ) && !doorless_door(x, y)) return false;
    }
    return true;
}

function distu(x, y) {
    const u = game.u;
    const dx = (u.ux | 0) - x;
    const dy = (u.uy | 0) - y;
    return dx * dx + dy * dy;
}

function t_at(x, y) {
    for (let t = game.ftrap; t; t = t.ntrap) {
        if (t.tx === x && t.ty === y) return t;
    }
    return null;
}

function sobj_at(otyp, x, y) {
    for (let o = objects_at(x, y); o; o = o.nexthere) {
        if ((o.otyp | 0) === otyp) return o;
    }
    return null;
}

/** C ref: steed.c can_saddle — steeds[] + size/humanoid/amorphous gates. */
export function can_saddle(mtmp) {
    const ptr = mtmp?.data;
    if (!ptr) return false;
    if (!STEED_MLETS.has(ptr.mlet)) return false;
    if ((ptr.msize ?? 0) < MZ_MEDIUM) return false;
    if (humanoid(ptr) && ptr.mlet !== 'S_CENTAUR') return false;
    if (amorphous(ptr) || noncorporeal(ptr) || is_whirly(ptr) || unsolid(ptr)) {
        return false;
    }
    return true;
}

/** C ref: engrave.c freehand — welded two-hand / cursed shield gate. */
function freehand() {
    const u = game.u || {};
    const uwep = u.uwep;
    if (!uwep || !welded(uwep)) return true;
    const bimanual = !!(game.objects?.[uwep.otyp]?.oc_big);
    if (!bimanual && (!u.uarms || !u.uarms.cursed)) return true;
    return false;
}

/**
 * C ref: pickup.c u_handsy — nohands / freehand before saddle apply.
 * @returns {Promise<boolean>}
 */
async function u_handsy() {
    if (nohands(game.youmonst?.data)) {
        await pline('You have no hands!');
        return false;
    }
    if (!freehand()) {
        await pline('You have no free hand.');
        return false;
    }
    return true;
}

/** C ref: o_init.c objdescr_is — appearance string match. */
function objdescr_is(obj, descr) {
    if (!obj) return false;
    const oc = game.objects?.[obj.otyp];
    if (!oc) return false;
    const dn = objectDescrs[oc.oc_descr_idx ?? obj.otyp];
    return dn != null && dn === descr;
}

/** C invent freeinv — remove from hero invent array. */
function freeinv(otmp) {
    const inv = game.invent || [];
    const idx = inv.indexOf(otmp);
    if (idx >= 0) inv.splice(idx, 1);
}

/**
 * C worn.c remove_worn_item — clear weapon/quiver slots before freeinv.
 * Full prop/artifact/light paths deferred.
 */
function remove_worn_item(obj) {
    if (!obj) return;
    const u = game.u || {};
    const mask = obj.owornmask || 0;
    if (mask & W_WEP) {
        if (u.uwep === obj) u.uwep = null;
        obj.owornmask &= ~W_WEP;
    }
    if (mask & W_SWAPWEP) {
        if (u.uswapwep === obj) u.uswapwep = null;
        obj.owornmask &= ~W_SWAPWEP;
    }
    if (mask & W_QUIVER) {
        if (u.uquiver === obj) u.uquiver = null;
        obj.owornmask &= ~W_QUIVER;
    }
}

/** C ref: steed.c can_ride */
export function can_ride(mtmp) {
    if (!mtmp?.mtame) return false;
    const yd = you_data();
    if (!humanoid(yd) || verysmall(yd) || bigmonst(yd)) return false;
    const u = game.u || {};
    if (u.Underwater && !is_swimmer(mtmp.data)) return false;
    return true;
}

/** C ref: worn.c which_armor(W_SADDLE) — scan minvent owornmask. */
function which_armor_saddle(mtmp) {
    for (let o = mtmp.minvent; o; o = o.nobj) {
        if ((o.owornmask || 0) & W_SADDLE) return o;
    }
    return null;
}

/**
 * C ref: identify.c fully_identify_obj — known flags only (no RNG).
 * oerodeproof / oname / ckowned deferred.
 */
function fully_identify_obj(obj) {
    if (!obj) return;
    makeknown(obj.otyp);
    obj.known = 1;
    obj.bknown = 1;
    obj.dknown = 1;
    obj.rknown = 1;
}

/** Local mpickobj — avoid makemon↔steed import cycle; saddles never merge. */
function pick_saddle(mtmp, otmp) {
    otmp.nobj = mtmp.minvent || null;
    mtmp.minvent = otmp;
    return false; // not merged
}

/**
 * C ref: steed.c put_saddle_on_mon.
 * NULL saddle → mksobj(SADDLE, TRUE, FALSE) then identify + wear.
 * update_mon_extrinsics deferred (no RNG for ordinary saddle).
 */
export function put_saddle_on_mon(saddle, mtmp) {
    if (!can_saddle(mtmp) || which_armor_saddle(mtmp)) {
        return;
    }
    if (!saddle) {
        saddle = mksobj(SADDLE, true, false);
        if (!saddle) return;
        fully_identify_obj(saddle);
    }
    if (pick_saddle(mtmp, saddle)) {
        return;
    }
    mtmp.misc_worn_check = (mtmp.misc_worn_check || 0) | W_SADDLE;
    saddle.owornmask = W_SADDLE;
    saddle.leashmon = mtmp.m_id;
}

/**
 * C ref: steed.c use_saddle — apply SADDLE onto adjacent monster.
 * Envelope: u_handsy; getdir; self/spot/wear/petrify/special/can_saddle;
 * chance from DEX/CHA/tame/level/Knight/riding skill/impair/gloves|boots/
 * cursed; maybewakesteed; rn2(100)<chance → freeinv+put_saddle_on_mon.
 * Named omit: update_mon_extrinsics; poly body_part(HAND) phrasing.
 * @returns {Promise<number>} ECMD_OK | ECMD_TIME | ECMD_CANCEL
 */
export async function use_saddle(otmp) {
    const u = game.u || (game.u = {});

    if (!(await u_handsy())) return ECMD_OK;

    if (u.uswallow || u.Underwater || !(await getdir(null))) {
        await pline(Never_mind);
        return ECMD_CANCEL;
    }
    if (!(u.dx | 0) && !(u.dy | 0)) {
        await pline('Saddle yourself?  Very funny...');
        return ECMD_OK;
    }

    const tx = (u.ux | 0) + (u.dx | 0);
    const ty = (u.uy | 0) + (u.dy | 0);
    const mtmp = isok(tx, ty) ? m_at(tx, ty) : null;
    if (!mtmp || !canspotmon(mtmp)) {
        await pline('I see nobody there.');
        return ECMD_TIME;
    }

    if (((mtmp.misc_worn_check || 0) & W_SADDLE)
        || which_armor(mtmp, W_SADDLE)) {
        await pline(`${Monnam(mtmp)} doesn't need another one.`);
        return ECMD_TIME;
    }

    const ptr = mtmp.data;
    const Stone_resistance = !!(u.Stone_resistance || u.HStone_resistance
        || u.EStone_resistance);
    if (touch_petrifies(ptr) && !u.uarmg && !Stone_resistance) {
        await pline(`You touch ${mon_nam(mtmp)}.`);
        const g = mtmp.female ? FEMALE : MALE;
        const { instapetrify } = await import('./trap.js');
        await instapetrify(`attempting to saddle ${an(pmname(ptr, g))}`);
    }
    // C: ptr == &mons[PM_AMOROUS_DEMON]
    if (PM_AMOROUS_DEMON >= 0 && (ptr?.mndx ?? mtmp.mnum) === PM_AMOROUS_DEMON) {
        await pline('Shame on you!');
        exercise(A_WIS, false);
        return ECMD_TIME;
    }
    if (mtmp.isminion || mtmp.isshk || mtmp.ispriest || mtmp.isgd
        || mtmp.iswiz) {
        await pline(`I think ${mon_nam(mtmp)} would mind.`);
        return ECMD_TIME;
    }
    if (!can_saddle(mtmp)) {
        await pline("You can't saddle such a creature.");
        return ECMD_TIME;
    }

    // C: chance = ACURR(A_DEX) + ACURR(A_CHA)/2 + 2*mtame + …
    let chance = acurr(A_DEX) + Math.trunc(acurr(A_CHA) / 2)
        + 2 * (mtmp.mtame | 0);
    chance += (u.ulevel | 0) * (mtmp.mtame ? 20 : 5);
    if (!mtmp.mtame) chance -= 10 * (mtmp.m_lev | 0);
    if (Role_if(PM_KNIGHT)) chance += 20;
    switch (P_SKILL(P_RIDING)) {
    case P_ISRESTRICTED:
    case P_UNSKILLED:
    default:
        chance -= 20;
        break;
    case P_BASIC:
        break;
    case P_SKILLED:
        chance += 15;
        break;
    case P_EXPERT:
        chance += 30;
        break;
    }
    const Confusion = !!(u.HConfusion || u.Confusion);
    const Glib = !!(u.Glib | 0);
    if (Confusion || Fumbling() || Glib) chance -= 20;
    else if (u.uarmg && objdescr_is(u.uarmg, 'riding gloves')) chance += 10;
    else if (u.uarmf && objdescr_is(u.uarmf, 'riding boots')) chance += 10;
    if (otmp.cursed) chance -= 50;

    maybewakesteed(mtmp);

    if (rn2(100) < chance) {
        await pline(`You put the saddle on ${mon_nam(mtmp)}.`);
        if (otmp.owornmask) remove_worn_item(otmp);
        freeinv(otmp);
        put_saddle_on_mon(otmp, mtmp);
    } else {
        await pline(`${Monnam(mtmp)} resists!`);
    }
    return ECMD_TIME;
}

/**
 * C ref: polyself.c steed_vs_stealth — riding blocks stealth unless flying.
 */
export function steed_vs_stealth() {
    const u = game.u || (game.u = {});
    // C: Flying / Levitation macros (H|E && !B), not raw H* alone.
    const flying = !!(((u.HFlying | 0) || (u.EFlying | 0)) && !(u.BFlying | 0));
    const levitating = !!(((u.HLevitation | 0) || (u.ELevitation | 0))
        && !(u.BLevitation | 0));
    if (u.usteed && !flying && !levitating) {
        u.BStealth = (u.BStealth || 0) | FROMOUTSIDE;
    } else {
        u.BStealth = (u.BStealth || 0) & ~FROMOUTSIDE;
    }
}

/**
 * C ref: steed.c exercise_steed `:386–398` — you and your steed have moved.
 * ++urideturns; every 100th riding turn trains P_RIDING by 1.
 * Called from domove right after the tentative occupy + usteed mx/my set
 * (hack.c:2880–2884), even when the move later bounces on a safemon swap.
 */
export function exercise_steed() {
    const u = game.u || {};
    if (!u.usteed) return;
    // C: ++u.urideturns >= 100 → reset + use_skill(P_RIDING, 1).
    // `| 0` covers fresh JS saves where urideturns was never set (C decl
    // zero-init).
    u.urideturns = ((u.urideturns | 0) + 1);
    if ((u.urideturns | 0) >= 100) {
        u.urideturns = 0;
        use_skill(P_RIDING, 1);
    }
}

/**
 * C ref: steed.c maybewakesteed
 */
function maybewakesteed(steed) {
    let frozen = steed.mfrozen | 0;
    steed.msleeping = 0;
    if (frozen) {
        frozen = Math.trunc((frozen + 1) / 2);
        if (!rn2(frozen)) {
            steed.mfrozen = 0;
            steed.mcanmove = 1;
        } else {
            steed.mfrozen = frozen;
        }
    }
    // wake pline when wasimmobile && !helpless deferred (async)
    finish_meating(steed);
}

/**
 * C ref: teleport.c teleds — mount/dismount placement subset.
 * Ball/chain, swallow, hideunder, drag_ball, utrap clear deferred
 * (canonical teleds owns them; dismount saves u.utrap for mintrap).
 */
function teleds_simple(nux, nuy, _flags) {
    void _flags;
    const u = game.u;
    const ox = u.ux | 0;
    const oy = u.uy | 0;
    u.ux0 = ox;
    u.uy0 = oy;
    u.ux = nux;
    u.uy = nuy;
    if (u.usteed) {
        u.usteed.mx = nux;
        u.usteed.my = nuy;
    }
    newsym(ox, oy);
    newsym(nux, nuy);
    vision_recalc(1);
    if (!game.flags) game.flags = {};
    game.flags.botl = true;
}

/**
 * C ref: steed.c landing_spot `:459–572`.
 * DISMOUNT_KNOCKED: prefer u.dx,u.dy (uhitm knockback), then
 * clockwise/counterclockwise 50:50 via rn2(2), then remaining dirs.
 * Pass i==0/1/2 trap+boulder; forceit → enexto(youmonst.data).
 * C NODIAG uses `(j % 1) != 0` (never skips; C as written).
 */
export function landing_spot(spot, reason, forceit) {
    const u = game.u;
    const tryPos = [];
    for (let k = 0; k < N_DIRS; k++) tryPos.push({ x: 0, y: 0 });
    let n = 0;
    let j = xytodir(u.dx | 0, u.dy | 0);
    let best_j, clockwise_j, counterclk_j;
    if (reason === DISMOUNT_KNOCKED && j !== DIR_ERR) {
        best_j = j;
        tryPos[0].x = u.dx | 0;
        tryPos[0].y = u.dy | 0;
        const iSwap = rn2(2);
        clockwise_j = DIR_RIGHT(j);
        const cc = { x: 0, y: 0 };
        dirtocoord(cc, clockwise_j);
        tryPos[1 + iSwap].x = cc.x | 0;
        tryPos[1 + iSwap].y = cc.y | 0;
        counterclk_j = DIR_LEFT(j);
        dirtocoord(cc, counterclk_j);
        tryPos[2 - iSwap].x = cc.x | 0;
        tryPos[2 - iSwap].y = cc.y | 0;
        n = 3;
    } else {
        best_j = clockwise_j = counterclk_j = -1;
    }
    for (j = 0; j < N_DIRS; j++) {
        if (j === best_j || j === clockwise_j || j === counterclk_j) continue;
        /* C: NODIAG(u.umonnum) && (j % 1) != 0 — j%1 is always 0. */
        if (reason === DISMOUNT_POLY && ((u.umonnum | 0) === PM_GRID_BUG)
            && (j % 1) !== 0) {
            continue;
        }
        const cc = { x: 0, y: 0 };
        dirtocoord(cc, j);
        tryPos[n] = { x: cc.x | 0, y: cc.y | 0 };
        n++;
    }

    const impaird = !!(u.Stunned || u.Confusion || u.Fumbling);
    let iStart;
    if (reason === DISMOUNT_BYCHOICE && !impaird) iStart = 0;
    else if ((reason === DISMOUNT_BYCHOICE && impaird)
        || reason === DISMOUNT_KNOCKED) iStart = 1;
    else iStart = 2;

    let viable = 0;
    let found = false;
    let min_distance = -1;

    for (let i = iStart; i <= 2 && !found; i++) {
        for (j = 0; j < n; j++) {
            const x = (u.ux | 0) + tryPos[j].x;
            const y = (u.uy | 0) + tryPos[j].y;
            if (!isok(x, y)) continue;
            if (u.ux === x && u.uy === y) continue;
            if (!accessible_cell(x, y)) continue;
            if (m_at(x, y)) continue;
            if (!test_move_ok(u.ux, u.uy, tryPos[j].x, tryPos[j].y)) continue;

            viable++;
            const distance = distu(x, y);
            const better = min_distance < 0
                || (best_j === -1 ? distance < min_distance : j < 3)
                || (distance === min_distance && !rn2(viable));
            if (!better) continue;

            const t = t_at(x, y);
            const kn_trap = i === 0 && t && t.tseen
                && (t.ttyp | 0) !== VIBRATING_SQUARE;
            const boulder = i <= 1 && sobj_at(BOULDER, x, y)
                && !throws_rocks(you_data());
            if (!kn_trap && !boulder) {
                spot.x = x;
                spot.y = y;
                min_distance = distance;
                found = true;
                if (best_j !== -1 && j < 3) break;
            }
        }
    }

    if (forceit && !found) {
        found = !!enexto(spot, u.ux | 0, u.uy | 0, you_data());
    }
    return found;
}

/**
 * C ref: steed.c mount_steed
 * Branch envelope: sane adjacent tame saddled steed; Knight slip/success
 * via rnd(MAXULEV/2+5); losehp on slip. Deferred: Hallu/Wounded_legs yn,
 * Upolyd form, Blind/AP, long worm, Punished/ustuck/utrap, petrify,
 * mtame-- non-Knight, Underwater, metallic armor, Levitation float,
 * polearm unweapon, full x_monnam killer string.
 */
export async function mount_steed(mtmp, force) {
    const u = game.u || (game.u = {});

    if (u.usteed) {
        await pline(`You are already riding ${mon_nam(u.usteed)}.`);
        return false;
    }
    if (u.Hallucination && !force) {
        await pline('Maybe you should find a designated driver.');
        return false;
    }
    if (u.Wounded_legs || u.HWounded_legs) {
        // legs_in_no_shape + heal yn deferred → refuse
        return false;
    }
    {
        const yd = you_data();
        if (u.Upolyd && (!humanoid(yd) || verysmall(yd) || bigmonst(yd))) {
            await pline("You won't fit on a saddle.");
            return false;
        }
    }
    if (!force && near_capacity() > SLT_ENCUMBER) {
        await pline("You can't do that while carrying so much stuff.");
        return false;
    }

    if (!mtmp || (!force && (
        (u.Blind && !u.Blind_telepat)
        || mtmp.mundetected
        || M_AP_TYPE(mtmp) === M_AP_FURNITURE
        || M_AP_TYPE(mtmp) === M_AP_OBJECT
    ))) {
        await pline('I see nobody there.');
        return false;
    }

    if (u.uswallow || u.ustuck || u.utrap || u.Punished
        || !test_move_ok(u.ux, u.uy, (mtmp.mx | 0) - (u.ux | 0),
            (mtmp.my | 0) - (u.uy | 0))) {
        if (u.Punished || !(u.uswallow || u.ustuck || u.utrap)) {
            await pline('You are unable to swing your leg over.');
        } else {
            await pline('You are stuck here for now.');
        }
        return false;
    }

    const otmp = which_armor_saddle(mtmp);
    if (!otmp) {
        await pline(`${Monnam(mtmp)} is not saddled.`);
        return false;
    }

    const ptr = mtmp.data;
    // touch_petrifies deferred — pony is safe
    if (!mtmp.mtame || mtmp.isminion) {
        await pline(`I think ${mon_nam(mtmp)} would mind.`);
        return false;
    }
    if (mtmp.mtrapped) {
        await pline(`You can't mount ${mon_nam(mtmp)} while trapped.`);
        return false;
    }

    if (!force && !Role_if(PM_KNIGHT) && !(--mtmp.mtame)) {
        newsym(mtmp.mx, mtmp.my);
        await pline(`${Monnam(mtmp)} resists!`);
        return false;
    }
    if (!force && u.Underwater && !is_swimmer(ptr)) {
        await pline("You can't ride that creature while under water.");
        return false;
    }
    if (!can_saddle(mtmp) || !can_ride(mtmp)) {
        await pline("You can't ride such a creature.");
        return false;
    }

    if (!force && !is_floater(ptr) && !is_flyer(ptr) && u.Levitation
        && !u.Lev_at_will) {
        await pline(`You cannot reach ${mon_nam(mtmp)}.`);
        return false;
    }
    // metallic eroded armor deferred

    if (!force
        && (u.Confusion || u.Fumbling || u.Glib || u.Wounded_legs
            || otmp.cursed || otmp.greased
            || ((u.ulevel | 0) + (mtmp.mtame | 0)
                < rnd(Math.trunc(MAXULEV / 2) + 5)))) {
        if (u.Levitation) {
            await pline(`${Monnam(mtmp)} slips away from you.`);
            return false;
        }
        await pline(`You slip while trying to get on ${mon_nam(mtmp)}.`);
        const buf = `slipped while mounting ${an(mon_plain(mtmp))}`;
        losehp(maybe_half_phys(rn1(5, 10)), buf, NO_KILLER_PREFIX);
        // C losehp → "You die..." → done(DIED) → can_make_bones
        if ((game.u?.uhp | 0) < 1) {
            await pline('You die...');
            const { done } = await import('./end.js');
            await done(DIED);
        }
        return false;
    }

    maybewakesteed(mtmp);
    if (!force) {
        if (u.Levitation && !is_floater(ptr) && !is_flyer(ptr)) {
            await pline(`${Monnam(mtmp)} magically floats up!`);
        }
        await pline(`You mount ${mon_nam(mtmp)}.`);
        if (u.Flying) {
            await pline(`You and ${mon_nam(mtmp)} take flight together.`);
        }
    }

    u.usteed = mtmp;
    steed_vs_stealth();
    // C: remove_monster then teleds to steed cell — JS shares coords
    const sx = mtmp.mx | 0;
    const sy = mtmp.my | 0;
    teleds_simple(sx, sy, TELEDS_ALLOW_DRAG);
    return true;
}

/**
 * C ref: youprop.h Flying / Levitation via flat + uprops[idx].
 * confer_oc_oprop may write extrinsic only to uprops (D-1085).
 * Call with usteed already cleared so a flying steed does not count.
 */
function dismount_hero_ufly_ulev() {
    const u = game.u || {};
    const propFly = u.uprops?.[FLYING];
    const propLev = u.uprops?.[LEVITATION];
    const ufly = !!(((u.HFlying | 0) || (u.EFlying | 0)
        || (propFly?.intrinsic | 0) || (propFly?.extrinsic | 0))
        && !((u.BFlying | 0) || (propFly?.blocked | 0)));
    const ulev = !!(((u.HLevitation | 0) || (u.ELevitation | 0)
        || (propLev?.intrinsic | 0) || (propLev?.extrinsic | 0))
        && !((u.BLevitation | 0) || (propLev?.blocked | 0)));
    return { ufly, ulev };
}

/**
 * C ref: youprop.h Stealth — (HStealth || EStealth) && !BStealth.
 * Local macro mirror (monmove.js owns the same macro for movement);
 * dismount_steed needs the FALSE→TRUE edge around steed_vs_stealth
 * (steed.c `:665` "seem less noisy now").
 */
function stealth_now() {
    const u = game.u || {};
    return !!(((u.HStealth | 0) || (u.EStealth | 0)) && !(u.BStealth | 0));
}

/**
 * C ref: steed.c dismount_steed `:575–822`.
 * DISMOUNT_THROWN FALLTHROUGH KNOCKED/FELL: u_locomotion verb, then
 * You("%s off of %s!"), landing_spot retry, and if !Levitation &&
 * !Flying (usteed cleared so a flyer steed does not count) losehp
 * Maybe_Half_Phys(rn1(10,10)) + set_wounded_legs(BOTH_SIDES,
 * HWounded_legs+rn1(5,5)) and skip heal_legs (D-1627).
 * Remaining arms: DISMOUNT_POLY/BONES/ENGULFED/GENERIC switch, BYCHOICE
 * Hallu rain line, save_utrap, steed_vs_stealth noisy-now edge, trap
 * transfer (BEARTRAP/PIT/WEB → mtrapped), steedcc + enexto 3-tier
 * (mdat, PM_BAT flyer, PM_GHOST any) + place_monster under
 * in_steed_dismounting, BONES enexto-rloc_to / rloc(ERR|NOMSG) return,
 * grounded water/lava steed death (killed + adjalign(-1)), hero-first
 * teleds ALLOW_DRAG + boulder sokoban_guilt + save_utrap mintrap,
 * no-room BYCHOICE killed vs monkilled(""/-AD_PHYS), ENGULFED/BONES
 * float_down skip with botl-only else arm, encumber_msg, polearm unweapon.
 * Named omit: uhitm DISMOUNT_KNOCKED u.dx/u.dy caller,
 * update_mon_extrinsics, teleds_simple subset (ball/chain, utrap clear,
 * swallow/hideunder/drag — canonical teleds owns them).
 * landing_spot KNOCKED preferred-dir + enexto forceit D-1640.
 * float_down → pickup when !Air/Water
 * (D-0220 / D-0966). BYCHOICE D-0213.
 */
export async function dismount_steed(reason) {
    const u = game.u || (game.u = {});
    const mtmp = u.usteed;
    if (!mtmp) return;

    const cc = { x: 0, y: 0 };
    let have_spot = landing_spot(cc, reason, 0);
    // C Wounded_legs (H||E) — while mounted this is the steed's legs.
    let repair_leg_damage = !!((u.HWounded_legs | 0)
        || (u.EWounded_legs | 0)
        || u.Wounded_legs);
    // C `:583`: saved before teleds() clears u.utrap; mintrap()s the steed.
    const save_utrap = u.utrap | 0;
    const otmp = which_armor_saddle(mtmp);

    // C `:593–598`: usteed=0 then Flying/Levitation/u_locomotion("fall").
    // Restore before the switch. Poly locomotion() deferred.
    u.usteed = null;
    const { ufly, ulev } = dismount_hero_ufly_ulev();
    let verb = ulev ? 'float' : ufly ? 'fly' : 'fall';
    u.usteed = mtmp;

    switch (reason) {
    case DISMOUNT_THROWN:
        verb = 'are thrown';
        // FALLTHROUGH — C DISMOUNT_KNOCKED / DISMOUNT_FELL
    case DISMOUNT_KNOCKED:
    case DISMOUNT_FELL:
        await pline(`You ${verb} off of ${mon_nam(mtmp)}!`);
        if (!have_spot) have_spot = landing_spot(cc, reason, 1);
        if (!ulev && !ufly) {
            losehp(maybe_half_phys(rn1(10, 10)), 'riding accident',
                KILLED_BY_AN);
            await finish_maybe_wail();
            if (game._losehp_needs_done) {
                const { finish_losehp_done } = await import('./end.js');
                await finish_losehp_done();
                return;
            }
            await set_wounded_legs(BOTH_SIDES,
                (u.HWounded_legs | 0) + rn1(5, 5));
            repair_leg_damage = false;
        }
        break;
    case DISMOUNT_POLY:
        await pline(`You can no longer ride ${mon_nam(mtmp)}.`);
        if (!have_spot) have_spot = landing_spot(cc, reason, 1);
        break;
    case DISMOUNT_ENGULFED:
    case DISMOUNT_BONES:
    case DISMOUNT_GENERIC:
        break;
    case DISMOUNT_BYCHOICE:
    default:
        if (otmp && otmp.cursed) {
            await pline(
                `You can't.  The saddle ${otmp.bknown ? 'is' : 'seems to be'} cursed.`,
            );
            otmp.bknown = 1;
            return;
        }
        if (!have_spot) {
            await pline("You can't.  There isn't anywhere for you to stand.");
            return;
        }
        if (!has_mgivenname(mtmp)) {
            await pline(
                `You've been through the dungeon on ${an(mon_plain(mtmp))} with no name.`,
            );
            // C `:648`: BYCHOICE nameless Hallu rain line.
            if (Hallucination()) {
                await pline('It felt good to get out of the rain.');
            }
        } else {
            await pline(`You dismount ${mon_nam(mtmp)}.`);
        }
        break;
    }

    // C: heal_legs(1) while still mounted so the feel-better pline
    // is suppressed (steed's legs, not the hero's).
    if (repair_leg_damage) await heal_legs(1);

    u.usteed = null;
    u.ugallop = 0;
    // C `:665`: noisy-now pline on the FALSE→TRUE Stealth edge.
    {
        const was_stealthy = stealth_now();
        steed_vs_stealth();
        if (stealth_now() && !was_stealthy) {
            await pline('You seem less noisy now.');
        }
    }

    // C `:671`: the hero's beartrap/pit/web catches the riderless steed.
    if ((u.utraptype | 0) === TT_BEARTRAP
        || (u.utraptype | 0) === TT_PIT
        || (u.utraptype | 0) === TT_WEB) {
        mtmp.mtrapped = 1;
    }

    // C `:693–698`: steedcc under the hero; an engulfer in that spot means
    // the hero was plucked from the saddle — nearest viable steed spot
    // (steed mdat, then PM_BAT flyer over water/lava, then any PM_GHOST).
    const steedcc = { x: u.ux | 0, y: u.uy | 0 };
    if (m_at(u.ux, u.uy) && m_at(u.ux, u.uy) !== mtmp) {
        if (!enexto(steedcc, u.ux, u.uy, mtmp.data)
            && !enexto(steedcc, u.ux, u.uy, mons(PM_BAT))) {
            enexto(steedcc, u.ux, u.uy, mons(PM_GHOST));
        }
    }

    if ((mtmp.mhp | 0) >= 1) { // C !DEADMONSTER(mtmp)
        game.in_steed_dismounting = true;
        place_monster(mtmp, steedcc.x, steedcc.y);
        game.in_steed_dismounting = false;

        // C `:708–713` (DISMOUNT_BONES): no hero placement; move the steed
        // aside for the potential ghost, else rloc it anywhere.
        if (reason === DISMOUNT_BONES) {
            if (enexto(cc, u.ux, u.uy, mtmp.data)) {
                await rloc_to(mtmp, cc.x, cc.y);
            } else {
                await rloc(mtmp, RLOC_ERR | RLOC_NOMSG);
            }
            return;
        }

        // C `:718`: usually move the hero first (ENGULFED caller sets
        // u.ustuck, so it lands in the steed-move arm below).
        if (!u.uswallow && !u.ustuck && have_spot) {
            const mdat = mtmp.data;
            // C `:727–736`: a grounded steed drops into water/lava.
            if (grounded(mdat)) {
                if (is_pool(u.ux, u.uy)) {
                    if (!u.Underwater) {
                        await pline(`${Monnam(mtmp)} falls into the ${surface(u.ux, u.uy)}!`);
                    }
                    if (!cant_drown(mdat)) {
                        await killed(mtmp);
                        adjalign(-1);
                    }
                } else if (is_lava(u.ux, u.uy)) {
                    await pline(`${Monnam(mtmp)} is pulled into the ${hliquid('lava')}!`);
                    if (!likes_lava(mdat)) {
                        await killed(mtmp);
                        adjalign(-1);
                    }
                }
            }
            // C [ALI]: no hero move when the steed died in the drink above.
            if ((mtmp.mhp | 0) >= 1) {
                // C: in_steed_dismounting around teleds so spoteffects skips
                // pickup; float_down does the single pickup attempt.
                game.in_steed_dismounting = true;
                teleds_simple(cc.x, cc.y, TELEDS_ALLOW_DRAG);
                if (sobj_at(BOULDER, cc.x, cc.y)) sokoban_guilt();
                game.in_steed_dismounting = false;

                // C: put the steed in the hero's (saved) trap.
                if (save_utrap) await mintrap(mtmp, NO_TRAP_FLAGS);
            }
        } else if (enexto(cc, u.ux, u.uy, mtmp.data)) {
            // C: keep player here, move the steed to cc.
            await rloc_to(mtmp, cc.x, cc.y);
        } else if (reason === DISMOUNT_BYCHOICE) {
            // C [un]#ride: hero gets credit/blame for killing the steed.
            await killed(mtmp);
            adjalign(-1);
        } else {
            // C: other dismount with no room — no penalty; damage type is
            // just "neither AD_DGST nor -AD_RBRE" (-AD_PHYS; AD_PHYS is 0).
            await monkilled(mtmp, '', 0);
        }
    } // !DEADMONSTER(mtmp)

    // C `:809–814`: usually return the hero to the surface.
    if (reason !== DISMOUNT_ENGULFED && reason !== DISMOUNT_BONES) {
        // C: float_down(0, W_SADDLE) — W_SADDLE skips "come down" msgs;
        // non-Air/Water → pickup(1) (D-0220 / D-0966).
        game.in_steed_dismounting = true;
        const { float_down } = await import('./trap.js');
        await float_down(0, W_SADDLE);
        game.in_steed_dismounting = false;
        if (!game.flags) game.flags = {};
        game.flags.botl = true;
        await encumber_msg();
        vision_recalc(1);
    } else {
        if (!game.flags) game.flags = {};
        game.flags.botl = true;
    }
    // C `:819–820`: polearms need a fresh grip on foot.
    if (u.uwep && is_pole(u.uwep)) {
        if (!game.gu) game.gu = {};
        game.gu.unweapon = true;
    }
}

/** C hack.h helpless — msleeping || !mcanmove. */
function helpless_steed(mtmp) {
    return !!(mtmp.msleeping || !mtmp.mcanmove);
}

/**
 * C ref: steed.c kick_steed `:402–449` — whip/kick riding (D-1362).
 * The rouse pline goes through `do_name.c` `monverbself` (D-1790), so
 * a hallucinated steed can be roused as "Them rouse themselves!" —
 * that is what C's genders[3] arm writes.
 */
export async function kick_steed() {
    const u = game.u || {};
    const steed = u.usteed;
    if (!steed) return;

    if (helpless_steed(steed)) {
        let He = mhe(steed);
        He = He ? He.charAt(0).toUpperCase() + He.slice(1) : 'It';
        if ((steed.mcanmove || steed.mfrozen) && !rn2(2)) {
            if (steed.mcanmove) steed.msleeping = 0;
            else if ((steed.mfrozen | 0) > 2) steed.mfrozen -= 2;
            else {
                steed.mfrozen = 0;
                steed.mcanmove = 1;
            }
            if (helpless_steed(steed)) await pline(`${He} stirs.`);
            /* C `:427–429` — mhe() already drew its own rn2(4), and
               monverbself draws a second one, so hallucination really can
               yield "He rouses herself". */
            else await pline(`${monverbself(steed, He, 'rouse', null)}!`);
        } else {
            await pline(`${He} does not respond.`);
        }
        return;
    }

    if (steed.mtame) steed.mtame--;
    if (!steed.mtame && steed.mleashed) {
        const { m_unleash } = await import('./apply.js');
        await m_unleash(steed, true);
    }
    if (!steed.mtame
        || ((u.ulevel | 0) + (steed.mtame | 0) < rnd((MAXULEV / 2 + 5) | 0))) {
        newsym(steed.mx, steed.my);
        await dismount_steed(DISMOUNT_THROWN);
        return;
    }
    await pline(`${Monnam(steed)} gallops!`);
    u.ugallop = (u.ugallop | 0) + rn1(20, 30);
}

/**
 * C ref: steed.c doride — #ride
 */
export async function doride() {
    const u = game.u || (game.u = {});
    if (u.usteed) {
        await dismount_steed(DISMOUNT_BYCHOICE);
        return ECMD_TIME;
    }
    if ((await getdir(null)) && isok((u.ux | 0) + (u.dx | 0), (u.uy | 0) + (u.dy | 0))) {
        // wizard force yn deferred
        const mtmp = m_at((u.ux | 0) + (u.dx | 0), (u.uy | 0) + (u.dy | 0));
        return (await mount_steed(mtmp, false)) ? ECMD_TIME : ECMD_OK;
    }
    return ECMD_CANCEL;
}

/** C do_name.c minimal_monnam — display name for place_monster diags. */
function place_mon_nam(mon) {
    return mon_plain(mon);
}

/**
 * C ref: steed.c place_monster `:897–932` — occupy
 * `svl.level.monsters[x][y]` (JS `game._level_monsters`), set mx/my,
 * `mstate = MON_FLOOR`. clone_mon is the live caller this iter
 * (makemon.c `:898`). gulpmm / mdamagem use the same export.
 * Vault guard may sit at <0,0>; other !isok coords snap to 0,0.
 * Steed (unless `in_steed_dismounting`) and DEADMONSTER (unless
 * isgd at 0,0) return without placing. Live grid overlap still
 * writes (C does too after impossible). Stale heads left by
 * mx/my-only movement are not treated as occupants (JS mixed
 * occupancy; C always remove+place).
 * `impossible()` is fire-and-forget so this stays sync like C.
 */
export function place_monster(mon, x, y) {
    x = x | 0;
    y = y | 0;
    let buf = '';
    // C: isok is <1..COLNO-1, 0..ROWNO-1>; vault guards park at <0,0>
    if (!isok(x, y) && (x !== 0 || y !== 0 || !mon.isgd)) {
        buf = describe_level(0);
        void impossible(
            `trying to place ${place_mon_nam(mon)} at <${x},${y}> mstate:${(mon.mstate | 0).toString(16)} on ${buf}`,
        );
        x = 0;
        y = 0;
    }
    if ((mon === game.u?.usteed && !game.in_steed_dismounting)
        || (((mon.mhp | 0) < 1) && !(mon.isgd && x === 0 && y === 0))) {
        buf = describe_level(0);
        void impossible(
            `placing ${mon === game.u?.usteed ? 'steed' : 'defunct monster'} onto map, mstate:${(mon.mstate | 0).toString(16)}, on ${buf}?`,
        );
        return;
    }
    const othermon = game._level_monsters?.get(`${x},${y}`);
    // C checks the raw grid; JS ignores stale mx/my-only leftovers.
    if (othermon && level_mon_at(x, y)) {
        buf = describe_level(0);
        const monnm = place_mon_nam(mon);
        const othnm = (mon !== othermon) ? place_mon_nam(othermon) : 'itself';
        void impossible(
            `placing ${monnm} over ${othnm} at <${x},${y}>, mstates:${(othermon.mstate | 0).toString(16)} ${(mon.mstate | 0).toString(16)} on ${buf}?`,
        );
    }
    mon.mx = x;
    mon.my = y;
    if (!game._level_monsters) game._level_monsters = new Map();
    game._level_monsters.set(`${x},${y}`, mon);
    mon.mstate = MON_FLOOR;
}

/**
 * C ref: rm.h remove_monster — clear `level.monsters[x][y]`; mx/my
 * unchanged. JS fmon occupancy still needs MON_OFFMAP so m_at skips
 * the head like C's empty grid cell (D-1231 gulpmm). Worm tail cells
 * keep `worm.js` `remove_monster_xy` (head mx/my is not the tail).
 */
export function remove_monster(x, y) {
    x = x | 0;
    y = y | 0;
    game._level_monsters?.delete(`${x},${y}`);
    const steed = game.u?.usteed;
    for (const m of game.fmon || []) {
        if (m === steed) continue;
        if ((m.mhp | 0) <= 0) continue;
        if ((m.mstate | 0) & MON_OFFMAP) continue;
        if ((m.mx | 0) === x && (m.my | 0) === y) {
            m.mstate = (m.mstate | 0) | MON_OFFMAP;
            break;
        }
    }
}
