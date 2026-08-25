// lock.js — Lock picking, door open/close.
// C ref: lock.c pick_lock / picklock / doopen_indir / doclose /
//        boxlock / doorlock (subset).

import { game } from './gstate.js';
import { nhgetch } from './input.js';
import { flush_screen, pline, newsym, canseemon, pline_mon } from './display.js';
import { vision_recalc, recalc_block_point, cansee } from './vision.js';
import { stop_occupation, in_rooms } from './hack.js';
import {
    COLNO, ROWNO, IS_DOOR, ECMD_OK, ECMD_TIME, OBJ_FLOOR, OBJ_FREE,
    DOOR, SDOOR, Is_rogue_level, SHOPBASE,
    D_NODOOR, D_BROKEN, D_ISOPEN, D_CLOSED, D_LOCKED, D_TRAPPED,
    P_DAGGER, P_FLAIL, P_LANCE, P_PICK_AXE, P_SABER, P_NONE,
    AUTOUNLOCK_APPLY_KEY, STRAT_WAITMASK, TT_PIT, M_AP_TYPE,
    M_AP_FURNITURE, M_AP_OBJECT, FINGER,
} from './const.js';
import { rnl, rn2, rnd } from './rng.js';
import { acurr, acurrstr, A_STR, A_DEX, A_CON, exercise } from './attrib.js';
import { verysmall, nohands, passes_walls, G_UNIQ } from './monsters.js';
import {
    objects_at, place_object, stackobj, obj_extract_self, delobj,
} from './mkobj.js';
import { can_reach_floor, set_occupation } from './engrave.js';
import {
    WEAPON_CLASS, ROCK_CLASS, TOOL_CLASS, POTION_CLASS, WAND_CLASS,
    objectNames,
} from './objects.js';
import { doname, xname, cxname, singular } from './objnam.js';
import { obj_resists } from './dogmove.js';
import { setuwep } from './wield.js';
import { PM_ROGUE, PM_WIZARD } from './generated/monsters_data.js';
import { m_at, wake_nearto } from './mon.js';
import { getdir_cmdassist } from './dothrow.js';
import { b_trapped, t_at } from './trap.js';

const DIR_DX = { h: -1, l: 1, j: 0, k: 0, y: -1, u: 1, b: -1, n: 1 };
const DIR_DY = { h: 0, l: 0, j: 1, k: -1, y: -1, u: -1, b: 1, n: 1 };
/** C cmd.c number_pad dirchars (only when iflags.num_pad / Cmd.num_pad). */
const NUMPAD_DIR = {
    '1': { dx: -1, dy: 1 },
    '2': { dx: 0, dy: 1 },
    '3': { dx: 1, dy: 1 },
    '4': { dx: -1, dy: 0 },
    '6': { dx: 1, dy: 0 },
    '7': { dx: -1, dy: -1 },
    '8': { dx: 0, dy: -1 },
    '9': { dx: 1, dy: -1 },
};

/**
 * C ref: cmd.c movecmd(sym, MV_ANY) + GETDIR_SELF/SELF2 + <> + optional numpad.
 * Named omit: mouse `_` getpos; dxdy_moveok grid-bug; trailing confdir
 * (callers that need it, e.g. use_whip, already call confdir).
 */
function apply_dirsym(ch, key) {
    const u = game.u || (game.u = {});
    if (ch === '.' || ch === 's') {
        u.dx = u.dy = u.dz = 0;
        return true;
    }
    if (ch === '<') {
        u.dx = u.dy = 0;
        u.dz = -1;
        return true;
    }
    if (ch === '>') {
        u.dx = u.dy = 0;
        u.dz = 1;
        return true;
    }
    if (ch in DIR_DX) {
        u.dx = DIR_DX[ch];
        u.dy = DIR_DY[ch];
        u.dz = 0;
        return true;
    }
    const low = typeof ch === 'string' ? ch.toLowerCase() : '';
    if (low in DIR_DX && ch === low.toUpperCase()) {
        u.dx = DIR_DX[low];
        u.dy = DIR_DY[low];
        u.dz = 0;
        return true;
    }
    if (typeof key === 'number' && key >= 1 && key <= 26) {
        const rushCh = String.fromCharCode(key + 96);
        if (rushCh in DIR_DX) {
            u.dx = DIR_DX[rushCh];
            u.dy = DIR_DY[rushCh];
            u.dz = 0;
            return true;
        }
    }
    const numPad = !!(game.iflags?.num_pad || game.Cmd?.num_pad);
    if (numPad) {
        if (ch === '5') {
            u.dx = u.dy = u.dz = 0;
            return true;
        }
        const nd = NUMPAD_DIR[ch];
        if (nd) {
            u.dx = nd.dx;
            u.dy = nd.dy;
            u.dz = 0;
            return true;
        }
    }
    return false;
}

const LOCK_PICK = objectNames.indexOf('LOCK_PICK');
const SKELETON_KEY = objectNames.indexOf('SKELETON_KEY');
const CREDIT_CARD = objectNames.indexOf('CREDIT_CARD');
const CHEST = objectNames.indexOf('CHEST');
const WAN_LOCKING = objectNames.indexOf('WAN_LOCKING');
const SPE_WIZARD_LOCK = objectNames.indexOf('SPE_WIZARD_LOCK');
const WAN_OPENING = objectNames.indexOf('WAN_OPENING');
const SPE_KNOCK = objectNames.indexOf('SPE_KNOCK');
const WAN_STRIKING = objectNames.indexOf('WAN_STRIKING');
const SPE_FORCE_BOLT = objectNames.indexOf('SPE_FORCE_BOLT');
const WAN_POLYMORPH = objectNames.indexOf('WAN_POLYMORPH');
const SPE_POLYMORPH = objectNames.indexOf('SPE_POLYMORPH');

// C: PICKLOCK_* return codes
const PICKLOCK_LEARNED_SOMETHING = -1;
const PICKLOCK_DID_NOTHING = 0;
const PICKLOCK_DID_SOMETHING = 1;

function Role_if(pm) {
    return (game.urole?.mnum ?? -1) === pm;
}

/** C ref: objnam.c yname — invent → "your ", else "the ". */
function yname(obj) {
    const carried = (game.invent || []).includes(obj);
    return `${carried ? 'your' : 'the'} ${cxname(obj)}`;
}

/** C ref: lock.c reset_pick */
export function reset_pick() {
    if (!game.xlock) game.xlock = {};
    const xl = game.xlock;
    xl.usedtime = 0;
    xl.chance = 0;
    xl.picktyp = 0;
    xl.magic_key = false;
    xl.door = null;
    xl.door_x = 0;
    xl.door_y = 0;
    xl.box = null;
}

/**
 * C ref: lock.c lock_action — occupation string for picklock.
 */
