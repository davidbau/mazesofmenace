// nhl_des_runtime.js — NHL **`des.*`** + selection helpers for Fengari (minetn vertical slice).
// C ref: sp_lev.c `lspo_*`, nhlsel.c `l_selection_*`, mkmap.c `mkmap`.

import { readUpstreamDatTextLikeC } from './dat_upstream.js';
import {
    COLNO, ROWNO, BOOL_RANDOM, INVALID_TYPE, STONE, ROOM, LVLINIT_MINES,
    LR_DOWNSTAIR, LR_UPSTAIR, LR_TELE, DOOR, D_CLOSED, D_NODOOR,
    CORPSTAT_NONE, ALTAR, FOUNTAIN,
} from './const.js';
import { splevChr2typLikeC } from './sp_lev_mapchr.js';
import { mkmapLikeC, lvlfillSolidLikeC } from './mkmap_mines.js';
import {
    selectionNewLikeC, selectionCloneLikeC, selectionSetpointLikeC,
    selectionGetpointLikeC, selectionFloodfillLikeC, selectionRndcoordLikeC,
    selectionDilate8LikeC, setSelectionFloodfillchkLikeC,
} from './selection.js';
import { splevMontypeNameToMnumLikeC } from './nhl_montype.js';
import { makemon } from './makemon.js';
import { placeFloorObject } from './floorobj.js';
import { goodposNullMonLikeC } from './walkable.js';
import { rnd, rn2 } from './rng.js';

const CORPSE = 265;
const OTYP_BOULDER = 474;
const OTYP_ROCK = 473;
const OTYP_TALLOW_CANDLE = 225;
const OTYP_WAX_CANDLE = 226;
const OTYP_OIL_LAMP = 228;
const OTYP_WAN_STRIKING = 415;
const WAN_MAGIC_MISSILE = 306;

/** @typedef {{ g: import('./gstate.js').game, deps: Record<string, Function>, nextSel: number, sels: Map<number, import('./selection.js').SelectionVar>, mapGx?: { xstart:number, ystart:number, xsize:number, ysize:number } }} NhlDesCtx */

/** @param {NhlDesCtx} ctx */
function allocSel(ctx) {
    const id = ++ctx.nextSel;
    const s = selectionNewLikeC();
    ctx.sels.set(id, s);
    return id;
}

/** @param {NhlDesCtx} ctx @param {number} id */
function getSel(ctx, id) {
    return ctx.sels.get(id | 0);
}

/**
 * @param {NhlDesCtx} ctx
 * @param {string} flag
 */
export function desLevelFlagsLikeC(ctx, flag) {
    const g = ctx.g;
    const lf = g.level.flags;
    const coder = g.desCoder;
    const s = String(flag ?? '').toLowerCase();
    if (s === 'mazelevel') lf.is_maze_lev = true;
    else if (s === 'corrmaze') lf.corrmaze = true;
    else if (s === 'premapped' && coder) coder.premapped = true;
    else if (s === 'solidify' && coder) coder.solidify = true;
    else if (s === 'inaccessibles' && coder) coder.checkInaccessibles = true;
}

/**
 * @param {NhlDesCtx} ctx
 * @param {Record<string, unknown>} t
 */
export function desLevelInitLikeC(ctx, t) {
    const g = ctx.g;
    const style = String(t.style ?? 'solidfill');
    if (style !== 'mines') throw new Error(`des.level_init style=${style} not ported`);
    let lit = (t.lit !== undefined && t.lit !== null) ? (t.lit | 0) : BOOL_RANDOM;
    if (lit === BOOL_RANDOM) lit = rn2(2);
    const fg = splevChr2typLikeC(String(t.fg ?? '.'));
    let bg = splevChr2typLikeC(String(t.bg ?? ' '));
    if ((bg | 0) === INVALID_TYPE) bg = STONE;
    const smoothed = !!t.smoothed;
    const joined = !!t.joined;
    const walled = !!t.walled;
    const filling = t.filling != null ? splevChr2typLikeC(String(t.filling)) : fg;
    coderJoinSet(g, !!joined);
    lvlfillSolidLikeC(g, filling | 0, 0);
    const initLev = {
        init_style: LVLINIT_MINES,
        fg: fg | 0,
        bg: bg | 0,
        smoothed,
        joined,
        lit,
        walled,
        icedpools: false,
    };
    mkmapLikeC(g, initLev, ctx.deps);
}

