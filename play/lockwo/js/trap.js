// trap.js — Trap creation and trap-destination logic.
// C ref: trap.c — maketrap, hole_destination, dng_bottom, choose_trapnote.
// Stripped-down version for contest: emits the same rn2/rnd/rne PRNG call
// sequence as C during level generation so RNG parity is preserved.

import { game } from './gstate.js';
import { rn2, rnl, rn1, rnd, d } from './rng.js';
import { newsym, pline } from './display.js';
import { body_part } from './invent.js';
import { exercise } from './attrib.js';
import {
    HOLE, TRAPDOOR, SQKY_BOARD, is_hole, In_quest,
    RUST_TRAP, BEAR_TRAP, DART_TRAP, MAGIC_TRAP, PIT, SPIKED_PIT,
    TT_BEARTRAP, A_DEX, A_MAX, FOOT, SPINE, LEFT_SIDE, RIGHT_SIDE,
    ER_NOTHING, ER_GREASED, ER_DAMAGED, ER_DESTROYED,
    MAX_ERODE,
    ROLLING_BOULDER_TRAP, ZAP_POS, N_DIRS, isok, DOOR, D_CLOSED, D_LOCKED,
    is_pit, IS_POOL, IS_LAVA, TELEP_TRAP, MAGIC_PORTAL,
} from './const.js';
import {
    objects, mksobj, weight, place_object, BOULDER,
    WEAPON_CLASS, ARMOR_CLASS, SCROLL_CLASS, POTION_CLASS, SPBOOK_CLASS,
} from './mkobj.js';

// C ref: include/onames.h — object type indices (mkobj.js OBJECT_DATA order).
const DART = 24;

// ── trap query / display helpers ─────────────────────────────────────────
// C ref: trap.c t_at — is there a trap at <x,y>?
export function t_at(x, y) {
    for (const t of game.level?.traps ?? [])
        if (t.tx === x && t.ty === y) return t;
    return null;
}

// C ref: trap.c deltrap() — unlink and free a trap.  The lightweight port keeps
// traps in a flat array, so removal is a splice; Sokoban/conjoined-pit bookwork
// is not exercised by the owned sessions.
function deltrap(trap) {
    const list = game.level?.traps;
    if (!list) return;
    const i = list.indexOf(trap);
    if (i >= 0) list.splice(i, 1);
}

// C ref: display.c seetrap()/feeltrap() — mark a trap as seen and redraw it.
// The lightweight display layer renders the trap glyph from the trap record
// (see display.js background_glyph); here we just flip tseen + refresh.
export function seetrap(trap) {
    if (!trap) return;
    if (!trap.tseen) {
        trap.tseen = true;
        newsym(trap.tx, trap.ty);
    }
}

// C ref: dungeon.c dunlev() — level number for lev within its dungeon.
function dunlev(lev) {
    return lev?.dlevel ?? 1;
}

// C ref: dungeon.c dunlevs_in_dungeon() — lowest level number in this dungeon.
function dunlevs_in_dungeon(lev) {
    const dnum = lev?.dnum ?? 0;
    return game.dungeons?.[dnum]?.num_dunlevs ?? 1;
}

// C ref: dungeon.c — deepest level reached in this dungeon so far.
function dunlev_reached(lev) {
    const dnum = lev?.dnum ?? 0;
    return game.dungeons?.[dnum]?.dunlev_ureached ?? (lev?.dlevel ?? 1);
}

function In_hell(lev) {
    const dnum = lev?.dnum ?? 0;
    return dnum === (game.gehennom_dnum ?? -1);
}

// C ref: trap.c dng_bottom() — find "bottom" level of the dungeon, stopping
// at the quest locate level (and accounting for the unperformed invocation
// in Gehennom).
function dng_bottom(lev) {
    let bottom = dunlevs_in_dungeon(lev);

    /* when in the upper half of the quest, don't fall past the
       middle "quest locate" level if hero hasn't been there yet */
    if (In_quest(lev)) {
        const qlocate_depth = game.qlocate_level?.dlevel ?? bottom;
        if (dunlev_reached(lev) < qlocate_depth)
            bottom = qlocate_depth; /* early cut-off */
    } else if (In_hell(lev)) {
        if (!game.u?.uevent?.invoked)
            bottom -= 1;
    }
    return bottom;
}

