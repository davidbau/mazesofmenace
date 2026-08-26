// mhitu.js — a monster attacking the hero.
// C ref: src/mhitu.c
//
// mattacku() and its message/damage helpers are ported in full for the melee
// attack types; the special attack forms (gaze, explosion, engulf, breath,
// spit, cast) and the seduction/disease substitution arms need subsystems
// that are absent and are recorded through note_unported_mhitu() at the
// exact C decision point, so game.unported names what a divergence wanted.

import { game } from './gstate.js';
import { thrwmu, spitmm } from './mthrowu.js';
import { rn2, rnd, d } from './rng.js';
import { is_animal, perceives, dmgtype, gender, pronoun_gender,
         is_swimmer, thick_skinned, unsolid, hides_under, is_hider, is_demon,
         nolimbs, is_undead, is_orc, is_whirly, digests, is_flyer,
         defended, resists_cold, resists_elec, resists_fire } from './mondata.js';
import { is_vampshifter, DEADMONSTER, MON_WEP } from './monst.js';
import { poly_gender, body_part } from './polyself.js';
import { Invis, See_invisible, Underwater, Deaf, Levitation, Flying,
         Cold_resistance, Fire_resistance, Hallucination,
         Reflecting, Shock_resistance, Unaware } from './youprop.js';
import { ATTKS, MONSYMS, PMNAMES, MFLAGS } from './monst_data.js';
import { W_ARMOR, W_AMUL, NON_PM, u_at, is_pit, Upolyd, PRONOUN_HALLU,
         M_ATTK_MISS, M_ATTK_HIT, M_ATTK_AGR_DIED, M_ATTK_AGR_DONE,
         M_ATTK_DEF_DIED,
         RLOC_MSG,
         TT_PIT, WATER, P_WHIP, P_POLEARMS, NEED_WEAPON,
         NEED_HTH_WEAPON, LEFT_SIDE, RIGHT_SIDE, LEG,
         MON_EXPLODE } from './const.js';
import { ONAMES, OCLASSES } from './objects_data.js';
import { genders } from './role_data.js';
import { pline, canspotmon, canseemon, mon_visible, sensemon, bot,
         map_invisible, newsym } from './display.js';
import { cansee, couldsee } from './vision.js';
import { Monnam, pmname, rndmonnam } from './do_name.js';
import { You, You_hear } from './pline.js';
import { attacktype_fordmg, dmgtype_fromattack } from './mondata.js';
import { mon_nam } from './do_name.js';
import { Inhell, remove_monster, place_monster } from './makemon.js';
import { swallowed } from './display.js';
import { vision_recalc } from './vision.js';
import { ACURR, exercise } from './attrib.js';
import { A_CON, A_STR, A_DEX } from './const.js';
import { sobj_at } from './invent.js';
import { s_suffix } from './hacklib.js';
import { xname } from './objnam.js';
import { nomul } from './hack.js';
import { stop_occupation } from './allmain.js';
import { hitval, mon_wield_item } from './weapon.js';
import { mhitm_ad_phys, mhitm_ad_cold, mhitm_ad_elec, mhitm_ad_drst,
         mhitm_knockback } from './uhitm.js';
import { t_at } from './mon.js';
import { touch_petrifies } from './dog.js';
import { find_offensive, use_offensive } from './muse.js';
import { steal } from './steal.js';

function note_unported_mhitu(what) {
    (game.unported ||= new Set()).add(what);
}

// include/you.h:324 mhis() — possessive pronoun for a monster.
const mhis = (mtmp) => genders[pronoun_gender(mtmp, PRONOUN_HALLU)].his;

// include/objclass.h:79 — weapon strike directions.
const PIERCE = 1, SLASH = 2, WHACK = 4;

// include/obj.h is_wet_towel()
const is_wet_towel = (obj) => obj.otyp === ONAMES.TOWEL && (obj.spe | 0) > 0;

// include/hack.h AC_VALUE() — negative AC gives a random bonus, so the draw
// happens only for AC below zero.
const AC_VALUE = (AC) => (AC >= 0 ? AC : -rnd(-AC));

// src/mhitu.c:29 hitmsg() — the "<Monster> hits!" line, with the verb keyed
// to the attack type and " again" appended when the same monster lands the
// NEXT attack slot of the same type in one round. The C tracks that with a
// pointer (mattk == gh.hitmsg_prev + 1); the slot index plays that role here,
// so consecutive-turn hits with slot 0 never say "again", exactly as the
// pointer arithmetic never matches across calls.
export async function hitmsg(mtmp, mattk, indx) {
    const A = ATTKS;
    let compat;
    let verb = null, punct = '!';
    let Monst_name = Monnam(mtmp);

    /* Note: if opposite gender, "seductively";
       if same gender, "engagingly" for nymph, normal msg for others. */
    if ((compat = could_seduce(mtmp, game.youmonst, mattk)) !== 0
        && !mtmp.mcan && !mtmp.mspec_used) {
        await pline(`${Monst_name} ${
            !game.u.ublind ? 'smiles at' : !Deaf() ? 'talks to' : 'touches'
        } you ${(compat === 2) ? 'engagingly' : 'seductively'}.`);
    } else {
        switch (mattk[0]) {
        case A.AT_BITE:
            verb = 'bites';
            break;
        case A.AT_KICK:
            if (thick_skinned(game.youmonst.data))
                punct = '.';
            verb = 'kicks';
            break;
        case A.AT_STNG:
            verb = 'stings';
            break;
        case A.AT_BUTT:
            verb = 'butts';
            break;
        case A.AT_TUCH:
            verb = 'touches you';
            break;
        case A.AT_TENT:
            verb = 'tentacles suck your brain';
            Monst_name = s_suffix(Monst_name);
            break;
        case A.AT_EXPL:
        case A.AT_BOOM:
            verb = 'explodes';
            break;
        default:
            verb = 'hits';
        }
        /* if a monster hits more than once with similar attack, say so */
        const prev = game.hitmsg_prev;
        const again = (mtmp.m_id === game.hitmsg_mid
                       && prev != null
                       && indx === prev.indx + 1
                       && mattk[0] === prev.aatyp) ? ' again' : '';
        await pline(`${Monst_name} ${verb}${again}${punct}`);
    }
    game.hitmsg_mid = mtmp.m_id;
    game.hitmsg_prev = { indx, aatyp: mattk[0] };
}

// src/mhitu.c:85 missmu() — monster missed you.
export async function missmu(mtmp, nearmiss, mattk) {
    game.hitmsg_mid = 0;
    game.hitmsg_prev = null;

    if (!canspotmon(mtmp))
        map_invisible(mtmp.mx, mtmp.my);

    if (could_seduce(mtmp, game.youmonst, mattk) && !mtmp.mcan)
        await pline(`${Monnam(mtmp)} pretends to be friendly.`);
    else
        await pline(`${Monnam(mtmp)} ${
            (nearmiss && game.flags?.verbose) ? 'just ' : ''}misses!`);

    await stop_occupation();
}

// src/mhitu.c:105 mswings_verb() — strike types P|S|B: Pierce (pointed:
// stab) => "thrusts", Slash (edged: slice) or whack (blunt: Bash) =>
// "swings". The rn2(2) fires only for weapons with more than one strike
// type, so a pure-pierce dagger draws nothing.
export function mswings_verb(mwep, bash) {
    const oc = game.objects[mwep.otyp];
    const lash = (oc.oc_skill === P_WHIP || is_wet_towel(mwep));
    const thrust = ((oc.oc_dir & PIERCE) !== 0
                    && ((oc.oc_dir & ~PIERCE) === 0 || !rn2(2)));

    return bash ? 'bashes with' /*sigh*/
           : lash ? 'lashes'
             : thrust ? 'thrusts'
               : 'swings';
}

