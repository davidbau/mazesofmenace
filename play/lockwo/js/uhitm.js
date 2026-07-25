// uhitm.js — Hero-vs-monster melee.
// C ref: src/uhitm.c — do_attack(), hitum(), known_hitum(); weapon.c dmgval().
//
// Faithful structural port.  The control flow mirrors uhitm.c do_attack():
//   1. the is_safemon() pet/peaceful "swap or stop" block (consumes rn2(7));
//   2. attack_checks() + the actual hitum() melee for hostile monsters.
// The starter sessions that bump into a tame pet exercise only path (1); the
// rn2(7) it rolls (uhitm.c:474) must be emitted at exactly the right point so
// the downstream RNG stays in lockstep.

import { game } from './gstate.js';
import { rn2, rnd, d } from './rng.js';
import { cansee } from './vision.js';
import { m_at, newsym } from './display.js';
import { isok, IS_OBSTRUCTED, A_STR, A_DEX, A_CON, ACCESSIBLE, TAINT_AGE,
         CORPSTAT_INIT, CORPSTAT_NONE, W_SADDLE, SUPPRESS_SADDLE } from './const.js';
import { Blind } from './vision.js';
import { exercise } from './attrib.js';
import { DEADMONSTER } from './mon.js';
import { mkcorpstat, mkobj, CORPSE, FIGURINE, place_object } from './mkobj.js';
import { mon_nocorpse, undead_to_corpse } from './makemon.js';
import { more_experienced, newexplevel } from './exper.js';

// ── small monster-state predicates (C: include/monst.h, mondata.h) ──

// C ref: include/monst.h:251 — helpless(mon) = msleeping || !mcanmove.
function helpless(mtmp) {
    return !!(mtmp.msleeping || !mtmp.mcanmove);
}

// C ref: include/mondata.h is_longworm() — only long worms have a tail; none
// of the starting pets/early monsters qualify.
function is_longworm(_mdat) {
    return false;
}

// C ref: include/mondata.h passes_walls() — phasing monsters.  Not relevant
// for the starting pet, which never passes walls.
function passes_walls(_mdat) {
    return false;
}

// C ref: display.c is_safemon() macro (include/display.h:159):
//   flags.safe_dog && mpeaceful && canspotmon && !Confusion
//   && !Hallucination && !Stunned.
// safe_dog defaults ON; the early sessions don't disable it.  The hero isn't
// confused/hallucinating/stunned at the bump moment, so those props (not yet
// modelled) read as their default-false.
export function canspotmon(mtmp) {
    if (!mtmp) return false;
    // Blind/telepathy not modelled in the starter state; a lit-room adjacent
    // pet is simply seen when its square is in view.
    if (game.u?.uswallow) return true;
    return cansee(mtmp.mx, mtmp.my);
}

export function is_safemon(mtmp) {
    if (!mtmp) return false;
    const flags = game.flags || {};
    const safe_dog = (flags.safe_dog !== undefined) ? flags.safe_dog : true;
    const Confusion = !!game.u?.uconf;
    const Hallucination = !!game.u?.uhallu;
    const Stunned = !!game.u?.ustun;
    return !!(safe_dog && mtmp.mpeaceful && canspotmon(mtmp)
              && !Confusion && !Hallucination && !Stunned);
}

// C ref: mon.c monflee() — make a monster flee.  For the swap-place path we
// only need the bookkeeping side effects on the (tame) monster; no RNG here.
export function monflee(mtmp, fleetime, _first, _fleemsg) {
    if (!mtmp.mflee) {
        if (fleetime && !mtmp.mfleetim)
            mtmp.mfleetim = Math.min(127, fleetime);
        mtmp.mflee = 1;
    }
}

// ── do_attack ──
// C ref: uhitm.c do_attack(struct monst *mtmp) — try to attack the monster at
// <u.ux+u.dx, u.uy+u.dy>.  Returns TRUE if hero movement is used up, FALSE if
// the monster evaded (so domove falls through to the swap-places logic).
//
// u.dx / u.dy must already be set by the caller (domove).
export async function do_attack(mtmp) {
    const u = game.u;
    const Punished = false; // ball & chain not modelled in starter state
    const forcefight = !!game.context?.forcefight;

    // Protection for peaceful '@' and tame 'd': when safe and not force-
    // fighting, we assume the player isn't trying to attack — usually a
    // place-swap (handled by the caller) instead.  C ref uhitm.c:461-509.
    if (is_safemon(mtmp) && !forcefight) {
        // (Stormbringer override not modelled.)
        const loc = game.level?.at(u.ux, u.uy);
        const obstructed = !!(loc && IS_OBSTRUCTED(loc.typ));
        const foo = (Punished || !rn2(7)
                     || (is_longworm(mtmp.data) && mtmp.wormno)
                     || (obstructed && !passes_walls(mtmp.data)));
        const inshop = false; // no tended shop at the bump square in starter state

        if (inshop || foo) {
            // (shk dopay() path omitted — not reachable here.)
            if (mtmp.mtame) // see 'additional considerations' in C
                monflee(mtmp, rnd(6), false, false);
            // C ref: uhitm.c:495-499 — You("stop.  %s is in the way!", buf) where
            // buf = highc(y_monnam(mtmp)).  This message is ALWAYS emitted here
            // (not only while running); the following end_running(TRUE) is a
            // no-op for the single-step commands the corpus uses.
            const buf = x_monnam(mtmp, /*ARTICLE_YOUR*/ 3, null, 0, false);
            const { pline } = await import('./display.js');
            await pline(`You stop.  ${buf.charAt(0).toUpperCase()}${buf.slice(1)} is in the way!`);
            return true;
        } else if (mtmp.mfrozen || helpless(mtmp)
                   || (movement_rate(mtmp) === 0 && rn2(6))) {
            await plineMon(mtmp, "%s doesn't seem to move!");
            return true;
        } else {
            return false; // monster "evaded" -> caller swaps places
        }
    }

    // Hostile / force-fight melee.  attack_checks() + hitum() are not yet
    // needed by any owned session; emit nothing and fall through so behaviour
    // is conservative.  (Faithful expansion: attack_checks(mtmp, uwep) then
    // hitum(mtmp, youmonst.data->mattk).)
    return await hostile_attack(mtmp);
}

