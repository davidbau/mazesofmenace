// @ts-nocheck
// doset_data.js — the allopt[] projection that C's doset() (#optionsfull)
// enumerates, GENERATED from the NetHack 5.0 headers, not transcribed.
//
// PROVENANCE.  The row list and its order come from a clang probe compiled
// a fourth NHOPT_DUMP macro branch that stringifies each NHOPTB/NHOPTC/NHOPTO
// argument list, so every #ifdef in the file is resolved by the same
// preprocessor the game is built with (that is what decides whether altmeta,
// showscore, timed_delay, BIOS, rawio and vt_tiledata have storage at all).
// The probe then replays, in C, the three filters doset() applies:
//   * options.c:8836-8845  is_wc_option(name) && !wc_supported(name), and the
//     wc2_ equivalent, against win/tty/wintty.c:98-125 tty_procs.wincap /
//     wincap2 (this is why ascii_map and perm_invent are absent);
//   * options.c:8830-8834  startpass = set_gameview, endpass = set_in_game
//     (not wizard mode);
//   * options.c:8838-8842  addr == 0, &flags.female, set_wizonly, set_wiznofuz.
// options.c:21-26 #defines PREV_MSGS from TTY_GRAPHICS, which is what moves
// 'msg_window' from set_in_config to set_in_game; the probe replays that too.
// Wizard boolean rows additionally retain their set_wizonly/set_wiznofuz
// filters below; doset() applies those against the live play mode and fuzzer flag.
// The original non-wizard 140-row sequence was validated row-for-row against the C
//
// LIMIT, STATED.  `val` for a compound/other option is C's get_val output.
// Where the port models the backing state (fruit, pickup_types, name, role,
// race, gender, alignment) `val` reads it live.  For the rest the port has NO
// writer for the backing field — there is no flags.end_disclose, no
// flags.inv_order, no flags.paranoia_bits — so `val` is the value C's get_val
// produces from its INITIAL state, with the C site cited.  That is exact for
// it will need the real handler the day one does.
//
// `longest` is options.c:8507 longest_option_name(set_gameview, set_in_game),
// the %-Ns field width of options.c:8826 fmtstr_doset.
import { game } from './gstate.js';
import { gs, PRIMARYSET } from './const.js';
import { aligns, genders } from './roles.js';
/* C ref: options.c:8060 oc_to_str — see js/drawing.js for why it lives there. */
import { oc_to_str } from './drawing.js';
import { menutype } from './menustyle.js';
import { feature_notice_version } from './feature_alert.js';

/* C ref: src/symbols.c:376 known_handling[] */
const KNOWN_HANDLING = ['UNKNOWN', 'IBM', 'DEC', 'CURS', 'MAC', 'UTF8'];

/* C ref: options.c:8735 term_for_boolean — booleanterms[value][termpref]. */
const BOOLEAN_TERMS = [
    ['false', 'off', 'disabled', 'excluded from build'],
    ['true', 'on', 'enabled', 'included'],
];
const TERMPREF = { Term_False: 0, Term_Off: 1, Term_Disabled: 2, Term_Excluded: 3 };

export const LONGEST_OPTION_NAME = 23;

/* Live reads for the handful of option fields the port actually models. */
const F = () => (game.flags = game.flags || {});
/* C ref: options.c:3392-3395 optfn_pickup_types(get_val).  Reads through
 * oc_to_str rather than `sel.join('')`: the rc parser stores a symbol string and
 * the 'O' submenu a symbol sequence, and .join exists on only one of them. */
const pickupTypes = () => {
    const ocl = oc_to_str(F().pickup_types);
    return ocl ? ocl : 'all';
};

/* The boolean rows, in doset()'s two-pass order: pass 0 (setwhere <=
 * set_gameview, rendered indented and NOT selectable) then pass 1
 * (setwhere >= set_in_game, selectable).  `init` is optlist.h's initval,
 * used when the port has no writer for the flag. */
