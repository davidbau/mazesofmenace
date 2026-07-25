// monmove.js — monster movement.
// C ref: src/monmove.c
//
// distfleeck() draws rn2(5) unconditionally at its head (the "brave gremlin"
// roll), once per monster that acts, so it is the first thing a turn with
// awake monsters spends after the movement allotment.

import { game } from './gstate.js';
import { place_monster, remove_monster } from './makemon.js';
import { rn2, rnd } from './rng.js';
import { dog_move } from './dog.js';
import { mfndpos, mon_allowflags } from './mon.js';
import { MONSYMS, MFLAGS, PMNAMES, ATTKS } from './monst_data.js';
import { OCLASSES } from './objects_data.js';
import { couldsee } from './vision.js';
import { ALLOW_U, COULD_SEE, A_LAWFUL, BOLT_LIM, IS_ALTAR } from './const.js';
import { is_rider } from './makemon.js';

// src/priest.c:9 ALGN_SINNED — worse than strayed (-1..-3).
const ALGN_SINNED = -4;

/* include/monst.h:214, include/mondata.h:81,174, include/hack.h:1414 and
   include/monst.h:217,281 — the one-line predicates distfleeck() and onscary()
   test with. Kept as single expressions so each reads like its macro. */
const DEADMONSTER = (mon) => (mon.mhp ?? 0) < 1;
const perceives = (ptr) => (ptr.mflags1 & MFLAGS.M1_SEE_INVIS) !== 0;
const unique_corpstat = (ptr) => (ptr.geno & MFLAGS.G_UNIQ) !== 0;
const NODIAG = (monnum) => monnum === PMNAMES.PM_GRID_BUG;
const is_minion = (ptr) => (ptr.mflags2 & MFLAGS.M2_MINION) !== 0;
const is_vampshifter = (mon) =>
    mon.cham === PMNAMES.PM_VAMPIRE || mon.cham === PMNAMES.PM_VAMPIRE_LEADER
    || mon.cham === PMNAMES.PM_VLAD_THE_IMPALER;
const is_lminion = (mon) =>
    is_minion(game.mons[mon.mnum]) && mon_aligntyp(mon) === A_LAWFUL;

// src/mon.c mon_aligntyp()
function mon_aligntyp(mon) {
    return game.mons[mon.mnum].maligntyp;
}

/* src/monmove.c:450 flees_light() — gremlins flee an artifact light source.
   Needs artifact_light() and couldsee(), neither of which is ported; a gremlin
   is the only monster it can ever be true for. */
function flees_light(mon) {
    if (mon.mnum !== PMNAMES.PM_GREMLIN)
        return false;
    note_unported('flees_light');
    return false;
}

/* src/priest.c in_your_sanctuary() — a temple with a peaceful coaligned priest.
   The early returns that need no priest data are ported; the rest needs the
   priest subsystem. */
function in_your_sanctuary(mon, x, y) {
    if (mon) {
        if (is_minion(game.mons[mon.mnum]) || is_rider(game.mons[mon.mnum]))
            return false;
        x = mon.mx, y = mon.my;
    }
    if (game.u.ualign.record <= ALGN_SINNED) /* sinned or worse */
        return false;
    note_unported('in_your_sanctuary:temple');
    return false;
}

/* src/shk.c inhishop() / src/priest.c inhistemple() — both need the shop and
   temple bookkeeping. No shopkeeper or priest is created on an ordinary level
   before either subsystem lands, so the flags they guard are never set. */
function inhishop(mtmp) {
    note_unported('inhishop');
    return false;
}

function inhistemple(mtmp) {
    note_unported('inhistemple');
    return false;
}

// src/monmove.c:76 mon_track_add() — push a coordinate onto the monster's
// memory of where it has just been. m_move() consults it to avoid pacing back
// and forth, so the contents decide the modulus of an rn2 in the position loop.
export function mon_track_add(mtmp, x, y) {
    mtmp.mtrack = mtmp.mtrack || [];
    mtmp.mtrack.unshift({ x, y });
    if (mtmp.mtrack.length > MTSZ)
        mtmp.mtrack.length = MTSZ;
}