// C ref: include/permonst.h mons[].mmove — base movement rate; pets all move.
function movement_rate(mtmp) {
    // dogs/cats/ponies all have mmove > 0; default to nonzero for the starter
    // monsters (the rn2(6) "doesn't move" branch only matters for mmove==0).
    return (mtmp.data && mtmp.data.mmove != null) ? mtmp.data.mmove : 1;
}

// ── hostile melee: do_attack tail -> hitum -> known_hitum -> hmon ──
//
// C ref: uhitm.c do_attack() (the post-safemon hostile path).  attack_checks()
// consumes no RNG for an ordinary visible adjacent hostile (no displacement, no
// hidden-monster reveal), so the first roll is exercise(A_STR) (uhitm.c:551),
// then hitum().  Faithful to the verified seed0107/seed0104 RNG traces:
//   exercise(A_STR) rn2(19); hitum: rnd(20) [swing], passive rn2(3) [if mon
//   survives a swing], (on hit) dmgval(weapon) [+ exercise(A_DEX) on the first
//   swing], then the kill aftermath (xkilled rn2(6); corpse_chance rn2(2);
//   make_corpse -> mkcorpstat -> mksobj corpse next_ident/rndmonnum/gender).
// C ref: hack.c overexertion() — "combat increases metabolism".  Called by
// do_attack() before the swing.  Always rolls gethungry() (one rn2(20)); the
// overexert_hp() HP-drain branch only triggers when heavily encumbered
// (near_capacity() >= HVY_ENCUMBER) on non-third turns, which never holds for
// the unencumbered starter hero, so only the gethungry roll fires here.
function overexertion() {
    rn2(20); // gethungry() accessorytime (eat.c:3191)
    // near_capacity() == UNENCUMBERED (< HVY_ENCUMBER) -> no overexert_hp().
    return false; // gm.multi >= 0 (hero didn't faint)
}

async function hostile_attack(mtmp) {
    const u = game.u;

    // attack_checks(mtmp, uwep): for an ordinary adjacent, visible hostile the
    // confirmation prompts (peaceful, displacement, hidden monster) don't fire
    // and no RNG is consumed.  bhitpos is the target square.
    game.context = game.context || {};
    game.bhitpos = { x: u.ux + u.dx, y: u.uy + u.dy };

    // C ref: uhitm.c:532-534 — check_capacity(...) || overexertion().
    // check_capacity() is RNG-inert for the unencumbered starter hero, but
    // overexertion() (hack.c:3051) ALWAYS calls gethungry() ("combat increases
    // metabolism"), which rolls a single rn2(20) "accessorytime" (eat.c:3191).
    // This is the per-attack metabolism roll, distinct from the moveloop's
    // per-turn gethungry; it fires at the START of every melee attack, before
    // exercise(A_STR).  Omitting it dropped one rn2(20) per kill turn and shifted
    // the whole post-attack stream by one (seed0006 step 41 / seed0107).
    overexertion();
    // can_twoweapon()/untwoweapon(): the recorded sessions keep two-weapon valid.
    // gu.unweapon "begin bashing" message: no RNG.

    // C ref: uhitm.c:551 — exercise(A_STR, TRUE) "you're exercising muscles".
    exercise(A_STR, true);
    // u_wipe_engr(3): no RNG when not standing on an engraving (starter case).

    // Leprechaun gold-grab dodge (uhitm.c:556) is gated by mdat->mlet ==
    // S_LEPRECHAUN; none of the melee victims here are leprechauns, so the
    // && !rn2(7) is short-circuited and no RNG fires.

    await hitum(mtmp);
    return true;
}

// C ref: uhitm.c mon_maybe_unparalyze() — a paralyzed monster gets a 1-in-10
// chance to wake.  A monster that can move (the common case) consumes no RNG.
// makemon() sets mcanmove TRUE; JS leaves it undefined until the monster first
// moves, so treat null/undefined as "can move" (only an explicit 0 paralyzes).
function mon_maybe_unparalyze(mtmp) {
    if (mtmp.mcanmove === 0) {
        if (!rn2(10)) { mtmp.mcanmove = 1; mtmp.mfrozen = 0; }
    }
}

// C ref: attrib.c acurr() helpers used by abon().
function ACURR(i) { return game.u?.acurr?.a?.[i] ?? 0; }

// C ref: weapon.c abon() — strength/dexterity to-hit bonus (non-polyd).
function abon() {
    const str = ACURR(A_STR), dex = ACURR(A_DEX);
    let sbon;
    if (str < 6) sbon = -2;
    else if (str < 8) sbon = -1;
    else if (str < 17) sbon = 0;
    else if (str < 118 /* STR18(50) */) sbon = 1;
    else if (str < 121 /* STR18(100) */) sbon = 2;
    else sbon = 3;
    sbon += ((game.u?.ulevel || 1) < 3) ? 1 : 0;
    if (dex < 4) return sbon - 3;
    if (dex < 6) return sbon - 2;
    if (dex < 8) return sbon - 1;
    if (dex < 14) return sbon;
    return sbon + dex - 14;
}

// C ref: attrib.c dbon() — strength damage bonus (non-polyd).
function dbon() {
    const str = ACURR(A_STR);
    if (str < 6) return -1;
    if (str < 16) return 0;
    if (str < 18) return 1;
    if (str === 18) return 2;                 /* 18 */
    if (str < 118) return 3;                  /* 18/01..18/49 */
    if (str < 122) return 4;                  /* 18/50..18/99 */
    if (str < 125) return 5;                  /* 18/** (up to 125) */
    return 6;
}

// ── role / martial-arts helpers (for the bare-handed monk path) ──
const PM_MONK = 5, PM_SAMURAI = 9;
function roleMnum() {
    const r = game.urole;
    return (r && r.mnum != null) ? r.mnum : null;
}
function Role_if_MONK() { return roleMnum() === PM_MONK; }
// C ref: include/skills.h martial_bonus() = Role_if(SAMURAI) || Role_if(MONK).
function martial_bonus() {
    const m = roleMnum();
    return m === PM_MONK || m === PM_SAMURAI;
}
// C ref: starting bare-handed-combat skill is P_BASIC (2) for the melee roles.
const P_BASIC = 2;
function bare_handed_skill() { return P_BASIC; }
// C ref: weapon.c weapon_hit_bonus(NULL) — bare-handed-combat branch:
//   bonus = max(P_SKILL, P_UNSKILLED) - 1; bonus = ((bonus+2)*(martial?2:1))/2.
function weapon_hit_bonus_barehand() {
    let bonus = Math.max(bare_handed_skill(), 1) - 1;
    return Math.trunc((bonus + 2) * (martial_bonus() ? 2 : 1) / 2);
}
// C ref: weapon.c weapon_dam_bonus(NULL) — bare-handed-combat branch:
//   bonus = P_SKILL - 1 (>=0); bonus = ((bonus+1)*(martial?3:1))/2.
function weapon_dam_bonus_barehand() {
    let bonus = bare_handed_skill() - 1;
    if (bonus < 0) bonus = 0;
    return Math.trunc((bonus + 1) * (martial_bonus() ? 3 : 1) / 2);
}

