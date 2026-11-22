// quest.js — quest dungeon branch routines.
// C ref: quest.c — on_start, on_locate, on_goal, onquest, nemdead,
// leaddead, artitouch, ok_to_quest, not_capable, is_pure, expulsion,
// finish_quest, chat_with_leader, leader_speaks, chat_with_nemesis,
// nemesis_speaks, nemesis_stinks, chat_with_guardian, prisoner_speaks,
// quest_chat, quest_talk, quest_stat_check.

import { game } from './gstate.js';
import { rn2 } from './rng.js';
import { A_ORIGINAL, A_CURRENT, A_WIS, OBJ_FLOOR, OBJ_MINVENT, OBJ_BURIED,
         UTOTYPE_NONE, UTOTYPE_PORTAL, UTOTYPE_RMPORTAL,
         STRAT_WAITMASK } from './const.js';
import { mons, PM_PRISONER, MS_NEMESIS, MS_GUARDIAN, MS_DJINNI }
    from './monsters.js';
import * as O from './objects.js';
import { pline, You, canseemon, Hallucination } from './display.js';
import { on_level, Is_special, dungeon_branch } from './dungeon.js';
import { qt_pager, com_pager, is_quest_artifact, find_quest_artifact }
    from './questpgr.js';
import { align_str } from './insight.js';
import { exercise, adjalign } from './attrib.js';
import { observe_object } from './o_init.js';
import { tty_yn_function } from './wintty.js';
import { nomul } from './hack.js';
import { schedule_goto } from './do.js';
import { carrying } from './invent.js';
import { create_gas_cloud } from './region.js';
import { Monnam, mon_nam } from './do_name.js';
import { setmangry, monnear } from './mon.js';

function impossible(msg) { console.error(`impossible: ${msg}`); }

// C ref: you.h MIN_QUEST_ALIGN, MIN_QUEST_LEVEL
const MIN_QUEST_ALIGN = 20; /* at least "fervent" */
const MIN_QUEST_LEVEL = 14; /* the minimum experience level for
                               undertaking the quest */

// C ref: quest.c Not_firsttime, Qstat()
function Not_firsttime() { return on_level(game.u.uz0, game.u.uz); }
function Qstat() { return game.quest_status; }

// C ref: dungeon.h Is_qstart(), Is_qlocate(), Is_nemesis(); qstart_level
function topo() { return game.dungeon_topology; }
function Is_qstart(x) { return on_level(x, topo().d_qstart_level); }
function Is_qlocate(x) { return on_level(x, topo().d_qlocate_level); }
function Is_nemesis(x) { return on_level(x, topo().d_nemesis_level); }

// C ref: monst.h helpless()
function helpless(mon) { return !!(mon.msleeping || !mon.mcanmove); }

// C ref: pline.c verbalize()
async function verbalize(line) {
    /* gp.pline_flags |= PLINE_VERBALIZE: only used by the voice hooks */
    await pline(`"${line}"`);
}

// C ref: quest.c on_start()
async function on_start() {
    const u = game.u;

    if (!Qstat().first_start) {
        await qt_pager("firsttime");
        Qstat().first_start = true;
    } else if ((u.uz0.dnum !== u.uz.dnum) || (u.uz0.dlevel < u.uz.dlevel)) {
        if ((Qstat().not_ready || 0) <= 2)
            await qt_pager("nexttime");
        else
            await qt_pager("othertime");
    }
}

// C ref: quest.c on_locate()
async function on_locate() {
    const u = game.u;
    /* the locate messages are phrased in a manner such that they only
       make sense when arriving on the level from above */
    const from_above = (u.uz0.dlevel < u.uz.dlevel);

    if (Qstat().killed_nemesis) {
        return;
    } else if (!Qstat().first_locate) {
        if (from_above)
            await qt_pager("locate_first");
        /* if we've arrived from below this will be a lie, but there won't
           be any point in delivering the message upon a return visit from
           above later since the level has now been seen */
        Qstat().first_locate = true;
    } else {
        if (from_above)
            await qt_pager("locate_next");
    }
}

// C ref: quest.c on_goal()
async function on_goal() {
    if (Qstat().killed_nemesis) {
        return;
    } else if (!Qstat().made_goal) {
        await qt_pager("goal_first");
        Qstat().made_goal = 1;
    } else {
        /*
         * Some QT_NEXTGOAL messages reference the quest artifact;
         * find out if it is still present.  If not, request an
         * alternate message (qt_pager() will revert to delivery
         * of QT_NEXTGOAL if current role doesn't have QT_ALTGOAL).
         * Note: if hero is already carrying it, it is treated as
         * being absent from the level for quest message purposes.
         */
        const whichobjchains = ((1 << OBJ_FLOOR)
                                | (1 << OBJ_MINVENT)
                                | (1 << OBJ_BURIED));
        const qarti = find_quest_artifact(whichobjchains);

        await qt_pager(qarti ? "goal_next" : "goal_alt");
        if (Qstat().made_goal < 7)
            Qstat().made_goal++;
    }
}

