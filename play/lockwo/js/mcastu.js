// mcastu.js — monster spellcasting.
// C ref: src/mcastu.c (choose_monster_spell/castmu/cursetxt) + include/mcastu.h.
//
// dochug() calls castmu(mtmp, a, FALSE, FALSE) for every AT_MAGC AD_SPEL/AD_CLRC
// attack of a monster that is taking its movement branch and is within dist2 49
// of the hero (monmove.c:875).  That path draws choose_monster_spell's
// rn2(m_lev) EVERY such turn, so leaving it out desyncs the stream for any level
// carrying a spellcaster (seed0360 step 205: a gnomish wizard 7 squares away).

import { game } from './gstate.js';
import { rn2, d } from './rng.js';
import { couldsee } from './vision.js';
import {
    M_ATTK_MISS, M_ATTK_HIT, MFAST, STRAT_WAITFORU,
    M_SEEN_NOTHING, M_SEEN_MAGR, M_SEEN_FIRE, M_SEEN_COLD, M_SEEN_SLEEP,
    M_SEEN_DISINT, M_SEEN_ELEC, M_SEEN_POISON, M_SEEN_ACID,
} from './const.js';
import {
    AD_SPEL, AD_CLRC, AD_MAGM, AD_FIRE, AD_COLD, AD_SLEE, AD_DISN, AD_ELEC,
    AD_DRST, AD_ACID,
} from './monattk_data.js';
import { healmon } from './mon.js';

// ---------------------------------------------------------------------------
// include/mcastu.h — MONSPELL(def, lvl, flags) in enum order.  The enum VALUE
// is the array index, which is also what mon_wizard_spells/mon_cleric_spells
// hold, so the table order below is load-bearing.
export const MCF_NONE = 0x0000;
export const MCF_INDIRECT = 0x0001; /* untargeted/indirect spell */
export const MCF_SIGHT = 0x0002;    /* monster needs to see hero */
export const MCF_HOSTILE = 0x0004;  /* cast by hostile monsters only */

export const MCAST_PSI_BOLT = 0, MCAST_OPEN_WOUNDS = 1, MCAST_CURE_SELF = 2,
    MCAST_HASTE_SELF = 3, MCAST_CONFUSE_YOU = 4, MCAST_STUN_YOU = 5,
    MCAST_DISAPPEAR = 6, MCAST_PARALYZE = 7, MCAST_BLIND_YOU = 8,
    MCAST_WEAKEN_YOU = 9, MCAST_DESTRY_ARMR = 10, MCAST_INSECTS = 11,
    MCAST_CURSE_ITEMS = 12, MCAST_LIGHTNING = 13, MCAST_FIRE_PILLAR = 14,
    MCAST_GEYSER = 15, MCAST_AGGRAVATION = 16, MCAST_SUMMON_MONS = 17,
    MCAST_CLONE_WIZ = 18, MCAST_DEATH_TOUCH = 19;

