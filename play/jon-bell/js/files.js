// @ts-nocheck
// files.js — File handling and name conversion.
// C ref: nethack-c/src/files.c
import { game } from './gstate.js';
import { PANICLOG, LIVELOGFILE } from './const.js';
import { vfsReadFile, vfsWriteFile } from './storage.js';
import { getnow } from './calendar.js';
import { genders, aligns } from './roles.js';
import { pline } from './pline.js';
import { bones_filename } from './bones.js'; // relocate-fns
import { decode_save_graph, encode_save_graph } from './save_graph.js'; // relocate-fns
import { vfsDeleteFile } from './storage.js'; // relocate-fns
import { rn2 } from './rnd.js'; // relocate-fns
import { pmatch } from './strutil.js'; // relocate-fns
import { saved_state_for, savefile_name } from './save.js'; // relocate-fns

/* C files.c:3667-3705. VFS appends are synchronous, so there is no native
 * file lock to acquire. The configured mask controls only the live log. */
export function livelog_add(ll_type, str) {
    const mask = ll_type & game.sysopt?.livelog;
    if (!mask) return;
    const g = game, u = g.u;
    const line = `lltype=${mask}\tname=${g.plname}`
        + `\trole=${g.urole.filecode}\trace=${g.urace.filecode}`
        + `\tgender=${genders[g.flags.female ? 1 : 0].filecode}`
        + `\talign=${aligns[1 - u.ualign.type].filecode}`
        + `\tturns=${g.moves}\tstarttime=${u.ubirthday}`
        + `\tcurtime=${getnow()}\tmessage=${str}\n`;
    if (!vfsWriteFile(LIVELOGFILE, (vfsReadFile(LIVELOGFILE) || '') + line))
        pline('Cannot open live log file!');
}

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

/* ── the bones "file" ────────────────────────────────────────────────────────
 * C ref: files.c set_bonesfile_name() / open_bonesfile() / create_bonesfile() /
 * delete_bonesfile().  C's name is "bonD0.3"-ish, derived from the dungeon
 * branch and level; the only property this port needs is that the write and the
 * read agree, and that the key is per-LEVEL (a hero who dies on Dlvl 3 leaves
 * bones only on Dlvl 3).
 *
 * The BODY in the VFS is a stub, exactly as js/save.js:322 writes "NHSAVE 1\n…":
 * the encoded level stays in `bonesStore` below, keyed by the id in the stub.
 * Each read decodes a detached graph, so gameplay cannot alter a retained
 * bones file. */
const bonesStore = new Map();

let bonesSerial = 0;

/* C files.c:1319 open_bonesfile(lev, &bonesid) — returns NULL when no bones
 * file exists for this level.  Here: the stub body plus the resolved snapshot,
 * or null. */
export function open_bonesfile(uz) {
    const body = vfsReadFile(bones_filename(uz));
    if (typeof body !== 'string')
        return null;
    const lines = body.split('\n');
    if (lines[0] !== 'NHBONES 1')
        return null;
    const snap = bonesStore.get(lines[2]);
    if (!snap)
        return null;
    /* C bones.c:707 getlev() reads fresh allocations from the file on every
     * load.  In particular, declining "Unlink bones?" must leave the file
     * unchanged by renumbering, stair reversal, and subsequent gameplay. */
    return { bonesid: lines[1], key: lines[2], snap: decode_save_graph(snap) };
}

/* C files.c:1359 create_bonesfile() + :1400 commit_bonesfile(). */
export function create_bonesfile(uz, bonesid, snap) {
    const key = `b${++bonesSerial}`;
    /* C bones.c:621 savelev() writes bytes, not aliases into the live level. */
    bonesStore.set(key, encode_save_graph(snap));
    if (!vfsWriteFile(bones_filename(uz), `NHBONES 1\n${bonesid}\n${key}\n`)) {
        bonesStore.delete(key);
        return false;
    }
    return true;
}

/* C files.c:1420 delete_bonesfile(). */
export function delete_bonesfile(uz) {
    const f = open_bonesfile(uz);
    if (f)
        bonesStore.delete(f.key);
    return vfsDeleteFile(bones_filename(uz));
}

/* C files.c:3424-3470 choose_passage(): pick a not-yet-used passage of the
 * book `oid`, tracking the unused ones in svc.context.novel.  The rn2(range)
 * draws of the >MAXPASSAGES arm and the final rn2(count) are RNG-visible. */
function choose_passage(passagecnt, oid) {
    const MAXPASSAGES = 30; // C context.h:116, SIZE(context.novel.pasg)
    const ctx = game.context || (game.context = {});
    const nv = ctx.novel || (ctx.novel = { id: 0, count: 0, pasg: new Array(MAXPASSAGES).fill(0) });
    if (passagecnt < 1)
        return 0;
    if ((oid >>> 0) !== (nv.id >>> 0) || (nv.count | 0) === 0) {
        let range = passagecnt, limit = MAXPASSAGES;
        nv.id = oid;
        if (range <= limit) {
            nv.count = passagecnt;
            for (let idx = 0; idx < MAXPASSAGES; idx++)
                nv.pasg[idx] = idx < passagecnt ? idx + 1 : 0;
        } else {
            nv.count = MAXPASSAGES;
            let idx = 0;
            for (let i = 0; i < passagecnt; ++i, --range)
                if (range > 0 && rn2(range) < limit) {
                    nv.pasg[idx++] = i + 1;
                    --limit;
                }
        }
    }
    const idx = rn2(nv.count | 0);
    const res = nv.pasg[idx] | 0;
    nv.pasg[idx] = nv.pasg[--nv.count] | 0;
    return res;
}