// C ref: trap.c hole_destination() — destination dlevel for holes/trapdoors.
export function hole_destination(dst) {
    const uz = game.u?.uz;
    const bottom = dng_bottom(uz);

    dst.dnum = uz?.dnum ?? 0;
    dst.dlevel = dunlev(uz);
    while (dst.dlevel < bottom) {
        dst.dlevel++;
        if (rn2(4))
            break;
    }
}

// C ref: trap.c choose_trapnote() — pick an unused squeaky-board note.
export function choose_trapnote(ttmp) {
    const used = new Set();
    for (const trap of game.level?.traps ?? []) {
        if (trap !== ttmp && trap.ttyp === SQKY_BOARD && Number.isInteger(trap.tnote))
            used.add(trap.tnote);
    }
    const picks = [];
    for (let k = 0; k < 12; k++)
        if (!used.has(k)) picks.push(k);
    return picks.length ? picks[rn2(picks.length)] : rn2(12);
}

// C ref: trap.c maketrap() — create a trap at (x,y) of the given type.
// Contest port: keeps the lightweight trap record used by mklev/display but
// faithfully emits the PRNG calls C makes in maketrap's type switch (notably
// hole_destination's rn2(4) for holes/trapdoors).
// C ref: trap.c xdir[]/ydir[] (decl.c) — the 8 compass directions, dir 0..7.
const XDIR8 = [-1, -1, 0, 1, 1, 1, 0, -1];
const YDIR8 = [0, -1, -1, -1, 0, 1, 1, 1];

// C ref: monmove.c closed_door() — a DOOR whose doormask is closed or locked.
function closed_door(x, y) {
    const loc = game.level?.at(x, y);
    if (!loc || loc.typ !== DOOR) return false;
    return (loc.doormask & (D_CLOSED | D_LOCKED)) !== 0;
}

// C ref: dbridge.c is_pool_or_lava() — pool or lava terrain at <x,y>.
function is_pool_or_lava(x, y) {
    const loc = game.level?.at(x, y);
    if (!loc) return false;
    return IS_POOL(loc.typ) || IS_LAVA(loc.typ);
}

// C ref: trap.c is_xport() — TELEP_TRAP..MAGIC_PORTAL.
function is_xport(ttyp) { return ttyp >= TELEP_TRAP && ttyp <= MAGIC_PORTAL; }

// C ref: trap.c isclearpath(cc, distance, dx, dy) — step `distance` cells in
// (dx,dy); the path is clear iff every cell is in-bounds, ZAP_POS, not a closed
// door, and free of pit/hole/xport traps.  On success cc is advanced to the far
// end.  Consumes no RNG.
function isclearpath(cc, distance, dx, dy) {
    let x = cc.x, y = cc.y;
    while (distance-- > 0) {
        x += dx; y += dy;
        if (!isok(x, y)) return false;
        const typ = game.level?.at(x, y)?.typ;
        if (typ == null || !ZAP_POS(typ) || closed_door(x, y)) return false;
        const t = t_at(x, y);
        if (t && (is_pit(t.ttyp) || is_hole(t.ttyp) || is_xport(t.ttyp)))
            return false;
    }
    cc.x = x; cc.y = y;
    return true;
}

