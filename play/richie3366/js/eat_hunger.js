// eat_hunger.js — eat.c / hack.c hunger helpers not tied to the moveloop gethungry tail.
// C ref: eat.c morehungry, lesshungry, choke; hack.c overexertion, overexert_hp.

import { game } from './gstate.js';
import { gethungry } from './moveloop_aux.js';
import { nearCapacity, ENC } from './encumbr.js';
import { exercise } from './attrib.js';
import { fallAsleep, nomul } from './timeout.js';
import { A_CON, A_LAWFUL } from './const.js';
import { collectNewuhsPlines, UHS } from './hunger.js';
import { rn2 } from './rng.js';

/** C: hack.c overexert_hp(void) — HP drain or pass out + sleep. @returns {string[]} plines */
function overexertHpPlines() {
    const u = game.u;
    if (!u) return [];
    const poly = u.Upolyd | 0;
    if (!poly) {
        const hp = u.uhp | 0;
        if (hp > 1) {
            u.uhp = hp - 1;
            return [];
        }
    } else {
        if (u.mh == null) return []; /* call u_init_hp_energy.syncPolyHpFromHumanShape when Upolyd */
        const mh = u.mh | 0;
        if (mh > 1) {
            u.mh = mh - 1;
            return [];
        }
    }
    const plines = ['You pass out from exertion!'];
    exercise(A_CON, false);
    fallAsleep(-10, false);
    return plines;
}

/** C: hack.c overexertion tail — overexert_hp when moves%3 and HVY_ENCUMBER (no gethungry). */
export function overexertHpIfEncumberedPlines() {
    const g = game;
    const moves = g.moves | 0;
    if ((moves % 3) !== 0 && nearCapacity() >= ENC.HVY_ENCUMBER) return overexertHpPlines();
    return [];
}

/**
 * C: hack.c overexertion(void) — extra gethungry from combat exertion; then maybe overexert_hp.
 * Use when attack is **not** followed by the normal allmain gethungry (rare in this port).
 * @returns {{ plines: string[], multiNegative: boolean }}
 */
export function overexertion() {
    gethungry();
    const plines = [...overexertHpIfEncumberedPlines()];
    return { plines, multiNegative: (game.multi | 0) < 0 };
}

/** C: eat.c morehungry(int num) — @returns {string[]} newuhs(TRUE) plines */
export function applyMorehungry(num) {
    const u = game.u;
    if (!u || typeof u.uhunger !== 'number') return [];
    u.uhunger -= num | 0;
    return collectNewuhsPlines(true);
}

/**
 * C: eat.c choke(struct obj *food) — gluttony / strangulation; food null = lesshungry non-victual.
 * Omits done() killer xname, vomit() side effects; Amulet of Strangulation when !SATIATED not wired (no otyp).
 * @param {number | null | undefined} _foodOtyp — reserved for victual piece->otyp
 * @returns {string[]}
 */
function chokeFromGluttony(_foodOtyp) {
    const g = game;
    const u = g.u;
    if (!u) return [];
    const plines = [];
    const uhs = u.uhs | 0;
    if (uhs !== UHS.SATIATED) {
        /* C: only Amulet of Strangulation continues here — wire OTYP when eat.c victual ports */
        return [];
    }
    if (g.urole?.abbr === 'Kni' && (u.ualign?.type | 0) === A_LAWFUL) {
        u.ualign = u.ualign || { type: 0, record: 0 };
        u.ualign.record = (u.ualign.record | 0) - 1;
        plines.push('You feel like a glutton!');
    }

    exercise(A_CON, false);

    const Breathless = u.Breathless | 0;
    const Hunger = u.Hunger | 0;
    const Strangled = u.Strangled | 0;
    if (Breathless || Hunger || (!Strangled && !rn2(20))) {
        /* C: AoS "choke, but recover" — not distinguished without otyp; treat as vomit path */
        plines.push('You stuff yourself and then vomit voluminously.');
        const sub = Hunger ? Math.max(1, (u.uhunger | 0) - 60) : 1000;
        plines.push(...applyMorehungry(sub));
        /* C: vomit() — not ported */
        return plines;
    }
    plines.push('You choke over it.');
    plines.push('You die...');
    g.program_state = g.program_state || {};
    g.program_state.gameover = true;
    return plines;
}

/**
 * C: eat.c lesshungry(int num) — uhunger += num; choke at 2000; fullwarn at 1500; newuhs(FALSE).
 * victual / eatfood / force_save_hs / paranoid_query continue-eating not ported (see context.victual stub).
 * @returns {string[]}
 */
export function applyLesshungry(num) {
    const u = game.u;
    if (!u || typeof u.uhunger !== 'number') return [];
    const g = game;
    u.uhunger += num | 0;
    const plines = [];
    const h = u.uhunger | 0;
    const vict = g.context?.victual || { eating: 0, fullwarn: 0, canchoke: 1 };
    /* C: boolean iseating = (go.occupation == eatfood) || gf.force_save_hs — occupation not wired */
    const iseating = false;
    const canchoke = vict.canchoke != null ? vict.canchoke | 0 : 1;

    if (h >= 2000) {
        if (!iseating || canchoke) plines.push(...chokeFromGluttony(null));
    } else if (
        h >= 1500 &&
        !(u.Hunger | 0) &&
        (!(vict.eating | 0) || ((vict.eating | 0) && !(vict.fullwarn | 0)))
    ) {
        plines.push("You're having a hard time getting all of it down.");
        g.nomovemsg = "You're finally finished.";
        if (!(vict.eating | 0)) {
            nomul(-2);
        } else {
            g.context = g.context || {};
            g.context.victual = { ...vict, fullwarn: 1 };
            /* C: paranoid_query(ParanoidEating, "Continue eating?") — not ported */
        }
    }

    if (g.program_state?.gameover) return plines;
    plines.push(...collectNewuhsPlines(false));
    return plines;
}
