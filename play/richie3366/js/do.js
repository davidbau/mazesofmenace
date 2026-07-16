// do.js — miscellaneous hero actions from do.c.
// C ref: do.c — donull, dodown, doup, goto_level (ordinary stairs subset),
//         cmd_safety_prevention, dodrop/drop/dropx/dropy/dropz,
//         canletgo.

import { game } from './gstate.js';
import { rn2, rnd } from './rng.js';
import { depth } from './hacklib.js';
import {
    STAIRS, LADDER, ECMD_OK, ECMD_TIME, ECMD_FAIL, ECMD_CANCEL,
    W_ARMOR, W_ACCESSORY, W_SADDLE, LOST_DROPPED,
    UTOTYPE_NONE, UTOTYPE_ATSTAIRS, UTOTYPE_FALLING, UTOTYPE_PORTAL,
    UTOTYPE_RMPORTAL, UTOTYPE_DEFERRED,
    VISITED, LFILE_EXISTS,
    UNENCUMBERED, KILLED_BY, DISMOUNT_FELL,
} from './const.js';
import { COIN_CLASS } from './objects.js';
import { pline, Norep, docrt, flush_screen, flush_topl_more, newsym, mark_topline_prompt } from './display.js';
import { yn_function } from './getline.js';
import { vision_recalc, vision_reset } from './vision.js';
import { clear_light_sources, relight_monsters } from './light.js';
import {
    stairway_at,
    stairway_find_from,
    u_on_upstairs,
    u_on_newpos,
    u_on_rndspot,
    mklev,
    fumaroles,
    movebubbles,
} from './mklev.js';
import { In_tutorial } from './dungeon.js';
import { Is_waterlevel, Is_airlevel } from './const.js';
import { keepdogs, losedogs, mon_catchup_elapsed_time } from './dog.js';
import { save_track, rest_track } from './track.js';
import { m_at, mnexto, hide_monst } from './mon.js';
import { enexto } from './teleport.js';
import { monster_nearby, losehp, maybe_half_phys } from './hack.js';
import { place_object, stackobj } from './mkobj.js';
import { doname } from './objnam.js';
import { compactify_invlets, near_capacity } from './invent.js';
import { can_reach_floor } from './engrave.js';
import { pickup } from './pickup.js';
import {
    welded, setuwep, setuswapwep, setuqwep,
} from './wield.js';
import { objectNames } from './objects.js';
import { more_experienced, newexplevel } from './exper.js';
import { PM_TOURIST } from './generated/monsters_data.js';
import { dismount_steed } from './steed.js';
import { onquest } from './quest.js';
import { In_quest, In_endgame } from './const.js';
import { resurrect } from './wizard.js';
import { bones_include_name } from './bones.js';

function Blind() {
    const u = game.u || {};
    if (u.Blind) return true;
    return !!((u.HBlinded | 0) || (u.EBlinded | 0) || u.uroleplay?.blind);
}
function Hallucination() {
    const u = game.u || {};
    if (u.Hallucination) return true;
    return !!((u.HHallucination | 0) && !(u.Halluc_resistance | 0));
}

/**
 * C ref: do.c familiar_level_msg — rn2(4) deja-vu / hallu variants.
 */
async function familiar_level_msg() {
    const fam_msgs = [
        'You have a sense of deja vu.',
        "You feel like you've been here before.",
        'This place %s familiar...',
        null,
    ];
    const halu_fam_msgs = [
        'Whoa!  Everything %s different.',
        'You are surrounded by twisty little passages, all alike.',
        'Gee, this %s like uncle Conan\'s place...',
        null,
    ];
    const which = rn2(4);
    let mesg = Hallucination() ? halu_fam_msgs[which] : fam_msgs[which];
    if (mesg && mesg.includes('%')) {
        mesg = mesg.replace('%s', Blind() ? 'seems' : 'looks');
    }
    if (mesg) await pline(mesg);
}

/**
 * C ref: nhlua.c nhl_gamestate(false) via tutorial_enter / tutorial(TRUE).
 * Stash invent (preserve owornmask as restore flag) and clear worn slots
 * so find_ac → base 10. Named omissions: u/disco/mvitals/spl_book backup;
 * leave-tutorial restore path.
 */