// src/mhitu.c:130 mswings() — monster swings obj.
export async function mswings(mtmp, otemp, bash) {
    if (game.flags?.verbose && !game.u.ublind && mon_visible(mtmp)) {
        await pline(`${Monnam(mtmp)} ${mswings_verb(otemp, bash)} ${
            ((otemp.quan ?? 1) > 1) ? 'one of ' : ''}${mhis(mtmp)} ${
            xname(otemp)}.`);
    }
}

// src/mhitu.c:145 mpoisons_subj() — how a poison attack was delivered.
export function mpoisons_subj(mtmp, mattk) {
    const A = ATTKS;
    if (mattk[0] === A.AT_WEAP) {
        const mwep = (mtmp === game.youmonst) ? game.u.uwep : MON_WEP(mtmp);
        /* "Foo's attack was poisoned." is pretty lame, but at least
           it's better than "sting" when not a stinging attack... */
        return (!mwep || !mwep.opoisoned) ? 'attack' : 'weapon';
    } else {
        return (mattk[0] === A.AT_TUCH) ? 'contact'
                  : (mattk[0] === A.AT_GAZE) ? 'gaze'
                       : (mattk[0] === A.AT_BITE) ? 'bite' : 'sting';
    }
}

// src/mhitu.c:176 wildmiss() — monster attacked the wrong location due to
// monster blindness, hero invisibility, hero displacement, or hero being
// underwater. The rn2(3) in the unseen arm is a draw every wild swing makes
// when the hero is visible-square-adjacent, so this is not just flavor.
async function wildmiss(mtmp, mattk) {
    const A = ATTKS;
    const unotseen = (!mtmp.mcansee
                      || (Invis() && !perceives(game.mons[mtmp.mnum])));
    const unotthere = !!game.u.uprops?.DISPLACED;
    const usubmerged = Underwater();

    if (!unotseen && !unotthere && !usubmerged) {
        /* impossible("%s attacks you without knowing your location?") */
        note_unported_mhitu('wildmiss:impossible');
        return;
    }

    /* no map_invisible() -- no way to tell where _this_ is coming from */

    if (!game.flags?.verbose)
        return;
    /* no feedback if hero doesn't see the monster's spot */
    if (!cansee(mtmp.mx, mtmp.my))
        return;
    /* maybe it's attacking an image around the corner? */

    const compat = ((mattk[1] === A.AD_SEDU || mattk[1] === A.AD_SSEX)
                    ? could_seduce(mtmp, game.youmonst, mattk) : 0);
    const Monst_name = Monnam(mtmp);

    if (unotseen) { /* !mtmp->cansee || (Invis && !perceives(mtmp->data)) */
        const swings = (mattk[0] === A.AT_BITE) ? 'snaps'
                       : (mattk[0] === A.AT_KICK) ? 'kicks'
                         : (mattk[0] === A.AT_STNG
                            || mattk[0] === A.AT_BUTT
                            || nolimbs(game.mons[mtmp.mnum])) ? 'lunges'
                           : 'swings';

        if (compat) {
            await pline(`${Monst_name} tries to touch you and misses!`);
        } else {
            switch (rn2(3)) {
            case 0:
                await pline(`${Monst_name} ${swings} wildly and misses!`);
                break;
            case 1:
                await pline(`${Monst_name} attacks a spot beside you.`);
                break;
            case 2: {
                const lev = game.level.at?.(mtmp.mux, mtmp.muy);
                const waterwall = !!lev && lev.typ === WATER;
                await pline(`${Monst_name} strikes at ${
                    waterwall ? 'empty water' : 'thin air'}!`);
                break;
            }
            default:
                await pline(`${Monst_name} ${swings} wildly!`);
                break;
            }
        }
    } else if (unotthere) { /* Displaced */
        /* give 'displaced' message even if hero is Blind */
        if (compat)
            await pline(`${Monst_name} smiles ${
                (compat === 2) ? 'engagingly' : 'seductively'
            } at your ${Invis() ? 'invisible ' : ''}displaced image...`);
        else
            await pline(`${Monst_name} strikes at your ${
                Invis() ? 'invisible ' : ''}displaced image and misses you!`);
    } else if (usubmerged) { /* Underwater */
        /* monsters may miss especially on water level where
           bubbles shake the player here and there */
        if (compat)
            await pline(`${Monst_name} reaches towards your distorted image.`);
        else
            await pline(`${Monst_name} is fooled by water reflections and misses!`);
    }
}

// src/explode.c:26 explosionmask(), elemental subset used by an exploding
// sphere. A resistant target still has vulnerable inventory destroyed, but
// takes no direct blast damage and skips the later resist() draw.
function elemental_explosion_resistance(mon, adtyp) {
    if (mon === game.youmonst) {
        if (adtyp === ATTKS.AD_FIRE)
            return Fire_resistance();
        if (adtyp === ATTKS.AD_COLD)
            return Cold_resistance();
        if (adtyp === ATTKS.AD_ELEC)
            return Shock_resistance();
        return false;
    }
    if (adtyp === ATTKS.AD_FIRE)
        return resists_fire(mon);
    if (adtyp === ATTKS.AD_COLD)
        return resists_cold(mon);
    if (adtyp === ATTKS.AD_ELEC)
        return resists_elec(mon);
    return false;
}

