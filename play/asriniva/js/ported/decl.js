// Original global declarations below are authoritative initialization images; live per-Module globals are accessed through C.
/* NetHack 5.0	decl.c	$NHDT-Date: 1736530208 2025/01/10 09:30:08 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.341 $ */
/* Copyright (c) Stichting Mathematisch Centrum, Amsterdam, 1985. */
/*-Copyright (c) Michael Allison, 2009. */
/* NetHack may be freely redistributed.  See license for details. */

import { C } from './c-runtime.js';

export const nhcb_name = [
    "cmd_before",
    "level_enter",
    "level_leave",
    "end_turn"
];


export const nhcb_counts = [
    0
];

export const c_color_names = {
    "c_black": "black",
    "c_amber": "amber",
    "c_golden": "golden",
    "c_light_blue": "light blue",
    "c_red": "red",
    "c_green": "green",
    "c_silver": "silver",
    "c_blue": "blue",
    "c_purple": "purple",
    "c_white": "white",
    "c_orange": "orange"
};

/* CLR_BLACK */
/* CLR_RED */
/* CLR_GREEN */
/* CLR_BROWN */
/* CLR_BLUE */
/* CLR_MAGENTA */
/* CLR_CYAN */
/* CLR_GRAY */
/* no_color */
/* CLR_ORANGE */
/* CLR_BRIGHT_GREEN */
/* CLR_YELLOW */
/* CLR_BRIGHT_BLUE */
/* CLR_BRIGHT_MAGENTA */
/* CLR_BRIGHT_CYAN */
/* CLR_WHITE */
export const c_obj_colors = [
    "black",
    "red",
    "green",
    "brown",
    "blue",
    "magenta",
    "cyan",
    "gray",
    "transparent",
    "orange",
    "bright green",
    "yellow",
    "bright blue",
    "bright magenta",
    "bright cyan",
    "white"
];


export const c_common_strings = {
    "c_nothing_happens": "Nothing happens.",
    "c_nothing_seems_to_happen": "Nothing seems to happen.",
    "c_thats_enough_tries": "That's enough tries!",
    "c_silly_thing_to": "That is a silly thing to %s.",
    "c_shudder_for_moment": "shudder for a moment.",
    "c_something": "something",
    "c_Something": "Something",
    "c_You_can_move_again": "You can move again.",
    "c_Never_mind": "Never mind.",
    "c_vision_clears": "vision quickly clears.",
    "c_the_your": [
        "the",
        "your"
    ],
    "c_fakename": [
        "mon",
        "you"
    ]
};


export const disclosure_options = "iavgco";

export const emptystr = [
    0
];
       /* non-const */

export const flags = null;
  /* extern declaration is in flag.h, not decl.h */

/* Global windowing data, defined here for multi-window-system support */
// #ifdef WIN32
// boolean fqn_prefix_locked[PREFIX_COUNT] = { FALSE, FALSE, FALSE,
//                                             FALSE, FALSE, FALSE,
//                                             FALSE, FALSE, FALSE,
//                                             FALSE };
// #endif
// #ifdef PREFIXES_IN_USE
// const char *fqn_prefix_names[PREFIX_COUNT] = {
//     "hackdir",  "leveldir", "savedir",    "bonesdir",  "datadir",
//     "scoredir", "lockdir",  "sysconfdir", "configdir", "troubledir"
// };
// #endif

/* used by coloratt.c, options.c, utf8map.c, windows.c */
export const hexdd = "00112233445566778899aAbBcCdDeEfF";


/* x/y/z deltas for the 10 movement directions (8 compass pts, 2 down/up) */
export const xdir = [
    -1,
    -1,
    0,
    1,
    1,
    1,
    0,
    -1,
    0,
    0
];

export const ydir = [
    0,
    -1,
    -1,
    -1,
    0,
    1,
    1,
    1,
    0,
    0
];

export const zdir = [
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    1,
    -1
];

/* reordered directions, cardinals first */
export const dirs_ord = [
    0,
    2,
    4,
    6,
    1,
    3,
    5,
    7
];


export const has_strong_rngseed = 0;

export const head_engr = null;

export const iflags = null;

export const a11y = null;

/* NOTE: the order of these words exactly corresponds to the
   order of oc_material values #define'd in objclass.h. */
export const materialnm = [
    "mysterious",
    "liquid",
    "wax",
    "organic",
    "flesh",
    "paper",
    "cloth",
    "leather",
    "wooden",
    "bone",
    "dragonhide",
    "iron",
    "metal",
    "copper",
    "silver",
    "gold",
    "platinum",
    "mithril",
    "plastic",
    "glass",
    "gemstone",
    "stone"
];

export const quitchars = " \r\n\u001b";

/* 7 per row */
export const shield_static = [
    82,
    83,
    84,
    83,
    82,
    83,
    85,
    82,
    83,
    84,
    83,
    82,
    83,
    85,
    82,
    83,
    84,
    83,
    82,
    83,
    85
];

export const u = null;

export const ubirthday = null;

export const urealtime = null;

/* quiver */
/* under-wear, so to speak */
/* dragon armor, if a dragon */
export const uwep = null;
export const uarm = null;
export const uswapwep = null;
export const uquiver = null;
export const uarmu = null;
export const uskin = null;
export const uarmc = null;
export const uarmh = null;
export const uarms = null;
export const uarmg = null;
export const uarmf = null;
export const uamul = null;
export const uright = null;
export const uleft = null;
export const ublindf = null;
export const uchain = null;
export const uball = null;

export const vowels = "aeiouAEIOU";

export const WIN_MESSAGE = null;
export const WIN_STATUS = null;
export const WIN_MAP = null;
export const WIN_INVEN = null;

export const ynchars = "yn";

export const ynqchars = "ynq";

export const ynaqchars = "ynaq";

export const ynNaqchars = "yn#aq";

export const rightleftchars = "rl";

export const hidespinchars = "hsq";

export const yn_number = 0;

// #ifdef PANICTRACE
export const ARGV0 = null;

// #endif

