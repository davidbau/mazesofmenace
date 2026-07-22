// dog.js — Starting pet.
// C ref: dog.c — pet_type, makedog.

import { game } from './gstate.js';
import { rn2, rnd } from './rng.js';
import { makemon, set_malign } from './makemon.js';
import { mons, NON_PM, is_human, regenerates, M2_STALK, is_domestic, haseyes } from './monsters.js';
import { MM_EDOG, NO_MINVENT, STRAT_WAITFORU } from './const.js';
import { SCROLL_CLASS, SPBOOK_CLASS } from './objects.js';
import {
    monsterNames,
    PM_CAVE_DWELLER,
    PM_SAMURAI,
    PM_BARBARIAN,
    PM_RANGER,
} from './generated/monsters_data.js';
import { acurr, A_CHA } from './attrib.js';
import { christen_monst, Monnam } from './do_name.js';
import { monnear, m_at, see_monster_closeup } from './mon.js';
import { enexto, rloc_to } from './teleport.js';
import { put_saddle_on_mon } from './steed.js';
import { newsym, pline, canspotmon } from './display.js';
import { hero_conflict } from './mondata.js';
import { cansee } from './vision.js';
import { objectNames } from './generated/objects_data.js';

const PM_LITTLE_DOG = monsterNames.indexOf('PM_LITTLE_DOG');
const PM_KITTEN = monsterNames.indexOf('PM_KITTEN');
const PM_PONY = monsterNames.indexOf('PM_PONY');
const EXPENSIVE_CAMERA = objectNames.indexOf('EXPENSIVE_CAMERA');

function Role_if(pm) {
    return game.urole?.mnum === pm;
}

/** C invent.c carrying — first invent obj of otyp. */
function carrying(otyp) {
    if (otyp < 0) return null;
    for (const otmp of game.invent || []) {
        if ((otmp?.otyp | 0) === otyp) return otmp;
    }
    return null;
}

// C ref: dog.c pet_type()
function pet_type() {
    const rolePet = game.urole?.petnum;
    if (rolePet != null && rolePet !== NON_PM && rolePet >= 0) return rolePet;
    const pref = game.preferred_pet;
    if (pref === 'c') return PM_KITTEN;
    if (pref === 'd') return PM_LITTLE_DOG;
    return rn2(2) ? PM_KITTEN : PM_LITTLE_DOG;
}

// C ref: dog.c initedog()
function initedog(mtmp, everything) {
    if (!mtmp.edog) mtmp.edog = {};
    const edogp = mtmp.edog;
    const minhungry = (game.moves ?? 1) + 1000;
    // C: is_domestic → minimumtame 10 else 5
    const minimumtame = is_domestic(mtmp.data) ? 10 : 5;
    mtmp.mtame = Math.max(minimumtame, mtmp.mtame || 0);
    mtmp.mpeaceful = 1;
    mtmp.mavenge = 0;
    set_malign(mtmp); // C: recalc alignment now that it's tamed
    if (everything) {
        mtmp.mleashed = 0;
        mtmp.meating = 0;
        edogp.droptime = 0;
        edogp.dropdist = 10000;
        // C: ACURR(A_CHA) at makedog — before init_attr, clamps to 3
        edogp.apport = acurr(A_CHA);
        edogp.whistletime = 0;
        edogp.ogoal = { x: 0, y: 0 }; // C: ogoal.x==0 means unset
        edogp.abuse = 0;
        edogp.revivals = 0;
        edogp.mhpmax_penalty = 0;
        edogp.killed_by_u = 0;
    } else if ((edogp.apport || 0) <= 0) {
        edogp.apport = 1;
    }
    if ((edogp.hungrytime || 0) < minhungry) edogp.hungrytime = minhungry;
    // C: u.uconduct.pets++ (livelog only when !pets && in_moveloop — deferred)
    if (!game.u) game.u = {};
    if (!game.u.uconduct) game.u.uconduct = {};
    game.u.uconduct.pets = (game.u.uconduct.pets | 0) + 1;
}

