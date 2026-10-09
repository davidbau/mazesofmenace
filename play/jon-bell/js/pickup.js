// pickup.c — container_at, reset_justpicked, doloot, the trap.c leaves
// (unconscious, uteetering_at_seen_pit, uescaped_shaft) that other modules
// plus its pickup.c-local helpers (autopick, autopick_testobj, pickup_object,
// lift_object, carry_count, pick_obj, pickup_prinv, query_objlist's
// fast-path).  See the landmark comment near the bottom of this file for the
// exact boundary of what is and isn't covered.
// C ref: pickup.c container_at() and reset_justpicked() (lines 2017-2032, 615-632),
//        doloot()/doloot_core()/do_loot_cont() (lines 2158-2340),
//        pickup() (671-911) and its helpers (see landmark comment below),
//        trap.c unconscious() (6756), uteetering_at_seen_pit() (6628),
//        uescaped_shaft() (6640).
// NOTE: js/cmd.js ALSO carries three separate fragments that reimplement
// slices of pickup()'s behaviour inline (_spoteffects_pickup, etc. — see the
// landmark comment below).  The `pickup` export added here is NOT wired into
// that call graph (nothing imports `pickup` from this file as of this
// exercise pickup.c's real body directly.  Unifying the two remains the
// @ts-nocheck — js sibling imports.
import { game } from './gstate.js';
import {
    pline, _topl_stash_result, newsym, newsym_force, Norep, flush_screen,
    force_more, topl_park_cursor, topl_force_break_after,
} from './display.js';
import { pline_with_more, money_cnt, build_window_screen, tty_window_offx } from './com_pager.js';
import { autokey, pick_lock, getdir } from './lock.js';
import { nomul } from './allmain.js';
import { nhgetch } from './input.js';
import { touch_artifact_youmonst } from './wizcmds.js';
import { poly_when_stoned } from './mhitm.js';
import { polymon } from './polyself.js';
import { PM_STONE_GOLEM } from './pm.generated.js';
import { corpse_xname, killer_xname, CXN_SINGULAR, CXN_ARTICLE } from './objnam.js';
import { Blind } from './vision.js';
import { splitobj } from './makemon.js';
import { which_armor } from './makemon.js';
import { rnd } from './rng.js';
import { yn_function } from './end.js';
import {
    ECMD_OK, ECMD_TIME, is_pit, is_hole, u_at, TT_PIT, isok,
    OBJ_CONTAINED, OBJ_FREE, OBJ_FLOOR, OBJ_INVENT, OBJ_MINVENT,
    LOST_NONE, LOST_THROWN, LOST_DROPPED, LOST_STOLEN, LOST_EXPLODING,
    STONE, MENU_TRADITIONAL, MENU_FULL,
    AUTOSELECT_SINGLE, INVORDER_SORT, FEEL_COCKATRICE, BY_NEXTHERE,
    PICK_ANY, PICK_ONE,
    ICE, MOAT, DRAWBRIDGE_UP, DRAWBRIDGE_DOWN, LAVAPOOL, DB_UNDER, DB_ICE, DB_LAVA, DB_MOAT,
    IS_POOL, IS_LAVA, IS_FURNITURE, PLNMSG_BACK_ON_GROUND, FUMBLING, TIMEOUT,
    LOOKHERE_NOFLAGS, LOOKHERE_PICKED_SOME, LOOKHERE_SKIP_DFEATURE,
    SLT_ENCUMBER, MOD_ENCUMBER, HVY_ENCUMBER, EXT_ENCUMBER,
    DUST, ENGRAVE, HEADSTONE, BURN, MARK, ENGR_BLOOD,
    IS_AIR, IS_ALTAR, IS_GRAVE, IS_FOUNTAIN, IS_WALL, IS_DOOR, IS_ROOM,
    SDOOR, CLOUD, Is_waterlevel, Is_earthlevel,
    In_sokoban, HAND, P_RIDING, P_BASIC,
    SHOPBASE, ESHK, STONE_RES,
} from './const.js';
/* C ref: pickup.c:2293 the `lootmon` branch — mon_beside() needs m_at(). */
import { m_at } from './uhitm.js';
/* C ref: dungeon.c:1770 surface()'s `hliquid("water"/"lava")` calls — real
 * body, no import cycle (js/mhitm.js does not import this file). */
import { hliquid } from './mhitm.js';
/* pickup()'s own guard cascade (pickup.c:690-735) — real, already-ported
 * bodies from their owning files, imported read-only. */
import { is_pool, look_here } from './look.js';
import { t_at } from './trap.js';
import { can_reach_floor, addinv_core0, hold_another_object } from './hold_another_object.js';
import { freehand, cant_reach_floor } from './engrave.js';
import { rider_cant_reach } from './steed.js';
import { P_SKILL } from './skills.js';
import {
    safe_qbuf as safe_qbuf_shk, costly_spot, in_rooms, addtobill, shop_keeper, inhishop, remote_burglary,
} from './shk.js';
import { remove_object, upstart, engr_at, On_stairs } from './mklev.js';
import {
    max_capacity, calc_capacity, near_capacity, weight,
} from './weight.js';
import { ansimpleoname, an, doname, cxname_singular, getObjDescr, xname, the, otense } from './objnam.js';
import { observe_object } from './o_init.js';
/* C ref: describe_decor()'s own callees (invent.c dfeature_at, dungeon.c
 * waterbody_name, trap.c back_on_ground) are all real, tested bodies that
 * already live in js/cmd.js (exported) — js/cmd.js already imports several
 * pickup.c functions FROM this file (doloot, unconscious, container_at, …),
 * so this is a genuine two-way module cycle.  Verified safe: these are
 * hoisted `function` exports referenced only from inside other functions
 * (never at module-evaluation time), and a standalone import test confirmed
 * both directions resolve with no TDZ error.  cmd.js's OWN describe_decor
 * (module-private, not exported, and not this file's to edit) omits the
 * HFumbling-deferral guard and the ICE/Norep arm — this port's describe_decor
 * below restores both directly from pickup.c rather than copying that gap. */
import {
    dfeature_at as _cmd_dfeature_at,
    waterbody_name as _cmd_waterbody_name,
    pooleffects_back_on_ground as _cmd_back_on_ground,
    body_part,
    count_unpaid,
} from './cmd.js';
import { getlin } from './wizcmds.js';
import { def_oc_syms_chars, def_char_to_objclass } from './drawing.js';

/* Container types: Is_container checks otyp >= LARGE_BOX && otyp <= BAG_OF_TRICKS.
 * From nethack-c/include/obj.h:
 * LARGE_BOX=214, CHEST=215, ICE_BOX=216, SACK=217, OILSKIN_SACK=218,
 * BAG_OF_HOLDING=219, BAG_OF_TRICKS=220.
 * C ref: pickup.c:2025 if (Is_container(cobj))
 */
function isContainer(obj) {
    if (!obj) return false;
    const otyp = (obj.otyp | 0);
    return otyp >= 214 && otyp <= 220; // LARGE_BOX to BAG_OF_TRICKS
}

/* Is there a container at x,y. Optional: return count of containers at x,y.
 * C ref: pickup.c:2017-2032 container_at(coordxy x, coordxy y, boolean countem)
 * No RNG. Walks the nexthere chain and counts containers.
 */
export function container_at(x, y, countem) {
    const lobj = game.level?.levelObjects?.[x | 0]?.[y | 0];
    let containerCount = 0;

    for (let cobj = lobj; cobj; cobj = cobj.nexthere) {
        if (isContainer(cobj)) {
            containerCount++;
            if (!countem)
                break;
        }
    }
    return containerCount | 0;
}

function nolimbs(ptr) {
    return ((ptr?.mflags1 | 0) & 0x00006000) === 0x00006000;
}

export async function able_to_loot(x, y, looting) {
    const verb = looting ? 'loot' : 'tip';
    const t = t_at(x, y);

    if (!can_reach_floor(t && is_pit(t.ttyp))) {
        if (game.u.usteed && P_SKILL(P_RIDING) < P_BASIC)
            await rider_cant_reach();
        else
            await cant_reach_floor(x, y, false, true, false);
        return false;
    } else if ((is_pool(x, y) && (looting || !_Underwater())) || _is_lava(x, y)) {
        await pline('You cannot %s things that are deep in the %s.', verb,
                    hliquid(_is_lava(x, y) ? 'lava' : 'water'));
        return false;
    } else if (nolimbs(game.youmonst?.data || game.youmonst)) {
        await pline('Without limbs, you cannot %s anything.', verb);
        return false;
    } else if (looting && !freehand()) {
        await pline('Without a free %s, you cannot loot anything.', body_part(HAND));
        return false;
    }
    return true;
}

/* reset last-picked-up flags
 * C ref: pickup.c:615-632 reset_justpicked(struct obj *olist)
 * Simple loop through linked list, setting pickup_prev to 0.
 */
export function reset_justpicked(olist) {
    for (let otmp = olist; otmp; otmp = otmp.nobj) {
        otmp.pickup_prev = 0;
    }
}

/* Test if handling a fatal corpse is safe
 * C ref: pickup.c:272-281 u_safe_from_fatal_corpse(struct obj *obj, int tests)
 * Check if we're safe from petrification when touching a corpse.
 * test flags (from hack.h):
 *   st_gloves = 0x1     - wearing gloves?
 *   st_corpse = 0x2     - is it a corpse obj?
 *   st_petrifies = 0x4  - does the corpse petrify on touch?
 *   st_resists = 0x8    - do you have stoning resistance?
 */
export function u_safe_from_fatal_corpse(obj, tests) {
    const st_gloves = 0x1;
    const st_corpse = 0x2;
    const st_petrifies = 0x4;
    const st_resists = 0x8;
    const CORPSE = 265;
    const PM_COCKATRICE = 10;
    const PM_CHICKATRICE = 9;

    // Helper: check if a monster petrifies on touch
    function touch_petrifies(mndx) {
        return mndx === PM_COCKATRICE || mndx === PM_CHICKATRICE;
    }

    // Check if we have stone resistance
    function hasStoneResistance() {
        const p = game.u?.uprops?.[STONE_RES];
        return !!((p?.intrinsic | 0) || (p?.extrinsic | 0));
    }

    // Test each condition in order (C: if-else with OR operators)
    if (((tests & st_gloves) && game.u.uarmg)
        || ((tests & st_corpse) && obj.otyp !== CORPSE)
        || ((tests & st_petrifies) && !touch_petrifies(obj.corpsenm))
        || ((tests & st_resists) && hasStoneResistance())) {
        return 1; // TRUE
    }
    return 0; // FALSE
}

/* C pickup.c fatal_corpse_mistake: a successful stone-golem transformation
 * permits the transfer; petrification stops it even after lifesaving. */
