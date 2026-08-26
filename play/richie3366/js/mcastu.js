// mcastu.js — Monster spellcasting (partial).
// C ref: mcastu.c choose_monster_spell / castmu / is_undirected_spell /
//         spell_would_be_useless.

import { game } from './gstate.js';
import { rn2, d } from './rng.js';
import { couldsee } from './vision.js';
import {
    M_ATTK_MISS, M_ATTK_HIT, MFAST,
    MCF_INDIRECT, MCF_SIGHT, MCF_HOSTILE,
    HEAD, EYE,
} from './const.js';
import { mon_adjust_speed } from './muse.js';
import { pline, verbalize, canspotmon, impossible } from './display.js';
import { Monnam } from './do_name.js';
import { nomul } from './hack.js';
import { nasty } from './wizard.js';
import { M1_SEE_INVIS, eyecount } from './monsters.js';
import { body_part } from './polyself.js';
import { makeplural } from './objnam.js';

/** C ref: mondata.h perceives — M1_SEE_INVIS. */
function perceives(ptr) {
    return ((ptr?.mflags1 | 0) & M1_SEE_INVIS) !== 0;
}

/** C youprop.h Blinded — HBlinded && !BBlinded (not Blindfolded/EBlinded). */
function Blinded() {
    const u = game.u || {};
    return ((u.HBlinded | 0) && !(u.BBlinded | 0)) ? 1 : 0;
}

/** C youprop.h Blind — (HBlinded || EBlinded) && !BBlinded. */
function Blind() {
    const u = game.u || {};
    return !!(((u.HBlinded | 0) || (u.EBlinded | 0)) && !(u.BBlinded | 0));
}

/** C youprop.h Half_spell_damage — H || E (this spell's 100 vs 200 only). */
function Half_spell_damage() {
    const u = game.u || {};
    return !!(u.HHalf_spell_damage || u.EHalf_spell_damage);
}

// C ref: mcastu.h MONSPELL — unified spell ids
export const MCAST_PSI_BOLT = 0;
export const MCAST_OPEN_WOUNDS = 1;
export const MCAST_CURE_SELF = 2;
export const MCAST_HASTE_SELF = 3;
export const MCAST_CONFUSE_YOU = 4;
export const MCAST_STUN_YOU = 5;
export const MCAST_DISAPPEAR = 6;
export const MCAST_PARALYZE = 7;
export const MCAST_BLIND_YOU = 8;
export const MCAST_WEAKEN_YOU = 9;
export const MCAST_DESTRY_ARMR = 10;
export const MCAST_INSECTS = 11;
export const MCAST_CURSE_ITEMS = 12;
export const MCAST_LIGHTNING = 13;
export const MCAST_FIRE_PILLAR = 14;
export const MCAST_GEYSER = 15;
export const MCAST_AGGRAVATION = 16;
export const MCAST_SUMMON_MONS = 17;
export const MCAST_CLONE_WIZ = 18;
export const MCAST_DEATH_TOUCH = 19;

