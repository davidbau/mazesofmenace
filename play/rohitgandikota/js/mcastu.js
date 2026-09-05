// mcastu.js: monster spell selection and casting.
// C ref: src/mcastu.c

import { ureflects } from './muse.js';
import { is_waterwall } from './dbridge.js';
import { genders } from './role_data.js';
import { mdamageu } from './mhitu.js';
import { monster_census } from './minion.js';
import { enexto } from './teleport.js';
import { mkclass, makemon, set_malign } from './makemon.js';
import { destroy_items, flashburn, mon_spell_hits_spot } from './zap.js';
import { burnarmor, ignite_items } from './trap.js';
import { burn_away_slime } from './timeout.js';
import { make_stunned, make_blinded, make_confused } from './potion.js';
import { mon_set_minvis, mon_adjust_speed } from './worn.js';
import { destroy_arm } from './do_wear.js';
import { rndcurse } from './sit.js';
import { clonewiz, nasty, aggravate } from './wizard.js';
import { the_unique_pm, an, makeplural, makesingular, vtense } from './objnam.js';
import { pmname, bogusmon, upstart } from './do_name.js';
import { rehumanize } from './polyself.js';
import { done } from './end.js';
import { losehp } from './hack.js';
import { setuhpmax } from './exper.js';
import { minuhpmax, adjuhploss, losestr, ACURR } from './attrib.js';
import { healmon } from './mon.js';
import { monstseesu, monstunseesu, nonliving, is_demon, type_is_pname, pronoun_gender, eyecount } from './mondata.js';
import { Antimagic, Free_action, Fire_resistance, Cold_resistance, Shock_resistance, Unaware, Blind } from './youprop.js';
import { pline_mon, verbalize, pline_The, set_msg_xy, You_feel } from './pline.js';
import { MONSYMS } from './monst_data.js';
import { KILLED_BY, DIED, EYE, A_DEX, TIMEOUT, MM_ANGRY, MM_NOMSG, PRONOUN_HALLU, ismnum, Mgender, Upolyd, plur, u_at, M_SEEN_REFL } from './const.js';
import { rnd } from './rng.js';
import { game } from './gstate.js';
import { rn2, d } from './rng.js';
import { ATTKS } from './monst_data.js';
import { M_ATTK_MISS, M_ATTK_HIT, MFAST, STRAT_WAITFORU, HEAD,
         M_SEEN_MAGR, M_SEEN_FIRE, M_SEEN_COLD, M_SEEN_SLEEP,
         M_SEEN_DISINT, M_SEEN_ELEC, M_SEEN_POISON,
         M_SEEN_ACID, BZ_OFS_AD } from './const.js';
import { canspotmon, canseemon, map_invisible,
         pline, shieldeff, tp_sensemon } from './display.js';
import { cansee, couldsee } from './vision.js';
import { Monnam, mon_nam } from './do_name.js';
import { You, You_hear, Your } from './pline.js';
import { Hallucination, See_invisible, Invis, Deaf } from './youprop.js';
import { perceives } from './mondata.js';
import { body_part } from './polyself.js';
import { helpless } from './monst.js';
import { nomul } from './hack.js';
import { sgn } from './hacklib.js';

const MCF_INDIRECT = 0x01;
const MCF_SIGHT = 0x02;
const MCF_HOSTILE = 0x04;

const MCAST_PSI_BOLT = 0;
const MCAST_OPEN_WOUNDS = 1;
const MCAST_CURE_SELF = 2;
const MCAST_HASTE_SELF = 3;
const MCAST_CONFUSE_YOU = 4;
const MCAST_STUN_YOU = 5;
const MCAST_DISAPPEAR = 6;
const MCAST_PARALYZE = 7;
const MCAST_BLIND_YOU = 8;
const MCAST_WEAKEN_YOU = 9;
const MCAST_DESTRY_ARMR = 10;
const MCAST_INSECTS = 11;
const MCAST_CURSE_ITEMS = 12;
const MCAST_LIGHTNING = 13;
const MCAST_FIRE_PILLAR = 14;
const MCAST_GEYSER = 15;
const MCAST_AGGRAVATION = 16;
const MCAST_SUMMON_MONS = 17;
const MCAST_CLONE_WIZ = 18;
const MCAST_DEATH_TOUCH = 19;