export async function fatal_corpse_mistake(obj, remotely) {
    if (u_safe_from_fatal_corpse(obj, 0x0f) || remotely) return false;
    const data = game.youmonst?.data;
    if (data && poly_when_stoned(data) && await polymon(PM_STONE_GOLEM)) {
        topl_force_break_after(game._pending_message);
        await flush_screen(1);
        return false;
    }
    await pline('Touching %s is a fatal mistake.',
        corpse_xname(obj, null, CXN_SINGULAR | CXN_ARTICLE));
    const { instapetrify } = await _cmdModule();
    await instapetrify(killer_xname(obj));
    return true;
}

export function menu_class_present(c) {
    // C: return (c && strchr(gv.valid_menu_classes, c)) ? TRUE : FALSE;
    if (!c) return 0; // FALSE
    const validMenuClasses = game.gv?.valid_menu_classes || '';
    return validMenuClasses.includes(String.fromCharCode(c)) ? 1 : 0; // TRUE or FALSE
}

let add_valid_menu_class_vmc_count = 0;

export function add_valid_menu_class(c) {
    if (c === 0) { /* reset */
        add_valid_menu_class_vmc_count = 0;
        game.gc = game.gc || {};
        game.gb = game.gb || {};
        game.gs = game.gs || {};
        game.gp = game.gp || {};
        game.gc.class_filter = false;
        game.gb.bucx_filter = false;
        game.gs.shop_filter = false;
        game.gp.picked_filter = false;
    } else if (!menu_class_present(c)) {
        game.gv = game.gv || {};
        game.gv.valid_menu_classes = (game.gv.valid_menu_classes || '').slice(0, add_valid_menu_class_vmc_count) + String.fromCharCode(c);
        add_valid_menu_class_vmc_count++;
        /* categorize the new class */
        switch (c) {
        case 66: /* 'B' */
        case 85: /* 'U' */
        case 67: /* 'C' */
        case 88: /* 'X' */
            game.gb = game.gb || {};
            game.gb.bucx_filter = true;
            break;
        case 80: /* 'P' */
            game.gp = game.gp || {};
            game.gp.picked_filter = true;
            break;
        case 117: /* 'u' */
            game.gs = game.gs || {};
            game.gs.shop_filter = true;
            break;
        default:
            game.gc = game.gc || {};
            game.gc.class_filter = true;
            break;
        }
    }
    game.gv = game.gv || {};
    game.gv.valid_menu_classes = (game.gv.valid_menu_classes || '').slice(0, add_valid_menu_class_vmc_count);
}

/* C obj.h container otyps. */
const LARGE_BOX_OTYP = 214;
const CHEST_OTYP = 215;
const ICE_BOX_OTYP = 216;
const BAG_OF_TRICKS_OTYP = 220;
const AUTOUNLOCK_APPLY_KEY = 2;

/* C ref: objnam.c — bare box/chest name (obj_typename lacks box names in JS). */
function _box_xname(obj) {
    switch (obj ? (obj.otyp | 0) : 0) {
        case LARGE_BOX_OTYP: return 'large box';
        case CHEST_OTYP: return 'chest';
        case ICE_BOX_OTYP: return 'ice box';
        default: return 'box';
    }
}
/* C ref: objnam.c the(str) / The(str) — definite article. */
function _the(str) { return 'the ' + str; }
function _The(str) { return 'The ' + str; }

async function do_loot_cont(cobjRef, cindex, ccount) {
    const g = game;
    const cobj = cobjRef.obj;
    if (!cobj) return ECMD_OK;

    if (cobj.olocked) {
        let res = ECMD_OK;
        const autounlock = AUTOUNLOCK_APPLY_KEY;
        const ox = cobj.ox | 0, oy = cobj.oy | 0;
        g.u.dz = 0; /* C pickup.c:2110 — #loot isn't a move; pick_lock cares. */
        let unlocktool = null;
        if ((autounlock & AUTOUNLOCK_APPLY_KEY) !== 0)
            unlocktool = autokey(true);
        const willPrompt = unlocktool != null;
        const _resuming = willPrompt && game.xlock && game.xlock.usedtime && (unlocktool.otyp|0) === game.xlock.picktyp;
        /* C pickup.c:2100-2103 — locked message; lknown picks "is locked" vs
         * "Hmmm, ... turns out to be locked."  Page it (cross-pline --More--)
         * only when a follow-up unlock prompt will arrive to force the page. */
        const lockedMsg = cobj.lknown
            ? `${_The(_box_xname(cobj))} is locked.`
            : `Hmmm, ${_the(_box_xname(cobj))} turns out to be locked.`;
        if (willPrompt && !_resuming)
            await pline_with_more(lockedMsg);
        else
            await pline(lockedMsg);
        cobj.lknown = 1;

        if (autounlock && willPrompt) {
            /* C pickup.c:2119 — pass ox,oy to skip the direction prompt. */
            if (await pick_lock(unlocktool, ox, oy, cobj))
                res = ECMD_TIME;
            return res;
        }
        /* AUTOUNLOCK_FORCE branch (doforce) — not in default flags; with no
         * unlock tool the locked container is simply reported. */
        return res;
    }

    cobj.lknown = 1;
    if (cobj.otyp === BAG_OF_TRICKS_OTYP) {
        return ECMD_TIME;
    }
    /* C pickup.c:2155 — use_container for an unlocked container. */
    return await use_container(cobjRef, false, cindex < ccount);
}

/* C ref: pickup.c:2159 doloot() — the #loot extended command. */
export async function doloot() {
    const g = game;
    g.loot_reset_justpicked = true;
    const res = await doloot_core();
    g.loot_reset_justpicked = false;
    if ((res & ECMD_TIME) && g._pending_message) {
        _topl_stash_result();
    }
    return res;
}

async function doloot_core() {
    const g = game;
    const u = g.u;
    let c = -1;
    let timepassed = 0;
    /* C pickup.c:2175-2180 — cc starts at the hero's own square; `underfoot`
     * tracks whether cc is still there (the lootmon branch can move it). */
    const cc = { x: u.ux | 0, y: u.uy | 0 };
    let underfoot = true;
    let prev_inquiry = 0, prev_loot = false;

    g.abort_looting = false;

    /* C pickup.c:2188 — check_capacity: false (unencumbered hero). */
    if (_loot_nohands()) {
        await pline("You have no hands!");
        return ECMD_OK;
    }
    /* C pickup.c:2198 — Confusion: false. */

    /* C's `lootcont:` label sits above the container block and the lootmon
     * branch jumps BACK to it when the player directs at their own square and
     * a container is there; a labelled loop is the transliteration. */
    lootcont:
    for (;;) {
        /* C pickup.c:2211 — container(s) at cc? */
        const numConts = container_at(cc.x, cc.y, true);
        if (numConts > 0) {
            if (!(await able_to_loot(cc.x, cc.y, true)))
                return ECMD_OK;
            let anyfound = false;
            if (numConts > 1) {
                /* C pickup.c:2227-2264 — present a PICK_ANY menu when more
                 * than one container occupies the square.  The menu window
                 * itself is not painted by this port's replay UI, but
                 * _select_menu implements the same tty selection semantics
                 * used by query_objlist: sequential selectors, toggle,
                 * select-all, cancel, and commit. */
                const containers = [];
                for (let cobj = g.level?.levelObjects?.[cc.x]?.[cc.y];
                     cobj; cobj = cobj.nexthere) {
                    if (_isContainerObj(cobj))
                        containers.push(cobj);
                }
                const menuItems = [];
                for (const obj of containers)
                    menuItems.push({ obj, sel: null, gsel: null, selected: false,
                                     text: await doname(obj) });
                /* wintty.c tty_end_menu assigns a, b, ... restarting at 'a' on
                 * each page (23 rows; the title and blank row take two). */
                let menuCh = 97;
                for (let ix = 0; ix < menuItems.length; ix++) {
                    if (ix > 0 && menuItems.length + 3 > 24 && (ix + 2) % 23 === 0)
                        menuCh = 97;
                    menuItems[ix].sel = String.fromCharCode(menuCh);
                    menuCh = (menuCh === 122) ? 65 : menuCh + 1;
                }
                const cancelled = await _select_menu(menuItems, PICK_ANY,
                                                      { title: 'Loot which containers?' });
                if (!cancelled) {
                    const selected = menuItems.filter((item) => item.selected);
                    for (let i = 0; i < selected.length; i++) {
                        const ref = { obj: selected[i].obj };
                        timepassed |= await do_loot_cont(ref, i + 1,
                                                         selected.length);
                        if (g.abort_looting)
                            return timepassed ? ECMD_TIME : ECMD_OK;
                    }
                    if (selected.length)
                        c = 'y';
                }
            } else {
                /* C pickup.c:2268 — single container: walk the tile chain. */
                const lvlObjs = g.level?.levelObjects;
                let cobj = lvlObjs?.[cc.x]?.[cc.y] ?? null;
                while (cobj) {
                    const nobj = cobj.nexthere;
                    if (_isContainerObj(cobj)) {
                        anyfound = true;
                        const ref = { obj: cobj };
                        timepassed |= await do_loot_cont(ref, 1, 1);
                        if (g.abort_looting)
                            return timepassed ? ECMD_TIME : ECMD_OK;
                    }
                    cobj = nobj;
                }
                if (anyfound) c = 'y';
            }
        }

        if (c !== 'y' && (mon_beside(u.ux | 0, u.uy | 0)
                          || g.iflags?.menu_requested)) {
            let looted_mon = false;
            if (!await get_adjacent_loc('Loot in what direction?',
                                        'Invalid loot location',
                                        u.ux | 0, u.uy | 0, cc))
                return ECMD_OK;
            underfoot = u_at(cc.x, cc.y);
            if (underfoot && container_at(cc.x, cc.y, false))
                continue lootcont; /* C: goto lootcont */
            if ((u.dz | 0) < 0) {
                await pline("You don't find anything to loot on the ceiling.");
                return ECMD_TIME;
            }
            const mtmp = m_at(cc.x, cc.y);
            if (mtmp) {
                const box = { passed_info: prev_inquiry, prev_loot };
                timepassed = await loot_mon(mtmp, box);
                prev_inquiry = box.passed_info;
                prev_loot = box.prev_loot;
                if (timepassed)
                    looted_mon = true;
            }

            /* C pickup.c:2324-2338 — preserve pre-3.3.1 behaviour for
             * containers: they can only be looted from underfoot. */
            if (!looted_mon) {
                if (!underfoot && container_at(cc.x, cc.y, false)) {
                    if (mtmp) {
                        await pline(`You can't loot anything ${prev_inquiry ? 'else ' : ''}there`
                                    + ` with ${mon_nam_loot(mtmp)} in the way.`);
                        return timepassed ? ECMD_TIME : ECMD_OK;
                    }
                    await pline('You have to be at a container to loot it.');
                } else {
                    await pline(`You don't find anything `
                                + `${(prev_inquiry || prev_loot) ? 'else ' : ''}`
                                + `${!underfoot ? 't' : ''}here to loot.`);
                    return timepassed ? ECMD_TIME : ECMD_OK;
                }
            }
        } else if (c !== 'y' && c !== 'n') {
            /* C pickup.c:2340 — the "don't find anything" tail. */
            await pline(`You don't find anything ${underfoot ? 'here' : 'there'} to loot.`);
        }
        return timepassed ? ECMD_TIME : ECMD_OK;
    }
}

