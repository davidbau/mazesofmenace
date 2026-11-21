// pager.js -- describing what the hero sees at a map location.
// C ref: pager.c
//
// Ported so far: do_screen_description() for a looked-at map location
// (getpos autodescribe), lookat(), look_at_monster(), look_at_object()
// and self_lookat().
//
// The JS display keeps each map cell as the character it shows, not as a
// glyph number, so the screen-symbol matching of do_screen_description()
// (showsyms[] per monster class, object class and cmap entry) can't be
// done here. For a looked-at spot C's description ends in lookat() whenever
// the symbol is ambiguous or names a class (monsters, objects, traps,
// DECgraphics floor/doorway/dark room, blank stone/unexplored); for an
// unambiguous terrain symbol its first match is the same defsyms[]
// explanation lookat() returns. So firstmatch is lookat()'s description.
// lookat() works out which glyph C would show from the game state
// (glyph_at()): hero, seen monster, seen object, seen trap, or the
// background (back_to_glyph()).

import { game } from './gstate.js';
import { tty_create_nhwindow, tty_start_menu, tty_add_menu, tty_end_menu,
         tty_select_menu, tty_destroy_nhwindow } from './wintty.js';
import { NHW_MENU, MENU_BEHAVE_STANDARD, MENU_ITEMFLAGS_NONE, PICK_ONE,
         ECMD_OK } from './const.js';
import { NO_COLOR, ATR_NONE } from './terminal.js';
import { extcmdlist } from './func_tab.js';
import { cmd_from_func } from './cmd.js';
import { canspotmon, vobj_at } from './display.js';
import { cansee } from './vision.js';
import { m_at, closed_door, is_pool, is_lava } from './makemon.js';
import { t_at } from './trap.js';
import { engr_at } from './engrave.js';
import { x_monnam, ARTICLE_NONE } from './do_name.js';
import { pmname } from './do_name.js';
import { distant_name, doname } from './objnam.js';
import { u_at } from './const.js';
import { STONE, SCORR, ROOM, CORR, SDOOR, HWALL, VWALL, TLCORNER, TRCORNER,
         BLCORNER, BRCORNER, CROSSWALL, TUWALL, TDWALL, TLWALL, TRWALL,
         DOOR, IRONBARS, TREE, POOL, MOAT, STAIRS, LADDER, FOUNTAIN, SINK,
         ALTAR, GRAVE, THRONE, ICE, LAVAPOOL, LAVAWALL, AIR, CLOUD, WATER,
         DBWALL, DRAWBRIDGE_UP, DRAWBRIDGE_DOWN, LA_DOWN, D_BROKEN, D_ISOPEN,
         D_TRAPPED, IS_WALL, MALE, FEMALE, HALLUC, INVIS, BLINDED } from './const.js';

/* C ref: defsym.h PCHAR()/PCHAR2() explanations, S_stone .. S_water */
const S_stone = 0, S_ndoor = 12, S_vodoor = 13, S_hodoor = 14,
    S_vcdoor = 15, S_hcdoor = 16, S_bars = 17, S_tree = 18, S_room = 19,
    S_darkroom = 20, S_corr = 22, S_litcorr = 23, S_upstair = 25,
    S_dnstair = 26, S_upladder = 27, S_dnladder = 28, S_altar = 33,
    S_grave = 34, S_throne = 35, S_sink = 36, S_fountain = 37, S_pool = 38,
    S_ice = 39, S_lava = 40, S_lavawall = 41, S_vodbridge = 42,
    S_vcdbridge = 44, S_air = 46, S_cloud = 47, S_water = 48;
export const defsyms_explanation = [
    "stone", "wall", "wall", "wall", "wall", "wall", "wall", "wall", "wall",
    "wall", "wall", "wall", "doorway", "open door", "open door",
    "closed door", "closed door", "iron bars", "tree", "floor of a room",
    "dark part of a room", "engraving", "corridor", "lit corridor",
    "engraving", "staircase up", "staircase down", "ladder up",
    "ladder down", "branch staircase up", "branch staircase down",
    "branch ladder up", "branch ladder down", "altar", "grave",
    "opulent throne", "sink", "fountain", "water", "ice", "molten lava",
    "wall of lava", "lowered drawbridge", "lowered drawbridge",
    "raised drawbridge", "raised drawbridge", "air", "cloud", "water",
];