export const DOSET_BOOLS = [
    { name: "blind", pass: 0, term: "Term_False", init: false, box: "u.uroleplay", fld: "blind" },
    { name: "bones", pass: 0, term: "Term_False", init: true, box: "flags", fld: "bones" },
    { name: "deaf", pass: 0, term: "Term_False", init: false, box: "u.uroleplay", fld: "deaf" },
    { name: "legacy", pass: 0, term: "Term_False", init: true, box: "flags", fld: "legacy" },
    { name: "news", pass: 0, term: "Term_False", init: false, box: "iflags", fld: "news" },
    { name: "nudist", pass: 0, term: "Term_False", init: false, box: "u.uroleplay", fld: "nudist" },
    { name: "pauper", pass: 0, term: "Term_False", init: false, box: "u.uroleplay", fld: "pauper" },
    { name: "reroll", pass: 0, term: "Term_False", init: false, box: "u.uroleplay", fld: "reroll" },
    { name: "selectsaved", pass: 0, term: "Term_False", init: true, box: "iflags", fld: "wc2_selectsaved" },
    { name: "status_updates", pass: 0, term: "Term_False", init: true, box: "iflags", fld: "status_updates" },
    { name: "tutorial", pass: 0, term: "Term_False", init: true, box: "flags", fld: "tutorial" },
    { name: "use_darkgray", pass: 0, term: "Term_False", init: true, box: "iflags", fld: "wc2_darkgray" },
    { name: "use_truecolor", pass: 0, term: "Term_False", init: false, box: "iflags", fld: "use_truecolor" },
    { name: "voices", pass: 0, term: "Term_Excluded", init: false, box: "iflags", fld: "voices" },
    { name: "accessiblemsg", pass: 1, term: "Term_False", init: false, box: "a11y", fld: "accessiblemsg" },
    { name: "acoustics", pass: 1, term: "Term_False", init: true, box: "flags", fld: "acoustics" },
    { name: "altmeta", pass: 1, term: "Term_False", init: false, box: "iflags", fld: "altmeta" },
    { name: "armorstatus", pass: 1, term: "Term_False", init: false, box: "flags", fld: "armorstatus" },
    { name: "autodescribe", pass: 1, term: "Term_False", init: true, box: "iflags", fld: "autodescribe" },
    { name: "autodig", pass: 1, term: "Term_False", init: false, box: "flags", fld: "autodig" },
    { name: "autoopen", pass: 1, term: "Term_False", init: true, box: "flags", fld: "autoopen" },
    { name: "autopickup", pass: 1, term: "Term_False", init: false, box: "flags", fld: "pickup" },
    { name: "autoquiver", pass: 1, term: "Term_False", init: false, box: "flags", fld: "autoquiver" },
    { name: "bgcolors", pass: 1, term: "Term_Off", init: true, box: "iflags", fld: "bgcolors" },
    { name: "checkpoint", pass: 1, term: "Term_False", init: true, box: "flags", fld: "ins_chkpt" },
    { name: "cmdassist", pass: 1, term: "Term_False", init: true, box: "iflags", fld: "cmdassist" },
    { name: "color", pass: 1, term: "Term_False", init: true, box: "iflags", fld: "wc_color" },
    { name: "confirm", pass: 1, term: "Term_False", init: true, box: "flags", fld: "confirm" },
    { name: "customcolors", pass: 1, term: "Term_False", init: true, box: "iflags", fld: "customcolors" },
    { name: "customsymbols", pass: 1, term: "Term_False", init: true, box: "iflags", fld: "customsymbols" },
    { name: "dark_room", pass: 1, term: "Term_False", init: true, box: "flags", fld: "dark_room" },
    { name: "debug_hunger", pass: 1, term: "Term_False", init: false, box: "iflags", fld: "debug_hunger", wizardOnly: true, wizNoFuz: true },
    { name: "debug_mongen", pass: 1, term: "Term_False", init: false, box: "iflags", fld: "debug_mongen", wizardOnly: true, wizNoFuz: true },
    { name: "debug_overwrite_stairs", pass: 1, term: "Term_False", init: false, box: "iflags", fld: "debug_overwrite_stairs", wizardOnly: true, wizNoFuz: true },
    { name: "dropped_nopick", pass: 1, term: "Term_False", init: true, box: "flags", fld: "nopick_dropped" },
    { name: "eight_bit_tty", pass: 1, term: "Term_False", init: false, box: "iflags", fld: "wc_eight_bit_input" },
    { name: "extmenu", pass: 1, term: "Term_False", init: false, box: "iflags", fld: "extmenu" },
    { name: "fireassist", pass: 1, term: "Term_False", init: true, box: "iflags", fld: "fireassist" },
    { name: "fixinv", pass: 1, term: "Term_False", init: true, box: "flags", fld: "invlet_constant" },
    { name: "force_invmenu", pass: 1, term: "Term_False", init: false, box: "iflags", fld: "force_invmenu" },
    { name: "goldX", pass: 1, term: "Term_False", init: false, box: "flags", fld: "goldX" },
    { name: "help", pass: 1, term: "Term_False", init: true, box: "flags", fld: "help" },
    { name: "herecmd_menu", pass: 1, term: "Term_False", init: false, box: "iflags", fld: "herecmd_menu" },
    { name: "hilite_pet", pass: 1, term: "Term_False", init: false, box: "iflags", fld: "wc_hilite_pet" },
    { name: "hilite_pile", pass: 1, term: "Term_False", init: false, box: "iflags", fld: "hilite_pile" },
    { name: "hitpointbar", pass: 1, term: "Term_False", init: false, box: "iflags", fld: "wc2_hitpointbar" },
    { name: "idlecheckpoint", pass: 1, term: "Term_Off", init: false, box: "iflags", fld: "idlecheckpoint" },
    { name: "ignintr", pass: 1, term: "Term_False", init: false, box: "flags", fld: "ignintr" },
    { name: "implicit_uncursed", pass: 1, term: "Term_False", init: true, box: "flags", fld: "implicit_uncursed" },
    { name: "lit_corridor", pass: 1, term: "Term_False", init: false, box: "flags", fld: "lit_corridor" },
    { name: "lootabc", pass: 1, term: "Term_False", init: false, box: "flags", fld: "lootabc" },
    { name: "mail", pass: 1, term: "Term_False", init: true, box: "flags", fld: "biff" },
    { name: "mention_decor", pass: 1, term: "Term_False", init: false, box: "flags", fld: "mention_decor" },
    { name: "mention_map", pass: 1, term: "Term_False", init: false, box: "a11y", fld: "glyph_updates" },
    { name: "mention_walls", pass: 1, term: "Term_False", init: false, box: "flags", fld: "mention_walls" },
    { name: "menu_overlay", pass: 1, term: "Term_False", init: true, box: "iflags", fld: "menu_overlay" },
    { name: "menu_tab_sep", pass: 1, term: "Term_False", init: false, box: "iflags", fld: "menu_tab_sep", wizardOnly: true },
    { name: "menucolors", pass: 1, term: "Term_False", init: false, box: "iflags", fld: "use_menu_color" },
    { name: "mon_movement", pass: 1, term: "Term_False", init: false, box: "a11y", fld: "mon_movement" },
    { name: "monpolycontrol", pass: 1, term: "Term_False", init: false, box: "iflags", fld: "monpolycontrol", wizardOnly: true },
    { name: "montelecontrol", pass: 1, term: "Term_False", init: false, box: "iflags", fld: "montelecontrol", wizardOnly: true },
    { name: "null", pass: 1, term: "Term_False", init: true, box: "flags", fld: "null" },
    { name: "pickup_stolen", pass: 1, term: "Term_False", init: true, box: "flags", fld: "pickup_stolen" },
    { name: "pickup_thrown", pass: 1, term: "Term_False", init: true, box: "flags", fld: "pickup_thrown" },
    { name: "price_quotes", pass: 1, term: "Term_False", init: false, box: "iflags", fld: "pricequotes" },
    { name: "pushweapon", pass: 1, term: "Term_False", init: false, box: "flags", fld: "pushweapon" },
    { name: "query_menu", pass: 1, term: "Term_False", init: false, box: "iflags", fld: "query_menu" },
    { name: "quick_farsight", pass: 1, term: "Term_False", init: false, box: "flags", fld: "quick_farsight" },
    { name: "rest_on_space", pass: 1, term: "Term_False", init: false, box: "flags", fld: "rest_on_space" },
    { name: "safe_pet", pass: 1, term: "Term_False", init: true, box: "flags", fld: "safe_dog" },
    { name: "safe_wait", pass: 1, term: "Term_False", init: true, box: "flags", fld: "safe_wait" },
    { name: "sanity_check", pass: 1, term: "Term_False", init: false, box: "iflags", fld: "sanity_check", wizardOnly: true },
    { name: "showdamage", pass: 1, term: "Term_False", init: false, box: "iflags", fld: "showdamage" },
    { name: "showexp", pass: 1, term: "Term_False", init: false, box: "flags", fld: "showexp" },
    { name: "showrace", pass: 1, term: "Term_False", init: false, box: "flags", fld: "showrace" },
    { name: "showvers", pass: 1, term: "Term_False", init: false, box: "flags", fld: "showvers" },
    { name: "silent", pass: 1, term: "Term_False", init: true, box: "flags", fld: "silent" },
    { name: "sortpack", pass: 1, term: "Term_False", init: true, box: "flags", fld: "sortpack" },
    { name: "sounds", pass: 1, term: "Term_Off", init: false, box: "iflags", fld: "sounds" },
    { name: "sparkle", pass: 1, term: "Term_False", init: true, box: "flags", fld: "sparkle" },
    { name: "spot_monsters", pass: 1, term: "Term_False", init: false, box: "a11y", fld: "mon_notices" },
    { name: "standout", pass: 1, term: "Term_False", init: false, box: "flags", fld: "standout" },
    { name: "terrainstatus", pass: 1, term: "Term_False", init: false, box: "flags", fld: "terrainstatus" },
    { name: "time", pass: 1, term: "Term_False", init: false, box: "flags", fld: "time" },
    { name: "tips", pass: 1, term: "Term_False", init: true, box: "flags", fld: "tips" },
    { name: "tombstone", pass: 1, term: "Term_False", init: true, box: "flags", fld: "tombstone" },
    { name: "toptenwin", pass: 1, term: "Term_False", init: false, box: "iflags", fld: "toptenwin" },
    { name: "travel", pass: 1, term: "Term_False", init: true, box: "flags", fld: "travelcmd" },
    { name: "travel_debug", pass: 1, term: "Term_False", init: false, box: "iflags", fld: "trav_debug", wizardOnly: true },
    { name: "use_inverse", pass: 1, term: "Term_False", init: true, box: "iflags", fld: "wc_inverse" },
    { name: "verbose", pass: 1, term: "Term_False", init: true, box: "flags", fld: "verbose" },
    { name: "weaponstatus", pass: 1, term: "Term_False", init: false, box: "flags", fld: "weaponstatus" },
    { name: "whatis_menu", pass: 1, term: "Term_False", init: false, box: "iflags", fld: "getloc_usemenu" },
    { name: "whatis_moveskip", pass: 1, term: "Term_False", init: false, box: "iflags", fld: "getloc_moveskip" },
    { name: "wizmgender", pass: 1, term: "Term_False", init: false, box: "iflags", fld: "wizmgender", wizardOnly: true },
    { name: "wizweight", pass: 1, term: "Term_False", init: false, box: "iflags", fld: "wizweight", wizardOnly: true },
];

