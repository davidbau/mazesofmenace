// files.js — WIZKIT file handling + 3.6 tribute (files.c).
// C ref: files.c fopen_wizkit_file / wizkit_addinv / proc_wizkit_line /
// read_wizkit; choose_passage / read_tribute / Death_quote;
// delete_levelfile (JSON analogue; no fs unlink);
// clearlocks (JSON analogue; no POSIX signal).
// fqname / init_nhfile / new_nhfile / free_nhfile / set_levelfile_name /
// open_levelfile (JSON analogue; VFS stash probe, no POSIX open).
// Callers: allmain.c newgame after u_init_skills_discoveries (D-1192);
// spell.c study_book SPE_NOVEL; sounds.c Death_quote live (D-1653).
// Rule #2: VFS only — no fs / getenv / HOME fopen. Tribute text is
// embedded (extract-tribute.py), not dlb disk.

import { game } from './gstate.js';
import { vfsReadFile } from './storage.js';
import { readobjnam, HANDS_OBJ, NOTHING_OBJ } from './readobjnam.js';
import { addinv } from './u_init.js';
import { add_to_migration, mergable } from './mkobj.js';
import { observe_object } from './invent.js';
import { inv_cnt } from './steal.js';
import { hands_obj } from './weapon.js';
import { COIN_CLASS, objectNames } from './objects.js';
import { PM_CLERIC, NUMMONS } from './generated/monsters_data.js';
import { NUM_OBJECTS } from './generated/objects_data.js';
import { NROFARTIFACTS } from './generated/artifacts_data.js';
import {
    BUFSZ, MIGR_NOBREAK, MIGR_NOSCATTER, MIGR_WITH_HERO, WIZKIT_MAX,
    LFILE_EXISTS, NHF_LEVELFILE, READING, COUNTING, LEVELPREFIX,
    PREFIX_COUNT, FQN_MAX_FILENAME, SF_UPTODATE, SF_OUTDATED,
    SF_CRITICAL_BYTE_COUNT_MISMATCH, SF_DM_IL32LLP64_ON_ILP32LL64,
    SF_DM_I32LP64_ON_ILP32LL64, SF_DM_ILP32LL64_ON_I32LP64,
    SF_DM_ILP32LL64_ON_IL32LLP64, SF_DM_I32LP64_ON_IL32LLP64,
    SF_DM_IL32LLP64_ON_I32LP64, SF_DM_MISMATCH, UTD_CHECKSIZES,
    UTD_CHECKFIELDCOUNTS, UTD_SKIP_SANITY1, UTD_WITHOUT_WAITSYNCH_PERFILE,
    UTD_QUIETLY, WIN_ERR, SFCTOOL_BIT,
} from './const.js';
import { datamodel, what_datamodel_is_this } from './version.js';
import { rn2 } from './rng.js';
import { mungspaces } from './getline.js';
import { pline, putmsghistory, You_feel, impossible, flush_topl_more } from './display.js';
import { show_nhw_menu_text } from './pager.js';
import { TRIBUTE_TEXT } from './generated/tribute_data.js';
import { maxledgerno } from './dungeon.js';

const INVLET_BASIC = 52;
const SCR_SCARE_MONSTER = objectNames.indexOf('SCR_SCARE_MONSTER');

/** C flag.h `#define wizard flags.debug`. */
function wizard_mode() {
    return !!(game.flags?.debug || game.flags?.wizard);
}

/** C role.h Role_if — urole.mnum match. */
function Role_if(pm) {
    return (game.urole?.mnum | 0) === (pm | 0);
}

function is_hands_obj(obj) {
    return obj === hands_obj || obj === HANDS_OBJ
        || !!(obj && (obj._hands || obj._hands_obj));
}

/**
 * C ref: invent.c merge_choice(gi.invent, obj) — first mergable slot.
 * Shop-floor no_charge / inhishop unpaid reject named (wizkit objs are
 * OBJ_FREE, so that arm never fires).
 */
function merge_choice(obj) {
    if (!obj || (obj.otyp | 0) === SCR_SCARE_MONSTER) return null;
    for (const otmp of game.invent || []) {
        if (mergable(otmp, obj)) return otmp;
    }
    return null;
}

/**
 * C ref: files.c fopen_wizkit_file — gw.wizkit from WIZKIT= (cfgfiles).
 * Named omit: getenv("WIZKIT"), access(), HOME/fqname fopen, raw_printf
 * open errors. VFS miss ≡ C ENOENT → NULL.
 */
function fopen_wizkit_file() {
    const name = String(game.wizkit || game._parsed_rc?.wizkit || '')
        .slice(0, WIZKIT_MAX - 1);
    if (!name) return null;
    const text = vfsReadFile(name);
    return text == null ? null : String(text);
}

/**
 * C ref: cfgfiles.c parse_conf_buf subset used by parse_conf_file for
 * WIZKIT: skip empty/# lines; trailing '\' continuation joins with a
 * space; trim ends. Named omit: CHOOSE, [sections], line-too-long skip,
 * config_error_nextline.
 */
function parse_wizkit_text(text, proc) {
    let buf = '';
    for (const raw of String(text).split('\n')) {
        let line = raw.replace(/\r$/, '');
        const more = /\\$/.test(line);
        if (more) line = line.slice(0, -1);
        line = line.replace(/[ \t]+$/g, '');
        const trimmed = line.replace(/^[ \t]+/g, '');
        const ignore = !trimmed || trimmed.startsWith('#');
        if (!ignore) buf = buf ? `${buf} ${trimmed}` : trimmed;
        if (more || (ignore && !buf)) continue;
        if (buf) {
            proc(buf);
            buf = '';
        }
    }
    if (buf) proc(buf);
}

/**
 * C ref: files.c wizkit_addinv — observe + cleric bknown; overflow
 * (non-gold, inv_cnt>=52, !merge_choice) → migrating WITH_HERO|NOBREAK|
 * NOSCATTER at main-dungeon level 1; else addinv.
 */