// src/monmove.c:88 mon_track_clear()
export function mon_track_clear(mtmp) {
    mtmp.mtrack = [];
}

// src/mon.c monnear() — adjacent, with no diagonal for NODIAG monsters.
function monnear(mon, x, y) {
    const distance = dist2(mon.mx, mon.my, x, y);

    if (distance === 2 && NODIAG(mon.mnum))
        return false;
    return distance < 3;
}

// src/monmove.c onscary() — is this square one the monster refuses to stand on?
//
// Draws nothing, but it is what turns *scared on, and a scared monster spends
// an rnd() in monflee(). The engraving and scare-monster-scroll branches need
// subsystems that are not ported, so they are recorded rather than guessed:
// answering TRUE there would invent a flee (and a draw) that C did not make.
export function onscary(x, y, mtmp) {
    /* <0,0> is used by musical scaring; it doesn't care about scrolls or
       engravings or dungeon branch */
    const auditory_scare = (x === 0 && y === 0);
    const magical_scare = !auditory_scare;

    /* creatures who are directly resistant to any type of scaring:
       Rodney, lawful minions, Angels, the Riders */
    if (mtmp.iswiz || is_lminion(mtmp) || mtmp.mnum === PMNAMES.PM_ANGEL
        || is_rider(game.mons[mtmp.mnum]))
        return false;

    /* creatures who are directly resistant to magical scaring based on the
       mere presence of something at a location: humans etc. */
    if (magical_scare
        && (game.mons[mtmp.mnum].mlet === MONSYMS.S_HUMAN
            || unique_corpstat(game.mons[mtmp.mnum])))
        return false;

    /* shopkeepers inside their own shop, priests inside their own temple */
    if ((mtmp.isshk && inhishop(mtmp)) || (mtmp.ispriest && inhistemple(mtmp)))
        return false;

    if (auditory_scare)
        return true;

    /* should this still be true for defiled/molochian altars? */
    const loc = game.level?.at(x, y);
    if (loc && IS_ALTAR(loc.typ)
        && (game.mons[mtmp.mnum].mlet === MONSYMS.S_VAMPIRE
            || is_vampshifter(mtmp)))
        return true;

    /* sobj_at(SCR_SCARE_MONSTER) and sengr_at("Elbereth") both need parts of
       the object and engraving code that are absent, so neither can be
       answered yet. Both would return TRUE only in rare states. */
    note_unported('onscary:scare_monster_and_elbereth');
    return false;
}

// src/monmove.c:462 monflee() — begin fleeing for fleetime turns.
//
// The caller has already spent the rnd() that produces fleetime; this function
// itself only draws through its messages, which need pline plumbing that is not
// here yet.
export function monflee(mtmp, fleetime, first, fleemsg) {
    if (DEADMONSTER(mtmp))
        return;

    if (mtmp === game.u.ustuck)
        note_unported('release_hero');

    if (!first || !mtmp.mflee) {
        /* don't lose untimed scare */
        if (!fleetime) {
            mtmp.mfleetim = 0;
        } else if (!mtmp.mflee || mtmp.mfleetim) {
            fleetime += (mtmp.mfleetim || 0);
            /* ensure monster flees long enough to visibly stop fighting */
            if (fleetime === 1)
                fleetime++;
            mtmp.mfleetim = Math.min(fleetime, 127);
        }
        if (!mtmp.mflee && fleemsg)
            note_unported('monflee:fleemsg');
        mtmp.mflee = 1;
    }
    /* ignore recently-stepped spaces when made to flee */
    mon_track_clear(mtmp);
}