/* C ref: pickup.c:2115 mon_beside(x, y) — is there a monster on or next to
 * <x,y>?  (The i==0 && j==0 case is included in C too.) */
function mon_beside(x, y) {
    for (let i = -1; i <= 1; i++)
        for (let j = -1; j <= 1; j++) {
            const nx = x + i, ny = y + j;
            if (isok(nx, ny) && m_at(nx, ny))
                return true;
        }
    return false;
}

/* C ref: cmd.c:3931 get_adjacent_loc(prompt, emsg, x, y, cc) — getdir, then
 * resolve <x,y> + <u.dx,u.dy>.  Returns 0 on a cancelled/invalid direction,
 * having plined C's Never_mind ("Never mind."). */
async function get_adjacent_loc(prompt, emsg, x, y, cc) {
    const u = game.u;
    if (!await getdir(prompt)) {
        await pline('Never mind.');
        return 0;
    }
    const new_x = x + (u.dx | 0), new_y = y + (u.dy | 0);
    if (cc && isok(new_x, new_y)) {
        cc.x = new_x;
        cc.y = new_y;
    } else {
        if (emsg)
            await pline(emsg);
        return 0;
    }
    return 1;
}

async function loot_mon(mtmp, box) {
    if (mtmp && mtmp !== game.u?.usteed && (which_armor(mtmp, _W_SADDLE) || _which_saddle(mtmp))) {
        const saddle = which_armor(mtmp, _W_SADDLE) || _which_saddle(mtmp);
        if (box) box.passed_info = 1;
        const ans = await yn_function(`Do you want to remove the saddle from ${mon_nam_loot(mtmp)}?`, 'ynq', 'n');
        if (ans === 'y') {
            const mflags1 = (game.youmonst?.data?.mflags1 ?? game.u?.umonnum?.mflags1 ?? 0) | 0;
            if ((mflags1 & 0x6000) === 0x6000) {
                await pline("You can't do that without limbs.");
                return 0;
            }
            if (saddle.cursed) {
                await pline(`You can't.  The saddle seems to be stuck to ${mon_nam_loot(mtmp)}.`);
                return 1;
            }
            /* C extract_from_minvent(mtmp,saddle): unlink and clear worn state. */
            let prev = null, cur = mtmp.minvent;
            while (cur && cur !== saddle) { prev = cur; cur = cur.nobj; }
            if (cur === saddle) {
                if (prev) prev.nobj = cur.nobj; else mtmp.minvent = cur.nobj;
                cur.nobj = null; cur.ocarry = null; cur.where = OBJ_FREE;
            }
            cur.owornmask = 0;
            mtmp.misc_worn_check = (mtmp.misc_worn_check | 0) & ~_W_SADDLE;
            await pline(`You take ${(await doname(cur))} off of ${mon_nam_loot(mtmp)}.`);
            await hold_another_object(cur, 'You drop %s!', (await doname(cur)), null);
            if (box) box.prev_loot = true;
            return rnd(3);
        }
        if (ans === 'q') return 0;
    }
    if (game.u?.uswallow) {
        const count = box?.passed_info | 0;
        return await pickup(count);
    }
    return 0;
}
const _SADDLE_OTYP = 235;
const _W_SADDLE = 0x00080000; /* obj.h W_SADDLE */
function _which_saddle(mtmp) {
    for (let o = mtmp.minvent; o; o = o.nobj)
        if ((o.otyp | 0) === _SADDLE_OTYP && ((o.owornmask | 0) & _W_SADDLE))
            return o;
    return null;
}
function mon_nam_loot(mtmp) {
    return `the ${mtmp?.data?.mname ?? 'monster'}`;
}

/* C ref: mondata.h:52 nohands(ptr) = ((ptr->mflags1 & M1_NOHANDS) != 0),
 * applied to gy.youmonst.data — the hero's CURRENT form (polyself.c set_uasmon
 * points youmonst.data at mons[u.umonnum] whether polymorphed or not).  RNG-free.
 * Reading game.youmonst.data directly is the same access js/cmd.js:9962
 * _hero_nohands makes; a hero whose youmonst has not been built yet reads as
 * "has hands", which is what the un-polymorphed @-class hero is. */
const _M1_NOHANDS_PU = 0x00002000; /* monflag.h:98 */
function _loot_nohands() {
    const d = game.youmonst && game.youmonst.data;
    return !!(d && ((d.mflags1 >>> 0) & _M1_NOHANDS_PU) !== 0);
}

function _isContainerObj(obj) {
    if (!obj) return false;
    const otyp = obj.otyp | 0;
    return otyp >= 214 && otyp <= 220;
}

/* C ref: pickup.c:2959 use_container() — the take-out / put-in menu.
 * Ported separately below (or stubbed); imported lazily to avoid a cycle. */
async function use_container(cobjRef, held, more_containers) {
    const { use_container_impl } = await import('./pickup_container.js');
    return await use_container_impl(cobjRef, held, more_containers);
}


/* ---- small pickup.c-local constants not already in const.js ---- */
const _CORPSE_OTYP = 265;
const _SCR_SCARE_MONSTER_OTYP = 326;
const _BOULDER_OTYP = 475;
const _LOADSTONE_OTYP = 471;
const _COIN_CLASS = 12;
const _LAVAPOOL_TYP = 20, _LAVAWALL_TYP = 21;
const _M1_NOTAKE = 0x00000800;   /* monflag.h */
const _M1_HIDE = 0x00000100;     /* monflag.h — hides_under() */
const _invlet_basic = 52;        /* hack.h invlet_basic */

function _OBJ_AT(x, y) {
    return !!(game.level?.levelObjects?.[x | 0]?.[y | 0]);
}

/* C dbridge.c:is_lava — include lava beneath a raised drawbridge. */
function _is_lava(x, y) {
    if (!isok(x, y)) return false;
    const lev = game.level?.at ? game.level.at(x, y) : null;
    if (!lev) return false;
    return lev.typ === _LAVAPOOL_TYP || lev.typ === _LAVAWALL_TYP
        || (lev.typ === DRAWBRIDGE_UP
            && ((lev.drawbridgemask | 0) & DB_UNDER) === DB_LAVA);
}

/* C ref: hack.h Underwater — !!u.uinwater.  js/cmd.js has an unexported local
 * copy of the same one-liner; mirrored here rather than imported (module-
 * private in that file). */
function _Underwater() {
    return !!(game.u && game.u.uinwater);
}

/* C ref: mondata.h:54 notake(ptr) = ((ptr->mflags1 & M1_NOTAKE) != 0).
 * RNG-free.  Mirrors this file's own _loot_nohands() convention for reading
 * the hero's CURRENT youmonst.data. */
function notake(data) {
    return !!(data && ((data.mflags1 | 0) & _M1_NOTAKE) !== 0);
}

/* C ref: mondata.h hides_under(ptr) = ((ptr->mflags1 & M1_HIDE) != 0). */
function _hides_under(data) {
    return !!(data && ((data.mflags1 | 0) & _M1_HIDE) !== 0);
}

/* C ref: rm.h:133-136 SURFACE_AT(x,y) and dbridge.c:115-128 db_under_typ().
 * Mirrors js/look.js's own file-local `_surface_at`/`_db_under_typ` pair
 * (established convention: each file mirrors this one-off macro rather than
 * importing another file's module-private copy). */
function _db_under_typ(mask) {
    switch ((mask & DB_UNDER) | 0) {
    case DB_ICE:  return ICE;
    case DB_LAVA: return LAVAPOOL;
    case DB_MOAT: return MOAT;
    default:      return STONE;
    }
}
function _surface_at(x, y) {
    const lev = game.level?.at ? game.level.at(x, y) : null;
    if (!lev) return STONE;
    return (lev.typ === DRAWBRIDGE_UP)
        ? _db_under_typ(lev.drawbridgemask | 0)
        : lev.typ;
}

/* C ref: dungeon.c:1749-1785 surface(x,y) — the narrative terrain word used
 * by read_engr_at()'s "on the <eloc>" plines below.  NOT transcribed: the
 * `u_at(x,y) && u.uswallow && is_animal(...)` maw/husk arm (dungeon.c:1754-
 * 1759) — every caller of read_engr_at in THIS file already runs on the
 * `!u.uswallow` path (pickup()'s own guard, and check_here() is only called
 * from there), so porting an untested swallowed-hero branch here would be a
 * guess, mirroring js/look.js's own `_surface_lk`'s identical omission for
 * the identical reason.  Reuses this file's own `_surface_at(x,y)` for the
 * SURFACE_AT(x,y) macro (rm.h:133) rather than re-deriving it. RNG: none. */
function _surface_word(x, y) {
    const lev = game.level?.at ? game.level.at(x, y) : null;
    if (!lev) return 'ground';
    const levtyp = _surface_at(x, y);
    if (IS_AIR(levtyp))
        return Is_waterlevel(game.u?.uz)
            ? 'air bubble' : (levtyp === CLOUD ? 'cloud' : 'air');
    if (is_pool(x, y))
        return (_Underwater() && !Is_waterlevel(game.u?.uz))
            ? 'bottom' : hliquid('water');
    if (lev.typ === ICE)
        return 'ice';
    if (_is_lava(x, y))
        return hliquid('lava');
    if (lev.typ === DRAWBRIDGE_DOWN)
        return 'bridge';
    if (IS_ALTAR(levtyp))
        return 'altar';
    if (IS_GRAVE(levtyp))
        return 'headstone';
    if (IS_FOUNTAIN(levtyp))
        return 'fountain';
    if (On_stairs(x, y))
        return 'stairs';
    if (IS_WALL(levtyp) || levtyp === SDOOR)
        return 'wall';
    if (IS_DOOR(levtyp))
        return 'doorway';
    if (IS_ROOM(levtyp) && !Is_earthlevel(game.u?.uz))
        return 'floor';
    return 'ground';
}

