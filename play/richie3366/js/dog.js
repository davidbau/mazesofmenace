// dog.js — Starting pet + figurine/spell familiar.
// C ref: dog.c — pet_type, makedog, pick_familiar_pm, make_familiar.

import { game } from './gstate.js';
import { rn2, rnd, rn1 } from './rng.js';
import { makemon, set_malign, rndmonst_adj } from './makemon.js';
import { mons, NON_PM, is_human, regenerates, M2_STALK, is_domestic, haseyes } from './monsters.js';
import {
    MM_EDOG, MM_IGNOREWATER, MM_NOMSG, MM_FEMALE, MM_MALE, NO_MINVENT,
    STRAT_WAITFORU, G_EXTINCT, MAXMONNO, CORPSTAT_GENDER, CORPSTAT_FEMALE,
    CORPSTAT_MALE, NEED_HTH_WEAPON, ismnum, has_oname, ONAME,
    MIGR_RANDOM, MIGR_APPROX_XY, MIGR_EXACT_XY, MIGR_STAIRS_UP,
    MIGR_STAIRS_DOWN, MIGR_LADDER_UP, MIGR_LADDER_DOWN, MIGR_SSTAIRS,
    MIGR_PORTAL, MIGR_WITH_HERO, MON_MIGRATING, MON_LIMBO, STRAT_ARRIVE,
    RLOC_NOMSG, MAGIC_PORTAL, In_endgame, isok, MTSZ,
} from './const.js';
import { SCROLL_CLASS, SPBOOK_CLASS } from './objects.js';
import { is_pool } from './hack.js';
import { P_SKILL, mon_wield_item } from './weapon.js';
import {
    monsterNames,
    PM_CAVE_DWELLER,
    PM_SAMURAI,
    PM_BARBARIAN,
    PM_RANGER,
} from './generated/monsters_data.js';
import { acurr, A_CHA } from './attrib.js';
import { christen_monst, Monnam } from './do_name.js';
import { monnear, m_at, see_monster_closeup, minliquid, restore_cham } from './mon.js';
import { enexto, rloc_to, rloc, rloc_to_flag, goodpos } from './teleport.js';
import { put_saddle_on_mon } from './steed.js';
import { newsym, pline, canspotmon } from './display.js';
import { hero_conflict } from './mondata.js';
import { cansee } from './vision.js';
import { objectNames } from './generated/objects_data.js';

