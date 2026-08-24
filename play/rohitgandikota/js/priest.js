// priest.js — temple priests.
// C ref: src/priest.c
//
// Only priestini() is here: the shrine priest created at altar creation.
// Priest movement, chat and donations are recorded when reached.

import { game } from './gstate.js';
import { rn2, rn1 } from './rng.js';
import { makemon, remove_monster, place_monster } from './makemon.js';
import { mpickobj } from './steal.js';
import { mkobj, curse, SPBOOK_no_NOVEL } from './mkobj.js';
import { pm_good_location } from './sp_lev.js';
import { PMNAMES, MMFLAGS } from './monst_data.js';
import { ROOMOFFSET, W_ARMC, IS_ROOM, NOTONL, ALLOW_M,
         ALLOW_ROCK } from './const.js';
import { mfndpos, mon_allowflags, m_at } from './mon.js';
import { monnear, m_canseeu, histemple_at, inhishop } from './monmove.js';
import { dist2, online2 } from './hacklib.js';
import { newsym } from './display.js';
import { Invis } from './youprop.js';

const xdir = [-1, -1, 0, 1, 1, 1, 0, -1];
const ydir = [0, -1, -1, -1, 0, 1, 1, 1];

function note_unported_priest(what) {
    (game.unported ||= new Set()).add('priest:' + what);
}

// src/priest.c:219 priestini() — exclusively for mktemple()/shrine altars.
export function priestini(lvl, sroom, sx, sy, sanctum) {
    const si = rn2(8);
    const prim = game.mons[sanctum ? PMNAMES.PM_HIGH_CLERIC
                                   : PMNAMES.PM_ALIGNED_CLERIC];
    let px = 0, py = 0, i;
    for (i = 0; i < 8; i++) {
        const k = (i + si) & 7;      /* DIR_CLAMP */
        px = sx + xdir[k];
        py = sy + ydir[k];
        if (pm_good_location(px, py, prim))
            break;
    }
    if (i === 8) {
        px = sx;
        py = sy;
    }

    const squatter = game.level?.monAt?.get(`${px},${py}`);
    if (squatter)
        note_unported_priest('priestini:rloc squatter');

    const priest = makemon(prim, px, py, MMFLAGS.MM_EPRI);
    if (priest) {
        priest.epri = {
            shroom: (game.level.rooms.indexOf(sroom) + ROOMOFFSET),
            shralign: Amask2align(game.level.at(sx, sy)?.altarmask ?? 0),
            shrpos: { x: sx, y: sy },
            shrlevel: { dnum: lvl.dnum, dlevel: lvl.dlevel },
        };
        priest.ispriest = 1;
        priest.isminion = 0;
        priest.mpeaceful = 1;
        priest.msleeping = 0;
        /* mon_learns_traps, set_malign: state only */

        /* now his goodies: sanctum amulet only on the sanctum level */
        if (sanctum && priest.epri.shralign === 0)
            note_unported_priest('priestini:sanctum amulet');
        /* 2 to 4 spellbooks */
        for (let cnt = rn1(3, 2); cnt > 0; --cnt)
            mpickobj(priest, mkobj(SPBOOK_no_NOVEL, false));
        /* robe [via makemon()] */
        if (rn2(2)) {
            const robe = (priest.minvent || [])
                .find(o => (o.owornmask ?? 0) & W_ARMC);
            if (robe)
                curse(robe);   /* Moloch's priest is never co-aligned */
        }
    }
}

/* include/align.h Amask2align() */
function Amask2align(amask) {
    const AM_LAWFUL = 4, AM_NEUTRAL = 2, AM_CHAOTIC = 1;
    return (amask & AM_LAWFUL) ? 1 : (amask & AM_NEUTRAL) ? 0
         : (amask & AM_CHAOTIC) ? -1 : 0 /* A_NONE-ish */;
}

/* ------------------------------------------------------------------ *
 * Movement: move_special() serves shopkeepers and priests (and C's
 * vault guards go through their own gd_move).
 * ------------------------------------------------------------------ */

