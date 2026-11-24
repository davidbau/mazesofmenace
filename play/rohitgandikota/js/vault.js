// vault.js: vault occupancy and the guard's arrival.
// C ref: src/vault.c

import { game } from './gstate.js';
import { in_rooms, nomul, unmul } from './hack.js';
import {
    makemon, set_malign, place_monster, remove_monster, MM_EGD, MM_NOMSG,
} from './makemon.js';
import { PMNAMES } from './monst_data.js';
import { g_at, hidden_gold, money_cnt, obj_extract_self, sobj_at,
         stackobj } from './invent.js';
import { canspotmon, map_background, map_invisible, map_location, mon_visible,
         more, newsym, pline, unset_seenv } from './display.js';
import { getlin } from './cmd.js';
import { mungspaces } from './hacklib.js';
import { Monnam, Some_Monnam, noit_Monnam, noit_mon_nam, pmname,
         x_monnam } from './do_name.js';
import { makeplural, mimic_obj_name } from './objnam.js';
import { adjalign } from './attrib.js';
import { block_point, cansee, couldsee, recalc_block_point,
         unblock_point } from './vision.js';
import { rn2 } from './rng.js';
import { dist2, distu, distmin, isok } from './hacklib.js';
import { is_fainted, reset_faint } from './eat.js';
import { ONAMES } from './objects_data.js';
import { m_at, m_carrying, mnexto, mongone, mpickgold, setmangry, t_at } from './mon.js';
import { MON_WEP } from './monst.js';
import { mon_wield_item } from './weapon.js';
import { del_engr, engr_at } from './engrave.js';
import { add_to_minv, place_object } from './mkobj.js';
import { You, You_hear, Your, impossible, pline_The, verbalize } from './pline.js';
import { currency, freeinv } from './invent.js';
import { make_grave } from './mklev.js';
import { OCLASSES } from './objects_data.js';
import { RLOC_ERR, RLOC_NOMSG, MALE, FEMALE } from './const.js';
import { enexto, rloc } from './teleport.js';
import {
    A_LAWFUL, COLNO, ROWNO, ROOMOFFSET, VAULT, VAULT_GUARD_TIME,
    ROOM, STONE, CORR, SCORR, HWALL, VWALL, DOOR, D_NODOOR, IS_WALL,
    IS_STWALL, IS_POOL, IS_ROOM, ACCESSIBLE, ARTICLE_A, BLCORNER,
    BRCORNER, RLOC_MSG, TLCORNER, TRCORNER, M_AP_TYPE, M_AP_OBJECT,
    NEED_HTH_WEAPON, IS_OBSTRUCTED, Upolyd,
} from './const.js';
import { relobj } from './steal.js';
import { m_into_limbo } from './mon.js';
import { on_level } from './dungeon.js';
import { mon_track_clear } from './monmove.js';
import { carried } from './obj.js';
import { deltrap } from './trap.js';
import { yelp } from './sounds.js';
import { fracture_rock } from './zap.js';
import { simpleonames } from './objnam.js';
import { an } from './objnam.js';
import { You_see } from './pline.js';
import { Blind, Deaf, Punished } from './youprop.js';
import { noit_mhis, sticks, is_silent, mhe } from './mondata.js';


export function vault_occupied(urooms) {
    for (const ch of urooms || '') {
        const roomno = ch.charCodeAt(0);
        if (game.level?.rooms?.[roomno - ROOMOFFSET]?.rtype === VAULT)
            return roomno;
    }
    return 0;
}

// src/vault.c:204 findgd(); a guard keeps ownership while parked or migrating.
export function findgd() {
    for (const mon of game.level.monsters) {
        if (mon.isgd && on_level(mon.mextra.egd.gdlevel, game.u.uz)) {
            if (!mon.mx && !mon.mextra.egd.gddone)
                mon.mhp = mon.mhpmax;
            return mon;
        }
    }
    const migrating = game.migrating_mons || [];
    for (let i = 0; i < migrating.length; ++i) {
        const mon = migrating[i];
        if (mon.isgd && on_level(mon.mextra.egd.gdlevel, game.u.uz)) {
            migrating.splice(i, 1);
            game.level.monsters.unshift(mon);
            mon_track_clear(mon);
            mon.mux = game.u.ux;
            mon.muy = game.u.uy;
            mon.mx = mon.my = 0;
            parkguard(mon);
            return mon;
        }
    }
    return null;
}

// src/vault.c uleftvault(). A gold-carrying hero who teleports away from an
// active escort makes the guard hostile and gives it an immediate move.
export async function uleftvault(guard) {
    const u = game.u;
    if (!guard?.isgd || (guard.mhp || 0) < 1)
        return;

    const hasGold = money_cnt(game.invent) > 0
        || hidden_gold(game.invent, true) > 0;
    if (hasGold && distmin(u.ux, u.uy, guard.mx, guard.my) > 1) {
        if (guard.mpeaceful) {
            if (canspotmon(guard))
                await pline(`${Monnam(guard)} becomes irate.`);
            guard.mpeaceful = 0;
        }
        if (!in_fcorridor(guard, u.ux, u.uy))
            await gd_move(guard);
    }
}

