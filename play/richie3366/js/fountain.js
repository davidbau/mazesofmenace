// fountain.js — Fountain dryup / dip / drink effects; sink drink.
// C ref: fountain.c dryup, dipfountain, drinkfountain, dofindgem,
//         breaksink, drinksink.
//
// Branch envelope (drinkfountain): fate=rnd(30) before Levitation;
// mgkftn restore+adjattrib; fate<10 refresh; switch default/19–30
// message+RNG arms; case 22 dowatersnakes; case 23 dowaterdemon;
// case 26 monster_detect + browse_map; case 27 dofindgem when
// !FOUNTAIN_IS_LOOTED.
// Deferred: dowaternymph (incl. case 27 fallthrough when looted),
// dogushforth, enlightenment body, vomit cantvomit/Sick/acid poly
// arms, town warn/angry_guards, wizard yn, FOUNTAIN_IS_WARNED force
// dryup, Excalibur LONG_SWORD body, wash_hands, dipfountain cases
// 17–22/25–29; Hallucination rndmonnam in snakes pline;
// mongrantswish tmp_at glyph hide.
//
// Branch envelope (drinksink): Levitation floating_above; rn2(20)
// switch cases 0–13 + 19/default sip; case 4 faucet → mkobj+dopotion;
// case 5 S_LRING ring; case 6 breaksink; case 8 more_experienced;
// case 9 sewage morehungry+vomit.
// Deferred: case 10 polyself body; case 13 create_gas_cloud region;
// dipsink; Hallucination hliquid/hcolor synonyms; monstseesu when
// Fire_resistance already set.

import { game } from './gstate.js';
import { rn2, rnd, rn1 } from './rng.js';
import {
    pline, newsym, You_feel, flush_topl_more, canspotmon,
} from './display.js';
import {
    curse, mksobj_at, rnd_class, mkobj, mkobj_at, obj_extract_self,
} from './mkobj.js';
import { water_damage, t_at, mintrap, NO_TRAP_FLAGS } from './trap.js';
import {
    COIN_CLASS, RING_CLASS, POTION_CLASS, POT_WATER,
    objectNames, objectDescrs,
} from './objects.js';
import {
    ROOM, FOUNTAIN, IS_FOUNTAIN,
    ER_NOTHING, ER_DESTROYED,
    F_LOOTED, F_WARNED, FROMOUTSIDE, S_LRING, MM_NOMSG,
    nothing_seems_to_happen,
    KILLED_BY, G_GONE, M_SEEN_FIRE,
} from './const.js';
import { hands_obj } from './weapon.js';
import { PM_KNIGHT, monsterNames } from './generated/monsters_data.js';
import { A_MAX, A_WIS, A_CON, adjattrib, exercise, acurr } from './attrib.js';
import { lesshungry, morehungry, poison_strdmg, vomit } from './eat.js';
import { losehp } from './hack.js';
import { depth as depth_of_level } from './hacklib.js';
import { monster_detect } from './detect.js';
import { more_experienced, newexplevel } from './exper.js';
import { makemon } from './makemon.js';
import { mons } from './monsters.js';
import { cansee } from './vision.js';
import { monstseesu, monstunseesu } from './mondata.js';
import { observe_object } from './invent.js';

const LONG_SWORD = objectNames.indexOf('LONG_SWORD');
const DILITHIUM_CRYSTAL = objectNames.indexOf('DILITHIUM_CRYSTAL');
const LUCKSTONE = objectNames.indexOf('LUCKSTONE');
const PM_SEWER_RAT = monsterNames.indexOf('PM_SEWER_RAT');
const PM_WATER_ELEMENTAL = monsterNames.indexOf('PM_WATER_ELEMENTAL');
const PM_WATER_DEMON = monsterNames.indexOf('PM_WATER_DEMON');
const PM_WATER_MOCCASIN = monsterNames.indexOf('PM_WATER_MOCCASIN');

/** C ref: rm.h FOUNTAIN_IS_WARNED */
function FOUNTAIN_IS_WARNED(x, y) {
    const loc = game.level?.at(x, y);
    return !!((loc?.looted || 0) & F_WARNED);
}

