// dogmove.js — Pet AI movement.
// C ref: dogmove.c — dog_move, dog_goal, dogfood (via dog.c), obj_resists callers.

import { game } from './gstate.js';
import { rn2, rnd } from './rng.js';
import {
    dist2, distmin, mon_allowflags, mfndpos, m_at, monnear, onscary, ALLOW_M,
    ALLOW_U, ALLOW_TRAPS, m_avoid_kicked_loc, m_avoid_soko_push_loc,
    m_consume_obj, perceives,
} from './mon.js';
import {
    objects_at, obj_extract_self, place_object, splitobj, stackobj, delobj,
} from './mkobj.js';
import { mattackm, max_passive_dmg, mdisplacem, mondied } from './mhitm.js';
import { mon_reflects } from './mhitu.js';
import {
    can_carry, // C: mon.c can_carry (notake/touch/glomper/weight), not the removed local clone
    set_apparxy, locomotion, m_digweapon_check, hero_Deaf,
    should_displace, undesirable_disp, mon_offmap,
} from './monmove.js';
import { mattacku } from './mhitu.js';
import { newsym, pline, canseemon, mon_visible, canspotmon, pline_mon, pline_xy, impossible, You_feel, glyph_is_object } from './display.js';
import { doname, distant_name, vtense } from './objnam.js';
import { mpickobj, is_vampshifter } from './makemon.js';
import { t_at } from './trap.js';
import {
    COLNO, ROWNO, ROOM, STAIRS,
    DOGFOOD, CADAVER, ACCFOOD, MANFOOD, APPORT, POISON, UNDEF, TABU,
    MMOVE_NOTHING, MMOVE_MOVED, MMOVE_DIED, MMOVE_DONE,
    M_ATTK_HIT, M_ATTK_DEF_DIED, M_ATTK_AGR_DIED, M_ATTK_MISS,
    IS_OBSTRUCTED, IS_DOOR, D_CLOSED, D_LOCKED, ALLOW_MDISP,
    MAGIC_PORTAL, A_NONE,
    EPRI, EMIN, DIR_LEFT, DIR_RIGHT, DIR_LEFT2, DIR_RIGHT2,
    xdir, ydir, xytodir,
    DISMOUNT_THROWN, W_ARMS,
} from './const.js';
import { FOOD_CLASS, BALL_CLASS, CHAIN_CLASS, ROCK_CLASS, COIN_CLASS, objectNames, is_pick } from './objects.js';
import {
    monsterNames, mons, carnivorous, herbivorous, vegan, acidic, poisonous,
    is_swimmer, likes_lava, throws_rocks, is_rider,
    unsolid, nolimbs, has_head, LOW_PM, NUMMONS,
    PM_LICHEN, MZ_TINY, MZ_SMALL, MZ_MEDIUM, MZ_LARGE, MZ_HUGE,
    is_animal, mindless, tunnels, needspick, nohands, verysmall,
    haseyes, touch_petrifies, resists_ston, is_flyer, is_floater,
} from './monsters.js';
import { MON_WEP } from './weapon.js';
import { which_armor } from './worn.js';
import { m_cansee, couldsee, cansee, do_clear_area } from './vision.js';
import { Monnam, noit_Monnam, y_monnam } from './do_name.js';
import { gettrack } from './track.js';
import { hero_conflict, resist_conflict } from './mondata.js';
import { is_pool, is_lava, stop_occupation } from './hack.js';
import { m_unleash } from './apply.js';
import { lose_guardian_angel } from './minion.js';
import { dismount_steed } from './steed.js';
import { whimper, beg, domonnoise } from './sounds.js';
import { Is_qstart } from './quest.js';
import { goodpos } from './teleport.js';
import { m_in_out_region } from './region.js';

const PM_FLOATING_EYE = monsterNames.indexOf('PM_FLOATING_EYE');
const PM_GELATINOUS_CUBE = monsterNames.indexOf('PM_GELATINOUS_CUBE');
const PM_LIZARD = monsterNames.indexOf('PM_LIZARD');
const PM_LONG_WORM = monsterNames.indexOf('PM_LONG_WORM');

// C ref: dogmove.c `:10–12` — pet hunger clock (moves): hungry 300,
// weak/confused 500, starve 750.
const DOG_HUNGRY = 300;
const DOG_WEAK = 500;
const DOG_STARVE = 750;

