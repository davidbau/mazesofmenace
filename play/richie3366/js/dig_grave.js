// dig_grave.js — dig.c dig_up_grave() subset (dighole on **GRAVE**).
// C ref: dig.c dig_up_grave(); mkobj.c mk_tt_object() tail (**`rn1(PM_WIZARD - PM_ARCHEOLOGIST + 1, PM_ARCHEOLOGIST)`** when no tt name).

import { pline, newsym } from './display.js';
import {
    isok,
    ROOM,
    A_LAWFUL,
    A_WIS,
    TAINT_AGE,
    PM_ARCHEOLOGIST,
    PM_WIZARD,
    PM_HUMAN_MUMMY,
    PM_HUMAN_ZOMBIE,
} from './const.js';
import { exercise } from './attrib.js';
import { rn1, rn2, rnd } from './rng.js';
import { placeFloorObjectInLevel, stackObjOnFloorInLevel } from './floorobj.js';
import { startCorpseTimeout } from './obj_rot_timer.js';
import { CORPSE_OTYP } from './mkobj_corpse.js';
import { NH5_FOOD_CLASS } from './nh5_objclass.js';
import { makemon } from './makemon.js';
import { delEngrAt } from './engrave.js';

/** C: attrib.c **`adjalign`** — negative branch (**`record`**, **`abuse`**) subset. */
export function adjalignLikeC(g, n) {
    const u = g.u;
    if (!u) return;
    u.ualign = u.ualign || { type: 0, record: 0, abuse: 0 };
    const rec = u.ualign.record | 0;
    const newalign = rec + n;
    if (n < 0) {
        if (newalign < rec) u.ualign.record = newalign;
        const newabuse = (u.ualign.abuse | 0) - n;
        if (newabuse > (u.ualign.abuse | 0)) u.ualign.abuse = newabuse;
    } else if (newalign > rec) {
        u.ualign.record = newalign;
        const ALIGNLIM = 20;
        if ((u.ualign.record | 0) > ALIGNLIM) u.ualign.record = ALIGNLIM;
    }
}

function sgnAlign(t) {
    const v = t | 0;
    if (v > 0) return 1;
    if (v < 0) return -1;
    return 0;
}

/**
 * C: mkobj.c **`mk_tt_object(CORPSE, x, y)`** when **`tt_oname`** fails — **`rn1`** corpsenm + **`set_corpsenm`**.
 * @param {import('./gstate.js').game} g
 */
function mkTtCorpseAtLikeC(g, x, y) {
    rnd(2); /* C: **`next_ident`** via **`mksobj_at`** */
    const pm = rn1(PM_WIZARD - PM_ARCHEOLOGIST + 1, PM_ARCHEOLOGIST); /* C: **`rn1(PM_WIZARD - PM_ARCHEOLOGIST + 1, PM_ARCHEOLOGIST)`** */
    const otmp = {
        otyp: CORPSE_OTYP,
        oclass: NH5_FOOD_CLASS,
        ox: -1,
        oy: -1,
        quan: 1,
        owt: 1,
        cursed: false,
        blessed: false,
        olocked: false,
        spe: 0,
        corpsenm: pm,
        age: g.moves ?? 0,
    };
    startCorpseTimeout(g, otmp);
    placeFloorObjectInLevel(g, otmp, x | 0, y | 0);
    stackObjOnFloorInLevel(g, otmp);
    otmp.age = (otmp.age | 0) - (TAINT_AGE + 1);
    return otmp;
}

/**
 * C: dig.c **`dig_up_grave(cc)`** — after **`digactualhole`** + **`maketrap`** **`(PIT)`** left **`ROOM`** + pit.
 * @param {import('./gstate.js').game} g
 * @param {{ x: number, y: number }|null} cc
 * @param {number} emptyGraveFlag — C **`emptygrave`** (**`flags`**) before **`maketrap`** cleared it
 */
export async function digUpGraveLikeC(g, cc, emptyGraveFlag) {
    let digX = g.u?.ux | 0;
    let digY = g.u?.uy | 0;
    if (cc) {
        digX = cc.x | 0;
        digY = cc.y | 0;
        if (!isok(digX, digY)) return;
    }

    const u = g.u;
    const lev = g.level?.at(digX, digY);
    if (!u || !lev) return;

    exercise(A_WIS, false);

    const abbr = g.urole?.abbr;
    const at = u.ualign?.type ?? 0;
    const sgn = sgnAlign(at);

    if (abbr === 'Arc') {
        adjalignLikeC(g, -sgn * 3);
        await pline('You feel like a despicable grave-robber!');
    } else if (abbr === 'Sam') {
        adjalignLikeC(g, -sgn);
        await pline('You disturb the honorable dead!');
    } else if (at === A_LAWFUL) {
        if ((u.ualign?.record | 0) > -10) adjalignLikeC(g, -1);
        await pline('You have violated the sanctity of this grave!');
    }

    const whatHappens = emptyGraveFlag ? -1 : rn2(5);
    const Blind = !!(u.ublind | 0);
    const Hallu = !!(u.Hallucination | 0);

    switch (whatHappens) {
        case 0:
        case 1:
            await pline('You unearth a corpse.');
            mkTtCorpseAtLikeC(g, digX, digY);
            break;
        case 2:
            if (!Blind) {
                await pline(
                    Hallu ? 'Dude!  The living dead!' : "The grave's owner is very upset!",
                );
            }
            {
                const mtmp = makemon({ mnum: PM_HUMAN_ZOMBIE }, digX, digY, 0);
                if (mtmp) {
                    if (!g.level.monsters) g.level.monsters = [];
                    g.level.monsters.push(mtmp);
                }
            }
            break;
        case 3:
            if (!Blind) {
                await pline(Hallu ? 'I want my mummy!' : "You've disturbed a tomb!");
            }
            {
                const mtmp = makemon({ mnum: PM_HUMAN_MUMMY }, digX, digY, 0);
                if (mtmp) {
                    if (!g.level.monsters) g.level.monsters = [];
                    g.level.monsters.push(mtmp);
                }
            }
            break;
        default:
            await pline('The grave is unoccupied.  Strange...');
            break;
    }

    lev.typ = ROOM;
    lev.flags = 0;
    lev.horizontal = false;
    delEngrAt(digX, digY);
    newsym(digX, digY);
}
