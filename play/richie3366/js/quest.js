// quest.js — quest branch arrival hooks + leader talk.
// C ref: quest.c onquest / on_start / on_locate / on_goal /
//        quest_talk / leader_speaks / chat_with_leader / is_pure / expulsion.
// Named omissions: locate_next beyond Bar/Arc; chat_with_nemesis/guardian;
// prisoner_speaks; finish_quest; got_thanks/questart arms; banished
// com_pager; livelog; exercise side-effects beyond call; full convert_arg
// catalogue for assignquest; find_quest_artifact OBJ_INVENT/MIGRATING.
// nexttime/othertime/goal_* texts: Arc+Bar only (other roles burn nhl only).

import { game } from './gstate.js';
import {
    In_quest, MIN_QUEST_ALIGN, MIN_QUEST_LEVEL,
    UTOTYPE_NONE, UTOTYPE_PORTAL, STRAT_WAITMASK,
    OBJ_FLOOR, OBJ_MINVENT, OBJ_BURIED,
} from './const.js';
import { qt_pager } from './questpgr.js';
import { pline } from './display.js';
import { yn_function } from './getline.js';
import { nomul } from './hack.js';
import { exercise, A_WIS } from './attrib.js';

/** C ref: dungeon.c on_level */
function on_level(a, b) {
    return !!a && !!b
        && (a.dnum | 0) === (b.dnum | 0)
        && (a.dlevel | 0) === (b.dlevel | 0);
}

/** C ref: dungeon.c Is_special — match in sp_levchn. */
function Is_special(lev) {
    for (const s of game.sp_levchn || []) {
        if (on_level(lev, s.dlevel)) return s;
    }
    return null;
}

/** C ref: quest.h / dungeon.c Is_qstart */
function Is_qstart(lev) {
    return on_level(lev, game.qstart_level);
}

/** C ref: quest.h / dungeon.c Is_qlocate */
function Is_qlocate(lev) {
    return on_level(lev, game.qlocate_level);
}

/** C ref: quest.h / dungeon.c Is_nemesis (goal) */
function Is_nemesis(lev) {
    return on_level(lev, game.nemesis_level);
}

/**
 * C ref: quest.c on_start — firsttime qt_pager + first_start;
 * re-entry from other dnum or from above → nexttime/othertime.
 */
async function on_start() {
    const qs = game.quest_status || (game.quest_status = {});
    const u = game.u;
    if (!qs.first_start) {
        await qt_pager('firsttime');
        qs.first_start = true;
    } else if (
        (u?.uz0?.dnum | 0) !== (u?.uz?.dnum | 0)
        || (u?.uz0?.dlevel | 0) < (u?.uz?.dlevel | 0)
    ) {
        // C: not_ready <= 2 → nexttime, else othertime (nhl_init shuffle)
        if ((qs.not_ready | 0) <= 2)
            await qt_pager('nexttime');
        else
            await qt_pager('othertime');
    }
}

/**
 * C ref: quest.c on_locate — locate_first/next only when arriving from above.
 * Always marks first_locate on first visit (even from below).
 */
async function on_locate() {
    const u = game.u;
    const qs = game.quest_status || (game.quest_status = {});
    if (qs.killed_nemesis) return;
    const from_above = (u.uz0?.dlevel | 0) < (u.uz?.dlevel | 0);
    if (!qs.first_locate) {
        if (from_above) await qt_pager('locate_first');
        qs.first_locate = true;
    } else if (from_above) {
        await qt_pager('locate_next');
    }
}

/**
 * C ref: questpgr.c is_quest_artifact / find_qarti — oartifact == questarti.
 */
function find_qarti(objChainHead) {
    const want = game.urole?.questarti | 0;
    if (!want) return null;
    for (let otmp = objChainHead; otmp; otmp = otmp.nobj) {
        if ((otmp.oartifact | 0) === want) return otmp;
    }
    return null;
}

