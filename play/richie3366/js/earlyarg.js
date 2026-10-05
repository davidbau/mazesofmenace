/**
 * C-home for `nethack-c/upstream/src/earlyarg.c` — early command-line
 * argument handling (`early_options` scan, `lopt` matcher, consume
 * helpers, terminate/usage/scores tails, `argcheck`, debug/dump arms).
 *
 * Rule #2: no process/filesystem plumbing lives here. C's `argc`/`argv`
 * out-params arrive as `{ v }` boxes (botl.js anything-box precedent);
 * `chdirx`/`exit`/`dlb`/`whoami`/signal arms are named omissions and C
 * ATTRNORETURN tails render as their live effects + return.
 */

import { game } from './gstate.js';
import { prscore } from './topten.js';
import { BUFSZ, EXIT_SUCCESS, EXIT_FAILURE } from './const.js';
import { match_optname, initoptions } from './options.js';
import { dupstr } from './dungeon.js';
import { raw_printf, MAX_GLYPH, MAXPCHARS, MAXMCLASSES } from './display.js';
import { strncmpi, strstri, eos } from './hacklib.js';
import { config_error_init, config_error_done, config_erradd } from './cfgfiles.js';
import { dump_all_glyphids } from './glyphs.js';
import { nh_terminate } from './end.js';
import { getversionstring, runtime_info_init, release_runtime_info } from './version.js';
import { dump_weights } from './hack.js';
import { monsterNames, NUMMONS, NON_PM, LOW_PM, SPECIAL_PM } from './generated/monsters_data.js';
import { objectNames, NUM_OBJECTS, LAST_GENERIC, FIRST_OBJECT, FIRST_REAL_GEM, LAST_REAL_GEM, MAXOCLASSES } from './generated/objects_data.js';
import { NROFARTIFACTS, artilistRaw } from './generated/artifacts_data.js';
import { ENUMDUMP_CMAP, ENUMDUMP_MON_SYMS, ENUMDUMP_MON_DEFCHARS, ENUMDUMP_OC_DEFCHARS, ENUMDUMP_OC_CLASSES, ENUMDUMP_OC_SYMS } from './generated/enumdumps_data.js';
import { MCASTU_SPELL_DEFS } from './mcastu.js';
import { MAXSPELL } from './spell.js';
import { dump_mongen } from './makemon.js';
import { crashreport_bidshow } from './report.js';
// imports.mjs --can: earlyarg.js has no importers, so these edges cannot
// close a cycle. version.js stays a leaf (const.js reads it at load);
// early_version_info lives here so it can call raw_printf.

/**
 * C ref: earlyarg.c scores_only `:404–441` (ATTRNORETURN staticfn) — the
 * `-s` early-arg path: show score subsets, then terminate without
 * starting play. Whole body in C order with per-arm `:line` cites.
 *
 * C is synchronous; this is async only because `prscore` is async in
 * JS (render surface). C's ATTRNORETURN is unrepresentable without a
 * process to exit: after the terminate tail this returns to the caller.
 *
 * @param {number} argc C argc after the caller's `argc + 1` adjustment
 * @param {string[]} argv C argv after the caller's `argv - 1` adjustment
 *   (argv[1] holds `-scores` or its leading substring, as prscore expects)
 * @param {string} dir C hackdir (`*hackdir_p`); used only by the omitted
 *   chdir arm below
 * @returns {Promise<void>}
 */
export async function scores_only(argc, argv, dir) {
    // C `:407–410` — flush queued config errors now, in case an error
    // summary is coming. Live since config_erradd (D-3098) queues.
    config_error_done();
    /* C `:412–416` — CHDIR chdirx(dir, FALSE) (nhUse(dir) without CHDIR;
       config.h:438 defines CHDIR, so chdirx is the live arm). Rule #2
       omit: no CWD/filesystem in scored JS. */
    // C `:417–421` — SYSCF gate (config.h:233 live): sysconf options
    // affect whether panictrace is enabled, so run initoptions() with
    // termination suppressed. Live export js/options.js.
    if (!game.iflags) game.iflags = {};
    game.iflags.initoptions_noterminate = true; // C `:418`
    initoptions(); // C `:419`
    if (game.program_state?.gameover) return; // propagate C noreturn before prscore
    game.iflags.initoptions_noterminate = false; // C `:420`
    /* C `:423–427` — PANICTRACE ARGV0 save + panictrace_setsignals(TRUE)
       (config.h:276 live on linux). Platform omit: no signal/stack-trace
       setup in scored JS. */
    /* C `:428–430` — UNIX whoami(): set up default plname[] from the OS
       user. Platform omit: no OS user in scored JS (cf. getuid()→0 in
       js/topten.js); the plname default is owned by the JS
       startup/askname path. */
    await prscore(argc, argv); // C `:431` — live export js/topten.js
    /* C `:432–437` — MSWIN_GRAPHICS wait_synch: compiles out
       (config.h:61 leaves MSWIN_GRAPHICS undefined). */
    // C `:439` — nh_terminate(EXIT_SUCCESS), bypassing opt_terminate().
    // Live export js/end.js (sets in_moveloop/exiting/gameover); the
    // process exit itself has no scored counterpart — return (NOTREACHED).
    nh_terminate(EXIT_SUCCESS);
}

/* C earlyarg.c:54 — ArgVal_novalue (note: not 'const' in C; JS
   strings are immutable, so a const is exact). */
