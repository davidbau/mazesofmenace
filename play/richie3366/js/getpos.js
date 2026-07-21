// getpos.js — Cursor-position selection (partial).
// C ref: getpos.c getpos / getpos_help / auto_describe / hack.c handle_tip.
//
// Branch envelope: verbose instruction pline, first-use getpos tip
// (nhcore show_getpos_tip PICK_NONE loop), hjklyubn walk + HJKLYUBN/Ctrl-dir
// rush (8×; '\n'==C('j') rushes — movecmd before quitchars), seenv-gated
// feature-char matching (stairs + furniture/traps subset; D-0779/D-0818),
// NHKF_GETPOS_SHOWVALID '$' before matching (D-0928 #1176),
// `?` → getpos_help NHW_MENU + show_goal_msg (D-0819), autodescribe
// topline, force unknown-direction pline, '.' → LOOK_TRADITIONAL,
// ESC → -1. Menu/mMoOdDxX jump/S_goodpos tmp_at hilite/getloc_moveskip
// glyph-skip / engraving/drawbridge/air full showsyms table deferred.
// getpos_getvalid `(invalid target)` live (D-0899).

import { game } from './gstate.js';
import { nhgetch } from './input.js';
import { flush_screen, flush_screen_getpos_dirty, pline, docrt, terrain_glyph, look_shown_at, newsym_force } from './display.js';
import { cansee } from './vision.js';
import { distant_name, doname, ansimpleoname } from './objnam.js';
import {
    COLNO, ROWNO, isok, TER_MON, TER_OBJ, TER_MAP, TER_DETECT,
    GLOC_MONS, GLOC_OBJS, GLOC_DOOR, GLOC_EXPLORE, GLOC_INTERESTING,
    NHKF_GETPOS_SELF, NHKF_GETPOS_PICK, NHKF_GETPOS_SHOWVALID,
    NHKF_GETPOS_AUTODESC,
    NHKF_GETPOS_MON_NEXT, NHKF_GETPOS_MON_PREV,
    NHKF_GETPOS_OBJ_NEXT, NHKF_GETPOS_OBJ_PREV,
    NHKF_GETPOS_DOOR_NEXT, NHKF_GETPOS_DOOR_PREV,
    NHKF_GETPOS_UNEX_NEXT, NHKF_GETPOS_UNEX_PREV,
    NHKF_GETPOS_INTERESTING_NEXT, NHKF_GETPOS_INTERESTING_PREV,
    NHKF_GETPOS_MOVESKIP, NHKF_GETPOS_MENU, NHKF_GETPOS_LIMITVIEW,
    M_AP_TYPE, M_AP_OBJECT, M_AP_FURNITURE, STRAT_WAITMASK,
    STAIRS, LADDER, LA_DOWN, ROOM, CORR, STONE, SCORR, TREE, CLOUD, IS_WALL,
    DOOR, IS_DOOR, D_NODOOR, D_ISOPEN, D_BROKEN,
    POOL, MOAT, WATER, LAVAPOOL, LAVAWALL, ICE, IRONBARS,
    FOUNTAIN, SINK, THRONE, GRAVE, ALTAR, VIBRATING_SQUARE,
    ROGUESET, Upolyd, Is_airlevel, Is_rogue_level,
} from './const.js';
import { paint_corner_nhw_menu } from './invent.js';
import { distant_monnam_none, pmname, Ugender } from './do_name.js';
import { stairway_at, known_branch_stairs } from './mklev.js';
import { t_at, trapname } from './trap.js';
import { waterbody_name } from './hack.js';
import { is_valid_travelpt } from './cmd.js';
import { ok_to_quest } from './quest.js';
import { visctrl } from './dokeylist.js';

export const LOOK_TRADITIONAL = 0;
export const LOOK_QUICK = 1;
export const LOOK_ONCE = 2;
export const LOOK_VERBOSE = 3;

/** @type {((on: boolean) => void) | null} */
let getpos_hilitefunc = null;
/** @type {((x: number, y: number) => boolean) | null} */
let getpos_getvalid = null;

// C ref: getpos.c enum getposHiliteState — bgcolors Off → 2 states.
const HiliteNormalMap = 0;
const HiliteGoodposSymbol = 1;
/** @type {number} */
let getpos_hilite_state = HiliteNormalMap;

/**
 * C ref: getpos.c getpos_getvalids_selection + selection_force_newsyms —
 * dirty every cell where validf is true so flush_screen(0) reprints them.
 */
function force_getvalid_newsyms(validf) {
    if (typeof validf !== 'function') return;
    for (let x = 1; x < COLNO; x++) {
        for (let y = 0; y < ROWNO; y++) {
            if (validf(x, y)) newsym_force(x, y);
        }
    }
}

/**
 * C ref: getpos.c getpos_toggle_hilite_state — cycle Normal↔Goodpos
 * (HiliteBackground deferred until iflags.bgcolors path is live).
 */