/**
 * C ref: questpgr.c find_quest_artifact — floor / minvent / buried subset.
 * Named omission: OBJ_INVENT and OBJ_MIGRATING chains (C also skips invent
 * when on_goal builds whichobjchains without OBJ_INVENT).
 */
function find_quest_artifact(whichchains) {
    let qarti = null;
    if ((whichchains & (1 << OBJ_FLOOR)) !== 0)
        qarti = find_qarti(game.fobj);
    if (!qarti && (whichchains & (1 << OBJ_MINVENT)) !== 0) {
        for (const mtmp of game.fmon || []) {
            if (mtmp?.mhp != null && mtmp.mhp <= 0) continue;
            qarti = find_qarti(mtmp.minvent);
            if (qarti) break;
        }
    }
    if (!qarti && (whichchains & (1 << OBJ_BURIED)) !== 0)
        qarti = find_qarti(game.level?.buriedobjlist || game.buriedobjlist);
    return qarti;
}

/**
 * C ref: quest.c on_goal — first visit goal_first; re-entry goal_next/alt.
 * qt_pager burns nhl_init align shuffle before delivering text.
 */
async function on_goal() {
    const qs = game.quest_status || (game.quest_status = {});
    if (qs.killed_nemesis) return;
    if (!qs.made_goal) {
        await qt_pager('goal_first');
        qs.made_goal = 1;
    } else {
        // C: invent omitted — carrying questarti counts as absent for msg
        const which = (1 << OBJ_FLOOR) | (1 << OBJ_MINVENT) | (1 << OBJ_BURIED);
        const qarti = find_quest_artifact(which);
        await qt_pager(qarti ? 'goal_next' : 'goal_alt');
        if ((qs.made_goal | 0) < 7) qs.made_goal = (qs.made_goal | 0) + 1;
    }
}

/**
 * C ref: quest.c onquest — special quest level arrival messages.
 * Not_firsttime = on_level(uz0, uz); skipped when staying on same level.
 */
export async function onquest() {
    const u = game.u;
    if (!u?.uz) return;
    if (u.uevent?.qcompleted) return;
    // C: #define Not_firsttime (on_level(&u.uz0, &u.uz))
    if (on_level(u.uz0, u.uz)) return;
    if (!In_quest(u.uz)) return;
    if (!Is_special(u.uz)) return;

    if (Is_qstart(u.uz)) await on_start();
    else if (Is_qlocate(u.uz)) await on_locate();
    else if (Is_nemesis(u.uz)) await on_goal();
}

/** C ref: align.h / botl align_str subset for wizard is_pure talk. */
function align_str(a) {
    if (a === 1) return 'lawful';
    if (a === -1) return 'chaotic';
    return 'neutral';
}

/** C ref: quest.c not_capable — u.ulevel < MIN_QUEST_LEVEL. */
function not_capable() {
    return (game.u?.ulevel | 0) < MIN_QUEST_LEVEL;
}

/**
 * C ref: quest.c is_pure — alignment purity for quest assignment.
 * Wizard talk path may offer yn adjust of ualign.record.
 */
async function is_pure(talk) {
    const u = game.u;
    if (!u?.ualign) return 0;
    const original = u.ualignbase?.original ?? u.ualign.type ?? 0;
    const currentBase = u.ualignbase?.current ?? u.ualign.type ?? 0;
    // C: #define wizard flags.debug (flag.h) — playmode:debug sets flags.debug
    const wizard = !!(game.flags?.debug || game.flags?.wizard);
    if (wizard && talk) {
        if ((u.ualign.type | 0) !== (original | 0)) {
            await pline(
                `You are currently ${align_str(u.ualign.type)} instead of ${align_str(original)}.`,
            );
        } else if ((currentBase | 0) !== (original | 0)) {
            await pline('You have converted.');
        } else if ((u.ualign.record | 0) < MIN_QUEST_ALIGN) {
            await pline(
                `You are currently ${u.ualign.record | 0} and require ${MIN_QUEST_ALIGN}.`,
            );
            if ((await yn_function('adjust?', null, 'y')) === 'y')
                u.ualign.record = MIN_QUEST_ALIGN;
        }
    }
    if ((u.ualign.record | 0) >= MIN_QUEST_ALIGN
        && (u.ualign.type | 0) === (original | 0)
        && (currentBase | 0) === (original | 0)) {
        return 1;
    }
    if ((currentBase | 0) !== (original | 0)) return -1;
    return 0;
}

