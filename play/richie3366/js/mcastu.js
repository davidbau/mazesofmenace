// mcastu.js — Monster spellcasting (partial).
// C ref: mcastu.c choose_monster_spell / castmu / mcast_spell /
//         is_undirected_spell / spell_would_be_useless.

import { game } from './gstate.js';
import { rn2, rnd, d } from './rng.js';
import { couldsee, cansee } from './vision.js';
import {
    M_ATTK_MISS, M_ATTK_HIT, MFAST,
    MCF_INDIRECT, MCF_SIGHT, MCF_HOSTILE,
    HEAD, EYE, TIMEOUT, DIED, KILLED_BY, A_DEX,
    MM_ANGRY, MM_NOMSG, Upolyd, ismnum, DETECT_MONSTERS,
    M_SEEN_MAGR, M_SEEN_FIRE, M_SEEN_ELEC, M_SEEN_REFL,
} from './const.js';
import { mon_adjust_speed } from './muse.js';
import {
    pline, verbalize, canspotmon, canseemon, impossible,
    You_feel, shieldeff, map_invisible, tp_sensemon,
} from './display.js';
import {
    Monnam, bogusmon, pmname, type_is_pname, Mgender,
} from './do_name.js';
import { nomul, You_hear, losehp } from './hack.js';
import { nasty, aggravate, clonewiz } from './wizard.js';
import {
    M1_SEE_INVIS, eyecount, nonliving, is_demon, mons,
} from './monsters.js';
import { body_part, rehumanize } from './polyself.js';
import {
    makeplural, makesingular, an, vtense, the_unique_pm,
} from './objnam.js';
import { upstart } from './hacklib.js';
import { mhe, monstseesu, monstunseesu } from './mondata.js';
import { acurr, losestr, minuhpmax, adjuhploss } from './attrib.js';
import { rndcurse } from './sit.js';
import { destroy_arm } from './do_wear.js';
import { make_stunned, make_confused } from './potion.js';
import { mon_set_minvis } from './worn.js';
import { destroy_items, flashburn } from './zap.js';
import { burnarmor, ignite_items } from './trap.js';
import { mkclass, makemon, set_malign } from './makemon.js';
import { monster_census } from './minion.js';
import { enexto } from './teleport.js';
import { setuhpmax } from './exper.js';
import { done, finish_losehp_done } from './end.js';
import { burn_away_slime } from './timeout.js';

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
function Half_physical_damage() {
    const u = game.u || {};
    return !!(u.HHalf_physical_damage || u.EHalf_physical_damage);
}
function Antimagic() {
    const u = game.u || {};
    return !!(u.Antimagic || u.HAntimagic || u.EAntimagic);
}
function Hallucination() {
    const u = game.u || {};
    return !!(u.Hallucination
        || ((u.HHallucination | 0) && !(u.Halluc_resistance | 0)));
}
function Fire_resistance() {
    const u = game.u || {};
    return !!(u.Fire_resistance || u.HFire_resistance || u.EFire_resistance);
}
function Shock_resistance() {
    const u = game.u || {};
    return !!(u.Shock_resistance || u.HShock_resistance || u.EShock_resistance);
}
function Free_action() {
    const u = game.u || {};
    return !!(u.Free_action || u.HFree_action || u.EFree_action);
}
function Stunned() {
    const u = game.u || {};
    return !!(((u.HStun | 0) & TIMEOUT) || u.Stunned);
}
function Confusion() {
    const u = game.u || {};
    return !!((u.HConfusion | 0) || u.Confusion);
}
function See_invisible() {
    const u = game.u || {};
    return !!((u.HSee_invisible | 0) || (u.ESee_invisible | 0) || u.See_invisible);
}
function Detect_monsters() {
    const u = game.u || {};
    const p = u.uprops?.[DETECT_MONSTERS];
    return !!((u.HDetect_monsters | 0) || (u.EDetect_monsters | 0)
        || u.Detect_monsters || (p?.intrinsic | 0) || (p?.extrinsic | 0));
}
function Deaf() {
    const u = game.u || {};
    return !!((u.HDeaf | 0) || (u.EDeaf | 0) || u.uroleplay?.deaf || u.Deaf);
}
function Unaware() {
    return !!(game.u?.Unaware);
}
function youmonst_victim() {
    return game.youmonst || { _youmonst: true };
}

// C ref: monattk.h
const AD_FIRE = 2;
const AD_ELEC = 6;

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
 */