function tutorial_enter_gamestate() {
    if (game.gmst_stored) return;
    game.gmst_moves = game.moves | 0;
    const stash = [];
    const inv = game.invent || [];
    const u = game.u || {};
    while (inv.length) {
        const otmp = inv[0];
        const wornmask = otmp.owornmask || 0;
        // C: setnotworn(otmp) — clear slots; does NOT call find_ac
        if (wornmask) {
            otmp.owornmask = 0;
            for (const slot of [
                'uarm', 'uarmc', 'uarmh', 'uarms', 'uarmg', 'uarmf', 'uarmu',
                'uleft', 'uright', 'uamul', 'ublindf',
            ]) {
                if (u[slot] === otmp) u[slot] = null;
            }
            if (u.uwep === otmp) u.uwep = null;
            if (u.uswapwep === otmp) u.uswapwep = null;
            if (u.uqwep === otmp) u.uqwep = null;
        }
        inv.shift();
        otmp.owornmask = wornmask;
        stash.push(otmp);
    }
    game.invent = [];
    game.gmst_invent = stash;
    // C: u.uac stays stale until allmain once-per-input find_ac()
    game.gmst_stored = true;
}

/**
 * C ref: do.c danger_uprops — Stoned/Slimed/Strangled/Sick.
 * Props not fully wired; return false until those states exist.
 */