/** @param {import('./gstate.js').game} g @param {boolean} joined */
function coderJoinSet(g, joined) {
    if (!g.desCoder) return;
    g.desCoder.lvl_is_joined = joined;
}

/**
 * @param {NhlDesCtx} ctx
 * @param {string} mapStr
 */
export function desMapAsciiLikeC(ctx, mapStr) {
    const g = ctx.g;
    const map = g.level;
    if (!map) return;
    const lines = String(mapStr).replace(/\r\n/g, '\n').split('\n');
    let hei = 0;
    let wid = 0;
    for (const ln of lines) {
        if (!ln.length) continue;
        hei++;
        if (ln.length > wid) wid = ln.length;
    }
    const x0 = 1;
    const y0 = 1;
    let row = 0;
    for (const ln of lines) {
        if (!ln.length) continue;
        for (let c = 0; c < ln.length; c++) {
            const ch = ln[c];
            const typ = splevChr2typLikeC(ch);
            const x = x0 + c;
            const y = y0 + row;
            const loc = map.at(x, y);
            if (loc) loc.typ = typ | 0;
        }
        row++;
    }
    ctx.mapGx = { xstart: x0, ystart: y0, xsize: wid, ysize: hei };
}

/** @param {NhlDesCtx} ctx @param {Record<string, unknown>} t */
export function desTeleportRegionLikeC(ctx, t) {
    const g = ctx.g;
    const append = ctx.deps.appendLregion;
    const reg = /** @type {Record<string, number>} */ (t.region);
    const ex = /** @type {Record<string, number>} */ (t.exclude);
    append(g, {
        rtype: LR_TELE,
        inarea: { lx: reg[1], ly: reg[2], hx: reg[3], hy: reg[4] },
        delarea: { lx: ex[1], ly: ex[2], hx: ex[3], hy: ex[4] },
        lev: null,
    });
}

/** @param {NhlDesCtx} ctx @param {number} selId @param {string} litOpt */
export function desRegionSelectionLitLikeC(ctx, selId, litOpt) {
    const g = ctx.g;
    const sel = getSel(ctx, selId);
    if (!sel) return;
    const s2 = selectionCloneLikeC(sel);
    selectionDilate8LikeC(s2);
    const lit = litOpt === 'lit';
    for (let x = 0; x < COLNO; x++) {
        for (let y = 0; y < ROWNO; y++) {
            if (selectionGetpointLikeC(x, y, s2)) {
                const loc = g.level?.at(x, y);
                if (loc) loc.lit = lit;
            }
        }
    }
}

/** @param {NhlDesCtx} ctx @param {Record<string, unknown>} t */
export function desLevregionLikeC(ctx, t) {
    const g = ctx.g;
    const append = ctx.deps.appendLregion;
    const typ = String(t.type ?? '');
    const reg = /** @type {Record<string, number>} */ (t.region);
    const ex = /** @type {Record<string, number>} */ (t.exclude);
    let rt = LR_TELE;
    if (typ === 'stair-up') rt = LR_UPSTAIR;
    else if (typ === 'stair-down') rt = LR_DOWNSTAIR;
    append(g, {
        rtype: rt,
        inarea: { lx: reg[1], ly: reg[2], hx: reg[3], hy: reg[4] },
        delarea: { lx: ex[1], ly: ex[2], hx: ex[3], hy: ex[4] },
        lev: null,
    });
}

/** @param {NhlDesCtx} ctx @param {string} feat @param {number} x @param {number} y */
export function desFeatureLikeC(ctx, feat, x, y) {
    const loc = ctx.g.level?.at(x | 0, y | 0);
    if (!loc) return;
    if (feat === 'fountain') loc.typ = FOUNTAIN;
}

/** @param {NhlDesCtx} ctx @param {Record<string, unknown>} t */
export function desAltarLikeC(ctx, t) {
    const x = t.x | 0;
    const y = t.y | 0;
    const loc = ctx.g.level?.at(x, y);
    if (!loc) return;
    loc.typ = ALTAR;
}

