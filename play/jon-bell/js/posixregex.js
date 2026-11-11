
export const REG_NOMATCH = 1, REG_BADPAT = 2, REG_ECOLLATE = 3, REG_ECTYPE = 4,
    REG_EESCAPE = 5, REG_ESUBREG = 6, REG_EBRACK = 7, REG_EPAREN = 8,
    REG_EBRACE = 9, REG_BADBR = 10, REG_ERANGE = 11, REG_ESPACE = 12,
    REG_BADRPT = 13, REG_EMPTY = 14, REG_ASSERT = 15, REG_INVARG = 16;

/* BSD regerror.c rerrs[] explanations */
const RERRS = {
    [REG_NOMATCH]: 'regexec() failed to match',
    [REG_BADPAT]: 'invalid regular expression',
    [REG_ECOLLATE]: 'invalid collating element',
    [REG_ECTYPE]: 'invalid character class',
    [REG_EESCAPE]: 'trailing backslash (\\)',
    [REG_ESUBREG]: 'invalid backreference number',
    [REG_EBRACK]: 'brackets ([ ]) not balanced',
    [REG_EPAREN]: 'parentheses not balanced',
    [REG_EBRACE]: 'braces not balanced',
    [REG_BADBR]: 'invalid repetition count(s)',
    [REG_ERANGE]: 'invalid character range',
    [REG_ESPACE]: 'out of memory',
    [REG_BADRPT]: 'repetition-operator operand invalid',
    [REG_EMPTY]: 'empty (sub)expression',
    [REG_ASSERT]: '"can\'t happen" -- you found a bug',
    [REG_INVARG]: 'invalid argument to regex routine',
};

export class RegexError extends Error {
    constructor(code) {
        super(RERRS[code] || `*** unknown regexp error code (${code}) ***`);
        this.code = code;
    }
}

const DUPMAX = 255; /* RE_DUP_MAX */

/* C-locale ctype for the [:class:] table (BSD cclass.h) */
const isdigit = (c) => c >= 48 && c <= 57;
const isupper = (c) => c >= 65 && c <= 90;
const islower = (c) => c >= 97 && c <= 122;
const isalpha = (c) => isupper(c) || islower(c);
const isalnum = (c) => isalpha(c) || isdigit(c);
const isspace = (c) => c === 32 || (c >= 9 && c <= 13);
const iscntrl = (c) => c < 32 || c === 127;
const isprint = (c) => c >= 32 && c < 127;
const isgraph = (c) => c > 32 && c < 127;
const CCLASSES = {
    alnum: isalnum, alpha: isalpha, blank: (c) => c === 32 || c === 9,
    cntrl: iscntrl, digit: isdigit, graph: isgraph, lower: islower,
    print: isprint, punct: (c) => isgraph(c) && !isalnum(c), space: isspace,
    upper: isupper, xdigit: (c) => isdigit(c) || (c >= 65 && c <= 70) || (c >= 97 && c <= 102),
};

/* BSD cname.h cnames[] */
const CNAMES = {
    NUL: 0, SOH: 1, STX: 2, ETX: 3, EOT: 4, ENQ: 5, ACK: 6, BEL: 7, alert: 7,
    BS: 8, backspace: 8, HT: 9, tab: 9, LF: 10, newline: 10, VT: 11,
    'vertical-tab': 11, FF: 12, 'form-feed': 12, CR: 13, 'carriage-return': 13,
    SO: 14, SI: 15, DLE: 16, DC1: 17, DC2: 18, DC3: 19, DC4: 20, NAK: 21,
    SYN: 22, ETB: 23, CAN: 24, EM: 25, SUB: 26, ESC: 27, IS4: 28, FS: 28,
    IS3: 29, GS: 29, IS2: 30, RS: 30, IS1: 31, US: 31, space: 32,
    'exclamation-mark': 33, 'quotation-mark': 34, 'number-sign': 35,
    'dollar-sign': 36, 'percent-sign': 37, ampersand: 38, apostrophe: 39,
    'left-parenthesis': 40, 'right-parenthesis': 41, asterisk: 42,
    'plus-sign': 43, comma: 44, hyphen: 45, 'hyphen-minus': 45, period: 46,
    'full-stop': 46, slash: 47, solidus: 47, zero: 48, one: 49, two: 50,
    three: 51, four: 52, five: 53, six: 54, seven: 55, eight: 56, nine: 57,
    colon: 58, semicolon: 59, 'less-than-sign': 60, 'equals-sign': 61,
    'greater-than-sign': 62, 'question-mark': 63, 'commercial-at': 64,
    'left-square-bracket': 91, backslash: 92, 'reverse-solidus': 92,
    'right-square-bracket': 93, circumflex: 94, 'circumflex-accent': 94,
    underscore: 95, 'low-line': 95, 'grave-accent': 96, 'left-brace': 123,
    'left-curly-bracket': 123, 'vertical-line': 124, 'right-brace': 125,
    'right-curly-bracket': 125, tilde: 126, DEL: 127,
};

