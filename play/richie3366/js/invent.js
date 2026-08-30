// invent.js — Inventory / discoveries / attributes / #adjust.
// C ref: invent.c display_inventory / ddoinv / let_to_name / doorganize;
//        consume_obj_charge unpaid check_unpaid (D-1047);
//        update_inventory in_moveloop + suppress_map_output +
//        suppress_price dance (D-1126); perm_invent InvInUse D-1600
//        (prepare_perminvent invmode / display_pickinv WIN_INVEN filter;
//        tty WIN_INVEN / #perminv D-1642; tty_wait_synch D-1646);
//        D-1603: beyond_savefile_load writers (allmain.c:71 /
//        restore.c:942) so sync_perminvent :5653 can build;
//        display_minventory MINV_ALL|PICK_NONE (D-1426; zap.c
//        probe_monster); display_binventory buried/pool (D-1444;
//        zap.c zap_updown WAN_PROBING); display_cinventory container
//        contents (D-1445; zap.c bhito WAN_PROBING); worn_wield_only /
//        PICK_ONE / INCLUDE_HERO named;
//        o_init.c dodiscovered / discover_object / gem_learned;
//        invent.c o_on (D-1691);
//        insight.c enlightenment (BASIC ^X + MAGIC-only in-progress D-1116).
// D-0856: display_pickinv / invent_lines obj_to_glyph Hallu display RNG.
// D-1578: force_invmenu Special `*`/`?` + getobj redo_menu / oneloop.
// D-1579: getobj mime_action on typed '-' when !allownone.
// D-1580: pickinv gacc collect + BALL `'0'` vs count; def_oc_syms.
// D-1588: getobj force_invmenu putmsghistory(qbuf) + topl.c remember_topl.
// D-1589: sortloot SORTLOOT_INUSE + display_pickinv inuse_only / doprinuse.
// D-1590: display_pickinv wizid unid_cnt>0 PICK_ANY (`_`/^I identify_pack).
// D-1591: invent.c display_used_invlets (#adjust ?/* used-letters PICK_ONE).
// D-1599: sortloot SORTLOOT_PETRIFY filter override + will_feel_cockatrice.
// D-1600: perm_invent InvInUse (prepare_perminvent invmode + WIN_INVEN filter).
// D-1642: invent.c doperminv / wintty.c assesstty + ttyinv grid.
// D-1602: ggetobj takeoff/identify askchain (MENU_TRADITIONAL).
// D-1635: do.c doddrop / menu_drop ggetobj("drop") (#droptype / 'D').
// D-1621: invent.c adjust_split GC_ECHOFIRST|GC_CONDHIST
//        (itemactions IA_ADJUST_STACK / #altadjust; doorganize_core
//        nobj-split). Not get_count (D-1613).
// D-1641: invent.c check_invent_gold (`adjust_gold_ok` / doorganize
//        filter / itemactions gold `i` / dest `$`). Not adjust_split.
// D-1655: invent.c flags.invlet_constant / reassign / obj_to_let
//        (fixinv opt_out On).
// D-1663: invent.c dounpaid / find_unpaid + mkobj.c
//        unknwn_contnr_contents + xprname Iu/Ix cost. D-1720:
//        currency Hallu ROLL_FROM(currencies). D-1687:
//        dotypeinv Traditional itemize yn + this_type_only /
//        tally_BUCX; callee doinvbill. wizcmds sanity_check is D-1664.
// D-1682: invent.c silly_thing (Call Amulet / unknown fake; getobj
//        GETOBJ_EXCLUDE). docallcmd #if 0 EXCLUDE is compiled out.

import { game } from './gstate.js';
import { nhgetch } from './input.js';
import {
    flush_screen, flush_topl_more, pline, docrt, status_line_2, message_menu,
    endgamelevelname, obj_glyph, suppress_map_output,
    putmsghistory, impossible, tty_nhbell, tty_wait_synch,
    clear_nhwindow_message, Hallucination,
} from './display.js';
import { xprname, an, vtense, doname, distant_name, Japanese_item_name, xname, cxname_singular, set_xname_observe, set_distant_cansee, ansimpleoname, simpleonames, set_not_fully_identified, makeplural, body_part_latebound, corpse_xname, killer_xname } from './objnam.js';
import { yn_function, getlin, mungspaces } from './getline.js';
import { get_count, pmatchi, cmdq_pop, cmdq_clear } from './cmd.js';
import { mergable, is_damageable, stop_timer, splitobj, unsplitobj, clear_splitobjs, unknwn_contnr_contents, weight } from './mkobj.js';
import { unpaid_cost, doinvbill, gem_learned, obfree } from './shk.js';
import { hidden_gold } from './vault.js';
import { setnotworn } from './do.js';
import { s_suffix } from './do_name.js';
import { inv_cnt } from './steal.js';
import { assigninvlet } from './u_init.js';
import { cansee } from './vision.js';
import {
    WEAPON_CLASS,
    ARMOR_CLASS,
    TOOL_CLASS,
    FOOD_CLASS,
    POTION_CLASS,
    SCROLL_CLASS,
    COIN_CLASS,
    AMULET_CLASS,
    RING_CLASS,
    SPBOOK_CLASS,
    WAND_CLASS,
    GEM_CLASS,
    ROCK_CLASS,
    BALL_CLASS,
    CHAIN_CLASS,
    VENOM_CLASS,
    ILLOBJ_CLASS,
    MAXOCLASSES,
    FIRST_OBJECT,
    NUM_OBJECTS,
    def_oc_syms,
    def_char_to_objclass,
    objectNames,
    objectNameStrs,
    objects,
} from './objects.js';
import { interesting_to_discover, disco_append_typename } from './o_init.js';
import {
    Never_mind,
    silly_thing_to,
    ECMD_OK,
    ECMD_CANCEL,
    ECMD_FAIL,
    WIN_ERR,
    OBJ_FREE,
    OBJ_INVENT,
    OBJ_CONTAINED,
    OBJ_FLOOR,
    FIG_TRANSFORM,
    Has_contents,
    Is_container,
    Is_box,
    COST_NOCONTENTS,
    has_oname,
    ONAME,
    SORTLOOT_PACK,
    SORTLOOT_LOOT,
    SORTLOOT_INVLET,
    SORTLOOT_INUSE,
    SORTLOOT_PETRIFY,
    CXN_PFX_THE,
    CXN_ARTICLE,
    PICK_ONE,
    PICK_NONE,
    PICK_ANY,
    MENU_SEARCH,
    MENU_BEHAVE_PERMINV,
    MENU_ITEMFLAGS_NONE,
    MENU_ITEMFLAGS_SKIPINVERT,
    CONTAINED_SYM,
    MINV_ALL,
    MINV_NOLET,
    engulfing_u,
    In_endgame,
    In_quest,
    Is_knox_level,
    Is_rogue_level,
    thats_enough_tries,
    LARGEST_INT,
    GC_SAVEHIST,
    GC_ECHOFIRST,
    GC_CONDHIST,
    HANDS_SYM,
    InvInUse,
    InvShowGold,
    InvSparse,
    InvOptNone,
    InvOptOn,
    ROWNO,
    COLNO,
    WC_PERM_INVENT,
    toggling_off,
    toggling_not,
    toggling_on,
    fromcore_set_mode,
    fromcore_request_settings,
    TOCORE_TOO_SMALL,
    TOCORE_PROHIBITED,
    TOCORE_TOO_EARLY,
    HAND,
    FINGER,
    FINGERTIP,
    GETOBJ_EXCLUDE,
    GETOBJ_SUGGEST,
    GETOBJ_DOWNPLAY,
    GETOBJ_EXCLUDE_INACCESS,
    GETOBJ_EXCLUDE_SELECTABLE,
    GETOBJ_EXCLUDE_NONINVENT,
    GETOBJ_ALLOWCNT,
    GETOBJ_PROMPT,
    GETOBJ_NOFLAGS,
    CMDQ_KEY,
    CMDQ_EXTCMD,
    CMDQ_USER_INPUT,
    CMDQ_INT,
    CQ_REPEAT,
    ALL_FINISHED,
    MENU_TRADITIONAL,
    MENU_FULL,
    MENU_PARTIAL,
    BUC_BLESSED,
    BUC_UNCURSED,
    BUC_CURSED,
    BUC_UNKNOWN,
    UNPAID_TYPES,
    BILLED_TYPES,
    JUSTPICKED,
    INCLUDE_VENOM,
    USE_INVLET,
    INVORDER_SORT,
} from './const.js';
import { ATR_INVERSE, NO_COLOR } from './terminal.js';
import {
    acurr, acurrstr, get_strength_str, exercise, Fumbling,
    A_STR, A_INT, A_WIS, A_DEX, A_CON, A_CHA,
} from './attrib.js';
import { depth, ing_suffix, strstri } from './hacklib.js';
import { visctrl } from './dokeylist.js';
import { select_menu_pick_any } from './options.js';
import { rn2 } from './rng.js';
import { newuexp } from './exper.js';
import {
    DOOR, STAIRS, FOUNTAIN, SINK, ALTAR, GRAVE, TREE, IRONBARS,
    D_NODOOR, D_ISOPEN, D_BROKEN,
    A_LAWFUL, A_NEUTRAL, A_CHAOTIC,
    ROLE_GENDMASK, ROLE_MALE, ROLE_FEMALE,
    IS_DOOR,
    P_NONE, P_DAGGER, P_KNIFE, P_AXE, P_PICK_AXE, P_SHORT_SWORD,
    P_BROAD_SWORD, P_LONG_SWORD, P_TWO_HANDED_SWORD, P_SABER,
    P_CLUB, P_MACE, P_MORNING_STAR, P_FLAIL, P_HAMMER, P_QUARTERSTAFF,
    P_POLEARMS, P_SPEAR, P_TRIDENT, P_LANCE, P_BOW, P_SLING, P_CROSSBOW,
    P_DART, P_SHURIKEN, P_BOOMERANG, P_WHIP, P_UNICORN_HORN,
    P_ATTACK_SPELL, P_HEALING_SPELL, P_DIVINATION_SPELL,
    P_ENCHANTMENT_SPELL, P_CLERIC_SPELL, P_ESCAPE_SPELL, P_MATTER_SPELL,
    P_BARE_HANDED_COMBAT, P_TWO_WEAPON_COMBAT, P_RIDING,
    P_ISRESTRICTED, P_UNSKILLED, P_BASIC, P_SKILLED,
    P_EXPERT, P_MASTER, P_GRAND_MASTER,
    W_ARMOR, W_AMUL, W_RING, W_TOOL, W_SADDLE,
    W_ARM, W_ARMC, W_ARMH, W_ARMS, W_ARMG, W_ARMF, W_ARMU,
    W_WEP, W_SWAPWEP, W_QUIVER, W_WEAPONS, W_ART, W_ACCESSORY,
    WORN_SHIRT, WORN_BOOTS, WORN_GLOVES, WORN_HELMET, WORN_SHIELD,
    WORN_CLOAK, WORN_ARMOR, WORN_BLINDF, WORN_AMUL,
    LEFT_RING, RIGHT_RING, RIGHT_HANDED, LEFT_HANDED,
    NEW_MOON,
    FULL_MOON,
    Upolyd,
    BASICENLIGHTENMENT,
    MAGICENLIGHTENMENT,
    Is_airlevel,
    Is_waterlevel,
    LEFT_SIDE,
    RIGHT_SIDE,
    BOTH_SIDES,
    TELEPORT_CONTROL,
    JUMPING,
    HALLUC_RES, SEARCHING, REFLECTING, LIFESAVED,
    FIRE_RES, SHOCK_RES, TELEPAT, WARNING,
    DISPLACED, ANTIMAGIC,
} from './const.js';
import { align_str, align_gname, u_gname, rank_of } from './roles.js';
import {
    UNENCUMBERED, SLT_ENCUMBER, MOD_ENCUMBER, HVY_ENCUMBER, EXT_ENCUMBER,
    OVERLOADED, WT_WEIGHTCAP_STRCON, WT_WEIGHTCAP_SPARE, MAX_CARR_CAP,
    WT_WOUNDEDLEG_REDUCT, WT_HUMAN,
    NOT_HUNGRY,
} from './const.js';
import { stairway_at, stairs_description } from './mklev.js';
import { objects_at } from './mkobj.js';
import { PM_SAMURAI, PM_MONK, PM_CLERIC } from './generated/monsters_data.js';
import { humanoid, strongmonst, mons, touch_petrifies, poly_when_stoned } from './monsters.js';
import { set_artifact_intrinsic, undiscovered_artifact, discover_artifact } from './artifact.js';
import {
    askchain, add_valid_menu_class, collect_obj_classes,
    count_buc, count_justpicked, allow_category,
    query_category, query_objlist,
} from './pickup.js';

// C monflag.h MZ_HUMAN ≡ MZ_MEDIUM
const MZ_HUMAN = 2;

/** C youprop.h Blind ≡ (HBlinded || EBlinded) && !BBlinded (+ roleplay). */
function Blind() {
    const u = game.u || {};
    if (u.uroleplay?.blind) return true;
    return !!(((u.HBlinded | 0) || (u.EBlinded | 0)) && !(u.BBlinded | 0));
}

const OTYP_LEASH = objectNames.indexOf('LEASH');
const OTYP_CORPSE = objectNames.indexOf('CORPSE');
const OTYP_GOLD_PIECE = objectNames.indexOf('GOLD_PIECE');
const SPE_NOVEL = objectNames.indexOf('SPE_NOVEL');
const AMULET_OF_YENDOR = objectNames.indexOf('AMULET_OF_YENDOR');
const FAKE_AMULET_OF_YENDOR = objectNames.indexOf('FAKE_AMULET_OF_YENDOR');

/**
 * C ref: invent.c u_have_novel `:1575–1584` — first SPE_NOVEL on
 * gi.invent (nobj only, not cobj). Caller sounds.c MS_RIDER Death
 * tribute (D-1653).
 */
export function u_have_novel() {
    if (SPE_NOVEL < 0) return null;
    for (const otmp of game.invent || []) {
        if ((otmp?.otyp | 0) === SPE_NOVEL) return otmp;
    }
    return null;
}

/**
 * C invent.c o_on `:1586–1599` — walk objchn by o_id, recurse cobj.
 * Invent is a JS array; floor/minvent/cobj stay nobj chains (D-1691).
 * @param {number} id
 * @param {object|object[]|null} objchn
 * @returns {object|null}
 */
export function o_on(id, objchn) {
    if (!objchn) return null;
    const want = id | 0;
    if (Array.isArray(objchn)) {
        for (const head of objchn) {
            const hit = o_on(want, head);
            if (hit) return hit;
        }
        return null;
    }
    let obj = objchn;
    while (obj) {
        if ((obj.o_id | 0) === want) return obj;
        if (Has_contents(obj)) {
            const temp = o_on(want, obj.cobj);
            if (temp) return temp;
        }
        obj = obj.nobj;
    }
    return null;
}

/**
 * C invent.c inuse_headers — [4] "Accessories"; dispinv_with_action may
 * swap that slot for "Amulet" / "Ring" / "Rings".
 */
const inuse_headers = [
    '', 'Miscellaneous', 'Worn Armor', 'Wielded/Readied Weapons', 'Accessories',
];

/** C invent.c inuse_headers[4] save. */
export function inuse_headers_accessories() {
    return inuse_headers[4];
}

/** C invent.c inuse_headers[4] = alt_label (or restore "Accessories"). */
export function inuse_headers_set_accessories(label) {
    inuse_headers[4] = label || 'Accessories';
}

/* C invent.c static wri_info / perminv_flags / in_perm_invent_toggled.
 * WIN_INVEN id stand-in for create_nhwindow(NHW_MENU) (not WIN_ERR). */
const WIN_INVEN_ID = 20;
let perminv_flags = InvOptNone;
let in_perm_invent_toggled = false;
let wri_info = {
    fromcore: { invmode: InvOptNone, core_request: 0 },
    tocore: { tocore_flags: 0, maxslot: 0 },
};
/** C invent.c sync_perminvent static win_request_info *wri. */
let sync_wri = null;

/* C wintty.h tty_perminv_minrow/mincol; wintty.c tty_slots = 54. */
const tty_perminv_minrow = 28;
const tty_perminv_mincol = 79;
const MAX_STATUS_ROWS = 3;
const tty_slots = 54;
const border_left = 0;
const border_middle = 1;
const border_right = 2;
/** C wintty.c emptyttycell — color is NO_COLOR+1. */
function emptyttycell() {
    return { refresh: 0, text: 0, glyph: 0, ttychar: '\0', color: NO_COLOR + 1 };
}
let ttyinvmode = InvOptOn; /* C static ttyinvmode = InvNormal */
let inuse_only_start = 0;
let ttyinv_slots_used = 0;
const slot_tracker = new Array(tty_slots).fill(false);
const bordercol = [0, 0, 0];
/** C WinDesc for WIN_INVEN (cells + offx/offy/maxrow/maxcol). */
let win_inven = null;

/**
 * C wintty.c StatusRows — wc2_statuslines<=2 → 2 else MAX_STATUS_ROWS.
 * @returns {number}
 */
function StatusRows() {
    const n = game.iflags?.wc2_statuslines | 0;
    return n <= 2 ? 2 : MAX_STATUS_ROWS;
}

/**
 * C ttyDisplay->rows/cols. Missing display is too_early (0,0).
 * @returns {{ rows: number, cols: number }}
 */
function ttyDisplay_size() {
    const d = game.nhDisplay;
    if (!d) return { rows: 0, cols: 0 };
    return { rows: d.rows | 0, cols: (d.cols | 0) || COLNO };
}

/**
 * C wintty.c tty_procs.name / wincap WC_PERM_INVENT (TTY_PERM_INVENT).
 * @returns {{ name: string, wincap: number }}
 */
function tty_windowprocs() {
    const wp = game.windowprocs;
    if (wp && typeof wp === 'object') {
        return {
            name: wp.name || 'tty',
            wincap: 'wincap' in wp ? (wp.wincap | 0) : WC_PERM_INVENT,
        };
    }
    return { name: 'tty', wincap: WC_PERM_INVENT };
}

/**
 * C wintty.c assesstty `:3557–3599`. SMALL_INUSE_WINDOW on → inuse minrow 10.
 * @param {number} invmode
 * @param {{ offx: number, offy: number, rows: number, cols: number,
 *           maxcol: number, minrow: number, maxrow: number }} geo
 * @returns {boolean} TRUE if rows/cols are enough
 */
function assesstty(invmode, geo) {
    const inuse_only = ((invmode | 0) & InvInUse) !== 0;
    const show_gold = ((invmode | 0) & InvShowGold) !== 0 && !inuse_only;
    let perminv_minrow = tty_perminv_minrow + (show_gold ? 1 : 0);
    const disp = ttyDisplay_size();

    if (!game.nhDisplay) {
        geo.offx = geo.offy = geo.rows = geo.cols = 0;
        geo.maxcol = 0;
        geo.minrow = geo.maxrow = 0;
        return !(geo.rows < perminv_minrow || geo.cols < tty_perminv_mincol);
    }

    geo.offx = 0;
    geo.offy = 1 + ROWNO + StatusRows();
    geo.rows = disp.rows - geo.offy;
    geo.cols = disp.cols;
    geo.minrow = perminv_minrow;
    /* C SMALL_INUSE_WINDOW defined then immediately #undef — live arm is 1+8+1 */
    if (inuse_only) geo.minrow = 1 + 8 + 1;
    geo.maxrow = Math.min(geo.rows, perminv_minrow);
    geo.maxcol = geo.cols;
    return !(geo.rows < geo.minrow || geo.cols < tty_perminv_mincol);
}

/**
 * C wintty.c tty_ctrl_nhwindow set_mode / request_settings `:2849–2911`.
 * RESIZABLE (SIGWINCH) → too_small, not prohibited.
 * @param {number} _window
 * @param {number} request
 * @param {object|null} wri
 */
function ctrl_nhwindow_perm(_window, request, wri) {
    if (!wri) return null;
    if (request !== fromcore_set_mode && request !== fromcore_request_settings) {
        return wri;
    }
    ttyinvmode = wri.fromcore.invmode | 0;
    if (request === fromcore_set_mode) return wri;

    const inuse_only = (ttyinvmode & InvInUse) !== 0;
    const geo = {
        offx: 0, offy: 0, rows: 0, cols: 0, maxcol: 0, minrow: 0, maxrow: 0,
    };
    const disp = ttyDisplay_size();
    wri.tocore = {
        tocore_flags: 0,
        maxslot: 0,
        needrows: 0,
        needcols: 0,
        haverows: 0,
        havecols: 0,
    };
    const tty_ok = assesstty(ttyinvmode, geo);
    if (!tty_ok && geo.rows === 0 && geo.cols === 0) {
        wri.tocore.tocore_flags |= TOCORE_TOO_EARLY;
    } else {
        wri.tocore.needrows = (geo.minrow + 1 + ROWNO + StatusRows()) | 0;
        wri.tocore.needcols = tty_perminv_mincol | 0;
        wri.tocore.haverows = disp.rows | 0;
        wri.tocore.havecols = disp.cols | 0;
        if (!tty_ok) {
            wri.tocore.tocore_flags |= TOCORE_TOO_SMALL;
        } else {
            wri.tocore.maxslot = ((geo.maxrow - 2) * (!inuse_only ? 2 : 1)) | 0;
        }
    }
    return wri;
}

function ttyinv_destroy() {
    win_inven = null;
    game.WIN_INVEN = WIN_ERR;
    ttyinv_slots_used = 0;
    slot_tracker.fill(false);
}

/**
 * C wintty.c tty_invent_box_glyph_init `:3478–3552`.
 * Border cells use ASCII box (cmap_D0walls_to_glyph / tty_print_glyph named).
 * @param {object} cw
 */
function tty_invent_box_glyph_init(cw) {
    if (!cw || !cw.active) return;
    const inuse_only = (ttyinvmode & InvInUse) !== 0;
    const show_gold = (ttyinvmode & InvShowGold) !== 0 && !inuse_only;
    const rows_per_side = inuse_only ? (cw.maxrow - 2)
        : !show_gold ? 26 : 27;
    const bottomrow = rows_per_side + 1;
    for (let row = 0; row < cw.maxrow; row++) {
        for (let col = 0; col < cw.maxcol; col++) {
            const cell = cw.cells[row][col];
            let ch = null;
            if (row === 0) {
                ch = col === bordercol[border_left] ? '+'
                    : col === bordercol[border_right] ? '+'
                    : col === bordercol[border_middle] ? '+'
                    : '-';
            } else if (row < bottomrow) {
                if (col === bordercol[border_left]
                    || col === bordercol[border_middle]
                    || col === bordercol[border_right]) {
                    ch = '|';
                }
            } else if (row === bottomrow) {
                ch = col === bordercol[border_left] ? '+'
                    : col === bordercol[border_right] ? '+'
                    : col === bordercol[border_middle] ? '+'
                    : '-';
            }
            if (ch == null) {
                if (cell.glyph) {
                    Object.assign(cell, emptyttycell());
                    cell.ttychar = ' ';
                    cell.text = 1;
                    cell.refresh = 1;
                }
                continue;
            }
            cell.glyph = 1;
            cell.text = 0;
            cell.ttychar = ch;
            cell.refresh = 1;
            cell.color = NO_COLOR + 1;
        }
    }
}

/**
 * C wintty.c ttyinv_create_window `:2915–2999`.
 * @returns {object|null}
 */
function ttyinv_create_window() {
    const geo = {
        offx: 0, offy: 0, rows: 0, cols: 0, maxcol: 0, minrow: 0, maxrow: 0,
    };
    const cw = {
        offx: 0, offy: 0, rows: 0, cols: 0, maxcol: 0, maxrow: 0,
        cells: null, active: 0, mbehavior: 0, curx: 0, cury: 0,
    };
    if (!assesstty(ttyinvmode, geo)) {
        ttyinv_destroy();
        const iflags = game.iflags || (game.iflags = {});
        iflags.perm_invent = false;
        const disp = ttyDisplay_size();
        const needr = (geo.minrow + 1 + ROWNO + StatusRows()) | 0;
        void pline('tty perm_invent could not be enabled.');
        void pline(
            `tty perm_invent needs a terminal that is at least ${needr}x${tty_perminv_mincol}, yours is ${disp.rows}x${disp.cols}.`,
        );
        void tty_wait_synch();
        return null;
    }
    cw.offx = geo.offx;
    cw.offy = geo.offy;
    cw.rows = geo.rows;
    cw.cols = geo.cols;
    cw.maxrow = geo.maxrow;
    cw.maxcol = geo.cols;
    bordercol[border_left] = 0;
    bordercol[border_middle] = Math.trunc((cw.maxcol + 1) / 2);
    bordercol[border_right] = cw.maxcol - 1;
    if ((ttyinvmode & InvInUse) !== 0) {
        bordercol[border_middle] = bordercol[border_right];
    }
    ttyinv_slots_used = 0;
    cw.cells = [];
    for (let r = 0; r < cw.maxrow; r++) {
        const row = [];
        for (let c = 0; c < cw.maxcol; c++) row.push(emptyttycell());
        cw.cells.push(row);
    }
    cw.active = 1;
    tty_invent_box_glyph_init(cw);
    return cw;
}

/**
 * C wintty.c tty_start_menu MENU_BEHAVE_PERMINV `:2518–2547`.
 */
function tty_start_menu_perminv() {
    if (win_inven?.mbehavior === MENU_BEHAVE_PERMINV) {
        inuse_only_start = 0;
        return;
    }
    const cw = ttyinv_create_window();
    if (!cw) return;
    cw.mbehavior = MENU_BEHAVE_PERMINV;
    win_inven = cw;
    game.WIN_INVEN = WIN_INVEN_ID;
}

/**
 * C wintty.c selector_to_slot `:3119–3179`.
 * @param {string} ch
 * @param {number} invflags
 * @returns {{ slot: number, ignore: boolean }}
 */
function selector_to_slot(ch, invflags) {
    let slot = 0;
    let ignore = false;
    const show_gold = (invflags & InvShowGold) !== 0;
    const inuse_only = (invflags & InvInUse) !== 0;
    const c = ch || '';
    if (inuse_only) {
        if (!c) ignore = true;
        else slot = inuse_only_start++;
    } else {
        switch (c) {
        case GOLD_SYM:
            if (!show_gold) ignore = true;
            else slot = 0;
            break;
        case '#':
            if (!show_gold) ignore = true;
            else slot = 0 + 52 + 1;
            break;
        case '':
            ignore = true;
            break;
        default:
            if (c >= 'a' && c <= 'z') {
                slot = (c.charCodeAt(0) - 97) + (show_gold ? 1 : 0);
            } else if (c >= 'A' && c <= 'Z') {
                slot = (c.charCodeAt(0) - 65) + (show_gold ? 1 : 0) + 26;
            }
            break;
        }
    }
    return { slot, ignore };
}

/**
 * C wintty.c slot_to_invlet `:3181–3203`.
 * @param {number} slot
 * @param {boolean} incl_gold
 * @returns {string}
 */
function slot_to_invlet(slot, incl_gold) {
    let s = slot | 0;
    if (s === 0) return incl_gold ? GOLD_SYM : 'a';
    if (s === 53) return '#';
    if (incl_gold) s--;
    if (s < 26) return String.fromCharCode(97 + s);
    if (s < 52) return String.fromCharCode(65 + s - 26);
    return '?';
}

/**
 * C wintty.c ttyinv_populate_slot `:3375–3426`.
 * @param {object} cw
 * @param {number} row
 * @param {number} side
 * @param {string} text
 * @param {number} color
 * @param {number} clroffset
 */
function ttyinv_populate_slot(cw, row, side, text, color, clroffset) {
    const inuse_only = (ttyinvmode & InvInUse) !== 0;
    const oops = row < 0 || row >= cw.maxrow || side < 0;
    if (inuse_only && side > 1 && !oops) return;
    if (oops || side > 1) {
        impossible('ttyinv_populate_slot row=%d, side=%d', row, side);
        return;
    }
    const col0 = bordercol[side] + 1;
    const endcol = bordercol[side + 1] - 1;
    let t = 0;
    const src = String(text ?? '');
    for (let ccnt = col0; ccnt <= endcol; ccnt++) {
        const cell = cw.cells[row][ccnt];
        if (cell.glyph) Object.assign(cell, emptyttycell());
        let c;
        if (t < src.length) {
            c = src[t];
            t++;
        } else {
            c = ' ';
        }
        if (cell.ttychar !== c) {
            cell.ttychar = c;
            cell.refresh = 1;
        }
        if (cell.color !== color + 1) {
            if (ccnt >= col0 + clroffset) cell.color = color + 1;
            else cell.color = NO_COLOR + 1;
            cell.refresh = 1;
        }
        cell.text = 1;
        cell.glyph = 0;
    }
}

/**
 * C wintty.c ttyinv_add_menu `:3048–3116` — skip a/an/the; "%c - %s".
 * @param {string} ch
 * @param {number} clr
 * @param {string} str
 */
function ttyinv_add_menu(ch, clr, str) {
    const cw = win_inven;
    if (!cw || !(game.program_state?.in_moveloop | 0)) return;
    const show_gold = (ttyinvmode & InvShowGold) !== 0;
    const inuse_only = (ttyinvmode & InvInUse) !== 0;
    const rows_per_side = inuse_only ? (cw.maxrow - 2)
        : !show_gold ? 26 : 27;
    const sel = selector_to_slot(ch, ttyinvmode);
    let ignore = sel.ignore;
    const slot = sel.slot;
    if (inuse_only && slot > 2 * rows_per_side) ignore = true;
    if (ignore) return;
    slot_tracker[slot] = true;
    if (inuse_only && slot === rows_per_side
        && ttyinv_slots_used % rows_per_side === 0) {
        ttyinv_inuse_twosides(cw, rows_per_side);
    }
    let text = String(str ?? '');
    if (text[0] === 'a') {
        if (text[1] === ' ') text = text.slice(2);
        else if (text[1] === 'n' && text[2] === ' ') text = text.slice(3);
    } else if (text[0] === 't') {
        if (text[1] === 'h' && text[2] === 'e' && text[3] === ' ') {
            text = text.slice(4);
        }
    }
    const invbuf = `${ch} - ${text}`;
    const startcolor_at = 4; /* sizeof "a - " - 1 */
    const row = (slot % rows_per_side) + 1;
    const side = Math.trunc(slot / rows_per_side);
    ttyinv_populate_slot(cw, row, side, invbuf, clr | 0, startcolor_at);
}

function ttyinv_inuse_fulllines(cw, _rows_per_side) {
    bordercol[border_middle] = bordercol[border_right];
    tty_invent_box_glyph_init(cw);
}

function ttyinv_inuse_twosides(cw, rows_per_side) {
    bordercol[border_middle] = Math.trunc((cw.maxcol + 1) / 2);
    tty_invent_box_glyph_init(cw);
    const col = bordercol[border_middle];
    for (let row = 0; row <= rows_per_side; row++) {
        tty_refresh_inventory(col, col, row);
    }
}

/**
 * C wintty.c tty_refresh_inventory `:3428–3476` — one row onto the tty.
 * @param {number} start
 * @param {number} stop
 * @param {number} y
 */
function tty_refresh_inventory(start, stop, y) {
    const cw = win_inven;
    if (!cw || (game.WIN_INVEN ?? WIN_ERR) === WIN_ERR) return;
    if (!game.iflags?.perm_invent) return;
    if ((game.gp?.perm_invent_toggling_direction | 0) === toggling_off) return;
    let col_limit = stop;
    if (col_limit > cw.maxcol) col_limit = cw.maxcol;
    const disp = game.nhDisplay;
    const row = y | 0;
    for (let col = start - 1; col < col_limit; col++) {
        const cell = cw.cells[row]?.[col];
        if (!cell) continue;
        cell.refresh = 0;
        if (!disp?.setCell) continue;
        const sy = (cw.offy | 0) + row;
        const sx = (cw.offx | 0) + col;
        const ch = cell.ttychar || ' ';
        const color = cell.color ? cell.color - 1 : NO_COLOR;
        disp.setCell(sx, sy, ch === '\0' ? ' ' : ch, color);
    }
}

/**
 * C hack.c money_cnt `:4513–4522` — first COIN_CLASS quan (inline, not clone #7).
 * @returns {number}
 */
function perminv_money_quan() {
    for (const otmp of game.invent || []) {
        if (otmp?.oclass === COIN_CLASS) return otmp.quan || 0;
    }
    return 0;
}

/**
 * C wintty.c ttyinv_render `:3263–3371` + InvSparse empty-letter slots.
 * @param {object} cw
 */
function ttyinv_render(cw) {
    const inuse_only = (ttyinvmode & InvInUse) !== 0;
    const show_gold = (ttyinvmode & InvShowGold) !== 0 && !inuse_only;
    const sparse = (ttyinvmode & InvSparse) !== 0 && !inuse_only;
    const rows_per_side = inuse_only ? (cw.maxrow - 2)
        : !show_gold ? 26 : 27;
    let slot_limit = tty_slots;
    if (inuse_only) {
        slot_limit = rows_per_side;
        if (ttyinv_slots_used === 0 || ttyinv_slots_used >= rows_per_side) {
            slot_limit *= 2;
        }
    } else if (!show_gold) {
        slot_limit -= 2;
    }
    let filled_count = 0;
    for (let slot = 0; slot < slot_limit; slot++) {
        if (slot_tracker[slot]) filled_count++;
    }
    for (let slot = 0; slot < slot_limit; slot++) {
        if (slot_tracker[slot]) continue;
        let invbuf;
        if (slot === 0 && !filled_count) {
            const why = inuse_only ? 'no items are in use'
                : (!show_gold && perminv_money_quan()) ? 'only gold'
                : 'empty';
            invbuf = `    [${why}]`;
        } else if (sparse && filled_count) {
            invbuf = slot_to_invlet(slot, show_gold);
        } else {
            invbuf = '';
        }
        const row = (slot % rows_per_side) + 1;
        const side = Math.trunc(slot / rows_per_side);
        ttyinv_populate_slot(cw, row, side, invbuf, NO_COLOR, 0);
    }
    if (inuse_only && filled_count !== ttyinv_slots_used) {
        if (filled_count <= rows_per_side
            && ttyinv_slots_used > rows_per_side) {
            ttyinv_inuse_fulllines(cw, rows_per_side);
        }
        ttyinv_slots_used = filled_count;
    }
    for (let row = 0; row < cw.maxrow; row++) {
        tty_refresh_inventory(1, cw.maxcol, row);
    }
    for (let slot = 0; slot < tty_slots; slot++) slot_tracker[slot] = false;
}

/**
 * C wintty.c ttyinv_end_menu `:3236–3260`.
 */
function ttyinv_end_menu() {
    const cw = win_inven;
    if (!cw) return;
    const iflags = game.iflags || {};
    if (!iflags.perm_invent
        && (game.gp?.perm_invent_toggling_direction | 0) !== toggling_on) {
        return;
    }
    if (!(game.program_state?.in_moveloop | 0)) return;
    const inuse_only = (ttyinvmode & InvInUse) !== 0;
    const rows_per_side = inuse_only ? cw.maxrow - 2 : 0;
    const old_slots_used = ttyinv_slots_used;
    ttyinv_render(cw);
    if (inuse_only && old_slots_used > rows_per_side
        && ttyinv_slots_used <= rows_per_side) {
        sync_perminvent();
    }
}

/**
 * C invent.c prepare_perminvent `:5548–5562`.
 * Copy iflags.perminv_mode onto wri_info.fromcore.invmode when it changes.
 * @param {number} window
 */
export function prepare_perminvent(window) {
    const invmode = (game.iflags?.perminv_mode | 0);
    if (perminv_flags !== invmode) {
        wri_info = {
            fromcore: { invmode, core_request: fromcore_set_mode },
            tocore: { tocore_flags: 0, maxslot: 0 },
        };
        ctrl_nhwindow_perm(window, fromcore_set_mode, wri_info);
        perminv_flags = invmode;
    }
}

/**
 * C invent.c perm_invent_toggled `:5660–5677`.
 * @param {boolean} negated
 */
export function perm_invent_toggled(negated) {
    in_perm_invent_toggled = true;
    if (!game.gp) game.gp = {};
    if (!game.gc) game.gc = {};
    if (!game.gi) game.gi = {};
    if (negated) {
        game.gp.perm_invent_toggling_direction = toggling_off;
        ttyinv_destroy();
        game.gc.core_invent_state = 0;
        game.gi.perminvent_entries = [];
        game.gi.perminvent_listed = [];
    } else {
        game.gp.perm_invent_toggling_direction = toggling_on;
        const iflags = game.iflags || (game.iflags = {});
        if ((iflags.perminv_mode | 0) === InvOptNone) {
            iflags.perminv_mode = InvOptOn;
        }
        sync_perminvent();
    }
    game.gp.perm_invent_toggling_direction = toggling_not;
    in_perm_invent_toggled = false;
}

