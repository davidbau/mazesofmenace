// dogmove.js — Pet AI movement.
// C ref: dogmove.c — dog_move, dog_goal, dogfood (via dog.c), obj_resists callers.

import { game } from './gstate.js';
import { rn2, rnd } from './rng.js';
import {
    dist2, distmin, mon_allowflags, mfndpos, m_at, monnear, onscary, ALLOW_M,
    ALLOW_U, ALLOW_TRAPS, m_avoid_kicked_loc, m_avoid_soko_push_loc,
} from './mon.js';
import {
    objects_at, obj_extract_self, place_object, splitobj, stackobj, delobj,
} from './mkobj.js';
import { mattackm, max_passive_dmg } from './mhitm.js';
import { mattacku } from './mhitu.js';
import { newsym, pline, canseemon } from './display.js';
import { doname, distant_name } from './objnam.js';
import { mpickobj } from './makemon.js';
import { t_at } from './trap.js';
import {
    COLNO, ROWNO, ROOM, STAIRS,
    DOGFOOD, CADAVER, ACCFOOD, MANFOOD, APPORT, POISON, UNDEF, TABU,
    MMOVE_NOTHING, MMOVE_MOVED, MMOVE_DIED, MMOVE_NOMOVES, MMOVE_DONE,
    M_ATTK_HIT, M_ATTK_DEF_DIED, M_ATTK_AGR_DIED,
    IS_OBSTRUCTED, IS_DOOR, D_CLOSED, D_LOCKED, ALLOW_MDISP,
    MAGIC_PORTAL,
} from './const.js';
import { FOOD_CLASS, BALL_CLASS, CHAIN_CLASS, ROCK_CLASS, COIN_CLASS, objectNames } from './objects.js';
import {
    monsterNames, mons, carnivorous, herbivorous, vegan, acidic, poisonous,
    is_swimmer, likes_lava, throws_rocks, is_rider,
    PM_LICHEN, MZ_TINY, MZ_SMALL, MZ_MEDIUM, MZ_LARGE, MZ_HUGE,
} from './monsters.js';
import { m_cansee, couldsee, cansee, do_clear_area } from './vision.js';
import { Monnam, noit_Monnam } from './do_name.js';
import { gettrack } from './track.js';
import { hero_conflict, resist_conflict } from './mondata.js';
import { is_pool, is_lava } from './hack.js';

const PM_FLOATING_EYE = monsterNames.indexOf('PM_FLOATING_EYE');
const PM_GELATINOUS_CUBE = monsterNames.indexOf('PM_GELATINOUS_CUBE');
const PM_LIZARD = monsterNames.indexOf('PM_LIZARD');

/** C ref: monflag.h enum ms_sounds — pal/target tests (D-1093). */
const MS_LEADER = 36;
const MS_GUARDIAN = 38;

const MTSZ = 4;
const SQSRCHRADIUS = 5;

const TRIPE_RATION = objectNames.indexOf('TRIPE_RATION');
const MEATBALL = objectNames.indexOf('MEATBALL');
const MEAT_RING = objectNames.indexOf('MEAT_RING');
const MEAT_STICK = objectNames.indexOf('MEAT_STICK');
const ENORMOUS_MEATBALL = objectNames.indexOf('ENORMOUS_MEATBALL');
const APPLE = objectNames.indexOf('APPLE');
const CARROT = objectNames.indexOf('CARROT');
const BOULDER = objectNames.indexOf('BOULDER');
const BANANA = objectNames.indexOf('BANANA');
const EGG = objectNames.indexOf('EGG');
const CORPSE = objectNames.indexOf('CORPSE');
const TIN = objectNames.indexOf('TIN');
const SLIME_MOLD = objectNames.indexOf('SLIME_MOLD');

function mon_track_add(mtmp, x, y) {
    if (!mtmp.mtrack) {
        mtmp.mtrack = [
            { x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 },
        ];
    }
    for (let j = MTSZ - 1; j > 0; j--) mtmp.mtrack[j] = { ...mtmp.mtrack[j - 1] };
    mtmp.mtrack[0] = { x, y };
}

// C ref: stairs.c On_stairs — stairs/ladder endpoints only
function On_stairs(x, y) {
    const L = game.level;
    if (!L) return false;
    if ((x === L.upstair?.x && y === L.upstair?.y)
        || (x === L.dnstair?.x && y === L.dnstair?.y)
        || (x === L.upladder?.x && y === L.upladder?.y)
        || (x === L.dnladder?.x && y === L.dnladder?.y))
        return true;
    // Also typ-based: hero standing on STAIRS glyph (ladder flag)
    const loc = L.at?.(x, y);
    return !!(loc && (loc.typ === STAIRS || loc.ladder));
}

// C ref: rm.h IS_ROOM — typ >= ROOM (includes STAIRS / furniture)
function IS_ROOM(typ) {
    return typ >= ROOM;
}

// C ref: questpgr.c is_quest_artifact — oartifact == urole.questarti
function is_quest_artifact(obj) {
    const want = game.urole?.questarti | 0;
    // C compares raw; guard want!==0 so incomplete urole cannot skip all rn2
    return want !== 0 && (obj?.oartifact | 0) === want;
}

// C ref: zap.c obj_resists() — invocation/rider items return TRUE with no
// rn2; ordinary objects always consume rn2(100) (D-0864).
export function obj_resists(obj, ochance, achance) {
    if (!obj) return false;
    const n = objectNames[obj.otyp];
    if (n === 'AMULET_OF_YENDOR'
        || n === 'SPE_BOOK_OF_THE_DEAD'
        || n === 'CANDELABRUM_OF_INVOCATION'
        || n === 'BELL_OF_OPENING'
        || (n === 'CORPSE' && is_rider(mons(obj.corpsenm)))) {
        return true;
    }
    const chance = rn2(100);
    return chance < (obj.oartifact ? achance : ochance);
}

