// js/dig.js — pick-axe / dwarvish mattock wall & floor digging core.
// C ref: nethack-c/upstream/src/dig.c — dig_typ(), dig_check(),
// digcheck_fail_message(), dig(), dighole(), digactualhole(), dig_up_grave(),
// use_pick_axe(), use_pick_axe2(), pick_can_reach(), fillholetyp().
// RNG call order mirrors dig.c; see docs/c-parity-audit/927-*.md.

import { game } from './gstate.js';
import { newsym } from './display.js';
import { makemon, mksobj, monsterByRndName } from './mklev.js';
import { d, rn1, rn2, rnd } from './rng.js';
import {
    ALTAR, A_DEX, A_MAX, A_STR, A_WIS, BEAR_TRAP, COLNO, CORR, DBWALL, DIGTYP_BOULDER,
    DIGTYP_DOOR, DIGTYP_ROCK, DIGTYP_STATUE, DIGTYP_TREE, DIGTYP_UNDIGGABLE,
    DIR_180, DOOR, D_BROKEN, D_CLOSED, D_LOCKED, D_NODOOR, D_TRAPPED, DRAWBRIDGE_DOWN,
    FOUNTAIN, GRAVE,
    HOLE, ICE, IRONBARS, IS_DOOR, IS_OBSTRUCTED, IS_STWALL, IS_TREE, IS_WALL,
    Is_airlevel, Is_botlevel, Is_earthlevel, Is_rogue_level, Is_waterlevel,
    LANDMINE, LAVAPOOL, LAVAWALL, MAGIC_PORTAL, MM_NOMSG, MOAT, N_DIRS, PIT,
    POOL, ROOM, ROOMOFFSET, ROWNO, SCORR, SDOOR, SHARED, SHARED_PLUS,
    SHOPBASE, SPIKED_PIT, STAIRS, STONE, THRONE, TRAPDOOR, TREE, TT_PIT,
    VIBRATING_SQUARE, WATER, WEB, W_NONDIGGABLE, isok, xdir, ydir,
} from './const.js';

export { DIGTYP_BOULDER, DIGTYP_DOOR, DIGTYP_ROCK, DIGTYP_STATUE, DIGTYP_TREE, DIGTYP_UNDIGGABLE } from './const.js';

// Object identities — same numeric otyp values used in cmd.js/mklev.js.
const BOULDER = 465;
const CORPSE = 471;
const STATUE = 472;
const ROCK = 467;
const PICK_AXE = 10025;
const DWARVISH_MATTOCK = 10104;

// C ref: mklev.c CORPSTAT_MONSTERS role range used by mk_tt_object().
const GRAVE_CORPSE_ROLES = {
    305: 'archeologist', 306: 'barbarian', 307: 'caveman', 308: 'healer',
    309: 'knight', 310: 'monk', 311: 'priest', 312: 'ranger', 313: 'rogue',
    314: 'samurai', 315: 'tourist', 316: 'valkyrie',
};

export function digToolName(item) {
    return String(item?.actualKind || item?.kind || item?.name || '').toLowerCase();
}

// C ref: obj.h is_pick() — pick-axe or dwarvish mattock.
export function digToolIsPick(item) {
    if (!item) return false;
    if (item.otyp === PICK_AXE || item.otyp === DWARVISH_MATTOCK) return true;
    return /\bpick-axe\b|\bmattock\b/.test(digToolName(item));
}

// C ref: weapon.c is_axe() — axe skill weapons (axe, battle-axe).
export function digToolIsAxe(item) {
    if (!item) return false;
    if (digToolIsPick(item)) return false;
    return /\baxe\b/.test(digToolName(item));
}

// C ref: weapon.c bimanual() — two-handed tools reach into pits.
function digToolBimanual(item) {
    return /\bmattock\b|\bbattle-axe\b/.test(digToolName(item));
}

// C ref: dig.c dig() verb selection.
export function digVerb(item) {
    return digToolIsAxe(item) ? 'chop through' : 'dig into';
}

export function digVerbing(item) {
    return digToolIsAxe(item) ? 'chopping' : 'digging';
}

function heroInPit() {
    return !!(game.u?.utrap && (game.u.utraptype === TT_PIT || game.u.utraptype === 'pit'));
}

function digTrapAt(x, y) {
    return (game.level?.traps || []).find(trap => trap.tx === x && trap.ty === y) || null;
}

function digObjectAt(otyp, x, y) {
    return (game.level?.objects || []).find(obj =>
        !obj.hidden && !obj.transientProjectile && obj.ox === x && obj.oy === y
        && (obj.otyp === otyp || (otyp === STATUE && obj.kind === 'statue'))) || null;
}

// C ref: dig.c sobj_at(BOULDER, x, y).
export function digBoulderAt(x, y) {
    return digObjectAt(BOULDER, x, y);
}

function closedDoorAt(x, y) {
    const loc = game.level?.at?.(x, y);
    return !!loc && loc.typ === DOOR && !!(loc.doormask & (D_CLOSED | D_LOCKED));
}

