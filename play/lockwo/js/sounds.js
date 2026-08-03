// sounds.js — Ambient level sounds emitted once per turn.
// C ref: sounds.c dosounds().
//
// Only the RNG side-effects matter for parity.  Each gated probe is driven
// by the current level's flags (data-driven, no per-seed special casing),
// matching the C order exactly; the first probe that "fires" returns.

import { game } from './gstate.js';
import { rn2 } from './rng.js';
import { phase_of_the_moon, night, FULL_MOON } from './calendar.js';
import { VAULT } from './const.js';
import { GOLD_PIECE } from './mkobj.js';
import { DEADMONSTER } from './mon.js';
import { update_topl } from './display.js';

// C ref: sounds.c dosounds().  Deaf/acoustics/swallow/underwater short-circuit
// before any roll.  Each `level.flags.*` clause rolls rn2(N) when the feature
// is present and returns after producing a (suppressed) message.
// C ref: pline.c You_hear() — non-deaf/non-underwater/non-unaware prefix is
// "You hear ".  You_hear1(cstr) == You_hear("%s", cstr).  The starter sessions
// are never Deaf/Underwater/Unaware here, so we emit the plain prefix.  Routed
// through the real update_topl() (not a hand-rolled append) so a message that
// doesn't fit on the same line as an already-pending one pauses with
// "--More--" first, instead of silently overwriting it.
async function You_hear1(cstr) {
    await update_topl('You hear ' + cstr);
}
// C ref: pline.c You() — prefix "You ".  You1(cstr) == You("%s", cstr).
async function You1(cstr) {
    await update_topl('You ' + cstr);
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

// C ref: youprop.h Deaf — HDeaf (an intrinsic timeout) or EDeaf (worn).  Only
// the timed intrinsic is reachable here (rotten food, and the "deafness going
// away" roll in Hear_again).
function Deaf_hero() {
    const u = game.u;
    return ((u?.uprops?.HDeaf ?? 0) > 0) || !!u?.Deaf;
}

export async function dosounds() {
    const g = game;
    // C ref: sounds.c:208 — `if (Deaf || !flags.acoustics || u.uswallow ||
    // Underwater) return;`.  The Deaf test was missing, so a hero deafened by
    // rotten food (eat.c rottenfood -> incr_itimeout(&HDeaf, duration)) kept
    // rolling the ambient-sound draws C skips: seed4500's unconscious turns draw
    // no rn2(200) at all.
    if (Deaf_hero() || g.flags?.acoustics === false || g.u?.uswallow || g.u?.uunderwater)
        return;

    const lf = g.level?.flags || {};
    const hallu = 0; // Hallucination not modeled in the move loop

    // C ref: sounds.c:213-219 — fountain ambient.  rn2(3) selects the message.
    // NOTE: C does NOT return here — nsinks/has_court/etc. below are still
    // rolled this same turn (multiple ambient sounds can stack on one line
    // via update_topl).  A `return` here silently drops every rn2() roll
    // for the rest of the function whenever the 1/400 fountain chance hits.
    if (lf.nfountains && !rn2(400)) { await You_hear1(FOUNTAIN_MSG[rn2(3) + hallu]); }
    // C ref: sounds.c:220-225 — sink ambient ("You hear a slow drip.").  Also
    // falls through (no return) in C — see note above.
    if (lf.nsinks && !rn2(300)) { await You_hear1(SINK_MSG[rn2(2) + hallu]); }
    if (lf.has_court && !rn2(200)) { return; }
    // C ref: sounds.c:230-237 — swamp ambient, via You1() not You_hear1().
    if (lf.has_swamp && !rn2(200)) { await You1(SWAMP_MSG[rn2(2) + hallu]); return; }
    // C ref: sounds.c:238-273 — vault ambient.  gd_sound() gates the rn2(2)
    // message roll; g_at/vault_occupied here always report false because the
    // hero-room-membership list (u.urooms) and the vault-guard subsystem
    // (isgd) aren't tracked by this port, matching an empty urooms / no
    // guard on the level.
    if (lf.has_vault && !rn2(200)) {
        const sroom = game.level?.rooms?.find((r) => r.rtype === VAULT);
        if (!sroom) { lf.has_vault = 0; return; }
        if (gd_sound()) {
            switch (rn2(2) + hallu) {
            case 1: {
                let gold_in_vault = false;
                for (let vx = sroom.lx; vx <= sroom.hx && !gold_in_vault; vx++)
                    for (let vy = sroom.ly; vy <= sroom.hy; vy++)
                        if (gold_at(vx, vy)) { gold_in_vault = true; break; }
                if (!vault_occupied()) {
                    await You_hear1(gold_in_vault ? 'someone counting gold coins.'
                                            : 'someone searching.');
                    break;
                }
                // FALLTHROUGH — hero occupies the vault room; structurally
                // unreachable since vault_occupied() always reports false.
            }
            /* falls through */
            case 0:
                await You_hear1('the footsteps of a guard on patrol.');
                break;
            case 2:
                await You_hear1('Ebenezer Scrooge!');
                break;
            }
        }
        return;
    }
    if (lf.has_beehive && !rn2(200)) { return; }
    if (lf.has_morgue && !rn2(200)) { return; }
    // C ref: sounds.c:286-307 — barracks ambient.  The rn2(3) message roll only
    // fires inside the mercenary loop; since the message-bearing path is what
    // consumes the rn2(3), keep the roll and emit the corresponding text.
    if (lf.has_barracks && !rn2(200)) { await You_hear1(BARRACKS_MSG[rn2(3) + hallu]); return; }
    if (lf.has_zoo && !rn2(200)) { return; }
    // C ref: sounds.c:313-328 — shop ambient.
    if (lf.has_shop && !rn2(200)) { await You_hear1(SHOP_MSG[rn2(2) + hallu]); return; }
    if (lf.has_temple && !rn2(200)) { return; }
    // C ref: sounds.c:335 — `if (Is_oracle_level(&u.uz) && !rn2(400)) { ... }`.
    // The Oracle level (placed at dnum 0, base 5 range 5) is reached by these
    // descend sessions; its dosounds() makes a trailing rn2(400) chant probe
    // every turn.  get_iter_mons(oracle_sound) (the body) is RNG-inert, so only
    // the probe itself matters for parity.
    if (Is_oracle_level(g.u?.uz) && !rn2(400)) { return; }
}

// C ref: vault.c gd_sound() = !(vault_occupied(u.urooms) || findgd()).
function gd_sound() { return !(vault_occupied() || findgd()); }
// C ref: vault.c vault_occupied(u.urooms) — is the hero currently standing in
// a vault room?  u.urooms (the hero's per-room membership list) isn't
// tracked by this port, so this always evaluates false (matching an empty
// array — the same simplification dosounds() uses for u.ushops elsewhere).
function vault_occupied() { return false; }
// C ref: vault.c findgd() — is a vault guard monster on this level (placed or
// migrating in)?  No monster ever carries isgd (the vault-guard subsystem
// isn't ported), so this always evaluates false.
function findgd() {
    for (const m of game.level?.monsters || [])
        if (!DEADMONSTER(m) && m.isgd) return true;
    return false;
}
// C ref: mkobj.c sobj_at(GOLD_PIECE, x, y) — is there floor gold at (x,y)?
function gold_at(x, y) {
    const objs = game.level?.objects;
    if (!objs) return false;
    for (const o of objs)
        if (o.where === 'floor' && o.ox === x && o.oy === y && o.otyp === GOLD_PIECE)
            return true;
    return false;
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
