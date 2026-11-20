// mhitu.js — monster attacks the hero: mattacku(), hitmu(), mdamageu(),
// hitmsg(), missmu(), wildmiss(), getmattk(), magic_negation(),
// passiveum() and could_seduce().
// C ref: mhitu.c.  Paths that aren't ported yet throw a 'not ported yet'
// error instead of skipping their rolls.

import { game } from './gstate.js';
import { rn2, rnd, d, AC_VALUE } from './rng.js';
import { cansee } from './vision.js';
import { pline, bot, mon_visible } from './display.js';
import { nomul } from './hack.js';
import { Monnam, pronoun_gender, PRONOUN_HALLU } from './do_name.js';
import { monnear } from './mon.js';
import { canseemon } from './display.js';
import { find_offensive, use_offensive } from './muse.js';
import { mhitm_adtyping, mhitm_knockback } from './uhitm.js';
import { is_undead, is_vampshifter, is_demon, is_were, is_swimmer,
         perceives, is_orc, dmgtype, is_neuter } from './mondata.js';
import { midnight } from './calendar.js';
import * as M from './monsters.js';
import { mons, AT_NONE, AT_CLAW, AT_KICK, AT_BITE, AT_STNG, AT_TUCH,
         AT_BUTT, AT_TENT, AT_HUGS, AT_GAZE, AT_EXPL, AT_BOOM, AT_ENGL,
         AT_BREA, AT_SPIT, AT_WEAP, AT_MAGC, AD_SSEX, AD_SEDU, AD_SITM,
         AD_DISE, AD_PEST, AD_FAMN, AD_DREN, AD_STCK, AD_POLY, AD_DRIN,
         AD_PHYS, AD_ACID, AD_STON, AD_ENCH, AD_COLD } from './monsters.js';
import { M_ATTK_MISS, M_ATTK_HIT, M_ATTK_AGR_DIED, M_ATTK_AGR_DONE, NATTK,
         NON_PM, INVIS, DISPLACED, SEE_INVIS, BLINDED, CONFLICT,
         HALF_PHDAM, PROTECTION, COLD_RES, W_ARMOR, W_AMUL, TT_PIT, HALLUC,
         NEED_WEAPON, NEED_HTH_WEAPON, P_POLEARMS, P_LANCE, P_WHIP,
         is_pit } from './const.js';
import { t_at } from './trap.js';
import { u_at } from './makemon.js';
import { objects, AMULET_OF_GUARDING, WEAPON_CLASS, TOOL_CLASS, TOWEL,
         PIERCE } from './objects.js';
import { mon_wield_item, hitval } from './weapon.js';
import { thrwmu } from './mthrowu.js';
import { Is_rogue_level } from './const.js';
import { ART_SNICKERSNEE } from './artilist.js';
import { genders } from './role.js';
import { xname } from './objnam.js';

/* C ref: mhitu.c static mon_currwep */
let mon_currwep = null;

/* C ref: youprop.h -- (H* || E*) && !B* */
function uhave(prop) {
    const p = game.u.uprops[prop];
    return !!((p.intrinsic || p.extrinsic) && !p.blocked);
}
function Invis() { return uhave(INVIS); }
function Displaced() { return uhave(DISPLACED); }
function Underwater() { return !!game.u.uinwater; }
function See_invisible() { return uhave(SEE_INVIS); }
function Blind() {
    const p = game.u.uprops[BLINDED];
    return !!((p.intrinsic || p.extrinsic) && !p.blocked);
}
function Conflict() {
    const p = game.u.uprops[CONFLICT];
    return !!(p.intrinsic || p.extrinsic);
}
function Half_physical_damage() { return uhave(HALF_PHDAM); }
function Cold_resistance() { return uhave(COLD_RES); }
function Upolyd() { return game.u.umonnum !== game.u.umonster; }