function danger_uprops() {
    const u = game.u || {};
    return !!(u.Stoned || u.Slimed || u.Strangled || u.Sick);
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
 * C ref: dungeon.c prev_level — ordinary upstairs / rise-through-ceiling.
 */
export async function prev_level(at_stairs) {
    const u = game.u;
    const stway = stairway_at(u.ux, u.uy);
    if (at_stairs && stway) stway.u_traversed = true;

    const newlevel = { dnum: 0, dlevel: 1 };
    if (at_stairs && stway && (stway.tolev.dnum | 0) !== (u.uz?.dnum | 0)) {
        // Up dungeon branch — amulet/escape arms deferred
        newlevel.dnum = stway.tolev.dnum | 0;
        newlevel.dlevel = stway.tolev.dlevel | 0;
    } else {
        newlevel.dnum = u.uz?.dnum | 0;
        newlevel.dlevel = (u.uz?.dlevel | 0) - 1;
    }
    await goto_level(newlevel, at_stairs, false, false);
}

/** Rebuild floor object index after in-memory getlev restore. */
function rebuildObjectsAt(fobj) {
    game._objects_at = new Map();
    const stack = [];
    for (let o = fobj; o; o = o.nobj) stack.push(o);
    for (let i = stack.length - 1; i >= 0; i--) {
        const otmp = stack[i];
        otmp.nexthere = null;
        const key = `${otmp.ox},${otmp.oy}`;
        const cur = game._objects_at.get(key) || null;
        otmp.nexthere = cur;
        game._objects_at.set(key, otmp);
    }
}

/**
 * C ref: restore.c getlev — non-bones monster catchup + hide_monst rnd(10).
 * In-memory stash path (no NHFILE). Named omissions: ghostly peace remap,
 * restore_cham, worm/timer/region restore, steed/ustuck mid remap.
 */
function getlev_catchup_monsters(elapsed) {
    const u = game.u;
    const list = game.fmon || [];
    for (const mtmp of list) {
        // C: if (!u.uz.dlevel || restoring==REST_LEVELS) continue
        if (!(u?.uz?.dlevel | 0)) continue;
        if (elapsed > 0) mon_catchup_elapsed_time(mtmp, elapsed);
        // restore_cham deferred
        if (elapsed > 0 && elapsed > rnd(10)) hide_monst(mtmp);
    }
}

/**
 * C ref: trap.c selftouch — stair-fall call site only.
 * Full cockatrice-corpse / twoweapon petrify deferred (no RNG unbound).
 * @param {string} _arg
 */
async function selftouch_stair_fall(_arg) {
    /* no-op until touch_petrifies + instapetrify wired */
}

/**
 * C ref: do.c goto_level — ordinary stairs + in-memory savelev/getlev.
 *
 * Ported: keepdogs → stash (VISITED|LFILE_EXISTS + omoves + track) →
 * assign uz → mklev or restore stash + getlev catchup + rest_track →
 * stairway_find_from → climb/descend pline (Flying / encumber|Punished|
 * Fumbling fall `rnd(3)` losehp / ordinary) → losedogs → vision/docrt →
 * pickup(1).
 * Deferred: binary NHFILE, mysterious force, quest gate, portals, endgame
 * astral `final_level` / migrating-Wizard resurrect arm, trap-door fall
 * damage (`do_fall_dmg`), Lua NHCB_LVL_LEAVE, Gehennom valley plines,
 * temperature_change_msg / hellish_smoke (D-0559 hot/cold); Flying/Punished
 * climb variants, Punished `drag_down`/`ballrelease`, full `selftouch`
 * petrify, u_collide_m full limbo. Ported: In_quest `onquest`; In_endgame
 * `newdungeon`+amulet `resurrect` new-Wizard makemon + appear Norep;
 * `familiar_level_msg` via `bones_include_name` (D-0577).
 */
export async function goto_level(newlevel, at_stairs, falling, portal) {
    const u = game.u;
    if (!u?.uz) return;

    // C: prev_temperature before mklev mutates level.flags.temperature
    const prev_temperature = (game.level?.flags?.temperature | 0);

    let up = depth_of(newlevel) < depth_of(u.uz);
    const newdungeon = (u.uz.dnum | 0) !== (newlevel.dnum | 0);
    const new_ledger = ledger_no(newlevel);
    if (new_ledger <= 0) return; // C: done(ESCAPED)

    if (on_level(newlevel, u.uz)) return;

    // C: do.c — tutorial(TRUE/FALSE) via nhcore when crossing tutorial branch.
    if (newdungeon) {
        if (In_tutorial(newlevel)) {
            game.flags = game.flags || {};
            game.flags.in_tutorial_branch = true;
            tutorial_enter_gamestate();
        } else if (In_tutorial(u.uz)) {
            game.flags && (game.flags.in_tutorial_branch = false);
            up = false; // C: re-enter level 1 as if starting new game
        }
    }

    // C: if (!iflags.nofollowers) keepdogs(FALSE)
    if (!game.iflags?.nofollowers) keepdogs(false);
    vision_recalc(2);

    // C: do.c goto_level — discard level-local travel destination cache
    if (!game.iflags) game.iflags = {};
    if (!game.iflags.travelcc) game.iflags.travelcc = { x: 0, y: 0 };
    game.iflags.travelcc.x = 0;
    game.iflags.travelcc.y = 0;

    // C: savelev — in-memory stash + VISITED|LFILE_EXISTS + omoves timestamp
    // C: save_track before release/initrack (track.c) — per-level utrack.
    if (!game.level_info) game.level_info = [];
    const old_ledger = ledger_no(u.uz);
    const trackSnap = save_track(); // clears live ring (C release_data arm)
    if (old_ledger > 0) {
        const prev = game.level_info[old_ledger] || { flags: 0 };
        game.level_info[old_ledger] = {
            flags: (prev.flags | 0) | VISITED | LFILE_EXISTS,
            omoves: game.moves | 0,
            level: game.level,
            fmon: game.fmon,
            fobj: game.fobj,
            ftrap: game.ftrap,
            stairs: game.stairs,
            head_engr: game.head_engr,
            track: trackSnap,
        };
    }

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
    // Detach live map pointers; mklev/getlev restores them.
    game.fmon = null;
    game.fobj = null;
    game._objects_at = new Map();
    game.ftrap = null;
    game.head_engr = null;
    game.level = null;
    clear_light_sources();
    // C: memset updest/dndest before getlev/mklev; fixup_special re-fills.
    game.updest = { lx: 0, ly: 0, hx: 0, hy: 0, nlx: 0, nly: 0, nhx: 0, nhy: 0 };
    game.dndest = { lx: 0, ly: 0, hx: 0, hy: 0, nlx: 0, nly: 0, nhx: 0, nhy: 0 };

    const info = game.level_info[new_ledger];
    const exists = !!(info && ((info.flags | 0) & LFILE_EXISTS));
    const madeNew = !exists;
    let familiar = false;
    if (!exists) {
        await mklev();
        if (!game.level_info[new_ledger]) game.level_info[new_ledger] = { flags: 0 };
        // C: LFILE_EXISTS is set on savelev leave, not on first mklev.
        // Track ring: leave-path save_track already cleared; getbones
        // (inside mklev) rest_track's dead-hero utrack — do NOT initrack
        // here (C goto_level has no initrack after mklev; wiping would
        // drop bones gettrack for hostiles — D-0578).
        // C: familiar = bones_include_name(plname) after first-time mklev
        familiar = bones_include_name(game.plname || '');
    } else {
        // C: getlev — restore in-memory stash + catchup/hide_monst + rest_track
        game.level = info.level;
        game.fmon = info.fmon || [];
        game.fobj = info.fobj || null;
        game.ftrap = info.ftrap || null;
        game.stairs = info.stairs || null;
        game.head_engr = info.head_engr || null;
        rebuildObjectsAt(game.fobj);
        relight_monsters();
        rest_track(info.track);
        // C: Sokoban ≡ level.flags.sokoban_rules — sync JS alias after getlev
        // (clear_level_structures only runs on mklev, not stash restore).
        game.Sokoban = !!(game.level?.flags?.sokoban_rules
            || game.level?.flags?.sokoban);
        const elapsed = (game.moves | 0) - (info.omoves | 0);
        getlev_catchup_monsters(elapsed);
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
            // C: ordinary climb (Flying/Punished "great effort" deferred)
            if (game.flags?.verbose !== false) {
                await pline(atLadder
                    ? 'You climb up the ladder.'
                    : 'You climb up the stairs.');
            }
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
            // C: do.c goto_level descend — Flying / encumber|Punished|Fumbling
            // fall (rnd(3) losehp) / ordinary verbose climb-down.
            if (!(u.dz | 0)) {
                ; // stayed on same level? (no transit effects)
            } else if (u.Flying) {
                if (game.flags?.verbose !== false) {
                    await pline(atLadder
                        ? 'You fly down along the ladder.'
                        : 'You fly down the stairs.');
                }
            } else if (
                near_capacity() > UNENCUMBERED
                || u.Punished
                || u.Fumbling
            ) {
                await pline(atLadder
                    ? 'You fall down the ladder.'
                    : 'You fall down the stairs.');
                if (u.Punished) {
                    // C: drag_down(); if (!welded(uball)) ballrelease(FALSE);
                    // ball.c not ported — named omission (no RNG when unbound).
                }
                if (u.usteed) {
                    await dismount_steed(DISMOUNT_FELL);
                } else {
                    // C: losehp(Maybe_Half_Phys(rnd(3)), …, KILLED_BY)
                    losehp(
                        maybe_half_phys(rnd(3)),
                        atLadder
                            ? 'falling off a ladder'
                            : 'tumbling down a flight of stairs',
                        KILLED_BY,
                    );
                }
                // C: selftouch("Falling, you") — cockatrice corpse petrify
                // deferred (no-op unless uwep corpse + touch_petrifies wired).
                await selftouch_stair_fall('Falling, you');
            } else if (game.flags?.verbose !== false) {
                await pline(atLadder
                    ? 'You climb down the ladder.'
                    : 'You descend the stairs.');
            }
        }
    } else if (!at_stairs) {
        // C: trap door / level_tele / tutorial UTOTYPE_NONE → u_on_rndspot
        // Portal MAGIC_PORTAL find deferred (falls through when portal=true).
        if (!portal) u_on_rndspot(up ? 1 : 0);
    }

    game.at_ladder = false;
    u.dz = 0;

    losedogs();

    // C: u_collide_m if still co-located — rn2(2)+enexto path
    let mtmp = m_at(u.ux, u.uy);
    if (mtmp && mtmp !== u.usteed) {
        await u_collide_m(mtmp);
    }

    // C: do.c goto_level — movebubbles / fumaroles before vision_recalc
    if (Is_waterlevel(u.uz) || Is_airlevel(u.uz)) {
        movebubbles();
    } else if (game.level?.flags?.fumaroles) {
        fumaroles();
    }

    vision_reset();
    // C: docrt → cls flushes NEED_MORE (--More-- on stale Dlvl:N map) then redraws
    await docrt();
    await flush_screen(-1); // un-postpone + flush new map/botl
    vision_recalc(0);

    // C: do.c goto_level — maybe_lvltport_feedback before onquest.
    // Short pline sets NEED_MORE without awaiting; qt_pager flushes it.
    if (game.dfr_post_msg) {
        const msg = game.dfr_post_msg;
        game.dfr_post_msg = null;
        await pline(msg);
    }
    // C: deliver_splev_message() before endgame/quest arrival arms
    await deliver_splev_message();
    // C: Gehennom Valley plines deferred; familiar before endgame/quest
    if (familiar) await familiar_level_msg();
    // C: if (In_endgame) { … else if (newdungeon && amulet) resurrect(); }
    //     else if (In_quest) onquest();
    if (In_endgame(u.uz)) {
        // ACH_ENDG / astral final_level deferred
        if (newdungeon && (u.uhave?.amulet || u.uhave_amulet)) {
            await resurrect();
        }
    } else if (In_quest(u.uz)) {
        await onquest();
    }

    // C: temperature_change_msg(prev_temperature) after special arrival
    await temperature_change_msg(prev_temperature);

    // C: goto_level `if (new)` Tourist more_experienced(level_difficulty())
    // level_difficulty ≈ depth(&u.uz) outside endgame/amulet/builds_up.
    if (madeNew && game.urole?.mnum === PM_TOURIST) {
        more_experienced(depth(u.uz) | 0, 0);
        await newexplevel();
    }

    // C: goto_level ends with pickup(1) — autopick or check_here/engr
    await pickup(1);
}