// C ref: quest.c onquest()
export async function onquest() {
    const u = game.u;

    if (u.uevent.qcompleted || Not_firsttime())
        return;
    if (!Is_special(u.uz))
        return;

    if (Is_qstart(u.uz))
        await on_start();
    else if (Is_qlocate(u.uz))
        await on_locate();
    else if (Is_nemesis(u.uz))
        await on_goal();
    return;
}

// C ref: quest.c nemdead()
export async function nemdead() {
    if (!Qstat().killed_nemesis) {
        Qstat().killed_nemesis = true;
        await qt_pager("killed_nemesis");
    }
}

// C ref: quest.c leaddead()
export function leaddead() {
    if (!Qstat().killed_leader) {
        Qstat().killed_leader = true;
        /* TODO: qt_pager("killed_leader"); ? */
    }
}

// C ref: quest.c artitouch()
export async function artitouch(obj) {
    if (!Qstat().touched_artifact) {
        /* in case we haven't seen the item yet (ie, currently blinded),
           this quest message describes it by name so mark it as seen */
        observe_object(obj, Hallucination());
        /* only give this message once */
        Qstat().touched_artifact = true;
        await qt_pager("gotit");
        exercise(A_WIS, true);
    }
}

// C ref: quest.c ok_to_quest()
/* external hook for do.c (level change check) */
export function ok_to_quest() {
    /* is_pure(FALSE) never talks, so this stays synchronous */
    return !!(((Qstat().got_quest || Qstat().got_thanks)
               && is_pure_value() > 0) || Qstat().killed_leader);
}

// C ref: quest.c not_capable()
function not_capable() {
    return game.u.ulevel < MIN_QUEST_LEVEL;
}

// C ref: quest.c is_pure() -- the purity computation at its end, shared
// by is_pure(TRUE) and the is_pure(FALSE) call in ok_to_quest()
function is_pure_value() {
    const u = game.u;
    const original_alignment = u.ualignbase[A_ORIGINAL];

    return (u.ualign.record >= MIN_QUEST_ALIGN
            && u.ualign.type === original_alignment
            && u.ualignbase[A_CURRENT] === original_alignment)
               ? 1
               : (u.ualignbase[A_CURRENT] !== original_alignment) ? -1 : 0;
}

// C ref: quest.c is_pure()
async function is_pure(talk) {
    const u = game.u;
    const wizard = !!game.flags.debug;
    const original_alignment = u.ualignbase[A_ORIGINAL];

    if (wizard && talk) {
        if (u.ualign.type !== original_alignment) {
            await You(`are currently ${align_str(u.ualign.type)} instead of ${
                align_str(original_alignment)}.`);
        } else if (u.ualignbase[A_CURRENT] !== original_alignment) {
            await You("have converted.");
        } else if (u.ualign.record < MIN_QUEST_ALIGN) {
            await You(`are currently ${u.ualign.record} and require ${
                MIN_QUEST_ALIGN}.`);
            /* yn_function("adjust?", (char *) 0, 'y', TRUE) */
            if (await tty_yn_function("adjust?", null, 'y') === 'y')
                u.ualign.record = MIN_QUEST_ALIGN;
        }
    }
    return is_pure_value();
}

// C ref: quest.c expulsion()
/*
 * Expel the player to the stairs on the parent of the quest dungeon.
 *
 * This assumes that the hero is currently _in_ the quest dungeon and that
 * there is a single branch to and from it.
 */
function expulsion(seal) {
    const u = game.u;
    let portal_flag = u.uevent.qexpelled ? UTOTYPE_NONE : UTOTYPE_PORTAL;

    const br = dungeon_branch("The Quest");
    const dest = (br.end1.dnum === u.uz.dnum) ? br.end2 : br.end1;
    if (seal)
        portal_flag |= UTOTYPE_RMPORTAL;
    nomul(0); /* stop running */
    schedule_goto(dest, portal_flag, null, null);
    if (seal) { /* remove the portal to the quest - sealing it off */
        /* u.uevent.qexpelled = 1; remdun_mapseen(quest_dnum); deltrap()
           of the near portal -- every caller passes seal FALSE */
        throw new Error('expulsion(): sealing the quest portal not ported yet');
    }
}

// C ref: quest.c finish_quest()
/* Either you've returned to quest leader while carrying the quest
   artifact or you've just thrown it to/at him or her.  If quest
   completion text hasn't been given yet, give it now.  Otherwise
   give another message about the character keeping the artifact
   and using the magic portal to return to the dungeon.  Also called
   if hero throws or kicks an invocation item (probably the Bell)
   at the leader. */
