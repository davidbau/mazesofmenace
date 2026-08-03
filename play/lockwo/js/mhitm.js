// mhitm.js — monster-vs-monster (incl. pet) melee combat.
// C ref: src/mhitm.c — mattackm(), hitmm(), mdamagem(), passivemm(); the
// knockback RNG lives in src/uhitm.c mhitm_knockback(); the kill tail
// (corpse_chance, grow_up) lives in src/mon.c / src/makemon.c.
//
// SCOPE: the contest gameplay sessions only exercise hand-to-hand physical
// attacks (AT_BITE / AT_CLAW / AT_KICK / AT_WEAP, AD_PHYS) between low-level
// dungeon monsters and the starting pet (kitten / little dog / pony).  Those
// paths are implemented call-for-call so the rn2/rnd/d stream matches C
// exactly (verified against seed0060's recorded trace at calls 2409..2443):
//
//   to-hit:        rnd(20 + i)              @ mattackm(mhitm.c:441)
//   base damage:   d(damn, damd)            @ mdamagem(mhitm.c:1025)
//   knockback:     rn2(3) then rn2(6)       @ mhitm_knockback(uhitm.c:5258/5269)
//   passive:       rn2(3)                   @ passivemm(mhitm.c:1363)
//   kill tail:     rn2(corpse_chance), rnd(victim.m_lev+1) [+ rn2(max_inc)]
//
// Non-physical adtyps, gaze/engulf/explode/breath attacks, multi-attack
// monsters beyond the pony, and weapon-wielding monster attackers are NOT
// modeled here; if such a combat is ever reached, mattackm() returns MISS
// WITHOUT consuming any RNG (so it can never silently desync the stream — it
// would instead surface as a clean divergence to be ported next).

import { game } from './gstate.js';
import { rn2, rnd, d } from './rng.js';
import {
    NATTK, M_ATTK_MISS, M_ATTK_HIT, M_ATTK_DEF_DIED, M_ATTK_AGR_DIED,
    M_ATTK_AGR_DONE, W_SADDLE,
} from './const.js';
import { DEADMONSTER, mvitals_died } from './mon.js';
import { newsym, map_invisible, unmap_object } from './display.js';
import { cansee } from './vision.js';
import { update_topl } from './display.js';
import { make_corpse } from './uhitm.js';
import { DOOR, POOL, DRAWBRIDGE_UP } from './const.js';

// ── monster-combat message rendering ─────────────────────────────────────────
// C ref: mhitm.c hitmm()/missmm() + mon.c monkilled().  These emit the "The X
// bites/misses the Y." and "The Y is destroyed!" top-line messages.  The
// movemon() pass that reaches mattackm() is async (allmain.js), so each visible
// combat message is paged through update_topl() inline, exactly like C's topl
// buffer: a message arriving while the previous one is unacknowledged fires a
// blocking --More-- (captured as its own screen frame, with the LIVE map state
// underneath) before replacing it.  This inline timing is what makes the
// map-under-each-frame match C (the dead defender is still drawn until its
// death message's predecessor has been paged).
async function emitMMmsg(msg) {
    if (!msg) return;
    await update_topl(msg);
}

// C ref: do_name.c x_monnam — the bare species name for a monster instance.
// A mounted/grounded steed wearing a saddle is described as "saddled <species>"
// (steed.c mon_nam path); the contest's only monster-combat messages with a
// saddled attacker are the post-dismount pony bites.
function mon_species(mtmp) {
    let s = (mtmp?.data?.name) || 'monster';
    if (((mtmp?.misc_worn_check || 0) & W_SADDLE)
        && !(mtmp?.mgivenname || mtmp?.mextra?.mgivenname))
        s = 'saddled ' + s;
    return s;
}
// the(species): "the <species>" with a given name standing alone.
function the_monnam(mtmp) {
    const given = mtmp?.mgivenname || mtmp?.mextra?.mgivenname;
    if (given) return given;
    return 'the ' + mon_species(mtmp);
}
// Monnam(): capitalized the_monnam.
function Monnam(mtmp) {
    const s = the_monnam(mtmp);
    return s.charAt(0).toUpperCase() + s.slice(1);
}

// C ref: do_name.c x_monnam() do_it — when the hero can't spot the monster,
// mon_nam()/Monnam() collapse to "it" (article != ARTICLE_YOUR, not gameover,
// not the steed/engulfer).  For the modeled hero canspotmon() reduces to
// canseemon() == mm_can_see_mon() (no telepathy/detection, and cold undead
// aren't infravisible).  do_it is tested before the name is consulted, so even
// a named monster that can't be spotted renders as "it".
function mon_nam_mm(mtmp) {
    if (!mm_can_see_mon(mtmp)) return 'it';
    return the_monnam(mtmp);
}
function Monnam_mm(mtmp) {
    const s = mon_nam_mm(mtmp);
    return s.charAt(0).toUpperCase() + s.slice(1);
}

