// vault.js — Vault guard escort corridor handling.
// C refs: src/vault.c:find_guard_dest(), gd_move().

import { game } from './gstate.js';
import { newsym } from './display.js';
import { cansee, couldsee, vision_reset } from './vision.js';
import {
    ACCESSIBLE, COLNO, CORR, DOOR, D_NODOOR, ROWNO, SCORR, STONE, ROOM,
    BLCORNER, BRCORNER, HWALL, TLCORNER, TRCORNER, VAULT, VWALL,
    IS_POOL, IS_ROOM, IS_STWALL, isok,
} from './const.js';

function inVaultFakecorr(guard, x, y) {
    const egd = guard?.egd || {};
    const cells = egd.fakecorr || [];
    const fcbeg = egd.fcbeg ?? 0;
    const fcend = egd.fcend ?? cells.length;
    for (let fci = fcbeg; fci < fcend; fci++) {
        const cell = cells[fci];
        if ((cell?.fx ?? cell?.x) === x && (cell?.fy ?? cell?.y) === y) return true;
    }
    return false;
}

export function vaultGuardDestination(guard = null) {
    radius:
    for (let dd = 2; dd < ROWNO || dd < COLNO; dd++) {
        for (let y = (game.u?.uy || 0) - dd; y <= (game.u?.uy || 0) + dd; y++) {
            if (y < 0 || y > ROWNO - 1) continue;
            for (let x = (game.u?.ux || 0) - dd; x <= (game.u?.ux || 0) + dd; x++) {
                if (y !== (game.u?.uy || 0) - dd && y !== (game.u?.uy || 0) + dd && x !== (game.u?.ux || 0) - dd)
                    x = (game.u?.ux || 0) + dd;
                if (x < 1 || x > COLNO - 1) continue;
                if (guard && ((x === guard.mx && y === guard.my) || inVaultFakecorr(guard, x, y))) continue;
                if (game.level?.at(x, y)?.typ !== CORR) continue;

                const lx = x < (game.u?.ux || 0) ? x + 1 : x > (game.u?.ux || 0) ? x - 1 : x;
                const ly = y < (game.u?.uy || 0) ? y + 1 : y > (game.u?.uy || 0) ? y - 1 : y;
                const typ = game.level?.at(lx, ly)?.typ;
                if (typ !== STONE && typ !== CORR) continue radius;
                return { x, y };
            }
        }
    }
    return null;
}

function wallTypForVaultBoundary(room, x, y) {
    const lox = room.lx - 1, hix = room.hx + 1;
    const loy = room.ly - 1, hiy = room.hy + 1;
    if (x === lox && y === loy) return TLCORNER;
    if (x === hix && y === loy) return TRCORNER;
    if (x === lox && y === hiy) return BLCORNER;
    if (x === hix && y === hiy) return BRCORNER;
    return x === lox || x === hix ? VWALL : HWALL;
}

function vaultGuardEgd(guard) {
    guard.egd ??= {};
    const egd = guard.egd;
    egd.fcbeg ??= 0;
    egd.fakecorr ??= [];
    egd.fcend ??= egd.fakecorr.length;

    const room = (game.level?.rooms || []).find(candidate =>
        candidate.roomnoidx === egd.vroom || candidate.rtype === VAULT);
    if (!egd.fcend && guard.mx && room) {
        const loc = game.level?.at(guard.mx, guard.my);
        const ftyp = loc && IS_STWALL(loc.typ) ? loc.typ : wallTypForVaultBoundary(room, guard.mx, guard.my);
        egd.fakecorr[0] = {
            fx: guard.mx,
            fy: guard.my,
            x: guard.mx,
            y: guard.my,
            ftyp,
            typ: ftyp,
            flags: loc?.flags || 0,
        };
        egd.fcend = 1;
    }

    if (egd.gdx == null || egd.gdy == null) {
        const target = vaultGuardDestination(guard);
        if (target) {
            egd.gdx = target.x;
            egd.gdy = target.y;
        }
    }
    egd.ogx ??= guard.mx || 0;
    egd.ogy ??= guard.my || 0;
    return egd;
}

export function prepareVaultGuardEscort(guard) {
    if (!guard) return;
    guard._vault_escort_active = 1;
    vaultGuardEgd(guard);
}