/* mondata.h */
function is_animal(ptr) { return (ptr.mflags1 & M.M1_ANIMAL) !== 0; }
function thick_skinned(ptr) { return (ptr.mflags1 & M.M1_THICK_HIDE) !== 0; }
function unsolid(ptr) { return (ptr.mflags1 & M.M1_UNSOLID) !== 0; }
function nolimbs(ptr) { return (ptr.mflags1 & M.M1_NOLIMBS) === M.M1_NOLIMBS; }
function hides_under(ptr) { return (ptr.mflags1 & M.M1_CONCEAL) !== 0; }
function touch_petrifies(ptr) {
    return ptr === mons[M.PM_COCKATRICE] || ptr === mons[M.PM_CHICKATRICE];
}
/* C ref: monst.h DEADMONSTER() */
function DEADMONSTER(mon) { return mon.mhp < 1; }
/* C ref: hack.h mdistu() */
function mdistu(mon) {
    const dx = mon.mx - game.u.ux, dy = mon.my - game.u.uy;
    return dx * dx + dy * dy;
}
/* C ref: hack.h m_next2u() */
function m_next2u(mon) {
    return Math.abs(mon.mx - game.u.ux) <= 1 && Math.abs(mon.my - game.u.uy) <= 1;
}
/* C ref: display.h canspotmon() -- telepathy/warning not ported yet */
function canspotmon(mon) {
    if (canseemon(mon))
        return true;
    throw new Error('canspotmon(): see_with_infrared()/sensemon() not ported yet');
}
/* C ref: display.c map_invisible() */
function map_invisible(x, y) {
    void x; void y;
    throw new Error('map_invisible() not ported yet');
}
/* C ref: mondata.h gender() / pronoun_gender() subset */
function gender(mon) { return mon.female ? 1 : 0; }
/* C ref: polyself.c poly_gender() */
function poly_gender() {
    if (Upolyd())
        throw new Error('poly_gender(): polymorphed hero not ported yet');
    return game.flags.female ? 1 : 0;
}

/* C ref: obj.h is_pole(), is_art() */
function is_art(o, art) { return !!(o && o.oartifact === art); }
function is_pole(otmp) {
    return (otmp.oclass === WEAPON_CLASS || otmp.oclass === TOOL_CLASS)
           && (objects[otmp.otyp].oc_skill === P_POLEARMS
               || objects[otmp.otyp].oc_skill === P_LANCE
               || is_art(otmp, ART_SNICKERSNEE));
}
/* C ref: obj.h is_wet_towel() */
function is_wet_towel(o) { return o.otyp === TOWEL && (o.spe || 0) > 0; }
/* C ref: you.h mhis() */
export function mhis(mtmp) { return genders[pronoun_gender(mtmp, PRONOUN_HALLU)].his; }

// C ref: mhitu.c mswings_verb()
/* strike types P|S|B: Pierce (pointed: stab) => "thrusts",
   Slash (edged: slice) or whack (blunt: Bash) => "swings" */
export function mswings_verb(
    mwep, /* attacker's weapon */
    bash) /* True: using polearm while too close */
{
    let verb;
    const otyp = mwep.otyp,
        /* (monsters don't actually wield towels, wet or otherwise) */
        lash = (objects[otyp].oc_skill === P_WHIP || is_wet_towel(mwep)),
        /* some weapons can have more than one strike type; for those,
           give a mix of thrust and swing (caller doesn't care either way) */
        thrust = ((objects[otyp].oc_dir & PIERCE) !== 0
                  && ((objects[otyp].oc_dir & ~PIERCE) === 0 || !rn2(2)));

    verb = bash ? "bashes with" /*sigh*/
           : lash ? "lashes"
             : thrust ? "thrusts"
               : "swings";
    /* (might have caller also pass attacker's formatted name so that
       if hallucination makes that be plural, we could use vtense() to
       adjust the result to match) */
    return verb;
}

// C ref: mhitu.c mswings()
/* monster swings obj */
async function mswings(
    mtmp,  /* attacker */
    otemp, /* attacker's weapon */
    bash)  /* True: polearm used at too close range */
{
    if (game.flags.verbose && !Blind() && mon_visible(mtmp)) {
        await pline(`${Monnam(mtmp)} ${mswings_verb(otemp, bash)} ${
            (otemp.quan > 1) ? "one of " : ""}${mhis(mtmp)} ${xname(otemp)}.`); /* pline_mon() */
    }
}

// C ref: allmain.c stop_occupation()
function stop_occupation() {
    if (game.occupation) {
        throw new Error('stop_occupation(): occupations not ported yet');
    } else if (game.multi >= 0) {
        nomul(0);
    }
    /* cmdq_clear(CQ_CANNED): the command queue isn't ported yet */
}