/**
 * C ref: quest.c expulsion — schedule_goto parent of Quest branch.
 * Named omissions: UTOTYPE_RMPORTAL seal path deltrap / remdun_mapseen;
 * livelog.
 */
async function expulsion(seal) {
    const u = game.u;
    if (!u) return;
    const qnum = game.quest_dnum | 0;
    let br = null;
    for (const b of game.branches || []) {
        if ((b.end1?.dnum | 0) === qnum || (b.end2?.dnum | 0) === qnum) {
            br = b;
            break;
        }
    }
    if (!br) return;
    const dest = ((br.end1.dnum | 0) === (u.uz?.dnum | 0))
        ? br.end2
        : br.end1;
    const portal_flag = u.uevent?.qexpelled ? UTOTYPE_NONE : UTOTYPE_PORTAL;
    // seal → RMPORTAL deferred (badalign uses seal=FALSE)
    void seal;
    nomul(0);
    // Lazy import — avoid quest.js ↔ do.js cycle (do.js imports onquest)
    const { schedule_goto } = await import('./do.js');
    schedule_goto(dest, portal_flag, null, null);
}

/**
 * C ref: quest.c chat_with_leader — first-meet / purity / assign / badalign.
 */
async function chat_with_leader(mtmp) {
    const qs = game.quest_status || (game.quest_status = {});
    if (!mtmp?.mpeaceful || qs.pissed_off) return;

    // cheater / got_thanks / questart arms deferred
    if (qs.got_quest) {
        await qt_pager('encourage');
        return;
    }

    if (!qs.met_leader) {
        await qt_pager('leader_first');
        qs.met_leader = true;
        qs.not_ready = 0;
    } else {
        await qt_pager('leader_next');
    }

    if (!on_level(game.u?.uz, game.qstart_level)) return;

    if (not_capable()) {
        await qt_pager('badlevel');
        exercise(A_WIS, true);
        await expulsion(false);
    } else {
        const purity = await is_pure(true);
        if (purity < 0) {
            // banished com_pager + pissed_off deferred
            qs.pissed_off = true;
            await expulsion(false);
        } else if (purity === 0) {
            await qt_pager('badalign');
            qs.not_ready = 1;
            exercise(A_WIS, true);
            await expulsion(false);
        } else {
            await qt_pager('assignquest');
            exercise(A_WIS, true);
            qs.got_quest = true;
        }
    }
}

/**
 * C ref: quest.c leader_speaks — peaceful leader chat; angry path deferred.
 */
async function leader_speaks(mtmp) {
    const qs = game.quest_status || (game.quest_status = {});
    if (!mtmp.mpeaceful) {
        if (!qs.pissed_off) await qt_pager('leader_last');
        qs.pissed_off = true;
        mtmp.mstrategy &= ~STRAT_WAITMASK;
        return;
    }
    if (!on_level(game.u?.uz, game.qstart_level)) return;
    if (!qs.pissed_off) await chat_with_leader(mtmp);
}

/**
 * C ref: quest.c quest_talk — leader by m_id; nemesis/djinn deferred.
 */
export async function quest_talk(mtmp) {
    if (!mtmp) return;
    const qs = game.quest_status || (game.quest_status = {});
    if ((mtmp.m_id | 0) === (qs.leader_m_id | 0) && qs.leader_m_id) {
        await leader_speaks(mtmp);
    }
    // MS_NEMESIS / MS_DJINNI deferred
}

/**
 * C ref: quest.c quest_stat_check — nemesis in_battle flag.
 */
export function quest_stat_check(mtmp) {
    // Full MS_NEMESIS in_battle deferred
    void mtmp;
}
