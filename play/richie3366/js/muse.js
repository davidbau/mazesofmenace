// muse.js — Monster item use (offensive potion throw subset).
// C ref: muse.c find_offensive / use_offensive (MUSE_POT_* throw path).

import { game } from './gstate.js';
import { cansee } from './vision.js';
import { pline, mon_visible, see_with_infrared } from './display.js';
import { Monnam } from './do_name.js';
import { doname, singular } from './objnam.js';
import { distmin } from './mon.js';
import { lined_up, m_throw } from './mthrowu.js';
import { is_animal, mindless, nohands } from './monsters.js';
import { objectNames, POTION_CLASS } from './objects.js';
import { observe_object } from './invent.js';

const POT_PARALYSIS = objectNames.indexOf('POT_PARALYSIS');
const POT_BLINDNESS = objectNames.indexOf('POT_BLINDNESS');
const POT_CONFUSION = objectNames.indexOf('POT_CONFUSION');
const POT_SLEEPING = objectNames.indexOf('POT_SLEEPING');
const POT_ACID = objectNames.indexOf('POT_ACID');

/** C muse.c MUSE_POT_* offense codes (wand/horn values reserved). */
const MUSE_POT_PARALYSIS = 9;
const MUSE_POT_BLINDNESS = 10;
const MUSE_POT_CONFUSION = 11;
const MUSE_POT_ACID = 14;
const MUSE_POT_SLEEPING = 16;

function sgn(n) {
    return n < 0 ? -1 : n > 0 ? 1 : 0;
}

function canseemon(mtmp) {
    if (!mtmp) return false;
    if (!(cansee(mtmp.mx, mtmp.my) || see_with_infrared(mtmp))) return false;
    return mon_visible(mtmp);
}

function museState() {
    if (!game._muse) game._muse = { offensive: null, has_offense: 0 };
    return game._muse;
}

/**
 * C ref: muse.c find_offensive — potion throw subset.
 * Wand/horn/scroll/camera offense detection deferred (named in C-JS-MAP);
 * invent walk still prefers last matching potion like C's last-viable rule
 * among implemented types.
 */
export function find_offensive(mtmp) {
    const m = museState();
    m.offensive = null;
    m.has_offense = 0;

    if (!mtmp || mtmp.mpeaceful) return false;
    const data = mtmp.data;
    if (!data || is_animal(data) || mindless(data) || nohands(data)) {
        return false;
    }
    const u = game.u || {};
    if (u.uswallow) return false;
    // in_your_sanctuary / AD_HEAL naked-heal deferred → treat as open
    if (!lined_up(mtmp)) return false;

    for (let obj = mtmp.minvent; obj; obj = obj.nobj) {
        // Wand / reflection_skip block deferred — potions always considered
        if (obj.otyp === POT_PARALYSIS && (game.multi | 0) >= 0) {
            m.offensive = obj;
            m.has_offense = MUSE_POT_PARALYSIS;
        }
        if (obj.otyp === POT_BLINDNESS) {
            // AT_GAZE deferral: still allow (gnome has no gaze)
            m.offensive = obj;
            m.has_offense = MUSE_POT_BLINDNESS;
        }
        if (obj.otyp === POT_CONFUSION) {
            m.offensive = obj;
            m.has_offense = MUSE_POT_CONFUSION;
        }
        if (obj.otyp === POT_SLEEPING) {
            // m_seenres(M_SEEN_SLEEP) deferred → always eligible
            m.offensive = obj;
            m.has_offense = MUSE_POT_SLEEPING;
        }
        if (obj.otyp === POT_ACID) {
            m.offensive = obj;
            m.has_offense = MUSE_POT_ACID;
        }
    }
    return m.has_offense !== 0;
}

/**
 * C ref: muse.c use_offensive — potion hurls only (return 2 = spent turn).
 * Wand/horn/scroll cases deferred.
 */
export function use_offensive(mtmp) {
    const m = museState();
    const otmp = m.offensive;
    if (!otmp || otmp.oclass !== POTION_CLASS) return 0;

    switch (m.has_offense) {
    case MUSE_POT_PARALYSIS:
    case MUSE_POT_BLINDNESS:
    case MUSE_POT_CONFUSION:
    case MUSE_POT_SLEEPING:
    case MUSE_POT_ACID:
        if (cansee(mtmp.mx, mtmp.my)) {
            observe_object(otmp);
            pline(`${Monnam(mtmp)} hurls ${singular(otmp, doname)}!`);
        }
        m_throw(
            mtmp, mtmp.mx, mtmp.my,
            sgn((mtmp.mux ?? game.u?.ux) - mtmp.mx),
            sgn((mtmp.muy ?? game.u?.uy) - mtmp.my),
            distmin(mtmp.mx, mtmp.my, mtmp.mux ?? game.u?.ux, mtmp.muy ?? game.u?.uy),
            otmp,
        );
        return (mtmp.mhp | 0) < 1 ? 1 : 2;
    default:
        return 0;
    }
}