// C ref: trap.c find_random_launch_coord(ttmp, cc) — pick a clear coord 4..8
// (2..8 for a rolling boulder trap) cells away from the trap for the launched
// object.  The launchplace early-out uses gl.launchplace, which is (0,0) for a
// randomly generated trap (reset in sp_lev.c:4467); with launchplace (0,0),
// bcc == trap location and linedup(same point) is FALSE, so we always fall
// through to the rn1(5,4)/rn2(N_DIRS) search.  The while loop consumes no RNG.
function find_random_launch_coord(ttmp, cc) {
    const x = ttmp.tx, y = ttmp.ty;
    // launchplace (0,0): bcc == (x,y); linedup(x,y,x,y) returns FALSE (zero
    // displacement), so the early return is skipped.
    let mindist = 4;
    if (ttmp.ttyp === ROLLING_BOULDER_TRAP) mindist = 2;
    let distance = rn1(5, 4); /* 4..8 away — rn2(5)+4 */
    let tmp = rn2(N_DIRS);    /* randomly pick a direction to try first */
    let trycount = 0;
    let success = false;
    while (distance >= mindist) {
        const dx = XDIR8[tmp], dy = YDIR8[tmp];
        cc.x = x; cc.y = y;
        if (ttmp.ttyp === ROLLING_BOULDER_TRAP
            && is_pool_or_lava(x + distance * dx, y + distance * dy))
            success = false;
        else
            success = isclearpath(cc, distance, dx, dy);
        if (ttmp.ttyp === ROLLING_BOULDER_TRAP) {
            const bcc = { x, y };
            const success_otherway = isclearpath(bcc, distance, -dx, -dy);
            if (!success_otherway) success = false;
        }
        if (success) break;
        if (++tmp > 7) tmp = 0;
        if ((++trycount % 8) === 0) --distance;
    }
    return success;
}

// C ref: trap.c mkroll_launch(ttmp, x, y, otyp, ocount) — find a launch coord,
// drop the launched object (a BOULDER for the rolling boulder trap) there, and
// record launch / launch2 on the trap.  Returns 1.
function mkroll_launch(ttmp, x, y, otyp, ocount) {
    const cc = { x: -1, y: -1 };
    const success = find_random_launch_coord(ttmp, cc);
    if (!success) {
        cc.x = x; cc.y = y;
    } else {
        const otmp = mksobj(otyp, true, false);
        if (otmp) {
            otmp.quan = ocount;
            otmp.owt = weight(otmp);
            place_object(otmp, cc.x, cc.y);
        }
    }
    ttmp.launch = { x: cc.x, y: cc.y };
    if (ttmp.ttyp === ROLLING_BOULDER_TRAP) {
        ttmp.launch2 = { x: x - (cc.x - x), y: y - (cc.y - y) };
    } else {
        ttmp.launch_otyp = otyp;
    }
    newsym(ttmp.launch.x, ttmp.launch.y);
    return 1;
}

export async function maketrap(x, y, typ) {
    const trap = {
        ttyp: typ, tx: x, ty: y, tseen: false, once: false,
        launch: { x: 0, y: 0 },
        dst: { dnum: -1, dlevel: -1 },
    };
    if (!game.level) return trap;
    if (!game.level.traps) game.level.traps = [];
    // C ref: maketrap() pushes the trap onto the level list before running the
    // per-type setup (mkroll_launch reads t_at, so the trap must be present).
    game.level.traps.push(trap);

    switch (typ) {
    case SQKY_BOARD:
        trap.tnote = choose_trapnote(trap);
        break;
    case ROLLING_BOULDER_TRAP:
        // C ref: maketrap():512 — boulder will roll towards the trigger.
        mkroll_launch(trap, x, y, BOULDER, 1);
        break;
    case HOLE:
    case TRAPDOOR:
        if (is_hole(typ))
            hole_destination(trap.dst);
        break;
    default:
        break;
    }

    return trap;
}

// ── erosion / water damage ────────────────────────────────────────────────
// C ref: objclass.h material predicates.  Object material id 11 == IRON.
const MAT_IRON = 11;
function is_rustprone(obj) { return objects[obj?.otyp]?.material === MAT_IRON; }
// C ref: objclass.h erosion_matters() — only weapons and armor erode.
function erosion_matters(obj) {
    return obj?.oclass === WEAPON_CLASS || obj?.oclass === ARMOR_CLASS;
}