function lock_action() {
    const xl = game.xlock || {};
    // C: actions[] +2 → "locking …" when target currently unlocked
    if (xl.door && !(xl.door.doormask & D_LOCKED)) {
        return 'locking the door';
    }
    if (xl.box && !xl.box.olocked) {
        return xl.box.otyp === CHEST ? 'locking the chest' : 'locking the box';
    }
    if (xl.picktyp === LOCK_PICK || xl.picktyp === CREDIT_CARD) {
        return 'picking the lock';
    }
    if (xl.door) return 'unlocking the door';
    if (xl.box) {
        return xl.box.otyp === CHEST ? 'unlocking the chest' : 'unlocking the box';
    }
    return 'picking the lock';
}

/**
 * C ref: lock.c autokey — invent key/pick/card for autounlock.
 * Quest-artifact preference / is_magic_key ranking deferred.
 */
export function autokey(opening) {
    let key = null;
    let pick = null;
    let card = null;
    for (const o of game.invent || []) {
        if (!o) continue;
        if (o.otyp === SKELETON_KEY) {
            if (!key) key = o;
        } else if (o.otyp === LOCK_PICK) {
            if (!pick) pick = o;
        } else if (o.otyp === CREDIT_CARD) {
            if (!card) card = o;
        }
    }
    if (!opening) card = null;
    return key || pick || card || null;
}

/**
 * C ref: lock.c is_magic_key — Master Key bless/curse; ordinary tools false.
 * Full artifact Master Key body deferred (no oartifact check here).
 */
function is_magic_key(_mon, _obj) {
    return false;
}

/**
 * C ref: lock.c picking_lock — occupation is picklock; fills door cell.
 * @param {{ x: number, y: number }} out
 * @returns {boolean}
 */
export function picking_lock(out) {
    if (game.occupation === picklock) {
        const u = game.u || {};
        out.x = (u.ux | 0) + (u.dx | 0);
        out.y = (u.uy | 0) + (u.dy | 0);
        return true;
    }
    out.x = 0;
    out.y = 0;
    return false;
}

/**
 * C ref: lock.c picking_at — picklock occupation targets this door cell.
 */
export function picking_at(x, y) {
    if (game.occupation !== picklock) return false;
    const door = game.xlock?.door;
    const lev = game.level?.at?.(x, y);
    return !!(door && lev && door === lev);
}

/**
 * C ref: lock.c picklock — occupation callback; rn2(100) vs xlock.chance.
 * Door + floor-box paths. Deferred: magic-key trap disarm yn, b_trapped
 * door destroy, chest_trap on trapped box unlock.
 * @returns {number} 1 = still busy, 0 = done (C occupation continue)
 */
async function picklock() {
    const xl = game.xlock || {};
    const u = game.u || {};

    if (xl.box) {
        // C: box still on floor under hero
        if (xl.box.where !== OBJ_FLOOR
            || (xl.box.ox | 0) !== (u.ux | 0)
            || (xl.box.oy | 0) !== (u.uy | 0)) {
            xl.usedtime = 0;
            return 0;
        }
    } else {
        const dx = (u.dx | 0);
        const dy = (u.dy | 0);
        const tx = (u.ux | 0) + dx;
        const ty = (u.uy | 0) + dy;
        const door = game.level?.at(tx, ty);
        // C: door pointer identity — you moved away from the target door
        if (!door || door !== xl.door) {
            xl.usedtime = 0;
            return 0;
        }
        switch (door.doormask || 0) {
        case D_NODOOR:
            await pline('This doorway has no door.');
            xl.usedtime = 0;
            return 0;
        case D_ISOPEN:
            await pline('You cannot lock an open door.');
            xl.usedtime = 0;
            return 0;
        case D_BROKEN:
            await pline('This door is broken.');
            xl.usedtime = 0;
            return 0;
        default:
            break;
        }
    }

    xl.usedtime = (xl.usedtime || 0) + 1;
    if (xl.usedtime >= 50 || nohands(game.youmonst?.data)) {
        await pline(`You give up your attempt at ${lock_action()}.`);
        exercise(A_DEX, true);
        xl.usedtime = 0;
        return 0;
    }

    // C ref: lock.c picklock — if (rn2(100) >= gx.xlock.chance) still busy
    if (rn2(100) >= (xl.chance | 0)) {
        return 1;
    }

    // magic_key trap find / disarm deferred (ordinary pick → magic_key false)
    await pline(`You succeed in ${lock_action()}.`);
    if (xl.door) {
        const dx = (u.dx | 0);
        const dy = (u.dy | 0);
        const tx = (u.ux | 0) + dx;
        const ty = (u.uy | 0) + dy;
        const door = xl.door;
        if (door.doormask & D_TRAPPED) {
            // C: b_trapped("door", FINGER) → D_NODOOR + unblock
            door.doormask = D_NODOOR;
            await b_trapped('door', FINGER);
            recalc_block_point(tx, ty);
            vision_recalc(1);
        } else if (door.doormask & D_LOCKED) {
            door.doormask = D_CLOSED;
        } else {
            door.doormask = D_LOCKED;
        }
        // C: locked↔closed still blocks vision — no unblock_point
        newsym(tx, ty);
    } else if (xl.box) {
        // C: toggle olocked; chest_trap(FINGER) deferred when otrapped
        xl.box.olocked = !xl.box.olocked;
        xl.box.lknown = 1;
    }
    exercise(A_DEX, true);
    xl.usedtime = 0;
    return 0;
}

/**
 * C ref: cmd.c getdir — cmdq DIR/KEY then yn_function; self ./s; <>;
 * movecmd walk/run/rush; optional numpad when number_pad on.
 * Named omit: mouse `_` getpos; help_dir / cmdassist / "strange direction"
 * (NEED_MORE key-eating; throw path keeps getdir_cmdassist); trailing
 * confdir(FALSE) (use_whip already confdirs; adding it here would double
 * confuse-whip); CQ_REPEAT; fuzzer; dxdy_moveok.
 */
export async function getdir(prompt) {
    const q = game._cmdq_canned;
    if (q?.length) {
        const head = q[0];
        if (head && typeof head === 'object'
            && (head.typ === 'key' || head.typ === 'dir')) {
            q.shift();
            if (!game.u) game.u = {};
            if (head.typ === 'dir') {
                game.u.dx = head.dirx | 0;
                game.u.dy = head.diry | 0;
                game.u.dz = head.dirz | 0;
                return true;
            }
            const ch = typeof head.key === 'string'
                ? head.key
                : String.fromCharCode(head.key | 0);
            const key = typeof head.key === 'number'
                ? head.key
                : ch.charCodeAt(0);
            return apply_dirsym(ch, key);
        }
        if (head && typeof head === 'object' && head.typ) {
            // C: cmdq neither DIR nor KEY → cmdq_clear, fail
            game._cmdq_canned = [];
            return false;
        }
    }

    const msg = prompt || 'In what direction?';
    for (;;) {
        game._pending_message = `${msg} `;
        await flush_screen(1);
        const disp = game.nhDisplay;
        if (disp?.setCursor) {
            disp.setCursor(game._pending_message.length, 0);
        }
        const key = await nhgetch();
        const ch = String.fromCharCode(key);
        game._pending_message = '';
        // C: redraw_cmd (^R) → docrt then retry
        if (key === 18) continue;
        if (key === 27 || ch === ' ' || ch === '\n' || ch === '\r') {
            return false;
        }
        if (!game.u) game.u = {};
        return apply_dirsym(ch, key);
    }
}

