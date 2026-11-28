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

import { SYM_OFF_X } from './symbols.js';
import { db_under_typ, glyph_is_warning,
         glyph_is_invisible } from './display.js';
import { def_r_oc_syms } from './display.js';
import { game } from './gstate.js';
import { obj_stop_timers } from './timeout.js';
import { tty_create_nhwindow, tty_start_menu, tty_add_menu, tty_end_menu,
         tty_select_menu, tty_destroy_nhwindow, add_menu_str,
         tty_yn_function } from './wintty.js';
import { tty_putstr, tty_display_nhwindow } from './wintty.js';
import { NHW_TEXT, MENU_SELECT_ALL, MENU_SELECT_PAGE, MENU_INVERT_ALL,
         MENU_INVERT_PAGE, MENU_UNSELECT_ALL, MENU_UNSELECT_PAGE,
         MENU_NEXT_PAGE, MENU_PREVIOUS_PAGE, MENU_FIRST_PAGE, MENU_LAST_PAGE,
         MENU_SEARCH } from './const.js';
import { getpos, dxdy_to_dist_descr } from './getpos.js';
import { NHW_MENU, MENU_BEHAVE_STANDARD, MENU_ITEMFLAGS_NONE, PICK_ONE,
         ECMD_OK } from './const.js';
import { NO_COLOR, ATR_NONE } from './terminal.js';
import { extcmdlist } from './func_tab.js';
import { cmd_from_func, key2extcmddesc, key2txt, dokeylist } from './cmd.js';
import { visctrl, upstart, tabexpand } from './hacklib.js';
import {
    canspotmon, vobj_at, pline, back_to_glyph, known_branch_stairs,
    stairway_at
} from './display.js';
import { cansee } from './vision.js';
import { m_at, closed_door, is_pool, is_lava } from './makemon.js';
import { t_at } from './trap.js';
import { engr_at } from './engrave.js';
import { x_monnam, ARTICLE_NONE } from './do_name.js';
import { pmname } from './do_name.js';
import { distant_name, doname } from './objnam.js';
import { u_at, M_AP_OBJECT, MCORPSENM } from './const.js';
import { objects, OBJ_NAME, CHEST, LARGE_BOX, STRANGE_OBJECT, COIN_CLASS,
         SLIME_MOLD, LEASH, CORPSE, STATUE } from './objects.js';
import { mksobj, mkobj } from './mkobj.js';
import { sobj_at } from './makemon.js';
import { observe_object } from './o_init.js';
import { costly_spot } from './shk.js';
import { STONE, SCORR, ROOM, CORR, SDOOR, HWALL, VWALL, TLCORNER, TRCORNER,
         BLCORNER, BRCORNER, CROSSWALL, TUWALL, TDWALL, TLWALL, TRWALL,
         DOOR, IRONBARS, TREE, POOL, MOAT, STAIRS, LADDER, FOUNTAIN, SINK,
         ALTAR, GRAVE, THRONE, ICE, LAVAPOOL, LAVAWALL, AIR, CLOUD, WATER,
         DBWALL, DRAWBRIDGE_UP, DRAWBRIDGE_DOWN, LA_DOWN, D_BROKEN, D_ISOPEN,
         D_TRAPPED, IS_WALL, MALE, FEMALE, HALLUC, INVIS, BLINDED,
         isok, IS_WATERWALL, DB_UNDER, DB_ICE, DB_LAVA, DB_MOAT, DB_FLOOR,
         Is_medusa_level, Is_juiblex_level, Is_qstart, Is_waterlevel } from './const.js';
import { hliquid } from './potion.js';
import { PM_SAMURAI, M2_HUMAN, M2_ELF, M2_ORC, M2_DEMON } from './monsters.js';
import { makeplural } from './objnam.js';
import { glyph_at, glyph_ttychar, encglyph, canspotself, canseemon,
         mon_visible, see_with_infrared, tp_sensemon, MATCH_WARN_OF_MON,
         cmap_to_glyph, trap_to_glyph } from './display.js';
import { couldsee } from './vision.js';
import { worm_known } from './worm.js';
import { distant_monnam, rndmonnam, mon_nam, coyotename } from './do_name.js';
import { doname_with_price, doname_vague_quan, an, xname, singular,
         makesingular, fruit_from_name } from './objnam.js';
import { obj_descr, SLIME_MOLD as SLIME_MOLD_PG, BOULDER, APPLE, ORANGE, PEAR,
         BANANA, EUCALYPTUS_LEAF, ROCK_CLASS, VENOM_CLASS,
         MAXOCLASSES } from './objects.js';
import { def_oc_syms, def_oc_explain, def_monsyms } from './drawing.js';
import { mons, PM_COYOTE, PM_WIZARD, PM_GNOME, PM_HUMAN, PM_ELF, MAXMCLASSES,
         S_invisible, S_HUMAN, AT_ENGL, AD_DGST } from './monsters.js';
import { MONSEEN_NORMAL, MONSEEN_SEEINVIS, MONSEEN_INFRAVIS, MONSEEN_TELEPAT,
         MONSEEN_XRAYVIS, MONSEEN_DETECT, MONSEEN_WARNMON, STRAT_WAITMASK,
         NO_TRAP, BEAR_TRAP, WEB, is_pit, VIBRATING_SQUARE, TRAPPED_DOOR,
         TRAPPED_CHEST, SEE_INVIS, TELEPAT, INFRAVISION, DETECT_MONSTERS,
         HALLUC_RES, I_SPECIAL, AM_MASK, AM_SANCTUM, Amask2align, Is_astralevel,
         Is_airlevel, TER_MON, TER_OBJ, TER_DETECT, TER_MAP, GPCOORDS_NONE,
         GPCOORDS_MAP, GPCOORDS_COMPASS, GPCOORDS_COMFULL, GPCOORDS_SCREEN,
         BOLT_LIM, COLNO, ROWNO, IS_GRAVE, WARNCOUNT, def_warnsyms, SYM_NOTHING,
         SYM_UNEXPLORED, SYM_BOULDER, SYM_INVISIBLE, ROGUESET, Is_rogue_level } from './const.js';
import { perceives, is_orc, digests } from './mondata.js';
import { sticks } from './engrave.js';
import { altarmask_at } from './pray.js';
import { align_str } from './insight.js';
import { In_hell } from './dungeon.js';
import { ok_to_quest } from './quest.js';
import { strstri, mungspaces } from './hacklib.js';
import { the } from './iactions.js';
import { trapname } from './trap.js';
import { display_inventory } from './invent.js';
import { data_base } from './data_base.js';
import { tty_putmixed, tty_getlin, tty_display_file } from './wintty.js';
import { doextversion } from './mdlib.js';
import {
    Blind, Hallucination, See_invisible, Infravision, Detect_monsters, Invis, Invisible
} from './youprop.js';
import { Levitation as Levitation_pg } from './youprop.js';
import { distu as distu_pg } from './hacklib.js';
import { spot_time_left as spot_time_left_pg } from './timeout.js';
import { MELT_ICE_AWAY as MELT_ICE_AWAY_PG } from './const.js';
import { trap_predicament } from './insight.js';
import { y_monnam as y_monnam_pg } from './do_name.js';
import { visible_region_at as visible_region_at_pg } from './region.js';
import { ansimpleoname as ansimpleoname_pg } from './iactions.js';
import { MHID_PREFIX, MHID_ARTICLE, MHID_ALTMON, MHID_REGION, M_AP_FURNITURE,
         M_AP_MONSTER, BUFSZ as BUFSZ_PG } from './const.js';
import { glyph_kind as glyph_kind_pg } from './display.js';
import { simpleonames as simpleonames_pg, surface as surface_pg } from './iactions.js';
import { Mgender as Mgender_pg } from './do_name.js';
import { ceiling_hider as ceiling_hider_pg } from './engrave.js';
import { M1_CONCEAL as M1_CONCEAL_PG, M1_HIDE as M1_HIDE_PG,
         S_EEL as S_EEL_PG } from './monsters.js';
import { S_poisoncloud as S_poisoncloud_pg } from './region.js';
import { option_help as option_help_pg } from './options.js';

/* C ref: defsym.h PCHAR()/PCHAR2() -- defsyms[] .sym and .explanation as
   drawing.c builds them (PCHAR_DRAWING), S_stone .. S_expl_br */
const defsyms = [
    [' ', "stone"], ['|', "wall"], ['-', "wall"], ['-', "wall"],
    ['-', "wall"], ['-', "wall"], ['-', "wall"], ['-', "wall"],
    ['-', "wall"], ['-', "wall"], ['|', "wall"], ['|', "wall"],
    ['.', "doorway"], ['-', "open door"], ['|', "open door"],
    ['+', "closed door"], ['+', "closed door"], ['#', "iron bars"],
    ['#', "tree"], ['.', "floor of a room"], ['.', "dark part of a room"],
    ['`', "engraving"], ['#', "corridor"], ['#', "lit corridor"],
    ['#', "engraving"], ['<', "staircase up"], ['>', "staircase down"],
    ['<', "ladder up"], ['>', "ladder down"], ['<', "branch staircase up"],
    ['>', "branch staircase down"], ['<', "branch ladder up"],
    ['>', "branch ladder down"], ['_', "altar"], ['|', "grave"],
    ['\\', "opulent throne"], ['{', "sink"], ['{', "fountain"],
    ['}', "water"], ['.', "ice"], ['}', "molten lava"],
    ['}', "wall of lava"], ['.', "lowered drawbridge"],
    ['.', "lowered drawbridge"], ['#', "raised drawbridge"],
    ['#', "raised drawbridge"], [' ', "air"], ['#', "cloud"],
    ['}', "water"],
    /* traps, S_arrow_trap .. S_trapped_chest */
    ['^', "arrow trap"], ['^', "dart trap"], ['^', "falling rock trap"],
    ['^', "squeaky board"], ['^', "bear trap"], ['^', "land mine"],
    ['^', "rolling boulder trap"], ['^', "sleeping gas trap"],
    ['^', "rust trap"], ['^', "fire trap"], ['^', "pit"],
    ['^', "spiked pit"], ['^', "hole"], ['^', "trap door"],
    ['^', "teleportation trap"], ['^', "level teleporter"],
    ['^', "magic portal"], ['"', "web"], ['^', "statue trap"],
    ['^', "magic trap"], ['^', "anti-magic field"],
    ['^', "polymorph trap"], ['~', "vibrating square"],
    ['^', "trapped door"], ['^', "trapped chest"],
    /* beams, shield effects, S_poisoncloud, S_goodpos */
    ['|', ""], ['-', ""], ['\\', ""], ['/', ""], ['*', ""], ['!', ""],
    [')', ""], ['(', ""], ['0', ""], ['#', ""], ['@', ""], ['*', ""],
    ['#', "poison cloud"], ['$', "valid position"],
    /* swallow boundaries, S_sw_tl .. S_sw_br */
    ['/', ""], ['-', ""], ['\\', ""], ['|', ""], ['|', ""], ['\\', ""],
    ['-', ""], ['/', ""],
    /* explosions, S_expl_tl .. S_expl_br */
    ['/', ""], ['-', ""], ['\\', ""], ['|', ""], [' ', ""], ['|', ""],
    ['\\', ""], ['-', ""], ['/', ""],
];
const MAXPCHARS = defsyms.length;
const S_stone = 0, S_ndoor = 12, S_vodoor = 13, S_hodoor = 14,
    S_vcdoor = 15, S_hcdoor = 16, S_bars = 17, S_tree = 18, S_room = 19,
    S_darkroom = 20, S_engroom = 21, S_corr = 22, S_litcorr = 23,
    S_engrcorr = 24, S_upstair = 25,
    S_dnstair = 26, S_upladder = 27, S_dnladder = 28, S_brupstair = 29,
    S_brdnstair = 30, S_brupladder = 31, S_brdnladder = 32, S_altar = 33,
    S_grave = 34, S_throne = 35, S_sink = 36, S_fountain = 37, S_pool = 38,
    S_ice = 39, S_lava = 40, S_lavawall = 41, S_vodbridge = 42,
    S_hodbridge = 43, S_vcdbridge = 44, S_hcdbridge = 45, S_air = 46, S_cloud = 47,
    S_water = 48, S_arrow_trap = 49, S_vibrating_square = 71,
    S_trapped_chest = 73, S_sw_tl = 88, S_sw_br = 95;
export const defsyms_explanation = defsyms.map(d => d[1]);

/* C ref: rm.h is_cmap_trap(), is_cmap_drawbridge() */
function is_cmap_trap(i) { return i >= S_arrow_trap && i <= S_trapped_chest; }
export function is_cmap_drawbridge(i) { return i >= S_vodbridge && i <= S_hcdbridge; }

/* C ref: dat/symbols "DECgraphics" -- the symbols it sets (meta forms of
   the alternate-charset letters), by defsyms[] index */
const DECgraphics_syms = {
    1: 'x', 2: 'q', 3: 'l', 4: 'k', 5: 'm', 6: 'j', 7: 'n', 8: 'v',
    9: 'w', 10: 'u', 11: 't', 12: '~', 13: 'a', 14: 'a', 17: '|',
    18: 'g', 19: '~', 27: 'y', 28: 'z', 31: 'y', 32: 'z', 33: '{',
    38: '`', 39: '~', 40: '`', 41: '`', 42: '~', 43: '~', 48: '`',
    74: 'x', 75: 'q', 89: 'o', 91: 'x', 92: 'x', 94: 's', 97: 'o',
    99: 'x', 101: 'x', 103: 's',
};

/* C ref: defsym.h MONSYM() -- def_monsyms[].explain, by monster class */
const def_monsyms_explain = [
    "", "ant or other insect", "blob", "cockatrice", "dog or other canine",
    "eye or sphere", "cat or other feline", "gremlin", "humanoid",
    "imp or minor demon", "jelly", "kobold", "leprechaun", "mimic",
    "nymph", "orc", "piercer", "quadruped", "rodent",
    "arachnid or centipede", "trapper or lurker above", "unicorn or horse",
    "vortex", "worm", "xan or other mythical/fantastic insect", "light",
    "zruty", "angelic being", "bat or bird", "centaur", "dragon",
    "elemental", "fungus or mold", "gnome", "giant humanoid",
    "invisible monster", "jabberwock", "Keystone Kop", "lich", "mummy",
    "naga", "ogre", "pudding or ooze", "quantum mechanic",
    "rust monster or disenchanter", "snake", "troll", "umber hulk",
    "vampire", "wraith", "xorn", "apelike creature", "zombie",
    "human or elf", "ghost", "golem", "major demon", "sea monster",
    "lizard", "long worm tail", "mimic",
];