function uhave(prop) {
    const p = game.u?.uprops?.[prop];
    return !!(p && (p.intrinsic || p.extrinsic));
}

// C ref: display.c back_to_glyph() -- the cmap index of the background
// at <x,y> (walls are all "wall", so wall_angle() isn't needed here)
export function back_to_cmap(x, y) {
    const ptr = game.level.at(x, y);

    switch (ptr.typ) {
    case SCORR:
    case STONE:
        return game.level.flags?.arboreal ? S_tree : S_stone;
    case ROOM:
        return S_room;
    case CORR:
        return (ptr.waslit || game.flags.lit_corridor) ? S_litcorr : S_corr;
    case SDOOR:
    case HWALL:
    case VWALL:
    case TLCORNER:
    case TRCORNER:
    case BLCORNER:
    case BRCORNER:
    case CROSSWALL:
    case TUWALL:
    case TDWALL:
    case TLWALL:
    case TRWALL:
        return ptr.seenv ? 1 /* wall_angle(ptr): some wall */ : S_stone;
    case DOOR:
        if (ptr.doormask) {
            if (ptr.doormask & D_BROKEN)
                return S_ndoor;
            else if (ptr.doormask & D_ISOPEN)
                return ptr.horizontal ? S_hodoor : S_vodoor;
            else /* else is closed */
                return ptr.horizontal ? S_hcdoor : S_vcdoor;
        }
        return S_ndoor;
    case IRONBARS:
        return S_bars;
    case TREE:
        return S_tree;
    case POOL:
    case MOAT:
        return S_pool;
    case STAIRS:
        /* known_branch_stairs(): the explanation for S_brupstair etc. */
        return (ptr.ladder & LA_DOWN) ? S_dnstair : S_upstair;
    case LADDER:
        return (ptr.ladder & LA_DOWN) ? S_dnladder : S_upladder;
    case FOUNTAIN:
        return S_fountain;
    case SINK:
        return S_sink;
    case ALTAR:
        return S_altar;
    case GRAVE:
        return S_grave;
    case THRONE:
        return S_throne;
    case ICE:
        return S_ice;
    case LAVAPOOL:
        return S_lava;
    case LAVAWALL:
        return S_lavawall;
    case AIR:
        return S_air;
    case CLOUD:
        return S_cloud;
    case WATER:
        return S_water;
    case DBWALL:
        return S_vcdbridge;
    case DRAWBRIDGE_UP:
        throw new Error('back_to_glyph(): drawbridges not ported yet');
    case DRAWBRIDGE_DOWN:
        return S_vodbridge;
    default:
        return S_room;
    }
}

// C ref: pager.c self_lookat()
export function self_lookat() {
    const u = game.u;
    let race = "";

    /* include race with role unless polymorphed */
    if (!u.mtimedone) /* !Upolyd */
        race = `${game.urace.adj} `;
    let outbuf = `${uhave(INVIS) && !uhave(BLINDED) ? "invisible " : ""}${race}`
        + `${pmname(game.youmonst.data, game.flags.female ? FEMALE : MALE)}`
        + ` called ${game.plname}`;
    if (u.usteed)
        throw new Error('self_lookat(): steed not ported yet');
    if (u.uundetected || game.uball || u.utrap)
        throw new Error('self_lookat(): hidden/punished/trapped hero not ported yet');
    return outbuf;
}