const PM_LITTLE_DOG = monsterNames.indexOf('PM_LITTLE_DOG');
const PM_KITTEN = monsterNames.indexOf('PM_KITTEN');
const PM_PONY = monsterNames.indexOf('PM_PONY');
const PM_NAZGUL = monsterNames.indexOf('PM_NAZGUL');
const PM_ERINYS = monsterNames.indexOf('PM_ERINYS');
const EXPENSIVE_CAMERA = objectNames.indexOf('EXPENSIVE_CAMERA');
const SPE_CREATE_FAMILIAR = objectNames.indexOf('SPE_CREATE_FAMILIAR');
const AT_WEAP = 254;

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
export function initedog(mtmp, everything) {
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

/** C ref: makemon.c mbirth_limit — Nazgul 9 / Erinys 3 / else MAXMONNO. */
function mbirth_limit(mndx) {
    if (mndx === PM_NAZGUL) return 9;
    if (mndx === PM_ERINYS) return 3;
    return MAXMONNO;
}

/** C ref: mondata.h attacktype — any mattk slot with aatyp. */
function attacktype(ptr, aatyp) {
    const slots = ptr?.mattk;
    if (!slots) return false;
    for (let i = 0; i < slots.length; i++) {
        if (slots[i]?.aatyp === aatyp) return true;
    }
    return false;
}

/** C ref: minion.c free_emin — drop emin and isminion. */
function free_emin(mtmp) {
    if (mtmp.mextra) mtmp.mextra.emin = null;
    mtmp.isminion = 0;
}

/** C ref: spell.c spell_skilltype — objects[].oc_skill. */
function spell_skilltype_familiar(booktype) {
    return game.objects?.[booktype]?.oc_skill ?? 0;
}

/**
 * C ref: dog.c pick_familiar_pm — figurine corpsenm (G_EXTINCT + special
 * mbirth_limit → dust) else spell: 1/3 pet_type else rndmonst_adj(0, 3*skill).
 * Named omit: SPE_CREATE_FAMILIAR spell.c dispatch (helper is complete).
 */
async function pick_familiar_pm(otmp, quietly) {
    let pm = null;
    if (otmp) {
        const mndx = otmp.corpsenm | 0;
        if (!ismnum(mndx)) return null;
        pm = mons(mndx);
        if (((game.mvitals?.[mndx]?.mvflags ?? 0) & G_EXTINCT)
            && mbirth_limit(mndx) !== MAXMONNO) {
            if (!quietly) await pline('... into a pile of dust.');
            return null;
        }
    } else if (!rn2(3)) {
        pm = mons(pet_type());
    } else {
        const skill = spell_skilltype_familiar(SPE_CREATE_FAMILIAR);
        const max = 3 * P_SKILL(skill);
        pm = rndmonst_adj(0, max);
        if (!pm && !quietly) {
            await pline('There seems to be nothing available for a familiar.');
        }
    }
    return pm;
}

/**
 * C ref: dog.c make_familiar — figurine (otmp) or create-familiar spell
 * (otmp null). makemon MM_EDOG|MM_IGNOREWATER|NO_MINVENT|MM_NOMSG + gender;
 * figurine shatter / angel free_emin; pool minliquid; rn2(10) then B/U/C
 * 80/10/10 tame·peace·hostile; named christen; initedog; AT_WEAP wield.
 * Named omit: livelog first pet; makemon MM_EDOG newedog alloc (initedog
 * still creates edog).
 */
export async function make_familiar(otmp, x, y, quietly) {
    let mtmp = null;
    let trycnt = 100;
    let reallytame = true;

    do {
        const pm = await pick_familiar_pm(otmp, quietly);
        if (!pm) break;

        let mmflags = MM_EDOG | MM_IGNOREWATER | NO_MINVENT | MM_NOMSG;
        const cgend = otmp ? ((otmp.spe | 0) & CORPSTAT_GENDER) : 0;
        mmflags |= (cgend === CORPSTAT_FEMALE) ? MM_FEMALE
            : (cgend === CORPSTAT_MALE) ? MM_MALE : 0;

        mtmp = makemon(pm, x, y, mmflags);
        if (otmp) {
            if (!mtmp) {
                if (!quietly) {
                    await pline(
                        'The figurine writhes and then shatters into pieces!',
                    );
                }
                break;
            } else if (mtmp.isminion) {
                mtmp.isminion = 0;
                free_emin(mtmp);
            }
        }
    } while (!mtmp && --trycnt > 0);

    if (!mtmp) return null;

    if (is_pool(mtmp.mx, mtmp.my) && await minliquid(mtmp)) return null;

    if (otmp) {
        let chance = rn2(10);
        if (chance > 2) {
            chance = otmp.blessed ? 0 : !otmp.cursed ? 1 : 2;
        }
        if (chance > 0) {
            reallytame = false;
            if (chance === 2) {
                if (!quietly) await pline('You get a bad feeling about this.');
                mtmp.mpeaceful = 0;
                set_malign(mtmp);
            }
        }
        if (has_oname(otmp)) mtmp = christen_monst(mtmp, ONAME(otmp));
    }
    if (reallytame) initedog(mtmp, true);
    mtmp.msleeping = 0;
    set_malign(mtmp);
    newsym(mtmp.mx, mtmp.my);

    if (mtmp.mtame && attacktype(mtmp.data, AT_WEAP)) {
        mtmp.weapon_check = NEED_HTH_WEAPON;
        await mon_wield_item(mtmp);
    }
    return mtmp;
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
 * Named omit: full mon_arrive MIGR_LEFTOVERS → deliver_obj_to_mon
 * DF_ALL (D-1193 callee).
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

/** C ref: stairs.c stairway_find_from — first stair matching fromdlev+ladder. */
function arrive_stairway_find_from(fromdlev, isladder) {
    const dnum = fromdlev?.dnum | 0;
    const dlevel = fromdlev?.dlevel | 0;
    const ladder = !!isladder;
    for (let s = game.stairs; s; s = s.next) {
        if ((s.tolev?.dnum | 0) === dnum
            && (s.tolev?.dlevel | 0) === dlevel
            && !!s.isladder === ladder) {
            return s;
        }
    }
    return null;
}

/** C ref: stairs.c stairway_find — first stair matching fromdlev. */
function arrive_stairway_find(fromdlev) {
    const dnum = fromdlev?.dnum | 0;
    const dlevel = fromdlev?.dlevel | 0;
    for (let s = game.stairs; s; s = s.next) {
        if ((s.tolev?.dnum | 0) === dnum
            && (s.tolev?.dlevel | 0) === dlevel) {
            return s;
        }
    }
    return null;
}

/** C ref: dog.c mon_arrive MIGR_PORTAL — first MAGIC_PORTAL on ftrap. */
function arrive_find_magic_portal() {
    const ftrap = game.ftrap;
    if (Array.isArray(ftrap)) {
        for (const t of ftrap) {
            if ((t?.ttyp | 0) === MAGIC_PORTAL) return t;
        }
        return null;
    }
    for (let t = ftrap; t; t = t.ntrap) {
        if ((t.ttyp | 0) === MAGIC_PORTAL) return t;
    }
    return null;
}

/**
 * C ref: mon.c mnearto(..., move_other=FALSE) — place at/near (x,y).
 * Yank of m_at(x,y) is named (mon_arrive always passes FALSE).
 */
async function mnearto_no_yank(mtmp, x, y, rlocflags) {
    x = x | 0;
    y = y | 0;
    if ((mtmp.mx | 0) === x && (mtmp.my | 0) === y && m_at(x, y) === mtmp) {
        return true;
    }
    let newx = x;
    let newy = y;
    if (!goodpos(newx, newy, mtmp, 0)) {
        const mm = { x: 0, y: 0 };
        if (!enexto(mm, newx, newy, mtmp.data) || !isok(mm.x, mm.y)) {
            return false;
        }
        newx = mm.x | 0;
        newy = mm.y | 0;
    }
    await rloc_to_flag(mtmp, newx, newy, rlocflags);
    return true;
}

function arrive_track_clear(mtmp) {
    if (!mtmp.mtrack) {
        mtmp.mtrack = [];
    }
    for (let j = 0; j < MTSZ; j++) {
        mtmp.mtrack[j] = { x: 0, y: 0 };
    }
}

/**
 * C ref: dog.c mon_arrive After_you — independent migrant.
 * D-1199: mtmp.my = xyflags (mx stays 0) before mnearto/rloc so
 * rloc_pos_ok reads up/W-tower bits (D-1182 / D-1198 writer).
 * Named omissions: worm/isshk residency; wander/somexy; MIGR_LEFTOVERS
 * DF_ALL; Wiz_arrive; failed_arrivals/relmon; debug_fuzzer portal;
 * impossible() no-portal; full mnearto yank.
 */
async function mon_arrive_after_you(mtmp) {
    const u = game.u;
    if (!game.fmon) game.fmon = [];
    game.fmon.unshift(mtmp);
    mtmp.mstrategy = (mtmp.mstrategy | 0) | STRAT_ARRIVE;
    mtmp.mstate = (mtmp.mstate | 0) & ~(MON_MIGRATING | MON_LIMBO);

    mtmp.mux = u.ux | 0;
    mtmp.muy = u.uy | 0;
    const xyloc0 = mtmp.mtrack?.[0]?.x | 0;
    const xyflags = mtmp.mtrack?.[0]?.y | 0;
    let xlocale = mtmp.mtrack?.[1]?.x | 0;
    let ylocale = mtmp.mtrack?.[1]?.y | 0;
    const fromdlev = {
        dnum: mtmp.mtrack?.[2]?.x | 0,
        dlevel: mtmp.mtrack?.[2]?.y | 0,
    };
    arrive_track_clear(mtmp);
    restore_cham(mtmp);

    if (mtmp === u.usteed) return;

    const moves = game.moves | 0;
    if ((mtmp.mlstmv | 0) < moves - 1) {
        const nmv = (moves - 1) - (mtmp.mlstmv | 0);
        mon_catchup_elapsed_time(mtmp, nmv);
        /* wander/somexy after catchup still named */
    }

    switch (xyloc0) {
    case MIGR_APPROX_XY:
        break;
    case MIGR_EXACT_XY:
        break;
    case MIGR_WITH_HERO:
        xlocale = u.ux | 0;
        ylocale = u.uy | 0;
        break;
    case MIGR_STAIRS_UP:
    case MIGR_STAIRS_DOWN: {
        const stway = arrive_stairway_find_from(fromdlev, false);
        if (stway) {
            xlocale = stway.sx | 0;
            ylocale = stway.sy | 0;
        }
        break;
    }
    case MIGR_LADDER_UP:
    case MIGR_LADDER_DOWN: {
        const stway = arrive_stairway_find_from(fromdlev, true);
        if (stway) {
            xlocale = stway.sx | 0;
            ylocale = stway.sy | 0;
        }
        break;
    }
    case MIGR_SSTAIRS: {
        const stway = arrive_stairway_find(fromdlev);
        if (stway) {
            xlocale = stway.sx | 0;
            ylocale = stway.sy | 0;
        }
        break;
    }
    case MIGR_PORTAL: {
        if (In_endgame(u.uz)) {
            const updest = game.updest || {};
            xlocale = rn1((updest.hx | 0) - (updest.lx | 0) + 1, updest.lx | 0);
            ylocale = rn1((updest.hy | 0) - (updest.ly | 0) + 1, updest.ly | 0);
            break;
        }
        const t = arrive_find_magic_portal();
        if (t) {
            xlocale = t.tx | 0;
            ylocale = t.ty | 0;
            break;
        }
        /* debug_fuzzer / impossible() named — FALLTHROUGH to random */
    }
    /* falls through */
    default:
    case MIGR_RANDOM:
        xlocale = 0;
        ylocale = 0;
        break;
    }

    /* C dog.c:607–613 — mx already 0; my holds flags for rloc_pos_ok. */
    mtmp.mx = 0;
    mtmp.my = xyflags;

    if (xlocale) {
        await mnearto_no_yank(mtmp, xlocale, ylocale, RLOC_NOMSG);
    } else {
        await rloc(mtmp, RLOC_NOMSG);
    }
}

/**
 * C ref: dog.c losedogs — mydogs With_you then migrating_mons After_you
 * (mux/muy match u.uz, xyloc != MIGR_EXACT_XY). Named omissions:
 * kops dismiss; MIGR_EXACT_XY Before_you; failed_arrivals / m_into_limbo.
 */
export async function losedogs() {
    const dogs = game.mydogs || [];
    game.mydogs = [];
    for (const mtmp of dogs) {
        mon_arrive_with_you(mtmp);
    }

    const uz = game.u?.uz || {};
    const mig = game.migrating_mons || [];
    const stay = [];
    for (const mtmp of mig) {
        const xyloc = mtmp.mtrack?.[0]?.x | 0;
        if ((mtmp.mux | 0) === (uz.dnum | 0)
            && (mtmp.muy | 0) === (uz.dlevel | 0)
            && xyloc !== MIGR_EXACT_XY) {
            await mon_arrive_after_you(mtmp);
        } else {
            stay.push(mtmp);
        }
    }
    game.migrating_mons = stay;
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
