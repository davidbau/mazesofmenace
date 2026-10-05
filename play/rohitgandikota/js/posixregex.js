// posixregex.js — regular expression support for MENUCOLOR, MSGTYPE and
// autopickup-exception patterns.
// C ref: sys/share/posixregex.c, which hands the pattern to the C library's
// regcomp(REG_EXTENDED | REG_NOSUB) and regexec(). There is no libc here, so
// regex_compile() validates the POSIX extended regular expression the way
// the recorder's libc does (its error codes and regerror() strings, checked
// against macOS libc) and translates it into a JS RegExp. Matching only asks
// whether any match exists, where a backtracking engine and POSIX
// leftmost-longest agree.

export const regex_id = 'posixregex';

/* <regex.h> error codes, with the regerror() text for each */
const REG_ECTYPE = 4, REG_EESCAPE = 5, REG_EBRACK = 7, REG_EPAREN = 8,
      REG_EBRACE = 9, REG_BADBR = 10, REG_ERANGE = 11, REG_BADRPT = 13,
      REG_EMPTY = 14, REG_ESIZE = 18;
const regerror_text = {
    [REG_ECTYPE]: 'invalid character class',
    [REG_EESCAPE]: 'trailing backslash (\\)',
    [REG_EBRACK]: 'brackets ([ ]) not balanced',
    [REG_EPAREN]: 'parentheses not balanced',
    [REG_EBRACE]: 'braces not balanced',
    [REG_BADBR]: 'invalid repetition count(s)',
    [REG_ERANGE]: 'invalid character range',
    [REG_BADRPT]: 'repetition-operator operand invalid',
    [REG_EMPTY]: 'empty (sub)expression',
    [REG_ESIZE]: 'maximum repetition exceeds 255',
};
const DUP_MAX = 255;

class RegexError extends Error {
    constructor(code) { super(regerror_text[code]); this.code = code; }
}

/* [:class:] bracket expression classes, as JS character class bodies */
const char_classes = {
    alpha: 'a-zA-Z', digit: '0-9', alnum: 'a-zA-Z0-9', upper: 'A-Z',
    lower: 'a-z', space: ' \\t\\n\\r\\f\\v', blank: ' \\t',
    punct: '!-\\/:-@\\[-`{-~', print: ' -~', graph: '!-~',
    cntrl: '\\x00-\\x1f\\x7f', xdigit: '0-9A-Fa-f',
};

const js_escape = (ch) => /[\\^$.*+?()[\]{}|]/.test(ch) ? '\\' + ch : ch;
const js_class_escape = (ch) => /[\\\]\[^-]/.test(ch) ? '\\' + ch : ch;

/* regcomp(REG_EXTENDED): parse the pattern, raising the error the C
   library reports, and build the equivalent JS RegExp */