// C ref: mcastu.c mcast_data[] from mcastu.h
const mcast_data = [
    { level: 0, flags: MCF_HOSTILE | MCF_SIGHT }, // PSI_BOLT
    { level: 0, flags: MCF_HOSTILE | MCF_SIGHT }, // OPEN_WOUNDS
    { level: 1, flags: MCF_INDIRECT }, // CURE_SELF
    { level: 2, flags: MCF_INDIRECT }, // HASTE_SELF
    { level: 2, flags: MCF_HOSTILE | MCF_SIGHT }, // CONFUSE_YOU
    { level: 3, flags: MCF_HOSTILE | MCF_SIGHT }, // STUN_YOU
    { level: 4, flags: MCF_INDIRECT }, // DISAPPEAR
    { level: 4, flags: MCF_HOSTILE | MCF_SIGHT }, // PARALYZE
    { level: 6, flags: MCF_HOSTILE | MCF_SIGHT }, // BLIND_YOU
    { level: 6, flags: MCF_HOSTILE | MCF_SIGHT }, // WEAKEN_YOU
    { level: 8, flags: MCF_HOSTILE | MCF_SIGHT }, // DESTRY_ARMR
    { level: 8, flags: MCF_HOSTILE | MCF_INDIRECT | MCF_SIGHT }, // INSECTS
    { level: 10, flags: MCF_HOSTILE | MCF_SIGHT }, // CURSE_ITEMS
    { level: 11, flags: MCF_HOSTILE | MCF_SIGHT }, // LIGHTNING
    { level: 12, flags: MCF_HOSTILE | MCF_SIGHT }, // FIRE_PILLAR
    { level: 13, flags: MCF_HOSTILE | MCF_SIGHT }, // GEYSER
    { level: 13, flags: MCF_INDIRECT | MCF_HOSTILE | MCF_SIGHT }, // AGGRAVATION
    { level: 15, flags: MCF_HOSTILE | MCF_INDIRECT | MCF_SIGHT }, // SUMMON_MONS
    { level: 18, flags: MCF_HOSTILE | MCF_INDIRECT | MCF_SIGHT }, // CLONE_WIZ
    { level: 20, flags: MCF_HOSTILE | MCF_SIGHT }, // DEATH_TOUCH
];

// C ref: mcastu.c mon_cleric_spells / mon_wizard_spells
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

// C ref: monattk.h
const AD_SPEL = 241;
const AD_CLRC = 240;

/** C ref: mcastu.c is_undirected_spell */
function is_undirected_spell(spellnum) {
    return ((mcast_data[spellnum]?.flags | 0) & MCF_INDIRECT) !== 0;
}

/**
 * C ref: mcastu.c spell_would_be_useless — RNG arms for DEATH_TOUCH /
 * GEYSER / AGGRAVATION preserved. has_aggravatables deferred → treat as
 * none (AGGRAVATION almost always useless via rn2(100)).
 */
function spell_would_be_useless(mtmp, spellnum) {
    const flags = mcast_data[spellnum]?.flags | 0;
    if ((flags & MCF_HOSTILE) !== 0 && mtmp.mpeaceful) return true;
    if ((flags & MCF_SIGHT) !== 0 && !couldsee(mtmp.mx, mtmp.my)) return true;

    const u = game.u || {};
    switch (spellnum) {
    case MCAST_DEATH_TOUCH: {
        const Antimagic = !!(u.Antimagic || u.HAntimagic || u.EAntimagic);
        const Hallucination = !!(u.Hallucination
            || ((u.HHallucination | 0) && !(u.Halluc_resistance | 0)));
        if ((Antimagic || Hallucination) && !rn2(2)) return true;
        break;
    }
    case MCAST_GEYSER:
        if (!rn2(5)) return true;
        break;
    case MCAST_CLONE_WIZ:
        if (!mtmp.iswiz || ((game.context?.no_of_wizards | 0) > 1)) return true;
        break;
    case MCAST_AGGRAVATION:
        // has_aggravatables deferred → always the "nothing to wake" arm
        return rn2(100) ? true : false;
    case MCAST_HASTE_SELF:
        if ((mtmp.permspeed | 0) === MFAST) return true;
        break;
    case MCAST_DISAPPEAR: {
        if (mtmp.minvis || mtmp.invis_blkd) return true;
        const See_invisible = !!((u.HSee_invisible | 0)
            || (u.ESee_invisible | 0) || u.See_invisible);
        if (mtmp.mpeaceful && !See_invisible) return true;
        break;
    }
    case MCAST_CURE_SELF:
        if ((mtmp.mhp | 0) === (mtmp.mhpmax | 0)) return true;
        break;
    case MCAST_BLIND_YOU:
        // C youprop.h Blinded — HBlinded && !BBlinded (not EBlinded)
        if (Blinded()) return true;
        break;
    default:
        break;
    }
    return false;
}