/** C ref: rm.h FOUNTAIN_IS_LOOTED / SET_FOUNTAIN_LOOTED */
function FOUNTAIN_IS_LOOTED(x, y) {
    const loc = game.level?.at(x, y);
    return !!((loc?.looted || 0) & F_LOOTED);
}

function SET_FOUNTAIN_LOOTED(x, y) {
    const loc = game.level?.at(x, y);
    if (loc) loc.looted = (loc.looted || 0) | F_LOOTED;
}

/**
 * C ref: fountain.c dofindgem — gem in sparkling waters.
 * mksobj_at(..., FALSE, FALSE): next_ident only (no mksobj_init).
 */
async function dofindgem() {
    const u = game.u || {};
    const Blind = !!(u.Blind || u.ublind);
    if (!Blind) {
        await pline('You spot a gem in the sparkling waters!');
    } else {
        await You_feel('a gem here!');
    }
    // C: rnd_class(DILITHIUM_CRYSTAL, LUCKSTONE - 1)
    mksobj_at(
        rnd_class(DILITHIUM_CRYSTAL, LUCKSTONE - 1),
        u.ux, u.uy,
        false, false,
    );
    SET_FOUNTAIN_LOOTED(u.ux, u.uy);
    newsym(u.ux, u.uy);
    exercise(A_WIS, true);
}

/** C ref: hacklib / potion.hliquid — Hallucination synonym deferred. */
function hliquid(waterword) {
    return waterword || 'water';
}

/** C ref: fountain.c floating_above */
async function floating_above(what) {
    await pline(`You are floating high above the ${what}.`);
}

/** C ref: pline.c You_hear — acoustics/Deaf; Unaware/Underwater deferred. */
async function You_hear(line) {
    const u = game.u || {};
    if (u.Deaf || u.HDeaf) return;
    await pline(`You hear ${line}`);
}

/** C ref: do_name.c a_monnam — ARTICLE_A (hallu deferred). */
function a_monnam(mtmp) {
    if (!mtmp) return 'a monster';
    if (mtmp.mextra?.mgivenname) return mtmp.mextra.mgivenname;
    const raw = mtmp?.data?.name || 'monster';
    const plain = String(raw).replace(/^PM_/, '').replace(/_/g, ' ').toLowerCase();
    const art = /^[aeiou]/i.test(plain) ? 'an' : 'a';
    return `${art} ${plain}`;
}

/** C ref: potion.c hcolor — Hallucination synonym deferred. */
function hcolor(colorword) {
    return colorword || 'odd';
}

/** Potion appearance string for faucet liquid (OBJ_DESCR). */
function potion_descr(otyp) {
    const oc = game.objects?.[otyp];
    if (!oc) return 'odd';
    const idx = oc.oc_descr_idx ?? otyp;
    return objectDescrs[idx] || 'odd';
}

function Fire_resistance() {
    const u = game.u || {};
    return !!(u.Fire_resistance || u.HFire_resistance || u.EFire_resistance);
}

/**
 * C ref: fountain.c breaksink — sink → looted fountain; update nsinks/nfountains.
 */
export async function breaksink(x, y) {
    const u = game.u || {};
    if (cansee(x, y) || (u.ux === x && u.uy === y)) {
        await pline('The pipes break!  Water spurts out!');
    }
    const loc = game.level?.at(x, y);
    if (loc) {
        loc.typ = FOUNTAIN;
        loc.looted = 0;
        loc.blessedftn = 0;
        SET_FOUNTAIN_LOOTED(x, y);
    }
    if (game.level?.flags) {
        if ((game.level.flags.nsinks | 0) > 0) game.level.flags.nsinks--;
        game.level.flags.nfountains = (game.level.flags.nfountains | 0) + 1;
    }
    newsym(x, y);
}

/**
 * C ref: fountain.c drinksink — quaff while standing on a sink.
 */
