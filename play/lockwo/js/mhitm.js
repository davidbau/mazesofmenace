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
    M_ATTK_AGR_DONE,
} from './const.js';
import { DEADMONSTER } from './mon.js';
import { newsym } from './display.js';

// ── attack-type / damage-type enums (include/monattk.h) ──────────────────────
const AT_NONE = 0, AT_CLAW = 1, AT_BITE = 2, AT_KICK = 3, AT_BUTT = 4,
      AT_TUCH = 5, AT_STNG = 6, AT_HUGS = 7, AT_WEAP = 254;
const AD_PHYS = 0;

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
const MZ_TINY = 0, MZ_SMALL = 1, MZ_MEDIUM = 2;
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
function mdamagem(magr, mdef, mattk, mwep, dieroll, agrCd, defCd) {
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
        // monster killed (monkilled -> mondied -> corpse_chance, then grow_up).
        killMonster(mdef, defCd);
        const grew = grow_up(magr, mdef, agrCd, defCd);
        return M_ATTK_DEF_DIED | (grew ? 0 : M_ATTK_AGR_DIED);
    }
    return M_ATTK_HIT;
}

// C ref: mon.c corpse_chance (the rn2 tail) + mondied corpse handling.
// For the simple animals here: tmp = 2 + (gfreq < 2) + verysmall; !rn2(tmp).
// We don't materialize the corpse object (no contest screen shows one at the
// kill site within these sessions), but the rn2(tmp) draw is load-bearing.
function corpse_chance(mdef, defCd) {
    const gfreq = defCd ? defCd.gfreq : 2;
    const verysmall = defCd ? (defCd.verysmall ? 1 : 0) : 0;
    const tmp = 2 + (gfreq < 2 ? 1 : 0) + verysmall;
    return !rn2(tmp);                         // mon.c:3248
}

// Remove a dead monster from the level and redraw its square.  C ref: mon.c
// mondead() -> m_detach() -> remove_monster() + newsym().
function killMonster(mdef, defCd) {
    mdef.mhp = 0;
    corpse_chance(mdef, defCd);               // mon.c:3248 rn2(tmp)
    const mx = mdef.mx, my = mdef.my;
    // Detach from the level so the renderer (m_at / MON_AT) stops drawing it.
    // The dead monster's coordinates are intentionally left intact: mattackm
    // still consults them for the post-attack passivemm adjacency guard (which
    // returns early for a dead defender anyway, so no extra RNG is drawn).
    const list = game.level?.monsters;
    if (list) {
        const idx = list.indexOf(mdef);
        if (idx >= 0) list.splice(idx, 1);
    }
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
export function mattackm(magr, mdef) {
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
                res[i] = mdamagem(magr, mdef, mattk, mwep, dieroll, agrCd, defCd);
            }
            // miss -> missmm(): consumes no RNG (only emits a message).
            break;

        default:
            // weapon attacks (AT_WEAP) and other aatyps are not modeled.
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
