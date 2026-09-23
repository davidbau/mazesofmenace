// lock.js — Lock picking, door open/close.
// C ref: lock.c pick_lock / picklock / doopen_indir / doclose /
//        boxlock / doorlock (subset).

import { game } from './gstate.js';
import { nhgetch } from './input.js';
import { pline, You, You_cant, There, pline_The, newsym, feel_newsym, canseemon, clear_nhwindow_message, verbalize, feel_location, impossible, flush_screen, docrt_flags, docrtRefresh } from './display.js';
import { yn_function } from './getline.js';
import { vision_recalc, recalc_block_point, cansee } from './vision.js';
import { stop_occupation, in_rooms, closed_door, confdir, is_lava, is_pool } from './hack.js';
import {
    COLNO, ROWNO, IS_DOOR, ECMD_OK, ECMD_TIME, OBJ_FLOOR, OBJ_FREE,
    DOOR, SDOOR, Is_rogue_level, SHOPBASE,
    D_NODOOR, D_BROKEN, D_ISOPEN, D_CLOSED, D_LOCKED, D_TRAPPED,
    DRAWBRIDGE_UP, DRAWBRIDGE_DOWN,
    P_DAGGER, P_FLAIL, P_LANCE, P_PICK_AXE, P_SABER, P_NONE,
    AUTOUNLOCK_APPLY_KEY, AUTOUNLOCK_UNTRAP, STRAT_WAITMASK, TT_PIT, M_AP_TYPE,
    M_AP_FURNITURE, M_AP_OBJECT, FINGER, S_hcdoor, S_vcdoor,
    CMDQ_DIR, CMDQ_KEY, CQ_CANNED, CQ_REPEAT,
    xytodir, getdirInp, u_at,
    CLICK_1, CLICK_2, N_DIRS, MV_WALK, xdir, ydir, zdir,
    NHKF_ESC, NHKF_GETDIR_SELF, NHKF_GETDIR_SELF2, NHKF_GETDIR_HELP,
    NHKF_GETDIR_MOUSE, NHKF_GETPOS_PICK, NHKF_GETPOS_PICK_Q,
    NHKF_GETPOS_PICK_O, NHKF_GETPOS_PICK_V,
} from './const.js';
import { cmdq_pop, cmdq_clear } from './cmd.js';
import { rnl, rn2, rnd } from './rng.js';
import { acurr, acurrstr, A_STR, A_DEX, A_CON, exercise } from './attrib.js';
import { verysmall, nohands, passes_walls, G_UNIQ, breathless, haseyes } from './monsters.js';
import {
    objects_at, place_object, stackobj, obj_extract_self, delobj,
} from './mkobj.js';
import { can_reach_floor, set_occupation } from './engrave.js';
import {
    WEAPON_CLASS, ROCK_CLASS, TOOL_CLASS, POTION_CLASS, WAND_CLASS,
    objectNames,
} from './objects.js';
import { doname, xname, cxname, singular, An, an, an as canon_an, the, yname, ysimple_name, ansimpleoname, simple_typename, safe_qbuf } from './objnam.js';
import { potionbreathe, bottlename } from './potion.js';
import { obj_resists } from './dogmove.js';
import { setuwep } from './wield.js';
import { PM_ROGUE, PM_WIZARD, PM_GRID_BUG, monsterNames } from './generated/monsters_data.js';
import { mon_nam, hliquid } from './do_name.js';
import { SetVoice } from './sndprocs.js';
import { stumble_onto_mimic } from './uhitm.js';
// C youprop.h:355-360 Protection_from_shape_changers = H || E
// (uprops[PROT_FROM_SHAPE_CHANGERS].intrinsic || .extrinsic); canonical
// export, hoisted fn cycle-safe per imports.mjs (D-2373 follow-up).
import { Protection_from_shape_changers } from './were.js';
import { update_mapseen_for } from './dungeon.js';
import { is_drawbridge_wall, is_db_wall } from './dbridge.js';
import { m_at, wake_nearto } from './mon.js';
// C ref: monmove.c mb_trapped `:54–74` — canonical trapped-door export
// (KABOOM/hear, wake_nearto 49, mstun, rnd(15), mondied/lifesave,
// mon_learns_traps TRAPPED_DOOR); hoisted fn, cycle-safe per imports.mjs.
import { mb_trapped } from './monmove.js';
import { b_trapped, t_at, could_untrap, untrap } from './trap.js';
import { currency, cmdq_add_key } from './invent.js';
import { show_text_pages, dowhatdoes_core } from './pager.js';
import { visctrl, cmdbind_get, cmd_from_dir } from './dokeylist.js';
import { getpos } from './getpos.js';
import { highc } from './hacklib.js';
import { doloot, container_at } from './pickup.js';
import { is_magic_key, touch_artifact } from './artifact.js';
import { is_quest_artifact } from './quest.js';
import { ART_ORB_OF_DETECTION } from './generated/artifacts_data.js';

/** C ref: decl.c:96 quitchars — `getdir :4098` skips help when set. */
export const QUITCHARS = ' \r\n\x1b';

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

/** C ref: cmd.c spkeys_binds defaults — getdir self/help/mouse/esc. */
const GETDIR_SPKEY_DEFAULT = {
    [NHKF_ESC]: 27,
    [NHKF_GETDIR_SELF]: '.'.charCodeAt(0),
    [NHKF_GETDIR_SELF2]: 's'.charCodeAt(0),
    [NHKF_GETDIR_HELP]: '?'.charCodeAt(0),
    [NHKF_GETDIR_MOUSE]: '_'.charCodeAt(0),
};

/** C ref: cmd.c spkeys_binds defaults — getpos pick keys used by the getdir mouse arm (mirrors getpos.js private). */
const GETPOS_SPKEY_DEFAULT_FOR_GETDIR = {
    [NHKF_GETPOS_PICK]: '.'.charCodeAt(0),
    [NHKF_GETPOS_PICK_Q]: ','.charCodeAt(0),
    [NHKF_GETPOS_PICK_O]: ';'.charCodeAt(0),
    [NHKF_GETPOS_PICK_V]: ':'.charCodeAt(0),
};

/** C ref: cmd.c gc.Cmd.spkeys[nhkf] with spkeys_binds default. */
function getdir_spkey(nhkf) {
    const v = game.Cmd?.spkeys?.[nhkf];
    if (v != null && v !== 0) return v & 0xff;
    return GETDIR_SPKEY_DEFAULT[nhkf] & 0xff;
}

/** C ref: cmd.c gc.Cmd.spkeys[nhkf] for the getpos pick keys (mouse arm). */
function getpos_spkey_for_getdir(nhkf) {
    const v = game.Cmd?.spkeys?.[nhkf];
    if (v != null && v !== 0) return v & 0xff;
    return GETPOS_SPKEY_DEFAULT_FOR_GETDIR[nhkf] & 0xff;
}

/**
 * C ref: cmd.c reset_commands sdir/ndir — `!num_pad ? sdir : ndir`
 * (`sdir="hykulnjb><"`, `ndir="47896321><"`; swap_yz/phone_layout named).
 */