// C ref: hack.c weight_cap() — STR+CON base; Upolyd msize/cwt scale;
// Air/Lev/steed → MAX; wounded-leg reduct when !Flying (non-MAX branch).
// Named omissions: Boots_on Lev defer; strong steed MAX branch.
export function weight_cap() {
    let carrcap = WT_WEIGHTCAP_STRCON * (acurrstr() + acurr(A_CON))
        + WT_WEIGHTCAP_SPARE;
    const u = game.u || {};
    // C: Upolyd → nymph MAX / !cwt msize scale / else cwt scale
    if (Upolyd(u)) {
        const ptr = game.youmonst?.data;
        if (ptr?.mlet === 'S_NYMPH') {
            carrcap = MAX_CARR_CAP;
        } else if (!(ptr?.cwt | 0)) {
            carrcap = Math.trunc((carrcap * (ptr?.msize | 0)) / MZ_HUMAN);
        } else if (!strongmonst(ptr)
            || ((ptr?.cwt | 0) > WT_HUMAN)) {
            carrcap = Math.trunc((carrcap * (ptr?.cwt | 0)) / WT_HUMAN);
        }
    }
    // C: Levitation || Is_airlevel || (usteed && strongmonst) → MAX
    // Named omission: strong steed MAX branch.
    if (u.Levitation || Is_airlevel(u.uz)) {
        carrcap = MAX_CARR_CAP;
    } else {
        if (carrcap > MAX_CARR_CAP) carrcap = MAX_CARR_CAP;
        if (!u.Flying) {
            const ew = u.EWounded_legs | 0;
            if (ew & LEFT_SIDE) carrcap -= WT_WOUNDEDLEG_REDUCT;
            if (ew & RIGHT_SIDE) carrcap -= WT_WOUNDEDLEG_REDUCT;
        }
    }
    return Math.max(carrcap, 1);
}

// C ref: hack.c inv_weight() — negative ⇒ under capacity
export function inv_weight() {
    let wt = 0;
    for (const otmp of game.invent || []) {
        if (otmp.oclass === COIN_CLASS) {
            wt += Math.trunc(((otmp.quan || 0) + 50) / 100);
        } else {
            wt += otmp.owt || 0;
        }
    }
    game._weight_cap = weight_cap();
    return wt - game._weight_cap;
}

// C ref: hack.c calc_capacity() / near_capacity()
export function calc_capacity(xtra_wt = 0) {
    const wt = inv_weight() + xtra_wt;
    if (wt <= 0) return UNENCUMBERED;
    const wc = game._weight_cap || weight_cap();
    if (wc <= 1) return OVERLOADED;
    const cap = Math.trunc((wt * 2) / wc) + 1;
    return Math.min(cap, OVERLOADED);
}

export function near_capacity() {
    return calc_capacity(0);
}

/**
 * C ref: hack.c max_capacity — inv_weight() - 2*wc. Negative remaining
 * until 3× cap (carry_count / lift_object).
 */
export function max_capacity() {
    const wt = inv_weight();
    return wt - (2 * (game._weight_cap || weight_cap()));
}

/**
 * C ref: pickup.c encumber_msg — pline when near_capacity crosses go.oldcap.
 * Envelope: all SLT..OVERLOADED up/down arms; stagger() poly deferred
 * (humanoid uses verb as-is).
 */
export async function encumber_msg() {
    const newcap = near_capacity();
    const oldcap = game.oldcap | 0;
    if (oldcap < newcap) {
        switch (newcap) {
        case SLT_ENCUMBER:
            await pline('Your movements are slowed slightly because of your load.');
            break;
        case MOD_ENCUMBER:
            await pline('You rebalance your load.  Movement is difficult.');
            break;
        case HVY_ENCUMBER:
            await pline('You stagger under your heavy load.  Movement is very hard.');
            break;
        default:
            await pline(
                `You ${newcap === EXT_ENCUMBER ? 'can barely' : "can't even"} move a handspan with this load!`,
            );
            break;
        }
        if (game.flags) game.flags.botl = true;
        if (game.disp) game.disp.botl = true;
    } else if (oldcap > newcap) {
        switch (newcap) {
        case UNENCUMBERED:
            await pline('Your movements are now unencumbered.');
            break;
        case SLT_ENCUMBER:
            await pline('Your movements are only slowed slightly by your load.');
            break;
        case MOD_ENCUMBER:
            await pline('You rebalance your load.  Movement is still difficult.');
            break;
        case HVY_ENCUMBER:
            await pline('You stagger under your load.  Movement is still very hard.');
            break;
        default:
            break;
        }
        if (game.flags) game.flags.botl = true;
        if (game.disp) game.disp.botl = true;
    }
    game.oldcap = newcap;
}

/**
 * C ref: invent.c loot_xname → objnam.c cxname_singular.
 * Diluted/towel/glob/oname/wizard deferred.
 */
function loot_xname(obj) {
    return cxname_singular(obj) || '';
}

/**
 * C invent.c invletter_value `:390–399` — '$' first, then a-z, A-Z, '#'.
 * invlet_basic is 52.
 */
function invletter_value(c) {
    const ch = typeof c === 'string' && c.length ? c.charAt(0) : '';
    if (!ch) return 1 + 52 + 1 + 1;
    if (ch >= 'a' && ch <= 'z') return ch.charCodeAt(0) - 97 + 2;
    if (ch >= 'A' && ch <= 'Z') return ch.charCodeAt(0) - 65 + 2 + 26;
    if (ch === '$') return 1;
    if (ch === '#') return 1 + 52 + 1;
    return 1 + 52 + 1 + 1;
}

/**
 * C invent.c is_worn `:2155–2161`.
 * @param {object|null} otmp
 * @returns {boolean}
 */
export function is_worn(otmp) {
    return !!((otmp?.owornmask | 0)
        & (W_ARMOR | W_ACCESSORY | W_SADDLE | W_WEAPONS));
}

/** C invent.c taking_off `:1671–1675`. */
export function taking_off(action) {
    return action === 'take off' || action === 'remove';
}

/**
 * C invent.c count_unpaid `:3525–3538`.
 * Invent Array or nobj chain, including container contents.
 */
export function count_unpaid(list) {
    let count = 0;
    if (Array.isArray(list)) {
        for (const otmp of list) {
            if (!otmp) continue;
            if (otmp.unpaid) count++;
            if (Has_contents(otmp)) count += count_unpaid(otmp.cobj);
        }
        return count;
    }
    for (let otmp = list; otmp; otmp = otmp.nobj) {
        if (otmp.unpaid) count++;
        if (Has_contents(otmp)) count += count_unpaid(otmp.cobj);
    }
    return count;
}

/**
 * C invent.c tally_BUCX `:3578–3616`. Priest Role_if(PM_CLERIC) sets
 * bknown (coins stay unknown). Coins: flags.goldX → X else U.
 * ocp is zeroed and unused (C comment: gold is no longer skipped).
 * Caller dotypeinv (D-1687); pickup.c still has a local tally clone.
 * @param {object[]|object|null} list
 * @param {boolean} by_nexthere
 * @returns {{ b: number, u: number, c: number, x: number, o: number, j: number }}
 */
export function tally_BUCX(list, by_nexthere = false) {
    const t = { b: 0, u: 0, c: 0, x: 0, o: 0, j: 0 };
    const cleric = (game.urole?.mnum | 0) === PM_CLERIC;
    const walk = (obj) => {
        if (!obj) return;
        if (cleric) obj.bknown = obj.oclass !== COIN_CLASS ? 1 : 0;
        if (obj.pickup_prev) t.j++;
        if (obj.oclass === COIN_CLASS) {
            if (game.flags?.goldX) t.x++;
            else t.u++;
            return;
        }
        if (!obj.bknown) t.x++;
        else if (obj.blessed) t.b++;
        else if (obj.cursed) t.c++;
        else t.u++;
    };
    if (Array.isArray(list)) {
        for (const obj of list) walk(obj);
        return t;
    }
    for (let obj = list; obj; obj = by_nexthere ? obj.nexthere : obj.nobj) {
        walk(obj);
    }
    return t;
}

/**
 * C invent.c currencies[] `:1521–1543` — Hallu ROLL_FROM pool
 * (hack.h `array[rn2(SIZE(array))]`). Fictional units + trailing zorkmid.
 */
const CURRENCIES = [
    'Altarian Dollar',
    'Ankh-Morpork Dollar',
    'auric',
    'buckazoid',
    'cirbozoid',
    'credit chit',
    'cubit',
    'Flanian Pobble Bead',
    'fretzer',
    'imperial credit',
    'Hong Kong Luna Dollar',
    'kongbuck',
    'nanite',
    'quatloo',
    'simoleon',
    'solari',
    'spacebuck',
    'sporebuck',
    'Triganic Pu',
    'woolong',
    'zorkmid',
];

/**
 * C invent.c currency `:1545–1554`. Hallu → ROLL_FROM(currencies);
 * else "zorkmid". amount != 1L → makeplural. Callers shk Iu/Ix xprname
 * (D-1663). shk_names_obj traded/relinquish fmt still C's hardcoded
 * "zorkmid%s" + plur(amt), not this.
 * @param {number} amount
 * @returns {string}
 */
export function currency(amount) {
    // C: Hallucination ? ROLL_FROM(currencies) : "zorkmid"
    let res = Hallucination() ? CURRENCIES[rn2(CURRENCIES.length)] : 'zorkmid';
    if (Number(amount) !== 1) res = makeplural(res);
    return res;
}

/**
 * C invent.c find_unpaid `:3020–3041` (static). last_found is
 * `{ obj }` in/out like C `struct obj **`. Invent Array or nobj.
 * @param {object[]|object|null} list
 * @param {{ obj: object|null }} last_found
 * @returns {object|null}
 */
function find_unpaid(list, last_found) {
    if (Array.isArray(list)) {
        for (const obj of list) {
            if (!obj) continue;
            const hit = find_unpaid_node(obj, last_found);
            if (hit) return hit;
        }
        return null;
    }
    let cur = list;
    while (cur) {
        const hit = find_unpaid_node(cur, last_found);
        if (hit) return hit;
        cur = cur.nobj;
    }
    return null;
}

/** One nobj node: unpaid marker dance then Has_contents recurse. */
function find_unpaid_node(obj, last_found) {
    if (obj.unpaid) {
        if (last_found.obj) {
            if (obj === last_found.obj) last_found.obj = null;
        } else {
            last_found.obj = obj;
            return obj;
        }
    }
    if (Has_contents(obj)) {
        const nested = find_unpaid(obj.cobj, last_found);
        if (nested) return nested;
    }
    return null;
}

/** C flags.sortpack — optlist default On (`*(addr)=initval`). */
function sortpack_on() {
    const v = game.flags?.sortpack;
    if (v === undefined) return true;
    return !!v;
}

/** C flags.inv_order bytes; missing bag ≡ DEF_INV_ORDER. */
function inv_order_classes() {
    const raw = game.flags?.inv_order;
    if (typeof raw === 'string' && raw.length) {
        const out = [];
        for (let i = 0; i < raw.length; i++) {
            const n = raw.charCodeAt(i);
            if (n) out.push(n);
        }
        if (out.length) return out;
    }
    if (Array.isArray(raw) && raw.length) return raw;
    return DEF_INV_ORDER;
}

function walk_invent_nobj(list) {
    if (!list) return;
    if (Array.isArray(list)) {
        return list.filter(Boolean);
    }
    const out = [];
    for (let o = list; o; o = o.nobj) out.push(o);
    return out;
}

function dounpaid_xpr(otmp, letch, dot, cost, txt) {
    return xprname(otmp, letch, dot, 0, txt, cost);
}

/**
 * C invent.c dounpaid `:3653–3789`. Iu unpaid listing: one-item pline,
 * else NHW_MENU putstr + Total + floor/buried extra. Caller dotypeinv
 * (D-1687). Callees find_unpaid / unknwn_contnr_contents live.
 * @param {number} count unpaid in invent (incl. nested)
 * @param {number} floorcount unpaid on fobj
 * @param {number} buriedcount unpaid on buriedobjlist
 */
export async function dounpaid(count, floorcount, buriedcount) {
    let otmp = null;
    let contnr = null;
    const xtracount = (floorcount | 0) + (buriedcount | 0);

    if ((count | 0) === 1 && !xtracount) {
        const marker = { obj: null };
        otmp = find_unpaid(game.invent, marker);
        contnr = unknwn_contnr_contents(otmp);
    }
    if (otmp && !contnr) {
        const cost = unpaid_cost(otmp, COST_NOCONTENTS);
        if (!game.iflags) game.iflags = {};
        game.iflags.suppress_price = (game.iflags.suppress_price | 0) + 1;
        const letch = (walk_invent_nobj(game.invent) || []).includes(otmp)
            ? otmp.invlet
            : CONTAINED_SYM;
        await pline(dounpaid_xpr(
            otmp, letch, true, cost, distant_name(otmp, doname),
        ));
        game.iflags.suppress_price = (game.iflags.suppress_price | 0) - 1;
        return;
    }

    const lines = [];
    let totcost = 0;
    let num_so_far = 0;
    if (!invlet_constant()) reassign();

    const sortpack = sortpack_on();
    const classes = inv_order_classes();
    const invent = walk_invent_nobj(game.invent) || [];

    const emit_unpaid = (obj, letch) => {
        const cost = unpaid_cost(obj, COST_NOCONTENTS);
        totcost += cost;
        if (!game.iflags) game.iflags = {};
        game.iflags.suppress_price = (game.iflags.suppress_price | 0) + 1;
        lines.push(dounpaid_xpr(
            obj, letch, true, cost, distant_name(obj, doname),
        ));
        game.iflags.suppress_price = (game.iflags.suppress_price | 0) - 1;
        num_so_far++;
    };

    if (sortpack) {
        for (const oclass of classes) {
            let classcount = 0;
            for (const obj of invent) {
                if (!obj.unpaid) continue;
                if ((obj.oclass | 0) !== (oclass | 0)) continue;
                if (!classcount) {
                    lines.push(let_to_name(oclass, true, false));
                    classcount++;
                }
                emit_unpaid(obj, obj.invlet);
            }
        }
    } else {
        for (const obj of invent) {
            if (!obj.unpaid) continue;
            emit_unpaid(obj, obj.invlet);
        }
    }

    if ((count | 0) > num_so_far) {
        if (sortpack) {
            lines.push(let_to_name(CONTAINED_SYM, true, false));
        }
        for (const box of invent) {
            if (!Has_contents(box)) continue;
            let contcost = 0;
            const marker = { obj: null };
            let found;
            while ((found = find_unpaid(box.cobj, marker))) {
                const cost = unpaid_cost(found, COST_NOCONTENTS);
                totcost += cost;
                contcost += cost;
                if (box.cknown) {
                    if (!game.iflags) game.iflags = {};
                    game.iflags.suppress_price =
                        (game.iflags.suppress_price | 0) + 1;
                    lines.push(dounpaid_xpr(
                        found, CONTAINED_SYM, true, cost,
                        distant_name(found, doname),
                    ));
                    game.iflags.suppress_price =
                        (game.iflags.suppress_price | 0) - 1;
                }
            }
            if (!box.cknown) {
                const contbuf = `${s_suffix(xname(box))} contents`;
                lines.push(dounpaid_xpr(
                    null, CONTAINED_SYM, true, contcost, contbuf,
                ));
            }
        }
    }

    if ((count | 0) > 0) {
        lines.push('');
        lines.push(dounpaid_xpr(null, '*', false, totcost, 'Total:'));
    }

    if (xtracount > 0) {
        const floorverb = xtracount > 1 ? 'are' : 'is';
        const where = (buriedcount | 0) === 0
            ? 'on the floor'
            : (floorcount | 0) === 0
                ? 'under the floor'
                : 'on or under the floor';
        if (!(count | 0)) {
            await pline(
                `You aren't carrying any unpaid items but there ${floorverb} ${xtracount} ${where}.`,
            );
        } else {
            lines.push('');
            const plurS = xtracount === 1 ? '' : 's';
            lines.push(
                `(There ${floorverb} ${xtracount} more unpaid object${plurS} ${where}.)`,
            );
        }
    }

    if ((count | 0) > 0) {
        const { show_nhw_menu_text } = await import('./pager.js');
        await show_nhw_menu_text(lines);
    }
}

/** yn / query_category a_int may be a letter or its charCode. */
function dotypeinv_eq(c, ch) {
    return c === ch || c === ch.charCodeAt(0);
}

function dotypeinv_in(letters, c) {
    if (c == null || c === '' || c === '\0') return false;
    if (typeof c === 'string') return letters.includes(c);
    return letters.includes(String.fromCharCode(c | 0));
}

/**
 * C invent.c this_type_only `:3792–3823` (static). Allow filter for
 * dotypeinv → query_objlist. gt.this_type is oclass or B/U/C/X/P.
 */
function this_type_only(obj) {
    if (!obj) return false;
    const t = game.this_type;
    let res = obj.oclass === t;
    if (dotypeinv_eq(t, 'P')) {
        res = !!obj.pickup_prev;
    } else if (obj.oclass === COIN_CLASS) {
        if (t && dotypeinv_in('BUCX', t)) {
            res = dotypeinv_eq(t, game.flags?.goldX ? 'X' : 'U');
        }
    } else if (dotypeinv_eq(t, 'B')) {
        res = !!(obj.bknown && obj.blessed);
    } else if (dotypeinv_eq(t, 'U')) {
        res = !!(obj.bknown && !(obj.blessed || obj.cursed));
    } else if (dotypeinv_eq(t, 'C')) {
        res = !!(obj.bknown && obj.cursed);
    } else if (dotypeinv_eq(t, 'X')) {
        res = !obj.bknown;
    }
    return res;
}

/**
 * C invent.c dotypeinv `:3826–4032`. `I` / #inventtype. Traditional
 * yn_function class prompt (class_count==1 skips yn — "only one thing
 * to itemize"); FULL/PARTIAL query_category PICK_ONE. Then Iu / Ix /
 * BUCXP this_title + query_objlist PICK_ONE this_type_only +
 * itemactions. yn_function addcmdq named. Hallu obj_to_glyph named.
 * @returns {Promise<number>} ECMD_OK
 */
export async function dotypeinv() {
    const prompt = 'What type of object do you want an inventory of?';
    let c = '\0';
    let traditional = true;
    game.this_type = 0;
    game.this_title = null;

    const ushops = game.u?.ushops || '';
    const billx = !!(ushops.charCodeAt(0)) && ((await doinvbill(0)) | 0) !== 0;
    if (!(game.invent || []).length && !billx) {
        await pline("You aren't carrying anything.");
        game.this_type = 0;
        game.this_title = null;
        return ECMD_OK;
    }

    const u_carried = count_unpaid(game.invent);
    const u_floor = count_unpaid(game.fobj);
    const u_buried = count_unpaid(game.level?.buriedobjlist);
    const any_unpaid = u_carried + u_floor + u_buried;
    const buc = tally_BUCX(game.invent, false);
    const bcnt = buc.b;
    const ucnt = buc.u;
    const ccnt = buc.c;
    const xcnt = buc.x;
    const jcnt = buc.j;

    const style = game.flags?.menu_style;
    if (style !== MENU_TRADITIONAL
        && (style === MENU_FULL || style === MENU_PARTIAL)) {
        traditional = false;
        let i = UNPAID_TYPES;
        if (billx) i |= BILLED_TYPES;
        if (bcnt) i |= BUC_BLESSED;
        if (ucnt) i |= BUC_UNCURSED;
        if (ccnt) i |= BUC_CURSED;
        if (xcnt) i |= BUC_UNKNOWN;
        if (jcnt) i |= JUSTPICKED;
        i |= INCLUDE_VENOM;
        const pick_list = await query_category(
            prompt, game.invent, i, PICK_ONE,
        );
        if (!pick_list.length) {
            game.this_type = 0;
            game.this_title = null;
            return ECMD_OK;
        }
        c = pick_list[0].a_int;
        game.this_type = c;
    }

    let types = '';
    if (traditional) {
        const itemcount = { n: 0 };
        types = collect_obj_classes(game.invent, false, null, itemcount) || '';
        let class_count = types.length;
        if (any_unpaid || billx || (bcnt + ccnt + ucnt + xcnt) !== 0 || jcnt) {
            types += ' ';
            class_count++;
        }
        if (any_unpaid) {
            types += 'u';
            class_count++;
        }
        if (billx) {
            types += 'x';
            class_count++;
        }
        if (bcnt) {
            types += 'B';
            class_count++;
        }
        if (ucnt) {
            types += 'U';
            class_count++;
        }
        if (ccnt) {
            types += 'C';
            class_count++;
        }
        if (xcnt) {
            types += 'X';
            class_count++;
        }
        if (jcnt) {
            types += 'P';
            class_count++;
        }
        types += '\x1b';
        if (!any_unpaid) types += 'u';
        if (!billx) types += 'x';
        if (!bcnt) types += 'B';
        if (!ucnt) types += 'U';
        if (!ccnt) types += 'C';
        if (!xcnt) types += 'X';
        if (!jcnt) types += 'P';
        for (let i = 0; i < MAXOCLASSES; i++) {
            const s = def_oc_syms[i]?.sym;
            if (!s || types.includes(s)) continue;
            types += s;
        }

        if (class_count > 1) {
            /* C yn_function(..., '\\0', TRUE) — addcmdq default. */
            c = await yn_function(prompt, types, '\0');
            if (!c || c === '\0') {
                clear_nhwindow_message();
                game.this_type = 0;
                game.this_title = null;
                return ECMD_OK;
            }
        } else if (any_unpaid) {
            c = 'u';
        } else if (billx) {
            c = 'x';
        } else {
            c = types.charAt(0) || '\0';
        }
    }

    if (dotypeinv_eq(c, 'x')
        || (dotypeinv_eq(c, 'X') && billx && !xcnt)) {
        if (billx) {
            await doinvbill(1);
        } else {
            await pline(`No used-up objects${
                any_unpaid ? ' on your shopping bill' : ''}.`);
        }
        game.this_type = 0;
        game.this_title = null;
        return ECMD_OK;
    }
    if (dotypeinv_eq(c, 'u')
        || (dotypeinv_eq(c, 'U') && any_unpaid && !ucnt)) {
        if (any_unpaid) {
            await dounpaid(u_carried, u_floor, u_buried);
        } else {
            await pline('You are not carrying any unpaid objects.');
        }
        game.this_type = 0;
        game.this_title = null;
        return ECMD_OK;
    }

    let oclass;
    if (dotypeinv_in('BUCXP', c)) {
        oclass = c;
    } else if (typeof c === 'number' && c > 0 && c < MAXOCLASSES) {
        /* FULL query_category a_int is already oclass. */
        oclass = c;
    } else {
        oclass = def_char_to_objclass(c);
    }

    let before = '';
    let after = '';
    if (dotypeinv_eq(c, 'B')) {
        before = 'known to be blessed ';
    } else if (dotypeinv_eq(c, 'U')) {
        before = 'known to be uncursed ';
    } else if (dotypeinv_eq(c, 'C')) {
        before = 'known to be cursed ';
    } else if (dotypeinv_eq(c, 'X')) {
        after = ' whose blessed/uncursed/cursed status is unknown';
    } else if (dotypeinv_eq(c, 'P')) {
        after = ' that were just picked up';
    } else {
        before = 'such ';
    }

    if (traditional) {
        const esc = types.indexOf('\x1b');
        const ch = typeof c === 'string' ? c : String.fromCharCode(c | 0);
        const pos = types.indexOf(ch);
        if (esc >= 0 && pos > esc) {
            await pline(`You have no ${before}objects${after}.`);
            game.this_type = 0;
            game.this_title = null;
            return ECMD_OK;
        }
        game.this_type = oclass;
    }
    if (dotypeinv_in('BUCXP', c)) {
        let title = `Items ${(before && before.length) ? before : after}`;
        title = mungspaces(title);
        title += ':';
        game.this_title = title;
    }

    const qflags = ((invlet_constant() ? USE_INVLET : 0)
        | INVORDER_SORT | INCLUDE_VENOM);
    const { n, pick_list } = await query_objlist(
        null, game.invent, qflags, PICK_ONE, this_type_only,
    );
    if (n > 0) {
        const otmp = pick_list[0].obj;
        const { itemactions } = await import('./iactions.js');
        await itemactions(otmp);
    }

    game.this_type = 0;
    game.this_title = null;
    return ECMD_OK;
}

/** C invent.c ckvalidcat `:2135–2140`. */
function ckvalidcat(otmp) {
    return allow_category(otmp) ? 1 : 0;
}

/** C invent.c ckunpaid `:2142–2146`. */
function ckunpaid(otmp) {
    return (otmp?.unpaid || (Has_contents(otmp) && count_unpaid(otmp.cobj)))
        ? 1 : 0;
}

/** C invent.c removeables — armor/weapon/ring/amulet/tool. */
const GGETOBJ_REMOVEABLES = [
    ARMOR_CLASS, WEAPON_CLASS, RING_CLASS, AMULET_CLASS, TOOL_CLASS,
];

/**
 * C invent.c ggetobj `:2199–2369`. Interactive Drop/Identify/Takeoff.
 * Traditional getlin class prompt then askchain. combo ALL_FINISHED
 * for Combination menu_remarm (D-1630) and menu_drop (D-1635).
 * display_inventory lets/`i` ESC abort live; cmdq pickinv named.
 *
 * @param {string} word
 * @param {function} fn
 * @param {number} mx
 * @param {boolean} combo
 * @param {{ bits: number }|null} [resultflags]
 * @returns {Promise<number>}
 */
export async function ggetobj(word, fn, mx, combo, resultflags) {
    const invent = game.invent || [];
    if (!invent.length) {
        await pline(`You have nothing to ${word}.`);
        if (resultflags) resultflags.bits = ALL_FINISHED;
        return 0;
    }
    if (resultflags) resultflags.bits = 0;

    let takeoff = false;
    let ident = false;
    let allflag = false;
    let m_seen = false;
    let ofilter = null;
    add_valid_menu_class(0);
    if (taking_off(word)) {
        takeoff = true;
        ofilter = is_worn;
    } else if (word === 'identify') {
        ident = true;
        ofilter = not_fully_identified;
    }

    const itemcount = { n: 0 };
    let ilets = collect_obj_classes(invent, false, ofilter, itemcount);
    const unpaid = count_unpaid(invent);

    if (ident && !ilets.length) {
        return -1;
    }
    ilets += ' ';
    if (unpaid) ilets += 'u';
    if (count_buc(invent, BUC_BLESSED, ofilter)) ilets += 'B';
    if (count_buc(invent, BUC_UNCURSED, ofilter)) ilets += 'U';
    if (count_buc(invent, BUC_CURSED, ofilter)) ilets += 'C';
    if (count_buc(invent, BUC_UNKNOWN, ofilter)) ilets += 'X';
    if (count_justpicked(invent)) ilets += 'P';
    ilets += 'a';
    ilets += 'i';
    if (!combo) ilets += 'm';

    let buf = '';
    for (;;) {
        const qbuf = `What kinds of thing do you want to ${word}? [${ilets}]`;
        buf = await getlin(qbuf);
        if (buf === '\x1b') return 0;
        if (buf.includes('i')) {
            let ailets = '';
            if (ofilter) {
                for (const otmp of invent) {
                    if (!otmp?.invlet) continue;
                    if (ofilter(otmp) && !ailets.includes(otmp.invlet)) {
                        ailets += otmp.invlet;
                    }
                }
            }
            const ch = await display_inventory(ailets, true);
            if (ch === '\x1b') return 0;
        } else {
            break;
        }
    }

    const extra_removeables = [];
    if (takeoff) {
        const u = game.u || {};
        if (u.uwep) extra_removeables.push(u.uwep.oclass);
        if (u.uswapwep) extra_removeables.push(u.uswapwep.oclass);
        if (u.uquiver) extra_removeables.push(u.uquiver.oclass);
    }

    const olets = [];
    let ckfn = null;
    for (const sym of buf) {
        if (sym === ' ') continue;
        const oc_of_sym = def_char_to_objclass(sym);
        if (takeoff && oc_of_sym !== MAXOCLASSES) {
            if (extra_removeables.includes(oc_of_sym)) {
                /* skip rest of takeoff checks */
            } else if (!GGETOBJ_REMOVEABLES.includes(oc_of_sym)) {
                await pline('Not applicable.');
                return 0;
            } else if (oc_of_sym === ARMOR_CLASS && !wearing_armor()) {
                await noarmor(false);
                return 0;
            } else if (oc_of_sym === WEAPON_CLASS
                && !game.u?.uwep && !game.u?.uswapwep && !game.u?.uquiver) {
                await pline('You are not wielding anything.');
                return 0;
            } else if (oc_of_sym === RING_CLASS
                && !game.u?.uright && !game.u?.uleft) {
                await pline('You are not wearing rings.');
                return 0;
            } else if (oc_of_sym === AMULET_CLASS && !game.u?.uamul) {
                await pline('You are not wearing an amulet.');
                return 0;
            } else if (oc_of_sym === TOOL_CLASS && !game.u?.ublindf) {
                await pline('You are not wearing a blindfold.');
                return 0;
            }
        }

        if (sym === 'a') {
            allflag = true;
        } else if (sym === 'A') {
            /* same as the default */
        } else if (sym === 'u') {
            add_valid_menu_class('u');
            ckfn = ckunpaid;
        } else if ('BUCXP'.includes(sym)) {
            add_valid_menu_class(sym);
            ckfn = ckvalidcat;
        } else if (sym === 'm') {
            m_seen = true;
        } else if (oc_of_sym === MAXOCLASSES) {
            await pline(`You don't have any ${sym}'s.`);
        } else if (!olets.includes(oc_of_sym)) {
            add_valid_menu_class(oc_of_sym);
            olets.push(oc_of_sym);
        }
    }

    if (m_seen) {
        return (allflag
            || (!olets.length && ckfn !== ckunpaid && ckfn !== ckvalidcat))
            ? -2 : -3;
    }
    const style = game.flags?.menu_style ?? MENU_FULL;
    if (style !== MENU_TRADITIONAL && combo && !allflag) {
        return 0;
    }
    const cnt = await askchain(
        () => game.invent || [],
        true,
        olets,
        allflag,
        fn,
        ckfn,
        mx,
        word,
    );
    if (combo && allflag && resultflags) {
        resultflags.bits |= ALL_FINISHED;
    }
    return cnt;
}

/**
 * C invent.c tool_being_used `:4697–4711`.
 * @param {object} obj
 * @returns {boolean}
 */
function tool_being_used(obj) {
    if (((obj.owornmask || 0) & (W_TOOL | W_SADDLE)) !== 0) return true;
    if (obj.oclass !== TOOL_CLASS) return false;
    return obj === game.u?.uwep || !!obj.lamplit
        || ((obj.otyp | 0) === OTYP_LEASH && !!obj.leashmon);
}

/**
 * C invent.c is_inuse `:2164–2170` — carried && (worn || tool in use).
 * Not obj.in_use (finish-using-up). carried ≡ where==OBJ_INVENT.
 * @param {object|null} obj
 * @returns {boolean}
 */
export function is_inuse(obj) {
    if (!obj || obj.where !== OBJ_INVENT) return false;
    return is_worn(obj) || tool_being_used(obj);
}

/**
 * C invent.c inuse_classify `:70–144`. USE_RATING least→most; bigger
 * inuse comes first in sortloot_cmp. orderclass is the heading index.
 * @param {{ inuse?: number, orderclass?: number, subclass?: number, disco?: number }} sort_item
 * @param {object} obj
 */
function inuse_classify(sort_item, obj) {
    const w_mask = (obj.owornmask | 0) & (W_ACCESSORY | W_WEAPONS | W_ARMOR);
    let rating = 0;
    let altclass = 0;
    const ulefty = ((game.u?.uhandedness | 0) === LEFT_HANDED);

    const useRating = (test) => {
        rating++;
        return !!test;
    };

    /* "Miscellaneous" */
    altclass++; /* 1 */
    if (useRating(!w_mask && (obj.otyp | 0) === OTYP_LEASH && obj.leashmon)) {
        // assigned below
    } else if (useRating(!w_mask && obj.oclass === TOOL_CLASS && obj.lamplit)) {
        // assigned below
    } else {
        /* "Armor" */
        altclass++; /* 2 */
        if (useRating(w_mask & WORN_SHIRT)
            || useRating(w_mask & WORN_BOOTS)
            || useRating(w_mask & WORN_GLOVES)
            || useRating(w_mask & WORN_HELMET)
            || useRating(w_mask & WORN_SHIELD)
            || useRating(w_mask & WORN_CLOAK)
            || useRating(w_mask & WORN_ARMOR)) {
            // assigned below
        } else {
            /* "Weapons" */
            altclass++; /* 3 */
            if (useRating(w_mask & W_QUIVER)
                || useRating(w_mask & W_SWAPWEP)
                || useRating(w_mask & W_WEP)) {
                // assigned below
            } else {
                /* "Accessories" */
                altclass++; /* 4 */
                if (useRating(w_mask & WORN_BLINDF)
                    || useRating(w_mask & (ulefty ? RIGHT_RING : LEFT_RING))
                    || useRating(w_mask & (ulefty ? LEFT_RING : RIGHT_RING))
                    || useRating(w_mask & WORN_AMUL)) {
                    // assigned below
                } else {
                    rating = 0;
                    altclass = -1;
                }
            }
        }
    }

    sort_item.inuse = rating;
    sort_item.orderclass = altclass;
    sort_item.subclass = 0;
    sort_item.disco = 0;
}

/**
 * C invent.c will_feel_cockatrice `:4333–4340`.
 * Blind (or force_touch) && !uarmg && !Stone_resistance && CORPSE
 * that touch_petrifies. eat.c / doloot / pray force_touch named.
 */
export function will_feel_cockatrice(otmp, force_touch = false) {
    const u = game.u || {};
    const Stone_resistance = !!(u.Stone_resistance
        || u.HStone_resistance || u.EStone_resistance);
    if ((Blind() || force_touch) && !u.uarmg && !Stone_resistance
        && (otmp?.otyp | 0) === OTYP_CORPSE
        && touch_petrifies(mons(otmp.corpsenm))) {
        return true;
    }
    return false;
}

/**
 * C invent.c feel_cockatrice `:4342–4361`.
 * will_feel then corpse_xname CXN_PFX_THE + instapetrify killer_xname.
 */
export async function feel_cockatrice(otmp, force_touch = false) {
    if (!will_feel_cockatrice(otmp, force_touch)) return;
    const kbuf = corpse_xname(otmp, null, CXN_PFX_THE);
    if (poly_when_stoned(game.youmonst?.data, game.mvitals)) {
        await pline(
            `You touched ${kbuf} with your bare ${makeplural(body_part_latebound(HAND))}.`,
        );
    } else {
        await pline(`Touching ${kbuf} is a fatal mistake...`);
    }
    const { instapetrify } = await import('./trap.js');
    await instapetrify(`touching ${killer_xname(otmp)} bare-handed`);
}

/**
 * C ref: invent.c sortloot `:592–643` — Loot[] view; does not relink.
 * Branch envelope: SORTLOOT_PACK class + SORTLOOT_INVLET + SORTLOOT_LOOT
 * + SORTLOOT_INUSE (inuse_classify; bigger inuse first) + optional
 * filterfunc (display_pickinv is_inuse) + SORTLOOT_PETRIFY (keep
 * touch_petrifies CORPSE even when filterfunc rejects FOOD).
 * Named: subclass/disco/BUCX/erosion; loot_classify armor/weapon/tool
 * detail.
 * @param {object|object[]|null} olist nobj/nexthere head or invent Array
 * @param {number} mode SORTLOOT_* flags
 * @param {boolean} [by_nexthere=false]
 * @param {((obj: object) => boolean)|null} [filterfunc]
 */