async function wizkit_addinv(obj) {
    if (!obj || is_hands_obj(obj)) return;
    observe_object(obj);
    if (Role_if(PM_CLERIC)) obj.bknown = 1;
    if (obj.oclass !== COIN_CLASS
        && inv_cnt(false) >= INVLET_BASIC
        && !merge_choice(obj)) {
        add_to_migration(obj);
        obj.ox = 0;
        obj.oy = 1;
        obj.owornmask = MIGR_WITH_HERO | MIGR_NOBREAK | MIGR_NOSCATTER;
    } else {
        await addinv(obj);
    }
}

/**
 * C ref: files.c proc_wizkit_line — readobjnam; hands_obj skip; else
 * add. Named omit: wish_history_add; config_error_add "Bad wizkit item".
 */
export async function proc_wizkit_line(buf) {
    let line = String(buf ?? '');
    if (line.length >= BUFSZ) line = line.slice(0, BUFSZ - 1);
    const otmp = readobjnam(line, null);
    if (!otmp || otmp === NOTHING_OBJ || otmp._nothing_obj) return false;
    if (!is_hands_obj(otmp)) await wizkit_addinv(otmp);
    return true;
}

/**
 * C ref: files.c read_wizkit — wizard && fopen then
 * program_state.wizkit_wishing around parse_conf_file(proc_wizkit_line).
 * Named omit: config_error_init/done.
 */
export async function read_wizkit() {
    if (!wizard_mode()) return;
    const text = fopen_wizkit_file();
    if (text == null) return;
    if (!game.program_state) game.program_state = {};
    game.program_state.wizkit_wishing = 1;
    const lines = [];
    parse_wizkit_text(text, (line) => {
        lines.push(line);
    });
    for (const line of lines) await proc_wizkit_line(line);
    game.program_state.wizkit_wishing = 0;
}

/* ----------  BEGIN TRIBUTE ----------- */
/* C ref: files.c `:3415–3656` choose_passage / read_tribute / Death_quote.
 * Named omissions: sounds.c Death_quote / u_have_novel Deathnotice;
 * lookup_novel; save/rest context.novel; dlb. */

const SECTIONSCOPE = 1;
const TITLESCOPE = 2;
const PASSAGESCOPE = 3;
/** C `MAXPASSAGES SIZE(svc.context.novel.pasg)` — context.h pasg[30]. */
const MAXPASSAGES = 30;

function tribute_lowc(code) {
    return (code >= 65 && code <= 90) ? code + 32 : code;
}

/**
 * C ref: hacklib.c strncmpi — used here for tribute % tags / strcmpi
 * (`#define strcmpi(a,b) strncmpi((a),(b),-1)`). n<0 ≡ C -1 (until NUL).
 */
function tribute_ncmpi(s1, s2, n) {
    const a = String(s1 ?? '');
    const b = String(s2 ?? '');
    let i = 0;
    let left = n | 0;
    const untilNul = left < 0;
    while (untilNul || left--) {
        const c1 = i < a.length ? a.charCodeAt(i) : 0;
        const c2 = i < b.length ? b.charCodeAt(i) : 0;
        if (!c2) return c1 !== 0 ? 1 : 0;
        if (!c1) return -1;
        const t1 = tribute_lowc(c1);
        const t2 = tribute_lowc(c2);
        if (t1 !== t2) return t1 > t2 ? 1 : -1;
        i++;
    }
    return 0;
}

/** C atoi on the tribute `(n)` / `%passage k` fields. */
function tribute_atoi(s) {
    const t = String(s ?? '');
    let i = 0;
    while (i < t.length) {
        const c = t.charCodeAt(i);
        if (c !== 32 && c !== 9) break;
        i++;
    }
    let sign = 1;
    if (t[i] === '-' || t[i] === '+') {
        if (t[i] === '-') sign = -1;
        i++;
    }
    let n = 0;
    while (i < t.length) {
        const c = t.charCodeAt(i);
        if (c < 48 || c > 57) break;
        n = (n * 10 + (c - 48)) | 0;
        i++;
    }
    return (sign * n) | 0;
}

/**
 * C ref: hacklib.c copynchars — at most n chars, stop at NUL/newline,
 * always NUL-terminate (dst holds n+1).
 */
function tribute_copynchars(src, n) {
    const s = String(src ?? '');
    let out = '';
    let left = n | 0;
    for (let i = 0; left > 0 && i < s.length; i++, left--) {
        if (s.charCodeAt(i) === 10) break;
        out += s[i];
    }
    return out;
}

function ensure_novel_tracking() {
    if (!game.context) game.context = {};
    let novel = game.context.novel;
    if (!novel) {
        novel = { id: 0, count: 0, pasg: new Array(MAXPASSAGES).fill(0) };
        game.context.novel = novel;
    }
    if (!Array.isArray(novel.pasg) || novel.pasg.length < MAXPASSAGES) {
        const p = new Array(MAXPASSAGES).fill(0);
        if (Array.isArray(novel.pasg)) {
            for (let i = 0; i < Math.min(novel.pasg.length, MAXPASSAGES); i++) {
                p[i] = novel.pasg[i] | 0;
            }
        }
        novel.pasg = p;
    }
    return novel;
}

/**
 * C ref: files.c choose_passage — unused-passage shuffle; reservoir when
 * passagecnt > MAXPASSAGES.
 */
function choose_passage(passagecnt, oid) {
    const novel = ensure_novel_tracking();
    if ((passagecnt | 0) < 1) return 0;

    if ((oid >>> 0) !== (novel.id >>> 0) || (novel.count | 0) === 0) {
        let range = passagecnt | 0;
        let limit = MAXPASSAGES;
        novel.id = oid >>> 0;
        if (range <= limit) {
            novel.count = passagecnt | 0;
            for (let idx = 0; idx < MAXPASSAGES; idx++) {
                novel.pasg[idx] = (idx < (passagecnt | 0)) ? (idx + 1) : 0;
            }
        } else {
            novel.count = MAXPASSAGES;
            let idx = 0;
            for (let i = 0; i < (passagecnt | 0); ++i, --range) {
                if (range > 0 && rn2(range) < limit) {
                    novel.pasg[idx++] = (i + 1) | 0;
                    --limit;
                }
            }
        }
    }

    const idx = rn2(novel.count | 0);
    const res = novel.pasg[idx] | 0;
    novel.pasg[idx] = novel.pasg[--novel.count] | 0;
    return res;
}

