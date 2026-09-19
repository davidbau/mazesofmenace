// pager.js — whatis / help / encyclopedia (partial).
// C ref: pager.c do_look / dowhatis / dohelp / checkfile;
//        version.c doextversion; nhlua.c get_lua_version.
//
// Branch envelope: `/` menu (lootabc false) → map getpos / invent pick /
// (itemed `/` cmdq_pop KEY + display_inventory canned KEY D-1686) /
// symbol-or-name getlin / look_all|traps|engrs; `?` help menu + About
// (OPTIONS_AT_RUNTIME → get_lua_version nhlib shuffle) + display_file
// dat/* pages + dokeylist/domenucontrols/docontact; data.base lookups for
// checkfile. object_from_map + look_at_object (SLIME_MOLD spe =
// current_fruit). getpos auto_describe / brief_at glyph_is_object
// fakeobj (D-1547). mhidden_description (D-1554). howmonseen look
// monbuf (D-1562). Full glyph encyclopedia, whatdoes keyhelp body, and
// PORT_HELP deferred.

import { game } from './gstate.js';
import { getversionstring, do_runtime_info } from './version.js';
import { rn2, rn2_on_display_rng } from './rng.js';
import { nhgetch } from './input.js';
import {
    flush_screen, flush_topl_more, pline, impossible, docrt, more,
    mon_glyph, obj_glyph, look_shown_at, terrain_glyph, Hallucination,
    glyph_to_obj_at, glyph_at, glyph_is_trap, glyph_to_trap, trap_to_glyph,
    glyph_is_monster, glyph_is_object, glyph_is_statue, glyph_is_warning,
    glyph_is_body, glyph_is_normal_object, glyph_is_piletop_generic_obj,
    glyph_is_invisible_id, glyph_is_nothing, glyph_is_unexplored,
    glyph_is_cmap, glyph_to_cmap, glyph_to_obj, glyph_to_warning,
    canspotself, mon_to_glyph, monsym, cmap_to_glyph, glyph_to_mon,
    hero_Invisible, NO_GLYPH, GLYPH_TRAP_OFF,
    GLYPH_STATUE_MALE_OFF, GLYPH_STATUE_FEM_OFF,
    GLYPH_STATUE_MALE_PILETOP_OFF, GLYPH_STATUE_FEM_PILETOP_OFF,
    GLYPH_BODY_OFF, GLYPH_BODY_PILETOP_OFF,
    set_bot_disabled, tty_nhbell, MG_FLAG_NOOVERRIDE, SYM_OFF_X, SYM_MAX,
} from './display.js';
import { howmonseen, couldsee, cansee } from './vision.js';
import { getlin, mungspaces, y_n } from './getline.js';
import {
    paint_corner_nhw_menu, dismiss_nhw_menu, dfeature_at, display_inventory,
    observe_object, process_menu_search, trap_predicament,
} from './invent.js';
import {
    getpos, LOOK_QUICK, LOOK_ONCE, LOOK_VERBOSE, room_cmap_explanation,
    maybe_blocked_staircase_down, DEFSYMS_CH,
} from './getpos.js';
import { mon_at, defsym_explanation } from './uhitm.js';
import { sobj_at, mksobj, mkobj, obj_stop_timers } from './mkobj.js';
import {
    doname_vague_quan, an, the, xname, singular, ansimpleoname,
    distant_name, simpleonames,
    makeplural, makesingular, fruit_from_name,
} from './objnam.js';
import { strstri, lcase, upstart, strsubst } from './hacklib.js';
import { distant_monnam, coyotename, PM_COYOTE, pmname, Mgender, Ugender, mon_nam, rndmonnam } from './do_name.js';
import { hides_under, is_hider, is_clinger, is_flyer, is_orc, mons,
    M2_HUMAN, M2_ELF, M2_ORC, M2_DEMON, pmnames, NEUTRAL,
} from './monsters.js';
import { mlet_class_explain, DEF_MONSYM_MLET } from './mondata.js';
import { is_pool, is_lava, closed_door, waterbody_name } from './hack.js';
import { altarmask_at } from './pray.js';
import { align_str } from './roles.js';
import { is_drawbridge_wall } from './dbridge.js';
import { PM_WIZARD, PM_GNOME, PM_HUMAN, PM_ELF, NUMMONS } from './generated/monsters_data.js';
import { visible_region_at } from './region.js';
import { engr_at, sticks } from './engrave.js';
import { digests } from './mhitu.js';
import { option_help_lines } from './options.js';
import { dokeylist_lines, domenucontrols_lines } from './dokeylist.js';
import { trapname, t_at, ice_descr } from './trap.js';
import { trapped_chest_at, trapped_door_at } from './detect.js';
import { costly_spot, doname_with_price } from './shk.js';
import { cmdq_pop, cmdq_clear, pmatch } from './cmd.js';
import {
    objectNames, objectNameStrs, COIN_CLASS, def_oc_syms,
    ROCK_CLASS, VENOM_CLASS, MAXOCLASSES,
} from './objects.js';
import {
    BOLT_LIM, COLNO, ROWNO, STAIRS, LA_DOWN, ROOM, CORR, STONE, SCORR, SDOOR,
    GPCOORDS_NONE, GPCOORDS_MAP, GPCOORDS_COMPASS, GPCOORDS_SCREEN,
    STRAT_WAITMASK, IS_WALL, IS_GRAVE, Upolyd, Is_airlevel, Is_waterlevel, Is_astralevel,
    Is_rogue_level,
    u_at, TER_MON, TER_OBJ, TER_MAP, TER_DETECT,
    Amask2align, AM_SANCTUM, AM_MASK, D_BROKEN, D_TRAPPED,
    S_altar, S_ndoor, S_cloud, S_pool, S_water, S_lava, S_lavawall, S_ice,
    S_engroom, S_engrcorr, S_stone, S_grave, S_arrow_trap, S_vibrating_square,
    S_darkroom, S_vbeam, S_poisoncloud, S_goodpos, S_expl_br, S_expl_tl,
    S_vwall, S_hwall, S_tlcorn, S_trcorn, S_blcorn, S_brcorn,
    S_crwall, S_tuwall, S_tdwall, S_tlwall, S_trwall,
    S_vodoor, S_hodoor, S_bars, S_tree, S_room,
    S_upladder, S_dnladder, S_brupladder, S_brdnladder,
    S_hodbridge, S_hbeam, ROGUESET,
    SYM_NOTHING, SYM_UNEXPLORED, SYM_BOULDER, SYM_INVISIBLE,
    SYM_PET_OVERRIDE, SYM_HERO_OVERRIDE, WARNCOUNT,
    S_vodbridge, S_hcdbridge, MAXTCHARS, VIBRATING_SQUARE, def_warnsyms,
    POOL, MOAT, WATER, LAVAPOOL, LAVAWALL, ICE,
    HELP, SHELP, HISTORY, LICENSE, OPTIONFILE, OPTMENUHELP, USAGEHELP, DEBUGHELP,
    ECMD_OK, BUFSZ, QBUFSZ,
    OBJ_FREE, OBJ_FLOOR, OBJ_BURIED, M_AP_OBJECT, M_AP_FURNITURE, M_AP_MONSTER,
    M_AP_TYPMASK, M_AP_F_DKNOWN, M_AP_TYPE,
    MCORPSENM, has_mcorpsenm, MALE, FEMALE,
    ARTICLE_NONE, BEAR_TRAP, WEB, NO_TRAP, is_pit,
    MHID_PREFIX, MHID_ARTICLE, MHID_ALTMON, MHID_REGION,
    MONSEEN_NORMAL, MONSEEN_SEEINVIS, MONSEEN_INFRAVIS, MONSEEN_TELEPAT,
    MONSEEN_XRAYVIS, MONSEEN_DETECT, MONSEEN_WARNMON,
    CMDQ_KEY, MENU_SEARCH, PICK_ONE, I_SPECIAL,
} from './const.js';
import { ATR_INVERSE, NO_COLOR, DEC_TO_UNICODE } from './terminal.js';
import { DAT_TEXT } from './generated/dat_text.js';

const CHK_USR = 1;
const CHK_DONT_ASK = 2;
/** C ref: pager.c chkfilIaCheck — lookup only, no display (itemed `/`). */
const CHK_IA_CHECK = 4;

const BOULDER_OTYP = objectNames.indexOf('BOULDER');
const STRANGE_OBJECT = objectNames.indexOf('STRANGE_OBJECT');
const SLIME_MOLD = objectNames.indexOf('SLIME_MOLD');
const LEASH = objectNames.indexOf('LEASH');

/**
 * Contest Rule #2: no runtime filesystem. Texts are embedded via
 * scripts/extract-dat-text.py → js/generated/dat_text.js.
 * C DATAFILE "data" is built from data.base; key "data" holds that source.
 */
function readDat(name) {
    const raw = DAT_TEXT[name];
    return raw == null ? null : raw;
}

/**
 * C ref: nhlua.c get_lua_version — nhl_init loads nhlib.lua → shuffle(align).
 * First call only (gl.lua_ver empty).
 */
function get_lua_version_shuffle() {
    if (game._lua_ver) return;
    const align = ['law', 'neutral', 'chaos'];
    for (let i = align.length; i > 1; i--) {
        const j = rn2(i);
        [align[i - 1], align[j]] = [align[j], align[i - 1]];
    }
    game._lua_ver = '5.4';
    game._nhl_version_align = align;
}

/**
 * C ref: hacklib.c tabexpand — expand tabs to 8-column stops in place.
 */
function tabexpand(s) {
    let out = '';
    let idx = 0;
    for (const ch of String(s || '')) {
        if (ch === '\t') {
            do {
                out += ' ';
                idx++;
            } while (idx % 8);
        } else {
            out += ch;
            idx++;
        }
        if (idx >= 255) break; // BUFSZ-1ish truncate
    }
    return out;
}

/**
 * C ref: wintty.c tty_display_nhwindow(NHW_TEXT) + process_text_window.
 * NHW_TEXT forces maxcol=cols → offx=0 fullscreen; after lines, H2344
 * cl_eos from cury+1; --More-- on rows-1; dmore offset 1 → cursor [8,23].
 */
/**
 * C ref: wintty.c dmore → getline.c xwaitforspace(quitchars)
 * quitchars = " \\r\\n\\033". Non-matching keys bell and stay on the page
 * (each nhgetch is still a capture boundary). ESC cancels (WIN_CANCELLED).
 * @returns {Promise<boolean>} true if ESC cancelled
 */
async function text_page_wait() {
    for (;;) {
        const c = await nhgetch();
        if (c === 27) return true;
        if (c === 32 || c === 13 || c === 10) return false;
        // tty_nhbell(); ignore
    }
}

/**
 * C ref: wintty.c process_text_window NHW_TEXT + H2344 putstr page-at-a-time.
 * Paint bound: after tty_curs(1,n) curx is 0-based 0; the put loop is
 * `++curx < cols` → at most cols-1 glyphs (col cols-1 stays blank). Long
 * no-space lines (e.g. get_configfile paths) are stored whole by tty_putstr
 * but only the first cols-1 cells are emitted (D-0933).
 * @returns {Promise<boolean>} true if ESC cancelled remaining pages
 */
/**
 * C ref: win/tty/wintty.c compress_str — tty_putstr runs every non-message
 * window line with strlen >= CO (or containing '\n') through this: leading
 * spaces are discarded, runs collapse to one, '\n' becomes ' ', trailing
 * space removed (BUFSZ-capped). A 94-col gamelog wish line thus shows as
 * `1: made his first wish ...` in C. Display-only; no RNG.
 * @param {string} str
 * @param {number} [co=80] terminal columns (C global CO)
 * @returns {string}
 */
export function compress_str(str, co = 80) {
    const s = String(str ?? '');
    if (s.length < co && !s.includes('\n')) return s;
    let out = '';
    let capped = false;
    let was_space = true; // C: TRUE discards all leading spaces
    for (const c0 of s) {
        if (out.length >= 255) { capped = true; break; } // C cbuf[BUFSZ-1]
        const c = c0 === '\n' ? ' ' : c0;
        if (was_space && c === ' ') continue;
        out += c;
        was_space = (c === ' ');
    }
    if ((was_space && out.length > 0) || capped) out = out.slice(0, -1);
    return out;
}

/**
 * C ref: win/tty/wintty.c tty_putstr NHW_TEXT arm — after compress_str, a
 * stored line with n0 = strlen+1 > CO is word-wrapped: scan back from
 * str[CO-1] for ' ' (or '\n'); the stored fragment keeps the break space
 * (`data[++i] = 0`) and the remainder re-enters tty_putstr from AFTER the
 * break space (`&str[i]` post-`++i`, so the space is consumed, not kept).
 * No break point →
 * stored whole (paint truncates). Returns the display lines in order.
 * @param {string} str raw putstr line
 * @param {number} [co=80] terminal columns (C global CO)
 * @returns {string[]}
 */
export function wrap_text_window_line(str, co = 80) {
    const out = [];
    let s = compress_str(str, co);
    for (;;) {
        if (s.length < co) { out.push(s); break; } // C: n0 = len+1 <= CO
        let i = co - 1;
        while (i && s[i] !== ' ' && s[i] !== '\n') i--;
        if (!i) { out.push(s); break; } // no break point: stored whole
        out.push(s.slice(0, i + 1)); // keeps the break space (C data[++i]=0)
        s = compress_str(s.slice(i + 1), co); // C: &str[i] after ++i — break space consumed
    }
    return out;
}

/**
 * @param {Array<string|{text:string,attr?:number}>} lines
 * @param {{ moreAtEnd?: boolean }} [opts]
 */
export async function show_text_pages(lines, { moreAtEnd = true } = {}) {
    const disp = game.nhDisplay;
    if (!disp) {
        await nhgetch();
        return false;
    }
    const cols = disp.cols || 80;
    const textCols = cols - 1; // C: ++curx < cols from curx==0
    const rows = 24;
    const pageRows = rows - 1; // leave bottom for --More-- / (end)
    // C: wrap fragments are data lines before paging (putstr-time wrap).
    const expanded = [];
    for (const entry of lines) {
        const raw = typeof entry === 'string' ? (entry || '') : (entry?.text || '');
        const attr = typeof entry === 'string' ? 0 : (entry?.attr || 0);
        // C wintty.c tty_putstr NHW_TEXT: compress_str + word-wrap (D-1892).
        for (const text of wrap_text_window_line(raw, cols))
            expanded.push(typeof entry === 'string' ? text : { text, attr });
    }
    let offset = 0;
    let cancelled = false;
    while (offset < expanded.length || (offset === 0 && expanded.length === 0)) {
        game._menu_overlay = true;
        game._pending_message = '';
        disp.clearScreen();
        const chunk = expanded.slice(offset, offset + pageRows);
        for (let r = 0; r < chunk.length; r++) {
            const entry = chunk[r];
            const text = typeof entry === 'string' ? entry : (entry?.text || '');
            const attr = typeof entry === 'string' ? 0 : (entry?.attr || 0);
            for (let i = 0; i < text.length && i < textCols; i++)
                disp.setCell(i, r, text[i], NO_COLOR, attr);
        }
        // C H2344: tty_curs(1, cury+1); cl_eos(); then more on rows-1
        for (let r = chunk.length; r < rows - 1; r++) {
            for (let c = 0; c < cols; c++)
                disp.setCell(c, r, ' ', NO_COLOR, 0);
        }
        const last = offset + pageRows >= expanded.length;
        const footer = last && !moreAtEnd ? '(end) ' : '--More--';
        const moreRow = rows - 1;
        for (let c = 0; c < cols; c++)
            disp.setCell(c, moreRow, ' ', NO_COLOR, 0);
        for (let i = 0; i < footer.length && i < cols; i++)
            disp.setCell(i, moreRow, footer[i], NO_COLOR, 0);
        // C dmore NHW_TEXT: cursor after prompt; help_dir uses [8,23] for "--More--"
        disp.setCursor(footer.startsWith('--More--') ? 8 : footer.length, moreRow);
        await flush_screen(1);
        cancelled = await text_page_wait();
        if (cancelled) break;
        offset += pageRows;
        if (last) break;
    }
    game._menu_overlay = false;
    await docrt();
    await flush_screen(1);
    return cancelled;
}

/**
 * C ref: getpos.c coord_desc GPCOORDS_MAP — "<x,y>"; y<10 gets trailing
 * space so %8s columns line up (pager.c look_all).
 */
/**
 * C ref: pager.c trap_description `:164–181` — name the thing a trap
 * glyph stands for. Trap detection used to draw a bear trap over
 * trapped doors and trapped containers; those are semi-real traps now
 * (real ttyp, but not on the `ftrap` chain), so the two `detect.c`
 * gates get first refusal before falling back to `trapname`.
 * C order matters beyond wording: each gate draws `rn2(20)` while the
 * hero is hallucinating, and `trapped_door_at` can call
 * `trapped_chest_at` again — keep chest first, then door.
 * Callers (lookat `:718–721`, `look_traps` `:2093–2094`) pass
 * `glyph_to_trap(glyph_at(x, y))`, not `t_at.ttyp`. `doidtrap` still named.
 */
export function trap_description(tnum, x, y) {
    if (trapped_chest_at(tnum, x, y)) {
        return 'trapped chest'; /* might actually be a large box */
    }
    if (trapped_door_at(tnum, x, y)) {
        return 'trapped door'; /* not "trap door"... */
    }
    return trapname(tnum, false);
}

function coord_desc(x, y, cmode = GPCOORDS_MAP) {
    if (cmode === GPCOORDS_SCREEN) {
        return `[${String(y + 2).padStart(2, '0')},${String(x).padStart(2, '0')}]`;
    }
    if (cmode === GPCOORDS_COMPASS || cmode === 'f') {
        return '(here)'; // full compass deferred; look_all defaults to MAP
    }
    let s = `<${x},${y}>`;
    if (cmode === GPCOORDS_MAP && y < 10) s += ' ';
    return s;
}

function look_coord_prefix(x, y, cmode) {
    const coordbuf = coord_desc(x, y, cmode);
    if (cmode === GPCOORDS_SCREEN) return `${coordbuf}  `;
    if (cmode === GPCOORDS_MAP) return `${coordbuf.padStart(8, ' ')}  `;
    return `${coordbuf.padStart(12, ' ')}  `;
}