const mcast_data = [
    /* PSI_BOLT     */ { level: 0, flags: MCF_HOSTILE | MCF_SIGHT },
    /* OPEN_WOUNDS  */ { level: 0, flags: MCF_HOSTILE | MCF_SIGHT },
    /* CURE_SELF    */ { level: 1, flags: MCF_INDIRECT },
    /* HASTE_SELF   */ { level: 2, flags: MCF_INDIRECT },
    /* CONFUSE_YOU  */ { level: 2, flags: MCF_HOSTILE | MCF_SIGHT },
    /* STUN_YOU     */ { level: 3, flags: MCF_HOSTILE | MCF_SIGHT },
    /* DISAPPEAR    */ { level: 4, flags: MCF_INDIRECT },
    /* PARALYZE     */ { level: 4, flags: MCF_HOSTILE | MCF_SIGHT },
    /* BLIND_YOU    */ { level: 6, flags: MCF_HOSTILE | MCF_SIGHT },
    /* WEAKEN_YOU   */ { level: 6, flags: MCF_HOSTILE | MCF_SIGHT },
    /* DESTRY_ARMR  */ { level: 8, flags: MCF_HOSTILE | MCF_SIGHT },
    /* INSECTS      */ { level: 8, flags: MCF_HOSTILE | MCF_INDIRECT | MCF_SIGHT },
    /* CURSE_ITEMS  */ { level: 10, flags: MCF_HOSTILE | MCF_SIGHT },
    /* LIGHTNING    */ { level: 11, flags: MCF_HOSTILE | MCF_SIGHT },
    /* FIRE_PILLAR  */ { level: 12, flags: MCF_HOSTILE | MCF_SIGHT },
    /* GEYSER       */ { level: 13, flags: MCF_HOSTILE | MCF_SIGHT },
    /* AGGRAVATION  */ { level: 13, flags: MCF_INDIRECT | MCF_HOSTILE | MCF_SIGHT },
    /* SUMMON_MONS  */ { level: 15, flags: MCF_HOSTILE | MCF_INDIRECT | MCF_SIGHT },
    /* CLONE_WIZ    */ { level: 18, flags: MCF_HOSTILE | MCF_INDIRECT | MCF_SIGHT },
    /* DEATH_TOUCH  */ { level: 20, flags: MCF_HOSTILE | MCF_SIGHT },
];

// mcastu.c:27 — "the spells in the list should be in ascending level order".
const mon_cleric_spells = [
    MCAST_OPEN_WOUNDS, MCAST_CURE_SELF, MCAST_CONFUSE_YOU, MCAST_PARALYZE,
    MCAST_BLIND_YOU, MCAST_INSECTS, MCAST_CURSE_ITEMS, MCAST_LIGHTNING,
    MCAST_FIRE_PILLAR, MCAST_GEYSER,
];
const mon_wizard_spells = [
    MCAST_PSI_BOLT, MCAST_CURE_SELF, MCAST_HASTE_SELF, MCAST_STUN_YOU,
    MCAST_DISAPPEAR, MCAST_WEAKEN_YOU, MCAST_DESTRY_ARMR, MCAST_CURSE_ITEMS,
    MCAST_AGGRAVATION, MCAST_SUMMON_MONS, MCAST_CLONE_WIZ, MCAST_DEATH_TOUCH,
];

// C ref: mcastu.c:899 is_undirected_spell().
export function is_undirected_spell(spellnum) {
    return (mcast_data[spellnum].flags & MCF_INDIRECT) !== 0;
}

// C ref: mcastu.c:909 spell_would_be_useless().  THREE of its arms draw
// (DEATH_TOUCH rn2(2), GEYSER rn2(5), AGGRAVATION rn2(100)) and it is called
// once per candidate spell inside choose_monster_spell's descending scan, so
// the arm order matters as much as the answers.
function spell_would_be_useless(mtmp, spellnum) {
    if ((mcast_data[spellnum].flags & MCF_HOSTILE) !== 0) {
        if (mtmp.mpeaceful) return true;
    }
    if ((mcast_data[spellnum].flags & MCF_SIGHT) !== 0) {
        if (!couldsee(mtmp.mx, mtmp.my)) return true;
    }

    switch (spellnum) {
    case MCAST_DEATH_TOUCH:
        // Antimagic/Hallucination are hero properties; neither is carried by a
        // hero this reaches, so C's `(Antimagic || Hallucination) && !rn2(2)`
        // short-circuits before the roll.
        if ((Antimagic() || Hallucination()) && !rn2(2)) return true;
        break;
    case MCAST_GEYSER:
        if (!rn2(5)) return true;
        break;
    case MCAST_CLONE_WIZ:
        /* only the Wizard is allowed to clone himself */
        if (!mtmp.iswiz || (game.context?.no_of_wizards | 0) > 1) return true;
        break;
    case MCAST_AGGRAVATION:
        if (!has_aggravatables(mtmp)) return rn2(100) ? true : false;
        break;
    case MCAST_HASTE_SELF:
        if (mtmp.permspeed === MFAST) return true;
        break;
    case MCAST_DISAPPEAR:
        if (mtmp.minvis || mtmp.invis_blkd) return true;
        if (mtmp.mpeaceful && !See_invisible()) return true;
        break;
    case MCAST_CURE_SELF:
        if (mtmp.mhp === mtmp.mhpmax) return true;
        break;
    case MCAST_BLIND_YOU:
        if (Blinded()) return true;
        break;
    default:
        break;
    }
    return false;
}

