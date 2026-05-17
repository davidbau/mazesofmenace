// discover_wand.js — Wand type discovery (invent.c makeknown / discover_object for WAND_CLASS).
// C ref: invent.c `#define makeknown(x) discover_object((x), TRUE, TRUE, TRUE)`; objnam.c wand branch.

/** C: `objects.h` `WAND` … `WAN_LIGHTNING` — NH **5.0.0** `objects_nums` **409..433**. */
const OTYP_WAND_FIRST = 409;
const OTYP_WAND_LAST = 433;

/**
 * C: invent.c `makeknown` / `discover_object` — record wand `otyp` as type-known for doname / xnameBurnFloor.
 * @param {object} g
 * @param {number} otyp
 */
export function discoverWandOtyp(g, otyp) {
    if (!g) return;
    const t = otyp | 0;
    if (t < OTYP_WAND_FIRST || t > OTYP_WAND_LAST) return;
    if (!(g.wandDiscovery instanceof Set)) g.wandDiscovery = new Set();
    g.wandDiscovery.add(t);
}
