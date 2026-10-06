// getpos.js — Cursor-position selection (partial).
// C ref: getpos.c getpos / getpos_help / auto_describe / hack.c handle_tip.
//
// Branch envelope: verbose instruction pline, first-use getpos tip
// (nhcore show_getpos_tip PICK_NONE loop), hjklyubn walk + HJKLYUBN/Ctrl-dir
// rush (8× / getloc_moveskip glyph-skip; '\n'==C('j') rushes — movecmd
// before quitchars), matching[] from defsyms (stairs + furniture/traps
// + zap/swallow/expl; D-0779/D-0818; '/' → Can't find…),
// NHKF_GETPOS_SHOWVALID '$' / AUTODESC '#' / LIMITVIEW / MENU / MOVESKIP
// before matching, `?` / redraw_cmd(^R) → getpos_help? + getpos_refresh
// + show_goal_msg, mMoOdDxXaAzZ gather_locs cycle (D-0928 #1189),
// autodescribe topline, force unknown-direction pline, pick_chars
// LOOK_*, ESC → -1 (ccp -10,-10). Entry + per-loop cmdq DIR/KEY
// consume, G/g run/rush prefix, mouse-click pick (D-3403).
// getpos_menu / S_goodpos tmp_at hilite / engraving full showsyms /
// docrtRefresh redraw_map-only live via docrt_flags (display.js).
// getpos_getvalid `(invalid target)` live (D-0899).

import { game } from './gstate.js';
import { nhgetch } from './input.js';
import {
    flush_screen, flush_screen_getpos_dirty, cliparound, pline, You, coord_desc, custompline,
    docrt, docrt_flags, docrtRefresh,
    terrain_glyph,
    look_shown_at, glyph_is_invisible,
    glyph_at, glyph_is_cmap, glyph_to_cmap, back_to_glyph,
    glyph_is_monster, GLYPH_MON_MALE_OFF, GLYPH_MON_FEM_OFF,
    glyph_is_object, objnum_to_glyph,
} from './display.js';
import { cansee } from './vision.js';
import { do_screen_description } from './pager.js';
import { NO_COLOR, ATR_INVERSE } from './terminal.js';
import {
    COLNO, ROWNO, isok, TER_MON, TER_OBJ, TER_MAP, TER_DETECT,
    GLOC_MONS, GLOC_OBJS, GLOC_DOOR, GLOC_EXPLORE, GLOC_INTERESTING, GLOC_VALID,
    NUM_GLOCS, NUM_GFILTER, GFILTER_VIEW, GFILTER_AREA, MAXTCHARS,
    NHKF_GETPOS_SELF, NHKF_GETPOS_PICK, NHKF_GETPOS_PICK_Q,
    NHKF_GETPOS_PICK_O, NHKF_GETPOS_PICK_V, NHKF_GETPOS_SHOWVALID,
    NHKF_GETPOS_AUTODESC,
    NHKF_GETPOS_MON_NEXT, NHKF_GETPOS_MON_PREV,
    NHKF_GETPOS_OBJ_NEXT, NHKF_GETPOS_OBJ_PREV,
    NHKF_GETPOS_DOOR_NEXT, NHKF_GETPOS_DOOR_PREV,
    NHKF_GETPOS_UNEX_NEXT, NHKF_GETPOS_UNEX_PREV,
    NHKF_GETPOS_INTERESTING_NEXT, NHKF_GETPOS_INTERESTING_PREV,
    NHKF_GETPOS_VALID_NEXT, NHKF_GETPOS_VALID_PREV,
    NHKF_GETPOS_MOVESKIP, NHKF_GETPOS_MENU, NHKF_GETPOS_LIMITVIEW,
    NHKF_GETPOS_HELP,
    S_stone, S_trwall, S_ndoor, S_vodoor, S_hcdoor, S_room, S_darkroom,
    S_corr, S_litcorr, S_engroom, S_engrcorr, S_arrow_trap,
    S_upstair, S_fountain,
    S_expl_br, S_altar, S_tree, S_bars, S_pool, S_lava, S_lavawall,
    S_water, S_ice,
    STAIRS, LADDER, LA_DOWN, ROOM, CORR, STONE, SCORR, TREE, CLOUD, IS_WALL,
    DOOR, IS_DOOR, IS_DRAWBRIDGE,
    POOL, MOAT, WATER, LAVAPOOL, LAVAWALL, ICE, IRONBARS, AIR,
    FOUNTAIN, SINK, THRONE, GRAVE, ALTAR, VIBRATING_SQUARE,
    ROGUESET, Is_rogue_level,
    HI_ZAP, TIP_GETPOS,
    SUPPRESS_HISTORY, OVERRIDE_MSGTYPE, NO_CURS_ON_U,
    CQ_REPEAT, CQ_CANNED, CMDQ_KEY, CMDQ_DIR,
    NHKF_ESC,
} from './const.js';
import { paint_corner_nhw_menu, cmdq_add_key } from './invent.js';
import { t_at } from './trap.js';
import { invocation_pos, handle_tip } from './hack.js';
import {
    is_valid_travelpt, lock_mouse_buttons,
    cmdq_pop, cmdq_clear, readchar_poskey,
} from './cmd.js';
import { ok_to_quest } from './quest.js';
import { on_level } from './dungeon.js';
import { visctrl, cmd_from_func, cmdbind_get } from './dokeylist.js';
import { distmin } from './hacklib.js';
import { engr_at } from './engrave.js';
import { objectNames } from './objects.js';
import { an } from './objnam.js';
import { select_menu_pick_one } from './options.js';
import { PM_LONG_WORM_TAIL } from './generated/monsters_data.js';
import {
    selection_new, selection_setpoint, selection_force_newsyms,
    selection_free,
} from './mklev.js';

export const LOOK_TRADITIONAL = 0;
export const LOOK_QUICK = 1;
export const LOOK_ONCE = 2;
export const LOOK_VERBOSE = 3;

/** @type {((on: boolean) => void) | null} */
let getpos_hilitefunc = null;
/** @type {((x: number, y: number) => boolean) | null} */
let getpos_getvalid = null;

// C ref: getpos.c enum getposHiliteState `:30–34` — bgcolors Off → 2
// states (Normal, GoodposSymbol); bgcolors On → 3, defaulting to Background.
const HiliteNormalMap = 0;
const HiliteGoodposSymbol = 1;
const HiliteBackground = 2;
/** @type {number} */
let getpos_hilite_state = HiliteNormalMap;
/** @type {number} C `defaultHiliteState`, recomputed on every sethilite. */
let defaultHiliteState = HiliteNormalMap;

/**
 * C ref: getpos.c getpos_getvalids_selection `:102–115` (C staticfn) —
 * whole body in C order: null-guard (`:108–109`), then mark every
 * sel-scoped cell where validf is true (`:111–114`; x from 1, y from 0,
 * like C). Called twice by getpos_sethilite (old∪new valids) before the
 * single selection_force_newsyms.
 */
function getpos_getvalids_selection(sel, validf) {
    if (!sel || typeof validf !== 'function') return; // C `:108–109`
    for (let x = 1; x < sel.wid; x++) { // C `:111`
        for (let y = 0; y < sel.hei; y++) { // C `:112`
            if (validf(x, y)) selection_setpoint(x, y, sel, 1); // C `:113–114`
        }
    }
}

/**
 * C ref: cmd.c redraw_cmd `:3910–3918` — whole body in C order: uchar
 * cast, live cmdbind_get lookup, ef_funct == doredraw test. JS
 * cmdbind_get returns the extcmd itself (C `bind->cmd`), and txt is
 * 1:1 with ef_funct (dokeylist.js), so `txt === 'redraw'` is the C
 * ef_funct comparison — same predicate as js/lock.js getdir_is_redraw
 * for the C `:4013` getdir site; this covers the C getpos.c:945 site.
 * C('r') stays true under default binds; C('l') is now correctly false
 * (C never bound it to redraw — and it never reaches here, consumed
 * earlier as CTRL_DIR rush). Rebound redraw keys now match C.
 */