// C ref: dog.c makedog()
export async function makedog() {
    if (game.preferred_pet === 'n') {
        if (!game.context) game.context = {};
        game.context.startingpet_typ = NON_PM;
        return null;
    }

    const pettype = pet_type();
    if (!game.context) game.context = {};
    game.context.startingpet_typ = pettype;

    // C: option dogname / catname / horsename, else role defaults for dogs
    let petname = (pettype === PM_LITTLE_DOG) ? (game.dogname || '')
        : (pettype === PM_KITTEN) ? (game.catname || '')
            : (pettype === PM_PONY) ? (game.horsename || '')
                : '';
    if (!petname && pettype === PM_LITTLE_DOG) {
        if (Role_if(PM_CAVE_DWELLER)) petname = 'Slasher';
        if (Role_if(PM_SAMURAI)) petname = 'Hachi';
        if (Role_if(PM_BARBARIAN)) petname = 'Idefix';
        if (Role_if(PM_RANGER)) petname = 'Sirius';
    }

    const ptr = mons(pettype);
    if (!ptr) return null;

    let mtmp = makemon(ptr, game.u?.ux ?? 0, game.u?.uy ?? 0, MM_EDOG | NO_MINVENT);
    if (!mtmp) return null;

    if (!game.context.startingpet_mid) {
        game.context.startingpet_mid = mtmp.m_id ?? 1;
        // C: initial horses wear a saddle (pauper excluded)
        if (!game.u?.uroleplay?.pauper && pettype === PM_PONY) {
            put_saddle_on_mon(null, mtmp);
        }
        // C: starting pet seen_close; photo if carrying camera (D-0999)
        if (!game.bhitpos) game.bhitpos = {};
        game.bhitpos.x = mtmp.mx | 0;
        game.bhitpos.y = mtmp.my | 0;
        game.notonhead = false;
        await see_monster_closeup(mtmp, !!carrying(EXPENSIVE_CAMERA));
    }

    // C: if (!gp.petname_used++ && *petname) christen_monst
    const used = game.petname_used || 0;
    game.petname_used = used + 1;
    if (!used && petname) mtmp = christen_monst(mtmp, petname);

    initedog(mtmp, true);
    return mtmp;
}

/**
 * C ref: mondata.c levl_follower — pets / wiz / following-shk / M2_STALK.
 * Named omissions: mon_has_amulet short-circuit for iswiz; is_fshk.
 */
export function levl_follower(mtmp) {
    if (mtmp === game.u?.usteed) return true;
    // C: iswiz && mon_has_amulet → FALSE (mon_has_amulet deferred)
    if (mtmp.mtame || mtmp.iswiz) return true;
    // C: is_fshk(mtmp) deferred
    // C: (mflags2 & M2_STALK) && (!mflee || u.uhave.amulet)
    return !!((mtmp.data?.mflags2 | 0) & M2_STALK)
        && (!mtmp.mflee || !!(game.u?.uhave?.amulet));
}

/**
 * C ref: dog.c keepdogs — move nearby followers onto mydogs before level leave.
 * pets_only path; migrate_to_level / leash / mon_has_amulet stay_behind deferred.
 */
export function keepdogs(pets_only = false) {
    const u = game.u;
    const list = game.fmon || [];
    const stay = [];
    if (!game.mydogs) game.mydogs = [];

    for (const mtmp of list) {
        if (mtmp.mhp != null && mtmp.mhp <= 0) {
            stay.push(mtmp);
            continue;
        }
        if (pets_only && !mtmp.mtame) {
            stay.push(mtmp);
            continue;
        }
        const near = monnear(mtmp, u.ux, u.uy);
        const follow = levl_follower(mtmp);
        // C: (monnear && levl_follower) || (uhave.amulet && iswiz)
        const chase = near && follow
            || (!!(game.u?.uhave?.amulet) && mtmp.iswiz);
        const helpless = !mtmp.mcanmove || mtmp.msleeping || (mtmp.mfrozen | 0) > 0;
        const waiting = !!(mtmp.mstrategy & STRAT_WAITFORU);
        if (chase && (!helpless || mtmp === u.usteed) && !waiting) {
            if (mtmp.meating || mtmp.mtrapped) {
                stay.push(mtmp);
                continue;
            }
            // C: relmon(mtmp, &mydogs) prepends — LIFO so last kept arrives first
            game.mydogs.unshift(mtmp);
            mtmp.mx = 0;
            mtmp.my = 0;
            mtmp.mlstmv = game.moves | 0;
        } else {
            stay.push(mtmp);
        }
    }
    game.fmon = stay;
}