// C ref: trap.c conjoined_pits() — each pit records its side of the shared edge.
export function conjoinedPits(target, origin) {
    if (!target || !origin || !isok(target.tx, target.ty) || !isok(origin.tx, origin.ty))
        return false;
    if ((target.ttyp !== PIT && target.ttyp !== SPIKED_PIT)
        || (origin.ttyp !== PIT && origin.ttyp !== SPIKED_PIT)) return false;
    const dx = Math.sign(target.tx - origin.tx);
    const dy = Math.sign(target.ty - origin.ty);
    const direction = xdir.findIndex((x, index) => index < N_DIRS && x === dx && ydir[index] === dy);
    return direction >= 0 && !!(origin.conjoined & (1 << direction))
        && !!(target.conjoined & (1 << DIR_180(direction)));
}

// C trap.c:clear_conjoined_pits removes both sides when a pit disappears.
export function clearConjoinedPits(trap) {
    if (!trap || (trap.ttyp !== PIT && trap.ttyp !== SPIKED_PIT)) return;
    for (let direction = 0; direction < N_DIRS; direction++) {
        if (!(trap.conjoined & (1 << direction))) continue;
        const neighbor = digTrapAt(trap.tx + xdir[direction], trap.ty + ydir[direction]);
        if (neighbor && (neighbor.ttyp === PIT || neighbor.ttyp === SPIKED_PIT))
            neighbor.conjoined &= ~(1 << DIR_180(direction));
        trap.conjoined &= ~(1 << direction);
    }
}

// C ref: dig.c pick_can_reach() — one-handed picks can't reach statues or
// boulders resting in (non-conjoined) pits unless the hero is in one too.
export function pickCanReach(pick, x, y) {
    const trap = digTrapAt(x, y);
    const targetInPit = !!trap && (trap.ttyp === PIT || trap.ttyp === SPIKED_PIT) && !!trap.tseen;
    if (heroInPit()) {
        if (targetInPit) {
            const heroTrap = digTrapAt(game.u?.ux || 0, game.u?.uy || 0);
            return conjoinedPits(trap, heroTrap);
        }
        return digToolBimanual(pick);
    }
    if (digToolBimanual(pick) || game.u?.flying) return true;
    return !targetInPit;
}

// C ref: dig.c dig_typ() — what a swung pick/axe is actually digging into.
export function digTypeOf(item, x, y) {
    if (!isok(x, y) || !item || (!digToolIsPick(item) && !digToolIsAxe(item)))
        return DIGTYP_UNDIGGABLE;
    const loc = game.level?.at?.(x, y);
    const ltyp = loc?.typ;
    if (digToolIsAxe(item)) {
        return closedDoorAt(x, y) ? DIGTYP_DOOR
            : IS_TREE(ltyp) ? DIGTYP_TREE
                : DIGTYP_UNDIGGABLE;
    }
    // assert(digToolIsPick(item))
    if (digObjectAt(STATUE, x, y) && pickCanReach(item, x, y)) return DIGTYP_STATUE;
    if (digObjectAt(BOULDER, x, y) && pickCanReach(item, x, y)) return DIGTYP_BOULDER;
    if (closedDoorAt(x, y)) return DIGTYP_DOOR;
    if (IS_TREE(ltyp)) return DIGTYP_UNDIGGABLE; // pick vs tree
    if (IS_OBSTRUCTED(ltyp) && (!game.level?.flags?.arboreal || IS_WALL(ltyp)))
        return DIGTYP_ROCK;
    return DIGTYP_UNDIGGABLE;
}

// C ref: mklev.c may_dig().
export function mayDigAt(x, y) {
    const loc = game.level?.at?.(x, y);
    return !(IS_STWALL(loc?.typ) || IS_TREE(loc?.typ)) || !(loc?.wall_info & W_NONDIGGABLE);
}

// C ref: dungeon.c Can_dig_down() — hardfloor, bottom level, invocation level.
export function canDigDownAt(level = game.u?.uz) {
    if (!level || game.level?.flags?.hardfloor || Is_botlevel(level)) return false;
    const dungeon = game.dungeons?.[level.dnum];
    const invocation = game.dungeons?.[level.dnum]?.name === 'Gehennom'
        && (level.dlevel ?? 0) === Math.max(1, (dungeon?.num_dunlevs ?? 1) - 1);
    return !invocation;
}

function stairwayAt(x, y) {
    for (let stair = game.stairs; stair; stair = stair.next)
        if (stair.sx === x && stair.sy === y) return stair;
    return null;
}

