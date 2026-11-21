// strutil.js — String utility functions.
// C ref: strutil.c

const LARGEST_INT = 32767;

function panic(fmt, ...args) {
    throw new Error(`panic: ${fmt}`);
}

/**
 * strlen() but returns unsigned and panics if string is unreasonably long;
 * used by dlb as well as by nethack
 */
export function Strlen_(str, file, line) {
    let len = 0;

    /* strnlen(str, LARGEST_INT) w/o requiring posix.1 headers or libraries */
    for (const p = str; len < LARGEST_INT; ++len) {
        if (str[len] === '\0' || str[len] === undefined) {
            break;
        }
    }

    if (len === LARGEST_INT) {
        panic("%s:%d string too long", file, line);
    }
    return len >>> 0;  /* cast to unsigned */
}

/* C ref: strutil.c:105-142 pmatch_internal(patrn, strng, ci, sk) — the guts of
 * pmatch(), pmatchi() and pmatchz().  '*' matches zero or more characters, '?'
 * matches any single character; `ci` selects case-insensitive comparison
 * (C compares lowc(p) against lowc(s)).  The `sk` skip-set (pmatchz) is not
 * ported: nothing in this port calls pmatchz yet.
 *
 * Transliterated as index recursion — the C walks two char pointers and
 * tail-recurses via `goto pmatch_top`, and reads one past the end as '\0',
 * which JS string indexing gives back as undefined, so the sentinel is
 * explicit here. */
/* hacklib.c lowc(): ASCII-only fold (kept local: hacklib.js imports this module). */
const _lowc = (c) => (c >= 'A' && c <= 'Z') ? String.fromCharCode(c.charCodeAt(0) | 32) : c;
export function pmatch_internal(patrn, strng, ci) {
    let pi = 0, si = 0;
    for (;;) {
        const s = si < strng.length ? strng[si] : '\0';
        const p = pi < patrn.length ? patrn[pi] : '\0';
        si++; pi++;                       /* get next chars and pre-advance */
        if (p === '\0')                   /* end of pattern */
            return s === '\0';            /* matches iff end of string too */
        if (p === '*')                    /* wildcard reached */
            return (pi >= patrn.length
                    || pmatch_internal(patrn.slice(pi), strng.slice(si - 1), ci))
                ? true
                : (s !== '\0'
                   ? pmatch_internal(patrn.slice(pi - 1), strng.slice(si), ci)
                   : false);
        /* check single character & single-char wildcard */
        const pc = ci ? _lowc(String(p)) : p; /* pmatchi: lowc, ASCII-only */
        const sc = ci ? _lowc(String(s)) : s;
        if (pc !== sc && (p !== '?' || s === '\0'))
            return false;
        /* else: goto pmatch_top (tail recursion) */
    }
}

/* C ref: strutil.c:145-148 pmatch() — case-SENSITIVE. */
export function pmatch(patrn, strng) {
    return pmatch_internal(patrn, strng, false);
}

/* C ref: strutil.c:151-155 pmatchi() — case-INsensitive.  Used by
 * process_menu_window's MENU_SEARCH (wintty.c:1714). */
export function pmatchi(patrn, strng) {
    return pmatch_internal(patrn, strng, true);
}

export function nh_sprintf(fmt, args) {
    let i = 0;
    return String(fmt).replace(
        /%([-+#0]*)([0-9]*)(?:\.([0-9]+))?(hh|h|ll|l|L|z|j|t)?([diouxXeEfgGaAcs%]|$)/g,
        (spec, flags, width, prec, len, conv) => {
            if (conv === '') return '';
            if (conv === '%') return '%';
            const a = args[i++];
            let s;
            switch (conv) {
            case 's':
                s = (a == null) ? '' : String(a).split('\0', 1)[0];
                if (prec !== undefined) s = s.slice(0, Number(prec));
                break;
            case 'c':
                s = (typeof a === 'number') ? String.fromCharCode(a) : String(a);
                break;
            case 'd': case 'i':
                /* C's %d is int and wraps at 32 bits, which `| 0` reproduces;
                 * %ld is long and must NOT wrap — vault.js's
                 * Your("%ld gold pieces...", umoney) is the case that would
                 * otherwise print a negative purse. */
                s = typeof a === 'bigint'
                    ? BigInt.asIntN(len ? 64 : 32, a).toString()
                    : String(len ? Math.trunc(Number(a) || 0) : (Number(a) | 0));
                break;
            case 'u':
                s = String(len ? (Math.trunc(Number(a) || 0) >>> 0)
                               : ((Number(a) | 0) >>> 0));
                break;
            case 'o': s = ((Number(a) | 0) >>> 0).toString(8); break;
            case 'x': s = ((Number(a) | 0) >>> 0).toString(16); break;
            case 'X': s = ((Number(a) | 0) >>> 0).toString(16).toUpperCase(); break;
            case 'f': case 'F':
                s = Number(a).toFixed(prec === undefined ? 6 : Number(prec));
                break;
            default:
                /* Unrecognised: give the argument back rather than losing it. */
                s = String(a);
                break;
            }
            if (flags.includes('+') && 'dif'.includes(conv) && !s.startsWith('-'))
                s = '+' + s;
            const w = Number(width || 0);
            if (s.length < w) {
                if (flags.includes('-')) s = s.padEnd(w, ' ');
                else if (flags.includes('0') && conv !== 's' && conv !== 'c')
                    s = (s.startsWith('-') ? '-' + s.slice(1).padStart(w - 1, '0')
                                           : s.padStart(w, '0'));
                else s = s.padStart(w, ' ');
            }
            return s;
        });
}
