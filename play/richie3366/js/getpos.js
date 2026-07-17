// getpos.js — Cursor-position selection (partial).
// C ref: getpos.c getpos / auto_describe / hack.c handle_tip(TIP_GETPOS).
//
// Branch envelope: verbose instruction pline, first-use getpos tip
// (nhcore show_getpos_tip PICK_NONE loop), hjklyubn walk + HJKLYUBN/Ctrl-dir
// rush (8× step via truncate_to_map) + autodescribe topline, '>'/'<' stairs
// feature scan (getpos.c cmap match subset), force unknown-direction pline,
// '.' → LOOK_TRADITIONAL, ESC → -1. Menu/mMoOdDxX jump/hilite/valids/
// getloc_moveskip glyph-skip / full defsyms feature table deferred.

import { game } from './gstate.js';
import { nhgetch } from './input.js';
import { flush_screen, pline, docrt } from './display.js';
import {
    COLNO, ROWNO, isok, TER_MON, TER_DETECT,
    M_AP_TYPE, M_AP_OBJECT, M_AP_FURNITURE, STRAT_WAITMASK,
    STAIRS, LADDER, LA_DOWN, ROOM, CORR, STONE, IS_WALL,
    POOL, MOAT, WATER, LAVAPOOL, LAVAWALL, ICE,
} from './const.js';
import { paint_corner_nhw_menu } from './invent.js';
import { distant_monnam_none } from './do_name.js';
import { stairway_at, known_branch_stairs } from './mklev.js';
import { t_at, trapname } from './trap.js';
import { waterbody_name } from './hack.js';

export const LOOK_TRADITIONAL = 0;
export const LOOK_QUICK = 1;
export const LOOK_ONCE = 2;
export const LOOK_VERBOSE = 3;

const DIR_DX = { h: -1, l: 1, j: 0, k: 0, y: -1, u: 1, b: -1, n: 1 };
const DIR_DY = { h: 0, l: 0, j: 1, k: -1, y: -1, u: -1, b: 1, n: 1 };

/** C('h')..C('n') → walk dir letter (num_pad off bind). */
const CTRL_DIR = {
    8: 'h', // C('h')
    10: 'j', // C('j')
    11: 'k', // C('k')
    12: 'l', // C('l')
    25: 'y', // C('y')
    21: 'u', // C('u')
    2: 'b', // C('b')
    14: 'n', // C('n')
};

/**
 * C ref: getpos.c feature-char match — defsyms/showsyms for stairs/ladder
 * glyphs ('>' / '<'). Fountain/altar/trap/engraving cmap table deferred.
 */
function terrain_feature_matches(x, y, ch) {
    const loc = game.level?.at?.(x, y);
    if (!loc) return false;
    // C: prefer visible/remembered; require seenv for raw terrain fallback
    const typ = loc.typ | 0;
    if (typ !== STAIRS && typ !== LADDER) return false;
    if (!(loc.seenv | 0) && !(loc.disp_ch)) return false;
    const down = !!(loc.ladder & LA_DOWN);
    if (ch === '>') return down;
    if (ch === '<') return !down;
    return false;
}

/**
 * C ref: getpos.c unknown-key feature scan — two passes from cursor:
 * pass0 past current to SE; pass1 NW corner through current.
 * Returns {x,y} or null.
 */
function find_dungeon_feature(cx, cy, ch) {
    for (let pass = 0; pass <= 1; pass++) {
        const loY = pass === 0 ? cy : 0;
        const hiY = pass === 0 ? ROWNO - 1 : cy;
        for (let ty = loY; ty <= hiY; ty++) {
            const loX = (pass === 0 && ty === loY) ? cx + 1 : 1;
            const hiX = (pass === 1 && ty === hiY) ? cx : COLNO - 1;
            for (let tx = loX; tx <= hiX; tx++) {
                if (!isok(tx, ty)) continue;
                // C: glyph_at cmap, then memory glyph, then seenv terrain.
                // Subset: displayed stairs char or terrain STAIRS/LADDER.
                const loc = game.level?.at?.(tx, ty);
                if (loc?.disp_ch === ch) return { x: tx, y: ty };
                if (terrain_feature_matches(tx, ty, ch)) {
                    return { x: tx, y: ty };
                }
            }
        }
    }
    return null;
}

function sgn(n) {
    return n < 0 ? -1 : n > 0 ? 1 : 0;
}

/**
 * C ref: getpos.c truncate_to_map — add dx,dy truncating at map edges.
 * Returns {x,y} after apply (mutates conceptually like C *cx/*cy).
 */
