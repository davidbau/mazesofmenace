// priest.js — temple priests.
// C ref: src/priest.c
//
// Only priestini() is here: the shrine priest created at altar creation.
// Priest movement, chat and donations are recorded when reached.

import { game } from './gstate.js';
import { rn2, rn1, d } from './rng.js';
import { makemon, remove_monster, place_monster,
         set_malign, mongets } from './makemon.js';
import { ONAMES } from './objects_data.js';
import { mpickobj } from './steal.js';
import { mkobj, curse, SPBOOK_no_NOVEL } from './mkobj.js';
import { pm_good_location } from './sp_lev.js';
import { PMNAMES, MMFLAGS } from './monst_data.js';
import { ROOMOFFSET, W_ARMC, IS_ROOM, NOTONL, ALLOW_M,
         ALLOW_ROCK, SPINE, AM_SHRINE, IS_ALTAR, In_endgame } from './const.js';
import { mfndpos, mon_allowflags, m_at } from './mon.js';
import { monnear, m_canseeu, histemple_at, inhishop } from './monmove.js';
import { dist2, online2 } from './hacklib.js';
import { newsym, canseemon, canspotmon, pline } from './display.js';
import { Invis, Deaf, Hallucination } from './youprop.js';
import { You, You_feel } from './pline.js';
import { Monnam } from './do_name.js';
import { helpless } from './monst.js';

const xdir = [-1, -1, 0, 1, 1, 1, 0, -1];
const ydir = [0, -1, -1, -1, 0, 1, 1, 1];

function note_unported_priest(what) {
    (game.unported ||= new Set()).add('priest:' + what);
}

// src/priest.c:219 priestini() — exclusively for mktemple()/shrine altars.
export function priestini(lvl, sroom, sx, sy, sanctum) {
    game.p_coaligned = p_coaligned;
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
            shroom: ((sroom.roomnoidx ?? game.level.rooms.indexOf(sroom))
                     + ROOMOFFSET),
            shralign: Amask2align(game.level.at(sx, sy)?.altarmask ?? 0),
            shrpos: { x: sx, y: sy },
            shrlevel: { dnum: lvl.dnum, dlevel: lvl.dlevel },
        };
        priest.ispriest = 1;
        priest.isminion = 0;
        priest.mpeaceful = 1;
        priest.msleeping = 0;
        /* mon_learns_traps, set_malign: state only */

        /* now his/her goodies... src/priest.c:260 — the high priest of
           Moloch carries the real Amulet, but only on the sanctum level
           itself (fake towers pass sanctum=FALSE) */
        {
            const sl = game.special_levels?.sanctum_level;
            if (sanctum && priest.epri.shralign === 0
                && sl && game.u.uz.dnum === sl.dnum
                && game.u.uz.dlevel === sl.dlevel)
                mongets(priest, ONAMES.AMULET_OF_YENDOR);
        }
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

// src/priest.c:370 p_coaligned() and :376 has_shrine().
export function p_coaligned(priest) {
    return game.u.ualign.type === priest.epri?.shralign;
}

function has_shrine(priest) {
    const epri = priest?.epri;
    if (!priest?.ispriest || !epri)
        return false;
    const lev = game.level.at(epri.shrpos.x, epri.shrpos.y);
    return !!lev && IS_ALTAR(lev.typ) && !!(lev.altarmask & AM_SHRINE)
           && epri.shralign === Amask2align(lev.altarmask & ~AM_SHRINE);
}