const ARGVAL_NOVALUE = '[nothing]';
/* C earlyarg.c:56–65 — enum cmdlinearg (file-local in C too). */
const ARGVAL_REQUIRED = 0, ARGVAL_OPTIONAL = 1, ARGVAL_DISALLOWED = 2,
    ARGVAL_MASK = 3, ARGNAME_ONELETTER = 4, ARGNAME_MASK = 4,
    ARGERR_SILENT = 0, ARGERR_COMPLAIN = 8, ARGERR_MASK = 8;

/**
 * C ref: earlyarg.c lopt `:71–144` (staticfn → file-local).
 * Match one command-line token against an option name: `-w[indowtype]`
 * prefix, `=`/`:` value, one-letter `-wfoo`, or the next argv element.
 * Whole body in C order. C's `char **`/`int *` out-params are `{ v }`
 * boxes; C null-pointer tests render as `=== null` (an empty-string
 * argv element is non-null in C but falsy in JS, so bare truthiness
 * would misread it). `charAt` renders C's NUL-at-end indexing.
 * @param {string} arg command line token (leading dashes pre-stripped)
 * @param {number} lflags cmdlinearg bits (value/name/error classes)
 * @param {string} optname option's full name (`-windowtype`)
 * @param {string} origarg token before dash-prefix removal (diagnostics)
 * @param {{v:number}} argcBox argc in/out
 * @param {{v:string[]}} argvBox argv in/out
 * @returns {string|null} value, ARGVAL_NOVALUE, or null (bail)
 */
function lopt(arg, lflags, optname, origarg, argcBox, argvBox) {
    const argc = argcBox.v; // C `:78`
    const argv = argvBox.v; // C `:79`
    // C `:80` — argv[1] is only read when argc > 1.
    const nextarg = (argc > 1 && argv[1][0] !== '-') ? argv[1] : null;
    const opttype = lflags & ARGVAL_MASK; // C `:81`
    const oneletterok = (lflags & ARGNAME_MASK) === ARGNAME_ONELETTER; // C `:82`
    const complain = (lflags & ARGERR_MASK) === ARGERR_COMPLAIN; // C `:83`
    // C config_error_add(fmt, "%.60s") ≡ pre-truncated text fed to the
    // live config_erradd core (D-3098); the botl.js same-named export
    // stays the options/doset message sink.
    const bail = (msg) => { // C loptbail `:87–90`
        if (complain) config_erradd(`${msg}${origarg.slice(0, 60)}`);
        return null;
    };

    /* first letter must match */
    if (arg.charAt(1) !== optname.charAt(1)) // C `:86`
        return bail('Unknown option: ');

    let p = null; // C `:100–101` — '=' wins over ':'.
    const eqAt = arg.indexOf('=');
    if (eqAt >= 0) p = arg.slice(eqAt);
    else {
        const colonAt = arg.indexOf(':');
        if (colonAt >= 0) p = arg.slice(colonAt);
    }
    if (p !== null && opttype === ARGVAL_DISALLOWED) // C `:103–104`
        return bail('Value not allowed: '); // C loptnotallowed `:91–94`

    const l = p !== null ? arg.length - p.length : arg.length; // C `:106`
    if ((l > 2 || oneletterok) // C `:107`
        && arg.slice(0, l) === optname.slice(0, l)) { // strncmp `:107`
        /* "-windowtype[=foo]" */
        if (p !== null)
            p = p.slice(1); /* past '=' or ':' */ // C `:110`
        else if (opttype === ARGVAL_REQUIRED)
            p = arg.slice(eos(arg)); /* "-w[indowtype]" w/o "=foo":
               take foo from next element */ // C `:111–113`
        else
            return ARGVAL_NOVALUE; // C `:114–115`
    } else if (oneletterok) {
        /* "-w..." but not "-w[indowtype[=foo]]" */
        if (p === null) {
            p = arg.slice(2); /* past 'w' of "-wfoo" */ // C `:119`
            /* C `:120–124` — `#if 0` "-w:foo" arm (not supported,
               callers don't expect it): compiles out, cited only. */
        } else {
            /* "-w...=foo" but not "-w[indowtype]=foo" */
            return bail('Unknown option: '); // C `:125–127`
        }
    } else {
        return bail('Unknown option: '); // C `:129–131`
    }
    if (p === null || p === '') { // C `:132` — `!p || !*p`
        /* "-w[indowtype]" w/o '='/':' if there is a next element, use
           it for "foo"; if not, supply a non-Null bogus value */
        if (nextarg !== null
            && (opttype === ARGVAL_REQUIRED || opttype === ARGVAL_OPTIONAL)) {
            p = nextarg; // C `:137`
            argcBox.v--; // C `:137` --(*argc_p)
            argvBox.v = argvBox.v.slice(1); // C `:137` ++(*argv_p)
        } else if (opttype === ARGVAL_REQUIRED) {
            return bail('Missing required value: '); // C loptrequired `:138–139`
        } else {
            p = ARGVAL_NOVALUE; /* there is no next element */ // C `:141`
        }
    }
    return p; // C `:143`
}

/**
 * C ref: earlyarg.c consume_arg `:149–162` (staticfn → file-local).
 * Move argv[ndx] to the end of the array, then reduce argc to hide it
 * so process_options() never sees it; elements get reordered but all
 * remain intact. Mutates the boxed array in place (reference stable).
 */
function consume_arg(ndx, acBox, avBox) {
    const av = avBox.v; // C `:151`
    const ac = acBox.v; // C `:152`
    /* "-one -two -three -four" -> "-two -three -four -one" */
    if (ac > 2) { // C `:155`
        const gone = av[ndx]; // C `:156`
        for (let i = ndx + 1; i < ac; ++i) // C `:157–158`
            av[i - 1] = av[i];
        av[ac - 1] = gone; // C `:159`
    }
    acBox.v--; // C `:161` --(*ac_p)
}

