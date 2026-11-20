// func_tab.js — the extended command table.
// C ref: include/func_tab.h, cmd.c extcmdlist[]
//
// Generated from cmd.c's extcmdlist[] (names, functions and flags only).
// Conditional entries follow the UNIX build: SHELL and SUSPEND are
// defined (unixconf.h), DEBUG is not; NH_DEVEL_STATUS is not RELEASED.

/* extended command flags */
export const IFBURIED     = 0x0001; /* can do command when buried */
export const AUTOCOMPLETE = 0x0002; /* command autocompletes */
export const WIZMODECMD   = 0x0004; /* wizard-mode command */
export const GENERALCMD   = 0x0008; /* general command, does not take game time */
export const CMD_NOT_AVAILABLE = 0x0010; /* recognized but non-functional (!SHELL,&c)*/
export const NOFUZZERCMD  = 0x0020; /* fuzzer cannot execute this command */
export const INTERNALCMD  = 0x0040; /* only for internal use, not for user */
export const CMD_M_PREFIX = 0x0080; /* accepts menu prefix */
export const CMD_gGF_PREFIX = 0x0100; /* accepts g/G/F prefix */
export const CMD_MOVE_PREFIXES = (CMD_M_PREFIX | CMD_gGF_PREFIX);
export const PREFIXCMD    = 0x0200; /* prefix command, requires another one after it */
export const MOVEMENTCMD  = 0x0400; /* used to move hero/cursor */
export const MOUSECMD     = 0x0800; /* cmd allowed to be bound to mouse button */
export const CMD_INSANE   = 0x1000; /* suppress sanity check (for ^P and ^R) */
export const AUTOCOMP_ADJ = 0x2000; /* user changed command autocompletion */
export const CMD_PARAM    = 0x4000; /* command requires a param from key bind */

/* flags for extcmds_match() */
export const ECM_NOFLAGS    = 0;
export const ECM_IGNOREAC   = 0x01; /* ignore !autocomplete commands */
export const ECM_EXACTMATCH = 0x02; /* needs exact match of findstr */
export const ECM_NO1CHARCMD = 0x04; /* ignore commands like '?' and '#' */