// ── weapon data (include/objects.h WEAPON sdam/ldam/hitbon + skill type) ──
// oc_wsdam / oc_wldam (small/large monster damage dice), oc_hitbon (to-hit), and
// the skill discipline.  Keyed by otyp; only the starter-inventory weapons that
// the melee sessions wield need to be present (others fall back to 1-pt damage).
const P_NONE = 0, P_DAGGER = 1, P_KNIFE = 2, P_AXE = 3, P_PICK_AXE = 4,
      P_SHORT_SWORD = 5, P_BROAD_SWORD = 6, P_LONG_SWORD = 7,
      P_TWO_HANDED_SWORD = 8, P_SCIMITAR = 9, P_SABER = 9, P_CLUB = 10,
      P_MACE = 11, P_MORNING_STAR = 12, P_FLAIL = 13, P_HAMMER = 14,
      P_QUARTERSTAFF = 15, P_POLEARMS = 16, P_SPEAR = 17, P_TRIDENT = 18,
      P_LANCE = 19, P_BOW = 20, P_DART = 23, P_TWO_WEAPON_COMBAT = 36;

// otyp -> { ws, wl, hb, sk }.  otyp values match mkobj.js objects[] indices.
// C ref: weapon.c objects[otyp].oc_wldam — large-monster damage die; used by
// lock.c forcelock() to derive the lock-forcing chance (oc_wldam * 2).
export function oc_wldam(otyp) { return WEAP[otyp]?.wl ?? 0; }

const WEAP = {
    24: { ws: 3,  wl: 2,  hb: 0, sk: P_DART },         // DART (objects.h: sdam 3 ldam 2)
    27: { ws: 6,  wl: 8,  hb: 0, sk: P_SPEAR },        // SPEAR
    30: { ws: 8,  wl: 8,  hb: 0, sk: P_SPEAR },        // DWARVISH_SPEAR
    34: { ws: 4,  wl: 3,  hb: 2, sk: P_DAGGER },       // DAGGER
    35: { ws: 5,  wl: 3,  hb: 2, sk: P_DAGGER },       // ELVEN_DAGGER (objects.h: sdam 5 ldam 3 hb 2)
    36: { ws: 3,  wl: 3,  hb: 2, sk: P_DAGGER },       // ORCISH_DAGGER (sdam 3 ldam 3 hb 2)
    37: { ws: 4,  wl: 3,  hb: 2, sk: P_DAGGER },       // SILVER_DAGGER (sdam 4 ldam 3 hb 2)
    39: { ws: 3,  wl: 3,  hb: 2, sk: P_KNIFE },        // SCALPEL (healer start)
    40: { ws: 3,  wl: 2,  hb: 0, sk: P_KNIFE },        // KNIFE
    44: { ws: 6,  wl: 4,  hb: 0, sk: P_AXE },          // AXE
    46: { ws: 6,  wl: 8,  hb: 0, sk: P_SHORT_SWORD },  // SHORT_SWORD
    47: { ws: 8,  wl: 8,  hb: 0, sk: P_SHORT_SWORD },  // ELVEN_SHORT_SWORD (sdam 8 ldam 8)
    48: { ws: 5,  wl: 8,  hb: 0, sk: P_SHORT_SWORD },  // ORCISH_SHORT_SWORD (sdam 5 ldam 8)
    49: { ws: 7,  wl: 8,  hb: 0, sk: P_SHORT_SWORD },  // DWARVISH_SHORT_SWORD (sdam 7 ldam 8)
    50: { ws: 8,  wl: 8,  hb: 0, sk: P_SCIMITAR },     // SCIMITAR
    54: { ws: 8,  wl: 12, hb: 0, sk: P_LONG_SWORD },   // LONG_SWORD
    56: { ws: 10, wl: 12, hb: 1, sk: P_LONG_SWORD },   // KATANA
    72: { ws: 6,  wl: 8,  hb: 0, sk: P_LANCE },        // LANCE (mkobj.js otyp 72)
    73: { ws: 6,  wl: 6,  hb: 0, sk: P_MACE },         // MACE  (mkobj.js otyp 73; +1 small)
    79: { ws: 6,  wl: 6,  hb: 0, sk: P_QUARTERSTAFF }, // QUARTERSTAFF (wizard start)
};

// C ref: weapon.c weapon_hit_bonus(weapon) — skill-based to-hit modifier.  The
// starter sessions wield a single-discipline weapon (skill P_BASIC, from being
// in inventory) and, when two-weaponing, use P_TWO_WEAPON_COMBAT at P_UNSKILLED
// (it is not granted by carried weapons at game start, so skill_init leaves it
// UNSKILLED).  A role that starts mounted (Knight) has P_RIDING == P_BASIC.
function weapon_hit_bonus(weapon) {
    const u = game.u;
    const w = weapon ? WEAP[weapon.otyp] : null;
    const wep_type = w ? w.sk : P_NONE;
    const twoweap = !!u?.twoweap
        && (weapon === game.uwep || weapon === game.uswapwep);
    let bonus = 0;

    if (!twoweap) {
        if (wep_type === P_NONE) bonus = 0;
        else bonus = 0;                       // wielded weapon skill P_BASIC -> 0
    } else {
        // skill = min(P_SKILL(P_TWO_WEAPON_COMBAT)=UNSKILLED, P_SKILL(wep_type)
        //             =BASIC) == UNSKILLED -> -9 (two-weapon penalty).
        bonus = -9;
    }

    // Riding penalty (KMH): harder to hit while mounted.  A starter Knight has
    // P_RIDING == P_BASIC -> -1; an unmounted hero takes no penalty.
    if (u?.usteed) bonus -= 1;                // P_BASIC riding
    return bonus;
}