// C ref: mhitu.c hitmsg()
/* monster hits hero */
export async function hitmsg(mtmp, mattk) {
    let compat;
    let verb = null, punct = '!';
    let Monst_name = Monnam(mtmp);

    /* Note: if opposite gender, "seductively";
       if same gender, "engagingly" for nymph, normal msg for others. */
    if ((compat = could_seduce(mtmp, game.youmonst, mattk)) !== 0
        && !mtmp.mcan && !mtmp.mspec_used) {
        throw new Error('hitmsg(): seduction message not ported yet');
    } else {
        switch (mattk.aatyp) {
        case AT_BITE:
            verb = 'bites';
            break;
        case AT_KICK:
            if (thick_skinned(game.youmonst.data))
                punct = '.';
            verb = 'kicks';
            break;
        case AT_STNG:
            verb = 'stings';
            break;
        case AT_BUTT:
            verb = 'butts';
            break;
        case AT_TUCH:
            verb = 'touches you';
            break;
        case AT_TENT:
            throw new Error('hitmsg(): s_suffix() for tentacles not ported yet');
        case AT_EXPL:
        case AT_BOOM:
            verb = 'explodes';
            break;
        default:
            verb = 'hits';
        }
        /* if a monster hits more than once with similar attack, say so */
        const prev = game.hitmsg_prev;
        const again = (mtmp.m_id === game.hitmsg_mid
                       && prev != null
                       && mattk === mtmp.data.mattk[prev.idx + 1]
                       && prev.mdat === mtmp.data
                       && mattk.aatyp === prev.attk.aatyp) ? ' again' : '';
        await pline(`${Monst_name} ${verb}${again}${punct}`); /* pline_mon() */
    }
    game.hitmsg_mid = mtmp.m_id;
    game.hitmsg_prev = { attk: mattk, mdat: mtmp.data,
                         idx: mtmp.data.mattk.indexOf(mattk) };
}

// C ref: mhitu.c missmu()
/* monster missed you */
async function missmu(mtmp, nearmiss, mattk) {
    game.hitmsg_mid = 0;
    game.hitmsg_prev = null;

    if (!canspotmon(mtmp))
        map_invisible(mtmp.mx, mtmp.my);

    if (could_seduce(mtmp, game.youmonst, mattk) && !mtmp.mcan)
        await pline(`${Monnam(mtmp)} pretends to be friendly.`);
    else
        await pline(`${Monnam(mtmp)} ${(nearmiss && game.flags.verbose) ? 'just ' : ''}misses!`);

    stop_occupation();
}

// C ref: mhitu.c wildmiss()
/* monster attacked wrong location due to monster blindness, hero
   invisibility, hero displacement, or hero being underwater */
async function wildmiss(mtmp, mattk) {
    const unotseen = (!mtmp.mcansee || (Invis() && !perceives(mtmp.data))),
          unotthere = Displaced(), usubmerged = Underwater();

    if (!unotseen && !unotthere && !usubmerged)
        return; /* impossible("attacks you without knowing your location?") */

    if (!game.flags.verbose)
        return;
    /* no feedback if hero doesn't see the monster's spot */
    if (!cansee(mtmp.mx, mtmp.my))
        return;
    void mattk;
    throw new Error('wildmiss(): wild miss messages not ported yet');
}