/* C ref: hack.h DEF_NOTHING; defsym.h DEF_INVISIBLE */
const DEF_NOTHING = ' ', DEF_INVISIBLE = 'I';

/* C ref: pager.c invisexplain[], altinvisexplain[] */
const invisexplain = "remembered, unseen, creature",
    altinvisexplain = "unseen creature"; /* for clairvoyance */

const chcode = ch => (ch || '\0').charCodeAt(0);

/* the DECgraphics symset is the primary one (options symset:DECgraphics) */
function dec_symset_pg() {
    return /^decgraphics$/i.test(game.symset_name || '');
}

// C ref: symbols.c init_showsyms(), load_symset("DECgraphics") and
// display.c reglyph_darkroom() -- gs.showsyms[] for the cmap symbols of the
// primary symset (an nhsym: DECgraphics symbols have the high bit set)
function showsyms_cmap(i) {
    if (game.currentgraphics === ROGUESET) {
        /* symbols.c init_rogue_symbols(): gr.rogue_syms[] (no
           go.ov_rogue_syms[] overrides are set) */
        if (i === S_vodoor || i === S_hodoor || i === S_ndoor)
            return chcode('+');
        if (i === S_upstair || i === S_dnstair)
            return chcode('%');
        return chcode(defsyms[i][0]);
    }
    if (i === S_darkroom) {
        /* reglyph_darkroom() */
        if (game.flags.dark_room !== false && game.iflags.wc_color !== false)
            return showsyms_cmap(S_room);
        return showsyms_oth(SYM_NOTHING);
    }
    if (dec_symset_pg() && DECgraphics_syms[i] !== undefined)
        return 0x80 | chcode(DECgraphics_syms[i]);
    return chcode(defsyms[i][0]);
}

// gs.showsyms[i + SYM_OFF_M], gs.showsyms[i + SYM_OFF_O] and
// gw.warnsyms[i]: no symset in use changes these from their defaults
function showsyms_mon(i) { return chcode(def_monsyms[i]); }
function showsyms_obj(i) {
    /* symbols.c init_rogue_symbols(): def_r_oc_syms[] on the Rogue level */
    if (game.currentgraphics === ROGUESET)
        return chcode(def_r_oc_syms[i]);
    return chcode(def_oc_syms[i]);
}
function warnsyms(i) { return chcode(def_warnsyms[i].ch); }

// C ref: symbols.c get_othersym() -- gs.showsyms[idx + SYM_OFF_X]; no S_
// overrides are set (go.ov_primary_syms[] are 0), so the defaults:
// SYM_PET_OVERRIDE and SYM_HERO_OVERRIDE have none
function showsyms_oth(idx) {
    switch (idx) {
    case SYM_NOTHING:
    case SYM_UNEXPLORED:
        return chcode(DEF_NOTHING);
    case SYM_BOULDER:
        return chcode(def_oc_syms[ROCK_CLASS]);
    case SYM_INVISIBLE:
        return chcode(DEF_INVISIBLE);
    default:
        return 0;
    }
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
        /* idx = ptr->seenv ? wall_angle(ptr) : S_stone; display.js's
           back_to_glyph() runs wall_angle() and carries the S_* index */
        return ptr.seenv ? (back_to_glyph(x, y).cmapidx ?? S_stone) : S_stone;
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
        if (known_branch_stairs(stairway_at(x, y)))
            return (ptr.ladder & LA_DOWN) ? S_brdnstair : S_brupstair;
        return (ptr.ladder & LA_DOWN) ? S_dnstair : S_upstair;
    case LADDER:
        if (known_branch_stairs(stairway_at(x, y)))
            return (ptr.ladder & LA_DOWN) ? S_brdnladder : S_brupladder;
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
        return (ptr.horizontal) ? S_hcdbridge : S_vcdbridge;
    case DRAWBRIDGE_UP:
        switch ((ptr.drawbridgemask || 0) & DB_UNDER) {
        case DB_MOAT:
            return S_pool;
        case DB_LAVA:
            return S_lava;
        case DB_ICE:
            return S_ice;
        case DB_FLOOR:
            return S_room;
        default:
            /* impossible("Strange db-under: %d", ...) */
            return S_room; /* something is better than nothing */
        }
    case DRAWBRIDGE_DOWN:
        return (ptr.horizontal) ? S_hodbridge : S_vodbridge;
    default:
        return S_room;
    }
}

// C ref: pager.c waterbody_name()
/* describe a pool location's contents; the Snprintf()s are into a
   40-character buffer (pooltype[40]) */
export function waterbody_name(x, y) {
    let ltyp;
    const hallucinate = Hallucination() && !game.program_state?.gameover;

    if (!isok(x, y))
        return "drink"; /* should never happen */
    /* ltyp = SURFACE_AT(x, y) */
    const loc = game.level.at(x, y);
    ltyp = (loc.typ === DRAWBRIDGE_UP) ? db_under_typ(loc.drawbridgemask)
                                        : loc.typ;

    if (ltyp === LAVAPOOL) {
        return `molten ${hliquid("lava")}`.slice(0, 39);
    } else if (ltyp === ICE) {
        if (!hallucinate)
            return "ice";
        return `frozen ${hliquid("water")}`.slice(0, 39);
    } else if (ltyp === POOL) {
        return `pool of ${hliquid("water")}`.slice(0, 39);
    } else if (ltyp === MOAT) {
        /* a bit of extra flavor over general moat */
        if (hallucinate) {
            return `deep ${hliquid("water")}`.slice(0, 39);
        } else if (Is_medusa_level(game.u.uz)) {
            /* somewhat iffy since ordinary stairs can take you beneath,
               but previous generic "water" was rather anti-climactic */
            return "shallow sea";
        } else if (Is_juiblex_level(game.u.uz)) {
            return "swamp";
        } else if (game.urole.mnum === PM_SAMURAI && Is_qstart(game.u.uz)) {
            /* samurai quest home level has two isolated moat spots;
               they sound silly if farlook describes them as such */
            return "pond";
        } else {
            return "moat";
        }
    } else if (IS_WATERWALL(ltyp)) {
        if (Is_waterlevel(game.u.uz))
            return "limitless water"; /* even if hallucinating */
        return `wall of ${hliquid("water")}`.slice(0, 39);
    } else if (ltyp === LAVAWALL) {
        return `wall of ${hliquid("lava")}`.slice(0, 39);
    }
    /* default; should be unreachable */
    return "water"; /* don't hallucinate this as some other liquid */
}
// C ref: pager.c ice_descr()
/* describe a frozen pool or moat (the hero's view of how solid it is);
   C writes into the caller's outbuf, JS returns the string */
export function ice_descr(x, y) {
    const icetyp = [
        "solid",    /* 0: not melting */
        "sturdy",   /* 1: more than 1000 turns left */
        "steady",   /* 2: 101..1000 turns left */
        "unsteady", /* 3:  51..100 turns left */
        "thin",     /* 4:  15..50 turns left */
        "slushy",   /* 5:   1..14 turns left; matches Warning on ice */
    ];
    const u = game.u;
    /* same formula as is used in distant_name() for objects */
    const r = (u.xray_range > 2) ? u.xray_range : 2,
          neardist = (r * r) * 2 - r; /* same as r*r + r*(r-1) */
    const loc = game.level.at(x, y);
    const surface = (loc.typ === DRAWBRIDGE_UP) /* SURFACE_AT(x, y) */
                    ? db_under_typ(loc.drawbridgemask) : loc.typ;

    game.iflags.ice_rating = -1; /* secondary output, for 'mention_decor' */
    if (surface !== ICE) {
        return `[ice:${loc.typ}?]`;
    } else if ((distu_pg(x, y) > neardist
                || (!cansee(x, y) && (!u_at(x, y) || Levitation_pg())))
               && !game.decor_levitate_override) { /* probe_decor(pickup.c) */
        return waterbody_name(x, y); /* "ice" or "frozen <liquid>" */
    } else {
        const time_left = spot_time_left_pg(x, y, MELT_ICE_AWAY_PG);

        /* other, real ice thickness/strength terminology exists but seems
           to be too unfamiliar for nethack's use */
        game.iflags.ice_rating = !time_left ? 0                /* solid */
                                 : (time_left > 1000) ? 1     /* sturdy */
                                   : (time_left > 100) ? 2    /* steady */
                                     : (time_left > 50) ? 3   /* unsteady */
                                       : (time_left > 14) ? 4 /* thin */
                                         : 5;                 /* slushy */
        return `${icetyp[game.iflags.ice_rating]} ${waterbody_name(x, y)}`;
    }
}

// C ref: pager.c self_lookat()
export function self_lookat() {
    const u = game.u;
    let race = "";

    /* include race with role unless polymorphed */
    if (!u.mtimedone) /* !Upolyd */
        race = `${game.urace.adj} `;
    /* mons[u.umonnum], not gy.youmonst.data (display_minventory() points
       that at an engulfer's data while listing its stomach); Ugender */
    const Ugender = (u.umonnum !== u.umonster) ? u.mfemale : game.flags.female;
    let outbuf = `${Invis() && !Blind() ? "invisible " : ""}${race}`
        + `${pmname(mons[u.umonnum], Ugender ? FEMALE : MALE)}`
        + ` called ${game.plname}`;
    if (u.usteed)
        outbuf += `, mounted on ${y_monnam_pg(u.usteed)}`;
    if (u.uundetected || (u.mtimedone && game.youmonst.m_ap_type)
        || visible_region_at_pg(u.ux, u.uy))
        outbuf += mhidden_description(game.youmonst,
                                      MHID_PREFIX | MHID_ARTICLE | MHID_REGION);
    if (game.uball) /* Punished */
        outbuf += `, chained to ${game.uball ? ansimpleoname_pg(game.uball) : "nothing?"}`;
    if (u.utrap) /* bear trap, pit, web, in-floor, in-lava, tethered */
        outbuf += `, ${trap_predicament(0, false)}`;
    return outbuf;
}

// C ref: pager.c mhidden_description()
/* describe a hidden monster; used for look_at during extended monster
   detection and for probing; also when looking at self and camera feedback;
   returns the text C appends to outbuf */
export function mhidden_description(mon, /* hidden monster to describe */
                                    mhid_flags) { /* controls optional aspects of description */
    const u = game.u;
    let otmp;
    let what;
    let reg;
    const incl_prefix = (mhid_flags & MHID_PREFIX) !== 0,
        incl_article = (mhid_flags & MHID_ARTICLE) !== 0,
        show_altmon = (mhid_flags & MHID_ALTMON) !== 0,
        force_region = (mhid_flags & MHID_REGION) !== 0;
    const isyou = (mon === game.youmonst);
    const x = isyou ? u.ux : mon.mx, y = isyou ? u.uy : mon.my;
    let glyph;
    if (game.level.flags?.hero_memory && !isyou) {
        /* levl[x][y].glyph */
        const rg = game.level.at(x, y).remembered_glyph;
        glyph = rg ? { ...rg, kind: glyph_kind_pg(rg) } : { ch: ' ', kind: 'cmap' };
    } else {
        glyph = glyph_at(x, y);
    }
    let outbuf = '';
    /* objfrommap: */
    const objfrommap = () => {
        otmp = null;
        const res = object_from_map(glyph, x, y);
        const fakeobj = res.fakeobj;
        otmp = res.otmp;
        what = (otmp && otmp.otyp !== STRANGE_OBJECT)
               ? simpleonames_pg(otmp)
               : obj_descr[STRANGE_OBJECT].oc_name;
        if (incl_article && (!otmp || otmp.quan === 1))
            what = an(what);
        outbuf += what;

        if (fakeobj && otmp)
            otmp.where = 'OBJ_FREE'; /* object_from_map set to OBJ_FLOOR;
                                        dealloc_obj(otmp): has no contents */
    };

    /* M_AP_TYPE(mon); for the hero, U_AP_TYPE (only while polymorphed) */
    const ap_type = isyou ? (u.mtimedone ? (game.youmonst.m_ap_type || 0) : 0)
                          : (mon.m_ap_type || 0);
    if (ap_type === M_AP_FURNITURE || ap_type === M_AP_OBJECT) {
        if (incl_prefix)
            outbuf = ", mimicking ";
        if (ap_type === M_AP_FURNITURE) {
            what = defsyms_explanation[mon.mappearance];
            if (incl_article)
                what = an(what);
            outbuf += what;
        } else if (ap_type === M_AP_OBJECT
                   /* remembered glyph, not glyph_at() which is 'mon' */
                   && glyph_is_object(glyph)) {
            objfrommap();
        } else {
            outbuf += "something";
        }
    } else if (ap_type === M_AP_MONSTER) {
        if (show_altmon) {
            if (incl_prefix)
                outbuf += ", masquerading as ";
            what = pmname(mons[mon.mappearance], Mgender_pg(mon));
            if (incl_prefix)
                what = an(what);
            outbuf += what;
        }
    } else if (isyou ? u.uundetected : mon.mundetected) {
        outbuf = ", hiding";
        if ((mon.data.mflags1 & M1_CONCEAL_PG) !== 0) { /* hides_under() */
            outbuf += " under ";
            /* remembered glyph, not glyph_at() which is 'mon' */
            if (glyph_is_object(glyph))
                objfrommap();
            else
                outbuf += "something";
        } else if ((mon.data.mflags1 & M1_HIDE_PG) !== 0) { /* is_hider() */
            outbuf += ` on the ${ceiling_hider_pg(mon.data) ? "ceiling"
                                 : surface_pg(x, y)}`; /* trapper */
        } else {
            if (mon.data.mlet === S_EEL_PG && is_pool(x, y))
                outbuf += " in murky water";
        }
    }

    /* FIXME: <x,y> isn't right when looking at long worm tails */
    if ((reg = visible_region_at_pg(x, y)) !== null
        && outbuf.length < BUFSZ_PG - 1) {
        const r = (u.xray_range > 1) ? u.xray_range : 1;

        /* at present, hero must be next to the monster; being able to see
           from the hero's spot to the monster's spot would be much better,
           but a visible region marks all its spots as can't-be-seen, so
           this monster's spot is !cansee and !couldsee [maybe we need an
           additional vision bit for "hero's side of edge of gas cloud"?] */
        if ((x - u.ux) ** 2 + (y - u.uy) ** 2 <= r * (r + 1) /* distu() */
            || force_region) {
            const rglyph = reg.glyph;
            /* glyph_is_cmap(rglyph) && glyph_to_cmap(rglyph) == S_poisoncloud
               (a JS region glyph is its cmap index) */
            const poison_gas = (rglyph === S_poisoncloud_pg);

            outbuf += `, in a cloud of ${poison_gas ? "poison gas" : "vapor"}`;
        }
    }
    return outbuf;
}