/* Str Int Wis Dex Con Cha */
/* Init   Lower  Higher */
/* Hit points */
/* Energy */
export const urole_init_data = {
    "name": {
        "m": "Undefined",
        "f": 0
    },
    "rank": [
        {
            "m": 0,
            "f": 0
        },
        {
            "m": 0,
            "f": 0
        },
        {
            "m": 0,
            "f": 0
        },
        {
            "m": 0,
            "f": 0
        },
        {
            "m": 0,
            "f": 0
        },
        {
            "m": 0,
            "f": 0
        },
        {
            "m": 0,
            "f": 0
        },
        {
            "m": 0,
            "f": 0
        },
        {
            "m": 0,
            "f": 0
        }
    ],
    "lgod": "L",
    "ngod": "N",
    "cgod": "C",
    "filecode": "Xxx",
    "homebase": "home",
    "intermed": "locate",
    "mnum": -1,
    "petnum": -1,
    "ldrnum": -1,
    "guardnum": -1,
    "neminum": -1,
    "enemy1num": -1,
    "enemy2num": -1,
    "enemy1sym": 0,
    "enemy2sym": 0,
    "questarti": 0,
    "allow": 0,
    "attrbase": [
        7,
        7,
        7,
        7,
        7,
        7
    ],
    "attrdist": [
        20,
        15,
        15,
        20,
        20,
        10
    ],
    "hpadv": {
        "infix": 10,
        "inrnd": 0,
        "lofix": 0,
        "lornd": 8,
        "hifix": 1,
        "hirnd": 0
    },
    "enadv": {
        "infix": 2,
        "inrnd": 0,
        "lofix": 0,
        "lornd": 2,
        "hifix": 0,
        "hirnd": 3
    },
    "xlev": 14,
    "initrecord": 0,
    "spelbase": 10,
    "spelheal": 0,
    "spelshld": 0,
    "spelarmr": 4,
    "spelstat": 1,
    "spelspec": 0,
    "spelsbon": -3
};


/*    Str     Int Wis Dex Con Cha */
/* Init   Lower  Higher */
/* Hit points */
/* Energy */
export const urace_init_data = {
    "noun": "something",
    "adj": "undefined",
    "coll": "something",
    "filecode": "Xxx",
    "individual": {
        "m": 0,
        "f": 0
    },
    "mnum": -1,
    "mummynum": -1,
    "zombienum": -1,
    "allow": 0,
    "selfmask": 0,
    "lovemask": 0,
    "hatemask": 0,
    "attrmin": [
        3,
        3,
        3,
        3,
        3,
        3
    ],
    "attrmax": [
        118,
        18,
        18,
        18,
        18,
        18
    ],
    "hpadv": {
        "infix": 2,
        "inrnd": 0,
        "lofix": 0,
        "lornd": 2,
        "hifix": 1,
        "hirnd": 0
    },
    "enadv": {
        "infix": 1,
        "inrnd": 0,
        "lofix": 2,
        "lornd": 0,
        "hifix": 2,
        "hirnd": 0
    }
};


export const disp = {
    "botl": 0
};


/* artifact.c */
/* decl.c */
/* afternmv */
/* detect.c */
/* already_found_flag */
/* do.c */
/* at_ladder */
/* dog.c */
/* apelist */
/* end.c */
/* amulets */
/* mon.c */
/* animal_list */
/* animal_list_count */
/* options.c */
/* altpalette[CLR_MAX] */
/* pickup.c */
/* A_first_hint */
/* A_second_hint */
/* abort_looting */
/* shk.c */
/* auto_credit */
/* sounds.c */
/* enum soundlib_ids active_soundlib */
/* trap.c */
/* acid_ctx */
/* havestate*/
export const g_init_a = {
    "afternmv": 0,
    "already_found_flag": 0,
    "at_ladder": 0,
    "apelist": 0,
    "amulets": [
        {
            "count": 0
        }
    ],
    "animal_list": 0,
    "animal_list_count": 0,
    "A_first_hint": 0,
    "A_second_hint": 0,
    "abort_looting": 0,
    "auto_credit": 0,
    "active_soundlib": 0,
    "acid_ctx": {
        "dkn_boom": 0,
        "unk_boom": 0,
        "ctx_valid": 0
    },
    "havestate": 1
};


/* botl.c */
/* blstats */
/* blinit */
/* bl_hilite_moves */
/* decl.c */
/* bhitpos */
/* billobjs */
/* files.c */
/* bones */
/* hack.c */
/* bldrpush_oid - last boulder pushed */
/* bldrpushtime - turn message was given about pushing that boulder */
/* mkmaze.c */
/* bughack */
/* pickup.c */
/* bucx_filter */
/* zap.c */
/* buzzer -- monst that zapped/cast/breathed to initiate buzz() */
/* bot_disabled */
/* havestate*/
export const g_init_b = {
    "blstats": [
        [
            {
                "fldname": 0,
                "fldfmt": 0,
                "time": 0,
                "chg": 0,
                "percent_matters": 0,
                "percent_value": 0,
                "anytype": 18,
                "a": {
                    "a_void": 0
                },
                "rawval": {
                    "a_void": 0
                },
                "val": 0,
                "valwidth": 0,
                "idxmax": 0,
                "fld": 0,
                "hilite_rule": 0,
                "thresholds": 0
            }
        ]
    ],
    "blinit": 0,
    "bl_hilite_moves": 0,
    "bhitpos": {
        "x": 0,
        "y": 0
    },
    "billobjs": 0,
    "bones": "bonesnn.xxx.le",
    "bldrpush_oid": 0,
    "bldrpushtime": 0,
    "bughack": {
        "inarea": {
            "x1": 80,
            "y1": 21,
            "x2": 0,
            "y2": 0
        },
        "delarea": {
            "x1": 80,
            "y1": 21,
            "x2": 0,
            "y2": 0
        },
        "in_islev": 0,
        "del_islev": 0,
        "rtype": 0,
        "padding": 0,
        "rname": {
            "str": 0
        }
    },
    "bucx_filter": 0,
    "buzzer": 0,
    "bot_disabled": 0,
    "havestate": 1
};


/* command_queue */
/* botl.c */
/* cond_hilites */
/* condmenu_sortorder */
/* cmd.c */
/* Cmd */
/* clicklook_cc */
/* decl.c */
/* chosen_windowtype */
/* cmd_key */
/* cmd_bind */
/* command_count */
/* current_wand */
/* catmore */
/* dog.c */
/* catname */
/* end.c */
/* crash_email */
/* crash_name */
/* crash_urlmax */
/* symbols.c */
/* currentgraphics */
/* files.c */
/* cmdline_rcfile */
/* config_section_chosen */
/* config_section_current */
/* chosen_symset_start */
/* chosen_symset_end */
/* invent.c */
/* cached_pickinv_win */
/* core_invent_state */
/* options.c */
/* cmdline_windowsys */
/* color_colorings */
/* pickup.c */
/* current_container */
/* class_filter */
/* questpgr.c */
/* cvt_buf */
/* sounds.c */
/* chosen_soundlib */
/* coder */
/* uhitm.c */
/* corpsenm_digested */
/* converted_savefile_loaded */
/* havestate*/
export const g_init_c = {
    "command_queue": [
        0
    ],
    "cond_hilites": [
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0
    ],
    "condmenu_sortorder": 0,
    "Cmd": {
        "serialno": 0
    },
    "clicklook_cc": {
        "x": 0,
        "y": 0
    },
    "chosen_windowtype": [
        0
    ],
    "cmd_key": 0,
    "cmd_bind": 0,
    "command_count": 0,
    "current_wand": 0,
    "catname": [
        0
    ],
    "crash_email": 0,
    "crash_name": 0,
    "crash_urlmax": -1,
    "currentgraphics": 0,
    "cmdline_rcfile": 0,
    "config_section_chosen": 0,
    "config_section_current": 0,
    "chosen_symset_start": 0,
    "chosen_symset_end": 0,
    "cached_pickinv_win": -1,
    "core_invent_state": 0,
    "cmdline_windowsys": 0,
    "color_colorings": 0,
    "current_container": 0,
    "class_filter": 0,
    "cvt_buf": [
        0
    ],
    "chosen_soundlib": 0,
    "coder": 0,
    "corpsenm_digested": -1,
    "converted_savefile_loaded": 0,
    "havestate": 1
};


