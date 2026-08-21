// steed.js — Saddle / riding.
// C ref: steed.c — rider_cant_reach, can_saddle, use_saddle,
// put_saddle_on_mon, can_ride, doride, mount_steed, landing_spot,
// dismount_steed (BYCHOICE subset), kick_steed (D-1362).

import { game } from './gstate.js';
import { mksobj, objects_at } from './mkobj.js';
import { makeknown, near_capacity } from './invent.js';
import {
    humanoid, noncorporeal, verysmall, bigmonst, nohands,
    amorphous, is_whirly, unsolid, touch_petrifies,
    is_flyer, is_floater, is_neuter, M1_HUMANOID, MZ_MEDIUM, G_UNIQ,
} from './monsters.js';
import {
    W_SADDLE, W_WEP, W_SWAPWEP, W_QUIVER,
    ECMD_OK, ECMD_TIME, ECMD_CANCEL,
    MAXULEV, NO_KILLER_PREFIX, SLT_ENCUMBER,
    DISMOUNT_BYCHOICE, DISMOUNT_THROWN, DISMOUNT_KNOCKED,
    DISMOUNT_FELL, DISMOUNT_POLY, DISMOUNT_ENGULFED, DISMOUNT_BONES,
    DISMOUNT_GENERIC,
    ACCESSIBLE, IS_DOOR, D_CLOSED, D_LOCKED, D_NODOOR, D_BROKEN,
    N_DIRS, xdir, ydir, FROMOUTSIDE,
    M_AP_TYPE, M_AP_FURNITURE, M_AP_OBJECT,
    has_mgivenname, MGIVENNAME, TELEDS_ALLOW_DRAG,
    VIBRATING_SQUARE, DIED, Never_mind, FEMALE, MALE,
    P_RIDING, P_ISRESTRICTED, P_UNSKILLED, P_BASIC, P_SKILLED, P_EXPERT,
    A_DEX, A_CHA, A_WIS,
} from './const.js';
import { objectNames, objectDescrs } from './objects.js';
import { rnd, rn2, rn1 } from './rng.js';
import { pline, newsym, canspotmon } from './display.js';
import { getdir } from './lock.js';
import { m_at } from './mon.js';
import { isok } from './hacklib.js';
import { Monnam, mon_nam, pmname, y_monnam, Hallucination, type_is_pname } from './do_name.js';
import { losehp, maybe_half_phys } from './hack.js';
import { finish_meating } from './dogmove.js';
import { an } from './objnam.js';
import { pmnames, PM_KNIGHT, monsterNames } from './generated/monsters_data.js';
import { vision_recalc } from './vision.js';
import { which_armor } from './worn.js';
import { acurr, exercise, Fumbling } from './attrib.js';
import { P_SKILL } from './weapon.js';
import { welded } from './wield.js';

const SADDLE = objectNames.indexOf('SADDLE');
const BOULDER = objectNames.indexOf('BOULDER');
const PM_AMOROUS_DEMON = monsterNames.indexOf('PM_AMOROUS_DEMON');

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
function doorless_door(x, y) {
    const loc = game.level?.at?.(x, y);
    if (!loc || !IS_DOOR(loc.typ)) return false;
    return !((loc.doormask || 0) & ~(D_NODOOR | D_BROKEN));
}