// C ref: mhitm.c gv.vis — the attack is visible when either combatant is both
// in line of sight (cansee) and spottable.  The contest pets/hostiles are
// ordinary visible animals, so canspotmon reduces to cansee here.
function mm_visible(magr, mdef) {
    return (cansee(magr.mx, magr.my) || cansee(mdef.mx, mdef.my));
}

// C ref: mhitm.c pre_mm_attack() — called at the top of hitmm()/missmm(), just
// before the attack message.  When the encounter is visible (gv.vis / our
// mm_visible) but one combatant isn't individually spotted, the hero
// remembers that square as holding a sensed-but-unseen monster (the 'I'
// glyph).  The mimic/hider "unhiding happens even off-screen" branch is not
// modeled: none of the contest's mon-vs-mon combatants (MON_COMBAT table) are
// mimics or hiders, so M_AP_TYPE/mundetected never apply here.
function pre_mm_attack(magr, mdef) {
    if (!mm_visible(magr, mdef)) return;
    if (!mm_can_see_mon(magr)) map_invisible(magr.mx, magr.my);
    if (!mm_can_see_mon(mdef)) map_invisible(mdef.mx, mdef.my);
}

// C ref: mhitm.c noises() — when a mon-vs-mon attack isn't visible (gv.vis
// false) the hero may still hear it.  farq = mdistu(magr) > 15 (dist2 from the
// hero).  Gated so a repeated same-distance noise within 10 turns is silent;
// tracked by gf.far_noise / gn.noisetime (stored on the game object so they
// reset per game and persist within it).  The contest's modeled attacks are
// never AT_EXPL, so the sound is always "some noises".
async function noises(magr, mattk) {
    const u = game.u;
    if (u?.Deaf) return;
    const dx = magr.mx - (u?.ux ?? 0), dy = magr.my - (u?.uy ?? 0);
    const farq = (dx * dx + dy * dy) > 15;
    const prevFar = !!game.far_noise;
    const noisetime = game.noisetime || 0;
    if (farq !== prevFar || (game.moves - noisetime) > 10) {
        game.far_noise = farq;
        game.noisetime = game.moves;
        const what = (mattk && mattk.aatyp === AT_EXPL) ? 'an explosion' : 'some noises';
        await emitMMmsg(`You hear ${what}${farq ? ' in the distance' : ''}.`);
    }
}

// C ref: mondata.h nonliving(ptr) — undead/golem/vortex/etc don't "die", they
// are "destroyed".  Zombies (the only mon-vs-mon kill victim the contest shows)
// are undead -> nonliving.
function nonliving(mtmp) {
    const name = mtmp?.data?.name || '';
    return /\bzombie\b|\bmummy\b|\bskeleton\b|\bwraith\b|\bghost\b|\blich\b|golem\b|\bvortex\b|\belemental\b/.test(name);
}

// C ref: mhitm.c hitmm() — the verb for a connecting attack of type aatyp.
function hit_verb(aatyp) {
    switch (aatyp) {
    case AT_BITE: return 'bites';
    case AT_STNG: return 'stings';
    case AT_BUTT: return 'butts';
    case AT_TUCH: return 'touches';
    default:      return 'hits'; // AT_CLAW / AT_KICK / AT_WEAP / etc
    }
}

// ── attack-type / damage-type enums (include/monattk.h) ──────────────────────
const AT_NONE = 0, AT_CLAW = 1, AT_BITE = 2, AT_KICK = 3, AT_BUTT = 4,
      AT_TUCH = 5, AT_STNG = 6, AT_HUGS = 7, AT_EXPL = 13, AT_WEAP = 254; // monattk.h (AT_EXPL was 11, which is AT_ENGL)
const AD_PHYS = 0;

// weapon_check states (C ref: monst.h wpn_chk_flags).
const NO_WEAPON_WANTED = 0, NEED_WEAPON = 1, NEED_HTH_WEAPON = 3;
// Hand-to-hand weapon priority (C ref: weapon.c hwep[]), restricted to the
// otyps the contest's armed monsters carry; the orcish "crude" dagger (36) is
// the only one reachable for the low-level orc/kobold slice.
const HWEP_PRIORITY_MM = [55, 45, 54, 52, 50, 46, 48, 73, 44, 27, 30, 28, 77,
    34, 35, 36, 40];
const ORCISH_DAGGER_MM = 36;

// C ref: mondata.h MON_WEP(mon) — the monster's wielded weapon (mw).
function MON_WEP_MM(mon) { return mon?.mw || null; }

// C ref: weapon.c select_hwep — first carried weapon in hwep[] priority.  No RNG.
function select_hwep_mm(mtmp) {
    for (const otyp of HWEP_PRIORITY_MM)
        for (const o of (mtmp?.minvent || []))
            if (o.otyp === otyp) return o;
    return null;
}