function look_getpos_cmode() {
    const gpc = game.iflags?.getpos_coords;
    if (gpc && gpc !== GPCOORDS_NONE) return gpc;
    return GPCOORDS_MAP;
}

/**
 * C monst.h U_AP_TYPE / pager.c youmonst for self_lookat.
 * JS artifact youmonst is a sentinel; fill data/m_ap from u when needed.
 */
function youmonst_for_hidden() {
    const u = game.u || {};
    const ym = game.youmonst;
    const mndx = u.umonnum ?? game.urole?.mnum;
    const data = ym?.data || (mndx != null ? mons(mndx) : null);
    if (ym && (ym.data || ym.m_ap_type || ym.mappearance)) {
        if (!ym.data && data) ym.data = data;
        if (ym.mundetected == null) ym.mundetected = !!u.uundetected;
        if (ym.female == null) ym.female = !!(u.mfemale ?? game.flags?.female);
        ym._youmonst = true;
        return ym;
    }
    return {
        _youmonst: true,
        mx: u.ux | 0,
        my: u.uy | 0,
        data,
        m_ap_type: (ym?.m_ap_type | 0),
        mappearance: (ym?.mappearance | 0),
        mundetected: !!u.uundetected,
        female: !!(u.mfemale ?? game.flags?.female),
    };
}

/**
 * C ref: pager.c self_lookat — race adj + pmname(umonnum,Ugender) + called
 * plname + mhidden_description (D-1554) + Punished ", chained to %s" +
 * utrap ", <trap_predicament>" (pager.c:131).
 * Steed (y_monnam) deferred, own row on a falsifier.
 */
function self_lookat() {
    const u = game.u || {};
    // C: race only when !Upolyd; Sprintf(race, "%s ", urace.adj)
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
    const youm = youmonst_for_hidden();
    const u_ap = (youm.m_ap_type | 0) & M_AP_TYPMASK;
    // C: if (u.uundetected || (Upolyd && U_AP_TYPE) || visible_region_at)
    if (u.uundetected || (Upolyd(u) && u_ap) || visible_region_at(u.ux, u.uy)) {
        buf += mhidden_description(youm,
            MHID_PREFIX | MHID_ARTICLE | MHID_REGION);
    }
    // C: if (Punished) … uball ? ansimpleoname(uball) : "nothing?"
    // C: Punished ≡ (uball != 0)
    if (u.uball) {
        buf += `, chained to ${ansimpleoname(u.uball)}`;
    }
    // C pager.c:131 — bear trap, pit, web, in-floor, in-lava, tethered.
    // final=0, no wizard suffix (self_lookat is never a final disclosure).
    if ((u.utrap | 0)) buf += `, ${trap_predicament(0, false)}`;
    // Steed arm (y_monnam) deferred, own row on a falsifier.
    return buf;
}

/**
 * C ref: pager.c monhealthdescr `:138–160` — the `#if 0` block is disabled,
 * so this always stores empty (`nhUse(mon); nhUse(addspace); *outbuf =
 * '\0'`). Shared by look_at_monster() and done_in_by().
 */
export function monhealthdescr(mon) {
    return '';
}

/**
 * C ref: pager.c look_at_monster `:422–555` — full body in C order.
 * `buf` arms: coyote (`do_name.c:1526` via live `coyotename`) vs
 * `distant_monnam(ARTICLE_NONE)` gated on `accurate = !Hallucination`
 * (`:430–432`); worm-tail "tail of "/"tail of a " on look-vs-mon pos
 * with the isshk&&accurate split (`:433–436`); `monhealthdescr` prefix
 * (always empty, see above) (`:437`); tame/peaceful gated on accurate
 * (`:438–442`); ustuck swallowed/engulfing via `digests` vs held/holding
 * via `Upolyd && sticks(youmonst.data)` (`:443–451`); mfrozen /
 * msleeping / STRAT_WAITMASK (`:452–464`); mleashed (`:466–467`);
 * mtrapped + `cansee` + `t_at` BEAR_TRAP/is_pit/WEB with `tseen = 1`
 * (`:468–478`); `mhidden_description` on mundetected/M_AP_TYPE/
 * `visible_region_at(look x,y)` (D-1554) (`:479–484`). `monbuf` arms
 * (`:486–554`): `howmonseen` bits (D-1562) in C bit order with C ", "
 * separators; WARNMON hallu "paranoid delusion" vs warntype/mflags2
 * human/elf/orc/demon/`pmname(data, Mgender)` + `makeplural`.
 * look_all passes NULL monbuf; describe_looked appends " [seen: %s]".
 */
export function look_at_monster(mtmp, x, y) {
    if (!mtmp) return { buf: 'monster', monbuf: '' };
    const u = game.u || {};
    const accurate = !Hallucination(); // C :429
    // C :430–432 — data == &mons[PM_COYOTE] compares the permonst ptr;
    // JS mons() builds fresh objects so compare data.mndx (do_name.c idiom).
    const mndx = mtmp.data?.mndx ?? mtmp.mnum;
    const name = (mndx === PM_COYOTE && accurate)
        ? coyotename(mtmp)
        : distant_monnam(mtmp, ARTICLE_NONE);
    // C :433–442 Sprintf(buf, "%s%s%s%s", tail, health, tamepeace, name).
    const tail = (mtmp.mx !== x || mtmp.my !== y)
        ? ((mtmp.isshk && accurate) ? 'tail of ' : 'tail of a ')
        : '';
    const health = accurate ? monhealthdescr(mtmp) : '';
    const tamepeace = (mtmp.mtame && accurate)
        ? 'tame '
        : (mtmp.mpeaceful && accurate)
            ? 'peaceful '
            : '';
    let buf = `${tail}${health}${tamepeace}${name}`;
    // C :443–451 — u.ustuck == mtmp pointer compare.
    if (u.ustuck && mtmp && u.ustuck === mtmp) {
        if (u.uswallow || game.iflags?.save_uswallow) {
            buf += digests(mtmp.data) ? ', swallowing you' : ', engulfing you';
        } else {
            buf += (Upolyd(u) && sticks(game.youmonst?.data))
                ? ', being held' : ', holding you';
        }
    }
    // C :452–464 (excerpt from mstatusline for stethoscope/probe).
    if (mtmp.mfrozen) {
        buf += ", can't move (paralyzed or sleeping or busy)";
    } else if (mtmp.msleeping) {
        buf += ', asleep';
    } else if ((mtmp.mstrategy || 0) & STRAT_WAITMASK) {
        buf += ', meditating';
    }
    // C :466–467.
    if (mtmp.mleashed) buf += ', leashed to you';
    // C :468–478 — newsym lets you know of the trap, so mention it here.
    if (mtmp.mtrapped && cansee(mtmp.mx | 0, mtmp.my | 0)) {
        const t = t_at(mtmp.mx | 0, mtmp.my | 0);
        const tt = t ? t.ttyp : NO_TRAP;
        if (tt === BEAR_TRAP || is_pit(tt) || tt === WEB) {
            buf += `, trapped in ${an(trapname(tt, false))}`;
            t.tseen = 1;
        }
    }
    // C :479–484 — shown via persistent detection; x,y are the LOOK
    // coords (worm-tail FIXME reads mx,my inside mhidden itself).
    if (mtmp.mundetected || M_AP_TYPE(mtmp) || visible_region_at(x, y)) {
        buf += mhidden_description(mtmp,
            MHID_PREFIX | MHID_ARTICLE | MHID_REGION);
    }
    // C :486–554 monbuf; [0] = '\0' then bits in fixed order, ", "
    // appended while bits remain (mirrored below, not join()).
    let monbuf = '';
    let how_seen = howmonseen(mtmp) | 0;
    if (how_seen !== 0 && how_seen !== MONSEEN_NORMAL) {
        if (how_seen & MONSEEN_NORMAL) {
            monbuf += 'normal vision';
            how_seen &= ~MONSEEN_NORMAL;
            if (how_seen) monbuf += ', ';
        }
        if (how_seen & MONSEEN_SEEINVIS) {
            monbuf += 'see invisible';
            how_seen &= ~MONSEEN_SEEINVIS;
            if (how_seen) monbuf += ', ';
        }
        if (how_seen & MONSEEN_INFRAVIS) {
            monbuf += 'infravision';
            how_seen &= ~MONSEEN_INFRAVIS;
            if (how_seen) monbuf += ', ';
        }
        if (how_seen & MONSEEN_TELEPAT) {
            monbuf += 'telepathy';
            how_seen &= ~MONSEEN_TELEPAT;
            if (how_seen) monbuf += ', ';
        }
        if (how_seen & MONSEEN_XRAYVIS) {
            // C: Eyes of the Overworld.
            monbuf += 'astral vision';
            how_seen &= ~MONSEEN_XRAYVIS;
            if (how_seen) monbuf += ', ';
        }
        if (how_seen & MONSEEN_DETECT) {
            monbuf += 'monster detection';
            how_seen &= ~MONSEEN_DETECT;
            if (how_seen) monbuf += ', ';
        }
        if (how_seen & MONSEEN_WARNMON) {
            if (Hallucination()) {
                monbuf += 'paranoid delusion';
            } else {
                const wt = game.context?.warntype || {};
                const mW = (wt.obj | 0) | (wt.polyd | 0);
                const m2 = mtmp.data?.mflags2 | 0;
                const whom = ((mW & M2_HUMAN & m2) ? 'human'
                    : (mW & M2_ELF & m2) ? 'elf'
                      : (mW & M2_ORC & m2) ? 'orc'
                        : (mW & M2_DEMON & m2) ? 'demon'
                          : pmname(mtmp.data, Mgender(mtmp)));
                monbuf += `warned of ${makeplural(whom)}`;
            }
            how_seen &= ~MONSEEN_WARNMON;
            if (how_seen) monbuf += ', ';
        }
        // C :550–553 — all 7 bits consumed above, so leftover is
        // unreachable; C logs impossible() (async debug path, skipped in
        // this sync look) and still appends "(%u)". Suffix preserved.
        if (how_seen) monbuf += `(${how_seen >>> 0})`;
    }
    return { buf, monbuf };
}

/**
 * C ref: pager.c look_at_monster `:433–484` buf half (see look_at_monster).
 * Callers: lookat `:710` (with monbuf), look_all `:2002` (NULL monbuf),
 * do_screen_description monster arm (with [seen:] suffix).
 */
function look_at_monster_buf(mtmp, x, y) {
    return look_at_monster(mtmp, x, y).buf;
}

/**
 * C ref: pager.c look_at_monster `:486–554` monbuf half (D-1562).
 * Empty when 0 or NORMAL-only. look_all passes NULL monbuf;
 * describe_looked appends " [seen: %s]".
 */
function howmonseen_look_buf(mtmp) {
    return look_at_monster(mtmp, mtmp?.mx | 0, mtmp?.my | 0).monbuf;
}

/**
 * C ref: pager.c checkfile → create_nhwindow(NHW_MENU) + putstr +
 *        display_nhwindow → wintty process_text_window (cw->data path).
 * H2344_BROKEN offx; leading pad at offx; text at offx+1; dmore
 * defmorestr "--More--" with MENU offset 2 → prompt at offx+1;
 * cursor past prompt at offx+1+strlen("--More--").
 * Corner path keeps map/status (no term_clear_screen).
 */
/**
 * Exported for insight.c putstr NHW_MENU paths (#conduct, etc.).
 * C ref: wintty.c process_text_window corner/fullscreen for NHW_MENU data.
 */
/**
 * C ref: wintty.c process_text_window + dmore(cw, quitchars) for NHW_MENU
 * putstr windows (look_here, etc.). Corner (offx≠0) paints all rows then
 * one dmore; fullscreen pages at rows-1. Both use xwaitforspace(quitchars)
 * — only space/CR/ESC advance; hjklyubn stay on the page (capture still).
 *
 * @param {string[]} lines
 * @param {{ keep_message_leftover?: boolean }} [opts]
 *   When true (look_here only): model invent.c `display_nhwindow(WIN_MESSAGE,
 *   FALSE)` before the menu — toplin EMPTY without wipe, so NHW_MENU's
 *   `tty_clear_nhwindow(WIN_MESSAGE)` is a no-op and getpos leftovers stay
 *   left of offx through dismiss. Ordinary corner menus clear (D-0929).
 */
export async function show_nhw_menu_text(lines, opts = {}) {
    // C ref: wintty.c tty_display_nhwindow(NHW_MENU) — toplin NEED_MORE
    // flushes WIN_MESSAGE blocking first (the look putmixed + --More--
    // wait precedes the checkfile menu paint).
    await flush_topl_more();
    const disp = game.nhDisplay;
    if (!disp) {
        await text_page_wait();
        return;
    }
    const cols = disp.cols || 80;
    const rows = 24;
    const morestr = '--More--';
    let maxcol = 0;
    for (const line of lines) {
        const n0 = String(line || '').length + 1; // tty_putstr
        if (n0 > maxcol) maxcol = n0;
    }
    // C wintty.c tty_putstr NHW_MENU: compress_str + word-wrap run at
    // storage time, so the wrapped fragments are the data rows the menu
    // pages and paints (maxcol above still tracks the raw lines, as in C).
    // Same shape as show_text_pages' NHW_TEXT expansion (D-1892).
    const stored = [];
    for (const line of lines) {
        for (const text of wrap_text_window_line(String(line ?? ''), cols))
            stored.push(text);
    }
    lines = stored;
    let offx = Math.min(Math.min(82, Math.floor(cols / 2)), cols - maxcol - 1);
    if (offx < 0) offx = 0;
    const maxrow = lines.length;
    if (maxrow >= rows || game.flags?.menu_overlay === false) offx = 0;

    // Default: clear topline (C NHW_MENU corner tty_clear when toplin!=EMPTY,
    // fullscreen always). look_here opts.keep_message_leftover skips clear
    // for corner — prior WIN_MESSAGE FALSE left glyphs / _pending_message.
    const keepLeftover = !!opts.keep_message_leftover && offx !== 0;
    if (!keepLeftover) game._pending_message = '';
    game._menu_overlay = false;
    await flush_screen(1);

    if (offx === 0) {
        // Fullscreen NHW_MENU / tall entry — clear then paint col-0 text.
        // C process_text_window + dmore(NHW_MENU): --More-- at col 1
        // (leading blank), cursor at 1+strlen (tty_curs offx+1 then +offset).
        disp.clearScreen();
        const pageRows = rows - 1;
        let offset = 0;
        while (offset < lines.length || (offset === 0 && lines.length === 0)) {
            game._menu_overlay = true;
            const chunk = lines.slice(offset, offset + pageRows);
            disp.clearScreen();
            // C process_text_window: ++curx < cols from curx==0 → cols-1 glyphs
            const textCols = cols - 1;
            for (let r = 0; r < chunk.length; r++) {
                const text = chunk[r] || '';
                for (let i = 0; i < text.length && i < textCols; i++)
                    disp.setCell(i, r, text[i], NO_COLOR, 0);
            }
            const last = offset + pageRows >= lines.length;
            const fr = Math.min(rows - 1, Math.max(chunk.length, 1));
            disp.setCell(0, fr, ' ', NO_COLOR, 0);
            for (let i = 0; i < morestr.length && 1 + i < cols; i++)
                disp.setCell(1 + i, fr, morestr[i], NO_COLOR, 0);
            disp.setCursor(1 + morestr.length, fr);
            const cancelled = await text_page_wait();
            if (cancelled) break;
            offset += pageRows;
            if (last) break;
        }
    } else {
        // C process_text_window corner: cl_end from offx; putchar(' '); text.
        // No mid-list page break when offx≠0 — all rows then one dmore.
        for (let r = 0; r < lines.length; r++) {
            for (let c = offx; c < cols; c++)
                disp.setCell(c, r, ' ', NO_COLOR, 0);
            disp.setCell(offx, r, ' ', NO_COLOR, 0);
            const text = lines[r] || '';
            for (let i = 0; i < text.length && offx + 1 + i < cols; i++)
                disp.setCell(offx + 1 + i, r, text[i], NO_COLOR, 0);
        }
        const moreRow = lines.length;
        for (let c = offx; c < cols; c++)
            disp.setCell(c, moreRow, ' ', NO_COLOR, 0);
        // dmore NHW_MENU: prompt at offx+1
        for (let i = 0; i < morestr.length && offx + 1 + i < cols; i++)
            disp.setCell(offx + 1 + i, moreRow, morestr[i], NO_COLOR, 0);
        disp.setCursor(offx + 1 + morestr.length, moreRow);
        game._menu_overlay = true;
        await text_page_wait();
    }

    game._menu_overlay = false;
    // C erase_menu_or_text: offx==0 → docrt; else docorner. JS still
    // docrt() for Hallu see_monsters burns (cohort RNG); cls() wipes
    // _pending_message, so restore only look_here leftovers C leaves
    // left of offx (D-0929 — not every corner menu).
    const savedTopl = keepLeftover ? (game._pending_message || '') : '';
    await docrt();
    if (savedTopl) game._pending_message = savedTopl;
    await flush_screen(1);
}

/**
 * C ref: files.c / windows.c display_file — page a dat text file.
 */
async function display_file(fname, _warn) {
    const raw = readDat(fname);
    if (!raw) {
        await pline(`Cannot open '${fname}' file!`);
        return;
    }
    const lines = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
    // C keeps intentional trailing blank lines (e.g. usagehlp ends with
    // an empty putstr page). Only drop the split artifact from a final \n.
    if (lines.length && lines[lines.length - 1] === '') lines.pop();
    await show_text_pages(lines);
}

/**
 * Parse data.base: keys (non-# non-tab lines) → tab-indented body lines.
 * Returns the entry body plus its key-block line index so checkfile can
 * skip a pass-0 hit on the same entry C already showed for pass 1
 * (C compares dlb offsets; same body at the same index is the same entry).
 */