/**
 * C ref: files.c read_tribute. tribpassage 0 → choose_passage; else that
 * index. nowin_buf null → NHW_MENU putstr + putmsghistory; object
 * `{ s:'' }` → first line (Death_quote).
 * @returns {Promise<boolean>} grasped
 */
export async function read_tribute(
    tribsection, tribtitle, tribpassage, nowin_buf, bufsz, oid,
) {
    const badtranslation = 'an incomprehensible foreign translation';
    let grasped = false;
    if (nowin_buf) nowin_buf.s = '';

    if (!tribsection || !tribtitle) {
        if (!nowin_buf) {
            await pline(`It's ${badtranslation} of "${tribtitle}"!`);
        }
        return grasped;
    }

    // C dlb_fopen(TRIBUTEFILE, "r") — Rule #2 embed, not disk.
    const text = TRIBUTE_TEXT;
    if (text == null || text === '') {
        if (!nowin_buf) await You_feel('too overwhelmed to continue!');
        return grasped;
    }

    let scope = 0;
    let passagecnt = 0;
    let targetpassage = 0;
    let matchedsection = false;
    let matchedtitle = false;
    let foundpassage = false;
    let lastline = '';
    const winLines = [];
    const cap = ((bufsz | 0) > 0 ? (bufsz | 0) : BUFSZ) - 1;

    const rawLines = String(text).split('\n');
    if (rawLines.length && rawLines[rawLines.length - 1] === '') rawLines.pop();

    let cleanup = false;
    for (let li = 0; li < rawLines.length && !cleanup; li++) {
        let line = rawLines[li];
        if (line.endsWith('\r')) line = line.slice(0, -1);
        const ch0 = line.length ? line.charAt(0) : '';
        if (ch0 === '%') {
            const rest = line.slice(1);
            if (tribute_ncmpi(rest, 'section ', 8) === 0) {
                const st = rest.slice(8); /* 9 from "%section " → rest[8] */
                scope = SECTIONSCOPE;
                matchedsection = tribute_ncmpi(st, tribsection, -1) === 0;
            } else if (tribute_ncmpi(rest, 'title ', 6) === 0) {
                let st = rest.slice(6);
                const p1 = st.indexOf('(');
                if (p1 >= 0) {
                    let after = st.slice(p1 + 1);
                    st = mungspaces(st.slice(0, p1));
                    const p2 = after.indexOf(')');
                    if (p2 >= 0) {
                        after = after.slice(0, p2);
                        passagecnt = tribute_atoi(after);
                        scope = TITLESCOPE;
                        if (matchedsection && tribute_ncmpi(st, tribtitle, -1) === 0) {
                            matchedtitle = true;
                            const tp = tribpassage | 0;
                            targetpassage = !tp
                                ? choose_passage(passagecnt, oid >>> 0)
                                : (tp <= passagecnt) ? tp : 0;
                        } else {
                            matchedtitle = false;
                        }
                    }
                }
            } else if (tribute_ncmpi(rest, 'passage ', 8) === 0) {
                const st = mungspaces(rest.slice(8));
                const passagenum = tribute_atoi(st);
                if (passagenum > 0 && passagenum <= passagecnt) {
                    scope = PASSAGESCOPE;
                    if (matchedtitle && passagenum === targetpassage) {
                        foundpassage = true;
                    }
                }
            } else if (tribute_ncmpi(rest, 'e ', 2) === 0) {
                if (foundpassage) {
                    cleanup = true;
                    break;
                }
                if (scope === TITLESCOPE) matchedtitle = false;
                if (scope === SECTIONSCOPE) matchedsection = false;
                if (scope) --scope;
            }
        } else if (ch0 === '#') {
            /* comment */
        } else if (foundpassage) {
            if (!nowin_buf) {
                winLines.push(line);
                if (line) lastline = line;
            } else {
                nowin_buf.s = tribute_copynchars(line, cap);
                cleanup = true;
                break;
            }
        }
    }

    if (nowin_buf) {
        grasped = !!(nowin_buf.s);
    } else {
        if (foundpassage && lastline) {
            await show_nhw_menu_text(winLines);
            if (lastline.includes('[')) {
                lastline = mungspaces(lastline);
            } else {
                lastline = `[${tribtitle}, by Terry Pratchett]`;
            }
            const rb = lastline.lastIndexOf(']');
            if (rb >= 0) {
                lastline = `${lastline.slice(0, rb)}; passage #${targetpassage}]`;
            }
            putmsghistory(lastline, false);
            grasped = true;
        }
        if (!grasped) {
            await pline(
                `It seems to be ${badtranslation} of "${tribtitle}"!`,
            );
        }
    }
    return grasped;
}

/**
 * C ref: files.c delete_levelfile `:718–730` — unlink when lev==0 or
 * LFILE_EXISTS, then clear LFILE_EXISTS. JSON analogue: drop the
 * in-memory stash (Contest Rule #2 — no Node unlink / fs). Keep the
 * `level_info` slot and remaining flags (C keeps the struct).
 * @param {number} lev
 */
export function delete_levelfile(lev) {
    const i = lev | 0;
    if (!game.level_info) game.level_info = [];
    const info = game.level_info[i];
    if (i === 0 || (info && ((info.flags | 0) & LFILE_EXISTS))) {
        if (info) {
            info.flags = (info.flags | 0) & ~LFILE_EXISTS;
            info.level = null;
            info.fmon = null;
            info.fobj = null;
            info.ftrap = null;
            info.stairs = null;
            info.head_engr = null;
            info.track = null;
            info.regions = null;
            info.lastseentyp = null;
            info.timers = null;
            info.lights = null;
            info.billobjs = null;
            info.damagelist = null;
            info.updest = null;
            info.dndest = null;
        }
    }
}

