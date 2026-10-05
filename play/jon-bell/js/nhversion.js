// js/nhversion.js
// JavaScript port of the display half of nethack-c/src/version.c: the
// '#version' command (doextversion) and its runtime ":TOKEN:" substitutions.
//
// Kept out of js/version.js on purpose — that file is the port's own build
// stamp and is imported by the frozen js/const.js.

import { do_runtime_info } from './mdlib.js';
import { PORT_ID } from './platform_identity.js';
import { tabexpand } from './data_base.js';
import { get_lua_version, nhl_lua_ver, nhl_lua_copyright } from './nhlua.js';

/* global.h COLNO */
const COLNO = 80;

const VERSION_STRING =
    PORT_ID + " NetHack Version 5.0.0"
    + " - last build May  2 2026 12:00:00.";

/* version.c:314-330 rt_opts[].  regex_id comes from
 * sys/share/posixregex.c on this build. */
const REGEX_ID = "posixregex";

/**
 * getversionstring()
 * C source: nethack-c/src/version.c:31-79
 *
 * With no RUNTIME_PORT_ID and no git metadata in nomakedefs (the reference
 * build has none — the recorded string carries no " (...)" suffix), every
 * append is skipped and the " (" that was written speculatively at :49 is
 * stripped back off at :73, leaving nomakedefs.version_string untouched.
 */
export function getversionstring() {
    return VERSION_STRING;
}

/**
 * insert_rtoption()
 * C source: nethack-c/src/version.c:338-353
 *
 * Substitutes the runtime-only ":TOKEN:" placeholders makedefs could not
 * resolve.  The load-bearing part for the port is the FIRST line: the
 * `if (!gl.lua_ver[0]) get_lua_version();` guard spins up a Lua state, and
 * that state's nhlib.lua load consumes rn2(3) + rn2(2).
 *
 * C does not break out of the loop after a match — a line may hold more than
 * one token — and only substitutes when the replacement is non-empty.
 */
export function insert_rtoption(buf) {
    if (!nhl_lua_ver())
        get_lua_version();

    const rt_opts = [
        { token: ":PATMATCH:", value: REGEX_ID },
        { token: ":LUAVERSION:", value: nhl_lua_ver() },
        { token: ":LUACOPYRIGHT:", value: nhl_lua_copyright() },
    ];
    for (const opt of rt_opts) {
        /* C: strstri(buf, token) && *value  →  strsubst(buf, token, value)
         * (hacklib.c strsubst replaces the FIRST occurrence only). */
        if (opt.value && buf.includes(opt.token))
            buf = buf.replace(opt.token, opt.value);
    }
    return buf;
}

function tty_putstr_lines(str) {
    const out = [];
    while (str.length >= COLNO) {
        let brk = str.lastIndexOf(' ', COLNO - 1);
        if (brk <= 0) {           /* unbreakable — hard-split at the margin */
            brk = COLNO - 1;
            out.push(str.slice(0, brk));
            str = str.slice(brk);
        } else {
            out.push(str.slice(0, brk));
            str = str.slice(brk + 1);
        }
    }
    out.push(str);
    return out;
}

/**
 * doextversion() — the '#version' command, and help_menu_items[0].
 * C source: nethack-c/src/version.c:167-277
 *
 * Returns the NHW_TEXT window's line list; the caller displays it (this
 * function is the create_nhwindow/putstr/display_nhwindow body minus the
 * windowport call, which lives with the rest of the tty pager in cmd.js).
 *
 * OPTIONS_AT_RUNTIME is defined on this build, so use_dlb is FALSE and
 * done_rt is FALSE: the option text comes from mdlib's do_runtime_info()
 * rather than from a dlb-packed dat/options, and the dlb arm never runs.
 *
 * RNG: none directly — but every line containing ':' goes through
 * insert_rtoption(), and the first such line ("Options compiled into this
 * edition:") triggers get_lua_version()'s two draws.
 */
export function doextversion() {
    const win = [];
    const rtcontext = { value: 0 };
    let rtbuf;
    let use_dlb = true, done_rt = false, done_dlb = false, prolog;

    /* #if defined(OPTIONS_AT_RUNTIME) */
    use_dlb = false;

    let buf = getversionstring();
    /* if extra text (git info) is present, put it on separate line
       but don't wrap on (x86) */
    let p = -1;
    if (buf.length >= COLNO)
        p = buf.lastIndexOf('(');
    let tail = null;
    if (p > 0 && buf[p - 1] === ' ' && buf[p + 1] !== 'x') {
        tail = buf.slice(p - 1);          /* *--p = ' ' restores the space */
        buf = buf.slice(0, p - 1);
    }
    for (const ln of tty_putstr_lines(buf)) win.push(ln);
    if (tail !== null)
        for (const ln of tty_putstr_lines(tail)) win.push(ln);

    prolog = true; /* to skip indented program name */
    for (;;) {
        if (use_dlb && !done_dlb) {
            done_dlb = true;
            continue;
        } else if (!done_rt) {
            if ((rtbuf = do_runtime_info(rtcontext)) == null) {
                done_rt = true;
                continue;
            }
            buf = rtbuf;
        } else {
            break;
        }
        buf = buf.replace(/[\r\n]+$/, '');            /* strip_newline() */
        if (buf.includes('\t'))
            buf = tabexpand(buf);

        if (buf.length && buf[0] !== ' ') {
            /* found outdented header; insert a separator since we'll
               have skipped corresponding blank line inside the file */
            win.push("");
            prolog = false;
        }
        /* skip blank lines and prolog (program name plus version) */
        if (prolog || !buf.length)
            continue;

        if (buf.includes(':'))
            buf = insert_rtoption(buf);

        if (buf.length)
            for (const ln of tty_putstr_lines(buf)) win.push(ln);
    }
    return win;
}