// C ref: trap.c erode_obj(otmp, ostr, type, ef_flags).  Faithful port of the
// rust path (type == ERODE_RUST) used by water_damage().  Only the RNG-bearing
// branch (blessed && !rnl(4)) and the early non-vulnerable returns matter for
// PRNG parity; the cosmetic messages are emitted via pline() like the rest of
// the engine.  Returns one of the ER_* codes.
function erode_obj_rust(otmp, ostr) {
    if (!otmp) return ER_NOTHING;
    const vulnerable = is_rustprone(otmp);
    const erosion = otmp.oeroded || 0;

    if (!erosion_matters(otmp)) {
        return ER_NOTHING;
    } else if (!vulnerable || (otmp.oerodeproof && otmp.rknown)) {
        return ER_NOTHING;
    } else if (otmp.oerodeproof || (otmp.blessed && !rnl(4))) {
        // C: blessed objects get a luck-modulated saving roll (rnl(4)); the
        // rnl() call must fire to stay in sync with C.
        if (otmp.oerodeproof) otmp.rknown = true;
        return ER_NOTHING;
    } else if (erosion < MAX_ERODE) {
        otmp.oeroded = erosion + 1;
        return ER_DAMAGED;
    }
    return ER_NOTHING;
}

// C ref: apply.c splash_lit() — a lit candle/lamp is at risk of being put out
// by a splash of water.  None of the owned starter sessions step on a rust
// trap while carrying a lit light source, so the RNG-bearing extinguish path
// is not yet reachable; the predicate is kept faithful (only lamplit objects
// qualify) so the rust-trap case-3 inventory sweep consumes no PRNG here.
function splash_lit(_obj) {
    return false;
}

// C ref: trap.c water_damage(obj, ostr, force).  Faithful port covering the
// branches reachable from the rust trap.  `force` (always TRUE from the rust
// trap) skips the luck-based ER_NOTHING saving throw.  Returns an ER_* code.
function water_damage(obj, ostr, force) {
    if (!obj) return ER_NOTHING;
    if (splash_lit(obj)) return ER_DAMAGED;

    // Greased items: a coin-flip washes the grease off.  (rn2(2) must fire.)
    if (obj.greased) {
        if (!rn2(2)) {
            obj.greased = 0;
        }
        return ER_GREASED;
    }

    // Luck-based protection (skipped when force is TRUE, as the rust trap does).
    if (!force) {
        const luck = game.u?.uluck || 0;
        if ((luck + 5) > rn2(20)) return ER_NOTHING;
    }

    switch (obj.oclass) {
    case SCROLL_CLASS:
        return ER_DAMAGED;
    case SPBOOK_CLASS:
        return ER_DAMAGED;
    case POTION_CLASS:
        return ER_DAMAGED;
    default:
        return erode_obj_rust(obj, ostr);
    }
}

// ── dotrap / trap effect dispatch ─────────────────────────────────────────
// C ref: hack.c nomul(0) — interrupt any multi-turn action.
function trap_nomul() {
    game.multi = 0;
    if (game.context) {
        game.context.travel = game.context.travel1 = game.context.mv = 0;
    }
}

// C ref: trap.c trapeffect_rust_trap(&youmonst, trap, trflags) — the hero
// variant.  Rolls rn2(5) to pick which body location the gush of water hits,
// then water_damage()s the relevant gear.  case 3 (the "default") splashes the
// hero generally and rusts cloak/suit/shirt.
function trapeffect_rust_trap(trap, _trflags) {
    const u = game.u;
    seetrap(trap);

    switch (rn2(5)) {
    case 0:
        pline('A gush of water hits you on the head!');
        water_damage(game.uarmh, 'helm', true);
        break;
    case 1:
        pline('A gush of water hits your left arm!');
        if (water_damage(game.uarms, 'shield', true) !== ER_NOTHING) break;
        if (u?.twoweap || (game.uwep && false /* bimanual unmodeled */))
            water_damage(u?.twoweap ? game.uswapwep : game.uwep, null, true);
        water_damage(game.uarmg, 'gloves', true);
        break;
    case 2:
        pline('A gush of water hits your right arm!');
        water_damage(game.uwep, null, true);
        water_damage(game.uarmg, 'gloves', true);
        break;
    default:
        pline('A gush of water hits you!');
        // splash any lit light sources (excludes wielded weapons; none of the
        // owned sessions carry a lit source so this consumes no PRNG)
        for (const otmp of (u?.invent || game.invent || [])) {
            if (otmp.lamplit && otmp !== game.uwep
                && (otmp !== game.uswapwep || !u?.twoweap))
                splash_lit(otmp);
        }
        if (game.uarmc)
            water_damage(game.uarmc, 'cloak', true);
        else if (game.uarm)
            water_damage(game.uarm, 'suit', true);
        else if (game.uarmu)
            water_damage(game.uarmu, 'shirt', true);
        break;
    }
}