// C ref: dog.c dogfood() — quest arti short-circuit then obj_resists.
export function dogfood(mon, obj) {
    if (!obj) return UNDEF;
    if (obj.opoisoned) return POISON;
    if (is_quest_artifact(obj) || obj_resists(obj, 0, 95)) {
        return obj.cursed ? TABU : APPORT;
    }

    const mptr = mon?.data ?? mons(mon?.mnum);
    const oclass = obj.oclass ?? 0;
    const otyp = obj.otyp ?? -1;
    const carni = carnivorous(mptr);
    const herbi = herbivorous(mptr);
    const starving = !!(mon?.mtame && !mon?.isminion && mon?.edog?.mhpmax_penalty);

    if (oclass === FOOD_CLASS) {
        // C: fx = corpsenm for CORPSE/TIN/EGG else NON_PM; fptr = &mons[fx|NUMMONS]
        const fx = (otyp === CORPSE || otyp === TIN || otyp === EGG)
            ? (obj.corpsenm ?? -1) : -1;
        const fptr = (fx >= 0) ? mons(fx) : null;

        switch (otyp) {
            case TRIPE_RATION:
            case MEATBALL:
            case MEAT_RING:
            case MEAT_STICK:
            case ENORMOUS_MEATBALL:
                return carni ? DOGFOOD : MANFOOD;
            case EGG:
                return carni ? CADAVER : MANFOOD;
            case CORPSE: {
                // C ref: dog.c dogfood CORPSE — age/poison/acid → POISON;
                // vegan(fptr) → herbi?CADAVER:MANFOOD (lichen etc.).
                // polyfood / humanoid cannibalism / rider / petrify deferred.
                const moves = game.moves ?? 1;
                const corpseAge = obj.age ?? moves;
                const agePoison = corpseAge + 50 <= moves
                    && fx !== PM_LIZARD && fx !== PM_LICHEN
                    && mptr?.mlet !== 'S_FUNGUS';
                // resists_poison/acid: Resists_Elem not ported — pets lack them
                if (agePoison
                    || (acidic(fptr) /* && !resists_acid(mon) */)
                    || (poisonous(fptr) /* && !resists_poison(mon) */)) {
                    return POISON;
                }
                if (vegan(fptr)) return herbi ? CADAVER : MANFOOD;
                return carni ? CADAVER : MANFOOD;
            }
            case APPLE:
                return herbi ? DOGFOOD : starving ? ACCFOOD : MANFOOD;
            case CARROT:
                return herbi ? DOGFOOD : starving ? ACCFOOD : MANFOOD;
            case BANANA:
                return herbi ? ACCFOOD : MANFOOD;
            case TIN:
                return MANFOOD;
            default:
                if (starving) return ACCFOOD;
                if (otyp > SLIME_MOLD) return carni ? ACCFOOD : MANFOOD;
                return herbi ? ACCFOOD : MANFOOD;
        }
    }
    if (!obj.cursed && oclass !== BALL_CLASS && oclass !== CHAIN_CLASS
        && oclass !== ROCK_CLASS) {
        return APPORT;
    }
    if (oclass === ROCK_CLASS) return UNDEF;
    return UNDEF;
}

// Goal state for current dog_move (C: gg.gtyp/gx/gy)
const gg = { gtyp: UNDEF, gx: 0, gy: 0 };

/**
 * C ref: dogmove.c could_reach_item — pool/lava/boulder gates.
 * Flyer-only reach deferred (C has no flyer special here).
 */
function could_reach_item(mon, nx, ny) {
    const ptr = mon?.data ?? mons(mon?.mnum);
    if (is_pool(nx, ny) && !is_swimmer(ptr)) return false;
    if (is_lava(nx, ny) && !likes_lava(ptr)) return false;
    if (BOULDER >= 0) {
        for (let obj = objects_at(nx, ny); obj; obj = obj.nexthere) {
            if ((obj.otyp | 0) === BOULDER && !throws_rocks(ptr)) return false;
        }
    }
    return true;
}

function isok(x, y) {
    return x >= 1 && x < COLNO && y >= 0 && y < ROWNO;
}

/** C ref: dogmove.c can_reach_location — recursive path toward goal. */
function can_reach_location(mon, mx, my, fx, fy) {
    if (mx === fx && my === fy) return true;
    if (!isok(mx, my)) return false;
    const dist = dist2(mx, my, fx, fy);
    for (let i = mx - 1; i <= mx + 1; i++) {
        for (let j = my - 1; j <= my + 1; j++) {
            if (!isok(i, j)) continue;
            if (dist2(i, j, fx, fy) >= dist) continue;
            const loc = game.level?.at?.(i, j);
            const typ = loc?.typ ?? 0;
            if (IS_OBSTRUCTED(typ) /* passes_walls / dig stub: pets can't */)
                continue;
            if (IS_DOOR(typ) && ((loc?.doormask || 0) & (D_CLOSED | D_LOCKED)))
                continue;
            if (!could_reach_item(mon, i, j)) continue;
            if (can_reach_location(mon, i, j, fx, fy)) return true;
        }
    }
    return false;
}

/** C ref: mon.c max_mon_load / can_carry — weight + nohands partial stack. */
function max_mon_load(mtmp) {
    const MAX_CARR_CAP = 1000; // decl.c
    const MZ_HUMAN = 3;
    const WT_HUMAN = 1450;
    const msize = mtmp.data?.msize ?? 2;
    const cwt = mtmp.data?.cwt ?? 0;
    let maxload;
    if (!cwt)
        maxload = Math.trunc((MAX_CARR_CAP * msize) / MZ_HUMAN);
    else
        maxload = Math.trunc((MAX_CARR_CAP * cwt) / WT_HUMAN);
    // non-strong: half (kittens/dogs are not strongmonst)
    maxload = Math.trunc(maxload / 2);
    return Math.max(1, maxload);
}