// C ref: weapon.c hitval(otmp, mon) — weapon-specific to-hit (spe + oc_hitbon;
// the vs-monster bonuses don't apply to the starter weapon/victim matchups).
function hitval(weapon, mtmp) {
    if (!weapon) return 0;
    const w = WEAP[weapon.otyp];
    return (weapon.spe || 0) + (w ? w.hb : 0);
}

// C ref: worn.c find_mac(mtmp) — base AC (no worn armour on these monsters).
function find_mac(mtmp) {
    const ac = mtmp?.data?.ac;
    return (ac != null) ? ac : 10;
}

// C ref: uhitm.c find_roll_to_hit(mtmp, aatyp, weapon, ...) — the "to hit"
// number; the swing connects when this exceeds the d20 dieroll.  Models the
// AT_WEAP path components present in the starter sessions (base, abon, AC,
// low-level/ vs-state adjustments, weapon hitval + skill bonus).  uhitinc and
// the Luck/encumbrance/utrap/polyd/orc terms are 0 for these heroes.
function find_roll_to_hit(mtmp, weapon) {
    const u = game.u;
    // C: 1 + abon() + find_mac(mtmp) + u.uhitinc + Luck-term
    //    + maybe_polyd(youmonst.data->mlevel, u.ulevel).  A non-polymorphed hero
    //    contributes maybe_polyd == u.ulevel; the starter heroes are never polyd
    //    here.  The Luck adjustment sgn(Luck)*((|Luck|+2)/3) is 0 at Luck 0.
    const luck = u.uluck || 0;
    const luckTerm = Math.sign(luck) * Math.trunc((Math.abs(luck) + 2) / 3);
    let tmp = 1 + abon() + find_mac(mtmp) + (u.uhitinc || 0)
              + luckTerm + (u.ulevel || 1);
    // vs. monster state.  C tests !mtmp->mcanmove, which is FALSE for a freshly
    // generated (awake, mobile) monster — makemon sets mcanmove TRUE.  JS leaves
    // it undefined until a monster first acts, so only an explicit 0 (paralyzed/
    // sleeping) should add the +4; undefined means "can move" (no bonus).
    if (mtmp.mstun) tmp += 2;
    if (mtmp.mflee) tmp += 2;
    if (mtmp.msleeping) tmp += 2;
    if (mtmp.mcanmove === 0) tmp += 4;
    // C ref: uhitm.c — a bare-handed Monk (no uwep/uarm/uarms) gains ulevel/3+2.
    // The starter monk has no body armour/shield, so the gate is just !uwep.
    if (Role_if_MONK() && !weapon) {
        tmp += Math.trunc((u.ulevel || 1) / 3) + 2;
    }
    // AT_WEAP: weapon hitval + weapon skill bonus.  Bare-handed uses the
    // martial-arts weapon_hit_bonus(NULL) branch (uhitm.c find_roll_to_hit).
    tmp += hitval(weapon, mtmp);
    tmp += weapon ? weapon_hit_bonus(weapon) : weapon_hit_bonus_barehand();
    return tmp;
}

// C ref: uhitm.c hitum(mon, uattk) — deliver a melee swing (and, when two-
// weaponing, a second swing with uswapwep).  Returns whether mon still lives.
async function hitum(mon) {
    const u = game.u;
    const x = u.ux + u.dx, y = u.uy + u.dy;
    const secondwep = u.twoweap ? game.uswapwep : null;
    const twohits = (game.uwep ? !!u.twoweap : false);

    // ── first swing (uwep) ──
    let tmp = find_roll_to_hit(mon, game.uwep);
    mon_maybe_unparalyze(mon);
    let dieroll = rnd(20);                     // uhitm.c:780
    let mhit = (tmp > dieroll);
    if (mhit) exercise(A_DEX, true);           // uhitm.c:783 (on hit only)
    let malive = await known_hitum(mon, game.uwep, mhit, dieroll);
    // passive(mon, uwep, mhit, malive, AT_WEAP): the defender's passive counter
    // fires after every swing (even a miss) while the monster is alive.
    passive(mon, mhit, malive);

    // ── second swing (uswapwep) for two-weapon combat ──
    if (twohits && malive && m_at(x, y) === mon) {
        tmp = find_roll_to_hit(mon, game.uswapwep);
        mon_maybe_unparalyze(mon);
        dieroll = rnd(20);                     // uhitm.c:804
        mhit = (tmp > dieroll);
        // note: the second swing does NOT roll exercise(A_DEX) (uhitm.c).
        malive = await known_hitum(mon, secondwep, mhit, dieroll);
        // second passive counter-attack only occurs if the second swing hit.
        if (mhit) passive(mon, mhit, malive);
    }
    return malive;
}

// C ref: uhitm.c known_hitum() — apply a swing's outcome.  Miss -> missum();
// hit -> hmon() (damage + possible kill).  Returns whether mon still lives.
async function known_hitum(mon, weapon, mhit, dieroll) {
    if (!mhit) {
        await missum(mon);
        return true;
    }
    const oldhp = mon.mhp;
    const malive = await hmon(mon, weapon, dieroll);
    // C ref: uhitm.c known_hitum():624 — a monster that SURVIVES the hit has a
    // 1/25 chance to flee if reduced below half HP.  The rn2(25) gate fires for
    // every surviving hit; only on a 0 (and mhp < mhpmax/2) does monflee roll
    // its own rn2(3) duration (seed5002 step-242: rn2(25) after hitting the
    // small mimic).  (Vorpal-blade "hit converted to miss" not modeled.)
    if (malive) {
        if (!rn2(25) && (mon.mhp < Math.trunc((mon.mhpmax ?? 0) / 2))) {
            // monflee(mon, !rn2(3) ? rnd(100) : 0, FALSE, TRUE)
            if (!rn2(3)) rnd(100);
            mon.mflee = 1;
        }
        void oldhp;
    }
    return malive;
}

// C ref: uhitm.c missum() — the "You miss the <mon>." top-line message.
async function missum(mon) {
    const { update_topl } = await import('./display.js');
    if (canspotmon(mon))
        await update_topl(`You miss ${mon_nam(mon)}.`);
    else
        await update_topl('You miss it.');
    // wakeup(mon) sets msleeping=0/mstrategy; no RNG for an already-awake mon.
    mon.msleeping = 0;
}

