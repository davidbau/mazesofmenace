// utf8map.js — C ref: utf8map.c.

/* C utf8map.c: set_map_u — copy the UTF-32 and UTF-8 replacement fields. */
export function set_map_u(gm, utf32ch, utf8str) {
    if (!gm) return;
    gm.u = gm.u || {};
    gm.u.utf32ch = utf32ch | 0;
    gm.u.utf8str = String(utf8str ?? '');
}