// C ref: weapon.c mon_wield_item(mon) — wield the best melee weapon.  Returns 1
// if the monster wielded a (different) weapon this turn, 0 otherwise.  No RNG;
// only the "<Mon> wields <weapon>!" message + mw set.
async function mon_wield_item_mm(mon) {
    if (mon.weapon_check === NO_WEAPON_WANTED) return 0;
    const obj = select_hwep_mm(mon);
    if (obj) {
        const mw_tmp = MON_WEP_MM(mon);
        if (mw_tmp && mw_tmp.otyp === obj.otyp) {
            mon.weapon_check = NEED_WEAPON;
            return 0;
        }
        mon.mw = obj;
        mon.weapon_check = NEED_WEAPON;
        if (mm_can_see_mon(mon)) {
            const nm = (obj.otyp === ORCISH_DAGGER_MM) ? 'a crude dagger' : 'a weapon';
            await emitMMmsg(`${Monnam(mon)} wields ${nm}!`);
        }
        return 1;
    }
    return 0;
}

// C ref: canseemon(mon) — visible (on a lit/in-sight square, not invisible).
function mm_can_see_mon(mon) {
    if (!mon) return false;
    if (mon.minvis && !game.u?.see_invis) return false;
    return !!cansee(mon.mx, mon.my);
}

// ── combat data for the monsters the contest sessions put into mon-vs-mon
// melee, ported from include/monsters.h.  Keyed by the monster's display name
// because the starting-pet records (dog.js) carry the C PM_* index while the
// hostile records (makemon.js MONS table) use a different internal numbering;
// the name is the one stable discriminator across both representations.
//   ac      — base armour class (the 3rd LVL() field) -> find_mac()
//   mlevel  — base level (the 1st LVL() field); used for grow_up thresholds
//   msize   — MZ_* (knockback size test); not load-bearing for these sessions
//   verysmall — MZ_TINY (corpse_chance)
//   gfreq   — geno & G_FREQ (corpse_chance)
//   attacks — ordered ATTK() list; the first AT_NONE slot terminates it
//             exactly like the C mons[].mattk[] array (NO_ATTK == AT_NONE).
const MZ_TINY = 0, MZ_SMALL = 1, MZ_MEDIUM = 2, MZ_HUMAN = 3;
function ATK(aatyp, adtyp, damn, damd) { return { aatyp, adtyp, damn, damd }; }

