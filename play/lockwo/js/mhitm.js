// mhitm.js — monster-vs-monster (incl. pet) melee combat.
// C ref: src/mhitm.c — mattackm(), hitmm(), mdamagem(), passivemm(); the
// knockback RNG lives in src/uhitm.c mhitm_knockback(); the kill tail
// (corpse_chance, grow_up) lives in src/mon.c / src/makemon.c.
//
// The per-species combat data (mattk[], base AC, mlevel, msize, geno) comes
// from the GENERATED tables (js/monattk_data.js MATTK[] + makemon.js MONS[]),
// resolved BY NAME — see permonst() for why pmidx can't be trusted.  It used
// to be a hand-written 26-entry table covering only the species the recorded
// sessions happened to show, which made mattackm() decline (M_ATTK_MISS, no
// RNG) for every other monster in the game, and got 5 of those 26 entries
// wrong (giant rat MZ_TINY, housecat AT_BITE, vampire bat's 2nd attack,
// lichen AD_STCK, grid bug AD_ELEC).
//
// The RNG-bearing calls, in stream order:
//   to-hit:        rnd(20 + i)              @ mattackm(mhitm.c:441)
//   base damage:   d(damn, damd)            @ mdamagem(mhitm.c:1025)
//   knockback:     rn2(3) then rn2(6)       @ mhitm_knockback(uhitm.c:5258/5269)
//   passive:       d(), then rn2(3) + the per-adtyp rolls  @ passivemm
//   kill tail:     rn2(corpse_chance), rnd(victim.m_lev+1) [+ rn2(max_inc)]
//
// STILL UNPORTED (each returns/continues without its C RNG, so it surfaces as
// a clean divergence rather than a silent desync): AT_GAZE gazemm(), AT_ENGL
// gulpmm(), AT_EXPL explmm(), AT_BREA/AT_SPIT breamm()/spitmm(), the AT_WEAP
// ranged thrwmm() branch, mhitm_adtyping()'s non-physical damage arms, and
// the pudding-division clone_mon().

import { game } from './gstate.js';
import { rn2, rnd, d } from './rng.js';
import {
    NATTK, M_ATTK_MISS, M_ATTK_HIT, M_ATTK_DEF_DIED, M_ATTK_AGR_DIED,
    M_ATTK_AGR_DONE, W_SADDLE, STRAT_WAITMASK, is_pit,
} from './const.js';
import { DEADMONSTER, mvitals_died, healmon } from './mon.js';
import { newsym, map_invisible, unmap_object, m_at, canseemon_shared } from './display.js';
import { cansee } from './vision.js';
import { update_topl } from './display.js';
import { make_corpse, dmgval } from './uhitm.js';
import { DOOR, POOL, DRAWBRIDGE_UP, STRAT_WAITFORU } from './const.js';
import { is_animal, is_neuter_flag, perceives_flag, is_elf_flag, is_orc_flag,
         is_undead_flag, is_demon_flag, unsolid_flag, mflags1_of, M1_NOEYES,
         M1_THICK_HIDE,
} from './monflags_data.js';
import { WEP_HITBON } from './weapondmg_data.js';
import { xname } from './invent.js';
import { MATTK } from './monattk_data.js';
import { name_to_pmidx, monster_by_pmidx, is_home_elemental } from './makemon.js';
import { t_at } from './mkroom.js';

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

// C ref: mhitm.c:358 gv.vis — `(cansee(magr) && canspotmon(magr)) ||
// (cansee(mdef) && canspotmon(mdef))`.  The cansee() conjunct matters once the
// hero has infravision: a warm monster on an unlit square is canspotmon but
// NOT cansee, and its fight is silent.
function mm_visible(magr, mdef) {
    return (cansee(magr.mx, magr.my) && mm_can_see_mon(magr))
        || (cansee(mdef.mx, mdef.my) && mm_can_see_mon(mdef));
}

// C ref: mhitm.c:41 pre_mm_attack() — called at the top of hitmm()/missmm(),
// just before the attack message.  A formerly concealed combatant stops
// mimicking/hiding (this happens even when the hero can't see it, because the
// monster is now in action), and when the encounter is visible but one
// combatant isn't individually spotted the hero remembers that square as
// holding a sensed-but-unseen monster (the 'I' glyph).  The unhiding half was
// skipped on the grounds that no *listed* combatant was a mimic or hider; that
// list is gone, and mundetected hiders (lurkers, hiding-under-object vermin)
// reach mattackm routinely.  No RNG, but mundetected/m_ap_type steer later
// display and monmove decisions.
function pre_mm_attack(magr, mdef) {
    let showit = false;
    const vis = mm_visible(magr, mdef);
    for (const m of [mdef, magr]) {
        if (m.m_ap_type) {                 // mon.c seemimic(m)
            m.m_ap_type = 0;
            m.mappearance = 0;
            newsym(m.mx, m.my);
            showit = showit || vis;
        } else if (m.mundetected) {
            m.mundetected = 0;
            showit = showit || vis;
        }
    }
    if (!vis) return;
    if (!mm_can_see_mon(magr)) map_invisible(magr.mx, magr.my);
    else if (showit) newsym(magr.mx, magr.my);
    if (!mm_can_see_mon(mdef)) map_invisible(mdef.mx, mdef.my);
    else if (showit) newsym(mdef.mx, mdef.my);
}

// C ref: mhitm.c noises() — when a mon-vs-mon attack isn't visible (gv.vis
// false) the hero may still hear it.  farq = mdistu(magr) > 15 (dist2 from the
// hero).  Gated so a repeated same-distance noise within 10 turns is silent;
// tracked by gf.far_noise / gn.noisetime (stored on the game object so they
// reset per game and persist within it).  AT_EXPL never reaches here (mattackm
// handles it in its own case), so the sound is always "some noises".
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

// C ref: include/monsym.h defsym.h MONSYM indices.
const S_VORTEX = 22, S_LICH = 38, S_GOLEM = 55;

// C ref: mondata.h is_rider(ptr) / is_mplayer(ptr).  is_mplayer is the
// contiguous mons[] span PM_ARCHEOLOGIST..PM_WIZARD, resolved through the
// generated name table rather than hardcoded so a mons[] shift can't skew it.
const RIDER_NAMES = new Set(['Death', 'Famine', 'Pestilence']);
function is_rider(ptr) { return !!ptr && RIDER_NAMES.has(ptr.name); }
let _mplayer_span;   // resolved lazily: makemon.js may still be evaluating
function is_mplayer(ptr) {
    if (_mplayer_span === undefined) {
        const lo = name_to_pmidx('archeologist'), hi = name_to_pmidx('wizard');
        _mplayer_span = (lo >= 0 && hi >= lo) ? [lo, hi] : null;
    }
    return !!_mplayer_span && ptr?.pmidx != null
        && ptr.pmidx >= _mplayer_span[0] && ptr.pmidx <= _mplayer_span[1];
}

