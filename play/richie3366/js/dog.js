// dog.js — Starting pet + figurine/spell familiar.
// C ref: dog.c — pet_type, makedog, pick_familiar_pm, make_familiar.

import { game } from './gstate.js';
import { rn2, rnd, rn1 } from './rng.js';
import { makemon, set_malign, rndmonst_adj, newedog } from './makemon.js';
import { deliver_obj_to_mon } from './dokick.js';
import {
    mons, NON_PM, is_human, is_covetous, is_demon,
    regenerates, M2_STALK, is_domestic, haseyes, humanoid,
} from './monsters.js';
import {
    MM_EDOG, MM_IGNOREWATER, MM_NOMSG, MM_FEMALE, MM_MALE, NO_MINVENT,
    STRAT_WAITFORU, G_EXTINCT, MAXMONNO, CORPSTAT_GENDER, CORPSTAT_FEMALE,
    CORPSTAT_MALE, NEED_HTH_WEAPON, ismnum, has_oname, ONAME,
    MIGR_RANDOM, MIGR_APPROX_XY, MIGR_EXACT_XY, MIGR_STAIRS_UP,
    MIGR_STAIRS_DOWN, MIGR_LADDER_UP, MIGR_LADDER_DOWN, MIGR_SSTAIRS,
    MIGR_PORTAL, MIGR_WITH_HERO, MIGR_LEFTOVERS, MON_MIGRATING, MON_LIMBO,
    MON_STILL_ARRIVING,
    STRAT_ARRIVE, RLOC_NOMSG, MAGIC_PORTAL, In_endgame, isok, MTSZ, MANFOOD,
    DOGFOOD, ACCFOOD, FULL_MOON, Upolyd, has_edog, EDOG, LL_CONDUCT,
    DF_ALL, COLNO, ROWNO, ROOMOFFSET, IS_WALL,
    DISMOUNT_THROWN, DISMOUNT_GENERIC, NO_TRAP_FLAGS,
    ESHK, EPRI, EGD,
    LS_MONSTER, OBJ_FREE,
} from './const.js';
import { SCROLL_CLASS, SPBOOK_CLASS } from './objects.js';
import { is_pool, in_rooms } from './hack.js';
import { P_SKILL, mon_wield_item } from './weapon.js';
import {
    monsterNames,
    PM_CAVE_DWELLER,
    PM_SAMURAI,
    PM_BARBARIAN,
    PM_RANGER,
} from './generated/monsters_data.js';
import { acurr, A_CHA } from './attrib.js';
import { christen_monst, Monnam, mon_pmname, s_suffix } from './do_name.js';
import {
    monnear, m_at, see_monster_closeup, minliquid, restore_cham,
    wake_nearto, discard_minvent, mdrop_special_objs,
} from './mon.js';
import { mon_offmap } from './monmove.js';
import {
    enexto, rloc_to, rloc, rloc_to_flag, goodpos, migrate_to_level,
} from './teleport.js';
import { put_saddle_on_mon, dismount_steed } from './steed.js';
import {
    newsym, pline, pline_mon, canspotmon, canseemon, Hallucination,
    impossible,
} from './display.js';
import { redraw_worm } from './worm.js';
import { hero_conflict } from './mondata.js';
import { cansee } from './vision.js';
import { night } from './calendar.js';
import { Tobjnam, the, xname, an } from './objnam.js';
import { livelog_printf } from './pline.js';
import { uhis } from './roles.js';
import { objectNames } from './generated/objects_data.js';
import { expels, unstuck } from './mhitu.js';
import { finish_meating } from './dogmove.js';
import { on_level, ledger_no } from './dungeon.js';
import { mintrap } from './trap.js';
import { m_unleash, mon_has_amulet } from './apply.js';
import { sticks } from './engrave.js';
import { emits_light, del_light_source } from './light.js';