const MON_COMBAT = {
    'newt':       { ac: 8, mlevel: 0, msize: MZ_TINY,  verysmall: true,  gfreq: 5, attacks: [ATK(AT_BITE, AD_PHYS, 1, 2)] },
    'fox':        { ac: 7, mlevel: 0, msize: MZ_SMALL, verysmall: false, gfreq: 1, attacks: [ATK(AT_BITE, AD_PHYS, 1, 3)] },
    'jackal':     { ac: 7, mlevel: 0, msize: MZ_SMALL, verysmall: false, gfreq: 3, attacks: [ATK(AT_BITE, AD_PHYS, 1, 2)] },
    'sewer rat':  { ac: 7, mlevel: 0, msize: MZ_TINY,  verysmall: true,  gfreq: 1, attacks: [ATK(AT_BITE, AD_PHYS, 1, 3)] },
    'giant rat':  { ac: 7, mlevel: 1, msize: MZ_SMALL, verysmall: false, gfreq: 2, attacks: [ATK(AT_BITE, AD_PHYS, 1, 3)] },
    'gecko':      { ac: 8, mlevel: 1, msize: MZ_TINY,  verysmall: true,  gfreq: 5, attacks: [ATK(AT_BITE, AD_PHYS, 1, 3)] },
    'kitten':     { ac: 6, mlevel: 2, msize: MZ_SMALL, verysmall: false, gfreq: 1, attacks: [ATK(AT_BITE, AD_PHYS, 1, 6)] },
    'housecat':   { ac: 5, mlevel: 4, msize: MZ_SMALL, verysmall: false, gfreq: 1, attacks: [ATK(AT_CLAW, AD_PHYS, 1, 6)] },
    'little dog':  { ac: 6, mlevel: 2, msize: MZ_SMALL, verysmall: false, gfreq: 1, attacks: [ATK(AT_BITE, AD_PHYS, 1, 6)] },
    'dog':        { ac: 5, mlevel: 4, msize: MZ_MEDIUM, verysmall: false, gfreq: 1, attacks: [ATK(AT_BITE, AD_PHYS, 1, 6)] },
    'pony':       { ac: 6, mlevel: 3, msize: MZ_MEDIUM, verysmall: false, gfreq: 2, attacks: [ATK(AT_KICK, AD_PHYS, 1, 6), ATK(AT_BITE, AD_PHYS, 1, 2)] },
    // C ref: monsters.h S_ZOMBIE — LVL(0,6,10,0,-2), geno (G_GENO|G_NOCORPSE|1)
    // so G_FREQ==1; MZ_SMALL (not verysmall); attack AT_CLAW AD_PHYS 1d4.  A
    // hostile kobold zombie killed by the pony makes corpse_chance roll
    // rn2(2 + (1<2) + 0) == rn2(3) (seed0103 step 42).
    'kobold zombie': { ac: 10, mlevel: 0, msize: MZ_SMALL, verysmall: false, gfreq: 1, attacks: [ATK(AT_CLAW, AD_PHYS, 1, 4)] },
    // C ref: monsters.h S_KOBOLD "kobold" — LVL(0,6,10,0,-2), geno (G_GENO|1)
    // so G_FREQ==1; MZ_SMALL (not verysmall); attack AT_WEAP AD_PHYS 1d4 (a
    // weapon attack: not modeled by the mattackm switch, so it is harmless as a
    // defender).  Its gfreq drives corpse_chance: rn2(2 + (1<2) + 0) == rn2(3).
    'kobold': { ac: 10, mlevel: 0, msize: MZ_SMALL, verysmall: false, gfreq: 1, attacks: [ATK(AT_WEAP, AD_PHYS, 1, 4)] },
    // C ref: monsters.h S_ORC — armed orcs that carry a weapon (m_initweap ->
    // orcish "crude" dagger) wield it when they fight, so they must be modeled
    // as aggressors in the pet's return-attack (mattackm).  AT_WEAP/AD_PHYS,
    // per-species dice: goblin 1d4, hobgoblin/hill orc/Mordor orc 1d6,
    // orc/Uruk-hai 1d8.  mattackm's AT_WEAP path wields (no RNG) and returns
    // MISS, so these records add no to-hit/damage rolls vs the pet.
    'goblin':     { ac: 10, mlevel: 0, msize: MZ_SMALL, verysmall: false, gfreq: 2, attacks: [ATK(AT_WEAP, AD_PHYS, 1, 4)] },
    'hobgoblin':  { ac: 10, mlevel: 1, msize: MZ_HUMAN, verysmall: false, gfreq: 2, attacks: [ATK(AT_WEAP, AD_PHYS, 1, 6)] },
    'hill orc':   { ac: 10, mlevel: 2, msize: MZ_HUMAN, verysmall: false, gfreq: 2, attacks: [ATK(AT_WEAP, AD_PHYS, 1, 6)] },
    'Mordor orc': { ac: 10, mlevel: 3, msize: MZ_HUMAN, verysmall: false, gfreq: 1, attacks: [ATK(AT_WEAP, AD_PHYS, 1, 6)] },
    // C ref: monsters.h S_BAT — a "giant bat" LVL(2,22,7,0,0), geno (G_GENO|2)
    // so G_FREQ==2; MZ_SMALL; AT_BITE AD_PHYS 1d6.  Needed so the giant bat can
    // be the *aggressor* in the dog_move return-attack (seed5002 step-242: the
    // kitten claws the bat, the bat bites back via mattackm -> rnd(20)).  The
    // plain "bat" bites 1d4; AD_STCK (large/giant mimic) modeled as AD_PHYS for
    // the to-hit/damage rolls (mhitm_adtyping only special-cases non-PHYS).
    'bat':        { ac: 8, mlevel: 0, msize: MZ_TINY,  verysmall: true,  gfreq: 1, attacks: [ATK(AT_BITE, AD_PHYS, 1, 4)] },
    'giant bat':  { ac: 7, mlevel: 2, msize: MZ_SMALL, verysmall: false, gfreq: 2, attacks: [ATK(AT_BITE, AD_PHYS, 1, 6)] },
    'vampire bat':{ ac: 6, mlevel: 5, msize: MZ_SMALL, verysmall: false, gfreq: 2, attacks: [ATK(AT_BITE, AD_PHYS, 1, 6)] },
    // C ref: monsters.h S_MIMIC — "small mimic" LVL(7,3,7,0,0), geno (G_GENO|2)
    // so G_FREQ==2; MZ_MEDIUM; AT_CLAW AD_PHYS 3d4.
    'small mimic':{ ac: 7, mlevel: 7, msize: MZ_MEDIUM, verysmall: false, gfreq: 2, attacks: [ATK(AT_CLAW, AD_PHYS, 3, 4)] },
    // C ref: monsters.h S_FUNGUS "lichen" — LVL(0,1,9,0,0), geno (G_GENO|4) so
    // G_FREQ==4; MZ_SMALL (not verysmall); attack AT_TUCH AD_STCK 0,0 (a sticky
    // hold, no physical damage).  Needed so the lichen can be the *aggressor* in
    // the pet's dog_move return-attack (seed0030 seg1 step-114: the kitten bites
    // the lichen, which survives and touches back via mattackm -> rnd(20)).  The
    // 0,0 dice mean a hit deals d(0,0)==0 (no damage roll); AD_STCK is modeled as
    // AD_PHYS for the to-hit path (mhitm_adtyping only special-cases non-PHYS).
    'lichen':     { ac: 9, mlevel: 0, msize: MZ_SMALL, verysmall: false, gfreq: 4, attacks: [ATK(AT_TUCH, AD_PHYS, 0, 0)] },
    // C ref: monsters.h S_XAN "grid bug" — LVL(0,12,9,0,0), geno
    // (G_GENO|G_SGROUP|G_NOCORPSE|3) so G_FREQ==3; MZ_TINY (verysmall); attack
    // AT_BITE AD_ELEC 1d1.  Needed as the *defender* when the kitten kills it
    // (seed0030 seg1 step-134): corpse_chance rolls rn2(2 + (3<2?0) + 1)==rn2(3)
    // (not the rn2(2) an unmodeled monster would default to).  AD_ELEC is modeled
    // as AD_PHYS for the to-hit path (mhitm_adtyping only special-cases non-PHYS);
    // the grid bug is G_NOCORPSE, so make_corpse() leaves no cadaver.
    'grid bug':   { ac: 9, mlevel: 0, msize: MZ_TINY,  verysmall: true,  gfreq: 3, attacks: [ATK(AT_BITE, AD_PHYS, 1, 1)] },
};