/**
 * C ref: mcastu.c choose_monster_spell — rn2(m_lev) then optional
 * rn2(maxlev)/rn2(maxlev) clamp; highest non-useless ≤ spellval.
 */
function choose_monster_spell(mtmp, adtyp) {
    let list = null;
    if (adtyp === AD_SPEL) list = mon_wizard_spells;
    else if (adtyp === AD_CLRC) list = mon_cleric_spells;
    if (!list || list.length < 1) return MCAST_PSI_BOLT;

    const maxlev = mcast_data[list[list.length - 1]].level;
    let spellval = rn2(mtmp.m_lev | 0);
    if (spellval > maxlev && rn2(maxlev)) spellval = rn2(maxlev);

    for (let i = list.length - 1; i >= 0; i--) {
        const sp = list[i];
        if (mcast_data[sp].level <= spellval
            && !spell_would_be_useless(mtmp, sp)) {
            return sp;
        }
    }
    return list[0];
}

/**
 * C ref: mcastu.c mcast_psi_bolt — Antimagic halves dmg; severity pline;
 * then caller mdamageu. body_part(HEAD) via polyself.c (not a local clone).
 * monstunseesu / monstseesu / shieldeff deferred.
 */
async function mcast_psi_bolt(dmg) {
    const u = game.u || {};
    const Antimagic = !!(u.Antimagic || u.HAntimagic || u.EAntimagic);
    if (Antimagic) dmg = Math.trunc((dmg + 1) / 2);
    dmg = dmg | 0;
    const head = body_part(HEAD);
    if (dmg <= 5) await pline(`You get a slight ${head}ache.`);
    else if (dmg <= 10) await pline('Your brain is on fire!');
    else if (dmg <= 20) {
        await pline(`Your ${head} suddenly aches painfully!`);
    } else {
        await pline(`Your ${head} suddenly aches very painfully!`);
    }
    return dmg;
}

/**
 * C ref: mcastu.c mcast_blind_you — resists_blnd does not apply.
 * Scales cover body_part(EYE); make_blinded(200L or 100L); Eyes
 * leave Blind false so Your1(vision_clears).
 */
async function mcast_blind_you() {
    if (!Blinded()) {
        const num_eyes = eyecount(game.youmonst?.data);
        const eye = body_part(EYE);
        const what = (num_eyes === 1) ? eye : makeplural(eye);
        await pline(`Scales cover your ${what}!`);
        const { make_blinded } = await import('./do.js');
        await make_blinded(Half_spell_damage() ? 100 : 200, false);
        if (!Blind()) {
            await pline('Your vision clears.');
        }
    } else {
        await impossible('no reason for monster to cast blindness spell?');
    }
}

/**
 * C ref: mcastu.c mcast_open_wounds — Antimagic halves; severity pline.
 */
async function mcast_open_wounds(dmg) {
    const u = game.u || {};
    const Antimagic = !!(u.Antimagic || u.HAntimagic || u.EAntimagic);
    if (Antimagic) dmg = Math.trunc((dmg + 1) / 2);
    dmg = dmg | 0;
    if (dmg <= 5) await pline('Your skin itches badly for a moment.');
    else if (dmg <= 10) await pline('Wounds appear on your body!');
    else if (dmg <= 20) await pline('Severe wounds appear on your body!');
    else await pline('Your body is covered with painful wounds!');
    return dmg;
}

/**
 * C ref: mcastu.c mcast_summon_mons — nasty(mtmp) + appear plines.
 * Named omissions: SetVoice; Blind/Deaf polish on appear wording.
 */