// C ref: pager.c look_at_object()
// 'glyph' is the glyph_at() glyph at <x,y>
function look_at_object(x, y, glyph) {
    let buf;
    let { fakeobj, otmp } = object_from_map(glyph, x, y);

    if (otmp) {
        buf = (otmp.otyp !== STRANGE_OBJECT)
              ? distant_name(otmp, otmp.dknown ? doname_with_price
                                               : doname_vague_quan)
              : obj_descr[STRANGE_OBJECT].oc_name;
        if (fakeobj) {
            otmp.where = 'OBJ_FREE'; /* object_from_map set it to OBJ_FLOOR */
            /* dealloc_obj(otmp): has no contents */
        }
    } else {
        buf = "something"; /* sanity precaution */
    }

    const lev = game.level.at(x, y);
    if (otmp && otmp.where === 'OBJ_BURIED')
        buf += " (buried)";
    /* check TREE before STONE due to level.flags.arboreal */
    else if (lev.typ === TREE)
        /* "dangling": "hanging" could imply that it's growing on this tree */
        buf += ` ${(otmp && is_treefruit(otmp)) ? "dangling" : "stuck"} in a tree`;
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

// C ref: display.h is_obj_mappear()
export function is_obj_mappear(mon, otyp) {
    return mon.m_ap_type === M_AP_OBJECT && mon.mappearance === otyp;
}

// C ref: pager.c object_from_map()
/* extracted from lookat(); also used by namefloorobj() */
// glyph is a glyph_at()/lev->glyph glyph; returns { fakeobj, otmp } for
// C's return value and *obj_p
export function object_from_map(glyph, x, y) {
    let fakeobj = false, mimic_obj = false;
    let mtmp;
    let otmp;
    const glyphotyp = (glyph.kind === 'obj') ? glyph.otyp /* glyph_to_obj() */
                      /* if not an object, probably a detected chest trap */
                      : (glyph.kind === 'cmap' || glyph.kind === 'trap')
                        /* assume trapped chest|door */
                        ? (sobj_at(CHEST, x, y) ? CHEST : LARGE_BOX)
                        : STRANGE_OBJECT;

    /* TODO: check inside containers in case glyph came from detection */
    if ((otmp = sobj_at(glyphotyp, x, y)) === null)
        otmp = (game.level.buriedobjlist || []).find(o =>
            o.ox === x && o.oy === y && o.otyp === glyphotyp) || null;

    /* there might be a mimic here posing as an object */
    mtmp = m_at(x, y);
    if (mtmp && is_obj_mappear(mtmp, glyphotyp)) {
        otmp = null;
        mimic_obj = true;
    } else
        mtmp = null;

    if (!otmp || otmp.otyp !== glyphotyp) {
        /* this used to exclude STRANGE_OBJECT; now caller deals with it */
        if (OBJ_NAME(objects[glyphotyp])) {
            /* map shows a regular object, but one that's not actually here */
            otmp = mksobj(glyphotyp, false, false);
        } else {
            /* map shows a non-item that holds an extra object type (shown
               on map due to hallucination) for a name which might have been
               shuffled into play but wasn't (or was shuffled out of play);
               pick another item that is a regular one in same object class */
            otmp = mkobj(objects[glyphotyp].oc_class, false);
            /* mkobj() doesn't provide any no-init option; however, there
               aren't any extra tool items (or statues) so we won't get here
               for tools and don't need to check for and delete container
               contents or extinguish lights on the temporary object */
        }
        /* even though we pass False for mksobj()'s 'init' arg, corpse-rot,
           egg-hatch, and figurine-transform timers get initialized */
        if (otmp.timed)
            obj_stop_timers(otmp);
        fakeobj = true;
        if (otmp.oclass === COIN_CLASS)
            otmp.quan = 2; /* to force pluralization */
        else if (otmp.otyp === SLIME_MOLD)
            otmp.spe = game.context.current_fruit; /* give it a type */
        if (mtmp && MCORPSENM(mtmp) !== -1) { /* has_mcorpsenm(): mimic as corpse/statue */
            if (otmp.otyp === SLIME_MOLD)
                /* override svc.context.current_fruit to avoid
                     look, use 'O' to make new named fruit, look again
                   giving different results when current_fruit changes */
                otmp.spe = MCORPSENM(mtmp);
            else
                otmp.corpsenm = MCORPSENM(mtmp);
        } else if (otmp.otyp === CORPSE && glyph.kind === 'obj'
                   && glyph.otyp === CORPSE) { /* glyph_is_body(glyph) */
            otmp.corpsenm = glyph.corpsenm; /* glyph_to_body_corpsenm() */
        } else if (otmp.otyp === STATUE && glyph.kind === 'obj'
                   && glyph.otyp === STATUE) { /* glyph_is_statue(glyph) */
            otmp.corpsenm = glyph.corpsenm; /* glyph_to_statue_corpsenm() */
        }
        if (otmp.otyp === LEASH)
            otmp.leashmon = 0;
        /* extra fields needed for shop price with doname() formatting */
        otmp.where = 'OBJ_FLOOR';
        otmp.ox = x, otmp.oy = y;
        otmp.no_charge = (otmp.otyp === STRANGE_OBJECT && costly_spot(x, y)) ? 1 : 0;
    }
    /* if located at adjacent spot, mark it as having been seen up close
       (corpse type will be known even if dknown is 0, so we don't need a
       touch check for cockatrice corpse--we're looking without touching) */
    if (otmp && Math.abs(x - game.u.ux) <= 1 && Math.abs(y - game.u.uy) <= 1 /* next2u() */
        && !Blind() && !Hallucination()
        /* redundant: we only look for an object which matches current
           glyph among floor and buried objects; when !Blind, any buried
           object's glyph will have been replaced by whatever is present
           on the surface as soon as we moved next to its spot */
        && (fakeobj || otmp.where === 'OBJ_FLOOR') /* not buried */
        /* terrain mode views what's already known, doesn't learn new stuff */
        && !game.iflags.terrainmode) /* so don't set dknown when in terrain mode */
        observe_object(otmp, Hallucination()); /* if a pile, clearly see the top item only */
    if (fakeobj && mtmp && mimic_obj
        && (otmp.dknown || mtmp.m_ap_fdknown /* M_AP_FLAG() & M_AP_F_DKNOWN */)) {
        mtmp.m_ap_fdknown = 1; /* mtmp->m_ap_type |= M_AP_F_DKNOWN */
        observe_object(otmp, Hallucination());
    }
    return { fakeobj, otmp }; /* when fakeobj, caller needs to dealloc otmp */
}

// C ref: mkobj.c is_treefruit() -- for describing objects embedded in trees
const treefruits = [APPLE, ORANGE, PEAR, BANANA, EUCALYPTUS_LEAF];
function is_treefruit(otmp) {
    return treefruits.includes(otmp.otyp);
}

// C ref: vision.c howmonseen() -- how the hero sees a monster (MONSEEN_*)
export function howmonseen(mon) {
    const u = game.u;
    const useemon = canseemon(mon);
    const xraydist = (u.xray_range < 0) ? -1 : ((u.xray_range || 0) * (u.xray_range || 0));
    let how_seen = 0; /* result */

    /* normal vision;
       cansee is true for both normal and astral vision,
       but couldsee it not true for astral vision */
    if ((mon.wormno ? worm_known(mon) : (cansee(mon.mx, mon.my)
                                         && couldsee(mon.mx, mon.my)))
        && mon_visible(mon) && !mon.minvis)
        how_seen |= MONSEEN_NORMAL;
    /* see invisible */
    if (useemon && mon.minvis)
        how_seen |= MONSEEN_SEEINVIS;
    /* infravision */
    if ((!mon.minvis || See_invisible()) && see_with_infrared(mon))
        how_seen |= MONSEEN_INFRAVIS;
    /* telepathy */
    if (tp_sensemon(mon))
        how_seen |= MONSEEN_TELEPAT;
    /* xray */
    if (useemon && xraydist > 0
        && ((mon.mx - u.ux) ** 2 + (mon.my - u.uy) ** 2) <= xraydist) /* mdistu() */
        how_seen |= MONSEEN_XRAYVIS;
    /* extended detection */
    if (Detect_monsters())
        how_seen |= MONSEEN_DETECT;
    /* class-/type-specific warning */
    if (MATCH_WARN_OF_MON(mon))
        how_seen |= MONSEEN_WARNMON;

    return how_seen;
}

// C ref: pager.c look_at_monster() -- returns { buf, monbuf }; monbuf is
// only worked out when 'want_monbuf'
function look_at_monster(mtmp, x, y, want_monbuf) {
    const accurate = !Hallucination();
    let monbuf = null;

    const name = (mtmp.data === mons[PM_COYOTE] && accurate)
                   ? coyotename(mtmp)
                   : distant_monnam(mtmp, ARTICLE_NONE);
    let buf = `${(mtmp.mx !== x || mtmp.my !== y)
                 ? ((mtmp.isshk && accurate) ? "tail of " : "tail of a ") : ""}`
        /* monhealthdescr() is disabled in C ("") */
        + `${(mtmp.mtame && accurate) ? "tame "
             : (mtmp.mpeaceful && accurate) ? "peaceful " : ""}`
        + name;
    if (game.u.ustuck === mtmp) {
        if (game.u.uswallow || game.iflags.save_uswallow) /* monster detection */
            buf += digests(mtmp.data) ? ", swallowing you" : ", engulfing you";
        else
            buf += (game.u.mtimedone && sticks(game.youmonst.data))
                   ? ", being held" : ", holding you";
    }
    /* if mtmp isn't able to move (other than because it is a type of
       monster that never moves), say so [excerpt from mstatusline() for
       stethoscope or wand of probing] */
    if (mtmp.mfrozen)
        /* unfortunately mfrozen covers temporary sleep and being busy
           (donning armor, for instance) as well as paralysis */
        buf += ", can't move (paralyzed or sleeping or busy)";
    else if (mtmp.msleeping)
        /* sleeping for an indeterminate duration */
        buf += ", asleep";
    else if ((mtmp.mstrategy & STRAT_WAITMASK) !== 0)
        /* arbitrary reason why it isn't moving */
        buf += ", meditating";

    if (mtmp.mleashed)
        buf += ", leashed to you";
    if (mtmp.mtrapped && cansee(mtmp.mx, mtmp.my)) {
        const t = t_at(mtmp.mx, mtmp.my);
        const tt = t ? t.ttyp : NO_TRAP;

        /* newsym lets you know of the trap, so mention it here */
        if (tt === BEAR_TRAP || is_pit(tt) || tt === WEB) {
            buf += `, trapped in ${an(trapname(tt, false))}`;
            t.tseen = 1;
        }
    }

    /* we know the hero sees a monster at this location, but if it's shown
       due to persistent monster detection he might remember something else */
    if (mtmp.mundetected || mtmp.m_ap_type || visible_region_at_pg(x, y))
        buf += mhidden_description(mtmp, MHID_PREFIX | MHID_ARTICLE | MHID_REGION);

    if (want_monbuf) {
        let how_seen = howmonseen(mtmp);

        monbuf = '';
        if (how_seen !== 0 && how_seen !== MONSEEN_NORMAL) {
            if (how_seen & MONSEEN_NORMAL) {
                monbuf += "normal vision";
                how_seen &= ~MONSEEN_NORMAL;
                /* how_seen can't be 0 yet... */
                if (how_seen)
                    monbuf += ", ";
            }
            if (how_seen & MONSEEN_SEEINVIS) {
                monbuf += "see invisible";
                how_seen &= ~MONSEEN_SEEINVIS;
                if (how_seen)
                    monbuf += ", ";
            }
            if (how_seen & MONSEEN_INFRAVIS) {
                monbuf += "infravision";
                how_seen &= ~MONSEEN_INFRAVIS;
                if (how_seen)
                    monbuf += ", ";
            }
            if (how_seen & MONSEEN_TELEPAT) {
                monbuf += "telepathy";
                how_seen &= ~MONSEEN_TELEPAT;
                if (how_seen)
                    monbuf += ", ";
            }
            if (how_seen & MONSEEN_XRAYVIS) {
                /* Eyes of the Overworld */
                monbuf += "astral vision";
                how_seen &= ~MONSEEN_XRAYVIS;
                if (how_seen)
                    monbuf += ", ";
            }
            if (how_seen & MONSEEN_DETECT) {
                monbuf += "monster detection";
                how_seen &= ~MONSEEN_DETECT;
                if (how_seen)
                    monbuf += ", ";
            }
            if (how_seen & MONSEEN_WARNMON) {
                if (Hallucination())
                    monbuf += "paranoid delusion";
                else {
                    const wt = game.context.warntype || {};
                    const mW = ((wt.obj || 0) | (wt.polyd || 0)),
                          m2 = mtmp.data.mflags2;
                    const whom = ((mW & M2_HUMAN & m2) ? "human"
                                  : (mW & M2_ELF & m2) ? "elf"
                                    : (mW & M2_ORC & m2) ? "orc"
                                      : (mW & M2_DEMON & m2) ? "demon"
                                        : pmname(mtmp.data,
                                                 Mgender_pg(mtmp)));

                    monbuf += `warned of ${makeplural(whom)}`;
                }
                how_seen &= ~MONSEEN_WARNMON;
                if (how_seen)
                    monbuf += ", ";
            }
        } /* seen by something other than normal vision */
    } /* monbuf is non-null */
    return { buf, monbuf };
}

// C ref: pager.c trap_description()
function trap_description(tnum, x, y) {
    /*
     * Trap detection used to display a bear trap at locations having
     * a trapped door or trapped container or both.  They're semi-real
     * traps now (defined trap types but not part of ftrap chain).
     */
    if (tnum === TRAPPED_CHEST || tnum === TRAPPED_DOOR)
        throw new Error('trap_description(): trapped chest/door not ported yet');
    return trapname(tnum, false);
}

/* C ref: display.h glyph_is_*() for a glyph_at() glyph */
function glyph_is_monster(glyph) { return glyph.kind === 'mon'; }
function glyph_is_object(glyph) { return glyph.kind === 'obj'; }
function glyph_is_trap(glyph) { return glyph.kind === 'trap'; }
function glyph_is_statue(glyph) {
    return glyph.kind === 'obj' && glyph.otyp === STATUE;
}
/* GLYPH_NOTHING (display.js magic_map_background() of an unlit floor spot
   with !dark_room) carries the 'nothing' mark into the shown glyph */
function glyph_is_nothing(glyph) { return !!glyph.nothing; }
function glyph_is_unexplored(glyph) {
    return glyph.kind === 'cmap' && glyph.ch === ' ' && glyph.cmapidx === undefined
        && !glyph.nothing;
}
/* C ref: display.h glyph_to_trap() -- the trap a trap glyph shows */
function glyph_to_trap(glyph, x, y) {
    const t = t_at(x, y);
    if (!t)
        throw new Error('glyph_to_trap(): remembered trap that is gone not ported yet');
    return t.ttyp;
}

// C ref: pager.c lookat() -- the glyph_is_cmap() case
function cmap_lookat(symidx, x, y) {
    const lev = game.level.at(x, y);
    const u = game.u;

    switch (symidx) {
    case S_altar: {
        const amsk = altarmask_at(x, y);
        const algn = Amask2align(amsk & AM_MASK);
        return `${(Is_astralevel(u.uz) && !next2u_pg(x, y) && (amsk & AM_SANCTUM))
                  ? "aligned" : align_str(algn)} ${(amsk & AM_SANCTUM) ? "high " : ""}altar`;
    }
    case S_ndoor:
        /* is_drawbridge_wall(x, y) >= 0: drawbridges aren't ported */
        if ((lev.doormask & ~D_TRAPPED) === D_BROKEN)
            return "broken door";
        return "doorway";
    case S_cloud:
        return Is_airlevel(u.uz) ? "cloudy area" : "fog/vapor cloud";
    case S_pool:
    case S_water: /* was Plane of Water, now that or "wall of water" */
    case S_lava:
    case S_lavawall:
    case S_ice: /* for hallucination; otherwise defsyms[] would be fine */
        return waterbody_name(x, y);
    case S_engroom:
    case S_engrcorr:
        return "engraving";
    case S_stone:
        if (!lev.seenv)
            return "unexplored";
        else if (u.uinwater && !Is_waterlevel(u.uz))
            /* "unknown" == previously mapped but not visible when
               submerged; better terminology appreciated... */
            return next2u_pg(x, y) ? "land" : "unknown";
        else if (lev.typ === STONE || lev.typ === SCORR)
            return "stone";
        return defsyms[symidx][1];
    default:
        return defsyms[symidx][1];
    }
}

function next2u_pg(x, y) {
    return Math.abs(x - game.u.ux) <= 1 && Math.abs(y - game.u.uy) <= 1;
}

// C ref: pager.c lookat() -- describe the glyph shown at <x,y>; returns
// { buf, monbuf, pm } for C's buf[], monbuf[] and return value.
// The JS display keeps the shown glyph's range (monster, object, trap,
// warning, invisible) but not always which background (cmap) glyph it is,
// so for a background spot the cmap index comes from the terrain the hero
// sees (back_to_glyph()) or remembers.
export function lookat(x, y) {
    const lev = game.level.at(x, y);
    const u = game.u;
    let buf = "", monbuf = "";
    let pm = null;
    const glyph = glyph_at(x, y);

    if (u_at(x, y) && canspotself()
        && !game.iflags.save_uswallow
        && (!game.iflags.terrainmode || (game.iflags.terrainmode & TER_MON) !== 0)) {
        /* fill in buf[] */
        buf = self_lookat();

        /* file lookup can't distinguish between "gnomish wizard" monster
           and correspondingly named player character, always picking the
           former; force it to find the general "wizard" entry instead */
        if (game.urole.mnum === PM_WIZARD && game.urace.mnum === PM_GNOME
            && !u.mtimedone)
            pm = mons[PM_WIZARD];

        /* When you see yourself normally, no explanation is appended
           (even if you could also see yourself via other means).
           Sensing self while blind or swallowed is treated as if it
           were by normal vision (cf canseeself()). */
        if ((Invisible() || u.uundetected) && !Blind()
            && !(u.uswallow || game.iflags.save_uswallow)) {
            let how = 0;

            if (Infravision())
                how |= 1;
            if (u.uprops[TELEPAT]?.extrinsic) /* Unblind_telepat */
                how |= 2;
            if (Detect_monsters())
                how |= 4;

            if (how)
                buf += ` [seen: ${(how & 1) ? "infravision" : ""}`
                    /* add comma if telep and infrav */
                    + `${((how & 3) > 2) ? ", " : ""}${(how & 2) ? "telepathy" : ""}`
                    /* add comma if detect and (infrav or telep or both) */
                    + `${((how & 7) > 4) ? ", " : ""}${(how & 4) ? "monster detection" : ""}]`;
        }
    } else if (u.uswallow) {
        /* when swallowed, we're only called for spots adjacent to hero,
           and blindness doesn't prevent hero from feeling what holds him */
        buf = `interior of ${mon_nam(u.ustuck)}`;
        pm = u.ustuck.data;
    } else if (glyph_is_monster(glyph)) {
        const mtmp = m_at(x, y);
        if (mtmp) {
            ({ buf, monbuf } = look_at_monster(mtmp, x, y, true));
            pm = mtmp.data;
        } else if (Hallucination()) {
            /* 'monster' must actually be a statue */
            buf = rndmonnam(null);
        }
    } else if (glyph_is_object(glyph)) {
        buf = look_at_object(x, y, glyph); /* fill in buf[] */
    } else if (glyph_is_trap(glyph)) {
        const tnum = glyph_to_trap(glyph, x, y);

        buf = trap_description(tnum, x, y);
    } else if (glyph_is_warning(glyph)) {
        const warnindx = chcode(glyph.ch) - chcode('0'); /* glyph_to_warning() */

        buf = def_warnsyms[warnindx].desc;
    } else if (glyph_is_invisible(glyph)) {
        buf = invisexplain; /* redundant; handled by caller */
    } else if (glyph_is_nothing(glyph)) {
        buf = "dark part of a room";
    } else if (glyph.unexplored) {
        /* glyph_is_unexplored(glyph): the glyph buffer was cleared (cls())
           and nothing has been shown here since */
        if (u.uinwater && !Is_waterlevel(u.uz))
            /* "unknown" == previously mapped but not visible when
               submerged; better terminology appreciated... */
            buf = next2u_pg(x, y) ? "land" : "unknown";
        else
            buf = "unexplored area";
    } else if (cansee(x, y)) {
        /* glyph_is_cmap(glyph): the background the hero sees */
        if (glyph.kind === 'engr')
            buf = "engraving";
        else
            buf = cmap_lookat((glyph.kind === 'cmap' && glyph.cmapidx !== undefined)
                              ? glyph.cmapidx /* glyph_to_cmap(glyph) */
                              : back_to_cmap(x, y), x, y);
    } else if (!lev.seenv && !lev.remembered_glyph) {
        /* glyph_is_unexplored(glyph) */
        if (u.uinwater && !Is_waterlevel(u.uz))
            /* "unknown" == previously mapped but not visible when
               submerged; better terminology appreciated... */
            buf = next2u_pg(x, y) ? "land" : "unknown";
        else
            buf = "unexplored area";
    } else if (glyph.kind === 'engr') {
        buf = "engraving";
    } else {
        /* what the hero remembers here (glyph_is_cmap()) */
        let idx = (glyph.cmapidx !== undefined) ? glyph.cmapidx : back_to_cmap(x, y);
        /* remembered lit floor out of sight is shown as dark room */
        if (glyph.cmapidx === undefined && idx === S_room
            && game.flags.dark_room !== false)
            idx = S_darkroom;
        buf = cmap_lookat(idx, x, y);
    }
    return { buf, monbuf, pm: (pm && !Hallucination()) ? pm : null };
}

// C ref: pager.c append_str() -- append " or "+new_str to the end of buf
// if new_str doesn't already exist as a substring of buf; returns
// [new buf, 1 if the string was appended or 0]
function append_str(buf, new_str) {
    const sep = " or ";

    if (strstri(buf, new_str) >= 0)
        return [buf, 0]; /* already present */
    if (buf.length >= BUFSZ - 1)
        return [buf, 0]; /* no space available */
    /* some space available, but not necessarily enough for full append */
    const space_left = BUFSZ - 1 - buf.length; /* space remaining in buf */
    buf += sep.slice(0, space_left);
    if (space_left > sep.length)
        buf += new_str.slice(0, space_left - sep.length);
    return [buf, 1]; /* something was appended, possibly just part of " or " */
}

/* C ref: global.h BUFSZ */
const BUFSZ = 256;

// C ref: pager.c is_swallow_sym() -- characters that could represent a
// monster's stomach
function is_swallow_sym(c) {
    for (let i = S_sw_tl; i <= S_sw_br; i++)
        if (showsyms_cmap(i) === c)
            return true;
    return false;
}

// C ref: pager.c add_cmap_descr()
// st: { found, hit_trap, firstmatch, out_str } -- 'found' is returned too
function add_cmap_descr(st, found, idx, glyph, article, cc, x_str, prefix) {
    const absidx = Math.abs(idx);

    if (glyph === null) { /* NO_GLYPH */
        /* use x_str [almost] as-is */
        if (x_str === "water") {
            /* duplicate some transformations performed by waterbody_name() */
            if (idx === S_pool)
                x_str = "pool of water";
            else if (idx === S_water)
                x_str = !Is_waterlevel(game.u.uz) ? "wall of water"
                                                  : "limitless water";
        }
        if (absidx === S_pool)
            idx = S_pool;
    } else if (absidx === S_pool || idx === S_water
               || idx === S_lava || idx === S_lavawall || idx === S_ice) {
        /* replace some descriptions (x_str) with waterbody_name() */
        const lev = game.level.at(cc.x, cc.y);
        const save_ltyp = lev.typ;
        const hr = game.u.uprops[HALLUC_RES];
        const save_prop = hr.extrinsic;
        let mbuf;

        if (absidx === S_pool) {
            lev.typ = (idx === S_pool) ? POOL : MOAT;
            idx = S_pool; /* force fake negative moat value to be positive */
        } else {
            /* we might be examining a pool location but trying to match
               water or lava; override the terrain with what we're matching
               because that's what waterbody_name() bases its result on;
               it's not pool so must be one of water/lava/ice to get here */
            lev.typ = (idx === S_water) ? WATER
                      : (idx === S_lava) ? LAVAPOOL
                        : (idx === S_lavawall) ? LAVAWALL
                          : ICE;
        }
        hr.extrinsic = 1; /* EHalluc_resistance = 1 */
        try {
            mbuf = waterbody_name(cc.x, cc.y);
        } finally {
            hr.extrinsic = save_prop;
            lev.typ = save_ltyp;
        }

        /* shorten the feedback for farlook/quicklook: "pool or ..." */
        if (mbuf === "pool of water")
            mbuf = mbuf.slice(0, 4);
        else if (mbuf === "molten lava")
            mbuf = "lava";
        x_str = mbuf;
        /* avoid "an ice" and so forth; "a pool", "a moat", and
           "a wall of ..." are grammatically correct but make
           "a pool or a moat or a wall of water" become too verbose */
        const p = x_str.indexOf(' ');
        article = !(x_str.startsWith("water")
                    || x_str.startsWith("ice")
                    || x_str.startsWith("pool")
                    || x_str.startsWith("moat")
                    || x_str.startsWith("lava")
                    || x_str.startsWith("swamp")
                    || x_str.startsWith("molten")
                    || x_str.startsWith("shallow")
                    || x_str.startsWith("limitless")
                    || x_str.startsWith("wall of lava")
                    || x_str.startsWith("wall of water")
                    /* ice while hallucinating */
                    || x_str.startsWith("frozen")
                    /* thawing ice ("solid ice", "thin ice", &c) */
                    || (p >= 0 && x_str.slice(p).toLowerCase() === " ice")
                    ) ? 1 : 0;
    }

    if (!found) {
        /* this is the first match */
        if (is_cmap_trap(idx) && idx !== S_vibrating_square) {
            st.out_str = `${prefix}a trap`;
            st.hit_trap = true;
        } else {
            st.out_str = `${prefix}${(article === 2) ? the(x_str)
                                     : (article === 1) ? an(x_str) : x_str}`;
        }
        st.firstmatch = x_str;
        found = 1;
    } else if (!(st.hit_trap && is_cmap_trap(idx))
               && !(found >= 3 && is_cmap_drawbridge(idx))
               /* don't mention vibrating square outside of Gehennom
                  unless this happens to be one (hallucination?) */
               && (idx !== S_vibrating_square || In_hell(game.u.uz)
                   || (glyph && glyph_is_trap(glyph)
                       && glyph_to_trap(glyph, cc.x, cc.y) === VIBRATING_SQUARE))) {
        /* append unless out_str already contains the string to append */
        let n;
        [st.out_str, n] = append_str(st.out_str, (article === 2) ? the(x_str)
                                                 : (article === 1) ? an(x_str)
                                                   : x_str);
        found += n;
        if (is_cmap_trap(idx) && idx !== S_vibrating_square)
            st.hit_trap = true;
    }
    return found;
}

// C ref: pager.c do_screen_description()
// returns { found, out_str, firstmatch, for_supplement }
export function do_screen_description(cc, looked, sym) {
    const mon_interior = "the interior of a monster",
        unreconnoitered = "unreconnoitered";
    const u = game.u;
    let prefix;
    let i, j, alt_i, glyph = null /* NO_GLYPH */,
        skipped_venom = 0, found = 0; /* count of matching syms found */
    let need_to_look = false;
    const submerged = (u.uinwater && !Is_waterlevel(u.uz)),
        hallucinate = (Hallucination() && !game.program_state?.gameover);
    let x_str;
    let for_supplement = null;
    /* out_str, firstmatch and hit_trap, shared with add_cmap_descr() */
    const st = { out_str: '', firstmatch: null, hit_trap: false };
    let n;

    if (looked) {
        glyph = glyph_at(cc.x, cc.y);
        /* Convert glyph at selected position to a symbol for use below. */
        sym = glyph_ttychar(glyph); /* map_glyphinfo(): glyphinfo.ttychar */
        prefix = `${encglyph(glyph)}        `;
    } else
        prefix = `${String.fromCharCode(sym)}        `;

    /*
     * Check all the possibilities, saving all explanations in a buffer.
     * When all have been checked then the string is printed.
     */

    /*
     * Handle restricted vision range (limited to adjacent spots when
     * swallowed or underwater) cases first.
     */
    x_str = null;
    if (!looked) {
        ; /* skip special handling */
    } else if (((u.uswallow || submerged) && !next2u_pg(cc.x, cc.y))
               /* detection showing some category, so mostly background */
               || (((game.iflags.terrainmode || 0) & (TER_DETECT | TER_MAP)) === TER_DETECT
                   && glyph.kind === 'cmap' && glyph.cmapidx === S_stone)) {
        x_str = unreconnoitered;
        need_to_look = false;
    } else if (is_swallow_sym(sym)) {
        x_str = mon_interior;
        need_to_look = true; /* for specific monster type */
    }
    let didlook = false;
    if (x_str) {
        /* we know 'found' is zero here, but guard against some other
           special case being inserted ahead of us someday */
        if (!found) {
            st.out_str = `${prefix}${x_str}`;
            st.firstmatch = x_str;
            found++;
        } else {
            [st.out_str, n] = append_str(st.out_str, x_str); /* not 'an(x_str)' */
            found += n;
        }
        /* for is_swallow_sym(), we want to list the current symbol's
           other possibilities (wand for '/', throne for '\\', &c) so
           don't jump to the end for the x_str==mon_interior case */
        if (x_str === unreconnoitered)
            didlook = true;
    }

    if (!didlook) {
        /* check_monsters: */
        /* Check for monsters */
        if (!game.iflags.terrainmode || (game.iflags.terrainmode & TER_MON) !== 0) {
            for (i = 1; i < MAXMCLASSES; i++) {
                if (i === S_invisible) /* avoid matching on this */
                    continue;
                if (sym === (looked ? showsyms_mon(i) : chcode(def_monsyms[i]))
                    && def_monsyms_explain[i]) {
                    need_to_look = true;
                    if (!found) {
                        st.out_str = `${prefix}${an(def_monsyms_explain[i])}`;
                        st.firstmatch = def_monsyms_explain[i];
                        found++;
                    } else {
                        [st.out_str, n] = append_str(st.out_str, an(def_monsyms_explain[i]));
                        found += n;
                    }
                }
            }
            /* handle '@' as a special case if it refers to you and you're
               playing a character which isn't normally displayed by that
               symbol; firstmatch is assumed to already be set for '@' */
            if ((looked ? (sym === showsyms_mon(S_HUMAN) && u_at(cc.x, cc.y))
                        : (sym === chcode(def_monsyms[S_HUMAN]) && !game.flags.showrace))
                && !(game.urace.mnum === PM_HUMAN || game.urace.mnum === PM_ELF)
                && !u.mtimedone) {
                [st.out_str, n] = append_str(st.out_str, "you"); /* tack on "or you" */
                found += n;
            }
        }

        /* Now check for objects */
        if (!game.iflags.terrainmode || (game.iflags.terrainmode & TER_OBJ) !== 0) {
            let oc_ptr;
            let bouldersym = (Is_rogue_level(game.u.uz)
                              ? game.ov_rogue_syms?.[SYM_BOULDER + SYM_OFF_X]
                              : game.ov_primary_syms?.[SYM_BOULDER + SYM_OFF_X]) || 0;
            if (!bouldersym)
                bouldersym = chcode(def_oc_syms[ROCK_CLASS]);

            for (i = 1; i < MAXOCLASSES; i++) {
                if ((i !== ROCK_CLASS)
                    ? (sym === (looked ? showsyms_obj(i) : chcode(def_oc_syms[i])))
                    /* ROCK_CLASS is complicated; statues are displayed as the
                       monster they depict rather than as S_rock; boulders might
                       be displayed as a custom symbol rather than as S_rock */
                    : ((glyph && glyph_is_statue(glyph)) || sym === bouldersym)) {
                    oc_ptr = def_oc_explain[i];
                    /* for added fun, engravings are shown with the same symbol
                       as S_rock which is why we want to shorten this */
                    if (i === ROCK_CLASS && oc_ptr === "boulder or statue") {
                        if (sym === bouldersym)
                            oc_ptr = "boulder"; /* discard "or statue" */
                        else if (glyph && glyph_is_statue(glyph))
                            oc_ptr = "statue"; /* discard "boulder or" */
                        else if (looked)
                            continue; /* discard both */
                    }
                    need_to_look = true;
                    if (looked && i === VENOM_CLASS) {
                        skipped_venom++;
                        continue;
                    }
                    if (!found) {
                        st.out_str = `${prefix}${an(oc_ptr)}`;
                        st.firstmatch = oc_ptr;
                        found++;
                    } else {
                        [st.out_str, n] = append_str(st.out_str, an(oc_ptr));
                        found += n;
                    }
                }
            }
        }

        if (sym === chcode(DEF_INVISIBLE)) {
            /* for active clairvoyance, use alternate "unseen creature" */
            const usealt = !!(u.uprops[DETECT_MONSTERS]?.extrinsic & I_SPECIAL);
            const unseen_explain = (usealt || Blind()) ? altinvisexplain
                                                       : invisexplain;

            if (!found) {
                st.out_str = `${prefix}${an(unseen_explain)}`;
                st.firstmatch = unseen_explain;
                found++;
            } else {
                [st.out_str, n] = append_str(st.out_str, an(unseen_explain));
                found += n;
            }
        }
        if ((glyph && glyph_is_nothing(glyph))
            || (looked && sym === showsyms_oth(SYM_NOTHING))) {
            x_str = "the dark part of a room";
            if (!found) {
                st.out_str = `${prefix}${x_str}`;
                st.firstmatch = x_str;
                found++;
            } else {
                [st.out_str, n] = append_str(st.out_str, x_str);
                found += n;
            }
        }
        if ((glyph && glyph_is_unexplored(glyph))
            || (looked && sym === showsyms_oth(SYM_UNEXPLORED))) {
            x_str = "unexplored";
            if (submerged)
                x_str = "land"; /* replace "unexplored" */
            if (!found) {
                st.out_str = `${prefix}${x_str}`;
                st.firstmatch = x_str;
                found++;
            } else {
                [st.out_str, n] = append_str(st.out_str, x_str);
                found += n;
            }
        }
        /* Now check for graphics symbols */
        for (st.hit_trap = false, i = 0; i < MAXPCHARS; i++) {
            /*
             * Index hackery:  we want
             *   "pool or moat or wall of water or lava or wall of lava"
             * rather than
             *   "pool or moat or lava or wall of lava or wall of water"
             * but S_lava comes before S_water so 'i' reaches it sooner.
             * Use 'alt_i' for the rest of the loop to behave as if their
             * places were swapped.
             */
            alt_i = (i === S_lava) ? S_water /* do water first (of these 3) */
                    : (i === S_lavawall) ? S_lava /* process lava second */
                      : (i === S_water) ? S_lavawall /* and wall of lava third */
                        : i; /* other; handle in defsyms[] order */
            x_str = defsyms[alt_i][1];
            /* cmap includes beams, shield effects, swallow boundaries, and
               explosions; skip all of those */
            if (!x_str)
                continue;

            if (sym === (looked ? showsyms_cmap(alt_i) : chcode(defsyms[alt_i][0]))) {
                let article; /* article==2 => "the", 1 => "an", 0 => (none) */

                /* check if dark part of a room was already included above */
                if (alt_i === S_darkroom && glyph && glyph_is_nothing(glyph))
                    continue;

                /* avoid "an unexplored", "an stone", "an air",
                   "a floor of a room", "a dark part of a room" */
                article = (strstri(x_str, " of a room") >= 0) ? 2
                          : !(alt_i === S_stone
                              || x_str === "air"
                              || x_str === "land") ? 1 : 0;

                found = add_cmap_descr(st, found, alt_i, glyph, article,
                                       cc, x_str, prefix);
                if (alt_i === S_pool) {
                    /* "pool of water" and "moat" use the same symbol and glyph
                       but have different descriptions; when handling pool, add
                       it a second time for moat but pass an alternate symbol;
                       skip incrementing 'found' to avoid "can be many things" */
                    add_cmap_descr(st, found, -S_pool, glyph, 1,
                                   cc, "moat", prefix);
                    need_to_look = true;
                }

                if (alt_i === S_altar || is_cmap_trap(alt_i)
                    || (hallucinate && (alt_i === S_water /* S_pool already done */
                                        || alt_i === S_lava
                                        || alt_i === S_lavawall
                                        || alt_i === S_ice))
                    || alt_i === S_engroom || alt_i === S_engrcorr
                    || alt_i === S_grave) /* 'need_to_look' to report engraving */
                    need_to_look = true;
            }
        }

        /* Now check for warning symbols */
        for (i = 1; i < WARNCOUNT; i++) {
            x_str = def_warnsyms[i].desc;
            if (sym === (looked ? warnsyms(i) : chcode(def_warnsyms[i].ch))) {
                if (!found) {
                    st.out_str = `${prefix}${x_str}`;
                    st.firstmatch = x_str;
                    found++;
                } else {
                    [st.out_str, n] = append_str(st.out_str, x_str);
                    found += n;
                }
                /* Kludge: warning trumps boulders on the display.
                   Reveal the boulder too or player can get confused */
                if (looked && sobj_at(BOULDER, cc.x, cc.y))
                    st.out_str += " co-located with a boulder";
                break; /* out of for loop*/
            }
        }

        /* if we ignored venom and list turned out to be short, put it back */
        if (skipped_venom && found < 2) {
            x_str = def_oc_explain[VENOM_CLASS];
            if (!found) {
                st.out_str = `${prefix}${an(x_str)}`;
                st.firstmatch = x_str;
                found++;
            } else {
                [st.out_str, n] = append_str(st.out_str, an(x_str));
                found += n;
            }
        }

        /* Finally, handle some optional overriding symbols: none are set
           (go.ov_primary_syms[SYM_OFF_X ..] are all 0) */

        /*
         * If we are looking at the screen, follow multiple possibilities or
         * an ambiguous explanation by something more detailed.
         */

        if (found > 4)
            /* 3.6.3: this used to be "That can be many things" (without prefix)
               which turned it into a sentence that lacked its terminating period;
               we could add one below but reinstating the prefix here is better */
            st.out_str = `${prefix}can be many things`;
    }

    /* didlook: */
    if (looked) {
        if (found > 1 || need_to_look) {
            const { buf, monbuf, pm } = lookat(cc.x, cc.y);
            let look_buf = buf;
            if (pm)
                for_supplement = pm;
            if (look_buf === "ice")
                look_buf = ice_descr(cc.x, cc.y); /* (void) ice_descr(cc.x, cc.y, look_buf) */
            if (look_buf === "staircase down"
                && Is_qstart(u.uz) /* on_level(&u.uz, &qstart_level) */ && !ok_to_quest())
                look_buf = "blocked staircase down";

            if (look_buf)
                st.firstmatch = look_buf;
            if (st.firstmatch) {
                let temp_buf = ` (${st.firstmatch}`;
                temp_buf = add_quoted_engraving(cc.x, cc.y, temp_buf, false);
                temp_buf += ")";
                st.out_str = (st.out_str + temp_buf).slice(0, BUFSZ - 1);
                found = 1; /* we have something to look up */
            }
            if (monbuf) {
                const temp_buf = ` [seen: ${monbuf}]`.slice(0, BUFSZ - 1);
                st.out_str = (st.out_str + temp_buf).slice(0, BUFSZ - 1);
            }
        }
    }

    return { found, out_str: st.out_str, firstmatch: st.firstmatch, for_supplement };
}

// C ref: pager.c add_quoted_engraving() -- returns the (maybe extended) buf
/* when farlook is reporting on an engraving, include its text */
function add_quoted_engraving(x, y, buf, force /* True: '/e' or '/E', False: '//' or ';' */) {
    const ep = engr_at(x, y);
    const floorengr = (buf === " (engraving"),
        headstone = (buf === " (grave");
    let temp_buf;

    /*
     * If there is no engraving here, there's nothing to do; just return.
     *
     * When buf[] is " (engraving" or " (grave" then we're looking at an
     * engraving and we'll add its text.  Caller supplies the closing paren.
     *
     * If buf[] contains anything else, we're looking at something (monster
     * or object) that happens to be on top of an engraving, so we won't
     * append the engraving text.
     */
    if (!ep)
        return buf;

    if (!floorengr && !headstone && !force)
        return buf;

    if (ep.eread)
        temp_buf = ` with ${headstone ? "headstone reading" : "remembered text"}: "${ep.engr_txt.remembered_text}"`;
    else
        temp_buf = ` ${headstone ? "whose headstone" : "that"} you haven't read`;

    return (buf + temp_buf.slice(0, BUFSZ - 1)).slice(0, BUFSZ - 1);
}

// C ref: pager.c docontact()
async function docontact() {
    const cwin = tty_create_nhwindow(NHW_TEXT);
    const sysopt = game.sysopt || {};
    let buf;

    if (sysopt.support) {
        /*XXX overflow possibilities*/
        buf = `To contact local support, ${sysopt.support}`;
        await tty_putstr(cwin, 0, buf);
        await tty_putstr(cwin, 0, "");
    } else if (sysopt.fmtd_wizard_list) { /* formatted SYSCF WIZARDS */
        buf = `To contact local support, contact ${sysopt.fmtd_wizard_list}.`;
        await tty_putstr(cwin, 0, buf);
        await tty_putstr(cwin, 0, "");
    }
    await tty_putstr(cwin, 0, "To contact the NetHack development team directly,");
    /*XXX overflow possibilities*/
    buf = `see the 'Contact' form on our website or email <${DEVTEAM_EMAIL}>.`;
    await tty_putstr(cwin, 0, buf);
    await tty_putstr(cwin, 0, "");
    await tty_putstr(cwin, 0, "For more information on NetHack, or to report a bug,");
    buf = `visit our website "${DEVTEAM_URL}".`;
    await tty_putstr(cwin, 0, buf);
    await tty_display_nhwindow(cwin, false);
    await tty_destroy_nhwindow(cwin);
}
const DEVTEAM_EMAIL = "devteam@nethack.org"; /* hack.h */
const DEVTEAM_URL = "https://www.nethack.org/";

/* help menu choices that aren't ported yet */
// C ref: pager.c domenucontrols()
async function domenucontrols() {
    const cwin = tty_create_nhwindow(NHW_TEXT);

    await show_menu_controls(cwin, false);
    await tty_display_nhwindow(cwin, false);
    await tty_destroy_nhwindow(cwin);
}

/* C ref: options.c get_menu_cmd_key() -- no menu command remapping is
   configured, so each menu command is its own key */
function get_menu_cmd_key(ch) { return ch.charCodeAt(0); }

/* C sprintf() field helpers for show_menu_controls()'s formats */
function padl(s, w) { return s.length >= w ? s : ' '.repeat(w - s.length) + s; }
export function padr(s, w) { return s.length >= w ? s : s + ' '.repeat(w - s.length); }

// C ref: options.c default_menu_cmd_info[] (the menu_shift_right/_left
// entries are marked 'shift': tty doesn't offer WC2_MENU_SHIFT)
const default_menu_cmd_info = [
    { cmd: MENU_NEXT_PAGE,     desc: "Go to next page" },
    { cmd: MENU_PREVIOUS_PAGE, desc: "Go to previous page" },
    { cmd: MENU_FIRST_PAGE,    desc: "Go to first page" },
    { cmd: MENU_LAST_PAGE,     desc: "Go to last page" },
    { cmd: MENU_SELECT_ALL,    desc: "Select all items in entire menu" },
    { cmd: MENU_INVERT_ALL,    desc: "Invert selection for all items" },
    { cmd: MENU_UNSELECT_ALL,  desc: "Unselect all items in entire menu" },
    { cmd: MENU_SELECT_PAGE,   desc: "Select all items on current page" },
    { cmd: MENU_INVERT_PAGE,   desc: "Invert current page's selections" },
    { cmd: MENU_UNSELECT_PAGE, desc: "Unselect all items on current page" },
    { cmd: MENU_SEARCH,        desc: "Search and invert matching items" },
    { cmd: '>', shift: true,   desc: "Pan current page to right (perm_invent only)" },
    { cmd: '<', shift: true,   desc: "Pan current page to left (perm_invent only)" },
];

// C ref: options.c show_menu_controls()
export async function show_menu_controls(win, dolist) {
    const hardcoded = [
        { key: "Return", desc: "Accept current choice(s) and dismiss menu" },
        { key: "Enter",  desc: "Same as Return" },
        { key: "Space",  desc: "If not on last page, advance one page;" },
        { key: "     ",  desc: "when on last page, treat like Return" },
        { key: "Escape", desc: "Cancel menu without making any choice(s)" },
    ];
    /* mc_fmt "%8s     %-6s %s", mc_altfmt "%9s  %-6s %s" */
    const mc_fmt = (a, b, c) => `${padl(a, 8)}     ${padr(b, 6)} ${c}`;
    const mc_altfmt = (a, b, c) => `${padl(a, 9)}  ${padr(b, 6)} ${c}`;
    /* wc2_supported("menu_shift"): tty doesn't offer WC2_MENU_SHIFT */
    const has_menu_shift = false;
    let fmt, arg;

    /*
     * Relies on spaces to line things up in columns, so must be rendered
     * with a fixed-width font or will look dreadful.
     */
    await tty_putstr(win, 0, "Menu control keys:");
    if (dolist) { /* key bindings help: '?i' */
        /* fmt "%-7s %s" */
        for (const mci of default_menu_cmd_info) {
            if (mci.shift && !has_menu_shift)
                continue;
            await tty_putstr(win, 0, `${padr(visctrl(get_menu_cmd_key(mci.cmd)), 7)} ${
                mci.desc}`);
        }
        /* no separator before hardcoded */
        /* fmt "%s%-7s %s": extra specifier to absorb 'arg' */
        fmt = (a, b, c) => `${a}${padr(b, 7)} ${c}`;
        arg = ""; /* no extra prefix for 'dolist' */
    } else { /* menu controls help: '?k' */
        await tty_putstr(win, 0, "");
        await tty_putstr(win, 0, mc_altfmt("", "Whole", "Current"));
        await tty_putstr(win, 0, mc_altfmt("", " Menu", " Page"));
        await tty_putstr(win, 0, mc_fmt("Select",
                                        visctrl(get_menu_cmd_key(MENU_SELECT_ALL)),
                                        visctrl(get_menu_cmd_key(MENU_SELECT_PAGE))));
        await tty_putstr(win, 0, mc_fmt("Invert",
                                        visctrl(get_menu_cmd_key(MENU_INVERT_ALL)),
                                        visctrl(get_menu_cmd_key(MENU_INVERT_PAGE))));
        await tty_putstr(win, 0, mc_fmt("Deselect",
                                        visctrl(get_menu_cmd_key(MENU_UNSELECT_ALL)),
                                        visctrl(get_menu_cmd_key(MENU_UNSELECT_PAGE))));
        await tty_putstr(win, 0, "");
        await tty_putstr(win, 0, mc_fmt("Go to",
                                        visctrl(get_menu_cmd_key(MENU_NEXT_PAGE)),
                                        "Next page"));
        await tty_putstr(win, 0, mc_fmt("",
                                        visctrl(get_menu_cmd_key(MENU_PREVIOUS_PAGE)),
                                        "Previous page"));
        await tty_putstr(win, 0, mc_fmt("",
                                        visctrl(get_menu_cmd_key(MENU_FIRST_PAGE)),
                                        "First page"));
        await tty_putstr(win, 0, mc_fmt("",
                                        visctrl(get_menu_cmd_key(MENU_LAST_PAGE)),
                                        "Last page"));
        if (has_menu_shift)
            throw new Error('show_menu_controls(): menu_shift lines not ported yet');
        await tty_putstr(win, 0, "");
        await tty_putstr(win, 0, mc_fmt("Search",
                                        visctrl(get_menu_cmd_key(MENU_SEARCH)),
                                        "Exter a target string and invert all matching entries"));
        /* separator before hardcoded */
        await tty_putstr(win, 0, "");
        /* fmt "%9s  %-8s %s" */
        fmt = (a, b, c) => `${padl(a, 9)}  ${padr(b, 8)} ${c}`;
        arg = "Other "; /* prefix for first hardcoded[] entry, then reset */
    }
    for (const xcp of hardcoded) {
        await tty_putstr(win, 0, fmt(arg, xcp.key, xcp.desc));
        arg = "";
    }
}

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
        const f = help_menu_items[sel].f;
        if (f === 'hmenu_dowhatis')
            await hmenu_dowhatis();
        else if (f === 'hmenu_doextversion')
            await hmenu_doextversion();
        else if (f === 'dispfile_help')
            await dispfile_help();
        else if (f === 'dispfile_shelp')
            await dispfile_shelp();
        else if (f === 'hmenu_dohistory')
            await hmenu_dohistory();
        else if (f === 'hmenu_dowhatdoes')
            await hmenu_dowhatdoes();
        else if (f === 'dispfile_optionfile')
            await dispfile_optionfile();
        else if (f === 'dispfile_optmenu')
            await dispfile_optmenu();
        else if (f === 'dispfile_license')
            await dispfile_license();
        else if (f === 'dispfile_debughelp')
            await dispfile_debughelp();
        else if (f === 'dispfile_usagehelp')
            await dispfile_usagehelp();
        else if (f === 'docontact')
            await docontact();
        else if (f === 'dokeylist')
            await dokeylist();
        else if (f === 'option_help')
            await option_help_pg();
        else if (f === 'domenucontrols')
            await domenucontrols();
        else
            hmenu_not_ported(f)();
    }
    return ECMD_OK;
}

