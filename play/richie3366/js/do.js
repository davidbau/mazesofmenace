// do.js — miscellaneous hero actions from do.c.
// C ref: do.c — donull, dodown, goto_level (ordinary stairs subset),
//         cmd_safety_prevention, dodrop/drop/dropx/dropy/dropz,
//         canletgo.

import { game } from './gstate.js';
import { rn2 } from './rng.js';
import { nhgetch } from './input.js';
import { depth } from './hacklib.js';
import {
    STAIRS, LADDER, ECMD_OK, ECMD_TIME, ECMD_FAIL, ECMD_CANCEL,
    W_ARMOR, W_ACCESSORY, W_SADDLE, LOST_DROPPED,
} from './const.js';
import { pline, docrt, flush_screen, flush_topl_more, newsym } from './display.js';
import { vision_recalc, vision_reset } from './vision.js';
import {
    stairway_at,
    stairway_find_from,
    u_on_upstairs,
    u_on_newpos,
    mklev,
} from './mklev.js';
import { keepdogs, losedogs } from './dog.js';
import { initrack } from './track.js';
import { m_at, mnexto } from './mon.js';
import { enexto } from './teleport.js';
import { monster_nearby } from './hack.js';
import { place_object, stackobj } from './mkobj.js';
import { doname } from './objnam.js';
import { can_reach_floor } from './engrave.js';
import {
    welded, setuwep, setuswapwep, setuqwep,
} from './wield.js';
import { objectNames } from './objects.js';
import { more_experienced, newexplevel } from './exper.js';
import { PM_TOURIST } from './generated/monsters_data.js';

/**
 * C ref: do.c danger_uprops — Stoned/Slimed/Strangled/Sick.
 * Props not fully wired; return false until those states exist.
 */
function danger_uprops() {
    const u = game.u || {};
    return !!(u.Stoned || u.Slimed || u.Strangled || u.Sick);
}

/**
 * C ref: pline.c Norep — suppress identical consecutive messages.
 */
async function Norep(msg) {
    if (game._last_norep === msg) return;
    game._last_norep = msg;
    await pline(msg);
}

/**
 * C ref: do.c cmd_safety_prevention — block wait/search beside hostiles.
 * safe_wait default On; menu_requested (`m` prefix) and multi skip the gate.
 * Named omissions: full danger_uprops bodies; visctrl/cmd_from_func beyond 'm'.
 *
 * @param {string} ucverb
 * @param {string} cmddesc
 * @param {string} act
 * @param {string} flagKey — game._safety_flags[flagKey] counter
 * @returns {Promise<boolean>} True → cancel command (ECMD_OK / no time)
 */
export async function cmd_safety_prevention(ucverb, cmddesc, act, flagKey) {
    if (!game._safety_flags) game._safety_flags = {};
    const flags = game.flags || {};
    const iflags = game.iflags || {};
    // C: flags.safe_wait default On
    if (flags.safe_wait !== false
        && !iflags.menu_requested
        && !(game.multi | 0)) {
        let assist = '';
        // C: iflags.cmdassist || !(*flagcounter)++
        const cmdassist = flags.cmdassist !== false;
        if (cmdassist) {
            assist = `  Use 'm' prefix to force ${cmddesc}.`;
        } else {
            const prev = game._safety_flags[flagKey] | 0;
            game._safety_flags[flagKey] = prev + 1;
            if (!prev) assist = `  Use 'm' prefix to force ${cmddesc}.`;
        }

        if (monster_nearby()) {
            await Norep(`${act}${assist}`);
            return true;
        }
        if (danger_uprops()) {
            await Norep(`${ucverb} doesn't feel like a good idea right now.`);
            return true;
        }
    }
    game._safety_flags[flagKey] = 0;
    return false;
}

/**
 * C ref: do.c donull — '.' command: do nothing for one move.
 * Returns true if the command consumes time (ECMD_TIME).
 */