// C ref: mcastu.c:87 choose_monster_spell(mtmp, adtyp).
function choose_monster_spell(mtmp, adtyp) {
    let list = null, len = 0;

    if (adtyp === AD_SPEL) { list = mon_wizard_spells; len = mon_wizard_spells.length; }
    else if (adtyp === AD_CLRC) { list = mon_cleric_spells; len = mon_cleric_spells.length; }

    if (!list || len < 1) return MCAST_PSI_BOLT;

    const maxlev = mcast_data[list[len - 1]].level;

    // mcastu.c:111 — the divergence this port was written for.
    let spellval = rn2(mtmp.m_lev);
    if (spellval > maxlev && rn2(maxlev)) spellval = rn2(maxlev);

    for (let i = len - 1; i >= 0; i--) {
        if (mcast_data[list[i]].level <= spellval
            && !spell_would_be_useless(mtmp, list[i]))
            return list[i];
    }
    return list[0];
}

// C ref: mcastu.c:61 cursetxt() — feedback when a frustrated monster couldn't
// cast.  The rn2(4) fires ONLY when the monster is out of sight AND the move
// count is not a multiple of 4 (C's `!(svm.moves % 4) || !rn2(4)`).
async function cursetxt(mtmp, undirected) {
    const { canseemon_shared } = await import('./display.js');
    const { Monnam } = await import('./uhitm.js');
    if (canseemon_shared(mtmp) && couldsee(mtmp.mx, mtmp.my)) {
        let point_msg;
        if (undirected) point_msg = 'all around, then curses';
        else if ((Invis() && !perceives(mtmp.data)
                  && (mtmp.mux !== game.u?.ux || mtmp.muy !== game.u?.uy))
                 || game.u?.uundetected) point_msg = 'and curses in your general direction';
        else if (Displaced() && (mtmp.mux !== game.u?.ux || mtmp.muy !== game.u?.uy))
            point_msg = 'and curses at your displaced image';
        else point_msg = 'at you, then curses';
        const { update_topl } = await import('./display.js');
        await update_topl(`${Monnam(mtmp)} points ${point_msg}.`);
    } else if (!((game.moves | 0) % 4) || !rn2(4)) {
        // Norep("You hear a mumbled curse.") — Deaf hero hears nothing.
        if (!Deaf()) {
            const { update_topl } = await import('./display.js');
            await update_topl('You hear a mumbled curse.');
        }
    }
}