/**
 * C ref: earlyarg.c consume_two_args `:166–176` (staticfn → file-local).
 * Consume a "-two arg" pair so the hidden tail reads "-two arg"
 * rather than the "arg -two" two plain consume_arg() calls give.
 */
function consume_two_args(ndx, acBox, avBox) {
    /* when consuming "-two arg" from "-two arg -three -four",
       the *ac_p manipulation results in "-three -four -two arg"
       rather than the "-three -four arg -two" that would happen
       with just two ordinary consume_arg() calls */
    consume_arg(ndx, acBox, avBox); // C `:172`
    acBox.v++; /* bring the final slot back into view */ // C `:173`
    consume_arg(ndx, acBox, avBox); // C `:174`
    acBox.v--; /* take away restored slot */ // C `:175`
}

/**
 * C ref: earlyarg.c early_options `:180–361` — scan argv for the early
 * (pre-window) options: debug/dump/version/showpaths/directory/help/
 * nethackrc/scores/usage/windowtype. Whole body in C order; per-iteration
 * locals are `{ v }` boxes so lopt's `--argc/++argv` consume arm lands
 * exactly where C's does. Async only because scores_only awaits prscore.
 * Every C `opt_terminate()/opt_usage()/scores_only()` tail is NOTREACHED
 * (process exit); with no process to exit the live effects run and this
 * returns instead.
 * @param {{v:number}} argcBox argc in/out (argv[0] is the program name)
 * @param {{v:string[]}} argvBox argv in/out
 * @param {{v:string}} hackdirBox hackdir in/out
 */