// src/explode.c:1018 mon_explodes() plus the elemental MON_EXPLODE slice of
// explode(). Effects are applied in column-major map order, monsters first
// and the hero last. That order controls both item-destruction and resistance
// RNG, so it is part of the game state rather than presentation detail.
async function mon_explodes_u(mtmp, mattk) {
    const adtyp = mattk[1];
    const dam = mattk[2] ? d(mattk[2], mattk[3])
              : mattk[3] ? d(game.mons[mtmp.mnum].mlevel + 1, mattk[3])
                : 0;
    const mdat = game.mons[mtmp.mnum];
    const blast = `${s_suffix(pmname(mdat, mtmp.female ? 1 : 0))} explosion`;
    const x = mtmp.mx, y = mtmp.my;
    const do_hallu = Hallucination();
    const { destroy_items, resist } = await import('./zap.js');
    const { m_at, mondead, monkilled, wake_nearto } = await import('./mon.js');

    /* The exploder dies before targets are collected, so it cannot be caught
       in its own blast. mondead() retains mx/my just as C does. */
    await mondead(mtmp);
    newsym(x, y);

    let visible = false;
    for (let xx = x - 1; xx <= x + 1; ++xx)
        for (let yy = y - 1; yy <= y + 1; ++yy)
            if (cansee(xx, yy))
                visible = true;

    if (visible) {
        /* The temporary 3x3 explosion glyph is not yet shared with zap.js.
           Restoring all cells gives the post-animation screen and preserves
           the message boundary; record the missing transient frames. */
        note_unported_mhitu('mon_explodes:visible_animation');
        for (let xx = x - 1; xx <= x + 1; ++xx)
            for (let yy = y - 1; yy <= y + 1; ++yy)
                newsym(xx, yy);
        await pline('Boom!');
    } else {
        await You_hear('a blast.');
    }

    if (dam) {
        for (let xx = x - 1; xx <= x + 1; ++xx) {
            for (let yy = y - 1; yy <= y + 1; ++yy) {
                const target = m_at(xx, yy);
                if (!target || DEADMONSTER(target))
                    continue;

                let target_blast = blast;
                if (do_hallu) {
                    let tryct = 0;
                    do {
                        target_blast = `${s_suffix(rndmonnam())} explosion`;
                    } while (target_blast[0] !== target_blast[0].toLowerCase()
                             && ++tryct < 20);
                }
                if (cansee(xx, yy))
                    await pline(`${Monnam(target)} is caught in the ${target_blast}!`);

                const itemdmg = await destroy_items(target, adtyp, dam);
                if (elemental_explosion_resistance(target, adtyp)) {
                    target.mhp -= itemdmg;
                } else {
                    let mdam = dam;
                    if (resist(target, MON_EXPLODE, 0, false))
                        mdam = Math.trunc((dam + 1) / 2);
                    if (adtyp === ATTKS.AD_FIRE && resists_cold(target))
                        mdam *= 2;
                    else if (adtyp === ATTKS.AD_COLD && resists_fire(target))
                        mdam *= 2;
                    target.mhp -= mdam + itemdmg;
                }
                if (DEADMONSTER(target))
                    await monkilled(target, '', adtyp);
            }
        }

        if (Math.abs(game.u.ux - x) <= 1
            && Math.abs(game.u.uy - y) <= 1) {
            let hero_blast = blast;
            if (do_hallu) {
                do {
                    hero_blast = `${s_suffix(rndmonnam())} explosion`;
                } while (hero_blast[0] !== hero_blast[0].toLowerCase());
            }
            if (game.flags?.verbose)
                await You(`are caught in the ${hero_blast}!`);
            await destroy_items(game.youmonst, adtyp, dam);
            if (!elemental_explosion_resistance(game.youmonst, adtyp)) {
                game.u.uhp -= dam;
                (game.disp ||= {}).botl = true;
            }
            exercise(A_STR, false);
        }
    }

    wake_nearto(x, y, Math.max(dam * dam, 50));
}

// src/mhitu.c:1591 explmu() -- a contact explosion spends its own damage
// roll before mon_explodes() rolls the actual area damage.
async function explmu(mtmp, mattk, ufound, indx) {
    if (mtmp.mcan)
        return M_ATTK_MISS;

    const tmp = d(mattk[2], mattk[3]);
    const not_affected = defended(mtmp, mattk[1]);
    if (!ufound) {
        await pline(`${canseemon(mtmp) ? Monnam(mtmp) : 'It'} explodes at a spot in thin air!`);
    } else {
        await hitmsg(mtmp, mattk, indx);
    }

    if (mattk[1] === ATTKS.AD_COLD
        || mattk[1] === ATTKS.AD_FIRE
        || mattk[1] === ATTKS.AD_ELEC) {
        await mon_explodes_u(mtmp, mattk);
    } else {
        note_unported_mhitu(`explmu:adtyp=${mattk[1]}`);
    }

    if (not_affected)
        await You('seem unaffected by it.');
    const { wake_nearto } = await import('./mon.js');
    wake_nearto(mtmp.mx, mtmp.my, 7 * 7);
    return DEADMONSTER(mtmp) ? M_ATTK_AGR_DIED : M_ATTK_MISS;
}

// src/mhitu.c:1680 gazemu(), common visibility and hallucination gates.
// Hallucination spends rn2(4) before the attack-specific switch even when
// blindness makes every ordinary gaze ineffective. The individual gaze
// effects remain recorded until their status and reflection paths land.
async function gazemu(mtmp, mattk) {
    const is_medusa = mtmp.mnum === PMNAMES.PM_MEDUSA;
    const reflectable = Reflecting() && couldsee(mtmp.mx, mtmp.my)
                        && is_medusa;
    const mcanseeu = canseemon(mtmp) && couldsee(mtmp.mx, mtmp.my)
                     && !!mtmp.mcansee;
    let cancelled = !!mtmp.mcan;

    if ((Hallucination() && rn2(4)) || (Unaware() && !reflectable))
        cancelled = true;

    /* A blind or otherwise unsensing hero cannot register these gazes. The
       C still spent the hallucination draw above, which is the important
       state transition for this path. */
    if (!mcanseeu
        && !(mattk[1] === ATTKS.AD_BLND && canseemon(mtmp)))
        return M_ATTK_MISS;

    note_unported_mhitu(`gazemu:adtyp=${mattk[1]} cancelled=${cancelled ? 1 : 0}`);
    return M_ATTK_MISS;
}

// src/mhitu.c:310 getmattk() — the attack for this slot, with substitutions.
//
// The holder cooldown substitution is live because unstuck() sets mspec_used.
// The remaining substitutions are recorded when their conditions fire.
export function getmattk(magr, mdef, indx, prev_result) {
    const A = ATTKS;
    const mptr = game.mons[magr.mnum];
    const attk = mptr.mattk[indx];

    if (mptr.mattk[0][1] === A.AD_SSEX || attk[1] === A.AD_SSEX)
        note_unported_mhitu('getmattk:SEDUCE');
    if (indx > 0 && prev_result[indx - 1] > M_ATTK_MISS
        && (attk[1] === A.AD_DISE || attk[1] === A.AD_PEST
            || attk[1] === A.AD_FAMN)
        && attk[1] === mptr.mattk[indx - 1][1])
        note_unported_mhitu('getmattk:disease_pair');

    /* src/mhitu.c:368, a holder or engulfer which just released its target
       temporarily substitutes a weak touch or claw attack. */
    if (magr.mspec_used && (attk[0] === A.AT_ENGL
                            || attk[0] === A.AT_HUGS
                            || attk[1] === A.AD_STCK
                            || attk[1] === A.AD_POLY)) {
        const alt = [...attk];
        const wimpy = alt[3] === 0;

        if (alt[1] === A.AD_ACID || alt[1] === A.AD_ELEC
            || alt[1] === A.AD_COLD || alt[1] === A.AD_FIRE) {
            alt[0] = A.AT_TUCH;
        } else {
            alt[0] = A.AT_CLAW;
            alt[1] = A.AD_PHYS;
        }
        alt[2] = 1;
        alt[3] = 6;
        if (wimpy && alt[0] === A.AT_CLAW) {
            alt[0] = A.AT_TUCH;
            alt[2] = alt[3] = 0;
        }
        return alt;
    }
    return attk;
}

// src/mhitu.c:448 calc_mattacku_vars() — some variables needed for
// mattacku(), plus the bhitpos/notonhead setup do_attack() also does.
function calc_mattacku_vars(mtmp, out) {
    const { mdistu, monnear } = mhitu_monmove;

    out.ranged = (mdistu(mtmp) > 3);
    out.range2 = !monnear(mtmp, mtmp.mux, mtmp.muy);
    out.foundyou = u_at(mtmp.mux, mtmp.muy);
    out.youseeit = canseemon(mtmp);

    /* do_attack() uses bhitpos to set/clear notonhead; do likewise here */
    game.bhitpos = { x: game.u.ux, y: game.u.uy };
    /* hero poly'd into a long worm isn't allowed to grow a tail, so
       hitting tail instead of head can't happen */
    game.notonhead = false;
}