/* CompOpt rows; `sel` false means setwhere == set_gameview, which doset
 * renders with a "    " indent and a_int 0 (options.c:9060). */
export const DOSET_COMPOUNDS = [
    /* C: options.c optfn_windowtype get_val -> windowprocs.name */
    { name: "windowtype", sel: false, hasHandler: false, val: () => "tty" },
    /* C: options.c optfn_playmode get_val -> wizard?"debug":discover?"explore":"normal" */
    { name: "playmode", sel: false, hasHandler: false, val: () => F().debug ? "debug" : F().explore ? "explore" : "normal" },
    /* C: options.c optfn_name get_val -> svp.plname */
    { name: "name", sel: false, hasHandler: false, val: () => game.plname || "" },
    /* C: options.c optfn_role get_val -> roles[flags.initrole].name.m/.f */
    { name: "role", sel: false, hasHandler: false, val: () => (game.urole?.name && (game.flags?.initgend === 1 ? game.urole.name.f : game.urole.name.m)) || "" },
    /* C: options.c optfn_race get_val -> races[flags.initrace].noun; js/roles.js spells that field `name` ("orc") and keeps the C `adj` ("orcish") beside it */
    { name: "race", sel: false, hasHandler: false, val: () => game.urace?.name || "" },
    /* C: options.c optfn_gender get_val -> genders[flags.initgend].adj */
    { name: "gender", sel: false, hasHandler: false, val: () => (genders[game.flags?.initgend | 0]?.name || "") },
    /* C: options.c optfn_alignment get_val -> aligns[flags.initalign].adj */
    { name: "alignment", sel: false, hasHandler: false, val: () => (aligns[game.flags?.initalign | 0]?.adj || "") },
    /* C: options.c optfn_catname get_val -> svn.catname, empty -> "(none)" */
    { name: "catname", sel: false, hasHandler: false, val: () => game.flags?.catname || "(none)" },
    /* C: options.c optfn_dogname get_val */
    { name: "dogname", sel: false, hasHandler: false, val: () => game.flags?.dogname || "(none)" },
    /* C: options.c optfn_horsename get_val */
    { name: "horsename", sel: false, hasHandler: false, val: () => game.flags?.horsename || "(none)" },
    /* C: options.c optfn_msghistory get_val -> iflags.msg_history (init 20) */
    { name: "msghistory", sel: false, hasHandler: false, val: () => "20" },
    /* C: options.c optfn_pettype get_val -> gp.preferred_pet 0 -> "random" */
    { name: "pettype", sel: false, hasHandler: false, val: () => "random" },
    /* C: options.c optfn_soundlib get_val -> soundlib_name(gs.active_soundlib) */
    { name: "soundlib", sel: false, hasHandler: false, val: () => "nosound" },
    /* C: options.c:1145 optfn_autounlock get_val; flags.autounlock init AUTOUNLOCK_APPLY_KEY */
    { name: "autounlock", sel: true, hasHandler: true, val: () => "apply-key" },
    /* C: options.c:1235 optfn_boulder get_val -> showsyms[ROCK_CLASS] = "`" */
    { name: "boulder", sel: true, hasHandler: false, val: () => "`" },
    /* C: options.c:1274 — gc.crash_email is NULL, so opts stays empty and doset_add_menu (options.c:9026) keeps its "unknown" default */
    { name: "crash_email", sel: true, hasHandler: false, val: () => "unknown" },
    /* C: options.c:1300 — same as crash_email */
    { name: "crash_name", sel: true, hasHandler: false, val: () => "unknown" },
    /* C: options.c:1332 -> gc.crash_urlmax, init -1 */
    { name: "crash_urlmax", sel: true, hasHandler: false, val: () => "-1" },
    /* C: options.c:1546 — flags.end_disclose[] init DISCLOSE_PROMPT_DEFAULT_NO ('n') for i,a,v,g,c,o */
    { name: "disclose", sel: true, hasHandler: true, val: () => "ni na nv ng nc no" },
    /* C: options.c optfn_fruit get_val -> svp.pl_fruit */
    { name: "fruit", sel: true, hasHandler: false, val: () => game.pl_fruit || "slime mold" },
    /* C: options.c:1840 optfn_glyph get_val -> to_be_done */
    { name: "glyph", sel: true, hasHandler: false, val: () => "(to be done)" },
    /* C: options.c:1883 — count_status_hilites() == 0 */
    { name: "hilite_status", sel: true, hasHandler: false, val: () => "(none)" },
    /* C: options.c:2209 color_attr_to_str(iflags.menu_headings) with strNsubst " "->"-" */
    { name: "menu_headings", sel: true, hasHandler: true, val: () => "no-color&inverse" },
    /* C: options.c:2279 objsymvals[iflags.menuobjsyms].nam */
    { name: "menu_objsyms", sel: true, hasHandler: true, val: () => "conditional" },
    /* C: options.c:2312 iflags.menuinvertmode, init 1 */
    { name: "menuinvertmode", sel: true, hasHandler: false, val: () => "1" },
    /* C: options.c:2367 menutype[flags.menu_style][0]; init MENU_FULL */
    { name: "menustyle", sel: true, hasHandler: true, val: () => menutype[game.flags?.menu_style ?? 2][0] },
    /* C: options.c:2501 iflags.prevmsg_window 's' -> "single" */
    { name: "msg_window", sel: true, hasHandler: true, val: () => "single" },
    /* C: options.c:2622 numpadmodes[0]; gc.Cmd.num_pad is FALSE */
    { name: "number_pad", sel: true, hasHandler: true, val: () => "0=off" },
    /* C: options.c:2684 oc_to_str(flags.inv_order) — the def_inv_order[] class list */
    { name: "packorder", sel: true, hasHandler: false, val: () => "$\")[%?+!=/(*`0_" },
    /* C: options.c:3021 — flags.paranoia_bits init PARANOID_PRAY|PARANOID_TRAP|PARANOID_SWIM */
    { name: "paranoid_confirmation", sel: true, hasHandler: true, val: () => "pray trap swim" },
    /* C: options.c:3177 attr2attrname(iflags.wc2_petattr); init ATR_INVERSE */
    { name: "petattr", sel: true, hasHandler: true, val: () => "inverse" },
    /* C: options.c:3297 burdentype[flags.pickup_burden]; init MOD_ENCUMBER... -> "stressed" */
    { name: "pickup_burden", sel: true, hasHandler: true, val: () => "stressed" },
    /* C: options.c optfn_pickup_types get_val -> oc_to_str(flags.pickup_types), empty -> "all" */
    { name: "pickup_types", sel: true, hasHandler: true, val: () => pickupTypes() },
    /* C: options.c:3430 flags.pile_limit; init PILE_LIMIT_DFLT = 5 */
    { name: "pile_limit", sel: true, hasHandler: false, val: () => "5" },
    /* C: options.c optfn_roguesymset get_val — no rogue symset loaded */
    { name: "roguesymset", sel: true, hasHandler: true, val: () => "default" },
    /* C: options.c:3658 runmodes[flags.runmode]; init RUN_LEAP -> "run" */
    { name: "runmode", sel: true, hasHandler: true, val: () => ["teleport", "run", "walk", "crawl"][F().runmode ?? 1] ?? "run" },
    /* C: options.c:3745 — flags.end_top 3, end_around 2, end_own FALSE */
    { name: "scores", sel: true, hasHandler: false, val: () => "3 top/2 around" },
    /* C: options.c:3902 get_sortdisco(); init SORTDISCO_DFLT */
    { name: "sortdiscoveries", sel: true, hasHandler: true, val: () => "by order of discovery within each class" },
    /* C: options.c:3943 sortltype[] entry for flags.sortloot; init 'l' */
    { name: "sortloot", sel: true, hasHandler: true, val: () => "loot" },
    /* C: options.c:3991 vanqorders[flags.vanq_sortmode]; get_val appends ": <descr>" */
    { name: "sortvanquished", sel: true, hasHandler: true, val: () => "t: traditional: by monster level" },
    /* C: options.c:4044 — iflags.hilite_delta 0 */
    { name: "statushilites", sel: true, hasHandler: false, val: () => "0 (off: don't highlight status fields)" },
    /* C: options.c:4099 — iflags.wc2_statuslines < 3 */
    { name: "statuslines", sel: true, hasHandler: false, val: () => "2" },
    /* C: options.c:4150 — live FEATURE_NOTICE_VER_{MAJ,MIN,PATCH} fields. */
    { name: "suppress_alert", sel: true, hasHandler: false,
      val: () => F().suppress_alert ? feature_notice_version(F().suppress_alert) : "(none)" },
    /* C: options.c optfn_symset get_val -> "<name>, active, handler=<H>" */
    { name: "symset", sel: true, hasHandler: true, val: () => {
        /* C ref: options.c:4180 optfn_symset get_val — the set NAME, then
         * ", active" when it is the current graphics set, then
         * ", handler=<H>" when a handler is in effect. */
        const set = (gs.symset || [])[PRIMARYSET] || {};
        let v = set.name ? set.name : 'default';
        if (set.name) v += ', active';
        if (set.handling) v += ', handler=' + KNOWN_HANDLING[set.handling];
        return v;
    } },    /* C: options.c:4517 — flags.versinfo 1 (VI_NUMBER), status_version() "5.0.0" */
    { name: "versinfo", sel: true, hasHandler: true, val: () => "1: number (5.0.0)" },
    /* C: options.c:4732 — iflags.getpos_coords GPCOORDS_NONE */
    { name: "whatis_coord", sel: true, hasHandler: true, val: () => "none" },
    /* C: options.c:4783 — iflags.getloc_filter GFILTER_NONE */
    { name: "whatis_filter", sel: true, hasHandler: true, val: () => "none" },
];

