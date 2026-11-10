/* NetHack 5.0	drawing.c	$NHDT-Date: 1596498163 2020/08/03 23:42:43 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.78 $ */
/* Copyright (c) NetHack Development Team 1992.                   */
/* NetHack may be freely redistributed.  See license for details. */



import constants from '../wasm/drawing-constants.json' with { type: 'json' };

const {
    BALL_SYM,
    CHAIN_SYM,
    CLR_BLACK,
    CLR_BLUE,
    CLR_BRIGHT_BLUE,
    CLR_BRIGHT_GREEN,
    CLR_BRIGHT_MAGENTA,
    CLR_BROWN,
    CLR_CYAN,
    CLR_GRAY,
    CLR_GREEN,
    CLR_MAGENTA,
    CLR_ORANGE,
    CLR_RED,
    CLR_WHITE,
    CLR_YELLOW,
    GEM_SYM,
    HI_GOLD,
    HI_METAL,
    HI_WOOD,
    HI_ZAP,
    ILLOBJ_SYM,
    MAXMCLASSES,
    MAXOCLASSES,
    MAXPCHARS,
    NO_COLOR,
    POTION_SYM,
    RING_SYM,
    ROCK_SYM,
    SCROLL_SYM,
    SPBOOK_SYM,
    TOOL_SYM,
    VENOM_SYM,
    WAND_SYM,
    WEAPON_SYM,
} = constants;

/* JavaScript translation of drawing.c. The original defsym.h DRAWING
 * projections are expanded into readable authoritative data below, retaining
 * their row comments and symbol labels. C character literals become numeric
 * code points; named colors and rogue symbols come from compiler metadata.
 * A separate ABI initializer copies these tables into zero-only C storage
 * before any game code runs. No table values remain in C initializers.
 * The furniture comparisons use equivalent ASCII string operations; its
 * unsigned-char cast remains explicit. All three function boundaries remain.
 */

/* Relevant header information in rm.h, objclass.h, sym.h, defsym.h. */

/* Default object class symbols.  See objclass.h.
 * {symbol, name, explain}
 *     name:    used in object_detect().
 *     explain: used in do_look().
 */
export const def_oc_syms = [
    { sym: '\0'.charCodeAt(0), name: "", explain: "" }, /* placeholder for the "random class" */
    { sym: ']'.charCodeAt(0), name: "illegal objects", explain: "strange object" }, /* S_strange_obj: 1 */
    { sym: ')'.charCodeAt(0), name: "weapons", explain: "weapon" }, /* S_weapon: 2 */
    { sym: '['.charCodeAt(0), name: "armor", explain: "suit or piece of armor" }, /* S_armor: 3 */
    { sym: '='.charCodeAt(0), name: "rings", explain: "ring" }, /* S_ring: 4 */
    { sym: '"'.charCodeAt(0), name: "amulets", explain: "amulet" }, /* S_amulet: 5 */
    { sym: '('.charCodeAt(0), name: "tools", explain: "useful item (pick-axe, key, lamp...)" }, /* S_tool: 6 */
    { sym: '%'.charCodeAt(0), name: "food", explain: "piece of food" }, /* S_food: 7 */
    { sym: '!'.charCodeAt(0), name: "potions", explain: "potion" }, /* S_potion: 8 */
    { sym: '?'.charCodeAt(0), name: "scrolls", explain: "scroll" }, /* S_scroll: 9 */
    { sym: '+'.charCodeAt(0), name: "spellbooks", explain: "spellbook" }, /* S_book: 10 */
    { sym: '/'.charCodeAt(0), name: "wands", explain: "wand" }, /* S_wand: 11 */
    { sym: '$'.charCodeAt(0), name: "coins", explain: "pile of coins" }, /* S_coin: 12 */
    { sym: '*'.charCodeAt(0), name: "rocks", explain: "gem or rock" }, /* S_gem: 13 */
    { sym: '`'.charCodeAt(0), name: "large stones", explain: "boulder or statue" }, /* S_rock: 14 */
    { sym: '0'.charCodeAt(0), name: "iron balls", explain: "iron ball" }, /* S_ball: 15 */
    { sym: '_'.charCodeAt(0), name: "chains", explain: "iron chain" }, /* S_chain: 16 */
    { sym: '.'.charCodeAt(0), name: "venoms", explain: "splash of venom" }, /* S_venom: 17 */

];