function ere_to_js(pat) {
    let i = 0;
    const more = () => i < pat.length;
    const peek = (k = 0) => pat[i + k];
    const isdigit = (c) => c !== undefined && c >= '0' && c <= '9';
    const is_rep_start = () => more() && ('*+?'.includes(peek())
                                          || (peek() === '{' && isdigit(peek(1))));

    /* a bracket expression; the '[' has been consumed */
    function bracket() {
        let out = '[';
        if (peek() === '^') {
            out += '^';
            i++;
        }
        let first = true;
        for (;;) {
            if (!more())
                throw new RegexError(REG_EBRACK);
            const c = pat[i++];
            if (c === ']' && !first) {
                out += ']';
                return out;
            }
            first = false;
            let lo = c;
            if (c === '[' && more() && ':.='.includes(peek())) {
                const kind = pat[i++];
                const end = pat.indexOf(kind + ']', i);
                if (end < 0)
                    throw new RegexError(REG_EBRACK);
                const name = pat.slice(i, end);
                i = end + 2;
                if (kind === ':') {
                    if (!(name in char_classes))
                        throw new RegexError(REG_ECTYPE);
                    out += char_classes[name];
                    continue;
                }
                lo = name; /* collating element or equivalence class */
            }
            if (peek() === '-' && peek(1) !== undefined && peek(1) !== ']') {
                i++;
                let hi = pat[i++];
                if (hi === '[' && more() && '.='.includes(peek())) {
                    const kind = pat[i++];
                    const end = pat.indexOf(kind + ']', i);
                    if (end < 0)
                        throw new RegexError(REG_EBRACK);
                    hi = pat.slice(i, end);
                    i = end + 2;
                }
                if (hi < lo)
                    throw new RegexError(REG_ERANGE);
                out += js_class_escape(lo) + '-' + js_class_escape(hi);
            } else {
                out += [...lo].map(js_class_escape).join('');
            }
        }
    }

    /* an interval; the '{' has been consumed and a digit follows */
    function interval() {
        let m = '', n = null;
        while (isdigit(peek()))
            m += pat[i++];
        if (peek() === ',') {
            i++;
            n = '';
            while (isdigit(peek()))
                n += pat[i++];
        }
        if (peek() === ',')
            throw new RegexError(REG_BADBR);
        if (peek() !== '}')
            throw new RegexError(REG_EBRACE);
        i++;
        const mi = +m, ni = (n === null) ? mi : (n === '') ? Infinity : +n;
        if (mi > DUP_MAX || (ni !== Infinity && ni > DUP_MAX))
            throw new RegexError(REG_ESIZE);
        if (ni < mi)
            throw new RegexError(REG_BADBR);
        return (n === null) ? `{${m}}` : (n === '') ? `{${m},}` : `{${m},${n}}`;
    }

    /* one branch: items up to '|', the group's ')' or the end */
    function branch(in_group) {
        let out = '', nitems = 0;
        while (more() && peek() !== '|' && !(in_group && peek() === ')')) {
            const c = pat[i++];
            let atom;
            if (c === '(') {
                if (peek() === ')') {
                    i++;
                    atom = '()'; /* empty parens are allowed */
                } else {
                    atom = '(' + alternation(true) + ')';
                    i++; /* the ')' alternation() stopped at */
                }
            } else if (c === '^' || c === '$') {
                if (is_rep_start())
                    throw new RegexError(REG_BADRPT);
                out += c;
                nitems++;
                continue;
            } else if ('*+?'.includes(c) || (c === '{' && isdigit(peek()))) {
                throw new RegexError(REG_BADRPT); /* nothing to repeat */
            } else if (c === '[') {
                atom = bracket();
            } else if (c === '\\') {
                if (!more())
                    throw new RegexError(REG_EESCAPE);
                const d = pat[i++];
                atom = (d >= '1' && d <= '9') ? '\\' + d : js_escape(d);
            } else if (c === '.') {
                atom = '.';
            } else {
                atom = js_escape(c);
            }
            /* one repetition operator may follow an atom; another right
               after it is a repetition of a repetition */
            if (is_rep_start()) {
                const r = pat[i++];
                atom += (r === '{') ? interval() : r;
                if (is_rep_start())
                    throw new RegexError(REG_BADRPT);
            }
            out += atom;
            nitems++;
        }
        if (nitems === 0) {
            if (in_group && !more())
                throw new RegexError(REG_EPAREN);
            throw new RegexError(REG_EMPTY);
        }
        return out;
    }

    function alternation(in_group) {
        let out = branch(in_group);
        while (more() && peek() === '|') {
            i++;
            out += '|' + branch(in_group);
        }
        if (in_group && !more())
            throw new RegexError(REG_EPAREN);
        return out;
    }

    return new RegExp(alternation(false), 's');
}

// sys/share/posixregex.c:19 regex_init()
export function regex_init() {
    return { re: null, err: 0 };
}

// sys/share/posixregex.c:25 regex_compile()
export function regex_compile(s, re) {
    if (!re)
        return false;
    try {
        re.re = ere_to_js(String(s));
        re.err = 0;
    } catch (e) {
        if (!(e instanceof RegexError))
            throw e;
        re.err = e.code;
        return false;
    }
    return true;
}

// sys/share/posixregex.c:36 regex_error_desc() — the C fills errbuf; the
// text is returned here
export function regex_error_desc(re) {
    if (!re)
        return 'no regexp';
    if (!re.err)
        return 'no explanation';
    return regerror_text[re.err] || 'unspecified regexp error';
}

// sys/share/posixregex.c:54 regex_match()
export function regex_match(s, re) {
    if (!re || s == null || !re.re)
        return false;
    return re.re.test(String(s));
}

// sys/share/posixregex.c:70 regex_free()
export function regex_free(re) {
    if (re)
        re.re = null;
}