function lookup_data_base_entry(query) {
    const raw = readDat('data');
    if (!raw) return null;
    const q = String(query || '').toLowerCase();
    if (!q) return null;
    const lines = raw.split('\n');
    let i = 0;
    while (i < lines.length) {
        const line = lines[i];
        if (!line || line.startsWith('#') || line.startsWith('\t')
            || line.startsWith(' ')) {
            i++;
            continue;
        }
        const keyIndex = i;
        // Collect key block until body. Keys keep file case: C matches
        // them with case-sensitive pmatch (strutil.c:144-148) against
        // lcase(dbase_str) (pager.c:866), so q is lowered but keys are
        // not (measured: dat/data.base has a single uppercase key,
        // `A.S*`, which C matches only against un-lowered pass-1 alt).
        const keys = [];
        while (i < lines.length) {
            const k = lines[i];
            if (!k || k.startsWith('#')) { i++; continue; }
            if (k.startsWith('\t') || k.startsWith(' ')) break;
            keys.push(k.trim());
            i++;
        }
        const body = [];
        while (i < lines.length) {
            const b = lines[i];
            if (!b) { body.push(''); i++; continue; }
            if (b.startsWith('#')) { i++; continue; }
            if (!(b.startsWith('\t') || b.startsWith(' '))) break;
            // C checkfile: strip one leading tab (or up to 8 spaces), then
            // tabexpand if any remaining tab (attribution indents).
            let tp = b;
            if (tp.startsWith('\t')) tp = tp.slice(1);
            else if (tp.startsWith(' ')) {
                let n = 0;
                while (n < 8 && tp[n] === ' ') n++;
                tp = tp.slice(n);
            }
            if (tp.includes('\t')) tp = tabexpand(tp);
            body.push(tp);
            i++;
        }
        // C pager.c:1024 checkfile pass-0 arm: pmatch(key, dbase_str).
        // pmatch with no wildcards is exact equality, so no fast path
        // is needed — the call below is the C call (D-1954).
        let matched = false;
        for (const key of keys) {
            if (key.startsWith('~')) continue;
            if (pmatch(key, q)) { matched = true; break; }
        }
        // Leading ~ keys exclude (C chk_skip arm, pager.c:1023-1029:
        // a matching ~ key skips the entry).
        if (matched) {
            for (const key of keys) {
                if (!key.startsWith('~')) continue;
                if (pmatch(key.slice(1), q)) { matched = false; break; }
            }
        }
        if (matched) return { body, index: keyIndex };
    }
    return null;
}

/**
 * C pager.c checkfile `:867–935` — prefix strips over the lowered lookup
 * string, in C order with C's else-if chains (not independent patterns:
 * `a/an/the/some/digit-count` are one chain, `tame/peaceful` one chain,
 * `blessed/uncursed/cursed` one chain, `partly used/partly eaten` one
 * chain, `statue/figurine` one chain).
 */
function checkfile_dbase_str(s) {
    if (s.startsWith('interior of ')) s = s.slice(12); // :872-873
    if (s.startsWith('a ')) s = s.slice(2); // :874-875
    else if (s.startsWith('an ')) s = s.slice(3); // :876-877
    else if (s.startsWith('the ')) s = s.slice(4); // :878-879
    else if (s.startsWith('some ')) s = s.slice(5); // :880-881
    else if (s.length && s[0] >= '0' && s[0] <= '9') { // :882-888 count
        let i = 0;
        while (i < s.length && s[i] >= '0' && s[i] <= '9') i++;
        s = s.slice(i);
        if (s.startsWith(' ')) s = s.slice(1);
    }
    if (s.startsWith('pair of ')) s = s.slice(8); // :889-890
    if (s.startsWith('tame ')) s = s.slice(5); // :891-892
    else if (s.startsWith('peaceful ')) s = s.slice(9); // :893-894
    if (s.startsWith('invisible ')) s = s.slice(10); // :895-896
    if (s.startsWith('saddled ')) s = s.slice(8); // :897-898
    if (s.startsWith('blessed ')) s = s.slice(8); // :899-900
    else if (s.startsWith('uncursed ')) s = s.slice(9); // :901-902
    else if (s.startsWith('cursed ')) s = s.slice(7); // :903-904
    if (s.startsWith('empty ')) s = s.slice(6); // :905-906
    if (s.startsWith('partly used ')) s = s.slice(12); // :907-908
    else if (s.startsWith('partly eaten ')) s = s.slice(13); // :909-910
    if (s.startsWith('statue of ')) s = 'statue'; // :911-912 [6]='\0'
    else if (s.startsWith('figurine of ')) s = 'figurine'; // :913-914 [8]
    // :918-925 — remove enchantment ("+0 aklys").
    if (s.length > 1 && (s[0] === '+' || s[0] === '-')
        && s[1] >= '0' && s[1] <= '9') {
        let i = 1;
        while (i < s.length && s[i] >= '0' && s[i] <= '9') i++;
        s = s.slice(i);
        if (s.startsWith(' ')) s = s.slice(1);
    }
    // :929-934 — "moist towel" asks about "wet towel" (memcpy over "moist").
    if (s.startsWith('moist towel')) s = `wet${s.slice(5)}`;
    return s;
}

/**
 * C pager.c checkfile `:944–981` — split the named/called given name off the
 * base description, then strip charges/`(lit)`/aum (`:977–981`).
 * dbase is already lowered (C splits dbase_str after
 * lcase, so indexOf matches C strstri there); supplemental_name is copied
 * from the original-case inp (C strstri over inp, `:956–958`). Truncation
 * `*ep = '\0'` keeps the base when the match sits past position 0.
 */
function checkfile_split_names(dbase, inp, supplementalHolder) {
    let alt = null;
    let ep;
    const iNamed = dbase.indexOf(' named '); // :945-950
    const iCalled = dbase.indexOf(' called ');
    if (iNamed >= 0) {
        alt = dbase.slice(iNamed + 7);
        ep = (iCalled >= 0 && iCalled < iNamed) ? iCalled : iNamed;
    } else if (iCalled >= 0) { // :951-958
        alt = dbase.slice(iCalled + 8);
        if (supplementalHolder && inp != null) {
            const tail = strstri(String(inp), ' called ');
            if (tail) supplementalHolder.s = tail.slice(8, 8 + BUFSZ - 1);
        }
        ep = iCalled;
    } else { // :959-960 ", " fallback
        ep = dbase.indexOf(', ');
    }
    if (ep > 0) dbase = dbase.slice(0, ep); // :961-962
    // :977-981 — remove charges or "(lit)" or wizmode "(N aum)" from the
    // base description (dbase already lowered, so indexOf matches C strstri).
    const qi = dbase.indexOf(' (');
    if (qi > 0) dbase = dbase.slice(0, qi);
    if (alt) { // :967-976 article + " (" suffix off the given name
        if (alt.startsWith('a ') || alt.startsWith('the '))
            alt = alt.slice(alt.indexOf(' ') + 1);
        else if (alt.startsWith('an ')) alt = alt.slice(3);
        const pi = alt.indexOf(' (');
        if (pi > 0) alt = alt.slice(0, pi);
        alt = alt.trim();
        if (!alt) alt = null;
    }
    return { dbase, alt };
}

/**
 * C pager.c checkfile `:984–996` — alternate description when the name
 * carries no given name: the player's fruit name maps to the generic
 * slime-mold entry, else the singular of the base description.
 */
function checkfile_alt_for(dbase) {
    if (fruit_from_name(dbase, true, null)) // :990-992
        return 'slime mold'; // C obj_descr[SLIME_MOLD].oc_name
    return makesingular(dbase); // :995-996
}

/**
 * C pager.c checkfile `:829–1129` (staticfn; callers `:813` ia_checkfile,
 * `:1838` do_look `/i`, `:1853` `?`, `:1948` verbose glance — pm is NULL at
 * all four sites: do_look never assigns its pm local, only supplemental_pm
 * flows to do_screen_description).
 * Encyclopedia lookup over the embedded data.base text (Contest Rule #2:
 * dlb_fopen/fseek/fgets/fclose over the built `data` file become reads of
 * the checked-in `js/generated/dat_text.js` extract (D-0477); the key scan
 * with `~` exclusion is lookup_data_base_entry, `:1009–1040`).
 * In C order: flags (`:839–841`), data-open guard (`:845–849`), bad-buffer
 * impossible (`:851–856`), pm override + lcase (`:862–866`), prefix strips,
 * named/called split + supplemental, fruit/singular alt, the alt-first
 * two-pass pmatch loop with the pass-1 offset skip (`:998–1054`), y_n ask
 * (`:1055–1072`, `== 'y'`), NHW_MENU display (`:1073–1103`), user-typed
 * miss message (`:1104–1106`).
 * Named omissions: do_supplemental_info (`pager.c:2255`, own row — the
 * verbose-glance caller still fills supplemental_name live); dlb I/O-error
 * arms (`? Seek error`, `bad_data_file` format impossibles — no dlb over
 * embedded text).
 */
async function checkfile(inp, pm = null, chkflags = 0, supplementalHolder = null) {
    const user_typed_name = (chkflags & CHK_USR) !== 0; // :839-841 UsrTyped
    const without_asking = (chkflags & CHK_DONT_ASK) !== 0; // :840 DontAsk
    const ia_checking = (chkflags & CHK_IA_CHECK) !== 0; // :841 IaCheck
    let res = false;
    const raw = readDat('data'); // :845-849 dlb_fopen(DATAFILE, "r")
    if (!raw) {
        await pline("Cannot open 'data' file!");
        return res;
    }
    if (inp == null || String(inp).length > BUFSZ - 1) { // :851-856
        await impossible(
            'bad do_look buffer passed (%s)!', inp == null ? 'null' : 'too long');
        return res; // C goto checkfile_done (datawin == WIN_ERR)
    }
    let dbase; // :862-866 pm override unless user-typed, then lcase
    if (pm != null && !user_typed_name) {
        const mndx = typeof pm === 'number' ? pm : pm.mndx;
        dbase = lcase(pmnames[mndx]?.[NEUTRAL] ?? '');
    } else {
        dbase = lcase(String(inp));
    }
    dbase = checkfile_dbase_str(dbase); // :867-935
    if (!dbase) return res; // :938 empty name skips to checkfile_done
    const split = checkfile_split_names(dbase, inp, supplementalHolder); // :944-976
    dbase = split.dbase;
    let alt = split.alt;
    if (!alt) alt = checkfile_alt_for(dbase); // :984-996
    let pass1found_in_file = false; // :941
    let pass1Index = -1; // C pass1offset: text offset of the pass-1 entry
    for (let pass = alt !== dbase ? 1 : 0; pass >= 0; --pass) { // :998
        const q = pass ? alt : dbase;
        const hit = lookup_data_base_entry(q); // :1009-1040 key scan
        if (hit) {
            if (pass === 1) { // :1043-1046
                pass1found_in_file = true;
                pass1Index = hit.index;
            } else if (hit.index === pass1Index) { // :1047-1049
                break; // C goto checkfile_done (already shown)
            }
            let yes_to_moreinfo = false; // :1055-1072
            if (!user_typed_name && !without_asking) {
                let question = 'More info about "';
                question += q.slice(0, QBUFSZ - 1 - (question.length + 2));
                question += '"?';
                if ((await y_n(question)) === 'y') yes_to_moreinfo = true;
            }
            if (user_typed_name || without_asking || yes_to_moreinfo) { // :1073+
                res = true;
                if (ia_checking) break; // C goto checkfile_done
                // :1083-1103 NHW_MENU putstr + display (tab/space strip and
                // tabexpand already applied by the lookup parser per line).
                await show_nhw_menu_text(hit.body.map(l => l || ''));
            }
        } else if (user_typed_name && pass === 0 && !pass1found_in_file) { // :1104-1106
            await pline("You don't have any information on those things.");
        }
    }
    return res; // :1122-1128 checkfile_done
}

/**
 * C pager.c ia_checkfile `:808–815` — singular(xname) lookup with
 * chkfilIaCheck|chkfilDontAsk (offers `/` in item actions). Lookup-only:
 * shares checkfile's sync core (strip → split → fruit/singular alt →
 * alt-first two passes) with no yn prompt or menu display, matching C
 * checkfile with IaCheck (found entry → res TRUE, straight to done).
 */
export function ia_checkfile(otmp) {
    if (!otmp) return false;
    const itemnam = singular(otmp, xname);
    if (!itemnam || itemnam.length > BUFSZ - 1) return false;
    const dbase = checkfile_dbase_str(lcase(itemnam));
    if (!dbase) return false;
    const split = checkfile_split_names(dbase, itemnam, null);
    const base = split.dbase;
    const alt = split.alt || checkfile_alt_for(base);
    const queries = alt !== base ? [alt, base] : [base];
    for (const q of queries) {
        if (lookup_data_base_entry(q)) return true;
    }
    return false;
}

/**
 * C ref: pager.c look_region_nearby `:1966–1974` — `/M` nearby window is
 * u±BOLT_LIM clamped (lo_x≥1, lo_y≥0, hi≤COLNO-1/ROWNO-1), else whole map.
 * C writes through coordxy pointers in lo_y/lo_x/hi_y/hi_x order; JS takes
 * a holder object (pointer equivalent) and mutates it, returning void.
 */
export function look_region_nearby(out, nearby) {
    const u = game.u || {};
    const ux = u.ux | 0;
    const uy = u.uy | 0;
    out.lo_y = nearby ? Math.max(uy - BOLT_LIM, 0) : 0;
    out.lo_x = nearby ? Math.max(ux - BOLT_LIM, 1) : 1;
    out.hi_y = nearby ? Math.min(uy + BOLT_LIM, ROWNO - 1) : ROWNO - 1;
    out.hi_x = nearby ? Math.min(ux + BOLT_LIM, COLNO - 1) : COLNO - 1;
}

function look_region(nearby) {
    const out = {};
    look_region_nearby(out, !!nearby);
    return out;
}

/**
 * C ref: pager.c append_str `:82–106` — append " or "+new_str unless new_str
 * already occurs in buf (case-insensitive strstri). BUFSZ-capped: at most
 * BUFSZ-1 chars total; sep then truncated new_str. Returns 1 if anything
 * was appended (even a partial " or "), else 0.
 */
export function append_str(bufHolder, new_str) {
    if (strstri(bufHolder.s, new_str)) return 0;
    const oldlen = bufHolder.s.length;
    if (oldlen >= BUFSZ - 1) return 0;
    const space_left = BUFSZ - 1 - oldlen;
    const sep = ' or ';
    bufHolder.s += sep.slice(0, space_left);
    if (space_left > sep.length) {
        bufHolder.s += String(new_str).slice(0, space_left - sep.length);
    }
    return 1;
}

/** C ref: include/sym.h `:98` is_cmap_trap — trap cmap range. */
function is_cmap_trap(idx) {
    return (idx | 0) >= S_arrow_trap && (idx | 0) < S_arrow_trap + MAXTCHARS;
}

/** C ref: include/sym.h `:99` is_cmap_drawbridge — drawbridge cmap range. */
function is_cmap_drawbridge(idx) {
    return (idx | 0) >= S_vodbridge && (idx | 0) <= S_hcdbridge;
}

/** C ref: dungeon.c In_hell `:1941–1945` via dungeon.h Inhell — dungeon hellish flag. */
function Inhell_pager() {
    return !!(game.dungeons?.[game.u?.uz?.dnum | 0]?.flags?.hellish);
}

/**
 * C ref: pager.c add_cmap_descr `:1133–1245` (extracted from
 * do_screen_description) — fold one cmap defsym match into out_str.
 * C signature (found, idx, glyph, article, cc, x_str, prefix, *hit_trap,
 * **firstmatch, *out_str) returns found; JS holders ({v}/{s}) stand in for
 * the C out-pointers and are mutated in place. Branch/short-circuit order,
 * waterbody override with levl+typ save/restore and EHalluc_resistance=1,
 * "pool"→"pool"/"molten lava"→"lava" shortening, the article-suppression
 * prefix list, first-match "a trap" arm, and the hit_trap/drawbridge/
 * vibrating-square append guards are all preserved.
 */
export function add_cmap_descr(
    found, idx, glyph, article, cc, x_str, prefix, hitTrap, firstMatch, outStr,
) {
    const absidx = Math.abs(idx | 0);
    idx = idx | 0;
    glyph = glyph | 0;

    if (glyph === NO_GLYPH) {
        if (x_str === 'water') {
            if (idx === S_pool) {
                x_str = 'pool of water';
            } else if (idx === S_water) {
                x_str = !Is_waterlevel(game.u?.uz) ? 'wall of water' : 'limitless water';
            }
        }
        if (absidx === S_pool) idx = S_pool;
    } else if (
        absidx === S_pool || idx === S_water
        || idx === S_lava || idx === S_lavawall || idx === S_ice
    ) {
        const u = game.u || {};
        const loc = game.level?.at?.(cc.x, cc.y);
        const save_ltyp = loc ? loc.typ : null;
        const save_prop = u.EHalluc_resistance | 0;
        if (loc) {
            if (absidx === S_pool) {
                loc.typ = idx === S_pool ? POOL : MOAT;
                idx = S_pool;
            } else {
                loc.typ = idx === S_water ? WATER
                    : idx === S_lava ? LAVAPOOL
                    : idx === S_lavawall ? LAVAWALL
                    : ICE;
            }
        } else if (absidx === S_pool) {
            idx = S_pool;
        }
        // C grabs mon_nam(&gy.youmonst) as a scratch buffer for *firstmatch;
        // JS strings are values, so no scratch buffer is needed.
        u.EHalluc_resistance = 1;
        let mbuf = waterbody_name(cc.x, cc.y);
        u.EHalluc_resistance = save_prop;
        if (loc && save_ltyp !== null) loc.typ = save_ltyp;

        if (mbuf === 'pool of water') mbuf = 'pool';
        else if (mbuf === 'molten lava') mbuf = 'lava';
        x_str = mbuf;
        const sp = x_str.indexOf(' ');
        const iceSuffix = sp !== -1 && x_str.slice(sp).toLowerCase() === ' ice';
        article = !(
            x_str.startsWith('water')
            || x_str.startsWith('ice')
            || x_str.startsWith('pool')
            || x_str.startsWith('moat')
            || x_str.startsWith('lava')
            || x_str.startsWith('swamp')
            || x_str.startsWith('molten')
            || x_str.startsWith('shallow')
            || x_str.startsWith('limitless')
            || x_str.startsWith('wall of lava')
            || x_str.startsWith('wall of water')
            || x_str.startsWith('frozen')
            || iceSuffix
        ) ? 1 : 0;
        // C overwrites article here, so the `article === 2` arm below is dead
        // on this path per C (waterbody matches never emit "the").
    }

    if (!found) {
        if (is_cmap_trap(idx) && idx !== S_vibrating_square) {
            outStr.s = `${prefix}a trap`;
            hitTrap.v = true;
        } else {
            outStr.s = `${prefix}${article === 2 ? the(x_str) : article === 1 ? an(x_str) : x_str}`;
        }
        firstMatch.v = x_str;
        found = 1;
    } else if (
        !(hitTrap.v && is_cmap_trap(idx))
        && !(found >= 3 && is_cmap_drawbridge(idx))
        && (idx !== S_vibrating_square || Inhell_pager()
            || (glyph_is_trap(glyph) && glyph_to_trap(glyph) === VIBRATING_SQUARE))
    ) {
        found += append_str(
            outStr, article === 2 ? the(x_str) : article === 1 ? an(x_str) : x_str,
        );
        if (is_cmap_trap(idx) && idx !== S_vibrating_square) hitTrap.v = true;
    }
    return found;
}

