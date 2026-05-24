import { game } from './gstate.js';
import { FOUNTAIN, ROOM } from './const.js';
import { rn2 } from './rng.js';
import { newsym } from './display.js';
import { couldsee } from './vision.js';

export function dryupFountainResultAt(x = game.u?.ux || 0, y = game.u?.uy || 0, { isYou = true } = {}) {
    const loc = game.level?.at(x, y);
    if (loc?.typ !== FOUNTAIN || (rn2(3) && !loc.fountainWarned)) return { dried: false };
    if (isYou && game.level?.flags?.has_town && !loc.fountainWarned) {
        loc.fountainWarned = true;
        const watchman = (game.level?.monsters || []).find(mon =>
            (mon.data?.name === 'watchman' || mon.data?.name === 'watch captain')
            && mon.mpeaceful && couldsee(mon.mx, mon.my));
        if (!watchman) return { dried: false, trickle: 'The flow reduces to a trickle.' };
        const name = watchman.data?.name || 'watchman';
        return { dried: false, warning: `${/^[aeiou]/i.test(name) ? 'An' : 'A'} ${name} yells:` };
    }
    loc.typ = ROOM;
    loc.flags = 0;
    loc.blessed = 0;
    if (game.level?.flags?.nfountains) game.level.flags.nfountains--;
    newsym(x, y);
    return { dried: true };
}

export function dryupFountainAt(x = game.u?.ux || 0, y = game.u?.uy || 0) {
    return dryupFountainResultAt(x, y).dried;
}