export async function donull() {
    if (await cmd_safety_prevention(
        'Waiting', 'a no-op (to rest)',
        'Are you waiting to get hit?',
        'did_nothing_flag',
    )) {
        return false; // ECMD_OK
    }
    return true; // ECMD_TIME
}

function ledger_no(lev) {
    const dnum = lev?.dnum | 0;
    const dlevel = lev?.dlevel | 0;
    const dun = game.dungeons?.[dnum];
    return ((dun?.ledger_start | 0) + dlevel) | 0;
}

function on_level(a, b) {
    return (a?.dnum | 0) === (b?.dnum | 0) && (a?.dlevel | 0) === (b?.dlevel | 0);
}

function assign_level(dest, src) {
    dest.dnum = src.dnum | 0;
    dest.dlevel = src.dlevel | 0;
}

function depth_of(lev) {
    const dun = game.dungeons?.[lev?.dnum | 0];
    if (!dun) return lev?.dlevel | 0;
    return ((dun.depth_start | 0) || 1) + (lev.dlevel | 0) - 1;
}

function stairway_free_all() {
    game.stairs = null;
}

/**
 * C ref: dungeon.c next_level — ordinary downstairs / hole follow-on.
 */
export async function next_level(at_stairs) {
    const u = game.u;
    const stway = stairway_at(u.ux, u.uy);
    if (at_stairs && stway) stway.u_traversed = true;

    const newlevel = { dnum: 0, dlevel: 1 };
    if (at_stairs && stway) {
        newlevel.dnum = stway.tolev.dnum | 0;
        newlevel.dlevel = stway.tolev.dlevel | 0;
    } else {
        newlevel.dnum = u.uz?.dnum | 0;
        newlevel.dlevel = (u.uz?.dlevel | 0) + 1;
    }
    await goto_level(newlevel, at_stairs, !at_stairs, false);
}

/**
 * C ref: do.c goto_level — first-visit ordinary down stairs path.
 *
 * Ported: keepdogs → assign uz → mklev (getbones+makelevel) →
 * stairway_find_from(uz0) / u_on_upstairs → descend pline → losedogs →
 * vision/docrt.
 * Deferred: savelev/getlev file restore, mysterious force, quest gate,
 * portals, endgame, fall damage, Lua NHCB_LVL_LEAVE, familiar_level_msg,
 * temperature/hellish messages, u_collide_m full limbo, climb pline.
 */
