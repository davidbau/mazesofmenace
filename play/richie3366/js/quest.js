// quest.js — quest branch arrival hooks + leader talk.
// C ref: quest.c onquest / on_start / on_locate / on_goal / artitouch /
//        quest_talk / leader_speaks / chat_with_leader / is_pure / expulsion.
// Named omissions: locate_next beyond Bar/Arc/Pri/Wiz; chat_with_nemesis/guardian;
// nemesis_speaks (quest_talk MS_NEMESIS arm); posthanks/banished pager texts
// (calls live in chat_with_leader — miss no-ops after the C nhl_init shuffle);
// exercise side-effects beyond call; full convert_arg
// catalogue for assignquest; find_quest_artifact OBJ_INVENT/MIGRATING.
// nexttime/othertime: Arc+Bar+Pri; goal_first: Arc+Bar+Pri+Kni+Sam,
// goal_next: Arc+Bar+Pri+Kni (other-role goal_* miss then D-1662
// common retry; still no body).
// finish_quest throw/kick catch is D-1312; offeredit/hasamulet/offeredit2
// qt_pager bodies still named (shuffle live).

import { game } from './gstate.js';
import {
    In_quest, MIN_QUEST_ALIGN, MIN_QUEST_LEVEL,
    UTOTYPE_NONE, UTOTYPE_PORTAL, STRAT_WAITMASK,
    OBJ_FLOOR, OBJ_MINVENT, OBJ_BURIED, DEAF, LL_ACHIEVE,
} from './const.js';
import { qt_pager, com_pager } from './questpgr.js';
import { livelog_printf } from './pline.js';
import { create_gas_cloud } from './region.js';
import { pline, verbalize, canseemon } from './display.js';
import { Monnam, noit_mon_nam } from './do_name.js';
import { SetVoice } from './sndprocs.js';
import { angry_guards } from './mon.js';
import { monsterNames } from './monsters.js';
import { yn_function } from './getline.js';
import { nomul } from './hack.js';
import { exercise, adjalign, A_WIS } from './attrib.js';
import { fully_identify_obj, update_inventory, observe_object } from './invent.js';
import { the, xname } from './objnam.js';
import { objectNames } from './objects.js';

