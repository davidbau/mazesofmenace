// dog.js — the starting pet.
// C ref: src/dog.c
//
// makedog() runs between u_on_upstairs() and u_init_inventory_attrs()
// (src/allmain.c:814), not with the rest of hero setup. Getting that ordering
// wrong puts the pet's draws on the wrong side of the inventory's.
//
// The cost is small but very visible in the log: one rn2(2) from pet_type()
// when the role has no fixed pet, then a whole collect_coords() ring shuffle
// from enexto() to place it.

import { game } from './gstate.js';
import { obj_resists } from './zap.js';
import { mfndpos, mon_allowflags } from './mon.js';
import { COLNO, ROWNO, IS_ROOM, MAGIC_PORTAL, ALLOW_M, ALLOW_U } from './const.js';
import { OCLASSES } from './objects_data.js';
import { MFLAGS } from './monst_data.js';
import { rn2 } from './rng.js';
import { PMNAMES } from './monst_data.js';
import { makemon, MM_EDOG, NO_MINVENT } from './makemon.js';

const NON_PM = -1;

// gu.urole.petnum is a PM_ name in the generated role table.
function petnumOf(role) {
    const p = role?.petnum;
    if (typeof p === 'number') return p;
    if (!p || p === 'NON_PM') return NON_PM;
    return PMNAMES[p] !== undefined ? PMNAMES[p] : NON_PM;
}

// src/dog.c:93 pet_type()
export function pet_type() {
    const petnum = petnumOf(game.urole);
    if (petnum !== NON_PM)
        return petnum;
    if (game.preferred_pet === 'c')
        return PMNAMES.PM_KITTEN;
    if (game.preferred_pet === 'd')
        return PMNAMES.PM_LITTLE_DOG;
    return rn2(2) ? PMNAMES.PM_KITTEN : PMNAMES.PM_LITTLE_DOG;
}

// src/dog.c:111 makedog()
export function makedog() {
    if (game.preferred_pet === 'n') {
        game.context.startingpet_typ = NON_PM;
        return null;
    }

    const pettype = game.context.startingpet_typ = pet_type();

    /* NO_MINVENT stops makemon() giving a pony an already-worn saddle */
    const mtmp = makemon(game.mons[pettype], game.u.ux, game.u.uy,
                         MM_EDOG | NO_MINVENT);
    if (!mtmp)
        return null;

    initedog(mtmp);
    return mtmp;
}

// src/dog.c initedog() — tame flags only, no draw.
function initedog(mtmp) {
    mtmp.mtame = 10;
    mtmp.mpeaceful = 1;
    mtmp.mavenge = 0;
    mtmp.mleashed = 0;
}

// ---------------------------------------------------------------------------
// The pet's turn. dog_goal() scans a 5-square radius for something worth
// walking to, and calls dogfood() on every object it finds.
// ---------------------------------------------------------------------------

// include/dog.h — dogfood() return values, best first.
export const DOGFOOD = 0, CADAVER = 1, ACCFOOD = 2, MANFOOD = 3, APPORT = 4,
             POISON = 5, UNDEF = 6, TABU = 7;

// src/dog.c:995 dogfood() — only the part that draws is ported.
//
// The second test is the one that matters for the stream:
//
//     if (is_quest_artifact(obj) || obj_resists(obj, 0, 95))
//
// obj_resists always draws rn2(100) for an ordinary object and, with ochance 0,
// always returns false. So EVERY object the pet looks at costs exactly one
// rn2(100) here — which is why the recordings show obj_resists arriving before
// dog_goal's own rn2(8) rather than after it, even though the C line that names
// can_carry() sits later in the same condition.
export function dogfood(mon, obj) {
    if (obj.opoisoned && !resists_poison(mon))
        return POISON;
    if (is_quest_artifact(obj) || obj_resists(obj, 0, 95))
        return obj.cursed ? TABU : APPORT;

    /* The classification that follows draws nothing: it is a switch on
       oclass and a set of predicate tests. Not ported yet — reaching it is
       recorded so the gap is visible rather than guessed at. */
    note_unported('dogfood classification');
    return UNDEF;
}

/* src/artifact.c is not ported; no session generates a quest artifact this
   early, and the call draws nothing either way. */
function is_quest_artifact(obj) { return false; }

/* src/mondata.h resists_poison() */
function resists_poison(mon) {
    return !!(mon.data?.mresists & MFLAGS.MR_POISON);
}

function note_unported(what) {
    (game.unported ||= new Set()).add(what);
}

// src/dogmove.c:495 dog_goal() — pick somewhere worth walking to.
//
// Only the object search is ported. It walks the level's object list (fobj,
// newest-first) and calls dogfood() on everything inside a 5-square box around
// the pet, so it costs one rn2(100) per nearby object before any of its own
// draws. That is the whole reason obj_resists shows up ahead of dog_goal's
// rn2(8) in the recordings.
const SQSRCHRADIUS = 5;

