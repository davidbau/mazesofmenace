// fountain.js — fountains.
// C ref: src/fountain.c
//
// dipfountain() and dryup() so far: the dip effects that draw (the rnd(30)
// table, the dryup rn2(3)) run for real, with the summon/gem/gush arms
// recorded until their machinery lands. drinkfountain() is not here yet.

import { game } from './gstate.js';
import { rn2, rnd } from './rng.js';
import { pline } from './display.js';
import { You, You_feel, pline_The } from './pline.js';
import { newsym } from './display.js';
import { IS_FOUNTAIN, ROOM, A_WIS, A_CON } from './const.js';
import { ONAMES } from './objects_data.js';
import { OCLASSES } from './objects_data.js';
import { water_damage } from './trap.js';
import { exercise } from './attrib.js';
import { update_inventory } from './invent.js';
import { curse, uncurse } from './mkobj.js';
import { tty_yn_function } from './tty/topl.js';

function note_unported_fountain(what) {
    (game.unported ||= new Set()).add('fountain:' + what);
}

// src/fountain.c:201 dryup() — 1 in 3 dips dries the fountain.
export async function dryup(x, y, isyou) {
    const loc = game.level.at(x, y);
    if (IS_FOUNTAIN(loc.typ)
        && (!rn2(3) || (loc.looted & 2 /* F_WARNED */))) {
        /* in_town watchman warning — towns are not modelled */
        if (isyou && game.wizard) {
            const ans = await tty_yn_function('Dry up fountain?', 'yn', 'n');
            if (ans === 'n')
                return;
        }
        await pline_The('fountain dries up!');
        /* replace the fountain with ordinary floor */
        loc.typ = ROOM;
        loc.flags = 0;
        loc.looted = 0;
        loc.blessedftn = 0;
        if (game.level.flags)
            game.level.flags.nfountains =
                Math.max(0, (game.level.flags.nfountains || 1) - 1);
        newsym(x, y);
    }
}

// src/fountain.c:64 dowaterdemon() — the fountain unleashes a water demon;
// low-level heroes have a small chance of a wish instead.
async function dowaterdemon() {
    const { makemon } = await import('./makemon.js');
    const { a_monnam } = await import('./do_name.js');
    const { PMNAMES } = await import('./monst_data.js');
    const { MM_NOMSG, NO_TRAP_FLAGS } = await import('./const.js');
    const { level_difficulty } = await import('./dungeon.js');
    const { mintrap } = await import('./trap.js');
    const { t_at } = await import('./mon.js');
    const G_GONE = 0x03; /* G_GENOD | G_EXTINCT */

    if (!((game.mvitals?.[PMNAMES.PM_WATER_DEMON]?.mvflags ?? 0) & G_GONE)) {
        const mtmp = makemon(game.mons[PMNAMES.PM_WATER_DEMON],
                             game.u.ux, game.u.uy, MM_NOMSG);
        if (mtmp) {
            if (!game.u.ublind)
                await You(`unleash ${a_monnam(mtmp)}!`);
            else
                await You_feel('the presence of evil.');

            /* Give those on low levels a (slightly) better chance of
               survival */
            if (rnd(100) > (80 + level_difficulty())) {
                note_unported_fountain('dowaterdemon:wish');
            } else if (t_at(mtmp.mx, mtmp.my)) {
                await mintrap(mtmp, NO_TRAP_FLAGS);
            }
        }
    } else {
        await pline_The('fountain bubbles furiously for a moment, then calms.');
    }
}

// src/fountain.c:93 dowaternymph()
async function dowaternymph() {
    const { makemon } = await import('./makemon.js');
    const { a_monnam } = await import('./do_name.js');
    const { PMNAMES } = await import('./monst_data.js');
    const { MM_NOMSG, NO_TRAP_FLAGS } = await import('./const.js');
    const { mintrap } = await import('./trap.js');
    const { t_at } = await import('./mon.js');
    const { You_hear } = await import('./pline.js');
    const G_GONE = 0x03;

    let mtmp = null;
    if (!((game.mvitals?.[PMNAMES.PM_WATER_NYMPH]?.mvflags ?? 0) & G_GONE)
        && (mtmp = makemon(game.mons[PMNAMES.PM_WATER_NYMPH],
                           game.u.ux, game.u.uy, MM_NOMSG))) {
        if (!game.u.ublind)
            await You(`attract ${a_monnam(mtmp)}!`);
        else
            await You_hear('a seductive voice.');
        mtmp.msleeping = 0;
        if (t_at(mtmp.mx, mtmp.my))
            await mintrap(mtmp, NO_TRAP_FLAGS);
    } else if (!game.u.ublind) {
        await pline('A large bubble rises to the surface and pops.');
    } else {
        await You_hear('a loud pop.');
    }
}