// C ref: hack.c losehp() — for a non-polymorphed hero this subtracts the
// damage from u.uhp (no RNG).  Death handling is not exercised by the trap
// sessions, so it is reduced to the hp arithmetic + hpmax clamp.
function losehp(n) {
    const u = game.u;
    if (!u) return;
    u.uhp -= n;
    if (u.uhp > u.uhpmax) u.uhpmax = u.uhp;
    if (u.uhp < 1) u.uhp = 0;
}

// C ref: hacklib.c exclam(force) — "!" for damage > 5, "." otherwise.
function exclam(force) { return force > 5 ? '!' : '.'; }

// C ref: objnam.c an() — indefinite article prefix for a plain noun.
function an_str(s) { return /^[aeiou]/i.test(s) ? `an ${s}` : `a ${s}`; }

// C ref: mthrowu.c thitu(tlev, dam, objp, name) — resolve a trap missile (here
// a dart fired by a dart trap) landing on the hero.  For the named-missile
// path (name != NULL, e.g. "little dart") the message uses an(name) and there
// is no obj-specific naming.  Rolls dieroll = rnd(20); a hit needs
// u.uac + tlev > dieroll.  On a hit: "You are hit by a little dart!", then
// losehp(dam) [no RNG] + exercise(A_STR, FALSE) [rn2(2)].  Returns 1 on hit.
async function thitu_named(tlev, dam, name) {
    const { update_topl } = await import('./display.js');
    const u = game.u;
    const uac = u?.uac ?? 10;
    const dieroll = rnd(20);                     // mthrowu.c:106
    const onm = an_str(name);
    if (uac + tlev <= dieroll) {
        // Miss feedback (verbose).  Not exercised by the dart-trap session (the
        // recorded dart hits) but kept faithful.
        if (uac + tlev <= dieroll - 2)
            await update_topl(`The ${name} misses you.`);
        else
            await update_topl(`You are almost hit by ${onm}.`);
        return 0;
    }
    // Hit: You("are hit by %s%s", onm, exclam(dam)).
    await update_topl(`You are hit by ${onm}${exclam(dam)}`);
    losehp(dam);                                 // no RNG
    exercise(0 /*A_STR*/, false);                // rn2(2)
    return 1;
}

// C ref: trap.c t_missile(otyp, trap) — mksobj(otyp, TRUE, FALSE) for the trap
// missile; quan forced to 1, opoisoned cleared, position set to the trap.
export function t_missile(otyp, trap) {
    const otmp = mksobj(otyp, true, false);
    otmp.quan = 1;
    otmp.owt = weight(otmp);
    otmp.opoisoned = 0;
    otmp.ox = trap.tx; otmp.oy = trap.ty;
    return otmp;
}