function can_carry(mtmp, otmp) {
    if (!mtmp || !otmp) return 0;
    let iquan = otmp.quan || 1;
    // nohands + quan>1 → return 1 before weight (C mon.c can_carry)
    if (iquan > 1) {
        return 1;
    }
    if ((otmp.owt || 0) > max_mon_load(mtmp)) return 0;
    return iquan;
}


// C ref: dogmove.c cursed_object_at()
function cursed_object_at(x, y) {
    for (let otmp = objects_at(x, y); otmp; otmp = otmp.nexthere) {
        if (otmp.cursed) return true;
    }
    return false;
}

// C objects.h FOOD nutrition — extractor omits oc_nutrition (same map as eat.js).
const FOOD_NUTRITION = {
    FORTUNE_COOKIE: 40,
    APPLE: 50,
    PEAR: 50,
    ORANGE: 80,
    MELON: 100,
    BANANA: 80,
    CARROT: 50,
    FOOD_RATION: 800,
    TRIPE_RATION: 200,
    LEMBAS_WAFER: 800,
    CRAM_RATION: 600,
    K_RATION: 400,
    C_RATION: 300,
    EGG: 80,
    CLOVE_OF_GARLIC: 40,
    SPRIG_OF_WOLFSBANE: 40,
    EUCALYPTUS_LEAF: 1,
    CANDY_BAR: 100,
    CREAM_PIE: 100,
    PANCAKE: 200,
    SLIME_MOLD: 250,
    LUMP_OF_ROYAL_JELLY: 200,
    MEATBALL: 5,
    MEAT_STICK: 5,
    MEAT_RING: 5,
    ENORMOUS_MEATBALL: 5,
};

function food_oc_nutrition(otyp) {
    const oc = game.objects?.[otyp];
    if (oc?.oc_nutrition != null) return oc.oc_nutrition | 0;
    const name = objectNames[otyp];
    return FOOD_NUTRITION[name] ?? 0;
}

// C ref: dogmove.c dog_nutrition — meating/hungrytime; corpse uses cwt/cnutrit.
function dog_nutrition(mtmp, obj) {
    const oclass = obj.oclass ?? 0;
    const otyp = obj.otyp ?? -1;
    const oc = game.objects?.[otyp];

    if (oclass === FOOD_CLASS) {
        let nutrit;
        if (otyp === CORPSE) {
            const cwt = obj.cwt ?? mons_cwt(obj.corpsenm);
            mtmp.meating = 3 + (cwt >> 6);
            nutrit = obj.cnutrit ?? mons_cnutrit(obj.corpsenm);
        } else {
            // C: objects[obj->otyp].oc_delay / oc_nutrition — table, not instance
            mtmp.meating = oc?.oc_delay ?? 1;
            nutrit = food_oc_nutrition(otyp);
        }
        // C: pet gets more nutrition by msize (little dog MZ_SMALL → ×6)
        const msize = mtmp.data?.msize ?? MZ_MEDIUM;
        if (msize === MZ_TINY) nutrit *= 8;
        else if (msize === MZ_SMALL) nutrit *= 6;
        else if (msize === MZ_LARGE) nutrit *= 4;
        else if (msize === MZ_HUGE) nutrit *= 3;
        else if (msize > MZ_HUGE) nutrit *= 2; // MZ_GIGANTIC
        else nutrit *= 5; // MZ_MEDIUM default
        // oeaten/eaten_stat deferred
        return nutrit;
    }
    if (oclass === COIN_CLASS) {
        mtmp.meating = Math.trunc((obj.quan || 0) / 2000) + 1;
        if (mtmp.meating < 1) mtmp.meating = 1;
        let nutrit = Math.trunc((obj.quan || 0) / 20);
        if (nutrit < 0) nutrit = 0;
        return nutrit;
    }
    // C: unusual non-food — meating = owt/20+1 (not /2)
    mtmp.meating = Math.trunc((obj.owt || 0) / 20) + 1;
    if (mtmp.meating < 1) mtmp.meating = 1;
    return 5 * food_oc_nutrition(otyp);
}

function mons_cwt(corpsenm) {
    return mons(corpsenm)?.cwt ?? 10;
}

function mons_cnutrit(corpsenm) {
    return mons(corpsenm)?.cnutrit ?? 20;
}

// C ref: mon.c m_consume_obj — pet heal omitted; delobj always rolls obj_resists(0,0).
function m_consume_obj(_mtmp, otmp) {
    // Has_contents/meatbox, uball/uchain, polyfood/slime deferred
    delobj(otmp);
}

/**
 * C ref: dogmove.c dog_eat()
 * Returns 2 if pet died, 1 otherwise. Always re-rolls dogfood (obj_resists)
 * for the DOGFOOD+invlet apport reward check; then m_consume_obj→delobj.
 * Exported for dog.c tamedog thrown-food path (D-0415).
 */
