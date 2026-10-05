import { game } from './gstate.js';
import { ACCESSIBLE, IS_LAVA, IS_POOL } from './const.js';
import { rn1, rn2 } from './rng.js';
import { vision_reset } from './vision.js';

// C ref: region.c create_gas_cloud().
export function createGasCloud(x, y, cloudsize, damage) {
    const maxCloudSize = 150;
    if (cloudsize > maxCloudSize) cloudsize = maxCloudSize;

    const coords = [{ x, y }];
    for (let curridx = 0; curridx < coords.length; curridx++) {
        if (coords.length >= cloudsize) break;
        const { x: xx, y: yy } = coords[curridx];
        const dirs = [{ x: 0, y: -1 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 1, y: 0 }];
        for (let i = 4; i > 0; --i) {
            const swapidx = rn2(i);
            const tmp = dirs[swapidx];
            dirs[swapidx] = dirs[i - 1];
            dirs[i - 1] = tmp;
        }

        let nvalid = 0;
        for (const dir of dirs) {
            const nx = xx + dir.x;
            const ny = yy + dir.y;
            const loc = game.level?.at(nx, ny);
            if (!loc || !(ACCESSIBLE(loc.typ) || IS_POOL(loc.typ) || IS_LAVA(loc.typ))) continue;
            nvalid++;
            const alreadyPicked = coords.some(coord => coord.x === nx && coord.y === ny);
            if (nvalid === 4 && !rn2(2)) continue;
            if (!alreadyPicked) coords.push({ x: nx, y: ny });
            if (coords.length >= cloudsize) break;
        }
    }

    const ttl = Math.trunc((rn1(3, 4) * cloudsize) / coords.length);
    game.level.regions ??= [];
    const region = { type: 'gas_cloud', damage, visible: true, ttl, coords };
    game.level.regions.push(region);
    vision_reset();
    game.vision_full_recalc = 1;
    return region;
}

export function createGasCloudSelection(points, damage = 0) {
    const coords = [];
    for (const point of points || []) {
        if (Array.isArray(point)) coords.push({ x: point[0], y: point[1] });
        else if (point && Number.isFinite(point.x) && Number.isFinite(point.y))
            coords.push({ x: point.x, y: point.y });
    }
    game.level.regions ??= [];
    const region = { type: 'gas_cloud', damage, visible: true, coords };
    game.level.regions.push(region);
    vision_reset();
    game.vision_full_recalc = 1;
    return region;
}