function truncate_to_map(cx, cy, dx, dy) {
    let x = cx;
    let y = cy;
    if (x + dx < 1) {
        dy -= sgn(dy) * (1 - (x + dx));
        dx = 1 - x;
    } else if (x + dx > COLNO - 1) {
        dy += sgn(dy) * ((COLNO - 1) - (x + dx));
        dx = (COLNO - 1) - x;
    }
    if (y + dy < 0) {
        dx -= sgn(dx) * (0 - (y + dy));
        dy = 0 - y;
    } else if (y + dy > ROWNO - 1) {
        dx += sgn(dx) * ((ROWNO - 1) - (y + dy));
        dy = (ROWNO - 1) - y;
    }
    return { x: x + dx, y: y + dy };
}

function mon_at_xy(x, y) {
    for (const m of game.fmon || []) {
        if ((m.mhp | 0) < 1) continue;
        if ((m.mx | 0) === x && (m.my | 0) === y) return m;
    }
    return null;
}

/** C ref: pager.c self_lookat — race adj + role + called plname. */
function self_lookat_brief() {
    const race = (game.urace?.adj || game.urace?.noun || 'human').toLowerCase();
    const role = (game.urole?.name?.m || game.urole?.name || 'hero')
        .toString()
        .toLowerCase();
    const plname = (game.plname || 'hero').toLowerCase();
    const invis =
        game.u?.Invis && (game.u?.senseself || !game.u?.Blind) ? 'invisible ' : '';
    return `${invis}${race} ${role} called ${plname}`;
}

/**
 * C ref: pager.c look_at_monster + mhidden_description subset.
 * Detect browse shows mon glyphs; M_AP_OBJECT without object glyph →
 * ", mimicking something".
 */
function look_at_monster_brief(mtmp) {
    if (!mtmp) return 'monster';
    const name = distant_monnam_none(mtmp);
    let buf = '';
    if (mtmp.mtame) buf = 'tame ';
    else if (mtmp.mpeaceful) buf = 'peaceful ';
    buf += name;
    if (mtmp.mfrozen) {
        buf += ", can't move (paralyzed or sleeping or busy)";
    } else if (mtmp.msleeping) {
        buf += ', asleep';
    } else if ((mtmp.mstrategy || 0) & STRAT_WAITMASK) {
        buf += ', meditating';
    }
    const ap = M_AP_TYPE(mtmp);
    if (ap === M_AP_OBJECT || ap === M_AP_FURNITURE) {
        // Full object_from_map / defsyms furniture names deferred
        buf += ', mimicking something';
    } else if (mtmp.mundetected) {
        buf += ', hiding';
    }
    return buf;
}

/**
 * C ref: pager.c lookat cmap → defsyms[].explanation for stairs/ladder
 * (S_*stair / S_*ladder / S_br*). Same strings as display back_to_glyph.
 */
function stair_ladder_explanation(x, y) {
    const sway = stairway_at(x, y);
    const loc = game.level?.at?.(x, y);
    if (!sway && !(loc && (loc.typ === STAIRS || loc.typ === LADDER))) {
        return '';
    }
    const up = sway ? !!sway.up : !!(loc && !(loc.ladder & LA_DOWN));
    const isLadder = !!(sway?.isladder) || (loc?.typ === LADDER);
    if (known_branch_stairs(sway)) {
        if (isLadder) return up ? 'branch ladder up' : 'branch ladder down';
        return up ? 'branch staircase up' : 'branch staircase down';
    }
    if (isLadder) return up ? 'ladder up' : 'ladder down';
    return up ? 'staircase up' : 'staircase down';
}

/**
 * C ref: pager.c lookat glyph_is_cmap → defsyms[].explanation (default
 * arm) + S_pool/S_water/S_lava/S_ice → waterbody_name. Used by getpos
 * auto_describe firstmatch after stairs/traps.
 * Named omissions: altar/ndoor/cloud/engraving special cases;
 * underwater unreconnoitered; object glyphs; Hallucination waterbody.
 */
function cmap_defsym_explanation(x, y, loc) {
    if (!loc) return '';
    const typ = loc.typ;
    // C lookat case S_pool/S_water/S_lava/S_lavawall/S_ice → waterbody_name
    if (typ === POOL || typ === MOAT || typ === WATER
        || typ === LAVAPOOL || typ === LAVAWALL || typ === ICE) {
        return waterbody_name(x, y);
    }
    // C lookat cmap default → defsyms[symidx].explanation
    if (IS_WALL(typ)) return 'wall';
    if (typ === ROOM) return 'floor of a room';
    if (typ === CORR) {
        return loc.lit || game.flags?.lit_corridor ? 'lit corridor' : 'corridor';
    }
    if (typ === STONE) {
        // C lookat S_stone: !seenv → "unexplored"; else stone/SCORR
        if (!loc.seenv) return 'unexplored';
        return 'stone';
    }
    return '';
}

