// describe_level.js — C botl.c describe_level() (level name for status / livelog).
// C ref: botl.c describe_level(buf, dflgs); dungeon.c endgamelevelname().

import { depth } from './hacklib.js';
import { In_quest, In_endgame, Is_knox_level } from './const.js';
import { inTutorialAtLevelLikeC } from './tutorial_branch.js';

/**
 * C: **`dungeon.c`** **`endgamelevelname(char *outbuf, int indx)`** — **`indx`** is **`depth(&u.uz)`**.
 * @param {number} indx
 * @returns {string}
 */
export function endgamelevelnameLikeC(indx) {
    const i = Number(indx) | 0;
    switch (i) {
    case -5:
        return 'Astral Plane';
    case -4:
        return 'Plane of Water';
    case -3:
        return 'Plane of Fire';
    case -2:
        return 'Plane of Air';
    case -1:
        return 'Plane of Earth';
    default:
        return `unknown plane #${i}`;
    }
}

/** C: **`botl.c`** **`strsubst(buf, "Plane of ", "")`** for status (**`!addbranch`** endgame). */
function stripPlaneOfPrefixLikeC(s) {
    return String(s ?? '').replace('Plane of ', '');
}

/** C: **`%-2d`** depth column after **`Tutorial:`** / **`Dlvl:`**. */
function describeLevelDepthColMinus2dLikeC(uz) {
    const d = depth(uz);
    const t = String(d | 0);
    return t.length >= 2 ? t : `${t} `;
}

/** C: **`botl.c`** **`strsubst(buf, "The ", "the ")`** after branch suffix (**`eos`**, **`dungeons[dnum].dname`**). */
function substLeadingTheLikeC(s) {
    return String(s ?? '').replace(/The /g, 'the ');
}

/**
 * C: **`botl.c`** **`describe_level`** — **`dflgs & 1`** trailing space, **`dflgs & 2`** branch suffix.
 * @param {import('./gstate.js').game} g
 * @param {{ dnum?: number, dlevel?: number } | null | undefined} uz
 * @param {number} [dflgs] — default **0** (status: no space, no branch suffix).
 * @returns {string}
 */
export function describeLevelStringLikeC(g, uz, dflgs = 0) {
    const addspace = (dflgs & 1) !== 0;
    let addbranch = (dflgs & 2) !== 0;
    const lev = uz || { dnum: 0, dlevel: 1 };

    let buf;

    if (Is_knox_level(lev)) {
        const dn = g?.dungeons?.[lev.dnum | 0]?.dname;
        buf = String(dn ?? '').trim() || 'Knox';
        addbranch = false;
    } else if (In_quest(lev)) {
        buf = `Home ${lev.dlevel | 0}`;
    } else if (In_endgame(lev)) {
        buf = endgamelevelnameLikeC(depth(lev));
        if (!addbranch) buf = stripPlaneOfPrefixLikeC(buf);
        addbranch = false;
    } else if (!addbranch) {
        const label = inTutorialAtLevelLikeC(g, lev) ? 'Tutorial' : 'Dlvl';
        buf = `${label}:${describeLevelDepthColMinus2dLikeC(lev)}`;
    } else {
        buf = `level ${depth(lev) | 0}`;
    }

    if (addbranch) {
        const dname = String(g?.dungeons?.[lev.dnum | 0]?.dname ?? '');
        buf = `${buf}, ${dname}`;
        buf = substLeadingTheLikeC(buf);
    }

    if (addspace) buf = `${buf} `;
    return buf;
}

/**
 * C: **`describe_level`** with **`dflgs==0`** — text used in TTY status line before **`$:`** …
 * @param {import('./gstate.js').game} g
 * @param {{ dnum?: number, dlevel?: number }} uz
 */
export function describeLevelStatusSlotLikeC(g, uz) {
    return describeLevelStringLikeC(g, uz, 0);
}

/**
 * C: **`do.c`** **`goto_level`** — **`(void) describe_level(dloc, 2);`** before **`livelog_printf(..., "entered %s", dloc)`**.
 * @param {import('./gstate.js').game} g
 * @returns {string}
 */
export function describeLevelLivelogEnteredBufLikeC(g) {
    return describeLevelStringLikeC(g, g?.u?.uz, 2);
}