const GETDIR_SDIR = 'hykulnjb><';
const GETDIR_NDIR = '47896321><';

/** C ref: cmd.c move_funcs rows — extcmd txt per direction (0..7 compass). */
const GETDIR_WALK = ['movewest', 'movenorthwest', 'movenorth', 'movenortheast', 'moveeast', 'movesoutheast', 'movesouth', 'movesouthwest'];
const GETDIR_RUN = ['runwest', 'runnorthwest', 'runnorth', 'runnortheast', 'runeast', 'runsoutheast', 'runsouth', 'runsouthwest'];
const GETDIR_RUSH = ['rushwest', 'rushnorthwest', 'rushnorth', 'rushnortheast', 'rusheast', 'rushsoutheast', 'rushsouth', 'rushsouthwest'];

/**
 * C ref: cmd.c movecmd `:3868–3898` (sym, MV_ANY) via live cmdbind_get —
 * walk/run/rush rows of move_funcs plus dodown/doup (`down`/`up` txt).
 * Sets u.dx/dy/dz from xdir/ydir/zdir, returns !u.dz; else u.dz=0, 0.
 * num_pad digits fall back to NUMPAD_DIR (dokeylist omits digit layouts).
 * Name kept (callers stay wired); C `movecmd` has no separate JS export.
 */
function apply_dirsym(ch) {
    const u = game.u || (game.u = {});
    const code = (typeof ch === 'string' && ch.length ? ch.charCodeAt(0) : 0) & 0xff;
    if (!code) {
        u.dz = 0;
        return false;
    }
    const txt = cmdbind_get(code)?.txt || '';
    let d = -1;
    if (txt) {
        const wi = GETDIR_WALK.indexOf(txt);
        const ri = GETDIR_RUN.indexOf(txt);
        const hi = GETDIR_RUSH.indexOf(txt);
        if (wi >= 0) d = wi;
        else if (ri >= 0) d = ri;
        else if (hi >= 0) d = hi;
        else if (txt === 'down') d = 8;
        else if (txt === 'up') d = 9;
    }
    if (d >= 0 && d < 10) {
        u.dx = xdir[d] | 0;
        u.dy = ydir[d] | 0;
        u.dz = zdir[d] | 0;
        return !(u.dz | 0);
    }
    const numPad = !!(game.iflags?.num_pad || game.Cmd?.num_pad);
    if (numPad) {
        const nd = NUMPAD_DIR[ch];
        if (nd) {
            u.dx = nd.dx;
            u.dy = nd.dy;
            u.dz = 0;
            return true;
        }
    }
    u.dz = 0;
    return false;
}

/**
 * C ref: cmd.c redraw_cmd `:3910–3918` via live cmdbind_get —
 * true when the key is bound to doredraw (`redraw` txt). No second
 * clone of getpos.js `redraw_cmd`; this is the shared C body.
 */
function getdir_is_redraw(code) {
    if (!code) return false;
    return cmdbind_get(code & 0xff)?.txt === 'redraw';
}

/**
 * C ref: cmd.c dxdy_moveok `:3901–3907` — NODIAG(u.umonnum) (hack.h:
 * only PM_GRID_BUG) zeros a diagonal and returns u.dx || u.dy.
 * getdir `:4112` You_cant when this is false after a horizontal movecmd.
 */
export function dxdy_moveok() {
    const u = game.u || (game.u = {});
    if (u.dx && u.dy && (u.umonnum | 0) === PM_GRID_BUG) {
        u.dx = u.dy = 0;
    }
    return !!(u.dx || u.dy);
}

/**
 * C ref: cmd.c show_direction_keys `:4122–4165` (staticfn) — the grid
 * help_dir `:4268` prints. C reads the live bindings with
 * visctrl(cmd_from_func(do_move_*)); JS uses live cmd_from_dir(dir,
 * MV_WALK) through visctrl — the same move_funcs row-0 table — so a
 * rebound layout paints here exactly as in C. `lines` stands in for the
 * NHW_TEXT window (C putstr(win, 0, …)); Sprintf layouts verbatim.
 * `:4129–4130` falsy centerchar falls back to ' '.
 * MOVE_WALK_ECNAMES index = C move_funcs rows 0..7 (dokeylist.js:161–164):
 * 0 west, 1 northwest, 2 north, 3 northeast, 4 east, 5 southeast,
 * 6 south, 7 southwest.
 */
function show_direction_keys(lines, centerchar, nodiag) {
    const c = centerchar || ' ';
    // C `:4135`/`4140`/`4144`/… visctrl(cmd_from_func(do_move_*)).
    const key = (dir) => visctrl(cmd_from_dir(dir, MV_WALK));
    if (nodiag) {
        // C `:4133–4146` cardinal-only grid.
        lines.push(`             ${key(2)}   `);
        lines.push('             |   ');
        lines.push(`          ${key(0)}- ${c} -${key(4)}`);
        lines.push('             |   ');
        lines.push(`             ${key(6)}   `);
    } else {
        // C `:4147–4164` full 8-way grid.
        lines.push(`          ${key(1)}  ${key(2)}  ${key(3)}`);
        lines.push('           \\ | / ');
        lines.push(`          ${key(0)}- ${c} -${key(4)}`);
        lines.push('           / | \\ ');
        // C `:4158–4162` arg order southwest, south, southeast.
        lines.push(`          ${key(7)}  ${key(6)}  ${key(5)}`);
    }
}

/**
 * C ref: cmd.c help_dir `:4171–4296` (staticfn) — NHW_TEXT cmdassist for
 * an invalid getdir key or an explicit '?' at the direction prompt.
 * display_nhwindow TEXT → show_text_pages (dmore → xwaitforspace, D-1806).
 * Returns TRUE when the window was shown, FALSE with no window `:4234`.
 */