export function sortloot(olist, mode, by_nexthere = false, filterfunc = null) {
    // C: keep-cockatrice flag is overloaded with sort mode; strip it
    // before sortloot_cmp (PETRIFY is not a compare class).
    const augment_filter = (mode & SORTLOOT_PETRIFY) !== 0;
    mode &= ~SORTLOOT_PETRIFY;
    const items = [];
    let i = 0;
    const consider = (o) => {
        if (!o) return;
        if (filterfunc && !filterfunc(o)
            && (!augment_filter || (o.otyp | 0) !== OTYP_CORPSE
                || !touch_petrifies(mons(o.corpsenm)))) {
            return;
        }
        items.push({
            obj: o, indx: i++, orderclass: 0, subclass: 0, disco: 0,
            inuse: 0, str: null,
        });
    };
    if (Array.isArray(olist)) {
        for (const o of olist) consider(o);
    } else {
        for (let o = olist; o; o = by_nexthere ? o.nexthere : o.nobj) {
            consider(o);
        }
    }
    if (!mode || items.length <= 1) return items;

    // C: flags.sortpack ? flags.inv_order : def_srt_order — inv_order subset
    const classorder = DEF_INV_ORDER;

    items.sort((sli1, sli2) => {
        const obj1 = sli1.obj;
        const obj2 = sli2.obj;
        // C sortloot_cmp: in-use takes precedence over all others
        if ((mode & SORTLOOT_INUSE) !== 0) {
            if (!sli1.orderclass) inuse_classify(sli1, obj1);
            if (!sli2.orderclass) inuse_classify(sli2, obj2);
            if (sli1.inuse !== sli2.inuse) {
                return sli2.inuse - sli1.inuse;
            }
            return sli1.indx - sli2.indx;
        }
        // C: order by class unless SORTLOOT_INVLET alone
        if ((mode & (SORTLOOT_PACK | SORTLOOT_INVLET)) !== SORTLOOT_INVLET) {
            if (!sli1.orderclass) {
                const ix = classorder.indexOf(obj1.oclass);
                sli1.orderclass = ix >= 0 ? ix + 1 : classorder.length + 2;
            }
            if (!sli2.orderclass) {
                const ix = classorder.indexOf(obj2.oclass);
                sli2.orderclass = ix >= 0 ? ix + 1 : classorder.length + 2;
            }
            if (sli1.orderclass !== sli2.orderclass) {
                return sli1.orderclass - sli2.orderclass;
            }
            // subclass / disco deferred (all ice-box corpses share FOOD/CORPSE)
        }
        // C: order by assigned inventory letter when SORTLOOT_INVLET
        if (mode & SORTLOOT_INVLET) {
            const v1 = invletter_value(obj1.invlet);
            const v2 = invletter_value(obj2.invlet);
            if (v1 !== v2) return v1 - v2;
        }
        if (mode & SORTLOOT_LOOT) {
            if (!sli1.str) sli1.str = loot_xname(obj1);
            if (!sli2.str) sli2.str = loot_xname(obj2);
            // C strcmpi
            const nam1 = sli1.str.toLowerCase();
            const nam2 = sli2.str.toLowerCase();
            if (nam1 < nam2) return -1;
            if (nam1 > nam2) return 1;
            // BUCX / grease / erosion deferred
        }
        // C tiebreak: stable by original index
        return sli1.indx - sli2.indx;
    });
    return items;
}

// C ref: options.c def_inv_order
export const DEF_INV_ORDER = [
    COIN_CLASS, AMULET_CLASS, WEAPON_CLASS, ARMOR_CLASS, FOOD_CLASS,
    SCROLL_CLASS, SPBOOK_CLASS, POTION_CLASS, RING_CLASS, WAND_CLASS,
    TOOL_CLASS, GEM_CLASS, ROCK_CLASS, BALL_CLASS, CHAIN_CLASS,
];

// C invent.c let_to_name names[] (`:4789–4793`) — index is oclass
const CLASS_NAMES = {
    [ILLOBJ_CLASS]: 'Illegal objects',
    [WEAPON_CLASS]: 'Weapons',
    [ARMOR_CLASS]: 'Armor',
    [RING_CLASS]: 'Rings',
    [AMULET_CLASS]: 'Amulets',
    [TOOL_CLASS]: 'Tools',
    [FOOD_CLASS]: 'Comestibles',
    [POTION_CLASS]: 'Potions',
    [SCROLL_CLASS]: 'Scrolls',
    [SPBOOK_CLASS]: 'Spellbooks',
    [WAND_CLASS]: 'Wands',
    [COIN_CLASS]: 'Coins',
    [GEM_CLASS]: 'Gems/Stones',
    [ROCK_CLASS]: 'Boulders/Statues',
    [BALL_CLASS]: 'Iron balls',
    [CHAIN_CLASS]: 'Chains',
    [VENOM_CLASS]: 'Venoms',
};

/** C invent.c oth_symbols / oth_names (`:4794–4795`). */
const OTH_NAMES = { [CONTAINED_SYM]: 'Bagged/Boxed items' };

/**
 * C invent.c let_to_name `:4799–4839`.
 * `let` in 1..MAXOCLASSES-1 is an oclass (flags.inv_order bytes).
 * showsym → pad to 8 then `"  ('%c')"` via def_oc_syms (BALL `'0'`).
 * Named omit: unpaid shop prefix callers still rare; gi.invbuf realloc.
 */
export function let_to_name(letch, unpaid = false, showsym = false) {
    const letv = typeof letch === 'string' ? letch.charCodeAt(0) : (letch | 0);
    const oclass = (letv >= 1 && letv < MAXOCLASSES) ? letv : 0;
    let class_name;
    if (oclass) {
        class_name = CLASS_NAMES[oclass] || CLASS_NAMES[ILLOBJ_CLASS];
    } else {
        const ch = typeof letch === 'string' ? letch : String.fromCharCode(letv);
        class_name = OTH_NAMES[ch] || CLASS_NAMES[ILLOBJ_CLASS];
    }
    let invbuf = unpaid ? `Unpaid ${class_name}` : class_name;
    if (oclass !== 0 && showsym) {
        const invbuf_sympadding = 8;
        let mlen = invbuf_sympadding - class_name.length;
        let pad = '';
        while (--mlen > 0) pad += ' ';
        const ocsym = def_oc_syms[oclass]?.sym || '\0';
        invbuf += `${pad}  ('${ocsym}')`;
    }
    return invbuf;
}

const GOLD_SYM = '$';

/**
 * C invent.c display_pickinv `:3323–3325` — add_menu group accelerator.
 * Non-wizid want_reply (getobj) passes 0; wizid uses def_oc_syms[oclass].sym
 * including BALL `'0'`.
 * @param {object|null} otmp
 * @param {boolean} wizid C `wizard && iflags.override_ID`
 * @returns {string} one char, or '' for none
 */
export function pickinv_item_gacc(otmp, wizid) {
    if (!wizid || !otmp) return '';
    const oc = otmp.oclass | 0;
    const sym = def_oc_syms[oc]?.sym;
    return (sym && sym !== '\0') ? sym : '';
}

/**
 * C wintty.c process_menu_window `:1352–1379` — collect gacc[].
 * PICK_NONE → empty. PICK_ONE: only gselectors that match exactly one
 * entry (gselector != selector). PICK_ANY: any distinct gselector.
 * GOLD_SYM `'$'` may equal selector; included only when n>0.
 * @param {{ selector: string, gselector: string }[]} items
 * @param {number} how PICK_NONE / PICK_ONE / PICK_ANY
 * @returns {string}
 */
export function collect_menu_gacc(items, how) {
    if (how === PICK_NONE || !items?.length) return '';
    const gcnt = new Array(128).fill(0);
    let n = 0;
    for (const it of items) {
        const g = it.gselector;
        if (g && g !== it.selector) {
            n++;
            gcnt[g.charCodeAt(0) & 127]++;
        }
    }
    if (n === 0) return '';
    const gold = def_oc_syms[COIN_CLASS]?.sym || GOLD_SYM;
    let gacc = '';
    for (const it of items) {
        const g = it.gselector;
        if (!g) continue;
        if (g !== it.selector || g === gold) {
            if (!gacc.includes(g)
                && (how === PICK_ANY || gcnt[g.charCodeAt(0) & 127] === 1)) {
                gacc += g;
            }
        }
    }
    return gacc;
}

/**
 * C wintty.c process_menu_window `'0'..'9'`: `'0'` is also BALL_CLASS.
 * Group accel wins only when !counting && strchr(gacc, morc).
 * @param {boolean} counting
 * @param {string} gacc
 * @param {string} ch
 */
export function menu_digit_is_gacc(counting, gacc, ch) {
    return !counting && !!(gacc && ch && gacc.includes(ch));
}

/**
 * C process_menu_window group_accel — unique PICK_ONE item's selector.
 * @param {{ selector: string, gselector: string }[]} items
 * @param {string} gacc
 * @param {string} ch
 * @returns {string|null}
 */
export function menu_take_gacc(items, gacc, ch) {
    if (!ch || !gacc?.includes(ch)) return null;
    const hit = items.find((it) => it.gselector === ch);
    return hit ? hit.selector : null;
}

/**
 * C wintty.c toggle_menu_curr `:1112–1151`.
 * @param {{ selected?: boolean, count?: number }} curr
 * @param {boolean} counting
 * @param {number} count
 * @returns {boolean}
 */
export function toggle_menu_curr(curr, counting, count) {
    if (curr.selected) {
        if (counting && count > 0) {
            curr.count = count;
            return true;
        }
        curr.selected = false;
        curr.count = -1;
        return true;
    }
    if (counting && count > 0) {
        curr.count = count;
        curr.selected = true;
        return true;
    }
    if (!counting) {
        curr.selected = true;
        return true;
    }
    return false;
}

/**
 * C process_menu_window `curr->str` analog for pmatchi.
 * @param {{ selectable?: boolean, selector?: string, selected?: boolean,
 *           text?: string, menuStr?: string }} it
 */
function menu_search_str(it) {
    if (it.menuStr != null) return String(it.menuStr);
    if (!it.selectable) return String(it.text ?? '');
    const sel = it.selector || '';
    const mark = it.selected ? '+' : '-';
    const text = it.text ?? '';
    if (sel) return `${sel} ${mark} ${text}`;
    return text;
}

/**
 * Selectable rows whose painted `text` starts with the inventory letter.
 * @param {Map<string, object>} byLet
 * @param {{ text?: string }[]|string[]} entries
 */
function menu_items_from_lets(byLet, entries) {
    const items = [];
    for (const [sel, obj] of byLet) {
        const entry = entries.find((e) => {
            const t = typeof e === 'string' ? e : e.text;
            return t && t[0] === sel && t[1] === ' ';
        });
        const menuStr = entry
            ? (typeof entry === 'string' ? entry : entry.text)
            : sel;
        items.push({ selectable: true, selector: sel, menuStr, obj });
    }
    return items;
}

/**
 * C wintty.c process_menu_window MENU_SEARCH `:1698–1731`.
 * PICK_NONE → tty_nhbell. Else tty_getlin "Search for:"; empty/ESC
 * noop. pmatchi `*tmp*` on curr->str; toggle_menu_curr; PICK_ONE
 * finishes on the first match. map_menu_cmd remaps named.
 * @param {object[]} items mlist analog
 * @param {number} how PICK_NONE / PICK_ONE / PICK_ANY
 * @param {boolean} [counting]
 * @param {number} [count]
 * @returns {Promise<{ kind: 'bell'|'noop'|'toggled'|'finish', item?: object }>}
 */
export async function process_menu_search(
    items, how, counting = false, count = 0,
) {
    if (how === PICK_NONE) {
        tty_nhbell();
        return { kind: 'bell' };
    }
    const tmpbuf = await getlin('Search for:');
    if (!tmpbuf || tmpbuf[0] === '\x1b') return { kind: 'noop' };
    const searchbuf = `*${tmpbuf}*`;
    for (const curr of items) {
        if (!curr.selectable) continue;
        if (!pmatchi(searchbuf, menu_search_str(curr))) continue;
        toggle_menu_curr(curr, counting, count);
        if (how === PICK_ONE) return { kind: 'finish', item: curr };
    }
    return { kind: 'toggled' };
}

function display() {
    return game.nhDisplay;
}