// C ref: mcastu.c:130 castmu(mtmp, mattk, thinks_it_foundyou, foundyou).
// Returns M_ATTK_MISS / M_ATTK_HIT.
export async function castmu(mtmp, mattk, thinks_it_foundyou, foundyou) {
    const ml = mtmp.m_lev | 0;
    let spellnum = 0;

    if ((mattk.adtyp === AD_SPEL || mattk.adtyp === AD_CLRC) && ml) {
        let cnt = 40;
        do {
            spellnum = choose_monster_spell(mtmp, mattk.adtyp);
            /* not trying to attack?  don't allow directed spells */
            if (!thinks_it_foundyou) {
                if (!is_undirected_spell(spellnum)
                    || spell_would_be_useless(mtmp, spellnum))
                    return M_ATTK_MISS;
                break;
            }
        } while (--cnt > 0 && spell_would_be_useless(mtmp, spellnum));
        if (cnt === 0) return M_ATTK_MISS;
    }

    /* monster unable to cast spells? */
    if (mtmp.mcan || mtmp.mspec_used || !ml
        || m_seenres(mtmp, cvt_adtyp_to_mseenres(mattk.adtyp))) {
        await cursetxt(mtmp, is_undirected_spell(spellnum));
        return M_ATTK_MISS;
    }

    if (mattk.adtyp === AD_SPEL || mattk.adtyp === AD_CLRC)
        mtmp.mspec_used = (ml < 8) ? (10 - ml) : 2;

    if (!foundyou && thinks_it_foundyou && !is_undirected_spell(spellnum)) {
        // "%s casts a spell at %s!" — reachable only from mattacku's AT_MAGC
        // case, which this port does not wire up yet.
        return M_ATTK_MISS;
    }

    const { nomul } = await import('./hack.js');
    nomul(0);
    if (rn2(ml * 10) < (mtmp.mconf ? 100 : 20)) { /* fumbled attack */
        const { canseemon_shared } = await import('./display.js');
        if (canseemon_shared(mtmp) && !Deaf()) {
            const { update_topl } = await import('./display.js');
            const { mon_nam } = await import('./uhitm.js');
            await update_topl(`The air crackles around ${mon_nam(mtmp)}.`);
        }
        return M_ATTK_MISS;
    }

    {
        const { canspotmon } = await import('./uhitm.js');
        if (canspotmon(mtmp) || !is_undirected_spell(spellnum)) {
            const { update_topl } = await import('./display.js');
            const { Monnam } = await import('./uhitm.js');
            const who = canspotmon(mtmp) ? Monnam(mtmp) : 'Something';
            const at = is_undirected_spell(spellnum) ? ''
                : ((Invis() && !perceives(mtmp.data)
                    && !(mtmp.mux === game.u?.ux && mtmp.muy === game.u?.uy))
                   ? ' at a spot near you'
                   : (Displaced()
                      && !(mtmp.mux === game.u?.ux && mtmp.muy === game.u?.uy))
                     ? ' at your displaced image'
                     : ' at you');
            await update_topl(`${who} casts a spell${at}!`);
        }
    }

    // mcastu.c:232 — with !foundyou the damage roll is skipped entirely (dmg=0),
    // which is the only case the dochug caller can reach.
    let dmg = 0;
    if (foundyou) dmg = mattk.damd ? d(((ml / 2) | 0) + mattk.damn, mattk.damd)
                                   : d(((ml / 2) | 0) + 1, 6);

    if (mattk.adtyp === AD_SPEL || mattk.adtyp === AD_CLRC)
        await mcast_spell(mtmp, dmg, spellnum);
    // AD_FIRE/AD_COLD/AD_MAGM variants of AT_MAGC belong to buzzmu's callers.

    return M_ATTK_HIT;
}

// C ref: mcastu.c:801 mcast_spell().  Only the MCF_INDIRECT spells are
// reachable from dochug's undirected-cast loop (it returns M_ATTK_MISS for any
// directed pick), so the directed arms are deliberately absent until AT_MAGC is
// wired into mattacku.
async function mcast_spell(mtmp, dmg, spellnum) {
    switch (spellnum) {
    case MCAST_CURE_SELF:
        // mcastu.c:441 m_cure_self: heal 3d6 when hurt.
        if (mtmp.mhp < mtmp.mhpmax) {
            const { canseemon_shared } = await import('./display.js');
            const heal = d(3, 6);
            if (canseemon_shared(mtmp)) {
                const { update_topl } = await import('./display.js');
                const { Monnam } = await import('./uhitm.js');
                await update_topl(`${Monnam(mtmp)} looks better.`);
            }
            healmon(mtmp, heal, 0);
        }
        break;
    case MCAST_HASTE_SELF: {
        const { mon_adjust_speed } = await import('./muse.js');
        await mon_adjust_speed(mtmp, 1, null);
        break;
    }
    case MCAST_SUMMON_MONS: {
        // C ref: mcastu.c:421 mcast_summon_mons(mtmp) — nasty(mtmp) is the
        // whole effect and it is far from RNG-free (rnd(u.ulevel/3) outer
        // iterations, an rn2(44) pick_nasty per slot, makemon, rnd(4)).
        const { nasty } = await import('./wizard.js');
        const count = await nasty(mtmp);
        if (count) {
            const { update_topl } = await import('./display.js');
            if (mtmp.iswiz) {
                await update_topl(`"Destroy the thief, my pet${count === 1 ? '' : 's'}!"`);
            } else {
                const mappear = (count === 1) ? 'A monster appears' : 'Monsters appear';
                await update_topl(`${mappear} from nowhere!`);
            }
        }
        break;
    }
    case MCAST_CLONE_WIZ: {
        // C ref: mcastu.c:411 mcast_clone_wiz(mtmp).
        if (mtmp.iswiz && (game.context?.no_of_wizards | 0) === 1) {
            const { update_topl } = await import('./display.js');
            await update_topl('Double Trouble...');
            const { clonewiz } = await import('./wizard.js');
            await clonewiz();
        }
        break;
    }
    default:
        // The remaining undirected spells (DISAPPEAR, INSECTS, AGGRAVATION)
        // need mon_set_minvis / the insect-swarm makemon loop that this port
        // does not carry; their spell_would_be_useless() draws have already
        // fired, so the stream stays aligned up to the effect.
        break;
    }
    if (dmg) { /* mdamageu(mtmp, dmg) — directed spells only */ }
}