// C ref: mhitu.c getmattk() -- with the hero as defender
/* select a monster's next attack, possibly substituting for its usual one */
export function getmattk(magr, mdef, indx, prev_result) {
    const mptr = magr.data;
    let attk = mptr.mattk[indx];
    const udefend = (mdef === game.youmonst);

    /* honor SEDUCE=0: SYSOPT_SEDUCE is on in the recorded games */

    if (indx > 0 && prev_result[indx - 1] > M_ATTK_MISS
        && (attk.adtyp === AD_DISE || attk.adtyp === AD_PEST
            || attk.adtyp === AD_FAMN)
        && attk.adtyp === mptr.mattk[indx - 1].adtyp) {
        attk = { ...attk, adtyp: M.AD_STUN };
    } else if (attk.adtyp === AD_DREN && udefend) {
        throw new Error('getmattk(): AD_DREN substitution not ported yet');
    } else if (magr.mspec_used && (attk.aatyp === AT_ENGL
                                   || attk.aatyp === AT_HUGS
                                   || attk.adtyp === AD_STCK
                                   || attk.adtyp === AD_POLY)) {
        const wimpy = (attk.damd === 0); /* lichen, violet fungus */

        /* can't re-engulf or re-grab yet; switch to simpler attack */
        attk = { ...attk };
        if (attk.adtyp === AD_ACID || attk.adtyp === M.AD_ELEC
            || attk.adtyp === AD_COLD || attk.adtyp === M.AD_FIRE) {
            attk.aatyp = AT_TUCH;
        } else {
            attk.aatyp = AT_CLAW; /* attack message will be "<foo> hits" */
            attk.adtyp = AD_PHYS;
        }
        attk.damn = 1; /* relatively weak: 1d6 */
        attk.damd = 6;
        if (wimpy && attk.aatyp === AT_CLAW) {
            attk.aatyp = AT_TUCH;
            attk.damn = attk.damd = 0;
        }
    } else if (indx === 0 && magr !== game.youmonst
               && attk.aatyp === AT_WEAP && attk.adtyp !== AD_PHYS
               && !(mptr.mattk[1].aatyp === AT_WEAP
                    && mptr.mattk[1].adtyp === AD_PHYS)
               && (magr.mcan || magr.mw)) {
        throw new Error('getmattk(): non-physical weapon attack substitution not ported yet');
    } else if (indx === 0 && attk.aatyp === AT_TUCH && attk.adtyp === AD_COLD
               && (udefend ? Cold_resistance() : true)) {
        throw new Error('getmattk(): lich cold touch substitution not ported yet');
    }

    /* elementals on their home plane do double damage:
       is_home_elemental() needs the elemental planes */
    return attk;
}

// C ref: mhitu.c calc_mattacku_vars()
function calc_mattacku_vars(mtmp, v) {
    v.ranged = (mdistu(mtmp) > 3);
    v.range2 = !monnear(mtmp, mtmp.mux, mtmp.muy);
    v.foundyou = u_at(mtmp.mux, mtmp.muy);
    v.youseeit = canseemon(mtmp);

    /* do_attack() uses bhitpos to set/clear notonhead; do likewise here */
    game.bhitpos = { x: game.u.ux, y: game.u.uy };
    game.notonhead = false;
}

// C ref: mhitu.c mtrapped_in_pit()
/* return TRUE iff monster or hero is trapped in a (spiked) pit */
export function mtrapped_in_pit(mtmp) {
    let ttmp = null;

    if (mtmp === game.youmonst)
        ttmp = (game.u.utrap && game.u.utraptype === TT_PIT)
               ? t_at(game.u.ux, game.u.uy) : null;
    else
        ttmp = mtmp.mtrapped ? t_at(mtmp.mx, mtmp.my) : null;

    if (ttmp && is_pit(ttmp.ttyp))
        return true;
    return false;
}

// C ref: mhitu.c mattacku()
/*
 * mattacku: monster attacks you
 *      returns 1 if monster dies (e.g. "yellow light"), 0 otherwise
 */