/* Default monster class symbols.  See sym.h and defsym.h. */
export const def_monsyms = [
    { sym: '\0'.charCodeAt(0), name: "", explain: "" },
    { sym: 'a'.charCodeAt(0), name: "", explain: "ant or other insect" }, /* S_ANT: 1 */
    { sym: 'b'.charCodeAt(0), name: "", explain: "blob" }, /* S_BLOB: 2 */
    { sym: 'c'.charCodeAt(0), name: "", explain: "cockatrice" }, /* S_COCKATRICE: 3 */
    { sym: 'd'.charCodeAt(0), name: "", explain: "dog or other canine" }, /* S_DOG: 4 */
    { sym: 'e'.charCodeAt(0), name: "", explain: "eye or sphere" }, /* S_EYE: 5 */
    { sym: 'f'.charCodeAt(0), name: "", explain: "cat or other feline" }, /* S_FELINE: 6 */
    { sym: 'g'.charCodeAt(0), name: "", explain: "gremlin" }, /* S_GREMLIN: 7 */
    /* small humanoids: hobbit, dwarf */
    { sym: 'h'.charCodeAt(0), name: "", explain: "humanoid" }, /* S_HUMANOID: 8 */
    /* minor demons */
    { sym: 'i'.charCodeAt(0), name: "", explain: "imp or minor demon" }, /* S_IMP: 9 */
    { sym: 'j'.charCodeAt(0), name: "", explain: "jelly" }, /* S_JELLY: 10 */
    { sym: 'k'.charCodeAt(0), name: "", explain: "kobold" }, /* S_KOBOLD: 11 */
    { sym: 'l'.charCodeAt(0), name: "", explain: "leprechaun" }, /* S_LEPRECHAUN: 12 */
    { sym: 'm'.charCodeAt(0), name: "", explain: "mimic" }, /* S_MIMIC: 13 */
    { sym: 'n'.charCodeAt(0), name: "", explain: "nymph" }, /* S_NYMPH: 14 */
    { sym: 'o'.charCodeAt(0), name: "", explain: "orc" }, /* S_ORC: 15 */
    { sym: 'p'.charCodeAt(0), name: "", explain: "piercer" }, /* S_PIERCER: 16 */
    /* quadruped excludes horses */
    { sym: 'q'.charCodeAt(0), name: "", explain: "quadruped" }, /* S_QUADRUPED: 17 */
    { sym: 'r'.charCodeAt(0), name: "", explain: "rodent" }, /* S_RODENT: 18 */
    { sym: 's'.charCodeAt(0), name: "", explain: "arachnid or centipede" }, /* S_SPIDER: 19 */
    { sym: 't'.charCodeAt(0), name: "", explain: "trapper or lurker above" }, /* S_TRAPPER: 20 */
    /* unicorn, horses */
    { sym: 'u'.charCodeAt(0), name: "", explain: "unicorn or horse" }, /* S_UNICORN: 21 */
    { sym: 'v'.charCodeAt(0), name: "", explain: "vortex" }, /* S_VORTEX: 22 */
    { sym: 'w'.charCodeAt(0), name: "", explain: "worm" }, /* S_WORM: 23 */
    { sym: 'x'.charCodeAt(0), name: "", explain: "xan or other mythical/fantastic insect" }, /* S_XAN: 24 */
    /* yellow light, black light */
    { sym: 'y'.charCodeAt(0), name: "", explain: "light" }, /* S_LIGHT: 25 */
    { sym: 'z'.charCodeAt(0), name: "", explain: "zruty" }, /* S_ZRUTY: 26 */
    { sym: 'A'.charCodeAt(0), name: "", explain: "angelic being" }, /* S_ANGEL: 27 */
    { sym: 'B'.charCodeAt(0), name: "", explain: "bat or bird" }, /* S_BAT: 28 */
    { sym: 'C'.charCodeAt(0), name: "", explain: "centaur" }, /* S_CENTAUR: 29 */
    { sym: 'D'.charCodeAt(0), name: "", explain: "dragon" }, /* S_DRAGON: 30 */
    /* elemental includes invisible stalker */
    { sym: 'E'.charCodeAt(0), name: "", explain: "elemental" }, /* S_ELEMENTAL: 31 */
    { sym: 'F'.charCodeAt(0), name: "", explain: "fungus or mold" }, /* S_FUNGUS: 32 */
    { sym: 'G'.charCodeAt(0), name: "", explain: "gnome" }, /* S_GNOME: 33 */
    /* large humanoid: giant, ettin, minotaur */
    { sym: 'H'.charCodeAt(0), name: "", explain: "giant humanoid" }, /* S_GIANT: 34 */
    { sym: 'I'.charCodeAt(0), name: "", explain: "invisible monster" }, /* S_invisible: 35 */
    { sym: 'J'.charCodeAt(0), name: "", explain: "jabberwock" }, /* S_JABBERWOCK: 36 */
    { sym: 'K'.charCodeAt(0), name: "", explain: "Keystone Kop" }, /* S_KOP: 37 */
    { sym: 'L'.charCodeAt(0), name: "", explain: "lich" }, /* S_LICH: 38 */
    { sym: 'M'.charCodeAt(0), name: "", explain: "mummy" }, /* S_MUMMY: 39 */
    { sym: 'N'.charCodeAt(0), name: "", explain: "naga" }, /* S_NAGA: 40 */
    { sym: 'O'.charCodeAt(0), name: "", explain: "ogre" }, /* S_OGRE: 41 */
    { sym: 'P'.charCodeAt(0), name: "", explain: "pudding or ooze" }, /* S_PUDDING: 42 */
    { sym: 'Q'.charCodeAt(0), name: "", explain: "quantum mechanic" }, /* S_QUANTMECH: 43 */
    { sym: 'R'.charCodeAt(0), name: "", explain: "rust monster or disenchanter" }, /* S_RUSTMONST: 44 */
    { sym: 'S'.charCodeAt(0), name: "", explain: "snake" }, /* S_SNAKE: 45 */
    { sym: 'T'.charCodeAt(0), name: "", explain: "troll" }, /* S_TROLL: 46 */
    /* umber hulk */
    { sym: 'U'.charCodeAt(0), name: "", explain: "umber hulk" }, /* S_UMBER: 47 */
    { sym: 'V'.charCodeAt(0), name: "", explain: "vampire" }, /* S_VAMPIRE: 48 */
    { sym: 'W'.charCodeAt(0), name: "", explain: "wraith" }, /* S_WRAITH: 49 */
    { sym: 'X'.charCodeAt(0), name: "", explain: "xorn" }, /* S_XORN: 50 */
    /* apelike creature includes owlbear, monkey */
    { sym: 'Y'.charCodeAt(0), name: "", explain: "apelike creature" }, /* S_YETI: 51 */
    { sym: 'Z'.charCodeAt(0), name: "", explain: "zombie" }, /* S_ZOMBIE: 52 */
    { sym: '@'.charCodeAt(0), name: "", explain: "human or elf" }, /* S_HUMAN: 53 */
    /* space symbol*/
    { sym: ' '.charCodeAt(0), name: "", explain: "ghost" }, /* S_GHOST: 54 */
    { sym: '\''.charCodeAt(0), name: "", explain: "golem" }, /* S_GOLEM: 55 */
    { sym: '&'.charCodeAt(0), name: "", explain: "major demon" }, /* S_DEMON: 56 */
    /* fish */
    { sym: ';'.charCodeAt(0), name: "", explain: "sea monster" }, /* S_EEL: 57 */
    /* reptiles */
    { sym: ':'.charCodeAt(0), name: "", explain: "lizard" }, /* S_LIZARD: 58 */
    { sym: '~'.charCodeAt(0), name: "", explain: "long worm tail" }, /* S_WORM_TAIL: 59 */
    { sym: ']'.charCodeAt(0), name: "", explain: "mimic" }, /* S_MIMIC_DEF: 60 */

];

