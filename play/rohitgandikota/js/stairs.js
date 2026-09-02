// stairs.js — mirrors nethack-c/upstream/src/stairs.c
//
// The stairs themselves live on the game.stairs linked list, written by
// js/mklev.js stairway_add(). js/dog.js keeps a file-local On_stairs() from
// before this file existed.

import { game } from './gstate.js';

// src/stairs.c:40 stairway_at()
export function stairway_at(x, y) {
    let tmp = game.stairs;
    while (tmp && !(tmp.sx === x && tmp.sy === y))
        tmp = tmp.next;
    return tmp;
}

// src/stairs.c:148 On_stairs()
export function On_stairs(x, y) {
    return stairway_at(x, y) != null;
}

// src/stairs.c:180 known_branch_stairs() — a branch staircase the hero has
// used to visit the branch.
export function known_branch_stairs(sway) {
    return !!(sway && sway.tolev.dnum !== (game.u?.uz?.dnum ?? 0)
              && sway.u_traversed);
}

// src/stairs.c:187 stairs_description()
//
// stcase true: "staircase"/"ladder", always singular; false: "stairs"/"ladder".
//
// The u_traversed "to level %d" suffix needs depth(); in the main dungeon
// depth is just tolev.dlevel, and the quest/Knox special-depth arm needs
// dungeon data this port does not track, so that sub-arm is recorded. The
// Amulet arms are written out in full; they are plain strings.
export function stairs_description(sway, stcase) {
    const tolev = sway.tolev;
    const stairs = sway.isladder ? "ladder" : stcase ? "staircase" : "stairs";
    const updown = sway.up ? "up" : "down";
    const uz = game.u?.uz || { dnum: 0, dlevel: 1 };
    let outbuf;

    if (!known_branch_stairs(sway)) {
        /* ordinary stairs or branch stairs to not-yet-visited branch */
        outbuf = `${stairs} ${updown}`;
        if (sway.u_traversed) {
            const dgn = game.dungeons?.[tolev.dnum];
            const specialDepth = tolev.dnum === game.quest_dnum
                || dgn?.num_dunlevs === 1;
            const shownLevel = specialDepth
                ? tolev.dlevel
                : (dgn?.depth_start ?? 1) + tolev.dlevel - 1;
            outbuf += ` to level ${shownLevel}`;
        }
    } else if (uz.dnum === 0 && uz.dlevel === 1 && sway.up) {
        /* stairs up from level one are a special case; the remote side
           varies depending on whether the Amulet is being carried */
        const amulet = !!game.u?.uhave?.amulet;
        if (!amulet) {
            outbuf = `${stairs} ${updown} out of the dungeon`;
        } else {
            /* the Planes tests need on_level() against the endgame levels;
               carrying the Amulet is not reachable yet */
            note_unported_stairs('stairs_description:amulet_planes');
            outbuf = `branch ${stairs} ${updown} to the end game`;
        }
    } else {
        /* known branch stairs; destination dungeon name */
        let dname = game.dungeons?.[tolev.dnum]?.dname || 'unknown dungeon';
        if (dname.startsWith('The '))
            dname = `the ${dname.slice(4)}`;
        outbuf = `branch ${stairs} ${updown} to ${dname}`;
    }
    return outbuf;
}

function note_unported_stairs(what) {
    (game.unported ||= new Set()).add('stairs:' + what);
}

// src/stairs.c:154 On_ladder()
export function On_ladder(x, y) {
    const stway = stairway_at(x, y);
    return !!(stway && stway.isladder);
}