/**
 * C ref: dog.c tamedog — obj=null magic-trap / scroll envelope, or thrown food.
 * Peaceful + edog for ordinary monsters; shop/gd/priest/human/covetous
 * rejected. Named omissions: is_demon/is_covetous/is_minion full;
 * mon_wield after tame; make_happy_shk; quest leader; scroll/spell bless bump.
 */
export async function tamedog(mtmp, obj, givemsg = true) {
    if (!mtmp) return false;
    let msg = givemsg;

    // C: scroll/spellbook → blessed_scroll then obj=NULL (bless bump deferred)
    if (obj && (obj.oclass === SCROLL_CLASS || obj.oclass === SPBOOK_CLASS)) {
        obj = null;
    }

    if (mtmp.mfrozen) mtmp.mfrozen = ((mtmp.mfrozen | 0) + 1) >> 1;
    if (mtmp.msleeping) {
        mtmp.msleeping = 0;
    }

    if (mtmp.iswiz || (mtmp.data?.mndx | 0) === monsterNames.indexOf('PM_MEDUSA')
        || ((mtmp.data?.mflags3 | 0) & 0x0010)) { // M3_WANTSARTI
        return false;
    }

    if (msg && !mtmp.mpeaceful && (mtmp.mhp == null || mtmp.mhp > 0)) {
        // canspotmon deferred — still set peaceful
        msg = false;
    }
    mtmp.mpeaceful = 1;
    set_malign(mtmp);

    mtmp.mflee = 0;
    mtmp.mfleetim = 0;

    // C: feeding treats makes already-tame pets tamer (before mtame<10 bump)
    if (mtmp.mtame && obj) {
        const { dogfood, dog_eat } = await import('./dogmove.js');
        const { DOGFOOD, ACCFOOD } = await import('./const.js');
        const { place_object } = await import('./mkobj.js');
        const { pline, canseemon } = await import('./display.js');
        const { xname, the } = await import('./objnam.js');
        const { Monnam } = await import('./do_name.js');
        const { cansee } = await import('./vision.js');

        const canmove = mtmp.mcanmove !== false && !(mtmp.mfrozen > 0);
        if (canmove && !mtmp.mconf && !mtmp.meating) {
            const tasty = dogfood(mtmp, obj);
            if (tasty === DOGFOOD
                || (tasty <= ACCFOOD
                    && (mtmp.edog?.hungrytime || 0) <= (game.moves || 1))) {
                // C: canseemon → catches; else cansee → Tobjnam stop
                if (canseemon(mtmp)) {
                    await pline(
                        `${Monnam(mtmp)} catches ${the(xname(obj))}.`,
                    );
                } else if (cansee(mtmp.mx, mtmp.my)) {
                    await pline(`${the(xname(obj))} stops.`);
                }
                place_object(obj, mtmp.mx, mtmp.my);
                await dog_eat(mtmp, obj, mtmp.mx, mtmp.my, false);
                return true;
            }
        }
        return false;
    }

    // Already tame + low: maybe bump (scroll path); magic trap uses obj null
    if (mtmp.mtame && (mtmp.mtame | 0) < 10) {
        if ((mtmp.mtame | 0) < rnd(10)) mtmp.mtame = (mtmp.mtame | 0) + 1;
        return false;
    }
    if (mtmp.isshk) return false;

    if (!mtmp.mcanmove
        || mtmp.isshk || mtmp.isgd || mtmp.ispriest || mtmp.isminion
        || is_human(mtmp.data)) {
        return false;
    }

    if (!mtmp.edog) mtmp.edog = {};
    initedog(mtmp, !(mtmp.mtame));

    // C: thrown food for newly tamed — place_object + dog_eat(devour)
    if (obj) {
        const { dog_eat } = await import('./dogmove.js');
        const { place_object } = await import('./mkobj.js');
        place_object(obj, mtmp.mx, mtmp.my);
        if ((await dog_eat(mtmp, obj, mtmp.mx, mtmp.my, true)) === 2) {
            return true;
        }
    }

    if (givemsg) {
        // pline deferred without display import cycle — caller may message
    }
    newsym(mtmp.mx, mtmp.my);
    return true;
}

/**
 * C ref: dog.c mon_arrive(With_you) — place accompanying pet near hero.
 */