const MCAST_DATA = [
    [0, MCF_HOSTILE | MCF_SIGHT],
    [0, MCF_HOSTILE | MCF_SIGHT],
    [1, MCF_INDIRECT],
    [2, MCF_INDIRECT],
    [2, MCF_HOSTILE | MCF_SIGHT],
    [3, MCF_HOSTILE | MCF_SIGHT],
    [4, MCF_INDIRECT],
    [4, MCF_HOSTILE | MCF_SIGHT],
    [6, MCF_HOSTILE | MCF_SIGHT],
    [6, MCF_HOSTILE | MCF_SIGHT],
    [8, MCF_HOSTILE | MCF_SIGHT],
    [8, MCF_HOSTILE | MCF_INDIRECT | MCF_SIGHT],
    [10, MCF_HOSTILE | MCF_SIGHT],
    [11, MCF_HOSTILE | MCF_SIGHT],
    [12, MCF_HOSTILE | MCF_SIGHT],
    [13, MCF_HOSTILE | MCF_SIGHT],
    [13, MCF_INDIRECT | MCF_HOSTILE | MCF_SIGHT],
    [15, MCF_HOSTILE | MCF_INDIRECT | MCF_SIGHT],
    [18, MCF_HOSTILE | MCF_INDIRECT | MCF_SIGHT],
    [20, MCF_HOSTILE | MCF_SIGHT],
];

const WIZARD_SPELLS = [
    MCAST_PSI_BOLT, MCAST_CURE_SELF, MCAST_HASTE_SELF, MCAST_STUN_YOU,
    MCAST_DISAPPEAR, MCAST_WEAKEN_YOU, MCAST_DESTRY_ARMR,
    MCAST_CURSE_ITEMS, MCAST_AGGRAVATION, MCAST_SUMMON_MONS,
    MCAST_CLONE_WIZ, MCAST_DEATH_TOUCH,
];
const CLERIC_SPELLS = [
    MCAST_OPEN_WOUNDS, MCAST_CURE_SELF, MCAST_CONFUSE_YOU,
    MCAST_PARALYZE, MCAST_BLIND_YOU, MCAST_INSECTS, MCAST_CURSE_ITEMS,
    MCAST_LIGHTNING, MCAST_FIRE_PILLAR, MCAST_GEYSER,
];

/* include/youprop.h property macros: HFoo lives in u.intrinsic, EFoo in
   u.uprops (see js/insight.js for the name table) */
const antimagic = () => Antimagic();
const half_spell_damage = () => !!(game.u.intrinsic?.HHalf_spell_damage
                                   || game.u.uprops?.HALF_SPDAM);
const half_physical_damage = () => !!(game.u.intrinsic?.HHalf_physical_damage
                                      || game.u.uprops?.HALF_PHDAM);
const displaced = () => !!(game.u.intrinsic?.HDisplaced
                           || game.u.uprops?.DISPLACED);
const detect_monsters = () => !!(game.u.intrinsic?.HDetect_monsters
                                 || game.u.uprops?.DETECT_MONSTERS);
const stunned = () => !!(game.u.intrinsic?.HStun || game.u.uprops?.STUNNED);
const confusion = () => !!(game.u.intrinsic?.HConfusion
                           || game.u.uprops?.CONFUSION);
const blinded = () => !!game.u.intrinsic?.HBlinded && !game.u.blocked?.BLINDED;
// include/you.h:322 mhe()
const mhe = (mtmp) => genders[pronoun_gender(mtmp, PRONOUN_HALLU)].he;
const is_undirected_spell = (spellnum) =>
    !!(MCAST_DATA[spellnum][1] & MCF_INDIRECT);

function has_aggravatables() {
    return (game.level?.monsters || []).some(mon =>
        mon.mhp > 0
        && ((mon.mstrategy & STRAT_WAITFORU) || helpless(mon)));
}

function spell_would_be_useless(mtmp, spellnum) {
    const flags = MCAST_DATA[spellnum][1];
    if ((flags & MCF_HOSTILE) && mtmp.mpeaceful)
        return true;
    if ((flags & MCF_SIGHT) && !couldsee(mtmp.mx, mtmp.my))
        return true;

    switch (spellnum) {
    case MCAST_DEATH_TOUCH:
        return (antimagic() || Hallucination()) && !rn2(2);
    case MCAST_GEYSER:
        return !rn2(5);
    case MCAST_CLONE_WIZ:
        return !mtmp.iswiz || (game.context?.no_of_wizards ?? 0) > 1;
    case MCAST_AGGRAVATION:
        return !has_aggravatables() && !!rn2(100);
    case MCAST_HASTE_SELF:
        return mtmp.permspeed === MFAST;
    case MCAST_DISAPPEAR:
        return !!(mtmp.minvis || mtmp.invis_blkd
                   || (mtmp.mpeaceful && !See_invisible()));
    case MCAST_CURE_SELF:
        return mtmp.mhp === mtmp.mhpmax;
    case MCAST_BLIND_YOU:
        return !!game.u.ublind;
    default:
        return false;
    }
}