/** C ref: cmd.c get_adjacent_loc — getdir (cmdassist) then adjacent cell. */
async function get_adjacent_loc(prompt, emsg) {
    // C: getdir(prompt) — invalid key → help_dir cmdassist then fail
    const dir = await getdir_cmdassist(prompt);
    if (!dir) {
        await pline('Never mind.');
        return null;
    }
    if (!game.u) game.u = {};
    game.u.dx = dir.dx | 0;
    game.u.dy = dir.dy | 0;
    game.u.dz = 0;
    const x = (game.u.ux || 0) + (game.u.dx || 0);
    const y = (game.u.uy || 0) + (game.u.dy || 0);
    if (x < 1 || x >= COLNO || y < 0 || y >= ROWNO) {
        if (emsg) await pline(emsg);
        return null;
    }
    return { x, y };
}

/**
 * C ref: lock.c doopen — #open / `o` command.
 * @returns {Promise<boolean>} true when C would return ECMD_TIME
 */
export async function doopen() {
    return doopen_indir(0, 0);
}

/**
 * C ref: lock.c doopen_indir — open a CLOSED door at (x,y).
 * Autoopen callers pass door coordinates (x > 0). Interactive `o`
 * uses get_adjacent_loc → getdir ("In what direction?").
 * Named omissions: loot-at-feet (u_at → doloot); pit reach; door-mimic
 * stumble; Confusion/Stunned always-TIME; portcullis/drawbridge;
 * feel_newsym mapseen gating; AUTOUNLOCK_KICK canned dokick.
 * Returns true when C would return ECMD_TIME (open attempt / lock setup).
 */
export async function doopen_indir(x, y) {
    // C: nohands(gy.youmonst.data) before getdir
    if (nohands(game.youmonst?.data)) {
        await pline("You can't open anything -- you have no hands!");
        return false;
    }

    let cc;
    // C: x > 0 && y >= 0 → caller supplied coords (autoopen); else getdir
    if (x > 0 && y >= 0) {
        cc = { x, y };
    } else {
        // C: get_adjacent_loc(dirprompt, NULL, u.ux, u.uy, &cc)
        // dirprompt NULL unless pit+container ("Open where? [.>]") — deferred
        cc = await get_adjacent_loc(null, null);
        if (!cc) return false; // Never mind. already plined
    }

    // C: u_at(cc) && (u.dz > 0 || !closed_door) → doloot() — deferred
    // C: u.utrap TT_PIT reach — deferred
    // C: stumble_on_door_mimic — deferred

    const loc = game.level?.at(cc.x, cc.y);
    if (!loc || !IS_DOOR(loc.typ)) {
        await pline('You see no door there.');
        return false;
    }
    // Rebind for door body below (autoopen used bare x,y)
    x = cc.x;
    y = cc.y;

    const mask = loc.doormask || 0;
    if (!(mask & D_CLOSED)) {
        let mesg;
        let locked = false;
        if (mask === D_BROKEN) mesg = ' is broken';
        else if (mask === D_NODOOR) mesg = 'way has no door';
        else if (mask === D_ISOPEN) mesg = ' is already open';
        else {
            mesg = ' is locked';
            locked = true;
        }
        await pline(`This door${mesg}.`);
        // C ref: lock.c doopen_indir — locked && flags.autounlock → pick_lock
        if (locked) {
            if (!game.flags) game.flags = {};
            // C options.c default AUTOUNLOCK_APPLY_KEY when unset
            const au = game.flags.autounlock ?? AUTOUNLOCK_APPLY_KEY;
            if (au) {
                const u = game.u || {};
                u.dz = 0;
                if ((au & AUTOUNLOCK_APPLY_KEY) !== 0) {
                    const unlocktool = autokey(true);
                    if (unlocktool) {
                        const pl = await pick_lock(unlocktool, x, y, null);
                        return pl !== 0;
                    }
                }
                // AUTOUNLOCK_KICK canned dokick deferred
            }
        }
        return false;
    }

    if (verysmall(game.youmonst?.data)) {
        await pline("You're too small to pull the door open.");
        return false;
    }

    // C: rnl(20) < (ACURRSTR + ACURR(A_DEX) + ACURR(A_CON)) / 3
    const chance = Math.trunc(
        (acurrstr() + acurr(A_DEX) + acurr(A_CON)) / 3,
    );
    if (rnl(20) < chance) {
        await pline('The door opens.');
        if (mask & D_TRAPPED) {
            // C: b_trapped("door", FINGER) → D_NODOOR
            loc.doormask = D_NODOOR;
            await b_trapped('door', FINGER);
        } else {
            loc.doormask = D_ISOPEN;
        }
        newsym(x, y);
        // C: feel_location + recalc_block_point(cc) then vision via full recalc
        recalc_block_point(x, y);
        vision_recalc(1);
    } else {
        exercise(A_STR, true);
        await pline('The door resists!');
    }
    return true;
}

/** C youprop.h Deaf */
function Deaf() {
    const u = game.u || {};
    return !!((u.HDeaf | 0) || (u.EDeaf | 0) || u.uroleplay?.deaf || u.Deaf);
}

/** C youprop.h Unaware — multi < 0 && (unconscious || fainted). */
function Unaware() {
    if ((game.multi | 0) >= 0) return false;
    const u = game.u || {};
    return !!(u.usleep || u.Unaware);
}

/** C hacklib.c dist2 — squared distance. */
function dist2_lock(x0, y0, x1, y1) {
    const dx = (x0 | 0) - (x1 | 0);
    const dy = (y0 | 0) - (y1 | 0);
    return dx * dx + dy * dy;
}

/**
 * C ref: pline.c You_hear — acoustics/Deaf; Unaware/Underwater deferred.
 */
async function You_hear(line) {
    if (Deaf() || game.flags?.acoustics === false) return;
    await pline(`You hear ${line}`);
}

/**
 * C monmove.c mb_trapped :54–74 — monster on a trapped door that
 * just exploded. doorlock :1215–1218 calls this so wake_nearto
 * lives here (loudness stays 0 in doorlock). Named: mondied /
 * lifesave; mon_learns_traps(TRAPPED_DOOR).
 */