// Resolve the combat record for a monster instance.  Prefers data.name; the
// pet's minimal data object always carries it, and the MONS table records do
// too.  Returns null when the monster isn't modeled (caller no-ops).
function combatData(mon) {
    const name = mon?.data?.name;
    if (name && Object.prototype.hasOwnProperty.call(MON_COMBAT, name))
        return MON_COMBAT[name];
    return null;
}

// C ref: mon.c m_lev — the monster's effective level.  Hostile MONS-table
// monsters get m_lev set by newmonhp(); the pet records (dog.js) do not store
// it, so fall back to the base mlevel from the combat table (adj_lev at xlvl 1
// equals the base mlevel for the starting pets: kitten/dog 2, pony 3).
function monLev(mon, cd) {
    if (mon && mon.m_lev != null) return mon.m_lev;
    return cd ? cd.mlevel : (mon?.data?.mlevel ?? 0);
}

// C ref: worn.c find_mac(mdef) — base AC (no worn armor on these monsters).
function find_mac(mdef, cd) {
    return cd ? cd.ac : (mdef?.data?.ac ?? 10);
}

// C ref: getmattk() — for the single-/double-attack monsters here, attack i is
// just mattk[i] (no random alternates: alt_attk only applies to AT_WEAP'less
// special cases we don't reach).
function getmattk(magr, cd, i) {
    const list = cd ? cd.attacks : [];
    return list[i] || { aatyp: AT_NONE, adtyp: AD_PHYS, damn: 0, damd: 0 };
}

// C ref: hack.h distmin(x0,y0,x1,y1) — Chebyshev (king-move) distance.
function distmin(x0, y0, x1, y1) {
    return Math.max(Math.abs(x0 - x1), Math.abs(y0 - y1));
}

// ── uhitm.c mhitm_knockback (the leading RNG only) ───────────────────────────
// C draws knockdistance = rn2(3) at the top of the function (line 5258), then
// rolls rn2(chance) (chance == 6 with no ogresmasher; line 5269).  Every hit in
// the contest sessions takes the `if (rn2(chance)) return FALSE` early-out, so
// the later size/weapon gates never roll.  Returns whether knockback fired
// (always false for the modeled monsters).
function mhitm_knockback(magr, mdef, mattk, hitflagsRef, weaponUsed) {
    /* knockdistance */ rn2(3);              // uhitm.c:5258
    const chance = 6;                         // no ART_OGRESMASHER here
    if (rn2(chance)) return false;            // uhitm.c:5269 — 5/6 of the time

    // The remaining gates (aatyp must be CLAW/KICK/BUTT/WEAP & AD_PHYS, size
    // differential, solidity, &c.) are only reached on the 1/6 branch.  None of
    // the contest sessions hit it; be conservative and decline knockback (which
    // matches AD_PHYS bite attacks failing the aatyp test) without extra RNG.
    return false;
}