export async function dog_eat(mtmp, obj, x, y, devour) {
    const edog = mtmp.edog;
    if (!obj || !edog) return 1;

    if ((edog.hungrytime || 0) < (game.moves ?? 1)) {
        edog.hungrytime = game.moves ?? 1;
    }
    let nutrit = dog_nutrition(mtmp, obj);
    if (devour) {
        if ((mtmp.meating || 0) > 1) mtmp.meating = Math.trunc(mtmp.meating / 2);
        if (nutrit > 1) nutrit = Math.trunc((nutrit * 3) / 4);
    }
    edog.hungrytime = (edog.hungrytime || 0) + nutrit;
    mtmp.mconf = 0;
    if (edog.mhpmax_penalty) {
        mtmp.mhpmax = (mtmp.mhpmax || 0) + edog.mhpmax_penalty;
        edog.mhpmax_penalty = 0;
    }
    if (mtmp.mflee && (mtmp.mfleetim || 0) > 1) {
        mtmp.mfleetim = Math.trunc(mtmp.mfleetim / 2);
    }
    if ((mtmp.mtame || 0) < 20) mtmp.mtame = (mtmp.mtame || 0) + 1;

    if (x !== mtmp.mx || y !== mtmp.my) {
        newsym(x, y);
        newsym(mtmp.mx, mtmp.my);
    }

    // bee jelly / unpaid shop / rust monster spit deferred
    if ((obj.quan || 1) > 1 && (obj.oclass ?? 0) === FOOD_CLASS) {
        obj = splitobj(obj, 1) || obj;
    }

    const seeobj = cansee(mtmp.mx, mtmp.my);
    const sawpet = cansee(x, y) && canseemon(mtmp);
    if (sawpet || (seeobj && canseemon(mtmp))) {
        const obj_name = doname(obj);
        await pline(
            `${noit_Monnam(mtmp)} ${devour ? 'devours' : 'eats'} ${obj_name}.`,
        );
    } else if (seeobj) {
        const obj_name = doname(obj);
        await pline(`It ${devour ? 'devours' : 'eats'} ${obj_name}.`);
    }

    // C: dogfood again for DOGFOOD+invlet apport — always rolls obj_resists
    if (dogfood(mtmp, obj) === DOGFOOD && obj.invlet) {
        edog.apport = (edog.apport || 0)
            + Math.trunc(200 / ((edog.dropdist || 0)
                + (game.moves ?? 1) - (edog.droptime || 0)));
        if (edog.apport <= 0) edog.apport = 1;
    }
    m_consume_obj(mtmp, obj);
    return (mtmp.mhp | 0) <= 0 ? 2 : 1;
}

// C ref: dogmove.c dog_goal()
function dog_goal(mtmp, edog, after, udist, whappr) {
    // C: Steeds don't move on their own will
    if (mtmp === game.u?.usteed) return -2;

    const omx = mtmp.mx, omy = mtmp.my;
    // C: in_masters_sight = couldsee(omx, omy) — viz_array COULD_SEE
    const in_masters_sight = couldsee(omx, omy);
    const dog_has_minvent = !!(edog && droppables(mtmp));

    if (!edog || mtmp.mleashed) {
        gg.gtyp = APPORT;
        gg.gx = game.u.ux;
        gg.gy = game.u.uy;
    } else {
        gg.gtyp = UNDEF;
        gg.gx = 0;
        gg.gy = 0;
        const min_x = Math.max(1, omx - SQSRCHRADIUS);
        const max_x = Math.min(COLNO - 1, omx + SQSRCHRADIUS);
        const min_y = Math.max(0, omy - SQSRCHRADIUS);
        const max_y = Math.min(ROWNO - 1, omy + SQSRCHRADIUS);

        for (let obj = game.fobj; obj; obj = obj.nobj) {
            const nx = obj.ox, ny = obj.oy;
            if (nx < min_x || nx > max_x || ny < min_y || ny > max_y) continue;
            const otyp = dogfood(mtmp, obj);
            if (otyp > gg.gtyp || otyp === UNDEF) continue;
            // C: avoid cursed items unless starving for real food
            if (cursed_object_at(nx, ny)
                && !(edog.mhpmax_penalty && otyp < MANFOOD))
                continue;
            if (!could_reach_item(mtmp, nx, ny)
                || !can_reach_location(mtmp, omx, omy, nx, ny)) continue;

            if (otyp < MANFOOD) {
                // C: otyp < gtyp || closer — UNDEF(6) makes first food win
                if (otyp < gg.gtyp
                    || dist2(nx, ny, omx, omy) < dist2(gg.gx, gg.gy, omx, omy)) {
                    gg.gx = nx;
                    gg.gy = ny;
                    gg.gtyp = otyp;
                }
            } else if (gg.gtyp === UNDEF && in_masters_sight && !dog_has_minvent
                // C: (!levl[omx][omy].lit || levl[u.ux][u.uy].lit)
                && (!(game.level?.at(omx, omy)?.lit)
                    || !!(game.level?.at(game.u.ux, game.u.uy)?.lit))
                // C: (otyp == MANFOOD || m_cansee(mtmp, nx, ny))
                && (otyp === MANFOOD || m_cansee(mtmp, nx, ny))
                && edog.apport > rn2(8)
                && can_carry(mtmp, obj) > 0) {
                gg.gx = nx;
                gg.gy = ny;
                gg.gtyp = APPORT;
            }
        }
    }

    let appr;
    if (gg.gtyp === UNDEF || (gg.gtyp !== DOGFOOD && gg.gtyp !== APPORT
        && (game.moves ?? 1) < (edog?.hungrytime ?? 0))) {
        gg.gx = game.u.ux;
        gg.gy = game.u.uy;
        if (after && udist <= 4 && game.u.ux === gg.gx && game.u.uy === gg.gy)
            return -2;
        appr = (udist >= 9) ? 1 : (mtmp.mflee ? -1 : 0);
        // C: if (udist > 1) — squared; ortho-adjacent (udist==1) skips
        if (udist > 1) {
            const heroTyp = game.level?.at(game.u.ux, game.u.uy)?.typ ?? 0;
            if (!IS_ROOM(heroTyp) || !rn2(4) || whappr
                || (dog_has_minvent && rn2(edog?.apport || 1)))
                appr = 1;
        }
        if (appr === 0) {
            if (On_stairs(game.u.ux, game.u.uy)) {
                appr = 1;
            } else {
                for (const obj of game.invent || []) {
                    if (dogfood(mtmp, obj) === DOGFOOD) {
                        appr = 1;
                        break;
                    }
                }
                // C: magic portal within distu <= 2
                if (appr === 0) {
                    for (let t = game.ftrap; t; t = t.ntrap) {
                        if (t.ttyp === MAGIC_PORTAL) {
                            if (dist2(t.tx, t.ty, game.u.ux, game.u.uy) <= 2) {
                                appr = 1;
                            }
                            break;
                        }
                    }
                }
            }
        }
    } else {
        appr = 1;
    }
    if (mtmp.mconf) appr = 0;

    // C: dog_goal gettrack / ogoal / wantdoor when goal is hero and
    // !couldsee(pet). Local FARAWAY = COLNO+2 (not const.js FARAWAY=127).
    const DOG_GOAL_FARAWAY = COLNO + 2;
    if (gg.gx === game.u.ux && gg.gy === game.u.uy && !in_masters_sight) {
        const cp = gettrack(omx, omy);
        if (cp) {
            gg.gx = cp.x;
            gg.gy = cp.y;
            if (edog) {
                if (!edog.ogoal) edog.ogoal = { x: 0, y: 0 };
                edog.ogoal.x = 0;
            }
        } else if (edog && edog.ogoal?.x
            && (edog.ogoal.x !== omx || edog.ogoal.y !== omy)) {
            gg.gx = edog.ogoal.x;
            gg.gy = edog.ogoal.y;
            edog.ogoal.x = 0;
        } else {
            // C: do_clear_area(omx,omy,9,wantdoor,&fardist) — closest
            // clear cell to hero within pet's view_from range 9
            const fardist = { v: DOG_GOAL_FARAWAY * DOG_GOAL_FARAWAY };
            gg.gx = DOG_GOAL_FARAWAY;
            gg.gy = DOG_GOAL_FARAWAY;
            do_clear_area(omx, omy, 9, (x, y, distPtr) => {
                const ndist = dist2(x, y, game.u.ux, game.u.uy);
                if (distPtr.v > ndist) {
                    gg.gx = x;
                    gg.gy = y;
                    distPtr.v = ndist;
                }
            }, fardist);
            if (gg.gx === DOG_GOAL_FARAWAY || (gg.gx === omx && gg.gy === omy)) {
                gg.gx = game.u.ux;
                gg.gy = game.u.uy;
            } else if (edog) {
                if (!edog.ogoal) edog.ogoal = { x: 0, y: 0 };
                edog.ogoal.x = gg.gx;
                edog.ogoal.y = gg.gy;
            }
        }
    } else if (edog) {
        if (!edog.ogoal) edog.ogoal = { x: 0, y: 0 };
        edog.ogoal.x = 0;
    }
    return appr;
}