async function help_dir(sym, spkey, msg) {
    // C `:4178` wiz_only_list.
    const WIZ_ONLY_LIST = 'EFGIVW';
    // C `:4184–4185` prefixhandling = (spkey != gc.Cmd.spkeys[NHKF_ESC]).
    // The sole C caller (getdir `:4101–4102`) always passes the ESC spkey
    // so this is false there; compare against the live binding, not 27.
    const prefixhandling = (spkey | 0) !== getdir_spkey(NHKF_ESC);
    // C `:4189–4190` dothat for the prefix "to do that" wording.
    const dothat = 'do that';
    // C `:4193–4229` is #if 0 (nhUse(prefixhandling)): the bad-prefix buf
    // arms are compiled out, so `*buf` at `:4239` is always empty and the
    // msg arm below owns that branch. `how`/`viawindow` likewise unused.

    // C `:4232–4234` create_nhwindow failure returns FALSE.
    const disp = game.nhDisplay;
    if (!disp) return false;

    const lines = [];
    // C `:4239–4247` — *buf never set (see #if 0 above); msg arm only.
    // C `:4242` Sprintf(buf, "cmdassist: %s", msg).
    if (msg) {
        lines.push(`cmdassist: ${msg}`);
        lines.push('');
    }

    // C `:4249–4263` — the key looks like a ^X control command.
    const symch = (typeof sym === 'string' && sym.length)
        ? sym.charAt(0)
        : (typeof sym === 'number' && sym ? String.fromCharCode(sym) : '\0');
    const code = symch.charCodeAt(0);
    // C hacklib.c letter `:69–73`: '@'..'Z' || 'a'..'z'; '[' is extra.
    const is_letter = (code >= 64 && code <= 90) || (code >= 97 && code <= 122);
    if (!prefixhandling && (is_letter || symch === '[')) {
        // C `:4251–4252` sym = highc(sym) (@A-Z[); ctrl = (sym-'A')+1.
        const up = highc(symch);
        const upch = typeof up === 'string' ? up.charAt(0) : String.fromCharCode(up);
        const ctrl = (upch.charCodeAt(0) - 65) + 1;
        // C `:4253–4254` dowhatdoes_core(ctrl, buf2), wiz_only gate.
        const explain = dowhatdoes_core(ctrl);
        const wiz_only = WIZ_ONLY_LIST.includes(upch);
        const wizard = !!(game.flags?.debug || game.flags?.wizard || game.wizard);
        if (explain && (!wiz_only || wizard)) {
            // C `:4255–4262` Are-you-trying + usage lines.
            const guide = wiz_only ? '' : ' as specified in the Guidebook';
            lines.push(`Are you trying to use ^${upch}${guide}?`);
            lines.push('');
            lines.push(explain);
            lines.push('');
            lines.push('To use that command, hold down the <Ctrl> key as a shift');
            lines.push(`and press the <${upch}> key.`);
            lines.push('');
        }
    }

    // C `:4265–4268` "Valid direction keys…" + show_direction_keys.
    // NODIAG(u.umonnum) is hack.h PM_GRID_BUG-only (dxdy_moveok idiom).
    const nodiag = (game.u?.umonnum | 0) === PM_GRID_BUG;
    lines.push(`Valid direction keys${prefixhandling ? ' to ' + dothat : ''}${nodiag ? ' in your current form' : ''} are:`);
    show_direction_keys(lines, !prefixhandling ? '.' : ' ', nodiag);

    // C `:4270–4286` — up/down/self extras (prefix callers never reach
    // here with m</m> but list them for m+invalid, `:4271–4274`).
    if (!prefixhandling) {
        lines.push('');
        lines.push('          <  up');
        lines.push('          >  down');
        // C `:4277–4281` selfi = num_pad ? SELF2 : SELF; "…%4s…" visctrl.
        const numPad = !!(game.iflags?.num_pad || game.Cmd?.num_pad);
        const selfvis = visctrl(getdir_spkey(numPad ? NHKF_GETDIR_SELF2 : NHKF_GETDIR_SELF));
        lines.push(`       ${selfvis.padStart(4, ' ')}  direct at yourself`);
    }

    // C `:4288–4293` — msg means unprompted: how to suppress.
    if (msg) {
        lines.push('');
        lines.push('(Suppress this message with !cmdassist in config file.)');
    }

    // C `:4294–4296` display_nhwindow(win, FALSE), destroy, return TRUE.
    await show_text_pages(lines);
    return true;
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
// C: mons[PM_ORACLE] for the credit-card shopkeep/oracle arm (sounds.js idiom)
const PM_ORACLE = monsterNames.indexOf('PM_ORACLE');

function Role_if(pm) {
    return (game.urole?.mnum ?? -1) === pm;
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
 * C ref: lock.c autokey :289–344 — invent key/pick/card for autounlock.
 * Other-role quest artifacts (any_quest_artifact, obj.h:271, but not own —
 * is_quest_artifact, questpgr.c:67) rank last via akey/apick/acard; a magic
 * Master Key of Thievery (artifact.c is_magic_key :2774–2786) displaces an
 * ordinary skeleton key. `!opening` drops card/acard (C `= 0`); fallbacks
 * apply in C order and the return prefers key, then pick, then card.
 */
export function autokey(opening) {
    let key = null;
    let pick = null;
    let card = null;
    // C: other role's quest artifact (Rogue's Key or Tourist's Credit Card)
    let akey = null;
    let apick = null;
    let acard = null;
    for (const o of game.invent || []) {
        if (!o) continue;
        // C: any_quest_artifact(o) && !is_quest_artifact(o)
        if (((o.oartifact | 0) >= ART_ORB_OF_DETECTION) && !is_quest_artifact(o)) {
            switch (o.otyp) {
            case SKELETON_KEY:
                if (!akey) akey = o;
                break;
            case LOCK_PICK:
                if (!apick) apick = o;
                break;
            case CREDIT_CARD:
                if (!acard) acard = o;
                break;
            default:
                break;
            }
        } else {
            switch (o.otyp) {
            case SKELETON_KEY:
                if (!key || is_magic_key(game.youmonst, o)) key = o;
                break;
            case LOCK_PICK:
                if (!pick) pick = o;
                break;
            case CREDIT_CARD:
                if (!card) card = o;
                break;
            default:
                break;
            }
        }
    }
    if (!opening) card = acard = null;
    /* only resort to other role's quest artifact if no other choice */
    if (!key && !pick && !card) key = akey;
    if (!pick && !card) pick = apick;
    if (!card) card = acard;
    return key ? key : pick ? pick : card ? card : null;
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
 * C ref: cmd.c getdir CMDQ_DIR `:3966–3971` — dirchars[xytodir] or
 * dirchars[DIR_DOWN/DIR_UP] (`sdir="hykulnjb><"`, `ndir="47896321><"`;
 * index 8 `>` down, 9 `<` up in both). num_pad selects NDIR.
 */
function getdir_dirsym_from_dir(cmdq) {
    if (!(cmdq.dirz | 0)) {
        const d = xytodir(cmdq.dirx | 0, cmdq.diry | 0);
        if (d < 0 || d >= 8) return '\0';
        const numPad = !!(game.iflags?.num_pad || game.Cmd?.num_pad);
        return (numPad ? GETDIR_NDIR : GETDIR_SDIR).charAt(d);
    }
    return (cmdq.dirz | 0) > 0 ? '>' : '<';
}

function getdir_key_to_sym(key) {
    if (typeof key === 'string') return key.length ? key.charAt(0) : '\0';
    if (typeof key === 'number') return String.fromCharCode(key | 0);
    return '\0';
}

function nhgetch_to_dirsym(k) {
    if (typeof k === 'string') return k.length ? k.charAt(0) : '\0';
    return String.fromCharCode(k | 0);
}

/**
 * C ref: cmd.c getdir `:3962–4019` — cmdq_pop DIR/KEY (CQ_REPEAT when
 * gi.in_doagain) then yn_function / readchar, clear WIN_MESSAGE,
 * redraw_cmd retry, cmdq_add_key(CQ_REPEAT) when !in_doagain.
 * Queue-popped DIR/KEY skip the REPEAT record (goto got_dirsym).
 * readchar_queue (altmeta pushback) is empty in sessions — the
 * `:3985` gate reduces to in_doagain; nhgetch covers readchar
 * (readchar_core whole body live in `js/cmd.js` D-2625).
 * @param {string|null|undefined} prompt
 * @returns {Promise<string>} dirsym
 */
export async function getdir_read_dirsym(prompt) {
    const cmdq = cmdq_pop();
    if (cmdq) {
        if (cmdq.typ === CMDQ_DIR || cmdq.typ === 'dir') {
            return getdir_dirsym_from_dir(cmdq);
        }
        if (cmdq.typ === CMDQ_KEY || cmdq.typ === 'key') {
            return getdir_key_to_sym(cmdq.key);
        }
        // C `:3974–3977` — neither DIR nor KEY → clear + NUL + impossible
        cmdq_clear(CQ_CANNED);
        await impossible('getdir: command queue had no dir?');
        return '\0';
    }

    // C `:3987–3988` — '^' is a help_dir marker, not the prompt text
    const query = (prompt && prompt.charAt(0) !== '^')
        ? prompt : 'In what direction?';
    for (;;) {
        // C `:3981` retry: program_state.input_state = getdirInp
        if (!game.program_state) game.program_state = {};
        game.program_state.input_state = getdirInp;
        let dirsym;
        if (game.in_doagain) {
            // C `:3985–3986` — in_doagain || *readchar_queue → readchar
            dirsym = nhgetch_to_dirsym(await nhgetch());
        } else {
            dirsym = await yn_function(query, null, '\0', false);
            // C `:3996–4009` fuzzer — short-circuit keeps RNG shape:
            // no rn2 draw unless debug_fuzzer is on (never in sessions).
            if (game.iflags?.debug_fuzzer && rn2(20)) {
                const pick = rn2(20);
                if (pick === 0) {
                    dirsym = String.fromCharCode(getdir_spkey(rn2(2) ? NHKF_GETDIR_SELF : NHKF_ESC));
                } else if (pick === 1) {
                    const numPad = !!(game.iflags?.num_pad || game.Cmd?.num_pad);
                    const dc = numPad ? GETDIR_NDIR : GETDIR_SDIR;
                    dirsym = dc.charAt(rn2(2) ? 8 : 9);
                } else {
                    const numPad = !!(game.iflags?.num_pad || game.Cmd?.num_pad);
                    const dc = numPad ? GETDIR_NDIR : GETDIR_SDIR;
                    dirsym = dc.charAt(rn2(N_DIRS));
                }
            }
        }
        clear_nhwindow_message();
        const key = (dirsym && dirsym.charCodeAt) ? dirsym.charCodeAt(0) : 0;
        // C `:4014–4017` — redraw_cmd → docrt_flags(docrtRefresh) + retry,
        // no REPEAT record (redraw_map gbuf resend + post_map botlx).
        if (getdir_is_redraw(key)) {
            await docrt_flags(docrtRefresh);
            continue;
        }
        if (!game.in_doagain) cmdq_add_key(CQ_REPEAT, dirsym);
        return dirsym || '\0';
    }
}

/**
 * C ref: cmd.c getdir `:3956–4119` in C order — cmdq DIR/KEY
 * (`getdir_read_dirsym`), SELF/SELF2, mouse `_` getpos, movecmd +
 * quitchars/help_dir/strange-direction, dxdy_moveok You_cant,
 * trailing `:4115–4116` if (!u.dz) confdir(FALSE) (D-2430).
 * movecmd is the live `apply_dirsym` (cmdbind_get + xdir/ydir/zdir);
 * You_cant is net-identical `pline("You can't …")` (pline.c wrapper).
 * yn_function menu-pick arm never fires from this call shape (named).
 */
export async function getdir(prompt) {
    for (;;) {
        const dirsym = await getdir_read_dirsym(prompt);
        const ch = dirsym || '\0';
        const key = ch.charCodeAt(0);
        if (!game.u) game.u = {};
        const u = game.u;
        const numPad = !!(game.iflags?.num_pad || game.Cmd?.num_pad);
        const selfCh = String.fromCharCode(getdir_spkey(NHKF_GETDIR_SELF));
        const self2Ch = String.fromCharCode(getdir_spkey(NHKF_GETDIR_SELF2));
        const mouseCh = String.fromCharCode(getdir_spkey(NHKF_GETDIR_MOUSE));

        // C `:4021–4023` — NHKF_GETDIR_SELF / SELF2; self falls through
        // to the `:4115–4116` tail below (dz==0 → confdir still runs).
        // num_pad `5` is the keypad center (C ndir has no `5` direction).
        if (ch === selfCh || ch === self2Ch || (numPad && ch === '5')) {
            u.dx = u.dy = u.dz = 0;
            if (!(u.dz | 0)) confdir(false);
            return true;
        }

        // C `:4024–4093` — NHKF_GETDIR_MOUSE simulated click via getpos.
        if (ch === mouseCh) {
            const qbuf = `desired location, then type '${visctrl(getpos_spkey_for_getdir(NHKF_GETPOS_PICK_Q))}' for left click, '${visctrl(getpos_spkey_for_getdir(NHKF_GETPOS_PICK))}' for right`;
            const cc = { x: u.ux | 0, y: u.uy | 0 };
            const pos = await getpos(cc, true, qbuf);
            let mod = 0;
            if (pos < 0) {
                u.dx = u.dy = u.dz = 0;
                mod = 0;
            } else {
                u.dx = (cc.x | 0) - (u.ux | 0);
                u.dy = (cc.y | 0) - (u.uy | 0);
                if (!game.iflags?.getdir_click) {
                    // C hacklib.c sgn inline (no 16th clone of the 15).
                    u.dx = u.dx < 0 ? -1 : (u.dx !== 0 ? 1 : 0);
                    u.dy = u.dy < 0 ? -1 : (u.dy !== 0 ? 1 : 0);
                }
                u.dz = 0;
                const pickBase = NHKF_GETPOS_PICK | 0;
                const got = (pos | 0) + pickBase;
                if (got === (NHKF_GETPOS_PICK_Q | 0) || got === (NHKF_GETPOS_PICK_O | 0)) {
                    mod = CLICK_1;
                } else if (got === (NHKF_GETPOS_PICK | 0) || got === (NHKF_GETPOS_PICK_V | 0)) {
                    mod = CLICK_2;
                } else {
                    await impossible('getpos successful but not one of [.,;:] (%d)', pos | 0);
                    mod = 0;
                    if (!game.iflags) game.iflags = {};
                    if (game.iflags.getdir_click) game.iflags.getdir_click = mod;
                    return false;
                }
            }
            if (game.iflags?.getdir_click) game.iflags.getdir_click = mod;
            return pos >= 0;
        }

        // C `:4095` — movecmd(dirsym, MV_ANY); <> set dz (not is_mov).
        // C movecmd returns !u.dz while KEEPING dz=±1 on up/down;
        // apply_dirsym already zeroes u.dz on true failure (code=0 /
        // fallthrough arms, D-1387), so no caller zeroing here.
        const applied = apply_dirsym(ch);
        // C movecmd returns !u.dz — up/down set dz and are not is_mov
        const is_mov = applied && !(u.dz | 0);

        if (!is_mov && !(u.dz | 0)) {
            // C `:4095–4111` — quitchars return 0 without help_dir
            if (QUITCHARS.indexOf(ch) >= 0) {
                return false;
            }
            const help_requested = (key & 0xff) === getdir_spkey(NHKF_GETDIR_HELP);
            let did_help = false;
            // C `:4098` if (help_requested || iflags.cmdassist) —
            // optlist default On; Options `O` writes game.iflags
            // (D-0928 cmd_safety_prevention; D-1815). Not flags.
            if (help_requested || game.iflags?.cmdassist !== false) {
                const hsym = (prompt && String(prompt).charAt(0) === '^')
                    ? ch : '\0';
                did_help = await help_dir(
                    hsym,
                    getdir_spkey(NHKF_ESC),
                    help_requested ? null : 'Invalid direction key!',
                );
                if (help_requested) continue;
            }
            if (!did_help) {
                await pline('What a strange direction!');
            }
            return false;
        }
        if (is_mov && !dxdy_moveok()) {
            // C `:4112–4114` You_cant — pline text identical.
            await pline("You can't orient yourself that direction.");
            return false;
        }
        // C `:4115–4116` if (!u.dz) confdir(FALSE) — in getdir itself,
        // so every direction prompt draws the Confusion !rn2(5) (D-2430).
        if (!(u.dz | 0)) confdir(false);
        return true;
    }
}

/** C ref: cmd.c get_adjacent_loc — getdir then adjacent cell. */
export async function get_adjacent_loc(prompt, emsg) {
    // C: getdir(prompt) — invalid key → help_dir cmdassist then fail
    if (!(await getdir(prompt))) {
        await pline('Never mind.');
        return null;
    }
    const u = game.u || {};
    const x = (u.ux || 0) + (u.dx || 0);
    const y = (u.uy || 0) + (u.dy || 0);
    if (x < 1 || x >= COLNO || y < 0 || y >= ROWNO) {
        if (emsg) await pline(emsg);
        return null;
    }
    return { x, y };
}

/**
 * C ref: lock.c stumble_on_door_mimic `:758–769` — shared door-mimic stumble
 * for doopen_indir / doclose / untrap doorway.
 * C `is_door_mappear` (monst.h `:240`): M_AP_FURNITURE mimicking S_hcdoor or
 * S_vcdoor only. (The pick_lock direction arm, lock.c `:571`, inlines the
 * same predicate but ungated with a `maybe_absorb_item` tail, so it keeps
 * its own call below.)
 * Async only because JS `stumble_onto_mimic` reaches pline --More--;
 * the predicate itself draws no RNG, matching C order exactly.
 * PfSC gate is the canonical `were.js` export (C youprop.h H || E incl.
 * uprops extrinsic, e.g. the worn ring — no local flats-only clone).
 * @returns {Promise<boolean>} true when C returns TRUE (caller takes ECMD_TIME / 1)
 */
export async function stumble_on_door_mimic(x, y) {
    const mtmp = m_at(x, y);
    if (mtmp && M_AP_TYPE(mtmp) === M_AP_FURNITURE
        && (((mtmp.mappearance | 0) === S_hcdoor)
            || ((mtmp.mappearance | 0) === S_vcdoor))
        && !Protection_from_shape_changers()) {
        await stumble_onto_mimic(mtmp);
        return true;
    }
    return false;
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
 * Named omissions: pit "Open where? [.>]" dirprompt + pit-reach gate;
 * set_msg_xy on the This-door arm; AUTOUNLOCK_KICK canned dokick;
 * trapped-shop-door SHOP_DOOR_COST add_damage (lock.c:911).
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

    // C lock.c doopen_indir `:808–811` — open at yourself/up/down:
    // switch to loot unless a closed door is here and direction isn't down
    const u = game.u || {};
    if (u_at(cc.x, cc.y) && ((u.dz | 0) > 0 || !closed_door(u.ux, u.uy))) {
        return (await doloot()) === ECMD_TIME;
    }
    // C: u.utrap TT_PIT reach — deferred
    // C lock.c doopen_indir `:820` — door-mimic stumble before the
    // Confusion/Stunned turn cost below.
    if (await stumble_on_door_mimic(cc.x, cc.y)) return true;

    // C lock.c doopen_indir — impaired direction costs a turn even with no
    // door targeted: if (Confusion || Stunned) res = ECMD_TIME.
    // (Same H-field + flat idiom as doclose below.)
    let res = false; // C: res starts ECMD_OK
    if ((u.HConfusion | 0) || u.Confusion || (u.HStun | 0) || u.Stunned) res = true;

    const loc = game.level?.at(cc.x, cc.y);
    const portcullis = is_drawbridge_wall(cc.x, cc.y) >= 0;
    // C lock.c doopen_indir `:836–845` — "this used to be 'if (Blind)' but
    // using a key skips that so we do too": unconditional mapseen/newsym,
    // LEARNED when either changes. C also compares door->glyph, which JS
    // cells don't model (game.js), so only the lastseentyp half is live.
    {
        const oldlastseentyp = update_mapseen_for(cc.x, cc.y);
        newsym(cc.x, cc.y);
        if ((game.lastseentyp?.[cc.x]?.[cc.y] | 0) !== (oldlastseentyp | 0)) res = true;
    }

    if (portcullis || !loc || !IS_DOOR(loc.typ)) {
        // C lock.c doopen_indir `:847–859` — closed portcullis / opened-bridge
        // span / lootable container (Blind Feels/Seems) / Blind feel/see,
        // in exact order. There/pline_The render as plain pline (read.js:1683).
        if (is_db_wall(cc.x, cc.y) || (loc?.typ | 0) === DRAWBRIDGE_UP) {
            await pline('There is no obvious way to open the drawbridge.');
        } else if (portcullis || (loc?.typ | 0) === DRAWBRIDGE_DOWN) {
            await pline('The drawbridge is already open.');
        } else if (container_at(cc.x, cc.y, true)) {
            await pline(`${Blind() ? 'Feels' : 'Seems'} like something lootable over there.`);
        } else {
            await pline(`You ${Blind() ? 'feel' : 'see'} no door there.`);
        }
        return res;
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
            // C lock.c:908-911 — b_trapped BEFORE D_NODOOR (shop
            // SHOP_DOOR_COST add_damage named omission, map-kept).
            await b_trapped('door', FINGER);
            loc.doormask = D_NODOOR;
        } else {
            loc.doormask = D_ISOPEN;
        }
        // C lock.c:914 — feel_newsym: the hero knows she opened it
        // (Blind feel_location, else newsym).
        feel_newsym(x, y);
        recalc_block_point(x, y);
        vision_recalc(1);
    } else {
        exercise(A_STR, true);
        await pline('The door resists!');
    }
    return true;
}

/** C youprop.h Blind — same per-file idiom as apply.js (macro, not a clone). */
function Blind() {
    const u = game.u || {};
    if (u.uroleplay?.blind) return true;
    return !!(((u.HBlinded | 0) || (u.EBlinded | 0)) && !(u.BBlinded | 0));
}

/** C youprop.h Deaf */
function Deaf() {
    const u = game.u || {};
    return !!((u.HDeaf | 0) || (u.EDeaf | 0) || u.uroleplay?.deaf || u.Deaf);
}

/** C youprop.h Levitation — (HLevitation || ELevitation) && !BLevitation. */
function Levitation() {
    const u = game.u || {};
    return !!(((u.HLevitation | 0) || (u.ELevitation | 0)) && !(u.BLevitation | 0));
}

/** C youprop.h:279 `#define Underwater (u.uinwater)`. */
function Underwater() {
    return !!(game.u?.uinwater);
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
 * Envelope: nohands/pit gates, getdir (cmdassist; tail confdir inside it),
 * impaired-direction TIME, door mask arms, close roll.
 * Named omissions: portcullis/drawbridge; steed close path;
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

    // C: getdir(NULL) — cmdassist NHW_TEXT on invalid key, then cancel;
    // the `:4115–4116` tail confdir(FALSE) already ran inside getdir (D-2430;
    // C lock.c has no self-call, so one draw per prompt like C).
    if (!(await getdir(null))) return false;

    const x = (u.ux | 0) + (u.dx | 0);
    const y = (u.uy | 0) + (u.dy | 0);
    const Passes_walls = !!(u.Passes_walls
        || passes_walls(game.youmonst?.data));
    if (x === (u.ux | 0) && y === (u.uy | 0) && !Passes_walls) {
        await pline('You are in the way!');
        return true;
    }

    let res = false; // C: res starts ECMD_OK
    // C lock.c doclose `:985–996` — !isok goes to nodoor while res is still
    // ECMD_OK (the Confusion/Stunned turn cost comes after, with the
    // stumble_on_door_mimic call between them).
    if (x < 1 || x >= COLNO || y < 0 || y >= ROWNO) {
        await pline(`You ${Blind() ? 'feel' : 'see'} no door there.`);
        return res;
    }
    // C lock.c doclose `:987` — door-mimic stumble between the !isok
    // nodoor arm above and the Confusion/Stunned turn cost below.
    if (await stumble_on_door_mimic(x, y)) return true;
    // C lock.c doclose — impaired direction choice costs a turn even when no
    // door is targeted: if (Confusion || Stunned) res = ECMD_TIME.
    // C Confusion/Stunned ≡ H-fields (youprop.h); flat mirrors per repo idiom.
    if ((u.HConfusion | 0) || u.Confusion || (u.HStun | 0) || u.Stunned) res = true;

    const loc = game.level?.at(x, y);
    // C lock.c doclose — Blind: feel_location + mapseen; LEARNED when
    // lastseentyp changes. C also compares door->glyph, which JS cells
    // don't model (game.js), so only the lastseentyp half is live —
    // same idiom as doopen_indir above.
    if (Blind()) {
        const oldlastseentyp = update_mapseen_for(x, y);
        feel_location(x, y);
        if ((game.lastseentyp?.[x]?.[y] | 0) !== (oldlastseentyp | 0)) res = true;
    }
    if (!loc || !IS_DOOR(loc.typ)) {
        // C: portcullis/drawbridge arms deferred
        await pline(`You ${Blind() ? 'feel' : 'see'} no door there.`);
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

/** C levl[x][y].glyph — remembered integer id, not the tty ch/color. */
function cellGlyph(loc) {
    const g = loc?.remembered_glyph?.glyph;
    return typeof g === 'number' ? g | 0 : 0;
}

/**
 * C ref: lock.c pick_lock `:358–656` — whole C body in C order.
 * Named omissions: `maybe_absorb_item` (steal.c:772, no JS port — map).
 * Callers: apply.c:4288 (`apply.js`), lock.c:882 (`doopen_indir` below),
 * pickup.c:2125 (`pickup.js`).
 * @param {object|null} pick key / lock pick / credit card (null/0 = autounlock untrap probe)
 * @param {number} [rx=0] autounlock x (0 → prompt getdir)
 * @param {number} [ry=0] autounlock y
 * @param {object|null} [container=null] box for #loot autounlock
 * @returns {number} PICKLOCK_* ; caller maps != 0 to ECMD_TIME
 */
export async function pick_lock(pick, rx = 0, ry = 0, container = null) {
    // C `:373–377` — 'pick' might be Null (do_loot_cont AUTOUNLOCK_UNTRAP);
    // dummypick.otyp is STRANGE_OBJECT (objectNames[0], otyp 0).
    const hasTool = pick != null && pick !== 0;
    if (!hasTool) pick = { otyp: 0 };
    const picktyp = pick.otyp | 0;
    const autounlock = (rx !== 0 || container != null);
    const u = game.u || {};
    let cc;
    let ch = 0; // C `:419` lint suppression
    let c;

    // C `:380–401` — resuming an interrupted previous attempt.
    if ((game.xlock?.usedtime | 0) && picktyp === (game.xlock?.picktyp | 0)) {
        if (nohands(game.youmonst?.data)) { // C `:383–388`
            let what = picktyp === LOCK_PICK ? 'pick' : 'key';
            if (picktyp === CREDIT_CARD) what = 'card';
            await pline('Unfortunately, you can no longer %s %s.', 'hold the', what);
            reset_pick();
            return PICKLOCK_LEARNED_SOMETHING;
        } else if (game.u?.uswallow || (game.xlock?.box && !can_reach_floor(true))) { // C `:391–392`
            await pline('Unfortunately, you can no longer %s %s.', 'reach the', 'lock');
            reset_pick();
            return PICKLOCK_LEARNED_SOMETHING;
        }
        const action = lock_action(); // C `:396`
        await You('resume your attempt at %s.', action); // C `:398`
        game.xlock.magic_key = is_magic_key(game.youmonst, pick); // C `:399`
        set_occupation(picklock, action, 0); // C `:400`
        return PICKLOCK_DID_SOMETHING;
    }

    if (nohands(game.youmonst?.data)) { // C `:405–407`
        await You_cant('hold %s -- you have no hands!', doname(pick));
        return PICKLOCK_DID_NOTHING;
    } else if (game.u?.uswallow) { // C `:408–411`
        await You_cant('%sunlock %s.',
            picktyp === CREDIT_CARD ? '' : 'lock or ', mon_nam(game.u.ustuck));
        return PICKLOCK_DID_NOTHING;
    }

    if (hasTool && picktyp !== SKELETON_KEY // C `:414–417`
        && picktyp !== LOCK_PICK && picktyp !== CREDIT_CARD) {
        await impossible('picking lock with object %d?', picktyp);
        return PICKLOCK_DID_NOTHING;
    }

    if (rx !== 0) { // C `:422–423` autounlock; caller provided coordinates
        cc = { x: rx, y: ry };
    } else if (!(cc = await get_adjacent_loc(null, 'Invalid location!'))) { // C `:424–426`
        return PICKLOCK_DID_NOTHING;
    }

    if (u_at(cc.x, cc.y)) { // C `:429` — pick lock on a container
        let verb;
        let it;
        let count = 0;

        if (u.dz < 0 && !autounlock) { // C `:435` beware stale u.dz value
            await There("isn't any sort of lock up %s.", Levitation() ? 'here' : 'there');
            return PICKLOCK_LEARNED_SOMETHING;
        } else if (is_lava(u.ux, u.uy)) { // C `:439–441`
            await pline('Doing that would probably melt %s.', yname(pick));
            return PICKLOCK_LEARNED_SOMETHING;
        } else if (is_pool(u.ux, u.uy) && !Underwater()) { // C `:442–444`
            await pline_The('%s has no lock.', hliquid('water'));
            return PICKLOCK_LEARNED_SOMETHING;
        }

        c = 'n'; // C `:448` in case there are no boxes here
        for (let otmp = objects_at(cc.x, cc.y); otmp; otmp = otmp.nexthere) {
            // C `:451–454` autounlock on boxes: only the just-discovered one
            if (autounlock && otmp !== container) continue;
            if (Is_box(otmp)) { // C `:455`
                ++count;
                if (!can_reach_floor(true)) { // C `:456–459`
                    await You_cant('reach %s from up here.', the(xname(otmp)));
                    return PICKLOCK_LEARNED_SOMETHING;
                }
                it = false; // C `:461`
                if (otmp.obroken) verb = 'fix'; // C `:462–463`
                else if (!otmp.olocked) { verb = 'lock'; it = true; } // C `:464–465`
                else if (picktyp !== LOCK_PICK) { verb = 'unlock'; it = true; } // C `:466–467`
                else verb = 'pick'; // C `:468–469`

                const au = game.flags?.autounlock ?? AUTOUNLOCK_APPLY_KEY;
                if (autounlock && (au & AUTOUNLOCK_UNTRAP) !== 0 // C `:470–481`
                    && await could_untrap(false, true)
                    && (c = otmp.tknown ? (otmp.otrapped ? 'y' : 'n')
                        : await yn_function(safe_qbuf(null, 'Check ', ' for a trap?',
                            otmp, yname, ysimple_name, 'this'), 'ynq', 'q')) !== 'n') {
                    if (c === 'q') return PICKLOCK_DID_NOTHING; // C `:478`
                    await untrap(false, 0, 0, otmp); // C `:480`
                    return PICKLOCK_DID_SOMETHING;
                } else if (autounlock // C `:482–490`
                    && (au & AUTOUNLOCK_APPLY_KEY) !== 0) {
                    c = 'q';
                    if (hasTool) { // C `:485` pick != &dummypick
                        c = await yn_function(`Unlock it with ${yname(pick)}?`, 'ynq', 'q'); // C `:486–487`
                    }
                    if (c !== 'y') return PICKLOCK_DID_NOTHING; // C `:489–490`
                } else {
                    // C `:492–497` "There is <a box> here; <verb> <it|its lock>?"
                    const qsfx = ` here; ${verb} ${it ? 'it' : 'its lock'}?`;
                    const qbuf = safe_qbuf(null, 'There is ', qsfx,
                        otmp, doname, ansimpleoname, 'a box');
                    otmp.lknown = 1;

                    c = await yn_function(qbuf, 'ynq', 'q'); // C `:499`
                    if (c === 'q') return PICKLOCK_DID_NOTHING; // C `:500–501`
                    if (c === 'n') continue; // C `:502–503` try next box
                }

                if (otmp.obroken) { // C `:506–509`
                    await You_cant('fix its broken lock with %s.', ansimpleoname(pick));
                    return PICKLOCK_LEARNED_SOMETHING;
                } else if (picktyp === CREDIT_CARD && !otmp.olocked) { // C `:510–514`
                    // credit cards are only good for unlocking
                    await You_cant('do that with %s.', an(simple_typename(picktyp)));
                    return PICKLOCK_LEARNED_SOMETHING;
                } else if (autounlock // C `:515–518`
                    && !await touch_artifact(pick, game.youmonst)) {
                    // note: for !autounlock, apply already did touch check
                    return PICKLOCK_DID_SOMETHING;
                }
                switch (picktyp) { // C `:520–532` box chance
                case CREDIT_CARD: // C `:522`
                    ch = acurr(A_DEX) + 20 * (Role_if(PM_ROGUE) ? 1 : 0);
                    break;
                case LOCK_PICK: // C `:525`
                    ch = 4 * acurr(A_DEX) + 25 * (Role_if(PM_ROGUE) ? 1 : 0);
                    break;
                case SKELETON_KEY: // C `:528`
                    ch = 75 + acurr(A_DEX);
                    break;
                default: // C `:531–532`
                    ch = 0;
                }
                if (otmp.cursed) ch = Math.trunc(ch / 2); // C `:533–534`

                if (!game.xlock) game.xlock = {};
                game.xlock.box = otmp; // C `:536`
                game.xlock.door = null; // C `:537` door = 0
                game.xlock.door_x = 0;
                game.xlock.door_y = 0;
                break;
            }
        }
        if (c !== 'y') { // C `:541–545` decided against all boxes
            if (!count) await There("doesn't seem to be any sort of lock here.");
            return PICKLOCK_LEARNED_SOMETHING;
        }

    // C `:547` — not the hero's location; pick the lock in an adjacent door
    } else {
        if (u.utrap && u.utraptype === TT_PIT) { // C `:551–555`
            await You_cant('reach over the edge of the pit.');
            /* C `:553–554` used to return LEARNED but #open takes no turn here */
            return PICKLOCK_DID_NOTHING;
        }

        const door = game.level?.at(cc.x, cc.y); // C `:557`
        const mtmp = m_at(cc.x, cc.y); // C `:558`
        if (mtmp && canseemon(mtmp) && M_AP_TYPE(mtmp) !== M_AP_FURNITURE // C `:559–560`
            && M_AP_TYPE(mtmp) !== M_AP_OBJECT) {
            if (picktyp === CREDIT_CARD // C `:561–566`
                && (mtmp.isshk || (mtmp.data?.mndx | 0) === PM_ORACLE)) {
                SetVoice(mtmp, 0, 80, 0);
                await verbalize('No checks, no credit, no problem.');
            } else { // C `:567–569`
                await pline("I don't think %s would appreciate that.", mon_nam(mtmp));
            }
            return PICKLOCK_LEARNED_SOMETHING;
        } else if (mtmp && M_AP_TYPE(mtmp) === M_AP_FURNITURE // C `:571–576` monst.h:240 is_door_mappear
            && ((mtmp.mappearance | 0) === S_hcdoor
                || (mtmp.mappearance | 0) === S_vcdoor)) {
            // C `:572` "The door actually was a <mimic>!"
            await stumble_onto_mimic(mtmp); // C `:573`
            // C `:574–575` mimic might keep the key (50%, 10% PYEC/MKoT) — maybe_absorb_item named omit
            return PICKLOCK_LEARNED_SOMETHING;
        }
        if (!door || !IS_DOOR(door.typ)) { // C `:578–593`
            // C `:579–586` — DID_NOTHING unless feel_location changes
            // lev->glyph or lastseentyp. The promoting write is the
            // integer id (S_room → S_darkroom), not the tty symbol.
            let res = PICKLOCK_DID_NOTHING;
            const oldGlyph = cellGlyph(door); // C `:579` oldglyph = door->glyph
            const oldlastseentyp = update_mapseen_for(cc.x, cc.y); // C `:580`
            /* C `:582` this is probably only relevant when blind */
            feel_location(cc.x, cc.y); // C `:583`
            if (cellGlyph(door) !== oldGlyph // C `:584–586`
                || (game.lastseentyp?.[cc.x]?.[cc.y] | 0) !== (oldlastseentyp | 0)) {
                res = PICKLOCK_LEARNED_SOMETHING;
            }
            if (is_drawbridge_wall(cc.x, cc.y) >= 0) // C `:588–589`
                await You('%s no lock on the drawbridge.', Blind() ? 'feel' : 'see');
            else // C `:590–591`
                await You('%s no door there.', Blind() ? 'feel' : 'see');
            return res;
        }

        // C `:594` switch (door->doormask)
        switch (door.doormask | 0) {
        case D_NODOOR: // C `:595–597`
            await pline('This doorway has no door.');
            return PICKLOCK_LEARNED_SOMETHING;
        case D_ISOPEN: // C `:598–600`
            await You('cannot lock an open door.');
            return PICKLOCK_LEARNED_SOMETHING;
        case D_BROKEN: // C `:601–603`
            await pline('This door is broken.');
            return PICKLOCK_LEARNED_SOMETHING;
        default: { // C `:604`
            const au = game.flags?.autounlock ?? AUTOUNLOCK_APPLY_KEY;
            if ((au & AUTOUNLOCK_UNTRAP) !== 0 // C `:605–611` (no autounlock gate in C)
                && await could_untrap(false, false)
                && (c = await yn_function('Check this door for a trap?', 'ynq', 'q')) !== 'n') {
                if (c === 'q') return PICKLOCK_DID_NOTHING; // C `:608–609`
                await untrap(false, cc.x, cc.y, null); // C `:610`
                return PICKLOCK_DID_SOMETHING;
            }
            // C `:612` credit cards are only good for unlocking
            if (picktyp === CREDIT_CARD && !(door.doormask & D_LOCKED)) { // C `:613–617`
                await You_cant('lock a door with a credit card.');
                return PICKLOCK_LEARNED_SOMETHING;
            }

            const qbuf = `${(door.doormask & D_LOCKED) ? 'Unlock' : 'Lock'} it${autounlock ? ' with ' : ''}${autounlock ? yname(pick) : ''}?`; // C `:620–623`
            c = await yn_function(qbuf, 'ynq', 'q'); // C `:624`
            if (c !== 'y') return PICKLOCK_DID_NOTHING; // C `:625–626`

            // C `:628` note: for !autounlock, 'apply' already did touch check
            if (autounlock && !await touch_artifact(pick, game.youmonst)) // C `:629–630`
                return PICKLOCK_DID_SOMETHING;

            switch (picktyp) { // C `:632–644` door chance
            case CREDIT_CARD: // C `:634`
                ch = 2 * acurr(A_DEX) + 20 * (Role_if(PM_ROGUE) ? 1 : 0);
                break;
            case LOCK_PICK: // C `:637`
                ch = 3 * acurr(A_DEX) + 30 * (Role_if(PM_ROGUE) ? 1 : 0);
                break;
            case SKELETON_KEY: // C `:640`
                ch = 70 + acurr(A_DEX);
                break;
            default: // C `:643–644`
                ch = 0;
            }

            if (!game.xlock) game.xlock = {};
            game.xlock.door = door; // C `:645`
            game.xlock.door_x = cc.x;
            game.xlock.door_y = cc.y;
            game.xlock.box = null; // C `:646` box = 0
            break;
        }
        }
    }

    if (!game.xlock) game.xlock = {};
    if (!game.context) game.context = {};
    game.context.move = 0; // C `:649` svc.context.move = 0
    game.xlock.chance = ch; // C `:650`
    game.xlock.picktyp = picktyp; // C `:651`
    game.xlock.magic_key = is_magic_key(game.youmonst, pick); // C `:652`
    game.xlock.usedtime = 0; // C `:653`
    set_occupation(picklock, lock_action(), 0); // C `:654`
    return PICKLOCK_DID_SOMETHING; // C `:655`
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
 * doorlock is D-1484. Trapped-monster arm runs the canonical
 * `monmove.js` mb_trapped (wake_nearto, mondied/lifesave,
 * mon_learns_traps TRAPPED_DOOR). Named: Soundeffect.
 * obstructed Some_Monnam / worm-tail / map_invisible.
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
 * C ref: lock.c chest_shatter_msg `:1276–1318` — destroy-path content messages.
 * C order: POTION_CLASS You hear/see + an(bottlename()) + breathless/haseyes
 * potionbreathe arm; Blind-forced singular(xname); oc_material switch;
 * pline An(thing) + disposition. Local Blind() is the per-file youprop
 * idiom (same body as invent.js Blind); canon_an/An are the objnam.js
 * exports (local an/the/simple_typename below stay for other sites).
 */
async function chest_shatter_msg(otmp) {
    // C `:1283–1289` — potion shatters with a bottle name, not xname.
    if (otmp.oclass === POTION_CLASS) {
        // C: You("%s %s shatter!", Blind ? "hear" : "see", an(bottlename()));
        await You('%s %s shatter!', Blind() ? 'hear' : 'see', canon_an(bottlename()));
        // C `:1286–1288` — vapor only when the hero can smell/see it.
        if (!breathless(game.youmonst?.data) || haseyes(game.youmonst?.data))
            await potionbreathe(otmp);
        return;
    }
    // C `:1292–1296` — force Blind so singular(xname) skips observe_object.
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
    // C `:1297–1316` — oc_material switch in C order.
    const mat = game.objects?.[otmp.otyp]?.oc_material | 0;
    let disposition;
    switch (mat) {
    case MAT_PAPER:
        disposition = 'is torn to shreds';
        break;
    case MAT_WAX:
        disposition = 'is crushed';
        break;
    case MAT_VEGGY:
        disposition = 'is pulped';
        break;
    case MAT_FLESH:
        disposition = 'is mashed';
        break;
    case MAT_GLASS:
        disposition = 'shatters';
        break;
    case MAT_WOOD:
        disposition = 'splinters to fragments';
        break;
    default:
        disposition = 'is destroyed';
        break;
    }
    // C `:1317` — pline("%s %s!", An(thing), disposition);
    await pline('%s %s!', An(thing), disposition);
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
export function u_have_forceable_weapon() {
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