export async function drinksink() {
    const u = game.u || {};
    if (u.Levitation) {
        await floating_above('sink');
        return;
    }

    switch (rn2(20)) {
    case 0:
        await pline(`You take a sip of very cold ${hliquid('water')}.`);
        break;
    case 1:
        await pline(`You take a sip of very warm ${hliquid('water')}.`);
        break;
    case 2:
        await pline(`You take a sip of scalding hot ${hliquid('water')}.`);
        if (Fire_resistance()) {
            await pline('It seems quite tasty.');
            monstseesu(M_SEEN_FIRE);
        } else {
            losehp(rnd(6), 'sipping boiling water', KILLED_BY);
            monstunseesu(M_SEEN_FIRE);
        }
        break;
    case 3: {
        const gone = ((game.mvitals?.[PM_SEWER_RAT]?.mvflags ?? 0) & G_GONE) !== 0;
        if (gone) {
            await pline('The sink seems quite dirty.');
        } else {
            const mtmp = makemon(mons(PM_SEWER_RAT), u.ux, u.uy, MM_NOMSG);
            if (mtmp) {
                const Blind = !!(u.Blind || u.ublind);
                const what = (Blind || !canspotmon(mtmp))
                    ? 'something squirmy'
                    : a_monnam(mtmp);
                await pline(`Eek!  There's ${what} in the sink!`);
            }
        }
        break;
    }
    case 4: {
        // Faucet potion — reject POT_WATER and retry (mkobj RNG each try)
        let otmp;
        for (;;) {
            otmp = mkobj(POTION_CLASS, false);
            if (otmp && otmp.otyp !== POT_WATER) break;
            if (otmp) {
                obj_extract_self(otmp);
                otmp.quan = 0;
            }
        }
        otmp.cursed = 0;
        otmp.blessed = 0;
        const Blind = !!(u.Blind || u.ublind);
        const liquid = Blind ? 'odd' : hcolor(potion_descr(otmp.otyp));
        await pline(`Some ${liquid} liquid flows from the faucet.`);
        if (!(Blind || u.Hallucination)) observe_object(otmp);
        otmp.quan = (otmp.quan | 0) + 1; // Avoid panic upon useup()
        otmp.fromsink = 1;
        // Dynamic import avoids potion↔fountain cycle; peffect_* partial
        const { dopotion } = await import('./potion.js');
        await dopotion(otmp);
        obj_extract_self(otmp);
        otmp.quan = 0;
        break;
    }
    case 5: {
        const loc = game.level?.at(u.ux, u.uy);
        if (!((loc?.looted || 0) & S_LRING)) {
            await pline('You find a ring in the sink!');
            mkobj_at(RING_CLASS, u.ux, u.uy, true);
            if (loc) loc.looted = (loc.looted || 0) | S_LRING;
            exercise(A_WIS, true);
            newsym(u.ux, u.uy);
        } else {
            await pline(`Some dirty ${hliquid('water')} backs up in the drain.`);
        }
        break;
    }
    case 6:
        await breaksink(u.ux, u.uy);
        break;
    case 7: {
        await pline(`The ${hliquid('water')} moves as though of its own will!`);
        const gone = ((game.mvitals?.[PM_WATER_ELEMENTAL]?.mvflags ?? 0) & G_GONE) !== 0;
        if (gone || !makemon(mons(PM_WATER_ELEMENTAL), u.ux, u.uy, MM_NOMSG)) {
            await pline('But it quiets down.');
        }
        break;
    }
    case 8:
        await pline(`Yuk, this ${hliquid('water')} tastes awful.`);
        more_experienced(1, 0);
        await newexplevel();
        break;
    case 9:
        await pline('Gaggg... this tastes like sewage!  You vomit.');
        // C: morehungry(rn1(30 - ACURR(A_CON), 11))
        morehungry(rn1(30 - acurr(A_CON), 11));
        vomit();
        break;
    case 10:
        await pline(`This ${hliquid('water')} contains toxic wastes!`);
        if (!(u.Unchanging || u.HUnchanging)) {
            await pline('You undergo a freakish metamorphosis!');
            // polyself(POLY_NOFLAGS) deferred — no poly RNG yet
        }
        break;
    case 11:
        await You_hear('clanking from the pipes...');
        break;
    case 12:
        await You_hear('snatches of song from among the sewers...');
        break;
    case 13:
        await pline('Ew, what a stench!');
        // create_gas_cloud(ux,uy,1,4) deferred (size-1: no expand RNG)
        break;
    case 19:
        if (u.Hallucination) {
            await pline('From the murky drain, a hand reaches up... --oops--');
            break;
        }
        /* FALLTHROUGH */
    default: {
        // C: rn2(3) ? (rn2(2) ? "cold" : "warm") : "hot"
        const temp = rn2(3) ? (rn2(2) ? 'cold' : 'warm') : 'hot';
        await pline(`You take a sip of ${temp} ${hliquid('water')}.`);
        break;
    }
    }
}

