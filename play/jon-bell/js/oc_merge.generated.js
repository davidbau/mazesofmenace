// @ts-nocheck
// oc_merge.generated.js — objects[otyp].oc_merge, extracted from C.
//
// C ref: nethack-c-v5/upstream/include/objects.h — the `mrg` column of the
// BITS(nmkn,mrg,uskn,...) macro (objects.h:42), as compiled into objects[] by
// objects_globals_init() (objects.c:32).  It is a PER-OTYP flag, not a class
// property: ARROW (18) and every other stackable weapon have it, MACE (73)
// does not, and CORPSE (265) does.
//
// the scored binary's, not a transcription:
// with probe.c calling objects_globals_init() and printing
// objects[i].oc_merge for i in 0..NUM_OBJECTS.
//
// on an OCLASS SET {FOOD, POTION, SCROLL, COIN, GEM}.  That is wrong in both
// directions -- it excludes the 20 stackable WEAPON_CLASS otyps (arrows, darts,
// daggers, shuriken, ...) and it includes every non-mergeable member of the
// the hero's square and C stacks them into one `18 q3` while this port kept
// three separate objects -- an object-count difference that survives into the
// BONES FILE and shows up as segment 9's bones load drawing one extra
// `rnd(2) @next_ident(mkobj.c:521)`.
export const OC_MERGE = Uint8Array.from([0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,1,1]);
/** C invent.c:4390 `!objects[obj->otyp].oc_merge` */
export function oc_merge(otyp) {
    const t = otyp | 0;
    return t >= 0 && t < OC_MERGE.length ? OC_MERGE[t] === 1 : false;
}