async function mb_trapped(mtmp, canseeit) {
    if (game.flags?.verbose !== false) {
        if (canseeit && !Unaware()) {
            await pline_mon(mtmp, 'KABOOM!!  You see a door explode.');
        } else if (!Deaf()) {
            const far = dist2_lock(
                mtmp.mx, mtmp.my, game.u?.ux | 0, game.u?.uy | 0,
            ) > 7 * 7;
            await You_hear(`a ${far ? 'distant' : 'nearby'} explosion.`);
        }
    }
    await wake_nearto(mtmp.mx | 0, mtmp.my | 0, 7 * 7);
    mtmp.mstun = 1;
    mtmp.mhp -= rnd(15);
    if ((mtmp.mhp | 0) < 1) {
        mtmp.mhp = 0;
        mtmp.mx = 0;
        mtmp.my = 0;
        return true;
    }
    return false;
}

/**
 * C ref: lock.c obstructed — mon/obj blocks closing a door.
 * `quietly` (doorlock mysterywand) skips pline. Named omissions:
 * worm-tail phrasing; map_invisible; Something vs Some_Monnam.
 */
async function obstructed(x, y, quietly) {
    const mtmp = m_at(x, y);
    if (mtmp && M_AP_TYPE(mtmp) !== M_AP_FURNITURE) {
        if (M_AP_TYPE(mtmp) === M_AP_OBJECT) {
            if (!quietly) await pline("Something's in the way.");
            return true;
        }
        if (!quietly) await pline('Something blocks the way!');
        return true;
    }
    if ((objects_at(x, y) || []).length > 0) {
        if (!quietly) await pline("Something's in the way.");
        return true;
    }
    return false;
}

async function obstructed_close(x, y) {
    return obstructed(x, y, false);
}

/**
 * C ref: lock.c doclose — #close / `c` command.
 * Envelope: nohands/pit gates, getdir (cmdassist), door mask arms, close roll.
 * Named omissions: stumble_on_door_mimic; Blind feel_location/mapseen;
 * Confusion/Stunned always-TIME; portcullis/drawbridge; steed close path;
 * feel_newsym mapseen gating; Some_Monnam obstructed polish.
 * @returns {Promise<boolean>} true when C would return ECMD_TIME
 */
export async function doclose() {
    if (nohands(game.youmonst?.data)) {
        await pline("You can't close anything -- you have no hands!");
        return false;
    }
    const u = game.u || {};
    if (u.utrap && (u.utraptype | 0) === TT_PIT) {
        await pline("You can't reach over the edge of the pit.");
        return false;
    }

    // C: getdir(NULL) — cmdassist NHW_TEXT on invalid key, then cancel
    const dir = await getdir_cmdassist(null);
    if (!dir) return false;
    u.dx = dir.dx;
    u.dy = dir.dy;
    u.dz = 0;

    const x = (u.ux | 0) + (dir.dx | 0);
    const y = (u.uy | 0) + (dir.dy | 0);
    const Passes_walls = !!(u.Passes_walls
        || passes_walls(game.youmonst?.data));
    if (x === (u.ux | 0) && y === (u.uy | 0) && !Passes_walls) {
        await pline('You are in the way!');
        return true;
    }

    let res = false; // C: res starts ECMD_OK; Confusion→TIME deferred
    if (x < 1 || x >= COLNO || y < 0 || y >= ROWNO) {
        await pline('You see no door there.');
        return res;
    }

    const loc = game.level?.at(x, y);
    if (!loc || !IS_DOOR(loc.typ)) {
        // C: portcullis/drawbridge arms deferred
        await pline('You see no door there.');
        return res;
    }

    const mask = loc.doormask || 0;
    if (mask === D_NODOOR) {
        await pline('This doorway has no door.');
        return res;
    }
    if (await obstructed_close(x, y)) return res;
    if (mask === D_BROKEN) {
        await pline('This door is broken.');
        return res;
    }
    if (mask & (D_CLOSED | D_LOCKED)) {
        await pline('This door is already closed.');
        return res;
    }

    if (mask === D_ISOPEN) {
        if (verysmall(game.youmonst?.data) && !u.usteed) {
            await pline("You're too small to push the door closed.");
            return res;
        }
        // C: u.usteed || rn2(25) < (ACURRSTR + A_DEX + A_CON) / 3
        const chance = Math.trunc(
            (acurrstr() + acurr(A_DEX) + acurr(A_CON)) / 3,
        );
        if (u.usteed || rn2(25) < chance) {
            await pline('The door closes.');
            loc.doormask = D_CLOSED;
            newsym(x, y);
            recalc_block_point(x, y); // C: block_point
            vision_recalc(1);
        } else {
            exercise(A_STR, true);
            await pline('The door resists!');
        }
    }
    return true; // C: return ECMD_TIME after open-door arm
}

/**
 * C ref: lock.c pick_lock — door + floor-box autounlock (APPLY_KEY).
 * Deferred: AUTOUNLOCK_UNTRAP, interactive non-autounlock multi-box menu,
 * touch_artifact, magic-key ranking, lava/pool underfoot gates.
 * @param {object} pick key / lock pick / credit card
 * @param {number} [rx=0] autounlock x (0 → prompt getdir)
 * @param {number} [ry=0] autounlock y
 * @param {object|null} [container=null] box for #loot autounlock
 * @returns {number} PICKLOCK_* ; caller maps != 0 to ECMD_TIME
 */
