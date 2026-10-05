// @ts-nocheck
// data_base.js — the "data" file half of pager.c checkfile():  the dat/data.base
// lookup that turns a looked-up name into the lines of its encyclopedia entry.
//
// C refs:
//   nethack-c/src/pager.c:829-1130 checkfile()
//   nethack-c/src/strutil.c:105-147 pmatch_internal()/pmatch()
//   nethack-c/src/hacklib.c:491-520 tabexpand()
//   nethack-c/dat/data.base (the makedefs -d source for the runtime 'data' file)
//
// C reads DATAFILE ("data"), which `makedefs -d` builds from dat/data.base:  a
// two-line header, then an INDEX of key lines each entry-block terminated by an
// "<offset>,<count>" line, then the concatenated entry text.  makedefs drops the
// '#' comment lines and copies everything else verbatim, so the key/text split in
// the generated file is exactly the key/text split in data.base:
//
//   * a line starting with '#' is a comment (dropped by makedefs);
//   * a line that starts with neither whitespace nor '#' is a lookup KEY —
//     consecutive key lines share one entry;
//   * a line starting with <TAB> (or spaces, which data.base never uses but
//     checkfile tolerates) is entry text; an EMPTY line is also entry text
//     (pager.c:1104 "empty lines are ok" — all 133 blank lines in data.base sit
//     inside entries).
//
// So this module parses data.base directly and models checkfile's byte offsets as
// entry indices:  the index scan below walks entries in file order and its
// per-entry key loop reproduces pager.c:1017-1036 (including the leading-'~'
// negative-match keys that make the whole entry skip), and the pass1offset
// duplicate check (pager.c:1051-1055) compares entry indices instead of
// fseek offsets.  Same decisions, same order, no 'data' build step.
//
// DISPLAY-CHANNEL ONLY:  no rn2/rnd/d/rne/rnz call site exists anywhere in
// checkfile(), so nothing here may consume RNG.
import { dat_content } from './dat_source.js';
import { makesingular } from './objnam.js';

// ── hacklib/strutil helpers this port did not have yet ──

// C ref: strutil.c:105-147 pmatch_internal(patrn, strng, ci=FALSE, sk=NULL) via
// pmatch() — '*' matches zero or more characters, '?' matches any single
// character, case-SENSITIVE.  Lives in js/strutil.js (C's own home for it)
// alongside the case-INsensitive pmatchi() the tty menu search needs, so the
// two entry points share one body exactly as C's do; re-exported here because
// checkfile() is the only caller in this file's neighbourhood.
import { pmatch } from './strutil.js';
export { pmatch };

// C ref: hacklib.c:491-520 tabexpand() — expand tabs to the next 8-column tab
// stop, in place.  The attributions at the end of data.base quotes are indented
// with a second tab, which is what makes this reachable from checkfile.
export function tabexpand(sbuf) {
    if (!sbuf) return sbuf;
    let out = '', idx = 0;
    for (const ch of sbuf) {
        if (ch === '\t') {
            do {
                out += ' ';
            } while (++idx % 8);
        } else {
            out += ch;
            ++idx;
        }
    }
    return out;
}

// ── data.base parse (the makedefs -d index + text sections) ──

let _dbase = null; /* [{ keys: string[], lines: string[] }] in file order */

function load_dbase() {
    if (_dbase) return _dbase;
    /* C ref: pager.c:846-850 — dlb_fopen(DATAFILE) failure plines
     * "Cannot open 'data' file!" and returns FALSE.  Signalled to the
     * caller as an empty database (no entry ever found). */
    const raw = dat_content('data.base');
    if (raw === null) {
        _dbase = [];
        return _dbase;
    }
    const lines = raw.split('\n');
    if (lines.length && lines[lines.length - 1] === '') lines.pop();
    const entries = [];
    let cur = null;
    for (const line of lines) {
        if (line.startsWith('#')) continue;            /* makedefs comment */
        const isKey = line.length > 0 && line[0] !== '\t' && line[0] !== ' ';
        if (isKey) {
            /* consecutive key lines belong to one entry; a key line right after
             * entry text starts a new entry (the "<offset>,<count>" line in the
             * generated file is what resets checkfile's skipping_entry). */
            if (!cur || cur.lines.length > 0) {
                cur = { keys: [], lines: [] };
                entries.push(cur);
            }
            cur.keys.push(line);
        } else if (cur) {
            cur.lines.push(line);
        }
    }
    _dbase = entries;
    return _dbase;
}

/* C ref: pager.c:1082-1112 — the per-line text massaging done while putstr()ing
 * the entry into the window: strip the one leading tab (or up to 8 leading
 * spaces), then tabexpand() if any further tab remains. */
