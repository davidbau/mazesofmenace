// invent.js — Inventory / discoveries / attributes display.
// C ref: invent.c display_inventory / ddoinv / let_to_name;
//        o_init.c dodiscovered / discover_object;
//        insight.c enlightenment (BASICENLIGHTENMENT subset).

import { game } from './gstate.js';
import { nhgetch } from './input.js';
import { flush_screen, pline, docrt, status_line_2 } from './display.js';
import { xprname, an, vtense, doname } from './objnam.js';
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
} from './objects.js';
import { ATR_INVERSE, NO_COLOR } from './terminal.js';
import { acurr, A_STR, A_CON } from './attrib.js';
import {
    DOOR, STAIRS, FOUNTAIN, SINK, ALTAR, GRAVE, TREE, IRONBARS,
    D_NODOOR, D_ISOPEN, D_BROKEN,
    A_LAWFUL, A_NEUTRAL, A_CHAOTIC,
    IS_DOOR,
} from './const.js';
import { align_str, align_gname, u_gname } from './roles.js';
import {
    UNENCUMBERED, SLT_ENCUMBER, MOD_ENCUMBER, HVY_ENCUMBER, EXT_ENCUMBER,
    OVERLOADED, WT_WEIGHTCAP_STRCON, WT_WEIGHTCAP_SPARE, MAX_CARR_CAP,
} from './const.js';
import { stairway_at, stairs_description } from './mklev.js';
import { objects_at } from './mkobj.js';

// C ref: attrib.c acurrstr() — Tourist STR is ≤18 so equals ACURR(A_STR)
function acurrstr() {
    const str = acurr(A_STR);
    if (str <= 18) return Math.max(str, 3);
    if (str <= 121) return 19 + Math.trunc(str / 50);
    return Math.min(str, 125) - 100;
}