const lit = (c) => '\\x' + (c & 0xff).toString(16).padStart(2, '0');
const WORD = '[A-Za-z0-9_]'; /* regexec.c ISWORD: isalnum || '_' */

/* regcomp(s, REG_EXTENDED | REG_NOSUB): a JS RegExp, or throws RegexError */
export function regcomp(s) {
    s = String(s);
    let next = 0;
    const end = s.length;
    const MORE = () => next < end;
    const MORE2 = () => next + 1 < end;
    const PEEK = () => s.charCodeAt(next);
    const PEEK2 = () => s.charCodeAt(next + 1);
    const SEE = (ch) => MORE() && s[next] === ch;
    const SEETWO = (a, b) => MORE() && MORE2() && s[next] === a && s[next + 1] === b;
    const EAT = (ch) => (SEE(ch) ? (next++, true) : false);
    const EATTWO = (a, b) => (SEETWO(a, b) ? (next += 2, true) : false);
    const GETNEXT = () => s.charCodeAt(next++);
    const REQUIRE = (cond, code) => { if (!cond) throw new RegexError(code); };
    /* g->nsub and p->pend[]: subexpressions are numbered by their '(' and
     * a back reference may only name one whose ')' has been seen */
    let nsub = 0;
    const closed = new Set();

    /* regcomp.c p_count */
    function p_count() {
        let count = 0, ndigits = 0;
        while (MORE() && isdigit(PEEK()) && count <= DUPMAX) {
            count = count * 10 + (GETNEXT() - 48);
            ndigits++;
        }
        REQUIRE(ndigits > 0 && count <= DUPMAX, REG_BADBR);
        return count;
    }

    /* regcomp.c p_b_coll_elem */
    function p_b_coll_elem(endc) {
        const sp = next;
        while (MORE() && !SEETWO(endc, ']')) next++;
        REQUIRE(MORE(), REG_EBRACK);
        const name = s.slice(sp, next);
        if (Object.hasOwn(CNAMES, name)) return CNAMES[name];
        if (name.length === 1) return name.charCodeAt(0);
        throw new RegexError(REG_ECOLLATE);
    }

    /* regcomp.c p_b_symbol */
    function p_b_symbol() {
        REQUIRE(MORE(), REG_EBRACK);
        if (!EATTWO('[', '.')) return GETNEXT();
        const value = p_b_coll_elem('.');
        REQUIRE(EATTWO('.', ']'), REG_ECOLLATE);
        return value;
    }

    /* regcomp.c p_b_term */
    function p_b_term(cs) {
        let c = 0;
        switch (MORE() ? s[next] : '\0') {
        case '[': c = MORE2() ? s[next + 1] : '\0'; break;
        case '-': throw new RegexError(REG_ERANGE);
        default: c = '\0';
        }
        switch (c) {
        case ':': { /* character class (p_b_cclass) */
            next += 2;
            REQUIRE(MORE(), REG_EBRACK);
            REQUIRE(!SEE('-') && !SEE(']'), REG_ECTYPE);
            const sp = next;
            while (MORE() && isalpha(PEEK())) next++;
            const fn = CCLASSES[s.slice(sp, next)];
            REQUIRE(Object.hasOwn(CCLASSES, s.slice(sp, next)), REG_ECTYPE);
            for (let i = 1; i < 256; i++) if (fn(i)) cs.add(i);
            REQUIRE(MORE(), REG_EBRACK);
            REQUIRE(EATTWO(':', ']'), REG_ECTYPE);
            break;
        }
        case '=': /* equivalence class (p_b_eclass) */
            next += 2;
            REQUIRE(MORE(), REG_EBRACK);
            REQUIRE(!SEE('-') && !SEE(']'), REG_ECOLLATE);
            cs.add(p_b_coll_elem('='));
            REQUIRE(MORE(), REG_EBRACK);
            REQUIRE(EATTWO('=', ']'), REG_ECOLLATE);
            break;
        default: { /* symbol, ordinary character, or range */
            const start = p_b_symbol();
            let finish = start;
            if (SEE('-') && MORE2() && s[next + 1] !== ']') {
                next++;
                finish = EAT('-') ? 45 : p_b_symbol();
            }
            REQUIRE(start <= finish, REG_ERANGE);
            for (let i = start; i <= finish; i++) cs.add(i);
            break;
        }
        }
    }

    /* regcomp.c p_bracket */
    function p_bracket() {
        /* Dept of Truly Sickening Special-Case Kludges */
        if (next + 5 < end && s.startsWith('[:<:]]', next)) {
            next += 6;
            return `(?<!${WORD})(?=${WORD})`; /* OBOW */
        }
        if (next + 5 < end && s.startsWith('[:>:]]', next)) {
            next += 6;
            return `(?<=${WORD})(?!${WORD})`; /* OEOW */
        }
        const cs = new Set();
        const invert = EAT('^');
        if (EAT(']')) cs.add(93);
        else if (EAT('-')) cs.add(45);
        while (MORE() && !SEE(']') && !SEETWO('-', ']')) p_b_term(cs);
        if (EAT('-')) cs.add(45);
        REQUIRE(EAT(']'), REG_EBRACK);
        const body = [...cs].sort((a, b) => a - b).map(lit).join('');
        return invert ? `[^${body}]` : (body ? `[${body}]` : '[]');
    }

    /* regcomp.c p_ere_exp: one atom and its (single) repetition */
    function p_ere_exp() {
        let atom, wascaret = false;
        const c = GETNEXT();
        switch (String.fromCharCode(c)) {
        case '(': {
            REQUIRE(MORE(), REG_EPAREN);
            const subno = ++nsub;
            atom = SEE(')') ? '' : p_ere(')');
            REQUIRE(EAT(')'), REG_EPAREN);
            closed.add(subno);
            /* capturing, so JS numbers groups by '(' exactly as nsub does */
            atom = `(${atom})`;
            break;
        }
        case '^': atom = '^'; wascaret = true; break;
        case '$': atom = '$'; break;
        case '|': throw new RegexError(REG_EMPTY);
        case '*': case '+': case '?': throw new RegexError(REG_BADRPT);
        case '.': atom = '[\\s\\S]'; break;
        case '[': atom = p_bracket(); break;
        case '\\':
            REQUIRE(MORE(), REG_EESCAPE);
            if (PEEK() >= 49 && PEEK() <= 57) { /* \1..\9: back reference */
                const i = GETNEXT() - 48;
                REQUIRE(closed.has(i), REG_ESUBREG);
                atom = `(?:\\${i})`;
                break;
            }
            atom = lit(GETNEXT());
            break;
        case '{': /* okay as ordinary except if digit follows */
            REQUIRE(!MORE() || !isdigit(PEEK()), REG_BADRPT);
            /* FALLTHROUGH */
        default: atom = lit(c); break;
        }

        if (!MORE()) return atom;
        let r = s[next];
        /* we call { a repetition if followed by a digit */
        if (!(r === '*' || r === '+' || r === '?' || (r === '{' && MORE2() && isdigit(PEEK2()))))
            return atom;
        next++;
        REQUIRE(!wascaret, REG_BADRPT);
        if (r === '{') {
            const count = p_count();
            let count2 = count;
            if (EAT(',')) count2 = (MORE() && isdigit(PEEK())) ? p_count() : Infinity;
            REQUIRE(count <= count2, REG_BADBR);
            if (!EAT('}')) { /* error heuristics */
                while (MORE() && !SEE('}')) next++;
                REQUIRE(MORE(), REG_EBRACE);
                throw new RegexError(REG_BADBR);
            }
            atom = `(?:${atom}){${count},${count2 === Infinity ? '' : count2}}`;
        } else {
            atom = `(?:${atom})${r}`;
        }

        if (!MORE()) return atom;
        r = s[next];
        if (!(r === '*' || r === '+' || r === '?' || (r === '{' && MORE2() && isdigit(PEEK2()))))
            return atom;
        throw new RegexError(REG_BADRPT);
    }

    /* regcomp.c p_ere: alternatives of nonempty concatenations */
    function p_ere(stop) {
        const alts = [];
        for (;;) {
            let conc = '';
            const here = next;
            while (MORE() && !SEE('|') && !SEE(stop)) conc += p_ere_exp();
            REQUIRE(next !== here, REG_EMPTY); /* require nonempty */
            alts.push(conc);
            if (!EAT('|')) break;
        }
        return alts.join('|');
    }

    return new RegExp(p_ere(null));
}

/* posixregex.c regex_error_desc: the explanation for a failed compile */
export function regex_error_desc(e) {
    if (!e) return 'no regexp';
    return (e instanceof RegexError) ? e.message : 'unspecified regexp error';
}