/**
 * C ref: fountain.c level_difficulty via depth(u.uz) (endgame/amulet deferred).
 */
function level_difficulty() {
    return depth_of_level(game.u?.uz) || 1;
}

/** C ref: you.h mhe / mhis — hallu pronoun rn2 deferred (wish msg path rare). */
function mhe(mtmp) {
    if (!canspotmon(mtmp)) return 'it';
    return mtmp?.female ? 'she' : 'he';
}
function mhis(mtmp) {
    if (!canspotmon(mtmp)) return 'its';
    return mtmp?.female ? 'her' : 'his';
}

/**
 * C ref: potion.c mongrantswish — mongone then makewish.
 * tmp_at DISP_ALWAYS glyph hide deferred.
 */
async function mongrantswish(mtmp) {
    if (!mtmp) return;
    const list = game.fmon || [];
    const i = list.indexOf(mtmp);
    if (i >= 0) list.splice(i, 1);
    const ox = mtmp.mx | 0;
    const oy = mtmp.my | 0;
    mtmp.mx = 0;
    mtmp.my = 0;
    if (ox || oy) newsym(ox, oy);
    const { makewish } = await import('./zap.js');
    await makewish();
}

/**
 * C ref: fountain.c dowatersnakes — rn1(5,2) then makemon water moccasins.
 * Hallucination makeplural(rndmonnam) deferred (uses "snakes").
 */
async function dowatersnakes() {
    const u = game.u || {};
    // C: num = rn1(5, 2) before G_GONE gate
    let num = rn1(5, 2);
    const gone = ((game.mvitals?.[PM_WATER_MOCCASIN]?.mvflags ?? 0) & G_GONE) !== 0;
    if (!gone) {
        const Blind = !!(u.Blind || u.ublind);
        if (!Blind) {
            // C: Hallucination ? makeplural(rndmonnam(NULL)) : "snakes"
            await pline('An endless stream of snakes pours forth!');
        } else {
            await You_hear('something hissing!');
        }
        while (num-- > 0) {
            const mtmp = makemon(mons(PM_WATER_MOCCASIN), u.ux, u.uy, MM_NOMSG);
            if (mtmp && t_at(mtmp.mx, mtmp.my)) {
                await mintrap(mtmp, NO_TRAP_FLAGS);
            }
        }
    } else {
        await pline(
            'The fountain bubbles furiously for a moment, then calms.',
        );
    }
}

/**
 * C ref: fountain.c dowaterdemon — makemon water demon; maybe wish / mintrap.
 */
async function dowaterdemon() {
    const u = game.u || {};
    const gone = ((game.mvitals?.[PM_WATER_DEMON]?.mvflags ?? 0) & G_GONE) !== 0;
    if (!gone) {
        const mtmp = makemon(mons(PM_WATER_DEMON), u.ux, u.uy, MM_NOMSG);
        if (mtmp) {
            const Blind = !!(u.Blind || u.ublind);
            if (!Blind) {
                await pline(`You unleash ${a_monnam(mtmp)}!`);
            } else {
                await You_feel('the presence of evil.');
            }
            // C: rnd(100) > (80 + level_difficulty()) → wish
            if (rnd(100) > (80 + level_difficulty())) {
                await pline(
                    `Grateful for ${mhis(mtmp)} release, ${mhe(mtmp)}`
                    + ' grants you a wish!',
                );
                await mongrantswish(mtmp);
            } else if (t_at(mtmp.mx, mtmp.my)) {
                await mintrap(mtmp, NO_TRAP_FLAGS);
            }
        }
    } else {
        await pline(
            'The fountain bubbles furiously for a moment, then calms.',
        );
    }
}