function getpos_toggle_hilite_state() {
    if (!getpos_hilitefunc) return;
    if (getpos_hilite_state === HiliteGoodposSymbol) {
        getpos_hilitefunc(false);
    }
    const nstates = game.iflags?.bgcolors ? 3 : 2;
    getpos_hilite_state = (getpos_hilite_state + 1) % nstates;
    // C: getpos_sethilite(same callbacks) refreshes map_frame_color.
    getpos_sethilite(getpos_hilitefunc, getpos_getvalid);
    if (getpos_hilite_state === HiliteGoodposSymbol) {
        getpos_hilitefunc(true);
    }
}

/**
 * C ref: getpos.c getpos_sethilite — install/clear getvalid + hilite callbacks.
 * When getvalid changes, force-newsym old∪new valid cells (selvar path).
 * Hilite glyph painting (HiliteGoodposSymbol tmp_at) deferred; getvalid
 * drives "(invalid target)" and the dirty-cell cursor side-effect.
 */
export function getpos_sethilite(hilitef, getvalidf) {
    const old_getvalid = getpos_getvalid;
    // C: getvalid change resets hilite_state to default (Normal without bgcolors)
    if ((typeof getvalidf === 'function' ? getvalidf : null) !== old_getvalid) {
        getpos_hilite_state = HiliteNormalMap;
    }
    getpos_hilitefunc = typeof hilitef === 'function' ? hilitef : null;
    getpos_getvalid = typeof getvalidf === 'function' ? getvalidf : null;
    if (getpos_getvalid !== old_getvalid) {
        force_getvalid_newsyms(old_getvalid);
        force_getvalid_newsyms(getpos_getvalid);
    }
}

/**
 * C ref: getpos.c getpos_validate — true when no getvalid or cell allowed.
 */
export function getpos_validate(x, y) {
    if (!getpos_getvalid) return true;
    return !!getpos_getvalid(x, y);
}

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

/** C ref: display.js use_decgraphics — Primary DEC showsyms active. */
function use_dec_syms() {
    if ((game.currentgraphics | 0) === ROGUESET) return false;
    return !!game.iflags?.decgraphics;
}

/**
 * C ref: getpos.c matching[] build — defsyms[].sym / showsyms[] for
 * feature cmaps (walls/room/corr/door/ndoor skipped). Returns tag set;
 * empty ⇒ C k==0 → unknown-direction.
 * Named deferred: engraving/drawbridge/air full MAXPCHARS table.
 */
function feature_match_tags(ch) {
    const tags = new Set();
    const dec = use_dec_syms();

    // Stairs / ladder (defsyms always '<' / '>')
    if (ch === '>') tags.add('dnfeature');
    if (ch === '<') tags.add('upfeature');

    // Altar: defsyms '_'; DECgraphics showsyms '{'
    if (ch === '_') tags.add('altar');
    if (ch === '{' && dec) tags.add('altar');

    // Furniture defsyms
    if (ch === '{') {
        tags.add('sink');
        tags.add('fountain');
    }
    if (ch === '|') tags.add('grave');
    if (ch === '\\') tags.add('throne');

    // Tree / bars / cloud defsyms are '#', but NHKF_GETPOS_AUTODESC is
    // also '#' and is handled before matching[] in C — do not claim '#'
    // here until that toggle is ported (would steal the spkey).
    // DEC tree showsym 'g' / bars '|' can still match when typed.
    if (ch === 'g' && dec) tags.add('tree');
    if (ch === '|' && dec) tags.add('bars');

    // Water bodies — defsyms '}'; DEC showsyms '`'
    if (ch === '}') {
        tags.add('pool');
        tags.add('lava');
        tags.add('lavawall');
        tags.add('water');
    }
    if (ch === '`' && dec) {
        tags.add('pool');
        tags.add('lava');
        tags.add('lavawall');
        tags.add('water');
    }

    // Ice: defsyms '.'; DEC '~' — '.' is pick_chars (never reaches here)
    if (ch === '~' && dec) tags.add('ice');

    // Traps: '^' matches every trap cmap; '~' also VS special below
    if (ch === '^') tags.add('trap');
    if (ch === '~') tags.add('trap_vs');

    // Zap/effect cmaps still enter matching[] (walls/room/corr/door skipped).
    // S_ss1 defsym '0' — rarely on map → "Can't find dungeon feature '0'."
    // (D-0928 #1135 seed4500 @136). Other ss/beam/expl glyphs still deferred.
    if (ch === '0') tags.add('ss1');

    return tags;
}

/**
 * C ref: getpos.c seenv back_to_glyph / stairs terrain arm.
 * Stairs require seenv (D-0779); blank disp_ch is not "known".
 */
