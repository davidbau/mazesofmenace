// botl.js — bottom status lines: rank titles.
// C ref: botl.c
//
// Ported so far: xlev_to_rank(), rank_to_xlev(), rank_of(), rank(),
// max_rank_sz(). The status-line rendering itself is still in display.js.

import { game } from './gstate.js';
import { roles } from './role.js';
import { str_start_is } from './hacklib.js';
import { NON_PM } from './const.js';

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