// C ref: dogmove.c droppables — animal/mindless keep no tools; first free obj
function droppables(mon) {
    const wep = mon.mwep || null;
    for (let obj = mon.minvent; obj; obj = obj.nobj) {
        // Tool-keeping branches omitted for animal pets (kitten/dog):
        // is_animal → pick/horn/key treated as already held → fall to default.
        if (!obj.owornmask && obj !== wep) return obj;
    }
    return null;
}

// C ref: steal.c mdrop_obj — pet drop subset (worn/saddle/shop/extrinsics omitted)
async function mdrop_obj(mon, obj, verbosely) {
    const omx = mon.mx, omy = mon.my;
    // C: distant_name(obj, doname) before extract — near observe side-effects
    const obj_name = distant_name(obj, doname);
    // C: extract_from_minvent(mon, obj, FALSE, TRUE) → core is obj_extract_self
    obj_extract_self(obj);
    if (obj.owornmask) obj.owornmask = 0;
    // C: if (verbosely && cansee(omx, omy)) pline_mon(...)
    if (verbosely && cansee(omx, omy)) {
        await pline(`${Monnam(mon)} drops ${obj_name}.`);
    }
    // flooreffects omitted — ordinary missiles/items place on floor
    place_object(obj, omx, omy);
    stackobj(obj);
}

// C ref: steal.c relobj — is_pet uses droppables; vault-guard gold omitted
async function relobj(mtmp, show, is_pet) {
    const omx = mtmp.mx, omy = mtmp.my;
    let otmp;
    while ((otmp = (is_pet ? droppables(mtmp) : mtmp.minvent)) != null) {
        await mdrop_obj(mtmp, otmp, !!(is_pet && game.flags?.verbose !== false));
    }
    // C: if (show && cansee(omx, omy)) newsym(...)
    if (show && cansee(omx, omy)) newsym(omx, omy);
}