/**
 * C ref: files.c clearlocks `:732–750`. HANGUPHANDLING preserve_locks
 * early return. POSIX signal/hangup ignore is named (no signals in JS).
 * Then delete_levelfile from maxledgerno() down through 0. JSON analogue
 * (Contest Rule #2 — no Node unlink).
 */
export function clearlocks() {
    if (game.program_state?.preserve_locks) return;
    const n = game.n_dgns | 0;
    for (let x = (n ? maxledgerno() : 0); x >= 0; x--) {
        delete_levelfile(x);
    }
}

/* ---------- BEGIN LEVEL FILE HANDLING ----------- */
/* C ref: files.c fqname `:354–393` / init_nhfile / new_nhfile `:496–504` /
 * free_nhfile / viable_nhfile `:549–581` / set_levelfile_name `:606–618` /
 * open_levelfile `:673–716`. Rule #2 throughout: no POSIX open/unlink —
 * the "file" is the `game.level_info[lev]` stash slot, openable exactly
 * when `LFILE_EXISTS` is set. D-2472. */

/** C files.c:91 — file-static `FQN_NUMBUF 8`, so module-local here. */
const FQN_NUMBUF = 8;
/** C files.c:92 — `static char fqn_filename_buffer[FQN_NUMBUF][FQN_MAX_FILENAME]`. */
const fqn_filename_buffer = new Array(FQN_NUMBUF).fill('');
/** C `hack.h:975–977` `enum saveformats` — whole-struct binary, as-is. */
const FNIDX_HISTORICAL = 1;
/** C POSIX ENOENT for the VFS-miss message (`fopen_wizkit_file`
 * precedent above: VFS miss ≡ C ENOENT → NULL). */
const ENOENT = 2;
/** C files.c `static const int bei = 1` + `IS_BIGENDIAN()` — typed-array
 * probe, safe in Node and Chrome. */
const NH_IS_BIGENDIAN = (() => new Uint8Array(new Uint16Array([1]).buffer)[0] === 0)();

/**
 * C ref: files.c fqname `:354–393` — fully-qualified name for a prefix.
 * The contest build defines PREFIXES_IN_USE (`hack.h:1059`), so the
 * prefix branch is live: a bad base/prefix returns basenam, an
 * unconfigured prefix returns basenam, otherwise the prefix is
 * prepended into the per-buffnum slot. Prefix table is C
 * `gf.fqn_prefix[]` — JS reads `game.gf?.fqn_prefix` (no SYSCONF/HACKDIR
 * config support in this port, so every call takes the unconfigured
 * early return, exactly like C with empty prefixes).
 * Named omit: WIN32 `translate_path_variables` (platform).
 * @param {string} basenam
 * @param {number} whichprefix
 * @param {number} buffnum
 * @returns {string}
 */
export function fqname(basenam, whichprefix, buffnum) {
    const wp = whichprefix | 0;
    if (!basenam || wp < 0 || wp >= PREFIX_COUNT) return basenam;
    const prefixes = game.gf?.fqn_prefix;
    if (!prefixes || !prefixes[wp]) return basenam;
    let buf = buffnum | 0;
    if (buf < 0 || buf >= FQN_NUMBUF) {
        impossible('Invalid fqn_filename_buffer specified: %d', buffnum);
        buf = 0;
    }
    const bufptr = prefixes[wp];
    /* C WIN32 translate_path_variables — named omit (platform). */
    if (String(bufptr).length + String(basenam).length >= FQN_MAX_FILENAME) {
        impossible('fqname too long: %s + %s', bufptr, basenam);
        return basenam; /* XXX */
    }
    fqn_filename_buffer[buf] = String(bufptr) + String(basenam);
    return fqn_filename_buffer[buf];
}

/**
 * C ref: files.c init_nhfile — reset a handle to COUNTING/structlevel
 * defaults. The unclosed-file arms keep C order: impossible() warning,
 * then the descriptor is dropped (C `nhclose`/`fclose` have no VFS
 * analogue — pseudo-fds reference stash slots, Rule #2).
 * @param {object} nhfp
 */
export function init_nhfile(nhfp) {
    if (nhfp.structlevel) {
        if (nhfp.fd !== -1) {
            impossible('Warning - Unclosed structlevel file being reinitialized');
            /* C nhclose(nhfp->fd) — named omit: pseudo-fd, nothing to close. */
        }
    } else if (nhfp.fpdef) {
        if (nhfp.fpdef) {
            impossible('Warning - Unclosed fieldlevel file being reinitialized');
            /* C fclose(nhfp->fpdef) — named omit: no stdio in JS. */
        }
    }
    nhfp.fd = -1;
    nhfp.fpdef = null;

    nhfp.mode = COUNTING;
    nhfp.structlevel = true;
    nhfp.fieldlevel = false;
    nhfp.addinfo = false;
    nhfp.bendian = NH_IS_BIGENDIAN;
    nhfp.fplog = null;
    nhfp.fpdebug = null;
    nhfp.rcount = 0;
    nhfp.wcount = 0;
    nhfp.eof = false;
    nhfp.fnidx = 0;
    if (!nhfp.style) nhfp.style = {};
    nhfp.style.deflt = false;
    nhfp.style.binary = true;
    nhfp.nhfpconvert = 0;
}

/**
 * C ref: files.c new_nhfile `:496–504` — alloc + zero + init. JS has no
 * malloc/memset: the literal below is the zeroed struct, then
 * init_nhfile fills the same defaults.
 * @returns {object}
 */
export function new_nhfile() {
    const nhfp = {
        mode: 0,
        structlevel: false,
        fieldlevel: false,
        addinfo: false,
        bendian: false,
        fplog: null,
        fpdebug: null,
        fpdef: null,
        rcount: 0,
        wcount: 0,
        eof: false,
        fnidx: 0,
        style: { deflt: false, binary: false },
        nhfpconvert: 0,
        ftype: 0,
        fd: -1,
    };
    init_nhfile(nhfp);
    return nhfp;
}

