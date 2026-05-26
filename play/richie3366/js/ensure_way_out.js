// ensure_way_out.js — C sp_lev.c ensure_way_out / generate_way_out_method.
// C ref: sp_lev.c ensure_way_out(), generate_way_out_method(); detect.c floodfillchk_match_accessible.

import {
    COLNO, ROWNO, SDOOR, SCORR, HOLE, TRAPDOOR,
    ACCESSIBLE, IS_WALL, isok, is_hole,
    MAGIC_PORTAL, VIBRATING_SQUARE,
} from './const.js';
import { rnd, rn2 } from './rng.js';
import { canFallThruDlevelLikeC } from './trap.js';
import { mksobjInitMklevLikeC } from './mkobj_mklev_like_c.js';
import { nh5OclassFromOcSkillMapLikeC } from './obj_oc_skill_data.js';
import { placeFloorObjectInLevel } from './floorobj.js';
import {
    selectionNewLikeC,
    selectionFreeLikeC,
    selectionGetpointLikeC,
    selectionSetpointLikeC,
    selectionCloneLikeC,
    selectionFloodfillLikeC,
    selectionRndcoordLikeC,
    setSelectionFloodfillchkLikeC,
} from './selection.js';

/** NH5 otyps — C objects.h escapeitems[] (mklev audit literals). */
const OTYP_PICK_AXE = 260;
const OTYP_DWARVISH_MATTOCK = 261;
const OTYP_WAN_DIGGING = 305;
const OTYP_WAN_TELEPORTATION = 427;
const OTYP_SCR_TELEPORTATION = 333;
const OTYP_RIN_TELEPORTATION = 194;
const ESCAPE_OTYPS = [
    OTYP_PICK_AXE,
    OTYP_DWARVISH_MATTOCK,
    OTYP_WAN_DIGGING,
    OTYP_WAN_TELEPORTATION,
    OTYP_SCR_TELEPORTATION,
    OTYP_RIN_TELEPORTATION,
];

/** C: trap.c undestroyable_trap subset (sp_lev map_cleanup). */
function undestroyableTrapEnsureLikeC(ttyp) {
    const tt = ttyp | 0;
    return tt === MAGIC_PORTAL || tt === VIBRATING_SQUARE;
}

/** C: sp_lev.c floodfillchk_match_accessible */
function floodfillchkMatchAccessibleLikeC(g, x, y) {
    const typ = g.level?.at(x, y)?.typ | 0;
    return ACCESSIBLE(typ) || typ === SDOOR || typ === SCORR;
}

/**
 * C: mktrap subset — push HOLE/TRAPDOOR at (x,y).
 * @param {import('./gstate.js').game} g
 */
function maketrapEnsureWayOutLikeC(g, x, y, typ) {
    const lev = g.level;
    if (!lev) return false;
    const loc = lev.at(x, y);
    if (!loc) return false;
    if (!lev.traps) lev.traps = [];
    lev.traps.push({ ttyp: typ | 0, tx: x | 0, ty: y | 0, tseen: false, once: false, launch: { x: 0, y: 0 } });
    return true;
}

/**
 * C: sp_lev.c generate_way_out_method
 * @param {import('./gstate.js').game} g
 * @param {number} nx
 * @param {number} ny
 * @param {import('./selection.js').SelectionVar} ov
 */
function generateWayOutMethodLikeC(g, nx, ny, ov) {
    const map = g.level;
    if (!map) return false;

    const ov2 = selectionNewLikeC();
    selectionFloodfillLikeC(ov2, nx, ny, true);
    let ov3 = selectionCloneLikeC(ov2);

    for (;;) {
        const coord = selectionRndcoordLikeC(ov3, true);
        if (!coord) break;
        const { x, y } = coord;
        const tryWall = (wx, wy, ax, ay) => {
            if (!isok(wx, wy) || !isok(ax, ay)) return false;
            if (selectionGetpointLikeC(wx, wy, ov)) return false;
            if (!IS_WALL(map.at(wx, wy)?.typ)) return false;
            if (!selectionGetpointLikeC(ax, ay, ov)) return false;
            if (!ACCESSIBLE(map.at(ax, ay)?.typ)) return false;
            map.at(wx, wy).typ = SDOOR;
            return true;
        };
        if (tryWall(x + 1, y, x + 2, y)
            || tryWall(x - 1, y, x - 2, y)
            || tryWall(x, y + 1, x, y + 2)
            || tryWall(x, y - 1, x, y - 2)) {
            selectionFreeLikeC(ov2, true);
            selectionFreeLikeC(ov3, true);
            return true;
        }
    }

    if (canFallThruDlevelLikeC(g)) {
        selectionFreeLikeC(ov3, true);
        ov3 = selectionCloneLikeC(ov2);
        for (;;) {
            const coord = selectionRndcoordLikeC(ov3, true);
            if (!coord) break;
            const { x, y } = coord;
            if (maketrapEnsureWayOutLikeC(g, x, y, rn2(2) ? HOLE : TRAPDOOR)) {
                selectionFreeLikeC(ov2, true);
                selectionFreeLikeC(ov3, true);
                return true;
            }
        }
    }

    const coord = selectionRndcoordLikeC(ov2, false);
    if (coord) {
        const otyp = ESCAPE_OTYPS[rnd(ESCAPE_OTYPS.length) - 1] | 0;
        const oc = nh5OclassFromOcSkillMapLikeC(otyp) | 0;
        rnd(2); /* C: mksobj next_ident */
        const otmp = {
            otyp,
            oclass: oc,
            quan: 1,
            owt: 1,
            cursed: false,
            blessed: false,
        };
        mksobjInitMklevLikeC(otyp, oc, false, otmp);
        placeFloorObjectInLevel(g, otmp, coord.x, coord.y);
        selectionFreeLikeC(ov2, true);
        selectionFreeLikeC(ov3, true);
        return true;
    }

    selectionFreeLikeC(ov2, true);
    selectionFreeLikeC(ov3, true);
    return false;
}

/**
 * C: sp_lev.c ensure_way_out — no call until NHL sets check_inaccessibles.
 * @param {import('./gstate.js').game} g
 */
export function ensureWayOutLikeC(g) {
    const map = g.level;
    const u = g.u;
    if (!map || !u?.uz) return;

    setSelectionFloodfillchkLikeC((x, y) => floodfillchkMatchAccessibleLikeC(g, x, y));

    const ov = selectionNewLikeC();
    const dnum = u.uz.dnum | 0;

    for (let st = g.stairs; st; st = st.next) {
        const tv = st.tolev;
        if (tv && (tv.dnum | 0) === dnum) {
            selectionFloodfillLikeC(ov, st.sx | 0, st.sy | 0, true);
        }
    }

    for (const t of map.traps || []) {
        const tt = t.ttyp | 0;
        if ((undestroyableTrapEnsureLikeC(tt) || is_hole(tt))
            && !selectionGetpointLikeC(t.tx | 0, t.ty | 0, ov)) {
            selectionFloodfillLikeC(ov, t.tx | 0, t.ty | 0, true);
        }
    }

    let done = false;
    while (!done) {
        done = true;
        for (let x = 1; x < COLNO; x++) {
            for (let y = 0; y < ROWNO; y++) {
                if (!ACCESSIBLE(map.at(x, y)?.typ)) continue;
                if (selectionGetpointLikeC(x, y, ov)) continue;
                if (generateWayOutMethodLikeC(g, x, y, ov)) {
                    selectionFloodfillLikeC(ov, x, y, true);
                }
                done = false;
                break;
            }
            if (!done) break;
        }
    }

    selectionFreeLikeC(ov, true);
}
