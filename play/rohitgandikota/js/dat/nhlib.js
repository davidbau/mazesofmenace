// dat/nhlib.js — the shared level-script library.
// C ref: dat/nhlib.lua
//
// Only the pieces the ported levels call live here: monkfoodshop() and
// hell_tweaks(). The align table shuffle at nhlib.lua's load time is spent
// inside load_special() (js/sp_lev.js), which stores it as game.nhlib_align;
// the small shims (math.random, percent, shuffle, d) stay local to each
// level file per the established convention.

import { lspo_terrain, lspo_object, l_selection_setpoint, l_selection_grow,
         l_selection_match, l_selection_or, l_selection_and,
         l_selection_randline } from '../sp_lev.js';
import { selection_new, selection_clone, selection_not, selection_numpoints,
         selection_filter_percent, selection_rndcoord,
         l_selection_iterate } from '../selvar.js';
import { rn2 } from '../rng.js';
import { game } from '../gstate.js';
import { depth } from '../dungeon.js';

/* dat/nhlib.lua math.random shim — 1-arg is 1+rn2(n), 2-arg is a+rn2(b+1-a) */
const mathrandom = (a, b) => (b === undefined) ? 1 + rn2(a) : a + rn2(b + 1 - a);
/* dat/nhlib.lua:43 percent() */
const percent = (threshold) => rn2(100) < threshold;

// dat/nhlib.lua:47 monkfoodshop() — Monks get a health food shop.
export function monkfoodshop() {
    if (game.urole?.name?.m === 'Monk')
        return 'health food shop';
    return 'food shop';
}

// dat/nhlib.lua:57 hell_tweaks() — tweaks to gehennom levels; might add
// random lava pools or a lava river. protected_area is a selection where no
// changes will be done.
export function hell_tweaks(protected_area) {
    const liquid = 'L';
    const ground = '.';
    const n_prot = selection_numpoints(protected_area);
    const prot = selection_not(selection_clone(protected_area)); /* :negate() */

    /* random pools */
    if (percent(20 + depth(game.u.uz))) {
        let pools = selection_new();
        const maxpools = 5 + mathrandom(depth(game.u.uz));
        for (let i = 1; i <= maxpools; i++)
            l_selection_setpoint(pools);                    /* pools:set() */

        pools = l_selection_or(pools,
            l_selection_grow(l_selection_setpoint(selection_new()), 'west'));
        pools = l_selection_or(pools,
            l_selection_grow(l_selection_setpoint(selection_new()), 'north'));
        pools = l_selection_or(pools,
            l_selection_grow(l_selection_setpoint(selection_new()), 'random'));

        pools = l_selection_and(pools, prot);

        if (percent(80)) {
            const poolground = l_selection_and(
                l_selection_grow(selection_clone(pools), 'all'), prot);
            const pval = mathrandom(1, 8) * 10;
            lspo_terrain(selection_filter_percent(poolground, pval), ground);
        }
        lspo_terrain(pools, liquid);
    }

    /* river */
    if (percent(50)) {
        let allrivers = selection_new();
        /* nhc.COLNO * nhc.ROWNO = 80 * 21; Lua / is float division but the
           comparison below only needs the value */
        const reqpts = ((80 * 21) - n_prot) / 12;
        let rpts = 0;
        let rivertries = 0;

        do {
            const floor = l_selection_match(ground);
            const a = selection_rndcoord(floor);
            const b = selection_rndcoord(floor);
            let lavariver = l_selection_randline(selection_new(),
                                                 a.x, a.y, b.x, b.y, 10);
            if (percent(50))
                lavariver = l_selection_grow(lavariver, 'north');
            if (percent(50))
                lavariver = l_selection_grow(lavariver, 'west');
            allrivers = l_selection_or(allrivers, lavariver);
            allrivers = l_selection_and(allrivers, prot);

            rpts = selection_numpoints(allrivers);
            rivertries = rivertries + 1;
        } while (!((rpts > reqpts) || (rivertries > 7)));

        if (percent(60)) {
            const prc = 10 * mathrandom(1, 6);
            let riverbanks = l_selection_grow(allrivers);
            riverbanks = l_selection_and(riverbanks, prot);
            lspo_terrain(selection_filter_percent(riverbanks, prc), ground);
        }

        lspo_terrain(allrivers, liquid);
    }

    /* replacing some walls with boulders */
    if (percent(20)) {
        const amount = 3 * mathrandom(1, 8);
        let bwalls = l_selection_or(
            selection_filter_percent(l_selection_match('.w.'), amount),
            selection_filter_percent(l_selection_match('.\nw\n.'), amount));
        bwalls = l_selection_and(bwalls, prot);
        l_selection_iterate(bwalls, (x, y) => {
            /* des.terrain(x, y, ".") — the coordinate form re-applies the
               map frame offset, sp_lev.c:5008 */
            lspo_terrain(l_selection_setpoint(selection_new(), x, y), '.');
            lspo_object('boulder', x, y);
        });
    }

    /* replacing some walls with iron bars */
    if (percent(20)) {
        const amount = 3 * mathrandom(1, 8);
        let fwalls = l_selection_or(
            selection_filter_percent(l_selection_match('.w.'), amount),
            selection_filter_percent(l_selection_match('.\nw\n.'), amount));
        fwalls = l_selection_and(
            l_selection_and(l_selection_grow(fwalls), l_selection_match('w')),
            prot);
        lspo_terrain(fwalls, 'F');
    }
}
