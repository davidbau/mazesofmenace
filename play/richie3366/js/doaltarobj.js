// doaltarobj.js — do.c doaltarobj() subset (hero + flooreffects).
// C ref: do.c doaltarobj()

import { pline } from './display.js';
import { doname } from './objnam.js';
import { NH5_COIN_CLASS } from './nh5_objclass.js';

function heroBlindLikeC(g) {
    const u = g.u;
    if (!u) return true;
    return !!(u.ublind | 0) || (u.timed?.blind ?? 0) > 0;
}

function heroHalluLikeC(g) {
    const u = g.u;
    return !!((u?.Hallucination | 0) || (u?.timed?.hallucination ?? 0) > 0);
}

/**
 * C: **`do.c`** **`doaltarobj`** — **`Blind`** early-out; **`COIN_CLASS`** bless/curse strip;
 * flash vs land; **`bknown`** on flash only when **`!Hallucination`** (C **`set_bknown`** bypass).
 * @param {import('./gstate.js').game} g
 * @param {object} obj
 */
export async function doaltarobjLikeC(g, obj) {
    const u = g.u;
    if (!u || !obj) return;
    if (heroBlindLikeC(g)) return;

    if ((obj.oclass | 0) !== NH5_COIN_CLASS) {
        /* C: livelog gnostic conduct — omitted */
    } else {
        obj.blessed = 0;
        obj.cursed = 0;
    }

    const hallu = heroHalluLikeC(g);

    if ((obj.blessed | 0) || (obj.cursed | 0)) {
        const art = obj.blessed ? 'an amber' : 'a black';
        await pline(`There is ${art} flash as ${doname(obj, g)} hits the altar.`);
        if (!hallu) obj.bknown = 1;
    } else {
        const landVerb = (obj.quan | 0) > 1 ? 'land' : 'lands';
        await pline(`${doname(obj, g)} ${landVerb} on the altar.`);
        if ((obj.oclass | 0) !== NH5_COIN_CLASS) obj.bknown = 1;
    }
}