export async function early_options(argcBox, argvBox, hackdirBox) {
    let ndx = 0, consumed = 0; // C `:183`
    let oldargc; // C `:183`

    // C `:185–188` — ENHANCED_SYMBOLS (config.h:368) defines this arm.
    if (argcheck(argcBox.v, argvBox.v, ARG_DUMPGLYPHIDS) === 2) {
        opt_terminate();
        return; // C NOTREACHED (no process to exit)
    }

    config_error_init(false, 'command line', false); // C `:190`

    /* treat "nethack ?" as a request for usage info; due to shell
       processing, player likely has to use "nethack \?" or "nethack '?'" */
    if (argcBox.v > 1 && argvBox.v[1] === '?') { // C `:195–196`
        opt_usage(hackdirBox.v); /* doesn't return */
        return; // C NOTREACHED
    }

    /*
     * Both *argc_p and *argv_p account for the program name as (*argv_p)[0];
     * local argc and argv implicitly discard that (by starting 'ndx' at 1).
     * argcheck() doesn't mind, prscore() (via scores_only()) does (for the
     * number of args it gets passed, not for the value of argv[0]).
     */
    for (ndx = 1; ndx < argcBox.v; ndx += (consumed ? 0 : 1)) { // C `:204`
        consumed = 0; // C `:205`
        const argcB = { v: argcBox.v - ndx }; // C `:206`
        const argvB = { v: argvBox.v.slice(ndx) }; // C `:207` argv = *argv_p + ndx

        let arg = argvB.v[0]; // C `:209` arg = origarg = argv[0]
        const origarg = arg;
        /* skip any args intended for deferred options */
        if (arg.charAt(0) !== '-') // C `:211–212`
            continue;
        /* allow second dash if arg name is longer than one character */
        if (arg.charAt(0) === '-' && arg.charAt(1) === '-' && arg.charAt(2) !== '' // C `:214–217`
            && (arg.charAt(3) !== '' && arg.charAt(3) !== '=' && arg.charAt(3) !== ':'))
            arg = arg.slice(1); // C `:218` ++arg

        switch (arg.charAt(1)) { /* char after leading dash */ // C `:220`
        case 'b': // C `:221`
            // C `:222–228` — CRASHREPORT (config.h:250, linux) `--bidshow`.
            if (argcheck(argcB.v, argvB.v, ARG_BIDSHOW) === 2) {
                opt_terminate();
                return; // C NOTREACHED
            }
            break;
        case 'd': { // C `:229`
            // C `:232` — NODUMPENUMS is commented out (config.h:360), so
            // the `#ifndef NODUMPENUMS` ARG_DUMPENUMS arm below is live.
            if (argcheck(argcB.v, argvB.v, ARG_DEBUG) === 1) { // C `:230`
                consume_arg(ndx, argcBox, argvBox); // C `:231`
                consumed = 1;
            } else if (argcheck(argcB.v, argvB.v, ARG_DUMPENUMS) === 2) { // C `:233`
                opt_terminate();
                return; // C NOTREACHED
            } else if (argcheck(argcB.v, argvB.v, ARG_DUMPMONGEN) === 2) { // C `:237`
                opt_terminate();
                return; // C NOTREACHED
            } else if (argcheck(argcB.v, argvB.v, ARG_DUMPWEIGHTS) === 2) { // C `:239`
                opt_terminate();
                return; // C NOTREACHED
            } else {
                // C `:243` — CHDIR (config.h:438) live.
                oldargc = argcB.v; // C `:244`
                const darg = lopt(arg, // C `:245–247`
                    (ARGVAL_REQUIRED | ARGNAME_ONELETTER | ARGERR_SILENT),
                    '-directory', origarg, argcB, argvB);
                if (darg === null) { // C `:248–249`
                    errorNoReturn('Flag -d must be followed by a directory name.');
                    return; // C error() never returns (NORETURN)
                }
                if (darg.charAt(0) !== 'e') { /* avoid matching -decgraphics or -debug */ // C `:250`
                    hackdirBox.v = darg; // C `:251` *hackdir_p = arg
                    if (oldargc === argcB.v) { // C `:252`
                        consume_arg(ndx, argcBox, argvBox);
                        consumed = 1;
                    } else {
                        consume_two_args(ndx, argcBox, argvBox); // C `:255`
                        consumed = 2;
                    }
                }
            }
            break;
        }
        case 'h': // C `:260`
        case '?': // C `:261`
            if (lopt(arg, ARGVAL_DISALLOWED, '-help', origarg, argcB, argvB) !== null // C `:262`
                || lopt(arg, ARGVAL_DISALLOWED | ARGNAME_ONELETTER, '-?', // C `:263–264`
                    origarg, argcB, argvB) !== null) {
                opt_usage(hackdirBox.v); /* doesn't return */ // C `:265`
                return; // C NOTREACHED
            }
            break;
        case 'n': { // C `:267`
            oldargc = argcB.v; // C `:268`
            let narg;
            if (arg === '-no-nethackrc') /* no abbreviation allowed */ // C `:269`
                narg = '/dev/null'; // C `:270` nhStr ≡ identity cast
            else
                narg = lopt(arg, (ARGVAL_REQUIRED | ARGERR_COMPLAIN), // C `:272–273`
                    '-nethackrc', origarg, argcB, argvB);
            if (narg !== null) { // C `:274`
                if (!game.gc) game.gc = {};
                game.gc.cmdline_rcfile = dupstr(narg); // C `:275`
                if (oldargc === argcB.v) { // C `:276`
                    consume_arg(ndx, argcBox, argvBox);
                    consumed = 1;
                } else {
                    consume_two_args(ndx, argcBox, argvBox); // C `:279`
                    consumed = 2;
                }
            }
            break;
        }
        case 's': // C `:282`
            if (argcheck(argcB.v, argvB.v, ARG_SHOWPATHS) === 2) { // C `:283`
                if (!game.gd) game.gd = {};
                game.gd.deferred_showpaths = true; // C `:284`
                game.gd.deferred_showpaths_dir = hackdirBox.v; // C `:285`
                config_error_done(); // C `:286`
                return; // C `:287`
            }
            /* check for "-s" request to show scores */
            if (lopt(arg, // C `:290–295`
                    ((ARGVAL_DISALLOWED | ARGERR_COMPLAIN)
                     /* only accept one-letter if there is just one
                        dash; reject "--s" because prscore() via
                        scores_only() doesn't understand it */
                     | ((origarg.charAt(1) !== '-') ? ARGNAME_ONELETTER : 0)),
                    /* [ought to omit val-disallowed and accept
                       --scores=foo since -s foo and -sfoo are
                       allowed, but -s form can take more than one
                       space-separated argument and --scores=foo
                       isn't suited for that] */
                    '-scores', origarg, argcB, argvB) !== null) {
                /* at this point, argv[0] contains "-scores" or a leading
                   substring of it; prscore() (via scores_only()) expects
                   that to be in argv[1] so we adjust the pointer to make
                   that be the case; if there are any non-early args waiting
                   to be passed along to process_options(), the resulting
                   argv[0] will be one of those rather than the program
                   name but prscore() doesn't care */
                // C `:309` — argv-1 ≡ the live slot before this ndx; the
                // -s lopt above is ArgValDisallowed so it never consumed
                // (local argv still ≡ base+ndx).
                await scores_only(argcB.v + 1,
                    [argvBox.v[ndx - 1], ...argvB.v], hackdirBox.v);
                return; // C NOTREACHED
            }
            break;
        case 'u': // C `:313`
            // C `:314–316` — UNIX (config.h:18) arm; the WIN32/MSDOS/AMIGA
            // `-u<name>` arm below it compiles out.
            if (lopt(arg, ARGVAL_DISALLOWED, '-usage', origarg, argcB, argvB) !== null) { // C `:315`
                opt_usage(hackdirBox.v); // C `:316`
                return; // C NOTREACHED
            }
            break;
        case 'v': // C `:331`
            if (argcheck(argcB.v, argvB.v, ARG_VERSION) === 2) { // C `:332`
                opt_terminate();
                return; // C NOTREACHED
            }
            break;
        case 'w': { /* windowtype: "-wfoo" or "-w[indowtype]=foo"
                   * or "-w[indowtype]:foo" or "-w[indowtype] foo" */ // C `:337–338`
            const warg = lopt(arg, // C `:340–341`
                (ARGVAL_REQUIRED | ARGNAME_ONELETTER | ARGERR_COMPLAIN),
                '-windowtype', origarg, argcB, argvB);
            if (!game.gc) game.gc = {};
            // C `:342–343` free(gc.cmdline_windowsys) — N/A, JS strings
            // unowned (options.js:6883 precedent).
            game.gc.cmdline_windowsys = warg !== null ? dupstr(warg) : null; // C `:344`
            break;
        }
        /* C `:346–353` — case 'D'/'X' wizard/discover toggles compile out
           (`#if !defined(UNIX) && !defined(VMS)`; UNIX is defined). */
        default: // C `:354`
            break;
        }
    }
    /* empty or "N errors on command line" */
    config_error_done(); // C `:359`
    return; // C `:360`
}

/**
 * C ref: sys/share/unixtty.c error `:473–486` — fatal error: tty reset,
 * message + newline, exit(EXIT_FAILURE). Not a pinned-C function (sys/
 * platform layer); this file-local renders its two observable effects
 * for the early_options `:249` -d arm. `window_inited` is false this
 * early (exit_nhwindows arm vacuous) and settty is tty-only.
 * @param {string} msg already-formatted text (Vprintf ≡ verbatim here)
 */