// C ref: hack.c weight_cap()
export function weight_cap() {
    let carrcap = WT_WEIGHTCAP_STRCON * (acurrstr() + acurr(A_CON))
        + WT_WEIGHTCAP_SPARE;
    if (carrcap > MAX_CARR_CAP) carrcap = MAX_CARR_CAP;
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

// C ref: options.c def_inv_order
const DEF_INV_ORDER = [
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

const GOLD_SYM = '$';

// Appearance strings from objects.h SCROLL() second arg + XTRA_SCROLL_LABEL,
// keyed by otyp (pre-shuffle); appearance_of() remaps via oc_descr_idx.
const SCROLL_DESCS = (() => {
    const texts = [
        // Real scrolls (enchant armor … stinking cloud)
        'ZELGO MER', 'JUYED AWK YACC', 'NR 9', 'XIXAXA XOXAXA XUXAXA',
        'PRATYAVAYAH', 'DAIYEN FOOELS', 'LEP GEX VEN ZEA', 'PRIRUTSENIE',
        'ELBIB YLOH', 'VERR YED HORRE', 'VENZAR BORGAVVE', 'THARR',
        'YUM YUM', 'KERNOD WEL', 'ELAM EBOW', 'DUAM XNAHT',
        'ANDOVA BEGARIN', 'KIRJE', 'VE FORBRYDERNE', 'HACKEM MUCHE',
        'VELOX NEB',
        // XTRA_SCROLL_LABEL
        'FOOBIE BLETCH', 'TEMOV', 'GARVEN DEH', 'READ ME',
        'ETAOIN SHRDLU', 'LOREM IPSUM', 'FNORD', 'KO BATE',
        'ABRA KA DABRA', 'ASHPD SODALG', 'ZLORFIK', 'GNIK SISI VLE',
        'HAPAX LEGOMENON', 'EIRIS SAZUN IDISI', 'PHOL ENDE WODAN', 'GHOTI',
        'MAPIRO MAHAMA DIROMAT', 'VAS CORP BET MANI', 'XOR OTA',
        'STRC PRST SKRZ KRK',
    ];
    const first = objectNames.indexOf('SCR_ENCHANT_ARMOR');
    const m = {};
    texts.forEach((t, i) => { m[first + i] = t; });
    return m;
})();

const POTION_DESCS = (() => {
    const texts = [
        'ruby', 'pink', 'orange', 'yellow', 'emerald', 'dark green', 'cyan',
        'sky blue', 'brilliant blue', 'magenta', 'purple-red', 'puce',
        'milky', 'swirly', 'bubbly', 'smoky', 'cloudy', 'effervescent',
        'black', 'golden', 'brown', 'fizzy', 'dark', 'white', 'murky', 'clear',
    ];
    const first = objectNames.indexOf('POT_GAIN_ABILITY');
    const m = {};
    texts.forEach((t, i) => { m[first + i] = t; });
    return m;
})();

const WAND_DESCS = (() => {
    // C ref: objects.h WAND() typ strings in enum order (incl. extras)
    const texts = [
        'glass', 'balsa', 'crystal', 'maple', 'pine', 'redwood', 'oak', 'ebony',
        'marble', 'tin', 'brass', 'copper', 'silver', 'platinum', 'iridium',
        'zinc', 'aluminum', 'uranium', 'iron', 'steel', 'hexagonal', 'short',
        'runed', 'long', 'curved', 'forked', 'spiked', 'jeweled',
    ];
    const first = objectNames.indexOf('WAN_LIGHT');
    const m = {};
    texts.forEach((t, i) => { m[first + i] = t; });
    return m;
})();

/** C ref: objects.h fixed description strings for disco display. */
const FIXED_DESCRS = {
    ELVEN_DAGGER: 'runed dagger',
    ORCISH_DAGGER: 'crude dagger',
    SACK: 'bag',
    OILSKIN_SACK: 'bag',
    BAG_OF_HOLDING: 'bag',
    BAG_OF_TRICKS: 'bag',
};

function appearance_of(otyp) {
    const idx = game.objects?.[otyp]?.oc_descr_idx ?? otyp;
    const shuffled = SCROLL_DESCS[idx] || POTION_DESCS[idx] || WAND_DESCS[idx];
    if (shuffled) return shuffled;
    // Fixed OBJ_DESCR strings (not shuffled) — C interesting_to_discover gate
    const n = objectNames[otyp] || '';
    return FIXED_DESCRS[n] || null;
}

function pretty_known_name(otyp) {
    const n = objectNames[otyp] || '';
    if (n.startsWith('SCR_'))
        return 'scroll of ' + n.slice(4).toLowerCase().replace(/_/g, ' ');
    if (n.startsWith('POT_'))
        return 'potion of ' + n.slice(4).toLowerCase().replace(/_/g, ' ');
    if (n.startsWith('WAN_'))
        return 'wand of ' + n.slice(4).toLowerCase().replace(/_/g, ' ');
    return n.toLowerCase().replace(/_/g, ' ');
}

/** C ref: o_init.c interesting_to_discover — needs OBJ_DESCR (or uname). */
function interesting_to_discover(otyp) {
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
    const a = u.acurr?.a;
    const stats = a
        ? `St:${a[0]} Dx:${a[3]} Co:${a[4]} In:${a[1]} Wi:${a[2]} Ch:${a[5]}`
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
        for (let i = 0; i < text.length && col + i < disp.cols; i++)
            disp.setCell(col + i, r, text[i], NO_COLOR, attr);
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
 *        tty_display_nhwindow(NHW_MENU) offx = max(10, cols - maxcol - 1).
 * Returns { offx, maxcol }; offx===0 means fullscreen fallback.
 */
export function nhw_menu_geometry(entries, morestr = '(end) ') {
    let maxcol = morestr.length;
    for (const e of entries) {
        const text = typeof e === 'string' ? e : e.text;
        const len = text.length + 2; // leading + trailing pad
        if (len > maxcol) maxcol = len;
    }
    let offx = Math.max(10, 80 - maxcol - 1);
    // C: offx==10 || maxrow>=rows || !menu_overlay → fullscreen (offx=0)
    if (offx === 10) offx = 0;
    return { offx, maxcol };
}

/**
 * C ref: wintty.c process_menu_window corner path — tty_curs(1)+offx, cl_end,
 *        putchar(' '), then item text; morestr on final row; cursor at
 *        strlen(morestr)+2 (+offx). Does not clear the map (unlike fullscreen).
 * entries: {text, attr}[] or string[]; morestr default "(end) ".
 */
export async function paint_corner_nhw_menu(entries, morestr = '(end) ') {
    const disp = display();
    if (!disp) return null;
    const { offx } = nhw_menu_geometry(entries, morestr);
    if (offx === 0) {
        // Fullscreen not implemented here — callers use paint_overlay.
        return null;
    }
    // C clears WIN_MESSAGE before corner menu; keep map/status.
    game._pending_message = '';
    game._menu_overlay = false;
    await flush_screen(1);

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
    return { offx, endRow, cursorCol };
}

function invent_lines() {
    const inv = game.invent || [];
    const lines = [];
    for (const oclass of DEF_INV_ORDER) {
        const items = inv.filter(o => o.oclass === oclass);
        if (!items.length) continue;
        lines.push({ text: CLASS_NAMES[oclass] || 'Items', attr: ATR_INVERSE });
        for (const otmp of items)
            lines.push({ text: xprname(otmp), attr: 0 });
    }
    lines.push({ text: '(end)', attr: 0 });
    return lines;
}

/**
 * C ref: invent.c display_inventory(NULL, FALSE) / display_pickinv PICK_NONE.
 * C ref: wintty.c tty_display_nhwindow(NHW_MENU) corner vs fullscreen.
 * Shows invent and waits for a dismiss key.
 */
export async function display_inventory() {
    const lines = invent_lines(); // includes trailing "(end)"
    const menuItems = lines.slice(0, -1);
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

/** C ref: invent.c ddoinv() */
export async function ddoinv() {
    await display_inventory();
    return 0;
}

/**
 * C ref: o_init.c discover_object()
 */
export function discover_object(oindx, mark_as_known, mark_as_encountered = false) {
    if (oindx == null || oindx < 0) return;
    const objects = game.objects;
    if (!objects?.[oindx]) return;
    if (!game.disco) game.disco = new Array(objects.length).fill(0);

    const need =
        (mark_as_known && !objects[oindx].oc_name_known)
        || (mark_as_encountered && !objects[oindx].oc_encountered);
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
    if (mark_as_known && !objects[oindx].oc_name_known)
        objects[oindx].oc_name_known = 1;
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
            const app = appearance_of(otyp);
            const nm = pretty_known_name(otyp);
            const text = app ? `${prefix}${nm} (${app})` : `${prefix}${nm}`;
            lines.push({ text, attr: 0 });
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

/**
 * C ref: insight.c weapon_descr / an() — enough for starter weapons.
 */
function pretty_weapon_descr(obj) {
    const n = objectNames[obj.otyp];
    const base = n ? n.toLowerCase().replace(/_/g, ' ') : 'weapon';
    const quan = obj.quan || 1;
    if (quan !== 1) return `${quan} ${base}s`;
    const article = 'aeiou'.includes((base[0] || 'x').toLowerCase()) ? 'an' : 'a';
    return `${article} ${base}`;
}

/** C ref: insight.c skill noun via weapon_type — starter weapons use otyp name. */
function weapon_skill_noun(obj) {
    const n = objectNames[obj.otyp];
    return n ? n.toLowerCase().replace(/_/g, ' ') : 'weapon';
}

/**
 * C ref: insight.c enlightenment(BASICENLIGHTENMENT) — pantheon/wallet from C.
 */
export async function doattributes() {
    const u = game.u || {};
    const a = u.acurr?.a || [];
    let name = game.plname || 'Hero';
    // C ref: insight.c / botl — capitalize first letter of plname for display
    if (name.length && name.charCodeAt(0) >= 97 && name.charCodeAt(0) <= 122) {
        name = String.fromCharCode(name.charCodeAt(0) - 32) + name.slice(1);
    }
    const rank = game.urole?.rank?.m || 'Adventurer';
    const role = game.urole?.name?.m || 'Tourist';
    const gender = game.flags?.female ? 'female' : 'male';
    const race = game.urace?.adj || game.urace?.name || 'human';
    const atype = u.ualign?.type ?? A_NEUTRAL;
    const align = align_str(atype);
    const turns = game.moves || 1;
    const hand = (u.uhandedness === 1 /* LEFT_HANDED */) ? 'left' : 'right';
    const gold = game._goldCount || 0;

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

    const page1 = [
        ` ${name} the ${role}'s attributes:`,
        '',
        ' Background:',
        `  You are a ${rank}, a level ${u.ulevel || 1} ${gender} ${race} ${role}.`,
        `  You are ${align}, on a mission for ${u_gname(game.urole, atype)}`,
        opposed,
        `  You are ${hand}-handed.`,
        '  You are in the Dungeons of Doom, on level 1.',
        `  You entered the dungeon ${turns} turn${turns === 1 ? '' : 's'} ago.`,
        `  You have ${u.uexp || 0} experience point${(u.uexp || 0) === 1 ? '' : 's'}.`,
        '',
        ' Basics:',
        `  You have all ${u.uhpmax || 0} hit points.`,
        '  You have both energy points (spell power).',
        `  Your armor class is ${u.uac ?? 10}.`,
        wallet,
        '  Autopickup is off.',
        '',
        ' Characteristics:',
        `  Your strength is ${a[0] ?? '?'}.`,
        `  Your dexterity is ${a[3] ?? '?'}.`,
        `  Your constitution is ${a[4] ?? '?'}.`,
        `  Your intelligence is ${a[1] ?? '?'}.`,
        ' (1 of 2)',
    ];

    paint_overlay(page1.map(t => ({ text: t, attr: 0 })), { cursor: [9, 23] });
    await flush_screen(1);
    await nhgetch(); // space → page 2

    const page2 = [
        `  Your wisdom is ${a[2] ?? '?'}.`,
        `  Your charisma is ${a[5] ?? '?'}.`,
        '',
        ' Status:',
        "  You aren't hungry.",
        '  You are unencumbered.',
    ];
    // C ref: insight.c weapon_insight — wielded weapon / bare hands + skill line
    const uwep = u.uwep || game.u?.uwep;
    if (!uwep) {
        page2.push('  You are bare handed.');
        page2.push('  You are unskilled in bare handed combat.');
    } else {
        const wname = pretty_weapon_descr(uwep);
        page2.push(`  You are wielding ${wname}.`);
        page2.push(`  You have basic skill with ${weapon_skill_noun(uwep)}.`);
    }
    page2.push('');
    // C: explore mode adds Attributes + explore/bones notes before misc.
    if (game.flags?.explore || game.flags?.discover) {
        page2.push(
            ' Attributes:',
            '  You are nominally aligned.',
            "  You can't safely pray.",
            '',
            ' Miscellaneous:',
            '  You are running in explore mode.',
            "  You haven't encountered any bones levels.",
            '  Total elapsed playing time is none.',
            ' (2 of 2)',
        );
    } else {
        page2.push(
            ' Miscellaneous:',
            '  Total elapsed playing time is none.',
            ' (2 of 2)',
        );
    }
    const endRow = page2.length - 1;
    paint_overlay(page2.map(t => ({ text: t, attr: 0 })), {
        cursor: [9, endRow],
    });
    await flush_screen(1);
    await nhgetch(); // space → dismiss
    clear_overlay();
    await docrt();
    await flush_screen(1);
}

/** C ref: spell.c dovspell() empty case */
export async function dovspell() {
    await pline("You don't know any spells right now.");
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
 * Ported envelope: non-swallow, non-blind, no pile skip; dfeature pline;
 * no-objects message only when Blind || !dfeature. Object listing /
 * engraving / trap+region / Blind feel path deferred.
 */
export async function look_here(obj_cnt = 0, lookhere_flags = 0) {
    const u = game.u;
    const verb = 'see'; // Blind feel path deferred
    const skip_dfeature = !!(lookhere_flags & 0x2); // LOOKHERE_SKIP_DFEATURE
    const skip_objects = false; // pile_limit path deferred for obj_cnt===0

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
        // read_engr_at deferred
        if (!skip_objects && !dfeature)
            await pline(`You ${verb} no objects here.`);
        return;
    }

    // Objects present — single-item / multi deferred beyond dfeature prefix
    if (dfeature && !skip_dfeature && fbuf)
        await pline(fbuf);
    if (!otmp.nexthere) {
        // single object: "You see here <doname>" — doname_with_price deferred
        await pline(`You ${verb} here ${doname(otmp)}.`);
    } else {
        await pline(`You ${verb} several objects here.`);
    }
}

/** C ref: invent.c dolook() */
export async function dolook() {
    await look_here(0, 0);
}