export async function finish_quest(obj) /* quest artifact or thrown unique
                                           item or faux AoY; possibly null
                                           if carrying the Amulet */
{
    const u = game.u;
    let otmp;

    if (obj && !is_quest_artifact(obj)) {
        /* tossed an invocation item (or [fake] AoY) at the quest leader:
           fully_identify_obj(), the "hasamulet" / imitation / "Ah, I see
           you've found" responses */
        throw new Error('finish_quest(): tossed invocation item not ported yet');
    }

    if (u.uhave.amulet) {
        /* has the amulet in inventory -- most likely the player has already
           completed the quest and stopped in on her way back up, but it's not
           impossible to have gotten the amulet before formally presenting the
           quest artifact to the leader. */
        await qt_pager("hasamulet");
        /* leader IDs the real amulet but ignores any fakes */
        if ((otmp = carrying(O.AMULET_OF_YENDOR)) !== null)
            throw new Error('finish_quest(): fully_identify_obj() not ported yet');
    } else {
        /* normal quest completion; threw artifact or walked up carrying it */
        await qt_pager(!Qstat().got_thanks ? "offeredit" : "offeredit2");
        /* should have obtained bell during quest;
           if not, suggest returning for it now */
        if ((otmp = carrying(O.BELL_OF_OPENING)) === null)
            await com_pager("quest_complete_no_bell");
    }
    Qstat().got_thanks = true;

    if (obj) {
        u.uevent.qcompleted = 1; /* you did it! */
        /* behave as if leader imparts sufficient info about the
           quest artifact: fully_identify_obj(obj); update_inventory() */
        throw new Error('finish_quest(): fully_identify_obj() not ported yet');
    }
}

// C ref: quest.c chat_with_leader()
async function chat_with_leader(mtmp) {
    const u = game.u;

    if (!mtmp.mpeaceful || Qstat().pissed_off)
        return;

    /*  Rule 0: Cheater checks. */
    if (u.uhave.questart && !Qstat().met_nemesis)
        Qstat().cheater = true;

    /*  It is possible for you to get the amulet without completing
     *  the quest.  If so, try to induce the player to quest.
     */
    if (Qstat().got_thanks) {
        /* Rule 1: You've gone back with/without the amulet. */
        if (u.uhave.amulet)
            await finish_quest(null);

        /* Rule 2: You've gone back before going for the amulet. */
        else
            await qt_pager("posthanks");

    /* Rule 3: You've got the artifact and are back to return it. */
    } else if (u.uhave.questart) {
        let otmp;

        for (otmp = game.invent; otmp; otmp = otmp.nobj)
            if (is_quest_artifact(otmp))
                break;

        await finish_quest(otmp);

    /* Rule 4: You haven't got the artifact yet. */
    } else if (Qstat().got_quest) {
        await qt_pager("encourage");

    /* Rule 5: You aren't yet acceptable - or are you? */
    } else {
        let purity = 0;

        if (!Qstat().met_leader) {
            await qt_pager("leader_first");
            Qstat().met_leader = true;
            Qstat().not_ready = 0;
        } else
            await qt_pager("leader_next");

        /* the quest leader might have passed through the portal into
           the regular dungeon; none of the remaining make sense there */
        if (!on_level(u.uz, topo().d_qstart_level))
            return;

        if (not_capable()) {
            await qt_pager("badlevel");
            exercise(A_WIS, true);
            expulsion(false);
        } else if ((purity = await is_pure(true)) < 0) {
            if (!Qstat().pissed_off) {
                await com_pager("banished");
                Qstat().pissed_off = true;
                expulsion(false);

                /* being expelled is hardly an achievement but none of the
                   other livelog classifications fit:
                   livelog_printf(LL_ACHIEVE, ...) -- the livelog isn't
                   shown on the tty */
            }
        } else if (purity === 0) {
            await qt_pager("badalign");
            Qstat().not_ready = 1;
            exercise(A_WIS, true);
            expulsion(false);
        } else { /* You are worthy! */
            await qt_pager("assignquest");
            exercise(A_WIS, true);
            Qstat().got_quest = true;

            /* phrasing is a bit clumsy but allows #chronicle to provide a
               clue to players who are reaching the quest for first time;
               matters most for Home 1 that has stairs down which aren't
               easily found:
               livelog_printf(LL_ACHIEVE, ...) -- not shown on the tty */
        }
    }
}