/** @param {NhlDesCtx} ctx @param {string} how @param {number} x @param {number} y */
export function desDoorLikeC(ctx, how, x, y) {
    void how;
    const loc = ctx.g.level?.at(x | 0, y | 0);
    if (!loc) return;
    loc.typ = DOOR;
    loc.doormask = D_CLOSED;
    if (how === 'random' && !rn2(3)) loc.doormask = D_NODOOR;
}

/** @param {NhlDesCtx} ctx @param {Record<string, unknown>} t */
export function desReplaceTerrainLikeC(ctx, t) {
    const g = ctx.g;
    const r = /** @type {Record<string, number>} */ (t.region);
    const from = String(t.fromterrain ?? '|')[0];
    const to = String(t.toterrain ?? '.')[0];
    const chance = t.chance | 0;
    const fromTyp = splevChr2typLikeC(from);
    const toTyp = splevChr2typLikeC(to);
    for (let x = r[1]; x <= r[3]; x++) {
        for (let y = r[2]; y <= r[4]; y++) {
            const loc = g.level?.at(x, y);
            if (!loc) continue;
            if ((loc.typ | 0) === (fromTyp | 0) && rn2(100) < chance) loc.typ = toTyp | 0;
        }
    }
}

/** @param {NhlDesCtx} ctx @param {number} lx @param {number} ly @param {number} hx @param {number} hy */
export function desSelRectLikeC(ctx, lx, ly, hx, hy) {
    const id = allocSel(ctx);
    const s = getSel(ctx, id);
    if (!s) return id;
    for (let x = lx | 0; x <= (hx | 0); x++) {
        for (let y = ly | 0; y <= (hy | 0); y++) {
            selectionSetpointLikeC(x, y, s, 1);
        }
    }
    return id;
}

/** @param {NhlDesCtx} ctx @param {number} x @param {number} y @param {boolean} diag */
export function desSelFloodLikeC(ctx, x, y, diag) {
    const g = ctx.g;
    const id = allocSel(ctx);
    const s = getSel(ctx, id);
    if (!s) return id;
    const loc = g.level?.at(x | 0, y | 0);
    const matchTyp = loc?.typ | 0;
    setSelectionFloodfillchkLikeC((mx, my) => (g.level?.at(mx, my)?.typ | 0) === matchTyp);
    selectionFloodfillLikeC(s, x | 0, y | 0, !!diag);
    setSelectionFloodfillchkLikeC(null);
    return id;
}

/** @param {NhlDesCtx} ctx @param {number} a @param {number} b */
export function desSelBandLikeC(ctx, a, b) {
    const sa = getSel(ctx, a);
    const sb = getSel(ctx, b);
    const id = allocSel(ctx);
    const out = getSel(ctx, id);
    if (!sa || !sb || !out) return id;
    let lx = COLNO;
    let ly = ROWNO;
    let hx = 0;
    let hy = 0;
    const upd = (x, y) => {
        if (x < lx) lx = x;
        if (y < ly) ly = y;
        if (x > hx) hx = x;
        if (y > hy) hy = y;
    };
    for (let x = 0; x < COLNO; x++) {
        for (let y = 0; y < ROWNO; y++) {
            if (selectionGetpointLikeC(x, y, sa) && selectionGetpointLikeC(x, y, sb)) {
                selectionSetpointLikeC(x, y, out, 1);
                upd(x, y);
            }
        }
    }
    out.bounds = { lx, ly, hx, hy };
    out.boundsDirty = false;
    return id;
}

/** @param {NhlDesCtx} ctx @param {number} id @param {number} removeit */
export function desSelRndcoordLikeC(ctx, id, removeit) {
    const s = getSel(ctx, id);
    if (!s) return null;
    return selectionRndcoordLikeC(s, !!removeit);
}

/** @param {NhlDesCtx} ctx */
export function desWallifyLikeC(ctx) {
    ctx.deps.wallification(1, 0, COLNO - 1, ROWNO - 1);
}

