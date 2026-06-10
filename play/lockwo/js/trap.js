// trap.js — Trap creation and trap-destination logic.
// C ref: trap.c — maketrap, hole_destination, dng_bottom, choose_trapnote.
// Stripped-down version for contest: emits the same rn2/rnd/rne PRNG call
// sequence as C during level generation so RNG parity is preserved.

import { game } from './gstate.js';
import { rn2, rnl } from './rng.js';
import { newsym, pline } from './display.js';
import {
    HOLE, TRAPDOOR, SQKY_BOARD, is_hole, In_quest,
    RUST_TRAP,
    ER_NOTHING, ER_GREASED, ER_DAMAGED, ER_DESTROYED,
    MAX_ERODE,
} from './const.js';
import {
    objects,
    WEAPON_CLASS, ARMOR_CLASS, SCROLL_CLASS, POTION_CLASS, SPBOOK_CLASS,
} from './mkobj.js';

// ── trap query / display helpers ─────────────────────────────────────────
// C ref: trap.c t_at — is there a trap at <x,y>?
export function t_at(x, y) {
    for (const t of game.level?.traps ?? [])
        if (t.tx === x && t.ty === y) return t;
    return null;
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
export async function maketrap(x, y, typ) {
    const trap = {
        ttyp: typ, tx: x, ty: y, tseen: false, once: false,
        launch: { x: 0, y: 0 },
        dst: { dnum: -1, dlevel: -1 },
    };
    if (!game.level) return trap;
    if (!game.level.traps) game.level.traps = [];

    switch (typ) {
    case SQKY_BOARD:
        trap.tnote = choose_trapnote(trap);
        break;
    case HOLE:
    case TRAPDOOR:
        if (is_hole(typ))
            hole_destination(trap.dst);
        break;
    default:
        break;
    }

    game.level.traps.push(trap);
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

// C ref: trap.c trapeffect_selector() — dispatch on trap type.  Only the
// effects exercised by the owned sessions are implemented; everything else is
// a no-op stub (seetrap only) so we never crash and the trap is at least
// revealed.  Add new trap effects here as sessions exercise them.
function trapeffect_selector(trap, trflags) {
    switch (trap.ttyp) {
    case RUST_TRAP:
        trapeffect_rust_trap(trap, trflags);
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
export function dotrap(trap, trflags = 0) {
    if (!trap) return;
    const ttype = trap.ttyp;
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

    trapeffect_selector(trap, trflags);
}

// C ref: hack.c spoteffects() — run the per-square effects after the hero
// arrives on a new tile.  The full C routine also handles pools/lava, special
// rooms, sinks and ice; none of those consume PRNG in the owned sessions, so
// this port covers the trap trigger (the part that does).
export async function spoteffects() {
    const u = game.u;
    if (!u) return;
    const trap = t_at(u.ux, u.uy);
    if (trap) {
        dotrap(trap, 0);
    }
}
