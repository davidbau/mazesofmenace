// temp_glyph.js -- Shared transient glyph decoding for tmp_at overlays.
// C ref: display.c show_glyph()/mapglyph pipeline; JS passes either
// { ch, color } cells or numeric values from various call sites.

import { objectData } from './objects.js';
import { def_monsyms, defsyms } from './symbols.js';

const CLR_GRAY = 7;
const CLR_WHITE = 15;

export function tempGlyphToCell(glyph) {
    if (glyph && typeof glyph === 'object') {
        const ch = typeof glyph.ch === 'string' && glyph.ch.length > 0 ? glyph.ch[0] : '*';
        const color = Number.isInteger(glyph.color) ? glyph.color : CLR_WHITE;
        const attr = Number.isInteger(glyph.attr) ? glyph.attr : 0;
        return { ch, color, attr };
    }

    if (typeof glyph === 'string' && glyph.length > 0) {
        return { ch: glyph[0], color: CLR_WHITE, attr: 0 };
    }

    if (Number.isInteger(glyph)) {
        // Some call sites pass raw printable codepoints.
        if (glyph >= 32 && glyph <= 126) {
            return { ch: String.fromCharCode(glyph), color: CLR_WHITE, attr: 0 };
        }
        // Some call sites use object index-like values.
        if (glyph >= 0 && glyph < objectData.length) {
            const obj = objectData[glyph] || {};
            if (typeof obj.symbol === 'string' && obj.symbol.length > 0) {
                return {
                    ch: obj.symbol[0],
                    color: Number.isInteger(obj.color) ? obj.color : CLR_WHITE,
                    attr: 0,
                };
            }
        }
        // Symbol-table fallback for terrain/monster-style indices.
        if (glyph >= 0 && glyph < defsyms.length) {
            const sym = defsyms[glyph];
            if (sym && typeof sym.sym === 'string' && sym.sym.length > 0) {
                return { ch: sym.sym[0], color: CLR_GRAY, attr: 0 };
            }
        }
        if (glyph >= 0 && glyph < def_monsyms.length) {
            const sym = def_monsyms[glyph];
            if (sym && typeof sym.sym === 'string' && sym.sym.length > 0) {
                return { ch: sym.sym[0], color: CLR_WHITE, attr: 0 };
            }
        }
    }

    return { ch: '*', color: CLR_WHITE, attr: 0 };
}