/**
 * C ref: questpgr.c deliver_splev_message — pline lev_message lines then free.
 */
async function deliver_splev_message() {
    const msg = game.lev_message;
    if (!msg) return;
    game.lev_message = null;
    for (const line of String(msg).split('\n')) {
        if (line) await pline(line);
    }
}

/**
 * C ref: do.c hellish_smoke_mesg — temperature hot/cold pline (+ Gehennom smoke).
 */
async function hellish_smoke_mesg() {
    const temp = game.level?.flags?.temperature | 0;
    if (temp) {
        await pline(`It is ${temp > 0 ? 'hot' : 'cold'} here.`);
    }
    // C: In_hell && temperature > 0 → smell/sense smoke — deferred for endgame
}

/**
 * C ref: do.c temperature_change_msg — pline when level temperature changes.
 */
async function temperature_change_msg(prev_temperature) {
    const temp = game.level?.flags?.temperature | 0;
    if ((prev_temperature | 0) === temp) return;
    if (temp) {
        await hellish_smoke_mesg();
    } else if (prev_temperature > 0) {
        // C: In_hell(&u.uz0) ? "and smoke are" : "is" — endgame leaves use "is"
        await pline('The heat is gone.');
    } else if (prev_temperature < 0) {
        await pline('You are out of the cold.');
    }
}