const AMULET_OF_YENDOR = objectNames.indexOf('AMULET_OF_YENDOR');
const FAKE_AMULET_OF_YENDOR = objectNames.indexOf('FAKE_AMULET_OF_YENDOR');
const BELL_OF_OPENING = objectNames.indexOf('BELL_OF_OPENING');
/** C ref: mondata.h mons[PM_PRISONER] — JS mtmp.data is a value, so compare mndx (sounds.js pattern). */
const PM_PRISONER = monsterNames.indexOf('PM_PRISONER');
/** C ref: monflag.h enum ms_sounds — MS_DJINNI (local const; sounds.js keeps the table local too). */
const MS_DJINNI = 29;

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
export function Is_qstart(lev) {
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
 * C ref: quest.c ok_to_quest — external hook for do.c level-change check.
 * Sync: is_pure(FALSE) (no wizard yn talk arm).
 */
export function ok_to_quest() {
    const qs = game.quest_status || {};
    if (qs.killed_leader) return true;
    if (!(qs.got_quest || qs.got_thanks)) return false;
    const u = game.u;
    if (!u?.ualign) return false;
    const original = u.ualignbase?.original ?? u.ualign.type ?? 0;
    const currentBase = u.ualignbase?.current ?? u.ualign.type ?? 0;
    return (u.ualign.record | 0) >= MIN_QUEST_ALIGN
        && (u.ualign.type | 0) === (original | 0)
        && (currentBase | 0) === (original | 0);
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

/** C ref: questpgr.c is_quest_artifact — oartifact == urole.questarti. */
export function is_quest_artifact(obj) {
    const want = game.urole?.questarti | 0;
    return want !== 0 && (obj?.oartifact | 0) === want;
}

/**
 * C ref: quest.c artitouch `:125–136` — first-touch quest-artifact rite.
 * observe_object names it (covers the blind-pickup case), the flag is set
 * before the pager (C `Qstat(touched_artifact) = TRUE` precedes qt_pager),
 * then qt_pager "gotit" + WIS exercise. Once-only via quest_status.
 * Async: qt_pager can reach nhgetch. C home: quest.c (Qstat = quest_status).
 */
export async function artitouch(obj) {
    const qs = game.quest_status || (game.quest_status = {});
    if (!qs.touched_artifact) {
        observe_object(obj);
        qs.touched_artifact = true;
        await qt_pager('gotit');
        exercise(A_WIS, true);
    }
}

/** C youprop.h Deaf — HDeaf || EDeaf || uroleplay.deaf. */
function Deaf() {
    const u = game.u || {};
    const prop = u.uprops?.[DEAF];
    return !!((prop?.intrinsic | 0) || (prop?.extrinsic | 0)
        || u.uroleplay?.deaf);
}

/** C invent.c carrying — first matching otyp in invent. */
function carrying(otyp) {
    if (otyp < 0) return null;
    for (const otmp of game.invent || []) {
        if ((otmp.otyp | 0) === otyp) return otmp;
    }
    return null;
}

/**
 * C ref: quest.c finish_quest — throw/kick catch or walk-up with the
 * quest artifact / unique / fake AoY. offeredit/hasamulet/offeredit2
 * qt_pager bodies still named (nhl shuffle live). Called from
 * chat_with_leader Rules 1/3 (`:297`/`:312`) + the throw/kick catch.
 */
export async function finish_quest(obj) {
    const u = game.u || {};
    const qs = game.quest_status || (game.quest_status = {});

    if (obj && !is_quest_artifact(obj)) {
        if (Deaf()) return;
        fully_identify_obj(obj);
        if ((obj.otyp | 0) === AMULET_OF_YENDOR) {
            await qt_pager('hasamulet');
        } else if ((obj.otyp | 0) === FAKE_AMULET_OF_YENDOR) {
            await verbalize(
                'Sorry to say, this is a mere imitation of the true Amulet of Yendor.',
            );
        } else {
            await verbalize(`Ah, I see you've found ${the(xname(obj))}.`);
        }
        return;
    }

    if (u.uhave?.amulet || u.uhave_amulet) {
        await qt_pager('hasamulet');
        const otmp = carrying(AMULET_OF_YENDOR);
        if (otmp) {
            fully_identify_obj(otmp);
            update_inventory();
        }
    } else {
        await qt_pager(!qs.got_thanks ? 'offeredit' : 'offeredit2');
        if (!carrying(BELL_OF_OPENING)) {
            await com_pager('quest_complete_no_bell');
        }
    }
    qs.got_thanks = true;

    if (obj) {
        if (!u.uevent) u.uevent = {};
        u.uevent.qcompleted = 1;
        fully_identify_obj(obj);
        update_inventory();
    }
}

/**
 * C ref: quest.c chat_with_leader `:282–368` — the whole body in C order.
 * Rule 0 cheater (`:287–289`); got_thanks finish_quest/posthanks (`:294–301`);
 * questart invent scan + finish_quest (`:304–312`); got_quest encourage
 * (`:315–316`); leader_first/next + met_leader/not_ready (`:322–327`);
 * qstart_level portal gate (`:329–333`); badlevel (`:334–337`); banished
 * com_pager + pissed_off + expulsion + livelog, gated on !pissed_off
 * (`:338–348` — an already-pissed leader does nothing more); badalign
 * (`:349–353`); assignquest + got_quest + livelog (`:354–366`).
 * qt_pager/com_pager miss (posthanks/banished texts not yet extracted)
 * is a no-op deliver — the calls still burn the C nhl_init shuffle.
 * Callers: leader_speaks (`:390`) + quest_chat (`:476`).
 */
async function chat_with_leader(mtmp) {
    const u = game.u || {};
    const qs = game.quest_status || (game.quest_status = {});
    if (!mtmp?.mpeaceful || qs.pissed_off) return; // :284

    /* Rule 0: Cheater checks. */ // :287
    if (u.uhave?.questart && !qs.met_nemesis) // :288
        qs.cheater = true; // :289

    /* It is possible for you to get the amulet without completing
     * the quest. If so, try to induce the player to quest. */
    if (qs.got_thanks) { // :294
        /* Rule 1: You've gone back with/without the amulet. */ // :295
        if (u.uhave?.amulet || u.uhave_amulet) // :296
            await finish_quest(null); // :297

        /* Rule 2: You've gone back before going for the amulet. */ // :299
        else // :300
            await qt_pager('posthanks'); // :301

    /* Rule 3: You've got the artifact and are back to return it. */ // :303
    } else if (u.uhave?.questart) { // :304
        // C walks gi.invent via nobj; JS invent is an array — same first
        // is_quest_artifact hit, null when the artifact is not carried.
        let otmp = null; // :305
        for (const cand of game.invent || []) { // :307
            if (is_quest_artifact(cand)) { // :308
                otmp = cand; // :309
                break; // :310
            }
        }

        await finish_quest(otmp); // :312

    /* Rule 4: You haven't got the artifact yet. */ // :314
    } else if (qs.got_quest) { // :315
        await qt_pager('encourage'); // :316

    /* Rule 5: You aren't yet acceptable - or are you? */ // :318
    } else {
        let purity = 0; // :320

        if (!qs.met_leader) { // :322
            await qt_pager('leader_first'); // :323
            qs.met_leader = true; // :324
            qs.not_ready = 0; // :325
        } else // :326
            await qt_pager('leader_next'); // :327

        /* the quest leader might have passed through the portal into
           the regular dungeon; none of the remaining make sense there */
        if (!on_level(game.u?.uz, game.qstart_level)) // :332
            return;

        if (not_capable()) { // :334
            await qt_pager('badlevel'); // :335
            exercise(A_WIS, true); // :336
            await expulsion(false); // :337
        } else if ((purity = await is_pure(true)) < 0) { // :338
            if (!qs.pissed_off) { // :339
                await com_pager('banished'); // :340
                qs.pissed_off = true; // :341
                await expulsion(false); // :342

                /* being expelled is hardly an achievement but none of the
                   other livelog classifications fit */
                livelog_printf(LL_ACHIEVE, // :345
                    '%s has expelled you from the quest', // :346
                    noit_mon_nam(mtmp)); // :347
            }
        } else if (purity === 0) { // :349
            await qt_pager('badalign'); // :350
            qs.not_ready = 1; // :351
            exercise(A_WIS, true); // :352
            await expulsion(false); // :353
        } else { /* You are worthy! */ // :354
            await qt_pager('assignquest'); // :355
            exercise(A_WIS, true); // :356
            qs.got_quest = true; // :357

            /* phrasing is a bit clumsy but allows #chronicle to provide a
               clue to players who are reaching the quest for first time;
               matters most for Home 1 that has stairs down which aren't
               easily found */
            livelog_printf(LL_ACHIEVE, // :363
                '%s has granted access to proceed deeper into the quest', // :364
                noit_mon_nam(mtmp)); // :365
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
 * C ref: quest.c quest_chat — player #chat with quest character.
 * Named omissions: setmangry on pissed_off; nemesis/guardian chat.
 */
export async function quest_chat(mtmp) {
    if (!mtmp) return;
    const qs = game.quest_status || (game.quest_status = {});
    if ((mtmp.m_id | 0) === (qs.leader_m_id | 0) && qs.leader_m_id) {
        await chat_with_leader(mtmp);
        // C: pissed_off → setmangry deferred
        return;
    }
    // MS_NEMESIS / MS_GUARDIAN deferred
}

/**
 * C ref: quest.c prisoner_speaks `:451–470` — freed prisoner (data is
 * PM_PRISONER, still STRAT_WAITMASK): announce when seen, speak, clear
 * the waitmask, befriend, align +3, anger the guards. SetVoice is a
 * !SND_LIB no-op (sndprocs.h); the call is kept for C order.
 */
async function prisoner_speaks(mtmp) {
    if ((mtmp?.data?.mndx | 0) === PM_PRISONER
        && ((mtmp.mstrategy | 0) & STRAT_WAITMASK)) {
        /* Awaken the prisoner */
        if (canseemon(mtmp)) await pline(`${Monnam(mtmp)} speaks:`);
        SetVoice(mtmp, 0, 80, 0);
        await verbalize("I'm finally free!");
        mtmp.mstrategy &= ~STRAT_WAITMASK;
        mtmp.mpeaceful = 1;

        /* Your god is happy... */
        adjalign(3);

        /* ...But the guards are not */
        await angry_guards(false);
    }
}

/**
 * C ref: quest.c quest_talk `:495–511` — leader by m_id; nemesis/djinn
 * switch. Named omission: MS_NEMESIS → nemesis_speaks (no live export).
 */
export async function quest_talk(mtmp) {
    if (!mtmp) return;
    const qs = game.quest_status || (game.quest_status = {});
    if ((mtmp.m_id | 0) === (qs.leader_m_id | 0) && qs.leader_m_id) {
        await leader_speaks(mtmp);
        return;
    }
    switch (mtmp.data?.msound | 0) {
    case MS_DJINNI:
        await prisoner_speaks(mtmp);
        break;
    default:
        break;
    }
}

/**
 * C ref: quest.c quest_stat_check — nemesis in_battle flag.
 */
export function quest_stat_check(mtmp) {
    // Full MS_NEMESIS in_battle deferred
    void mtmp;
}

/**
 * C ref: quest.c nemdead `:106–113` — nemesis killed: latch
 * killed_nemesis and page the role's killed_nemesis text.
 * Caller: mon.c mongone/mondead on MS_NEMESIS death.
 */
export async function nemdead() {
    const qs = game.quest_status || (game.quest_status = {});
    if (!qs.killed_nemesis) {
        qs.killed_nemesis = true;
        await qt_pager('killed_nemesis');
    }
}

/**
 * C ref: quest.c leaddead `:115–122` — quest leader killed: latch
 * killed_leader. C carries a TODO for a killed_leader page; no pager
 * call ships until C adds one.
 * Caller: mon.c mongone/mondead on MS_LEADER death.
 */
export function leaddead() {
    const qs = game.quest_status || (game.quest_status = {});
    if (!qs.killed_leader) {
        qs.killed_leader = true;
        /* TODO: qt_pager("killed_leader"); ? */
    }
}

/**
 * C ref: quest.c nemesis_stinks `:425–438` — a stinky nemesis (caller
 * picked via stinky_nemesis) leaves a noxious cloud on death. C runs
 * the cloud under mon_moving so the hero is never blamed for it.
 * Caller: mon.c mongone/mondead MS_NEMESIS arm.
 */
export async function nemesis_stinks(mx, my) {
    if (!game.context) game.context = {};
    const save_mon_moving = game.context.mon_moving;
    /*
     * Some nemeses (determined by caller) release a cloud of noxious
     * gas when they die.  Don't make the hero be responsible for such
     * a cloud even if hero has just killed nemesis.
     */
    game.context.mon_moving = true;
    await create_gas_cloud(mx | 0, my | 0, 5, 8);
    game.context.mon_moving = save_mon_moving;
}
