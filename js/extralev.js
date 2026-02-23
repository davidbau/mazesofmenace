// extralev.c helper functions moved out of dungeon.js to mirror C file layout.

import { rn2 } from './rng.js';
import { CORR, SCORR } from './config.js';

export const XL_UP = 1;
export const XL_DOWN = 2;
export const XL_LEFT = 4;
export const XL_RIGHT = 8;

// C ref: extralev.c:277 corr()
export function rogue_corr(map, x, y) {
    const loc = map.at(x, y);
    if (!loc) return;
    loc.typ = rn2(50) ? CORR : SCORR;
}

// C ref: extralev.c:20 roguejoin()
export function roguejoin(map, x1, y1, x2, y2, horiz) {
    if (horiz) {
        const middle = x1 + rn2(x2 - x1 + 1);
        for (let x = Math.min(x1, middle); x <= Math.max(x1, middle); x++) {
            rogue_corr(map, x, y1);
        }
        for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++) {
            rogue_corr(map, middle, y);
        }
        for (let x = Math.min(middle, x2); x <= Math.max(middle, x2); x++) {
            rogue_corr(map, x, y2);
        }
    } else {
        const middle = y1 + rn2(y2 - y1 + 1);
        for (let y = Math.min(y1, middle); y <= Math.max(y1, middle); y++) {
            rogue_corr(map, x1, y);
        }
        for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) {
            rogue_corr(map, x, middle);
        }
        for (let y = Math.min(middle, y2); y <= Math.max(middle, y2); y++) {
            rogue_corr(map, x2, y);
        }
    }
}

// C ref: extralev.c:138 miniwalk() — recursive 3x3 room connection walk.
export function miniwalk(rooms, x, y) {
    while (true) {
        const dirs = [];
        const doorhere = rooms[x][y].doortable;
        if (x > 0 && !(doorhere & XL_LEFT)
            && (!rooms[x - 1][y].doortable || !rn2(10))) dirs.push(0);
        if (x < 2 && !(doorhere & XL_RIGHT)
            && (!rooms[x + 1][y].doortable || !rn2(10))) dirs.push(1);
        if (y > 0 && !(doorhere & XL_UP)
            && (!rooms[x][y - 1].doortable || !rn2(10))) dirs.push(2);
        if (y < 2 && !(doorhere & XL_DOWN)
            && (!rooms[x][y + 1].doortable || !rn2(10))) dirs.push(3);
        if (!dirs.length) return;

        const dir = dirs[rn2(dirs.length)];
        switch (dir) {
        case 0:
            rooms[x][y].doortable |= XL_LEFT;
            x--;
            rooms[x][y].doortable |= XL_RIGHT;
            break;
        case 1:
            rooms[x][y].doortable |= XL_RIGHT;
            x++;
            rooms[x][y].doortable |= XL_LEFT;
            break;
        case 2:
            rooms[x][y].doortable |= XL_UP;
            y--;
            rooms[x][y].doortable |= XL_DOWN;
            break;
        default:
            rooms[x][y].doortable |= XL_DOWN;
            y++;
            rooms[x][y].doortable |= XL_UP;
            break;
        }
        miniwalk(rooms, x, y);
    }
}