/* C ref: pickup.c:335-348 deferred_decor(boolean setup) — called ONLY from
 * describe_decor()'s own HFumbling guard below (setup=TRUE); the setup=FALSE
 * half (re-invoke describe_decor and clear the defer flag) exists for
 * fidelity but has no reachable caller in this file — timeout.c's
 * fumbling-timeout handler, the only setup=FALSE caller in the C tree, is
 * outside this file's ownership and does not call into js/pickup.js. */
async function deferred_decor(setup) {
    const g = game;
    g.iflags = g.iflags || {};
    if (!g.flags?.mention_decor) {
        g.iflags.defer_decor = false;
    } else if (setup) {
        g.iflags.defer_decor = true;
    } else {
        await describe_decor();
        g.iflags.defer_decor = false;
    }
}

async function describe_decor() {
    const g = game;
    const u = g.u;
    g.iflags = g.iflags || {};
    g.gd = g.gd || {};
    let res = true;

    const hfumbling = (u.uprops?.[FUMBLING]?.intrinsic | 0);
    if ((hfumbling & TIMEOUT) === 1
        && !g.iflags.defer_decor
        && !g.gd.decor_fumble_override) {
        await deferred_decor(true);
        return false;
    }

    const ux = u.ux | 0, uy = u.uy | 0;
    const ltyp = _surface_at(ux, uy);
    let dfeature = _cmd_dfeature_at(ux, uy);

    const doorhere = !!dfeature
        && (dfeature === 'open door' || dfeature === 'doorway');
    const waterhere = dfeature === 'pool of water';
    const prevDecor = (g.iflags.prev_decor == null)
        ? STONE : (g.iflags.prev_decor | 0);
    if (doorhere || _Underwater()
        || (ltyp === ICE && IS_POOL(prevDecor)))
        dfeature = null;

    if (ltyp === prevDecor && !IS_FURNITURE(ltyp)) {
        res = false;
    } else if (dfeature) {
        if (waterhere)
            dfeature = _cmd_waterbody_name(ux, uy);
        if (dfeature !== 'swamp' && ltyp !== ICE)
            dfeature = an(dfeature);

        const outbuf = g.flags?.verbose
            ? `There is ${dfeature} here.`
            : `${upstart(dfeature)}.`;
        if (ltyp === ICE && g.flags?.mention_decor)
            await Norep(outbuf);
        else
            await pline(outbuf);
    } else if (!_Underwater()) {
        if (IS_POOL(prevDecor) || IS_LAVA(prevDecor) || prevDecor === ICE) {
            if ((g.iflags.last_msg | 0) !== PLNMSG_BACK_ON_GROUND)
                _cmd_back_on_ground(false);
        }
    }
    g.iflags.prev_decor = g.flags?.mention_decor ? ltyp : STONE;
    return res;
}

async function read_engr_at(x, y) {
    const ep = engr_at(x, y);
    /* C engrave.c:321 — eloc = surface(x, y) is evaluated before the engraving
     * test (hliquid draws on the DISPLAY stream when hallucinating over a pool). */
    const eloc = _surface_word(x, y);
    if (!ep || !ep.text || !ep.text[0])
        return;
    const isBlind = Blind();
    const isIce = game.level?.at ? game.level.at(x, y)?.typ === ICE : false;
    let sensed = false;
    switch (ep.engr_type) {
    case DUST:
        if (!isBlind) {
            sensed = true;
            await pline(`Something is written here in the ${isIce ? 'frost' : 'dust'}.`);
        }
        break;
    case ENGRAVE:
    case HEADSTONE:
        if (!isBlind || can_reach_floor(true)) {
            sensed = true;
            await pline(`Something is engraved here on the ${eloc}.`);
        }
        break;
    case BURN:
        if (!isBlind || can_reach_floor(true)) {
            sensed = true;
            await pline(`Some text has been ${isIce ? 'melted' : 'burned'} into the ${eloc} here.`);
        }
        break;
    case MARK:
        if (!isBlind) {
            sensed = true;
            await pline(`There's some graffiti on the ${eloc} here.`);
        }
        break;
    case ENGR_BLOOD:
        if (!isBlind) {
            sensed = true;
            await pline('You see a message scrawled in blood here.');
        }
        break;
    default:
        /* C: impossible("%s is written in a very strange way.", Something);
         * sensed = TRUE; — impossible() is a debug/panic channel this port
         * does not surface as a player-visible pline (established
         * convention, see js/look.js's identical `_read_engr_at` default
         * arm). engr_type is written only by make_engr_at() call sites in
         * this tree and every one passes a DUST/ENGRAVE/BURN/MARK/
         * ENGR_BLOOD/HEADSTONE constant, so this default is dead on the
         * whole port today; ported anyway, matching Cardinal Rule 1. */
        sensed = true;
        break;
    }
    if (!sensed)
        return;
    /* C ref: engrave.c:373-397 — the reveal pline and its trailing
     * punctuation.  `off` is the actual-text pointer's offset into the
     * original buffer (js/mklev.js's make_engr_at/wipe_engr_at maintain it);
     * the pristine copy is looked up at that SAME offset, not re-based. */
    const et = ep.text;
    const elen = et.length;
    const off = ep.off | 0;
    const pristine = (ep.pristine != null) ? ep.pristine : et;
    const last = et[elen - 1];
    let endpunct = '';
    if (elen < 2
        || !(pristine[off + elen - 1] === last
             && (last === '.' || last === '!' || last === '?')))
        endpunct = '.';
    await pline(`You ${isBlind ? 'feel the words' : 'read'}: "${et}"${endpunct}`);
    /* C engrave.c:398 — a successful read snapshots the current (possibly
     * wiped) actual text.  /e and /E later display this remembered copy. */
    ep.remembered = ep.text;
    ep.eread = 1;
    ep.erevealed = 1;
    /* C: if (svc.context.run > 0) nomul(0); — reading an engraving stops a
     * run, exactly like stepping onto an object pile does at pickup.c:451
     * (this file's own check_here(), a few lines below). */
    if ((game.context?.run | 0) > 0)
        nomul(0);
}

/* C ref: pickup.c:430-455 check_here(picked_some).  describe_decor(),
 * look_here() and read_engr_at() are now all real (see above and
 * js/look.js). */
async function check_here(picked_some) {
    const g = game;
    const u = g.u;
    let lhflags = picked_some ? LOOKHERE_PICKED_SOME : LOOKHERE_NOFLAGS;

    if (g.flags?.mention_decor) {
        if (await describe_decor())
            lhflags |= LOOKHERE_SKIP_DFEATURE;
    }

    let ct = 0;
    for (let obj = g.level?.levelObjects?.[u.ux | 0]?.[u.uy | 0]; obj;
         obj = obj.nexthere) {
        if (obj !== g.u?.uchain)
            ct++;
    }

    if (ct) {
        if (g.context?.run)
            nomul(0);
        await flush_screen(1);
        await look_here(ct, lhflags);
    } else {
        await read_engr_at(u.ux | 0, u.uy | 0);
    }
}

/* FOLLOW macro (pickup.c:56-57): BY_NEXTHERE walks .nexthere, else .nobj. */
function _follow(curr, qflags) {
    return (qflags & BY_NEXTHERE) ? curr.nexthere : curr.nobj;
}

function check_autopickup_exceptions(obj) {
    void obj;
    return null;
}

/* C ref: pickup.c:925-947 autopick_testobj(otmp, calc_costly).
 * `static boolean costly` (C) becomes a module-level `let`, matching the
 * fact that it is recomputed on every autopick() call that has >=1 item
 * (calc_costly is TRUE exactly once, on the first item of each call). */
let _autopick_costly = false;
const DEF_OC_SYMS = [
    undefined,
    ']', ')', '[', '=', '"', '(', '%', '!',
    '?', '+', '/', '$', '*', '`', '0', '_', '.',
];
function autopick_testobj(otmp, calc_costly) {
    const g = game;
    const otypes = g.flags?.pickup_types || '';

    if (calc_costly)
        _autopick_costly = ((otmp.where | 0) === OBJ_FLOOR
            && costly_spot(otmp.ox | 0, otmp.oy | 0));

    if (_autopick_costly && !otmp.no_charge)
        return false;

    if ((g.flags?.pickup_thrown ?? true) /* default On, optlist.h:579 */ && (otmp.how_lost | 0) === LOST_THROWN)
        return true;
    if (g.flags?.pickup_stolen && (otmp.how_lost | 0) === LOST_STOLEN)
        return true;
    if (g.flags?.nopick_dropped && (otmp.how_lost | 0) === LOST_DROPPED)
        return false;
    if ((otmp.how_lost | 0) === LOST_EXPLODING)
        return false;

    let pickit = (!otypes || otypes.length === 0
                  || otypes.includes(DEF_OC_SYMS[otmp.oclass | 0]));
    const ape = check_autopickup_exceptions(otmp);
    if (ape)
        pickit = ape.grab;
    return pickit;
}

/* C ref: pickup.c:988-1003 autopick(olist, follow, pick_list).  Returns an
 * array of {obj, count} (this port's pick_list shape), never a raw count +
 * out-param the way C's alloc()'d menu_item array works. */
function autopick(olist, follow) {
    const items = [];
    let check_costly = true;
    for (let curr = olist; curr; curr = _follow(curr, follow)) {
        if (autopick_testobj(curr, check_costly))
            items.push({ obj: curr, count: curr.quan | 0 });
        check_costly = false;
    }
    return items;
}

/* C ref: pickup.c:509 all_but_uchain(obj) — query_objlist callback. */
function all_but_uchain(obj) {
    return obj !== game.u?.uchain;
}

/* C ref: pickup.c:1004-1009 n_or_more(obj) — query_objlist callback; gv.
 * val_for_n_or_more is threaded here as an explicit parameter instead of a
 * global, since this port's query_objlist takes the callback pre-bound. */
function n_or_more(obj, refCount) {
    if (obj === game.u?.uchain) return false;
    return (obj.quan | 0) >= refCount;
}

const _QO_SELECT_ALL = 0x2e /* '.' */, _QO_UNSELECT_ALL = 0x2d /* '-' */,
      _QO_INVERT_ALL = 0x40 /* '@' */, _QO_SELECT_PAGE = 0x2c /* ',' */,
      _QO_UNSELECT_PAGE = 0x5c /* '\\' */, _QO_INVERT_PAGE = 0x7e /* '~' */;
/* C ref: wintty.c:1560-1614 case '\n'/'\r'/' ' commit; case '\033' cancel
 * (deselect-everything first — this is why an ESC after some letters were
 * pressed still yields an EMPTY pick list); default: an explicit selector
 * toggles that row (PICK_ONE finishes immediately on the first toggle,
 * pickup.c:1024's `how` parameter), a group accelerator toggles its whole
 * class, anything else rings the bell and the menu stays up. */