/* C files.c:3474-3637 read_tribute(): find `tribtitle` in dat/tribute's
 * `tribsection`, choose a passage and show it in an NHW_MENU window (or, when
 * `nowin_buf` is a {value} box, fetch its first line into the box instead).
 * Returns TRUE when something was read. */
export async function read_tribute(tribsection, tribtitle, tribpassage, nowin_buf, oid) {
    const { pline, putmsghistory } = await import('./display.js');
    const { dat_content } = await import('./dat_source.js');
    const badtranslation = 'an incomprehensible foreign translation';
    const ci = (a, b) => String(a).toLowerCase() === String(b).toLowerCase();
    const munge = (s) => s.replace(/\s+/g, ' ').replace(/^ /, '').replace(/ $/, '');
    if (nowin_buf)
        nowin_buf.value = '';
    if (tribsection == null || tribtitle == null) {
        if (!nowin_buf)
            await pline(`It's ${badtranslation} of "${tribtitle}"!`);
        return false;
    }
    const raw = dat_content('tribute');
    if (raw === null) {
        if (!nowin_buf)
            await pline('You feel too overwhelmed to continue!');
        return false;
    }
    const SECTIONSCOPE = 1, TITLESCOPE = 2, PASSAGESCOPE = 3;
    let scope = 0, passagecnt = 0, targetpassage = 0;
    let matchedsection = false, matchedtitle = false, foundpassage = false;
    let lastline = '';
    const win = [];
    let grasped = false;
    for (const rawline of raw.replace(/\n$/, '').split('\n')) {
        const line = rawline.replace(/\r$/, '');
        const c0 = line[0];
        if (c0 === '%') {
            const rest = line.slice(1).toLowerCase();
            if (rest.startsWith('section ')) {
                scope = SECTIONSCOPE;
                matchedsection = ci(line.slice(9), tribsection);
            } else if (rest.startsWith('title ')) {
                let st = line.slice(7);
                const p1 = st.indexOf('(');
                if (p1 >= 0) {
                    const after = st.slice(p1 + 1);
                    st = munge(st.slice(0, p1));
                    const p2 = after.indexOf(')');
                    if (p2 >= 0) {
                        passagecnt = parseInt(after.slice(0, p2), 10) || 0;
                        scope = TITLESCOPE;
                        if (matchedsection && ci(st, tribtitle)) {
                            matchedtitle = true;
                            targetpassage = !tribpassage
                                ? choose_passage(passagecnt, oid)
                                : (tribpassage <= passagecnt) ? tribpassage : 0;
                        } else {
                            matchedtitle = false;
                        }
                    }
                }
            } else if (rest.startsWith('passage ')) {
                const passagenum = parseInt(munge(line.slice(9)), 10) || 0;
                if (passagenum > 0 && passagenum <= passagecnt) {
                    scope = PASSAGESCOPE;
                    if (matchedtitle && passagenum === targetpassage)
                        foundpassage = true;
                }
            } else if (rest.startsWith('e ')) {
                if (foundpassage)
                    break;
                if (scope === TITLESCOPE)
                    matchedtitle = false;
                if (scope === SECTIONSCOPE)
                    matchedsection = false;
                if (scope)
                    --scope;
            }
        } else if (c0 === '#') {
            /* comment */
        } else if (foundpassage) {
            if (!nowin_buf) {
                win.push(line);
                if (line)
                    lastline = line;
            } else {
                nowin_buf.value = line;
                break;
            }
        }
    }
    if (nowin_buf)
        return nowin_buf.value !== '';
    if (foundpassage && lastline) {
        const { dbase_display_window } = await import('./cmd.js');
        /* C files.c:3574,3626 / wintty.c:1923-1945: an NHW_MENU overlay
         * preserves the existing status outside the window's rows. */
        await dbase_display_window(win);
        if (lastline.includes('['))
            lastline = munge(lastline);
        else
            lastline = `[${tribtitle}, by Terry Pratchett]`;
        const p = lastline.lastIndexOf(']');
        if (p >= 0)
            lastline = lastline.slice(0, p) + `; passage #${targetpassage}]`;
        putmsghistory(lastline, false);
        grasped = true;
    }
    if (!grasped)
        await pline(`It seems to be ${badtranslation} of "${tribtitle}"!`);
    return grasped;
}

export function unlock_file(filename) { /* no-op */ }

export function fopen_datafile(filename, mode, prefix) {
    const write = String(mode).indexOf('w') >= 0;
    return {
        name: String(filename),
        write,
        data: write ? '' : (vfsReadFile(String(filename)) ?? ''),
        pos: 0,
        out: '',
    };
}

export function debugcore(filename, wildcards) {
    if (!game.flags?.debug || !filename)
        return false;
    const debugfiles = game.sysopt?.debugfiles;
    if (!debugfiles)
        return false;
    filename = nh_basename(filename, true);
    if (wildcards && pmatch(debugfiles, filename))
        return true;
    const p = debugfiles.indexOf(filename);
    const end = p + filename.length;
    return p >= 0
        && (p === 0 || debugfiles[p - 1] === ' ' || debugfiles[p - 1] === '/')
        && (end === debugfiles.length || debugfiles[end] === ' ');
}

export function restore_saved_game(plname) {
    if (!plname)
        return null;
    const body = vfsReadFile(savefile_name(plname));
    if (body === null)
        return null;
    const state = saved_state_for(body);
    if (!state)
        return null;
    return { body, state };
}
