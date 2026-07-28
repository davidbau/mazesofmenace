// potion.js — potion effects.
// C ref: src/potion.c
//
// Only healup() so far, reached by the healing spells' zapyourself route.

import { game } from './gstate.js';
import { pline } from './display.js';
import { You } from './pline.js';
import { exercise } from './attrib.js';
import { A_WIS, ECMD_CANCEL, IS_FOUNTAIN, IS_SINK } from './const.js';
import { rn2 } from './rng.js';
import { ONAMES, MATERIALS } from './objects_data.js';
import { PMNAMES, MFLAGS } from './monst_data.js';
import { OBJ_DESCR } from './objnam.js';
import { makeknown } from './o_init.js';
import { more_experienced } from './exper.js';
import { getobj, useup, ECMD_TIME, ECMD_OK } from './invent.js';
import { GETOBJ_NOFLAGS } from './const.js';
const G_GONE = MFLAGS.G_GENOD | MFLAGS.G_EXTINCT;

function note_unported_potion(what) {
    (game.unported ||= new Set()).add(what);
}

// src/potion.c:1428 healup()
export function healup(nhp, nxtra, curesick, cureblind) {
    const u = game.u;

    if (nhp) {
        /* the Upolyd arm reads u.mh; polyself is not ported */
        u.uhp += nhp;
        if (u.uhp > u.uhpmax) {
            u.uhp = (u.uhpmax += nxtra);
            if (u.uhpmax > (u.uhppeak || 0))
                u.uhppeak = u.uhpmax;
        }
    }
    if (cureblind) {
        /* make_blinded(0)/make_deaf(0) cure; visible only while afflicted */
        if (u.ucreamed || u.ublind || u.uprops?.DEAF)
            note_unported_potion('healup:cureblind');
        u.ucreamed = 0;
    }
    if (curesick) {
        if (u.uprops?.VOMITING || u.uprops?.SICK)
            note_unported_potion('healup:curesick');
    }
    (game.disp ||= {}).botl = true;
}

// src/potion.c:1260 peffect_oil() — the one potion arm the sessions reach.
async function peffect_oil(otmp) {
    const good_for_you = false;

    if (otmp.lamplit) {
        /* burning oil: face burn + losehp d(x,4) + burn_away_slime */
        note_unported_potion('peffect_oil:lamplit');
    } else if (otmp.cursed) {
        await pline('This tastes like castor oil.');
    } else {
        await pline('That was smooth!');
    }
    exercise(A_WIS, good_for_you);
}

// src/potion.c:1333 peffects() — dispatch one quaffed potion.
// Returns -1 to let dopotion() finish (identify + useup), matching C.
async function peffects(otmp) {
    switch (otmp.otyp) {
    case ONAMES.POT_OIL:
        await peffect_oil(otmp);
        break;
    default:
        /* every other arm draws through its own subsystem */
        note_unported_potion(`peffects:otyp=${otmp.otyp}`);
        break;
    }
    return -1;
}

// src/potion.c:618 dopotion()
export async function dopotion(otmp) {
    otmp.in_use = true;
    game.potion_nothing = game.potion_unkn = 0;
    const retval = await peffects(otmp);
    if (retval >= 0)
        return retval ? ECMD_TIME : ECMD_OK;

    if (game.potion_nothing) {
        game.potion_unkn++;
        await You('have a peculiar feeling for a moment, then it passes.');
    }
    if (otmp.dknown && !game.objects[otmp.otyp].oc_name_known) {
        if (!game.potion_unkn) {
            makeknown(otmp.otyp);
            more_experienced(0, 10);
        } else {
            note_unported_potion('dopotion:trycall');
        }
    }
    useup(otmp);
    return ECMD_TIME;
}

// src/potion.c:526 dodrink() — the 'q' command.
export async function dodrink(drink_ok) {
    /* Strangled needs the amulet of strangulation */

    /* fountain / sink / underwater prompts happen before getobj */
    const typ = game.level?.at(game.u.ux, game.u.uy)?.typ;
    if (IS_FOUNTAIN(typ) || IS_SINK(typ))
        note_unported_potion('dodrink:fountain_or_sink_prompt');

    const otmp = await getobj('drink', drink_ok, GETOBJ_NOFLAGS);
    if (!otmp)
        return ECMD_CANCEL;

    if (otmp.owornmask)
        note_unported_potion('dodrink:worn_potion');
    otmp.in_use = true;                 /* you've opened the stopper */

    /* src/potion.c:601 — milky/smoky bottles may hold an occupant; the
       rn2 fires only when the shuffled appearance matches */
    const descr = OBJ_DESCR(game.objects[otmp.otyp]);
    if (descr === 'milky'
        && !((game.mvitals?.[PMNAMES.PM_GHOST]?.mvflags ?? 0) & G_GONE)
        && !rn2(13 + 2 * (game.mvitals?.[PMNAMES.PM_GHOST]?.born ?? 0))) {
        note_unported_potion('dodrink:ghost_from_bottle');
        useup(otmp);
        return ECMD_TIME;
    } else if (descr === 'smoky'
        && !((game.mvitals?.[PMNAMES.PM_DJINNI]?.mvflags ?? 0) & G_GONE)
        && !rn2(13 + 2 * (game.mvitals?.[PMNAMES.PM_DJINNI]?.born ?? 0))) {
        note_unported_potion('dodrink:djinni_from_bottle');
        useup(otmp);
        return ECMD_TIME;
    }
    return dopotion(otmp);
}