export const def_warnsyms = [
    /* white warning  */
    { sym: '0'.charCodeAt(0), explanation: "unknown creature causing you worry", color: CLR_WHITE },
    /* pink warning   */
    { sym: '1'.charCodeAt(0), explanation: "unknown creature causing you concern", color: CLR_RED },
    /* red warning    */
    { sym: '2'.charCodeAt(0), explanation: "unknown creature causing you anxiety", color: CLR_RED },
    /* ruby warning   */
    { sym: '3'.charCodeAt(0), explanation: "unknown creature causing you disquiet", color: CLR_RED },
    /* purple warning */
    { sym: '4'.charCodeAt(0), explanation: "unknown creature causing you alarm", color: CLR_MAGENTA },
    /* black warning  */
    { sym: '5'.charCodeAt(0), explanation: "unknown creature causing you dread", color: CLR_BRIGHT_MAGENTA },
];

/*
 *  Default screen symbols with explanations and colors.
 *
 *  If adding to or removing from this list, please note that,
 *  for builds with tile support, there is an array called altlabels[] in
 *  win/share/tilemap.c that requires the same number of elements as
 *  this, in the same order. It is used for tile name matching when
 *  parsing other.txt because some of the useful tile names don't exist
 *  within NetHack itself.
 */
export const defsyms = [
    { sym: ' '.charCodeAt(0), explanation: "stone", color: NO_COLOR }, /* S_stone: 0 */
    { sym: '|'.charCodeAt(0), explanation: "wall", color: CLR_GRAY }, /* S_vwall: 1 */
    { sym: '-'.charCodeAt(0), explanation: "wall", color: CLR_GRAY }, /* S_hwall: 2 */
    { sym: '-'.charCodeAt(0), explanation: "wall", color: CLR_GRAY }, /* S_tlcorn: 3 */
    { sym: '-'.charCodeAt(0), explanation: "wall", color: CLR_GRAY }, /* S_trcorn: 4 */
    { sym: '-'.charCodeAt(0), explanation: "wall", color: CLR_GRAY }, /* S_blcorn: 5 */
    { sym: '-'.charCodeAt(0), explanation: "wall", color: CLR_GRAY }, /* S_brcorn: 6 */
    { sym: '-'.charCodeAt(0), explanation: "wall", color: CLR_GRAY }, /* S_crwall: 7 */
    { sym: '-'.charCodeAt(0), explanation: "wall", color: CLR_GRAY }, /* S_tuwall: 8 */
    { sym: '-'.charCodeAt(0), explanation: "wall", color: CLR_GRAY }, /* S_tdwall: 9 */
    { sym: '|'.charCodeAt(0), explanation: "wall", color: CLR_GRAY }, /* S_tlwall: 10 */
    { sym: '|'.charCodeAt(0), explanation: "wall", color: CLR_GRAY }, /* S_trwall: 11 */
    /* start cmap A                                                      */
    { sym: '.'.charCodeAt(0), explanation: "doorway", color: CLR_GRAY }, /* S_ndoor: 12 */
    { sym: '-'.charCodeAt(0), explanation: "open door", color: CLR_BROWN }, /* S_vodoor: 13 */
    { sym: '|'.charCodeAt(0), explanation: "open door", color: CLR_BROWN }, /* S_hodoor: 14 */
    { sym: '+'.charCodeAt(0), explanation: "closed door", color: CLR_BROWN }, /* S_vcdoor: 15 */
    { sym: '+'.charCodeAt(0), explanation: "closed door", color: CLR_BROWN }, /* S_hcdoor: 16 */
    { sym: '#'.charCodeAt(0), explanation: "iron bars", color: HI_METAL }, /* S_bars: 17 */
    { sym: '#'.charCodeAt(0), explanation: "tree", color: CLR_GREEN }, /* S_tree: 18 */
    { sym: '.'.charCodeAt(0), explanation: "floor of a room", color: CLR_GRAY }, /* S_room: 19 */
    { sym: '.'.charCodeAt(0), explanation: "dark part of a room", color: CLR_BLACK }, /* S_darkroom: 20 */
    { sym: '`'.charCodeAt(0), explanation: "engraving", color: CLR_BRIGHT_BLUE }, /* S_engroom: 21 */
    { sym: '#'.charCodeAt(0), explanation: "corridor", color: CLR_GRAY }, /* S_corr: 22 */
    { sym: '#'.charCodeAt(0), explanation: "lit corridor", color: CLR_GRAY }, /* S_litcorr: 23 */
    { sym: '#'.charCodeAt(0), explanation: "engraving", color: CLR_BRIGHT_BLUE }, /* S_engrcorr: 24 */
    { sym: '<'.charCodeAt(0), explanation: "staircase up", color: CLR_GRAY }, /* S_upstair: 25 */
    { sym: '>'.charCodeAt(0), explanation: "staircase down", color: CLR_GRAY }, /* S_dnstair: 26 */
    { sym: '<'.charCodeAt(0), explanation: "ladder up", color: CLR_BROWN }, /* S_upladder: 27 */
    { sym: '>'.charCodeAt(0), explanation: "ladder down", color: CLR_BROWN }, /* S_dnladder: 28 */
    { sym: '<'.charCodeAt(0), explanation: "branch staircase up", color: CLR_YELLOW }, /* S_brupstair: 29 */
    { sym: '>'.charCodeAt(0), explanation: "branch staircase down", color: CLR_YELLOW }, /* S_brdnstair: 30 */
    { sym: '<'.charCodeAt(0), explanation: "branch ladder up", color: CLR_YELLOW }, /* S_brupladder: 31 */
    { sym: '>'.charCodeAt(0), explanation: "branch ladder down", color: CLR_YELLOW }, /* S_brdnladder: 32 */
    /* end cmap A */
    { sym: '_'.charCodeAt(0), explanation: "altar", color: CLR_GRAY }, /* S_altar: 33 */
    /* start cmap B */
    { sym: '|'.charCodeAt(0), explanation: "grave", color: CLR_WHITE }, /* S_grave: 34 */
    { sym: '\\'.charCodeAt(0), explanation: "opulent throne", color: HI_GOLD }, /* S_throne: 35 */
    { sym: '{'.charCodeAt(0), explanation: "sink", color: CLR_WHITE }, /* S_sink: 36 */
    { sym: '{'.charCodeAt(0), explanation: "fountain", color: CLR_BRIGHT_BLUE }, /* S_fountain: 37 */
    /* the S_pool symbol is used for both POOL terrain and MOAT terrain */
    { sym: '}'.charCodeAt(0), explanation: "water", color: CLR_BLUE }, /* S_pool: 38 */
    { sym: '.'.charCodeAt(0), explanation: "ice", color: CLR_CYAN }, /* S_ice: 39 */
    { sym: '}'.charCodeAt(0), explanation: "molten lava", color: CLR_RED }, /* S_lava: 40 */
    { sym: '}'.charCodeAt(0), explanation: "wall of lava", color: CLR_ORANGE }, /* S_lavawall: 41 */
    { sym: '.'.charCodeAt(0), explanation: "lowered drawbridge", color: CLR_BROWN }, /* S_vodbridge: 42 */
    { sym: '.'.charCodeAt(0), explanation: "lowered drawbridge", color: CLR_BROWN }, /* S_hodbridge: 43 */
    { sym: '#'.charCodeAt(0), explanation: "raised drawbridge", color: CLR_BROWN }, /* S_vcdbridge: 44 */
    { sym: '#'.charCodeAt(0), explanation: "raised drawbridge", color: CLR_BROWN }, /* S_hcdbridge: 45 */
    { sym: ' '.charCodeAt(0), explanation: "air", color: CLR_CYAN }, /* S_air: 46 */
    { sym: '#'.charCodeAt(0), explanation: "cloud", color: CLR_GRAY }, /* S_cloud: 47 */
    /* the S_water symbol is used for WATER terrain: wall of water in the
       dungeon and Plane of Water in the endgame */
    { sym: '}'.charCodeAt(0), explanation: "water", color: CLR_BRIGHT_BLUE }, /* S_water: 48 */
    /* end dungeon characters                                          */
    /*                                                                 */
    /* begin traps                                                     */
    /*                                                                 */
    { sym: '^'.charCodeAt(0), explanation: "arrow trap", color: HI_METAL }, /* S_arrow_trap: 49 */
    { sym: '^'.charCodeAt(0), explanation: "dart trap", color: HI_METAL }, /* S_dart_trap: 50 */
    { sym: '^'.charCodeAt(0), explanation: "falling rock trap", color: CLR_GRAY }, /* S_falling_rock_trap: 51 */
    { sym: '^'.charCodeAt(0), explanation: "squeaky board", color: CLR_BROWN }, /* S_squeaky_board: 52 */
    { sym: '^'.charCodeAt(0), explanation: "bear trap", color: HI_METAL }, /* S_bear_trap: 53 */
    { sym: '^'.charCodeAt(0), explanation: "land mine", color: CLR_RED }, /* S_land_mine: 54 */
    { sym: '^'.charCodeAt(0), explanation: "rolling boulder trap", color: CLR_GRAY }, /* S_rolling_boulder_trap: 55 */
    { sym: '^'.charCodeAt(0), explanation: "sleeping gas trap", color: HI_ZAP }, /* S_sleeping_gas_trap: 56 */
    { sym: '^'.charCodeAt(0), explanation: "rust trap", color: CLR_BLUE }, /* S_rust_trap: 57 */
    { sym: '^'.charCodeAt(0), explanation: "fire trap", color: CLR_ORANGE }, /* S_fire_trap: 58 */
    { sym: '^'.charCodeAt(0), explanation: "pit", color: CLR_BLACK }, /* S_pit: 59 */
    { sym: '^'.charCodeAt(0), explanation: "spiked pit", color: CLR_BLACK }, /* S_spiked_pit: 60 */
    { sym: '^'.charCodeAt(0), explanation: "hole", color: CLR_BROWN }, /* S_hole: 61 */
    { sym: '^'.charCodeAt(0), explanation: "trap door", color: CLR_BROWN }, /* S_trap_door: 62 */
    { sym: '^'.charCodeAt(0), explanation: "teleportation trap", color: CLR_MAGENTA }, /* S_teleportation_trap: 63 */
    { sym: '^'.charCodeAt(0), explanation: "level teleporter", color: CLR_MAGENTA }, /* S_level_teleporter: 64 */
    { sym: '^'.charCodeAt(0), explanation: "magic portal", color: CLR_BRIGHT_MAGENTA }, /* S_magic_portal: 65 */
    { sym: '"'.charCodeAt(0), explanation: "web", color: CLR_GRAY }, /* S_web: 66 */
    { sym: '^'.charCodeAt(0), explanation: "statue trap", color: CLR_GRAY }, /* S_statue_trap: 67 */
    { sym: '^'.charCodeAt(0), explanation: "magic trap", color: HI_ZAP }, /* S_magic_trap: 68 */
    { sym: '^'.charCodeAt(0), explanation: "anti-magic field", color: HI_ZAP }, /* S_anti_magic_trap: 69 */
    { sym: '^'.charCodeAt(0), explanation: "polymorph trap", color: CLR_BRIGHT_GREEN }, /* S_polymorph_trap: 70 */
    { sym: '~'.charCodeAt(0), explanation: "vibrating square", color: CLR_MAGENTA }, /* S_vibrating_square: 71 */
    { sym: '^'.charCodeAt(0), explanation: "trapped door", color: CLR_ORANGE }, /* S_trapped_door: 72 */
    { sym: '^'.charCodeAt(0), explanation: "trapped chest", color: CLR_ORANGE }, /* S_trapped_chest: 73 */
    /* end traps                                                       */
    /* end cmap B */
    /*                                                                   */
    /* begin special effects                                             */
    /*                                                                   */
    /* zap colors are changed by reset_glyphmap() to match type of beam */
    /*                                                                   */
    { sym: '|'.charCodeAt(0), explanation: "", color: CLR_GRAY }, /* S_vbeam: 74 */
    { sym: '-'.charCodeAt(0), explanation: "", color: CLR_GRAY }, /* S_hbeam: 75 */
    { sym: '\\'.charCodeAt(0), explanation: "", color: CLR_GRAY }, /* S_lslant: 76 */
    { sym: '/'.charCodeAt(0), explanation: "", color: CLR_GRAY }, /* S_rslant: 77 */
    /* start cmap C */
    { sym: '*'.charCodeAt(0), explanation: "", color: CLR_WHITE }, /* S_digbeam: 78 */
    { sym: '!'.charCodeAt(0), explanation: "", color: CLR_WHITE }, /* S_flashbeam: 79 */
    { sym: ')'.charCodeAt(0), explanation: "", color: HI_WOOD }, /* S_boomleft: 80 */
    { sym: '('.charCodeAt(0), explanation: "", color: HI_WOOD }, /* S_boomright: 81 */
    /* 4 magic shield symbols                                          */
    { sym: '0'.charCodeAt(0), explanation: "", color: HI_ZAP }, /* S_ss1: 82 */
    { sym: '#'.charCodeAt(0), explanation: "", color: HI_ZAP }, /* S_ss2: 83 */
    { sym: '@'.charCodeAt(0), explanation: "", color: HI_ZAP }, /* S_ss3: 84 */
    { sym: '*'.charCodeAt(0), explanation: "", color: HI_ZAP }, /* S_ss4: 85 */
    { sym: '#'.charCodeAt(0), explanation: "poison cloud", color: CLR_BRIGHT_GREEN }, /* S_poisoncloud: 86 */
    /* for a time S_goodpos was a question mark, but dollar sign is the
       default keystroke for getpos() to toggle goodpos glyphs on or off */
    { sym: '$'.charCodeAt(0), explanation: "valid position", color: HI_ZAP }, /* S_goodpos: 87 */
    /* end cmap C */
    /*                                                             */
    /* The 8 swallow symbols.  Do NOT separate.                    */
    /* To change order or add, see the function swallow_to_glyph() */
    /* in display.c. swallow colors are changed by                 */
    /* reset_glyphmap() to match the engulfing monst.              */
    /*                                                             */
    /*  Order:                                                     */
    /*                                                             */
    /*      1 2 3                                                  */
    /*      4 5 6                                                  */
    /*      7 8 9                                                  */
    /*                                                             */
    { sym: '/'.charCodeAt(0), explanation: "", color: CLR_GREEN }, /* S_sw_tl: 88 */      /*1*/
    { sym: '-'.charCodeAt(0), explanation: "", color: CLR_GREEN }, /* S_sw_tc: 89 */    /*2*/
    { sym: '\\'.charCodeAt(0), explanation: "", color: CLR_GREEN }, /* S_sw_tr: 90 */     /*3*/
    { sym: '|'.charCodeAt(0), explanation: "", color: CLR_GREEN }, /* S_sw_ml: 91 */   /*4*/
    { sym: '|'.charCodeAt(0), explanation: "", color: CLR_GREEN }, /* S_sw_mr: 92 */  /*6*/
    { sym: '\\'.charCodeAt(0), explanation: "", color: CLR_GREEN }, /* S_sw_bl: 93 */   /*7*/
    { sym: '-'.charCodeAt(0), explanation: "", color: CLR_GREEN }, /* S_sw_bc: 94 */ /*8*/
    { sym: '/'.charCodeAt(0), explanation: "", color: CLR_GREEN }, /* S_sw_br: 95 */  /*9*/
    /*                                                             */
    /* explosion colors are changed by reset_glyphmap() to match   */
    /* the type of expl.                                           */
    /*                                                             */
    /*    Ex.                                                      */
    /*                                                             */
    /*      /-\                                                    */
    /*      |@|                                                    */
    /*      \-/                                                    */
    /*                                                             */
    { sym: '/'.charCodeAt(0), explanation: "", color: CLR_ORANGE }, /* S_expl_tl: 96 */
    { sym: '-'.charCodeAt(0), explanation: "", color: CLR_ORANGE }, /* S_expl_tc: 97 */
    { sym: '\\'.charCodeAt(0), explanation: "", color: CLR_ORANGE }, /* S_expl_tr: 98 */
    { sym: '|'.charCodeAt(0), explanation: "", color: CLR_ORANGE }, /* S_expl_ml: 99 */
    { sym: ' '.charCodeAt(0), explanation: "", color: CLR_ORANGE }, /* S_expl_mc: 100 */
    { sym: '|'.charCodeAt(0), explanation: "", color: CLR_ORANGE }, /* S_expl_mr: 101 */
    { sym: '\\'.charCodeAt(0), explanation: "", color: CLR_ORANGE }, /* S_expl_bl: 102 */
    { sym: '-'.charCodeAt(0), explanation: "", color: CLR_ORANGE }, /* S_expl_bc: 103 */
    { sym: '/'.charCodeAt(0), explanation: "", color: CLR_ORANGE }, /* S_expl_br: 104 */
    { sym: 0, explanation: null, color: NO_COLOR }
];