async function _select_menu(items, how, paint = null) {
    let page = 0;
    for (;;) {
        /* wintty.c tty_end_menu: a menu taller than the terminal paginates at
         * rows-1 (23) content rows with a "(N of M)" footer; each page is a
         * full-screen window and bare selectors apply to the visible page. */
        let pageStart = 0, pageEnd = items.length, pageCount = 1;
        if (paint) {
            const all = [`\x1b[7m${paint.title}\x1b[0m`, ''];
            for (const it of items)
                all.push(`${it.sel} ${it.selected ? '+' : '-'} ${it.text}`);
            all.push('(end)');
            const tall = all.length > 24;
            let lines = all;
            if (tall) {
                const body = all.slice(0, -1);
                pageCount = Math.ceil(body.length / 23);
                if (page >= pageCount) page = pageCount - 1;
                const rs = page * 23, re = Math.min(body.length, rs + 23);
                lines = [...body.slice(rs, re), `(${page + 1} of ${pageCount})`];
                pageStart = Math.max(0, rs - 2);
                pageEnd = Math.max(0, re - 2);
                while (lines.length < 24) lines.push('');
            }
            const full = tall || lines.length === 24;
            const WIN_COL = full ? 1 : tty_window_offx(lines, 'end');
            game._pending_message = '';
            game._topl_sticky = null;
            game._screen_output = build_window_screen(lines, WIN_COL, game.u?.uac ?? 0,
                                                      tall ? 0 : undefined, undefined, full);
            const disp = game.nhDisplay;
            if (disp) {
                if (tall) {
                    const foot = `(${page + 1} of ${pageCount})`;
                    disp.cursorCol = WIN_COL + foot.length;
                    disp.cursorRow = lines.findIndex((l) => l === foot);
                } else {
                    disp.cursorCol = WIN_COL + 6;
                    disp.cursorRow = lines.length - 1;
                }
            }
        }
        const raw = await nhgetch();
        const k = typeof raw === 'number' ? raw : (raw?.charCodeAt(0) ?? 0);
        const ch = String.fromCharCode(k);
        const hit = items.find((it, ix) => it.sel === ch
            && ix >= pageStart && ix < pageEnd);
        if (hit) {
            hit.selected = !hit.selected;
            if (how === PICK_ONE) return false;
            continue;
        }
        if (k === 27) {
            for (const it of items) it.selected = false;
            return true; /* cancelled */
        }
        if (k === 32 || k === 62 /* > */) {
            if (page < pageCount - 1) { page++; continue; }
            if (k === 32) return false; /* space finishes on the last page */
            continue;
        }
        if (k === 60 /* < */) { if (page > 0) page--; continue; }
        if (k === 94 /* ^ */) { page = 0; continue; }
        if (k === 124 /* | */) { page = pageCount - 1; continue; }
        if (k === 10 || k === 13)
            return false; /* commit */
        if (how === PICK_ANY && (k === _QO_SELECT_ALL || k === _QO_SELECT_PAGE)) {
            for (const it of items) it.selected = true;
            continue;
        }
        if (k === _QO_UNSELECT_ALL || k === _QO_UNSELECT_PAGE) {
            for (const it of items) it.selected = false;
            continue;
        }
        if (how === PICK_ANY && (k === _QO_INVERT_ALL || k === _QO_INVERT_PAGE)) {
            for (const it of items) it.selected = !it.selected;
            continue;
        }
        if (ch !== '\0' && items.some((it) => it.gsel === ch)) {
            for (const it of items) if (it.gsel === ch) it.selected = !it.selected;
            if (how === PICK_ONE) return false;
            continue;
        }
        /* wintty.c:1735-1739 — unacceptable input rings the bell; menu stays up. */
    }
}

const _PU_INV_ORDER = [12, 5, 2, 3, 7, 9, 10, 8, 4, 11, 6, 13, 14, 15, 16];
const _PU_SLIME_MOLD_OTYP = 285, _PU_TIN_OTYP = 296, _PU_EGG_OTYP = 266,
      _PU_CORPSE_OTYP = 265;
function _pu_loot_subclass(obj) {
    if ((obj.oclass | 0) !== 7 /* FOOD_CLASS */)
        return 1;
    switch (obj.otyp | 0) {
    case _PU_SLIME_MOLD_OTYP: return 1;
    case _PU_TIN_OTYP:        return 3;
    case _PU_EGG_OTYP:        return 4;
    case _PU_CORPSE_OTYP:     return 5;
    default:                  return obj.globby ? 6 : 2;
    }
}
function _pu_loot_disco(obj) {
    const otyp = obj.otyp | 0;
    if (!(obj.dknown | 0)) return 1;
    const discovered = !!(game._oc_name_known && game._oc_name_known[otyp]);
    if (discovered || !getObjDescr(otyp)) return 4;
    return 2;
}
function _pu_loot_xname(obj) {
    return String(cxname_singular(obj) || '');
}
function _pu_strcmpi(a, b) {
    const x = String(a).toLowerCase(), y = String(b).toLowerCase();
    if (x === y) return 0;
    const n = Math.min(x.length, y.length);
    for (let i = 0; i < n; i++) {
        const d = x.charCodeAt(i) - y.charCodeAt(i);
        if (d) return d;
    }
    return x.length - y.length;
}
function _pu_loot_classify(obj) {
    observe_object(obj);
    const k = _PU_INV_ORDER.indexOf(obj.oclass | 0);
    return (k >= 0) ? (1 + k) : (1 + _PU_INV_ORDER.length + 1);
}
function _pu_sortloot(eligible) {
    const arr = eligible.map((obj, indx) => ({ obj, indx, orderclass: 0 }));
    if (arr.length > 1) {
        for (const sli of arr) {
            sli.orderclass = _pu_loot_classify(sli.obj);
            sli.subclass = _pu_loot_subclass(sli.obj);
            sli.disco = _pu_loot_disco(sli.obj);
            sli.str = _pu_loot_xname(sli.obj);
            sli.bucx = (sli.obj.bknown
                        ? (sli.obj.blessed ? 3 : !sli.obj.cursed ? 2 : 1) : 0);
        }
        arr.sort((a, b) => (a.orderclass - b.orderclass)
            || (a.subclass - b.subclass)
            || (a.disco - b.disco)
            || _pu_strcmpi(a.str, b.str)
            || (b.bucx - a.bucx)
            || (a.indx - b.indx));
    }
    return arr.map((sli) => sli.obj);
}

async function query_objlist(qstr, objchain, qflags, how, allow) {
    void qstr;
    let n = 0, last = null;
    const eligible = [];
    for (let curr = objchain; curr; curr = _follow(curr, qflags))
        if (allow(curr)) { last = curr; n++; eligible.push(curr); }

    if (n === 0)
        return [];
    if (n === 1 && (qflags & AUTOSELECT_SINGLE))
        return [{ obj: last, count: last.quan | 0 }];

    const sorted = _pu_sortloot(eligible);
    const items = sorted.map((o) => ({ obj: o, sel: null, gsel: null, selected: false }));
    let first = true;
    for (const it of items) {
        if (first && (it.obj.oclass | 0) === _COIN_CLASS) it.sel = '$';
        first = false;
    }
    /* wintty.c:2715-2726 tty_end_menu: any row with no explicit selector
     * gets the next 'a'..'z' then 'A'..'Z' slot, in menu (= sorted) order. */
    let menu_ch = 97; /* 'a' */
    for (const it of items) {
        if (it.sel) continue;
        it.sel = String.fromCharCode(menu_ch);
        menu_ch = (menu_ch === 122 /* 'z' */) ? 65 /* 'A' */ : menu_ch + 1;
    }
    /* def_oc_syms[oclass].sym — the group accelerator for each item's own
     * class (defsym.h's OBJCLASS table; pickup.c:1121 `any.a_obj = curr` +
     * def_oc_syms lookup). */
    const _OC_SYM = { 1: ']', 2: ')', 3: '[', 4: '=', 5: '"', 6: '(', 7: '%',
        8: '!', 9: '?', 10: '+', 11: '/', 12: '$', 13: '*', 14: '`', 15: '0',
        16: '_', 17: '.' };
    for (const it of items) {
        const gs = _OC_SYM[it.obj.oclass | 0];
        if (gs) it.gsel = gs;
    }

    const cancelled = await _select_menu(items, how);
    if (cancelled) return [];
    const picked = items.filter((it) => it.selected);
    return picked.map((it) => ({ obj: it.obj, count: it.obj.quan | 0 }));
}

/* C pickup.c:1544 delta_cwt().  A carried bag of holding contributes its
 * compressed before/after weight difference rather than the object's raw
 * weight.  Temporarily unlinking the object is exactly C's calculation and
 * preserves the container chain on return. */
function delta_cwt(container, obj) {
    if ((container.otyp | 0) !== 219 /* BAG_OF_HOLDING */)
        return obj.owt | 0;
    const oldWeight = container.owt | 0;
    let newWeight = oldWeight;
    let prev = null, cur = container.cobj;
    while (cur && cur !== obj) { prev = cur; cur = cur.nobj; }
    if (!cur)
        throw new Error('delta_cwt: obj not inside container');
    if (prev) prev.nobj = obj.nobj;
    else container.cobj = obj.nobj;
    try {
        newWeight = weight(container) | 0;
    } finally {
        if (prev) prev.nobj = obj;
        else container.cobj = obj;
    }
    return oldWeight - newWeight;
}

const GOLD_WT = (n) => Math.trunc((Number(n) + 50) / 100);
const GOLD_CAPACITY = (w, n) => (Number(w) * -100) - (Number(n) + 50) - 1;

