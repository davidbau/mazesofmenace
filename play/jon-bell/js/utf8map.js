// utf8map.js — C ref: utf8map.c.
import { game } from './gstate.js'; // relocate-fns
import { glyphmap, apply_customizations } from './glyphs.js';

/* C utf8map.c: set_map_u — copy the UTF-32 and UTF-8 replacement fields. */
export function set_map_u(gm, utf32ch, utf8str) {
    if (!gm) return;
    gm.u = gm.u || {};
    gm.u.utf32ch = utf32ch | 0;
    gm.u.utf8str = String(utf8str ?? '');
}

/* C utf8map.c reset_customsymbols(): free_all_glyphmap_u() then
 * apply_customizations(gc.currentgraphics, do_custom_symbols). The symbol
 * loader retains the Unicode definitions; display applies this enabled state
 * when resolving them instead of allocating per-glyph u entries. */
export function reset_customsymbols() {
    game._gm_customsymbols = game.iflags.customsymbols !== false;
    free_all_glyphmap_u();
    apply_customizations(game.gc?.currentgraphics ?? 0, 2);
}

/* C utf8map.c:53-77 also clears the cached glyphinfo pointers. */
export function free_all_glyphmap_u() {
    for (const gm of glyphmap) gm.u = null;
    for (const row of game.gg?.gbuf ?? [])
        for (const cell of row ?? [])
            if (cell?.glyphinfo?.gm) cell.glyphinfo.gm.u = null;
}