// C ref: pager.c look_at_object()
function look_at_object(x, y, otmp) {
    let buf;

    /* object_from_map(): the object shown here */
    if (otmp) {
        if (!otmp.dknown && otmp.quan > 1)
            throw new Error('look_at_object(): doname_vague_quan() not ported yet');
        /* doname_with_price() adds a price only for shop goods */
        if (otmp.unpaid || otmp.no_charge)
            throw new Error('look_at_object(): doname_with_price() not ported yet');
        buf = distant_name(otmp, doname);
    } else {
        buf = "something"; /* sanity precaution */
    }

    const lev = game.level.at(x, y);
    /* check TREE before STONE due to level.flags.arboreal */
    if (lev.typ === TREE)
        throw new Error('look_at_object(): object in a tree not ported yet');
    else if (lev.typ === STONE || lev.typ === SCORR)
        buf += " embedded in stone";
    else if (IS_WALL(lev.typ) || lev.typ === SDOOR)
        buf += " embedded in a wall";
    else if (closed_door(x, y))
        buf += " embedded in a door";
    else if (is_pool(x, y))
        buf += " in water";
    else if (is_lava(x, y))
        buf += " in molten lava"; /* [can this ever happen?] */
    return buf;
}

// C ref: pager.c look_at_monster()
function look_at_monster(mtmp, x, y) {
    const accurate = !uhave(HALLUC);

    if (!accurate)
        throw new Error('look_at_monster(): hallucination not ported yet');
    /* PM_COYOTE: coyotename() */
    if (mtmp.data.mlet !== undefined && mtmp.data.pmnames?.[2] === "coyote")
        throw new Error('look_at_monster(): coyotename() not ported yet');
    const name = x_monnam(mtmp, ARTICLE_NONE, null, 0, false); /* distant_monnam() */
    let buf = `${(mtmp.mx !== x || mtmp.my !== y)
                 ? ((mtmp.isshk && accurate) ? "tail of " : "tail of a ") : ""}`
        /* monhealthdescr() is disabled in C ("") */
        + `${(mtmp.mtame && accurate) ? "tame "
             : (mtmp.mpeaceful && accurate) ? "peaceful " : ""}`
        + name;
    if (game.u.ustuck === mtmp)
        throw new Error('look_at_monster(): u.ustuck not ported yet');
    if (mtmp.mfrozen)
        buf += ", can't move (paralyzed or sleeping or busy)";
    else if (mtmp.msleeping)
        buf += ", asleep";
    else if ((mtmp.mstrategy & 0x0f000000) !== 0) /* STRAT_WAITMASK */
        buf += ", meditating";

    if (mtmp.mleashed)
        buf += ", leashed to you";
    if (mtmp.mtrapped && cansee(mtmp.mx, mtmp.my))
        throw new Error('look_at_monster(): trapped monster not ported yet');
    if (mtmp.mundetected || mtmp.m_ap_type)
        throw new Error('look_at_monster(): mhidden_description() not ported yet');
    return buf;
}

// C ref: engrave.h spot_shows_engravings()
function spot_shows_engravings(x, y) {
    const typ = game.level.at(x, y).typ;
    return typ === CORR || typ === ICE || typ === ROOM;
}

// C ref: display.c _map_location() -- which kind of glyph a spot in view
// shows when no monster is displayed there: object, trap, engraving or
// the background
function map_location_kind(x, y) {
    const covers = is_pool(x, y) || is_lava(x, y); /* covers_objects() */
    let trap, ep;

    if (vobj_at(x, y) && !covers)
        return 'object';
    else if ((trap = t_at(x, y)) && trap.tseen && !covers)
        return 'trap';
    else if (spot_shows_engravings(x, y) && (ep = engr_at(x, y)) && ep.erevealed
             && !covers)
        return 'engraving';
    return 'cmap';
}