export const DOSET_OTHERS = [
    /* C: options.c optfn_o_autocomplete get_val -> count_autocompletions() */
    { name: "autocompletions", sel: true, val: () => "(0 currently set)" },
    /* C: options.c optfn_o_autopickup_exceptions get_val */
    { name: "autopickup exceptions", sel: true, val: () => "(0 currently set)" },
    /* C: options.c optfn_o_bind_keys get_val */
    { name: "bind keys", sel: true, val: () => "(0 currently set)" },
    /* C: options.c optfn_o_menu_colors get_val */
    { name: "menu colors", sel: true, val: () => "(0 currently set)" },
    /* C: options.c optfn_o_message_types get_val */
    { name: "message types", sel: true, val: () => "(0 currently set)" },
    /* C: options.c optfn_o_status_cond get_val — 16 conditions */
    { name: "status condition fields", sel: true, val: () => "(16 currently set)" },
    /* C: options.c optfn_o_status_hilites get_val */
    { name: "status highlight rules", sel: true, val: () => "(0 currently set)" },
];

/* C ref: options.c:8735 term_for_boolean(idx, b). */
export function term_for_boolean(row, value) {
    const i = TERMPREF[row.term] || 0;
    return BOOLEAN_TERMS[value ? 1 : 0][i];
}
