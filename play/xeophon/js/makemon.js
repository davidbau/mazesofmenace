import { game } from './gstate.js';
import { Is_airlevel, Is_firelevel, Is_earthlevel, Is_waterlevel } from './const.js';
import { PM_AIR_ELEMENTAL, PM_FIRE_ELEMENTAL, PM_EARTH_ELEMENTAL, PM_WATER_ELEMENTAL } from './permonst.js';

// makemon.c:golemhp. These species use fixed HP regardless of level.
export const GOLEM_HP = new Map([
    ['straw golem', 20], ['paper golem', 20], ['rope golem', 30], ['gold golem', 60],
    ['leather golem', 40], ['wood golem', 50], ['flesh golem', 40], ['clay golem', 70],
    ['stone golem', 100], ['glass golem', 80], ['iron golem', 120],
]);

// makemon.c:is_home_elemental only recognizes each elemental's own plane.
export function isHomeElemental(species) {
    switch (species.pm) {
    case PM_AIR_ELEMENTAL: return Is_airlevel(game.u.uz);
    case PM_FIRE_ELEMENTAL: return Is_firelevel(game.u.uz);
    case PM_EARTH_ELEMENTAL: return Is_earthlevel(game.u.uz);
    case PM_WATER_ELEMENTAL: return Is_waterlevel(game.u.uz);
    default: return false;
    }
}