/* C ref: lookat.h LOOK_* -- getpos() results for the [.,;:] picks */
const LOOK_QUICK = 1, LOOK_ONCE = 2, LOOK_VERBOSE = 3;

/* C ref: pager.c enum checkfileflags */
const chkfilNone = 0, chkfilUsrTyped = 1, chkfilDontAsk = 2, chkfilIaCheck = 4;

// C ref: strutil.c pmatch() -- case-sensitive wildcard match
export function pmatch(patrn, strng) {
    let pi = 0, si = 0;
    for (;;) { /* pmatch_top: */
        const s = strng[si++] || '';
        const p = patrn[pi++] || '';
        if (!p) /* end of pattern */
            return s === '';
        else if (p === '*') /* wildcard reached */
            return (pi >= patrn.length
                    || pmatch(patrn.slice(pi), strng.slice(si - 1)))
                ? true
                : s ? pmatch(patrn.slice(pi - 1), strng.slice(si)) : false;
        else if (p !== s && (p !== '?' || !s))
            return false;
    }
}

// C ref: pager.c ia_checkfile()
export async function ia_checkfile(otmp) {
    /* singular() of xname() of otmp is what "/i" looks up */
    const itemnam = singular(otmp, xname);
    return await checkfile(itemnam, null, chkfilIaCheck | chkfilDontAsk, null);
}