/**
 * C ref: fountain.c dryup
 * Town warn / wizard yn / angry_guards deferred.
 */
export async function dryup(x, y, isyou) {
    const loc = game.level?.at(x, y);
    if (!loc || !IS_FOUNTAIN(loc.typ)) return;
    if (!(!rn2(3) || FOUNTAIN_IS_WARNED(x, y))) return;

    await pline('The fountain dries up!');
    loc.typ = ROOM;
    loc.flags = 0;
    loc.blessedftn = 0;
    if (game.level?.flags && (game.level.flags.nfountains | 0) > 0) {
        game.level.flags.nfountains--;
    }
    newsym(x, y);
    void isyou;
}

/**
 * C ref: fountain.c drinkfountain — quaff while standing on a fountain.
 */
export async function drinkfountain() {
    const u = game.u || {};
    const loc = game.level?.at(u.ux, u.uy);
    const mgkftn = (loc?.blessedftn | 0) === 1;
    // C: fate = rnd(30) before Levitation check
    const fate = rnd(30);

    if (u.Levitation) {
        await floating_above('fountain');
        return;
    }

    if (mgkftn && (u.uluck | 0) >= 0 && fate >= 10) {
        const littleluck = (u.uluck | 0) < 4;
        await pline('Wow!  This makes you feel great!');
        // blessed restore ability
        for (let ii = 0; ii < A_MAX; ii++) {
            const base = u.acurr?.a?.[ii] | 0;
            const mx = u.amax?.a?.[ii] | 0;
            if (base < mx) {
                u.acurr.a[ii] = mx;
                if (!game.flags) game.flags = {};
                game.flags.botl = true;
            }
        }
        // gain ability; blessed if natural luck high
        let i = rn2(A_MAX);
        for (let ii = 0; ii < A_MAX; ii++) {
            if (await adjattrib(i, 1, littleluck ? -1 : 0) && littleluck) break;
            if (++i >= A_MAX) i = 0;
        }
        await flush_topl_more(); // display_nhwindow(WIN_MESSAGE, FALSE)
        await pline('A wisp of vapor escapes the fountain...');
        exercise(A_WIS, true);
        if (loc) loc.blessedftn = 0;
        return;
    }

    if (fate < 10) {
        await pline('The cool draught refreshes you.');
        lesshungry(rnd(10)); // u.uhunger += rnd(10); newuhs deferred
        if (mgkftn) return;
    } else {
        switch (fate) {
        case 19: // Self-knowledge — enlightenment body deferred
            await You_feel('self-knowledgeable...');
            await flush_topl_more();
            // enlightenment(MAGICENLIGHTENMENT, ENL_GAMEINPROGRESS) deferred
            exercise(A_WIS, true);
            await pline('The feeling subsides.');
            break;
        case 20: // Foul water
            await pline('The water is foul!  You gag and vomit.');
            morehungry(rn1(20, 11));
            // C: eat.c vomit() — nomul(-2); poly acid spew deferred
            vomit();
            break;
        case 21: { // Poisonous
            await pline('The water is contaminated!');
            const poisRes = !!(u.HPoison_resistance || u.EPoison_resistance
                || u.Poison_resistance);
            if (poisRes) {
                await pline(
                    'Perhaps it is runoff from the nearby fruit farm.',
                );
                losehp(rnd(4), 'unrefrigerated sip of juice', KILLED_BY_AN);
                break;
            }
            // clang LTR: poison_strdmg(rn1(4,3), rnd(10), ...)
            const strloss = rn1(4, 3);
            const dmg = rnd(10);
            await poison_strdmg(strloss, dmg);
            exercise(A_CON, false);
            break;
        }
        case 22: // Fountain of snakes
            await dowatersnakes();
            break;
        case 23: // Water demon
            await dowaterdemon();
            break;
        case 24: { // Maybe curse some items
            await pline("This water's no good!");
            morehungry(rn1(20, 11));
            exercise(A_CON, false);
            let buc_changed = 0;
            for (const obj of [...(game.invent || [])]) {
                if (obj.oclass !== COIN_CLASS && !obj.cursed && !rn2(5)) {
                    curse(obj);
                    buc_changed++;
                }
            }
            void buc_changed; // update_inventory deferred
            break;
        }
        case 25: // See invisible
            if (u.Blind || u.ublind) {
                if (u.HInvis || u.EInvis || u.Invis) {
                    await pline('You feel transparent.');
                } else {
                    await pline('You feel very self-conscious.');
                    await pline('Then it passes.');
                }
            } else {
                await pline('You see an image of someone stalking you.');
                await pline('But it disappears.');
            }
            u.HSee_invisible = (u.HSee_invisible || 0) | FROMOUTSIDE;
            newsym(u.ux, u.uy);
            exercise(A_WIS, true);
            break;
        case 26: { // See Monsters — detect.c monster_detect
            if (await monster_detect(null, 0)) {
                await pline(`The ${hliquid('water')} tastes like nothing.`);
            }
            exercise(A_WIS, true);
            break;
        }
        case 27: // Find a gem in the sparkling waters
            if (!FOUNTAIN_IS_LOOTED(u.ux, u.uy)) {
                await dofindgem();
                break;
            }
            // FALLTHROUGH — dowaternymph when already looted (deferred)
            /* falls through */
        case 28: // Water Nymph — dowaternymph deferred
            break;
        case 29: { // Scare
            await pline(`This ${hliquid('water')} gives you bad breath!`);
            for (const mtmp of game.fmon || []) {
                if (mtmp.mhp <= 0) continue;
                // monflee(mtmp, 0, FALSE, FALSE) — fleetime 0, no RNG
                mtmp.mflee = 1;
                mtmp.mfleetim = 0;
            }
            break;
        }
        case 30: // Gushing forth — dogushforth deferred
            break;
        default:
            await pline(`This tepid ${hliquid('water')} is tasteless.`);
            break;
        }
    }
    await dryup(u.ux, u.uy, true);
}