export function dog_goal(mtmp, edog, after, udist, whappr) {
    const omx = mtmp.mx, omy = mtmp.my;

    const min_x = Math.max(omx - SQSRCHRADIUS, 1);
    const max_x = Math.min(omx + SQSRCHRADIUS, COLNO - 1);
    const min_y = Math.max(omy - SQSRCHRADIUS, 0);
    const max_y = Math.min(omy + SQSRCHRADIUS, ROWNO - 1);

    let gtyp = UNDEF;
    for (const obj of (game.level.objects || [])) {
        const nx = obj.ox, ny = obj.oy;
        if (nx >= min_x && nx <= max_x && ny >= min_y && ny <= max_y) {
            const otyp = dogfood(mtmp, obj);
            /* skip inferior goals */
            if (otyp > gtyp || otyp === UNDEF)
                continue;
            /* the branches past here need cursed_object_at(),
               could_reach_item(), can_reach_location() and m_cansee(); the
               APPORT one draws rn2(8) and then can_carry(). */
            note_unported('dog_goal goal selection');
            break;
        }
    }

    /* src/dogmove.c:565 — follow the player.
       gtyp is UNDEF whenever the object search above found nothing. */
    if (gtyp === UNDEF) {
        game.gg = { gx: game.u.ux, gy: game.u.uy, gtyp };

        if (after && udist <= 4 && game.u.ux === game.gg.gx
            && game.u.uy === game.gg.gy)
            return -2;

        let appr = (udist >= 9) ? 1 : (mtmp.mflee ? -1 : 0);
        if (udist > 1) {
            if (!IS_ROOM(game.level.at(game.u.ux, game.u.uy)?.typ)
                || !rn2(4) || whappr)
                appr = 1;
            /* the dog_has_minvent case needs monster inventory */
        }

        /* a pet follows more closely when the hero is carrying its food, is
           on stairs, or is beside a magic portal. The inventory scan calls
           dogfood() on EVERY carried item, and dogfood() draws — so this is
           one rn2(100) per item in the pack. */
        if (appr === 0) {
            if (On_stairs(game.u.ux, game.u.uy)) {
                appr = 1;
            } else {
                for (const obj of (game.invent || [])) {
                    if (dogfood(mtmp, obj) === DOGFOOD) {
                        appr = 1;
                        break;
                    }
                }
                if (appr === 0) {
                    const t = (game.level?.traps || [])
                                  .find(tr => tr.ttyp === MAGIC_PORTAL);
                    if (t && distu(t.tx, t.ty) <= 2)
                        appr = 1;
                }
            }
        }
        return appr;
    }

    note_unported('dog_goal non-follow goal');
    return 0;
}

/* src/dungeon.c On_stairs() */
function On_stairs(x, y) {
    return (game.level?.stairs || []).some(st => st.sx === x && st.sy === y);
}