// C ref: dig.c dig_check() for the hero (madeby == BY_YOU).
export function digCheckHero(x, y) {
    const loc = game.level?.at?.(x, y);
    const trap = digTrapAt(x, y);
    const stair = stairwayAt(x, y);
    if (stair) return stair.isladder ? 'onladder' : 'onstairs';
    if (loc?.typ === THRONE) return 'throne';
    if (loc?.typ === ALTAR) return 'altar';
    if (Is_airlevel(game.u?.uz)) return 'airlevel';
    if (Is_waterlevel(game.u?.uz)) return 'waterlevel';
    if (IS_OBSTRUCTED(loc?.typ) && loc?.typ !== SDOOR && (loc?.wall_info & W_NONDIGGABLE))
        return 'toohard';
    if (trap && (trap.ttyp === MAGIC_PORTAL || trap.ttyp === VIBRATING_SQUARE))
        return 'undestroyabletrap';
    if (!canDigDownAt() && !loc?.candig) {
        if (trap) {
            const isHole = trap.ttyp === HOLE || trap.ttyp === TRAPDOOR;
            const isPit = trap.ttyp === PIT || trap.ttyp === SPIKED_PIT;
            if (!isHole && !isPit) return 'passed_destroy_trap';
            return 'cantdig';
        }
        return 'passed_pitonly';
    }
    if (digObjectAt(BOULDER, x, y)) return 'boulder';
    return 'passed';
}

// C ref: dig.c digcheck_fail_message() with the hero's pick/axe verb.
export function digCheckFailMessage(code, item) {
    const verb = digToolIsAxe(item) ? 'chop' : 'dig in';
    switch (code) {
    case 'airlevel': return `You cannot ${verb} thin air.`;
    case 'altar': return 'The altar is too hard to break apart.';
    case 'boulder': return `There isn't enough room to ${verb} here.`;
    case 'onladder': return 'The ladder resists your effort.';
    case 'onstairs': return `The stairs are too hard to ${verb}.`;
    case 'throne': return 'The throne is too hard to break apart.';
    case 'cantdig':
    case 'toohard':
    case 'undestroyabletrap':
        return `The ${digSurfaceText(game.u?.ux || 0, game.u?.uy || 0)} here is too hard to ${verb}.`;
    case 'waterlevel': return 'The water splashes and subsides.';
    default: return '';
    }
}

// C ref: dungeon.c surface() — floor description used by digging messages.
export function digSurfaceText(x, y) {
    const loc = game.level?.at?.(x, y);
    const typ = loc?.typ;
    if (typ === POOL || typ === MOAT || typ === WATER) return 'water';
    if (typ === ICE) return 'ice';
    if (typ === LAVAPOOL || typ === LAVAWALL) return 'lava';
    if (typ === DRAWBRIDGE_DOWN) return 'bridge';
    if (typ === ALTAR) return 'altar';
    if (typ === GRAVE) return 'headstone';
    if (typ === FOUNTAIN) return 'fountain';
    if (typ === STAIRS) return 'stairs';
    if (IS_WALL(typ) || typ === SDOOR) return 'wall';
    if (typ === DOOR) return 'doorway';
    if (typ >= ROOM && !Is_earthlevel(game.u?.uz)) return 'floor';
    return 'ground';
}

// C ref: weapon.c abon() — attack bonus feeding dig effort.
export function digAbon() {
    const u = game.u || {};
    const str = u.acurr?.a?.[A_STR] ?? 10;
    const dex = u.acurr?.a?.[A_DEX] ?? 10;
    let sbon;
    if (str < 6) sbon = -2;
    else if (str < 8) sbon = -1;
    else if (str < 17) sbon = 0;
    else if (str < 68) sbon = 1; // up to 18/49 (STR18(50) == 68)
    else if (str < 118) sbon = 2; // up to 18/99 (STR18(100) == 118)
    else sbon = 3;
    if ((u.ulevel || 1) < 3) sbon += 1;
    if (dex < 4) return sbon - 3;
    if (dex < 6) return sbon - 2;
    if (dex < 8) return sbon - 1;
    if (dex < 14) return sbon;
    return sbon + dex - 14;
}

// C ref: weapon.c dbon() — damage bonus for pick self-hit.
export function digDbon() {
    const str = game.u?.acurr?.a?.[A_STR] ?? 10;
    if (str < 6) return -1;
    if (str < 16) return 0;
    if (str < 18) return 1;
    if (str === 18) return 2;
    if (str <= 93) return 3; // up to 18/75 (STR18(75) == 93)
    if (str <= 108) return 4; // up to 18/90 (STR18(90) == 108)
    if (str < 118) return 5; // up to 18/99
    return 6;
}

function digGreatestErosion(item) {
    return Math.max(item?.oeroded || 0, item?.oeroded2 || 0, item?.erosion || 0);
}

// C ref: dig.c dig() effort accumulation; consumes rn2(5) once per swing.
export function digEffortIncrement(item) {
    let effort = 10 + rn2(5) + digAbon() + (item?.spe || 0)
        - digGreatestErosion(item) + (game.u?.udaminc || 0);
    if ((game.urace?.noun || game._startup_race) === 'dwarf') effort *= 2;
    return effort;
}