export async function pick_lock(pick, rx = 0, ry = 0, container = null) {
    const picktyp = pick?.otyp ?? 0;
    const autounlock = (rx !== 0 || container != null);

    // C: resume interrupted attempt when usedtime && same picktyp
    if ((game.xlock?.usedtime | 0) && picktyp === game.xlock.picktyp) {
        if (nohands(game.youmonst?.data)) {
            await pline('Unfortunately, you can no longer hold the pick.');
            reset_pick();
            return PICKLOCK_LEARNED_SOMETHING;
        }
        const action = lock_action();
        await pline(`You resume your attempt at ${action}.`);
        game.xlock.magic_key = is_magic_key(null, pick);
        set_occupation(picklock, action, 0);
        return PICKLOCK_DID_SOMETHING;
    }

    if (nohands(game.youmonst?.data)) {
        await pline(`You can't hold ${doname(pick)} -- you have no hands!`);
        return PICKLOCK_DID_NOTHING;
    }

    let cc;
    if (rx !== 0) {
        cc = { x: rx, y: ry };
    } else {
        cc = await get_adjacent_loc(null, 'Invalid location!');
        if (!cc) return PICKLOCK_DID_NOTHING;
    }

    const u = game.u || {};
    let ch = 0;

    if (cc.x === u.ux && cc.y === u.uy) {
        // C ref: lock.c pick_lock — underfoot box path
        let c = 'n';
        let count = 0;
        for (let otmp = objects_at(cc.x, cc.y); otmp; otmp = otmp.nexthere) {
            if (autounlock && otmp !== container) continue;
            if (!Is_box(otmp)) continue;
            count++;
            if (!can_reach_floor(true)) {
                await pline(`You can't reach ${the(xname(otmp))} from up here.`);
                return PICKLOCK_LEARNED_SOMETHING;
            }
            // AUTOUNLOCK_UNTRAP trap-check deferred
            if (autounlock) {
                const au = game.flags?.autounlock ?? AUTOUNLOCK_APPLY_KEY;
                if ((au & AUTOUNLOCK_APPLY_KEY) !== 0) {
                    c = 'q';
                    if (pick) {
                        const { yn_function } = await import('./getline.js');
                        c = await yn_function(
                            `Unlock it with ${yname(pick)}?`,
                            'ynq',
                            'q',
                        );
                    }
                    if (c !== 'y') return PICKLOCK_DID_NOTHING;
                } else {
                    return PICKLOCK_DID_NOTHING;
                }
            } else {
                // interactive apply-to-box ynq deferred
                await pline("There doesn't seem to be any sort of lock here.");
                return PICKLOCK_LEARNED_SOMETHING;
            }

            if (otmp.obroken) {
                await pline(
                    `You can't fix its broken lock with ${yname(pick)}.`,
                );
                return PICKLOCK_LEARNED_SOMETHING;
            }
            if (picktyp === CREDIT_CARD && !otmp.olocked) {
                await pline(
                    `You can't do that with ${an(simple_typename(picktyp))}.`,
                );
                return PICKLOCK_LEARNED_SOMETHING;
            }

            // C: box chance — differs from door (4*DEX+25 rogue pick)
            switch (picktyp) {
            case CREDIT_CARD:
                ch = acurr(A_DEX) + 20 * (Role_if(PM_ROGUE) ? 1 : 0);
                break;
            case LOCK_PICK:
                ch = 4 * acurr(A_DEX) + 25 * (Role_if(PM_ROGUE) ? 1 : 0);
                break;
            case SKELETON_KEY:
                ch = 75 + acurr(A_DEX);
                break;
            default:
                ch = 0;
            }
            if (otmp.cursed) ch = Math.trunc(ch / 2);

            if (!game.xlock) game.xlock = {};
            game.xlock.box = otmp;
            game.xlock.door = null;
            game.xlock.door_x = 0;
            game.xlock.door_y = 0;
            break;
        }
        if (c !== 'y') {
            if (!count) {
                await pline("There doesn't seem to be any sort of lock here.");
            }
            return PICKLOCK_LEARNED_SOMETHING;
        }
    } else {
        const loc = game.level?.at(cc.x, cc.y);
        if (!loc || !IS_DOOR(loc.typ)) {
            await pline('You see no door there.');
            return PICKLOCK_LEARNED_SOMETHING;
        }

        // C ref: lock.c pick_lock — switch (door->doormask) exact cases
        const mask = loc.doormask || 0;
        switch (mask) {
        case D_NODOOR:
            await pline('This doorway has no door.');
            return PICKLOCK_LEARNED_SOMETHING;
        case D_ISOPEN:
            await pline('You cannot lock an open door.');
            return PICKLOCK_LEARNED_SOMETHING;
        case D_BROKEN:
            await pline('This door is broken.');
            return PICKLOCK_LEARNED_SOMETHING;
        default: {
            // CLOSED / LOCKED (+ TRAPPED): ynq then occupation
            // AUTOUNLOCK_UNTRAP door check deferred
            if (picktyp === CREDIT_CARD && !(mask & D_LOCKED)) {
                await pline("You can't lock a door with a credit card.");
                return PICKLOCK_LEARNED_SOMETHING;
            }

            let qbuf = (mask & D_LOCKED) ? 'Unlock it' : 'Lock it';
            if (autounlock) qbuf += ` with ${yname(pick)}`;
            qbuf += '?';

            const { yn_function } = await import('./getline.js');
            // C: ynq → yn_function(..., ynqchars, 'q')
            const c = await yn_function(qbuf, 'ynq', 'q');
            if (c !== 'y') return PICKLOCK_DID_NOTHING;

            switch (picktyp) {
            case CREDIT_CARD:
                ch = 2 * acurr(A_DEX) + 20 * (Role_if(PM_ROGUE) ? 1 : 0);
                break;
            case LOCK_PICK:
                ch = 3 * acurr(A_DEX) + 30 * (Role_if(PM_ROGUE) ? 1 : 0);
                break;
            case SKELETON_KEY:
                ch = 70 + acurr(A_DEX);
                break;
            default:
                ch = 0;
            }

            if (!game.xlock) game.xlock = {};
            game.xlock.door = loc;
            game.xlock.door_x = cc.x;
            game.xlock.door_y = cc.y;
            game.xlock.box = null;
            break;
        }
        }
    }

    // C: svc.context.move = 0 before occupation setup
    if (!game.context) game.context = {};
    game.context.move = 0;
    game.xlock.chance = ch;
    game.xlock.picktyp = picktyp;
    game.xlock.magic_key = is_magic_key(null, pick);
    game.xlock.usedtime = 0;
    set_occupation(picklock, lock_action(), 0);
    return PICKLOCK_DID_SOMETHING;
}

/** C ref: objnam.c an / simple_typename stub for pick messages. */
function an(s) {
    if (!s) return s;
    const c = s.charAt(0).toLowerCase();
    return `${'aeiou'.includes(c) ? 'an' : 'a'} ${s}`;
}
function the(s) {
    return `the ${s}`;
}
function simple_typename(otyp) {
    const n = objectNames[otyp];
    if (!n) return 'tool';
    return n.toLowerCase().replace(/_/g, ' ');
}

/** C ref: obj.h Is_box — LARGE_BOX / CHEST. */
function Is_box(obj) {
    const n = objectNames[obj?.otyp];
    return n === 'LARGE_BOX' || n === 'CHEST';
}

/**
 * C ref: lock.c boxlock — wand/spell lock/unlock on a box.
 * Callers: zap.c bhito WAN_OPENING/WAN_LOCKING/SPE_KNOCK/
 * SPE_WIZARD_LOCK (D-1467); zap.c boxlock_invent (D-1434 /
 * D-0981); zap.c bhito poly-arm (D-1483). Named: Soundeffect.
 * @returns {Promise<boolean>} true if something happened
 */
export async function boxlock(obj, otmp) {
    if (!obj || !otmp || !Is_box(obj)) return false;
    let res = false;
    switch (otmp.otyp | 0) {
    case WAN_LOCKING:
    case SPE_WIZARD_LOCK:
        if (!obj.olocked) {
            await pline('Klunk!');
            obj.olocked = 1;
            obj.obroken = 0;
            obj.lknown = Role_if(PM_WIZARD) ? 1 : 0;
            res = true;
        }
        break;
    case WAN_OPENING:
    case SPE_KNOCK:
        if (obj.olocked) {
            await pline('Klick!');
            obj.olocked = 0;
            res = true;
            obj.lknown = Role_if(PM_WIZARD) ? 1 : 0;
        } else {
            obj.obroken = 0; // silently fix if broken
        }
        break;
    case WAN_POLYMORPH:
    case SPE_POLYMORPH:
        if (game.xlock?.box === obj) reset_pick();
        break;
    default:
        break;
    }
    return res;
}