// C ref: dogmove.c dog_invent — udist is squared dist2 (same as dog_move)
// Branch envelope: drop/APPORT pickup + underfoot DOGFOOD/CADAVER/
// starving-ACCFOOD → dog_eat return; mines/soko prize + MAIL skip deferred.
async function dog_invent(mtmp, edog, udist) {
    // C: helpless(mtmp) || meating → 0 (msleeping/mfrozen subset)
    if (mtmp.msleeping || mtmp.mfrozen || mtmp.meating) return 0;
    // C: if (droppables(mtmp)) { assert(apport>0); maybe relobj }
    if (droppables(mtmp)) {
        if (!edog || !(edog.apport > 0)) return 0;
        // Use udist+1 so steed won't cause divide by zero
        if (!rn2(udist + 1) || !rn2(edog.apport)) {
            if (rn2(10) < edog.apport) {
                await relobj(mtmp, mtmp.minvis ? 1 : 0, true);
                if (edog.apport > 1) edog.apport--;
                edog.dropdist = udist;
                edog.droptime = game.moves ?? 1;
            }
        }
        return 0;
    }
    const omx = mtmp.mx, omy = mtmp.my;
    const obj = objects_at(omx, omy);
    if (!obj) return 0;
    const oclass = obj.oclass ?? 0;
    if (oclass === BALL_CLASS || oclass === CHAIN_CLASS || oclass === ROCK_CLASS)
        return 0;

    const edible = dogfood(mtmp, obj);
    // C: edible <= CADAVER, or starving ACCFOOD, before APPORT
    if ((edible <= CADAVER
            || (edog?.mhpmax_penalty && edible === ACCFOOD))
        && could_reach_item(mtmp, obj.ox, obj.oy)) {
        return await dog_eat(mtmp, obj, omx, omy, false);
    }

    const carryamt = can_carry(mtmp, obj);
    if (carryamt > 0 && !obj.cursed && edog && could_reach_item(mtmp, obj.ox, obj.oy)) {
        if (rn2(20) < (edog.apport || 0) + 3) {
            if (rn2(udist) || !rn2(edog.apport || 1)) {
                let otmp = obj;
                // C: if (carryamt != obj->quan) otmp = splitobj(obj, carryamt);
                if (carryamt !== (obj.quan || 1)) {
                    otmp = splitobj(obj, carryamt) || obj;
                }
                // C: distant_name(otmp, doname) even when !verbose — near
                // path observes; then flags.verbose pline
                if (cansee(omx, omy)) {
                    const otmpname = distant_name(otmp, doname);
                    if (game.flags?.verbose !== false) {
                        await pline(`${Monnam(mtmp)} picks up ${otmpname}.`);
                    }
                }
                obj_extract_self(otmp);
                newsym(omx, omy);
                mpickobj(mtmp, otmp);
                // mon_wield_item / check_gear_next_turn omitted (no AT_WEAP pet)
            }
        }
    }
    return 0;
}

function sgn(n) {
    return n < 0 ? -1 : n > 0 ? 1 : 0;
}

// C ref: dogmove.c find_targ() — first monster on a ray
function find_targ(mtmp, dx, dy, maxdist) {
    let curx = mtmp.mx, cury = mtmp.my;
    for (let dist = 0; dist < maxdist; dist++) {
        curx += dx;
        cury += dy;
        if (curx < 1 || curx >= COLNO || cury < 0 || cury >= ROWNO) break;
        // C: m_cansee == clear_path; walls/closed doors stop the ray
        if (!m_cansee(mtmp, curx, cury)) break;
        if (curx === mtmp.mux && cury === mtmp.muy) return { _youmonst: true };
        const targ = m_at(curx, cury);
        if (targ) {
            // C: visible + head square only (worm tail rejected)
            if ((!targ.minvis || false) && !targ.mundetected
                && targ.mx === curx && targ.my === cury) return targ;
        }
    }
    return null;
}

// C ref: dogmove.c find_friends() — hero/ally beyond target on the same ray
function find_friends(mtmp, mtarg, maxdist) {
    const tmx = mtarg._youmonst ? game.u.ux : mtarg.mx;
    const tmy = mtarg._youmonst ? game.u.uy : mtarg.my;
    const dx = sgn(tmx - mtmp.mx);
    const dy = sgn(tmy - mtmp.my);
    let curx = tmx, cury = tmy;
    let dist = distmin(tmx, tmy, mtmp.mx, mtmp.my);
    for (; dist <= maxdist; dist++) {
        curx += dx;
        cury += dy;
        if (curx < 1 || curx >= COLNO || cury < 0 || cury >= ROWNO) return 0;
        if (!m_cansee(mtmp, curx, cury)) return 0;
        if (mtmp.mux === curx && mtmp.muy === cury) return 1;
        const pal = m_at(curx, cury);
        if (pal) {
            if (pal.mtame) {
                if (!pal.minvis) return 1;
            } else {
                // C: quest leaders and guardians are always seen
                const ms = pal.data?.msound | 0;
                if (ms === MS_LEADER || ms === MS_GUARDIAN)
                    return 1;
            }
        }
    }
    return 0;
}

// C ref: dogmove.c score_targ() — attractiveness; always ends with rnd(5) unless early-out
function score_targ(mtmp, mtarg) {
    let score = 0;
    // Non-confused path (pet not conf) — early returns skip rnd(5)
    // C: never target quest friendlies (dogmove.c score_targ)
    const tms = mtarg.data?.msound | 0;
    if (tms === MS_LEADER || tms === MS_GUARDIAN) {
        return -5000;
    }
    if (distmin(mtmp.mx, mtmp.my,
        mtarg._youmonst ? game.u.ux : mtarg.mx,
        mtarg._youmonst ? game.u.uy : mtarg.my) <= 1) {
        score -= 3000;
        return score;
    }
    if (mtarg._youmonst || mtarg.mtame) {
        score -= 3000;
        return score;
    }
    // C: master/ally beyond target → refuse without fuzz rnd(5)
    if (find_friends(mtmp, mtarg, 15)) {
        score -= 3000;
        return score;
    }
    if (!mtarg.mpeaceful) score += 10;
    score += (mtarg.m_lev || 0) * 2 + Math.trunc((mtarg.mhp || 0) / 3);
    score += rnd(5);
    if (mtmp.mconf && !rn2(3)) score -= 1000;
    return score;
}