// C ref: attrib.c acurrstr() — 3..25 compressed strength used by shk costs.
export function digAcurrStr() {
    const str = game.u?.acurr?.a?.[A_STR] ?? 10;
    if (str <= 18) return Math.max(str, 3);
    if (str <= 121) return 19 + Math.floor(str / 50);
    return Math.min(str, 125) - 100;
}

// C ref: hack.h SHOP_WALL_DMG (10L * ACURRSTR).
export function shopWallDamageCost() {
    return 10 * digAcurrStr();
}

// C ref: shk.c in_rooms(x, y, SHOPBASE) reduced to a boolean.  Walls shared
// by a shop carry SHARED/SHARED_PLUS and are detected via adjacency.
export function inShopBaseAt(x, y) {
    return shopBaseRoomnosAt(x, y).length > 0;
}

export function shopBaseRoomnosAt(x, y) {
    const loc = game.level?.at?.(x, y);
    const roomno = loc?.roomno ?? 0;
    const matches = rn => {
        if (rn < ROOMOFFSET) return false;
        const room = (game.level?.rooms || []).find(r => (r.roomnoidx + ROOMOFFSET) === rn
            || r.roomno === rn);
        return !!room && (room.rtype || 0) >= SHOPBASE;
    };
    if (roomno >= ROOMOFFSET) return matches(roomno) ? [roomno] : [];
    if (roomno !== SHARED && roomno !== SHARED_PLUS) return [];
    const found = [];
    const step = roomno === SHARED ? 2 : 1;
    for (let nx = Math.max(0, x - 1); nx <= Math.min(COLNO - 1, x + 1); nx += step) {
        for (let ny = Math.max(0, y - 1); ny <= Math.min(ROWNO - 1, y + 1); ny += step) {
            const adj = game.level?.at?.(nx, ny)?.roomno ?? 0;
            if (adj >= ROOMOFFSET && !found.includes(adj) && matches(adj)) found.push(adj);
        }
    }
    return found;
}

// C ref: mon.c wake_nearby(FALSE) — digging noise wakes close monsters.
export function wakeNearbyForDig() {
    const ux = game.u?.ux || 0;
    const uy = game.u?.uy || 0;
    const distance = (game.u?.ulevel || 1) * 20;
    for (const mon of game.level?.monsters || []) {
        if (!mon || mon.dead || (mon.mhp != null && mon.mhp <= 0)) continue;
        const dx = (mon.mx || 0) - ux;
        const dy = (mon.my || 0) - uy;
        if (distance !== 0 && dx * dx + dy * dy >= distance) continue;
        mon.msleeping = 0;
        if (!(mon.unique || mon.data?.unique || mon.data?.uniq)) {
            mon.mstrategy = 0;
            mon.waiting = false;
        }
    }
}

// C ref: dig.c dig() "hit the X with all your might" target names.
export function digTargetName(digtyp) {
    return ['', 'rock', 'statue', 'boulder', 'door', 'tree'][digtyp] || '';
}

// C ref: dig.c use_pick_axe2() d_action[] start/continue messages.
export function digActionMessage(digtyp, continuing) {
    const action = ['swinging', 'digging', 'chipping the statue', 'hitting the boulder',
        'chopping at the door', 'cutting the tree'][digtyp] || 'swinging';
    return continuing ? `You continue ${action}.` : `You start ${action}.`;
}

// C ref: engrave.c can_reach_floor(FALSE) as used by use_pick_axe()'s
// downok rule.  JS does not track unskilled riders or ceiling-hider
// u.uundetected, so those C branches are not reachable here.
function digPromptCanReachFloor() {
    if (game.u?.uswallow) return false;
    if (game.u?.levitating && !Is_airlevel(game.u?.uz) && !Is_waterlevel(game.u?.uz))
        return false;
    return true;
}

// C ref: dig.c use_pick_axe() — bracketed list of likely dig directions
// shown in the prompt, in DIR_ order (W,NW,N,NE,E,SE,S,SW,down,up).
// Planar directions are skipped when off-map or DIGTYP_UNDIGGABLE (and on
// diagonals for a NODIAG hero form); down is shown iff can_reach_floor(FALSE),
// otherwise up is shown as the silly candidate.  When swallowed, every
// direction is listed.
const DIG_PROMPT_DIRS = [
    { ch: 'h', dx: -1, dy: 0 },   // DIR_W
    { ch: 'y', dx: -1, dy: -1 },  // DIR_NW
    { ch: 'k', dx: 0, dy: -1 },   // DIR_N
    { ch: 'u', dx: 1, dy: -1 },   // DIR_NE
    { ch: 'l', dx: 1, dy: 0 },    // DIR_E
    { ch: 'n', dx: 1, dy: 1 },    // DIR_SE
    { ch: 'j', dx: 0, dy: 1 },    // DIR_S
    { ch: 'b', dx: -1, dy: 1 },   // DIR_SW
];
export function digDirectionCandidates(item) {
    if (game.u?.uswallow) return 'hykulnjb><';
    const ux = game.u?.ux || 0, uy = game.u?.uy || 0;
    const nodiag = game.u?._polyself_form?.name === 'grid bug'; // C dxdy_moveok()
    let out = '';
    for (const { ch, dx, dy } of DIG_PROMPT_DIRS) {
        if (nodiag && dx && dy) continue;
        const rx = ux + dx, ry = uy + dy;
        if (!isok(rx, ry) || digTypeOf(item, rx, ry) === DIGTYP_UNDIGGABLE) continue;
        out += ch;
    }
    return out + (digPromptCanReachFloor() ? '>' : '<');
}

