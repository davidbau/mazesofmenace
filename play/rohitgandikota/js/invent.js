// invent.js — inventory and the look-here command.
// C ref: src/invent.c

import { game } from './gstate.js';
import { pline } from './display.js';

// include/hack.h — command result flags. ECMD_TIME means the command consumed
// a move, which is what makes moveloop advance svm.moves.
export const ECMD_OK = 0;
export const ECMD_TIME = 1;

// src/invent.c:4104 look_here()
//
// Only the empty-square path is ported so far: with no objects, no dungeon
// feature and not blind, C prints "You see no objects here." and returns
// ECMD_OK — so looking does NOT consume a turn. Objects, dungeon features and
// engravings join this function as those subsystems land.
export function look_here(obj_cnt, lhflags) {
    const Blind = !!game.u?.ublind;
    const verb = Blind ? 'feel' : 'see';

    /* no objects at the hero's square yet, because objects are not ported */
    You(`${verb} no objects here.`);
    return Blind ? ECMD_TIME : ECMD_OK;
}

// src/invent.c:4319 dolook()
export function dolook() {
    return look_here(0, 0);
}

// src/pline.c You() — "You " prefix on a message.
function You(msg) {
    pline(`You ${msg}`);
}