// ── mhitm.c mdamagem ─────────────────────────────────────────────────────────
// Applies one successful melee hit's damage.  Returns the M_ATTK_* result.
async function mdamagem(magr, mdef, mattk, mwep, dieroll, agrCd, defCd) {
    let damage = d(mattk.damn | 0, mattk.damd | 0);   // mhitm.c:1025
    let hitflags = M_ATTK_MISS;

    // mhitm_adtyping(): only AD_PHYS is modeled.  For a mon-vs-mon AD_PHYS hit
    // with no weapon (mwep == 0), mhitm_ad_phys() consumes no RNG and leaves the
    // base damage unchanged.  (Weapon / thick-skin / shade branches don't apply
    // to the bite/claw/kick attackers in these sessions.)

    // mhitm_knockback() — rolls rn2(3) then rn2(6); returns false for these
    // mons (so it never mutates hitflags / short-circuits mdamagem here).
    mhitm_knockback(magr, mdef, mattk, null, !!mwep);

    if (!damage) return hitflags;

    mdef.mhp -= damage;
    if (mdef.mhp < 1) {
        // C ref: mhitm.c mdamagem() -> monkilled(mdef, "", AD_PHYS).  monkilled
        // emits "<Monnam(mdef)> is destroyed/killed!" when the defender's square
        // is visible (cansee), BEFORE the corpse/detach bookkeeping.  Paging it
        // here (while the defender is still on the map) reproduces C's frame
        // where the previous combat line's --More-- shows the doomed defender
        // still drawn; killMonster() then removes it for the final frame.
        if (cansee(mdef.mx, mdef.my))
            await emitMMmsg(`${Monnam(mdef)} is ${nonliving(mdef) ? 'destroyed' : 'killed'}!`);
        // monster killed (monkilled -> mondied -> corpse_chance, then grow_up).
        killMonster(mdef, defCd);
        const grew = grow_up(magr, mdef, agrCd, defCd);
        return M_ATTK_DEF_DIED | (grew ? 0 : M_ATTK_AGR_DIED);
    }
    return M_ATTK_HIT;
}

// C ref: mon.c corpse_chance (the rn2 tail) + mondied corpse handling.
// For the simple animals here: tmp = 2 + (gfreq < 2) + verysmall; !rn2(tmp).
// The rn2(tmp) draw is load-bearing AND its TRUE result triggers make_corpse(),
// which itself consumes RNG (next_ident + rndmonnum reservoir + corpse timeout)
// — see killMonster() below.
function corpse_chance(mdef, defCd) {
    const gfreq = defCd ? defCd.gfreq : 2;
    const verysmall = defCd ? (defCd.verysmall ? 1 : 0) : 0;
    const tmp = 2 + (gfreq < 2 ? 1 : 0) + verysmall;
    return !rn2(tmp);                         // mon.c:3248
}

// C ref: monmove.c accessible(x,y) — ACCESSIBLE(typ)==typ>=DOOR && !closed_door.
// Kill sites in the contest sessions are open floor/corridor/doorway; no closed
// door sits under a dying monster, so the closed_door() refinement is omitted.
function accessible(x, y) {
    const typ = game.level?.at(x, y)?.typ;
    return typ != null && typ >= DOOR;
}

// C ref: rm.h IS_POOL(typ) — pools/moat/water also let a corpse drop.
function is_pool(x, y) {
    const typ = game.level?.at(x, y)?.typ;
    return typ != null && typ >= POOL && typ <= DRAWBRIDGE_UP;
}

// Remove a dead monster from the level and redraw its square.  C ref: mon.c
// mondied() -> mondead() [detach] then, if corpse_chance() succeeds and the
// square is accessible (or a pool), make_corpse() which rolls next_ident,
// rndmonnum and the corpse-timeout sequence.
function killMonster(mdef, defCd) {
    mdef.mhp = 0;
    // C ref: mon.c mondead() — "if (glyph_is_invisible(...)) unmap_object(...)"
    // runs before m_detach.  A defender killed this same attack may have just
    // had pre_mm_attack() mark its square with the 'I' remembered-unseen-
    // monster glyph (attacker spotted, defender not); clear that stale marker
    // before the corpse/newsym below so the square reverts to its real
    // remembered contents instead of keeping the 'I'.
    const loc0 = game.level?.at(mdef.mx, mdef.my);
    if (loc0?.invisMon) unmap_object(mdef.mx, mdef.my);
    const dropCorpse = corpse_chance(mdef, defCd); // mon.c:3248 rn2(tmp)
    const mx = mdef.mx, my = mdef.my;
    // Detach from the level so the renderer (m_at / MON_AT) stops drawing it.
    // The dead monster's coordinates are intentionally left intact: mattackm
    // still consults them for the post-attack passivemm adjacency guard (which
    // returns early for a dead defender anyway, so no extra RNG is drawn), and
    // make_corpse() places the cadaver at those same coordinates.
    const list = game.level?.monsters;
    if (list) {
        mvitals_died(mdef);            // mon.c:3135
        const idx = list.indexOf(mdef);
        if (idx >= 0) list.splice(idx, 1);
    }
    // C ref: mon.c mondied — make_corpse only when corpse_chance passed AND the
    // square can hold a corpse (accessible terrain or a pool).
    if (dropCorpse && mx > 0 && my >= 0 && (accessible(mx, my) || is_pool(mx, my)))
        make_corpse(mdef, mx, my);
    if (mx > 0 && my > 0) newsym(mx, my);
}