// C ref: uhitm.c hmon()/hmon_hitmon() — the weapon-melee damage path (the only
// branch the starter sessions reach: a wielded WEAPON_CLASS blade vs an
// ordinary monster).  Rolls dmgval(weapon, mon), applies STR/skill bonuses,
// subtracts from mon->mhp, and on a kill runs the xkilled() aftermath.
async function hmon(mon, weapon, dieroll) {
    const unarmed = !weapon;
    let dmg;
    if (unarmed) {
        // hmon_hitmon_barehands (uhitm.c:847): dmg = rnd(martial ? 4 : 2).
        dmg = rnd(martial_bonus() ? 4 : 2);
    } else {
        // hmon_hitmon_weapon_melee: dmg = dmgval(weapon, mon).
        dmg = dmgval(weapon, mon);
    }

    // hmon_hitmon_dmg_recalc: strength + skill bonuses (get_dmg_bonus).  For a
    // two-weapon swing the STR bonus is scaled to 3/4; udaminc is 0 for the
    // starter hero.  weapon_dam_bonus is 0 at P_BASIC for a wielded weapon, and
    // the martial barehand branch for an unarmed monk/samurai.
    if (dmg > 0) {
        let strbonus = dbon();
        if (game.u?.twoweap) {
            const absb = Math.abs(strbonus);
            strbonus = Math.trunc((3 * absb + 2) / 4) * Math.sign(strbonus || 1);
            if (strbonus === 0 && dbon() !== 0) strbonus = 0;
        }
        dmg += strbonus;
        dmg += unarmed ? weapon_dam_bonus_barehand() : 0;
        if (dmg < 1) dmg = 1;
    }

    // C ref uhitm.c:1825-1831 — the stagger/knockback gate, an if/else-if:
    //   unarmed && dmg>1 && !thrown && !obj && !Upolyd      -> hmon_hitmon_stagger
    //   !unarmed && dmg>1 && !thrown && !Upolyd && !twoweap && uwep -> maybe_knockback
    // (jousting omitted — no lance/steed here).  This is evaluated BEFORE the
    // mhp subtraction; stagger rolls rnd(100) immediately, knockback is deferred
    // until after a surviving hit (below).
    let maybe_knockback = false;
    if (unarmed && dmg > 1) {
        rnd(100);                              // hmon_hitmon_stagger (uhitm.c:1576)
    } else if (!unarmed && dmg > 1 && !game.u?.twoweap && game.uwep) {
        maybe_knockback = true;                // uhitm.c:1831
    }

    mon.mhp = (mon.mhp || 0) - dmg;
    if (mon.mhpmax != null && mon.mhp > mon.mhpmax) mon.mhp = mon.mhpmax;

    if (mon.mhp <= 0 || DEADMONSTER(mon)) {
        // hmon_hitmon_msg_hit is suppressed once destroyed; killed() gives the
        // "You kill the <mon>!" message and runs the corpse/treasure aftermath.
        await killed(mon);
        return false;
    }

    // C ref: uhitm.c:1644 hmon_hitmon_msg_hit() — the surviving hand-to-hand
    // hit message.  When flags.verbose is OFF the terse "You hit it." is used
    // UNCONDITIONALLY (regardless of whether the monster is spotted); only in
    // verbose mode does it name the monster.  (seed4500 sets `!verbose` in its
    // nethackrc, so an adjacent, fully-visible earth elemental still prints
    // "You hit it.")
    const { update_topl } = await import('./display.js');
    const verbose = game.flags?.verbose !== false;
    if (!verbose)
        await update_topl('You hit it.');
    else if (canspotmon(mon))
        await update_topl(`You hit ${mon_nam(mon)}.`);
    else
        await update_topl('You hit it.');
    mon.msleeping = 0;

    // C ref uhitm.c:1922-1931 — wakeup(mon) then, for a surviving armed hit,
    // mhitm_knockback(&youmonst, mon, ...).  Its leading rolls always fire:
    //   knockdistance = rn2(3)        (uhitm.c:5258)
    //   if (rn2(chance)) return FALSE  (uhitm.c:5269, chance==6, no ogresmasher)
    // The contest hits all take the 5/6 "no knockback" branch, so the later
    // size/solidity gates draw nothing.  (seed5002 step-242: hero hits the
    // small mimic — the rn2(6) chance roll must follow the rn2(3) knockdistance.)
    if (maybe_knockback) {
        rn2(3);                                // knockdistance (uhitm.c:5258)
        rn2(6);                                // chance         (uhitm.c:5269)
    }
    return true;
}

// C ref: uhitm.c passive(mon, weapon, mhit, malive, AT_WEAP, ...) — the
// defender's passive counter-attack.  Walks mattk[] to the AT_NONE terminator
// (the passive slot); for a monster with no defined passive damage that slot is
// damn==damd==0 (tmp = 0, no d() roll).  When the monster survives and isn't
// cancelled, `if (malive && !mcan && rn2(3))` rolls rn2(3); for an AD_PHYS / no
// passive attack the switch does nothing further.  The early "affect you even
// if it died" switch is also a no-op for AD_PHYS/AD_STCK passive slots.
function passive(mon, mhit, malive) {
    // Passive-slot damage dice: the starter melee victims (lichen, goblin, ...)
    // have an AT_NONE passive terminator (damn=damd=0) -> no d() roll.  (If a
    // modelled victim grows a real passive attack later, add its damn/damd here.)
    if (!malive || mon.mcan) return;
    rn2(3);                                    // uhitm.c:6019
}