// src/monmove.c set_apparxy() — the monster decides where it thinks the hero
// is. dochug() calls this before distfleeck(), because inrange/nearby are
// measured against mux,muy rather than the hero's real position.
//
// The ordinary case (monster can see, hero neither invisible nor displaced nor
// underwater) sets displ to 0 and returns without drawing, which is why leaving
// this out cost no RNG and still left every monster targeting <0,0>.
export function set_apparxy(mtmp) {
    let mx = mtmp.mux, my = mtmp.muy;
    let displ;

    /* pet knows your smell; grabber still has hold of you; monsters which
       know where you are don't suddenly forget, if you haven't moved away */
    if (mtmp.mtame || mtmp === game.u.ustuck
        || (game.u.ux === mx && game.u.uy === my)) {
        mtmp.mux = game.u.ux;
        mtmp.muy = game.u.uy;
        return;
    }

    const Invis = !!game.u.uprops?.INVIS;
    const Displaced = !!game.u.uprops?.DISPLACED;
    const Underwater = !!game.u.uinwater;

    const notseen = (!mtmp.mcansee || (Invis && !perceives(game.mons[mtmp.mnum])));
    const notthere = (Displaced && mtmp.mnum !== PMNAMES.PM_DISPLACER_BEAST);

    if (Underwater) {
        displ = 1;
    } else if (notseen) {
        /* Xorns can smell quantities of valuable metal like that in solid
           gold coins, treat as seen */
        const umoney = money_cnt(game.invent);
        displ = (mtmp.mnum === PMNAMES.PM_XORN && umoney) ? 0 : 1;
    } else if (notthere) {
        displ = couldsee(mx, my) ? 2 : 1;
    } else {
        displ = 0;
    }
    if (!displ) {
        mtmp.mux = game.u.ux;
        mtmp.muy = game.u.uy;
        return;
    }

    /* The displaced/invisible search loop draws rn2 per attempt and rejects on
       accessible()/closed_door()/can_ooze(), none of which is ported. Guessing
       the loop's exit would invent draws, so it is recorded instead. */
    note_unported('set_apparxy:displaced');
    mtmp.mux = game.u.ux;
    mtmp.muy = game.u.uy;
}

// src/invent.c money_cnt()
function money_cnt(invent) {
    for (const otmp of invent || [])
        if (otmp.oclass === OCLASSES.COIN_CLASS)
            return otmp.quan;
    return 0;
}

// src/monmove.c:532 distfleeck()
export function distfleeck(mtmp) {
    let seescaryx, seescaryy;
    const bravegremlin = (rn2(5) === 0);

    const inrange = dist2(mtmp.mx, mtmp.my, mtmp.mux, mtmp.muy)
                    <= (BOLT_LIM * BOLT_LIM);
    const nearby = inrange && monnear(mtmp, mtmp.mux, mtmp.muy);

    /* Note: if your image is displaced, the monster sees the Elbereth at your
     * displaced position, thus never attacking your displaced position, but
     * possibly attacking you by accident. */
    if (!mtmp.mcansee || (game.u.uprops?.INVIS && !perceives(game.mons[mtmp.mnum]))) {
        seescaryx = mtmp.mux;
        seescaryy = mtmp.muy;
    } else {
        seescaryx = game.u.ux;
        seescaryy = game.u.uy;
    }

    const sawscary = onscary(seescaryx, seescaryy, mtmp);
    let scared;
    if (nearby && (sawscary
                   || (flees_light(mtmp) && !bravegremlin)
                   || (!mtmp.mpeaceful && in_your_sanctuary(mtmp, 0, 0)))) {
        scared = true;
        monflee(mtmp, rnd(rn2(7) ? 10 : 100), true, true);
    } else {
        scared = false;
    }
    return { inrange, nearby, scared, bravegremlin };
}

// src/monmove.c:700 dochug() — one monster's turn.
export function dochug(mtmp) {
    /* src/monmove.c:727 — a sleeping monster still gets a chance to be woken,
       and disturb() DRAWS on the way. Returning early here skipped both the
       draws and the monster's whole turn when it did wake. */
    if (mtmp.msleeping && !disturb(mtmp))
        return 0;

    /* src/monmove.c:778 — must run after the hero moves and before the monster
       does, because inrange/nearby in distfleeck() are measured against the
       monster's guess at the hero's position, not the hero's real one. */
    set_apparxy(mtmp);

    /* src/monmove.c:791 */
    distfleeck(mtmp);

    /* src/monmove.c:1773 — m_move() dispatches a tame monster to dog_move()
       before it reaches mfndpos(). */
    const status = mtmp.mtame ? dog_move(mtmp, 0) : m_move(mtmp, 0);

    /* src/monmove.c:915 — distfleeck is RECALCULATED after the move, so every
       monster that takes a turn spends TWO rn2(5) draws, not one. Calling it
       once made our turn cost half of C's, which read as though half our
       monsters were never acting. */
    if (status !== MMOVE_DIED)
        distfleeck(mtmp);

    return status;
}

