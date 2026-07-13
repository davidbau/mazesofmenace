// sit.js — #sit command (floor / fountain subset).
// C ref: sit.c dosit; dungeon.c surface (fountain branch).
//
// Branch envelope: reachable floor, no steed/trap/pool specials →
// default "Having fun sitting on the <surface>?" + ECMD_TIME.
// Deferred: steed, hider, ustuck, OBJ_AT picnic, traps, water/gremlin,
// sink/altar/grave/stairs/ladder/lava/ice/drawbridge/throne, lay_an_egg.

import { game } from './gstate.js';
import { pline } from './display.js';
import {
    ECMD_OK, ECMD_TIME,
    IS_FOUNTAIN, IS_AIR, IS_ALTAR, IS_GRAVE, IS_ROOM, IS_WALL, IS_DOOR,
    CLOUD,
} from './const.js';
import { objects_at } from './mkobj.js';

/**
 * C ref: dungeon.c surface — enough for fountain / room floor.
 */
function surface(x, y) {
    const loc = game.level?.at(x, y);
    const typ = loc?.typ ?? 0;
    if (IS_AIR(typ)) return typ === CLOUD ? 'cloud' : 'air';
    if (IS_FOUNTAIN(typ)) return 'fountain';
    if (IS_ALTAR(typ)) return 'altar';
    if (IS_GRAVE(typ)) return 'headstone';
    if (IS_WALL(typ)) return 'wall';
    if (IS_DOOR(typ)) return 'doorway';
    if (IS_ROOM(typ)) return 'floor';
    return 'ground';
}

/**
 * C ref: sit.c dosit — #sit
 */
export async function dosit() {
    const u = game.u || {};
    if (u.usteed) {
        await pline('You are already sitting on your steed.');
        return ECMD_OK;
    }
    if (u.Levitation) {
        await pline('You tumble in place.');
        return ECMD_OK;
    }
    // can_reach_floor / uswallow / ustuck deferred

    // OBJ_AT sit-on-object path: only when a pile exists; fountain sit in
    // seed0106 has none → having-fun. If objects present, still take time
    // with a simple sit message (full picnic body deferred).
    const otmp = objects_at(u.ux, u.uy);
    if (otmp) {
        await pline(`You sit on ${otmp.quan > 1 ? 'them' : 'it'}.`);
        return ECMD_TIME;
    }

    // trap / pool / sink / altar / … specials deferred → default
    await pline(`Having fun sitting on the ${surface(u.ux, u.uy)}?`);
    return ECMD_TIME;
}