// ── kill aftermath: killed -> xkilled -> mondead + make_corpse ──
// C ref: mon.c killed()/xkilled().  Emits "You kill the <mon>!", rolls the
// treasure-drop gate rn2(6), removes the monster, and (corpse_chance rn2(2))
// drops a corpse via make_corpse() -> mkcorpstat() -> mksobj() (which rolls the
// corpse's next_ident, rndmonnum reservoir scan, and gender rn2(2)).
async function killed(mon) {
    const { update_topl } = await import('./display.js');
    const x = mon.mx, y = mon.my;
    mon.mhp = 0;

    // u.uconduct.killer++ : no RNG.
    if (canspotmon(mon))
        await update_topl(`You ${nonliving(mon) ? 'destroy' : 'kill'} ${mon_nam(mon)}!`);
    else
        await update_topl(`You ${nonliving(mon) ? 'destroy' : 'kill'} it!`);

    // illogical-but-traditional treasure drop gate (mon.c:3587).  C also gates
    // on !(mvitals[mndx].mvflags & G_NOCORPSE): a G_NOCORPSE species (grid bug,
    // gas spore, …) never drops the extra item.  The rn2(6) still rolls first.
    const mndx0 = mon.data?.pmidx;
    const nocorpse = (mndx0 != null) ? mon_nocorpse(mndx0) : false;
    let dropTreasure = false;
    if (!rn2(6) && !nocorpse && (x !== game.u.ux || y !== game.u.uy)) {
        dropTreasure = true;          // mdat->mlet S_KOP / mcloned excluded
    }

    // mondead(): detach the monster from the level BEFORE the once-per-turn
    // mcalcmove realloc (allmain.js) so that loop iterates the post-kill set,
    // matching C (fmon has the dead monster purged by the next round).
    const list = game.level?.monsters;
    if (list) {
        const idx = list.indexOf(mon);
        if (idx >= 0) list.splice(idx, 1);
    }

    // C ref: mon.c m_detach() -> relobj(mtmp, 1, FALSE) — when a monster dies it
    // drops everything in mtmp->minvent onto the map at mx,my (consumes no RNG).
    // A killed kobold/orc/gnome leaves its starting darts/weapon on the floor,
    // which then renders as a ')' object glyph at the kill location.
    relobj(mon, x, y);

    // corpse_chance(mon): mon.c:3248 rn2(2 + (G_FREQ<2) + verysmall).
    const accessible = (() => {
        const t = game.level?.at(x, y)?.typ;
        return t != null && ACCESSIBLE(t);
    })();
    if (dropTreasure) {
        // mkobj(RANDOM_CLASS, TRUE): the item's own rolls (class, type,
        // enchant, erosion, …) always fire before its fate is decided.
        const otmp = mkobj(0 /*RANDOM_CLASS*/, true);
        const otyp = otmp.otyp;
        // C ref: mon.c:3600 xkilled() — "don't create large objects from
        // small monsters": mdat->msize < MZ_HUMAN && otyp != FIGURINE &&
        // (owt>30 || oc_big) routes to delobj() instead of placing it.  (The
        // objects[] table here doesn't carry oc_big, so only the weight leg
        // of that OR is checked — every otyp big enough to matter is also
        // over the 30-unit threshold.)  delobj_core() always rolls
        // obj_resists(obj,0,0)'s rn2(100) (the Amulet/invocation-tool guard)
        // even though an ordinary item never resists — skipping that roll
        // (as a bare place always would) desyncs every RNG draw after it,
        // including corpse_chance() below.
        if ((mon.data?.msize ?? 2 /* MZ_HUMAN */) < 2 && otyp !== FIGURINE
            && (otmp.owt || 0) > 30) {
            const { delobj } = await import('./invent.js');
            delobj(otmp);
        } else {
            place_object(otmp, x, y);
        }
    }
    if (corpse_chance(mon) && accessible) {
        make_corpse(mon, x, y);
    }

    // C ref: mon.c xkilled() — give experience points (no RNG).  experience()
    // bumps u.uexp via more_experienced(); newexplevel() may level the hero up.
    // Without this the status line's Xp:lvl/exp field stayed at the pre-kill
    // value, so every post-kill screen mismatched on that one stat cell.
    more_experienced(experience(mon), 0);
    newexplevel();

    if (x > 0 && y > 0) newsym(x, y);
}

// C ref: steal.c relobj(mtmp, 1, FALSE) via mdrop_obj() — drop every object in
// the dead monster's minvent onto the map at (x,y).  No RNG.  flooreffects()
// (water/trap interactions) is not reachable for the modelled corridor/room
// kills, so each object is simply placed and stacked with any matching floor
// stack at the same cell (NetHack merges same-type drops via stackobj()).
function relobj(mon, x, y) {
    const inv = mon?.minvent;
    if (!inv || !inv.length) return;
    const objs = (game.level && (game.level.objects || (game.level.objects = []))) || null;
    if (!objs) return;
    for (const otmp of inv) {
        // mdrop_obj -> place_object + stackobj.  Merge into an existing floor
        // stack of the same otyp/spe so quantities combine like C stackobj().
        let merged = false;
        for (const f of objs) {
            if (f.where === 'floor' && f.ox === x && f.oy === y
                && f.otyp === otmp.otyp && (f.spe || 0) === (otmp.spe || 0)
                && f.otyp !== CORPSE) {
                f.quan = (f.quan || 1) + (otmp.quan || 1);
                merged = true;
                break;
            }
        }
        if (!merged) place_object(otmp, x, y);
    }
    mon.minvent = [];
}

// C ref: monattk.h attack-type / damage-type constants used by experience().
const AT_BUTT = 4, AT_WEAP = 254, AT_MAGC = 255;
const AD_PHYS = 0, AD_BLND = 11, AD_DRLI = 15, AD_STON = 18, AD_SLIM = 40;

// Per-monster attack list (aatyp, adtyp, damn, damd) for the monsters the hero
// kills across the contest sessions, ported verbatim from include/monsters.h
// ATTK() entries.  experience() iterates these exactly like C's ptr->mattk[].
// Monsters not listed are ordinary single physical-melee attackers (AT_BITE/
// AT_CLAW, AD_PHYS) which contribute no attack/damage-type bonus, so the
// fallback (empty list) reproduces their XP value (1 + m_lev^2 + AC bonus).
function A(aatyp, adtyp, damn, damd) { return { aatyp, adtyp, damn, damd }; }
const MON_ATTACKS = {
    // AT_WEAP attackers (+5 each) — kobolds/orcs/gnomes/dwarves.
    'kobold':       [A(AT_WEAP, 0, 1, 4)],
    'large kobold': [A(AT_WEAP, 0, 1, 6)],
    'goblin':       [A(AT_WEAP, 0, 1, 4)],
    'gnome':        [A(AT_WEAP, 0, 1, 6)],
    'gnome lord':   [A(AT_WEAP, 0, 1, 8)],
    'gnome king':   [A(AT_WEAP, 0, 2, 6)],
    'dwarf':        [A(AT_WEAP, 0, 1, 8)],
    // AT_TUCH/AD_STCK (lichen) — AT_TUCH(5) > AT_BUTT so +3.
    'lichen':       [A(5 /*AT_TUCH*/, 19 /*AD_STCK*/, 0, 0)],
    // AT_BOOM (gas spore) — AT_BOOM(14) > AT_BUTT so +3; damd*damn=24>23 -> +m_lev.
    'gas spore':    [A(14 /*AT_BOOM*/, 0, 4, 6)],
    // nymphs — twin AT_CLAW with AD_SITM/AD_SEDU (each non-PHYS -> +m_lev).
    'water nymph':  [A(1 /*AT_CLAW*/, 21 /*AD_SITM*/, 0, 0), A(1, 22 /*AD_SEDU*/, 0, 0)],
    'wood nymph':   [A(1, 21, 0, 0), A(1, 22, 0, 0)],
    'mountain nymph':[A(1, 21, 0, 0), A(1, 22, 0, 0)],
    // AT_BITE/AD_ELEC (grid bug) — BITE adds no attack bonus; AD_ELEC -> +2*m_lev.
    'grid bug':     [A(2 /*AT_BITE*/, 6 /*AD_ELEC*/, 1, 1)],
    // earth elemental — AT_CLAW/AD_PHYS 4d6: no attack/damage-type bonus, but
    // damd*damn=24>23 gives the heavy-damage +m_lev (seed4500 step-269 XP=78).
    'earth elemental': [A(1 /*AT_CLAW*/, 0 /*AD_PHYS*/, 4, 6)],
};

