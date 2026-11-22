// func_tab.js — the extended command table.
// C ref: include/func_tab.h, cmd.c extcmdlist[]
//
// Generated from cmd.c's extcmdlist[] (names, descriptions, functions,
// flags and occupation texts).
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

// C ref: cmd.c extcmdlist[] -- name, description, function, flags and
// occupation text (f_text, only where non-NULL) of each
// extended command (the #if conditions of cmd.c are noted)
const M = (c) => (0x80 | c.charCodeAt(0)); /* C ref: global.h M() */
const C = (c) => (0x1f & c.charCodeAt(0)); /* C ref: global.h C() */
export const extcmdlist = [
    { key: '#'.charCodeAt(0), ef_txt: "#", ef_desc: "enter and perform an extended command", ef_funct: "doextcmd", flags: IFBURIED | GENERALCMD | CMD_M_PREFIX },
    { key: M('?'), ef_txt: "?", ef_desc: "list all extended commands", ef_funct: "doextlist", flags: IFBURIED | AUTOCOMPLETE | GENERALCMD | CMD_M_PREFIX },
    { key: M('a'), ef_txt: "adjust", ef_desc: "adjust inventory letters", ef_funct: "doorganize", flags: IFBURIED | AUTOCOMPLETE | GENERALCMD },
    { key: M('A'), ef_txt: "annotate", ef_desc: "name current level", ef_funct: "donamelevel", flags: IFBURIED | AUTOCOMPLETE | GENERALCMD | CMD_M_PREFIX },
    { key: 'a'.charCodeAt(0), ef_txt: "apply", ef_desc: "apply (use) a tool (pick-axe, key, lamp...)", ef_funct: "doapply", flags: CMD_M_PREFIX },
    { key: C('x'), ef_txt: "attributes", ef_desc: "show your attributes", ef_funct: "doattributes", flags: IFBURIED | GENERALCMD },
    { key: '@'.charCodeAt(0), ef_txt: "autopickup", ef_desc: "toggle the 'autopickup' option on/off", ef_funct: "dotogglepickup", flags: IFBURIED | GENERALCMD },
    { key: 0, ef_txt: "bugreport", ef_desc: "file a bug report", ef_funct: "dobugreport", flags: GENERALCMD | NOFUZZERCMD },  /* #ifdef CRASHREPORT */
    { key: 'C'.charCodeAt(0), ef_txt: "call", ef_desc: "name a monster, specific object, or type of object", ef_funct: "docallcmd", flags: IFBURIED | GENERALCMD },
    { key: 'Z'.charCodeAt(0), ef_txt: "cast", ef_desc: "zap (cast) a spell", ef_funct: "docast", flags: IFBURIED },
    { key: M('c'), ef_txt: "chat", ef_desc: "talk to someone", ef_funct: "dotalk", flags: IFBURIED | AUTOCOMPLETE },
    { key: 'v'.charCodeAt(0), ef_txt: "chronicle", ef_desc: "show journal of major events", ef_funct: "do_gamelog", flags: IFBURIED | AUTOCOMPLETE | GENERALCMD },
    { key: 'c'.charCodeAt(0), ef_txt: "close", ef_desc: "close a door", ef_funct: "doclose", flags: 0 },
    { key: M('C'), ef_txt: "conduct", ef_desc: "list voluntary challenges you have maintained", ef_funct: "doconduct", flags: IFBURIED | AUTOCOMPLETE | GENERALCMD },
    { key: 0, ef_txt: "debugfuzzer", ef_desc: "start the fuzz tester", ef_funct: "wiz_fuzzer", flags: IFBURIED | WIZMODECMD | NOFUZZERCMD },
    { key: M('d'), ef_txt: "dip", ef_desc: "dip an object into something", ef_funct: "dodip", flags: AUTOCOMPLETE | CMD_M_PREFIX },
    { key: '>'.charCodeAt(0), ef_txt: "down", ef_desc: "go down a staircase", ef_funct: "dodown", flags: CMD_M_PREFIX },
    { key: 'd'.charCodeAt(0), ef_txt: "drop", ef_desc: "drop an item", ef_funct: "dodrop", flags: 0 },
    { key: 'D'.charCodeAt(0), ef_txt: "droptype", ef_desc: "drop specific item types", ef_funct: "doddrop", flags: 0 },
    { key: 'e'.charCodeAt(0), ef_txt: "eat", ef_desc: "eat something", ef_funct: "doeat", flags: CMD_M_PREFIX },
    { key: 'E'.charCodeAt(0), ef_txt: "engrave", ef_desc: "engrave writing on the floor", ef_funct: "doengrave", flags: 0 },
    { key: M('e'), ef_txt: "enhance", ef_desc: "advance or check weapon and spell skills", ef_funct: "enhance_weapon_skill", flags: IFBURIED | AUTOCOMPLETE | GENERALCMD },
    { key: M('X'), ef_txt: "exploremode", ef_desc: "enter explore (discovery) mode", ef_funct: "enter_explore_mode", flags: IFBURIED | GENERALCMD | NOFUZZERCMD },
    { key: 'F'.charCodeAt(0), ef_txt: "fight", ef_desc: "prefix: force fight even if you don't see a monster", ef_funct: "do_fight", flags: PREFIXCMD },
    { key: 'f'.charCodeAt(0), ef_txt: "fire", ef_desc: "fire ammunition from quiver", ef_funct: "dofire", flags: 0 },
    { key: M('f'), ef_txt: "force", ef_desc: "force a lock", ef_funct: "doforce", flags: AUTOCOMPLETE },
    { key: M('g'), ef_txt: "genocided", ef_desc: "list monsters that have been genocided or become extinct", ef_funct: "dogenocided", flags: IFBURIED | AUTOCOMPLETE | GENERALCMD | CMD_M_PREFIX },
    { key: ';'.charCodeAt(0), ef_txt: "glance", ef_desc: "show what type of thing a map symbol corresponds to", ef_funct: "doquickwhatis", flags: IFBURIED | GENERALCMD },
    { key: '?'.charCodeAt(0), ef_txt: "help", ef_desc: "give a help message", ef_funct: "dohelp", flags: IFBURIED | GENERALCMD },
    { key: 0, ef_txt: "herecmdmenu", ef_desc: "show menu of commands you can do here", ef_funct: "doherecmdmenu", flags: IFBURIED | AUTOCOMPLETE | GENERALCMD },
    { key: 0, ef_txt: "history", ef_desc: "show a summary of the game's development", ef_funct: "dohistory", flags: IFBURIED | AUTOCOMPLETE | GENERALCMD },
    { key: 'i'.charCodeAt(0), ef_txt: "inventory", ef_desc: "show your inventory", ef_funct: "ddoinv", flags: IFBURIED | GENERALCMD },
    { key: 'I'.charCodeAt(0), ef_txt: "inventtype", ef_desc: "show inventory of one specific item class", ef_funct: "dotypeinv", flags: IFBURIED | GENERALCMD },
    { key: M('i'), ef_txt: "invoke", ef_desc: "invoke an object's special powers", ef_funct: "doinvoke", flags: IFBURIED | AUTOCOMPLETE },
    { key: M('j'), ef_txt: "jump", ef_desc: "jump to another location", ef_funct: "dojump", flags: AUTOCOMPLETE },
    { key: C('d'), ef_txt: "kick", ef_desc: "kick something", ef_funct: "dokick", flags: 0 },
    { key: '\\'.charCodeAt(0), ef_txt: "known", ef_desc: "show what object types have been discovered", ef_funct: "dodiscovered", flags: IFBURIED | GENERALCMD | CMD_M_PREFIX },
    { key: '`'.charCodeAt(0), ef_txt: "knownclass", ef_desc: "show discovered types for one class of objects", ef_funct: "doclassdisco", flags: IFBURIED | GENERALCMD | CMD_M_PREFIX },
    { key: 0, ef_txt: "levelchange", ef_desc: "change experience level", ef_funct: "wiz_level_change", flags: IFBURIED | AUTOCOMPLETE | WIZMODECMD },
    { key: 0, ef_txt: "lightsources", ef_desc: "show mobile light sources", ef_funct: "wiz_light_sources", flags: IFBURIED | AUTOCOMPLETE | WIZMODECMD },
    { key: ':'.charCodeAt(0), ef_txt: "look", ef_desc: "look at what is here", ef_funct: "dolook", flags: IFBURIED },
    { key: 0, ef_txt: "lookaround", ef_desc: "describe what you can see", ef_funct: "dolookaround", flags: IFBURIED | GENERALCMD },
    { key: M('l'), ef_txt: "loot", ef_desc: "loot a box on the floor", ef_funct: "doloot", flags: AUTOCOMPLETE | CMD_M_PREFIX },
    { key: 0, ef_txt: "migratemons", ef_desc: "show migrating monsters", ef_funct: "wiz_migrate_mons", flags: IFBURIED | AUTOCOMPLETE | WIZMODECMD },
    { key: M('m'), ef_txt: "monster", ef_desc: "use monster's special ability", ef_funct: "domonability", flags: IFBURIED | AUTOCOMPLETE },
    { key: M('n'), ef_txt: "name", ef_desc: "same as call; name a monster or object or object type", ef_funct: "docallcmd", flags: IFBURIED | AUTOCOMPLETE | GENERALCMD },
    { key: M('o'), ef_txt: "offer", ef_desc: "offer a sacrifice to the gods", ef_funct: "dosacrifice", flags: AUTOCOMPLETE | CMD_M_PREFIX },
    { key: 'o'.charCodeAt(0), ef_txt: "open", ef_desc: "open a door", ef_funct: "doopen", flags: 0 },
    { key: 'O'.charCodeAt(0), ef_txt: "options", ef_desc: "show option settings", ef_funct: "doset_simple", flags: IFBURIED | GENERALCMD | CMD_M_PREFIX },
    { key: 0, ef_txt: "optionsfull", ef_desc: "show all option settings, possibly change them", ef_funct: "doset", flags: IFBURIED | GENERALCMD | CMD_M_PREFIX },
    { key: C('o'), ef_txt: "overview", ef_desc: "show a summary of the explored dungeon", ef_funct: "dooverview", flags: IFBURIED | AUTOCOMPLETE | GENERALCMD | CMD_M_PREFIX },
    { key: 0, ef_txt: "panic", ef_desc: "test panic routine (fatal to game)", ef_funct: "wiz_panic", flags: IFBURIED | AUTOCOMPLETE | WIZMODECMD },
    { key: 'p'.charCodeAt(0), ef_txt: "pay", ef_desc: "pay your shopping bill", ef_funct: "dopay", flags: CMD_M_PREFIX },
    { key: '|'.charCodeAt(0), ef_txt: "perminv", ef_desc: "scroll persistent inventory display", ef_funct: "doperminv", flags: IFBURIED | GENERALCMD | NOFUZZERCMD },
    { key: ','.charCodeAt(0), ef_txt: "pickup", ef_desc: "pick up things at the current location", ef_funct: "dopickup", flags: CMD_M_PREFIX },
    { key: 0, ef_txt: "polyself", ef_desc: "polymorph self", ef_funct: "wiz_polyself", flags: IFBURIED | AUTOCOMPLETE | WIZMODECMD },
    { key: M('p'), ef_txt: "pray", ef_desc: "pray to the gods for help", ef_funct: "dopray", flags: IFBURIED | AUTOCOMPLETE },
    { key: C('p'), ef_txt: "prevmsg", ef_desc: "view recent game messages", ef_funct: "doprev_message", flags: IFBURIED | GENERALCMD | CMD_INSANE },
    { key: 'P'.charCodeAt(0), ef_txt: "puton", ef_desc: "put on an accessory (ring, amulet, etc)", ef_funct: "doputon", flags: 0 },
    { key: 'q'.charCodeAt(0), ef_txt: "quaff", ef_desc: "quaff (drink) something", ef_funct: "dodrink", flags: CMD_M_PREFIX },
    { key: 0, ef_txt: "quit", ef_desc: "exit without saving current game", ef_funct: "done2", flags: IFBURIED | AUTOCOMPLETE | GENERALCMD | NOFUZZERCMD },
    { key: 'Q'.charCodeAt(0), ef_txt: "quiver", ef_desc: "select ammunition for quiver", ef_funct: "dowieldquiver", flags: 0 },
    { key: 'r'.charCodeAt(0), ef_txt: "read", ef_desc: "read a scroll or spellbook", ef_funct: "doread", flags: 0 },
    { key: C('r'), ef_txt: "redraw", ef_desc: "redraw screen", ef_funct: "doredraw", flags: IFBURIED | GENERALCMD | CMD_INSANE },
    { key: 'R'.charCodeAt(0), ef_txt: "remove", ef_desc: "remove an accessory (ring, amulet, etc)", ef_funct: "doremring", flags: 0 },
    { key: C('a'), ef_txt: "repeat", ef_desc: "repeat a previous command", ef_funct: "do_repeat", flags: IFBURIED | GENERALCMD },
    { key: 'm'.charCodeAt(0), ef_txt: "reqmenu", ef_desc: "prefix: request menu or modify command", ef_funct: "do_reqmenu", flags: PREFIXCMD },
    { key: C('_'), ef_txt: "retravel", ef_desc: "travel to previously selected travel location", ef_funct: "dotravel_target", flags: 0 },
    { key: M('R'), ef_txt: "ride", ef_desc: "mount or dismount a saddled steed", ef_funct: "doride", flags: AUTOCOMPLETE },
    { key: M('r'), ef_txt: "rub", ef_desc: "rub a lamp or a stone", ef_funct: "dorub", flags: AUTOCOMPLETE },
    { key: 'G'.charCodeAt(0), ef_txt: "run", ef_desc: "prefix: run until something interesting is seen", ef_funct: "do_run", flags: PREFIXCMD },
    { key: 'g'.charCodeAt(0), ef_txt: "rush", ef_desc: "prefix: rush until something interesting is seen", ef_funct: "do_rush", flags: PREFIXCMD },
    { key: 'S'.charCodeAt(0), ef_txt: "save", ef_desc: "save the game and exit", ef_funct: "dosave", flags: IFBURIED | GENERALCMD | NOFUZZERCMD },
    { key: 0, ef_txt: "saveoptions", ef_desc: "save the game configuration", ef_funct: "do_write_config_file", flags: IFBURIED | GENERALCMD | NOFUZZERCMD },
    { key: 's'.charCodeAt(0), ef_txt: "search", ef_desc: "search for traps and secret doors", ef_funct: "dosearch", flags: IFBURIED | CMD_M_PREFIX, f_text: "searching" },
    { key: '*'.charCodeAt(0), ef_txt: "seeall", ef_desc: "show all equipment in use", ef_funct: "doprinuse", flags: IFBURIED | GENERALCMD | CMD_M_PREFIX },
    { key: '"'.charCodeAt(0), ef_txt: "seeamulet", ef_desc: "show the amulet currently worn", ef_funct: "dopramulet", flags: IFBURIED | GENERALCMD | CMD_M_PREFIX },
    { key: '['.charCodeAt(0), ef_txt: "seearmor", ef_desc: "show the armor currently worn", ef_funct: "doprarm", flags: IFBURIED | GENERALCMD | CMD_M_PREFIX },
    { key: '='.charCodeAt(0), ef_txt: "seerings", ef_desc: "show the ring(s) currently worn", ef_funct: "doprring", flags: IFBURIED | GENERALCMD | CMD_M_PREFIX },
    { key: '('.charCodeAt(0), ef_txt: "seetools", ef_desc: "show the tools currently in use", ef_funct: "doprtool", flags: IFBURIED | GENERALCMD | CMD_M_PREFIX },
    { key: ')'.charCodeAt(0), ef_txt: "seeweapon", ef_desc: "show the weapon currently wielded", ef_funct: "doprwep", flags: IFBURIED | GENERALCMD | CMD_M_PREFIX },
    { key: '!'.charCodeAt(0), ef_txt: "shell", ef_desc: "leave game to enter a sub-shell ('exit' to come back)", ef_funct: "dosh_core", flags: (IFBURIED | GENERALCMD | NOFUZZERCMD) },
    { key: '$'.charCodeAt(0), ef_txt: "showgold", ef_desc: "show gold, possibly shop credit or debt", ef_funct: "doprgold", flags: IFBURIED | GENERALCMD | CMD_M_PREFIX },
    { key: '+'.charCodeAt(0), ef_txt: "showspells", ef_desc: "list and reorder known spells", ef_funct: "dovspell", flags: IFBURIED | GENERALCMD },
    { key: '^'.charCodeAt(0), ef_txt: "showtrap", ef_desc: "describe an adjacent, discovered trap", ef_funct: "doidtrap", flags: IFBURIED | GENERALCMD },
    { key: M('s'), ef_txt: "sit", ef_desc: "sit down", ef_funct: "dosit", flags: AUTOCOMPLETE },
    { key: 0, ef_txt: "stats", ef_desc: "show memory statistics", ef_funct: "wiz_show_stats", flags: IFBURIED | AUTOCOMPLETE | WIZMODECMD },
    { key: C('z'), ef_txt: "suspend", ef_desc: "push game to background ('fg' to come back)", ef_funct: "dosuspend_core", flags: (IFBURIED | GENERALCMD | NOFUZZERCMD) },
    { key: 'x'.charCodeAt(0), ef_txt: "swap", ef_desc: "swap wielded and secondary weapons", ef_funct: "doswapweapon", flags: 0 },
    { key: 'T'.charCodeAt(0), ef_txt: "takeoff", ef_desc: "take off one piece of armor", ef_funct: "dotakeoff", flags: 0 },
    { key: 'A'.charCodeAt(0), ef_txt: "takeoffall", ef_desc: "remove all armor", ef_funct: "doddoremarm", flags: 0 },
    { key: C('t'), ef_txt: "teleport", ef_desc: "teleport around the level", ef_funct: "dotelecmd", flags: IFBURIED | CMD_M_PREFIX },
    { key: 0o177, ef_txt: "terrain", ef_desc: "view map without monsters or objects obstructing it", ef_funct: "doterrain", flags: IFBURIED | GENERALCMD | AUTOCOMPLETE },
    { key: 0, ef_txt: "therecmdmenu", ef_desc: "menu of commands you can do from here to adjacent spot", ef_funct: "dotherecmdmenu", flags: AUTOCOMPLETE | GENERALCMD | MOUSECMD },
    { key: 't'.charCodeAt(0), ef_txt: "throw", ef_desc: "throw something", ef_funct: "dothrow", flags: 0 },
    { key: 0, ef_txt: "timeout", ef_desc: "look at timeout queue and hero's timed intrinsics", ef_funct: "wiz_timeout_queue", flags: IFBURIED | AUTOCOMPLETE | WIZMODECMD },
    { key: M('T'), ef_txt: "tip", ef_desc: "empty a container", ef_funct: "dotip", flags: AUTOCOMPLETE | CMD_M_PREFIX },
    { key: 0, ef_txt: "toggle", ef_desc: "toggle boolean option", ef_funct: "dotoggleoption", flags: IFBURIED | GENERALCMD | CMD_PARAM },
    { key: '_'.charCodeAt(0), ef_txt: "travel", ef_desc: "travel to a specific location on the map", ef_funct: "dotravel", flags: CMD_M_PREFIX },
    { key: M('t'), ef_txt: "turn", ef_desc: "turn undead away", ef_funct: "doturn", flags: IFBURIED | AUTOCOMPLETE },
    { key: 'X'.charCodeAt(0), ef_txt: "twoweapon", ef_desc: "toggle two-weapon combat", ef_funct: "dotwoweapon", flags: 0 },
    { key: M('u'), ef_txt: "untrap", ef_desc: "untrap something", ef_funct: "dountrap", flags: AUTOCOMPLETE },
    { key: '<'.charCodeAt(0), ef_txt: "up", ef_desc: "go up a staircase", ef_funct: "doup", flags: CMD_M_PREFIX },
    { key: M('V'), ef_txt: "vanquished", ef_desc: "list vanquished monsters", ef_funct: "dovanquished", flags: IFBURIED | AUTOCOMPLETE | GENERALCMD | CMD_M_PREFIX },
    { key: M('v'), ef_txt: "version", ef_desc: "list compile time options for this version of NetHack", ef_funct: "doextversion", flags: IFBURIED | AUTOCOMPLETE | GENERALCMD },
    { key: 'V'.charCodeAt(0), ef_txt: "versionshort", ef_desc: "show version and date+time program was built", ef_funct: "doversion", flags: IFBURIED | GENERALCMD | CMD_M_PREFIX },
    { key: 0, ef_txt: "vision", ef_desc: "show vision array", ef_funct: "wiz_show_vision", flags: IFBURIED | AUTOCOMPLETE | WIZMODECMD },
    { key: '.'.charCodeAt(0), ef_txt: "wait", ef_desc: "rest one move while doing nothing", ef_funct: "donull", flags: IFBURIED | CMD_M_PREFIX, f_text: "waiting" },
    { key: 'W'.charCodeAt(0), ef_txt: "wear", ef_desc: "wear a piece of armor", ef_funct: "dowear", flags: 0 },
    { key: '&'.charCodeAt(0), ef_txt: "whatdoes", ef_desc: "tell what a command does", ef_funct: "dowhatdoes", flags: IFBURIED | GENERALCMD },
    { key: '/'.charCodeAt(0), ef_txt: "whatis", ef_desc: "show what type of thing a symbol corresponds to", ef_funct: "dowhatis", flags: IFBURIED | GENERALCMD },
    { key: 'w'.charCodeAt(0), ef_txt: "wield", ef_desc: "wield (put in use) a weapon", ef_funct: "dowield", flags: 0 },
    { key: M('w'), ef_txt: "wipe", ef_desc: "wipe off your face", ef_funct: "dowipe", flags: AUTOCOMPLETE },
    { key: 0, ef_txt: "wizborn", ef_desc: "show stats of monsters created", ef_funct: "doborn", flags: IFBURIED | WIZMODECMD },
    { key: 0, ef_txt: "wizcast", ef_desc: "cast any spell", ef_funct: "dowizcast", flags: IFBURIED | WIZMODECMD },
    { key: 0, ef_txt: "wizcustom", ef_desc: "show customized glyphs", ef_funct: "wiz_custom", flags: IFBURIED | WIZMODECMD | NOFUZZERCMD },
    { key: C('e'), ef_txt: "wizdetect", ef_desc: "reveal hidden things within a small radius", ef_funct: "wiz_detect", flags: IFBURIED | WIZMODECMD },
    { key: 0, ef_txt: "wizdispmacros", ef_desc: "validate the display macro ranges", ef_funct: "wiz_display_macros", flags: IFBURIED | AUTOCOMPLETE | WIZMODECMD },  /* #if (NH_DEVEL_STATUS != NH_STATUS_RELEASED) || defined(DEBUG) */
    { key: 0, ef_txt: "wizfliplevel", ef_desc: "flip the level", ef_funct: "wiz_flip_level", flags: IFBURIED | WIZMODECMD },
    { key: C('g'), ef_txt: "wizgenesis", ef_desc: "create a monster", ef_funct: "wiz_genesis", flags: IFBURIED | WIZMODECMD },
    { key: C('i'), ef_txt: "wizidentify", ef_desc: "identify all items in inventory", ef_funct: "wiz_identify", flags: IFBURIED | WIZMODECMD },
    { key: 0, ef_txt: "wizintrinsic", ef_desc: "set an intrinsic", ef_funct: "wiz_intrinsic", flags: IFBURIED | AUTOCOMPLETE | WIZMODECMD },
    { key: 0, ef_txt: "wizkill", ef_desc: "slay a monster", ef_funct: "wiz_kill", flags: (IFBURIED | AUTOCOMPLETE | WIZMODECMD | CMD_M_PREFIX | NOFUZZERCMD) },
    { key: C('v'), ef_txt: "wizlevelport", ef_desc: "teleport to another level", ef_funct: "wiz_level_tele", flags: IFBURIED | WIZMODECMD | CMD_M_PREFIX },
    { key: 0, ef_txt: "wizloaddes", ef_desc: "load and execute a des-file lua script", ef_funct: "wiz_load_splua", flags: IFBURIED | WIZMODECMD | NOFUZZERCMD },
    { key: 0, ef_txt: "wizloadlua", ef_desc: "load and execute a lua script", ef_funct: "wiz_load_lua", flags: IFBURIED | WIZMODECMD | NOFUZZERCMD },
    { key: 0, ef_txt: "wizobjprobs", ef_desc: "list object generation probabilities", ef_funct: "wiz_objprobs", flags: IFBURIED | WIZMODECMD },  /* #if (NH_DEVEL_STATUS != NH_STATUS_RELEASED) || defined(DEBUG) */
    { key: 0, ef_txt: "wizmakemap", ef_desc: "recreate the current level", ef_funct: "wiz_makemap", flags: IFBURIED | WIZMODECMD },
    { key: C('f'), ef_txt: "wizmap", ef_desc: "map the level", ef_funct: "wiz_map", flags: IFBURIED | WIZMODECMD },
    { key: 0, ef_txt: "wizmondiff", ef_desc: "validate the difficulty ratings of monsters", ef_funct: "wiz_mon_diff", flags: IFBURIED | AUTOCOMPLETE | WIZMODECMD },  /* #if (NH_DEVEL_STATUS != NH_STATUS_RELEASED) || defined(DEBUG) */
    { key: 0, ef_txt: "wizrumorcheck", ef_desc: "verify rumor boundaries", ef_funct: "wiz_rumor_check", flags: IFBURIED | AUTOCOMPLETE | WIZMODECMD },
    { key: 0, ef_txt: "wizseenv", ef_desc: "show map locations' seen vectors", ef_funct: "wiz_show_seenv", flags: IFBURIED | AUTOCOMPLETE | WIZMODECMD },
    { key: 0, ef_txt: "wizshownhuuid", ef_desc: "show NHUUID for this game", ef_funct: "wiz_show_nhuuid", flags: AUTOCOMPLETE | WIZMODECMD },
    { key: 0, ef_txt: "wizsmell", ef_desc: "smell monster", ef_funct: "wiz_smell", flags: IFBURIED | AUTOCOMPLETE | WIZMODECMD },
    { key: 0, ef_txt: "wiztelekinesis", ef_desc: "telekinesis", ef_funct: "wiz_telekinesis", flags: IFBURIED | AUTOCOMPLETE | WIZMODECMD },
    { key: 0, ef_txt: "wizwhere", ef_desc: "show locations of special levels", ef_funct: "wiz_where", flags: IFBURIED | AUTOCOMPLETE | WIZMODECMD },
    { key: C('w'), ef_txt: "wizwish", ef_desc: "wish for something", ef_funct: "wiz_wish", flags: IFBURIED | CMD_M_PREFIX | WIZMODECMD },
    { key: 0, ef_txt: "wmode", ef_desc: "show wall modes", ef_funct: "wiz_show_wmodes", flags: IFBURIED | AUTOCOMPLETE | WIZMODECMD },
    { key: 'z'.charCodeAt(0), ef_txt: "zap", ef_desc: "zap a wand", ef_funct: "dozap", flags: 0 },
    { key: 0, ef_txt: "movewest", ef_desc: "move west (screen left)", ef_funct: "do_move_west", flags: MOVEMENTCMD | CMD_MOVE_PREFIXES },
    { key: 0, ef_txt: "movenorthwest", ef_desc: "move northwest (screen upper left)", ef_funct: "do_move_northwest", flags: MOVEMENTCMD | CMD_MOVE_PREFIXES },
    { key: 0, ef_txt: "movenorth", ef_desc: "move north (screen up)", ef_funct: "do_move_north", flags: MOVEMENTCMD | CMD_MOVE_PREFIXES },
    { key: 0, ef_txt: "movenortheast", ef_desc: "move northeast (screen upper right)", ef_funct: "do_move_northeast", flags: MOVEMENTCMD | CMD_MOVE_PREFIXES },
    { key: 0, ef_txt: "moveeast", ef_desc: "move east (screen right)", ef_funct: "do_move_east", flags: MOVEMENTCMD | CMD_MOVE_PREFIXES },
    { key: 0, ef_txt: "movesoutheast", ef_desc: "move southeast (screen lower right)", ef_funct: "do_move_southeast", flags: MOVEMENTCMD | CMD_MOVE_PREFIXES },
    { key: 0, ef_txt: "movesouth", ef_desc: "move south (screen down)", ef_funct: "do_move_south", flags: MOVEMENTCMD | CMD_MOVE_PREFIXES },
    { key: 0, ef_txt: "movesouthwest", ef_desc: "move southwest (screen lower left)", ef_funct: "do_move_southwest", flags: MOVEMENTCMD | CMD_MOVE_PREFIXES },
    { key: 0, ef_txt: "rushwest", ef_desc: "rush west (screen left)", ef_funct: "do_rush_west", flags: MOVEMENTCMD | CMD_M_PREFIX },
    { key: 0, ef_txt: "rushnorthwest", ef_desc: "rush northwest (screen upper left)", ef_funct: "do_rush_northwest", flags: MOVEMENTCMD | CMD_M_PREFIX },
    { key: 0, ef_txt: "rushnorth", ef_desc: "rush north (screen up)", ef_funct: "do_rush_north", flags: MOVEMENTCMD | CMD_M_PREFIX },
    { key: 0, ef_txt: "rushnortheast", ef_desc: "rush northeast (screen upper right)", ef_funct: "do_rush_northeast", flags: MOVEMENTCMD | CMD_M_PREFIX },
    { key: 0, ef_txt: "rusheast", ef_desc: "rush east (screen right)", ef_funct: "do_rush_east", flags: MOVEMENTCMD | CMD_M_PREFIX },
    { key: 0, ef_txt: "rushsoutheast", ef_desc: "rush southeast (screen lower right)", ef_funct: "do_rush_southeast", flags: MOVEMENTCMD | CMD_M_PREFIX },
    { key: 0, ef_txt: "rushsouth", ef_desc: "rush south (screen down)", ef_funct: "do_rush_south", flags: MOVEMENTCMD | CMD_M_PREFIX },
    { key: 0, ef_txt: "rushsouthwest", ef_desc: "rush southwest (screen lower left)", ef_funct: "do_rush_southwest", flags: MOVEMENTCMD | CMD_M_PREFIX },
    { key: 0, ef_txt: "runwest", ef_desc: "run west (screen left)", ef_funct: "do_run_west", flags: MOVEMENTCMD | CMD_M_PREFIX },
    { key: 0, ef_txt: "runnorthwest", ef_desc: "run northwest (screen upper left)", ef_funct: "do_run_northwest", flags: MOVEMENTCMD | CMD_M_PREFIX },
    { key: 0, ef_txt: "runnorth", ef_desc: "run north (screen up)", ef_funct: "do_run_north", flags: MOVEMENTCMD | CMD_M_PREFIX },
    { key: 0, ef_txt: "runnortheast", ef_desc: "run northeast (screen upper right)", ef_funct: "do_run_northeast", flags: MOVEMENTCMD | CMD_M_PREFIX },
    { key: 0, ef_txt: "runeast", ef_desc: "run east (screen right)", ef_funct: "do_run_east", flags: MOVEMENTCMD | CMD_M_PREFIX },
    { key: 0, ef_txt: "runsoutheast", ef_desc: "run southeast (screen lower right)", ef_funct: "do_run_southeast", flags: MOVEMENTCMD | CMD_M_PREFIX },
    { key: 0, ef_txt: "runsouth", ef_desc: "run south (screen down)", ef_funct: "do_run_south", flags: MOVEMENTCMD | CMD_M_PREFIX },
    { key: 0, ef_txt: "runsouthwest", ef_desc: "run southwest (screen lower left)", ef_funct: "do_run_southwest", flags: MOVEMENTCMD | CMD_M_PREFIX },
    { key: 0, ef_txt: "clicklook", ef_desc: null, ef_funct: "doclicklook", flags: INTERNALCMD | MOUSECMD },
    { key: 0, ef_txt: "mouseaction", ef_desc: null, ef_funct: "domouseaction", flags: INTERNALCMD | MOUSECMD },
    { key: 0, ef_txt: "altadjust", ef_desc: null, ef_funct: "adjust_split", flags: INTERNALCMD },
    { key: 0, ef_txt: "altdip", ef_desc: null, ef_funct: "dip_into", flags: INTERNALCMD },
    { key: 0, ef_txt: "alttakeoff", ef_desc: null, ef_funct: "ia_dotakeoff", flags: INTERNALCMD },
    { key: 0, ef_txt: "altunwield", ef_desc: null, ef_funct: "remarm_swapwep", flags: INTERNALCMD },
];