/* decl.c */
/* doorindex */
/* done_money */
/* domove_attempting */
/* domove_succeeded */
/* defer_see_monsters */
/* dig.c */
/* did_dig_msg */
/* do.c */
/* dfr_pre_msg */
/* dfr_post_msg */
/* did_nothing_flag */
/* dog.c */
/* dogname */
/* end.c */
/* done_seq */
/* mon.c */
/* disintegested */
/* objname.c */
/* distantname */
/* pickup.c */
/* decor_fumble_override */
/* decor_levitate_override */
/* deferred_showpaths */
/* deferred_showpaths_dir  */
/* havestate*/
export const g_init_d = {
    "doorindex": 0,
    "done_money": 0,
    "domove_attempting": 0,
    "domove_succeeded": 0,
    "defer_see_monsters": 0,
    "did_dig_msg": 0,
    "dfr_pre_msg": 0,
    "dfr_post_msg": 0,
    "did_nothing_flag": 0,
    "dogname": [
        0
    ],
    "done_seq": 0,
    "disintegested": 0,
    "distantname": 0,
    "decor_fumble_override": 0,
    "decor_levitate_override": 0,
    "deferred_showpaths": 0,
    "deferred_showpaths_dir": 0,
    "havestate": 1
};


/* cmd.c */
/* en_win */
/* en_via_menu */
/* ext_tlist */
/* eat.c */
/* eatmbuf */
/* mkmaze.c */
/* ebubbles */
/* new */
/* early_raw_messages */
/* havestate*/
export const g_init_e = {
    "en_win": -1,
    "en_via_menu": 0,
    "ext_tlist": 0,
    "eatmbuf": 0,
    "ebubbles": 0,
    "early_raw_messages": 0,
    "havestate": 1
};


/* decl.c */
/* ftrap */
/* fqn_prefix */
/* ffruit */
/* eat.c */
/* force_save_hs */
/* mhitm.c */
/* far_noise */
/* rumors.c */
/* false_rumor_size */
/* false_rumor_start*/
/* false_rumor_end */
/* shk.c */
/* followmsg */
/* havestate*/
export const g_init_f = {
    "ftrap": 0,
    "fqn_prefix": [
        0
    ],
    "ffruit": 0,
    "force_save_hs": 0,
    "far_noise": 0,
    "false_rumor_size": 0,
    "false_rumor_start": 0,
    "false_rumor_end": 0,
    "followmsg": 0,
    "havestate": 1
};


/* display.c */
/* gbuf */
/* gbuf_start */
/* gbug_stop */
/* do_name.c */
/* getposx, getposy */
/* gloc_filter_map */
/* gloc_filter_floodfill_match_glyph */
/* dog.c */
/* gtyp */
/* gx */
/* gy */
/* dokick.c */
/* gate_str */
/* end.c */
/* gems */
/* invent.c */
/* glyph_reset_timestamp */
/* nhlua.c */
/* gmst_stored */
/* gmst_moves */
/* gmst_invent */
/* gmst_ubak, gmst_disco, gmst_mvitals */
/* gmst_spl_book */
/* pline.c */
/* gamelog */
/* region.c */
/* gas_cloud_diss_within */
/* gas_cloud_diss_seen */
/* new */
/* per-level glyph mapping flags */
/* glyphmap_perlevel_flags */
/* havestate*/
export const g_init_g = {
    "gbuf": [
        [
            {
                "gnew": 0
            }
        ]
    ],
    "gbuf_start": [
        0
    ],
    "gbuf_stop": [
        0
    ],
    "getposx": 0,
    "getposy": 0,
    "gloc_filter_map": 0,
    "gloc_filter_floodfill_match_glyph": 0,
    "gtyp": 0,
    "gx": 0,
    "gy": 0,
    "gate_str": 0,
    "gems": [
        {
            "count": 0
        }
    ],
    "glyph_reset_timestamp": 0,
    "gmst_stored": 0,
    "gmst_moves": 0,
    "gmst_invent": 0,
    "gmst_ubak": 0,
    "gmst_disco": 0,
    "gmst_mvitals": 0,
    "gmst_spl_book": [
        {
            "sp_id": 0
        }
    ],
    "gamelog": 0,
    "gas_cloud_diss_within": 0,
    "gas_cloud_diss_seen": 0,
    "glyphmap_perlevel_flags": 0,
    "havestate": 1
};


/* decl.c */
/* hname */
/* hackdir */
/* MICRO || WIN32 */
/* hero_seq: sequence number for hero movement, 'moves*8 + n'
              * where n is usually 1, sometimes 2 when Fast/Very_fast, maybe
              * higher if polymorphed into something that's even faster */
/* dog.c */
/* horsename */
/* mhitu.c */
/* hitmsg_mid */
/* hitmsg_prev */
/* save.c */
/* havestate*/
export const g_init_h = {
    "hname": 0,
    "hero_seq": 8,
    "horsename": [
        0
    ],
    "hitmsg_mid": 0,
    "hitmsg_prev": 0,
    "havestate": 1
};


/* decl.c */
/* in_doagain */
/* in_mklev */
/* in_steed_dismounting */
/* invent */
/* do_wear.c */
/* initial_don */
/* invent.c */
/* invbuf */
/* invbufsize */
/* item_action_in_progress */
/* in_sync_perminvent */
/* mon.c */
/* itermonarr */
/* restore.c */
/* id_map */
/* sp_lev.c */
/* in_mk_themerooms */
/* havestate*/
export const g_init_i = {
    "in_doagain": 0,
    "in_mklev": 0,
    "in_steed_dismounting": 0,
    "invent": 0,
    "initial_don": 0,
    "invbuf": 0,
    "invbufsiz": 0,
    "item_action_in_progress": 0,
    "in_sync_perminvent": 0,
    "itermonarr": 0,
    "id_map": 0,
    "in_mk_themerooms": 0,
    "havestate": 1
};


/* apply.c */
/* jumping_is_magic */
/* havestate*/
export const g_init_j = {
    "jumping_is_magic": 0,
    "havestate": 1
};


/* kickedloc */
/* decl.c */
/* kickedobj */
/* read.c */
/* known */
/* havestate*/
export const g_init_k = {
    "kickedloc": {
        "x": 0,
        "y": 0
    },
    "kickedobj": 0,
    "known": 0,
    "havestate": 1
};


