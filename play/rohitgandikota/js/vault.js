// vault.js: vault occupancy and the guard's arrival.
// C ref: src/vault.c

import { game } from './gstate.js';
import { in_rooms, nomul, unmul } from './hack.js';
import {
    makemon, set_malign, place_monster, remove_monster, MM_EGD, MM_NOMSG,
} from './makemon.js';
import { PMNAMES } from './monst_data.js';
import { hidden_gold, money_cnt, obj_extract_self, sobj_at,
         stackobj } from './invent.js';
import { canspotmon, map_background, mon_visible, more, newsym,
         pline } from './display.js';
import { getlin } from './cmd.js';
import { mungspaces } from './hacklib.js';
import { Monnam, noit_Monnam, noit_mon_nam, pmname,
         x_monnam } from './do_name.js';
import { makeplural } from './objnam.js';
import { adjalign } from './attrib.js';
import { block_point, cansee, couldsee, recalc_block_point,
         unblock_point } from './vision.js';
import { rn2 } from './rng.js';
import { distmin, isok } from './hacklib.js';
import { is_fainted } from './eat.js';
import { ONAMES } from './objects_data.js';
import { m_carrying, mnexto, mongone } from './mon.js';
import { del_engr, engr_at } from './engrave.js';
import { place_object } from './mkobj.js';
import { You, You_hear, pline_The } from './pline.js';
import {
    A_LAWFUL, COLNO, ROWNO, ROOMOFFSET, VAULT, VAULT_GUARD_TIME,
    ROOM, STONE, CORR, SCORR, HWALL, VWALL, DOOR, D_NODOOR, IS_WALL,
    IS_STWALL, IS_POOL, IS_ROOM, ACCESSIBLE, ARTICLE_A, BLCORNER,
    BRCORNER, RLOC_MSG, TLCORNER, TRCORNER,
} from './const.js';


export function vault_occupied(urooms) {
    for (const ch of urooms || '') {
        const roomno = ch.charCodeAt(0);
        if (game.level?.rooms?.[roomno - ROOMOFFSET]?.rtype === VAULT)
            return roomno;
    }
    return 0;
}

export function findgd() {
    return (game.level?.monsters || []).find(
        mon => mon.isgd && mon.mhp > 0) || null;
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
    while (egd.fcbeg < egd.fcend) {
        const fc = egd.fakecorr[egd.fcbeg];
        if ((game.u.ux === fc.fx && game.u.uy === fc.fy && guard.mhp > 0)
            || (!forceshow && couldsee(fc.fx, fc.fy)))
            return false;

        const occupant = game.level.monAt?.get(`${fc.fx},${fc.fy}`);
        if (occupant) {
            if (occupant.isgd)
                return false;
            const { rloc } = await import('./teleport.js');
            if (!await rloc(occupant))
                return false;
        }

        const loc = game.level.at(fc.fx, fc.fy);
        loc.typ = fc.ftyp;
        loc.flags = fc.flags || 0;
        if (fc.doormask !== undefined)
            loc.doormask = fc.doormask;
        game.level.traps = (game.level.traps || [])
            .filter(t => t.tx !== fc.fx || t.ty !== fc.fy);
        const engr = (game.engravings || []).find(
            e => e.ex === fc.fx && e.ey === fc.fy);
        if (engr) {
            const { del_engr } = await import('./engrave.js');
            del_engr(engr);
        }
        map_background(fc.fx, fc.fy, true);
        recalc_block_point(fc.fx, fc.fy);
        game.vision_full_recalc = 1;
        egd.fcbeg++;
    }
    return true;
}

function dispose_guard(guard) {
    if (guard.mx || guard.my)
        remove_monster(guard.mx, guard.my);
    guard.isgd = 0;
    guard.mhp = 0;
    guard.minvent = [];
}

async function restfakecorr(guard) {
    if (await clear_fcorr(guard, false))
        dispose_guard(guard);
}

