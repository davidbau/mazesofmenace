// AUTO-GENERATED from nethack-c/upstream/include/optlist.h
// Regenerate: python3 scripts/extract-optlist.py
// C ref: options.c option_help / allopt[] (contest MacOS tty flags).
export const optionHelpBools = [
  "accessiblemsg",
  "acoustics",
  "altmeta",
  "armorstatus",
  "autodescribe",
  "autodig",
  "autoopen",
  "autopickup",
  "autoquiver",
  "bgcolors",
  "blind",
  "bones",
  "checkpoint",
  "cmdassist",
  "color",
  "confirm",
  "customcolors",
  "customsymbols",
  "dark_room",
  "deaf",
  "dropped_nopick",
  "eight_bit_tty",
  "extmenu",
  "female",
  "fireassist",
  "fixinv",
  "force_invmenu",
  "goldX",
  "help",
  "herecmd_menu",
  "hilite_pet",
  "hilite_pile",
  "hitpointbar",
  "idlecheckpoint",
  "ignintr",
  "implicit_uncursed",
  "legacy",
  "lit_corridor",
  "lootabc",
  "mail",
  "mention_decor",
  "mention_map",
  "mention_walls",
  "menu_overlay",
  "menucolors",
  "mon_movement",
  "news",
  "nudist",
  "null",
  "pauper",
  "pickup_stolen",
  "pickup_thrown",
  "price_quotes",
  "pushweapon",
  "query_menu",
  "quick_farsight",
  "reroll",
  "rest_on_space",
  "safe_pet",
  "safe_wait",
  "selectsaved",
  "showdamage",
  "showexp",
  "showrace",
  "showvers",
  "silent",
  "sortpack",
  "sounds",
  "sparkle",
  "spot_monsters",
  "standout",
  "status_updates",
  "terrainstatus",
  "time",
  "tips",
  "tombstone",
  "toptenwin",
  "travel",
  "tutorial",
  "use_darkgray",
  "use_inverse",
  "use_truecolor",
  "verbose",
  "voices",
  "weaponstatus",
  "whatis_menu",
  "whatis_moveskip"
];
export const optionHelpCompounds = [
  {
    "name": "windowtype",
    "descr": "windowing system to use (should be specified first)"
  },
  {
    "name": "playmode",
    "descr": "normal play, non-scoring explore mode, or debug mode"
  },
  {
    "name": "name",
    "descr": "your character's name (e.g., name:Merlin-W)"
  },
  {
    "name": "role",
    "descr": "your starting role (e.g., Barbarian, Valkyrie)"
  },
  {
    "name": "race",
    "descr": "your starting race (e.g., Human, Elf)"
  },
  {
    "name": "gender",
    "descr": "your starting gender (male or female)"
  },
  {
    "name": "alignment",
    "descr": "your starting alignment (lawful, neutral, or chaotic)"
  },
  {
    "name": "altkeyhandling",
    "descr": "(not applicable)"
  },
  {
    "name": "autounlock",
    "descr": "action to take when encountering locked door or chest"
  },
  {
    "name": "boulder",
    "descr": "deprecated (use S_boulder in sym file instead)"
  },
  {
    "name": "catname",
    "descr": "name of your starting pet if it is a kitten"
  },
  {
    "name": "crash_email",
    "descr": "email address for reporting"
  },
  {
    "name": "crash_name",
    "descr": "your name for reporting"
  },
  {
    "name": "crash_urlmax",
    "descr": "length of longest url we can generate"
  },
  {
    "name": "DECgraphics",
    "descr": "load DECGraphics display symbols into symset"
  },
  {
    "name": "disclose",
    "descr": "the kinds of information to disclose at end of game"
  },
  {
    "name": "dogname",
    "descr": "name of your starting pet if it is a little dog"
  },
  {
    "name": "dungeon",
    "descr": "list of symbols to use in drawing the dungeon map"
  },
  {
    "name": "effects",
    "descr": "list of symbols to use in drawing special effects"
  },
  {
    "name": "fruit",
    "descr": "name of a fruit you enjoy eating"
  },
  {
    "name": "glyph",
    "descr": "set representation of a glyph to a unicode value and color"
  },
  {
    "name": "hilite_status",
    "descr": "a status highlighting rule (can occur multiple times)"
  },
  {
    "name": "horsename",
    "descr": "name of your starting pet if it is a pony"
  },
  {
    "name": "IBMgraphics",
    "descr": "load IBMGraphics display symbols into symset"
  },
  {
    "name": "menu_deselect_all",
    "descr": "deselect all items in a menu"
  },
  {
    "name": "menu_deselect_page",
    "descr": "deselect all items on this page of a menu"
  },
  {
    "name": "menu_first_page",
    "descr": "jump to the first page in a menu"
  },
  {
    "name": "menu_headings",
    "descr": "display style for menu headings"
  },
  {
    "name": "menu_invert_all",
    "descr": "invert all items in a menu"
  },
  {
    "name": "menu_invert_page",
    "descr": "invert all items on this page of a menu"
  },
  {
    "name": "menu_last_page",
    "descr": "jump to the last page in a menu"
  },
  {
    "name": "menu_next_page",
    "descr": "go to the next menu page"
  },
  {
    "name": "menu_objsyms",
    "descr": "show object symbols in menus"
  },
  {
    "name": "menu_previous_page",
    "descr": "go to the previous menu page"
  },
  {
    "name": "menu_search",
    "descr": "search for a menu item"
  },
  {
    "name": "menu_select_all",
    "descr": "select all items in a menu"
  },
  {
    "name": "menu_select_page",
    "descr": "select all items on this page of a menu"
  },
  {
    "name": "menu_shift_left",
    "descr": "pan current menu page left"
  },
  {
    "name": "menu_shift_right",
    "descr": "pan current menu page right"
  },
  {
    "name": "menuinvertmode",
    "descr": "experimental behavior of menu inverts"
  },
  {
    "name": "menustyle",
    "descr": "user interface for object selection"
  },
  {
    "name": "monsters",
    "descr": "list of symbols to use for monsters"
  },
  {
    "name": "msg_window",
    "descr": "control of \"view previous message(s)\" (^P) behavior"
  },
  {
    "name": "msghistory",
    "descr": "number of top line messages to save"
  },
  {
    "name": "number_pad",
    "descr": "use the number pad for movement"
  },
  {
    "name": "objects",
    "descr": "list of symbols to use for objects"
  },
  {
    "name": "packorder",
    "descr": "the inventory order of the items in your pack"
  },
  {
    "name": "paranoid_confirmation",
    "descr": "extra prompting in certain situations"
  },
  {
    "name": "petattr",
    "descr": "attributes for highlighting pets"
  },
  {
    "name": "pettype",
    "descr": "your preferred initial pet type"
  },
  {
    "name": "pickup_burden",
    "descr": "maximum burden picked up before prompt"
  },
  {
    "name": "pickup_types",
    "descr": "types of objects to pick up automatically"
  },
  {
    "name": "pile_limit",
    "descr": "threshold for \"there are many objects here\""
  },
  {
    "name": "roguesymset",
    "descr": "load a set of rogue display symbols from symbols file"
  },
  {
    "name": "runmode",
    "descr": "display frequency when `running' or `travelling'"
  },
  {
    "name": "scores",
    "descr": "the parts of the score list you wish to see"
  },
  {
    "name": "sortdiscoveries",
    "descr": "preferred order when displaying discovered objects"
  },
  {
    "name": "sortloot",
    "descr": "sort object selection lists by description"
  },
  {
    "name": "sortvanquished",
    "descr": "preferred order when displaying vanquished monsters"
  },
  {
    "name": "soundlib",
    "descr": "soundlib interface to use (if any)"
  },
  {
    "name": "statushilites",
    "descr": "0=no status highlighting, N=show highlights for N turns"
  },
  {
    "name": "statuslines",
    "descr": "2 or 3 lines for status display"
  },
  {
    "name": "suppress_alert",
    "descr": "suppress alerts about version-specific features"
  },
  {
    "name": "symset",
    "descr": "load a set of display symbols from symbols file"
  },
  {
    "name": "traps",
    "descr": "list of symbols to use in drawing traps"
  },
  {
    "name": "versinfo",
    "descr": "extra information for 'showvers'"
  },
  {
    "name": "warnings",
    "descr": "display characters for warnings"
  },
  {
    "name": "whatis_coord",
    "descr": "show coordinates when auto-describing cursor position"
  },
  {
    "name": "whatis_filter",
    "descr": "filter coordinate locations when targeting next or previous"
  },
  {
    "name": "cond_",
    "descr": "prefix for cond_ options"
  },
  {
    "name": "font",
    "descr": "prefix for font options"
  }
];
export const optionHelpOthers = [
  "autocompletions",
  "autopickup exceptions",
  "bind keys",
  "menu colors",
  "message types",
  "status condition fields",
  "status highlight rules"
];
