// stackobj.js — stackobj() and placeFloorObject(): circular-dependency bridge
//
// In C, stackobj() lives in invent.c and place_object() lives in mkobj.c.
// Both functions are needed by modules throughout the codebase that sit
// between mkobj.c and invent.c in the dependency chain.  In JS, invent.js
// already imports weight/doname/etc. from mkobj.js, so if mkobj.js were
// to import stackobj() from invent.js we would get a cycle:
//
//   mkobj.js  →  invent.js  →  mkobj.js            ← cycle
//
// This file breaks that cycle by defining stackobj() and placeFloorObject()
// in a module that sits ABOVE both mkobj.js and invent.js:
//
//   stackobj.js  →  mkobj.js   (for place_object, weight, mergable)
//   invent.js    →  mkobj.js   (unchanged, not a cycle)
//   mkobj.js                   (does NOT import from stackobj.js)
//
// Note: mergable() lives in mkobj.js (not invent.js) to avoid the cycle:
//   stackobj.js → invent.js → monutil.js → stackobj.js
// See mkobj.js for the mergable() implementation and a comment explaining
// why it lives there instead of invent.js.
//
// IMPORTANT: Do NOT add a stackobj() implementation to invent.js.
//            See the comment there explaining why it lives here instead.
// IMPORTANT: mkobj.js must NOT import this module; call place_object()
//            directly and skip stackobj() where C does (e.g. mksobj_at).

import { place_object, weight, mergable } from './mkobj.js';
import { pushRngLogEntry } from './rng.js';

export { place_object };  // re-export so callers that imported place_object
                          // from floor_objects.js continue to work

// C ref: invent.c stackobj() — try to merge object into existing stack on floor.
// Canonical C location: invent.c.  Lives here instead to break the circular
// dependency described above.
//
// C behavior: the newly placed obj SURVIVES; the old otmp is merged away and
// removed.  This matches merged(&obj, &otmp) where obj (new) accumulates
// otmp's (old) quantity.
export function stackobj(obj, map) {
    if (!map || !map.objects) return;
    for (const otmp of map.objects) {
        if (otmp !== obj && otmp.ox === obj.ox && otmp.oy === obj.oy
            && !otmp.buried && !obj.buried && mergable(otmp, obj)) {
            // C ref: merged() — new obj survives, old otmp is extracted/removed
            obj.quan = (obj.quan || 1) + (otmp.quan || 1);
            obj.owt = weight(obj);
            // Remove otmp (old) from map — matches C obj_extract_self(obj) in merged()
            const idx = map.objects.indexOf(otmp);
            if (idx >= 0) map.objects.splice(idx, 1);
            pushRngLogEntry(`^remove[${otmp.otyp},${otmp.ox},${otmp.oy}]`);
            return;
        }
    }
}

// JS-only convenience wrapper (no C counterpart): place_object() + stackobj()
export function placeFloorObject(map, obj) {
    place_object(obj, obj.ox, obj.oy, map);
    stackobj(obj, map);
    return obj;
}