function vaultGuardNextStep(guard) {
    prepareVaultGuardEscort(guard);
    const egd = vaultGuardEgd(guard);
    if (egd.gdx == null || egd.gdy == null || !guard.mx) return null;

    let nx = guard.mx;
    let ny = guard.my;
    const dx = egd.gdx > guard.mx ? 1 : egd.gdx < guard.mx ? -1 : 0;
    const dy = egd.gdy > guard.my ? 1 : egd.gdy < guard.my ? -1 : 0;
    if (Math.abs(egd.gdx - guard.mx) >= Math.abs(egd.gdy - guard.my)) nx += dx;
    else ny += dy;
    return { x: nx, y: ny };
}

function wallifyVault(guard) {
    const egd = vaultGuardEgd(guard);
    if (guard._vault_walls_restored) return;
    const room = (game.level?.rooms || []).find(candidate =>
        candidate.roomnoidx === egd.vroom || candidate.rtype === VAULT);
    if (!room) return;

    const lox = room.lx - 1, hix = room.hx + 1;
    const loy = room.ly - 1, hiy = room.hy + 1;
    for (let x = lox; x <= hix; x++) {
        for (let y = loy; y <= hiy; y++) {
            if (x !== lox && x !== hix && y !== loy && y !== hiy) continue;
            if (inVaultFakecorr(guard, x, y)) continue;
            const loc = game.level?.at(x, y);
            if (!loc || loc.typ === STONE) continue;
            loc.typ = wallTypForVaultBoundary(room, x, y);
            loc.lastseentyp = loc.typ;
            loc.lastseendoormask = loc.doormask;
            loc.lastseenwall_info = loc.wall_info;
            vision_reset();
            newsym(x, y);
        }
    }
    guard._vault_walls_restored = 1;
}

function clearFakecorr(guard, forceshow = false) {
    const egd = vaultGuardEgd(guard);
    while (egd.fcbeg < egd.fcend) {
        const cell = egd.fakecorr[egd.fcbeg];
        const x = cell.fx ?? cell.x, y = cell.fy ?? cell.y;
        if (egd.gddone && !inVaultFakecorr(guard, game.u?.ux || 0, game.u?.uy || 0))
            forceshow = true;
        if (guard.mx && game.u?.ux === x && game.u?.uy === y) return false;
        const loc = game.level?.at(x, y);
        if (!forceshow && couldsee(x, y)) return false;

        const mon = (game.level?.monsters || []).find(candidate =>
            candidate !== guard && candidate.mx === x && candidate.my === y);
        if (mon?.isgd) return false;
        if (mon) {
            mon.mx = 0;
            mon.my = 0;
        }

        if (loc) {
            loc.typ = cell.ftyp ?? cell.typ ?? STONE;
            loc.flags = cell.flags || 0;
            loc.lastseentyp = loc.typ;
            loc.remembered_glyph = null;
            vision_reset();
            newsym(x, y);
        }
        egd.fcbeg++;
    }
    return true;
}

export function restVaultFakecorr(guard, forceshow = false) {
    if (!guard?.isgd || !clearFakecorr(guard, forceshow)) return false;
    guard.isgd = false;
    game.level.monsters = (game.level?.monsters || []).filter(mon => mon !== guard);
    return true;
}

function vaultRoomForGuard(guard) {
    const egd = vaultGuardEgd(guard);
    return (game.level?.rooms || []).find(candidate =>
        candidate.roomnoidx === egd.vroom || candidate.rtype === VAULT);
}

function inRoom(room, x, y) {
    return !!room && x >= room.lx && x <= room.hx && y >= room.ly && y <= room.hy;
}

function pushFakecorr(guard, x, y, loc) {
    const egd = vaultGuardEgd(guard);
    egd.fakecorr[egd.fcend] = {
        fx: x,
        fy: y,
        x,
        y,
        ftyp: loc.typ,
        typ: loc.typ,
        flags: loc.flags || 0,
    };
    egd.fcend++;
}

function moveVaultGuard(guard, x, y) {
    const oldX = guard.mx, oldY = guard.my;
    guard.mx = x;
    guard.my = y;
    newsym(oldX, oldY);
    newsym(x, y);
    const egd = vaultGuardEgd(guard);
    egd.ogx = guard.mx;
    egd.ogy = guard.my;
}

function maybePickCorridorGold(guard) {
    const egd = vaultGuardEgd(guard);
    for (let fci = egd.fcbeg; fci < egd.fcend; fci++) {
        const cell = egd.fakecorr[fci];
        const x = cell.fx ?? cell.x, y = cell.fy ?? cell.y;
        const gold = (game.level?.objects || []).find(obj =>
            obj.ox === x && obj.oy === y && (obj.glyph === '$' || obj.cls === 'coin'));
        if (!gold) continue;
        game.level.objects = game.level.objects.filter(obj => obj !== gold);
        guard.minvent ??= [];
        guard.minvent.unshift(gold);
        egd.warncnt = 5;
        newsym(x, y);
        return true;
    }
    return false;
}