// src/priest.c:42 move_special() — the constrained walk shopkeepers and
// priests use: head for a goal square, stay on ROOM squares, optionally
// avoid standing on a line with the hero.
export async function move_special(mtmp, in_his_shop, appr, uondoor, avoid,
                                   omx, omy, ggx, ggy) {
    let nix, niy;
    let chcnt, cnt;
    const mfp = {};
    let ninfo = 0;

    if (omx === ggx && omy === ggy)
        return 0;
    if (mtmp.mconf) {
        avoid = false;
        appr = 0;
    }

    nix = omx;
    niy = omy;
    const allowflags = mon_allowflags(mtmp);
    cnt = mfndpos(mtmp, mfp, allowflags);

    let pick = true;
    if (mtmp.isshk && avoid && uondoor) { /* perhaps we cannot avoid him */
        pick = false;
        for (let i = 0; i < cnt; i++)
            if (!(mfp.info[i] & NOTONL)) {
                pick = true;
                break;
            }
        if (!pick) {
            avoid = false;
            pick = true;
        }
    }

    const GDIST = (x, y) => dist2(x, y, ggx, ggy);
    for (;;) {
        chcnt = 0;
        for (let i = 0; i < cnt; i++) {
            const nx = mfp.poss[i].x;
            const ny = mfp.poss[i].y;
            if (IS_ROOM(game.level.at(nx, ny)?.typ)
                || (mtmp.isshk && (!in_his_shop || mtmp.eshk?.following))) {
                if (avoid && (mfp.info[i] & NOTONL)
                    && !(mfp.info[i] & ALLOW_M))
                    continue;
                if ((!appr && !rn2(++chcnt))
                    || (appr && GDIST(nx, ny) < GDIST(nix, niy))
                    || (mfp.info[i] & ALLOW_M)) {
                    nix = nx;
                    niy = ny;
                    ninfo = mfp.info[i];
                }
            }
        }
        if (mtmp.ispriest && avoid && nix === omx && niy === omy
            && online2(omx, omy, game.u.ux, game.u.uy)) {
            /* might as well move closer as long it's going to stay
             * lined up */
            avoid = false;
            continue;
        }
        break;
    }

    if (nix !== omx || niy !== omy) {
        if (ninfo & ALLOW_ROCK) {
            /* m_break_boulder(): no shk/priest has reached a boulder yet */
            note_unported_priest('move_special:m_break_boulder');
            return 1;
        } else if (ninfo & ALLOW_M) {
            /* m_move_aggress(): monster-vs-monster attack from the walk */
            note_unported_priest('move_special:m_move_aggress');
            return 0;
        }

        if (m_at(nix, niy) || (nix === game.u.ux && niy === game.u.uy))
            return 0;
        remove_monster(omx, omy);
        place_monster(mtmp, nix, niy);
        newsym(nix, niy);
        if (mtmp.isshk && !in_his_shop && inhishop(mtmp)) {
            /* check_special_room(FALSE): shop re-entry bookkeeping is not
               ported yet (js/hack.js spoteffects notes the same gap) */
            note_unported_priest('move_special:check_special_room');
        }
        return 1;
    }
    return 0;
}

// src/priest.c:144 pri_move() — temple priest's turn: mill around the
// altar, or chase/attack when angry.
export async function pri_move(priest) {
    let avoid = true;

    const omx = priest.mx;
    const omy = priest.my;

    if (!histemple_at(priest, omx, omy))
        return -1;

    let ggx = priest.epri.shrpos.x;
    let ggy = priest.epri.shrpos.y;

    ggx += rn1(3, -1); /* mill around the altar */
    ggy += rn1(3, -1);

    if (!priest.mpeaceful /* || Conflict: no source of it yet */) {
        if (monnear(priest, game.u.ux, game.u.uy)) {
            /* Displaced image message needs displacement, unreached */
            const { mattacku } = await import('./mhitu.js');
            await mattacku(priest);
            return 0;
        } else if ((game.u.urooms || '')
                   .includes(String.fromCharCode(priest.epri.shroom))) {
            /* chase player if inside temple & can see him */
            if ((priest.mcansee ?? 1) && m_canseeu(priest)) {
                ggx = game.u.ux;
                ggy = game.u.uy;
            }
            avoid = false;
        }
    } else if (Invis()) {
        avoid = false;
    }

    return move_special(priest, false, 1, false, avoid, omx, omy, ggx, ggy);
}