/**
 * C ref: getpos.c auto_describe → do_screen_description firstmatch /
 * pager.c lookat. Uses displayed glyph (loc.disp_*), not map memory —
 * required for TER_DETECT after clear_glyph_buffer.
 *
 * Named omissions: full do_screen_description symbol table, coord_desc,
 * getpos_getvalid / travel "(no travel path)" / "(invalid target)"
 * suffixes, underwater unreconnoitered, object / special cmap arms
 * (altar/ndoor/cloud/waterbody).
 * Trap: tseen `trapname` only (trapped_chest/door / Hallucination deferred).
 */
function auto_describe_text(cx, cy) {
    const u = game.u || {};
    const terrainmode = game.iflags?.terrainmode | 0;

    if (
        (u.ux | 0) === cx && (u.uy | 0) === cy
        && (!terrainmode || (terrainmode & TER_MON) !== 0)
    ) {
        return self_lookat_brief();
    }

    const mtmp = mon_at_xy(cx, cy);
    if (mtmp && (!terrainmode || (terrainmode & TER_MON) !== 0)) {
        const loc = game.level?.at?.(cx, cy);
        const ch = loc?.disp_ch;
        // Detect/map may blank a cell while mon still exists in fmon —
        // only describe when the mon glyph is actually shown (or no TER_DETECT).
        if (!(terrainmode & TER_DETECT) || (ch && ch !== ' ')) {
            return look_at_monster_brief(mtmp);
        }
    }

    const loc = game.level?.at?.(cx, cy);
    const ch = loc?.disp_ch;
    if (!ch || ch === ' ') {
        // C lookat glyph_is_unexplored → "unexplored area"
        return 'unexplored area';
    }

    // C lookat glyph_is_cmap stairs/ladder → defsyms explanation (firstmatch)
    const stair = stair_ladder_explanation(cx, cy);
    if (stair) return stair;

    // C lookat glyph_is_trap → trap_description (seen map_trap glyph)
    const trap = t_at(cx, cy);
    if (trap && trap.tseen) return trapname(trap.ttyp, false);

    // C lookat glyph_is_cmap → defsyms / waterbody_name (ROOM/moat/wall…)
    const cmap = cmap_defsym_explanation(cx, cy, loc);
    if (cmap) return cmap;

    // Object / remaining special cmap under TER_* browse still deferred
    return 'unexplored area';
}

/**
 * C ref: nhcore.lua show_getpos_tip → nhlua.c nhl_text (NHW_MENU +
 * select_menu PICK_NONE) → wintty H2344 corner offx. Not NHW_TEXT
 * fullscreen; map under/left of the panel stays.
 */
async function show_getpos_tip() {
    // Exact nhcore.lua [[...]] lines (nhl_text splits on \n; wrap at 76).
    // C: nhl_text → select_menu(PICK_NONE) — Esc/Return/Space dismiss;
    // other keys re-prompt (C xwaitforspace).
    const lines = [
        'Tip: Farlooking or selecting a map location',
        '',
        'You are now in a "farlook" mode - the movement keys move the cursor,',
        'not your character.  Game time does not advance.  This mode is used',
        'to look around the map, or to select a location on it.',
        '',
        'When in this mode, you can press ESC to return to normal game mode,',
        'and pressing ? will show the key help.',
    ];
    for (;;) {
        await paint_corner_nhw_menu(lines, '(end) ');
        await flush_screen(1);
        const key = await nhgetch();
        if (key === 27 || key === 13 || key === 10 || key === 32) break;
        // other keys: stay open (C xwaitforspace / PICK_NONE)
    }
    game._menu_overlay = false;
    // C: closing tip NHW_MENU does not docrt — gbuf still holds whatever
    // show_glyph wrote (reveal_terrain map). docrt would newsym hero `@`
    // back over TER_MAP browse. Rebuild tty from loc.disp_* instead.
    if (game.iflags?.terrainmode) {
        await flush_screen(1);
    } else {
        await docrt();
        await flush_screen(1);
    }
}

/**
 * C ref: getpos.c getpos — force=TRUE (travel) keeps unknown keys in-loop;
 * force=FALSE (whatis) may abort. Returns LOOK_* (>=0) or -1 on cancel.
 */