export async function goto_level(newlevel, at_stairs, falling, portal) {
    const u = game.u;
    if (!u?.uz) return;

    const up = depth_of(newlevel) < depth_of(u.uz);
    const newdungeon = (u.uz.dnum | 0) !== (newlevel.dnum | 0);
    const new_ledger = ledger_no(newlevel);
    if (new_ledger <= 0) return; // C: done(ESCAPED)

    if (on_level(newlevel, u.uz)) return;

    // C: keepdogs(FALSE) before leaving the map
    keepdogs(false);
    vision_recalc(2);

    // In-memory stash of the level we're leaving (restore deferred).
    if (!game.level_info) game.level_info = [];
    const old_ledger = ledger_no(u.uz);
    if (old_ledger > 0) {
        game.level_info[old_ledger] = {
            flags: (game.level_info[old_ledger]?.flags | 0) | 1, // VISITED-ish
            level: game.level,
            fmon: game.fmon,
            fobj: game.fobj,
            ftrap: game.ftrap,
            stairs: game.stairs,
        };
    }

    // C: savelev → save_track → release_data → initrack (do.c/save.c/track.c).
    // Clears hero footstep ring so gettrack cannot see prior-level cells.
    // Named omission: per-level save/rest of utrack on return visits.
    initrack();

    assign_level(u.uz0 || (u.uz0 = { dnum: 0, dlevel: 0 }), u.uz);
    assign_level(u.uz, newlevel);
    if (!u.utolev) u.utolev = { dnum: 0, dlevel: 0 };
    assign_level(u.utolev, newlevel);
    u.utotype = 0;

    // C: dunlev_reached for non-builds_up
    const dun = game.dungeons?.[u.uz.dnum | 0];
    if (dun) {
        const dl = u.uz.dlevel | 0;
        if ((dun.dunlev_ureached | 0) < dl) dun.dunlev_ureached = dl;
    }

    stairway_free_all();
    // Detach live map pointers; mklev/clear rebuilds them.
    game.fmon = null;
    game.fobj = null;
    game._objects_at = new Map();
    game.ftrap = null;
    game.head_engr = null;
    game.level = null;

    const info = game.level_info[new_ledger];
    const exists = !!(info && (info.flags & 2)); // LFILE_EXISTS
    const madeNew = !exists;
    if (!exists) {
        await mklev();
        if (!game.level_info[new_ledger]) game.level_info[new_ledger] = { flags: 0 };
        game.level_info[new_ledger].flags |= 2; // created
    } else {
        // Returning to a saved level — restore deferred; regenerate for now.
        await mklev();
    }

    vision_reset();
    game.vision_full_recalc = 0;
    // C: flush_screen(-1) postpone map/botl until after arrival plines + docrt
    await flush_screen(-1);

    if (at_stairs && !portal) {
        const atLadder = !!game.at_ladder;
        if (up) {
            // C: stairway_find_from(&u.uz0, at_ladder) else sstairs/dnstairs
            const stway = stairway_find_from(u.uz0, atLadder);
            if (stway) {
                u_on_newpos(stway.sx, stway.sy);
                stway.u_traversed = true;
            } else if (newdungeon) {
                u_on_upstairs(); // u_on_sstairs(1) subset
            } else {
                // u_on_dnstairs — destination downstairs when climbing
                let dnst = null;
                for (let s = game.stairs; s; s = s.next) {
                    if (!s.up) { dnst = s; break; }
                }
                if (dnst) u_on_newpos(dnst.sx, dnst.sy);
                else u_on_upstairs();
            }
            // climb pline deferred beyond ordinary-down focus
        } else {
            // C ordinary descent: find_from(uz0) else sstairs/upstairs
            const stway = stairway_find_from(u.uz0, atLadder);
            if (stway) {
                u_on_newpos(stway.sx, stway.sy);
                stway.u_traversed = true;
            } else if (newdungeon) {
                u_on_upstairs(); // u_on_sstairs(0) subset
            } else {
                u_on_upstairs();
            }
            if (game.flags?.verbose !== false) {
                await pline(atLadder
                    ? 'You climb down the ladder.'
                    : 'You descend the stairs.');
            }
        }
    }

    game.at_ladder = false;
    u.dz = 0;

    losedogs();

    // C: u_collide_m if still co-located — rn2(2)+enexto path
    let mtmp = m_at(u.ux, u.uy);
    if (mtmp && mtmp !== u.usteed) {
        await u_collide_m(mtmp);
    }

    vision_reset();
    // C: docrt → cls flushes NEED_MORE (--More-- on stale Dlvl:N map) then redraws
    await docrt();
    await flush_screen(-1); // un-postpone + flush new map/botl
    vision_recalc(0);

    // C: goto_level `if (new)` Tourist more_experienced(level_difficulty())
    // level_difficulty ≈ depth(&u.uz) outside endgame/amulet/builds_up.
    if (madeNew && game.urole?.mnum === PM_TOURIST) {
        more_experienced(depth(u.uz) | 0, 0);
        await newexplevel();
    }
}

/**
 * C ref: do.c u_collide_m — move hero or monster when sharing a spot.
 */
async function u_collide_m(mtmp) {
    const u = game.u;
    if (!mtmp || mtmp === u.usteed || m_at(u.ux, u.uy) !== mtmp) return;

    const cc = { x: 0, y: 0 };
    if (!rn2(2) && enexto(cc, u.ux, u.uy, game.youmonst?.data || mtmp.data)
        && Math.max(Math.abs(cc.x - u.ux), Math.abs(cc.y - u.uy)) <= 1) {
        u.ux = cc.x;
        u.uy = cc.y;
    } else {
        mnexto(mtmp, 0);
    }
    mtmp = m_at(u.ux, u.uy);
    if (mtmp) mnexto(mtmp, 0);
}