/**
 * C ref: files.c free_nhfile — re-init then free. JS has no free:
 * re-init drops the pseudo-fd/stdio refs so the handle is inert and GC
 * reclaims it.
 * @param {object|null} nhfp
 */
export function free_nhfile(nhfp) {
    if (nhfp) {
        init_nhfile(nhfp);
        /* C free(nhfp) — GC owns it here. */
    }
}

/**
 * C ref: files.c viable_nhfile `:549–581` (staticfn → module-local) —
 * sanity gate before handing the handle back: no open file at all, a
 * structlevel handle with no fd, or a fieldlevel handle with no FILE
 * frees the handle and yields NULL. The fplog fprintf arms are present
 * in C order; the log write itself is a named omit (Rule #2, no fs log).
 * @param {object|null} nhfp
 * @returns {object|null}
 */
function viable_nhfile(nhfp) {
    /* perform some sanity checks before returning
       the pointer to the nethack file descriptor */
    if (nhfp) {
        /* check for no open file at all,
         * not a structlevel legacy file,
         * nor a fieldlevel file.
         */
        if (((nhfp.fd === -1) && !nhfp.fpdef)
            || (nhfp.structlevel && nhfp.fd < 0)
            || (nhfp.fieldlevel && !nhfp.fpdef)) {
            /* not viable, start the cleanup */
            if (nhfp.fieldlevel) {
                if (nhfp.fpdef) {
                    /* C fclose(nhfp->fpdef) — named omit: no stdio. */
                    nhfp.fpdef = null;
                }
                if (nhfp.fplog) {
                    /* C fprintf(fplog, "# closing, not viable") + fclose —
                       named omit (Rule #2, no fs log). */
                    nhfp.fplog = null;
                }
                if (nhfp.fpdebug) {
                    /* C fclose(nhfp->fpdebug) — named omit: no stdio. */
                    nhfp.fpdebug = null;
                }
            }
            free_nhfile(nhfp);
            nhfp = null;
        }
    }
    return nhfp;
}

/**
 * C ref: files.c set_levelfile_name `:606–618` — rewrite `file` in place
 * as `<base>.<lev>`, stripping any old level suffix at the last '.'.
 * C mutates the caller's buffer (always `gl.lock`, `decl.h:533`); JS
 * strings are immutable, so the rewritten name is returned and the
 * caller stores it back (`open_levelfile` writes `game.lock`, the
 * `gl.lock` analogue).
 * Named omit: VMS `;1` (platform).
 * @param {string} file
 * @param {number} lev
 * @returns {string}
 */
export function set_levelfile_name(file, lev) {
    let base = String(file ?? '');
    const dot = base.lastIndexOf('.');
    if (dot < 0) {
        /* C eos(file) — append at the end; slice below is a no-op. */
    } else {
        base = base.slice(0, dot);
    }
    /* C VMS Strcat(tf, ";1") — named omit (platform). */
    return `${base}.${lev | 0}`;
}

/**
 * C ref: files.c open_levelfile `:673–716` — open the level file for
 * reading into an NHFILE handle, or NULL with `errbuf` set.
 * JSON analogue (Contest Rule #2 — no POSIX open): the "file" is the
 * `game.level_info[lev]` stash slot, openable exactly when C's
 * `LFILE_EXISTS` is set (set on create/savelev leave, cleared by
 * `delete_levelfile` above — nothing else deletes). The handle keeps
 * C's field values in C order; `fd` carries the level number as an
 * opaque success token (C callers only lseek/copy it in the unported
 * `recover_savefile` path — named in the map).
 * `errbuf` is the C `char errbuf[]`: a `{ s }` holder or null
 * (`read_tribute` nowin_buf convention; files.c:3035 passes NULL).
 * @param {number} lev
 * @param {{ s: string }|null} [errbuf]
 * @returns {object|null}
 */
export function open_levelfile(lev, errbuf) {
    const lv = lev | 0;
    if (errbuf) errbuf.s = '';
    /* C set_levelfile_name(gl.lock, lev) — mutates gl.lock; JS stores back. */
    game.lock = set_levelfile_name(game.lock ?? '', lv);
    /* C fq_lock = fqname(gl.lock, LEVELPREFIX, 0) — kept in C order for
       the prefix/impossible arms; the VFS probe below is positional
       (stash slot), so fq_lock feeds no JS branch. */
    const fq_lock = fqname(game.lock, LEVELPREFIX, 0);
    void fq_lock;
    let nhfp = new_nhfile();
    if (nhfp) {
        nhfp.mode = READING;
        nhfp.structlevel = true; /* do set this TRUE for levelfiles */
        nhfp.fieldlevel = false; /* do not set this TRUE for levelfiles */
        nhfp.addinfo = false;
        nhfp.style.deflt = false;
        nhfp.style.binary = true;
        nhfp.ftype = NHF_LEVELFILE;
        nhfp.fnidx = FNIDX_HISTORICAL;
        nhfp.fd = -1;
        nhfp.fpdef = null;
    }
    if (nhfp && nhfp.structlevel) {
        /* C MACOS9 macopen / POSIX open(fq_lock, O_RDONLY|O_BINARY) —
           Rule #2 stash-slot probe instead. */
        const info = game.level_info?.[lv];
        nhfp.fd = (info && ((info.flags | 0) & LFILE_EXISTS)) ? lv : -1;

        /* for failure, return an explanation that our caller can use;
           settle for `lock' instead of `fq_lock' because the latter
           might end up being too big for nethack's BUFSZ */
        if (nhfp.fd < 0 && errbuf)
            errbuf.s = `Cannot open file "${game.lock}" for level ${lv} (errno ${ENOENT}).`;
        /* C MSDOS/WIN32 setmode(fd, O_BINARY) — named omit (platform). */
    }
    nhfp = viable_nhfile(nhfp);
    return nhfp;
}

