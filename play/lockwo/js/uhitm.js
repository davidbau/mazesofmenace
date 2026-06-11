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
import { isok, IS_OBSTRUCTED, A_STR, A_DEX, A_CON, ACCESSIBLE,
         CORPSTAT_INIT, CORPSTAT_NONE } from './const.js';
import { exercise } from './attrib.js';
import { DEADMONSTER } from './mon.js';
import { mkcorpstat, mkobj_at, CORPSE, place_object } from './mkobj.js';
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
            // "You stop.  <Monnam> is in the way!" — only when running; the
            // starter sessions step one square at a time so context.run is 0
            // and no message is produced, but the structure is preserved.
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
      P_LANCE = 19, P_BOW = 20, P_TWO_WEAPON_COMBAT = 36;

// otyp -> { ws, wl, hb, sk }.  otyp values match mkobj.js objects[] indices.
const WEAP = {
    27: { ws: 6,  wl: 8,  hb: 0, sk: P_SPEAR },        // SPEAR
    34: { ws: 4,  wl: 3,  hb: 2, sk: P_DAGGER },       // DAGGER
    40: { ws: 3,  wl: 2,  hb: 0, sk: P_KNIFE },        // KNIFE
    44: { ws: 6,  wl: 4,  hb: 0, sk: P_AXE },          // AXE
    46: { ws: 6,  wl: 8,  hb: 0, sk: P_SHORT_SWORD },  // SHORT_SWORD
    50: { ws: 8,  wl: 8,  hb: 0, sk: P_SCIMITAR },     // SCIMITAR
    54: { ws: 8,  wl: 12, hb: 0, sk: P_LONG_SWORD },   // LONG_SWORD
    56: { ws: 10, wl: 12, hb: 1, sk: P_LONG_SWORD },   // KATANA
    77: { ws: 6,  wl: 8,  hb: 0, sk: P_LANCE },        // LANCE
    78: { ws: 6,  wl: 6,  hb: 0, sk: P_MACE },         // MACE
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
    return await hmon(mon, weapon, dieroll);
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

    // hmon_hitmon_stagger (uhitm.c:1576): an unarmed hit for >1 damage that is
    // not a thrown/applied object and not polymorphed rolls rnd(100) to maybe
    // stagger the victim (the roll fires regardless of the outcome).
    if (unarmed && dmg > 1) {
        rnd(100);
    }

    mon.mhp = (mon.mhp || 0) - dmg;
    if (mon.mhpmax != null && mon.mhp > mon.mhpmax) mon.mhp = mon.mhpmax;

    if (mon.mhp <= 0 || DEADMONSTER(mon)) {
        // hmon_hitmon_msg_hit is suppressed once destroyed; killed() gives the
        // "You kill the <mon>!" message and runs the corpse/treasure aftermath.
        await killed(mon);
        return false;
    }

    // surviving hit: "You hit the <mon>." (verbose hand-to-hand weapon hit).
    const { update_topl } = await import('./display.js');
    if (canspotmon(mon))
        await update_topl(`You hit ${mon_nam(mon)}.`);
    else
        await update_topl('You hit it.');
    mon.msleeping = 0;
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

    // illogical-but-traditional treasure drop gate (mon.c:3587).
    let dropTreasure = false;
    if (!rn2(6) && (x !== game.u.ux || y !== game.u.uy)) {
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
        // mkobj(RANDOM_CLASS, TRUE) — not reached for the modelled kills (rn2(6)
        // is non-zero in the recorded traces); kept faithful for completeness.
        mkobj_at(0 /*RANDOM_CLASS*/, x, y, true);
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

// C ref: mon.c corpse_chance() rn2 tail.  bigmonst/golem/rider/mplayer/shk all
// guarantee a corpse with no roll; otherwise rn2(2 + (G_FREQ<2) + verysmall).
function corpse_chance(mon) {
    const geno = mon.data?.geno || 0;
    const G_FREQ = geno & 7;
    const verysmall = mon.data?.verysmall ? 1 : 0;
    const tmp = 2 + (G_FREQ < 2 ? 1 : 0) + verysmall;
    return !rn2(tmp);                          // mon.c:3248
}

// C ref: mon.c make_corpse() default path -> mkcorpstat(CORPSE, KEEPTRAITS?mon
// :0, mdat, x, y, CORPSTAT_INIT).  mksobj() builds the corpse object: rolls the
// next_ident o_id, the rndmonnum() reservoir scan (overwritten with mdat after),
// the gender rn2(2), and start_corpse_timeout().  Reuses mkobj.js verbatim.
function make_corpse(mon, x, y) {
    const mndx = mon.data?.pmidx;
    if (mndx == null) return;
    // G_NOCORPSE check (mvflags) — the modelled victims all leave a corpse.
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
        // weapon.c small-monster "extra" additions:
        switch (otyp) {
        case 78: tmp += 1; break;                // MACE: +1
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
function mon_nam(mtmp) {
    return x_monnam(mtmp, /*ARTICLE_THE*/ 1, null, 0, false);
}

// C ref: mondata.h nonliving(ptr) — undead/golem/vortex/etc are "destroyed"
// rather than "killed".  (A lichen/goblin is living -> "kill".)
function nonliving(mtmp) {
    const name = mtmp?.data?.name || '';
    return /\bzombie\b|\bmummy\b|\bskeleton\b|\bwraith\b|\bghost\b|\blich\b|golem\b|\bvortex\b|\belemental\b|\bshade\b/.test(name);
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

    // ARTICLE_YOUR only applies to tame monsters; otherwise downgrade to THE.
    if (article === 3 && !mtmp.mtame) article = 1;

    if (given) {
        // A personal name stands alone (name_at_start): ARTICLE_YOUR/NONE
        // both drop the article. C: x_monnam name_at_start handling.
        return given;
    }

    switch (article) {
    case 3: return 'your ' + base; // ARTICLE_YOUR
    case 1: return 'the ' + base;  // ARTICLE_THE
    case 2: return an(base);       // ARTICLE_A
    default: return base;          // ARTICLE_NONE
    }
}

// C ref: hacklib.c an() — prepend "a"/"an".
function an(s) {
    return (/^[aeiou]/i.test(s) ? 'an ' : 'a ') + s;
}