// C ref: cmd.c extcmdlist[] -- name, function and flags of each
// extended command (the #if conditions of cmd.c are noted)
const M = (c) => (0x80 | c.charCodeAt(0)); /* C ref: global.h M() */
const C = (c) => (0x1f & c.charCodeAt(0)); /* C ref: global.h C() */
export const extcmdlist = [
    { key: '#'.charCodeAt(0), ef_txt: "#", ef_funct: "doextcmd", flags: IFBURIED | GENERALCMD | CMD_M_PREFIX },
    { key: M('?'), ef_txt: "?", ef_funct: "doextlist", flags: IFBURIED | AUTOCOMPLETE | GENERALCMD | CMD_M_PREFIX },
    { key: M('a'), ef_txt: "adjust", ef_funct: "doorganize", flags: IFBURIED | AUTOCOMPLETE | GENERALCMD },
    { key: M('A'), ef_txt: "annotate", ef_funct: "donamelevel", flags: IFBURIED | AUTOCOMPLETE | GENERALCMD | CMD_M_PREFIX },
    { key: 'a'.charCodeAt(0), ef_txt: "apply", ef_funct: "doapply", flags: CMD_M_PREFIX },
    { key: C('x'), ef_txt: "attributes", ef_funct: "doattributes", flags: IFBURIED | GENERALCMD },
    { key: '@'.charCodeAt(0), ef_txt: "autopickup", ef_funct: "dotogglepickup", flags: IFBURIED | GENERALCMD },
    { key: 0, ef_txt: "bugreport", ef_funct: "dobugreport", flags: GENERALCMD | NOFUZZERCMD },  /* #ifdef CRASHREPORT */
    { key: 'C'.charCodeAt(0), ef_txt: "call", ef_funct: "docallcmd", flags: IFBURIED | GENERALCMD },
    { key: 'Z'.charCodeAt(0), ef_txt: "cast", ef_funct: "docast", flags: IFBURIED },
    { key: M('c'), ef_txt: "chat", ef_funct: "dotalk", flags: IFBURIED | AUTOCOMPLETE },
    { key: 'v'.charCodeAt(0), ef_txt: "chronicle", ef_funct: "do_gamelog", flags: IFBURIED | AUTOCOMPLETE | GENERALCMD },
    { key: 'c'.charCodeAt(0), ef_txt: "close", ef_funct: "doclose", flags: 0 },
    { key: M('C'), ef_txt: "conduct", ef_funct: "doconduct", flags: IFBURIED | AUTOCOMPLETE | GENERALCMD },
    { key: 0, ef_txt: "debugfuzzer", ef_funct: "wiz_fuzzer", flags: IFBURIED | WIZMODECMD | NOFUZZERCMD },
    { key: M('d'), ef_txt: "dip", ef_funct: "dodip", flags: AUTOCOMPLETE | CMD_M_PREFIX },
    { key: '>'.charCodeAt(0), ef_txt: "down", ef_funct: "dodown", flags: CMD_M_PREFIX },
    { key: 'd'.charCodeAt(0), ef_txt: "drop", ef_funct: "dodrop", flags: 0 },
    { key: 'D'.charCodeAt(0), ef_txt: "droptype", ef_funct: "doddrop", flags: 0 },
    { key: 'e'.charCodeAt(0), ef_txt: "eat", ef_funct: "doeat", flags: CMD_M_PREFIX },
    { key: 'E'.charCodeAt(0), ef_txt: "engrave", ef_funct: "doengrave", flags: 0 },
    { key: M('e'), ef_txt: "enhance", ef_funct: "enhance_weapon_skill", flags: IFBURIED | AUTOCOMPLETE | GENERALCMD },
    { key: M('X'), ef_txt: "exploremode", ef_funct: "enter_explore_mode", flags: IFBURIED | GENERALCMD | NOFUZZERCMD },
    { key: 'F'.charCodeAt(0), ef_txt: "fight", ef_funct: "do_fight", flags: PREFIXCMD },
    { key: 'f'.charCodeAt(0), ef_txt: "fire", ef_funct: "dofire", flags: 0 },
    { key: M('f'), ef_txt: "force", ef_funct: "doforce", flags: AUTOCOMPLETE },
    { key: M('g'), ef_txt: "genocided", ef_funct: "dogenocided", flags: IFBURIED | AUTOCOMPLETE | GENERALCMD | CMD_M_PREFIX },
    { key: ';'.charCodeAt(0), ef_txt: "glance", ef_funct: "doquickwhatis", flags: IFBURIED | GENERALCMD },
    { key: '?'.charCodeAt(0), ef_txt: "help", ef_funct: "dohelp", flags: IFBURIED | GENERALCMD },
    { key: 0, ef_txt: "herecmdmenu", ef_funct: "doherecmdmenu", flags: IFBURIED | AUTOCOMPLETE | GENERALCMD },
    { key: 0, ef_txt: "history", ef_funct: "dohistory", flags: IFBURIED | AUTOCOMPLETE | GENERALCMD },
    { key: 'i'.charCodeAt(0), ef_txt: "inventory", ef_funct: "ddoinv", flags: IFBURIED | GENERALCMD },
    { key: 'I'.charCodeAt(0), ef_txt: "inventtype", ef_funct: "dotypeinv", flags: IFBURIED | GENERALCMD },
    { key: M('i'), ef_txt: "invoke", ef_funct: "doinvoke", flags: IFBURIED | AUTOCOMPLETE },
    { key: M('j'), ef_txt: "jump", ef_funct: "dojump", flags: AUTOCOMPLETE },
    { key: C('d'), ef_txt: "kick", ef_funct: "dokick", flags: 0 },
    { key: '\\'.charCodeAt(0), ef_txt: "known", ef_funct: "dodiscovered", flags: IFBURIED | GENERALCMD | CMD_M_PREFIX },
    { key: '`'.charCodeAt(0), ef_txt: "knownclass", ef_funct: "doclassdisco", flags: IFBURIED | GENERALCMD | CMD_M_PREFIX },
    { key: 0, ef_txt: "levelchange", ef_funct: "wiz_level_change", flags: IFBURIED | AUTOCOMPLETE | WIZMODECMD },
    { key: 0, ef_txt: "lightsources", ef_funct: "wiz_light_sources", flags: IFBURIED | AUTOCOMPLETE | WIZMODECMD },
    { key: ':'.charCodeAt(0), ef_txt: "look", ef_funct: "dolook", flags: IFBURIED },
    { key: 0, ef_txt: "lookaround", ef_funct: "dolookaround", flags: IFBURIED | GENERALCMD },
    { key: M('l'), ef_txt: "loot", ef_funct: "doloot", flags: AUTOCOMPLETE | CMD_M_PREFIX },
    { key: 0, ef_txt: "migratemons", ef_funct: "wiz_migrate_mons", flags: IFBURIED | AUTOCOMPLETE | WIZMODECMD },
    { key: M('m'), ef_txt: "monster", ef_funct: "domonability", flags: IFBURIED | AUTOCOMPLETE },
    { key: M('n'), ef_txt: "name", ef_funct: "docallcmd", flags: IFBURIED | AUTOCOMPLETE | GENERALCMD },
    { key: M('o'), ef_txt: "offer", ef_funct: "dosacrifice", flags: AUTOCOMPLETE | CMD_M_PREFIX },
    { key: 'o'.charCodeAt(0), ef_txt: "open", ef_funct: "doopen", flags: 0 },
    { key: 'O'.charCodeAt(0), ef_txt: "options", ef_funct: "doset_simple", flags: IFBURIED | GENERALCMD | CMD_M_PREFIX },
    { key: 0, ef_txt: "optionsfull", ef_funct: "doset", flags: IFBURIED | GENERALCMD | CMD_M_PREFIX },
    { key: C('o'), ef_txt: "overview", ef_funct: "dooverview", flags: IFBURIED | AUTOCOMPLETE | GENERALCMD | CMD_M_PREFIX },
    { key: 0, ef_txt: "panic", ef_funct: "wiz_panic", flags: IFBURIED | AUTOCOMPLETE | WIZMODECMD },
    { key: 'p'.charCodeAt(0), ef_txt: "pay", ef_funct: "dopay", flags: CMD_M_PREFIX },
    { key: '|'.charCodeAt(0), ef_txt: "perminv", ef_funct: "doperminv", flags: IFBURIED | GENERALCMD | NOFUZZERCMD },
    { key: ','.charCodeAt(0), ef_txt: "pickup", ef_funct: "dopickup", flags: CMD_M_PREFIX },
    { key: 0, ef_txt: "polyself", ef_funct: "wiz_polyself", flags: IFBURIED | AUTOCOMPLETE | WIZMODECMD },
    { key: M('p'), ef_txt: "pray", ef_funct: "dopray", flags: IFBURIED | AUTOCOMPLETE },
    { key: C('p'), ef_txt: "prevmsg", ef_funct: "doprev_message", flags: IFBURIED | GENERALCMD | CMD_INSANE },
    { key: 'P'.charCodeAt(0), ef_txt: "puton", ef_funct: "doputon", flags: 0 },
    { key: 'q'.charCodeAt(0), ef_txt: "quaff", ef_funct: "dodrink", flags: CMD_M_PREFIX },
    { key: 0, ef_txt: "quit", ef_funct: "done2", flags: IFBURIED | AUTOCOMPLETE | GENERALCMD | NOFUZZERCMD },
    { key: 'Q'.charCodeAt(0), ef_txt: "quiver", ef_funct: "dowieldquiver", flags: 0 },
    { key: 'r'.charCodeAt(0), ef_txt: "read", ef_funct: "doread", flags: 0 },
    { key: C('r'), ef_txt: "redraw", ef_funct: "doredraw", flags: IFBURIED | GENERALCMD | CMD_INSANE },
    { key: 'R'.charCodeAt(0), ef_txt: "remove", ef_funct: "doremring", flags: 0 },
    { key: C('a'), ef_txt: "repeat", ef_funct: "do_repeat", flags: IFBURIED | GENERALCMD },
    { key: 'm'.charCodeAt(0), ef_txt: "reqmenu", ef_funct: "do_reqmenu", flags: PREFIXCMD },
    { key: C('_'), ef_txt: "retravel", ef_funct: "dotravel_target", flags: 0 },
    { key: M('R'), ef_txt: "ride", ef_funct: "doride", flags: AUTOCOMPLETE },
    { key: M('r'), ef_txt: "rub", ef_funct: "dorub", flags: AUTOCOMPLETE },
    { key: 'G'.charCodeAt(0), ef_txt: "run", ef_funct: "do_run", flags: PREFIXCMD },
    { key: 'g'.charCodeAt(0), ef_txt: "rush", ef_funct: "do_rush", flags: PREFIXCMD },
    { key: 'S'.charCodeAt(0), ef_txt: "save", ef_funct: "dosave", flags: IFBURIED | GENERALCMD | NOFUZZERCMD },
    { key: 0, ef_txt: "saveoptions", ef_funct: "do_write_config_file", flags: IFBURIED | GENERALCMD | NOFUZZERCMD },
    { key: 's'.charCodeAt(0), ef_txt: "search", ef_funct: "dosearch", flags: IFBURIED | CMD_M_PREFIX },
    { key: '*'.charCodeAt(0), ef_txt: "seeall", ef_funct: "doprinuse", flags: IFBURIED | GENERALCMD | CMD_M_PREFIX },
    { key: '"'.charCodeAt(0), ef_txt: "seeamulet", ef_funct: "dopramulet", flags: IFBURIED | GENERALCMD | CMD_M_PREFIX },
    { key: '['.charCodeAt(0), ef_txt: "seearmor", ef_funct: "doprarm", flags: IFBURIED | GENERALCMD | CMD_M_PREFIX },
    { key: '='.charCodeAt(0), ef_txt: "seerings", ef_funct: "doprring", flags: IFBURIED | GENERALCMD | CMD_M_PREFIX },
    { key: '('.charCodeAt(0), ef_txt: "seetools", ef_funct: "doprtool", flags: IFBURIED | GENERALCMD | CMD_M_PREFIX },
    { key: ')'.charCodeAt(0), ef_txt: "seeweapon", ef_funct: "doprwep", flags: IFBURIED | GENERALCMD | CMD_M_PREFIX },
    { key: '!'.charCodeAt(0), ef_txt: "shell", ef_funct: "dosh_core", flags: (IFBURIED | GENERALCMD | NOFUZZERCMD) },
    { key: '$'.charCodeAt(0), ef_txt: "showgold", ef_funct: "doprgold", flags: IFBURIED | GENERALCMD | CMD_M_PREFIX },
    { key: '+'.charCodeAt(0), ef_txt: "showspells", ef_funct: "dovspell", flags: IFBURIED | GENERALCMD },
    { key: '^'.charCodeAt(0), ef_txt: "showtrap", ef_funct: "doidtrap", flags: IFBURIED | GENERALCMD },
    { key: M('s'), ef_txt: "sit", ef_funct: "dosit", flags: AUTOCOMPLETE },
    { key: 0, ef_txt: "stats", ef_funct: "wiz_show_stats", flags: IFBURIED | AUTOCOMPLETE | WIZMODECMD },
    { key: C('z'), ef_txt: "suspend", ef_funct: "dosuspend_core", flags: (IFBURIED | GENERALCMD | NOFUZZERCMD) },
    { key: 'x'.charCodeAt(0), ef_txt: "swap", ef_funct: "doswapweapon", flags: 0 },
    { key: 'T'.charCodeAt(0), ef_txt: "takeoff", ef_funct: "dotakeoff", flags: 0 },
    { key: 'A'.charCodeAt(0), ef_txt: "takeoffall", ef_funct: "doddoremarm", flags: 0 },
    { key: C('t'), ef_txt: "teleport", ef_funct: "dotelecmd", flags: IFBURIED | CMD_M_PREFIX },
    { key: 0o177, ef_txt: "terrain", ef_funct: "doterrain", flags: IFBURIED | GENERALCMD | AUTOCOMPLETE },
    { key: 0, ef_txt: "therecmdmenu", ef_funct: "dotherecmdmenu", flags: AUTOCOMPLETE | GENERALCMD | MOUSECMD },
    { key: 't'.charCodeAt(0), ef_txt: "throw", ef_funct: "dothrow", flags: 0 },
    { key: 0, ef_txt: "timeout", ef_funct: "wiz_timeout_queue", flags: IFBURIED | AUTOCOMPLETE | WIZMODECMD },
    { key: M('T'), ef_txt: "tip", ef_funct: "dotip", flags: AUTOCOMPLETE | CMD_M_PREFIX },
    { key: 0, ef_txt: "toggle", ef_funct: "dotoggleoption", flags: IFBURIED | GENERALCMD | CMD_PARAM },
    { key: '_'.charCodeAt(0), ef_txt: "travel", ef_funct: "dotravel", flags: CMD_M_PREFIX },
    { key: M('t'), ef_txt: "turn", ef_funct: "doturn", flags: IFBURIED | AUTOCOMPLETE },
    { key: 'X'.charCodeAt(0), ef_txt: "twoweapon", ef_funct: "dotwoweapon", flags: 0 },
    { key: M('u'), ef_txt: "untrap", ef_funct: "dountrap", flags: AUTOCOMPLETE },
    { key: '<'.charCodeAt(0), ef_txt: "up", ef_funct: "doup", flags: CMD_M_PREFIX },
    { key: M('V'), ef_txt: "vanquished", ef_funct: "dovanquished", flags: IFBURIED | AUTOCOMPLETE | GENERALCMD | CMD_M_PREFIX },
    { key: M('v'), ef_txt: "version", ef_funct: "doextversion", flags: IFBURIED | AUTOCOMPLETE | GENERALCMD },
    { key: 'V'.charCodeAt(0), ef_txt: "versionshort", ef_funct: "doversion", flags: IFBURIED | GENERALCMD | CMD_M_PREFIX },
    { key: 0, ef_txt: "vision", ef_funct: "wiz_show_vision", flags: IFBURIED | AUTOCOMPLETE | WIZMODECMD },
    { key: '.'.charCodeAt(0), ef_txt: "wait", ef_funct: "donull", flags: IFBURIED | CMD_M_PREFIX },
    { key: 'W'.charCodeAt(0), ef_txt: "wear", ef_funct: "dowear", flags: 0 },
    { key: '&'.charCodeAt(0), ef_txt: "whatdoes", ef_funct: "dowhatdoes", flags: IFBURIED | GENERALCMD },
    { key: '/'.charCodeAt(0), ef_txt: "whatis", ef_funct: "dowhatis", flags: IFBURIED | GENERALCMD },
    { key: 'w'.charCodeAt(0), ef_txt: "wield", ef_funct: "dowield", flags: 0 },
    { key: M('w'), ef_txt: "wipe", ef_funct: "dowipe", flags: AUTOCOMPLETE },
    { key: 0, ef_txt: "wizborn", ef_funct: "doborn", flags: IFBURIED | WIZMODECMD },
    { key: 0, ef_txt: "wizcast", ef_funct: "dowizcast", flags: IFBURIED | WIZMODECMD },
    { key: 0, ef_txt: "wizcustom", ef_funct: "wiz_custom", flags: IFBURIED | WIZMODECMD | NOFUZZERCMD },
    { key: C('e'), ef_txt: "wizdetect", ef_funct: "wiz_detect", flags: IFBURIED | WIZMODECMD },
    { key: 0, ef_txt: "wizdispmacros", ef_funct: "wiz_display_macros", flags: IFBURIED | AUTOCOMPLETE | WIZMODECMD },  /* #if (NH_DEVEL_STATUS != NH_STATUS_RELEASED) || defined(DEBUG) */
    { key: 0, ef_txt: "wizfliplevel", ef_funct: "wiz_flip_level", flags: IFBURIED | WIZMODECMD },
    { key: C('g'), ef_txt: "wizgenesis", ef_funct: "wiz_genesis", flags: IFBURIED | WIZMODECMD },
    { key: C('i'), ef_txt: "wizidentify", ef_funct: "wiz_identify", flags: IFBURIED | WIZMODECMD },
    { key: 0, ef_txt: "wizintrinsic", ef_funct: "wiz_intrinsic", flags: IFBURIED | AUTOCOMPLETE | WIZMODECMD },
    { key: 0, ef_txt: "wizkill", ef_funct: "wiz_kill", flags: (IFBURIED | AUTOCOMPLETE | WIZMODECMD | CMD_M_PREFIX | NOFUZZERCMD) },
    { key: C('v'), ef_txt: "wizlevelport", ef_funct: "wiz_level_tele", flags: IFBURIED | WIZMODECMD | CMD_M_PREFIX },
    { key: 0, ef_txt: "wizloaddes", ef_funct: "wiz_load_splua", flags: IFBURIED | WIZMODECMD | NOFUZZERCMD },
    { key: 0, ef_txt: "wizloadlua", ef_funct: "wiz_load_lua", flags: IFBURIED | WIZMODECMD | NOFUZZERCMD },
    { key: 0, ef_txt: "wizobjprobs", ef_funct: "wiz_objprobs", flags: IFBURIED | WIZMODECMD },  /* #if (NH_DEVEL_STATUS != NH_STATUS_RELEASED) || defined(DEBUG) */
    { key: 0, ef_txt: "wizmakemap", ef_funct: "wiz_makemap", flags: IFBURIED | WIZMODECMD },
    { key: C('f'), ef_txt: "wizmap", ef_funct: "wiz_map", flags: IFBURIED | WIZMODECMD },
    { key: 0, ef_txt: "wizmondiff", ef_funct: "wiz_mon_diff", flags: IFBURIED | AUTOCOMPLETE | WIZMODECMD },  /* #if (NH_DEVEL_STATUS != NH_STATUS_RELEASED) || defined(DEBUG) */
    { key: 0, ef_txt: "wizrumorcheck", ef_funct: "wiz_rumor_check", flags: IFBURIED | AUTOCOMPLETE | WIZMODECMD },
    { key: 0, ef_txt: "wizseenv", ef_funct: "wiz_show_seenv", flags: IFBURIED | AUTOCOMPLETE | WIZMODECMD },
    { key: 0, ef_txt: "wizshownhuuid", ef_funct: "wiz_show_nhuuid", flags: AUTOCOMPLETE | WIZMODECMD },
    { key: 0, ef_txt: "wizsmell", ef_funct: "wiz_smell", flags: IFBURIED | AUTOCOMPLETE | WIZMODECMD },
    { key: 0, ef_txt: "wiztelekinesis", ef_funct: "wiz_telekinesis", flags: IFBURIED | AUTOCOMPLETE | WIZMODECMD },
    { key: 0, ef_txt: "wizwhere", ef_funct: "wiz_where", flags: IFBURIED | AUTOCOMPLETE | WIZMODECMD },
    { key: C('w'), ef_txt: "wizwish", ef_funct: "wiz_wish", flags: IFBURIED | CMD_M_PREFIX | WIZMODECMD },
    { key: 0, ef_txt: "wmode", ef_funct: "wiz_show_wmodes", flags: IFBURIED | AUTOCOMPLETE | WIZMODECMD },
    { key: 'z'.charCodeAt(0), ef_txt: "zap", ef_funct: "dozap", flags: 0 },
    { key: 0, ef_txt: "movewest", ef_funct: "do_move_west", flags: MOVEMENTCMD | CMD_MOVE_PREFIXES },
    { key: 0, ef_txt: "movenorthwest", ef_funct: "do_move_northwest", flags: MOVEMENTCMD | CMD_MOVE_PREFIXES },
    { key: 0, ef_txt: "movenorth", ef_funct: "do_move_north", flags: MOVEMENTCMD | CMD_MOVE_PREFIXES },
    { key: 0, ef_txt: "movenortheast", ef_funct: "do_move_northeast", flags: MOVEMENTCMD | CMD_MOVE_PREFIXES },
    { key: 0, ef_txt: "moveeast", ef_funct: "do_move_east", flags: MOVEMENTCMD | CMD_MOVE_PREFIXES },
    { key: 0, ef_txt: "movesoutheast", ef_funct: "do_move_southeast", flags: MOVEMENTCMD | CMD_MOVE_PREFIXES },
    { key: 0, ef_txt: "movesouth", ef_funct: "do_move_south", flags: MOVEMENTCMD | CMD_MOVE_PREFIXES },
    { key: 0, ef_txt: "movesouthwest", ef_funct: "do_move_southwest", flags: MOVEMENTCMD | CMD_MOVE_PREFIXES },
    { key: 0, ef_txt: "rushwest", ef_funct: "do_rush_west", flags: MOVEMENTCMD | CMD_M_PREFIX },
    { key: 0, ef_txt: "rushnorthwest", ef_funct: "do_rush_northwest", flags: MOVEMENTCMD | CMD_M_PREFIX },
    { key: 0, ef_txt: "rushnorth", ef_funct: "do_rush_north", flags: MOVEMENTCMD | CMD_M_PREFIX },
    { key: 0, ef_txt: "rushnortheast", ef_funct: "do_rush_northeast", flags: MOVEMENTCMD | CMD_M_PREFIX },
    { key: 0, ef_txt: "rusheast", ef_funct: "do_rush_east", flags: MOVEMENTCMD | CMD_M_PREFIX },
    { key: 0, ef_txt: "rushsoutheast", ef_funct: "do_rush_southeast", flags: MOVEMENTCMD | CMD_M_PREFIX },
    { key: 0, ef_txt: "rushsouth", ef_funct: "do_rush_south", flags: MOVEMENTCMD | CMD_M_PREFIX },
    { key: 0, ef_txt: "rushsouthwest", ef_funct: "do_rush_southwest", flags: MOVEMENTCMD | CMD_M_PREFIX },
    { key: 0, ef_txt: "runwest", ef_funct: "do_run_west", flags: MOVEMENTCMD | CMD_M_PREFIX },
    { key: 0, ef_txt: "runnorthwest", ef_funct: "do_run_northwest", flags: MOVEMENTCMD | CMD_M_PREFIX },
    { key: 0, ef_txt: "runnorth", ef_funct: "do_run_north", flags: MOVEMENTCMD | CMD_M_PREFIX },
    { key: 0, ef_txt: "runnortheast", ef_funct: "do_run_northeast", flags: MOVEMENTCMD | CMD_M_PREFIX },
    { key: 0, ef_txt: "runeast", ef_funct: "do_run_east", flags: MOVEMENTCMD | CMD_M_PREFIX },
    { key: 0, ef_txt: "runsoutheast", ef_funct: "do_run_southeast", flags: MOVEMENTCMD | CMD_M_PREFIX },
    { key: 0, ef_txt: "runsouth", ef_funct: "do_run_south", flags: MOVEMENTCMD | CMD_M_PREFIX },
    { key: 0, ef_txt: "runsouthwest", ef_funct: "do_run_southwest", flags: MOVEMENTCMD | CMD_M_PREFIX },
    { key: 0, ef_txt: "clicklook", ef_funct: "doclicklook", flags: INTERNALCMD | MOUSECMD },
    { key: 0, ef_txt: "mouseaction", ef_funct: "domouseaction", flags: INTERNALCMD | MOUSECMD },
    { key: 0, ef_txt: "altadjust", ef_funct: "adjust_split", flags: INTERNALCMD },
    { key: 0, ef_txt: "altdip", ef_funct: "dip_into", flags: INTERNALCMD },
    { key: 0, ef_txt: "alttakeoff", ef_funct: "ia_dotakeoff", flags: INTERNALCMD },
    { key: 0, ef_txt: "altunwield", ef_funct: "remarm_swapwep", flags: INTERNALCMD },
];