// C ref: dogmove.c best_target()
function best_target(mtmp, forced) {
    if (!mtmp?.mcansee) return null;
    let bestscore = -40000;
    let best_targ = null;
    for (let dy = -1; dy < 2; dy++) {
        for (let dx = -1; dx < 2; dx++) {
            if (!dx && !dy) continue;
            const temp = find_targ(mtmp, dx, dy, 7);
            if (!temp) continue;
            const curr = score_targ(mtmp, temp);
            if (curr > bestscore) {
                bestscore = curr;
                best_targ = temp;
            }
        }
    }
    if (!forced && bestscore < 0) best_targ = null;
    return best_targ;
}

// C ref: dogmove.c pet_ranged_attk() — score targets; little dog has no ranged ATK
function pet_ranged_attk(mtmp, forced) {
    const mtarg = best_target(mtmp, forced);
    if (!mtarg) return MMOVE_NOTHING;
    // Hungry check: hungrytime is far future → not hungry
    // mattackm stub: no ranged → M_ATTK_MISS → continue move
    void mtarg;
    return MMOVE_NOTHING;
}

/**
 * C ref: dogmove.c dog_move()
 * Pet movement with food-goal obj_resists + approach selection.
 * cursemsg pline gates on display.canseemon (LOS+mon_visible), not a
 * always-true minvis stub — out-of-sight cursed steps must stay silent.
 */
