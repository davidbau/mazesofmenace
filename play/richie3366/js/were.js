// were.js — Lycanthrope shape change (partial).
// C ref: were.c were_change / new_were / counter_were.

import { game } from './gstate.js';
import { rn2 } from './rng.js';
import { night, FULL_MOON } from './calendar.js';
import {
    is_were, is_human, mons, LOW_PM, NON_PM,
} from './monsters.js';
import { monsterNames, pmnames } from './generated/monsters_data.js';
import { canseemon, newsym, pline } from './display.js';
import { Monnam } from './do_name.js';

const PM_WEREWOLF = monsterNames.indexOf('PM_WEREWOLF');
const PM_HUMAN_WEREWOLF = monsterNames.indexOf('PM_HUMAN_WEREWOLF');
const PM_WEREJACKAL = monsterNames.indexOf('PM_WEREJACKAL');
const PM_HUMAN_WEREJACKAL = monsterNames.indexOf('PM_HUMAN_WEREJACKAL');
const PM_WERERAT = monsterNames.indexOf('PM_WERERAT');
const PM_HUMAN_WERERAT = monsterNames.indexOf('PM_HUMAN_WERERAT');

/** C ref: youprop.h Protection_from_shape_changers */
function Protection_from_shape_changers() {
    const u = game.u || {};
    return !!(u.HProtection_from_shape_changers
        || u.EProtection_from_shape_changers
        || u.Protection_from_shape_changers);
}

/** C ref: were.c counter_were */
export function counter_were(pm) {
    switch (pm) {
    case PM_WEREWOLF: return PM_HUMAN_WEREWOLF;
    case PM_HUMAN_WEREWOLF: return PM_WEREWOLF;
    case PM_WEREJACKAL: return PM_HUMAN_WEREJACKAL;
    case PM_HUMAN_WEREJACKAL: return PM_WEREJACKAL;
    case PM_WERERAT: return PM_HUMAN_WERERAT;
    case PM_HUMAN_WERERAT: return PM_WERERAT;
    default: return NON_PM;
    }
}

/**
 * C ref: mondata.c set_mon_data — data/mnum + prorate unused movement.
 * Named omission: youmonst umovement path (hero poly).
 */
function set_mon_data(mon, ptr) {
    const old_speed = mon.data?.mmove | 0;
    mon.data = ptr;
    mon.mnum = ptr?.mndx ?? NON_PM;
    if (mon.movement) {
        const new_speed = ptr?.mmove | 0;
        if (new_speed < old_speed && old_speed > 0) {
            mon.movement = ((mon.movement | 0) * new_speed) / old_speed | 0;
        }
    }
}

/**
 * C ref: were.c new_were — flip human ↔ beast form.
 * Named omissions: mon_break_armor; possibly_unwield; monflee onscary
 * (svc.context.mon_moving + mux/muy scary near); Soundeffect.
 */
export function new_were(mon) {
    if (!mon?.data) return;
    if (Protection_from_shape_changers() && is_human(mon.data)) return;

    const pm = counter_were(mon.mnum ?? mon.data?.mndx);
    if (pm < LOW_PM) return;

    const newptr = mons(pm);
    if (!newptr) return;

    if (canseemon(mon) && !(game.u?.Hallucination || game.u?.HHallucination)) {
        const form = is_human(newptr)
            ? 'human'
            : (() => {
                const g = mon.female ? 1 : 0;
                const nm = pmnames[pm]?.[g] || pmnames[pm]?.[2] || 'beast';
                // C: pmname()+4 skips "were" prefix
                return nm.startsWith('were') ? nm.slice(4) : nm;
            })();
        void pline(`${Monnam(mon)} changes into a ${form}.`);
    }

    set_mon_data(mon, newptr);
    // C: helpless → wake/unfreeze
    if (mon.msleeping || !mon.mcanmove || (mon.mfrozen | 0) > 0) {
        mon.msleeping = 0;
        mon.mfrozen = 0;
        mon.mcanmove = 1;
    }
    // healmon(mon, (mhpmax - mhp) / 4, 0)
    const lost = ((mon.mhpmax | 0) - (mon.mhp | 0)) >> 2;
    if (lost > 0) mon.mhp = (mon.mhp | 0) + lost;
    newsym(mon.mx, mon.my);
    // mon_break_armor / possibly_unwield / monflee deferred
}

/**
 * C ref: were.c were_change — once-per-turn lycanthrope chance.
 * Named omissions: howl You_hear + wake_nearto when transform unseen;
 * Soundeffect.
 */
export function were_change(mon) {
    if (!mon?.data || !is_were(mon.data)) return;

    if (is_human(mon.data)) {
        if (!Protection_from_shape_changers()) {
            const full = (game.flags?.moonphase === FULL_MOON);
            const chance = night()
                ? (full ? 3 : 30)
                : (full ? 10 : 50);
            if (!rn2(chance)) {
                new_were(mon);
                if (game.were_changes != null) game.were_changes++;
                // howl You_hear / wake_nearto deferred (no RNG)
            }
        }
    } else if (!rn2(30) || Protection_from_shape_changers()) {
        new_were(mon);
        if (game.were_changes != null) game.were_changes++;
    }
}
