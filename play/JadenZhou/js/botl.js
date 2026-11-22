// botl.js — bottom status lines: rank titles.
// C ref: botl.c
//
// Ported so far: xlev_to_rank(), rank_to_xlev(), rank_of(), rank(),
// max_rank_sz(), describe_level(). The status-line rendering itself is
// still in display.js.

import { game } from './gstate.js';
import { roles } from './role.js';
import { str_start_is } from './hacklib.js';
import { NON_PM, In_endgame } from './const.js';
import { depth, dunlev, on_level, endgamelevelname } from './dungeon.js';

// C ref: botl.c xlev_to_rank()
/* convert experience level (1..30) to rank index (0..8) */
export function xlev_to_rank(xlev) {
    /*
     *   1..2  => 0
     *   3..5  => 1
     *   6..9  => 2
     *  10..13 => 3
     *      ...
     *  26..29 => 7
     *    30   => 8
     * Conversion is precise but only partially reversible.
     */
    return (xlev <= 2) ? 0 : (xlev <= 30) ? Math.trunc((xlev + 2) / 4) : 8;
}

// C ref: botl.c rank_to_xlev()
/* convert rank index (0..8) to experience level (1..30) */
export function rank_to_xlev(rank) {
    /*
     *  0 =>  1..2
     *  1 =>  3..5
     *  2 =>  6..9
     *  3 => 10..13
     *      ...
     *  7 => 26..29
     *  8 =>   30
     * We return the low end of each range.
     */
    return (rank < 1) ? 1 : (rank < 2) ? 3
           : (rank < 8) ? ((rank * 4) - 2) : 30;
}

// C ref: botl.c rank_of()
export function rank_of(lev, monnum, female) {
    let role;
    let i;

    /* Find the role */
    for (i = 0; roles[i].name.m; i++)
        if (monnum === roles[i].mnum)
            break;
    role = roles[i];
    if (!role.name.m)
        role = game.urole;

    /* Find the rank */
    for (i = xlev_to_rank(lev); i >= 0; i--) {
        if (female && role.rank[i].f)
            return role.rank[i].f;
        if (role.rank[i].m)
            return role.rank[i].m;
    }

    /* Try the role name, instead */
    if (female && role.name.f)
        return role.name.f;
    else if (role.name.m)
        return role.name.m;
    return "Player";
}

// C ref: botl.c rank()
export function rank() {
    return rank_of(game.u.ulevel, game.urole.mnum, game.flags.female);
}

// C ref: botl.c title_to_mon()
/* monster index of the role whose rank title 'str' starts with; the rank
   index and title length are returned in 'out' (C: int pointers) */
export function title_to_mon(str, out) {
    let i, j;

    /* Loop through each of the roles */
    for (i = 0; roles[i].name.m; i++) {
        /* loop through each of the rank titles for role #i */
        for (j = 0; j < 9; j++) {
            if (roles[i].rank[j].m
                && str_start_is(str, roles[i].rank[j].m, true)) {
                if (out) {
                    out.rank_indx = j;
                    out.title_length = roles[i].rank[j].m.length;
                }
                return roles[i].mnum;
            }
            if (roles[i].rank[j].f
                && str_start_is(str, roles[i].rank[j].f, true)) {
                if (out) {
                    out.rank_indx = j;
                    out.title_length = roles[i].rank[j].f.length;
                }
                return roles[i].mnum;
            }
        }
    }
    if (out)
        out.title_length = 0;
    return NON_PM;
}

// C ref: botl.c max_rank_sz()
export function max_rank_sz() {
    const urole = game.urole;
    let i, r, maxr = 0;

    for (i = 0; i < 9; i++) {
        if (urole.rank[i].m && (r = urole.rank[i].m.length) > maxr)
            maxr = r;
        if (urole.rank[i].f && (r = urole.rank[i].f.length) > maxr)
            maxr = r;
    }
    game.mrank_sz = maxr;
    return;
}

/* C ref: botl.c condtests[CONDITION_COUNT] -- useropt, opt_in or out,
   enabled; the default value for enabled is !opt_in (status condition
   option changes aren't ported, so this keeps the defaults) */
