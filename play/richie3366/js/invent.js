// invent.js — Inventory / discoveries / attributes / #adjust.
// C ref: invent.c display_inventory / ddoinv / let_to_name / doorganize;
//        o_init.c dodiscovered / discover_object;
//        insight.c enlightenment (BASICENLIGHTENMENT subset).

import { game } from './gstate.js';
import { nhgetch } from './input.js';
import {
    flush_screen, flush_topl_more, pline, docrt, status_line_2, message_menu,
} from './display.js';
import { xprname, an, vtense, doname, disco_typename, Japanese_item_name, xname, cxname_singular, set_xname_observe, set_distant_cansee } from './objnam.js';
import { yn_function } from './getline.js';
import { mergable } from './mkobj.js';
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
    objectNames,
    objectNameStrs,
    objectDescrs,
    objects,
} from './objects.js';
import {
    Never_mind,
    ECMD_OK,
    ECMD_CANCEL,
    OBJ_INVENT,
    OBJ_CONTAINED,
    OBJ_FLOOR,
    Has_contents,
    has_oname,
    ONAME,
    SORTLOOT_PACK,
    SORTLOOT_LOOT,
    SORTLOOT_INVLET,
    PICK_ONE,
} from './const.js';
import { ATR_INVERSE, NO_COLOR } from './terminal.js';
import {
    acurr, acurrstr, get_strength_str, exercise,
    A_STR, A_INT, A_WIS, A_DEX, A_CON, A_CHA,
} from './attrib.js';
import { depth } from './hacklib.js';
import {
    DOOR, STAIRS, FOUNTAIN, SINK, ALTAR, GRAVE, TREE, IRONBARS,
    D_NODOOR, D_ISOPEN, D_BROKEN,
    A_LAWFUL, A_NEUTRAL, A_CHAOTIC,
    ROLE_GENDMASK, ROLE_MALE, ROLE_FEMALE,
    IS_DOOR,
    P_NONE, P_DAGGER, P_KNIFE, P_AXE, P_PICK_AXE, P_SHORT_SWORD,
    P_BROAD_SWORD, P_LONG_SWORD, P_TWO_HANDED_SWORD,
    P_CLUB, P_MACE, P_MORNING_STAR, P_FLAIL, P_QUARTERSTAFF,
    P_SPEAR, P_TRIDENT, P_LANCE, P_BOW, P_SLING, P_CROSSBOW,
    P_DART, P_SHURIKEN, P_BOOMERANG, P_UNICORN_HORN,
    P_BARE_HANDED_COMBAT, P_TWO_WEAPON_COMBAT,
    P_ISRESTRICTED, P_UNSKILLED, P_BASIC, P_SKILLED,
    P_EXPERT, P_MASTER, P_GRAND_MASTER,
    W_ARMOR, W_AMUL, W_RING, W_TOOL, W_SADDLE,
    NEW_MOON,
    FULL_MOON,
    Upolyd,
    MAGICENLIGHTENMENT,
} from './const.js';
import { align_str, align_gname, u_gname, rank_of } from './roles.js';
import {
    UNENCUMBERED, SLT_ENCUMBER, MOD_ENCUMBER, HVY_ENCUMBER, EXT_ENCUMBER,
    OVERLOADED, WT_WEIGHTCAP_STRCON, WT_WEIGHTCAP_SPARE, MAX_CARR_CAP,
    WT_WOUNDEDLEG_REDUCT, LEFT_SIDE, RIGHT_SIDE,
    NOT_HUNGRY,
} from './const.js';
import { stairway_at, stairs_description } from './mklev.js';
import { objects_at } from './mkobj.js';
import { PM_SAMURAI, PM_MONK } from './generated/monsters_data.js';
import { humanoid } from './monsters.js';