/* cmd.c */
/* last_command_count */
/* decl.c */
/* locknum */
/* levels */
/* MICRO */
/* files.c */
/* lockptr */
/* lock */
/* invent.c */
/* lastinvr */
/* light.c */
/* light_base */
/* mklev.c */
/* luathemes[] */
/* mon.c */
/* last_hider */
/* nhlan.c */
/* lusername */
/* lusername_size */
/* MAX_LAN_USERNAME */
/* nhlua.c */
/* luacore */
/* lua_warnbuf[] */
/* loglua */
/* lua_sid */
/* options.c */
/* loot_reset_justpicked */
/* save.c */
/* looseball */
/* loosechain */
/* sp_lev.c */
/* lev_message */
/* lregions */
/* trap.c */
/* launchplace */
/* windows.c */
/* last_winchoice */
/* new */
/* lua_ver[LUA_VER_BUFSIZ] */
/* lua_copyright[LUA_COPYRIGHT_BUFSIZ] */
/* havestate*/
export const g_init_l = {
    "last_command_count": 0,
    "locknum": 0,
    "lockptr": 0,
    "lock": "1lock",
    "lastinvnr": 51,
    "light_base": 0,
    "luathemes": [
        0
    ],
    "last_hider": 0,
    "luacore": 0,
    "lua_warnbuf": [
        0
    ],
    "loglua": 0,
    "lua_sid": 0,
    "loot_reset_justpicked": 0,
    "looseball": 0,
    "loosechain": 0,
    "lev_message": 0,
    "lregions": 0,
    "launchplace": {
        "obj": 0,
        "x": 0,
        "y": 0
    },
    "last_winchoice": 0,
    "lua_ver": [
        0
    ],
    "lua_copyright": [
        0
    ],
    "havestate": 1
};


/* apply.c */
/* mkot_trap_warn_count */
/* botl.c */
/* mrank_sz */
/* decl.c */
/* multi */
/* multi_reason */
/* multi_reason usually points to a string literal (when not Null)
       but multireasonbuf[] is available for when it needs to be dynamic */
/* multireasonbuf[] */
/* m_shot */
/* mrg_to_wielded */
/* menu_colorings */
/* migrating_objs */
/* dog.c */
/* mydogs */
/* migrating_mons */
/* dokick.c */
/* maploc */
/* mhitm.c */
/* mswallower */
/* mhitu.c */
/* mhitu_dieroll */
/* mklev.c */
/* made_branch */
/* mkmap.c */
/* min_rx */
/* max_rx */
/* min_ry */
/* max_ry */
/* mkobj.c */
/* mkcorpstat_norevive */
/* mthrowu.c */
/* mesg_given */
/* mtarget */
/* marcher */
/* muse.c */
/* m_using */
/* m */
/* options.c */
/* mapped_menu_cmds */
/* mapped_menu_op */
/* region.c */
/* max_regions */
/* trap.c */
/* mentioned_water */
/* havestate*/
export const g_init_m = {
    "mkot_trap_warn_count": 0,
    "mrank_sz": 0,
    "multi": 0,
    "multi_reason": 0,
    "multireasonbuf": [
        0
    ],
    "m_shot": {
        "n": 0,
        "i": 0,
        "o": 0,
        "s": 0
    },
    "mrg_to_wielded": 0,
    "menu_colorings": 0,
    "migrating_objs": 0,
    "mydogs": 0,
    "migrating_mons": 0,
    "maploc": 0,
    "mswallower": 0,
    "mhitu_dieroll": 0,
    "made_branch": 0,
    "min_rx": 0,
    "max_rx": 0,
    "min_ry": 0,
    "max_ry": 0,
    "mkcorpstat_norevive": 0,
    "mesg_given": 0,
    "mtarget": 0,
    "marcher": 0,
    "m_using": 0,
    "m": {
        "offensive": 0
    },
    "mapped_menu_cmds": [
        0
    ],
    "mapped_menu_op": [
        0
    ],
    "max_regions": 0,
    "mentioned_water": 0,
    "havestate": 1
};


/* botl.c */
/* now_or_before_idx */
/* decl.c */
/* nomovemsg */
/* nsubroom */
/* dokick.c */
/* nowhere */
/* files.c */
/* nesting */
/* no_sound_notified */
/* mhitm.c */
/* noisetime */
/* mkmap.c */
/* new_locations */
/* n_loc_filled */
/* options.c */
/* n_menu_mapped */
/* potion.c */
/* notonhead */
/* questpgr.c */
/* nambuf */
/* restore.c */
/* n_ids_mapped */
/* sp_lev.c */
/* num_lregions */
/* u_init.c */
/* nocreate */
/* nocreate2 */
/* nocreate3 */
/* nocreate4 */
/* havestate*/
export const g_init_n = {
    "now_or_before_idx": 0,
    "nomovemsg": 0,
    "nsubroom": 0,
    "nowhere": {
        "glyph": 0
    },
    "nesting": 0,
    "no_sound_notified": 0,
    "noisetime": 0,
    "new_locations": 0,
    "n_loc_filled": 0,
    "n_menu_mapped": 0,
    "notonhead": 0,
    "nambuf": [
        0
    ],
    "n_ids_mapped": 0,
    "num_lregions": 0,
    "nocreate": 0,
    "nocreate2": 0,
    "nocreate3": 0,
    "nocreate4": 0,
    "havestate": 1
};


/* objs_deleted */
/* dbridge.c */
/* occupants */
/* decl.c */
/* occupation */
/* occtime */
/* otg_temp */
/* otg_otmp */
/* occtxt */
/* symbols.c */
/* ov_primary_syms */
/* ov_rogue_syms */
/* invent.c */
/* only (coord) */
/* o_init.c */
/* oclass_prob_totals */
/* options.c */
/* opt_phase */
/* opt_initial */
/* opt_from_file */
/* opt_need_redraw */
/* opt_need_glyph_reset */
/* opt_need_promptstyle */
/* opt_reset_customcolors */
/* opt_reset_customsymbols */
/* opt_update_basic_palette */
/* opt_symset_changed */
/* pickup.c */
/* oldcap */
/* restore.c */
/* oldfruit */
/* rumors.c */
/* oracle_flag */
/* uhitm.c */
/* override_confirmation */
/* zap.c */
/* obj_zapped */
/* havestate*/
export const g_init_o = {
    "objs_deleted": 0,
    "occupants": [
        {
            "emon": 0
        }
    ],
    "occupation": 0,
    "occtime": 0,
    "otg_temp": 0,
    "otg_otmp": 0,
    "occtxt": 0,
    "ov_primary_syms": [
        0
    ],
    "ov_rogue_syms": [
        0
    ],
    "only": {
        "x": 0
    },
    "oclass_prob_totals": [
        0
    ],
    "opt_phase": 0,
    "opt_initial": 0,
    "opt_from_file": 0,
    "opt_need_redraw": 0,
    "opt_need_glyph_reset": 0,
    "opt_need_promptstyle": 0,
    "opt_reset_customcolors": 0,
    "opt_reset_customsymbols": 0,
    "opt_update_basic_palette": 0,
    "opt_symset_changed": 0,
    "oldcap": 0,
    "oldfruit": 0,
    "oracle_flg": 0,
    "override_confirmation": 0,
    "obj_zapped": 0,
    "havestate": 1
};