// src/monmove.c:1720 m_move() — a non-tame monster's turn. The tame case is
// dispatched to dog_move() above, exactly as C does at :1773.
export function m_move(mtmp, after) {
    const ptr = mtmp.data;
    const omx = mtmp.mx, omy = mtmp.my;

    /* mtrapped / meating / hides_under all come first in C; the first two
       draw nothing here and the third needs an object underfoot. */
    if (hides_under(ptr) && OBJ_AT(omx, omy) && rn2(10))
        return MMOVE_NOTHING;      /* do not leave hiding place */

    let ggx = mtmp.mux, ggy = mtmp.muy;
    let appr = mtmp.mflee ? -1 : 1;

    if (mtmp.mconf) {
        appr = 0;
    } else {
        const should_see = (dist2(omx, omy, ggx, ggy) <= 36);

        if (!mtmp.mcansee
            || (mtmp.mpeaceful && !mtmp.isshk)
            || ((ptr.mlet === MONSYMS.S_BAT || ptr.mlet === MONSYMS.S_LIGHT)
                && !rn2(3)))
            appr = 0;

        /* leppie_avoidance and gettrack change appr/the goal without drawing;
           neither is ported. */
        note_unported('m_move leppie/gettrack');

        /* src/monmove.c:1878 — hostiles with a ranged option keep their
           distance. This changes appr, and appr decides which candidate square
           wins, so getting it wrong moves a monster to a different legal square
           while drawing exactly the same numbers. */
        appr = m_balks_at_approaching(appr, mtmp);
    }

    /* src/monmove.c:1891 — the pickup branch. The rn2(10) fires for every
       PEACEFUL monster whether or not it then picks anything up. */
    if ((!mtmp.mpeaceful || !rn2(10))) {
        note_unported('m_move ranged/pickup branch');
    }

    const flag = mon_allowflags(mtmp);
    const mfp = {};
    const cnt = mfndpos(mtmp, mfp, flag);
    if (cnt === 0)
        return MMOVE_NOMOVES;

    let chcnt = 0;
    const jcnt = Math.min(MTSZ, cnt - 1);
    let chi = -1;
    let nix = omx, niy = omy;
    let nidist = dist2(nix, niy, ggx, ggy);
    let mmoved = MMOVE_NOTHING;

    for (let i = 0; i < cnt; i++) {
        const nx = mfp.poss[i].x, ny = mfp.poss[i].y;

        if (appr !== 0) {
            const track = mtmp.mtrack || [];
            let skip = false;
            for (let j = 0; j < jcnt; j++)
                if (track[j] && nx === track[j].x && ny === track[j].y)
                    if (rn2(4 * (cnt - j))) { skip = true; break; }
            if (skip) continue;
        }

        const ndist = dist2(nx, ny, ggx, ggy);
        const nearer = ndist < nidist;

        if ((appr === 1 && nearer) || (appr === -1 && !nearer)
            || (!appr && !rn2(++chcnt))
            || (mmoved === MMOVE_NOTHING)) {
            nix = nx;
            niy = ny;
            nidist = ndist;
            chi = i;
            mmoved = MMOVE_MOVED;
        }
    }

    if (mmoved === MMOVE_MOVED && (nix !== omx || niy !== omy)) {
        if (chi >= 0 && (mfp.info[chi] & ALLOW_U)) {
            note_unported('mattacku');
            return MMOVE_DONE;
        }
        mtmp.mtrack = mtmp.mtrack || [];
        mtmp.mtrack.unshift({ x: omx, y: omy });
        if (mtmp.mtrack.length > MTSZ) mtmp.mtrack.length = MTSZ;
        /* src/monmove.c:2051 — remove then place, so level.monsters[][] tracks
           the move. Writing mx/my alone leaves m_at() answering with the old
           square. */
        remove_monster(omx, omy);
        place_monster(mtmp, nix, niy);
    }
    return mmoved;
}

