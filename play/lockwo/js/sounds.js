// sounds.js — Ambient level sounds emitted once per turn.
// C ref: sounds.c dosounds().
//
// Only the RNG side-effects matter for parity.  Each gated probe is driven
// by the current level's flags (data-driven, no per-seed special casing),
// matching the C order exactly; the first probe that "fires" returns.

import { game } from './gstate.js';
import { rn2 } from './rng.js';
import { phase_of_the_moon, night, FULL_MOON } from './calendar.js';

// C ref: sounds.c dosounds().  Deaf/acoustics/swallow/underwater short-circuit
// before any roll.  Each `level.flags.*` clause rolls rn2(N) when the feature
// is present and returns after producing a (suppressed) message.
// C ref: win/tty/topl.c update_topl() — append a fresh message onto the top
// line when one is still pending this turn ("toplin == NEED_MORE && cury==0 &&
// n0 + len(toplines) + 3 < CO-8").  In C every pline() leaves toplin in
// NEED_MORE, so a here-message ("You see here a drum.") produced by look_here()
// earlier in the same move chains the dosounds() drip after two spaces:
// "You see here a drum.  You hear a slow drip."  When no message is pending
// (the usual case) it simply replaces the line.  dosounds runs once per turn,
// so this is the only same-turn pairing it can produce.
const CO = 80;
function emit_topl(line) {
    const cur = game._pending_message || '';
    // Same-line append: a prior pline this turn left toplin == NEED_MORE.
    if (cur && line.length + cur.length + 3 < CO - 8 && !line.startsWith('You die')) {
        game._pending_message = cur + '  ' + line;
    } else {
        game._pending_message = line;
    }
    game._toplin = 1; // NEED_MORE — matches C update_topl tail
}
// C ref: pline.c You_hear() — non-deaf/non-underwater/non-unaware prefix is
// "You hear ".  You_hear1(cstr) == You_hear("%s", cstr).  The starter sessions
// are never Deaf/Underwater/Unaware here, so we emit the plain prefix.
function You_hear1(cstr) {
    emit_topl('You hear ' + cstr);
}
// C ref: pline.c You() — prefix "You ".  You1(cstr) == You("%s", cstr).
function You1(cstr) {
    emit_topl('You ' + cstr);
}

// Fountain ambient (sounds.c:214-217): fountain_msg[rn2(3) + hallu].
const FOUNTAIN_MSG = [
    'bubbling water.', 'water falling on coins.',
    'the splashing of a naiad.', 'a soda fountain!',
];
// Sink ambient (sounds.c:221-223): sink_msg[rn2(2) + hallu].
const SINK_MSG = [
    'a slow drip.', 'a gurgling noise.', 'dishes being washed!',
];
// Swamp ambient (sounds.c:231-234): swamp_msg[rn2(2) + hallu], via You1().
const SWAMP_MSG = [
    'hear mosquitoes!', 'smell marsh gas!', 'hear Donald Duck!',
];
// Barracks ambient (sounds.c:287-290): barracks_msg[rn2(3) + hallu].
const BARRACKS_MSG = [
    'blades being honed.', 'loud snoring.', 'dice being thrown.',
    'General MacArthur!',
];
// Shop ambient (sounds.c:321-324): shop_msg[rn2(2) + hallu].
const SHOP_MSG = [
    'someone cursing shoplifters.',
    'the chime of a cash register.', 'Neiman and Marcus arguing!',
];