function choose_monster_spell(mtmp, adtyp) {
    const list = adtyp === ATTKS.AD_SPEL ? WIZARD_SPELLS
               : adtyp === ATTKS.AD_CLRC ? CLERIC_SPELLS : null;
    if (!list)
        return MCAST_PSI_BOLT;

    const maxlev = MCAST_DATA[list[list.length - 1]][0];
    let spellval = rn2(mtmp.m_lev);
    if (spellval > maxlev && rn2(maxlev))
        spellval = rn2(maxlev);

    for (let i = list.length - 1; i >= 0; --i) {
        if (MCAST_DATA[list[i]][0] <= spellval
            && !spell_would_be_useless(mtmp, list[i]))
            return list[i];
    }
    return list[0];
}

function seen_resistance_for(adtyp) {
    switch (adtyp) {
    case ATTKS.AD_MAGM: return M_SEEN_MAGR;
    case ATTKS.AD_FIRE: return M_SEEN_FIRE;
    case ATTKS.AD_COLD: return M_SEEN_COLD;
    case ATTKS.AD_SLEE: return M_SEEN_SLEEP;
    case ATTKS.AD_DISN: return M_SEEN_DISINT;
    case ATTKS.AD_ELEC: return M_SEEN_ELEC;
    case ATTKS.AD_DRST: return M_SEEN_POISON;
    case ATTKS.AD_ACID: return M_SEEN_ACID;
    default: return 0;
    }
}

async function cursetxt(mtmp, undirected) {
    if (canseemon(mtmp) && couldsee(mtmp.mx, mtmp.my)) {
        const point_msg = undirected ? 'all around, then curses'
              : 'at you, then curses';
        await pline(`${Monnam(mtmp)} points ${point_msg}.`);
    } else if (!(game.moves % 4) || !rn2(4)) {
        if (!Deaf())
            await You_hear('a mumbled curse.');
    }
}

// src/mcastu.c:989 buzzmu(), a monster's ranged elemental spell.
export async function buzzmu(mtmp, mattk) {
    const adtyp = mattk[1];
    if (adtyp < ATTKS.AD_MAGM || adtyp > ATTKS.AD_SPC2)
        return M_ATTK_MISS;

    const seen = seen_resistance_for(adtyp);
    if (mtmp.mcan || (seen && ((mtmp.seen_resistance ?? 0) & seen))) {
        await cursetxt(mtmp, false);
        return M_ATTK_MISS;
    }

    const { lined_up } = await import('./monmove.js');
    if (!lined_up(mtmp) || !rn2(3))
        return M_ATTK_MISS;

    nomul(0);
    const { dobuzz, flash_str } = await import('./zap.js');
    const bztyp = BZ_OFS_AD(adtyp);
    if (canseemon(mtmp))
        await pline(`${Monnam(mtmp)} zaps you with a ${flash_str(bztyp)}!`);
    game.buzzer = mtmp;
    await dobuzz(-10 - bztyp, mattk[2], mtmp.mx, mtmp.my,
                 sgn(game.tbx), sgn(game.tby));
    game.buzzer = null;
    return M_ATTK_HIT;
}

// src/mcastu.c:308 m_cure_self(), the caster heals itself.
async function m_cure_self(mtmp, dmg) {
    if (mtmp.mhp < mtmp.mhpmax) {
        if (canseemon(mtmp))
            await pline_mon(mtmp, `${Monnam(mtmp)} looks better.`);
        /* note: player healing does 6d4; this used to do 1d8 */
        healmon(mtmp, d(3, 6), 0);
        dmg = 0;
    }
    return dmg;
}

// src/mcastu.c:323 touch_of_death(), the spell that drains maximum hp and
// can kill outright.
export async function touch_of_death(mtmp) {
    let dmg = 50 + d(8, 6);
    const drain = Math.trunc(dmg / 2);

    /* if we get here, hero is either not resistant or hero has been
       poly'd into an undead or demon */
    await You_feel('drained...');
    const kbuf = death_inflicted_by('the touch of death', mtmp);

    if (Upolyd(game.u)) {
        game.u.mh = 0;
        await rehumanize(); /* fatal iff Unchanging */
    } else if (drain >= game.u.uhpmax) {
        game.killer = { format: KILLED_BY, name: kbuf };
        await done(DIED);
    } else {
        const olduhp = game.u.uhp,
            uhpmin = minuhpmax(3),
            newuhpmax = game.u.uhpmax - drain;

        setuhpmax(Math.max(newuhpmax, uhpmin), false);
        dmg = adjuhploss(dmg, olduhp); /* reduce pending damage if uhp has
                                        * already dropped due to lower uhpmax */
        await losehp(dmg, kbuf, KILLED_BY);
    }
    if (game.killer)
        game.killer.name = ''; /* not killed if we get here... */
}