function errorNoReturn(msg) {
    raw_printf('%s', `${msg}\n`); // C `:482–483` Vprintf + putchar
    nh_terminate(EXIT_FAILURE); // C `:485` exit(EXIT_FAILURE)
    // C NOTREACHED ≡ return to the (returning) caller below.
}

/**
 * C ref: earlyarg.c opt_terminate `:366–373` (staticfn → file-local).
 * Terminate without starting play (`nethack --version`, `nethack -s
 * Zelda`); C exits, so every call site returns after the call.
 */
function opt_terminate() {
    if (!game.program_state) game.program_state = {};
    game.program_state.early_options = 0; // C `:368`
    config_error_done(); /* free memory allocated by config_error_init() */ // C `:369`
    nh_terminate(EXIT_SUCCESS); // C `:371`
    /*NOTREACHED*/
}

/**
 * C ref: earlyarg.c opt_usage `:376–387` (staticfn → file-local).
 * Show usage help, then terminate (call sites return after the call).
 * @param {string} hackdir C hackdir (chdir arm only)
 */
function opt_usage(hackdir) {
    /* C `:378–381` — CHDIR chdirx(hackdir, TRUE) is the live arm
       (config.h:438). Rule #2 omit: no CWD/filesystem in scored JS. */
    void hackdir;
    // C `:383` dlb_init() — named omit (data-library/file init).
    // C `:385` genl_display_file(USAGEHELP, TRUE) — named omit (usagehlp
    // text window; no scored channel — own row if ever wired).
    opt_terminate(); // C `:386`
}

/**
 * C ref: earlyarg.c after_opt_showpaths `:391–400` — deferred-showpaths
 * tail: back to the showpaths dir, then terminate (no return in C).
 * Sole C caller files.c:3101 (do_deferred_showpaths, files.js — wired);
 * exported for that path.
 * @param {string} dir C gd.deferred_showpaths_dir (chdir arm only)
 */
export function after_opt_showpaths(dir) {
    /* C `:393–397` — CHDIR chdirx(dir, FALSE) is the live arm
       (config.h:438). Rule #2 omit: no CWD/filesystem in scored JS. */
    void dir;
    opt_terminate(); // C `:398`
    /*NOTREACHED*/
}

/**
 * C ref: hack.h enum earlyarg `:433–447` on this build.
 * `NODUMPENUMS` is commented out (`config.h:360`), so `ARG_DUMPENUMS`
 * is present. `WIN32` is not defined (`config1.h` sets it only from
 * `_WIN32`), so `ARG_WINDOWS` is not in the enum. `CRASHREPORT` is
 * defined on `__linux__` (`config.h:249`), so `ARG_BIDSHOW` is present.
 */
export const ARG_DEBUG = 0;
export const ARG_VERSION = 1;
export const ARG_SHOWPATHS = 2;
export const ARG_DUMPENUMS = 3;
export const ARG_DUMPGLYPHIDS = 4;
export const ARG_DUMPMONGEN = 5;
export const ARG_DUMPWEIGHTS = 6;
export const ARG_BIDSHOW = 7;

/** C earlyarg.c earlyopts `:36–52` — the rows this build compiles in. */
const EARLYOPTS = [
    { e: ARG_DEBUG, name: 'debug', minlength: 5, valallowed: true },
    { e: ARG_VERSION, name: 'version', minlength: 4, valallowed: true },
    { e: ARG_SHOWPATHS, name: 'showpaths', minlength: 8, valallowed: false },
    { e: ARG_DUMPENUMS, name: 'dumpenums', minlength: 9, valallowed: false },
    { e: ARG_DUMPGLYPHIDS, name: 'dumpglyphids', minlength: 12, valallowed: false },
    { e: ARG_DUMPMONGEN, name: 'dumpmongen', minlength: 10, valallowed: false },
    { e: ARG_DUMPWEIGHTS, name: 'dumpweights', minlength: 11, valallowed: false },
    { e: ARG_BIDSHOW, name: 'bidshow', minlength: 7, valallowed: false },
];

/** C isspace in the C locale: space, tab, newline, CR, form feed, vertical tab. */
function isCSpace(ch) {
    return ch === ' ' || ch === '\t' || ch === '\n'
        || ch === '\r' || ch === '\f' || ch === '\v';
}

function stripCSpace(opts) {
    let i = 0;
    let end = opts.length;
    while (i < end && isCSpace(opts[i])) i++;
    while (end > i && isCSpace(opts[end - 1])) end--;
    return opts.slice(i, end);
}

/**
 * C ref: earlyarg.c debug_fields `:575–621` (staticfn). Commas are
 * processed right to left: each comma is a NUL and the tail is handled
 * first. `!` and a leading `no` (strncmpi, 2) toggle `negated`.
 * `test` and `ttystatus` store the toggled boolean. `fuzzer` sets
 * `iflags.fuzzerpending` and ignores negation (`:618–619`).
 * `TTY_GRAPHICS` is on (`config.h:56`). The `WIN32` `immediateflips`
 * arm is not this build.
 * @param {string} opts value after the `:` or `=`
 */