async function mcast_psi_bolt(dmg) {
    const u = game.u || {};
    if (Antimagic()) {
        await shieldeff(u.ux, u.uy);
        monstseesu(M_SEEN_MAGR);
        dmg = Math.trunc((dmg + 1) / 2);
    } else {
        monstunseesu(M_SEEN_MAGR);
    }
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
    if (Antimagic()) {
        await shieldeff(u.ux, u.uy);
        monstseesu(M_SEEN_MAGR);
        dmg = Math.trunc((dmg + 1) / 2);
    } else {
        monstunseesu(M_SEEN_MAGR);
    }
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

/** C ref: mcastu.c death_inflicted_by */
function death_inflicted_by(deathreason, mtmp) {
    let out = deathreason;
    if (mtmp) {
        const mptr = mtmp.data;
        const champtr = ismnum(mtmp.cham) ? mons(mtmp.cham) : mptr;
        let realnm = pmname(champtr, Mgender(mtmp));
        const fakenm = pmname(mptr, Mgender(mtmp));
        if (!type_is_pname(champtr) && !the_unique_pm(mptr)) {
            realnm = an(realnm);
        }
        out += ` inflicted by ${the_unique_pm(mptr) ? 'the ' : ''}${realnm}`;
        if (ismnum(mtmp.cham) && (mtmp.cham | 0) !== (mptr?.mndx | 0)) {
            out += ` imitating ${an(fakenm)}`;
        }
    }
    return out;
}

/** C ref: mcastu.c touch_of_death */
export async function touch_of_death(mtmp) {
    const u = game.u || (game.u = {});
    const dmg0 = 50 + d(8, 6);
    const drain = Math.trunc(dmg0 / 2);
    await You_feel('drained...');
    const kbuf = death_inflicted_by('the touch of death', mtmp);

    if (Upolyd(u)) {
        u.mh = 0;
        await rehumanize();
    } else if (drain >= (u.uhpmax | 0)) {
        if (!game.killer) game.killer = { name: '', format: 0 };
        game.killer.format = KILLED_BY;
        game.killer.name = kbuf;
        await done(DIED);
        return;
    } else {
        const olduhp = u.uhp | 0;
        const uhpmin = minuhpmax(3);
        const newuhpmax = (u.uhpmax | 0) - drain;
        setuhpmax(Math.max(newuhpmax, uhpmin), false);
        const dmg = adjuhploss(dmg0, olduhp);
        losehp(dmg, kbuf, KILLED_BY);
        if (game._losehp_needs_done || game.program_state?.gameover) {
            await finish_losehp_done();
            return;
        }
    }
    if (!game.killer) game.killer = { name: '', format: 0 };
    game.killer.name = '';
}

/** C ref: mcastu.c mcast_death_touch */
async function mcast_death_touch(mtmp) {
    const u = game.u || {};
    await pline(`Oh no, ${mhe(mtmp)}'s using the touch of death!`);
    const yd = game.youmonst?.data;
    if (nonliving(yd) || is_demon(yd)) {
        await pline('You seem no deader than before.');
    } else if (!Antimagic() && rn2(mtmp.m_lev | 0) > 12) {
        if (Hallucination()) {
            await pline('You have an out of body experience.');
        } else {
            await touch_of_death(mtmp);
        }
        monstunseesu(M_SEEN_MAGR);
    } else {
        if (Antimagic()) {
            await shieldeff(u.ux, u.uy);
            monstseesu(M_SEEN_MAGR);
        }
        await pline("Lucky for you, it didn't work!");
    }
}

/** C ref: mcastu.c mcast_clone_wiz */
async function mcast_clone_wiz(mtmp) {
    if (mtmp.iswiz && ((game.context?.no_of_wizards | 0) === 1)) {
        await pline('Double Trouble...');
        clonewiz();
    } else {
        await impossible('bad wizard cloning?');
    }
}

/** C ref: mcastu.c mcast_destroy_armor */
async function mcast_destroy_armor() {
    const u = game.u || {};
    if (Antimagic()) {
        await shieldeff(u.ux, u.uy);
        monstseesu(M_SEEN_MAGR);
        await pline('A field of force surrounds you!');
    } else if (!await destroy_arm()) {
        await pline('Your skin itches.');
    } else {
        monstunseesu(M_SEEN_MAGR);
    }
}

/** C ref: mcastu.c mcast_weaken_you */
async function mcast_weaken_you(mtmp) {
    const u = game.u || {};
    if (Antimagic()) {
        await shieldeff(u.ux, u.uy);
        monstseesu(M_SEEN_MAGR);
        await You_feel('momentarily weakened.');
    } else {
        await pline('You suddenly feel weaker!');
        let dmg = (mtmp.m_lev | 0) - 6;
        if (dmg < 1) dmg = 1;
        if (Half_spell_damage()) dmg = Math.trunc((dmg + 1) / 2);
        const kbuf = death_inflicted_by('strength loss', mtmp);
        await losestr(rnd(dmg), kbuf, KILLED_BY);
        if (!game.killer) game.killer = { name: '', format: 0 };
        game.killer.name = '';
        monstunseesu(M_SEEN_MAGR);
    }
}

/** C ref: mcastu.c mcast_disappear */
async function mcast_disappear(mtmp) {
    if (!mtmp.minvis && !mtmp.invis_blkd) {
        if (canseemon(mtmp)) {
            await pline(`${Monnam(mtmp)} suddenly ${
                !See_invisible() ? 'disappears' : 'becomes transparent'}!`);
        }
        mon_set_minvis(mtmp, false);
        if (cansee(mtmp.mx | 0, mtmp.my | 0) && !canspotmon(mtmp)) {
            map_invisible(mtmp.mx | 0, mtmp.my | 0);
        }
    } else {
        await impossible('no reason for monster to cast disappear spell?');
    }
}

/** C ref: mcastu.c mcast_stun_you */
async function mcast_stun_you() {
    const u = game.u || {};
    if (Antimagic() || Free_action()) {
        await shieldeff(u.ux, u.uy);
        monstseesu(M_SEEN_MAGR);
        if (!Stunned()) await You_feel('momentarily disoriented.');
        await make_stunned(1, false);
    } else {
        await pline(Stunned() ? 'You struggle to keep your balance.' : 'You reel...');
        let dmg = d(acurr(A_DEX) < 12 ? 6 : 4, 4);
        if (Half_spell_damage()) dmg = Math.trunc((dmg + 1) / 2);
        await make_stunned(((u.HStun | 0) & TIMEOUT) + dmg, false);
        monstunseesu(M_SEEN_MAGR);
    }
}

/** C ref: mcastu.c mcast_geyser */
function mcast_geyser() {
    let dmg = d(8, 6);
    if (Half_physical_damage()) dmg = Math.trunc((dmg + 1) / 2);
    return dmg;
}

/** C ref: mcastu.c mcast_fire_pillar. Named: mon_spell_hits_spot. */
async function mcast_fire_pillar() {
    const u = game.u || {};
    await pline('A pillar of fire strikes all around you!');
    const orig_dmg = d(8, 6);
    let dmg = orig_dmg;
    if (Fire_resistance()) {
        await shieldeff(u.ux, u.uy);
        monstseesu(M_SEEN_FIRE);
        dmg = 0;
    } else {
        monstunseesu(M_SEEN_FIRE);
    }
    if (Half_spell_damage()) dmg = Math.trunc((dmg + 1) / 2);
    await burn_away_slime();
    await burnarmor(youmonst_victim());
    await destroy_items(youmonst_victim(), AD_FIRE, orig_dmg);
    await ignite_items(game.invent);
    return dmg;
}

/** C ref: mcastu.c mcast_lightning. Named: mon_spell_hits_spot. */
async function mcast_lightning() {
    const u = game.u || {};
    await pline('A bolt of lightning strikes down at you from above!');
    const { ureflects } = await import('./mhitu.js');
    const reflects = await ureflects('It bounces off your %s%s.', '');
    const orig_dmg = d(8, 6);
    let dmg = orig_dmg;
    if (reflects || Shock_resistance()) {
        await shieldeff(u.ux, u.uy);
        dmg = 0;
        if (reflects) {
            monstseesu(M_SEEN_REFL);
            return dmg;
        }
        monstunseesu(M_SEEN_REFL);
        monstseesu(M_SEEN_ELEC);
    } else {
        monstunseesu(M_SEEN_ELEC | M_SEEN_REFL);
    }
    if (Half_spell_damage()) dmg = Math.trunc((dmg + 1) / 2);
    await destroy_items(youmonst_victim(), AD_ELEC, orig_dmg);
    await flashburn(rnd(100), true);
    return dmg;
}

/** C ref: mcastu.c mcast_insects */
async function mcast_insects(mtmp) {
    let pm = mkclass('S_ANT', 0);
    const mlet = pm ? 'S_ANT' : 'S_SNAKE';
    let success = false;
    const oldseen = monster_census(true);
    let quan = ((mtmp.m_lev | 0) < 2) ? 1 : rnd(Math.trunc((mtmp.m_lev | 0) / 2));
    if (quan < 3) quan = 3;
    for (let i = 0; i <= quan; i++) {
        const bypos = { x: 0, y: 0 };
        if (!enexto(bypos, mtmp.mux | 0, mtmp.muy | 0, mtmp.data)) return;
        pm = mkclass(mlet, 0);
        const mtmp2 = pm
            ? makemon(pm, bypos.x, bypos.y, MM_ANGRY | MM_NOMSG)
            : null;
        if (mtmp2) {
            success = true;
            mtmp2.msleeping = mtmp2.mpeaceful = mtmp2.mtame = 0;
            set_malign(mtmp2);
        }
    }
    const newseen = monster_census(true);
    const seecaster = canseemon(mtmp) || tp_sensemon(mtmp) || Detect_monsters();
    let what = (mlet === 'S_SNAKE') ? 'snakes' : 'insects';
    if (Hallucination()) what = makeplural(bogusmon());

    if (!seecaster) {
        if (newseen <= oldseen || Unaware()) {
            await You_hear(`someone summoning ${what}.`);
        } else {
            const arg = (newseen === oldseen + 1)
                ? an(makesingular(what))
                : what;
            if (!Deaf()) {
                await You_hear(`someone summoning something, and ${arg} ${vtense(arg, 'appear')}.`);
            } else {
                await pline(`${upstart(arg)} ${vtense(arg, 'appear')}.`);
            }
        }
        return;
    }
    const u = game.u || {};
    const Invis = !!(u.Invis || u.HInvis || u.EInvis);
    const Displaced = !!(u.Displaced || u.HDisplaced || u.EDisplaced);
    const who = Monnam(mtmp);
    if (!success) {
        await pline(`${who} casts at a clump of sticks, but nothing happens.`);
    } else if (mlet === 'S_SNAKE') {
        await pline(`${who} transforms a clump of sticks into ${what}!`);
    } else if (Invis && !perceives(mtmp.data)
        && ((mtmp.mux | 0) !== (u.ux | 0) || (mtmp.muy | 0) !== (u.uy | 0))) {
        await pline(`${who} summons ${what} around a spot near you!`);
    } else if (Displaced
        && ((mtmp.mux | 0) !== (u.ux | 0) || (mtmp.muy | 0) !== (u.uy | 0))) {
        await pline(`${who} summons ${what} around your displaced image!`);
    } else {
        await pline(`${who} summons ${what}!`);
    }
}

/** C ref: mcastu.c mcast_paralyze */
async function mcast_paralyze(mtmp) {
    const u = game.u || {};
    let dmg = 0;
    if (Antimagic() || Free_action()) {
        await shieldeff(u.ux, u.uy);
        monstseesu(M_SEEN_MAGR);
        if ((game.multi | 0) >= 0) await pline('You stiffen briefly.');
        dmg = 1;
    } else {
        if ((game.multi | 0) >= 0) await pline('You are frozen in place!');
        dmg = 4 + (mtmp.m_lev | 0);
        if (Half_spell_damage()) dmg = Math.trunc((dmg + 1) / 2);
        monstunseesu(M_SEEN_MAGR);
    }
    nomul(-dmg);
    game.multi_reason = 'paralyzed by a monster';
    game.nomovemsg = null;
    return dmg;
}

/** C ref: mcastu.c mcast_confuse_you */
async function mcast_confuse_you(mtmp) {
    const u = game.u || {};
    if (Antimagic()) {
        await shieldeff(u.ux, u.uy);
        monstseesu(M_SEEN_MAGR);
        await You_feel('momentarily dizzy.');
    } else {
        const oldprop = !!Confusion();
        let dmg = mtmp.m_lev | 0;
        if (Half_spell_damage()) dmg = Math.trunc((dmg + 1) / 2);
        await make_confused((u.HConfusion | 0) + dmg, true);
        if (Hallucination()) {
            await You_feel(`${oldprop ? 'trippier' : 'trippy'}!`);
        } else {
            await You_feel(`${oldprop ? 'more ' : ''}confused!`);
        }
        monstunseesu(M_SEEN_MAGR);
    }
}

/** C ref: mcastu.c m_cure_self — looks-better pline + healmon d(3,6). */
async function m_cure_self(mtmp, dmg) {
    if ((mtmp.mhp | 0) < (mtmp.mhpmax | 0)) {
        if (canseemon(mtmp)) {
            await pline(`${Monnam(mtmp)} looks better.`);
        }
        mtmp.mhp = Math.min((mtmp.mhpmax | 0), (mtmp.mhp | 0) + d(3, 6));
        dmg = 0;
    }
    return dmg;
}

/** C ref: mcastu.c mcast_spell. Named: mon_spell_hits_spot. */
async function mcast_spell(mtmp, dmg, spellnum) {
    if (dmg < 0) {
        await impossible(`monster cast spell (${spellnum}) with negative dmg (${dmg})?`);
        return;
    }
    if (dmg === 0 && !is_undirected_spell(spellnum)) {
        await impossible(`cast directed wizard spell (${spellnum}) with dmg=0?`);
        return;
    }

    switch (spellnum) {
    case MCAST_DEATH_TOUCH:
        await mcast_death_touch(mtmp); dmg = 0; break;
    case MCAST_CLONE_WIZ:
        await mcast_clone_wiz(mtmp); dmg = 0; break;
    case MCAST_SUMMON_MONS:
        await mcast_summon_mons(mtmp); dmg = 0; break;
    case MCAST_AGGRAVATION:
        await You_feel('that monsters are aware of your presence.');
        aggravate(); dmg = 0; break;
    case MCAST_CURSE_ITEMS:
        await You_feel('as if you need some help.');
        await rndcurse(); dmg = 0; break;
    case MCAST_DESTRY_ARMR:
        await mcast_destroy_armor(); dmg = 0; break;
    case MCAST_WEAKEN_YOU:
        await mcast_weaken_you(mtmp); dmg = 0; break;
    case MCAST_DISAPPEAR:
        await mcast_disappear(mtmp); dmg = 0; break;
    case MCAST_STUN_YOU:
        await mcast_stun_you(); dmg = 0; break;
    case MCAST_HASTE_SELF:
        await mon_adjust_speed(mtmp, 1, null); dmg = 0; break;
    case MCAST_CURE_SELF:
        dmg = await m_cure_self(mtmp, dmg); break;
    case MCAST_PSI_BOLT:
        dmg = await mcast_psi_bolt(dmg); break;
    case MCAST_GEYSER:
        await pline('A sudden geyser slams into you from nowhere!');
        dmg = mcast_geyser(); break;
    case MCAST_FIRE_PILLAR:
        dmg = await mcast_fire_pillar(); break;
    case MCAST_LIGHTNING:
        dmg = await mcast_lightning(); break;
    case MCAST_INSECTS:
        await mcast_insects(mtmp); dmg = 0; break;
    case MCAST_BLIND_YOU:
        await mcast_blind_you(); dmg = 0; break;
    case MCAST_PARALYZE:
        dmg = await mcast_paralyze(mtmp); break;
    case MCAST_CONFUSE_YOU:
        await mcast_confuse_you(mtmp); dmg = 0; break;
    case MCAST_OPEN_WOUNDS:
        dmg = await mcast_open_wounds(dmg); break;
    default:
        await impossible(`mcastu: invalid magic spell (${spellnum})`);
        dmg = 0; break;
    }

    if (dmg) {
        const { mdamageu } = await import('./mhitu.js');
        await mdamageu(mtmp, dmg);
    }
}

/**
 * C ref: mcastu.c castmu — spell selection + undirected early-out.
 * mcast_spell owns all 20 arms (D-0928 #1191 cast pline before effects).
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

    // C ref: mcastu.c castmu — damage dice then Half_spell_damage, then
    // mcast_spell (which mdamageu's leftover dmg and zeros it here).
    let dmg = 0;
    if (!foundyou) {
        dmg = 0;
        if (adtyp !== AD_SPEL && adtyp !== AD_CLRC) {
            await impossible(`${Monnam(mtmp)} casting non-hand-to-hand version of hand-to-hand spell ${adtyp}?`);
            return M_ATTK_MISS;
        }
    } else if (mattk?.damd) {
        dmg = d(Math.trunc(ml / 2) + (mattk.damn | 0), mattk.damd | 0);
    } else {
        dmg = d(Math.trunc(ml / 2) + 1, 6);
    }
    if (Half_spell_damage()) dmg = Math.trunc((dmg + 1) / 2);

    if (adtyp === AD_SPEL || adtyp === AD_CLRC) {
        await mcast_spell(mtmp, dmg, spellnum);
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