function in_fcorridor(guard, x, y) {
    const egd = guard.mextra?.egd;
    for (let i = egd?.fcbeg || 0; i < (egd?.fcend || 0); i++) {
        const fc = egd.fakecorr[i];
        if (fc.fx === x && fc.fy === y)
            return true;
    }
    return false;
}

function gold_at(x, y) {
    return sobj_at(ONAMES.GOLD_PIECE, x, y);
}

/* src/vault.c:44 clear_fcorr().  Fake corridor squares are restored from the
   vault end outward once neither the hero nor the guard can still see them. */
async function clear_fcorr(guard, forceshow = false) {
    const egd = guard.mextra.egd;
    const silently = !!game.program_state?.stopprint;
    let sawcorridor = false;
    if (!on_level(egd.gdlevel, game.u.uz))
        return true;

    while (egd.fcbeg < egd.fcend) {
        const fc = egd.fakecorr[egd.fcbeg];
        if ((guard.mhp <= 0 || !in_fcorridor(guard, game.u.ux, game.u.uy))
            && egd.gddone)
            forceshow = true;
        if ((game.u.ux === fc.fx && game.u.uy === fc.fy && guard.mhp > 0)
            || (!forceshow && couldsee(fc.fx, fc.fy))
            || (Punished() && !carried(game.u.uball)
                && game.u.uball.ox === fc.fx && game.u.uball.oy === fc.fy))
            return false;

        const occupant = game.level.monAt?.get(`${fc.fx},${fc.fy}`);
        if (occupant) {
            if (occupant.isgd)
                return false;
            if (occupant.mtame)
                await yelp(occupant);
            const { rloc } = await import('./teleport.js');
            if (!await rloc(occupant, RLOC_MSG))
                await m_into_limbo(occupant);
        }

        const loc = game.level.at(fc.fx, fc.fy);
        if (loc.typ === CORR && cansee(fc.fx, fc.fy))
            sawcorridor = true;
        loc.typ = fc.ftyp;
        loc.flags = fc.flags || 0;
        if (fc.doormask !== undefined)
            loc.doormask = fc.doormask;
        if (IS_STWALL(loc.typ)) {
            const trap = t_at(fc.fx, fc.fy);
            if (trap)
                deltrap(trap);
            if (loc.typ === STONE)
                blackout(fc.fx, fc.fy);
        }
        const engr = engr_at(fc.fx, fc.fy);
        if (engr)
            del_engr(engr);
        map_location(fc.fx, fc.fy, true);
        recalc_block_point(fc.fx, fc.fy);
        game.vision_full_recalc = 1;
        egd.fcbeg++;
    }
    if (sawcorridor && !silently)
        await pline_The('corridor disappears.');
    if (IS_OBSTRUCTED(game.level.at(game.u.ux, game.u.uy).typ)
        && (Upolyd() ? game.u.mh : game.u.uhp) > 0 && !silently)
        await You('are encased in rock.');
    return true;
}

// src/vault.c:123 blackout(); forget light and views from restored stone.
function blackout(x, y) {
    for (let i = x - 1; i <= x + 1; ++i)
        for (let j = y - 1; j <= y + 1; ++j) {
            if (!isok(i, j))
                continue;
            const loc = game.level.at(i, j);
            if (loc.typ === STONE)
                loc.lit = loc.waslit = 0;
            unset_seenv(loc, x, y, i, j);
        }
}

// src/vault.c:144 restfakecorr(); finish through ordinary disappearance.
async function restfakecorr(guard) {
    if (await clear_fcorr(guard, false)) {
        guard.isgd = 0;
        await mongone(guard);
    }
}

// src/vault.c:155 parkguard(); keep the same owner on fmon at <0,0>.
function parkguard(guard) {
    if (game.context?.polearm?.hitmon === guard)
        game.context.polearm.hitmon = null;
    if (guard.mx) {
        remove_monster(guard.mx, guard.my);
        newsym(guard.mx, guard.my);
    }
    if (game.level.monAt.get('0,0') !== guard)
        place_monster(guard, 0, 0);
    guard.mextra.egd.ogx = 0;
    guard.mextra.egd.ogy = 0;
}

// src/vault.c move_gold(). Move boundary gold back onto one of the four
// squares inside the vault.
function move_gold(gold, vroom) {
    const room = game.level.rooms[vroom];
    const oldx = gold.ox, oldy = gold.oy;
    obj_extract_self(gold);
    newsym(oldx, oldy);
    const nx = room.lx + rn2(2);
    const ny = room.ly + rn2(2);
    place_object(gold, nx, ny);
    stackobj(gold);
    newsym(nx, ny);
}