async function carry_count(obj, container, count, telekinesis) {
    const adjust_wt = !!container && (container.where | 0) === OBJ_INVENT;
    const is_gold = (obj.oclass | 0) === _COIN_CLASS;
    const savequan = obj.quan | 0;
    const saveowt = obj.owt | 0;
    const umoney = money_cnt(game.invent) | 0;
    let iw = max_capacity();

    if (count !== savequan) {
        obj.quan = count;
        obj.owt = weight(obj) | 0;
    }
    let wt = iw + (obj.owt | 0);
    if (adjust_wt)
        wt -= delta_cwt(container, obj);
    if (is_gold)
        wt -= GOLD_WT(umoney) + GOLD_WT(count) - GOLD_WT(umoney + count);
    if (count !== savequan) {
        obj.quan = savequan;
        obj.owt = saveowt;
    }
    const wt_before = iw;
    let wt_after = wt;

    if (wt < 0)
        return { count, wt_before, wt_after };

    /* C pickup.c:1631-1697 — find the largest prefix of a stack that fits.
     * The caller supplies the user-facing confirmation/message; this routine
     * only needs the native count and post-lift weight. */
    let qq = 0;
    if (is_gold) {
        iw -= GOLD_WT(umoney);
        if (!adjust_wt) {
            qq = GOLD_CAPACITY(iw, umoney);
        } else {
            let oldOw = 0;
            qq = 50 - (umoney % 100) - 1;
            if (qq < 0) qq += 100;
            for (; qq <= count; qq += 100) {
                obj.quan = qq;
                obj.owt = GOLD_WT(qq);
                let ow = GOLD_WT(umoney + qq);
                ow -= delta_cwt(container, obj);
                if (iw + ow >= 0) break;
                oldOw = ow;
            }
            iw -= oldOw;
            qq -= 100;
        }
        qq = Math.max(0, Math.min(qq, count));
        wt = iw + GOLD_WT(umoney + qq);
    } else if (count > 1 || count < savequan) {
        for (qq = 1; qq <= count; qq++) {
            obj.quan = qq;
            obj.owt = weight(obj) | 0;
            let ow = obj.owt | 0;
            if (adjust_wt) ow -= delta_cwt(container, obj);
            if (iw + ow >= 0) break;
            wt = iw + ow;
        }
        --qq;
    }
    obj.quan = savequan;
    obj.owt = saveowt;

    let objName = '', where = '', verb = '';
    if (qq < count) {
        objName = (await doname(obj));
        if (container) {
            where = `in ${the(xname(container))}`;
            verb = 'carry';
        } else {
            where = 'lying here';
            verb = telekinesis ? 'acquire' : 'lift';
        }
    }
    if (qq > 0) {
        if (qq < count)
            await pline(`You can only ${verb} ${qq === 1 ? 'one' : 'some'} of the ${objName} ${where}.`);
        return { count: qq, wt_before, wt_after: wt };
    }
    if (!container) where = 'here';
    const anyInventory = !!game.invent || umoney > 0;
    const prefix1 = anyInventory ? 'you cannot ' : ((obj.quan | 0) === 1 ? 'it ' : 'even one ');
    const prefix2 = anyInventory ? '' : 'is too heavy for you to ';
    const suffix = anyInventory ? ' any more' : '';
    await pline(`There ${otense(obj, 'are')} ${objName} ${where}, but ${prefix1}${prefix2}${verb}${suffix}.`);
    return { count: 0, wt_before, wt_after: wt_after };
}

/* C query.c ynq: use the shared tty prompt, including invalid-key retries
 * and TOPLINE_SPECIAL_PROMPT status painting. */
async function _lift_ynq(query) {
    return await yn_function(query, 'ynq', 'q');
}

export async function lift_object(obj, container, cnt, telekinesis) {
    const g = game;
    await _cmdModule();
    if ((obj.otyp | 0) === _BOULDER_OTYP && In_sokoban(g.u?.uz)) {
        await pline(`You cannot get your ${_cmd_mod.body_part(HAND)} around this ${xname(obj)}.`);
        return -1;
    }
    const throwsRocks = (((g.youmonst?.data?.mflags2 | 0) & 0x08000000) !== 0);
    if ((obj.otyp | 0) === _LOADSTONE_OTYP
        || ((obj.otyp | 0) === _BOULDER_OTYP && throwsRocks)) {
        if (inv_cnt_local(false) < _invlet_basic
            || !_cmd_mod.carrying(obj.otyp | 0)
            || merge_choice_local(g.invent, obj))
            return 1;
        await pline(`You are carrying too much stuff to pick up ${(obj.quan | 0) === 1 ? 'another' : 'more'} ${xname(obj)}.`);
        return -1;
    }

    const cc = await carry_count(obj, container, cnt.v, telekinesis);
    cnt.v = cc.count;

    let result;
    if (cnt.v < 1) {
        result = -1;
    } else if ((obj.oclass | 0) !== _COIN_CLASS
               && inv_cnt_local(false) >= _invlet_basic
               && !merge_choice_local(g.invent, obj)) {
        let goldLater = false;
        for (let it = ((obj.where | 0) === OBJ_FLOOR ? obj.nexthere : obj.nobj);
             it; it = ((obj.where | 0) === OBJ_FLOOR ? it.nexthere : it.nobj)) {
            if ((it.otyp | 0) === 438 /* GOLD_PIECE */) { goldLater = true; break; }
        }
        await pline(`Your knapsack cannot accommodate any more items${goldLater ? ' (except gold)' : ''}.`);
        result = -1;
    } else {
        result = 1;
        let prev_encumbr = near_capacity();
        // options.c initializes pickup_burden to MOD_ENCUMBER. The port's
        // sparse flags object may omit it; an explicit UNENCUMBERED (0)
        // must still retain its stricter prompting threshold.
        const burden = (g.flags?.pickup_burden ?? MOD_ENCUMBER) | 0;
        if (prev_encumbr < burden)
            prev_encumbr = burden;
        const next_encumbr = calc_capacity(cc.wt_after - cc.wt_before);
        if (next_encumbr > prev_encumbr) {
            if (telekinesis) {
                result = 0; /* don't lift */
            } else {
                /* C ref: pickup.c:1766-1780.  prefix cascade matches
                 * exactly (highest severity first, unconditional
                 * slightloadpfx default — no separate SLT_ENCUMBER check,
                 * same as C's own ternary chain here, unlike
                 * pickup_prinv's post-hoc report below which does check
                 * it). */
                const prefix = (next_encumbr >= EXT_ENCUMBER)
                        ? 'You have extreme difficulty'
                    : (next_encumbr >= HVY_ENCUMBER)
                        ? 'You have much trouble'
                    : (next_encumbr >= MOD_ENCUMBER)
                        ? 'You have trouble'
                    : 'You have a little trouble';
                const savequan = obj.quan;
                obj.quan = cnt.v;
                const qbuf = `${prefix} ${container ? 'removing' : 'lifting'} ${(await doname(obj))}.  Continue?`;
                obj.quan = savequan;
                const ans = await _lift_ynq(qbuf);
                if (ans === 'q') result = -1;
                else if (ans === 'n') result = 0;
                /* else 'y' (ynq's default fallthrough) => result stays 1 */
            }
        }
    }

    if ((obj.otyp | 0) === _SCR_SCARE_MONSTER_OTYP && result <= 0 && !container)
        obj.spe = 0;
    return result;
}

/* inv_cnt/merge_choice live in js/cmd.js (which itself imports FROM this
 * file — doloot, container_at, etc.), so these are resolved lazily to avoid
 * a load-order cycle, matching this file's existing use_container()
 * convention just above. */
let _cmd_mod = null;
async function _cmdModule() {
    if (!_cmd_mod)
        _cmd_mod = await import('./cmd.js');
    return _cmd_mod;
}
/* Synchronous wrappers: inv_cnt_local/merge_choice_local read cmd.js's
 * inv_cnt/merge_choice from inside lift_object (now async, for the
 * over-encumbrance ynq()) and pick_obj/pickup_prinv, all called from
 * pickup_object(), which is already async (pickup() awaits it), but the
 * cmd.js module needs to be resolved before these run.  pickup_object()
 * awaits `_cmdModule()` once up front so these reads are synchronous after
 * that point. */
function inv_cnt_local(inclGold) {
    if (!_cmd_mod)
        throw new Error('internal: _cmdModule() not awaited before'
            + ' inv_cnt_local()');
    return _cmd_mod.inv_cnt(inclGold);
}
function merge_choice_local(objlist, obj) {
    if (!_cmd_mod)
        throw new Error('internal: _cmdModule() not awaited before'
            + ' merge_choice_local()');
    return _cmd_mod.merge_choice(objlist, obj);
}

async function pick_obj(otmp) {
    const g = game;
    const u = g.u || {};
    const fromfloor = (otmp.where | 0) === OBJ_FLOOR;
    const ox = otmp.ox | 0, oy = otmp.oy | 0;

    let robshop = !u.uswallow && otmp !== u.uball && costly_spot(ox, oy);

    if (fromfloor) {
        remove_object(otmp); /* real: js/mklev.js's C-faithful body */
        newsym(ox, oy);
    } else if ((otmp.where | 0) === OBJ_MINVENT) {
        const mon = otmp.ocarry;
        if (mon) {
            let prev = null;
            for (let o = mon.minvent; o; prev = o, o = o.nobj) {
                if (o === otmp) {
                    if (prev) prev.nobj = o.nobj;
                    else mon.minvent = o.nobj;
                    break;
                }
            }
        }
        otmp.where = OBJ_FREE;
        otmp.nobj = null;
        otmp.ocarry = null;
    } else {
        throw new Error(`not yet ported: pick_obj from where=${otmp.where}`
            + ' — pickup.c:1897-1938 only handles OBJ_FLOOR/OBJ_MINVENT');
    }

    if (robshop) {
        /* C pickup.c:1921-1932 */
        const saveushops = u.ushops;
        const rooms = in_rooms(ox, oy, SHOPBASE);
        const fakeshopRoom = rooms.length ? (rooms[0] | 0) : 0;
        const fakeshop = String.fromCharCode(fakeshopRoom);
        u.ushops = fakeshop;
        await addtobill(otmp, true, false, false);
        u.ushops = saveushops;
        robshop = !!otmp.unpaid
            && !(saveushops && saveushops.indexOf(fakeshop) !== -1);
    }

    const picked = await addinv_core0(otmp, null, true); /* real: == C's addinv(otmp) */

    if (robshop) {
        await remote_burglary(ox, oy);
    }

    return picked;
}

/* C ref: pickup.c:1948-1970 pickup_prinv(obj, count, verb).  FULLY ported:
 * the encumbrance-prefix strings (pickup.c:67-70 overloadpfx/nearloadpfx/
 * moderateloadpfx/slightloadpfx) are plain string literals with no C table
 * behind them, so they are inlined here rather than generated.  Threshold
 * order matches pickup.c:1961-1964 exactly (highest severity checked
 * first); `verb` (unused before) is now consumed the same way C's
 * `Sprintf(pbuf, "%s %s", prefix, verb)` does. */
export async function pickup_prinv(obj, count, verb) {
    const g = game;
    const nearload = near_capacity();
    let prefix = null;
    if (nearload !== (g.pickup_encumbrance | 0)) {
        prefix = (nearload >= EXT_ENCUMBER) ? 'You have extreme difficulty'
            : (nearload >= HVY_ENCUMBER) ? 'You have much trouble'
            : (nearload >= MOD_ENCUMBER) ? 'You have trouble'
            : (nearload >= SLT_ENCUMBER) ? 'You have a little trouble'
            : null;
        g.pickup_encumbrance = nearload;
    }
    const pbuf = prefix ? `${prefix} ${verb}` : '';
    const { prinv } = await _cmdModule();
    await prinv(pbuf, obj, count);
}

