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
import { IS_FOUNTAIN, ROOM, A_WIS } from './const.js';
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