function entry_text(rawLines) {
    const out = [];
    for (const raw of rawLines) {
        let tp = raw;
        if (tp[0] === '\t') {
            tp = tp.slice(1);
        } else if (tp[0] === ' ') {
            /* remove up to 8 spaces (we expect 8-column tab stops but user
             * might have them set at something else so we don't require it) */
            let i = 1;
            while (i < 8 && tp[i] === ' ') i++;
            tp = tp.slice(i);
        }
        /* else: empty lines are ok (a non-empty unindented line would be
         * bad_data_file, which our parser classifies as a key instead). */
        if (tp.indexOf('\t') !== -1)
            tp = tabexpand(tp);
        out.push(tp);
    }
    return out;
}

/* C ref: pager.c:1017-1036 — one pass of the index scan.  Returns the index of
 * the first entry one of whose plain keys pmatches `str`; an entry whose
 * leading-'~' key matches first is skipped entirely (skipping_entry). */
function dbase_scan(str) {
    const entries = load_dbase();
    for (let e = 0; e < entries.length; e++) {
        let skip = false;
        for (const key of entries[e].keys) {
            const chk_skip = key[0] === '~' ? 1 : 0;
            if (pmatch(key.slice(chk_skip), str)) {
                if (chk_skip) { skip = true; break; }
                return e;
            }
        }
        if (skip) continue;
    }
    return -1;
}

/**
 * The already-mangled-name half of the lookup: given a data.base key string
 * (what checkfile calls dbase_str after its prefix stripping), return the
 * putstr-ready entry lines, or null when there is no entry.
 * C ref: pager.c:1017-1112 for a single pass.
 */
export function dbase_entry_lines(dbase_str) {
    const e = dbase_scan(dbase_str);
    if (e < 0) return null;
    return entry_text(load_dbase()[e].lines);
}

// ── checkfile()'s name mangling ──

/* C ref: pager.c:864-940 — lcase() then the strncmp() prefix-stripping chain
 * that turns a doname()/xname() string into a data.base key. */
function mangle_dbase_str(inp) {
    let s = String(inp).toLowerCase(); /* C ref: pager.c:867 lcase(dbase_str) */
    const drop = (pfx) => {
        if (s.startsWith(pfx)) { s = s.slice(pfx.length); return true; }
        return false;
    };
    const digit = (c) => c >= '0' && c <= '9';

    drop('interior of ');
    if (!drop('a ') && !drop('an ') && !drop('the ') && !drop('some ')
        && s.length && digit(s[0])) {
        /* remove count prefix ("2 ya") which can come from looking at map */
        let i = 0;
        while (i < s.length && digit(s[i])) ++i;
        if (s[i] === ' ') ++i;
        s = s.slice(i);
    }
    drop('pair of ');
    if (!drop('tame ')) drop('peaceful ');
    drop('invisible ');
    drop('saddled ');
    if (!drop('blessed ') && !drop('uncursed ')) drop('cursed ');
    drop('empty ');
    if (!drop('partly used ')) drop('partly eaten ');
    if (s.startsWith('statue of '))
        s = s.slice(0, 6);          /* dbase_str[6] = '\0' => "statue" */
    else if (s.startsWith('figurine of '))
        s = s.slice(0, 8);          /* dbase_str[8] = '\0' => "figurine" */
    /* remove enchantment ("+0 aklys") */
    if (s.length && (s[0] === '+' || s[0] === '-') && digit(s[1] || '')) {
        let i = 1;                                  /* skip sign */
        while (i < s.length && digit(s[i])) ++i;
        if (s[i] === ' ') ++i;
        s = s.slice(i);
    }
    /* "moist towel" is looked up as "wet towel" (pager.c:936-940:
     * memcpy(dbase_str += 2, "wet", 3) — skip "mo", replace "ist") */
    if (s.startsWith('moist towel'))
        s = 'wet' + s.slice(5);
    return s;
}

/**
 * checkfile()'s lookup half, for the chkfilUsrTyped|chkfilDontAsk callers
 * (pager.c:1009 and pager.c:1853): no "More info about ...?" y_n() is possible,
 * so the whole pass-1 / pass-0 walk resolves without asking the player anything.
 *
 * Returns { windows, noInfo } where `windows` is the list of entry line-arrays to
 * display, in C's display order (pass 1 = the `alt` name, then pass 0 = the base
 * name, skipped when it resolves to the same entry pass 1 already showed —
 * pager.c:1049-1055 pass1offset), and `noInfo` is true when C would instead
 * pline "You don't have any information on those things." (pager.c:1114-1116).
 *
 * C ref: pager.c:829-1130 checkfile(inp, NULL, chkfilUsrTyped|chkfilDontAsk, NULL)
 */