export async function mattacku(mtmp) {
    const u = game.u;
    let mattk;
    let i, j = 0, tmp;
    const sum = new Array(NATTK).fill(M_ATTK_MISS);
    let mdat = mtmp.data;
    const v = { ranged: false, range2: false, foundyou: false, youseeit: false };
    let skipnonmagc = false;

    calc_mattacku_vars(mtmp, v);

    if (!v.ranged)
        nomul(0);
    if (DEADMONSTER(mtmp))
        return 1;
    if (Underwater() && !is_swimmer(mtmp.data))
        return 0;

    /* If swallowed, can only be affected by u.ustuck */
    if (u.uswallow) {
        throw new Error('mattacku(): swallowed hero not ported yet');
    } else if (u.usteed) {
        if (mtmp === u.usteed)
            /* Your steed won't attack you */
            return 0;
        /* Orcs like to steal and eat horses and the like */
        if (!rn2(is_orc(mtmp.data) ? 2 : 4) && m_next2u(mtmp))
            throw new Error('mattacku(): attacking hero\'s steed not ported yet');
    }

    if (u.uundetected && !v.range2 && v.foundyou && !u.uswallow)
        throw new Error('mattacku(): hidden hero not ported yet');

    /* hero might be a mimic, concealed via #monster */
    if (game.youmonst.data.mlet === M.S_MIMIC && game.youmonst.m_ap_type
        && !v.range2 && v.foundyou && !u.uswallow)
        throw new Error('mattacku(): mimicking hero not ported yet');

    /* non-mimic hero might be mimicking an object after eating m corpse */
    if (game.youmonst.m_ap_type && !v.range2 && v.foundyou && !u.uswallow)
        throw new Error('mattacku(): hero mimicking an object not ported yet');

    /*  Work out the armor class differential   */
    tmp = AC_VALUE(u.uac) + 10; /* tmp ~= 0 - 20 */
    tmp += mtmp.m_lev;
    if (game.multi < 0)
        tmp += 4;
    if ((Invis() && !perceives(mdat)) || !mtmp.mcansee)
        tmp -= 2;
    if (mtmp.mtrapped)
        tmp -= 2;
    if (tmp <= 0)
        tmp = 1;

    /* make eels visible the moment they hit/miss us */
    if (mdat.mlet === M.S_EEL && mtmp.minvis && cansee(mtmp.mx, mtmp.my))
        throw new Error('mattacku(): eel visibility not ported yet');

    /* when not cancelled and not in current form due to shapechange, many
       demons can summon more demons and were creatures can summon critters;
       also, were creature might change from human to animal or vice versa */
    if (mtmp.cham === NON_PM && !mtmp.mcan && !v.range2
        && (is_demon(mdat) || is_were(mdat)))
        throw new Error('mattacku(): summonmu() not ported yet');

    if (u.uinvulnerable) /* in the midst of successful prayer */
        throw new Error('mattacku(): invulnerable hero not ported yet');

    /* Unlike defensive stuff, don't let them use item _and_ attack. */
    if (find_offensive(mtmp)) {
        const offended = await use_offensive(mtmp);

        if (offended !== 0)
            return (offended === 1) ? 1 : 0;
    }

    game.skipdrin = false; /* [see mattackm(mhitm.c)] */
    const firstfoundyou = v.foundyou;

    for (i = 0; i < NATTK; i++) {
        sum[i] = M_ATTK_MISS;
        /* counterattack against attack [i-1] might have been fatal */
        if (DEADMONSTER(mtmp))
            return 1;
        if (i > 0) {
            /* recalc in case prior attack moved hero */
            calc_mattacku_vars(mtmp, v);
            /* if hero was found but isn't anymore, avoid wildmiss now */
            if (firstfoundyou && !v.foundyou)
                continue; /* set sum[i] to 'miss' but skip other actions */
            if (!u_at(game.bhitpos.x, game.bhitpos.y))
                continue;
        }
        mon_currwep = null;
        mattk = getmattk(mtmp, game.youmonst, i, sum);
        if ((u.uswallow && mattk.aatyp !== AT_ENGL)
            || (skipnonmagc && mattk.aatyp !== AT_MAGC)
            || (game.skipdrin && mattk.aatyp === AT_TENT
                && mattk.adtyp === AD_DRIN))
            continue;

        switch (mattk.aatyp) {
        case AT_CLAW: /* "hand to hand" attacks */
        case AT_KICK:
        case AT_BITE:
        case AT_STNG:
        case AT_TUCH:
        case AT_BUTT:
        case AT_TENT:
            if (mattk.aatyp === AT_KICK && mtrapped_in_pit(mtmp))
                continue;
            if (!v.range2 && (!mtmp.mw || mtmp.mconf || Conflict()
                              || !touch_petrifies(game.youmonst.data))) {
                if (v.foundyou) {
                    if (tmp > (j = rnd(20 + i))) {
                        if (unsolid(game.youmonst.data))
                            throw new Error('mattacku(): failed_grab() not ported yet');
                        if (mattk.aatyp !== AT_KICK
                            || !thick_skinned(game.youmonst.data))
                            sum[i] = await hitmu(mtmp, mattk);
                    } else
                        await missmu(mtmp, (tmp === j), mattk);
                } else {
                    await wildmiss(mtmp, mattk);
                    /* skip any remaining non-spell attacks */
                    skipnonmagc = true;
                }
            }
            break;

        case AT_HUGS: /* automatic if prev two attacks succeed */
            /* Note: if displaced, prev attacks never succeeded */
            if ((!v.range2 && i >= 2 && sum[i - 1] && sum[i - 2])
                || mtmp === u.ustuck)
                throw new Error('mattacku(): AT_HUGS (failed_grab()) not ported yet');
            break;

        case AT_GAZE: /* can affect you either ranged or not */
            /* Medusa gaze already operated through m_respond in
               dochug(); don't gaze more than once per round. */
            if (mdat !== mons[M.PM_MEDUSA])
                throw new Error('mattacku(): gazemu() not ported yet');
            break;

        case AT_EXPL: /* automatic hit if next to, and aimed at you */
            if (!v.range2)
                throw new Error('mattacku(): explmu() not ported yet');
            break;

        case AT_ENGL:
            if (!v.range2)
                throw new Error('mattacku(): gulpmu() not ported yet');
            break;
        case AT_BREA:
            if (v.range2)
                throw new Error('mattacku(): breamu() not ported yet');
            /* Note: breamu takes care of displacement */
            break;
        case AT_SPIT:
            if (v.range2)
                throw new Error('mattacku(): spitmu() not ported yet');
            /* Note: spitmu takes care of displacement */
            break;
        case AT_WEAP:
            if (v.range2) {
                if (!Is_rogue_level(u.uz))
                    await thrwmu(mtmp);
            } else {
                let hittmp = 0;

                /* Rare but not impossible.  Normally the monster
                 * wields when 2 spaces away, but it can be
                 * teleported or whatever....
                 */
                if (mtmp.weapon_check === NEED_WEAPON || !mtmp.mw) {
                    mtmp.weapon_check = NEED_HTH_WEAPON;
                    /* mon_wield_item resets weapon_check as appropriate */
                    if (await mon_wield_item(mtmp) !== 0)
                        break;
                }
                if (v.foundyou) {
                    mon_currwep = mtmp.mw || null; /* MON_WEP(mtmp) */
                    if (mon_currwep) {
                        const bash = (is_pole(mon_currwep)
                                      && !is_art(mon_currwep, ART_SNICKERSNEE)
                                      && m_next2u(mtmp));

                        hittmp = hitval(mon_currwep, game.youmonst);
                        tmp += hittmp;
                        await mswings(mtmp, mon_currwep, bash);
                    }
                    if (tmp > (j = game.mhitu_dieroll = rnd(20 + i)))
                        sum[i] = await hitmu(mtmp, mattk);
                    else
                        await missmu(mtmp, (tmp === j), mattk);
                    /* KMH -- Don't accumulate to-hit bonuses */
                    if (mon_currwep)
                        tmp -= hittmp;
                } else {
                    await wildmiss(mtmp, mattk);
                    /* skip any remaining non-spell attacks */
                    skipnonmagc = true;
                }
            }
            break;
        case AT_MAGC:
            if (v.range2)
                throw new Error('mattacku(): buzzmu() not ported yet');
            else
                throw new Error('mattacku(): castmu() not ported yet');
            break;

        default: /* no attack */
            break;
        }
        if (game.disp_botl)
            bot();
        /* give player a chance of waking up before dying -kaa */
        if (sum[i] === M_ATTK_HIT) { /* successful attack */
            if (u.usleep && u.usleep < game.moves && !rn2(10)) {
                game.multi = -1;
                game.nomovemsg = 'The combat suddenly awakens you.';
            }
        }
        if ((sum[i] & M_ATTK_AGR_DIED))
            return 1; /* attacker dead */
        if ((sum[i] & M_ATTK_AGR_DONE))
            break; /* attacker teleported, no more attacks */
        /* sum[i] == 0: unsuccessful attack */
    }
    return 0;
}