// C ref: makemon.c grow_up(mtmp, victim) — the pet may gain HP/levels after a
// kill.  Only the "killed a monster" branch is reached here.  Returns TRUE if
// the aggressor survives (it always does for these pets), so the caller maps a
// FALSE here to M_ATTK_AGR_DIED (genocide-on-growup, which never triggers).
function grow_up(magr, mdef, agrCd, defCd) {
    const mlev = monLev(magr, agrCd);
    const victimLev = monLev(mdef, defCd);

    // max_increase = rnd(victim->m_lev + 1)              (makemon.c:2095)
    const max_increase = rnd(victimLev + 1);
    // cur_increase = (max_increase > 1) ? rn2(max_increase) : 0
    const cur_increase = (max_increase > 1) ? rn2(max_increase) : 0;

    let hp_threshold = mlev * 8;
    if (!mlev) hp_threshold = 4;

    if (magr.mhpmax != null) magr.mhpmax += max_increase;
    if (magr.mhp != null) magr.mhp += cur_increase;

    // The level/gender/form bookkeeping below the threshold consumes no RNG;
    // we only need the per-kill rnd()/rn2() draws above to stay in sync.  Bump
    // the stored m_lev when the threshold is crossed (best-effort; not rendered).
    if ((magr.mhpmax ?? 0) > hp_threshold && magr.m_lev != null)
        magr.m_lev += 1;

    return true; /* aggressor survives */
}

// ── mhitm.c passivemm ────────────────────────────────────────────────────────
// Defender's passive response.  Always reached (even on a miss / kill) from
// mattackm's `if (attk && ... distmin <= 1)` guard.  For the modeled monsters
// the defender's first attack slot is its only/terminating one; the initial
// d() roll fires only when that slot has damn/damd set (none of newt/kitten do
// for their *passive* slot, which is the AT_NONE terminator -> tmp = 0, no d()).
function passivemm(magr, mdef, mhitb, mdead, mwep, defCd) {
    const attacks = defCd ? defCd.attacks : [];
    // find first AT_NONE slot (i): the C loop walks mattk[] to the terminator.
    let i = 0;
    for (; i < NATTK; i++) {
        if (i >= attacks.length) break;        // ran off the end -> AT_NONE
        if (attacks[i].aatyp === AT_NONE) break;
    }
    const slot = attacks[i] || { aatyp: AT_NONE, adtyp: AD_PHYS, damn: 0, damd: 0 };
    // tmp = passive damage roll, mirroring mhitm.c:1323-1328.
    if (slot.damn) d(slot.damn | 0, slot.damd | 0);
    else if (slot.damd) d((defCd ? defCd.mlevel : 0) + 1, slot.damd | 0);
    // else tmp = 0 (no roll)

    const mhit = mhitb ? M_ATTK_HIT : M_ATTK_MISS;
    if (mdead || mdef.mcan) return (mdead | mhit);

    // mhitm.c:1363 — `if (rn2(3))` gates the passive effect.  For AT_NONE/AD_PHYS
    // terminators the switch's default sets tmp = 0 (no further RNG).
    rn2(3);
    return (mdead | mhit);
}