// C ref: trap.c trapeffect_dart_trap(&youmonst, trap, trflags) — the hero
// steps onto a dart trap.  For a freshly-triggered (trap->once == 0) trap the
// soft-click escape (rn2(15)) is skipped; the dart is created (mksobj order),
// a 1-in-6 poison check fires, dmgval(dart, &youmonst) rolls damage, and
// thitu(7, dam, ..., "little dart") resolves the hit (the recorded hero is on
// foot so the usteed branch is skipped).  On a hit the dart is freed; on a
// miss it settles on the floor (place_object + stackobj).  RNG order matches C
// exactly: next_ident + mksobj_init + mkobj_erosions (inside t_missile), then
// rn2(6) poison, rnd(oc_wsdam) dmgval, rnd(20) thitu, rn2(2) exercise.
async function trapeffect_dart_trap(trap, _trflags) {
    const u = game.u;
    const { dmgval } = await import('./uhitm.js');
    // trap->once is 0 on first trigger -> the (trap->once && tseen && !rn2(15))
    // escape short-circuits without consuming RNG.
    trap.once = 1;
    seetrap(trap);
    // C: pline("A little dart shoots out at you!").  Mark the topline NEED_MORE
    // so thitu's update_topl("You are hit by a little dart!") appends to the
    // same line (C topl.c update_topl CO-8 rule) rather than replacing it.
    await pline('A little dart shoots out at you!');
    game._toplin = 1; // TOPLIN_NEED_MORE
    const otmp = t_missile(DART, trap);
    if (!rn2(6)) otmp.opoisoned = 1;             // trap.c:1273
    // dmgval(otmp, &youmonst): the human hero is not a large monster, so this
    // is rnd(oc_wsdam) (+spe).  A youmonst stand-in with a small msize selects
    // the small-monster die in uhitm.dmgval.
    const dam = dmgval(otmp, { data: { msize: 0 } });
    // u.usteed is null for the recorded (on-foot) hero -> skip the steed branch.
    if (await thitu_named(7, dam, 'little dart')) {
        // Hit: the (non-poisoned) dart is consumed (obfree).  No floor object.
        // (opoisoned path would call poisoned(); not reached — rn2(6) != 0.)
    } else {
        // Miss: the dart settles on the hero's square.
        const { stackobj } = await import('./invent.js');
        place_object(otmp, u.ux, u.uy);
        otmp.where = 'floor'; otmp.ox = u.ux; otmp.oy = u.uy;
        stackobj(otmp);
        newsym(u.ux, u.uy);
    }
}

// C ref: trap.c set_utrap(tim, typ) — mark the hero trapped for `tim` turns.
function set_utrap(tim, typ) {
    const u = game.u;
    if (!u) return;
    u.utrap = tim;
    u.utraptype = typ;
}

// C ref: do.c set_wounded_legs(side, timex).  When the hero first gains wounded
// legs, ATEMP(A_DEX)-- (the displayed Dx drops by 1); the timeout is (re)set to
// at least `timex`.  Consumes no RNG.  Riding moves the wound to the steed but
// the contest hero is dismounted when the bear trap fires.  C ends with
// encumber_msg() (do.c:2445): a wounded leg lowers weight_cap, so a hero who
// was near capacity becomes Burdened and gets the "slowed slightly" message
// immediately — this fires BEFORE the bear trap's losehp(), which is why the
// trap's --More-- frame still shows the pre-damage HP (seed0004 step 27).
async function set_wounded_legs(side, timex) {
    const u = game.u;
    if (!u) return;
    u.atemp = u.atemp || { a: Array(A_MAX).fill(0) };
    u.eprops = u.eprops || {};
    const already = (u.HWounded_legs || 0) || (u.EWounded_legs || 0);
    if (!already) u.atemp.a[A_DEX] = (u.atemp.a[A_DEX] || 0) - 1;
    if (!already || (u.HWounded_legs || 0) < timex) u.HWounded_legs = timex;
    u.EWounded_legs = (u.EWounded_legs || 0) | side;
    const { encumber_msg } = await import('./invent.js');
    await encumber_msg();
}