// src/vault.c wallify_vault(). Restore damaged boundary squares when a
// hostile or departing guard closes the vault behind it.
async function wallify_vault(guard) {
    const egd = guard.mextra?.egd;
    const room = game.level?.rooms?.[egd?.vroom];
    if (!room)
        return;

    const lox = room.lx - 1, hix = room.hx + 1;
    const loy = room.ly - 1, hiy = room.hy + 1;
    let fixed = false, movedgold = false;

    for (let x = lox; x <= hix; x++) {
        for (let y = loy; y <= hiy; y++) {
            if (x !== lox && x !== hix && y !== loy && y !== hiy)
                continue;

            const loc = game.level.at(x, y);
            const gold = gold_at(x, y);
            const rock = sobj_at(ONAMES.ROCK, x, y);
            const boulder = sobj_at(ONAMES.BOULDER, x, y);
            if ((IS_WALL(loc.typ) && !gold && !rock && !boulder)
                || in_fcorridor(guard, x, y))
                continue;

            const occupant = game.level.monAt?.get(`${x},${y}`);
            if (occupant && occupant !== guard) {
                const { rloc } = await import('./teleport.js');
                if (!await rloc(occupant, RLOC_MSG))
                    await m_into_limbo(occupant);
            }
            if (gold) {
                move_gold(gold, egd.vroom);
                movedgold = true;
            }
            let debris;
            while ((debris = sobj_at(ONAMES.ROCK, x, y)))
                obj_extract_self(debris);
            while ((debris = sobj_at(ONAMES.BOULDER, x, y)))
                obj_extract_self(debris);
            game.level.traps = (game.level.traps || [])
                .filter(t => t.tx !== x || t.ty !== y);

            const typ = x === lox
                ? (y === loy ? TLCORNER : y === hiy ? BLCORNER : VWALL)
                : x === hix
                  ? (y === loy ? TRCORNER : y === hiy ? BRCORNER : VWALL)
                  : HWALL;
            loc.typ = typ;
            loc.flags = 0;
            loc.doormask = 0;
            loc.wall_info = 0;
            const engraving = engr_at(x, y);
            if (engraving)
                del_engr(engraving);
            map_background(x, y, true);
            block_point(x, y);
            fixed = true;
        }
    }

    if (movedgold || fixed) {
        if (in_fcorridor(guard, guard.mx, guard.my)
            || cansee(guard.mx, guard.my))
            await pline(`${noit_Monnam(guard)} whispers an incantation.`);
        else
            await You_hear('a distant chant.');
        if (movedgold)
            await pline('A mysterious force moves the gold into the vault.');
        if (fixed)
            await pline_The("damaged vault's walls are magically restored!");
    }
}

// src/vault.c:734 gd_mv_monaway()
async function gd_mv_monaway(guard, nx, ny) {
    const mon = m_at(nx, ny);
    if (mon && mon !== guard) {
        if (!Deaf())
            await verbalize('Out of my way, scum!');
        if (!await rloc(mon, RLOC_ERR | RLOC_MSG) || m_at(nx, ny))
            await m_into_limbo(mon);
        recalc_block_point(nx, ny);
    }
}

// src/vault.c:752 gd_pick_corridor_gold()
async function gd_pick_corridor_gold(guard, goldx, goldy) {
    const guardx = guard.mx, guardy = guard.my;
    const under_u = game.u.ux === goldx && game.u.uy === goldy;
    const see_it = cansee(goldx, goldy);

    if (under_u) {
        const gold = g_at(goldx, goldy);
        if (!gold) {
            await impossible("vault guard: no gold at hero's feet?");
            return;
        }
        const gdelta = distu(guardx, guardy);
        if (gdelta > 2 && see_it) {
            let bestdelta = gdelta;
            let bestcc = { x: guardx, y: guardy };
            let tryct = 9;
            do {
                const newcc = {};
                if (enexto(newcc, goldx, goldy, guard.data)) {
                    const newdelta = distu(newcc.x, newcc.y);
                    if (newdelta < bestdelta
                        || (newdelta === bestdelta
                            && dist2(newcc.x, newcc.y, guardx, guardy)
                                < dist2(bestcc.x, bestcc.y, guardx, guardy))) {
                        bestdelta = newdelta;
                        bestcc = newcc;
                    }
                }
            } while (--tryct >= 0);
            if (bestdelta < gdelta) {
                remove_monster(guardx, guardy);
                newsym(guardx, guardy);
                place_monster(guard, bestcc.x, bestcc.y);
                newsym(guard.mx, guard.my);
            }
        }
        obj_extract_self(gold);
        add_to_minv(guard, gold);
        newsym(goldx, goldy);
    } else if (goldx === guardx && goldy === guardy) {
        await mpickgold(guard);
    } else {
        await gd_mv_monaway(guard, goldx, goldy);
        if (see_it) {
            remove_monster(guard.mx, guard.my);
            newsym(guard.mx, guard.my);
            place_monster(guard, goldx, goldy);
        }
        await mpickgold(guard);
    }

    if (see_it)
        await pline(`${Some_Monnam(guard)}${
            guard.mpeaceful && guard.mextra.egd.warncnt > 5
                ? ' calms down and' : ''} picks up the gold${
            under_u ? ' from beneath you' : ''}.`);

    if (guard.mx !== guardx || guard.my !== guardy) {
        remove_monster(guard.mx, guard.my);
        newsym(guard.mx, guard.my);
        place_monster(guard, guardx, guardy);
        newsym(guardx, guardy);
    }
}