/**
 * C ref: pager.c add_quoted_engraving `:1631–1667` — append the remembered
 * (or unread) engraving text to a " (engraving" / " (grave" look buffer.
 * bufHolder ({s}) is the C char* buf, mutated with BUFSZ strncat capping;
 * returns TRUE when text was appended. Short-circuit order preserved:
 * no-engraving → non-floor/non-grave without force → eread remembered-text
 * vs unread; caller supplies the closing paren.
 */
export function add_quoted_engraving(x, y, bufHolder, force) {
    const buf = bufHolder.s;
    const ep = engr_at(x, y);
    const floorengr = buf === ' (engraving';
    const headstone = buf === ' (grave';

    if (!ep) return false;
    if (!floorengr && !headstone && !force) return false;

    const txt = typeof ep.engr_txt === 'string'
        ? ep.engr_txt
        : (ep.engr_txt?.remembered_text ?? ep.engr_txt?.actual_text ?? '');
    let temp_buf;
    if (ep.eread) {
        temp_buf = ` with ${headstone ? 'headstone reading' : 'remembered text'}: "${txt}"`;
    } else {
        temp_buf = ` ${headstone ? 'whose headstone' : 'that'} you haven't read`;
    }
    const space = BUFSZ - bufHolder.s.length - 1;
    if (space > 0) bufHolder.s += temp_buf.slice(0, space);
    return true;
}

/**
 * C load_symset("DECGraphics") (options.c) + assign_graphics PRIMARYSET:
 * the DEC symset applies on non-rogue levels. JS records the name on
 * game.symset / _parsed_rc / flags (options.js symset display); the legacy
 * decgraphics boolean implies the same set.
 */
function decSymsActive() {
    if ((game.currentgraphics | 0) === ROGUESET) return false;
    const nm = game.symset || game._parsed_rc?.symset || game.flags?.symset;
    if (typeof nm === 'string' && nm.toLowerCase() === 'decgraphics') return true;
    return !!game.iflags?.decgraphics;
}

/**
 * C dat/symbols DECGraphics block (`:689–777`, via load_symset): cmap
 * symbol → full showsyms byte. Sessions record `OPTIONS=symset:DECgraphics`,
 * so C matches on these bytes (the stored disp_ch bytes are stripped,
 * byte & 0x7F). Monster/object/warning letters are unremapped.
 * defsym.h 89/91/92/94 are the swallow tc/ml/mr/bc rows and 97/99/101/103
 * are the explosion tc/ml/mr/bc rows (no per-row consts in js; consecutive
 * order per defsym.h PCHAR2 rows).
 */
const DEC_CMAP_BYTE = {
    [S_vwall]: 0xF8, [S_hwall]: 0xF1, [S_tlcorn]: 0xEC, [S_trcorn]: 0xEB,
    [S_blcorn]: 0xED, [S_brcorn]: 0xEA, [S_crwall]: 0xEE, [S_tuwall]: 0xF6,
    [S_tdwall]: 0xF7, [S_tlwall]: 0xF5, [S_trwall]: 0xF4, [S_ndoor]: 0xFE,
    [S_vodoor]: 0xE1, [S_hodoor]: 0xE1, [S_bars]: 0xFC, [S_tree]: 0xE7,
    [S_room]: 0xFE, [S_upladder]: 0xF9, [S_dnladder]: 0xFA,
    [S_brupladder]: 0xF9, [S_brdnladder]: 0xFA, [S_altar]: 0xFB,
    [S_pool]: 0xE0, [S_ice]: 0xFE, [S_lava]: 0xE0, [S_lavawall]: 0xE0,
    [S_vodbridge]: 0xFE, [S_hodbridge]: 0xFE, [S_water]: 0xE0,
    [S_vbeam]: 0xF8, [S_hbeam]: 0xF1,
    89: 0xEF, 91: 0xF8, 92: 0xF8, 94: 0xF3,
    97: 0xEF, 99: 0xF8, 101: 0xF8, 103: 0xF3,
};

/** C symbols.c showsyms cmap slot: DEC byte when active, else Primary. */
function cmap_showsym_code(idx) {
    if (idx === S_darkroom) {
        // C display.c map_background `:1850–1853` — showsyms[S_darkroom] is
        // rewritten at runtime: the room copy when dark_room+use_color,
        // else the SYM_NOTHING slot (DEF_NOTHING ' ').
        if ((game.flags?.dark_room !== false)
            && (game.iflags?.use_color !== false)) {
            return cmap_showsym_code(S_room);
        }
        return showsym_x_code(SYM_NOTHING, 0x20);
    }
    if (decSymsActive()) {
        const dec = DEC_CMAP_BYTE[idx];
        if (dec !== undefined) return dec;
    }
    const prim = DEFSYMS_CH[idx];
    return (typeof prim === 'string' && prim.length) ? prim.charCodeAt(0) : -1;
}

/**
 * C symbols.c get_othersym + init_showsyms SYM_OFF_X slot: option override
 * or the Primary default (NOTHING/UNEXPLORED → DEF_NOTHING ' ').
 */
function showsym_x_code(xidx, dflt) {
    const ovt = Is_rogue_level(game.u?.uz)
        ? game.go?.ov_rogue_syms : game.go?.ov_primary_syms;
    const ov = ovt?.[(xidx | 0) + SYM_OFF_X];
    if (typeof ov === 'string' && ov.length) return ov.charCodeAt(0);
    if ((ov | 0)) return ov | 0;
    return dflt;
}

/**
 * C pager.c is_swallow_sym — gs.showsyms[S_sw_tl..S_sw_br] (defsym.h
 * PCHAR2 88–95: tl,tc,tr,ml,mr,bl,bc,br). Primary `/ - \ | | \ - /`;
 * DECGraphics remaps tc→0xEF ml/mr→0xF8 bc→0xF3 (dat/symbols:689–777).
 */
function is_swallow_code(sym) {
    const dec = decSymsActive();
    switch (sym) {
    case 0x2F: case 0x5C: return true; // tl/tr/bl/br in both sets
    case 0x2D: case 0x7C: return !dec; // tc/bc/ml/mr Primary
    case 0xEF: case 0xF8: case 0xF3: return dec; // tc/ml/mr/bc DEC
    default: return false;
    }
}

/** C display.c statue/body bank peel → depicted mnum (ranges from display.js). */
function statue_body_mnum(glyph) {
    const g = glyph | 0;
    if (g >= GLYPH_STATUE_MALE_OFF && g < GLYPH_STATUE_MALE_OFF + NUMMONS) {
        return g - GLYPH_STATUE_MALE_OFF;
    }
    if (g >= GLYPH_STATUE_FEM_OFF && g < GLYPH_STATUE_FEM_OFF + NUMMONS) {
        return g - GLYPH_STATUE_FEM_OFF;
    }
    if (g >= GLYPH_STATUE_MALE_PILETOP_OFF
        && g < GLYPH_STATUE_MALE_PILETOP_OFF + NUMMONS) {
        return g - GLYPH_STATUE_MALE_PILETOP_OFF;
    }
    if (g >= GLYPH_STATUE_FEM_PILETOP_OFF
        && g < GLYPH_STATUE_FEM_PILETOP_OFF + NUMMONS) {
        return g - GLYPH_STATUE_FEM_PILETOP_OFF;
    }
    if (g >= GLYPH_BODY_OFF && g < GLYPH_BODY_OFF + NUMMONS) {
        return g - GLYPH_BODY_OFF;
    }
    if (g >= GLYPH_BODY_PILETOP_OFF && g < GLYPH_BODY_PILETOP_OFF + NUMMONS) {
        return g - GLYPH_BODY_PILETOP_OFF;
    }
    return null;
}

/**
 * C display.c map_glyphinfo ttychar for do_screen_description `:1268–1271`:
 * the showsyms byte for the glyph's symbol, as an integer code. Statues
 * resolve to the depicted monster's letter (C documents this in
 * do_screen_description `:1359–1361`); trap glyphs peel to their cmap row.
 */
function glyph_showsym_code(glyph) {
    if (glyph_is_monster(glyph)) {
        const mlet = mons(glyph_to_mon(glyph))?.mlet;
        return (mlet ? monsym({ mlet }) : '?').charCodeAt(0);
    }
    if (glyph_is_statue(glyph) || glyph_is_body(glyph)) {
        const mnum = statue_body_mnum(glyph);
        const mlet = (mnum != null) ? mons(mnum)?.mlet : null;
        if (mlet) return monsym({ mlet }).charCodeAt(0);
        return def_oc_syms[ROCK_CLASS].sym.charCodeAt(0);
    }
    if (glyph_is_normal_object(glyph) || glyph_is_piletop_generic_obj(glyph)) {
        const row = def_oc_syms[game.objects?.[glyph_to_obj(glyph)]?.oc_class];
        return (row && row.sym.length) ? row.sym.charCodeAt(0) : 0x3F;
    }
    if (glyph_is_trap(glyph)) {
        return cmap_showsym_code(((glyph | 0) - GLYPH_TRAP_OFF) + S_arrow_trap);
    }
    if (glyph_is_cmap(glyph)) return cmap_showsym_code(glyph_to_cmap(glyph));
    if (glyph_is_warning(glyph)) {
        const wch = def_warnsyms[glyph_to_warning(glyph)]?.ch;
        return (typeof wch === 'string' && wch.length) ? wch.charCodeAt(0) : 0x3F;
    }
    if (glyph_is_invisible_id(glyph)) return 0x49; // DEF_INVISIBLE 'I'
    if (glyph_is_unexplored(glyph) || glyph_is_nothing(glyph)) return 0x20; // DEF_NOTHING
    return 0x20;
}

/**
 * C windows.c encglyph as the tty renders it: the stored char through the
 * DEC→Unicode paint rule (display.js _paint_gbuf_cell, same exclusions).
 */
function rendered_glyph_char(x, y) {
    const loc = game.level?.at?.(x, y);
    let ch = (typeof loc?.disp_ch === 'string' && loc.disp_ch.length)
        ? loc.disp_ch[0] : ' ';
    if (loc?.disp_decgfx) {
        const uni = DEC_TO_UNICODE[ch];
        if (uni && ch !== '{' && ch !== '`' && ch !== 'g'
            && ch !== '|' && ch !== 'o' && ch !== 's') ch = uni;
    }
    return ch;
}

/**
 * C ref: pager.c do_screen_description `:1247–1627` — the whole symbol-table
 * description of one map cell (looked) or one queried symbol, in C order:
 * restricted vision `:1291–1305`, x_str `:1307–1325`, check_monsters
 * `:1327–1354` ('@'-as-you `:1342–1352`), objects `:1356–1404`,
 * DEF_INVISIBLE `:1406–1417`, dark room `:1419–1431`, unexplored `:1433–1445`,
 * cmap scan with the S_lava/S_lavawall/S_water rotation `:1447–1520`,
 * warnings `:1522–1542`, venom restore `:1544–1555`, option overrides with
 * check_monsters re-entry `:1554–1600`, "can be many things" `:1602–1606`,
 * didlook lookat parenthetical `:1607–1640`.
 * Holders ({s}/{v}/{pm}, the add_cmap_descr convention) stand in for the C
 * out-pointers and are mutated in place; returns the C `found` count.
 * `sym` is the C int: the full showsyms byte from glyph_showsym_code
 * (sessions run symset:DECgraphics, so wall/room/ladder bytes carry the
 * high bit and never collide with monster letters). The prefix renders the
 * glyph through the DEC→Unicode paint rule, as C's encglyph/putmixed does.
 * Named omissions: rogue_syms table (Is_rogue_level showsyms; Primary used);
 * non-boulder `go.ov_*_syms` option overrides (boulder arm live);
 * `program_state.gameover` in the hallucinate gate; the
 * `looked && sym == showsyms[SYM_*+SYM_OFF_X]` halves of the
 * dark-room/unexplored arms (subsumed by the glyph-bank sym resolution);
 * `gw.warnsyms[]` (def_warnsyms defaults stand in).
 */
