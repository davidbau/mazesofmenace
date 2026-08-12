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
import { GOLD_PIECE, objects, WEAPON_CLASS } from './mkobj.js';
import { DEADMONSTER } from './mon.js';
import { update_topl } from './display.js';
import {
    msound_of, mflags2_of, M2_MAGIC, is_elf_flag, is_dwarf_flag, is_gnome_flag,
    is_orc_flag, is_human_flag, is_giant_flag,
} from './monflags_data.js';
import { monster_by_pmidx } from './makemon.js';
import { races } from './roles.js';

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

// C ref: include/monflag.h enum ms_sounds — mons[].msound.  Driven off the
// generated MSOUND table (monflags_data.js), never off the monster's name or
// class letter: a name/letter test silently answers "silent" for every species
// it doesn't list.
const MS_SILENT = 0, MS_BARK = 1, MS_MEW = 2, MS_ROAR = 3, MS_BELLOW = 4,
    MS_GROWL = 5, MS_SQEEK = 6, MS_SQAWK = 7, MS_CHIRP = 8, MS_HISS = 9,
    MS_BUZZ = 10, MS_GRUNT = 11, MS_NEIGH = 12, MS_MOO = 13, MS_WAIL = 14,
    MS_GURGLE = 15, MS_BURBLE = 16, MS_TRUMPET = 17, MS_ANIMAL = 17,
    MS_SHRIEK = 18, MS_BONES = 19, MS_LAUGH = 20, MS_MUMBLE = 21,
    MS_IMITATE = 22, MS_WERE = 23, MS_ORC = 24, MS_HUMANOID = 25,
    MS_ARREST = 26, MS_SOLDIER = 27, MS_GUARD = 28, MS_DJINNI = 29,
    MS_NURSE = 30, MS_SEDUCE = 31, MS_VAMPIRE = 32, MS_BRIBE = 33,
    MS_CUSS = 34, MS_RIDER = 35, MS_LEADER = 36, MS_NEMESIS = 37,
    MS_GUARDIAN = 38, MS_SELL = 39, MS_ORACLE = 40, MS_PRIEST = 41,
    MS_SPELL = 42, MS_BOAST = 43, MS_GROAN = 44;

// C ref: include/monsym.h S_CENTAUR — the mons[].mlet the "discusses hunting."
// line keys off.  C ref: role.c roles[] PM_HEALER index.
const S_CENTAUR_MCLS = 29, PM_HEALER = 3;

// C ref: hack.c money_cnt(gi.invent) — the hero's carried gold, used only as a
// boolean by MS_GUARD.  Containers hold no gold in the covered sessions.
function hero_money_cnt() {
    let sum = 0;
    for (const o of (game.invent || []))
        if (o.otyp === GOLD_PIECE) sum += (o.quan || 0);
    return sum;
}

// C ref: polyself.c poly_gender() — 2 when the current form is neuter or not
// humanoid, else flags.female.  Un-poly'd the hero is always humanoid.
function poly_gender() {
    return game.flags?.female ? 1 : 0;
}

// C ref: include/mondata.h likes_magic(ptr) = (mflags2 & M2_MAGIC).
const likes_magic = (ptr) => (mflags2_of(ptr) & M2_MAGIC) !== 0;

// C ref: mondata.c same_race(pm1, pm2) — the player-race predicates first, then
// the looser genus tests.  Only the arms that can pair with a chattable monster
// and a hero form are needed (golem / mind flayer / were / vampire genus tests
// would need their own flag lookups and cannot both be a #chat target and the
// hero's un-poly'd form here).
function same_race(pm1, pm2) {
    if (!pm1 || !pm2) return false;
    if (pm1 === pm2 || pm1.pmidx === pm2.pmidx) return true;
    if (is_human_flag(pm1)) return is_human_flag(pm2);
    if (is_elf_flag(pm1)) return is_elf_flag(pm2);
    if (is_dwarf_flag(pm1)) return is_dwarf_flag(pm2);
    if (is_gnome_flag(pm1)) return is_gnome_flag(pm2);
    if (is_orc_flag(pm1)) return is_orc_flag(pm2);
    if (is_giant_flag(pm1)) return is_giant_flag(pm2);
    return pm1.mlet === pm2.mlet;
}

// C ref: gy.youmonst.data == &mons[u.umonnum], and &mons[Race_switch] (the
// un-poly'd race's base monster) which domonnoise tests alongside it.
function hero_permonst() {
    return (game.u?.umonnum != null) ? monster_by_pmidx(game.u.umonnum) : null;
}
function hero_race_permonst() {
    const r = races[game.initrace];
    return (r?.basepm != null) ? monster_by_pmidx(r.basepm) : null;
}