// src/vault.c gd_letknow(). Announce the hostile guard after it relocates.
async function gd_letknow(guard) {
    if (!cansee(guard.mx, guard.my) || !mon_visible(guard)) {
        await You_hear(`${m_carrying(guard, ONAMES.TIN_WHISTLE)
            ? "the shrill sound of a guard's whistle"
            : 'angry shouting'}.`);
    } else {
        const angryGuard = x_monnam(guard, ARTICLE_A, 'angry', 0, false);
        if (distmin(game.u.ux, game.u.uy, guard.mx, guard.my) > 2)
            await You(`see ${angryGuard} approaching.`);
        else
            await You(`are confronted by ${angryGuard}.`);
    }
}

async function gd_move_cleanup(guard, semi_dead, disappear_msg_seen) {
    const x = guard.mx, y = guard.my;
    const see_guard = canspotmon(guard);
    const guard_name = noit_mon_nam(guard);
    parkguard(guard);
    await wallify_vault(guard);
    await restfakecorr(guard);
    if (!semi_dead && (in_fcorridor(guard, game.u.ux, game.u.uy)
                       || cansee(x, y))) {
        if (!disappear_msg_seen && see_guard) {
            await pline(`Suddenly, ${guard_name} disappears.`);
            await more();
        }
        return 1;
    }
    return -2;
}

// src/vault.c:175 grddead() — a guard is done for: clear his corridor now,
// or park him at <0,0> until the corridor can go.
export async function grddead(grd) {
    let dispose = await clear_fcorr(grd, true);

    if (!dispose) {
        /* destroy guard's gold; drop any other inventory */
        await relobj(grd, 0, false);
        grd.mhp = 0;
        parkguard(grd);
        dispose = await clear_fcorr(grd, true);
    }
    if (dispose)
        grd.isgd = 0; /* for dmonsfree() */
    return dispose;
}

// src/vault.c:281 find_guard_dest().  The perimeter scan and its early
// radius skip determine which vault wall the guard enters through.
function find_guard_dest(guard) {
    const u = game.u;
    for (let dd = 2; dd < ROWNO || dd < COLNO; dd++) {
        let increaseRadius = false;
        for (let y = u.uy - dd; y <= u.uy + dd && !increaseRadius; y++) {
            if (y < 0 || y >= ROWNO)
                continue;
            for (let x = u.ux - dd; x <= u.ux + dd; x++) {
                if (y !== u.uy - dd && y !== u.uy + dd
                    && x !== u.ux - dd)
                    x = u.ux + dd;
                if (x < 1 || x >= COLNO)
                    continue;
                if (guard && x === guard.mx && y === guard.my)
                    continue;
                if (game.level.at(x, y)?.typ === CORR) {
                    const lx = x < u.ux ? x + 1 : x > u.ux ? x - 1 : x;
                    const ly = y < u.uy ? y + 1 : y > u.uy ? y - 1 : y;
                    const typ = game.level.at(lx, ly)?.typ;
                    if (typ !== STONE && typ !== CORR) {
                        increaseRadius = true;
                        break;
                    }
                    return { x, y };
                }
            }
        }
    }
    return null;
}

function guard_entry(goal) {
    const u = game.u;
    let x = u.ux, y = u.uy;
    if (game.level.at(x, y)?.typ !== ROOM) {
        const candidates = [
            [x + 1, y], [x, y + 1], [x - 1, y], [x, y - 1],
            [x + 1, y + 1], [x - 1, y - 1],
            [x + 1, y - 1], [x - 1, y + 1],
        ];
        const room = candidates.find(([xx, yy]) =>
            game.level.at(xx, yy)?.typ === ROOM);
        if (room)
            [x, y] = room;
    }
    while (game.level.at(x, y)?.typ === ROOM) {
        const dx = Math.sign(goal.x - x), dy = Math.sign(goal.y - y);
        if (Math.abs(goal.x - x) >= Math.abs(goal.y - y))
            x += dx;
        else
            y += dy;
    }
    if (x === u.ux && y === u.uy) {
        if ([HWALL, DOOR].includes(game.level.at(x + 1, y)?.typ)) x++;
        else if ([HWALL, DOOR].includes(game.level.at(x - 1, y)?.typ)) x--;
        else if ([VWALL, DOOR].includes(game.level.at(x, y + 1)?.typ)) y++;
        else if ([VWALL, DOOR].includes(game.level.at(x, y - 1)?.typ)) y--;
        else return null;
    }
    return { x, y };
}