/* C ref: pickup.c:1803-1882 pickup_object(obj, count, telekinesis). */
export async function pickup_object(obj, count, telekinesis) {
    const g = game;
    if ((obj.quan | 0) < count) {
        /* C: impossible(...); return 0; — a real invariant violation, not a
         * defensive check worth silently swallowing. */
        throw new Error(`pickup_object: count ${count} > quan ${obj.quan}?`
            + ' (impossible) — pickup.c:1811');
    }

    await _cmdModule(); /* resolve once; inv_cnt_local/merge_choice_local/
                            observe_object/prinv all need it below */
    /* C: `if (!Blind) observe_object(obj);` — pickup.c:1817-1818. */
    if (!Blind())
        _cmd_mod.observe_object(obj);

    if (obj === g.u?.uchain)
        return 0;
    if ((obj.where | 0) === OBJ_MINVENT && (obj.owornmask | 0) !== 0) {
        /* C pickup.c:1820-1822 — gear worn by the monster engulfing the
         * hero cannot be removed.  This refusal consumes no turn or RNG. */
        if (g.u?.uswallow) {
            await pline(`You can't pick ${(await doname(obj))} up.`);
            return 0;
        }
    }
    if (obj.oartifact && !await touch_artifact_youmonst(obj))
        return 0;
    if ((obj.otyp | 0) === _CORPSE_OTYP) {
        /* C pickup.c:1824-1829.  Remote acquisition is safe from the
         * bare-handed petrification check; direct pickup of a cockatrice or
         * chickatrice corpse is fatal unless gloves/resistance apply. */
        if (await fatal_corpse_mistake(obj, telekinesis)) {
            return -1;
        }
        /* Rider revival remains isolated in mklev.js; ordinary corpses pass
         * through to the normal carry path once the fatal-touch guard clears. */
    }
    if ((obj.otyp | 0) === _SCR_SCARE_MONSTER_OTYP) {
        /* C pickup.c:1830-1856.  Capacity is computed before changing the
         * scroll's blessed/spe state; an unliftable stack remains untouched. */
        const fitted = await carry_count(obj, null, count || (obj.quan | 0), telekinesis);
        count = fitted.count | 0;
        if (count < 1)
            return -1;
        if (count > 0 && count < (obj.quan | 0))
            obj = (await splitobj(obj, count));
        if (obj.blessed) {
            obj.blessed = false;
        } else if (!obj.spe && !obj.cursed) {
            obj.spe = 1;
        } else {
            const { trycall, useupf } = await _cmdModule();
            await pline(`The scroll${(obj.quan | 0) === 1 ? '' : 's'} turn${(obj.quan | 0) === 1 ? 's' : ''} to dust as you ${telekinesis ? 'raise' : 'pick'} ${obj.quan === 1 ? 'it' : 'them'} up.`);
            await trycall(obj);
            await useupf(obj, obj.quan | 0);
            return 1;
        }
    }
    const cnt = { v: count };
    const res = await lift_object(obj, null, cnt, telekinesis);
    if (res <= 0)
        return res;

    if ((obj.quan | 0) !== cnt.v && (obj.otyp | 0) !== _LOADSTONE_OTYP)
        obj = (await splitobj(obj, cnt.v));

    const picked = await pick_obj(obj);
    if (g.u?.uwep && g.u.uwep === picked)
        g.mrg_to_wielded = true;
    await pickup_prinv(picked, cnt.v, 'lifting');
    /* C bones.c:786 fix_ghostly_obj — clear the marker after pickup.  The
     * asymmetrical-weapon adjustment message is cosmetic; state cleanup is
     * the invariant needed by subsequent inventory operations. */
    if (picked.ghostly) picked.ghostly = 0;
    g.mrg_to_wielded = false;
    return 1;
}

/* C ref: pickup.c:517 allow_all() — query_objlist callback. */
function allow_all(obj) { void obj; return true; }

const _PM_CLERIC_ROLEIDX = 6;
function _is_cleric() {
    return ((game.flags?.initrole ?? -1) | 0) === _PM_CLERIC_ROLEIDX;
}

/* C ref: pickup.c:523-590 allow_category() — query_objlist callback driven by
 * add_valid_menu_class()'s filters.  (ParanoidAutoAll is not modelled.) */
function allow_category(obj) {
    const g = game;
    if (!g.gc?.class_filter && !g.gs?.shop_filter && !g.gb?.bucx_filter
        && !g.gp?.picked_filter)
        return false;
    const vmc = g.gv?.valid_menu_classes || '';
    const oc = obj.oclass | 0;
    if (oc === _COIN_CLASS && g.gc?.class_filter)
        return vmc.includes(String.fromCharCode(_COIN_CLASS));
    if (_is_cleric() && !obj.bknown)
        obj.bknown = 1;
    if (g.gc?.class_filter && !vmc.includes(String.fromCharCode(oc)))
        return false;
    if (g.gs?.shop_filter && !obj.unpaid
        && !(obj.cobj && count_unpaid(obj.cobj) > 0))
        return false;
    if (g.gb?.bucx_filter) {
        let bucx;
        if (oc === _COIN_CLASS) {
            bucx = g.flags?.goldX ? 'X' : 'U';
        } else {
            bucx = !obj.bknown ? 'X' : obj.blessed ? 'B' : obj.cursed ? 'C' : 'U';
        }
        if (!vmc.includes(bucx))
            return false;
    }
    if (g.gp?.picked_filter && !obj.pickup_prev)
        return false;
    return true;
}

/* C ref: invent.c:3580 tally_BUCX() */
function tally_BUCX(list, by_nexthere) {
    const t = { b: 0, u: 0, c: 0, x: 0, o: 0, j: 0 };
    const goldX = !!game.flags?.goldX;
    for (; list; list = by_nexthere ? list.nexthere : list.nobj) {
        if (_is_cleric())
            list.bknown = ((list.oclass | 0) !== _COIN_CLASS) ? 1 : 0;
        if (list.pickup_prev) t.j++;
        if ((list.oclass | 0) === _COIN_CLASS) {
            if (goldX) t.x++; else t.u++;
            continue;
        }
        if (!list.bknown) t.x++;
        else if (list.blessed) t.b++;
        else if (list.cursed) t.c++;
        else t.u++;
    }
    return t;
}

/* C ref: pickup.c:97-117 collect_obj_classes() */
function collect_obj_classes(otmp, here) {
    let ilets = '', itemcount = 0;
    while (otmp) {
        const c = def_oc_syms_chars[otmp.oclass | 0];
        if (!ilets.includes(c)) ilets += c;
        itemcount++;
        otmp = here ? otmp.nexthere : otmp.nobj;
    }
    return { ilets, itemcount };
}

/* C ref: pickup.c:74-95 simple_look() — a lone object is a pline; the
 * multi-object text window is not modelled. */
async function simple_look(otmp, here) {
    if (!(here ? otmp.nexthere : otmp.nobj))
        await pline('%s', await doname(otmp));
}

/* C ref: win/tty/topl.c tty_yn_function's '#' arm (see js/cmd.js
 * yn_count_tail): returns the count (>0), 0 for "no", -1 for abort. */
async function _yn_count_tail(qbuf) {
    const g = game;
    let text = qbuf + ' #';
    let value = 0, n_len = 1;
    for (;;) {
        g._pending_message = text;
        await flush_screen(1);
        if (g.nhDisplay) topl_park_cursor(g.nhDisplay, text);
        const raw = await nhgetch();
        const key = typeof raw === 'number' ? raw : (raw?.charCodeAt(0) ?? 0);
        if (key >= 48 && key <= 57) {
            value = value * 10 + (key - 48);
            text += String.fromCharCode(key); n_len++;
        } else if (key === 121 || key === 32 || key === 13 || key === 10) {
            break;
        } else if (key === 27) {
            value = -1;
            break;
        } else if (key === 8 || key === 127) {
            if (n_len <= 1) { value = -1; break; }
            value = Math.trunc(value / 10);
            text = text.slice(0, -1); n_len--;
        } else {
            value = -1;
            break;
        }
    }
    return value;
}

/* C ref: pickup.c:141-262 query_classes().  Returns
 * { ok, oclasses, one_at_a_time, everything, via_menu }. */
async function query_classes(action, objs, here, menu_on_demand) {
    const r = { ok: true, oclasses: [], one_at_a_time: false,
                everything: false, via_menu: 0 };
    let { ilets, itemcount } = collect_obj_classes(objs, here);
    if (ilets.length === 0) { r.ok = false; return r; }
    if (ilets.length === 1) {
        r.oclasses = [def_char_to_objclass(ilets.charCodeAt(0))];
    } else {
        ilets += ' aA' + (objs === game.invent ? 'i' : ':');
    }
    if (itemcount && menu_on_demand) ilets += 'm';
    if (count_unpaid(objs)) ilets += 'u';
    const t = tally_BUCX(objs, here);
    if (t.b) ilets += 'B';
    if (t.u) ilets += 'U';
    if (t.c) ilets += 'C';
    if (t.x) ilets += 'X';
    if (t.j) ilets += 'P';

    if (ilets.length > 1) {
        let where = null;
        for (;;) { /* ask_again */
            r.oclasses = [];
            r.one_at_a_time = r.everything = false;
            let not_everything = false, filtered = false, m_seen = false;
            let again = false;
            const inbuf = await getlin(`What kinds of thing do you want to ${action}? [${ilets}]`);
            if (inbuf && inbuf.charCodeAt(0) === 27) { r.ok = false; return r; }
            for (const sym of (inbuf || '')) {
                if (sym === ' ') continue;
                else if (sym === 'A') r.one_at_a_time = true;
                else if (sym === 'a') r.everything = true;
                else if (sym === ':') {
                    await simple_look(objs, here);
                    if (objs.where === OBJ_CONTAINED && objs.ocontainer)
                        objs.ocontainer.cknown = 1;
                    again = true;
                    break;
                } else if (sym === 'i') {
                    const { display_inventory } = await _cmdModule();
                    await display_inventory(null, true);
                    again = true;
                    break;
                } else if (sym === 'm') m_seen = true;
                else if ('uBUCXP'.includes(sym)) {
                    add_valid_menu_class(sym.charCodeAt(0));
                    filtered = true;
                } else {
                    const oc_of_sym = def_char_to_objclass(sym.charCodeAt(0));
                    if (ilets.includes(sym)) {
                        add_valid_menu_class(oc_of_sym);
                        r.oclasses.push(oc_of_sym);
                    } else {
                        if (where === null)
                            where = action === 'pick up' ? 'here'
                                  : action === 'take out' ? 'inside' : '';
                        if (where)
                            await pline('There are no %s\'s %s.', sym, where);
                        else
                            await pline('You have no %s\'s.', sym);
                        not_everything = true;
                    }
                }
            }
            if (again) continue;
            if (m_seen && menu_on_demand) {
                r.via_menu = ((r.everything || !r.oclasses.length) && !filtered)
                             ? -2 : -3;
                r.ok = false;
                return r;
            }
            if (!r.oclasses.length && (!r.everything || not_everything)) {
                r.one_at_a_time = true;
                r.everything = false;
            }
            break;
        }
    }
    return r;
}

