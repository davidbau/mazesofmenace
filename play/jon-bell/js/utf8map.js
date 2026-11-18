// utf8map.js — C ref: utf8map.c.
import { game } from './gstate.js'; // relocate-fns
import { gs, BUFSZ } from './const.js';
import { glyphmap, apply_customizations, find_matching_customization } from './glyphs.js';
import { decode_glyph } from './windows.js';
import { map_glyphinfo } from './display.js';
import { primary_showsym } from './symbols.js';

const HEXDD = '00112233445566778899aAbBcCdDeEfF';
const NUM_GRAPHICS = 2;
const custom_ureps = 2;
const custom_count = 4;
const utf8Encoder = new TextEncoder();

/* C utf8map.c:18-34 unicode_val — parse U+XXXX (up to 7 hex digits). */
export function unicode_val(cp) {
    if (typeof cp !== 'string' || !cp) return 0;
    let cval = 0, dcount = 0;
    if ((cp[0] === 'U' || cp[0] === 'u') && cp[1] === '+' && cp[2]) {
        let idx = 2;
        let dp = HEXDD.indexOf(cp[idx]);
        if (dp !== -1) {
            do {
                cval = ((cval * 16) + ((dp / 2) | 0)) | 0;
                idx++;
                if (idx >= cp.length) break;
                dp = HEXDD.indexOf(cp[idx]);
            } while (dp !== -1 && ++dcount < 7);
        }
    }
    return cval;
}

/* C utf8map.c:37-56 set_map_u — copy the UTF-32 and UTF-8 replacement fields. */
export function set_map_u(gm, utf32ch, utf8str) {
    if (!gm || !(utf32ch >>> 0)) return 0;
    gm.u = gm.u || {};
    gm.u.utf32ch = utf32ch | 0;
    gm.u.utf8str = String(utf8str ?? '');
    return 1;
}

/* C utf8map.c:59-80 free_all_glyphmap_u — clear glyphmap[].u and cached gg.gbuf pointers. */
export function free_all_glyphmap_u() {
    for (const gm of glyphmap) gm.u = null;
    for (const row of game.gg?.gbuf ?? [])
        for (const cell of row ?? [])
            if (cell?.glyphinfo?.gm) cell.glyphinfo.gm.u = null;
}

/* C utf8map.c:86-145 mixed_to_utf8 — expand \GXXXXNNNN to UTF-8 bytes or showsyms[so]. */
export function mixed_to_utf8(str, bufsz = BUFSZ, retflags = null) {
    if (str == null) return '';
    const limit = Math.max(0, (bufsz | 0) - 1);
    const s = String(str);
    let out = '';
    let i = 0;
    while (i < s.length && out.length < limit) {
        if (s[i] === '\\') {
            const saveIdx = i++;
            const ch = s[i];
            if (ch === 'G') {
                const ggv = { val: 0 };
                const dcount = decode_glyph(s.slice(i + 1), ggv);
                if (dcount) {
                    i += dcount + 1;
                    const glyphinfo = {};
                    map_glyphinfo(0, 0, ggv.val, 0, glyphinfo);
                    const u8str = glyphinfo.gm?.u?.utf8str;
                    if (u8str) {
                        const bytes = utf8Encoder.encode(u8str);
                        for (let bi = 0; bi < bytes.length && out.length < limit; bi++)
                            out += String.fromCharCode(bytes[bi]);
                        if (retflags) retflags.value = 1;
                    } else {
                        const so = glyphinfo.gm?.sym?.symidx ?? 0;
                        const sym = (game.gs?.showsyms ?? gs.showsyms)?.[so] ?? primary_showsym(so);
                        const byte = typeof sym === 'number' ? (sym & 0xff) : (sym ? sym.charCodeAt(0) & 0xff : 0);
                        out += String.fromCharCode(byte);
                        if (retflags) retflags.value = 0;
                    }
                    continue;
                }
                i = saveIdx;
            } else if (ch === '\\') {
                /* fall through: copies second '\\' */
            } else if (ch === undefined || ch === '\0') {
                i = saveIdx;
            }
        }
        if (out.length < limit)
            out += s[i++];
    }
    return out;
}

/* C utf8map.c:148-207 add_custom_urep_entry — update or append a custom_ureps entry. */
export function add_custom_urep_entry(customization_name, glyphidx, utf32ch, utf8str, which_set) {
    gs.sym_customizations ||= Array.from({ length: NUM_GRAPHICS + 1 }, () =>
        Array.from({ length: custom_count }, () => ({
            customization_name: null, count: 0, custtype: 0, details: null, details_end: null,
        })));
    const gdc = gs.sym_customizations[which_set][custom_ureps];
    if (!gdc.details) {
        gdc.customization_name = customization_name;
        gdc.custtype = custom_ureps;
        gdc.details = null;
        gdc.details_end = null;
    }
    let details = find_matching_customization(customization_name, custom_ureps, which_set);
    while (details) {
        if (details.content.urep.glyphidx === glyphidx) {
            if (utf32ch >>> 0) {
                details.content.urep.u = {
                    utf32ch: utf32ch | 0,
                    utf8str: String(utf8str ?? ''),
                };
            } else {
                details.content.urep.u = { utf32ch: 0, utf8str: null };
            }
            return 1;
        }
        details = details.next;
    }
    const u8 = utf8str && String(utf8str).length ? String(utf8str) : null;
    const newdetails = {
        content: {
            urep: {
                glyphidx,
                u: { utf32ch: utf32ch | 0, utf8str: u8 },
            },
        },
        next: null,
    };
    if (gdc.details == null) {
        gdc.details = newdetails;
    } else {
        gdc.details_end.next = newdetails;
    }
    gdc.details_end = newdetails;
    gdc.count++;
    return 1;
}

/* C utf8map.c:211-217 reset_customsymbols — free_all_glyphmap_u() then
 * apply_customizations(gc.currentgraphics, do_custom_symbols). */
export function reset_customsymbols() {
    game._gm_customsymbols = game.iflags.customsymbols !== false;
    free_all_glyphmap_u();
    apply_customizations(game.gc?.currentgraphics ?? 0, 2);
}