function finish_guard_corridor(guard, roomidx, goal, entry) {
    const egd = guard.mextra.egd;
    const loc = game.level.at(entry.x, entry.y);
    egd.gdx = goal.x;
    egd.gdy = goal.y;
    egd.fcbeg = 0;
    egd.fakecorr = [{ fx: entry.x, fy: entry.y,
                      ftyp: loc.typ, flags: loc.flags || 0,
                      doormask: loc.doormask || 0 }];
    egd.fcend = 1;
    egd.warncnt = 1;
    egd.vroom = roomidx;
    loc.typ = DOOR;
    loc.doormask = D_NODOOR;
    unblock_point(entry.x, entry.y);
}

/* src/vault.c:887 gd_move().  A peaceful guard cuts one temporary square at
   a time toward the nearest ordinary corridor, waits for the hero to follow,
   and restores the tunnel behind them. */
export async function gd_move(guard) {
    const u = game.u;
    const egd = guard.mextra?.egd;
    if (!egd)
        return -1;
    if (!on_level(egd.gdlevel, u.uz))
        return -1;

    const semi_dead = (guard.mhp || 0) < 1;
    if (semi_dead || !guard.mx || egd.gddone) {
        egd.gddone = 1;
        return gd_move_cleanup(guard, semi_dead, false);
    }

    const u_in_vault = !!vault_occupied(u.urooms);
    const grd_in_vault = !!in_rooms(guard.mx, guard.my, VAULT);
    if (!u_in_vault && !grd_in_vault)
        await wallify_vault(guard);
    if (!guard.mpeaceful) {
        if (!u_in_vault
            && (grd_in_vault
                || (in_fcorridor(guard, guard.mx, guard.my)
                    && !in_fcorridor(guard, u.ux, u.uy)))) {
            const { rloc } = await import('./teleport.js');
            await rloc(guard, RLOC_MSG);
            await wallify_vault(guard);
            if (!in_fcorridor(guard, guard.mx, guard.my))
                await clear_fcorr(guard, true);
            await gd_letknow(guard);
        } else if (!in_fcorridor(guard, guard.mx, guard.my)) {
            await clear_fcorr(guard, true);
        }
        return -1;
    }
    if (Math.abs(egd.ogx - guard.mx) > 1
        || Math.abs(egd.ogy - guard.my) > 1)
        return -1;

    const umoney = money_cnt(game.invent);
    const u_carry_gold = umoney > 0 || hidden_gold(game.invent, true) > 0;
    if (egd.fcend === 1) {
        if (u_in_vault
            && (u_carry_gold || distmin(u.ux, u.uy, guard.mx, guard.my) > 1)) {
            if (egd.warncnt === 3 && !Deaf()) {
                const request = `${u_carry_gold
                    ? (!umoney ? 'drop that hidden gold and '
                               : 'drop that gold and ')
                    : ''}follow me!`;
                if (egd.dropgoldcnt || !u_carry_gold)
                    await verbalize(`I repeat, ${request}`);
                else
                    await verbalize(`${request[0].toUpperCase()}${request.slice(1)}`);
                if (u_carry_gold)
                    egd.dropgoldcnt++;
            }
            if (egd.warncnt === 7) {
                const x = guard.mx, y = guard.my;
                if (!Deaf())
                    await verbalize("You've been warned, knave!");
                guard.mpeaceful = 0;
                await mnexto(guard, 0);
                const entry = game.level.at(x, y);
                entry.typ = egd.fakecorr[0].ftyp;
                entry.flags = egd.fakecorr[0].flags || 0;
                entry.doormask = egd.fakecorr[0].doormask || 0;
                recalc_block_point(x, y);
                const engraving = engr_at(x, y);
                if (engraving)
                    del_engr(engraving);
                newsym(x, y);
                return -1;
            }
            if (!is_fainted() && (game.multi || 0) >= 0)
                egd.warncnt++;
            return 0;
        }
        if (!u_in_vault) {
            if (u_carry_gold) {
                guard.mpeaceful = 0;
                return -1;
            }
            if (!Deaf())
                await verbalize('Well, begone.');
            egd.gddone = 1;
            return gd_move_cleanup(guard, semi_dead, false);
        }
    }

    if (egd.fcend > 1 && u_carry_gold
        && (in_fcorridor(guard, u.ux, u.uy) || u_in_vault)) {
        if (egd.warncnt < 6) {
            egd.warncnt = 6;
            if (Deaf()) {
                if (!Blind())
                    await pline(`${noit_Monnam(guard)} holds out ${
                        noit_mhis(guard)} palm demandingly!`);
            } else {
                await verbalize('Drop all your gold, scoundrel!');
            }
            return 0;
        }
        if (Deaf()) {
            if (!Blind())
                await pline(`${noit_Monnam(guard)} rubs ${
                    noit_mhis(guard)} hands with enraged delight!`);
        } else {
            await verbalize('So be it, rogue!');
        }
        guard.mpeaceful = 0;
        return -1;
    }

    for (let i = egd.fcbeg; i < egd.fcend; i++) {
        const fc = egd.fakecorr[i];
        if (g_at(fc.fx, fc.fy)) {
            await gd_pick_corridor_gold(guard, fc.fx, fc.fy);
            if (!guard.mpeaceful)
                return -1;
            egd.warncnt = 5;
            return 0;
        }
    }

    if (distmin(u.ux, u.uy, guard.mx, guard.my) > 1 || egd.gddone) {
        if (!egd.gddone && !rn2(10) && !Deaf() && !u.uswallow
            && !(u.ustuck && !sticks(game.youmonst.data)))
            await verbalize('Move along!');
        await restfakecorr(guard);
        return 0;
    }

    const x = guard.mx, y = guard.my;
    let nx, ny, typ, loc, newspot = false;

    if (!u_in_vault) {
        let exit = null;
        outer:
        for (let xx = x - 1; xx <= x + 1; xx++) {
            for (let yy = y - 1; yy <= y + 1; yy++) {
                if ((xx !== x && yy !== y) || (xx === x && yy === y)
                    || !isok(xx, yy))
                    continue;
                const candidate = game.level.at(xx, yy);
                if (IS_STWALL(candidate.typ) || IS_POOL(candidate.typ))
                    continue;
                if (in_fcorridor(guard, xx, yy))
                    continue;
                if (in_rooms(xx, yy, VAULT))
                    continue;
                exit = { x: xx, y: yy, loc: candidate };
                break outer;
            }
        }
        if (exit) {
            nx = exit.x;
            ny = exit.y;
            loc = exit.loc;
            typ = loc.typ;
            egd.gddone = 1;
            if (!ACCESSIBLE(typ)) {
                loc.typ = typ === SCORR ? CORR : DOOR;
                if (loc.typ === DOOR)
                    loc.doormask = D_NODOOR;
                else
                    loc.flags = 0;
                newspot = true;
            }
        }
    }

    if (nx === undefined) {
        let ggx = egd.gdx, ggy = egd.gdy;
        for (;;) {
            nx = x;
            ny = y;
            let dx = Math.sign(ggx - x);
            let dy = Math.sign(ggy - y);
            if (Math.abs(ggx - x) >= Math.abs(ggy - y))
                nx += dx;
            else
                ny += dy;

            let openedDoor = false;
            while ((typ = (loc = game.level.at(nx, ny)).typ) !== STONE) {
                const ex = nx + nx - x;
                const ey = ny + ny - y;
                if (isok(ex, ey) && IS_ROOM(game.level.at(ex, ey).typ)) {
                    loc.typ = DOOR;
                    loc.doormask = D_NODOOR;
                    openedDoor = true;
                    break;
                }
                if (dy && nx !== x) {
                    nx = x;
                    ny = y + dy;
                    continue;
                }
                if (dx && ny !== y) {
                    ny = y;
                    nx = x + dx;
                    dy = 0;
                    continue;
                }
                if (IS_ROOM(typ)) {
                    loc.typ = DOOR;
                    loc.doormask = D_NODOOR;
                    openedDoor = true;
                }
                break;
            }
            if (!openedDoor) {
                loc.typ = CORR;
                loc.flags = loc.doormask = loc.wall_info = loc.altarmask = 0;
                loc.looted = loc.icedpool = loc.drawbridgemask = loc.ladder = 0;
                loc.emptygrave = 0;
            }
            newspot = true;

            if ((nx !== ggx || ny !== ggy)
                || (guard.mx !== ggx || guard.my !== ggy))
                break;
            const newgoal = find_guard_dest(guard);
            if (!newgoal || (newgoal.x === ggx && newgoal.y === ggy)) {
                await pline(`${noit_mon_nam(guard)}, confused, disappears.`);
                return gd_move_cleanup(guard, semi_dead, true);
            }
            egd.gdx = ggx = newgoal.x;
            egd.gdy = ggy = newgoal.y;
        }

        if ((nx !== egd.gdx || ny !== egd.gdy)
            || (guard.mx !== egd.gdx || guard.my !== egd.gdy)) {
            egd.fakecorr[egd.fcend++] = {
                fx: nx, fy: ny, ftyp: typ, flags: loc.flags || 0,
                doormask: loc.doormask || 0,
            };
        }
    }

    if (newspot) {
        unblock_point(nx, ny);
        if (cansee(nx, ny))
            newsym(nx, ny);
    }

    await gd_mv_monaway(guard, nx, ny);
    if (egd.gddone)
        return gd_move_cleanup(guard, semi_dead, false);

    egd.ogx = guard.mx;
    egd.ogy = guard.my;
    remove_monster(guard.mx, guard.my);
    place_monster(guard, nx, ny);
    if (newspot && g_at(nx, ny)) {
        await mpickgold(guard);
        if (canspotmon(guard))
            await pline(`${Monnam(guard)} picks up some gold.`);
    } else {
        newsym(guard.mx, guard.my);
    }
    await restfakecorr(guard);
    return 1;
}

