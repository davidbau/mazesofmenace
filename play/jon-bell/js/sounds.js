import { game } from './gstate.js';
import { canspotmon, map_invisible, pline, GLYPHCLS_MON } from './display.js';
import { helpless } from './mhitm.js';
import { Monnam } from './mcastu.js';
import { domonnoise, verbalize } from './cmd.js';
import { PM_GECKO, PM_LONG_WORM } from './pm.generated.js';

// C sounds.c:519-541 — pet hunger noises (dogmove.c:383).
export async function beg(mtmp) {
    const ptr = mtmp.data;
    if (helpless(mtmp) || !(ptr.mflags1 & (0x20000000 | 0x40000000)))
        return; // M1_CARNIVORE | M1_HERBIVORE

    if (ptr.msound !== 0 && ptr.msound <= 17 /* MS_ANIMAL */) {
        await domonnoise(mtmp);
    } else if (ptr.msound >= 25 /* MS_HUMANOID */) {
        if (!canspotmon(mtmp))
            map_invisible(mtmp.mx, mtmp.my);
        await verbalize("I'm hungry.");
    } else if (canspotmon(mtmp)) {
        await pline('%s seems famished.', Monnam(mtmp));
    }
}

// C sounds.c:617 cry_sound — cries used by egg hatchlings.
// Sound and monster class values follow monflag.h and defsym.h.
export function cry_sound(mon) {
    const data = mon.data;
    switch (data.msound) {
    case 9: return 'hiss';
    case 3:
    case 5: return 'growl';
    case 8: return 'chirp';
    case 10: return 'buzz';
    case 7: return 'screech';
    case 11: return 'grunt';
    case 21: return 'mumble';
    default: return data.mlet === 57 ? 'gurgle' : 'chitter';
    }
}

// C sounds.c:659-674 — consult the already displayed species, without a draw.
export function mon_is_gecko(mon) {
    if (mon.data.pmidx === PM_GECKO)
        return true;
    if (mon.data.pmidx === PM_LONG_WORM)
        return false;
    const loc = game.level.at(mon.mx, mon.my);
    return !!(loc && loc.disp_cls === GLYPHCLS_MON && !loc.disp_is_warning
              && loc.disp_mon_pm === PM_GECKO);
}