/**
 * C ref: do.c canletgo — shared drop/throw worn/weld/loadstone gates.
 * Named omissions: loadstone corpsenm count kludge detail; full weldmsg
 * only when word non-empty (drop path uses canletgo before setuwep).
 */
export async function canletgo(obj, word) {
    if (!obj) return false;
    const mask = obj.owornmask || 0;
    if (mask & (W_ARMOR | W_ACCESSORY)) {
        if (word) {
            await Norep(`You cannot ${word} something you are wearing.`);
        }
        return false;
    }
    const u = game.u || {};
    if (obj === u.uwep && welded(u.uwep)) {
        if (word) {
            await Norep(`You cannot ${word} something welded to your hand.`);
        }
        return false;
    }
    // LOADSTONE cursed / LEASH / W_SADDLE — minimal gates
    const LOADSTONE = objectNames.indexOf('LOADSTONE');
    if (LOADSTONE >= 0 && (obj.otyp | 0) === LOADSTONE && obj.cursed) {
        if (word) {
            await pline(`For some reason, you cannot ${word} the stone!`);
        }
        obj.bknown = 1;
        return false;
    }
    if (mask & W_SADDLE) {
        if (word) {
            await pline(`You cannot ${word} something you are sitting on.`);
        }
        return false;
    }
    return true;
}

function freeinv_drop(obj) {
    const inv = game.invent || [];
    const idx = inv.indexOf(obj);
    if (idx >= 0) inv.splice(idx, 1);
    obj.owornmask = 0;
    obj.nobj = null;
    // where left for place_object to set OBJ_FLOOR
}

/**
 * C ref: do.c dropz — place at hero feet (engulf/flooreffects/shop/altar/
 * ball/encumber deferred).
 */
export function dropz(obj, _with_impact) {
    if (!obj) return;
    const u = game.u || {};
    if (obj === u.uwep) setuwep(null);
    if (obj === u.uquiver) setuqwep(null);
    if (obj === u.uswapwep) setuswapwep(null);

    if (u.uswallow) {
        // engulfer inventory deferred — leave free
        return;
    }
    // flooreffects deferred — always place
    place_object(obj, u.ux, u.uy);
    stackobj(obj);
    newsym(u.ux, u.uy);
}

/** C ref: do.c dropy */
export function dropy(obj) {
    dropz(obj, false);
}

/**
 * C ref: do.c dropx — freeinv then dropy (ship_object/altar deferred).
 */
export function dropx(obj) {
    if (!obj) return;
    freeinv_drop(obj);
    const u = game.u || {};
    if (!u.uswallow) {
        // ship_object / doaltarobj deferred
    }
    dropy(obj);
}

/**
 * C ref: do.c drop — canletgo, unwield, verbose pline, dropx.
 * Named omissions: corpse better_not_try; sink rings; levitation
 * hitfloor/Heart of Ahriman; swallowed digests path; shop sell state.
 */
async function drop(obj) {
    if (!obj) return ECMD_FAIL;
    if (!(await canletgo(obj, 'drop'))) return ECMD_FAIL;

    const u = game.u || {};
    if (obj === u.uwep) {
        // canletgo already rejected welded uwep
        setuwep(null);
    }
    if (obj === u.uquiver) setuqwep(null);
    if (obj === u.uswapwep) setuswapwep(null);

    if (u.uswallow) {
        if (game.flags?.verbose !== false) {
            await pline(`You drop ${doname(obj)} into something.`);
        }
    } else {
        if (!can_reach_floor(true)) {
            // hitfloor deferred — still freeinv+place via dropx after pline
            if (game.flags?.verbose !== false) {
                await pline(`You drop ${doname(obj)}.`);
            }
            obj.how_lost = LOST_DROPPED;
            dropx(obj);
            return ECMD_TIME;
        }
        // altar skip verbose deferred
        if (game.flags?.verbose !== false) {
            await pline(`You drop ${doname(obj)}.`);
        }
    }
    obj.how_lost = LOST_DROPPED;
    dropx(obj);
    return ECMD_TIME;
}