// C ref: exper.c experience(mtmp, nk) — the XP value of a slain monster.  No
// RNG.  Iterates the monster's actual mattk[] list for the special attack-type
// and damage-type experience bonuses.
function experience(mtmp) {
    const NORMAL_SPEED_C = 12;
    const data = mtmp.data || {};
    const m_lev = mtmp.m_lev ?? data.mlevel ?? 0;
    let tmp = 1 + m_lev * m_lev;

    // higher-AC bonus: tmp += (7 - ac) * (ac<0 ? 2 : 1) when ac < 3.
    const i = find_mac(mtmp);
    if (i < 3) tmp += (7 - i) * ((i < 0) ? 2 : 1);

    // very-fast-monster bonus (data carries mmove for the few fast monsters).
    const mmove = data.mmove ?? 0;
    if (mmove > NORMAL_SPEED_C)
        tmp += (mmove > (3 * NORMAL_SPEED_C / 2)) ? 5 : 3;

    const attacks = MON_ATTACKS[data.name] || [];

    // special attack-type bonus (exper.c:101).  AT_WEAP -> +5; AT_MAGC -> +10;
    // other types > AT_BUTT -> +3.  Ordinary AT_BITE/AT_CLAW add nothing.
    for (const a of attacks) {
        const t = a.aatyp;
        if (t > AT_BUTT) {
            if (t === AT_WEAP) tmp += 5;
            else if (t === AT_MAGC) tmp += 10;
            else tmp += 3;
        }
    }

    // special damage-type bonus (exper.c:113).
    for (const a of attacks) {
        const t2 = a.adtyp;
        if (t2 > AD_PHYS && t2 < AD_BLND) tmp += 2 * m_lev;
        else if (t2 === AD_DRLI || t2 === AD_STON || t2 === AD_SLIM) tmp += 50;
        else if (t2 !== AD_PHYS) tmp += m_lev;
        if (a.damd * a.damn > 23) tmp += m_lev; // extra heavy-damage bonus
        // AD_WRAP/S_EEL term not reachable for these monsters.
    }

    if (m_lev > 8) tmp += 50;
    return tmp;
}

// C ref: mon.c corpse_chance(mon).  bigmonst/lizard (uncloned), golem, mplayer,
// rider, shk all GUARANTEE a corpse and return TRUE with NO rn2 roll (mon.c:
// 3246); only the ordinary case rolls rn2(2 + (G_FREQ<2) + verysmall).  Missing
// the guaranteed-corpse short-circuit made JS roll an extra rn2 when killing a
// big monster (seed4500 step-269: the MZ_HUGE earth elemental).  (The lich/Vlad
// crumble, gas-spore AT_BOOM explosion, and LEVEL_SPECIFIC_NOCORPSE special
// cases that precede this in C are not exercised by the corpse_chance kills in
// the sessions and are intentionally not modeled here.)
export function corpse_chance(mon) {
    const mdat = mon.data || {};
    const bigOrLizard = (largemonst(mdat) || mdat.name === 'lizard') && !mon.mcloned;
    const golem = /\bgolem$/.test(mdat.name || '');
    if (bigOrLizard || golem || mon.isshk) return true; // guaranteed, no roll
    const geno = mdat.geno || 0;
    const G_FREQ = geno & 7;
    const verysmall = mdat.verysmall ? 1 : 0;
    const tmp = 2 + (G_FREQ < 2 ? 1 : 0) + verysmall;
    return !rn2(tmp);                          // mon.c:3248
}

// C ref: mon.c make_corpse() default path -> mkcorpstat(CORPSE, KEEPTRAITS?mon
// :0, mdat, x, y, CORPSTAT_INIT).  mksobj() builds the corpse object: rolls the
// next_ident o_id, the rndmonnum() reservoir scan (overwritten with mdat after),
// the gender rn2(2), and start_corpse_timeout().  Reuses mkobj.js verbatim.
export function make_corpse(mon, x, y) {
    const mndx = mon.data?.pmidx;
    if (mndx == null) return;
    // C ref: mon.c make_corpse() — zombies, mummies and vampires are handled by
    // their own switch cases BEFORE the default G_NOCORPSE guard: they always
    // leave a corpse of their base living species (undead_to_corpse), and it is
    // an *old* corpse (age -= TAINT_AGE+1).  Their undead form carries G_NOCORPSE
    // (that flag only blocks *random* corpse generation), so without this branch
    // the corpse — and its next_ident/rndmonnum/gender/timeout RNG — was skipped.
    const base = undead_to_corpse(mndx);
    if (base !== mndx) {
        const obj = mkcorpstat(CORPSE, mon, base, x, y, CORPSTAT_INIT | CORPSTAT_NONE);
        if (obj != null)
            obj.age = (obj.age ?? Math.max(game.moves ?? 1, 1)) - (TAINT_AGE + 1);
        return obj;
    }
    // C ref: mon.c:893 make_corpse default path — a G_NOCORPSE species (grid
    // bug, gas spore, …) returns NULL with NO mksobj rolls.  corpse_chance()
    // still rolled its rn2 in the caller; only the corpse object is suppressed.
    if (mon_nocorpse(mndx)) return;
    // mkcorpstat(CORPSE, KEEPTRAITS(mon)?mon:0, mdat, x, y, CORPSTAT_INIT):
    // mksobj() rolls next_ident, the rndmonnum() reservoir scan, gender rn2(2),
    // and start_corpse_timeout().  pm (mndx) overrides the rolled corpsenm after.
    mkcorpstat(CORPSE, mon, mndx, x, y, CORPSTAT_INIT | CORPSTAT_NONE);
}

