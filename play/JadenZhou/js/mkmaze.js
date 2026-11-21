// mkmaze.js — maze levels and terrain setters.
// C ref: mkmaze.c — set_levltyp, set_levltyp_lit.
//
// Not ported yet: the maze generator (makemaz, walkfrom, ...) and the rest
// of mkmaze.c. (mklev.js has a simplified bad_location/place_lregion.)

import { game } from './gstate.js';
import { rn2 } from './rng.js';
import {
    STONE, MAX_TYPE, SDOOR, AIR, LADDER, STAIRS, ICE, isok, IS_LAVA,
} from './const.js';

// C ref: mkmaze.c makemaz()
/* special levels (des-file/Lua protofiles), dungeon fill levels (e.g. the
   Gnomish Mines' minefill) and random mazes */
export function makemaz(s) {
    throw new Error(`makemaz("${s}"): special level and maze creation not ported yet`);
}

// rm.h SET_LIT_RANDOM, SET_LIT_NOCHANGE
export const SET_LIT_RANDOM = -1;
export const SET_LIT_NOCHANGE = -2;

// C ref: rm.h CAN_OVERWRITE_TERRAIN()
function CAN_OVERWRITE_TERRAIN(ttyp) {
    return (game.iflags?.debug_overwrite_stairs || !(ttyp === LADDER || ttyp === STAIRS));
}

// C ref: mkmaze.c set_levltyp()
/* change map location terrain type during level creation (not used
   during gameplay); updates level's feature counts */
export function set_levltyp(x, y, newtyp) {
    if (isok(x, y) && newtyp >= STONE && newtyp < MAX_TYPE) {
        const loc = game.level.at(x, y);
        const oldtyp = loc.typ;

        /* hack for secret doors in garden theme rooms */
        if (oldtyp === SDOOR && newtyp === AIR) {
            /* levl[][].typ stays SDOOR rather than change to AIR */
            loc.arboreal_sdoor = 1;
            return true;
        }

        if (CAN_OVERWRITE_TERRAIN(oldtyp)) {
            /* is_ice(x, y): the drawbridge case is not ported */
            const was_ice = (oldtyp === ICE);

            loc.typ = newtyp;

            if (IS_LAVA(newtyp)) /* [what about IS_LAVA(oldtyp)=>.lit = 0?] */
                loc.lit = true;
            if (was_ice && newtyp !== ICE) {
                /* obj_ice_effects() and spot_stop_timers(): not ported
                   (no objects or timers exist during level creation yet) */
            }
            /* count_level_features() for fountains and sinks: mklev()
               recounts them after makelevel() (recount_level_features) */
            return true;
        }
    }
    return false;
}

// C ref: mkmaze.c set_levltyp_lit()
/* set map terrain type and light state */
export function set_levltyp_lit(x, y, typ, lit) {
    const ret = set_levltyp(x, y, typ);

    if (ret && isok(x, y)) {
        if (lit !== SET_LIT_NOCHANGE) {
            if (IS_LAVA(typ))
                lit = 1;
            else if (lit === SET_LIT_RANDOM)
                lit = rn2(2);

            game.level.at(x, y).lit = !!lit;
        }
    }
    return ret;
}
