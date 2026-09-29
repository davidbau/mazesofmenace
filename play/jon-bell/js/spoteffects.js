// C hack.c:836 dosinkfall() — landing on a sink while levitating/flying.
// Used by the shared landing coordinator in landing-effects.js.
import { game } from './gstate.js';
import { rn1, rnd } from './rng.js';
import { pline } from './display.js';
import { exercise, acurr } from './attrib.js';
import { losehp } from './dokick.js';
import { do_death_sequence } from './end.js';
import { selftouch } from './trap.js';
import { float_vs_flight, is_weptool } from './mhitm.js';
import {
    Boots_off, Ring_off, off_msg, stop_donning,
    LEVITATION_BOOTS_OTYP_DW, RIN_LEVITATION_OTYP,
} from './do_wear.js';
import { doname } from './objnam.js';
import {
    A_CON, A_DEX, FROMFORM, FROMOUTSIDE, I_SPECIAL, TIMEOUT, W_ARTI,
    HALF_PHDAM,
    NO_KILLER_PREFIX,
} from './const.js';

const WEAPON_CLASS = 2;
const LEVITATION = 48;
const FLYING = 49;

function halfPhysical(damage) {
    const p = game.u?.uprops?.[HALF_PHDAM];
    return ((p?.intrinsic | 0) || (p?.extrinsic | 0))
        ? Math.trunc((damage + 1) / 2) : damage;
}

function prop(index) {
    const u = game.u || (game.u = {});
    if (!u.uprops) u.uprops = {};
    return u.uprops[index] || (u.uprops[index] = { intrinsic: 0, extrinsic: 0, blocked: 0 });
}

function levitatingProp() { return prop(LEVITATION); }
function flyingProp() { return prop(FLYING); }

function floorObjects() {
    const u = game.u || {};
    return game.level?.levelObjects?.[u.ux | 0]?.[u.uy | 0] || null;
}

/** C hack.c:836 dosinkfall(). */
export async function dosinkfall() {
    const g = game;
    const u = g.u || (g.u = {});
    const hp = levitatingProp();
    const fp = flyingProp();
    let levBoots = !!(u.uarmf && (u.uarmf.otyp | 0) === LEVITATION_BOOTS_OTYP_DW);
    const innateLev = ((hp.intrinsic | 0) & (FROMOUTSIDE | FROMFORM)) !== 0;
    const blockedLev = (hp.blocked | 0) === I_SPECIAL;
    const ufall = !innateLev && !blockedLev
        && !((fp.intrinsic | 0) || (fp.extrinsic | 0));

    if (!ufall) {
        await pline((innateLev || blockedLev)
            ? 'You wobble unsteadily for a moment.'
            : 'You gain control of your flight.');
    } else {
        const saveELev = hp.extrinsic | 0;
        const saveHLev = hp.intrinsic | 0;
        hp.extrinsic = 0;
        hp.intrinsic = 0;
        await pline('You crash to the floor!');
        const damage = rn1(8, 25 - (acurr(u, A_CON) | 0));
        await losehp(halfPhysical(damage), 'fell onto a sink', NO_KILLER_PREFIX);
        if (g._pendingDeath)
            await do_death_sequence({ inPlace: true });
        exercise(A_DEX, false);
        await selftouch('Falling, you');
        for (let obj = floorObjects(); obj; obj = obj.nexthere) {
            if ((obj.oclass | 0) !== WEAPON_CLASS && !is_weptool(obj))
                continue;
            await pline(`You fell on ${(await doname(obj))}.`);
            await losehp(halfPhysical(rnd(3)), 'fell onto a sink', NO_KILLER_PREFIX);
            if (g._pendingDeath)
                await do_death_sequence({ inPlace: true });
            exercise(A_CON, false);
        }
        hp.extrinsic = saveELev;
        hp.intrinsic = saveHLev;
    }

    if (ufall || levBoots)
        await stop_donning(levBoots ? u.uarmf : null);

    /* stop_donning may have removed boots that were still being put on. */
    levBoots = !!(u.uarmf && (u.uarmf.otyp | 0) === LEVITATION_BOOTS_OTYP_DW);

    hp.extrinsic = (hp.extrinsic | 0) & ~W_ARTI;
    hp.intrinsic = ((hp.intrinsic | 0) & ~(I_SPECIAL | TIMEOUT)) + 1;
    if (u.uleft && (u.uleft.otyp | 0) === RIN_LEVITATION_OTYP) {
        const ring = u.uleft;
        await Ring_off(ring);
        await off_msg(ring);
    }
    if (u.uright && (u.uright.otyp | 0) === RIN_LEVITATION_OTYP) {
        const ring = u.uright;
        await Ring_off(ring);
        await off_msg(ring);
    }
    if (levBoots && u.uarmf) {
        const boots = u.uarmf;
        await Boots_off();
        await off_msg(boots);
    }
    hp.intrinsic = ((hp.intrinsic | 0) - 1) | 0;
    float_vs_flight();
}
