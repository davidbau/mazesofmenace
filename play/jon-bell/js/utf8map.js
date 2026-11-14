// utf8map.js — C ref: utf8map.c.
import { game } from './gstate.js'; // relocate-fns
import { apply_pending_s_utf8 } from './symbols.js'; // relocate-fns

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
    if (game._gm_customsymbols) apply_pending_s_utf8();
}