// src/vault.c:1205 paygd() — routine when dying or quitting with a vault
// guard around. The C's "goto remove_guard" skips the coin transfer.
export async function paygd(silently) {
    const grd = findgd();
    const umoney = money_cnt(game.invent || []);
    let gdx, gdy;
    let remove_guard = false;

    if (!umoney || !grd)
        return;

    if (game.u.uinvault) {
        if (!silently)
            await Your(`${umoney} ${currency(umoney)} goes into the Magic Memory Vault.`);
        gdx = game.u.ux;
        gdy = game.u.uy;
    } else if (grd.mpeaceful) { /* peaceful guard has no "right" to your gold */
        remove_guard = true;
    } else {
        await mnexto(grd, RLOC_NOMSG);
        if (!silently)
            await pline(`${Monnam(grd)} remits your gold to the vault.`);
        const egd = grd.mextra?.egd;
        gdx = game.level.rooms[egd.vroom].lx + rn2(2);
        gdy = game.level.rooms[egd.vroom].ly + rn2(2);
        const buf = `To Croesus: here's the gold recovered from ${game.plname} the ${
            pmname(game.mons[game.u.umonster], game.flags?.female ? FEMALE : MALE)}.`;
        make_grave(gdx, gdy, buf);
    }
    if (!remove_guard) {
        for (const coins of [...(game.invent || [])]) {
            if (coins.oclass === OCLASSES.COIN_CLASS) {
                freeinv(coins);
                place_object(coins, gdx, gdy);
                stackobj(coins);
            }
        }
    }
 /* remove_guard: */
    await mongone(grd);
}