function terrain_matches_tags(loc, x, y, tags, ch) {
    const typ = loc.typ | 0;
    if (tags.has('altar') && typ === ALTAR) return true;
    if (tags.has('sink') && typ === SINK) return true;
    if (tags.has('fountain') && typ === FOUNTAIN) return true;
    if (tags.has('grave') && typ === GRAVE) return true;
    if (tags.has('throne') && typ === THRONE) return true;
    if (tags.has('tree') && typ === TREE) return true;
    if (tags.has('bars') && typ === IRONBARS) return true;
    if (tags.has('cloud') && typ === CLOUD) return true;
    if (tags.has('pool') && (typ === POOL || typ === MOAT)) return true;
    if (tags.has('water') && typ === WATER) return true;
    if (tags.has('lava') && typ === LAVAPOOL) return true;
    if (tags.has('lavawall') && typ === LAVAWALL) return true;
    if (tags.has('ice') && typ === ICE) return true;
    if (tags.has('dnfeature') || tags.has('upfeature')) {
        if (typ !== STAIRS && typ !== LADDER) return false;
        if (!(loc.seenv | 0)) return false;
        const down = !!(loc.ladder & LA_DOWN);
        if (ch === '>') return down;
        if (ch === '<') return !down;
    }
    if (tags.has('trap') || tags.has('trap_vs')) {
        const t = t_at(x, y);
        if (!t || !t.tseen) return false;
        if (tags.has('trap')) return true;
        if (tags.has('trap_vs') && (t.ttyp | 0) === VIBRATING_SQUARE) return true;
    }
    return false;
}

/** Visible cmap: disp_ch is this terrain's showsym (not a covering mon). */
function visible_feature_match(loc, x, y, tags, ch) {
    if ((tags.has('dnfeature') || tags.has('upfeature')) && loc.disp_ch === ch) {
        return true;
    }
    if (!terrain_matches_tags(loc, x, y, tags, ch)) return false;
    // Stairs already gated seenv inside terrain_matches_tags
    if (tags.has('dnfeature') || tags.has('upfeature')) return true;
    if (tags.has('trap') || tags.has('trap_vs')) {
        const t = t_at(x, y);
        if (!t?.tseen) return false;
        const want = (t.ttyp | 0) === VIBRATING_SQUARE ? '~' : '^';
        // WEB is '"' — '^' still matches via is_cmap_trap when c=='^'
        if (tags.has('trap') && (loc.disp_ch === '^' || loc.disp_ch === '"' || loc.disp_ch === '~')) {
            return true;
        }
        return loc.disp_ch === want;
    }
    const g = terrain_glyph(loc, x, y);
    return loc.disp_ch === g.ch;
}

function remembered_feature_match(loc, x, y, tags, ch) {
    const rg = loc.remembered_glyph;
    if (!rg || rg.ch == null || rg.ch === '') return false;
    // Approximate glyph_to_cmap(memory): terrain typ + remembered ch
    if (terrain_matches_tags(loc, x, y, tags, ch)) {
        if (tags.has('trap') || tags.has('trap_vs')) {
            return rg.ch === '^' || rg.ch === '"' || rg.ch === '~';
        }
        const g = terrain_glyph(loc, x, y);
        return rg.ch === g.ch;
    }
    return false;
}

/**
 * C ref: getpos.c unknown-key feature scan — matching[] then two passes
 * from cursor (pass0 past current to SE; pass1 NW through current).
 * Returns {x,y} or null.
 */