// src/mcastu.c:358 death_inflicted_by(), "<reason> inflicted by <monster>".
export function death_inflicted_by(deathreason, mtmp) {
    let outbuf = deathreason;

    if (mtmp) {
        const mptr = mtmp.data,
            champtr = ismnum(mtmp.cham) ? game.mons[mtmp.cham] : mptr;
        let realnm = pmname(champtr, Mgender(mtmp));
        const fakenm = pmname(mptr, Mgender(mtmp));

        /* greatly simplified extract from done_in_by(), primarily for
           reason for death due to 'touch of death' spell; if mtmp is
           shape changed, it won't be a vampshifter or mimic since they
           can't cast spells */
        if (!type_is_pname(champtr) && !the_unique_pm(mptr))
            realnm = an(realnm);
        outbuf += ` inflicted by ${the_unique_pm(mptr) ? 'the ' : ''}${realnm}`;
        if (champtr !== mptr)
            outbuf += ` imitating ${an(fakenm)}`;
    }
    return outbuf;
}

// src/mcastu.c:389 mcast_death_touch()
async function mcast_death_touch(mtmp) {
    await pline(`Oh no, ${mhe(mtmp)}'s using the touch of death!`);
    if (nonliving(game.youmonst.data) || is_demon(game.youmonst.data)) {
        await You('seem no deader than before.');
    } else if (!Antimagic() && rn2(mtmp.m_lev) > 12) {
        if (Hallucination()) {
            await You('have an out of body experience.');
        } else {
            await touch_of_death(mtmp);
        }
        monstunseesu(M_SEEN_MAGR);
    } else {
        if (Antimagic()) {
            await shieldeff(game.u.ux, game.u.uy);
            monstseesu(M_SEEN_MAGR);
        }
        await pline("Lucky for you, it didn't work!");
    }
}

// src/mcastu.c:411 mcast_clone_wiz()
async function mcast_clone_wiz(mtmp) {
    if (mtmp.iswiz && game.context?.no_of_wizards === 1) {
        await pline('Double Trouble...');
        await clonewiz();
    } /* else impossible("bad wizard cloning?"); */
}

// src/mcastu.c:421 mcast_summon_mons()
async function mcast_summon_mons(mtmp) {
    const count = await nasty(mtmp);

    if (!count) {
        ; /* nothing was created? */
    } else if (mtmp.iswiz) {
        await verbalize(`Destroy the thief, my pet${plur(count)}!`);
    } else {
        const one = (count === 1);
        const mappear = one ? 'A monster appears'
                            : 'Monsters appear';

        /* messages are variations of "%s from nowhere!", "%s around you!";
           if hero is invisible or displaced, the caster's target spot may
           differ from hero's actual spot, so avoid claiming that only
           a single monster is seen */
        if (Invis() && !perceives(mtmp.data)
            && (mtmp.mux !== game.u.ux || mtmp.muy !== game.u.uy))
            await pline(`${mappear} ${one ? 'at' : 'around'} a spot near you!`);
        else if (displaced() && (mtmp.mux !== game.u.ux || mtmp.muy !== game.u.uy))
            await pline(`${mappear} ${one ? 'by' : 'around'} your displaced image!`);
        else
            await pline(`${mappear} from nowhere!`);
    }
}

// src/mcastu.c:450 mcast_destroy_armor()
async function mcast_destroy_armor() {
    if (Antimagic()) {
        await shieldeff(game.u.ux, game.u.uy);
        monstseesu(M_SEEN_MAGR);
        await pline('A field of force surrounds you!');
    } else if (!(await destroy_arm())) {
        await Your('skin itches.');
    } else {
        /* monster knows hero lacks magic resistance since armor was
           actually destroyed */
        monstunseesu(M_SEEN_MAGR);
    }
}

// src/mcastu.c:466 mcast_weaken_you()
async function mcast_weaken_you(mtmp, dmg) {
    if (Antimagic()) {
        await shieldeff(game.u.ux, game.u.uy);
        monstseesu(M_SEEN_MAGR);
        await You_feel('momentarily weakened.');
    } else {
        await You('suddenly feel weaker!');
        dmg = mtmp.m_lev - 6;
        if (dmg < 1) /* paranoia since only chosen when m_lev is high */
            dmg = 1;
        if (half_spell_damage())
            dmg = Math.trunc((dmg + 1) / 2);
        await losestr(rnd(dmg),
                      death_inflicted_by('strength loss', mtmp),
                      KILLED_BY);
        if (game.killer)
            game.killer.name = ''; /* not killed if we get here... */
        monstunseesu(M_SEEN_MAGR);
    }
}

