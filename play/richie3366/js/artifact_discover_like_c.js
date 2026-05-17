// artifact_discover_like_c.js — C artifact.c **`artidisco[]`** / **`artiexist[]`** / **`discover_artifact`** / **`artifact_origin`**.
// C refs: artifact.c **`init_artifacts`**, **`discover_artifact`**, **`artifact_origin`**;
//         pray.c **`gcrownu`** (**`oname`** → **`artifact_origin(ONAME_GIFT|ONAME_KNOW_ARTI)`**), **`discover_artifact`**.

import {
    ONAME_WISH,
    ONAME_GIFT,
    ONAME_VIA_DIP,
    ONAME_VIA_NAMING,
    ONAME_LEVEL_DEF,
    ONAME_BONES,
    ONAME_RANDOM,
    ONAME_KNOW_ARTI,
} from './const.js';

/**
 * C: **`NROFARTIFACTS`** from **`hack.h`** (**`AFTER_LAST_ARTIFACT - 1`**). NH 5.0 is on the order of **~36**;
 * use a fixed upper bound so we never shrink the discovery table vs C.
 */
const NROFARTIFACT_DISCOVERY_SLOTS = 64;

/** C: **`artifact.c`** **`struct arti_info zero_artiexist`** — all-zero origin row. */
function zeroArtiexistLikeC() {
    return {
        exists: 0,
        found: 0,
        wish: 0,
        gift: 0,
        viadip: 0,
        named: 0,
        lvldef: 0,
        bones: 0,
        rndm: 0,
    };
}

/**
 * C: **`init_artifacts`** — zero **`artiexist[1..NROFARTIFACTS]`** (**`artiexist[0]`** unused).
 * @param {import('./gstate.js').game} g
 */
export function initArtiexistHeroLikeC(g) {
    const n = NROFARTIFACT_DISCOVERY_SLOTS + 1;
    /** @type {ReturnType<typeof zeroArtiexistLikeC>[]} */
    const rows = [];
    for (let i = 0; i < n; i++) rows.push(zeroArtiexistLikeC());
    g.artiexist = rows;
}

/**
 * C: **`init_artifacts`** — zero **`artidisco[]`** and **`artiexist[]`**.
 * @param {import('./gstate.js').game} g
 */
export function initArtidiscoHeroLikeC(g) {
    g.artidisco = new Array(NROFARTIFACT_DISCOVERY_SLOTS).fill(0);
    initArtiexistHeroLikeC(g);
}

/**
 * C: **`discover_artifact(m)`** — append artifact index **m** to **`artidisco`** in first empty or matching slot.
 * @param {import('./gstate.js').game} g
 * @param {number} m — 1-based **`oartifact`** / **`ART_*`**
 */
export function discoverArtifactHeroLikeC(g, m) {
    const a = m | 0;
    if (a <= 0) return;
    if (!Array.isArray(g.artidisco) || g.artidisco.length !== NROFARTIFACT_DISCOVERY_SLOTS) {
        initArtidiscoHeroLikeC(g);
    }
    const disc = g.artidisco;
    for (let i = 0; i < NROFARTIFACT_DISCOVERY_SLOTS; i++) {
        const slot = disc[i] | 0;
        if (slot === 0 || slot === a) {
            disc[i] = a;
            return;
        }
    }
    /* C: **`impossible("couldn't discover artifact")`** — no-op in contest JS */
}

/**
 * C: **`artifact_origin(arti, aflags)`** — set **`artiexist[a]`** provenance (**`exists`**, optional **`found`**, exactly one origin bit).
 * Uses contest **`const.js`** **`ONAME_*`** values (fork encoding; semantics match C bit roles).
 * @param {import('./gstate.js').game} g
 * @param {number} arti — 1-based **`oartifact`**
 * @param {number} aflags — **`ONAME_*`**
 */
export function artifactOriginHeroLikeC(g, arti, aflags) {
    const a = arti | 0;
    if (a <= 0) return;
    if (!Array.isArray(g.artiexist) || g.artiexist.length < NROFARTIFACT_DISCOVERY_SLOTS + 1) {
        initArtiexistHeroLikeC(g);
    }
    const row = g.artiexist[a];
    if (!row) return;
    Object.assign(row, zeroArtiexistLikeC());
    row.exists = 1;
    if ((aflags | 0) & ONAME_KNOW_ARTI) row.found = 1;
    let ct = 0;
    if ((aflags | 0) & ONAME_WISH) {
        row.wish = 1;
        ct++;
    }
    if ((aflags | 0) & ONAME_GIFT) {
        row.gift = 1;
        ct++;
    }
    if ((aflags | 0) & ONAME_VIA_DIP) {
        row.viadip = 1;
        ct++;
    }
    if ((aflags | 0) & ONAME_VIA_NAMING) {
        row.named = 1;
        ct++;
    }
    if ((aflags | 0) & ONAME_LEVEL_DEF) {
        row.lvldef = 1;
        ct++;
    }
    if ((aflags | 0) & ONAME_BONES) {
        row.bones = 1;
        ct++;
    }
    if ((aflags | 0) & ONAME_RANDOM) {
        row.rndm = 1;
        ct++;
    }
    if (ct !== 1) {
        row.wish = row.gift = row.viadip = row.named = row.lvldef = row.bones = row.rndm = 0;
        row.rndm = 1;
    }
}