const PM_LITTLE_DOG = monsterNames.indexOf('PM_LITTLE_DOG');
const PM_KITTEN = monsterNames.indexOf('PM_KITTEN');
const PM_PONY = monsterNames.indexOf('PM_PONY');
const PM_NAZGUL = monsterNames.indexOf('PM_NAZGUL');
const PM_ERINYS = monsterNames.indexOf('PM_ERINYS');
const EXPENSIVE_CAMERA = objectNames.indexOf('EXPENSIVE_CAMERA');
const SPE_CREATE_FAMILIAR = objectNames.indexOf('SPE_CREATE_FAMILIAR');
const CORPSE = objectNames.indexOf('CORPSE');
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

/**
 * C ref: dog.c free_edog `:34–42` — if mextra && EDOG, drop the edog
 * pointer then mtame=0. C has no in-tree callers (extern.h + sfctool
 * stub); dealloc_mextra frees edog inline without clearing mtame.
 * JS also clears the top-level mtmp.edog mirror that dogmove/sounds
 * still read. Restore newedog is restmon_edog (makemon.js).
 */
export function free_edog(mtmp) {
    if (!mtmp) return;
    if (mtmp.mextra && EDOG(mtmp)) {
        mtmp.mextra.edog = null;
    }
    mtmp.edog = null;
    mtmp.mtame = 0;
}

// C ref: dog.c initedog() — EDOG(mtmp) already allocated (newedog / MM_EDOG).
export function initedog(mtmp, everything) {
    const edogp = EDOG(mtmp);
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
        // C: ogoal.x/y = -1 — force error if used before set
        edogp.ogoal = { x: -1, y: -1 };
        edogp.abuse = 0;
        edogp.revivals = 0;
        edogp.mhpmax_penalty = 0;
        edogp.killed_by_u = 0;
    } else if ((edogp.apport || 0) <= 0) {
        edogp.apport = 1;
    }
    if ((edogp.hungrytime || 0) < minhungry) edogp.hungrytime = minhungry;
    // dogmove/sounds still read mtmp.edog
    mtmp.edog = edogp;
    // C: livelog first pet only if !pets && in_moveloop (starting pet
    // is initialized before in_moveloop); then always u.uconduct.pets++
    if (!game.u) game.u = {};
    if (!game.u.uconduct) game.u.uconduct = {};
    if (!(game.u.uconduct.pets | 0) && (game.program_state?.in_moveloop | 0)) {
        livelog_printf(LL_CONDUCT, 'obtained %s first pet (%s)',
            uhis(), an(mon_pmname(mtmp)));
    }
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
 * Spell dispatch is spell.c SPE_CREATE_FAMILIAR (D-1389).
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
 * Spell dispatch is D-1389. initedog livelog is D-1610.
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
 * C ref: dog.c update_mlstmv `:292–298` — iter_mons(set_mon_lastmove).
 * C iter_mons (mon.c:4531–4535) skips DEADMONSTER (mhp<1) and
 * mon_offmap (mstate != MON_FLOOR). Call after keepdogs (followers
 * are already on mydogs).
 */
export function update_mlstmv() {
    const moves = game.moves | 0;
    for (const mtmp of game.fmon || []) {
        if (!mtmp) continue;
        // C: if (DEADMONSTER(mtmp) || mon_offmap(mtmp)) continue;
        if ((mtmp.mhp | 0) < 1 || mon_offmap(mtmp)) continue;
        mtmp.mlstmv = moves;
    }
}

/**
 * C ref: dog.c keep_mon_accessible `:764–785` — should this monster ride
 * the `migrating_mons` list rather than being stashed in the level's
 * save file? The Wizard, so his next harassment can fetch him and so he
 * resumes his spot if the hero returns first; and a shopkeeper, temple
 * priest or vault guard while away from the level their `mextra` names,
 * in case `#wizmakemap` replaces that level behind their back.
 */
function keep_mon_accessible(mon) {
    if (!mon) return false;
    if (mon.iswiz) return true;
    const uz = game.u?.uz;
    if ((mon.isshk && !on_level(uz, ESHK(mon)?.shoplevel))
        || (mon.ispriest && !on_level(uz, EPRI(mon)?.shrlevel))
        || (mon.isgd && !on_level(uz, EGD(mon)?.gdlevel))) {
        return true;
    }
    /* normal monsters go into the level save file instead */
    return false;
}

