// @ts-nocheck
// files.js — File handling and name conversion.
// C ref: nethack-c/src/files.c
import { game } from './gstate.js';
import { PANICLOG } from './const.js';
import { vfsReadFile, vfsWriteFile } from './storage.js';

export function paniclog(type, reason) {
    const state = game.program_state;
    if (!state.in_paniclog) {
        state.in_paniclog = 1;
        try {
            const now = new Date(), pad = (n, width) => String(n).padStart(width, '0');
            const date = pad(now.getFullYear(), 4) + pad(now.getMonth() + 1, 2) + pad(now.getDate(), 2);
            const time = pad(now.getHours(), 2) + pad(now.getMinutes(), 2) + pad(now.getSeconds(), 2);
            const playmode = game.flags?.debug ? 'D' : game.flags?.explore ? 'X' : '-';
            const line = `5.0.0 ${date} ${time} 0 ${playmode}: ${type} ${reason}\n`;
            // A failed open/write is nonfatal in C too.
            vfsWriteFile(PANICLOG, (vfsReadFile(PANICLOG) || '') + line);
        } finally {
            state.in_paniclog = 0;
        }
    }
}

/* C files.c:2031 static boolean cvtinit = FALSE;
 * C files.c:2034 static char *unconverted_filename = 0, *converted_filename = 0;
 * Mirror these as module-level state. */
let converted_filename = null;
let unconverted_filename = null;
let cvtinit = false;

/**
 * C ref: files.c:2145 free_convert_filenames()
 * Free the converted and unconverted filenames and reset the conversion state.
 */
export function free_convert_filenames() {
    if (converted_filename)
        converted_filename = null;
    if (unconverted_filename)
        unconverted_filename = null;
    cvtinit = false;
}

/**
 * C ref: files.c:198 nh_basename()
 * Return a file's name without its path and optionally trailing 'type'.
 *
 * Uses a static buffer (simulated as module-level) to store the stripped result.
 * Portable across Unix, Windows (both / and \\ paths), and VMS (stubbed).
 */
let basebuf = '';

function vms_basename(fname, keep_suffix) {
    /* VMS paths use DEVICE:[DIR.SUBDIR]NAME.TYPE (and, in newer syntax,
     * DEVICE:<DIR.SUBDIR>NAME.TYPE).  The basename is the component after
     * the closing directory delimiter; treat a bare NAME.TYPE the same as
     * Unix and preserve the caller's suffix policy. */
    let name = String(fname ?? '');
    const close = Math.max(name.lastIndexOf(']'), name.lastIndexOf('>'));
    if (close >= 0)
        name = name.slice(close + 1);
    const dot = name.lastIndexOf('.');
    if (dot >= 0 && !keep_suffix && dot < 80)
        name = name.slice(0, dot);
    basebuf = name;
    return basebuf;
}

export function nh_basename(fname, keep_suffix) {
    // #ifndef VMS branch
    let p;

    // Find last / and skip past it
    p = fname.lastIndexOf('/');
    if (p >= 0) {
        fname = fname.substring(p + 1);
    }

    // #if defined(WIN32) || defined(MSDOS)
    // Find last \ and skip past it
    p = fname.lastIndexOf('\\');
    if (p >= 0) {
        fname = fname.substring(p + 1);
    }
    // #endif

    // Find last . and strip suffix if !keep_suffix
    p = fname.lastIndexOf('.');
    if (p >= 0 && !keep_suffix) {
        const ln = p; // difference in string indices = length
        // if "name" part is too long for basebuf[80], return as-is
        if (ln < 80) {
            basebuf = fname.substring(0, ln);
            fname = basebuf;
        }
    }

    return fname;
}