// ---------------------------------------------------------------------------
// C ref: version.c savefile-validation family — check_version `:374–423`,
// compare_critical_bytes `:763–822`, uptodate `:713–746`, validate
// `:840–862`. JS home is files.js (the NHFILE-handle cluster above):
// version.js must stay import-free (const.js:21 reads its COMMIT_NUMBER
// at top level — D-1881), and these bodies need pline / impossible /
// flush_topl_more plus the SF_/UTD_ consts. The pure datamodel helpers
// stay in version.js (what_datamodel_is_this, imported above); files.js
// consuming version.js adds no cycle (version.js imports nothing).
// ---------------------------------------------------------------------------

// C ref: date.c populate_nomakedefs + mdlib.c make_version `:248–296`,
// contest resolutions (macOS recorder; VERSION_COMPATIBILITY undefined,
// patchlevel.h:62; SCORE_ON_BOTL commented out, config.h:627).
// version_number = incarnation `(5<<24)|(0<<16)|(0<<8)|EDITLEVEL` (0).
const NOMAKEDEFS_VERSION_NUMBER = 0x05000000;
// version_features: MAIL_STRUCTURES bit 6 (global.h:430, unconditional) +
// color bit 17 (mdlib.c:270 "always") + INSURANCE bit 18 (config.h:435).
const NOMAKEDEFS_VERSION_FEATURES = (1 << 6) | (1 << 17) | (1 << 18);
// ignored_features = md_ignored_features() (mdlib.c:236–243):
// SCORE_ON_BOTL bit 19 + SFCTOOL_BIT (global.h:615).
const NOMAKEDEFS_IGNORED_FEATURES = (1 << 19) | SFCTOOL_BIT;
// version_sanity1 = entity_count (mdlib.c:285–295):
// (nartifacts<<24)|(NUM_OBJECTS<<12)|NUMMONS, live pinned generated counts.
const NOMAKEDEFS_VERSION_SANITY1 =
    (((NROFARTIFACTS << 24) | (NUM_OBJECTS << 12) | NUMMONS) >>> 0);

// C ref: version.c critical_sizes `:546–664` — `{ ucsize, nm }` per row.
// Sizes measured from the pinned headers with gcc (LP64: short=2 int=4
// long=8 ll=8 ptr=8; probe in /tmp, not committed; cross-checks match
// D-2530: trap=32 engr=64 damage=32 cemetery=184). SF_INCLUDE_SUBSTRUCTS
// is defined nowhere in the tree, so the table ends at you_LO/HI plus
// the 10 zero spares. you=2760 → LO 200, HI 10 (`:618–619`).
const CRITICAL_SIZES = [
    { ucsize: 0, nm: 'unused' }, // `:547`
    { ucsize: 2, nm: 'short' },
    { ucsize: 4, nm: 'int' },
    { ucsize: 8, nm: 'long' },
    { ucsize: 8, nm: 'long long' },
    { ucsize: 8, nm: 'genericptr_t' },
    { ucsize: 1, nm: 'aligntyp' },
    { ucsize: 1, nm: 'boolean' },
    { ucsize: 2, nm: 'coordxy' },
    { ucsize: 2, nm: 'int16' },
    { ucsize: 4, nm: 'int32' },
    { ucsize: 8, nm: 'int64' },
    { ucsize: 1, nm: 'schar' },
    { ucsize: 8, nm: 'size_t' },
    { ucsize: 1, nm: 'uchar' },
    { ucsize: 2, nm: 'uint16' },
    { ucsize: 4, nm: 'uint32' },
    { ucsize: 8, nm: 'uint64' },
    { ucsize: 8, nm: 'ulong' },
    { ucsize: 4, nm: 'unsigned' },
    { ucsize: 2, nm: 'ushort' },
    { ucsize: 2, nm: 'xint16' },
    { ucsize: 1, nm: 'xint8' },
    { ucsize: 4, nm: 'struct arti_info' },
    { ucsize: 8, nm: 'struct nhrect' },
    { ucsize: 32, nm: 'struct branch' },
    { ucsize: 40, nm: 'struct bubble' },
    { ucsize: 184, nm: 'struct cemetery' },
    { ucsize: 192, nm: 'struct context_info' },
    { ucsize: 4, nm: 'struct nhcoord' },
    { ucsize: 32, nm: 'struct damage' },
    { ucsize: 16, nm: 'struct dest_area' },
    { ucsize: 114, nm: 'struct dgn_topology' },
    { ucsize: 92, nm: 'struct dungeon' },
    { ucsize: 4, nm: 'struct d_level' },
    { ucsize: 28, nm: 'struct ebones' },
    { ucsize: 64, nm: 'struct edog' },
    { ucsize: 128, nm: 'struct egd' },
    { ucsize: 8, nm: 'struct emin' },
    { ucsize: 64, nm: 'struct engr' },
    { ucsize: 56, nm: 'struct epri' },
    { ucsize: 96, nm: 'struct eshk' },
    { ucsize: 48, nm: 'struct fe' },
    { ucsize: 208, nm: 'struct flag' },
    { ucsize: 48, nm: 'struct fruit' },
    { ucsize: 32, nm: 'struct gamelog_line' },
    { ucsize: 16, nm: 'struct kinfo' },
    { ucsize: 16, nm: 'struct levelflags' },
    { ucsize: 32, nm: 'struct ls_t' },
    { ucsize: 1, nm: 'struct linfo' },
    { ucsize: 4, nm: 'struct mapseen_feat' },
    { ucsize: 4, nm: 'struct mapseen_flags' },
    { ucsize: 4, nm: 'struct mapseen_rooms' },
    { ucsize: 64, nm: 'struct mextra' },
    { ucsize: 224, nm: 'struct mkroom' },
    { ucsize: 192, nm: 'struct monst' },
    { ucsize: 4, nm: 'struct mvitals' },
    { ucsize: 112, nm: 'struct obj' },
    { ucsize: 72, nm: 'struct objclass' },
    { ucsize: 32, nm: 'struct oextra' },
    { ucsize: 8, nm: 'struct q_score' },
    { ucsize: 8, nm: 'struct rm' },
    { ucsize: 8, nm: 'struct spell' },
    { ucsize: 24, nm: 'struct stairway' },
    { ucsize: 40, nm: 'struct s_level' },
    { ucsize: 32, nm: 'struct trap' },
    { ucsize: 24, nm: 'struct version_info' }, // `:615`
    { ucsize: 8, nm: 'anything' },
    { ucsize: 200, nm: 'you_LO' },
    { ucsize: 10, nm: 'you_HI' },
    { ucsize: 0, nm: '' },
    { ucsize: 0, nm: '' },
    { ucsize: 0, nm: '' },
    { ucsize: 0, nm: '' },
    { ucsize: 0, nm: '' },
    { ucsize: 0, nm: '' },
    { ucsize: 0, nm: '' },
    { ucsize: 0, nm: '' },
    { ucsize: 0, nm: '' },
    { ucsize: 0, nm: '' }, // 10 spares `:621–630`
];