/**
 * C ref: dog.c keepdogs `:786–884` — decide, for every monster on the
 * level the hero is leaving, whether it follows, is left behind, or is
 * kept reachable off-level.
 *
 * `pets_only` (ascension / final escape) first clears the mundane
 * trifles — trap, meal, sleep, paralysis — that would otherwise strand
 * a pet, and rejects everything untame.
 *
 * A follower must be adjacent and a `levl_follower` (or be the Wizard
 * chasing the Amulet from anywhere), must not be helpless unless it is
 * the steed, and must have noticed the hero (`STRAT_WAITFORU`).
 * Even then C gives a trapped one an escape attempt via `mintrap` —
 * an RNG draw — and then three things can still hold it back: it is
 * still eating or still trapped, or it carries the Amulet. Being left
 * behind snaps any leash ("suddenly comes loose"), and a leashed pet
 * that was never a candidate gets the gentler "leash goes slack".
 *
 * The walk itself is C's `for (mtmp = fmon; mtmp; mtmp = mtmp2)` with
 * `mtmp2` saved first: both departure arms unlink `mtmp` from `fmon`
 * while the walk is still running (D-1789).
 *
 * Named omissions: `mon_leave` `:725–763` — minvent `no_charge` /
 * `picked_container`, shk `set_residency`, and the worm-segment count
 * that C stores in `wormno` during migration; `relmon` `mon.c:2559`
 * itself, so the follower arm splices `fmon` inline and never runs
 * `mon_leaving_level`'s take-off-map (`remove_monster` / `seemimic` /
 * `fill_pit` / `newsym`).
 * @param {boolean} pets_only true for ascension or final escape
 */
export async function keepdogs(pets_only = false) {
    const u = game.u;
    /* C `:793–794` saves `mtmp2 = mtmp->nmon` *before* the body runs,
       because both departure arms unlink `mtmp` from `fmon` underneath
       the walk: `relmon(mtmp, &gm.mydogs)` for a follower, and
       `migrate_to_level` (which calls `relmon(mtmp, &gm.migrating_mons)`)
       for one kept accessible. A JS array carries no `nmon` links, so the
       walk order is a snapshot and departers are unlinked from the live
       `game.fmon` in place. Rebuilding `fmon` from a survivors list
       instead would drop every monster a mid-walk splice skipped past, and
       every monster a callee appended. */
    const list = [...(game.fmon || [])];
    if (!game.mydogs) game.mydogs = [];

    for (const mtmp of list) {
        if (mtmp.mhp != null && mtmp.mhp <= 0) continue;
        if (pets_only) {
            if (!mtmp.mtame) continue; /* reject non-pets */
            // C `:799–809` — mundane trifles must not block escape/ascend
            mtmp.mtrapped = 0;
            finish_meating(mtmp);
            mtmp.msleeping = 0;
            mtmp.mfrozen = 0;
            mtmp.mcanmove = 1;
        }
        const near = monnear(mtmp, u.ux, u.uy);
        const follow = levl_follower(mtmp);
        // C: (monnear && levl_follower) || (uhave.amulet && iswiz)
        const chase = (near && follow)
            || (!!(game.u?.uhave?.amulet) && mtmp.iswiz);
        const helpless = !mtmp.mcanmove || mtmp.msleeping
            || (mtmp.mfrozen | 0) > 0;
        const waiting = !!(mtmp.mstrategy & STRAT_WAITFORU);

        if (chase && (!helpless || mtmp === u.usteed) && !waiting) {
            let stay_behind = false;

            if (mtmp.mtrapped) await mintrap(mtmp, NO_TRAP_FLAGS);
            if (mtmp === u.usteed) {
                /* make sure steed is eligible to accompany hero */
                mtmp.mtrapped = 0;        /* escape trap */
                mtmp.meating = 0;         /* terminate eating */
                mdrop_special_objs(mtmp); /* drop Amulet */
            } else if (mtmp.meating || mtmp.mtrapped) {
                if (canseemon(mtmp)) {
                    await pline_mon(mtmp, `${Monnam(mtmp)} is still ${
                        mtmp.meating ? 'eating' : 'trapped'}.`);
                }
                stay_behind = true;
            } else if (mon_has_amulet(mtmp)) {
                if (canseemon(mtmp)) {
                    await pline(
                        `${Monnam(mtmp)} seems very disoriented for a moment.`,
                    );
                }
                stay_behind = true;
            }
            if (stay_behind) {
                if (mtmp.mleashed) {
                    await pline(`${humanoid(mtmp.data)
                        ? (mtmp.female ? 'Her' : 'His')
                        : 'Its'} leash suddenly comes loose.`);
                    await m_unleash(mtmp, false);
                }
                if (mtmp === u.usteed) {
                    /* can't happen unless the stay_behind logic above
                       gets scrambled by a later change */
                    await impossible('steed left behind?');
                    await dismount_steed(DISMOUNT_GENERIC);
                }
                continue;
            }

            // C `:862–863` relmon(mtmp, &gm.mydogs) — unlink from fmon,
            // then prepend (LIFO, so the last kept arrives first).
            // Named omissions: relmon's mon_leaving_level take-off-map
            // (remove_monster / seemimic / fill_pit / newsym) and
            // mon_leave's wormno / no_charge / set_residency.
            const gone = (game.fmon || []).indexOf(mtmp);
            if (gone >= 0) game.fmon.splice(gone, 1);
            game.mydogs.unshift(mtmp);
            mtmp.mx = 0; /* mx==0 implies migrating */
            mtmp.my = 0;
            mtmp.mlstmv = game.moves | 0;
        } else if (keep_mon_accessible(mtmp)) {
            migrate_to_level(mtmp, ledger_no(u.uz), MIGR_EXACT_XY, null);
        } else {
            if (mtmp.mleashed) {
                /* quest leader can eject the hero while a leashed pet
                   is not next to them */
                await pline(`${s_suffix(Monnam(mtmp))} leash goes slack.`);
                await m_unleash(mtmp, false);
            }
            /* C leaves an ordinary monster on fmon — no relmon here. */
        }
    }
}

