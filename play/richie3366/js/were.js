// were.js — Lycanthrope shape change (partial).
// C ref: were.c were_change / new_were / counter_were / set_ulycn /
//        were_beastie.

import { game } from './gstate.js';
import { rn2 } from './rng.js';
import { night, FULL_MOON } from './calendar.js';
import {
    is_were, is_human, mons, LOW_PM, NON_PM,
} from './monsters.js';
import { monsterNames, pmnames } from './generated/monsters_data.js';
import { canseemon, newsym, pline } from './display.js';
import { Monnam } from './do_name.js';
import { set_mon_data } from './mondata.js';
import { set_uasmon } from './polyself.js';

const PM_WEREWOLF = monsterNames.indexOf('PM_WEREWOLF');
const PM_HUMAN_WEREWOLF = monsterNames.indexOf('PM_HUMAN_WEREWOLF');
const PM_WEREJACKAL = monsterNames.indexOf('PM_WEREJACKAL');
const PM_HUMAN_WEREJACKAL = monsterNames.indexOf('PM_HUMAN_WEREJACKAL');
const PM_WERERAT = monsterNames.indexOf('PM_WERERAT');
const PM_HUMAN_WERERAT = monsterNames.indexOf('PM_HUMAN_WERERAT');
const PM_SEWER_RAT = monsterNames.indexOf('PM_SEWER_RAT');
const PM_GIANT_RAT = monsterNames.indexOf('PM_GIANT_RAT');
const PM_RABID_RAT = monsterNames.indexOf('PM_RABID_RAT');
const PM_JACKAL = monsterNames.indexOf('PM_JACKAL');
const PM_FOX = monsterNames.indexOf('PM_FOX');
const PM_COYOTE = monsterNames.indexOf('PM_COYOTE');
const PM_WOLF = monsterNames.indexOf('PM_WOLF');
const PM_WARG = monsterNames.indexOf('PM_WARG');
const PM_WINTER_WOLF = monsterNames.indexOf('PM_WINTER_WOLF');
const PM_WINTER_WOLF_CUB = monsterNames.indexOf('PM_WINTER_WOLF_CUB');

/** C ref: youprop.h Protection_from_shape_changers */
function Protection_from_shape_changers() {
    const u = game.u || {};
    return !!(u.HProtection_from_shape_changers
        || u.EProtection_from_shape_changers
        || u.Protection_from_shape_changers);
}

/**
 * C ref: were.c were_beastie — map similar critters to were-index.
 * Returns NON_PM when not a were-related species.
 */
export function were_beastie(pm) {
    switch (pm | 0) {
    case PM_WERERAT:
    case PM_SEWER_RAT:
    case PM_GIANT_RAT:
    case PM_RABID_RAT:
        return PM_WERERAT;
    case PM_WEREJACKAL:
    case PM_JACKAL:
    case PM_FOX:
    case PM_COYOTE:
        return PM_WEREJACKAL;
    case PM_WEREWOLF:
    case PM_WOLF:
    case PM_WARG:
    case PM_WINTER_WOLF:
    case PM_WINTER_WOLF_CUB:
        return PM_WEREWOLF;
    default:
        return NON_PM;
    }
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

    // C: set_mon_data — shared with hero poly (D-0717 umovement prorate)
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
 * C ref: were.c set_ulycn — catch or cure lycanthropy (no shape change).
 * Updates u.ulycn then set_uasmon so Drain_resistance FROM_LYCN tracks.
 */
export function set_ulycn(which) {
    const u = game.u || (game.u = {});
    u.ulycn = which | 0;
    set_uasmon();
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