// C ref: quest.c leader_speaks()
export async function leader_speaks(mtmp) {
    /* maybe you attacked leader? */
    if (!mtmp.mpeaceful) {
        if (!Qstat().pissed_off) {
            /* again, don't end it permanently if the leader gets angry
             * since you're going to have to kill him to go questing... :)
             * ...but do only show this crap once. */
            await qt_pager("leader_last");
        }
        Qstat().pissed_off = true;
        mtmp.mstrategy &= ~STRAT_WAITMASK; /* end the inaction */
    }
    /* the quest leader might have passed through the portal into the
       regular dungeon; if so, mustn't perform "backwards expulsion" */
    if (!on_level(game.u.uz, topo().d_qstart_level))
        return;

    if (!Qstat().pissed_off)
        await chat_with_leader(mtmp);
}

// C ref: quest.c chat_with_nemesis()
async function chat_with_nemesis() {
    /*  The nemesis will do most of the talking, but... */
    await qt_pager("discourage");
    if (!Qstat().met_nemesis)
        Qstat().met_nemesis = (Qstat().met_nemesis || 0) + 1;
}

// C ref: quest.c nemesis_speaks()
export async function nemesis_speaks() {
    const u = game.u;

    if (!Qstat().in_battle) {
        const made_goal = Qstat().made_goal || 0;

        if (u.uhave.questart)
            await qt_pager("nemesis_wantsit");
        else if (made_goal === 1 || !Qstat().met_nemesis)
            await qt_pager("nemesis_first");
        else if (made_goal < 4)
            await qt_pager("nemesis_next");
        else if (made_goal < 7)
            await qt_pager("nemesis_other");
        else if (!rn2(5))
            await qt_pager("discourage");
        if ((Qstat().made_goal || 0) < 7)
            Qstat().made_goal = (Qstat().made_goal || 0) + 1;
        Qstat().met_nemesis = true;
    } else /* he will spit out random maledictions */
        if (!rn2(5))
        await qt_pager("discourage");
}

// C ref: quest.c nemesis_stinks()
/* create cloud of stinking gas around dying nemesis */
export function nemesis_stinks(mx, my) {
    const save_mon_moving = game.context.mon_moving;

    /*
     * Some nemeses (determined by caller) release a cloud of noxious
     * gas when they die.  Don't make the hero be responsible for such
     * a cloud even if hero has just killed nemesis.
     */
    game.context.mon_moving = true;
    try {
        create_gas_cloud(mx, my, 5, 8);
    } finally {
        game.context.mon_moving = save_mon_moving;
    }
}

// C ref: quest.c chat_with_guardian()
async function chat_with_guardian() {
    /*  These guys/gals really don't have much to say... */
    if (game.u.uhave.questart && Qstat().killed_nemesis)
        await qt_pager("guardtalk_after");
    else
        await qt_pager("guardtalk_before");
}

// C ref: quest.c prisoner_speaks()
async function prisoner_speaks(mtmp) {
    if (mtmp.data === mons[PM_PRISONER]
        && (mtmp.mstrategy & STRAT_WAITMASK)) {
        /* Awaken the prisoner */
        if (canseemon(mtmp))
            await pline(`${Monnam(mtmp)} speaks:`);
        /* SetVoice(mtmp, 0, 80, 0): voice hooks only */
        await verbalize("I'm finally free!");
        mtmp.mstrategy &= ~STRAT_WAITMASK;
        mtmp.mpeaceful = 1;

        /* Your god is happy... */
        adjalign(3);

        /* ...But the guards are not */
        throw new Error('prisoner_speaks(): angry_guards() not ported yet');
    }
    return;
}

// C ref: quest.c quest_chat()
export async function quest_chat(mtmp) {
    if (mtmp.m_id === Qstat().leader_m_id) {
        await chat_with_leader(mtmp);
        /* leader might have become pissed during the chat */
        if (Qstat().pissed_off)
            await setmangry(mtmp, false);
        return;
    }
    switch (mtmp.data.msound) {
    case MS_NEMESIS:
        await chat_with_nemesis();
        break;
    case MS_GUARDIAN:
        await chat_with_guardian();
        break;
    default:
        impossible(`quest_chat: Unknown quest character ${mon_nam(mtmp)}.`);
    }
}

// C ref: quest.c quest_talk()
export async function quest_talk(mtmp) {
    if (mtmp.m_id === Qstat().leader_m_id) {
        await leader_speaks(mtmp);
        return;
    }
    switch (mtmp.data.msound) {
    case MS_NEMESIS:
        await nemesis_speaks();
        break;
    case MS_DJINNI:
        await prisoner_speaks(mtmp);
        break;
    default:
        break;
    }
}

// C ref: quest.c quest_stat_check()
export function quest_stat_check(mtmp) {
    if (mtmp.data.msound === MS_NEMESIS)
        Qstat().in_battle = (!helpless(mtmp)
                             && monnear(mtmp, game.u.ux, game.u.uy));
}
