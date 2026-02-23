// mkmaze.c compatibility layer.
// C-parity implementations live in dungeon.js/sp_lev.js; this module keeps
// file/function naming aligned with NetHack C source structure.

import {
    COLNO, ROWNO, STONE, CROSSWALL, LAVAWALL, IRONBARS, WATER, SDOOR,
    IS_WALL, isok,
} from './config.js';
import {
    makemaz as dungeonMakemaz,
    create_maze as dungeonCreateMaze,
    populate_maze as dungeonPopulateMaze,
    mazexy as dungeonMazexy,
    wallification,
    fix_wall_spines,
    is_exclusion_zone as dungeonIsExclusionZone,
    bad_location as dungeonBadLocation,
    place_lregion,
    put_lregion_here,
    bound_digging,
    repair_irregular_room_boundaries,
} from './dungeon.js';

function at(map, x, y) {
    return map && map.at ? map.at(x, y) : null;
}

// C ref: mkmaze.c iswall
export function iswall(map, x, y) {
    const loc = at(map, x, y);
    if (!loc) return 1;
    return IS_WALL(loc.typ)
        || loc.typ === LAVAWALL
        || loc.typ === WATER
        || loc.typ === SDOOR
        || loc.typ === IRONBARS
        || loc.typ === CROSSWALL ? 1 : 0;
}

// C ref: mkmaze.c iswall_or_stone
export function iswall_or_stone(map, x, y) {
    const loc = at(map, x, y);
    if (!loc) return 1;
    return loc.typ === STONE || iswall(map, x, y);
}

// C ref: mkmaze.c is_solid
export function is_solid(map, x, y) {
    return !isok(x, y) || IS_WALL(at(map, x, y)?.typ);
}

// C ref: mkmaze.c set_levltyp
export function set_levltyp(map, x, y, typ) {
    const loc = at(map, x, y);
    if (!loc || !Number.isInteger(typ)) return false;
    loc.typ = typ;
    return true;
}

// C ref: mkmaze.c set_levltyp_lit
export function set_levltyp_lit(map, x, y, typ, lit) {
    if (!set_levltyp(map, x, y, typ)) return false;
    const loc = at(map, x, y);
    loc.lit = lit ? 1 : 0;
    return true;
}

// C ref: mkmaze.c extend_spine
export function extend_spine(locale, wall_there, dx, dy) {
    const nx = 1 + dx;
    const ny = 1 + dy;
    if (wall_there) {
        if (dx) {
            if (locale[1][0] && locale[1][2] && locale[nx][0] && locale[nx][2]) return 0;
            return 1;
        }
        if (locale[0][1] && locale[2][1] && locale[0][ny] && locale[2][ny]) return 0;
        return 1;
    }
    return 0;
}

// C ref: mkmaze.c wall_cleanup
export function wall_cleanup(map, x1 = 1, y1 = 0, x2 = COLNO - 1, y2 = ROWNO - 1) {
    for (let x = x1; x <= x2; x++) {
        for (let y = y1; y <= y2; y++) {
            const loc = at(map, x, y);
            if (!loc || !IS_WALL(loc.typ)) continue;

            if (iswall_or_stone(map, x - 1, y)
                && iswall_or_stone(map, x + 1, y)
                && iswall_or_stone(map, x, y - 1)
                && iswall_or_stone(map, x, y + 1)) {
                loc.typ = STONE;
                loc.horizontal = false;
            }
        }
    }
}

// C ref: mkmaze.c okay
export function okay(x, y, dir, map = null) {
    if (!map || !map.at) return false;
    const [dx, dy] = dir === 0 ? [1, 0]
        : dir === 2 ? [0, 1]
        : dir === 4 ? [-1, 0]
        : [0, -1];
    const tx = x + 2 * dx;
    const ty = y + 2 * dy;
    if (!isok(tx, ty)) return false;
    return at(map, x + dx, y + dy)?.typ === STONE
        && at(map, tx, ty)?.typ === STONE;
}

// C ref: mkmaze.c maze0xy
export function maze0xy(map) {
    return dungeonMazexy(map);
}

// C ref: mkmaze.c is_exclusion_zone
export function is_exclusion_zone(map, type, x, y) {
    return dungeonIsExclusionZone(map, type, x, y);
}

// C ref: mkmaze.c bad_location
export function bad_location(map, x, y, nlx, nly, nhx, nhy) {
    return dungeonBadLocation(map, x, y, nlx, nly, nhx, nhy);
}

// C ref: mkmaze.c makemaz
export function makemaz(map, protofile, dnum, dlevel, depth) {
    return dungeonMakemaz(map, protofile, dnum, dlevel, depth);
}

// C ref: mkmaze.c create_maze
export function create_maze(map, corrwid, wallthick, rmdeadends) {
    return dungeonCreateMaze(map, corrwid, wallthick, rmdeadends);
}

// C ref: mkmaze.c populate_maze
export function populate_maze(map, depth) {
    return dungeonPopulateMaze(map, depth);
}

// C ref: mkmaze.c maze_remove_deadends
export function maze_remove_deadends(map, typ) {
    return dungeonCreateMaze(map, 1, 1, !!typ);
}

// C ref: mkmaze.c mazexy
export function mazexy(map) {
    return dungeonMazexy(map);
}

// C ref: mkmaze.c pick_vibrasquare_location
export function pick_vibrasquare_location(map) {
    for (let tries = 0; tries < 200; tries++) {
        const pos = dungeonMazexy(map);
        if (!pos) return null;
        if (map.at(pos.x, pos.y)?.typ !== STONE) return pos;
    }
    return dungeonMazexy(map);
}

export { wallification, fix_wall_spines, place_lregion, put_lregion_here };

// C ref: mkmaze.c baalz_fixup/fixup_special/check_ransacked/etc.
export function baalz_fixup() { return false; }
export function fixup_special() { return true; }
export function check_ransacked() { return false; }
export function migrate_orc() { return false; }
export function shiny_orc_stuff() { return null; }
export function migr_booty_item() { return null; }
export function stolen_booty() { return null; }

// C ref: mkmaze.c maze_inbounds
export function maze_inbounds(x, y) {
    return x >= 2 && x <= COLNO - 1 && y >= 1 && y <= ROWNO - 1;
}

// C ref: mkmaze.c mkportal
export function mkportal(map, x, y, _todnum, _todlevel) {
    if (!map || !map.at) return null;
    return place_lregion(map, x, y, x, y, y, y, y, y, 3);
}

export function fumaroles() { return false; }
export function movebubbles() { return false; }
export function water_friction() { return 0; }
export function save_waterlevel() { return null; }
export function restore_waterlevel() { return false; }
export function set_wportal() { return false; }
export function setup_waterlevel(map, args = {}) {
    if (!map) return false;
    map._water = map._water || { bubbles: [], active: true, ...args };
    return true;
}
export function unsetup_waterlevel(map) {
    if (map && map._water) map._water = null;
    return true;
}
export function mk_bubble(map, x, y, n) {
    if (!map) return null;
    const bubble = { x, y, n, active: true };
    map._water = map._water || { bubbles: [] };
    map._water.bubbles.push(bubble);
    return bubble;
}
export function maybe_adjust_hero_bubble() { return false; }
export function mv_bubble() { return false; }

export { bound_digging, repair_irregular_room_boundaries };