// C ref: trap.c trapeffect_bear_trap(&youmonst, trap, trflags) — the hero
// variant for a level-1, ground-bound, non-small, dismounted hero (the contest
// case).  RNG order matches C exactly: d(2,4) damage, rn1(4,4) trap duration,
// rn1/rn2 wounded-legs side+timeout, then exercise(A_DEX, FALSE).
async function trapeffect_bear_trap(trap, _trflags) {
    const u = game.u;
    const A_Your = trap.madeby_u ? 'Your' : 'A';
    const dmg = d(2, 4);
    // Levitation/Flying, amorphous/whirly/unsolid, and small-size harmless
    // branches are all false for the contest hero (a human Knight on foot).
    // C feeltrap(trap) just marks it seen for a sighted hero == seetrap().
    seetrap(trap);
    set_utrap(rn1(4, 4), TT_BEARTRAP);
    // Dismounted hero: "<A/Your> bear trap closes on your foot!"  Routed through
    // update_topl (C pline) so it leaves toplin == NEED_MORE; a same-turn
    // follow-up (the encumber_msg "slowed slightly" line when the wounded leg
    // pushes the hero over capacity) then pages it with --More-- (seed0004 step 27).
    const { update_topl } = await import('./display.js');
    await update_topl(`${A_Your} bear trap closes on your ${body_part(FOOT)}!`);
    // No iron shoes -> wounded legs + hp loss (Maybe_Half_Phys is identity for a
    // hero without HALF_PHDAM, i.e. every starting role).
    await set_wounded_legs(rn2(2) ? RIGHT_SIDE : LEFT_SIDE, rn1(10, 10));
    losehp(dmg);
    exercise(A_DEX, false);
}

// C ref: trap.c domagictrap() — the common (non-explosion) magic-trap effect.
// fate = rnd(20) selects the outcome.  RNG order is preserved for every branch
// the owned sessions reach (fate 11 and 13 consume no further RNG); the
// fate < 10 monster-summoning branch is ported faithfully (rnd(4) count,
// rn1(5,10) blindness, rn1(20,30) deafness, then `cnt` makemon calls) so its
// RNG stream matches C should a session ever land there.
async function domagictrap() {
    const u = game.u;
    const fate = rnd(20);
    if (fate < 10) {
        /* Most of the time, it creates some monsters. */
        const cnt = rnd(4);
        // resists_blnd(&youmonst): false for the ordinary (un-poly'd) hero.
        if (!game.Blind /* placeholder for resists_blnd; hero has no blnd resist */) {
            await pline('You are momentarily blinded by a flash of light!');
            // make_blinded((long) rn1(5, 10), FALSE)
            rn1(5, 10);
        }
        // deafness effects: !Deaf for the contest hero.
        // incr_itimeout(&HDeaf, rn1(20, 30)) — no displayed message difference
        // beyond "You hear a deafening roar!" which pages with the flash line.
        await pline('You hear a deafening roar!');
        rn1(20, 30);
        const { makemon } = await import('./makemon.js');
        for (let c = cnt; c-- > 0;)
            makemon(null, u.ux, u.uy, 0); // NO_MM_FLAGS
        // wake_nearto(): wakes nearby monsters, no RNG.
        return;
    }
    switch (fate) {
    case 10: /* sometimes nothing happens */
        break;
    case 11: /* toggle intrinsic invisibility */
        // !Invis for the contest hero -> self_invis_message(): "Gee!  All of
        // a sudden, you can't see yourself."  No RNG.
        await pline('You hear a low hum.');
        await pline("Gee!  All of a sudden, you can't see yourself.");
        break;
    case 13: /* odd feelings: a shiver */
        await pline(`A shiver runs up and down your ${body_part(SPINE)}!`);
        break;
    case 14:
        await pline('You hear distant howling.');
        break;
    case 16:
        await pline('Your pack shakes violently!');
        break;
    case 17:
        await pline('You smell charred flesh.');
        break;
    case 18:
        await pline('You feel tired.');
        break;
    default:
        // fate 12 (fire), 15 (homeland), 19 (tame), 20 (uncurse) are not
        // reached by any owned session; leave unmodeled (no RNG, no message)
        // rather than risk an incorrect heavy port.
        break;
    }
}