async function mcast_summon_mons(mtmp) {
    const count = await nasty(mtmp);
    if (!count) {
        // nothing created
    } else if (mtmp.iswiz) {
        const plur = count === 1 ? '' : 's';
        await verbalize(`Destroy the thief, my pet${plur}!`);
    } else {
        const one = count === 1;
        const mappear = one ? 'A monster appears' : 'Monsters appear';
        const u = game.u || {};
        const Invis = !!(u.Invis || u.HInvis || u.EInvis);
        const Displaced = !!(u.Displaced || u.HDisplaced || u.EDisplaced);
        if (Invis && !perceives(mtmp.data)
            && ((mtmp.mux | 0) !== (u.ux | 0) || (mtmp.muy | 0) !== (u.uy | 0))) {
            await pline(`${mappear} ${one ? 'at' : 'around'} a spot near you!`);
        } else if (Displaced
            && ((mtmp.mux | 0) !== (u.ux | 0) || (mtmp.muy | 0) !== (u.uy | 0))) {
            await pline(`${mappear} ${one ? 'by' : 'around'} your displaced image!`);
        } else {
            await pline(`${mappear} from nowhere!`);
        }
    }
}

/**
 * C ref: mcastu.c castmu — spell selection + undirected early-out for
 * dochug non-attack cast. Burns mspec_used + fumble rn2; pline cast
 * before mcast_spell (D-0928 #1191); applies HASTE_SELF / CURE_SELF /
 * PSI_BOLT / OPEN_WOUNDS / SUMMON_MONS / BLIND_YOU. Other mcast_spell
 * bodies deferred.
 *
 * @param {object} mtmp
 * @param {{ adtyp: number }} mattk
 * @param {boolean} thinks_it_foundyou
 * @param {boolean} foundyou
 */