// ── dmgval ──
// C ref: weapon.c dmgval(struct obj *otmp, struct monst *mon) — base weapon
// damage roll (oc_wsdam / oc_wldam dice) plus the per-weapon "extra" additions
// for weapons whose damage isn't an even die, plus enchantment.  The
// strength/skill bonuses are applied separately by hmon_hitmon_dmg_recalc().
export function dmgval(otmp, mon) {
    if (!otmp) return 1; // bare-handed minimum
    const mdat = mon?.data;
    const large = largemonst(mdat);
    const w = WEAP[otmp.otyp];
    const otyp = otmp.otyp;
    let tmp = 0;

    if (large) {
        if (w && w.wl) tmp = rnd(w.wl);          // large-monster damage die
        // weapon.c large-monster "extra" additions:
        switch (otyp) {
        case 50: case 54: tmp += 0; break;       // SCIMITAR/LONG_SWORD: none
        case 56: tmp += 0; break;                // KATANA: none
        case 55: tmp += d(2, 6); break;          // TWO_HANDED_SWORD: +2d6
        default: break;
        }
    } else {
        if (w && w.ws) tmp = rnd(w.ws);          // small-monster damage die
        // weapon.c small-monster "extra" additions (weapon.c:266-295):
        switch (otyp) {
        case 73: tmp += 1; break;                // MACE (mkobj.js otyp 73): +1
        case 27: tmp += 0; break;                // SPEAR: none
        default: break;
        }
    }
    tmp += otmp.spe || 0;
    if (tmp < 1) tmp = 1;
    return tmp;
}

// C ref: include/mondata.h bigmonst() / mons[].msize >= MZ_LARGE.
function largemonst(mdat) {
    return !!(mdat && mdat.msize != null && mdat.msize >= 4 /* MZ_LARGE */);
}

// ── messaging helpers ──
// Lazy import of pline to avoid a static import cycle (display <- uhitm).
async function plineMon(mtmp, fmt) {
    const { pline } = await import('./display.js');
    await pline(fmt.replace('%s', Monnam(mtmp)));
}

// C ref: do_name.c mon_nam(mtmp) — "the <mon>" (lower case article).
export function mon_nam(mtmp) {
    return x_monnam(mtmp, /*ARTICLE_THE*/ 1, null, 0, false);
}

// C ref: mondata.h nonliving(ptr) = is_undead || PM_MANES || weirdnonliving
// (golem or S_VORTEX).  These are "destroyed" rather than "killed".  NOTE:
// elementals are LIVING in C (S_ELEMENTAL is not golem/vortex/undead), so an
// earth elemental is "killed", not "destroyed" (seed4500 step-269).
function nonliving(mtmp) {
    const name = mtmp?.data?.name || '';
    // is_undead (M2_UNDEAD): zombies, mummies, skeletons, wraiths, ghouls,
    // ghosts, liches, vampires, shades + manes; weirdnonliving: golems, vortices.
    return /\bzombie\b|\bmummy\b|\bskeleton\b|\bwraith\b|\bghoul\b|\bghost\b|\blich\b|\bvampire\b|golem\b|\bvortex\b|\bshade\b|\bmanes\b/.test(name);
}

// C ref: do_name.c Monnam()/x_monnam() — capitalized monster name.  Minimal
// port sufficient for the starter monsters (no shopkeepers/priests/hallu).
export function Monnam(mtmp) {
    const s = x_monnam(mtmp, /*ARTICLE_THE*/ 1, null, 0, false);
    return s.charAt(0).toUpperCase() + s.slice(1);
}

// C ref: do_name.c x_monnam().  Reduced to the cases the starter sessions
// need: a tame monster with (ARTICLE_YOUR) and an optional given name.
//   article: 0 NONE, 1 THE, 2 A, 3 YOUR.
export function x_monnam(mtmp, article, _adjective, _suppress, _called) {
    const base = mtmp?.data?.name || 'monster';
    const given = mtmp?.mgivenname || mtmp?.mextra?.mgivenname;

    // C ref: do_name.c x_monnam do_it — an unspottable monster (e.g. while the
    // hero is blind) is just "it" unless ARTICLE_YOUR was requested.  Gated on
    // Blind specifically (rather than the broader !canspotmon) to avoid shifting
    // coincidental matches in early-diverged sessions whose monsters are merely
    // out of line-of-sight; the recorded seed5006 case is blindfold-blindness.
    if (article !== 3 && mtmp && mtmp !== game.u?.usteed
        && (game.u?.ublindf || (game.u?.blinded || 0) > 0 || game.ublindf)
        && !canspotmon(mtmp))
        return 'it';

    // ARTICLE_YOUR only applies to tame monsters; otherwise downgrade to THE.
    if (article === 3 && !mtmp.mtame) article = 1;

    if (given) {
        // A personal name stands alone (name_at_start): ARTICLE_YOUR/NONE
        // both drop the article. C: x_monnam name_at_start handling.
        return given;
    }

    // C ref: do_name.c x_monnam — a saddled steed gets the "saddled " adjective
    // (unless SUPPRESS_SADDLE, Blind, or Hallucinating), placed before the base
    // name and after the article ("your saddled pony").
    let adj = '';
    if (!(_suppress & SUPPRESS_SADDLE) && (mtmp?.misc_worn_check & W_SADDLE)
        && !Blind() && !game.u?.uhallu)
        adj = 'saddled ';
    const named = adj + base;

    switch (article) {
    case 3: return 'your ' + named; // ARTICLE_YOUR
    case 1: return 'the ' + named;  // ARTICLE_THE
    case 2: return an(named);       // ARTICLE_A
    default: return named;          // ARTICLE_NONE
    }
}

// C ref: hacklib.c an() — prepend "a"/"an".
function an(s) {
    return (/^[aeiou]/i.test(s) ? 'an ' : 'a ') + s;
}