/**
 * C ref: dog.c tamedog — obj=null magic-trap / scroll envelope, or thrown food.
 * Peaceful + edog for ordinary monsters; shop/gd/priest/minion/human/
 * is_covetous / is_demon-vs-hero / quest leader rejected. D-1532.
 * isshk → make_happy_shk D-1540.
 * FULL_MOON night S_DOG rn2(6) D-1585 (C :1176–1178; generated mlet
 * 'S_DOG' ≡ C enum S_DOG). Already-tame catch pline_mon / big_corpse /
 * Tobjnam stop D-1585 (C :1199–1209).
 * ustuck expels/unstuck D-1593 (C :1184–1190; live mhitu expels/unstuck;
 * engrave sticks — not monmove AT_HUGS=6 clone).
 * initedog has_edog vs !mtame D-1595 (C :1253–1259; live newedog +
 * initedog(TRUE) when !has_edog, else initedog(FALSE) — not !mtame).
 * redraw_worm is D-1577.
 */
export async function tamedog(mtmp, obj, givemsg = true) {
    if (!mtmp) return false;
    let blessed_scroll = false;

    // C dog.c tamedog :1150–1154 — scroll/spellbook → blessed then obj=NULL
    if (obj && (obj.oclass === SCROLL_CLASS || obj.oclass === SPBOOK_CLASS)) {
        blessed_scroll = !!obj.blessed;
        obj = null;
    }

    if (mtmp.mfrozen) mtmp.mfrozen = ((mtmp.mfrozen | 0) + 1) >> 1;
    // C :1159–1161 — end indefinite sleep; distance==1 limits waking
    // to mtmp (wake_msg + STRAT_WAITMASK + disturb), not wakeup()
    if (mtmp.msleeping) {
        await wake_nearto(mtmp.mx, mtmp.my, 1);
    }

    if (mtmp.iswiz || (mtmp.data?.mndx | 0) === monsterNames.indexOf('PM_MEDUSA')
        || ((mtmp.data?.mflags3 | 0) & 0x0010)) { // M3_WANTSARTI
        return false;
    }

    // C :1169–1173 — canspotmon then pline_mon; givemsg used for both lines
    if (givemsg && !mtmp.mpeaceful && canspotmon(mtmp)) {
        await pline_mon(
            mtmp,
            `${Monnam(mtmp)} seems ${Hallucination() ? 'really chill' : 'more amiable'}.`,
        );
        givemsg = false;
    }
    mtmp.mpeaceful = 1;
    set_malign(mtmp);
    // C :1176–1178 — left-to-right: moonphase, night(), rn2(6), obj, S_DOG.
    // Full-moon night always consumes rn2(6) even when obj is null / not a dog.
    if (game.flags?.moonphase === FULL_MOON && night() && rn2(6) && obj
        && mtmp.data?.mlet === 'S_DOG') {
        return false;
    }

    mtmp.mflee = 0;
    mtmp.mfleetim = 0;
    // C :1184–1190 — grabber lets go now, whether it becomes tame or not
    if (mtmp === game.u?.ustuck) {
        if (game.u.uswallow) {
            await expels(mtmp, mtmp.data, true);
        } else if (!(Upolyd(game.u) && sticks(game.youmonst?.data))) {
            await unstuck(mtmp);
        }
    }

    // C: feeding treats makes already-tame pets tamer (before mtame<10 bump)
    if (mtmp.mtame && obj) {
        const { dogfood, dog_eat } = await import('./dogmove.js');
        const { place_object } = await import('./mkobj.js');

        const canmove = mtmp.mcanmove !== false && !(mtmp.mfrozen > 0);
        if (canmove && !mtmp.mconf && !mtmp.meating) {
            const tasty = dogfood(mtmp, obj);
            if (tasty === DOGFOOD
                || (tasty <= ACCFOOD
                    && (EDOG(mtmp)?.hungrytime || mtmp.edog?.hungrytime || 0)
                        <= (game.moves || 1))) {
                // C :1199–1209 — canseemon pline_mon + big_corpse; else Tobjnam
                if (canseemon(mtmp)) {
                    const big_corpse =
                        (obj.otyp | 0) === CORPSE && ismnum(obj.corpsenm)
                        && (mons(obj.corpsenm)?.msize | 0)
                            > (mtmp.data?.msize | 0);
                    await pline_mon(
                        mtmp,
                        `${Monnam(mtmp)} catches ${the(xname(obj))}`
                            + (big_corpse ? ', or vice versa!' : '.'),
                    );
                } else if (cansee(mtmp.mx, mtmp.my)) {
                    await pline(`${Tobjnam(obj, 'stop')}.`);
                }
                place_object(obj, mtmp.mx, mtmp.my);
                await dog_eat(mtmp, obj, mtmp.mx, mtmp.my, false);
                return true;
            }
        }
        return false;
    }

    // C :1224–1232 — mtame<10 bump; blessed scroll/spell +2 clamp 10
    if (mtmp.mtame && (mtmp.mtame | 0) < 10) {
        if ((mtmp.mtame | 0) < rnd(10)) mtmp.mtame = (mtmp.mtame | 0) + 1;
        if (blessed_scroll) {
            mtmp.mtame = (mtmp.mtame | 0) + 2;
            if ((mtmp.mtame | 0) > 10) mtmp.mtame = 10;
        }
        return false;
    }
    // C :1235–1238 — pacify angry shopkeeper; shk.js via dynamic (cycle)
    if (mtmp.isshk) {
        const { make_happy_shk } = await import('./shk.js');
        await make_happy_shk(mtmp, false);
        return false;
    }

    // C :1240–1248 — conflicting extra + is_covetous + is_demon-vs-hero
    if (!mtmp.mcanmove
        || mtmp.isshk || mtmp.isgd || mtmp.ispriest || mtmp.isminion
        || is_covetous(mtmp.data) || is_human(mtmp.data)
        || (is_demon(mtmp.data) && !is_demon(game.youmonst?.data))) {
        return false;
    }
    // C :1247 — obj && dogfood >= MANFOOD (invoke TAMING zeroobj → APPORT)
    if (obj) {
        const { dogfood } = await import('./dogmove.js');
        if (dogfood(mtmp, obj) >= MANFOOD) return false;
    }

    // C :1250 — quest leader cannot be tamed (leader_m_id 0 is unset)
    const leader_m_id = game.quest_status?.leader_m_id | 0;
    if (leader_m_id && (mtmp.m_id | 0) === leader_m_id) {
        return false;
    }

    // C :1253–1259 — add pet extension: !has_edog → newedog +
    // initedog(TRUE); else initedog(FALSE) (feral former pet / mtame>=10).
    if (!has_edog(mtmp)) {
        newedog(mtmp);
        initedog(mtmp, true);
    } else {
        initedog(mtmp, false);
    }

    // C: thrown food for newly tamed — place_object + dog_eat(devour)
    if (obj) {
        const { dog_eat } = await import('./dogmove.js');
        const { place_object } = await import('./mkobj.js');
        place_object(obj, mtmp.mx, mtmp.my);
        if ((await dog_eat(mtmp, obj, mtmp.mx, mtmp.my, true)) === 2) {
            return true;
        }
    }

    // C :1270–1272
    if (givemsg && canspotmon(mtmp)) {
        await pline_mon(
            mtmp,
            `${Monnam(mtmp)} seems quite ${Hallucination() ? 'approachable' : 'friendly'}.`,
        );
    }
    newsym(mtmp.mx, mtmp.my);
    // C :1275–1276 — redraw_worm after head newsym (D-1577)
    if (mtmp.wormno) redraw_worm(mtmp);
    if (attacktype(mtmp.data, AT_WEAP)) {
        mtmp.weapon_check = NEED_HTH_WEAPON;
        await mon_wield_item(mtmp);
    }
    return true;
}

