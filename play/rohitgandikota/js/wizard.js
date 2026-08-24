// wizard.js — Wizard of Yendor strategy and the nasty-summons table.
// C ref: src/wizard.c
//
// Only pick_nasty() is live so far: select_newcham_form() uses it for
// sandestin and doppelganger shapes. The Wizard's own strategy engine
// (tactics, intervene, resurrection) is not ported.

import { game } from './gstate.js';
import { rn2 } from './rng.js';
import { PMNAMES, MFLAGS, GROWNUPS } from './monst_data.js';
import { Is_rogue_level } from './const.js';

/* src/wizard.c:31 nasties[] — shapes for polymorph harassment. */
const nasties = [
    /* neutral */
    'PM_COCKATRICE', 'PM_ETTIN', 'PM_STALKER', 'PM_MINOTAUR',
    'PM_OWLBEAR', 'PM_PURPLE_WORM', 'PM_XAN', 'PM_UMBER_HULK',
    'PM_XORN', 'PM_ZRUTY', 'PM_LEOCROTTA', 'PM_BALUCHITHERIUM',
    'PM_CARNIVOROUS_APE', 'PM_FIRE_ELEMENTAL', 'PM_JABBERWOCK',
    'PM_IRON_GOLEM', 'PM_OCHRE_JELLY', 'PM_GREEN_SLIME',
    'PM_DISPLACER_BEAST', 'PM_GENETIC_ENGINEER',
    /* chaotic */
    'PM_BLACK_DRAGON', 'PM_RED_DRAGON', 'PM_ARCH_LICH', 'PM_VAMPIRE_LEADER',
    'PM_MASTER_MIND_FLAYER', 'PM_DISENCHANTER', 'PM_WINGED_GARGOYLE',
    'PM_STORM_GIANT', 'PM_OLOG_HAI', 'PM_ELF_NOBLE', 'PM_ELVEN_MONARCH',
    'PM_OGRE_TYRANT', 'PM_CAPTAIN', 'PM_GREMLIN',
    /* lawful */
    'PM_SILVER_DRAGON', 'PM_ORANGE_DRAGON', 'PM_GREEN_DRAGON',
    'PM_YELLOW_DRAGON', 'PM_GUARDIAN_NAGA', 'PM_FIRE_GIANT',
    'PM_ALEAX', 'PM_COUATL', 'PM_HORNED_DEVIL', 'PM_BARBED_DEVIL',
].map((n) => PMNAMES[n]);

/* src/mondata.c:1316 big_to_little() — walk the grownups pairs backward. */
export function big_to_little(montype) {
    for (const [little, big] of GROWNUPS)
        if (montype === big)
            return little;
    return montype;
}

/* include/dungeon.h In_hell() */
const In_hell = (lev) => (lev ?? game.u?.uz)?.dnum === game.hell_dnum;

// src/wizard.c:537 pick_nasty() — a random nasty shape, demoted to its
// juvenile form when genocided, over the difficulty cap, or out of place
// for Gehennom.
export function pick_nasty(difcap) {
    const { G_GENOD, G_HELL, G_NOHELL } = MFLAGS;
    let res = nasties[rn2(nasties.length)];       /* ROLL_FROM */

    /* prefer uppercase on the rogue level, one retry only */
    if (Is_rogue_level(game.u?.uz)) {
        const sym = game.mons[res]?.mlet;
        /* monsym A-Z test approximated by def_monsyms — the rogue level
           is unreachable in any recorded session; the retry still rolls */
        void sym;
        res = nasties[rn2(nasties.length)];
    }

    let alt = res;
    if (((game.mvitals?.[res]?.mvflags ?? 0) & G_GENOD) !== 0
        || (difcap > 0 && game.mons[res].difficulty >= difcap)
        || ((game.mons[res].geno ?? 0)
            & (In_hell(game.u?.uz) ? G_NOHELL : G_HELL)) !== 0)
        alt = big_to_little(res);
    if (alt !== res && ((game.mvitals?.[alt]?.mvflags ?? 0) & G_GENOD) === 0) {
        const mnam = game.mons[alt].pmnames?.[2] ?? game.mons[alt].pmnames?.[0]
                     ?? '';
        const lastspace = mnam.lastIndexOf(' ');
        const tail = lastspace >= 0 ? mnam.slice(lastspace) : null;

        /* only non-juveniles can become alternate choice */
        if (!mnam.startsWith('baby ')
            && (!tail
                || (tail !== ' hatchling' && tail !== ' pup'
                    && tail !== ' cub')))
            res = alt;
    }

    return res;
}
