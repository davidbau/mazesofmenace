// botl.js — the bottom status lines.
// C ref: src/botl.c
//
// Level descriptions, rank names, and status conditions.

import { game } from './gstate.js';
import { roles } from './role_data.js';
import { near_capacity } from './attrib.js';
import { NOT_HUNGRY, UNENCUMBERED, SICK_VOMITABLE, SICK_NONVOMITABLE,
         TT_LAVA } from './const.js';
import { Blind, Deaf, Levitation, Flying } from './youprop.js';
import { Is_knox_level, In_quest, In_endgame, In_tutorial } from './const.js';
import { depth, endgamelevelname } from './dungeon.js';

// src/botl.c describe_level(), return the output buffer and classification.
// The optional level replaces C callers' temporary assignment to u.uz.
export function describe_level(dflgs, lev = game.u.uz) {
    const addspace = !!(dflgs & 1);
    let addbranch = !!(dflgs & 2), text, special = 1;
    if (Is_knox_level(lev)) {
        text = game.dungeons[lev.dnum].dname;
        addbranch = false;
    } else if (In_quest(lev)) {
        text = `Home ${lev.dlevel}`;
    } else if (In_endgame(lev)) {
        text = endgamelevelname(depth(lev));
        if (!addbranch)
            text = text.replace('Plane of ', '');
        addbranch = false;
    } else {
        text = addbranch ? `level ${depth(lev)}`
            : `${In_tutorial(lev) ? 'Tutorial' : 'Dlvl'}:${String(depth(lev)).padEnd(2)}`;
        special = 0;
    }
    if (addbranch)
        text = `${text}, ${game.dungeons[lev.dnum].dname}`.replace('The ', 'the ');
    if (addspace)
        text += ' ';
    return { text, special };
}

/* src/botl.c:817 condtests[] — one row per status condition. `enabled`
   defaults to !opt_in and the 'status condition fields' option edits it; the
   options menu reports how many are on. Only id/useropt/optin/enabled are
   carried: the per-turn `test` fields belong to the status line, which is not
   driven from this table yet. */
export const condtests = [
    { id: 'bl_bareh',     useropt: 'barehanded',  rank: 20, optin: true,  enabled: false },
    { id: 'bl_blind',     useropt: 'blind',       rank: 10, optin: false, enabled: true },
    { id: 'bl_busy',      useropt: 'busy',        rank: 20, optin: true,  enabled: false },
    { id: 'bl_conf',      useropt: 'conf',        rank: 10, optin: false, enabled: true },
    { id: 'bl_deaf',      useropt: 'deaf',        rank: 10, optin: false, enabled: true },
    { id: 'bl_elf_iron',  useropt: 'iron',        rank: 15, optin: false, enabled: true },
    { id: 'bl_fly',       useropt: 'fly',         rank: 10, optin: false, enabled: true },
    { id: 'bl_foodpois',  useropt: 'foodPois',    rank: 6,  optin: false, enabled: true },
    { id: 'bl_glowhands', useropt: 'glowhands',   rank: 20, optin: true,  enabled: false },
    { id: 'bl_grab',      useropt: 'grab',        rank: 2,  optin: false, enabled: true },
    { id: 'bl_hallu',     useropt: 'hallucinat',  rank: 10, optin: false, enabled: true },
    { id: 'bl_held',      useropt: 'held',        rank: 20, optin: true,  enabled: false },
    { id: 'bl_icy',       useropt: 'ice',         rank: 20, optin: true,  enabled: false },
    { id: 'bl_inlava',    useropt: 'lava',        rank: 8,  optin: false, enabled: true },
    { id: 'bl_lev',       useropt: 'levitate',    rank: 10, optin: false, enabled: true },
    { id: 'bl_parlyz',    useropt: 'paralyzed',   rank: 20, optin: true,  enabled: false },
    { id: 'bl_ride',      useropt: 'ride',        rank: 10, optin: false, enabled: true },
    { id: 'bl_sleeping',  useropt: 'sleep',       rank: 20, optin: true,  enabled: false },
    { id: 'bl_slime',     useropt: 'slime',       rank: 6,  optin: false, enabled: true },
    { id: 'bl_slippery',  useropt: 'slip',        rank: 20, optin: true,  enabled: false },
    { id: 'bl_stone',     useropt: 'stone',       rank: 6,  optin: false, enabled: true },
    { id: 'bl_strngl',    useropt: 'strngl',      rank: 4,  optin: false, enabled: true },
    { id: 'bl_stun',      useropt: 'stun',        rank: 10, optin: false, enabled: true },
    { id: 'bl_submerged', useropt: 'submerged',   rank: 15, optin: true,  enabled: false },
    { id: 'bl_termill',   useropt: 'termIll',     rank: 6,  optin: false, enabled: true },
    { id: 'bl_tethered',  useropt: 'tethered',    rank: 20, optin: true,  enabled: false },
    { id: 'bl_trapped',   useropt: 'trap',        rank: 20, optin: true,  enabled: false },
    { id: 'bl_unconsc',   useropt: 'unconscious', rank: 20, optin: true,  enabled: false },
    { id: 'bl_woundedl',  useropt: 'woundedlegs', rank: 20, optin: true,  enabled: false },
    { id: 'bl_holding',   useropt: 'holding',     rank: 20, optin: true,  enabled: false },
];