// C ref: pager.c lookat() -- the glyph_is_cmap() case
function cmap_lookat(symidx, x, y) {
    const lev = game.level.at(x, y);

    switch (symidx) {
    case S_altar:
        throw new Error('lookat(): altar description not ported yet');
    case S_ndoor:
        /* is_drawbridge_wall(x, y) >= 0: drawbridges aren't ported */
        if ((lev.doormask & ~D_TRAPPED) === D_BROKEN)
            return "broken door";
        return "doorway";
    case S_cloud:
        return "fog/vapor cloud"; /* Is_airlevel(): "cloudy area" */
    case S_pool:
    case S_water:
    case S_lava:
    case S_lavawall:
    case S_ice:
        throw new Error('lookat(): waterbody_name() not ported yet');
    case S_stone:
        if (!lev.seenv)
            return "unexplored";
        else if (game.u.uinwater)
            throw new Error('lookat(): Underwater not ported yet');
        else if (lev.typ === STONE || lev.typ === SCORR)
            return "stone";
        return defsyms_explanation[symidx];
    default:
        return defsyms_explanation[symidx];
    }
}

// C ref: pager.c lookat() -- describe the glyph shown at <x,y>
export function lookat(x, y) {
    const lev = game.level.at(x, y);
    let buf = "";

    if (u_at(x, y)) { /* && canspotself() */
        buf = self_lookat();
    } else if (game.u.uswallow) {
        throw new Error('lookat(): swallowed not ported yet');
    } else {
        const mtmp = m_at(x, y);

        if (mtmp && mtmp.m_ap_type && cansee(x, y))
            throw new Error('lookat(): mimic appearance not ported yet');
        if (mtmp && !mtmp.mundetected && canspotmon(mtmp)) {
            /* glyph_is_monster(glyph) */
            buf = look_at_monster(mtmp, x, y);
        } else if (cansee(x, y)) {
            switch (map_location_kind(x, y)) {
            case 'object':
                buf = look_at_object(x, y, vobj_at(x, y));
                break;
            case 'trap':
                throw new Error('lookat(): trap_description() not ported yet');
            case 'engraving':
                buf = "engraving";
                break;
            default:
                buf = cmap_lookat(back_to_cmap(x, y), x, y);
                break;
            }
        } else if (!lev.seenv && !lev.remembered_glyph) {
            /* glyph_is_unexplored(glyph) */
            buf = "unexplored area";
        } else {
            /* what the hero remembers here: only the background is
               worked out so far */
            if (map_location_kind(x, y) !== 'cmap')
                throw new Error('lookat(): remembered objects/traps/engravings not ported yet');
            let idx = back_to_cmap(x, y);
            /* remembered lit floor out of sight is shown as dark room */
            if (idx === S_room && game.flags.dark_room !== false)
                idx = S_darkroom;
            buf = cmap_lookat(idx, x, y);
        }
    }
    return buf;
}

// C ref: pager.c do_screen_description() -- for a looked-at location;
// returns { found, firstmatch } (out_str isn't used by the callers so far)
export function do_screen_description(cc) {
    const firstmatch = lookat(cc.x, cc.y);
    return { found: 1, firstmatch };
}

/* help menu choices that aren't ported yet */
function hmenu_not_ported(fn) {
    return () => { throw new Error(`dohelp(): ${fn}() not ported yet`); };
}

// C ref: pager.c help_menu_items[] -- data for dohelp(); the PORT_HELP
// entry isn't compiled into the unix build
const help_menu_items = [
    { f: 'hmenu_doextversion', text: "About NetHack (version information)." },
    { f: 'dispfile_help', text: "Long description of the game and commands." },
    { f: 'dispfile_shelp', text: "List of game commands." },
    { f: 'hmenu_dohistory', text: "Concise history of NetHack." },
    { f: 'hmenu_dowhatis', text: "Info on a character in the game display." },
    { f: 'hmenu_dowhatdoes', text: "Info on what a given key does." },
    { f: 'option_help', text: "List of game options." },
    { f: 'dispfile_optionfile', text: "Longer explanation of game options." },
    { f: 'dispfile_optmenu', text: "Using the %s command to set options." },
    { f: 'dokeylist', text: "Full list of keyboard commands." },
    { f: 'hmenu_doextlist', text: "List of extended commands." },
    { f: 'domenucontrols', text: "List menu control keys." },
    { f: 'dispfile_usagehelp', text: "Description of NetHack's command line." },
    { f: 'dispfile_license', text: "The NetHack license." },
    { f: 'docontact', text: "Support information." },
    { f: 'dispfile_debughelp', text: "List of wizard-mode commands." },
];