function test_move_ok(x, y, dx, dy) {
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
 * Ball/chain, swallow, hideunder, drag_ball deferred.
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
 * C ref: steed.c landing_spot — adjacent dismount candidate.
 * DISMOUNT_KNOCKED preferred-dir arm deferred (reason≠KNOCKED here).
 * Diagonal squeeze / NODIAG poly deferred.
 */
function landing_spot(spot, reason, forceit) {
    const u = game.u;
    const tryPos = [];
    // Non-knocked: all 8 dirs in C xdir/ydir order (W,NW,N,NE,E,SE,S,SW)
    for (let j = 0; j < N_DIRS; j++) {
        tryPos.push({ x: xdir[j], y: ydir[j] });
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
    const best_j = -1;

    for (let i = iStart; i <= 2 && !found; i++) {
        for (let j = 0; j < tryPos.length; j++) {
            const x = (u.ux | 0) + tryPos[j].x;
            const y = (u.uy | 0) + tryPos[j].y;
            if (!isok(x, y)) continue;
            if (u.ux === x && u.uy === y) continue;
            if (!accessible_cell(x, y)) continue;
            const mon = m_at(x, y);
            if (mon && mon !== u.usteed) continue;
            if (!test_move_ok(u.ux, u.uy, tryPos[j].x, tryPos[j].y)) continue;

            viable++;
            const distance = distu(x, y);
            const better = min_distance < 0
                || (best_j === -1 ? distance < min_distance : j < 3)
                || (distance === min_distance && !rn2(viable));
            if (!better) continue;

            const t = t_at(x, y);
            const kn_trap = i === 0 && t && t.tseen && (t.ttyp | 0) !== VIBRATING_SQUARE;
            const boulder = i <= 1 && sobj_at(BOULDER, x, y);
            if (!kn_trap && !boulder) {
                spot.x = x;
                spot.y = y;
                min_distance = distance;
                found = true;
            }
        }
    }

    if (forceit && !found) {
        // enexto fallback deferred — BYCHOICE forceit=0 first call
        return false;
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
 * C ref: steed.c dismount_steed — DISMOUNT_BYCHOICE envelope.
 * Thrown/fell damage, poly, engulfed, bones, water/lava steed death,
 * Punished/ustuck float_down arms, encumber_msg, polearm unweapon
 * deferred. float_down → pickup when !Air/Water (D-0220 / D-0966).
 */
export async function dismount_steed(reason) {
    const u = game.u || (game.u = {});
    const mtmp = u.usteed;
    if (!mtmp) return;

    const cc = { x: 0, y: 0 };
    let have_spot = landing_spot(cc, reason, 0);
    const otmp = which_armor_saddle(mtmp);

    switch (reason) {
    case DISMOUNT_THROWN:
    case DISMOUNT_KNOCKED:
    case DISMOUNT_FELL:
        await pline(`You fall off of ${mon_nam(mtmp)}!`);
        if (!have_spot) have_spot = landing_spot(cc, reason, 1);
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
        } else {
            await pline(`You dismount ${mon_nam(mtmp)}.`);
        }
        break;
    }

    // C: heal_legs(1) when Wounded_legs — dismount path deferred (how==1)
    u.usteed = null;
    u.ugallop = 0;
    steed_vs_stealth();

    const steedcc = { x: u.ux | 0, y: u.uy | 0 };
    if (m_at(u.ux, u.uy) && m_at(u.ux, u.uy) !== mtmp) {
        // engulfer conflict — enexto deferred; keep steed under hero
    }
    mtmp.mx = steedcc.x;
    mtmp.my = steedcc.y;

    if (reason !== DISMOUNT_BONES) {
        if (!u.uswallow && !u.ustuck && have_spot) {
            // C: in_steed_dismounting around teleds so spoteffects skips
            // pickup; float_down does the single pickup attempt.
            game.in_steed_dismounting = true;
            teleds_simple(cc.x, cc.y, TELEDS_ALLOW_DRAG);
            game.in_steed_dismounting = false;
        }
    }

    if (reason !== DISMOUNT_ENGULFED && reason !== DISMOUNT_BONES) {
        // C: float_down(0, W_SADDLE) — W_SADDLE skips "come down" msgs;
        // non-Air/Water → pickup(1) (D-0220 / D-0966).
        game.in_steed_dismounting = true;
        const { float_down } = await import('./trap.js');
        const { W_SADDLE } = await import('./const.js');
        await float_down(0, W_SADDLE);
        game.in_steed_dismounting = false;
        if (!game.flags) game.flags = {};
        game.flags.botl = true;
        vision_recalc(1);
    }
}

/**
 * C you.h mhe / mondata.c pronoun_gender(PRONOUN_HALLU).
 * Hallu uses core rn2(4). type_is_pname via do_name (M2_PNAME).
 */
function pronoun_gender(mtmp) {
    if (Hallucination()) return rn2(4);
    if (!canspotmon(mtmp)) return 2;
    const ptr = mtmp?.data;
    if (!ptr || is_neuter(ptr)) return 2;
    if (humanoid(ptr)
        || ((ptr.geno | 0) & G_UNIQ)
        || type_is_pname(ptr)) {
        return mtmp.female ? 1 : 0;
    }
    return 2;
}

function mhe(mtmp) {
    return ['he', 'she', 'it', 'they'][pronoun_gender(mtmp)];
}

/** C hack.h helpless — msleeping || !mcanmove. */
function helpless_steed(mtmp) {
    return !!(mtmp.msleeping || !mtmp.mcanmove);
}

/**
 * C ref: steed.c kick_steed `:402–449` — whip/kick riding (D-1362).
 * Named omit: full `do_name.c` `monverbself` vtense/makeplural
 * (Hallu they/themselves uses a thin stand-in).
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
            else {
                const self = ['himself', 'herself', 'itself', 'themselves'][
                    pronoun_gender(steed)
                ];
                const verb = self === 'themselves' ? 'rouse' : 'rouses';
                let subj = He;
                if (self === 'themselves') {
                    subj = He.charAt(0) === He.charAt(0).toUpperCase()
                        ? 'They' : 'they';
                }
                await pline(`${subj} ${verb} ${self}!`);
            }
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