export function debug_fields(opts) {
    let s = opts == null ? '' : String(opts);
    // C `:581–585` — write NUL over the comma, recurse on the tail.
    let comma = s.indexOf(',');
    while (comma >= 0) {
        const tail = s.slice(comma + 1);
        s = s.slice(0, comma);
        debug_fields(tail);
        comma = s.indexOf(',');
    }
    if (s.length > ((BUFSZ / 2) | 0)) return; // C `:586–587`
    s = stripCSpace(s); // C `:591–595`
    if (!s) return; // C `:597–599`
    let negated = false;
    // C `:601–607` — '!' or strncmpi(opts, "no", 2).
    while (s.charCodeAt(0) === 0x21 || strncmpi(s, 'no', 2) === 0) {
        if (s.charCodeAt(0) === 0x21) s = s.slice(1);
        else s = s.slice(2);
        negated = !negated;
    }
    if (!game.iflags) game.iflags = {};
    if (!game.iflags.debug) game.iflags.debug = {};
    if (match_optname(s, 'test', 4, false)) { // C `:608–609`
        game.iflags.debug.test = !negated;
    }
    if (match_optname(s, 'ttystatus', 9, false)) { // C `:611–612`
        game.iflags.debug.ttystatus = !negated;
    }
    if (match_optname(s, 'fuzzer', 4, false)) { // C `:618–619`
        game.iflags.fuzzerpending = true;
    }
}

/**
 * C ref: version.c early_version_info `:280–312`. Lives here because
 * `version.js` is a load-time leaf (`const.js` reads `COMMIT_NUMBER`).
 * The opening `Snprintf(buf1, "test")` is overwritten by
 * `getversionstring`. `strstri` of `" ("` splits the paste buffer the
 * way `*tmp++ = '\\0'` does. `RUNTIME_PASTEBUF_SUPPORT` is Mac-only
 * (`unixconf.h:414`); this build prints the unavailable line.
 * @param {boolean} pastebuf
 */
export function early_version_info(pastebuf) {
    let buf = 'test'; // C `:285` Snprintf(buf1, "test")
    buf = getversionstring(buf, BUFSZ); // C `:287` overwrites that fill
    const tmp = strstri(buf, ' ('); // C `:288`
    if (tmp) {
        const prefix = buf.slice(0, buf.length - tmp.length);
        // C `:291–292` — NUL at the space, then print from '('.
        let joined = `${prefix}\n${tmp.slice(1)}`;
        if (joined.length > BUFSZ - 1) joined = joined.slice(0, BUFSZ - 1);
        buf = joined;
    }
    raw_printf('%s', buf); // C `:298`
    if (pastebuf) {
        raw_printf('%s', 'Paste buffer copy is not available.\n'); // C `:309`
    }
}

/**
 * C ref: version.c dump_version_info `:494–510` — the `--version:dump`
 * line: program name plus version number, enabled features and sanity
 * words save/bones validation compares against. Lives here next to
 * `early_version_info` (same reason: needs the `raw_printf` channel,
 * and its sole C caller is earlyarg.c:512). `nhStr` is the identity
 * cast (lint.h:16); `gh.hname` is always unset in JS (botl.js:2322
 * precedent) so the name is `"nethack"`. The `%-12.33s` field is the
 * last-33 slice padded to 12; each `%08lx` word is 8 lowercase hex
 * digits (`>>> 0` — all three nomakedefs words fit 32 bits). Output is
 * at most 60 chars so the `BUFSZ` Snprintf cap never fires. C
 * `raw_print` has no JS channel — `raw_printf('%s', …)` is the live
 * early-output adaptation (argcheck `:dump`-error arm below).
 */
export function dump_version_info() {
    let hname = game.gh?.hname ? String(game.gh.hname) : 'nethack'; // `:497`
    if (hname.length > 33) hname = hname.slice(eos(hname) - 33); // `:499–500`
    runtime_info_init(); // `:501`
    const nm = game.nomakedefs ?? {};
    const feat = ((nm.version_features ?? 0) & ~(nm.ignored_features ?? 0)) >>> 0; // `:505`
    const hex8 = (v) => ((v ?? 0) >>> 0).toString(16).padStart(8, '0');
    const buf = `${hname.slice(0, 33).padEnd(12, ' ')} ${hex8(nm.version_number)} ` +
        `${hex8(feat)} ${hex8(nm.version_sanity1)}`; // `:502–506`
    raw_printf('%s', buf); // `:507` (raw_print adaptation above)
    release_runtime_info(); // `:508`
}

/**
 * C ref: earlyarg.c argcheck `:450–560`.
 * Returns 0 (no match), 1 (matched; caller skips this argument), or
 * 2 (matched; caller exits). Scans every `argv` slot, including a
 * program name at `[0]`. A non-matching `--` token sets `dashdash`
 * and a later single-dash match does not clear it (`:468–472`).
 * The value separator for `debug_fields` is the first `:` if any,
 * otherwise the first `=` (`:482–485`), which is not the same cut
 * `match_optname` uses.
 * @param {number} argc
 * @param {string[]} argv
 * @param {number} eArg `ARG_*`
 * @returns {number}
 */