export function do_screen_description(cc, looked, sym, outStr, firstMatch, forSupplement) {
    const u = game.u || {};
    const MON_INTERIOR = 'the interior of a monster';
    const UNRECONNOITERED = 'unreconnoitered';
    let glyph = NO_GLYPH;
    let skippedVenom = 0;
    let found = 0;
    let needToLook = false;
    // C `:1261–1264` — Underwater/waterlevel; Hallucination (gameover unread).
    const submerged = !!(u.Underwater && !Is_waterlevel(u.uz));
    const hallucinate = !!Hallucination();
    if (looked) {
        // C `:1268–1271` — glyph_at + map_glyphinfo ttychar (showsyms byte).
        glyph = glyph_at(cc.x, cc.y);
        sym = glyph_showsym_code(glyph);
    } else {
        sym = sym | 0;
    }
    // C `:1271/:1273` — encglyph prefix (rendered) vs `%c` prefix (raw sym).
    const prefix = `${looked ? rendered_glyph_char(cc.x, cc.y) : String.fromCharCode(sym & 0xFF)}        `;
    // C `:1291–1305` — restricted vision first.
    let xStr = null;
    const terrainmode = game.iflags?.terrainmode | 0;
    if (!looked) {
        ; // C `:1294` — skip special handling
    } else if (((u.uswallow || submerged) && !next2u_look(cc.x, cc.y))
               || ((terrainmode & (TER_DETECT | TER_MAP)) === TER_DETECT
                   && glyph === cmap_to_glyph(S_stone))) {
        xStr = UNRECONNOITERED;
        needToLook = false;
    } else if (is_swallow_code(sym)) {
        xStr = MON_INTERIOR;
        needToLook = true; // for specific monster type
    }
    if (xStr) {
        // C `:1307–1325` (found is zero here; the else arm guards future cases).
        if (!found) {
            outStr.s = `${prefix}${xStr}`;
            firstMatch.v = xStr;
            found++;
        } else {
            found += append_str(outStr, xStr);
        }
    }
    // C `:1326` check_monsters label — the option-override tail jumps back
    // here (a loop stands in for goto; the prefix is not recomputed, as in C).
    if (xStr !== UNRECONNOITERED) {
        let jumped = true;
        while (jumped) {
            jumped = false;
            // C `:1327–1341` — check for monsters.
            if (!terrainmode || (terrainmode & TER_MON) !== 0) {
                for (let i = 1; i < DEF_MONSYM_MLET.length; i++) {
                    const mlet = DEF_MONSYM_MLET[i];
                    if (mlet === 'S_invisible') continue; // avoid matching on this
                    const explain = mlet_class_explain(mlet);
                    if (sym === monsym({ mlet }).charCodeAt(0) && explain) {
                        needToLook = true;
                        if (!found) {
                            outStr.s = `${prefix}${an(explain)}`;
                            firstMatch.v = explain;
                            found++;
                        } else {
                            found += append_str(outStr, an(explain));
                        }
                    }
                }
                // C `:1342–1352` — '@' as you when your race isn't '@'.
                if ((looked ? (sym === 0x40 && u_at(cc.x, cc.y))
                            : (sym === 0x40 && !game.flags?.showrace))
                    && (game.urace?.mnum | 0) !== PM_HUMAN
                    && (game.urace?.mnum | 0) !== PM_ELF
                    && !Upolyd(u)) {
                    found += append_str(outStr, 'you');
                }
            }
            // C `:1356–1404` — check for objects.
            if (!terrainmode || (terrainmode & TER_OBJ) !== 0) {
                const ovTab = Is_rogue_level(game.u?.uz)
                    ? game.go?.ov_rogue_syms : game.go?.ov_primary_syms;
                const bj = (SYM_BOULDER | 0) + SYM_OFF_X;
                const ovCh = (ovTab?.[bj]) || 0;
                const bouldersym = (typeof ovCh === 'string' && ovCh.length)
                    ? ovCh.charCodeAt(0)
                    : def_oc_syms[ROCK_CLASS].sym.charCodeAt(0);
                for (let i = 1; i < MAXOCLASSES; i++) {
                    if ((i !== ROCK_CLASS)
                        ? (sym !== def_oc_syms[i].sym.charCodeAt(0))
                        : (!glyph_is_statue(glyph) && sym !== bouldersym)) {
                        continue;
                    }
                    let ocPtr = def_oc_syms[i].explain;
                    if (i === ROCK_CLASS && ocPtr === 'boulder or statue') {
                        if (sym === bouldersym) ocPtr = 'boulder';
                        else if (glyph_is_statue(glyph)) ocPtr = 'statue';
                        else if (looked) continue;
                    }
                    needToLook = true;
                    if (looked && i === VENOM_CLASS) {
                        skippedVenom++;
                        continue;
                    }
                    if (!found) {
                        outStr.s = `${prefix}${an(ocPtr)}`;
                        firstMatch.v = ocPtr;
                        found++;
                    } else {
                        found += append_str(outStr, an(ocPtr));
                    }
                }
            }
            // C `:1406–1417` — DEF_INVISIBLE arm ('I').
            if (sym === 0x49) {
                const usealt = ((u.EDetect_monsters | 0) & I_SPECIAL) !== 0;
                const unseen = (usealt || Blind_look())
                    ? 'unseen creature' : INVIS_EXPLAIN;
                if (!found) {
                    outStr.s = `${prefix}${an(unseen)}`;
                    firstMatch.v = unseen;
                    found++;
                } else {
                    found += append_str(outStr, an(unseen));
                }
            }
            // C `:1419–1431` — the dark part of a room: glyph bank or the
            // SYM_NOTHING showsyms slot.
            if ((glyph !== NO_GLYPH && glyph_is_nothing(glyph))
                || (looked && sym === showsym_x_code(SYM_NOTHING, 0x20))) {
                xStr = 'the dark part of a room';
                if (!found) {
                    outStr.s = `${prefix}${xStr}`;
                    firstMatch.v = xStr;
                    found++;
                } else {
                    found += append_str(outStr, xStr);
                }
            }
            // C `:1433–1445` — unexplored: glyph bank or the SYM_UNEXPLORED
            // showsyms slot.
            if ((glyph !== NO_GLYPH && glyph_is_unexplored(glyph))
                || (looked && sym === showsym_x_code(SYM_UNEXPLORED, 0x20))) {
                xStr = submerged ? 'land' : 'unexplored';
                if (!found) {
                    outStr.s = `${prefix}${xStr}`;
                    firstMatch.v = xStr;
                    found++;
                } else {
                    found += append_str(outStr, xStr);
                }
            }
            // C `:1447–1520` — graphics symbols with the water/lava rotation.
            const hitTrap = { v: false };
            for (let i = 0; i < DEFSYMS_CH.length; i++) {
                const altI = (i === S_lava) ? S_water
                    : (i === S_lavawall) ? S_lava
                    : (i === S_water) ? S_lavawall : i;
                // C `:1466–1468` `if (!*x_str) continue` — beams, shield
                // effects, swallow boundaries and explosions carry no
                // explanation (defsym.h 74–85, 88–104; 86–87 are real).
                if (altI >= S_vbeam && altI <= S_expl_br
                    && altI !== S_poisoncloud && altI !== S_goodpos) {
                    continue;
                }
                xStr = defsym_explanation(altI);
                if (!xStr) continue;
                // C `:1475` — the unlooked `/`-query path compares against
                // the Primary defsyms byte, not the DEC showsyms byte.
                const cmapByte = looked
                    ? cmap_showsym_code(altI)
                    : ((typeof DEFSYMS_CH[altI] === 'string' && DEFSYMS_CH[altI].length)
                        ? DEFSYMS_CH[altI].charCodeAt(0) : -1);
                if (sym === cmapByte) {
                    let article;
                    // C `:1480–1481` — dark room already included above.
                    if (altI === S_darkroom && glyph !== NO_GLYPH
                        && glyph_is_nothing(glyph)) {
                        continue;
                    }
                    // C `:1485–1490` — avoid "an unexplored", "an stone", ….
                    article = strstri(xStr, ' of a room') ? 2
                        : (altI === S_stone || xStr === 'air' || xStr === 'land')
                            ? 0 : 1;
                    found = add_cmap_descr(
                        found, altI, glyph, article, cc, xStr, prefix,
                        hitTrap, firstMatch, outStr,
                    );
                    if (altI === S_pool) {
                        // C `:1495–1501` — same symbol, "moat" second look.
                        add_cmap_descr(
                            found, -S_pool, glyph, 1, cc, 'moat', prefix,
                            hitTrap, firstMatch, outStr,
                        );
                        needToLook = true;
                    }
                    // C `:1503–1510` — altar/trap/hallu-water/engraving/grave.
                    if (altI === S_altar || is_cmap_trap(altI)
                        || (hallucinate && (altI === S_water || altI === S_lava
                            || altI === S_lavawall || altI === S_ice))
                        || altI === S_engroom || altI === S_engrcorr
                        || altI === S_grave) {
                        needToLook = true;
                    }
                }
            }
            // C `:1522–1542` — warning symbols.
            for (let i = 1; i < WARNCOUNT; i++) {
                const w = def_warnsyms[i];
                const wch = w?.ch ?? w?.sym;
                if (typeof wch === 'string' && wch.length
                    && sym === wch.charCodeAt(0)) {
                    xStr = w?.desc || w?.explanation
                        || 'unknown creature causing you worry';
                    if (!found) {
                        outStr.s = `${prefix}${xStr}`;
                        firstMatch.v = xStr;
                        found++;
                    } else {
                        found += append_str(outStr, xStr);
                    }
                    // C `:1536–1539` — warning trumps boulders on display.
                    if (looked && sobj_at(BOULDER_OTYP, cc.x, cc.y)) {
                        outStr.s += ' co-located with a boulder';
                    }
                    break;
                }
            }
            // C `:1544–1555` — ignored venom goes back on a short list.
            if (skippedVenom && found < 2) {
                xStr = def_oc_syms[VENOM_CLASS].explain;
                if (!found) {
                    outStr.s = `${prefix}${an(xStr)}`;
                    firstMatch.v = xStr;
                    found++;
                } else {
                    found += append_str(outStr, an(xStr));
                }
            }
            // C `:1554–1600` — optional overriding symbols (#if 0 boulder
            // arm is compiled out upstream). A match re-enters at
            // check_monsters; only jump when sym actually changes (C changes
            // it by construction; this guards the JS stand-ins).
            for (let j = SYM_OFF_X; j < SYM_MAX; j++) {
                if (j === (SYM_INVISIBLE | 0) + SYM_OFF_X
                    || j === (SYM_BOULDER | 0) + SYM_OFF_X) {
                    continue; // already handled above
                }
                const ovt = Is_rogue_level(game.u?.uz)
                    ? game.go?.ov_rogue_syms : game.go?.ov_primary_syms;
                const ovs = (ovt?.[j]) || 0;
                const tmpsym = (typeof ovs === 'string' && ovs.length)
                    ? ovs.charCodeAt(0) : 0;
                if (tmpsym && sym === tmpsym) {
                    if (j === (SYM_PET_OVERRIDE | 0) + SYM_OFF_X) {
                        if (looked) {
                            // C `:1584–1590` — re-resolve without override
                            // (MG_FLAG_NOOVERRIDE): the pet's class letter.
                            const mtmp = mon_at(cc.x, cc.y);
                            const under = mtmp
                                ? monsym(mtmp).charCodeAt(0) : sym;
                            if (under !== sym) {
                                sym = under;
                                jumped = true;
                            }
                        }
                        break;
                    }
                    if (j === (SYM_HERO_OVERRIDE | 0) + SYM_OFF_X) {
                        // C `:1592–1595` — the human class symbol.
                        if (sym !== 0x40) {
                            sym = 0x40;
                            jumped = true;
                        }
                        break;
                    }
                }
            }
        }
        // C `:1602–1606` — more than four possibilities.
        if (found > 4) {
            outStr.s = `${prefix}can be many things`;
        }
    }
    // C `:1607` didlook.
    if (looked) {
        let pm = null;
        if (found > 1 || needToLook) {
            // C `:1609–1615` — lookat fills look_buf/monbuf.
            const seen = lookat(cc.x, cc.y);
            let lookBuf = seen.buf;
            pm = seen.pm;
            if (pm && forSupplement) forSupplement.pm = pm;
            // C `:1616–1617` — ice wording.
            if (lookBuf === 'ice') lookBuf = ice_descr(cc.x, cc.y);
            // C `:1618–1620` — quest-blocked downstairs.
            lookBuf = maybe_blocked_staircase_down(lookBuf);
            // C `:1622–1632` — firstmatch becomes look_buf; engraving quoted.
            if (lookBuf) firstMatch.v = lookBuf;
            if (firstMatch.v) {
                const tmpH = { s: ` (${firstMatch.v}` };
                add_quoted_engraving(cc.x, cc.y, tmpH, false);
                tmpH.s += ')';
                outStr.s = (outStr.s + tmpH.s).slice(0, BUFSZ - 1);
                found = 1; // we have something to look up
            }
            // C `:1633–1639` — seen-monster suffix.
            if (seen.monbuf) {
                outStr.s = (outStr.s + ` [seen: ${seen.monbuf}]`)
                    .slice(0, BUFSZ - 1);
            }
        }
    }
    return found;
}

/** C youprop.h Blind ≡ (HBlinded || EBlinded) && !BBlinded. */
function Blind_look() {
    const u = game.u || {};
    if (u.uroleplay?.blind) return true;
    return !!(((u.HBlinded | 0) || (u.EBlinded | 0)) && !(u.BBlinded | 0));
}

/** C you.h next2u — distu <= 2 (orthogonal or diagonal adjacent, or self). */
function next2u_look(x, y) {
    const u = game.u || {};
    const dx = (x | 0) - (u.ux | 0);
    const dy = (y | 0) - (u.uy | 0);
    return dx * dx + dy * dy <= 2;
}

/** C monst.h is_obj_mappear — M_AP_TYPE (masked) == M_AP_OBJECT. */
function is_obj_mappear_look(mon, otyp) {
    return ((mon?.m_ap_type | 0) & M_AP_TYPMASK) === M_AP_OBJECT
        && (mon.mappearance | 0) === (otyp | 0);
}

/**
 * C ref: pager.c object_from_map `:284–377`.
 * JS has no integer glyph ids; callers pass glyphotyp (C glyph_to_obj).
 * cmap trapped-chest CHEST|LARGE_BOX, glyph_is_body / glyph_is_statue
 * corpsenm from glyph id named. Returns { fakeobj, otmp }.
 */
export function object_from_map(glyphotyp, x, y) {
    const otyp = glyphotyp | 0;
    let fakeobj = false;
    let mimic_obj = false;
    let otmp = sobj_at(otyp, x, y);
    if (!otmp) {
        for (let b = game.level?.buriedobjlist || null; b; b = b.nobj) {
            if ((b.ox | 0) === (x | 0) && (b.oy | 0) === (y | 0)
                && (b.otyp | 0) === otyp) {
                otmp = b;
                break;
            }
        }
    }

    let mtmp = mon_at(x, y);
    if (mtmp && is_obj_mappear_look(mtmp, otyp)) {
        otmp = null;
        mimic_obj = true;
    } else {
        mtmp = null;
    }

    if (!otmp || (otmp.otyp | 0) !== otyp) {
        // C OBJ_NAME(objects[glyphotyp]) — oc_name; JS objectNameStrs
        // is null for shuffled-out extra types (SC01 / WAN1…).
        if (objectNameStrs[otyp]) {
            otmp = mksobj(otyp, false, false);
        } else {
            const oclass = game.objects?.[otyp]?.oc_class | 0;
            otmp = mkobj(oclass, false);
        }
        if (otmp?.timed) obj_stop_timers(otmp);
        fakeobj = true;
        if ((otmp.oclass | 0) === COIN_CLASS) {
            otmp.quan = 2;
        } else if ((otmp.otyp | 0) === SLIME_MOLD) {
            // C: give it a type — mksobj(init=FALSE) left spe 0
            otmp.spe = game.context?.current_fruit | 0;
        }
        if (mtmp && has_mcorpsenm(mtmp)) {
            if ((otmp.otyp | 0) === SLIME_MOLD) {
                // C: override current_fruit so look stays stable if fruit
                // option changes after the mimic appeared
                otmp.spe = MCORPSENM(mtmp) | 0;
            } else {
                otmp.corpsenm = MCORPSENM(mtmp) | 0;
            }
        }
        // glyph_is_body / glyph_is_statue corpsenm named (no integer glyphs)
        if ((otmp.otyp | 0) === LEASH) {
            otmp.leashmon = 0;
        }
        otmp.where = OBJ_FLOOR;
        otmp.ox = x | 0;
        otmp.oy = y | 0;
        otmp.no_charge = ((otmp.otyp | 0) === STRANGE_OBJECT
            && costly_spot(x, y)) ? 1 : 0;
    }
    if (otmp && next2u_look(x, y) && !Blind_look() && !Hallucination()
        && (fakeobj || (otmp.where | 0) === OBJ_FLOOR)
        && !(game.iflags?.terrainmode | 0)) {
        observe_object(otmp);
    }
    if (fakeobj && mtmp && mimic_obj && otmp
        && (otmp.dknown
            || ((mtmp.m_ap_type | 0) & M_AP_F_DKNOWN))) {
        mtmp.m_ap_type = (mtmp.m_ap_type | 0) | M_AP_F_DKNOWN;
        observe_object(otmp);
    }
    return { fakeobj, otmp: otmp || null };
}

/**
 * C ref: pager.c look_at_object `:380–399`.
 * Callers: lookat / look_all / getpos auto_describe + brief_at (D-1547).
 * C `:390–391` picks doname_with_price when dknown, doname_vague_quan
 * otherwise (farlook "some gold pieces").
 * Tree suffix named (needs is_treefruit for dangling vs stuck).
 */
export function look_at_object(x, y, glyphotyp) {
    const { fakeobj, otmp } = object_from_map(glyphotyp, x, y);
    let buf = 'something';
    if (otmp) {
        buf = ((otmp.otyp | 0) !== STRANGE_OBJECT)
            ? distant_name(otmp,
                otmp.dknown ? doname_with_price : doname_vague_quan)
            : (objectNameStrs[STRANGE_OBJECT] || 'strange object');
        if (fakeobj) {
            // C: object_from_map set OBJ_FLOOR; never placed on fobj
            otmp.where = OBJ_FREE;
        }
    }
    if (otmp && !fakeobj) {
        // C ref: pager.c look_at_object `:388–399` — buried/embedded
        // suffixes read the looked cell. The tree arm stays named
        // (needs is_treefruit for dangling vs stuck); fakes take no
        // suffix (C deallocs the fake, so otmp is NULL below).
        const typ = game.level?.at?.(x, y)?.typ | 0;
        if ((otmp.where | 0) === OBJ_BURIED) buf += ' (buried)';
        else if (typ === STONE || typ === SCORR) buf += ' embedded in stone';
        else if (IS_WALL(typ) || typ === SDOOR) buf += ' embedded in a wall';
        else if (closed_door(x, y)) buf += ' embedded in a door';
        else if (is_pool(x, y)) buf += ' in water';
        else if (is_lava(x, y)) buf += ' in molten lava';
    }
    return buf;
}

/** C monst.h M_AP_TYPE — mask F_DKNOWN. */
function hidden_ap_type(mon) {
    return (mon?.m_ap_type | 0) & M_AP_TYPMASK;
}

/** C pager.c: mon == &gy.youmonst. */
function hidden_isyou(mon) {
    return !!(mon && (mon._youmonst || mon === game.youmonst));
}

/**
 * C pager.c mhidden_description glyph pick: hero_memory && !isyou →
 * levl.glyph (remembered otyp), else glyph_at (gbuf). JS has no integer
 * glyph ids; remembered_glyph.otyp / glyph_to_obj_at stand in for
 * glyph_is_object + glyph_to_obj.
 */
function hidden_object_glyphotyp(x, y, isyou) {
    const loc = game.level?.at?.(x, y);
    if (!loc) return -1;
    const heroMem = game.level?.flags?.hero_memory !== false;
    if (heroMem && !isyou) {
        const rg = loc.remembered_glyph;
        if (rg && !rg.invisible && rg.otyp != null && (rg.otyp | 0) >= 0) {
            return rg.otyp | 0;
        }
        return -1;
    }
    return glyph_to_obj_at(x, y);
}

/**
 * C pager.c objfrommap label inside mhidden_description.
 * fakeobj: object_from_map set OBJ_FLOOR; free via OBJ_FREE (GC; no
 * dealloc_obj clone).
 */
function hidden_objfrommap(incl_article, glyphotyp, x, y) {
    const { fakeobj, otmp } = object_from_map(glyphotyp, x, y);
    let what = (otmp && (otmp.otyp | 0) !== STRANGE_OBJECT)
        ? simpleonames(otmp)
        : (objectNameStrs[STRANGE_OBJECT] || 'strange object');
    if (incl_article && (!otmp || (otmp.quan | 0) === 1)) {
        what = an(what);
    }
    if (fakeobj && otmp) {
        otmp.where = OBJ_FREE;
    }
    return what;
}

/**
 * C ref: pager.c mhidden_description `:184–280`.
 * Returns the suffix C writes into outbuf (callers append).
 * Callers: self_lookat / look_at_monster; insight mstatusline;
 * makemon appear; uhitm flash_hits_mon.
 * Named: dungeon.c surface ice/pool/altar/swallow (trapper uses
 * "floor"); long-worm tail coords (C FIXME); glyph_is_cmap region
 * ids (JS string 'S_poisoncloud').
 */
export function mhidden_description(mon, mhid_flags) {
    if (!mon) return '';
    const incl_prefix = (mhid_flags & MHID_PREFIX) !== 0;
    const incl_article = (mhid_flags & MHID_ARTICLE) !== 0;
    const show_altmon = (mhid_flags & MHID_ALTMON) !== 0;
    const force_region = (mhid_flags & MHID_REGION) !== 0;
    const isyou = hidden_isyou(mon);
    const u = game.u || {};
    const x = isyou ? (u.ux | 0) : (mon.mx | 0);
    const y = isyou ? (u.uy | 0) : (mon.my | 0);
    const ap = hidden_ap_type(mon);
    const ptr = mon.data;
    // C: one glyph pick (memory vs glyph_at); glyph_is_object ≡ otyp>=0
    const gtyp = hidden_object_glyphotyp(x, y, isyou);
    let outbuf = '';

    if (ap === M_AP_FURNITURE || ap === M_AP_OBJECT) {
        if (incl_prefix) outbuf = ', mimicking ';
        if (ap === M_AP_FURNITURE) {
            let what = defsym_explanation(mon.mappearance | 0);
            if (incl_article) what = an(what);
            outbuf += what;
        } else if (ap === M_AP_OBJECT && gtyp >= 0) {
            outbuf += hidden_objfrommap(incl_article, gtyp, x, y);
        } else {
            outbuf += 'something';
        }
    } else if (ap === M_AP_MONSTER) {
        if (show_altmon) {
            if (incl_prefix) outbuf += ', masquerading as ';
            let what = pmname(mon.mappearance | 0,
                mon.female ? FEMALE : MALE);
            // C: article follows incl_prefix, not incl_article
            if (incl_prefix) what = an(what);
            outbuf += what;
        }
    } else if (isyou ? u.uundetected : mon.mundetected) {
        outbuf = ', hiding';
        if (hides_under(ptr)) {
            outbuf += ' under ';
            if (gtyp >= 0) {
                outbuf += hidden_objfrommap(incl_article, gtyp, x, y);
            } else {
                outbuf += 'something';
            }
        } else if (is_hider(ptr)) {
            // C ceiling_hider macro — inline, no fourth named clone.
            const ceil = (is_clinger(ptr) && ptr.mlet !== 'S_MIMIC')
                || is_flyer(ptr);
            // C surface() ice/pool/altar/swallow named; trapper floor.
            outbuf += ` on the ${ceil ? 'ceiling' : 'floor'}`;
        } else if (ptr?.mlet === 'S_EEL' && is_pool(x, y)) {
            outbuf += ' in murky water';
        }
    }

    const reg = visible_region_at(x, y);
    if (reg) {
        const xr = u.xray_range | 0;
        const r = xr > 1 ? xr : 1;
        const dx = (x | 0) - (u.ux | 0);
        const dy = (y | 0) - (u.uy | 0);
        if (dx * dx + dy * dy <= r * (r + 1) || force_region) {
            const poison = reg.glyph === 'S_poisoncloud';
            outbuf += `, in a cloud of ${poison ? 'poison gas' : 'vapor'}`;
        }
    }
    return outbuf;
}

