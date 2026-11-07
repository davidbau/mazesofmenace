// stairs.js — C ref: stairs.c.
import { game } from './gstate.js';
import { strsubst } from './hacklib.js';
import { depth as depth_of_level, dunlev, on_level, single_level_branch, u_on_newpos, u_on_rndspot } from './dungeon.js';

// Stairway list management
export function stairway_add(x, y, up, isladder, dest) {
    /* C ref: stairs.c:13-23 stairway_add — u_traversed starts FALSE; set TRUE
     * by mklev (dlvl1 start upstairs) or when the hero walks the stairs.  Drives
     * known_branch_stairs() → the YELLOW vs GRAY stair glyph color (display.c). */
    const node = { sx: x, sy: y, up, isladder, tolev: { ...dest },
                   u_traversed: false, next: game.stairs };
    game.stairs = node;
}

/* C ref: stairs.c:26-38 stairway_free_all — release the complete stairway
 * chain and leave the global head empty. JavaScript needs no explicit free,
 * but walking the links preserves the native list teardown semantics. */
export function stairway_free_all() {
    let node = game.stairs;
    while (node) {
        const next = node.next;
        node.next = null;
        node = next;
    }
    game.stairs = null;
}

// ── Stairway lookup ──
export function stairway_find_dir(up) {
    for (let s = game.stairs; s; s = s.next)
        if (s.up === up)
            return s;
    return null;
}

export function stairway_find_special_dir(up) {
    for (let s = game.stairs; s; s = s.next)
        if (s.tolev.dnum !== (game.u?.uz?.dnum ?? 0) && s.up !== up)
            return s;
    return null;
}

// C ref: stairs.c:39-47 stairway_at — walk gs.stairs for the node whose
// sx/sy match (x,y); return it or NULL.
export function stairway_at(x, y) {
    let tmp = game.stairs;
    while (tmp && !(tmp.sx === x && tmp.sy === y))
        tmp = tmp.next;
    return tmp || null;
}

// C ref: stairs.c:147-151 On_stairs — is (x,y) a stairway?
export function On_stairs(x, y) {
    return stairway_at(x, y) != null;
}

// C ref: stairs.c:153-159 On_ladder — is (x,y) a ladder?
export function On_ladder(x, y) {
    const stway = stairway_at(x, y);
    return !!(stway && stway.isladder);
}

// C ref: stairs.c:161-167 On_stairs_up — is (x,y) an up-stair?
export function On_stairs_up(x, y) {
    const stway = stairway_at(x, y);
    return !!(stway && stway.up);
}

// C ref: stairs.c:169-175 On_stairs_dn — is (x,y) a down-stair?
export function On_stairs_dn(x, y) {
    const stway = stairway_at(x, y);
    return !!(stway && !stway.up);
}

// C ref: stairs.c:179-184 known_branch_stairs
export function known_branch_stairs(sway) {
    return !!(sway && sway.tolev.dnum !== game.u.uz.dnum && sway.u_traversed);
}

// C ref: stairs.c:63-77 stairway_find_from
export function stairway_find_from(fromdlev, isladder) {
    let tmp = game.stairs;
    while (tmp) {
        if (tmp.tolev.dnum === fromdlev.dnum
            && tmp.tolev.dlevel === fromdlev.dlevel
            && tmp.isladder == isladder)
            break;
        tmp = tmp.next;
    }
    return tmp || null;
}

// C ref: stairs.c u_on_sstairs — place hero on the special staircase, or
// fall through to a random arrival spot (u_on_rndspot).
export async function u_on_sstairs(upflag) {
    const stway = stairway_find_special_dir(upflag);
    if (stway) {
        await u_on_newpos(stway.sx, stway.sy);
        return;
    }
    await u_on_rndspot(upflag);
}

// C ref: stairs.c u_on_upstairs — place hero on upstairs or fallback
export async function u_on_upstairs() {
    const stway = stairway_find_dir(true);
    if (stway) {
        await u_on_newpos(stway.sx, stway.sy);
        return;
    }
    // No upstair — try special stairs, then random.
    // C: u_on_sstairs(0); /* destination upstairs implies moving down */
    await u_on_sstairs(0);
}

// C ref: stairs.c:136-145 u_on_dnstairs — place hero on the dnstairs (or the
// special/branch equivalent).  Reached from goto_level's `up` arm when the new
// level carries no stairway back to the level just left.
export async function u_on_dnstairs() {
    const stway = stairway_find_dir(false);
    if (stway) {
        await u_on_newpos(stway.sx, stway.sy);
        return;
    }
    // C: u_on_sstairs(1); /* destination dnstairs implies moving up */
    await u_on_sstairs(1);
}

export function stairs_description(sway, outbuf, stcase) {
    let tolev = sway.tolev;
    let stairs = sway.isladder ? "ladder" : stcase ? "staircase" : "stairs";
    let updown = sway.up ? "up" : "down";

    if (!known_branch_stairs(sway)) {
        /* ordinary stairs or branch stairs to not-yet-visited branch */
        outbuf = stairs + " " + updown;
        if (sway.u_traversed) {
            let specialdepth = (tolev.dnum === game.quest_dnum
                                || single_level_branch(tolev)); /* knox */
            let to_dlev = specialdepth ? dunlev(tolev) : depth_of_level(tolev);

            outbuf += " to level " + to_dlev;
        }
    } else if (game.u.uz.dnum === 0 && game.u.uz.dlevel === 1 && sway.up) {
        /* stairs up from level one are a special case; they are marked
           as having been traversed because the hero obviously started
           the game by coming down them, but the remote side varies
           depending on whether the Amulet is being carried */
        let haveAmulet = !!(game.u.uhave && game.u.uhave.amulet);
        outbuf = (!haveAmulet ? "" : "branch ") +
                 stairs + " " + updown + " " +
                 (!haveAmulet ? "out of the dungeon"
                  /* minimize our expectations about what comes next */
                  : (on_level(tolev, game.earth_level)
                     || on_level(tolev, game.air_level)
                     || on_level(tolev, game.fire_level)
                     || on_level(tolev, game.water_level))
                    ? "to the Elemental Planes"
                    : "to the end game");
    } else {
        /* known branch stairs; tacking on destination level is too verbose */
        outbuf = "branch " + stairs + " " + updown + " to " +
                 game.dungeons[tolev.dnum].dname;
        /* dungeons[].dname is capitalized; undo that for "The <Branch>" */
        outbuf = strsubst(outbuf, "The ", "the ");
    }
    return outbuf;
}