const opt_in = 1, opt_out = 0; /* C ref: flag.h */
export const condtests = [
    { useropt: "barehanded",  opt: opt_in,  enabled: false },
    { useropt: "blind",       opt: opt_out, enabled: true },
    { useropt: "busy",        opt: opt_in,  enabled: false },
    { useropt: "conf",        opt: opt_out, enabled: true },
    { useropt: "deaf",        opt: opt_out, enabled: true },
    { useropt: "iron",        opt: opt_out, enabled: true },
    { useropt: "fly",         opt: opt_out, enabled: true },
    { useropt: "foodPois",    opt: opt_out, enabled: true },
    { useropt: "glowhands",   opt: opt_in,  enabled: false },
    { useropt: "grab",        opt: opt_out, enabled: true },
    { useropt: "hallucinat",  opt: opt_out, enabled: true },
    { useropt: "held",        opt: opt_in,  enabled: false },
    { useropt: "ice",         opt: opt_in,  enabled: false },
    { useropt: "lava",        opt: opt_out, enabled: true },
    { useropt: "levitate",    opt: opt_out, enabled: true },
    { useropt: "paralyzed",   opt: opt_in,  enabled: false },
    { useropt: "ride",        opt: opt_out, enabled: true },
    { useropt: "sleep",       opt: opt_in,  enabled: false },
    { useropt: "slime",       opt: opt_out, enabled: true },
    { useropt: "slip",        opt: opt_in,  enabled: false },
    { useropt: "stone",       opt: opt_out, enabled: true },
    { useropt: "strngl",      opt: opt_out, enabled: true },
    { useropt: "stun",        opt: opt_out, enabled: true },
    { useropt: "submerged",   opt: opt_in,  enabled: false },
    { useropt: "termIll",     opt: opt_out, enabled: true },
    { useropt: "tethered",    opt: opt_in,  enabled: false },
    { useropt: "trap",        opt: opt_in,  enabled: false },
    { useropt: "unconscious", opt: opt_in,  enabled: false },
    { useropt: "woundedlegs", opt: opt_in,  enabled: false },
    { useropt: "holding",     opt: opt_in,  enabled: false },
];

// C ref: botl.c describe_level()
/* 'dflgs' 1: append trailing space; 2: include dungeon branch name;
   returns [ret, buf] (C: fills buf, returns 1 for a special branch level) */
export function describe_level(dflgs) {
    const u = game.u;
    const topo = game.dungeon_topology;
    const addspace = (dflgs & 1) !== 0; /* (used to be unconditional) */
    let addbranch = (dflgs & 2) !== 0;  /* False: status, True: livelog */
    let ret = 1;
    let buf;

    if (topo.d_knox_level.dlevel && on_level(u.uz, topo.d_knox_level)) {
        /* Is_knox(&u.uz) */
        buf = `${game.dungeons[u.uz.dnum].dname}`;
        addbranch = false;
    } else if (u.uz.dnum === topo.d_quest_dnum) { /* In_quest(&u.uz) */
        buf = `Home ${dunlev(u.uz)}`;
    } else if (In_endgame(u.uz)) {
        /* [3.6.2: this used to be "Astral Plane" or generic "End Game"] */
        buf = endgamelevelname(depth(u.uz));
        if (!addbranch)
            buf = buf.replace("Plane of ", ""); /* just keep <element> */
        addbranch = false;
    } else {
        /* ports with more room may expand this one */
        if (!addbranch)
            buf = `${(u.uz.dnum === topo.d_tutorial_dnum) /* In_tutorial() */
                     ? "Tutorial" : "Dlvl"}:${String(depth(u.uz)).padEnd(2)}`;
        else
            buf = `level ${depth(u.uz)}`;
        ret = 0;
    }
    if (addbranch) {
        buf += `, ${game.dungeons[u.uz.dnum].dname}`;
        buf = buf.replace("The ", "the "); /* strsubst() */
    }
    if (addspace)
        buf += " ";
    return [ret, buf];
}