// C ref: mhitu.c magic_negation()
/* armor that sufficiently covers the body might be able to block magic */
export function magic_negation(mon) {
    const is_you = (mon === game.youmonst);
    let via_amul = false;
    let mc = 0;
    let gotprot = is_you ? !!game.u.uprops[PROTECTION].extrinsic
                         /* high priests have innate protection */
                         : (mon.data === mons[M.PM_HIGH_CLERIC]);

    if (!is_you)
        throw new Error('magic_negation(): monster defender not ported yet');
    for (let o = game.invent; o; o = o.nobj) {
        /* a_can field is only applicable for armor (which must be worn) */
        if ((o.owornmask & W_ARMOR) !== 0) {
            const armpro = objects[o.otyp].a_can;
            if (armpro > mc)
                mc = armpro;
        } else if ((o.owornmask & W_AMUL) !== 0) {
            via_amul = (o.otyp === AMULET_OF_GUARDING);
        }
        /* if we've already confirmed Protection, skip additional checks */
        if (is_you || gotprot)
            continue;
    }

    if (gotprot) {
        /* extrinsic Protection increases mc by 1 (2 for amulet of guarding);
           multiple sources don't provide multiple increments */
        mc += via_amul ? 2 : 1;
        if (mc > 3)
            mc = 3;
    } else if (mc < 1) {
        /* intrinsic Protection is weaker (play balance; obtaining divine
           protection is too easy); it confers minimum mc 1 instead of 0 */
        if ((is_you && ((game.u.uprops[PROTECTION].intrinsic
                         && game.u.ublessed > 0) || game.u.uspellprot))
            /* aligned priests and angels have innate intrinsic Protection */
            || (mon.data === mons[M.PM_ALIGNED_CLERIC]
                || (mon.data.mflags2 & M.M2_MINION) !== 0))
            mc = 1;
    }
    return mc;
}