function mon_arrive_with_you(mtmp) {
    const u = game.u;
    if (!game.fmon) game.fmon = [];
    game.fmon.unshift(mtmp);
    mtmp.mux = u.ux;
    mtmp.muy = u.uy;
    if (mtmp === u.usteed) return;

    const onSpot = m_at(u.ux, u.uy);
    if (!onSpot && !rn2(mtmp.mtame ? 10 : mtmp.mpeaceful ? 5 : 2)) {
        rloc_to(mtmp, u.ux, u.uy);
    } else {
        // C: mnexto — enexto near hero then rloc_to
        const mm = { x: 0, y: 0 };
        if (enexto(mm, u.ux, u.uy, mtmp.data)) rloc_to(mtmp, mm.x, mm.y);
        else rloc_to(mtmp, u.ux, u.uy);
    }
}

/**
 * C ref: dog.c losedogs — place mydogs (With_you); migrating_mons deferred.
 */
export function losedogs() {
    const dogs = game.mydogs || [];
    game.mydogs = [];
    for (const mtmp of dogs) {
        mon_arrive_with_you(mtmp);
    }
}

const LARGEST_INT = 2147483647;

/**
 * C ref: dog.c mon_catchup_elapsed_time — heal/status for time spent elsewhere.
 * Named omissions: full edog hungry→wild, leash impossible, regenerates path
 * polish; finish_meating mimic AP reset.
 */
export function mon_catchup_elapsed_time(mtmp, nmv) {
    if (!mtmp) return;
    let imv = 0;
    if (nmv >= LARGEST_INT) imv = LARGEST_INT - 1;
    else imv = nmv | 0;
    if (imv < 0) imv = 0;

    if (mtmp.mblinded) {
        if (imv >= (mtmp.mblinded | 0)) mtmp.mblinded = 1;
        else mtmp.mblinded = (mtmp.mblinded | 0) - imv;
    }
    if (mtmp.mfrozen) {
        if (imv >= (mtmp.mfrozen | 0)) mtmp.mfrozen = 1;
        else mtmp.mfrozen = (mtmp.mfrozen | 0) - imv;
    }
    if (mtmp.mfleetim) {
        if (imv >= (mtmp.mfleetim | 0)) mtmp.mfleetim = 1;
        else mtmp.mfleetim = (mtmp.mfleetim | 0) - imv;
    }

    if (mtmp.mtrapped && rn2(imv + 1) > 40 / 2) mtmp.mtrapped = 0;
    if (mtmp.mconf && rn2(imv + 1) > 50 / 2) mtmp.mconf = 0;
    if (mtmp.mstun && rn2(imv + 1) > 10 / 2) mtmp.mstun = 0;

    if (mtmp.meating) {
        if (imv > (mtmp.meating | 0)) mtmp.meating = 0;
        else mtmp.meating = (mtmp.meating | 0) - imv;
    }
    if (imv > (mtmp.mspec_used | 0)) mtmp.mspec_used = 0;
    else mtmp.mspec_used = (mtmp.mspec_used | 0) - imv;

    if (mtmp.mtame) {
        const wilder = Math.trunc((imv + 75) / 150);
        if ((mtmp.mtame | 0) > wilder) mtmp.mtame = (mtmp.mtame | 0) - wilder;
        else if ((mtmp.mtame | 0) > rn2(wilder || 1) && wilder > 0) mtmp.mtame = 0;
        else if (wilder > 0) {
            mtmp.mtame = 0;
            mtmp.mpeaceful = 0;
        }
    }

    // C: healmon — recover lost HP; non-regen divides by 20
    let heal = imv;
    if (!regenerates(mtmp.data)) heal = Math.trunc(imv / 20);
    const max = mtmp.mhpmax | 0;
    if (max > 0) {
        mtmp.mhp = Math.min(max, (mtmp.mhp | 0) + heal);
    }
    mtmp.mlstmv = game.moves | 0;
}

/**
 * C ref: dog.c wary_dog — pet revive / lifesave tameness gate.
 * Named omit: dismount_steed DISMOUNT_THROWN; pline_mon SetVoice.
 */