function find_dungeon_feature(cx, cy, ch, tags) {
    for (let pass = 0; pass <= 1; pass++) {
        const loY = pass === 0 ? cy : 0;
        const hiY = pass === 0 ? ROWNO - 1 : cy;
        for (let ty = loY; ty <= hiY; ty++) {
            const loX = (pass === 0 && ty === loY) ? cx + 1 : 1;
            const hiX = (pass === 1 && ty === hiY) ? cx : COLNO - 1;
            for (let tx = loX; tx <= hiX; tx++) {
                if (!isok(tx, ty)) continue;
                const loc = game.level?.at?.(tx, ty);
                if (!loc) continue;
                // C: glyph_at cmap, then memory glyph, then ~ VS, then seenv
                if (visible_feature_match(loc, tx, ty, tags, ch)) {
                    return { x: tx, y: ty };
                }
                if (
                    game.level?.flags?.hero_memory !== false
                    && !(game.iflags?.terrainmode | 0)
                    && remembered_feature_match(loc, tx, ty, tags, ch)
                ) {
                    return { x: tx, y: ty };
                }
                if (ch === '~') {
                    const t = t_at(tx, ty);
                    if (t && (t.ttyp | 0) === VIBRATING_SQUARE && t.tseen) {
                        return { x: tx, y: ty };
                    }
                }
                if ((loc.seenv | 0) && terrain_matches_tags(loc, tx, ty, tags, ch)) {
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

/**
 * C ref: pager.c self_lookat — race + pmname + called plname + Punished
 * chained suffix. Steed / mhidden / utrap deferred (same as pager.js).
 */
function self_lookat_brief() {
    const u = game.u || {};
    let race = '';
    if (!Upolyd(u)) {
        const adj = game.urace?.adj || game.urace?.noun || 'human';
        race = `${String(adj)} `;
    }
    const mndx = u.umonnum ?? game.urole?.mnum;
    const form = pmname(mndx, Ugender());
    const plname = game.plname || 'hero';
    const invis =
        u.Invis && (u.senseself || !u.Blind) ? 'invisible ' : '';
    let buf = `${invis}${race}${form} called ${plname}`;
    // C: if (Punished) … uball ? ansimpleoname(uball) : "nothing?"
    // C: Punished ≡ (uball != 0)
    if (u.uball) {
        buf += `, chained to ${ansimpleoname(u.uball)}`;
    }
    return buf;
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

/** C dungeon.h on_level — dnum+dlevel equality. */
function on_level(a, b) {
    return (a?.dnum | 0) === (b?.dnum | 0) && (a?.dlevel | 0) === (b?.dlevel | 0);
}

/**
 * C ref: pager.c do_screen_description after lookat — qstart Home
 * downstairs are "blocked staircase down" until ok_to_quest().
 * Named: ice_descr rewrite sibling deferred (same didlook arm).
 */
export function maybe_blocked_staircase_down(look_buf) {
    if (
        look_buf === 'staircase down'
        && on_level(game.u?.uz, game.qstart_level)
        && !ok_to_quest()
    ) {
        return 'blocked staircase down';
    }
    return look_buf;
}

/**
 * C ref: pager.c lookat — glyph_is_nothing / cmap cmap S_darkroom →
 * "dark part of a room"; S_room → "floor of a room". display.c newsym
 * out-of-sight converts remembered S_room → DARKROOMSYM when
 * !waslit || (flags.dark_room && iflags.use_color); Rogue !waslit →
 * S_stone. Named: GLYPH_NOTHING blank when !dark_room (auto_describe
 * still maps bare space → "unexplored area").
 */
export function room_cmap_explanation(x, y, loc) {
    if (!loc) return 'dark part of a room';
    // Visible room floor is always back_to_glyph S_room.
    if (cansee(x, y)) return 'floor of a room';
    // C newsym Rogue branch: !waslit S_room → S_stone
    if (Is_rogue_level(game.u?.uz)) {
        if (!loc.waslit) return loc.seenv ? 'stone' : 'unexplored';
        return 'floor of a room';
    }
    const darkRoomColor = game.flags?.dark_room !== false
        && game.flags?.color !== false
        && game.iflags?.use_color !== false;
    // C: !waslit || (dark_room && use_color) → S_darkroom (or NOTHING)
    if (!loc.waslit || darkRoomColor) return 'dark part of a room';
    return 'floor of a room';
}

/**
 * C ref: pager.c lookat glyph_is_cmap doors — S_ndoor special +
 * defsyms S_vodoor/S_hodoor/S_vcdoor/S_hcdoor explanations; invent.c
 * dfeature_at doormask switch (same strings). Named: drawbridge
 * portcullis override (`is_drawbridge_wall`); D_TRAPPED exact-mask
 * quirks beyond invent/default closed.
 */
function door_cmap_explanation(loc) {
    // C invent.c dfeature_at / lookat S_ndoor + defsyms door explanations
    switch (loc.doormask ?? D_NODOOR) {
    case D_NODOOR:
        return 'doorway';
    case D_ISOPEN:
        return 'open door';
    case D_BROKEN:
        return 'broken door';
    default:
        // D_CLOSED / D_LOCKED (+ optional D_TRAPPED) → "closed door"
        return 'closed door';
    }
}

/**
 * C ref: pager.c lookat glyph_is_cmap → defsyms[].explanation (default
 * arm) + S_pool/S_water/S_lava/S_ice → waterbody_name. Used by getpos
 * auto_describe firstmatch after stairs/traps.
 * Named omissions: S_altar special (`align_str` / AM_SANCTUM "high ");
 * engraving; drawbridge portcullis; underwater unreconnoitered; object
 * glyphs; Hallucination waterbody; arboreal STONE→S_tree; gas-cloud
 * region glyph overlay on non-CLOUD typ (lookat uses glyph_at); AIR /
 * drawbridge lowered/raised defsyms.
 */
function cmap_defsym_explanation(x, y, loc) {
    if (!loc) return '';
    const typ = loc.typ;
    // C lookat case S_pool/S_water/S_lava/S_lavawall/S_ice → waterbody_name
    if (typ === POOL || typ === MOAT || typ === WATER
        || typ === LAVAPOOL || typ === LAVAWALL || typ === ICE) {
        return waterbody_name(x, y);
    }
    // C lookat case S_cloud (pager.c) — air plane vs ordinary fog/vapor
    if (typ === CLOUD) {
        return Is_airlevel(game.u?.uz) ? 'cloudy area' : 'fog/vapor cloud';
    }
    // C lookat cmap doors (S_ndoor / S_*odoor / S_*cdoor) via defsyms
    if (IS_DOOR(typ) || typ === DOOR) return door_cmap_explanation(loc);
    // C lookat cmap default → defsyms[symidx].explanation
    if (IS_WALL(typ)) return 'wall';
    if (typ === ROOM) return room_cmap_explanation(x, y, loc);
    if (typ === CORR) {
        return loc.lit || game.flags?.lit_corridor ? 'lit corridor' : 'corridor';
    }
    // C defsym.h PCHAR — furniture default arm (S_fountain..S_bars / tree)
    if (typ === FOUNTAIN) return 'fountain';
    if (typ === SINK) return 'sink';
    if (typ === THRONE) return 'opulent throne'; // PCHAR2 explanation
    if (typ === GRAVE) return 'grave';
    if (typ === IRONBARS) return 'iron bars';
    // C defsym.h PCHAR S_tree → "tree" (lookat default arm)
    if (typ === TREE) return 'tree';
    // C lookat case S_stone: !seenv → "unexplored"; else if STONE|SCORR → "stone"
    if (typ === STONE || typ === SCORR) {
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
 * underwater unreconnoitered, special cmap arms (altar; doors D-0815;
 * cloud typ D-0811). Object: shown floor via look_shown_at + distant_name
 * doname (D-0928 #1136); object_from_map fakeobj, doname_with_price /
 * doname_vague_quan, buried/embedded suffixes deferred. Trap: tseen
 * `trapname` only (trapped_chest/door / Hallucination deferred). Travel:
 * " (no travel path)" via is_valid_travelpt when getloc_travelmode
 * (D-0809). getpos_getvalid "(invalid target)" live (D-0899); S_goodpos
 * hilite glyphs deferred.
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

    // C lookat glyph_is_object → look_at_object (before trap/cmap)
    if (!terrainmode || (terrainmode & TER_OBJ) !== 0) {
        const shown = look_shown_at(cx, cy);
        if (shown?.kind === 'obj' && shown.obj) {
            // C: distant_name(otmp, dknown ? doname_with_price : doname_vague_quan)
            // Named: with_price / vague_quan / fakeobj / location suffixes
            return distant_name(shown.obj, doname);
        }
    }

    const loc = game.level?.at?.(cx, cy);
    const ch = loc?.disp_ch;
    // Blank showsyms may be unexplored or S_stone (space). C lookat uses
    // glyph_at: glyph_is_unexplored → "unexplored area"; cmap S_stone +
    // seenv + typ STONE|SCORR → "stone" (pager.c). TER_DETECT after
    // clear_glyph_buffer forces gbuf unexplored even when memory is
    // stone (D-0390 / seed0012) — do not promote those blanks.
    // lastseentyp gates overmarked JS seenv (D-0813); travelmode not
    // required (^T getpos / farlook share the same lookat arm).
    if (!ch || ch === ' ') {
        if (terrainmode & TER_DETECT) {
            // C: gbuf unexplored after clear_glyph_buffer
            return 'unexplored area';
        }
        const last = game.lastseentyp?.[cx]?.[cy] | 0;
        if (
            loc
            && (loc.typ === STONE || loc.typ === SCORR)
            && loc.seenv
            && (last === STONE || last === SCORR)
        ) {
            // C lookat case S_stone + seenv + STONE|SCORR → "stone"
            return 'stone';
        }
        // C lookat glyph_is_unexplored → "unexplored area"
        return 'unexplored area';
    }

    // C lookat glyph_is_cmap stairs/ladder → defsyms explanation (firstmatch)
    // then do_screen_description blocked-stair rewrite (D-0814)
    const stair = stair_ladder_explanation(cx, cy);
    if (stair) return maybe_blocked_staircase_down(stair);

    // C lookat glyph_is_trap → trap_description (seen map_trap glyph)
    const trap = t_at(cx, cy);
    if (trap && trap.tseen) return trapname(trap.ttyp, false);

    // C lookat glyph_is_cmap → defsyms / waterbody_name (ROOM/moat/wall…)
    const cmap = cmap_defsym_explanation(cx, cy, loc);
    if (cmap) return cmap;

    // Remaining special cmap under TER_* browse still deferred
    return 'unexplored area';
}

/**
 * C ref: getpos.c auto_describe — firstmatch then optional suffixes:
 * " (invalid target)" if getpos_getvalid fails; " (no travel path)" if
 * getloc_travelmode && !is_valid_travelpt. getpos_getvalid deferred.
 */
function auto_describe_suffix(cx, cy) {
    let s = '';
    // C ref: getpos.c auto_describe — getpos_getvalid → " (invalid target)"
    if (getpos_getvalid && !getpos_getvalid(cx, cy)) {
        s += ' (invalid target)';
    }
    if (game.iflags?.getloc_travelmode && !is_valid_travelpt(cx, cy)) {
        s += ' (no travel path)';
    }
    return s;
}

// C ref: cmd.c spkeys_binds defaults (!num_pad) for getpos help text.
const GETPOS_SPKEY_DEFAULT = {
    [NHKF_GETPOS_SELF]: '@'.charCodeAt(0),
    [NHKF_GETPOS_PICK]: '.'.charCodeAt(0),
    // cmd.c spkeys_binds: NHKF_GETPOS_SHOWVALID '$' (before matching[])
    [NHKF_GETPOS_SHOWVALID]: '$'.charCodeAt(0),
    [NHKF_GETPOS_AUTODESC]: '#'.charCodeAt(0),
    [NHKF_GETPOS_MON_NEXT]: 'm'.charCodeAt(0),
    [NHKF_GETPOS_MON_PREV]: 'M'.charCodeAt(0),
    [NHKF_GETPOS_OBJ_NEXT]: 'o'.charCodeAt(0),
    [NHKF_GETPOS_OBJ_PREV]: 'O'.charCodeAt(0),
    [NHKF_GETPOS_DOOR_NEXT]: 'd'.charCodeAt(0),
    [NHKF_GETPOS_DOOR_PREV]: 'D'.charCodeAt(0),
    [NHKF_GETPOS_UNEX_NEXT]: 'x'.charCodeAt(0),
    [NHKF_GETPOS_UNEX_PREV]: 'X'.charCodeAt(0),
    [NHKF_GETPOS_INTERESTING_NEXT]: 'a'.charCodeAt(0),
    [NHKF_GETPOS_INTERESTING_PREV]: 'A'.charCodeAt(0),
    [NHKF_GETPOS_MOVESKIP]: '*'.charCodeAt(0),
    [NHKF_GETPOS_MENU]: '!'.charCodeAt(0),
    [NHKF_GETPOS_LIMITVIEW]: '"'.charCodeAt(0),
};

/** C ref: getpos.c gloc_descr[][4] — index 2 used when !getloc_usemenu. */
const GLOC_DESCR = [
    ['any monsters', 'monster', 'next/previous monster', 'monsters'],
    ['any items', 'item', 'next/previous object', 'objects'],
    ['any doors', 'door', 'next/previous door or doorway', 'doors or doorways'],
    ['any unexplored areas', 'unexplored area', 'unexplored location',
        'locations next to unexplored locations'],
    ['anything interesting', 'interesting thing', 'anything interesting',
        'anything interesting'],
    ['any valid locations', 'valid location', 'valid location',
        'valid locations'],
];

const GLOC_FILTERTXT = ['', ' in view', ' in this area'];

function getpos_spkey(nhkf) {
    const sp = game.Cmd?.spkeys;
    const v = sp?.[nhkf];
    if (v != null && v !== 0) return v & 0xff;
    return GETPOS_SPKEY_DEFAULT[nhkf] & 0xff;
}

/**
 * C ref: getpos.c getpos_help_keyxhelp — one putstr line for m/M style jumps.
 */
function getpos_help_keyxhelp(lines, k1, k2, gloc) {
    const usemenu = !!(game.iflags?.getloc_usemenu);
    const filter = game.iflags?.getloc_filter | 0;
    let move_cursor_to = 'move the cursor to ';
    let filtertxt = GLOC_FILTERTXT[filter] || '';
    if (gloc === GLOC_EXPLORE) {
        move_cursor_to = 'move the cursor next to an ';
        if (usemenu) {
            filtertxt = String(filtertxt).replace('this area', 'area');
        }
    }
    const descr = GLOC_DESCR[gloc]?.[2 + (usemenu ? 1 : 0)] || '';
    lines.push(
        `Use '${visctrl(k1)}'/'${visctrl(k2)}' to ${
            usemenu ? 'get a menu of ' : move_cursor_to
        }${descr}${filtertxt}.`,
    );
}

/**
 * C ref: getpos.c getpos_help — NHW_MENU putstr + display_nhwindow(TRUE).
 * Default !num_pad move/run/rush keys (hjklyubn / HJKL / G,g). Named:
 * cmd_from_func custom binds; getpos_getvalid/hilite lines; whatis pick
 * variants when goal === what_is_a_location.
 */
async function getpos_help(force, goal) {
    const fastmovemode = ['8 units at a time', 'skipping same glyphs'];
    const moveskip = !!(game.iflags?.getloc_moveskip);
    const terrainmode = game.iflags?.terrainmode | 0;
    const lines = [];

    // C: cmd_from_func(do_move_{west,south,north,east}) → h,j,k,l
    lines.push(
        `Use 'h', 'j', 'k', 'l' to move the cursor to ${goal || 'desired location'}.`,
    );
    // C: do_run_* → H,J,K,L
    lines.push(
        `Use 'H', 'J', 'K', 'L' to fast-move the cursor, ${fastmovemode[moveskip ? 1 : 0]}.`,
    );
    // C: do_run / do_rush → 'G' / 'g'
    lines.push("(or prefix normal move with 'G' or 'g' to fast-move)");
    lines.push("Or enter a background symbol (ex. '<').");
    lines.push(
        `Use '${visctrl(getpos_spkey(NHKF_GETPOS_SELF))}' to move the cursor on yourself.`,
    );

    if (!terrainmode || (terrainmode & TER_MON) !== 0) {
        getpos_help_keyxhelp(
            lines,
            getpos_spkey(NHKF_GETPOS_MON_NEXT),
            getpos_spkey(NHKF_GETPOS_MON_PREV),
            GLOC_MONS,
        );
    }
    // C: if (goal && !strcmp(goal, "a monster")) goto skip_non_mons;
    if (!(goal && goal === 'a monster')) {
        if (!terrainmode || (terrainmode & TER_OBJ) !== 0) {
            getpos_help_keyxhelp(
                lines,
                getpos_spkey(NHKF_GETPOS_OBJ_NEXT),
                getpos_spkey(NHKF_GETPOS_OBJ_PREV),
                GLOC_OBJS,
            );
        }
        if (!terrainmode || (terrainmode & TER_MAP) !== 0) {
            getpos_help_keyxhelp(
                lines,
                getpos_spkey(NHKF_GETPOS_DOOR_NEXT),
                getpos_spkey(NHKF_GETPOS_DOOR_PREV),
                GLOC_DOOR,
            );
            getpos_help_keyxhelp(
                lines,
                getpos_spkey(NHKF_GETPOS_UNEX_NEXT),
                getpos_spkey(NHKF_GETPOS_UNEX_PREV),
                GLOC_EXPLORE,
            );
            getpos_help_keyxhelp(
                lines,
                getpos_spkey(NHKF_GETPOS_INTERESTING_NEXT),
                getpos_spkey(NHKF_GETPOS_INTERESTING_PREV),
                GLOC_INTERESTING,
            );
        }
        lines.push(
            `Use '${visctrl(getpos_spkey(NHKF_GETPOS_MOVESKIP))}' to change fast-move mode to ${
                fastmovemode[moveskip ? 0 : 1]
            }.`,
        );
        if (!terrainmode || (terrainmode & TER_DETECT) === 0) {
            lines.push(
                `Use '${visctrl(getpos_spkey(NHKF_GETPOS_MENU))}' to toggle menu listing for possible targets.`,
            );
            lines.push(
                `Use '${visctrl(getpos_spkey(NHKF_GETPOS_LIMITVIEW))}' to change the mode of limiting possible targets.`,
            );
        }
        if (!terrainmode) {
            // getpos_getvalid / getpos_hilitefunc lines deferred
            lines.push(
                `Use '${visctrl(getpos_spkey(NHKF_GETPOS_AUTODESC))}' to toggle automatic description.`,
            );
            // C doing_what_is only when goal == what_is_a_location; travel uses '.'
            lines.push(
                `Type a '${visctrl(getpos_spkey(NHKF_GETPOS_PICK))}' when you are at the right place.`,
            );
        }
    }
    if (!force) {
        lines.push("Type Space or Escape when you're done.");
    }
    lines.push('');

    // C: display_nhwindow(tmpwin, TRUE) → process_text_window + dmore
    const { show_nhw_menu_text } = await import('./pager.js');
    await show_nhw_menu_text(lines);
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

    // C: getpos_hilitefunc(TRUE) after sethilite when HiliteGoodposSymbol —
    // glyph highlight deferred; getvalid still active for auto_describe.

    if (g.flags.verbose !== false) {
        await pline("(For instructions type a '?')");
        msg_given = true;
    }

    const disp = g.nhDisplay;
    // C getpos: curs(cx,cy); flush_screen(0) before the read loop.
    // flush_screen(0) reprints dirty (getvalid) cells and leaves the
    // tty cursor on the last glyph — not on the hero (D-0928 #1137).
    if (disp?.setCursor) disp.setCursor(cx - 1, cy + 1);
    flush_screen_getpos_dirty();
    // First nhgetch uses the pre-loop dirty flush; later iterations need a
    // full flush + curs like the prior port (topline / map sync).
    let need_full_flush = false;

    for (;;) {
        // C getpos: show_goal_msg / auto_describe then curs then readchar.
        if (show_goal_msg) {
            await pline(`Move cursor to ${goal || 'desired location'}:`);
            show_goal_msg = false;
            msg_given = true;
            // C: curs + flush_screen(0) after goal pline (gnew usually empty
            // → cursor stays on cx,cy).
            if (disp?.setCursor) disp.setCursor(cx - 1, cy + 1);
            flush_screen_getpos_dirty();
            need_full_flush = false;
        } else if (g.iflags?.autodescribe && !msg_given) {
            // C auto_describe — firstmatch via lookat / do_screen_description
            // + travel/invalid suffixes; ends with curs + flush_screen(0).
            let brief = '';
            if (typeof describeAt === 'function' && !(g.iflags.terrainmode | 0)) {
                // Ordinary whatis: keep caller brief_at when not terrain browse
                brief = describeAt(cx, cy) || '';
            }
            if (!brief) brief = auto_describe_text(cx, cy);
            if (brief) brief += auto_describe_suffix(cx, cy);
            g._pending_message = brief || '';
            // Full rebuild keeps map/topline in sync for walk frames; then
            // curs onto the target (gnew usually empty after prior flush).
            await flush_screen(1);
            if (disp?.setCursor) disp.setCursor(cx - 1, cy + 1);
            need_full_flush = false;
        } else if (need_full_flush) {
            await flush_screen(1);
            if (disp?.setCursor) disp.setCursor(cx - 1, cy + 1);
        }

        const key = await nhgetch();
        need_full_flush = true;
        const ch = String.fromCharCode(key);

        // C: if (iflags.autodescribe) msg_given = FALSE;
        if (g.iflags?.autodescribe) msg_given = false;

        if (key === 27) {
            ccp.x = -1;
            ccp.y = -1;
            g._pending_message = '';
            if (getpos_hilitefunc) getpos_hilitefunc(false);
            getpos_sethilite(null, null);
            return -1;
        }

        if (ch === '.' || ch === ',' || ch === ':' || ch === ';') {
            ccp.x = cx;
            ccp.y = cy;
            if (getpos_hilitefunc) getpos_hilitefunc(false);
            getpos_sethilite(null, null);
            // '.' → LOOK_TRADITIONAL (continue whatis loop); ',' often LOOK_ONCE
            return ch === ',' ? LOOK_ONCE : LOOK_TRADITIONAL;
        }

        // C ref: getpos.c movecmd before quitchars. C('j')=='\n' is bound
        // to rush-south (cmd.c bind_key_fn); Enter therefore rushes +8 when
        // it reaches getpos (D-0779). Quitchars still apply when movecmd fails.
        let walk = null;
        let rush = false;
        if (ch in DIR_DX) {
            walk = ch;
        } else if (ch.toLowerCase() in DIR_DX && ch !== ch.toLowerCase()) {
            // highc(dirchars) → MV_RUN
            walk = ch.toLowerCase();
            rush = true;
        } else if (key in CTRL_DIR) {
            // C(dirchars) → MV_RUSH (same 8-step path); includes '\n' as C('j')
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

        // C: quitchars (" \r\n\033") — only when not a movecmd. '\n' already
        // handled as C('j') rush above; space/CR still force-continue.
        if (ch === ' ' || key === 13) {
            if (force) continue;
            await pline('Done.');
            ccp.x = -1;
            ccp.y = 0;
            return 0; // C: result = 0 (not -1)
        }

        if (ch === '?') {
            // C: NHKF_GETPOS_HELP → getpos_help; getpos_refresh; show_goal_msg
            await getpos_help(!!force, goal || 'desired location');
            show_goal_msg = true;
            msg_given = true;
            continue;
        }

        // C ref: getpos.c NHKF_GETPOS_SHOWVALID ('$') — before matching[].
        // With default bind, '$' never reaches S_goodpos feature scan.
        if (key === getpos_spkey(NHKF_GETPOS_SHOWVALID)) {
            if (getpos_hilitefunc) {
                getpos_toggle_hilite_state();
                if (disp?.setCursor) disp.setCursor(cx - 1, cy + 1);
            }
            show_goal_msg = true; // still targeting
            continue;
        }

        // C ref: getpos.c — non-dir key may match dungeon-feature symbols
        // (defsyms/showsyms matching[]); scan or "Can't find…"; else unknown.
        if (!' \r\n\x1b'.includes(ch)) {
            const tags = feature_match_tags(ch);
            if (tags.size > 0) {
                const found = find_dungeon_feature(cx, cy, ch, tags);
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
        }

        // C ref: getpos.c unknown key — force keeps looping; !force aborts
        // C: pline("Unknown direction: '%s' (%s).", visctrl((char) c), note);
        const note = force
            ? "use 'h', 'j', 'k', 'l' or '.'"
            : 'aborted';
        await pline(`Unknown direction: '${visctrl(key)}' (${note}).`);
        msg_given = true;
        if (force) continue;
        ccp.x = -1;
        ccp.y = -1;
        g._pending_message = '';
        if (getpos_hilitefunc) getpos_hilitefunc(false);
        getpos_sethilite(null, null);
        return -1;
    }
}