/* apply.c */
/* polearm_range_min */
/* polearm_range_max  */
/* decl.c */
/* plnamelen */
/* pl_race */
/* plinemsg_types */
/* dog.c */
/* petname_used */
/* preferred_pet */
/* symbols.c */
/* primary_syms */
/* invent.c */
/* perm_invent_toggling_direction */
/* pickup.c */
/* picked_filter */
/* pickup_encumbrance */
/* pline.c */
/* pline_flags */
/* prevmsg */
/* potion.c */
/* potion_nothing */
/* potion_unkn */
/* pray.c */
/* p_aligntyp */
/* p_trouble */
/* p_type */
/* weapon.c */
/* propellor */
/* zap.c */
/* poly_zap */
/* havestate*/
export const g_init_p = {
    "polearm_range_min": -1,
    "polearm_range_max": -1,
    "plnamelen": 0,
    "pl_race": 0,
    "plinemsg_types": 0,
    "petname_used": 0,
    "preferred_pet": 0,
    "primary_syms": [
        0
    ],
    "perm_invent_toggling_direction": 0,
    "picked_filter": 0,
    "pickup_encumbrance": 0,
    "pline_flags": 0,
    "prevmsg": [
        0
    ],
    "potion_nothing": 0,
    "potion_unkn": 0,
    "p_aligntyp": 0,
    "p_trouble": 0,
    "p_type": 0,
    "propellor": 0,
    "poly_zapped": 0,
    "havestate": 1
};


/* havestate*/
export const g_init_q = {
    "havestate": 1
};


/* symbols.c */
/* rogue_syms */
/* extralev.c */
/* r */
/* mkmaze.c */
/* ransacked */
/* region.c */
/* regions */
/* rip.c */
/* rip */
/* role.c */
/* role_pa */
/* role_post_attrib */
/* rfilter */
/* shk.c */
/* repo */
/* havestate*/
export const g_init_r = {
    "rogue_syms": [
        0
    ],
    "r": [
        [
            {
                "rlx": 0
            }
        ]
    ],
    "ransacked": 0,
    "regions": 0,
    "rip": 0,
    "role_pa": [
        0
    ],
    "role_post_attribs": 0,
    "rfilter": {
        "roles": [
            0
        ],
        "mask": 0
    },
    "repo": {
        "shopkeeper": 0
    },
    "havestate": 1
};


/* artifact.c */
/* spec_dbon_applies */
/* decl.c */
/* stairs */
/* smeq */
/* stoned */
/* subrooms */
/* do.c */
/* save_dlevel */
/* symbols.c */
/* symset */
/* symset_customizations */
/* showsyms */
/* files.c */
/* symset_count */
/* symset_which_set */
/* SAVEF */
/* SAVEP */
/* invent.c */
/* sortloogmode */
/* mhitm.c */
/* skipdrin */
/* mon.c */
/* somebody_can_move */
/* options.c */
/* symset_list */
/* save_menucolors */
/* save_colorings */
/* simple_options_help */
/* pickup.c */
/* sellobj_first */
/* shop_filter */
/* pline.c */
/* saved_pline_index */
/* saved_plines */
/* polyself.c */
/* sex_change_ok */
/* shk.c */
/* sell_response */
/* sell_how */
/* spells.c */
/* spl_sortmode */
/* spl_orderindx */
/* steal.c */
/* stealoid */
/* stealmid */
/* vision.c */
/* seethru */
/* havestate*/
export const g_init_s = {
    "spec_dbon_applies": 0,
    "stairs": 0,
    "smeq": [
        0
    ],
    "stoned": 0,
    "subrooms": 0,
    "save_dlevel": {
        "dnum": 0,
        "dlevel": 0
    },
    "symset": [
        {
            "next": 0
        }
    ],
    "sym_customizations": [
        [
            {
                "customization_name": 0
            }
        ],
        [
            {
                "customization_name": 0
            }
        ]
    ],
    "showsyms": [
        0
    ],
    "symset_count": 0,
    "symset_which_set": 0,
    "SAVEF": [
        0
    ],
    "sortlootmode": 0,
    "skipdrin": 0,
    "somebody_can_move": 0,
    "symset_list": 0,
    "save_menucolors": 0,
    "save_colorings": 0,
    "simple_options_help": 0,
    "sellobj_first": 0,
    "shop_filter": 0,
    "saved_pline_index": 0,
    "saved_plines": [
        0
    ],
    "sex_change_ok": 0,
    "sell_response": 97,
    "sell_how": 0,
    "spl_sortmode": 0,
    "spl_orderindx": 0,
    "stealoid": 0,
    "stealmid": 0,
    "seethru": 0,
    "havestate": 1
};


/* apply.c */
/* trapinfo */
/* decl.c */
/* tbx */
/* tby */
/* toplines */
/* thrownobj */
/* tc_gbl_data */
/* hack.c */
/* tmp_anything */
/* travelmap */
/* invent.c */
/* this_type */
/* this_title */
/* muse.c */
/* trapx */
/* trapy */
/* rumors.c */
/* true_rumor_size */
/* true_rumor_start*/
/* true_rumor_end */
/* sp_lev.c */
/* themeroom_failed */
/* timeout.c */
/* timer_base */
/* topten.c */
/* toptenwin */
/* uhitm.c */
/* twohits */
/**/
/* havestate*/
export const g_init_t = {
    "trapinfo": {
        "tobj": 0
    },
    "tbx": 0,
    "tby": 0,
    "toplines": [
        0
    ],
    "thrownobj": 0,
    "tc_gbl_data": {
        "tc_AS": 0
    },
    "tmp_anything": {
        "a_void": 0
    },
    "travelmap": 0,
    "this_type": 0,
    "this_title": 0,
    "trapx": 0,
    "trapy": 0,
    "true_rumor_size": 0,
    "true_rumor_start": 0,
    "true_rumor_end": 0,
    "themeroom_failed": 0,
    "timer_base": 0,
    "toptenwin": -1,
    "twohits": 0,
    "havestate": 1
};