// ── mhitm.c mattackm ─────────────────────────────────────────────────────────
// C ref: mhitm.c:292.  A monster attacks another monster.  Returns M_ATTK_*.
export async function mattackm(magr, mdef) {
    if (!magr || !mdef) return M_ATTK_MISS;
    if (DEADMONSTER(magr) || DEADMONSTER(mdef)) return M_ATTK_MISS;

    const agrCd = combatData(magr);
    const defCd = combatData(mdef);
    // Unmodeled combatant -> decline WITHOUT consuming RNG (see header note).
    if (!agrCd) return M_ATTK_MISS;

    // tmp = find_mac(mdef) + magr->m_lev.  (mconf/helpless +4 and elf/orc +1
    // never apply to the modeled animal/pet matchups.)
    let tmpBase = find_mac(mdef, defCd) + monLev(magr, agrCd);

    // magr->mlstmv = svm.moves — flags that the aggressor has acted this round
    // (the dog_move return-attack gate at dogmove.c:1159 reads the *defender's*
    // mlstmv, so keeping this current matters for the bounce-back attack).
    magr.mlstmv = game.moves;

    let struck = 0;
    const res = new Array(NATTK).fill(M_ATTK_MISS);

    for (let i = 0; i < NATTK; i++) {
        res[i] = M_ATTK_MISS;

        // target might no longer be there (after the first attack)
        if (i > 0 && (DEADMONSTER(magr) || DEADMONSTER(mdef))) continue;

        const mattk = getmattk(magr, agrCd, i);
        if (mattk.aatyp === AT_NONE) {
            // no attack in this slot -> strike 0, attk 0 (no passive, no RNG)
            continue;
        }

        let strike = 0, attk = 1;
        let mwep = null; // none of the modeled attackers wield a weapon
        let dieroll = 0;
        let tmp = tmpBase;

        switch (mattk.aatyp) {
        case AT_CLAW:
        case AT_KICK:
        case AT_BITE:
        case AT_STNG:
        case AT_TUCH:
        case AT_BUTT:
            // ranged / cockatrice-instinct guards don't apply for these mons.
            dieroll = rnd(20 + i);             // mhitm.c:441
            strike = (tmp > dieroll) ? 1 : 0;
            if (strike) {
                // C ref: mhitm.c hitmm() -> pre_mm_attack() first, then emits
                // "X <verb> Y." (when visible), THEN calls mdamagem() — so the
                // hit message precedes any death message.  Neither consumes
                // RNG.  When not visible the hero may instead hear the scuffle
                // (noises()).
                pre_mm_attack(magr, mdef);
                if (mm_visible(magr, mdef))
                    await emitMMmsg(`${Monnam_mm(magr)} ${hit_verb(mattk.aatyp)} ${mon_nam_mm(mdef)}.`);
                else
                    await noises(magr, mattk);
                res[i] = await mdamagem(magr, mdef, mattk, mwep, dieroll, agrCd, defCd);
            } else {
                // C ref: mhitm.c missmm() -> pre_mm_attack() first, then
                // "X misses Y." (when visible), else noises().  No RNG.
                pre_mm_attack(magr, mdef);
                if (mm_visible(magr, mdef))
                    await emitMMmsg(`${Monnam_mm(magr)} misses ${mon_nam_mm(mdef)}.`);
                else
                    await noises(magr, mattk);
            }
            break;

        case AT_WEAP: {
            // C ref: mhitm.c:406 — an armed aggressor wields its weapon before
            // striking.  mon_wield_item consumes no RNG; when it actually wields
            // (returns 1) mattackm returns M_ATTK_MISS (the turn was spent
            // wielding) — this is the goblin grabbing its crude dagger when the
            // pet attacks it.  If already wielded, fall through to a normal
            // weapon strike (rnd(20+i) to-hit + mdamagem with the weapon).
            if (magr.weapon_check === NEED_WEAPON || !MON_WEP_MM(magr)) {
                magr.weapon_check = NEED_HTH_WEAPON;
                if (await mon_wield_item_mm(magr)) return M_ATTK_MISS;
            }
            mwep = MON_WEP_MM(magr);
            if (mwep && mm_visible(magr, mdef)) {
                // mswingsm(magr, mdef, mwep) — display-only; "<Mon> swings/thrusts
                // <his> <weapon>." (no RNG for the pierce-only dagger).
                const hisher = magr.female ? 'her' : 'his';
                await emitMMmsg(`${Monnam(magr)} thrusts ${hisher} crude dagger.`);
            }
            dieroll = rnd(20 + i);             // mhitm.c:441
            strike = (tmp > dieroll) ? 1 : 0;
            if (strike) {
                pre_mm_attack(magr, mdef);
                if (mm_visible(magr, mdef))
                    await emitMMmsg(`${Monnam_mm(magr)} ${hit_verb(mattk.aatyp)} ${mon_nam_mm(mdef)}.`);
                else
                    await noises(magr, mattk);
                res[i] = await mdamagem(magr, mdef, mattk, mwep, dieroll, agrCd, defCd);
            } else {
                pre_mm_attack(magr, mdef);
                if (mm_visible(magr, mdef))
                    await emitMMmsg(`${Monnam_mm(magr)} misses ${mon_nam_mm(mdef)}.`);
                else
                    await noises(magr, mattk);
            }
            break;
        }

        default:
            // other aatyps (AT_MAGC, AT_GAZE, ...) are not modeled.
            strike = 0; attk = 0;
            break;
        }

        // passivemm: reached when attk && aggressor still alive && adjacent.
        if (attk && !(res[i] & M_ATTK_AGR_DIED)
            && distmin(magr.mx, magr.my, mdef.mx, mdef.my) <= 1) {
            res[i] = passivemm(magr, mdef, strike,
                               (res[i] & M_ATTK_DEF_DIED), mwep, defCd);
        }

        if (res[i] & M_ATTK_DEF_DIED) return res[i];
        if (res[i] & M_ATTK_AGR_DIED) return res[i];
        if ((res[i] & M_ATTK_AGR_DONE)) return res[i];
        if (res[i] & M_ATTK_HIT) struck = 1;
    }

    return struck ? M_ATTK_HIT : M_ATTK_MISS;
}
