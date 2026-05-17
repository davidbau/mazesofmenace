// discover_scroll.js — Scroll type discovery (invent.c makeknown / discover_object for SCROLL_CLASS).
// C ref: invent.c makeknown(), discover_object(); read.c learnscrolltyp/learnscroll; do.c trycall; objnam.c xname scroll branch.

import { moreExperiencedHeroLikeC } from './exper_pluslvl.js';
import { NH5_SPBOOK_CLASS } from './nh5_objclass.js';

/**
 * C: invent.c makeknown / discover_object — record scroll otyp as fully named for doname / xnameBurnFloor.
 * @param {object} g
 * @param {number} otyp
 */
export function discoverScrollOtyp(g, otyp) {
    if (!g) return;
    if (!(g.scrollDiscovery instanceof Set)) g.scrollDiscovery = new Set();
    g.scrollDiscovery.add(otyp | 0);
}

/**
 * C: read.c **`learnscrolltyp(scrolltyp)`** — **`makeknown`** + **`more_experienced(0, 10)`** when type not yet known.
 * @param {object} g
 * @param {number} scrolltyp
 * @returns {boolean} true if newly learned (**C return TRUE**)
 */
export function learnscrolltypHeroLikeC(g, scrolltyp) {
    if (!g) return false;
    const t = scrolltyp | 0;
    if (g.scrollDiscovery instanceof Set && g.scrollDiscovery.has(t)) return false;
    discoverScrollOtyp(g, t);
    moreExperiencedHeroLikeC(g, 0, 10);
    return true;
}

/**
 * C: read.c **`learnscroll(sobj)`** — **`dknown`** implied by caller; skips spellbooks.
 * @param {object} g
 * @param {{ otyp?: number, oclass?: number }} sobj
 */
export function learnscrollHeroLikeC(g, sobj) {
    if (!g || !sobj) return;
    if ((sobj.oclass | 0) === NH5_SPBOOK_CLASS) return;
    learnscrolltypHeroLikeC(g, sobj.otyp | 0);
}

/**
 * C: do.c **`trycall(obj)`** — **`if (!objects[otyp].oc_name_known && !objects[otyp].oc_uname) docall(obj);`**
 * (**`#name`**-style “call this type something” when neither formally known nor informally named).
 * JS has no global **`objects[]`** / **`oc_uname`**; **`docall`** TTY flow not ported — no-op for now.
 * @param {object} g
 * @param {{ otyp?: number, oclass?: number }} sobj
 */
export function trycallHeroLikeC(g, sobj) {
    if (!g || !sobj) return;
    const t = sobj.otyp | 0;
    if (g.scrollDiscovery instanceof Set && g.scrollDiscovery.has(t)) return;
    /* C: would **`docall(sobj)`** when **`!objects[t].oc_uname`** */
}