// src/botl.c:298 xlev_to_rank()
//
//   1..2 => 0,  3..5 => 1,  6..9 => 2,  10..13 => 3, ... 26..29 => 7, 30 => 8
export function xlev_to_rank(xlev) {
    return (xlev <= 2) ? 0 : (xlev <= 30) ? Math.trunc((xlev + 2) / 4) : 8;
}

// src/botl.c:313 rank_to_xlev()
//
// Return the first experience level belonging to rank 0..8.
export function rank_to_xlev(rank) {
    return (rank < 1) ? 1 : (rank < 2) ? 3
           : (rank < 8) ? rank * 4 - 2 : 30;
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

// src/botl.c:402 max_rank_sz()
export function max_rank_sz() {
    let r, maxr = 0;
    for (let i = 0; i < 9; i++) {
        if (game.urole.rank[i]?.m && (r = game.urole.rank[i].m.length) > maxr)
            maxr = r;
        if (game.urole.rank[i]?.f && (r = game.urole.rank[i].f.length) > maxr)
            maxr = r;
    }
    game.mrank_sz = maxr;
    return;
}

// src/eat.c hu_stat[] retains its legacy padding.  The tty status-field path
// trims that padding before it joins hunger to a following condition.
export const hu_stat = [
    "Satiated", "        ", "Hungry  ", "Weak    ",
    "Fainting", "Fainted ", "Starved "
];

// src/botl.c:11 enc_stat[]
export const enc_stat = [
    "",         "Burdened",  "Stressed",
    "Strained", "Overtaxed", "Overloaded"
];

// src/botl.c:781 conditions[]/:1333 cond_cmp(), tty/wintty.c:5150.
// Conditions follow hunger and capacity, sorted by rank then useroption.
export function bot_conditions() {
    const u = game.u;
    const intr = u.intrinsic || {};
    const props = u.uprops || {};
    let cond = '';
    if (u.uhs != null && u.uhs !== NOT_HUNGRY)
        cond += ' ' + hu_stat[u.uhs].trimEnd();
    /* encumber_msg() prints before botl is marked dirty.  The tty therefore
       keeps the preceding capacity condition while that message is blocked
       at --More--; display.js otherwise recomputes every status line from
       live state and would reveal the new condition one screen too early. */
    const cap = Number.isInteger(game._deferred_status_capacity)
        ? game._deferred_status_capacity
        : game._encumber_status_stale ? game.oldcap : near_capacity();
    if (cap > UNENCUMBERED) cond += ' ' + enc_stat[cap];
    if (intr.HStrangled) cond += ' Strngl';
    const sick_type = game._deferred_status_sick_type ?? u.usick_type;
    if (sick_type & SICK_VOMITABLE) cond += ' FoodPois';
    if (props.SLIMED) cond += ' Slime';
    if (props.STONED) cond += ' Stone';
    if (sick_type & SICK_NONVOMITABLE) cond += ' TermIll';
    if (u.utrap && u.utraptype === TT_LAVA) cond += ' InLava';
    const blind = typeof game._deferred_status_blind === 'boolean'
        ? game._deferred_status_blind : Blind();
    if (blind)
        cond += ' Blind';
    if (intr.HConfusion || props.CONFUSION) cond += ' Conf';
    if (Deaf()) cond += ' Deaf';
    if (Flying()) cond += ' Fly';
    if ((intr.HHallucination || props.HALLUC) && !props.HALLUC_RES)
        cond += ' Hallu';
    if (Levitation()) cond += ' Lev';
    if (u.usteed) cond += ' Ride';
    if (intr.HStun || props.STUNNED) cond += ' Stun';
    return cond;
}