function parkguard(guard) {
    if (guard.mx || guard.my) {
        remove_monster(guard.mx, guard.my);
        newsym(guard.mx, guard.my);
    }
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
                    (game.unported ||= new Set()).add('vault:wallify_limbo');
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
            if (egd.warncnt === 3) {
                const request = `${u_carry_gold
                    ? (!umoney ? 'drop that hidden gold and '
                               : 'drop that gold and ')
                    : ''}follow me!`;
                if (egd.dropgoldcnt || !u_carry_gold)
                    await pline(`"I repeat, ${request}"`);
                else
                    await pline(`"${request[0].toUpperCase()}${request.slice(1)}"`);
                if (u_carry_gold)
                    egd.dropgoldcnt++;
            }
            if (egd.warncnt === 7) {
                const x = guard.mx, y = guard.my;
                await pline('"You\'ve been warned, knave!"');
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
            await pline('"Well, begone."');
            egd.gddone = 1;
            return gd_move_cleanup(guard, semi_dead, false);
        }
    }

    if (egd.fcend > 1 && u_carry_gold
        && (in_fcorridor(guard, u.ux, u.uy) || u_in_vault)) {
        if (egd.warncnt < 6) {
            egd.warncnt = 6;
            await pline('"Drop all your gold, scoundrel!"');
            return 0;
        }
        await pline('"So be it, rogue!"');
        guard.mpeaceful = 0;
        return -1;
    }

    for (let i = egd.fcbeg; i < egd.fcend; i++) {
        const fc = egd.fakecorr[i];
        if (gold_at(fc.fx, fc.fy)) {
            /* Gold in the temporary tunnel is uncommon.  Keep the guard in
               place and ask again rather than walking over it. */
            egd.warncnt = 5;
            return 0;
        }
    }

    if (distmin(u.ux, u.uy, guard.mx, guard.my) > 1 || egd.gddone) {
        if (!egd.gddone && !rn2(10) && !u.uswallow)
            await pline('"Move along!"');
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

            while ((typ = (loc = game.level.at(nx, ny)).typ) !== STONE) {
                const ex = nx + nx - x;
                const ey = ny + ny - y;
                if (isok(ex, ey) && IS_ROOM(game.level.at(ex, ey).typ)) {
                    loc.typ = DOOR;
                    loc.doormask = D_NODOOR;
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
                }
                break;
            }
            if (loc.typ === STONE) {
                loc.typ = CORR;
                loc.flags = 0;
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

    if (egd.gddone)
        return gd_move_cleanup(guard, semi_dead, false);

    egd.ogx = guard.mx;
    egd.ogy = guard.my;
    remove_monster(guard.mx, guard.my);
    place_monster(guard, nx, ny);
    newsym(guard.mx, guard.my);
    await restfakecorr(guard);
    return 1;
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
    if (deaths < 2)
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
    const guard = makemon(game.mons[PMNAMES.PM_GUARD], entry.x, entry.y,
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

    if (sobj_at(ONAMES.BOULDER, guard.mx, guard.my))
        (game.unported ||= new Set()).add('vault:guard_entry_boulder');

    if (canspotmon(guard)) {
        await pline(`Suddenly one of the Vault's ${
            makeplural(pmname(guard.data, guard.female ? 1 : 0))} enters!`);
        newsym(guard.mx, guard.my);
    } else {
        await pline('Someone else has entered the Vault.');
    }

    const { stop_occupation } = await import('./allmain.js');
    await stop_occupation();
    if ((game.multi | 0) > 0) {
        nomul(0);
        await unmul(null);
    }

    let buf = '';
    for (let tries = 5; !buf && tries > 0; tries--)
        buf = mungspaces(await getlin('"Hello stranger, who are you?" -'));

    if (u.ualign?.type === A_LAWFUL
        && !buf.toLowerCase().startsWith((game.plname || '').toLowerCase()))
        adjalign(-1);

    const identity = buf.toLowerCase();
    if (identity === 'croesus' || identity === 'kroisos'
        || identity === 'creosote') {
        if (!(game.mvitals?.[PMNAMES.PM_CROESUS]?.died || 0)) {
            await pline('"Oh, yes, of course.  Sorry to have disturbed you."');
            mongone(guard);
        } else {
            guard.mpeaceful = 0;
            await pline('"Back from the dead, are you?  I\'ll remedy that!"');
        }
        return;
    }

    await pline('"I don\'t know you."');
    const umoney = money_cnt(game.invent);
    const concealed = hidden_gold(game.invent, true);
    if (!umoney && !concealed) {
        await pline('"Please follow me."');
    } else {
        if (!umoney)
            await pline('"You have hidden gold."');
        await pline('"Most likely all your gold was stolen from this vault."');
        await pline('"Please drop that gold and follow me."');
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