// C compares against one specific mons[] entry (e.g. `ptr == &mons[PM_DINGO]`).
// These three names are unique in monsters.h, so matching the generated
// pmidx->name is exact — unlike the werecreatures, whose animal and human forms
// share a name and therefore need the PM_ index itself.
const is_pm_named = (ptr, nm) => ptr?.name === nm;

// C ref: sounds.c domonnoise(mtmp) — the speech/sound a monster makes when the
// hero #chats with it (also the pet's `beg()` and #tip).  Ported off msound so
// every species answers, not just the starter pet.
//
// SCOPE: the arms that hand off to an unported subsystem — MS_ORACLE
// (doconsult), MS_PRIEST (priest_talk), MS_LEADER/MS_NEMESIS/MS_GUARDIAN
// (quest_chat), MS_SELL (shk_chat), MS_VAMPIRE and MS_RIDER (both need the
// 3.6-tribute / urace-noun machinery) — fall through to the silent ECMD_TIME
// tail, as does the In_endgame mplayer_talk() arm of MS_HUMANOID.  Their RNG is
// therefore not emitted; nothing in the covered dungeon range reaches them.
// wake_nearto()/aggravate()/nomul() side effects of MS_TRUMPET, MS_WERE,
// MS_SHRIEK and MS_BONES are likewise not replicated (all RNG-free in C, but
// they do clear msleeping, so a deep-level shrieker would still diverge).
export async function domonnoise(mtmp) {
    const { update_topl, map_invisible } = await import('./display.js');
    const { Monnam, canspotmon } = await import('./uhitm.js');
    if (Deaf_hero()) return ECMD_OK;

    const ptr = mtmp?.data;
    let msound = msound_of(ptr) ?? MS_SILENT;
    // C: `if (is_silent(ptr) && !mtmp->isshk) return ECMD_OK;`
    if (msound === MS_SILENT && !mtmp?.isshk) return ECMD_OK;

    // msound remaps.  The quest-leader (leader_m_id) and MS_GUARDIAN genus
    // remaps need quest_status / genus(); neither is reachable here.
    if (mtmp.isshk) msound = MS_SELL;
    else if (msound === MS_ORC
             && (same_race(ptr, hero_permonst())
                 || same_race(ptr, hero_race_permonst()) || !!game.u?.uhallu))
        msound = MS_HUMANOID;
    else if (msound === MS_MOO && !mtmp.mtame) msound = MS_BELLOW;

    // C: do this BEFORE talking — the monster might teleport away, so the
    // 'I' marker has to go on its pre-teleport square.
    if (!canspotmon(mtmp)) map_invisible(mtmp.mx, mtmp.my);

    const moves = game.moves || 1;
    const hungrytime = mtmp.edog ? (mtmp.edog.hungrytime ?? 0) : 0;
    const fullmoon = phase_of_the_moon() === FULL_MOON;
    let pline_msg = null, verbl_msg = null, verbl_msg_mcan = null;

    switch (msound) {
    case MS_WERE:
        // C: `night() ^ !rn2(13)` — the roll happens either way on a full moon.
        // XOR, so at night the howl needs rn2(13) NON-zero and by day zero.
        if (fullmoon && (!!night() !== !rn2(13))) {
            // C picks "shriek" for &mons[PM_HUMAN_WERERAT]; the human and animal
            // were-forms share a name, so that one needs the PM_ index rather
            // than a name compare and is left as the "howl" default.
            await update_topl(`${Monnam(mtmp)} throws back ${mtmp.female ? 'her' : 'his'}`
                + ' head and lets out a blood curdling howl!');
        } else {
            pline_msg = 'whispers inaudibly.  All you can make out is "moon".';
        }
        break;
    case MS_BARK:
        if (fullmoon && night()) {
            pline_msg = 'howls.';
        } else if (mtmp.mpeaceful) {
            if (mtmp.mtame
                && (mtmp.mconf || mtmp.mflee || mtmp.mtrapped
                    || moves > hungrytime || mtmp.mtame < 5))
                pline_msg = 'whines.';
            else if (mtmp.mtame && hungrytime > moves + 1000)
                pline_msg = 'yips.';
            else if (!is_pm_named(ptr, 'dingo')) /* dingos do not actually bark */
                pline_msg = 'barks.';
        } else {
            pline_msg = 'growls.';
        }
        break;
    case MS_MEW:
        if (mtmp.mtame) {
            if (mtmp.mconf || mtmp.mflee || mtmp.mtrapped || mtmp.mtame < 5)
                pline_msg = 'yowls.';
            else if (moves > hungrytime) pline_msg = 'meows.';
            else if (hungrytime > moves + 1000) pline_msg = 'purrs.';
            else pline_msg = 'mews.';
            break;
        }
        /* FALLTHRU */
    case MS_GROWL:
        pline_msg = mtmp.mpeaceful ? 'snarls.' : 'growls!';
        break;
    case MS_ROAR:
        pline_msg = mtmp.mpeaceful ? 'snarls.' : 'roars!';
        break;
    case MS_SQEEK:
        pline_msg = 'squeaks.';
        break;
    case MS_SQAWK:
        if (is_pm_named(ptr, 'raven') && !mtmp.mpeaceful) verbl_msg = 'Nevermore!';
        else pline_msg = 'squawks.';
        break;
    case MS_HISS:
        if (!mtmp.mpeaceful) pline_msg = 'hisses!';
        else return ECMD_OK; /* no sound */
        break;
    case MS_BUZZ:
        pline_msg = mtmp.mpeaceful ? 'drones.' : 'buzzes angrily.';
        break;
    case MS_GRUNT:
        pline_msg = 'grunts.';
        break;
    case MS_NEIGH:
        if ((mtmp.mtame | 0) < 5) pline_msg = 'neighs.';
        else if (moves > hungrytime) pline_msg = 'whinnies.';
        else pline_msg = 'whickers.';
        break;
    case MS_MOO:
        pline_msg = 'moos.';
        break;
    case MS_BELLOW:
        pline_msg = 'bellows!';
        break;
    case MS_CHIRP:
        pline_msg = 'chirps.';
        break;
    case MS_WAIL:
        pline_msg = 'wails mournfully.';
        break;
    case MS_GROAN:
        if (!rn2(3)) pline_msg = 'groans.';
        break;
    case MS_GURGLE:
        pline_msg = 'gurgles.';
        break;
    case MS_BURBLE:
        pline_msg = 'burbles.';
        break;
    case MS_TRUMPET:
        pline_msg = 'trumpets!';
        break;
    case MS_SHRIEK:
        pline_msg = 'shrieks.';
        break;
    case MS_IMITATE:
        pline_msg = 'imitates you.';
        break;
    case MS_BONES:
        await update_topl(`${Monnam(mtmp)} rattles noisily.`);
        await update_topl('You freeze for a moment.');
        break;
    case MS_LAUGH:
        pline_msg = ['giggles.', 'chuckles.', 'snickers.', 'laughs.'][rn2(4)];
        break;
    case MS_MUMBLE:
        pline_msg = 'mumbles incomprehensibly.';
        break;
    case MS_ORC:
        pline_msg = 'grunts.';
        break;
    case MS_DJINNI:
        if (mtmp.mtame) {
            verbl_msg = "Sorry, I'm all out of wishes.";
        } else if (mtmp.mpeaceful) {
            if (is_pm_named(ptr, 'water demon')) pline_msg = 'gurgles.';
            else verbl_msg = "I'm free!";
        } else {
            // C's PM_PRISONER arm ("Get me out of here.") needs the PM_ index.
            verbl_msg = 'This will teach you not to disturb me!';
        }
        break;
    case MS_BOAST:
        if (!mtmp.mpeaceful) {
            switch (rn2(4)) {
            case 0:
                await update_topl(`${Monnam(mtmp)} boasts about`
                    + ` ${mtmp.female ? 'her' : 'his'} gem collection.`);
                break;
            case 1:
                pline_msg = 'complains about a diet of mutton.';
                break;
            default:
                pline_msg = 'shouts "Fee Fie Foe Foo!" and guffaws.';
                break;
            }
            break;
        }
        /* FALLTHRU */
    case MS_HUMANOID:
        if (!mtmp.mpeaceful) {
            pline_msg = 'threatens you.'; /* (In_endgame mplayer: out of scope) */
            break;
        }
        if (mtmp.mflee) pline_msg = 'wants nothing to do with you.';
        else if (mtmp.mhp < Math.floor(mtmp.mhpmax / 4)) pline_msg = 'moans.';
        else if (mtmp.mconf || mtmp.mstun)
            verbl_msg = !rn2(3) ? 'Huh?' : rn2(2) ? 'What?' : 'Eh?';
        else if (!mtmp.mcansee) verbl_msg = "I can't see!";
        else if (mtmp.mtrapped) verbl_msg = "I'm trapped!";
        else if (mtmp.mhp < Math.floor(mtmp.mhpmax / 2))
            pline_msg = 'asks for a potion of healing.';
        else if (mtmp.mtame && !mtmp.isminion && moves > hungrytime)
            verbl_msg = "I'm hungry.";
        else if (is_elf_flag(ptr)) pline_msg = 'curses orcs.';
        else if (is_dwarf_flag(ptr)) pline_msg = 'talks about mining.';
        else if (likes_magic(ptr)) pline_msg = 'talks about spellcraft.';
        else if (ptr?.mcls === S_CENTAUR_MCLS) pline_msg = 'discusses hunting.';
        else if (is_gnome_flag(ptr)) {
            // C: the South Park gag rolls rn2(4) only while hallucinating, and
            // only odd results speak; the roll must still be drawn.
            const gnomeplan = game.u?.uhallu ? rn2(4) : 0;
            if (game.u?.uhallu && (gnomeplan % 2))
                verbl_msg = (gnomeplan === 1) ? 'Phase one, collect underpants.'
                    : 'Phase three, profit!';
            else
                verbl_msg = 'Many enter the dungeon,'
                    + ' and few return to the sunlit lands.';
        } else if (is_pm_named(ptr, 'hobbit')) {
            pline_msg = (mtmp.mhp < mtmp.mhpmax
                         && (mtmp.mhpmax <= 10 || mtmp.mhp <= mtmp.mhpmax - 10))
                ? 'complains about unpleasant dungeon conditions.'
                : 'asks you about the One Ring.';
        } else if (is_pm_named(ptr, 'archeologist')) {
            pline_msg = 'describes a recent article in "Spelunker Today" magazine.';
        } else if (is_pm_named(ptr, 'tourist')) {
            verbl_msg = 'Aloha.';
        } else {
            pline_msg = 'discusses dungeon exploration.';
        }
        break;
    case MS_SEDUCE: {
        // C: with SYSOPT_SEDUCE (the compiled-in default) a NON-nymph that
        // could_seduce() runs doseduce(); nymphs always fall through to the
        // swval roll.  poly_gender() == mtmp->female skips the rn2(3)
        // entirely, which is the usual case (female hero, female nymph).
        const swval = (poly_gender() !== (mtmp.female | 0)) ? rn2(3) : 0;
        if (swval === 2) verbl_msg = 'Hello, sailor.';
        else if (swval === 1) pline_msg = 'comes on to you.';
        else pline_msg = 'cajoles you.';
        break;
    }
    case MS_ARREST:
        if (mtmp.mpeaceful)
            verbl_msg = `Just the facts, ${game.flags?.female ? "Ma'am" : 'Sir'}.`;
        else
            verbl_msg = ['Anything you say can be used against you.',
                "You're under arrest!", 'Stop in the name of the Law!'][rn2(3)];
        break;
    case MS_BRIBE:
        // C: a peaceful non-tame demon runs demon_talk() (bribe negotiation,
        // not ported); otherwise FALLTHRU into MS_CUSS.
        if (mtmp.mpeaceful && !mtmp.mtame) break;
        /* FALLTHRU */
    case MS_CUSS:
        if (!mtmp.mpeaceful) {
            const { cuss } = await import('./monmove.js');
            await cuss(mtmp); /* rolls its own branch selector */
        } else {
            verbl_msg = "We're all doomed."; /* (is_lminion: out of scope) */
        }
        break;
    case MS_SPELL:
        pline_msg = 'seems to mutter a cantrip.';
        break;
    case MS_NURSE: {
        const { is_weptool } = await import('./invent.js');
        const uwep = game.uwep;
        verbl_msg_mcan = 'I hate this job!';
        if (uwep && (objects[uwep.otyp]?.oc_class === WEAPON_CLASS
                     || is_weptool(uwep)))
            verbl_msg = 'Put that weapon away before you hurt someone!';
        else if (game.uarmc || game.uarm || game.uarmh || game.uarms
                 || game.uarmg || game.uarmf)
            // C picks the Healer-specific line via Role_if(PM_HEALER).
            verbl_msg = ((game.urole?.mnum ?? game.u?.umonnum) === PM_HEALER)
                ? "Doc, I can't help you unless you cooperate."
                : 'Please undress so I can examine you.';
        else if (game.uarmu) verbl_msg = 'Take off your shirt, please.';
        else verbl_msg = "Relax, this won't hurt a bit.";
        break;
    }
    case MS_GUARD:
        verbl_msg = hero_money_cnt()
            ? 'Please drop that gold and follow me.' : 'Please follow me.';
        break;
    case MS_SOLDIER:
        verbl_msg = mtmp.mpeaceful
            ? ["What lousy pay we're getting here!",
                "The food's not fit for Orcs!",
                "My feet hurt, I've been on them all day!"][rn2(3)]
            : ['Resistance is useless!', "You're dog meat!", 'Surrender!'][rn2(3)];
        break;
    default:
        break;
    }

    // C: pline("%s %s", Monnam(mtmp), pline_msg) / verbalize1(verbl_msg).  Both
    // are real plines, so a following monster message appends behind a
    // --More-- instead of overwriting this one.
    if (pline_msg) await update_topl(`${Monnam(mtmp)} ${pline_msg}`);
    else if (mtmp.mcan && verbl_msg_mcan) await update_topl(`"${verbl_msg_mcan}"`);
    else if (verbl_msg) await update_topl(`"${verbl_msg}"`);
    return ECMD_TIME;
}