export function argcheck(argc, argv, eArg) {
    const nargc = argc | 0;
    let idx = 0;
    for (; idx < EARLYOPTS.length; idx++) { // C `:457–461`
        if (EARLYOPTS[idx].e === (eArg | 0)) break;
    }
    if (idx >= EARLYOPTS.length || nargc < 1) return 0; // C `:462–463`

    let match = false;
    let userea = '';
    let dashdash = '';
    for (let i = 0; i < nargc; i++) { // C `:465–479`
        const arg = argv && argv[i];
        if (typeof arg !== 'string' || arg.charAt(0) !== '-') continue;
        if (arg.charAt(1) === '-') {
            userea = arg.slice(2);
            dashdash = '-';
        } else {
            userea = arg.slice(1);
        }
        const row = EARLYOPTS[idx];
        match = match_optname(userea, row.name, row.minlength, row.valallowed);
        if (match) break;
    }
    if (!match) return 0;

    // C `:482–485` — ':' wins over '=' even when '=' comes first.
    let extendedOpt = null;
    const colonAt = userea.indexOf(':');
    if (colonAt >= 0) extendedOpt = userea.slice(colonAt);
    else {
        const eqAt = userea.indexOf('=');
        if (eqAt >= 0) extendedOpt = userea.slice(eqAt);
    }

    switch (eArg | 0) {
    case ARG_DEBUG: // C `:487–495`
        if (extendedOpt != null) {
            const cpy = dupstr(extendedOpt);
            debug_fields(cpy.slice(1));
            // C free(cpy) — the copy is a JS string.
        }
        return 1;
    case ARG_VERSION: { // C `:496–524`
        let insertIntoPastebuf = false;
        if (extendedOpt != null) {
            const ext = extendedOpt.slice(1); // C `:500` extended_opt++
            if (match_optname(ext, 'paste', 5, false)) {
                insertIntoPastebuf = true; // deprecated alias of "copy"
            } else if (match_optname(ext, 'copy', 4, false)) {
                insertIntoPastebuf = true;
            } else if (match_optname(ext, 'dump', 4, false)) {
                // C `:507–511` — version number plus enabled features
                // and sanity values, compared against save/bones files.
                dump_version_info(); // C `:512`
                return 2;
            } else if (!match_optname(ext, 'show', 4, false)) {
                raw_printf(
                    '-%sversion can only be extended with -%sversion:copy or :dump or :show.\n',
                    dashdash, dashdash,
                );
                return 2;
            }
        }
        early_version_info(insertIntoPastebuf); // C `:522`
        return 2;
    }
    case ARG_SHOWPATHS: // C `:525–526`
        return 2;
    case ARG_DUMPENUMS: // C `:528–530`
        dump_enums();
        return 2;
    case ARG_DUMPGLYPHIDS: // C `:532–534`
        dump_glyphids(); // C `:533`
        return 2;
    case ARG_DUMPMONGEN: // C `:536–538`
        dump_mongen(); // C `:537`
        return 2;
    case ARG_DUMPWEIGHTS: // C `:538–540`
        dump_weights(); // C `:539` — live js/hack.js export
        return 2;
    case ARG_BIDSHOW: // C `:542–544` under CRASHREPORT
        crashreport_bidshow(); // C `:543` (report.c:189; js/report.js)
        return 2;
    default:
        break;
    }
    return 0;
}

/**
 * C ref: earlyarg.c dump_enums `:706–801` static tables (`monsdump`,
 * `objdump`, `omdump`, the six `defsym.h` dumps, `arti_enum_dump`,
 * `mcastu_enum_dump`, `ed[]` + `edmp[]`) — JS-only assembly from the live
 * generated tables, so the dump can never drift from the game data.
 * Exported although C has no such function: the `--dumpenums` oracle
 * probe diffs all eleven tables byte-exact against the C binary.
 * Each row is `[val, nm]` ≡ `enum_dump {val, nm}` in C order, fenceposts
 * included; `prefix`/`unprefixed`/`comment` are the `edmp` columns.
 * @returns {{title: string, prefix: string, unprefixed: number, comment: boolean, rows: [number, string][]}[]}
 */