// src/vault.c:317 invault(), through the initial interrogation and doorway.
export async function invault() {
    const u = game.u;
    let vaultroom = vault_occupied(u.urooms);
    if (!vaultroom) {
        u.uinvault = 0;
        return;
    }

    const deaths = game.mvitals?.[PMNAMES.PM_GUARD]?.died || 0;
    if (deaths < 2
        || (deaths < 50 && !rn2(deaths * deaths)))
        u.uinvault = (u.uinvault | 0) + 1;
    if ((u.uinvault | 0) < VAULT_GUARD_TIME
        || u.uinvault % (VAULT_GUARD_TIME / 2) !== 0)
        return;
    if (findgd())
        return;

    const goal = find_guard_dest(null);
    const entry = goal && guard_entry(goal);
    if (!entry)
        return;

    const roomidx = vaultroom - ROOMOFFSET;
    const guard = await makemon(game.mons[PMNAMES.PM_GUARD], entry.x, entry.y,
                          MM_EGD | MM_NOMSG);
    if (!guard)
        return;
    guard.isgd = 1;
    guard.mpeaceful = 1;
    set_malign(guard);
    Object.assign(guard.mextra.egd, {
        gddone: 0, ogx: entry.x, ogy: entry.y,
        gdlevel: { ...u.uz }, vroom: roomidx, warncnt: 0,
        dropgoldcnt: 0,
    });
    u.uinvault++;

    await reset_faint();
    /* if there are any boulders in the guard's way, destroy them;
       perhaps the guard knows a touch equivalent of force bolt;
       otherwise the hero wouldn't be able to push one to follow the
       guard out of the vault because that guard would be in its way */
    let otmp;
    if ((otmp = sobj_at(ONAMES.BOULDER, guard.mx, guard.my)) != null) {
        const bname = simpleonames(otmp);
        let bcnt = 0;

        do {
            ++bcnt;
            await fracture_rock(otmp);
            otmp = sobj_at(ONAMES.BOULDER, guard.mx, guard.my);
        } while (otmp);
        /* You_hear() will handle Deaf/!Deaf */
        const func = !Blind() ? You_see : You_hear;
        await func(`${(bcnt === 1) ? an(bname) : makeplural(bname)} shatter.`);
    }

    const spotted = canspotmon(guard);
    if (spotted) {
        await pline(`Suddenly one of the Vault's ${
            makeplural(pmname(guard.data, guard.female ? 1 : 0))} enters!`);
        newsym(guard.mx, guard.my);
    } else {
        await pline('Someone else has entered the Vault.');
        map_invisible(guard.mx, guard.my);
    }

    if (u.uswallow) {
        if (!Deaf())
            await verbalize("What's going on here?");
        if (!spotted)
            await pline_The('other presence vanishes.');
        await mongone(guard);
        return;
    }
    if (M_AP_TYPE(game.youmonst) === M_AP_OBJECT || u.uundetected) {
        if (M_AP_TYPE(game.youmonst) === M_AP_OBJECT
            && game.youmonst.mappearance !== ONAMES.GOLD_PIECE && !Deaf())
            await verbalize(`Hey!  Who left that ${mimic_obj_name(game.youmonst)} in here?`);
        await pline(`Puzzled, ${mhe(guard)} turns around and leaves.`);
        await mongone(guard);
        return;
    }
    if (u.intrinsic?.HStrangled || is_silent(game.youmonst.data) || game.multi < 0) {
        if (Deaf())
            await pline(`${noit_Monnam(guard)} huffs and turns to leave.`);
        else
            await verbalize("I'll be back when you're ready to speak to me!");
        await mongone(guard);
        return;
    }

    const { stop_occupation } = await import('./allmain.js');
    await stop_occupation();
    if ((game.multi | 0) > 0) {
        nomul(0);
        await unmul(null);
    }

    let buf = '';
    for (let tries = 5; !buf && tries > 0; tries--)
        buf = mungspaces(await getlin(Deaf()
            ? 'You are required to supply your name. -'
            : '"Hello stranger, who are you?" -'));

    if (u.ualign?.type === A_LAWFUL
        && !buf.toLowerCase().startsWith((game.plname || '').toLowerCase()))
        adjalign(-1);

    const identity = buf.toLowerCase();
    if (identity === 'croesus' || identity === 'kroisos'
        || identity === 'creosote') {
        if (!(game.mvitals?.[PMNAMES.PM_CROESUS]?.died || 0)) {
            if (Deaf()) {
                if (!Blind())
                    await pline(`${noit_Monnam(guard)} waves goodbye.`);
            } else {
                await verbalize('Oh, yes, of course.  Sorry to have disturbed you.');
            }
            await mongone(guard);
        } else {
            await setmangry(guard, false);
            if (Deaf()) {
                if (!Blind())
                    await pline(`${noit_Monnam(guard)} mouths something and looks very angry!`);
            } else {
                await verbalize('Back from the dead, are you?  I\'ll remedy that!');
            }
            /* don't want guard to waste next turn wielding a weapon */
            if (!MON_WEP(guard)) {
                guard.weapon_check = NEED_HTH_WEAPON;
                await mon_wield_item(guard);
            }
        }
        return;
    }

    if (Deaf()) {
        await pline(`${noit_Monnam(guard)} doesn't ${
            Blind() ? '' : 'appear to '}recognize you.`);
    } else {
        await verbalize('I don\'t know you.');
    }
    const umoney = money_cnt(game.invent);
    const concealed = hidden_gold(game.invent, true);
    if (!umoney && !concealed) {
        if (Deaf()) {
            await pline(`${noit_Monnam(guard)} stomps${Blind() ? '' : ' and beckons'}.`);
        } else {
            await verbalize('Please follow me.');
        }
    } else {
        if (!umoney) {
            if (Deaf()) {
                if (!Blind())
                    await pline(`${noit_Monnam(guard)} glares at you${
                        game.invent.length ? 'r stuff' : ''}.`);
            } else {
                await verbalize('You have hidden gold.');
            }
        }
        if (Deaf()) {
            if (!Blind())
                await pline(`${noit_Monnam(guard)} holds out ${
                    noit_mhis(guard)} palm and beckons with ${noit_mhis(guard)} other hand.`);
        } else {
            await verbalize('Most likely all your gold was stolen from this vault.');
            await verbalize('Please drop that gold and follow me.');
        }
        guard.mextra.egd.dropgoldcnt++;
    }
    finish_guard_corridor(guard, roomidx, goal, entry);
}

// src/vault.c:237 vault_summon_gd(); a cursed whistle blown in a vault
// brings the guard early
export function vault_summon_gd() {
    if (vault_occupied(game.u.urooms || '') && !findgd())
        game.u.uinvault = (VAULT_GUARD_TIME - 1);
}

// src/vault.c:1272 gd_sound(); suppress patrol sounds while a guard owns a vault.
export function gd_sound() {
    return !(vault_occupied(game.u.urooms) || findgd());
}