/* default rogue level symbols */
export const def_r_oc_syms = [
/* 0*/ '\0'.charCodeAt(0), ILLOBJ_SYM, WEAPON_SYM, ']'.charCodeAt(0), /* armor */
       RING_SYM,
/* 5*/ ','.charCodeAt(0),                     /* amulet */
       TOOL_SYM, ':'.charCodeAt(0),           /* food */
       POTION_SYM, SCROLL_SYM,
/*10*/ SPBOOK_SYM, WAND_SYM,
       GEM_SYM,                /* gold -- yes it's the same as gems */
       GEM_SYM, ROCK_SYM,
/*15*/ BALL_SYM, CHAIN_SYM, VENOM_SYM
];

/*
 * Convert the given character to an object class.  If the character is not
 * recognized, then MAXOCLASSES is returned.  Used in detect.c, drawing.c,
 * invent.c, o_init.c, objnam.c, options.c, pickup.c, sp_lev.c, and
 * windows.c.
 */
export function def_char_to_objclass(ch)
{
    let i;

    for (i = 1; i < MAXOCLASSES; i++)
        if (ch == def_oc_syms[i].sym)
            break;
    return i;
}

/*
 * Convert a character into a monster class.  This returns the _first_
 * match made.  If there are no matches, return MAXMCLASSES.
 * Used in detect.c, drawing.c, mondata.c, options.c, pickup.c,
 * sp_lev.c, and windows.c.
 */
export function def_char_to_monclass(ch)
{
    let i;

    for (i = 1; i < MAXMCLASSES; i++)
        if (ch == def_monsyms[i].sym)
            break;
    return i;
}

/* does 'ch' represent a furniture character?  returns index into defsyms[] */
export function def_char_is_furniture(ch)
{
    /* note: these refer to defsyms[] order which is much different from
       levl[][].typ order but both keep furniture in a contiguous block */
    const first_furniture = "stair", /* "staircase up" */
          last_furniture = "fountain";
    let i;
    let furniture = 0;

    for (i = 0; i < MAXPCHARS; ++i) {
        if (!furniture) {
            if (defsyms[i].explanation.startsWith(first_furniture))
                furniture = 1;
        }
        if (furniture) {
            if (defsyms[i].sym == (ch & 255))
                return i;
            if (defsyms[i].explanation === last_furniture)
                break; /* reached last furniture */
        }
    }
    return -1;
}

/*drawing.c*/
