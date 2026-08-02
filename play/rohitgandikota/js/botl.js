// botl.js — the bottom status lines.
// C ref: src/botl.c
//
// Only rank_of() so far, which both the status line and the ^X window need.
// It used to be approximated as `urole.rank.m` against a stub role record; the
// real table in js/role_data.js is an array of nine tiers.

import { game } from './gstate.js';
import { roles } from './role_data.js';
import { near_capacity } from './attrib.js';
import { NOT_HUNGRY, UNENCUMBERED, SICK_VOMITABLE, SICK_NONVOMITABLE } from './const.js';

// src/botl.c:298 xlev_to_rank()
//
//   1..2 => 0,  3..5 => 1,  6..9 => 2,  10..13 => 3, ... 26..29 => 7, 30 => 8
export function xlev_to_rank(xlev) {
    return (xlev <= 2) ? 0 : (xlev <= 30) ? Math.trunc((xlev + 2) / 4) : 8;
}

// src/botl.c:332 rank_of()
export function rank_of(lev, role, female) {
    const r = role || game.urole;
    const tiers = Array.isArray(r?.rank) ? r.rank : [];

    for (let i = xlev_to_rank(lev); i >= 0; i--) {
        if (female && tiers[i]?.f) return tiers[i].f;
        if (tiers[i]?.m) return tiers[i].m;
    }
    if (female && r?.name?.f) return r.name.f;
    if (r?.name?.m) return r.name.m;
    return 'Player';
}

// src/botl.c:361 rank()
export function rank() {
    return rank_of(game.u.ulevel, game.urole, !!game.flags.female);
}

// src/eat.c hu_stat[] — trailing spaces are in the C array and are printed
// verbatim by bot2str's " %s" (they vanish only at end-of-line).
export const hu_stat = [
    "Satiated", "        ", "Hungry  ", "Weak    ",
    "Fainting", "Fainted ", "Starved "
];

// src/botl.c:11 enc_stat[]
export const enc_stat = [
    "",         "Burdened",  "Stressed",
    "Strained", "Overtaxed", "Overloaded"
];

// src/botl.c:164 bot2str() condition tail — worst ones first.
export function bot_conditions() {
    const u = game.u;
    const intr = u.intrinsic || {};
    const props = u.uprops || {};
    let cond = '';
    if (props.STONED) cond += ' Stone';
    if (props.SLIMED) cond += ' Slime';
    if (props.STRANGLED) cond += ' Strngl';
    if (u.usick_type & SICK_VOMITABLE) cond += ' FoodPois';
    if (u.usick_type & SICK_NONVOMITABLE) cond += ' TermIll';
    if (u.uhs != null && u.uhs !== NOT_HUNGRY) cond += ' ' + hu_stat[u.uhs];
    const cap = near_capacity();
    if (cap > UNENCUMBERED) cond += ' ' + enc_stat[cap];
    if (u.ublind || intr.HBlinded) cond += ' Blind';
    if (intr.HDeaf || props.DEAF) cond += ' Deaf';
    if (intr.HStun || props.STUNNED) cond += ' Stun';
    if (intr.HConfusion || props.CONFUSION) cond += ' Conf';
    if (intr.HHallucination) cond += ' Hallu';
    if (props.LEVITATION || intr.HLevitation) cond += ' Lev';
    else if (props.FLYING || intr.HFlying) cond += ' Fly';
    if (u.usteed) cond += ' Ride';
    return cond;
}