export async function wary_dog(mtmp, was_dead) {
    if (!mtmp) return;
    const quietly = !!was_dead;
    mtmp.meating = 0; // finish_meating subset

    if (!mtmp.mtame) return;
    const edog = !mtmp.isminion ? (mtmp.edog || mtmp.mextra?.edog) : null;

    if (edog && (edog.mhpmax_penalty | 0)) {
        mtmp.mhpmax = (mtmp.mhpmax | 0) + (edog.mhpmax_penalty | 0);
        mtmp.mhp = (mtmp.mhp | 0) + (edog.mhpmax_penalty | 0);
        edog.mhpmax_penalty = 0;
    }

    if (edog && ((edog.killed_by_u | 0) === 1 || (edog.abuse | 0) > 2)) {
        mtmp.mpeaceful = 0;
        mtmp.mtame = 0;
        if ((edog.abuse | 0) >= 0 && (edog.abuse | 0) < 10) {
            if (!rn2((edog.abuse | 0) + 1)) mtmp.mpeaceful = 1;
        }
        if (!quietly && cansee(mtmp.mx | 0, mtmp.my | 0)) {
            if (haseyes(game.youmonst?.data)) {
                if (haseyes(mtmp.data)) {
                    await pline(
                        `${Monnam(mtmp)} ${mtmp.mpeaceful ? 'seems unable' : 'refuses'} to look you in the eye.`,
                    );
                } else {
                    await pline(`${Monnam(mtmp)} avoids your gaze.`);
                }
            }
        }
    } else {
        mtmp.mtame = rn2((mtmp.mtame | 0) + 1);
        if (!mtmp.mtame) mtmp.mpeaceful = rn2(2);
    }

    if (!mtmp.mtame) {
        if (!quietly && canspotmon(mtmp)) {
            await pline(
                `${Monnam(mtmp)} ${mtmp.mpeaceful ? 'is no longer tame' : 'has become feral'}.`,
            );
        }
        newsym(mtmp.mx | 0, mtmp.my | 0);
        if (mtmp.mleashed) {
            const { m_unleash } = await import('./apply.js');
            await m_unleash(mtmp, true);
        }
        if (game.u?.usteed === mtmp) game.u.usteed = null; // dismount deferred
    } else if (edog) {
        edog.revivals = (edog.revivals | 0) + 1;
        edog.killed_by_u = 0;
        edog.abuse = 0;
        if (!edog.ogoal) edog.ogoal = { x: -1, y: -1 };
        else {
            edog.ogoal.x = -1;
            edog.ogoal.y = -1;
        }
        const moves = game.moves ?? 1;
        if (was_dead || (edog.hungrytime | 0) < moves + 500) {
            edog.hungrytime = moves + 500;
        }
        if (was_dead) {
            edog.droptime = 0;
            edog.dropdist = 10000;
            edog.whistletime = 0;
            edog.apport = 5;
        }
    }
}

/**
 * C ref: dog.c abuse_dog — reduce tameness; yelp/growl when on-map.
 * Called from hmon_hitmon_pet (and kick/zap/trap/hack callers deferred).
 * Named omissions: worm redraw on untame; Aggravate/Conflict /=2 path unverified this peel.
 */
export async function abuse_dog(mtmp) {
    if (!mtmp?.mtame) return;

    const u = game.u || {};
    const Aggravate = !!((u.HAggravate_monster | 0) || (u.EAggravate_monster | 0));
    if (Aggravate || hero_conflict()) {
        mtmp.mtame = Math.trunc((mtmp.mtame | 0) / 2);
    } else {
        mtmp.mtame = (mtmp.mtame | 0) - 1;
    }

    if (mtmp.mtame && !mtmp.isminion) {
        if (!mtmp.edog) mtmp.edog = {};
        mtmp.edog.abuse = (mtmp.edog.abuse | 0) + 1;
    }

    if (!mtmp.mtame && mtmp.mleashed) {
        const { m_unleash } = await import('./apply.js');
        await m_unleash(mtmp, true);
    }

    // C: skip sound when pet mid-leaving (mx==0)
    if ((mtmp.mx | 0) !== 0) {
        // Dynamic import avoids sounds.js ↔ uhitm.js load cycle via dog.
        const { yelp, growl } = await import('./sounds.js');
        if (mtmp.mtame && rn2(mtmp.mtame | 0)) {
            await yelp(mtmp);
        } else {
            await growl(mtmp);
        }
        if (!mtmp.mtame) {
            newsym(mtmp.mx, mtmp.my);
            // worm redraw deferred
        }
    }
}