function redraw_cmd(key) {
    const uc = key & 0xff; // C `:3913` uchar uc
    const bind = cmdbind_get(uc); // C `:3914` (JS returns C `bind->cmd`)
    return !!(bind && bind.txt === 'redraw'); // C `:3915–3917` ef_funct == doredraw
}

/**
 * C ref: getpos.c getpos_refresh `:753–765` — clear GoodposSymbol hilite
 * back to defaultHiliteState, then docrt_flags(docrtRefresh) →
 * redraw_map (resend gbuf; no vision_recalc/cls) + post_map botlx, then
 * re-sethilite when HiliteBackground so valid-spot frames redraw.
 * docrtRefresh is not full docrt() (which under Blind regressed farlook
 * describe stone/corridor) — only the gbuf resend runs.
 */
async function getpos_refresh() {
    if (getpos_hilitefunc && getpos_hilite_state === HiliteGoodposSymbol) {
        getpos_hilitefunc(false); // tmp_at(DISP_END)
        getpos_hilite_state = defaultHiliteState; // C `:757`
    }
    await docrt_flags(docrtRefresh); // C `:760`
    // C `:762–765` resetting to the current values draws valid-spot
    // highlighting when the Background state is active.
    if (getpos_hilitefunc && getpos_hilite_state === HiliteBackground) {
        getpos_sethilite(getpos_hilitefunc, getpos_getvalid);
    }
}

/**
 * C ref: getpos.c getpos_toggle_hilite_state `:72–91` — finish the
 * GoodposSymbol tmp_at, cycle the state (`% (bgcolors ? 3 : 2)`), reset
 * the callbacks through getpos_sethilite (which maintains the
 * map_frame_color store), then begin the new GoodposSymbol tmp_at.
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
 * C ref: getpos.c getpos_sethilite `:41–64` — install/clear getvalid +
 * hilite callbacks, recompute defaultHiliteState from iflags.bgcolors,
 * reset hilite_state to it when getvalid changes, gather old∪new valid
 * cells, store the HiliteBackground frame color (HI_ZAP) or NO_COLOR,
 * and force-newsym the gathered cells when getvalid or the stored color
 * changed. Hilite glyph painting (HiliteGoodposSymbol tmp_at) stays with
 * the caller; getvalid drives "(invalid target)" and the dirty-cell
 * cursor side-effect.
 */
export function getpos_sethilite(hilitef, getvalidf) {
    const old_getvalid = getpos_getvalid; // C `:44`
    // C `:45` old_map_frame_color; the store inits NO_COLOR (decl.c:820).
    const old_map_frame_color = game.gw?.wsettings?.map_frame_color ?? NO_COLOR;
    const sel = selection_new(); // C `:46`
    const new_getvalid = typeof getvalidf === 'function' ? getvalidf : null;
    // C `:48` defaultHiliteState recomputed on every call.
    defaultHiliteState = game.iflags?.bgcolors ? HiliteBackground : HiliteNormalMap;
    // C `:50–51` a getvalid change resets hilite_state to the default.
    if (new_getvalid !== old_getvalid) {
        getpos_hilite_state = defaultHiliteState;
    }
    // C `:53` gather the OLD valids (getpos_getvalid still installed).
    getpos_getvalids_selection(sel, old_getvalid);
    getpos_hilitefunc = typeof hilitef === 'function' ? hilitef : null; // C `:54`
    getpos_getvalid = new_getvalid; // C `:55`
    // C `:56` gather the NEW valids into the same sel.
    getpos_getvalids_selection(sel, new_getvalid);
    // C `:57–58` store the frame color for the Background state. C home
    // is `gw.wsettings` (wintype.h:258–261); `wdmode` stays unset (tiled
    // mode unsupported) while the frame store is maintained exactly.
    const new_map_frame_color = getpos_hilite_state === HiliteBackground
        ? HI_ZAP : NO_COLOR;
    if (!game.gw) game.gw = {};
    if (!game.gw.wsettings) game.gw.wsettings = { map_frame_color: NO_COLOR };
    game.gw.wsettings.map_frame_color = new_map_frame_color;
    // C `:60–62` one force-newsym over the gathered old∪new cells.
    if (getpos_getvalid !== old_getvalid
        || new_map_frame_color !== old_map_frame_color) {
        selection_force_newsyms(sel);
    }
    selection_free(sel, true); // C `:63` selection_free(sel, TRUE)
}

/**
 * C ref: getpos.c getpos_validate — true when no getvalid or cell allowed.
 */
export function getpos_validate(x, y) {
    if (!getpos_getvalid) return true;
    return !!getpos_getvalid(x, y);
}

/**
 * C ref: getpos.c mapxy_valid `:93–99` — the installed getpos validity
 * callback, or FALSE when no getpos prompt is active (normal map paint).
 * display.c get_bkglyph_and_framecolor `:2575` reads this for the frame
 * color arm. Unlike getpos_validate (which defaults true), C returns
 * FALSE here when no callback is installed — kept exactly.
 * @param {number} x map x, C coordxy
 * @param {number} y map y, C coordxy
 */