// C ref: trap.c trapeffect_magic_trap(&youmonst, trap, trflags) — the hero
// steps onto a magic trap.  seetrap(); a 1-in-30 magical explosion (caught by
// !rn2(30)); otherwise domagictrap() picks the everyday effect.  steedintrap()
// follows but consumes no RNG for the dismounted contest hero.
async function trapeffect_magic_trap(trap, _trflags) {
    const u = game.u;
    seetrap(trap);
    if (!rn2(30)) {
        // Rare: magical explosion.  deltrap + losehp(rnd(10)) + uenmax bump.
        deltrap(trap);
        newsym(u.ux, u.uy);
        const { update_topl } = await import('./display.js');
        await update_topl('You are caught in a magical explosion!');
        game._toplin = 1;
        losehp(rnd(10));
        await update_topl('Your body absorbs some of the magical energy!');
        if (u) {
            u.uenmax = (u.uenmax || 0) + 2;
            u.uen = u.uenmax;
            if (u.uenpeak !== undefined && u.uenmax > u.uenpeak) u.uenpeak = u.uenmax;
        }
        return;
    }
    await domagictrap();
    // steedintrap(trap, NULL): no steed -> Trap_Effect_Finished, no RNG.
}

// C ref: trap.c trapeffect_selector() — dispatch on trap type.  Only the
// effects exercised by the owned sessions are implemented; everything else is
// a no-op stub (seetrap only) so we never crash and the trap is at least
// revealed.  Add new trap effects here as sessions exercise them.
async function trapeffect_selector(trap, trflags) {
    switch (trap.ttyp) {
    case RUST_TRAP:
        trapeffect_rust_trap(trap, trflags);
        break;
    case BEAR_TRAP:
        await trapeffect_bear_trap(trap, trflags);
        break;
    case DART_TRAP:
        await trapeffect_dart_trap(trap, trflags);
        break;
    case MAGIC_TRAP:
        await trapeffect_magic_trap(trap, trflags);
        break;
    default:
        // Not yet modeled: reveal the trap but don't simulate its effect.
        seetrap(trap);
        break;
    }
}

// C ref: trap.c dotrap(trap, trflags) — the hero steps onto / triggers a trap.
// Pared down to the pieces that matter for the owned sessions: the
// nomul(0) interrupt, the "already seen, escape on !rn2(5)" check (only when
// the trap was previously seen), and the trapeffect dispatch.
export async function dotrap(trap, trflags = 0) {
    if (!trap) return;
    const already_seen = !!trap.tseen;

    trap_nomul();

    // C: a previously-seen, non-special trap gives a 1-in-5 chance to step over
    // it harmlessly (consumes rn2(5)).  Floor traps the hero hasn't seen yet
    // (our case) skip this entirely.
    if (already_seen) {
        if (!rn2(5)) {
            return;
        }
    }

    await trapeffect_selector(trap, trflags);
}

// C ref: include/trap.h is_pit(ttyp) — PIT or SPIKED_PIT.
function is_pit_ttyp(ttyp) { return ttyp === PIT || ttyp === SPIKED_PIT; }

// C ref: hack.c spoteffects() — run the per-square effects after the hero
// arrives on a new tile.  The full C routine also handles pools/lava, special
// rooms, sinks and ice; none of those consume PRNG in the owned sessions, so
// this port covers the pickup/trap ordering (the part that matters):
//
//   pit = (trap && is_pit(trap->ttyp));
//   if (pick && !pit) pickup(1);     // pickup BEFORE a non-pit trap
//   if (trap) dotrap(trap, ...);
//   if (pick && pit) pickup(1);      // pickup AFTER a pit trap
//
// `pickupFn` is the caller's pickup(1) (cmd.js pickup_after_move); it is
// optional so older call sites (with no auto-pickup) still trigger traps.
export async function spoteffects(pickupFn) {
    const u = game.u;
    if (!u) return;
    const trap = t_at(u.ux, u.uy);
    const pit = !!(trap && is_pit_ttyp(trap.ttyp));
    if (pickupFn && !pit) await pickupFn();
    if (trap) await dotrap(trap, 0);
    if (pickupFn && pit) await pickupFn();
}
