// C ref: mkmaze.c set_levltyp(), set_levltyp_lit() — terrain replacement during mklev and map edits.
import { game } from './gstate.js';
import { isok } from './const.js';
import {
    STONE, MAX_TYPE, SDOOR, AIR, ICE,
    STAIRS, LADDER, FOUNTAIN, SINK,
    IS_LAVA, IS_FOUNTAIN, IS_SINK,
} from './const.js';

/** C: rm.h CAN_OVERWRITE_TERRAIN — ladder/stairs unless debug overwrite. */
function canOverwriteTerrainLikeC(oldtyp) {
    if (game.flags?.debug_overwrite_stairs) return true;
    return oldtyp !== STAIRS && oldtyp !== LADDER;
}

/** C: mkmaze.c set_levltyp — secret-door/air hack, ice/lava, fountain/sink counts. */
export function setLevltypLikeC(x, y, newtyp) {
    if (!isok(x, y) || newtyp < STONE || newtyp >= MAX_TYPE) return false;
    const loc = game.level?.at(x, y);
    if (!loc) return false;
    const oldtyp = loc.typ | 0;
    if (oldtyp === SDOOR && newtyp === AIR) {
        loc.arboreal_sdoor = 1;
        return true;
    }
    if (!canOverwriteTerrainLikeC(oldtyp)) return false;
    const wasIce = loc.typ === ICE; /* C: is_ice(x,y) — mklev slice uses typ ICE only */
    loc.typ = newtyp;
    if (IS_LAVA(newtyp)) loc.lit = 1;
    if (wasIce && newtyp !== ICE) {
        /* C: obj_ice_effects + spot_stop_timers — deferred until ice port */
    }
    if (IS_FOUNTAIN(oldtyp) !== IS_FOUNTAIN(newtyp)
        || IS_SINK(oldtyp) !== IS_SINK(newtyp)) {
        bumpLevelFeatureCountsLikeC();
    }
    return true;
}

/** C: mklev.c / mkmaze.c count_level_features — recount nfountains/nsinks after terrain change. */
function bumpLevelFeatureCountsLikeC() {
    const lvl = game.level;
    if (!lvl?.flags) return;
    let nfountains = 0, nsinks = 0;
    for (let yy = 0; yy < 25; yy++)
        for (let xx = 1; xx < 80; xx++) {
            const typ = lvl.at(xx, yy)?.typ;
            if (typ === FOUNTAIN) nfountains++;
            if (typ === SINK) nsinks++;
        }
    lvl.flags.nfountains = nfountains;
    lvl.flags.nsinks = nsinks;
}
