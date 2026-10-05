// Source: do.c set_wounded_legs and heal_legs.
import { game } from './gstate.js';
import { A_DEX, A_MAX, WOUNDED_LEGS, LEFT_SIDE, RIGHT_SIDE, TIMEOUT } from './const.js';

export function hasWoundedLegs(g = game) {
    const prop = g.u?.uprops?.[WOUNDED_LEGS];
    return !!(prop?.intrinsic || prop?.extrinsic);
}

export function setWoundedLegs(side, duration, g = game) {
    const u = g.u;
    u.uprops ??= [];
    const prop = u.uprops[WOUNDED_LEGS] ??= { intrinsic: 0, extrinsic: 0 };
    if (!hasWoundedLegs(g)) {
        u.atemp ??= { a: Array(A_MAX).fill(0) };
        u.atemp.a[A_DEX]--;
    }
    if (!hasWoundedLegs(g) || (prop.intrinsic & TIMEOUT) < duration)
        prop.intrinsic = ((prop.intrinsic || 0) & ~TIMEOUT) | Math.max(0, Math.min(TIMEOUT, duration));
    prop.extrinsic = (prop.extrinsic || 0) | side;
    (g.disp ??= {}).botl = true;
    // Command displays still read these mirrors; the property owns the state.
    u._woundedLegTurns = prop.intrinsic & TIMEOUT;
    u._woundedLegSide = prop.extrinsic === LEFT_SIDE ? 'left' : prop.extrinsic === RIGHT_SIDE ? 'right' : '';
}