/* js/monmove.js imports mattacku from this file, so importing mdistu and
   monnear statically here would close a module cycle at evaluation time;
   they are fetched once at first use instead. */
const mhitu_monmove = {};
async function load_monmove() {
    if (!mhitu_monmove.mdistu) {
        const m = await import('./monmove.js');
        mhitu_monmove.mdistu = m.mdistu;
        mhitu_monmove.monnear = m.monnear;
    }
}

// src/mhitu.c:466 mtrapped_in_pit() — TRUE iff monster or hero is trapped
// in a (spiked) pit.
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

// src/mhitu.c:491 mattacku() — monster attacks you. Returns 1 if the
// monster dies (e.g. "yellow light"), 0 otherwise.
//
// The melee arms (claw family and weapon) are ported in full. The engulf,
// gaze, explosion, breath, spit and spellcast arms, the swallowed/steed
// preambles, and the hider/mimic reveals that need subsystems which are
// absent, are recorded at their exact C decision points.
export async function mattacku(mtmp) {
    const A = ATTKS;
    await load_monmove();
    let mattk;
    let tmp;
    const sum = new Array(6).fill(M_ATTK_MISS);
    let mdat = game.mons[mtmp.mnum];
    /*
     * ranged: Is it near you?  Affects your actions.
     * range2: Does it think it's near you?  Affects its actions.
     * foundyou: Is it attacking you or your image?
     * youseeit: Can you observe the attack?
     * skipnonmagc: Are further physical attack attempts useless?
     */
    const v = {};
    let skipnonmagc = false;

    calc_mattacku_vars(mtmp, v);

    if (!v.ranged)
        nomul(0);
    if (DEADMONSTER(mtmp))
        return 1;
    if (Underwater() && !is_swimmer(mdat))
        return 0;

    /* If swallowed, can only be affected by u.ustuck */
    if (game.u.uswallow) {
        if (mtmp !== game.u.ustuck)
            return 0;
        game.u.ustuck.mux = game.u.ux;
        game.u.ustuck.muy = game.u.uy;
        if (game.u.uinvulnerable)
            return 0; /* stomachs can't hurt you! */
        v.range2 = 0;
        v.foundyou = 1;
    } else if (game.u.usteed) {
        if (mtmp === game.u.usteed)
            /* Your steed won't attack you */
            return 0;
        /* src/mhitu.c:533 — orcs like to steal and eat horses and the like */
        await load_monmove();
        if (!rn2(is_orc(game.mons[mtmp.mnum]) ? 2 : 4)
            && mhitu_monmove.mdistu(mtmp) <= 2 /* m_next2u */) {
            /* attack your steed instead; 'bhitpos' and 'notonhead' are
               already set from targeting hero */
            const { mattackm } = await import('./mhitm.js');
            const i = await mattackm(mtmp, game.u.usteed);
            if ((i & M_ATTK_AGR_DIED) !== 0)
                return 1;
            /* make sure steed is still alive and within range */
            if ((i & M_ATTK_DEF_DIED) !== 0 || !game.u.usteed
                || mhitu_monmove.mdistu(mtmp) > 2)
                return 0;
            /* Let your steed retaliate */
            game.bhitpos = { x: mtmp.mx, y: mtmp.my };
            game.notonhead = false;
            return ((await mattackm(game.u.usteed, mtmp))
                    & M_ATTK_DEF_DIED) ? 1 : 0;
        }
    }

    if (game.u.uundetected && !v.range2 && v.foundyou && !game.u.uswallow) {
        if (!canspotmon(mtmp))
            map_invisible(mtmp.mx, mtmp.my);
        game.u.uundetected = 0;
        if (is_hider(game.youmonst.data)
            && game.u.umonnum !== PMNAMES.PM_TRAPPER) {
            /* ceiling hider: enexto/teleds relocation and the piercer
               counterattack need subsystems that are absent */
            note_unported_mhitu('mattacku:ceiling_hider');
        } else {
            /* surface hider */
            note_unported_mhitu('mattacku:surface_hider_reveal');
            newsym(game.u.ux, game.u.uy);
        }
        return 0;
    }

    /* hero might be a mimic, concealed via #monster */
    if (game.youmonst.data.mlet === MONSYMS.S_MIMIC && game.youmonst.m_ap_type
        && !v.range2 && v.foundyou && !game.u.uswallow) {
        note_unported_mhitu('mattacku:hero_mimic');
        return 0;
    }

    /* non-mimic hero might be mimicking an object after eating m corpse */
    if (game.youmonst.m_ap_type === 2 /* M_AP_OBJECT */ && !v.range2
        && v.foundyou && !game.u.uswallow) {
        note_unported_mhitu('mattacku:hero_ap_object');
        return 0;
    }

    /*  Work out the armor class differential   */
    tmp = AC_VALUE(game.u.uac) + 10; /* tmp ~= 0 - 20 */
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
    if (mdat.mlet === MONSYMS.S_EEL && mtmp.minvis
        && cansee(mtmp.mx, mtmp.my)) {
        mtmp.minvis = 0;
        newsym(mtmp.mx, mtmp.my);
    }

    /* when not cancelled and not in current form due to shapechange, many
       demons can summon more demons and were creatures can summon critters */
    if ((mtmp.cham ?? NON_PM) === NON_PM && !mtmp.mcan && !v.range2
        && (is_demon(mdat) || (mdat.mflags2 & MFLAGS.M2_WERE) !== 0)) {
        const already_fleeing = !!mtmp.mflee;

        await summonmu(mtmp, v.youseeit);
        if (mtmp.mflee && !already_fleeing)
            return 0;
        mdat = mtmp.data;
    }

    if (game.u.uinvulnerable) { /* in the midst of successful prayer */
        /* monsters won't attack you */
        if (mtmp === game.u.ustuck) {
            await pline(`${Monnam(mtmp)} loosens its grip slightly.`);
        } else if (!v.range2) {
            if (v.youseeit || sensemon(mtmp))
                await pline(`${Monnam(mtmp)} starts to attack you, but pulls back.`);
            else
                await pline('You feel something move nearby.');
        }
        return 0;
    }

    /* Unlike defensive stuff, don't let them use item _and_ attack. */
    if (find_offensive(mtmp)) {
        const offended = await use_offensive(mtmp);
        if (offended)
            return offended === 1 ? 1 : 0;
    }

    game.skipdrin = false; /* [see mattackm(mhitm.c)] */
    const firstfoundyou = v.foundyou;

    for (let i = 0; i < 6; i++) {
        sum[i] = M_ATTK_MISS;
        /* counterattack against attack [i-1] might have been fatal */
        if (DEADMONSTER(mtmp))
            return 1;
        if (i > 0) {
            /* recalc in case prior attack moved hero */
            calc_mattacku_vars(mtmp, v);
            /* if hero was found but isn't anymore, avoid wildmiss now */
            if (firstfoundyou && !v.foundyou)
                continue;
            if (!u_at(game.bhitpos.x, game.bhitpos.y))
                continue;
        }
        game.mon_currwep = null;
        mattk = getmattk(mtmp, game.youmonst, i, sum);
        if ((game.u.uswallow && mattk[0] !== A.AT_ENGL)
            || (skipnonmagc && mattk[0] !== A.AT_MAGC)
            || (game.skipdrin && mattk[0] === A.AT_TENT
                && mattk[1] === A.AD_DRIN))
            continue;

        let j;
        switch (mattk[0]) {
        case A.AT_CLAW: /* "hand to hand" attacks */
        case A.AT_KICK:
        case A.AT_BITE:
        case A.AT_STNG:
        case A.AT_TUCH:
        case A.AT_BUTT:
        case A.AT_TENT:
            if (mattk[0] === A.AT_KICK && mtrapped_in_pit(mtmp))
                continue;
            if (!v.range2 && (!MON_WEP(mtmp) || mtmp.mconf
                              || game.u.uprops?.CONFLICT
                              || !touch_petrifies(game.youmonst.data))) {
                if (v.foundyou) {
                    if (tmp > (j = rnd(20 + i))) {
                        if (unsolid(game.youmonst.data)) {
                            /* failed_grab() needs the grab bookkeeping */
                            note_unported_mhitu('mattacku:failed_grab');
                        }
                        if (mattk[0] !== A.AT_KICK
                            || !thick_skinned(game.youmonst.data))
                            sum[i] = await hitmu(mtmp, mattk, i);
                    } else
                        await missmu(mtmp, (tmp === j), mattk);
                } else {
                    await wildmiss(mtmp, mattk);
                    /* skip any remaining non-spell attacks */
                    skipnonmagc = true;
                }
            }
            break;

        case A.AT_HUGS: /* automatic if prev two attacks succeed */
            /* Note: if displaced, prev attacks never succeeded */
            if ((!v.range2 && i >= 2 && sum[i - 1] && sum[i - 2])
                || mtmp === game.u.ustuck) {
                if (unsolid(game.youmonst.data))
                    note_unported_mhitu('mattacku:failed_grab');
                sum[i] = await hitmu(mtmp, mattk, i);
            }
            break;

        case A.AT_GAZE: /* can affect you either ranged or not */
            if (mdat !== game.mons[PMNAMES.PM_MEDUSA])
                sum[i] = await gazemu(mtmp, mattk);
            break;

        case A.AT_EXPL: /* automatic hit if next to, and aimed at you */
            if (!v.range2)
                sum[i] = await explmu(mtmp, mattk, v.foundyou, i);
            break;

        case A.AT_ENGL:
            if (!v.range2) {
                if (v.foundyou) {
                    /* src/mhitu.c:848 — the engulf to-hit roll fires
                       before the swallow */
                    if (game.u.uswallow
                        || (!mtmp.mspec_used && tmp > (j = rnd(20 + i)))) {
                        /* flush_screen(1): our writes flush per cell */
                        sum[i] = await gulpmu(mtmp, mattk);
                    } else {
                        await missmu(mtmp, (tmp === j), mattk);
                    }
                } else if (digests(mdat)) {
                    await pline(`${Monnam(mtmp)} gulps some air!`);
                } else {
                    if (v.youseeit)
                        await pline(`${Monnam(mtmp)} lunges forward and recoils!`);
                    else
                        await You_hear(`a ${is_whirly(mdat)
                            ? 'rushing noise' : 'splat'} nearby.`);
                }
            }
            break;
        case A.AT_BREA:
            if (v.range2)
                note_unported_mhitu('mattacku:breamu');
            break;
        case A.AT_SPIT:
            if (v.range2)
                sum[i] = await spitmm(mtmp, mattk, game.youmonst);
            break;
        case A.AT_WEAP:
            if (v.range2) {
                if (!game.level?.flags?.is_rogue_level)
                    await thrwmu(mtmp);
            } else {
                let hittmp = 0;

                /* Rare but not impossible.  Normally the monster
                 * wields when 2 spaces away, but it can be
                 * teleported or whatever....
                 */
                if (mtmp.weapon_check === NEED_WEAPON || !MON_WEP(mtmp)) {
                    mtmp.weapon_check = NEED_HTH_WEAPON;
                    /* mon_wield_item resets weapon_check as appropriate */
                    if (await mon_wield_item(mtmp) !== 0)
                        break;
                }
                if (v.foundyou) {
                    game.mon_currwep = MON_WEP(mtmp);
                    if (game.mon_currwep) {
                        /* C also excludes ART_SNICKERSNEE, but that artifact
                           is a katana, which is_pole() already rejects */
                        const bash = (is_pole(game.mon_currwep)
                                      && mhitu_monmove.mdistu(mtmp) <= 2);

                        hittmp = hitval(game.mon_currwep, game.youmonst);
                        tmp += hittmp;
                        await mswings(mtmp, game.mon_currwep, bash);
                    }
                    if (tmp > (j = game.mhitu_dieroll = rnd(20 + i)))
                        sum[i] = await hitmu(mtmp, mattk, i);
                    else
                        await missmu(mtmp, (tmp === j), mattk);
                    /* KMH -- Don't accumulate to-hit bonuses */
                    if (game.mon_currwep)
                        tmp -= hittmp;
                } else {
                    await wildmiss(mtmp, mattk);
                    /* skip any remaining non-spell attacks */
                    skipnonmagc = true;
                }
            }
            break;
        case A.AT_MAGC:
            if (v.range2)
                note_unported_mhitu('mattacku:buzzmu');
            else
                note_unported_mhitu('mattacku:castmu');
            break;

        default: /* no attack */
            break;
        }
        if (game.disp?.botl) {
            await bot();
            game.disp.botl = false;
        }
        /* give player a chance of waking up before dying -kaa */
        if (sum[i] === M_ATTK_HIT) { /* successful attack */
            if (game.u.usleep && game.u.usleep < game.moves && !rn2(10)) {
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

// src/mhitu.c:956 summonmu() demon arm
async function summonmu(mtmp, youseeit) {
    const mdat = mtmp.data;

    if (is_demon(mdat)) {
        if (mdat !== game.mons[PMNAMES.PM_BALROG]
            && mdat !== game.mons[PMNAMES.PM_AMOROUS_DEMON]) {
            if (!rn2(Inhell() ? 10 : 16)) {
                const { msummon } = await import('./minion.js');
                await msummon(mtmp);
            }
        }
        return;
    }

    if ((mdat.mflags2 & MFLAGS.M2_WERE) !== 0)
        note_unported_mhitu('summonmu:were');
}

/* include/obj.h is_pole() */
export function is_pole(obj) {
    return game.objects[obj.otyp].oc_skill === P_POLEARMS
           || obj.otyp === ONAMES.LANCE;
}


// src/mhitu.c:1089 magic_negation() — the magic cancellation factor worn
// armor gives its wearer; the best a_can among worn pieces. The extrinsic
// Protection arms (rings, amulet of guarding, divine protection) key on
// state fresh heroes lack and are recorded when present.
export function magic_negation(mon) {
    const is_you = (mon === null || mon === game.u || mon === game.youmonst);
    let mc = 0;

    const chain = is_you ? (game.invent || []) : (mon.minvent || []);
    for (const o of chain) {
        if ((o.owornmask ?? 0) & W_ARMOR) {
            const armpro = game.objects[o.otyp].a_can | 0;
            if (armpro > mc)
                mc = armpro;
        } else if ((o.owornmask ?? 0) & W_AMUL) {
            if (o.otyp === ONAMES.AMULET_OF_GUARDING)
                note_unported_mhitu('magic_negation:amulet_of_guarding');
        }
    }

    if (is_you && (game.u.uprops?.PROTECTION?.extrinsic
                   || game.u.uspellprot))
        note_unported_mhitu('magic_negation:protection');

    return mc;
}

// src/mhitu.c:1144 hitmu() — monster hits you. Returns M_ATTK flags.
async function hitmu(mtmp, mattk, indx) {
    const A = ATTKS;
    const mdat = game.mons[mtmp.mnum];
    const olduasmon = game.youmonst.data;
    let res;
    const mhm = {
        damage: 0,
        hitflags: M_ATTK_MISS,
        permdmg: 0,
        specialdmg: 0,
        done: false,
        indx,
    };

    if (!canspotmon(mtmp))
        map_invisible(mtmp.mx, mtmp.my);

    /*  If the monster is undetected & hits you, you should know where
     *  the attack came from.
     */
    if (mtmp.mundetected
        && (hides_under(mdat) || mdat.mlet === MONSYMS.S_EEL)) {
        mtmp.mundetected = 0;
        /* the "was hidden under" message needs doname/Amonnam plumbing for
           the object underneath; the reveal itself must still happen */
        note_unported_mhitu('hitmu:hidden_under_reveal');
        newsym(mtmp.mx, mtmp.my);
    }

    /*  First determine the base damage done */
    mhm.damage = d(mattk[2], mattk[3]);
    if ((is_undead(mdat) || is_vampshifter(mtmp)) && midnight())
        mhm.damage += d(mattk[2], mattk[3]); /* extra dmg */

    /* mhitm_adtyping: dispatch on the damage type */
    if (mattk[1] === A.AD_PHYS) {
        await mhitm_ad_phys(mtmp, mattk, game.youmonst, mhm);
    } else if (mattk[1] === A.AD_COLD) {
        await mhitm_ad_cold(mtmp, mattk, game.youmonst, mhm);
    } else if (mattk[1] === A.AD_ELEC) {
        mhm.indx = indx;
        await mhitm_ad_elec(mtmp, mattk, game.youmonst, mhm);
    } else if (mattk[1] === A.AD_DRST || mattk[1] === A.AD_DRDX
               || mattk[1] === A.AD_DRCO) {
        await mhitm_ad_drst(mtmp, mattk, game.youmonst, mhm);
    } else if (mattk[1] === A.AD_LEGS) {
        const side = rn2(2) ? RIGHT_SIDE : LEFT_SIDE;
        const sidestr = side === RIGHT_SIDE ? 'right' : 'left';
        const leg = body_part(LEG);

        if ((game.u.usteed || Levitation() || Flying()) && !is_flyer(mdat)) {
            await pline(`${Monnam(mtmp)} tries to reach your ${sidestr} ${leg}!`);
            mhm.damage = 0;
        } else if (mtmp.mcan) {
            await pline(`${Monnam(mtmp)} nuzzles against your ${sidestr} ${leg}!`);
            mhm.damage = 0;
        } else {
            const boots = game.u.uarmf;
            if (boots) {
                if (rn2(2) && (boots.otyp === ONAMES.LOW_BOOTS
                               || boots.otyp === ONAMES.IRON_SHOES)) {
                    await pline(`${Monnam(mtmp)} pricks the exposed part of your ${sidestr} ${leg}!`);
                } else if (!rn2(5)) {
                    await pline(`${Monnam(mtmp)} pricks through your ${sidestr} boot!`);
                } else {
                    await pline(`${Monnam(mtmp)} scratches your ${sidestr} boot!`);
                    mhm.damage = 0;
                    return M_ATTK_HIT;
                }
            } else {
                await pline(`${Monnam(mtmp)} pricks your ${sidestr} ${leg}!`);
            }

            const { set_wounded_legs } = await import('./do.js');
            await set_wounded_legs(side, rnd(60 - ACURR(A_DEX)));
            exercise(A_STR, false);
            exercise(A_DEX, false);
        }
    } else if (mattk[1] === A.AD_SITM || mattk[1] === A.AD_SEDU) {
        mhm.damage = 0;
        if (is_animal(mtmp.data)) {
            await hitmsg(mtmp, mattk, indx);
            if (mtmp.mcan)
                return mhm.hitflags;
        } else if (mtmp.mcan) {
            note_unported_mhitu('hitmu:cancelled_seduction');
            return mhm.hitflags;
        }

        const stolenName = {};
        const stolen = await steal(mtmp, stolenName);
        if (stolen < 0) {
            mhm.hitflags = M_ATTK_AGR_DIED;
            mhm.done = true;
        } else if (stolen > 0) {
            if (!is_animal(mtmp.data)) {
                const { tele_restrict, rloc } = await import('./teleport.js');
                if (!await tele_restrict(mtmp))
                    await rloc(mtmp, RLOC_MSG);
            } else if (stolenName.value && canseemon(mtmp)) {
                note_unported_mhitu('hitmu:animal_theft_message');
            }
            const { monflee } = await import('./monmove.js');
            monflee(mtmp, 0, false, false);
            mhm.hitflags = M_ATTK_AGR_DONE;
            mhm.done = true;
        }
    } else {
        note_unported_mhitu(`hitmu:adtyp=${mattk[1]}`);
        /* the generic arms still print the plain hit message */
        await hitmsg(mtmp, mattk, indx);
        mhm.hitflags |= M_ATTK_HIT;
    }

    mhitm_knockback(mtmp, game.youmonst, mattk, mhm, (MON_WEP(mtmp) != null));

    if (mhm.done)
        return mhm.hitflags;

    if ((Upolyd(game.u) ? game.u.mh : game.u.uhp) < 1) {
        /* already dead? call rehumanize() or done_in_by() as appropriate */
        await mdamageu(mtmp, 1);
        mhm.damage = 0;
    }

    /*  Negative armor class reduces damage done instead of fully protecting
     *  against hits.
     */
    if (mhm.damage && game.u.uac < 0) {
        mhm.damage -= rnd(-game.u.uac);
        if (mhm.damage < 1)
            mhm.damage = 1;
    }

    if (mhm.damage > 0) {
        /* [Half_physical_damage isn't applied to mhm.permdmg] */
        if (game.u.uprops?.HALF_PHDAM)
            mhm.damage = ((mhm.damage + 1) / 2) | 0;

        if (mhm.permdmg) { /* Death's life force drain */
            note_unported_mhitu('hitmu:permdmg');
        }

        await mdamageu(mtmp, mhm.damage);
    }

    if (mhm.damage)
        res = passiveum(olduasmon, mtmp, mattk);
    else
        res = M_ATTK_HIT;
    await stop_occupation();
    return res;
}

/* include/hack.h midnight() — the in-game clock (svh.hour) is not tracked;
   an undead attacker at real midnight would double its dice. Recorded when
   the guard is reached so the gap is visible. */
function midnight() {
    note_unported_mhitu('hitmu:midnight');
    return false;
}

// src/mhitu.c:1902 mdamageu() — apply n points of damage to the hero.
export async function mdamageu(mtmp, n) {
    if (n < 0)
        n = 0;

    (game.disp ||= {}).botl = true;
    if (Upolyd(game.u)) {
        game.u.mh -= n;
        showdamage(n);
        if (game.u.mh > game.u.mhmax)
            game.u.mh = game.u.mhmax;
        if (game.u.mh < 1)
            note_unported_mhitu('mdamageu:rehumanize');
    } else {
        const shownHp = game.u.uhp;
        game.u.uhp -= n;
        showdamage(n);
        if (game.u.uhp > game.u.uhpmax)
            game.u.uhp = game.u.uhpmax;
        if (game.u.uhp < 1) {
            const pending = game._pending_message || '';
            if (game.u.uhp === -1 && pending) {
                game._deferred_status_hp_until_more = Math.max(shownHp | 0, 0);
                game._deferred_status_hp_more_count = game.u.uprops?.LIFESAVED
                    || pending.includes('  Boing!  ')
                    ? 1 : 2;
            }
            const { done_in_by, DIED } = await import('./end.js');
            await done_in_by(mtmp, DIED);
        }
    }
}

/* src/hack.c:4247 showdamage() — gated on the 'showdamage' option, which
   defaults off; the message internals are recorded if it is ever on. */
function showdamage(dmg) {
    if (!game.rc?.opts?.showdamage || !dmg)
        return;
    note_unported_mhitu('showdamage:message');
}

// src/sys.c:100 sysopt.seduce — "if it's compiled in, default to on", and the
// SEDUCE=0 line in sys/unix/sysconf is commented out, so this is 1.
const SYSOPT_SEDUCE = 1;

// src/mhitu.c:1934 could_seduce() — 0 no, 1 yes, 2 "nymph-style".
//
// mattk non-Null asks about THIS attack; Null asks whether the monster has the
// capability at all.
//
// The return value is not a boolean and the two non-zero values differ on
// screen: hitmm prints "engagingly" for 2 and "seductively" for 1.
export function could_seduce(magr, mdef, mattk) {
    let pagr, agrinvis, genagr, defperc, gendef;

    if (is_animal(magr.data))
        return 0;

    if (magr === game.youmonst) {
        pagr = game.youmonst.data;
        agrinvis = Invis();
        genagr = poly_gender();
    } else {
        pagr = magr.data;
        agrinvis = !!magr.minvis;
        genagr = gender(magr);
    }
    if (mdef === game.youmonst) {
        defperc = See_invisible();
        gendef = poly_gender();
    } else {
        defperc = perceives(mdef.data);
        gendef = gender(mdef);
    }

    let adtyp = mattk ? mattk[1]
              : dmgtype(pagr, ATTKS.AD_SSEX) ? ATTKS.AD_SSEX
              : dmgtype(pagr, ATTKS.AD_SEDU) ? ATTKS.AD_SEDU
              : ATTKS.AD_PHYS;
    if (adtyp === ATTKS.AD_SSEX && !SYSOPT_SEDUCE)
        adtyp = ATTKS.AD_SEDU;

    if (agrinvis && !defperc && adtyp === ATTKS.AD_SEDU)
        return 0;

    /* nymphs have two attacks, one for steal-item damage and the other
       for seduction, both pass the could_seduce() test;
       incubi/succubi have three attacks, their claw attacks for damage
       don't pass the test */
    if ((pagr.mlet !== MONSYMS.S_NYMPH && pagr.pmidx !== PMNAMES.PM_AMOROUS_DEMON)
        || (adtyp !== ATTKS.AD_SEDU && adtyp !== ATTKS.AD_SSEX
            && adtyp !== ATTKS.AD_SITM))
        return 0;

    return (genagr === 1 - gendef) ? 1
         : (pagr.mlet === MONSYMS.S_NYMPH) ? 2 : 0;
}

// src/mhitu.c:2435 passiveum() — the hero's passive counterattack.
//
// The slot walk lands on the first AT_NONE or AT_BOOM row of the hero's
// (possibly former) monster form. A normal hero's row is all-zero: no dice,
// AD_PHYS, so nothing happens and nothing is drawn. The polymorphed arms
// (acid splash, cockatrice touch, disenchant) are recorded.
function passiveum(olduasmon, mtmp, mattk) {
    const A = ATTKS;
    let i, oldu_mattk = null;

    for (i = 0; !oldu_mattk; i++) {
        if (i >= 6)
            return M_ATTK_HIT;
        if (olduasmon.mattk[i][0] === A.AT_NONE
            || olduasmon.mattk[i][0] === A.AT_BOOM)
            oldu_mattk = olduasmon.mattk[i];
    }
    let tmp;
    if (oldu_mattk[2])
        tmp = d(oldu_mattk[2], oldu_mattk[3]);
    else if (oldu_mattk[3])
        tmp = d(olduasmon.mlevel + 1, oldu_mattk[3]);
    else
        tmp = 0;

    /* These affect the enemy even if you were "killed" (rehumanized) */
    switch (oldu_mattk[1]) {
    case A.AD_ACID:
        note_unported_mhitu('passiveum:AD_ACID');
        return M_ATTK_HIT;
    case A.AD_STON: /* cockatrice */
        note_unported_mhitu('passiveum:AD_STON');
        return M_ATTK_HIT;
    case A.AD_ENCH: /* KMH -- remove enchantment (disenchanter) */
        note_unported_mhitu('passiveum:AD_ENCH');
        return M_ATTK_HIT;
    default:
        break;
    }
    if (!Upolyd(game.u))
        return M_ATTK_HIT;

    /* These affect the enemy only if you are still a monster */
    if (rn2(3)) {
        if (oldu_mattk[1] && tmp)
            note_unported_mhitu(`passiveum:adtyp=${oldu_mattk[1]}`);
    }
    return M_ATTK_HIT;
}

// src/mhitu.c:264 expels() — release the hero from an engulfer.
export async function expels(mtmp, mdat, message) {
    (game.disp ||= {}).botl = true;
    if (message) {
        if (digests(mdat)) {
            await pline('You get regurgitated!');
        } else if (enfolds(mdat)) {
            await pline(`${Monnam(mtmp)} unfolds and you are released!`);
        } else {
            const attk = attacktype_fordmg(mdat, ATTKS.AT_ENGL, -1);
            let blast = '';
            if (attk) {
                if (is_whirly(mdat)) {
                    if (attk[1] === ATTKS.AD_ELEC)
                        blast = ' in a shower of sparks';
                    else if (attk[1] === ATTKS.AD_COLD)
                        blast = ' in a blast of frost';
                } else
                    blast = ' with a squelch';
                await pline(`You get expelled from ${mon_nam(mtmp)}${blast}!`);
            }
        }
    }
    const { unstuck, mnexto } = await import('./mon.js');
    await unstuck(mtmp);    /* clears uswallow, moves hero, docrt */
    mnexto(mtmp, 0 /* RLOC_NOMSG */);
    newsym(game.u.ux, game.u.uy);
    if (Math.max(Math.abs(mtmp.mx - game.u.ux),
                 Math.abs(mtmp.my - game.u.uy)) > 1)
        await pline('Brrooaa...  You land hard at some distance.');
    const { spoteffects } = await import('./hack.js');
    await spoteffects(true);
}

/* include/mondata.h:73 enfolds() — trapper/lurker-above fold-around */
const enfolds = (ptr) =>
    dmgtype_fromattack(ptr, ATTKS.AD_WRAP, ATTKS.AT_ENGL) != null;

// src/mhitu.c:1289 gulpmu() — monster swallows you, or damages you when
// already swallowed.
async function gulpmu(mtmp, mattk) {
    const u = game.u;
    const mdat = game.mons[mtmp.mnum];
    let tmp = d(mattk[2], mattk[3]);
    let tim_tmp;
    let physical_damage = false;

    if (!u.uswallow) { /* swallows you */
        const omx = mtmp.mx, omy = mtmp.my;

        if (!engulf_target_u(mtmp))
            return M_ATTK_MISS;
        const t = t_at(u.ux, u.uy);
        if (t && is_pit(t.ttyp) && sobj_at(ONAMES.BOULDER, u.ux, u.uy))
            return M_ATTK_MISS;
        /* failed_grab: hero is solid, never passes */

        /* Punished unplacebc: no session is punished */
        remove_monster(omx, omy);
        mtmp.mtrapped = 0; /* no longer on old trap */
        place_monster(mtmp, u.ux, u.uy);
        set_ustuck_mh(mtmp);
        newsym(mtmp.mx, mtmp.my);
        /* steed dismount arm: no session rides into an engulfer */
        await pline(`${Monnam(mtmp)} ${
            digests(mdat) ? 'swallows you whole'
            : enfolds(mdat) ? 'folds itself around you'
              : 'engulfs you'}!`);
        await stop_occupation();
        /* reset_occupations(): behave as if you had moved */

        if (u.utrap) {
            await pline(`You are released from the ${
                u.utraptype === 1 /* TT_WEB */ ? 'web' : 'trap'}!`);
            u.utrap = 0;
            u.utraptype = 0;
        }
        /* leashes snap: no session leashes a pet */

        /* touch_petrifies hero form: not reachable unpolymorphed */

        vision_recalc(2); /* hero can't see anything */
        u.uswallow = 1;
        if (mattk[1] === ATTKS.AD_DGST) {
            /* good armor & high Con make digestion take longer */
            tim_tmp = ACURR(A_CON) + 10 - u.uac + rn2(20);
            if (tim_tmp < 0)
                tim_tmp = 0;
            tim_tmp = Math.trunc(tim_tmp / mtmp.m_lev);
            tim_tmp += 3;
        } else {
            /* higher level attacker takes longer to eject hero;
               C's expression is m_lev + (10 / 2) by precedence */
            tim_tmp = rnd(mtmp.m_lev + 5);
        }
        u.uswldtim = (tim_tmp < 2) ? 2 : tim_tmp;
        await swallowed(1); /* the engulf interior display */
        if (!(mdat.mflags2 & 0 /* flaming() */)) {
            /* snuff_lit over invent: lit lamps go out; recorded when a
               session carries one into an engulfer */
            if ((game.invent || []).some(o => o.lamplit))
                note_unported_mhitu('gulpmu:snuff_lit');
        }
    }

    if (mtmp !== u.ustuck)
        return M_ATTK_MISS;
    if (u.uswldtim > 0)
        u.uswldtim -= 1;

    switch (mattk[1]) {
    case ATTKS.AD_DGST:
        physical_damage = true;
        if (game.u.uprops?.SLOW_DIGESTION) {
            u.uswldtim = 0;
            tmp = 0;
        } else if (u.uswldtim === 0) {
            await pline(`${Monnam(mtmp)} totally digests you!`);
            tmp = u.uhp;
        } else {
            await pline(`${Monnam(mtmp)}${
                u.uswldtim === 2 ? ' thoroughly'
                : u.uswldtim === 1 ? ' utterly' : ''} digests you!`);
            exercise(A_STR, false);
        }
        break;
    case ATTKS.AD_PHYS:
        physical_damage = true;
        if (mtmp.mnum === PMNAMES.PM_FOG_CLOUD) {
            await pline('You are laden with moisture and can barely breathe!');
            /* flaming/Breathless/amphibious hero forms not reachable */
        } else {
            await pline(`You are ${enfolds(mdat) ? 'being squashed'
                                                 : 'pummeled with debris'}!`);
            exercise(A_STR, false);
        }
        break;
    case ATTKS.AD_ACID:
        if (game.u.uprops?.ACID_RES) {
            await pline('You are covered with a seemingly harmless goo.');
            tmp = 0;
        } else {
            if (game.u.uprops?.HALLUC && !game.u.uprops?.HALLUC_RES)
                await pline("Ouch!  You've been slimed!");
            else
                await pline('You are covered in slime!  It burns!');
            exercise(A_STR, false);
        }
        break;
    case ATTKS.AD_BLND:
        note_unported_mhitu('gulpmu:AD_BLND');
        tmp = 0;
        break;
    case ATTKS.AD_ELEC:
        if (!mtmp.mcan && rn2(2)) {
            await pline('The air around you crackles with electricity.');
            if (game.u.uprops?.SHOCK_RES) {
                note_unported_mhitu('gulpmu:shieldeff');
                tmp = 0;
            }
        } else
            tmp = 0;
        break;
    case ATTKS.AD_COLD:
        if (!mtmp.mcan && rn2(2)) {
            if (game.u.uprops?.COLD_RES) {
                note_unported_mhitu('gulpmu:shieldeff');
                tmp = 0;
            } else {
                await pline('You are freezing to death!');
            }
        } else
            tmp = 0;
        break;
    case ATTKS.AD_FIRE:
        if (!mtmp.mcan && rn2(2)) {
            if (game.u.uprops?.FIRE_RES) {
                note_unported_mhitu('gulpmu:shieldeff');
                tmp = 0;
            } else {
                await pline('You are burning to a crisp!');
            }
        } else
            tmp = 0;
        break;
    case ATTKS.AD_DREN:
        if (!mtmp.mcan && rn2(4)) {
            const { drain_en } = await import('./trap.js');
            await drain_en(tmp, false);
        }
        tmp = 0;
        break;
    default:
        physical_damage = true;
        tmp = 0;
        break;
    }

    if (physical_damage) {
        /* same damage reduction for AC as in hitmu */
        if (u.uac < 0)
            tmp -= rnd(-u.uac);
        if (tmp < 0)
            tmp = 1;
        /* Maybe_Half_Phys: no half-damage sources reachable */
    }

    game.mswallower = mtmp;
    await mdamageu(mtmp, tmp);
    game.mswallower = null;
    if (tmp)
        await stop_occupation();

    if (!u.uswallow) {
        ; /* life-saving has already expelled swallowed hero */
    } else if (!u.uswldtim || game.mons[game.u.umonnum ?? -1]?.msize >= 6) {
        await pline(`You get ${digests(mdat) ? 'regurgitated'
                    : enfolds(mdat) ? 'released' : 'expelled'}!`);
        if (game.flags?.verbose
            && digests(mdat) && game.u.uprops?.SLOW_DIGESTION)
            await pline(`Obviously ${mon_nam(mtmp)} doesn't like your taste.`);
        await expels(mtmp, mdat, false);
    }
    return M_ATTK_HIT;
}

// src/mhitm.c:807 engulf_target(), the hero-defender slice.
function engulf_target_u(magr) {
    const u = game.u;
    const herodata = game.youmonst?.data ?? game.mons[game.urole?.mnum] ?? {};

    /* can't swallow something that's too big; the unpolymorphed hero is
       human-sized (MZ_HUMAN 2 < MZ_HUGE 4) */
    if ((herodata.msize ?? 2) >= 4 /* MZ_HUGE */
        || ((game.mons[magr.mnum].msize ?? 0) < (herodata.msize ?? 2)
            && !is_whirly(game.mons[magr.mnum])))
        return false;

    if (u.utrap || magr.mtrapped)
        return false;

    /* phasing-in-rock placement guards: no session phases */
    return true;
}

function set_ustuck_mh(mtmp) {
    /* routed through mon.js at call time to avoid deepening the cycle */
    (game.disp ||= {}).botl = true;
    game.u.ustuck = mtmp;
}