// C ref: mondata.h:219 nonliving(ptr) == is_undead(ptr) || ptr == &mons[PM_MANES]
// || weirdnonliving(ptr), where weirdnonliving == is_golem(ptr) || mlet ==
// S_VORTEX.  Was a species-name regex, which (a) answered FALSE for every
// undead whose name lacks one of the seven listed words (e.g. "vampire",
// "ghoul", "shade", "human zombie" is fine but "Vlad the Impaler" isn't) and
// (b) answered TRUE for elementals, which are NOT nonliving in C.
function nonliving(mtmp) {
    const ptr = permonst(mtmp);
    if (!ptr) return false;
    return is_undead_flag(ptr) || ptr.name === 'manes'
        || ptr.mcls === S_GOLEM || ptr.mcls === S_VORTEX;
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
      AT_TUCH = 5, AT_STNG = 6, AT_HUGS = 7, AT_ENGL = 11, AT_BREA = 12,
      AT_EXPL = 13, AT_BOOM = 14, AT_GAZE = 15, AT_TENT = 16,
      AT_SPIT = 10, AT_WEAP = 254, AT_MAGC = 255;
const AD_PHYS = 0, AD_FIRE = 2, AD_COLD = 3, AD_ELEC = 6, AD_ACID = 8,
      AD_PLYS = 14, AD_STUN = 12, AD_DGST = 26, AD_STCK = 19, AD_WRAP = 28,
      AD_SITM = 21, AD_SEDU = 22, AD_ENCH = 41, AD_SSEX = 35,
      AD_DISE = 33, AD_PEST = 38, AD_FAMN = 39, AD_POLY = 43;

// C ref: monst.h resists_*(mon) — the species mresists bits.  mondata.js's
// copies read mon.data.mresists directly, which is undefined on the pet's
// minimal data object; route through permonst() so a pet answers for its own
// species instead of silently "resists nothing".
const MR_FIRE = 0x01, MR_COLD = 0x02, MR_ELEC = 0x10, MR_ACID = 0x40;
const mm_resists = (mon, bit) => ((permonst(mon)?.mresists ?? 0) & bit) !== 0;
const mm_resists_fire = (mon) => mm_resists(mon, MR_FIRE);
const mm_resists_cold = (mon) => mm_resists(mon, MR_COLD);
const mm_resists_elec = (mon) => mm_resists(mon, MR_ELEC);
const mm_resists_acid = (mon) => mm_resists(mon, MR_ACID);

// C ref: include/monsym.h S_NYMPH — could_seduce()'s "same gender still works"
// exception and mhitm_ad_sedu()'s post-theft rloc() both key off this mlet.
const S_NYMPH_MCLS = 14;

// C ref: mon->data — the permonst record.  dog.js builds the starting pet with
// a MINIMAL data object whose pmidx is the C PM_* value, which is NOT this
// port's MONS-table index (kitten: C 34 == our jaguar; pony: C 102 == our gray
// unicorn), and which carries no ac/mlevel/msize/geno at all.  Every
// pmidx-keyed table (MATTK, MFLAGS1/2/3) therefore answers for the wrong
// species when handed a pet's data directly.  Re-resolve through the species
// NAME, which both representations carry, and use the canonical MONS record
// everywhere mattackm needs species data.
const _permonst_cache = new Map();
function permonst(mon) {
    const dat = mon?.data;
    if (!dat) return null;
    const nm = dat.name;
    if (!nm) return dat;
    let rec = _permonst_cache.get(nm);
    if (rec === undefined) {
        const p = name_to_pmidx(nm);
        rec = (p >= 0) ? monster_by_pmidx(p) : null;
        _permonst_cache.set(nm, rec);
    }
    return rec || dat;
}

// C ref: mons[].mattk[] — the attack list, trailing NO_ATTK slots dropped by
// the generator (they can never match a getmattk()/attacktype() query, and
// passivemm's "first AT_NONE slot" walk treats a missing slot as NO_ATTK).
function mattk_list(mon) {
    const ptr = permonst(mon);
    const tbl = (ptr && ptr.pmidx != null) ? MATTK[ptr.pmidx] : null;
    return tbl || [];
}

// C ref: mondata.c gender(mtmp) — 2 for neuters, else mtmp->female.
function gender_mm(mtmp) {
    return is_neuter_flag(permonst(mtmp)) ? 2 : (mtmp?.female ? 1 : 0);
}

// C ref: mhitu.c could_seduce(magr, mdef, mattk) — the monster-vs-monster arm
// (neither side is the hero).  1 = opposite gender ("seductively"), 2 = a nymph
// whose gender matches ("engagingly"), 0 = not a seduction-capable attack.
// SYSOPT_SEDUCE is on in this build (sys.c:100), so AD_SSEX is not downgraded.
function could_seduce(magr, mdef, mattk) {
    const pagr = permonst(magr);
    if (is_animal(pagr)) return 0;
    const genagr = gender_mm(magr);
    const gendef = gender_mm(mdef);
    const adtyp = mattk ? mattk.adtyp
        : (pagr && attacktype_ad(magr, AD_SSEX)) ? AD_SSEX
            : (pagr && attacktype_ad(magr, AD_SEDU)) ? AD_SEDU : AD_PHYS;
    if (magr.minvis && !perceives_flag(permonst(mdef)) && adtyp === AD_SEDU) return 0;
    // C: `pagr->mlet != S_NYMPH && pagr != &mons[PM_AMOROUS_DEMON]` — the
    // amorous demon's name is unique in monsters.h so the name compare is exact.
    if ((pagr?.mcls !== S_NYMPH_MCLS && pagr?.name !== 'amorous demon')
        || (adtyp !== AD_SEDU && adtyp !== AD_SSEX && adtyp !== AD_SITM))
        return 0;
    return (genagr === 1 - gendef) ? 1 : (pagr?.mcls === S_NYMPH_MCLS) ? 2 : 0;
}

// C ref: mondata.h dmgtype(ptr, dtyp) — any attack slot with that damage type.
function attacktype_ad(mon, adtyp) {
    return mattk_list(mon).some((a) => a[1] === adtyp);
}
// C ref: mondata.h attacktype(ptr, atyp) — any attack slot of that attack type.
function attacktype_at(mon, aatyp) {
    return mattk_list(mon).some((a) => a[0] === aatyp);
}

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

// C ref: canseemon(mon) — (cansee || see_with_infrared) && mon_visible.
const mm_can_see_mon = canseemon_shared;

// C ref: include/monflag.h MZ_* body sizes.  MZ_HUMAN is an ALIAS for
// MZ_MEDIUM (== 2), not a size of its own; the previous local table defined
// MZ_HUMAN = 3, which is MZ_LARGE, and so mis-sized every human-sized monster
// for bigmonst()/the knockback differential.
const MZ_TINY = 0, MZ_SMALL = 1, MZ_MEDIUM = 2, MZ_HUMAN = MZ_MEDIUM,
      MZ_LARGE = 3;

// C ref: include/monflag.h G_FREQ — the creation-frequency mask of geno.
const G_FREQ = 0x0007;

// C ref: mondata.h verysmall(ptr) / bigmonst(ptr).
function verysmall(ptr) { return (ptr?.msize ?? MZ_MEDIUM) < MZ_SMALL; }
function bigmonst(ptr) { return (ptr?.msize ?? MZ_MEDIUM) >= MZ_LARGE; }

// C ref: mon.c m_lev — the monster's effective level.  makemon()'s newmonhp()
// and dog.c's makedog() both set m_lev; the species base level is the fallback
// for a record that predates that.
function monLev(mon) {
    if (mon && mon.m_lev != null) return mon.m_lev;
    return permonst(mon)?.mlevel ?? 0;
}

// C ref: worn.c find_mac(mdef) — mons[].ac reduced by every worn armour piece's
// ARM_BONUS, then clamped to +-AC_MAX.  Monsters in this port carry no body
// armour (m_initinv gives none), so only the base + clamp are modelled.
const AC_MAX = 127;
function find_mac(mdef) {
    let base = permonst(mdef)?.ac;
    base = (base != null) ? base : 10;
    if (Math.abs(base) > AC_MAX) base = Math.sign(base) * AC_MAX;
    return base;
}

// C ref: mhitu.c getmattk(magr, mdef, indx, prev_result, alt_attk_buf) — attack
// `indx`, possibly substituted.  SYSOPT_SEDUCE is on in this build so the
// AD_SSEX downgrade never fires, and AD_DREN only rescales against the hero.
// Ported: the consecutive-disease -> AD_STUN swap, the mspec_used
// can't-re-grab swap (which CHANGES damn/damd, so it changes the d() roll in
// mdamagem), and the AT_WEAP non-physical -> AD_PHYS force for a cancelled
// attacker.  None of them draw RNG.
function getmattk(magr, mdef, i, prev_result) {
    const list = mattk_list(magr);
    const raw = list[i];
    if (!raw) return { aatyp: AT_NONE, adtyp: AD_PHYS, damn: 0, damd: 0 };
    const attk = { aatyp: raw[0], adtyp: raw[1], damn: raw[2], damd: raw[3] };
    const prev = (i > 0 && list[i - 1]) ? list[i - 1][1] : -1;

    if (i > 0 && prev_result[i - 1] > M_ATTK_MISS
        && (attk.adtyp === AD_DISE || attk.adtyp === AD_PEST
            || attk.adtyp === AD_FAMN)
        && attk.adtyp === prev) {
        attk.adtyp = AD_STUN;
    } else if (magr.mspec_used
               && (attk.aatyp === AT_ENGL || attk.aatyp === AT_HUGS
                   || attk.adtyp === AD_STCK || attk.adtyp === AD_POLY)) {
        const wimpy = (attk.damd === 0);  /* lichen, violet fungus */
        if (attk.adtyp === AD_ACID || attk.adtyp === AD_ELEC
            || attk.adtyp === AD_COLD || attk.adtyp === AD_FIRE) {
            attk.aatyp = AT_TUCH;
        } else {
            attk.aatyp = AT_CLAW;
            attk.adtyp = AD_PHYS;
        }
        attk.damn = 1;
        attk.damd = 6;
        if (wimpy && attk.aatyp === AT_CLAW) {
            attk.aatyp = AT_TUCH;
            attk.damn = attk.damd = 0;
        }
    } else if (i === 0 && attk.aatyp === AT_WEAP && attk.adtyp !== AD_PHYS
               && !(list[1] && list[1][0] === AT_WEAP && list[1][1] === AD_PHYS)
               && magr.mcan) {
        // (the artifact-weapon arm of this test needs Stormbringer / Vorpal
        // Blade / a petrifying corpse wielded by a monster — none exist here)
        attk.adtyp = AD_PHYS;
    } else if (i === 0 && attk.aatyp === AT_TUCH && attk.adtyp === AD_COLD
               && mm_resists_cold(mdef) && permonst(mdef)?.name !== 'shade') {
        attk.adtyp = AD_PHYS;
    }
    return attk;
}

// C ref: hack.h distmin(x0,y0,x1,y1) — Chebyshev (king-move) distance.
function distmin(x0, y0, x1, y1) {
    return Math.max(Math.abs(x0 - x1), Math.abs(y0 - y1));
}

// ── uhitm.c mhitm_knockback ──────────────────────────────────────────────────
// C draws knockdistance = rn2(3) at the top (uhitm.c:5258), then rn2(chance)
// (chance == 6 without ART_OGRESMASHER; uhitm.c:5269).  Everything after the
// 1/6 branch is RNG-free up to the hurtle, so the gate chain is ported in full
// and the function still declines rather than hurtling the defender: the
// actual hurtle_step/mon_break_boulder machinery is not modelled.  Getting the
// chain right matters because it decides whether mdamagem() short-circuits.
function mhitm_knockback(magr, mdef, mattk, weaponUsed) {
    /* knockdistance */ rn2(3);              // uhitm.c:5258
    const chance = 6;                         // no ART_OGRESMASHER in this port
    if (rn2(chance)) return false;            // uhitm.c:5269 — 5/6 of the time

    // only AD_PHYS claw/kick/butt/weapon attacks qualify
    if (!(mattk.adtyp === AD_PHYS
          && (mattk.aatyp === AT_CLAW || mattk.aatyp === AT_KICK
              || mattk.aatyp === AT_BUTT || mattk.aatyp === AT_WEAP)))
        return false;
    // an attacker that wants to grab or engulf doesn't knock back
    if (attacktype_at(magr, AT_ENGL) || attacktype_at(magr, AT_HUGS)
        || attacktype_ad(magr, AD_STCK))
        return false;
    if (DEADMONSTER(magr) || DEADMONSTER(mdef)) return false;
    // attacker must be much larger than defender
    if (!((permonst(magr)?.msize ?? MZ_MEDIUM)
          > (permonst(mdef)?.msize ?? MZ_MEDIUM) + 1))
        return false;
    // The remaining steps (test_move, hurtle, saddle dismount) move the
    // defender; not modelled, so decline without further RNG.
    return false;
}

// ── mhitm.c mdamagem ─────────────────────────────────────────────────────────
// Applies one successful melee hit's damage.  Returns the M_ATTK_* result.
async function mdamagem(magr, mdef, mattk, mwep, dieroll) {
    let damage = d(mattk.damn | 0, mattk.damd | 0);   // mhitm.c:1025
    let hitflags = M_ATTK_MISS;

    // mhitm_adtyping(): dispatch on adtyp.  Ported: AD_PHYS (uhitm.c:3981
    // mhitm_ad_phys, mhitm arm) and the nymph's theft pair.  Every other adtyp
    // falls through with the base damage — see the header for the list.
    if (mattk.adtyp === AD_PHYS) {
        let mwep2 = MON_WEP_MM(magr);
        // non-Null mwep implies AT_WEAP || AT_CLAW
        if (mattk.aatyp !== AT_WEAP && mattk.aatyp !== AT_CLAW) mwep2 = null;
        // shade_miss(): a shade shrugs off a non-silver/non-blessed hit; not
        // modelled (no shade reaches mon-vs-mon melee here).
        if (mattk.aatyp === AT_KICK && thick_skinned(permonst(mdef))) {
            damage = 0;
        } else if (mwep2) {
            // The wielded weapon's own damage dice.  This was skipped
            // entirely, so an armed monster (orc with a crude dagger, gnome
            // with an aklys) dealt only its bare 1dN and never rolled
            // dmgval()'s rnd(oc_wsdam)/bonus dice.
            damage += dmgval(mwep2, { data: permonst(mdef) });
            // gauntlets of power rn1(4,3), artifact_hit(), rustm() and the
            // poisoned-weapon rn2(4) are not modelled.
            if (damage < 1) damage = 1;
        }
        // (the purple-worm-vs-shrieker damage cap is the remaining arm)
    } else if (mattk.adtyp === AD_SITM || mattk.adtyp === AD_SEDU
        || mattk.adtyp === AD_SSEX) {
        // C ref: uhitm.c mhitm_ad_sedu() mhitm arm — steal the first minvent
        // item (non-cursed if the thief is tame), then a nymph teleports away.
        // Consumes no RNG itself; rloc() draws its own destination pairs.
        // SCOPE: possibly_unwield()/mselftouch()/grow_up() after the theft are
        // not replicated (no covered defender wields or is harmed by its own
        // stolen gear).
        if (!magr.mcan) {
            const obj = (mdef.minvent || []).find(
                (o) => !magr.mtame || !o.cursed);
            if (obj) {
                const { doname_invent } = await import('./invent.js');
                // C's gv.vis is latched once in mattackm (mhitm.c:358) and is
                // NOT recomputed after the nymph's rloc() — reading it live
                // would test the post-teleport position.
                const vis = mm_visible(magr, mdef);
                const couldspot = mm_can_see_mon(magr);
                const buf = Monnam(magr);
                const mdefnam = the_monnam(mdef); /* x_monnam(ARTICLE_THE) */
                const onam = doname_invent(obj);
                mdef.minvent.splice(mdef.minvent.indexOf(obj), 1);
                (magr.minvent = magr.minvent || []).push(obj);
                if (vis && mm_can_see_mon(mdef))
                    await emitMMmsg(`${buf} steals ${onam} from ${mdefnam}!`);
                mdef.mstrategy = (mdef.mstrategy | 0) & ~STRAT_WAITFORU;
                if (permonst(magr)?.mcls === S_NYMPH_MCLS) {
                    const { rloc, RLOC_NOMSG } = await import('./teleport.js');
                    await rloc(magr, RLOC_NOMSG);
                    if (vis && couldspot && !mm_can_see_mon(magr))
                        await emitMMmsg(`${buf} suddenly disappears!`);
                    hitflags = M_ATTK_AGR_DONE;
                }
            }
        }
        damage = 0;
    }

    // mhitm_knockback() — rolls rn2(3) then rn2(6); the gate chain always
    // declines here (the hurtle itself isn't modelled), so it never
    // short-circuits mdamagem.
    mhitm_knockback(magr, mdef, mattk, !!mwep);

    if (!damage) return hitflags;

    mdef.mhp -= damage;
    if (mdef.mhp < 1) {
        // C ref: mhitm.c mdamagem() -> monkilled(mdef, "", AD_PHYS).  monkilled
        // emits "<Monnam(mdef)> is destroyed/killed!" when the defender's square
        // is visible (cansee), BEFORE the corpse/detach bookkeeping.  Paging it
        // here (while the defender is still on the map) reproduces C's frame
        // where the previous combat line's --More-- shows the doomed defender
        // still drawn; killMonster() then removes it for the final frame.
        // C ref: mon.c monkilled(mdef, "", adtyp) — the death line prints when
        // the square is visible; when it ISN'T and the victim was tame, C
        // prints "You have a sad feeling for a moment." AFTER mondied()
        // instead.  That arm was missing entirely, so a pet killed out of
        // sight died silently.
        let be_sad = false;
        if (cansee(mdef.mx, mdef.my))
            await emitMMmsg(`${Monnam(mdef)} is ${nonliving(mdef) ? 'destroyed' : 'killed'}!`);
        else
            be_sad = !!mdef.mtame;
        // monster killed (monkilled -> mondied -> corpse_chance, then grow_up).
        killMonster(mdef);
        if (be_sad) await emitMMmsg('You have a sad feeling for a moment.');
        if (hitflags === M_ATTK_AGR_DIED)
            return (M_ATTK_DEF_DIED | M_ATTK_AGR_DIED);
        const grew = grow_up(magr, mdef);
        return M_ATTK_DEF_DIED | (grew ? 0 : M_ATTK_AGR_DIED);
    }
    return (hitflags === M_ATTK_AGR_DIED) ? M_ATTK_AGR_DIED : M_ATTK_HIT;
}

// C ref: mon.c:3181 corpse_chance(mon, magr, was_swallowed).  The rn2(tmp) tail
// is load-bearing AND its TRUE result triggers make_corpse(), which itself
// consumes RNG (next_ident + rndmonnum reservoir + corpse timeout) — see
// killMonster() below.  The guards in front of it decide whether that rn2 is
// drawn AT ALL, so leaving them out (as this did) picks the wrong modulus for
// every big/golem/lich/gas-spore victim.
function corpse_chance(mdef) {
    const mdat = permonst(mdef);

    // Vlad and the liches crumble to dust: no corpse, NO rn2.
    if (mdat?.name === 'Vlad the Impaler' || mdat?.mcls === S_LICH) return false;

    // Gas spores always explode on death.  mon_explodes() is not modelled, but
    // the AT_BOOM damage roll in front of it is real RNG, so draw it and then
    // decline the corpse exactly as C does.
    for (const a of mattk_list(mdef)) {
        if (a[0] !== AT_BOOM) continue;
        if (a[2]) d(a[2], a[3]);
        else if (a[3]) d((mdat?.mlevel ?? 0) + 1, a[3]);
        return false;
    }

    // bigmonst/lizard/golem/mplayer/rider/shopkeeper always leave one: no rn2.
    if (((bigmonst(mdat) || mdat?.name === 'lizard') && !mdef.mcloned)
        || mdat?.mcls === S_GOLEM || is_mplayer(mdat) || is_rider(mdat)
        || mdef.isshk)
        return true;

    const tmp = 2 + (((mdat?.geno ?? 0) & G_FREQ) < 2 ? 1 : 0)
        + (verysmall(mdat) ? 1 : 0);
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
function killMonster(mdef) {
    mdef.mhp = 0;
    // C ref: mon.c mondead() — "if (glyph_is_invisible(...)) unmap_object(...)"
    // runs before m_detach.  A defender killed this same attack may have just
    // had pre_mm_attack() mark its square with the 'I' remembered-unseen-
    // monster glyph (attacker spotted, defender not); clear that stale marker
    // before the corpse/newsym below so the square reverts to its real
    // remembered contents instead of keeping the 'I'.
    const loc0 = game.level?.at(mdef.mx, mdef.my);
    if (loc0?.invisMon) unmap_object(mdef.mx, mdef.my);
    const dropCorpse = corpse_chance(mdef); // mon.c:3181
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

// C ref: makemon.c:2051 grow_up(mtmp, victim) — the killer may gain HP/levels.
// Only the `victim != 0` (killed a monster) branch is reachable from mdamagem.
// Returns TRUE if the aggressor survives; FALSE maps to M_ATTK_AGR_DIED.
//
// The hp_threshold clamp on max_increase (makemon.c:2096) was missing, and it
// is not cosmetic: it rewrites max_increase, which is the MODULUS of the
// rn2(max_increase) on the next line.
//
// NOT ported: the little_to_big() species change (kitten -> housecat and the
// rest of grownups[]) with its "grows up into a housecat" message, gender flip
// and G_GENOD death.  None of it draws RNG; it needs set_mon_data + the mvitals
// genocide table, and mutating mon.data mid-game touches the pet's whole
// (pmidx-mismatched) data representation.
function grow_up(magr, mdef) {
    if (DEADMONSTER(magr)) return false;       // makemon.c:2059

    const ptr = permonst(magr);
    const mlev = monLev(magr);
    const victimLev = monLev(mdef);

    let hp_threshold = mlev * 8;               // makemon.c:2082
    if (!mlev) hp_threshold = 4;
    else if (ptr?.mcls === S_GOLEM)
        hp_threshold = (Math.floor((magr.mhpmax | 0) / 10) + 1) * 10 - 1;
    else if (is_home_elemental(ptr)) hp_threshold *= 3;

    let lev_limit = Math.floor(3 * (ptr?.mlevel ?? 0) / 2); /* adj_lev() */

    // max_increase = rnd(victim->m_lev + 1), clamped so the gain stops at the
    // bottom of the next level.                          (makemon.c:2095-2098)
    let max_increase = rnd(victimLev + 1);
    if ((magr.mhpmax | 0) + max_increase > hp_threshold + 1)
        max_increase = Math.max((hp_threshold + 1) - (magr.mhpmax | 0), 0);
    const cur_increase = (max_increase > 1) ? rn2(max_increase) : 0;

    magr.mhpmax = (magr.mhpmax | 0) + max_increase;
    magr.mhp = (magr.mhp | 0) + cur_increase;
    if (magr.mhpmax <= hp_threshold) return true; /* doesn't gain a level */

    if (is_mplayer(ptr)) lev_limit = 30;
    else if (lev_limit < 5) lev_limit = 5;
    else if (lev_limit > 49) lev_limit = ((ptr?.mlevel ?? 0) > 49) ? 50 : 49;

    magr.m_lev = (magr.m_lev | 0) + 1;

    // sanity checks (makemon.c:2164)
    if (magr.m_lev > lev_limit) {
        magr.m_lev -= 1;
        if (magr.mhpmax === hp_threshold + 1) magr.mhpmax -= 1;
    }
    if (magr.mhpmax > 50 * 8) magr.mhpmax = 50 * 8;
    if (magr.mhp > magr.mhpmax) magr.mhp = magr.mhpmax;

    return true; /* aggressor survives */
}

// ── mhitm.c:1304 passivemm ───────────────────────────────────────────────────
// Defender's passive response.  Reached (even on a miss / kill) from mattackm's
// `if (attk && ... distmin <= 1)` guard.  Ported in full: the previous version
// rolled only the leading d() and one rn2(3), so it
//   * rolled rn2(3) for a defender whose six mattk[] slots are ALL attacks,
//     where C returns early with no roll at all;
//   * skipped AD_ACID's rn2(2) + rn2(30) + rn2(6), which C draws BEFORE the
//     `mdead || mcan` early-out (acid blob / green mold vs a pet is the classic
//     mon-vs-mon passive);
//   * skipped the floating eye's rn2(4); and
//   * never subtracted the passive damage from the aggressor, so a pet that C
//     kills on its own attack survived here.
async function passivemm(magr, mdef, mhitb, mdead, mwep) {
    const mddat = permonst(mdef), madat = permonst(magr);
    const attacks = mattk_list(mdef);
    const mhit = mhitb ? M_ATTK_HIT : M_ATTK_MISS;

    // find the first AT_NONE slot; six real attacks means no passive at all.
    let i = 0;
    for (;; i++) {
        if (i >= NATTK) return (mdead | mhit);  // mhitm.c:1315
        if (!attacks[i] || attacks[i][0] === AT_NONE) break;
    }
    const slot = attacks[i] || [AT_NONE, AD_PHYS, 0, 0];
    const damn = slot[2] | 0, damd = slot[3] | 0, adtyp = slot[1];
    let tmp;
    if (damn) tmp = d(damn, damd);
    else if (damd) tmp = d((mddat?.mlevel ?? 0) + 1, damd);
    else tmp = 0;

    let assess = false;
    // These affect the enemy even if the defender was killed.
    switch (adtyp) {
    case AD_ACID:
        if (mhitb && !rn2(2)) {
            if (mm_can_see_mon(magr))
                await emitMMmsg(`${Monnam(magr)} is splashed by ${s_suffix_mm(mon_nam_mm(mdef))} acid!`);
            if (mm_resists_acid(magr)) {
                if (mm_can_see_mon(magr))
                    await emitMMmsg(`${Monnam(magr)} is not affected.`);
                tmp = 0;
            }
        } else {
            tmp = 0;
        }
        rn2(30);   /* erode_armor(magr, ERODE_CORRODE) — no monster body armour */
        rn2(6);    /* acid_damage(MON_WEP(magr)) — erosion only, no RNG inside */
        assess = true;
        break;
    case AD_ENCH:
        /* drain_item(mwep) — no message, no RNG */
        break;
    default:
        break;
    }

    if (!assess) {
        if (mdead || mdef.mcan) return (mdead | mhit);

        // mhitm.c:1363 — `if (rn2(3))` gates the passive effect.
        if (rn2(3)) {
            switch (adtyp) {
            case AD_PLYS: /* floating eye / gelatinous cube */
                if (tmp > 127) tmp = 127;
                if (mddat?.name === 'floating eye') {
                    if (!rn2(4)) tmp = 127;
                    if (magr.mcansee && haseyes(madat) && mdef.mcansee
                        && (perceives_flag(madat) || !mdef.minvis)) {
                        // mon_reflects()/paralyze_monst() aren't modelled; C
                        // returns here either way, without further RNG.
                        return (mdead | mhit);
                    }
                } else {
                    return (mdead | mhit);
                }
                return 1;
            case AD_COLD:
                if (mm_resists_cold(magr)) { tmp = 0; break; }
                healmon(mdef, Math.floor(tmp / 2), Math.floor(tmp / 2));
                // split_mon() (blue jelly) isn't modelled — it makemon()s a
                // clone, which is RNG the port would have to reproduce exactly.
                break;
            case AD_STUN:
                if (!magr.mstun) magr.mstun = 1;
                tmp = 0;
                break;
            case AD_FIRE:
                if (mm_resists_fire(magr)) tmp = 0;
                break;
            case AD_ELEC:
                if (mm_resists_elec(magr)) tmp = 0;
                break;
            default:
                tmp = 0;
                break;
            }
        } else {
            tmp = 0;
        }
    }

    /* assess_dmg */
    magr.mhp = (magr.mhp | 0) - tmp;
    if (magr.mhp <= 0) {
        // monkilled(magr, "", adtyp) — the death line, then the detach/corpse.
        let be_sad = false;
        if (cansee(magr.mx, magr.my))
            await emitMMmsg(`${Monnam(magr)} is ${nonliving(magr) ? 'destroyed' : 'killed'}!`);
        else
            be_sad = !!magr.mtame;
        killMonster(magr);
        if (be_sad) await emitMMmsg('You have a sad feeling for a moment.');
        return (mdead | mhit | M_ATTK_AGR_DIED);
    }
    return (mdead | mhit);
}

function s_suffix_mm(s) { return /s$/.test(s) ? `${s}'` : `${s}'s`; }

// C ref: mondata.h haseyes(ptr) = !(mflags1 & M1_NOEYES).
function haseyes(ptr) { return (mflags1_of(ptr) & M1_NOEYES) === 0; }

// C ref: mondata.h thick_skinned(ptr) = (mflags1 & M1_THICK_HIDE).
function thick_skinned(ptr) { return (mflags1_of(ptr) & M1_THICK_HIDE) !== 0; }

// ── mhitm.c mdisplacem ───────────────────────────────────────────────────────
// C ref: mhitm.c mdisplacem(magr, mdef, quietly) — the aggressor (a displacer
// beast, or a Rider) barges through the defender's square, swapping places
// with it instead of attacking.  Returns the same M_ATTK_* codes as
// mattackm(): a successful swap is M_ATTK_HIT, a failed one M_ATTK_MISS (the
// square is NOT entered on a miss — the caller must not move the aggressor).
export async function mdisplacem(magr, mdef, quietly) {
    if (!magr || !mdef || magr === mdef) return M_ATTK_MISS;
    const tx = mdef.mx, ty = mdef.my;
    const fx = magr.mx, fy = magr.my;
    if (m_at(fx, fy) !== magr || m_at(tx, ty) !== mdef) return M_ATTK_MISS;

    // 1-in-7 failure chance (matches the pet-displacement chance in do_attack()).
    if (!rn2(7)) return M_ATTK_MISS;

    const pa = permonst(magr);
    // Grid bugs cannot displace at an angle.  Resolved by species name, not by
    // data.pmidx: the pet records carry the C PM_* numbering (see permonst()).
    if (pa?.name === 'grid bug'
        && magr.mx !== mdef.mx && magr.my !== mdef.my)
        return M_ATTK_MISS;

    // C: mhitm.c:200-215 — the displaced defender stops hiding/mimicking, wakes
    // and drops its wait strategy; finish_meating() clears meating.  The
    // seemimic() arm was omitted as unreachable, but a mimic IS a valid
    // displacement target.  (touch_petrifies(pd) -> monstone(magr) is still
    // unported: monstone() builds a statue object, whose mksobj RNG this port
    // would have to reproduce exactly.)
    if (mdef.mundetected) mdef.mundetected = 0;
    if (mdef.m_ap_type && mdef.m_ap_type !== 'mon') {   // seemimic(mdef)
        mdef.m_ap_type = 0;
        mdef.mappearance = 0;
        newsym(mdef.mx, mdef.my);
    }
    mdef.msleeping = 0;
    mdef.mstrategy = (mdef.mstrategy || 0) & ~STRAT_WAITMASK;
    if (mdef.meating) mdef.meating = 0;

    const vis = mm_can_see_mon(magr) && mm_can_see_mon(mdef);

    magr.mx = tx; magr.my = ty;
    mdef.mx = fx; mdef.my = fy;

    if (vis && !quietly) {
        // C: `is_rider(pa) ? "the" : mhis(magr)` — a Rider barges through "the"
        // way, everyone else through "his"/"her" way.
        const hisher = is_rider(pa) ? 'the' : (magr.female ? 'her' : 'his');
        await emitMMmsg(`${Monnam_mm(magr)} moves ${mon_nam_mm(mdef)} out of ${hisher} way!`);
    }
    newsym(fx, fy);
    newsym(tx, ty);
    return M_ATTK_HIT;
}

// ── mhitm.c:597 failed_grab ──────────────────────────────────────────────────
// Can't hold an unsolid target (ghosts, lights, vortices, most elementals).
// notonhead (long-worm tail) isn't modelled.  Draws no RNG, but it CANCELS the
// strike, which suppresses mdamagem()'s d() roll and the whole kill tail.
async function failed_grab(magr, mdef, mattk) {
    if (unsolid_flag(permonst(mdef))
        && (mattk.aatyp === AT_HUGS || mattk.adtyp === AD_WRAP
            || mattk.adtyp === AD_STCK || mattk.adtyp === AD_DGST)) {
        if (mm_visible(magr, mdef) && mm_can_see_mon(mdef)) {
            const verb = (mattk.adtyp === AD_DGST) ? 'gulp'
                : (mattk.adtyp === AD_STCK) ? 'adhere' : 'grab';
            await emitMMmsg(`${s_suffix_mm(Monnam_mm(magr))} ${verb} attempt`
                + ` passes right through ${mon_nam_mm(mdef)}!`);
        }
        return true;
    }
    return false;
}

// ── mhitm.c:1283 mswingsm ────────────────────────────────────────────────────
// "<Mon> thrusts his <weapon> at <mdef>."  The mon-vs-mon format ends in
// "at %s"; mhitu.c's monster-vs-hero mswings() is the one that doesn't, and
// this used to emit that (hero-directed) wording with a hardcoded "crude
// dagger" as the weapon name.  Display only; no RNG.
async function mswingsm(magr, mdef, otemp) {
    if (!mm_can_see_mon(magr)) return;
    // mswings_verb(otemp, bash): SLASH weapons swing, everything else the
    // monsters here wield thrusts; a polearm used at reach bashes (no monster
    // in this port wields one).
    const verb = SLASH_OTYPS_MM.has(otemp.otyp) ? 'swings' : 'thrusts';
    const hisher = magr.female ? 'her' : 'his';
    const many = ((otemp.quan | 0) > 1) ? 'one of ' : '';
    await emitMMmsg(`${Monnam(magr)} ${verb} ${many}${hisher} ${xname(otemp)}`
        + ` at ${mon_nam_mm(mdef)}.`);
}
// C ref: objects[].oc_dir & SLASH for the edged weapons monsters can wield
// (otyps per mkobj.js).  Everything else they carry is PIERCE.
const SLASH_OTYPS_MM = new Set([
    43 /*scimitar*/, 44 /*silver saber*/, 45 /*broadsword*/, 46 /*long sword*/,
    47 /*two-handed sword*/, 48 /*katana*/, 51 /*axe*/, 52 /*battle-axe*/,
]);

// C ref: weapon.c hitval(otmp, mon) — spe + oc_hitbon, +2 for a blessed weapon
// against undead/demons.  (The spear-vs-kebabable, trident-vs-swimmer,
// pick-axe-vs-xorn and artifact bonuses need tables this port doesn't carry.)
// It is added to tmp BEFORE the to-hit roll and subtracted after, so leaving it
// out changed whether an armed monster connects.
function hitval_mm(weapon, mtmp) {
    if (!weapon) return 0;
    let tmp = (weapon.spe || 0) + (WEP_HITBON[weapon.otyp] ?? 0);
    const ptr = permonst(mtmp);
    if (weapon.blessed && (is_undead_flag(ptr) || is_demon_flag(ptr))) tmp += 2;
    return tmp;
}

// C ref: include/monst.h:251 helpless(mon) = msleeping || !mcanmove.
function helpless_mm(mtmp) {
    return !!(mtmp && (mtmp.msleeping || !mtmp.mcanmove));
}

// C ref: mhitu.c:467 mtrapped_in_pit(mtmp) — an AT_KICK attack is skipped
// entirely (C `continue`s, so no to-hit roll and no passive) while the kicker
// is stuck in a pit.
function mtrapped_in_pit(mtmp) {
    if (!mtmp?.mtrapped) return false;
    const t = t_at(mtmp.mx, mtmp.my);
    return !!t && is_pit(t.ttyp);
}

// C ref: do_name.c a_monnam(mtmp) — "a <species>" (the given name alone when
// the monster has one).
function a_monnam(mtmp) {
    const given = mtmp?.mgivenname || mtmp?.mextra?.mgivenname;
    if (given) return given;
    const s = mon_species(mtmp);
    return (/^[aeiouAEIOU]/.test(s) ? 'an ' : 'a ') + s;
}

// ── mhitm.c:644 hitmm ────────────────────────────────────────────────────────
// pre_mm_attack() first, then the "X <verb> Y." line (when visible), THEN
// mdamagem() — so the hit message precedes any death message.  Neither
// consumes RNG.  When not visible the hero may instead hear it (noises()).
// shade_miss() (a shade shrugging off a non-silver/non-blessed hit, which
// BYPASSES mdamagem and its d() roll) is not modelled.
async function hitmm(magr, mdef, mattk, mwep, dieroll) {
    pre_mm_attack(magr, mdef);
    const compat = !magr.mcan ? could_seduce(magr, mdef, mattk) : 0;
    if (mm_visible(magr, mdef)) {
        if (compat) {
            await emitMMmsg(`${Monnam_mm(magr)}`
                + ` ${mdef.mcansee ? 'smiles at' : 'talks to'}`
                + ` ${mon_nam_mm(mdef)}`
                + ` ${compat === 2 ? 'engagingly' : 'seductively'}.`);
        } else if (mattk.aatyp === AT_TENT) {
            await emitMMmsg(`${s_suffix_mm(Monnam_mm(magr))} tentacles suck`
                + ` ${mon_nam_mm(mdef)}.`);
        } else {
            await emitMMmsg(`${Monnam_mm(magr)} ${hit_verb(mattk.aatyp)}`
                + ` ${mon_nam_mm(mdef)}.`);
        }
    } else {
        await noises(magr, mattk);
    }
    return await mdamagem(magr, mdef, mattk, mwep, dieroll);
}

// ── mhitm.c:76 missmm ────────────────────────────────────────────────────────
async function missmm(magr, mdef, mattk) {
    pre_mm_attack(magr, mdef);
    if (mm_visible(magr, mdef)) {
        const seduces = !magr.mcan && could_seduce(magr, mdef, mattk);
        await emitMMmsg(`${Monnam_mm(magr)}`
            + ` ${seduces ? 'pretends to be friendly to' : 'misses'}`
            + ` ${mon_nam_mm(mdef)}.`);
    } else {
        await noises(magr, mattk);
    }
}

// ── mhitm.c:293 mattackm ─────────────────────────────────────────────────────
// A monster attacks another monster.  Returns M_ATTK_*.
export async function mattackm(magr, mdef) {
    if (!magr || !mdef) return M_ATTK_MISS;
    if (helpless_mm(magr)) return M_ATTK_MISS;         // mhitm.c:311
    if (DEADMONSTER(magr) || DEADMONSTER(mdef)) return M_ATTK_MISS;

    const pa = permonst(magr), pd = permonst(mdef);

    // Grid bugs cannot attack at an angle.                  mhitm.c:316
    if (pa?.name === 'grid bug' && magr.mx !== mdef.mx && magr.my !== mdef.my)
        return M_ATTK_MISS;

    // tmp = find_mac(mdef) + magr->m_lev, +4 if the defender is confused or
    // helpless (which also WAKES it), +1 for elf-vs-orc.  Both were dismissed
    // as "never apply to the modeled matchups"; a sleeping defender is the
    // normal case for a monster the hero hasn't disturbed, and the +4 flips the
    // `tmp > dieroll` test — i.e. it decides whether mdamagem() rolls at all.
    let tmpBase = find_mac(mdef) + monLev(magr);
    if (mdef.mconf || helpless_mm(mdef)) {             // mhitm.c:322
        tmpBase += 4;
        mdef.msleeping = 0;
    }

    // A hiding defender is flushed out by being attacked.   mhitm.c:328
    if (mdef.mundetected) {
        mdef.mundetected = 0;
        newsym(mdef.mx, mdef.my);
        if (mm_can_see_mon(mdef))
            await emitMMmsg(`Suddenly, you notice ${a_monnam(mdef)}.`);
    }

    if (is_elf_flag(pa) && is_orc_flag(pd)) tmpBase++;  // mhitm.c:353

    // magr->mlstmv = svm.moves — flags that the aggressor has acted this round
    // (the dog_move return-attack gate at dogmove.c:1159 reads the *defender's*
    // mlstmv, so keeping this current matters for the bounce-back attack).
    magr.mlstmv = game.moves;

    let struck = 0;
    const res = new Array(NATTK).fill(M_ATTK_MISS);

    for (let i = 0; i < NATTK; i++) {
        res[i] = M_ATTK_MISS;

        // target might no longer be there (after the first attack)
        if (i > 0 && (m_at(mdef.mx, mdef.my) !== mdef
                      || DEADMONSTER(magr) || DEADMONSTER(mdef)))
            continue;

        const mattk = getmattk(magr, mdef, i, res);

        let strike = 0, attk = 1;
        let mwep = null;
        let dieroll = 0;
        let tmp = tmpBase;

        switch (mattk.aatyp) {
        case AT_WEAP:
        case AT_CLAW:
        case AT_KICK:
        case AT_BITE:
        case AT_STNG:
        case AT_TUCH:
        case AT_BUTT:
        case AT_TENT: {
            if (mattk.aatyp === AT_WEAP) {
                if (distmin(magr.mx, magr.my, mdef.mx, mdef.my) > 1) {
                    // thrwmm(): a ranged volley with its own multishot/hit
                    // rolls — not modelled, so decline without RNG.
                    strike = 0; attk = 0;
                    break;
                }
                // C ref: mhitm.c:406 — an armed aggressor wields its weapon
                // before striking.  mon_wield_item consumes no RNG; when it
                // actually wields (returns 1) mattackm returns M_ATTK_MISS
                // (the turn was spent wielding).
                if (magr.weapon_check === NEED_WEAPON || !MON_WEP_MM(magr)) {
                    magr.weapon_check = NEED_HTH_WEAPON;
                    if (await mon_wield_item_mm(magr)) return M_ATTK_MISS;
                }
                // possibly_unwield(magr, FALSE) — only fires for a monster
                // wielding something that isn't a weapon; not modelled.
                mwep = MON_WEP_MM(magr);
                if (!mwep && !(magr.minvent || []).length)
                    // PORT GAP, not C: makemon.js m_initweap() only covers
                    // S_KOBOLD/S_ORC/S_ANGEL, so every other is_armed() species
                    // reaches melee with an empty minvent and swings bare-handed
                    // here — drawing an rnd(20) that C spends WIELDING the weapon
                    // m_initweap gave it (mon_wield_item != 0 -> M_ATTK_MISS).
                    // Declining reproduces C's wield turn; leaving it out
                    // measured -1 public (seed0383 step 211, a gnome).  Remove
                    // once m_initweap covers the class.
                    return M_ATTK_MISS;
                if (mwep) {
                    if (mm_visible(magr, mdef)) await mswingsm(magr, mdef, mwep);
                    tmp += hitval_mm(mwep, mdef);      // mhitm.c:412
                }
            }
            if (mattk.aatyp === AT_KICK && mtrapped_in_pit(magr))
                continue;                              // mhitm.c:419
            // Nymph that teleported away on its first attack?
            if (distmin(magr.mx, magr.my, mdef.mx, mdef.my) > 1)
                continue;                              // mhitm.c:423
            // The cockatrice-instinct guard below it in C is unreachable: mwep
            // is only ever set on the AT_WEAP arm, and the guard requires
            // aatyp != AT_WEAP.
            dieroll = rnd(20 + i);                     // mhitm.c:441
            strike = (tmp > dieroll) ? 1 : 0;
            if (mwep) tmp -= hitval_mm(mwep, mdef);    // don't accumulate
            if (strike) {
                if (unsolid_flag(pd) && await failed_grab(magr, mdef, mattk)) {
                    strike = 0;
                    break;
                }
                res[i] = await hitmm(magr, mdef, mattk, mwep, dieroll);
                // The black/brown pudding clone_mon() division is not modelled.
            } else {
                await missmm(magr, mdef, mattk);
            }
            break;
        }

        case AT_HUGS:                                  // mhitm.c:466
            strike = (i >= 2 && res[i - 1] === M_ATTK_HIT
                      && res[i - 2] === M_ATTK_HIT) ? 1 : 0;
            if (strike) {
                if (await failed_grab(magr, mdef, mattk)) strike = 0;
                else res[i] = await hitmm(magr, mdef, mattk, null, 0);
            }
            break;

        case AT_GAZE:                                  // mhitm.c:483
            // gazemm() itself is not modelled, but C leaves attk == 1 here, so
            // the defender still gets its passive; the previous `default:` arm
            // zeroed attk and swallowed passivemm's rolls.
            strike = 0;
            break;

        case AT_ENGL:                                  // mhitm.c:500
            if (pd?.name === 'shade') { strike = 0; break; }
            if (mdef === game.u?.usteed) { strike = 0; break; }
            if (distmin(magr.mx, magr.my, mdef.mx, mdef.my) > 1) continue;
            strike = (tmp > rnd(20 + i)) ? 1 : 0;
            if (strike) {
                // gulpmm() (swallow + digestion) is not modelled; failed_grab
                // still cancels an unsolid target faithfully.
                if (await failed_grab(magr, mdef, mattk)) strike = 0;
            } else {
                await missmm(magr, mdef, mattk);
            }
            break;

        case AT_EXPL:                                  // mhitm.c:485
            // explmm(): the explosion damage roll isn't modelled.  C's
            // "cancelled, no attack" arm is strike = 0, attk = 0.
            strike = 0; attk = 0;
            break;

        case AT_BREA:
        case AT_SPIT:                                  // mhitm.c:527
            // Ranged attacks aren't allowed at point blank range, which is the
            // only distance mon-vs-mon melee reaches here; breamm()/spitmm()
            // for the non-adjacent case aren't modelled.
            strike = 0; attk = 0;
            break;

        default: /* AT_NONE, AT_MAGC, ... — no attack */
            strike = 0; attk = 0;
            break;
        }

        // passivemm: reached when attk && aggressor still alive && adjacent.
        if (attk && !(res[i] & M_ATTK_AGR_DIED)
            && distmin(magr.mx, magr.my, mdef.mx, mdef.my) <= 1) {
            res[i] = await passivemm(magr, mdef, strike,
                                     (res[i] & M_ATTK_DEF_DIED), mwep);
        }

        if (res[i] & M_ATTK_DEF_DIED) return res[i];
        if (res[i] & M_ATTK_AGR_DIED) return res[i];
        if ((res[i] & M_ATTK_AGR_DONE) || helpless_mm(magr)) return res[i];
        // mon_offmap(mdef) (knocked into a level teleporter) isn't modelled.
        if (res[i] & M_ATTK_HIT) struck = 1;
    }

    return struck ? M_ATTK_HIT : M_ATTK_MISS;
}