/**
 * C ref: zap.c boxlock_invent — (un)lock all carried boxes.
 * Named omit: update_inventory UI refresh (lknown may change).
 */
export async function boxlock_invent(obj) {
    if (!obj) return;
    for (const otmp of [...(game.invent || [])]) {
        if (Is_box(otmp)) await boxlock(otmp, obj);
    }
}

/**
 * C lock.c doorlock :1103–1272 — wand/spell on a door or secret door.
 * Returns true if something happened.
 * Branch envelope (D-1462 + D-1475 + D-1482): WAN_OPENING/SPE_KNOCK
 * SDOOR appear + locked unlock; WAN_LOCKING/SPE_WIZARD_LOCK SDOOR
 * no-op, Rogue hide, obstructed, trap-in-doorway, lock-shut
 * (`:1135–1192`); WAN_STRIKING/SPE_FORCE_BOLT SDOOR appear then
 * continue, trapped explode / D_BROKEN crash (`:1201–1253`),
 * loudness wake_nearto + shop add_damage(0) (`:1260–1265`).
 * picking_at → stop_occupation + reset_pick (`:1267–1271`; SDOOR
 * OPENING/KNOCK and Rogue LOCKING early return skip this). mbhit
 * doorlock is D-1484. Named: mondied / mon_learns_traps in mb_trapped;
 * Soundeffect. obstructed Some_Monnam / worm-tail / map_invisible.
 */
export async function doorlock(otmp, x, y) {
    const door = game.level?.at?.(x, y);
    if (!door || !otmp) return false;
    let res = true;
    let loudness = 0;
    let msg = null;
    const otyp = otmp.otyp | 0;
    const dustcloud = 'A cloud of dust';
    const quickly_dissipates = 'quickly dissipates';
    const mysterywand = (otmp.oclass === WAND_CLASS && !otmp.dknown);

    if ((door.typ | 0) === SDOOR) {
        switch (otyp) {
        case WAN_OPENING:
        case SPE_KNOCK:
        case WAN_STRIKING:
        case SPE_FORCE_BOLT:
            door.typ = DOOR;
            door.doormask = D_CLOSED | ((door.doormask | 0) & D_TRAPPED);
            newsym(x, y);
            if (cansee(x, y)) {
                await pline('A door appears in the wall!');
            }
            /* C :1124–1126 — OPENING/KNOCK return; striking continues. */
            if (otyp === WAN_OPENING || otyp === SPE_KNOCK) return true;
            break;
        case WAN_LOCKING:
        case SPE_WIZARD_LOCK:
        default:
            /* C :1127–1130 — LOCKING/default on SDOOR is a no-op. */
            return false;
        }
    }

    switch (otyp) {
    case WAN_LOCKING:
    case SPE_WIZARD_LOCK:
        /* C lock.c doorlock :1135–1192 (D-1475). */
        if (Is_rogue_level(game.u?.uz)) {
            const vis = cansee(x, y);
            if (vis) {
                await pline(
                    `${dustcloud} springs up in the older, more primitive doorway.`,
                );
            } else {
                await You_hear('a swoosh.');
            }
            if (await obstructed(x, y, mysterywand)) {
                if (vis) {
                    await pline(`The cloud ${quickly_dissipates}.`);
                }
                return false;
            }
            recalc_block_point(x, y); /* C block_point */
            door.typ = SDOOR;
            door.doormask = D_NODOOR;
            if (vis) {
                await pline('The doorway vanishes!');
            }
            newsym(x, y);
            return true;
        }
        if (await obstructed(x, y, mysterywand)) return false;
        /* Don't allow doors to close over traps. */
        if (t_at(x, y)) {
            await pline(
                `${dustcloud} springs up in the doorway, but ${quickly_dissipates}.`,
            );
            return false;
        }

        switch ((door.doormask | 0) & ~D_TRAPPED) {
        case D_CLOSED:
            msg = 'The door locks!';
            break;
        case D_ISOPEN:
            msg = 'The door swings shut, and locks!';
            break;
        case D_BROKEN:
            msg = 'The broken door reassembles and locks!';
            break;
        case D_NODOOR:
            msg = 'A cloud of dust springs up and assembles itself into a door!';
            break;
        default:
            res = false;
            break;
        }
        recalc_block_point(x, y); /* C block_point */
        door.doormask = D_LOCKED | ((door.doormask | 0) & D_TRAPPED);
        newsym(x, y);
        break;
    case WAN_OPENING:
    case SPE_KNOCK:
        if ((door.doormask | 0) & D_LOCKED) {
            msg = 'The door unlocks!';
            door.doormask = D_CLOSED | ((door.doormask | 0) & D_TRAPPED);
        } else {
            res = false;
        }
        break;
    case WAN_STRIKING:
    case SPE_FORCE_BOLT:
        /* C lock.c doorlock :1201–1253 (D-1482). */
        if ((door.doormask | 0) & (D_LOCKED | D_CLOSED)) {
            let sawit;
            let seeit;
            if ((door.doormask | 0) & D_TRAPPED) {
                const mtmp = m_at(x, y);
                sawit = mtmp ? canseemon(mtmp) : cansee(x, y);
                door.doormask = D_NODOOR;
                recalc_block_point(x, y); /* C unblock_point */
                newsym(x, y);
                seeit = mtmp ? canseemon(mtmp) : cansee(x, y);
                if (mtmp) {
                    await mb_trapped(mtmp, sawit || seeit);
                } else {
                    /* for mtmp, mb_trapped() does its own wake_nearto() */
                    loudness = 40;
                    if (game.flags?.verbose !== false) {
                        if ((sawit || seeit) && !Unaware()) {
                            await pline('KABOOM!!  You see a door explode.');
                        } else if (!Deaf()) {
                            const far = dist2_lock(
                                x, y, game.u?.ux | 0, game.u?.uy | 0,
                            ) > 7 * 7;
                            await You_hear(
                                `a ${far ? 'distant' : 'nearby'} explosion.`,
                            );
                        }
                    }
                }
                break;
            }
            sawit = cansee(x, y);
            door.doormask = D_BROKEN;
            recalc_block_point(x, y);
            seeit = cansee(x, y);
            newsym(x, y);
            if (game.flags?.verbose !== false) {
                if ((sawit || seeit) && !Unaware()) {
                    await pline('The door crashes open!');
                } else if (!Deaf()) {
                    await You_hear('a crashing sound.');
                }
            }
            /* force vision recalc before printing more messages */
            if (game.vision_full_recalc) vision_recalc(0);
            loudness = 20;
        } else {
            res = false;
        }
        break;
    default:
        /* C :1254–1256 impossible — unknown otyp. */
        res = false;
        break;
    }
    if (msg && cansee(x, y)) {
        await pline(msg);
    }
    if (loudness > 0) {
        /* C :1260–1265 — door was destroyed. */
        await wake_nearto(x, y, loudness);
        if (in_rooms(x, y, SHOPBASE)) {
            const { add_damage } = await import('./shk.js');
            add_damage(x, y, 0);
        }
    }
    if (res && picking_at(x, y)) {
        await stop_occupation();
        reset_pick();
    }
    return res;
}