/** C invent getobj any_obj_ok — every invent letter is SUGGEST. */
function drop_suggest_lets() {
    const lets = [];
    for (const o of game.invent || []) {
        if (o?.invlet) lets.push(o.invlet);
    }
    lets.sort((a, b) => a.charCodeAt(0) - b.charCodeAt(0));
    return lets.join('');
}

/**
 * C ref: invent.c getobj("drop", any_obj_ok, GETOBJ_PROMPT|GETOBJ_ALLOWCNT)
 * Count-split and ?/* menus deferred.
 */
async function getobj_drop() {
    for (;;) {
        await flush_topl_more();
        const lets = drop_suggest_lets();
        const query = lets
            ? `What do you want to drop? [${lets} or ?*]`
            : 'What do you want to drop? [*]';
        const prompt = `${query} `;
        game._pending_message = prompt;
        await flush_screen(1);
        const disp = game.nhDisplay;
        if (disp?.setCursor) disp.setCursor(prompt.length, 0);

        const key = await nhgetch();
        const ch = String.fromCharCode(key);
        if (key === 27 || ch === ' ' || ch === '\n' || ch === '\r') {
            if (game.flags?.verbose !== false) await pline('Never mind.');
            return null;
        }
        if (ch === '?' || ch === '*') {
            if (game.flags?.verbose !== false) await pline('Never mind.');
            return null;
        }
        const otmp = (game.invent || []).find((o) => o.invlet === ch);
        if (!otmp) {
            await pline("You don't have that object.");
            continue;
        }
        game._pending_message = '';
        return otmp;
    }
}

/**
 * C ref: do.c dodrop — getobj then drop (shop sellobj_state /
 * reset_occupations deferred).
 *
 * Branch envelope: ordinary floor drop of invent item including uwep;
 * cancel / missing letter / worn armor reject. Deferred: #droptype,
 * count-split, shops, sinks, flooreffects, containers.
 */
export async function dodrop() {
    const obj = await getobj_drop();
    if (!obj) return ECMD_CANCEL;
    return drop(obj);
}

/**
 * C ref: do.c dodown — '#' / '>' go down staircase (ordinary stairs path).
 *
 * Omits: levitation end, poly ceiling-hider, autodig, Gehennom gate yn,
 * hole/trapdoor plunge, stronghold hell, rooted/stuck/steed.
 */
export async function dodown() {
    const u = game.u;
    if (!u) return ECMD_OK;

    u.dz = 1;
    u.dx = 0;
    u.dy = 0;

    const stway = stairway_at(u.ux, u.uy);
    let stairs_down = false;
    let ladder_down = false;
    if (stway && !stway.up) {
        stairs_down = !stway.isladder;
        ladder_down = !stairs_down;
    }

    // Also accept typ STAIRS/LADDER with down ladder flag when stairway
    // node missing (partial generate_stairs).
    if (!stairs_down && !ladder_down) {
        const loc = game.level?.at(u.ux, u.uy);
        if (loc && (loc.typ === STAIRS || loc.typ === LADDER)
            && loc.ladder === 2) {
            stairs_down = loc.typ === STAIRS;
            ladder_down = loc.typ === LADDER;
        }
    }

    if (!stairs_down && !ladder_down) {
        await pline("You can't go down here.");
        return ECMD_OK;
    }

    // C: next_to_u — leashed-only gate; always true without leash wiring
    game.at_ladder = !!(game.level?.at(u.ux, u.uy)?.typ === LADDER)
        || !!(stway && stway.isladder);

    await next_level(true);
    game.at_ladder = false;
    return ECMD_TIME;
}