/**
 * C ref: do.c schedule_goto — defer level change + optional pre/post msgs.
 */
export function schedule_goto(tolev, utotype_flags, pre_msg, post_msg) {
    const u = game.u;
    if (!u) return;
    u.utotype = (utotype_flags | 0) | UTOTYPE_DEFERRED;
    if (!u.utolev) u.utolev = { dnum: 0, dlevel: 0 };
    assign_level(u.utolev, tolev);
    game.dfr_pre_msg = pre_msg ? String(pre_msg) : null;
    game.dfr_post_msg = post_msg ? String(post_msg) : null;
}

/**
 * C ref: do.c deferred_goto — pline pre_msg, goto_level, optional post_msg.
 * Portal-remove and full typmask arms beyond ATSTAIRS/FALLING/PORTAL deferred.
 */
export async function deferred_goto() {
    const u = game.u;
    if (!u?.uz || !u.utolev) {
        u && (u.utotype = UTOTYPE_NONE);
        game.dfr_pre_msg = null;
        game.dfr_post_msg = null;
        return;
    }
    if (!on_level(u.uz, u.utolev)) {
        const dest = { dnum: u.utolev.dnum | 0, dlevel: u.utolev.dlevel | 0 };
        const oldlev = { dnum: u.uz.dnum | 0, dlevel: u.uz.dlevel | 0 };
        const typmask = u.utotype | 0;
        if (game.dfr_pre_msg) await pline(game.dfr_pre_msg);
        await goto_level(
            dest,
            !!(typmask & UTOTYPE_ATSTAIRS),
            !!(typmask & UTOTYPE_FALLING),
            !!(typmask & UTOTYPE_PORTAL),
        );
        // UTOTYPE_RMPORTAL deltrap deferred
        // C: dfr_post_msg delivered inside goto_level (maybe_lvltport_feedback)
        // before onquest; only leftover non-materialize msgs land here.
        if (game.dfr_post_msg && !on_level(u.uz, oldlev)) {
            await pline(game.dfr_post_msg);
        }
    }
    u.utotype = UTOTYPE_NONE;
    game.dfr_pre_msg = null;
    game.dfr_post_msg = null;
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

/**
 * C ref: invent.c freeinv + freeinv_core — remove from invent; gold sets
 * disp.botl. JS botl `$:` reads game._goldCount (addinv / container put-in
 * maintain it); decrement here so drop paints $:0 like C money_cnt.
 */
function freeinv_drop(obj) {
    const inv = game.invent || [];
    const idx = inv.indexOf(obj);
    if (idx >= 0) inv.splice(idx, 1);
    obj.owornmask = 0;
    obj.nobj = null;
    // where left for place_object to set OBJ_FLOOR
    // C invent.c freeinv_core — COIN_CLASS → disp.botl = TRUE; return
    if (obj.oclass === COIN_CLASS) {
        game._goldCount = Math.max(0, (game._goldCount || 0) - (obj.quan || 0));
        if (!game.flags) game.flags = {};
        game.flags.botl = true;
    }
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

/**
 * C invent getobj any_obj_ok — every invent letter is SUGGEST;
 * suggested > 5 → compactify (invent.c).
 */
function drop_suggest_lets() {
    const lets = [];
    for (const o of game.invent || []) {
        if (o?.invlet) lets.push(o.invlet);
    }
    lets.sort((a, b) => a.charCodeAt(0) - b.charCodeAt(0));
    let s = lets.join('');
    if (lets.length > 5) s = compactify_invlets(s);
    return s;
}

/**
 * C ref: invent.c getobj("drop", any_obj_ok, GETOBJ_PROMPT|GETOBJ_ALLOWCNT)
 * via yn_function(qbuf, NULL, '\0'). Count-split and ?/* menus deferred.
 */
async function getobj_drop() {
    for (;;) {
        await flush_topl_more();
        const lets = drop_suggest_lets();
        const query = lets
            ? `What do you want to drop? [${lets} or ?*]`
            : 'What do you want to drop? [*]';
        // C invent.c getobj → yn_function(qbuf, (char *)0, '\0', FALSE)
        const ch = await yn_function(query, null, '\0');
        if (ch === '\x1b' || ch === ' ' || ch === '\n' || ch === '\r') {
            if (game.flags?.verbose !== false) await pline('Never mind.');
            return null;
        }
        if (ch === '?' || ch === '*') {
            // ?/* pickinv deferred — cancel like quitchars for now
            if (game.flags?.verbose !== false) await pline('Never mind.');
            return null;
        }
        const otmp = (game.invent || []).find((o) => o.invlet === ch);
        if (!otmp) {
            await pline("You don't have that object.");
            continue;
        }
        // C: leave gt.toplines; !verbose drop stays silent until parse clear.
        mark_topline_prompt(game._pending_message);
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

/**
 * C ref: do.c doup — '<' go up staircase (ordinary stairs path).
 *
 * Omits: rooted, pit climb_pit, stucksteed, u_stuck_cannot_go, encumbrance
 * load gate, ledger 1 escape yn, next_to_u leash.
 */
export async function doup() {
    const u = game.u;
    if (!u) return ECMD_OK;

    u.dz = -1;
    u.dx = 0;
    u.dy = 0;

    const stway = stairway_at(u.ux, u.uy);
    if (!stway || !stway.up) {
        await pline("You can't go up here.");
        return ECMD_OK;
    }

    // C: ledger_no(&u.uz) == 1 → escape yn — not taken when climbing to Dlvl1
    // from below; surface escape deferred.
    if (ledger_no(u.uz) === 1) {
        await pline("You can't go up here.");
        return ECMD_OK;
    }

    game.at_ladder = !!(game.level?.at(u.ux, u.uy)?.typ === LADDER)
        || !!(stway && stway.isladder);

    await prev_level(true);
    game.at_ladder = false;
    return ECMD_TIME;
}