// src/mcastu.c:490 mcast_disappear()
async function mcast_disappear(mtmp) {
    if (!mtmp.minvis && !mtmp.invis_blkd) {
        if (canseemon(mtmp))
            await pline_mon(mtmp, `${Monnam(mtmp)} suddenly ${
                            !See_invisible() ? 'disappears' : 'becomes transparent'}!`);
        mon_set_minvis(mtmp, false);
        if (cansee(mtmp.mx, mtmp.my) && !canspotmon(mtmp))
            map_invisible(mtmp.mx, mtmp.my);
    } /* else impossible("no reason for monster to cast disappear spell?"); */
}

// src/mcastu.c:504 mcast_stun_you()
async function mcast_stun_you(dmg) {
    if (Antimagic() || Free_action()) {
        await shieldeff(game.u.ux, game.u.uy);
        monstseesu(M_SEEN_MAGR);
        if (!stunned())
            await You_feel('momentarily disoriented.');
        await make_stunned(1, false);
    } else {
        await You(stunned() ? 'struggle to keep your balance.' : 'reel...');
        dmg = d(ACURR(A_DEX) < 12 ? 6 : 4, 4);
        if (half_spell_damage())
            dmg = Math.trunc((dmg + 1) / 2);
        await make_stunned(((game.u.intrinsic?.HStun || 0) & TIMEOUT) + dmg, false);
        monstunseesu(M_SEEN_MAGR);
    }
}

// src/mcastu.c:523 mcast_geyser()
async function mcast_geyser(dmg) {
    await pline('A sudden geyser slams into you from nowhere!');
    dmg = d(8, 6);
    if (half_physical_damage())
        dmg = Math.trunc((dmg + 1) / 2);
    return dmg;
}

// src/mcastu.c:540 mcast_fire_pillar()
async function mcast_fire_pillar(mtmp, dmg) {
    let orig_dmg;

    await pline('A pillar of fire strikes all around you!');
    orig_dmg = dmg = d(8, 6);
    if (Fire_resistance()) {
        await shieldeff(game.u.ux, game.u.uy);
        monstseesu(M_SEEN_FIRE);
        dmg = 0;
    } else {
        monstunseesu(M_SEEN_FIRE);
    }
    if (half_spell_damage())
        dmg = Math.trunc((dmg + 1) / 2);
    await burn_away_slime();
    await burnarmor(game.youmonst);
    await destroy_items(game.youmonst, ATTKS.AD_FIRE, orig_dmg);
    await ignite_items(game.invent);
    await mon_spell_hits_spot(mtmp, ATTKS.AD_FIRE, game.u.ux, game.u.uy);
    return dmg;
}