/**
 * C pager.c invisexplain — remembered unseen creature (lookat `:727`).
 */
const INVIS_EXPLAIN = 'remembered, unseen, creature';

/**
 * C ref: pager.c lookat `:656–802`.
 * Fills firstmatch for auto_describe / whatis getpos (do_screen_description
 * overwrites firstmatch with this buf when found>1 || need_to_look).
 * Glyph-first: GLYPH_UNEXPLORED → "unexplored area"; cmap S_stone +
 * !seenv → "unexplored"; other cmap default is defsyms[].explanation
 * (S_room / S_darkroom have no special cases — DARKROOMSYM is newsym).
 * Returns { buf, monbuf, pm }.
 */
export function lookat(x, y) {
    const u = game.u || {};
    let buf = '';
    let monbuf = '';
    let pm = null;
    const glyph = glyph_at(x, y);
    const terrainmode = game.iflags?.terrainmode | 0;
    const save_uswallow = !!(game.iflags?.save_uswallow);

    if (
        u_at(x, y) && canspotself()
        && !(save_uswallow
            && u.ustuck
            && glyph === mon_to_glyph(u.ustuck, rn2_on_display_rng))
        && (!terrainmode || (terrainmode & TER_MON) !== 0)
    ) {
        buf = self_lookat();
        /* file lookup can't distinguish "gnomish wizard" vs the role */
        if (
            (game.urole?.mnum | 0) === PM_WIZARD
            && (game.urace?.mnum | 0) === PM_GNOME
            && !Upolyd(u)
        ) {
            pm = mons(PM_WIZARD);
        }
        if (
            (hero_Invisible() || u.uundetected)
            && !Blind_look()
            && !(u.uswallow || save_uswallow)
        ) {
            let how = 0;
            if ((u.HInfravision | 0) || (u.EInfravision | 0) || u.Infravision) {
                how |= 1;
            }
            if ((u.ETelepat | 0) || u.Unblind_telepat) how |= 2;
            if (
                (u.HDetect_monsters | 0)
                || (u.EDetect_monsters | 0)
                || u.Detect_monsters
            ) {
                how |= 4;
            }
            if (how) {
                buf += ` [seen: ${how & 1 ? 'infravision' : ''}${
                    (how & 3) > 2 ? ', ' : ''}${
                    how & 2 ? 'telepathy' : ''}${
                    (how & 7) > 4 ? ', ' : ''}${
                    how & 4 ? 'monster detection' : ''}]`;
            }
        }
    } else if (u.uswallow) {
        buf = `interior of ${mon_nam(u.ustuck)}`;
        pm = u.ustuck?.data || null;
    } else if (glyph_is_monster(glyph)) {
        const mtmp = mon_at(x, y);
        if (mtmp) {
            // C lookat `:710` — look_at_monster(buf, monbuf, mtmp, x, y).
            const seen = look_at_monster(mtmp, x, y);
            buf = seen.buf;
            monbuf = seen.monbuf;
            pm = mtmp.data || null;
        } else if (Hallucination()) {
            buf = rndmonnam(null);
        }
    } else if (glyph_is_object(glyph)) {
        buf = look_at_object(x, y, glyph_to_obj(glyph));
    } else if (glyph_is_trap(glyph)) {
        buf = trap_description(glyph_to_trap(glyph), x, y);
    } else if (glyph_is_warning(glyph)) {
        const warnindx = glyph_to_warning(glyph);
        buf = def_warnsyms[warnindx]?.desc
            || def_warnsyms[warnindx]?.explanation
            || 'unknown creature causing you worry';
    } else if (glyph_is_invisible_id(glyph)) {
        buf = INVIS_EXPLAIN;
    } else if (glyph_is_nothing(glyph)) {
        buf = 'dark part of a room';
    } else if (glyph_is_unexplored(glyph)) {
        if (u.Underwater && !Is_waterlevel(u.uz)) {
            buf = next2u_look(x, y) ? 'land' : 'unknown';
        } else {
            buf = 'unexplored area';
        }
    } else if (glyph_is_cmap(glyph)) {
        const loc = game.level?.at?.(x, y);
        const symidx = glyph_to_cmap(glyph);
        switch (symidx) {
        case S_altar: {
            const amsk = altarmask_at(x, y);
            const algn = Amask2align(amsk & AM_MASK);
            const high = (amsk & AM_SANCTUM) ? 'high ' : '';
            const aligned = (Is_astralevel(u.uz) && !next2u_look(x, y)
                && (amsk & AM_SANCTUM))
                ? 'aligned'
                : align_str(algn);
            buf = `${aligned} ${high}altar`;
            break;
        }
        case S_ndoor:
            if (is_drawbridge_wall(x, y) >= 0) {
                buf = 'open drawbridge portcullis';
            } else if (((loc?.doormask | 0) & ~D_TRAPPED) === D_BROKEN) {
                buf = 'broken door';
            } else {
                buf = 'doorway';
            }
            break;
        case S_cloud:
            buf = Is_airlevel(u.uz) ? 'cloudy area' : 'fog/vapor cloud';
            break;
        case S_pool:
        case S_water:
        case S_lava:
        case S_lavawall:
        case S_ice:
            buf = waterbody_name(x, y);
            break;
          case S_engroom:
          case S_engrcorr:
              buf = 'engraving';
              break;
          case S_stone:
            if (!loc?.seenv) {
                buf = 'unexplored';
                break;
            } else if (u.Underwater && !Is_waterlevel(u.uz)) {
                buf = next2u_look(x, y) ? 'land' : 'unknown';
                break;
            } else if ((loc?.typ | 0) === STONE || (loc?.typ | 0) === SCORR) {
                buf = 'stone';
                break;
            }
            /* FALLTHROUGH — remembered S_stone on other typ */
            buf = defsym_explanation(symidx);
            break;
        default:
            buf = defsym_explanation(symidx);
            break;
        }
    } else {
        buf = 'unexplored area';
    }
    return {
        buf,
        monbuf,
        pm: (pm && !Hallucination()) ? pm : null,
    };
}

/**
 * C ref: getpos.c auto_describe — prints firstmatch after
 * do_screen_description(+lookat), not the full out_str / dfeature_at.
 * Stairs: DECgraphics showsyms keep '<'/'>' for stairs while ladders use
 * ≤/≥, so cmap match is ordinary+branch staircase only; lookat overwrites
 * firstmatch with S_br* / S_*stair explanation.
 *
 * C do_screen_description didlook: blocked-staircase rewrite after lookat.
 */
function brief_at(x, y) {
    const { buf } = lookat(x, y);
    return maybe_blocked_staircase_down(buf);
}

/**
 * C ref: pager.c is_swallow_sym — gs.showsyms[S_sw_tl..S_sw_br].
 * Full showsyms table deferred; match dat/symbols DECgraphics overrides
 * (tc/ml/mr/bc) plus Primary defaults for unset swallow corners.
 */
function is_swallow_sym(c) {
    if (c == null || c === '') return false;
    if (game.iflags?.decgraphics) {
        // DEC: S_sw_ml/mr \xf8→'x', S_sw_tc \xef→'o', S_sw_bc \xf3→'s';
        // corners keep Primary '/' '\'.
        return c === 'x' || c === 'o' || c === 's' || c === '/' || c === '\\';
    }
    // Primary defsym.h: / - \ | | \ - /
    return c === '|' || c === '-' || c === '/' || c === '\\';
}

/**
 * C ref: pager.c look_all `:1979–2074` — NHW_TEXT list of the monsters or
 * objects currently shown, driven by glyph_at + glyph class in C order:
 * monster glyph → self_lookat under u_at && canspotself (`:1998–2000`),
 * else m_at → look_at_monster buf half (`:2001–2003`, NULL monbuf);
 * invisible glyph → invisexplain (`:2005–2008`); warning glyph →
 * def_warnsyms explanation (`:2009–2013`, JS shape `.desc`/`.ch`); object
 * glyph → look_at_object via glyph_to_obj (`:2016–2018`, C object_from_map's
 * glyphotyp). Header (`:2026–2042`) uses upstart + coord_desc(u) with the
 * compass canspotself "your position"/"you" split; per-line prefix
 * (`:2043–2063`) is the width-formatted coord (MAP y<10 kitten) + shown
 * char (C encglyph of the displayed glyph; JS gbuf is disp_ch, D-1767)
 * with the BUFSZ truncation guard. Window via show_text_pages (NHW_TEXT
 * idiom, like look_traps/look_engrs). Compass-full coord text stays
 * deferred (local coord_desc).
 */
async function look_all(nearby, do_mons) {
    const { lo_x, lo_y, hi_x, hi_y } = look_region(nearby); // C :1989
    const lines = [];
    let count = 0; // C :1984
    const u = game.u || {};
    const cmode = look_getpos_cmode(); // C :2024-2025
    for (let y = lo_y; y <= hi_y; y++) {
        for (let x = lo_x; x <= hi_x; x++) {
            let lookbuf = ''; // C :1992 lookbuf[0] = '\0'
            let glyphCh = '';
            const glyph = glyph_at(x, y); // C :1993
            const shownCh = game.level?.at?.(x, y)?.disp_ch || '';
            if (do_mons) { // C :1994
                if (glyph_is_monster(glyph)) { // C :1995
                    if (u_at(x, y) && canspotself()) { // C :1998
                        lookbuf = self_lookat(); // C :1999
                        glyphCh = shownCh || '@';
                        ++count; // C :2000
                    } else { // C :2001
                        const mtmp = mon_at(x, y);
                        if (mtmp) {
                            // C :2002 — look_at_monster(lookbuf, NULL,
                            // mtmp, x, y); NULL monbuf, so buf half only.
                            lookbuf = look_at_monster_buf(mtmp, x, y);
                            glyphCh = shownCh || '?';
                            ++count; // C :2003
                        }
                    }
                } else if (glyph_is_invisible_id(glyph)) { // C :2005
                    // C :2007 invisexplain "remembered, unseen, creature"
                    lookbuf = 'remembered, unseen, creature';
                    glyphCh = shownCh || 'I';
                    ++count; // C :2008
                } else if (glyph_is_warning(glyph)) { // C :2009
                    const warnindx = glyph_to_warning(glyph); // C :2010
                    lookbuf = def_warnsyms[warnindx].desc; // C :2012 .explanation
                    glyphCh = shownCh || def_warnsyms[warnindx].ch || '?';
                    ++count; // C :2013
                }
            } else if (glyph_is_object(glyph)) { // C :2015-2016 !do_mons
                const otyp = glyph_to_obj(glyph); // C :2017 via glyphotyp
                lookbuf = look_at_object(x, y, otyp);
                glyphCh = shownCh || '?';
                ++count; // C :2018
            }
            if (lookbuf) { // C :2021
                if (count === 1) { // C :2026
                    const which = do_mons ? 'monsters' : 'objects'; // C :2027
                    if (nearby) {
                        const where = cmode !== GPCOORDS_COMPASS // C :2031
                            ? coord_desc(u.ux, u.uy, cmode).replace(/ $/, '')
                            : !canspotself() ? 'your position' : 'you'; // C :2033
                        lines.push( // C :2029-2030
                            `${upstart(which)} currently shown near ${where}:`,
                        );
                    } else {
                        lines.push( // C :2035-2036
                            `All ${which} currently shown on the map:`,
                        );
                    }
                    lines.push('    '); // C :2041 separator
                }
                const prefix = look_coord_prefix(x, y, cmode); // C :2043-2058
                const head = `${prefix}${glyphCh}  `; // C :2055-2059
                // C :2061 guard against potential overflow
                const maxLook = BUFSZ - 1 - head.length;
                if (lookbuf.length > maxLook) {
                    lookbuf = lookbuf.slice(0, Math.max(maxLook, 0));
                }
                lines.push(`${head}${lookbuf}`); // C :2062-2063
            }
        }
    }
    if (count) { // C :2067
        await show_text_pages(lines, { moreAtEnd: true }); // C :2068
    } else { // C :2069-2072
        await pline(
            `No ${do_mons ? 'monsters' : 'objects'} are currently shown ${
                nearby ? 'nearby' : 'on the map'
            }.`,
        );
    }
}

/**
 * C ref: pager.c look_traps `:2077–2141` — `/t` (`nearby`) / `/T` (level)
 * list of seen or remembered traps. The map glyph gets first refusal:
 * `glyph_is_trap(glyph_at(x, y))` → `tnum = glyph_to_trap(glyph)` →
 * `trap_description` — a detected trapped chest or door has a trap glyph
 * but no `ftrap` entry, so only the glyph path names it (and only that
 * path can burn the Hallucination `rn2(20)`). Otherwise a `tseen` `t_at`
 * trap (skipped on water/air levels unless `couldsee`, for traps moved
 * by bubbles or clouds) prints `trapname` + ", obscured by <covering
 * glyph>", with the glyph re-pointed at `trap_to_glyph(t)`.
 * `encglyph` has no JS table (glyphmap[] deferred), so the covering char
 * follows `look_engrs`: hero/mon/obj char, else the cell's shown char;
 * the trap char comes from `trap_to_glyph`, the same defsym table C's
 * `encglyph` reads. `lookbuf` is capped so prefix + text fit BUFSZ (C
 * `lookbuf[sizeof lookbuf - 1 - strlen(outbuf)] = '\0'`). Header is
 * `upstart` (hacklib.c) + the `"    "` separator, like `look_all`.
 * Named: `doidtrap` (the `^` single-cell command, C `:2335+`).
 */
async function look_traps(nearby) {
    const { lo_x, lo_y, hi_x, hi_y } = look_region(nearby);
    const u = game.u || {};
    const cmode = look_getpos_cmode();
    const onWaterAir = Is_waterlevel(u.uz) || Is_airlevel(u.uz);
    let count = 0;
    const lines = [];
    for (let y = lo_y; y <= hi_y; y++) {
        for (let x = lo_x; x <= hi_x; x++) {
            let lookbuf = '';
            let glyphCh = '';
            const glyph = glyph_at(x, y);
            if (glyph_is_trap(glyph)) {
                const tnum = glyph_to_trap(glyph);
                lookbuf = trap_description(tnum, x, y);
                glyphCh = trap_to_glyph({ ttyp: tnum }).ch || '^';
                count++;
            } else {
                const t = t_at(x, y);
                if (t && t.tseen && (!onWaterAir || couldsee(x, y))) {
                    // C `", obscured by %s", encglyph(glyph)` — covering glyph
                    const shown = look_shown_at(x, y);
                    let coverCh = '';
                    if (shown?.kind === 'hero') coverCh = '@';
                    else if (shown?.kind === 'mon') {
                        coverCh = mon_glyph(shown.mtmp).ch || '?';
                    } else if (shown?.kind === 'obj') {
                        coverCh = obj_glyph(shown.obj).ch || '?';
                    } else {
                        coverCh = game.level?.at?.(x, y)?.disp_ch || '?';
                    }
                    lookbuf = `${trapname(t.ttyp, false)}, obscured by ${coverCh}`;
                    glyphCh = trap_to_glyph(t).ch || '^';
                    count++;
                }
            }
            if (lookbuf) {
                if (count === 1) {
                    const title =
                        `${nearby ? 'nearby ' : ''}seen or remembered traps${
                            nearby ? '' : ' on this level'
                        }:`;
                    lines.push(title.replace(/^./, c => c.toUpperCase()));
                    lines.push('    ');
                }
                const prefix = look_coord_prefix(x, y, cmode);
                const head = `${prefix}${glyphCh}  `;
                // C BUFSZ guard: outbuf already holds prefix + glyph
                const maxLook = BUFSZ - 1 - head.length;
                if (lookbuf.length > maxLook) {
                    lookbuf = lookbuf.slice(0, Math.max(maxLook, 0));
                }
                lines.push(`${head}${lookbuf}`);
            }
        }
    }
    if (count) {
        await show_text_pages(lines, { moreAtEnd: true });
    } else {
        await pline(
            `No traps seen or remembered${nearby ? ' nearby' : ''}.`,
        );
    }
}

/**
 * C ref: pager.c look_engrs `:2144–2228` — `/e` (nearby) / `/E` (level)
 * list of seen or remembered engravings, in C order. NHW_TEXT window
 * (`:2154`; JS `show_text_pages`, the D-2508 look_all idiom);
 * `look_region_nearby` window (`:2155`); per-cell `seenv` gate
 * (`:2159–2161`); `engr_at` (`:2166–2168`, no fallback scan for
 * remembered-but-gone engravings per `:2162–2165`); headstone via
 * `IS_GRAVE(svl.lastseentyp[x][y])` (`:2169`, JS `game.lastseentyp`);
 * `" (grave"` / `" (engraving"` prefix (`:2170`) + `add_quoted_engraving`
 * (`:2171`, force TRUE); the paren-stripping `strsubst` rewrites
 * (`:2174–2180`); `glyph_at` + cmap→`SYM_NOTHING` (`:2182–2183`); shown
 * (`is_cmap_engraving(sym) || sym == S_grave`, `sym.h:108`, `:2184–2186`)
 * vs covered (`", obscured by <covering>"` + re-point at
 * `cmap_to_glyph(S_grave)` / `engraving_to_glyph(e)` =
 * `cmap_to_glyph` of the CORR/room defsym, `display.h`, `:2187–2193`);
 * `upstart` header + `"    "` separator (`:2200–2208`); coord prefix
 * (`%s/%8s/%12s` via `look_coord_prefix`, `:2210–2214`) + rendered glyph
 * char (`%s ` via `encglyph` as the tty renders it — `rendered_glyph_char`
 * for the live map glyph, `glyph_showsym_code` for the re-pointed one,
 * `:2215`); BUFSZ guard (`:2216–2218`); `display_nhwindow` vs
 * `pline("No engravings...")` (`:2223–2227`).
 * Callers `pager.c:1878/1881` → `dowhatis` `e`/`E` arms below.
 */