/** C ref: obj.h is_weptool */
function is_weptool(obj) {
    if (!obj || obj.oclass !== TOOL_CLASS) return false;
    const sk = game.objects?.[obj.otyp]?.oc_skill;
    return sk != null && sk !== P_NONE;
}

/** C ref: obj.h is_pick */
function is_pick(obj) {
    return (game.objects?.[obj?.otyp]?.oc_skill ?? 0) === P_PICK_AXE;
}

/** C ref: obj.h is_blade */
function is_blade(obj) {
    if (!obj || obj.oclass !== WEAPON_CLASS) return false;
    const sk = game.objects?.[obj.otyp]?.oc_skill ?? 0;
    return sk >= P_DAGGER && sk <= P_SABER;
}

/** C ref: obj.h greatest_erosion — max(oeroded, oeroded2). */
function greatest_erosion(obj) {
    const a = obj?.oeroded | 0;
    const b = obj?.oeroded2 | 0;
    return a > b ? a : b;
}

/**
 * C ref: invent.c useup — invent/wield consume one (no obj_resists).
 * Floor useupf deferred; #force blade-break only hits wielded invent.
 */
function useup_invent(otmp) {
    if (!otmp) return;
    if ((otmp.quan || 1) > 1) {
        otmp.quan--;
        return;
    }
    if (game.u?.uwep === otmp) setuwep(null);
    const inv = game.invent || [];
    const idx = inv.indexOf(otmp);
    if (idx >= 0) inv.splice(idx, 1);
    otmp.quan = 0;
    otmp.where = OBJ_FREE;
}

/**
 * C ref: mon.c wake_nearby / wake_nearto_core — clear sleep/wait within
 * ulevel*20. G_UNIQ keep STRAT_WAITMASK (quest leaders stay meditating).
 * Named omissions: wake_msg; disturb_buried_zombies; petcall whistletime.
 */
function wake_nearby(_petcall) {
    const u = game.u || {};
    const x = u.ux | 0;
    const y = u.uy | 0;
    const distance = ((u.ulevel | 0) * 20) | 0;
    for (const mtmp of game.fmon || []) {
        if (!mtmp || mtmp.mx == null) continue;
        const dx = (mtmp.mx | 0) - x;
        const dy = (mtmp.my | 0) - y;
        if (distance === 0 || dx * dx + dy * dy < distance) {
            mtmp.msleeping = 0;
            const geno = mtmp.data?.geno | 0;
            if (!(geno & G_UNIQ) && mtmp.mstrategy != null) {
                mtmp.mstrategy &= ~STRAT_WAITMASK;
            }
        }
    }
    void _petcall;
}

/* C objclass.h enum obj_material_types — shatter disposition subset. */
const MAT_WAX = 2;
const MAT_VEGGY = 3;
const MAT_FLESH = 4;
const MAT_PAPER = 5;
const MAT_WOOD = 8;
const MAT_GLASS = 19;

/**
 * C ref: lock.c chest_shatter_msg — destroy-path content messages.
 * Temporarily Blind so xname does not observe_object (appearance leak).
 * potionbreathe / Blind hear-vs-see polish deferred (pline only).
 */
async function chest_shatter_msg(otmp) {
    if (otmp.oclass === POTION_CLASS) {
        await pline(`You see ${an(xname(otmp))} shatter!`);
        return;
    }
    // C: save Blind props; force Blind for singular(xname) only.
    const u = game.u || (game.u = {});
    const save_HBlinded = u.HBlinded | 0;
    const save_BBlinded = u.BBlinded | 0;
    const save_Blind = u.Blind;
    u.HBlinded = 1;
    u.BBlinded = 0;
    u.Blind = true; // JS xname checks sticky Blind (not props)
    const thing = singular(otmp, xname);
    u.HBlinded = save_HBlinded;
    u.BBlinded = save_BBlinded;
    u.Blind = save_Blind;
    const mat = game.objects?.[otmp.otyp]?.oc_material | 0;
    let disposition = 'is destroyed';
    if (mat === MAT_PAPER) disposition = 'is torn to shreds';
    else if (mat === MAT_WAX) disposition = 'is crushed';
    else if (mat === MAT_VEGGY) disposition = 'is pulped';
    else if (mat === MAT_FLESH) disposition = 'is mashed';
    else if (mat === MAT_GLASS) disposition = 'shatters';
    else if (mat === MAT_WOOD) disposition = 'splinters to fragments';
    // C: pline("%s %s!", An(thing), disposition);
    const named = an(thing);
    await pline(`${named.charAt(0).toUpperCase()}${named.slice(1)} ${disposition}!`);
}

/**
 * C ref: lock.c breakchestlock — unlock+break or destroy box + spill.
 * Named omissions: costly_alteration COST_BRKLCK; ice-box
 * corpse age / start_corpse_timeout; potionbreathe on shatter.
 * Shop stolen_value on shatter/destroy (D-0983).
 */
export async function breakchestlock(box, destroyit) {
    if (!destroyit) {
        // C: costly_alteration(COST_BRKLCK) deferred
        box.olocked = 0;
        box.obroken = 1;
        box.lknown = 1;
        return;
    }
    const u = game.u || {};
    const { costly_spot, shop_keeper, stolen_value } = await import('./shk.js');
    const ushop = (u.ushops || '')[0];
    const shkp = (ushop && costly_spot(u.ux | 0, u.uy | 0))
        ? shop_keeper(ushop)
        : null;
    const costly = !!shkp;
    const peaceful_shk = !!(costly && shkp.mpeaceful);
    let loss = 0;
    const currency = (amt) => ((amt | 0) === 1 ? 'zorkmid' : 'zorkmids');

    await pline(`In fact, you've totally destroyed ${the(xname(box))}.`);
    while (box.cobj) {
        const otmp = box.cobj;
        obj_extract_self(otmp);
        if (!rn2(3) || otmp.oclass === POTION_CLASS) {
            await chest_shatter_msg(otmp);
            if (costly) {
                loss += await stolen_value(
                    otmp, u.ux | 0, u.uy | 0, peaceful_shk, true,
                );
            }
            if ((otmp.quan || 1) === 1) {
                // C: obfree — no obj_resists
                otmp.quan = 0;
                otmp.where = OBJ_FREE;
                continue;
            }
            useup_invent(otmp);
            // remaining stack still placed below when quan>1 after useup
            if ((otmp.quan || 0) <= 0) continue;
        }
        // ICE_BOX corpse age deferred
        place_object(otmp, u.ux | 0, u.uy | 0);
        stackobj(otmp);
    }
    if (costly) {
        loss += await stolen_value(
            box, u.ux | 0, u.uy | 0, peaceful_shk, true,
        );
    }
    if (loss) {
        await pline(
            `You owe ${loss} ${currency(loss)} for objects destroyed.`,
        );
    }
    delobj(box);
}