// src/mcastu.c:566 mcast_lightning()
async function mcast_lightning(mtmp, dmg) {
    let orig_dmg;
    let reflects;

    await pline('A bolt of lightning strikes down at you from above!');
    reflects = await ureflects('It bounces off your %s%s.', '');
    orig_dmg = dmg = d(8, 6);
    if (reflects || Shock_resistance()) {
        await shieldeff(game.u.ux, game.u.uy);
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
    if (half_spell_damage())
        dmg = Math.trunc((dmg + 1) / 2);
    await destroy_items(game.youmonst, ATTKS.AD_ELEC, orig_dmg);
    /* lightning might destroy engravings and burn away webs or
       reflection protects terrain here [execution won't get here due
       to 'if (reflects) break' above] but hero resistance doesn't;
       do this before maybe blinding the hero via flashburn() */
    await mon_spell_hits_spot(mtmp, ATTKS.AD_ELEC, game.u.ux, game.u.uy);
    await flashburn(rnd(100), true);
    return dmg;
}

// src/mcastu.c:601 mcast_psi_bolt()
async function mcast_psi_bolt(dmg) {
    /* prior to 3.4.0 Antimagic was setting the damage to 1--this
       made the spell virtually harmless to players with magic res. */
    if (Antimagic()) {
        await shieldeff(game.u.ux, game.u.uy);
        monstseesu(M_SEEN_MAGR);
        dmg = Math.trunc((dmg + 1) / 2);
    } else {
        monstunseesu(M_SEEN_MAGR);
    }
    if (dmg <= 5)
        await You(`get a slight ${body_part(HEAD)}ache.`);
    else if (dmg <= 10)
        await Your('brain is on fire!');
    else if (dmg <= 20)
        await Your(`${body_part(HEAD)} suddenly aches painfully!`);
    else
        await Your(`${body_part(HEAD)} suddenly aches very painfully!`);
    return dmg;
}

// src/mcastu.c:624 mcast_open_wounds()
async function mcast_open_wounds(dmg) {
    if (Antimagic()) {
        await shieldeff(game.u.ux, game.u.uy);
        monstseesu(M_SEEN_MAGR);
        dmg = Math.trunc((dmg + 1) / 2);
    } else {
        monstunseesu(M_SEEN_MAGR);
    }
    if (dmg <= 5)
        await Your('skin itches badly for a moment.');
    else if (dmg <= 10)
        await pline('Wounds appear on your body!');
    else if (dmg <= 20)
        await pline('Severe wounds appear on your body!');
    else
        await Your('body is covered with painful wounds!');
    return dmg;
}

// src/mcastu.c:645 mcast_insects(), summon insects, or snakes when the
// insects have run out.
async function mcast_insects(mtmp) {
    /* Try for insects, and if there are none
       left, go for (sticks to) snakes.  -3. */
    let pm = mkclass(MONSYMS.S_ANT, 0);
    let mtmp2 = null;
    const let_ = (pm ? MONSYMS.S_ANT : MONSYMS.S_SNAKE);
    let success = false, seecaster;
    let i, quan, oldseen, newseen;
    const bypos = { x: 0, y: 0 };
    let fmt, what;

    oldseen = monster_census(true);
    quan = (mtmp.m_lev < 2) ? 1 : rnd(Math.trunc(mtmp.m_lev / 2));
    if (quan < 3)
        quan = 3;
    for (i = 0; i <= quan; i++) {
        if (!enexto(bypos, mtmp.mux, mtmp.muy, mtmp.data))
            return;
        if ((pm = mkclass(let_, 0)) != null
            && (mtmp2 = await makemon(pm, bypos.x, bypos.y, MM_ANGRY | MM_NOMSG))
            != null) {
            success = true;
            mtmp2.msleeping = mtmp2.mpeaceful = mtmp2.mtame = 0;
            set_malign(mtmp2);
        }
    }
    newseen = monster_census(true);

    /* not canspotmon(), which includes unseen things sensed via warning */
    seecaster = canseemon(mtmp) || tp_sensemon(mtmp) || detect_monsters();

    what = (let_ === MONSYMS.S_SNAKE) ? 'snakes' : 'insects';
    if (Hallucination())
        what = makeplural(bogusmon(null));

    fmt = null;
    if (!seecaster) {
        if (newseen <= oldseen || Unaware()) {
            /* unseen caster fails or summons unseen critters,
               or unconscious hero ("You dream that you hear...") */
            await You_hear(`someone summoning ${what}.`);
        } else {
            let arg;

            arg = (newseen === oldseen + 1) ? an(makesingular(what))
                                            : what;
            if (!Deaf()) {
                await You_hear(`someone summoning something, and ${arg} ${
                               vtense(arg, 'appear')}.`);
            } else {
                await pline(`${upstart(arg)} ${vtense(arg, 'appear')}.`);
            }
        }

    /* seen caster, possibly producing unseen--or just one--critters;
       hero is told what the caster is doing and doesn't necessarily
       observe complete accuracy of that caster's results (in other
       words, no need to fuss with visibility or singularization;
       player is told what's happening even if hero is unconscious) */
    } else if (!success) {
        fmt = '%s casts at a clump of sticks, but nothing happens.%s';
        what = '';
    } else if (let_ === MONSYMS.S_SNAKE) {
        fmt = '%s transforms a clump of sticks into %s!';
    } else if (Invis() && !perceives(mtmp.data)
               && (mtmp.mux !== game.u.ux || mtmp.muy !== game.u.uy)) {
        fmt = '%s summons %s around a spot near you!';
    } else if (displaced() && (mtmp.mux !== game.u.ux || mtmp.muy !== game.u.uy)) {
        fmt = '%s summons %s around your displaced image!';
    } else {
        fmt = '%s summons %s!';
    }
    if (fmt) {
        await pline_mon(mtmp, fmt.replace('%s', Monnam(mtmp)).replace('%s', what));
    }
}

// src/mcastu.c:729 mcast_blind_you()
async function mcast_blind_you() {
    if (!blinded()) {
        const num_eyes = eyecount(game.youmonst.data);

        await pline(`Scales cover your ${(num_eyes === 1)
                                        ? body_part(EYE)
                                        : makeplural(body_part(EYE))}!`);
        await make_blinded(half_spell_damage() ? 100 : 200, false);
        if (!Blind())
            await Your('vision quickly clears.'); /* Your1(vision_clears) */
    } /* else impossible("no reason for monster to cast blindness spell?"); */
}

// src/mcastu.c:746 mcast_paralyze()
async function mcast_paralyze(mtmp) {
    let dmg = 0;

    if (Antimagic() || Free_action()) {
        await shieldeff(game.u.ux, game.u.uy);
        monstseesu(M_SEEN_MAGR);
        if (game.multi >= 0)
            await You('stiffen briefly.');
        dmg = 1; /* to produce nomul(-1), not actual damage */
    } else {
        if (game.multi >= 0)
            await You('are frozen in place!');
        dmg = 4 + mtmp.m_lev;
        if (half_spell_damage())
            dmg = Math.trunc((dmg + 1) / 2);
        monstunseesu(M_SEEN_MAGR);
    }
    nomul(-dmg);
    game.multi_reason = 'paralyzed by a monster';
    game.nomovemsg = '';
    return dmg;
}

// src/mcastu.c:771 mcast_confuse_you()
async function mcast_confuse_you(mtmp) {
    if (Antimagic()) {
        await shieldeff(game.u.ux, game.u.uy);
        monstseesu(M_SEEN_MAGR);
        await You_feel('momentarily dizzy.');
    } else {
        const oldprop = !!confusion();
        let dmg = mtmp.m_lev;

        if (half_spell_damage())
            dmg = Math.trunc((dmg + 1) / 2);
        await make_confused((game.u.intrinsic?.HConfusion || 0) + dmg, true);
        if (Hallucination())
            await You_feel(`${oldprop ? 'trippier' : 'trippy'}!`);
        else
            await You_feel(`${oldprop ? 'more ' : ''}confused!`);
        monstunseesu(M_SEEN_MAGR);
    }
}

// src/mcastu.c:801 mcast_spell(), a monster's wizard or cleric spell; dmg
// is zero when the caster is not aiming at the hero, which only makes
// sense for an undirected spell.
async function mcast_spell(mtmp, dmg, spellnum) {
    if (dmg < 0) {
        /* impossible("monster cast spell (%d) with negative dmg (%d)?") */
        return;
    }
    if (dmg === 0 && !is_undirected_spell(spellnum)) {
        /* impossible("cast directed wizard spell (%d) with dmg=0?") */
        return;
    }

    switch (spellnum) {
    case MCAST_DEATH_TOUCH:
        await mcast_death_touch(mtmp);
        dmg = 0;
        break;
    case MCAST_CLONE_WIZ:
        await mcast_clone_wiz(mtmp);
        dmg = 0;
        break;
    case MCAST_SUMMON_MONS:
        await mcast_summon_mons(mtmp);
        dmg = 0;
        break;
    case MCAST_AGGRAVATION:
        await You_feel('that monsters are aware of your presence.');
        aggravate();
        dmg = 0;
        break;
    case MCAST_CURSE_ITEMS:
        await You_feel('as if you need some help.');
        await rndcurse();
        dmg = 0;
        break;
    case MCAST_DESTRY_ARMR:
        await mcast_destroy_armor();
        dmg = 0;
        break;
    case MCAST_WEAKEN_YOU: /* drain strength */
        await mcast_weaken_you(mtmp, dmg);
        dmg = 0;
        break;
    case MCAST_DISAPPEAR: /* makes self invisible */
        await mcast_disappear(mtmp);
        dmg = 0;
        break;
    case MCAST_STUN_YOU:
        await mcast_stun_you(dmg);
        dmg = 0;
        break;
    case MCAST_HASTE_SELF:
        await mon_adjust_speed(mtmp, 1, null);
        dmg = 0;
        break;
    case MCAST_CURE_SELF:
        dmg = await m_cure_self(mtmp, dmg);
        break;
    case MCAST_PSI_BOLT:
        dmg = await mcast_psi_bolt(dmg);
        break;
    case MCAST_GEYSER:
        dmg = await mcast_geyser(dmg);
        break;
    case MCAST_FIRE_PILLAR:
        dmg = await mcast_fire_pillar(mtmp, dmg);
        break;
    case MCAST_LIGHTNING:
        dmg = await mcast_lightning(mtmp, dmg);
        break;
    case MCAST_INSECTS:
        await mcast_insects(mtmp);
        dmg = 0;
        break;
    case MCAST_BLIND_YOU:
        await mcast_blind_you();
        dmg = 0;
        break;
    case MCAST_PARALYZE:
        dmg = await mcast_paralyze(mtmp);
        break;
    case MCAST_CONFUSE_YOU:
        await mcast_confuse_you(mtmp);
        dmg = 0;
        break;
    case MCAST_OPEN_WOUNDS:
        dmg = await mcast_open_wounds(dmg);
        break;
    default:
        /* impossible("mcastu: invalid magic spell (%d)", spellnum); */
        dmg = 0;
        break;
    }
    if (dmg)
        await mdamageu(mtmp, dmg);
}

export async function castmu(mtmp, mattk, thinks_it_foundyou, foundyou) {
    const ml = mtmp.m_lev;
    let spellnum = 0;

    if ((mattk[1] === ATTKS.AD_SPEL || mattk[1] === ATTKS.AD_CLRC) && ml) {
        let cnt = 40;
        do {
            spellnum = choose_monster_spell(mtmp, mattk[1]);
            if (!thinks_it_foundyou) {
                if (!is_undirected_spell(spellnum)
                    || spell_would_be_useless(mtmp, spellnum))
                    return M_ATTK_MISS;
                break;
            }
        } while (--cnt > 0 && spell_would_be_useless(mtmp, spellnum));
        if (!cnt)
            return M_ATTK_MISS;
    }

    const seen = seen_resistance_for(mattk[1]);
    if (mtmp.mcan || mtmp.mspec_used || !ml
        || (seen && ((mtmp.seen_resistance ?? 0) & seen))) {
        await cursetxt(mtmp, is_undirected_spell(spellnum));
        return M_ATTK_MISS;
    }

    if (mattk[1] === ATTKS.AD_SPEL || mattk[1] === ATTKS.AD_CLRC)
        mtmp.mspec_used = ml < 8 ? 10 - ml : 2;

    if (!foundyou && thinks_it_foundyou && !is_undirected_spell(spellnum)) {
        await pline_mon(mtmp, `${canseemon(mtmp) ? Monnam(mtmp) : 'Something'
        } casts a spell at ${is_waterwall(mtmp.mux, mtmp.muy) ? 'empty water'
                                                              : 'thin air'}!`);
        return M_ATTK_MISS;
    }

    nomul(0);
    if (rn2(ml * 10) < (mtmp.mconf ? 100 : 20)) { /* fumbled attack */
        if (canseemon(mtmp) && !Deaf()) {
            set_msg_xy(mtmp.mx, mtmp.my);
            await pline_The(`air crackles around ${mon_nam(mtmp)}.`);
        }
        return M_ATTK_MISS;
    }

    if (canspotmon(mtmp) || !is_undirected_spell(spellnum)) {
        await pline_mon(mtmp, `${canspotmon(mtmp) ? Monnam(mtmp) : 'Something'
        } casts a spell${is_undirected_spell(spellnum) ? ''
                         : (Invis() && !perceives(mtmp.data)
                            && !u_at(mtmp.mux, mtmp.muy))
                           ? ' at a spot near you'
                           : (displaced() && !u_at(mtmp.mux, mtmp.muy))
                             ? ' at your displaced image'
                             : ' at you'}!`);
    }

    /*
     * As these are spells, the damage is related to the level
     * of the monster casting the spell.
     */
    let dmg;
    if (!foundyou) {
        dmg = 0;
        if (mattk[1] !== ATTKS.AD_SPEL && mattk[1] !== ATTKS.AD_CLRC) {
            /* impossible("%s casting non-hand-to-hand version of
                           hand-to-hand spell %d?") */
            return M_ATTK_MISS;
        }
    } else if (mattk[3])
        dmg = d(Math.trunc(ml / 2) + mattk[2], mattk[3]);
    else
        dmg = d(Math.trunc(ml / 2) + 1, 6);
    if (half_spell_damage())
        dmg = Math.trunc((dmg + 1) / 2);

    const ret = M_ATTK_HIT;
    switch (mattk[1]) {
    case ATTKS.AD_FIRE:
        await pline("You're enveloped in flames.");
        if (Fire_resistance()) {
            await shieldeff(game.u.ux, game.u.uy);
            await pline('But you resist the effects.');
            monstseesu(M_SEEN_FIRE);
            dmg = 0;
        } else {
            monstunseesu(M_SEEN_FIRE);
        }
        await burn_away_slime();
        await mon_spell_hits_spot(mtmp, ATTKS.AD_FIRE, game.u.ux, game.u.uy);
        break;
    case ATTKS.AD_COLD:
        await pline("You're covered in frost.");
        if (Cold_resistance()) {
            await shieldeff(game.u.ux, game.u.uy);
            await pline('But you resist the effects.');
            monstseesu(M_SEEN_COLD);
            dmg = 0;
        } else {
            monstunseesu(M_SEEN_COLD);
        }
        await mon_spell_hits_spot(mtmp, ATTKS.AD_COLD, game.u.ux, game.u.uy);
        break;
    case ATTKS.AD_MAGM:
        await You('are hit by a shower of missiles!');
        if (Antimagic()) {
            await shieldeff(game.u.ux, game.u.uy);
            await pline_The('missiles bounce off!');
            monstseesu(M_SEEN_MAGR);
            dmg = 0;
        } else {
            dmg = d(Math.trunc(mtmp.m_lev / 2) + 1, 6);
            monstunseesu(M_SEEN_MAGR);
        }
        await mon_spell_hits_spot(mtmp, ATTKS.AD_MAGM, game.u.ux, game.u.uy);
        break;
    case ATTKS.AD_SPEL: /* wizard spell */
    case ATTKS.AD_CLRC: /* clerical spell */
        await mcast_spell(mtmp, dmg, spellnum);
        dmg = 0; /* done by the spell casting functions */
        break;
    } /* switch */
    if (dmg)
        await mdamageu(mtmp, dmg);
    return ret;
}