async function look_engrs(nearby) {
    const region = {}; // C :2155 look_region_nearby(&lo_x, &lo_y, &hi_x, &hi_y)
    look_region_nearby(region, nearby);
    const { lo_x, lo_y, hi_x, hi_y } = region;
    const lines = [];
    let count = 0; // C :2152
    const cmode = look_getpos_cmode(); // C :2198-2199 (helper: iflags or MAP)
    for (let y = lo_y; y <= hi_y; y++) { // C :2157
        for (let x = lo_x; x <= hi_x; x++) { // C :2158
            let lookbuf = ''; // C :2159 lookbuf[0] = '\0'
            if (!game.level?.at?.(x, y)?.seenv) continue; // C :2160-2161
            const e = engr_at(x, y); // C :2166
            if (!e) continue; // C :2167-2168
            const is_headstone = IS_GRAVE(game.lastseentyp?.[x]?.[y] | 0); // C :2169
            const quoted = { s: is_headstone ? ' (grave' : ' (engraving' }; // C :2170
            add_quoted_engraving(x, y, quoted, true); // C :2171 (void) TRUE
            lookbuf = quoted.s;
            /* C :2172-2173 — the paren is farlook's, not ours */
            if (is_headstone) { // C :2174
                lookbuf = strsubst(lookbuf, '(grave with ', ''); // C :2175
                lookbuf = strsubst(lookbuf, '(grave whose ', ''); // C :2176
            } else { // C :2177
                lookbuf = strsubst(lookbuf, '(engraving with ', ''); // C :2178
                lookbuf = strsubst(lookbuf, '(engraving ', 'engraving '); // C :2179
            }

            let glyph = glyph_at(x, y); // C :2182
            const sym = glyph_is_cmap(glyph) ? glyph_to_cmap(glyph) : SYM_NOTHING; // C :2183
            let glyphCh;
            if (sym === S_engroom || sym === S_engrcorr || sym === S_grave) { // C :2184 (sym.h:108)
                /* C :2185 — engraving or grave+headstone shown on the map */
                glyphCh = rendered_glyph_char(x, y); // C :2215 encglyph, tty-rendered
                ++count; // C :2186
            } else { // C :2187
                /* C :2188 — engraving or grave covered by object(s) */
                lookbuf += `, obscured by ${rendered_glyph_char(x, y)}`; // C :2189-2190 encglyph
                glyph = is_headstone ? cmap_to_glyph(S_grave) // C :2191-2192
                    : cmap_to_glyph( // C display.h engraving_to_glyph
                        (game.level?.at?.(e.engr_x, e.engr_y)?.typ === CORR)
                            ? S_engrcorr : S_engroom);
                glyphCh = String.fromCharCode(glyph_showsym_code(glyph) & 0xFF);
                ++count; // C :2193
            }
            if (lookbuf) { /* C :2195 (redundant) */
                if (count === 1) { // C :2200
                    lines.push( // C :2201-2204 Sprintf + upstart
                        upstart(
                            `${nearby ? 'nearby ' : ''}seen or remembered engravings${nearby ? '' : ' on this level'}:`,
                        ),
                    );
                    lines.push('    '); // C :2208 separator
                }
                /* C :2210-2215 — prefix: "coords  C  " + rendered glyph + ' '.
                   C coord_desc MAP is bare `<x,y>` (getpos.c); the local
                   coord_desc's y<10 kitten would break the `%8s` pad, so
                   MAP formats raw here (SCREEN/COMPASS keep the helper). */
                const coord = cmode === GPCOORDS_MAP
                    ? `<${x},${y}>`
                    : coord_desc(x, y, cmode);
                const cprefix = cmode === GPCOORDS_SCREEN
                    ? `${coord}  `
                    : cmode === GPCOORDS_MAP
                        ? `${coord.padStart(8, ' ')}  `
                        : `${coord.padStart(12, ' ')}  `;
                const head = `${cprefix}${glyphCh} `;
                // C :2216-2218 guard against potential overflow
                const maxLook = BUFSZ - 1 - head.length;
                if (lookbuf.length > maxLook) {
                    lookbuf = lookbuf.slice(0, Math.max(maxLook, 0));
                }
                lines.push(`${head}${lookbuf}`); // C :2218-2219 Strcat + putmixed
            }
        }
    }
    if (count) { // C :2223
        await show_text_pages(lines, { moreAtEnd: true }); // C :2224 display_nhwindow
    } else { // C :2225-2226
        await pline(
            `No engravings seen or remembered${nearby ? ' nearby' : ''}.`,
        );
    }
}

/**
 * C ref: pager.c do_look `:1704–1800` — the "What do you want to look at:"
 * menu. JS paints it on the corner NHW_MENU path (create/start/add/end/
 * select/destroy_nhwindow are the C windowing mechanism); the entries and
 * accelerators below are the C content: `/`+`i`+`?` always, then a blank
 * separator + m/M/o/O/t/T/e/E only when NOT swallowed and NOT
 * hallucinating (`:1755`, swallowed display hides targets, hallu class
 * letters mismatch). lootabc abandons the `y`|`n` compat accelerators in
 * favor of `/`+`?` (`:1716–1753`); the `t`/`T`/`e`/`E` compat keys
 * `^`/`"`/`` ` ``/`|` apply only when lootabc is off.
 */
async function whatis_menu_choice() {
    await flush_topl_more();
    const lootabc = !!(game.flags && game.flags.lootabc);
    const suppressed = !!(game.u && game.u.uswallow) || !!Hallucination();
    const entries = [
        { text: 'What do you want to look at:', attr: ATR_INVERSE },
        { text: '', attr: 0 },
        { text: '/ - something on the map', attr: 0 },
        { text: "i - something you're carrying", attr: 0 },
        { text: '? - something else (by symbol or name)', attr: 0 },
    ];
    if (!suppressed) {
        entries.push(
            { text: '', attr: 0 },
            { text: 'm - nearby monsters', attr: 0 },
            { text: 'M - all monsters shown on map', attr: 0 },
            { text: 'o - nearby objects', attr: 0 },
            { text: 'O - all objects shown on map', attr: 0 },
            { text: 't - nearby traps', attr: 0 },
            { text: 'T - all seen or remembered traps', attr: 0 },
            { text: 'e - nearby engravings', attr: 0 },
            { text: 'E - all seen or remembered engravings', attr: 0 },
        );
    }
    const letters = suppressed ? '/i?' : '/i?mMoOtTeE';
    const searchItems = entries
        .filter((e) => e.text && e.text[1] === ' ' && e.text[0] !== '')
        .filter((e) => letters.includes(e.text[0]))
        .map((e) => ({
            selectable: true,
            selector: e.text[0],
            menuStr: e.text,
        }));
    // C windows.c select_menu gb.bot_disabled wrap.
    const _botPrev = set_bot_disabled(true);
    try {
        await paint_corner_nhw_menu(entries, '(end) ');
        await flush_screen(1);
        for (;;) {
            const key = await nhgetch();
            const ch = String.fromCharCode(key);
            // C process_menu_window MENU_SEARCH `:1698–1731` before dismiss.
            if (ch === MENU_SEARCH) {
                const res = await process_menu_search(searchItems, PICK_ONE);
                if (res.kind === 'finish' && res.item) {
                    await dismiss_nhw_menu();
                    return res.item.selector;
                }
                continue;
            }
            if (key === 27) {
                await dismiss_nhw_menu();
                return 'q';
            }
            // C wintty.c process_menu_window default arm: 'q' is no
            // selector, gacc, or page-key in this PICK_ONE menu, so C
            // tty_nhbell()s and keeps the menu (no reselect, screen-silent).
            if (ch === 'q') {
                tty_nhbell();
                continue;
            }
            if (ch === '\r' || ch === '\n' || ch === ' ') {
                // C PICK_ONE space on last page finishes with n==0; look-at
                // treats that as re-prompt. Do not docrt/cls.
                continue;
            }
            // C `:1733–1753` + `:1775–1794`: lootabc off keeps the
            // unshown `y`|`n` compat (y ≡ /, n ≡ ?) and the t/T/e/E
            // compat keys `^`/`"`/`` ` ``/`|`; lootabc on abandons them
            // for `/`+`?`. Suppressed rows (swallowed/hallu) are not
            // menu entries, so their letters bell here too.
            if (!lootabc) {
                if (ch === 'y') {
                    await dismiss_nhw_menu();
                    return '/';
                }
                if (ch === 'n') {
                    await dismiss_nhw_menu();
                    return '?';
                }
                if (ch === '^' && !suppressed) {
                    await dismiss_nhw_menu();
                    return 't';
                }
                if (ch === '"' && !suppressed) {
                    await dismiss_nhw_menu();
                    return 'T';
                }
                if (ch === '`' && !suppressed) {
                    await dismiss_nhw_menu();
                    return 'e';
                }
                if (ch === '|' && !suppressed) {
                    await dismiss_nhw_menu();
                    return 'E';
                }
            }
            if (letters.includes(ch)) {
                await dismiss_nhw_menu();
                return ch;
            }
            // C process_menu_window default: tty_nhbell(); no redraw.
            tty_nhbell();
        }
    } finally {
        set_bot_disabled(_botPrev);
    }
}

/** C ref: pager.c what_is_a_location `:1670`. */
const WHAT_IS_A_LOCATION = 'a monster, object or location';

/* C ref: pager.c suptext1 `:2233–2242` (static). */
const SUPTEXT1 = [
    '%s is a member of a marauding horde of orcs',
    'rumored to have brutally attacked and plundered',
    'the ordinarily sheltered town that is located ',
    'deep within The Gnomish Mines.',
    '',
    'The members of that vicious horde proudly and ',
    'defiantly acclaim their allegiance to their',
    'leader %s in their names.',
];

/* C ref: pager.c suptext2 `:2244–2251` (static). */
const SUPTEXT2 = [
    '"%s" is the common dungeon name of',
    'a nefarious orc who is known to acquire property',
    'from thieves and sell it off for profit.',
    '',
    'The perpetrator was last seen hanging around the',
    'stairs leading to the Gnomish Mines.',
];

/**
 * C ref: pager.c do_supplemental_info `:2255–2315` (staticfn) — in-game
 * mythology for marauding-horde orcs, unavailable from data.base. C
 * paints it on an NHW_MENU window (create/putstr/display/destroy); JS
 * uses the same NHW_MENU helper checkfile uses (show_nhw_menu_text).
 * Note the C gate: with without_asking (VERBOSE `:` look) nothing is
 * ever shown — the lore only appears after a `y` to the prompt.
 */
async function do_supplemental_info(name, pm, without_asking) {
    if (!(is_orc(pm) && String(name ?? '').length < BUFSZ - 1)) return;
    const entrytext = String(name ?? '');
    const bp = strstri(entrytext, ' of ');
    const bp2 = strstri(entrytext, ' the Fence');
    if (!bp && !bp2) return;
    const fullname = entrytext;
    let yes_to_moreinfo = false;
    if (!without_asking) {
        let question = 'More info about "';
        question += entrytext.slice(0, QBUFSZ - 1 - (question.length + 2));
        question += '"?';
        if ((await y_n(question)) === 'y') yes_to_moreinfo = true;
    }
    if (yes_to_moreinfo) {
        let subs = 0;
        let gang = '';
        let textp;
        if (bp) {
            textp = SUPTEXT1;
            gang = bp.slice(4); // C `bp + 4` past " of "
        } else {
            textp = SUPTEXT2;
        }
        const lines = [];
        for (const txt of textp) {
            // C `strstri(textp[i], "%s")` gate + Sprintf(buf, txt, arg).
            if (strstri(txt, '%s') != null) {
                lines.push(String(txt).replace('%s', subs++ ? gang : fullname));
            } else {
                lines.push(txt);
            }
        }
        await show_nhw_menu_text(lines);
    }
}

/**
 * C ref: pager.c do_look(mode, click_cc) `:1673–1963`.
 * cmdq_pop KEY skips the look-at menu (itemed `/` queues 'i', D-1686).
 * clicklook (mode 2) takes its cell from click_cc, never asks getpos,
 * never runs checkfile, and loops exactly once. Returns ECMD_OK (0).
 */
export async function do_look(mode = 0, click_cc = null) {
    const quick = mode === 1; /* use cursor; don't search for "more info" */
    const clicklook = mode === 2; /* right mouse-click method */
    let i = 0;
    let from_screen = false;
    let sym = 0;
    const cc = { x: game.u?.ux || 1, y: game.u?.uy || 0 };

    /* C pager.c `:1692–1700` — cmdq_pop KEY is the look choice;
       else cmdq_clear(CQ_CANNED); goto dowhatiscmd (skip the menu).
       cmdq_clear() defaults to CQ_CANNED (js/cmd.js). */
    const cmdq = cmdq_pop();
    let have_cmdq = false;
    if (cmdq) {
        have_cmdq = true;
        if (cmdq.typ === CMDQ_KEY || cmdq.typ === 'key') {
            i = typeof cmdq.key === 'string'
                ? cmdq.key.charCodeAt(0)
                : (cmdq.key | 0);
        } else {
            cmdq_clear();
        }
    } else if (!clicklook) {
        if (quick) {
            i = 'y'.charCodeAt(0);
        } else {
            i = (await whatis_menu_choice()).charCodeAt(0);
        }
    }
    /* C `:1802–1807` — clicklook (no canned input) skips the switch
       entirely: cell from click_cc, straight to the describe loop. A
       popped cmdq `goto dowhatiscmd`s into the switch even in
       clicklook mode, so the switch runs when !clicklook || have_cmdq. */
    if (clicklook && !have_cmdq) {
        cc.x = click_cc ? click_cc.x | 0 : game.u.ux;
        cc.y = click_cc ? click_cc.y | 0 : game.u.uy;
        sym = 0;
        from_screen = false;
    }
    if (!clicklook || have_cmdq) {
    const ch = String.fromCharCode(i);
    switch (ch) {
    default:
    case 'q':
        return 0;
    case 'y':
    case '/':
        from_screen = true;
        sym = 0;
        cc.x = game.u.ux;
        cc.y = game.u.uy;
        break;
    case 'i': {
        /* C `:1822–1840` — display_inventory(NULL, TRUE); canned KEY
           is consumed there (D-1686). Lookup uses singular(xname). */
        const invlet = await display_inventory(null, true);
        if (!invlet || invlet === '\x1b') return 0;
        let name = '';
        for (const obj of game.invent || []) {
            if (obj.invlet === invlet) {
                name = singular(obj, xname);
                break;
            }
        }
        if (name) await checkfile(name, null, CHK_USR | CHK_DONT_ASK, null);
        return 0;
    }
    case '?': {
        from_screen = false;
        let out_str = await getlin('Specify what? (type the word)');
        /* C `:1845–1848` — keep a single space as-is; else live
           mungspaces (getline.js): strip ends, condense runs. */
        if (out_str !== ' ') out_str = mungspaces(out_str);
        if (!out_str || out_str.charCodeAt(0) === 27) return 0;
        if (out_str.length > 1) {
            await checkfile(out_str, null, CHK_USR | CHK_DONT_ASK, null);
            return 0;
        }
        sym = out_str.charCodeAt(0);
        break;
    }
    case 'm':
        await look_all(true, true);
        return 0;
    case 'M':
        await look_all(false, true);
        return 0;
    case 'o':
        await look_all(true, false);
        return 0;
    case 'O':
        await look_all(false, false);
        return 0;
    case 't':
        await look_traps(true);
        return 0;
    case 'T':
        await look_traps(false);
        return 0;
    case 'e':
        await look_engrs(true);
        return 0;
    case 'E':
        await look_engrs(false);
        return 0;
    }
    } /* !clicklook || have_cmdq — clicklook skips dowhatiscmd */

    const save_verbose = game.flags?.verbose !== false;
    if (game.flags) game.flags.verbose = save_verbose && !quick;

    let ans = 0;
    do {
        /* C `:1900–1914` — reset per round (fresh holders); the getpos
           question only when asking from the screen (clicklook takes
           its cell silently, ans stays 0). */
        const outH = { s: '' };
        const firstH = { v: '' };
        const supplH = { pm: null };
        if (from_screen || clicklook) {
            if (from_screen) {
                if (game.flags?.verbose !== false) {
                    await pline(
                        `Please move the cursor to ${WHAT_IS_A_LOCATION}.`,
                    );
                } else {
                    await pline(`Pick ${WHAT_IS_A_LOCATION}.`);
                }
                // Force --More-- before getpos when message is long
                if ((game._pending_message || '').length > 40) await more();
                // C: getpos(&cc, quick, …) — quick glance uses force=TRUE
                ans = await getpos(cc, quick, WHAT_IS_A_LOCATION, brief_at);
                if (ans < 0 || cc.x < 0) break; /* done */
                if (game.flags) game.flags.verbose = false; /* ask once */
            }
        }

        /* C `:1917` — always called with (from_screen || clicklook). */
        const found = do_screen_description(
            cc, from_screen || clicklook, sym, outH, firstH, supplH,
        );

        /* Finally, print out our explanation. */
        if (found) {
            /* C `:1922` putmixed(WIN_MESSAGE, 0, out_str): literal text
               (may hold an encoded glyph) with no forced more(). JS has
               no putmixed export; route the literal through the "%s" arm
               (vpline "%s"-exact verbatim, pline.c:197-203) on the same
               message-window path so '%' in the text prints literally. */
            await pline('%s', outH.s);
            /* C DUMPLOG_CORE `:1925–1939` decode_mixed+dumplogmsg omitted:
               DUMPLOG retired (D-1776) — pline already dumplogmsgs. */

            /* Check the data file for information about this thing. */
            if (
                found === 1
                && ans !== LOOK_QUICK
                && ans !== LOOK_ONCE
                && (ans === LOOK_VERBOSE || (game.flags?.help !== false && !quick))
                && !clicklook
            ) {
                // C `:1944–1951`: (ans == LOOK_VERBOSE) ? chkfilDontAsk
                // : chkfilNone — ':' shows the entry without asking.
                // C passes do_look's local pm (never assigned: always
                // NULL), so the lookup keys off temp_buf/firstmatch —
                // NOT the didlook permonst; supplemental_pm feeds only
                // do_supplemental_info below.
                const supplHolder = { s: '' };
                await checkfile(
                    firstH.v, null,
                    ans === LOOK_VERBOSE ? CHK_DONT_ASK : 0,
                    supplHolder,
                );
                if (supplH.pm) {
                    await do_supplemental_info(
                        supplHolder.s, supplH.pm, ans === LOOK_VERBOSE,
                    );
                }
            }
        } else {
            await pline("I've never heard of such things.");
        }
    } while (from_screen && !quick && ans !== LOOK_ONCE && !clicklook);

    if (game.flags) game.flags.verbose = save_verbose;
    return 0;
}