export function mapxy_valid(x, y) {
    if (typeof getpos_getvalid === 'function') return !!getpos_getvalid(x, y);
    return false;
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

// C sym.h MAXPCHARS — fencepost after S_expl_br.
const MAXPCHARS = S_expl_br + 1;

/** C defsym.h PCHAR `ch` column; index is cmap S_*. */
export const DEFSYMS_CH = [
    ' ', '|', '-', '-', '-', '-', '-', '-', '-', '-', '|', '|',
    '.', '-', '|', '+', '+',
    '#', '#',
    '.', '.', '`',
    '#', '#', '#',
    '<', '>', '<', '>', '<', '>', '<', '>',
    '_',
    '|', '\\', '{', '{', '}', '.', '}', '}', '.', '.', '#', '#', ' ', '#', '}',
    '^', '^', '^', '^', '^', '^', '^', '^', '^', '^', '^', '^', '^', '^', '^', '^', '^',
    '"',
    '^', '^', '^', '^',
    '~', '^', '^',
    '|', '-', '\\', '/',
    '*', '!', ')', '(',
    '0', '#', '@', '*',
    '#', '$',
    '/', '-', '\\', '|', '|', '\\', '-', '/',
    '/', '-', '\\', '|', ' ', '|', '\\', '-', '/',
];

/** C sym.h is_cmap_wall / room / corr / door / trap / engraving. */
function is_cmap_wall(i) {
    return i >= S_stone && i <= S_trwall;
}
function is_cmap_room(i) {
    return i >= S_room && i <= S_darkroom;
}
function is_cmap_corr(i) {
    return i >= S_corr && i <= S_litcorr;
}
function is_cmap_door(i) {
    return i >= S_vodoor && i <= S_hcdoor;
}
function is_cmap_trap(i) {
    return i >= S_arrow_trap && i < S_arrow_trap + MAXTCHARS;
}
function is_cmap_engraving(i) {
    return i === S_engroom || i === S_engrcorr;
}
/** C sym.h is_cmap_furniture / water / lava (for gloc_filter_classify_glyph). */
function is_cmap_furniture(i) {
    return i >= S_upstair && i <= S_fountain;
}
function is_cmap_water(i) {
    return i === S_pool || i === S_water;
}
function is_cmap_lava(i) {
    return i === S_lava || i === S_lavawall;
}

/**
 * C ref: getpos.c:1052–1061 matching[] build — defsyms[].sym /
 * gs.showsyms[] for feature cmaps (walls/room/corr/door/ndoor
 * skipped). k==0 → unknown direction. showsyms is the live
 * game.gs.showsyms P range (direct sidx like C; entries are the
 * single-char carriers assign_graphics wrote, else the defsyms
 * fallback — identical to C's init-fed table at default config).
 */
function build_feature_matching(ch) {
    const matching = new Uint8Array(MAXPCHARS);
    let k = 0;
    // C :1053/:1059–1060 — gs.showsyms[sidx] live (P range, direct sidx).
    const showsyms = game.gs?.showsyms;
    const showch = (i) => {
        const v = showsyms?.[i];
        if (typeof v === 'string') return v;
        if (typeof v === 'number' && v > 0) return String.fromCharCode(v & 0xff);
        return DEFSYMS_CH[i];
    };
    const engroom = showch(S_engroom);
    for (let sidx = 0; sidx < MAXPCHARS; sidx++) {
        if (is_cmap_wall(sidx) || is_cmap_room(sidx)
            || is_cmap_corr(sidx) || is_cmap_door(sidx)
            || sidx === S_ndoor) {
            continue;
        }
        if (ch === DEFSYMS_CH[sidx]
            || ch === showch(sidx)
            || (ch === '^' && is_cmap_trap(sidx))
            || (ch === engroom && is_cmap_engraving(sidx))) {
            matching[sidx] = ++k;
        }
    }
    // DEC showsyms approximations (drawing.c Primary vs DECgraphics).
    if (use_dec_syms()) {
        if (ch === '{' && !matching[S_altar]) matching[S_altar] = ++k;
        if (ch === 'g') matching[S_tree] = ++k;
        if (ch === '|') matching[S_bars] = ++k;
        if (ch === '`') {
            matching[S_pool] = ++k;
            matching[S_lava] = ++k;
            matching[S_lavawall] = ++k;
            matching[S_water] = ++k;
        }
        if (ch === '~') matching[S_ice] = ++k;
    }
    return { matching, k };
}

/**
 * Terrain tags for the seenv fallback scanner (stairs/furniture/traps).
 * Effect-only matching[] slots (S_rslant `/`, swallow, expl) have no tag
 * — C still scans, then "Can't find dungeon feature".
 */
function feature_match_tags(ch) {
    const tags = new Set();
    const dec = use_dec_syms();

    if (ch === '>') tags.add('dnfeature');
    if (ch === '<') tags.add('upfeature');

    if (ch === '_') tags.add('altar');
    if (ch === '{' && dec) tags.add('altar');

    if (ch === '{') {
        tags.add('sink');
        tags.add('fountain');
    }
    if (ch === '|') tags.add('grave');
    if (ch === '\\') tags.add('throne');

    // '#' is NHKF_GETPOS_AUTODESC before matching[] (default bind).
    // matching[] still counts tree/bars/cloud; this tag path is for
    // a rebound key. DEC 'g' / '|' still match when typed.
    if (ch === '#') {
        tags.add('tree');
        tags.add('bars');
        tags.add('cloud');
    }
    if (ch === 'g' && dec) tags.add('tree');
    if (ch === '|' && dec) tags.add('bars');

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

    if (ch === '~' && dec) tags.add('ice');

    if (ch === '^') tags.add('trap');
    if (ch === '~') tags.add('trap_vs');

    if (ch === '0') tags.add('ss1');

    return tags;
}

function matching_glyph(matching, glyph) {
    if (!glyph_is_cmap(glyph)) return false;
    const sidx = glyph_to_cmap(glyph);
    return sidx >= 0 && sidx < matching.length && matching[sidx] !== 0;
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
function find_dungeon_feature(cx, cy, ch, tags, matching) {
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
                if (matching && matching_glyph(matching, glyph_at(tx, ty))) {
                    return { x: tx, y: ty };
                }
                if (visible_feature_match(loc, tx, ty, tags, ch)) {
                    return { x: tx, y: ty };
                }
                if (
                    game.level?.flags?.hero_memory !== false
                    && !(game.iflags?.terrainmode | 0)
                ) {
                    const memg = loc.glyph;
                    if (matching && typeof memg === 'number'
                        && matching_glyph(matching, memg)) {
                        return { x: tx, y: ty };
                    }
                    if (remembered_feature_match(loc, tx, ty, tags, ch)) {
                        return { x: tx, y: ty };
                    }
                }
                if (ch === '~' && known_vibrating_square_at(tx, ty)) {
                    return { x: tx, y: ty };
                }
                if (loc.seenv | 0) {
                    if (matching && matching_glyph(matching, back_to_glyph(tx, ty))) {
                        return { x: tx, y: ty };
                    }
                    if (terrain_matches_tags(loc, tx, ty, tags, ch)) {
                        return { x: tx, y: ty };
                    }
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

/**
 * C ref: pager.c do_screen_description after lookat — qstart Home
 * downstairs are "blocked staircase down" until ok_to_quest().
 * Named: ice_descr rewrite sibling deferred (same didlook arm).
 */
export function maybe_blocked_staircase_down(look_buf) {
    if (
        look_buf === 'staircase down'
        && on_level(game.u?.uz, game.qstart_level) // C pager.c:1605 — live on_level (js/dungeon.js).
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
 * Firstmatch only, for display.c show_glyph and cmd.c dolookaround.
 * Those C sites call do_screen_description themselves; this helper is
 * the looked=TRUE firstmatch they print. auto_describe (below) is the
 * getpos.c function: it also prints coord_desc and the two suffixes.
 */
export function auto_describe_text(cx, cy) {
    const outStr = { s: '' };
    const firstMatch = { v: '' };
    const found = do_screen_description(
        { x: cx, y: cy }, true, 0, outStr, firstMatch, null,
    );
    if (!found) return '';
    return firstMatch.v || '';
}

/**
 * C ref: winprocs.h `curs` → wintty.c tty_curs `:2058–2158` for WIN_MAP.
 * Contest 80×24: offx 0, offy 1, clipping off. `curx = --x`, screen row
 * is `y + offy`. Named: other window types, the clipping subtract, and
 * cmov/nocmov (the Terminal cursor is absolute).
 * @param {number} x map x
 * @param {number} y map y
 */
function curs_win_map(x, y) {
    const disp = game.nhDisplay;
    if (disp?.setCursor) disp.setCursor((x | 0) - 1, (y | 0) + 1);
}

/**
 * C ref: getpos.c auto_describe `:640–662`.
 * do_screen_description(looked) fills firstmatch (initial "unknown").
 * On a hit, coord_desc overwrites the description buffer, then
 * custompline(SUPPRESS_HISTORY|OVERRIDE_MSGTYPE|NO_CURS_ON_U) prints
 * firstmatch, a space only when the coord text is non-empty, the coord
 * text, " (invalid target)" when autodescribe and getpos_getvalid
 * rejects the cell, and " (no travel path)" when getloc_travelmode and
 * the cell is not a travel point. Then curs(WIN_MAP) and flush_screen(0).
 * A miss leaves the message and the cursor alone.
 * Async: custompline, is_valid_travelpt, and flush_screen await
 * (nhgetch reach). The travel test is not called unless travel mode
 * is on (C `&&` short-circuit).
 * JS flush_screen parks the cursor on the hero (_buildScreenOutput
 * does not honor cursor_on_u == 0), so curs_win_map runs after that
 * flush and leaves the cursor where C's flush_screen(0) leaves the
 * tty_curs position.
 * @param {number} cx
 * @param {number} cy
 */
export async function auto_describe(cx, cy) {
    // C `:643–647`
    cx = cx | 0;
    cy = cy | 0;
    const sym = 0;
    const outStr = { s: '' };
    const firstMatch = { v: 'unknown' };
    // C `:648–650` — looked TRUE; for_supplement is NULL.
    if (!do_screen_description(
        { x: cx, y: cy }, true, sym, outStr, firstMatch, null,
    )) {
        return;
    }
    // C `:651` — coord_desc replaces tmpbuf; the long out_str is dropped.
    const tmpbuf = coord_desc(cx, cy, game.iflags?.getpos_coords) || '';
    // C `:654–656` — invalid suffix. Do not call getvalid unless both
    // gates are set.
    let invalid = '';
    if (game.iflags?.autodescribe && getpos_getvalid
        && !getpos_getvalid(cx, cy)) {
        invalid = ' (invalid target)';
    }
    // C `:657–658` — travel suffix. Do not BFS unless travel mode is on.
    let nopath = '';
    if (game.iflags?.getloc_travelmode && !await is_valid_travelpt(cx, cy)) {
        nopath = ' (no travel path)';
    }
    // C `:652–658` — five %s so a percent in the description is not a verb.
    await custompline(
        (SUPPRESS_HISTORY | OVERRIDE_MSGTYPE | NO_CURS_ON_U) | 0,
        '%s%s%s%s%s',
        firstMatch.v ?? '',
        tmpbuf ? ' ' : '',
        tmpbuf,
        invalid,
        nopath,
    );
    // C `:659–660` curs(WIN_MAP, cx, cy); flush_screen(0).
    await flush_screen(0);
    curs_win_map(cx, cy);
}

/**
 * C ref: getpos.c cmp_coord_distu — Chebyshev dist to hero; tie-break y then x.
 * Contest stable sort (Constitution §4).
 */
function cmp_coord_distu(a, b) {
    const u = game.u || {};
    const ux = u.ux | 0;
    const uy = u.uy | 0;
    const d1 = distmin(ux, uy, a.x, a.y);
    const d2 = distmin(ux, uy, b.x, b.y);
    if (d1 === d2) {
        return (a.y !== b.y) ? (a.y - b.y) : (a.x - b.x);
    }
    return d1 - d2;
}

const BOULDER_OTYP = objectNames.indexOf('BOULDER');
const ROCK_OTYP = objectNames.indexOf('ROCK');

/**
 * C ref: getpos.c — glyph_at is a door/ndoor/drawbridge cmap (not mon/obj).
 * JS has no integer glyphs; approximate via look_shown_at + typ + disp_ch.
 */
function shown_door_cmap(x, y) {
    const cover = look_shown_at(x, y);
    if (cover) return false; // hero / mon / obj cover → not cmap
    const loc = game.level?.at?.(x, y);
    if (!loc || glyph_is_invisible(loc)) return false;
    const typ = loc.typ | 0;
    const ch = loc.disp_ch;
    if (!ch || ch === ' ' || ch === '') return false;
    if (IS_DOOR(typ) || typ === DOOR) {
        const g = terrain_glyph(loc, x, y);
        // Shown door cmap: display matches back_to_glyph door/ndoor
        if (ch === g.ch) return true;
        const rg = loc.remembered_glyph;
        if (rg && rg.ch === g.ch && rg.ch === ch) return true;
        return false;
    }
    if (IS_DRAWBRIDGE(typ)) {
        const g = terrain_glyph(loc, x, y);
        return ch === g.ch;
    }
    return false;
}

/** C ref: getpos.c IS_UNEXPLORED_LOC — blank unexplored neighbor. */
function is_unexplored_loc(x, y) {
    if (!isok(x, y)) return false;
    const loc = game.level?.at?.(x, y);
    if (!loc) return false;
    if (loc.seenv | 0) return false;
    const ch = loc.disp_ch;
    return !ch || ch === ' ' || ch === '';
}

/**
 * C getpos.c known_vibrating_square_at — genuine VS at invocation_pos.
 */
function known_vibrating_square_at(x, y) {
    if (!invocation_pos(x, y)) return false;
    const ttmp = t_at(x, y);
    return !!(ttmp && (ttmp.ttyp | 0) === VIBRATING_SQUARE && ttmp.tseen);
}

/**
 * C getpos.c gather_locs_interesting boring cmap — wall/tree/bars/ice/
 * air/cloud/lava/water/room/corr. Not S_engr* (erevealed). Integer
 * glyph_is_cmap IDs named; typ+look_shown_at stand in.
 */
function shown_boring_cmap(x, y) {
    if (look_shown_at(x, y)) return false;
    const loc = game.level?.at?.(x, y);
    if (!loc) return false;
    const typ = loc.typ | 0;
    const ch = loc.disp_ch;
    const blank = !ch || ch === ' ' || ch === '';
    if (!(loc.seenv | 0) && blank) return false;
    const ep = engr_at(x, y);
    if (ep?.erevealed) return false;
    if (IS_WALL(typ) || typ === STONE || typ === SCORR) return true;
    if (typ === TREE || typ === IRONBARS || typ === ICE) return true;
    if (typ === AIR || typ === CLOUD) return true;
    if (typ === LAVAPOOL || typ === LAVAWALL) return true;
    if (typ === POOL || typ === MOAT || typ === WATER) return true;
    if (typ === ROOM) return true;
    if (typ === CORR) return true;
    return false;
}

/**
 * C ref: getpos.c gloc_filter_classify_glyph `:340-361` — cmap class of a
 * glyph for GFILTER_AREA matching: room/furniture → 1, wall/tree → 2,
 * corr → 3, water → 4, lava → 5, everything else → 0.
 */
function gloc_filter_classify_glyph(glyph) {
    if (!glyph_is_cmap(glyph)) return 0;
    const c = glyph_to_cmap(glyph) | 0;
    if (is_cmap_room(c) || is_cmap_furniture(c)) return 1;
    else if (is_cmap_wall(c) || c === S_tree) return 2;
    else if (is_cmap_corr(c)) return 3;
    else if (is_cmap_water(c)) return 4;
    else if (is_cmap_lava(c)) return 5;
    return 0;
}

/**
 * C ref: getpos.c gloc_filter_floodfill_matcharea `:363-379` — selvar
 * floodfill predicate for the area map: unseen cells never match; the
 * seed glyph itself or its classify class matches.
 */
function gloc_filter_floodfill_matcharea(x, y) {
    const glyph = back_to_glyph(x, y) | 0;
    const loc = game.level?.at?.(x, y);
    if (!(loc?.seenv | 0)) return false;
    if (glyph === (game.gloc_filter_floodfill_match_glyph | 0)) return true;
    return gloc_filter_classify_glyph(glyph)
        === gloc_filter_classify_glyph(game.gloc_filter_floodfill_match_glyph | 0);
}

/**
 * C ref: getpos.c GLOC_SAME_AREA `:336-339` — in-bounds cell present in
 * the GFILTER_AREA flood map (`selection_getpoint`, 0 on a null map).
 */
function gloc_same_area(x, y) {
    if (!isok(x, y)) return false;
    const sel = game.gloc_filter_map;
    if (!sel) return false;
    return sel.has(`${x},${y}`);
}

/**
 * C ref: getpos.c gloc_filter_floodfill `:381-388` + selvar.c
 * `selection_floodfill` (`:395-440`) — seed joins unconditionally (C
 * SEL_FLOOD pushes it with no predicate; `isok` gates the pop), then
 * 4-neighbours (`diagonals` FALSE) join via matcharea. The local
 * `visited` set stands in for C's `tmp` selection (queued ∪ popped);
 * the matcharea closure stands in for the `set_selection_floodfillchk`
 * global, which never holds anything else on this path. The map is a
 * Set of `x,y` keys per the look_sel/mklev selection idiom.
 */
function gloc_filter_floodfill(x, y) {
    const ov = game.gloc_filter_map;
    if (!ov) return;
    game.gloc_filter_floodfill_match_glyph = back_to_glyph(x, y) | 0;
    const visited = new Set([`${x},${y}`]);
    const stackX = [x];
    const stackY = [y];
    while (stackX.length) {
        const cx = stackX.pop();
        const cy = stackY.pop();
        if (isok(cx, cy)) {
            ov.add(`${cx},${cy}`);
            if (!visited.has(`${cx + 1},${cy}`) && gloc_filter_floodfill_matcharea(cx + 1, cy)) {
                visited.add(`${cx + 1},${cy}`);
                stackX.push(cx + 1);
                stackY.push(cy);
            }
            if (!visited.has(`${cx - 1},${cy}`) && gloc_filter_floodfill_matcharea(cx - 1, cy)) {
                visited.add(`${cx - 1},${cy}`);
                stackX.push(cx - 1);
                stackY.push(cy);
            }
            if (!visited.has(`${cx},${cy + 1}`) && gloc_filter_floodfill_matcharea(cx, cy + 1)) {
                visited.add(`${cx},${cy + 1}`);
                stackX.push(cx);
                stackY.push(cy + 1);
            }
            if (!visited.has(`${cx},${cy - 1}`) && gloc_filter_floodfill_matcharea(cx, cy - 1)) {
                visited.add(`${cx},${cy - 1}`);
                stackX.push(cx);
                stackY.push(cy - 1);
            }
        }
    }
}

/**
 * C ref: getpos.c gloc_filter_init `:390-409` — under GFILTER_AREA,
 * flood the hero's area into `gg.gloc_filter_map` (allocated when null);
 * standing in a doorway with a direction, flood the far side instead
 * (C TODO: both sides — nothing).
 */
function gloc_filter_init() {
    if ((game.iflags?.getloc_filter | 0) !== GFILTER_AREA) return;
    if (!game.gloc_filter_map) game.gloc_filter_map = new Set();
    const u = game.u || {};
    const ux = u.ux | 0;
    const uy = u.uy | 0;
    if (IS_DOOR((game.level?.at?.(ux, uy)?.typ) | 0)) {
        const dx = u.dx | 0;
        const dy = u.dy | 0;
        if ((dx || dy) && isok(ux + dx, uy + dy)) {
            gloc_filter_floodfill(ux + dx, uy + dy);
        }
    } else {
        gloc_filter_floodfill(ux, uy);
    }
}

/**
 * C ref: getpos.c gloc_filter_done `:411-419` — `selection_free(map, TRUE)`.
 */
function gloc_filter_done() {
    if (game.gloc_filter_map) {
        game.gloc_filter_map = null;
    }
}

/**
 * C ref: getpos.c gather_locs_interesting — GLOC_MONS/OBJS/DOOR/EXPLORE
 * plus GLOC_INTERESTING / GLOC_VALID FALLTHROUGH (D-1217) and the
 * GFILTER_AREA same-area gate (`:446-449`).
 */
export function gather_locs_interesting(x, y, gloc) {
    const filter = game.iflags?.getloc_filter | 0;
    if (filter === GFILTER_VIEW && !cansee(x, y)) return false;
    if (filter === GFILTER_AREA
        && !gloc_same_area(x, y)
        && !gloc_same_area(x - 1, y) && !gloc_same_area(x, y - 1)
        && !gloc_same_area(x + 1, y) && !gloc_same_area(x, y + 1)) return false;

    switch (gloc) {
    case GLOC_MONS: {
        // C gather_locs_interesting reads glyph_at — the DISPLAYED map, not
        // live monsters — so during #terrain browse (monsters stripped) no
        // cell matches and 'm' stays put. Live-state reads would wrongly
        // jump to an unstripped monster. Long-worm-tail banks excluded
        // exactly like C (mon male/female only, not pet/detect/ridden).
        const g = glyph_at(x, y);
        if (!glyph_is_monster(g)) return false;
        const id = g | 0;
        if (id === (PM_LONG_WORM_TAIL | 0) + GLYPH_MON_MALE_OFF) return false;
        if (id === (PM_LONG_WORM_TAIL | 0) + GLYPH_MON_FEM_OFF) return false;
        return true;
    }
    case GLOC_OBJS: {
        // C `:451-452,461-464` — glyph_at reads the DISPLAYED map
        // (gbuf: live and remembered glyphs alike), not live objects,
        // exactly like the GLOC_MONS arm above. A remembered object
        // glyph with no live object still cycles (the describe path
        // then names it via the object_from_map fake, drawing rnd(2)
        // through mksobj→next_ident); boulder/rock GLYPHS excluded.
        const g = glyph_at(x, y);
        if (!glyph_is_object(g)) return false;
        const id = g | 0;
        if (BOULDER_OTYP >= 0 && id === objnum_to_glyph(BOULDER_OTYP)) return false;
        if (ROCK_OTYP >= 0 && id === objnum_to_glyph(ROCK_OTYP)) return false;
        return true;
    }
    case GLOC_DOOR:
        return shown_door_cmap(x, y);
    case GLOC_EXPLORE: {
        // Door/ndoor/drawbridge/room/corr adjacent to unexplored
        if (!shown_door_cmap(x, y)) {
            const loc = game.level?.at?.(x, y);
            if (!loc) return false;
            if (look_shown_at(x, y)) return false;
            const typ = loc.typ | 0;
            const ch = loc.disp_ch;
            if (!ch || ch === ' ') return false;
            if (typ !== ROOM && typ !== CORR) return false;
            const g = terrain_glyph(loc, x, y);
            if (ch !== g.ch) return false;
        }
        return (
            is_unexplored_loc(x + 1, y)
            || is_unexplored_loc(x - 1, y)
            || is_unexplored_loc(x, y + 1)
            || is_unexplored_loc(x, y - 1)
        );
    }
    case GLOC_VALID:
        if (getpos_getvalid) return !!getpos_getvalid(x, y);
        // FALLTHROUGH — C getpos.c:487
    case GLOC_INTERESTING:
        return (gather_locs_interesting(x, y, GLOC_DOOR)
            || !(shown_boring_cmap(x, y) || is_unexplored_loc(x, y))
            || known_vibrating_square_at(x, y));
    default:
        return false;
    }
}

/**
 * C ref: getpos.c gather_locs `:513-548` — always include hero; two
 * passes (count then fill) around one scan; qsort by distu. JS builds
 * one array (same order, same comparator) between gloc_filter_init
 * and gloc_filter_done. Returns { arr, count } with arr[0] === hero
 * after sort.
 */
function gather_locs(gloc) {
    const u = game.u || {};
    const ux = u.ux | 0;
    const uy = u.uy | 0;
    gloc_filter_init();
    const arr = [];
    for (let x = 1; x < COLNO; x++) {
        for (let y = 0; y < ROWNO; y++) {
            if ((x === ux && y === uy) || gather_locs_interesting(x, y, gloc)) {
                arr.push({ x, y });
            }
        }
    }
    arr.sort(cmp_coord_distu);
    gloc_filter_done();
    return { arr, count: arr.length };
}

/**
 * C ref: getpos.c getpos_menu `:665–725` — PICK_ONE menu over the
 * gather_locs spots (array[0] == hero skipped) when getloc_usemenu is on
 * (m|M o|O d|D x|X a|A z|Z key) or menu_requested travel (`_`). The C
 * window layer (create_nhwindow/start_menu/add_menu/end_menu/select_menu/
 * destroy_nhwindow, `nul_glyphinfo`, ATR_NONE, clr=NO_COLOR,
 * MENU_ITEMFLAGS_NONE, `any.a_int`, free()) maps to one
 * select_menu_pick_one call (same mapping as there_cmd_menu/doextlist):
 * title + blank header rows, one selectable row per spot whose
 * do_screen_description succeeds, the 1-based garr index carried as
 * `a_int` for the C `:719` readback. C order, all arms.
 * @param {{x:number,y:number}} ccp — out: chosen spot (untouched on cancel)
 * @param {number} gloc — GLOC_* selector
 * @returns {Promise<boolean>} C boolean (pick_cnt > 0)
 */
export async function getpos_menu(ccp, gloc) {
    // C `:677` — gather_locs fills garr/gcount (file-local here).
    const { arr, count } = gather_locs(gloc);

    // C `:679–685` — gcount always includes the hero; fewer than 2 means
    // nothing to list. free(garr) is a GC no-op in JS.
    if (count < 2) {
        await You(
            'cannot %s %s.',
            (game.iflags?.getloc_filter | 0) === GFILTER_VIEW ? 'see' : 'detect',
            GLOC_DESCR[gloc][0],
        );
        return false;
    }

    // C `:687–689` — create_nhwindow(NHW_MENU) + start_menu STANDARD +
    // any = cg.zeroany: the item list below. `:692` skip array[0] (hero).
    const items = [];
    for (let i = 1; i < count; i++) {
        // C `:693–697` — firstmatch "unknown", sym 0, any.a_int = i + 1.
        const a_int = i + 1;
        const x = arr[i].x;
        const y = arr[i].y;
        const outStr = { s: '' };
        const firstMatch = { v: 'unknown' };
        // C `:699–700` — only described spots get a menu row.
        if (do_screen_description({ x, y }, true, 0, outStr, firstMatch, null)) {
            // C `:701–702` — coord_desc reuses tmpbuf (coords only; the
            // description stays in firstmatch which never aliases tmpbuf).
            const coords = coord_desc(x, y, game.iflags?.getpos_coords);
            // C `:703–704` — "firstmatch[ coords]".
            const fullbuf = `${firstMatch.v}${coords ? ' ' : ''}${coords}`;
            // C `:705–706` — add_menu ATR_NONE/clr/MENU_ITEMFLAGS_NONE.
            items.push({ text: fullbuf, attr: 0, selectable: true, a_int });
        }
    }

    // C `:710–713` — end_menu title "Pick <an item>[ filter][ for travel]".
    const title = `Pick ${an(GLOC_DESCR[gloc][1])}`
        + (GLOC_FILTERTXT[game.iflags?.getloc_filter | 0] || '')
        + (game.iflags?.getloc_travelmode ? ' for travel destination' : '');
    // C `:714–716` — select_menu PICK_ONE + destroy_nhwindow; title + blank
    // header rows follow the there_cmd_menu/doextlist convention.
    const res = await select_menu_pick_one([
        { text: title, attr: ATR_INVERSE, selectable: false },
        { text: '', attr: 0, selectable: false },
        ...items,
    ]);
    // C `:717–722` — pick_cnt > 0 writes garr[a_int - 1] into ccp.
    if (res.kind !== 'pick' || res.item == null) return false;
    const idx = ((res.item.a_int | 0) - 1) | 0;
    ccp.x = arr[idx].x;
    ccp.y = arr[idx].y;
    return true;
}

// C ref: cmd.c spkeys_binds defaults (!num_pad) for getpos help text.
const GETPOS_SPKEY_DEFAULT = {
    [NHKF_GETPOS_SELF]: '@'.charCodeAt(0),
    [NHKF_GETPOS_PICK]: '.'.charCodeAt(0),
    [NHKF_GETPOS_PICK_Q]: ','.charCodeAt(0),
    [NHKF_GETPOS_PICK_O]: ';'.charCodeAt(0),
    [NHKF_GETPOS_PICK_V]: ':'.charCodeAt(0),
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
    [NHKF_GETPOS_VALID_NEXT]: 'z'.charCodeAt(0),
    [NHKF_GETPOS_VALID_PREV]: 'Z'.charCodeAt(0),
    [NHKF_GETPOS_MOVESKIP]: '*'.charCodeAt(0),
    [NHKF_GETPOS_MENU]: '!'.charCodeAt(0),
    [NHKF_GETPOS_LIMITVIEW]: '"'.charCodeAt(0),
    // C cmd.c:3187 spkeys_binds default for the :844 verbose prompt + :945 arm.
    [NHKF_GETPOS_HELP]: '?'.charCodeAt(0),
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
 * C ref: getpos.c getpos_help :167-307 — NHW_MENU putstr +
 * display_nhwindow(TRUE). Move/run/rush keys via the live cmd_from_func
 * (custom binds honored; D-3403 retires the stale "Named" note).
 * C :258-266 cmdassist Sprintf has no putstr (sbuf overwritten by the
 * "Type a ..." Snprintf) so it prints no line — none here either.
 */
async function getpos_help(force, goal) {
    const fastmovemode = ['8 units at a time', 'skipping same glyphs'];
    const moveskip = !!(game.iflags?.getloc_moveskip);
    const terrainmode = game.iflags?.terrainmode | 0;
    const lines = [];

    // C getpos.c:175–193 — cmd_from_func(do_move_*) / do_run_* / do_run / do_rush.
    const vk = (name) => visctrl(cmd_from_func(name));
    lines.push(
        `Use '${vk('movewest')}', '${vk('movesouth')}', '${vk('movenorth')}', '${vk('moveeast')}' to move the cursor to ${goal || 'desired location'}.`,
    );
    lines.push(
        `Use '${vk('runwest')}', '${vk('runsouth')}', '${vk('runnorth')}', '${vk('runeast')}' to fast-move the cursor, ${fastmovemode[moveskip ? 1 : 0]}.`,
    );
    lines.push(`(or prefix normal move with '${vk('run')}' or '${vk('rush')}' to fast-move)`);
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
    // C :205: if (goal && !strcmp(goal, "a monster")) goto skip_non_mons;
    const skipNonMons = !!(goal && goal === 'a monster');
    if (!skipNonMons) {
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
            // C :244-249 — getpos_getvalid installed via getpos_sethilite.
            if (getpos_getvalid) {
                lines.push(
                    `Use '${visctrl(getpos_spkey(NHKF_GETPOS_VALID_NEXT))}' or '${visctrl(getpos_spkey(NHKF_GETPOS_VALID_PREV))}' to move to valid locations.`,
                );
            }
            // C :250-255 — getpos_hilitefunc installed via getpos_sethilite.
            if (getpos_hilitefunc) {
                lines.push(
                    `Use '${visctrl(getpos_spkey(NHKF_GETPOS_SHOWVALID))}' to toggle marking of valid locations.`,
                );
            }
            // C :256-257
            lines.push(
                `Use '${visctrl(getpos_spkey(NHKF_GETPOS_AUTODESC))}' to toggle automatic description.`,
            );
            // C :258-266 cmdassist Sprintf: no putstr, prints nothing.
        }
    }
    // C :267 skip_non_mons — inside `if (!terrainmode)` but reached via goto
    // even when terrainmode != 0, so the tail runs when !terrainmode ||
    // skipNonMons. doing_what_is is the pointer test goal ==
    // what_is_a_location ("a monster, object or location", pager.c:1670);
    // only pager.c:1910 passes that global, so a value compare is exact.
    if (!terrainmode || skipNonMons) {
        // C :269-284
        const doing_what_is = goal === 'a monster, object or location';
        let kbuf;
        if (doing_what_is) {
            kbuf = `'${visctrl(getpos_spkey(NHKF_GETPOS_PICK))}' or '${visctrl(getpos_spkey(NHKF_GETPOS_PICK_Q))}' or '${visctrl(getpos_spkey(NHKF_GETPOS_PICK_O))}' or '${visctrl(getpos_spkey(NHKF_GETPOS_PICK_V))}'`;
        } else {
            kbuf = `'${visctrl(getpos_spkey(NHKF_GETPOS_PICK))}'`;
        }
        lines.push(`Type a ${kbuf} when you are at the right place.`);
        if (doing_what_is) {
            // C :285-299
            lines.push(
                `  '${visctrl(getpos_spkey(NHKF_GETPOS_PICK_V))}' describe current spot, show 'more info', move to another spot.`,
            );
            lines.push(
                `  '${visctrl(getpos_spkey(NHKF_GETPOS_PICK))}' describe current spot,${(game.flags?.help !== false) && !force ? " prompt if 'more info'," : ''} move to another spot;`,
            );
            lines.push(
                `  '${visctrl(getpos_spkey(NHKF_GETPOS_PICK_Q))}' describe current spot, move to another spot;`,
            );
            lines.push(
                `  '${visctrl(getpos_spkey(NHKF_GETPOS_PICK_O))}' describe current spot, stop looking at things;`,
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
export async function show_getpos_tip() {
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
    // C: closing a corner NHW_MENU dismisses via docorner
    // (erase_menu_or_text): reprint retained gbuf, no newsym — never
    // docrt. docrt would newsym the hero `@` over a cell C still shows
    // stale (scen-dig-Caveman-94195 s66: seen trap `^` under the hero).
    // The loop's flushes set _overlay_resync, so this flush resyncs the
    // full map from gbuf (terrainmode and normal alike).
    await flush_screen(1);
}

/**
 * C ref: getpos.c getpos — force=TRUE (travel) keeps unknown keys in-loop;
 * force=FALSE (whatis) may abort. Returns LOOK_* (>=0) or -1 on cancel.
 */
export async function getpos(ccp, force, goal, describeAt) {
    const g = game;
    if (!g.flags) g.flags = {};
    // C `:814–829` — entry: a queued direction (mouse-click MCMD replay
    // outside doagain) returns the adjacent spot without prompting;
    // anything else queued clears the canned queue and cancels (D-3403).
    if (!g.in_doagain) {
        const entryq = cmdq_pop();
        if (entryq) {
            if (entryq.typ === CMDQ_DIR && !entryq.dirz) {
                ccp.x = (g.u?.ux | 0) + (entryq.dirx | 0);
                ccp.y = (g.u?.uy | 0) + (entryq.diry | 0);
                return 0;
            }
            cmdq_clear(CQ_CANNED);
            return -1;
        }
    }
    // C `:803–804` — tx/ty seed at the hero; readchar_poskey fills them
    // on a mouse click (pass-through in JS; the c==0 arm below mirrors C).
    let tx = g.u?.ux | 0;
    let ty = g.u?.uy | 0;
    let rushrun = false;
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
    // C getpos.c:838-839: if (handle_tip(TIP_GETPOS)) show_goal_msg = TRUE
    if (await handle_tip(TIP_GETPOS)) show_goal_msg = true;

    // C: getpos_hilitefunc(TRUE) after sethilite when HiliteGoodposSymbol —
    // glyph highlight deferred; getvalid still active for auto_describe.

    // C: schar udx = u.dx, udy = u.dy, udz = u.dz;
    const udx = g.u?.dx | 0;
    const udy = g.u?.dy | 0;
    const udz = g.u?.dz | 0;

    try {
    // C getpos: garr[NUM_GLOCS] / gidx / gcount for mMoOdDxX cycling
    /** @type {(Array<{x:number,y:number}>|null)[]} */
    const garr = Array.from({ length: NUM_GLOCS }, () => null);
    const gcount = Array(NUM_GLOCS).fill(0);
    const gidx = Array(NUM_GLOCS).fill(0);

    if (g.flags.verbose !== false) {
        // C :844–845 — the live help-key binding, not a hardcoded '?'.
        await pline(`(For instructions type a '${visctrl(getpos_spkey(NHKF_GETPOS_HELP))}')`);
        msg_given = true;
    }

    const disp = g.nhDisplay;
    // C getpos: curs(cx,cy); flush_screen(0) before the read loop.
    // flush_screen(0) reprints dirty (getvalid) cells and leaves the
    // tty cursor on the last glyph — not on the hero (D-0928 #1137).
    // C getpos.c:848–853 — CLIPPING (config.h:538, compiled in):
    // cliparound(cx, cy) with the pre-loop curs+flush. No-op at the
    // contest fixed size (clipping never set — no resize path).
    await cliparound(cx, cy);
    if (disp?.setCursor) disp.setCursor(cx - 1, cy + 1);
    flush_screen_getpos_dirty();
    // First read uses the pre-loop dirty flush; later iterations need a
    // full flush + curs like the prior port (topline / map sync).
    let need_full_flush = false;

    const pick_nhkf = [
        NHKF_GETPOS_PICK, NHKF_GETPOS_PICK_Q,
        NHKF_GETPOS_PICK_O, NHKF_GETPOS_PICK_V,
    ];
    const pick_ret = [LOOK_TRADITIONAL, LOOK_QUICK, LOOK_ONCE, LOOK_VERBOSE];
    const mMoOdDxX_nhkf = [
        NHKF_GETPOS_MON_NEXT, NHKF_GETPOS_MON_PREV,
        NHKF_GETPOS_OBJ_NEXT, NHKF_GETPOS_OBJ_PREV,
        NHKF_GETPOS_DOOR_NEXT, NHKF_GETPOS_DOOR_PREV,
        NHKF_GETPOS_UNEX_NEXT, NHKF_GETPOS_UNEX_PREV,
        NHKF_GETPOS_INTERESTING_NEXT, NHKF_GETPOS_INTERESTING_PREV,
        NHKF_GETPOS_VALID_NEXT, NHKF_GETPOS_VALID_PREV,
    ];

    // C getpos.c:858 — lock mouse-button bindings for the targeting loop;
    // exitgetpos (`:1155`) restores them in the finally below.
    lock_mouse_buttons(true);
    for (;;) {
        // C getpos.c:1144–1148 (nxtc) — cliparound(cx, cy) with the
        // pass's curs+flush, shifted to the loop top with the house
        // flush shift (need_full_flush); one call per pass like C.
        await cliparound(cx, cy);
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
            // C getpos.c:865–866. describeAt is not this arm.
            await auto_describe(cx, cy);
            need_full_flush = false;
        } else if (need_full_flush) {
            await flush_screen(1);
            if (disp?.setCursor) disp.setCursor(cx - 1, cy + 1);
        }

        rushrun = false; // C `:870` — cleared at the top of every iteration
        // C `:872–888` — a queued key (doagain replay of remember_getpos
        // records, mouse-click MCMD tails) is the input; anything else
        // queued clears the canned queue and cancels via exitgetpos (-1).
        // C `:889–891` — the interactive read is recorded when
        // iflags.remember_getpos and not already replaying (D-3403).
        let key;
        {
            const pos = { x: tx, y: ty, mod: 0 };
            const cmdq = cmdq_pop();
            if (cmdq) {
                if (cmdq.typ !== CMDQ_KEY) {
                    cmdq_clear(CQ_CANNED);
                    ccp.x = cx;
                    ccp.y = cy;
                    g._pending_message = '';
                    if (getpos_hilitefunc) getpos_hilitefunc(false);
                    getpos_sethilite(null, null);
                    return -1;
                }
                key = typeof cmdq.key === 'string'
                    ? cmdq.key.charCodeAt(0) : (cmdq.key | 0);
            } else {
                key = await readchar_poskey(pos);
                tx = pos.x | 0;
                ty = pos.y | 0;
                if (g.iflags?.remember_getpos && !g.in_doagain) {
                    cmdq_add_key(CQ_REPEAT, String.fromCharCode(key));
                }
            }
        }
        need_full_flush = true;
        let ch = String.fromCharCode(key);

        // C: if (iflags.autodescribe) msg_given = FALSE;
        if (g.iflags?.autodescribe) msg_given = false;

        if (key === getpos_spkey(NHKF_ESC)) { // C `:893–898`
            ccp.x = -10; // C `:894` — cx = cy = -10 (was -1; D-3403)
            ccp.y = -10;
            g._pending_message = '';
            if (getpos_hilitefunc) getpos_hilitefunc(false);
            getpos_sethilite(null, null);
            return -1;
        }

        // C `:899–902` — do_run/do_rush ('G'/'g') prefix: one more read,
        // treated as a fast move (rushrun). The second read is not
        // recorded, and a non-direction second key falls through the
        // chain below with rushrun ignored, like C (D-3403).
        if (key === cmd_from_func('run') || key === cmd_from_func('rush')) {
            const pos2 = { x: tx, y: ty, mod: 0 };
            key = await readchar_poskey(pos2);
            tx = pos2.x | 0;
            ty = pos2.y | 0;
            ch = String.fromCharCode(key);
            rushrun = true;
        }

        // C final-else `:1132–1141` quitchars gate for the prefixed key: ESC
        // after the run/rush prefix is not a cancel (-10); like space it
        // skips the unknown-direction pline and loops (force) or says
        // "Done." (!force, ccp (-1, 0), result 0).
        if (rushrun && key === getpos_spkey(NHKF_ESC)) {
            if (force) continue;
            await pline('Done.');
            msg_given = false; // C `:1137` — suppress clear
            ccp.x = -1;
            ccp.y = 0;
            if (getpos_hilitefunc) getpos_hilitefunc(false);
            getpos_sethilite(null, null);
            return 0;
        }

        // C `:903–910` — mouse click: jump the cursor, pick with result 0.
        if (key === 0) {
            if (!isok(tx, ty)) continue;
            cx = tx;
            cy = ty;
            ccp.x = cx;
            ccp.y = cy;
            if (getpos_hilitefunc) getpos_hilitefunc(false);
            getpos_sethilite(null, null);
            return 0;
        }

        // C pick_chars_def: . LOOK_TRADITIONAL, , QUICK, ; ONCE, : VERBOSE
        {
            const pick_i = pick_nhkf.findIndex((nhkf) => key === getpos_spkey(nhkf));
            if (pick_i >= 0) {
                ccp.x = cx;
                ccp.y = cy;
                if (getpos_hilitefunc) getpos_hilitefunc(false);
                getpos_sethilite(null, null);
                return pick_ret[pick_i];
            }
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
            if (g.u) {
                g.u.dx = dx;
                g.u.dy = dy;
                g.u.dz = 0;
            }
            // C `:915–918` — rushrun (do_run/do_rush prefix above) takes
            // the do_rushrun 8-step/glyph-skip path like MV_RUSH/MV_RUN.
            if (rush || rushrun) {
                if (g.iflags?.getloc_moveskip) {
                    // C: skip same glyphs while next+1 is still that glyph
                    const glyph = glyph_at(cx, cy);
                    const sdx = DIR_DX[walk];
                    const sdy = DIR_DY[walk];
                    while (
                        isok(cx + dx, cy + dy)
                        && glyph === glyph_at(cx + dx, cy + dy)
                        && isok(cx + dx + sdx, cy + dy + sdy)
                        && glyph === glyph_at(cx + dx + sdx, cy + dy + sdy)
                    ) {
                        dx += sdx;
                        dy += sdy;
                    }
                } else {
                    dx *= 8;
                    dy *= 8;
                }
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

        // C :945–949 — NHKF_GETPOS_HELP || redraw_cmd(c) → help?;
        // getpos_refresh; curs; show_goal_msg (falls to nxtc — no
        // unknown-direction). Live binding like C, not a hardcoded '?'.
        if (key === getpos_spkey(NHKF_GETPOS_HELP) || redraw_cmd(key)) {
            if (key === getpos_spkey(NHKF_GETPOS_HELP)) {
                await getpos_help(!!force, goal || 'desired location');
            }
            await getpos_refresh();
            if (disp?.setCursor) disp.setCursor(cx - 1, cy + 1);
            show_goal_msg = true;
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

        // C getpos.c NHKF_GETPOS_AUTODESC ('#') — before matching[] (tree/bars).
        if (key === getpos_spkey(NHKF_GETPOS_AUTODESC)) {
            if (!g.iflags) g.iflags = {};
            g.iflags.autodescribe = !g.iflags.autodescribe;
            await pline(
                `Automatic description ${
                    g.flags?.verbose ? 'of features under cursor ' : ''
                }is ${g.iflags.autodescribe ? 'on' : 'off'}.`,
            );
            if (!g.iflags.autodescribe) show_goal_msg = true;
            msg_given = true;
            continue;
        }

        // C getpos.c NHKF_GETPOS_LIMITVIEW ('"') — cycle GFILTER_*; free garr.
        // GFILTER_AREA floods via gloc_filter_init in gather_locs.
        if (key === getpos_spkey(NHKF_GETPOS_LIMITVIEW)) {
            if (!g.iflags) g.iflags = {};
            g.iflags.getloc_filter = ((g.iflags.getloc_filter | 0) + 1) % NUM_GFILTER;
            for (let i = 0; i < NUM_GLOCS; i++) {
                garr[i] = null;
                gidx[i] = 0;
                gcount[i] = 0;
            }
            const view_filters = [
                'Not limiting targets',
                'Limiting targets to those in sight',
                'Limiting targets to those in same area',
            ];
            await pline(`${view_filters[g.iflags.getloc_filter]}.`);
            msg_given = true;
            continue;
        }

        // C getpos.c NHKF_GETPOS_MENU ('!') — toggle getloc_usemenu.
        // getpos_menu listing still named; m|M still cycle when the flag is on.
        if (key === getpos_spkey(NHKF_GETPOS_MENU)) {
            if (!g.iflags) g.iflags = {};
            g.iflags.getloc_usemenu = !g.iflags.getloc_usemenu;
            await pline(
                `${g.iflags.getloc_usemenu ? 'Using' : 'Not using'} a menu to show possible targets${
                    g.iflags.getloc_usemenu ? " for 'm|M', 'o|O', 'd|D', and 'x|X'" : ''
                }.`,
            );
            msg_given = true;
            continue;
        }

        // C ref: getpos.c NHKF_GETPOS_SELF ('@') — reset cycle indices to hero
        if (key === getpos_spkey(NHKF_GETPOS_SELF)) {
            for (let i = 0; i < garr.length; i++) gidx[i] = 0;
            cx = g.u?.ux | 0;
            cy = g.u?.uy | 0;
            continue;
        }

        // C getpos.c NHKF_GETPOS_MOVESKIP ('*') — toggle glyph-skip fastmove.
        if (key === getpos_spkey(NHKF_GETPOS_MOVESKIP)) {
            if (!g.iflags) g.iflags = {};
            g.iflags.getloc_moveskip = !g.iflags.getloc_moveskip;
            await pline(
                `${g.iflags.getloc_moveskip ? 'S' : 'Not s'}kipping over similar terrain when fastmoving the cursor.`,
            );
            msg_given = true;
            continue;
        }

        // C ref: getpos.c mMoOdDxX — getpos_menu pick when getloc_usemenu,
        // else gather_locs + next/prev (gloc 0..5).
        {
            const gtmp = mMoOdDxX_nhkf.findIndex((nhkf) => key === getpos_spkey(nhkf));
            if (gtmp >= 0) {
                const gloc = gtmp >> 1; // 0..5 MONS..VALID
                // C getpos.c:1016–1022 — getloc_usemenu replaces the cycle
                // with a getpos_menu pick; cancel keeps the cursor (nxtc).
                if (g.iflags?.getloc_usemenu) {
                    const tmpcrd = { x: 0, y: 0 };
                    if (await getpos_menu(tmpcrd, gloc)) {
                        cx = tmpcrd.x;
                        cy = tmpcrd.y;
                    }
                    continue;
                }
                if (!garr[gloc]) {
                    const gathered = gather_locs(gloc);
                    garr[gloc] = gathered.arr;
                    gcount[gloc] = gathered.count;
                    gidx[gloc] = 0; // arr[0] is hero
                }
                if (gcount[gloc] > 0) {
                    if (!(gtmp & 1)) {
                        gidx[gloc] = (gidx[gloc] + 1) % gcount[gloc];
                    } else {
                        gidx[gloc] -= 1;
                        if (gidx[gloc] < 0) gidx[gloc] = gcount[gloc] - 1;
                    }
                    const spot = garr[gloc][gidx[gloc]];
                    cx = spot.x;
                    cy = spot.y;
                }
                continue;
            }
        }

        // C ref: getpos.c — non-dir key may match dungeon-feature symbols
        // (defsyms/showsyms matching[]); scan or "Can't find…"; else unknown.
        if (!' \r\n\x1b'.includes(ch)) {
            const fm = build_feature_matching(ch);
            if (fm.k) {
                const tags = feature_match_tags(ch);
                const found = find_dungeon_feature(cx, cy, ch, tags, fm.matching);
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
        // C getpos.c:1122–1128 — do_move_* plus NHKF_GETPOS_PICK.
        const note = force
            ? `use '${visctrl(cmd_from_func('movewest'))}', '${visctrl(cmd_from_func('movesouth'))}', '${visctrl(cmd_from_func('movenorth'))}', '${visctrl(cmd_from_func('moveeast'))}' or '${visctrl(getpos_spkey(NHKF_GETPOS_PICK))}'`
            : 'aborted';
        await pline(`Unknown direction: '${visctrl(key)}' (${note}).`);
        msg_given = true;
        if (force) continue;
        await pline('Done.');
        ccp.x = -1;
        ccp.y = 0;
        // C: msg_given = FALSE; /* suppress clear */ — exitgetpos must
        // leave "Unknown direction ... Done." on the message window.
        if (getpos_hilitefunc) getpos_hilitefunc(false);
        getpos_sethilite(null, null);
        return 0; // C: result = 0 (not -1)
    }
    } finally {
        // C getpos.c:1153–1155 exitgetpos — restore the mouse-button
        // bindings locked before the read loop. This finally is the
        // single-exit funnel (all four returns above + fall-through),
        // like C's exitgetpos label; order vs the dx/dy/dz restore below
        // is unobservable (disjoint state).
        lock_mouse_buttons(false);
        if (g.u) {
            g.u.dx = udx;
            g.u.dy = udy;
            g.u.dz = udz;
        }
    }
}