// C ref: dig.c use_pick_axe() — "In what direction do you want to %s? [%s]".
export function pickDigDirectionPrompt(item) {
    const verb = digToolIsAxe(item) ? 'chop' : 'dig';
    return `In what direction do you want to ${verb}? [${digDirectionCandidates(item)}]`;
}

// C ref: dig.c fillholetyp() — liquid that floods a fresh hole, if any.
export function fillHoleType(x, y, fillIfAny = false) {
    let poolCnt = 0, moatCnt = 0, lavaCnt = 0;
    const loX = Math.max(1, x - 1), hiX = Math.min(x + 1, COLNO - 1);
    const loY = Math.max(0, y - 1), hiY = Math.min(y + 1, ROWNO - 1);
    for (let x1 = loX; x1 <= hiX; x1++) {
        for (let y1 = loY; y1 <= hiY; y1++) {
            const typ = game.level?.at?.(x1, y1)?.typ;
            if (typ === MOAT) moatCnt++;
            else if (typ === POOL || typ === WATER) poolCnt++;
            else if (typ === LAVAPOOL) lavaCnt++;
        }
    }
    if (!fillIfAny) poolCnt = Math.floor(poolCnt / 3);
    if ((lavaCnt > moatCnt + poolCnt && rn2(lavaCnt + 1)) || (lavaCnt && fillIfAny))
        return LAVAPOOL;
    if ((moatCnt > 0 && rn2(moatCnt + 1)) || (moatCnt && fillIfAny))
        return MOAT;
    if ((poolCnt > 0 && rn2(poolCnt + 1)) || (poolCnt && fillIfAny))
        return POOL;
    return ROOM;
}

// C ref: zap.c fracture_rock() reduced to the terrain object mutation
// (shop billing and sokoban guilt are handled by their own ports).
export function fractureDigBoulder(boulder) {
    boulder.otyp = ROCK;
    boulder.cls = 'gem';
    boulder.kind = 'rock';
    boulder.actualKind = 'rock';
    boulder.singular = 'rock';
    boulder.plural = 'rocks';
    boulder.gemDescription = 'rock';
    boulder.glyph = '*';
    boulder.quan = rn1(60, 7);
    boulder.owt = 10 * boulder.quan;
    boulder.spe = 0;
    delete boulder.contents;
    newsym(boulder.ox || 0, boulder.oy || 0);
}

// C ref: detect.c cvt_sdoor_to_door().
export function convertSecretDoorToDoor(loc) {
    let newmask = (loc.doormask || 0) & ~0x07; // clears WM_MASK bits
    if (Is_rogue_level(game.u?.uz)) {
        newmask = D_NODOOR;
    } else if (!(newmask & D_LOCKED)) {
        newmask |= D_CLOSED;
    }
    loc.typ = DOOR;
    loc.doormask = newmask;
}

// C ref: dig.c dig() !down branch, effort > 100 — wall/door/stone terrain
// outcomes.  Statues and boulders are finished by the caller (they share
// the pick occupation code with the existing statue chipping path).
// Returns { message, shopWallDamage, shopDoorDamage, brokeTrappedDoor }.
export function finishWallDigTerrain(item, x, y) {
    const loc = game.level?.at?.(x, y);
    if (!loc) return null;
    const result = { message: '', shopWallDamage: false, shopDoorDamage: false, brokeTrappedDoor: false };
    const shopedge = inShopBaseAt(x, y);
    if (loc.typ === STONE || loc.typ === SCORR || IS_TREE(loc.typ)) {
        if (digTypeOf(item, x, y) === DIGTYP_TREE) {
            result.message = 'You cut down the tree.';
            loc.typ = ROOM;
            loc.flags = 0;
            result.treeFruit = !rn2(5);
        } else {
            result.message = 'You succeed in cutting away some rock.';
            loc.typ = CORR;
            loc.flags = 0;
        }
    } else if (IS_WALL(loc.typ)) {
        if (shopedge) result.shopWallDamage = true;
        if (game.level?.flags?.is_maze_lev) {
            loc.typ = ROOM;
            loc.flags = 0;
        } else if (game.level?.flags?.is_cavernous_lev && !inTownAt(x, y)) {
            loc.typ = CORR;
            loc.flags = 0;
        } else {
            loc.typ = DOOR;
            loc.doormask = D_NODOOR;
        }
        result.message = 'You make an opening in the wall.';
    } else if (loc.typ === SDOOR) {
        convertSecretDoorToDoor(loc);
        result.message = 'You break through a secret door!';
        if (!(loc.doormask & D_TRAPPED)) loc.doormask = D_BROKEN;
    } else if (closedDoorAt(x, y)) {
        result.message = `You break through the door with your ${digToolName(item) || 'pick-axe'}.`;
        if (shopedge) result.shopDoorDamage = true;
        if (!(loc.doormask & D_TRAPPED)) loc.doormask = D_BROKEN;
    } else {
        return null; // statue or boulder got taken
    }
    if ((loc.typ === DOOR) && (loc.doormask & D_TRAPPED)) {
        loc.doormask = D_NODOOR;
        result.brokeTrappedDoor = true;
    }
    newsym(x, y);
    return result;
}