/** C ref: pager.c dowhatis */
export async function dowhatis() {
    return do_look(0);
}

/** C ref: pager.c doquickwhatis — ';' glance */
export async function doquickwhatis() {
    return do_look(1);
}

/**
 * C ref: hacklib.c strip_newline `:179–190` — truncate at the last '\n'
 * (`*p = '\0'`, tail dropped), swallowing a preceding '\r'. C is extern
 * (hacklib.h:22); exported for the strip-newline unit test — the only
 * in-tree caller is doextversion below.
 * @param {string} s
 * @returns {string}
 */
export function strip_newline(s) {
    const str = String(s ?? '');
    const i = str.lastIndexOf('\n');
    if (i < 0) return str;
    const end = (i > 0 && str[i - 1] === '\r') ? i - 1 : i;
    return str.slice(0, end);
}

// C ref: lua.h:28 LUA_COPYRIGHT (LUA_RELEASE + two spaces + copyright)
// via nhlua.c get_lua_version `:2458–2460` into gl.lua_copyright.
const LUA_COPYRIGHT_JS = 'Lua 5.4.8  Copyright (C) 1994-2025 Lua.org, PUC-Rio';

/**
 * C ref: version.c insert_rtoption `:338–353` (staticfn — stays file-local).
 * rt_opts `:324–330`: :PATMATCH: → regex_id (posixregex.c:52, contest links
 * posixregex), :LUAVERSION: → gl.lua_ver, :LUACOPYRIGHT: → gl.lua_copyright.
 * Match test is case-insensitive (strstri `:347`) but the substitution is
 * case-sensitive (strsubst `:348`); no early break (`:350–351`).
 * @param {string} buf
 * @returns {string}
 */
function insert_rtoption(buf) {
    if (!game._lua_ver) get_lua_version_shuffle(); // C `:343–344` get_lua_version()
    const rt_opts = [
        [':PATMATCH:', 'posixregex'],
        [':LUAVERSION:', game._lua_ver || ''],
        [':LUACOPYRIGHT:', LUA_COPYRIGHT_JS],
    ];
    let out = String(buf ?? '');
    for (const [token, value] of rt_opts) {
        if (strstri(out, token) && value) out = strsubst(out, token, value);
    }
    return out;
}

/**
 * C ref: version.c doextversion `:169–277` — the `#version` command, also a
 * `?`-menu choice (hmenu_doextversion, pager.c:2792) and the `doversion`
 * menu_requested arm (version.c:161). ECMD_OK, no turn, no RNG of its own.
 * C order: getversionstring + git-info split (`:191–204`), then the
 * runtime-info loop (`:235–271`) over do_runtime_info lines with
 * strip_newline (`:252`), tabexpand (`:253–254`), outdented-header
 * separator + prolog/blank skip (`:256–264`), insert_rtoption on colon
 * lines (`:266–267`), putstr (`:269–270`); display + destroy (`:274–275`)
 * is show_text_pages (NHW_TEXT). OPTIONS_AT_RUNTIME is force-defined at
 * version.c:13–15 so use_dlb is FALSE (`:182–183`): the dlb_fopen/fgets/
 * fclose arms (`:206–214`, `:237–241`, `:272–273`) are dead — named
 * omissions, no JS dlb reader exists. The lua init
 * (get_lua_version_shuffle at entry) matches C's lazy `:343–344` call on
 * the first colon line — no RNG runs between entry and that line.
 * @returns {Promise<number>}
 */
export async function doextversion() {
    get_lua_version_shuffle();
    const use_dlb = false; // C `:176` + `:182–183` OPTIONS_AT_RUNTIME arm
    let done_rt = false; // C `:177`
    let done_dlb = false; // C `:178`; stays false — dlb arms dead (see below)
    const lines = [];
    const putstr = (s) => lines.push(s); // C `:175` win + putstr `:200–203`

    let ver = getversionstring(); // C `:191`
    let extra = null;
    // C `:192–199`: extra git text onto its own line unless it wraps on (x86).
    if (ver.length >= COLNO) { // C `:194`
        const oi = ver.lastIndexOf('('); // C `:195` strrchr
        if (oi > 0 && ver[oi - 1] === ' ' && ver[oi + 1] !== 'x') { // C `:196`
            extra = ` ${ver.slice(oi)}`; // C `:202` *--p = ' '
            ver = ver.slice(0, oi - 1); // C `:197` p[-1] = '\0'
        }
    }
    putstr(ver); // C `:200`
    if (extra !== null) putstr(extra); // C `:201–204`

    if (use_dlb) {
        // C `:206–214` dlb_fopen(OPTIONS_USED) + missing-file notice —
        // dead (use_dlb FALSE); done_dlb would go TRUE here.
        done_dlb = true;
    }

    let prolog = true; // C `:235` skip indented program name
    const rtcontext = { i: 0 }; // C `:171` rtcontext = 0 (&rtcontext at `:243`)
    for (;;) { // C `:236`
        let buf;
        if (use_dlb && !done_dlb) {
            // C `:237–241` dlb_fgets arm — dead (use_dlb FALSE); EOF would
            // set done_dlb and continue. No JS dlb reader exists.
            done_dlb = true;
            continue;
        } else if (!done_rt) { // C `:242`
            const rtbuf = do_runtime_info(rtcontext); // C `:243`
            if (rtbuf == null) { // C `:243–246` NULL exhausts the vector
                done_rt = true;
                continue;
            }
            buf = rtbuf.slice(0, BUFSZ - 1); // C `:247–248` strncpy + NUL
        } else {
            break; // C `:249–251`
        }
        buf = strip_newline(buf); // C `:252`
        if (buf.includes('\t')) buf = tabexpand(buf); // C `:253–254`

        if (buf && buf[0] !== ' ') { // C `:256–261` outdented header
            putstr('');
            prolog = false;
        }
        if (prolog || !buf) continue; // C `:262–264` skip blank + prolog

        if (buf.includes(':')) buf = insert_rtoption(buf); // C `:266–267`

        if (buf) putstr(buf); // C `:269–270`
    }
    // C `:272–273` dlb_fclose(f) — dead (use_dlb FALSE).
    await show_text_pages(lines); // C `:274–275` display + destroy
    return ECMD_OK; // C `:276`
}

/**
 * C ref: version.c doversion `:156–165` — the #versionshort command
 * (cmd.c key 'V'). menu_requested (m prefix, CMD_M_PREFIX) takes the
 * doextversion arm; otherwise pline the getversionstring text.
 * ECMD_OK, no turn, no RNG.
 * @returns {Promise<number>}
 */
export async function doversion() {
    if (game.iflags?.menu_requested) return doextversion();
    await pline(getversionstring());
    return 0;
}

/**
 * C ref: cmd.c key2txt — short label for one-byte key.
 */
function key2txt(c) {
    if (c === 32) return '<space>';
    if (c === 27) return '<esc>';
    if (c === 10 || c === 13) return '<enter>';
    if (c === 127) return '<del>';
    if (c >= 1 && c <= 26) return `^${String.fromCharCode(c + 64)}`;
    return String.fromCharCode(c);
}

/**
 * C ref: cmd.c key2extcmddesc — description for a command key.
 * Branch envelope: letters bound in rhack/cmd.js + common meta; full
 * misc_keys / number_pad / rush-run prefixes deferred.
 */
function key2extcmddesc(key) {
    const ch = typeof key === 'number' ? String.fromCharCode(key) : String(key);
    /** @type {Record<string, [string, string]>} ef_desc, ef_txt */
    const binds = {
        i: ['show your inventory', 'inventory'],
        ':': ['look here', 'look'],
        ',': ['pick up things', 'pickup'],
        '.': ['rest one move', 'wait'],
        s: ['search for traps and secret doors', 'search'],
        o: ['open a door', 'open'],
        c: ['close a door', 'close'],
        a: ['apply (use) something', 'apply'],
        e: ['eat something', 'eat'],
        q: ['quaff (drink) something', 'quaff'],
        r: ['read a scroll or spellbook', 'read'],
        z: ['zap a wand', 'zap'],
        t: ['throw something', 'throw'],
        f: ['fire ammunition', 'fire'],
        w: ['wield a weapon', 'wield'],
        W: ['wear armor', 'wear'],
        T: ['take off armor', 'takeoff'],
        P: ['put on an accessory', 'puton'],
        R: ['remove an accessory', 'remove'],
        E: ['engrave into the floor', 'engrave'],
        d: ['drop an item', 'drop'],
        '/': ['identify a glyph or creature', 'whatis'],
        '?': ['get this help menu', 'help'],
        '<': ['go up a staircase', 'up'],
        '>': ['go down a staircase', 'down'],
        '_': ['travel to a map location', 'travel'],
        ' ': ['rest one move', 'wait'],
    };
    const b = binds[ch];
    if (!b) return null;
    return `${b[0]} (#${b[1]})`;
}

/**
 * C ref: pager.c whatdoes_help — page KEYHELP with leading WS stripped.
 */
async function whatdoes_help() {
    const raw = readDat('keyhelp');
    if (!raw) {
        await pline('Cannot open "keyhelp" data file!');
        await more();
        return;
    }
    const lines = [];
    for (const line of raw.replace(/\r\n/g, '\n').split('\n')) {
        if (line.startsWith('#')) continue;
        let p = 0;
        while (p < line.length && (line[p] === ' ' || line[p] === '\t')) p++;
        lines.push(line.slice(p));
    }
    while (lines.length && lines[lines.length - 1] === '') lines.pop();
    await show_text_pages(lines);
}

/**
 * C ref: pager.c dowhatdoes_core — key2extcmddesc → "%-8s%s.".
 * help_dir (cmd.c) looks up the Ctrl-letter for an invalid getdir
 * key when the prompt is "^".
 */
export function dowhatdoes_core(q) {
    const ec = key2extcmddesc(q);
    if (!ec) return null;
    const keybuf = key2txt(q).padEnd(8, ' ');
    return `${keybuf}${ec}.`;
}

/**
 * C ref: pager.c dowhatdoes — tip once, yn_function "What command?", describe.
 */
export async function dowhatdoes() {
    if (!game._whatdoes_once) {
        await pline("Ask about '&' or '?' to get more info.");
        // C: previous topline / yn_function path surfaces --More-- before prompt
        await more();
        game._whatdoes_once = true;
    }
    // C: yn_function("What command?", NULL, '\0', TRUE) — prompt + one key
    game._pending_message = 'What command? ';
    await flush_screen(1);
    const disp = game.nhDisplay;
    if (disp?.setCursor) disp.setCursor(14, 0); // after "What command? "
    const q = await nhgetch();
    game._pending_message = '';
    const reslt = dowhatdoes_core(q);
    if (reslt) {
        if (q === 38 || q === 63) await whatdoes_help(); // '&' or '?'
        const nl = reslt.indexOf('\n');
        if (nl < 0) {
            // C pager.c:2700 pline("%s", reslt) verbatim.
            await pline('%s', reslt);
        } else {
            // C `:2706` pline("%s,", reslt) with reslt NUL-cut at the
            // newline (first line + comma); `:2708` pline("%8.8s%s",
            // reslt, p + 1) (8-char key field + second line). JS keeps
            // its slice emulation of both cuts, routed verbatim.
            await pline('%s,', reslt.slice(0, nl));
            await pline('%s%s', reslt.slice(0, 8), reslt.slice(nl + 1));
        }
    } else {
        const label = key2txt(q);
        await pline(
            `No such command '${label}', char code ${q} (0${q.toString(8).padStart(3, '0')} or 0x${q.toString(16).padStart(2, '0')}).`,
        );
    }
    return 0;
}

/**
 * C ref: pager.c dispfile_help `:2748–2752` — display_file(HELP, TRUE).
 */
async function dispfile_help() {
    await display_file(HELP, true);
}

/** C ref: pager.c dispfile_shelp `:2754–2758` — display_file(SHELP, TRUE). */
async function dispfile_shelp() {
    await display_file(SHELP, true);
}

/** C ref: pager.c dispfile_optionfile `:2760–2764`. */
async function dispfile_optionfile() {
    await display_file(OPTIONFILE, true);
}

/** C ref: pager.c dispfile_optmenu `:2766–2770`. */
async function dispfile_optmenu() {
    await display_file(OPTMENUHELP, true);
}

/** C ref: pager.c dispfile_license `:2772–2776`. */
async function dispfile_license() {
    await display_file(LICENSE, true);
}

/** C ref: pager.c dispfile_debughelp `:2778–2782`. */
async function dispfile_debughelp() {
    await display_file(DEBUGHELP, true);
}

/** C ref: pager.c dispfile_usagehelp `:2784–2788`. */
async function dispfile_usagehelp() {
    await display_file(USAGEHELP, true);
}

/**
 * C ref: pager.c dohistory `:2961–2965` — the 'V' command; display HISTORY.
 */
export async function dohistory() {
    await display_file(HISTORY, true);
    return ECMD_OK;
}

/** C ref: pager.c hmenu_doextversion `:2790–2794` — (void) doextversion(). */
async function hmenu_doextversion() {
    await doextversion();
}

/** C ref: pager.c hmenu_dohistory `:2796–2800` — (void) dohistory(). */
async function hmenu_dohistory() {
    await dohistory();
}

/** C ref: pager.c hmenu_dowhatis `:2802–2805` — (void) dowhatis(). */
async function hmenu_dowhatis() {
    await dowhatis();
}

/** C ref: pager.c hmenu_dowhatdoes `:2808–2812` — (void) dowhatdoes(). */
async function hmenu_dowhatdoes() {
    await dowhatdoes();
}

/** C ref: pager.c hmenu_doextlist `:2814–2818` — (void) doextlist(). */
async function hmenu_doextlist() {
    const { doextlist } = await import('./cmd.js');
    await doextlist();
}

/**
 * C ref: pager.c dohelp — help menu.
 */
export async function dohelp() {
    await flush_topl_more();
    const items = [
        { key: 'a', text: 'About NetHack (version information).', fn: hmenu_doextversion },
        { key: 'b', text: 'Long description of the game and commands.', fn: dispfile_help },
        { key: 'c', text: 'List of game commands.', fn: dispfile_shelp },
        { key: 'd', text: 'Concise history of NetHack.', fn: hmenu_dohistory },
        { key: 'e', text: 'Info on a character in the game display.', fn: hmenu_dowhatis },
        { key: 'f', text: 'Info on what a given key does.', fn: hmenu_dowhatdoes },
        // C ref: options.c option_help via pager.c dohelp help_menu
        { key: 'g', text: 'List of game options.', fn: async () => {
            await show_text_pages(option_help_lines());
        } },
        { key: 'h', text: 'Longer explanation of game options.', fn: dispfile_optionfile },
        { key: 'i', text: "Using the '#optionsfull' or 'm O' command to set options.", fn: dispfile_optmenu },
        // C ref: cmd.c dokeylist
        { key: 'j', text: 'Full list of keyboard commands.', fn: async () => {
            await show_text_pages(dokeylist_lines());
        } },
        { key: 'k', text: 'List of extended commands.', fn: hmenu_doextlist },
        // C ref: pager.c domenucontrols → options.c show_menu_controls
        { key: 'l', text: 'List menu control keys.', fn: async () => {
            await show_text_pages(domenucontrols_lines());
        } },
        { key: 'm', text: "Description of NetHack's command line.", fn: dispfile_usagehelp },
        { key: 'n', text: 'The NetHack license.', fn: dispfile_license },
        // C ref: pager.c docontact
        { key: 'o', text: 'Support information.', fn: async () => {
            await show_text_pages([
                'To contact the NetHack development team directly,',
                "see the 'Contact' form on our website or email <devteam@nethack.org>.",
                '',
                'For more information on NetHack, or to report a bug,',
                'visit our website "https://www.nethack.org/".',
            ]);
        } },
    ];
    if (game.flags?.debug || game.wizard) {
        items.push({
            key: 'p',
            text: 'List of wizard-mode commands.',
            fn: dispfile_debughelp,
        });
    }

    const entries = [
        { text: 'Select one item:', attr: ATR_INVERSE },
        { text: '', attr: 0 },
        ...items.map(it => ({ text: `${it.key} - ${it.text}`, attr: 0 })),
    ];

    await paint_corner_nhw_menu(entries, '(end) ');
    await flush_screen(1);
    for (;;) {
        const key = await nhgetch();
        const ch = String.fromCharCode(key);
        if (key === 27 || ch === 'q') {
            await dismiss_nhw_menu();
            return 0;
        }
        if (ch === '\r' || ch === '\n' || ch === ' ') continue;
        const it = items.find(x => x.key === ch);
        if (it) {
            await dismiss_nhw_menu();
            await it.fn();
            return 0;
        }
        // C process_menu_window default: tty_nhbell(); no docrt/cls.
        tty_nhbell();
    }
}