// C ref: mhitu.c hitmu()
/*
 * hitmu: monster hits you
 * returns MM_ flags
 */
async function hitmu(mtmp, mattk) {
    const u = game.u;
    const mdat = mtmp.data;
    const olduasmon = game.youmonst.data;
    let res;
    const mhm = {
        hitflags: M_ATTK_MISS,
        permdmg: 0,
        specialdmg: 0,
        done: false,
        damage: 0,
    };

    if (!canspotmon(mtmp))
        map_invisible(mtmp.mx, mtmp.my);

    /*  If the monster is undetected & hits you, you should know where
     *  the attack came from.
     */
    if (mtmp.mundetected && (hides_under(mdat) || mdat.mlet === M.S_EEL))
        throw new Error('hitmu(): undetected attacker reveal not ported yet');

    /*  First determine the base damage done */
    mhm.damage = d(mattk.damn, mattk.damd);
    if ((is_undead(mdat) || is_vampshifter(mtmp)) && midnight())
        mhm.damage += d(mattk.damn, mattk.damd); /* extra dmg */

    await mhitm_adtyping(mtmp, mattk, game.youmonst, mhm);

    mhitm_knockback(mtmp, game.youmonst, mattk, mhm, !!mtmp.mw);

    if (mhm.done)
        return mhm.hitflags;

    if ((Upolyd() ? u.mh : u.uhp) < 1) {
        /* already dead? call rehumanize() or done_in_by() as appropriate */
        await mdamageu(mtmp, 1);
        mhm.damage = 0;
    }

    /*  Negative armor class reduces damage done instead of fully protecting
     *  against hits.
     */
    if (mhm.damage && u.uac < 0) {
        mhm.damage -= rnd(-u.uac);
        if (mhm.damage < 1)
            mhm.damage = 1;
    }

    if (mhm.damage > 0) {
        /* [Half_physical_damage isn't applied to mhm.permdmg] */
        if (Half_physical_damage())
            mhm.damage = Math.trunc((mhm.damage + 1) / 2);
        /* Mitre of Holiness: is_quest_artifact() isn't ported yet */

        if (mhm.permdmg) /* Death's life force drain */
            throw new Error('hitmu(): permanent damage (Death) not ported yet');

        await mdamageu(mtmp, mhm.damage);
    }

    if (mhm.damage)
        res = await passiveum(olduasmon, mtmp, mattk);
    else
        res = M_ATTK_HIT;
    stop_occupation();
    return res;
}

// C ref: hack.c showdamage()
async function showdamage(dmg) {
    if (!game.iflags?.showdamage || !dmg)
        return;

    await pline(`[HP ${-dmg}, ${Upolyd() ? game.u.mh : game.u.uhp} left]`);
}