// C ref: hacklib.c visctrl()
function visctrl(c) {
    let ccc = '';
    if (c & 0o200)
        ccc += 'M-';
    c &= 0o177;
    if (c < 0o40)
        ccc += '^' + String.fromCharCode(c | 0o100);
    else if (c === 0o177)
        ccc += '^?';
    else
        ccc += String.fromCharCode(c);
    return ccc;
}

// C ref: cmd.c cmdname_from_func() -- the fullname case
function cmdname_from_func(fn) {
    const extcmd = extcmdlist.find(e => e.ef_funct === fn);
    return extcmd ? extcmd.ef_txt : null;
}

// C ref: pager.c setopt_cmd() -- how to run the full options menu
function setopt_cmd() {
    let outbuf = "'";
    let cmdnm;
    let key;

    /* #optionsfull */
    key = cmd_from_func("doset");
    if (key) {
        outbuf += visctrl(key);
    } else {
        /* extended command name, with leading "#" */
        cmdnm = cmdname_from_func("doset");
        if (!cmdnm) /* paranoia */
            cmdnm = "optionsfull";
        outbuf += `${(cmdnm[0] !== '#') ? "#" : ""}${cmdnm.slice(0, 31)}`;

        /* since there's no key bound to #optionsfull, include 'm O' */
        outbuf += "' or '";
        /* m prefix plus #options */
        key = cmd_from_func("do_reqmenu");
        if (key) {
            /* key for 'm' prefix */
            outbuf += visctrl(key);
        } else {
            /* extended command name for 'm' prefix */
            cmdnm = cmdname_from_func("do_reqmenu");
            if (!cmdnm)
                cmdnm = "reqmenu";
            outbuf += `${(cmdnm[0] !== '#') ? "#" : ""}${cmdnm.slice(0, 31)}`;
        }
        /* this is slightly iffy because the user shouldn't type <space> to
           get the command we're describing, but it improves readability */
        outbuf += " ";
        /* now #options, normally 'O' */
        key = cmd_from_func("doset_simple");
        if (key) {
            outbuf += visctrl(key);
        } else {
            /* extended command name */
            cmdnm = cmdname_from_func("doset_simple");
            if (!cmdnm) /* paranoia */
                cmdnm = "options";
            outbuf += `${(cmdnm[0] !== '#') ? "#" : ""}${cmdnm.slice(0, 31)}`;
        }
    }
    outbuf += "'";
    return outbuf;
}

// C ref: pager.c dohelp() -- the #help command; the menu is ported, the
// help texts it leads to are not yet
export async function dohelp() {
    const tmpwin = tty_create_nhwindow(NHW_MENU);
    let helpbuf;
    const clr = NO_COLOR;

    tty_start_menu(tmpwin, MENU_BEHAVE_STANDARD);

    for (let i = 0; i < help_menu_items.length; i++) {
        if (!game.flags?.debug && help_menu_items[i].f === 'dispfile_debughelp')
            continue;
        /* sysopt.hideusage is off */

        if (help_menu_items[i].f === 'dispfile_optmenu')
            helpbuf = help_menu_items[i].text.replace('%s', setopt_cmd());
        else
            helpbuf = help_menu_items[i].text;
        /* any.a_int = i + 1 */
        tty_add_menu(tmpwin, null, i + 1, 0, 0, ATR_NONE, clr,
                     helpbuf, MENU_ITEMFLAGS_NONE);
    }
    tty_end_menu(tmpwin, "Select one item:");
    const res = await tty_select_menu(tmpwin, PICK_ONE);
    await tty_destroy_nhwindow(tmpwin);
    if (res.n > 0) {
        const sel = res.selected[0].item - 1;
        hmenu_not_ported(help_menu_items[sel].f)();
    }
    return ECMD_OK;
}