const MTSZ = 4;
const MMOVE_NOTHING = 0, MMOVE_DIED = 1, MMOVE_MOVED = 2, MMOVE_DONE = 3,
      MMOVE_NOMOVES = 4;

/* include/mondata.h hides_under() */
function hides_under(ptr) {
    return (ptr.mflags1 & MFLAGS.M1_CONCEAL) !== 0;
}

function OBJ_AT(x, y) {
    return (game.level?.objects || []).some(o => o.ox === x && o.oy === y);
}

/* src/hack.c dist2() */
function dist2(x0, y0, x1, y1) {
    const dx = x0 - x1, dy = y0 - y1;
    return dx * dx + dy * dy;
}

function note_unported(what) {
    (game.unported ||= new Set()).add(what);
}

// src/monmove.c:660 disturb() — does the hero's presence wake this monster?
//
// Three of the four conditions can draw, and they short-circuit in order, so
// the draw count depends on what kind of monster it is:
//   ettin + stealthy hero        -> rn2(10)
//   nymph, jabberwock, leprechaun-> rn2(50)
//   anything not a dog or human  -> rn2(7)
function disturb(mtmp) {
    const d = mtmp.data;

    if (!(couldsee(mtmp.mx, mtmp.my) && mdistu(mtmp) <= 100))
        return 0;
    /* Stealth is an intrinsic the hero does not have yet, so the ettin
       rn2(10) cannot fire; when Stealth lands, this test comes with it. */
    if (!(d.mlet !== MONSYMS.S_NYMPH
          && d.pmidx !== PMNAMES.PM_JABBERWOCK
          && d.mlet !== MONSYMS.S_LEPRECHAUN) && rn2(50))
        return 0;
    if (!((d.mlet === MONSYMS.S_DOG || d.mlet === MONSYMS.S_HUMAN)
          || !rn2(7)))
        return 0;

    mtmp.msleeping = 0;
    return 1;
}

/* src/mon.c mdistu() — squared distance from the hero to a monster */
function mdistu(mtmp) {
    const dx = mtmp.mx - game.u.ux, dy = mtmp.my - game.u.uy;
    return dx * dx + dy * dy;
}

// src/monmove.c:1830 m_balks_at_approaching() — should this monster hang back?
//
// Draws nothing. Returns -1 to retreat, -2 for a preferred-range weapon, or the
// caller's appr unchanged.
function m_balks_at_approaching(oldappr, mtmp) {
    const x = mtmp.mx, y = mtmp.my, ux = mtmp.mux, uy = mtmp.muy;
    const edist = (x - ux) * (x - ux) + (y - uy) * (y - uy);

    /* peaceful, far away, or cannot see the hero */
    if (mtmp.mpeaceful || edist >= 5 * 5 || !m_canseeu(mtmp))
        return oldappr;

    /* the launcher, polearm and throw-and-return cases all need monster
       inventory, which nothing carries yet */

    /* can attack from a distance, and is hurt or has not used it */
    if (ranged_attk_available(mtmp)
        && ((mtmp.mhp < Math.trunc((mtmp.mhpmax + 1) / 3)) || !mtmp.mspec_used))
        return -1;

    return oldappr;
}

// include/vision.h:50 m_canseeu() — Invis and Underwater are hero states the
// port does not have yet, so this reduces to line of sight.
function m_canseeu(mtmp) {
    return couldsee(mtmp.mx, mtmp.my);
}

// src/mhitu.c:2413 ranged_attk_available() — does this monster have any attack
// that works at a distance? m_seenres() tracks what the hero has been seen to
// resist and needs the resistance-memory subsystem; without it C's test reduces
// to the attack-type check.
function ranged_attk_available(mtmp) {
    for (const atk of (mtmp.data?.mattk || [])) {
        const aatyp = atk[0];
        if (DISTANCE_ATTK_TYPE(aatyp))
            return true;
    }
    return false;
}

// include/monattk.h:31
function DISTANCE_ATTK_TYPE(atyp) {
    return atyp === ATTKS.AT_SPIT || atyp === ATTKS.AT_BREA
        || atyp === ATTKS.AT_GAZE || atyp === ATTKS.AT_MAGC;
}