// C ref: dungeon.c in_town().
export function inTownAt(x, y) {
    if (!game.level?.flags?.has_town) return false;
    const townRooms = (game.level?.rooms || []).filter(room => room?.sbrooms?.length);
    if (!townRooms.length) return true;
    return townRooms.some(room => x >= room.lx && x <= room.hx && y >= room.ly && y <= room.hy);
}

// C ref: dig.c dig_up_grave() — grave robbing side effects and loot.
export async function digUpGrave(x = game.u?.ux || 0, y = game.u?.uy || 0) {
    if (!isok(x, y)) return [];
    const messages = [];
    const loc = game.level?.at?.(x, y);
    const u = game.u || {};
    // exercise(A_WIS, FALSE) — mirror cmd.js exerciseAttribute decrease branch.
    u._aexe ??= Array(A_MAX).fill(0);
    if (Math.abs(u._aexe[A_WIS] || 0) < 50) u._aexe[A_WIS] -= rn2(2);
    const roleName = game.urole?.name?.m || game._startup_role || '';
    const alignType = Number(u.ualign?.type ?? (game._startup_align === 'lawful' ? 1
        : game._startup_align === 'chaotic' ? -1 : 0));
    if (roleName === 'Archeologist') {
        u.ualign ??= {};
        u.ualign.record = (u.ualign.record || 0) - Math.sign(alignType) * 3;
        messages.push('You feel like a despicable grave-robber!');
    } else if (roleName === 'Samurai') {
        u.ualign ??= {};
        u.ualign.record = (u.ualign.record || 0) - Math.sign(alignType);
        messages.push('You disturb the honorable dead!');
    } else if (alignType === 1) {
        u.ualign ??= {};
        if ((u.ualign.record || 0) > -10) u.ualign.record -= 1;
        messages.push('You have violated the sanctity of this grave!');
    }

    // -1 forces the default empty-grave case.
    const whatHappens = loc?.emptygrave ? -1 : rn2(5);
    if (whatHappens === 0 || whatHappens === 1) {
        messages.push('You unearth a corpse.');
        // mk_tt_object(CORPSE): mksobj + tt_oname fallback rnd(10) + rn1(13, 305).
        const corpse = mksobj(CORPSE, true, false);
        rnd(10);
        const pm = rn1(13, 305);
        corpse.corpsenm = { name: GRAVE_CORPSE_ROLES[pm] || 'human', neuter: false, female: pm === 316 };
        corpse.age = (corpse.age || 0) - 51; // TAINT_AGE + 1 — an *OLD* corpse
        corpse.ox = x;
        corpse.oy = y;
        game.level.objects ??= [];
        game.level.objects.push(corpse);
    } else if (whatHappens === 2) {
        if (!game.u?.blind) messages.push("The grave's owner is very upset!");
        await makemon(randomGraveUndead('Z'), x, y, MM_NOMSG);
    } else if (whatHappens === 3) {
        if (!game.u?.blind) messages.push("You've disturbed a tomb!");
        await makemon(randomGraveUndead('M'), x, y, MM_NOMSG);
    } else {
        messages.push('The grave is unoccupied.  Strange...');
    }
    if (loc) {
        loc.typ = ROOM;
        loc.emptygrave = 0;
        loc.disturbed = 0;
        loc.flags = 0;
    }
    // C ref: dig.c del_engr_at() — the headstone engraving is removed
    // outright (no wipe_engr RNG rolls).
    if (Array.isArray(game.level?.engravings))
        game.level.engravings = game.level.engravings.filter(engr => !(engr.x === x && engr.y === y));
    newsym(x, y);
    return messages;
}

// mkclass(S_ZOMBIE/S_MUMMY, 0) approximation: uniform over the class rows
// that mklev's rndmonst table carries (no recorded session digs graves).
const GRAVE_UNDEAD = {
    Z: ['kobold zombie', 'gnome zombie', 'orc zombie', 'dwarf zombie',
        'elf zombie', 'human zombie', 'ettin zombie', 'ghoul'],
    M: ['kobold mummy', 'gnome mummy', 'orc mummy', 'dwarf mummy',
        'elf mummy', 'human mummy', 'giant mummy', 'ettin mummy'],
};