// C ref: pager.c checkfile() -- look in the "data" file (data.base, here
// the generated data_base.js) for more info. Called if the user typed in
// the whole name (user_typed_name), or we've found a possible match with a
// character/glyph and flags.help is TRUE. Returns True if an entry is found.
// 'supp' is { name } for C's supplemental_name[], or null.
export async function checkfile(inp, pm, chkflags, supp) {
    const user_typed_name = (chkflags & chkfilUsrTyped) !== 0,
        without_asking = (chkflags & chkfilDontAsk) !== 0,
        ia_checking = (chkflags & chkfilIaCheck) !== 0;
    let datawin = null;
    let res = false;
    let dbase_str, ep, ap, sp;

    /* If someone passed us garbage, prevent fault. */
    if (!inp || inp.length > (BUFSZ - 1))
        throw new Error(`impossible: bad do_look buffer passed (${!inp ? "null" : "too long"})!`);

    /* To prevent the need for entries in data.base like *ngel to account
     * for Angel and angel, make the lookup string the same for both
     * user_typed_name and picked name.
     */
    if (pm && !user_typed_name)
        dbase_str = pm.pmnames[2 /* NEUTRAL */];
    else
        dbase_str = inp;
    dbase_str = dbase_str.toLowerCase(); /* lcase() */

    if (dbase_str.startsWith("interior of "))
        dbase_str = dbase_str.slice(12);
    if (dbase_str.startsWith("a "))
        dbase_str = dbase_str.slice(2);
    else if (dbase_str.startsWith("an "))
        dbase_str = dbase_str.slice(3);
    else if (dbase_str.startsWith("the "))
        dbase_str = dbase_str.slice(4);
    else if (dbase_str.startsWith("some "))
        dbase_str = dbase_str.slice(5);
    else if (/^[0-9]/.test(dbase_str)) {
        /* remove count prefix ("2 ya") which can come from looking at map */
        dbase_str = dbase_str.replace(/^[0-9]+/, '');
        if (dbase_str[0] === ' ')
            dbase_str = dbase_str.slice(1);
    }
    if (dbase_str.startsWith("pair of "))
        dbase_str = dbase_str.slice(8);
    if (dbase_str.startsWith("tame "))
        dbase_str = dbase_str.slice(5);
    else if (dbase_str.startsWith("peaceful "))
        dbase_str = dbase_str.slice(9);
    if (dbase_str.startsWith("invisible "))
        dbase_str = dbase_str.slice(10);
    if (dbase_str.startsWith("saddled "))
        dbase_str = dbase_str.slice(8);
    if (dbase_str.startsWith("blessed "))
        dbase_str = dbase_str.slice(8);
    else if (dbase_str.startsWith("uncursed "))
        dbase_str = dbase_str.slice(9);
    else if (dbase_str.startsWith("cursed "))
        dbase_str = dbase_str.slice(7);
    if (dbase_str.startsWith("empty "))
        dbase_str = dbase_str.slice(6);
    if (dbase_str.startsWith("partly used "))
        dbase_str = dbase_str.slice(12);
    else if (dbase_str.startsWith("partly eaten "))
        dbase_str = dbase_str.slice(13);
    if (dbase_str.startsWith("statue of "))
        dbase_str = dbase_str.slice(0, 6);
    else if (dbase_str.startsWith("figurine of "))
        dbase_str = dbase_str.slice(0, 8);
    /* remove enchantment ("+0 aklys"); [for 3.6.0 and earlier, this wasn't
       needed because looking at items on the map used xname() rather than
       doname() hence known enchantment was implicitly suppressed] */
    if (dbase_str && "+-".includes(dbase_str[0]) && /[0-9]/.test(dbase_str[1] || '')) {
        dbase_str = dbase_str.slice(1).replace(/^[0-9]+/, ''); /* skip sign */
        if (dbase_str[0] === ' ')
            dbase_str = dbase_str.slice(1);
    }
    /* "towel", "wet towel", and "moist towel" share one data.base entry;
       for "wet towel", we keep prefix so that the prompt will ask about
       "wet towel"; for "moist towel", we also want to ask about "wet towel" */
    if (dbase_str.startsWith("moist towel"))
        dbase_str = "wet" + dbase_str.slice(5); /* skip "mo" replace "ist" */

    /* Make sure the name is non-empty. */
    if (dbase_str) {
        let pass1offset = -1;
        let pass1found_in_file;
        let alt = null; /* alternate description */

        /* adjust the input to remove "named " and "called " */
        if ((ep = dbase_str.indexOf(" named ")) >= 0) {
            alt = dbase_str.slice(ep + 7);
            if ((ap = dbase_str.indexOf(" called ")) >= 0 && ap < ep)
                ep = ap; /* "named" is alt but truncate at "called" */
        } else if ((ep = dbase_str.indexOf(" called ")) >= 0) {
            alt = dbase_str.slice(ep + 8, ep + 8 + BUFSZ - 1); /* givenname */
            if (supp && (sp = strstri_idx(inp, " called ")) >= 0)
                supp.name = inp.slice(sp + 8, sp + 8 + BUFSZ - 1);
        } else
            ep = dbase_str.indexOf(", ");
        if (ep > 0)
            dbase_str = dbase_str.slice(0, ep);
        /* remove article from 'alt' name ("a pair of lenses named
           The Eyes of the Overworld" simplified above to "lenses named
           The Eyes of the Overworld", now reduced to "The Eyes of the
           Overworld", skip "The" as with base name processing) */
        if (alt && (/^a /i.test(alt) || /^an /i.test(alt) || /^the /i.test(alt)))
            alt = alt.slice(alt.indexOf(' ') + 1);
        /* remove charges or "(lit)" or wizmode "(N aum)" */
        if ((ep = dbase_str.indexOf(" (")) > 0)
            dbase_str = dbase_str.slice(0, ep);
        if (alt && (ap = alt.indexOf(" (")) > 0)
            alt = alt.slice(0, ap);

        /* If the object's name matches the player-specified fruitname,
           then "fruit" is the alternate description. We do this here so that
           if the fruit name is an extant object, looking at the fruit yields
           that object's description. */
        if (!alt && fruit_from_name(dbase_str, true, null))
            alt = obj_descr[SLIME_MOLD].oc_name;
        /*
         * If the object is named, then the name is the alternate description;
         * otherwise, the result of makesingular() applied to the name is.
         */
        else if (!alt)
            alt = makesingular(dbase_str);

        pass1found_in_file = false;
        for (let pass = (alt === dbase_str) ? 0 : 1; pass >= 0; --pass) {
            let found_in_file = false, skipping_entry = false;
            let entry_idx = -1;

            /* look for the appropriate entry */
            for (let e = 0; e < data_base.length && !found_in_file; e++) {
                /* a number indicates the end of current entry */
                skipping_entry = false;
                for (const key of data_base[e].keys) {
                    if (skipping_entry)
                        break;
                    /* if we match a key that begins with "~", skip
                       this entry */
                    const chk_skip = (key[0] === '~') ? 1 : 0;
                    if ((pass === 0 && pmatch(key.slice(chk_skip), dbase_str))
                        || (pass === 1 && alt && pmatch(key.slice(chk_skip), alt))) {
                        if (chk_skip) {
                            skipping_entry = true;
                            continue;
                        } else {
                            found_in_file = true;
                            if (pass === 1)
                                pass1found_in_file = true;
                            entry_idx = e;
                            break;
                        }
                    }
                }
            }
            if (found_in_file) {
                /* the entry's text is at data_base[entry_idx] (its offset
                   in the "data" file) */
                const fseekoffset = entry_idx;
                const entry = data_base[entry_idx];
                if (pass === 1)
                    pass1offset = fseekoffset;
                else if (fseekoffset === pass1offset)
                    break; /* goto checkfile_done */

                let yes_to_moreinfo = false;
                if (!user_typed_name && !without_asking) {
                    const entrytext = pass ? alt : dbase_str;
                    let question = "More info about \"";
                    /* +2 => length of "\"?" */
                    question += entrytext.slice(0, Math.max(0, 128 /* QBUFSZ */ - 1
                                                    - (question.length + 2)));
                    question += "\"?";
                    if (await tty_yn_function(question, "yn", 'n') === 'y') /* y_n() */
                        yes_to_moreinfo = true;
                }

                if (user_typed_name || without_asking || yes_to_moreinfo) {
                    res = true;
                    if (ia_checking)
                        break; /* goto checkfile_done */

                    datawin = tty_create_nhwindow(NHW_MENU);
                    for (let i = 0; i < entry.text.length; i++) {
                        let tp = entry.text[i];
                        /* text in this file is indented with one tab but
                           someone modifying it might use spaces instead */
                        if (tp[0] === '\t') {
                            tp = tp.slice(1);
                        } else if (tp[0] === ' ') {
                            /* remove up to 8 spaces (we expect 8-column
                               tab stops but user might have them set at
                               something else so we don't require it) */
                            let k = 0;
                            do {
                                ++k;
                            } while (k < 8 && tp[k] === ' ');
                            tp = tp.slice(k);
                        } else if (tp) { /* empty lines are ok */
                            throw new Error("impossible: 'data' file in wrong format or corrupted");
                        }
                        /* if a tab after the leading one is found,
                           convert tabs into spaces; the attributions
                           at the end of quotes typically have them */
                        if (tp.includes('\t'))
                            tp = tabexpand(tp);
                        await tty_putstr(datawin, 0, tp);
                    }
                    await tty_display_nhwindow(datawin, false);
                    await tty_destroy_nhwindow(datawin);
                    datawin = null;
                }
            } else if (user_typed_name && pass === 0 && !pass1found_in_file) {
                await pline("You don't have any information on those things.");
            }
        }
    }
    /* checkfile_done: */
    if (datawin !== null)
        await tty_destroy_nhwindow(datawin);
    return res;
}

