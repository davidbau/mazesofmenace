// sp_levchn.js — Special dungeon level chain (s_level list).
// C ref: dungeon.c add_level(), Is_special(); include/dungeon.h struct s_level

import { onLevelLikeC } from './hacklib.js';

/**
 * C: dungeon.c add_level(s_level *new_lev) — insert in level order within same **`dnum`**.
 * @param {import('./gstate.js').game} g
 * @param {{ next?: object|null, dlevel: { dnum?: number, dlevel?: number } }} newLev — mutates **`next`**
 */
export function addSpLevchnLevelOrderedLikeC(g, newLev) {
    let prev = null;
    let curr = g.sp_levchn;
    while (curr) {
        if ((curr.dlevel.dnum | 0) === (newLev.dlevel.dnum | 0)
            && (curr.dlevel.dlevel | 0) > (newLev.dlevel.dlevel | 0)) {
            break;
        }
        prev = curr;
        curr = curr.next;
    }
    if (!prev) {
        newLev.next = g.sp_levchn ?? null;
        g.sp_levchn = newLev;
    } else {
        newLev.next = curr;
        prev.next = newLev;
    }
}

/**
 * C: dungeon.c Is_special(d_level *lev)
 * @param {import('./gstate.js').game} g
 * @param {{ dnum?: number, dlevel?: number }} uz
 * @returns {object|null}
 */
export function isSpecialAtUzLikeC(g, uz) {
    for (let sp = g.sp_levchn; sp; sp = sp.next) {
        if (sp.dlevel && onLevelLikeC(uz, sp.dlevel)) return sp;
    }
    return null;
}

/** C: dungeon.c Is_special(&game.u.uz) — convenience for callers holding only **`g`**. */
export function isSpecialHeroUzLikeC(g) {
    return isSpecialAtUzLikeC(g, g.u?.uz);
}

/**
 * C: dungeon.c **`find_level(const char *s)`** — walk **`svs.sp_levchn`**, **`strcmpi(s, curr->proto)`**.
 * JS: case-fold ASCII **`proto`** (same result as **`strcmpi`** for NH special names like **`tut-1`**).
 * @param {import('./gstate.js').game} g
 * @param {string} s
 * @returns {object|null}
 */
export function findLevelByProtoLikeC(g, s) {
    const needle = String(s ?? '').toLowerCase();
    if (!needle) return null;
    for (let sp = g.sp_levchn; sp; sp = sp.next) {
        const hay = sp?.proto != null ? String(sp.proto).toLowerCase() : '';
        if (hay === needle) return sp;
    }
    return null;
}

/**
 * C: dungeon.lua Gnomish Mines **`minetn`** (`flags = "town"`) once **`place_level`**
 * has fixed **`dlevel.dlevel`** within the mines branch.
 * Contest **`allmain`** stub uses **`num_dunlevs === 1`** mines — **no** minetn coordinate
 * is derivable without **`dungeon.c`** placement, so this is a **no-op** until **`g.dungeons[md].num_dunlevs >= 3`**.
 * @param {import('./gstate.js').game} g
 */
export function bootstrapSpLevchnMinesMinetnFromBranchStubLikeC(g) {
    for (const br of g.branches || []) {
        const e1 = br.end1;
        const e2 = br.end2;
        if (!e1 || !e2) continue;
        if ((e1.dnum | 0) !== 0 || (e1.dlevel | 0) !== 1) continue;
        const md = e2.dnum | 0;
        const nl = g.dungeons?.[md]?.num_dunlevs | 0;
        if (nl < 3) return;
        const minetnDlevel = 3; /* C: dungeon.lua minetn base=3 (within mines); full range TODO */
        addSpLevchnLevelOrderedLikeC(g, {
            next: null,
            dlevel: { dnum: md, dlevel: minetnDlevel },
            flags: { town: 1 },
            proto: 'minetn',
            boneid: 'T',
            rndlevs: 7,
        });
        return;
    }
}
