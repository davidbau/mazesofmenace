// files.js — WIZKIT file handling + 3.6 tribute (files.c).
// C ref: files.c fopen_wizkit_file / wizkit_addinv / proc_wizkit_line /
// read_wizkit; choose_passage / read_tribute / Death_quote;
// delete_levelfile (JSON analogue; no fs unlink);
// clearlocks (JSON analogue; no POSIX signal).
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
import { PM_CLERIC } from './generated/monsters_data.js';
import {
    BUFSZ, MIGR_NOBREAK, MIGR_NOSCATTER, MIGR_WITH_HERO, WIZKIT_MAX,
    LFILE_EXISTS,
} from './const.js';
import { rn2 } from './rng.js';
import { mungspaces } from './getline.js';
import { pline, putmsghistory, You_feel } from './display.js';
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