/** @param {NhlDesCtx} ctx @param {Record<string, unknown>|string} a */
export function desObjectLikeC(ctx, a) {
    const g = ctx.g;
    const mksobj = ctx.deps.mksobj;
    const mkcorpstat = ctx.deps.mkcorpstat;
    if (typeof a === 'string') {
        const s = String(a);
        let otyp = OTYP_ROCK;
        if (s === 'boulder') otyp = OTYP_BOULDER;
        const o = mksobj(otyp, true, false);
        if (o) placeObjRandomFloorLikeC(g, o);
        return;
    }
    const t = /** @type {Record<string, unknown>} */ (a);
    const idStr = t.id != null ? String(t.id) : '';
    let x = t.x != null ? t.x | 0 : null;
    let y = t.y != null ? t.y | 0 : null;
    const coord = /** @type {{x?:number,y?:number}|null} */ (t.coord ?? null);
    if (coord && x == null) { x = coord.x | 0; y = coord.y | 0; }
    const montype = t.montype != null ? String(t.montype) : '';
    const pm = splevMontypeNameToMnumLikeC(montype);
    if (idStr === 'corpse' && pm >= 0) {
        const ox = x ?? 0;
        const oy = y ?? 0;
        const o = mkcorpstat(CORPSE, null, pm, ox, oy, CORPSTAT_NONE);
        if (o && (!ox && !oy)) placeObjRandomFloorLikeC(g, o);
        return;
    }
    let otyp = OTYP_ROCK;
    if (idStr === 'wax candle') otyp = OTYP_WAX_CANDLE;
    else if (idStr === 'tallow candle') otyp = OTYP_TALLOW_CANDLE;
    else if (idStr === 'oil lamp') otyp = OTYP_OIL_LAMP;
    else if (idStr === 'wand of striking') otyp = OTYP_WAN_STRIKING;
    else if (idStr === 'wand of magic missile') otyp = WAN_MAGIC_MISSILE;
    const o = mksobj(otyp, true, false);
    if (!o) return;
    if (t.quantity != null) o.quan = t.quantity | 0;
    if (x != null && y != null) placeFloorObject(o, x, y);
    else placeObjRandomFloorLikeC(g, o);
}

/** @param {import('./gstate.js').game} g @param {object} o */
function placeObjRandomFloorLikeC(g, o) {
    for (let t = 0; t < 200; t++) {
        const x = rn2(COLNO - 2) + 1;
        const y = rn2(ROWNO - 2) + 1;
        const loc = g.level?.at(x, y);
        if (loc && (loc.typ | 0) === ROOM && goodposNullMonLikeC(x, y, g)) {
            placeFloorObject(o, x, y);
            return;
        }
    }
}

/** @param {NhlDesCtx} ctx @param {Record<string, unknown>|string} a */
export function desMonsterLikeC(ctx, a) {
    const g = ctx.g;
    let id = '';
    let x = 0;
    let y = 0;
    let peaceful = -1;
    let mLevAdj = 0;
    if (typeof a === 'string') {
        id = String(a);
    } else {
        const t = /** @type {Record<string, unknown>} */ (a);
        id = String(t.id ?? '');
        const c = /** @type {{x?:number,y?:number}|null} */ (t.coord ?? null);
        if (c) { x = c.x | 0; y = c.y | 0; }
        if (t.peaceful != null) peaceful = t.peaceful ? 1 : 0;
        if (t.m_lev_adj != null) mLevAdj = t.m_lev_adj | 0;
    }
    const mnum = splevMontypeNameToMnumLikeC(id);
    if (mnum < 0) return;
    if (!x && !y) {
        for (let t = 0; t < 200; t++) {
            const rx = rn2(COLNO - 2) + 1;
            const ry = rn2(ROWNO - 2) + 1;
            if (goodposNullMonLikeC(rx, ry, g) && (g.level?.at(rx, ry)?.typ | 0) === ROOM) {
                x = rx;
                y = ry;
                break;
            }
        }
    }
    const mtmp = makemon({ mnum, data: null }, x, y, 0);
    if (!mtmp) return;
    if (peaceful >= 0) mtmp.mpeaceful = peaceful;
    if (mLevAdj) mtmp.m_lev = (mtmp.m_lev | 0) + mLevAdj;
}

/** @param {string} baseName e.g. minetn-1 */
export function readUpstreamDatLikeC(baseName) {
    return readUpstreamDatTextLikeC(baseName);
}