export async function getpos(ccp, force, goal, describeAt) {
    const g = game;
    if (!g.flags) g.flags = {};
    let cx = ccp.x | 0;
    let cy = ccp.y | 0;
    if (!isok(cx, cy)) {
        cx = g.u?.ux || 1;
        cy = g.u?.uy || 0;
    }

    // C: msg_given = TRUE (clear message window by default)
    let msg_given = true;
    let show_goal_msg = false;
    if (!g.context) g.context = {};
    if (!g.context.tips_given) g.context.tips_given = {};
    if (!g.context.tips_given.TIP_GETPOS) {
        g.context.tips_given.TIP_GETPOS = true;
        await show_getpos_tip();
        // C handle_tip → show_goal_msg = TRUE
        show_goal_msg = true;
    }

    if (g.flags.verbose !== false) {
        await pline("(For instructions type a '?')");
        msg_given = true;
    }

    const disp = g.nhDisplay;
    for (;;) {
        // C getpos: show_goal_msg / auto_describe then curs then readchar.
        if (show_goal_msg) {
            await pline(`Move cursor to ${goal || 'desired location'}:`);
            show_goal_msg = false;
            msg_given = true;
        } else if (g.iflags?.autodescribe && !msg_given) {
            // C auto_describe — firstmatch via lookat / do_screen_description
            let brief = '';
            if (typeof describeAt === 'function' && !(g.iflags.terrainmode | 0)) {
                // Ordinary whatis: keep caller brief_at when not terrain browse
                brief = describeAt(cx, cy) || '';
            }
            if (!brief) brief = auto_describe_text(cx, cy);
            g._pending_message = brief || '';
        }

        // flush_screen/_buildScreenOutput resets cursor to hero for ordinary
        // topline messages — set getpos cursor *after* flush, like C curs().
        if (disp?.setCursor) {
            await flush_screen(1);
            disp.setCursor(cx - 1, cy + 1);
        } else {
            await flush_screen(1);
        }
        const key = await nhgetch();
        const ch = String.fromCharCode(key);

        // C: if (iflags.autodescribe) msg_given = FALSE;
        if (g.iflags?.autodescribe) msg_given = false;

        if (key === 27) {
            ccp.x = -1;
            ccp.y = -1;
            g._pending_message = '';
            return -1;
        }

        if (ch === '.' || ch === ',' || ch === ':' || ch === ';') {
            ccp.x = cx;
            ccp.y = cy;
            // '.' → LOOK_TRADITIONAL (continue whatis loop); ',' often LOOK_ONCE
            return ch === ',' ? LOOK_ONCE : LOOK_TRADITIONAL;
        }

        // C ref: getpos.c movecmd(c, MV_WALK) → one step; MV_RUN (highc)
        // / MV_RUSH (C(dir)) → dx=8*u.dx (getloc_moveskip Off path).
        let walk = null;
        let rush = false;
        if (ch in DIR_DX) {
            walk = ch;
        } else if (ch.toLowerCase() in DIR_DX && ch !== ch.toLowerCase()) {
            // highc(dirchars) → MV_RUN
            walk = ch.toLowerCase();
            rush = true;
        } else if (key in CTRL_DIR) {
            // C(dirchars) → MV_RUSH (same 8-step path)
            walk = CTRL_DIR[key];
            rush = true;
        }

        if (walk) {
            let dx = DIR_DX[walk];
            let dy = DIR_DY[walk];
            if (rush) {
                // C: iflags.getloc_moveskip Off → 8*u.dx (glyph-skip omitted)
                dx *= 8;
                dy *= 8;
            }
            const next = truncate_to_map(cx, cy, dx, dy);
            cx = next.x;
            cy = next.y;
            // C: describe at loop top via auto_describe; when that option
            // is off, keep caller describeAt (whatis brief_at) as fallback.
            if (!g.iflags?.autodescribe && typeof describeAt === 'function') {
                const brief = describeAt(cx, cy);
                if (brief) g._pending_message = brief;
            }
            continue;
        }

        // C: quitchars (space / CR / LF) — !force → "Done." and leave;
        // force (travel) keeps looping (goto nxtc).
        if (ch === ' ' || key === 13 || key === 10) {
            if (force) continue;
            await pline('Done.');
            ccp.x = -1;
            ccp.y = 0;
            return 0; // C: result = 0 (not -1)
        }

        if (ch === '?') {
            await pline('Move the cursor with hjklyubn; . selects; ESC cancels.');
            msg_given = true;
            continue;
        }

        // C ref: getpos.c — non-dir key may match dungeon-feature symbols
        // (defsyms/showsyms); '>'/'<' → next stairs/ladder. Full matching[]
        // over MAXPCHARS (fountain/altar/trap/engraving) deferred.
        if (ch === '>' || ch === '<') {
            const found = find_dungeon_feature(cx, cy, ch);
            if (found) {
                cx = found.x;
                cy = found.y;
                if (msg_given) {
                    g._pending_message = '';
                    msg_given = false;
                }
                continue;
            }
            await pline(`Can't find dungeon feature '${ch}'.`);
            msg_given = true;
            continue;
        }

        // C ref: getpos.c unknown key — force keeps looping; !force aborts
        const note = force
            ? "use 'h', 'j', 'k', 'l' or '.'"
            : 'aborted';
        await pline(`Unknown direction: '${ch}' (${note}).`);
        msg_given = true;
        if (force) continue;
        ccp.x = -1;
        ccp.y = -1;
        g._pending_message = '';
        return -1;
    }
}