// C ref: version.c `:666` — file-scope `uchar cscbuf[SIZE(critical_sizes)]`
// filled by the Sfi_uchar feed; zero-init, mutated in place like C.
const CSCBUF = new Array(CRITICAL_SIZES.length).fill(0);

/**
 * C ref: version.c check_version `:374–423` — incarnation, feature-set
 * and entity-count gates over the savefile's version_info, in C order.
 * `:380–386` null-filename arm (EXTRA_SANITY_CHECKS is defined,
 * config.h:637, so the impossible is live); `:388–391` SFCTOOL_BIT
 * strip (+ converted_savefile_loaded, decl.h:223 instance_globals_c —
 * neighboring gc fields live as game.*, cf. corpsenm_digested);
 * `:392–407` incarnation gate (VERSION_COMPATIBILITY undefined,
 * patchlevel.h:62, so the `:397` != arm); `:408–420` feature/sanity
 * gate. `#ifndef SFCTOOL` complaint arms are live in the game build.
 * @param {object} version_data { incarnation, feature_set, entity_count }
 * @param {string|null} filename
 * @param {boolean} complain
 * @param {number} utdflags
 * @returns {Promise<boolean>}
 */
export async function check_version(version_data, filename, complain, utdflags) {
    if (filename == null) {
        if (complain) {
            await impossible("check_version() called with 'complain'=True but 'filename'=Null");
        }
        complain = false; /* C `:386` — complain needs filename for pline("%s") */
    }
    if (((version_data.feature_set | 0) & SFCTOOL_BIT) !== 0) { // `:388`
        game.converted_savefile_loaded = true; // `:389`
        version_data.feature_set = // `:390`
            (((version_data.feature_set | 0) & ~SFCTOOL_BIT) >>> 0);
    }
    if ((version_data.incarnation >>> 0) !== NOMAKEDEFS_VERSION_NUMBER) { // `:397`
        if (complain) { // `:401`
            await pline('Version mismatch for file "%s".', filename); // `:402`
            /* C `:403–404` — flush only when the message window exists;
               game id with WIN_ERR default (allmain.js WIN_INVEN idiom). */
            if ((game.WIN_MESSAGE ?? WIN_ERR) !== WIN_ERR) {
                await flush_topl_more(); /* display_nhwindow(WIN_MESSAGE, TRUE) */
            }
        }
        return false; // `:407`
    } else if ((((version_data.feature_set | 0) & ~NOMAKEDEFS_IGNORED_FEATURES) >>> 0) // `:409–410`
            !== (((NOMAKEDEFS_VERSION_FEATURES | 0) & ~NOMAKEDEFS_IGNORED_FEATURES) >>> 0)
        || ((((utdflags | 0) & UTD_SKIP_SANITY1) === 0) // `:411–412`
            && ((version_data.entity_count >>> 0) !== NOMAKEDEFS_VERSION_SANITY1))) {
        if (complain) { // `:415`
            await pline('Configuration incompatibility for file "%s".', filename); // `:416`
            /* C `:417` has no WIN_ERR gate — unconditional display. */
            await flush_topl_more(); /* display_nhwindow(WIN_MESSAGE, TRUE) */
        }
        return false; // `:420`
    }
    return true; // `:422`
}

/**
 * C ref: version.c compare_critical_bytes `:763–822` — critical-size
 * count gate, per-struct comparison loop with datamodel detection, in C
 * order. SYNC: every live callee is sync (datamodel,
 * what_datamodel_is_this); the byte feed is named below.
 * C `int *idx_1st_mismatch` → mutable `{ value }` holder or null.
 * Named omits: `:771` Sfi_char count feed and `:779–781` Sfi_uchar
 * cscbuf fill (no binary NHFILE read layer in JS — JSON VFS; Sfi_ arms
 * live as payload analogues at use sites, cf. getbones bones.js:484);
 * `:774–777` raw_printf (no pre-window stdout channel in dual-runtime
 * ESM — display.js:7749 raw_print/raw_printf omit).
 * @param {object} nhfp JS NHFILE handle (unread — feed omitted, cf. void)
 * @param {{ value: number }|null} idx_1st_mismatch
 * @param {number} utdflags
 * @returns {number} SF_* status
 */