/* botl.c */
/* update_all */
/* decl.c */
/* unweapon */
/* role.c */
/* urole */
/* urace */
/* save.c */
/* uz_save */
/* havestate*/
export const g_init_u = {
    "update_all": 0,
    "unweapon": 0,
    "urole": {
        "name": {
            "m": 0,
            "f": 0
        },
        "rank": [
            {
                "m": 0,
                "f": 0
            }
        ],
        "lgod": 0,
        "ngod": 0,
        "cgod": 0,
        "filecode": 0,
        "homebase": 0,
        "intermed": 0,
        "mnum": -1,
        "petnum": -1,
        "ldrnum": -1,
        "guardnum": -1,
        "neminum": -1,
        "enemy1num": -1,
        "enemy2num": -1,
        "enemy1sym": 0,
        "enemy2sym": 0,
        "questarti": 0,
        "allow": 0,
        "attrbase": [
            0
        ],
        "attrdist": [
            0
        ],
        "hpadv": {
            "infix": 0
        },
        "enadv": {
            "infix": 0
        },
        "xlev": 0,
        "initrecord": 0,
        "spelbase": 0,
        "spelheal": 0,
        "spelshld": 0,
        "spelarmr": 0,
        "spelstat": 0,
        "spelspec": 0,
        "spelsbon": 0
    },
    "urace": {
        "noun": 0,
        "adj": 0,
        "coll": 0,
        "filecode": 0,
        "individual": {
            "m": 0,
            "f": 0
        },
        "mnum": -1,
        "mummynum": -1,
        "zombienum": -1,
        "allow": 0,
        "selfmask": 0,
        "lovemask": 0,
        "hatemask": 0,
        "attrmin": [
            0
        ],
        "attrmax": [
            0
        ],
        "hpadv": {
            "infix": 0
        },
        "enadv": {
            "infix": 0
        }
    },
    "uz_save": {
        "dnum": 0,
        "dlevel": 0
    },
    "havestate": 1
};


/* botl.c */
/* valset */
/* end.c */
/* valuables */
/* mhitm.c */
/* vis */
/* mklev.c */
/* vault_x */
/* vault_y */
/* mon.c */
/* vamp_rise_msg */
/* pickup.c */
/* val_for_n_or_more */
/* valid_menu_classes */
/* vision.c */
/* viz_array */
/* viz_rmin */
/* viz_rmax */
/* vision_full_recalc */
/* voice */
/* havestate*/
export const g_init_v = {
    "valset": [
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0
    ],
    "valuables": [
        {
            "list": 0
        }
    ],
    "vis": 0,
    "vault_x": 0,
    "vault_y": 0,
    "vamp_rise_msg": 0,
    "val_for_n_or_more": 0,
    "valid_menu_classes": [
        0
    ],
    "viz_array": 0,
    "viz_rmin": 0,
    "viz_rmax": 0,
    "vision_full_recalc": 0,
    "voice": {
        "serialno": 0
    },
    "havestate": 1
};


/* decl.c */
/* warn_obj_cnt */
/* wailmsg */
/* do_wear.c */
/* wasinwater */
/* symbols.c */
/* warnsyms */
/* files.c */
/* wizkit */
/* hack.c */
/* wc */
/* mkmaze.c */
/* wportal */
/* new */
/* wsettings */
/* were.c, allmain.c */
/* havestate*/
export const g_init_w = {
    "warn_obj_cnt": 0,
    "wailmsg": 0,
    "wasinwater": 0,
    "warnsyms": [
        0
    ],
    "wizkit": [
        0
    ],
    "wc": 0,
    "wportal": 0,
    "wsettings": {
        "wdmode": 0,
        "map_frame_color": 8
    },
    "were_changes": 0,
    "havestate": 1
};


/* decl.c */
/* x_maze_max */
/* lock.c */
/* xlock */
/* objnam.c */
/* xnamep */
/* sp_lev.c */
/* xstart */
/* xsize */
/* havestate*/
export const g_init_x = {
    "x_maze_max": 78,
    "xlock": {
        "door": 0
    },
    "xnamep": 0,
    "xstart": 0,
    "xsize": 0,
    "havestate": 1
};


/* decl.c */
/* y_maze_max */
/* youmonst */
/* pline.c */
/* you_buf */
/* you_buf_siz */
/* sp_lev.c */
/* ystart */
/* ysize */
/* havestate*/
export const g_init_y = {
    "y_maze_max": 20,
    "youmonst": {
        "nmon": 0
    },
    "you_buf": 0,
    "you_buf_siz": 0,
    "ystart": 0,
    "ysize": 0,
    "havestate": 1
};


/* mon.c */
/* zombify */
/* muse.c */
/* zap_oseen */
/* havestate*/
export const g_init_z = {
    "zombify": 0,
    "zap_oseen": 0,
    "havestate": 1
};


/* dungeon.c */
/* branches */
/* mkmaze.c */
/* bbubbles */
/* bases */
export const init_svb = {
    "branches": 0,
    "bbubbles": 0,
    "bases": [
        0
    ]
};


/* decl.c */
/* context */
export const init_svc = {
    "context": {
        "ident": 0
    }
};


/* dungeon.c */
/* dungeons */
/* dungeon_topology */
/* decl.c */
/* dndest */
/* doors */
/* doors_alloc */
/* o_init.c */
/* disco */
export const init_svd = {
    "dungeons": [
        {
            "dname": [
                0
            ],
            "proto": [
                0
            ],
            "fill_lvl": [
                0
            ],
            "themerms": [
                0
            ],
            "boneid": 0,
            "flags": {
                "town": 0
            },
            "entry_lev": 0,
            "num_dunlevs": 0,
            "dunlev_ureached": 0,
            "ledger_start": 0,
            "depth_start": 0
        }
    ],
    "dungeon_topology": {
        "d_oracle_level": {
            "dnum": 0
        },
        "d_bigroom_level": {
            "dnum": 0
        },
        "d_rogue_level": {
            "dnum": 0
        },
        "d_medusa_level": {
            "dnum": 0
        },
        "d_stronghold_level": {
            "dnum": 0
        },
        "d_valley_level": {
            "dnum": 0
        },
        "d_wiz1_level": {
            "dnum": 0
        },
        "d_wiz2_level": {
            "dnum": 0
        },
        "d_wiz3_level": {
            "dnum": 0
        },
        "d_juiblex_level": {
            "dnum": 0
        },
        "d_orcus_level": {
            "dnum": 0
        },
        "d_baalzebub_level": {
            "dnum": 0
        },
        "d_asmodeus_level": {
            "dnum": 0
        },
        "d_portal_level": {
            "dnum": 0
        },
        "d_sanctum_level": {
            "dnum": 0
        },
        "d_earth_level": {
            "dnum": 0
        },
        "d_water_level": {
            "dnum": 0
        },
        "d_fire_level": {
            "dnum": 0
        },
        "d_air_level": {
            "dnum": 0
        },
        "d_astral_level": {
            "dnum": 0
        },
        "d_tower_dnum": 0,
        "d_sokoban_dnum": 0,
        "d_mines_dnum": 0,
        "d_quest_dnum": 0,
        "d_tutorial_dnum": 0,
        "d_qstart_level": {
            "dnum": 0
        },
        "d_qlocate_level": {
            "dnum": 0
        },
        "d_nemesis_level": {
            "dnum": 0
        },
        "d_knox_level": {
            "dnum": 0
        },
        "d_mineend_level": {
            "dnum": 0
        },
        "d_sokoend_level": {
            "dnum": 0
        }
    },
    "dndest": {
        "lx": 0,
        "ly": 0,
        "hx": 0,
        "hy": 0,
        "nlx": 0,
        "nly": 0,
        "nhx": 0,
        "nhy": 0
    },
    "doors": 0,
    "doors_alloc": 0,
    "disco": [
        0
    ]
};