function randomGraveUndead(glyph) {
    const names = GRAVE_UNDEAD[glyph] || GRAVE_UNDEAD.Z;
    const pick = names[Math.min(names.length - 1, rnd(names.length) - 1)];
    return monsterByRndName(pick);
}

// C ref: dig.c use_pick_axe2() horizontal DIGTYP_UNDIGGABLE branches.
// Returns { message, webTurns, wake, selfDamage } for the apply path.
export function horizontalUndiggableResult(item, x, y) {
    const loc = game.level?.at?.(x, y);
    const trap = digTrapAt(x, y);
    const result = { message: '', webTurns: 0, wake: false, selfDamage: 0, extraMessage: '' };
    const toolName = digToolName(item) || 'pick-axe';
    if (trap && trap.ttyp === WEB) {
        if (!trap.tseen) {
            trap.tseen = true;
            result.extraMessage = 'There is a spider web there!';
        }
        result.message = `Your ${toolName} becomes entangled in the web.`;
        result.webTurns = d(2, 2);
        result.nomoveMessage = 'You pull free.';
        return result;
    }
    if (loc?.typ === IRONBARS) {
        result.message = 'Clang!';
        result.wake = true;
        return result;
    }
    if (loc?.typ === WATER || loc?.typ === LAVAWALL) {
        result.message = 'Splash!';
        return result;
    }
    if (IS_TREE(loc?.typ)) {
        result.message = 'You need an axe to cut down a tree.';
        return result;
    }
    if (IS_OBSTRUCTED(loc?.typ)) {
        result.message = 'You need a pick to dig rock.';
        return result;
    }
    const boulder = digObjectAt(BOULDER, x, y);
    const statue = boulder ? null : digObjectAt(STATUE, x, y);
    if (boulder || statue) {
        const what = boulder ? 'boulder' : 'statue';
        if (!digToolIsPick(item)) {
            result.wake = true;
            if (!rn2(3)) {
                result.message = `Sparks fly as you whack the ${what}.  The axe-handle vibrates violently!`;
                result.selfDamage = 2;
            } else {
                result.message = `Sparks fly as you whack the ${what}.`;
            }
        } else {
            result.message = `You can't reach the ${what}.`;
        }
        return result;
    }
    if (heroInPit()) {
        const heroTrap = digTrapAt(game.u?.ux || 0, game.u?.uy || 0);
        if (trap && (trap.ttyp === PIT || trap.ttyp === SPIKED_PIT)
            && heroTrap && !conjoinedPits(trap, heroTrap)) {
            const dx = Math.sign(x - game.u.ux);
            const dy = Math.sign(y - game.u.uy);
            const direction = xdir.findIndex((dirX, index) => index < N_DIRS && dirX === dx && ydir[index] === dy);
            if (direction < 0) return result;
            heroTrap.conjoined |= 1 << direction;
            trap.conjoined |= 1 << DIR_180(direction);
            result.message = 'You clear some debris from between the pits.';
            return result;
        }
        if (heroTrap) {
            result.message = `You swing your ${toolName}, but the rubble has no place to go.`;
            return result;
        }
    }
    result.message = `You swing your ${toolName} through thin air.`;
    return result;
}

// C ref: dig.c use_pick_axe2() down-dig pre-start guards.  Returns null when
// downward digging may start, otherwise { message } to show instead.
export function downDigStartBlock(item) {    const ux = game.u?.ux || 0;
    const uy = game.u?.uy || 0;
    const toolName = digToolName(item) || 'pick-axe';
    if (Is_airlevel(game.u?.uz) || Is_waterlevel(game.u?.uz))
        return { message: `You swing your ${toolName} through thin air.` };
    if (game.u?.levitating || game.u?.flying)
        return { message: `You can't reach the ${digSurfaceText(ux, uy)}.` };
    const loc = game.level?.at?.(ux, uy);
    if (loc && (loc.typ === POOL || loc.typ === MOAT || loc.typ === LAVAPOOL))
        return { message: `You cannot stay under${loc.typ === LAVAPOOL ? ' the lava' : 'water'} long enough.` };
    const trap = digTrapAt(ux, uy);
    if (!digToolIsPick(item)
        && (!trap || (trap.ttyp !== LANDMINE && trap.ttyp !== BEAR_TRAP))) {
        return { message: `Your ${toolName} merely scratches the ${digSurfaceText(ux, uy)}.`, wipeEngraving: 3 };
    }
    return null;
}