/* the index of the first case-insensitive match of 'sub' in 'str', or -1
   (strstri() returning a pointer) */
function strstri_idx(str, sub) {
    return str.toLowerCase().indexOf(sub.toLowerCase());
}

/* C ref: pager.c suptext1[], suptext2[] */
const suptext1 = [
    "%s is a member of a marauding horde of orcs",
    "rumored to have brutally attacked and plundered",
    "the ordinarily sheltered town that is located ",
    "deep within The Gnomish Mines.",
    "",
    "The members of that vicious horde proudly and ",
    "defiantly acclaim their allegiance to their",
    "leader %s in their names.",
];
const suptext2 = [
    "\"%s\" is the common dungeon name of",
    "a nefarious orc who is known to acquire property",
    "from thieves and sell it off for profit.",
    "",
    "The perpetrator was last seen hanging around the",
    "stairs leading to the Gnomish Mines.",
];

// C ref: pager.c do_supplemental_info()
async function do_supplemental_info(name, pm, without_asking) {
    const entrytext = name;
    let yes_to_moreinfo = false;
    const is_marauder = is_orc(pm);

    /*
     * Provide some info on some specific things
     * meant to support in-game mythology, and not
     * available from data.base or other sources.
     */
    if (is_marauder && name.length < (BUFSZ - 1)) {
        const bp = strstri_idx(name, " of ");
        const bp2 = strstri_idx(name, " the Fence");

        if (bp >= 0 || bp2 >= 0) {
            const fullname = name;
            if (!without_asking) {
                let question = "More info about \"";
                /* +2 => length of "\"?" */
                question += entrytext.slice(0, Math.max(0, 128 /* QBUFSZ */ - 1
                                                - (question.length + 2)));
                question += "\"?";
                if (await tty_yn_function(question, "yn", 'n') === 'y') /* y_n() */
                    yes_to_moreinfo = true;
            }
            if (yes_to_moreinfo) {
                let subs = 0;
                let textp, gang;

                if (bp >= 0) {
                    textp = suptext1;
                    gang = name.slice(bp + 4);
                } else {
                    textp = suptext2;
                    gang = "";
                }
                const datawin = tty_create_nhwindow(NHW_MENU);
                for (let i = 0; i < textp.length; i++) {
                    let txt;

                    if (textp[i].includes("%s"))
                        txt = textp[i].replace("%s", subs++ ? gang : fullname);
                    else
                        txt = textp[i];
                    await tty_putstr(datawin, 0, txt);
                }
                await tty_display_nhwindow(datawin, false);
                await tty_destroy_nhwindow(datawin);
            }
        }
    }
}