// src/fountain.c:243 drinkfountain() — quaff from the fountain underfoot.
export async function drinkfountain() {
    const u = game.u;
    const loc = game.level.at(u.ux, u.uy);
    const mgkftn = (loc.blessedftn === 1);
    const fate = rnd(30);

    if (u.uprops?.LEVITATION) {
        note_unported_fountain('drinkfountain:floating_above');
        return;
    }

    if (mgkftn && (u.uluck | 0) >= 0 && fate >= 10) {
        note_unported_fountain('drinkfountain:magic_fountain');
        return;
    }

    if (fate < 10) {
        await pline_The('cool draught refreshes you.');
        u.uhunger += rnd(10); /* don't choke on water */
        const { newuhs } = await import('./eat.js');
        await newuhs(false);
        if (mgkftn)
            return;
    } else {
        switch (fate) {
        case 19: /* Self-knowledge */
            note_unported_fountain('drinkfountain:self_knowledge');
            break;
        case 20: /* Foul water */
            note_unported_fountain('drinkfountain:foul_water');
            break;
        case 21: /* Poisonous */
            note_unported_fountain('drinkfountain:poisonous');
            break;
        case 22: /* Fountain of snakes! */
            note_unported_fountain('drinkfountain:watersnakes');
            break;
        case 23: /* Water demon */
            await dowaterdemon();
            break;
        case 24: /* Maybe curse some items */
            {
                await pline("This water's no good!");
                const { morehungry } = await import('./eat.js');
                const { rn1 } = await import('./rng.js');
                await morehungry(rn1(20, 11));
                exercise(A_CON, false);
                let buc_changed = 0;
                for (const obj of [...(game.invent || [])]) {
                    if (obj.oclass !== OCLASSES.COIN_CLASS && !obj.cursed
                        && !rn2(5)) {
                        curse(obj);
                        ++buc_changed;
                    }
                }
                if (buc_changed)
                    update_inventory();
            }
            break;
        case 25: /* See invisible */
            note_unported_fountain('drinkfountain:see_invisible');
            break;
        case 26: /* See Monsters */
            note_unported_fountain('drinkfountain:monster_detect');
            break;
        case 27: /* Find a gem in the sparkling waters. */
            if (!(loc.looted & 1 /* F_LOOTED */)) {
                note_unported_fountain('drinkfountain:dofindgem');
                break;
            }
            /* FALLTHRU */
        case 28: /* Water Nymph */
            await dowaternymph();
            break;
        case 29: /* Scare */
            {
                await pline('This water gives you bad breath!');
                const { monflee } = await import('./monmove.js');
                for (const mtmp of (game.level?.monsters || [])) {
                    if (mtmp.mhp <= 0)
                        continue;
                    await monflee(mtmp, 0, false, false);
                }
            }
            break;
        case 30: /* Gushing forth in this room */
            note_unported_fountain('drinkfountain:dogushforth');
            break;
        default:
            await pline('This tepid water is tasteless.');
            break;
        }
    }
    await dryup(u.ux, u.uy, true);
}

// src/fountain.c:394 dipfountain() — dip an object into a fountain.
export async function dipfountain(obj) {
    let er = 0; /* ER_NOTHING */

    if (game.u.uprops?.LEVITATION) {
        note_unported_fountain('dipfountain:floating_above');
        return;
    }

    if (obj.otyp === ONAMES.LONG_SWORD && game.u.ulevel >= 5
        && !rn2(game.urole?.name === 'Knight' ? 6 : 30)
        && obj.quan === 1 && !obj.oartifact) {
        /* exist_artifact(Excalibur) — the Lady of the Lake; artifact
           creation machinery records */
        note_unported_fountain('dipfountain:excalibur');
        return;
    } else if (obj === game.u.uarmg) {
        note_unported_fountain('dipfountain:wash_hands');
    } else {
        er = await water_damage(obj, null, true);
    }

    if (er === 3 /* ER_DESTROYED */ || (er !== 0 && !rn2(2))) {
        return; /* no further effect */
    }

    switch (rnd(30)) {
    case 16: /* Curse the item */
        if (obj.oclass !== OCLASSES.COIN_CLASS && !obj.cursed) {
            curse(obj);
        }
        break;
    case 17:
    case 18:
    case 19:
    case 20: /* Uncurse the item */
        if (obj.cursed) {
            if (!game.u.ublind)
                await pline_The('water glows for a moment.');
            uncurse(obj);
        } else {
            await pline('A feeling of loss comes over you.');
        }
        break;
    case 21: /* Water Demon */
        note_unported_fountain('dipfountain:dowaterdemon');
        break;
    case 22: /* Water Nymph */
        note_unported_fountain('dipfountain:dowaternymph');
        break;
    case 23: /* an Endless Stream of Snakes */
        note_unported_fountain('dipfountain:dowatersnakes');
        break;
    case 24: /* Find a gem */
        note_unported_fountain('dipfountain:dofindgem');
        break;
    case 25: /* Water gushes forth */
        note_unported_fountain('dipfountain:dogushforth');
        break;
    case 26: /* Strange feeling */
        await pline('A strange tingling runs up your arm.');
        break;
    case 27: /* Strange feeling */
        await You_feel('a sudden chill.');
        break;
    case 28: /* Strange feeling */
        await pline('An urge to take a bath overwhelms you.');
        note_unported_fountain('dipfountain:gold_bath');
        break;
    case 29: /* You see coins */
        note_unported_fountain('dipfountain:see_coins');
        break;
    default:
        if (er === 0 /* ER_NOTHING */)
            await pline('Nothing seems to happen.');
        break;
    }
    update_inventory();
    await dryup(game.u.ux, game.u.uy, true);
}