// C ref: dig.c svc.context.digging — persists between swings so an
// interrupted dig resumes with "You continue ..." and keeps its effort.
// game._pick_dig_context is that persistent state; while a dig is running,
// game._pick_dig_occupation aliases the same object.
export function beginDigOccupation(item, x, y, down) {
    const uz = game.u?.uz || { dnum: 0, dlevel: 1 };
    const prev = game._pick_dig_context;
    const continuing = !!prev && !!prev.down === !!down
        && prev.x === x && prev.y === y
        && (prev.level?.dnum ?? -1) === (uz.dnum ?? 0)
        && (prev.level?.dlevel ?? -1) === (uz.dlevel ?? 1);
    const context = prev && typeof prev === 'object' ? prev : {};
    if (!continuing) {
        context.x = x;
        context.y = y;
        context.level = { dnum: uz.dnum ?? 0, dlevel: uz.dlevel ?? 1 };
        context.down = !!down;
        context.effort = 0;
        context.warned = false;
    }
    context.chew = false;
    context.itemLetter = item?.letter;
    context.didMessage = false;
    game._pick_dig_context = context;
    game._pick_dig_occupation = context;
    return continuing;
}

// C ref: dig.c dig() cleanup — after a wall/door finishes, the level marker
// is invalidated so the next apply is a fresh "start"; after a downward hole
// completes, the whole context is zeroed.
export function finishDigContext({ downwardHole = false } = {}) {
    const context = game._pick_dig_context;
    if (!context) return;
    if (downwardHole) {
        context.x = 0;
        context.y = 0;
        context.down = false;
        context.effort = 0;
        context.warned = false;
        context.chew = false;
        context.level = { dnum: 0, dlevel: -1 };
    } else {
        context.lastdigtime = game.moves || 0;
        context.quiet = false;
        context.level = { dnum: 0, dlevel: -1 };
    }
}

// C ref: dig.c use_pick_axe2() horizontal branch.  Returns
// { kind: 'clash' } for off-map swings, { kind: 'undiggable', ... } with the
// message payload, or { kind: 'dig', digTarget, continuing } when an
// occupation should run.
export function planHorizontalDig(item, x, y) {
    if (!isok(x, y)) return { kind: 'clash' };
    const digTarget = digTypeOf(item, x, y);
    if (digTarget === DIGTYP_UNDIGGABLE)
        return { kind: 'undiggable', ...horizontalUndiggableResult(item, x, y) };
    return { kind: 'dig', digTarget };
}

// C ref: dig.c dig() — dig_check failures abort the downward dig each tick.
export function digCheckFailed(code) {
    return !!code && !code.startsWith('passed');
}

// C ref: dig.c dig() !down per-tick hardness guards — petrified trees and
// W_NONDIGGABLE walls abort before any effort is spent.
export function digHardnessBlockMessage(item, x, y) {
    const loc = game.level?.at?.(x, y);
    if (IS_TREE(loc?.typ) && !mayDigAt(x, y) && digTypeOf(item, x, y) === DIGTYP_TREE)
        return 'This tree seems to be petrified.';
    if (IS_OBSTRUCTED(loc?.typ) && !mayDigAt(x, y) && digTypeOf(item, x, y) === DIGTYP_ROCK)
        return `This ${loc?.typ === DBWALL ? 'drawbridge' : 'wall'} is too hard to ${digVerb(item)}.`;
    return null;
}

// C ref: dig.c dig() early-exit guard — digging stops when the weapon is
// gone, the hero changed level, or the target is out of reach.
export function digOccupationAborted(dig, item, wielded) {
    if (!dig || !item || !wielded) return true;
    const uz = game.u?.uz || { dnum: 0, dlevel: 1 };
    if ((dig.level?.dnum ?? uz.dnum) !== (uz.dnum ?? 0)
        || (dig.level?.dlevel ?? uz.dlevel) !== (uz.dlevel ?? 1)) return true;
    const ux = game.u?.ux || 0;
    const uy = game.u?.uy || 0;
    if (dig.down) return (dig.x || 0) !== ux || (dig.y || 0) !== uy;
    return Math.max(Math.abs((dig.x || 0) - ux), Math.abs((dig.y || 0) - uy)) > 1;
}

// C ref: dig.c dig() fumbling branch.  Consumes rn2(3) then rn2(3), and
// rnd(5) when the pick bounces into the hero.  Returns null when the swing
// proceeds normally, otherwise { message, dropItem } and the dig stops.
export function digFumblingResult(item) {
    const fumbling = !!(game.u?.fumbling || game.u?._fumblingTimeout
        || (game.u?._statusSuffix || '').includes('Fumbling'));
    if (!fumbling || rn2(3)) return null;
    const toolName = digToolName(item) || 'pick-axe';
    switch (rn2(3)) {
    case 0: {
        const welded = !!(item && (item.welded || (item.cursed && item.wielded)));
        if (!welded) return { message: `You fumble and drop your ${toolName}.`, dropItem: true };
        game.u && (game.u._woundedLegTurns = Math.max(game.u._woundedLegTurns || 0, 5 + rnd(5)));
        const steed = game.u?.usteed;
        return {
            message: steed
                ? `Your ${toolName} bounces and hits ${steed.data?.name || 'your steed'}!`
                : `Ouch!  Your ${toolName} bounces and hits you!`,
        };
    }
    case 1:
        return { message: `Bang!  You hit with the broad side of your ${toolName}!`, wake: true };
    default:
        return { message: 'Your swing misses its mark.' };
    }
}