/* C ref: pager.c what_is_a_location[] */
const what_is_a_location = "a monster, object or location";

// C ref: windows.h putmixed()
async function putmixed(window, attr, str) {
    await tty_putmixed(window, attr, str);
}

// C ref: getpos.c coord_desc()
export function coord_desc(x, y, cmode) {
    switch (cmode) {
    default:
        return "";
    case GPCOORDS_COMFULL:
    case GPCOORDS_COMPASS: {
        /* "east", "3s", "2n,4w" */
        const dx = x - game.u.ux;
        const dy = y - game.u.uy;
        return `(${dxdy_to_dist_descr(dx, dy, cmode === GPCOORDS_COMFULL)})`;
    }
    case GPCOORDS_MAP: /* x,y */
        /* upper left corner of map is <1,0>;
           with default COLNO,ROWNO lower right corner is <79,20> */
        return `<${x},${y}>`;
    case GPCOORDS_SCREEN: /* y+2,x */
        /* map line 0 is screen row 2;
           map column 0 isn't used, map column 1 is screen column 1 */
        return `[${String(y + 2).padStart(2, '0')},${String(x).padStart(2, '0')}]`;
    }
}

/* C ref: pager.c "%8s  " / "%12s  " / "%s  " prefix of look_all() &c */
function coord_prefix(cmode, coordbuf) {
    return (cmode === GPCOORDS_SCREEN) ? `${coordbuf}  `
         : (cmode === GPCOORDS_MAP) ? `${coordbuf.padStart(8)}  `
           : `${coordbuf.padStart(12)}  `;
}

// C ref: pager.c look_region_nearby()
function look_region_nearby(nearby) {
    const u = game.u;
    return {
        lo_y: nearby ? Math.max(u.uy - BOLT_LIM, 0) : 0,
        lo_x: nearby ? Math.max(u.ux - BOLT_LIM, 1) : 1,
        hi_y: nearby ? Math.min(u.uy + BOLT_LIM, ROWNO - 1) : ROWNO - 1,
        hi_x: nearby ? Math.min(u.ux + BOLT_LIM, COLNO - 1) : COLNO - 1,
    };
}

/* iflags.getpos_coords, GPCOORDS_MAP when it's GPCOORDS_NONE */
function look_cmode() {
    const gc = game.iflags.getpos_coords;
    return (gc && gc !== GPCOORDS_NONE) ? gc : GPCOORDS_MAP;
}

// C ref: pager.c look_all()
async function look_all(nearby, /* True => within BOLTLIM, False => entire map */
                        do_mons) /* True => monsters, False => objects */ {
    let count = 0;
    const { lo_x, lo_y, hi_x, hi_y } = look_region_nearby(nearby);

    const win = tty_create_nhwindow(NHW_TEXT);
    for (let y = lo_y; y <= hi_y; y++) {
        for (let x = lo_x; x <= hi_x; x++) {
            let lookbuf = "";
            const glyph = glyph_at(x, y);
            if (do_mons) {
                if (glyph_is_monster(glyph)) {
                    let mtmp;

                    if (u_at(x, y) && canspotself()) {
                        lookbuf = self_lookat();
                        ++count;
                    } else if ((mtmp = m_at(x, y)) !== null) {
                        lookbuf = look_at_monster(mtmp, x, y, false).buf;
                        ++count;
                    }
                } else if (glyph_is_invisible(glyph)) {
                    /* remembered, unseen, creature */
                    lookbuf = invisexplain;
                    ++count;
                } else if (glyph_is_warning(glyph)) {
                    const warnindx = chcode(glyph.ch) - chcode('0');

                    lookbuf = def_warnsyms[warnindx].desc;
                    ++count;
                }
            } else { /* !do_mons */
                if (glyph_is_object(glyph)) {
                    lookbuf = look_at_object(x, y, glyph);
                    ++count;
                }
            }
            if (lookbuf) {
                const cmode = look_cmode();
                let outbuf;

                if (count === 1) {
                    const which = do_mons ? "monsters" : "objects";
                    if (nearby)
                        outbuf = `${upstart(which)} currently shown near ${
                            (cmode !== GPCOORDS_COMPASS)
                            ? coord_desc(game.u.ux, game.u.uy, cmode)
                            : !canspotself() ? "your position" : "you"}:`;
                    else
                        outbuf = `All ${which} currently shown on the map:`;
                    await tty_putstr(win, 0, outbuf);
                    /* hack alert! Qt watches a text window for any line
                       with 4 consecutive spaces and renders the window
                       in a fixed-width font it if finds at least one */
                    await tty_putstr(win, 0, "    "); /* separator */
                }
                let coordbuf = coord_desc(x, y, cmode);
                /* this format wrinkle makes the commas of <x,y> line up */
                if (cmode === GPCOORDS_MAP && y < 10)
                    coordbuf += ' '; /* strkitten() */
                /* prefix: "coords  C  " where 'C' is mon or obj symbol */
                outbuf = coord_prefix(cmode, coordbuf);
                outbuf += `${encglyph(glyph)}  `;
                /* guard against potential overflow */
                lookbuf = lookbuf.slice(0, Math.max(0, BUFSZ - 1 - outbuf.length));
                outbuf += lookbuf;
                await putmixed(win, 0, outbuf);
            }
        }
    }
    if (count)
        await tty_display_nhwindow(win, true);
    else
        await pline(`No ${do_mons ? "monsters" : "objects"} are currently shown ${
            nearby ? "nearby" : "on the map"}.`);
    await tty_destroy_nhwindow(win);
}

// C ref: pager.c look_traps() -- give a /M style display of discovered
// traps, even when they're covered
async function look_traps(nearby) {
    let count = 0;
    const { lo_x, lo_y, hi_x, hi_y } = look_region_nearby(nearby);

    const win = tty_create_nhwindow(NHW_TEXT);
    for (let y = lo_y; y <= hi_y; y++) {
        for (let x = lo_x; x <= hi_x; x++) {
            let lookbuf = "";
            let glyph = glyph_at(x, y);
            let t;
            if (glyph_is_trap(glyph)) {
                const tnum = glyph_to_trap(glyph, x, y);
                lookbuf = trap_description(tnum, x, y);
                ++count;
            } else if ((t = t_at(x, y)) !== null && t.tseen
                       /* can't use /" to track traps moved by bubbles or
                          clouds except when hero has direct line of sight */
                       && ((!Is_waterlevel(game.u.uz) && !Is_airlevel(game.u.uz))
                           || couldsee(x, y))) {
                lookbuf = trapname(t.ttyp, false);
                lookbuf += `, obscured by ${encglyph(glyph)}`;
                glyph = trap_to_glyph(t);
                ++count;
            }
            if (lookbuf) {
                const cmode = look_cmode();
                let outbuf;

                if (count === 1) {
                    outbuf = `${nearby ? "nearby " : ""}seen or remembered traps${
                        nearby ? "" : " on this level"}:`;
                    await tty_putstr(win, 0, upstart(outbuf));
                    /* hack alert! Qt watches a text window for any line
                       with 4 consecutive spaces */
                    await tty_putstr(win, 0, "    "); /* separator */
                }
                /* prefix: "coords  C  " where 'C' is trap symbol */
                outbuf = coord_prefix(cmode, coord_desc(x, y, cmode));
                outbuf += `${encglyph(glyph)}  `;
                /* guard against potential overflow */
                lookbuf = lookbuf.slice(0, Math.max(0, BUFSZ - 1 - outbuf.length));
                outbuf += lookbuf;
                await putmixed(win, 0, outbuf);
            }
        }
    }
    if (count)
        await tty_display_nhwindow(win, true);
    else
        await pline(`No traps seen or remembered${nearby ? " nearby" : ""}.`);
    await tty_destroy_nhwindow(win);
}

