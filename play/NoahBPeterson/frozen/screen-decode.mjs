// screen-decode.mjs — Reverse of frozen/terminal.js Terminal.serialize().
// Parses the canonical session screen string into a 24×80 grid of
// {ch, color, attr} cells, matching the shape Terminal.grid uses.
//
// Wire format (see contest/template/frozen/terminal.js:632-702):
//   - '\n' → next row, col=0
//   - ESC[Nm   → SGR transitions: 0 reset, 1 bold, 4 underline, 7 inverse,
//                39 default fg, 30..37 fg dim, 90..97 fg bright
//   - ESC[NC   → cursor forward N columns
//   - 0x0e (SO) / 0x0f (SI) → DEC graphics on/off (we set decgfx flag)
//   - other printable bytes → place at cursor, advance col
//
// The recorder also supplies a `cursor` field per step ([col, row, vis]);
// the screen string itself doesn't carry the final cursor position, so
// we read that from the step object directly.

const ROWS = 24;
const COLS = 80;
const DEFAULT_COLOR = 8; // NO_COLOR / default

export function decodeScreen(s) {
    const grid = makeBlankGrid();
    if (!s) return grid;

    let row = 0, col = 0;
    let curFg = DEFAULT_COLOR;
    let curAttr = 0;
    let decgfx = 0;
    const len = s.length;
    let i = 0;

    while (i < len) {
        const c = s[i];

        if (c === '\n') { row += 1; col = 0; i += 1; continue; }
        if (c === '\x0e') { decgfx = 1; i += 1; continue; }
        if (c === '\x0f') { decgfx = 0; i += 1; continue; }

        if (c === '\x1b' && s[i + 1] === '[') {
            // CSI ... final-byte
            let j = i + 2;
            while (j < len && /[0-9;?]/.test(s[j])) j += 1;
            const params = s.slice(i + 2, j);
            const final = s[j];
            i = j + 1;
            if (final === 'C') {
                col += parseInt(params, 10) || 1;
            } else if (final === 'm') {
                applySGR(params, (next) => {
                    curFg = next.fg;
                    curAttr = next.attr;
                }, { curFg, curAttr });
                ({ fg: curFg, attr: curAttr } = sgrApply(params, curFg, curAttr));
            }
            continue;
        }

        // Plain character — write at cursor.
        if (row >= 0 && row < ROWS && col >= 0 && col < COLS) {
            grid[row][col] = {
                ch: c,
                color: curFg,
                attr: curAttr,
                decgfx,
            };
        }
        col += 1;
        i += 1;
    }
    return grid;
}

// Compute the (fg, attr) state after applying an SGR parameter list.
function sgrApply(params, fg, attr) {
    if (params === '') params = '0';
    for (const tok of params.split(';')) {
        const n = parseInt(tok || '0', 10);
        if (n === 0) { fg = DEFAULT_COLOR; attr = 0; }
        else if (n === 1) attr |= 2;
        else if (n === 4) attr |= 4;
        else if (n === 7) attr |= 1;
        else if (n === 22) attr &= ~2;
        else if (n === 24) attr &= ~4;
        else if (n === 27) attr &= ~1;
        else if (n === 39) fg = DEFAULT_COLOR;
        else if (n >= 30 && n <= 37) fg = n - 30;
        else if (n >= 90 && n <= 97) fg = (n - 90) + 8;
    }
    return { fg, attr };
}

function applySGR(_params, _setter, _state) {
    /* legacy hook — kept callable for potential future logging, no-op. */
}

export function makeBlankGrid() {
    const g = [];
    for (let r = 0; r < ROWS; r++) {
        const row = [];
        for (let c = 0; c < COLS; c++) {
            row.push({ ch: ' ', color: DEFAULT_COLOR, attr: 0, decgfx: 0 });
        }
        g.push(row);
    }
    return g;
}

export const ROWS_24 = ROWS;
export const COLS_80 = COLS;

// ANSI color index → CSS color, mirroring frozen/terminal.js colorToCss.
// 0..7 = dim, 8..15 = bright. NO_COLOR (8) renders as default fg.
const COLORS = [
    '#000000', '#cd0000', '#00cd00', '#cdcd00',
    '#0000ee', '#cd00cd', '#00cdcd', '#e5e5e5',
    '#7f7f7f', '#ff0000', '#00ff00', '#ffff00',
    '#5c5cff', '#ff00ff', '#00ffff', '#ffffff',
];
export function colorToCss(idx) {
    if (idx === DEFAULT_COLOR || idx == null) return '#c0c0c0';
    if (idx < 0 || idx > 15) return '#c0c0c0';
    return COLORS[idx];
}

// DEC line-drawing graphics: when decgfx=1, ASCII letters map to box chars.
// Same mapping the recorder relies on.
const DEC_MAP = {
    'l': '\u250c', 'q': '\u2500', 'k': '\u2510',
    'x': '\u2502', 'm': '\u2514', 'j': '\u2518',
    't': '\u251c', 'u': '\u2524', 'w': '\u252c',
    'v': '\u2534', 'n': '\u253c', 'a': '\u2592',
    '~': '\u00b7',
};
export function renderCell(cell) {
    if (cell.decgfx && DEC_MAP[cell.ch]) return DEC_MAP[cell.ch];
    return cell.ch;
}

// Bits of `attr` that are visually observable on a space character.
// Bold has no visible effect on a glyphless cell. Inverse-video paints
// the background using the foreground color, and underline draws a
// rule across the cell — both visible on a space. (See sgrApply for
// the bit assignment: 0x1 inverse, 0x2 bold, 0x4 underline.)
const SPACE_VISIBLE_ATTRS = 0x1 | 0x4;

// Reduce a cell to the attributes/colors that are visually observable.
// For a space without inverse/underline, neither attr nor color produce
// any pixels, so we treat all such cells as equivalent. The contest
// comparator does strict SGR-state compare and would flag these — the
// viewer chooses to suppress them so the user isn't distracted by
// invisible differences.
function observableState(cell) {
    if (renderCell(cell) === ' ') {
        const visAttr = cell.attr & SPACE_VISIBLE_ATTRS;
        // Foreground color only paints something on a space when an
        // attribute that uses it (inverse / underline) is set.
        const visColor = visAttr ? cell.color : null;
        return { attr: visAttr, color: visColor };
    }
    return { attr: cell.attr, color: cell.color };
}

// Compare two cells. Returns null if identical, otherwise an object describing
// the kind of difference (ch / attr).
export function diffCell(a, b) {
    const aCh = renderCell(a);
    const bCh = renderCell(b);
    if (aCh !== bCh) return 'ch';
    const va = observableState(a), vb = observableState(b);
    if (va.color !== vb.color || va.attr !== vb.attr) return 'attr';
    return null;
}