export async function castmu(mtmp, mattk, thinks_it_foundyou, foundyou) {
    const ml = mtmp.m_lev | 0;
    let spellnum = 0;
    const adtyp = mattk?.adtyp | 0;

    if ((adtyp === AD_SPEL || adtyp === AD_CLRC) && ml) {
        let cnt = 40;
        do {
            spellnum = choose_monster_spell(mtmp, adtyp);
            if (!thinks_it_foundyou) {
                if (!is_undirected_spell(spellnum)
                    || spell_would_be_useless(mtmp, spellnum)) {
                    return M_ATTK_MISS;
                }
                break;
            }
        } while (--cnt > 0 && spell_would_be_useless(mtmp, spellnum));
        if (cnt === 0) return M_ATTK_MISS;
    }

    // Unable to cast — cursetxt deferred (may burn rn2(4) when !canseemon)
    if (mtmp.mcan || mtmp.mspec_used || !ml) {
        return M_ATTK_MISS;
    }
    // m_seenres(cvt_adtyp…) — AD_SPEL/CLRC map to M_SEEN_NOTHING in C

    if (adtyp === AD_SPEL || adtyp === AD_CLRC) {
        mtmp.mspec_used = (ml < 8) ? (10 - ml) : 2;
    }

    // C: mis-aimed directed spell pline then miss (waterwall wording deferred)
    if (!foundyou && thinks_it_foundyou && !is_undirected_spell(spellnum)) {
        const who = canspotmon(mtmp) ? Monnam(mtmp) : 'Something';
        await pline(`${who} casts a spell at thin air!`);
        return M_ATTK_MISS;
    }

    // C: nomul(0) then fumble rn2(ml*10); air-crackles pline deferred
    nomul(0);
    if (rn2(ml * 10) < (mtmp.mconf ? 100 : 20)) {
        return M_ATTK_MISS;
    }

    // C: canspotmon || !undirected → "%s casts a spell%s!" before effects
    // (More may fire here so PSI_BOLT/mdamageu/rehumanize wait for key)
    if (canspotmon(mtmp) || !is_undirected_spell(spellnum)) {
        const who = canspotmon(mtmp) ? Monnam(mtmp) : 'Something';
        let where = '';
        if (!is_undirected_spell(spellnum)) {
            const u = game.u || {};
            const Invis = !!(u.Invis || u.HInvis || u.EInvis);
            const Displaced = !!(u.Displaced || u.HDisplaced || u.EDisplaced);
            const atHero = ((mtmp.mux | 0) === (u.ux | 0)
                && (mtmp.muy | 0) === (u.uy | 0));
            if (Invis && !perceives(mtmp.data) && !atHero) {
                where = ' at a spot near you';
            } else if (Displaced && !atHero) {
                where = ' at your displaced image';
            } else {
                where = ' at you';
            }
        }
        await pline(`${who} casts a spell${where}!`);
    }

    // C ref: mcastu.c castmu — damage dice before mcast_spell (even when
    // spell bodies deferred). foundyou + damd → d((ml/2)+damn, damd);
    // else d((ml/2)+1, 6). Half_spell_damage deferred.
    let dmg = 0;
    if (foundyou) {
        const damn = mattk?.damn | 0;
        const damd = mattk?.damd | 0;
        if (damd) dmg = d(Math.trunc(ml / 2) + damn, damd);
        else dmg = d(Math.trunc(ml / 2) + 1, 6);
    }

    // C ref: mcastu.c mcast_spell — undirected HASTE/CURE/SUMMON + directed
    // PSI_BOLT/OPEN_WOUNDS (pline then mdamageu) + BLIND_YOU. Other
    // spell bodies deferred.
    if (adtyp === AD_SPEL || adtyp === AD_CLRC) {
        switch (spellnum) {
        case MCAST_HASTE_SELF:
            // C: mon_adjust_speed(mtmp, 1, NULL) — permspeed/mspeed MFAST
            await mon_adjust_speed(mtmp, 1, null);
            dmg = 0;
            break;
        case MCAST_CURE_SELF:
            // C: m_cure_self — healmon(mtmp, d(3,6), 0) when wounded
            if ((mtmp.mhp | 0) < (mtmp.mhpmax | 0)) {
                mtmp.mhp = Math.min(
                    (mtmp.mhpmax | 0),
                    (mtmp.mhp | 0) + d(3, 6),
                );
            }
            dmg = 0;
            break;
        case MCAST_SUMMON_MONS:
            // C: mcast_summon_mons → nasty(mtmp)
            await mcast_summon_mons(mtmp);
            dmg = 0;
            break;
        case MCAST_PSI_BOLT:
            // C: mcast_psi_bolt — Antimagic halves + severity pline; mdamageu
            dmg = await mcast_psi_bolt(dmg);
            break;
        case MCAST_OPEN_WOUNDS:
            // C: mcast_open_wounds — Antimagic halves + severity pline
            dmg = await mcast_open_wounds(dmg);
            break;
        case MCAST_BLIND_YOU:
            // C: mcast_blind_you — EYE scales + make_blinded; dmg = 0
            await mcast_blind_you();
            dmg = 0;
            break;
        default:
            // Named omission: other mcast_spell cases (dmg zeroed in C)
            dmg = 0;
            break;
        }
        if (dmg) {
            // Lazy import avoids mhitu ↔ mcastu cycle (mhitu calls castmu)
            const { mdamageu } = await import('./mhitu.js');
            await mdamageu(mtmp, dmg);
        }
    }

    return M_ATTK_HIT;
}

/**
 * C ref: mcastu.c buzzmu — ranged AT_MAGC. AD_SPEL/CLRC fail BZ_VALID_ADTYP
 * (no RNG). Real zap path (lined_up rn2(3) + buzz) deferred.
 */
export async function buzzmu(mtmp, mattk) {
    const adtyp = mattk?.adtyp | 0;
    // C: BZ_VALID_ADTYP — AD_MAGM..AD_SPC2; SPEL/CLRC are outside
    const AD_MAGM = 1;
    const AD_SPC2 = 10; // approximate upper; SPEL/CLRC (240+) miss this
    if (adtyp < AD_MAGM || adtyp > AD_SPC2) return M_ATTK_MISS;
    // Named omission: mcan/m_seenres cursetxt; lined_up rn2(3)+buzz
    void mtmp;
    return M_ATTK_MISS;
}

export { AD_SPEL, AD_CLRC, is_undirected_spell, choose_monster_spell,
    mcast_blind_you };
