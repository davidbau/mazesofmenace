// do_name.js — Object naming helpers (partial).
// C ref: do_name.c oname / artifact naming.

import { artifact_exists, exist_artifact } from './artifact.js';
import { ONAME_VIA_NAMING } from './const.js';

const PL_PSIZ = 32; // C: PL_PSIZ player-name / oname buffer

/**
 * C ref: do_name.c oname — assign name; may create artifact via artifact_exists.
 */
export function oname(obj, name, oflgs = 0) {
    if (!obj) return obj;
    let n = name || '';
    if (n.length >= PL_PSIZ) n = n.slice(0, PL_PSIZ - 1);

    // If already artifact or named artifact exists, keep current
    if (obj.oartifact || (n && exist_artifact(obj.otyp, n))) {
        return obj;
    }

    if (!obj.oextra) obj.oextra = {};
    if (n) obj.oextra.oname = n;
    else delete obj.oextra.oname;

    if (n) artifact_exists(obj, n, true, oflgs | 0);

    // Dual-wield / intrinsic / shop / literate paths deferred
    void (oflgs & ONAME_VIA_NAMING);
    return obj;
}

export function safe_oname(obj) {
    return obj?.oextra?.oname || '';
}
