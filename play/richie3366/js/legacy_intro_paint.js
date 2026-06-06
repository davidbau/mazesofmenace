// legacy_intro_paint.js — tty grid for C `com_pager("legacy")` (quest.lua common.legacy).
// Kept separate from display.js to avoid circular imports (display wires status rows).

import { game } from './gstate.js';
import { NO_COLOR } from './terminal.js';
import { rankHeroTitleLikeC } from './roles.js';
import { alignGnameLikeC, alignGtitleLikeC } from './pray_align_gname_like_c.js';

function legacyHeroAlignGnameLikeC(g) {
    return alignGnameLikeC(g, g.u?.ualign?.type ?? 0);
}

function legacyHeroAlignGtitleLikeC(g) {
    return alignGtitleLikeC(g, g.u?.ualign?.type ?? 0);
}

function rankTitleAtNewgameLikeC(g) {
    return rankHeroTitleLikeC(g);
}

function substituteLegacyLine(line, g) {
    const d = legacyHeroAlignGnameLikeC(g);
    const G = legacyHeroAlignGtitleLikeC(g);
    const r = rankTitleAtNewgameLikeC(g);
    return line.replace(/%d/g, d).replace(/%G/g, G).replace(/%r/g, r);
}

const LEGACY_TEMPLATE = `It is written in the Book of %d:

    After the Creation, the cruel god Moloch rebelled
    against the authority of Marduk the Creator.
    Moloch stole from Marduk the most powerful of all
    the artifacts of the gods, the Amulet of Yendor,
    and he hid it in the dark cavities of Gehennom, the
    Under World, where he now lurks, and bides his time.

Your %G %d seeks to possess the Amulet, and with it
to gain deserved ascendance over the other gods.

You, a newly trained %r, have been heralded
from birth as the instrument of %d.  You are destined
to recover the Amulet for your deity, or die in the
attempt.  Your hour of destiny has come.  For the sake
of us all:  Go bravely with %d!`;

const MORE_STR = '--More--';

/** C tty `putstr(datawin, 0, line)` — right-justify book title; Moloch block +4 cols from title. */
function legacyIntroColForLineLikeC(line, inMoloch, g) {
    if (inMoloch) return (g._legacyIntroCol ?? 17) + 4;
    if (g._legacyIntroCol != null) return g._legacyIntroCol;
    const col = Math.min(23, Math.max(17, 60 - line.length));
    g._legacyIntroCol = col;
    return col;
}

/**
 * @param {import('./game_display.js').GameDisplay} display
 */
export function paintLegacyIntroIntoDisplay(display) {
    const g = game;
    delete g._legacyIntroCol;

    const rawLines = LEGACY_TEMPLATE.split('\n');
    const rows = rawLines.map((raw) => substituteLegacyLine(raw.replace(/^\s+/, ''), g));

    let inMoloch = false;
    let r = 0;
    for (const line of rows) {
        if (line.startsWith('After the Creation')) inMoloch = true;
        if (line) {
            const col = legacyIntroColForLineLikeC(line, inMoloch, g);
            display.putstr(col, r, line, NO_COLOR, 0);
        }
        if (line.includes('bides his time.')) inMoloch = false;
        r++;
    }

    const moreCol = g._legacyIntroCol ?? 17;
    display.putstr(moreCol, r, MORE_STR, NO_COLOR, 0);
    display.setCursor(moreCol + MORE_STR.length, r);
    display.cursorVisible = true;
}