// C ref: hack.c weight_cap() — STR+CON base; wounded-leg reduct when !Flying.
// Named omissions: Boots_on Lev defer; Upolyd msize/cwt; Lev/air/steed MAX.
export function weight_cap() {
    let carrcap = WT_WEIGHTCAP_STRCON * (acurrstr() + acurr(A_CON))
        + WT_WEIGHTCAP_SPARE;
    if (carrcap > MAX_CARR_CAP) carrcap = MAX_CARR_CAP;
    const u = game.u || {};
    // C: Levitation || airlevel || strong steed → MAX; else wounded legs
    if (!(u.Levitation || u.Flying)) {
        const ew = u.EWounded_legs | 0;
        if (ew & LEFT_SIDE) carrcap -= WT_WOUNDEDLEG_REDUCT;
        if (ew & RIGHT_SIDE) carrcap -= WT_WOUNDEDLEG_REDUCT;
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
 * C ref: invent.c sortloot — build Loot[] sorted view; does not relink.
 * Branch envelope: SORTLOOT_PACK class order + SORTLOOT_LOOT name;
 * named omissions: subclass/disco/BUCX/erosion/INVLET/INUSE/filter/
 * SORTLOOT_PETRIFY; loot_classify armor/weapon/tool detail.
 *
 * @param {object|null} olist head of nobj (or nexthere) chain
 * @param {number} mode SORTLOOT_* flags
 * @param {boolean} [by_nexthere=false]
 * @returns {{obj: object, indx: number}[]}
 */
export function sortloot(olist, mode, by_nexthere = false) {
    const items = [];
    let i = 0;
    for (let o = olist; o; o = by_nexthere ? o.nexthere : o.nobj) {
        items.push({
            obj: o, indx: i++, orderclass: 0, subclass: 0, disco: 0, str: null,
        });
    }
    if (!mode || items.length <= 1) return items;

    // C: flags.sortpack ? flags.inv_order : def_srt_order — inv_order subset
    const classorder = DEF_INV_ORDER;

    items.sort((sli1, sli2) => {
        const obj1 = sli1.obj;
        const obj2 = sli2.obj;
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

// C ref: invent.c let_to_name names[]
const CLASS_NAMES = {
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
};

/**
 * C ref: invent.c let_to_name — class heading for INVORDER_SORT menus.
 * Named omissions: unpaid prefix; showsym "  ('%c')" padding; CONTAINED_SYM;
 * Venom / Illegal objects.
 */
export function let_to_name(letch, unpaid = false, _showsym = false) {
    const name = CLASS_NAMES[letch] || 'Items';
    return unpaid ? `Unpaid ${name}` : name;
}

const GOLD_SYM = '$';

/**
 * C ref: objclass.h OBJ_DESCR(objects[otyp]) —
 * obj_descr[objects[otyp].oc_descr_idx].oc_descr (post-shuffle for
 * potions/scrolls/wands).
 */
function appearance_of(otyp) {
    const oc = game.objects?.[otyp];
    if (!oc) return null;
    const idx = oc.oc_descr_idx ?? otyp;
    return objectDescrs[idx] ?? null;
}

/** C ref: o_init.c interesting_to_discover — needs OBJ_DESCR (or uname). */
function interesting_to_discover(otyp) {
    // C: Samurai Japanese items always disclosed by '\'
    if (game.urole?.mnum === PM_SAMURAI && Japanese_item_name(otyp, null))
        return true;
    const oc = game.objects?.[otyp];
    if (!oc) return false;
    if (oc.oc_uname) return true;
    if (!(oc.oc_name_known || oc.oc_encountered)) return false;
    return appearance_of(otyp) != null;
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
 * C ref: o_init.c observe_object — dknown + discover_object(..., FALSE, TRUE).
 */
export function observe_object(obj) {
    if (!obj || game.u?.Hallucination) return;
    // FIRST_OBJECT / generic skip deferred
    obj.dknown = 1;
    discover_object(obj.otyp, false, true);
}

// C: xname_flags observe + distant_name cansee (wired late to break cycles)
set_xname_observe(observe_object);
set_distant_cansee(cansee);

export function invent_lines() {
    const inv = game.invent || [];
    const lines = [];
    // C ref: windows.c add_menu_heading — suppress highlight when gameover
    const headingAttr = game.program_state?.gameover ? 0 : ATR_INVERSE;
    for (const oclass of DEF_INV_ORDER) {
        const items = inv.filter(o => o.oclass === oclass);
        if (!items.length) continue;
        lines.push({ text: CLASS_NAMES[oclass] || 'Items', attr: headingAttr });
        for (const otmp of items) {
            // C ref: invent.c sortloot_item — observe_object before naming
            if (!game.u?.Blind) observe_object(otmp);
            lines.push({ text: xprname(otmp), attr: 0 });
        }
    }
    lines.push({ text: '(end)', attr: 0 });
    return lines;
}

/**
 * C ref: invent.c display_pickinv(lets, …, want_reply=TRUE) subset for getobj `?`/`*`.
 * Shows invent filtered to `lets` (or all when lets null/'*'), PICK_ONE by
 * invlet; ESC cancels; Space next page or null on last; Return → null.
 * Multi-page (nitems>lmax): fullscreen "(N of M)" like tty process_menu_window;
 * only current-page selectors accepted (C resp).
 * C n==1 && !force_invmenu && !menu_requested && lets set →
 * tty_message_menu(PICK_ONE) topline xprname+--More-- (not corner menu).
 * Named omissions: hands/xtra_choice; count; sortloot inuse_only; wizid;
 * force_invmenu / menu_requested menu path polish; MENU_PREV/FIRST/LAST.
 * @returns {string|null} selected invlet, or null if cancelled / no pick
 */
export async function display_pickinv_reply(lets) {
    const allowAll = !lets || lets === '*';
    const inv = game.invent || [];

    // C: n = lets ? strlen(lets) : invent 0/1/2+; then
    // if (usextra || (n==1 && (!lets || wizid))) ++n — so bare invent
    // with one item skips message_menu; getobj "?" with one letter does not.
    let n;
    if (!allowAll) {
        n = lets.length;
    } else {
        n = !inv.length ? 0 : inv.length === 1 ? 1 : 2;
        if (n === 1) n++; // !lets → bump
    }

    if (n === 0) {
        await pline('Not carrying anything appropriate.');
        return null;
    }

    if (
        n === 1
        && !game.iflags?.force_invmenu
        && !game.iflags?.menu_requested
    ) {
        // C: first invent whose invlet == lets[0] (lets non-null here)
        const want = lets[0];
        const otmp = inv.find((o) => o && o.invlet === want);
        if (!otmp) {
            await pline('Not carrying anything appropriate.');
            return null;
        }
        // C: message_menu(otmp->invlet, PICK_ONE, xprname(..., lets[0], TRUE))
        return await message_menu(
            otmp.invlet,
            PICK_ONE,
            xprname(otmp, want, true),
        );
    }

    const allow = allowAll ? null : new Set([...lets]);
    const entries = [];
    const byLet = new Map();
    for (const oclass of DEF_INV_ORDER) {
        const items = inv.filter((o) => {
            if (o.oclass !== oclass) return false;
            if (!allow) return true;
            return allow.has(o.invlet);
        });
        if (!items.length) continue;
        entries.push({ text: CLASS_NAMES[oclass] || 'Items', attr: ATR_INVERSE });
        for (const otmp of items) {
            if (!game.u?.Blind) observe_object(otmp);
            const letch = otmp.invlet || '?';
            byLet.set(letch, otmp);
            entries.push({ text: xprname(otmp), attr: 0 });
        }
    }
    if (!byLet.size) {
        await pline('Not carrying anything appropriate.');
        return null;
    }

    // C ref: wintty.c tty_end_menu / process_menu_window PICK_ONE —
    // lmax=rows-1; npages>1 → "(N of M)"; Space next page; letter on
    // current page selects (resp collects page selectors only).
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
        } else {
            await paint_corner_nhw_menu(entries, morestr);
        }
        await flush_screen(1);
        const key = await nhgetch();

        if (key === 27) {
            game._menu_overlay = false;
            await docrt();
            await flush_screen(1);
            return '\x1b';
        }
        // C: Space → next page, or finish (no pick) on last page
        if (key === 32) {
            if (curr_page < npages - 1) {
                curr_page++;
                continue;
            }
            game._menu_overlay = false;
            await docrt();
            await flush_screen(1);
            return null;
        }
        if (key === 13 || key === 10) {
            game._menu_overlay = false;
            await docrt();
            await flush_screen(1);
            return null;
        }
        const ch = String.fromCharCode(key);
        // C: only current-page selectors are in resp (PICK_ONE)
        if (npages > 1) {
            const onPage = page.some((e) => {
                const t = typeof e === 'string' ? e : e.text;
                return t.length >= 3 && t[1] === ' ' && t[0] === ch;
            });
            if (onPage && byLet.has(ch)) {
                game._menu_overlay = false;
                await docrt();
                await flush_screen(1);
                return ch;
            }
        } else if (byLet.has(ch)) {
            game._menu_overlay = false;
            await docrt();
            await flush_screen(1);
            return ch;
        }
        // invalid / other-page letter → re-prompt same page
    }
}

/**
 * C ref: invent.c display_inventory(NULL, FALSE) / display_pickinv PICK_NONE.
 * C ref: wintty.c tty_end_menu — lmax=rows-1; npages>1 → process_menu_window
 *        "(N of M)" paging (select_menu PICK_NONE). Single-page corner vs
 *        fullscreen still uses "(end) ".
 * Shows invent and waits for a dismiss key (Space advances pages).
 */
export async function display_inventory() {
    const lines = invent_lines(); // includes trailing "(end)"
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
        return;
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
    await nhgetch(); // dismiss (Esc / space)
    clear_overlay();
    await docrt();
    await flush_screen(1);
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
 *                                credit_hero)
 * credit_hero → exercise(A_WIS, TRUE) when newly naming the type.
 */
export function discover_object(
    oindx,
    mark_as_known,
    mark_as_encountered = false,
    credit_hero = false,
) {
    if (oindx == null || oindx < 0) return;
    const objects = game.objects;
    if (!objects?.[oindx]) return;
    if (!game.disco) game.disco = new Array(objects.length).fill(0);

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
    }
}

/** C ref: hack.h makeknown — discover_object(x, TRUE, TRUE, TRUE). */
export function makeknown(otyp) {
    discover_object(otyp, true, true, true);
}

/**
 * C ref: o_init.c dodiscovered() — discoveries by inv_order within each class.
 */
export async function dodiscovered() {
    const lines = [
        { text: 'Discoveries, by order of discovery within each class', attr: 0 },
        { text: '', attr: 0 },
    ];
    const bases = game.bases || [];
    const disco = game.disco || [];
    // C walks flags.inv_order; DEF_INV_ORDER matches options.c def_inv_order.
    // Named omission: VENOM_CLASS append when absent from inv_order.
    const { append_price_quote } = await import('./shk.js');
    for (const oclass of DEF_INV_ORDER) {
        const found = [];
        const start = bases[oclass] || 0;
        const end = bases[oclass + 1] || disco.length;
        for (let i = start; i < end; i++) {
            const dis = disco[i];
            if (dis && interesting_to_discover(dis)) found.push(dis);
        }
        if (!found.length) continue;
        lines.push({ text: CLASS_NAMES[oclass], attr: ATR_INVERSE });
        for (const otyp of found) {
            const enc = !!game.objects?.[otyp]?.oc_encountered;
            const prefix = enc ? '  ' : '* ';
            // C: disco_append_typename → disco_typename + append_price_quote
            let buf = prefix + disco_typename(otyp);
            buf = append_price_quote(buf, otyp);
            lines.push({ text: buf, attr: 0 });
        }
    }
    // Pad so --More-- lands on row 23 like C tty text window.
    while (lines.length < 24) lines.push({ text: '', attr: 0 });
    lines[23] = { text: '--More--', attr: 0 };

    paint_overlay(lines, { cursor: [8, 23] });
    await flush_screen(1);
    await nhgetch(); // Esc
    clear_overlay();
    await docrt();
    await flush_screen(1);
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
    const otyp = SKILL_NAME_OTYP[skill];
    if (otyp != null && otyp >= 0) {
        const s = objectNameStrs[otyp];
        if (s) return s;
    }
    // Odd skills (saber/hammer/whip/spells/…) deferred
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
 * C ref: weapon.c weapon_descr — P_NAME(weapon_type); special cases deferred
 * (ammo, mattock, wet towel, shield of reflection).
 */
function weapon_descr(obj) {
    const skill = weapon_type(obj);
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
 * Wizard `<%d>` uhunger suffix deferred.
 */
function status_hunger_attr(u = game.u || {}) {
    const uhs = u.uhs ?? NOT_HUNGRY;
    let buf = (HU_STAT[uhs] || '').trim();
    if (!buf) buf = 'not hungry';
    buf = buf.charAt(0).toLowerCase() + buf.slice(1);
    if (buf === 'weak') buf += ' from severe hunger';
    else if (buf.startsWith('faint')) buf += ' due to starvation';
    return buf;
}

/**
 * C ref: insight.c status_enlightenment encumbrance arm.
 * Wizard `<%d>` inv_weight suffix deferred.
 * @param {number} final ENL_* (0 = in progress)
 */
function status_encumbrance_attr(final = 0) {
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
        buf += `; movement ${!final ? 'is' : 'was'} ${adj}`;
        if (cap < OVERLOADED) buf += ' slowed';
        return buf;
    }
    return 'unencumbered';
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

/** C ref: youprop.h Stealth — (H || E) && !B. */
function hero_Stealth(u = game.u || {}) {
    return !!(((u.HStealth | 0) || (u.EStealth | 0)) && !((u.BStealth | 0)));
}

/**
 * C ref: insight.c status_enlightenment — Deaf + Sleepy + hunger +
 * encumbrance subset (poly/ride/other troubles/weapon deferred to callers).
 * Overlay (^X) lines need one extra leading space vs enlght_line.
 * @param {number} final
 * @param {{ overlay?: boolean, magic?: boolean }} opts
 */
function status_core_lines(final = 0, opts = {}) {
    const overlay = !!opts.overlay;
    const magic = !!opts.magic;
    const You_ = 'You ';
    const are = 'are ';
    const were = 'were ';
    const mid = final ? were : are;
    const wrap = (attr) => {
        const line = enlght_line_txt(You_, mid, attr, '');
        return overlay ? ` ${line}` : line;
    };
    const out = [];
    // C: if (Deaf) you_are("deaf", from_what(DEAF)); from_what wizard-only
    if (hero_Deaf()) out.push(wrap('deaf'));
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
        await doattributes();
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
    const raceAdj = game.urace?.adj || game.urace?.name || 'human';
    const atype = u.ualign?.type ?? A_NEUTRAL;
    const align = align_str(atype);
    const turns = game.moves || 1;
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
        lines.push(you_are(
            `${an(rank)}, a level ${u.ulevel || 1} ${genderPart}${raceAdj} ${role}`,
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

        let dgnbuf = game.dungeons?.[u.uz?.dnum | 0]?.dname || 'The Dungeons of Doom';
        if (/^The /i.test(dgnbuf)) {
            dgnbuf = dgnbuf.charAt(0).toLowerCase() + dgnbuf.slice(1);
        }
        const dlev = depth(u.uz || { dnum: 0, dlevel: 1 });
        lines.push(you_are(`in ${dgnbuf}, on level ${dlev}`));
        lines.push(enlght_line_txt(You_, 'entered ', `the dungeon ${turns} turn${turns === 1 ? '' : 's'} ago`, ''));

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
            lines.push(
                ` Your wallet contain${final ? 'ed' : 's'} ${umoney} zorkmid${umoney === 1 ? '' : 's'}.`,
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
 * C ref: insight.c enlightenment(BASICENLIGHTENMENT) — pantheon/wallet from C.
 * ^X path (ENL_GAMEINPROGRESS); gameover uses enlightenment(..., final).
 */
export async function doattributes() {
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
    const race = game.urace?.adj || game.urace?.name || 'human';
    const atype = u.ualign?.type ?? A_NEUTRAL;
    const align = align_str(atype);
    const turns = game.moves || 1;
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
        ? `  Your wallet contains ${gold} zorkmids.`
        : '  Your wallet is empty.';

    const uexp = u.uexp | 0;
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

    // C ref: insight.c background_enlightenment — dungeon line from
    // dungeons[uz.dnum].dname + depth (quest/endgame/knox/rogue/bigroom deferred)
    let dgnbuf = game.dungeons?.[u.uz?.dnum | 0]?.dname || 'The Dungeons of Doom';
    if (/^The /i.test(dgnbuf)) {
        dgnbuf = dgnbuf.charAt(0).toLowerCase() + dgnbuf.slice(1);
    }
    const dlev = depth(u.uz || { dnum: 0, dlevel: 1 });
    const dungeonLine = `  You are in ${dgnbuf}, on level ${dlev}.`;

    // C ref: insight.c background_enlightenment — continuous stream; tty
    // pages at 23 content rows then "(k of n)". Moon/friday13 sit between
    // "entered" and experience. night()/midnight deferred.
    const lines = [
        ` ${name} the ${role}'s attributes:`,
        '',
        ' Background:',
        `  You are ${an(rank)}, a level ${u.ulevel || 1} ${genderPart}${race} ${role}.`,
        `  You are ${align}, on a mission for ${u_gname(game.urole, atype)}`,
        opposed,
        `  You are ${hand}-handed.`,
        dungeonLine,
        `  You entered the dungeon ${turns} turn${turns === 1 ? '' : 's'} ago.`,
    ];
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
        `  You have ${uexp} experience point${uexp === 1 ? '' : 's'}.`,
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
        ' Status:',
    );
    // C ref: insight.c status_enlightenment — Deaf/Sleepy before hunger
    // (^X is BASIC-only unless wizard/explore → magic false; Sleepy then
    // needs cause_known).
    lines.push(...status_core_lines(0, { overlay: true, magic: false }));
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
    lines.push('');
    // C: explore mode adds Attributes + explore/bones notes before misc.
    if (game.flags?.explore || game.flags?.discover) {
        lines.push(
            ' Attributes:',
            '  You are nominally aligned.',
        );
        // C ref: insight.c attributes_enlightenment — magic_negation after
        // piousness, before pray (resistances omitted when absent)
        const armpro = magic_negation_you();
        if (armpro > 0) {
            const mc_types = ['', 'warded', 'guarded', 'protected'];
            const idx = Math.min(armpro, mc_types.length - 1);
            lines.push(`  You are ${mc_types[idx]}.`);
        }
        lines.push(
            "  You can't safely pray.",
            '',
            ' Miscellaneous:',
            '  You are running in explore mode.',
            "  You haven't encountered any bones levels.",
            '  Total elapsed playing time is none.',
        );
    } else {
        lines.push(
            ' Miscellaneous:',
            '  Total elapsed playing time is none.',
        );
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
 * C ref: invent.c doprgold / #showgold / '$'.
 * Named omissions: hidden_gold stashed message; shopper_financial_report;
 * menu_requested dispinv; non-verbose "no money" / total arms.
 */
export async function doprgold() {
    let umoney = 0;
    for (const o of game.invent || []) {
        if (o.oclass === COIN_CLASS) umoney += o.quan | 0;
    }
    if (game.flags?.verbose !== false) {
        if (!umoney) await pline('Your wallet is empty.');
        else await pline(`Your wallet contains ${umoney} zorkmid${umoney === 1 ? '' : 's'}.`);
    } else if (umoney) {
        await pline(`You are carrying a total of ${umoney} zorkmid${umoney === 1 ? '' : 's'}.`);
    } else {
        await pline('You have no money.');
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
    // C: xprname(..., !total_of, 0L, quan) — no trailing '.' when total_of
    const body = xprname(obj, undefined, !totalOf, q);
    const verb = game.flags?.verbose !== false ? totalbuf : '';
    await pline(`${pfx}${pfx ? ' ' : ''}${body}${verb}`);
}

/**
 * C ref: invent.c doprwep / #seeweapon / ')'.
 * Named omissions: menu_requested → dispinv_with_action(lets) for
 * uwep/uswapwep/uquiver (falls through to prinv until that lands).
 */
export async function doprwep() {
    const u = game.u || {};
    if (!u.uwep) {
        // C: You("are %s.", empty_handed());
        await pline(`You are ${empty_handed()}.`);
        return ECMD_OK;
    }
    if (game.iflags?.menu_requested) {
        // dispinv_with_action deferred — clear sticky m-prefix
        game.iflags.menu_requested = false;
    }
    // C: prinv(NULL, uwep, 0L); if (twoweap) prinv(uswapwep)
    await prinv(null, u.uwep, 0);
    if (u.twoweap) {
        await prinv(null, u.uswapwep, 0);
    }
    return ECMD_OK;
}

/** C ref: invent.c wearing_armor */
function wearing_armor() {
    const u = game.u || {};
    return !!(u.uarm || u.uarmc || u.uarmf || u.uarmg
        || u.uarmh || u.uarms || u.uarmu);
}

/**
 * C ref: invent.c noarmor(report_uskin).
 * Named omit: uskin dragon-scale shorten + "embedded in your skin" pline.
 */
async function noarmor(report_uskin) {
    if (!game.u?.uskin || !report_uskin) {
        await pline('You are not wearing any armor.');
    } else {
        // uskin path deferred — still acknowledge empty armor slots
        await pline('You are not wearing any armor.');
    }
}

/**
 * C ref: invent.c doprarm / #seearmor / '['.
 * Single worn piece → display_pickinv n==1 → tty_message_menu(PICK_NONE)
 * → pline(xprname(..., TRUE)). Multi-piece / menu_requested →
 * dispinv_with_action menu deferred (sequential prinv interim).
 */
export async function doprarm() {
    const u = game.u || {};
    if (!wearing_armor()) {
        await noarmor(true);
        return ECMD_OK;
    }
    // C SORTPACK_INUSE slot order for lets[]
    const pieces = [];
    if (u.uarm) pieces.push(u.uarm);
    if (u.uarmc) pieces.push(u.uarmc);
    if (u.uarms) pieces.push(u.uarms);
    if (u.uarmh) pieces.push(u.uarmh);
    if (u.uarmg) pieces.push(u.uarmg);
    if (u.uarmf) pieces.push(u.uarmf);
    if (u.uarmu) pieces.push(u.uarmu);

    if (game.iflags?.menu_requested) {
        // dispinv_with_action menu deferred — clear sticky m-prefix
        game.iflags.menu_requested = false;
    }
    // len==1 && !menu → message_menu PICK_NONE; else menu (deferred)
    for (const otmp of pieces) {
        await pline(xprname(otmp, undefined, true));
    }
    return ECMD_OK;
}

/**
 * C ref: invent.c doprring / #seerings / '='.
 * Empty → "not wearing any rings."; worn → dispinv path (single-item
 * pline; multi/menu deferred). Meat-ring / Ring header label deferred.
 */
export async function doprring() {
    const u = game.u || {};
    if (!u.uleft && !u.uright) {
        await pline('You are not wearing any rings.');
        return ECMD_OK;
    }
    const pieces = [];
    // C: uright then uleft for lets[]
    if (u.uright) pieces.push(u.uright);
    if (u.uleft) pieces.push(u.uleft);
    if (game.iflags?.menu_requested) {
        game.iflags.menu_requested = false;
    }
    for (const otmp of pieces) {
        await pline(xprname(otmp, undefined, true));
    }
    return ECMD_OK;
}

/**
 * C ref: invent.c dopramulet / #seeamulet / '"'.
 * Named omit: menu_requested / Amulet header via dispinv_with_action.
 */
export async function dopramulet() {
    const u = game.u || {};
    if (!u.uamul) {
        await pline('You are not wearing an amulet.');
        return ECMD_OK;
    }
    if (game.iflags?.menu_requested) {
        game.iflags.menu_requested = false;
    }
    await pline(xprname(u.uamul, undefined, true));
    return ECMD_OK;
}

/** C ref: invent.c tool_being_used */
function tool_being_used(obj) {
    if (((obj.owornmask || 0) & (W_TOOL | W_SADDLE)) !== 0) return true;
    if (obj.oclass !== TOOL_CLASS) return false;
    const LEASH = objectNames.indexOf('LEASH');
    return obj === game.u?.uwep || !!obj.lamplit
        || (obj.otyp === LEASH && !!obj.leashmon);
}

/**
 * C ref: invent.c doprtool / #seetools / '('.
 * Named omit: multi-tool dispinv_with_action menu.
 */
export async function doprtool() {
    const pieces = [];
    for (const otmp of game.invent || []) {
        if (tool_being_used(otmp)) pieces.push(otmp);
    }
    if (!pieces.length) {
        await pline('You are not using any tools.');
        return ECMD_OK;
    }
    if (game.iflags?.menu_requested) {
        game.iflags.menu_requested = false;
    }
    for (const otmp of pieces) {
        await pline(xprname(otmp, undefined, true));
    }
    return ECMD_OK;
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
 * Ported envelope: non-swallow, non-blind; dfeature pline; single
 * `You see here`; multi NHW_MENU "Things that are here:" via
 * display_nhwindow(WIN_MESSAGE)+putstr (D-0220); **observe_object
 * before doname** (D-0399; C xname_flags). **doname_with_price**
 * (D-0460). Named omissions: pile_limit skip_objects, Blind feel,
 * trap+region, cockatrice feel, engulfer stomach; blanket xname
 * observe / distant_name. Furniture with ct==0 uses
 * pickup.describe_decor (D-0356), not this path.
 */
export async function look_here(obj_cnt = 0, lookhere_flags = 0) {
    // Dynamic import avoids invent↔shk cycle (shk imports paint_corner).
    const { doname_with_price } = await import('./shk.js');
    const u = game.u;
    const verb = 'see'; // Blind feel path deferred
    const skip_dfeature = !!(lookhere_flags & 0x2); // LOOKHERE_SKIP_DFEATURE
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
        if (!skip_objects && !dfeature)
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
        if (!game.u?.Blind) observe_object(otmp);
        // C: You("%s here %s.", verb, doname_with_price(otmp))
        await pline(`You ${verb} here ${doname_with_price(otmp)}.`);
        return;
    }

    // C: display_nhwindow(WIN_MESSAGE, FALSE) then NHW_MENU putstr list
    await flush_topl_more();
    const lines = [];
    if (dfeature && !skip_dfeature && fbuf) {
        lines.push(fbuf);
        lines.push('');
    }
    lines.push(
        `${picked_some ? 'Other things' : 'Things'} that are here:`,
    );
    for (let o = otmp; o; o = o.nexthere) {
        // C: doname_with_price → xname observe_object (dknown for gem color)
        if (!game.u?.Blind) observe_object(o);
        lines.push(doname_with_price(o));
    }
    const { show_nhw_menu_text } = await import('./pager.js');
    await show_nhw_menu_text(lines);
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
 * C ref: invent.c hold_another_object — wish/pickup into invent.
 * Fumbling / encumbrance-drop / autoquiver / fatal-corpse paths deferred.
 */
export async function hold_another_object(obj, drop_fmt, drop_arg, hold_msg) {
    const { addinv } = await import('./u_init.js');
    const {
        place_object, obj_extract_self,
    } = await import('./mkobj.js');
    const {
        touch_artifact, youmonst,
    } = await import('./artifact.js');

    if (!obj) return obj;
    // C: if (!Blind) observe_object(obj)
    if (!game.u?.Blind) obj.dknown = true;

    if (obj.oartifact) {
        const u = game.u || {};
        place_object(obj, u.ux, u.uy);
        if (!touch_artifact(obj, youmonst)) {
            obj_extract_self(obj);
            // dropy deferred — leave on floor
            if (drop_fmt) {
                const msg = drop_fmt.includes('%s')
                    ? drop_fmt.replace('%s', drop_arg || 'it')
                    : drop_fmt;
                await pline(msg);
            }
            return obj;
        }
        obj_extract_self(obj);
    }

    const oquan = obj.quan || 1;
    const held = addinv(obj);
    if (hold_msg || drop_fmt) {
        // C: prinv(hold_msg, obj, oquan) — oquan before merge
        await prinv(hold_msg || null, held, oquan);
    }
    return held;
}

const GOLD_SYM_ADJ = '$';
const NOINVSYM = '#';
const INVLET_BASIC = 52;
const QUITCHARS = ' \r\n\x1b';

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

/** Suggest letters for #adjust getobj (excludes gold). */
function adjust_suggest_lets() {
    const lets = [];
    for (const o of game.invent || []) {
        if (!o || o.oclass === COIN_CLASS || !o.invlet) continue;
        lets.push(o.invlet);
    }
    // C getobj sortloot SORTLOOT_INVLET
    lets.sort((a, b) => a.charCodeAt(0) - b.charCodeAt(0));
    let s = lets.join('');
    if (lets.length > 5) s = compactify_invlets(s);
    return s;
}

/**
 * C ref: invent.c getobj("adjust", adjust_ok, GETOBJ_PROMPT|GETOBJ_ALLOWCNT)
 * Count-split and ?/* invent menus deferred.
 */
async function getobj_adjust() {
    for (;;) {
        await flush_topl_more();
        const lets = adjust_suggest_lets();
        const query = lets
            ? `What do you want to adjust? [${lets} or ?*]`
            : 'What do you want to adjust? [*]';
        const prompt = `${query} `;
        game._pending_message = prompt;
        await flush_screen(1);
        const disp = game.nhDisplay;
        if (disp?.setCursor) disp.setCursor(prompt.length, 0);

        const key = await nhgetch();
        const ch = String.fromCharCode(key);
        if (QUITCHARS.includes(ch) || key === 27) {
            if (game.flags?.verbose !== false) await pline(Never_mind);
            return null;
        }
        if (ch === '?' || ch === '*') {
            // display_pickinv deferred
            if (game.flags?.verbose !== false) await pline(Never_mind);
            return null;
        }
        // digit → get_count / splitobj deferred (falls through as unknown letter)
        const otmp = (game.invent || []).find((o) => o.invlet === ch);
        if (!otmp) {
            await pline("You don't have that object.");
            continue;
        }
        if (otmp.oclass === COIN_CLASS) {
            // C: adjust_ok → GETOBJ_EXCLUDE → "You cannot adjust gold."
            await pline('You cannot adjust gold.');
            return null;
        }
        game._pending_message = '';
        return otmp;
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
    return otmp;
}

function names_ok_for_adjust_merge(otmp, obj) {
    const otmpname = invent_obj_name(otmp);
    const objname = invent_obj_name(obj);
    return !otmpname || (objname && objname === otmpname);
}

/**
 * C ref: invent.c doorganize_core — destination pick + move/collect/swap/merge.
 * Deferred: count-split, display_used_invlets, gold adjust, pack-full bump.
 */
async function doorganize_core(obj) {
    if (!obj) return ECMD_CANCEL;

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

    let qbuf = `Adjust letter to what [${lets}]`;
    if (game.invent?.length) qbuf += ' (? see used letters)';
    qbuf += '?';

    let ever_mind = false;
    let let_;
    for (let trycnt = 1; ; ++trycnt) {
        let_ = await yn_function(qbuf, null, '\0');
        if (let_ === '?' || let_ === '*') {
            // display_used_invlets deferred
            if (game.flags?.verbose !== false) await pline(Never_mind);
            return ECMD_OK;
        }
        if (QUITCHARS.includes(let_)) {
            if (!ever_mind) await pline(Never_mind);
            return ECMD_OK;
        }
        if (let_ === GOLD_SYM_ADJ && obj.oclass !== COIN_CLASS) {
            await pline(`Only gold coins may be moved into the '${GOLD_SYM_ADJ}' slot.`);
            // C: ever_mind → noadjust skips Never_mind
            return ECMD_OK;
        }
        const isLetter = /[a-zA-Z]/.test(let_) && let_ !== '@';
        if (isLetter || (lets.includes(let_) && let_ !== '-')) break;
        if (trycnt === 5) {
            if (!ever_mind) await pline(Never_mind);
            return ECMD_OK;
        }
        await pline('Select an inventory slot letter.');
    }

    const collect = let_ === obj.invlet;
    let adj_type = collect ? 'Collecting:' : 'Moving:';
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
            adj_type = 'Swapping:';
            otmp.invlet = obj.invlet;
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
        // pack-full bump path deferred
        void bumped;
    }

    await prinv_adjust(adj_type, obj);
    return ECMD_OK;
}

/**
 * C ref: invent.c doorganize — #adjust inventory letters.
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

    const obj = await getobj_adjust();
    return doorganize_core(obj);
}