/* decl.c */
/* exclusion_zones */
export const init_sve = {
    "exclusion_zones": 0
};


/* decl.c */
/* hackpid */
export const init_svh = {
    "hackpid": 0
};


/* decl.c */
/* inv_pos */
export const init_svi = {
    "inv_pos": {
        "x": 0,
        "y": 0
    }
};


/* decl.c */
/* killer */
export const init_svk = {
    "killer": {
        "next": 0
    }
};


/* decl.c */
/* lastseentyp */
/* level.locations */
/* level.objects   */
/* level.monsters  */
/* level */
/* level_info */
export const init_svl = {
    "lastseentyp": [
        [
            0
        ]
    ],
    "level": {
        "locations": [
            [
                {
                    "glyph": 0
                }
            ]
        ],
        "objects": [
            [
                0
            ]
        ],
        "monsters": [
            [
                0
            ]
        ],
        "objlist": 0,
        "buriedobjlist": 0,
        "monlist": 0,
        "damagelist": 0,
        "bonesinfo": 0,
        "flags": {
            "nfountains": 0
        }
    },
    "level_info": [
        {
            "flags": 0
        }
    ]
};


/* dungeon.c */
/* mapseenchn */
/* decl.c */
/* moves; misnamed turn counter */
/* mvitals */
export const init_svm = {
    "mapseenchn": 0,
    "moves": 0,
    "mvitals": [
        {
            "born": 0
        }
    ]
};


/* dungeon.c */
/* n_dgns */
/* nhuuid */
/* mkroom.c */
/* nroom */
/* region.c */
/* n_regions */
export const init_svn = {
    "n_dgns": 0,
    "nhuuid": [
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0
    ],
    "nroom": 0,
    "n_regions": 0
};


/* rumors.c */
/* oracle_cnt */
/* oracle_loc */
/* other */
/* omoves */
export const init_svo = {
    "oracle_cnt": 0,
    "oracle_loc": 0,
    "omoves": 0
};


/* decl.c */
/* plname */
/* pl_character */
/* pl_fruit */
export const init_svp = {
    "plname": [
        0
    ],
    "pl_character": [
        0
    ],
    "pl_fruit": [
        0
    ]
};


/* quest.c */
/* quest_status */
export const init_svq = {
    "quest_status": {
        "first_start": 0
    }
};


/* mkroom.c */
/* rooms */
export const init_svr = {
    "rooms": [
        {
            "lx": 0
        }
    ]
};


/* decl.c */
/* spl_book */
/* sp_levchn */
export const init_svs = {
    "spl_book": [
        {
            "sp_id": 0
        }
    ],
    "sp_levchn": 0
};


/* decl.c */
/* tune */
/* timeout.c */
/* timer_id */
export const init_svt = {
    "tune": [
        0
    ],
    "timer_id": 1
};


/* decl.c */
/* updest */
export const init_svu = {
    "updest": {
        "lx": 0,
        "ly": 0,
        "hx": 0,
        "hy": 0,
        "nlx": 0,
        "nly": 0,
        "nhx": 0,
        "nhy": 0
    }
};


/* mkmaze.c */
/* xmin */
/* xmax */
export const init_svx = {
    "xmin": 0,
    "xmax": 0
};


/* wreserve */
/* wtreserved, not used currently */
export const init_svw = {
    "wreserve": 0,
    "wtreserved": 100
};


/* mkmaze.c */
/* ymin */
/* ymax */
export const init_svy = {
    "ymin": 0,
    "ymax": 0
};


export const init_program_state = {
    "gameover": 0
};


// #if 0
// struct instance_globals g;
// #endif /* 0 */

export const ga = null;

export const gb = null;

export const gc = null;

export const gd = null;

export const ge = null;

export const gf = null;

export const gg = null;

export const gh = null;

export const gi = null;

export const gj = null;

export const gk = null;

export const gl = null;

export const gm = null;

export const gn = null;

export const go = null;

export const gp = null;

export const gq = null;

export const gr = null;

export const gs = null;

export const gt = null;

export const gu = null;

export const gv = null;

export const gw = null;

export const gx = null;

export const gy = null;

export const gz = null;

export const svb = null;

export const svc = null;

export const svd = null;

export const sve = null;

export const svh = null;

export const svi = null;

export const svk = null;

export const svl = null;

export const svm = null;

export const svn = null;

export const svo = null;

export const svp = null;

export const svq = null;

export const svr = null;

export const svs = null;

export const svt = null;

export const svu = null;

export const svw = null;

export const svx = null;

export const svy = null;

export const program_state = null;


/* zeroobj */
/* zeromonst */
/* zeroany */
/* zeroNhRect */
export const cg = {
    "zeroobj": {
        "nobj": 0
    },
    "zeromonst": {
        "nmon": 0
    },
    "zeroany": {
        "a_void": 0
    },
    "zeroNhRect": {
        "lx": 0
    }
};


function ZERO(value) { C.zero(value); }
function MAGICCHECK(xx, name) {
    do {
        if (xx.havestate != 1) {
            C.raw_printf("decl_globals_init: %s.havestate not True.", name);
            C.exit(1);
        }
    } while (0);
}

export function program_state_init()
{
    C.copy(C.program_state, C.init_program_state);
}