// C ref: pager.c look_engrs() -- display of discovered engravings including
// headstones, even when they're covered provided they've been read
async function look_engrs(nearby) {
    let count = 0;
    const { lo_x, lo_y, hi_x, hi_y } = look_region_nearby(nearby);

    const win = tty_create_nhwindow(NHW_TEXT);
    for (let y = lo_y; y <= hi_y; y++) {
        for (let x = lo_x; x <= hi_x; x++) {
            let lookbuf;
            if (!game.level.at(x, y).seenv)
                continue;
            /* this won't find remembered engravings which aren't there
               anymore (in case the hero is unaware that they're gone;
               scuffed away by monster movement or deleted during shop
               or vault wall repair); not sure what to do about that */
            const e = engr_at(x, y);
            if (!e)
                continue;
            const lastseentyp = game.level.lastseentyp?.[x]?.[y] ?? 0;
            const is_headstone = IS_GRAVE(lastseentyp);
            lookbuf = ` (${is_headstone ? "grave" : "engraving"}`;
            lookbuf = add_quoted_engraving(x, y, lookbuf, true);
            /* the paren is used by farlook and add_quoted_engraving()
               expected to see it; we don't want it here */
            if (is_headstone) {
                lookbuf = lookbuf.replace("(grave with ", "");
                lookbuf = lookbuf.replace("(grave whose ", "");
            } else {
                lookbuf = lookbuf.replace("(engraving with ", "");
                lookbuf = lookbuf.replace("(engraving ", "engraving ");
            }

            let glyph = glyph_at(x, y);
            if (glyph.kind === 'engr'
                || (glyph.kind === 'cmap' && glyph.cmapidx === S_grave)) {
                /* engraving or grave+headstone shown on the map */
                ++count;
            } else {
                /* engraving or grave covered by object(s) */
                lookbuf += `, obscured by ${encglyph(glyph)}`;
                glyph = is_headstone ? cmap_to_glyph(S_grave)
                                     : engraving_to_glyph_pg(e);
                ++count;
            }
            if (lookbuf) { /* (redundant) */
                const cmode = look_cmode();
                let outbuf;

                if (count === 1) {
                    outbuf = `${nearby ? "nearby " : ""}seen or remembered engravings${
                        nearby ? "" : " on this level"}:`;
                    await tty_putstr(win, 0, upstart(outbuf));
                    /* hack alert! Qt watches a text window for any line
                       with 4 consecutive spaces */
                    await tty_putstr(win, 0, "    "); /* separator */
                }
                /* prefix: "coords  C  " where 'C' is engrvng|grave symbol */
                outbuf = coord_prefix(cmode, coord_desc(x, y, cmode));
                outbuf += `${encglyph(glyph)} `;
                /* guard against potential overflow */
                lookbuf = lookbuf.slice(0, Math.max(0, BUFSZ - 1 - outbuf.length));
                outbuf += lookbuf;
                await putmixed(win, 0, outbuf);
            }
        }
    }
    if (count)
        await tty_display_nhwindow(win, true);
    else
        await pline(`No engravings seen or remembered${nearby ? " nearby" : ""}.`);
    await tty_destroy_nhwindow(win);
}

// C ref: display.h engraving_to_glyph() -- the engraving glyph of the
// spot's terrain (S_engrcorr in a corridor, S_engroom elsewhere)
function engraving_to_glyph_pg(ep) {
    const corr = game.level.at(ep.engr_x ?? ep.x, ep.engr_y ?? ep.y).typ === CORR;
    return { ch: defsyms[corr ? S_engrcorr : S_engroom][0], color: NO_COLOR,
             decgfx: false, kind: 'engr' };
}

// C ref: pager.c do_look()
export async function do_look(mode, click_cc) {
    const quick = (mode === 1); /* use cursor; don't search for "more info" */
    const clicklook = (mode === 2); /* right mouse-click method */
    const flags = game.flags;
    let out_str = "";
    let firstmatch = null;
    let pm = null, supplemental_pm = null;
    let i = '\0', ans = 0;
    let sym = 0;          /* typed symbol or converted glyph */
    let found;            /* count of matching syms found */
    const cc = { x: 0, y: 0 }; /* screen pos of unknown glyph */
    let from_screen;      /* question from the screen */
    const clr = NO_COLOR;

    /* cmdq_pop(): the command queue isn't ported */

    if (!clicklook) {
        if (quick) {
            i = 'y';
        } else {
            const win = tty_create_nhwindow(NHW_MENU);
            tty_start_menu(win, MENU_BEHAVE_STANDARD);

            /*
             * Originally this was just a y|n question about whether to
             * use the cursor or to type a word.  When other choices were
             * added, it was changed to be a menu.  Using 'y' and 'n' as
             * unshown accelerators keeps backwards compatibility with
             * the old y|n behavior.
             *
             * When lootabc is set, abandon the 'y'|'n' compatibility in
             * favor of newer '/' and '?' compatibility instead.
             */
            const lootabc = !!flags.lootabc;
            tty_add_menu(win, null, '/', lootabc ? 0 : '/', lootabc ? '/' : 'y',
                         ATR_NONE, clr, "something on the map", MENU_ITEMFLAGS_NONE);
            /* [don't use 'i' as lootabc group accelerator because
               it will make the regular 'i' choice inaccessible] */
            tty_add_menu(win, null, 'i', lootabc ? 0 : 'i', 0, ATR_NONE,
                         clr, "something you're carrying", MENU_ITEMFLAGS_NONE);
            tty_add_menu(win, null, '?', lootabc ? 0 : '?', lootabc ? '?' : 'n',
                         ATR_NONE, clr, "something else (by symbol or name)",
                         MENU_ITEMFLAGS_NONE);
            if (!game.u.uswallow && !Hallucination()) {
                add_menu_str(win, "");
                /* these options work sensibly for swallowed case, but
                   there's no reason for player to use them then because
                   the swallowed display hides all applicable targets;
                   objects work fine when hallucinating, but screen
                   symbol/monster class letter doesn't match up with
                   bogus monster type, so suppress when hallucinating */
                /* [a_char, group accelerator without/with lootabc] */
                const more = [
                    ['m', 0, 'm', "nearby monsters"],
                    ['M', 0, 'M', "all monsters shown on map"],
                    ['o', 0, 'o', "nearby objects"],
                    ['O', 0, 'O', "all objects shown on map"],
                    ['t', '^', 't', "nearby traps"],
                    ['T', '"', 'T', "all seen or remembered traps"],
                    /* [don't use 'e' as lootabc group accelerator] */
                    ['e', '`', 0, "nearby engravings"],
                    ['E', '|', 'E', "all seen or remembered engravings"],
                ];
                for (const [a_char, gacc, gacc_abc, txt] of more)
                    tty_add_menu(win, null, a_char, lootabc ? 0 : a_char,
                                 lootabc ? gacc_abc : gacc, ATR_NONE, clr, txt,
                                 MENU_ITEMFLAGS_NONE);
            }
            tty_end_menu(win, "What do you want to look at:");
            const res = await tty_select_menu(win, PICK_ONE);
            if (res.n > 0)
                i = res.selected[0].item;
            await tty_destroy_nhwindow(win);
        }

        /* dowhatiscmd: */
        switch (i) {
        default:
        case 'q':
            return ECMD_OK;
        case 'y':
        case '/':
            from_screen = true;
            sym = 0;
            cc.x = game.u.ux;
            cc.y = game.u.uy;
            break;
        case 'i': {
            const invlet = await display_inventory(null, true);
            if (!invlet || invlet === '\x1b')
                return ECMD_OK;
            out_str = "";
            for (let invobj = game.invent; invobj; invobj = invobj.nobj)
                if (invobj.invlet === invlet) {
                    out_str = singular(invobj, xname);
                    break;
                }
            if (out_str)
                await checkfile(out_str, pm, chkfilUsrTyped | chkfilDontAsk, null);
            return ECMD_OK;
        }
        case '?':
            from_screen = false;
            out_str = await tty_getlin("Specify what? (type the word)");
            if (out_str !== " ") /* keep single space as-is */
                /* remove leading and trailing whitespace and
                   condense consecutive internal whitespace */
                out_str = mungspaces(out_str);
            if (out_str[0] === undefined || out_str[0] === '\x1b')
                return ECMD_OK;

            if (out_str.length > 1) { /* user typed in a complete string */
                await checkfile(out_str, pm, chkfilUsrTyped | chkfilDontAsk, null);
                return ECMD_OK;
            }
            sym = chcode(out_str[0]);
            break;
        case 'm':
            await look_all(true, true); /* list nearby monsters */
            return ECMD_OK;
        case 'M':
            await look_all(false, true); /* list all monsters */
            return ECMD_OK;
        case 'o':
            await look_all(true, false); /* list nearby objects */
            return ECMD_OK;
        case 'O':
            await look_all(false, false); /* list all objects */
            return ECMD_OK;
        case 't':
            await look_traps(true); /* list nearby traps */
            return ECMD_OK;
        case 'T':
            await look_traps(false); /* list all traps (visible or remembered) */
            return ECMD_OK;
        case 'e':
            await look_engrs(true); /* list nearby engravings */
            return ECMD_OK;
        case 'E':
            await look_engrs(false); /* list all engravings (visible|remembered) */
            return ECMD_OK;
        }
    } else { /* clicklook */
        cc.x = click_cc.x;
        cc.y = click_cc.y;
        sym = 0;
        from_screen = false;
    }

    /* Save the verbose flag, we change it later. */
    const save_verbose = flags.verbose;
    flags.verbose = flags.verbose && !quick;
    /*
     * The user typed one letter, or we're identifying from the screen.
     */
    try {
        do {
            /* Reset some variables. */
            pm = null;
            out_str = "";

            if (from_screen || clicklook) {
                if (from_screen) {
                    if (flags.verbose)
                        await pline(`Please move the cursor to ${what_is_a_location}.`);
                    else
                        await pline(`Pick ${what_is_a_location}.`);

                    ans = await getpos(cc, quick, what_is_a_location);
                    if (ans < 0 || cc.x < 0)
                        break; /* done */
                    flags.verbose = false; /* only print long question once */
                }
            }

            ({ found, out_str, firstmatch, for_supplement: supplemental_pm }
                = do_screen_description(cc, (from_screen || clicklook), sym));

            /* Finally, print out our explanation. */
            if (found) {
                /* use putmixed() because there may be an encoded glyph present */
                await putmixed(game.WIN_MESSAGE, 0, out_str);

                /* check the data file for information about this thing */
                if (found === 1 && ans !== LOOK_QUICK && ans !== LOOK_ONCE
                    && (ans === LOOK_VERBOSE || (flags.help !== false && !quick))
                    && !clicklook) {
                    const supp = { name: "" };
                    const temp_buf = firstmatch;
                    await checkfile(temp_buf, pm,
                                    (ans === LOOK_VERBOSE) ? chkfilDontAsk
                                                           : chkfilNone,
                                    supp);
                    if (supplemental_pm)
                        await do_supplemental_info(supp.name, supplemental_pm,
                                                   ans === LOOK_VERBOSE);
                }
            } else {
                await pline("I've never heard of such things.");
            }
        } while (from_screen && !quick && ans !== LOOK_ONCE && !clicklook);
    } finally {
        flags.verbose = save_verbose;
    }
    return ECMD_OK;
}

// C ref: pager.c dowhatis() -- the #whatis command
export async function dowhatis() {
    return await do_look(0, null);
}

// C ref: pager.c doquickwhatis() -- the #glance command
export async function doquickwhatis() {
    return await do_look(1, null);
}

// C ref: pager.c dowhatdoes_core() -- the description of a key, from the
// command table (C's cmdhelp-file lookup is #if 0)
export function dowhatdoes_core(q) {
    let ec_desc;

    if ((ec_desc = key2extcmddesc(q)) !== null) {
        /* note: if "%-8s" gets changed, the "%8.8s" in dowhatdoes() will
           need a comparable change */
        return `${key2txt(q).padEnd(8)}${ec_desc}.`;
    }
    return null;
}

// C ref: pager.c dowhatdoes() -- the whatdoes command
export async function dowhatdoes() {
    let q, reslt;

    if (!game.whatdoes_once) { /* static boolean once */
        await pline(`Ask about '&' or '?' to get more info.${game.iflags.altmeta ? "  (For ESC, type it twice.)" : ""}`);
        game.whatdoes_once = true;
    }
    /* introff(): disables ^C but not ^\ */
    q = (await tty_yn_function("What command?", null, '\0')).charCodeAt(0);
    if (q === 0x1b && game.iflags.altmeta) {
        /* in an ideal world, we would know whether another keystroke
           was already pending, but this is not an ideal world...
           if user typed ESC, we'll essentially hang until another
           character is typed */
        q = (await tty_yn_function("]", null, '\0')).charCodeAt(0);
        if (q !== 0x1b)
            q = (q | 0o200) & 0xff;
    }
    /* intron(): reenables ^C */
    reslt = dowhatdoes_core(q);
    if (reslt) {
        const p = reslt.indexOf('\n'); /* 'm' prefix has two lines of output */

        if (q === 0x26 || q === 0x3f) /* '&' or '?' */
            throw new Error('dowhatdoes(): whatdoes_help() (keyhelp file) not ported yet');
        if (p < 0) {
            /* normal usage; 'reslt' starts with key, some indentation, and
               then explanation followed by '.' for sentence punctuation */
            await pline(reslt);
        } else {
            /* for 'm' prefix, where 'reslt' has an embedded newline to
               indicate and separate two lines of output; we add a comma to
               first line so that the combination is a complete sentence */
            await pline(`${reslt.slice(0, p)},`);
            /* cheat by knowing how dowhatdoes_core() handles key portion */
            await pline(`${reslt.slice(0, 8).padStart(8)}${reslt.slice(p + 1)}`);
        }
    } else {
        const oct = q.toString(8).padStart(3, '0'), hex = q.toString(16).padStart(2, '0');
        await pline(`No such command '${visctrl(q)}', char code ${q} (0${oct} or 0x${hex}).`);
    }
    return ECMD_OK;
}

// C ref: pager.c dispfile_help()
async function dispfile_help() {
    await tty_display_file("help", true); /* HELP */
}

// C ref: pager.c dispfile_shelp()
async function dispfile_shelp() {
    await tty_display_file("hh", true); /* SHELP */
}

// C ref: pager.c dispfile_optionfile()
async function dispfile_optionfile() {
    await tty_display_file("opthelp", true); /* OPTIONFILE */
}

// C ref: pager.c dispfile_optmenu()
async function dispfile_optmenu() {
    await tty_display_file("optmenu", true); /* OPTMENUHELP */
}

// C ref: pager.c dispfile_license()
async function dispfile_license() {
    await tty_display_file("license", true); /* LICENSE */
}

// C ref: pager.c dispfile_debughelp()
async function dispfile_debughelp() {
    await tty_display_file("wizhelp", true); /* DEBUGHELP */
}

// C ref: pager.c dispfile_usagehelp()
async function dispfile_usagehelp() {
    await tty_display_file("usagehlp", true); /* USAGEHELP */
}

// C ref: pager.c hmenu_dohistory()
async function hmenu_dohistory() {
    await dohistory();
}

// C ref: pager.c hmenu_dowhatdoes()
async function hmenu_dowhatdoes() {
    await dowhatdoes();
}

// C ref: pager.c dohistory() -- the #history command
export async function dohistory() {
    await tty_display_file("history", true); /* HISTORY */
    return ECMD_OK;
}

// C ref: pager.c hmenu_doextversion()
async function hmenu_doextversion() {
    await doextversion();
}

// C ref: pager.c hmenu_dowhatis()
async function hmenu_dowhatis() {
    await dowhatis();
}