// src/dogmove.c:977 dog_move() — the pet's turn.
//
// dog_hunger() and dog_invent() come first in C and both draw; neither is
// ported, so this reaches dog_goal()'s search only. The stream is right up to
// the point one of those would have fired.
export function dog_move(mtmp, after) {
    const edog = mtmp.mtame ? (mtmp.edog || {}) : null;
    if (!edog) return 0;

    /* src/dogmove.c dog_hunger() draws nothing — it is a comparison of
       moves against edog->hungrytime plus messages. Not ported; when it
       matters it kills a starving pet, which no public session reaches. */
    note_unported('dog_hunger');

    const omx = mtmp.mx, omy = mtmp.my;
    const udist = distu(omx, omy);

    dog_invent(mtmp, edog, udist);

    const whappr = 0;                 /* moves - edog.whistletime < 5 */
    const appr = dog_goal(mtmp, edog, after, udist, whappr);
    if (appr === -2)
        return MMOVE_NOTHING;

    /* src/dogmove.c:1062 — the squares the pet may move to */
    const mfp = {};
    const cnt = mfndpos(mtmp, mfp, mon_allowflags(mtmp));

    /* Dogs normally avoid cursed items, so count the clean squares first;
       the count is the bound of the rn2 below. */
    let uncursedcnt = 0;
    for (let i = 0; i < cnt; i++) {
        const nx = mfp.poss[i].x, ny = mfp.poss[i].y;
        if (cursed_object_at(nx, ny))
            continue;
        uncursedcnt++;
    }

    let nix = omx, niy = omy, chi = -1, chcnt = 0;
    let nidist = GDIST(nix, niy);

    for (let i = 0; i < cnt; i++) {
        const nx = mfp.poss[i].x, ny = mfp.poss[i].y;
        const cursemsg = cursed_object_at(nx, ny);

        /* the eat/attack branches at the top of this loop need dog_eat and
           the monster-attack path; neither is ported and both draw */
        if (mfp.info[i] & (ALLOW_M | ALLOW_U)) {
            note_unported('dog_move attack branch');
            continue;
        }

        /* saw a cursed item and is not being forced onto it */
        if (cursemsg && !mtmp.mleashed && uncursedcnt > 0
            && rn2(13 * uncursedcnt))
            continue;

        /* lessen the chance of backtracking; only when loose and far away */
        if (!mtmp.mleashed && distmin(omx, omy, game.u.ux, game.u.uy) > 5) {
            const k = edog ? uncursedcnt : cnt;
            let skip = false;
            const track = mtmp.mtrack || [];
            for (let j = 0; j < MTSZ && j < k - 1; j++)
                if (track[j] && nx === track[j].x && ny === track[j].y)
                    if (rn2(MTSZ * (k - j))) { skip = true; break; }
            if (skip) continue;
        }

        const ndist = GDIST(nx, ny);
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

    /* src/dogmove.c:1276 newdogpos — apply the move. Draws nothing: it is
       remove_monster() followed by place_monster(), which for us is just the
       pet's coordinates. C does NOT reorder fmon here, so neither do we.
       Without this the pet stands still for the whole game and its search box
       drifts further from C's with every turn. */
    if (nix !== omx || niy !== omy) {
        if (chi >= 0 && (mfp.info[chi] & ALLOW_U)) {
            note_unported('mattacku');
            return MMOVE_DONE;
        }
        /* src/monmove.c mtrack — remember where we came from, newest first */
        mtmp.mtrack = mtmp.mtrack || [];
        mtmp.mtrack.unshift({ x: omx, y: omy });
        if (mtmp.mtrack.length > MTSZ) mtmp.mtrack.length = MTSZ;

        mtmp.mx = nix;
        mtmp.my = niy;
        return MMOVE_MOVED;
    }
    return MMOVE_NOTHING;
}

/* include/monst.h MTSZ — how many previous squares a monster remembers. */
const MTSZ = 4;
const MMOVE_NOTHING = 0, MMOVE_MOVED = 2, MMOVE_DONE = 3;

/* src/dogmove.c GDIST(x,y) = dist2(x, y, gg.gx, gg.gy) */
function GDIST(x, y) {
    const gx = game.gg?.gx ?? game.u.ux, gy = game.gg?.gy ?? game.u.uy;
    const dx = x - gx, dy = y - gy;
    return dx * dx + dy * dy;
}

/* src/hack.c distmin() — the Chebyshev distance */
function distmin(x0, y0, x1, y1) {
    return Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
}

/* src/dogmove.c cursed_object_at() */
function cursed_object_at(x, y) {
    return (game.level?.objects || [])
               .some(o => o.ox === x && o.oy === y && o.cursed);
}

// src/dogmove.c:410 dog_invent() — the pet drops what it carries, or picks up
// what it is standing on.
//
// Both halves are guarded, and in the common case — nothing carried, nothing
// underfoot — this draws NOTHING. That is what the recordings show: seed0101
// and seed0102 both go straight from distfleeck to dog_goal's first dogfood.
// Getting the guards right therefore matters as much as the draws.
/* src/dogmove.c:138 nofetch[] = { BALL_CLASS, CHAIN_CLASS, ROCK_CLASS } */
const nofetch = [OCLASSES.BALL_CLASS, OCLASSES.CHAIN_CLASS, OCLASSES.ROCK_CLASS];

export function dog_invent(mtmp, edog, udist) {
    if (helpless(mtmp) || mtmp.meating)
        return 0;

    const omx = mtmp.mx, omy = mtmp.my;

    if (droppables(mtmp)) {
        if (!rn2(udist + 1) || !rn2(edog.apport))
            if (rn2(10) < edog.apport) {
                note_unported('relobj');           /* the drop itself */
                if (edog.apport > 1) edog.apport--;
                edog.dropdist = udist;
                edog.droptime = game.moves;
            }
    } else {
        const obj = (game.level.objects || [])
                        .find(o => o.ox === omx && o.oy === omy);
        if (obj && !nofetch.includes(obj.oclass)) {
            const edible = dogfood(mtmp, obj);

            if (edible <= CADAVER
                || (edog.mhpmax_penalty && edible === ACCFOOD)) {
                /* could_reach_item() and dog_eat() are not ported; dog_eat
                   draws, so stop here rather than guess. */
                note_unported('dog_eat');
                return 0;
            }
            /* can_carry() itself draws nothing, but it and could_reach_item()
               decide whether the rn2(20) below happens at all. */
            note_unported('dog_invent pickup');
        }
    }
    return 0;
}

/* src/mon.c droppables() — the first thing in the pet's pack it would drop.
   Our monsters carry no inventory yet, so this is empty rather than wrong;
   m_initinv() is the gap, and it is recorded there. */
function droppables(mtmp) {
    return (mtmp.minvent && mtmp.minvent.length) ? mtmp.minvent[0] : null;
}

/* src/mondata.h helpless() */
function helpless(mtmp) {
    return !!(mtmp.msleeping || !mtmp.mcanmove || (mtmp.mfrozen | 0) > 0);
}

// src/hack.c distu() — squared distance from the hero.
function distu(x, y) {
    const dx = x - game.u.ux, dy = y - game.u.uy;
    return dx * dx + dy * dy;
}