/**
 * C ref: lock.c forcelock — occupation; rn2(100) vs xlock.chance.
 * Blade erosion break + blunt wake_nearby; then breakchestlock.
 * @returns {number} 1 = still busy, 0 = done
 */
async function forcelock() {
    const xl = game.xlock || {};
    const u = game.u || {};
    const box = xl.box;
    if (!box
        || (box.ox | 0) !== (u.ux | 0)
        || (box.oy | 0) !== (u.uy | 0)) {
        xl.usedtime = 0;
        return 0;
    }

    xl.usedtime = (xl.usedtime || 0) + 1;
    const uwep = u.uwep;
    if (xl.usedtime >= 50 || !uwep || nohands(game.youmonst?.data)) {
        await pline('You give up your attempt to force the lock.');
        if (xl.usedtime >= 50) {
            exercise(xl.picktyp ? A_DEX : A_STR, true);
        }
        xl.usedtime = 0;
        return 0;
    }

    if (xl.picktyp) {
        // C: blade — may break weapon (rn2 then cursed short-circuit then resist)
        if (rn2(1000 - (uwep.spe | 0)) > (992 - greatest_erosion(uwep) * 10)
            && !uwep.cursed
            && !obj_resists(uwep, 0, 99)) {
            const plural = (uwep.quan || 1) > 1;
            await pline(
                `${plural ? 'One of y' : 'Y'}our ${xname(uwep)} broke!`,
            );
            useup_invent(uwep);
            await pline('You give up your attempt to force the lock.');
            exercise(A_DEX, true);
            xl.usedtime = 0;
            return 0;
        }
    } else {
        // blunt — hammering wakes nearby monsters (no RNG)
        wake_nearby(false);
    }

    // C ref: lock.c forcelock — if (rn2(100) >= gx.xlock.chance) still busy
    if (rn2(100) >= (xl.chance | 0)) {
        return 1;
    }

    await pline('You succeed in forcing the lock.');
    exercise(xl.picktyp ? A_DEX : A_STR, true);
    // C: destroyit = !picktyp && !rn2(3) — rn2 only when blunt
    const destroyit = !xl.picktyp && !rn2(3);
    await breakchestlock(box, destroyit);
    reset_pick();
    return 0;
}

/** C ref: lock.c u_have_forceable_weapon */
function u_have_forceable_weapon() {
    const uwep = game.u?.uwep;
    if (!uwep) return false;
    if (uwep.oclass === WEAPON_CLASS || is_weptool(uwep)) {
        const sk = game.objects?.[uwep.otyp]?.oc_skill ?? 0;
        if (sk < P_DAGGER || sk === P_FLAIL || sk > P_LANCE) return false;
        return true;
    }
    return uwep.oclass === ROCK_CLASS;
}

/**
 * C ref: lock.c doforce — #force chest lock with wielded weapon.
 * Branch envelope: swallow / no-weapon / can't-reach → ECMD_OK; resume
 * interrupted forcelock; scan underfoot boxes; set_occupation(forcelock);
 * no box → "You decide not to force the issue." + ECMD_TIME.
 * Named omissions: door force with edged weapon (C TODO).
 */
export async function doforce() {
    const u = game.u;
    if (!u) return ECMD_OK;

    if (u.uswallow) {
        await pline("You can't force anything from inside here.");
        return ECMD_OK;
    }
    if (!u_have_forceable_weapon()) {
        const uwep = u.uwep;
        const use_plural = !!(uwep && (uwep.quan || 1) > 1);
        let mid;
        if (!uwep) mid = 'when not wielding a';
        else if (uwep.oclass !== WEAPON_CLASS && !is_weptool(uwep)) {
            mid = use_plural ? 'without proper' : 'without a proper';
        } else {
            mid = use_plural ? 'with those' : 'with that';
        }
        await pline(
            `You can't force anything ${mid} weapon${use_plural ? 's' : ''}.`,
        );
        return ECMD_OK;
    }
    if (!can_reach_floor(true)) {
        await pline("You can't reach the floor.");
        return ECMD_OK;
    }

    const uwep = u.uwep;
    const picktyp = !!(is_blade(uwep) && !is_pick(uwep));

    // C: resume interrupted attempt when usedtime && same picktyp
    if ((game.xlock?.usedtime | 0) && game.xlock.box && picktyp === !!game.xlock.picktyp) {
        await pline('You resume your attempt to force the lock.');
        set_occupation(forcelock, 'forcing the lock', 0);
        return ECMD_TIME;
    }

    if (!game.xlock) game.xlock = {};
    game.xlock.box = null;

    for (let otmp = objects_at(u.ux, u.uy); otmp; otmp = otmp.nexthere) {
        if (!Is_box(otmp)) continue;
        if (otmp.obroken || !otmp.olocked) {
            otmp.lknown = 0;
            await pline(
                `There is ${doname(otmp)} here, but its lock is already ${
                    otmp.obroken ? 'broken' : 'unlocked'
                }.`,
            );
            otmp.lknown = 1;
            continue;
        }
        otmp.lknown = 1;
        const { yn_function } = await import('./getline.js');
        const c = await yn_function(
            `There is ${doname(otmp)} here; force its lock?`,
            'ynq',
            'q', // C: ynq() → yn_function(..., 'q', TRUE)
        );
        if (c === 'q') return ECMD_OK;
        if (c === 'n') continue;
        if (picktyp) {
            await pline(`You force ${yname(uwep)} into a crack and pry.`);
        } else {
            await pline(`You start bashing it with ${yname(uwep)}.`);
        }
        game.xlock.box = otmp;
        // C: chance = objects[uwep->otyp].oc_wldam * 2
        game.xlock.chance = ((game.objects?.[uwep.otyp]?.oc_wldam | 0) * 2) | 0;
        game.xlock.picktyp = picktyp;
        game.xlock.magic_key = false;
        game.xlock.usedtime = 0;
        game.xlock.door = null;
        break;
    }

    if (game.xlock.box) {
        set_occupation(forcelock, 'forcing the lock', 0);
    } else {
        await pline('You decide not to force the issue.');
    }
    return ECMD_TIME;
}