export function compare_critical_bytes(nhfp, idx_1st_mismatch, utdflags) {
    void nhfp;
    const cnt = CRITICAL_SIZES.length; // `:765` SIZE(critical_sizes)
    let dmmismatch = SF_DM_MISMATCH; // `:767`
    const quietly = (((utdflags | 0) & UTD_QUIETLY) !== 0); // `:768`
    let file_csc_count = 0; // `:771` — Sfi_char feed (named omit above)
    if (file_csc_count > cnt) { // `:772`
        return SF_CRITICAL_BYTE_COUNT_MISMATCH; // `:778` (raw_printf omit)
    }
    // `:779–781` — Sfi_uchar cscbuf fill loop (named omit above)
    for (let i = 1; i < cnt; i++) { // `:782`
        if ((CSCBUF[i] | 0) !== (CRITICAL_SIZES[i].ucsize | 0)) { // `:783`
            const dm = datamodel(0); // `:784`
            const dmfile = what_datamodel_is_this(0, // `:786–791`
                CSCBUF[1] | 0, CSCBUF[2] | 0, CSCBUF[3] | 0,
                CSCBUF[4] | 0, CSCBUF[5] | 0);
            if (dmfile === 'IL32LLP64' && dm === 'ILP32LL64') { // `:793–795`
                dmmismatch = SF_DM_IL32LLP64_ON_ILP32LL64;
            } else if (dmfile === 'I32LP64' // `:796–799`
                       && dm === 'ILP32LL64') {
                dmmismatch = SF_DM_I32LP64_ON_ILP32LL64;
            } else if (dmfile === 'ILP32LL64' // `:800–803`
                       && dm === 'I32LP64') {
                dmmismatch = SF_DM_ILP32LL64_ON_I32LP64;
            } else if (dmfile === 'ILP32LL64' // `:804–807`
                       && dm === 'IL32LLP64') {
                dmmismatch = SF_DM_ILP32LL64_ON_IL32LLP64;
            } else if (dmfile === 'I32LP64' // `:808–811`
                       && dm === 'IL32LLP64') {
                dmmismatch = SF_DM_I32LP64_ON_IL32LLP64;
            } else if (dmfile === 'IL32LLP64' // `:812–815`
                       && dm === 'I32LP64') {
                dmmismatch = SF_DM_IL32LLP64_ON_I32LP64;
            }
            if (idx_1st_mismatch) idx_1st_mismatch.value = i; // `:817–818`
            return dmmismatch; // `:819`
        }
    }
    return SF_UPTODATE; // `:822` — everything matched
}

/**
 * C ref: version.c uptodate `:713–746` — critical-bytes probe, version
 * read, check_version gate, in C order. The one C caller is validate
 * `:854` (ported below).
 * Named omits: `:725` Sfi_char indicate-format feed (indicator is
 * write-never-read in C); `:730–732` raw_printf mismatch message (same
 * omit as compare); `:735` Sfi_version_info (sfbase.c:348 sfiprocs/fnidx
 * binary dispatch — no JS home); `:740` wait_synch (winprocs.h:140 →
 * tty_wait_synch, no live JS port).
 * @param {object} nhfp JS NHFILE handle
 * @param {string|null} name
 * @param {number} utdflags
 * @returns {Promise<number>} SF_* status
 */
export async function uptodate(nhfp, name, utdflags) {
    /* C `:715–719` — SFCTOOL takes the extern vers_info; the game build
       keeps the local struct (global.h version_info fields). */
    const vers_info = { incarnation: 0, feature_set: 0, entity_count: 0 };
    let indicator = 0;
    void indicator;
    let sfstatus = 0;
    const idx_holder = { value: 0 }; // C `:721` int idx_1st_mismatch = 0
    const quietly = (((utdflags | 0) & UTD_QUIETLY) !== 0); // `:722`
    const verbose = (name != null); // C `:723` name ? TRUE : FALSE (pointer)
    if ((sfstatus = compare_critical_bytes(nhfp, idx_holder, // `:726–727`
                                           utdflags | 0)) !== SF_UPTODATE) {
        if (sfstatus > 0 && idx_holder.value) { // `:728`
            if (!quietly) { // `:729`
                // raw_printf omit (above): "comparison of critical bytes
                // mismatched at %d (%s)." ucsize/nm of idx_holder.value
            }
        }
    }
    // `:735` — Sfi_version_info feed (named omit above)
    if (!(await check_version(vers_info, name, verbose, // `:737`
                              utdflags | 0))) {
        if (verbose) { // `:738`
            if ((((utdflags | 0) & UTD_WITHOUT_WAITSYNCH_PERFILE)) === 0) { // `:739`
                // `:740` — wait_synch() (named omit above)
            }
        }
        return SF_OUTDATED; // `:743`
    }
    return sfstatus; // `:745`
}

/**
 * C ref: version.c validate `:840–862` — utdflags assembly + uptodate.
 * C callers: bones.c:663 (getbones — JS JSON analogue at bones.js:544,
 * no validate call), files.c:1281/:1379 (unported load-save path),
 * restore.c:892 (unported), sfctool.c:312 (savefile tool, not the game) —
 * all named in the map; no live JS caller yet.
 * @param {object} nhfp JS NHFILE handle
 * @param {string|null} name
 * @param {boolean} without_waitsynch_perfile
 * @returns {Promise<number>} SF_* status
 */
export async function validate(nhfp, name, without_waitsynch_perfile) {
    let utdflags = 0; // `:842`
    /* C `:845–847` #ifdef SFCTOOL |= UTD_QUIETLY — compiled out in the
       game build (named). */
    if (nhfp.structlevel) utdflags |= UTD_CHECKSIZES; // `:848–849`
    if (without_waitsynch_perfile) utdflags |= UTD_WITHOUT_WAITSYNCH_PERFILE; // `:850–851`
    if (nhfp.fieldlevel) utdflags |= (UTD_CHECKFIELDCOUNTS | UTD_SKIP_SANITY1); // `:852–853`
    const validsf = await uptodate(nhfp, name, utdflags); // `:854`
    return validsf;
}

/**
 * C ref: files.c Death_quote — oid 1 into Death Quotes, one-line buffer.
 * @param {{ s: string }} buf
 * @param {number} [bufsz]
 */
export async function Death_quote(buf, bufsz = BUFSZ) {
    const death_oid = 1;
    const holder = buf || { s: '' };
    if (holder.s == null) holder.s = '';
    return read_tribute(
        'Death', 'Death Quotes', 0, holder,
        (bufsz | 0) || BUFSZ, death_oid,
    );
}