/**
 * C ref: fountain.c dipfountain
 * @param {object} obj invent object or hands_obj
 */
export async function dipfountain(obj) {
    const u = game.u || {};
    if (u.Levitation) {
        await floating_above('fountain');
        return;
    }

    const is_hands = obj === hands_obj;

    // C && order: otyp, ulevel, rn2, quan, !oartifact, !exist_artifact
    if (obj && obj.otyp === LONG_SWORD && (u.ulevel | 0) >= 5
        && !rn2(game.urole?.mnum === PM_KNIGHT ? 6 : 30)
        && (obj.quan | 0) === 1 && !obj.oartifact) {
        // exist_artifact stub: assume none — Excalibur body deferred
        await dryup(u.ux, u.uy, true);
        return;
    }

    let er = ER_NOTHING;
    if (is_hands || obj === u.uarmg) {
        // wash_hands deferred — ER_NOTHING (no RNG)
        er = ER_NOTHING;
    } else {
        er = water_damage(obj, null, true);
    }

    if (er === ER_DESTROYED || (er !== ER_NOTHING && !rn2(2))) {
        return;
    }

    switch (rnd(30)) {
    case 16: // Curse the item
        if (!is_hands && obj.oclass !== COIN_CLASS && !obj.cursed) {
            curse(obj);
        }
        break;
    case 17:
    case 18:
    case 19:
    case 20:
    case 21:
    case 22:
        // Uncurse / demon / nymph — deferred
        break;
    case 23: // Endless stream of snakes
        await dowatersnakes();
        break;
    case 24: // Find a gem
        if (!FOUNTAIN_IS_LOOTED(u.ux, u.uy)) {
            await dofindgem();
            break;
        }
        // FALLTHROUGH — dogushforth when already looted (deferred)
        /* falls through */
    case 25:
    case 26:
    case 27:
    case 28:
    case 29:
        // Gush / feelings / bath / coins — deferred
        break;
    default:
        if (er === ER_NOTHING) {
            await pline(nothing_seems_to_happen);
        }
        break;
    }
    await dryup(u.ux, u.uy, true);
}
