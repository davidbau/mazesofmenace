
import { rn2 as _rn2 } from '../rng.js';

/**
 * nh.rn2(range) → integer in [0, range-1]
 * C ref: nhlua.c nhl_rn2()
 */
export function rn2(args, _interp) {
    // Support both direct call rn2(n) and Lua bridge rn2([n], interp)
    const range = Array.isArray(args)
        ? Math.floor(Number(args[0]))
        : Math.floor(Number(args));
    return _rn2(range);
}

/**
 * nh.random(a)     → same as nh.rn2(a)        — [0, a-1]
 * nh.random(a, b)  → a + rn2(b)               — [a, a+b-1]
 * C ref: nhlua.c nhl_random()
 */
export function random(args, _interp) {
    if (Array.isArray(args)) {
        if (args.length === 1) {
            return _rn2(Math.floor(Number(args[0])));
        }
        if (args.length >= 2) {
            const a = Math.floor(Number(args[0]));
            const b = Math.floor(Number(args[1]));
            return a + _rn2(b);
        }
        throw new Error('nh.random: Wrong args');
    }
    // Direct call: random(n) or random(a, b)
    const a = Math.floor(Number(args));
    if (arguments.length < 2 || _interp === undefined) {
        return _rn2(a);
    }
    const b = Math.floor(Number(_interp));
    return a + _rn2(b);
}