export async function dog_move(mtmp, after) {
    const edog = mtmp.edog;
    if (!edog && !mtmp.isminion) return MMOVE_NOTHING;

    const omx = mtmp.mx, omy = mtmp.my;
    let udist = dist2(omx, omy, game.u.ux, game.u.uy);
    // C: steed may throw rider under Conflict; dismount_steed body deferred
    if (mtmp === game.u?.usteed) {
        if (hero_conflict() && !resist_conflict(mtmp)) {
            // dismount_steed(DISMOUNT_THROWN) deferred — still consume rnd(20)
            return MMOVE_MOVED;
        }
        udist = 1;
    } else if (!udist) {
        return MMOVE_NOTHING;
    }

    let nix = omx, niy = omy;
    let whappr = 0;

    if (edog) {
        // C: dog_invent(mtmp, edog, udist) — squared dist2, not Euclidean
        // j==1 → goto newdogpos (invent already ate; nix==omx); j==2 died
        const j = await dog_invent(mtmp, edog, udist);
        if (j === 2) {
            return ((mtmp.mhp | 0) < 1) ? MMOVE_DIED : MMOVE_DONE;
        }
        if (j === 1) {
            return MMOVE_MOVED;
        }
        whappr = ((game.moves ?? 1) - (edog.whistletime || 0) < 5) ? 1 : 0;
    }

    const appr = dog_goal(mtmp, edog, after, udist, whappr);
    if (appr === -2) return MMOVE_NOTHING;

    // C: Conflict && !resist_conflict — edog falls through; !edog lose_guardian
    if (hero_conflict() && !resist_conflict(mtmp)) {
        if (!edog) {
            // lose_guardian_angel deferred
            return MMOVE_DIED;
        }
    }

    const allowflags = mon_allowflags(mtmp);
    const mfp = { cnt: 0, poss: [], info: [] };
    const cnt = mfndpos(mtmp, mfp, allowflags);
    if (cnt === 0) return MMOVE_NOMOVES;

    // C: count uncursed reachable squares before candidate loop
    let uncursedcnt = 0;
    for (let i = 0; i < cnt; i++) {
        const nx = mfp.poss[i].x;
        const ny = mfp.poss[i].y;
        if (m_at(nx, ny)
            && !((mfp.info[i] & ALLOW_M) || (mfp.info[i] & ALLOW_MDISP)))
            continue;
        if (cursed_object_at(nx, ny))
            continue;
        uncursedcnt++;
    }

    let chcnt = 0;
    let chi = -1;
    let nidist = dist2(nix, niy, gg.gx, gg.gy);
    const cursemsg = new Array(cnt).fill(false);
    let do_eat = false;
    let eat_obj = null;

    candloop: for (let i = 0; i < cnt; i++) {
        const nx = mfp.poss[i].x;
        const ny = mfp.poss[i].y;
        cursemsg[i] = false;
        // C: ALLOW_M + MON_AT → mattackm (before food / selection RNG)
        if ((mfp.info[i] & ALLOW_M) && m_at(nx, ny)) {
            const mtmp2 = m_at(nx, ny);
            const balk = (mtmp.m_lev || 0)
                + Math.trunc((5 * mtmp.mhp) / (mtmp.mhpmax || 1)) - 2;
            const Conflict = hero_conflict();

            if ((mtmp2.m_lev || 0) >= balk
                || (mtmp2.mtame && mtmp.mtame && !Conflict)
                || (max_passive_dmg(mtmp2, mtmp) >= mtmp.mhp)
                || (((mtmp.mhp * 4 < mtmp.mhpmax)
                    || (mtmp2.data?.msound | 0) === MS_GUARDIAN
                    || (mtmp2.data?.msound | 0) === MS_LEADER)
                    && mtmp2.mpeaceful && !Conflict)) {
                continue;
            }

            const mnum2 = mtmp2.mnum ?? mtmp2.data?.mndx;
            if ((mnum2 === PM_FLOATING_EYE && rn2(10)
                    && mtmp.mcansee && mtmp2.mcansee)
                || (mnum2 === PM_GELATINOUS_CUBE && rn2(10))) {
                if (dist2(mtmp.mx, mtmp.my, mtmp2.mx, mtmp2.my) <= 2) continue;
                // best_target ranged skip omitted → treat as continue
                continue;
            }

            if (after) return MMOVE_NOTHING;

            let mstatus = await mattackm(mtmp, mtmp2);
            if (mstatus & M_ATTK_AGR_DIED) return MMOVE_DIED;

            // C ref: dogmove.c — return attack after pet hit (mlstmv/onscary/monnear)
            if ((mstatus & (M_ATTK_HIT | M_ATTK_DEF_DIED)) === M_ATTK_HIT
                && rn2(4)
                && mtmp2.mlstmv !== (game.moves ?? 0)
                && !onscary(mtmp.mx, mtmp.my, mtmp2)
                && monnear(mtmp2, mtmp.mx, mtmp.my)) {
                mstatus = await mattackm(mtmp2, mtmp);
                if (mstatus & M_ATTK_DEF_DIED) return MMOVE_DIED;
            }
            return MMOVE_DONE;
        }

        // C ref: dogmove.c / monmove.c — avoid square hero just kicked
        if (m_avoid_kicked_loc(mtmp, nx, ny)) continue;
        if (m_avoid_soko_push_loc(mtmp, nx, ny)) continue;

        // C: pets may step on known traps with 1/40; else skip
        if ((mfp.info[i] & ALLOW_TRAPS)) {
            const trap = t_at(nx, ny);
            if (trap) {
                if (mtmp.mleashed) {
                    // whimper omitted
                } else if (trap.tseen && rn2(40)) {
                    continue;
                }
            }
        }

        // C: dog eschews cursed objects, but likes dog food
        if (edog) {
            const can_reach_food = could_reach_item(mtmp, nx, ny);
            for (let obj = objects_at(nx, ny); obj; obj = obj.nexthere) {
                if (obj.cursed) {
                    cursemsg[i] = true;
                } else if (can_reach_food) {
                    const otyp = dogfood(mtmp, obj);
                    if (otyp < MANFOOD && (otyp < ACCFOOD
                        || (edog.hungrytime || 0) <= (game.moves ?? 1))) {
                        // C: goto newdogpos — skip remaining candidates + ranged
                        nix = nx;
                        niy = ny;
                        chi = i;
                        cursemsg[i] = false;
                        do_eat = true;
                        eat_obj = obj;
                        break candloop;
                    }
                }
            }
        }
        // C: usually keep looking if cursed and another uncursed square exists
        if (cursemsg[i] && !mtmp.mleashed && uncursedcnt > 0
            && rn2(13 * uncursedcnt))
            continue;

        // C: dogmove.c — mtrack backtrack skip uses goto nxti (candidate continue)
        if (!mtmp.mleashed && distmin(mtmp.mx, mtmp.my, game.u.ux, game.u.uy) > 5) {
            const k = edog ? uncursedcnt : cnt;
            for (let j = 0; j < MTSZ && j < k - 1; j++) {
                if (mtmp.mtrack?.[j]
                    && nx === mtmp.mtrack[j].x && ny === mtmp.mtrack[j].y) {
                    if (rn2(MTSZ * (k - j))) continue candloop;
                }
            }
        }

        const ndist = dist2(nx, ny, gg.gx, gg.gy);
        const j = (ndist - nidist) * appr;
        if ((j === 0 && !rn2(++chcnt)) || j < 0
            || (j > 0 && !whappr
                && ((omx === nix && omy === niy && !rn2(3)) || !rn2(12)))) {
            nix = nx;
            niy = ny;
            nidist = ndist;
            if (j < 0) chcnt = 0;
            chi = i;
        }
    }

    // C: after candidate loop, before newdogpos — ranged consider
    // (skipped when do_eat via goto newdogpos)
    if (!do_eat) {
        const ranged = pet_ranged_attk(mtmp, false);
        if (ranged !== MMOVE_NOTHING) return ranged;
    }

    if (nix !== omx || niy !== omy) {
        // C ref: dogmove.c newdogpos — Conflict/ALLOW_U prefers attacking
        // the hero over stepping onto mux/muy (mattacku, then MMOVE_DONE).
        if (chi >= 0 && (mfp.info[chi] & ALLOW_U)) {
            if (mtmp.mleashed) {
                // C: m_unleash(mtmp, FALSE) — full leash bookkeeping deferred
                await pline(
                    `${Monnam(mtmp)} breaks loose of ${mtmp.female ? 'her' : 'his'} leash!`,
                );
                mtmp.mleashed = 0;
            }
            await mattacku(mtmp);
            return MMOVE_DONE;
        }
        // C: wasseen before place; cursemsg pline after place_monster
        const wasseen = canseemon(mtmp);
        mtmp.mx = nix;
        mtmp.my = niy;
        if (chi >= 0 && cursemsg[chi] && (wasseen || canseemon(mtmp))) {
            // C: distant_name(vobj_at) / something — top floor object
            const o = objects_at(nix, niy);
            const what = o ? doname(o) : 'something';
            await pline(`${noit_Monnam(mtmp)} steps reluctantly onto ${what}.`);
        }
        mon_track_add(mtmp, omx, omy);
        // C: no newsym here — postmov updates omx then mx after dog_move returns
        // C: do_eat after move — dog_eat rolls dogfood again then delobj
        if (do_eat && eat_obj) {
            if ((await dog_eat(mtmp, eat_obj, omx, omy, false)) === 2) {
                return MMOVE_DIED;
            }
        }
        return MMOVE_MOVED;
    }
    // C: dog_move ends with return MMOVE_MOVED even if nix/niy unchanged
    // (postmov still runs mintrap on the current square).
    if (do_eat && eat_obj) {
        // Same-cell eat (nix==omx): still consume
        if ((await dog_eat(mtmp, eat_obj, omx, omy, false)) === 2) {
            return MMOVE_DIED;
        }
    }
    void chi;
    return MMOVE_MOVED;
}

/**
 * C ref: dogmove.c finish_meating — clear meal timer; mimic AP reset deferred.
 */
export function finish_meating(mtmp) {
    if (!mtmp) return;
    mtmp.meating = 0;
    // M_AP_NOTHING / mappearance reset for non-mimic quickmimic deferred
}