export function dosounds() {
    const g = game;
    if (g.flags?.acoustics === false || g.u?.uswallow || g.u?.uunderwater)
        return;

    const lf = g.level?.flags || {};
    const hallu = 0; // Hallucination not modeled in the move loop

    // C ref: sounds.c:213-219 — fountain ambient.  rn2(3) selects the message.
    if (lf.nfountains && !rn2(400)) { You_hear1(FOUNTAIN_MSG[rn2(3) + hallu]); return; }
    // C ref: sounds.c:220-225 — sink ambient ("You hear a slow drip.").
    if (lf.nsinks && !rn2(300)) { You_hear1(SINK_MSG[rn2(2) + hallu]); return; }
    if (lf.has_court && !rn2(200)) { return; }
    // C ref: sounds.c:230-237 — swamp ambient, via You1() not You_hear1().
    if (lf.has_swamp && !rn2(200)) { You1(SWAMP_MSG[rn2(2) + hallu]); return; }
    if (lf.has_vault && !rn2(200)) { return; }
    if (lf.has_beehive && !rn2(200)) { return; }
    if (lf.has_morgue && !rn2(200)) { return; }
    // C ref: sounds.c:286-307 — barracks ambient.  The rn2(3) message roll only
    // fires inside the mercenary loop; since the message-bearing path is what
    // consumes the rn2(3), keep the roll and emit the corresponding text.
    if (lf.has_barracks && !rn2(200)) { You_hear1(BARRACKS_MSG[rn2(3) + hallu]); return; }
    if (lf.has_zoo && !rn2(200)) { return; }
    // C ref: sounds.c:313-328 — shop ambient.
    if (lf.has_shop && !rn2(200)) { You_hear1(SHOP_MSG[rn2(2) + hallu]); return; }
    if (lf.has_temple && !rn2(200)) { return; }
    // C ref: sounds.c:335 — `if (Is_oracle_level(&u.uz) && !rn2(400)) { ... }`.
    // The Oracle level (placed at dnum 0, base 5 range 5) is reached by these
    // descend sessions; its dosounds() makes a trailing rn2(400) chant probe
    // every turn.  get_iter_mons(oracle_sound) (the body) is RNG-inert, so only
    // the probe itself matters for parity.
    if (Is_oracle_level(g.u?.uz) && !rn2(400)) { return; }
}

// C ref: dungeon.h Is_oracle_level(x) = Lcheck(x, &oracle_level) — true when the
// current level position matches the placed oracle_level (same dnum + dlevel).
function Is_oracle_level(uz) {
    const ol = game.oracle_level;
    if (!uz || !ol) return false;
    return uz.dnum === ol.dnum && uz.dlevel === ol.dlevel;
}

// ── ECMD_* return codes (cmd.h) ──
const ECMD_OK = 0;
const ECMD_TIME = 1;

// C ref: sounds.c domonnoise(mtmp) — the speech/sound a monster makes when the
// hero #chats with it.  Only the animal-sound classes the contest pets fall
// into are modelled (dogs -> MS_BARK).  Every domonnoise() path returns
// ECMD_TIME (a turn elapses); the bark/whine selection itself rolls no RNG.
//
// Non-modelled msounds fall through to the silent ECMD_TIME tail — the only
// chat targets in the owned sessions are the starter dog and empty squares.
export async function domonnoise(mtmp) {
    const { pline } = await import('./display.js');
    const { Monnam } = await import('./uhitm.js');
    if (game.u?.Deaf) return ECMD_OK;

    const mlet = mtmp?.data?.mlet;
    let pline_msg = null;

    if (mlet === 'd') { // S_DOG -> MS_BARK
        if (phase_of_the_moon() === FULL_MOON && night()) {
            pline_msg = 'howls.';
        } else if (mtmp.mpeaceful) {
            const moves = game.moves || 1;
            const hungrytime = mtmp.edog ? (mtmp.edog.hungrytime ?? 0) : 0;
            if (mtmp.mtame
                && (mtmp.mconf || mtmp.mflee || mtmp.mtrapped
                    || moves > hungrytime || mtmp.mtame < 5))
                pline_msg = 'whines.';
            else if (mtmp.mtame && hungrytime > moves + 1000)
                pline_msg = 'yips.';
            else
                pline_msg = 'barks.'; // (dingoes excepted; not a starter pet)
        } else {
            pline_msg = 'growls.';
        }
    }

    if (pline_msg) await pline(`${Monnam(mtmp)} ${pline_msg}`);
    return ECMD_TIME;
}