/* C ref: pickup.c:787-902 — pickup()'s "old style interface" (menustyle
 * traditional/combination).  Returns { pickupdone } for C's `goto
 * pickupdone`, { pick_list } for `goto menu_pickup`, else the tallies. */
async function _pickup_old_style(objchain, traverse_how, count) {
    const g = game;
    let oclasses = [];
    let all_of_a_type = true, selective = false;
    let n_tried = 0, n_picked = 0;
    let ct = 0;
    for (let obj = objchain; obj; obj = _follow(obj, traverse_how)) ct++;

    if (ct === 1 && count) {
        const obj = objchain;
        const lcount = Math.min(obj.quan | 0, count);
        n_tried++;
        reset_justpicked(g.invent);
        if ((await pickup_object(obj, lcount, false)) > 0)
            n_picked++;
        return { n_tried, n_picked };
    } else if (ct >= 2) {
        await pline('There are %s objects here.', (ct <= 10) ? 'several' : 'many');
        const q = await query_classes('pick up', objchain,
                                      !!(traverse_how & BY_NEXTHERE), true);
        selective = q.one_at_a_time;
        all_of_a_type = q.everything;
        oclasses = q.oclasses;
        if (!q.ok) {
            if (!q.via_menu)
                return { pickupdone: true, n_tried: 0, n_picked: 0 };
            if (selective)
                traverse_how |= INVORDER_SORT;
            const pick_list = await query_objlist('Pick up what?', objchain,
                traverse_how, PICK_ANY,
                (q.via_menu === -2) ? allow_all : allow_category);
            return { pick_list };
        }
    }
    const bycat = menu_class_present(66) || menu_class_present(85)
                  || menu_class_present(67) || menu_class_present(88);
    let obj2;
    for (let obj = objchain; obj; obj = obj2) {
        obj2 = _follow(obj, traverse_how);
        if (bycat ? !allow_category(obj)
                  : (!selective && oclasses.length
                     && !oclasses.includes(obj.oclass | 0)))
            continue;
        let lcount = -1;
        if (!all_of_a_type) {
            const base = await safe_qbuf_shk('', 'Pick up ', '?', obj, doname,
                                             ansimpleoname, 'something');
            const rs = ((obj.quan | 0) < 2) ? 'ynaq' : 'yn#aq';
            /* C hack.h ynaq()/ynNaq(): default 'y' (pickup.c:854) */
            let sym = await yn_function(base, rs, 'y', false);
            let yn_number = 0;
            if (sym === '#') {
                yn_number = await _yn_count_tail(`${base} [${rs}] (y)`);
                if (yn_number < 0) { sym = 'n'; yn_number = 0; }
            }
            if (sym === 'q' || sym === '\x1b') return { n_tried, n_picked };
            if (sym === 'n') continue;
            if (sym === 'a') {
                all_of_a_type = true;
                if (selective) {
                    selective = false;
                    oclasses = [obj.oclass | 0];
                }
            } else if (sym === '#') {
                if (!yn_number) continue;
                lcount = Math.min(yn_number, obj.quan | 0);
            }
        }
        if (lcount === -1) lcount = obj.quan | 0;
        if (!n_tried)
            reset_justpicked(g.invent);
        n_tried++;
        const res = await pickup_object(obj, lcount, false);
        if (res < 0) break;
        n_picked += res;
    }
    return { n_tried, n_picked };
}

/* ---------------------------------------------------------------------------
 * C ref: pickup.c:671-786 pickup(int what).
 * "Have the hero pick things from the ground or a monster's inventory if
 * swallowed."  what: >0 autopickup, =0 interactive, <0 pick N of something.
 * Returns 1 if tried to pick something up (whether or not it succeeded).
 * ------------------------------------------------------------------------ */
export async function pickup(what) {
    const g = game;
    const u = g.u;
    const autopickup = what > 0;

    if (autopickup && (g.multi | 0) < 0 && unconscious()) {
        g.iflags = g.iflags || {};
        g.iflags.prev_decor = STONE;
        return 0;
    }

    g.pickup_encumbrance = 0;

    const count = (what < 0) ? -what : 0;

    if (!u.uswallow) {
        const ux = u.ux | 0, uy = u.uy | 0;

        if (autopickup && (g.context?.nopick || !_OBJ_AT(ux, uy)
                           || (is_pool(ux, uy) && !_Underwater())
                           || _is_lava(ux, uy))) {
            if (g.flags?.mention_decor)
                await describe_decor();
            await read_engr_at(ux, uy);
            return 0;
        }

        const t = t_at(ux, uy);
        if (!can_reach_floor(!!(t && is_pit(t.ttyp | 0)))) {
            await describe_decor(); /* pickup.c:713 calls this
                                        unconditionally on this branch */
            if (((g.multi | 0) && !g.context?.run)
                || (autopickup && !g.flags?.pickup)
                || (t && (uteetering_at_seen_pit(t) || uescaped_shaft(t)))) {
                await read_engr_at(ux, uy);
            }
            return 0;
        }

        if (((g.multi | 0) && !g.context?.run)
            || (autopickup && !g.flags?.pickup)
            || notake(g.youmonst?.data)) {
            await check_here(false);
            if (notake(g.youmonst?.data) && _OBJ_AT(ux, uy)
                && (autopickup || g.flags?.pickup)) {
                await pline('You are physically incapable of picking'
                    + ' anything up.');
            }
            return 0;
        }

        if (_OBJ_AT(ux, uy) && g.context?.run && (g.context.run | 0) !== 8
            && !g.context?.nopick) {
            nomul(0);
        }
    }

    add_valid_menu_class(0);

    let objchain, traverse_how;
    if (!u.uswallow) {
        objchain = g.level?.levelObjects?.[u.ux | 0]?.[u.uy | 0] ?? null;
        traverse_how = BY_NEXTHERE;
    } else {
        objchain = u.ustuck?.minvent ?? null;
        traverse_how = 0;
    }

    let pick_list = [];
    let old_style = false, old_tried = 0, old_picked = 0;
    if (autopickup) {
        pick_list = autopick(objchain, traverse_how);
    } else if ((g.flags?.menu_style ?? MENU_FULL) === MENU_TRADITIONAL
               && !g.iflags?.menu_requested) {
        /* C pickup.c:787-902 — old style interface. */
        const r = await _pickup_old_style(objchain, traverse_how, count);
        if (r.pickupdone) {
            g.pickup_encumbrance = 0;
            add_valid_menu_class(0);
            return (r.n_tried > 0) ? 1 : 0;
        }
        if (r.pick_list) {
            pick_list = r.pick_list;
        } else {
            old_tried = r.n_tried;
            old_picked = r.n_picked;
            old_style = true;
        }
    } else {
        traverse_how |= AUTOSELECT_SINGLE
                        | (g.flags?.sortpack ? INVORDER_SORT : 0);
        if (count) {
            pick_list = await query_objlist(`Pick ${count} of what?`, objchain,
                traverse_how, PICK_ONE, (o) => n_or_more(o, count));
            for (const p of pick_list) p.count = count;
        } else {
            pick_list = await query_objlist('Pick up what?', objchain,
                traverse_how | FEEL_COCKATRICE, PICK_ANY, all_but_uchain);
        }
    }

    let n_tried = pick_list.length;
    let n_picked = 0;
    if (old_style) {
        n_tried = old_tried;
        n_picked = old_picked;
    } else {
        if (n_tried > 0)
            reset_justpicked(g.invent);
        for (let i = 0; i < n_tried; i++) {
            const res = await pickup_object(pick_list[i].obj, pick_list[i].count,
                                            false);
            if (res < 0) break;
            n_picked += res;
        }
    }

    if (!u.uswallow) {
        if (_hides_under(g.youmonst?.data)) {
            const { hideunder } = await import('./mklev.js');
            hideunder(g.youmonst);
        }
        if (n_picked)
            newsym_force(u.ux | 0, u.uy | 0);
        if (autopickup)
            await check_here(n_picked > 0);
    }

    g.pickup_encumbrance = 0;
    add_valid_menu_class(0);
    return (n_tried > 0) ? 1 : 0;
}

/* C ref: trap.c:6756-6767 boolean unconscious(void).
 *     if (gm.multi >= 0) return FALSE;
 *     return (u.usleep
 *             || (gn.nomovemsg && (!strncmp(gn.nomovemsg, "You awake", 9)
 *                 || !strncmp(gn.nomovemsg, "You regain con", 14)
 *                 || !strncmp(gn.nomovemsg, "You are consci", 14))));
 * gm.multi is game.multi and gn.nomovemsg is game.nomovemsg in this port
 * (js/allmain.js nomul()/unmul()).  C draws no RNG here.
 *
 * This is the body js/uhitm.js:46 imports and js/uhitm.js:2988 CALLS (the
 * AD_TELE hit's verbose "Your position suddenly seems %suncertain!"); until
 * now it was `throw new Error('not yet ported: unconscious')` on that live
 * path.  js/teleport.js:388 and js/eat.js:265 carry module-private copies of
 * this same C function with the same logic; they are outside this file's
 * ownership and are reported, not touched. */
export function unconscious() {
    const g = game;
    if ((g.multi | 0) >= 0)
        return false;
    if (g.u && g.u.usleep)
        return true;
    const nmm = g.nomovemsg;
    return !!(nmm && (nmm.startsWith('You awake')
                      || nmm.startsWith('You regain con')
                      || nmm.startsWith('You are consci')));
}

export function uteetering_at_seen_pit(trap) {
    const u = game.u;
    return !!(trap && is_pit(trap.ttyp | 0) && trap.tseen
              && u_at(trap.tx, trap.ty)
              && !(u.utrap && (u.utraptype | 0) === TT_PIT));
}

/* C ref: trap.c:6640-6646 boolean uescaped_shaft(struct trap *trap).
 *     return (trap && is_hole(trap->ttyp) && trap->tseen
 *             && u_at(trap->tx, trap->ty));
 * "TRUE if you didn't fall through a hole or didn't release a trap door."
 * No RNG.  Same live call site as uteetering_at_seen_pit (js/cmd.js:3129). */
export function uescaped_shaft(trap) {
    return !!(trap && is_hole(trap.ttyp | 0) && trap.tseen
              && u_at(trap.tx, trap.ty));
}