export function decl_globals_init()
{
// #if 0
//     g = g_init;
// #endif
    C.copy(C.ga, C.g_init_a);
    C.copy(C.gb, C.g_init_b);
    C.copy(C.gc, C.g_init_c);
    C.copy(C.gd, C.g_init_d);
    C.copy(C.ge, C.g_init_e);
    C.copy(C.gf, C.g_init_f);
    C.copy(C.gg, C.g_init_g);
    C.copy(C.gh, C.g_init_h);
    C.copy(C.gi, C.g_init_i);
    C.copy(C.gj, C.g_init_j);
    C.copy(C.gk, C.g_init_k);
    C.copy(C.gl, C.g_init_l);
    C.copy(C.gm, C.g_init_m);
    C.copy(C.gn, C.g_init_n);
    C.copy(C.go, C.g_init_o);
    C.copy(C.gp, C.g_init_p);
    C.copy(C.gq, C.g_init_q);
    C.copy(C.gr, C.g_init_r);
    C.copy(C.gs, C.g_init_s);
    C.copy(C.gt, C.g_init_t);
    C.copy(C.gu, C.g_init_u);
    C.copy(C.gv, C.g_init_v);
    C.copy(C.gw, C.g_init_w);
    C.copy(C.gx, C.g_init_x);
    C.copy(C.gy, C.g_init_y);
    C.copy(C.gz, C.g_init_z);
    C.copy(C.svb, C.init_svb);
    C.copy(C.svc, C.init_svc);
    C.copy(C.svd, C.init_svd);
    C.copy(C.sve, C.init_sve);
    C.copy(C.svh, C.init_svh);
    C.copy(C.svi, C.init_svi);
    C.copy(C.svk, C.init_svk);
    C.copy(C.svl, C.init_svl);
    C.copy(C.svm, C.init_svm);
    C.copy(C.svn, C.init_svn);
    C.copy(C.svo, C.init_svo);
    C.copy(C.svp, C.init_svp);
    C.copy(C.svq, C.init_svq);
    C.copy(C.svr, C.init_svr);
    C.copy(C.svs, C.init_svs);
    C.copy(C.svt, C.init_svt);
    C.copy(C.svu, C.init_svu);
    C.copy(C.svw, C.init_svw);
    C.copy(C.svx, C.init_svx);
    C.copy(C.svy, C.init_svy);

    C.gv.valuables[0].list = C.gg.gems;
    C.gv.valuables[0].size = C.gg.gems.length;
    C.gv.valuables[1].list = C.ga.amulets;
    C.gv.valuables[1].size = C.ga.amulets.length;
    C.gv.valuables[2].list = 0;
    C.gv.valuables[2].size = 0;

// #if 0
//     MAGICCHECK(g_init);
// #endif
    MAGICCHECK(C.g_init_a, "g_init_a");
    MAGICCHECK(C.g_init_b, "g_init_b");
    MAGICCHECK(C.g_init_c, "g_init_c");
    MAGICCHECK(C.g_init_d, "g_init_d");
    MAGICCHECK(C.g_init_e, "g_init_e");
    MAGICCHECK(C.g_init_f, "g_init_f");
    MAGICCHECK(C.g_init_g, "g_init_g");
    MAGICCHECK(C.g_init_h, "g_init_h");
    MAGICCHECK(C.g_init_i, "g_init_i");
    MAGICCHECK(C.g_init_j, "g_init_j");
    MAGICCHECK(C.g_init_k, "g_init_k");
    MAGICCHECK(C.g_init_l, "g_init_l");
    MAGICCHECK(C.g_init_m, "g_init_m");
    MAGICCHECK(C.g_init_n, "g_init_n");
    MAGICCHECK(C.g_init_o, "g_init_o");
    MAGICCHECK(C.g_init_p, "g_init_p");
    MAGICCHECK(C.g_init_q, "g_init_q");
    MAGICCHECK(C.g_init_r, "g_init_r");
    MAGICCHECK(C.g_init_s, "g_init_s");
    MAGICCHECK(C.g_init_t, "g_init_t");
    MAGICCHECK(C.g_init_u, "g_init_u");
    MAGICCHECK(C.g_init_v, "g_init_v");
    MAGICCHECK(C.g_init_w, "g_init_w");
    MAGICCHECK(C.g_init_x, "g_init_x");
    MAGICCHECK(C.g_init_y, "g_init_y");
    MAGICCHECK(C.g_init_z, "g_init_z");

    C.gs.subrooms = C.svr.rooms[C.MAXNROFROOMS + 1];

    ZERO(C.cell("flags"));
    ZERO(C.cell("iflags"));
    ZERO(C.cell("a11y"));
    ZERO(C.cell("disp"));
    ZERO(C.cell("u"));
    ZERO(C.cell("ubirthday"));
    ZERO(C.cell("urealtime"));

    C.uwep = C.uarm = C.uswapwep = C.uquiver = C.uarmu = C.uskin = C.uarmc = 0;
    C.uarmh = C.uarms = C.uarmg = C.uarmf = C.uamul = C.uright = C.uleft = 0;
    C.ublindf = C.uchain = C.uball = 0;

    C.WIN_MESSAGE =  C.WIN_STATUS =  C.WIN_MAP = C.WIN_INVEN = C.WIN_ERR;

    C.gu.urole = C.urole_init_data;
    C.gu.urace = C.urace_init_data;
}

/* fields in 'hands_obj' don't matter, just its distinct address */
export const hands_obj = {
    "nobj": 0
};


/* gcc 12.2's static analyzer thinks that some fields of svc.context.victual
   are uninitialized when compiling 'bite(eat.c)' but that's impossible;
   it is defined at global scope so guaranteed to be given implicit
   initialization for fields that aren't explicitly initialized (all of
   'context'); having bite() pass &svc.context.victual to this no-op
   eliminates the analyzer's very verbose complaint */
export function sa_victual(context_victual)
{
    return;
}

/*decl.c*/

export const declInitializers = {nhcb_name, nhcb_counts, c_color_names, c_obj_colors, c_common_strings, disclosure_options, emptystr, flags, hexdd, xdir, ydir, zdir, dirs_ord, has_strong_rngseed, head_engr, iflags, a11y, materialnm, quitchars, shield_static, u, ubirthday, urealtime, uwep, uarm, uswapwep, uquiver, uarmu, uskin, uarmc, uarmh, uarms, uarmg, uarmf, uamul, uright, uleft, ublindf, uchain, uball, vowels, WIN_MESSAGE, WIN_STATUS, WIN_MAP, WIN_INVEN, ynchars, ynqchars, ynaqchars, ynNaqchars, rightleftchars, hidespinchars, yn_number, ARGV0, urole_init_data, urace_init_data, disp, g_init_a, g_init_b, g_init_c, g_init_d, g_init_e, g_init_f, g_init_g, g_init_h, g_init_i, g_init_j, g_init_k, g_init_l, g_init_m, g_init_n, g_init_o, g_init_p, g_init_q, g_init_r, g_init_s, g_init_t, g_init_u, g_init_v, g_init_w, g_init_x, g_init_y, g_init_z, init_svb, init_svc, init_svd, init_sve, init_svh, init_svi, init_svk, init_svl, init_svm, init_svn, init_svo, init_svp, init_svq, init_svr, init_svs, init_svt, init_svu, init_svx, init_svw, init_svy, init_program_state, ga, gb, gc, gd, ge, gf, gg, gh, gi, gj, gk, gl, gm, gn, go, gp, gq, gr, gs, gt, gu, gv, gw, gx, gy, gz, svb, svc, svd, sve, svh, svi, svk, svl, svm, svn, svo, svp, svq, svr, svs, svt, svu, svw, svx, svy, program_state, cg, hands_obj};