// C ref: monattk.h AT_NONE 0 (cf. mhitm.js local; attack-type indices).
const AT_NONE = 0;

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
// C ref: dogmove.c droppables tool-keeping otyps
const DWARVISH_MATTOCK = objectNames.indexOf('DWARVISH_MATTOCK');
const PICK_AXE = objectNames.indexOf('PICK_AXE');
const UNICORN_HORN = objectNames.indexOf('UNICORN_HORN');
const SKELETON_KEY = objectNames.indexOf('SKELETON_KEY');
const LOCK_PICK = objectNames.indexOf('LOCK_PICK');
const CREDIT_CARD = objectNames.indexOf('CREDIT_CARD');
const GOLD_PIECE = objectNames.indexOf('GOLD_PIECE');

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
export function is_quest_artifact(obj) {
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

// C ref: dogmove.c cursed_object_at()
export function cursed_object_at(x, y) {
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
export function dog_nutrition(mtmp, obj) {
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

    // C ref: dogmove.c dog_eat — sawpet is cansee+mon_visible (not
    // canseemon: the food square need not be in sight when the pet's
    // start square is seen); second arm is canspotmon (D-1875).
    const seeobj = cansee(mtmp.mx, mtmp.my);
    const sawpet = cansee(x, y) && mon_visible(mtmp);
    if (sawpet || (seeobj && canspotmon(mtmp))) {
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
async function dog_goal(mtmp, edog, after, udist, whappr) {
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
            // C: edog->ogoal.x — 0 unset; initedog -1 is truthy sentinel
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
            await do_clear_area(omx, omy, 9, (x, y, distPtr) => {
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

/**
 * C ref: dogmove.c droppables `:27–136` — pick a carried item for pet to drop.
 * 'key|pickaxe|&c = &dummy' lets creatures that can't use a tool behave as
 * if already holding one, so duplicates fall to the default drop candidate.
 * C static dummy (GOLD_PIECE, oartifact=1) is never returned — only its
 * truthiness/otyp steer the keep-branches. MON_WEP canonical (mon.mw),
 * not mon.mwep. No RNG. Callers: dogmove.c:416 dog_invent apport check,
 * dogmove.c:502 dog_has_minvent, steal.c:892 relobj is_pet arm.
 */
function droppables(mon) {
    // C: dummy = cg.zeroobj; dummy.otyp = GOLD_PIECE; dummy.oartifact = 1.
    // JS null idiom: fresh sentinel per call, never returned.
    const dummy = { otyp: GOLD_PIECE, oartifact: 1 };
    let pickaxe = null, unihorn = null, key = null;
    // C: wep = MON_WEP(mon).
    const wep = MON_WEP(mon);
    const mdat = mon?.data;

    if (is_animal(mdat) || mindless(mdat)) {
        // C: won't hang on to any objects of these types.
        pickaxe = unihorn = key = dummy;
    } else {
        // C: don't hang on to pick-axe if can't use one or don't need one.
        if (!tunnels(mdat) || !needspick(mdat)) pickaxe = dummy;
        // C: don't hang on to key if can't open doors.
        if (nohands(mdat) || verysmall(mdat)) key = dummy;
    }
    if (wep) {
        if (is_pick(wep)) pickaxe = wep;
        if (wep.otyp === UNICORN_HORN) unihorn = wep;
        // C: don't need any wielded check for keys...
    }

    for (let obj = mon?.minvent; obj; obj = obj.nobj) {
        switch (obj.otyp) {
        case DWARVISH_MATTOCK:
            // C: reject mattock if couldn't wield it.
            if (which_armor(mon, W_ARMS)) break;
            // C: keep mattock in preference to pick unless pick is already
            // wielded or is an artifact and mattock isn't.
            if (pickaxe && pickaxe.otyp === PICK_AXE && pickaxe !== wep
                && (!(pickaxe.oartifact | 0) || (obj.oartifact | 0)))
                return pickaxe; // drop the one we earlier decided to keep
            // FALLTHROUGH to PICK_AXE
        case PICK_AXE:
            if (!pickaxe || ((obj.oartifact | 0) && !(pickaxe.oartifact | 0))) {
                if (pickaxe) return pickaxe;
                pickaxe = obj; // keep this digging tool
                continue;
            }
            break;

        case UNICORN_HORN:
            // C: reject cursed unicorn horns.
            if (obj.cursed) break;
            // C: keep artifact unihorn in preference to ordinary one.
            if (!unihorn || ((obj.oartifact | 0) && !(unihorn.oartifact | 0))) {
                if (unihorn) return unihorn;
                unihorn = obj; // keep this unicorn horn
                continue;
            }
            break;

        case SKELETON_KEY:
            // C: keep key in preference to lock-pick.
            if (key && key.otyp === LOCK_PICK
                && (!(key.oartifact | 0) || (obj.oartifact | 0)))
                return key; // drop the one we earlier decided to keep
            // FALLTHROUGH to LOCK_PICK
        case LOCK_PICK:
            // C: keep lock-pick in preference to credit card.
            if (key && key.otyp === CREDIT_CARD
                && (!(key.oartifact | 0) || (obj.oartifact | 0)))
                return key;
            // FALLTHROUGH to CREDIT_CARD
        case CREDIT_CARD:
            if (!key || ((obj.oartifact | 0) && !(key.oartifact | 0))) {
                if (key) return key;
                key = obj; // keep this unlocking tool
                continue;
            }
            break;

        default:
            break;
        }

        // C: first non-worn, non-wielded object past the keep-branches.
        if (!obj.owornmask && obj !== wep) return obj;
    }

    return null; // C: (struct obj *) 0 — don't drop anything
}

// C ref: steal.c mdrop_obj — pet drop subset (worn/saddle/shop/extrinsics omitted)
async function mdrop_obj(mon, obj, verbosely) {
    const omx = mon.mx, omy = mon.my;
    // C: distant_name(obj, doname) before extract — near observe side-effects
    const obj_name = distant_name(obj, doname);
    // C: extract_from_minvent(mon, obj, FALSE, TRUE) → core is obj_extract_self
    obj_extract_self(obj);
    if (obj.owornmask) obj.owornmask = 0;
    // C steal.c mdrop_obj: verbosely && cansee → pline_mon
    if (verbosely && cansee(omx, omy)) {
        await pline_mon(mon, `${Monnam(mon)} drops ${obj_name}.`);
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

// C ref: dogmove.c dog_starve `:348–360` (staticfn) — leash goes slack,
// visible starves pline, else Hallu-bummed/sad feel; then mondied.
// Your("leash goes slack.") is net-identical pline text (cf. getdir You_cant).
async function dog_starve(mtmp) {
    if (mtmp.mleashed && mtmp !== game.u?.usteed) {
        await pline('Your leash goes slack.');
    } else if (cansee(mtmp.mx, mtmp.my)) {
        await pline_mon(mtmp, `${Monnam(mtmp)} starves.`);
    } else {
        await You_feel(`${game.u?.Hallucination ? 'bummed' : 'sad'} for a moment.`);
    }
    await mondied(mtmp);
}

// C ref: dogmove.c dog_hunger `:362–397` (staticfn) — hunger effects,
// returns TRUE on starvation. Non-eaters get their clock pushed (never
// starve, but might polymorph); first penalty weakens + confuses with a
// sight/feel message; past DOG_STARVE (or already dead) starves.
async function dog_hunger(mtmp, edog) {
    if ((game.moves ?? 1) > ((edog.hungrytime | 0) + DOG_WEAK)) {
        if (!carnivorous(mtmp.data) && !herbivorous(mtmp.data)) {
            edog.hungrytime = (game.moves ?? 1) + DOG_WEAK;
            /* but not too high; it might polymorph */
        } else if (!edog.mhpmax_penalty) {
            /* starving pets are limited in healing */
            const newmhpmax = Math.trunc((mtmp.mhpmax | 0) / 3);
            mtmp.mconf = 1;
            edog.mhpmax_penalty = (mtmp.mhpmax | 0) - newmhpmax;
            mtmp.mhpmax = newmhpmax;
            if ((mtmp.mhp | 0) > mtmp.mhpmax) mtmp.mhp = mtmp.mhpmax;
            if ((mtmp.mhp | 0) < 1) {
                await dog_starve(mtmp);
                return true;
            }
            if (cansee(mtmp.mx, mtmp.my)) {
                await pline_mon(mtmp, `${Monnam(mtmp)} is confused from hunger.`);
            } else if (couldsee(mtmp.mx, mtmp.my)) {
                await beg(mtmp);
            } else {
                await You_feel(`worried about ${y_monnam(mtmp)}.`);
            }
            await stop_occupation();
        } else if ((game.moves ?? 1) > ((edog.hungrytime | 0) + DOG_STARVE)
            || (mtmp.mhp | 0) < 1) {
            await dog_starve(mtmp);
            return true;
        }
    }
    return false;
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
                        await pline_xy(
                            omx, omy,
                            `${Monnam(mtmp)} picks up ${otmpname}.`,
                        );
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

// C ref: dogmove.c find_targ() `:651–685` — first visible monster on a ray
// (hero cell yields the youmonst sentinel); unseen/invisible targets and
// worm tails are skipped as if empty.
function find_targ(mtmp, dx, dy, maxdist) {
    let targ = null;
    let curx = mtmp.mx, cury = mtmp.my;
    for (let dist = 0; dist < maxdist; dist++) {
        curx += dx;
        cury += dy;
        if (curx < 1 || curx >= COLNO || cury < 0 || cury >= ROWNO) break;
        // C: m_cansee == clear_path; walls/closed doors stop the ray
        if (!m_cansee(mtmp, curx, cury)) break;
        if (curx === mtmp.mux && cury === mtmp.muy) return { _youmonst: true };
        if ((targ = m_at(curx, cury)) !== null) {
            // C: visible to the pet (see-invis perceives) + head square
            // only (worm tail rejected); otherwise it ain't there.
            if ((!targ.minvis || perceives(mtmp.data)) && !targ.mundetected
                && targ.mx === curx && targ.my === cury) break;
            targ = null;
        }
    }
    return targ;
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

// C ref: dogmove.c score_targ() `:736–835` — ranged-target attractiveness.
// The confusion gate comes FIRST (a confused pet usually skips scoring, so
// the rn2(3) draws before any rnd(5) fuzz); early-outs return without fuzz.
// Weak pets spare lichens, vampshifters score at vampire strength (rn2),
// vastly stronger foes are penalized; the confused tail −1000 stays last.
function score_targ(mtmp, mtarg) {
    let score = 0;
    /* Give 1 in 3 chance of safe breathing even if pet is confused or
     * if you're on the quest start level */
    if (!mtmp.mconf || !rn2(3) || Is_qstart(game.u?.uz)) {
        let align1 = A_NONE, align2 = A_NONE;
        let faith1 = true, faith2 = true;
        if (mtmp.isminion) align1 = EMIN(mtmp)?.min_align ?? A_NONE;
        else if (mtmp.ispriest) align1 = EPRI(mtmp)?.shralign ?? A_NONE;
        else faith1 = false;
        if (mtarg.isminion) align2 = EMIN(mtarg)?.min_align ?? A_NONE;
        else if (mtarg.ispriest) align2 = EPRI(mtarg)?.shralign ?? A_NONE;
        else faith2 = false;

        /* Never target quest friendlies */
        const tms = mtarg.data?.msound | 0;
        if (tms === MS_LEADER || tms === MS_GUARDIAN) return -5000;
        /* coaligned priesthood holds fire against the peaceful */
        if (faith1 && faith2 && align1 === align2 && mtarg.mpeaceful) {
            score -= 5000;
            return score;
        }
        /* Is monster adjacent? */
        if (distmin(mtmp.mx, mtmp.my,
            mtarg._youmonst ? game.u.ux : mtarg.mx,
            mtarg._youmonst ? game.u.uy : mtarg.my) <= 1) {
            score -= 3000;
            return score;
        }
        /* Is the monster peaceful or tame? (C keeps mpeaceful commented) */
        if (mtarg._youmonst || mtarg.mtame) {
            score -= 3000;
            return score;
        }
        /* Is master/pet beyond monster? */
        if (find_friends(mtmp, mtarg, 15)) {
            score -= 3000;
            return score;
        }
        /* Target hostile monsters in preference to peaceful ones */
        if (!mtarg.mpeaceful) score += 10;
        /* Is the monster passive? Don't waste energy on it, if so */
        if ((mtarg.data?.mattk?.[0]?.aatyp ?? AT_NONE) === AT_NONE) score -= 1000;
        /* Even weak pets with breath attacks shouldn't take on very
           low-level monsters. Wasting breath on lichens is ridiculous. */
        if (((mtarg.m_lev | 0) < 2 && (mtmp.m_lev | 0) > 5)
            || ((mtmp.m_lev | 0) > 12
                && (mtarg.m_lev | 0) < (mtmp.m_lev | 0) - 9
                && (game.u?.ulevel | 0) > 8
                && (mtarg.m_lev | 0) < (game.u?.ulevel | 0) - 7)) {
            score -= 25;
        }
        /* a vampshifter in weak form attacks as if in vampire form */
        let mtmp_lev = mtmp.m_lev | 0;
        if (is_vampshifter(mtmp) && mtmp.data?.mlet !== 'S_VAMPIRE') {
            /* is_vampshifter() implies cham >= LOW_PM */
            mtmp_lev = mons(mtmp.cham)?.mlevel ?? mtmp_lev;
            /* actual vampire level ranges 1.0–1.5× base */
            mtmp_lev += rn2(Math.trunc(mtmp_lev / 2) + 1);
            if ((mtmp.m_lev | 0) > mtmp_lev) mtmp_lev = mtmp.m_lev | 0;
        }
        /* pets hesitate to attack vastly stronger foes */
        if ((mtarg.m_lev | 0) > mtmp_lev + 4) {
            score -= ((mtarg.m_lev | 0) - mtmp_lev) * 20;
        }
        /* All things being the same, go for the beefiest monster */
        score += (mtarg.m_lev | 0) * 2 + Math.trunc((mtarg.mhp | 0) / 3);
    }
    /* Fuzz factor for very similar targets */
    score += rnd(5);
    /* Pet may decide not to use ranged attack when confused */
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

// C ref: dogmove.c pet_ranged_attk() `:889–945` — best lined-up target;
// hungry pets usually hold breath/spit (rn2(5)); hero target goes through
// mattacku (counts as the move even on a miss); otherwise mattackm with
// bhitpos/notonhead, and a seeing target may retaliate in kind. Only a
// real attack (not M_ATTK_MISS) costs the rest of the move; a forced call
// with no shot makes noise via domonnoise.
async function pet_ranged_attk(mtmp, forced) {
    let hungry = 0;

    /* How hungry is the pet? */
    if (!mtmp.isminion) {
        hungry = ((game.moves ?? 1) > (((mtmp.edog?.hungrytime | 0) + DOG_HUNGRY))) ? 1 : 0;
    }

    /* Identify the best target in a straight line from the pet */
    const mtarg = best_target(mtmp, forced);

    /* Hungry pets are unlikely to use breath/spit attacks */
    if (mtarg && (!hungry || !rn2(5))) {
        let mstatus = M_ATTK_MISS;

        if (mtarg._youmonst) {
            if (await mattacku(mtmp)) return MMOVE_DIED;
            /* mattacku can't tell "did not attack" from "attacked", so
             * count the move spent either way rather than let the pet
             * both breathe on you and move. */
            mstatus = M_ATTK_HIT;
        } else {
            game.bhitpos = game.bhitpos || { x: 0, y: 0 };
            game.bhitpos.x = mtmp.mx;
            game.bhitpos.y = mtmp.my;
            game.notonhead = false;
            mstatus = await mattackm(mtmp, mtarg);

            /* Shouldn't happen, really */
            if (mstatus & M_ATTK_AGR_DIED) return MMOVE_DIED;

            /* Let the target strike back (only lands if it has a ranged
             * reply and can see where the shot came from). */
            if ((mstatus & M_ATTK_HIT) && !(mstatus & M_ATTK_DEF_DIED)
                && rn2(4) && !mtarg._youmonst) {
                if (mtarg.mcansee && haseyes(mtarg.data)) {
                    game.bhitpos.x = mtmp.mx;
                    game.bhitpos.y = mtmp.my;
                    game.notonhead = false;
                    const mresp = await mattackm(mtarg, mtmp);
                    if (mresp & M_ATTK_DEF_DIED) return MMOVE_DIED;
                }
            }
        }
        /* Only a real attack costs the rest of the move: score_targ never
         * picks a melee target, so M_ATTK_MISS means "no ranged attack". */
        if (mstatus !== M_ATTK_MISS) return MMOVE_DONE;
    } else if (forced) {
        await domonnoise(mtmp);
    }
    return MMOVE_NOTHING;
}

/**
 * C ref: dogmove.c dog_move() `:977–1358` in C order — non-pet impossible,
 * dog_hunger starve, steed Conflict throw, dog_invent (j==2/offmap died or
 * done; j==1 goto newdogpos), whappr, dog_goal, guardian Conflict,
 * mfndpos + uncursedcnt + should_displace, candidate loop (leashed drag,
 * guardian range, ALLOW_M melee with gaze/petrify + bhitpos/notonhead +
 * return attack, ALLOW_MDISP displace, kick/soko avoids, trap whimper,
 * food/cursed/backtrack/selection RNG), pet_ranged_attk, newdogpos
 * (ALLOW_U mattacku, region, digweapon, cursemsg pline, track, do_eat),
 * leashed goodpos kludge + newsym/set_apparxy, MMOVE_MOVED.
 * cursemsg pline gates on display.canseemon (LOS+mon_visible), not a
 * always-true minvis stub — out-of-sight cursed steps must stay silent.
 */
export async function dog_move(mtmp, after) {
    const edog = mtmp.edog;
    if (!edog && !mtmp.isminion) {
        await impossible('dog_move for non-pet?');
        return MMOVE_NOTHING;
    }

    const omx = mtmp.mx, omy = mtmp.my;
    // C dogmove.c `:1005–1007` — hunger before anything else; starved pets
    // never reach dog_goal/mfndpos (their clock, not the goal, owns them).
    if (edog && await dog_hunger(mtmp, edog)) return MMOVE_DIED; /* starved */
    let udist = dist2(omx, omy, game.u.ux, game.u.uy);
    // C dogmove.c `:1015–1021`: steed may throw rider under Conflict.
    if (mtmp === game.u?.usteed) {
        if (hero_conflict() && !resist_conflict(mtmp)) {
            await dismount_steed(DISMOUNT_THROWN);
            return MMOVE_MOVED;
        }
        udist = 1;
    } else if (!udist) {
        return MMOVE_NOTHING;
    }

    let nix = omx, niy = omy;
    let whappr = 0;
    // C `goto newdogpos`: invent already ate (nix==omx) — skip goal,
    // conflict, candidate loop and ranged, but still run the newdogpos
    // tail (leashed kludge) below.
    let invent_ate = false;

    if (edog) {
        // C: dog_invent(mtmp, edog, udist) — squared dist2, not Euclidean
        const j = await dog_invent(mtmp, edog, udist);
        if (j === 2 || mon_offmap(mtmp)) {
            return ((mtmp.mhp | 0) < 1) ? MMOVE_DIED : MMOVE_DONE;
        } else if (j === 1) {
            invent_ate = true; /* eating something */
        } else {
            whappr = ((game.moves ?? 1) - (edog.whistletime || 0) < 5) ? 1 : 0;
        }
    }

    // newdogpos shared state (defaults for the invent-ate path).
    let chcnt = 0;
    let chi = -1;
    let do_eat = false;
    let eat_obj = null;
    let mfp = null;
    let cnt = 0;
    let cursemsg = [];
    let uncursedcnt = 0;
    let nidist = dist2(nix, niy, gg.gx, gg.gy);
    let better_with_displacing = false;

    if (!invent_ate) {
    const appr = await dog_goal(mtmp, edog, after, udist, whappr);
    if (appr === -2) return MMOVE_NOTHING;

    // C: Conflict && !resist_conflict — edog falls through; !edog
    // lose_guardian_angel(mtmp) then MMOVE_DIED (D-1617; body D-1608).
    if (hero_conflict() && !resist_conflict(mtmp)) {
        if (!edog) {
            /* Guardian angel refuses to be conflicted; rather,
             * it disappears, angrily, and sends in some nasties
             */
            await lose_guardian_angel(mtmp);
            return MMOVE_DIED; /* current monster is gone */
        }
    }

    const allowflags = mon_allowflags(mtmp);
    mfp = { cnt: 0, poss: [], info: [] };
    cnt = mfndpos(mtmp, mfp, allowflags);

    // C: count uncursed reachable squares before candidate loop
    uncursedcnt = 0;
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

    // C: displacing is a last resort — only when it beats every plain
    // square (goal-distance via gg.gx/ggy).
    better_with_displacing = should_displace(mtmp, mfp, gg.gx, gg.gy);

    chcnt = 0;
    chi = -1;
    nidist = dist2(nix, niy, gg.gx, gg.gy);
    cursemsg = new Array(cnt).fill(false);

    candloop: for (let i = 0; i < cnt; i++) {
        const nx = mfp.poss[i].x;
        const ny = mfp.poss[i].y;
        cursemsg[i] = false;

        /* if leashed, we drag him along. */
        if (mtmp.mleashed && dist2(nx, ny, game.u.ux, game.u.uy) > 4) continue;

        /* if a guardian, try to stay close by choice */
        if (!edog) {
            const gdist = dist2(nx, ny, game.u.ux, game.u.uy);
            if (gdist > 16 && gdist >= udist) continue;
        }

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
            // C: gaze/petrify foes are only skipped when no ranged shot is
            // viable — the best_target call below draws RNG (score fuzz),
            // so it must run even though every path continues (C sets
            // ranged_only then hits its FIXME continue).
            if ((mnum2 === PM_FLOATING_EYE && rn2(10)
                    && mtmp.mcansee && haseyes(mtmp.data) && mtmp2.mcansee
                    && (!mtmp2.minvis || perceives(mtmp.data))
                    && !await mon_reflects(mtmp, null))
                || (mnum2 === PM_GELATINOUS_CUBE && rn2(10))
                || (touch_petrifies(mtmp2.data) && !resists_ston(mtmp))) {
                /* only skip this foe if a ranged attack isn't viable */
                if (dist2(mtmp.mx, mtmp.my, mtmp2.mx, mtmp2.my) <= 2
                    || best_target(mtmp, false) !== mtmp2) {
                    continue;
                }
                /* C FIXME: ranged_only isn't used as intended yet */
                continue;
            }

            if (after) return MMOVE_NOTHING; /* hit only once each move */

            game.bhitpos = game.bhitpos || { x: 0, y: 0 };
            game.bhitpos.x = nx;
            game.bhitpos.y = ny;
            game.notonhead = mtmp2.mx !== nx || mtmp2.my !== ny;
            let mstatus = await mattackm(mtmp, mtmp2);

            /* aggressor (pet) died */
            if (mstatus & M_ATTK_AGR_DIED) return MMOVE_DIED;

            // C ref: dogmove.c — return attack after pet hit (mlstmv/onscary/monnear)
            if ((mstatus & (M_ATTK_HIT | M_ATTK_DEF_DIED)) === M_ATTK_HIT
                && rn2(4)
                && mtmp2.mlstmv !== (game.moves ?? 0)
                && !onscary(mtmp.mx, mtmp.my, mtmp2)
                /* monnear check needed: long worms hit on tail */
                && monnear(mtmp2, mtmp.mx, mtmp.my)) {
                game.bhitpos.x = mtmp.mx;
                game.bhitpos.y = mtmp.my;
                game.notonhead = false;
                mstatus = await mattackm(mtmp2, mtmp); /* return attack */
                if (mstatus & M_ATTK_DEF_DIED) return MMOVE_DIED;
            }
            return MMOVE_DONE;
        }

        // C: displace a blocking monster when that beats every plain
        // square and the swap spot is desirable.
        if ((mfp.info[i] & ALLOW_MDISP) && m_at(nx, ny)
            && better_with_displacing && !undesirable_disp(mtmp, nx, ny)) {
            const mtmp2 = m_at(nx, ny);

            const mstatus = await mdisplacem(mtmp, mtmp2, false);
            if (mstatus & M_ATTK_DEF_DIED) return MMOVE_DIED;
            return MMOVE_NOTHING;
        }

        // C ref: dogmove.c / monmove.c — avoid square hero just kicked
        if (m_avoid_kicked_loc(mtmp, nx, ny)) continue;
        if (m_avoid_soko_push_loc(mtmp, nx, ny)) continue;

        // C: leashed pets whimper at the trap (when heard); unleashed
        // pets usually step around seen traps (1/40 they blunder on).
        if ((mfp.info[i] & ALLOW_TRAPS)) {
            const trap = t_at(nx, ny);
            if (trap) {
                if (mtmp.mleashed) {
                    if (!hero_Deaf()) await whimper(mtmp);
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
        const ranged = await pet_ranged_attk(mtmp, false);
        if (ranged !== MMOVE_NOTHING) return ranged;
    }
    } // end if (!invent_ate) — C `goto newdogpos` lands below

    // C newdogpos — nix==omx also lands here via invent-ate (chi -1).
    if (nix !== omx || niy !== omy) {
        // C ref: dogmove.c newdogpos — Conflict/ALLOW_U prefers attacking
        // the hero over stepping onto mux/muy (mattacku, then MMOVE_DONE).
        if (chi >= 0 && mfp && (mfp.info[chi] & ALLOW_U)) {
            if (mtmp.mleashed) { /* play it safe */
                // C dogmove.c `:1281–1284` pline_mon then m_unleash(FALSE)
                await pline_mon(
                    mtmp,
                    `${Monnam(mtmp)} breaks loose of ${mtmp.female ? 'her' : 'his'} leash!`,
                );
                await m_unleash(mtmp, false);
            }
            await mattacku(mtmp);
            return MMOVE_DONE;
        }
        if (!m_in_out_region(mtmp, nix, niy)) return MMOVE_MOVED;
        if (await m_digweapon_check(mtmp, nix, niy)) return MMOVE_NOTHING;

        /* insert a worm_move() if worms ever begin to eat things */
        // C: wasseen before place; cursemsg pline after place_monster.
        // remove_monster/place_monster keep direct mx/my set (pre-existing
        // shape: m_at scans fmon; the grid map tolerates mx/my-only moves).
        const wasseen = canseemon(mtmp);
        mtmp.mx = nix;
        mtmp.my = niy;
        if (chi >= 0 && cursemsg[chi] && (wasseen || canseemon(mtmp))) {
            /* top item of the pile, not necessarily the cursed item;
               vobj_at ≡ level.objects (display.js); the remembered-glyph
               read needs hero_memory, else `something` */
            const mem = game.level?.at?.(nix, niy);
            const o = (!game.u?.Hallucination && game.level?.flags?.hero_memory
                    && mem && glyph_is_object(mem.disp_glyph))
                ? objects_at(nix, niy) : null;
            const what = o ? distant_name(o, doname) : 'something';
            await pline_mon(mtmp,
                `${noit_Monnam(mtmp)} ${vtense(null, locomotion(mtmp.data, 'step'))} reluctantly ${(is_flyer(mtmp.data) || is_floater(mtmp.data)) ? 'over' : 'onto'} ${what}.`);
        }
        mon_track_add(mtmp, omx, omy);
        /* We have to know if the pet's going to do a combined eat and
         * move before moving it, but it can't eat until after being
         * moved.  Thus the do_eat flag. */
        // C: no newsym here — postmov updates omx then mx after dog_move returns
        // C: do_eat after move — dog_eat rolls dogfood again then delobj
        if (do_eat && eat_obj) {
            if ((await dog_eat(mtmp, eat_obj, omx, omy, false)) === 2) {
                return MMOVE_DIED;
            }
        }
        return MMOVE_MOVED;
    } else if (mtmp.mleashed && dist2(omx, omy, game.u.ux, game.u.uy) > 4) {
        /* an incredible kludge, but the only way to keep pooch near
         * after it spends time eating or in a trap, etc. */
        const ux = game.u.ux | 0, uy = game.u.uy | 0;
        const cc = { x: ux + sgn(omx - ux), y: uy + sgn(omy - uy) };
        if (!goodpos(cc.x, cc.y, mtmp, 0)) {
            const i = xytodir(sgn(omx - ux), sgn(omy - uy));
            let placed = false;
            // C dirtocoord is additive on the same cc (verbatim): each
            // rejected bearing accumulates into the next candidate.
            for (let j = DIR_LEFT(i); j < DIR_RIGHT(i) && !placed; j++) {
                cc.x += xdir[j];
                cc.y += ydir[j];
                if (goodpos(cc.x, cc.y, mtmp, 0)) placed = true;
            }
            if (!placed) {
                for (let j = DIR_LEFT2(i); j < DIR_RIGHT2(i) && !placed; j++) {
                    cc.x += xdir[j];
                    cc.y += ydir[j];
                    if (goodpos(cc.x, cc.y, mtmp, 0)) placed = true;
                }
            }
            if (!placed) {
                cc.x = mtmp.mx;
                cc.y = mtmp.my;
            }
        }
        if (!m_in_out_region(mtmp, nix, niy)) return MMOVE_MOVED;
        mtmp.mx = cc.x;
        mtmp.my = cc.y;
        newsym(cc.x, cc.y);
        set_apparxy(mtmp);
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

/**
 * C ref: dogmove.c:1460-1469 mnum_leashable — variation of leashable() that
 * takes a PM_ index (quickmimic leash-slack check); HIGH_PM is NUMMONS-1
 * per permonst.h:22. `| 0` int idiom; `||`/`&&` short-circuit so mons() is
 * never read out of range. Named: caller wiring — quickmimic unwired
 * (comment-only refs in js/dogmove.js and js/mon.js).
 */
export function mnum_leashable(mnum) {
    const m = mnum | 0;
    return ((m >= LOW_PM && m <= NUMMONS - 1)
            && m !== PM_LONG_WORM && !unsolid(mons(m))
            && (!nolimbs(mons(m)) || has_head(mons(m))))
        ? true
        : false;
}
