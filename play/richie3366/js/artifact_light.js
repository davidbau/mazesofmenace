// artifact_light.js — C artifact.c artifact_light() for lit-artifact checks.
// C ref: artifact.c artifact_light(); objects.h OBJECTS_ENUM otyp indices (NH 5.0).

import { W_ARM } from './const.js';

/** C: objects.h `OBJECTS_ENUM` (NH 5.0 upstream). */
const OTYP_GOLD_DRAGON_SCALE_MAIL = 103;
const OTYP_GOLD_DRAGON_SCALES = 113;

/** C: artilist.h — **`ART_SUNSWORD`** (**`oartifact`** index; dummy **#0**). */
const ART_SUNSWORD = 20;

/**
 * C: artifact.c **`artifact_light(struct obj *obj)`** — gold dragon suit worn as
 * armor (**`W_ARM`**) or **Sunsword** (**`is_art`** / valid **`oartifact`**).
 * @param {Record<string, unknown>|null|undefined} obj
 */
export function artifactLightObjLikeC(obj) {
    if (!obj) return false;
    const otyp = obj.otyp | 0;
    const wmask = obj.owornmask | 0;
    if (
        (otyp === OTYP_GOLD_DRAGON_SCALE_MAIL || otyp === OTYP_GOLD_DRAGON_SCALES)
        && (wmask & W_ARM) !== 0
    ) {
        return true;
    }
    return (obj.oartifact | 0) === ART_SUNSWORD;
}