// C ref: mhitu.c mdamageu()
/* mtmp hits you for n points damage */
export async function mdamageu(mtmp, n) {
    const u = game.u;
    if (n < 0)
        n = 0; /* impossible("mdamageu for negative damage?") */

    game.disp_botl = true;
    if (Upolyd()) {
        u.mh -= n;
        await showdamage(n);
        /* caller might have reduced mhmax before calling mdamageu() */
        if (u.mh > u.mhmax)
            u.mh = u.mhmax;
        if (u.mh < 1)
            throw new Error('mdamageu(): rehumanize() not ported yet');
    } else {
        u.uhp -= n;
        await showdamage(n);
        /* caller might have reduced uhpmax before calling mdamageu() */
        if (u.uhp > u.uhpmax)
            u.uhp = u.uhpmax;
        if (u.uhp < 1)
            throw new Error('mdamageu(): done_in_by() (hero death) not ported yet');
    }
}

// C ref: mhitu.c could_seduce()
/* returns 0 if seduction impossible,
 *         1 if fine,
 *         2 if wrong gender for nymph
 */
export function could_seduce(magr, mdef, mattk) {
    let pagr;
    let agrinvis, defperc;
    let genagr, gendef;
    let adtyp;

    if (is_animal(magr.data))
        return 0;
    if (magr === game.youmonst) {
        pagr = game.youmonst.data;
        agrinvis = Invis();
        genagr = poly_gender();
    } else {
        pagr = magr.data;
        agrinvis = magr.minvis;
        genagr = gender(magr);
    }
    adtyp = mattk ? mattk.adtyp
            : dmgtype(pagr, AD_SSEX) ? AD_SSEX
              : dmgtype(pagr, AD_SEDU) ? AD_SEDU
                : AD_PHYS;
    /* SYSOPT_SEDUCE is on in the recorded games */

    /* nymphs have two attacks, one for steal-item damage and the other
       for seduction, both pass the could_seduce() test;
       incubi/succubi have three attacks, their claw attacks for damage
       don't pass the test */
    if ((pagr.mlet !== M.S_NYMPH && pagr !== mons[M.PM_AMOROUS_DEMON])
        || (adtyp !== AD_SEDU && adtyp !== AD_SSEX && adtyp !== AD_SITM))
        return 0;

    if (mdef === game.youmonst) {
        defperc = See_invisible();
        gendef = poly_gender();
    } else {
        defperc = perceives(mdef.data);
        gendef = gender(mdef);
    }
    if (agrinvis && !defperc && adtyp === AD_SEDU)
        return 0;

    return (genagr === 1 - gendef) ? 1 : (pagr.mlet === M.S_NYMPH) ? 2 : 0;
}

// C ref: mhitu.c passiveum()
async function passiveum(olduasmon, mtmp, mattk) {
    let i, tmp;
    let oldu_mattk = null;

    void mattk; void mtmp;
    for (i = 0; !oldu_mattk; i++) {
        if (i >= NATTK)
            return M_ATTK_HIT;
        if ((olduasmon.mattk[i]?.aatyp ?? AT_NONE) === AT_NONE
            || olduasmon.mattk[i].aatyp === AT_BOOM)
            oldu_mattk = olduasmon.mattk[i] || { aatyp: AT_NONE, adtyp: AD_PHYS,
                                                  damn: 0, damd: 0 };
    }
    if (oldu_mattk.damn)
        tmp = d(oldu_mattk.damn, oldu_mattk.damd);
    else if (oldu_mattk.damd)
        tmp = d(olduasmon.mlevel + 1, oldu_mattk.damd);
    else
        tmp = 0;
    void tmp;

    /* These affect the enemy even if you were "killed" (rehumanized) */
    switch (oldu_mattk.adtyp) {
    case AD_ACID:
    case AD_STON:
    case AD_ENCH:
        throw new Error('passiveum(): acid/stoning/disenchant passives not ported yet');
    default:
        break;
    }
    if (!Upolyd())
        return M_ATTK_HIT;
    throw new Error('passiveum(): polymorphed hero passives not ported yet');
}

void mon_currwep; void Blind; void AT_GAZE;