function write_status_to_grid(disp) {
    // Match display.js status rendering (strip CSI cursor-forward).
    const s1raw = statusLine1();
    const s1 = s1raw.replace(/\x1b\[[0-9;]*[A-Za-z]/g, m =>
        m.match(/\x1b\[\d+C/) ? ' '.repeat(parseInt(m.slice(2), 10) || 0) : '');
    const s2 = statusLine2();
    for (let c = 0; c < Math.min(s1.length, disp.cols); c++)
        disp.setCell(c, 22, s1[c], NO_COLOR, 0);
    for (let c = 0; c < Math.min(s2.length, disp.cols); c++)
        disp.setCell(c, 23, s2[c], NO_COLOR, 0);
}

function statusLine1() {
    const u = game.u;
    if (!u) return '';
    let name = game.plname || 'Hero';
    // C ref: botl.c — capitalize first letter of plname for status only
    if (name.length && name.charCodeAt(0) >= 97 && name.charCodeAt(0) <= 122) {
        name = String.fromCharCode(name.charCodeAt(0) - 32) + name.slice(1);
    }
    const role = game.urole?.rank?.m || game.urole?.name?.m || 'Adventurer';
    const title = `${name} the ${role}`;
    // C ref: botl.c do_statusline1 — get_strength_str + ACURR
    const stats = u.acurr?.a
        ? `St:${get_strength_str()} Dx:${acurr(A_DEX)} Co:${acurr(A_CON)} In:${acurr(A_INT)} Wi:${acurr(A_WIS)} Ch:${acurr(A_CHA)}`
        : 'St:? Dx:? Co:? In:? Wi:? Ch:?';
    const align = u.ualign?.type === 0 ? 'Neutral' : u.ualign?.type > 0 ? 'Lawful' : 'Chaotic';
    const gap = Math.max(1, 31 - title.length);
    if (gap > 4) return `${title}\x1b[${gap}C${stats} ${align}`;
    return `${title}${' '.repeat(gap)}${stats} ${align}`;
}

function statusLine2() {
    return status_line_2();
}

/**
 * Draw a full-screen text overlay (no map/status unless withStatus).
 * lines: string[] or {text, attr}[]
 */
function paint_overlay(lines, opts = {}) {
    const disp = display();
    if (!disp) return;
    const withStatus = !!opts.withStatus;
    const cursor = opts.cursor || null;
    disp.clearScreen();
    game._menu_overlay = true;

    const rows = withStatus ? 21 : disp.rows;
    for (let r = 0; r < Math.min(lines.length, rows); r++) {
        const entry = lines[r];
        const text = typeof entry === 'string' ? entry : entry.text;
        const attr = typeof entry === 'string' ? 0 : (entry.attr || 0);
        const col = opts.col || 0;
        // C tty: leading pad space is not part of item ATR_INVERSE/heading
        for (let i = 0; i < text.length && col + i < disp.cols; i++) {
            const a = (i === 0 && text[0] === ' ') ? 0 : attr;
            disp.setCell(col + i, r, text[i], NO_COLOR, a);
        }
    }
    if (withStatus) write_status_to_grid(disp);
    if (cursor) disp.setCursor(cursor[0], cursor[1]);
    else disp.setCursor(0, 0);
}

function clear_overlay() {
    game._menu_overlay = false;
}

/**
 * C ref: wintty.c tty_end_menu — cols = max(strlen(str)+2, morestr);
 *        tty_display_nhwindow(NHW_MENU) with H2344_BROKEN:
 *        offx = min(min(82, cols/2), cols - maxcol - 1).
 *        Fullscreen only when maxrow>=rows || !menu_overlay.
 * Returns { offx, maxcol }; offx===0 means fullscreen fallback.
 */
export function nhw_menu_geometry(entries, morestr = '(end) ') {
    let maxcol = morestr.length;
    for (const e of entries) {
        const text = typeof e === 'string' ? e : e.text;
        const len = text.length + 2; // leading + trailing pad
        if (len > maxcol) maxcol = len;
    }
    const cols = 80;
    let offx = Math.min(Math.min(82, Math.floor(cols / 2)), cols - maxcol - 1);
    if (offx < 0) offx = 0;
    // C H2344: no offx==10 → fullscreen; only tall menus / !menu_overlay
    const maxrow = entries.length + 1; // items + morestr row (approx)
    if (maxrow >= 24 || game.flags?.menu_overlay === false) offx = 0;
    return { offx, maxcol };
}

/**
 * C ref: wintty.c erase_menu_or_text — destroy prior NHW_MENU before the
 * next. Fullscreen (offx==0): term_clear_screen. Corner: docorner cl_end
 * from offx for maxrow+1 rows. Only needed when flush_screen is skipped
 * (chargen — no map/botl yet).
 *
 * C docorner(offx, maxrow+1, 0) ends with tty_curs(BASE, …, maxrow), so
 * BASE cury = maxrow. JS endRow is the morestr row (= C nitems); C
 * maxrow = nitems+1 → last cury = endRow+1. Fullscreen clear matches
 * erase_tty_screen → tty_curs(BASE, 1, 0).
 */
function erase_prior_nhw_menu_chargen() {
    const g = game._tty_menu_geom;
    if (!g) return;
    const disp = display();
    if (!disp) return;
    if (g.offx === 0) {
        disp.clearScreen?.();
        game._base_cury = 0;
    } else {
        // C: docorner(offx, maxrow+1, 0) — y from 0..maxrow inclusive
        const ymax = g.endRow + 1; // C maxrow
        for (let r = 0; r <= ymax; r++) {
            for (let c = g.offx; c < disp.cols; c++)
                disp.setCell(c, r, ' ', NO_COLOR, 0);
        }
        game._base_cury = ymax;
    }
    game._tty_menu_geom = null;
}

/**
 * C ref: destroy_nhwindow → tty_dismiss_nhwindow during in_role_selection.
 * Used by confirm `'a'` rename before tty_askname (no term_clear_screen).
 */
export function dismiss_chargen_nhw_menu() {
    erase_prior_nhw_menu_chargen();
}

/**
 * C ref: wintty.c process_menu_window corner path — tty_curs(1)+offx, cl_end,
 *        putchar(' '), then item text; morestr on final row; cursor at
 *        strlen(morestr)+2 (+offx). Does not clear the map (unlike fullscreen).
 * entries: {text, attr}[] or string[]; morestr default "(end) ".
 */
export async function paint_corner_nhw_menu(entries, morestr = '(end) ') {
    // C ref: wintty.c tty_display_nhwindow(NHW_MENU) — flush NEED_MORE
    // before corner paint (travel pline → tip --More--).
    await flush_topl_more();
    const disp = display();
    if (!disp) return null;
    const { offx } = nhw_menu_geometry(entries, morestr);
    // C clears WIN_MESSAGE before menu; keep map/status for corner only.
    game._pending_message = '';
    game._menu_overlay = false;

    // Corner chargen: C clears WIN_MESSAGE only — BASE splash (copyright /
    // Who are you?) stays under the menu (seed0009 confirm). Do not
    // term_clear_screen here. Prior menu destroy via erase_menu_or_text
    // (fullscreen clear / corner docorner) so seed0077 race≠role leftover.
    // flush_screen during chargen would invent botl before map exists.
    if (game.program_state?.in_role_selection) {
        erase_prior_nhw_menu_chargen();
        for (let c = 0; c < disp.cols; c++)
            disp.setCell(c, 0, ' ', NO_COLOR, 0);
    } else {
        await flush_screen(1);
    }

    if (offx === 0) {
        // C H2344 fullscreen — clear then leading pad + text at col 1
        const painted = entries.map(e => ({
            text: ` ${typeof e === 'string' ? e : e.text}`,
            attr: typeof e === 'string' ? 0 : (e.attr || 0),
        }));
        painted.push({ text: ` ${morestr}`, attr: 0 });
        paint_overlay(painted, {
            col: 0,
            withStatus: false,
            cursor: [morestr.length + 1, entries.length],
        });
        game._tty_menu_geom = { offx: 0, endRow: entries.length };
        return { offx: 0, endRow: entries.length, cursorCol: morestr.length + 1 };
    }

    const endRow = entries.length; // morestr row
    for (let r = 0; r < entries.length; r++) {
        const entry = entries[r];
        const text = typeof entry === 'string' ? entry : entry.text;
        const attr = typeof entry === 'string' ? 0 : (entry.attr || 0);
        // cl_end from offx to EOL
        for (let c = offx; c < disp.cols; c++)
            disp.setCell(c, r, ' ', NO_COLOR, 0);
        disp.setCell(offx, r, ' ', NO_COLOR, 0);
        for (let i = 0; i < text.length && offx + 1 + i < disp.cols; i++)
            disp.setCell(offx + 1 + i, r, text[i], NO_COLOR, attr);
    }
    // morestr row
    for (let c = offx; c < disp.cols; c++)
        disp.setCell(c, endRow, ' ', NO_COLOR, 0);
    disp.setCell(offx, endRow, ' ', NO_COLOR, 0);
    for (let i = 0; i < morestr.length && offx + 1 + i < disp.cols; i++)
        disp.setCell(offx + 1 + i, endRow, morestr[i], NO_COLOR, 0);

    // C: tty_curs(..., strlen(morestr)+2, page_lines) with offx added
    const cursorCol = offx + morestr.length + 1;
    disp.setCursor(cursorCol, endRow);
    game._menu_overlay = true;
    game._tty_menu_geom = { offx, endRow };
    return { offx, endRow, cursorCol };
}

/**
 * C ref: wintty.c erase_menu_or_text / tty_dismiss_nhwindow(NHW_MENU).
 * Fullscreen (offx==0): docrt()+flush (Hallu see_monsters burns inside
 * docrt). Corner (offx!=0): docorner ≡ reprint gbuf only — no newsym /
 * display-RNG burns; once-per-input Hallu see_monsters refreshes next.
 */
export async function dismiss_nhw_menu() {
    const g = game._tty_menu_geom;
    game._menu_overlay = false;
    game._tty_menu_geom = null;
    // Missing geom (paint_overlay fullscreen without geom) → treat as
    // offx==0 (C fullscreen erase_menu_or_text → docrt).
    if (!g || g.offx === 0) {
        await docrt();
    }
    // Corner: skip docrt; flush_screen rebuilds the terminal from gbuf.
    await flush_screen(1);
}

/**
 * C ref: wintty.c tty_end_menu + process_menu_window select_menu(PICK_NONE).
 * entries already include prompt/blank/items (as after tty_end_menu).
 * Pages at lmax = rows-1 (23); ESC/Return dismiss; Space next page or done.
 */
export async function select_menu_pick_none(entries) {
    // C ref: wintty.c tty_display_nhwindow(NHW_MENU) NEED_MORE flush
    await flush_topl_more();
    const rows = display()?.rows || 24;
    const lmax = Math.min(52, rows - 1);
    const nitems = entries.length;
    const npages = Math.max(1, Math.floor((nitems + lmax - 1) / lmax));
    let curr_page = 0;

    for (;;) {
        const start = curr_page * lmax;
        const page = entries.slice(start, start + lmax);
        const morestr = npages > 1
            ? `(${curr_page + 1} of ${npages})`
            : '(end) ';
        const painted = page.map(e => ({
            text: ` ${typeof e === 'string' ? e : e.text}`,
            attr: typeof e === 'string' ? 0 : (e.attr || 0),
        }));
        painted.push({ text: ` ${morestr}`, attr: 0 });
        paint_overlay(painted, {
            col: 0,
            withStatus: false,
            cursor: [morestr.length + 1, page.length],
        });
        await flush_screen(1);
        const key = await nhgetch();
        if (key === 27 || key === 13 || key === 10) break;
        if (key === 32) {
            if (curr_page < npages - 1) {
                curr_page++;
                continue;
            }
            break;
        }
        const ch = String.fromCharCode(key);
        if (ch === MENU_SEARCH) {
            await process_menu_search([], PICK_NONE);
            continue;
        }
        // other keys: re-prompt same page (C xwaitforspace)
    }
    clear_overlay();
    await docrt();
    await flush_screen(1);
}

/**
 * C ref: invent.c count_contents — stacks or quan inside a container.
 * Named omissions: shoppy via get_obj_location + costly_spot when
 * !everything && !newdrop (shop-owned floor contents); treat shoppy=false.
 */
export function count_contents(container, nested, quantity, everything, newdrop) {
    let count = 0;
    let shoppy = false;
    if (!everything && !newdrop) {
        // C: walk ocontainer to top; OBJ_FLOOR + costly_spot → shoppy
        // costly_spot / get_obj_location deferred → shoppy stays false
        let topc = container;
        while (topc && topc.where === OBJ_CONTAINED) topc = topc.ocontainer;
        if (topc && topc.where === OBJ_FLOOR) {
            shoppy = false; // deferred costly_spot
        }
    }
    for (let otmp = container?.cobj; otmp; otmp = otmp.nobj) {
        if (nested && Has_contents(otmp)) {
            count += count_contents(otmp, nested, quantity, everything, newdrop);
        }
        if (everything || otmp.unpaid || (shoppy && !otmp.no_charge)) {
            count += quantity ? (otmp.quan || 1) : 1;
        }
    }
    return count;
}

/**
 * C ref: o_init.c observe_object `:441–451`.
 * Skip generic objects and STRANGE_OBJECT (otyp < FIRST_OBJECT) and
 * Hallucination (`youprop.h`); else dknown + discover_object(..., FALSE,
 * TRUE, FALSE).
 */
export function observe_object(obj) {
    if (!obj) return;
    const oindx = obj.otyp;
    /* skip for generic objects and for STRANGE_OBJECT */
    if (oindx >= FIRST_OBJECT && !Hallucination()) {
        obj.dknown = 1;
        discover_object(oindx, false, true, false);
    }
}

/**
 * C ref: invent.c learn_unseen_invent — on regaining sight, mark invent
 * picked up while Blind as seen (xname/observe). addinv_core2 /
 * update_inventory / cleric bknown / archeologist scroll polish deferred.
 */
export function learn_unseen_invent() {
    if (Blind()) return;
    for (const otmp of game.invent || []) {
        if (!otmp) continue;
        // C: skip when already dknown (+ role bknown/scroll gates deferred)
        if (otmp.dknown) continue;
        // C: xname(otmp) → observe_object when !Blind
        observe_object(otmp);
    }
}

const SCR_MAIL = objectNames.indexOf('SCR_MAIL');
const EGG = objectNames.indexOf('EGG');
const STATUE = objectNames.indexOf('STATUE');
const FIGURINE = objectNames.indexOf('FIGURINE');
const LOADSTONE = objectNames.indexOf('LOADSTONE');

/** C ref: obj.h is_weptool — TOOL with oc_skill != P_NONE (named fallback). */
function is_weptool_obj(obj) {
    if (!obj || obj.oclass !== TOOL_CLASS) return false;
    const skill = game.objects?.[obj.otyp]?.oc_skill | 0;
    if (skill !== 0 && skill !== P_NONE) return true;
    const n = objectNames[obj.otyp];
    return n === 'PICK_AXE' || n === 'GRAPPLING_HOOK' || n === 'UNICORN_HORN'
        || n === 'AKLYS' || n === 'BULLWHIP';
}

/**
 * C ref: objnam.c not_fully_identified.
 * Named omissions: MAIL_STRUCTURES SCR_MAIL bknown skip when SCR_MAIL absent.
 */
export function not_fully_identified(otmp) {
    if (!otmp) return false;
    if (otmp.oclass === COIN_CLASS) return false;
    const oc = game.objects?.[otmp.otyp];
    const bknownOk = otmp.bknown
        || (SCR_MAIL >= 0 && (otmp.otyp | 0) === SCR_MAIL);
    if (!otmp.known || !otmp.dknown || !bknownOk || !oc?.oc_name_known) {
        return true;
    }
    if ((!otmp.cknown && (Is_container(otmp) || (otmp.otyp | 0) === STATUE))
        || (!otmp.lknown && Is_box(otmp))) {
        return true;
    }
    if (otmp.oartifact && undiscovered_artifact(otmp.oartifact)) {
        return true;
    }
    if (otmp.rknown
        || (otmp.oclass !== ARMOR_CLASS && otmp.oclass !== WEAPON_CLASS
            && !is_weptool_obj(otmp)
            && otmp.oclass !== BALL_CLASS)) {
        return false;
    }
    // lack of rknown only matters for damageable objects
    return is_damageable(otmp);
}
set_not_fully_identified(not_fully_identified);

/** C ref: invent.c set_cknown_lknown */
export function set_cknown_lknown(obj) {
    if (!obj) return;
    if (Is_container(obj) || (obj.otyp | 0) === STATUE) {
        obj.cknown = obj.lknown = 1;
    } else if ((obj.otyp | 0) === objectNames.indexOf('TIN')) {
        obj.cknown = 1;
    }
}

/**
 * C ref: invent.c fully_identify_obj.
 * Named omissions: learn_egg_type.
 */
export function fully_identify_obj(otmp) {
    if (!otmp) return;
    makeknown(otmp.otyp);
    if (otmp.oartifact) discover_artifact(otmp.oartifact);
    observe_object(otmp);
    otmp.known = otmp.bknown = otmp.rknown = 1;
    set_cknown_lknown(otmp);
    // learn_egg_type deferred (EGG + corpsenm)
}

/** C ref: invent.c identify — fully_identify_obj + prinv. */
export async function identify(otmp) {
    fully_identify_obj(otmp);
    await prinv(null, otmp, 0);
    return 1;
}

/** C ref: invent.c count_unidentified */
export function count_unidentified(objchn) {
    let unid_cnt = 0;
    if (Array.isArray(objchn)) {
        for (const obj of objchn) {
            if (obj && not_fully_identified(obj)) unid_cnt++;
        }
        return unid_cnt;
    }
    for (let obj = objchn; obj; obj = obj.nobj) {
        if (not_fully_identified(obj)) unid_cnt++;
    }
    return unid_cnt;
}

/**
 * C ref: invent.c menu_identify — query_objlist USE_INVLET PICK_ANY.
 * Envelope: invent-letter toggle menu of not_fully_identified items.
 * Named omissions: SIGNAL_NOMENU polish; wait_synch between loops.
 * Traditional ggetobj is D-1602 (identify_pack MENU_TRADITIONAL).
 */
async function menu_identify(id_limit) {
    let first = true;
    let tryct = 5;
    while (id_limit > 0) {
        const eligible = (game.invent || []).filter(not_fully_identified);
        if (!eligible.length) {
            await pline('That was all.');
            break;
        }
        const items = eligible.map((obj) => ({
            obj,
            letch: obj.invlet
                || (obj.oclass === COIN_CLASS ? '$' : '?'),
            selected: false,
        }));
        const prompt = `What would you like to identify ${first ? 'first' : 'next'}?`;
        const entries = [
            { text: prompt, attr: ATR_INVERSE },
            { text: '', attr: 0 },
        ];
        for (const it of items) {
            const mark = it.selected ? '+' : '-';
            entries.push({
                text: `${it.letch} ${mark} ${doname(it.obj)}`,
                attr: 0,
            });
        }
        await paint_corner_nhw_menu(entries, '(end) ');
        await flush_screen(1);
        let n = 0;
        for (;;) {
            const key = await nhgetch();
            if (key === 27) {
                n = -2;
                break;
            }
            if (key === 13 || key === 10 || key === 32) {
                const chosen = items.filter((it) => it.selected);
                n = chosen.length;
                if (n > id_limit) n = id_limit;
                for (let i = 0; i < n; i++, id_limit--) {
                    await identify(chosen[i].obj);
                }
                break;
            }
            const ch = typeof key === 'number' ? String.fromCharCode(key) : key;
            const hit = items.find((it) => it.letch === ch);
            if (hit) {
                hit.selected = !hit.selected;
                // refresh marks
                for (let ei = 2; ei < entries.length; ei++) {
                    const it = items[ei - 2];
                    if (!it) continue;
                    const mark = it.selected ? '+' : '-';
                    entries[ei] = {
                        text: `${it.letch} ${mark} ${doname(it.obj)}`,
                        attr: 0,
                    };
                }
                await paint_corner_nhw_menu(entries, '(end) ');
                await flush_screen(1);
                continue;
            }
            // unmatched — ignore for now
        }
        game._menu_overlay = false;
        await docrt();
        await flush_screen(1);
        if (n === -2) break;
        if (n === 0) {
            if (!--tryct) {
                await pline(thats_enough_tries);
                break;
            }
            await pline('Choose an item; use ESC to decline.');
            continue;
        }
        first = false;
    }
}

/**
 * C ref: invent.c identify_pack(id_limit, learning_id).
 * id_limit 0 = identify all unidentified invent items.
 * MENU_TRADITIONAL ggetobj("identify") then askchain (D-1602).
 */
export async function identify_pack(id_limit, learning_id) {
    let unid_cnt = count_unidentified(game.invent);
    if (!unid_cnt) {
        await pline(
            `You have already identified ${!learning_id ? 'all' : 'the rest'} of your possessions.`,
        );
    } else if (!id_limit || id_limit >= unid_cnt) {
        for (const obj of game.invent || []) {
            if (!obj || !not_fully_identified(obj)) continue;
            await identify(obj);
            if (--unid_cnt < 1) break;
        }
    } else {
        let n = 0;
        const style = game.flags?.menu_style ?? MENU_FULL;
        if (style === MENU_TRADITIONAL) {
            do {
                n = await ggetobj('identify', identify, id_limit, false, null);
                if (n < 0) break;
            } while ((id_limit -= n) > 0);
        }
        if (n === 0 || n < -1) {
            await menu_identify(id_limit);
        }
    }
    update_inventory();
}

// C: xname_flags observe + distant_name cansee (wired late to break cycles)
set_xname_observe(observe_object);
set_distant_cansee(cansee);

export function invent_lines(lets) {
    const inv = game.invent || [];
    const lines = [];
    // C ref: windows.c add_menu_heading — suppress highlight when gameover
    const headingAttr = game.program_state?.gameover ? 0 : ATR_INVERSE;
    const filterLets = lets || '';
    for (const oclass of DEF_INV_ORDER) {
        const items = inv.filter((o) => o.oclass === oclass
            && (!filterLets || (o.invlet && filterLets.includes(o.invlet))));
        if (!items.length) continue;
        lines.push({ text: let_to_name(oclass, false, false), attr: headingAttr });
        for (const otmp of items) {
            // C ref: invent.c sortloot_item — observe_object before naming
            // Prop Blind — sticky u.Blind misses FROMFORM molds (D-0928 #1186).
            if (!Blind()) observe_object(otmp);
            // C: display_pickinv — obj_to_glyph(otmp, rn2_on_display_rng)
            // before add_menu (Hallu burns display RNG even on tty menus).
            obj_glyph(otmp);
            lines.push({ text: xprname(otmp), attr: 0 });
        }
    }
    lines.push({ text: '(end)', attr: 0 });
    return lines;
}

/**
 * C integer.h AppendLongDigit — overflow → -1 (menu counts stay small).
 * @param {number} L
 * @param {number} D
 */
function append_long_digit(L, D) {
    const LONG_MAX = Number.MAX_SAFE_INTEGER;
    const q = Math.trunc(LONG_MAX / 10);
    const r = LONG_MAX - q * 10;
    if (L < q || (L === q && D <= r)) return L * 10 + D;
    return -1;
}

/**
 * C invent.c getobj `:1923–1927` — force_invmenu first letter:
 * '?' if any SUGGEST lets or altlets, else '*'. Null when the flag
 * is off (caller uses yn_function). putmsghistory is D-1588.
 * @param {string} [lets]
 * @param {string} [altlets]
 * @returns {string|null}
 */
export function getobj_force_invmenu_ch(lets = '', altlets = '') {
    if (!game.iflags?.force_invmenu) return null;
    return (lets || altlets) ? '?' : '*';
}

/**
 * C invent.c display_pickinv `:3345–3366` — force_invmenu want_reply
 * Special accelerator. `lets` empty/null/'*' is C NULL (full invent).
 * inv length ≡ inv_cnt(TRUE). Null when the row is omitted.
 * @param {string|null} lets
 * @param {boolean} allowxtra C allowxtra (getobj allownone)
 * @param {boolean} usextra C (xtra_choice && allowxtra)
 * @returns {{ ch: string, text: string }|null}
 */
export function force_invmenu_special(lets, allowxtra, usextra) {
    if (!game.iflags?.force_invmenu) return null;
    const letsStr = (lets && lets !== '*') ? lets : '';
    const invn = (game.invent || []).length;
    if ((allowxtra && !usextra) || (letsStr && letsStr.length < invn)) {
        return { ch: '*', text: '(list everything)' };
    }
    if (!letsStr) {
        return { ch: '?', text: '(list likely candidates)' };
    }
    return null;
}

/**
 * C invent.c display_pickinv inuse_only `:3186–3317`.
 * sortloot(SORTLOOT_INUSE, is_inuse); fake '-' W_WEP when !uwep;
 * doing_perm_invent → "In use" else "Inventory in use"; then
 * inuse_headers[orderclass].
 * @param {string|null} lets
 * @param {boolean} wizid
 * @param {{ doing_perm_invent?: boolean }} [opts]
 */
function pickinv_build_inuse(lets, wizid, opts = null) {
    const doing_perm_invent = !!opts?.doing_perm_invent;
    const allow = (!lets || lets === '*') ? null : new Set([...lets]);
    const u = game.u || {};
    const fake = !u.uwep ? {
        _inuse_fake: true,
        otyp: 0,
        oclass: ILLOBJ_CLASS,
        invlet: HANDS_SYM,
        owornmask: W_WEP,
        where: OBJ_INVENT,
    } : null;
    const inv = fake ? [fake, ...(game.invent || [])] : (game.invent || []);
    let sorted = sortloot(inv, SORTLOOT_INUSE, false, is_inuse);
    if (fake && sorted.length === 1 && sorted[0].obj === fake) {
        sorted = [];
    }
    const entries = [];
    const listed = [];
    const byLet = new Map();
    const pickItems = [];
    let inusecount = 0;
    let prevorderclass = 0;
    for (const srt of sorted) {
        const otmp = srt.obj;
        if (!otmp) continue;
        if (allow && !allow.has(otmp.invlet)) continue;
        if (!inusecount++) {
            // C `:3277–3280` doing_perm_invent ? "In use" : "Inventory in use"
            entries.push({
                text: doing_perm_invent ? 'In use' : 'Inventory in use',
                attr: ATR_INVERSE,
            });
        }
        if (srt.orderclass !== prevorderclass) {
            const hdr = inuse_headers[srt.orderclass];
            if (hdr) entries.push({ text: hdr, attr: ATR_INVERSE });
            prevorderclass = srt.orderclass;
        }
        const letch = otmp.invlet || '?';
        if (otmp._inuse_fake) {
            const hands = makeplural(body_part_latebound(HAND));
            const barehands = `${u.uarmg ? 'gloved' : 'bare'} ${hands} (no weapon)`;
            byLet.set(letch, { _hands: true, _inuse_fake: true });
            pickItems.push({ selector: letch, gselector: '' });
            if (doing_perm_invent) ttyinv_add_menu(letch, NO_COLOR, barehands);
            entries.push({
                text: xprname(null, HANDS_SYM, false, 0, barehands),
                attr: 0,
            });
            continue;
        }
        if (!Blind()) observe_object(otmp);
        obj_glyph(otmp);
        byLet.set(letch, otmp);
        listed.push(otmp);
        pickItems.push({
            selector: letch,
            gselector: pickinv_item_gacc(otmp, wizid),
        });
        let desc;
        if (doing_perm_invent) {
            desc = doname(otmp);
            ttyinv_add_menu(letch, NO_COLOR, desc);
        } else {
            desc = xprname(otmp);
        }
        entries.push({ text: desc, attr: 0 });
    }
    if (doing_perm_invent && !inusecount) {
        entries.push({ text: 'Not using any items', attr: 0 });
    }
    return { entries, byLet, pickItems, listed };
}

/**
 * C invent.c display_pickinv WIN_INVEN branch `:3108–3113` +
 * `:3186–3376` (PICK_NONE; tty select_menu PERMINV returns 0).
 * inuse_only = invmode & InvInUse; show_gold = invmode & InvShowGold.
 * tty start/add/end MENU_BEHAVE_PERMINV (assesstty / InvSparse / paint).
 */
function pickinv_build_perm() {
    prepare_perminvent(game.WIN_INVEN ?? WIN_ERR);
    const invmode = wri_info.fromcore.invmode | 0;
    const show_gold = (invmode & InvShowGold) !== 0;
    const inuse_only = (invmode & InvInUse) !== 0;
    tty_start_menu_perminv();
    if (inuse_only) {
        const built = pickinv_build_inuse(null, false, { doing_perm_invent: true });
        ttyinv_end_menu();
        return built;
    }
    const entries = [];
    const listed = [];
    let skipped_gold = false;
    const inv = game.invent || [];
    const sorted = sortloot(inv, SORTLOOT_INVLET, false, null);
    for (const srt of sorted) {
        const otmp = srt.obj;
        if (!otmp) continue;
        // C `:3281–3286` skip unquivered gold when !show_gold
        if (!show_gold && otmp.invlet === GOLD_SYM && !(otmp.owornmask | 0)) {
            skipped_gold = true;
            continue;
        }
        if (!Blind()) observe_object(otmp);
        obj_glyph(otmp);
        listed.push(otmp);
        const desc = doname(otmp);
        ttyinv_add_menu(otmp.invlet || '?', NO_COLOR, desc);
        entries.push({ text: desc, attr: 0 });
    }
    if (!listed.length) {
        entries.push({
            text: (!show_gold && skipped_gold)
                ? 'Only carrying gold'
                : 'Not carrying anything',
            attr: 0,
        });
    }
    ttyinv_end_menu();
    return { entries, listed, show_gold, skipped_gold };
}

/** Last WIN_INVEN menu objects (C WinDesc mlist stand-in). */
export function perminvent_listed() {
    return game.gi?.perminvent_listed || [];
}

/** Last WIN_INVEN menu rows including headers / empty placeholder. */
export function perminvent_entries() {
    return game.gi?.perminvent_entries || [];
}

/**
 * C ref: invent.c display_pickinv(lets, …, want_reply=TRUE, out_cnt) subset
 * for getobj `?`/`*`. Shows invent filtered to `lets` (or all when lets
 * null/'*'), PICK_ONE by invlet; ESC cancels; Space next page or null on
 * last; Return → null.
 * Multi-page (nitems>lmax): fullscreen "(N of M)" like tty process_menu_window;
 * only current-page selectors accepted (C resp).
 * C n==1 && !force_invmenu && !menu_requested && lets set →
 * tty_message_menu(PICK_ONE) topline xprname+--More-- (not corner menu);
 * `*out_cnt = -1` (select all). usextra (xtra_choice && allowxtra) bumps
 * n and, when n==1, message_menu(HANDS_SYM, xprname(NULL, txt, '-')).
 * Full menu: sortpack "Miscellaneous" + extra '-' row (D-1569).
 * PICK_ONE digits: wintty.c process_menu_window count then
 * selected[0].count (D-1559). `out_cnt` is C `long *` (`{ n }`); omitted
 * when getobj !ALLOWCNT.
 * force_invmenu want_reply: Special `*`/`?` (D-1578) + tty_end_menu
 * query (blank + prompt) when opts.query is set. redo_menu lives in
 * getobj_display_pickinv.
 * Group accelerators (D-1580): collect_menu_gacc + `'0'` BALL_CLASS
 * `menu_digit_is_gacc`. getobj want_reply is non-wizid so item gacc
 * is 0 like C `:3323–3325`.
 * SORTLOOT_INUSE when flags.sortloot=='i' (dispinv_with_action): is_inuse
 * filter, inuse_headers, optional fake HANDS_SYM W_WEP (D-1589).
 * perm_invent InvInUse is D-1600 (WIN_INVEN invmode bit, not this path).
 * Named omissions: MENU_PREV/FIRST/LAST. wizid unid_cnt>0 is D-1590.
 * putmsghistory is D-1588.
 * @param {string|null} lets
 * @param {{ n: number }|null} [out_cnt]
 * @param {{ choice: string, allow: boolean }|null} [xtra] C xtra_choice + allowxtra
 * @param {{ query?: string|null, allowxtra?: boolean, want_reply?: boolean }|null} [opts]
 * @returns {string|null} selected invlet, or null if cancelled / no pick
 */
export async function display_pickinv_reply(lets, out_cnt = null, xtra = null, opts = null) {
    const allowAll = !lets || lets === '*';
    const inv = game.invent || [];
    const usextra = !!(xtra?.choice && xtra?.allow);
    const allowxtra = !!(opts?.allowxtra ?? xtra?.allow);
    const want_reply = opts?.want_reply !== false;
    const inuse_only = game.flags?.sortloot === 'i';

    // C: n = lets ? strlen(lets) : invent 0/1/2+; then
    // if (usextra || (n==1 && (!lets || wizid))) ++n — so bare invent
    // with one item skips message_menu; getobj "?" with one letter does
    // not unless usextra (hands extra bumps past the one-item path).
    let n;
    if (!allowAll) {
        n = lets.length;
    } else {
        n = !inv.length ? 0 : inv.length === 1 ? 1 : 2;
    }
    if (usextra || (n === 1 && allowAll)) n++;

    if (n === 0) {
        await pline('Not carrying anything appropriate.');
        return null;
    }

    /* C invent.c display_pickinv `:3145–3147` — oxymoron? temporarily
       assign permanent inventory letters */
    if (!invlet_constant()) reassign();

    if (
        n === 1
        && !game.iflags?.force_invmenu
        && !game.iflags?.menu_requested
    ) {
        // C: if (out_cnt) *out_cnt = -1L; /* select all */ after message_menu
        if (out_cnt) out_cnt.n = -1;
        if (usextra) {
            // C: message_menu(HANDS_SYM, PICK_ONE, xprname(NULL, xtra_choice, '-', TRUE, 0, 0))
            return await message_menu(
                HANDS_SYM,
                PICK_ONE,
                xprname(null, HANDS_SYM, true, 0, xtra.choice),
            );
        }
        // C: first invent whose invlet == lets[0] (lets non-null here)
        const want = lets[0];
        const otmp = inv.find((o) => o && o.invlet === want);
        if (!otmp) {
            await pline('Not carrying anything appropriate.');
            return null;
        }
        // C: message_menu(otmp->invlet, want_reply ? PICK_ONE : PICK_NONE, …)
        return await message_menu(
            otmp.invlet,
            want_reply ? PICK_ONE : PICK_NONE,
            xprname(otmp, want, true),
        );
    }

    const allow = allowAll ? null : new Set([...lets]);
    const entries = [];
    const byLet = new Map();
    /** @type {{ selector: string, gselector: string }[]} */
    const pickItems = [];
    // C display_pickinv wizid = wizard && override_ID; getobj path is 0
    const wizid = false;
    const withsym = !!(game.iflags?.menu_head_objsym);
    if (usextra) {
        // C display_pickinv :3253–3260 — wizard ID and xtra_choice exclusive
        if (game.flags?.sortpack !== false) {
            entries.push({ text: 'Miscellaneous', attr: ATR_INVERSE });
        }
        byLet.set(HANDS_SYM, { _hands: true });
        pickItems.push({ selector: HANDS_SYM, gselector: '' });
        entries.push({
            text: xprname(null, HANDS_SYM, false, 0, xtra.choice),
            attr: 0,
        });
    }
    if (inuse_only) {
        const built = pickinv_build_inuse(lets, wizid);
        entries.push(...built.entries);
        for (const [k, v] of built.byLet) byLet.set(k, v);
        pickItems.push(...built.pickItems);
    } else {
        for (const oclass of DEF_INV_ORDER) {
            const items = inv.filter((o) => {
                if (o.oclass !== oclass) return false;
                if (!allow) return true;
                return allow.has(o.invlet);
            });
            if (!items.length) continue;
            entries.push({
                text: let_to_name(oclass, false, withsym),
                attr: ATR_INVERSE,
            });
            for (const otmp of items) {
                // Prop Blind — sticky u.Blind misses FROMFORM molds (D-0928 #1186).
                if (!Blind()) observe_object(otmp);
                // C: invent.c display_pickinv — obj_to_glyph(otmp, rn2_on_display_rng)
                // then map_glyphinfo + add_menu (Hallu display-RNG burn).
                obj_glyph(otmp);
                const letch = otmp.invlet || '?';
                byLet.set(letch, otmp);
                pickItems.push({
                    selector: letch,
                    gselector: pickinv_item_gacc(otmp, wizid),
                });
                entries.push({ text: xprname(otmp), attr: 0 });
            }
        }
    }
    // C display_pickinv `:3345–3366` — after class items, before end_menu
    const special = force_invmenu_special(lets, allowxtra, usextra);
    if (special) {
        entries.push({ text: 'Special', attr: ATR_INVERSE });
        byLet.set(special.ch, { _special: special.ch });
        pickItems.push({ selector: special.ch, gselector: '' });
        entries.push({
            text: `${special.ch} - ${special.text}`,
            attr: 0,
        });
    }
    if (!byLet.size) {
        await pline('Not carrying anything appropriate.');
        return null;
    }
    const gacc = collect_menu_gacc(pickItems, PICK_ONE);

    // C wintty.c tty_end_menu `:2680–2690` — reverse then prepend blank
    // + prompt (non-selectable). Query is getobj menuquery when
    // force_invmenu; display_inventory passes NULL.
    const query = opts?.query;
    if (query) {
        entries.unshift({ text: query, attr: 0 });
        entries.unshift({ text: '', attr: 0 });
    }

    // C ref: wintty.c tty_end_menu / process_menu_window PICK_ONE —
    // lmax=rows-1; npages>1 → "(N of M)"; Space next page; letter on
    // current page selects (resp collects page selectors only).
    const rows = display()?.rows || 24;
    const lmax = Math.min(52, rows - 1);
    const npages = Math.max(1, Math.floor((entries.length + lmax - 1) / lmax));
    let curr_page = 0;
    // C wintty.c process_menu_window: counting / count / reset_count
    let counting = false;
    let count = 0;
    let reset_count = true;

    for (;;) {
        if (reset_count) {
            counting = false;
            count = 0;
        } else {
            reset_count = true;
        }
        const start = curr_page * lmax;
        const page = entries.slice(start, start + lmax);
        const morestr = npages > 1
            ? `(${curr_page + 1} of ${npages})`
            : '(end) ';

        if (npages > 1) {
            // C fullscreen when maxrow >= rows (multi-page invent)
            const painted = page.map((e) => ({
                text: ` ${typeof e === 'string' ? e : e.text}`,
                attr: typeof e === 'string' ? 0 : (e.attr || 0),
            }));
            painted.push({ text: ` ${morestr}`, attr: 0 });
            paint_overlay(painted, {
                col: 0,
                withStatus: false,
                cursor: [morestr.length + 1, page.length],
            });
            game._tty_menu_geom = { offx: 0, endRow: page.length };
        } else {
            await paint_corner_nhw_menu(entries, morestr);
        }
        await flush_screen(1);
        const key = await nhgetch();

        // C process_menu_window '0'..'9': ball class gacc before count
        if (key >= 48 && key <= 57) {
            const dch = String.fromCharCode(key);
            if (menu_digit_is_gacc(counting, gacc, dch)) {
                const gsel = menu_take_gacc(pickItems, gacc, dch);
                if (gsel) {
                    if (out_cnt) out_cnt.n = -1;
                    await dismiss_nhw_menu();
                    return gsel;
                }
            }
            const dgt = key - 48;
            const next = append_long_digit(count, dgt);
            if (next < 0) continue; // overflow → reset_count stays True
            count = next;
            if (count !== 0) {
                counting = true;
                reset_count = false;
            }
            continue;
        }

        if (key === 27) {
            // C: counting → stop count only; else WIN_CANCELLED
            if (counting) continue;
            await dismiss_nhw_menu();
            return '\x1b';
        }
        // C: Space → next page, or finish (no pick) on last page
        if (key === 32) {
            if (curr_page < npages - 1) {
                curr_page++;
                continue;
            }
            await dismiss_nhw_menu();
            return null;
        }
        if (key === 13 || key === 10) {
            await dismiss_nhw_menu();
            return null;
        }
        const ch = String.fromCharCode(key);
        const take = () => {
            // C tty_select_menu: mi->count = curr->count (-1 if !counting)
            if (out_cnt) {
                out_cnt.n = (counting && count > 0) ? count : -1;
            }
        };
        // C: gacc before page selectors (group_accel, not only current page)
        const gsel = menu_take_gacc(pickItems, gacc, ch);
        if (gsel) {
            take();
            await dismiss_nhw_menu();
            return gsel;
        }
        // C: only current-page selectors are in resp (PICK_ONE)
        if (npages > 1) {
            const onPage = page.some((e) => {
                const t = typeof e === 'string' ? e : e.text;
                return t.length >= 3 && t[1] === ' ' && t[0] === ch;
            });
            if (onPage && byLet.has(ch)) {
                take();
                await dismiss_nhw_menu();
                return ch;
            }
        } else if (byLet.has(ch)) {
            take();
            await dismiss_nhw_menu();
            return ch;
        }
        // C: MENU_SEARCH after explicit page/gacc (PICK_ONE resp_len)
        if (ch === MENU_SEARCH) {
            const searchItems = menu_items_from_lets(byLet, entries);
            const res = await process_menu_search(
                searchItems, PICK_ONE, counting, count,
            );
            if (res.kind === 'finish' && res.item?.selector) {
                take();
                await dismiss_nhw_menu();
                return res.item.selector;
            }
            continue;
        }
        // invalid / other-page letter → re-prompt same page
    }
}

/**
 * C invent.c display_pickinv wizid_fakeobj — `'_'` / override_ID group
 * accel selects identify_pack(0, FALSE).
 */
export const WIZID_FAKEOBJ = { _wizid_fake: true };

/**
 * C invent.c display_pickinv wizid `:3222–3325`.
 * Title; unid_cnt==0 all-identified string; else `'_'` SKIPINVERT +
 * visctrl(^I) when unid_cnt>1; skip fully identified; sortpack class
 * headers (want_reply is FALSE so no showsym); item gacc def_oc_syms.
 * Empty invent is not this menu (C n==0 pline).
 * @returns {{ unid_cnt: number, items: object[] }}
 */
export function build_wizid_pickinv_items() {
    const inv = game.invent || [];
    const unid_cnt = count_unidentified(inv);
    let prompt = 'Debug Identify';
    if (unid_cnt) {
        prompt += ` -- unidentified or partially identified item${
            unid_cnt === 1 ? '' : 's'
        }`;
    }
    const items = [{ text: prompt, attr: 0, selectable: false }];
    if (!unid_cnt) {
        items.push({
            text: '(all items are permanently identified already)',
            attr: 0,
            selectable: false,
        });
        return { unid_cnt, items };
    }
    const override_ID = (game.iflags?.override_ID | 0) || 9;
    let selprompt = `select ${
        unid_cnt === 1 ? 'it' : 'any or all of them'
    } to permanently identify`;
    if (unid_cnt > 1) {
        selprompt += ` (${visctrl(override_ID)} for all)`;
    }
    items.push({
        text: selprompt,
        attr: 0,
        selectable: true,
        selector: '_',
        gselector: String.fromCharCode(override_ID & 255),
        itemflags: MENU_ITEMFLAGS_SKIPINVERT,
        obj: WIZID_FAKEOBJ,
    });
    const sortpack = game.flags?.sortpack !== false;
    let sortflags = (game.flags?.sortloot === 'f') ? SORTLOOT_LOOT : SORTLOOT_INVLET;
    if (sortpack) sortflags |= SORTLOOT_PACK;
    const sorted = sortloot(inv, sortflags, false, null);
    let prevclass = -1;
    for (const srt of sorted) {
        const otmp = srt.obj;
        if (!otmp) continue;
        if (!not_fully_identified(otmp)) continue;
        if (sortpack && otmp.oclass !== prevclass) {
            items.push({
                text: let_to_name(otmp.oclass, false, false),
                attr: ATR_INVERSE,
                selectable: false,
            });
            prevclass = otmp.oclass;
        }
        if (!Blind()) observe_object(otmp);
        obj_glyph(otmp);
        const letch = otmp.invlet || '?';
        items.push({
            text: doname(otmp),
            attr: 0,
            selectable: true,
            selector: letch,
            gselector: pickinv_item_gacc(otmp, true),
            itemflags: MENU_ITEMFLAGS_NONE,
            obj: otmp,
        });
    }
    return { unid_cnt, items };
}

/**
 * C ref: invent.c display_pickinv wizid branch (wizard && override_ID).
 * Empty invent → "Not carrying anything." unid_cnt==0 → all-identified
 * strings then dismiss. unid_cnt>0 → PICK_ANY (`'_'`/^I identify_pack,
 * per-item identify, sortpack headers, SKIPINVERT). override_ID=0 before
 * identify so nested update_inventory is not wizid. Named omissions:
 * MENU_PREV/FIRST/LAST; count-prefix digits.
 */
async function display_pickinv_wizid() {
    const inv = game.invent || [];
    if (!inv.length) {
        await pline('Not carrying anything.');
        return;
    }
    const { unid_cnt, items } = build_wizid_pickinv_items();
    if (!unid_cnt) {
        await paint_corner_nhw_menu(items, '(end) ');
        await flush_screen(1);
        await nhgetch();
        await dismiss_nhw_menu();
        return;
    }
    const selected = await select_menu_pick_any(items);
    if (game.iflags) game.iflags.override_ID = 0;
    let all_id = false;
    for (const it of selected) {
        const otmp = it.obj;
        if (otmp === WIZID_FAKEOBJ) {
            await identify_pack(0, false);
            all_id = true;
            break;
        } else if (otmp && not_fully_identified(otmp)) {
            await identify(otmp);
        }
    }
    if (!all_id) update_inventory();
}

/**
 * C ref: invent.c display_inventory(NULL, FALSE) / display_pickinv PICK_NONE.
 * C ref: wintty.c tty_end_menu — lmax=rows-1; npages>1 → process_menu_window
 *        "(N of M)" paging (select_menu PICK_NONE). Single-page corner vs
 *        fullscreen still uses "(end) ".
 * Shows invent and waits for a dismiss key (Space advances pages).
 * When wizard && iflags.override_ID → wizid Debug Identify path
 * (unid_cnt>0 PICK_ANY is D-1590).
 * Optional lets (invlets) + want_reply match C display_inventory
 * (`:3428–3452`); ggetobj `'i'` uses want_reply ESC abort (D-1602).
 * Canned CMDQ_KEY (D-1686): cmdq_pop before display_pickinv; matching
 * invent invlet (optional class-sym filter) returns that letter.
 */
export async function display_inventory(lets, want_reply) {
    /* C invent.c `:3427–3452` — cmdq_pop before display_pickinv. */
    const cmdq = cmdq_pop();
    if (cmdq) {
        const isKey = cmdq.typ === CMDQ_KEY || cmdq.typ === 'key';
        if (isKey) {
            const keych = typeof cmdq.key === 'string'
                ? cmdq.key
                : String.fromCharCode(cmdq.key | 0);
            const letsStr = lets == null ? '' : String(lets);
            for (const otmp of game.invent || []) {
                if (!otmp || otmp.invlet !== keych) continue;
                if (!letsStr.length) return otmp.invlet;
                const ocsym = def_oc_syms[otmp.oclass]?.sym;
                if (ocsym && letsStr.includes(ocsym)) return otmp.invlet;
            }
        }
        /* not a key, or no matching object — abort remaining canned */
        cmdq_clear();
        return '';
    }

    const wizard = !!(game.flags?.debug || game.flags?.wizard);
    // C display_pickinv `:3140–3147` — n==0 returns before reassign;
    // then !invlet_constant reassign before wizid / menu.
    if ((game.invent || []).length && !invlet_constant()) reassign();
    if (wizard && (game.iflags?.override_ID | 0)) {
        await display_pickinv_wizid();
        return 0;
    }

    const lines = invent_lines(lets); // includes trailing "(end)"
    const menuItems = lines.slice(0, -1);
    const rows = display()?.rows || 24;
    // C ref: wintty.c tty_end_menu lmax = min(52, rows-1)
    const lmax = Math.min(52, rows - 1);
    const nitems = menuItems.length;
    const npages = Math.max(1, Math.floor((nitems + lmax - 1) / lmax));

    // C: npages>1 → process_menu_window pages with "(1 of 2)" etc.
    // select_menu_pick_none already matches that path (D-0122).
    if (npages > 1) {
        await select_menu_pick_none(menuItems);
        return 0;
    }

    const morestr = '(end) ';
    const { offx } = nhw_menu_geometry(menuItems, morestr);
    const maxrow = menuItems.length + 1;
    // C: offx==10 || maxrow>=rows || !menu_overlay → fullscreen (offx forced 0)
    const fullscreen = offx === 0 || maxrow >= 24;

    if (fullscreen) {
        // Full-screen menu: leading space on each line, "(end) " on last row,
        // no status bar. Cursor just past "(end) ".
        const painted = menuItems.map(e => ({
            text: ` ${e.text}`,
            attr: e.attr,
        }));
        painted.push({ text: ' (end) ', attr: 0 });
        paint_overlay(painted, {
            col: 0,
            withStatus: false,
            cursor: [7, menuItems.length],
        });
    } else {
        // Corner NHW_MENU — keep map/status (D-0023 geometry helper).
        await paint_corner_nhw_menu(menuItems, morestr);
    }
    await flush_screen(1);
    const key = await nhgetch(); // dismiss (Esc / space)
    // Fullscreen invent sets no corner geom — dismiss → docrt (C).
    if (fullscreen) game._tty_menu_geom = { offx: 0, endRow: menuItems.length };
    await dismiss_nhw_menu();
    if (want_reply) {
        if (key === 27) return '\x1b';
        return typeof key === 'number' ? String.fromCharCode(key) : key;
    }
    return 0;
}

/** C hacklib.c s_suffix — it→its, you→your, *s/*z/*x/*ch/*sh → *', else *'s. */
function s_suffix_inv(s) {
    if (!s) return s;
    if (s === 'it' || s === 'It') return 'its';
    if (s === 'you' || s === 'You') return 'your';
    if (s.endsWith('s') || s.endsWith('z') || s.endsWith('x')
        || s.endsWith('ch') || s.endsWith('sh')) {
        return `${s}'`;
    }
    return `${s}'s`;
}

/**
 * C ref: invent.c display_minventory :5340–5386.
 * Callers: zap.c probe_monster MINV_ALL|MINV_NOLET|PICK_NONE (D-1426);
 * look_here swallowed MINV_ALL|PICK_NONE (title supplied).
 * Branch envelope: MINV_ALL → query_objlist analog (INVORDER_SORT
 * class headings + doname under suppress_price + PICK_NONE).
 * youmonst.data swap for "weapon in claw". Empty → "(none)".
 * Named omit: worn_wield_only / !MINV_ALL armament; PICK_ONE/ANY;
 * INCLUDE_HERO fake youmonst; sortloot loot-name; USE_INVLET letters
 * (MINV_NOLET / PICK_NONE skip them); invdisp_nothing NHW_MENU polish.
 * @returns {Promise<object|null>} selected object (PICK_NONE → null)
 */
export async function display_minventory(mon, dflags, title) {
    if (!mon) return null;
    const do_all = (dflags & MINV_ALL) !== 0;
    void MINV_NOLET; // letters skipped: !USE_INVLET + PICK_NONE
    void PICK_NONE;
    let hdr = title;
    if (!hdr) {
        const { noit_Monnam } = await import('./do_name.js');
        hdr = `${s_suffix_inv(noit_Monnam(mon))} ${
            do_all ? 'possessions' : 'armament'}:`;
    }
    const headingAttr = game.program_state?.gameover ? 0 : ATR_INVERSE;
    const items = [];
    for (let otmp = mon.minvent; otmp; otmp = otmp.nobj) items.push(otmp);
    const incl_hero = do_all && engulfing_u(mon);
    // INCLUDE_HERO fake-hero row named
    void incl_hero;
    const have_any = items.length > 0;
    if (!(do_all ? have_any : false)) {
        await select_menu_pick_none([
            { text: hdr, attr: headingAttr },
            { text: '', attr: 0 },
            { text: '(none)', attr: 0 },
        ]);
        return null;
    }
    if (!game.youmonst) game.youmonst = { _youmonst: true };
    if (!game.iflags) game.iflags = {};
    const savedData = game.youmonst.data;
    game.youmonst.data = mon.data;
    // C iflags.suppress_price++ so doname_with_price ≡ doname
    game.iflags.suppress_price = (game.iflags.suppress_price | 0) + 1;
    try {
        const entries = [{ text: hdr, attr: headingAttr }];
        const classes = DEF_INV_ORDER.includes(VENOM_CLASS)
            ? [...DEF_INV_ORDER]
            : [...DEF_INV_ORDER, VENOM_CLASS];
        for (const oclass of classes) {
            const group = items.filter((o) => (o.oclass | 0) === oclass);
            if (!group.length) continue;
            entries.push({ text: let_to_name(oclass), attr: headingAttr });
            for (const otmp of group) {
                obj_glyph(otmp);
                entries.push({ text: doname(otmp), attr: 0 });
            }
        }
        const rows = display()?.rows || 24;
        const lmax = Math.min(52, rows - 1);
        if (entries.length > lmax) {
            await select_menu_pick_none(entries);
        } else {
            await paint_corner_nhw_menu(entries, '(end) ');
            await flush_screen(1);
            await nhgetch();
            await dismiss_nhw_menu();
        }
    } finally {
        game.iflags.suppress_price = (game.iflags.suppress_price | 0) - 1;
        game.youmonst.data = savedData;
    }
    return null;
}

const LENSES_OTYP = objectNames.indexOf('LENSES');
const ARM_GLOVES_CAT = 3;
const ARM_BOOTS_CAT = 4;

/** C obj.h pair_of — lenses / gloves / boots. oc_skill ≡ oc_armcat. */
function pair_of_inv(obj) {
    if (!obj) return false;
    if (LENSES_OTYP >= 0 && (obj.otyp | 0) === LENSES_OTYP) return true;
    if ((obj.oclass | 0) !== ARMOR_CLASS) return false;
    const cat = game.objects?.[obj.otyp]?.oc_skill | 0;
    return cat === ARM_GLOVES_CAT || cat === ARM_BOOTS_CAT;
}

/**
 * C invent.c query_objlist PICK_NONE analog for display_binventory.
 * INVORDER_SORT uses class headings; else nexthere order (pool overlay).
 */
async function query_objlist_pick_none_binv(title, items, invorder_sort) {
    const headingAttr = game.program_state?.gameover ? 0 : ATR_INVERSE;
    const entries = [{ text: title, attr: headingAttr }];
    if (!game.iflags) game.iflags = {};
    game.iflags.suppress_price = (game.iflags.suppress_price | 0) + 1;
    try {
        if (invorder_sort) {
            const classes = DEF_INV_ORDER.includes(VENOM_CLASS)
                ? [...DEF_INV_ORDER]
                : [...DEF_INV_ORDER, VENOM_CLASS];
            for (const oclass of classes) {
                const group = items.filter((o) => (o.oclass | 0) === oclass);
                if (!group.length) continue;
                entries.push({ text: let_to_name(oclass), attr: headingAttr });
                for (const otmp of group) {
                    obj_glyph(otmp);
                    entries.push({ text: doname(otmp), attr: 0 });
                }
            }
        } else {
            for (const otmp of items) {
                obj_glyph(otmp);
                entries.push({ text: doname(otmp), attr: 0 });
            }
        }
    } finally {
        game.iflags.suppress_price = (game.iflags.suppress_price | 0) - 1;
    }
    const rows = display()?.rows || 24;
    const lmax = Math.min(52, rows - 1);
    if (entries.length > lmax) {
        await select_menu_pick_none(entries);
    } else {
        await paint_corner_nhw_menu(entries, '(end) ');
        await flush_screen(1);
        await nhgetch();
        await dismiss_nhw_menu();
    }
}

/**
 * C invent.c display_binventory :5488–5546 — buried / underwater overlay.
 * Only caller: zap.c zap_updown WAN_PROBING down (D-1444).
 * as_if_seen → observe_object on buried at <x,y>. Return n+n2.
 * Named omit: query_objlist PICK_ONE/ANY; go.only coord filter
 * (we pre-filter buried by ox/oy).
 */
export async function display_binventory(x, y, as_if_seen) {
    let n2 = 0;
    let underwhat = 'here';
    const { is_pool, is_lava } = await import('./hack.js');
    if ((is_pool(x, y) || is_lava(x, y)) && !game.u?.Underwater) {
        const obj = objects_at(x, y);
        if (obj) {
            const { hliquid } = await import('./do_name.js');
            const real_liquid = is_pool(x, y) ? 'water' : 'lava';
            const seen_liquid = hliquid(real_liquid);
            if (!obj.nexthere) {
                let more_than_1 = (obj.quan | 0) !== 1;
                await pline(
                    `There ${more_than_1 ? 'are' : 'is'} ${doname(obj)} under the ${seen_liquid} here.`,
                );
                n2 = 1;
                if (pair_of_inv(obj)) more_than_1 = true;
                underwhat = more_than_1 ? 'under them' : 'beneath it';
            } else {
                const items = [];
                for (let o = obj; o; o = o.nexthere) items.push(o);
                n2 = items.length;
                await query_objlist_pick_none_binv(
                    `Things that are under the ${seen_liquid} here:`,
                    items,
                    false,
                );
                underwhat = 'beneath them';
            }
        }
    }

    const buried = [];
    for (let obj = game.level?.buriedobjlist || null; obj; obj = obj.nobj) {
        if ((obj.ox | 0) === (x | 0) && (obj.oy | 0) === (y | 0)) {
            if (as_if_seen) observe_object(obj);
            buried.push(obj);
        }
    }
    const n = buried.length;
    if (n) {
        await query_objlist_pick_none_binv(
            `Things that are buried ${underwhat}:`,
            buried,
            true,
        );
    }
    return n + n2;
}

/** C invent.c cinv_doname :5391–5418 — insert "trapped" before lock word. */
function cinv_doname(obj) {
    let result = doname(obj);
    if (!obj?.otrapped) return result;
    const p = result.indexOf(' locked');
    const q = result.indexOf(' unlocked');
    if (p >= 0 && (q < 0 || p < q)) {
        result = result.replace(' locked ', ' trapped locked ');
    } else if (q >= 0) {
        result = result.replace(' unlocked ', ' trapped unlocked ');
    }
    return result.replace('an trapped ', 'a trapped ');
}

/**
 * C invent.c display_cinventory :5446–5473 — container/statue contents.
 * Caller: zap.c bhito WAN_PROBING (D-1445). Title via cinv_doname.
 * PICK_NONE query_objlist analog; empty → "(empty)". Always cknown.
 * Named omit: safe_qbuf overflow → cinv_ansimpleoname; PICK_ONE.
 * @returns {Promise<object|null>}
 */
export async function display_cinventory(obj) {
    if (!obj) return null;
    const headingAttr = game.program_state?.gameover ? 0 : ATR_INVERSE;
    const qbuf = `Contents of ${cinv_doname(obj)}:`;
    const items = [];
    for (let otmp = obj.cobj; otmp; otmp = otmp.nobj) items.push(otmp);
    if (items.length) {
        await query_objlist_pick_none_binv(qbuf, items, true);
    } else {
        await select_menu_pick_none([
            { text: qbuf, attr: headingAttr },
            { text: '', attr: 0 },
            { text: '(empty)', attr: 0 },
        ]);
    }
    obj.cknown = 1;
    return null;
}

/**
 * C ref: invent.c ddoinv → dispinv_with_action(NULL, FALSE, NULL).
 * PICK_ONE invent letter → itemactions (D-0467).
 */
export async function ddoinv() {
    const { dispinv_with_action } = await import('./iactions.js');
    return await dispinv_with_action(null, false, null);
}

/**
 * C ref: o_init.c discover_object(oindx, mark_as_known, mark_as_encountered,
 *                                credit_hero) `:453–494`.
 * credit_hero → exercise(A_WIS, TRUE) when newly naming the type.
 * in_moveloop && !gameover → gem_learned(GEM_CLASS) then update_inventory.
 */
export function discover_object(
    oindx,
    mark_as_known,
    mark_as_encountered = false,
    credit_hero = false,
) {
    if (oindx == null || oindx < FIRST_OBJECT) return;
    const objects = game.objects;
    if (!objects?.[oindx]) return;
    if (!game.disco) game.disco = new Array(NUM_OBJECTS).fill(0);

    const samuraiJp = game.urole?.mnum === PM_SAMURAI
        && !!Japanese_item_name(oindx, null);
    const need =
        (mark_as_known && !objects[oindx].oc_name_known)
        || (mark_as_encountered && !objects[oindx].oc_encountered)
        || samuraiJp;
    if (!need) return;

    const acls = objects[oindx].oc_class;
    const bases = game.bases || [];
    let dindx = bases[acls] || 0;
    while (dindx < game.disco.length && game.disco[dindx] !== 0) {
        if (game.disco[dindx] === oindx) break;
        dindx++;
    }
    if (dindx < game.disco.length) game.disco[dindx] = oindx;
    if (mark_as_encountered) objects[oindx].oc_encountered = 1;
    if (mark_as_known && !objects[oindx].oc_name_known) {
        objects[oindx].oc_name_known = 1;
        if (credit_hero) exercise(A_WIS, true);
        const ps = game.program_state || {};
        if ((ps.in_moveloop | 0) && !ps.gameover) {
            if ((objects[oindx].oc_class | 0) === GEM_CLASS) {
                gem_learned(oindx);
            }
            update_inventory();
        }
    }
}

/** C ref: hack.h makeknown — discover_object(x, TRUE, TRUE, TRUE). */
export function makeknown(otyp) {
    discover_object(otyp, true, true, true);
}

/**
 * C invent.c sync_perminvent `:5564–5658`.
 * Default Off: WIN_INVEN WIN_ERR, core_invent_state 0, static wri null
 * → return before display. On: request_settings then
 * display_inventory(NULL, FALSE) PICK_NONE (no nhgetch).
 * On: request_settings (assesstty) then display_inventory(NULL, FALSE).
 * too_small: C pline + wait_synch (D-1646; messages fit 80 cols).
 */
export function sync_perminvent() {
    const iflags = game.iflags || (game.iflags = {});
    if (!game.gc) game.gc = {};
    if (!game.gi) game.gi = {};
    if (!game.gp) game.gp = {};
    const win_inven_id = game.WIN_INVEN ?? WIN_ERR;
    const prohibited = (wri_info.tocore.tocore_flags | 0) & TOCORE_PROHIBITED;
    const togglingOn = in_perm_invent_toggled
        && (game.gp.perm_invent_toggling_direction | 0) === toggling_on;

    if (win_inven_id === WIN_ERR) {
        if (((game.gc.core_invent_state | 0) || prohibited) && !togglingOn) {
            return;
        }
    }
    prepare_perminvent(game.WIN_INVEN ?? WIN_ERR);

    if (!iflags.perm_invent && (game.gc.core_invent_state | 0)) {
        perm_invent_toggled(true);
        // C: docrt();
        return;
    }

    if ((iflags.perm_invent && !(game.gc.core_invent_state | 0))
        || (!iflags.perm_invent && togglingOn)) {
        if ((iflags.perm_invent && !(game.gc.core_invent_state | 0))
            || in_perm_invent_toggled) {
            sync_wri = ctrl_nhwindow_perm(
                game.WIN_INVEN ?? WIN_ERR,
                fromcore_request_settings,
                wri_info,
            );
            if (sync_wri) {
                const tflags = sync_wri.tocore.tocore_flags | 0;
                if (tflags & TOCORE_TOO_EARLY) {
                    iflags.perm_invent_pending = true;
                    return;
                }
                if (tflags & (TOCORE_TOO_SMALL | TOCORE_PROHIBITED)) {
                    if (tflags & TOCORE_PROHIBITED) {
                        /* C set_option_mod_status perm_invent/perminv_mode named */
                    }
                    iflags.perm_invent = false;
                    ttyinv_destroy();
                    const wport_id = 'tty perm_invent';
                    const tc = sync_wri.tocore;
                    void pline(`${wport_id} could not be enabled.`);
                    void pline(
                        `${wport_id} needs a terminal that is at least ${tc.needrows}x${tc.needcols}, yours is ${tc.haverows}x${tc.havecols}.`,
                    );
                    void tty_wait_synch();
                    return;
                }
            }
            game.gc.core_invent_state = (game.gc.core_invent_state | 0) + 1;
        }
    }

    if (!sync_wri || !(sync_wri.tocore.maxslot | 0)) return;

    if (togglingOn) {
        game.WIN_INVEN = WIN_INVEN_ID;
    }

    if ((game.WIN_INVEN ?? WIN_ERR) !== WIN_ERR
        && (game.program_state?.beyond_savefile_load | 0)) {
        game.gi.in_sync_perminvent = 1;
        const built = pickinv_build_perm();
        game.gi.perminvent_entries = built.entries;
        game.gi.perminvent_listed = built.listed;
        game.gi.in_sync_perminvent = 0;
    }
}

/**
 * C ref: invent.c update_inventory.
 * Skip when !in_moveloop or suppress_map_output(); else suppress_price=0
 * around win_update_inventory(0). TTY_PERM_INVENT → sync_perminvent.
 */
export function update_inventory() {
    if (!(game.program_state?.in_moveloop | 0)) return;
    if (suppress_map_output()) return;
    const iflags = game.iflags || (game.iflags = {});
    const save_suppress_price = iflags.suppress_price | 0;
    iflags.suppress_price = 0;
    // C wintty.c tty_update_inventory — TTY_PERM_INVENT calls sync_perminvent.
    sync_perminvent();
    iflags.suppress_price = save_suppress_price;
}

/**
 * C ref: invent.c useupall `:1311–1317` — setnotworn, freeinv, then
 * obfree(obj, NULL) (contents + shop bill). Callee shk.c obfree is
 * D-1727. Named: nhl_gamestate leftover (do.js tutorial stash);
 * delobj still extract-only.
 */
export function useupall(obj) {
    if (!obj) return;
    setnotworn(obj);
    freeinv(obj);
    obfree(obj, null);
}

/**
 * C ref: invent.c useup `:1320–1333` — quan>1: in_use=FALSE, quan--,
 * weight, update_inventory; else useupall. write.c dowrite paper
 * (D-1735). Named: eat.js hybrid still useup+useupf; detect/potion/
 * read/spell local clones; full dealloc_obj.
 */
export function useup(obj) {
    if (obj.quan > 1) {
        obj.in_use = false;
        obj.quan--;
        obj.owt = weight(obj);
        update_inventory();
    } else {
        useupall(obj);
    }
}

/**
 * C ref: invent.c consume_obj_charge `:1336–1346` — maybe check_unpaid,
 * then spe--, then update_inventory when known so perm_invent sees the
 * new charge (tty_update_inventory → sync_perminvent). Unpaid is D-1047;
 * InvInUse helpers are D-1600; writers are D-1603.
 * Named: pickup tip-spill / trap disarm_squeaky_board callers.
 * use_grease trailing update_inventory is D-1656.
 * @param {object} obj
 * @param {boolean} maybe_unpaid false if caller handles shop billing
 */
export async function consume_obj_charge(obj, maybe_unpaid) {
    if (!obj) return;
    if (maybe_unpaid) {
        const { check_unpaid } = await import('./shk.js');
        await check_unpaid(obj);
    }
    obj.spe = (obj.spe | 0) - 1;
    // C invent.c:1344–1345 — skip when !known (charge count still secret).
    if (obj.known) update_inventory();
}

/**
 * C ref: o_init.c dodiscovered() — discoveries by inv_order within each class.
 * C: wintty tty_putstr(NHW_TEXT) pages at rows-1; display_nhwindow + dmore.
 * Named omissions: discosort a/c/s; unique/relics + artifact pseudo-classes;
 * menu_requested choose_disco_sort; flags.inv_order overrides (DEF_INV_ORDER).
 */
export async function dodiscovered() {
    const lines = [
        { text: 'Discoveries, by order of discovery within each class', attr: 0 },
        { text: '', attr: 0 },
    ];
    const bases = game.bases || [];
    const disco = game.disco || [];
    // C: Strcpy(classes, flags.inv_order); append VENOM_CLASS if absent.
    const classes = DEF_INV_ORDER.includes(VENOM_CLASS)
        ? [...DEF_INV_ORDER]
        : [...DEF_INV_ORDER, VENOM_CLASS];
    let ct = 0;
    for (const oclass of classes) {
        const found = [];
        const start = bases[oclass] || 0;
        const end = bases[oclass + 1] || disco.length;
        for (let i = start; i < end; i++) {
            const dis = disco[i];
            if (dis && interesting_to_discover(dis)) found.push(dis);
        }
        if (!found.length) continue;
        lines.push({
            text: CLASS_NAMES[oclass] || 'Items',
            attr: ATR_INVERSE,
        });
        for (const otyp of found) {
            ct++;
            const enc = !!game.objects?.[otyp]?.oc_encountered;
            const prefix = enc ? '  ' : '* ';
            // C: Strcpy(buf, prefix); disco_append_typename(buf, dis)
            lines.push({
                text: disco_append_typename(prefix, otyp),
                attr: 0,
            });
        }
    }
    if (ct === 0) {
        // C: You("haven't discovered anything yet...");
        await pline("You haven't discovered anything yet...");
        return;
    }
    // C: display_nhwindow(NHW_TEXT) → process_text_window page-at-a-time
    const { show_text_pages } = await import('./pager.js');
    await show_text_pages(lines);
}

// C ref: attrib.c attrname[]
const ATTR_NAMES = [
    'strength', 'intelligence', 'wisdom', 'dexterity', 'constitution', 'charisma',
];
// C: STR18(100) — human strength ceiling used by interesting_alimit
const STR18_100 = 18 + 100;

/**
 * C ref: insight.c attrval — Strength 18/xx encoding.
 */
function attrval(attrindx, attrvalue) {
    if (attrindx !== A_STR || attrvalue <= 18) return String(attrvalue);
    if (attrvalue > STR18_100) return String(attrvalue - 100);
    return `18/${String(attrvalue - 18).padStart(2, '0')}`;
}

/**
 * C ref: insight.c one_characteristic — current; limit when race ≠ human 18.
 * Branch envelope: no poly / Fixed_abil / cursed gauntlets hide path;
 * base/peak suffixes deferred until acurr≠abase cases appear.
 */
function one_characteristic_line(attrindx) {
    const u = game.u || {};
    const acurrent = acurr(attrindx);
    let valubuf = attrval(attrindx, acurrent);
    const abase = u.acurr?.a?.[attrindx] ?? acurrent;
    const apeak = u.amax?.a?.[attrindx] ?? abase;
    const alimit = game.urace?.attrmax?.[attrindx]
        ?? (attrindx === A_STR ? STR18_100 : 18);
    const interesting_alimit = alimit !== (attrindx !== A_STR ? 18 : STR18_100);
    let paren_pfx = ' (current; ';
    if (acurrent !== abase) {
        valubuf += `${paren_pfx}base:${attrval(attrindx, abase)}`;
        paren_pfx = ', ';
    }
    if (abase !== apeak) {
        valubuf += `${paren_pfx}peak:${attrval(attrindx, apeak)}`;
        paren_pfx = ', ';
    }
    if (interesting_alimit) {
        const innate = acurrent > alimit ? 'innate ' : '';
        valubuf += `${paren_pfx}${innate}limit:${attrval(attrindx, alimit)}`;
    }
    if (acurrent !== abase || abase !== apeak || interesting_alimit) {
        valubuf += ')';
    }
    return `  Your ${ATTR_NAMES[attrindx]} is ${valubuf}.`;
}

/**
 * C ref: insight.c basics_enlightenment autopickup line.
 * pickup_types in JS is already the symbol string from .nethackrc
 * (C stores class indices and uses oc_to_str).
 */
function autopickup_enlightenment_line() {
    const flags = game.flags || {};
    let buf;
    if (flags.pickup) {
        const ocl = String(flags.pickup_types || '');
        buf = 'on';
        // costly_spot shop disable deferred
        buf += ` for ${ocl ? `'${ocl}'` : 'all types'}`;
        // C default pickup_thrown is On
        if ((flags.pickup_thrown !== false) && ocl) buf += ' plus thrown';
        // ga.apelist exceptions deferred
    } else {
        buf = 'off';
    }
    return `  Autopickup is ${buf}.`;
}

// C ref: weapon.c skill_names_indices — positive entries are object otyps
const SKILL_NAME_OTYP = (() => {
    const idx = (n) => objectNames.indexOf(n);
    return {
        [P_DAGGER]: idx('DAGGER'),
        [P_KNIFE]: idx('KNIFE'),
        [P_AXE]: idx('AXE'),
        [P_PICK_AXE]: idx('PICK_AXE'),
        [P_SHORT_SWORD]: idx('SHORT_SWORD'),
        [P_BROAD_SWORD]: idx('BROADSWORD'),
        [P_LONG_SWORD]: idx('LONG_SWORD'),
        [P_TWO_HANDED_SWORD]: idx('TWO_HANDED_SWORD'),
        [P_CLUB]: idx('CLUB'),
        [P_MACE]: idx('MACE'),
        [P_MORNING_STAR]: idx('MORNING_STAR'),
        [P_FLAIL]: idx('FLAIL'),
        [P_QUARTERSTAFF]: idx('QUARTERSTAFF'),
        [P_SPEAR]: idx('SPEAR'),
        [P_TRIDENT]: idx('TRIDENT'),
        [P_LANCE]: idx('LANCE'),
        [P_BOW]: idx('BOW'),
        [P_SLING]: idx('SLING'),
        [P_CROSSBOW]: idx('CROSSBOW'),
        [P_DART]: idx('DART'),
        [P_SHURIKEN]: idx('SHURIKEN'),
        [P_BOOMERANG]: idx('BOOMERANG'),
        [P_UNICORN_HORN]: idx('UNICORN_HORN'),
    };
})();

/** C ref: weapon.c weapon_type — objects[].oc_skill (absolute value). */
function weapon_type(obj) {
    if (!obj) return P_BARE_HANDED_COMBAT;
    const o = objects()?.[obj.otyp];
    if (!o) return P_NONE;
    if (o.oc_class !== WEAPON_CLASS && o.oc_class !== TOOL_CLASS
        && o.oc_class !== GEM_CLASS) {
        return P_NONE;
    }
    const type = o.oc_skill | 0;
    return type < 0 ? -type : type;
}

/** C ref: weapon.c skill_name / P_NAME — skill category, not otyp racial name. */
function skill_name(skill) {
    if (skill === P_BARE_HANDED_COMBAT) {
        // C: barehands_or_martial[martial_bonus()]
        const m = game.urole?.mnum;
        return (m === PM_SAMURAI || m === PM_MONK)
            ? 'martial arts' : 'bare handed combat';
    }
    // C: odd_skill_names[] for skills without a representative otyp
    const odd = {
        [P_SABER]: 'saber',
        [P_HAMMER]: 'hammer',
        [P_POLEARMS]: 'polearms',
        [P_WHIP]: 'whip',
        [P_ATTACK_SPELL]: 'attack spells',
        [P_HEALING_SPELL]: 'healing spells',
        [P_DIVINATION_SPELL]: 'divination spells',
        [P_ENCHANTMENT_SPELL]: 'enchantment spells',
        [P_CLERIC_SPELL]: 'clerical spells',
        [P_ESCAPE_SPELL]: 'escape spells',
        [P_MATTER_SPELL]: 'matter spells',
        [P_TWO_WEAPON_COMBAT]: 'two weapon combat',
        [P_RIDING]: 'riding',
    };
    if (odd[skill] != null) return odd[skill];
    const otyp = SKILL_NAME_OTYP[skill];
    if (otyp != null && otyp >= 0) {
        const s = objectNameStrs[otyp];
        if (s) return s;
    }
    return 'weapon';
}

/**
 * C ref: wield.c empty_handed — gloves imply "empty handed".
 * Local copy avoids invent↔wield import cycle (weapon.js → invent).
 * Missing youmonst.data (set_uasmon deferred) treated as humanoid start form.
 */
function empty_handed() {
    if (game.u?.uarmg) return 'empty handed';
    const ptr = game.youmonst?.data;
    if (!ptr || humanoid(ptr)) return 'bare handed';
    return 'not wielding anything';
}

/** C ref: skills.h P_SKILL — current skill rank. */
function insight_P_SKILL(type) {
    return game.u?.weapon_skills?.[type]?.skill ?? P_ISRESTRICTED;
}

/**
 * C ref: weapon.c skill_level_name — title case; caller lowercases for insight.
 */
function insight_skill_level_name(skill) {
    switch (insight_P_SKILL(skill)) {
    case P_UNSKILLED: return 'Unskilled';
    case P_BASIC: return 'Basic';
    case P_SKILLED: return 'Skilled';
    case P_EXPERT: return 'Expert';
    case P_MASTER: return 'Master';
    case P_GRAND_MASTER: return 'Grand Master';
    default: return 'Unknown';
    }
}

/**
 * C ref: weapon.c weapon_descr — P_NAME(weapon_type); P_NONE → oclass name
 * (def_oc_syms[].name). Named omissions: ammo/sling/bow/crossbow/flail
 * hook/mattock specials; wet towel; shield of reflection.
 */
function weapon_descr(obj) {
    const skill = weapon_type(obj);
    if (skill === P_NONE && obj) {
        // C: corpses/tin/egg/statue/boulder/towel/opener → OBJ_NAME;
        // else def_oc_syms[oclass].name. Spellbook path is the live peel.
        const OC_NAME = {
            [WEAPON_CLASS]: 'weapon',
            [ARMOR_CLASS]: 'armor',
            [RING_CLASS]: 'ring',
            [AMULET_CLASS]: 'amulet',
            [TOOL_CLASS]: 'tool',
            [FOOD_CLASS]: 'food',
            [POTION_CLASS]: 'potion',
            [SCROLL_CLASS]: 'scroll',
            [SPBOOK_CLASS]: 'spellbook',
            [WAND_CLASS]: 'wand',
            [COIN_CLASS]: 'coin',
            [GEM_CLASS]: 'gem',
            [ROCK_CLASS]: 'rock',
            [BALL_CLASS]: 'iron ball',
            [CHAIN_CLASS]: 'chain',
        };
        return OC_NAME[obj.oclass] || 'weapon';
    }
    return skill_name(skill);
}

/**
 * C ref: insight.c weapon_insight wield line — an(weapon_descr(uwep)).
 */
function pretty_weapon_descr(obj) {
    const what = weapon_descr(obj);
    const quan = obj.quan || 1;
    if (quan !== 1) return `${quan} ${what}s`;
    const article = 'aeiou'.includes((what[0] || 'x').toLowerCase()) ? 'an' : 'a';
    return `${article} ${what}`;
}

/**
 * C ref: mhitu.c magic_negation — worn armor a_can (objects.oc_level for armor)
 * plus Protection bumps. Branch envelope: worn W_ARMOR a_can max; amulet/
 * extrinsic Protection deferred until a seed needs them.
 */
function magic_negation_you() {
    let mc = 0;
    for (const o of game.invent || []) {
        if (((o.owornmask || 0) & W_ARMOR) !== 0) {
            // C: objects[o->otyp].a_can — packed as oc_level for armor
            const armpro = game.objects?.[o.otyp]?.oc_level ?? 0;
            if (armpro > mc) mc = armpro;
        }
    }
    return mc;
}

/**
 * C ref: insight.c enlght_line — " %s%s%s%s." + not-contractions.
 */
function enlght_line_txt(start, middle, end, ps = '') {
    let buf = ` ${start}${middle}${end}${ps}.`;
    const contra = [
        [' are not ', " aren't "],
        [' were not ', " weren't "],
        [' have not ', " haven't "],
        [' had not ', " hadn't "],
        [' can not ', " can't "],
        [' could not ', " couldn't "],
    ];
    if (buf.includes(' not ')) {
        for (const [from, to] of contra) {
            if (buf.includes(from)) buf = buf.split(from).join(to);
        }
    }
    return buf;
}

/**
 * C ref: insight.c background_enlightenment location clause (you_are arg).
 * Ported: In_endgame + endgamelevelname / Elemental prefix; Is_knox;
 * quest dunlev vs depth; Is_rogue_level annotation.
 * Named omissions: Is_bigroom + !Blind ", a very big room".
 * observable_depth ≡ depth (C #if0 plane remap unused).
 */
function background_dungeon_clause(uz = game.u?.uz) {
    const lev = uz || { dnum: 0, dlevel: 1 };
    if (In_endgame(lev)) {
        const tmpbuf = endgamelevelname(depth(lev));
        const elemental = tmpbuf.startsWith('Plane') ? 'Elemental ' : '';
        return `in the endgame, on the ${elemental}${tmpbuf}`;
    }
    if (Is_knox_level(lev)) {
        const dname = game.dungeons?.[lev.dnum | 0]?.dname || 'Fort Knox';
        return `on the ${dname} level`;
    }
    let dgnbuf = game.dungeons?.[lev.dnum | 0]?.dname || 'The Dungeons of Doom';
    if (/^The /i.test(dgnbuf)) {
        dgnbuf = dgnbuf.charAt(0).toLowerCase() + dgnbuf.slice(1);
    }
    let tmpbuf = `level ${In_quest(lev) ? (lev.dlevel | 0) : depth(lev)}`;
    if (Is_rogue_level(lev)) tmpbuf += ', a primitive area';
    return `in ${dgnbuf}, on ${tmpbuf}`;
}

/**
 * C ref: insight.c background_enlightenment role/rank clause (you_are body).
 * !strcmpi(rank_titl, role_titl) → omit role, urace.noun, no "a " before level;
 * else → "a level N … adj role". Upolyd "actually " prefix deferred to callers.
 */
function background_role_level_clause(rank, role, ulevel, genderPart, urace) {
    const raceNoun = urace?.noun || urace?.name || 'human';
    const raceAdj = urace?.adj || urace?.name || 'human';
    if (String(rank).toLowerCase() === String(role).toLowerCase()) {
        return `${an(rank)}, level ${ulevel} ${genderPart}${raceNoun}`;
    }
    return `${an(rank)}, a level ${ulevel} ${genderPart}${raceAdj} ${role}`;
}

/** C youprop.h Deaf ≡ HDeaf || EDeaf || uroleplay.deaf */
function hero_Deaf(u = game.u || {}) {
    return !!((u.HDeaf | 0) || (u.EDeaf | 0) || u.uroleplay?.deaf || u.Deaf);
}

// C ref: eat.c hu_stat[] — trailing spaces stripped like mungspaces.
const HU_STAT = [
    'Satiated', '', 'Hungry', 'Weak', 'Fainting', 'Fainted', 'Starved',
];

// C ref: botl.c enc_stat[] — insight lowercases for you_are.
const ENC_STAT_NAME = [
    '', 'Burdened', 'Stressed', 'Strained', 'Overtaxed', 'Overloaded',
];

/**
 * C ref: insight.c status_enlightenment hunger arm — hu_stat + not hungry.
 * Wizard appends ` <%d>` u.uhunger.
 */
function status_hunger_attr(u = game.u || {}) {
    const uhs = u.uhs ?? NOT_HUNGRY;
    let buf = (HU_STAT[uhs] || '').trim();
    if (!buf) buf = 'not hungry';
    buf = buf.charAt(0).toLowerCase() + buf.slice(1);
    if (buf === 'weak') buf += ' from severe hunger';
    else if (buf.startsWith('faint')) buf += ' due to starvation';
    const wizard = !!(game.flags?.wizard || game.flags?.debug);
    if (wizard) buf += ` <${u.uhunger | 0}>`;
    return buf;
}

/**
 * C ref: insight.c status_enlightenment encumbrance arm.
 * Wizard appends ` <%d>` inv_weight() (before movement clause when laden).
 * @param {number} final ENL_* (0 = in progress)
 */
function status_encumbrance_attr(final = 0) {
    const wizard = !!(game.flags?.wizard || game.flags?.debug);
    const cap = near_capacity();
    if (cap > UNENCUMBERED) {
        let buf = (ENC_STAT_NAME[cap] || '?_?').toLowerCase();
        let adj = '?_?';
        switch (cap) {
        case SLT_ENCUMBER: adj = 'slightly'; break;
        case MOD_ENCUMBER: adj = 'moderately'; break;
        case HVY_ENCUMBER: adj = 'very'; break;
        case EXT_ENCUMBER: adj = 'extremely'; break;
        case OVERLOADED: adj = 'not possible'; break;
        default: break;
        }
        if (wizard) buf += ` <${inv_weight()}>`;
        buf += `; movement ${!final ? 'is' : 'was'} ${adj}`;
        if (cap < OVERLOADED) buf += ' slowed';
        return buf;
    }
    let buf = 'unencumbered';
    if (wizard) buf += ` <${inv_weight()}>`;
    return buf;
}

/**
 * C ref: insight.c cause_known(SLEEPY) — worn item with oc_oprop SLEEPY
 * when name known + dknown. oc_oprop not in objects table; RESTFUL_SLEEP
 * is the only SLEEPY conveyer in practice.
 */
function cause_known_sleepy() {
    const AMULET_OF_RESTFUL_SLEEP = objectNames.indexOf('AMULET_OF_RESTFUL_SLEEP');
    const mask = W_ARMOR | W_AMUL | W_RING | W_TOOL;
    const objs = objects();
    for (const o of game.invent || []) {
        if (!((o.owornmask || 0) & mask)) continue;
        if (o.otyp !== AMULET_OF_RESTFUL_SLEEP) continue;
        const oc = objs?.[o.otyp];
        if (oc?.oc_name_known && o.dknown) return true;
    }
    return false;
}

/** C ref: youprop.h Sleepy — HSleepy || ESleepy. */
function hero_Sleepy(u = game.u || {}) {
    return !!((u.HSleepy | 0) || (u.ESleepy | 0) || u.Sleepy);
}

/** C ref: youprop.h Poison_resistance — H || E. */
function hero_Poison_resistance(u = game.u || {}) {
    return !!((u.HPoison_resistance | 0) || (u.EPoison_resistance | 0)
        || u.Poison_resistance);
}

/** C ref: youprop.h Fire_resistance — H || E via flat + uprops[FIRE_RES]. */
function hero_Fire_resistance(u = game.u || {}) {
    const e = u.uprops?.[FIRE_RES];
    return !!((u.HFire_resistance | 0) || (u.EFire_resistance | 0)
        || u.Fire_resistance
        || (e?.intrinsic | 0) || (e?.extrinsic | 0));
}

/** C ref: youprop.h Shock_resistance — H || E via flat + uprops[SHOCK_RES]. */
function hero_Shock_resistance(u = game.u || {}) {
    const e = u.uprops?.[SHOCK_RES];
    return !!((u.HShock_resistance | 0) || (u.EShock_resistance | 0)
        || u.Shock_resistance
        || (e?.intrinsic | 0) || (e?.extrinsic | 0));
}

/**
 * C ref: youprop.h Blind_telepat — HTelepat || ETelepat
 * (uprops[TELEPAT] mirrors).
 */
function hero_Blind_telepat(u = game.u || {}) {
    const e = u.uprops?.[TELEPAT];
    return !!((u.HTelepat | 0) || (u.ETelepat | 0)
        || (e?.intrinsic | 0) || (e?.extrinsic | 0));
}

/** C ref: youprop.h Warning — HWarning || EWarning. */
function hero_Warning(u = game.u || {}) {
    const e = u.uprops?.[WARNING];
    return !!((u.HWarning | 0) || (u.EWarning | 0)
        || u.Warning
        || (e?.intrinsic | 0) || (e?.extrinsic | 0));
}

/** C ref: youprop.h Halluc_resistance — H || E via uprops[HALLUC_RES]. */
function hero_Halluc_resistance(u = game.u || {}) {
    const e = u.uprops?.[HALLUC_RES];
    return !!((e?.intrinsic | 0) || (e?.extrinsic | 0)
        || (u.HHalluc_resistance | 0) || (u.EHalluc_resistance | 0));
}

/**
 * C ref: youprop.h Hallucination — HHallucination && !Halluc_resistance
 * (flat u.Hallucination mirror accepted). Local copy — do_name imports us.
 */
function hero_Hallucination(u = game.u || {}) {
    if (u.Hallucination) return true;
    return !!((u.HHallucination | 0) && !hero_Halluc_resistance(u));
}

/** C ref: youprop.h Antimagic — H || E via flat + uprops[ANTIMAGIC]. */
function hero_Antimagic(u = game.u || {}) {
    const e = u.uprops?.[ANTIMAGIC];
    return !!((u.Antimagic || u.HAntimagic || u.EAntimagic)
        || (e?.intrinsic | 0) || (e?.extrinsic | 0));
}

/** C ref: youprop.h Reflecting — H || E via uprops[REFLECTING]. */
function hero_Reflecting(u = game.u || {}) {
    const e = u.uprops?.[REFLECTING];
    return !!((e?.intrinsic | 0) || (e?.extrinsic | 0)
        || (u.HReflecting | 0) || (u.EReflecting | 0));
}

/** C ref: youprop.h Lifesaved — uprops[LIFESAVED].extrinsic nonzero. */
function hero_Lifesaved(u = game.u || {}) {
    return !!((u.uprops?.[LIFESAVED]?.extrinsic | 0));
}

/** C ref: youprop.h Stealth — (H || E) && !B. */
function hero_Stealth(u = game.u || {}) {
    return !!(((u.HStealth | 0) || (u.EStealth | 0)) && !((u.BStealth | 0)));
}

/**
 * C ref: youprop.h Displaced — HDisplaced || EDisplaced
 * (uprops[DISPLACED].intrinsic || .extrinsic).
 */
function hero_Displaced(u = game.u || {}) {
    return !!(
        (u.HDisplaced | 0)
        || (u.EDisplaced | 0)
        || (u.uprops?.[DISPLACED]?.intrinsic | 0)
        || (u.uprops?.[DISPLACED]?.extrinsic | 0)
    );
}

/**
 * C ref: youprop.h Teleport_control —
 * HTeleport_control || ETeleport_control (uprops + flat mirrors).
 */
function hero_Teleport_control(u = game.u || {}) {
    return !!(
        (u.HTeleport_control | 0)
        || (u.ETeleport_control | 0)
        || u.Teleport_control
        || (u.uprops?.[TELEPORT_CONTROL]?.intrinsic | 0)
        || (u.uprops?.[TELEPORT_CONTROL]?.extrinsic | 0)
    );
}

/* C monattk.h — local for item_resistance_message / adtyp_to_prop */
const AD_FIRE = 2;
const AD_ELEC = 6;

/** C ref: zap.c adtyp_to_prop — subset used by item resistance enl. */
function adtyp_to_prop(dmgtyp) {
    if (dmgtyp === AD_FIRE) return FIRE_RES;
    if (dmgtyp === AD_ELEC) return SHOCK_RES;
    return 0;
}

/**
 * C ref: zap.c u_adtyp_resistance_obj — extrinsic armor/accessory/wep/art
 * → 99; dwarvish cloak cold/fire 90 deferred.
 */
function u_adtyp_resistance_obj(dmgtyp) {
    const prop = adtyp_to_prop(dmgtyp);
    if (!prop) return 0;
    const x = game.u?.uprops?.[prop]?.extrinsic | 0;
    if (x & (W_ARMOR | W_ACCESSORY | W_WEP | W_ART)) return 99;
    return 0;
}

/**
 * C ref: objnam.c suit_simple_name — dragon mail/scales + mail/jacket.
 * Local copy for item_what (do_wear.js suit_simple_name still defers dragon).
 */
function enl_suit_simple_name(suit) {
    if (!suit) return 'suit';
    const otyp = suit.otyp | 0;
    const grayMail = objectNames.indexOf('GRAY_DRAGON_SCALE_MAIL');
    const yellowMail = objectNames.indexOf('YELLOW_DRAGON_SCALE_MAIL');
    const grayScales = objectNames.indexOf('GRAY_DRAGON_SCALES');
    const yellowScales = objectNames.indexOf('YELLOW_DRAGON_SCALES');
    if (grayMail >= 0 && otyp >= grayMail && otyp <= yellowMail) {
        return 'dragon mail';
    }
    if (grayScales >= 0 && otyp >= grayScales && otyp <= yellowScales) {
        return 'dragon scales';
    }
    const suitnm = objectNameStrs[otyp] || '';
    if (suitnm.length > 5 && suitnm.endsWith(' mail')) return 'mail';
    if (suitnm.length > 7 && suitnm.endsWith(' jacket')) return 'jacket';
    return 'suit';
}

/**
 * C ref: zap.c item_what — wizard suffix " by your <slot simple name>".
 * Ported: W_ARM → suit_simple_name (dragon mail). Other slots deferred
 * until a seed needs them (cloak/helm/…/amulet/ring/wep).
 */
function item_what(dmgtyp) {
    const wizard = !!(game.flags?.wizard || game.flags?.debug);
    if (!wizard) return '';
    const prop = adtyp_to_prop(dmgtyp);
    const x = game.u?.uprops?.[prop]?.extrinsic | 0;
    if (!prop || !x) return '';
    const u = game.u || {};
    let what = null;
    if (x & W_ARMC) what = 'cloak';
    else if (x & W_ARM) what = enl_suit_simple_name(u.uarm);
    else if (x & W_ARMU) what = 'shirt';
    else if (x & W_ARMH) what = 'helmet';
    else if (x & W_ARMG) what = 'gloves';
    else if (x & W_ARMF) what = 'boots';
    else if (x & W_ARMS) what = 'shield';
    else if (x & (W_AMUL | W_TOOL)) {
        const o = (x & W_AMUL) ? u.uamul : u.ublindf;
        what = o ? (objectNameStrs[o.otyp] || 'item').toLowerCase().replace(/_/g, ' ') : null;
    } else if (x & W_RING) what = 'ring';
    else if (x & W_WEP) what = 'weapon';
    return what ? ` by your ${what}` : '';
}

/**
 * C ref: insight.c item_resistance_message — "Your items are [somewhat]
 * protected from …" + item_what.
 */
function item_resistance_message_lines(adtyp, prot_message, final, o) {
    const protection = u_adtyp_resistance_obj(adtyp);
    if (!protection) return [];
    const somewhat = protection < 99;
    const mid = final
        ? (somewhat ? 'were somewhat' : 'were')
        : (somewhat ? 'are somewhat' : 'are');
    return [o(enlght_line_txt(
        'Your items ', mid, prot_message, item_what(adtyp),
    ))];
}

/**
 * C ref: insight.c status_enlightenment — Hallucination + Deaf + Punished +
 * Wounded_legs + Sleepy + hunger + encumbrance subset (poly/ride/utrap/
 * Glib/Fumbling deferred).
 * Overlay (^X) lines need one extra leading space vs enlght_line.
 * @param {number} final
 * @param {{ overlay?: boolean, magic?: boolean }} opts
 */
function status_core_lines(final = 0, opts = {}) {
    const overlay = !!opts.overlay;
    const magic = !!opts.magic;
    const u = game.u || {};
    const You_ = 'You ';
    const are = 'are ';
    const were = 'were ';
    const have = 'have ';
    const had = 'had ';
    const mid = final ? were : are;
    const wrap = (attr) => {
        const line = enlght_line_txt(You_, mid, attr, '');
        return overlay ? ` ${line}` : line;
    };
    const wrap_have = (attr) => {
        const line = enlght_line_txt(You_, final ? had : have, attr, '');
        return overlay ? ` ${line}` : line;
    };
    const out = [];
    // C: after Confusion — if (Hallucination) you_are("hallucinating", "");
    // Stoned/Slimed/Strangled/Sick/Vomiting/Stunned/Confusion/Blind/… deferred.
    if (hero_Hallucination()) out.push(wrap('hallucinating'));
    // C: if (Deaf) you_are("deaf", from_what(DEAF)); from_what wizard-only
    if (hero_Deaf()) out.push(wrap('deaf'));
    // C: if (Punished) you_are("chained to %s", ansimpleoname(uball))
    // Punished ≡ (uball != 0)
    if (u.uball) {
        out.push(wrap(`chained to ${ansimpleoname(u.uball)}`));
    }
    // C: if (Wounded_legs) you_have("%swounded %s%s", …) when !usteed
    // (steed report wizard-only deferred)
    const hw = (u.HWounded_legs | 0) || (u.EWounded_legs | 0) || u.Wounded_legs;
    if (hw && !u.usteed) {
        const whichleg = (u.EWounded_legs | 0) & BOTH_SIDES;
        let bp = 'leg';
        let article = 'a ';
        let leftright = '';
        if (whichleg === BOTH_SIDES) {
            bp = 'legs';
            article = '';
        } else {
            leftright = whichleg === LEFT_SIDE ? 'left ' : 'right ';
        }
        out.push(wrap_have(`${article}wounded ${leftright}${bp}`));
    }
    // C: if (Sleepy) if (magic || cause_known(SLEEPY))
    //    enl_msg("You ", "fall", "fell", " asleep uncontrollably", …)
    if (hero_Sleepy() && (magic || cause_known_sleepy())) {
        const line = enlght_line_txt(
            You_,
            final ? 'fell' : 'fall',
            ' asleep uncontrollably',
            '',
        );
        out.push(overlay ? ` ${line}` : line);
    }
    out.push(wrap(status_hunger_attr()));
    out.push(wrap(status_encumbrance_attr(final)));
    return out;
}

/**
 * C ref: insight.c enlightenment — BASIC|MAGIC; final → putstr NHW_MENU
 * (--More-- pages), not ^X menu "(k of n)".
 * Named omissions: poly/vamp; night/midnight; SCORE_ON_BOTL; most
 * status troubles beyond Deaf/Sleepy; resistances/vision beyond
 * Poison_resistance/Searching/Infravision/Stealth; from_what suffixes;
 * wizard alignment number; blocked-Stealth / other appearance props.
 * @param {number} mode BASICENLIGHTENMENT | MAGICENLIGHTENMENT
 * @param {number} final ENL_GAMEINPROGRESS / GAMEOVERALIVE / GAMEOVERDEAD
 */
export async function enlightenment(mode, final = 0) {
    if (!final) {
        // C insight.c: en_via_menu = !final. MAGIC-only (potion/fountain/
        // wand/artifact) is not doattributes() — that ORs BASIC for ^X.
        await doattributes(mode);
        return;
    }
    const { show_nhw_menu_text } = await import('./pager.js');
    const { newuexp } = await import('./exper.js');
    const { Searching } = await import('./attrib.js');
    const { piousness } = await import('./insight.js');
    const {
        BASICENLIGHTENMENT, MAGICENLIGHTENMENT, ENL_GAMEOVERDEAD,
    } = await import('./const.js');

    const u = game.u || {};
    let name = game.plname || 'Hero';
    if (name.length && name.charCodeAt(0) >= 97 && name.charCodeAt(0) <= 122) {
        name = String.fromCharCode(name.charCodeAt(0) - 32) + name.slice(1);
    }
    const female = !!(game.flags?.female);
    const hasFemaleName = !!game.urole?.name?.f;
    const role = (female && game.urole?.name?.f)
        ? game.urole.name.f
        : (game.urole?.name?.m || 'Adventurer');
    // C insight.c enlightenment — rank_of(u.ulevel, Role_switch, innategend)
    const rank = rank_of(u.ulevel | 0, game.urole?.mnum, female);
    const gender = female ? 'female' : 'male';
    const atype = u.ualign?.type ?? A_NEUTRAL;
    const align = align_str(atype);
    const turns = game.moves | 0;
    const hand = (u.uhandedness === 1) ? 'left' : 'right';
    const allowGend = (game.urole?.allow ?? 0) & ROLE_GENDMASK;
    const innategend = female ? 1 : 0;
    const initgend = game.flags?.initgend ? 1 : 0;
    const genderPart = (!hasFemaleName
        && (allowGend === (ROLE_MALE | ROLE_FEMALE) || innategend !== initgend))
        ? `${gender} `
        : '';

    const are = 'are ';
    const were = 'were ';
    const have = 'have ';
    const had = 'had ';
    const You_ = 'You ';
    const you_are = (attr) => enlght_line_txt(You_, final ? were : are, attr, '');
    const you_have = (attr) => enlght_line_txt(You_, final ? had : have, attr, '');

    const lines = [];
    lines.push(`${name} the ${role}'s attributes:`);
    lines.push('');

    if (mode & BASICENLIGHTENMENT) {
        lines.push('Background:');
        // C: !strcmpi(rank, role) → noun + omit role (D-0928 #1194)
        lines.push(you_are(
            background_role_level_clause(
                rank, role, u.ulevel || 1, genderPart, game.urace,
            ),
        ));
        // mission line has no period; pantheon continuation finishes it
        lines.push(
            ` ${You_}${final ? were : are}${align}, on a mission for ${u_gname(game.urole, atype)}`,
        );
        let opposed = ` who ${final ? 'was' : 'is'} opposed by`;
        if (atype !== A_LAWFUL) {
            opposed += ` ${align_gname(game.urole, A_LAWFUL)} (${align_str(A_LAWFUL)}) and`;
        }
        if (atype !== A_NEUTRAL) {
            opposed += ` ${align_gname(game.urole, A_NEUTRAL)} (${align_str(A_NEUTRAL)})`;
            if (atype !== A_CHAOTIC) opposed += ' and';
        }
        if (atype !== A_CHAOTIC) {
            opposed += ` ${align_gname(game.urole, A_CHAOTIC)} (${align_str(A_CHAOTIC)})`;
        }
        opposed += '.';
        lines.push(opposed);
        lines.push(you_are(`${hand}-handed`));

        // C ref: insight.c background_enlightenment — In_endgame /
        // Is_knox / quest dunlev / rogue annotation
        lines.push(you_are(background_dungeon_clause(u.uz)));
        // C: moves==1 → just started; else entered N turns ago
        if (turns === 1) {
            lines.push(you_have('just started your adventure'));
        } else {
            lines.push(enlght_line_txt(You_, 'entered ', `the dungeon ${turns} turn${turns === 1 ? '' : 's'} ago`, ''));
        }

        // C ref: insight.c background_enlightenment — night/moon/friday
        // between "entered" and experience (final uses iflags.at_*).
        if (game.iflags?.at_midnight) {
            lines.push(enlght_line_txt('It ', 'was ', 'the midnight hour', ''));
        } else if (game.iflags?.at_night) {
            lines.push(enlght_line_txt('It ', 'was ', 'nighttime', ''));
        }
        const moon = game.flags?.moonphase;
        if (moon === FULL_MOON || moon === NEW_MOON) {
            const phase = moon === FULL_MOON ? 'full' : 'new';
            lines.push(enlght_line_txt(
                'There ',
                'was ',
                `a ${phase} moon in effect when your adventure ended`,
                '',
            ));
        }
        if (game.flags?.friday13) {
            lines.push(
                ` Bad things ${final === ENL_GAMEOVERDEAD ? 'happened' : 'could have happened'} on Friday the 13th.`,
            );
        }

        const uexp = u.uexp | 0;
        const ulvl = u.ulevel | 0;
        let xpbuf = `${uexp} experience point${uexp === 1 ? '' : 's'}`;
        if (ulvl < 30) {
            const nxtlvl = newuexp(ulvl);
            const delta = nxtlvl - uexp;
            xpbuf += `, ${delta} ${uexp > 0 ? 'more ' : ''}`;
            if (final) xpbuf += (delta === 1) ? 'was ' : 'were ';
            xpbuf += `${ulvl < 18 ? 'needed to attain' : 'needed for'} level ${ulvl + 1}`;
        }
        lines.push(you_have(xpbuf));

        lines.push('');
        lines.push('Basics:');
        let hp = Upolyd(u) ? (u.mh | 0) : (u.uhp | 0);
        const hpmax = Upolyd(u) ? (u.mhmax | 0) : (u.uhpmax | 0);
        if (hp < 0) hp = 0;
        let hpLine;
        if (hp === hpmax && hpmax > 1) hpLine = `all ${hpmax} hit points`;
        else hpLine = `${hp} out of ${hpmax} hit point${hpmax === 1 ? '' : 's'}`;
        lines.push(you_have(hpLine));
        const pw = u.uen | 0;
        const pwmax = u.uenmax | 0;
        const Power = 'energy points (spell power)';
        let pwLine;
        if (pwmax === 0 || (pw === pwmax && pwmax === 2)) {
            pwLine = `${!pwmax ? 'no' : 'both'} ${Power}`;
        } else if (pw === pwmax && pwmax > 2) {
            pwLine = `all ${pwmax} ${Power}`;
        } else {
            pwLine = `${pw} out of ${pwmax} ${Power}`;
        }
        lines.push(you_have(pwLine));
        lines.push(enlght_line_txt(
            'Your armor class ',
            final ? 'was ' : 'is ',
            String(u.uac ?? 10),
            '',
        ));
        const umoney = money_cnt_local();
        if (!umoney) {
            lines.push(` Your wallet ${final ? 'was' : 'is'} empty.`);
        } else {
            // C insight.c `:787–788` currency(umoney)
            lines.push(
                ` Your wallet contain${final ? 'ed' : 's'} ${umoney} ${currency(umoney)}.`,
            );
        }
        lines.push(autopickup_enlightenment_line_final(!!final));

        lines.push('');
        lines.push(`${final ? 'Final ' : ''}Characteristics:`);
        for (const a of [A_STR, A_DEX, A_CON, A_INT, A_WIS, A_CHA]) {
            lines.push(one_characteristic_line_final(a, !!final));
        }
    }

    // Status (BASIC + MAGIC both include this in C)
    lines.push('');
    lines.push(final ? 'Final Status:' : 'Status:');
    // C ref: insight.c status_enlightenment Deaf/Sleepy/hunger/encumbrance
    lines.push(...status_core_lines(final, {
        overlay: false,
        magic: !!(mode & MAGICENLIGHTENMENT),
    }));
    const uwep = u.uwep || game.u?.uwep;
    if (!uwep) {
        lines.push(you_are(empty_handed()));
    } else {
        lines.push(you_are(`wielding ${pretty_weapon_descr(uwep)}`));
    }
    const wtype = weapon_type(uwep);
    if (wtype !== P_NONE) {
        const sklvl = insight_P_SKILL(wtype);
        let sklvlbuf;
        if (sklvl === P_ISRESTRICTED) sklvlbuf = 'no';
        else sklvlbuf = insight_skill_level_name(wtype).toLowerCase();
        const hav = sklvl !== P_UNSKILLED && sklvl !== P_SKILLED;
        const buf = `${sklvlbuf} ${hav ? 'skill with' : 'in'} ${skill_name(wtype)}`;
        if (hav) lines.push(you_have(buf));
        else lines.push(you_are(buf));
    }
    if (!wearing_armor()) {
        lines.push(you_are('not wearing any armor'));
    }

    if (mode & MAGICENLIGHTENMENT) {
        lines.push('');
        lines.push(final ? 'Final Attributes:' : 'Attributes:');
        const pio = piousness(true, 'aligned');
        const record = u.ualign?.record | 0;
        if (record >= 0) lines.push(you_are(pio));
        else lines.push(you_have(pio));
        // C attributes_enlightenment: Antimagic early among resistances
        // (from_what deferred). Cloak MR via setworn oc_oprop still deferred.
        const { ANTIMAGIC } = await import('./const.js');
        const { objectNames: onames } = await import('./objects.js');
        const CLOAK_MR = onames.indexOf('CLOAK_OF_MAGIC_RESISTANCE');
        const antimagic = !!(u.Antimagic || u.HAntimagic || u.EAntimagic
            || u.uprops?.[ANTIMAGIC]?.intrinsic
            || u.uprops?.[ANTIMAGIC]?.extrinsic
            || (u.uarmc && u.uarmc.otyp === CLOAK_MR));
        if (antimagic) lines.push(you_are('magic-protected'));
        // C: Poison_resistance after Antimagic / other resists (from_what
        // deferred). Fire/cold/sleep/… resistance arms still deferred.
        if (hero_Poison_resistance(u)) lines.push(you_are('poison resistant'));
        if (Searching()) lines.push(you_have('automatic searching'));
        // C Infravision via set_uasmon FROMRACE; port falls back to race mons
        // like display.js hero_has_infravision (set_uasmon still deferred).
        let hasInfra = !!(u.HInfravision || u.EInfravision);
        if (!hasInfra) {
            const { mons: monsFn, infravision: infraFn } = await import('./monsters.js');
            const racePm = game.urace?.mnum;
            if (racePm != null) hasInfra = infraFn(monsFn(racePm));
        }
        if (hasInfra) lines.push(you_have('infravision'));
        // C: Stealth after Infravision / appearance block (blocked-Stealth
        // "would be stealthy" arm deferred).
        if (hero_Stealth(u)) lines.push(you_are('stealthy'));
        // C: magic_negation → warded/guarded/protected
        const armpro = magic_negation_you();
        if (armpro > 0) {
            const mc_types = ['', 'warded', 'guarded', 'protected'];
            const idx = Math.min(armpro, mc_types.length - 1);
            lines.push(you_are(mc_types[idx]));
        }
        // C: Luck → lucky / unlucky
        const luck = (u.uluck | 0) + (u.moreluck | 0);
        if (luck) {
            const ltmp = Math.abs(luck);
            const pref = ltmp >= 10 ? 'extremely ' : ltmp >= 5 ? 'very ' : '';
            lines.push(you_are(`${pref}${luck < 0 ? 'un' : ''}lucky`));
        }
        // C attributes_enlightenment mortality: past-slot holds "are dead"
        if (final === ENL_GAMEOVERDEAD) {
            lines.push(enlght_line_txt(You_, 'are dead', '', ''));
        }
    }

    lines.push('');
    lines.push('Miscellaneous:');
    if ((mode & BASICENLIGHTENMENT) && final) {
        const bonesOn = game.flags?.bones !== false;
        if (!bonesOn) {
            lines.push(you_have(
                `disabled loading${final === ENL_GAMEOVERDEAD ? ' and storing' : ''} of bones levels`,
            ));
        } else if (!(u.uroleplay?.numbones | 0)) {
            lines.push(enlght_line_txt(
                You_,
                final ? "didn't encounter" : "haven't encountered",
                ' any bones levels',
                '',
            ));
        }
    }
    lines.push(enlght_line_txt(
        'Total elapsed playing time ',
        final ? 'was' : 'is',
        ' none',
        '',
    ));

    await show_nhw_menu_text(lines);
}

/** Local money_cnt — invent gold sum (end.js has its own). */
function money_cnt_local() {
    let sum = 0;
    for (const o of game.invent || []) {
        if (o.oclass === COIN_CLASS) sum += o.quan | 0;
    }
    return sum;
}

function autopickup_enlightenment_line_final(final) {
    const flags = game.flags || {};
    let buf;
    if (flags.pickup) {
        const ocl = String(flags.pickup_types || '');
        buf = 'on';
        buf += ` for ${ocl ? `'${ocl}'` : 'all types'}`;
        if ((flags.pickup_thrown !== false) && ocl) buf += ' plus thrown';
    } else {
        buf = 'off';
    }
    return enlght_line_txt('Autopickup ', final ? 'was ' : 'is ', buf, '');
}

function one_characteristic_line_final(attrindx, final) {
    const u = game.u || {};
    const acurrent = acurr(attrindx);
    let valubuf = attrval(attrindx, acurrent);
    const abase = u.acurr?.a?.[attrindx] ?? acurrent;
    const apeak = u.amax?.a?.[attrindx] ?? abase;
    const alimit = game.urace?.attrmax?.[attrindx]
        ?? (attrindx === A_STR ? STR18_100 : 18);
    // C: final → always show limit; in-progress → only if ≠ human default
    const interesting_alimit = final
        ? true
        : (alimit !== (attrindx !== A_STR ? 18 : STR18_100));
    let paren_pfx = final ? ' (' : ' (current; ';
    if (acurrent !== abase) {
        valubuf += `${paren_pfx}base:${attrval(attrindx, abase)}`;
        paren_pfx = ', ';
    }
    if (abase !== apeak) {
        valubuf += `${paren_pfx}peak:${attrval(attrindx, apeak)}`;
        paren_pfx = ', ';
    }
    if (interesting_alimit) {
        const innate = acurrent > alimit ? 'innate ' : '';
        valubuf += `${paren_pfx}${innate}limit:${attrval(attrindx, alimit)}`;
    }
    if (acurrent !== abase || abase !== apeak || interesting_alimit) {
        valubuf += ')';
    }
    return enlght_line_txt(
        `Your ${ATTR_NAMES[attrindx]} `,
        final ? 'was ' : 'is ',
        valubuf,
        '',
    );
}

/**
 * C ref: insight.c enlightenment(..., ENL_GAMEINPROGRESS) via menu overlay.
 * ^X `doattributes` uses BASIC (| MAGIC when wizard|discover). Fountain
 * case 19 / potion / wand pass MAGICENLIGHTENMENT only — skip Background
 * / Basics / Characteristics; Status + Attributes + elapsed still run.
 * Bones/debug Miscellaneous lines need BASIC (C insight.c:428).
 * @param {number|null} enl_mode BASICENLIGHTENMENT | MAGICENLIGHTENMENT
 */
export async function doattributes(enl_mode = null) {
    const u = game.u || {};
    let name = game.plname || 'Hero';
    // C ref: insight.c / botl — capitalize first letter of plname for display
    if (name.length && name.charCodeAt(0) >= 97 && name.charCodeAt(0) <= 122) {
        name = String.fromCharCode(name.charCodeAt(0) - 32) + name.slice(1);
    }
    const female = !!(game.flags?.female);
    // C: insight.c — urole.name.f non-NULL (not same-string-as-m)
    const hasFemaleName = !!game.urole?.name?.f;
    // C: insight.c — role from name.f; rank via rank_of(u.ulevel, …)
    const role = (female && game.urole?.name?.f)
        ? game.urole.name.f
        : (game.urole?.name?.m || 'Tourist');
    const rank = rank_of(u.ulevel | 0, game.urole?.mnum, female);
    const gender = female ? 'female' : 'male';
    const atype = u.ualign?.type ?? A_NEUTRAL;
    const align = align_str(atype);
    const turns = game.moves | 0;
    const hand = (u.uhandedness === 1 /* LEFT_HANDED */) ? 'left' : 'right';
    const gold = game._goldCount || 0;
    // C ref: insight.c background_enlightenment — gender only when
    // !name.f AND (both genders allowed OR innategend != initgend)
    const allowGend = (game.urole?.allow ?? 0) & ROLE_GENDMASK;
    const innategend = female ? 1 : 0;
    const initgend = game.flags?.initgend ? 1 : 0;
    const genderPart = (!hasFemaleName
        && (allowGend === (ROLE_MALE | ROLE_FEMALE) || innategend !== initgend))
        ? `${gender} `
        : '';

    // C ref: insight.c — mission for u_gname(); opposed by other pantheon gods
    let opposed = '  who is opposed by';
    if (atype !== A_LAWFUL) {
        opposed += ` ${align_gname(game.urole, A_LAWFUL)} (${align_str(A_LAWFUL)}) and`;
    }
    if (atype !== A_NEUTRAL) {
        opposed += ` ${align_gname(game.urole, A_NEUTRAL)} (${align_str(A_NEUTRAL)})`;
        if (atype !== A_CHAOTIC) opposed += ' and';
    }
    if (atype !== A_CHAOTIC) {
        opposed += ` ${align_gname(game.urole, A_CHAOTIC)} (${align_str(A_CHAOTIC)})`;
    }
    opposed += '.';

    const wallet = gold
        ? `  Your wallet contains ${gold} ${currency(gold)}.`
        : '  Your wallet is empty.';

    const hp = u.uhp | 0;
    const hpmax = u.uhpmax | 0;
    const pw = u.uen | 0;
    const pwmax = u.uenmax | 0;
    // C ref: insight.c basics_enlightenment — hit / energy phrasing
    let hpLine;
    if (hp === hpmax && hpmax > 1) hpLine = `all ${hpmax} hit points`;
    else hpLine = `${hp} out of ${hpmax} hit point${hpmax === 1 ? '' : 's'}`;
    const Power = 'energy points (spell power)';
    let pwLine;
    if (pwmax === 0 || (pw === pwmax && pwmax === 2)) {
        pwLine = `${!pwmax ? 'no' : 'both'} ${Power}`;
    } else if (pw === pwmax && pwmax > 2) {
        pwLine = `all ${pwmax} ${Power}`;
    } else {
        pwLine = `${pw} out of ${pwmax} ${Power}`;
    }

    // C ref: insight.c background_enlightenment — In_endgame /
    // Is_knox / quest dunlev / rogue (Is_bigroom deferred)
    const dungeonLine = `  You are ${background_dungeon_clause(u.uz)}.`;
    // C: moves==1 → "just started"; else "entered … N turn(s) ago"
    const adventureLine = turns === 1
        ? '  You have just started your adventure.'
        : `  You entered the dungeon ${turns} turn${turns === 1 ? '' : 's'} ago.`;
    // C: wizard||final → ", N more needed for/to attain level M"
    const uexp = u.uexp | 0;
    const ulvl = u.ulevel | 0;
    const wizard = !!(game.flags?.wizard || game.flags?.debug);
    const discover = !!(game.flags?.explore || game.flags?.discover);
    // C insight.c doattributes: BASIC, OR MAGIC when wizard||discover.
    // Callers of enlightenment(MAGICENLIGHTENMENT, 0) pass MAGIC only.
    const mode = enl_mode != null
        ? (enl_mode | 0)
        : (BASICENLIGHTENMENT | ((wizard || discover) ? MAGICENLIGHTENMENT : 0));
    const magic = !!(mode & MAGICENLIGHTENMENT);
    let xpLine = `  You have ${uexp} experience point${uexp === 1 ? '' : 's'}`;
    if (!Upolyd(u) && ulvl < 30 && wizard) {
        const nxtlvl = newuexp(ulvl);
        const delta = nxtlvl - uexp;
        xpLine += `, ${delta} ${uexp > 0 ? 'more ' : ''}needed ${
            ulvl < 18 ? 'to attain' : 'for'
        } level ${ulvl + 1}`;
    }
    xpLine += '.';

    // C ref: insight.c background_enlightenment — continuous stream; tty
    // pages at 23 content rows then "(k of n)". Moon/friday13 sit between
    // "entered" and experience. night()/midnight deferred.
    // C: !strcmpi(rank, role) → noun + omit role (D-0928 #1194)
    const roleLevel = background_role_level_clause(
        rank, role, u.ulevel || 1, genderPart, game.urace,
    );
    const lines = [
        ` ${name} the ${role}'s attributes:`,
        '',
    ];
    // C insight.c enlightenment: background/basics/characteristics iff BASIC
    if (mode & BASICENLIGHTENMENT) {
        lines.push(
            ' Background:',
            `  You are ${roleLevel}.`,
            `  You are ${align}, on a mission for ${u_gname(game.urole, atype)}`,
            opposed,
            `  You are ${hand}-handed.`,
            dungeonLine,
            adventureLine,
        );
        const moon = game.flags?.moonphase;
        if (moon === FULL_MOON || moon === NEW_MOON) {
            const phase = moon === FULL_MOON ? 'full' : 'new';
            lines.push(`  There is a ${phase} moon in effect.`);
        }
        if (game.flags?.friday13) {
            // C insight.c: Sprintf(buf, " Bad things %s…") then enlght_out;
            // menu/tty paints one more leading space like enlght_line body rows.
            lines.push('  Bad things can happen on Friday the 13th.');
        }
        lines.push(
            xpLine,
            '',
            ' Basics:',
            `  You have ${hpLine}.`,
            `  You have ${pwLine}.`,
            `  Your armor class is ${u.uac ?? 10}.`,
            wallet,
            autopickup_enlightenment_line(),
            '',
            ' Characteristics:',
            one_characteristic_line(A_STR),
            one_characteristic_line(A_DEX),
            one_characteristic_line(A_CON),
            one_characteristic_line(A_INT),
            one_characteristic_line(A_WIS),
            one_characteristic_line(A_CHA),
            '',
        );
    }
    lines.push(' Status:');
    // C ref: insight.c status_enlightenment — Deaf/Sleepy before hunger;
    // Sleepy needs magic || cause_known; wizard hunger/weight suffixes.
    lines.push(...status_core_lines(0, { overlay: true, magic }));
    // C ref: insight.c weapon_insight — empty_handed / P_SKILL / skill_name
    const uwep = u.uwep || game.u?.uwep;
    if (!uwep) {
        lines.push(`  You are ${empty_handed()}.`);
    } else if (u.twoweap || game.u?.twoweap) {
        lines.push('  You are wielding two weapons at once.');
    } else {
        const wname = pretty_weapon_descr(uwep);
        lines.push(`  You are wielding ${wname}.`);
    }
    // C ref: insight.c weapon_insight skill lines; can_advance enhance suffix deferred.
    const wtype = weapon_type(uwep);
    if (wtype !== P_NONE) {
        // ammo check deferred — start weapons rarely quiver-as-uwep
        const sklvl = insight_P_SKILL(wtype);
        let sklvlbuf;
        if (sklvl === P_ISRESTRICTED) sklvlbuf = 'no';
        else sklvlbuf = insight_skill_level_name(wtype).toLowerCase();
        const hav = sklvl !== P_UNSKILLED && sklvl !== P_SKILLED;
        let buf = `${sklvlbuf} ${hav ? 'skill with' : 'in'} ${skill_name(wtype)}`;
        const twoweap = !!(u.twoweap || game.u?.twoweap);
        if (!twoweap) {
            if (hav) lines.push(`  You have ${buf}.`);
            else lines.push(`  You are ${buf}.`);
        } else {
            // C: two-weapon comparison vs primary / uswapwep / P_TWO_WEAPON_COMBAT
            const uswapwep = u.uswapwep || game.u?.uswapwep;
            const wtype2 = weapon_type(uswapwep);
            const sklvl2 = insight_P_SKILL(wtype2);
            let twoskl = insight_P_SKILL(P_TWO_WEAPON_COMBAT);
            let twobuf;
            if (twoskl === P_ISRESTRICTED) {
                twoskl = P_UNSKILLED;
                twobuf = 'restricted';
            } else {
                twobuf = insight_skill_level_name(P_TWO_WEAPON_COMBAT).toLowerCase();
            }
            const hav2 = sklvl2 !== P_UNSKILLED && sklvl2 !== P_SKILLED;
            let also = '';
            let also2 = '';
            let also3 = null;
            // C enlght_line adds " %s%s%s%s." then menu pad; at COLNO the
            // trailing '.' is clipped — bake two spaces and drop '.' at 80.
            const enl = (body) => {
                const withDot = `  ${body}.`;
                return withDot.length >= 80 ? `  ${body}` : withDot;
            };
            if (twoskl < sklvl) {
                lines.push(enl(
                    `Your skill in ${skill_name(wtype)}`
                    + ` is limited by being ${twobuf} with two weapons`,
                ));
                also = 'also ';
            } else if (twoskl > sklvl) {
                let lim = sklvl > P_ISRESTRICTED
                    ? `being ${sklvlbuf}`
                    : 'having no skill';
                lines.push(enl(
                    `Your two weapon skill is limited by ${lim}`
                    + ` with ${skill_name(wtype)}`,
                ));
                also2 = 'also ';
            } else {
                buf += ' and two weapons';
                also3 = 'also ';
                if (hav) lines.push(enl(`You have ${buf}`));
                else lines.push(enl(`You are ${buf}`));
            }
            if (wtype2 !== wtype) {
                const sknambuf2 = skill_name(wtype2);
                let sklvlbuf2;
                if (sklvl2 === P_ISRESTRICTED) sklvlbuf2 = 'no';
                else sklvlbuf2 = insight_skill_level_name(wtype2).toLowerCase();
                if (twoskl < sklvl2) {
                    lines.push(enl(
                        `Your skill in ${sknambuf2}`
                        + ` is ${also}limited by being ${twobuf} with two weapons`,
                    ));
                } else if (twoskl > sklvl2) {
                    let lim = sklvl2 > P_ISRESTRICTED
                        ? `being ${sklvlbuf2}`
                        : 'having no skill';
                    lines.push(enl(
                        `Your two weapon skill is ${also2}limited by ${lim}`
                        + ` with ${sknambuf2}`,
                    ));
                } else {
                    let buf2 = `${sklvlbuf2} ${hav2 ? 'skill with' : 'in'} ${sknambuf2}`
                        + ' and two weapons';
                    if (also3) {
                        const verb = hav2 ? 'have' : 'are';
                        lines.push(enl(`You also ${verb} ${buf2}`));
                    } else if (hav2) {
                        lines.push(enl(`You have ${buf2}`));
                    } else {
                        lines.push(enl(`You are ${buf2}`));
                    }
                }
            }
            // can_advance primary/secondary/twoweap enhance tips deferred
        }
    }
    // C ref: insight.c status_enlightenment — report nudity after
    // weapon_insight (+ tux_penalty deferred).
    if (!wearing_armor()) {
        // Overlay body rows: enlght_line + one more leading space.
        if (u.uroleplay?.nudist) {
            lines.push(` ${enlght_line_txt('You ', 'do', ' not wear any armor', '')}`);
        } else {
            lines.push(` ${enlght_line_txt('You ', 'are ', 'not wearing any armor', '')}`);
        }
    }
    lines.push('');
    // C: attributes_enlightenment when MAGICENLIGHTENMENT (wizard/explore ^X)
    if (magic) {
        const { piousness } = await import('./insight.js');
        const {
            from_what, Fast, Very_fast, Searching,
        } = await import('./attrib.js');
        const { POISON_RES, STEALTH, FAST, TELEPORT_CONTROL } = await import('./const.js');
        const { can_pray } = await import('./pray.js');
        const o = (txt) => ` ${txt}`; // overlay body: enlght_line already has 1 space
        lines.push(' Attributes:');
        const pio = piousness(true, 'aligned');
        const record = u.ualign?.record | 0;
        if (record >= 0) {
            lines.push(o(enlght_line_txt('You ', 'are ', pio, '')));
        } else {
            lines.push(o(enlght_line_txt('You ', 'have ', pio, '')));
        }
        if (wizard) {
            lines.push(o(enlght_line_txt(
                'Your alignment ', 'is', ` ${record}`, '',
            )));
        }
        // C attributes_enlightenment Resistances — Antimagic before Fire/
        // Cold/…/Shock/Poison. Invulnerable + Cold/Sleep/Disint/Acid/
        // Drain/Sick/Stone deferred.
        if (hero_Antimagic(u)) {
            lines.push(o(enlght_line_txt(
                'You ', 'are ', 'magic-protected', from_what(ANTIMAGIC),
            )));
        }
        if (hero_Fire_resistance(u)) {
            lines.push(o(enlght_line_txt(
                'You ', 'are ', 'fire resistant', from_what(FIRE_RES),
            )));
        }
        // item_resistance AD_FIRE deferred (no fire-extrinsic on this peel)
        if (hero_Shock_resistance(u)) {
            lines.push(o(enlght_line_txt(
                'You ', 'are ', 'shock resistant', from_what(SHOCK_RES),
            )));
        }
        lines.push(...item_resistance_message_lines(
            AD_ELEC, ' protected from electric shocks', 0, o,
        ));
        // Resistances — poison + Halluc_resistance (other resists deferred)
        if (hero_Poison_resistance(u)) {
            lines.push(o(enlght_line_txt(
                'You ', 'are ', 'poison resistant', from_what(POISON_RES),
            )));
        }
        // C: if (Halluc_resistance) enl_msg(You_, "resist", … " hallucinations", …)
        if (hero_Halluc_resistance(u)) {
            lines.push(o(enlght_line_txt(
                'You ', 'resist', ' hallucinations', from_what(HALLUC_RES),
            )));
        }
        // Vision — Blind_telepat + Warning before Searching (See_invisible /
        // Warn_of_mon / Clairvoyant / Infravision deferred)
        if (hero_Blind_telepat(u)) {
            lines.push(o(enlght_line_txt(
                'You ', 'are ', 'telepathic', from_what(TELEPAT),
            )));
        }
        if (hero_Warning(u)) {
            lines.push(o(enlght_line_txt(
                'You ', 'are ', 'warned', from_what(WARNING),
            )));
        }
        // Vision — Searching (other senses deferred)
        if (Searching()) {
            lines.push(o(enlght_line_txt(
                'You ', 'have ', 'automatic searching', from_what(SEARCHING),
            )));
        }
        // Appearance — Displaced before Stealth (insight.c); Aggravate/
        // Conflict deferred. Blocked-Stealth arm deferred.
        if (hero_Displaced(u)) {
            lines.push(o(enlght_line_txt(
                'You ', 'are ', 'displaced', from_what(DISPLACED),
            )));
        }
        if (hero_Stealth(u)) {
            lines.push(o(enlght_line_txt(
                'You ', 'are ', 'stealthy', from_what(STEALTH),
            )));
        }
        // C attributes_enlightenment Transportation — Jumping then
        // Teleport_control after Stealth / before magic_negation + Fast
        // (Teleportation / Lev/Fly blocked arms deferred).
        if ((u.HJumping | 0) || (u.EJumping | 0)) {
            lines.push(o(enlght_line_txt(
                'You ', 'can ', 'jump', from_what(JUMPING),
            )));
        }
        if (hero_Teleport_control(u)) {
            lines.push(o(enlght_line_txt(
                'You ', 'have ', 'teleport control', from_what(TELEPORT_CONTROL),
            )));
        }
        // Physical — magic_negation then Fast then Reflecting / Lifesaved
        const armpro = magic_negation_you();
        if (armpro > 0) {
            const mc_types = ['', 'warded', 'guarded', 'protected'];
            const idx = Math.min(armpro, mc_types.length - 1);
            lines.push(o(enlght_line_txt('You ', 'are ', mc_types[idx], '')));
        }
        if (Fast()) {
            const fastAttr = Very_fast() ? 'very fast' : 'fast';
            lines.push(o(enlght_line_txt(
                'You ', 'are ', fastAttr, from_what(FAST),
            )));
        }
        // C: if (Reflecting) you_have("reflection", from_what(REFLECTING));
        if (hero_Reflecting(u)) {
            lines.push(o(enlght_line_txt(
                'You ', 'have ', 'reflection', from_what(REFLECTING),
            )));
        }
        // C: if (Lifesaved) enl_msg("Your life ", "will be", … " saved", "");
        if (hero_Lifesaved(u)) {
            lines.push(o(enlght_line_txt('Your life ', 'will be', ' saved', '')));
        }
        // Luck — zero line is wizard-only; nonzero lucky/unlucky for all magic
        const luck = (u.uluck | 0) + (u.moreluck | 0);
        if (luck) {
            const ltmp = Math.abs(luck);
            const pref = ltmp >= 10 ? 'extremely ' : ltmp >= 5 ? 'very ' : '';
            let luckAttr = `${pref}${luck < 0 ? 'un' : ''}lucky`;
            if (wizard) luckAttr += ` (${luck})`;
            lines.push(o(enlght_line_txt('You ', 'are ', luckAttr, '')));
        } else if (wizard) {
            lines.push(o(enlght_line_txt('Your luck ', 'is', ' zero', '')));
        }
        // Pray — in-progress only; wizard appends (ublesscnt)
        let prayAttr = `${(await can_pray(false)) ? '' : 'not '}safely pray`;
        if (wizard) prayAttr += ` (${u.ublesscnt | 0})`;
        lines.push(o(enlght_line_txt('You ', 'can ', prayAttr, '')));
        // C: umortality — "You have been killed thrice." (final < 2)
        const umort = u.umortality | 0;
        if (umort > 0) {
            const times = umort === 1 ? 'once'
                : umort === 2 ? 'twice'
                    : umort === 3 ? 'thrice'
                        : `${umort} times`;
            lines.push(o(enlght_line_txt(
                'You ', 'have been killed ', times, '',
            )));
        }
        lines.push(''); // separator before Miscellaneous
    }
    // C: Miscellaneous — debug/explore + bones when wizard|discover
    {
        const o = (txt) => ` ${txt}`;
        lines.push(' Miscellaneous:');
        // C insight.c:428 — bones/debug only when BASIC && (wizard|discover|final)
        if ((mode & BASICENLIGHTENMENT) && (wizard || discover)) {
            lines.push(o(enlght_line_txt(
                'You ', 'are ',
                `running in ${wizard ? 'debug' : 'explore'} mode`,
                '',
            )));
            const bonesOn = game.flags?.bones !== false;
            if (!bonesOn) {
                lines.push(o(enlght_line_txt(
                    'You ', 'have', ' disabled loading of bones levels', '',
                )));
            } else if (!(u.uroleplay?.numbones | 0)) {
                lines.push(o(enlght_line_txt(
                    'You ', "haven't encountered", ' any bones levels', '',
                )));
            }
        }
        lines.push(o(enlght_line_txt(
            'Total elapsed playing time ', 'is', ' none', '',
        )));
    }

    // C tty enlightenment: 23 content rows + " (k of n)" footer per page.
    // C dmore → xwaitforspace(quitchars): only space/CR/LF advance; ESC
    // cancels remaining pages; other keys (e.g. ^O) bell and stay.
    const PAGE = 23;
    const pageCount = Math.max(1, Math.ceil(lines.length / PAGE));
    for (let p = 0; p < pageCount; p++) {
        const chunk = lines.slice(p * PAGE, (p + 1) * PAGE);
        chunk.push(` (${p + 1} of ${pageCount})`);
        const endRow = chunk.length - 1;
        paint_overlay(chunk.map(t => ({ text: t, attr: 0 })), {
            cursor: [9, endRow],
        });
        await flush_screen(1);
        let cancelled = false;
        for (;;) {
            const c = await nhgetch();
            if (c === 27) { cancelled = true; break; }
            if (c === 32 || c === 13 || c === 10) break;
            // tty_nhbell — stay on this page (still a capture boundary)
        }
        if (cancelled) break;
    }
    clear_overlay();
    await docrt();
    await flush_screen(1);
}

/**
 * C ref: invent.c doprgold `:4502–4546` / #showgold / '$' (D-1731).
 * money_cnt first COIN_CLASS + hidden_gold(FALSE). Verbose wallet/stash
 * one pline (`eos` append); else umoney+hmoney total. m-prefix `$`
 * dispinv_with_action("$", FALSE) when umoney.
 * Named: shopper_financial_report (shop_debt missing); botl/detect/
 * insight/topten/u_init hidden_gold callers; dokick hidden_gold_kick clone.
 */
export async function doprgold() {
    // C: money_cnt(gi.invent) — first COIN_CLASS quan (gold merges)
    let umoney = 0;
    for (const o of game.invent || []) {
        if (o.oclass === COIN_CLASS) {
            umoney = o.quan | 0;
            break;
        }
    }
    // C: hidden_gold(FALSE) — known container gold only
    const hmoney = hidden_gold(false);

    if (game.flags?.verbose !== false) {
        let buf;
        if (!umoney) {
            buf = 'Your wallet is empty';
        } else {
            buf = `Your wallet contains ${umoney} ${currency(umoney)}`;
        }
        if (hmoney) {
            // C: Sprintf(eos(buf), ", %s you have %ld %s stashed...")
            buf += `, ${umoney ? 'and' : 'but'} you have ${hmoney} ${
                umoney ? 'more' : currency(hmoney)
            } stashed away in your pack`;
        }
        await pline(`${buf}.`);
    } else {
        const total = umoney + hmoney;
        if (total) {
            await pline(
                `You are carrying a total of ${total} ${currency(total)}.`,
            );
        } else {
            await pline('You have no money.');
        }
    }
    // C: shopper_financial_report() — named omit (shop_debt not live)

    if (umoney && game.iflags?.menu_requested) {
        const { dispinv_with_action } = await import('./iactions.js');
        // C: mustn't use TRUE or gold wouldn't show unless quivered
        await dispinv_with_action('$', false, null);
    }

    return ECMD_OK;
}

/**
 * C ref: invent.c prinv(prefix, obj, quan)
 * When quan != 0 and quan < obj.quan (e.g. gold merged after pickup),
 * name the lifted amount and append " (N in total)." if verbose.
 * Named omissions: none for prefix — pickup_prinv builds load+verb.
 */
export async function prinv(prefix, obj, quan = 0) {
    const q = quan | 0;
    const totalOf = q !== 0 && q < (obj.quan || 1);
    let totalbuf = '';
    if (totalOf) totalbuf = ` (${obj.quan} in total).`;
    const pfx = prefix || '';
    // C: xprname(..., obj_to_let(obj), !total_of, 0L, quan)
    const body = xprname(obj, obj_to_let(obj), !totalOf, q);
    const verb = game.flags?.verbose !== false ? totalbuf : '';
    await pline(`${pfx}${pfx ? ' ' : ''}${body}${verb}`);
}

/**
 * C ref: invent.c doprwep / #seeweapon / ')'.
 * !menu_requested → prinv; m-prefix → dispinv_with_action inuse.
 */
export async function doprwep() {
    const u = game.u || {};
    if (!u.uwep) {
        // C: You("are %s.", empty_handed());
        await pline(`You are ${empty_handed()}.`);
        return ECMD_OK;
    }
    if (!game.iflags?.menu_requested) {
        await prinv(null, u.uwep, 0);
        if (u.twoweap) {
            await prinv(null, u.uswapwep, 0);
        }
        return ECMD_OK;
    }
    let lets = obj_to_let(u.uwep) || '';
    if (u.uswapwep) lets += u.uswapwep.invlet || '';
    if (u.uquiver) lets += u.uquiver.invlet || '';
    const { dispinv_with_action } = await import('./iactions.js');
    return await dispinv_with_action(lets, true, null);
}

/** C ref: invent.c wearing_armor */
function wearing_armor() {
    const u = game.u || {};
    return !!(u.uarm || u.uarmc || u.uarmf || u.uarmg
        || u.uarmh || u.uarms || u.uarmu);
}

/**
 * C ref: invent.c noarmor(report_uskin) `:4577–4597`.
 * ggetobj takeoff ARMOR_CLASS → noarmor(FALSE); doprarm → noarmor(TRUE).
 * polyself.c dragon-merge uskin assignment / scale-mail revert named.
 */
async function noarmor(report_uskin) {
    const uskin = game.u?.uskin;
    if (!uskin || !report_uskin) {
        await pline('You are not wearing any armor.');
        return;
    }
    // C: strcpy(buf, simpleonames(uskin)); then strncmpi "set of " +
    // strstri " dragon " in-place (p[1]=p[8]). Do not add strncmpi #4.
    let uskinname = simpleonames(uskin);
    if (uskinname.slice(0, 7).toLowerCase() === 'set of ') {
        uskinname = uskinname.slice(7);
    }
    const p = strstri(uskinname, ' dragon ');
    if (p) {
        const at = uskinname.length - p.length;
        uskinname = uskinname.slice(0, at + 1) + p.slice(8);
    }
    await pline(
        `You are not wearing armor but have ${uskinname} embedded in your skin.`,
    );
}

/**
 * C ref: invent.c doprarm / #seearmor / '['.
 * Always dispinv_with_action(lets, TRUE): n==1 !menu → message_menu
 * PICK_NONE; else inuse menu (D-1589).
 */
export async function doprarm() {
    const u = game.u || {};
    if (!wearing_armor()) {
        await noarmor(true);
        return ECMD_OK;
    }
    // C SORTPACK_INUSE slot order; obj_to_let once per slot (!fixinv)
    let lets = '';
    if (u.uarm) lets += obj_to_let(u.uarm);
    if (u.uarmc) lets += obj_to_let(u.uarmc);
    if (u.uarms) lets += obj_to_let(u.uarms);
    if (u.uarmh) lets += obj_to_let(u.uarmh);
    if (u.uarmg) lets += obj_to_let(u.uarmg);
    if (u.uarmf) lets += obj_to_let(u.uarmf);
    if (u.uarmu) lets += obj_to_let(u.uarmu);
    const { dispinv_with_action } = await import('./iactions.js');
    return await dispinv_with_action(lets, true, null);
}

/**
 * C ref: invent.c doprring / #seerings / '='.
 * Meat-ring / two rings / menu_requested → inuse "Ring"/"Rings".
 */
export async function doprring() {
    const u = game.u || {};
    if (!u.uleft && !u.uright) {
        await pline('You are not wearing any rings.');
        return ECMD_OK;
    }
    let lets = '';
    let use_inuse_mode = false;
    let ct = 0;
    if (u.uright) {
        lets += obj_to_let(u.uright);
        ct++;
        if (u.uright.oclass !== RING_CLASS) use_inuse_mode = true;
    }
    if (u.uleft) {
        lets += obj_to_let(u.uleft);
        ct++;
        if (u.uleft.oclass !== RING_CLASS) use_inuse_mode = true;
    }
    if (ct > 1 || game.iflags?.menu_requested) use_inuse_mode = true;
    const { dispinv_with_action } = await import('./iactions.js');
    return await dispinv_with_action(
        lets, use_inuse_mode, ct === 1 ? 'Ring' : 'Rings',
    );
}

/**
 * C ref: invent.c dopramulet / #seeamulet / '"'.
 * dispinv_with_action(lets, TRUE, "Amulet").
 */
export async function dopramulet() {
    const u = game.u || {};
    if (!u.uamul) {
        await pline('You are not wearing an amulet.');
        return ECMD_OK;
    }
    const lets = obj_to_let(u.uamul);
    const { dispinv_with_action } = await import('./iactions.js');
    return await dispinv_with_action(lets, true, 'Amulet');
}

/**
 * C ref: invent.c doprtool / #seetools / '('.
 * tool_being_used letters → dispinv_with_action inuse.
 */
export async function doprtool() {
    const invlet_basic = 52;
    let lets = '';
    for (const otmp of game.invent || []) {
        if (!tool_being_used(otmp)) continue;
        if (lets.length >= invlet_basic) break;
        lets += obj_to_let(otmp);
    }
    if (!lets) {
        await pline('You are not using any tools.');
        return ECMD_OK;
    }
    const { dispinv_with_action } = await import('./iactions.js');
    return await dispinv_with_action(lets, true, null);
}

/**
 * C invent.c doperminv `:2813–2857` / cmd.c "perminv" `|`.
 * IFBURIED|GENERALCMD|NOFUZZERCMD (no AUTOCOMPLETE, no CMD_M_PREFIX).
 * TTY_PERM_INVENT: tty_update_inventory(1) arg UNUSED → sync_perminvent.
 * @returns {Promise<number>}
 */
export async function doperminv() {
    const wp = tty_windowprocs();
    const iflags = game.iflags || {};
    if ((wp.wincap & WC_PERM_INVENT) === 0) {
        await pline(
            `Persistent inventory display is not supported by '${wp.name}'.`,
        );
    } else if (!iflags.perm_invent) {
        await pline(
            "Persistent inventory ('perm_invent' option) is not presently enabled.",
        );
    } else if (!(game.invent && game.invent.length)) {
        await pline('Persistent inventory display is empty.');
    } else {
        update_inventory();
    }
    return ECMD_OK;
}

/**
 * C ref: invent.c doprinuse / #seeall / '*'.
 * Any is_inuse → dispinv_with_action(NULL, TRUE); else You() not wearing.
 */
export async function doprinuse() {
    let ct = 0;
    for (const otmp of game.invent || []) {
        if (is_inuse(otmp)) {
            ct++;
            break;
        }
    }
    if (!ct) {
        await pline('You are not wearing or wielding anything.');
        return ECMD_OK;
    }
    const { dispinv_with_action } = await import('./iactions.js');
    return await dispinv_with_action(null, true, null);
}

/**
 * C ref: invent.c dfeature_at — dungeon feature worth mentioning at <x,y>.
 * Branch envelope this iteration: doors, stairs (via stairs_description),
 * fountain/sink/altar/grave/tree/bars stubs. Lava/ice/pool/drawbridge deferred.
 */
export function dfeature_at(x, y) {
    const lev = game.level?.at(x, y);
    if (!lev) return null;
    const ltyp = lev.typ;
    let dfeature = null;

    if (IS_DOOR(ltyp) || ltyp === DOOR) {
        // C: switch on exact doormask
        switch (lev.doormask ?? D_NODOOR) {
        case D_NODOOR:
            dfeature = 'doorway';
            break;
        case D_ISOPEN:
            dfeature = 'open door';
            break;
        case D_BROKEN:
            dfeature = 'broken door';
            break;
        default:
            dfeature = 'closed door';
            break;
        }
    } else if (ltyp === FOUNTAIN) {
        dfeature = 'fountain';
    } else if (ltyp === SINK) {
        dfeature = 'sink';
    } else if (ltyp === ALTAR) {
        dfeature = 'altar';
    } else {
        const stway = stairway_at(x, y);
        if (stway) {
            dfeature = stairs_description(stway, true);
        } else if (ltyp === STAIRS) {
            // typ STAIRS without stairway node — direction from ladder flag
            dfeature = (lev.ladder === 1) ? 'staircase up' : 'staircase down';
        } else if (ltyp === GRAVE) {
            dfeature = 'grave';
        } else if (ltyp === TREE) {
            dfeature = 'tree';
        } else if (ltyp === IRONBARS) {
            dfeature = 'set of iron bars';
        }
    }
    return dfeature;
}

/**
 * C ref: invent.c look_here — feature + objects at hero feet.
 * Ported envelope: non-swallow; Blind feel pline + verb (D-0928 #1096);
 * dfeature pline; single `You see/feel here`; multi NHW_MENU
 * "Things that are/you feel here:" via display_nhwindow(WIN_MESSAGE)+putstr
 * (D-0220); **observe_object before doname** (D-0399; C xname_flags).
 * **doname_with_price** (D-0460). **feel_cockatrice** D-1599 (skip_objects
 * / single / multi `doname...` then feel). Named omissions: altar/ice
 * Blind variants beyond floor, trap+region, engulfer stomach minvent
 * feel; blanket xname observe / distant_name. Furniture with ct==0 uses
 * pickup.describe_decor (D-0356), not this path.
 */
export async function look_here(obj_cnt = 0, lookhere_flags = 0) {
    // Dynamic import avoids invent↔shk cycle (shk imports paint_corner).
    const { doname_with_price } = await import('./shk.js');
    const u = game.u;
    const blind = Blind();
    const verb = blind ? 'feel' : 'see';
    let skip_dfeature = !!(lookhere_flags & 0x2); // LOOKHERE_SKIP_DFEATURE
    const picked_some = !!(lookhere_flags & 0x1); // LOOKHERE_PICKED_SOME
    // C: skip_objects = (flags.pile_limit > 0 && obj_cnt >= flags.pile_limit)
    // Default pile_limit 5; obj_cnt===0 (dolook) never skips. Full skip
    // "several objects" arm deferred — treat as never-skip for now when
    // pile_limit is unset or obj_cnt is below it.
    const pile_limit = game.flags?.pile_limit ?? 5;
    const skip_objects = pile_limit > 0 && obj_cnt >= pile_limit;

    const otmp = objects_at(u?.ux, u?.uy);
    let dfeature = dfeature_at(u?.ux, u?.uy);
    let fbuf = null;

    // C invent.c Blind arm — feel-floor pline before object list (forces
    // --More-- after goto_level familiar msg; key sync for Count:N .).
    if (blind) {
        // Dynamic import: invent↔engrave↔trap cycle if static.
        const { can_reach_floor } = await import('./engrave.js');
        const drift = Is_airlevel(u?.uz) || Is_waterlevel(u?.uz);
        if (dfeature && dfeature.startsWith('altar ')) {
            await pline('You try to feel what is here.');
        } else {
            // ICE / force_decor Blind arm deferred — ordinary floor path
            const cant_reach = !can_reach_floor(true);
            const surf = 'floor'; // C surface() room/corr envelope
            const where = cant_reach ? 'lying beneath you' : 'lying here on the ';
            const onwhat = cant_reach ? '' : surf;
            if (drift) {
                await pline('You try to feel what is floating here.');
            } else {
                await pline(`You try to feel what is ${where}${onwhat}.`);
            }
            if (dfeature && !drift && dfeature === surf) skip_dfeature = true;
        }
        // C: !can_reach_floor(pit) → "But you can't reach it!" (pit trap deferred)
        if (!can_reach_floor(false)) {
            await pline("But you can't reach it!");
            return;
        }
    }

    if (dfeature && !skip_dfeature) {
        // C: special no-article cases (lava/bars/ice) — iron bars only here
        let article = 1;
        if (dfeature === 'set of iron bars' || dfeature === 'ice'
            || dfeature === 'molten lava')
            article = 0;
        let feat = dfeature;
        if (article === 1) feat = an(dfeature);
        fbuf = `There ${vtense(feat, 'are')} ${feat} here.`;
    }

    if (!otmp) {
        if (dfeature && !skip_dfeature && fbuf)
            await pline(fbuf);
        const { read_engr_at } = await import('./engrave.js');
        await read_engr_at(u?.ux, u?.uy);
        // C: (!skip_objects && (Blind || !dfeature))
        if (!skip_objects && (blind || !dfeature))
            await pline(`You ${verb} no objects here.`);
        return;
    }

    if (skip_objects) {
        // C invent.c skip_objects arm — "There are several objects here."
        if (dfeature && !skip_dfeature && fbuf)
            await pline(fbuf);
        const { read_engr_at } = await import('./engrave.js');
        await read_engr_at(u?.ux, u?.uy);
        if (obj_cnt === 1 && (otmp.quan || 1) === 1) {
            await pline(`There is ${picked_some ? 'another' : 'an'} object here.`);
        } else {
            const how = obj_cnt === 2 ? 'two'
                : obj_cnt < 5 ? 'a few'
                    : obj_cnt < 10 ? 'several' : 'many';
            await pline(
                `There are ${how}${picked_some ? ' more' : ''} objects here.`,
            );
        }
        // C invent.c `:4265–4276` — first will_feel CORPSE then feel.
        for (let o = otmp; o; o = o.nexthere) {
            if ((o.otyp | 0) === OTYP_CORPSE && will_feel_cockatrice(o, false)) {
                const including = obj_cnt > 1 ? 'Including'
                    : (o.quan || 1) > 1 ? "They're" : "It's";
                const unfortunately = poly_when_stoned(
                    game.youmonst?.data, game.mvitals,
                ) ? '' : ', unfortunately';
                await pline(
                    `${including} ${corpse_xname(o, null, CXN_ARTICLE)}${unfortunately}.`,
                );
                await feel_cockatrice(o, false);
                break;
            }
        }
        return;
    }

    if (!otmp.nexthere) {
        // single object
        if (dfeature && !skip_dfeature && fbuf)
            await pline(fbuf);
        {
            const { read_engr_at } = await import('./engrave.js');
            await read_engr_at(u?.ux, u?.uy);
        }
        // C: doname → xname_flags observe_object when !Blind && !distantname
        // (JS xname/doname omit blanket observe; look_here must set dknown
        // for buried pile items see_nearby_objects never touches).
        if (!blind) observe_object(otmp);
        // C: You("%s here %s.", verb, doname_with_price(otmp))
        await pline(`You ${verb} here ${doname_with_price(otmp)}.`);
        if ((otmp.otyp | 0) === OTYP_CORPSE) await feel_cockatrice(otmp, false);
        return;
    }

    // C: display_nhwindow(WIN_MESSAGE, FALSE) then NHW_MENU putstr list.
    // WIN_MESSAGE FALSE sets toplin EMPTY without wipe — getpos leftovers
    // stay left of overlay; keep_message_leftover models that (D-0929).
    await flush_topl_more();
    const lines = [];
    if (dfeature && !skip_dfeature && fbuf) {
        lines.push(fbuf);
        lines.push('');
    }
    // C: "Things that you feel here:" / "Things that are here:"
    lines.push(
        `${picked_some ? 'Other things' : 'Things'} that ${
            blind ? 'you feel' : 'are'
        } here:`,
    );
    let felt_cockatrice = false;
    let felt_obj = null;
    for (let o = otmp; o; o = o.nexthere) {
        if ((o.otyp | 0) === OTYP_CORPSE && will_feel_cockatrice(o, false)) {
            felt_cockatrice = true;
            felt_obj = o;
            lines.push(`${doname(o)}...`);
            break;
        }
        // C: doname_with_price → xname observe_object (dknown for gem color)
        if (!blind) observe_object(o);
        lines.push(doname_with_price(o));
    }
    const { show_nhw_menu_text } = await import('./pager.js');
    await show_nhw_menu_text(lines, { keep_message_leftover: true });
    if (felt_cockatrice) await feel_cockatrice(felt_obj, false);
    {
        const { read_engr_at } = await import('./engrave.js');
        await read_engr_at(u?.ux, u?.uy);
    }
}

/** C ref: invent.c dolook() */
export async function dolook() {
    await look_here(0, 0);
}

/**
 * C invent.c hold_another_object — pickup_burden default MOD_ENCUMBER.
 * flags.pickup_burden may be the option string "stressed".
 */
function flags_pickup_burden_hold() {
    const v = game.flags?.pickup_burden;
    if (typeof v === 'number' && v >= 0) return v | 0;
    return MOD_ENCUMBER;
}

/**
 * C ref: invent.c hold_another_object — wish/catch/horn into invent.
 * Stay: addinv + optional autoquiver + prinv + update_inventory +
 * encumber_msg (D-0863).
 * drop_it (Fumbling / inv_cnt(FALSE)>invlet_basic / near_capacity
 * above pickup_burden, except cursed LOADSTONE): drop_fmt then
 * can_reach_floor(TRUE)||uswallow → dropx; else freeinv +
 * hitfloor(FALSE) (D-1272).
 * Named omissions: fatal wished corpse; artifact fail dropy /
 * wasUpolyd / crysknife restore; perm_invent WIN_INVEN body.
 * Pickup highdrop hitfloor is D-1273.
 */
export async function hold_another_object(obj, drop_fmt, drop_arg, hold_msg) {
    const { addinv } = await import('./u_init.js');
    const {
        place_object, obj_extract_self, splitobj,
    } = await import('./mkobj.js');
    const {
        touch_artifact, youmonst,
    } = await import('./artifact.js');

    if (!obj) return obj;
    // C invent.c hold_another_object: if (!Blind) observe_object(obj)
    if (!Blind()) observe_object(obj);
    // C: addinv may clobber doname() obuf that drop_arg aliases.
    const drop_arg_buf = drop_arg;

    async function hold_drop_msg() {
        if (!drop_fmt) return;
        const msg = drop_fmt.includes('%s')
            ? drop_fmt.replace('%s', drop_arg_buf || 'it')
            : drop_fmt;
        await pline(msg);
    }

    async function drop_it(otmp) {
        await hold_drop_msg();
        otmp.nomerge = 0;
        const { can_reach_floor } = await import('./engrave.js');
        const u = game.u || {};
        // C invent.c:1299–1304 — dropx when floor-reachable or swallowed;
        // else freeinv then hitfloor(obj, FALSE) (not verbose drop).
        if (can_reach_floor(true) || u.uswallow) {
            const { dropx } = await import('./do.js');
            await dropx(otmp);
        } else {
            extract_invent(otmp);
            otmp.pickup_prev = 0;
            otmp.owornmask = 0;
            otmp.nobj = null;
            freeinv_core(otmp);
            if (otmp.oclass === COIN_CLASS) {
                game._goldCount = Math.max(0, (game._goldCount || 0)
                    - (otmp.quan || 0));
                if (!game.flags) game.flags = {};
                game.flags.botl = true;
            }
            update_inventory();
            const { hitfloor } = await import('./dothrow.js');
            await hitfloor(otmp, false);
        }
        return null;
    }

    if (obj.oartifact) {
        const u = game.u || {};
        place_object(obj, u.ux, u.uy);
        if (!touch_artifact(obj, youmonst)) {
            obj_extract_self(obj);
            // dropy deferred — leave on floor (C dropy after extract)
            await hold_drop_msg();
            return obj;
        }
        obj_extract_self(obj);
    }

    if (Fumbling()) {
        obj.nomerge = 1;
        obj = await addinv(obj);
        return await drop_it(obj);
    }

    const oquan = obj.quan || 1;
    let prev_encumbr = near_capacity();
    const pickup_burden = flags_pickup_burden_hold();
    if (prev_encumbr < pickup_burden) prev_encumbr = pickup_burden;

    obj = await addinv(obj);
    let n_nongold = 0;
    for (const otmp of game.invent || []) {
        if (otmp.oclass === COIN_CLASS) continue;
        n_nongold++;
    }
    const not_cursed_loadstone = (obj.otyp | 0) !== LOADSTONE || !obj.cursed;
    if (n_nongold > INVLET_BASIC
        || (not_cursed_loadstone && near_capacity() > prev_encumbr)) {
        if ((obj.quan || 1) > oquan) {
            const split = splitobj(obj, oquan);
            if (split) obj = split;
        }
        return await drop_it(obj);
    }

    const u = game.u || {};
    if (game.flags?.autoquiver && !u.uquiver && !(obj.owornmask | 0)) {
        const {
            is_missile, ammo_and_launcher, setuqwep,
        } = await import('./wield.js');
        if (is_missile(obj)
            || ammo_and_launcher(obj, u.uwep)
            || ammo_and_launcher(obj, u.uswapwep)) {
            setuqwep(obj);
        }
    }
    if (hold_msg || drop_fmt) {
        // C: prinv(hold_msg, obj, oquan) — oquan before merge
        await prinv(hold_msg || null, obj, oquan);
    }
    update_inventory();
    await encumber_msg();
    return obj;
}

/**
 * C ref: invent.c freeinv_core — figurine stop FIG_TRANSFORM; artifact
 * W_ART conferral off (D-1539). Named omit: amulet/candelabrum/bell/book
 * uhaves / questart; loadstone curse; confers_luck set_moreluck; tin
 * context; inv_prop arti_invoke on drop.
 */
export function freeinv_core(obj) {
    if (!obj) return;
    // C invent.c:1377–1383 — oartifact → set_artifact_intrinsic(obj, 0, W_ART)
    if (obj.oartifact) set_artifact_intrinsic(obj, false, W_ART);
    if ((obj.otyp | 0) === FIGURINE && (obj.timed | 0)) {
        stop_timer(FIG_TRANSFORM, obj);
    }
}

/**
 * C ref: invent.c freeinv — extract from invent, pickup_prev=0,
 * freeinv_core, update_inventory. JS invent is an array; also unlink nobj
 * (C extract_nobj(&gi.invent)).
 */
export function freeinv(obj) {
    if (!obj) return;
    const inv = game.invent;
    if (Array.isArray(inv)) {
        const idx = inv.indexOf(obj);
        if (idx >= 0) inv.splice(idx, 1);
        for (const o of inv) {
            if (o.nobj === obj) o.nobj = obj.nobj || null;
        }
    }
    obj.nobj = null;
    obj.pickup_prev = 0;
    obj.where = OBJ_FREE;
    freeinv_core(obj);
    update_inventory();
}

const GOLD_SYM_ADJ = '$';
const NOINVSYM = '#';
const INVLET_BASIC = 52;
const QUITCHARS = ' \r\n\x1b';

/**
 * C flag.h `flags.invlet_constant` — optlist.h NHOPTB fixinv opt_out
 * default On (`*(addr)=initval`). Missing bag field ≡ C On.
 */
export function invlet_constant() {
    const v = game.flags?.invlet_constant;
    if (v === undefined) return true;
    return !!v;
}

/**
 * C invent.c reassign `:4853–4884` — unlink first gold, re-letter the
 * rest a–z then A–Z then NOINVSYM, gold `'$'` at head, lastinvnr =
 * non-gold count clamped to 51. Callers gate on `!invlet_constant`.
 */
export function reassign() {
    const inv = game.invent;
    if (!inv) {
        game._lastinvnr = 0;
        return;
    }
    let goldobj = null;
    const goldIdx = inv.findIndex((o) => o && o.oclass === COIN_CLASS);
    if (goldIdx >= 0) {
        goldobj = inv[goldIdx];
        inv.splice(goldIdx, 1);
    }
    let i = 0;
    for (; i < inv.length; i++) {
        const obj = inv[i];
        obj.invlet = i < 26
            ? String.fromCharCode(97 + i)
            : i < 52
                ? String.fromCharCode(65 + i - 26)
                : NOINVSYM;
    }
    if (goldobj) {
        goldobj.invlet = GOLD_SYM;
        inv.unshift(goldobj);
    }
    if (i >= 52) i = 51;
    game._lastinvnr = i;
}

/**
 * C invent.c obj_to_let `:2860–2868` — !fixinv sets NOINVSYM then
 * reassign so prinv / #see* letters match packed invent.
 * @param {object} obj
 * @returns {string}
 */
function obj_to_let(obj) {
    if (!invlet_constant()) {
        obj.invlet = NOINVSYM;
        reassign();
    }
    return obj.invlet;
}

/** C ref: invent.c compactify — dash runs of consecutive invent letters. */
export function compactify_invlets(buf) {
    if (!buf || buf.length <= 5) return buf || '';
    const chars = buf.split('');
    let i1 = 1;
    let i2 = 1;
    let ilet2 = chars[0];
    let ilet1 = chars[1];
    chars[++i2] = chars[++i1];
    let ilet = chars[i1];
    while (ilet) {
        const iletCode = ilet.charCodeAt(0);
        const ilet1Code = ilet1.charCodeAt(0);
        const ilet2Code = ilet2.charCodeAt(0);
        if (iletCode === ilet1Code + 1) {
            if (ilet1Code === ilet2Code + 1) {
                chars[i2 - 1] = '-';
                ilet1 = '-';
            } else if (ilet2 === '-') {
                chars[i2 - 1] = String.fromCharCode(ilet1Code + 1);
                ilet1 = chars[i2 - 1];
                chars[i2] = chars[++i1];
                ilet = chars[i1];
                continue;
            }
        } else if (ilet === NOINVSYM) {
            if (i2 >= 2 && chars[i2 - 2] === NOINVSYM && chars[i2 - 1] === NOINVSYM) {
                chars[i2 - 1] = '-';
            } else if (
                i2 >= 3 && chars[i2 - 3] === NOINVSYM
                && chars[i2 - 2] === '-' && chars[i2 - 1] === NOINVSYM
            ) {
                --i2;
            }
        }
        ilet2 = ilet1;
        ilet1 = ilet;
        chars[++i2] = chars[++i1];
        ilet = chars[i1];
    }
    return chars.slice(0, i2 + 1).join('').replace(/\0/g, '');
}

/**
 * C wield.c will_weld — cursed weapon / weptool / ball / chain / tin opener.
 * Local clone: invent must not import wield.js (wield → invent).
 */
function getobj_will_weld(obj) {
    if (!obj?.cursed) return false;
    if (obj.oclass === WEAPON_CLASS || is_weptool_obj(obj)) return true;
    const n = objectNames[obj.otyp];
    return n === 'HEAVY_IRON_BALL' || n === 'IRON_CHAIN' || n === 'TIN_OPENER';
}

/**
 * C invent.c splittable `:1664–1668` — cursed loadstone and welded uwep
 * must not split when getobj has a count.
 */
export function splittable(obj) {
    if (!obj) return false;
    if ((obj.otyp | 0) === LOADSTONE && obj.cursed) return false;
    const uwep = game.u?.uwep;
    if (obj === uwep && getobj_will_weld(uwep)) {
        uwep.bknown = 1; // C welded() side effect
        return false;
    }
    return true;
}

/**
 * C invent.c getobj digit arm `:1937–1948`.
 * !ALLOWCNT → "No count allowed" and retry. Digit + ALLOWCNT →
 * get_count(NULL, ilet, LARGEST_INT, &tmpcnt, GC_SAVEHIST) (D-1613).
 * @returns {Promise<{ retry?: boolean, ch: string, cnt: number, cntgiven: boolean }>}
 */
export async function getobj_take_count(ch, allowcnt) {
    if (typeof ch === 'number') ch = String.fromCharCode(ch);
    if (ch < '0' || ch > '9') {
        return { ch, cnt: 0, cntgiven: false };
    }
    if (!allowcnt) {
        await pline('No count allowed with this command.');
        return { retry: true, ch, cnt: 0, cntgiven: false };
    }
    const box = { n: 0 };
    const key = await get_count(null, ch, LARGEST_INT, box, GC_SAVEHIST);
    return {
        ch: String.fromCharCode(key),
        cnt: box.n,
        cntgiven: box.n !== 0,
    };
}

/**
 * C invent.c getobj split_otmp `:2075–2087`. Child follows parent on
 * invent[] (C nobj). splitobj itself still omits invent[] (eat/D-0924).
 */
export function getobj_split_otmp(otmp, cntgiven, cnt) {
    if (!cntgiven) return otmp;
    if (cnt === 0) return null;
    if (!otmp) return null;
    if (cnt === (otmp.quan || 1)) return otmp;
    if (splittable(otmp)) {
        const child = splitobj(otmp, cnt);
        if (!child) return otmp;
        const inv = game.invent;
        if (inv) {
            const i = inv.indexOf(otmp);
            if (i >= 0) inv.splice(i + 1, 0, child);
        }
        child.where = OBJ_INVENT;
        return child;
    }
    if ((otmp.otyp | 0) === LOADSTONE && otmp.cursed) {
        otmp.corpsenm = cnt | 0;
    }
    return otmp;
}

/**
 * C cmd.c command_queue[CQ_*] — JS arrays on game.
 * @param {number} q
 */
function cmdq_qname(q) {
    return (q | 0) === CQ_REPEAT ? '_cmdq_repeat' : '_cmdq_canned';
}

/**
 * C cmd.c cmdq_add_int. Interactive getobj REPEAT record is
 * getobj_record_repeat (D-1563).
 * @param {number} q CQ_CANNED or CQ_REPEAT
 * @param {number} val
 */
export function cmdq_add_int(q, val) {
    const name = cmdq_qname(q);
    if (!game[name]) game[name] = [];
    game[name].push({ typ: CMDQ_INT, intval: val | 0 });
}

/**
 * C cmd.c cmdq_add_key. Apply/dig/iactions keep canned clones (do not
 * write a fourth canned-only clone).
 * @param {number} q CQ_CANNED or CQ_REPEAT
 * @param {string|number} key invlet or char code
 */
export function cmdq_add_key(q, key) {
    const name = cmdq_qname(q);
    if (!game[name]) game[name] = [];
    const k = typeof key === 'string' ? key : String.fromCharCode(key | 0);
    game[name].push({ typ: CMDQ_KEY, key: k });
}

/**
 * C invent.c getobj `:2049–2054`. Record count+letter on CQ_REPEAT when
 * not in_doagain. Hands '-' returns before this in C.
 * @param {object|null} otmp
 * @param {string} [ilet]
 * @param {boolean} [cntgiven=false]
 * @param {number} [cnt=0]
 */
export function getobj_record_repeat(otmp, ilet, cntgiven = false, cnt = 0) {
    if (!otmp || game.in_doagain) return;
    const rec = ilet != null && ilet !== '' ? ilet : otmp.invlet;
    if (rec == null || rec === '') return;
    if (cntgiven && cnt > 0) cmdq_add_int(CQ_REPEAT, cnt);
    cmdq_add_key(CQ_REPEAT, rec);
}

/** C cmd.c cmdq_pop — in_doagain uses CQ_REPEAT, else CQ_CANNED. */
function cmdq_pop_getobj() {
    const name = game.in_doagain ? '_cmdq_repeat' : '_cmdq_canned';
    const q = game[name];
    if (!q || !q.length) return null;
    return q.shift();
}

function cmdq_clear_canned() {
    game._cmdq_canned = [];
}

function cmdq_key_char(head) {
    if (typeof head.key === 'string') return head.key;
    if (typeof head.key === 'number') return String.fromCharCode(head.key);
    return '';
}

function getobj_cmdq_rank_ok(v) {
    return v === GETOBJ_SUGGEST || v === GETOBJ_DOWNPLAY;
}

/**
 * C invent.c getobj need_more_cq `:1778–1830`. CMDQ_INT (partial stack)
 * then CMDQ_KEY. !allowcnt or a second INT → cmdq_clear(CQ_CANNED), NULL.
 * C's `need_more_cq` boolean is never set TRUE, so INT without a
 * following KEY falls through to interactive. USER_INPUT is consumed
 * then interactive. JS function / CMDQ_EXTCMD heads are rhack's — do
 * not pop them here. in_doagain pops CQ_REPEAT (D-1563).
 * @param {(obj: object|null) => number} obj_ok
 * @param {boolean} allowcnt
 * @param {object|null} [hands] C `&hands_obj` when '-' is acceptable
 * @returns {{ skip: true } | { skip: false, otmp: object|null }}
 */
export function getobj_from_cmdq(obj_ok, allowcnt, hands) {
    let cntgiven = false;
    let cnt = 0;
    for (;;) {
        const head = (() => {
            const name = game.in_doagain ? '_cmdq_repeat' : '_cmdq_canned';
            const q = game[name];
            if (!q?.length) return undefined;
            return q[0];
        })();
        if (head === undefined) {
            return { skip: true };
        }
        if (typeof head === 'function' || head?.typ === CMDQ_EXTCMD) {
            return { skip: true };
        }
        if (!head || typeof head !== 'object') {
            return { skip: true };
        }
        cmdq_pop_getobj();
        if (head.typ === CMDQ_USER_INPUT) {
            return { skip: true };
        }
        let otmp = null;
        const isKey = head.typ === 'key' || head.typ === CMDQ_KEY;
        const isInt = head.typ === 'int' || head.typ === CMDQ_INT;
        if (isKey) {
            const ch = cmdq_key_char(head);
            if (ch === HANDS_SYM) {
                if (getobj_cmdq_rank_ok(obj_ok(null))) otmp = hands ?? null;
            } else {
                for (const o of game.invent || []) {
                    if (o.invlet === ch && getobj_cmdq_rank_ok(obj_ok(o))) {
                        otmp = o;
                        break;
                    }
                }
            }
        } else if (isInt) {
            if (!cntgiven && allowcnt) {
                cnt = head.intval | 0;
                cntgiven = true;
                continue;
            }
            cmdq_clear_canned();
            return { skip: false, otmp: null };
        }
        if (!otmp) {
            cmdq_clear_canned();
            return { skip: false, otmp: null };
        }
        if (cntgiven) {
            if (cnt < 1 || (otmp.quan || 1) <= cnt) cntgiven = false;
            return { skip: false, otmp: getobj_split_otmp(otmp, cntgiven, cnt) };
        }
        return { skip: false, otmp };
    }
}

/**
 * C invent.c getobj_hands_txt `:1718–1736`. Menu xtra_choice string
 * (not the yn prompt). grease uses fingers_or_gloves(FALSE) =
 * makeplural(body_part(FINGER)), not the gloves name.
 * @param {string} action getobj word
 * @returns {string}
 */
export function getobj_hands_txt(action) {
    const u = game.u || {};
    if (action === 'grease') {
        return `your ${makeplural(body_part_latebound(FINGER))}`;
    }
    if (action === 'write with') {
        return `your ${body_part_latebound(FINGERTIP)}`;
    }
    if (action === 'wield') {
        const gloved = u.uarmg ? 'gloved' : 'bare';
        const wielded = !u.uwep ? ' (wielded)' : '';
        return `your ${gloved} ${makeplural(body_part_latebound(HAND))}${wielded}`;
    }
    if (action === 'ready') {
        return `empty quiver${!u.uquiver ? ' (nothing readied)' : ''}`;
    }
    return `your ${makeplural(body_part_latebound(HAND))}`;
}

/**
 * C invent.c getobj `:1976–1981` — set handsbuf when `*` (NULL lets),
 * lets starts with HANDS_SYM (altlets), or buf starts with '-' (SUGGEST).
 * usextra also needs allownone (allowxtra).
 * @param {string} ch '?' or '*'
 * @param {string} rawLets
 * @param {{ word: string, allownone: boolean, promptHasHands: boolean }} ctx
 * @returns {{ choice: string, allow: boolean }|null}
 */
export function getobj_pickinv_xtra(ch, rawLets, ctx) {
    if (!ctx?.allownone || ctx.word == null) return null;
    const isStar = ch === '*';
    const allowed = isStar ? null : (rawLets || '');
    if (isStar || allowed[0] === HANDS_SYM || ctx.promptHasHands) {
        return { choice: getobj_hands_txt(ctx.word), allow: true };
    }
    return null;
}

/**
 * C invent.c getobj `:1996–1999` after display_pickinv.
 * Menu `*out_cnt` overrides prompt digits when allowcnt && ctmp >= 0
 * (0 is a given count; -1 from n==1 / no menu digits means select-all).
 * @param {boolean} allowcnt
 * @param {{ n: number }|null} ctmp
 * @param {{ cnt: number, cntgiven: boolean }} counted
 */
export function getobj_pickinv_ctmp(allowcnt, ctmp, counted) {
    if (allowcnt && ctmp && ctmp.n >= 0) {
        counted.cnt = ctmp.n;
        counted.cntgiven = true;
    }
    return counted;
}

/**
 * C invent.c getobj redo_menu `?`/`*` `:1963–2001`.
 * display_pickinv(lets or NULL, handsbuf, menuquery, allownone, TRUE,
 * allowcnt ? &ctmp : NULL) then `*`/`?` → goto redo_menu (D-1578).
 * Menu query is set only when force_invmenu. Handsbuf recomputed each
 * redo from the current letter (`*` → NULL lets).
 * @param {string} ch '?' or '*'
 * @param {string} rawLets non-compacted SUGGEST letters
 * @param {boolean} allowcnt
 * @param {{ cnt: number, cntgiven: boolean }} counted
 * @param {{ word: string, allownone: boolean, promptHasHands: boolean, altLets?: string }|null} [ctx]
 * @returns {Promise<string|null>}
 */
export async function getobj_display_pickinv(ch, rawLets, allowcnt, counted, ctx = null) {
    let ilet = ch;
    const force = !!(game.iflags?.force_invmenu);
    const query = (force && ctx?.word)
        ? `What do you want to ${ctx.word}?`
        : null;
    for (;;) {
        const ctmp = { n: 0 };
        const xtra = ctx ? getobj_pickinv_xtra(ilet, rawLets, ctx) : null;
        let allowed = rawLets || '';
        if (ilet === '?' && !allowed && ctx?.altLets) allowed = ctx.altLets;
        const pickLets = ilet === '*' ? '*' : (allowed || '*');
        ilet = await display_pickinv_reply(
            pickLets,
            allowcnt ? ctmp : null,
            xtra,
            { query, allowxtra: !!(ctx?.allownone) },
        );
        if (ilet === '*' || ilet === '?') continue;
        if (ilet && ilet !== '\x1b') {
            getobj_pickinv_ctmp(allowcnt, ctmp, counted);
        }
        return ilet;
    }
}

/**
 * C invent.c getobj after the letter `:2021–2088` — gold LRS, throw-one,
 * botl, CQ_REPEAT record `:2049–2054`, "don't have that many", then
 * split_otmp. silly_thing is getobj_finish_pick (D-1682). pickinv
 * `&ctmp` is getobj_display_pickinv (D-1559).
 * @param {object|null} otmp
 * @param {string} word
 * @param {boolean} cntgiven
 * @param {number} cnt
 * @param {string} [ilet] typed letter (C `ilet`; default `otmp.invlet`)
 * @returns {Promise<null | { retry: true } | object>}
 */
export async function getobj_apply_count(otmp, word, cntgiven, cnt, ilet) {
    const coins = !!(otmp && otmp.oclass === COIN_CLASS);
    if (coins && cntgiven && cnt <= 0) {
        if (cnt < 0) {
            await pline(
                'The LRS would be very interested to know you have that much.',
            );
        }
        return null;
    }
    if (cntgiven && word === 'throw') {
        if (cnt === 0 || !otmp) return null;
        if (cnt > 1 && (!coins || cnt > (otmp.quan || 1))) {
            const q = otmp.quan || 1;
            const only_one = 'can only throw one at a time';
            if (cnt > q) {
                const extra = !coins && q > 1 ? ` and ${only_one}` : '';
                await pline(`You only have ${q}${extra}.`);
            } else {
                await pline(`You ${only_one}.`);
            }
            return { retry: true };
        }
    }
    if (!game.flags) game.flags = {};
    game.flags.botl = true; // C disp.botl
    getobj_record_repeat(otmp, ilet, cntgiven, cnt);
    if (!otmp) {
        if (game.in_doagain) return null;
        return { retry: true };
    }
    const quan = otmp.quan || 1;
    if (cnt < 0 || quan < cnt) {
        await pline(`You don't have that many!  You have only ${quan}.`);
        if (game.in_doagain) return null;
        return { retry: true };
    }
    return getobj_split_otmp(otmp, cntgiven, cnt);
}

function getobj_sort_invlets(lets) {
    lets.sort((a, b) => a.charCodeAt(0) - b.charCodeAt(0));
    return lets.join('');
}

function getobj_find_ilet(ch) {
    if (ch === GOLD_SYM) {
        return (game.invent || []).find((o) => o && o.oclass === COIN_CLASS)
            || null;
    }
    return (game.invent || []).find((o) => o && o.invlet === ch) || null;
}

/**
 * C invent.c mime_action `:1677–1706`. Typed '-' when !allownone.
 * " on the " → sfx (bp+1); "rub the … on" / "dip … into" → pfx at
 * buf[4] after buf[3]='\0'; " or " → rn2(2) left vs rest. You() via
 * pline. Menu pickinv HANDS_SYM does not call this (C `:1988–1989`).
 * @param {string} word
 */
export async function mime_action(word) {
    let buf = String(word ?? '');
    let pfx = null;
    let sfx = null;
    const onThe = buf.indexOf(' on the ');
    if (onThe >= 0) {
        sfx = buf.slice(onThe + 1);
        buf = buf.slice(0, onThe);
    }
    if ((buf.startsWith('rub the ') && buf.slice(8).includes(' on'))
        || (buf.startsWith('dip ') && buf.slice(4).includes(' into'))) {
        pfx = buf.slice(4);
        buf = buf.slice(0, 3);
    }
    let bp;
    const orAt = buf.indexOf(' or ');
    if (orAt >= 0) {
        bp = rn2(2) ? buf.slice(0, orAt) : buf.slice(orAt + 4);
    } else {
        bp = buf;
    }
    await pline(
        `You mime ${ing_suffix(bp)}${pfx ? ' ' : ''}${pfx || ''} something${sfx ? ' ' : ''}${sfx || ''}.`,
    );
}

/**
 * C invent.c getobj `:1946–1949` — typed '-' at yn (not pickinv).
 * @param {string} word
 * @param {boolean} allownone
 * @param {object|null} [hands]
 */
async function getobj_typed_hands(word, allownone, hands) {
    if (!allownone) await mime_action(word);
    return allownone ? hands : null;
}

/**
 * C invent.c getobj `:1751–2089`.
 * Canned CMDQ_INT/KEY (D-1551) + CQ_REPEAT (D-1563). Digit prefix
 * ALLOWCNT (D-1530); !ALLOWCNT → "No count allowed" and retry.
 * `?`/`*` → display_pickinv `allowcnt ? &ctmp : NULL` (D-1559) +
 * xtra_choice/handsbuf when allownone (D-1569).
 * force_invmenu: skip yn_function, auto `?`/`*`, oneloop empty
 * cancel, display_pickinv Special + redo_menu (D-1578).
 * GETOBJ_NOFLAGS + no SUGGEST / hands / DOWNPLAY forceprompt →
 * "don't have anything [else] to WORD" (inaccess from
 * EXCLUDE_NONINVENT / EXCLUDE_INACCESS). GETOBJ_PROMPT still prompts
 * `[*]` when suggested==0.
 * silly_thing on GETOBJ_EXCLUDE is D-1682 (Call Amulet / unknown
 * fake). Named omit: in_doagain readchar (REPEAT cmdq live);
 * sortloot body (invlet sort). mime_action is D-1579. gacc / `'0'`
 * ball is D-1580 (non-wizid pickinv gacc 0). putmsghistory is D-1588.
 * @param {string} word
 * @param {(obj: object|null) => number} obj_ok
 * @param {number} ctrlflags
 * @returns {Promise<object|null>}
 */
export async function getobj(word, obj_ok, ctrlflags) {
    const allowcnt = !!(ctrlflags & GETOBJ_ALLOWCNT);
    let forceprompt = !!(ctrlflags & GETOBJ_PROMPT);
    let allownone = false;
    let inaccess = 0;
    let handsSuggest = false;

    const { hands_obj } = await import('./weapon.js');
    const cq = getobj_from_cmdq(obj_ok, allowcnt, hands_obj);
    if (!cq.skip) return cq.otmp;

    const none_rank = obj_ok(null);
    if (none_rank === GETOBJ_SUGGEST) {
        allownone = true;
        handsSuggest = true;
    } else if (
        none_rank === GETOBJ_DOWNPLAY
        || none_rank === GETOBJ_EXCLUDE_INACCESS
        || none_rank === GETOBJ_EXCLUDE_SELECTABLE
    ) {
        allownone = true;
    } else if (none_rank === GETOBJ_EXCLUDE_NONINVENT) {
        forceprompt = false;
        inaccess++;
    }

    if (!invlet_constant()) reassign();

    const suggest = [];
    const alt = [];
    // C: DOWNPLAY/EXCLUDE_* hands go to altlets first (HANDS_SYM)
    if (allownone && !handsSuggest) alt.push(HANDS_SYM);
    for (const otmp of game.invent || []) {
        if (!otmp?.invlet) continue;
        const v = obj_ok(otmp);
        if (v === GETOBJ_SUGGEST) {
            suggest.push(otmp.invlet);
        } else if (v === GETOBJ_DOWNPLAY) {
            alt.push(otmp.invlet);
            forceprompt = true;
        } else if (v === GETOBJ_EXCLUDE_INACCESS) {
            inaccess++;
        }
    }
    const rawLets = getobj_sort_invlets(suggest);
    const altLets = getobj_sort_invlets(alt);
    const suggested = suggest.length;

    if (suggested === 0 && !forceprompt && !allownone) {
        const else_ = inaccess ? 'else ' : '';
        await pline(`You don't have anything ${else_}to ${word}.`);
        return null;
    }

    // C: buf is "- " + letters when SUGGEST hands; strip trailing space
    // if no letters. compactify(bp) is letters-only (lets, not buf prefix).
    const compactLets = suggested > 5 ? compactify_invlets(rawLets) : rawLets;
    const promptLets = handsSuggest
        ? (compactLets ? `- ${compactLets}` : '-')
        : compactLets;

    let oneloop = false;
    let msggiven = false;
    let ch = '';
    for (;;) {
        if (game.iflags?.force_invmenu) {
            // C invent.c getobj `:1923–1931` — skip yn_function.
            // putmsghistory(qbuf, FALSE) once (D-1588).
            if (!oneloop) {
                ch = getobj_force_invmenu_ch(rawLets, altLets) || '*';
            }
            if (!msggiven) {
                putmsghistory(`What do you want to ${word}?`, false);
            }
            msggiven = true;
            oneloop = true;
        } else {
            const query = promptLets
                ? `What do you want to ${word}? [${promptLets} or ?*]`
                : `What do you want to ${word}? [*]`;
            ch = await yn_function(query, null, '\0', false); // C getobj FALSE
        }
        const counted = await getobj_take_count(ch, allowcnt);
        if (counted.retry) continue;
        ch = counted.ch;
        if (QUITCHARS.includes(ch) || ch === '\x1b') {
            if (game.flags?.verbose !== false) await pline(Never_mind);
            return null;
        }
        if (ch === HANDS_SYM) {
            return getobj_typed_hands(word, allownone, hands_obj);
        }
        if (ch === '?' || ch === '*') {
            let allowed = rawLets;
            if (ch === '?' && !allowed && altLets) allowed = altLets;
            const ilet = await getobj_display_pickinv(
                ch, allowed, allowcnt, counted,
                {
                    word, allownone, promptHasHands: handsSuggest,
                    altLets,
                },
            );
            if (ilet === '\x1b') {
                if (game.flags?.verbose !== false) await pline(Never_mind);
                return null;
            }
            if (!ilet) {
                if (oneloop) return null;
                continue;
            }
            if (ilet === HANDS_SYM) {
                // C `:1988–1989` pickinv '-' → hands_obj, no mime_action
                if (!allownone) return null;
                return hands_obj;
            }
            const picked = getobj_find_ilet(ilet);
            const used = await getobj_finish_pick(
                picked, word, obj_ok, counted, ilet,
            );
            if (used && used.retry) {
                ch = ilet;
                continue;
            }
            return used;
        }
        const otmp = getobj_find_ilet(ch);
        const used = await getobj_finish_pick(
            otmp, word, obj_ok, counted, ch,
        );
        if (used && used.retry) continue;
        return used;
    }
}

/**
 * C invent.c silly_thing `:2093–2131`.
 * OBSOLETE_HANDLING (P/R vs W/T accessory vs armor verbs) is not
 * defined in pinned C — compiled out. Live: word "call" on
 * AMULET_OF_YENDOR or unknown FAKE_AMULET_OF_YENDOR → pline_The
 * "Amulet doesn't like being called names." (C comment cites
 * objtyp_is_callable in do_name.c). Else pline(silly_thing_to, word).
 * Callers: getobj GETOBJ_EXCLUDE; do_wear.c canwearobj noisy else.
 * docallcmd #if 0 `call_ok==GETOBJ_EXCLUDE` You("know those as well")
 * is compiled out; getobj never returns EXCLUDE to that switch.
 * @param {string} word
 * @param {object} otmp
 */
export async function silly_thing(word, otmp) {
    if (
        word === 'call'
        && (otmp.otyp === AMULET_OF_YENDOR
            || (otmp.otyp === FAKE_AMULET_OF_YENDOR && !otmp.known))
    ) {
        await pline("The Amulet doesn't like being called names.");
        return;
    }
    await pline(silly_thing_to.replace('%s', word));
}

/**
 * C invent.c getobj after the letter `:2003–2072` — gold "cannot WORD
 * gold", silly_thing on EXCLUDE, then getobj_apply_count.
 * @returns {Promise<null | { retry: true } | object>}
 */
async function getobj_finish_pick(otmp, word, obj_ok, counted, ilet) {
    if (ilet === GOLD_SYM || (otmp && otmp.oclass === COIN_CLASS)) {
        if (otmp && obj_ok(otmp) === GETOBJ_EXCLUDE) {
            await pline(`You cannot ${word} gold.`);
            return null;
        }
    }
    if (otmp && obj_ok(otmp) === GETOBJ_EXCLUDE) {
        await silly_thing(word, otmp);
        return null;
    }
    if (!otmp) {
        await pline("You don't have that object.");
        if (game.in_doagain) return null;
        return { retry: true };
    }
    return getobj_apply_count(
        otmp, word, counted.cntgiven, counted.cnt, ilet,
    );
}

/**
 * C invent.c check_invent_gold `:4887–4913` — at most one gold stack
 * in '$'. TRUE → gold may be #adjusted (wonky). Callers: doorganize
 * filter, iactions item-action menu. wizcmds sanity_check is D-1664.
 * @param {string} why C caller tag for impossible()
 * @returns {Promise<boolean>}
 */
export async function check_invent_gold(why) {
    let goldstacks = 0;
    let wrongslot = 0;
    for (const otmp of game.invent || []) {
        if (otmp.oclass === COIN_CLASS) {
            goldstacks++;
            if (otmp.invlet !== GOLD_SYM_ADJ) wrongslot++;
        }
    }
    if (goldstacks > 1 || wrongslot > 0) {
        await impossible(
            '%s: %s%s%s',
            why,
            wrongslot > 1 ? 'gold in wrong slots'
                : wrongslot > 0 ? 'gold in wrong slot' : '',
            (wrongslot > 0 && goldstacks > 1) ? ' and ' : '',
            goldstacks > 1 ? 'multiple gold stacks' : '',
        );
        return true;
    }
    return false;
}

/** C invent.c adjust_ok `:4916–4923`. */
function adjust_ok(obj) {
    if (!obj || obj.oclass === COIN_CLASS) return GETOBJ_EXCLUDE;
    return GETOBJ_SUGGEST;
}

/** C invent.c adjust_gold_ok `:4926–4933` — wonky gold may be #adjusted. */
function adjust_gold_ok(obj) {
    if (!obj) return GETOBJ_EXCLUDE;
    return GETOBJ_SUGGEST;
}

/** Non-compacted SUGGEST letters for #adjust (filter from doorganize). */
function adjust_raw_lets(obj_ok = adjust_ok) {
    const lets = [];
    for (const o of game.invent || []) {
        if (!o || !o.invlet) continue;
        if (obj_ok(o) !== GETOBJ_SUGGEST) continue;
        lets.push(o.invlet);
    }
    // C getobj sortloot SORTLOOT_INVLET
    lets.sort((a, b) => a.charCodeAt(0) - b.charCodeAt(0));
    return lets.join('');
}

/** Suggest letters for #adjust getobj prompt (compactify when >5). */
function adjust_suggest_lets(obj_ok = adjust_ok) {
    const s = adjust_raw_lets(obj_ok);
    if (s.length > 5) return compactify_invlets(s);
    return s;
}

/**
 * C ref: invent.c getobj("adjust", adjust_filter, GETOBJ_PROMPT|GETOBJ_ALLOWCNT)
 * Count prefix + split_otmp live. Canned CMDQ_INT/KEY live.
 * `?`/`*` → display_pickinv `&ctmp` (D-1559). force_invmenu auto
 * `?`/`*` + redo_menu (D-1578). Typed '-' mime_action (D-1579).
 * doorganize_core nobj-split is D-1621; check_invent_gold filter D-1641.
 * @param {(obj: object|null) => number} [obj_ok]
 */
async function getobj_adjust(obj_ok = adjust_ok) {
    const cq = getobj_from_cmdq(obj_ok, true);
    if (!cq.skip) return cq.otmp;
    if (!invlet_constant()) reassign();
    let oneloop = false;
    let msggiven = false;
    let ch = '';
    for (;;) {
        const rawLets = adjust_raw_lets(obj_ok);
        if (game.iflags?.force_invmenu) {
            if (!oneloop) {
                ch = getobj_force_invmenu_ch(rawLets) || '*';
            }
            if (!msggiven) {
                putmsghistory('What do you want to adjust?', false);
            }
            msggiven = true;
            oneloop = true;
        } else {
            await flush_topl_more();
            const lets = adjust_suggest_lets(obj_ok);
            const query = lets
                ? `What do you want to adjust? [${lets} or ?*]`
                : 'What do you want to adjust? [*]';
            const prompt = `${query} `;
            game._pending_message = prompt;
            await flush_screen(1);
            const disp = game.nhDisplay;
            if (disp?.setCursor) disp.setCursor(prompt.length, 0);

            const key = await nhgetch();
            ch = String.fromCharCode(key);
        }
        const counted = await getobj_take_count(ch, true);
        if (counted.retry) continue;
        ch = counted.ch;
        if (QUITCHARS.includes(ch) || ch === '\x1b') {
            if (game.flags?.verbose !== false) await pline(Never_mind);
            return null;
        }
        if (ch === HANDS_SYM) {
            // C getobj typed '-' ; adjust_ok(NULL) is EXCLUDE → !allownone
            return getobj_typed_hands('adjust', false, null);
        }
        if (ch === '?' || ch === '*') {
            const ilet = await getobj_display_pickinv(
                ch, rawLets, true, counted,
                { word: 'adjust', allownone: false, promptHasHands: false },
            );
            if (ilet === '\x1b') {
                if (game.flags?.verbose !== false) await pline(Never_mind);
                return null;
            }
            if (!ilet) {
                if (oneloop) return null;
                continue;
            }
            const picked = (game.invent || []).find((o) => o.invlet === ilet);
            const got = await getobj_finish_pick(
                picked, 'adjust', obj_ok, counted, ilet,
            );
            if (!got) return null;
            if (got.retry) {
                ch = ilet;
                continue;
            }
            game._pending_message = '';
            return got;
        }
        const otmp = (game.invent || []).find((o) => o.invlet === ch);
        const used = await getobj_finish_pick(
            otmp, 'adjust', obj_ok, counted, ch,
        );
        if (!used) return null;
        if (used.retry) continue;
        game._pending_message = '';
        return used;
    }
}

/** C ref: invent.c prinv via doorganize — quan 0 (full stack). */
async function prinv_adjust(prefix, obj) {
    await prinv(prefix || null, obj, 0);
}

function invent_obj_name(obj) {
    return has_oname(obj) ? ONAME(obj) : null;
}

/** Inline extract from invent array (C extract_nobj from gi.invent). */
function extract_invent(obj) {
    const inv = game.invent || [];
    const i = inv.indexOf(obj);
    if (i >= 0) inv.splice(i, 1);
    for (const o of inv) {
        if (o.nobj === obj) o.nobj = obj.nobj || null;
    }
}

/** C ref: invent.c reorder_invent — bubble by invlet ^ 040. */
function reorder_invent_adjust() {
    const inv = game.invent;
    if (!inv || inv.length < 2) return;
    const rank = (o) => {
        const ilet = o.invlet;
        if (ilet === GOLD_SYM_ADJ) return -1;
        if (typeof ilet === 'string' && ilet.length === 1) return ilet.charCodeAt(0) ^ 0x20;
        return 999;
    };
    let need = true;
    while (need) {
        need = false;
        for (let i = 0; i < inv.length - 1; i++) {
            if (rank(inv[i + 1]) < rank(inv[i])) {
                const t = inv[i];
                inv[i] = inv[i + 1];
                inv[i + 1] = t;
                need = true;
            }
        }
    }
}

/**
 * Absorb obj into otmp (C invent.c merged for invent stacks).
 * Returns survivor or null if not mergable.
 */
function invent_merged(otmp, obj) {
    if (!mergable(otmp, obj)) return null;
    otmp.quan = (otmp.quan || 1) + (obj.quan || 1);
    if (obj.known) otmp.known = 1;
    if (obj.bknown) otmp.bknown = 1;
    if (obj.rknown) otmp.rknown = 1;
    extract_invent(obj);
    obj.nobj = null;
    obj.where = OBJ_FREE;
    obfree(obj, otmp);
    return otmp;
}

function names_ok_for_adjust_merge(otmp, obj) {
    const otmpname = invent_obj_name(otmp);
    const objname = invent_obj_name(obj);
    return !otmpname || (objname && objname === otmpname);
}

/**
 * C invent.c display_used_invlets `:3466–3519` menu body (before
 * end_menu / select_menu). sortpack walks DEF_INV_ORDER (C
 * flags.inv_order default) with let_to_name headings; else invent
 * order and no headers. Skip avoidlet (doorganize_core split source).
 * obj_to_glyph Hallu display RNG then doname; tty_add_menu `"%c - %s"`
 * ≡ xprname. Named omit: custom packorder; VENOM if not in
 * DEF_INV_ORDER; use_menu_glyphs dash-slot.
 * @param {string|number} [avoidlet] C char; 0 / '' / '\0' = none
 * @returns {{ entries: {text:string, attr:number}[], byLet: Map<string, object> }}
 */
export function build_used_invlets_items(avoidlet = 0) {
    const inv = game.invent || [];
    const entries = [];
    const byLet = new Map();
    const skip = (ilet) => !!(avoidlet && avoidlet !== '\0' && ilet === avoidlet);
    const headingAttr = game.program_state?.gameover ? 0 : ATR_INVERSE;
    const pushItem = (otmp) => {
        if (!otmp || skip(otmp.invlet)) return false;
        // C: obj_to_glyph(otmp, rn2_on_display_rng) then doname
        obj_glyph(otmp);
        byLet.set(otmp.invlet, otmp);
        entries.push({ text: xprname(otmp), attr: 0 });
        return true;
    };
    if (game.flags?.sortpack === false) {
        for (const otmp of inv) pushItem(otmp);
    } else {
        for (const oclass of DEF_INV_ORDER) {
            let classcount = 0;
            for (const otmp of inv) {
                if (!otmp || skip(otmp.invlet) || otmp.oclass !== oclass) {
                    continue;
                }
                if (!classcount) {
                    entries.push({
                        text: let_to_name(oclass, false, false),
                        attr: headingAttr,
                    });
                    classcount++;
                }
                pushItem(otmp);
            }
        }
    }
    return { entries, byLet };
}

/**
 * C invent.c display_used_invlets. Caller doorganize_core `:5146`
 * `?`/`*`. Empty invent → 0. select_menu PICK_ONE: n>0 letter; n==0
 * retry yn; n<0 ESC noadjust. tty_end_menu prepends blank +
 * "Inventory letters used:".
 * Named omit: count-prefix; MENU_PREV/FIRST/LAST.
 * @param {string|number} [avoidlet]
 * @returns {Promise<string>} letter, '' (n==0), or '\x1b'
 */
export async function display_used_invlets(avoidlet = 0) {
    const inv = game.invent || [];
    if (!inv.length) return '';

    const { entries, byLet } = build_used_invlets_items(avoidlet);
    // C wintty.c tty_end_menu `:2680–2690` — reverse then prepend
    // blank + prompt (non-selectable).
    entries.unshift({ text: 'Inventory letters used:', attr: 0 });
    entries.unshift({ text: '', attr: 0 });

    const rows = display()?.rows || 24;
    const lmax = Math.min(52, rows - 1);
    const npages = Math.max(1, Math.floor((entries.length + lmax - 1) / lmax));
    let curr_page = 0;

    for (;;) {
        const start = curr_page * lmax;
        const page = entries.slice(start, start + lmax);
        const morestr = npages > 1
            ? `(${curr_page + 1} of ${npages})`
            : '(end) ';

        if (npages > 1) {
            const painted = page.map((e) => ({
                text: ` ${typeof e === 'string' ? e : e.text}`,
                attr: typeof e === 'string' ? 0 : (e.attr || 0),
            }));
            painted.push({ text: ` ${morestr}`, attr: 0 });
            paint_overlay(painted, {
                col: 0,
                withStatus: false,
                cursor: [morestr.length + 1, page.length],
            });
            game._tty_menu_geom = { offx: 0, endRow: page.length };
        } else {
            await paint_corner_nhw_menu(entries, morestr);
        }
        await flush_screen(1);
        const key = await nhgetch();

        if (key === 27) {
            await dismiss_nhw_menu();
            return '\x1b';
        }
        if (key === 32) {
            if (curr_page < npages - 1) {
                curr_page++;
                continue;
            }
            await dismiss_nhw_menu();
            return '';
        }
        if (key === 13 || key === 10) {
            await dismiss_nhw_menu();
            return '';
        }
        const ch = String.fromCharCode(key);
        if (npages > 1) {
            const onPage = page.some((e) => {
                const t = typeof e === 'string' ? e : e.text;
                return t.length >= 3 && t[1] === ' ' && t[0] === ch;
            });
            if (onPage && byLet.has(ch)) {
                await dismiss_nhw_menu();
                return ch;
            }
        } else if (byLet.has(ch)) {
            await dismiss_nhw_menu();
            return ch;
        }
        if (ch === MENU_SEARCH) {
            const searchItems = menu_items_from_lets(byLet, entries);
            const res = await process_menu_search(searchItems, PICK_ONE);
            if (res.kind === 'finish' && res.item?.selector) {
                await dismiss_nhw_menu();
                return res.item.selector;
            }
            continue;
        }
        // invalid / other-page letter → re-prompt (C nhbell)
    }
}

/**
 * C invent.c doorganize_core `:5067–5286` — destination pick +
 * move/collect/swap/merge, plus nobj split from splitobj (adjust_split
 * / getobj ALLOWCNT). display_used_invlets is D-1591.
 * check_invent_gold dest `$` is D-1641. Named: invlet_constant truncate.
 */
async function doorganize_core(obj) {
    if (!obj) return ECMD_CANCEL;

    // C `:5089` — gold 'from' only when check_invent_gold found a problem
    const isgold = obj.oclass === COIN_CLASS;

    // C `:5089–5096` — splitobj left parent.nobj==child, same invlet.
    let splitting = null;
    for (const otmp of game.invent || []) {
        if (otmp.nobj === obj && otmp.invlet === obj.invlet) {
            splitting = otmp;
            break;
        }
    }

    // Build candidate destination letters (C lets[] then blank used + compactify)
    const letsArr = new Array(1 + INVLET_BASIC + 1).fill(' ');
    letsArr[0] = obj.oclass === COIN_CLASS ? GOLD_SYM_ADJ : ' ';
    for (let i = 0; i < 26; i++) letsArr[1 + i] = String.fromCharCode(97 + i);
    for (let i = 0; i < 26; i++) letsArr[27 + i] = String.fromCharCode(65 + i);
    letsArr[1 + INVLET_BASIC] = ' '; // overflow slot off by default

    for (const otmp of game.invent || []) {
        if (otmp === obj || mergable(otmp, obj)) continue;
        const let_ = otmp.invlet;
        if (let_ >= 'a' && let_ <= 'z') letsArr[1 + (let_.charCodeAt(0) - 97)] = ' ';
        else if (let_ >= 'A' && let_ <= 'Z') {
            letsArr[1 + (let_.charCodeAt(0) - 65) + 26] = ' ';
        } else if (let_ === NOINVSYM) letsArr[1 + INVLET_BASIC] = NOINVSYM;
    }

    let lets = letsArr.filter((c) => c !== ' ').join('');
    if (lets.length > 5) lets = compactify_invlets(lets);

    // C `:5137–5142` — "Split N" when nobj-split, else "Adjust letter"
    let qbuf = splitting
        ? `Split ${obj.quan}`
        : 'Adjust letter';
    qbuf += ` to what [${lets}]`;
    if (game.invent?.length) qbuf += ' (? see used letters)';
    qbuf += '?';

    let ever_mind = false;
    let let_;
    const noadjust = async () => {
        if (splitting) unsplitobj(obj);
        if (!ever_mind) await pline(Never_mind);
        return ECMD_OK;
    };
    for (let trycnt = 1; ; ++trycnt) {
        // C `:5143` — gold 'from' forces dest '$' (no yn_function)
        let_ = !isgold ? await yn_function(qbuf, null, '\0') : GOLD_SYM_ADJ;
        if (let_ === '?' || let_ === '*') {
            // C `:5144–5150` — splitting ? obj->invlet : 0
            let_ = await display_used_invlets(splitting ? obj.invlet : 0);
            if (!let_) continue;
            if (let_ === '\x1b') return noadjust();
        }
        if (QUITCHARS.includes(let_)
            || (splitting && let_ === obj.invlet)) {
            return noadjust();
        }
        if (let_ === GOLD_SYM_ADJ && obj.oclass !== COIN_CLASS) {
            await pline(`Only gold coins may be moved into the '${GOLD_SYM_ADJ}' slot.`);
            ever_mind = true;
            return noadjust();
        }
        const isLetter = /[a-zA-Z]/.test(let_) && let_ !== '@';
        if (isLetter || (lets.includes(let_) && let_ !== '-')) break;
        if (trycnt === 5) return noadjust();
        await pline('Select an inventory slot letter.');
    }

    const collect = let_ === obj.invlet;
    let adj_type = collect ? 'Collecting:'
        : !splitting ? 'Moving:'
            : 'Splitting:';
    let bumped = null;

    extract_invent(obj);

    const invSnap = [...(game.invent || [])];
    for (let i = 0; i < invSnap.length; ) {
        const otmp = invSnap[i];
        if (!otmp || (game.invent || []).indexOf(otmp) < 0) {
            i++;
            continue;
        }
        if (collect) {
            if (names_ok_for_adjust_merge(otmp, obj) && invent_merged(otmp, obj)) {
                obj = otmp;
                extract_invent(obj);
                // invent_merged removed obj (old); otmp survived then extracted
                // refresh snap cursor: continue from same index with new invent order
                invSnap.splice(0, invSnap.length, ...(game.invent || []));
                i = 0;
                continue;
            }
        } else if (otmp.invlet === let_) {
            if (names_ok_for_adjust_merge(otmp, obj) && invent_merged(otmp, obj)) {
                adj_type = 'Merging:';
                obj = otmp;
                extract_invent(obj);
                break;
            }
            if (!splitting) {
                adj_type = 'Swapping:';
                otmp.invlet = obj.invlet;
            } else {
                // C `:5205–5239` — strip from-name, merge or bump / pack-full
                const objname = invent_obj_name(obj);
                if (objname && !obj.oartifact) {
                    if (!obj.oextra) obj.oextra = {};
                    obj.oextra.oname = '';
                }
                if (!mergable(otmp, obj)) {
                    if (objname) {
                        if (!obj.oextra) obj.oextra = {};
                        obj.oextra.oname = objname;
                    }
                }
                if (invent_merged(otmp, obj)) {
                    adj_type = 'Splitting and merging:';
                    obj = otmp;
                    extract_invent(obj);
                } else if (inv_cnt(false) >= INVLET_BASIC) {
                    unsplitobj(obj);
                    await pline('Your pack is too full.');
                    return ECMD_OK;
                } else {
                    bumped = otmp;
                    extract_invent(bumped);
                }
            }
            break;
        }
        i++;
    }

    obj.invlet = let_;
    obj.where = OBJ_INVENT;
    if (!game.invent) game.invent = [];
    game.invent.unshift(obj);
    reorder_invent_adjust();
    if (bumped) {
        assigninvlet(bumped);
        bumped.where = OBJ_INVENT;
        game.invent.unshift(bumped);
        reorder_invent_adjust();
    }

    await prinv_adjust(adj_type, obj);
    if (bumped) await prinv_adjust('Moving:', bumped);
    if (splitting) clear_splitobjs();
    update_inventory();
    return ECMD_OK;
}

/**
 * C invent.c adjust_split `:5007–5065` — itemactions IA_ADJUST_STACK
 * (#altadjust). Queued invlet answers getobj("split"); quan==2 splits
 * 1 without a prompt; else yn first digit then get_count
 * GC_ECHOFIRST|GC_CONDHIST. Not get_count itself (D-1613).
 * @returns {Promise<number>} ECMD_FAIL / ECMD_CANCEL / doorganize_core
 */
export async function adjust_split() {
    const obj0 = await getobj('split', adjust_ok, GETOBJ_NOFLAGS);
    if (!obj0 || (obj0.quan || 1) < 2 || obj0.otyp === OTYP_GOLD_PIECE) {
        return ECMD_FAIL;
    }

    let splitamount = 0;
    if ((obj0.quan || 1) === 2) {
        splitamount = 1;
    } else {
        const dig = await yn_function('Split off how many?', null, '\0');
        if (dig < '0' || dig > '9') {
            await pline(Never_mind);
            return ECMD_CANCEL;
        }
        const box = { n: 0 };
        const letCode = await get_count(
            null, dig, 0, box, GC_ECHOFIRST | GC_CONDHIST,
        );
        const let_ = String.fromCharCode(letCode & 0xff);
        // \033 is in quitchars; treat as cancel rather than accept
        if (!let_ || let_ === '\x1b' || !QUITCHARS.includes(let_)) {
            await pline(Never_mind);
            return ECMD_CANCEL;
        }
        splitamount = box.n;
    }
    if (splitamount < 1 || splitamount >= (obj0.quan || 1)) {
        const Amount = 'Amount to split from current stack must be';
        if (splitamount < 1) await pline(`${Amount} at least 1.`);
        else await pline(`${Amount} less than ${obj0.quan}.`);
        return ECMD_CANCEL;
    }

    // C splitobj threads child onto nobj (= invent). JS splitobj leaves
    // invent[] unspliced (D-0924); splice like getobj_split_otmp.
    const child = splitobj(obj0, splitamount);
    if (!child) return ECMD_FAIL;
    const inv = game.invent;
    if (inv) {
        const i = inv.indexOf(obj0);
        if (i >= 0) inv.splice(i + 1, 0, child);
    }
    child.where = OBJ_INVENT;
    return doorganize_core(child);
}

/**
 * C ref: invent.c doorganize — #adjust inventory letters.
 * check_invent_gold chooses adjust_gold_ok vs adjust_ok (D-1641).
 * `!flags.invlet_constant` → reassign (D-1655).
 * @returns {number} ECMD_OK / ECMD_CANCEL
 */
export async function doorganize() {
    const inv = game.invent || [];
    if (
        !inv.length
        || (inv.length === 1 && inv[0].oclass === COIN_CLASS
            && inv[0].invlet === GOLD_SYM_ADJ)
    ) {
        await pline(
            `You aren't carrying anything ${!inv.length ? 'to adjust' : 'adjustable'}.`,
        );
        return ECMD_OK;
    }

    if (!invlet_constant()) reassign();

    const adjust_filter = (await check_invent_gold('adjust'))
        ? adjust_gold_ok : adjust_ok;
    const obj = await getobj_adjust(adjust_filter);
    return doorganize_core(obj);
}
