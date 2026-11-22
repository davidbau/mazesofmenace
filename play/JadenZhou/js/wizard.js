// wizard.js — the Wizard of Yendor's tricks and the nasty monsters.
// C ref: wizard.c — nasties[], pick_nasty().
//
// Not ported yet: the rest of wizard.c (the Wizard's AI, amulet(),
// nasty(), cuss(), resurrect(), intervene()).

import { game } from './gstate.js';
import { ROLL_FROM } from './rng.js';
import * as MM from './monsters.js';
import { mons, G_HELL, G_NOHELL } from './monsters.js';
import { NEUTRAL, G_GENOD, Is_rogue_level } from './const.js';
import { In_hell } from './dungeon.js';
import { big_to_little } from './mondata.js';
import { def_monsyms } from './drawing.js';

// C ref: wizard.c nasties[]
const nasties = [
    /* neutral */
    MM.PM_COCKATRICE, MM.PM_ETTIN, MM.PM_STALKER, MM.PM_MINOTAUR,
    MM.PM_OWLBEAR, MM.PM_PURPLE_WORM, MM.PM_XAN, MM.PM_UMBER_HULK,
    MM.PM_XORN, MM.PM_ZRUTY, MM.PM_LEOCROTTA, MM.PM_BALUCHITHERIUM,
    MM.PM_CARNIVOROUS_APE, MM.PM_FIRE_ELEMENTAL, MM.PM_JABBERWOCK,
    MM.PM_IRON_GOLEM, MM.PM_OCHRE_JELLY, MM.PM_GREEN_SLIME,
    MM.PM_DISPLACER_BEAST, MM.PM_GENETIC_ENGINEER,
    /* chaotic */
    MM.PM_BLACK_DRAGON, MM.PM_RED_DRAGON, MM.PM_ARCH_LICH, MM.PM_VAMPIRE_LEADER,
    MM.PM_MASTER_MIND_FLAYER, MM.PM_DISENCHANTER, MM.PM_WINGED_GARGOYLE,
    MM.PM_STORM_GIANT, MM.PM_OLOG_HAI, MM.PM_ELF_NOBLE, MM.PM_ELVEN_MONARCH,
    MM.PM_OGRE_TYRANT, MM.PM_CAPTAIN, MM.PM_GREMLIN,
    /* lawful */
    MM.PM_SILVER_DRAGON, MM.PM_ORANGE_DRAGON, MM.PM_GREEN_DRAGON,
    MM.PM_YELLOW_DRAGON, MM.PM_GUARDIAN_NAGA, MM.PM_FIRE_GIANT,
    MM.PM_ALEAX, MM.PM_COUATL, MM.PM_HORNED_DEVIL, MM.PM_BARBED_DEVIL,
    /* (Archons, titans, ki-rin, and golden nagas are suitably nasty, but
       they're summoners so would aggravate excessive summoning) */
];

// monsym(ptr): def_monsyms[ptr->mlet].sym
function monsym(ptr) { return def_monsyms[ptr.mlet]; }

// C ref: wizard.c pick_nasty()
/* also used by newcham() */
export function pick_nasty(
    difcap) /* if non-zero, try to make difficulty be lower than this */
{
    let alt, res = ROLL_FROM(nasties);

    /* To do?  Possibly should filter for appropriate forms when
     * in the elemental planes or surrounded by water or lava.
     *
     * We want monsters represented by uppercase on rogue level,
     * but we don't try very hard.
     */
    if (Is_rogue_level(game.u.uz)
        && !('A' <= monsym(mons[res]) && monsym(mons[res]) <= 'Z'))
        res = ROLL_FROM(nasties);

    /* if genocided or too difficult or out of place, try a substitute
       when a suitable one exists
           arch-lich -> master lich,
           master mind flayer -> mind flayer,
       but the substitutes are likely to be genocided too */
    alt = res;
    if ((game.mvitals[res].mvflags & G_GENOD) !== 0
        || (difcap > 0 && mons[res].difficulty >= difcap)
         /* note: nasty() -> makemon() ignores G_HELL|G_NOHELL;
            arch-lich and master lich are both flagged as hell-only;
            this filtering demotes arch-lich to master lich when
            outside of Gehennom (unless the latter has been genocided) */
        || (mons[res].geno & (In_hell(game.u.uz) ? G_NOHELL : G_HELL)) !== 0)
        alt = big_to_little(res);
    if (alt !== res && (game.mvitals[alt].mvflags & G_GENOD) === 0) {
        const mnam = mons[alt].pmnames[NEUTRAL],
            sp = mnam.lastIndexOf(' '),
            lastspace = sp >= 0 ? mnam.slice(sp) : null;

        /* only non-juveniles can become alternate choice */
        if (mnam.slice(0, 5) !== 'baby '
            && (!lastspace
                || (lastspace !== ' hatchling'
                    && lastspace !== ' pup'
                    && lastspace !== ' cub')))
            res = alt;
    }

    return res;
}