export function checkfile_lookup(inp) {
    const res = { windows: [], noInfo: false };
    const keys = checkfile_keys(inp);
    if (!keys) return res;
    const resolved = resolve_checkfile_entries(keys);
    res.windows = resolved.entries.map((entry) => entry.lines);
    res.noInfo = resolved.noInfo;
    return res;
}

/**
 * Resolve the data.base entries that checkfile would visit for a selected
 * look target, without displaying them.  The alternate-name pass is returned
 * first, followed by the base-name pass; when both passes resolve to the same
 * data.base record, the second result is suppressed exactly as C's
 * pass1offset/fseekoffset check does (pager.c:1049-1055).
 *
 * `key` is the normalized lookup string for the pass that found the entry
 * (the alternate name or the base name), and `lines` are already in the form
 * that checkfile's putstr() receives.  An absent or malformed input resolves
 * to an empty array.
 *
 * This is the non-interactive lookup needed by look descriptions that may
 * offer more than one neutral species name.  It is display-channel only and
 * does not consume RNG.
 */
export function checkfile_entries(inp) {
    const keys = checkfile_keys(inp);
    if (!keys) return [];
    return resolve_checkfile_entries(keys).entries;
}

/* Shared pass machinery for checkfile_lookup() and checkfile_entries(). */
function resolve_checkfile_entries({ dbase_str, alt }) {
    const entries = [];
    const db = load_dbase();
    let pass1offset = -1, pass1found = false;
    for (let pass = (alt === dbase_str) ? 0 : 1; pass >= 0; --pass) {
        const key = pass === 1 ? alt : dbase_str;
        if (pass === 1 && !alt) continue;
        const e = dbase_scan(key);
        if (e >= 0) {
            if (pass === 1) pass1offset = e;
            else if (e === pass1offset) {
                /* pager.c:1054-1055 — pass 0 found the same record already
                 * shown by pass 1, so checkfile stops without duplicating it. */
                return { entries, noInfo: false };
            }
            if (pass === 1) pass1found = true;
            entries.push({ key, lines: entry_text(db[e].lines) });
        } else if (pass === 0 && !pass1found) {
            /* C's user_typed_name/noInfo branch is represented for the
             * existing checkfile_lookup caller; the entry resolver itself
             * remains a simple [] result for an absent target. */
            return { entries, noInfo: true };
        }
    }
    return { entries, noInfo: false };
}

export function ia_checkfile(inp) {
    const keys = checkfile_keys(inp);
    if (!keys) return false;
    const { dbase_str, alt } = keys;
    for (let pass = (alt === dbase_str) ? 0 : 1; pass >= 0; --pass) {
        const key = pass === 1 ? alt : dbase_str;
        if (pass === 1 && !alt) continue;
        if (dbase_scan(key) >= 0)
            return true;                 /* pager.c:1076-1078 */
    }
    return false;
}

/* checkfile()'s key derivation, shared by the two modes above.  Returns null
 * where C bails out early (pager.c:944 empty name).
 * C ref: pager.c:942-1012. */
function checkfile_keys(inp) {
    if (inp == null) return null;
    let dbase_str = mangle_dbase_str(inp);
    if (!dbase_str) return null;         /* pager.c:944 "Make sure the name is non-empty" */

    /* C ref: pager.c:948-975 — adjust the input to remove "named "/"called ",
     * strip a ", " tail and a " (" tail, and derive the alternate description. */
    let alt = null, ep = -1;
    const named = dbase_str.indexOf(' named ');
    if (named !== -1) {
        alt = dbase_str.slice(named + 7);
        ep = named;
        const called = dbase_str.indexOf(' called ');
        if (called !== -1 && called < named)
            ep = called;                 /* "named" is alt but truncate at "called" */
    } else {
        const called = dbase_str.indexOf(' called ');
        if (called !== -1) {
            alt = dbase_str.slice(called + 8);
            ep = called;
        } else {
            ep = dbase_str.indexOf(', ');
        }
    }
    if (ep > 0) dbase_str = dbase_str.slice(0, ep);
    if (alt !== null
        && (alt.startsWith('a ') || alt.startsWith('an ') || alt.startsWith('the ')))
        alt = alt.slice(alt.indexOf(' ') + 1);
    const paren = dbase_str.indexOf(' (');
    if (paren > 0) dbase_str = dbase_str.slice(0, paren);
    if (alt !== null) {
        const aparen = alt.indexOf(' (');
        if (aparen > 0) alt = alt.slice(0, aparen);
    }
    /* C ref: pager.c:977-983 fruit_from_name() — this port has no player
     * fruitname, so the "fruit" alternate description never applies. */
    if (alt === null)
        alt = makesingular(dbase_str);

    return { dbase_str, alt };
}