// src/priest.c:414 intemple(), temple entry feedback.
export async function intemple(roomno) {
    game.p_coaligned = p_coaligned;
    /* Re-entering while already touching the temple does nothing. */
    for (const ch of game.u.urooms0 || '') {
        if (game.level?.rooms?.[ch.charCodeAt(0) - ROOMOFFSET]?.rtype === 10)
            return;
    }

    const priest = (game.level?.monsters || []).find(mtmp =>
        mtmp.mhp > 0 && mtmp.ispriest && mtmp.epri?.shroom === roomno
        && histemple_at(mtmp, mtmp.mx, mtmp.my));
    if (priest) {
        const epri = priest.epri;
        const shrined = has_shrine(priest);
        const sanctumLevel = game.special_levels?.sanctum_level;
        const isSanctum = !!sanctumLevel
            && game.u.uz.dnum === sanctumLevel.dnum
            && game.u.uz.dlevel === sanctumLevel.dlevel;
        const sanctum = priest.mnum === PMNAMES.PM_HIGH_CLERIC
                        && (isSanctum || In_endgame(game.u.uz));
        const canSpeak = !helpless(priest);

        if (canSpeak && !Deaf()
            && game.moves >= (epri.intone_time ?? 0)) {
            const savePriest = priest.ispriest;
            if (sanctum && !Hallucination())
                priest.ispriest = 0;
            await pline(`${canseemon(priest) ? Monnam(priest)
                                              : 'A nearby voice'} intones:`);
            priest.ispriest = savePriest;
            epri.intone_time = game.moves + d(10, 500);
            epri.enter_time = 0;
        }

        let msg1 = null, msg2 = null;
        if (sanctum && isSanctum) {
            if (priest.mpeaceful) {
                msg1 = "Infidel, you have entered Moloch's Sanctum!";
                msg2 = 'Be gone!';
                priest.mpeaceful = 0;
                set_malign(priest);
            } else {
                msg1 = 'You desecrate this place by your presence!';
            }
        } else if (game.moves >= (epri.enter_time ?? 0)) {
            msg1 = `Pilgrim, you enter a ${shrined ? 'sacred'
                                                   : 'desecrated'} place!`;
        }
        if (msg1 && canSpeak && !Deaf()) {
            await pline(`"${msg1}"`);
            if (msg2)
                await pline(`"${msg2}"`);
            epri.enter_time = game.moves + d(10, 100);
        }

        if (!sanctum) {
            let line, timeKey, otherKey;
            if (!shrined || !p_coaligned(priest)
                || game.u.ualign.record <= -4) {
                line = `have a${(!shrined || !p_coaligned(priest))
                    ? '' : ' strange'} forbidding feeling...`;
                timeKey = 'hostile_time';
                otherKey = 'peaceful_time';
            } else {
                line = `experience ${game.u.ualign.record >= 14
                    ? 'a' : 'an unusual'} sense of peace.`;
                timeKey = 'peaceful_time';
                otherKey = 'hostile_time';
            }
            const thisTime = epri[timeKey] ?? 0;
            const otherTime = epri[otherKey] ?? 0;
            if (game.moves >= thisTime || otherTime >= thisTime) {
                await You(line);
                epri[timeKey] = game.moves + d(10, 20);
                if (epri[timeKey] <= otherTime)
                    epri[otherKey] = epri[timeKey] - 1;
            }
        }
        return;
    }

    switch (rn2(4)) {
    case 0:
        await You('have an eerie feeling...');
        break;
    case 1:
        await You_feel('like you are being watched.');
        break;
    case 2: {
        const { body_part } = await import('./polyself.js');
        await pline(`A shiver runs down your ${body_part(SPINE)}.`);
        break;
    }
    default:
        break;
    }

    if (!rn2(5)) {
        const ghost = makemon(game.mons[PMNAMES.PM_GHOST], game.u.ux,
                              game.u.uy, MMFLAGS.MM_NOMSG);
        if (ghost) {
            const ngen = game.mvitals?.[PMNAMES.PM_GHOST]?.born ?? 0;
            if (canspotmon(ghost))
                await pline(`A${ngen < 5 ? 'n enormous' : ''} ghost appears next to you${ngen < 10 ? '!' : '.'}`);
            else
                await You('sense a presence close by!');
            ghost.mpeaceful = 0;
            set_malign(ghost);
            if (game.flags?.verbose !== false)
                await You('are frightened to death, and unable to move.');
            const { nomul } = await import('./hack.js');
            nomul(-3);
            game.multi_reason = 'being terrified of a ghost';
            game.nomovemsg = 'You regain your composure.';
        }
    }
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

// src/priest.c:724 mk_roamer() — an aligned wandering minion (aligned
// cleric, angel) made by des.monster() with an explicit alignment.
export function mk_roamer(ptr, alignment, x, y, peaceful) {
    const coaligned = (game.u.ualign.type === alignment);

    if (m_at(x, y))
        note_unported_priest('mk_roamer:rloc squatter');

    const roamer = makemon(ptr, x, y, MMFLAGS.MM_ADJACENTOK
                                      | MMFLAGS.MM_EMIN | MMFLAGS.MM_NOMSG);
    if (!roamer)
        return null;

    roamer.emin = { min_align: alignment,
                    renegade: !!(coaligned && !peaceful) };
    roamer.ispriest = 0;
    roamer.isminion = 1;
    /* mon_learns_traps(roamer, ALL_TRAPS) — mtrapseen = ~0L, state only */
    roamer.mtrapseen = ~0;
    roamer.mpeaceful = peaceful ? 1 : 0;
    roamer.msleeping = 0;
    set_malign(roamer); /* peaceful may have changed */

    return roamer;
}

// src/priest.c:755 reset_hostility() — on the Astral Plane the placeholder
// alignments the level script gave its clerics and Angels resolve against
// the hero's actual alignment.
export function reset_hostility(roamer) {
    if (!roamer.isminion)
        return;
    if (roamer.data !== game.mons[PMNAMES.PM_ALIGNED_CLERIC]
        && roamer.data !== game.mons[PMNAMES.PM_ANGEL])
        return;

    if ((roamer.emin?.min_align) !== game.u.ualign.type) {
        roamer.mpeaceful = roamer.mtame = 0;
        set_malign(roamer);
    }
    newsym(roamer.mx, roamer.my);
}