export function dump_enums_tables() {
    // C `:628–635` monsdump — `{ PM_bn, "bn" }` per MON (nm WITHOUT the
    // `PM_` prefix; the loop prints it) + the 5 unprefixed fenceposts.
    // HIGH_PM is permonst.h:22 (`NUMMONS - 1`).
    const mons = monsterNames.map((nm, i) => [i, nm.slice(3)]);
    mons.push(
        [NUMMONS, 'NUMMONS'], [NON_PM, 'NON_PM'], [LOW_PM, 'LOW_PM'],
        [NUMMONS - 1, 'HIGH_PM'], [SPECIAL_PM, 'SPECIAL_PM'],
    );
    // C `:636–640` objdump — `{ sn, "sn" }` full enum names + NUM_OBJECTS.
    const objs = objectNames.map((nm, i) => [i, nm]);
    objs.push([NUM_OBJECTS, 'NUM_OBJECTS']);
    // C `:724–740` omdump — local `dump_om` `{ val, "name" }` rows in C
    // order. MARKER anchors are objects.h (:107–111, :837, :875, :1295,
    // :1431, :1528–1591); gem counts are objclass.h:180–181.
    const firstAmulet = objectNames.indexOf('AMULET_OF_ESP');
    const lastAmulet = objectNames.indexOf('AMULET_OF_YENDOR');
    const firstSpell = objectNames.indexOf('SPE_DIG');
    const lastSpell = objectNames.indexOf('SPE_BLANK_PAPER');
    const firstGlass = objectNames.indexOf('WORTHLESS_WHITE_GLASS');
    const lastGlass = objectNames.indexOf('WORTHLESS_VIOLET_GLASS');
    const misc = [
        [LAST_GENERIC, 'LAST_GENERIC'],
        [FIRST_OBJECT - 1, 'OBJCLASS_HACK'],
        [FIRST_OBJECT, 'FIRST_OBJECT'],
        [firstAmulet, 'FIRST_AMULET'],
        [lastAmulet, 'LAST_AMULET'],
        [firstSpell, 'FIRST_SPELL'],
        [lastSpell, 'LAST_SPELL'],
        [MAXSPELL, 'MAXSPELL'],
        [FIRST_REAL_GEM, 'FIRST_REAL_GEM'],
        [LAST_REAL_GEM, 'LAST_REAL_GEM'],
        [firstGlass, 'FIRST_GLASS_GEM'],
        [lastGlass, 'LAST_GLASS_GEM'],
        [LAST_REAL_GEM - FIRST_REAL_GEM + 1, 'NUM_REAL_GEMS'],
        [lastGlass - firstGlass + 1, 'NUM_GLASS_GEMS'],
        [MAX_GLYPH, 'MAX_GLYPH'],
    ];
    // C `:681–686` arti_enum_dump — `{ ART_bn, "ART_bn" }` full names for
    // the NONARTIFACT zero entry + all 33 artifacts, then
    // AFTER_LAST_ARTIFACT (hack.h:102, `NROFARTIFACTS + 1` per :106).
    const arti = artilistRaw.map((raw, i) => [i, `ART_${raw.bn}`]);
    arti.push([NROFARTIFACTS + 1, 'AFTER_LAST_ARTIFACT']);
    // C `:689–697` mcastu_enum_dump — `{ MCAST_DUMPENUM_def, "def" }`
    // bare defs; index i ≡ the dump-enum value (sequential 0–19 like
    // MCASTU_ENUM).
    const mcast = MCASTU_SPELL_DEFS.map((def, i) => [i, def]);
    // C `:743–773` ed[] + edmp[] in `enum_dumps` order (titles, prefixes,
    // unprefixed counts, `dumpflgs` ≡ comment). The C trailing fenceposts
    // ride on the rows (SIZE ≡ rows.length).
    return [
        { title: 'monnums', prefix: 'PM_', unprefixed: 5, comment: false, rows: mons },
        { title: 'objects_nums', prefix: '', unprefixed: 1, comment: false, rows: objs },
        { title: 'misc_object_nums', prefix: '', unprefixed: 1, comment: false, rows: misc },
        { title: 'cmap_symbols', prefix: '', unprefixed: 1, comment: false, rows: [...ENUMDUMP_CMAP, [MAXPCHARS, 'MAXPCHARS']] },
        { title: 'mon_syms', prefix: '', unprefixed: 1, comment: false, rows: [...ENUMDUMP_MON_SYMS, [MAXMCLASSES, 'MAXMCLASSES']] },
        { title: 'mon_defchars', prefix: '', unprefixed: 1, comment: true, rows: ENUMDUMP_MON_DEFCHARS },
        { title: 'objclass_defchars', prefix: '', unprefixed: 1, comment: true, rows: ENUMDUMP_OC_DEFCHARS },
        { title: 'objclass_classes', prefix: '', unprefixed: 1, comment: false, rows: [...ENUMDUMP_OC_CLASSES, [MAXOCLASSES, 'MAXOCLASSES']] },
        { title: 'objclass_syms', prefix: '', unprefixed: 1, comment: false, rows: ENUMDUMP_OC_SYMS },
        { title: 'artifacts_nums', prefix: '', unprefixed: 1, comment: false, rows: arti },
        { title: 'mcast_spells', prefix: 'MCAST_', unprefixed: 0, comment: false, rows: mcast },
    ];
}

/**
 * C ref: earlyarg.c dump_enums `:706–801` (staticfn → file-local; sole
 * caller argcheck ARG_DUMPENUMS above). Whole body in C order.
 *
 * Each `    %s%*s = %3d,%s` row is pre-formatted (`padEnd` ≡ negative-width
 * left-justify, `padStart(3)` ≡ `%3d` — exact for these ASCII names) and
 * passed as `%s`: `vpline_expand` strips width/precision (D-2573 named
 * gap), so routing `%*s` through it would misalign the text
 * (`early_version_info` above precedes). The `raw_print` `:797–798`/`:800`
 * lines have no pre-window stdout channel in dual-runtime ESM
 * (`vraw_printf` `:577` sink-omit precedent): dropped — and named in the
 * D-log — while `raw_printf` call counts stay 1:1 with C.
 */
function dump_enums() {
    const tables = dump_enums_tables(); // C `:724–773` omdump/ed/edmp
    for (let i = 0; i < tables.length; i++) { // C `:777` NUM_ENUM_DUMPS
        const t = tables[i];
        raw_printf('%s', `enum ${t.title} = {`); // C `:778`
        const szd = t.rows.length; // C SIZE()
        for (let j = 0; j < szd; j++) { // C `:779`
            // C `:780–782` — the last unprefixed_count rows drop the prefix.
            const nmprefix = j >= szd - t.unprefixed ? '' : t.prefix;
            const nmwidth = 27 - nmprefix.length; // C `:783`
            const [val, nm] = t.rows[j];
            let comment = ''; // C `:784–791` dumpflgs char comment
            if (t.comment) {
                const ch = val >= 32 && val <= 126 ? String.fromCharCode(val) : ' ';
                comment = `    /* '${ch}' */`;
            }
            // C `:792–795` — `    %s%*s = %3d,%s`, negative width ≡ padEnd.
            raw_printf('%s', `    ${nmprefix}${nm.padEnd(nmwidth)} = ${String(val).padStart(3, ' ')},${comment}`);
        }
        // C `:797–798` raw_print("};")/"" — sink omit (see doc): no JS
        // channel, and raw_printf here would invent +2 early_raw_messages
        // counts per line that C raw_print never records.
    }
    // C `:800` final raw_print("") — same sink omit.
}

/**
 * C ref: earlyarg.c dump_glyphids `:806–809` — `--dumpglyphids` tail:
 * dump every glyph id. C passes stdout; the JS callee takes a
 * line-sink (glyphs.js Rule #2 adaptation), fed here to raw_printf
 * (dump_mongen `:884` precedent — no trailing newline on the channel).
 * Sole C caller `:533` (argcheck ARG_DUMPGLYPHIDS, wired above).
 */
export function dump_glyphids() {
    dump_all_glyphids((line) => raw_printf('%s', line)); // C `:808`
}
