import { game } from './gstate.js';
import { FOUNTAIN, ROOM } from './const.js';
import { rn2 } from './rng.js';
import { newsym } from './display.js';
import { couldsee } from './vision.js';

export function performFountainDryup(x = game.u?.ux || 0, y = game.u?.uy || 0) {
    const loc = game.level?.at(x, y);
    if (!loc) return;
    loc.typ = ROOM;
    loc.flags = 0;
    loc.blessed = 0;
    loc.blessedftn = 0;
    if (game.level?.flags?.nfountains) game.level.flags.nfountains--;
    newsym(x, y);
}

export function dryupFountainResultAt(x = game.u?.ux || 0, y = game.u?.uy || 0, { isYou = true, wizardPrompt = false } = {}) {
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
    // C ref: dryup() (fountain.c:216-219) — in wizard mode C asks
    // "Dry up fountain? [yn]" first; defer the actual dry to the answer.
    // Opt-in per call site: only the interactive quaff flow can prompt.
    if (wizardPrompt && isYou && game.flags?.debug) return { dried: false, wizardPrompt: true };
    performFountainDryup(x, y);
    return { dried: true };
}

export function dryupFountainAt(x = game.u?.ux || 0, y = game.u?.uy || 0) {
    return dryupFountainResultAt(x, y).dried;
}