function finishVaultGuardEscort(guard, oldX = guard.mx, oldY = guard.my) {
    const oldLoc = game.level?.at(oldX, oldY);
    if (oldLoc) oldLoc.typ = CORR;
    guard.mx = 0;
    guard.my = 0;
    wallifyVault(guard);
    restVaultFakecorr(guard);
    newsym(oldX, oldY);
    if (cansee(oldX, oldY)) {
        game._pending_message = 'Suddenly, the guard disappears.';
        game._message_more = 1;
        game._process_time_with_more = 0;
        game._keep_pending_message = 1;
        game._command_mode = 'vaultGuardDisappearMore';
    }
    return true;
}

function stepGuardOutOfTheWay(guard, room) {
    for (let nx = guard.mx - 1; nx <= guard.mx + 1; nx++) {
        for (let ny = guard.my - 1; ny <= guard.my + 1; ny++) {
            if (nx !== guard.mx && ny !== guard.my) continue;
            if (nx === guard.mx && ny === guard.my) continue;
            if (!isok(nx, ny) || inVaultFakecorr(guard, nx, ny) || inRoom(room, nx, ny)) continue;
            const loc = game.level?.at(nx, ny);
            if (!loc || IS_STWALL(loc.typ) || IS_POOL(loc.typ)) continue;
            const oldX = guard.mx, oldY = guard.my;
            vaultGuardEgd(guard).gddone = 1;
            if (!ACCESSIBLE(loc.typ)) {
                pushFakecorr(guard, nx, ny, loc);
                loc.typ = loc.typ === SCORR ? CORR : DOOR;
                if (loc.typ === DOOR) loc.doormask = D_NODOOR;
                else loc.flags = 0;
                vision_reset();
                newsym(nx, ny);
            }
            return finishVaultGuardEscort(guard, oldX, oldY);
        }
    }
    return false;
}

export function advanceVaultGuard(guard, { requireAdjacent = true } = {}) {
    if (!guard?.isgd || !guard.mx) return false;
    const egd = vaultGuardEgd(guard);
    if (requireAdjacent
        && Math.max(Math.abs(guard.mx - (game.u?.ux || 0)), Math.abs(guard.my - (game.u?.uy || 0))) > 1)
        return false;
    if (maybePickCorridorGold(guard)) return false;

    const room = vaultRoomForGuard(guard);
    const uInVault = inRoom(room, game.u?.ux || 0, game.u?.uy || 0);
    const guardInVault = inRoom(room, guard.mx, guard.my);
    if (!uInVault && !guardInVault) wallifyVault(guard);
    if (!uInVault && stepGuardOutOfTheWay(guard, room)) return true;

    const step = vaultGuardNextStep(guard);
    if (!step) return false;
    let loc = game.level?.at(step.x, step.y);
    let dx = egd.gdx > guard.mx ? 1 : egd.gdx < guard.mx ? -1 : 0;
    let dy = egd.gdy > guard.my ? 1 : egd.gdy < guard.my ? -1 : 0;
    while (loc && loc.typ !== STONE) {
        const ex = step.x + step.x - guard.mx;
        const ey = step.y + step.y - guard.my;
        if (isok(ex, ey) && IS_ROOM(game.level?.at(ex, ey)?.typ)) break;
        if (dy && step.x !== guard.mx) {
            step.x = guard.mx;
            step.y = guard.my + dy;
            loc = game.level?.at(step.x, step.y);
            continue;
        }
        if (dx && step.y !== guard.my) {
            step.y = guard.my;
            step.x = guard.mx + dx;
            dy = 0;
            loc = game.level?.at(step.x, step.y);
            continue;
        }
        break;
    }
    if (!loc) return false;

    const oldX = guard.mx, oldY = guard.my;
    if (loc.typ === STONE || loc.typ === SCORR) {
        pushFakecorr(guard, step.x, step.y, loc);
        loc.typ = CORR;
        loc.flags = 0;
        vision_reset();
    } else if (!ACCESSIBLE(loc.typ) || (IS_ROOM(loc.typ) && loc.typ !== ROOM)) {
        pushFakecorr(guard, step.x, step.y, loc);
        loc.typ = DOOR;
        loc.doormask = D_NODOOR;
        vision_reset();
    }

    moveVaultGuard(guard, step.x, step.y);
    if (egd.gddone) return finishVaultGuardEscort(guard, oldX, oldY);
    restVaultFakecorr(guard);
    return true;
}