// ---------------------------------------------------------------------------
// Small property shims.  Each names the C predicate it stands in for; all are
// RNG-free and constant for the heroes these sessions drive.
function Antimagic() { return !!game.u?.Antimagic; }
function Hallucination() { return !!(game.u?.Hallucination); }
function Blinded() { return !!(game.u?.Blinded); }
function See_invisible() { return !!game.u?.See_invisible; }
function Invis() { return !!game.u?.uinvis; }
function Displaced() { return !!game.u?.Displaced; }
function Deaf() { return !!game.u?.Deaf; }
function perceives(mdat) { return !!(mdat && mdat.perceives); }

// C ref: monst.h m_seenres(mon, bit).
function m_seenres(mon, bit) { return bit !== 0 && ((mon?.seen_resistance | 0) & bit) !== 0; }
// C ref: mondata.c:1522 cvt_adtyp_to_mseenres().  AD_SPEL/AD_CLRC fall through
// to M_SEEN_NOTHING, so castmu's m_seenres() term is FALSE for a spellcaster.
function cvt_adtyp_to_mseenres(adtyp) {
    switch (adtyp) {
    case AD_MAGM: return M_SEEN_MAGR;
    case AD_FIRE: return M_SEEN_FIRE;
    case AD_COLD: return M_SEEN_COLD;
    case AD_SLEE: return M_SEEN_SLEEP;
    case AD_DISN: return M_SEEN_DISINT;
    case AD_ELEC: return M_SEEN_ELEC;
    case AD_DRST: return M_SEEN_POISON;
    case AD_ACID: return M_SEEN_ACID;
    default: return M_SEEN_NOTHING;
    }
}

// C ref: wizard.c:474 has_aggravatables(mon) — any live monster on the same
// side of the Wizard's tower barrier that is still waiting for the hero or is
// helpless.  In_W_tower is FALSE everywhere outside the tower, so the two
// barrier tests collapse; keep them written out for when the tower lands.
function has_aggravatables(mon) {
    const in_w_tower = In_W_tower(mon.mx, mon.my);
    if (in_w_tower !== In_W_tower(game.u?.ux, game.u?.uy)) return false;
    for (const mtmp of (game.level?.monsters || [])) {
        if (!mtmp || (mtmp.mhp | 0) < 1) continue;
        if (in_w_tower !== In_W_tower(mtmp.mx, mtmp.my)) continue;
        if (((mtmp.mstrategy | 0) & STRAT_WAITFORU) !== 0 || helpless(mtmp))
            return true;
    }
    return false;
}
function In_W_tower(_x, _y) { return false; }
// C ref: mon.c helpless(mon).
function helpless(mon) {
    return !!(mon.msleeping || !mon.mcanmove || (mon.mfrozen | 0) > 0);
}