/**
 * C ref: dog.c mon_arrive(With_you) — place accompanying pet near hero.
 * C restore_cham `:464` before usteed return / With_you place (PfSC
 * may differ from when the pet left). C returns here before
 * MIGR_LEFTOVERS (D-1505 After_you).
 * D-1746: MON_STILL_ARRIVING for see_monsters (C `:430` / `:479`;
 * usteed return leaves the bit, matching C).
 */
async function mon_arrive_with_you(mtmp) {
    const u = game.u;
    mtmp.mstate = (mtmp.mstate | 0) | MON_STILL_ARRIVING;
    if (!game.fmon) game.fmon = [];
    game.fmon.unshift(mtmp);
    mtmp.mux = u.ux;
    mtmp.muy = u.uy;
    await restore_cham(mtmp);
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
    mtmp.mstate = (mtmp.mstate | 0) & ~MON_STILL_ARRIVING;
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
 * C ref: mkroom.c somex / somey — rn1(hx-lx+1, lx). Clone: mklev exports
 * these; dog cannot import mklev (mklev → trap → dog).
 */
function somex(croom) {
    return rn1((croom.hx | 0) - (croom.lx | 0) + 1, croom.lx | 0);
}
function somey(croom) {
    return rn1((croom.hy | 0) - (croom.ly | 0) + 1, croom.ly | 0);
}

/** C ref: mkroom.c inside_room — irregular edge/roomno else bbox ±1. */
function inside_room(croom, x, y) {
    if (!croom) return false;
    if (croom.irregular) {
        const i = (croom.roomnoidx ?? -1) + ROOMOFFSET;
        const loc = game.level?.at(x, y);
        return !!(loc && !loc.edge && (loc.roomno | 0) === i);
    }
    return x >= (croom.lx | 0) - 1 && x <= (croom.hx | 0) + 1
        && y >= (croom.ly | 0) - 1 && y <= (croom.hy | 0) + 1;
}

/**
 * C ref: mkroom.c somexy — irregular rejects edge/wrong roomno (100 then
 * exhaustive); !nsubrooms is one somex+somey; else wall/subroom reject.
 * Can return a non-accessible cell (C).
 */
function somexy(croom, c) {
    if (!croom || !c) return false;
    let try_cnt = 0;

    if (croom.irregular) {
        const i = (croom.roomnoidx ?? -1) + ROOMOFFSET;
        while (try_cnt++ < 100) {
            c.x = somex(croom);
            c.y = somey(croom);
            const loc = game.level?.at(c.x, c.y);
            if (loc && !loc.edge && (loc.roomno | 0) === i) return true;
        }
        for (c.x = croom.lx | 0; c.x <= (croom.hx | 0); c.x++) {
            for (c.y = croom.ly | 0; c.y <= (croom.hy | 0); c.y++) {
                const loc = game.level?.at(c.x, c.y);
                if (loc && !loc.edge && (loc.roomno | 0) === i) return true;
            }
        }
        return false;
    }

    if (!(croom.nsubrooms | 0)) {
        c.x = somex(croom);
        c.y = somey(croom);
        return true;
    }

    while (try_cnt++ < 100) {
        c.x = somex(croom);
        c.y = somey(croom);
        const loc = game.level?.at(c.x, c.y);
        if (loc && IS_WALL(loc.typ)) continue;
        let in_sub = false;
        const nsub = croom.nsubrooms | 0;
        for (let i = 0; i < nsub; i++) {
            if (inside_room(croom.sbrooms?.[i], c.x, c.y)) {
                in_sub = true;
                break;
            }
        }
        if (in_sub) continue;
        break;
    }
    if (try_cnt >= 100) return false;
    return true;
}

/**
 * C ref: dog.c mon_arrive :582–605 — after leftovers, if xlocale && wander,
 * jitter via in_rooms+somexy else a wander-sized rn1 box (x min 1, y min 0).
 * somexy fail zeros locale so place falls through to rloc.
 */
export function arrive_wander_xy(xlocale, ylocale, wander) {
    xlocale = xlocale | 0;
    ylocale = ylocale | 0;
    wander = wander | 0;
    if (!(xlocale && wander)) return { x: xlocale, y: ylocale };

    const r = in_rooms(xlocale, ylocale, 0) || '';
    if (r && r.charCodeAt(0)) {
        const rooms = game.level?.rooms || [];
        const croom = rooms[r.charCodeAt(0) - ROOMOFFSET];
        const c = { x: 0, y: 0 };
        if (croom && somexy(croom, c)) {
            return { x: c.x | 0, y: c.y | 0 };
        }
        return { x: 0, y: 0 };
    }
    let i = Math.max(1, xlocale - wander);
    let j = Math.min(COLNO - 1, xlocale + wander);
    const nx = rn1(j - i, i);
    i = Math.max(0, ylocale - wander);
    j = Math.min(ROWNO - 1, ylocale + wander);
    const ny = rn1(j - i, i);
    return { x: nx, y: ny };
}

/**
 * C ref: dog.c mon_arrive After_you — independent migrant.
 * D-1199: mtmp.my = xyflags (mx stays 0) before mnearto/rloc so
 * rloc_pos_ok reads up/W-tower bits (D-1182 / D-1198 writer).
 * D-1505: MIGR_LEFTOVERS → deliver_obj_to_mon(..., DF_ALL) after xyloc
 * switch, before my=xyflags / place (callee D-1193).
 * D-1538: catchup wander = min(nmv,8); EXACT_XY zeros wander; then
 * xlocale&&wander → in_rooms/somexy or corridor rn1 (C :491–500/:506/:582–605).
 * Named omissions: worm/isshk residency; Wiz_arrive;
 * failed_arrivals/relmon; debug_fuzzer portal; impossible() no-portal;
 * full mnearto yank.
 * D-1746: MON_STILL_ARRIVING for see_monsters (C `:430` / `:622`).
 */
async function mon_arrive_after_you(mtmp) {
    const u = game.u;
    mtmp.mstate = (mtmp.mstate | 0) | MON_STILL_ARRIVING;
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
    await restore_cham(mtmp);

    if (mtmp === u.usteed) return;

    /* C dog.c:491–500 — heal limbo time then wander = min(nmv, 8). */
    const moves = game.moves | 0;
    let wander = 0;
    if ((mtmp.mlstmv | 0) < moves - 1) {
        const nmv = (moves - 1) - (mtmp.mlstmv | 0);
        mon_catchup_elapsed_time(mtmp, nmv);
        wander = Math.min(nmv, 8) | 0;
    }

    switch (xyloc0) {
    case MIGR_APPROX_XY:
        break;
    case MIGR_EXACT_XY:
        wander = 0;
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

    /* C dog.c:576–580 — leftover MIGR_TO_SPECIES cargo (stolen_booty
     * captain). With_you already returned; Wiz_arrive still named. */
    if (((mtmp.migflags | 0) & MIGR_LEFTOVERS) !== 0) {
        if (game.migrating_objs) {
            deliver_obj_to_mon(mtmp, 0, DF_ALL);
        }
    }

    /* C dog.c:582–605 — nearby jitter after leftovers, before my=xyflags. */
    if (xlocale && wander) {
        const xy = arrive_wander_xy(xlocale, ylocale, wander);
        xlocale = xy.x;
        ylocale = xy.y;
    }

    /* C dog.c:607–613 — mx already 0; my holds flags for rloc_pos_ok. */
    mtmp.mx = 0;
    mtmp.my = xyflags;

    if (xlocale) {
        await mnearto_no_yank(mtmp, xlocale, ylocale, RLOC_NOMSG);
    } else {
        await rloc(mtmp, RLOC_NOMSG);
    }
    mtmp.mstate = (mtmp.mstate | 0) & ~MON_STILL_ARRIVING;
}

/**
 * C ref: dog.c losedogs — mydogs With_you then migrating_mons After_you
 * (mux/muy match u.uz, xyloc != MIGR_EXACT_XY). Both arms await
 * restore_cham (C mon_arrive `:464`). Named omissions:
 * kops dismiss; MIGR_EXACT_XY Before_you; failed_arrivals / m_into_limbo.
 */
export async function losedogs() {
    const dogs = game.mydogs || [];
    game.mydogs = [];
    for (const mtmp of dogs) {
        await mon_arrive_with_you(mtmp);
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
 * Named omit: pline_mon SetVoice.
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
        if (game.u?.usteed === mtmp) {
            await dismount_steed(DISMOUNT_THROWN);
        }
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
 * redraw_worm on untame is D-1577.
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
        // C :1372–1373 — EDOG(mtmp)->abuse++; tame non-minion has edog
        const edog = EDOG(mtmp) || mtmp.edog;
        if (edog) edog.abuse = (edog.abuse | 0) + 1;
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
            if (mtmp.wormno) redraw_worm(mtmp);
        }
    }
}

/**
 * C ref: dog.c discard_migrations `:935–990` — drop migrating mons/objs
 * whose dest is not the endgame (Wizard kept). Call after cant_go_back
 * delete_levelfile. C bypasses mongone/m_detach; JS unlinks and drops.
 * Named omit: full obfree (timers / LS_OBJECT / contents walk) — drop
 * the chain; GC collects cobj when the parent is unreachable.
 */
export function discard_migrations() {
    const dest = { dnum: 0, dlevel: 0 };
    const keepMons = [];
    for (const mtmp of game.migrating_mons || []) {
        dest.dnum = mtmp.mux | 0;
        dest.dlevel = mtmp.muy | 0;
        // C: Wizard kept regardless of location; keep endgame dest.
        if (mtmp.iswiz || In_endgame(dest)) {
            keepMons.push(mtmp);
            continue;
        }
        mtmp.nmon = null;
        discard_minvent(mtmp, false);
        if (emits_light(mtmp.data)) del_light_source(LS_MONSTER, mtmp);
    }
    game.migrating_mons = keepMons;

    let prev = null;
    let otmp = game.migrating_objs || null;
    while (otmp) {
        const next = otmp.nobj;
        dest.dnum = otmp.ox | 0;
        dest.dlevel = otmp.oy | 0;
        if (In_endgame(dest)) {
            prev = otmp;
            otmp = next;
            continue;
        }
        if (prev) prev.nobj = next;
        else game.migrating_objs = next;
        otmp.nobj = null;
        otmp.where = OBJ_FREE;
        otmp.owornmask = 0;
        otmp = next;
    }
}
